// DESLIGADA em 21/11/2026 (Segurança parte 1 do laudo, achado 5): a importação da planilha (T14/T57) já terminou
// e a função aceitava chamadas só com a chave fixa do cofre. O código antigo ficou em index_antigo.ts
// (só para consulta; não é publicado). Para usar de novo: publicar o index_antigo.ts como index.ts, com o OK do Dr. Victor.
Deno.serve(() => new Response(JSON.stringify({ ok: false, erro: "Função desligada em 21/11/2026 (importação da planilha já concluída)." }), { status: 410, headers: { "content-type": "application/json; charset=utf-8" } }));
