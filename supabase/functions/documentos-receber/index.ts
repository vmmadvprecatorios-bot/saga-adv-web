// Documentos do cliente enviados pelo Claude (11/11/2026): recebe um arquivo e guarda na ficha do cliente,
// do mesmo jeito que o botão "Anexar" da ficha (lugar documentos-clientes, caminho <processo>/<uuid>_<nome>,
// linha em documentos, pasta opcional). Serve para o Claude organizar a pasta de um cliente novo com as
// fotos e PDFs que o Dr. Victor manda na conversa.
// Chamada só com o cabeçalho x-saga-chave = chave do cofre do banco (saga_import_chave), como a importar-planilha.
// Corpo (JSON): { processo_id, pessoa_id, pasta_id?, usuario_id, nome_arquivo, tipo_conteudo?, conteudo_base64 }
// { acao: "liberar_espaco", pessoa_id }: apaga do armazenamento só o que já foi marcado como removido no banco.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE = 25 * 1024 * 1024;

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ ok: false, mensagem: "Use POST." }, 405);
    const ch = await admin.rpc("saga_chave_importacao");
    const chave = ch.data ? String(ch.data) : "";
    if (!chave || req.headers.get("x-saga-chave") !== chave) return json({ ok: false, mensagem: "Chave inválida." }, 403);
    const c = await req.json();

    // Liberar espaço: apaga do armazenamento só os arquivos de documentos desta pessoa que JÁ foram
    // marcados como removidos (excluido_logico = true, feito antes no banco por quem pode apagar).
    // A linha em documentos fica (registro do que existiu).
    if (c.acao === "liberar_espaco") {
      if (!UUID.test(String(c.pessoa_id || ""))) return json({ ok: false, mensagem: "Falta pessoa_id." }, 400);
      const d = await admin.from("documentos").select("caminho_storage").eq("pessoa_id", c.pessoa_id).eq("excluido_logico", true);
      if (d.error) return json({ ok: false, mensagem: d.error.message }, 500);
      const caminhos = (d.data || []).map((x) => x.caminho_storage).filter(Boolean);
      if (!caminhos.length) return json({ ok: true, removidos: 0 });
      const r = await admin.storage.from("documentos-clientes").remove(caminhos);
      if (r.error) return json({ ok: false, mensagem: r.error.message }, 500);
      return json({ ok: true, removidos: (r.data || []).length });
    }

    for (const k of ["processo_id", "pessoa_id", "usuario_id"]) if (!UUID.test(String(c[k] || ""))) return json({ ok: false, mensagem: "Falta " + k + "." }, 400);
    if (c.pasta_id && !UUID.test(String(c.pasta_id))) return json({ ok: false, mensagem: "pasta_id inválida." }, 400);
    const nome = String(c.nome_arquivo || "").trim();
    if (!nome || !c.conteudo_base64) return json({ ok: false, mensagem: "Falta o arquivo." }, 400);

    // o processo tem de ser da pessoa, e a pasta (se houver) também
    const pr = await admin.from("processos").select("id").eq("id", c.processo_id).eq("pessoa_id", c.pessoa_id).maybeSingle();
    if (pr.error || !pr.data) return json({ ok: false, mensagem: "Processo não é desta pessoa." }, 400);
    if (c.pasta_id) {
      const pa = await admin.from("pastas_cliente").select("id").eq("id", c.pasta_id).eq("pessoa_id", c.pessoa_id).eq("ativo", true).maybeSingle();
      if (pa.error || !pa.data) return json({ ok: false, mensagem: "Pasta não é desta pessoa." }, 400);
    }

    const bin = Uint8Array.from(atob(String(c.conteudo_base64)), (x) => x.charCodeAt(0));
    if (bin.length > LIMITE) return json({ ok: false, mensagem: "Arquivo maior que 25 MB." }, 400);
    const seguro = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    const caminho = c.processo_id + "/" + crypto.randomUUID() + "_" + seguro;
    const i = nome.lastIndexOf(".");
    const tipo = i > -1 ? nome.slice(i + 1).toLowerCase() : null;

    const up = await admin.storage.from("documentos-clientes").upload(caminho, bin, { contentType: c.tipo_conteudo || "application/octet-stream" });
    if (up.error) return json({ ok: false, mensagem: up.error.message }, 500);
    const ins = await admin.from("documentos").insert({
      processo_id: c.processo_id, pessoa_id: c.pessoa_id, usuario_id: c.usuario_id, nome_arquivo: nome,
      caminho_storage: caminho, tipo_documento: tipo, tamanho_bytes: bin.length, pasta_id: c.pasta_id || null,
      visivel_portal_cliente: false, excluido_logico: false,
    }).select("id").single();
    if (ins.error) {
      await admin.storage.from("documentos-clientes").remove([caminho]);
      return json({ ok: false, mensagem: ins.error.message }, 500);
    }
    return json({ ok: true, id: ins.data.id, caminho });
  } catch (e) {
    return json({ ok: false, mensagem: (e as Error).message }, 500);
  }
});
