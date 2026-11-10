// Ponto: relatorios por e-mail e banco de horas automatico (T03).
// Copia do Apps Script da planilha "Painel do Ponto": relatorioDiario_, relatorioSemanal_,
// fechamentoMensal_ e transportarSaldos_. O calculo vem de ponto_calculo.js (o mesmo da tela).
// 10/11/2026 (pedido do Dr. Victor): e-mails com visual PROPRIO do SAGA (assunto comecando com "[SAGA]",
// faixa "Relatório do SAGA", pontos de atencao com nomes, quadro da semana dia a dia e a lista de quem
// ainda nao bate o ponto no SAGA), para distinguir dos e-mails da planilha do Google e desligar a planilha depois.
//
// Chamadas:
//  - rotina (a cada hora, pelo agendador do banco): cabecalho x-saga-chave = chave do cofre do banco (saga_chave_rotina)
//  - manual (gestor logado, pela tela, ou o servidor com a chave): acao "teste" | "diario" | "semanal" (previa:true marca o assunto)
// Envio pelo Gmail do administrador geral: segredos GMAIL_USUARIO e GMAIL_SENHA_APP.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.16";
import "./ponto_calculo.js";

// deno-lint-ignore no-explicit-any
const PC: any = (globalThis as any).PontoCalculo;
const TZ = "America/Maceio";
const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const URL_PADRAO = "https://vmmadvprecatorios-bot.github.io/saga-adv-web";
// Paleta do SAGA nos e-mails (diferente da planilha, que usa cabeçalho #1F2A44 e fonte Calibri)
const AZUL = "#13233A", AZUL2 = "#2F6CD6", OURO = "#C9A84C", TINTA = "#1E293B", SUAVE = "#64748B", LINHA = "#E2E8F0", FUNDO = "#F4F6FA";
const FONTE = "'Segoe UI',Montserrat,Helvetica,Arial,sans-serif";
const COR_STATUS: Record<string, [string, string]> = {
  "Falta": ["#FDE2E2", "#B91C1C"], "Horas negativas": ["#FDECEC", "#B91C1C"], "Marcação incompleta": ["#FFEDD5", "#C2410C"], "Falta justificada": ["#FFEDD5", "#C2410C"],
  "Carga cumprida": ["#DCFCE7", "#15803D"], "Horas positivas": ["#D1FAE5", "#047857"], "Trabalho fora do expediente": ["#D1FAE5", "#047857"], "Registrado": ["#DCFCE7", "#15803D"],
  "Abonado": ["#E0F2FE", "#0369A1"], "Folga compensatória": ["#E0F2FE", "#0369A1"], "Folga concedida": ["#EDE9FE", "#6D28D9"], "Em andamento": ["#FEF9C3", "#A16207"], "Aguardando entrada": ["#FEF9C3", "#A16207"],
};
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-saga-chave",
};

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/* ---------- datas ---------- */
const dois = (n: number) => ("0" + n).slice(-2);
function agoraLocal() {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).forEach((x) => p[x.type] = x.value);
  return { hoje: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) };
}
function minutosLocal(iso: string) {
  const g: Record<string, number> = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso)).forEach((x) => g[x.type] = Number(x.value));
  return g.hour * 60 + g.minute + g.second / 60;
}
const dataLocalDe = (ts: string | null) => ts ? new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts)) : "";
const br = (k: string) => k.slice(8, 10) + "/" + k.slice(5, 7) + "/" + k.slice(0, 4);
const brCurto = (k: string) => k.slice(8, 10) + "/" + k.slice(5, 7);
const partesMes = (k: string) => { const p = k.split("-").map(Number); return { a: p[0], m: p[1] }; };
const mesAnterior = (k: string) => { const p = partesMes(k); return p.m === 1 ? `${p.a - 1}-12` : `${p.a}-${dois(p.m - 1)}`; };
const fimKeyDe = (k: string) => { const p = partesMes(k); return `${k}-${dois(PC.diasNoMes(p.a, p.m))}`; };
function somaDias(key: string, n: number) { const d = new Date(key + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

/* ---------- dados ---------- */
// deno-lint-ignore no-explicit-any
type Base = { cfg: any; regimes: Record<string, any>; feriados: Record<string, any>; colabs: any[]; jornadas: any[]; nome: string; url: string; semLogin: string[] };
async function carregarBase(): Promise<Base> {
  const [cfg, reg, fer, col, jor, sis, todos] = await Promise.all([
    admin.from("ponto_config").select("*").maybeSingle(),
    admin.from("ponto_regimes").select("*"),
    admin.from("ponto_feriados").select("*"),
    // So entra no calculo quem ja tem conta no SAGA (pre-cadastros aguardando o convite ficam de fora)
    admin.from("ponto_colaboradores").select("*, usuarios!inner(auth_user_id)").not("usuarios.auth_user_id", "is", null).order("codigo"),
    admin.from("ponto_jornadas").select("*"),
    admin.from("configuracoes_sistema").select("nome_escritorio,extra").maybeSingle(),
    admin.from("ponto_colaboradores").select("id,nome,demissao,usuarios(auth_user_id)").order("nome"),
  ]);
  // deno-lint-ignore no-explicit-any
  const regimes: Record<string, any> = {}; (reg.data || []).forEach((r: any) => regimes[r.nome] = r);
  // deno-lint-ignore no-explicit-any
  const feriados: Record<string, any> = {}; (fer.data || []).forEach((f: any) => feriados[f.data] = { desc: f.descricao, facultativo: /facultativo/i.test(f.abrangencia || ""), liberado: f.liberado });
  const { hoje } = agoraLocal();
  // deno-lint-ignore no-explicit-any
  const semLogin = (todos.data || []).filter((c: any) => !(c.usuarios && c.usuarios.auth_user_id) && (!c.demissao || c.demissao >= hoje)).map((c: any) => String(c.nome));
  return {
    cfg: cfg.data || {}, regimes, feriados, colabs: col.data || [], jornadas: jor.data || [],
    nome: sis.data?.nome_escritorio || "SAGA", url: sis.data?.extra?.url_sistema || URL_PADRAO, semLogin,
  };
}
// deno-lint-ignore no-explicit-any
const regimeDe = (b: Base, c: any) => { const r = b.regimes[c.regime] || { pausas: 0, duracao_pausa: 0, almoco: 0, livre: false }; return { pausas: r.pausas, duracao: r.duracao_pausa, almoco: r.almoco, livre: r.livre }; };
// deno-lint-ignore no-explicit-any
const colabCalc = (c: any) => ({ id: c.id, nome: c.nome, regime: c.regime, admissao: c.admissao, demissao: c.demissao, carga: null, entrada: null, saida: null });
const cfgCalc = (b: Base) => ({ tol: b.cfg.tolerancia_min, limite: b.cfg.limite_alerta, inicio: b.cfg.inicio_contagem });
// deno-lint-ignore no-explicit-any
const jornadasDe = (b: Base, id: string) => b.jornadas.filter((j: any) => j.colaborador_id === id);

// Calcula o mes de todos os colaboradores (mesmo calculo da tela)
async function coletarMes(b: Base, k: string, hoje: string) {
  const p = partesMes(k), ini = `${k}-01`, fim = fimKeyDe(k);
  const [mk, di] = await Promise.all([
    admin.from("ponto_marcacoes").select("colaborador_id,data,slot,momento").gte("data", ini).lte("data", fim),
    admin.from("ponto_dias").select("*").gte("data", ini).lte("data", fim),
  ]);
  // deno-lint-ignore no-explicit-any
  const mkPor: Record<string, any> = {}, diaPor: Record<string, any> = {};
  // deno-lint-ignore no-explicit-any
  (mk.data || []).forEach((x: any) => { const m = (mkPor[x.colaborador_id] ||= {}); (m[x.data] ||= [null, null, null, null, null, null, null, null])[x.slot] = minutosLocal(x.momento); });
  // deno-lint-ignore no-explicit-any
  (di.data || []).forEach((x: any) => { (diaPor[x.colaborador_id] ||= {})[x.data] = x; });
  // deno-lint-ignore no-explicit-any
  return b.colabs.map((c: any) => ({
    c, livre: regimeDe(b, c).livre,
    calc: PC.calcularMes(p.a, p.m, hoje, { colab: colabCalc(c), jornadas: jornadasDe(b, c.id), regime: regimeDe(b, c), cfg: cfgCalc(b), feriados: b.feriados, marcacoes: mkPor[c.id] || {}, dias: diaPor[c.id] || {} }),
  }));
}

/* ---------- banco de horas (mesma regra da tela e da planilha) ---------- */
async function banco(id: string, k: string) {
  const r = await admin.from("ponto_banco_horas").select("*").eq("colaborador_id", id).eq("mes", k).maybeSingle();
  return r.data;
}
async function auditar(acao: string, colab: string, detalhe: string) {
  await admin.from("ponto_auditoria").insert({ acao, colaborador_id: colab, usuario_id: null, detalhe: detalhe + " (automático)" });
}
const hhmm = (v: number) => PC.hhmm(v);
const sinal = (v: number) => (v < 0 ? "-" : v > 0 ? "+" : "") + PC.hhmm(Math.abs(v || 0));

// Fecha o mes k (1o ao dia de fechamento) para todos os colaboradores com horario
async function fecharMes(b: Base, k: string, hoje: string) {
  const p = partesMes(k), fechKey = `${k}-${dois(PC.diaFechamento(p.a, p.m, b.cfg.dia_fechamento))}`;
  const dados = await coletarMes(b, k, hoje);
  const out = [];
  for (const x of dados) {
    if (x.livre) continue;
    const ant = await banco(x.c.id, mesAnterior(k));
    const carga = PC.jornadaDoDia(colabCalc(x.c), jornadasDe(b, x.c.id), fechKey).carga || 0;
    const f = PC.fechamento(x.calc.dias, `${k}-01`, fechKey, ant && ant.transportar !== null ? ant.transportar : 0, carga);
    await admin.from("ponto_banco_horas").upsert({
      colaborador_id: x.c.id, mes: k, saldo_anterior: f.anterior, saldo_periodo: f.periodo, saldo_total: f.total, descontar: f.descontar,
      compensar: f.compensar, excedente: f.excedente, saldo_pos_fechamento: null, transportar: null, fechado_em: new Date().toISOString(), transportado_em: null,
    }, { onConflict: "colaborador_id,mes" });
    await auditar("Fechamento do mês", x.c.id, `${k}: anterior ${sinal(f.anterior)}, período ${sinal(f.periodo)}, total ${sinal(f.total)}, descontar ${hhmm(f.descontar)}, compensar ${hhmm(f.compensar)}, excedente ${hhmm(f.excedente)}`);
    out.push({ x, f });
  }
  return { dados, out, fechKey };
}
// Depois que o mes acabou: apura do dia seguinte ao fechamento ate o fim e transporta
async function transportarMes(b: Base, k: string, hoje: string) {
  const p = partesMes(k), fechKey = `${k}-${dois(PC.diaFechamento(p.a, p.m, b.cfg.dia_fechamento))}`, fimKey = fimKeyDe(k);
  if (hoje <= fimKey || fechKey >= fimKey) return 0;
  const pend = await admin.from("ponto_banco_horas").select("*").eq("mes", k).is("transportado_em", null).not("fechado_em", "is", null);
  // deno-lint-ignore no-explicit-any
  const lista = (pend.data || []).filter((r: any) => dataLocalDe(r.fechado_em) >= fechKey);
  if (!lista.length) return 0;
  const dados = await coletarMes(b, k, hoje);
  let n = 0;
  for (const r of lista) {
    const x = dados.find((y) => y.c.id === r.colaborador_id);
    if (!x) continue;
    const t = PC.transporte(x.calc.dias, somaDias(fechKey, 1), fimKey, r.compensar);
    await admin.from("ponto_banco_horas").update({ saldo_pos_fechamento: t.pos, transportar: t.transportar, transportado_em: new Date().toISOString() })
      .eq("colaborador_id", r.colaborador_id).eq("mes", k);
    await auditar("Saldo transportado", r.colaborador_id, `${k}: após o fechamento ${sinal(t.pos)}, transportado ${sinal(t.transportar)}`);
    n++;
  }
  return n;
}

/* ---------- e-mail: visual do SAGA ---------- */
const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hmEmail = (m: number | null | undefined) => (m === null || m === undefined ? "" : PC.hhmm(m));
const hm = (m: number | null) => (m === null || m === undefined ? "" : PC.hhmmRelogio(m));
function saldoEmail(m: number | null | undefined) {
  if (m === null || m === undefined) return `<span style="color:${SUAVE}">-</span>`;
  const cor = m < 0 ? "#B91C1C" : m > 0 ? "#047857" : TINTA;
  return `<span style="color:${cor};font-weight:600">${m > 0 ? "+" : ""}${PC.hhmm(m)}</span>`;
}
function selo(texto: string) {
  const c = COR_STATUS[texto] || ["#F1F5F9", "#334155"];
  return texto ? `<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:${c[0]};color:${c[1]};font-size:11.5px;font-weight:600;white-space:nowrap">${esc(texto)}</span>` : "";
}
function secao(titulo: string, dica?: string) {
  return `<div style="margin:22px 0 8px;font-family:${FONTE}"><div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${AZUL2};font-weight:700">${esc(titulo)}</div>` +
    (dica ? `<div style="font-size:12px;color:${SUAVE};margin-top:2px">${dica}</div>` : "") + "</div>";
}
function tabela(cab: string[], linhas: string[][], alinhar?: string[]) {
  let h = `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;width:100%;font-family:${FONTE};font-size:13px;border:1px solid ${LINHA};border-radius:10px;overflow:hidden">`;
  h += "<tr>" + cab.map((x, j) => `<th style="background:${FUNDO};color:${SUAVE};font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;padding:9px 10px;border-bottom:1px solid ${LINHA};text-align:${(alinhar && alinhar[j]) || (j === 0 ? "left" : "center")}">${esc(x)}</th>`).join("") + "</tr>";
  linhas.forEach((l, i) => {
    h += "<tr>" + l.map((x, j) => `<td style="padding:9px 10px;${i < linhas.length - 1 ? `border-bottom:1px solid ${LINHA};` : ""}color:${TINTA};text-align:${(alinhar && alinhar[j]) || (j === 0 ? "left" : "center")};vertical-align:middle">${x}</td>`).join("") + "</tr>";
  });
  return h + "</table>";
}
function numeros(itens: [string, string | number, string?][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;margin:4px -8px 0"><tr>` + itens.map((it) =>
    `<td style="background:#FFFFFF;border:1px solid ${LINHA};border-top:3px solid ${it[2] || AZUL2};border-radius:10px;padding:10px 14px;font-family:${FONTE};min-width:90px">` +
    `<div style="font-size:22px;font-weight:700;color:${AZUL}">${esc(it[1])}</div><div style="font-size:11.5px;color:${SUAVE}">${esc(it[0])}</div></td>`).join("") + "</tr></table>";
}
function atencao(itens: [string, string[]][]) {
  const com = itens.filter((x) => x[1].length);
  if (!com.length) return `<div style="padding:12px 14px;border-radius:10px;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;font-family:${FONTE};font-size:13px">✔ Nada a observar: sem faltas, atrasos, saídas antecipadas ou marcações incompletas.</div>`;
  return `<div style="padding:12px 14px;border-radius:10px;background:#FFFBEB;border:1px solid #FDE68A;font-family:${FONTE};font-size:13px;color:${TINTA}">` +
    com.map((x) => `<div style="margin:3px 0"><b>${esc(x[0])}:</b> ${x[1].map(esc).join(", ")}</div>`).join("") + "</div>";
}
function semLoginHtml(b: Base) {
  if (!b.semLogin.length) return "";
  return secao("Ainda batem o ponto na planilha", "Ainda não têm login no SAGA, por isso não aparecem neste relatório. Quando todos estiverem aqui, o e-mail da planilha pode ser desligado.") +
    `<div style="font-family:${FONTE};font-size:13px;color:${TINTA}">${b.semLogin.map(esc).join(" · ")}</div>`;
}
function moldeEmail(b: Base, tipo: string, titulo: string, subtitulo: string, corpo: string) {
  const link = `${esc(b.url)}/ponto_eletronico_padrao_metalico.html`;
  return `<div style="background:${FUNDO};padding:20px 10px;font-family:${FONTE}"><table role="presentation" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:1040px;margin:0 auto;border-collapse:collapse">` +
    `<tr><td style="background:${AZUL};border-radius:14px 14px 0 0;padding:18px 22px;border-bottom:4px solid ${OURO}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="font-family:${FONTE}">` +
    `<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${OURO};font-weight:700">SAGA ADV · Ponto Eletrônico · ${esc(tipo)}</div>` +
    `<div style="font-size:22px;color:#FFFFFF;font-weight:700;margin-top:4px">${esc(titulo)}</div>` +
    `<div style="font-size:13px;color:#C7D2E3;margin-top:2px">${esc(subtitulo)}</div></td>` +
    `<td style="text-align:right;vertical-align:top"><span style="display:inline-block;padding:5px 11px;border-radius:999px;background:${AZUL2};color:#FFFFFF;font-size:11px;font-weight:700;white-space:nowrap">Relatório do SAGA</span></td></tr></table></td></tr>` +
    `<tr><td style="background:#FFFFFF;padding:16px 22px 22px;border:1px solid ${LINHA};border-top:0;border-radius:0 0 14px 14px">${corpo}` +
    `<div style="margin-top:24px"><a href="${link}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:${AZUL2};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:13px">Abrir o Ponto no SAGA</a></div>` +
    `<div style="margin-top:14px;font-size:11.5px;color:${SUAVE};line-height:1.5">Este e-mail vem do <b>SAGA</b> (${esc(b.nome)}), o sistema novo, e não da planilha do Google. ` +
    `Os números são os do Ponto do SAGA, com as mesmas regras da planilha. Os relatórios também ficam na aba Relatórios do Ponto.</div></td></tr></table></div>`;
}
const emailValido = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
function destinatarios(b: Base, comExtras: boolean) {
  const lista: string[] = (b.cfg.emails_gestor || []).map((x: string) => x.trim().toLowerCase()).filter(emailValido);
  if (comExtras) (b.cfg.emails_extras || []).forEach((x: string) => { x = x.trim().toLowerCase(); if (emailValido(x) && !lista.includes(x)) lista.push(x); });
  if (!lista.length) { const u = Deno.env.get("GMAIL_USUARIO"); if (u) lista.push(u); }
  return lista;
}
// so_html (com a chave do servidor): devolve o e-mail montado sem enviar, para conferir o visual.
// A captura vai junto em cada chamada (nada compartilhado entre pedidos ao mesmo tempo).
type Captura = { assunto: string; html: string } | null;
async function enviar(b: Base, para: string[], assunto: string, html: string, cap?: { e: Captura }) {
  if (cap) { cap.e = { assunto, html }; return; }
  const usuario = Deno.env.get("GMAIL_USUARIO"), senha = (Deno.env.get("GMAIL_SENHA_APP") || "").replace(/\s+/g, "");
  if (!usuario || !senha) throw new Error("Segredos GMAIL_USUARIO e GMAIL_SENHA_APP não configurados no Supabase.");
  if (!para.length) throw new Error("Nenhum e-mail de destino nas Configurações do ponto.");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: usuario, pass: senha } });
  await t.sendMail({ from: `"SAGA · Ponto" <${usuario}>`, to: para.join(","), subject: assunto, html });
}
async function jaEnviado(tipo: string, chave: string) {
  const r = await admin.from("ponto_envios").select("tipo").eq("tipo", tipo).eq("chave", chave).maybeSingle();
  return !!r.data;
}
async function marcarEnviado(tipo: string, chave: string, detalhe: string) {
  await admin.from("ponto_envios").upsert({ tipo, chave, detalhe, enviado_em: new Date().toISOString() }, { onConflict: "tipo,chave" });
}
const prefixo = (previa?: boolean) => previa ? "[SAGA · PRÉVIA] Ponto" : "[SAGA] Ponto";

/* ---------- justificativas, abonos e pendencias ---------- */
const SIT_ABONOS = ["Atestado médico", "Falta abonada", "Falta justificada", "Folga compensatória", "Folga concedida", "Férias", "Licença", "Home office"];
// deno-lint-ignore no-explicit-any
async function justificativas(ini: string, fim: string): Promise<Record<string, any[]>> {
  const r = await admin.from("ponto_justificativas").select("colaborador_id,data,tipo,status,horas_abonar_min").gte("data", ini).lte("data", fim);
  // deno-lint-ignore no-explicit-any
  const m: Record<string, any[]> = {};
  // deno-lint-ignore no-explicit-any
  (r.data || []).forEach((j: any) => { (m[j.colaborador_id + "|" + j.data] ||= []).push(j); });
  return m;
}
// deno-lint-ignore no-explicit-any
const justDe = (J: Record<string, any[]>, id: string, k: string) => J[id + "|" + k] || [];
// deno-lint-ignore no-explicit-any
function textoJust(lista: any[]) {
  return lista.map((j) => `${j.tipo} (${j.status === "aprovada" ? "aprovada" : j.status === "recusada" ? "recusada" : "aguardando aprovação"})`).join("; ");
}
// Para cada pessoa: dias do periodo com falta ou marcacao incompleta SEM abono/justificativa aprovada (pendentes)
// e dias abonados/justificados (resolvidos). dias = lista do calcularMes.
// deno-lint-ignore no-explicit-any
function pendencias(pessoas: { nome: string; id: string; dias: any[] }[], ini: string, fim: string, J: Record<string, any[]>) {
  const pend: string[] = [], resolv: string[] = [], aguard: string[] = [];
  for (const p of pessoas) {
    const pp: string[] = [], rr: string[] = [], aa: string[] = [];
    for (const x of p.dias) {
      if (x.key < ini || x.key > fim) continue;
      const js = justDe(J, p.id, x.key), aprov = js.some((j) => j.status === "aprovada"), espera = js.some((j) => j.status === "pendente");
      if (SIT_ABONOS.includes(x.sit) || x.d.status === "Abonado" || x.abonoManual > 0) rr.push(`${brCurto(x.key)} ${x.d.status === "Abonado" || SIT_ABONOS.includes(x.sit) ? x.sit.toLowerCase() : "abono de " + PC.hhmm(x.abonoManual)}`);
      else if ((x.d.falta || x.d.incompleta) && !aprov) {
        const o = `${brCurto(x.key)} ${x.d.falta ? "falta" : "marcação incompleta"}`;
        if (espera) aa.push(o); else pp.push(o);
      }
    }
    if (pp.length) pend.push(`${p.nome}: ${pp.join(", ")}`);
    if (aa.length) aguard.push(`${p.nome}: ${aa.join(", ")}`);
    if (rr.length) resolv.push(`${p.nome}: ${rr.join(", ")}`);
  }
  return { pend, aguard, resolv };
}
function pendenciasHtml(titulo: string, r: { pend: string[]; aguard: string[]; resolv: string[] }) {
  const item = (rot: string, cor: string, l: string[]) => l.length ? `<div style="margin:8px 0 10px"><span style="display:inline-block;padding:1px 8px;border-radius:999px;background:${cor};font-size:11px;font-weight:700">${rot}</span>` +
    l.map((t) => { const i = t.indexOf(": "); return `<div style="margin:4px 0 0 4px;padding-left:10px;border-left:3px solid ${cor}"><b>${esc(t.slice(0, i))}</b>: ${esc(t.slice(i + 2))}</div>`; }).join("") + "</div>" : "";
  const corpo = item("SEM ABONO NEM JUSTIFICATIVA", "#FDE2E2", r.pend) + item("JUSTIFICATIVA AGUARDANDO APROVAÇÃO", "#FEF9C3", r.aguard) + item("ABONADOS / JUSTIFICADOS", "#DCFCE7", r.resolv);
  return secao(titulo, "Faltas e marcações incompletas que ainda contam contra a pessoa, as que aguardam a sua aprovação e o que já foi abonado (atestado, abono, folga).") +
    `<div style="font-family:${FONTE};font-size:13px;color:${TINTA}">${corpo || `<span style="color:#065F46">✔ Nenhuma falta ou marcação incompleta no período.</span>`}</div>`;
}
function legendaCores() {
  const it = (t: string) => { const c = COR_STATUS[t]; return `<span style="display:inline-block;padding:1px 8px;margin:2px 4px 2px 0;border-radius:999px;background:${c[0]};color:${c[1]};font-size:11px;font-weight:600">${esc(t)}</span>`; };
  return `<div style="font-family:${FONTE};font-size:11.5px;color:${SUAVE};margin-top:6px">Cores: ${["Carga cumprida", "Horas positivas", "Em andamento", "Marcação incompleta", "Horas negativas", "Falta", "Abonado", "Folga concedida"].map(it).join("")}</div>`;
}
function linhaCor(l: string[], status: string) {
  const c = COR_STATUS[status];
  return c ? l.map((x, i) => i === 0 ? `<div style="border-left:4px solid ${c[1]};padding-left:8px;margin-left:-10px">${x}</div>` : x) : l;
}

/* ---------- relatorios ---------- */
async function relatorioDiario(b: Base, diaKey: string, hoje: string, previa?: boolean, cap?: { e: Captura }) {
  const dados = await coletarMes(b, diaKey.slice(0, 7), hoje);
  const J = await justificativas(diaKey.slice(0, 8) + "01", diaKey);
  const linhas: { ordem: number; l: string[] }[] = [], diretoria: string[][] = [];
  let presentes = 0, previstos = 0, horas = 0;
  const faltas: string[] = [], atrasos: string[] = [], antec: string[] = [], incompletas: string[] = [], abertos: string[] = [], pausas: string[] = [];
  for (const x of dados) {
    // deno-lint-ignore no-explicit-any
    const dia = x.calc.dias.find((y: any) => y.key === diaKey);
    if (!dia) continue;
    const d = dia.d, mk = dia.mk, nome = String(x.c.nome);
    if (x.livre) {
      if (d.trab !== null && d.trab !== undefined) {
        const per = [];
        for (let i = 0; i < 8; i += 2) if (mk[i] !== null) per.push(hm(mk[i]) + " às " + (mk[i + 1] !== null ? hm(mk[i + 1]) : "em aberto"));
        diretoria.push([`<b>${esc(nome)}</b>`, per.join("<br>"), hmEmail(d.trab), selo(d.status)]);
        if (d.status === "Em andamento" || d.status === "Marcação incompleta") abertos.push(nome);
      }
      continue;
    }
    if (d.carga) previstos++;
    if (mk[0] !== null) presentes++;
    if (d.trab) horas += d.trab;
    if (d.falta) faltas.push(nome);
    if (d.fAtraso) atrasos.push(`${nome} (${d.atraso} min)`);
    if (d.fAntec) antec.push(`${nome} (${d.antec} min)`);
    if (d.fPausa) pausas.push(nome);
    if (d.incompleta) incompletas.push(nome);
    if (d.status === "Em andamento") abertos.push(nome);
    if (!d.carga && mk[0] === null) continue;
    const p = [];
    for (let i = 1; i <= 5; i += 2) if (mk[i] !== null) p.push(hm(mk[i]) + "–" + (mk[i + 1] !== null ? hm(mk[i + 1]) : "…"));
    const grave = d.falta || d.incompleta || d.fAtraso || d.fAntec || d.fPausa ? 0 : 1;
    const tol = Number(b.cfg.tolerancia_min || 0), corDif = (v: number) => v > tol ? "#B91C1C" : "#A16207";
    const entrada = mk[0] !== null ? `<b>${hm(mk[0])}</b>` + (d.atraso ? `<div style="font-size:11.5px;color:${corDif(d.atraso)}">atraso ${d.atraso} min${d.atraso <= tol ? " (tolerância)" : ""}</div>` : "") : `<span style="color:${SUAVE}">-</span>`;
    const saida = mk[7] !== null ? `<b>${hm(mk[7])}</b>` + (d.antec ? `<div style="font-size:11.5px;color:${corDif(d.antec)}">saiu ${d.antec} min antes${d.antec <= tol ? " (tolerância)" : ""}</div>` : "") : `<span style="color:${SUAVE}">-</span>`;
    const pausasTxt = p.length ? p.join("<br>") + `<div style="font-size:11.5px;color:${SUAVE}">total ${hmEmail(d.pausas) || "00:00"}${d.pausaRem ? " · remunerada " + PC.hhmm(d.pausaRem) : ""}</div>` : "-";
    const manual = SIT_ABONOS.includes(dia.sit) ? `<div style="margin-top:3px">${selo(dia.sit === "Atestado médico" || dia.sit === "Falta abonada" ? "Abonado" : "Folga concedida").replace(/>[^<]+</, ">" + esc(dia.sit) + "<")}</div>` : "";
    const js = justDe(J, x.c.id, diaKey);
    const obs = [(d.ocorr || []).join("; "), js.length ? "Justificativa: " + textoJust(js) : "", dia.observacao || ""].filter(Boolean).join("<br>");
    linhas.push({ ordem: grave, l: linhaCor([`<b>${esc(nome)}</b><div style="font-size:11.5px;color:${SUAVE}">${esc(x.c.regime || "")}</div>`,
      `${PC.hhmm(dia.cj.entrada)} às ${PC.hhmm(dia.cj.saida)}<div style="font-size:11.5px;color:${SUAVE}">carga ${hmEmail(d.carga ?? dia.cj.carga) || "-"}</div>`,
      entrada, saida, pausasTxt, hmEmail(d.trab) || "-", saldoEmail(d.saldo), selo(d.status || dia.sit) + manual, `<span style="font-size:12px;color:${SUAVE}">${obs}</span>`], d.status) });
  }
  if (!linhas.length && !diretoria.length) return { enviado: false, msg: `Nada a relatar em ${br(diaKey)} (dia sem expediente e sem registros).` };
  const pj = await admin.from("ponto_justificativas").select("id", { count: "exact", head: true }).eq("status", "pendente");
  const pend = pj.count || 0;
  linhas.sort((a, c) => a.ordem - c.ordem);
  let corpo = numeros([
    ["presentes", `${presentes} de ${previstos}`, "#15803D"], ["horas trabalhadas (equipe)", PC.hhmm(horas) || "00:00", AZUL2],
    ["faltas", faltas.length, faltas.length ? "#B91C1C" : "#94A3B8"], ["ocorrências", atrasos.length + antec.length + pausas.length + incompletas.length, "#C2410C"],
    ["justificativas pendentes", pend, pend ? "#A16207" : "#94A3B8"],
  ]);
  corpo += secao("Pontos de atenção") + atencao([["Faltas", faltas], ["Atrasos acima da tolerância", atrasos], ["Saídas antecipadas", antec], ["Pausas excedidas", pausas],
    ["Marcação incompleta", incompletas], ["Ponto ainda aberto", abertos], ["Justificativas para aprovar", pend ? [`${pend} pendente(s) na aba Justificativas`] : []]]);
  if (linhas.length) corpo += secao("Equipe", "Quem tem ocorrência aparece primeiro. Atrasos e saídas antecipadas contam como ocorrência só acima da tolerância de " + esc(b.cfg.tolerancia_min) + " min.") +
    tabela(["Colaborador", "Previsto", "Entrada", "Saída", "Pausas", "Trabalhadas", "Saldo do dia", "Situação", "Observações e justificativas"], linhas.map((x) => x.l), ["left", "center", "center", "center", "center", "center", "center", "center", "left"]) + legendaCores();
  if (diretoria.length) corpo += secao("Diretoria (horário livre)") + tabela(["Nome", "Períodos", "Horas no dia", "Situação"], diretoria);
  // deno-lint-ignore no-explicit-any
  const comHorario = dados.filter((x: any) => !x.livre).map((x: any) => ({ nome: String(x.c.nome), id: x.c.id, dias: x.calc.dias }));
  if (comHorario.length) corpo += pendenciasHtml(`Pendências do mês (01/${diaKey.slice(5, 7)} a ${brCurto(diaKey)})`, pendencias(comHorario, diaKey.slice(0, 8) + "01", diaKey, J));
  corpo += semLoginHtml(b);
  const para = destinatarios(b, false);
  const nomeDia = PC.NOMES_DIA[PC.diaSemana(diaKey)];
  await enviar(b, para, `${prefixo(previa)} · Diário · ${DIAS_CURTOS[PC.diaSemana(diaKey)]} ${br(diaKey)}`,
    moldeEmail(b, "Relatório diário", `Ponto do dia ${br(diaKey)}`, `${nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1)} · ${linhas.length} colaborador(es) com expediente`, corpo), cap);
  return { enviado: true, msg: `Relatório diário de ${br(diaKey)} enviado para ${para.join(", ")}.` };
}

async function relatorioSemanal(b: Base, fimKey: string, hoje: string, previa?: boolean, cap?: { e: Captura }) {
  const w = PC.diaSemana(fimKey), iniKey = somaDias(fimKey, -((w + 6) % 7));
  const meses = [iniKey.slice(0, 7)];
  if (fimKey.slice(0, 7) !== meses[0]) meses.push(fimKey.slice(0, 7));
  // deno-lint-ignore no-explicit-any
  const porId: Record<string, any> = {};
  for (const mes of meses) {
    for (const x of await coletarMes(b, mes, hoje)) {
      const o = (porId[x.c.id] ||= { c: x.c, livre: x.livre, dias: [], mesAtual: null });
      o.dias = o.dias.concat(x.calc.dias);
      if (mes === fimKey.slice(0, 7)) o.mesAtual = x.calc.dias;
    }
  }
  const diasSemana: string[] = [];
  for (let k = iniKey; k <= fimKey; k = somaDias(k, 1)) diasSemana.push(k);
  const linhas: { ordem: number; l: string[] }[] = [], grade: string[][] = [], diretoria: string[][] = [];
  let horas = 0, saldoEq = 0, faltasEq = 0, ocorrEq = 0;
  const alerta: string[] = [], negativo: string[] = [];
  for (const id of Object.keys(porId)) {
    const x = porId[id], s = PC.somarPeriodo(x.dias, iniKey, fimKey), nome = String(x.c.nome);
    if (x.livre) {
      if (s.trab) {
        diretoria.push([`<b>${esc(nome)}</b>`, String(s.diasTrab), hmEmail(s.trab)]);
        grade.push([`<b>${esc(nome)}</b><div style="font-size:11px;color:${SUAVE}">Diretoria</div>`].concat(diasSemana.map((k) => {
          // deno-lint-ignore no-explicit-any
          const dia = x.dias.find((y: any) => y.key === k);
          return dia && dia.d.trab ? `<span style="display:inline-block;min-width:46px;padding:3px 6px;border-radius:7px;background:#EEF2FF;color:#3730A3;font-size:11.5px;font-weight:600">${PC.hhmm(dia.d.trab)}</span>` : `<span style="color:#CBD5E1">·</span>`;
        })));
      }
      continue;
    }
    if (!s.carga && !s.trab) continue;
    const m = PC.somarPeriodo(x.mesAtual || [], fimKey.slice(0, 8) + "01", fimKey), ocorr = s.atrasos + s.antec + s.pausas;
    horas += s.trab; saldoEq += s.saldo; faltasEq += s.faltas; ocorrEq += ocorr + s.incompletas;
    if (s.faltas || ocorr >= b.cfg.limite_alerta) alerta.push(nome);
    if (s.saldo < 0) negativo.push(`${nome} (${PC.hhmm(s.saldo)})`);
    linhas.push({ ordem: s.faltas || ocorr >= b.cfg.limite_alerta ? 0 : s.saldo < 0 ? 1 : 2, l: [`<b>${esc(nome)}</b>`, String(s.diasTrab), hmEmail(s.carga), hmEmail(s.trab), hmEmail(s.abono) || "-", saldoEmail(s.saldo),
      String(s.atrasos), String(s.antec), String(s.pausas), String(s.faltas), String(s.incompletas), saldoEmail(m.saldo)] });
    // quadro da semana dia a dia
    grade.push([`<b>${esc(nome)}</b>`].concat(diasSemana.map((k) => {
      // deno-lint-ignore no-explicit-any
      const dia = x.dias.find((y: any) => y.key === k);
      if (!dia || (!dia.d.carga && !dia.d.trab)) return `<span style="color:#CBD5E1">·</span>`;
      const st = dia.d.status || "", c = COR_STATUS[st] || ["#F1F5F9", "#334155"];
      const txt = dia.d.trab ? PC.hhmm(dia.d.trab) : st === "Falta" ? "falta" : st === "Aguardando entrada" ? "—" : st.toLowerCase();
      return `<span title="${esc(st)}" style="display:inline-block;min-width:46px;padding:3px 6px;border-radius:7px;background:${c[0]};color:${c[1]};font-size:11.5px;font-weight:600">${esc(txt)}</span>`;
    })));
  }
  if (!linhas.length && !diretoria.length) return { enviado: false, msg: "Nada a relatar na semana." };
  linhas.sort((a, c) => a.ordem - c.ordem);
  let corpo = numeros([["horas trabalhadas (equipe)", PC.hhmm(horas) || "00:00", AZUL2], ["saldo da equipe", (saldoEq > 0 ? "+" : "") + (PC.hhmm(saldoEq) || "00:00"), saldoEq < 0 ? "#B91C1C" : "#047857"],
    ["faltas", faltasEq, faltasEq ? "#B91C1C" : "#94A3B8"], ["ocorrências", ocorrEq, ocorrEq ? "#C2410C" : "#94A3B8"]]);
  corpo += secao("Pontos de atenção") + atencao([[`No limite de alerta (${b.cfg.limite_alerta} ocorrências) ou com falta`, alerta], ["Saldo negativo na semana", negativo]]);
  if (grade.length) corpo += secao("A semana dia a dia", "Horas trabalhadas em cada dia; a cor segue a situação do dia.") +
    tabela(["Colaborador"].concat(diasSemana.map((k) => `${DIAS_CURTOS[PC.diaSemana(k)]} ${brCurto(k)}`)), grade);
  if (linhas.length) corpo += secao("Totais da semana", `Atrasos, saídas e pausas contam só acima da tolerância de ${esc(b.cfg.tolerancia_min)} min.`) +
    tabela(["Colaborador", "Dias trabalhados", "Carga", "Trabalhadas", "Abonadas", "Saldo da semana", "Atrasos", "Saídas antes", "Pausas excedidas", "Faltas", "Incompletas", "Saldo do mês"], linhas.map((x) => x.l));
  if (diretoria.length) corpo += secao("Diretoria (horário livre)") + tabela(["Nome", "Dias com registro", "Horas na semana"], diretoria);
  const J = await justificativas(iniKey, fimKey);
  // deno-lint-ignore no-explicit-any
  const comHorario = Object.keys(porId).map((id) => porId[id]).filter((x: any) => !x.livre).map((x: any) => ({ nome: String(x.c.nome), id: x.c.id, dias: x.dias }));
  if (comHorario.length) corpo += pendenciasHtml("Pendências da semana", pendencias(comHorario, iniKey, fimKey, J));
  corpo += semLoginHtml(b);
  await enviar(b, destinatarios(b, false), `${prefixo(previa)} · Semanal · ${brCurto(iniKey)} a ${br(fimKey)}`,
    moldeEmail(b, "Relatório semanal", "Ponto da semana", `${br(iniKey)} a ${br(fimKey)}`, corpo), cap);
  return { enviado: true, msg: `Relatório semanal ${br(iniKey)} a ${br(fimKey)} enviado.` };
}

async function fechamentoMensal(b: Base, k: string, hoje: string) {
  const { dados, out, fechKey } = await fecharMes(b, k, hoje);
  const p = partesMes(k), equipe: string[][] = [], diretoria: string[][] = [];
  let desc = 0, comp = 0;
  const alerta: string[] = [], descontar: string[] = [];
  for (const { x, f } of out) {
    const s = f.soma, ocorr = s.atrasos + s.antec + s.pausas;
    const perfil = ocorr >= b.cfg.limite_alerta || s.faltas ? "ALERTA" : "Regular";
    if (perfil === "ALERTA") alerta.push(String(x.c.nome));
    if (f.descontar) { desc += f.descontar; descontar.push(`${x.c.nome} (${PC.hhmm(f.descontar)})`); }
    comp += f.compensar || 0;
    equipe.push([`<b>${esc(x.c.nome)}</b><div style="font-size:11.5px;color:${SUAVE}">${esc(x.c.regime)}</div>`, hmEmail(s.carga), hmEmail(s.trab), hmEmail(s.abono), saldoEmail(s.saldo), saldoEmail(f.anterior), saldoEmail(f.total),
      f.descontar ? `<b style="color:#B91C1C">${PC.hhmm(f.descontar)}</b>` : "-", f.compensar ? `<b style="color:#047857">${PC.hhmm(f.compensar)}</b>` : "-",
      f.excedente ? PC.hhmm(f.excedente) : "-", String(s.faltas), String(ocorr), perfil === "ALERTA" ? selo("Falta").replace(">Falta<", ">ALERTA<") : selo("Registrado").replace(">Registrado<", ">Regular<")]);
  }
  for (const x of dados) {
    if (!x.livre) continue;
    const s = PC.somarPeriodo(x.calc.dias, `${k}-01`, fechKey);
    if (s.trab) diretoria.push([`<b>${esc(x.c.nome)}</b>`, String(s.diasTrab), hmEmail(s.trab)]);
  }
  if (b.cfg.email_fechamento === false) return { enviado: false, msg: `Fechamento de ${NOMES_MES[p.m - 1]} gravado (e-mail desligado).` };
  const fim = fimKeyDe(k);
  let corpo = numeros([["colaboradores no fechamento", out.length, AZUL2], ["horas a descontar na folha", PC.hhmm(desc) || "00:00", desc ? "#B91C1C" : "#94A3B8"],
    ["horas a compensar", PC.hhmm(comp) || "00:00", comp ? "#047857" : "#94A3B8"], ["em alerta", alerta.length, alerta.length ? "#C2410C" : "#94A3B8"]]);
  corpo += `<p style="font-family:${FONTE};font-size:13px;color:${TINTA};margin:16px 0 0">Fechamento do período de <b>${br(`${k}-01`)}</b> a <b>${br(fechKey)}</b> para a folha de pagamento. ` +
    `O que acontecer de ${br(fechKey < fim ? somaDias(fechKey, 1) : fim)} até o fim do mês entra no saldo do mês seguinte.</p>`;
  corpo += secao("Pontos de atenção") + atencao([["Descontar na folha", descontar], ["Em alerta (faltas ou ocorrências)", alerta]]);
  if (equipe.length) corpo += secao("Fechamento por colaborador") + tabela(["Colaborador", "Carga", "Trabalhadas", "Abonadas", "Saldo do período", "Saldo anterior", "Saldo total", "Descontar na folha", "Compensar até o fim do mês", "Excedente desconsiderado", "Faltas", "Ocorrências", "Perfil"], equipe);
  if (diretoria.length) corpo += secao("Diretoria (horário livre)") + tabela(["Nome", "Dias com registro", "Horas no período"], diretoria);
  const J = await justificativas(`${k}-01`, fechKey);
  // deno-lint-ignore no-explicit-any
  corpo += pendenciasHtml("Dias do período sem abono", pendencias(out.map(({ x }: any) => ({ nome: String(x.c.nome), id: x.c.id, dias: x.calc.dias })), `${k}-01`, fechKey, J));
  corpo += `<p style="font-family:${FONTE};font-size:12px;color:${SUAVE};margin-top:14px">Regras: horas negativas são descontadas na folha; horas positivas valem até 1 dia de carga e devem ser compensadas até o fim do mês ` +
    "(saída mais cedo ou folga, de preferência na última sexta-feira); o que passar de 1 dia é desconsiderado. Os valores ficam gravados na aba Banco de horas do Ponto.</p>";
  corpo += semLoginHtml(b);
  await enviar(b, destinatarios(b, true), `[SAGA] Ponto · Fechamento para a folha · ${NOMES_MES[p.m - 1]}/${p.a}`,
    moldeEmail(b, "Fechamento mensal", `Fechamento de ${NOMES_MES[p.m - 1]} de ${p.a}`, `${br(`${k}-01`)} a ${br(fechKey)} · para a folha de pagamento`, corpo));
  return { enviado: true, msg: `Fechamento de ${NOMES_MES[p.m - 1]} gravado e enviado.` };
}

function diaUtil(b: Base, key: string) {
  const w = PC.diaSemana(key);
  if (w === 0 || w === 6) return false;
  const f = b.feriados[key];
  return !(f && f.liberado);
}

// Executada a cada hora: banco de horas pendente e relatorios no horario configurado, uma vez cada
async function rotina() {
  const b = await carregarBase();
  const { hoje, hora } = agoraLocal();
  const log: string[] = [];
  const atual = hoje.slice(0, 7), p = partesMes(atual);
  // transporte do mes anterior (dia 1o em diante)
  const n = await transportarMes(b, mesAnterior(atual), hoje);
  if (n) log.push(`transporte de ${mesAnterior(atual)}: ${n}`);
  const H = Number(b.cfg.hora_relatorio ?? 19), dia = Number(hoje.slice(8)), fechDia = PC.diaFechamento(p.a, p.m, b.cfg.dia_fechamento);
  const tarefas: [string, string, () => Promise<{ enviado: boolean; msg: string }>][] = [];
  // diario e semanal so se estiverem ligados no Cadastro (os relatorios ficam na aba Relatorios do Ponto)
  if (b.cfg.email_diario === true && hora === H && diaUtil(b, hoje)) tarefas.push(["D", hoje, () => relatorioDiario(b, hoje, hoje)]);
  if (b.cfg.email_semanal === true && hora === H && PC.diaSemana(hoje) === Number(b.cfg.dia_semanal ?? 5)) tarefas.push(["S", hoje, () => relatorioSemanal(b, hoje, hoje)]);
  // Fechamento: no dia de fechamento a partir do horario; se falhar, tenta de novo nas horas seguintes do mes
  if ((dia === fechDia && hora >= H) || dia > fechDia) tarefas.push(["M", atual, () => fechamentoMensal(b, atual, hoje)]);
  for (const [tipo, chave, f] of tarefas) {
    if (await jaEnviado(tipo, chave)) continue;
    try { const r = await f(); await marcarEnviado(tipo, chave, r.msg); log.push(r.msg); }
    catch (e) { log.push(`erro ${tipo}: ${(e as Error).message}`); await admin.from("ponto_auditoria").insert({ acao: "Erro no relatório", detalhe: `${tipo} ${chave}: ${(e as Error).message}` }); }
  }
  return { hoje, hora, log };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao || "");
    // Chave do agendador: guardada no cofre do banco (vault); so o servidor consegue ler
    const ch = await admin.rpc("saga_chave_rotina");
    const chave = ch.data ? String(ch.data) : "";
    // Agendador do banco (ou teste/previa interna com a chave)
    if (chave && req.headers.get("x-saga-chave") === chave) {
      if (acao === "rotina") return json({ ok: true, ...(await rotina()) });
      if (!["teste", "diario", "semanal"].includes(acao)) return json({ ok: false, mensagem: "Ação inválida." }, 400);
    } else {
      // Chamada pela tela: so o gestor do ponto
      const auth = req.headers.get("Authorization") || "";
      const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const g = await usuario.rpc("ponto_gerencia");
      if (g.error || g.data !== true) return json({ ok: false, mensagem: "Só o gestor do ponto pode enviar relatórios." }, 403);
    }
    const b = await carregarBase();
    const { hoje } = agoraLocal();
    if (corpo.so_html === true && !!chave && req.headers.get("x-saga-chave") === chave && (acao === "diario" || acao === "semanal")) {
      const cap: { e: Captura } = { e: null };
      const r = acao === "diario" ? await relatorioDiario(b, corpo.data || hoje, hoje, true, cap) : await relatorioSemanal(b, corpo.data || hoje, hoje, true, cap);
      return json({ ok: true, ...r, email: cap.e });
    }
    if (acao === "teste") {
      const para = destinatarios(b, false);
      await enviar(b, para, "[SAGA] Ponto · E-mail de teste", moldeEmail(b, "Teste", "E-mail de teste do Ponto", br(hoje),
        `<p style="font-family:${FONTE};font-size:14px;color:${TINTA}">Se você recebeu este e-mail, o envio automático do Ponto do SAGA está funcionando.</p>` +
        `<p style="font-family:${FONTE};font-size:13px;color:${SUAVE}">Relatório diário às ${esc(b.cfg.hora_relatorio ?? 19)}h nos dias úteis, semanal e fechamento no dia ${esc(b.cfg.dia_fechamento ?? 25)}.</p>`));
      return json({ ok: true, mensagem: `E-mail de teste enviado para ${para.join(", ")}.` });
    }
    if (acao === "diario") return json({ ok: true, ...(await relatorioDiario(b, corpo.data || hoje, hoje, corpo.previa === true)) });
    if (acao === "semanal") return json({ ok: true, ...(await relatorioSemanal(b, corpo.data || hoje, hoje, corpo.previa === true)) });
    return json({ ok: false, mensagem: "Ação inválida." }, 400);
  } catch (e) {
    return json({ ok: false, mensagem: (e as Error).message }, 500);
  }
});
