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
- O site no ar é a branch `main`, publicada pelo GitHub Pages (ver "Site no ar" abaixo). Trabalhe na branch indicada pela sessão e publique na `main` quando o trabalho estiver testado.
- O repositório é público: arquivos `.sql` e `.md` (exceto este) não vão para o GitHub. Nunca coloque senhas, chaves secretas ou dados de clientes no código.
- Banco: Supabase, projeto "Sistema SAGA ADV´2" (id `fmoskdxgjulagedzjxxk`). Comandos que apagam ou trocam regras podem pedir aprovação que expira em 60 s; se expirar, entregue o bloco para o Dr. Victor rodar no SQL Editor.
- Teste antes de publicar: no banco, simule o usuário e desfaça tudo no fim; na tela, use o navegador (Playwright) com o Supabase simulado.
- Regra de 03/11: em toda lista de opções do sistema (menus, checklists, etiquetas, status, categorias) o administrador geral cria, renomeia, reordena e remove opções na própria tela; remover só desativa (o histórico fica).
- Segurança (04/11): a biblioteca do Supabase fica em `vendor/supabase-js-<versão>.js` (versão fixa, sem CDN com versão solta); scripts de fora só com versão exata. Rever versões e os avisos de segurança do Supabase (get_advisors) uma vez por mês.
- Regra de 04/11 (Dr. Victor): todo dado com formato (CPF/CNPJ, número do processo, telefone, CEP, valores em R$, %, datas) é formatado sozinho enquanto a pessoa digita: ninguém digita ponto, traço, barra ou vírgula de milhar. Tudo o que classifica um processo ou cliente (UF, etiquetas, status, situações, competência, tipos) é menu suspenso organizado (ordem lógica, não alfabética quando houver hierarquia), com criar/renomear/remover dentro do próprio menu para quem pode (saga_planilha.js já tem: formatar, UFS, "+ Nova opção").
- Regra de 06/11 (Dr. Victor): todo recurso novo usa os efeitos de movimento do sistema: entrada e saída suaves (abrir/fechar janelas, cartões que somem ou mudam de lugar, recolher/expandir blocos, com `window.sagaRecolher` do saga_guard.js), curva `cubic-bezier(.22,.78,.25,1)`, 200 a 420 ms, nunca troca seca. Tudo deve respeitar a chavinha "Efeitos de movimento" (localStorage `saga-movimento`='reduzido' desliga: troca na hora).
- Telas: cada tela é um `.html`; `saga_ui.js` monta a barra superior, o menu lateral, permissões e notificações; `saga_tema.css` é o tema; `ponto_calculo.js` é o cálculo do ponto (cópia fiel do Apps Script da planilha).
- Regra de 07/11 (temas): o sistema tem 2 cores de tema, Azul (padrão) e Grafite (html[data-cor="grafite"], regras no fim do saga_tema.css), cada uma com claro e escuro. Telas novas usam só as variáveis do tema (--panel, --text, --gold, --border...), nunca cores fixas; se precisar de cor fixa, acrescentar a versão Grafite no saga_tema.css. Botão "fundo = --gold" precisa de letra escura no Grafite escuro (o destaque lá é claro). Escolha em Configurações > Preferências; o administrador pode fixar a cor de um colaborador (usuarios.tema_cor_fixo, bloco 100).
- PDF (07/11): para imprimir ou salvar em PDF use `saga_pdf.js` (`SagaPdf.imprimir({titulo, subtitulo, arquivo, paisagem, paginas:[html]})`): página branca com a marca do escritório, tabelas `table.tab`, caixas `.kpis` e número da página no rodapé. Nunca `window.print()` da tela escura.
- Site no ar (08/11): desde 08/11 é o **GitHub Pages** (https://vmmadvprecatorios-bot.github.io/saga-adv-web/login_padrao_metalico.html), que publica a branch `main` (pasta raiz; `.nojekyll` publica os arquivos como estão). A Vercel (saga-adv-web.vercel.app) ficou só como reserva: o plano gratuito tem limite de ~100 publicações/dia (estourou em 08/11 e o site congelou) e não é para uso comercial; o vercel.json desliga a publicação das branches `claude/*` e `codex/*`. Supabase (Authentication > URL Configuration): Site URL e Redirect URLs já apontam para o endereço do GitHub Pages. Mesmo assim, junte as mudanças e publique na `main` poucas vezes por dia. Se o Dr. Victor não vir uma mudança: no site, Ctrl+U e procurar o `?v=` mais recente.
- Versão dos arquivos (08/11): as telas pedem os arquivos do sistema com `?v=AAAAMMDDHHMM` (saga_*.js, saga_tema.css, ponto_calculo.js), para o navegador não usar a versão antiga. A cada publicação que muda esses arquivos, troque o número em todas as telas: `python3 -c "import re,glob,time;v=time.strftime('%Y%m%d%H%M');[open(f,'w',encoding='utf-8').write(re.sub(r'((?:src|href)=\")((?:saga_[a-z_]+|ponto_calculo)\.(?:js|css))(?:\?v=\d+)?(\")',lambda m:m.group(1)+m.group(2)+'?v='+v+m.group(3),open(f,encoding='utf-8').read())) for f in glob.glob('*.html')]"`.
- Botões (08/11, Dr. Victor): TODOS os botões são finos e discretos, nada de bloco preto/azul cheio nem letra grossa. Três grupos com regra no fim do saga_tema.css: ESCOLHA selecionada (abas, filtros, Kanban/Lista, períodos: fundo translúcido da cor de destaque + contorno fino), AÇÃO principal (Novo, Salvar, Confirmar: mesmo tom translúcido, um pouco mais marcado, letra normal) e AÇÃO secundária (Editar, Atualizar, Cancelar: fundo leve, contorno leve, letra fina). No modo claro os botões ficam um tom mais escuros que o fundo; no escuro, um tom mais claros (variáveis --sb-*). Perigo (vermelho) não muda. Classe nova de botão entra na lista certa de lá. Vários "Novo X" na mesma tela viram UM botão com menu embutido (como "+ Nova nota").
- Idioma (08/11, Dr. Victor): sempre falar com ele, raciocinar e escrever tudo (mensagens, textos das telas, comentários, registros, mensagens de commit) em **português do Brasil**. Só o código em si (nomes técnicos, linguagem de programação) pode ficar em inglês. Outra língua só se ele pedir.
