// Andamentos do processo pelo DataJud (CNJ) (T21b, bloco 152, 10/11/2026, pedido do Dr. Victor).
// Consulta a API pública do DataJud e grava os andamentos pela função datajud_receber do banco (nunca apaga, nunca repete).
//
// Chamadas:
//  - rotina (agendador do banco "datajud-andamentos-dia", a cada 20 min de 1h00 às 6h40 de Maceió; uma consulta por vez): cabeçalho x-saga-chave = chave do
//    cofre do banco (saga_chave_rotina). Só consulta com o robô ligado (datajud_config.ativo).
//  - pela tela, com o login da pessoa:
//      acao "processo" + processo_id: quem vê o processo ("Atualizar agora" da ficha); consulta só ele (e os recursos).
//      acao "todos": só o administrador geral; consulta a fila inteira agora (1ª carga), mesmo com o robô desligado.
//      acao "testar": só o administrador geral (ou a rotina); confere a chave e consulta até 5 números, SEM gravar nada.
// Chave: a PÚBLICA do DataJud, que o CNJ publica na página dele e pode trocar sem aviso. O robô usa a gravada em
// datajud_config; se não houver, ou se o DataJud recusar, busca de novo na página do CNJ e grava.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const API = "https://api-publica.datajud.cnj.jus.br";
const PAGINA_CHAVE = "https://datajud-wiki.cnj.jus.br/api-publica/acesso";
// O DataJud pode levar ~40 s por consulta (medido em 10/11/2026). Números por consulta e consultas ao mesmo tempo vêm de
// datajud_config (por_consulta, paralelas): dá para ajustar sem publicar de novo.
const POR_GRAVACAO = 10;      // números por chamada à datajud_receber
const LIMITE_MS = 80_000;     // depois disso não começa consulta nova (a que está em curso termina; a função tem ~150 s)
const ESPERA_MS = 60_000;     // tempo máximo de espera por uma consulta ao DataJud
const PAUSA_MS = 2000;        // pausa entre consultas: o DataJud responde 429 (limite) com consultas seguidas (12/11/2026)
const ESPERA_429_MS = 15_000; // espera inicial depois de um 429 sem Retry-After (dobra a cada nova recusa)
const TENTATIVAS_429 = 2;     // depois disso a rodada para e o resto fica para a próxima
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-saga-chave",
};
const URL_SB = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/* ---------- tribunal pelo número CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO) ---------- */
const UF = ["", "ac", "al", "ap", "am", "ba", "ce", "dft", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "se", "sp", "to"];
export function apelido(numero: string): string | null {
  const d = String(numero || "").replace(/\D/g, "");
  if (d.length !== 20) return null;
  const j = d.charAt(13), n = parseInt(d.slice(14, 16), 10);
  if (j === "4") return n >= 1 && n <= 6 ? "trf" + n : null;
  if (j === "8") return UF[n] ? "tj" + UF[n] : null;
  if (j === "5") return n === 0 ? "tst" : n >= 1 && n <= 24 ? "trt" + n : null;
  if (j === "6") return n === 0 ? "tse" : UF[n] ? "tre-" + UF[n] : null;
  if (j === "3") return "stj";
  if (j === "7") return "stm";
  if (j === "9") return ({ 13: "tjmmg", 21: "tjmrs", 26: "tjmsp" } as Record<number, string>)[n] || null;
  return null;
}

/* ---------- datas: o DataJud mistura formatos; sem fuso = hora de Brasília ---------- */
export function dataIso(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  let m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}-03:00`;
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T12:00:00-03:00`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + "T12:00:00-03:00";
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) return s.replace(" ", "T") + "-03:00";
  const t = Date.parse(s);
  return isNaN(t) ? null : new Date(t).toISOString();
}

function lerAssuntos(a: unknown): string[] {
  const out: string[] = [];
  const visita = (x: any) => {
    if (!x) return;
    if (Array.isArray(x)) { x.forEach(visita); return; }
    if (typeof x === "object" && x.nome) out.push(String(x.nome));
  };
  visita(a);
  return [...new Set(out)].slice(0, 10);
}

// junta o que o DataJud trouxe de um número (um documento por grau/sistema) no formato da datajud_receber
export function montarItem(alvo: any, docs: any[]) {
  const capas = docs.map((d) => ({
    grau: d?.grau || null,
    classe: d?.classe?.nome || null,
    orgao: d?.orgaoJulgador?.nome || null,
    assuntos: lerAssuntos(d?.assuntos),
    ajuizado_em: dataIso(d?.dataAjuizamento),
    atualizado_cnj_em: dataIso(d?.dataHoraUltimaAtualizacao),
  }));
  const movimentos: any[] = [];
  for (const d of docs) {
    for (const m of Array.isArray(d?.movimentos) ? d.movimentos : []) {
      const data_hora = dataIso(m?.dataHora);
      const nome = String(m?.nome || "").trim();
      if (!data_hora || !nome) continue;
      movimentos.push({
        grau: d?.grau || null,
        codigo: m?.codigo ?? null,
        nome,
        data_hora,
        complementos: (Array.isArray(m?.complementosTabelados) ? m.complementosTabelados : [])
          .map((c: any) => ({ nome: c?.nome ?? null, descricao: c?.descricao ?? null, valor: c?.valor ?? null })),
        orgao: m?.orgaoJulgador?.nomeOrgao || m?.orgaoJulgador?.nome || null,
      });
    }
  }
  return {
    processo_id: alvo.processo_id, recurso_id: alvo.recurso_id || null, numero: alvo.numero, tribunal: alvo.tribunal || null,
    encontrado: docs.length > 0, capas, movimentos,
  };
}

/* ---------- erros em português, sem detalhes técnicos ---------- */
class ErroChave extends Error {}
// o DataJud pediu para esperar (HTTP 429): não é erro do processo; a rodada espera ou para, sem marcar ninguém
class ErroLimite extends Error { constructor(public esperaMs: number | null) { super("O DataJud respondeu erro 429 (pedidos demais, limite de consultas). O robô tenta de novo na próxima rodada."); } }
function lerRetryAfter(v: string | null): number | null {
  if (!v) return null;
  const s = Number(v);
  if (isFinite(s) && s >= 0) return Math.min(s * 1000, 120_000);
  const t = Date.parse(v);
  return isNaN(t) ? null : Math.max(0, Math.min(t - Date.now(), 120_000));
}
function traduzir(e: unknown): string {
  if (e instanceof ErroChave) {
    return "O DataJud recusou a chave pública (o CNJ pode ter trocado a chave). O robô buscou a nova na página do CNJ e não deu certo: cole a chave em Intimações > Andamentos do CNJ.";
  }
  const m = String((e as Error)?.message || e);
  if (/abort|timed? ?out|timeout/i.test(m)) return "O DataJud demorou demais para responder. O robô tenta de novo na próxima rodada.";
  if (/fetch|network|dns|connect|error sending request/i.test(m)) return "Não consegui falar com o DataJud agora (internet ou o CNJ fora do ar). O robô tenta de novo na próxima rodada.";
  return m.slice(0, 300);
}
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- chave pública ---------- */
async function chaveDaPagina(): Promise<string> {
  const r = await fetch(PAGINA_CHAVE, { headers: { "User-Agent": "SAGA-ADV (robo de andamentos)" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Não consegui abrir a página do CNJ com a chave pública (resposta ${r.status}).`);
  const texto = (await r.text()).replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const m = /APIKey\s+([A-Za-z0-9+/=_.-]{20,})/.exec(texto);
  if (!m) throw new Error("Não achei a chave pública na página do CNJ. Cole a chave em Intimações > Andamentos do CNJ.");
  return m[1];
}
async function obterChave(conf: any, forcar = false): Promise<string> {
  if (!forcar && conf.chave) return conf.chave;
  const ch = await chaveDaPagina();
  if (ch !== conf.chave) {
    await admin.from("datajud_config").update({ chave: ch, chave_origem: "pagina_cnj", chave_em: new Date().toISOString() }).eq("id", 1);
    conf.chave = ch;
    conf.chave_origem = "pagina_cnj";
  }
  return ch;
}

/* ---------- consulta ao DataJud: vários números do mesmo tribunal de uma vez ---------- */
async function consultar(tribunal: string, numeros: string[], chave: string): Promise<any[]> {
  const corpo = {
    size: Math.min(numeros.length * 8, 2000),
    query: { bool: { should: numeros.map((n) => ({ match: { numeroProcesso: n } })), minimum_should_match: 1 } },
  };
  const r = await fetch(`${API}/api_publica_${tribunal}/_search`, {
    method: "POST",
    headers: { Authorization: "APIKey " + chave, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(ESPERA_MS),
  });
  if (r.status === 401 || r.status === 403) throw new ErroChave(`recusou a chave (${r.status})`);
  if (r.status === 429) throw new ErroLimite(lerRetryAfter(r.headers.get("retry-after")));
  if (r.status === 404) throw new Error(`O DataJud não tem o tribunal ${tribunal.toUpperCase()}.`);
  if (!r.ok) throw new Error(`O DataJud respondeu com erro (${r.status}). O robô tenta de novo na próxima rodada.`);
  const j = await r.json();
  return (j?.hits?.hits || []).map((h: any) => h?._source).filter(Boolean);
}
async function consultarComChave(tribunal: string, numeros: string[], conf: any): Promise<any[]> {
  const chave = await obterChave(conf);
  try {
    return await consultar(tribunal, numeros, chave);
  } catch (e) {
    if (!(e instanceof ErroChave)) throw e;
    const nova = await obterChave(conf, true); // a chave pode ter mudado: busca de novo na página do CNJ
    return await consultar(tribunal, numeros, nova);
  }
}

/* ---------- uma rodada: consulta e grava ---------- */
async function gravar(itens: any[], tot: Record<string, number>) {
  for (let i = 0; i < itens.length; i += POR_GRAVACAO) {
    const r = await admin.rpc("datajud_receber", { p: { itens: itens.slice(i, i + POR_GRAVACAO) } });
    if (r.error) throw new Error("Não consegui gravar os andamentos no SAGA: " + r.error.message);
    for (const k of Object.keys(tot)) tot[k] += Number((r.data as any)?.[k] || 0);
  }
}

async function avisarErroAdmin(msg: string) {
  // um aviso por dia no sino do administrador, como o robô do Meta
  const desde = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const ja = await admin.from("notificacoes").select("id").eq("referencia_tabela", "datajud").is("referencia_id", null).gte("criado_em", desde).limit(1);
  if (ja.data && ja.data.length) return;
  const adms = await admin.from("usuarios").select("id").eq("eh_administrador", true).eq("ativo", true);
  const linhas = (adms.data || []).map((u: any) => ({ usuario_id: u.id, tipo: "outro", referencia_tabela: "datajud", referencia_id: null,
    resumo: ("Robô dos andamentos do CNJ: não consegui atualizar. " + msg).slice(0, 300) }));
  if (linhas.length) await admin.from("notificacoes").insert(linhas);
}

async function rodada(alvos: any[], conf: any, o: { origem: string; pedidoPor?: string | null; processoId?: string | null }) {
  const inicio = Date.now();
  const ex = await admin.from("datajud_execucoes")
    .insert({ origem: o.origem, pedido_por_id: o.pedidoPor || null, processo_id: o.processoId || null }).select("id").single();
  const execId = ex.data?.id || null;
  const tot: Record<string, number> = { consultados: 0, encontrados: 0, novos: 0, importantes: 0, avisos: 0, erros: 0 };
  const grupos = new Map<string, any[]>();
  const pendentes: any[] = [];
  for (const a of alvos) {
    const t = apelido(a.numero);
    if (!t) { pendentes.push({ ...a, tribunal: null, erro: "Tribunal não reconhecido pelo número do processo." }); continue; }
    if (!grupos.has(t)) grupos.set(t, []);
    grupos.get(t)!.push({ ...a, tribunal: t });
  }
  const porConsulta = Math.max(1, Math.min(100, Number(conf.por_consulta) || 20));
  // uma consulta por vez por padrão (com 3 ao mesmo tempo o DataJud respondeu 429 em 387 números, 12/11/2026)
  const paralelas = Math.max(1, Math.min(2, Number(conf.paralelas) || 1));
  const tarefas: { tribunal: string; pedaco: any[] }[] = [];
  for (const [tribunal, lista] of grupos) {
    for (let i = 0; i < lista.length; i += porConsulta) tarefas.push({ tribunal, pedaco: lista.slice(i, i + porConsulta) });
  }
  let parou = false, falha: string | null = null, proxima = 0, erroChave: unknown = null, limitado = false, esperas429 = 0;
  // uma consulta por vez (paralelas = 1, bloco 182); cada uma grava assim que volta
  const trabalhador = async () => {
    while (proxima < tarefas.length && !erroChave && !limitado) {
      if (Date.now() - inicio > LIMITE_MS) { parou = true; return; }
      const indice = proxima++;
      const { tribunal, pedaco } = tarefas[indice];
      try {
        const docs = await consultarComChave(tribunal, pedaco.map((a) => a.numero), conf);
        const porNumero = new Map<string, any[]>();
        for (const d of docs) {
          const n = String(d?.numeroProcesso || "").replace(/\D/g, "");
          if (!porNumero.has(n)) porNumero.set(n, []);
          porNumero.get(n)!.push(d);
        }
        for (const a of pedaco) pendentes.push(montarItem(a, porNumero.get(a.numero) || []));
      } catch (e) {
        if (e instanceof ErroChave) { erroChave = e; return; } // chave recusada mesmo depois de buscar de novo: para a rodada
        if (e instanceof ErroLimite) {
          // 429: espera o que o CNJ pediu (ou 15 s, 30 s...) e tenta o mesmo pedaço; sem tempo ou depois de 2 recusas, para.
          // Nada é marcado como erro: esses números continuam na fila e vão na próxima rodada.
          const espera = e.esperaMs ?? ESPERA_429_MS * Math.pow(2, esperas429);
          esperas429++;
          if (esperas429 <= TENTATIVAS_429 && Date.now() - inicio + espera < LIMITE_MS) {
            await pausa(espera);
            tarefas.push(tarefas[indice]); // volta para o fim da lista desta rodada
            continue;
          }
          limitado = true;
          return;
        }
        const msg = traduzir(e);
        for (const a of pedaco) pendentes.push({ ...a, erro: msg });
      }
      if (pendentes.length) await gravar(pendentes.splice(0), tot);
      await pausa(PAUSA_MS);
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(paralelas, Math.max(1, tarefas.length)) }, () => trabalhador()));
    if (pendentes.length) await gravar(pendentes.splice(0), tot);
    if (erroChave) throw erroChave;
  } catch (e) {
    falha = traduzir(e);
    if (pendentes.length) { try { await gravar(pendentes.splice(0), tot); } catch (_) { /* a falha principal já vai no registro */ } }
  }
  if ((proxima < tarefas.length || limitado) && !falha) parou = true;
  const ok = !falha;
  const segundos = Math.round((Date.now() - inicio) / 1000);
  const mensagem = falha
    ? falha
    : `${tot.consultados} número(s) consultado(s), ${tot.encontrados} encontrado(s) no CNJ, ${tot.novos} andamento(s) novo(s)` +
      (tot.importantes ? ` (${tot.importantes} importante(s))` : "") + (tot.avisos ? `, ${tot.avisos} aviso(s) no sino` : "") +
      (tot.erros ? `, ${tot.erros} com erro` : "") + (limitado ? ". O CNJ respondeu erro 429 (pedidos demais, limite de consultas): parei, e o resto tenta de novo na próxima rodada (daqui a 20 min, de madrugada)." : parou ? ". Parei no limite de tempo: o resto vai na próxima rodada." : ".") + ` (${segundos} s)`;
  if (execId) {
    await admin.from("datajud_execucoes").update({ fim: new Date().toISOString(), ok, mensagem, ...tot }).eq("id", execId);
  }
  if (!ok && o.origem === "rotina") await avisarErroAdmin(falha!);
  // 429 que não deixou consultar nada na rodada: avisa o administrador (uma vez por dia), como pede a regra "erros sempre à vista"
  if (ok && limitado && tot.consultados === 0 && o.origem === "rotina") {
    await avisarErroAdmin("O CNJ respondeu erro 429 (pedidos demais) e nenhuma consulta foi feita nesta rodada. O robô tenta de novo na próxima; se continuar, diminua os números por consulta.");
  }
  // quanto falta na fila (para a tela continuar a 1ª carga)
  let restantes = 0;
  if (o.origem !== "processo") {
    const f = await admin.rpc("datajud_fila", { p_limite: 5000, p_processo: null });
    restantes = Array.isArray(f.data) ? f.data.length : 0;
  }
  return { ok, mensagem, parou, restantes, ...tot };
}

/* ---------- teste sem gravar (administrador) ---------- */
async function testar(conf: any, numeros?: unknown, lote = false) {
  let alvos: any[] = Array.isArray(numeros) && numeros.length
    ? numeros.map((n) => ({ numero: String(n).replace(/\D/g, "") }))
    : (((await admin.rpc("datajud_fila", { p_limite: 3, p_processo: null })).data as any[]) || []);
  if (lote) {
    alvos = alvos.filter((a) => a.numero && a.numero.length === 20 && apelido(a.numero) === apelido(alvos[0]?.numero)).slice(0, 100);
    const t = apelido(alvos[0]?.numero || "");
    if (!t || !alvos.length) return { ok: false, mensagem: "Nenhum número para testar." };
    const t0 = Date.now();
    try {
      const docs = await consultarComChave(t, alvos.map((a) => a.numero), conf);
      const achados = new Set(docs.map((d) => String(d?.numeroProcesso || "").replace(/\D/g, "")));
      const seg = Math.round((Date.now() - t0) / 100) / 10;
      const mensagem = `Teste em lote: ${alvos.length} número(s) do ${t.toUpperCase()} numa consulta só, ${achados.size} encontrado(s), em ${seg} s.`;
      await admin.from("datajud_execucoes").insert({ origem: "teste", fim: new Date().toISOString(), ok: true, consultados: alvos.length, encontrados: achados.size, mensagem });
      return { ok: true, mensagem, segundos: seg, consultados: alvos.length, encontrados: achados.size, documentos: docs.length };
    } catch (e) {
      const mensagem = `Teste em lote (${t.toUpperCase()}, ${alvos.length} números): ${traduzir(e)} (${Math.round((Date.now() - t0) / 1000)} s)`;
      await admin.from("datajud_execucoes").insert({ origem: "teste", fim: new Date().toISOString(), ok: false, consultados: alvos.length, erros: alvos.length, mensagem });
      return { ok: false, mensagem };
    }
  }
  alvos = alvos.filter((a) => a.numero && a.numero.length === 20).slice(0, 5);
  const resultados: any[] = [];
  for (const a of alvos) {
    const t = apelido(a.numero);
    if (!t) { resultados.push({ numero: a.numero, erro: "tribunal não reconhecido" }); continue; }
    const t0 = Date.now();
    try {
      const item = montarItem({ ...a, tribunal: t }, await consultarComChave(t, [a.numero], conf));
      const ult = [...item.movimentos].sort((x, y) => String(y.data_hora).localeCompare(String(x.data_hora)))[0];
      resultados.push({ numero: a.numero, tribunal: t, encontrado: item.encontrado, graus: item.capas.map((c) => c.grau),
        classe: item.capas[0]?.classe || null, andamentos: item.movimentos.length,
        ultimo: ult ? { data_hora: ult.data_hora, nome: ult.nome } : null, segundos: Math.round((Date.now() - t0) / 100) / 10 });
    } catch (e) {
      resultados.push({ numero: a.numero, tribunal: t, erro: traduzir(e), segundos: Math.round((Date.now() - t0) / 100) / 10 });
    }
    await pausa(PAUSA_MS);
  }
  const ok = resultados.some((r) => !r.erro);
  const mensagem = ok ? "A ligação com o DataJud está funcionando." : (resultados[0]?.erro || "Nenhum número para testar.");
  // o resultado do teste fica no registro das rodadas (sem número de processo nem nome de cliente)
  const resumo = resultados.map((r) => `${String(r.tribunal || "?").toUpperCase()}: ` + (r.erro ? r.erro : (r.encontrado ? `${r.andamentos} andamento(s)` : "não encontrado")) + ` em ${r.segundos ?? "?"} s`).join("; ");
  await admin.from("datajud_execucoes").insert({ origem: "teste", fim: new Date().toISOString(), ok, consultados: resultados.length,
    encontrados: resultados.filter((r) => r.encontrado).length, erros: resultados.filter((r) => r.erro).length, mensagem: (mensagem + " " + resumo).slice(0, 900) });
  return { ok, chave_origem: conf.chave_origem || null, resultados, mensagem };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao || "");
    const ch = await admin.rpc("saga_chave_rotina");
    const chaveRotina = ch.data ? String(ch.data) : "";
    const cf = await admin.from("datajud_config").select("*").eq("id", 1).single();
    const conf: any = cf.data || { ativo: false };

    // agendador do banco
    if (chaveRotina && req.headers.get("x-saga-chave") === chaveRotina) {
      if (acao === "rotina") {
        if (!conf.ativo) return json({ ok: true, mensagem: "Robô dos andamentos do CNJ desligado: nada a fazer." });
        const fila = await admin.rpc("datajud_fila", { p_limite: conf.lote || 600, p_processo: null });
        return json(await rodada((fila.data as any[]) || [], conf, { origem: "rotina" }));
      }
      if (acao === "testar") return json(await testar(conf, corpo.numeros, corpo.lote === true));
      return json({ ok: false, mensagem: "Ação inválida." }, 400);
    }

    // pela tela: com o login da pessoa
    const usuario = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } }, auth: { persistSession: false },
    });
    const eu = await usuario.rpc("meu_perfil_id");
    const meuId = eu.data ? String(eu.data) : null;
    if (!meuId) return json({ ok: false, mensagem: "Entre no sistema de novo." }, 401);

    if (acao === "processo") {
      const pid = String(corpo.processo_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(pid)) return json({ ok: false, mensagem: "Processo inválido." }, 400);
      const ver = await usuario.from("processos").select("id").eq("id", pid).maybeSingle();
      if (!ver.data) return json({ ok: false, mensagem: "Processo não encontrado ou sem permissão." }, 403);
      const rec = await admin.from("datajud_processos").select("consultado_em").eq("processo_id", pid)
        .order("consultado_em", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
      if (rec.data?.consultado_em && Date.now() - new Date(rec.data.consultado_em).getTime() < 60000) {
        return json({ ok: true, repetido: true, mensagem: "Este processo acabou de ser consultado no CNJ." });
      }
      const fila = await admin.rpc("datajud_fila", { p_limite: 20, p_processo: pid });
      const alvos = (fila.data as any[]) || [];
      if (!alvos.length) return json({ ok: false, mensagem: "Este processo ainda não tem número no padrão do CNJ (20 dígitos)." });
      return json(await rodada(alvos, conf, { origem: "processo", pedidoPor: meuId, processoId: pid }));
    }

    if (acao === "todos" || acao === "testar") {
      const adm = await usuario.rpc("eh_admin_sistema");
      if (adm.error || adm.data !== true) return json({ ok: false, mensagem: "Só o administrador geral faz isso." }, 403);
      if (acao === "testar") return json(await testar(conf, corpo.numeros, corpo.lote === true));
      const fila = await admin.rpc("datajud_fila", { p_limite: 5000, p_processo: null });
      return json(await rodada((fila.data as any[]) || [], conf, { origem: "todos", pedidoPor: meuId }));
    }
    return json({ ok: false, mensagem: "Ação inválida." }, 400);
  } catch (e) {
    return json({ ok: false, mensagem: traduzir(e) }, 500);
  }
});
