// SAGA no Claude (T66, bloco 151, 10/11/2026, pedido do Dr. Victor): servidor MCP do SAGA, versão 1 SÓ COM CONSULTAS.
// O Claude (claude.ai, aplicativo ou Claude Code) liga este endereço como "conector personalizado":
//   https://fmoskdxgjulagedzjxxk.supabase.co/functions/v1/saga-mcp
// Login: servidor OAuth 2.1 do próprio Supabase (Authentication > OAuth Server). Sem chave válida, a resposta é 401
// com o endereço dos metadados deste recurso (RFC 9728); o Claude então abre o login do SAGA e a página
// autorizar_conector.html, onde a pessoa autoriza. Cada ferramenta chama uma função conector_* do banco COM O LOGIN
// DA PESSOA (vale só o que ela já pode ver no SAGA) e cada consulta vai para o Registro de atividades.
// Nada aqui grava dado de cliente. Publicar com verify_jwt = false (este código confere a chave sozinho).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const RECURSO = "https://fmoskdxgjulagedzjxxk.supabase.co/functions/v1/saga-mcp";
const METADADOS = RECURSO + "/.well-known/oauth-protected-resource";
const EMISSOR = "https://fmoskdxgjulagedzjxxk.supabase.co/auth/v1";
const VERSOES = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id, last-event-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};
const INSTRUCOES =
  "Você está ligado ao SAGA, o sistema do escritório Victor Morais Advocacia (VMMADV), com o login da pessoa que conectou: " +
  "só aparece o que ela já pode ver no SAGA, e esta versão só CONSULTA (não muda nada). Comece por 'buscar' para achar o cliente " +
  "ou o processo e use os ids em 'ver_cliente' e 'ver_processo'. No dia a dia: 'resumo_escritorio', 'listar_intimacoes', " +
  "'listar_tarefas' e 'ver_agenda'. Marketing: 'resumo_marketing'. Responda em português do Brasil, em linguagem simples, e trate " +
  "CPF, telefone e dados de clientes com cuidado (LGPD): não repita esses dados sem necessidade. Cada consulta fica registrada no " +
  "Registro de atividades do SAGA. Os links 'link_da_ficha' abrem a ficha no SAGA.";

type Args = Record<string, unknown>;
type Ferramenta = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; rpc: string; args: (a: Args) => Record<string, unknown> };
const SO_LEITURA = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const ehUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const ehData = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const inteiro = (v: unknown) => (typeof v === "number" && Number.isFinite(v)) ? Math.round(v) : (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);
class ErroArgs extends Error {}
function exigeUuid(v: unknown, nome: string) { if (!ehUuid(v)) throw new ErroArgs(`Informe ${nome} (o id que veio em "buscar").`); return v as string; }

const FERRAMENTAS: Ferramenta[] = [
  {
    name: "buscar", title: "Buscar no SAGA",
    description: "Procura no SAGA clientes, processos e colaboradores por nome, CPF, número do processo, telefone, e-mail ou começo do endereço. Devolve as listas 'pessoas', 'processos', 'usuarios' e 'contatos' (onde o telefone/e-mail/endereço foi achado), com os ids para usar em ver_cliente e ver_processo.",
    inputSchema: { type: "object", properties: { termo: { type: "string", description: "Nome, CPF, número do processo, telefone, e-mail ou começo do endereço (pelo menos 2 letras ou números)." } }, required: ["termo"], additionalProperties: false },
    rpc: "conector_buscar", args: (a) => ({ p_termo: String(a.termo ?? "").slice(0, 200) }),
  },
  {
    name: "ver_cliente", title: "Ficha do cliente",
    description: "Ficha de um cliente: dados, perfil (situação funcional, órgão, cargo...), telefones, e-mails, todos os processos dele (fase, etapa, situação, tese, responsável, próxima providência e, para quem vê o Financeiro, os valores) e os últimos atendimentos.",
    inputSchema: { type: "object", properties: { pessoa_id: { type: "string", description: "id do cliente (uuid), vindo de 'buscar'." } }, required: ["pessoa_id"], additionalProperties: false },
    rpc: "conector_cliente", args: (a) => ({ p_pessoa: exigeUuid(a.pessoa_id, "o id do cliente") }),
  },
  {
    name: "ver_processo", title: "Dados do processo",
    description: "Tudo de um processo: fase, etapa, situação, tese, responsável, próxima providência, cliente, dados da planilha, recursos, últimas intimações, tarefas abertas, comentários recentes, agenda e, para quem vê o Financeiro, os valores. Aceita o id ou o número do processo (ou de um recurso dele).",
    inputSchema: { type: "object", properties: {
      processo_id: { type: "string", description: "id do processo (uuid), vindo de 'buscar' ou 'ver_cliente'." },
      numero: { type: "string", description: "Número do processo (CNJ, com ou sem pontuação) ou de um recurso dele." } }, additionalProperties: false },
    rpc: "conector_processo", args: (a) => {
      if (a.processo_id == null && a.numero == null) throw new ErroArgs("Informe o id do processo ou o número.");
      return { p_processo: a.processo_id == null ? null : exigeUuid(a.processo_id, "o id do processo"), p_numero: a.numero == null ? null : String(a.numero).slice(0, 60) };
    },
  },
  {
    name: "listar_intimacoes", title: "Intimações",
    description: "Intimações que chegaram ao SAGA (CNJ e e-mail dos tribunais), da mais nova para a mais antiga, com o processo, o cliente, a situação, o prazo e o resumo. Por padrão, só as pendentes dos últimos 7 dias.",
    inputSchema: { type: "object", properties: {
      dias: { type: "integer", minimum: 1, maximum: 365, description: "Quantos dias para trás (padrão 7)." },
      so_pendentes: { type: "boolean", description: "Só as que ainda não foram providenciadas (padrão sim)." },
      processo_id: { type: "string", description: "Só as de um processo (uuid)." },
      limite: { type: "integer", minimum: 1, maximum: 100, description: "Máximo de intimações (padrão 40)." } }, additionalProperties: false },
    rpc: "conector_intimacoes", args: (a) => ({ p_dias: inteiro(a.dias) ?? 7, p_so_pendentes: a.so_pendentes == null ? true : !!a.so_pendentes,
      p_processo: a.processo_id == null ? null : exigeUuid(a.processo_id, "o id do processo"), p_limite: inteiro(a.limite) ?? 40 }),
  },
  {
    name: "listar_tarefas", title: "Tarefas",
    description: "Tarefas do SAGA com prazo, prioridade, responsável, processo e cliente. Por padrão, as abertas da própria pessoa; 'de_todos' mostra as de toda a equipe que ela pode ver.",
    inputSchema: { type: "object", properties: {
      filtro: { type: "string", enum: ["abertas", "atrasadas", "hoje", "semana", "concluidas"], description: "abertas (padrão), atrasadas, hoje, semana (próximos 7 dias) ou concluidas (últimos 7 dias)." },
      de_todos: { type: "boolean", description: "Incluir as tarefas da equipe que a pessoa pode ver (padrão não)." },
      limite: { type: "integer", minimum: 1, maximum: 100, description: "Máximo de tarefas (padrão 50)." } }, additionalProperties: false },
    rpc: "conector_tarefas", args: (a) => ({ p_filtro: a.filtro == null ? "abertas" : String(a.filtro), p_todos: !!a.de_todos, p_limite: inteiro(a.limite) ?? 50 }),
  },
  {
    name: "ver_agenda", title: "Agenda",
    description: "Compromissos, audiências, prazos e atendimentos da agenda (a da pessoa e a do escritório) num período; por padrão, de hoje até daqui a 7 dias (máximo 62 dias). Horários de Maceió.",
    inputSchema: { type: "object", properties: {
      de: { type: "string", description: "Data inicial AAAA-MM-DD (padrão hoje)." },
      ate: { type: "string", description: "Data final AAAA-MM-DD (padrão 7 dias depois)." } }, additionalProperties: false },
    rpc: "conector_agenda", args: (a) => {
      if (a.de != null && !ehData(a.de)) throw new ErroArgs("Data inicial no formato AAAA-MM-DD.");
      if (a.ate != null && !ehData(a.ate)) throw new ErroArgs("Data final no formato AAAA-MM-DD.");
      return { p_de: a.de ?? null, p_ate: a.ate ?? null };
    },
  },
  {
    name: "resumo_escritorio", title: "Resumo do escritório",
    description: "Números gerais de hoje: processos do Jurídico (ativos, encerrados, sacados, protocolados), Captação por etapa do funil, minhas tarefas (abertas, atrasadas, para hoje), intimações pendentes, atendimentos dos próximos 7 dias e, para quem vê o Financeiro, os valores.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    rpc: "conector_resumo", args: () => ({}),
  },
  {
    name: "resumo_marketing", title: "Resumo do marketing",
    description: "Marketing num período: investido (anúncios do Meta + outros gastos, sem contar duas vezes), conversas iniciadas, contatos e clientes que vieram das campanhas, resultado por campanha e os melhores anúncios.",
    inputSchema: { type: "object", properties: { periodo: { type: "string", enum: ["mes", "3m", "ano", "tudo"], description: "mes, 3m (padrão: este mês e os dois anteriores), ano ou tudo." } }, additionalProperties: false },
    rpc: "conector_marketing", args: (a) => ({ p_periodo: a.periodo == null ? "3m" : String(a.periodo) }),
  },
];

const sbPublico = createClient(URL_SB, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const json = (o: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });
function semLogin(invalido: boolean) {
  const www = `Bearer ${invalido ? 'error="invalid_token", ' : ""}resource_metadata="${METADADOS}"`;
  return json({ error: invalido ? "invalid_token" : "unauthorized", error_description: "Entre no SAGA para usar o conector." }, 401, { "WWW-Authenticate": www });
}
const erroRpc = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const resultado = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
function textoErro(m: string) {
  if (/permission denied/i.test(m)) return "Sem permissão para essa consulta.";
  if (/invalid input syntax for type uuid/i.test(m)) return "O id informado não é válido: use o id que veio em \"buscar\".";
  if (/JWT expired|jwt/i.test(m)) return "O acesso ao SAGA venceu: conecte de novo.";
  return m.replace(/^.*?ERROR:\s*/i, "").slice(0, 500);
}

async function chamarFerramenta(nome: string, args: Args, token: string) {
  const f = FERRAMENTAS.find((x) => x.name === nome);
  if (!f) return null;
  let parametros: Record<string, unknown>;
  try { parametros = f.args(args || {}); } catch (e) {
    if (e instanceof ErroArgs) return { content: [{ type: "text", text: e.message }], isError: true };
    throw e;
  }
  const cliente = createClient(URL_SB, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const r = await cliente.rpc(f.rpc, parametros);
  if (r.error) return { content: [{ type: "text", text: textoErro(r.error.message || String(r.error)) }], isError: true };
  return { content: [{ type: "text", text: JSON.stringify(r.data ?? null) }] };
}

async function tratar(msg: any, token: string): Promise<unknown | null> {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return msg && typeof msg === "object" && ("result" in msg || "error" in msg) ? null : erroRpc(msg?.id, -32600, "Pedido inválido.");
  }
  const notificacao = !("id" in msg);
  if (notificacao) return null;
  const id = msg.id, p = msg.params || {};
  switch (msg.method) {
    case "initialize": {
      const pedida = String(p.protocolVersion || "");
      return resultado(id, {
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "saga", title: "SAGA · Victor Morais Advocacia", version: "1.0.0" },
        instructions: INSTRUCOES,
      });
    }
    case "ping": return resultado(id, {});
    case "tools/list":
      return resultado(id, { tools: FERRAMENTAS.map((f) => ({ name: f.name, title: f.title, description: f.description, inputSchema: f.inputSchema, annotations: { title: f.title, ...SO_LEITURA } })) });
    case "tools/call": {
      const r = await chamarFerramenta(String(p.name || ""), (p.arguments || {}) as Args, token);
      if (!r) return erroRpc(id, -32602, `Ferramenta desconhecida: ${String(p.name || "")}`);
      return resultado(id, r);
    }
    case "resources/list": return resultado(id, { resources: [] });
    case "prompts/list": return resultado(id, { prompts: [] });
    default: return erroRpc(id, -32601, `Método não disponível: ${msg.method}`);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // metadados do recurso protegido (RFC 9728): dizem ao Claude onde fica o login (o OAuth do Supabase)
  if (url.pathname.endsWith("/.well-known/oauth-protected-resource")) {
    return json({ resource: RECURSO, authorization_servers: [EMISSOR], bearer_methods_supported: ["header"],
      resource_name: "SAGA · Victor Morais Advocacia", resource_documentation: "https://vmmadvprecatorios-bot.github.io/saga-adv-web/" });
  }
  if (req.method !== "POST") return json({ error: "Use POST (servidor MCP sem fluxo contínuo)." }, 405, { Allow: "POST, OPTIONS" });
  // login: a chave do OAuth (um login normal do SAGA) vem no cabeçalho Authorization
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  if (!m) return semLogin(false);
  const token = m[1].trim();
  const u = await sbPublico.auth.getUser(token);
  if (u.error || !u.data || !u.data.user) return semLogin(true);
  let corpo: any;
  try { corpo = await req.json(); } catch { return json(erroRpc(null, -32700, "Não consegui ler o pedido (JSON inválido)."), 400); }
  try {
    if (Array.isArray(corpo)) {
      if (!corpo.length) return json(erroRpc(null, -32600, "Pedido vazio."), 400);
      const respostas = (await Promise.all(corpo.map((x) => tratar(x, token)))).filter((x) => x !== null);
      return respostas.length ? json(respostas) : new Response(null, { status: 202, headers: CORS });
    }
    const r = await tratar(corpo, token);
    return r === null ? new Response(null, { status: 202, headers: CORS }) : json(r);
  } catch (e) {
    return json(erroRpc(corpo && !Array.isArray(corpo) ? corpo.id : null, -32603, textoErro((e as Error).message || String(e))), 500);
  }
});
