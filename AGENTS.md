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
- Cada tela é um arquivo `.html` na raiz. Site publicado pelo GitHub Pages a partir da `main` (ver "Site no ar").
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
- Toda tela ou janela nova segue o padrão de movimento do sistema (telas montam em ondas, janelas abrem e fecham na curva do sistema, sem "mola" que passa do ponto e volta (decisão de 09/11), botões afundam ao apertar). O `saga_guard.js` cobre a maior parte automaticamente: reaproveite, não reinvente.
- Trocar de tela mexe só no conteúdo; menus superior e lateral ficam parados. Nada pode "piscar" nem mostrar sujeira de outra tela.
- Menus e listas suspensas dentro de janelas (modais) não podem ser cortados pela janela: confira no celular e com a janela baixa; prefira que o menu empurre o conteúdo (posição normal) e role até aparecer inteiro.
- Respeite as permissões: o menu e as telas mostram só o que o perfil do usuário pode ver.
- Toda lista de opções do sistema (menus suspensos, checklists, etiquetas, status, categorias, tipos) deve deixar o administrador geral **criar, renomear, reordenar e remover** opções na própria tela. Remover nunca apaga histórico: o item some da lista (ativo = falso) e continua aparecendo onde já foi usado. Itens que a própria pessoa criou (ex.: checklist da ficha) ela mesma pode remover.

## Antes de abrir o PR
- Abra a tela alterada no navegador (Playwright, com o Supabase simulado) e confira: modo claro e escuro, largura de celular, sem erro no console.
- Confira que as outras telas que usam o mesmo arquivo continuam abrindo.
- Se algo não pôde ser testado, escreva isso claramente no PR. Não afirme que testou o que não testou.
- Temas (07/11): o SAGA tem duas cores de tema, Azul (padrão) e Grafite (`html[data-cor="grafite"]`, regras no fim do `saga_tema.css`), cada uma com claro e escuro. Telas novas usam só as variáveis do tema (`--panel`, `--text`, `--gold`, `--border`...), nunca cores fixas. Botão com fundo `var(--gold)` precisa de letra escura no Grafite escuro.
- PDF (07/11): para imprimir ou salvar em PDF use `saga_pdf.js` (`SagaPdf.imprimir({titulo, subtitulo, arquivo, paisagem, paginas:[html]})`): página branca com a marca do escritório, tabelas `table.tab`, caixas `.kpis` e número da página no rodapé. Nunca `window.print()` da tela escura.
- Site no ar (08/11): desde 08/11 é o **GitHub Pages** (https://vmmadvprecatorios-bot.github.io/saga-adv-web/login_padrao_metalico.html), que publica a branch `main` (pasta raiz; `.nojekyll` publica os arquivos como estão). A Vercel (saga-adv-web.vercel.app) ficou só como reserva: o plano gratuito tem limite de ~100 publicações/dia (estourou em 08/11 e o site congelou) e não é para uso comercial; o vercel.json desliga a publicação das branches `claude/*` e `codex/*`. Supabase (Authentication > URL Configuration): Site URL e Redirect URLs já apontam para o endereço do GitHub Pages. Mesmo assim, junte as mudanças e publique na `main` poucas vezes por dia. Se o Dr. Victor não vir uma mudança: no site, Ctrl+U e procurar o `?v=` mais recente.
- Versão dos arquivos (08/11): as telas pedem os arquivos do sistema com `?v=AAAAMMDDHHMM` (saga_*.js, saga_tema.css, ponto_calculo.js), para o navegador não usar a versão antiga. A cada publicação que muda esses arquivos, rode `python3 ferramentas/versionar.py` (lê cada tela antes de reescrever e para se algo encolher). NUNCA use comando de uma linha do tipo open(f,'w').write(...open(f).read()): ele zera o arquivo antes de ler (em 08/11 isso apagou todas as telas e o site ficou em branco). Antes de publicar, confira `git diff --stat`: nada de milhares de linhas apagadas.
- Botões (08/11, Dr. Victor): TODOS os botões são finos e discretos, nada de bloco preto/azul cheio nem letra grossa. Três grupos com regra no fim do saga_tema.css: ESCOLHA selecionada (abas, filtros, Kanban/Lista, períodos: fundo translúcido da cor de destaque + contorno fino), AÇÃO principal (Novo, Salvar, Confirmar: mesmo tom translúcido, um pouco mais marcado, letra normal) e AÇÃO secundária (Editar, Atualizar, Cancelar: fundo leve, contorno leve, letra fina). No modo claro os botões ficam um tom mais escuros que o fundo; no escuro, um tom mais claros (variáveis --sb-*). Perigo (vermelho) não muda. Classe nova de botão entra na lista certa de lá. Vários "Novo X" na mesma tela viram UM botão com menu embutido (como "+ Nova nota").
- Seletores de uma opção (08/11, Dr. Victor): o botão escolhido usa a classe `active` (nunca `on` ou outra), para o destaque DESLIZAR pelo saga_guard; cantos sempre arredondados (nada de borda reta); a troca acontece na hora do clique e, se a tela for redesenhada depois de gravar, só redesenhar quando o deslize terminar (~420 ms).
- Ninguém além do administrador apaga (09/11, Dr. Victor): colaborador NÃO apaga, exclui nem remove nada no sistema, nem o que ele mesmo escreveu; pode editar, e tudo fica no registro de alterações dele (atividades_log com o valor antes e depois, bloco 128). Só o administrador geral apaga. O banco recusa sozinho (gatilhos trg_saga_trava_exclusao e trg_saga_trava_exclusao_logica, que também pegam excluido_logico = true e ativo = false; função saga_pode_excluir) e os botões de apagar somem para quem não é administrador (lista no fim do saga_tema.css; o saga_ui.js marca html.saga-pode-apagar; sagaPodeApagar()). Tabela nova com conteúdo: pôr as duas travas. Botão novo de apagar: pôr o seletor na lista. Função do banco que precisa apagar por dentro (ex.: recusar pedido da agenda): set_config('saga.exclusao_interna','sim',true) antes do delete.
- Idioma (08/11, Dr. Victor): sempre falar com ele, raciocinar e escrever tudo (mensagens, textos das telas, comentários, registros, mensagens de commit) em **português do Brasil**. Só o código em si (nomes técnicos, linguagem de programação) pode ficar em inglês. Outra língua só se ele pedir.
