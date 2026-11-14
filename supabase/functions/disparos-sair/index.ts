// SAGA · "Não quero mais receber estes e-mails" (14/11/2026, Dr. Victor; bloco 220). Pública (verify_jwt false), faz SÓ isto:
// recebe o token do item (disparo_fila.sair_token), grava o e-mail em "Não enviar mais" (todas as identidades e caixas) e
// tira da fila o que estava esperando (disparo_sair, com limite por IP contra abuso). Não devolve nenhum dado do cliente.
// - POST de um clique do Gmail/Yahoo/Outlook (RFC 8058: corpo "List-Unsubscribe=One-Click", token na URL ?t=)
// - POST da página sair.html do site (JSON {t})
// GET não descadastra (leitores de link abrem GET sozinhos): só explica.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, erro: "Use o botão do e-mail (ou responda SAIR)." }, 405);
  const url = new URL(req.url);
  let t = url.searchParams.get("t") || "";
  if (!t) { try { const b = await req.json(); t = String(b?.t || ""); } catch { /* corpo de formulário (one-click) */ } }
  t = t.replace(/[^a-f0-9]/gi, "").slice(0, 64);
  if (t.length < 32) return json({ ok: false, erro: "Link inválido." }, 400);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const r = await admin.rpc("disparo_sair", { p_token: t, p_ip: ip });
  if (r.error) return json({ ok: false, erro: "Não consegui registrar agora. Responda o e-mail com a palavra SAIR." }, 500);
  return json(r.data || { ok: false });
});
