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
  versao: "1.0",
  data: "10/11/2026",
  titulo: "Manual do SAGA",
  subtitulo: "Procedimento Operacional Padrão de uso do sistema do escritório",
  escritorio: "Victor Morais Advocacia (VMMADV)",
  aprovacao: "Dr. Victor de Medeiros Morais",
  pdf: "manual/POP_SAGA_ADV.pdf",

  revisoes: [
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
      "**Viu algo errado ou tem uma ideia?** Use [[Sugerir uma melhoria]] (menu da foto). Não mude o jeito de trabalhar por conta própria."
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
            "No **menu da esquerda** ficam as telas, em três grupos: **Operação** (o trabalho do dia a dia), **Comunicação** e **Gestão**. Só aparece o que você tem permissão para ver.",
            "No alto, da esquerda para a direita: o botão do menu, a **busca**, quem está online, o **sino**, o **olho** (modo privacidade), atualizar, o **tema** (claro ou escuro) e a sua **foto**.",
            "Os números ao lado dos itens do menu (Agenda, Minhas Tarefas, Chat) mostram o que há para hoje ou o que não foi lido."
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
        { id: "foto", titulo: "Menu da foto: perfil, sugestões e sair",
          quando: "Para mudar os seus dados, a senha, as preferências, sugerir uma melhoria ou sair do sistema.",
          passos: [
            "Clique na sua **foto** (canto de cima, à direita).",
            "**Meu perfil**: foto, nome, telefone e OAB. **Segurança e aparelhos**: troca de senha e aparelhos conectados.",
            "**Preferências**: tema, cor, tamanho da letra, efeitos de movimento e avisos.",
            "**Manual do SAGA**: abre este manual já no capítulo da tela em que você está (o manual também fica no menu da esquerda, em Comunicação).",
            "**Sugerir uma melhoria**: abre a sugestão já marcada na tela em que você está.",
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
            "**Cor do tema**: Azul (padrão) ou Grafite. Clique numa cor para ver como fica; ela só vale para todas as telas quando você clica em [[Salvar cor do tema]] ([[Cancelar]] volta para a anterior).",
            "**Efeitos de movimento**: Ligados (janelas abrem e fecham suaves) ou Desligados (troca na hora).",
            "**Tamanho da letra**: Normal, Grande ou Maior."
          ],
          img: "configuracoes",
          marcas: ["Aba Preferências.", "Tema claro ou escuro.", "Cor do tema: Azul ou Grafite.", "Efeitos de movimento."],
          dicas: ["O administrador pode fixar a cor de um colaborador; nesse caso a escolha fica travada."]
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
            "Preencha o **número do processo** (se já existir), a **área do direito** e o **tipo de ação**, o **status inicial** e o **responsável**.",
            "Valor da causa e honorários (%), se souber. Em **Outros clientes ou herdeiros** acrescente quem mais faz parte.",
            "Em **De onde veio o cliente?** marque a rede social ou a campanha. Dica: cole a 1ª mensagem do cliente; o código da campanha (ex.: [IR27]) marca tudo sozinho.",
            "Salve. A ficha do cliente abre com o processo novo."
          ],
          img: "novo_processo",
          marcas: ["Cliente (procure antes de cadastrar, para não repetir).", "Número do processo, se já houver.", "De onde veio o cliente (rede social, campanha ou indicação)."],
          atencao: ["Antes de cadastrar, procure o CPF na busca do alto: o cliente pode já existir com outro processo."]
        },
        { id: "planilhas", titulo: "Importar planilha e distribuir fichas",
          quando: "Quando chega uma lista nova de possíveis clientes ou é preciso dividir a lista entre a equipe.",
          passos: [
            "**Importar planilha**: cole as linhas do Excel ou escolha o arquivo; o SAGA mostra a prévia antes de gravar.",
            "**Distribuir fichas**: escolha as pessoas e a quantidade; cada uma recebe as suas fichas como responsável.",
            "Os dois botões só aparecem para quem tem permissão."
          ]
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
            "O painel **Processos parados** mostra há quanto tempo cada processo está sem movimento no escritório. O responsável recebe tarefa e aviso automáticos."
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
            "**Recursos deste processo**: agravos, apelações e embargos ficam aqui, com número, tribunal, relator e situação. Use [[+ Recurso]] para cadastrar. Intimação com o número do recurso cai neste processo.",
            "**Andamentos no tribunal (CNJ)**: os movimentos trazidos da base pública do CNJ. Os importantes (pagamento, RPV/precatório, trânsito em julgado, sentença, decisão, audiência) ficam destacados e avisam o responsável no sino.",
            "[[Atualizar agora]] consulta o CNJ na hora (leva cerca de 1 minuto). [[Ver todos]] mostra o histórico inteiro."
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
            "Intimação com número de processo cadastrado entra direto no processo; sem processo, fica em **Fora do SAGA**."
          ]
        },
        { id: "tela", titulo: "A tela de Intimações",
          quando: "Todo dia, ao começar e ao longo do dia.",
          passos: [
            "Abra **Intimações**. No alto: disponibilizadas hoje, abertas, prazos vencidos e fora do SAGA.",
            "Veja em **Kanban** (uma coluna por tribunal) ou **Lista**. Use **Só as novas** para ver o que ainda não foi tratado.",
            "Filtros: situação, período, tribunal, OAB, triagem e a busca (processo, parte, vara, etiqueta ou texto).",
            "[[Trazer para o SAGA em lote]]: cadastra de uma vez os processos das intimações que estão fora do SAGA (um por número)."
          ],
          img: "intimacoes",
          marcas: ["Só as novas.", "Andamentos do CNJ.", "Trazer para o SAGA em lote.", "Cartão da intimação: clique para abrir."]
        },
        { id: "tratar", titulo: "Tratar uma intimação (triagem, prazo e tarefa)",
          quando: "Para cada intimação nova.",
          passos: [
            "Clique no cartão. Leia o texto (o SAGA destaca o prazo que encontrar).",
            "**Triagem**: tem algo a fazer? Clique em [[Criar tarefa]]. Não exige nada? Clique em [[Vista (nada a fazer)]].",
            "**Prazo**: o SAGA sugere pelo texto (ex.: 15 dias) e conta em **dias úteis** (sem sábados, domingos, feriados do escritório e o recesso de 20/12 a 20/01). Use os atalhos 5, 10, 15, 30 ou escolha a data.",
            "**Etiqueta** (o que fazer) e a cor; depois [[Salvar prazo e etiqueta]].",
            "Comente para a equipe e, quando terminar, clique em [[Concluir]].",
            "[[Abrir processo no tribunal]] copia o número e abre a consulta; **Abrir ficha do cliente** leva ao processo no SAGA."
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
            "Abra **Minhas Tarefas**. No alto: total, novas, em andamento, **atrasadas** e concluídas hoje (clique para filtrar).",
            "Veja em **Kanban** (arraste o cartão entre as colunas) ou **Lista**. O calendário mostra os prazos do mês.",
            "[[Filtros]]: tipo, situação, prioridade, prazo e responsável."
          ],
          img: "tarefas",
          marcas: ["Nova Tarefa.", "Filtros.", "Atrasadas: comece por elas."]
        },
        { id: "nova", titulo: "Criar uma tarefa",
          quando: "Quando surge algo a fazer: para você ou para um colega.",
          passos: [
            "Clique em [[Nova Tarefa]] (ou crie pela intimação, pela ficha ou pelo cartão).",
            "Escreva o **título** do que precisa ser feito (ex.: Protocolar petição de cumprimento de sentença).",
            "**Pessoal** ou **Vinculada a processo** (escolha o processo). Descrição, se precisar.",
            "**Responsável**, outros responsáveis e com quem compartilhar.",
            "**Prazo**: Hoje, Amanhã, Esta semana ou a data (o SAGA mostra o prazo em dias úteis).",
            "Salve. O responsável recebe o aviso no sino."
          ],
          img: "nova_tarefa",
          marcas: ["Título da tarefa."],
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
            "Menu da foto > [[Sugerir uma melhoria]] (já marca a tela em que você está) ou **Sugestões de melhoria** no menu.",
            "Clique em [[+ Nova sugestão]], escreva e cole até 6 prints (Ctrl+V).",
            "Todos veem as sugestões, comentam e apoiam (**Também quero**).",
            "O Dr. Victor muda a situação (Nova, Em análise, Aprovada, Em desenvolvimento, Concluída...) e responde. Você recebe o aviso no sino."
          ],
          img: "sugestoes",
          marcas: ["Nova sugestão.", "Ver por aba, em Kanban ou em lista.", "Buscar sugestões."]
        }
      ]
    },

    /* ----------------------------------------------------------------- */
    { id: "operacao", titulo: "Cartas, buscas, teses e perfis", quem: "Conforme a permissão",
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
          quando: "Para acompanhar as teses do escritório e as oportunidades de ação.",
          passos: [
            "**Atualizações de teses**: novidades de cada tese (julgamentos, mudanças), em Blog, Linha do tempo, Por tese ou Lista.",
            "**Prateleira de produtos**: os produtos jurídicos que o escritório oferece.",
            "**Radar de oportunidades**: teses que podem render ações novas.",
            "Quem pode publica com [[+ Nova atualização]]."
          ],
          img: "teses",
          marcas: ["Atualizações de teses.", "Prateleira de produtos.", "Radar de oportunidades.", "Nova atualização."]
        },
        { id: "perfil", titulo: "Clientes por perfil",
          quando: "Para achar clientes de um perfil (ex.: servidores aposentados de um órgão) e oferecer uma tese que eles ainda não têm.",
          passos: [
            "Abra **Clientes por perfil**.",
            "Filtre por situação funcional, órgão, cargo, UF, idade, ano de ingresso e de aposentadoria.",
            "Use **Já tem a tese** e **Ainda não tem a tese** para achar quem pode receber a oferta.",
            "[[Salvar em PDF]] para levar a lista."
          ],
          img: "clientes_perfil",
          marcas: ["Nome ou CPF.", "Ainda não tem a tese.", "Salvar em PDF."]
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
            "Escolha o período e a equipe e clique em [[Aplicar]]."
          ],
          img: "dashboard",
          marcas: ["Período.", "Aplicar."]
        },
        { id: "biblioteca", titulo: "Biblioteca de modelos e Treinamentos",
          quando: "Para achar um modelo de petição ou documento, ou estudar os materiais da equipe.",
          passos: [
            "**Biblioteca de Modelos**: modelos organizados em categorias e pastas. Busque e baixe o modelo.",
            "**Treinamentos**: materiais, perguntas e respostas, roteiros de atendimento e fluxos de trabalho. Abra, estude e marque como concluído."
          ],
          img: "biblioteca",
          marcas: ["Nova categoria (quem pode).", "Ver em grade ou lista."]
        },
        { id: "config", titulo: "Configurações do escritório e listas de opções",
          quando: "Quando o administrador precisa mudar uma opção de menu, uma área do direito ou um dado do escritório.",
          passos: [
            "**Configurações > Áreas e tipos de ação** e **Escritório** (só o administrador).",
            "Toda lista de opções (etiquetas, situações, etapas, categorias, fontes de busca, origens, respostas prontas) se cria, renomeia, reordena e remove na própria tela. Remover só desativa: o histórico fica.",
            "**SAGA no Claude**: quem tem a permissão consulta o SAGA pelo Claude, com o próprio login (só vê o que já pode ver; tudo vai para o Registro de atividades)."
          ]
        }
      ]
    }
  ],

  duvidas: [
    ["Fiz uma mudança e não aparece para mim.", "Aperte F5. Se não resolver, Ctrl+Shift+R (recarrega tudo)."],
    ["Não vejo uma tela ou um botão que o colega vê.", "É permissão. Peça ao administrador para liberar no Painel de permissões."],
    ["Errei uma informação.", "Edite. Colaborador não apaga; a edição fica registrada com o antes e o depois. Se precisar mesmo apagar, peça ao administrador."],
    ["Cadastrei o cliente duas vezes.", "Avise o administrador: ele junta ou remove o repetido. Antes de cadastrar, procure o CPF na busca do alto."],
    ["Esqueci a senha.", "Na tela de entrada, clique em Esqueci a senha e siga o e-mail."],
    ["O SAGA me tirou do sistema.", "Ficou muito tempo parado ou está fora do horário/local liberado. Entre de novo; se não deixar, fale com o administrador."],
    ["Esqueci de bater o ponto.", "Faça a justificativa no Ponto, no mesmo dia, com o horário certo."],
    ["O cliente ligou e não sei quem é.", "Digite o telefone na busca do alto: o SAGA procura nos telefones, na Localização e nas anotações."],
    ["Chegou intimação de um processo que não está no SAGA.", "Ela fica em Fora do SAGA. Cadastre o processo (ou use Trazer para o SAGA em lote) e ela é ligada sozinha."],
    ["Vou gravar a tela para um treinamento.", "Ligue o modo privacidade (o olho no alto) antes de gravar."]
  ]
};
