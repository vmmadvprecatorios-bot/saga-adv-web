// Radar de intimações por e-mail, robô do próprio SAGA (blocos 380-384, 22/11/2026, pedido do Dr. Victor pelo Diário de bordo 5).
// Lê a caixa do escritório pelo IMAP do Gmail (SÓ LEITURA: EXAMINE + BODY.PEEK; nunca apaga, marca como lido nem move e-mail),
// separa as publicações de cada formato de tribunal (leitores.js) e grava cada uma pela public.intimacao_email_receber(jsonb),
// que não duplica o que já veio pelo CNJ nem pela tarefa do Claude.
//
// Chamadas:
//  - rotina (agendador radar-email-hora, de hora em hora): cabeçalho x-saga-chave = chave do cofre (saga_chave_rotina), acao "rotina".
//  - pela tela (Intimações > Radar do e-mail), com o login do ADMINISTRADOR GERAL:
//      acao "testar": abre a ligação, entra com a senha de app e conta os e-mails dos remetentes (não grava intimação);
//      acao "rodar":  faz uma rodada agora.
// A senha de app fica no cofre do banco (radar_email_senha): nunca aparece na tela, no registro, nos avisos nem nos erros.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import PostalMime from "npm:postal-mime@2.6.0";
import { ler, VERSAO_LEITOR } from "./leitores.js";
import { ErroRadar, Imap, guardarSenha, traduzir, entrar, buscar, metadados, corpos } from "./imap.ts";

const MAX_POR_RODADA = 80;          // e-mails novos abertos por rodada (o resto fica para a próxima)
const MAX_TAMANHO = 8 * 1024 * 1024; // e-mail maior que isso não é aberto (fica na lista de erros)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-saga-chave",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/* ---------- configuração ---------- */
type Conf = { ativo: boolean; conta: string; remetentes: string[]; dias: number };
async function lerConf(): Promise<{ conf: Conf; senha: string }> {
  const c = await admin.from("radar_email_config").select("ativo,conta,remetentes,dias").eq("id", true).maybeSingle();
  if (c.error) throw new ErroRadar("Não consegui ler a configuração do radar no banco: " + c.error.message, "BANCO");
  const s = await admin.rpc("radar_email_senha");
  if (s.error) throw new ErroRadar("Não consegui ler a senha no cofre do banco: " + s.error.message, "COFRE");
  const senha = s.data ? String(s.data) : "";
  guardarSenha(senha);
  return { conf: { ativo: !!c.data?.ativo, conta: String(c.data?.conta || ""), remetentes: c.data?.remetentes || [], dias: Number(c.data?.dias) || 3 }, senha };
}
function remetenteValido(de: string, lista: string[]) {
  const d = de.toLowerCase();
  return lista.some((r) => { const x = r.toLowerCase(); return x.includes("@") ? d === x : (d.endsWith("@" + x) || d.endsWith("." + x)); });
}

/* ---------- uma rodada ---------- */
async function rodada(conf: Conf, senha: string, origem: string) {
  const inicio = new Date().toISOString();
  const cont = { emails: 0, gravadas: 0, ja_tinha: 0, ignoradas: 0, nao_entendidas: 0, erros: 0, novas: 0, publicacoes: 0, ficou_para_depois: 0 };
  const im = new Imap();
  try {
    if (!conf.conta) throw new ErroRadar("Falta o e-mail da caixa em Intimações > Radar do e-mail", "CONFIG");
    await entrar(im, conf.conta, senha);
    const uids = await buscar(im, conf.remetentes, conf.dias);
    const meta = await metadados(im, uids);
    // o que já foi lido (e não precisa ler de novo com um leitor mais novo)
    const ja = new Map<string, any>();
    for (let i = 0; i < meta.length; i += 300) {
      const q = await admin.from("radar_email_mensagens").select("msgid,situacao,versao_leitor").in("msgid", meta.slice(i, i + 300).map((m) => m.msgid));
      if (q.error) throw new ErroRadar("Não consegui ler no banco os e-mails já lidos: " + q.error.message, "BANCO");
      for (const r of q.data || []) ja.set(r.msgid, r);
    }
    const novos = meta.filter((m) => { const r = ja.get(m.msgid); return !r || (r.situacao === "nao_entendida" && (r.versao_leitor || 0) < VERSAO_LEITOR) || r.situacao === "erro"; });
    novos.sort((a, b) => a.uid - b.uid);
    const lote = novos.slice(0, MAX_POR_RODADA);
    cont.ficou_para_depois = novos.length - lote.length;
    // intimações que a tarefa do Claude já gravou destes mesmos e-mails (o número das publicações pode ser outro)
    const doClaude = new Map<string, Set<string>>();
    if (lote.length) {
      const q = await admin.from("intimacoes").select("id_externo,numero_processo").eq("fonte", "email")
        .or(lote.map((m) => `id_externo.like.${m.msgid}#*`).join(","));
      if (q.error) throw new ErroRadar("Não consegui conferir as intimações já gravadas: " + q.error.message, "BANCO");
      for (const r of q.data || []) {
        const k = String(r.id_externo).split("#")[0];
        if (!doClaude.has(k)) doClaude.set(k, new Set());
        doClaude.get(k)!.add(String(r.numero_processo || ""));
      }
    }
    const grandes = lote.filter((m) => m.tamanho > MAX_TAMANHO);
    const abrir = lote.filter((m) => m.tamanho <= MAX_TAMANHO);
    const brutos = await corpos(im, abrir.map((m) => m.uid));
    await im.fechar();

    const linhasMsg: any[] = [];
    for (const m of grandes) {
      cont.emails++; cont.erros++;
      linhasMsg.push({ msgid: m.msgid, situacao: "erro", motivo: `E-mail grande demais (${Math.round(m.tamanho / 1048576)} MB): abra no Gmail e lance à mão (código GRANDE)`, versao_leitor: VERSAO_LEITOR });
    }
    for (const m of abrir) {
      cont.emails++;
      const bruto = brutos.get(m.uid);
      if (!bruto) { cont.erros++; linhasMsg.push({ msgid: m.msgid, situacao: "erro", motivo: "O Gmail não entregou o conteúdo deste e-mail. O robô tenta de novo na próxima rodada (código SEM_CORPO)", versao_leitor: VERSAO_LEITOR }); continue; }
      let e: any;
      try { e = await PostalMime.parse(bruto); } catch (er) {
        cont.erros++; linhasMsg.push({ msgid: m.msgid, situacao: "erro", motivo: `Não consegui abrir o e-mail (formato quebrado): ${(er as Error).message} (código MIME)`.slice(0, 400), versao_leitor: VERSAO_LEITOR }); continue;
      }
      const remetente = String(e.from?.address || "").toLowerCase();
      const base = { msgid: m.msgid, recebido_em: e.date ? new Date(e.date).toISOString() : null, remetente, assunto: String(e.subject || "").slice(0, 400), versao_leitor: VERSAO_LEITOR };
      if (!remetenteValido(remetente, conf.remetentes)) { cont.emails--; continue; } // a busca do Gmail é larga: não é de remetente da lista
      const link = `https://mail.google.com/mail/?authuser=${encodeURIComponent(conf.conta)}#all/${m.msgid}`;
      let r: any;
      try { r = ler({ id: m.msgid, remetente, remetenteNome: e.from?.name || "", assunto: e.subject || "", data: e.date || new Date(), texto: e.text || "", html: e.html || "", link }); }
      catch (er) { r = { situacao: "nao_entendido", leitor: "?", motivo: "o leitor falhou: " + (er as Error).message }; }
      if (r.situacao === "ignorado") { cont.ignoradas++; linhasMsg.push({ ...base, situacao: "ignorada", leitor: r.leitor, motivo: r.motivo }); continue; }
      if (r.situacao !== "ok") { cont.nao_entendidas++; linhasMsg.push({ ...base, situacao: "nao_entendida", leitor: r.leitor, motivo: `${r.motivo} (código NAO_ENTENDIDO)` }); continue; }
      const jaDoClaude = doClaude.get(m.msgid) || new Set();
      let novas = 0, erroGravar = "";
      const res: any[] = [];
      for (const it of r.itens) {
        cont.publicacoes++;
        if (jaDoClaude.has(it.numero)) { res.push({ numero: it.numero, situacao: "ja_recebida_claude" }); continue; }
        const g = await admin.rpc("intimacao_email_receber", { p: it });
        if (g.error) { erroGravar = g.error.message; res.push({ numero: it.numero, situacao: "erro", erro: g.error.message.slice(0, 200) }); continue; }
        if (g.data?.situacao === "nova") novas++;
        res.push({ numero: it.numero, situacao: g.data?.situacao || "?" });
      }
      cont.novas += novas;
      if (erroGravar) { cont.erros++; linhasMsg.push({ ...base, situacao: "erro", leitor: r.leitor, itens: r.itens.length, novas, motivo: `O banco recusou gravar: ${erroGravar.slice(0, 250)}. O robô tenta de novo na próxima rodada (código BANCO)`, detalhe: { publicacoes: res } }); continue; }
      if (novas) cont.gravadas++; else cont.ja_tinha++;
      linhasMsg.push({ ...base, situacao: novas ? "gravada" : "ja_tinha", leitor: r.leitor, itens: r.itens.length, novas, motivo: null, detalhe: { publicacoes: res } });
    }
    const agora = new Date().toISOString();
    for (let i = 0; i < linhasMsg.length; i += 100) {
      const w = await admin.from("radar_email_mensagens").upsert(linhasMsg.slice(i, i + 100).map((l) => ({ ...l, ultima_vez: agora })), { onConflict: "msgid" });
      if (w.error) throw new ErroRadar("Não consegui gravar a lista dos e-mails lidos: " + w.error.message, "BANCO");
    }
    await admin.rpc("radar_email_avisar");
    const ok = cont.erros === 0 && cont.nao_entendidas === 0;
    const msg = `${cont.emails} e-mail(s) novo(s): ${cont.novas} intimação(ões) nova(s), ${cont.ja_tinha} já tinham chegado (CNJ ou tarefa do Claude), ${cont.ignoradas} não eram intimação` +
      (cont.nao_entendidas ? `, ${cont.nao_entendidas} NÃO ENTENDIDO(S)` : "") + (cont.erros ? `, ${cont.erros} com erro` : "") +
      (cont.ficou_para_depois ? `; ${cont.ficou_para_depois} ficaram para a próxima rodada` : "") + ".";
    await admin.rpc("saude_rodada_registrar", { p_robo: "radar_email_robo", p_ok: ok, p_mensagem: msg, p_lidos: cont.emails, p_novos: cont.novas, p_detalhe: { origem, ...cont }, p_inicio: inicio });
    return { ok: true, mensagem: msg, ...cont };
  } catch (e) {
    await im.fechar();
    const erro = traduzir(e);
    await admin.rpc("saude_rodada_registrar", { p_robo: "radar_email_robo", p_ok: false, p_mensagem: erro, p_lidos: cont.emails, p_novos: cont.novas, p_detalhe: { origem, codigo: (e as ErroRadar).codigo || "ERRO", ...cont }, p_inicio: inicio });
    return { ok: false, mensagem: erro, ...cont };
  }
}

/* ---------- testar a ligação (não grava intimação) ---------- */
async function testar(conf: Conf, senha: string) {
  const im = new Imap();
  try {
    const pasta = await entrar(im, conf.conta, senha);
    const uids = await buscar(im, conf.remetentes, conf.dias);
    await im.fechar();
    const msg = `Ligação funcionando: entrei em ${conf.conta}, pasta "${pasta}" (só leitura), ${uids.length} e-mail(s) dos remetentes nos últimos ${conf.dias} dia(s).`;
    await admin.from("radar_email_config").update({ ultimo_teste_em: new Date().toISOString(), ultimo_teste_ok: true, ultimo_teste_msg: msg }).eq("id", true);
    return { ok: true, mensagem: msg, emails: uids.length };
  } catch (e) {
    await im.fechar();
    const erro = traduzir(e);
    await admin.from("radar_email_config").update({ ultimo_teste_em: new Date().toISOString(), ultimo_teste_ok: false, ultimo_teste_msg: erro }).eq("id", true);
    return { ok: false, mensagem: erro };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const corpo = await req.json().catch(() => ({}));
    const acao = String(corpo.acao || "");
    const ch = await admin.rpc("saga_chave_rotina");
    const chaveRotina = ch.data ? String(ch.data) : "";

    if (chaveRotina && req.headers.get("x-saga-chave") === chaveRotina) {
      // sondar: só confere se o servidor alcança o Gmail na porta 993 (sem senha)
      if (acao === "sondar") {
        const im = new Imap();
        try { const g = await im.abrir(); await im.fechar(); return json({ ok: true, mensagem: "O servidor alcança o Gmail (porta 993).", saudacao: g.slice(0, 60) }); }
        catch (e) { await im.fechar(); return json({ ok: false, mensagem: traduzir(e) }); }
      }
      if (acao !== "rotina") return json({ ok: false, mensagem: "Ação inválida." }, 400);
      const { conf, senha } = await lerConf();
      if (!conf.ativo) return json({ ok: true, mensagem: "Radar do e-mail desligado pelo administrador." });
      if (!senha) return json({ ok: true, mensagem: "Radar do e-mail ainda sem a senha de app: nada a fazer." });
      return json(await rodada(conf, senha, "robo"));
    }

    // pela tela: só o administrador geral
    const auth = req.headers.get("Authorization") || "";
    const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const adm = await usuario.rpc("eh_admin_sistema");
    if (adm.error || adm.data !== true) return json({ ok: false, mensagem: "Só o administrador geral mexe no radar do e-mail." }, 403);
    const { conf, senha } = await lerConf();
    if (!senha) return json({ ok: false, mensagem: "Cole a senha de app do Gmail e salve antes (código SEM_SENHA)." });
    if (acao === "testar") return json(await testar(conf, senha));
    if (acao === "rodar") return json(await rodada(conf, senha, "manual"));
    return json({ ok: false, mensagem: "Ação inválida." }, 400);
  } catch (e) {
    return json({ ok: false, mensagem: traduzir(e) }, 500);
  }
});
