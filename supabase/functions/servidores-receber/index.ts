// servidores-receber (22/11/2026, Mapa dos servidores, fase 1; bloco 400).
// Porta TEMPORÁRIA da carga dos dados públicos do Portal da Transparência (SIAPE).
// Quem chama: a carga feita pelo Claude no contêiner da nuvem, com o cabeçalho x-siape-chave.
// O banco guarda só o HASH SHA-256 da chave e a data em que ela vence (siape_config);
// a chave em si nunca fica no banco, no repositório nem na conversa.
// Publicar com verify_jwt false (ela mesma confere a chave). Desligar quando a carga inicial terminar.
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
  const chave = req.headers.get("x-siape-chave") || "";
  if (chave.length < 40) return json({ ok: false, erro: "Chave ausente." }, 403);
  const conf = await admin.rpc("siape_carga_chave_ok", { p_hash: await sha256hex(chave) });
  if (conf.error) return json({ ok: false, erro: "Erro ao conferir a chave: " + conf.error.message }, 500);
  if (conf.data !== true) return json({ ok: false, erro: "Chave inválida ou vencida." }, 403);
  if (Number(req.headers.get("content-length") || 0) > 8_000_000) {
    return json({ ok: false, erro: "Lote grande demais (máx. 8 MB)." }, 413);
  }
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return json({ ok: false, erro: "JSON inválido." }, 400);
  }
  const r = await admin.rpc("siape_receber", { p: corpo });
  if (r.error) return json({ ok: false, erro: r.error.message, codigo: r.error.code }, 500);
  return json({ ok: true, ...(r.data as Record<string, unknown>) });
});
