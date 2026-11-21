// Desligada (20/11/2026): era só um teste da saga-mcp. Pode ser apagada pelo administrador no painel do Supabase.
Deno.serve(() => new Response(JSON.stringify({ ok: false, erro: "função de teste desligada" }), { status: 410, headers: { "content-type": "application/json" } }));
