/* =====================================================================
   SAGA · Manual do SAGA (POP-SAGA-001): conteúdo da tela manual.html e do PDF.
   Regra (10/11, Dr. Victor): recurso novo no sistema = atualizar este arquivo
   (capítulo, passos e, se a tela mudou, o print em manual/img), subir a versão
   e a data abaixo, acrescentar a linha em "revisoes" e gerar de novo o PDF.
   Formatação dos textos: **negrito** e [[Nome do botão]] (vira um botão desenhado).
   Prints: manual/img/<img>.jpg, tirados no sistema de teste com dados inventados;
   "marcas" explica os números desenhados no print, na ordem (1, 2, 3...).
   ===================================================================== */
window.SAGA_MANUAL = {
  codigo: "POP-SAGA-001",
  versao: "3.42",
  data: "23/11/2026",
  titulo: "Manual do SAGA",
  subtitulo: "Procedimento Operacional Padrão de uso do sistema do escritório",
  escritorio: "Victor Morais Advocacia (VMMADV)",
  aprovacao: "Dr. Victor de Medeiros Morais",
  pdf: "manual/POP_SAGA_ADV.pdf",

  revisoes: [
    { versao: "3.42", data: "23/11/2026", mudou: "**Planilhas** no menu lateral (Gestão) e como pasta de Modelos: lista de todas as planilhas (de clientes, do escritório, modelos de planilha e Planilhas Contábeis), busca e + Nova planilha. O editor abre em **tela inteira** com o botão **Voltar** e funções de planilha: caixa de nome, arrastar para preencher, ordenar, filtrar, congelar, cores da letra e do fundo, bordas, autossoma, clique direito, zoom e atalhos do Excel. Print novo no sistema simulado." },
    { versao: "3.41", data: "23/11/2026", mudou: "Teses e oportunidades: parte nova **Mapa dos servidores** (só o administrador): eventos do Portal da Transparência mês a mês com os meses em massa à parte, lista com a oportunidade de cada evento, clientes do SAGA com evento, conferência dos prováveis falecidos e exportação em CSV e PDF." },
    { versao: "3.40", data: "22/11/2026", mudou: "Modelos: a coluna da esquerda virou **uma árvore só**, como o explorador de arquivos: **Arquivos** > Petições (áreas e subpastas), Contestações (por tese), Papéis timbrados e as pastas da antiga Biblioteca; nomes inteiros, setinha para abrir e fechar, **busca única** em modelos, contestações e arquivos; no celular a árvore abre e fecha no alto. Print novo no sistema simulado." },
    { versao: "3.39", data: "22/11/2026", mudou: "Agenda: a parte **Ver a agenda no celular** ganhou o print (janela Agenda no celular, no sistema simulado) e as marcas; o aviso no sino 30 minutos antes vale também para cada data de um compromisso que se repete." },
    { versao: "3.38", data: "22/11/2026", mudou: "Ficha: parte nova **Linha do tempo do processo** (tudo o que aconteceu no processo numa lista: filtros por tipo, Só o importante, busca e Ver mais). Prints novos no sistema simulado: ficha (3 cartões e contatos; blocos e cartões Processo/Painel lateral; janela Criar pastas; janela Ler consulta com as miniaturas dos prints), Minhas Tarefas (quadro, menu de etiquetas e o botão **Filtros no celular**, parte nova), Captação (topo e lista com Por captador, Sem captador, Alterar… e Captador anterior), Painel geral (com Mais números recolhido) e Financeiro (aba Distribuição). Os prints agora aparecem inteiros, sem corte, também os de celular." },
    { versao: "3.37", data: "22/11/2026", mudou: "Manual em dia com as novidades de 19 a 21/11: capítulo **Para aprovar** refeito (Luísa e Renata; Pedidos para a Renata com Pode fazer, Depois e Não fazer e o Plano da peça; Ler e corrigir, Ver como vai sair, revisão da Luísa com o selo Revisada, Aprovar e Protocolei; Recados e Relatório em PDF; **Autos para baixar**); ficha em **3 cartões** (Cliente, Processo, Painel lateral) com o código para copiar; **Fazer petição** lendo os documentos do cliente; **Cálculo do PSS** lendo requisitório, espelho e demonstrativo (de onde veio cada dado; SELIC); **Planilhas e textos do SAGA**, **Editor de planilhas** e **Planilhas do PSS**; **Modelos** (petições, timbrados e arquivos; pastas; + Novo modelo, Importar pasta de petições, editor e A revisar); **Distribuição dos honorários** (Equipe e Jurídico) e **Meus honorários**; Minhas Tarefas (etiqueta Dar impulso processual, tarefa Manutenção: completar dados, botão Filtros no celular); Intimações (linha da Luísa com o prazo em dias úteis, Prazo vencendo, repetida CNJ × e-mail); Captação (Alterar…, Sem captador, Captador anterior, gráfico Por captador; passagem sozinha para o Jurídico; pré-validados do prêmio); Chat (grupo Recebimento de documentação); login (**Manter conectado**; login diário); botão **?** de ajuda; PDF com texto para selecionar e copiar; Painel geral (Mais números recolhido); SAGA no Claude (ferramentas novas); Saúde do sistema e Armazenamento; permissões novas. Prints novos no sistema simulado." },
    { versao: "3.36", data: "21/11/2026", mudou: "Agenda: **Ver no celular** (link pessoal para o Google Agenda e o iPhone, só leitura, com lembrete; Gerar link novo / Desligar) e aviso no **sino 30 minutos antes** de cada compromisso." },
    { versao: "3.35", data: "21/11/2026", mudou: "Preferências em **abas**: Aparência (tema, cor e letra), Vidro (só com cor de vidro), Tela (efeitos, cadeado, tela inicial e as escolhas que acompanham a conta), Avisos e sons e, para o administrador, Equipe (cores da equipe). A aba escolhida fica lembrada." },
    { versao: "3.34", data: "21/11/2026", mudou: "Ficha do cliente: **Telefones, E-mails e Endereços** do topo abrem e recolhem cada um pelo título (com a contagem; fechado mostra só o principal), [[Recolher todos]]/[[Abrir todos]], lembrado na sua conta. Botão [[Ler consulta (PDF ou print)]] no topo: a leitura preenche os contatos do alto da ficha (\"Não validado\") e a Localização sem repetir o que já existe, e anota um resumo no processo; o arquivo não é guardado." },
    { versao: "3.33", data: "19/11/2026", mudou: "Gráficos: padrão único para todos, **Metal escovado** (rosca como sempre e as cores do tema). O quadro Gráficos saiu das Preferências." },
    { versao: "3.32", data: "19/11/2026", mudou: "Gráficos: a escolha de Preferências > Gráficos passa a valer em TODAS as telas, inclusive Intimações e as planilhas do Jurídico e da Captação, e em qualquer gráfico novo. As três escolhas ficam em caixas numeradas. O SAGA confere sozinho se há versão nova e recarrega a tela (ou avisa Atualizar agora)." },
    { versao: "3.31", data: "19/11/2026", mudou: "Preferências > **Gráficos** reorganizado: cartões coloridos com a prévia de cada acabamento, formato da rosca e cores das fatias lado a lado, e o botão **Aplicar no sistema** (antes a escolha valia sem botão e parecia não ter efeito)." },
    { versao: "3.30", data: "19/11/2026", mudou: "Preferências: novo quadro **Gráficos** com seis acabamentos para as roscas e barras (Como hoje, Metal escovado, Cromo polido, Esmalte com friso, Vidro metalizado, Titânio acetinado), formato da rosca (Como hoje ou Premium) e cores das fatias (Tons do tema ou Cores variadas). Cada pessoa escolhe o seu." },
    { versao: "3.29", data: "19/11/2026", mudou: "Preferências: botão **Usar as escolhas deste aparelho em todos** (manda para a conta tudo o que está neste aparelho, inclusive a foto de fundo). Conserto: quando o celular abria primeiro, cada aparelho ficava com as escolhas antigas dele; agora, nas escolhas antigas, vale a do computador." },
    { versao: "3.28", data: "19/11/2026", mudou: "AS ESCOLHAS ACOMPANHAM A CONTA: tema claro/escuro, cor, fundo do Vidro e a **foto de fundo**, fundo animado, efeitos de movimento, grupos do menu, blocos da ficha e as visões das telas valem em qualquer aparelho (entrar pelo celular ou por outro computador mostra igual; a última mudança vence). Ficam só no aparelho: menu recolhido do computador, largura das colunas e o modo da planilha no celular." },
    { versao: "3.27", data: "19/11/2026", mudou: "Vidro: fundo novo **Limpo** (só a cor do tema, sem desenho). Fundos animados: saíram Planeta e aurora, Radar holográfico, Horizonte neon e Túnel de luz; ficam Brasas, Rede, Circuito, Chuva de código, Viagem pelas estrelas, Galáxia e Constelações." },
    { versao: "3.26", data: "19/11/2026", mudou: "Vidro: 8 fundos animados novos em Preferências > Fundo animado: Chuva de código, Viagem pelas estrelas, Galáxia, Planeta e aurora, Radar holográfico, Horizonte neon, Constelações e Túnel de luz, na cor do tema; o Circuito de luz passou a mostrar todos os pulsos." },
    { versao: "3.25", data: "19/11/2026", mudou: "Tela nova Meu dia > PARA APROVAR (Escritório de agentes): o Agente: Triagem classifica o que chega (intimações, andamentos do CNJ, pedidos) com o prazo em dias úteis e o Agente: Manutenção entrega o relatório do dia; o Dr. Victor e a Hevelyn aprovam, mandam ajustar ou reprovam; aprovar cria a tarefa. Regras do Escritório de agentes (nada sai para fora sem aprovação; o agente para na assinatura; senhas só no Chrome/Google)." },
    { versao: "3.24", data: "19/11/2026", mudou: "CORES NOVAS: grupo **Paletas** em Preferências > Cor do tema, com 8 cores tiradas das paletas que o Dr. Victor escolheu: Rubi, Bordô, Ouro, Lima, Aço, Marsala, Café e Mel, cada uma em Normal e Vidro, no claro e no escuro. Começam liberadas só para o administrador (ele libera para a equipe em Cores da equipe)." },
    { versao: "3.23", data: "19/11/2026", mudou: "Ficha do cliente ORGANIZADA E RETRÁTIL: cada bloco (Processo, Dados do processo, Recursos, Andamentos do CNJ, Checklists, Atendimentos, Comentários, Retorno, Partes, Responsável, Pastas, Tarefas, Pagamentos, Notas, Ações...) abre e recolhe pelo título, com um resumo quando fechado; [[Abrir tudo]] e [[Recolher tudo]]; Colunas: As duas, Só a do meio ou Só a lateral (a que fica ocupa a largura toda); [[Organizar blocos]]: o que aparece, a ordem e a coluna de cada bloco. Tudo lembrado neste navegador; o cartão de cima com o nome fica sempre fixo. MODO CLARO COM A COR: no claro, fundo, painéis e menu ficam tingidos da cor do tema (cada cor bem diferente da outra) e o claro inverte o escuro: a barra de cima fica escura na cor do tema e o menu lateral fica claro, com a letra escura." },
    { versao: "3.22", data: "19/11/2026", mudou: "TELA DE ENTRADA NOVA (Vidro tecnológico, escolhida pelo Dr. Victor): cartão de vidro com a rede de pontos de luz no fundo, botão Entrar, Mostrar a senha, Entrar com o Google, Esqueci a senha e o erro à vista acima do botão. Nenhuma tela do sistema aparece antes de o login ser conferido (aviso \"Conferindo o seu login…\"). Com uma janela aberta, a tela de trás não rola." },
    { versao: "3.21", data: "19/11/2026", mudou: "Ficha do cliente: parte nova PAGAMENTOS E PARCELAS (honorários parcelados, acordo, pensão; cliente com ou sem processo). Pagou A MENOS: somar a diferença na próxima parcela, criar uma parcela só com a diferença ou dar desconto (com motivo). Pagou A MAIS: abater das próximas ou das últimas parcelas. Desmarcar desfaz. Extrato em PDF de cada pagamento." },
    { versao: "3.20", data: "18/11/2026", mudou: "NÚMEROS NO MENU: cada item mostra quantas coisas esperam por você (Minhas Tarefas, Intimações de hoje, Agenda, Pedidos do Saga IA, Notas compartilhadas, Teses e oportunidades, Relatórios a preparar, Pedidos de busca, Chat e, para o administrador, Sugestões novas); vermelho = pede ação; grupo fechado mostra a soma; com o menu recolhido o número fica em cima do ícone. CHAT: @ vermelho na conversa em que você foi marcado, abas Não lidas e Marcações, e a conversa abre na mensagem que marcou você. SONS em Configurações > Preferências > Sons (mensagem nova e marcação ligados; intimação nova e aviso urgente desligados; volume; botão para ouvir)." },
    { versao: "3.19", data: "18/11/2026", mudou: "Tela nova Processos > RELATÓRIOS: pedir o relatório processual do cliente, acompanhar (pedido, em preparação, pronto, enviado ao cliente) e ver na hora QUANDO foi o último relatório enviado, em verde, amarelo ou vermelho; o relatório fica na pasta \"Relatórios processuais\" da ficha e aparece nos dois lugares; na ficha, o quadro Relatórios em cada processo; avisos no sino; o Claude (SAGA no Claude) também consulta e registra." },
    { versao: "3.18", data: "17/11/2026", mudou: "Minhas Tarefas: passar o mouse no cartão não aumenta mais o cartão nem empurra os outros; tipo, quem passou a tarefa, compartilhamento e os atalhos Ficha e Intimações ficam na janela da tarefa (clique no cartão)." },
    { versao: "3.17", data: "17/11/2026", mudou: "Teses e oportunidades: botão [[Editar público]] no cartão de cada tese abre uma janela só com o público (quem tem direito, esfera, pessoa, situação, órgão, cargo, UF, anos, o que precisa ter, quem não pode, prazo); nos cartões, \"PF\" e \"PJ\" agora aparecem como \"Pessoa física\" e \"Empresa\" (para não confundir com Polícia Federal)." },
    { versao: "3.16", data: "17/11/2026", mudou: "Teses e oportunidades: a Prateleira recebeu a planilha de produtos do escritório (84 produtos; ideias sem material como \"Ideia\"); cada cartão mostra a Classificação (viabilidade, ticket, escalável), as páginas do site e a pasta no Google Drive, com os links do áudio, vídeo, mapa mental, slides e resumo do NotebookLM; \"Organizar opções\" edita também viabilidade, ticket e escalável." },
    { versao: "3.15", data: "17/11/2026", mudou: "PAINEL GERAL (o Dashboard renomeado, 1º item do menu): prazo fatal nos próximos 5 dias, atrasados e para hoje; faixa dos robôs (administrador); cartões de Meu dia, Intimações, Jurídico, Captação, Dinheiro, Prêmio e Equipe que levam à lista certa; produtividade por pessoa. MENU reorganizado (Meu dia primeiro; nomes curtos; Precatórios em Processos; Editor de PDF em Gestão; itens novos Relatórios, Parceiros e Modelos). Tela nova PARCEIROS (ANCREF, Sarmento e quem indica)." },
    { versao: "3.14", data: "17/11/2026", mudou: "Ficha do cliente: cada aba de processo mostra só os documentos DAQUELE processo; documento PESSOAL (RG, CPF, comprovante, certidão...) é marcado pelo botão do cartão de identidade ao lado do documento, com o dono (cliente ou herdeiro/parte), e aparece no quadro \"Documentos pessoais\" de toda aba em que essa pessoa é parte; [[Puxar de outra pessoa]] traz para a aba os documentos pessoais de outra pessoa da ficha sem copiar o arquivo; [[Tirar desta aba]] só desfaz a ligação." },
    { versao: "3.13", data: "17/11/2026", mudou: "Cores em dobro: cada cor tem a versão Normal e a versão Vidro, escolhida dentro do cartão (Clássicos, Tecnológicos e Campanhas); cor nova Ônix (preto e cinza); no Vidro, fundo animado (Brasas de neon, Rede de dados, Circuito de luz) com intensidade e velocidade." },
    { versao: "3.12", data: "17/11/2026", mudou: "Ficha do cliente: [+ Pasta] abre a janela Criar pastas, com uma caixa de marcar em cada pasta pré-pronta (Documentos pessoais, Documentos processuais, Petições, Requisitório, Planilhas, Relatórios, Relatórios processuais, Outras): cria só as marcadas e a que já existe aparece \"já existe\"; pasta livre na mesma janela; o administrador organiza a lista ali mesmo. Leitura da consulta (Lemit, Data Solution) também por PRINT da tela: cole com Ctrl+V (ou solte a imagem), vários prints de uma vez, na ficha > Localização e em Pedidos de busca; os prints não são guardados." },
    { versao: "3.11", data: "17/11/2026", mudou: "CADEADO na barra de cima (trava contra voltar sem querer: travado, o botão de voltar do mouse e a seta do navegador não saem da tela; automático depois de 20 segundos, manual ou desligado em Preferências); VOLTAR SEM PERDER OS FILTROS em Minhas Tarefas, nas planilhas do Jurídico e da Captação e em Intimações (abrir pelo menu continua limpo); \"Pedidos do Claude\" passou a se chamar \"Pedidos do Saga IA\"." },
    { versao: "3.10", data: "17/11/2026", mudou: "Teses e oportunidades: botão \"Mostrar gráficos\" nas abas Atualizações, Prateleira e Radar (barras por situação, área, esfera e pessoa, para quem, material, tipo, impacto, por tese e por mês; clicar numa barra filtra a tela); o cartão de cada tese abre organizado (resumo em destaque, prazo e \"quem não pode\" em destaque, público, vídeos e anexos ao lado, \"+ Anexar documento\"); cada tese tem a sua cor." },
    { versao: "3.9", data: "17/11/2026", mudou: "Ponto > Acessos: internet (IP) autorizada fica liberada de vez para toda a equipe, sem pedido nem aviso, em qualquer computador; o \"Autorizar só hoje\" saiu; autorizar uma internet resolve os outros pedidos dela; as entradas do administrador nunca geram aviso; \"Tirar autorização\" da internet na mesma tela." },
    { versao: "3.8", data: "17/11/2026", mudou: "Teses e oportunidades: cada produto da Prateleira ganhou o PÚBLICO DA TESE (esfera federal/estadual/municipal, pessoa física ou empresa, situação, órgão, cargo, UF, anos de ingresso e de aposentadoria, \"aposentado há menos de N anos\", idade, o que precisa ter, quem não pode, prazo e onde achar), explicação completa e vídeos, áudios e links (Drive, YouTube, NotebookLM); filtros por esfera e por pessoa física/empresa; \"Achar clientes para uma tese\" já abre Clientes por perfil com o público da tese aplicado (\"Tirar o público da tese\" volta ao que era)." },
    { versao: "3.7", data: "16/11/2026", mudou: "Nova tela Comunicação > Normas e prêmio: Normas da Captação, Como funciona o Prêmio da Captação (níveis, platô, plus, peso da tese, prêmio cruzado, meta da equipe), Meu progresso com a barra até o platô, Validar (Dr. Victor e Hevelyn) e Painel geral com fechamento do mês e PDF." },
    { versao: "3.6", data: "16/11/2026", mudou: "Editor de PDF refeito: tela inicial com todas as funções em cartões; Word para PDF, Imagens para PDF e PDF para imagem no próprio computador; Comprimir corrigido (antes podia AUMENTAR o arquivo: agora o texto continua texto e, se não diminuir, avisa e fica o original); depois de cada operação: Guardar na pasta do cliente (escolhendo cliente, processo e pasta), Baixar, Compartilhar (aplicativo ou link do SAGA com prazo) e Fazer outra operação com este arquivo." },
    { versao: "3.5", data: "14/11/2026", mudou: "Disparos de e-mail v2: três identidades (VMM, ANCREF, Sarmento) com logo e assinatura certa (ANCREF sempre em nome da instituição), caixa e modelo da mesma identidade, botão \"Não quero mais receber estes e-mails\" de 1 clique, linha de prévia, quadro \"Seu processo\", próximo passo, aviso antigolpe, como funciona, perguntas rápidas e transparência; pastas Pesquisa > Busca e Espelhos do TRF criadas sozinhas na ficha." },
    { versao: "3.4", data: "14/11/2026", mudou: "Disparos de e-mail: o e-mail sai bonito (faixa com a marca, destaque, botões Falar no WhatsApp e Responder, assinatura e rodapé), com IDENTIDADES (VMM, ANCREF...); anexo do espelho do tribunal achado sozinho na pasta do cliente (ou documentos escolhidos na ficha); Enviar um teste para mim; resultado do Rodar agora à vista e Enviar agora mesmo (administrador); disparos todos os dias; o código do cliente não vai mais no e-mail." },
    { versao: "3.3", data: "14/11/2026", mudou: "Situação da ação \"Protocolar novamente\" (processo extinto que precisa de novo protocolo): tarefa automática para o responsável e atalho \"Protocolar novamente (N)\" na planilha do Jurídico." },
    { versao: "3.2", data: "14/11/2026", mudou: "Menu da esquerda: os grupos (Processos, Meu dia, Comunicação, Gestão, Administração) também abrem e fecham com o menu recolhido (a linha fina com a setinha) e com o menu aberto por cima pelo mouse." },
    { versao: "3.1", data: "14/11/2026", mudou: "SAGA no Claude: guardar na pasta do cliente o documento que você passa ao Claude na conversa (o Claude manda um link do SAGA; você toca, escolhe o arquivo no celular ou no computador e ele cai direto na ficha, na pasta certa)." },
    { versao: "3.0", data: "14/11/2026", mudou: "Tela nova Disparos de e-mail (menu Processos): escolher clientes, pôr na fila e o SAGA manda sozinho o e-mail com o modelo da tese, pelos remetentes cadastrados (Gmail, Locaweb, Hostinger...), com limite por manhã e por tarde; erros com o motivo, \"Não enviar mais\" e o bloco E-mails enviados na ficha do cliente." },
    { versao: "2.9", data: "14/11/2026", mudou: "Ficha: \"Organizar campos\" em Dados do Processo (escolher quais campos ficam à vista e em que ordem; cada um salva a sua, o administrador salva o padrão do escritório; uma para o Jurídico e outra para a Captação); Andamentos no tribunal (CNJ) mostram só os 2 mais recentes, o resto em Ver todos." },
    { versao: "2.8", data: "14/11/2026", mudou: "Biblioteca: Timbrados e modelos. Os papéis timbrados da Victor Morais Advocacia, da ANCREF e da Sarmento ficam guardados no SAGA, e os modelos de petição geram o Word e o PDF já no papel timbrado, no Padrão VMM, aqui no próprio computador." },
    { versao: "2.7", data: "14/11/2026", mudou: "Minhas Tarefas e Intimações: o número do processo fica sempre à vista no cartão (não só ao passar o mouse), com pontos e traço, e o Ctrl+F do navegador acha o processo pelo número; a etiqueta continua sempre à vista." },
    { versao: "2.6", data: "14/11/2026", mudou: "Jurídico: botão \"Sem número CNJ (N)\" (processos ativos sem número válido, para completar um por vez) e o selo \"número inválido\" na célula; Captação: lotes semanais com meta (\"Meu lote\" com a meta do dia para cada localizador; para o administrador, o quadro Lotes da Captação com configurar, entregar e desfazer)." },
    { versao: "2.5", data: "14/11/2026", mudou: "Minhas Tarefas: o administrador muda a ordem das etiquetas pelas setinhas do menu; os botões Dar impulso processual e Pedidos do Claude ficam só no menu de etiquetas; a situação da tarefa volta a aparecer no cartão. Notas: as etiquetas ficam sempre à vista, também na lista do celular." },
    { versao: "2.4", data: "14/11/2026", mudou: "Minhas Tarefas mais organizada: números, gráficos e calendário recolhidos em \"Mostrar resumo\"; uma barra de filtros (Busca, Etiqueta, Responsável, Prazo e \"Mais filtros\"); menu de etiquetas sempre à vista, com a quantidade de tarefas abertas, os atalhos Dar impulso processual e Pedidos do Claude e, para o administrador, criar, renomear, mudar a cor e tirar etiqueta da lista; cartão mais limpo (o resto aparece ao passar o mouse)." },
    { versao: "2.3", data: "13/11/2026", mudou: "SAGA no Claude liberado para toda a equipe: passo a passo para ligar o conector no seu Claude (cada um com o próprio login e as próprias permissões)." },
    { versao: "2.2", data: "13/11/2026", mudou: "Tela nova Editor de PDF (menu Processos): juntar, separar, tirar, girar e reordenar páginas, numerar, escrever texto, tapar área e reduzir o tamanho, tudo no próprio computador (o arquivo não vai para nenhum site); na ficha, o PDF guardado abre no editor e o resultado volta como documento novo." },
    { versao: "2.1", data: "12/11/2026", mudou: "Tela nova Precatórios e RPV (menu Gestão): situação do requisitório de cada processo do Jurídico, aviso de pagamento liberado e dinheiro a entrar por mês e por ano; colunas novas do requisitório na planilha do Jurídico." },
    { versao: "2.0", data: "12/11/2026", mudou: "Cores novas do tema: Novembro Azul, Rosa (Outubro Rosa) e Natal, cada uma com claro e escuro; Tema do mês: o administrador liga e o SAGA troca a cor da equipe sozinho no mês de cada campanha." },
    { versao: "1.9", data: "12/11/2026", mudou: "Jurídico: selo \"sem resumo\" no nome do cliente e o filtro \"Sem resumo do agente\"; Intimações: a janela mostra o resumo do agente (situação, próximo passo, prazo e última movimentação) e avisa quando a intimação é mais nova que o resumo." },
    { versao: "1.8", data: "12/11/2026", mudou: "Menu da esquerda em cinco grupos (Processos, Meu dia, Comunicação, Gestão e Administração), com os nomes sempre numa linha; menu da foto só com Meu perfil, Preferências, Segurança e Sair (o Manual e as Sugestões ficam no menu da esquerda); Minhas Tarefas com o atalho \"Dar impulso processual\"; Dashboard com os processos parados e os processos sem o resumo do agente que abrem a lista e a ficha." },
    { versao: "1.7", data: "11/11/2026", mudou: "Cliente repetido: ao cadastrar, o SAGA procura ficha com o mesmo CPF, o mesmo nome ou nome parecido e abre a janela \"Essa pessoa já tem ficha?\" (\"Usar esta ficha\"); mesmo CPF não cria outra; ficha separada só com o motivo escrito." },
    { versao: "1.6", data: "11/11/2026", mudou: "Minhas Tarefas: o atalho do tribunal (copia o número e abre o processo no site do tribunal) fica à vista no cartão, na Lista e na janela da tarefa (\"Site do tribunal\"), como nas Intimações." },
    { versao: "1.5", data: "11/11/2026", mudou: "Ponto: aba Acessos e coluna \"Entrou no sistema\" (só o administrador), com o aviso no sino na primeira entrada do dia de cada colaborador." },
    { versao: "1.4", data: "11/11/2026", mudou: "Chat Interno: em \"+ Nova conversa ou grupo\", a lista dos colegas já aparece aberta para escolher (uma pessoa na conversa direta; várias no grupo)." },
    { versao: "1.3", data: "11/11/2026", mudou: "Minhas Tarefas: coluna sempre do tribunal do processo, coluna \"Automática\", colunas sem tarefa aberta ficam ocultas (linha \"Mostrar\"), etiqueta do estado e botão do tribunal no cartão, janela da tarefa em duas partes. Intimações: Justiça Federal na coluna do TRF com a etiqueta do estado, tribunais sem intimação aberta ocultos, link de cada seção do e-Proc. Primeiros passos: o menu da esquerda fica no lugar ao trocar de tela." },
    { versao: "1.2", data: "11/11/2026", mudou: "Manual com capítulos e partes que abrem e fecham e índice que recolhe; Sugestões de melhoria em Cartões, Kanban e Lista, com filtros de situação e de quem sugeriu; Treinamentos: o administrador exclui." },
    { versao: "1.1", data: "10/11/2026", mudou: "Teses e oportunidades: botão \"Achar clientes para esta tese\"; Clientes por perfil abre já filtrado pela tese." },
    { versao: "1.0", data: "10/11/2026", mudou: "Primeira versão: todas as telas e regras do SAGA até esta data." }
  ],

  pop: {
    objetivo: "Padronizar o uso do SAGA por toda a equipe: onde cada informação fica, como cada tarefa é feita no sistema e quais são as regras do escritório que o sistema segue. Quem seguir este procedimento trabalha do mesmo jeito que os colegas, e o Dr. Victor encontra tudo no mesmo lugar.",
    aplicacao: "Vale para todas as pessoas que usam o SAGA (administração, Jurídico, Captação, Administrativo, Marketing, estagiários e Diretoria), em qualquer computador ou celular. Os capítulos dizem quem usa cada tela; alguma tela pode não aparecer no seu menu porque depende de permissão.",
    responsabilidades: [
      ["Administrador geral (Dr. Victor)", "Aprova este POP e as mudanças nele; libera e retira permissões; é o único que apaga ou exclui qualquer coisa no sistema; cuida das listas de opções (menus), dos colaboradores e das configurações do escritório."],
      ["Jurídico", "Mantém os processos do Jurídico em dia: ficha, situação, etiquetas, prazos, intimações, tarefas, recursos e comentários."],
      ["Captação", "Cuida da lista da Captação: localizar e contatar clientes, registrar cada contato, andar com as etapas do funil e cadastrar os processos novos."],
      ["Administrativo", "Atende os pedidos de busca (Lemit, Data Solution), cuida das cartas e apoia a equipe nos cadastros."],
      ["Marketing", "Envia artes e vídeos para aprovação, cuida das campanhas e da origem dos clientes."],
      ["Todos", "Bater o ponto; registrar no SAGA tudo o que fizer com o cliente ou com o processo (nada fica só no WhatsApp ou de cabeça); manter a senha em segredo; avisar o administrador quando algo estiver errado ou faltar acesso."]
    ],
    definicoes: [
      ["SAGA", "O sistema do escritório. Abre no navegador (Chrome, Edge) pelo endereço que o administrador passou."],
      ["Ficha do cliente", "A página de uma pessoa: dados, telefones, endereços, processos, localização, documentos, conversas e histórico."],
      ["Processo", "Cada ação ou possibilidade de ação de um cliente. Um cliente pode ter vários processos (ex.: PSS e PASEP)."],
      ["Fase", "Onde o processo está no escritório: **Captação** (ainda não fechou com o escritório) ou **Jurídico** (contratado: protocolar e acompanhar)."],
      ["Etapa do funil", "Em que ponto da conversa com o cliente da Captação o processo está (Não iniciado, Localizando, Em contato...)."],
      ["Situação da ação", "Como o processo está na Justiça (ex.: Protocolada, Sentença, Encerrada)."],
      ["Etiqueta", "Marca curta e colorida para achar e filtrar processos (ex.: Requisitório OK)."],
      ["Intimação", "Publicação do tribunal (Diário eletrônico ou e-mail do tribunal) que chega sozinha no SAGA."],
      ["Andamento do CNJ", "Movimento do processo no tribunal (despacho, sentença, RPV...), trazido sozinho pelo SAGA da base pública do CNJ."],
      ["Recurso", "Agravo, apelação, embargos e outros. Ficam DENTRO do processo de onde saíram; não viram processo novo."],
      ["Tarefa", "Algo a fazer, com responsável e prazo. Pode ser pessoal ou ligada a um processo."],
      ["Sino", "O sininho no alto da tela: avisos que são para você (menções, tarefas, intimações, pedidos...)."],
      ["Permissão", "O que cada pessoa pode ver e fazer. Quem libera é o administrador, no Painel de permissões."],
      ["Registro de atividades", "Lista de tudo o que foi feito no SAGA: quem, quando e o que mudou (valor antes e depois)."]
    ],
    regras: [
      "**Só o administrador apaga.** Colaborador não apaga, não exclui e não remove nada (nem o que ele mesmo escreveu). Errou? Edite. Toda edição fica no Registro de atividades, com o valor antes e depois.",
      "**Tudo no sistema.** Contato com cliente, conversa, prazo, documento pedido, decisão: registre na ficha (contato, comentário, tarefa). O que não está no SAGA não aconteceu.",
      "**Não digite pontos, traços nem barras.** CPF, CNPJ, número do processo, telefone, CEP, valores em R$, % e datas se formatam sozinhos enquanto você digita.",
      "**Use os menus.** UF, etiquetas, situações, tipos e categorias são escolhidos no menu. Falta uma opção? Quem pode cria no próprio menu ([[+ Nova opção]]); quem não pode pede ao administrador. Remover uma opção só a tira do menu: o histórico continua.",
      "**Sigilo e dados pessoais (LGPD).** Guarde só o que o trabalho precisa. Renda, score, consumo, veículos e empresas das consultas de busca NÃO entram no SAGA. Processo em sigilo só aparece para quem tem permissão. Para gravar a tela ou mostrar a alguém de fora, ligue o **modo privacidade** (o olho no alto da tela).",
      "**Senha é pessoal.** Não empreste o seu acesso nem anote a senha em papel. Ao sair do computador, use [[Sair do sistema]] no menu da foto.",
      "**Ponto todo dia.** Bata a entrada, as pausas e a saída no Ponto. Esqueceu? Faça a justificativa no mesmo dia.",
      "**Documentos dos clientes.** Hoje ficam no Google Drive do escritório. Quando o sistema estiver pronto para isso, irão para as pastas de cada cliente no SAGA (o administrador avisa).",
      "**Viu algo errado ou tem uma ideia?** Use **Sugestões de melhoria** (menu da esquerda, em Comunicação). Não mude o jeito de trabalhar por conta própria."
    ]
  },

  capitulos: [
    /* ----------------------------------------------------------------- */
    { id: "inicio", titulo: "Primeiros passos", quem: "Todos",
      resumo: "Entrar no sistema, conhecer a tela, achar qualquer cliente pela busca, ver os avisos e ajustar o SAGA do seu jeito.",
      secoes: [
        { id: "entrar", titulo: "Entrar no sistema",
          quando: "Quando o colaborador começa o dia ou abre o SAGA num computador novo.",
          passos: [
            "Abra o endereço do SAGA no navegador (Chrome ou Edge).",
            "Digite o seu **e-mail** e a sua **senha** (o **Mostrar** ao lado da senha deixa ver o que foi digitado).",
            "**Manter conectado**: marque a caixinha só no SEU computador ou celular. Para o administrador e para quem é liberado do login diário, o SAGA não sai mais sozinho por tempo sem uso naquele aparelho (só pelo Sair ou por \"Sair de todos os aparelhos\"). Para os outros colaboradores continuam as regras do escritório (saída às 20h e 30 minutos sem uso fora do horário).",
            "Clique em [[Entrar]]. O SAGA abre sempre no **Ponto**: aproveite e bata o ponto. Quem usa o e-mail do Google pode clicar em **Entrar com o Google**.",
            "Se algo estiver errado (e-mail ou senha que não conferem, sem internet), o motivo aparece em vermelho logo acima do botão.",
            "Esqueceu a senha? Clique em **Esqueci a senha**, confira o e-mail e siga o link que chega (veja também o spam)."
          ],
          img: "login",
          marcas: ["E-mail de acesso.", "Senha (pessoal, não empreste; Mostrar deixa ver o que foi digitado).", "Manter conectado (só no seu aparelho).", "Entrar.", "Esqueci a senha: manda o e-mail para criar uma senha nova."],
          dicas: ["Primeiro acesso: você recebe um convite por e-mail do administrador. Abra o link, crie a senha e preencha os seus dados."],
          atencao: ["O administrador pode limitar o acesso por horário e por local. Fora do combinado, o SAGA avisa e não deixa entrar.", "Se ficar muito tempo parado, o SAGA sai sozinho por segurança: é só entrar de novo.", "Nunca marque **Manter conectado** em computador de outra pessoa ou de uso público.", "Nenhuma tela do sistema aparece antes de o login ser conferido. Se a internet estiver lenta ao abrir, aparece só \"Conferindo o seu login…\" (e o motivo, se não conseguir): espere ou clique em \"Ir para a tela de entrada\"."]
        },
        { id: "tela", titulo: "Conhecer a tela",
          quando: "Para se localizar em qualquer tela do SAGA: a barra do alto e o menu da esquerda são sempre os mesmos.",
          passos: [
            "No **menu da esquerda**, no alto, fica o **Painel geral** (a visão do escritório inteiro). Abaixo, as telas em grupos que abrem e fecham: **Meu dia** (Ponto, Minhas Tarefas, Intimações, Agenda, Pedidos do Saga IA, Para aprovar, Notas, Meus honorários), **Processos** (Jurídico, Captação, Precatórios e RPV, Clientes por perfil, Teses e oportunidades, Relatórios, Parceiros, Pedidos de busca, Autos para baixar, Cartas, Disparos de e-mail), **Gestão** (Financeiro, Marketing, Colaboradores, Modelos, Editor de PDF), **Comunicação** (Chat, Normas e prêmio, Treinamentos, Manual, Sugestões) e **Administração** (só o administrador). Só aparece o que você tem permissão para ver. Clique no nome do grupo para abrir ou fechar; com o menu **recolhido** (só os ícones), cada grupo vira uma linha fina com a setinha, que também abre e fecha o grupo. A escolha fica guardada neste navegador.",
            "No alto, da esquerda para a direita: o botão do menu, a **busca**, quem está online, o **sino**, o **cadeado** (trava contra voltar sem querer), o **olho** (modo privacidade), atualizar, o **?** (ajuda), o **tema** (claro ou escuro) e a sua **foto**.",
            "**Ajuda da tela**: o botão **?** no alto (ou as teclas Shift + ?) abre este Manual já na parte da tela em que você está. Ctrl+clique abre o Manual em outra aba.",
            "Os números ao lado dos itens do menu (Agenda, Minhas Tarefas, Chat) mostram o que há para hoje ou o que não foi lido.",
            "O menu da esquerda **fica no lugar** quando você troca de tela (não volta para o topo). Com o mouse em cima dele, a roda do mouse rola só o menu, sem mexer na página."
          ],
          img: "topo",
          marcas: ["Abre e fecha o menu da esquerda (no celular, o menu fica escondido aqui).", "Busca: cliente, CPF, processo, telefone, e-mail ou endereço.", "Sino: os seus avisos.", "Olho: modo privacidade (esconde nomes, CPF, números e valores para gravar a tela). Ao lado dele fica o cadeado (trava contra voltar sem querer).", "Tema claro ou escuro.", "Sua foto: menu com perfil, preferências, sugestões e sair."]
        },
        { id: "busca", titulo: "Achar um cliente ou processo pela busca do alto",
          quando: "Quando o colaborador recebe uma ligação, uma mensagem ou um documento e precisa achar a ficha rápido.",
          passos: [
            "Clique na busca do alto (ou aperte a tecla / em qualquer tela).",
            "Digite o que você tem: parte do **nome**, o **CPF**, o **número do processo**, o **telefone** (com ou sem DDD e o 9), o **e-mail** ou o **endereço** (rua, CEP).",
            "Escolha o resultado. O grupo **Achado em contatos e anotações** mostra onde a informação apareceu (Localização, histórico de contato ou comentário) e abre a ficha na parte certa."
          ],
          img: "busca_topo",
          marcas: ["Busca do alto com os resultados agrupados."],
          dicas: ["Telefone: basta digitar os últimos 8 números.", "A busca só mostra o que você já pode ver no sistema."]
        },
        { id: "sino", titulo: "Ver os avisos do sino",
          quando: "Sempre que o número vermelho aparecer no sino: alguém mencionou você, chegou tarefa, intimação, pedido de busca, sugestão, andamento do tribunal ou lembrete do ponto.",
          passos: [
            "Clique no **sino**.",
            "Os avisos vêm agrupados por assunto. Clique num aviso para ir direto ao lugar (a ficha, a tarefa, a intimação...).",
            "O aviso aberto fica como lido. Em Configurações > Preferências > **Avisos no sino** você escolhe quais assuntos quer receber."
          ],
          img: "sino",
          marcas: ["Sino com o número de avisos não lidos."]
        },
        { id: "numeros_menu", titulo: "Os números do menu da esquerda",
          quando: "Para saber, de relance, o que está esperando por você em cada tela.",
          passos: [
            "Cada item do menu mostra um número pequeno quando há algo para você: **Minhas Tarefas** (de hoje + atrasadas), **Intimações** (abertas que chegaram hoje), **Agenda** (compromissos de hoje), **Pedidos do Saga IA** (em aberto), **Notas** (compartilhadas com você e ainda não abertas), **Teses e oportunidades** (atualizações e achados do radar não vistos), **Relatórios** (pedidos para você preparar), **Pedidos de busca** (a fazer, para quem atende), **Chat** (mensagens não lidas) e, só para o administrador, **Sugestões** (novas).",
            "Número na cor do tema = só contagem. Número **vermelho** = pede ação (tarefa atrasada; no Chat, alguém marcou você, com o **@** ao lado).",
            "Grupo **fechado** (Meu dia, Processos...) mostra a **soma** dos números dos itens dele ao lado do título.",
            "Com o menu **recolhido**, o número fica numa bolinha em cima do ícone. Parar o mouse no número mostra o que ele conta.",
            "Os números se atualizam sozinhos (a cada minuto e na hora em que chega mensagem no chat)."
          ],
          dicas: ["O número some quando não há nada: não precisa zerar nada à mão.", "Os sons ficam em Configurações > Preferências > Sons."]
        },
        { id: "foto", titulo: "Menu da foto: perfil, preferências e sair",
          quando: "Para mudar os seus dados, a senha, as preferências ou sair do sistema.",
          passos: [
            "Clique na sua **foto** (canto de cima, à direita).",
            "**Meu perfil**: foto, nome, telefone e OAB. **Segurança e aparelhos**: troca de senha e aparelhos conectados.",
            "**Preferências**: tema, cor, tamanho da letra, efeitos de movimento e avisos.",
            "O **Manual do SAGA** e as **Sugestões de melhoria** ficam no menu da esquerda, em **Comunicação**.",
            "**Sair do sistema**: use sempre ao terminar. Se o seu ponto estiver aberto, o SAGA lembra antes de sair."
          ],
          img: "menu_foto",
          marcas: ["Menu da foto."]
        },
        { id: "preferencias", titulo: "Deixar o SAGA do seu jeito (tema, cor e letra)",
          quando: "Quando o colaborador quer a tela mais clara, mais escura, com letra maior ou sem animações.",
          passos: [
            "Menu da foto > **Preferências** (ou Configurações > Preferências).",
            "As Preferências ficam em **abas** no alto: **Aparência** (tema, cor e tamanho da letra), **Vidro** (aparece só quando uma cor de vidro está escolhida), **Tela** (efeitos de movimento, cadeado, tela inicial e as escolhas que acompanham a conta), **Avisos e sons** (sons e avisos no sino) e, só para o administrador, **Equipe** (cores da equipe). O SAGA lembra a última aba aberta.",
            "**Tema**: Claro ou Escuro (também pelo botão sol/lua no alto).",
            "**Cor do tema**: um cartão por cor, em três grupos: **Clássicos** (Azul, que é o padrão, Grafite e **Ônix**, preto e cinza), **Tecnológicos** (Azul profundo, Ciano holográfico, Âmbar de reator, Aurora violeta e \"A sua cor\") **Paletas** (Rubi, Bordô, Ouro, Lima, Aço, Marsala, Café e Mel) e **Campanhas** (Novembro Azul, Rosa e Natal). Cada cor tem claro e escuro.",
            "Em cada cartão escolha a versão: **Normal** (telas lisas) ou **Vidro** (placas de vidro sobre um fundo). Clique no cartão ou em Normal/Vidro para ver como fica; a cor só vale para todas as telas quando você clica em [[Salvar cor do tema]] ([[Cancelar]] volta para a anterior).",
            "**Efeitos de movimento**: Ligados (janelas abrem e fecham suaves) ou Desligados (troca na hora).",
            "**Cadeado contra voltar sem querer**: Automático (trava sozinho depois de alguns segundos na tela; você escolhe quantos, padrão 20), Manual (só trava quando você clica no cadeado) ou Desligado. A escolha vale neste e nos outros computadores.",
            "**Sons**: Ligados ou Desligados e, um por um, **Mensagem nova no chat**, **Alguém marcou você no chat**, **Intimação nova chegou** e **Aviso urgente no sino** (prazo de tarefa; para o administrador, erro de robô), com o **volume** (Baixo, Médio, Alto) e o botão ▶ para ouvir. Começam ligados só os do chat. O navegador só toca depois que você clicar uma vez na página e, com várias abas abertas, só uma toca. A escolha vale em qualquer computador.",
            "**Modo claro com a cor** (19/11): no tema Claro, o fundo, os painéis e o menu ficam tingidos da cor escolhida, e o claro é o inverso do escuro: a barra de cima fica escura na cor do tema e o menu lateral fica claro, com a letra escura.",
            "**Tamanho da letra**: Normal, Grande ou Maior.",
            "**Vale em todos os aparelhos** (19/11): tudo o que você escolhe aqui e nas telas (claro/escuro, cor, Vidro e foto de fundo, efeitos, grupos do menu, blocos da ficha, visões e gráficos das telas) fica guardado na sua conta e aparece igual no celular e em outro computador. Só ficam no aparelho: o menu recolhido do computador, a largura das colunas e o modo da planilha no celular. Para mandar de uma vez tudo o que está num aparelho para os outros: [[Usar as escolhas deste aparelho em todos]]."
          ],
          img: "preferencias_cores",
          marcas: ["Abas das Preferências: Aparência, Vidro, Tela, Avisos e sons e Equipe.", "Tema claro ou escuro.", "Cor do tema: um cartão por cor, em grupos.", "Normal ou Vidro, dentro do cartão."],
          dicas: ["As cores novas começam liberadas só para o administrador; ele libera para a equipe em Preferências > Cores da equipe.", "O administrador pode fixar a cor de um colaborador; nesse caso a escolha fica travada.", "**Tema do mês** (só o administrador liga, em Preferências > Cor do tema da equipe): o SAGA troca sozinho a cor de toda a equipe no mês de cada campanha (outubro Rosa, novembro Novembro Azul, dezembro Natal; dá para mudar cada mês). Nesse mês a sua escolha fica guardada e volta quando o mês acaba; quem tem a cor fixada continua com ela."]
        },
        { id: "vidro_fundo", titulo: "Vidro: fundo, fundo animado, intensidade e velocidade",
          quando: "Quando o colaborador escolheu uma cor na versão Vidro e quer mudar o que aparece atrás das placas.",
          passos: [
            "Escolha uma cor na versão **Vidro** e salve. Aparece o quadro **Vidro tecnológico**.",
            "**Fundo**: **Limpo** (só a cor do tema, sem desenho nem imagem), Montanhas à noite, Cidade, Grade técnica ou Minha imagem ([[Usar uma imagem minha]]: a imagem vai diminuída para um lugar privado da sua conta e aparece também no celular e nos outros computadores).",
            "**Vidro normal** ou **Vidro mais fosco** (mais fosco = menos do fundo aparece através das placas).",
            "**Fundo animado**: Parado, **Brasas de neon** (partículas subindo), **Rede de dados** (pontos ligados por linhas), **Circuito de luz** (pulsos de luz correndo por linhas), **Chuva de código** (caracteres descendo em colunas), **Viagem pelas estrelas** (estrelas vindo na sua direção), **Galáxia** (espiral girando devagar) ou **Constelações** (estrelas que se ligam e mostram um nome), sempre na cor do tema.",
            "**Intensidade** (Leve, Média, Forte) e **Velocidade** (Lenta, Normal, Rápida). Vale na hora."
          ],
          img: "preferencias_vidro",
          marcas: ["Fundo atrás das placas.", "Vidro normal ou mais fosco.", "Fundo animado.", "Intensidade e velocidade."],
          dicas: ["Tudo isso acompanha a sua conta: no celular ou em outro computador aparece igual (se mudar num aparelho, o outro acompanha ao abrir a próxima tela ou ao voltar para a aba do SAGA).", "Com os **Efeitos de movimento** desligados o fundo animado aparece parado.", "O fundo animado é leve: para sozinho quando a aba do SAGA fica escondida e não deixa as telas mais lentas."]
        },
        { id: "privacidade", titulo: "Gravar a tela ou mostrar o sistema sem expor clientes",
          quando: "Quando o colaborador vai gravar um vídeo, compartilhar a tela numa reunião ou mostrar o SAGA a alguém de fora.",
          passos: [
            "Clique no **olho** no alto da tela. Ele fica vermelho: o modo privacidade está ligado.",
            "Nomes, CPFs, números de processo e valores ficam escondidos em todas as telas.",
            "Clique de novo no olho para mostrar os dados."
          ]
        },
        { id: "cadeado", titulo: "Cadeado: não sair da tela sem querer",
          quando: "Quando você está trabalhando numa tela (uma planilha filtrada, uma tarefa, a ficha) e o botão de voltar do mouse ou a seta do navegador tiraria você dela sem querer.",
          passos: [
            "O **cadeado** fica no alto, ao lado do olho. Aberto, o voltar funciona normalmente.",
            "No modo **Automático** (padrão), ele **trava sozinho** depois de 20 segundos na tela (o tempo você escolhe em Preferências). No modo **Manual**, clique nele para travar.",
            "Travado, o botão de voltar do mouse, a seta do navegador e o Alt+← **não saem da tela**: aparece o aviso \"Tela travada: destrave o cadeado para voltar\", com o botão [[Destravar]].",
            "Para voltar de propósito, clique no cadeado (ou em [[Destravar]] no aviso) e volte. Links, o menu da esquerda e os botões continuam funcionando com o cadeado travado.",
            "Desligar ou mudar o tempo: Menu da foto > **Preferências** > **Cadeado contra voltar sem querer**."
          ],
          dicas: ["Destravou com a mão? Ele fica aberto até você trocar de tela; na tela seguinte o automático começa de novo."]
        },
        { id: "voltar", titulo: "Voltar para a tela como ela estava",
          quando: "Você filtrou uma lista (ex.: só TRF-5), abriu um cliente e quer voltar para a lista do jeito que estava.",
          passos: [
            "Use o botão de voltar do mouse ou a seta do navegador (com o cadeado aberto).",
            "Em **Minhas Tarefas**, nas planilhas do **Jurídico** e da **Captação** e em **Intimações**, a tela volta como estava: filtros, busca, página, visão (Kanban, lista) e a rolagem.",
            "Abrir a tela pelo **menu da esquerda** continua abrindo a lista **limpa** (sem filtro, na ordem de cadastro). O avançar do navegador também volta a tela como estava."
          ]
        },
        { id: "ler_pdf", titulo: "Ler um PDF no SAGA: selecionar, copiar e procurar",
          quando: "Quando você abre um PDF dentro do SAGA (ficha do cliente, Para aprovar, Word convertido, \"Ver como vai sair\") e quer copiar um trecho ou achar uma palavra.",
          passos: [
            "Com o PDF aberto, **selecione o texto** com o mouse (no celular, toque e segure) e copie (Ctrl+C), como numa página da internet.",
            "**Ctrl+F** acha a palavra em todas as páginas do PDF (até 150 páginas), logo ao abrir.",
            "Página escaneada (só imagem) não tem texto: aparece o aviso discreto **página só em imagem (escaneada): sem texto para copiar**. Para tirar dados dela, use os leitores do SAGA (Ler consulta, Ler os documentos, Ler documentos do cliente), que leem a imagem."
          ]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "ponto", titulo: "Ponto Eletrônico", quem: "Todos",
      resumo: "Bater o ponto, justificar faltas e atrasos, pedir home office e acompanhar as horas.",
      secoes: [
        { id: "bater", titulo: "Bater o ponto",
          quando: "Ao chegar, ao sair para a pausa, ao voltar e ao ir embora.",
          passos: [
            "Abra **Ponto Eletrônico** (o SAGA já abre nele depois do login).",
            "Clique em [[ENTRADA]] ao chegar, [[INÍCIO DA PAUSA]] ao sair para a pausa ou o almoço, [[FIM DA PAUSA]] ao voltar e [[SAÍDA]] ao ir embora. O botão da próxima marcação fica destacado.",
            "Se o navegador pedir a sua **localização**, permita: ela confirma de onde o ponto foi batido.",
            "Confira as marcações de hoje logo abaixo dos botões e o **Resumo do mês** ao lado (horas, saldo, atrasos e faltas)."
          ],
          img: "ponto_colab",
          marcas: ["ENTRADA: ao chegar.", "INÍCIO DA PAUSA: ao sair para a pausa ou o almoço.", "FIM DA PAUSA: ao voltar.", "SAÍDA: ao ir embora."],
          atencao: ["Esqueceu de bater a saída? O SAGA avisa ao fechar a última aba do sistema, no [[Sair do sistema]] e no sino (alguns minutos depois do fim da sua jornada).", "Não bata o ponto por outra pessoa."]
        },
        { id: "diretoria", titulo: "Ponto da Diretoria (horário livre)",
          quando: "Para quem não tem horário fixo: cada período trabalhado é marcado à parte.",
          passos: [
            "Clique em [[INICIAR]] ao começar um período e em [[ENCERRAR]] ao terminar. Pode haver vários períodos no mesmo dia.",
            "O sistema soma as horas trabalhadas no mês."
          ],
          img: "ponto",
          marcas: ["INICIAR um período.", "ENCERRAR o período.", "Justificativas.", "Home office."]
        },
        { id: "justificar", titulo: "Justificar atraso, falta ou esquecimento",
          quando: "Quando o colaborador chegou atrasado, faltou, saiu mais cedo, esqueceu uma marcação ou tem atestado.",
          passos: [
            "No Ponto, abra a aba **Justificativas**.",
            "Escolha o dia e o tipo, escreva o motivo e, se tiver, anexe o atestado.",
            "Clique em [[Enviar justificativa]]. O gestor aprova ou recusa e você recebe o aviso no sino."
          ]
        },
        { id: "homeoffice", titulo: "Pedir home office",
          quando: "Quando o colaborador precisa trabalhar de casa num dia combinado.",
          passos: [
            "No Ponto, abra a aba **Home office** e clique em [[Pedir home office]].",
            "Escolha o dia e escreva o motivo. Aprovado, o ponto pode ser batido de casa naquele dia."
          ]
        },
        { id: "atividades", titulo: "Registrar as atividades do dia",
          quando: "Quando o colaborador fala com cliente por WhatsApp, ligação, e-mail, carta ou atendimento e quer que entre no relatório do dia.",
          passos: [
            "No Ponto, desça até **Atividades de hoje**.",
            "Escolha o canal, digite o nome ou CPF do cliente e escreva o que foi feito.",
            "Clique em [[Registrar atividade]]."
          ]
        },
        { id: "gestor", titulo: "Para o gestor: equipe, banco de horas e relatórios",
          quando: "Quando o gestor confere o ponto da equipe, aprova justificativas ou fecha o mês.",
          passos: [
            "Abas **Equipe** (quem está trabalhando agora), **Banco de horas**, **Relatórios** e **Baixar PDF** (folha de ponto).",
            "Os relatórios chegam sozinhos por e-mail ao gestor: o **diário** às 20h dos dias úteis, o **semanal** na sexta e o de **fechamento** no dia 25.",
            "Em **Cadastro** e nas configurações do Ponto ficam a jornada de cada um, os feriados e os horários dos lembretes."
          ]
        },
        { id: "acessos", titulo: "Para o administrador: entradas no sistema (aba Acessos)",
          quando: "Para conferir a que horas cada colaborador entrou no SAGA e comparar com a hora em que bateu o ponto (por exemplo, com as câmeras do escritório). Só o administrador geral vê.",
          passos: [
            "Na **primeira entrada do dia** de cada colaborador, o sino avisa: \"Fulano entrou no sistema às 08:02 (ponto ainda não batido)\", com o aparelho. Clicar no aviso abre a aba **Acessos**.",
            "No Ponto, abra a aba **Acessos**. Escolha [[Dia]] (com as setas ou o calendário) ou [[Últimos 7 dias]].",
            "Para cada colaborador aparecem: a hora em que **entrou no sistema**, a hora em que **bateu o ponto** e a **diferença** (verde quando foram juntos; amarelo ou vermelho quando o ponto veio depois; azul quando veio antes).",
            "Ao lado: **como entrou** (login com senha, com o Google ou já estava logado), o **aparelho**, a **rede (IP)** e as outras entradas do dia. Tentativas barradas pelo controle de horário e local aparecem em vermelho embaixo do nome.",
            "A aba se atualiza sozinha a cada 30 segundos. Na aba **Equipe**, a coluna **Entrou no sistema** mostra a mesma hora ao lado das batidas."
          ],
          img: "ponto_acessos",
          marcas: ["Aba Acessos (só o administrador vê).", "Escolher o dia ou os últimos 7 dias.", "Entrou no sistema, bateu o ponto e a diferença entre os dois.", "Como entrou, aparelho e rede (IP)."],
          atencao: ["Dias antes de 11/11/2026 mostram a hora do registro de acessos antigo, sem aparelho nem IP.", "O administrador não aparece na própria lista."]
        },
        { id: "internets", titulo: "Para o administrador: internets autorizadas e pedidos de entrada",
          quando: "Para liberar a internet do escritório (ou outra de confiança) para toda a equipe e responder quando alguém entra por uma internet nova. Só o administrador geral vê.",
          passos: [
            "No Ponto, aba **Acessos**, desça até **Internets e computadores**. Em **Internets vistas (30 dias)**, clique em [[Autorizar IP]] na internet do escritório.",
            "Internet autorizada fica **liberada de vez** para todo colaborador com login ativo: quem entra por ela não gera pedido nem aviso no sino, em qualquer computador.",
            "Quando alguém entra por uma internet **nova** (por exemplo, a do escritório caiu e usaram outra), o sino avisa. Se a chave \"Colaborador só entra pela internet do escritório\" estiver ligada, chega o **Pedido de entrada** com [[Autorizar esta internet]] e [[Recusar]].",
            "Ao autorizar, a internet entra na lista e **os outros pedidos da mesma internet se resolvem sozinhos**: não é preciso autorizar um por um.",
            "Para tirar a autorização de uma internet, clique em [[Tirar autorização]] na mesma tabela. Só desativa: o histórico fica."
          ],
          atencao: ["As suas próprias entradas (administrador) nunca geram pedido nem aviso, de nenhuma internet e de nenhum aparelho.", "O aviso \"Fulano entrou no sistema\" da primeira entrada do dia continua: ele é só informativo."]
        },
        { id: "login_diario", titulo: "Login diário da equipe (saída às 20h e sem uso fora do horário)",
          quando: "Para entender por que o SAGA pediu o login de novo e, para o administrador, quem fica fora dessa regra.",
          passos: [
            "Todo dia cada colaborador entra com e-mail e senha e depois bate o ponto.",
            "Às **20h** o SAGA encerra os logins abertos (a tela vai para a entrada, com o motivo). Fora do seu horário de trabalho (fim de semana e feriado contam como fora), o login cai depois de **30 minutos sem uso**; dentro do horário, não cai.",
            "Ficam fora dessa regra o administrador e quem está em Ponto > Cadastro > Configurações > **Login diário da equipe** (hoje a Hevelyn). Com **Manter conectado** marcado no aparelho, eles também não saem por tempo sem uso.",
            "Toda saída por regra (fim do dia, tempo sem uso) fica registrada em Ponto > **Acessos**."
          ]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "captacao", titulo: "Captação", quem: "Captação, Jurídico e administrador",
      resumo: "A lista de clientes em prospecção: localizar, contatar, conversar e trazer o cliente para o escritório.",
      secoes: [
        { id: "visao", titulo: "A tela da Captação",
          quando: "Todo dia, para ver os retornos marcados e trabalhar a lista.",
          passos: [
            "Abra **Captação** no menu.",
            "No alto, o painel **Retornos da Captação** mostra os retornos combinados com os clientes: de hoje, atrasados e dos próximos dias. Clique numa ficha para abrir.",
            "Escolha como ver a lista: **Lista** (planilha) ou **Kanban** (cartões por etapa).",
            "A lista abre sempre limpa: 50 por página, sem filtro, na ordem de cadastro."
          ],
          img: "captacao_topo",
          marcas: ["Novo Processo: cadastra cliente e processo.", "Ver em Lista (planilha).", "Ver em Kanban (cartões por etapa).", "Retornos combinados com os clientes."]
        },
        { id: "lista", titulo: "Trabalhar na lista (planilha)",
          quando: "Para procurar, filtrar, organizar colunas, editar várias linhas ou tirar uma planilha da lista.",
          passos: [
            "**Procurar**: digite nome, CPF ou número do processo na busca da lista.",
            "**Filtrar**: clique no título de uma coluna. Coluna de valor filtra por faixa (de / até), coluna de data por período (Hoje, Esta semana, Mês passado...); a lista de valores exatos fica embaixo.",
            "**Editar**: dê dois cliques na célula, mude e aperte Enter. Para repetir o valor de cima nas linhas de baixo, selecione as células com Shift e use [[Ctrl+D]] (ou o botão **Copiar o de cima**).",
            "**Colunas**: esconda, mude a ordem e a largura. **Visões**: salve um jeito de ver a lista (filtros + colunas) para usar de novo.",
            "**Exportar Excel**: baixa a lista como está na tela.",
            "**Marcar linhas** (caixinha à esquerda): a barra de baixo traz [[Alterar…]] (põe o mesmo valor numa coluna em todas as marcadas; só quem edita processos), [[Exportar marcados]] (Excel só delas) e, para o administrador, Excluir marcados. No Alterar… o valor começa sem escolha; **deixar vazio** é uma opção à parte e pede confirmação. Se algum não puder ser alterado, a janela fica aberta com a lista (cliente, código e o motivo).",
            "**Captador**: [[Sem captador]] mostra os cartões sem captador com login no SAGA (o captador conta no prêmio e não é distribuído sozinho): o Dr. Victor ou a Hevelyn escolhem o captador na própria célula ou em Distribuir fichas, e o cartão sai da lista. O nome que vinha da planilha antiga fica na coluna **Captador anterior (planilha)**.",
            "**Gráficos** acima da lista: na Captação, **Por etapa** e **Por captador** (clicar numa fatia filtra a lista, com a etiqueta \"Captador: ...\"). [[Ocultar gráficos]] fica lembrado nesta tela.",
            "**Abrir a ficha**: clique no nome do cliente (Ctrl+clique abre em outra aba). O número do processo aparece sempre inteiro, nunca cortado."
          ],
          img: "captacao_lista",
          marcas: ["Gráfico Por captador (clique numa fatia para filtrar).", "Busca da lista (nome, CPF, número ou código).", "Sem captador (N): cartões ainda sem captador com login.", "Com linhas marcadas: Alterar… e Exportar marcados.", "Captador anterior (planilha): o nome que vinha da planilha antiga."],
          atencao: ["Marcar linhas e **Excluir marcados**: só o administrador.", "Coluna **Carta** é automática (vem da tela Cartas): não se edita à mão."]
        },
        { id: "funil", titulo: "Andar com o cliente pelo funil (Kanban)",
          quando: "Quando a conversa com o cliente avança (localizou, falou, pediu documentos...).",
          passos: [
            "Clique em **Kanban**. Cada coluna é uma etapa: **Não iniciado > Localizando > Em contato > Conversando > Documentação pedida > Documentos em mãos > Sem sucesso**.",
            "Arraste o cartão para a etapa nova (ou mude a coluna **Etapa do funil** na lista).",
            "Use as colunas próprias: **Localização** (cliente ou parente localizado, não localizado), **Contato** (ligar, WhatsApp, e-mail, carta, respondeu...) e **Motivo** (quando for sem sucesso).",
            "Em **Organizar por** você agrupa os cartões por outra coluna (responsável, origem...)."
          ],
          img: "captacao_kanban",
          marcas: ["Etapa (coluna) com o total de cartões.", "Cartão do cliente: arraste para mudar de etapa; clique para abrir a ficha."],
          dicas: ["O SAGA avança sozinho algumas etapas: pedido de busca leva de Não iniciado para Localizando; telefone, e-mail ou endereço gravado na Localização marca Cliente/Parente localizado e leva para Em contato; carta respondida leva para Conversando. Ele só avança, nunca volta."]
        },
        { id: "novo", titulo: "Cadastrar um cliente e um processo novos",
          quando: "Quando chega um cliente novo (indicação, anúncio, lista) ou um cliente antigo com outra ação.",
          passos: [
            "Clique em [[Novo Processo]].",
            "Em **Pessoa (cliente)**, procure pelo nome ou CPF. Não achou? Clique em **Cadastrar nova pessoa**.",
            "Se o SAGA achar uma ficha com o **mesmo CPF**, o **mesmo nome** ou um **nome parecido**, abre a janela **Essa pessoa já tem ficha?** com os processos de cada ficha. É a mesma pessoa? Clique em [[Usar esta ficha]]: o processo novo vira mais um cartão dela. É outra pessoa com nome parecido? Clique em **É outra pessoa... criar ficha separada** e escreva o motivo.",
            "Preencha o **número do processo** (se já existir), a **área do direito** e o **tipo de ação**, o **status inicial** e o **responsável**.",
            "Valor da causa e honorários (%), se souber. Em **Outros clientes ou herdeiros** acrescente quem mais faz parte.",
            "Em **De onde veio o cliente?** marque a rede social ou a campanha. Dica: cole a 1ª mensagem do cliente; o código da campanha (ex.: [IR27]) marca tudo sozinho.",
            "Salve. A ficha do cliente abre com o processo novo."
          ],
          img: "novo_processo",
          marcas: ["Cliente (procure antes de cadastrar, para não repetir).", "Número do processo, se já houver.", "De onde veio o cliente (rede social, campanha ou indicação)."],
          atencao: ["Antes de cadastrar, procure o CPF na busca do alto: o cliente pode já existir com outro processo.", "Mesmo CPF: o SAGA não deixa criar outra ficha. Use a ficha que já existe.", "Ficha separada de propósito só com o motivo escrito: ele fica no Registro de atividades e a ficha mostra a etiqueta \"Ficha separada de propósito\".", "A mesma janela aparece em \"Nova pessoa\" da ficha, nas partes do processo (herdeiros) e no \"Incorporar\" das Intimações."]
        },
        { id: "planilhas", titulo: "Importar planilha e distribuir fichas",
          quando: "Quando chega uma lista nova de possíveis clientes ou é preciso dividir a lista entre a equipe.",
          passos: [
            "**Importar planilha**: cole as linhas do Excel ou escolha o arquivo; o SAGA mostra a prévia antes de gravar.",
            "**Distribuir fichas**: escolha as pessoas e a quantidade; cada uma recebe as suas fichas como responsável.",
            "Os dois botões só aparecem para quem tem permissão."
          ]
        },
        { id: "lotes", titulo: "Lotes da semana e a meta do dia",
          quando: "Todo dia, para quem localiza clientes na Captação (hoje: Tarcila, Karine, Tamires e David).",
          passos: [
            "Toda **segunda às 7h** cada localizador recebe o **lote da semana** (150 fichas), uma para cada, na ordem da planilha. O aviso chega no sino.",
            "Abra **Captação**: no alto aparece **Meu lote**, com o lote da semana, **Hoje: X de 30** (a meta do dia, com a barrinha), a semana e quantas **Faltam**.",
            "Clique em [[Faltam]] para ver na lista só as fichas do lote que ainda faltam trabalhar; clique de novo para voltar à lista toda.",
            "A ficha conta como trabalhada quando **muda de etapa**, ganha **comentário** ou um **contato/anotação na Localização**. Ela sai da lista do lote sozinha.",
            "O que sobrar de uma semana continua com a pessoa e soma com o lote novo."
          ],
          dicas: ["Administrador: o quadro **Lotes da Captação** mostra todos, com [[Configurar lotes]] (quem recebe, tamanho do lote, ligado/desligado), [[Entregar lote agora]] e [[Desfazer lote]] (as fichas voltam a ficar sem Jovem Talento). As fichas em **Sem sucesso** não entram nos lotes."]
        },
        { id: "premio", titulo: "Normas da Captação e Prêmio da Captação",
          quando: "Para ler as normas da captação, entender como funciona o prêmio e acompanhar o seu progresso no mês.",
          passos: [
            "No menu, em **Comunicação**, abra **Normas e prêmio** (logo abaixo de Treinamentos). Todo mundo do escritório vê e participa: quem traz ação para dentro conta.",
            "**Meu progresso**: o selo do seu **nível**, a **barra** \"X de N processos válidos para o platô\" (cada degrau mostra quanto aquele processo vale), quanto falta, a **previsão do prêmio do mês**, os processos validados com a sua parte, a **meta da equipe** e o histórico por mês, por tese e por forma de captação. Use ‹ › para ver outros meses.",
            "**Normas da Captação**: as regras do dia a dia (quem capta, lotes e meta do dia, etapas do funil, documentação completa, quando o processo é válido, LGPD). Clique no título para abrir ou fechar.",
            "**Como funciona o prêmio**: a tabela dos níveis (valor de cada processo na escada), subir e descer de nível, plus, peso da tese, qualidade, prêmio cruzado, meta da equipe e o lembrete jurídico (CLT, art. 457, §§ 2º e 4º).",
            "**Validar** (o Dr. Victor e a Hevelyn): a lista dos cartões em **Documentos em mãos** e dos processos do Jurídico ainda não validados. Clique em [[Validar]], marque as 3 conferências (**documentação completa**, **cálculo pronto**, **valor a recuperar**), marque **de primeira** se a documentação não precisou de nada novo, confira quem iniciou e quem pegou a documentação e confirme. Quem ganha recebe o aviso no sino.",
            "**Pré-validados pelo sistema**: quando o cálculo do PSS de um cliente seu é conferido e dá valor a restituir, o processo aparece como **previsto, aguardando confirmação** no seu progresso (e você recebe o aviso). Em **Validar**, o Dr. Victor ou a Hevelyn clicam em [[Confirmar]] (vira validado) ou [[Não confirmar]] (com o motivo). Teses sem cálculo continuam com a validação manual.",
            "**Prêmio pago**: depois do mês fechado, o administrador marca o pagamento; no seu progresso aparece **Recebido em dd/mm**.",
            "**Painel geral** (só o administrador): todos lado a lado, **custo previsto do mês**, [[Fechar o mês para pagamento]] (grava os valores, que não mudam mais, define o nível do mês seguinte e avisa cada um), [[Baixar PDF]], [[Lançar ajuste]] e [[Quem participa]]. Clique numa pessoa para ver o progresso dela."
          ],
          dicas: ["O processo conta no **mês da validação**. Cada nível começa R$ 2,50 acima do anterior e sobe R$ 5 por processo até o platô; depois do platô todo processo do mês paga o valor do platô.",
                  "Prêmio cruzado: quem iniciou o cliente fica com 40% e quem pegou a documentação com 60% (a mesma pessoa, 100%); os dois contam o processo na própria escada.",
                  "Processo a mais do mesmo cliente e habilitação pagam um valor fixo, fora da escada."],
          atencao: ["Só o administrador edita as normas, as regras e os valores (botões **Editar**, **+ Novo bloco**, **Editar regras e valores**, **Peso das teses**) e cancela uma validação. Cancelar por **erro de documentação** depois do mês fechado vira **estorno** no mês seguinte.",
                    "Mês fechado não muda: correção vira **ajuste** no mês aberto."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "juridico", titulo: "Jurídico", quem: "Jurídico e administrador",
      resumo: "Os processos contratados: protocolar, acompanhar até o saque e ver os parados.",
      secoes: [
        { id: "grupos", titulo: "A lista do Jurídico e os grupos",
          quando: "Todo dia, para ver os processos do escritório e o que está parado.",
          passos: [
            "Abra **Jurídico** no menu. A lista funciona como a da Captação (busca, filtros, colunas, visões, Kanban).",
            "Use os grupos: **Todos**, **Protocolados**, **Não protocolados**, **Encerrados** e **Sacados**.",
            "Cada processo está em um grupo só: **sacado** (o recebido no Financeiro cobre o esperado) > **encerrado** (situação Encerrada ou Inviável) > **ativo**.",
            "O painel **Processos parados** mostra há quanto tempo cada processo está sem movimento no escritório. O responsável recebe tarefa e aviso automáticos.",
            "O selo **sem resumo** ao lado do nome marca o processo ativo que o agente ainda não leu (sem o resumo estratégico). [[Sem resumo do agente]] mostra só esses processos; os números para baixar os autos estão no **Dashboard** (Copiar números).",
            "[[Sem número CNJ]] mostra só os processos ativos sem número CNJ válido (vazio, sem os 20 dígitos ou com o dígito verificador errado). Sem o número, o robô do CNJ e o radar não acompanham o processo. Complete o número na própria célula (clique duplo) e o processo sai da lista. Número errado aparece com o selo vermelho **número inválido**.",
            "**Protocolar novamente**: quando o processo é extinto e precisa de novo protocolo, mude a **Situação da ação** para **Protocolar novamente** (na ficha ou na planilha). O SAGA cria sozinho a tarefa \"Protocolar novamente\" para o responsável do processo (sem responsável: o Dr. Victor), com prazo de 15 dias, sem repetir. Quando o processo voltar para **Protocolada**, a tarefa se conclui sozinha. [[Protocolar novamente]] na barra mostra só esses processos (o processo continua ativo). O administrador muda o prazo ali mesmo, em \"mudar\"."
          ],
          img: "juridico",
          marcas: ["Protocolados.", "Não protocolados.", "Encerrados.", "Sacados."],
          dicas: ["Etiqueta **Requisitório OK** põe sozinha **Processo finalizado** e a situação **Encerrada**."]
        },
        { id: "fase", titulo: "Passar um processo da Captação para o Jurídico",
          quando: "Quando o cliente fechou com o escritório e a ação vai ser preparada.",
          passos: [
            "Abra a ficha do cliente e o processo.",
            "No topo do processo, clique em **Jurídico** (botões Captação | Jurídico) e confirme.",
            "O status passa a ser o primeiro do Jurídico. Nada é apagado e a mudança fica no histórico.",
            "**Passagem sozinha**: o cartão também vai SOZINHO da Captação para o Jurídico (situação **Documentação Recebida**) quando alguém guarda o 1º documento do cliente no cartão (fora das pastas \"Pesquisa\") ou põe o cartão em **Documentos em mãos**. A colaboradora da Captação continua como responsável pelo contato. \"Documentação pedida\" não muda a fase.",
            "Chegou ao Jurídico vindo da Captação e a tese é **PSS**: o SAGA cria para o Dr. Victor a tarefa **Fazer o cálculo do PSS**. Quando o cálculo é conferido, o processo fica marcado como **apto** ou **sem direito**."
          ]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "ficha", titulo: "Ficha do cliente", quem: "Todos que atendem clientes",
      resumo: "Tudo sobre o cliente e os processos dele numa página só.",
      secoes: [
        { id: "abrir", titulo: "Abrir a ficha e conhecer o topo",
          quando: "Sempre que for trabalhar com um cliente.",
          passos: [
            "Clique no nome do cliente na lista, no cartão ou na busca: a ficha abre na **tela inteira**. Ctrl+clique (ou o botão do meio do mouse) abre em outra aba.",
            "A ficha tem **três cartões**, cada um com o título e a setinha que recolhe o cartão inteiro: **Cliente** (o de cima: nome, código, contatos e as abas dos processos), **Processo** (a coluna do meio) e **Painel lateral** (retorno, partes, responsável, pastas, tarefas, pagamentos...). Recolhido, o Cliente fica numa linha só (nome · código) e as **abas dos processos continuam à vista**. Recolher o Painel lateral deixa o Processo na largura toda (e vice-versa). No celular os cartões ficam um embaixo do outro e cada um recolhe no lugar.",
            "O **código do cliente** (VMM-01234) fica acima do nome, com o botão de **copiar** logo ao lado (também no celular); o código de cada processo (VMM-01234-PSS) fica no topo do processo.",
            "No topo: nome, CPF, endereço e a **situação vital** (vivo ou falecido). Embaixo, **Contatos**: telefones, e-mails e endereços, com copiar, **WhatsApp** e **validar**.",
            "Cada grupo de contatos (Telefones, E-mails, Endereços) **abre e recolhe** clicando no título; o número entre parênteses é quantos há. Recolhido, mostra só o principal e \"+N\". [[Recolher todos]] deixa o topo curtinho. A escolha fica guardada na sua conta (vale no celular também).",
            "[[Ler consulta (PDF ou print)]], ao lado de Contatos: veja a parte **Localização** abaixo (é a mesma leitura).",
            "Mais abaixo, uma **aba para cada processo** do cliente e o botão **Localização**.",
            "[[Editar dados do cliente]]: dados pessoais e o **perfil** (situação funcional, órgão, cargo, matrícula, datas, nome da mãe)."
          ],
          img: "ficha_topo",
          marcas: ["Cartão Cliente: clique no título para recolher (fica uma linha com nome e código; as abas dos processos continuam à vista).", "Código do cliente, com o botão de copiar.", "Contatos: Recolher todos / Abrir todos e Ler consulta (PDF ou print).", "Cada grupo (Telefones, E-mails, Endereços) abre e recolhe pelo título; o número é quantos há.", "Abas dos processos e a Localização.", "+ Novo Processo e + Recurso."],
          dicas: ["Telefone confirmado com o cliente? Clique em validar (✓): ele vira o contato principal de confiança.", "A escolha dos cartões recolhidos fica guardada na sua conta e vale em qualquer aparelho."]
        },
        { id: "blocos", titulo: "Organizar a ficha: recolher blocos, colunas e a ordem",
          quando: "Quando a ficha tem informação demais na tela e você quer ver só o que usa.",
          passos: [
            "O **cartão de cima** (nome, código, contatos e as abas dos processos) fica sempre fixo. Todo o resto é dividido em **blocos**.",
            "Clique no **título de um bloco** (ou na setinha) para **recolher**; clique de novo para **abrir**. Fechado, o título mostra um resumo (ex.: \"2 itens abertos\", \"3 comentários\", o nome do responsável).",
            "Na barra **Blocos da ficha**: [[Abrir tudo]] e [[Recolher tudo]].",
            "**Colunas**: [[As duas]], [[Só a do meio]] ou [[Só a lateral]]. A coluna que fica ocupa a largura toda; a faixa fina do lado traz a outra de volta.",
            "[[Organizar blocos]]: marque quais blocos aparecem, mude a **ordem** (▲▼) e a **coluna** de cada um (**Meio** ou **Lado**). [[Voltar ao padrão]] desfaz tudo.",
            "A escolha fica guardada **neste navegador** e vale para todas as fichas. Link que leva a um bloco (ex.: aviso de parcela vencida, andamento novo, menção num comentário) abre o bloco sozinho."
          ],
          img: "ficha_blocos",
          marcas: ["Abrir tudo e Recolher tudo.", "Colunas: as duas, só a do meio ou só a lateral.", "Organizar blocos: quais aparecem, a ordem e a coluna.", "Cartão Processo: o título recolhe o cartão inteiro.", "Cartão Painel lateral: recolhido, o Processo ocupa a largura toda.", "Bloco recolhido: o título mostra um resumo; clique para abrir."],
          dicas: ["No celular as colunas ficam uma embaixo da outra; recolher e organizar funcionam igual.", "Recolher não apaga nada: é só a forma de ver a ficha."]
        },
        { id: "processo", titulo: "Trabalhar dentro de um processo",
          quando: "Para registrar o que aconteceu com o processo e com o cliente.",
          passos: [
            "**Ver no tribunal**: copia o número e abre a consulta do tribunal certo.",
            "**Como chegou**: de onde veio o cliente (rede social, campanha, indicação).",
            "[[Registrar contato com a cliente]]: escreva o que foi conversado e, se mudou, a situação depois do contato. Use em TODA ligação ou mensagem.",
            "**Etiquetas** (+ etiqueta), **situação da ação** e a fase **Captação | Jurídico**.",
            "Na direita: **Retorno agendado** (quando falar de novo com o cliente), **Partes do processo** (herdeiros), **Responsável**, **Pastas do cliente**, **Tarefas**, **Intimações**, **Agente de petições** e **Notas**."
          ],
          img: "ficha_processo",
          marcas: ["Ver no tribunal (copia o número e abre a consulta).", "Como chegou (origem do cliente).", "Registrar contato com o cliente.", "Colocar etiqueta."]
        },
        { id: "dados", titulo: "Dados do processo, recursos e andamentos do tribunal",
          quando: "Para conferir valores, número, recursos e o que andou no tribunal.",
          passos: [
            "**Dados do Processo**: tipo de ação, responsável, valores (bruto, causa, honorários) e número. O lápis edita.",
            "[[Organizar campos]] (embaixo dos dados): escolha o que fica à vista. **◀ ▶** mudam a ordem, **▾ Recolher** manda o campo para **Todos os dados do processo** e **▴ Pôr à vista** traz para cima. [[Salvar para mim]] vale só para você, em qualquer computador; [[Voltar ao padrão do escritório]] desfaz a sua. O administrador também tem [[Salvar como padrão do escritório]] (toda a equipe vê assim, menos quem tem a própria arrumação). Jurídico e Captação têm cada um a sua. Nenhum dado é apagado.",
            "**Recursos deste processo**: agravos, apelações e embargos ficam aqui, com número, tribunal, relator e situação. Use [[+ Recurso]] para cadastrar. Intimação com o número do recurso cai neste processo.",
            "**Andamentos no tribunal (CNJ)**: os movimentos trazidos da base pública do CNJ. Os importantes (pagamento, RPV/precatório, trânsito em julgado, sentença, decisão, audiência) ficam destacados e avisam o responsável no sino.",
            "[[Atualizar agora]] consulta o CNJ na hora (leva cerca de 1 minuto). Ficam à vista só os **2 mais recentes**; [[Ver todos]] abre o histórico inteiro e **Mostrar menos** recolhe de novo."
          ],
          img: "ficha_andamentos",
          marcas: ["Andamentos no tribunal (CNJ).", "Atualizar agora.", "Andamento importante (destacado)."],
          atencao: ["O CNJ pode atrasar alguns dias em relação ao site do tribunal. Para conferir na hora, use o botão do tribunal."]
        },
        { id: "linha_tempo", titulo: "Linha do tempo do processo",
          quando: "Para ver, numa lista só, tudo o que já aconteceu no processo, do mais novo para o mais antigo.",
          passos: [
            "Na ficha, abra o bloco **Linha do tempo** (ele começa fechado e só busca os dados quando você abre, para a ficha não ficar lenta). Ao trocar de processo, a lista acompanha.",
            "Aparecem juntos: intimações, andamentos do CNJ, comentários, tarefas, documentos, agenda, mudanças de etapa, petições da Renata e relatórios, cada um com o ícone, a data e quem fez.",
            "Clique nos **tipos** no alto para ver só alguns (dá para marcar vários). **Só o importante** deixa só o que mais conta (intimação, petição, etapa, andamento importante...). A **busca** procura no que já está na lista.",
            "Vêm 50 de cada vez: [[Ver mais]] traz os anteriores. Filtrou demais? [[Limpar filtros]].",
            "Cada pessoa só vê na linha do tempo o que já pode ver no sistema. Se der erro, o motivo aparece com [[Tentar de novo]]."
          ],
          img: "ficha_linha_tempo",
          marcas: ["Tipos: clique para ver só intimações, andamentos, comentários... (vários de uma vez).", "Só o importante.", "Busca na linha do tempo.", "Um acontecimento: ícone do tipo, título, data, quem fez e o resumo.", "Ver mais: os 50 anteriores."]
        },
        { id: "comentarios", titulo: "Comentários, menções e atendimentos",
          quando: "Para deixar um recado para a equipe sobre o processo, chamar um colega ou marcar atendimento com o cliente.",
          passos: [
            "Em **Comentários e histórico**, escreva o comentário. Para chamar um colega, digite **@** e o nome (ou clique em **Mencionar colega**): ele recebe o aviso no sino.",
            "Clique em [[Comentar]]. O histórico mostra também as mudanças de situação (quem e quando).",
            "Em **Atendimentos**, [[+ Marcar atendimento]] marca uma reunião com este cliente (veja o capítulo Agenda). A conversa do atendimento aparece aqui e na agenda.",
            "Em **Checklists**, marque o que já foi feito (documentos, etapas)."
          ],
          img: "ficha_comentarios",
          marcas: ["Mencionar colega (@).", "Comentar.", "Marcar atendimento com o cliente."]
        },
        { id: "pastas", titulo: "Pastas do cliente: criar só as que você quer",
          quando: "Para organizar os documentos do cliente em pastas (pessoais, petições, relatórios...).",
          passos: [
            "Na ficha, no bloco **Pastas do cliente** (coluna da direita), clique em [[+ Pasta]]. Abre a janela **Criar pastas**.",
            "Em **Pastas pré-prontas**, MARQUE só as que quer (uma, duas...). A pasta que já existe na ficha aparece marcada e apagada, com **já existe**, e não é criada de novo.",
            "Quer uma pasta com outro nome? Escreva em **Pasta livre** (e, se quiser, escolha dentro de qual pasta ela fica).",
            "Clique em [[Criar]]. Depois, no **⋯** ao lado do nome de qualquer pasta: renomear, mover, subir/descer, nova subpasta, anexar documento aqui ou remover.",
            "As pastas **Pesquisa > Busca** e **Pesquisa > Espelhos do TRF** o SAGA cria sozinho."
          ],
          img: "ficha_criar_pastas",
          marcas: ["Pastas pré-prontas: marque só as que quer (a que já existe aparece marcada e apagada, \"já existe\").", "Organizar a lista (só o administrador).", "Pasta livre: outro nome e onde ela fica.", "Criar."],
          dicas: ["Administrador: [[Organizar a lista]] na mesma janela muda a lista de pastas pré-prontas de todo o escritório: renomear (clique no nome), ▲ ▼ para a ordem, ✕ para tirar da lista (as pastas já criadas nas fichas continuam), [[+ Pôr na lista]] para uma nova e [[Ver as tiradas da lista]] para trazer uma de volta."]
        },
        { id: "docs_pessoais", titulo: "Documentos do processo e documentos pessoais",
          quando: "Para guardar cada documento no lugar certo: o do processo fica na aba do processo; o pessoal (RG, CPF, comprovante...) fica com a pessoa e aparece em todas as abas em que ela é parte.",
          passos: [
            "Cada aba de processo mostra só os documentos **daquele processo**. Anexe o documento com a aba certa aberta (ou arraste para a pasta).",
            "Documento **pessoal** (RG, CPF, CNH, comprovante de residência, certidões, procuração): clique no botão do **cartão de identidade** ao lado do documento, escolha **de quem é** (o cliente ou um herdeiro/parte) e clique em [[Marcar como pessoal]].",
            "Ele passa para o quadro **Documentos pessoais**, acima das pastas, e aparece sozinho em **todas as abas** em que essa pessoa é parte (o do cliente aparece em todas).",
            "O herdeiro tem outro processo na ficha? Na aba desse processo, clique em [[Puxar de outra pessoa]], marque os documentos e clique em [[Puxar para esta aba]]. O arquivo NÃO é copiado: é o mesmo documento, ligado a mais um processo.",
            "[[Tirar desta aba]] só desfaz a ligação: o documento continua na ficha, nas abas da pessoa dona. Para ele voltar a ser do processo, clique de novo no cartão de identidade e em [[Voltar a ser do processo]]."
          ],
          img: "ficha_docs_pessoais",
          marcas: ["Quadro Documentos pessoais (aparece em todas as abas em que a pessoa é parte).", "Puxar de outra pessoa (sem copiar o arquivo).", "Botão do cartão de identidade: marcar como pessoal, trocar o dono ou voltar a ser do processo.", "Tirar desta aba (só desfaz a ligação).", "Documentos do processo desta aba."],
          dicas: ["Quem organiza (marca, puxa, tira): quem pode anexar documentos. Os outros só veem.", "Tudo fica no Registro de atividades."]
        },
        { id: "peticao", titulo: "Fazer petição pela ficha (e ler os documentos do cliente)",
          quando: "Quem faz petições (Jurídico e Estagiário, ou quem o administrador liberar) quer uma petição já preenchida com os dados da ficha.",
          passos: [
            "Na ficha, abra a aba do processo e clique em [[Fazer petição]]. Aparecem só os modelos da **tese daquele processo** e os modelos gerais.",
            "Escolha o modelo. Os dados vêm sozinhos da ficha (cliente, qualificação, endereço, número do processo, vara do CNJ, valores do cálculo, herdeiros). Confira o **Papel timbrado** (VMM é o padrão; ANCREF só quando o Dr. Victor pede, e o SAGA pergunta antes).",
            "Faltou dado? Em **Ler documentos para preencher**, solte o RG ou CNH, o comprovante de residência, o requisitório, o espelho ou o contracheque (PDF com texto, PDF escaneado ou foto), ou clique em [[Ler da pasta do cliente]]. A leitura é feita no seu computador.",
            "O SAGA mostra o que achou e **de onde veio** cada dado (arquivo, página e o trecho). Ele só oferece o que está **vazio** ou faltando (estado civil, profissão, CPF, endereço completo com CEP); o que já está preenchido vem desmarcado. Marque o que confere e clique em [[Usar os marcados]] (ou [[Descartar]]).",
            "Os campos preenchidos pela leitura ficam com **contorno amarelo** e a origem embaixo. Confira com o documento.",
            "Clique em [[Baixar Word]] ou [[Baixar PDF]]. O que faltar sai **destacado** (amarelo no Word, laranja no PDF, entre colchetes) para completar. A petição vai para a pasta **Petições** do cliente e fica no Registro de atividades."
          ],
          atencao: ["O que o leitor tira da imagem pode ter erro de leitura: confira cada número.", "O texto lido de um documento da pasta fica guardado no SAGA (não precisa ler de novo) e a Renata usa essa leitura nas petições dela. O CPF lido nunca vale: vale sempre o da ficha."]
        },
        { id: "calculo", titulo: "Cálculo do PSS lendo os documentos",
          quando: "Para fazer ou conferir o cálculo do PSS de um processo (só quem tem a permissão de cálculos).",
          passos: [
            "Na ficha, no processo do PSS, clique em [[Fazer petição]] e depois em [[Fazer o cálculo do PSS (preenche os valores)]] (ou [[Ver ou refazer o cálculo do PSS]], se já existe um).",
            "Em **Ler os documentos**, solte o **requisitório**, o **espelho do tribunal** e o **demonstrativo** (PDF com texto, escaneado ou foto) ou clique em [[Ler da pasta do cliente]]. Sem cálculo salvo, o SAGA já tenta ler sozinho os documentos da pasta pelo nome do arquivo.",
            "Os valores lidos entram com **contorno amarelo** e, embaixo de cada um, **de onde veio** (arquivo, página e trecho; \"lido da imagem: confira\" quando veio de PDF escaneado). Também entram o beneficiário, o processo de execução, o assunto e se há cessão.",
            "**SELIC**: use o link [[Abrir a Calculadora do Cidadão com estas datas]] e digite o percentual (é a fonte que vale). [[Ou buscar a SELIC no Banco Central]] mostra a conta do Banco Central só para conferir; se as duas baterem, [[Usar este percentual]].",
            "[[Salvar rascunho]] guarda sem valer. [[Conferi: salvar no processo]] grava a versão conferida, com o seu nome (cada salvar é uma versão nova; nada se apaga). O cálculo conferido preenche as petições e marca o processo como apto ou sem direito.",
            "[[Resumo em PDF]] tira o resumo. [[Planilhas do cálculo ↗]] abre as **Planilhas do PSS** (veja a parte \"Editor de planilhas e Planilhas do PSS\")."
          ]
        },
        { id: "planilhas_textos", titulo: "Planilhas e textos do SAGA (na ficha)",
          quando: "Para fazer uma planilha com fórmulas ou um texto livre ligado ao processo, sem sair do SAGA.",
          passos: [
            "Em **Pastas do cliente**, o quadro **Planilhas e textos do SAGA** lista o que já foi feito para o processo aberto.",
            "[[+ Planilha]]: abre o **Editor de planilhas** (fórmulas como no Excel; veja o capítulo Cartas, buscas, teses, perfis e PDF).",
            "[[+ Texto livre]]: abre uma folha para escrever qualquer texto no papel timbrado; depois, baixar em Word ou PDF.",
            "[[Planilhas do PSS]]: monta as planilhas do PSS a partir do cálculo conferido do processo (ou abre as que já existem).",
            "Tudo fica com **versões**: cada salvar guarda uma versão nova e nada se perde."
          ]
        },
        { id: "localizacao", titulo: "Localização: achar e contatar o cliente e os parentes",
          quando: "Quando o colaborador precisa achar o cliente (ou um parente) para conversar.",
          passos: [
            "Clique em **Localização** na ficha.",
            "Há um bloco para o cliente e um para cada parente ([[+ Parente]]): telefones, e-mails e endereços. Grave tudo o que encontrar.",
            "[[Pedir busca]]: pede ao Administrativo uma consulta (Lemit, Data Solution) do cliente e/ou dos parentes escolhidos. Você recebe o aviso no sino quando ficar pronta e confere as informações antes de gravar.",
            "[[Ler consulta (PDF, print ou texto)]] (também no topo da ficha, ao lado de Contatos): se você mesmo tem a consulta, o SAGA lê e preenche só o que está vazio na ficha. Pode ser o **PDF** (solte ou escolha), o **print da tela** ou o texto copiado.",
            "Ao gravar a consulta do **próprio cliente**, os telefones, e-mails e endereços novos vão para a Localização **e para os contatos do alto da ficha** (marcados \"Não validado\" até alguém confirmar; o que já existe não é repetido). O SAGA anota no processo um comentário curto, por exemplo \"Consulta Lemit lida em 21/11: +2 telefones, +1 e-mail no alto da ficha\". O arquivo **não é guardado**.",
            "**Pelo print**: na tela da Lemit ou da Data Solution, tire o print com **Win+Shift+S** (no Windows) e, na janela do SAGA, aperte **Ctrl+V**. A consulta tem mais de uma tela? Tire um print de cada parte e cole um depois do outro (aparecem as miniaturas; o ✕ tira um). Clique em [[Ler]] e confira: o SAGA lê no seu computador e não guarda as imagens.",
            "**Enviar carta**: manda o endereço para a fila da tela Cartas."
          ],
          img: "ficha_localizacao",
          marcas: ["De quem é a consulta (o cliente ou um parente).", "Solte, escolha ou cole (Ctrl+V) o PDF ou os prints: aparecem as miniaturas.", "O ✕ tira um print.", "Ou cole o texto da consulta.", "Ler: o SAGA lê aqui no navegador e mostra para você conferir antes de gravar."],
          atencao: ["CPF da consulta diferente do CPF da ficha: tudo vem desmarcado. Confira antes de gravar.", "Lido de print: confira cada número com atenção (a leitura de imagem pode trocar um dígito). Use o zoom do navegador em 100% ou mais antes de tirar o print.", "Renda, score, consumo, veículos e empresas NÃO entram no SAGA (LGPD), venham do PDF ou do print."]
        },
        { id: "pagamentos", titulo: "Pagamentos e parcelas do cliente",
          quando: "Quando o cliente paga em parcelas (honorários parcelados, acordo, Pix todo mês) ou recebe parcelas de alguém (pensão, acordo da outra parte). Vale também para cliente sem processo.",
          passos: [
            "Na ficha, coluna da direita, bloco **Pagamentos** (logo depois de Tarefas), clique em [[+ Novo pagamento]].",
            "Escolha o **tipo** (Honorários parcelados, Pensão alimentícia, Acordo da outra parte, Outro), o **processo** (ou \"Sem processo\"), quem paga, o **valor total** OU o **valor de cada parcela**, o **nº de parcelas**, o **1º vencimento** e se repete **Mensal**, **Quinzenal** ou **Semanal**. Clique em [[Criar parcelas]]: o SAGA monta as parcelas sozinho.",
            "O cartão mostra quanto foi **pago**, quanto **falta**, a **próxima parcela** e, em vermelho, as **atrasadas**.",
            "Quando o cliente pagar, clique no quadradinho da parcela, informe a **data**, o **valor pago** e a **forma** (PIX, transferência...) e clique em [[Marcar como paga]]. A parcela é riscada e vai para **Pagas**.",
            "**Pagou a menos?** Digite o valor que entrou (ex.: R$ 300 numa parcela de R$ 500): aparece \"Faltaram R$ 200. O que fazer com a diferença?\". Escolha [[Somar na próxima parcela]] (a próxima fica maior), [[Criar uma parcela só com a diferença]] (escolha a data) ou [[Dar desconto]] (perdoa a diferença; escreva o motivo).",
            "**Pagou a mais?** Escolha [[Abater das próximas parcelas]] (as próximas ficam menores ou já pagas, como \"coberta pela parcela N\") ou [[Abater das últimas parcelas]] (o pagamento termina antes).",
            "Marcou errado? Clique de novo no quadradinho da parcela paga e confirme: ela volta para \"a pagar\" e o que foi feito com a diferença é desfeito.",
            "[[Extrato em PDF]] no cartão: todas as parcelas, o que foi pago, quando, os descontos e o que falta (bom para mandar ao cliente).",
            "O lápis do cartão muda o total, o número de parcelas ou as datas (só as que faltam pagar são refeitas); o lápis da parcela muda o vencimento ou o valor de uma só."
          ],
          dicas: ["Honorários parcelados: cada parcela paga entra sozinha no Financeiro como RECEBIDA, sem lançar à mão. Todas as parcelas do escritório ficam em Financeiro > Parcelas (a receber, atrasadas, pagas).", "Parcela vencida e não paga gera aviso no sino.", "Pelo SAGA no Claude dá para pedir: \"marque a parcela 3 do fulano como paga, R$ 300 no Pix, e some o resto na próxima\"."],
          atencao: ["Honorários: só quem lança no Financeiro registra e marca. Os outros tipos: quem edita processos.", "Só o administrador remove um pagamento (ele sai da ficha, mas o histórico fica). Tudo fica no Registro de atividades."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "intimacoes", titulo: "Intimações e andamentos", quem: "Jurídico e administrador",
      resumo: "As publicações dos tribunais chegam sozinhas. A equipe faz a triagem, marca o prazo e cria a tarefa.",
      secoes: [
        { id: "como", titulo: "Como as intimações chegam",
          quando: "Para entender de onde vem cada intimação.",
          passos: [
            "**Diário eletrônico (CNJ)**: o SAGA procura de hora em hora, todos os dias do ano, pelas OABs cadastradas em **OABs monitoradas**.",
            "**E-mail dos tribunais** (PJe, e-Proc, e-SAJ, Recorte Digital): lidos 4 vezes por dia da caixa de e-mail do escritório. O que já veio pelo CNJ não se repete.",
            "Intimação com número de processo cadastrado entra direto no processo; sem processo, fica em **Fora do SAGA**.",
            "Ao abrir a intimação de um processo cadastrado, o quadro **Resumo do agente** mostra a situação, o **próximo passo**, o prazo e a última movimentação que o agente deixou na ficha do processo. Se a intimação é mais nova que o resumo, o SAGA avisa para conferir ou usar [[Pedir ao agente]]. Sem resumo, o quadro avisa que o agente ainda não leu o processo."
          ]
        },
        { id: "tela", titulo: "A tela de Intimações",
          quando: "Todo dia, ao começar e ao longo do dia.",
          passos: [
            "Abra **Intimações**. No alto: chegaram ou publicadas hoje, abertas, prazos vencidos, **Prazo vencendo (até 3 dias úteis)** e fora do SAGA. Clique num número para filtrar.",
            "No cartão, a linha da **Luísa** (a agente que classifica as intimações) diz o que é a intimação, o prazo em **dias úteis** e até quando, e quanto falta: **verde** mais de 3 dias úteis, **amarelo** de 1 a 3, **vermelho** vencendo ou vencido. **(sugestão)** quer dizer que a classificação ainda espera a aprovação do Dr. Victor em Para aprovar; o prazo posto pela equipe vale sobre o dela (aparece \"da equipe\").",
            "Veja em **Kanban** (uma coluna por tribunal) ou **Lista**. Use **Só as novas** para ver o que ainda não foi tratado.",
            "A **Justiça Federal** fica na coluna do **TRF** da região, com a **etiqueta do estado** no cartão (ex.: no TRF-2, **RJ** ou **ES**). Tribunal sem intimação aberta fica **oculto** (veja a parte seguinte).",
            "Filtros: situação, período, tribunal, OAB, triagem e a busca (processo, parte, vara, etiqueta ou texto).",
            "[[Trazer para o SAGA em lote]]: cadastra de uma vez os processos das intimações que estão fora do SAGA (um por número)."
          ],
          img: "intimacoes",
          marcas: ["Prazo vencendo (até 3 dias úteis): clique para filtrar.", "Linha da Luísa: o que é, prazo em dias úteis, até quando e quanto falta (verde, amarelo ou vermelho).", "(sugestão): a classificação ainda espera a aprovação do Dr. Victor.", "Trazer para o SAGA em lote."]
        },
        { id: "colunas", titulo: "Tribunais, estados e colunas ocultas",
          quando: "Para achar rápido as intimações de cada tribunal e saber de qual estado elas vêm.",
          passos: [
            "Cada **tribunal** tem a sua coluna. A Justiça Federal do Rio de Janeiro e a do Espírito Santo ficam na coluna do **TRF-2**; a do Rio Grande do Sul, a do Paraná e a de Santa Catarina, no **TRF-4**; e assim por diante.",
            "No cartão, a **etiqueta do estado** (RJ, ES, RS, AL...) mostra de qual Justiça Federal a intimação veio. O **número do processo** (com pontos e traço) e a **etiqueta** ficam sempre à vista: use o Ctrl+F do navegador para achar um processo pelo número.",
            "Tribunal sem nenhuma intimação aberta fica **oculto** e volta sozinho quando chega intimação nova. A linha em cima do quadro diz quais estão ocultos: clique no nome para mostrar ou em [[Mostrar todos]].",
            "Para ver as já resolvidas, use **Concluídas** ou **Ver concluídas** no fim de cada coluna."
          ],
          img: "intimacoes_tribunais",
          marcas: ["Tribunais sem intimação aberta (ocultos): clique no nome para mostrar.", "Coluna do TRF-2 (Justiça Federal do RJ e do ES).", "Etiqueta do estado no cartão.", "Links dos tribunais (o link de cada seção)."]
        },
        { id: "tratar", titulo: "Tratar uma intimação (triagem, prazo e tarefa)",
          quando: "Para cada intimação nova.",
          passos: [
            "Clique no cartão. Leia o texto (o SAGA destaca o prazo que encontrar). O quadro **Classificação da Luísa** mostra o que ela entendeu: o que é, o que fazer, o prazo em dias úteis e, se for o caso, a petição pedida à Renata.",
            "A mesma intimação pode chegar duas vezes: pelo **e-mail do tribunal** e pelo **CNJ (Diário eletrônico)**. A do CNJ que repete uma do e-mail não vira outro cartão: fica ligada à do e-mail, em **Também chegou pelo CNJ** (com o link do documento oficial), sem tarefa nem aviso novo.",
            "**Triagem**: tem algo a fazer? Clique em [[Criar tarefa]]. Não exige nada? Clique em [[Vista (nada a fazer)]].",
            "**Prazo**: o SAGA sugere pelo texto (ex.: 15 dias) e conta em **dias úteis** (sem sábados, domingos, feriados do escritório e o recesso de 20/12 a 20/01). Use os atalhos 5, 10, 15, 30 ou escolha a data.",
            "**Etiqueta** (o que fazer) e a cor; depois [[Salvar prazo e etiqueta]].",
            "Comente para a equipe e, quando terminar, clique em [[Concluir]].",
            "[[Abrir processo no tribunal]] copia o número e abre a consulta. No processo de 1º grau da Justiça Federal, o primeiro link é o da **seção do estado** (ex.: e-Proc da JFRJ) e o segundo, o do TRF (2º grau). **Abrir ficha do cliente** leva ao processo no SAGA."
          ],
          img: "intimacao_aberta",
          marcas: ["Abrir processo no tribunal.", "Comentar.", "Criar tarefa.", "Prazo (dias úteis).", "Salvar prazo e etiqueta."]
        },
        { id: "andamentos", titulo: "Andamentos do CNJ (todos os processos)",
          quando: "Para ver de uma vez o que andou nos processos do escritório.",
          passos: [
            "Em Intimações, clique em [[Andamentos do CNJ]].",
            "Escolha o período (7, 30 ou 90 dias) e, se quiser, **Só os importantes**.",
            "Clique num andamento para abrir a ficha no processo (Ctrl+clique abre em outra aba).",
            "O robô roda de madrugada. O administrador liga ou desliga o robô, testa a ligação e manda **Carregar tudo agora** por esta janela."
          ],
          img: "andamentos_janela",
          marcas: ["Robô dos andamentos (administrador).", "Período.", "Só os importantes.", "Andamento: clique para abrir a ficha."]
        },
        { id: "tribunais", titulo: "OABs monitoradas e links dos tribunais",
          quando: "Quando entra advogado novo no escritório ou um tribunal muda o endereço da consulta.",
          passos: [
            "**OABs monitoradas**: cadastre a OAB e a UF de cada advogado do escritório.",
            "**Links dos tribunais**: o endereço da consulta processual de cada tribunal (é o que o botão do tribunal abre). Mais de um link para o mesmo tribunal vira um menu.",
            "**Seção da Justiça Federal no e-Proc** (cada estado tem o seu endereço): cadastre com **JF + estado** (ex.: JFRJ, JFES, JFRS). Quando chega uma seção nova, o SAGA cria sozinho o lugar marcado **(configurar)** e avisa no sino: é só trocar pelo link certo e salvar.",
            "Só quem tem permissão mexe nessas listas."
          ]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "agentes", titulo: "Para aprovar (Escritório de agentes)", quem: "Dr. Victor e Hevelyn (permissão Aprova o trabalho dos agentes)",
      resumo: "O escritório tem duas agentes que trabalham dentro do SAGA: a LUÍSA organiza (classifica o que chega, confere o sistema todo dia e revisa as petições) e a RENATA faz as petições. Tudo o que elas fazem chega em Meu dia > Para aprovar. Nada sai para fora sem aprovação de uma pessoa.",
      secoes: [
        { id: "aprovar", titulo: "Aprovar, mandar ajustar ou reprovar",
          quando: "Todo dia, e sempre que o número aparecer ao lado de Para aprovar no menu (vermelho = prazo em até 2 dias ou urgente).",
          passos: [
            "Abra **Meu dia > Para aprovar**. Cada cartão é uma entrega: a **Luísa** classifica o que chega (intimação, andamento importante do CNJ, pedido da equipe) e entrega o relatório da **manutenção** do dia; a **Renata** entrega as petições. Os botões [[Luísa]], [[Renata]] e [[Luísa: manutenção]] no alto filtram a lista.",
            "Leia **O que é**, **O que fazer**, **Prazo** (em dias úteis; o SAGA calcula a data pela publicação no DJEN, sem os feriados próprios do tribunal: confira) e **Ao aprovar** (o que vai acontecer).",
            "[[Aprovar]]: faz o que está em Ao aprovar (por exemplo, cria a tarefa para o responsável do processo, com o prazo). No relatório da manutenção o botão é [[Ciente]].",
            "[[Mandar ajustar]]: escreva o que está errado ou faltando. A agente refaz na próxima rodada e a entrega volta como **Versão 2**, mostrando o seu pedido de ajuste.",
            "[[Reprovar]]: escreva o motivo. A entrega para e o motivo serve para a agente não repetir o erro.",
            "Várias entregas parecidas: marque as caixinhas e use [[Aprovar os marcados]].",
            "Em **Voltaram para ajuste** ficam as que esperam a agente refazer; em **Decididas**, o histórico dos últimos 60 dias (quem decidiu e quando)."
          ],
          img: "agentes_aprovar",
          marcas: ["Filtro por agente: Luísa, Renata e Luísa: manutenção.", "Recados e Relatório (PDF), no alto.", "Entrega da Luísa: o que é, o que fazer, prazo e o que acontece ao aprovar.", "Aprovar, Mandar ajustar ou Reprovar."],
          dicas: ["No rodapé aparece a **aprovação de primeira** de cada agente nos últimos 30 dias: é a medida de qualidade do Escritório de agentes.",
                  "Se aprovar der erro, a mensagem aparece e nada é gravado pela metade: tente de novo ou mande ajustar."]
        },
        { id: "renata_pedidos", titulo: "Pedidos para a Renata: Pode fazer, Depois ou Não fazer",
          quando: "Quando a Luísa (pela intimação), o cálculo do PSS conferido ou alguém da equipe pede uma petição. A Renata só começa depois do seu \"Pode fazer\".",
          passos: [
            "Em **Para aprovar**, desça até o quadro **Pedidos para a Renata**. As abas [[Aguardando sua aprovação]], [[Depois]] e [[Na fila da Renata]] separam os pedidos.",
            "Cada pedido mostra etiquetas: o **tipo** (impulso processual, manifestação, inicial do PSS...), a **prioridade**, o **prazo**, há quanto tempo o processo está **parado** e o **porquê** (o que a Luísa viu na intimação).",
            "Abra **Plano da peça** para ver a ideia ANTES de a Renata escrever: que peça é, o que vai pedir, a quem é endereçada, o modelo, o papel timbrado, os fundamentos e o que falta ou está incerto.",
            "[[Pode fazer]]: manda para a fila da Renata. Na janela, escreva a **orientação** se quiser mudar algo do plano (a quem endereçar, pedido a incluir, outro modelo ou timbrado): ela vale como instrução obrigatória para a Renata, e a Luísa confere se foi seguida.",
            "[[Depois]]: tira da fila e guarda o pedido (volta quando você quiser, pela aba Depois). [[Não fazer]]: cancela, com o motivo se quiser (nada é apagado).",
            "Vários pedidos de uma vez: marque as caixinhas e use os mesmos botões; a mesma orientação vale para todos os marcados.",
            "A Renata trabalha de hora em hora (aos 35 minutos, das 7h às 19h e às 21h), na ordem de prioridade e prazo. Em **Na fila da Renata** você acompanha: na fila, sendo preparada, na revisão da Luísa, voltou para ajuste ou com erro (com o motivo)."
          ],
          img: "agentes_renata",
          marcas: ["Pedidos para a Renata: aguardando, depois e na fila.", "Etiquetas do pedido: tipo, prioridade, prazo, parado há quanto tempo.", "Plano da peça: a ideia antes de escrever.", "Pode fazer, Depois e Não fazer."],
          atencao: ["Recurso, contrarrazões e memoriais não vão para a Renata: precisam dos autos inteiros.", "Papel timbrado: VMM é o padrão; Sarmento quando o cliente veio do parceiro SCS; ANCREF só quando o Dr. Victor pede."]
        },
        { id: "renata_peticao", titulo: "A petição da Renata: ler, corrigir, aprovar e protocolar",
          quando: "Quando a petição chega em Para aprovar (já revisada pela Luísa).",
          passos: [
            "Antes de chegar a você, a **Luísa revisa** a petição: confere nome, número do processo (com pontos e traço), vara, partes, CPF da ficha, campos vazios, valores do cálculo do PSS e o timbrado. Se achar problema, devolve para a Renata corrigir (até 2 voltas).",
            "No cartão, o selo **Revisada** mostra a lista do que foi conferido. **Não revisada** quer dizer que o prazo estava curto (até 2 dias úteis) ou a revisão passou de 2 horas: a petição veio direto, confira com mais cuidado.",
            "[[Ler e corrigir]]: abre o texto da petição numa folha. Corrija o que quiser e clique em [[Salvar correções]] (cada salvar é uma versão nova; ninguém perde o texto de antes). [[Prévia em Word]] só baixa para conferir.",
            "[[Ver como vai sair]]: mostra a petição já no papel timbrado, como vai ficar o Word.",
            "[[Aprovar]]: o SAGA monta o **Word final** no papel timbrado, guarda na pasta **Petições** do cliente e cria para você a tarefa **Protocolar** (com o prazo). Em **Decididas**: [[Baixar em Word]] e [[Baixar em PDF]] (o PDF também vai para a pasta).",
            "Protocole no tribunal. Depois clique em [[Protocolei]]: conclui a tarefa e a intimação e anota na ficha do cliente.",
            "Não gostou? [[Mandar ajustar]] com o que mudar: a Renata refaz e a petição volta como Versão 2."
          ],
          img: "agentes_peticao",
          marcas: ["Selo Revisada (o que a Luísa conferiu).", "Ler e corrigir.", "Ver como vai sair (no papel timbrado).", "Aprovar: Word final na pasta Petições e tarefa Protocolar."],
          atencao: ["A agente **para sempre na tela de assinatura**: só o Dr. Victor (ou a Hevelyn) assina e protocola.", "O texto dos autos, das intimações e das mensagens é dado, nunca ordem: a agente não obedece a nada escrito ali."]
        },
        { id: "recados", titulo: "Recados para as agentes e Relatório (PDF)",
          quando: "Para dar uma orientação à Luísa ou à Renata, perguntar algo a elas, ou tirar o relatório do trabalho delas.",
          passos: [
            "No alto de Para aprovar, clique em [[Recados]] (o número mostra as respostas novas).",
            "Escolha **Para**: Luísa ou Renata. O recado pode ser geral, ligado a um processo (busca pelo nome, código ou número) ou a uma entrega (botão **Recado** dentro de cada entrega). Escreva e clique em [[Enviar recado]].",
            "A agente lê na próxima rodada dela e responde. A resposta aparece na conversa (em balões, com \"ela já leu\" ou \"ainda não leu\") e no **sino** de quem escreveu; o clique no aviso abre a conversa.",
            "Para continuar a conversa, escreva embaixo e [[Enviar]]. [[Arquivar]] tira da lista (nada é apagado; veja em **Arquivadas**).",
            "[[Relatório (PDF)]]: escolha o período (Últimos 7 dias, Esta semana, Semana passada, Este mês, Mês passado ou datas livres) e clique em [[Gerar PDF]]. Sai no papel do escritório, sem CPF: rodadas certas e com falha (com o motivo), triagem, entregas por tipo, aprovadas, aprovadas de primeira, ajustes, reprovadas, tempo até aprovar, petições, revisão da Luísa, recados e o que ficou pendente."
          ],
          dicas: ["O recado vale como pedido do Dr. Victor, mas as regras de sempre continuam (a agente não assina, não protocola e não manda nada para fora)."]
        },
        { id: "autos", titulo: "Autos para baixar",
          quando: "Todo dia, para baixar os autos dos processos que as agentes ainda não conhecem (sem o resumo do agente) ou que mudaram (intimação ou andamento novo).",
          passos: [
            "Abra **Processos > Autos para baixar** (Dr. Victor, Hevelyn e quem faz petições).",
            "A fila vem em ordem de importância: (1) intimação aberta ou peça pedida, (2) resumo a atualizar, (3) intimação nos últimos 60 dias, (4) impulso processual, (5) os demais. Use as pílulas para ver um **tribunal** só.",
            "**Lote de hoje**: os primeiros da fila, até o limite do dia (padrão 5; só o administrador muda em [[Limite por dia]]). [[Copiar números]] copia os números para colar no site do tribunal.",
            "[[Vou baixar]] marca que você pegou o processo (os outros veem). Baixou? Solte os autos na pasta **01 Entrada** dos Agentes VMMADV e clique em [[Baixei]].",
            "Não precisa baixar? [[Dispensar]] com o motivo. Errou? [[Voltar à fila]].",
            "Quando o resumo do agente chega ao SAGA, o processo **sai da fila sozinho**."
          ],
          img: "autos_baixar",
          marcas: ["Pílulas por tribunal.", "Lote de hoje e Copiar números.", "Faixa de prioridade do processo.", "Vou baixar, Baixei e Dispensar."],
          atencao: ["Senha, código do autenticador e token do tribunal NUNCA passam pelo SAGA nem pelo Claude: o download é no seu navegador já logado no tribunal.", "Cada leitura de autos gasta o uso da assinatura do Claude: lotes pequenos."]
        },
        { id: "regras", titulo: "Regras do Escritório de agentes",
          quando: "Para saber o que as agentes podem e não podem fazer.",
          passos: [
            "Nada sai para fora (protocolo, e-mail, WhatsApp, cliente) sem aprovação de uma pessoa. Nenhuma petição começa sem o \"Pode fazer\" do Dr. Victor.",
            "No protocolo, a agente deixa tudo pronto no sistema do tribunal e **para na tela da assinatura**: só o Dr. Victor (ou a Hevelyn) põe o token e assina.",
            "Senhas dos tribunais ficam só no gerenciador de senhas do Chrome/Google de quem usa; nunca no chat, no SAGA, nas Notas ou no conector. O código do autenticador e o token ficam com quem assina.",
            "As agentes não apagam nada (só o administrador apaga) e cada coisa que fazem fica no Registro de atividades com o nome delas.",
            "O administrador escolhe, no fim da tela Para aprovar (**O que os agentes fazem sozinhos**), o que pode rodar sem aprovação (por exemplo, atualizar o resumo interno); o resto passa pela aprovação.",
            "A **manutenção** da Luísa só lê: aponta dados errados e não conserta nada. O que a equipe precisa completar (cliente sem CPF, processo protocolado sem número, número CNJ com dígito errado) vira UMA tarefa por responsável, **Manutenção: completar dados (N)**, refeita todo dia às 6h40 e concluída sozinha quando a lista zera.",
            "Antes de agir num processo, as agentes leem o **contexto** dele no SAGA (resumo do agente, intimações, andamentos, comentários, tarefas, documentos já lidos, cálculo). Processo sem resumo ou com resumo velho vai para **Autos para baixar**.",
            "As agentes aparecem na **Saúde do sistema** (Configurações): verde funcionando, amarelo erro passageiro, vermelho parado ou com erro repetido (avisa o administrador no sino)."
          ]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "tarefas", titulo: "Minhas Tarefas", quem: "Todos",
      resumo: "O que cada um tem a fazer, com prazo e responsável.",
      secoes: [
        { id: "visao", titulo: "Ver e organizar as tarefas",
          quando: "Todo dia, ao começar, e sempre que receber tarefa nova.",
          passos: [
            "Abra **Minhas Tarefas**. A tela abre enxuta: em cima, [[Kanban]] / [[Lista]], [[Mostrar resumo]] e [[Nova Tarefa]]. O número vermelho ao lado de Mostrar resumo é quantas tarefas estão **atrasadas**.",
            "[[Mostrar resumo]] abre os números (total, novas, em andamento, atrasadas e concluídas hoje; clique para filtrar), os gráficos e o calendário dos prazos. [[Esconder resumo]] recolhe. O SAGA lembra a sua escolha neste computador.",
            "Logo abaixo fica a **barra de filtros**: busca, [[Etiqueta]], responsável e prazo. Os outros (tipo, situação, prioridade, tribunal e fase) ficam em [[Mais filtros]]; o número no botão mostra quantos estão ligados lá dentro. Cada filtro ligado aparece como uma etiqueta clicável embaixo (o × tira) e [[Limpar filtros]] tira todos.",
            "No cartão aparece só o essencial: etiqueta, título, situação (Nova, Em andamento...), cliente, **número do processo** (sempre à vista, com o botão do tribunal; o Ctrl+F do navegador acha o processo pelo número), subtarefas, responsável e prazo (a prioridade só quando é alta ou urgente). Passar o mouse não aumenta o cartão (ele fica sempre do mesmo tamanho): o resto (tipo, quem passou a tarefa, compartilhamento e os atalhos [[Ficha]] e [[Intimações]]) aparece ao clicar no cartão, na janela da tarefa.",
            "As tarefas de **dar impulso processual** (que o SAGA cria nos processos parados) têm a **etiqueta** \"Dar impulso processual\": escolha no menu [[Etiqueta]] como qualquer outra. Os **Pedidos do Saga IA** ficam como atalho no alto do mesmo menu. No filtro **Tipo** (em Mais filtros) há também **Sem as de impulso**.",
            "**Manutenção: completar dados (N)**: tarefa que a Luísa (manutenção do SAGA) cria todo dia às 6h40 para cada responsável, com a lista do que falta completar nos processos dele (cliente sem CPF, processo protocolado sem número, número com dígito errado). Completou tudo? Ela se conclui sozinha no dia seguinte.",
            "**No celular**, os filtros ficam guardados no botão [[Filtros]] ao lado da busca (assim os cartões aparecem logo). Um ponto no botão avisa que há filtro ligado.",
            "No Kanban, cada tarefa de processo fica na **coluna do tribunal** daquele processo (veja a parte seguinte)."
          ],
          img: "tarefas",
          marcas: ["Nova Tarefa.", "Mostrar resumo (números, gráficos e calendário); o número vermelho são as atrasadas.", "Etiqueta: o menu de etiquetas.", "Mais filtros: tipo, situação, prioridade, tribunal e fase.", "Tarefa da Manutenção: a lista do que falta completar nos seus processos."]
        },
        { id: "celular", titulo: "Minhas Tarefas no celular",
          quando: "Quando você abre as tarefas pelo celular.",
          passos: [
            "No celular, a busca fica à vista e os outros filtros (etiqueta, responsável, prazo e Mais filtros) ficam guardados no botão [[Filtros]], ao lado da busca. Assim os cartões aparecem logo.",
            "Toque em [[Filtros]] para abrir ou fechar. Um ponto no botão avisa que há algum filtro ligado.",
            "Arraste o quadro para o lado para ver as outras colunas (tribunais)."
          ],
          img: "tarefas_celular",
          marcas: ["Filtros: abre e fecha os filtros (o ponto aparece quando há filtro ligado)."]
        },
        { id: "etiquetas", titulo: "Filtrar e criar etiquetas",
          quando: "Para ver só as tarefas de um assunto (ex.: cumprimento, aguardando documento) ou criar uma etiqueta nova.",
          passos: [
            "Clique em [[Etiqueta]] na barra de filtros. O menu mostra cada etiqueta com a quantidade de **tarefas abertas** dela.",
            "Marque uma ou várias: a lista filtra na hora (aparecem as tarefas com qualquer uma das marcadas). Clique de novo para desmarcar, ou em [[Limpar etiquetas]].",
            "No alto do menu fica o **atalho** [[Pedidos do Saga IA]]: mostra só essas tarefas e pode ser combinado com as etiquetas (a setinha ↗ abre a tela própria deles). **Dar impulso processual** é uma etiqueta da lista, como as outras.",
            "Para criar (só o administrador): [[+ Nova etiqueta]], escreva o nome (até 40 letras), escolha a cor e [[Salvar etiqueta]]. Ela já aparece no menu e na janela da tarefa.",
            "Para renomear ou mudar a cor: o lápis ✎ ao lado da etiqueta. Para tirar da lista, desmarque **Mostrar na lista**: as tarefas que já têm a etiqueta continuam com ela (o histórico fica). As tiradas aparecem em [[Ver as tiradas da lista]], e o lápis volta qualquer uma para a lista.",
            "Para mudar a ordem (só o administrador): as setinhas ▲ ▼ ao lado de cada etiqueta sobem ou descem uma posição; a nova ordem vale no menu e na janela da tarefa.",
            "Para pôr a etiqueta numa tarefa: abra a tarefa e escolha em **Etiqueta**, na parte da direita."
          ],
          img: "tarefas_etiquetas",
          marcas: ["Dar impulso processual: uma etiqueta como as outras (o atalho Pedidos do Saga IA aparece no alto do menu quando há pedidos).", "Quantas tarefas abertas têm a etiqueta.", "Setas ▲▼ (ordem) e lápis (renomear, cor ou tirar da lista): só o administrador.", "+ Nova etiqueta (só o administrador)."],
          dicas: ["Se aparecer \"Já existe uma etiqueta com esse nome\", use a que já existe (ou veja em Ver as tiradas da lista: pode estar só fora da lista)."]
        },
        { id: "colunas", titulo: "Colunas por tribunal e colunas ocultas",
          quando: "Para entender onde cada tarefa aparece no Kanban.",
          passos: [
            "A coluna de toda tarefa de processo é a do **tribunal**, tirado do número do processo. A Justiça Federal fica na coluna do **TRF** da região, nunca numa coluna da seção ou da vara (ex.: Justiça Federal do RJ ou do ES vai para o **TRF-2**).",
            "No cartão, a **etiqueta do estado** (RJ, ES, AL...) mostra de qual Justiça Federal o processo é. O botão ao lado do número **copia o número e abre o processo no tribunal**, para consultar ou peticionar (no e-Proc, primeiro o link da seção do estado). O mesmo atalho fica na **Lista**, ao lado do número, e na janela da tarefa, em **Site do tribunal** ([[Ver no TRF-5]] ou o tribunal do processo). Clicar nele não abre a tarefa.",
            "Tarefa criada pelo sistema (robô das intimações, processos parados, ficha) já nasce na coluna do tribunal. Tribunal novo ganha a coluna sozinho.",
            "Processo **sem número** fica na coluna **Sem número do processo**; quando alguém cadastra o número, a tarefa passa sozinha para o tribunal.",
            "Coluna sem tarefa aberta fica **oculta** e volta sozinha quando chega tarefa nova. A linha em cima do quadro mostra as ocultas: clique no nome para mostrar ou em [[Mostrar todas]]. Coluna que você mostrou volta a se ocultar pelo menu dela (**Ocultar quando estiver vazia**).",
            "Arraste o cartão para outra coluna quando precisar. O administrador cria, renomeia e muda a ordem das colunas."
          ],
          img: "tarefas_colunas",
          marcas: ["Colunas sem tarefa aberta (ocultas): clique no nome para mostrar.", "Mostrar todas.", "Etiqueta do estado e botão do tribunal.", "Coluna do tribunal (TRF-2)."],
          dicas: ["Tarefa sem coluna aparece numa coluna \"Sem coluna\": arraste cada uma para a coluna certa."]
        },
        { id: "nova", titulo: "Criar uma tarefa",
          quando: "Quando surge algo a fazer: para você ou para um colega.",
          passos: [
            "Clique em [[Nova Tarefa]] (ou crie pela intimação, pela ficha ou pelo cartão).",
            "Escreva o **título** do que precisa ser feito (ex.: Protocolar petição de cumprimento de sentença).",
            "**Pessoal** ou **Vinculada a processo** (escolha o processo). Descrição, se precisar.",
            "A janela tem duas partes: à esquerda, **o que fazer** (tipo, processo, descrição, subtarefas, anexos e comentários); à direita, **os detalhes** (coluna, responsável, prazo, status, prioridade, etiqueta, outros responsáveis e compartilhar). No celular, os detalhes vêm logo depois do título.",
            "**Coluna**: deixe **Automática (tribunal do processo)** ou escolha uma (as colunas ocultas também aparecem na lista). Tarefa pessoal precisa de uma coluna escolhida.",
            "**Responsável**, outros responsáveis e com quem compartilhar.",
            "**Prazo**: Hoje, Amanhã, Esta semana ou a data (o SAGA mostra o prazo em dias úteis).",
            "Clique em [[Salvar Tarefa]]. O responsável recebe o aviso no sino."
          ],
          img: "nova_tarefa",
          marcas: ["Título da tarefa.", "Pessoal ou vinculada a processo.", "Coluna: Automática (tribunal do processo).", "Prazo.", "Salvar Tarefa."],
          dicas: ["Tarefa ligada a processo, quando concluída, atualiza a providência do processo."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "agenda", titulo: "Agenda e atendimentos", quem: "Todos",
      resumo: "Compromissos pessoais e do escritório, e os atendimentos com clientes.",
      secoes: [
        { id: "visao", titulo: "Minha agenda e Agenda do escritório",
          quando: "Para ver compromissos, audiências, prazos e retornos.",
          passos: [
            "Abra **Agenda**. Escolha **Minha agenda** ou **Agenda do escritório** e o jeito de ver: Mês, Semana, Dia ou Lista.",
            "Na Agenda do escritório, filtre por **perfil** (Jurídico, Captação...) e por **pessoa**.",
            "As cores mostram o tipo (audiência, reunião, prazo, perícia, atendimento, retorno...)."
          ],
          img: "agenda",
          marcas: ["Novo Compromisso.", "Marcar atendimento com cliente.", "Meus horários de atendimento.", "Agenda do escritório."]
        },
        { id: "compromisso", titulo: "Marcar um compromisso",
          quando: "Audiência, reunião, perícia, prazo ou qualquer compromisso.",
          passos: [
            "Clique em [[Novo Compromisso]] (ou clique no dia).",
            "Preencha título, tipo, data e hora, e de quem é a agenda.",
            "**Particular** (só você e a pessoa da agenda veem) ou **Agenda do escritório** (todos veem). Compromisso ligado a processo vai sempre para o escritório.",
            "**Repetir**: todo dia, semana, mês ou ano, até uma data.",
            "Se o horário já estiver ocupado, o SAGA avisa antes de salvar."
          ]
        },
        { id: "atendimento", titulo: "Marcar atendimento com cliente",
          quando: "Quando o cliente quer conversar com o advogado (no escritório, por vídeo ou WhatsApp).",
          passos: [
            "Quem atende define antes os **Meus horários** (dias, faixas de horário, duração, local e link do Meet).",
            "Clique em [[Marcar atendimento]] (na Agenda ou na ficha do cliente).",
            "Escolha o **cliente** (precisa estar cadastrado; se não estiver, cadastre na Captação), **quem vai atender** e um **horário livre**.",
            "Escolha **Presencial** ou **Telepresencial**: WhatsApp precisa do telefone do cliente; Google Meet precisa do e-mail.",
            "Clique em [[Marcar atendimento]]. Quem atende recebe o aviso no sino.",
            "No dia, abra o evento: [[Abrir no WhatsApp]] ou [[Entrar no Meet]]. Depois, escolha a **resposta pronta** (ex.: Cliente atendido, Remarcar) e o atendimento é concluído. A conversa aparece também na ficha do cliente."
          ],
          img: "marcar_atendimento",
          marcas: ["Cliente (cadastrado).", "Quem vai atender.", "Horário livre.", "Presencial ou telepresencial.", "Marcar atendimento."]
        },
        { id: "celular", titulo: "Ver a agenda no celular (Google Agenda ou iPhone)",
          quando: "Para ter os seus compromissos do SAGA no calendário do celular, com lembrete.",
          passos: [
            "Na **Agenda**, clique em [[Ver no celular]].",
            "Escolha **Só a minha agenda** ou **A minha + a do escritório** e clique em [[Gerar meu link]].",
            "**Google Agenda**: no computador, abra calendar.google.com > **Outras agendas** > **+** > **Do URL**, cole o link e clique em **Adicionar agenda**. Em alguns minutos ela aparece também no app do celular. Para o lembrete, nos três pontinhos da agenda \"SAGA\" > Configurações > **Notificações de eventos** > 30 minutos.",
            "**iPhone**: toque em [[Abrir no iPhone]] e confirme **Assinar** (o lembrete de 30 minutos já vem junto).",
            "É **só leitura**: para marcar ou mudar, use o SAGA. O Google relê a agenda algumas vezes por dia; no SAGA tudo aparece na hora.",
            "O link é **pessoal**: não mande para ninguém. Perdeu o celular? [[Gerar link novo]] (desliga o antigo na hora) ou [[Desligar o link]].",
            "Para os colaboradores, o celular mostra só o **tipo e o código VMM** do compromisso (sem o nome do cliente).",
            "Além disso, o SAGA avisa no **sino** 30 minutos antes de cada compromisso seu (também em cada data de um compromisso que se repete, menos as já concluídas)."
          ],
          img: "agenda_celular",
          marcas: ["Ver no celular (na barra da Agenda).", "O seu link pessoal, com Copiar.", "Passo a passo do Google Agenda.", "Abrir no iPhone (assinar direto).", "O que entra: só a sua agenda ou a sua + a do escritório.", "Gerar link novo (desliga o antigo) ou Desligar o link."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "comunicacao", titulo: "Chat, Notas e Sugestões", quem: "Todos",
      resumo: "Conversar com a equipe, guardar anotações e sugerir melhorias para o sistema.",
      secoes: [
        { id: "chat", titulo: "Chat Interno",
          quando: "Para falar com um colega ou com um grupo sem sair do SAGA.",
          passos: [
            "Abra **Chat Interno**. Escolha a conversa na lista (Todas, Individuais, Grupos) ou clique em [[+ Nova conversa ou grupo]].",
            "Na conversa nova, a **lista dos colegas** já aparece aberta: em **Conversa Direta**, clique em uma pessoa; em **Grupo**, dê o nome e marque duas ou mais pessoas. Digite no campo para filtrar pelo nome. Num grupo que já existe, o administrador do grupo adiciona pessoas pela mesma lista.",
            "Escreva e envie. Use **@nome** para chamar alguém e anexe arquivos quando precisar.",
            "Cada conversa mostra quantas mensagens você ainda não leu e um **@** vermelho quando alguém marcou você. As abas **Não lidas** e **Marcações** (com o número) separam essas conversas. Ao abrir a conversa com marcação, a tela vai até a mensagem que marcou você e ela acende de leve; o aviso do sino sai sozinho.",
            "Assunto de cliente ou processo: registre também na ficha (comentário), para ficar no histórico do processo.",
            "Grupo **Recebimento de documentação** (Captação, Jurídico e administrador entram sozinhos): os arquivos que chegam aparecem com o selo **Documento** e o botão [[Mandar para a ficha]]: escolha o cliente, o processo (cartão) e a pasta, e o arquivo é copiado para a ficha. Não é documento de cliente? Marque e ele sai da fila. Guardar o 1º documento num cartão da Captação passa o cartão para o Jurídico (veja o capítulo Captação)."
          ],
          img: "chat",
          marcas: ["Buscar conversa.", "Nova conversa ou grupo."]
        },
        { id: "notas", titulo: "Notas, checklists e senhas",
          quando: "Para guardar uma anotação, uma lista de conferência ou um login/senha de sistema.",
          passos: [
            "Abra **Notas** e clique em [[+ Nova nota]]: escolha **Nota**, **Checklist** ou **Senha / link**.",
            "Ligue a nota a um cliente ou processo quando for sobre ele (aparece na ficha).",
            "Ícones do cartão: fixar no alto, compartilhar com colegas, arquivar.",
            "Veja **Todas**, **Minhas**, **Compartilhadas comigo** ou **Arquivadas**, em Cartões ou Lista."
          ],
          img: "notas",
          marcas: ["Nova nota (nota, checklist ou senha).", "Cartões ou lista.", "Notas compartilhadas com você."],
          atencao: ["Senha de sistema do escritório só em nota do tipo **Senha / link** (fica protegida). Nunca em comentário ou chat."]
        },
        { id: "sugestoes", titulo: "Sugerir uma melhoria ou uma aba nova",
          quando: "Quando o colaborador vê algo que pode ficar melhor, um erro, ou sente falta de uma aba.",
          passos: [
            "Abra **Sugestões de melhoria** no menu da esquerda (em Comunicação).",
            "Clique em [[+ Nova sugestão]], escolha a aba do sistema, escreva e cole até 6 prints (Ctrl+V).",
            "Veja as sugestões em **Cartões**, **Kanban** (uma coluna por situação) ou **Lista**. Todos comentam e apoiam (**Também quero**).",
            "Filtre pelos atalhos do alto (**Pendentes** = ainda não feitas, Aprovada, **Concluída** = ajuste feito, **Não aprovada** = recusada...), pela aba, por **quem sugeriu** ou pela busca.",
            "O Dr. Victor muda a situação, responde e arquiva. Quem sugeriu e quem apoiou recebem o aviso no sino."
          ],
          img: "sugestoes",
          marcas: ["Nova sugestão.", "Ver em Cartões, Kanban ou Lista.", "Atalhos por situação (Pendentes = ainda não feitas).", "Quem sugeriu (cada colaborador ou só as minhas)."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "operacao", titulo: "Cartas, buscas, teses, perfis e PDF", quem: "Conforme a permissão",
      resumo: "Telas de apoio da Operação.",
      secoes: [
        { id: "cartas", titulo: "Cartas para os clientes",
          quando: "Quando a Captação vai mandar carta para clientes que não atendem telefone.",
          passos: [
            "Na ficha > Localização, use **Enviar carta** no endereço: ele entra na fila **A enviar** da tela **Cartas**.",
            "Em **Cartas**, marque as linhas e use [[Imprimir cartas]] ou [[Imprimir etiquetas]]; elas passam para **Impressas**.",
            "Atualize a situação de cada carta: **Enviada**, **Devolvida** ou **Respondida**. A coluna Carta e o Contato da Captação mudam sozinhos (respondida leva para Conversando).",
            "[[Modelos de carta]]: os textos de cada tipo de ação."
          ],
          img: "cartas",
          marcas: ["Situações da carta (A enviar, Impressas, Enviadas...).", "Modelos de carta.", "Marcar todas as linhas."]
        },
        { id: "disparos", titulo: "Disparos de e-mail",
          quando: "Quando a Captação quer mandar e-mail para clientes (um ou vários) com o texto pronto da tese, sem ficar enviando um por um. Quem põe na fila: Captação e administrador (outra pessoa: Painel de permissões > Disparos de e-mail).",
          passos: [
            "Em **Processos > Disparos de e-mail**, clique em [[+ Novo disparo]]: procure o cliente pelo nome, CPF ou código (VMM-01234) e marque; ou use **Colar uma lista** (um cliente por linha). Na ficha do cliente, o bloco **E-mails enviados** tem o botão [[+ Enviar e-mail]].",
            "Na janela **Enviar e-mail**: o **Modelo** (Automático = o modelo da tese do processo), o **remetente** (Automático = rodízio entre os e-mails de envio disponíveis), o e-mail do cliente e **Quando**. Pelo envio de UM cliente aparecem os **Anexos**: os documentos da pasta do cliente para marcar (o espelho do tribunal já vem marcado quando o modelo pede; limite de 15 MB por e-mail). Confira a **prévia** (o e-mail exatamente como o cliente vai ver, com a marca, os botões e a assinatura) e os avisos e clique em [[Pôr na fila]].",
            "Pronto: o e-mail fica **Na fila**. A cada 10 minutos, dentro da **manhã e da tarde** (todos os dias do ano, também sábado, domingo e feriado), o robô manda sozinho, sem passar do limite de cada remetente por turno, espalhando os envios até o fim do turno.",
            "[[Rodar agora]] manda o que está na fila na hora e mostra o resultado no alto da tela (quantos saíram ou o motivo, ex.: \"Fora do horário de envio\"). O administrador tem [[Enviar agora mesmo]] na linha de um e-mail: ele sai na hora, mesmo fora do horário.",
            "Modelo que pede o **espelho do tribunal** e cliente sem espelho na pasta: o e-mail fica **Na fila** com o aviso amarelo \"Sem espelho na pasta\" e NÃO sai sem ele; quando o espelho for guardado na pasta (arquivo ou pasta com \"espelho\" no nome), ele sai sozinho.",
            "Acompanhe nas abas **Na fila**, **Enviados**, **Com erro** e **Cancelados**. [[Ver e-mail]] mostra o texto exato que saiu. Cliente respondeu? Clique em [[Respondeu]].",
            "**Com erro**: o motivo aparece em vermelho (ex.: \"endereço recusado\"). Corrija o e-mail na ficha e use [[Voltar para a fila]]. Erro passageiro (amarelo) o robô tenta de novo sozinho em 30 min, até 3 vezes.",
            "Cliente pediu para não receber mais (respondeu SAIR, reclamou): aba **Não enviar mais** > [[+ Não enviar mais para um e-mail]]. O que estava na fila para ele é cancelado (LGPD)."
          ],
          img: "disparos",
          marcas: ["Novo disparo: escolher os clientes.", "Situação do robô: última rodada, próxima, remetente com senha recusada (vermelho) ou pausado (amarelo).", "E-mails que não saíram, com o motivo.", "Remetentes: os e-mails de envio e o limite de cada um.", "Modelos de cada tese (pré-aprovados).", "Erro passageiro: o robô tenta de novo sozinho."],
          atencao: ["Os modelos são pré-aprovados pelo Dr. Victor: no envio só entram os dados do cliente (nome, tese, número do processo, órgão, cargo). O **código do cliente (VMM-...) é só interno**: não vai no e-mail (o sistema recusa {codigo}). Nunca há valores no e-mail.", "No fim de todo e-mail vai a frase \"Se não quiser mais receber nossos e-mails, responda com a palavra SAIR\". Quem responder SAIR vai para **Não enviar mais**."]
        },
        { id: "disparos-remetentes", titulo: "Disparos: remetentes, modelos e horário",
          quando: "Para cadastrar os e-mails por onde os disparos saem (o Gmail de cada colaborador, o e-mail da Locaweb, da Hostinger...) e os textos de cada tese.",
          passos: [
            "**Remetentes** > [[+ Cadastrar e-mail de envio]]: escolha o provedor (Gmail, Locaweb, Hostinger ou Outro), o e-mail, a senha e os limites por **manhã** e por **tarde** (comece com 20 + 20). No **Gmail** a senha é a **senha de app** (16 letras), criada na conta Google com a verificação em duas etapas ligada. A senha fica no cofre do banco: ninguém vê depois.",
            "Depois de salvar, clique em [[Testar]]: o SAGA manda um e-mail de teste para você. Deu errado? O motivo aparece em vermelho.",
            "Cada colaborador cadastra o **próprio** e-mail (só ele usa). O administrador cadastra os e-mails do escritório e escolhe se **toda a equipe** pode usar.",
            "O provedor recusou por excesso de envios? O remetente fica **pausado até o dia seguinte** (amarelo) e os e-mails saem pelos outros. Senha recusada: fica **vermelho**, o sino avisa o dono e o administrador; corrija a senha e [[Testar]]. [[Pausar até amanhã]] e [[Retomar]] também existem.",
            "**Modelos** (só o administrador): [[+ Novo modelo]] com nome, tese, **identidade** (a marca do e-mail: VMM, ANCREF...), **Anexar documentos do cliente** (\"O(s) espelho(s) do tribunal\"), assunto e texto. Os botões de campo põem {nome}, {primeiro_nome}, {tese}, {numero_processo}, {orgao}, {cargo}, {remetente}... No texto: linha em branco separa parágrafos, **\*\*negrito\*\***, parágrafo começando com **>** vira o destaque e uma 1ª linha com **#** vira o título. A prévia mostra o e-mail pronto, com um cliente inventado; [[Enviar um teste para mim]] manda esse e-mail para a sua caixa (não entra na fila). As setinhas ▲▼ mudam a ordem; o modelo \"Todas as teses\" vale quando a tese não tem modelo próprio.",
            "**Identidades** (no alto da aba Modelos; só o administrador): nome, frase, cores, logo (opcional, PNG/JPG até 300 KB, vai anexada ao e-mail), WhatsApp do botão, site e rodapé. Vale a identidade do modelo; se ele não escolhe, a do remetente; senão a padrão. No remetente dá para pôr o **WhatsApp** de quem envia (o botão do e-mail usa ele).",
            "**Três identidades** (14/11): cada CAIXA e cada MODELO são de uma identidade (VMM, ANCREF ou Sarmento); o modelo só sai por caixa da mesma identidade. VMM e Sarmento assinam como o Dr. Victor (advogado, OAB); a **ANCREF** sai sempre em nome da instituição (\"Equipe de Atendimento ANCREF\", com o primeiro nome de quem atende, se a caixa tiver): o sistema recusa nome de advogado, OAB, \"Victor\" ou \"escritório\" nos textos da ANCREF.",
            "**No modelo**: **Linha de prévia** (o texto que aparece ao lado do assunto na caixa de entrada), **Próximo passo** (quadro em destaque) e **Mostrar o quadro \"Seu processo\"** (número, tribunal, situação, último andamento do CNJ e \"Consultar no tribunal\"; só clientes VMM/Sarmento). Na **identidade**: CNPJ, Instagram, por que a pessoa recebeu (LGPD), aviso antigolpe, \"Como funciona\" em 3 passos e 3 perguntas rápidas (o que ficar em branco não aparece).",
            "Todo e-mail termina com \"Se esta mensagem chegou por engano, por favor desconsidere\" e o botão **Não quero mais receber estes e-mails**: um clique, sem login, e o endereço vai para **Não enviar mais** (vale para todas as identidades e caixas). O \"responda SAIR\" continua.",
            "**Configurações** (só o administrador): ligar/desligar o robô, horário da manhã e da tarde, \"só dias úteis\" (DESMARCADO desde 14/11: todos os dias), tentativas por e-mail e o limite dos anexos (15 MB); e a lista das últimas rodadas."
          ],
          img: "disparos_enviar",
          marcas: ["Modelo (Automático = o da tese do processo).", "Remetente (Automático = rodízio).", "Prévia do e-mail com os dados do cliente.", "Pôr na fila."],
          atencao: ["Outlook/Hotmail pessoal provavelmente não funciona (a Microsoft bloqueou o login por senha). Prefira Gmail, Locaweb ou Hostinger.", "O Gmail gratuito aguenta cerca de 500 e-mails por dia; muitos e-mails para listas frias levam a conta para o spam. Suba o limite aos poucos."]
        },
        { id: "relatorios", titulo: "Relatórios dos clientes: pedir, enviar e ver o último",
          quando: "Quando o cliente pede notícias do processo (ou o escritório decide mandar um relatório) e para saber, na hora, QUANDO foi o último relatório enviado a ele.",
          passos: [
            "Abra **Processos > Relatórios**. Cada linha é um processo, com o **Último relatório enviado** em cor: verde (recente), amarelo (está ficando antigo) e vermelho (passou do prazo). Ligado **Todos os ativos do Jurídico**, aparecem também os que nunca receberam relatório.",
            "Para pedir: [[+ Pedir relatório]], procure o cliente (nome, CPF, código VMM ou número do processo), escolha o processo, diga **quem pediu** (o cliente ou pedido interno), quem prepara e o prazo, e clique em [[Pedir relatório]]. Quem prepara recebe o aviso no sino. Na ficha, o quadro **Relatórios** de cada processo tem o mesmo botão.",
            "Clique na linha para abrir **Relatórios do processo**. Quem prepara usa [[Começar a preparar]] e guarda o arquivo em **Guardar o relatório** (clique ou solte o arquivo): ele vai para a pasta **Relatórios processuais** da ficha e o pedido fica **Pronto**. Relatório guardado direto na pasta da ficha também fica pronto sozinho.",
            "Depois de mandar ao cliente, clique em [[Enviado ao cliente]], escolha por onde foi (WhatsApp, E-mail, Em mãos...) e a data. Pronto: o **último relatório** passa a ser este, aqui e na ficha. Quem pediu recebe o aviso no sino.",
            "Relatório que já estava na pasta e foi enviado sem pedido: na janela do processo, [[Registrar envio]] ao lado dele.",
            "Os números do alto filtram a lista (pedidos em aberto, prontos para enviar, vermelhos, nunca enviado). A lista também vira **Kanban** (Pedido, Em preparação, Pronto, Enviados) e **Cartões**."
          ],
          img: "relatorios",
          marcas: ["Pedir relatório.", "Números que filtram a lista.", "Lista, Kanban ou Cartões.", "Último relatório enviado, com a cor.", "Pedido em aberto e a situação."],
          dicas: ["Pedido parado (mais de 5 dias, ou prazo vencido) avisa quem prepara no sino, uma vez por dia.", "Administrador: [[Prazos das cores]] muda quantos dias valem o verde e o amarelo e o aviso de pedido parado; só ele cancela um pedido.", "No Claude ligado ao SAGA: \"quando foi o último relatório do cliente X?\" e ele também pede, guarda e marca o envio (sempre com o seu OK).", "Futuro (Área do cliente): o cliente vai ver o último relatório enviado e a data."]
        },
        { id: "buscas", titulo: "Pedidos de busca (Lemit, Data Solution)",
          quando: "Quem pede: precisa de telefone ou endereço do cliente/parente. Quem atende (Administrativo): faz a consulta.",
          passos: [
            "**Pedir**: na ficha > Localização > [[Pedir busca]], escolha o cliente e/ou os parentes e a fonte.",
            "**Atender**: em **Pedidos de busca** > **Para atender**, pegue o pedido (A fazer > Em andamento), faça a consulta e clique em [[Ler consulta (PDF ou print)]]: solte o PDF ou cole os prints da tela (Win+Shift+S e depois Ctrl+V; vários de uma vez) e clique em [[Ler]]. Só as informações lidas vão para o pedido: o PDF e os prints não são guardados. Também dá para soltar o PDF ou as imagens em cima do cartão do pedido.",
            "Devolva **pronto** ou **não encontrado** (com o motivo).",
            "**Conferir**: quem pediu recebe o aviso no sino, abre a ficha na Localização, confere e grava. Veio errado? **Devolver**."
          ],
          img: "pedidos_busca",
          marcas: ["Pedidos para atender.", "Meus pedidos.", "Buscar pedido."],
          atencao: ["Renda, score, consumo, veículos e empresas NÃO entram no SAGA (LGPD)."]
        },
        { id: "teses", titulo: "Teses e oportunidades",
          quando: "Para acompanhar as teses do escritório e as oportunidades de ação, e para achar os clientes a quem oferecer uma tese.",
          passos: [
            "**Atualizações de teses**: novidades de cada tese (julgamentos, mudanças), em Blog, Linha do tempo, Por tese ou Lista.",
            "**Prateleira de produtos**: os produtos jurídicos que o escritório oferece, em **Cartões**, **Lista** ou **Kanban** (por situação), com filtros por situação, área do direito, **esfera** (federal, estadual, municipal) e **pessoa** (física ou empresa). Clique no produto para abrir a pasta: resumo, quem tem direito, documentos, fundamento, **explicação completa**, **público da tese**, **vídeos, áudios e links** (abrem em outra aba) e os arquivos.",
            "**Público da tese** (no cartão da tese, botão [[Editar público]] ao lado do público, ou em [[Editar]] do produto; vale também para as teses já criadas): corrija ou marque a esfera, pessoa física ou empresa, a situação (ativo, aposentado, pensionista), os órgãos, cargos e UFs, os anos de ingresso e de aposentadoria, \"aposentado há menos de N anos\", a idade, o que a pessoa precisa ter (precatório, dívida com o fisco...), quem não pode, o prazo e onde achar. Vídeo grande ou do NotebookLM entra por link do Google Drive ou do YouTube em [[+ Adicionar vídeo ou link]].",
            "**Radar de oportunidades**: teses que podem render ações novas.",
            "[[Mostrar gráficos]] (nas três abas): barras e meses que resumem o que está na tela; clicar numa barra filtra por ela (clicar de novo tira o filtro). A escolha de mostrar ou esconder fica neste navegador.",
            "Cada produto tem a **Classificação** (viabilidade, ticket e escalável: menus que o administrador organiza em [[Organizar opções]]) e, quando houver, a **Página do site**, a **Página 3Pj** e a **Pasta no Google Drive** com os materiais (áudio, vídeo, mapa mental, slides, resumo e versão para WhatsApp). Os links do Drive só abrem para quem tem acesso à pasta no Drive.",
            "Clique numa tese da Prateleira para abrir o **cartão** dela: resumo em destaque e o texto à esquerda; à direita o **prazo** (amarelo), **quem não pode** (vermelho), o público, os vídeos e os **anexos** ([[+ Anexar documento]] ou arrastar). Em [[Editar]] há a **cor da tese**, usada também para achar os aptos na Base de dados.",
            "[[Achar clientes para uma tese]]: escolha a tese e o SAGA abre **Clientes por perfil** com os clientes do Jurídico que ainda não têm essa tese e, quando o produto tem o público preenchido, já com a situação, o órgão, o cargo, a UF, os anos e a idade aplicados. O mesmo botão aparece na tese escolhida no Blog, em cada cartão do \"Por tese\", na leitura de uma atualização e na pasta do produto.",
            "Quem pode publica com [[+ Nova atualização]]."
          ],
          img: "teses",
          marcas: ["Atualizações de teses.", "Prateleira de produtos.", "Radar de oportunidades.", "Achar clientes para uma tese.", "Nova atualização."],
          dicas: ["Ctrl+clique no botão abre os clientes em outra aba, e a tela de Teses continua aberta."]
        },
        { id: "mapa", titulo: "Mapa dos servidores (só o administrador)",
          quando: "Para ver, mês a mês, o que aconteceu com os servidores federais, aposentados e pensionistas do Portal da Transparência (quem se aposentou, faleceu, ganhou pensão, teve abate-teto, PSS ou IR que parou) e achar as oportunidades, principalmente entre os clientes do SAGA.",
          passos: [
            "Abra **Teses e oportunidades > Mapa dos servidores** (o botão só aparece para o administrador geral; o banco recusa os outros).",
            "**Visão geral**: os números do Mapa, o gráfico por **ano** (clique num ano para ver os meses e num mês para ver as pessoas) e os **meses em massa**, que ficam à parte. Mês em massa é quando a folha inteira muda de uma vez (ex.: 04/2026, PSS parou para 8.299 pessoas) e não é evento de cada pessoa.",
            "**Eventos**: a lista com o mês, o evento, a pessoa no Portal (CPF sempre mascarado, ***.123.456-**), se é cliente do SAGA e a **oportunidade** (o que o evento pode significar e as teses da Prateleira ligadas; clicar na tese abre a Prateleira). Filtros: evento, órgão, lista, UF, cargo, período (mm/aaaa), cliente ou não, **Só prováveis falecidos**, **Sem vínculos temporários** (ligado) e **Incluir meses em massa** (desligado).",
            "[[Oportunidades por evento]]: escreva o texto de cada evento, marque as teses ligadas e \"Só informativo\". Tese que pede um órgão (ex.: PRF: abate-teto) só aparece nos eventos daquele órgão.",
            "**Clientes do SAGA**: os clientes com evento nos últimos meses (faleceu e deixou pensão = habilitação dos herdeiros; aposentou = abono de permanência, Tema 1.233, férias e licença-prêmio). As linhas de clientes ficam destacadas.",
            "**Prováveis falecidos**: fichas do SAGA que aparecem como servidor que deixou pensão. Escolha as fichas, a situação da conferência e [[Aplicar]]. Em \"Falecimento confirmado\", a caixinha **marcar a ficha como falecida** muda a ficha. [[Organizar situações]] renomeia, muda a cor e a ordem e tira situações da lista.",
            "[[Exportar para a Captação (CSV)]] e [[PDF]] levam a lista do filtro. Cada exportação e cada conferência vai para o Registro de atividades.",
            "**Carga e LGPD**: de onde vêm os dados, os avisos da carga (meses que o Portal ocultou, renomeações de órgão e cargo) e as regras de uso."
          ],
          atencao: ["Dado público do Portal, mas com finalidade presa às teses do escritório (LGPD). Nada de CPF completo, matrícula ou endereço.", "IR ou PSS que parou pode indicar doença grave: é só informação, nunca filtro de captação.", "Provável falecido pode ser homônimo: confira antes de qualquer contato com a família.", "O aviso amarelo do alto mostra quando o público de uma tese parece largo demais (ex.: 3,17% e 28,86%): o botão [[Editar público]] abre a tese na Prateleira. Nada é mudado sozinho."]
        },
        { id: "perfil", titulo: "Clientes por perfil",
          quando: "Para achar clientes de um perfil (ex.: servidores aposentados de um órgão) e oferecer uma tese que eles ainda não têm.",
          passos: [
            "Abra **Clientes por perfil**, ou venha de **Teses e oportunidades** pelo botão [[Achar clientes para esta tese]]: a tela já abre com os clientes do Jurídico que ainda não têm a tese, e um aviso no alto diz qual é o filtro.",
            "Filtre por situação funcional, órgão, cargo, UF, idade, ano de ingresso e de aposentadoria.",
            "Use **Já tem a tese** e **Ainda não tem a tese** para achar quem pode receber a oferta. **Com perfil preenchido** ou **Todos os clientes**, e **Jurídico**, **Captação** ou os dois, mudam de onde vêm os clientes.",
            "Vindo de uma tese com **público** preenchido, o aviso do alto mostra o que foi aplicado; [[Tirar o público da tese]] volta aos filtros de antes. Só aparecem clientes com esses dados no perfil: quem está com o perfil vazio fica de fora.",
            "[[Ver sem esta tese]] tira o filtro da tese; [[Limpar filtros]] volta tudo ao começo.",
            "[[Salvar em PDF]] para levar a lista."
          ],
          img: "clientes_perfil",
          marcas: ["Aviso: de qual tese são os clientes mostrados.", "Ainda não tem a tese.", "Jurídico, Captação ou os dois.", "Salvar em PDF."]
        },
        { id: "editorpdf", titulo: "Editor de PDF: escolher o que fazer (cartões)",
          quando: "Para juntar, separar, tirar ou girar páginas, numerar, tapar dado sigiloso, comprimir, transformar Word ou fotos do celular em PDF e PDF em imagem. Use SEMPRE este editor em vez de sites de PDF da internet (LGPD): o arquivo não sai do computador.",
          passos: [
            "Abra **Processos > Editor de PDF**. A tela mostra todas as funções em cartões: clique no que quer fazer e escolha o arquivo.",
            "**Organizar**: [[Juntar PDFs]], [[Separar PDF]], [[Extrair páginas]], [[Tirar páginas]], [[Girar páginas]] e [[Reordenar páginas]]. **Editar**: [[Numerar páginas]] e [[Escrever ou tapar]]. **Otimizar**: [[Comprimir PDF]].",
            "**Converter**: [[Word para PDF]] (arquivo .docx, convertido aqui mesmo, com cabeçalho, rodapé, número da página, tabelas, listas e imagens), [[Imagens para PDF]] (fotos do celular, JPG e PNG; dá para mudar a ordem, o tamanho da página e a margem) e [[PDF para imagem]] (JPG ou PNG; várias vêm num .zip).",
            "Também dá para arrastar PDFs, fotos ou um Word para a área de baixo: o SAGA entende o tipo sozinho.",
            "[[Comprimir PDF]]: escolha o nível (Recomendada já vem marcada), clique em [[Calcular]] e veja antes e depois. O texto continua texto; só as fotos e os escaneados de dentro do PDF diminuem. Se não diminuir, aparece \"Este arquivo já está otimizado\" e fica o ORIGINAL."
          ],
          img: "editor_pdf",
          marcas: ["Cada cartão é uma função: clique e escolha o arquivo.", "Comprimir: reduz o tamanho mantendo o texto.", "Word para PDF, no próprio computador.", "Fotos do celular viram PDF."],
          atencao: ["Word para PDF é feito no navegador: documentos comuns (petição, contrato, procuração) saem fiéis; caixas de texto, gráficos, equações e desenhos do Office aparecem num aviso amarelo. Nesses casos, no Word use Arquivo > Salvar como > PDF.", "Word antigo (.doc) e Word com senha não abrem: o motivo aparece em vermelho.", "Foto HEIC do iPhone não abre no computador: no iPhone, Ajustes > Câmera > Formatos > Mais Compatível."],
          dicas: ["Na ficha, abra o PDF guardado e use o botão do editor (ao lado de Baixar): ele já vem aberto e o \"Guardar na pasta do cliente\" já sabe o cliente, o processo e a pasta."]
        },
        { id: "editorpdf_paginas", titulo: "Editor de PDF: as páginas",
          quando: "Depois de escolher uma função de Organizar ou Editar, as páginas aparecem em grade para você mexer.",
          passos: [
            "**Reordenar**: arraste a página para o lugar novo (no celular, segure o dedo um instante e arraste) ou use as setinhas ‹ › no pé da página.",
            "**Marcar**: clique na página. Com páginas marcadas: [[Tirar marcadas]], [[Extrair marcadas]], [[Girar à esq.]] e [[Girar à dir.]] (sem nada marcado, giram todas). [[Desfazer]] (ou Ctrl+Z) volta a última mudança.",
            "**Escrever ou tapar**: no lápis da página, escolha **Texto** ou **Tapar área**. Com **Apagar de verdade**, a página com tarja vira imagem para o texto de baixo sumir do arquivo.",
            "A barra tem todas as ferramentas, então dá para fazer várias coisas de uma vez (ex.: juntar, girar e numerar).",
            "No fim, clique no botão do alto ([[Gerar o PDF]], [[Extrair as marcadas]]...). [[Todas as ferramentas]] volta aos cartões sem perder o que está aberto."
          ],
          img: "editor_pdf_paginas",
          marcas: ["Voltar aos cartões (o arquivo continua aberto).", "Todas as ferramentas.", "Página marcada: arraste para mudar a ordem; lápis, girar e tirar no canto.", "Gerar o PDF e ir para o resultado."]
        },
        { id: "editorpdf_resultado", titulo: "Editor de PDF: depois de cada operação",
          quando: "Toda operação termina na tela de resultado, com o arquivo pronto e quatro caminhos.",
          passos: [
            "Confira o nome do arquivo (dá para mudar) e o tamanho.",
            "[[Guardar na pasta do cliente]]: procure o cliente (nome, CPF, código VMM ou número), escolha o processo e a pasta. Vira um documento NOVO na ficha; nada que já está lá muda.",
            "[[Baixar]]: vai para a pasta de downloads (vários arquivos vêm num .zip).",
            "[[Compartilhar]]: no celular, [[Enviar pelo WhatsApp, e-mail…]] manda o arquivo direto pelo aplicativo. Ou o **Link do SAGA com prazo** (1, 3 ou 7 dias): o arquivo precisa estar guardado na pasta do cliente; [[Gerar o link]], depois [[Copiar o link]], [[WhatsApp]] ou [[E-mail]]. O link para de funcionar no prazo e fica no Registro de atividades.",
            "[[Fazer outra operação com este arquivo]]: o resultado volta para os cartões para a próxima operação (ex.: Word para PDF → Comprimir → Guardar), sem baixar e subir de novo."
          ],
          img: "editor_pdf_resultado",
          marcas: ["Nome e tamanho do arquivo pronto.", "Guardar na pasta do cliente.", "Baixar.", "Compartilhar: aplicativo ou link com prazo.", "Continuar com outra operação."],
          atencao: ["O link com prazo deixa QUALQUER pessoa que o tenha baixar o arquivo até o prazo acabar: não mande em grupo e prefira o prazo menor."]
        },
        { id: "planilhas", titulo: "Planilhas: a lista em Modelos e o editor em tela inteira",
          quando: "Para fazer ou abrir uma planilha de cálculo (com fórmulas, como no Excel), do cliente ou do escritório, exportar em PDF no papel timbrado ou em Excel, e montar as planilhas do PSS.",
          passos: [
            "Abra pelo menu lateral **Gestão > Planilhas** (ou **Modelos > pasta Planilhas**). A lista mostra TODAS as planilhas do SAGA: [[De clientes]], [[Do escritório]] (sem cliente), [[Modelos de planilha]] e os arquivos Excel da pasta [[Planilhas Contábeis]]. Busque pelo nome da planilha, do cliente ou pelo código VMM.",
            "[[+ Nova planilha]]: **em branco, do escritório**; **em branco, para um cliente** (escolha o cliente e o processo); **a partir de um modelo de planilha**; **importar um Excel (.xlsx)** (lido neste computador); ou **modelo de planilha novo**. Pela ficha continua: **Pastas do cliente > Planilhas e textos do SAGA > [[+ Planilha]]**.",
            "A planilha abre em **tela inteira**. O botão [[Voltar]] (sempre no alto, à esquerda) leva de volta para onde você estava: a lista de Planilhas ou a ficha do cliente. Se houver mudança não salva, ele pergunta: [[Salvar e voltar]], [[Sair sem salvar]] ou [[Continuar aqui]]. A seta do navegador também volta.",
            "Trabalhe como no Excel: clique e arraste (ou Shift+clique) para marcar várias células; clique na letra da coluna ou no número da linha para marcar a coluna ou a linha inteira. Digite para escrever; **Enter** desce, **Tab** vai para a direita, **F2** edita, **Delete** apaga, **Ctrl+setas** pula até o fim dos dados, **Ctrl+Z/Ctrl+Y** desfazem e refazem, **Ctrl+C/Ctrl+V** copiam e colam (também do Excel e do Google Planilhas), **Ctrl+D** preenche para baixo, **Alt+=** é a autossoma e **Ctrl+;** põe a data de hoje.",
            "**Caixa de nome** (à esquerda da barra de fórmulas): digite B12 ou A1:C5 e Enter para ir até lá. **Fórmulas** começam com = e podem ser em português ou em inglês: =SOMA(B2:B10), =ARRED(B2*0,11;2), =SE(B2>0;B2;0). Enquanto escreve a fórmula, clique ou arraste nas células para pôr a referência. Os erros aparecem na célula e explicados (#DIV/0!, #REF!, #VALUE!, #NAME?, #CICLO!).",
            "**Arrastar para preencher**: puxe o quadradinho no canto da seleção. Um número copia; dois números seguidos continuam a série (1, 2 → 3, 4…); \"Parcela 1\" vira Parcela 2, 3…; datas andam um dia; fórmulas acompanham as linhas.",
            "Barra de cima: desfazer/refazer, [[R$]] e [[%]], formato (número, data: a máscara entra sozinha ao digitar), casas decimais, negrito, itálico, **cor da letra**, **cor do fundo**, **bordas**, [[Mesclar]], alinhamento, quebrar texto, [[Soma]], [[Ordenar]] (A→Z ou Z→A pela coluna da célula; o cabeçalho e o título ficam no lugar), [[Filtro]] (▾ no cabeçalho para escolher os valores; só esconde na tela, o PDF e o Excel saem completos), [[Congelar]] (1ª linha, 1ª coluna ou até a célula marcada: ficam paradas ao rolar), [[Linhas e colunas]] (inserir, excluir, preencher, ajustar a largura) e [[Nota]]. O clique com o botão direito traz o mesmo menu.",
            "Largura da coluna e altura da linha: arraste a borda no cabeçalho (duplo clique na borda da coluna ajusta ao texto). **Zoom** no canto de baixo (ou Ctrl + roda do mouse). Embaixo ficam as **abas** (+ nova; clique duas vezes no nome para renomear; ⋯ para mover ou tirar) e a soma, média, mínimo e máximo das células marcadas.",
            "[[Salvar]] (Ctrl+S): cada salvar cria uma **versão** nova. [[Versões]] mostra as antigas; [[Abrir esta versão]] e salvar torna ela a mais nova. Se outra pessoa salvou antes de você, o SAGA avisa e não sobrescreve.",
            "[[PDF]]: **No papel timbrado (para juntar nos autos)**, com todas as colunas cabendo na largura, ou **Simples, deitado**. [[Excel]] baixa o .xlsx com as fórmulas, formatos, cores, notas e as linhas congeladas. [[Guardar na pasta]] guarda o PDF ou o Excel na pasta do cliente. Em [[⋯]]: importar um Excel nesta planilha e **salvar uma cópia como modelo de planilha**.",
            "**Planilhas do PSS** (na ficha, [[Planilhas do PSS]], ou no cálculo, [[Planilhas do cálculo ↗]]): o SAGA monta, a partir do cálculo conferido, as abas **Apuração do PSS**, **Cumprimento PSS**, **Planilha individualizada** (a que vai para os autos, já marcada para o PDF), **Divisão entre herdeiros** e **Cumprimento IR-RRA**, com as MESMAS fórmulas da planilha matriz do escritório. Células amarelas são dados a preencher ou conferir; a nota na célula diz de onde veio o dado lido do documento. Mudou o cálculo depois? A planilha avisa: clique em [[Montar de novo com o cálculo atual]]."
          ],
          img: "editor_planilha",
          marcas: ["Voltar: para a lista de Planilhas ou para a ficha.", "Barra de ferramentas (formatos, cores, Soma, Ordenar, Filtro, Congelar).", "Caixa de nome e barra de fórmulas.", "Quadradinho de arrastar para preencher.", "Abas, soma das células marcadas e zoom.", "Salvar, Versões, PDF, Excel e Guardar na pasta."],
          dicas: ["Planilha grande (milhares de linhas) continua leve: a tela só desenha o que aparece.", "Células amarelas não saem no PDF com a cor (é só um aviso na tela).", "Tirar uma planilha da lista é só do administrador e não apaga: as versões ficam guardadas.", "Os dados fixos dos advogados (nome, CNPJ/CPF, OAB) e a regra da sucumbência ficam nas configurações do SAGA (só o administrador muda), não na planilha."]
        },
        { id: "claude", titulo: "Ligar o SAGA no seu Claude (conector)",
          quando: "Para pedir ao Claude que consulte e faça o trabalho do SAGA por você (achar cliente, ver processo, criar e mudar tarefas, agenda, anotações, valores...), sem abrir a tela.",
          passos: [
            "No Claude (site claude.ai ou aplicativo), abra **Configurações > Conectores** e clique em [[Adicionar conector personalizado]].",
            "Nome: **SAGA**. Endereço (URL): **https://fmoskdxgjulagedzjxxk.supabase.co/functions/v1/saga-mcp**. Clique em [[Adicionar]].",
            "Clique em [[Conectar]]: abre o SAGA. Entre com o SEU e-mail e senha (ou Google). A página mostra \"Você está conectando o Claude como: seu nome\"; confira e clique em [[Autorizar]].",
            "Pronto: numa conversa, peça, por exemplo, \"No SAGA, quais são minhas tarefas de hoje?\". Antes de mudar qualquer coisa, o Claude diz o que vai mudar e espera o seu OK.",
            "Ferramentas novas (novembro): **contexto do processo** (tudo o que o SAGA sabe de um processo numa leitura só: resumo do agente e se está em dia, intimações, andamentos do CNJ, comentários, tarefas, documentos, cálculo e petições com a Renata); **autos para baixar** (a fila da tela Autos para baixar: ver, pegar, marcar baixado ou dispensar); **leituras dos documentos** (o que o SAGA já leu dos documentos da pasta do cliente, com de onde veio cada dado do cálculo do PSS, sem CPF; o que ainda não foi lido se lê na tela); **relatório do cliente** (quando foi o último relatório, pedir, preparar e registrar o envio); **disparo de e-mail** (pôr cliente na fila da Captação, com prévia); **prêmio da Captação** e **validar para o prêmio**.",
            "As ferramentas das agentes (triagem, petições da Renata, revisão da Luísa, recados) só funcionam com o login delas.",
            "**Guardar um documento da conversa na pasta do cliente**: diga, por exemplo, \"guarde este contracheque na pasta Contracheques do cliente VMM-01234\". O Claude confirma e manda um **link do SAGA**: toque nele, entre com o seu login se pedir e clique em [[Escolher arquivo]] (no celular: galeria, câmera ou arquivos; no computador: escolha ou arraste). O arquivo vai do seu aparelho direto para a ficha, na pasta escolhida (dá para trocar a pasta na própria página), até 50 MB por arquivo, vários de uma vez. Depois diga ao Claude \"enviei\": ele confere se chegou. O link vale 24 h e só para você."
          ],
          atencao: ["O Claude age COMO VOCÊ: só vê e só muda o que você já vê e muda na tela. Colaborador não apaga nada (só o administrador, e sempre com o OK dele na conversa).", "Tudo o que o Claude consulta ou muda fica no Registro de atividades com o seu nome (módulo \"SAGA no Claude\"), com o antes e o depois.", "Apareceu \"Seu usuário não tem a permissão do conector\"? Peça ao administrador (Painel de permissões > SAGA no Claude)."],
          dicas: ["Use o código do cliente (VMM-01234) ou do processo (VMM-01234-PSS) no pedido: evita confusão entre homônimos.", "O que o Claude pedir para você trazer (autos, certidão...) aparece em Meu dia > Pedidos do Saga IA.", "Não sabe se o Claude consegue fazer algo no SAGA? Peça \"o que posso fazer no SAGA?\": ele lista as ferramentas e se você tem permissão para cada uma."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "marketing", titulo: "Marketing", quem: "Marketing, aprovadores e administrador",
      resumo: "Artes e vídeos com aprovação, campanhas, origem dos clientes e números dos anúncios.",
      secoes: [
        { id: "artes", titulo: "Enviar e aprovar artes e vídeos",
          quando: "Quando o Marketing cria um post, uma arte ou um vídeo.",
          passos: [
            "Abra **Marketing** > **Artes e vídeos**. As artes ficam em **pastas por tema** (ex.: Imposto de renda), com as campanhas dentro.",
            "Clique em [[+ Novo]] > arte ou vídeo: envie o arquivo (vídeo grande: link do Google Drive ou do YouTube), o texto do post, onde vai sair e a data prevista.",
            "Quem aprova (Dr. Victor e Hevelyn) abre o cartão, comenta (pode marcar um ponto na arte) e decide: **aprovar**, **pedir ajuste** ou **recusar**.",
            "Ajuste pedido: o Marketing envia a versão nova. Publicado: cole o link do post e marque **publicado**."
          ],
          img: "marketing",
          marcas: ["Novo (arte, vídeo, campanha...).", "Artes e vídeos.", "Campanhas.", "Painel (números)."]
        },
        { id: "campanhas", titulo: "Campanhas e origem dos clientes",
          quando: "Quando sai uma campanha nova e para saber de onde vêm os clientes.",
          passos: [
            "Em **Campanhas**, crie a campanha: nome, código curto (ex.: IR27), rede principal, WhatsApp e a mensagem pronta.",
            "O link do WhatsApp da campanha leva a mensagem com o código no fim. Quando o cliente escreve, cole a mensagem em **De onde veio este cliente?** e a campanha é marcada sozinha.",
            "Gastos lançados na campanha e os números do Meta mostram quanto cada cliente custou."
          ]
        },
        { id: "painel", titulo: "Painel e robô do Meta",
          quando: "Para ver investimento, alcance, conversas e resultados por campanha.",
          passos: [
            "Abra **Painel**: números do período, investimento mês a mês, por campanha, por tese, ranking dos anúncios e origem dos contatos.",
            "O robô do Meta traz os números do Instagram e do Facebook todo dia de manhã. [[Atualizar agora]] busca na hora (quem edita campanhas).",
            "[[PDF]] salva o painel."
          ]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "financeiro", titulo: "Financeiro", quem: "Quem tem permissão do Financeiro",
      resumo: "Honorários de cada processo, recebimentos, lançamentos avulsos e divisão entre escritórios e colaboradores.",
      secoes: [
        { id: "visao", titulo: "Acompanhar honorários e recebimentos",
          quando: "Para ver quanto o escritório espera receber, o que já entrou e lançar despesas e receitas.",
          passos: [
            "Abra **Financeiro**: honorários esperados por tipo de ação, recebido e a receber, lançamentos e divisão por escritório e participante.",
            "O valor esperado de cada processo vem da ficha (valor e % de honorários).",
            "Recebimento de um processo: registre no processo; saque parcial mostra o que ainda falta receber.",
            "[[+ Lançamento avulso]] para despesas e receitas que não são de um processo."
          ],
          img: "financeiro",
          marcas: ["Lançamento avulso.", "Atualizar."]
        },
        { id: "distribuicao", titulo: "Distribuição dos honorários (Equipe e Jurídico) e Meus honorários",
          quando: "Para ver e combinar como os honorários de cada processo são divididos, e para cada colaborador ver a própria parte.",
          passos: [
            "Na janela do processo no Financeiro, a parte **Distribuição** mostra quem recebe o quê. Tudo sai **só da parte do Dr. Victor** (a do Sarmento e dos parceiros não muda).",
            "**Equipe**: 0,5 ponto percentual do valor da causa, em partes iguais entre TODOS os colaboradores em operação (sem o Dr. Victor e sem as agentes). Quem sai do escritório deixa de receber o que ainda não foi pago.",
            "**Jurídico**: 10% do que sobra da parte do Dr. Victor depois da equipe, em partes iguais entre quem do Jurídico trabalhou no processo. Escolha essas pessoas em **Quem do Jurídico trabalhou neste processo** (sem escolha = todo o Jurídico; ninguém marcado = a parte fica com o Dr. Victor).",
            "Exemplo: causa de R$ 400 mil, honorários de 25%, parte do Dr. Victor 13,6%: equipe R$ 2.000, Jurídico R$ 5.240, fica R$ 47.160.",
            "As linhas da equipe e do Jurídico são feitas e refeitas **sozinhas** pelo SAGA; à mão só se marca **pago**, a data e a observação. Parte paga fica congelada.",
            "Só o administrador muda os percentuais, na aba **Distribuição** do Financeiro (Equipe em pontos da causa e Jurídico em % da sobra); a mudança fica no Registro de atividades.",
            "**Meus honorários** (menu Meu dia; aparece só para quem tem parte): cada colaborador vê só a própria parte, processo por processo, o que já foi pago e o que falta. Só você e quem cuida do Financeiro veem."
          ],
          img: "financeiro_distribuicao",
          marcas: ["Aba Distribuição do Financeiro.", "A regra da Equipe e do Jurídico (sai só da parte do Dr. Victor).", "Percentuais: só o administrador muda (Salvar percentuais).", "Cartão de cada um: previsto, a pagar (já recebido pelo escritório) e pago."],
          dicas: ["A linha do Dr. Victor aparece pelo valor LÍQUIDO (já sem a equipe e o Jurídico)."]
        },
        { id: "precatorios", titulo: "Precatórios e RPV: pagamento liberado e dinheiro a entrar",
          quando: "Para saber em que pé está o requisitório de cada processo, quais pagamentos já saíram e quanto deve entrar em cada mês ou ano.",
          passos: [
            "Abra **Precatórios e RPV** no menu (Gestão). No alto escolha **A receber** (ativos e encerrados), **Ativos**, **Encerrados** ou **Sacados**.",
            "**Pagamento liberado** (quadro verde): processos com a situação \"Pago (liberado para saque)\" na planilha ou com andamento de pagamento ou alvará no CNJ nos últimos 120 dias, ainda não sacados. Clique para abrir a ficha e fazer o levantamento.",
            "**Dinheiro a entrar**: os honorários a receber (esperado − já recebido) pela previsão de pagamento, [[Por mês]] ou [[Por ano]]. Clique numa barra para ver só os processos dela; **Previsão vencida** mostra o que já devia ter entrado.",
            "Sem data na planilha, o SAGA **estima**: RPV, 60 dias depois da expedição; precatório, o ano do orçamento (LOA) ou, pela data da expedição no CNJ, o ano seguinte (expedido até 2 de abril) ou o outro. A tabela marca \"(estimada)\".",
            "Para preencher: na planilha do **Jurídico**, colunas **Tipo do requisitório**, **Situação do requisitório**, **Ano do orçamento (LOA)**, **Previsão de pagamento** e **Valor atualizado do requisitório** (na célula ou pelo [[Importar planilha]], com esses nomes no Excel).",
            "[[Salvar em PDF]] tira o relatório com os números, as faixas e a lista."
          ],
          dicas: ["Os honorários aparecem só para quem vê o Financeiro; os outros veem os processos e o valor dos requisitórios.", "Nada é contado duas vezes: o \"a receber\" é o mesmo do Financeiro e do Dashboard (esperado − recebido)."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "gestao", titulo: "Gestão (administrador)", quem: "Administrador e quem tiver permissão",
      resumo: "Equipe, permissões, registro de tudo o que foi feito, painéis e configurações do escritório.",
      secoes: [
        { id: "colaboradores", titulo: "Colaboradores e acessos",
          quando: "Quando entra ou sai alguém da equipe, ou para limitar horário e local de acesso.",
          passos: [
            "Abra **Colaboradores** e clique em [[Convidar Colaborador]]: e-mail, nome, perfil e cargo. A pessoa recebe o convite por e-mail.",
            "**Equipe e convites**: ativar, suspender (inativo) e reenviar convites.",
            "**Controle de acesso**: horários e locais em que cada um pode entrar."
          ],
          img: "colaboradores",
          marcas: ["Convidar colaborador.", "Equipe e convites.", "Controle de acesso."],
          atencao: ["Quem sai do escritório: suspenda o acesso no mesmo dia."]
        },
        { id: "permissoes", titulo: "Permissões",
          quando: "Para liberar ou tirar o acesso a uma tela ou a uma ação.",
          passos: [
            "Abra **Painel de permissões** (Configurações).",
            "**Por Colaborador**: tudo o que uma pessoa pode. **Por Módulo**: quem pode cada coisa (ex.: Pedidos de busca > Editar). **Perfis**: o pacote de cada perfil (Jurídico, Captação, Administrativo, Marketing...).",
            "Exemplos: atender pedidos de busca, aprovar artes do Marketing, responder sugestões, atender clientes na agenda, usar o SAGA no Claude, **Petições e cálculos** (fazer petição e o cálculo do PSS: Jurídico e Estagiário), **Aprova o trabalho dos agentes** (tela Para aprovar) e **Validar para o prêmio**.",
            "**Acesso total às tarefas** e **Acesso total às intimações** (chavinhas da Lista): a pessoa vê e trata TODAS as tarefas (inclusive as particulares) e todas as intimações, como o administrador, menos apagar."
          ],
          img: "permissoes",
          marcas: ["Por colaborador.", "Por módulo.", "Perfis."],
          atencao: ["Apagar e excluir não valem para colaboradores, mesmo com a permissão marcada: só o administrador geral apaga."]
        },
        { id: "registro", titulo: "Registro de atividades",
          quando: "Para saber quem fez o quê e quando, ou conferir uma alteração.",
          passos: [
            "Abra **Registro de atividades**.",
            "Filtre por texto (cliente, processo, tarefa), pessoa, módulo, ação (criou, alterou, excluiu, consultou) e período.",
            "Cada alteração mostra o valor **antes** e **depois**."
          ],
          img: "atividades",
          marcas: ["Buscar.", "Pessoa.", "Ação.", "Período."]
        },
        { id: "dashboard", titulo: "Painel geral",
          quando: "Para ver, num lugar só, o que está vencendo, o que está atrasado e como está o escritório, e ir direto para a lista certa.",
          passos: [
            "Clique em **Painel geral**, o primeiro item do menu da esquerda. (Depois de entrar, o SAGA continua abrindo no **Ponto**.)",
            "No alto, três números grandes: **Prazo fatal nos próximos 5 dias**, **Atrasados** e **Para hoje**. Contam as SUAS tarefas, as intimações com prazo e os prazos da agenda; embaixo de cada um, clique em \"N tarefas\", \"N intimações\" ou \"N compromissos\" para abrir a lista já filtrada. Quem acompanha o escritório inteiro vê também a linha **No escritório**.",
            "O administrador vê a faixa dos **robôs** (radar do CNJ, radar de e-mail, andamentos do CNJ, Meta...): verde funcionando, amarelo atenção, vermelho com erro. Clique para abrir a **Saúde do sistema**.",
            "Os cartões **Meu dia**, **Intimações**, **Jurídico**, **Captação**, **Dinheiro**, **Prêmio da Captação** e **Equipe** mostram os números de cada assunto. Cada número é um link: abre a planilha, a tela ou a lista certa (Ctrl+clique abre em outra aba). Cada pessoa só vê o cartão do que já pode ver no sistema.",
            "No Jurídico, **Parados há mais de 30/90 dias**, **Sem data de movimentação** e **Sem o resumo do agente** abrem a janela com a lista dos processos (clique no processo para abrir a ficha; [[Copiar números]] copia os números para mandar ao agente).",
            "**Produtividade**: tarefas concluídas, intimações tratadas e processos movimentados por pessoa, nos [[Últimos 7 dias]] ou [[Últimos 30 dias]]. O administrador vê a equipe toda; cada colaborador vê a própria.",
            "**Mais números**, embaixo, começa **recolhido** (o Painel abre mais rápido): clique no título para abrir os gráficos e quadros de antes (período, equipe, processos por situação, distribuição por UF). Eles só são buscados quando você abre, e o SAGA lembra a sua escolha."
          ],
          img: "dashboard",
          marcas: ["Prazo fatal nos próximos 5 dias, Atrasados e Para hoje (clique em \"N tarefas\" para abrir a lista).", "Faixa dos robôs (só o administrador).", "Cartão de um assunto: cada número abre a lista certa.", "Produtividade: últimos 7 ou 30 dias.", "Mais números (recolhido): clique para abrir."],
          dicas: ["O número de Minhas Tarefas \"Próximos 5 dias\" também está no filtro Prazo da tela de tarefas."]
        },
        { id: "parceiros", titulo: "Parceiros (ANCREF, Sarmento e quem indica)",
          quando: "Para saber quantos clientes e processos vieram de cada parceiro e quantos fecharam.",
          passos: [
            "Abra **Processos > Parceiros**. Cada parceiro mostra clientes, processos, quantos estão na Captação, no Jurídico e quantos **fecharam** (documentação pedida, documentos em mãos ou Jurídico).",
            "[[Ver clientes]] abre os 30 mais recentes; clique no nome para abrir a ficha.",
            "Para ligar um cliente a um parceiro: na ficha, no topo do processo, clique em **Como chegou** e escolha o parceiro em \"De onde veio\".",
            "Só o administrador: [[+ Novo parceiro]], ✎ renomear, ▲▼ mudar a ordem e ✕ tirar da lista (o histórico fica; \"Tirados da lista\" mostra e [[Pôr na lista]] devolve)."
          ]
        },
        { id: "biblioteca", titulo: "Modelos: petições, timbrados e arquivos (e Treinamentos)",
          quando: "Para achar um modelo de petição, baixar um papel timbrado, guardar arquivos do escritório ou estudar os materiais da equipe.",
          passos: [
            "Abra **Gestão > Modelos**. A coluna da esquerda (**Pastas**) é uma árvore só, como o explorador de arquivos do computador: tudo fica dentro de **Arquivos**: **Petições** (as áreas do direito e as subpastas), **Contestações** (uma pasta por tese), **Papéis timbrados** e as pastas da antiga Biblioteca (Procurações, Planilhas, Treinamento, Outros). Nada se perdeu: só ficou tudo junto.",
            "Clique no nome de uma pasta para ver o que tem nela; a **setinha** ao lado abre e fecha as subpastas (o SAGA lembra o que ficou aberto neste computador). No alto do conteúdo, o caminho (por exemplo Arquivos › Petições › Direito Tributário) leva de volta a qualquer pasta. Clicando em **Arquivos** aparecem todas as pastas em cartões.",
            "A caixa **Buscar em modelos e arquivos**, no alto das pastas, procura em tudo de uma vez: modelos (título, área, subpasta, tipo de peça ou tese, mostrando a pasta de cada um), o texto das contestações e o nome dos arquivos. Apague o texto da busca para voltar à pasta onde estava. Modelo com o selo **A revisar** foi importado e ainda não foi conferido.",
            "No celular, as pastas ficam num botão no alto (mostra onde você está, ex.: Arquivos › Petições): toque para abrir a árvore, escolha a pasta e ela se fecha sozinha.",
            "Quem organiza os modelos (administrador ou quem tem a permissão de gerenciar modelos): [[+ Nova pasta aqui]], [[Renomear]], [[Mudar de lugar]] e, no modelo, [[Mover]] para outra pasta.",
            "**Treinamentos** (menu Comunicação): materiais, perguntas e respostas, roteiros de atendimento e fluxos de trabalho. Abra, estude e marque como concluído. O administrador exclui um treinamento pela lixeira do cartão (aparece ao passar o mouse) ou pelo botão [[Excluir]] dentro dele."
          ],
          img: "biblioteca",
          marcas: ["Busca única: modelos, contestações e arquivos.", "A árvore das pastas: tudo dentro de Arquivos (setinha abre e fecha).", "Petições, com as áreas e subpastas.", "Contestações (por tese), Papéis timbrados e as pastas da antiga Biblioteca.", "O caminho da pasta aberta (clique para voltar)."]
        },
        { id: "timbrados", titulo: "Gerar uma petição pelo modelo (timbrados)",
          quando: "Para fazer uma petição já no papel timbrado da Victor Morais Advocacia, da ANCREF ou da Sarmento, em Word ou em PDF, ou para baixar o papel timbrado em branco.",
          passos: [
            "Em **Modelos**, ache o modelo e clique em [[Gerar petição]].",
            "**De quem é a petição?** [[Cliente do Jurídico (puxa os dados da ficha)]]: busque por nome, CPF, código ou número; se escolher vários processos, sai uma petição para cada um, em fila. [[Cliente de fora (preencher aqui)]]: preencha à mão (nada é cadastrado no SAGA).",
            "Confira o **Papel timbrado** (o mesmo texto sai em qualquer um dos três; o da ANCREF só quando o Dr. Victor pede, e o SAGA pergunta antes) e, no da Victor Morais Advocacia, a **Versão**: [[Colorida (para enviar)]] ou [[Para imprimir (sem faixas)]].",
            "Preencha o que faltar. O que ficar em branco sai **destacado** e entre colchetes, por exemplo [Do direito], para completar depois no Word. A data em branco sai com a data de hoje.",
            "Para destacar um nome de pessoa ou órgão como no Padrão VMM (negrito, itálico e versalete), escreva dois asteriscos antes e dois depois do nome, sem espaço. Dois sublinhados antes e dois depois deixam o texto só em negrito.",
            "Clique em [[Baixar Word]] ou [[Baixar PDF]]. O arquivo é montado no seu computador; nada é enviado para fora.",
            "Em **Papéis timbrados** ficam os três papéis oficiais: [[Word em branco]], [[PDF em branco]] e, no da Victor Morais Advocacia, [[Word para impressão]]. Só o administrador: [[Trocar timbrado]] guarda os arquivos novos de um timbrado (o antigo continua guardado)."
          ],
          img: "biblioteca_timbrados",
          marcas: ["Modelos e timbrados.", "Escolher o escritório.", "Gerar a petição em Word ou PDF.", "O papel timbrado de cada escritório, com os botões para baixar em branco (e Trocar, só o administrador)."],
          dicas: ["No PDF da ANCREF e da Sarmento, a letra Segoe UI do Word é trocada por uma muito parecida (Open Sans). No Word baixado fica a letra original.", "Se aparecer um aviso vermelho dizendo que não foi possível gerar, mande a mensagem ao administrador: ela diz o que faltou."]
        },
        { id: "modelos_editor", titulo: "Criar, importar e editar modelos de petição",
          quando: "Para quem gerencia os modelos: trazer as petições do escritório para o SAGA e manter os modelos certos.",
          passos: [
            "[[+ Novo modelo]]: abre o **editor**, uma folha com um bloco por parágrafo. À esquerda de cada bloco escolha o **tipo** (endereçamento, autos, parágrafo, título, tópico, citação, pedidos, fecho, assinatura). [[+ Parágrafo no fim]] e [[+ Bloco no fim]] acrescentam; ▲ ▼ mudam a ordem; ✕ tira.",
            "**Campos**: o que muda em cada petição fica entre chaves, por exemplo {cliente}, {cpf}, {numero_processo}, {qualificacao}. Use [[Inserir]] ao lado do campo (entra onde está o cursor) ou crie um com [[+ Campo]].",
            "Escolha a área, a subpasta, a tese (ou deixe geral) e o tipo de peça. [[Baixar Word de teste]] mostra como sai no timbrado. Marque **Revisado** e clique em [[Salvar modelo]].",
            "[[Importar pasta de petições]]: arraste a pasta com as suas petições (separadas por áreas e subpastas) ou [[Escolher pasta]]. Cada Word vira um modelo: a 1ª pasta é a área e o resto do caminho é a subpasta. A leitura é feita no seu computador (os arquivos não sobem; só o texto vai para o SAGA). Número do processo, CPF, CNPJ, nome do cliente e qualificação já viram campos.",
            "Os importados entram como **A revisar**: abra cada um em [[Editar]], confira se sobrou algum dado de cliente no texto (nomes, valores, datas), troque por campos e marque **Revisado**. Word antigo (.doc) e Word com senha aparecem na lista com o motivo; o mesmo arquivo da mesma pasta não entra duas vezes.",
            "[[Tirar da lista]] (só o administrador): o modelo sai da lista; nada é apagado."
          ],
          img: "modelos_editor",
          marcas: ["Tipo de cada bloco.", "Campos: Inserir e + Campo.", "Título, tipo de peça, tese, área, subpasta e timbrado do modelo.", "Baixar Word de teste e Salvar modelo (marque Revisado antes)."],
          atencao: ["Modelo importado pode ter dado de cliente no meio do texto: só marque Revisado depois de conferir."]
        },
        { id: "config", titulo: "Configurações do escritório e listas de opções",
          quando: "Quando o administrador precisa mudar uma opção de menu, uma área do direito ou um dado do escritório.",
          passos: [
            "**Configurações > Áreas e tipos de ação** e **Escritório** (só o administrador).",
            "Toda lista de opções (etiquetas, situações, etapas, categorias, fontes de busca, origens, respostas prontas) se cria, renomeia, reordena e remove na própria tela. Remover só desativa: o histórico fica.",
            "**SAGA no Claude**: toda a equipe pode ligar o SAGA no próprio Claude (ver o capítulo de Cartas, buscas, teses, perfis e PDF), com o próprio login (só vê e muda o que já pode; tudo vai para o Registro de atividades). O administrador tira a permissão de alguém no Painel de permissões > SAGA no Claude."
          ]
        },
        { id: "saude", titulo: "Saúde do sistema (só o administrador)",
          quando: "Para saber se os robôs e as automações do SAGA estão funcionando (radar de intimações, CNJ, Meta, relatórios, agentes, cópia de segurança).",
          passos: [
            "Abra **Configurações > Saúde do sistema** (ou clique na faixa dos robôs do Painel geral).",
            "Cada robô tem um cartão: **verde** funcionando, **amarelo** erro passageiro (o SAGA tenta de novo sozinho; mostra a última tentativa e a próxima), **vermelho** parado ou com erro que se repete (avisa o administrador no sino uma vez por dia), **cinza** ainda não rodou.",
            "O cartão diz o que falhou, o motivo (com o código), a última rodada e a próxima.",
            "Embaixo: **Erros recentes** (7 dias, com filtro por robô) e a lista de todos os **agendadores** (última rodada, próxima e falhas)."
          ],
          dicas: ["Erro nunca é escondido: se algo não funciona, aparece com o motivo, para poder consertar."]
        },
        { id: "armazenamento", titulo: "Armazenamento (só o administrador)",
          quando: "Para ver quanto espaço o banco e os arquivos do SAGA já ocupam.",
          passos: [
            "Abra **Configurações > Armazenamento**. Duas barras, como no iPhone: o **banco** (dados, por grupo de tabelas) e os **arquivos** (por tipo e por lugar, com a quantidade), cada uma com o espaço livre até o limite do plano.",
            "[[Atualizar agora]] lê de novo (com a aba aberta, lê sozinho a cada minuto).",
            "Os limites do plano ficam na mesma tela (o escritório está no plano **Pro**: 8 GB de banco e 100 GB de arquivos). Aviso colorido a 70% e 90%; acima de 80%, aviso no sino uma vez por dia."
          ]
        }
      ]
    }
  ],

  duvidas: [
    ["Fiz uma mudança e não aparece para mim.", "Aperte F5. Se não resolver, Ctrl+Shift+R (recarrega tudo)."],
    ["Não vejo uma tela ou um botão que o colega vê.", "É permissão. Peça ao administrador para liberar no Painel de permissões."],
    ["Errei uma informação.", "Edite. Colaborador não apaga; a edição fica registrada com o antes e o depois. Se precisar mesmo apagar, peça ao administrador."],
    ["Cadastrei o cliente duas vezes.", "Desde 11/11 o SAGA avisa antes de criar (janela \"Essa pessoa já tem ficha?\") e não aceita o mesmo CPF duas vezes. Se mesmo assim ficou repetido, avise o administrador: ele junta ou desativa o repetido."],
    ["Esqueci a senha.", "Na tela de entrada, clique em Esqueci a senha e siga o e-mail."],
    ["O SAGA me tirou do sistema.", "Ficou muito tempo parado ou está fora do horário/local liberado. Entre de novo; se não deixar, fale com o administrador."],
    ["Esqueci de bater o ponto.", "Faça a justificativa no Ponto, no mesmo dia, com o horário certo."],
    ["O cliente ligou e não sei quem é.", "Digite o telefone na busca do alto: o SAGA procura nos telefones, na Localização e nas anotações."],
    ["Chegou intimação de um processo que não está no SAGA.", "Ela fica em Fora do SAGA. Cadastre o processo (ou use Trazer para o SAGA em lote) e ela é ligada sozinha."],
    ["Vou gravar a tela para um treinamento.", "Ligue o modo privacidade (o olho no alto) antes de gravar."]
  ]
};
