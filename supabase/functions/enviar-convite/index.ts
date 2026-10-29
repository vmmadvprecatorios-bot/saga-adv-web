// ================================================================
// EDGE FUNCTION: enviar-convite (v3, 29/10/2026)
// ================================================================
// Chamada pela tela de Colaboradores (aba Equipe ou convite individual)
// depois de gravar um convite. Roda no servidor do Supabase.
//
// O que faz:
//   1. Confere quem está chamando (logado e administrador ou autor do convite).
//   2. Pré-cadastra o colaborador em "usuarios" (se ainda não existir) e o perfil.
//   3. Gera o link de convite do Supabase Auth (ou um link novo, se a pessoa
//      já foi convidada e não aceitou) e envia o e-mail pelo Gmail do
//      administrador geral (segredos GMAIL_USUARIO e GMAIL_SENHA_APP),
//      sem o limite de poucos e-mails por hora do envio padrão do Supabase.
//   4. Marca o convite como "pendente" (enviado, aguardando aceite).
// O endereço do sistema vem de configuracoes_sistema.extra.url_sistema.
// ================================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.16";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta(405, { erro: "Método não permitido." });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Quem está chamando?
  const authHeader = req.headers.get("Authorization") ?? "";
  const clienteUsuario = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: sessao } = await clienteUsuario.auth.getUser();
  if (!sessao?.user) return resposta(401, { erro: "Sessão inválida. Faça login novamente." });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: quem } = await admin.from("usuarios").select("id, ativo, eh_administrador, nome_completo")
    .eq("auth_user_id", sessao.user.id).maybeSingle();
  if (!quem || !quem.ativo) return resposta(403, { erro: "Usuário sem acesso ativo ao sistema." });

  // 2. Qual convite?
  let conviteId = "";
  try { conviteId = (await req.json())?.convite_id ?? ""; } catch (_) { /* corpo inválido */ }
  if (!conviteId) return resposta(400, { erro: "Convite não informado." });

  const { data: convite } = await admin.from("convites")
    .select("id, email, nome_sugerido, status, expira_em, convidado_por_id, papel_sugerido_id, mensagem_pessoal, papeis(id, nome, editavel)")
    .eq("id", conviteId).maybeSingle();
  if (!convite) return resposta(404, { erro: "Convite não encontrado." });
  if (!quem.eh_administrador && convite.convidado_por_id !== quem.id) {
    return resposta(403, { erro: "Somente o administrador ou o autor do convite pode enviá-lo." });
  }
  if (!["aguardando_envio", "pendente"].includes(convite.status)) {
    return resposta(409, { erro: `Este convite está com status "${convite.status}" e não pode ser enviado.` });
  }
  if (new Date(convite.expira_em) < new Date()) {
    await admin.from("convites").update({ status: "expirado" }).eq("id", convite.id);
    return resposta(409, { erro: "Este convite expirou. Crie um novo convite." });
  }
  // deno-lint-ignore no-explicit-any
  const papel = convite.papeis as any;
  const papelProtegido = papel && papel.editavel === false; // ex.: Administrador
  if (papelProtegido && !quem.eh_administrador) {
    return resposta(403, { erro: `Somente o administrador pode convidar com o perfil ${papel.nome}.` });
  }

  const email = String(convite.email).trim().toLowerCase();
  const nome = (convite.nome_sugerido ?? "").trim() || email;

  // 3a. Pré-cadastro em "usuarios" (a tela de onboarding liga o login depois)
  const { data: existente } = await admin.from("usuarios").select("id, auth_user_id").eq("email", email).maybeSingle();
  if (existente?.auth_user_id) return resposta(409, { erro: "Este e-mail já tem acesso ao sistema. Use a redefinição de senha." });
  let usuarioId = existente?.id as string | undefined;
  if (!usuarioId) {
    const { data: novo, error: erroNovo } = await admin.from("usuarios")
      .insert({ nome_completo: nome, email, ativo: true, eh_administrador: papelProtegido }).select("id").single();
    if (erroNovo) return resposta(500, { erro: "Falha ao pré-cadastrar o colaborador: " + erroNovo.message });
    usuarioId = novo.id;
  }
  if (convite.papel_sugerido_id) {
    const { error: erroPapel } = await admin.from("usuarios_papeis").upsert(
      { usuario_id: usuarioId, papel_id: convite.papel_sugerido_id, atribuido_por_id: quem.id },
      { onConflict: "usuario_id,papel_id", ignoreDuplicates: true });
    if (erroPapel) return resposta(500, { erro: "Falha ao atribuir o perfil: " + erroPapel.message });
  }

  // 3b. Link de acesso: convite novo; se a pessoa já foi convidada antes e não aceitou, link de definição de senha
  const { data: sis } = await admin.from("configuracoes_sistema").select("nome_escritorio, extra").maybeSingle();
  const SITE_URL = String(sis?.extra?.url_sistema || Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  if (!SITE_URL) return resposta(500, { erro: "Endereço do sistema não configurado (configuracoes_sistema.extra.url_sistema)." });
  const escritorio = sis?.nome_escritorio || "SAGA";
  const redirectTo = `${SITE_URL}/onboarding_convite_menus_suspensos_frente.html`;
  let link = "";
  const conv = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo, data: { nome_completo: nome, convite_id: convite.id } } });
  if (conv.error) {
    if (!/already|registered|exists/i.test(conv.error.message || "")) return resposta(502, { erro: "Não foi possível gerar o link do convite: " + conv.error.message });
    const rec = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    if (rec.error) return resposta(502, { erro: "Não foi possível gerar o link do convite: " + rec.error.message });
    link = rec.data.properties.action_link;
  } else {
    link = conv.data.properties.action_link;
  }

  // 3c. E-mail pelo Gmail do administrador geral
  const usuario = Deno.env.get("GMAIL_USUARIO"), senha = (Deno.env.get("GMAIL_SENHA_APP") || "").replace(/\s+/g, "");
  if (!usuario || !senha) return resposta(500, { erro: "Envio de e-mail não configurado (segredos GMAIL_USUARIO e GMAIL_SENHA_APP)." });
  const primeiro = nome.split(/\s+/)[0];
  const msg = convite.mensagem_pessoal ? `<p style="background:#F3F4F6;border-left:3px solid #1F2A44;padding:8px 12px;margin:12px 0">${esc(convite.mensagem_pessoal)}</p>` : "";
  const html = '<div style="font-family:Calibri,Arial;color:#1F2937;max-width:620px">' +
    `<div style="background:#1F2A44;color:#fff;padding:14px 18px;border-radius:6px 6px 0 0;font-size:18px;font-weight:bold">${esc(escritorio)} · SAGA</div>` +
    '<div style="border:1px solid #E5E7EB;border-top:0;padding:16px 18px;border-radius:0 0 6px 6px">' +
    `<p>Olá, ${esc(primeiro)}!</p><p>${esc(quem.nome_completo || "O administrador")} convidou você para usar o SAGA, o sistema do escritório${papel?.nome ? ` (perfil: <b>${esc(papel.nome)}</b>)` : ""}.</p>` + msg +
    '<p>Clique no botão abaixo para criar a sua senha e entrar:</p>' +
    `<p style="margin:20px 0"><a href="${esc(link)}" style="background:#2f6cd6;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">Criar minha senha</a></p>` +
    '<p style="font-size:12px;color:#6B7280">O link vale por pouco tempo e só pode ser usado uma vez. Se expirar, peça um novo convite ao administrador. Se você não esperava este convite, ignore este e-mail.</p>' +
    "</div></div>";
  try {
    const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: usuario, pass: senha } });
    await t.sendMail({ from: `"${escritorio} · SAGA" <${usuario}>`, to: email, subject: `Convite para o SAGA · ${escritorio}`, html });
  } catch (e) {
    return resposta(502, { erro: "O e-mail não pôde ser enviado: " + (e as Error).message });
  }

  // 4. Convite enviado
  await admin.from("convites").update({ status: "pendente", email }).eq("id", convite.id);
  return resposta(200, { ok: true, mensagem: `Convite enviado para ${email}.` });
});
