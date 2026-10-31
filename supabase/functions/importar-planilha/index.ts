// Importação da planilha (T14/T57): recebe o que o script "Exportar para o SAGA" (Apps Script da planilha
// do Dr. Victor) envia e guarda na área de rascunho do banco (import_*). Nada entra no sistema por aqui:
// a importação de verdade é feita depois, com o mapa aprovado.
// Chamada só com o cabeçalho x-saga-chave = chave do cofre do banco (saga_import_chave).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ ok: false, mensagem: "Use POST." }, 405);
    const ch = await admin.rpc("saga_chave_importacao");
    const chave = ch.data ? String(ch.data) : "";
    if (!chave || req.headers.get("x-saga-chave") !== chave) return json({ ok: false, mensagem: "Chave inválida." }, 403);
    const corpo = await req.json();
    const agora = new Date().toISOString();
    let r;
    switch (corpo.tipo) {
      case "cabecalho":
        r = await admin.from("import_cabecalho").upsert({ id: 1, aba: corpo.aba, colunas: corpo.colunas || [], total_linhas: corpo.total_linhas || null, recebido_em: agora });
        break;
      case "linhas":
        // deno-lint-ignore no-explicit-any
        r = await admin.from("import_linhas").upsert((corpo.linhas || []).map((l: any) => ({ linha: l.linha, valores: l.valores || [], links: l.links || {}, recebido_em: agora })));
        break;
      case "docs":
        // deno-lint-ignore no-explicit-any
        r = await admin.from("import_docs").upsert((corpo.docs || []).map((d: any) => ({ doc_id: d.doc_id, titulo: d.titulo || null, texto: d.texto || null, tamanho: d.texto ? String(d.texto).length : 0, erro: d.erro || null, recebido_em: agora })));
        break;
      case "pastas":
        // deno-lint-ignore no-explicit-any
        r = await admin.from("import_pastas").upsert((corpo.pastas || []).map((p: any) => ({ pasta_id: p.pasta_id, nome: p.nome || null, arquivos: p.arquivos || [], total_arquivos: p.total_arquivos || 0, total_bytes: p.total_bytes || 0, erro: p.erro || null, recebido_em: agora })));
        break;
      case "docs_pendentes": {
        const d = await admin.rpc("import_docs_pendentes", { p_limite: Number(corpo.limite) || 40 });
        if (d.error) return json({ ok: false, mensagem: d.error.message }, 500);
        return json({ ok: true, ids: d.data || [] });
      }
      case "situacao": {
        const [l, d, p] = await Promise.all([
          admin.from("import_linhas").select("linha", { count: "exact", head: true }),
          admin.from("import_docs").select("doc_id", { count: "exact", head: true }),
          admin.from("import_pastas").select("pasta_id", { count: "exact", head: true }),
        ]);
        return json({ ok: true, linhas: l.count, docs: d.count, pastas: p.count });
      }
      default:
        return json({ ok: false, mensagem: "Tipo inválido." }, 400);
    }
    if (r.error) return json({ ok: false, mensagem: r.error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, mensagem: (e as Error).message }, 500);
  }
});
