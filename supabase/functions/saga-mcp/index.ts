// SAGA no Claude (T66, bloco 151, 10/11/2026, pedido do Dr. Victor): servidor MCP do SAGA.
// Versão 2 (T66 parte 2, bloco 179, 12/11/2026): além das consultas, MUDANÇAS (anotar, tarefas, intimações, agenda,
// situação/campos do processo e guardar arquivo na pasta do cliente). Desde 13/11 (T182, bloco 190) TODA a equipe usa
// (conector_claude.usar vem de todos os perfis), cada um com o próprio login e as próprias permissões.
// T182 (blocos 191+, 13/11/2026): toda mudança do Claude no SAGA passa por aqui (financeiro do processo, agenda, etiquetas,
// cliente, recursos, pagamentos...); o_que_posso_fazer lista o que a pessoa pode. O ADMINISTRADOR pode excluir (exclusão
// lógica de processo, compromisso), sempre com o OK explícito dele; para os outros as ferramentas de excluir recusam.
// Cada mudança é uma função conector_* SECURITY INVOKER (mesmas regras das telas), com limite de 60 por hora e registro
// com antes e depois. O Claude deve pedir o OK da pessoa antes de cada mudança.
// T166 (bloco 185, 12/11/2026): PEDIDOS DO CLAUDE para a pessoa (pedir_ao_usuario, meus_pedidos_pendentes, concluir_pedido):
// o que o Claude precisa que a pessoa traga vira tarefa "Pedido do Claude" (Minhas Tarefas e ficha) e é concluído quando chega.
// O Claude (claude.ai, aplicativo ou Claude Code) liga este endereço como "conector personalizado":
//   https://fmoskdxgjulagedzjxxk.supabase.co/functions/v1/saga-mcp
// Login: servidor OAuth 2.1 do próprio Supabase (Authentication > OAuth Server). Sem chave válida, a resposta é 401
// com o endereço dos metadados deste recurso (RFC 9728); o Claude então abre o login do SAGA e a página
// autorizar_conector.html, onde a pessoa autoriza. Cada ferramenta chama uma função conector_* do banco COM O LOGIN
// DA PESSOA (vale só o que ela já pode ver no SAGA) e cada consulta vai para o Registro de atividades.
// Publicar com verify_jwt = false (este código confere a chave sozinho).
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
  "você age COMO ESSA PESSOA: só aparece o que ela já pode ver e só muda o que ela já pode mudar na tela do SAGA. Todo cliente tem um CÓDIGO permanente (VMM-01234) e cada processo o código do cliente + a sigla da tese (VMM-01234-PSS; 2º da mesma tese: PSS2): quando a pessoa citar um código, use-o em 'buscar', 'ver_cliente' (codigo) ou 'ver_processo' (numero), e mostre o código nas respostas para evitar confusão entre homônimos. Comece por 'buscar' para achar o cliente " +
  "ou o processo e use os ids em 'ver_cliente' e 'ver_processo'. No dia a dia: 'resumo_escritorio', 'listar_intimacoes', " +
  "'listar_tarefas' e 'ver_agenda'. Marketing: 'resumo_marketing'. Responda em português do Brasil, em linguagem simples, e trate " +
  "CPF, telefone e dados de clientes com cuidado (LGPD): não repita esses dados sem necessidade. Cada consulta fica registrada no " +
  "Registro de atividades do SAGA. Os links 'link_da_ficha' abrem a ficha no SAGA. " +
  "MUDANÇAS (anotar_no_processo, criar_tarefa, alterar_tarefa, concluir_tarefa, concluir_intimacao, ligar_intimacao_ao_processo, " +
  "criar_compromisso, mudar_situacao_processo, mudar_campo_processo, guardar_arquivo_na_pasta_do_cliente): ANTES de cada uma, mostre à " +
  "pessoa, em uma frase, exatamente o que vai mudar (em qual cliente/processo, de quê para quê) e só chame depois do OK dela. " +
  "Uma mudança por chamada; no máximo 60 por hora. REGRA: TODA mudança no SAGA passa por este conector; NUNCA abra o SAGA no navegador para mudar algo (o navegador fica só para o que não é do SAGA: cálculos, sites de tribunais). Não sabe se existe ferramenta? Chame 'o_que_posso_fazer'; se não existir, diga à pessoa para fazer pela tela. " +
  "Outras mudanças: ver_financeiro_processo/mudar_financeiro_processo (valores, recebido, zerar expectativa), alterar_compromisso, concluir_compromisso, agendar_retorno, etiqueta_processo, mudar_dados_cliente, contato_cliente, parte_do_processo, recurso_do_processo, mudar_fase_processo, criar_cliente (regra do cliente repetido), criar_processo, ver_pagamentos_cliente, combinar_pagamento, marcar_parcela, mudar_parcela, lancamento_financeiro e distribuicao_honorarios. Cancelar tarefa ou compromisso sem ser administrador = concluir com o comentário \"Cancelado: motivo\". " +
  "EXCLUIR (excluir_processo, excluir_compromisso e outras 'excluir_'): só o ADMINISTRADOR; diga exatamente o que será excluído e só chame depois do OK EXPLÍCITO dele nesta conversa; para colaborador a ferramenta recusa (colaborador não apaga nada no SAGA). " +
  "Para escolher responsável, coluna da tarefa, situação ou tipo de agenda, use 'equipe_e_opcoes'. Datas em AAAA-MM-DD, horas de Maceió. " +
  "PEDIDOS DO CLAUDE: ao começar a tratar de um cliente ou processo, chame 'meus_pedidos_pendentes' (com o processo_id) e lembre a pessoa do que ainda falta. " +
  "Quando você precisar de algo DELA para andar (autos inteiros, certidão, contracheque, documento), proponha registrar com 'pedir_ao_usuario' " +
  "(com o OK dela) para ela não esquecer. Quando ela trouxer o que foi pedido (\"você pediu isso aqui\"), analise e chame 'concluir_pedido' " +
  "dizendo o que recebeu e o que achou; não precisa pedir OK de novo para concluir o pedido que ela mesma acabou de atender, mas diga que concluiu.";

type Args = Record<string, unknown>;
type Ferramenta = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; rpc: string; args: (a: Args) => Record<string, unknown>; muda?: boolean; especial?: "arquivo" | "posso"; precisa?: string[]; admin?: boolean; exclui?: boolean };
const SO_LEITURA = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const MUDA = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const EXCLUI = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
const SO_ADMIN_OK = " SÓ O ADMINISTRADOR (para os outros a ferramenta recusa). ANTES DE CHAMAR: diga exatamente o que vai ser excluído (cliente, código, número) e espere o OK EXPLÍCITO dele nesta conversa. Fica no Registro de atividades com o antes e o depois.";
const num = (v: unknown, nome: string) => { if (v == null || v === "") return null; const x = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", ".")); if (!Number.isFinite(x)) throw new ErroArgs(`${nome}: número inválido (use 1234.56).`); return x; };
const PEDIR_OK = " ANTES DE CHAMAR: diga à pessoa exatamente o que vai mudar e espere o OK dela. Fica no Registro de atividades com o antes e o depois.";
const ehHora = (v: unknown) => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
const ehDataHora = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v);
// data e hora de Maceió (sem fuso) viram horário com -03:00
const comFuso = (v: string) => /([+-]\d{2}:?\d{2}|Z)$/.test(v) ? v : v.replace(" ", "T").slice(0, 16) + ":00-03:00";
const texto = (v: unknown, max: number) => v == null ? null : String(v).slice(0, max);
const uuidOuNulo = (v: unknown, nome: string) => v == null || v === "" ? null : exigeUuid(v, nome);
const MAX_ARQUIVO = 10 * 1024 * 1024;
const TIPOS_ARQUIVO: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text", txt: "text/plain", md: "text/markdown", csv: "text/csv",
};
const ehUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const ehData = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const inteiro = (v: unknown) => (typeof v === "number" && Number.isFinite(v)) ? Math.round(v) : (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);
class ErroArgs extends Error {}
function exigeUuid(v: unknown, nome: string) { if (!ehUuid(v)) throw new ErroArgs(`Informe ${nome} (o id que veio em "buscar").`); return v as string; }

const FERRAMENTAS: Ferramenta[] = [
  {
    name: "buscar", title: "Buscar no SAGA",
    description: "Procura no SAGA clientes, processos e colaboradores por nome, CPF, número do processo, CÓDIGO do cliente (VMM-01234, ou só 01234) ou do processo (VMM-01234-PSS), código antigo da planilha, telefone, e-mail ou começo do endereço. Devolve as listas 'pessoas', 'processos', 'usuarios' e 'contatos' (onde o telefone/e-mail/endereço foi achado), com os ids para usar em ver_cliente e ver_processo.",
    inputSchema: { type: "object", properties: { termo: { type: "string", description: "Nome, CPF, número do processo, código (VMM-01234 ou VMM-01234-PSS), telefone, e-mail ou começo do endereço (pelo menos 2 letras ou números)." } }, required: ["termo"], additionalProperties: false },
    rpc: "conector_buscar", args: (a) => ({ p_termo: String(a.termo ?? "").slice(0, 200) }),
  },
  {
    name: "ver_cliente", title: "Ficha do cliente",
    description: "Ficha de um cliente: dados, perfil (situação funcional, órgão, cargo...), telefones, e-mails, todos os processos dele (fase, etapa, situação, tese, responsável, próxima providência e, para quem vê o Financeiro, os valores) e os últimos atendimentos.",
    inputSchema: { type: "object", properties: {
      pessoa_id: { type: "string", description: "id do cliente (uuid), vindo de 'buscar'." },
      codigo: { type: "string", description: "Ou o código do cliente: VMM-01234 (também aceita só 01234 ou o código antigo da planilha)." } }, additionalProperties: false },
    rpc: "conector_cliente", args: (a) => {
      if (a.pessoa_id == null && a.codigo == null) throw new ErroArgs("Informe o id do cliente ou o código (VMM-01234).");
      return { p_pessoa: a.pessoa_id == null ? null : exigeUuid(a.pessoa_id, "o id do cliente"), p_codigo: a.codigo == null ? null : String(a.codigo).slice(0, 40) };
    },
  },
  {
    name: "ver_processo", title: "Dados do processo",
    description: "Tudo de um processo: fase, etapa, situação, tese, responsável, próxima providência, cliente, dados da planilha, recursos, últimas intimações, tarefas abertas, comentários recentes, agenda e, para quem vê o Financeiro, os valores. Aceita o id, o número do processo (ou de um recurso dele) ou o código do processo (VMM-01234-PSS).",
    inputSchema: { type: "object", properties: {
      processo_id: { type: "string", description: "id do processo (uuid), vindo de 'buscar' ou 'ver_cliente'." },
      numero: { type: "string", description: "Número do processo (CNJ, com ou sem pontuação), de um recurso dele, ou o código do processo (VMM-01234-PSS; também o código antigo da planilha)." } }, additionalProperties: false },
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
  {
    name: "equipe_e_opcoes", title: "Equipe e opções",
    description: "Lista a equipe (ids para responsável e pessoa da agenda), as colunas das tarefas, as situações de processo e os tipos de compromisso da agenda. Use antes de criar ou mudar tarefas, compromissos ou a situação do processo.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    rpc: "conector_equipe", args: () => ({}),
  },
  {
    name: "meus_pedidos_pendentes", title: "Pedidos do Claude em aberto",
    description: "Lista o que o Claude já pediu para a pessoa conectada trazer e ainda não chegou (autos, certidões, documentos...), com o processo e o cliente. Chame ao começar a tratar de um cliente ou processo (com processo_id) para lembrar a pessoa.",
    inputSchema: { type: "object", properties: { processo_id: { type: "string", description: "Só os pedidos de um processo (uuid), opcional." } }, additionalProperties: false },
    rpc: "conector_pedidos_pendentes", args: (a) => ({ p_processo: uuidOuNulo(a.processo_id, "o id do processo") }),
  },
  // ----- MUDANÇAS (bloco 179) -----
  {
    name: "anotar_no_processo", title: "Anotar no processo", muda: true,
    description: "MUDA O SAGA: grava uma anotação (comentário) no processo, com o nome da pessoa conectada; aparece na ficha do cliente, nos comentários do processo." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      processo_id: { type: "string", description: "id do processo (uuid)." },
      texto: { type: "string", description: "Texto da anotação (até 8.000 letras)." } }, required: ["processo_id", "texto"], additionalProperties: false },
    rpc: "conector_comentar_processo", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_texto: texto(a.texto, 8000) }),
  },
  {
    name: "criar_tarefa", title: "Criar tarefa", muda: true,
    description: "MUDA O SAGA: cria uma tarefa (aparece em Minhas Tarefas e na ficha), com prazo, responsável (padrão: quem está conectado), prioridade e processo. A coluna sai sozinha pelo tribunal do processo." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      titulo: { type: "string", description: "Título da tarefa." },
      processo_id: { type: "string", description: "id do processo (uuid), se for de um processo." },
      descricao: { type: "string", description: "Descrição (opcional)." },
      prazo: { type: "string", description: "Prazo AAAA-MM-DD (opcional)." },
      hora: { type: "string", description: "Hora do prazo HH:MM (opcional)." },
      responsavel_id: { type: "string", description: "id do responsável (de equipe_e_opcoes); padrão: quem está conectado." },
      prioridade: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
      coluna_id: { type: "string", description: "id da coluna (opcional; padrão: automática pelo tribunal)." } }, required: ["titulo"], additionalProperties: false },
    rpc: "conector_criar_tarefa", args: (a) => {
      if (a.prazo != null && !ehData(a.prazo)) throw new ErroArgs("Prazo no formato AAAA-MM-DD.");
      if (a.hora != null && !ehHora(a.hora)) throw new ErroArgs("Hora no formato HH:MM.");
      return { p_titulo: texto(a.titulo, 300), p_processo: uuidOuNulo(a.processo_id, "o id do processo"), p_descricao: texto(a.descricao, 8000),
        p_prazo: a.prazo ?? null, p_hora: a.hora ?? null, p_responsavel: uuidOuNulo(a.responsavel_id, "o id do responsável"),
        p_prioridade: a.prioridade ?? null, p_coluna: uuidOuNulo(a.coluna_id, "o id da coluna") };
    },
  },
  {
    name: "alterar_tarefa", title: "Mudar tarefa", muda: true,
    description: "MUDA O SAGA: muda uma tarefa aberta: prazo (ou tirar o prazo), hora, responsável, coluna, prioridade, título, descrição e/ou acrescenta um comentário (o comentário também vai para a ficha do processo). Mande só o que muda. Devolve como era antes e como ficou." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      tarefa_id: { type: "string", description: "id da tarefa (uuid), de listar_tarefas ou ver_processo." },
      prazo: { type: "string", description: "Novo prazo AAAA-MM-DD." },
      tirar_prazo: { type: "boolean", description: "true para deixar sem prazo." },
      hora: { type: "string", description: "Hora HH:MM." },
      responsavel_id: { type: "string" }, coluna_id: { type: "string" },
      prioridade: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
      titulo: { type: "string" }, descricao: { type: "string" },
      comentario: { type: "string", description: "Comentário a acrescentar na tarefa." } }, required: ["tarefa_id"], additionalProperties: false },
    rpc: "conector_alterar_tarefa", args: (a) => {
      if (a.prazo != null && !ehData(a.prazo)) throw new ErroArgs("Prazo no formato AAAA-MM-DD.");
      if (a.hora != null && !ehHora(a.hora)) throw new ErroArgs("Hora no formato HH:MM.");
      return { p_tarefa: exigeUuid(a.tarefa_id, "o id da tarefa"), p_prazo: a.prazo ?? null, p_tirar_prazo: !!a.tirar_prazo, p_hora: a.hora ?? null,
        p_responsavel: uuidOuNulo(a.responsavel_id, "o id do responsável"), p_coluna: uuidOuNulo(a.coluna_id, "o id da coluna"),
        p_prioridade: a.prioridade ?? null, p_titulo: texto(a.titulo, 300), p_descricao: texto(a.descricao, 8000), p_comentario: texto(a.comentario, 8000) };
    },
  },
  {
    name: "concluir_tarefa", title: "Concluir ou reabrir tarefa", muda: true,
    description: "MUDA O SAGA: dá o check numa tarefa (concluir) ou reabre (concluir=false), com comentário opcional." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      tarefa_id: { type: "string" }, concluir: { type: "boolean", description: "true conclui (padrão); false reabre." },
      comentario: { type: "string" } }, required: ["tarefa_id"], additionalProperties: false },
    rpc: "conector_concluir_tarefa", args: (a) => ({ p_tarefa: exigeUuid(a.tarefa_id, "o id da tarefa"), p_concluir: a.concluir == null ? true : !!a.concluir, p_comentario: texto(a.comentario, 8000) }),
  },
  {
    name: "concluir_intimacao", title: "Concluir ou reabrir intimação", muda: true,
    description: "MUDA O SAGA: dá o check numa intimação (concluir) ou reabre (concluir=false), com comentário opcional; usa a mesma regra da tela Intimações." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      intimacao_id: { type: "string", description: "id da intimação (uuid), de listar_intimacoes." },
      concluir: { type: "boolean", description: "true conclui (padrão); false reabre." }, comentario: { type: "string" } },
      required: ["intimacao_id"], additionalProperties: false },
    rpc: "conector_concluir_intimacao", args: (a) => ({ p_intimacao: exigeUuid(a.intimacao_id, "o id da intimação"), p_concluir: a.concluir == null ? true : !!a.concluir, p_comentario: texto(a.comentario, 8000) }),
  },
  {
    name: "ligar_intimacao_ao_processo", title: "Ligar intimação a um processo", muda: true,
    description: "MUDA O SAGA: liga uma intimação a um processo já cadastrado (como \"Ligar a um processo existente\" na tela Intimações); a tarefa aberta dela vai junto." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      intimacao_id: { type: "string" }, processo_id: { type: "string" },
      responsavel_id: { type: "string", description: "Responsável (opcional)." } }, required: ["intimacao_id", "processo_id"], additionalProperties: false },
    rpc: "conector_ligar_intimacao", args: (a) => ({ p_intimacao: exigeUuid(a.intimacao_id, "o id da intimação"), p_processo: exigeUuid(a.processo_id, "o id do processo"),
      p_responsavel: uuidOuNulo(a.responsavel_id, "o id do responsável") }),
  },
  {
    name: "criar_compromisso", title: "Criar compromisso ou prazo na agenda", muda: true,
    description: "MUDA O SAGA: cria um compromisso na agenda (prazo processual, audiência, reunião, despacho, perícia, outros). Ligado a processo vai para a agenda do escritório; sem processo fica particular, salvo escritorio=true. Avisa se a pessoa já tem outro compromisso no horário (não impede). Atendimento de cliente: marcar pela Agenda do SAGA." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      titulo: { type: "string" },
      inicio: { type: "string", description: "Início AAAA-MM-DDTHH:MM (hora de Maceió)." },
      fim: { type: "string", description: "Fim AAAA-MM-DDTHH:MM (opcional)." },
      tipo: { type: "string", enum: ["Prazo Processual", "Audiencia", "Reuniao", "Despacho", "Pericia", "Outros"] },
      processo_id: { type: "string" }, responsavel_id: { type: "string", description: "De quem é a agenda (padrão: quem está conectado)." },
      local: { type: "string", description: "Local ou link." }, observacao: { type: "string" },
      escritorio: { type: "boolean", description: "true: agenda do escritório (todos veem)." } }, required: ["titulo", "inicio"], additionalProperties: false },
    rpc: "conector_criar_compromisso", args: (a) => {
      if (!ehDataHora(a.inicio)) throw new ErroArgs("Início no formato AAAA-MM-DDTHH:MM.");
      if (a.fim != null && !ehDataHora(a.fim)) throw new ErroArgs("Fim no formato AAAA-MM-DDTHH:MM.");
      return { p_titulo: texto(a.titulo, 300), p_inicio: comFuso(String(a.inicio)), p_fim: a.fim == null ? null : comFuso(String(a.fim)),
        p_tipo: a.tipo == null ? "Prazo Processual" : String(a.tipo), p_processo: uuidOuNulo(a.processo_id, "o id do processo"),
        p_responsavel: uuidOuNulo(a.responsavel_id, "o id da pessoa"), p_local: texto(a.local, 500), p_observacao: texto(a.observacao, 4000),
        p_escritorio: a.escritorio == null ? null : !!a.escritorio };
    },
  },
  {
    name: "mudar_situacao_processo", title: "Mudar a situação do processo", muda: true,
    description: "MUDA O SAGA: troca a situação da ação do processo (nome exato do menu; veja equipe_e_opcoes). Pode levar um texto de contato com o cliente. Fica anotado nos comentários do processo." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      processo_id: { type: "string" }, situacao: { type: "string", description: "Nome da situação, ex.: Protocolada." },
      contato: { type: "string", description: "Texto do contato com o cliente (opcional)." } }, required: ["processo_id", "situacao"], additionalProperties: false },
    rpc: "conector_situacao_processo", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_situacao: texto(a.situacao, 120), p_contato: texto(a.contato, 2000) }),
  },
  {
    name: "mudar_campo_processo", title: "Mudar um campo do processo", muda: true,
    description: "MUDA O SAGA: grava um campo (coluna) da planilha do processo, pelo nome da coluna como aparece em ver_processo (dados da planilha): observações, datas, valores, menus... Vale a mesma conferência da planilha (formato, opções do menu, permissão). Valor vazio limpa o campo. A próxima providência sai das tarefas: para mudá-la, crie ou mude a tarefa." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      processo_id: { type: "string" }, campo: { type: "string", description: "Nome da coluna da planilha." },
      valor: { type: "string", description: "Novo valor (datas dd/mm/aaaa; valores 1234,56; opções com o nome exato)." } }, required: ["processo_id", "campo", "valor"], additionalProperties: false },
    rpc: "conector_campo_processo", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_campo: texto(a.campo, 120), p_valor: texto(a.valor, 4000) }),
  },
  {
    name: "pedir_ao_usuario", title: "Registrar um pedido para a pessoa", muda: true,
    description: "MUDA O SAGA: registra algo que você (Claude) precisa que a pessoa conectada traga para andar com o processo (ex.: baixar os autos inteiros, certidão de óbito, contracheque). Vira uma tarefa \"Pedido do Claude\" dela, em Minhas Tarefas e na ficha, com o que trazer, por quê e de qual conversa. Não repete pedido igual em aberto no mesmo processo." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      o_que: { type: "string", description: "O que a pessoa precisa trazer, curto (vira o título)." },
      motivo: { type: "string", description: "Por que precisa (para que serve)." },
      assunto: { type: "string", description: "Conversa ou assunto em que surgiu o pedido." },
      processo_id: { type: "string", description: "id do processo (uuid), se for de um processo." },
      prazo: { type: "string", description: "Prazo AAAA-MM-DD (opcional)." } }, required: ["o_que"], additionalProperties: false },
    rpc: "conector_pedir_ao_usuario", args: (a) => {
      if (a.prazo != null && !ehData(a.prazo)) throw new ErroArgs("Prazo no formato AAAA-MM-DD.");
      return { p_o_que: texto(a.o_que, 250), p_motivo: texto(a.motivo, 3000), p_assunto: texto(a.assunto, 500),
        p_processo: uuidOuNulo(a.processo_id, "o id do processo"), p_prazo: a.prazo ?? null };
    },
  },
  {
    name: "concluir_pedido", title: "Concluir um pedido do Claude", muda: true,
    description: "MUDA O SAGA: dá como concluído um pedido do Claude (de meus_pedidos_pendentes) quando a pessoa trouxe o que foi pedido. Informe o que foi recebido e o que a análise mostrou: vira comentário na tarefa e na ficha do processo. Só serve para pedidos do Claude (para outras tarefas, concluir_tarefa).",
    inputSchema: { type: "object", properties: {
      pedido_id: { type: "string", description: "id do pedido (pedido_id de meus_pedidos_pendentes)." },
      recebido: { type: "string", description: "O que foi recebido e o resumo da análise." } }, required: ["pedido_id", "recebido"], additionalProperties: false },
    rpc: "conector_concluir_pedido", args: (a) => ({ p_pedido: exigeUuid(a.pedido_id, "o id do pedido"), p_recebido: texto(a.recebido, 8000) }),
  },
  {
    name: "guardar_arquivo_na_pasta_do_cliente", title: "Guardar arquivo na pasta do cliente", muda: true, especial: "arquivo",
    description: "MUDA O SAGA: guarda um arquivo (PDF, imagem, Word, Excel, texto; até 10 MB) nos Documentos do processo, na ficha do cliente (opcionalmente numa pasta da ficha, pelo nome). O conteúdo vai em base64." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      processo_id: { type: "string" },
      nome_arquivo: { type: "string", description: "Nome com a extensão, ex.: Peticao inicial.pdf" },
      conteudo_base64: { type: "string", description: "Conteúdo do arquivo em base64." },
      pasta: { type: "string", description: "Nome de uma pasta da ficha do cliente (opcional)." } }, required: ["processo_id", "nome_arquivo", "conteudo_base64"], additionalProperties: false },
    rpc: "conector_documento_registrar", args: () => ({}),
  },
  // ----- T182 lote 1 (bloco 191) -----
  {
    name: "o_que_posso_fazer", title: "O que posso fazer no SAGA", especial: "posso",
    description: "Lista TODAS as ferramentas do SAGA e diz quais a pessoa conectada pode usar (pelas permissões dela). Chame quando não souber se existe ferramenta para um pedido: toda mudança no SAGA passa por este conector; não use o navegador para o SAGA.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    rpc: "minhas_permissoes", args: () => ({}),
  },
  {
    name: "ver_financeiro_processo", title: "Financeiro do processo", precisa: ["financeiro.visualizar", "financeiro.editar"],
    description: "Valores do processo no Financeiro: valor principal, correção SELIC, honorários (total, da sentença, percentual), valor recebido/sacado e data, data do protocolo, observação, e o calculado (expectativa, a receber, etapa). Só para quem vê o Financeiro.",
    inputSchema: { type: "object", properties: { processo_id: { type: "string", description: "id do processo (uuid)." } }, required: ["processo_id"], additionalProperties: false },
    rpc: "conector_financeiro_ver", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo") }),
  },
  {
    name: "mudar_financeiro_processo", title: "Mudar o financeiro do processo", muda: true, precisa: ["financeiro.editar"],
    description: "MUDA O SAGA: grava valores do processo no Financeiro (como a janela do processo na tela Financeiro). Mande só o que muda; 'limpar' tira o valor de um campo (ex.: ['valor_recebido'] para tirar um recebido lançado errado). 'zerar_expectativa': true para processo encerrado sem nada a receber (põe os honorários da sentença em 0 e anota na observação; o 'a receber' fica 0). Valor recebido sem data usa hoje. Devolve antes, depois e o calculado." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      processo_id: { type: "string" },
      valor_principal: { type: "number" }, valor_correcao_selic: { type: "number" }, valor_honorarios_total: { type: "number" },
      valor_honorarios_sentenca: { type: "number", description: "Honorários definidos na sentença (R$)." },
      percentual_honorarios: { type: "number", description: "0 a 100." },
      valor_recebido: { type: "number", description: "Valor recebido/sacado (R$)." },
      data_recebimento: { type: "string", description: "AAAA-MM-DD" }, data_sentenca: { type: "string", description: "AAAA-MM-DD" },
      data_protocolo: { type: "string", description: "AAAA-MM-DD" }, observacao: { type: "string" },
      limpar: { type: "array", items: { type: "string", enum: ["valor_principal", "valor_correcao_selic", "valor_honorarios_total", "valor_honorarios_sentenca", "valor_recebido", "percentual_honorarios", "data_sentenca", "data_recebimento", "data_protocolo", "observacao"] } },
      zerar_expectativa: { type: "boolean" } }, required: ["processo_id"], additionalProperties: false },
    rpc: "conector_financeiro_salvar", args: (a) => {
      const d: Record<string, unknown> = {};
      for (const k of ["valor_principal", "valor_correcao_selic", "valor_honorarios_total", "valor_honorarios_sentenca", "percentual_honorarios", "valor_recebido"]) if (a[k] != null) d[k] = num(a[k], k);
      for (const k of ["data_recebimento", "data_sentenca", "data_protocolo"]) if (a[k] != null) { if (!ehData(a[k])) throw new ErroArgs(`${k} no formato AAAA-MM-DD.`); d[k] = a[k]; }
      if (a.observacao != null) d.observacao = texto(a.observacao, 4000);
      const limpar = Array.isArray(a.limpar) ? a.limpar.map(String) : null;
      if (!Object.keys(d).length && !limpar?.length && !a.zerar_expectativa) throw new ErroArgs("Diga o que mudar.");
      return { p_processo: exigeUuid(a.processo_id, "o id do processo"), p_dados: d, p_limpar: limpar, p_zerar_expectativa: !!a.zerar_expectativa };
    },
  },
  {
    name: "alterar_compromisso", title: "Mudar compromisso da agenda", muda: true,
    description: "MUDA O SAGA: muda um compromisso da agenda (título, data/hora, fim, tipo, local, observação, de quem é). Pode quem criou, a pessoa da agenda ou quem edita a agenda do escritório. Avisa se o novo horário está ocupado. Use os ids de ver_agenda ou ver_processo." + PEDIR_OK,
    inputSchema: { type: "object", properties: {
      compromisso_id: { type: "string" }, titulo: { type: "string" },
      inicio: { type: "string", description: "AAAA-MM-DDTHH:MM (Maceió)." }, fim: { type: "string", description: "AAAA-MM-DDTHH:MM" },
      tirar_fim: { type: "boolean" }, tipo: { type: "string", enum: ["Prazo Processual", "Audiencia", "Reuniao", "Despacho", "Pericia", "Outros", "retorno"] },
      local: { type: "string" }, observacao: { type: "string" }, responsavel_id: { type: "string" } }, required: ["compromisso_id"], additionalProperties: false },
    rpc: "conector_compromisso_editar", args: (a) => {
      if (a.inicio != null && !ehDataHora(a.inicio)) throw new ErroArgs("Início no formato AAAA-MM-DDTHH:MM.");
      if (a.fim != null && !ehDataHora(a.fim)) throw new ErroArgs("Fim no formato AAAA-MM-DDTHH:MM.");
      return { p_compromisso: exigeUuid(a.compromisso_id, "o id do compromisso"), p_titulo: texto(a.titulo, 300),
        p_inicio: a.inicio == null ? null : comFuso(String(a.inicio)), p_fim: a.fim == null ? null : comFuso(String(a.fim)), p_tirar_fim: !!a.tirar_fim,
        p_tipo: a.tipo ?? null, p_local: texto(a.local, 500), p_observacao: texto(a.observacao, 4000), p_responsavel: uuidOuNulo(a.responsavel_id, "o id da pessoa") };
    },
  },
  {
    name: "concluir_compromisso", title: "Concluir ou reabrir compromisso", muda: true,
    description: "MUDA O SAGA: marca um compromisso da agenda como feito (ou reabre), com comentário. Para DESMARCAR/cancelar sem ser administrador, conclua com o comentário \"Cancelado: motivo\" (colaborador não apaga)." + PEDIR_OK,
    inputSchema: { type: "object", properties: { compromisso_id: { type: "string" }, concluir: { type: "boolean" }, comentario: { type: "string" } }, required: ["compromisso_id"], additionalProperties: false },
    rpc: "conector_compromisso_concluir", args: (a) => ({ p_compromisso: exigeUuid(a.compromisso_id, "o id do compromisso"), p_concluir: a.concluir == null ? true : !!a.concluir, p_comentario: texto(a.comentario, 4000) }),
  },
  {
    name: "excluir_compromisso", title: "Excluir compromisso (administrador)", muda: true, exclui: true, admin: true,
    description: "APAGA do SAGA um compromisso da agenda, com o motivo." + SO_ADMIN_OK,
    inputSchema: { type: "object", properties: { compromisso_id: { type: "string" }, motivo: { type: "string" } }, required: ["compromisso_id", "motivo"], additionalProperties: false },
    rpc: "conector_compromisso_excluir", args: (a) => ({ p_compromisso: exigeUuid(a.compromisso_id, "o id do compromisso"), p_motivo: texto(a.motivo, 500) }),
  },
  {
    name: "agendar_retorno", title: "Retorno agendado do processo", muda: true,
    description: "MUDA O SAGA: o \"Retorno agendado\" da ficha (Agenda > retorno do processo): cria, ou muda a data/hora se já existir. remover=true tira o retorno (só o administrador; os outros concluem com concluir_compromisso)." + PEDIR_OK,
    inputSchema: { type: "object", properties: { processo_id: { type: "string" }, inicio: { type: "string", description: "AAAA-MM-DDTHH:MM (Maceió)." },
      observacao: { type: "string" }, remover: { type: "boolean" } }, required: ["processo_id"], additionalProperties: false },
    rpc: "conector_retorno", args: (a) => {
      if (!a.remover && !ehDataHora(a.inicio)) throw new ErroArgs("Informe inicio no formato AAAA-MM-DDTHH:MM.");
      return { p_processo: exigeUuid(a.processo_id, "o id do processo"), p_inicio: a.inicio == null ? null : comFuso(String(a.inicio)), p_observacao: texto(a.observacao, 4000), p_remover: !!a.remover };
    },
  },
  {
    name: "etiqueta_processo", title: "Pôr ou tirar etiqueta do processo", muda: true, precisa: ["pessoas.editar"],
    description: "MUDA O SAGA: põe (por=true, padrão) ou tira (por=false) uma etiqueta do processo, como na ficha (menu de etiquetas processuais e de urgência; nome exato). \"Requisitório OK\" e \"Processo finalizado\" disparam a regra do escritório (situação Encerrada)." + PEDIR_OK,
    inputSchema: { type: "object", properties: { processo_id: { type: "string" }, etiqueta: { type: "string" }, por: { type: "boolean" } }, required: ["processo_id", "etiqueta"], additionalProperties: false },
    rpc: "conector_etiqueta_processo", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_etiqueta: texto(a.etiqueta, 120), p_por: a.por == null ? true : !!a.por }),
  },
  {
    name: "excluir_processo", title: "Excluir processo/cartão (administrador)", muda: true, exclui: true, admin: true,
    description: "EXCLUI um processo/cartão (exclusão lógica: some das listas, o histórico fica; ex.: cartão duplicado). Informe o motivo." + SO_ADMIN_OK,
    inputSchema: { type: "object", properties: { processo_id: { type: "string" }, motivo: { type: "string" } }, required: ["processo_id", "motivo"], additionalProperties: false },
    rpc: "conector_excluir_processo", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_motivo: texto(a.motivo, 500) }),
  },
  // ----- T182 lote 2 (bloco 192) -----
  {
    name: "mudar_dados_cliente", title: "Mudar dados e perfil do cliente", muda: true, precisa: ["pessoas.editar"],
    description: "MUDA O SAGA: dados da ficha do cliente (nome_completo, cpf, situacao_vital vivo/falecido/nao_informado, data_falecimento, uf, municipio, endereco, email, telefone_whatsapp) e/ou o PERFIL (situacao_funcional do menu, orgao, cargo, profissao, matricula, data_nascimento, data_ingresso, data_aposentadoria em dd/mm/aaaa, nome_mae). Mande só o que muda; texto vazio limpa o campo do perfil. Telefones/e-mails/endereços da lista: use contato_cliente." + PEDIR_OK,
    inputSchema: { type: "object", properties: { pessoa_id: { type: "string" },
      dados: { type: "object", description: "Campos da ficha a mudar.", additionalProperties: { type: "string" } },
      perfil: { type: "object", description: "Campos do perfil a mudar.", additionalProperties: { type: "string" } } }, required: ["pessoa_id"], additionalProperties: false },
    rpc: "conector_cliente_editar", args: (a) => ({ p_pessoa: exigeUuid(a.pessoa_id, "o id do cliente"), p_dados: (a.dados && typeof a.dados === "object") ? a.dados : {}, p_perfil: (a.perfil && typeof a.perfil === "object") ? a.perfil : {} }),
  },
  {
    name: "contato_cliente", title: "Telefone, e-mail ou endereço do cliente", muda: true, precisa: ["pessoas.editar"],
    description: "MUDA O SAGA: cadastra (sem id) ou corrige (com o id que veio em ver_cliente) um telefone, e-mail ou endereço do cliente, como na ficha. Telefone: numero, whatsapp, principal, tipo (celular/fixo), detalhe. E-mail: email, principal. Endereço: endereco, cidade, uf, cep, tipo, principal, detalhe. desativar=true tira o contato da lista (só o administrador)." + PEDIR_OK,
    inputSchema: { type: "object", properties: { pessoa_id: { type: "string" }, tipo: { type: "string", enum: ["telefone", "email", "endereco"] },
      contato_id: { type: "string", description: "id do contato (para corrigir ou desativar)." },
      dados: { type: "object", description: "Ex.: {\"numero\":\"82999991234\",\"whatsapp\":true}" }, desativar: { type: "boolean" } }, required: ["pessoa_id", "tipo"], additionalProperties: false },
    rpc: "conector_contato_salvar", args: (a) => ({ p_pessoa: exigeUuid(a.pessoa_id, "o id do cliente"), p_tipo: String(a.tipo ?? ""), p_id: uuidOuNulo(a.contato_id, "o id do contato"),
      p_dados: (a.dados && typeof a.dados === "object") ? a.dados : {}, p_desativar: !!a.desativar }),
  },
  {
    name: "parte_do_processo", title: "Parte do processo (herdeiro, parente)", muda: true, precisa: ["processos.editar"],
    description: "MUDA O SAGA: cadastra ou corrige uma parte do processo (herdeiro, cônjuge, parente...), como em Partes do processo na ficha. dados: nome e cpf (pessoa nova; com CPF já cadastrado usa a ficha existente) ou pessoa_id, papel (nome do menu, ex.: Herdeiro), herdeiro_de_id, quota, percentual_honorarios (precisa permissão), observacao; para corrigir, mande o id da parte." + PEDIR_OK,
    inputSchema: { type: "object", properties: { processo_id: { type: "string" }, dados: { type: "object" } }, required: ["processo_id", "dados"], additionalProperties: false },
    rpc: "conector_parte_salvar", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_dados: (a.dados && typeof a.dados === "object") ? a.dados : {} }),
  },
  {
    name: "recurso_do_processo", title: "Recurso do processo", muda: true, precisa: ["processos.editar"],
    description: "MUDA O SAGA: cadastra (sem recurso_id) ou corrige um recurso DENTRO do processo (agravo, apelação, embargos...; não vira processo novo). dados: tipo e situacao (nomes do menu), numero, tribunal, orgao, relator, interposto_em (AAAA-MM-DD), quem_recorreu (nos ou outra_parte), observacao. Intimações com o número do recurso passam a cair no processo." + PEDIR_OK,
    inputSchema: { type: "object", properties: { processo_id: { type: "string" }, recurso_id: { type: "string" }, dados: { type: "object" } }, required: ["processo_id", "dados"], additionalProperties: false },
    rpc: "conector_recurso_salvar", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_id: uuidOuNulo(a.recurso_id, "o id do recurso"), p_dados: (a.dados && typeof a.dados === "object") ? a.dados : {} }),
  },
  {
    name: "mudar_fase_processo", title: "Passar entre Captação e Jurídico", muda: true, precisa: ["processos.editar"],
    description: "MUDA O SAGA: passa o processo da Captação para o Jurídico (ou volta), entrando na etapa inicial da fase, como na tela." + PEDIR_OK,
    inputSchema: { type: "object", properties: { processo_id: { type: "string" }, fase: { type: "string", enum: ["captacao", "juridico"] } }, required: ["processo_id", "fase"], additionalProperties: false },
    rpc: "conector_mudar_fase", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_fase: String(a.fase ?? "") }),
  },
  {
    name: "criar_cliente", title: "Cadastrar cliente novo", muda: true, precisa: ["pessoas.criar"],
    description: "MUDA O SAGA: cadastra um cliente novo (nome completo, CPF, telefone, e-mail). Regra do cliente repetido: CPF já cadastrado NÃO cria (devolve a ficha existente); nome igual ou parecido devolve as fichas parecidas e NÃO cria: pergunte à pessoa se é uma delas (use a ficha) ou se é ficha separada de propósito (mande motivo_ficha_separada, mín. 10 letras). Depois cadastre o processo com criar_processo (o código VMM nasce aí). Antes, procure com 'buscar'." + PEDIR_OK,
    inputSchema: { type: "object", properties: { nome: { type: "string" }, cpf: { type: "string" }, telefone: { type: "string" }, email: { type: "string" },
      motivo_ficha_separada: { type: "string" } }, required: ["nome"], additionalProperties: false },
    rpc: "conector_cliente_novo", args: (a) => ({ p_nome: texto(a.nome, 200), p_cpf: texto(a.cpf, 20), p_telefone: texto(a.telefone, 30), p_email: texto(a.email, 200), p_motivo_ficha_separada: texto(a.motivo_ficha_separada, 1000) }),
  },
  {
    name: "criar_processo", title: "Cadastrar processo/cartão novo", muda: true, precisa: ["processos.criar"],
    description: "MUDA O SAGA: cadastra um processo (cartão) para um cliente: tese (nome ou sigla), fase (captacao ou juridico; entra na etapa inicial), número CNJ, valor da causa, percentual de honorários (só grava para quem mexe no Financeiro), responsável, origem do cliente (nome do menu: rede social, indicação...) e campanha (código, ex.: IR27). O código do processo (VMM-01234-PSS) sai sozinho. Confira antes com ver_cliente se o processo já existe." + PEDIR_OK,
    inputSchema: { type: "object", properties: { pessoa_id: { type: "string" }, tese: { type: "string" }, fase: { type: "string", enum: ["captacao", "juridico"] },
      numero: { type: "string" }, valor_causa: { type: "number" }, percentual_honorarios: { type: "number" }, responsavel_id: { type: "string" },
      origem: { type: "string" }, campanha: { type: "string" } }, required: ["pessoa_id", "tese"], additionalProperties: false },
    rpc: "conector_processo_novo", args: (a) => ({ p_pessoa: exigeUuid(a.pessoa_id, "o id do cliente"), p_tese: texto(a.tese, 120), p_fase: a.fase == null ? "captacao" : String(a.fase),
      p_numero: texto(a.numero, 40), p_valor_causa: num(a.valor_causa, "valor_causa"), p_percentual: num(a.percentual_honorarios, "percentual_honorarios"),
      p_responsavel: uuidOuNulo(a.responsavel_id, "o id do responsável"), p_origem: texto(a.origem, 120), p_campanha: texto(a.campanha, 120) }),
  },
  // ----- T182 lote 3 (bloco 193) -----
  {
    name: "ver_pagamentos_cliente", title: "Pagamentos e parcelas do cliente",
    description: "Pagamentos combinados do cliente (bloco Pagamentos da ficha) com as parcelas (pagas e a pagar), como na ficha. Honorários só para quem vê o Financeiro.",
    inputSchema: { type: "object", properties: { pessoa_id: { type: "string" } }, required: ["pessoa_id"], additionalProperties: false },
    rpc: "conector_pagamentos_ver", args: (a) => ({ p_pessoa: exigeUuid(a.pessoa_id, "o id do cliente") }),
  },
  {
    name: "combinar_pagamento", title: "Combinar ou mudar pagamento parcelado", muda: true,
    description: "MUDA O SAGA: cria (sem id) ou muda um pagamento combinado da ficha, que gera as parcelas sozinho. dados: pessoa_id, processo_id (opcional), tipo (nome do menu, ex.: Honorários parcelados), quem_paga, descricao, valor_total ou valor_parcela, n_parcelas, primeiro_vencimento (AAAA-MM-DD), periodicidade (mensal, quinzenal, semanal). Mudar total/número/datas refaz só as parcelas que faltam." + PEDIR_OK,
    inputSchema: { type: "object", properties: { dados: { type: "object" } }, required: ["dados"], additionalProperties: false },
    rpc: "conector_pagamento_acordo", args: (a) => ({ p_dados: (a.dados && typeof a.dados === "object") ? a.dados : {} }),
  },
  {
    name: "marcar_parcela", title: "Marcar parcela paga (ou desmarcar)", muda: true,
    description: "MUDA O SAGA: marca uma parcela como paga (data, valor, forma do menu) ou desmarca (pago=false). Parcela de honorários paga entra no Financeiro como receita confirmada (desmarcar tira)." + PEDIR_OK,
    inputSchema: { type: "object", properties: { parcela_id: { type: "string" }, pago: { type: "boolean" }, valor: { type: "number" }, data: { type: "string", description: "AAAA-MM-DD" },
      forma: { type: "string" }, observacao: { type: "string" } }, required: ["parcela_id"], additionalProperties: false },
    rpc: "conector_parcela_marcar", args: (a) => {
      if (a.data != null && !ehData(a.data)) throw new ErroArgs("Data no formato AAAA-MM-DD.");
      return { p_parcela: exigeUuid(a.parcela_id, "o id da parcela"), p_pago: a.pago == null ? true : !!a.pago, p_valor: num(a.valor, "valor"), p_data: a.data ?? null, p_forma: texto(a.forma, 80), p_obs: texto(a.observacao, 2000) };
    },
  },
  {
    name: "mudar_parcela", title: "Mudar vencimento ou valor de uma parcela", muda: true,
    description: "MUDA O SAGA: muda o vencimento, o valor ou a observação de uma parcela ainda não paga." + PEDIR_OK,
    inputSchema: { type: "object", properties: { parcela_id: { type: "string" }, vencimento: { type: "string" }, valor: { type: "number" }, observacao: { type: "string" } }, required: ["parcela_id"], additionalProperties: false },
    rpc: "conector_parcela_editar", args: (a) => {
      if (a.vencimento != null && !ehData(a.vencimento)) throw new ErroArgs("Vencimento no formato AAAA-MM-DD.");
      return { p_parcela: exigeUuid(a.parcela_id, "o id da parcela"), p_vencimento: a.vencimento ?? null, p_valor: num(a.valor, "valor"), p_obs: texto(a.observacao, 2000) };
    },
  },
  {
    name: "lancamento_financeiro", title: "Lançamento avulso no Financeiro", muda: true, precisa: ["financeiro.editar"],
    description: "MUDA O SAGA: cria (sem id) ou muda um lançamento avulso do Financeiro. dados: tipo (receita/despesa), descricao, valor (> 0), data_lancamento (AAAA-MM-DD), categoria, processo_id, situacao (previsto/confirmado), observacao. Lançamento que veio de parcela paga muda pela parcela." + PEDIR_OK,
    inputSchema: { type: "object", properties: { lancamento_id: { type: "string" }, dados: { type: "object" } }, required: ["dados"], additionalProperties: false },
    rpc: "conector_lancamento_salvar", args: (a) => ({ p_id: uuidOuNulo(a.lancamento_id, "o id do lançamento"), p_dados: (a.dados && typeof a.dados === "object") ? a.dados : {} }),
  },
  {
    name: "distribuicao_honorarios", title: "Distribuição dos honorários do processo", muda: true, precisa: ["financeiro.editar"],
    description: "MUDA O SAGA: põe (sem id) ou muda uma linha da distribuição dos honorários do processo (rateio da tela Financeiro). dados: usuario_id (colaborador, de equipe_e_opcoes) ou beneficiario_externo, percentual (da causa; a soma não passa dos honorários) ou valor_fixo, pago, data_pagamento, observacao." + PEDIR_OK,
    inputSchema: { type: "object", properties: { processo_id: { type: "string" }, linha_id: { type: "string" }, dados: { type: "object" } }, required: ["processo_id", "dados"], additionalProperties: false },
    rpc: "conector_distribuicao_salvar", args: (a) => ({ p_processo: exigeUuid(a.processo_id, "o id do processo"), p_id: uuidOuNulo(a.linha_id, "o id da linha"), p_dados: (a.dados && typeof a.dados === "object") ? a.dados : {} }),
  },
  {
    name: "excluir_registro", title: "Excluir tarefa, lançamento ou linha da distribuição (administrador)", muda: true, exclui: true, admin: true,
    description: "APAGA do SAGA uma tarefa, um lançamento avulso do Financeiro ou uma linha da distribuição dos honorários, com o motivo. Colaborador: para cancelar uma tarefa, conclua com o comentário \"Cancelada: motivo\"." + SO_ADMIN_OK,
    inputSchema: { type: "object", properties: { tipo: { type: "string", enum: ["tarefa", "lancamento", "distribuicao"] }, id: { type: "string" }, motivo: { type: "string" } }, required: ["tipo", "id", "motivo"], additionalProperties: false },
    rpc: "conector_excluir_registro", args: (a) => ({ p_tipo: String(a.tipo ?? ""), p_id: exigeUuid(a.id, "o id"), p_motivo: texto(a.motivo, 500) }),
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
  if (/permission denied|row-level security/i.test(m)) return "Sem permissão para isso no SAGA.";
  if (/invalid input syntax for type uuid/i.test(m)) return "O id informado não é válido: use o id que veio em \"buscar\".";
  if (/JWT expired|jwt/i.test(m)) return "O acesso ao SAGA venceu: conecte de novo.";
  return m.replace(/^.*?ERROR:\s*/i, "").slice(0, 500);
}

function base64ParaBytes(b64: string) {
  const limpo = b64.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(limpo)) throw new ErroArgs("O conteúdo do arquivo não está em base64.");
  const bin = atob(limpo.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
const falha = (t: string) => ({ content: [{ type: "text", text: t }], isError: true });

// guardar arquivo: confere no banco, sobe no mesmo lugar da ficha (documentos-clientes/<processo>/...) com o login da pessoa e registra
async function guardarArquivo(args: Args, cliente: ReturnType<typeof createClient>) {
  let proc: string, nome: string, bytes: Uint8Array;
  try {
    proc = exigeUuid(args.processo_id, "o id do processo");
    nome = String(args.nome_arquivo ?? "").trim().slice(0, 180);
    if (!nome) throw new ErroArgs("Informe o nome do arquivo, com a extensão.");
    bytes = base64ParaBytes(String(args.conteudo_base64 ?? ""));
  } catch (e) { if (e instanceof ErroArgs) return falha(e.message); throw e; }
  const ext = (nome.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] || "").toLowerCase();
  const tipo = TIPOS_ARQUIVO[ext];
  if (!tipo) return falha("Tipo de arquivo não aceito. Aceitos: " + Object.keys(TIPOS_ARQUIVO).join(", ") + ".");
  if (!bytes.length) return falha("O arquivo está vazio.");
  if (bytes.length > MAX_ARQUIVO) return falha("Arquivo grande demais (máximo 10 MB). Guarde pela ficha do SAGA.");
  const prep = await cliente.rpc("conector_documento_preparar", { p_processo: proc });
  if (prep.error) return falha(textoErro(prep.error.message || String(prep.error)));
  const seguro = nome.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `${proc}/${crypto.randomUUID()}_${seguro}`;
  const up = await cliente.storage.from("documentos-clientes").upload(caminho, bytes, { contentType: tipo, upsert: false });
  if (up.error) return falha("Não consegui guardar o arquivo: " + textoErro(up.error.message || String(up.error)));
  const reg = await cliente.rpc("conector_documento_registrar", { p_processo: proc, p_nome: nome, p_caminho: caminho, p_tamanho: bytes.length, p_pasta: texto(args.pasta, 120) });
  if (reg.error) {
    try { await cliente.storage.from("documentos-clientes").remove([caminho]); } catch { /* fica sem registro: o arquivo solto é tirado */ }
    return falha(textoErro(reg.error.message || String(reg.error)));
  }
  return { content: [{ type: "text", text: JSON.stringify(reg.data ?? null) }] };
}

// o_que_posso_fazer: as ferramentas e se a pessoa conectada pode usar cada uma (minhas_permissoes, a mesma lista das telas)
async function oQuePossoFazer(cliente: ReturnType<typeof createClient>) {
  const [p, adm] = await Promise.all([cliente.rpc("minhas_permissoes"), cliente.rpc("eh_admin_sistema")]);
  if (p.error) return falha(textoErro(p.error.message || String(p.error)));
  const minhas = new Set<string>(Array.isArray(p.data) ? p.data : []);
  const ehAdm = adm.data === true;
  if (!ehAdm && !minhas.has("conector_claude.usar")) return falha("Seu usuário não tem a permissão do conector (SAGA no Claude). Peça ao administrador.");
  const lista = FERRAMENTAS.filter((f) => f.especial !== "posso").map((f) => {
    const pode = f.admin ? ehAdm : (!f.precisa || ehAdm || f.precisa.some((x) => minhas.has(x)));
    return { ferramenta: f.name, o_que_faz: f.title, tipo: f.exclui ? "exclui" : f.muda ? "muda" : "consulta", pode_usar: pode,
      obs: f.admin && !ehAdm ? "só o administrador" : (!pode && f.precisa ? "falta a permissão " + f.precisa.join(" ou ") : (f.muda && pode ? "o banco ainda confere a permissão de cada registro, como na tela" : undefined)) };
  });
  return { content: [{ type: "text", text: JSON.stringify({ administrador: ehAdm, regra: "Toda mudança no SAGA passa por este conector; o navegador fica só para o que não é do SAGA. Se não houver ferramenta para o pedido, diga à pessoa e faça pela tela do SAGA.", ferramentas: lista }) }] };
}

async function chamarFerramenta(nome: string, args: Args, token: string) {
  const f = FERRAMENTAS.find((x) => x.name === nome);
  if (!f) return null;
  const cliente = createClient(URL_SB, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  if (f.especial === "arquivo") return await guardarArquivo(args || {}, cliente);
  if (f.especial === "posso") return await oQuePossoFazer(cliente);
  let parametros: Record<string, unknown>;
  try { parametros = f.args(args || {}); } catch (e) {
    if (e instanceof ErroArgs) return { content: [{ type: "text", text: e.message }], isError: true };
    throw e;
  }
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
        serverInfo: { name: "saga", title: "SAGA · Victor Morais Advocacia", version: "2.3.0" },
        instructions: INSTRUCOES,
      });
    }
    case "ping": return resultado(id, {});
    case "tools/list":
      return resultado(id, { tools: FERRAMENTAS.map((f) => ({ name: f.name, title: f.title, description: f.description, inputSchema: f.inputSchema, annotations: { title: f.title, ...(f.exclui ? EXCLUI : f.muda ? MUDA : SO_LEITURA) } })) });
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
      if (corpo.length > 10) return json(erroRpc(null, -32600, "No máximo 10 pedidos de uma vez."), 400);
      const respostas = (await Promise.all(corpo.map((x) => tratar(x, token)))).filter((x) => x !== null);
      return respostas.length ? json(respostas) : new Response(null, { status: 202, headers: CORS });
    }
    const r = await tratar(corpo, token);
    return r === null ? new Response(null, { status: 202, headers: CORS }) : json(r);
  } catch (e) {
    return json(erroRpc(corpo && !Array.isArray(corpo) ? corpo.id : null, -32603, textoErro((e as Error).message || String(e))), 500);
  }
});
