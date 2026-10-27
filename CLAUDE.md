# SAGA ADV (VMMADV): instruções para o Claude

Sistema do escritório Victor Morais Advocacia. O usuário é o Dr. Victor; escreva em português simples, sem termos técnicos desnecessários.

## Ao começar uma conversa
1. Leia a página privada de continuidade com a ferramenta Artifact (`action: "read"`):
   https://claude.ai/artifact/1QjZuv5BHW7H5E2wggvguT
   Ela traz o estado do projeto, as decisões, as pendências e o próximo passo combinado.
2. Os blocos SQL já aplicados no banco estão anexados a essa página (pasta `sql/`). Leia com `action: "read"` e `path: "sql/<arquivo>"` quando precisar.
3. Diga ao Dr. Victor onde paramos e qual é o próximo passo, e siga.

## Ao encerrar (quando ele disser "vou encerrar", "por hoje é só" ou parecido), e ao fim de cada etapa grande
- Atualize a página de continuidade (republique no mesmo link, passando `url`): estado atual, próximo passo, pendências e uma linha no registro de sessões.
- Anexe à página os novos blocos SQL criados na sessão (`files`, caminho `sql/...`, `contentType: text/plain`).

## Regras do projeto
- O site no ar é a branch `main` (GitHub Pages). Trabalhe na branch indicada pela sessão e publique na `main` quando o trabalho estiver testado.
- O repositório é público: arquivos `.sql` e `.md` (exceto este) não vão para o GitHub. Nunca coloque senhas, chaves secretas ou dados de clientes no código.
- Banco: Supabase, projeto "Sistema SAGA ADV´2" (id `fmoskdxgjulagedzjxxk`). Comandos que apagam ou trocam regras podem pedir aprovação que expira em 60 s; se expirar, entregue o bloco para o Dr. Victor rodar no SQL Editor.
- Teste antes de publicar: no banco, simule o usuário e desfaça tudo no fim; na tela, use o navegador (Playwright) com o Supabase simulado.
- Telas: cada tela é um `.html`; `saga_ui.js` monta a barra superior, o menu lateral, permissões e notificações; `saga_tema.css` é o tema; `ponto_calculo.js` é o cálculo do ponto (cópia fiel do Apps Script da planilha).
