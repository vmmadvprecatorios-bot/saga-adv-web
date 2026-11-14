// SAGA · Disparos de e-mail (T179, 14/11/2026; blocos 205 a 207). Pedido do Dr. Victor: "o cliente vai para a lista,
// com todas as informações dos disparos, e de tempos em tempos o sistema dispara esses e-mails sozinho".
// Cada remetente (Gmail de cada colaborador, e-mail da Locaweb, da Hostinger...) tem limite próprio por manhã e por tarde;
// a senha fica no COFRE do banco (disparo_conta_<id>) e só esta função lê (disparo_conta_senha, só service_role).
//
// Chamadas:
//  - rotina: agendador disparos-email-rodada (a cada 10 min, só quando há trabalho), cabeçalho x-saga-chave = saga_chave_rotina()
//  - agora: pessoa logada com disparos.enviar ("Rodar agora" na tela; respeita horário e limites)
//  - testar: pessoa logada (dono do remetente ou administrador) manda um e-mail de teste para o próprio e-mail
// Erros sempre à vista: cada envio grava o resultado (disparo_resultado) com o motivo em português; senha recusada pausa o
// remetente (vermelho + sino), limite do provedor pausa até o dia seguinte (amarelo), endereço recusado fica em "Com erro".
// Atenção: o Supabase bloqueia as portas 25 e 587; os provedores usam a 465 (SSL). Outlook/Hotmail só aceita 587.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.16";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-saga-chave",
};
const URL_SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const MAX_POR_RODADA = 30;
const TEMPO_MAX_MS = 110_000;      // a função tem ~150 s; o que sobrar volta para a fila
const PAUSA_ENTRE_MS = 1500;       // espaço entre dois e-mails do mesmo remetente

const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (t: string) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- e-mail montado: texto simples do modelo -> HTML leve (sem imagens, para não cair no spam) ----------
function linkar(t: string) {
  return t.replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:#1f4f9c">${u}</a>`)
    .replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, (e) => `<a href="mailto:${e}" style="color:#1f4f9c">${e}</a>`);
}
function negrito(t: string) { return t.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>"); }
function montarHtml(corpo: string, assinatura: string, remetente: string) {
  const blocos = String(corpo || "").replace(/\r/g, "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const paras = blocos.map((p) => `<p style="margin:0 0 14px">${negrito(linkar(esc(p))).replace(/\n/g, "<br>")}</p>`).join("");
  const ass = assinatura ? `<p style="margin:18px 0 0;color:#334155">${linkar(esc(assinatura)).replace(/\n/g, "<br>")}</p>` : "";
  const rodape = `<p style="margin:26px 0 0;font-size:11.5px;color:#64748b">Se não quiser mais receber nossos e-mails, responda a esta mensagem com a palavra SAIR.</p>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.55;color:#1e293b;max-width:640px">${paras}${ass}${rodape}</div>`;
}
function montarTexto(corpo: string, assinatura: string) {
  return String(corpo || "").replace(/\*\*([^*\n]+)\*\*/g, "$1") + (assinatura ? "\n\n" + assinatura : "") +
    "\n\nSe não quiser mais receber nossos e-mails, responda a esta mensagem com a palavra SAIR.";
}

// ---------- erro do servidor de e-mail -> tipo + motivo em português ----------
// deno-lint-ignore no-explicit-any
function classificar(e: any): { tipo: string; msg: string } {
  const cod = Number(e?.responseCode || 0);
  const txt = String(e?.response || e?.message || e || "erro desconhecido").slice(0, 400);
  const code = String(e?.code || "");
  const base = (cod ? `erro ${cod}: ` : code ? `${code}: ` : "") + txt;
  if (code === "EAUTH" || cod === 535 || cod === 534 || /authentication|auth.*fail|username and password|invalid login|application-specific password/i.test(txt)) {
    return { tipo: "login", msg: "O provedor recusou o login (senha errada, senha de app apagada ou login por senha bloqueado). " + base };
  }
  if (/quota|rate limit|too many|exceeded|limit.*(day|sending)|5\.4\.5|4\.7\.0|4\.7\.28|daily user sending/i.test(txt) || cod === 421 || cod === 452) {
    return { tipo: "limite", msg: "O provedor recusou por excesso de envios. " + base };
  }
  if (code === "EENVELOPE" || /5\.1\.1|5\.1\.0|user unknown|does not exist|no such user|recipient.*(rejected|invalid|not found)|mailbox (unavailable|not found)|invalid recipient|address rejected/i.test(txt)) {
    return { tipo: "destinatario", msg: base };
  }
  if (/ETIMEDOUT|ECONNECTION|ESOCKET|ECONNRESET|EDNS|ECONNREFUSED|EPROTOCOL|timeout|greeting never received/i.test(code + " " + txt) || (cod >= 400 && cod < 500)) {
    return { tipo: "passageiro", msg: "Falha de ligação com o servidor de e-mail (passageira). " + base + (/ECONNREFUSED|ETIMEDOUT/.test(code + txt) ? " · Se o provedor só aceita a porta 587, ele não funciona daqui (o servidor bloqueia a 587): use a 465 (SSL)." : "") };
  }
  return { tipo: "outro", msg: base };
}

// deno-lint-ignore no-explicit-any
type Conta = { id: string; email: string; nome: string; host: string; porta: number; seguro: boolean; usuario: string; assinatura: string };
async function transporte(c: Conta) {
  const s = await admin.rpc("disparo_conta_senha", { p_conta: c.id });
  if (s.error) throw Object.assign(new Error("Não consegui ler a senha no cofre: " + s.error.message), { code: "COFRE" });
  if (!s.data) throw Object.assign(new Error("A senha deste remetente não está no cofre. Grave a senha de novo em Remetentes."), { code: "EAUTH" });
  return nodemailer.createTransport({
    host: c.host, port: c.porta, secure: !!c.seguro, auth: { user: c.usuario || c.email, pass: String(s.data) },
    connectionTimeout: 20_000, greetingTimeout: 15_000, socketTimeout: 30_000,
  });
}
function cabecalhoDe(c: Conta) { return c.nome ? `"${c.nome.replace(/"/g, "'")}" <${c.email}>` : c.email; }

// ---------- uma rodada ----------
async function rodada(origem: string) {
  const inicio = new Date().toISOString(), t0 = Date.now();
  let reservados = 0, enviados = 0, erros = 0;
  const detalhe: Record<string, unknown>[] = [];
  try {
    const r = await admin.rpc("disparo_reservar", { p_max: MAX_POR_RODADA });
    if (r.error) throw new Error("disparo_reservar: " + r.error.message);
    // deno-lint-ignore no-explicit-any
    const itens: any[] = (r.data && r.data.itens) || [];
    reservados = itens.length;
    if (!itens.length) {
      const msg = (r.data && r.data.motivo) || "Nada para mandar.";
      if (origem !== "rotina") await admin.rpc("disparo_execucao_registrar", { p_inicio: inicio, p_origem: origem, p_reservados: 0, p_enviados: 0, p_erros: 0, p_ok: true, p_mensagem: msg });
      return { ok: true, reservados: 0, enviados: 0, erros: 0, mensagem: msg };
    }
    // agrupa por remetente (cada um com a sua ligação; se o login cair, devolve o resto dele)
    // deno-lint-ignore no-explicit-any
    const porConta = new Map<string, any[]>();
    for (const it of itens) { const k = it.conta.id; if (!porConta.has(k)) porConta.set(k, []); porConta.get(k)!.push(it); }
    for (const [, lista] of porConta) {
      const c: Conta = lista[0].conta;
      // deno-lint-ignore no-explicit-any
      let t: any = null, parar: { tipo: string; msg: string } | null = null;
      try { t = await transporte(c); } catch (e) { parar = classificar(e); if (parar.tipo !== "login") parar = { tipo: "passageiro", msg: parar.msg }; }
      for (let i = 0; i < lista.length; i++) {
        const it = lista[i];
        if (parar || Date.now() - t0 > TEMPO_MAX_MS) {
          const tipo = parar ? parar.tipo : "devolver";
          await admin.rpc("disparo_resultado", { p_id: it.id, p_tipo: tipo, p_erro: parar ? parar.msg : null });
          if (parar && tipo === "passageiro") erros++;
          continue;
        }
        try {
          const info = await t.sendMail({
            from: cabecalhoDe(c), to: it.para, subject: it.assunto, replyTo: c.email,
            text: montarTexto(it.corpo, c.assinatura), html: montarHtml(it.corpo, c.assinatura, c.nome),
            headers: { "List-Unsubscribe": `<mailto:${c.email}?subject=SAIR>` },
          });
          await admin.rpc("disparo_resultado", { p_id: it.id, p_tipo: "ok", p_message_id: info?.messageId || null });
          enviados++;
        } catch (e) {
          const k = classificar(e);
          await admin.rpc("disparo_resultado", { p_id: it.id, p_tipo: k.tipo, p_erro: k.msg });
          erros++;
          detalhe.push({ conta: c.email, para: it.para, tipo: k.tipo, erro: k.msg.slice(0, 200) });
          if (k.tipo === "login" || k.tipo === "limite") parar = k;   // não insiste com este remetente
        }
        if (i < lista.length - 1) await dormir(PAUSA_ENTRE_MS);
      }
      try { t?.close?.(); } catch { /* nada */ }
    }
    const msg = `${enviados} enviado(s)` + (erros ? `, ${erros} com erro` : "") + ` de ${reservados} reservado(s).`;
    await admin.rpc("disparo_execucao_registrar", { p_inicio: inicio, p_origem: origem, p_reservados: reservados, p_enviados: enviados, p_erros: erros,
      p_ok: true, p_mensagem: msg, p_detalhe: detalhe.length ? { erros: detalhe } : null });
    if (erros) await admin.rpc("disparos_avisar");
    return { ok: true, reservados, enviados, erros, mensagem: msg };
  } catch (e) {
    const msg = "A rodada falhou: " + String((e as Error)?.message || e).slice(0, 500);
    await admin.rpc("disparo_execucao_registrar", { p_inicio: inicio, p_origem: origem, p_reservados: reservados, p_enviados: enviados, p_erros: erros, p_ok: false, p_mensagem: msg });
    return { ok: false, reservados, enviados, erros, erro: msg };
  }
}

// ---------- teste de um remetente ----------
// deno-lint-ignore no-explicit-any
async function testar(user: any, conta: string) {
  const r = await user.rpc("disparo_conta_para_teste", { p_conta: conta });
  if (r.error) return { ok: false, erro: r.error.message };
  const c = r.data as Conta & { para: string };
  try {
    const t = await transporte(c);
    await t.verify();
    const corpo = `Teste do SAGA: o e-mail de envio ${c.email} está funcionando.\n\nOs disparos de e-mail da Captação vão sair por ele, dentro dos limites cadastrados.`;
    await t.sendMail({ from: cabecalhoDe(c), to: c.para, subject: "[SAGA] Teste do e-mail de envio", text: montarTexto(corpo, c.assinatura), html: montarHtml(corpo, c.assinatura, c.nome) });
    await admin.rpc("disparo_conta_teste_resultado", { p_conta: c.id, p_ok: true });
    return { ok: true, para: c.para };
  } catch (e) {
    const k = classificar(e);
    await admin.rpc("disparo_conta_teste_resultado", { p_conta: c.id, p_ok: false, p_erro: k.msg, p_tipo: k.tipo });
    return { ok: false, erro: k.msg, tipo: k.tipo };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // deno-lint-ignore no-explicit-any
  let corpo: any = {};
  try { corpo = await req.json(); } catch { /* sem corpo */ }
  const acao = String(corpo.acao || "rotina");
  try {
    if (acao === "rotina") {
      const ch = await admin.rpc("saga_chave_rotina");
      if (!ch.data || req.headers.get("x-saga-chave") !== ch.data) return json({ ok: false, erro: "Sem autorização." }, 401);
      return json(await rodada("rotina"));
    }
    const auth = req.headers.get("Authorization") || "";
    const user = createClient(URL_SB, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const u = await user.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u.data?.user) return json({ ok: false, erro: "Entre no SAGA de novo (login vencido)." }, 401);
    if (acao === "agora") {
      const p = await user.rpc("disparos_pode_enviar");
      if (p.error || !p.data) return json({ ok: false, erro: "Você não tem permissão para os disparos de e-mail." }, 403);
      return json(await rodada("manual"));
    }
    if (acao === "testar") {
      if (!corpo.conta) return json({ ok: false, erro: "Informe o remetente." }, 400);
      return json(await testar(user, String(corpo.conta)));
    }
    return json({ ok: false, erro: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ ok: false, erro: String((e as Error)?.message || e) }, 500);
  }
});
