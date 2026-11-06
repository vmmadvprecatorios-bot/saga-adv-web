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

## Duas conversas em paralelo (desde 01/11/2026)
- **Operador-chefe** (Opus): dono do código e do banco; escreve, testa e publica na `main`.
- **Orquestrador do Codex** (Sonnet): escreve tarefas para o Codex (ChatGPT), confere os PRs dele (branches `codex/...`) e registra tudo. Não mexe no banco; o merge na `main` fica com o Operador-chefe, salvo autorização do Dr. Victor.
- As duas só se entendem pela página de continuidade (seção "Duas conversas, um só registro" e tabela "Trabalho com o Codex"). Ao fim de cada etapa: **ler a versão no ar antes de republicar**, juntar o que a outra conversa mudou e nunca sobrescrever.
- Regras do Codex ficam no `AGENTS.md`. Mudou uma regra do projeto? Atualize `CLAUDE.md` e `AGENTS.md`.

## Regras do projeto
- O site no ar é a branch `main` (GitHub Pages). Trabalhe na branch indicada pela sessão e publique na `main` quando o trabalho estiver testado.
- O repositório é público: arquivos `.sql` e `.md` (exceto este) não vão para o GitHub. Nunca coloque senhas, chaves secretas ou dados de clientes no código.
- Banco: Supabase, projeto "Sistema SAGA ADV´2" (id `fmoskdxgjulagedzjxxk`). Comandos que apagam ou trocam regras podem pedir aprovação que expira em 60 s; se expirar, entregue o bloco para o Dr. Victor rodar no SQL Editor.
- Teste antes de publicar: no banco, simule o usuário e desfaça tudo no fim; na tela, use o navegador (Playwright) com o Supabase simulado.
- Regra de 03/11: em toda lista de opções do sistema (menus, checklists, etiquetas, status, categorias) o administrador geral cria, renomeia, reordena e remove opções na própria tela; remover só desativa (o histórico fica).
- Segurança (04/11): a biblioteca do Supabase fica em `vendor/supabase-js-<versão>.js` (versão fixa, sem CDN com versão solta); scripts de fora só com versão exata. Rever versões e os avisos de segurança do Supabase (get_advisors) uma vez por mês.
- Regra de 04/11 (Dr. Victor): todo dado com formato (CPF/CNPJ, número do processo, telefone, CEP, valores em R$, %, datas) é formatado sozinho enquanto a pessoa digita: ninguém digita ponto, traço, barra ou vírgula de milhar. Tudo o que classifica um processo ou cliente (UF, etiquetas, status, situações, competência, tipos) é menu suspenso organizado (ordem lógica, não alfabética quando houver hierarquia), com criar/renomear/remover dentro do próprio menu para quem pode (saga_planilha.js já tem: formatar, UFS, "+ Nova opção").
- Regra de 06/11 (Dr. Victor): todo recurso novo usa os efeitos de movimento do sistema: entrada e saída suaves (abrir/fechar janelas, cartões que somem ou mudam de lugar, recolher/expandir blocos, com `window.sagaRecolher` do saga_guard.js), curva `cubic-bezier(.22,.78,.25,1)`, 200 a 420 ms, nunca troca seca. Tudo deve respeitar a chavinha "Efeitos de movimento" (localStorage `saga-movimento`='reduzido' desliga: troca na hora).
- Telas: cada tela é um `.html`; `saga_ui.js` monta a barra superior, o menu lateral, permissões e notificações; `saga_tema.css` é o tema; `ponto_calculo.js` é o cálculo do ponto (cópia fiel do Apps Script da planilha).
