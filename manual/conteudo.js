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
  versao: "3.2",
  data: "14/11/2026",
  titulo: "Manual do SAGA",
  subtitulo: "Procedimento Operacional Padrão de uso do sistema do escritório",
  escritorio: "Victor Morais Advocacia (VMMADV)",
  aprovacao: "Dr. Victor de Medeiros Morais",
  pdf: "manual/POP_SAGA_ADV.pdf",

  revisoes: [
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
            "Digite o seu **e-mail** e a sua **senha**.",
            "Marque **Manter conectado** só no computador do escritório que é seu.",
            "Clique em [[Entrar no Sistema]]. O SAGA abre sempre no **Ponto**: aproveite e bata o ponto.",
            "Esqueceu a senha? Clique em **Esqueci a senha** e siga o e-mail que chega."
          ],
          img: "login",
          marcas: ["E-mail de acesso.", "Senha (pessoal, não empreste).", "Entrar no Sistema.", "Esqueci a senha: manda o e-mail para criar uma senha nova."],
          dicas: ["Primeiro acesso: você recebe um convite por e-mail do administrador. Abra o link, crie a senha e preencha os seus dados."],
          atencao: ["O administrador pode limitar o acesso por horário e por local. Fora do combinado, o SAGA avisa e não deixa entrar.", "Se ficar muito tempo parado, o SAGA sai sozinho por segurança: é só entrar de novo."]
        },
        { id: "tela", titulo: "Conhecer a tela",
          quando: "Para se localizar em qualquer tela do SAGA: a barra do alto e o menu da esquerda são sempre os mesmos.",
          passos: [
            "No **menu da esquerda** ficam as telas, em grupos que abrem e fecham: **Processos** (Jurídico, Captação, Cartas, Pedidos de busca, Clientes por perfil, Teses), **Meu dia** (Ponto, Tarefas, Agenda, Intimações, Notas), **Comunicação** (Chat, Sugestões, Manual, Treinamentos), **Gestão** (Dashboard, Financeiro, Marketing, Colaboradores, Biblioteca) e **Administração** (só o administrador). Só aparece o que você tem permissão para ver. Clique no nome do grupo para abrir ou fechar; com o menu **recolhido** (só os ícones), cada grupo vira uma linha fina com a setinha, que também abre e fecha o grupo. A escolha fica guardada neste navegador.",
            "No alto, da esquerda para a direita: o botão do menu, a **busca**, quem está online, o **sino**, o **olho** (modo privacidade), atualizar, o **tema** (claro ou escuro) e a sua **foto**.",
            "Os números ao lado dos itens do menu (Agenda, Minhas Tarefas, Chat) mostram o que há para hoje ou o que não foi lido.",
            "O menu da esquerda **fica no lugar** quando você troca de tela (não volta para o topo). Com o mouse em cima dele, a roda do mouse rola só o menu, sem mexer na página."
          ],
          img: "topo",
          marcas: ["Abre e fecha o menu da esquerda (no celular, o menu fica escondido aqui).", "Busca: cliente, CPF, processo, telefone, e-mail ou endereço.", "Sino: os seus avisos.", "Olho: modo privacidade (esconde nomes, CPF, números e valores para gravar a tela).", "Tema claro ou escuro.", "Sua foto: menu com perfil, preferências, sugestões e sair."]
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
            "**Tema**: Claro ou Escuro (também pelo botão sol/lua no alto).",
            "**Cor do tema**: Azul (padrão), Grafite, **Novembro Azul**, **Rosa** (Outubro Rosa) ou **Natal**, cada uma com claro e escuro. Clique numa cor para ver como fica; ela só vale para todas as telas quando você clica em [[Salvar cor do tema]] ([[Cancelar]] volta para a anterior).",
            "**Efeitos de movimento**: Ligados (janelas abrem e fecham suaves) ou Desligados (troca na hora).",
            "**Tamanho da letra**: Normal, Grande ou Maior."
          ],
          img: "configuracoes",
          marcas: ["Aba Preferências.", "Tema claro ou escuro.", "Cor do tema: Azul, Grafite e as cores de campanha.", "Efeitos de movimento."],
          dicas: ["O administrador pode fixar a cor de um colaborador; nesse caso a escolha fica travada.", "**Tema do mês** (só o administrador liga, em Preferências > Cor do tema da equipe): o SAGA troca sozinho a cor de toda a equipe no mês de cada campanha (outubro Rosa, novembro Novembro Azul, dezembro Natal; dá para mudar cada mês). Nesse mês a sua escolha fica guardada e volta quando o mês acaba; quem tem a cor fixada continua com ela."]
        },
        { id: "privacidade", titulo: "Gravar a tela ou mostrar o sistema sem expor clientes",
          quando: "Quando o colaborador vai gravar um vídeo, compartilhar a tela numa reunião ou mostrar o SAGA a alguém de fora.",
          passos: [
            "Clique no **olho** no alto da tela. Ele fica vermelho: o modo privacidade está ligado.",
            "Nomes, CPFs, números de processo e valores ficam escondidos em todas as telas.",
            "Clique de novo no olho para mostrar os dados."
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
            "**Abrir a ficha**: clique no nome do cliente (Ctrl+clique abre em outra aba)."
          ],
          img: "captacao_lista",
          marcas: ["Busca da lista.", "Visões salvas.", "Escolher colunas.", "Exportar Excel.", "Clique no nome para abrir a ficha."],
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
            "[[Sem número CNJ]] mostra só os processos ativos sem número CNJ válido (vazio, sem os 20 dígitos ou com o dígito verificador errado). Sem o número, o robô do CNJ e o radar não acompanham o processo. Complete o número na própria célula (clique duplo) e o processo sai da lista. Número errado aparece com o selo vermelho **número inválido**."
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
            "O status passa a ser o primeiro do Jurídico. Nada é apagado e a mudança fica no histórico."
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
            "No topo: nome, CPF, endereço e a **situação vital** (vivo ou falecido). Ao lado, telefones, e-mails e endereços, com copiar, **WhatsApp** e **validar**.",
            "Mais abaixo, uma **aba para cada processo** do cliente e o botão **Localização**.",
            "[[Editar dados do cliente]]: dados pessoais e o **perfil** (situação funcional, órgão, cargo, matrícula, datas, nome da mãe)."
          ],
          img: "ficha_topo",
          marcas: ["Nome do cliente.", "Editar dados do cliente.", "Aba de um processo.", "Localização: contatos do cliente e dos parentes.", "+ Novo Processo para este cliente.", "+ Recurso (agravo, apelação...) do processo aberto."],
          dicas: ["Telefone confirmado com o cliente? Clique em validar (✓): ele vira o contato principal de confiança."]
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
        { id: "localizacao", titulo: "Localização: achar e contatar o cliente e os parentes",
          quando: "Quando o colaborador precisa achar o cliente (ou um parente) para conversar.",
          passos: [
            "Clique em **Localização** na ficha.",
            "Há um bloco para o cliente e um para cada parente ([[+ Parente]]): telefones, e-mails e endereços. Grave tudo o que encontrar.",
            "[[Pedir busca]]: pede ao Administrativo uma consulta (Lemit, Data Solution) do cliente e/ou dos parentes escolhidos. Você recebe o aviso no sino quando ficar pronta e confere as informações antes de gravar.",
            "**Ler consulta (PDF ou texto)**: se você mesmo tem a consulta, o SAGA lê e preenche só o que está vazio na ficha.",
            "**Enviar carta**: manda o endereço para a fila da tela Cartas."
          ],
          img: "ficha_localizacao",
          marcas: ["Localização.", "Pedir busca."],
          atencao: ["CPF da consulta diferente do CPF da ficha: tudo vem desmarcado. Confira antes de gravar."]
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
            "Abra **Intimações**. No alto: disponibilizadas hoje, abertas, prazos vencidos e fora do SAGA.",
            "Veja em **Kanban** (uma coluna por tribunal) ou **Lista**. Use **Só as novas** para ver o que ainda não foi tratado.",
            "A **Justiça Federal** fica na coluna do **TRF** da região, com a **etiqueta do estado** no cartão (ex.: no TRF-2, **RJ** ou **ES**). Tribunal sem intimação aberta fica **oculto** (veja a parte seguinte).",
            "Filtros: situação, período, tribunal, OAB, triagem e a busca (processo, parte, vara, etiqueta ou texto).",
            "[[Trazer para o SAGA em lote]]: cadastra de uma vez os processos das intimações que estão fora do SAGA (um por número)."
          ],
          img: "intimacoes",
          marcas: ["Só as novas.", "Andamentos do CNJ.", "Trazer para o SAGA em lote.", "Cartão da intimação: clique para abrir."]
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
            "Clique no cartão. Leia o texto (o SAGA destaca o prazo que encontrar).",
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
    { id: "tarefas", titulo: "Minhas Tarefas", quem: "Todos",
      resumo: "O que cada um tem a fazer, com prazo e responsável.",
      secoes: [
        { id: "visao", titulo: "Ver e organizar as tarefas",
          quando: "Todo dia, ao começar, e sempre que receber tarefa nova.",
          passos: [
            "Abra **Minhas Tarefas**. A tela abre enxuta: em cima, [[Kanban]] / [[Lista]], [[Mostrar resumo]] e [[Nova Tarefa]]. O número vermelho ao lado de Mostrar resumo é quantas tarefas estão **atrasadas**.",
            "[[Mostrar resumo]] abre os números (total, novas, em andamento, atrasadas e concluídas hoje; clique para filtrar), os gráficos e o calendário dos prazos. [[Esconder resumo]] recolhe. O SAGA lembra a sua escolha neste computador.",
            "Logo abaixo fica a **barra de filtros**: busca, [[Etiqueta]], responsável e prazo. Os outros (tipo, situação, prioridade, tribunal e fase) ficam em [[Mais filtros]]; o número no botão mostra quantos estão ligados lá dentro. Cada filtro ligado aparece como uma etiqueta clicável embaixo (o × tira) e [[Limpar filtros]] tira todos.",
            "No cartão aparece só o essencial: etiqueta, título, situação (Nova, Em andamento...), cliente, **número do processo** (sempre à vista, com o botão do tribunal; o Ctrl+F do navegador acha o processo pelo número), subtarefas, responsável e prazo (a prioridade só quando é alta ou urgente). Passe o mouse para ver o resto: tipo, quem passou a tarefa, compartilhamento e os atalhos [[Ficha]] e [[Intimações]]. No celular, toque no cartão para abrir a tarefa inteira.",
            "As tarefas de **dar impulso processual** (que o SAGA cria nos processos parados) e os **Pedidos do Claude** ficam como atalhos no menu [[Etiqueta]], com o número delas. No filtro **Tipo** (em Mais filtros) também há **Sem as de impulso**.",
            "No Kanban, cada tarefa de processo fica na **coluna do tribunal** daquele processo (veja a parte seguinte)."
          ],
          img: "tarefas",
          marcas: ["Nova Tarefa.", "Mostrar resumo (números, gráficos e calendário); o número vermelho são as atrasadas.", "Etiqueta: o menu de etiquetas.", "Mais filtros: tipo, situação, prioridade, tribunal e fase."]
        },
        { id: "etiquetas", titulo: "Filtrar e criar etiquetas",
          quando: "Para ver só as tarefas de um assunto (ex.: cumprimento, aguardando documento) ou criar uma etiqueta nova.",
          passos: [
            "Clique em [[Etiqueta]] na barra de filtros. O menu mostra cada etiqueta com a quantidade de **tarefas abertas** dela.",
            "Marque uma ou várias: a lista filtra na hora (aparecem as tarefas com qualquer uma das marcadas). Clique de novo para desmarcar, ou em [[Limpar etiquetas]].",
            "No alto do menu ficam os **atalhos** [[Dar impulso processual]] e [[Pedidos do Claude]]: mostram só essas tarefas e podem ser combinados com as etiquetas. A setinha ↗ ao lado de Pedidos do Claude abre a tela própria deles.",
            "Para criar (só o administrador): [[+ Nova etiqueta]], escreva o nome (até 40 letras), escolha a cor e [[Salvar etiqueta]]. Ela já aparece no menu e na janela da tarefa.",
            "Para renomear ou mudar a cor: o lápis ✎ ao lado da etiqueta. Para tirar da lista, desmarque **Mostrar na lista**: as tarefas que já têm a etiqueta continuam com ela (o histórico fica). As tiradas aparecem em [[Ver as tiradas da lista]], e o lápis volta qualquer uma para a lista.",
            "Para mudar a ordem (só o administrador): as setinhas ▲ ▼ ao lado de cada etiqueta sobem ou descem uma posição; a nova ordem vale no menu e na janela da tarefa.",
            "Para pôr a etiqueta numa tarefa: abra a tarefa e escolha em **Etiqueta**, na parte da direita."
          ],
          img: "tarefas_etiquetas",
          marcas: ["Atalhos: Dar impulso processual e Pedidos do Claude.", "Quantas tarefas abertas têm a etiqueta.", "Lápis: renomear, mudar a cor ou tirar da lista (só o administrador).", "+ Nova etiqueta (só o administrador)."],
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
            "Assunto de cliente ou processo: registre também na ficha (comentário), para ficar no histórico do processo."
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
            "Na janela **Enviar e-mail**: o **Modelo** (Automático = o modelo da tese do processo), o **remetente** (Automático = rodízio entre os e-mails de envio disponíveis), o e-mail do cliente e **Quando**. Confira a **prévia** e os avisos e clique em [[Pôr na fila]].",
            "Pronto: o e-mail fica **Na fila**. A cada 10 minutos, dentro da **manhã e da tarde** (dias úteis), o robô manda sozinho, sem passar do limite de cada remetente por turno, espalhando os envios até o fim do turno.",
            "Acompanhe nas abas **Na fila**, **Enviados**, **Com erro** e **Cancelados**. [[Ver e-mail]] mostra o texto exato que saiu. Cliente respondeu? Clique em [[Respondeu]].",
            "**Com erro**: o motivo aparece em vermelho (ex.: \"endereço recusado\"). Corrija o e-mail na ficha e use [[Voltar para a fila]]. Erro passageiro (amarelo) o robô tenta de novo sozinho em 30 min, até 3 vezes.",
            "Cliente pediu para não receber mais (respondeu SAIR, reclamou): aba **Não enviar mais** > [[+ Não enviar mais para um e-mail]]. O que estava na fila para ele é cancelado (LGPD)."
          ],
          img: "disparos",
          marcas: ["Novo disparo: escolher os clientes.", "Situação do robô: última rodada, próxima, remetente com senha recusada (vermelho) ou pausado (amarelo).", "E-mails que não saíram, com o motivo.", "Remetentes: os e-mails de envio e o limite de cada um.", "Modelos de cada tese (pré-aprovados).", "Erro passageiro: o robô tenta de novo sozinho."],
          atencao: ["Os modelos são pré-aprovados pelo Dr. Victor: no envio só entram os dados do cliente (nome, código, tese, número do processo, órgão, cargo). Nunca há valores no e-mail.", "No fim de todo e-mail vai a frase \"Se não quiser mais receber nossos e-mails, responda com a palavra SAIR\". Quem responder SAIR vai para **Não enviar mais**."]
        },
        { id: "disparos-remetentes", titulo: "Disparos: remetentes, modelos e horário",
          quando: "Para cadastrar os e-mails por onde os disparos saem (o Gmail de cada colaborador, o e-mail da Locaweb, da Hostinger...) e os textos de cada tese.",
          passos: [
            "**Remetentes** > [[+ Cadastrar e-mail de envio]]: escolha o provedor (Gmail, Locaweb, Hostinger ou Outro), o e-mail, a senha e os limites por **manhã** e por **tarde** (comece com 20 + 20). No **Gmail** a senha é a **senha de app** (16 letras), criada na conta Google com a verificação em duas etapas ligada. A senha fica no cofre do banco: ninguém vê depois.",
            "Depois de salvar, clique em [[Testar]]: o SAGA manda um e-mail de teste para você. Deu errado? O motivo aparece em vermelho.",
            "Cada colaborador cadastra o **próprio** e-mail (só ele usa). O administrador cadastra os e-mails do escritório e escolhe se **toda a equipe** pode usar.",
            "O provedor recusou por excesso de envios? O remetente fica **pausado até o dia seguinte** (amarelo) e os e-mails saem pelos outros. Senha recusada: fica **vermelho**, o sino avisa o dono e o administrador; corrija a senha e [[Testar]]. [[Pausar até amanhã]] e [[Retomar]] também existem.",
            "**Modelos** (só o administrador): [[+ Novo modelo]] com nome, tese, assunto e texto. Os botões de campo põem {nome}, {primeiro_nome}, {codigo}, {tese}, {numero_processo}, {orgao}, {cargo}, {remetente}... A prévia mostra o texto com um cliente inventado. As setinhas ▲▼ mudam a ordem; o modelo \"Todas as teses\" vale quando a tese não tem modelo próprio.",
            "**Configurações** (só o administrador): ligar/desligar o robô, horário da manhã e da tarde, só dias úteis e quantas tentativas por e-mail; e a lista das últimas rodadas."
          ],
          img: "disparos_enviar",
          marcas: ["Modelo (Automático = o da tese do processo).", "Remetente (Automático = rodízio).", "Prévia do e-mail com os dados do cliente.", "Pôr na fila."],
          atencao: ["Outlook/Hotmail pessoal provavelmente não funciona (a Microsoft bloqueou o login por senha). Prefira Gmail, Locaweb ou Hostinger.", "O Gmail gratuito aguenta cerca de 500 e-mails por dia; muitos e-mails para listas frias levam a conta para o spam. Suba o limite aos poucos."]
        },
        { id: "buscas", titulo: "Pedidos de busca (Lemit, Data Solution)",
          quando: "Quem pede: precisa de telefone ou endereço do cliente/parente. Quem atende (Administrativo): faz a consulta.",
          passos: [
            "**Pedir**: na ficha > Localização > [[Pedir busca]], escolha o cliente e/ou os parentes e a fonte.",
            "**Atender**: em **Pedidos de busca** > **Para atender**, pegue o pedido (A fazer > Em andamento), faça a consulta e use **Ler PDF da consulta**: só as informações lidas vão para o pedido (o PDF não é guardado).",
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
            "**Prateleira de produtos**: os produtos jurídicos que o escritório oferece.",
            "**Radar de oportunidades**: teses que podem render ações novas.",
            "[[Achar clientes para uma tese]]: escolha a tese e o SAGA abre **Clientes por perfil** com os clientes do Jurídico que ainda não têm essa tese. O mesmo botão aparece na tese escolhida no Blog, em cada cartão do \"Por tese\", na leitura de uma atualização e na pasta do produto.",
            "Quem pode publica com [[+ Nova atualização]]."
          ],
          img: "teses",
          marcas: ["Atualizações de teses.", "Prateleira de produtos.", "Radar de oportunidades.", "Achar clientes para uma tese.", "Nova atualização."],
          dicas: ["Ctrl+clique no botão abre os clientes em outra aba, e a tela de Teses continua aberta."]
        },
        { id: "perfil", titulo: "Clientes por perfil",
          quando: "Para achar clientes de um perfil (ex.: servidores aposentados de um órgão) e oferecer uma tese que eles ainda não têm.",
          passos: [
            "Abra **Clientes por perfil**, ou venha de **Teses e oportunidades** pelo botão [[Achar clientes para esta tese]]: a tela já abre com os clientes do Jurídico que ainda não têm a tese, e um aviso no alto diz qual é o filtro.",
            "Filtre por situação funcional, órgão, cargo, UF, idade, ano de ingresso e de aposentadoria.",
            "Use **Já tem a tese** e **Ainda não tem a tese** para achar quem pode receber a oferta. **Com perfil preenchido** ou **Todos os clientes**, e **Jurídico**, **Captação** ou os dois, mudam de onde vêm os clientes.",
            "[[Ver sem esta tese]] tira o filtro da tese; [[Limpar filtros]] volta tudo ao começo.",
            "[[Salvar em PDF]] para levar a lista."
          ],
          img: "clientes_perfil",
          marcas: ["Aviso: de qual tese são os clientes mostrados.", "Ainda não tem a tese.", "Jurídico, Captação ou os dois.", "Salvar em PDF."]
        },
        { id: "editorpdf", titulo: "Editor de PDF: juntar, separar, girar e comprimir",
          quando: "Para montar a petição com os documentos, tirar páginas, separar por limite de tamanho, girar página escaneada de lado ou reduzir o tamanho antes de protocolar. Use SEMPRE este editor em vez de sites de PDF da internet (LGPD).",
          passos: [
            "Abra **Processos > Editor de PDF** e arraste os PDFs para a tela (ou clique para escolher). Vários de uma vez viram uma fila só; cada arquivo ganha uma letra (A, B, C...). Para acrescentar depois: [[Mais PDFs]].",
            "**Reordenar**: arraste a página para o lugar novo (no celular, segure o dedo um instante e arraste) ou use as setinhas ‹ › no pé da página.",
            "**Marcar**: clique na página (ou no quadradinho). Com páginas marcadas: [[Tirar marcadas]], [[Extrair marcadas]] (baixa só elas num PDF à parte), [[Girar à esq.]] e [[Girar à dir.]] (sem nada marcado, giram todas). [[Desfazer]] (ou Ctrl+Z) volta a última mudança.",
            "[[Separar]]: cada página num arquivo, por intervalos (ex.: 1-3, 5, 7-9) ou de tantas em tantas páginas. Vários arquivos vêm juntos num .zip.",
            "[[Numerar]]: escolha o formato (1, 1 / 10, Página 1 de 10, Fls. 1), o lugar e se a capa fica sem número.",
            "**Escrever ou tapar**: no lápis da página, escolha **Texto** (escreva e clique onde ele deve ficar) ou **Tapar área** (arraste sobre o CPF, a assinatura...). Com **Apagar de verdade**, a página com tarja vira imagem para o texto de baixo sumir do arquivo.",
            "[[Comprimir]]: escolha o nível, clique em [[Calcular]] e veja o tamanho antes e depois; só então baixe.",
            "Dê o nome no campo ao lado e clique em [[Baixar PDF]]. Veio da ficha? [[Guardar na pasta do cliente]] guarda o resultado como documento NOVO na mesma pasta (o original fica)."
          ],
          img: "editor_pdf",
          marcas: ["Abrir mais PDFs.", "Página marcada: arraste para mudar a ordem; lápis, girar e tirar no canto.", "Tirar as páginas marcadas.", "Separar em vários arquivos.", "Reduzir o tamanho.", "Nome do arquivo e Baixar PDF."],
          atencao: ["Os níveis Leve, Média e Forte do Comprimir transformam cada página em imagem: o texto deixa de ser selecionável. Confira antes de protocolar.", "PDF com senha pede a senha (que não é guardada); PDF com defeito ou trava do autor mostra o motivo em vermelho ou amarelo no alto."],
          dicas: ["Na ficha, abra o PDF guardado e use o botão do editor (ao lado de Baixar) para levá-lo direto ao Editor de PDF."]
        },
        { id: "claude", titulo: "Ligar o SAGA no seu Claude (conector)",
          quando: "Para pedir ao Claude que consulte e faça o trabalho do SAGA por você (achar cliente, ver processo, criar e mudar tarefas, agenda, anotações, valores...), sem abrir a tela.",
          passos: [
            "No Claude (site claude.ai ou aplicativo), abra **Configurações > Conectores** e clique em [[Adicionar conector personalizado]].",
            "Nome: **SAGA**. Endereço (URL): **https://fmoskdxgjulagedzjxxk.supabase.co/functions/v1/saga-mcp**. Clique em [[Adicionar]].",
            "Clique em [[Conectar]]: abre o SAGA. Entre com o SEU e-mail e senha (ou Google). A página mostra \"Você está conectando o Claude como: seu nome\"; confira e clique em [[Autorizar]].",
            "Pronto: numa conversa, peça, por exemplo, \"No SAGA, quais são minhas tarefas de hoje?\". Antes de mudar qualquer coisa, o Claude diz o que vai mudar e espera o seu OK.",
            "**Guardar um documento da conversa na pasta do cliente**: diga, por exemplo, \"guarde este contracheque na pasta Contracheques do cliente VMM-01234\". O Claude confirma e manda um **link do SAGA**: toque nele, entre com o seu login se pedir e clique em [[Escolher arquivo]] (no celular: galeria, câmera ou arquivos; no computador: escolha ou arraste). O arquivo vai do seu aparelho direto para a ficha, na pasta escolhida (dá para trocar a pasta na própria página), até 50 MB por arquivo, vários de uma vez. Depois diga ao Claude \"enviei\": ele confere se chegou. O link vale 24 h e só para você."
          ],
          atencao: ["O Claude age COMO VOCÊ: só vê e só muda o que você já vê e muda na tela. Colaborador não apaga nada (só o administrador, e sempre com o OK dele na conversa).", "Tudo o que o Claude consulta ou muda fica no Registro de atividades com o seu nome (módulo \"SAGA no Claude\"), com o antes e o depois.", "Apareceu \"Seu usuário não tem a permissão do conector\"? Peça ao administrador (Painel de permissões > SAGA no Claude)."],
          dicas: ["Use o código do cliente (VMM-01234) ou do processo (VMM-01234-PSS) no pedido: evita confusão entre homônimos.", "O que o Claude pedir para você trazer (autos, certidão...) aparece em Meu dia > Pedidos do Claude."]
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
            "Exemplos: atender pedidos de busca, aprovar artes do Marketing, responder sugestões, atender clientes na agenda, usar o SAGA no Claude."
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
        { id: "dashboard", titulo: "Dashboard",
          quando: "Para ver o resumo do escritório.",
          passos: [
            "Abra **Dashboard**: processos por fase e área, prazos vencidos, tarefas pendentes, intimações e avisos.",
            "Escolha o período e a equipe e clique em [[Aplicar]].",
            "**Processos sem movimentação** (mais de 30, 60, 90 e 120 dias, e sem data) e **Resumo do agente**: clique na linha para abrir a lista dos processos ativos do Jurídico. Na lista, troque a faixa no alto, filtre pelo nome, número ou responsável e clique no processo para abrir a ficha (Ctrl+clique abre em outra aba).",
            "Na lista **Sem resumo do agente**, [[Copiar números]] copia os números dos processos para baixar os autos e mandar ao agente, que faz o resumo estratégico e envia a ficha ao SAGA."
          ],
          img: "dashboard",
          marcas: ["Período.", "Aplicar."]
        },
        { id: "biblioteca", titulo: "Biblioteca de modelos e Treinamentos",
          quando: "Para achar um modelo de petição ou documento, ou estudar os materiais da equipe.",
          passos: [
            "**Biblioteca de Modelos**: modelos organizados em categorias e pastas. Busque e baixe o modelo.",
            "**Treinamentos**: materiais, perguntas e respostas, roteiros de atendimento e fluxos de trabalho. Abra, estude e marque como concluído. O administrador exclui um treinamento pela lixeira do cartão (aparece ao passar o mouse) ou pelo botão [[Excluir]] dentro dele."
          ],
          img: "biblioteca",
          marcas: ["Nova categoria (quem pode).", "Ver em grade ou lista."]
        },
        { id: "timbrados", titulo: "Timbrados e modelos de petição",
          quando: "Para fazer uma petição já no papel timbrado da Victor Morais Advocacia, da ANCREF ou da Sarmento, em Word ou em PDF, ou para baixar o papel timbrado em branco.",
          passos: [
            "Abra **Biblioteca** e clique em [[Timbrados e modelos]], no alto da coluna das categorias.",
            "Em **Modelos de petição**, escolha o escritório no alto (ou [[Todos]]) e clique em [[Gerar petição]] no modelo.",
            "Na janela, confira o **Papel timbrado** (dá para trocar: o mesmo texto sai em qualquer um dos três) e, no da Victor Morais Advocacia, a **Versão**: colorida (para enviar) ou para imprimir (sem as faixas).",
            "Preencha o que quiser: juízo, número do processo (os pontos e o traço entram sozinhos), cliente, nome da peça, fatos, direito e pedidos. O que ficar em branco sai entre colchetes, por exemplo [Do direito], para completar depois no Word. A data em branco sai com a data de hoje.",
            "Para destacar um nome de pessoa ou órgão como no Padrão VMM (negrito, itálico e versalete), escreva dois asteriscos (o sinal de estrelinha) antes e dois depois do nome, sem espaço. Dois sublinhados antes e dois depois deixam o texto só em negrito.",
            "Clique em [[Baixar Word]] ou [[Baixar PDF]]. O arquivo é montado no seu computador e vai para a pasta de downloads; nada é enviado para fora.",
            "Em **Papéis timbrados** ficam os três papéis oficiais, cada um guardado uma vez só: [[Word em branco]], [[PDF em branco]] e, no da Victor Morais Advocacia, [[Word para impressão]].",
            "Só o administrador: [[Trocar timbrado]] guarda os arquivos novos de um timbrado (o Word e o fundo do PDF). A partir daí todas as petições novas saem com o timbrado novo; o arquivo antigo continua guardado."
          ],
          img: "biblioteca_timbrados",
          marcas: ["Timbrados e modelos, no alto das categorias.", "Escolher o escritório.", "Gerar a petição em Word ou PDF.", "O papel timbrado de cada escritório, com os botões para baixar em branco (e Trocar, só o administrador)."],
          dicas: ["No PDF da ANCREF e da Sarmento, a letra Segoe UI do Word é trocada por uma muito parecida (Open Sans), porque a Segoe UI não pode ser usada fora do Windows. No Word baixado fica a letra original.", "Se aparecer um aviso vermelho dizendo que não foi possível gerar, mande a mensagem ao administrador: ela diz o que faltou."]
        },
        { id: "config", titulo: "Configurações do escritório e listas de opções",
          quando: "Quando o administrador precisa mudar uma opção de menu, uma área do direito ou um dado do escritório.",
          passos: [
            "**Configurações > Áreas e tipos de ação** e **Escritório** (só o administrador).",
            "Toda lista de opções (etiquetas, situações, etapas, categorias, fontes de busca, origens, respostas prontas) se cria, renomeia, reordena e remove na própria tela. Remover só desativa: o histórico fica.",
            "**SAGA no Claude**: toda a equipe pode ligar o SAGA no próprio Claude (ver o capítulo de Cartas, buscas, teses, perfis e PDF), com o próprio login (só vê e muda o que já pode; tudo vai para o Registro de atividades). O administrador tira a permissão de alguém no Painel de permissões > SAGA no Claude."
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
