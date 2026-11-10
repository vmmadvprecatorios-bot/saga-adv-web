// Robô do Meta (Marketing parte 3, bloco 150, 10/11/2026, pedido do Dr. Victor).
// Traz do Meta (Instagram e Facebook) os números de cada anúncio por dia (gasto, impressões, alcance, cliques,
// cliques no link, conversas iniciadas no WhatsApp/Direct/Messenger e cadastros), o cadastro das campanhas e dos
// anúncios (nome, situação, miniatura, texto) e grava tudo pela função meta_receber do banco (que nunca apaga nada).
//
// Chamadas:
//  - rotina (todo dia às 06h35 de Maceió, pelo agendador do banco): cabeçalho x-saga-chave = chave do cofre do banco
//    (saga_chave_rotina). Confere os últimos 30 dias, porque o Meta ainda ajusta os números dos dias recentes.
//  - pela tela (Marketing > Painel), com o login da pessoa:
//      acao "atualizar": quem edita as campanhas ou o administrador geral (meta_pode_atualizar); opcional "dias" (1 a 90).
//      acao "testar": só o administrador geral; confere a chave e as contas e, se der certo, traz os últimos 90 dias.
// A chave de leitura do Meta fica no cofre do banco (meta_chave_leitura): nunca aparece na tela, no registro nem nos avisos.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const TZ = "America/Maceio";
const GRAPH = "https://graph.facebook.com";
// versões da ligação com o Meta, da mais nova conhecida para trás; a que funcionar fica gravada em meta_config.versao_api
const VERSOES = ["v26.0", "v27.0", "v28.0", "v25.0"];
const CONVERSA = ["onsite_conversion.messaging_conversation_started_7d"];
const CADASTRO = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-saga-chave",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/* ---------- datas ---------- */
const hojeLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function somaDias(key: string, n: number) { const d = new Date(key + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

/* ---------- erros (nunca deixar a chave aparecer) ---------- */
class ErroMeta extends Error {
  codigo: number; sub: number;
  constructor(msg: string, codigo = 0, sub = 0) { super(msg); this.codigo = codigo; this.sub = sub; }
}
const limpar = (t: string) => String(t || "").replace(/access_token=[^&\s)"']+/gi, "access_token=***").replace(/EAA[A-Za-z0-9]{20,}/g, "***");
function traduzir(e: unknown): string {
  if (e instanceof ErroMeta) {
    const c = e.codigo, m = limpar(e.message);
    if ([190, 102, 463, 467].includes(c)) return "A chave do Meta venceu, foi trocada ou foi desligada. Gere uma chave nova e cole em Marketing > Painel > Robô do Meta.";
    if ([10, 3, 294].includes(c) || (c >= 200 && c < 300)) return "A chave não tem permissão para ler esta conta de anúncios. Confira se o usuário do sistema \"SAGA\" tem a conta atribuída (ver desempenho) e a permissão ads_read.";
    if ([4, 17, 32, 613, 80000, 80004].includes(c)) return "O Meta pediu para esperar um pouco (muitas consultas seguidas). O robô tenta de novo na próxima vez.";
    if (c === 2635 || /deprecated version|version.*(no longer|not exist|invalid)/i.test(m)) return "A versão da ligação com o Meta saiu de uso. Avise o suporte do SAGA para trocar.";
    if (c === 100 && /act_|ad ?account|Object with ID|does not exist/i.test(m)) return "Conta de anúncios não encontrada ou sem acesso: confira o número da conta em Marketing > Painel > Robô do Meta.";
    return `O Meta recusou a consulta (código ${c}): ${m}`.slice(0, 400);
  }
  const m = limpar((e as Error)?.message || String(e));
  if (/abort|timed? ?out|fetch|network|error sending request|dns|connect/i.test(m)) return "Não consegui falar com o Meta agora (internet ou o Meta fora do ar). O robô tenta de novo na próxima vez.";
  return m.slice(0, 400);
}

/* ---------- chamadas ao Meta ---------- */
async function pedir(url: string): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) {
      const er = j.error || {};
      throw new ErroMeta(String(er.message || `HTTP ${r.status}`), Number(er.code || r.status), Number(er.error_subcode || 0));
    }
    return j;
  } finally { clearTimeout(t); }
}
function endereco(caminho: string, params: Record<string, string>, chave: string, versao: string) {
  const u = new URL(`${GRAPH}/${versao}/${caminho}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", chave);
  return u.toString();
}
async function todasAsPaginas(caminho: string, params: Record<string, string>, chave: string, versao: string, limite = 60): Promise<any[]> {
  const out: any[] = [];
  let j = await pedir(endereco(caminho, params, chave, versao));
  for (let i = 0; i < limite; i++) {
    out.push(...(j.data || []));
    const prox = j.paging && j.paging.next;
    if (!prox) break;
    j = await pedir(prox);
  }
  return out;
}
const ehErroVersao = (e: unknown) => e instanceof ErroMeta && (e.codigo === 2635 || /deprecated version|unknown version|version.*(no longer|not exist|invalid)/i.test(e.message));
type Conf = { contas: string[]; versao_api: string; ativo: boolean };
// tenta a versão gravada e, se o Meta disser que ela saiu de uso, as outras; a que funcionar fica gravada
async function comVersao<T>(conf: Conf, f: (v: string) => Promise<T>): Promise<T> {
  const lista = [conf.versao_api, ...VERSOES.filter((v) => v !== conf.versao_api)];
  let ultimo: unknown = null;
  for (const v of lista) {
    try {
      const r = await f(v);
      if (v !== conf.versao_api) { conf.versao_api = v; await admin.from("meta_config").update({ versao_api: v }).eq("id", true); }
      return r;
    } catch (e) {
      ultimo = e;
      if (!ehErroVersao(e)) throw e;
    }
  }
  throw ultimo;
}
function acao(actions: any[] | undefined, tipos: string[]): number {
  let n = 0;
  for (const t of tipos) {
    const a = (actions || []).find((x: any) => x && x.action_type === t);
    if (a) n = Math.max(n, Number(a.value) || 0);
  }
  return Math.round(n);
}
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const dia = (t: unknown) => (typeof t === "string" && /^\d{4}-\d{2}-\d{2}/.test(t)) ? t.slice(0, 10) : null;
async function opcional<T>(p: Promise<T>, padrao: T, notas: string[], rotulo: string): Promise<T> {
  try { return await p; } catch (e) { if ((e as ErroMeta).codigo === 190) throw e; notas.push(`${rotulo}: ${traduzir(e)}`); return padrao; }
}

/* ---------- leitura de uma conta ---------- */
async function lerConta(conta: string, de: string, ate: string, chave: string, versao: string, notas: string[]) {
  const act = `act_${conta}`;
  // números por anúncio e por dia (o essencial: se falhar, a atualização inteira falha)
  const linhas = await todasAsPaginas(`${act}/insights`, {
    level: "ad", time_increment: "1", time_range: JSON.stringify({ since: de, until: ate }),
    fields: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,inline_link_clicks,actions,date_start",
    limit: "500",
  }, chave, versao);
  // cadastro das campanhas, dos anúncios e os totais da campanha inteira (se falhar, segue sem eles)
  const [campanhas, anuncios, totais] = await Promise.all([
    opcional(todasAsPaginas(`${act}/campaigns`, { fields: "id,name,objective,effective_status,start_time,stop_time", limit: "200" }, chave, versao, 20), [] as any[], notas, "campanhas"),
    opcional(todasAsPaginas(`${act}/ads`, { fields: "id,name,campaign_id,adset_id,adset{name},effective_status,creative{thumbnail_url,image_url,body,title,instagram_permalink_url}", limit: "100" }, chave, versao, 20), [] as any[], notas, "anúncios"),
    opcional(todasAsPaginas(`${act}/insights`, { level: "campaign", date_preset: "maximum", fields: "campaign_id,reach,impressions,spend", limit: "500" }, chave, versao, 10), [] as any[], notas, "totais"),
  ]);
  const camp = new Map<string, any>(), anun = new Map<string, any>(), dias: any[] = [];
  for (const l of linhas) {
    if (!l.ad_id || !l.campaign_id || !dia(l.date_start)) continue;
    dias.push({
      data: dia(l.date_start), anuncio_id: String(l.ad_id), anuncio_nome: l.ad_name || "", campanha_meta_id: String(l.campaign_id),
      gasto: num(l.spend), impressoes: num(l.impressions), alcance: num(l.reach), cliques: num(l.clicks), cliques_link: num(l.inline_link_clicks),
      conversas: acao(l.actions, CONVERSA), leads: acao(l.actions, CADASTRO),
    });
    if (!camp.has(String(l.campaign_id))) camp.set(String(l.campaign_id), { id: String(l.campaign_id), conta_id: conta, nome: l.campaign_name || "" });
    if (!anun.has(String(l.ad_id))) anun.set(String(l.ad_id), { id: String(l.ad_id), campanha_meta_id: String(l.campaign_id), conjunto_id: l.adset_id ? String(l.adset_id) : null, conjunto_nome: l.adset_name || null, nome: l.ad_name || "" });
  }
  for (const c of campanhas) {
    if (!c.id) continue;
    camp.set(String(c.id), { ...(camp.get(String(c.id)) || {}), id: String(c.id), conta_id: conta, nome: c.name || "", objetivo: c.objective || null,
      situacao: c.effective_status || null, inicio: dia(c.start_time), fim: dia(c.stop_time) });
  }
  for (const t of totais) {
    if (!t.campaign_id) continue;
    const id = String(t.campaign_id);
    camp.set(id, { ...(camp.get(id) || { id, conta_id: conta, nome: "" }), alcance_total: num(t.reach), impressoes_total: num(t.impressions), gasto_total: num(t.spend) });
  }
  for (const a of anuncios) {
    if (!a.id || !a.campaign_id) continue;
    const cr = a.creative || {};
    anun.set(String(a.id), { ...(anun.get(String(a.id)) || {}), id: String(a.id), campanha_meta_id: String(a.campaign_id),
      conjunto_id: a.adset_id ? String(a.adset_id) : null, conjunto_nome: (a.adset && a.adset.name) || null, nome: a.name || "",
      situacao: a.effective_status || null, miniatura_url: cr.thumbnail_url || null, imagem_url: cr.image_url || null,
      link_post: cr.instagram_permalink_url || null, texto: (cr.body || cr.title || "").slice(0, 600) || null });
  }
  return { campanhas: [...camp.values()], anuncios: [...anun.values()], dias };
}

/* ---------- configuração e chave ---------- */
async function lerConf(): Promise<{ conf: Conf; chave: string }> {
  const c = await admin.from("meta_config").select("contas,versao_api,ativo").eq("id", true).maybeSingle();
  const k = await admin.rpc("meta_chave_leitura");
  return { conf: { contas: (c.data && c.data.contas) || [], versao_api: (c.data && c.data.versao_api) || VERSOES[0], ativo: !!(c.data && c.data.ativo) }, chave: k.data ? String(k.data) : "" };
}

/* ---------- atualizar ---------- */
async function atualizar(conf: Conf, chave: string, dias: number, origem: string, pedidoPor: string | null) {
  const inicio = new Date().toISOString(), ate = hojeLocal(), de = somaDias(ate, -(Math.max(1, Math.min(90, dias)) - 1));
  const notas: string[] = [];
  try {
    if (!conf.contas.length) throw new Error("Nenhuma conta de anúncios cadastrada em Marketing > Painel > Robô do Meta.");
    const todos = { campanhas: [] as any[], anuncios: [] as any[], dias: [] as any[] };
    for (const conta of conf.contas) {
      const r = await comVersao(conf, (v) => lerConta(conta, de, ate, chave, v, notas));
      todos.campanhas.push(...r.campanhas); todos.anuncios.push(...r.anuncios); todos.dias.push(...r.dias);
    }
    const g = await admin.rpc("meta_receber", { p: { origem, inicio, de, ate, contas: conf.contas, substituir_periodo: true, pedido_por_id: pedidoPor, ...todos } });
    if (g.error) throw new Error("Não consegui gravar no banco: " + g.error.message);
    return { ok: true, de, ate, notas, ...(g.data || {}) };
  } catch (e) {
    const erro = traduzir(e);
    await admin.rpc("meta_receber", { p: { origem, inicio, de, ate, contas: conf.contas, pedido_por_id: pedidoPor, erro } });
    return { ok: false, de, ate, mensagem: erro, notas };
  }
}

/* ---------- testar a chave ---------- */
async function testar(conf: Conf, chave: string) {
  const contas: any[] = [];
  const quem = await comVersao(conf, (v) => pedir(endereco("me", { fields: "id,name" }, chave, v)));
  for (const conta of conf.contas) {
    try {
      const a = await pedir(endereco(`act_${conta}`, { fields: "name,currency,account_status,timezone_name" }, chave, conf.versao_api));
      contas.push({ id: conta, nome: a.name || conta, moeda: a.currency || "", ativa: Number(a.account_status) === 1, fuso: a.timezone_name || "" });
    } catch (e) {
      contas.push({ id: conta, erro: traduzir(e) });
    }
  }
  return { quem: quem && quem.name ? String(quem.name) : "", contas };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const corpo = await req.json().catch(() => ({}));
    const acaoPedida = String(corpo.acao || "");
    const ch = await admin.rpc("saga_chave_rotina");
    const chaveRotina = ch.data ? String(ch.data) : "";
    const { conf, chave } = await lerConf();

    // agendador do banco: todo dia, últimos 30 dias
    if (chaveRotina && req.headers.get("x-saga-chave") === chaveRotina) {
      if (acaoPedida !== "rotina") return json({ ok: false, mensagem: "Ação inválida." }, 400);
      if (!chave) return json({ ok: true, mensagem: "Robô do Meta ainda sem chave: nada a fazer." });
      if (!conf.ativo) return json({ ok: true, mensagem: "Robô do Meta desligado pelo administrador." });
      return json(await atualizar(conf, chave, 30, "robo", null));
    }

    // pela tela: com o login da pessoa
    const auth = req.headers.get("Authorization") || "";
    const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const eu = await usuario.rpc("meu_perfil_id");
    const meuId = eu.data ? String(eu.data) : null;
    if (!meuId) return json({ ok: false, mensagem: "Entre no sistema de novo." }, 401);

    if (acaoPedida === "testar") {
      const adm = await usuario.rpc("eh_admin_sistema");
      if (adm.error || adm.data !== true) return json({ ok: false, mensagem: "Só o administrador geral testa a chave do Meta." }, 403);
      if (!chave) return json({ ok: false, mensagem: "Cole a chave do Meta e salve antes de testar." });
      let t;
      try { t = await testar(conf, chave); } catch (e) {
        const erro = traduzir(e);
        await admin.rpc("meta_receber", { p: { origem: "teste", inicio: new Date().toISOString(), contas: conf.contas, pedido_por_id: meuId, erro } });
        return json({ ok: false, mensagem: erro });
      }
      const ruins = t.contas.filter((c: any) => c.erro);
      if (ruins.length) return json({ ok: false, mensagem: ruins[0].erro, ...t });
      const r = await atualizar(conf, chave, 90, "teste", meuId);
      return json({ ...r, ...t, mensagem: r.ok ? `Chave funcionando. Trouxe os números dos últimos 90 dias (${(r as any).dias || 0} linhas).` : (r as any).mensagem });
    }

    if (acaoPedida === "atualizar") {
      const pode = await usuario.rpc("meta_pode_atualizar");
      if (pode.error || pode.data !== true) return json({ ok: false, mensagem: "Só quem edita as campanhas pede a atualização." }, 403);
      if (!chave) return json({ ok: false, mensagem: "O robô do Meta ainda não foi ligado: falta a chave de leitura (o administrador cola em Marketing > Painel > Robô do Meta)." });
      if (!conf.ativo) return json({ ok: false, mensagem: "O robô do Meta está desligado pelo administrador." });
      // evita consultas repetidas: se acabou de atualizar, não pede de novo ao Meta
      const u = await admin.from("meta_sincronizacoes").select("fim,ok").order("inicio", { ascending: false }).limit(1).maybeSingle();
      if (u.data && u.data.ok && u.data.fim && Date.now() - new Date(u.data.fim).getTime() < 120000) {
        return json({ ok: true, mensagem: "Os números acabaram de ser atualizados.", repetido: true });
      }
      const r = await atualizar(conf, chave, Number(corpo.dias) || 30, "manual", meuId);
      return json({ ...r, mensagem: r.ok ? "Números do Meta atualizados." : (r as any).mensagem });
    }
    return json({ ok: false, mensagem: "Ação inválida." }, 400);
  } catch (e) {
    return json({ ok: false, mensagem: traduzir(e) }, 500);
  }
});
