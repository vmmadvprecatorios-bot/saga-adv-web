// bases-receber (23/11/2026, Bases públicas de Médicos e Devedores; blocos 445 e 446).
// Porta da carga dos dados públicos (PGFN Dados Abertos e CNES do Ministério da Saúde).
// Quem chama: a carga feita pelo Claude no contêiner da nuvem. O cabeçalho x-saga-carga-key
// é posto pelo próprio ambiente (segredo guardado nas configurações do ambiente): a chave
// nunca fica no banco, no repositório nem na conversa. O banco guarda só o HASH SHA-256
// (bases_publicas_config; na 1ª chamada dentro da janela aberta pelo administrador o hash é gravado).
// Publicar com verify_jwt false (ela mesma confere a chave). Só grava pela bases_receber.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });

async function sha256hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, erro: "Use POST." }, 405);
  let chave = (req.headers.get("x-saga-carga-key") || "").trim();
  if (/^bearer\s+/i.test(chave)) chave = chave.replace(/^bearer\s+/i, "").trim();
  if (chave.length < 24) return json({ ok: false, erro: "Chave ausente ou curta demais (mínimo 24 letras)." }, 403);
  const conf = await admin.rpc("bases_carga_chave_ok", { p_hash: await sha256hex(chave) });
  if (conf.error) return json({ ok: false, erro: "Erro ao conferir a chave: " + conf.error.message }, 500);
  if (conf.data !== true) return json({ ok: false, erro: "Chave inválida (ou a janela de registro está fechada)." }, 403);
  if (Number(req.headers.get("content-length") || 0) > 8_000_000) {
    return json({ ok: false, erro: "Lote grande demais (máx. 8 MB)." }, 413);
  }
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return json({ ok: false, erro: "JSON inválido." }, 400);
  }
  if ((corpo as { tipo?: string })?.tipo === "ping") return json({ ok: true, tipo: "ping" });
  const r = await admin.rpc("bases_receber", { p: corpo });
  if (r.error) return json({ ok: false, erro: r.error.message, codigo: r.error.code }, 500);
  return json({ ok: true, ...(r.data as Record<string, unknown>) });
});
