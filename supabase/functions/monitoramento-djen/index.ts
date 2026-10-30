// Monitoramento: intimações do Diário de Justiça Eletrônico Nacional (CNJ) pela OAB dos advogados do escritório (T21/T22).
// Fonte pública do CNJ: https://comunicaapi.pje.jus.br/api/v1/comunicacao (sem chave).
//
// Chamadas:
//  - rotina (a cada hora, pelo agendador do banco): cabeçalho x-saga-chave = chave do cofre do banco;
//    só busca nos horários de configuracoes_sistema.extra.monitoramento_horas (padrão 7h e 13h), de segunda a sexta.
//  - manual (pela tela, "Buscar agora"): quem tem monitoramento_oab.gerenciar; acao "buscar", opcional config_id.
// Primeira busca de cada OAB traz os últimos 30 dias como "histórica" (sem tarefa nem aviso);
// as seguintes olham os últimos dias e criam tarefa + aviso para cada intimação nova (gatilho no banco).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const TZ = "America/Maceio";
const API = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-saga-chave",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/* ---------- datas ---------- */
function agoraLocal() {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short", hourCycle: "h23" })
    .formatToParts(new Date()).forEach((x) => p[x.type] = x.value);
  return { hoje: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour), semana: p.weekday };
}
function somaDias(key: string, n: number) { const d = new Date(key + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const dataLocalDe = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));

/* ---------- texto da intimação (vem em HTML) ---------- */
const ENT: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ordm: "º", ordf: "ª", sect: "§", deg: "°",
  laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", middot: "·", bull: "•" };
const ACENTOS: Record<string, string> = { acute: "́", grave: "̀", circ: "̂", tilde: "̃", uml: "̈", cedil: "̧" };
function entidade(nome: string) {
  if (ENT[nome]) return ENT[nome];
  const m = nome.match(/^([A-Za-z])(acute|grave|circ|tilde|uml|cedil)$/);
  return m ? (m[1] + ACENTOS[m[2]]).normalize("NFC") : "&" + nome + ";";
}
function textoDe(html: string) {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(br|\/p|\/section|\/tr|\/div|\/h\d|hr)[^>]*>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([A-Za-z]+);/g, (_, n) => entidade(n))
    .replace(/[ \t\u00a0]+/g, " ")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

// Resumo: o texto a partir do despacho/decisão/ato, sem o cabeçalho (número do processo, partes e advogados)
const ATO = /\b(DESPACHO|DECIS[ÃA]O|SENTEN[ÇC]A|ATO ORDINAT[ÓO]RIO|CERTID[ÃA]O|AC[ÓO]RD[ÃA]O|EDITAL|ATO JUDICIAL|INTIMA[ÇC][ÃA]O)\b/;
function resumoDe(texto: string) {
  const plano = texto.replace(/\s+/g, " ").trim();
  const adv = plano.search(/ADVOGAD/i);
  const resto = adv >= 0 ? plano.slice(adv) : plano;
  const m = resto.match(ATO);
  const ini = m && m.index !== undefined ? (adv >= 0 ? adv : 0) + m.index : 0;
  return plano.slice(ini, ini + 600);
}

/* ---------- consulta ao CNJ ---------- */
async function pagina(oab: string, uf: string, ini: string, fim: string, pag: number) {
  const u = `${API}?numeroOab=${encodeURIComponent(oab)}&ufOab=${encodeURIComponent(uf)}&dataDisponibilizacaoInicio=${ini}&dataDisponibilizacaoFim=${fim}&pagina=${pag}&itensPorPagina=100`;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await fetch(u, { headers: { "Accept": "application/json" } });
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * (tentativa + 1))); continue; }
    if (!r.ok) throw new Error(`CNJ respondeu ${r.status}`);
    const j = await r.json();
    return { itens: (j.items || []) as any[], total: Number(j.count || 0) };
  }
  throw new Error("CNJ ocupado (muitas consultas); tentar de novo mais tarde");
}

// deno-lint-ignore no-explicit-any
type Cfg = any;
async function buscarOab(cfg: Cfg, mapaOab: Record<string, string>, hoje: string) {
  const historica = !cfg.ultima_verificacao_em;
  const ini = historica ? somaDias(hoje, -30) : somaDias(dataLocalDe(cfg.ultima_verificacao_em), -3);
  let pag = 1, lidos = 0, novos = 0;
  while (true) {
    const { itens, total } = await pagina(cfg.numero_oab, cfg.uf_oab, ini, hoje, pag);
    for (const it of itens) {
      lidos++;
      if (it.ativo === false || it.data_cancelamento) continue;
      const advs = (it.destinatarioadvogados || []).map((d: any) => d.advogado || {});
      const ids = [...new Set(advs.map((a: any) => mapaOab[String(a.numero_oab || "").replace(/\D/g, "") + "/" + String(a.uf_oab || "").toUpperCase()]).filter(Boolean))];
      if (!ids.length && cfg.usuario_vinculado_id) ids.push(cfg.usuario_vinculado_id);
      const texto = textoDe(it.texto || "");
      const linha = {
        fonte: "djen", id_externo: String(it.id),
        data_disponibilizacao: it.data_disponibilizacao || null,
        tribunal: it.siglaTribunal || null, orgao: it.nomeOrgao || null, classe: it.nomeClasse || null,
        tipo_comunicacao: it.tipoComunicacao || null, tipo_documento: it.tipoDocumento || null,
        numero_processo: String(it.numero_processo || "").replace(/\D/g, ""), numero_processo_mascara: it.numeroprocessocommascara || null,
        partes: (it.destinatarios || []).map((d: any) => ({ nome: d.nome, polo: d.polo })),
        advogados: advs.map((a: any) => ({ nome: a.nome, numero_oab: a.numero_oab, uf_oab: a.uf_oab })),
        texto: texto.slice(0, 60000), resumo: resumoDe(texto), link: it.link || null,
        advogados_ids: ids, historica,
      };
      const r = await admin.from("intimacoes").upsert(linha, { onConflict: "fonte,id_externo", ignoreDuplicates: true }).select("id");
      if (r.error) throw new Error(r.error.message);
      if (r.data && r.data.length) novos++;
    }
    if (itens.length < 100 || pag * 100 >= total) break;
    pag++;
  }
  await admin.from("monitoramento_config").update({ ultima_verificacao_em: new Date().toISOString(), ultimo_erro: null }).eq("id", cfg.id);
  return { oab: `${cfg.numero_oab}/${cfg.uf_oab}`, de: ini, ate: hoje, lidos, novos, historica };
}

async function buscar(configId?: string) {
  const { hoje } = agoraLocal();
  let q = admin.from("monitoramento_config").select("*").eq("tipo_alvo", "oab").eq("ativo", true);
  if (configId) q = q.eq("id", configId);
  const [cfgs, todas] = await Promise.all([q, admin.from("monitoramento_config").select("numero_oab,uf_oab,usuario_vinculado_id").eq("tipo_alvo", "oab")]);
  if (cfgs.error) throw new Error(cfgs.error.message);
  const mapaOab: Record<string, string> = {};
  // deno-lint-ignore no-explicit-any
  (todas.data || []).forEach((c: any) => { if (c.usuario_vinculado_id) mapaOab[c.numero_oab + "/" + c.uf_oab] = c.usuario_vinculado_id; });
  const resultado = [];
  for (const cfg of cfgs.data || []) {
    try { resultado.push(await buscarOab(cfg, mapaOab, hoje)); }
    catch (e) {
      const msg = (e as Error).message;
      await admin.from("monitoramento_config").update({ ultimo_erro: msg.slice(0, 300) }).eq("id", cfg.id);
      resultado.push({ oab: `${cfg.numero_oab}/${cfg.uf_oab}`, erro: msg });
    }
  }
  return resultado;
}

async function rotina() {
  const { hora, semana } = agoraLocal();
  const sis = await admin.from("configuracoes_sistema").select("extra").maybeSingle();
  const horas: number[] = (sis.data?.extra?.monitoramento_horas || [7, 13]).map(Number);
  if (semana === "Sat" || semana === "Sun" || !horas.includes(hora)) return { hora, busca: false };
  return { hora, busca: true, resultado: await buscar() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao || "");
    const ch = await admin.rpc("saga_chave_rotina");
    const chave = ch.data ? String(ch.data) : "";
    if (chave && req.headers.get("x-saga-chave") === chave) {
      if (acao === "rotina") return json({ ok: true, ...(await rotina()) });
    } else {
      const auth = req.headers.get("Authorization") || "";
      const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const eu = await usuario.rpc("meu_perfil_id");
      const pode = eu.data ? await usuario.rpc("verificar_permissao", { p_usuario_id: eu.data, p_modulo: "monitoramento_oab", p_acao: "gerenciar" }) : { data: false };
      if (pode.data !== true) return json({ ok: false, mensagem: "Só quem gerencia o monitoramento pode buscar." }, 403);
    }
    if (acao === "buscar") return json({ ok: true, resultado: await buscar(corpo.config_id || undefined) });
    return json({ ok: false, mensagem: "Ação inválida." }, 400);
  } catch (e) {
    return json({ ok: false, mensagem: (e as Error).message }, 500);
  }
});
