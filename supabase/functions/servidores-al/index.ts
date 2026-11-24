// Robô dos servidores do Estado de Alagoas (e, depois, da Prefeitura de Maceió) — bloco 450 (23/11/2026).
// Chamado SÓ pelo agendador do banco (servidores-al), com o cabeçalho x-saga-chave = saga_chave_rotina(). Sem porta aberta.
// Lê DEVAGAR a API pública do Portal da Transparência do Estado (sem login, sem captcha) e grava só os dados úteis
// pelas funções servpub_* (remuneração só quando muda). Cada rodada vai para saude_rodadas (robo 'servidores_al').
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { Unzip, UnzipInflate } from "npm:fflate@0.8.2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const BASE = "https://transparencia.al.gov.br";
const ORCAMENTO_MS = 110_000; // a função do servidor tem ~150 s; para antes
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Regra das cargas (23/11/2026): carga grande SÓ das 22h às 6h de Maceió (UTC-3, sem horário de verão),
// e o vigia do login: se o login do SAGA demorar mais de 3 s, o robô para na hora (o resto fica para a próxima rodada).
const LIMITE_LOGIN_MS = 3_000;
function horaMaceio(): number { return (new Date().getUTCHours() + 21) % 24; }
function dentroDaJanela(): boolean { const h = horaMaceio(); return h >= 22 || h < 6; }
async function loginLento(): Promise<string> {
  const t = Date.now();
  try {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/health`, {
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" }, signal: AbortSignal.timeout(LIMITE_LOGIN_MS + 2_000) });
    await r.text();
    const ms = Date.now() - t;
    if (!r.ok) return `o login do SAGA respondeu erro ${r.status}`;
    return ms > LIMITE_LOGIN_MS ? `o login do SAGA levou ${(ms / 1000).toFixed(1)} s (limite 3 s)` : "";
  } catch (_e) {
    return `o login do SAGA não respondeu em ${(LIMITE_LOGIN_MS + 2_000) / 1000} s`;
  }
}
/** Devolve o motivo para parar agora ("" = pode seguir). */
async function precisaParar(): Promise<string> {
  if (!dentroDaJanela()) return "fora do horário das cargas (22h às 6h de Maceió)";
  return await loginLento();
}
async function registrarPausa(motivo: string, ente: string) {
  await admin.rpc("saude_rodada_registrar", { p_robo: "servidores_al", p_ok: true, p_mensagem: `Pausado (${ente}): ${motivo}. Continua na próxima rodada.`,
    p_lidos: 0, p_novos: 0, p_detalhe: { codigo: "PAUSA_LENTIDAO", ente } });
}

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
  if (!dentroDaJanela()) return { ok: true, mensagem: "Fora do horário das cargas (22h às 6h de Maceió): nada feito." };
  const lento0 = await loginLento();
  if (lento0) { await registrarPausa(lento0, "estado_al"); return { ok: true, mensagem: `Pausado: ${lento0}.` }; }
  let parouPor = "";
  await rpc("servpub_planejar");
  while (Date.now() - t0 < ORCAMENTO_MS && !parouPor) {
    const job = await rpc("servpub_proxima");
    if (!job || job.nada) break;
    const lista = job.lista === "ativo" ? "json-servidores" : "json-servidores-inativos";
    let offset = Number(job.offset) || 0;
    try {
      while (Date.now() - t0 < ORCAMENTO_MS) {
        parouPor = await precisaParar();
        if (parouPor) break;
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
  if (!erros.length && !parouPor && Date.now() - t0 < ORCAMENTO_MS - 15_000) {
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
    ? `${linhas} linha(s) em ${paginas} página(s); ${meses} mês(es) fechado(s); ${detalhes} detalhe(s) de cargo.${parouPor ? ` Parou antes: ${parouPor}.` : ""}`
    : `Falhou: ${erros.join(" | ")}`;
  await admin.rpc("saude_rodada_registrar", {
    p_robo: "servidores_al", p_ok: ok, p_mensagem: mensagem, p_lidos: linhas, p_novos: meses,
    p_detalhe: ok ? (parouPor ? { paginas, detalhes, codigo: "PAUSA_LENTIDAO" } : { paginas, detalhes }) : { codigo: "PORTAL", erros }, p_inicio: inicio.toISOString(),
  });
  return { ok, mensagem };
}

// ---------- PREFEITURA DE MACEIÓ: exportação oficial (CSV) da tela Servidores do portal antigo ----------
// (o portal novo esconde o endereço dos dados com criptografia: NÃO é usado)
const MCZ = "https://www.transparencia.maceio.al.gov.br/transparencia/pages/servidores.faces";

function lerCsv(txt: string): string[][] {
  const out: string[][] = []; let lin: string[] = []; let campo = ""; let aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) { if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c; }
    else if (c === '"') aspas = true;
    else if (c === ";") { lin.push(campo); campo = ""; }
    else if (c === "\n") { lin.push(campo.replace(/\r$/, "")); out.push(lin); lin = []; campo = ""; }
    else campo += c;
  }
  if (campo || lin.length) { lin.push(campo); out.push(lin); }
  return out;
}

async function mczPost(cookie: string, campos: Record<string, string>, ajax: boolean, msTimeout: number) {
  const h: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", "Cookie": cookie, "User-Agent": "SAGA-ADV (leitura de dados publicos)" };
  if (ajax) { h["Faces-Request"] = "partial/ajax"; h["X-Requested-With"] = "XMLHttpRequest"; }
  return await fetch(MCZ, { method: "POST", headers: h, body: new URLSearchParams(campos).toString(), signal: AbortSignal.timeout(msTimeout) });
}

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

async function rodadaMaceio() {
  const inicio = new Date();
  let linhas = 0; let msg = ""; let ok = true;
  if (!dentroDaJanela()) return { ok: true, mensagem: "Fora do horário das cargas (22h às 6h de Maceió): nada feito." };
  const lento0 = await loginLento();
  if (lento0) { await registrarPausa(lento0, "municipio_maceio"); return { ok: true, mensagem: `Pausado: ${lento0}.` }; }
  await rpc("servpub_planejar");
  const job = await rpc("servpub_proxima_ente", { p_ente: "municipio_maceio" });
  if (!job || job.nada) return { ok: true, mensagem: "Maceió: nada na fila." };
  try {
    const g = await fetch(MCZ, { headers: { "User-Agent": "SAGA-ADV (leitura de dados publicos)" }, signal: AbortSignal.timeout(60_000) });
    if (!g.ok) throw new Error(`erro ${g.status} ao abrir a tela de servidores de Maceió`);
    const html = await g.text();
    const cookie = (g.headers.get("set-cookie") || "").split(",").map((s) => s.split(";")[0].trim()).filter((s) => /^JSESSIONID=/i.test(s)).join("; ");
    const vs = (html.match(/javax\.faces\.ViewState:0" value="([^"]+)"/) || [])[1];
    if (!vs || !cookie) throw new Error("A tela de servidores de Maceió mudou (sem ViewState/sessão): o leitor precisa de ajuste.");
    const base: Record<string, string> = {
      "form-servidores": "form-servidores", "form-servidores:selectMes": String(job.mes), "form-servidores:selectAno": String(job.ano),
      "form-servidores:nomeServidores": "", "form-servidores:cpfServidores": "", "form-servidores:selectNaturezaServidores": String(job.natureza),
      "javax.faces.ViewState": vs,
    };
    const p = await mczPost(cookie, { ...base, "javax.faces.partial.ajax": "true", "javax.faces.source": "form-servidores:j_idt79",
      "javax.faces.partial.execute": "@all", "javax.faces.partial.render": "form-servidores:tabela", "form-servidores:j_idt79": "form-servidores:j_idt79" }, true, 330_000);
    if (!p.ok) throw new Error(`erro ${p.status} na pesquisa do portal de Maceió`);
    await p.text();
    const e = await mczPost(cookie, { ...base, "form-servidores:j_idt85": "form-servidores:j_idt85" }, false, 120_000);
    if (!e.ok) throw new Error(`erro ${e.status} na exportação CSV de Maceió`);
    const txt = new TextDecoder("iso-8859-1").decode(await e.arrayBuffer());
    const tab = lerCsv(txt).filter((l) => l.length > 5);
    const cab = (tab.shift() || []).map((s) => s.trim());
    const ix = (nome: string) => cab.findIndex((c) => c.toLowerCase().startsWith(nome.toLowerCase()));
    const iNome = ix("Servidores"), iCpf = ix("CPF"), iOrg = ix("Secretaria"), iCargo = ix("Cargo"), iVinc = ix("Vínculo"), iRef = ix("Referência"), iBruto = ix("Remuneração Bruta");
    if (iNome < 0 || iCpf < 0 || iBruto < 0) throw new Error("O CSV de Maceió mudou de colunas: o leitor precisa de ajuste.");
    const esperado = `${MESES[job.mes - 1]}/${job.ano}`;
    const ruins = tab.filter((l) => iRef >= 0 && (l[iRef] || "").toLowerCase() !== esperado).length;
    if (tab.length && ruins === tab.length) throw new Error(`O portal de Maceió devolveu outro mês (${tab[0][iRef]}), não ${esperado}: a pesquisa não pegou.`);
    if (!tab.length) { await rpc("servpub_fechar", { p_carga: job.carga, p_vazia: true }); return { ok: true, mensagem: `Maceió ${job.vinculo} ${job.mes}/${job.ano}: vazio.` }; }
    const rows = tab.map((l) => ({ nome: l[iNome], cpf: l[iCpf], descricao_orgao: iOrg >= 0 ? l[iOrg] : null, cargo: iCargo >= 0 ? l[iCargo] : null,
      vinculo: iVinc >= 0 ? l[iVinc] : job.vinculo, proventos: l[iBruto], total: null }));
    for (let i = 0; i < rows.length; i += 300) {
      const lento = await loginLento();
      if (lento) throw new Error(`pausado no meio: ${lento} (o mês será lido de novo na próxima rodada)`);
      await rpc("servpub_receber", { p_carga: job.carga, p_linhas: rows.slice(i, i + 300), p_total: rows.length });
      linhas += Math.min(300, rows.length - i);
    }
    await rpc("servpub_fechar", { p_carga: job.carga, p_vazia: false });
    msg = `Maceió ${job.vinculo} ${job.mes}/${job.ano}: ${linhas} linha(s).`;
  } catch (e) {
    ok = false; msg = `Maceió ${job.vinculo} ${job.mes}/${job.ano}: ${e instanceof Error ? e.message : String(e)}`;
    await rpc("servpub_erro", { p_carga: job.carga, p_erro: msg });
  }
  await admin.rpc("saude_rodada_registrar", { p_robo: "servidores_al", p_ok: ok, p_mensagem: msg, p_lidos: linhas, p_novos: ok ? 1 : 0,
    p_detalhe: ok ? { ente: "municipio_maceio" } : { codigo: "PORTAL_MACEIO" }, p_inicio: inicio.toISOString() });
  return { ok, mensagem: msg };
}


// ---------- ESPIAR um zip anual do Estado (só leitura): nomes das colunas e 3 linhas com nome/CPF apagados ----------
async function espiarZip(arquivo: string) {
  if (!/^folha_(ativo|inativo)-\d{4}\.zip$/.test(arquivo)) throw new Error("Arquivo inválido.");
  const r = await fetch(`${BASE}/media/arquivo/${arquivo}`, { headers: { "User-Agent": "SAGA-ADV (leitura de dados publicos)" }, signal: AbortSignal.timeout(120_000) });
  if (!r.ok || !r.body) throw new Error(`erro ${r.status} ao baixar ${arquivo}`);
  const tamanho = r.headers.get("content-length");
  const nomes: string[] = []; let texto = ""; let pronto = false;
  const uz = new Unzip((f) => {
    nomes.push(f.name);
    if (nomes.length > 1 || pronto) return;
    f.ondata = (_e, chunk, final) => {
      if (pronto) return;
      texto += new TextDecoder("latin1").decode(chunk);
      if (texto.split("\n").length > 6 || final) { pronto = true; }
    };
    f.start();
  });
  uz.register(UnzipInflate);
  const leitor = r.body.getReader();
  let lidos = 0;
  while (!pronto) {
    const { value, done } = await leitor.read();
    if (done) { uz.push(new Uint8Array(0), true); break; }
    lidos += value.length; uz.push(value);
    if (lidos > 80_000_000) break;
  }
  try { await leitor.cancel(); } catch (_e) { /* ok */ }
  const linhas = texto.split(/\r?\n/).slice(0, 4);
  const cab = linhas[0] || "";
  const sep = cab.includes("|") ? "|" : cab.includes(";") ? ";" : ",";
  const cols = cab.split(sep).map((c) => c.trim());
  const iApagar = cols.map((c, i) => (/nome|cpf|matr|servidor/i.test(c) ? i : -1)).filter((i) => i >= 0);
  const exemplos = linhas.slice(1).map((l) => l.split(sep).map((v, i) => (iApagar.includes(i) ? "[apagado]" : v.trim())));
  return { ok: true, arquivo, tamanho, arquivos_no_zip: nomes.slice(0, 5), separador: sep, colunas: cols, exemplos };
}

// ---------- LER um zip anual do Estado em fluxo (fflate: para no fim do arquivo de dentro, sem engasgar com o resto do zip) ----------
// porLinha recebe cada linha (sem o cabeçalho) e devolve false para parar a leitura.
async function lerZipLinhas(arquivo: string, porCab: (c: string[]) => void, porLinha: (c: string[]) => boolean | Promise<boolean>) {
  if (!/^folha_(ativo|inativo)-\d{4}\.zip$/.test(arquivo)) throw new Error("Arquivo inválido.");
  const r = await fetch(`${BASE}/media/arquivo/${arquivo}`, { headers: { "User-Agent": "SAGA-ADV (leitura de dados publicos)" }, signal: AbortSignal.timeout(140_000) });
  if (!r.ok || !r.body) throw new Error(`erro ${r.status} ao baixar ${arquivo}`);
  const dec = new TextDecoder("latin1");
  let resto = ""; let cab = false; let parar = false; let fim = false; let primeiro = true;
  const fila: string[][] = [];
  const uz = new Unzip((f) => {
    if (!primeiro) return; primeiro = false;
    f.ondata = (_e, chunk, final) => {
      if (parar) return;
      const partes = (resto + dec.decode(chunk, { stream: !final })).split("\n");
      resto = final ? "" : (partes.pop() || "");
      for (const l of partes) {
        const t = l.replace(/\r$/, ""); if (!t) continue;
        const c = t.split("|");
        if (!cab) { cab = true; porCab(c); continue; }
        fila.push(c);
      }
      if (final) fim = true;
    };
    f.start();
  });
  uz.register(UnzipInflate);
  const leitor = r.body.getReader();
  try {
    while (!parar && !fim) {
      const { value, done } = await leitor.read();
      if (done) { uz.push(new Uint8Array(0), true); fim = true; }
      else uz.push(value);
      while (fila.length && !parar) { if (!(await porLinha(fila.shift()!))) parar = true; }
    }
    while (fila.length && !parar) { if (!(await porLinha(fila.shift()!))) parar = true; }
  } finally { try { await leitor.cancel(); } catch (_e) { /* ok */ } }
}

// Leitura LEVE: percorre os bytes descompactados contando linhas; só decodifica as linhas que interessam
// (de..ate, contando a partir de 0, sem o cabeçalho). Para de baixar assim que passa de "ate".
async function lerZipFaixa(arquivo: string, de: number, ate: number, porLinha: (c: string[], n: number) => void): Promise<{ cab: string[]; total: number | null; parou: boolean }> {
  if (!/^folha_(ativo|inativo)-\d{4}\.zip$/.test(arquivo)) throw new Error("Arquivo inválido.");
  const r = await fetch(`${BASE}/media/arquivo/${arquivo}`, { headers: { "User-Agent": "SAGA-ADV (leitura de dados publicos)" }, signal: AbortSignal.timeout(140_000) });
  if (!r.ok || !r.body) throw new Error(`erro ${r.status} ao baixar ${arquivo}`);
  const dec = new TextDecoder("latin1");
  let cab: string[] = []; let n = -1; let parar = false; let fim = false; let primeiro = true;
  let pedaco: Uint8Array = new Uint8Array(0); // começo de linha que ficou no fim do bloco anterior
  const uz = new Unzip((f) => {
    if (!primeiro) return; primeiro = false;
    f.ondata = (_e, chunk, final) => {
      if (parar) return;
      let ini = 0;
      for (let k = 0; k < chunk.length; k++) {
        if (chunk[k] !== 10) continue;
        n++;
        if (n === 0 || (n - 1 >= de && n - 1 < ate)) {
          let linha: Uint8Array;
          if (pedaco.length) { linha = juntar(pedaco, chunk.subarray(ini, k)); pedaco = new Uint8Array(0); } else linha = chunk.subarray(ini, k);
          const t = dec.decode(linha).replace(/\r$/, "");
          if (n === 0) cab = t.split("|"); else if (t && !t.startsWith("ANO|")) porLinha(t.split("|"), n - 1);
        } else if (pedaco.length) pedaco = new Uint8Array(0);
        ini = k + 1;
        if (n - 1 >= ate - 1 && n > 0) { parar = true; break; }
      }
      if (!parar && ini < chunk.length) pedaco = juntar(pedaco, chunk.subarray(ini));
      if (final) fim = true;
    };
    f.start();
  });
  uz.register(UnzipInflate);
  const leitor = r.body.getReader();
  try {
    while (!parar && !fim) {
      const { value, done } = await leitor.read();
      if (done) { uz.push(new Uint8Array(0), true); fim = true; } else uz.push(value);
    }
  } finally { try { await leitor.cancel(); } catch (_e) { /* ok */ } }
  return { cab, total: fim && !parar ? n : null, parou: parar };
}
function juntar(a: Uint8Array, b: Uint8Array) { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }

async function medirZip(arquivo: string, de = 0, ate = 0) {
  const t0 = Date.now();
  const porMes: Record<string, number> = {}; const cpfs: Record<string, number> = {}; let iMes = -1, iCpf = -1, lidas = 0;
  const res = await lerZipFaixa(arquivo, de, ate || 1, (c) => {
    if (iMes < 0) { iMes = c.length - 1; iCpf = 5; }
    lidas++; porMes[c[iMes]] = (porMes[c[iMes]] || 0) + 1;
    if (lidas % 2000 === 1) { const f = (c[iCpf] || "").replace(/\d/g, "9"); cpfs[f] = (cpfs[f] || 0) + 1; }
  });
  return { ok: true, arquivo, colunas: res.cab, total_linhas: res.total, parou_cedo: res.parou, faixa: [de, ate], lidas, por_mes: porMes, formatos_cpf: cpfs, segundos: (Date.now() - t0) / 1000 };
}

Deno.serve(async (req) => {
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
  try {
    const ch = await admin.rpc("saga_chave_rotina");
    const chave = ch.data ? String(ch.data) : "";
    if (!chave || req.headers.get("x-saga-chave") !== chave) return json({ ok: false, mensagem: "Só o agendador do SAGA chama este robô." }, 403);
    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao || "");
    if (acao === "rotina") return json(await rodada());
    if (acao === "rotina_maceio") return json(await rodadaMaceio());
    if (acao === "espiar_zip") return json(await espiarZip(String(corpo.arquivo || "")));
    if (acao === "medir_zip") return json(await medirZip(String(corpo.arquivo || ""), Number(corpo.de) || 0, Number(corpo.ate) || 0));
    return json({ ok: false, mensagem: "Ação inválida." }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.rpc("saude_rodada_registrar", { p_robo: "servidores_al", p_ok: false, p_mensagem: msg, p_detalhe: { codigo: "ROBO" } });
    return json({ ok: false, mensagem: msg }, 500);
  }
});
