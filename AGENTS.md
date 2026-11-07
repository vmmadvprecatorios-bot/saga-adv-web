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
- Regra de 06/11 (Dr. Victor): todo recurso novo usa os efeitos de movimento do sistema: entrada e saída suaves (abrir/fechar janelas, cartões que somem ou mudam de lugar, recolher/expandir blocos, com `window.sagaRecolher` do saga_guard.js), curva `cubic-bezier(.22,.78,.25,1)`, 200 a 420 ms, nunca troca seca. Tudo deve respeitar a chavinha "Efeitos de movimento" (localStorage `saga-movimento`='reduzido' desliga: troca na hora).
- Banco: Supabase. A tela só lê e grava pelo cliente já configurado nas telas; as regras de acesso ficam no banco.
- Biblioteca do Supabase: `vendor/supabase-js-2.118.0.js` (versão fixa, guardada no repositório). Não use CDN com versão solta (ex.: `@2`). Script de fora só com versão exata; atualizar versão é tarefa do Claude.

- Todo dado com formato (CPF/CNPJ, número do processo, telefone, CEP, valores em R$, %, datas) é formatado sozinho enquanto a pessoa digita. Tudo o que classifica processo ou cliente (UF, etiquetas, status, situações, competência, tipos) é menu suspenso organizado, com criar/alterar dentro do menu para quem pode. Reaproveite `SagaPlanilha.formatar` e `SagaPlanilha.UFS` (saga_planilha.js).

## Padrão visual e de movimento
- Azul-marinho, cinza e branco, modo claro e escuro, funcionando no celular.
- Toda tela ou janela nova segue o padrão de movimento do sistema (telas montam em ondas, janelas abrem com mola, botões afundam ao apertar). O `saga_guard.js` cobre a maior parte automaticamente: reaproveite, não reinvente.
- Trocar de tela mexe só no conteúdo; menus superior e lateral ficam parados. Nada pode "piscar" nem mostrar sujeira de outra tela.
- Menus e listas suspensas dentro de janelas (modais) não podem ser cortados pela janela: confira no celular e com a janela baixa; prefira que o menu empurre o conteúdo (posição normal) e role até aparecer inteiro.
- Respeite as permissões: o menu e as telas mostram só o que o perfil do usuário pode ver.
- Toda lista de opções do sistema (menus suspensos, checklists, etiquetas, status, categorias, tipos) deve deixar o administrador geral **criar, renomear, reordenar e remover** opções na própria tela. Remover nunca apaga histórico: o item some da lista (ativo = falso) e continua aparecendo onde já foi usado. Itens que a própria pessoa criou (ex.: checklist da ficha) ela mesma pode remover.

## Antes de abrir o PR
- Abra a tela alterada no navegador (Playwright, com o Supabase simulado) e confira: modo claro e escuro, largura de celular, sem erro no console.
- Confira que as outras telas que usam o mesmo arquivo continuam abrindo.
- Se algo não pôde ser testado, escreva isso claramente no PR. Não afirme que testou o que não testou.
- Temas (07/11): o SAGA tem duas cores de tema, Azul (padrão) e Grafite (`html[data-cor="grafite"]`, regras no fim do `saga_tema.css`), cada uma com claro e escuro. Telas novas usam só as variáveis do tema (`--panel`, `--text`, `--gold`, `--border`...), nunca cores fixas. Botão com fundo `var(--gold)` precisa de letra escura no Grafite escuro.
