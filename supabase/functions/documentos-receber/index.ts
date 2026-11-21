// DESLIGADA em 21/11/2026 (Segurança parte 1 do laudo, achado 5): aceitava chamadas só com a chave fixa do cofre,
// gravava arquivo em qualquer ficha e apagava do armazenamento o que já tinha sido marcado como removido.
// Hoje o conector (saga-mcp: preparar_envio_de_arquivo) faz isso com o login da pessoa.
// O código antigo ficou em index_antigo.ts (só para consulta; não é publicado).
Deno.serve(() => new Response(JSON.stringify({ ok: false, erro: "Função desligada em 21/11/2026: use o conector do SAGA (preparar_envio_de_arquivo)." }), { status: 410, headers: { "content-type": "application/json; charset=utf-8" } }));
