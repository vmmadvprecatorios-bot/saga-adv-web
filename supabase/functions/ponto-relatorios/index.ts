// Ponto: relatorios por e-mail e banco de horas automatico (T03).
// Copia do Apps Script da planilha "Painel do Ponto": relatorioDiario_, relatorioSemanal_,
// fechamentoMensal_ e transportarSaldos_. O calculo vem de ponto_calculo.js (o mesmo da tela).
//
// Chamadas:
//  - rotina (a cada hora, pelo agendador do banco): cabecalho x-saga-chave = chave do cofre do banco (saga_chave_rotina)
//  - manual (gestor logado, pela tela): acao "teste" | "diario" | "semanal"
// Envio pelo Gmail do administrador geral: segredos GMAIL_USUARIO e GMAIL_SENHA_APP.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.16";
import "./ponto_calculo.js";

// deno-lint-ignore no-explicit-any
const PC: any = (globalThis as any).PontoCalculo;
const TZ = "America/Maceio";
const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const CORES_STATUS_EMAIL: Record<string, string> = {
  "Falta": "#EBC4C4", "Horas negativas": "#F4D6D6", "Marcação incompleta": "#FBE3D6", "Falta justificada": "#FBE3D6",
  "Carga cumprida": "#DCEFD9", "Horas positivas": "#C3E3BE", "Trabalho fora do expediente": "#C3E3BE", "Registrado": "#DCEFD9",
  "Abonado": "#D5EEF2", "Folga compensatória": "#D5EEF2", "Folga concedida": "#E7DEFB", "Em andamento": "#F7EDC4", "Aguardando entrada": "#F7EDC4",
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
const partesMes = (k: string) => { const p = k.split("-").map(Number); return { a: p[0], m: p[1] }; };
const mesAnterior = (k: string) => { const p = partesMes(k); return p.m === 1 ? `${p.a - 1}-12` : `${p.a}-${dois(p.m - 1)}`; };
const fimKeyDe = (k: string) => { const p = partesMes(k); return `${k}-${dois(PC.diasNoMes(p.a, p.m))}`; };
function somaDias(key: string, n: number) { const d = new Date(key + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

/* ---------- dados ---------- */
// deno-lint-ignore no-explicit-any
type Base = { cfg: any; regimes: Record<string, any>; feriados: Record<string, any>; colabs: any[]; jornadas: any[]; nome: string; url: string };
async function carregarBase(): Promise<Base> {
  const [cfg, reg, fer, col, jor, sis] = await Promise.all([
    admin.from("ponto_config").select("*").maybeSingle(),
    admin.from("ponto_regimes").select("*"),
    admin.from("ponto_feriados").select("*"),
    // So entra no calculo quem ja tem conta no SAGA (pre-cadastros aguardando o convite ficam de fora)
    admin.from("ponto_colaboradores").select("*, usuarios!inner(auth_user_id)").not("usuarios.auth_user_id", "is", null).order("codigo"),
    admin.from("ponto_jornadas").select("*"),
    admin.from("configuracoes_sistema").select("nome_escritorio,extra").maybeSingle(),
  ]);
  // deno-lint-ignore no-explicit-any
  const regimes: Record<string, any> = {}; (reg.data || []).forEach((r: any) => regimes[r.nome] = r);
  // deno-lint-ignore no-explicit-any
  const feriados: Record<string, any> = {}; (fer.data || []).forEach((f: any) => feriados[f.data] = { desc: f.descricao, facultativo: /facultativo/i.test(f.abrangencia || ""), liberado: f.liberado });
  return {
    cfg: cfg.data || {}, regimes, feriados, colabs: col.data || [], jornadas: jor.data || [],
    nome: sis.data?.nome_escritorio || "SAGA", url: sis.data?.extra?.url_sistema || "",
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

/* ---------- e-mail ---------- */
const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hmEmail = (m: number | null | undefined) => (m === null || m === undefined ? "" : PC.hhmm(m));
const hm = (m: number | null) => (m === null || m === undefined ? "" : PC.hhmmRelogio(m));
function saldoEmail(m: number | null | undefined) {
  if (m === null || m === undefined) return "";
  const cor = m < 0 ? "#B91C1C" : m > 0 ? "#15803D" : "#1F2937";
  return `<span style="color:${cor};font-weight:bold">${m > 0 ? "+" : ""}${PC.hhmm(m)}</span>`;
}
function tabelaEmail(cab: string[], linhas: string[][], cores?: (string | null)[]) {
  const th = 'style="background:#1F2A44;color:#fff;padding:6px 8px;border:1px solid #1F2A44;font-size:12px;text-align:center"';
  let h = '<table style="border-collapse:collapse;width:100%;font-family:Calibri,Arial;font-size:13px;margin:6px 0 16px">';
  h += "<tr>" + cab.map((x) => `<th ${th}>${esc(x)}</th>`).join("") + "</tr>";
  linhas.forEach((l, i) => {
    const bg = (cores && cores[i]) || (i % 2 ? "#F3F4F6" : "#FFFFFF");
    h += "<tr>" + l.map((x, j) => `<td style="padding:5px 8px;border:1px solid #D1D5DB;background:${bg};${j === 0 ? "text-align:left" : "text-align:center"}">${x}</td>`).join("") + "</tr>";
  });
  return h + "</table>";
}
function cartoesEmail(itens: [string, string | number, string | null][]) {
  return '<table style="border-collapse:separate;border-spacing:6px;margin:4px 0 12px"><tr>' + itens.map((it) =>
    `<td style="background:${it[2] || "#F3F4F6"};border-radius:6px;padding:8px 12px;text-align:center;font-family:Calibri,Arial">` +
    `<div style="font-size:20px;font-weight:bold;color:#1F2A44">${esc(it[1])}</div><div style="font-size:11px;color:#6B7280">${esc(it[0])}</div></td>`).join("") + "</tr></table>";
}
function moldeEmail(b: Base, titulo: string, subtitulo: string, corpo: string) {
  const link = b.url ? ` <a href="${esc(b.url)}/ponto_eletronico_padrao_metalico.html">Abrir o Ponto no SAGA</a>` : "";
  return '<div style="font-family:Calibri,Arial;color:#1F2937;max-width:1100px">' +
    `<div style="background:#1F2A44;color:#fff;padding:12px 16px;border-radius:6px 6px 0 0"><div style="font-size:18px;font-weight:bold">${esc(titulo)}</div>` +
    `<div style="font-size:12px;opacity:.85">${esc(subtitulo)}</div></div>` +
    `<div style="border:1px solid #E5E7EB;border-top:0;padding:12px 16px;border-radius:0 0 6px 6px">${corpo}` +
    `<p style="font-size:12px;color:#6B7280;margin-top:16px">Gerado automaticamente pelo Ponto do SAGA (${esc(b.nome)}).${link}</p></div></div>`;
}
const emailValido = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
function destinatarios(b: Base, comExtras: boolean) {
  const lista: string[] = (b.cfg.emails_gestor || []).map((x: string) => x.trim().toLowerCase()).filter(emailValido);
  if (comExtras) (b.cfg.emails_extras || []).forEach((x: string) => { x = x.trim().toLowerCase(); if (emailValido(x) && !lista.includes(x)) lista.push(x); });
  if (!lista.length) { const u = Deno.env.get("GMAIL_USUARIO"); if (u) lista.push(u); }
  return lista;
}
async function enviar(b: Base, para: string[], assunto: string, html: string) {
  const usuario = Deno.env.get("GMAIL_USUARIO"), senha = (Deno.env.get("GMAIL_SENHA_APP") || "").replace(/\s+/g, "");
  if (!usuario || !senha) throw new Error("Segredos GMAIL_USUARIO e GMAIL_SENHA_APP não configurados no Supabase.");
  if (!para.length) throw new Error("Nenhum e-mail de destino nas Configurações do ponto.");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: usuario, pass: senha } });
  await t.sendMail({ from: `"Ponto ${b.nome}" <${usuario}>`, to: para.join(","), subject: assunto, html });
}
async function jaEnviado(tipo: string, chave: string) {
  const r = await admin.from("ponto_envios").select("tipo").eq("tipo", tipo).eq("chave", chave).maybeSingle();
  return !!r.data;
}
async function marcarEnviado(tipo: string, chave: string, detalhe: string) {
  await admin.from("ponto_envios").upsert({ tipo, chave, detalhe, enviado_em: new Date().toISOString() }, { onConflict: "tipo,chave" });
}

/* ---------- relatorios ---------- */
async function relatorioDiario(b: Base, diaKey: string, hoje: string) {
  const dados = await coletarMes(b, diaKey.slice(0, 7), hoje);
  const equipe: string[][] = [], cores: (string | null)[] = [], diretoria: string[][] = [];
  let presentes = 0, previstos = 0, faltas = 0, atrasos = 0, antec = 0, incompletas = 0;
  for (const x of dados) {
    // deno-lint-ignore no-explicit-any
    const dia = x.calc.dias.find((y: any) => y.key === diaKey);
    if (!dia) continue;
    const d = dia.d, mk = dia.mk;
    if (x.livre) {
      if (d.trab !== null && d.trab !== undefined) {
        const per = [];
        for (let i = 0; i < 8; i += 2) if (mk[i] !== null) per.push(hm(mk[i]) + " às " + (mk[i + 1] !== null ? hm(mk[i + 1]) : "..."));
        diretoria.push([esc(x.c.nome), per.join("<br>"), hmEmail(d.trab), esc(d.status)]);
      }
      continue;
    }
    if (d.carga) previstos++;
    if (mk[0] !== null) presentes++;
    if (d.falta) faltas++;
    if (d.fAtraso) atrasos++;
    if (d.fAntec) antec++;
    if (d.incompleta) incompletas++;
    if (!d.carga && mk[0] === null) continue;
    const pausas = [];
    for (let i = 1; i <= 5; i += 2) if (mk[i] !== null) pausas.push(hm(mk[i]) + " a " + (mk[i + 1] !== null ? hm(mk[i + 1]) : "..."));
    equipe.push([esc(x.c.nome), PC.hhmm(dia.cj.entrada) + " às " + PC.hhmm(dia.cj.saida), mk[0] !== null ? hm(mk[0]) : "-", mk[7] !== null ? hm(mk[7]) : "-",
      pausas.join("<br>") || "-", hmEmail(d.trab), saldoEmail(d.saldo), "<b>" + esc(d.status || dia.sit) + "</b>", esc((d.ocorr || []).join("; "))]);
    cores.push(CORES_STATUS_EMAIL[d.status] || null);
  }
  if (!equipe.length && !diretoria.length) return { enviado: false, msg: `Nada a relatar em ${br(diaKey)} (dia sem expediente e sem registros).` };
  const pj = await admin.from("ponto_justificativas").select("id", { count: "exact", head: true }).eq("status", "pendente");
  const pend = pj.count || 0;
  let corpo = cartoesEmail([
    ["presentes", `${presentes} de ${previstos}`, "#DCEFD9"], ["faltas", faltas, faltas ? "#EBC4C4" : null],
    ["atrasos acima da tolerância", atrasos, atrasos ? "#F7EDC4" : null], ["saídas antecipadas", antec, antec ? "#F7EDC4" : null],
    ["marcações incompletas", incompletas, incompletas ? "#FBE3D6" : null], ["justificativas pendentes", pend, pend ? "#F7EDC4" : null],
  ]);
  if (equipe.length) corpo += '<h3 style="color:#1F2A44;margin:8px 0 2px">Equipe</h3>' + tabelaEmail(["Colaborador", "Horário previsto", "Entrada", "Saída", "Pausas", "Trabalhadas", "Saldo do dia", "Status", "Ocorrências"], equipe, cores);
  if (diretoria.length) corpo += '<h3 style="color:#1F2A44;margin:8px 0 2px">Diretoria (horário livre)</h3>' + tabelaEmail(["Nome", "Períodos", "Horas no dia", "Status"], diretoria);
  const para = destinatarios(b, false);
  await enviar(b, para, `Ponto ${b.nome} | Relatório diário ${br(diaKey)}`,
    moldeEmail(b, `Relatório diário do ponto | ${br(diaKey)}`, `${PC.NOMES_DIA[PC.diaSemana(diaKey)]} | ${equipe.length} colaborador(es) com expediente`, corpo));
  return { enviado: true, msg: `Relatório diário de ${br(diaKey)} enviado para ${para.join(", ")}.` };
}

async function relatorioSemanal(b: Base, fimKey: string, hoje: string) {
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
  const equipe: string[][] = [], cores: (string | null)[] = [], diretoria: string[][] = [];
  for (const id of Object.keys(porId)) {
    const x = porId[id], s = PC.somarPeriodo(x.dias, iniKey, fimKey);
    if (x.livre) { if (s.trab) diretoria.push([esc(x.c.nome), String(s.diasTrab), hmEmail(s.trab)]); continue; }
    if (!s.carga && !s.trab) continue;
    const m = PC.somarPeriodo(x.mesAtual || [], fimKey.slice(0, 8) + "01", fimKey), ocorr = s.atrasos + s.antec + s.pausas;
    equipe.push([esc(x.c.nome), hmEmail(s.carga), hmEmail(s.trab), saldoEmail(s.saldo), s.atrasos, s.antec, s.pausas, s.faltas, s.incompletas, saldoEmail(m.saldo)].map(String));
    cores.push(s.faltas || ocorr >= b.cfg.limite_alerta ? "#F4D6D6" : s.saldo < 0 ? "#FBE3D6" : null);
  }
  let corpo = "";
  if (equipe.length) corpo += '<h3 style="color:#1F2A44;margin:8px 0 2px">Equipe</h3>' + tabelaEmail(["Colaborador", "Carga da semana", "Trabalhadas", "Saldo da semana", "Atrasos", "Saídas antecipadas", "Pausas excedidas", "Faltas", "Incompletas", "Saldo do mês até hoje"], equipe, cores);
  if (diretoria.length) corpo += '<h3 style="color:#1F2A44;margin:8px 0 2px">Diretoria (horário livre)</h3>' + tabelaEmail(["Nome", "Dias com registro", "Horas na semana"], diretoria);
  if (!corpo) return { enviado: false, msg: "Nada a relatar na semana." };
  corpo += `<p style="font-size:12px;color:#6B7280">Linhas em vermelho: falta ou ocorrências no limite de alerta (${b.cfg.limite_alerta}). Atrasos, saídas e pausas contam só acima da tolerância de ${b.cfg.tolerancia_min} min.</p>`;
  await enviar(b, destinatarios(b, false), `Ponto ${b.nome} | Relatório semanal ${br(iniKey)} a ${br(fimKey)}`, moldeEmail(b, "Relatório semanal do ponto", `${br(iniKey)} a ${br(fimKey)}`, corpo));
  return { enviado: true, msg: `Relatório semanal ${br(iniKey)} a ${br(fimKey)} enviado.` };
}

async function fechamentoMensal(b: Base, k: string, hoje: string) {
  const { dados, out, fechKey } = await fecharMes(b, k, hoje);
  const p = partesMes(k), equipe: string[][] = [], cores: (string | null)[] = [], diretoria: string[][] = [];
  for (const { x, f } of out) {
    const s = f.soma, ocorr = s.atrasos + s.antec + s.pausas;
    const perfil = ocorr >= b.cfg.limite_alerta || s.faltas ? "ALERTA" : "Regular";
    equipe.push([esc(x.c.nome), esc(x.c.regime), hmEmail(s.carga), hmEmail(s.trab), hmEmail(s.abono), saldoEmail(s.saldo), saldoEmail(f.anterior), saldoEmail(f.total),
      f.descontar ? `<b style="color:#B91C1C">${PC.hhmm(f.descontar)}</b>` : "-", f.compensar ? `<b style="color:#15803D">${PC.hhmm(f.compensar)}</b>` : "-",
      f.excedente ? PC.hhmm(f.excedente) : "-", String(s.faltas), String(ocorr), `<b>${perfil}</b>`]);
    cores.push(f.descontar ? "#F4D6D6" : f.compensar ? "#DCEFD9" : null);
  }
  for (const x of dados) {
    if (!x.livre) continue;
    const s = PC.somarPeriodo(x.calc.dias, `${k}-01`, fechKey);
    if (s.trab) diretoria.push([esc(x.c.nome), String(s.diasTrab), hmEmail(s.trab)]);
  }
  if (b.cfg.email_fechamento === false) return { enviado: false, msg: `Fechamento de ${NOMES_MES[p.m - 1]} gravado (e-mail desligado).` };
  const fim = fimKeyDe(k);
  let corpo = `<p>Fechamento do período de <b>${br(`${k}-01`)}</b> a <b>${br(fechKey)}</b> para a folha de pagamento. ` +
    `O que acontecer de ${br(fechKey < fim ? somaDias(fechKey, 1) : fim)} até o fim do mês entra no saldo do mês seguinte.</p>`;
  if (equipe.length) corpo += tabelaEmail(["Colaborador", "Regime", "Carga", "Trabalhadas", "Abonadas", "Saldo do período", "Saldo anterior", "Saldo total", "Descontar na folha", "Compensar até o fim do mês", "Excedente desconsiderado", "Faltas", "Ocorrências", "Perfil"], equipe, cores);
  if (diretoria.length) corpo += '<h3 style="color:#1F2A44;margin:8px 0 2px">Diretoria (horário livre)</h3>' + tabelaEmail(["Nome", "Dias com registro", "Horas no período"], diretoria);
  corpo += '<p style="font-size:12px;color:#6B7280">Regras: horas negativas são descontadas na folha; horas positivas valem até 1 dia de carga e devem ser compensadas até o fim do mês ' +
    "(saída mais cedo ou folga, de preferência na última sexta-feira); o que passar de 1 dia é desconsiderado. Os valores ficam gravados na aba Banco de horas do Ponto.</p>";
  await enviar(b, destinatarios(b, true), `Ponto ${b.nome} | Fechamento para a folha ${NOMES_MES[p.m - 1]}/${p.a}`,
    moldeEmail(b, `Fechamento mensal do ponto | ${NOMES_MES[p.m - 1]} de ${p.a}`, `${br(`${k}-01`)} a ${br(fechKey)}`, corpo));
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
    // Agendador do banco (ou teste interno com a chave)
    if (chave && req.headers.get("x-saga-chave") === chave) {
      if (acao === "rotina") return json({ ok: true, ...(await rotina()) });
      if (acao !== "teste") return json({ ok: false, mensagem: "Ação inválida." }, 400);
    } else {
      // Chamada pela tela: so o gestor do ponto
      const auth = req.headers.get("Authorization") || "";
      const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const g = await usuario.rpc("ponto_gerencia");
      if (g.error || g.data !== true) return json({ ok: false, mensagem: "Só o gestor do ponto pode enviar relatórios." }, 403);
    }
    const b = await carregarBase();
    const { hoje } = agoraLocal();
    if (acao === "teste") {
      const para = destinatarios(b, false);
      await enviar(b, para, `Ponto ${b.nome} | E-mail de teste`, moldeEmail(b, "E-mail de teste do Ponto", br(hoje),
        "<p>Se você recebeu este e-mail, o envio automático do Ponto está funcionando.</p><p>Relatório diário às " + esc(b.cfg.hora_relatorio ?? 19) +
        "h nos dias úteis, semanal e fechamento no dia " + esc(b.cfg.dia_fechamento ?? 25) + ".</p>"));
      return json({ ok: true, mensagem: `E-mail de teste enviado para ${para.join(", ")}.` });
    }
    if (acao === "diario") return json({ ok: true, ...(await relatorioDiario(b, corpo.data || hoje, hoje)) });
    if (acao === "semanal") return json({ ok: true, ...(await relatorioSemanal(b, corpo.data || hoje, hoje)) });
    return json({ ok: false, mensagem: "Ação inválida." }, 400);
  } catch (e) {
    return json({ ok: false, mensagem: (e as Error).message }, 500);
  }
});
