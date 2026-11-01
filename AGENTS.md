# SAGA ADV (VMMADV): instruções para agentes de código (Codex e outros)

Sistema do escritório Victor Morais Advocacia. O dono é o Dr. Victor (não técnico). Textos que aparecem na tela, mensagens de commit e descrição do PR: **português simples**, sem termos técnicos desnecessários.

Quem coordena e revisa o seu trabalho é o Claude. Ele confere o PR, testa e publica. Você **não** publica na `main`.

## Como trabalhar
1. Crie uma branch própria a partir da `main`: `codex/<assunto-curto>`. Nunca faça push direto na `main`.
2. Faça só o que a tarefa pede. Mudanças pequenas e focadas. Não reformate arquivos inteiros nem renomeie coisas sem pedido.
3. Abra um PR para a `main`. Na descrição (em português) diga: o que mudou, quais arquivos, como testou, e o que ficou de fora ou com dúvida.
4. Se a tarefa exigir mexer no banco, em senhas, chaves ou em funções do Supabase, **pare e avise no PR**. Isso é feito só pelo Claude.

## Regras inegociáveis
- **O repositório é público.** Nunca coloque senhas, chaves secretas, tokens, e-mails de clientes, CPFs ou qualquer dado de cliente no código, em testes ou em exemplos. Use dados inventados.
- Não crie nem commite arquivos `.sql`, `.env` ou `.md` (exceto `CLAUDE.md` e este `AGENTS.md`); eles são ignorados de propósito.
- Não altere `supabase/functions` sem a tarefa pedir.
- Não acesse o banco real. Para testar telas, simule o Supabase (mock) no navegador.

## Como o sistema é montado
- Cada tela é um arquivo `.html` na raiz. Site publicado pelo GitHub Pages a partir da `main`.
- `saga_ui.js`: barra superior, menu lateral, permissões e notificações.
- `saga_guard.js`: esconde a tela até confirmar o login; cuida das animações e transições gerais.
- `saga_tema.css`: tema (claro/escuro, cores como variáveis). Use as variáveis, não cores soltas.
- `ponto_calculo.js`: cálculo do ponto, cópia fiel do Apps Script da planilha. **Não altere** sem pedido explícito.
- `saga_intimacoes.js`: tela de intimações.
- Banco: Supabase. A tela só lê e grava pelo cliente já configurado nas telas; as regras de acesso ficam no banco.

## Padrão visual e de movimento
- Azul-marinho, cinza e branco, modo claro e escuro, funcionando no celular.
- Toda tela ou janela nova segue o padrão de movimento do sistema (telas montam em ondas, janelas abrem com mola, botões afundam ao apertar). O `saga_guard.js` cobre a maior parte automaticamente: reaproveite, não reinvente.
- Trocar de tela mexe só no conteúdo; menus superior e lateral ficam parados. Nada pode "piscar" nem mostrar sujeira de outra tela.
- Respeite as permissões: o menu e as telas mostram só o que o perfil do usuário pode ver.

## Antes de abrir o PR
- Abra a tela alterada no navegador (Playwright, com o Supabase simulado) e confira: modo claro e escuro, largura de celular, sem erro no console.
- Confira que as outras telas que usam o mesmo arquivo continuam abrindo.
- Se algo não pôde ser testado, escreva isso claramente no PR. Não afirme que testou o que não testou.
