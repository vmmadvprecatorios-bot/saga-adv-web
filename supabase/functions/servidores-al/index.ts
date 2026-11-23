// Robô dos servidores do Estado de Alagoas (e, depois, da Prefeitura de Maceió) — bloco 450 (23/11/2026).
// Chamado SÓ pelo agendador do banco (servidores-al), com o cabeçalho x-saga-chave = saga_chave_rotina(). Sem porta aberta.
// Lê DEVAGAR a API pública do Portal da Transparência do Estado (sem login, sem captcha) e grava só os dados úteis
// pelas funções servpub_* (remuneração só quando muda). Cada rodada vai para saude_rodadas (robo 'servidores_al').
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const BASE = "https://transparencia.al.gov.br";
const ORCAMENTO_MS = 110_000; // a função do servidor tem ~150 s; para antes
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lerJson(url: string): Promise<any> {
  let ultimo = "";
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "SAGA-ADV (leitura de dados publicos; contato pelo e-SIC)" }, signal: AbortSignal.timeout(45_000) });
      if (r.status === 429 || r.status >= 500) { ultimo = `erro ${r.status} do Portal do Estado`; await esperar(5_000 * (t + 1)); continue; }
      if (!r.ok) throw new Error(`erro ${r.status} do Portal do Estado em ${url.replace(BASE, "")}`);
      return await r.json();
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
      if (/^erro 4\d\d/.test(ultimo)) throw e;
      await esperar(5_000 * (t + 1));
    }
  }
  throw new Error(ultimo || "Portal do Estado sem resposta");
}

async function rpc(nome: string, args: Record<string, unknown> = {}) {
  const r = await admin.rpc(nome, args);
  if (r.error) throw new Error(`${nome}: ${r.error.message}`);
  return r.data;
}

async function rodada() {
  const inicio = new Date();
  const t0 = Date.now();
  let linhas = 0, paginas = 0, meses = 0, detalhes = 0;
  const erros: string[] = [];
  await rpc("servpub_planejar");
  while (Date.now() - t0 < ORCAMENTO_MS) {
    const job = await rpc("servpub_proxima");
    if (!job || job.nada) break;
    const lista = job.lista === "ativo" ? "json-servidores" : "json-servidores-inativos";
    let offset = Number(job.offset) || 0;
    try {
      while (Date.now() - t0 < ORCAMENTO_MS) {
        const url = `${BASE}/pessoal/${lista}/?limit=${job.limite}&offset=${offset}&ano=${job.ano}&mes=${job.mes}`;
        const d = await lerJson(url);
        const total = Number(d?.total ?? 0);
        const rows = Array.isArray(d?.rows) ? d.rows : [];
        if (offset === 0 && total === 0) { await rpc("servpub_fechar", { p_carga: job.carga, p_vazia: true }); break; }
        // só os campos úteis
        const uteis = rows.map((x: any) => ({
          funcionario_id: x.funcionario_id, nome: x.nome, cpf: x.cpf, vinculo: x.vinculo,
          codigo_orgao: x.codigo_orgao, descricao_orgao: x.descricao_orgao, proventos: x.proventos, total: x.total,
        }));
        if (uteis.length) await rpc("servpub_receber", { p_carga: job.carga, p_linhas: uteis, p_total: total });
        linhas += uteis.length; paginas++; offset += rows.length;
        if (!rows.length || offset >= total) { await rpc("servpub_fechar", { p_carga: job.carga, p_vazia: false }); meses++; break; }
        await esperar(job.pausa_ms || 700);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      erros.push(`${job.lista} ${job.mes}/${job.ano}: ${msg}`);
      await rpc("servpub_erro", { p_carga: job.carga, p_erro: msg });
      break;
    }
  }
  // cargo, função e vínculo dos ativos (detalhe), aos poucos, quando sobra tempo
  if (!erros.length && Date.now() - t0 < ORCAMENTO_MS - 15_000) {
    const fila = await rpc("servpub_detalhe_fila", { p_limite: 30 });
    for (const p of fila || []) {
      if (Date.now() - t0 > ORCAMENTO_MS) break;
      try {
        const d = await lerJson(`${BASE}/pessoal/json-perfil-servidor/${encodeURIComponent(p.chave)}/?limit=1&offset=0`);
        const det = d?.detalhe || {};
        await rpc("servpub_detalhe_gravar", { p_id: p.id, p_cargo: det.cargo ?? null, p_funcao: det.funcao ?? null, p_vinculo: det.vinculo ?? null });
        detalhes++;
      } catch (e) {
        erros.push(`detalhe ${p.chave}: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
      await esperar(700);
    }
  }
  const ok = erros.length === 0;
  const mensagem = ok
    ? `${linhas} linha(s) em ${paginas} página(s); ${meses} mês(es) fechado(s); ${detalhes} detalhe(s) de cargo.`
    : `Falhou: ${erros.join(" | ")}`;
  await admin.rpc("saude_rodada_registrar", {
    p_robo: "servidores_al", p_ok: ok, p_mensagem: mensagem, p_lidos: linhas, p_novos: meses,
    p_detalhe: ok ? { paginas, detalhes } : { codigo: "PORTAL", erros }, p_inicio: inicio.toISOString(),
  });
  return { ok, mensagem };
}

Deno.serve(async (req) => {
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
  try {
    const ch = await admin.rpc("saga_chave_rotina");
    const chave = ch.data ? String(ch.data) : "";
    if (!chave || req.headers.get("x-saga-chave") !== chave) return json({ ok: false, mensagem: "Só o agendador do SAGA chama este robô." }, 403);
    const corpo = await req.json().catch(() => ({}));
    if (String(corpo.acao || "") !== "rotina") return json({ ok: false, mensagem: "Ação inválida." }, 400);
    return json(await rodada());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.rpc("saude_rodada_registrar", { p_robo: "servidores_al", p_ok: false, p_mensagem: msg, p_detalhe: { codigo: "ROBO" } });
    return json({ ok: false, mensagem: msg }, 500);
  }
});
