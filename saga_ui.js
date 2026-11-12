// SAGA UI - carrega sidebar e topbar unificadas + logica compartilhada da topbar
// Uso: <div id="sidebarSaga"></div>  +  <header class="topbar" id="topbarSaga"></header>
// Chamar (apos criar o cliente _sb do Supabase): SagaUI.carregar('nome-tela');
// A sidebar e a topbar sao embutidas neste arquivo (nao dependem de fetch).
(function(global){
  // Formatos de exibição (regra de 04/11: todo dado com formato aparece no padrão, venha o banco com ou sem pontuação).
  // Uso: sagaFmt.cpf(v), sagaFmt.cnj(v), sagaFmt.tel(v), sagaFmt.cep(v), sagaFmt.moeda(v). Se o número não tiver
  // o tamanho esperado, devolve o texto como veio (não esconde dado estranho).
  global.sagaFmt=(function(){
    function dig(v){return String(v==null?'':v).replace(/\D/g,'');}
    function pad(d,p){var r='',i=0;for(var k=0;k<p.length&&i<d.length;k++){if(p[k]==='#')r+=d[i++];else r+=p[k];}return r;}
    function cru(v){return v==null?'':String(v);}
    return {
      cpf:function(v){var d=dig(v);if(d.length===11)return pad(d,'###.###.###-##');if(d.length===14)return pad(d,'##.###.###/####-##');return cru(v);},
      cnj:function(v){var d=dig(v);return d.length===20?pad(d,'#######-##.####.#.##.####'):cru(v);},
      tel:function(v){var d=dig(v);if(d.length>11&&d.indexOf('55')===0)d=d.slice(2);if(d.length===11)return pad(d,'(##) #####-####');if(d.length===10)return pad(d,'(##) ####-####');return cru(v);},
      cep:function(v){var d=dig(v);return d.length===8?pad(d,'#####-###'):cru(v);},
      moeda:function(v){if(v==null||v==='')return '';var n=Number(v);return isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):cru(v);}
    };
  })();
  // Confirmacao no padrao do SAGA (no lugar do confirm() do navegador). Devolve uma Promise<boolean>.
  // true só para o administrador geral (regra de 09/11: colaborador não apaga nada)
  global.sagaPodeApagar=function(){return document.documentElement.classList.contains('saga-pode-apagar');};
  global.sagaConfirmar=function(titulo,texto,botao,perigo){
    return new Promise(function(ok){
      var antigo=document.getElementById('sagaConfirma');if(antigo)antigo.remove();
      var d=document.createElement('div');d.id='sagaConfirma';
      d.style.cssText='position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,14,.55);backdrop-filter:blur(4px)';
      var cor=perigo===false?'var(--gold,#2f6cd6)':'var(--danger,#e5484d)';
      d.innerHTML='<div role="dialog" aria-modal="true" style="width:100%;max-width:420px;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:16px;background:var(--panel-solid,#1c2638);color:var(--text,#e8edf5);box-shadow:0 24px 50px rgba(0,0,0,.45);padding:20px 22px">'+
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:21px;font-weight:700;margin-bottom:8px"></div>'+
        '<div style="font-size:12.5px;line-height:1.55;color:var(--muted,#a3afc2);margin-bottom:18px;white-space:pre-wrap"></div>'+
        '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-r="0" style="height:36px;padding:0 16px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,.16));background:transparent;color:var(--text,#e8edf5);font:inherit;font-size:12px;font-weight:700;cursor:pointer">Cancelar</button>'+
        '<button type="button" data-r="1" style="height:36px;padding:0 16px;border-radius:10px;border:1px solid '+cor+';background:'+cor+';color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer"></button></div></div>';
      var caixa=d.firstChild;caixa.children[0].textContent=titulo||'Confirmar';caixa.children[1].textContent=texto||'';
      caixa.querySelector('[data-r="1"]').textContent=botao||'Confirmar';
      function fim(v){document.removeEventListener('keydown',tecla,true);d.remove();ok(v);}
      function tecla(e){if(e.key==='Escape'){e.preventDefault();fim(false);}else if(e.key==='Enter'){e.preventDefault();fim(true);}}
      d.addEventListener('click',function(e){var b=e.target.closest('[data-r]');if(b)fim(b.dataset.r==='1');else if(e.target===d)fim(false);});
      document.addEventListener('keydown',tecla,true);
      document.body.appendChild(d);
      setTimeout(function(){var b=caixa.querySelector('[data-r="0"]');if(b)b.focus();},30);
    });
  };
  // Troca de tela pelo menu; com saga_guard.js ha uma saida suave
  if(!global.sagaIrPara)global.sagaIrPara=function(url){if(url)window.location.href=url;};
  // Cores do tema disponíveis (para criar outra: incluir aqui e as regras html[data-cor="..."] no saga_tema.css)
  // Nome de cada tema (cor + modo), para conversar sobre ele: Azul Marinho/Azul Porcelana e Grafite Noturno/Grafite Linho
  // grupo: como as cores aparecem em Configurações > Preferências (12/11, T151b: cartões iguais, em grupos)
  global.SAGA_GRUPOS_CORES=[{id:'classicos',nome:'Clássicos'},{id:'campanhas',nome:'Campanhas'},{id:'vidro',nome:'Vidro tecnológico'}];
  global.SAGA_CORES=[{id:'azul',nome:'Azul',descricao:'Padrão do sistema',escuro:'Azul Marinho',claro:'Azul Porcelana',grupo:'classicos',padrao:true},
    {id:'grafite',nome:'Grafite',descricao:'Grafite com detalhes em champanhe',escuro:'Grafite Noturno',claro:'Grafite Linho',grupo:'classicos'},
    // 12/11 (T48): temas de campanha; com o "Tema do mês" ligado, entram sozinhos no mês de cada um
    {id:'novembro',nome:'Novembro Azul',descricao:'Campanha de saúde do homem',escuro:'Novembro Azul Noite',claro:'Novembro Azul Céu',mes:11,grupo:'campanhas'},
    {id:'rosa',nome:'Rosa',descricao:'Outubro Rosa: prevenção do câncer de mama',escuro:'Rosa Noite',claro:'Rosa Pétala',mes:10,grupo:'campanhas'},
    {id:'natal',nome:'Natal',descricao:'Verde, vermelho e dourado de fim de ano',escuro:'Natal Pinheiro',claro:'Natal Neve',mes:12,grupo:'campanhas'},
    // 12/11 (T151): "Vidro tecnológico" (vidro: true = tem fundo e opções próprias em Configurações > Preferências)
    {id:'vidro',nome:'Azul profundo',descricao:'Vidro tecnológico: placas de vidro sobre um fundo à sua escolha',escuro:'Vidro Azul Noite',claro:'Vidro Azul Gelo',vidro:true,grupo:'vidro'},
    {id:'vidro-ciano',nome:'Ciano holográfico',descricao:'Vidro tecnológico com destaque ciano',escuro:'Vidro Ciano Noite',claro:'Vidro Ciano Claro',vidro:true,grupo:'vidro'},
    {id:'vidro-ambar',nome:'Âmbar de reator',descricao:'Vidro tecnológico com destaque âmbar',escuro:'Vidro Âmbar Noite',claro:'Vidro Âmbar Claro',vidro:true,grupo:'vidro'},
    {id:'vidro-aurora',nome:'Aurora violeta',descricao:'Vidro tecnológico com destaque violeta',escuro:'Vidro Aurora Noite',claro:'Vidro Aurora Claro',vidro:true,grupo:'vidro'},
    // coringa: a pessoa escolhe a cor (saga-vidro-cor) e o saga_guard.js monta o resto (sagaVidroLivre)
    {id:'vidro-livre',nome:'A sua cor',descricao:'Vidro tecnológico na cor que você escolher',escuro:'Vidro com a sua cor (noite)',claro:'Vidro com a sua cor (dia)',vidro:true,livre:true,grupo:'vidro'}];
  // cor de fundo de cada tema antes da 1ª imagem da tela ([escuro, claro]); o saga_guard.js tem a mesma lista
  global.SAGA_FUNDOS={azul:['#172234','#f3f5f8'],grafite:['#1A1A1A','#F3F2EF'],novembro:['#0B1B2C','#F0F7FD'],rosa:['#1E1219','#FDF3F7'],natal:['#0E1D16','#FAF8F2'],vidro:['#0A1B2E','#E1E8F0'],'vidro-ciano':['#04161C','#DDF3F3'],'vidro-ambar':['#120D08','#F6ECDD'],'vidro-aurora':['#0E0A1F','#ECE8FA'],'vidro-livre':['#0A1B2E','#E1E8F0']};
  global.sagaFundoCor=function(cor,claro){if(cor==='vidro-livre'&&global.sagaVidroLivre){try{var vl=global.sagaVidroLivre(localStorage.getItem('saga-vidro-cor')||'#5AA9FF');return claro?vl.c.fundo:vl.e.fundo;}catch(e){}}
    var f=global.SAGA_FUNDOS[cor]||global.SAGA_FUNDOS.azul;return claro?f[1]:f[0];};
  // "Tema do mês" (12/11): o administrador liga e escolhe a cor de cada mês (padrão: out Rosa, nov Novembro Azul, dez Natal);
  // vale para toda a equipe, menos para quem tem a cor fixada pelo administrador
  global.sagaTemaDoMes=function(rg,data){rg=rg||global._sagaTemasRegra||{};var m=rg.mes||{};if(!m.ativo)return null;
    var mes=String(((data||new Date()).getMonth())+1),cor=(m.meses||{})[mes];
    return cor&&global.SAGA_CORES.some(function(c){return c.id===cor;})?cor:null;};
  global.sagaNomeTema=function(cor,modo){var c=global.SAGA_CORES.find(function(x){return x.id===cor;})||global.SAGA_CORES[0];return modo==='light'?c.claro:c.escuro;};
  // dica do botão do sol e da lua: diz qual tema vai entrar ao clicar
  global.sagaTituloTema=function(){var b=document.getElementById('themeToggle');if(!b)return;var cor=document.documentElement.getAttribute('data-cor')||'azul';
    var modo=(document.body&&document.body.getAttribute('data-theme'))==='light'?'light':'dark';var outro=modo==='light'?'dark':'light';
    var t='Agora: '+global.sagaNomeTema(cor,modo)+'. Clique para '+global.sagaNomeTema(cor,outro)+'.';b.setAttribute('title',t);b.setAttribute('aria-label',t);};
  // cores que a pessoa pode usar: fixada > "todos" para ela > regra geral do escritório (o Azul sempre pode)
  global.sagaTemasPermitidos=function(u){
    u=u||_perfilAtual||{};var todas=global.SAGA_CORES.map(function(c){return c.id;});
    if(u.tema_cor_fixo)return [u.tema_cor_fixo];
    var rg=global._sagaTemasRegra||{todos:true};
    var tm=global.sagaTemaDoMes(rg);if(tm)return [tm];
    if(u.temas_modo==='todos'||rg.todos!==false||u.eh_administrador)return todas;
    var lib=(rg.liberados||[]).concat(['azul']);return todas.filter(function(id){return lib.indexOf(id)>=0;});
  };
  // opcoes.previa = só mostra nesta tela (Configurações, antes de "Salvar cor do tema"): não grava no navegador
  // nem muda as outras abas abertas
  // 12/11 (T151): opções do Vidro tecnológico, de cada pessoa NESTE navegador: fundo (montanhas, grade ou imagem
  // própria, guardada só aqui, diminuída) e "Vidro mais fosco". O saga_guard.js aplica antes da 1ª imagem da tela.
  global.sagaVidro={
    opcoes:function(){var o={fundo:'montanhas',fosco:false,imagem:null,cor:'#5AA9FF'};try{o.fundo=localStorage.getItem('saga-vidro-fundo')||'montanhas';o.fosco=localStorage.getItem('saga-vidro-fosco')==='1';o.imagem=localStorage.getItem('saga-vidro-imagem');o.cor=localStorage.getItem('saga-vidro-cor')||'#5AA9FF';}catch(e){}if(o.fundo==='imagem'&&!o.imagem)o.fundo='montanhas';return o;},
    aplicar:function(){var h=document.documentElement,o=global.sagaVidro.opcoes();h.setAttribute('data-vidro-fundo',o.fundo);h.classList.toggle('vidro-fosco',o.fosco);
      if(global.sagaVidroAplicarLivre)global.sagaVidroAplicarLivre(o.cor);
      if((h.getAttribute('data-cor')||'')==='vidro-livre'){var claro=(document.body&&document.body.getAttribute('data-theme'))==='light';h.style.background=global.sagaFundoCor('vidro-livre',claro);h.style.setProperty('--vd-fundo-html',h.style.background);}
      if(o.fundo==='imagem'&&o.imagem)h.style.setProperty('--vidro-img','url("'+o.imagem+'")');else h.style.removeProperty('--vidro-img');},
    definir:function(chave,valor){try{if(valor===null||valor===undefined||valor===false)localStorage.removeItem('saga-vidro-'+chave);else localStorage.setItem('saga-vidro-'+chave,valor===true?'1':String(valor));}catch(e){return false;}global.sagaVidro.aplicar();return true;}
  };
  global.sagaAplicarCor=function(cor,opcoes){
    if(!global.SAGA_CORES.some(function(c){return c.id===cor;}))cor='azul';
    var h=document.documentElement;
    if(cor==='azul')h.removeAttribute('data-cor');else h.setAttribute('data-cor',cor);
    // 12/11 (T151b): 'saga-cor-salva' é a cor que vale (as abas abertas com código antigo só mexem em 'saga-cor' e
    // não conhecem as cores novas: punham o Azul e derrubavam a cor recém-salva nas outras abas).
    // opcoes.deOutraAba = veio de outra aba: aplica sem regravar (evita o vai e vem entre abas)
    if(!(opcoes&&(opcoes.previa||opcoes.deOutraAba))){try{localStorage.setItem('saga-cor',cor);localStorage.setItem('saga-cor-salva',cor);}catch(e){}}
    var claro=(document.body&&document.body.getAttribute('data-theme'))==='light';
    h.style.background=global.sagaFundoCor(cor,claro);h.style.setProperty('--vd-fundo-html',h.style.background);
    if(cor.indexOf('vidro')===0&&global.sagaVidro)global.sagaVidro.aplicar();
    global.sagaTituloTema();
    return cor;
  };
  // 08/11: outra janela/aba do SAGA trocou a cor ou o claro/escuro → esta acompanha na hora (ex.: dois monitores)
  global.addEventListener('storage',function(e){
    try{
      if(e.key&&e.key.indexOf('saga-vidro-')===0&&global.sagaVidro)global.sagaVidro.aplicar();
      if(e.key==='saga-cor-salva'&&e.newValue&&e.newValue!==(document.documentElement.getAttribute('data-cor')||'azul')&&global.SAGA_CORES.some(function(c){return c.id===e.newValue;}))global.sagaAplicarCor(e.newValue,{deOutraAba:true});
      if(e.key==='saga-tema'&&e.newValue&&document.body&&document.body.getAttribute('data-theme')!==e.newValue){document.body.setAttribute('data-theme',e.newValue);if(global.sagaAplicarCor)global.sagaAplicarCor(document.documentElement.getAttribute('data-cor')||'azul',{deOutraAba:true});}
    }catch(x){}
  });
  // Efeitos de movimento: desligar = tudo troca na hora (vale na hora, sem recarregar). Usado no menu da foto e nas Configurações.
  global.sagaDefinirMovimento=function(reduzir){
    try{localStorage.setItem('saga-movimento',reduzir?'reduzido':'normal');}catch(e){}
    var h=document.documentElement,est=document.getElementById('sagaSemMovimento');
    h.classList.toggle('saga-sem-movimento',!!reduzir);
    if(reduzir&&!est){est=document.createElement('style');est.id='sagaSemMovimento';est.textContent='html.saga-sem-movimento *,html.saga-sem-movimento *::before,html.saga-sem-movimento *::after,html.saga-sem-movimento #topbarSaga *,html.saga-sem-movimento #sidebarSaga *,html.saga-sem-movimento #topbarSaga *::before,html.saga-sem-movimento #topbarSaga *::after,html.saga-sem-movimento #sidebarSaga *::before,html.saga-sem-movimento #sidebarSaga *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}';document.head.appendChild(est);}
    else if(!reduzir&&est)est.remove();
    try{document.dispatchEvent(new CustomEvent('saga-movimento-mudou'));}catch(e){}
  };
  var _temaSalvo=localStorage.getItem('saga-tema')||'dark';
  if(document.body)document.body.setAttribute('data-theme',_temaSalvo);
  else document.addEventListener('DOMContentLoaded',function(){document.body.setAttribute('data-theme',_temaSalvo);});

  // Estilo base injetado uma unica vez: torna a sidebar fixa (sticky) em todas
  // as telas e habilita o modo retratil (colapsado), sem precisar editar o
  // CSS de cada pagina individualmente.
  function _injetarEstiloBase(){
    if(document.getElementById('sagaUiEstiloBase'))return;
    var style=document.createElement('style');
    style.id='sagaUiEstiloBase';
    style.textContent=
      '#sidebarSaga a.nav-item,#sidebarSaga a.nav-item:hover,#sidebarSaga a.nav-item:visited{text-decoration:none !important;}'+
      /* ===== Troca de tema com a luz saindo do botao ===== */
      'html.saga-tema-trocando *:not(#themeToggle):not(#themeToggle *),html.saga-tema-trocando *::before,html.saga-tema-trocando *::after{transition:none !important;}'+
      'html.saga-tema-trocando::view-transition-old(root),html.saga-tema-trocando::view-transition-new(root){animation:none !important;mix-blend-mode:normal;}'+
      'html.saga-tema-trocando::view-transition-group(root){animation:none !important;}'+
      // Escurecendo: o escuro (por cima, como sempre) entra pelas bordas e fecha no botao = a luz se recolhe para o botao
      'html.saga-tema-escurecendo::view-transition-new(root){-webkit-mask-image:radial-gradient(circle at var(--saga-tema-x) var(--saga-tema-y),transparent var(--saga-tema-r),#000 calc(var(--saga-tema-r) + 1px));mask-image:radial-gradient(circle at var(--saga-tema-x) var(--saga-tema-y),transparent var(--saga-tema-r),#000 calc(var(--saga-tema-r) + 1px));}'+
      // Ja comeca no ponto certo (sem o instante de tela toda escura antes da onda)
      'html.saga-tema-clareando::view-transition-new(root){clip-path:circle(0px at var(--saga-tema-x) var(--saga-tema-y));}'+
      // Menus superior e lateral ficam parados: nao entram na onda de luz (tema Azul). No Grafite os menus mudam de cor
      // junto com a tela, entao entram na mesma onda de luz (pedido de 07/11)
      'html.saga-tema-trocando:not([data-cor="grafite"]) #topbarSaga{view-transition-name:saga-tema-topo;}'+
      'html.saga-tema-trocando:not([data-cor="grafite"]) #sidebarSaga{view-transition-name:saga-tema-lateral;}'+
      'html.saga-tema-trocando::view-transition-old(saga-tema-topo),html.saga-tema-trocando::view-transition-old(saga-tema-lateral){display:none;}'+
      'html.saga-tema-trocando::view-transition-group(saga-tema-topo),html.saga-tema-trocando::view-transition-group(saga-tema-lateral),html.saga-tema-trocando::view-transition-new(saga-tema-topo),html.saga-tema-trocando::view-transition-new(saga-tema-lateral){animation:none !important;}'+
      '#themeToggle{view-transition-name:saga-tema-botao;}'+
      'html.saga-tema-trocando::view-transition-old(saga-tema-botao){display:none;}'+
      'html.saga-tema-trocando::view-transition-new(saga-tema-botao),html.saga-tema-trocando::view-transition-group(saga-tema-botao){animation:none !important;}'+
      /* ===== TOPBAR: aparencia fixa, nao depende de variaveis de cada tela ===== */
      '#topbarSaga{height:64px !important;position:sticky !important;top:0 !important;z-index:200 !important;display:flex !important;align-items:center !important;padding:0 24px !important;border-bottom:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:linear-gradient(135deg,rgba(20,28,48,.94),rgba(10,14,26,.98)) !important;gap:16px !important;}'+
      '[data-theme="light"] #topbarSaga{background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(243,245,248,.985)) !important;border-bottom-color:rgba(19,38,66,.18) !important;}'+
      '#topbarSaga .top-left,#topbarSaga .top-right{display:flex !important;align-items:center !important;gap:14px !important;}'+
      '#topbarSaga .top-center{flex:1 !important;display:flex !important;justify-content:center !important;min-width:0 !important;}'+
      '#topbarSaga .brand{display:flex !important;align-items:center !important;gap:10px !important;}'+
      '#topbarSaga .brand-logo{height:36px !important;max-width:180px !important;width:auto !important;object-fit:contain !important;display:block !important;}'+
      '#topbarSaga .brand.com-logo .crest,#topbarSaga .brand.com-logo .brand-name{display:none !important;}'+
      '#topbarSaga .crest{width:32px !important;height:32px !important;flex:0 0 auto !important;}'+
      '#topbarSaga .brand-name{font-family:"Cormorant Garamond",serif !important;font-size:19px !important;font-weight:600 !important;color:#e8eaf0 !important;letter-spacing:.5px !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '#topbarSaga .brand-name b{color:var(--gold) !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name b{color:var(--gold) !important;}'+
      '#hamburger{display:flex !important;flex-direction:column !important;width:32px !important;height:32px !important;align-items:center !important;justify-content:center !important;gap:4px !important;padding:0 !important;margin-right:0 !important;border-radius:8px !important;background:none !important;border:none !important;}'+
      '#hamburger span{display:block !important;width:18px !important;height:2px !important;min-height:2px !important;flex-shrink:0 !important;background:var(--gold) !important;margin:0 !important;border-radius:2px !important;transition:transform .25s ease,opacity .2s ease !important;}'+
      '[data-theme="light"] #hamburger span{background:var(--gold) !important;}'+
      '#hamburger.ativo span:nth-child(1){transform:translateY(6px) rotate(45deg) !important;}'+
      '#hamburger.ativo span:nth-child(2){opacity:0 !important;}'+
      '#hamburger.ativo span:nth-child(3){transform:translateY(-6px) rotate(-45deg) !important;}'+
      '#topbarSaga .quick-search{width:min(520px,50vw) !important;height:36px !important;display:flex !important;align-items:center !important;gap:8px !important;padding:0 12px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;border-radius:10px !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .quick-search svg{color:#8b93a8 !important;flex:0 0 auto !important;}'+
      '#topbarSaga .quick-search input{border:0 !important;outline:0 !important;background:transparent !important;color:#e8eaf0 !important;font-size:11px !important;width:100% !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '#topbarSaga .presence-btn{border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;border-radius:18px !important;padding:7px 12px !important;display:flex !important;align-items:center !important;gap:7px !important;color:#8b93a8 !important;font-size:11px !important;white-space:nowrap !important;}'+
      '[data-theme="light"] #topbarSaga .presence-btn{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;color:#4a586e !important;}'+
      '#topbarSaga .dot{width:7px !important;height:7px !important;border-radius:50% !important;display:inline-block !important;}'+
      '#topbarSaga .dot.online{background:#5dd8a0 !important;box-shadow:0 0 7px #5dd8a0 !important;}'+
      '#topbarSaga .icon-btn{width:36px !important;height:36px !important;display:grid !important;place-items:center !important;border-radius:10px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;position:relative !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .notif-count{position:absolute !important;right:-3px !important;top:-3px !important;min-width:13px !important;height:13px !important;padding:0 3px !important;border-radius:7px !important;background:var(--aviso-forte,#c4585c) !important;color:#fff !important;font-size:8px !important;line-height:1 !important;letter-spacing:0 !important;display:grid !important;place-items:center !important;font-weight:600 !important;}'+
      '#topbarSaga .theme-toggle{width:70px !important;height:32px !important;padding:3px !important;border-radius:18px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;position:relative !important;display:flex !important;justify-content:space-between !important;align-items:center !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .theme-toggle svg{z-index:2 !important;width:15px !important;height:15px !important;}'+
      '#topbarSaga .theme-toggle .knob{position:absolute !important;top:3px !important;left:3px !important;width:24px !important;height:24px !important;border-radius:50% !important;background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;box-shadow:0 2px 7px rgba(0,0,0,.18) !important;transition:left .42s cubic-bezier(.34,1.45,.64,1) !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle .knob{left:41px !important;background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;}'+
      '#topbarSaga .avatar{width:34px !important;height:34px !important;border-radius:50% !important;display:grid !important;place-items:center !important;background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;color:#0a0e1a !important;font-family:"Cormorant Garamond",serif !important;font-weight:700 !important;font-size:13px !important;}'+
      '[data-theme="light"] #topbarSaga .avatar{background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;}'+
      '#topbarSaga .popover{display:none;position:absolute !important;right:0 !important;top:calc(100% + 8px) !important;width:300px !important;z-index:600 !important;padding:8px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;border-radius:14px !important;background:linear-gradient(145deg,color-mix(in srgb,var(--panel-solid,#1b2540) 92%,var(--text,#e7eaf0)),var(--panel-solid,#11182c)) !important;color:var(--text,#e7eaf0) !important;box-shadow:0 24px 50px rgba(0,0,0,.5) !important;}'+
      '#topbarSaga .popover.open{display:block;}'+
      '[data-theme="light"] #topbarSaga .popover{background:linear-gradient(145deg,#ffffff,#eef2f7) !important;border-color:rgba(19,38,66,.18) !important;}'+
      '#topbarSaga .pop-title{padding:7px 8px 5px !important;font-size:9px !important;text-transform:uppercase !important;letter-spacing:1px !important;color:#8b93a8 !important;}'+
      '#topbarSaga .pop-row{display:flex !important;align-items:center !important;gap:9px !important;padding:9px !important;border-radius:9px !important;}'+
      '#topbarSaga .pop-row:hover{background:color-mix(in srgb,var(--gold) 9%,transparent) !important;}'+
      '#topbarSaga .online-dot{width:7px !important;height:7px !important;border-radius:50% !important;background:#5dd8a0 !important;box-shadow:0 0 7px #5dd8a0 !important;flex:0 0 auto !important;}'+
      '#topbarSaga .notification-item .n-dot{width:7px !important;height:7px !important;border-radius:50% !important;background:var(--gold) !important;margin-top:5px !important;flex:0 0 auto !important;}'+
      '#topbarSaga .notification-item .n-dot.read{visibility:hidden !important;}'+
      '#topbarSaga .notif-grupo-qtd{min-width:22px !important;height:20px !important;padding:0 5px !important;border-radius:6px !important;color:var(--cor-grupo) !important;background:color-mix(in srgb,var(--cor-grupo) 14%,transparent) !important;font-size:10.5px !important;font-weight:600 !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;flex:0 0 auto !important;}'+
      /* Janelas do topo (busca, sino, online): letra fina e sem excesso */
      '#topbarSaga #notifPop,#topbarSaga #presencePop,#topbarSaga #globalSearchPop{padding:6px !important;border-radius:12px !important;box-shadow:0 14px 34px rgba(0,0,0,.28) !important;max-height:min(440px,70vh) !important;overflow-y:auto !important;font-family:Montserrat,Arial,sans-serif !important;}'+
      '#topbarSaga #notifPop .pop-title,#topbarSaga #presencePop .pop-title,#topbarSaga #globalSearchPop .pop-title{padding:8px 8px 4px !important;font-size:9px !important;font-weight:500 !important;letter-spacing:1.2px !important;}'+
      '#topbarSaga .notification-item{display:flex !important;align-items:center !important;gap:10px !important;padding:8px !important;border-radius:8px !important;}'+
      '#topbarSaga .notification-item+.notification-item{border-top:1px solid color-mix(in srgb,var(--text) 7%,transparent) !important;border-top-left-radius:0 !important;border-top-right-radius:0 !important;}'+
      'body:not([data-theme="light"]) #topbarSaga :is(#notifPop,#presencePop,#globalSearchPop,#avatarPop){border-color:color-mix(in srgb,var(--text) 18%,transparent) !important;box-shadow:0 18px 46px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.25) !important;background:linear-gradient(145deg,color-mix(in srgb,var(--panel-solid,#1b2540) 86%,var(--text,#e7eaf0)),color-mix(in srgb,var(--panel-solid,#11182c) 95%,var(--text,#e7eaf0))) !important;}'+
      '#topbarSaga .notification-text{font-size:11px !important;font-weight:400 !important;line-height:1.4 !important;}'+
      '#topbarSaga .notification-time{font-size:9px !important;margin-top:2px !important;opacity:.8;}'+
      '#topbarSaga .pop-row{padding:7px 8px !important;border-radius:8px !important;font-weight:400 !important;}'+
      '#topbarSaga .pop-avatar{position:relative;width:24px;height:24px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-size:8.5px;font-weight:600;color:var(--text);background:color-mix(in srgb,var(--text) 10%,transparent);}'+
      '#topbarSaga .pop-avatar-status{position:absolute;right:-1px;bottom:-1px;width:7px;height:7px;border-radius:50%;background:#8b93a8;box-shadow:0 0 0 2px var(--panel-solid,#1b2540);}'+
      '#topbarSaga .pop-avatar-status.on{background:#5dd8a0;}'+
      '#topbarSaga .notif-ok{flex:0 0 auto !important;border:0 !important;background:transparent !important;color:var(--muted,#8b93a8) !important;border-radius:6px !important;padding:4px 7px !important;font-size:10px !important;font-weight:500 !important;cursor:pointer !important;}'+
      '#topbarSaga .notif-ok:hover{background:var(--gold) !important;color:#fff !important;border-color:var(--gold) !important;}'+
      /* Janela da foto (08/11): mesmo padrão do sino e do online, letra fina, compacta */
      '#topbarSaga #avatarPop{width:248px !important;padding:6px !important;border-radius:12px !important;box-shadow:0 14px 34px rgba(0,0,0,.28) !important;top:calc(100% + 10px) !important;font-family:Montserrat,Arial,sans-serif !important;transform-origin:top right;}'+
      '#topbarSaga #avatarPop.open{animation:sagaPopEntra .22s cubic-bezier(.22,.78,.25,1);}'+
      '@keyframes sagaPopEntra{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}'+
      '#topbarSaga .avatar-pop-info{display:flex !important;align-items:center !important;gap:10px !important;padding:8px 8px 10px !important;margin:0 0 4px !important;border-bottom:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;}'+
      '#topbarSaga .avatar-pop-foto{position:relative;overflow:hidden;width:32px;height:32px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;background:linear-gradient(135deg,var(--gold-light),var(--gold));color:#fff;font-family:"Cormorant Garamond",serif;font-weight:700;font-size:12.5px;}'+
      'html[data-cor="grafite"] body[data-theme="dark"] #topbarSaga .avatar-pop-foto{color:#1A1A1A;}'+
      '#topbarSaga .avatar-pop-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}'+
      '#topbarSaga .avatar-pop-txt{display:flex;flex-direction:column;min-width:0;gap:2px;}'+
      '#topbarSaga .avatar-pop-nome{font-size:12px !important;font-weight:600 !important;line-height:1.25 !important;color:var(--text) !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
      '#topbarSaga .avatar-pop-email{font-size:10px !important;font-weight:400 !important;color:var(--muted) !important;margin:0 !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
      '#topbarSaga .avatar-pop-email:empty{display:none;}'+
      '#topbarSaga #avatarPop .pop-title{padding:6px 8px 3px !important;font-size:9px !important;font-weight:500 !important;letter-spacing:1.2px !important;}'+
      '#topbarSaga #avatarPop .pop-row{gap:9px !important;padding:7px 8px !important;border-radius:8px !important;font-size:11.5px !important;font-weight:400 !important;line-height:1.3 !important;color:var(--text) !important;cursor:pointer !important;transition:background .18s ease,color .18s ease;}'+
      '#topbarSaga #avatarPop .pop-row svg{flex:0 0 auto;color:var(--muted);transition:color .18s ease;}'+
      '#topbarSaga #avatarPop .pop-row:hover svg,#topbarSaga #avatarPop .pop-row:focus-visible svg{color:var(--gold);}'+
      '#topbarSaga #avatarPop .pop-row:focus-visible{outline:none;background:color-mix(in srgb,var(--gold) 9%,transparent) !important;}'+
      '#topbarSaga .pop-divisor{height:1px !important;margin:4px 6px !important;background:color-mix(in srgb,var(--gold) 12%,transparent) !important;}'+
      '#topbarSaga #avatarPop .pop-row-sair{color:var(--muted) !important;}'+
      '#topbarSaga #avatarPop .pop-row-sair:hover{color:var(--text) !important;}'+
      '#topbarSaga a.pop-row-link{display:flex !important;align-items:center !important;gap:9px !important;text-decoration:none !important;color:inherit !important;cursor:pointer !important;}'+
      '#topbarSaga .avatar{position:relative !important;overflow:hidden !important;cursor:pointer !important;}'+
      '#topbarSaga .avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;}'+
      '#topbarSaga .sg-chave{margin-left:auto;flex:0 0 auto;width:30px;height:17px;border-radius:999px;background:color-mix(in srgb,var(--muted) 45%,transparent);position:relative;transition:background .18s ease;}'+
      '#topbarSaga .sg-chave i{position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .18s ease;}'+
      '#topbarSaga .sg-ligada .sg-chave{background:var(--gold) !important;}#topbarSaga .sg-ligada .sg-chave i{transform:translateX(13px);}'+
      /* ===== SIDEBAR: aparencia fixa, retratil, sticky ===== */
      '#sidebarSaga{width:232px !important;background:var(--navy-2) !important;border-right:1px solid var(--border) !important;padding:22px 0 !important;position:sticky !important;top:64px !important;height:calc(100vh - 64px) !important;overflow-y:auto !important;overscroll-behavior-y:contain !important;flex-grow:0 !important;flex-shrink:0 !important;flex-basis:232px !important;transition:width .22s ease,min-width .22s ease,flex-basis .22s ease,padding .22s ease,opacity .18s ease !important;}'+
      '[data-theme="light"] #sidebarSaga{background:#ffffff !important;border-right-color:var(--border) !important;}'+
      // recolhido no computador = faixa de 64 px só com os ícones; passando o mouse abre por cima (sem empurrar a tela)
      '@media(min-width:761px){#sidebarSaga{transition:width .3s cubic-bezier(.22,.78,.25,1),min-width .3s cubic-bezier(.22,.78,.25,1),margin-right .3s cubic-bezier(.22,.78,.25,1),box-shadow .3s ease !important;}'+
        '#sidebarSaga.collapsed{width:64px !important;min-width:64px !important;flex-basis:64px !important;overflow-x:hidden !important;z-index:150 !important;}'+
        '#sidebarSaga.collapsed .nav-grupo{display:block !important;}'+
        '#sidebarSaga.collapsed:not(.sg-aberto) .nav-section{height:1px !important;padding:0 !important;margin:12px 16px !important;font-size:0 !important;overflow:hidden !important;background:var(--border-soft) !important;}'+
        '#sidebarSaga.collapsed:not(.sg-aberto) .nav-item .nav-badge-chat{opacity:0 !important;}'+
        '#sidebarSaga.collapsed:not(.sg-aberto) .nav-item{color:transparent !important;font-size:0 !important;}'+
        '#sidebarSaga.collapsed.sg-aberto{width:232px !important;min-width:232px !important;margin-right:-168px !important;box-shadow:14px 0 34px rgba(0,0,0,.28) !important;}}'+
      // celular (12/11, Dr. Victor): grupos abrem e fecham como no computador (toque no título); faixa de toque maior
      '@media(max-width:760px){#sidebarSaga .nav-section[data-grupo]{min-height:40px !important;-webkit-tap-highlight-color:transparent;}#sidebarSaga .nav-section[data-grupo]::after{margin-right:6px;width:7px;height:7px;}}'+
      // grupos: título clicável com setinha
      '#sidebarSaga .nav-section[data-grupo]{cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:space-between !important;user-select:none;}'+
      // 09/11: título de grupo sem nenhuma tela permitida some (o display:flex acima vencia o sem-permissao e "Gestão" aparecia vazio)
      '#sidebarSaga .nav-section[data-grupo].sem-permissao,#sidebarSaga .nav-section[data-grupo].perm-pendente{display:none !important;}'+
      '#sidebarSaga .nav-section[data-grupo]::after{content:"";width:6px;height:6px;margin-right:2px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);transition:transform .28s cubic-bezier(.22,.78,.25,1);opacity:.7}'+
      '#sidebarSaga .nav-section[data-grupo].fechado::after{transform:rotate(-45deg);}'+
      '#sidebarSaga .nav-section[data-grupo]:hover{opacity:1 !important;filter:brightness(1.25);}'+
      '#sidebarSaga .nav-section[data-grupo]:focus-visible{outline:2px solid var(--gold);outline-offset:-2px;}'+
      // menu recolhido no computador: grupos sempre abertos, sem setinha (no celular o recolhido do computador não vale)
      '@media(min-width:761px){#sidebarSaga.collapsed .nav-section[data-grupo]::after{display:none !important;}'+
      '#sidebarSaga.collapsed .nav-section[data-grupo]{cursor:default !important;pointer-events:none !important;}}'+
      '#sidebarSaga .nav-section,#sidebarSaga .nav-secao{font-size:10px !important;letter-spacing:1.6px !important;color:#9aa6b8 !important;text-transform:uppercase !important;font-weight:600 !important;padding:17px 22px 7px !important;opacity:1 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-section,[data-theme="light"] #sidebarSaga .nav-secao{color:#5b6880 !important;}'+
      '#sidebarSaga .nav-item{white-space:nowrap !important;}'+ // nome sempre numa linha só (12/11, Dr. Victor)
      '#sidebarSaga .nav-item{display:flex !important;align-items:center !important;gap:11px !important;padding:11px 16px 11px 22px !important;font-size:13px !important;color:#d5dbe4 !important;font-weight:500 !important;cursor:pointer !important;border-left:3px solid transparent !important;background:transparent !important;transition:all .2s !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item{color:#22324a !important;}'+
      '#sidebarSaga .nav-item:hover{color:#ffffff !important;background:rgba(255,255,255,.06) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item:hover{color:#13233a !important;background:rgba(19,38,66,.06) !important;}'+
      '#sidebarSaga .nav-item .nav-icon{width:16px !important;height:16px !important;flex:0 0 auto !important;color:#b3bdcc !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item .nav-icon{color:#3b4b64 !important;}'+
      '#sidebarSaga .nav-item.active,#sidebarSaga .nav-item.ativo{color:#ffffff !important;font-weight:600 !important;border-left:3px solid var(--gold) !important;background:color-mix(in srgb,var(--gold) 18%,transparent) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active,[data-theme="light"] #sidebarSaga .nav-item.ativo{color:var(--gold) !important;border-left-color:var(--gold) !important;background:color-mix(in srgb,var(--gold) 10%,transparent) !important;}'+
      '#sidebarSaga .nav-item.active .nav-icon,#sidebarSaga .nav-item.ativo .nav-icon{color:var(--gold-light) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="light"] #sidebarSaga .nav-item.ativo .nav-icon{color:var(--gold) !important;}'+
      /* ===== TOPBAR: controles bem visiveis (novo visual azul-marinho) ===== */
      '#topbarSaga{background:var(--navy-2) !important;border-bottom:1px solid var(--border) !important;}'+
      '[data-theme="light"] #topbarSaga{background:#ffffff !important;border-bottom-color:var(--border) !important;}'+
      '#topbarSaga .quick-search,#topbarSaga .presence-btn,#topbarSaga .icon-btn,#topbarSaga .theme-toggle{background:#1f2a3d !important;border:1px solid rgba(255,255,255,.16) !important;color:#dfe5ee !important;transition:background .15s,border-color .15s !important;}'+
      '#topbarSaga .icon-btn:hover,#topbarSaga .presence-btn:hover,#topbarSaga .theme-toggle:hover{background:#273550 !important;border-color:rgba(255,255,255,.26) !important;}'+
      '#topbarSaga .quick-search:focus-within{border-color:var(--gold) !important;background:#22304a !important;}'+
      '#topbarSaga .quick-search svg{color:#b8c2d1 !important;}'+
      '#topbarSaga .quick-search input{color:#f1f4f8 !important;font-size:12px !important;}'+
      '#topbarSaga .quick-search input::placeholder{color:#a3adbd !important;opacity:1 !important;}'+
      '#topbarSaga .icon-btn svg,#topbarSaga .theme-toggle svg{color:#e3e9f1 !important;}'+
      '#topbarSaga .icon-btn svg [stroke],#topbarSaga .theme-toggle svg [stroke]{stroke:currentColor !important;}'+
      '#topbarSaga .presence-btn{color:#dfe5ee !important;font-weight:500 !important;}'+
      '#topbarSaga .theme-toggle .knob,[data-theme="light"] #topbarSaga .theme-toggle .knob{background:var(--gold) !important;box-shadow:0 2px 8px rgba(0,0,0,.3) !important;}'+
      '#topbarSaga .avatar{background:var(--gold) !important;color:#ffffff !important;}'+
      '#hamburger span,[data-theme="light"] #hamburger span{background:currentColor !important;}#hamburger{color:#e3e9f1 !important;}'+
      '[data-theme="light"] #hamburger{color:var(--gold) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search,[data-theme="light"] #topbarSaga .presence-btn,[data-theme="light"] #topbarSaga .icon-btn,[data-theme="light"] #topbarSaga .theme-toggle{background:#eef1f5 !important;border-color:rgba(19,38,66,.22) !important;color:#22324a !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn:hover,[data-theme="light"] #topbarSaga .presence-btn:hover,[data-theme="light"] #topbarSaga .theme-toggle:hover{background:#f7f9fb !important;border-color:rgba(19,38,66,.32) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:var(--gold) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn svg,[data-theme="light"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      /* ===== BARRAS EM CONTRASTE: modo claro com barras azul-marinho, modo escuro com barras claras ===== */
      '[data-theme="light"] #topbarSaga,[data-theme="light"] #sidebarSaga{background:#15284a !important;border-color:rgba(255,255,255,.10) !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name b{color:#8fb6ff !important;}'+
      '[data-theme="light"] #hamburger{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search,[data-theme="light"] #topbarSaga .presence-btn,[data-theme="light"] #topbarSaga .icon-btn,[data-theme="light"] #topbarSaga .theme-toggle{background:rgba(255,255,255,.10) !important;border-color:rgba(255,255,255,.22) !important;color:#eef3fa !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn:hover,[data-theme="light"] #topbarSaga .presence-btn:hover,[data-theme="light"] #topbarSaga .theme-toggle:hover{background:rgba(255,255,255,.18) !important;border-color:rgba(255,255,255,.32) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search:focus-within{background:rgba(255,255,255,.16) !important;border-color:#8fb6ff !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search svg{color:#c4d0e2 !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input::placeholder{color:#b9c6d9 !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn svg,[data-theme="light"] #topbarSaga .theme-toggle svg{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle .knob,[data-theme="light"] #topbarSaga .avatar{background:#4b8af5 !important;color:#ffffff !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-section,[data-theme="light"] #sidebarSaga .nav-secao{color:#9fb2cc !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item{color:#e3eaf4 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item .nav-icon{color:#c1cde0 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item:hover{color:#ffffff !important;background:rgba(255,255,255,.08) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active,[data-theme="light"] #sidebarSaga .nav-item.ativo{color:#ffffff !important;border-left-color:#8fb6ff !important;background:rgba(255,255,255,.14) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="light"] #sidebarSaga .nav-item.ativo .nav-icon{color:#8fb6ff !important;}'+
      '[data-theme="dark"] #topbarSaga{background:#f4f6f9 !important;border-bottom-color:rgba(19,38,66,.14) !important;}'+
      '[data-theme="dark"] #sidebarSaga{background:#e9eef4 !important;border-right-color:rgba(19,38,66,.14) !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name b{color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #hamburger{color:#1f3e6d !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search,[data-theme="dark"] #topbarSaga .presence-btn,[data-theme="dark"] #topbarSaga .icon-btn,[data-theme="dark"] #topbarSaga .theme-toggle{background:#ffffff !important;border-color:rgba(19,38,66,.18) !important;color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn:hover,[data-theme="dark"] #topbarSaga .presence-btn:hover,[data-theme="dark"] #topbarSaga .theme-toggle:hover{background:#e6ebf2 !important;border-color:rgba(19,38,66,.30) !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn svg,[data-theme="dark"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob,[data-theme="dark"] #topbarSaga .avatar{background:#2f6cd6 !important;color:#ffffff !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-section,[data-theme="dark"] #sidebarSaga .nav-secao{color:#5b6880 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item{color:#1c2c44 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item .nav-icon{color:#3b4b64 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item:hover{color:#0d1b30 !important;background:rgba(19,38,66,.07) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active,[data-theme="dark"] #sidebarSaga .nav-item.ativo{color:#1f3e6d !important;border-left-color:#2f6cd6 !important;background:rgba(47,108,214,.12) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="dark"] #sidebarSaga .nav-item.ativo .nav-icon{color:#2f6cd6 !important;}'+
      /* Modo claro (ajuste final): barra superior branca, menu lateral azul em degrade */
      '[data-theme="light"] #topbarSaga{background:#dde3ea !important;border-bottom:1px solid rgba(19,38,66,.18) !important;box-shadow:0 1px 4px rgba(19,38,66,.10) !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name b{color:#2f6cd6 !important;}'+
      '[data-theme="light"] #hamburger{color:#1f3e6d !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search,[data-theme="light"] #topbarSaga .presence-btn,[data-theme="light"] #topbarSaga .icon-btn,[data-theme="light"] #topbarSaga .theme-toggle{background:#eef1f5 !important;border-color:rgba(19,38,66,.22) !important;color:#22324a !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn:hover,[data-theme="light"] #topbarSaga .presence-btn:hover,[data-theme="light"] #topbarSaga .theme-toggle:hover{background:#f7f9fb !important;border-color:rgba(19,38,66,.32) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:#2f6cd6 !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn svg,[data-theme="light"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle .knob,[data-theme="light"] #topbarSaga .avatar{background:#1f3e6d !important;color:#ffffff !important;}'+
      '[data-theme="light"] #sidebarSaga{background:linear-gradient(180deg,#1f3f70 0%,#16305a 45%,#0f2140 100%) !important;border-right:none !important;}'+
      /* Modo escuro (ajuste final): barra superior escura, menu lateral azul em degrade */
      '[data-theme="dark"] #topbarSaga{background:#111927 !important;border-bottom:1px solid rgba(255,255,255,.09) !important;box-shadow:0 1px 3px rgba(0,0,0,.25) !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name{color:#ffffff !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name b{color:#6fa2ff !important;}'+
      '[data-theme="dark"] #hamburger{color:#e3e9f1 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search,[data-theme="dark"] #topbarSaga .presence-btn,[data-theme="dark"] #topbarSaga .icon-btn,[data-theme="dark"] #topbarSaga .theme-toggle{background:#1f2a3d !important;border-color:rgba(255,255,255,.16) !important;color:#dfe5ee !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn:hover,[data-theme="dark"] #topbarSaga .presence-btn:hover,[data-theme="dark"] #topbarSaga .theme-toggle:hover{background:#273550 !important;border-color:rgba(255,255,255,.26) !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search:focus-within{background:#22304a !important;border-color:#4b8af5 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search svg{color:#b8c2d1 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input{color:#f1f4f8 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input::placeholder{color:#a3adbd !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn svg,[data-theme="dark"] #topbarSaga .theme-toggle svg{color:#e3e9f1 !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob,[data-theme="dark"] #topbarSaga .avatar{background:#4b8af5 !important;color:#ffffff !important;}'+
      '[data-theme="dark"] #sidebarSaga{background:linear-gradient(180deg,#24497f 0%,#1a3663 45%,#122749 100%) !important;border-right:none !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-section,[data-theme="dark"] #sidebarSaga .nav-secao{color:#a9bbd4 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item{color:#eaf0f8 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item .nav-icon{color:#c8d4e6 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item:hover{color:#ffffff !important;background:rgba(255,255,255,.08) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active,[data-theme="dark"] #sidebarSaga .nav-item.ativo{color:#ffffff !important;border-left-color:#9cc0ff !important;background:rgba(255,255,255,.15) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="dark"] #sidebarSaga .nav-item.ativo .nav-icon{color:#9cc0ff !important;}'+
      /* Modo escuro (versao final): barra superior branca como no claro; menu lateral azul em degrade */
      '[data-theme="dark"] #topbarSaga{background:#dde3ea !important;border-bottom:1px solid rgba(19,38,66,.18) !important;box-shadow:0 1px 4px rgba(0,0,0,.18) !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name b{color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #hamburger{color:#1f3e6d !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search,[data-theme="dark"] #topbarSaga .presence-btn,[data-theme="dark"] #topbarSaga .icon-btn,[data-theme="dark"] #topbarSaga .theme-toggle{background:#eef1f5 !important;border-color:rgba(19,38,66,.22) !important;color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn:hover,[data-theme="dark"] #topbarSaga .presence-btn:hover,[data-theme="dark"] #topbarSaga .theme-toggle:hover{background:#f7f9fb !important;border-color:rgba(19,38,66,.32) !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn svg,[data-theme="dark"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob,[data-theme="dark"] #topbarSaga .avatar{background:#2f6cd6 !important;color:#ffffff !important;}'+
      /* Botao claro/escuro: bolinha amarela (sol) no claro, azul-noite (lua) no escuro */
      '[data-theme="light"] #topbarSaga .theme-toggle .knob{left:3px !important;background:linear-gradient(135deg,#ffcf5c,#f5a623) !important;box-shadow:0 2px 8px rgba(245,166,35,.45) !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob{left:41px !important;background:linear-gradient(135deg,#3b5ba8,#1d3263) !important;box-shadow:0 2px 8px rgba(29,50,99,.5) !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle svg.sun{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle svg.moon{color:#7b8799 !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle svg.moon{color:#ffffff !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle svg.sun{color:#7b8799 !important;}'+
      '#topbarSaga .theme-toggle .knob{transition:left .42s cubic-bezier(.34,1.45,.64,1),background .25s ease !important;}'+
      '#sidebarSaga .sem-permissao,#sidebarSaga .perm-pendente{display:none !important;}'+
      '@media(max-width:760px){#sidebarSaga{position:fixed !important;}#topbarSaga .top-center{display:none !important;}}'+
      '#topbarSaga .top-right .busca-cel-btn,#topbarSaga .top-center .busca-cel-fechar{display:none !important;}'+
      '@media(max-width:760px){#topbarSaga .top-right .busca-cel-btn{display:inline-flex !important;flex:0 0 auto !important;align-items:center !important;justify-content:center !important;}'+
        /* com a lupa a barra fica apertada: botões e espaços um pouco menores para o nome VMMADV caber */
        '#topbarSaga div.top-right{gap:4px !important;}#topbarSaga .top-right .icon-btn{width:30px !important;height:30px !important;flex:0 0 auto !important;}#topbarSaga .top-right .theme-toggle{width:46px !important;flex:0 0 auto !important;}[data-theme="dark"] #topbarSaga .top-right .theme-toggle .knob{left:21px !important;}#topbarSaga .top-right .avatar{width:30px !important;height:30px !important;}#topbarSaga div.top-left{gap:6px !important;}#topbarSaga .brand .crest{width:22px !important;height:22px !important;}#topbarSaga .brand .brand-name{font-size:15px !important;}'+
        '#topbarSaga.busca-cel .top-left,#topbarSaga.busca-cel .top-right>*:not(.notification-wrap):not(.presence-wrap):not(.avatar-wrap){visibility:hidden !important;}#topbarSaga.busca-cel .top-right>:is(.notification-wrap,.presence-wrap,.avatar-wrap)>:not(.popover){visibility:hidden !important;}'+
        '#topbarSaga.busca-cel .top-center{display:flex !important;position:absolute !important;left:10px !important;right:10px !important;top:0 !important;bottom:0 !important;align-items:center !important;gap:8px !important;z-index:6 !important;}'+
        '#topbarSaga.busca-cel .quick-search{width:auto !important;flex:1 1 auto !important;height:38px !important;}#topbarSaga.busca-cel .quick-search input{font-size:16px !important;}'+
        '#topbarSaga.busca-cel .top-center .busca-cel-fechar{display:inline-flex !important;align-items:center !important;justify-content:center !important;flex:0 0 auto !important;width:38px !important;height:38px !important;border-radius:10px !important;cursor:pointer !important;}'+
      '}'+
      /* ===== CELULAR (ate 760px): menu lateral deslizante, barra compacta, sem rolagem lateral ===== */
      '@media(max-width:760px){'+
        'html,body{overflow-x:clip !important;max-width:100vw !important;}'+
        '#topbarSaga{padding:0 10px !important;gap:8px !important;width:100% !important;}'+
        '#topbarSaga .top-left{gap:8px !important;min-width:0 !important;}'+
        '#topbarSaga .top-right{gap:6px !important;margin-left:auto !important;}'+
        '#topbarSaga .crest{width:26px !important;height:26px !important;}'+
        '#topbarSaga .brand-name{font-size:16px !important;}'+
        '#topbarSaga .presence-btn{padding:0 !important;width:34px !important;height:34px !important;justify-content:center !important;}'+
        '#topbarSaga #onlineText{display:none !important;}'+
        '#topbarSaga .icon-btn{width:34px !important;height:34px !important;}'+
        '#topbarSaga .theme-toggle{width:56px !important;height:30px !important;}'+
        '#topbarSaga .theme-toggle svg{width:13px !important;height:13px !important;}'+
        '#topbarSaga .theme-toggle .knob{width:22px !important;height:22px !important;top:3px !important;}'+
        '[data-theme="light"] #topbarSaga .theme-toggle .knob{left:3px !important;}'+
        '[data-theme="dark"] #topbarSaga .theme-toggle .knob{left:29px !important;}'+
        '#topbarSaga .avatar{width:32px !important;height:32px !important;}'+
        '#sidebarSaga,#sidebarSaga.collapsed{position:fixed !important;top:64px !important;left:0 !important;bottom:0 !important;height:calc(100vh - 64px) !important;height:calc(100dvh - 64px) !important;max-height:none !important;min-height:0 !important;overscroll-behavior:contain !important;'+
          'width:min(290px,84vw) !important;min-width:0 !important;flex-basis:auto !important;padding:16px 0 24px !important;opacity:1 !important;overflow-y:auto !important;'+
          'border:none !important;z-index:1500 !important;transform:translateX(-105%) !important;transition:transform .25s ease !important;box-shadow:none !important;}'+
        '#sidebarSaga.open{transform:translateX(0) !important;box-shadow:8px 0 30px rgba(0,0,0,.35) !important;}'+
        '#sidebarSaga .nav-item{padding:14px 22px !important;font-size:15px !important;font-weight:500 !important;}'+
        '#sidebarSaga .nav-item .nav-icon{width:18px !important;height:18px !important;}'+
        '#sidebarSaga .nav-section{font-size:11px !important;padding:18px 22px 8px !important;}'+
        /* o fundo escuro cobre so a area a direita do menu: em telas onde o menu fica dentro de outra camada, ele nunca fica por cima dos itens */
        /* janelas da barra superior (notificacoes, online, busca, perfil): largura da tela, logo abaixo da barra */
        /* janela da foto (perfil) no celular: abaixo da barra, alinhada à direita e sempre dentro da tela (antes abria para fora, em pé) */
        '#topbarSaga #avatarPop{position:fixed !important;top:68px !important;right:8px !important;left:auto !important;width:min(260px,calc(100vw - 16px)) !important;max-height:calc(100dvh - 84px) !important;overflow-y:auto !important;transform:none !important;}'+
        '#topbarSaga .popover{position:fixed !important;top:68px !important;left:8px !important;right:8px !important;width:auto !important;max-width:none !important;max-height:calc(100dvh - 84px) !important;overflow-y:auto !important;overscroll-behavior:contain !important;}'+
        'html.saga-menu-aberto,html.saga-menu-aberto body{overflow:hidden !important;overscroll-behavior:none !important;}'+
        /* menu aberto com a pagina rolada: a barra de cima fica presa no topo (antes subia junto e sobrava uma faixa em branco) */
        'html.saga-menu-aberto #topbarSaga{position:fixed !important;top:0 !important;left:0 !important;right:0 !important;width:100% !important;}'+
        'html.saga-menu-aberto body{padding-top:64px !important;}'+
        '#overlay{touch-action:none !important;}#overlay:not(.aberto){display:none !important;}#overlay.aberto{display:block !important;}'+
        '#overlay{position:fixed !important;top:64px !important;bottom:0 !important;right:0 !important;left:min(290px,84vw) !important;width:auto !important;height:auto !important;z-index:1400 !important;background:rgba(8,14,28,.55) !important;-webkit-backdrop-filter:blur(7px) saturate(.7) !important;backdrop-filter:blur(7px) saturate(.7) !important;}'+
        '[data-theme="light"] #overlay{background:rgba(22,34,58,.38) !important;}'+
      '}';
    (document.head||document.documentElement).appendChild(style);
  }
  if(document.head)_injetarEstiloBase();
  else document.addEventListener('DOMContentLoaded',_injetarEstiloBase);
  // Visual dos numeros do menu lateral: entra junto com a pagina (antes vinha depois e o numero nascia colado no nome e pulava)
  function _estiloNumerosMenu(){
    if(!document.getElementById('sagaChatEstilo')){
      var st=document.createElement('style');st.id='sagaChatEstilo';
      st.textContent='#sidebarSaga .nav-badge-chat{margin-left:auto !important;min-width:16px;height:16px;padding:0 4px;border-radius:5px;background:rgba(229,72,77,.2) !important;color:#ff9b9e !important;font-size:9.5px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;line-height:1;}'
        +'#sidebarSaga .nav-badge-dia{background:rgba(96,150,240,.2) !important;color:#a9c8ff !important}#sidebarSaga .nav-badge-dia.atrasada{background:rgba(229,72,77,.2) !important;color:#ff9b9e !important}'
        // menu claro (Grafite claro): cores fortes para aparecer sobre o fundo claro
        +'html[data-cor="grafite"] body[data-theme="light"] #sidebarSaga .nav-badge-chat,html[data-cor="grafite"] body[data-theme="light"] #sidebarSaga .nav-badge-dia.atrasada{background:#9C7A43 !important;color:#fff !important;font-weight:700}'
        +'html[data-cor="grafite"] body[data-theme="light"] #sidebarSaga .nav-badge-dia{background:#1A1A1A !important;color:#fff !important;font-weight:700}'
        +'';
      document.head.appendChild(st);
    }
  }
  if(document.head)_estiloNumerosMenu();else document.addEventListener('DOMContentLoaded',_estiloNumerosMenu);
  // Janelas da busca, das notificacoes e de quem esta online: no computador abrem logo abaixo do campo de busca (antes iam para o canto direito)
  var _POPS_TOPO=['globalSearchPop','notifPop','presencePop'];
  function _posicionarPopsTopo(){
    var computador=window.innerWidth>760;
    _POPS_TOPO.forEach(function(id){
      var p=document.getElementById(id);if(!p)return;
      var props=['position','top','left','right','width','transform'];
      var ancora=document.querySelector(id==='globalSearchPop'?'#topbarSaga .quick-search':id==='notifPop'?'#notifBtn':'#presenceBtn');
      var r=ancora?ancora.getBoundingClientRect():null;
      if(!computador||!r||!r.width){props.forEach(function(k){p.style.removeProperty(k);});return;}
      // Fechando: mantém a posição em que abriu, para o efeito de fechar acontecer no mesmo lugar (antes ela pulava para o canto e "piscava")
      if(!p.classList.contains('open'))return;
      // Busca: abaixo do campo, na mesma largura. Sino e Online: abaixo do proprio botao, alinhados pela direita.
      var w=id==='globalSearchPop'?r.width:id==='notifPop'?360:280;
      var left=id==='globalSearchPop'?r.left:r.right-w;
      left=Math.max(8,Math.min(left,window.innerWidth-w-8));
      p.style.setProperty('position','fixed','important');
      p.style.setProperty('top',(r.bottom+6)+'px','important');
      p.style.setProperty('left',left+'px','important');
      p.style.setProperty('right','auto','important');
      p.style.setProperty('width',w+'px','important');
      p.style.setProperty('transform','none','important');
    });
  }
  if(window.MutationObserver){
    new MutationObserver(function(lista){
      for(var i=0;i<lista.length;i++){if(_POPS_TOPO.indexOf(lista[i].target.id)>=0){_posicionarPopsTopo();return;}}
    }).observe(document.documentElement,{attributes:true,attributeFilter:['class'],subtree:true});
  }
  window.addEventListener('resize',_posicionarPopsTopo);

  var _sidebarColapsada=localStorage.getItem('saga-sidebar-colapsada')==='true';

  // Celular: o menu lateral e o fundo escuro ficam direto no <body>. Dentro do layout da tela
  // eles herdavam a altura de outra camada e sobrava um espaco branco embaixo.
  var _lugarOriginalMenu=null,_rolagemTravada=0;
  function ajustarMenuParaCelular(){
    var sb=document.getElementById('sidebarSaga'),ov=document.getElementById('overlay');
    if(!sb)return;
    if(window.innerWidth<=760){
      if(sb.parentElement!==document.body){
        _lugarOriginalMenu={pai:sb.parentElement,prox:sb.nextSibling,ovPai:ov&&ov.parentElement,ovProx:ov&&ov.nextSibling};
        document.body.appendChild(sb);
        if(ov)document.body.appendChild(ov);
      }
    }else{
      if(sb.classList.contains('open'))fecharMenuCelular();
      if(_lugarOriginalMenu&&sb.parentElement===document.body){
        _lugarOriginalMenu.pai.insertBefore(sb,_lugarOriginalMenu.prox);
        if(ov&&_lugarOriginalMenu.ovPai)_lugarOriginalMenu.ovPai.insertBefore(ov,_lugarOriginalMenu.ovProx);
        _lugarOriginalMenu=null;
      }
    }
  }
  // Com o menu aberto no celular, a pagina de tras nao rola nem recebe toques
  function travarPagina(travar){
    var html=document.documentElement,b=document.body;
    if(travar){
      if(html.classList.contains('saga-menu-aberto'))return;
      _rolagemTravada=window.scrollY||0;
      html.classList.add('saga-menu-aberto');
      b.style.position='fixed';b.style.top=(-_rolagemTravada)+'px';b.style.left='0';b.style.right='0';b.style.width='100%';
    }else{
      if(!html.classList.contains('saga-menu-aberto'))return;
      html.classList.remove('saga-menu-aberto');
      b.style.position='';b.style.top='';b.style.left='';b.style.right='';b.style.width='';
      // volta direto ao ponto onde estava (telas com rolagem suave subiam e desciam de novo)
      var antes=html.style.scrollBehavior;html.style.scrollBehavior='auto';
      try{window.scrollTo({top:_rolagemTravada,left:0,behavior:'instant'});}catch(e){window.scrollTo(0,_rolagemTravada);}
      html.style.scrollBehavior=antes;
    }
  }
  function fecharMenuCelular(){
    var sb=document.getElementById('sidebarSaga'),ov=document.getElementById('overlay'),ham=document.getElementById('hamburger');
    if(sb)sb.classList.remove('open');
    if(ov)ov.classList.remove('aberto');
    if(ham)ham.classList.remove('ativo');
    travarPagina(false);
  }
  function _aplicarColapsoSalvo(){
    var sb=document.getElementById('sidebarSaga');
    if(sb&&_sidebarColapsada)sb.classList.add('collapsed');
    // trocou de tela com o mouse em cima do menu aberto: já nasce aberto, desde o primeiro quadro
    try{if(sb&&_sidebarColapsada&&window.innerWidth>760&&sessionStorage.getItem('saga-menu-hover')==='1'){sb.style.transition='none';sb.classList.add('sg-aberto');}}catch(e){}
  }
  if(document.getElementById('sidebarSaga'))_aplicarColapsoSalvo();
  else document.addEventListener('DOMContentLoaded',_aplicarColapsoSalvo);

  var _perfilAtual=null;

  // ===== Menu lateral: grupos Operação / Comunicação / Gestão que abrem e fecham (lembrado neste navegador) =====
  function gruposFechados(){try{return JSON.parse(localStorage.getItem('saga-menu-grupos')||'{}')||{};}catch(e){return {};}}
  function ligarGruposMenu(sb){
    var fech=gruposFechados();
    sb.querySelectorAll('.nav-section[data-grupo]').forEach(function(sec){
      var id=sec.getAttribute('data-grupo'),g=sb.querySelector('.nav-grupo[data-grupo="'+id+'"]');if(!g)return;
      var marcar=function(fechado){sec.classList.toggle('fechado',fechado);sec.setAttribute('aria-expanded',fechado?'false':'true');};
      if(fech[id]){g.hidden=true;marcar(true);}
      if(sec.dataset.ligado)return;sec.dataset.ligado='1';
      var alternar=function(){
        if(sb.classList.contains('collapsed')&&window.innerWidth>760)return; // menu recolhido no computador: grupos sempre abertos
        var fechar=!g.hidden;marcar(fechar);
        if(global.sagaRecolher)global.sagaRecolher(g,fechar);else g.hidden=fechar;
        var f=gruposFechados();if(fechar)f[id]=true;else delete f[id];try{localStorage.setItem('saga-menu-grupos',JSON.stringify(f));}catch(e){}
      };
      sec.addEventListener('click',alternar);
      sec.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();alternar();}});
    });
  }
  // ===== Computador, menu recolhido: faixa só com os ícones; passando o mouse ela abre por cima da tela e fecha ao sair =====
  function ligarFaixaRecolhida(sb){
    if(sb.dataset.faixa)return;sb.dataset.faixa='1';
    var tAbrir=null,tFechar=null;
    // trocou de tela clicando no menu aberto pelo mouse: a tela nova já nasce com ele aberto (sem encolher e abrir de novo)
    var vinhaAberto=false;try{vinhaAberto=sessionStorage.getItem('saga-menu-hover')==='1';sessionStorage.removeItem('saga-menu-hover');}catch(e){}
    // o mouse está mesmo sobre o menu? (pela posição; na passagem animada entre telas o navegador
    // diz que o mouse "saiu" do menu sem ter saído, e o menu fechava sozinho: pedido do Dr. Victor, 08/11)
    var dentro=function(e){var r=sb.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom;};
    var vigiando=false;
    var vigiar=function(){
      if(vigiando)return;vigiando=true;
      var ver=function(e){if(dentro(e))return;document.removeEventListener('mousemove',ver,true);vigiando=false;try{sessionStorage.removeItem('saga-menu-hover');}catch(x){}clearTimeout(tAbrir);tFechar=setTimeout(function(){sb.classList.remove('sg-aberto');},160);};
      document.addEventListener('mousemove',ver,true);
    };
    if(vinhaAberto&&window.innerWidth>760&&sb.classList.contains('collapsed')){
      // a tela nova nasce com o menu aberto, sem animar a largura; só recolhe quando o mouse sair dele
      sb.style.transition='none';sb.classList.add('sg-aberto');void sb.offsetWidth;
      requestAnimationFrame(function(){requestAnimationFrame(function(){sb.style.transition='';});});
      vigiar();
    }
    sb.addEventListener('click',function(e){
      if(sb.classList.contains('sg-aberto')&&e.target.closest('.nav-item')){try{sessionStorage.setItem('saga-menu-hover','1');}catch(x){}}
    },true);
    sb.addEventListener('mouseenter',function(){
      if(window.innerWidth<=760||!sb.classList.contains('collapsed'))return;
      clearTimeout(tFechar);tAbrir=setTimeout(function(){sb.classList.add('sg-aberto');},90);
    });
    sb.addEventListener('mouseleave',function(e){
      // "saída" falsa (o mouse continua em cima do menu): espera ele sair de verdade
      if(sb.classList.contains('sg-aberto')&&dentro(e)){vigiar();return;}
      // saiu de verdade (mesmo logo depois de clicar numa opção): a tela nova nasce com o menu recolhido,
      // sem abrir e fechar de novo (pedido do Dr. Victor, 08/11)
      try{sessionStorage.removeItem('saga-menu-hover');}catch(x){}
      clearTimeout(tAbrir);tFechar=setTimeout(function(){sb.classList.remove('sg-aberto');},160);
    });
  }

  var SIDEBAR_HTML=''
    +'<div class="nav-section" data-grupo="processos" role="button" tabindex="0" aria-expanded="true">Processos</div><div class="nav-grupo" data-grupo="processos">'
    +'<div class="nav-item" data-tela="processos_juridico" onclick="sagaIrPara(\'lista_processos_padrao_metalico.html?fase=juridico\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0zM8 21h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Jurídico</div>'
    +'<div class="nav-item" data-tela="processos_captacao" onclick="sagaIrPara(\'lista_processos_padrao_metalico.html?fase=captacao\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 8v6M14 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Captação</div>'
    +'<div class="nav-item" data-tela="cartas" onclick="sagaIrPara(\'cartas.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 6.5l8.5 6 8.5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Cartas</div>'
    +'<div class="nav-item" data-tela="buscas" onclick="sagaIrPara(\'pedidos_busca.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M15.4 15.4L21 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10.5" cy="9" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M7.2 14a3.6 3.6 0 0 1 6.6 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
    +'Pedidos de busca<span class="nav-badge-chat nav-badge-dia" id="navBadgeBuscas" style="display:none" title="Pedidos de busca a fazer"></span></div>'
    +'<div class="nav-item" data-tela="clientes_perfil" onclick="sagaIrPara(\'clientes_perfil.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 20a6.5 6.5 0 0 1 10.5-5.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="17.5" cy="16.5" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M19.7 18.7L22 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Clientes por perfil</div>'
    +'<div class="nav-item" data-tela="teses" onclick="sagaIrPara(\'teses.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 012-2h11v16H6a2 2 0 00-2 2V5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 19a2 2 0 012-2h11M8 7h6M8 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Teses e oportunidades</div>'
    +'</div><div class="nav-section" data-grupo="meudia" role="button" tabindex="0" aria-expanded="true">Meu dia</div><div class="nav-grupo" data-grupo="meudia">'
    +'<div class="nav-item" data-tela="ponto" onclick="sagaIrPara(\'ponto_eletronico_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Ponto Eletrônico</div>'
    +'<div class="nav-item" data-tela="tarefas" onclick="sagaIrPara(\'minhas_tarefas.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Minhas Tarefas<span class="nav-badge-chat nav-badge-dia" id="navBadgeTarefas" style="display:none"></span></div>'
    // T166 (12/11, Dr. Victor): o que o Claude (SAGA no Claude) pediu para a pessoa trazer; só quem usa o conector
    +'<div class="nav-item" data-tela="pedidos_claude" onclick="sagaIrPara(\'pedidos_claude.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2h-6l-4 4v-4H6a2 2 0 01-2-2V5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 6.5l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'
    +'Pedidos do Claude<span class="nav-badge-chat nav-badge-dia" id="navBadgePedidosClaude" style="display:none" title="Pedidos do Claude em aberto"></span></div>'
    +'<div class="nav-item" data-tela="agenda" onclick="sagaIrPara(\'calendario_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Agenda<span class="nav-badge-chat nav-badge-dia" id="navBadgeAgenda" style="display:none" title="Compromissos de hoje"></span></div>'
    +'<div class="nav-item" data-tela="monitoramento" onclick="sagaIrPara(\'monitoramento_multi_oab.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M12 3a6 6 0 016 6c0 4.5 2 6 2 6H4s2-1.5 2-6a6 6 0 016-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 19a2 2 0 004 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Intimações</div>'
    +'<div class="nav-item" data-tela="notas" onclick="sagaIrPara(\'notas.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a1 1 0 011 1v9l-6 6H5a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 20v-5a1 1 0 011-1h5M8 9h8M8 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Notas</div>'
    +'</div><div class="nav-section" data-grupo="comunicacao" role="button" tabindex="0" aria-expanded="true">Comunicação</div><div class="nav-grupo" data-grupo="comunicacao">'
    +'<div class="nav-item" data-tela="chat" onclick="sagaIrPara(\'chat_interno_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Chat Interno<span class="nav-badge-chat" id="navBadgeChat" style="display:none"></span></div>'
    +'<div class="nav-item" data-tela="sugestoes" onclick="sagaIrPara(\'sugestoes.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Sugestões de melhoria</div>'
    +'<div class="nav-item" data-tela="manual" onclick="sagaIrPara(\'manual.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5v-15z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5A2.5 2.5 0 014 20.5zM9 7.5h7M9 11h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Manual do SAGA</div>'
    +'<div class="nav-item" data-tela="treinamentos" onclick="sagaIrPara(\'treinamentos.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M2 8l10-5 10 5-10 5-10-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Treinamentos</div>'
    +'</div><div class="nav-section" data-grupo="gestao" role="button" tabindex="0" aria-expanded="true">Gestão</div><div class="nav-grupo" data-grupo="gestao">'
    +'<div class="nav-item" data-tela="dashboard" onclick="sagaIrPara(\'dashboard_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Dashboard</div>'
    +'<div class="nav-item" data-tela="financeiro" onclick="sagaIrPara(\'financeiro.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Financeiro</div>'
    +'<div class="nav-item" data-tela="precatorios" onclick="sagaIrPara(\'precatorios.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h18M7 15h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Precatórios e RPV</div>'
    +'<div class="nav-item" data-tela="marketing" onclick="sagaIrPara(\'marketing_campanhas_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8v18l-18-8v-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 15v4a2 2 0 002 2h2" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Marketing</div>'
    +'<div class="nav-item" data-tela="colaboradores" onclick="sagaIrPara(\'gestao_colaboradores_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Colaboradores</div>'
    +'<div class="nav-item" data-tela="biblioteca" onclick="sagaIrPara(\'biblioteca_padrao_metalico_FINAL.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M4 4v16a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1h-4a2 2 0 00-2 2v16" stroke="currentColor" stroke-width="1.5"/><path d="M8 3v16" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Biblioteca de Modelos</div>'
    +'</div><div class="nav-section" data-grupo="admin" role="button" tabindex="0" aria-expanded="true">Administração</div><div class="nav-grupo" data-grupo="admin">'
    +'<div class="nav-item sem-permissao" data-tela="atividades" onclick="sagaIrPara(\'registro_atividades.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>'
    +'Registro de atividades</div>'
    +'<div class="nav-item sem-permissao" data-tela="obsidian" onclick="sagaIrPara(\'ponte_obsidian.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M5 4h10l4 4v12H5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 11h8M8 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Fichas do agente</div>'
    +'<div class="nav-item sem-permissao" data-tela="permissoes" onclick="sagaIrPara(\'painel_admin_permissoes.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z" stroke="currentColor" stroke-width="1.5"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Permissões</div>'
    +'</div>';

  var TOPBAR_HTML=''
    +'<div class="top-left">'
    +'<button class="hamburger" id="hamburger" aria-label="Abrir navegacao" type="button"><span></span><span></span><span></span></button>'
    +'<div class="brand">'
    +'<svg class="crest" viewBox="0 0 220 220" aria-hidden="true"><defs><linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6fa2ff"/><stop offset="38%" stop-color="#4b8af5"/><stop offset="60%" stop-color="#2f6cd6"/><stop offset="100%" stop-color="#cfe0ff"/></linearGradient></defs><g transform="translate(110,110)"><path d="M0 -55l44 22v33c0 27-19 44-44 55-25-11-44-28-44-55v-33l44-22z" fill="none" stroke="url(#crestGold)" stroke-width="6"/><text x="0" y="10" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="38" font-weight="700" fill="url(#crestGold)">VM</text></g></svg>'
    +'<div class="brand-name">VMM<b>ADV</b></div>'
    +'</div>'
    +'</div>'
    +'<div class="top-center">'
    +'<label class="quick-search" aria-label="Busca global">'
    +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 16.5L20 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
    +'<input id="globalSearch" placeholder="Buscar cliente, CPF, processo, telefone, e-mail..." autocomplete="off">'
    +'<div class="popover global-search-pop" id="globalSearchPop"></div>'
    +'</label>'
    +'<button class="icon-btn busca-cel-fechar" id="buscaCelFechar" type="button" aria-label="Fechar a busca"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>'
    +'</div>'
    +'<div class="top-right">'
    // lupa do celular: abre a busca por cima da barra (a barra de busca fica escondida no celular)
    +'<button class="icon-btn busca-cel-btn" id="buscaCelBtn" type="button" aria-label="Buscar cliente, processo, telefone ou e-mail" title="Buscar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 16.5L20 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>'
    +'<div class="presence-wrap">'
    +'<button class="presence-btn" id="presenceBtn" type="button"><span class="dot online"></span><span id="onlineText">Carregando...</span></button>'
    +'<div class="popover" id="presencePop"></div>'
    +'</div>'
    +'<div class="notification-wrap">'
    +'<button class="icon-btn" id="notifBtn" type="button" aria-label="Notificacoes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 16v-5a6 6 0 10-12 0v5l-2 3h16l-2-3z" stroke="var(--gold)" stroke-width="1.6"/><path d="M9 21a3 3 0 006 0" stroke="var(--gold)" stroke-width="1.6"/></svg><span class="notif-count" id="notifCount" style="display:none">0</span></button>'
    +'<div class="popover notification-pop" id="notifPop"></div>'
    +'</div>'
    +'<button class="icon-btn" id="privBtn" type="button" aria-label="Modo privacidade" title="Ocultar dados dos clientes (para gravar tela)"><svg class="olho-aberto" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="var(--gold)" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="var(--gold)" stroke-width="1.6"/></svg><svg class="olho-fechado" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.9 17.9A10.4 10.4 0 0112 20c-7 0-11-8-11-8a19 19 0 015.1-5.9M9.9 4.2A9.7 9.7 0 0112 4c7 0 11 8 11 8a19 19 0 01-2.2 3.2M14.1 14.1a3 3 0 11-4.2-4.2" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round"/><path d="M1 1l22 22" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round"/></svg></button>'
    +'<button class="icon-btn" id="refreshBtn" type="button" aria-label="Atualizar informacoes"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 11-3-6.7L21 8" stroke="var(--gold)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="var(--gold)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    +'<button class="theme-toggle" id="themeToggle" type="button" aria-label="Alternar tema"><svg class="sun" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span class="knob"></span><svg class="moon" viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></button>'
    +'<div class="avatar-wrap" id="avatarWrap">'
    +'<div class="avatar" id="avatarTop" title="Menu do usuario">--</div>'
    +'<div class="popover avatar-pop" id="avatarPop" role="menu">'
    +'<div class="avatar-pop-info"><span class="avatar-pop-foto" id="avatarPopFoto" aria-hidden="true"></span>'
    +'<span class="avatar-pop-txt"><span class="avatar-pop-nome" id="avatarPopNome">--</span><span class="avatar-pop-email" id="avatarPopEmail"></span></span></div>'
    +'<div class="pop-title">Minha conta</div>'
    +'<a class="pop-row pop-row-link" href="configuracoes_padrao_metalico.html?aba=perfil" data-ir="configuracoes_padrao_metalico.html?aba=perfil"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M4 21a8 8 0 0116 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>Meu perfil</span></a>'
    +'<a class="pop-row pop-row-link" href="configuracoes_padrao_metalico.html?aba=preferencias" data-ir="configuracoes_padrao_metalico.html?aba=preferencias"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="6" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="12" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="18" r="2" stroke="currentColor" stroke-width="1.6"/></svg><span>Preferências</span></a>'
    +'<a class="pop-row pop-row-link" href="configuracoes_padrao_metalico.html?aba=seguranca" data-ir="configuracoes_padrao_metalico.html?aba=seguranca"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Segurança e aparelhos</span></a>'
    // "Efeitos de movimento" fica só em Configurações > Preferências (pedido do Dr. Victor, 08/11)
    // "Manual do SAGA" e "Sugerir uma melhoria" saíram daqui: já estão no menu lateral (pedido do Dr. Victor, 12/11)
    +'<div class="pop-divisor"></div>'
    +'<div class="pop-row pop-row-sair" data-acao="sair" role="menuitem" tabindex="0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Sair do sistema</span></div>'
    +'</div>'
    +'</div>'
    +'</div>';

  function esc(v){var d=document.createElement('div');d.textContent=v||'';return d.innerHTML;}
  function iniciais(nome){return String(nome||'').trim().split(/\s+/).slice(0,2).map(function(p){return p[0]||'';}).join('').toUpperCase()||'--';}
  function formatarDataRel(iso){
    if(!iso)return '';
    var d=new Date(iso);
    var diff=(Date.now()-d.getTime())/1000;
    if(diff<60)return 'Agora';
    if(diff<3600)return Math.floor(diff/60)+' min';
    if(diff<86400)return Math.floor(diff/3600)+' h';
    return d.toLocaleDateString('pt-BR');
  }

  function fecharTodosPopovers(){
    document.querySelectorAll('.popover').forEach(function(p){p.classList.remove('open');});
  }

  // Janelas (modais): clicar no fundo escuro ou apertar Esc fecha a janela,
  // como o X. Usa o proprio botao de fechar da janela, para manter a limpeza
  // que cada tela faz ao fechar. Ligado ao carregar o arquivo, em todas as telas.
  var SELETOR_JANELAS='[class*="modal"][class*="overlay"],.visualizador-overlay,.painel-dia-overlay,.seletor-rapido-overlay';
  var SELETOR_BOTAO_FECHAR='.modal-close,[data-close-modal],[data-close],[aria-label^="Fechar"],[title^="Fechar"]';
  function janelaVisivel(el){
    if(!el.getClientRects().length)return false;
    var cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity||'1')>0.05;
  }
  function janelaDoTopo(){
    var abertas=Array.prototype.filter.call(document.querySelectorAll(SELETOR_JANELAS),janelaVisivel);
    if(!abertas.length)return null;
    abertas.sort(function(a,b){return (parseInt(getComputedStyle(a).zIndex,10)||0)-(parseInt(getComputedStyle(b).zIndex,10)||0);});
    return abertas[abertas.length-1];
  }
  function fecharJanela(ov){
    var btn=ov.querySelector(SELETOR_BOTAO_FECHAR);
    if(!btn){
      btn=Array.prototype.find.call(ov.querySelectorAll('button'),function(b){
        var t=(b.textContent||'').trim();
        return t==='✕'||t==='×'||t==='Cancelar'||t==='Fechar';
      });
    }
    if(btn){btn.click();return;}
    ov.classList.remove('open','aberto','show','ativo');
    if(ov.style.display&&ov.style.display!=='none')ov.style.display='none';
  }
  function ligarFechamentoJanelas(){
    var inicioNoFundo=null;
    // So fecha quando o clique comeca e termina no fundo: arrastar para
    // selecionar um texto e soltar fora da janela nao fecha nada.
    document.addEventListener('mousedown',function(e){
      inicioNoFundo=(e.target.matches&&e.target.matches(SELETOR_JANELAS))?e.target:null;
    },true);
    document.addEventListener('click',function(e){
      var ov=e.target;
      if(!ov.matches||!ov.matches(SELETOR_JANELAS)||ov!==inicioNoFundo)return;
      inicioNoFundo=null;
      fecharJanela(ov);
    });
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||e.defaultPrevented)return;
      var ov=janelaDoTopo();
      if(ov){e.preventDefault();fecharJanela(ov);}
    });
  }
  ligarFechamentoJanelas();

  function ligarTema(){
    var btn=document.getElementById('themeToggle');
    if(!btn||btn.dataset.ligado)return;
    btn.dataset.ligado='true';
    btn.addEventListener('click',function(){
      var atual=document.body.getAttribute('data-theme');
      var novo=atual==='dark'?'light':'dark';
      function aplicar(){
        document.body.setAttribute('data-theme',novo);
        try{localStorage.setItem('saga-tema',novo);}catch(e){}
        // 09/11: o fundo da página (atrás de tudo) acompanha o claro/escuro na hora
        try{var corA=document.documentElement.getAttribute('data-cor')||'azul';document.documentElement.style.background=global.sagaFundoCor(corA,novo==='light');document.documentElement.style.setProperty('--vd-fundo-html',document.documentElement.style.background);document.documentElement.style.colorScheme=novo==='light'?'light':'dark';}catch(e){}
      }
      trocarTemaComLuz(btn,novo,aplicar);
      setTimeout(function(){global.sagaTituloTema&&global.sagaTituloTema();},700);
    });
  }

  // Modo claro: a luz sai do botao do sol e se espalha em circulo pela tela.
  // Modo escuro: a luz volta e se recolhe para dentro do botao.
  var _temaTrocando=false;
  // Raio da luz como medida animavel (para o escuro fechar no botao)
  var _raioRegistrado=false;
  function registrarRaioTema(){
    if(_raioRegistrado)return;_raioRegistrado=true;
    try{if(window.CSS&&CSS.registerProperty)CSS.registerProperty({name:'--saga-tema-r',syntax:'<length>',inherits:true,initialValue:'0px'});}catch(e){}
  }
  function trocarTemaComLuz(btn,novo,aplicar){
    var html=document.documentElement;
    var reduz=window.matchMedia&&(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches;
    if(!document.startViewTransition||reduz||_temaTrocando){aplicar();return;}
    _temaTrocando=true;
    var r=btn.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    var raio=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
    var clarear=novo==='light';
    registrarRaioTema();
    html.style.setProperty('--saga-tema-x',x+'px');html.style.setProperty('--saga-tema-y',y+'px');html.style.setProperty('--saga-tema-r',raio+'px');
    html.classList.add('saga-tema-trocando');
    html.classList.toggle('saga-tema-escurecendo',!clarear);
    html.classList.toggle('saga-tema-clareando',clarear);
    var vt,anim=null;
    try{vt=document.startViewTransition(aplicar);}catch(e){aplicar();fim();return;}
    function fim(){_temaTrocando=false;if(anim){try{anim.cancel();}catch(e){}anim=null;}html.classList.remove('saga-tema-trocando','saga-tema-escurecendo','saga-tema-clareando');}
    vt.ready.then(function(){
      if(clarear){
        anim=html.animate({clipPath:['circle(0px at '+x+'px '+y+'px)','circle('+raio+'px at '+x+'px '+y+'px)']},
          {duration:650,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards',pseudoElement:'::view-transition-new(root)'});
      }else{
        anim=html.animate({'--saga-tema-r':[raio+'px','0px']},
          {duration:560,easing:'cubic-bezier(.55,0,.6,1)',fill:'forwards',pseudoElement:'::view-transition-new(root)'});
      }
    }).catch(function(){});
    vt.finished.then(fim,fim);
  }

  function ligarHamburger(){
    var ham=document.getElementById('hamburger');
    if(!ham||ham.dataset.ligado)return;
    ham.dataset.ligado='true';
    // Toda tela precisa do fundo escuro do menu do celular (tocar nele fecha o menu)
    if(!document.getElementById('overlay')){var ovNovo=document.createElement('div');ovNovo.id='overlay';ovNovo.className='overlay';ovNovo.style.display='none';document.body.appendChild(ovNovo);}
    ajustarMenuParaCelular();
    window.addEventListener('resize',ajustarMenuParaCelular);
    var sbInicial=document.getElementById('sidebarSaga');
    if(sbInicial&&sbInicial.classList.contains('collapsed'))ham.classList.add('ativo');
    ham.addEventListener('click',function(){
      var sb=document.getElementById('sidebarSaga');
      var ov=document.getElementById('overlay');
      if(window.innerWidth<=760){
        ajustarMenuParaCelular();
        if(sb&&sb.classList.contains('open')){fecharMenuCelular();return;}
        if(sb)sb.classList.add('open');
        if(ov)ov.classList.add('aberto');
        ham.classList.add('ativo');
        travarPagina(true);
        return;
      }
      if(sb){
        sb.classList.toggle('collapsed');
        localStorage.setItem('saga-sidebar-colapsada',sb.classList.contains('collapsed')?'true':'false');
        ham.classList.toggle('ativo',sb.classList.contains('collapsed'));
      }
    });
    var ov=document.getElementById('overlay');
    if(ov&&!ov.dataset.ligado){
      ov.dataset.ligado='true';
      ov.addEventListener('click',fecharMenuCelular);
      // Arrastar o dedo no fundo escuro nao rola a pagina de tras
      ov.addEventListener('touchmove',function(e){e.preventDefault();},{passive:false});
    }
  }

  function ligarPresencaESino(){
    var btnP=document.getElementById('presenceBtn');
    var btnN=document.getElementById('notifBtn');
    var av=document.getElementById('avatarTop');
    if(btnP&&!btnP.dataset.ligado){
      btnP.dataset.ligado='true';
      btnP.addEventListener('click',function(e){
        e.stopPropagation();
        var p=document.getElementById('presencePop');
        var aberto=p.classList.contains('open');
        fecharTodosPopovers();
        if(!aberto){p.classList.add('open');carregarPresenca();}
      });
    }
    if(btnN&&!btnN.dataset.ligado){
      btnN.dataset.ligado='true';
      btnN.addEventListener('click',function(e){
        e.stopPropagation();
        var p=document.getElementById('notifPop');
        var aberto=p.classList.contains('open');
        fecharTodosPopovers();
        if(!aberto){p.classList.add('open');carregarNotificacoes();}
      });
    }
    if(av&&!av.dataset.ligado){
      av.dataset.ligado='true';
      av.addEventListener('click',function(e){
        e.stopPropagation();
        var p=document.getElementById('avatarPop');
        var aberto=p.classList.contains('open');
        fecharTodosPopovers();
        var mini=document.getElementById('avatarPopFoto');if(mini)mini.innerHTML=av.innerHTML;
        if(!aberto)p.classList.add('open');
      });
    }
    document.querySelectorAll('#avatarPop [data-ir]').forEach(function(a){
      if(a.dataset.ligado)return;a.dataset.ligado='true';
      a.addEventListener('click',function(e){
        if(e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;
        e.preventDefault();e.stopPropagation();fecharTodosPopovers();global.sagaIrPara(a.getAttribute('href'));
      });
    });
    // (09/11) a chave "Efeitos de movimento" fica só em Configurações > Preferências; o menu da foto não tem mais a chave
    // (10/11) "Sugerir uma melhoria": abre a sugestão já marcada na aba em que a pessoa está
    var btnSug=document.querySelector('#avatarPop [data-acao="sugerir"]');
    if(btnSug&&!btnSug.dataset.ligado){
      btnSug.dataset.ligado='true';
      var irSug=function(e){e.stopPropagation();fecharTodosPopovers();global.sagaIrPara('sugestoes.html?nova=1'+(_telaAtual&&_telaAtual!=='sugestoes'?'&tela='+encodeURIComponent(_telaAtual):''));};
      btnSug.addEventListener('click',irSug);
      btnSug.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();irSug(e);}});
    }
    // (10/11) "Manual do SAGA": abre o manual já no capítulo da tela em que a pessoa está
    var btnMan=document.querySelector('#avatarPop [data-acao="manual"]');
    if(btnMan&&!btnMan.dataset.ligado){
      btnMan.dataset.ligado='true';
      var irMan=function(e){e.stopPropagation();fecharTodosPopovers();global.sagaIrPara('manual.html'+(_telaAtual&&_telaAtual!=='manual'?'?tela='+encodeURIComponent(_telaAtual):''));};
      btnMan.addEventListener('click',irMan);
      btnMan.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();irMan(e);}});
    }
    var btnSair=document.querySelector('[data-acao="sair"]');
    if(btnSair&&!btnSair.dataset.ligado){
      btnSair.dataset.ligado='true';
      btnSair.addEventListener('click',function(e){
        e.stopPropagation();
        sairComLembrete();
      });
      btnSair.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();sairComLembrete();}});
    }
    var btnRefresh=document.getElementById('refreshBtn');
    if(btnRefresh&&!btnRefresh.dataset.ligado){
      btnRefresh.dataset.ligado='true';
      // Atualizar (08/11, Dr. Victor): o ícone dá UMA volta completa e só depois a tela recarrega
      // (antes recarregava no meio do giro e a animação "quebrava"). Cliques repetidos durante o giro são ignorados.
      btnRefresh.addEventListener('click',function(){
        if(btnRefresh.dataset.girando)return;
        btnRefresh.dataset.girando='1';btnRefresh.setAttribute('aria-busy','true');
        var recarregar=function(){location.reload();};
        var semMov=false;try{semMov=localStorage.getItem('saga-movimento')==='reduzido';}catch(e){}
        var svg=btnRefresh.querySelector('svg');
        if(semMov||!svg||!svg.animate){recarregar();return;}
        var giro=svg.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:620,easing:'cubic-bezier(.22,.78,.25,1)',fill:'forwards'});
        var feito=false,fim=function(){if(feito)return;feito=true;requestAnimationFrame(function(){requestAnimationFrame(recarregar);});};
        giro.onfinish=fim;giro.oncancel=fim;setTimeout(fim,1200);
      });
    }
    if(!document.body.dataset.sagaClickLigado){
      document.body.dataset.sagaClickLigado='true';
      document.addEventListener('click',function(e){
        if(!e.target.closest('.presence-wrap')&&!e.target.closest('.notification-wrap')&&!e.target.closest('.avatar-wrap')&&!e.target.closest('.quick-search'))fecharTodosPopovers();
      });
    }
  }

  async function carregarPerfil(){
    if(!global._sb)return;
    try{
      var s=await global._sb.auth.getSession();
      if(!s.data||!s.data.session)return;
      var authId=s.data.session.user.id;
      var r=await global._sb.from('usuarios').select('id,nome_completo,email,eh_administrador,ativo,foto_url,preferencias,preferencias_notificacao,tema_cor_fixo,temas_modo').eq('auth_user_id',authId).single();
      if(r.error||!r.data)return;
      // Colaborador desligado (inativo) com sessao ainda aberta: sai na hora
      if(r.data.ativo===false){await global.sagaLogout('desligado');return;}
      _perfilAtual=r.data;
      // Regra de 09/11 (Dr. Victor): só o administrador geral apaga, exclui ou remove; para os outros os botões somem (o banco também recusa)
      document.documentElement.classList.toggle('saga-pode-apagar',!!r.data.eh_administrador);
      var av=document.getElementById('avatarTop');if(av)definirIniciaisAvatar(av,iniciais(r.data.nome_completo));try{localStorage.setItem('saga-iniciais',iniciais(r.data.nome_completo));}catch(e){}
      mostrarFotoAvatar(r.data.foto_url);
      // tamanho da letra escolhido nas Configuracoes vale em qualquer aparelho
      var letra=String((r.data.preferencias||{}).letra||'1');
      try{if(localStorage.getItem('saga-letra')!==letra){localStorage.setItem('saga-letra',letra);document.documentElement.style.zoom=letra==='1'?'':letra;}}catch(e){}
      // cor do tema: a fixada pelo administrador vale mais que a escolha da pessoa; sem nada, Azul
      // e só vale cor liberada pelo administrador (regra geral ou "todos os temas" para a pessoa)
      try{var rg=await global._sb.rpc('temas_regra');if(!rg.error&&rg.data)global._sagaTemasRegra=rg.data;}catch(e){}
      try{var vlc=(r.data.preferencias||{}).vidro_cor;if(vlc&&/^#[0-9a-f]{6}$/i.test(vlc)&&localStorage.getItem('saga-vidro-cor')!==vlc)localStorage.setItem('saga-vidro-cor',vlc);}catch(e){}
      var corEsc=r.data.tema_cor_fixo||global.sagaTemaDoMes()||(r.data.preferencias||{}).cor||'azul';
      if(!r.data.tema_cor_fixo&&global.sagaTemasPermitidos(r.data).indexOf(corEsc)<0)corEsc='azul';
      global.sagaAplicarCor(corEsc);
      _avisosDesligados=((r.data.preferencias_notificacao||{}).desligados)||[];
      var nm=document.getElementById('avatarPopNome');if(nm)nm.textContent=r.data.nome_completo||'';
      var em=document.getElementById('avatarPopEmail');if(em)em.textContent=r.data.email||'';
    }catch(e){}
  }

  // ===== PRESENCA EM TEMPO REAL =====
  // Cada tela aberta entra no canal "presenca-saga" do Supabase Realtime.
  // Quem fecha o sistema ou perde a conexao sai da lista automaticamente.
  var NOMES_TELAS={configuracoes:'Configurações',processos:'Processos',processos_juridico:'Jurídico',processos_captacao:'Captação',agenda:'Agenda',tarefas:'Minhas Tarefas',pedidos_claude:'Pedidos do Claude',chat:'Chat Interno',ponto:'Ponto Eletrônico',colaboradores:'Colaboradores',dashboard:'Dashboard',biblioteca:'Biblioteca',financeiro:'Financeiro',precatorios:'Precatórios e RPV',marketing:'Marketing',ficha:'Ficha do Cliente',monitoramento:'Intimações',notas:'Notas',cartas:'Cartas',buscas:'Pedidos de busca',sugestoes:'Sugestões de melhoria',manual:'Manual do SAGA',teses:'Teses e oportunidades',clientes_perfil:'Clientes por perfil',atividades:'Registro de atividades',treinamentos:'Treinamentos',obsidian:'Fichas do agente'};
  var _canalPresenca=null;
  var _telaAtual='';
  // trava até bater o ponto (bloco 162): declarada aqui porque a moldura montada cedo já usa
  var CHAVE_TRAVA='saga-ponto-trava',_trava={ligada:false,timer:null,ligado:false};
  var _colaboradoresAtivos=null;

  function iniciarPresenca(){
    if(!global._sb||!_perfilAtual||_canalPresenca)return;
    _canalPresenca=global._sb.channel('presenca-saga',{config:{presence:{key:_perfilAtual.id}}});
    _canalPresenca.on('presence',{event:'sync'},renderizarPresenca);
    _canalPresenca.subscribe(function(status){
      if(status==='SUBSCRIBED'){
        _canalPresenca.track({nome:_perfilAtual.nome_completo,tela:NOMES_TELAS[_telaAtual]||'',desde:new Date().toISOString()});
      }
    });
  }

  function renderizarPresenca(){
    var estado=_canalPresenca?_canalPresenca.presenceState():{};
    var online=Object.keys(estado).map(function(id){
      var metas=estado[id]||[];
      var telas=metas.map(function(m){return m.tela;}).filter(Boolean);
      return {id:id,nome:(metas[0]&&metas[0].nome)||'Colaborador',telas:telas.filter(function(t,i){return telas.indexOf(t)===i;})};
    }).sort(function(a,b){return a.nome.localeCompare(b.nome);});
    var lbl=document.getElementById('onlineText');
    if(lbl){lbl.textContent=online.length+' online agora';guardarNumerosMoldura();}
    var pop=document.getElementById('presencePop');
    if(!pop)return;
    var idsOnline=online.map(function(u){return u.id;});
    var offline=(_colaboradoresAtivos||[]).filter(function(u){return idsOnline.indexOf(u.id)===-1;});
    function linhaPessoa(nome,detalhe,on){
      return '<div class="pop-row"'+(on?'':' style="opacity:.55"')+'><span class="pop-avatar" data-saga-nome="'+esc(nome)+'">'+esc(iniciais(nome))+'<span class="pop-avatar-status'+(on?' on':'')+'"></span></span><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(nome)+'</div>'+(detalhe?'<div style="font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(detalhe)+'</div>':'')+'</div></div>';
    }
    var htmlOnline=online.map(function(u){return linhaPessoa(u.nome,u.telas.length?u.telas.join(', '):'',true);}).join('');
    var htmlOffline=offline.map(function(u){return linhaPessoa(u.nome_completo,'',false);}).join('');
    pop.innerHTML='<div class="pop-title">Online agora</div>'+(htmlOnline||'<div style="font-size:10.5px;color:var(--muted);padding:10px;text-align:center">Ninguém online.</div>')+
      (htmlOffline?'<div class="pop-title">Offline</div>'+htmlOffline:'');
  }

  async function carregarPresenca(){
    if(!global._sb)return;
    try{
      if(!_colaboradoresAtivos){
        var q=await global._sb.from('usuarios').select('id,nome_completo').eq('ativo',true).not('auth_user_id','is',null).order('nome_completo');
        _colaboradoresAtivos=q.data||[];
      }
      iniciarPresenca();
      renderizarPresenca();
    }catch(e){}
  }

  // ===== SAIDA AUTOMATICA POR INATIVIDADE =====
  // Expediente: segunda a sexta, das 8h as 18h (horario de Maceio).
  // Durante o expediente o sistema nunca desconecta sozinho. Fora dele,
  // desconecta apos 2 horas sem uso, contando so o tempo fora do expediente.
  var HORA_INICIO_EXPEDIENTE=8,HORA_FIM_EXPEDIENTE=18;
  var LIMITE_INATIVIDADE_MIN=120;
  var CHAVE_ATIVIDADE='saga-ultima-atividade';
  var _fmtMaceio=new Intl.DateTimeFormat('en-US',{timeZone:'America/Maceio',weekday:'short',hour:'2-digit',hour12:false});

  function emExpediente(ms){
    var partes={};
    _fmtMaceio.formatToParts(new Date(ms)).forEach(function(p){partes[p.type]=p.value;});
    var hora=parseInt(partes.hour,10)%24;
    var diaUtil=['Mon','Tue','Wed','Thu','Fri'].indexOf(partes.weekday)!==-1;
    return diaUtil&&hora>=HORA_INICIO_EXPEDIENTE&&hora<HORA_FIM_EXPEDIENTE;
  }

  // Minutos fora do expediente entre a ultima atividade e agora
  function minutosOciososForaDoExpediente(){
    var ultima=parseInt(localStorage.getItem(CHAVE_ATIVIDADE)||'0',10);
    if(!ultima)return 0;
    var agora=Date.now(),passo=5*60*1000,total=0;
    var inicio=Math.max(ultima,agora-15*24*60*60*1000);
    for(var t=inicio;t<agora;t+=passo){
      if(!emExpediente(t))total+=Math.min(passo,agora-t)/60000;
      if(total>=LIMITE_INATIVIDADE_MIN)break;
    }
    return total;
  }

  var _ultimoRegistroAtividade=0;
  function registrarAtividade(){
    var agora=Date.now();
    if(agora-_ultimoRegistroAtividade<30000)return;
    _ultimoRegistroAtividade=agora;
    try{localStorage.setItem(CHAVE_ATIVIDADE,String(agora));}catch(e){}
  }

  async function verificarInatividade(){
    if(!global._sb)return false;
    // Login diário (bloco 181, T165): colaborador segue o horário dele (30 min sem uso fora dele) e cai às 20h.
    // Administrador geral e Hevelyn (isentos) continuam na regra antiga de 2 horas.
    var g=_regrasLogin;
    if(g&&g.ok&&!g.isento){
      if(_proximoCorte&&Date.now()>=_proximoCorte){
        _proximoCorte=0;
        var nova=await carregarRegrasLogin(true);
        if(!nova||nova.erro||nova.sessao_vencida){await sairPorRegra('fim_dia');return true;}
      }
      if(g.inativo){
        if(minutosOciososForaDoHorario(g)>=g.inativo_min){await sairPorRegra('inatividade');return true;}
        return false;
      }
    }
    if(minutosOciososForaDoExpediente()>=LIMITE_INATIVIDADE_MIN){
      await global.sagaLogout('inatividade');
      return true;
    }
    return false;
  }

  // ===== Login diário (12/11, Dr. Victor; bloco 181, T165) =====
  // O banco diz as regras de quem está usando (login_regras): isento (administrador geral e Hevelyn), hora do corte
  // do fim do dia (20h), minutos sem uso fora do horário (30) e o horário de hoje (jornada do Ponto; sem jornada,
  // 7h às 20h em dia útil). Às 20h o banco apaga as sessões (agendador login-fim-dia) e a tela também confere.
  var CHAVE_REGRAS_LOGIN='saga-login-regras',_regrasLogin=null,_proximoCorte=0,_difRelogio=0;
  var _fmtHM=new Intl.DateTimeFormat('en-US',{timeZone:'America/Maceio',hour:'2-digit',minute:'2-digit',hour12:false});
  function minutoMaceio(ms){var p={};_fmtHM.formatToParts(new Date(ms)).forEach(function(x){p[x.type]=x.value;});return (parseInt(p.hour,10)%24)*60+parseInt(p.minute,10);}
  function minutosOciososForaDoHorario(g){
    var ultima=parseInt(localStorage.getItem(CHAVE_ATIVIDADE)||'0',10);
    if(!ultima)return 0;
    var agora=Date.now()+_difRelogio,m=minutoMaceio(agora);
    if(g.dia_util&&m>=g.ini_min&&m<g.fim_min)return 0;
    // depois do horário de hoje, conta só desde o fim do horário; antes do início, fim de semana ou feriado, desde o último uso
    var inicioFora=(g.dia_util&&m>=g.fim_min)?agora-(m-g.fim_min)*60000:0;
    return Math.max(0,(agora-Math.max(ultima+_difRelogio,inicioFora))/60000);
  }
  function agendarCorte(g){
    _proximoCorte=0;
    if(!g||!g.ok||g.isento||!g.fim_dia)return;
    var agora=Date.now()+_difRelogio,falta=g.fim_dia_min-minutoMaceio(agora);
    if(falta<=0)falta+=1440;
    _proximoCorte=Date.now()+falta*60000-(new Date(agora).getSeconds()*1000);
  }
  async function carregarRegrasLogin(forcar){
    if(!global._sb)return null;
    var uid=idSessaoLocal()||'',hoje=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Maceio'});
    if(!forcar){
      try{var c=JSON.parse(sessionStorage.getItem(CHAVE_REGRAS_LOGIN)||'null');
        if(c&&c.uid===uid&&c.dia===hoje&&c.ate>Date.now()&&c.dados){_regrasLogin=c.dados;_difRelogio=c.dif||0;if(!_proximoCorte)agendarCorte(_regrasLogin);return _regrasLogin;}}catch(e){}
    }
    try{
      var r=await global._sb.rpc('login_regras');
      if(r.error||!r.data)return {erro:true};
      _regrasLogin=r.data;
      if(r.data.agora){var srv=Date.parse(r.data.agora);if(!isNaN(srv))_difRelogio=srv-Date.now();}
      try{sessionStorage.setItem(CHAVE_REGRAS_LOGIN,JSON.stringify({uid:uid,dia:hoje,ate:Date.now()+10*60000,dif:_difRelogio,dados:r.data}));}catch(e){}
      agendarCorte(_regrasLogin);
      return _regrasLogin;
    }catch(e){return {erro:true};}
  }
  // Grava o motivo (Registro de atividades e Ponto > Acessos) e sai
  async function sairPorRegra(motivo){
    try{
      await Promise.race([global._sb.rpc('login_saida_registrar',{p_motivo:motivo==='fim_dia'?'fim_dia':'inatividade',p_navegador:(navigator.userAgent||'').slice(0,300)}),new Promise(function(ok){setTimeout(ok,3000);})]);
    }catch(e){}
    try{sessionStorage.removeItem(CHAVE_REGRAS_LOGIN);sessionStorage.removeItem(CHAVE_ENTRADA_OK);}catch(e){}
    await global.sagaLogout(motivo==='fim_dia'?'fim_dia':'inatividade_fora');
  }
  // Ao abrir a tela: login de antes do corte das 20h? sai (o banco já derrubou ou vai derrubar)
  async function conferirLoginDiario(){
    var g=await carregarRegrasLogin(false);
    if(g&&g.ok&&!g.isento&&g.sessao_vencida){await sairPorRegra('fim_dia');return false;}
    return true;
  }

  // ===== Entrada só pela internet do escritório (bloco 181, T165; chave em Ponto > Cadastro > Configurações) =====
  // De uma internet fora da lista, a tela fica em "Aguardando autorização do administrador" e o Dr. Victor
  // decide no sino (só hoje, esta internet sempre ou recusar). Autorizado, a tela libera sozinha.
  var CHAVE_ENTRADA_OK='saga-entrada-ok';
  async function conferirEntradaRede(){
    if(!global._sb)return true;
    var uid=idSessaoLocal()||'';
    try{var c=JSON.parse(sessionStorage.getItem(CHAVE_ENTRADA_OK)||'null');if(c&&c.uid===uid&&c.ate>Date.now())return true;}catch(e){}
    var pedir=function(){return global._sb.rpc('entrada_conferir',{p_aparelho:global.sagaAparelhoCodigo(),p_navegador:(navigator.userAgent||'').slice(0,300)});};
    var d;
    try{var r=await pedir();if(r.error||!r.data)return true;d=r.data;}catch(e){return true;}
    var guardar=function(){try{sessionStorage.setItem(CHAVE_ENTRADA_OK,JSON.stringify({uid:uid,ate:Date.now()+15*60000}));}catch(e){}};
    if(d.ok){guardar();return true;}
    return new Promise(function(liberar){
      var tela=mostrarAguardandoEntrada(d),timer=null;
      if(d.situacao==='recusado')return;
      timer=setInterval(async function(){
        if(document.hidden)return;
        try{var r2=await pedir();if(r2.error||!r2.data)return;
          if(r2.data.ok){clearInterval(timer);guardar();tirarAguardandoEntrada(tela);liberar(true);}
          else if(r2.data.situacao==='recusado'){clearInterval(timer);mostrarAguardandoEntrada(r2.data);}
        }catch(e){}
      },8000);
    });
  }
  function mostrarAguardandoEntrada(d){
    var recusado=d.situacao==='recusado';
    var t=document.getElementById('sagaAguardaEntrada');
    var fade=!t&&!semMovimentoTrava();
    if(!t){
      t=document.createElement('div');t.id='sagaAguardaEntrada';t.setAttribute('role','alertdialog');t.setAttribute('aria-labelledby','sagaAguardaTitulo');t.setAttribute('data-saga-movimento-proprio','');
      t.style.cssText='position:fixed;inset:0;z-index:2147483000;background:linear-gradient(160deg,var(--navy-1,#e8ecf1),var(--navy-2,#dfe5ee));display:flex;align-items:center;justify-content:center;padding:24px 16px;overflow:auto;font-family:Montserrat,Arial,sans-serif;'+(fade?'opacity:0;transition:opacity .32s cubic-bezier(.22,.78,.25,1);':'');
      // fica fora do body (a tela ainda está escondida): leva o tema claro/escuro do body
      try{var tema=document.body&&document.body.getAttribute('data-theme');if(tema)t.setAttribute('data-theme',tema);}catch(e){}
      document.documentElement.appendChild(t);
      if(fade)requestAnimationFrame(function(){requestAnimationFrame(function(){t.style.opacity='1';});});
    }
    var cor=recusado?'#e5484d':'var(--gold,#2f6cd6)';
    t.innerHTML='<div style="max-width:460px;width:100%;text-align:center;background:var(--panel,#fff);border:1px solid var(--border,#d5dbe4);border-radius:16px;padding:30px 26px;box-shadow:0 10px 30px rgba(0,0,0,.14);color:var(--text,#13233a)">'
      +'<div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,'+cor+' 14%,transparent);color:'+cor+'"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
      +(recusado?'<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>':'<path d="M3.5 9.5a12 12 0 0117 0M6.5 12.5a7.5 7.5 0 0111 0M9.5 15.5a3 3 0 015 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="18.5" r="1.2" fill="currentColor"/>')
      +'</svg></div>'
      +'<div id="sagaAguardaTitulo" style="font-family:Cormorant Garamond,serif;font-size:22px;font-weight:600;margin-bottom:8px">'+(recusado?'Entrada recusada':'Aguardando autorização do administrador para entrar desta internet')+'</div>'
      +'<div style="font-size:12.5px;color:var(--muted,#4a586e);line-height:1.55;margin-bottom:16px">'
      +(recusado?'O administrador recusou a entrada no SAGA por esta internet hoje. No escritório, use a internet do escritório (Wi-Fi ou cabo). Se for engano, fale com o Dr. Victor.'
               :'Esta internet'+(d.ip?' ('+esc(d.ip)+')':'')+' não é uma das internets autorizadas do escritório. O Dr. Victor já recebeu o pedido no sino; assim que ele autorizar, esta tela libera sozinha. Trabalhando de casa? Peça home office pelo Ponto antes (ou fale com ele).')
      +'</div>'
      +(recusado?'':'<div aria-hidden="true" style="display:flex;gap:6px;justify-content:center;margin:0 0 18px"><span class="saga-ag-p"></span><span class="saga-ag-p"></span><span class="saga-ag-p"></span></div>')
      +'<button type="button" data-sair style="height:36px;padding:0 18px;border-radius:9px;border:1px solid var(--border,#d5dbe4);background:transparent;color:var(--text,#13233a);font:inherit;font-size:12.5px;cursor:pointer">Sair do sistema</button>'
      +'</div>';
    if(!document.getElementById('sagaAguardaCss')){var st=document.createElement('style');st.id='sagaAguardaCss';
      st.textContent='.saga-ag-p{width:7px;height:7px;border-radius:50%;background:var(--gold,#2f6cd6);opacity:.25;animation:sagaAgP 1.2s cubic-bezier(.22,.78,.25,1) infinite}.saga-ag-p:nth-child(2){animation-delay:.2s}.saga-ag-p:nth-child(3){animation-delay:.4s}@keyframes sagaAgP{50%{opacity:1}}html.saga-sem-movimento .saga-ag-p{animation:none;opacity:.6}';
      (document.head||document.documentElement).appendChild(st);}
    t.querySelector('[data-sair]').addEventListener('click',function(){try{sessionStorage.removeItem(CHAVE_ENTRADA_OK);}catch(e){}global.sagaLogout();});
    return t;
  }
  function tirarAguardandoEntrada(t){
    if(!t)return;t.id='';
    if(semMovimentoTrava()){t.remove();return;}
    t.style.transition='opacity .26s cubic-bezier(.22,.78,.25,1)';t.style.opacity='0';
    setTimeout(function(){t.remove();},300);
  }

  // Janela do administrador: decidir os pedidos de entrada (aviso do sino 'acessos_pedido')
  async function abrirPedidosEntrada(ids){
    ids=(ids||[]).filter(Boolean);if(!ids.length)return;
    var dados=[];
    for(var i=0;i<ids.length;i++){try{var r=await global._sb.rpc('entrada_pedido_ver',{p_pedido:ids[i]});if(!r.error&&r.data)dados.push(r.data);}catch(e){}}
    var velho=document.getElementById('sagaPedidosEntrada');if(velho)velho.remove();
    var fundo=document.createElement('div');fundo.id='sagaPedidosEntrada';fundo.setAttribute('role','dialog');fundo.setAttribute('aria-modal','true');fundo.setAttribute('aria-labelledby','sagaPedTit');fundo.setAttribute('data-saga-movimento-proprio','');
    var mov=!semMovimentoTrava();
    fundo.style.cssText='position:fixed;inset:0;z-index:1500;background:rgba(8,14,26,.45);display:flex;align-items:flex-start;justify-content:center;padding:70px 16px 24px;overflow:auto;'+(mov?'opacity:0;transition:opacity .28s cubic-bezier(.22,.78,.25,1);':'');
    var fmtH=function(t){try{return new Date(t).toLocaleTimeString('pt-BR',{timeZone:'America/Maceio',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}};
    var linhas=dados.length?dados.map(function(p){
      var feito=p.situacao!=='aguardando';
      return '<div data-ped="'+esc(p.id)+'" style="border:1px solid var(--border,#d5dbe4);border-radius:12px;padding:12px 14px;margin:0 0 10px">'
        +'<div style="font-size:13px;font-weight:600">'+esc(p.nome||'Colaborador')+'</div>'
        +'<div style="font-size:11.5px;color:var(--muted,#4a586e);line-height:1.5;margin:3px 0 10px">Internet '+esc(p.ip||'')+(p.aparelho?' · '+esc(p.aparelho):'')+' · pediu às '+fmtH(p.criado_em)+(p.ip_ja_autorizado?' · esta internet já está autorizada':'')+'</div>'
        +(feito?'<div style="font-size:12px">'+(p.situacao==='recusado'?'Recusado':'Autorizado'+(p.alcance==='sempre'?' (internet autorizada sempre)':' (só hoje)'))+(p.decidido_por?' por '+esc(p.decidido_por):'')+(p.decidido_em?' às '+fmtH(p.decidido_em):'')+'.</div>'
          :'<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="saga-ped-btn principal" data-dec="hoje">Autorizar só hoje</button><button type="button" class="saga-ped-btn" data-dec="sempre">Autorizar esta internet sempre</button><button type="button" class="saga-ped-btn perigo" data-dec="recusar">Recusar</button></div>')
        +'</div>';}).join(''):'<div style="font-size:12px;color:var(--muted,#4a586e)">Pedido não encontrado.</div>';
    fundo.innerHTML='<div style="width:100%;max-width:480px;background:var(--panel,#fff);color:var(--text,#13233a);border:1px solid var(--border,#d5dbe4);border-radius:16px;padding:20px 20px 16px;box-shadow:0 14px 40px rgba(0,0,0,.25);font-family:Montserrat,Arial,sans-serif">'
      +'<div id="sagaPedTit" style="font-family:Cormorant Garamond,serif;font-size:21px;font-weight:600;margin-bottom:4px">Pedido de entrada no SAGA</div>'
      +'<div style="font-size:11.5px;color:var(--muted,#4a586e);line-height:1.5;margin-bottom:14px">Colaborador tentando entrar de uma internet que não está entre as autorizadas. "Sempre" acrescenta a internet em Ponto &gt; Cadastro &gt; Internets do escritório (vale também para o ponto).</div>'
      +linhas+'<div style="text-align:right;margin-top:6px"><button type="button" class="saga-ped-btn" data-fechar>Fechar</button></div></div>';
    if(!document.getElementById('sagaPedBtnCss')){var cs=document.createElement('style');cs.id='sagaPedBtnCss';
      cs.textContent='.saga-ped-btn{height:32px;padding:0 14px;border-radius:9px;border:1px solid var(--border,#d5dbe4);background:color-mix(in srgb,var(--text,#13233a) 4%,transparent);color:var(--text,#13233a);font:inherit;font-size:12px;font-weight:400;cursor:pointer;transition:background .2s,border-color .2s}'
        +'.saga-ped-btn:hover{border-color:var(--gold,#2f6cd6)}.saga-ped-btn.principal{border-color:color-mix(in srgb,var(--gold,#2f6cd6) 60%,transparent);background:color-mix(in srgb,var(--gold,#2f6cd6) 18%,transparent)}'
        +'.saga-ped-btn.perigo{color:#e5484d;border-color:color-mix(in srgb,#e5484d 45%,transparent);background:color-mix(in srgb,#e5484d 8%,transparent)}.saga-ped-btn:disabled{opacity:.55;cursor:default}';
      (document.head||document.documentElement).appendChild(cs);}
    document.body.appendChild(fundo);
    if(mov)requestAnimationFrame(function(){requestAnimationFrame(function(){fundo.style.opacity='1';});});
    var fechar=function(){if(mov){fundo.style.opacity='0';setTimeout(function(){fundo.remove();},300);}else fundo.remove();contarNaoLidas();};
    fundo.addEventListener('click',async function(e){
      if(e.target===fundo||e.target.closest('[data-fechar]')){fechar();return;}
      var b=e.target.closest('[data-dec]');if(!b)return;
      var cx=b.closest('[data-ped]'),id=cx.getAttribute('data-ped');
      cx.querySelectorAll('button').forEach(function(x){x.disabled=true;});
      try{
        var r=await global._sb.rpc('entrada_decidir',{p_pedido:id,p_decisao:b.getAttribute('data-dec')});
        if(r.error)throw r.error;
        var txt=b.getAttribute('data-dec')==='recusar'?'Entrada recusada.':'Entrada autorizada: a tela da pessoa libera sozinha.';
        if(typeof global.showToast==='function')global.showToast(txt,'success');
        var bx=cx.querySelector('div:last-child');if(bx)bx.outerHTML='<div style="font-size:12px">'+esc(txt)+'</div>';
        if(b.getAttribute('data-dec')==='sempre')setTimeout(function(){abrirPedidosEntrada(ids);},400);
      }catch(err){
        cx.querySelectorAll('button').forEach(function(x){x.disabled=false;});
        if(typeof global.showToast==='function')global.showToast('Não deu para gravar: '+((err&&err.message)||'erro'),'error');
      }
    });
    document.addEventListener('keydown',function esc1(e){if(e.key==='Escape'&&document.body.contains(fundo)){fechar();document.removeEventListener('keydown',esc1);}});
  }
  global.sagaAbrirPedidosEntrada=abrirPedidosEntrada;

  function ligarControleInatividade(){
    if(document.body.dataset.sagaInatividadeLigada)return;
    document.body.dataset.sagaInatividadeLigada='true';
    ['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(function(ev){
      document.addEventListener(ev,registrarAtividade,{passive:true,capture:true});
    });
    setInterval(verificarInatividade,60000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)verificarInatividade();});
    // Revalida o acesso em segundo plano quando passam os 30 minutos
    setInterval(function(){verificarAcesso(false);},60000);
  }

  // Tipos gravados pelos gatilhos do banco (notificar_nova_tarefa, notificar_mencao etc.)
  var TIPOS_NOTIF={
    distribuicao:{titulo:'Fichas da Captação',tela:'lista_processos_padrao_metalico.html?fase=captacao'},
    tarefa_prazo:{titulo:'Tarefa',tela:'minhas_tarefas.html'},
    tarefa_repasse:{titulo:'Tarefa repassada',tela:'minhas_tarefas.html'},
    chat_mensagem:{titulo:'Chat',tela:'chat_interno_padrao_metalico.html'},
    mencao:{titulo:'Menção'},
    nota_compartilhada:{titulo:'Nota compartilhada',tela:'notas.html'},
    retorno_captacao:{titulo:'Retornos de hoje',tela:'lista_processos_padrao_metalico.html?fase=captacao'},
    processo_parado:{titulo:'Processo parado',tela:'lista_processos_padrao_metalico.html?fase=juridico'},
    retorno_juridico:{titulo:'Retornos do Jurídico',tela:'lista_processos_padrao_metalico.html?fase=juridico'},
    acompanhamento:{titulo:'Fichas sem data de retorno',tela:'lista_processos_padrao_metalico.html?fase=captacao'},
    nao_protocolado:{titulo:'Ainda não protocolado',tela:'minhas_tarefas.html'},
    resumo_semanal:{titulo:'Resumo da semana',tela:'lista_processos_padrao_metalico.html?fase=juridico'},
    tarefa_hoje:{titulo:'Tarefa para hoje',tela:'minhas_tarefas.html'},
    tarefa_atrasada:{titulo:'Tarefa atrasada',tela:'minhas_tarefas.html'},
    compromisso_hoje:{titulo:'Compromisso hoje',tela:'calendario_padrao_metalico.html'},
    agenda_atribuida:{titulo:'Compromisso atribuído a você',tela:'calendario_padrao_metalico.html'},
    agenda_solicitacao:{titulo:'Pedido de atendimento',tela:'calendario_padrao_metalico.html'},
    agenda_resposta:{titulo:'Resposta da agenda',tela:'calendario_padrao_metalico.html'},
    movimentacao_cnj:{titulo:'Intimação',tela:'monitoramento_multi_oab.html'},
    tese_atualizacao:{titulo:'Atualização de tese',tela:'teses.html'},
    radar_novo:{titulo:'Radar de oportunidades',tela:'teses.html?aba=radar'},
    seguranca:{titulo:'Segurança',tela:'registro_atividades.html'}
  };
  function infoNotif(n){
    if(n&&n.referencia_tabela==='pedidos_busca')return {titulo:'Pedido de busca',tela:'pedidos_busca.html'};
    if(n&&n.referencia_tabela==='sugestoes')return {titulo:'Sugestão de melhoria',tela:'sugestoes.html'};
    if(n&&n.referencia_tabela==='ponto')return {titulo:'Ponto',tela:'ponto_eletronico_padrao_metalico.html'};
    if(n&&n.referencia_tabela==='ponto_home_office')return {titulo:'Pedido de home office',tela:'ponto_eletronico_padrao_metalico.html?aba=equipe'};
    if(n&&n.referencia_tabela==='meta_anuncios')return {titulo:'Robô do Meta',tela:'marketing_campanhas_padrao_metalico.html?aba=painel'};
    if(n&&n.referencia_tabela==='datajud')return {titulo:'Andamento do processo',tela:'monitoramento_multi_oab.html?andamentos=1'};
    if(n&&n.referencia_tabela==='acessos_pedido')return {titulo:'Pedido de entrada',tela:'ponto_eletronico_padrao_metalico.html?aba=acessos'};
    if(n&&n.referencia_tabela==='acessos')return {titulo:'Entrada no sistema',tela:'ponto_eletronico_padrao_metalico.html?aba=acessos'};
    if(n&&n.referencia_tabela==='pagamentos')return {titulo:'Parcela vencida',tela:'financeiro.html?aba=parcelas'};
    if(n&&n.referencia_tabela==='armazenamento')return {titulo:'Armazenamento',tela:'configuracoes_padrao_metalico.html?aba=armazenamento'};
    if(n&&n.referencia_tabela==='pedidos_claude')return {titulo:'Pedidos do Claude',tela:'pedidos_claude.html'};
    var t=TIPOS_NOTIF[n.tipo];
    if(t)return t;
    if(n.referencia_tabela==='tarefas')return {titulo:'Tarefa',tela:'minhas_tarefas.html'};
    return {titulo:'Aviso'};
  }
  // Sino agrupado: uma linha por tipo (Chat, Tarefas, Agenda, Mencoes, Outros), so com o que nao foi lido.
  // Clicar abre o lugar (o item exato quando ha um so) e tira o grupo do sino; o botao OK so dispensa.
  var GRUPOS_NOTIF=[
    {chave:'chat',titulo:'Chat',tipos:['chat_mensagem'],tela:'chat_interno_padrao_metalico.html',um:'mensagem nova',varios:'mensagens novas',cor:'#e5484d'},
    {chave:'tarefas',titulo:'Tarefas',tipos:['tarefa_prazo','tarefa_repasse','tarefa_hoje','tarefa_atrasada'],tela:'minhas_tarefas.html',um:'aviso de tarefa',varios:'avisos de tarefas',cor:'#f59e0b'},
    {chave:'agenda',titulo:'Agenda',tipos:['compromisso_hoje','agenda_atribuida','agenda_solicitacao','agenda_resposta'],tela:'calendario_padrao_metalico.html',um:'aviso da agenda',varios:'avisos da agenda',cor:'#3b82f6'},
    {chave:'mencao',titulo:'Menções',tipos:['mencao'],tela:null,um:'menção em comentário',varios:'menções em comentários',cor:'#8b5cf6'},
    {chave:'intimacoes',titulo:'Intimações',tipos:['movimentacao_cnj'],tela:'monitoramento_multi_oab.html',um:'intimação nova',varios:'intimações novas',cor:'#14b8a6'},
    {chave:'marketing',titulo:'Marketing',tipos:['aprovacao'],tela:'marketing_campanhas_padrao_metalico.html?aba=materiais',um:'aviso do marketing',varios:'avisos do marketing',cor:'#f97316'},
    {chave:'captacao',titulo:'Captação',tipos:['distribuicao','retorno_captacao','acompanhamento'],tela:'lista_processos_padrao_metalico.html?fase=captacao',um:'aviso de fichas',varios:'avisos de fichas',cor:'#14b8a6'},
    {chave:'parados',titulo:'Processos parados e retornos',tipos:['processo_parado','nao_protocolado','retorno_juridico','resumo_semanal'],tela:'lista_processos_padrao_metalico.html?fase=juridico',um:'processo parado',varios:'processos parados',cor:'#d6452d'},
    {chave:'teses',titulo:'Teses e radar',tipos:['tese_atualizacao','radar_novo'],tela:'teses.html',um:'aviso de teses e radar',varios:'avisos de teses e radar',cor:'#0ea5e9'},
    {chave:'notas',titulo:'Notas',tipos:['nota_compartilhada'],tela:'notas.html',um:'nota compartilhada',varios:'notas compartilhadas',cor:'#eab308'},
    {chave:'seguranca',titulo:'Segurança',tipos:['seguranca'],tela:null,um:'alerta de segurança',varios:'alertas de segurança',cor:'#e5484d'},
    {chave:'buscas',titulo:'Pedidos de busca',tipos:[],tela:'pedidos_busca.html',um:'aviso de busca',varios:'avisos de busca',cor:'#0ea5e9'},
    {chave:'ponto',titulo:'Ponto',tipos:[],tela:'ponto_eletronico_padrao_metalico.html',um:'aviso do ponto',varios:'avisos do ponto',cor:'#d97706'},
    {chave:'sugestoes',titulo:'Sugestões de melhoria',tipos:[],tela:'sugestoes.html',um:'aviso de sugestão',varios:'avisos de sugestões',cor:'#c9a84c'},
    {chave:'andamentos',titulo:'Andamentos do CNJ',tipos:[],tela:'monitoramento_multi_oab.html?andamentos=1',um:'andamento novo',varios:'andamentos novos',cor:'#0891b2'},
    {chave:'acessos_pedido',titulo:'Pedidos de entrada',tipos:[],tela:'ponto_eletronico_padrao_metalico.html?aba=acessos',um:'pedido de entrada',varios:'pedidos de entrada',cor:'#e5484d'},
    {chave:'acessos',titulo:'Entradas no sistema',tipos:[],tela:'ponto_eletronico_padrao_metalico.html?aba=acessos',um:'entrada no sistema',varios:'entradas no sistema',cor:'#6366f1'},
    {chave:'pagamentos',titulo:'Pagamentos',tipos:[],tela:'financeiro.html?aba=parcelas',um:'parcela vencida',varios:'parcelas vencidas',cor:'#2fae7a'},
    {chave:'armazenamento',titulo:'Armazenamento',tipos:[],tela:'configuracoes_padrao_metalico.html?aba=armazenamento',um:'aviso de espaço',varios:'avisos de espaço',cor:'#0ea5e9'},
    {chave:'pedidos_claude',titulo:'Pedidos do Claude',tipos:[],tela:'pedidos_claude.html',um:'aviso de pedido do Claude',varios:'avisos de pedidos do Claude',cor:'#c9a84c'},
    {chave:'outros',titulo:'Outros avisos',tipos:null,tela:null,um:'aviso',varios:'avisos',cor:'#64748b'}
  ];
  // Pedidos de busca (bloco 140) chegam com o tipo 'outro' e a referência 'pedidos_busca': têm grupo próprio no sino
  function grupoDe(n){
    if(n&&n.referencia_tabela==='pedidos_busca'){for(var i=0;i<GRUPOS_NOTIF.length;i++){if(GRUPOS_NOTIF[i].chave==='buscas')return GRUPOS_NOTIF[i];}}
    // Sugestões de melhoria (bloco 145): tipo 'outro' com a referência 'sugestoes', grupo próprio no sino
    // Lembrete da saída do ponto (bloco 146): tipo 'outro' com a referência 'ponto'
    if(n&&(n.referencia_tabela==='ponto'||n.referencia_tabela==='ponto_home_office')){for(var q=0;q<GRUPOS_NOTIF.length;q++){if(GRUPOS_NOTIF[q].chave==='ponto')return GRUPOS_NOTIF[q];}}
    if(n&&n.referencia_tabela==='sugestoes'){for(var k=0;k<GRUPOS_NOTIF.length;k++){if(GRUPOS_NOTIF[k].chave==='sugestoes')return GRUPOS_NOTIF[k];}}
    // Robô do Meta (bloco 150): tipo 'outro' com a referência 'meta_anuncios', vai para o grupo do Marketing
    if(n&&n.referencia_tabela==='meta_anuncios'){for(var mk=0;mk<GRUPOS_NOTIF.length;mk++){if(GRUPOS_NOTIF[mk].chave==='marketing')return GRUPOS_NOTIF[mk];}}
    // Andamentos do CNJ (bloco 152): tipo 'outro' com a referência 'datajud', grupo próprio no sino
    if(n&&n.referencia_tabela==='datajud'){for(var dj=0;dj<GRUPOS_NOTIF.length;dj++){if(GRUPOS_NOTIF[dj].chave==='andamentos')return GRUPOS_NOTIF[dj];}}
    // Entradas no sistema (bloco 157, T150): 1ª entrada do dia de cada colaborador, só para o administrador geral
    if(n&&n.referencia_tabela==='acessos'){for(var ac=0;ac<GRUPOS_NOTIF.length;ac++){if(GRUPOS_NOTIF[ac].chave==='acessos')return GRUPOS_NOTIF[ac];}}
    // Pedido de entrada por internet não autorizada (bloco 181, T165): grupo próprio, abre a janela de decisão
    if(n&&n.referencia_tabela==='acessos_pedido'){for(var ap=0;ap<GRUPOS_NOTIF.length;ap++){if(GRUPOS_NOTIF[ap].chave==='acessos_pedido')return GRUPOS_NOTIF[ap];}}
    // Parcela vencida e não paga (bloco 167, T159): tipo 'outro' com a referência 'pagamentos', grupo próprio no sino
    if(n&&n.referencia_tabela==='pagamentos'){for(var pg=0;pg<GRUPOS_NOTIF.length;pg++){if(GRUPOS_NOTIF[pg].chave==='pagamentos')return GRUPOS_NOTIF[pg];}}
    // Espaço do banco ou dos arquivos acima do limite (bloco 177, T163): grupo próprio no sino
    if(n&&n.referencia_tabela==='armazenamento'){for(var am=0;am<GRUPOS_NOTIF.length;am++){if(GRUPOS_NOTIF[am].chave==='armazenamento')return GRUPOS_NOTIF[am];}}
    // Pedido do Claude esperando há mais de 3 dias (bloco 186, T166): grupo próprio no sino
    if(n&&n.referencia_tabela==='pedidos_claude'){for(var pc=0;pc<GRUPOS_NOTIF.length;pc++){if(GRUPOS_NOTIF[pc].chave==='pedidos_claude')return GRUPOS_NOTIF[pc];}}
    return grupoDoTipo(n&&n.tipo);
  }
  function grupoDoTipo(tipo){
    for(var i=0;i<GRUPOS_NOTIF.length-1;i++){if(GRUPOS_NOTIF[i].tipos.indexOf(tipo)!==-1)return GRUPOS_NOTIF[i];}
    return GRUPOS_NOTIF[GRUPOS_NOTIF.length-1];
  }
  // Avisos que a pessoa desligou nas Configuracoes nao entram no sino
  var _avisosDesligados=[];
  // Logo do escritorio (Configuracoes > Escritorio) no lugar do escudo e do nome na barra do alto
  function aplicarMarca(logo,nome){
    try{if(logo)localStorage.setItem('saga-logo',logo);else localStorage.removeItem('saga-logo');if(nome)localStorage.setItem('saga-escritorio',nome);}catch(e){}
    var br=document.querySelector('#topbarSaga .brand');if(!br)return;
    var img=br.querySelector('.brand-logo');
    if(logo){
      if(!img){img=document.createElement('img');img.className='brand-logo';br.appendChild(img);}
      img.alt=nome||'Logo do escritório';if(img.getAttribute('src')!==logo)img.src=logo;
      br.classList.add('com-logo');
    }else{if(img)img.remove();br.classList.remove('com-logo');}
  }
  async function carregarMarca(){
    if(!global._sb)return;
    try{var r=await global._sb.rpc('escritorio_publico');if(!r.error&&r.data)aplicarMarca(r.data.logo||null,r.data.nome||'');}catch(e){}
  }
  // Troca só o texto das iniciais; mexer em textContent apagaria a foto (e ela reapareceria piscando)
  function definirIniciaisAvatar(av,ini){
    var no=null;for(var i=0;i<av.childNodes.length;i++){if(av.childNodes[i].nodeType===3){no=av.childNodes[i];break;}}
    if(no){if(no.nodeValue!==ini)no.nodeValue=ini;}else av.insertBefore(document.createTextNode(ini),av.firstChild);
  }
  function mostrarFotoAvatar(url){
    var av=document.getElementById('avatarTop');if(!av)return;
    try{if(url)localStorage.setItem('saga-foto',url);else localStorage.removeItem('saga-foto');}catch(e){}
    var img=av.querySelector('img');
    if(url){
      if(!img){img=document.createElement('img');img.alt='';img.decoding='async';av.appendChild(img);}
      // só troca o endereço se mudou: reatribuir o mesmo endereço recarrega a imagem e ela pisca
      if(img.getAttribute('src')!==url)img.src=url;
    }
    else if(img)img.remove();
  }
  // Fotos da equipe em toda a tela: qualquer bolinha com data-saga-nome (ou data-saga-usuario)
  // mostra a foto da pessoa, se ela tiver; sem foto continuam as iniciais.
  var _fotosPorId={},_fotosPorNome={},_fotosAgendado=false;
  function normalizarNome(n){return String(n||'').trim().toLowerCase();}
  function guardarFotos(lista){
    _fotosPorId={};_fotosPorNome={};
    lista.forEach(function(u){if(u.f){_fotosPorId[u.i]=u.f;_fotosPorNome[normalizarNome(u.n)]=u.f;}});
  }
  try{guardarFotos(JSON.parse(localStorage.getItem('saga-fotos-equipe')||'[]'));}catch(e){}
  function aplicarFotos(){
    _fotosAgendado=false;
    document.querySelectorAll('[data-saga-usuario],[data-saga-nome]').forEach(function(el){
      var url=_fotosPorId[el.getAttribute('data-saga-usuario')]||_fotosPorNome[normalizarNome(el.getAttribute('data-saga-nome'))]||'';
      if((el.dataset.sagaFoto||'')===url)return;
      el.dataset.sagaFoto=url;
      if(url){
        el.style.setProperty('background-image','url('+JSON.stringify(url)+')','important');
        el.style.setProperty('background-size','cover','important');
        el.style.setProperty('background-position','center','important');
        el.style.setProperty('color','transparent','important');
      }else{
        ['background-image','background-size','background-position','color'].forEach(function(k){el.style.removeProperty(k);});
      }
    });
  }
  function agendarFotos(){if(_fotosAgendado)return;_fotosAgendado=true;requestAnimationFrame(aplicarFotos);}
  if(window.MutationObserver){
    new MutationObserver(agendarFotos).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-saga-nome','data-saga-usuario']});
  }
  async function carregarFotosEquipe(){
    if(!global._sb)return;
    try{
      var r=await global._sb.from('usuarios').select('id,nome_completo,foto_url');
      if(r.error||!r.data)return;
      var lista=r.data.map(function(u){return {i:u.id,n:u.nome_completo,f:u.foto_url||''};});
      guardarFotos(lista);
      try{localStorage.setItem('saga-fotos-equipe',JSON.stringify(lista.filter(function(u){return u.f;})));}catch(e){}
      agendarFotos();
    }catch(e){}
  }
  function agruparNotif(lista){
    var mapa={};
    lista.forEach(function(n){var g=grupoDe(n);if(_avisosDesligados.indexOf(g.chave)>=0)return;(mapa[g.chave]=mapa[g.chave]||{grupo:g,itens:[]}).itens.push(n);});
    return GRUPOS_NOTIF.filter(function(g){return mapa[g.chave];}).map(function(g){return mapa[g.chave];});
  }
  async function marcarLidas(ids){
    if(!ids.length)return;
    try{await global._sb.from('notificacoes').update({lida:true}).in('id',ids);}catch(e){}
  }
  async function abrirGrupoNotif(g){
    var ids=g.itens.map(function(n){return n.id;});
    // pedidos de entrada: a janela de decisão (o aviso some quando o pedido é decidido)
    if(g.grupo.chave==='acessos_pedido'){var vistos={};abrirPedidosEntrada(g.itens.map(function(n){return n.referencia_id;}).filter(function(x){if(!x||vistos[x])return false;vistos[x]=1;return true;}));return;}
    // Um item so (ou todos do mesmo item): vai direto nele
    var refs={};g.itens.forEach(function(n){refs[n.referencia_id||n.id]=1;});
    if(Object.keys(refs).length===1){await abrirNotificacao(g.itens[0],ids);return;}
    await marcarLidas(ids);
    if(g.grupo.tela)global.sagaIrPara(g.grupo.tela);
    else carregarNotificacoes();
  }

  async function abrirNotificacao(n,idsParaMarcar){
    if(n&&n.referencia_tabela==='acessos_pedido'){abrirPedidosEntrada([n.referencia_id]);return;}
    await marcarLidas(idsParaMarcar||(n.lida?[]:[n.id]));
    if(n.tipo==='distribuicao'){global.sagaIrPara('lista_processos_padrao_metalico.html?fase=captacao');return;}
    if(n.referencia_tabela==='pedidos_busca'){
      try{
        var pb=n.referencia_id?await global._sb.from('pedidos_busca').select('id,pessoa_id,situacao,pedido_por_id').eq('id',n.referencia_id).maybeSingle():null;
        if(pb&&pb.data){
          var meu=_perfilAtual&&pb.data.pedido_por_id===_perfilAtual.id;
          if(meu&&(pb.data.situacao==='pronto'||pb.data.situacao==='nao_encontrado'))global.sagaIrPara('ficha_cliente_padrao_metalico_FINAL.html?pessoa_id='+encodeURIComponent(pb.data.pessoa_id)+'&aba=localizacao&pedido_busca='+encodeURIComponent(pb.data.id));
          else global.sagaIrPara('pedidos_busca.html?pedido='+encodeURIComponent(pb.data.id));
          return;
        }
      }catch(e){}
      global.sagaIrPara('pedidos_busca.html');return;
    }
    if(n.referencia_tabela==='ponto'){global.sagaIrPara('ponto_eletronico_padrao_metalico.html');return;}
    if(n.referencia_tabela==='ponto_home_office'){global.sagaIrPara('ponto_eletronico_padrao_metalico.html?aba=equipe');return;}
    if(n.referencia_tabela==='acessos'){global.sagaIrPara('ponto_eletronico_padrao_metalico.html?aba=acessos');return;}
    if(n.referencia_tabela==='armazenamento'){global.sagaIrPara('configuracoes_padrao_metalico.html?aba=armazenamento');return;}
    if(n.referencia_tabela==='pedidos_claude'){global.sagaIrPara('pedidos_claude.html');return;}
    if(n.referencia_tabela==='meta_anuncios'){global.sagaIrPara('marketing_campanhas_padrao_metalico.html?aba=painel');return;}
    // parcela vencida (bloco 167): abre a ficha do cliente no bloco Pagamentos; sem achar a parcela, a aba Parcelas do Financeiro
    if(n.referencia_tabela==='pagamentos'){
      try{
        var pq=n.referencia_id?await global._sb.from('pagamentos_parcelas').select('id,acordo_id').eq('id',n.referencia_id).maybeSingle():null;
        var pa=pq&&pq.data&&pq.data.acordo_id?await global._sb.from('pagamentos_acordos').select('id,pessoa_id').eq('id',pq.data.acordo_id).maybeSingle():null;
        if(pa&&pa.data&&pa.data.pessoa_id){global.sagaIrPara('ficha_cliente_padrao_metalico_FINAL.html?pessoa_id='+encodeURIComponent(pa.data.pessoa_id)+'&foco=pagamentos');return;}
      }catch(e){}
      global.sagaIrPara('financeiro.html?aba=parcelas');return;
    }
    // andamento novo: abre a ficha no processo, já no quadro dos andamentos; aviso do robô (sem processo): a janela dos andamentos
    if(n.referencia_tabela==='datajud'){global.sagaIrPara(n.referencia_id?'ficha_cliente_padrao_metalico_FINAL.html?processo_id='+encodeURIComponent(n.referencia_id)+'&foco=andamentos':'monitoramento_multi_oab.html?andamentos=1');return;}
    if(n.referencia_tabela==='sugestoes'){global.sagaIrPara('sugestoes.html'+(n.referencia_id?'?id='+encodeURIComponent(n.referencia_id):''));return;}
    // Leva direto ao item: tarefa aberta, compromisso no dia, conversa do chat, comentarios do processo
    try{
      var d=await global._sb.rpc('destino_notificacao',{p_id:n.id});
      if(d.data&&d.data.tela){
        var p=new URLSearchParams();
        Object.keys(d.data).forEach(function(k){if(k!=='tela'&&d.data[k])p.set(k,d.data[k]);});
        global.sagaIrPara(d.data.tela+'?'+p.toString());
        return;
      }
    }catch(e){}
    var tela=infoNotif(n).tela;
    if(tela)global.sagaIrPara(tela);
    else contarNaoLidas();
  }

  async function carregarNotificacoes(){
    if(!global._sb||!_perfilAtual)return;
    var pop=document.getElementById('notifPop');
    if(!pop)return;
    pop.innerHTML='<div class="pop-title">Notificações</div><div style="font-size:10.5px;color:var(--muted);padding:12px;text-align:center">Carregando...</div>';
    try{
      var r=await global._sb.from('notificacoes').select('id,tipo,resumo,referencia_tabela,referencia_id,lida,criado_em').eq('usuario_id',_perfilAtual.id).eq('lida',false).order('criado_em',{ascending:false}).limit(300);
      if(r.error)throw r.error;
      var grupos=agruparNotif(r.data||[]);
      atualizarBadgeNotif(grupos.length);
      var cabecalho='<div class="pop-title" style="display:flex;justify-content:space-between;align-items:center"><span>Notificações</span>'+(grupos.length?'<button type="button" id="btnMarcarTodasLidas" style="background:none;border:none;color:var(--gold);font-size:10px;cursor:pointer">Dispensar todas</button>':'')+'</div>';
      if(!grupos.length){pop.innerHTML=cabecalho+'<div style="font-size:11px;color:var(--muted);padding:16px;text-align:center">Nenhuma notificação nova.</div>';return;}
      pop.innerHTML=cabecalho+grupos.map(function(g,i){
        var q=g.itens.length,ult=g.itens[0];
        return '<div class="notification-item notif-grupo" data-grupo="'+i+'" style="cursor:pointer;align-items:center">'
          +'<span class="notif-grupo-qtd" style="--cor-grupo:'+g.grupo.cor+'">'+(q>99?'99+':q)+'</span>'
          +'<div class="notification-text" style="flex:1;min-width:0"><div style="font-weight:500">'+esc(g.grupo.titulo)+' <span style="font-weight:400;color:var(--muted)">· '+q+' '+esc(q===1?g.grupo.um:g.grupo.varios)+'</span></div>'
          +'<div style="color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ult.resumo||'')+'</div>'
          +'<div class="notification-time">'+formatarDataRel(ult.criado_em)+'</div></div>'
          +'<button type="button" class="notif-ok" data-ok="'+i+'" title="Dispensar estes avisos">OK</button></div>';
      }).join('');
      pop.querySelectorAll('[data-grupo]').forEach(function(el){
        el.addEventListener('click',function(ev){ev.stopPropagation();abrirGrupoNotif(grupos[+el.getAttribute('data-grupo')]);});
      });
      pop.querySelectorAll('[data-ok]').forEach(function(el){
        el.addEventListener('click',async function(ev){
          ev.stopPropagation();
          el.disabled=true;
          await marcarLidas(grupos[+el.getAttribute('data-ok')].itens.map(function(n){return n.id;}));
          carregarNotificacoes();
        });
      });
      var btnMarcar=document.getElementById('btnMarcarTodasLidas');
      if(btnMarcar)btnMarcar.addEventListener('click',function(ev){ev.stopPropagation();marcarTodasComoLidas();});
    }catch(e){
      pop.innerHTML='<div class="pop-title">Notificações</div><div style="font-size:10.5px;color:#e08383;padding:12px;text-align:center">Erro ao carregar.</div>';
    }
  }

  // Numero do sino = quantos tipos (grupos) tem novidade
  async function contarNaoLidas(){
    if(!global._sb||!_perfilAtual)return;
    try{
      var r=await global._sb.from('notificacoes').select('tipo,referencia_tabela').eq('usuario_id',_perfilAtual.id).eq('lida',false).limit(1000);
      if(r.error)return;
      var g={};(r.data||[]).forEach(function(n){var k=grupoDe(n).chave;if(_avisosDesligados.indexOf(k)<0)g[k]=1;});
      atualizarBadgeNotif(Object.keys(g).length);
    }catch(e){}
  }

  function atualizarBadgeNotif(n){
    var b=document.getElementById('notifCount');
    if(!b)return;
    if(n>0){b.textContent=n>99?'99+':String(n);b.style.display='';}
    else b.style.display='none';
    guardarNumerosMoldura();
  }

  async function marcarTodasComoLidas(){
    if(!global._sb||!_perfilAtual)return;
    try{
      await global._sb.from('notificacoes').update({lida:true}).eq('usuario_id',_perfilAtual.id).eq('lida',false);
      carregarNotificacoes();
    }catch(e){}
  }

  var _buscaAtual=0;
  function ligarBuscaGlobal(){
    var input=document.getElementById('globalSearch');
    if(!input||input.dataset.ligado)return;
    input.dataset.ligado='true';
    ligarBuscaCelular(input);
    var t=null;
    // Procura desde a primeira letra digitada
    input.addEventListener('input',function(){
      clearTimeout(t);
      var termo=input.value.trim();
      var pop=document.getElementById('globalSearchPop');
      if(!termo){_buscaAtual++;if(pop){pop.classList.remove('open');pop.innerHTML='';}return;}
      t=setTimeout(function(){executarBuscaGlobal(termo);},180);
    });
    input.addEventListener('focus',function(){
      var pop=document.getElementById('globalSearchPop');
      if(pop&&input.value.trim()&&pop.innerHTML)pop.classList.add('open');
    });
    input.addEventListener('keydown',function(e){
      var pop=document.getElementById('globalSearchPop');
      if(e.key==='Escape'&&pop){pop.classList.remove('open');input.blur();}
      if(e.key==='Enter'&&pop){var primeiro=pop.querySelector('.pop-row[onclick]');if(primeiro){e.preventDefault();primeiro.click();}}
    });
  }

  // Celular: a lupa abre a busca ocupando a barra de cima; o X, o Esc ou escolher um resultado fecha.
  function ligarBuscaCelular(input){
    var btn=document.getElementById('buscaCelBtn'),fechar=document.getElementById('buscaCelFechar'),barra=document.getElementById('topbarSaga');
    if(!btn||!barra)return;
    var semMov=function(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}};
    var curva='cubic-bezier(.22,.78,.25,1)';
    function abrir(){
      if(barra.classList.contains('busca-cel'))return;
      barra.classList.add('busca-cel');
      var caixa=barra.querySelector('.top-center');
      if(caixa&&caixa.animate&&!semMov())caixa.animate([{opacity:0,transform:'translateX(18px)'},{opacity:1,transform:'none'}],{duration:260,easing:curva});
      input.focus();
    }
    function fecharBusca(){
      if(!barra.classList.contains('busca-cel'))return;
      var pop=document.getElementById('globalSearchPop');if(pop)pop.classList.remove('open');
      var caixa=barra.querySelector('.top-center');
      var fim=function(){barra.classList.remove('busca-cel');input.value='';input.blur();};
      if(caixa&&caixa.animate&&!semMov()){var an=caixa.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateX(18px)'}],{duration:200,easing:curva});an.onfinish=fim;}
      else fim();
    }
    btn.addEventListener('click',abrir);
    if(fechar)fechar.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();fecharBusca();});
    input.addEventListener('keydown',function(e){if(e.key==='Escape')fecharBusca();});
    // escolher um resultado leva para outra tela; fecha a busca para não voltar aberta pelo botão voltar
    document.addEventListener('click',function(e){var pop=document.getElementById('globalSearchPop');if(pop&&pop.contains(e.target)&&e.target.closest('.pop-row'))setTimeout(fecharBusca,0);});
    window.addEventListener('resize',function(){if(window.innerWidth>760)barra.classList.remove('busca-cel');});
  }

  async function executarBuscaGlobal(termo){
    if(!global._sb)return;
    var pop=document.getElementById('globalSearchPop');
    if(!pop)return;
    var minhaBusca=++_buscaAtual;
    if(!pop.classList.contains('open')||!pop.innerHTML){
      pop.innerHTML='<div style="padding:12px;font-size:10.5px;color:var(--muted);text-align:center">Buscando...</div>';
      pop.classList.add('open');
    }
    try{
      // Virgula e parenteses atrapalham o filtro do banco
      var limpo=termo.replace(/[,()%*\\]/g,' ').trim();
      if(!limpo){pop.classList.remove('open');return;}
      var like='%'+limpo+'%';
      var termoDigitos=termo.replace(/\D/g,'');
      var promessas=[
        function(){return global._sb.from('pessoas').select('id,nome_completo,cpf').or('nome_completo.ilike.'+like+(termoDigitos?',cpf.ilike.%'+termoDigitos+'%':'')).order('nome_completo').limit(50);},
        function(){return global._sb.from('processos').select('id,numero_processo_cnj,pessoa:pessoas!pessoa_id(nome_completo)').or('numero_processo_cnj.ilike.'+like).eq('excluido_logico',false).limit(10);},
        function(){return global._sb.from('usuarios').select('id,nome_completo,email').or('nome_completo.ilike.'+like+',email.ilike.'+like).eq('ativo',true).limit(5);}
      ];
      // Banco (bloco 83): sem acento ("Graca" acha "Graça") e, com 1-2 letras, pelo começo de cada palavra; se faltar, usa a busca antiga
      var pessoas,processos,colaboradores,contatos=[];
      var rb=await global._sb.rpc('busca_global',{p_termo:termo});
      if(minhaBusca!==_buscaAtual)return;
      if(!rb.error&&rb.data){
        pessoas=rb.data.pessoas||[];processos=rb.data.processos||[];colaboradores=rb.data.usuarios||[];contatos=rb.data.contatos||[];
      }else{
        var res=await Promise.all(promessas.map(function(f){return f();}));
        if(minhaBusca!==_buscaAtual)return;
        pessoas=(res[0].data||[]);processos=(res[1].data||[]);colaboradores=(res[2].data||[]);
      }
      var html='';
      // (10/11, bloco 145) telefone, e-mail ou endereço achado nos contatos, na Localização, no histórico ou nos comentários
      if(contatos.length){
        var corDe={dados:'var(--gold)',localizacao:'#2fae7a',comentarios:'#4b8af5'};
        html+='<div class="pop-title">Achado em contatos e anotações</div>';
        html+=contatos.map(function(c){
          var url='ficha_cliente_padrao_metalico_FINAL.html?'+(c.aba==='comentarios'&&c.processo_id?'processo_id='+encodeURIComponent(c.processo_id):'pessoa_id='+encodeURIComponent(c.pessoa_id)+(c.aba==='localizacao'?'&aba=localizacao':''));
          return '<div class="pop-row" onclick="sagaIrPara(\''+esc(url)+'\')" title="'+esc((c.onde||'')+': '+(c.valor||''))+'"><span class="online-dot" style="background:'+(corDe[c.aba]||'var(--gold)')+'"></span><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600">'+esc(c.nome_completo||'Cliente')+'</div><div style="font-size:9px;color:var(--muted)">'+esc(c.onde||'')+'</div>'+(c.valor?'<div style="font-size:9.5px;color:var(--text);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(c.valor)+'</div>':'')+'</div></div>';
        }).join('');
      }
      if(pessoas.length){
        html+='<div class="pop-title">Pessoas</div>';
        html+=pessoas.map(function(p){return '<div class="pop-row" onclick="sagaIrPara(\'ficha_cliente_padrao_metalico_FINAL.html?pessoa_id='+esc(p.id)+'\')"><span class="online-dot" style="background:var(--gold)"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(p.nome_completo)+'</div><div style="font-size:9px;color:var(--muted)">'+(p.cpf?(String(p.cpf).replace(/\D/g,'').length===14?'CNPJ ':'CPF ')+esc(global.sagaFmt.cpf(p.cpf)):'Sem CPF')+'</div></div></div>';}).join('');
      }
      if(processos.length){
        html+='<div class="pop-title">Processos</div>';
        html+=processos.map(function(pr){var pn=pr.pessoa&&pr.pessoa.nome_completo?pr.pessoa.nome_completo:'Sem cliente';return '<div class="pop-row" onclick="sagaIrPara(\'ficha_cliente_padrao_metalico_FINAL.html?processo_id='+esc(pr.id)+'\')"><span class="online-dot" style="background:var(--gold)"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(pn)+'</div><div style="font-size:9px;color:var(--muted)">'+(pr.numero_processo_cnj?esc(global.sagaFmt.cnj(pr.numero_processo_cnj)):'Sem número do processo')+'</div></div></div>';}).join('');
      }
      if(colaboradores.length){
        html+='<div class="pop-title">Colaboradores</div>';
        html+=colaboradores.map(function(u){return '<div class="pop-row" onclick="sagaIrPara(\'gestao_colaboradores_padrao_metalico.html\')"><span class="online-dot" style="background:var(--gold)"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(u.nome_completo)+'</div><div style="font-size:9px;color:var(--muted)">'+esc(u.email||'')+'</div></div></div>';}).join('');
      }
      if(!html)html='<div style="padding:14px;font-size:10.5px;color:var(--muted);text-align:center">Nenhum resultado.<div style="margin-top:6px;font-size:9.5px;line-height:1.4">Dá para buscar pelo nome, CPF, número do processo, telefone (com ou sem DDD), e-mail ou CEP. Para endereço, comece com rua, av., quadra...</div></div>';
      pop.innerHTML=html;
    }catch(e){
      if(minhaBusca!==_buscaAtual)return;
      pop.innerHTML='<div style="padding:14px;font-size:10.5px;color:#e08383;text-align:center">Erro na busca.</div>';
    }
  }

  // ===== Controle de acesso por horario e local (T29) =====
  // O banco decide (acesso_verificar) e registra cada verificacao. A localizacao so e pedida
  // quando a regra exige; o administrador nunca e bloqueado. Revalida a cada 30 minutos.
  var CHAVE_ACESSO='saga-acesso',VALIDADE_ACESSO_MS=30*60000,_acessoVerificando=null;
  function lerLocalizacao(){
    return new Promise(function(ok){
      if(!navigator.geolocation)return ok(null);
      navigator.geolocation.getCurrentPosition(function(p){ok({lat:p.coords.latitude,lng:p.coords.longitude,precisao:p.coords.accuracy});},
        function(){ok(null);},{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
    });
  }
  async function consultarAcesso(loc){
    var r=await global._sb.rpc('acesso_verificar',{p_lat:loc?loc.lat:null,p_lng:loc?loc.lng:null,p_precisao:loc?loc.precisao:null,p_navegador:(navigator.userAgent||'').slice(0,200)});
    if(r.error)throw r.error;
    return r.data||{};
  }
  async function verificarAcesso(forcar){
    if(!global._sb)return true;
    var uid=idSessaoLocal(),guardado=null;
    try{guardado=JSON.parse(sessionStorage.getItem(CHAVE_ACESSO)||'null');}catch(e){}
    if(!forcar&&guardado&&guardado.uid===uid&&guardado.ate>Date.now())return true;
    if(_acessoVerificando)return _acessoVerificando;
    _acessoVerificando=(async function(){
      try{
        var d=await consultarAcesso(null);
        if(!d.ok&&d.motivo==='sem localização'){var loc=await lerLocalizacao();d=await consultarAcesso(loc);}
        if(d.ok){try{sessionStorage.setItem(CHAVE_ACESSO,JSON.stringify({uid:uid,ate:Date.now()+VALIDADE_ACESSO_MS}));}catch(e){}return true;}
        try{sessionStorage.setItem('saga-acesso-msg',d.mensagem||'Acesso não permitido agora.');}catch(e){}
        await global.sagaLogout('acesso');
        return false;
      }catch(e){
        // Falha de rede: nao tranca quem ja estava dentro; tenta de novo na proxima verificacao
        return true;
      }finally{_acessoVerificando=null;}
    })();
    return _acessoVerificando;
  }

  // ===== Entrada no sistema (bloco 157, T150) =====
  // Grava cada login (senha ou Google: a tela de login deixa 'saga-login-agora' na aba) e a 1ª abertura do dia
  // neste navegador. O banco põe a hora do servidor e o IP e avisa o administrador geral na 1ª entrada do dia.
  function registrarEntrada(){
    if(!global._sb)return;
    var ev=null,uid=idSessaoLocal()||'',hoje=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Maceio'}),chave=uid+'|'+hoje;
    try{ev=sessionStorage.getItem('saga-login-agora');}catch(e){}
    var jaHoje=false;try{jaHoje=localStorage.getItem('saga-entrada-dia')===chave;}catch(e){}
    if(!ev&&jaHoje)return;
    try{sessionStorage.removeItem('saga-login-agora');}catch(e){}
    global._sb.rpc('acesso_entrada',{p_evento:ev==='senha'||ev==='google'?ev:'abriu',p_navegador:(navigator.userAgent||'').slice(0,300),p_aparelho:global.sagaAparelhoCodigo()}).then(function(r){
      if(!r.error){try{localStorage.setItem('saga-entrada-dia',chave);}catch(e){}}
    },function(){});
  }

  // 12/11 (T162): código deste computador/navegador (aleatório, sem dado pessoal), criado na 1ª vez e guardado nele.
  // Vai na entrada no sistema e na batida do ponto; o administrador autoriza o computador em Ponto > Acessos.
  global.sagaAparelhoCodigo=function(){
    try{var c=localStorage.getItem('saga-aparelho');if(c&&/^[A-Za-z0-9-]{20,64}$/.test(c))return c;
      var b=new Uint8Array(16);(global.crypto||global.msCrypto).getRandomValues(b);
      c='ap-'+Array.prototype.map.call(b,function(x){return ('0'+x.toString(16)).slice(-2);}).join('');
      localStorage.setItem('saga-aparelho',c);return c;}catch(e){return null;}
  };
  global.sagaLogout=async function(motivo){
    if(!global._sb)return;
    try{if(_canalPresenca)await _canalPresenca.untrack();}catch(e){}
    try{await global._sb.auth.signOut();}catch(e){}
    try{localStorage.removeItem(CHAVE_ATIVIDADE);}catch(e){}
    try{localStorage.removeItem('saga-permissoes');sessionStorage.removeItem(CHAVE_ACESSO);}catch(e){}
    window.location.href='login_padrao_metalico.html'+(motivo==='inatividade'||motivo==='desligado'||motivo==='acesso'||motivo==='fim_dia'||motivo==='inatividade_fora'?'?motivo='+motivo:'');
  };


  // Modo privacidade (para gravar tela): oculta parte do CPF, do nome do cliente, do numero do processo e os valores.
  // Por padrao fica desligado e todos veem os dados completos. A escolha fica guardada neste navegador.
  var PRIV_CHAVE='saga_privacidade';
  var PRIV_NOMES='.nome-cliente,.cartao-nome,.card-nome,.pessoa-selecionada-nome,.ficha-titulo h1,.cli,.client-picker-row b,.client-picker-row strong,.item-mencao span,[data-saga-nome]';
  var _privLigado=false,_privObs=null,_privTimer=null;
  function privNome(t){
    var fora={da:1,das:1,de:1,di:1,'do':1,dos:1,e:1};
    var primeiro=true;
    return t.replace(/[A-Za-zÀ-ÿ]+/g,function(p){
      if(primeiro){primeiro=false;return p;}
      if(fora[p.toLowerCase()])return '';
      return p.charAt(0)+'.';
    }).replace(/\s{2,}/g,' ');
  }
  function privTexto(t){
    return t
      .replace(/\b(\d{3})\.\d{3}\.\d{3}-(\d{2})\b/g,'$1.•••.•••-$2')
      .replace(/\b\d+?(\d{2}-\d{2}\.\d{4}\.\d\.\d{2}\.)\d{4}\b/g,'•••••$1••••')
      .replace(/R\$\s?-?[\d.]+(,\d{2})?/g,'R$ •••••');
  }
  function privAplicar(raiz){
    var w=document.createTreeWalker(raiz||document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentElement;
      if(!p||/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)||p.isContentEditable)return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    var n;
    while((n=w.nextNode())){
      if(n.__sagaMasc!==undefined&&n.data===n.__sagaMasc)continue;
      var orig=n.data;
      var m=privTexto(orig);
      if(n.parentElement.closest(PRIV_NOMES))m=privNome(m);
      if(m!==orig){n.__sagaOrig=orig;n.__sagaMasc=m;n.data=m;}
      else{n.__sagaOrig=undefined;n.__sagaMasc=undefined;}
    }
  }
  function privRestaurar(){
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
    while((n=w.nextNode())){
      if(n.__sagaMasc!==undefined&&n.data===n.__sagaMasc)n.data=n.__sagaOrig;
      n.__sagaOrig=undefined;n.__sagaMasc=undefined;
    }
  }
  function privDefinir(ligar){
    _privLigado=!!ligar;
    try{localStorage.setItem(PRIV_CHAVE,_privLigado?'1':'0');}catch(e){}
    document.documentElement.classList.toggle('saga-privado',_privLigado);
    var b=document.getElementById('privBtn');
    if(b){b.classList.toggle('ativo',_privLigado);b.title=_privLigado?'Modo privacidade ligado: clique para mostrar os dados':'Ocultar dados dos clientes (para gravar tela)';}
    if(_privLigado){
      privAplicar();
      if(!_privObs){
        _privObs=new MutationObserver(function(){clearTimeout(_privTimer);_privTimer=setTimeout(function(){if(_privLigado)privAplicar();},30);});
        _privObs.observe(document.body,{childList:true,subtree:true,characterData:true});
      }
    }else{
      if(_privObs){_privObs.disconnect();_privObs=null;}
      privRestaurar();
    }
  }
  function ligarPrivacidade(){
    if(!document.getElementById('sagaPrivEstilo')){
      var st=document.createElement('style');st.id='sagaPrivEstilo';
      st.textContent='#privBtn .olho-fechado{display:none}#privBtn.ativo .olho-aberto{display:none}#privBtn.ativo .olho-fechado{display:inline}'
        +'#topbarSaga #privBtn.ativo{background:#c0392b !important;border-color:#c0392b !important}#topbarSaga #privBtn.ativo svg [stroke]{stroke:#fff !important}'
        +'html.saga-privado input:not([type=checkbox]):not([type=radio]):not([type=search]):not(:placeholder-shown){filter:blur(5px)}html.saga-privado #topbarSaga input{filter:none}html.saga-privado input:focus{filter:none}';
      document.head.appendChild(st);
    }
    var b=document.getElementById('privBtn');
    if(b)b.addEventListener('click',function(){privDefinir(!_privLigado);});
    var salvo='0';try{salvo=localStorage.getItem(PRIV_CHAVE)||'0';}catch(e){}
    privDefinir(salvo==='1');
  }


  // Contador de mensagens nao lidas do Chat: numero no item do menu lateral
  // e numero no titulo da aba do navegador. Atualiza na hora quando chega mensagem (tempo real).
  var _chatCanal=null,_chatTimer=null,_tituloOriginal=null;
  async function contarChat(){
    if(!global._sb||!_perfilAtual)return;
    try{
      var r=await global._sb.rpc('chat_nao_lidas');
      if(r.error||!Array.isArray(r.data))return;
      var total=r.data.reduce(function(s,x){return s+(x.qtd||0);},0);
      var b=document.getElementById('navBadgeChat');
      if(b){b.textContent=total>99?'99+':String(total);b.style.display=total>0?'':'none';guardarNumerosMoldura();}
      if(_tituloOriginal===null)_tituloOriginal=document.title.replace(/^\(\d+\+?\)\s*/,'');
      document.title=(total>0?'('+(total>99?'99+':total)+') ':'')+_tituloOriginal;
      document.dispatchEvent(new CustomEvent('saga-chat-nao-lidas',{detail:{total:total,porConversa:r.data||[]}}));
    }catch(e){}
  }
  // Itens do dia no menu lateral: compromissos de hoje (Agenda) e tarefas de hoje + atrasadas (Minhas Tarefas)
  async function contarDia(){
    if(!global._sb||!_perfilAtual)return;
    try{
      var r=await global._sb.rpc('resumo_do_dia');
      if(r.error||!r.data||typeof r.data!=='object')return;
      var d=r.data;
      var ag=document.getElementById('navBadgeAgenda');
      if(ag){var c=d.compromissos_hoje||0;ag.textContent=c>99?'99+':String(c);ag.style.display=c>0?'':'none';}
      var tf=document.getElementById('navBadgeTarefas');
      if(tf){
        var hoje=d.tarefas_hoje||0,atr=d.tarefas_atrasadas||0,tot=hoje+atr;
        tf.textContent=tot>99?'99+':String(tot);tf.style.display=tot>0?'':'none';
        tf.classList.toggle('atrasada',atr>0);
        tf.title=(hoje?hoje+' para hoje':'')+(hoje&&atr?' e ':'')+(atr?atr+' atrasada'+(atr>1?'s':''):'');
      }
      var bb=document.getElementById('navBadgeBuscas');
      if(bb&&_minhasPermissoes&&_minhasPermissoes.indexOf('buscas.atender')>=0){
        var rb=await global._sb.from('pedidos_busca').select('id',{count:'exact',head:true}).eq('situacao','a_fazer');
        if(!rb.error){var nb=rb.count||0;bb.textContent=nb>99?'99+':String(nb);bb.style.display=nb>0?'':'none';bb.title=nb+' pedido(s) de busca a fazer';}
      }
      // Pedidos do Claude em aberto (bloco 186, T166): só para quem usa o SAGA no Claude
      var bp=document.getElementById('navBadgePedidosClaude');
      if(bp&&_minhasPermissoes&&_minhasPermissoes.indexOf('conector_claude.usar')>=0){
        var rp=await global._sb.rpc('pedidos_claude_contar');
        if(!rp.error){var np=rp.data||0;bp.textContent=np>99?'99+':String(np);bp.style.display=np>0?'':'none';bp.title=np+' pedido(s) do Claude em aberto';}
      }
      guardarNumerosMoldura();
    }catch(e){}
  }
  function agendarContagemChat(){clearTimeout(_chatTimer);_chatTimer=setTimeout(contarChat,400);}
  function ligarContadorChat(){
    _estiloNumerosMenu();
    contarChat();
    if(global._sb&&!_chatCanal){
      _chatCanal=global._sb.channel('saga-chat-contador')
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_mensagens'},agendarContagemChat)
        .subscribe();
    }
    document.addEventListener('visibilitychange',function(){if(!document.hidden){agendarContagemChat();contarDia();contarNaoLidas();}});
    // Avisos do dia (tarefas de hoje, atrasadas, compromissos) entram no sino uma vez por dia
    if(global._sb&&_perfilAtual)global._sb.rpc('gerar_avisos_do_dia').then(function(){contarNaoLidas();},function(){});
    contarDia();
    setInterval(function(){contarChat();contarDia();contarNaoLidas();},60000);
  }


  // Permissoes aplicadas no menu e nas telas (a mesma regra do banco: perfil + excecoes individuais).
  // Basta ter UMA das permissoes da lista para ver a tela. Telas sem lista ficam liberadas.
  var PERMS_TELA={
    processos:['processos.visualizar'],processos_juridico:['processos.visualizar'],processos_captacao:['processos.visualizar'],
    cartas:['pessoas.visualizar'],
    teses:['teses.visualizar'],
    clientes_perfil:['pessoas.visualizar','processos.visualizar'],
    agenda:['compromissos.visualizar'],
    tarefas:['tarefas.visualizar'],
    pedidos_claude:['conector_claude.usar'],
    chat:['chat.usar'],
    ponto:['ponto.bater','ponto.visualizar_proprio','ponto.visualizar_equipe'],
    colaboradores:['colaboradores.visualizar','usuarios.convidar','usuarios.gerenciar_papeis'],
    dashboard:['dashboard.visualizar'],
    biblioteca:['biblioteca.visualizar'],
    financeiro:['financeiro.visualizar'],
    precatorios:['processos.visualizar'],
    marketing:['campanhas.visualizar','materiais_marketing.visualizar','materiais_marketing.aprovar'],
    monitoramento:['movimentacoes_cnj.visualizar','movimentacoes_cnj.editar','monitoramento_oab.visualizar','monitoramento_oab.gerenciar'],
    permissoes:['permissoes.gerenciar'],
    atividades:['permissoes.gerenciar'],
    obsidian:['permissoes.gerenciar'],
    treinamentos:['treinamentos.visualizar']
  };
  var _minhasPermissoes=null;
  function podeVerTela(tela){
    var req=PERMS_TELA[tela];
    if(!req||!_minhasPermissoes)return true;
    return req.some(function(p){return _minhasPermissoes.indexOf(p)!==-1;});
  }
  // Usuario da sessao salva pelo Supabase neste navegador (leitura imediata, sem esperar a rede)
  function idSessaoLocal(){
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(/^sb-.*-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k));return v&&v.user&&v.user.id||null;}
      }
    }catch(e){}
    return null;
  }
  function pintarMenuPermissoes(){
    document.querySelectorAll('#sidebarSaga .nav-item[data-tela]').forEach(function(it){
      it.classList.remove('perm-pendente');
      it.classList.toggle('sem-permissao',!podeVerTela(it.getAttribute('data-tela')));
    });
    document.querySelectorAll('#sidebarSaga .nav-section').forEach(function(sec){
      sec.classList.remove('perm-pendente');
      var grupo=sec.nextElementSibling,algum=false;
      if(grupo&&grupo.classList.contains('nav-grupo'))grupo.querySelectorAll('.nav-item').forEach(function(it){if(!it.classList.contains('sem-permissao'))algum=true;});
      sec.classList.toggle('sem-permissao',!algum);
    });
    // itens que apareceram ou sumiram mudam a altura do menu: volta para a altura guardada
    restaurarRolagemMenu();
  }
  // Logo que o menu e desenhado: usa as permissoes guardadas da ultima vez (mesmo usuario).
  // Sem guardadas (primeiro acesso ou outro usuario), as telas com restricao ficam ocultas ate o banco responder.
  function prepararMenuPermissoes(){
    var uid=idSessaoLocal(),guardado=null;
    try{guardado=JSON.parse(localStorage.getItem('saga-permissoes')||'null');}catch(e){}
    if(uid&&guardado&&guardado.uid===uid&&Array.isArray(guardado.perms)){
      _minhasPermissoes=guardado.perms;
      pintarMenuPermissoes();
      return;
    }
    document.querySelectorAll('#sidebarSaga .nav-item[data-tela],#sidebarSaga .nav-section').forEach(function(el){
      var tela=el.getAttribute('data-tela');
      // Telas basicas (Processos, Agenda, Tarefas, Chat, Ponto) aparecem; as restritas esperam
      if(!tela||['processos','processos_juridico','processos_captacao','agenda','tarefas','chat','ponto'].indexOf(tela)===-1)el.classList.add('perm-pendente');
    });
    document.querySelectorAll('#sidebarSaga .nav-section').forEach(function(sec){
      if(/opera[cç]|comunic/i.test(sec.textContent))sec.classList.remove('perm-pendente');
    });
  }
  async function aplicarPermissoes(telaAtiva){
    if(!global._sb||!_perfilAtual)return;
    var ok=false;
    try{
      var r=await global._sb.rpc('minhas_permissoes');
      if(!r.error&&Array.isArray(r.data)){
        _minhasPermissoes=r.data;ok=true;
        try{localStorage.setItem('saga-permissoes',JSON.stringify({uid:idSessaoLocal(),perms:r.data}));}catch(e){}
      }
    }catch(e){}
    if(!ok&&!_minhasPermissoes){
      // Sem resposta do banco: mostra o menu completo (o banco continua bloqueando os dados)
      document.querySelectorAll('#sidebarSaga .perm-pendente').forEach(function(el){el.classList.remove('perm-pendente');});
      restaurarRolagemMenu();
      return;
    }
    pintarMenuPermissoes();
    // Tela aberta sem permissao (link direto ou favorito): bloqueia o conteudo
    if(telaAtiva&&!podeVerTela(telaAtiva))bloquearTela();
  }
  function bloquearTela(){
    if(document.getElementById('sagaSemAcesso'))return;
    var sb=document.getElementById('sidebarSaga');
    var esq=(sb&&window.innerWidth>760)?Math.max(0,sb.getBoundingClientRect().right):0;
    var primeira=document.querySelector('#sidebarSaga .nav-item[data-tela]:not(.sem-permissao)');
    var destino=primeira?(primeira.getAttribute('href')||(primeira.getAttribute('onclick')||'').replace(/^.*\('([^']+)'\).*$/,'$1')):'';
    var d=document.createElement('div');d.id='sagaSemAcesso';
    d.style.cssText='position:fixed;top:64px;right:0;bottom:0;left:'+esq+'px;z-index:1300;background:var(--navy-1,#e8ecf1);display:flex;align-items:center;justify-content:center;padding:24px;';
    d.innerHTML='<div style="max-width:420px;text-align:center;background:var(--panel,#fff);border:1px solid var(--border,#d5dbe4);border-radius:16px;padding:32px 28px;box-shadow:0 10px 30px rgba(0,0,0,.12)">'
      +'<div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,#e5484d 14%,transparent);color:#e5484d"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" stroke-width="1.8"/></svg></div>'
      +'<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-weight:600;color:var(--text,#13233a);margin-bottom:6px">Sem acesso a esta tela</div>'
      +'<div style="font-size:12.5px;color:var(--muted,#4a586e);line-height:1.5;margin-bottom:18px">Seu perfil não tem permissão para abrir esta área. Se precisar, peça ao administrador para liberar.</div>'
      +(destino?'<a class="saga-btn-inicio" href="'+destino+'" style="display:inline-block;border:1px solid var(--border,#d5dbe4);text-decoration:none;font-size:12.5px;padding:10px 18px;border-radius:9px">Voltar ao início</a>':'')
      +'</div>';
    document.body.appendChild(d);
    // o conteúdo de trás não fica montado por baixo da cortina (o banco já protege os dados; aqui some também da tela)
    try{document.querySelectorAll('.saga-conteudo').forEach(function(el){el.style.display='none';});}catch(e){}
  }

  // Marca os blocos de conteudo da tela (tudo que nao e menu superior nem lateral)
  function marcarConteudo(){
    var molduras=[document.getElementById('sidebarSaga'),document.getElementById('topbarSaga')].filter(Boolean);
    function temMoldura(el){return molduras.some(function(m){return el===m||el.contains(m);});}
    (function percorrer(pai){
      Array.prototype.forEach.call(pai.children,function(el){
        if(/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)||molduras.indexOf(el)!==-1)return;
        if(el.id==='overlay'||el.id==='sagaSemAcesso'||el.id==='sagaTravaPonto')return;
        if(temMoldura(el))percorrer(el);
        else{var pos=getComputedStyle(el).position;if(pos!=='fixed')el.classList.add('saga-conteudo');}
      });
    })(document.body);
  }

  // Menus superior e lateral montados assim que a tela abre (sem esperar o banco):
  // a troca de tela nao pisca os menus. O carregar() so completa o que depende do banco.
  var _molduraMontada=false;
  function telaDoEndereco(){
    var arq=(location.pathname.split('/').pop()||'').toLowerCase(),busca=location.search,achou='',exato='';
    document.querySelectorAll('#sidebarSaga .nav-item[data-tela]').forEach(function(el){
      var m=(el.getAttribute('href')||el.getAttribute('onclick')||'').match(/([^'\/?]+\.html)(\?[^']*)?/);
      if(!m||m[1].toLowerCase()!==arq)return;
      if(!achou)achou=el.getAttribute('data-tela');
      if(m[2]&&new URLSearchParams(busca).get('fase')===new URLSearchParams(m[2]).get('fase'))exato=el.getAttribute('data-tela');
    });
    if(exato)return exato;
    return achou;
  }
  // ===== Rolagem do menu lateral (11/11, pedido do Dr. Victor) =====
  // (1) A tela nova abre com o menu lateral na MESMA altura em que ele estava (antes voltava para o topo e quem
  //     clicava em Permissões ou Treinamentos, lá embaixo, perdia o lugar). A altura fica guardada nesta aba
  //     (sessionStorage) a cada rolagem e volta antes da primeira imagem da tela nova (o menu não pula).
  // (2) Mouse em cima do menu: a roda rola só o menu. No fim (ou no começo) dele, ou quando ele cabe inteiro
  //     na tela, a página de trás não rola (antes a rolagem "passava" para a tela aberta).
  var CHAVE_ROLAGEM_MENU='saga-menu-rolagem';
  var _rolagemMenu={ligado:false,desejada:lerRolagemMenu(),aplicada:-1,mexeu:false};
  function lerRolagemMenu(){var v=0;try{v=parseFloat(sessionStorage.getItem(CHAVE_ROLAGEM_MENU)||'0')||0;}catch(e){}return v>0?v:0;}
  // põe o menu na altura guardada (só enquanto a pessoa ainda não rolou o menu nesta tela)
  function restaurarRolagemMenu(){
    var sb=document.getElementById('sidebarSaga');
    if(!sb||!_rolagemMenu.ligado||_rolagemMenu.mexeu)return;
    if(Math.abs(sb.scrollTop-_rolagemMenu.desejada)>=1)sb.scrollTop=_rolagemMenu.desejada;
    _rolagemMenu.aplicada=Math.round(sb.scrollTop);
  }
  function ligarRolagemMenu(sb){
    if(sb.dataset.rolagem)return;sb.dataset.rolagem='1';
    _rolagemMenu.ligado=true;
    var agendado=false;
    sb.addEventListener('scroll',function(){
      if(agendado)return;agendado=true;
      requestAnimationFrame(function(){
        agendado=false;
        var v=Math.round(sb.scrollTop);
        if(v===_rolagemMenu.aplicada)return; // é a própria volta à altura guardada, não a pessoa rolando
        _rolagemMenu.aplicada=-1;_rolagemMenu.mexeu=true;_rolagemMenu.desejada=v;
        try{sessionStorage.setItem(CHAVE_ROLAGEM_MENU,String(v));}catch(e){}
      });
    },{passive:true});
    sb.addEventListener('wheel',function(e){
      if(e.ctrlKey||window.innerWidth<=760)return; // Ctrl+roda é o zoom do navegador; no celular o menu aberto já trava a página
      var dy=e.deltaY;if(!dy||Math.abs(e.deltaX)>Math.abs(dy))return;
      var max=sb.scrollHeight-sb.clientHeight;
      if(max<1||(dy<0&&sb.scrollTop<=0)||(dy>0&&sb.scrollTop>=max-1))e.preventDefault();
    },{passive:false});
    // volta pela seta do navegador (tela guardada na memória dele): o menu fica na altura da última tela
    global.addEventListener('pageshow',function(ev){if(ev.persisted){_rolagemMenu.mexeu=false;_rolagemMenu.desejada=lerRolagemMenu();restaurarRolagemMenu();}});
    restaurarRolagemMenu();
  }
  // Cada item do menu vira um link (<a href>): clique normal troca de tela com a transicao;
  // Ctrl/Cmd+clique, clique do meio ou "Abrir em nova aba" abrem o sistema em outra aba do navegador
  function linksDoMenu(sb){
    sb.querySelectorAll('.nav-item[onclick]').forEach(function(el){
      var m=(el.getAttribute('onclick')||'').match(/sagaIrPara\('([^']+)'\)/);if(!m)return;
      var a=document.createElement('a');
      Array.prototype.forEach.call(el.attributes,function(at){if(at.name!=='onclick')a.setAttribute(at.name,at.value);});
      a.setAttribute('href',m[1]);while(el.firstChild)a.appendChild(el.firstChild);
      el.parentNode.replaceChild(a,el);
    });
    if(sb.dataset.linksLigados)return;sb.dataset.linksLigados='1';
    sb.addEventListener('click',function(ev){
      var a=ev.target.closest('a.nav-item[href]');if(!a)return;
      if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.altKey||ev.button!==0)return; // deixa o navegador abrir em outra aba
      ev.preventDefault();global.sagaIrPara(a.getAttribute('href'));
    });
  }
  var IDS_NUMEROS=['navBadgeChat','navBadgeAgenda','navBadgeTarefas','navBadgeBuscas','navBadgePedidosClaude','notifCount','onlineText'];
  function guardarNumerosMoldura(){
    var g={};
    IDS_NUMEROS.forEach(function(id){var el=document.getElementById(id);if(el)g[id]={t:el.textContent,o:el.style.display==='none',a:el.classList.contains('atrasada')};});
    try{sessionStorage.setItem('saga-numeros',JSON.stringify(g));}catch(e){}
  }
  function restaurarNumerosMoldura(){
    var g=null;try{g=JSON.parse(sessionStorage.getItem('saga-numeros')||'null');}catch(e){}
    if(!g)return;
    IDS_NUMEROS.forEach(function(id){
      var el=document.getElementById(id),v=g[id];if(!el||!v)return;
      el.textContent=v.t;el.style.display=v.o?'none':'';if(v.a)el.classList.add('atrasada');
    });
  }
  // Coloca o HTML dos menus pelo <template> (e nao por innerHTML): innerHTML durante a leitura da pagina faz o navegador
  // desistir de segurar a primeira imagem (link rel=expect) e os menus passam a piscar na troca de tela.
  function injetarHtml(el,html){var t=document.createElement('template');t.innerHTML=html;el.replaceChildren(t.content);}
  function montarMoldura(telaAtiva){
    var sb=document.getElementById('sidebarSaga'),tb=document.getElementById('topbarSaga');
    if(!sb&&!tb)return;
    if(!_molduraMontada){
      _molduraMontada=true;
      if(sb){injetarHtml(sb,SIDEBAR_HTML);linksDoMenu(sb);prepararMenuPermissoes();ligarGruposMenu(sb);ligarFaixaRecolhida(sb);}
      if(tb)injetarHtml(tb,TOPBAR_HTML);
      restaurarNumerosMoldura();
      try{var ini=localStorage.getItem('saga-iniciais');var avt=document.getElementById('avatarTop');if(ini&&avt)definirIniciaisAvatar(avt,ini);var ft=localStorage.getItem('saga-foto');if(ft)mostrarFotoAvatar(ft);var lg=localStorage.getItem('saga-logo');if(lg)aplicarMarca(lg,localStorage.getItem('saga-escritorio'));}catch(e){}
      ligarTema();
      ligarPrivacidade();
      ligarHamburger();
      // depois do ligarHamburger: no celular ele muda o menu de lugar (e mudar de lugar zera a rolagem)
      if(sb)ligarRolagemMenu(sb);
    }
    var tela=telaAtiva||telaDoEndereco();
    if(tela){
      document.querySelectorAll('#sidebarSaga .nav-item.active').forEach(function(el){el.classList.remove('active');});
      var alvo=document.querySelector('#sidebarSaga [data-tela="'+tela+'"]');
      if(alvo)alvo.classList.add('active');
    }
    marcarConteudo();
    document.dispatchEvent(new CustomEvent('saga-ui-moldura'));
  }
  function montarMolduraCedo(){
    // So com login salvo neste navegador (sem login o saga_guard ja mandou para o login)
    if(!idSessaoLocal())return;
    try{montarMoldura('');}catch(e){}
    try{travaCedo();}catch(e){}
  }
  if(document.getElementById('sidebarSaga')||document.getElementById('topbarSaga'))montarMolduraCedo();
  else document.addEventListener('DOMContentLoaded',montarMolduraCedo);
  // Marca o ponto em que o menu superior e o lateral ja estao montados. O saga_guard.js pede ao navegador
  // (link rel=expect) que so desenhe a primeira imagem da tela nova a partir daqui; ate la a tela anterior
  // continua parada, e na troca de tela so o conteudo muda (os menus nao piscam nem somem).
  try{if(document.readyState==='loading'&&!document.getElementById('sagaFimDaTela'))document.write('<span id="sagaFimDaTela" hidden></span>');}catch(e){}


  // ===== Lembrete do ponto (10/11, pedido do Dr. Victor) =====
  // Quem bateu a entrada e ainda não bateu a saída é lembrado:
  //  (1) ao fechar a ÚLTIMA aba do SAGA (ou a janela inteira): o navegador pergunta antes de fechar
  //      (o texto desse aviso é do próprio navegador; ele não deixa o site escrever a mensagem).
  //      Se a pessoa escolher ficar, o SAGA mostra o lembrete e o botão "Bater o ponto agora".
  //  (2) no "Sair do sistema" do menu da foto.
  // Trocar de tela dentro do sistema, recarregar ou voltar NÃO avisa. A aba mais antiga também lembra
  // (ao fechar a janela inteira todas fecham juntas). Diretoria (horário livre): lembra enquanto houver período iniciado.
  var _ponto={aberto:false,livre:false,colab:null,conferido:0},_abaId=null,_navegando=0;
  var CHAVE_ABAS='saga-abas-abertas',ABA_VIVA_MS=180000;
  function hojeLocal(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Maceio',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(e){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}}
  async function conferirPonto(){
    if(!global._sb||!_perfilAtual)return _ponto.aberto;
    try{
      if(!_ponto.colab){
        var c=await global._sb.rpc('ponto_meu_colaborador');
        if(c.error||!c.data){_ponto.aberto=false;return false;}
        _ponto.colab=c.data;
        var pc=await global._sb.from('ponto_colaboradores').select('regime').eq('id',c.data).maybeSingle();
        if(pc.data&&pc.data.regime){var rg=await global._sb.from('ponto_regimes').select('livre').eq('nome',pc.data.regime).maybeSingle();_ponto.livre=!!(rg.data&&rg.data.livre);}
      }
      var r=await global._sb.from('ponto_marcacoes').select('slot').eq('colaborador_id',_ponto.colab).eq('data',hojeLocal());
      if(r.error)return _ponto.aberto;
      var tem={};(r.data||[]).forEach(function(m){tem[m.slot]=true;});
      var aberto=false;
      if(_ponto.livre){for(var i=0;i<8;i+=2)if(tem[i]&&!tem[i+1])aberto=true;}
      else aberto=!!tem[0]&&!tem[7];
      _ponto.aberto=aberto;_ponto.conferido=Date.now();
    }catch(e){}
    return _ponto.aberto;
  }
  function lerAbas(){try{return JSON.parse(localStorage.getItem(CHAVE_ABAS)||'{}')||{};}catch(e){return {};}}
  function gravarAbas(a){try{localStorage.setItem(CHAVE_ABAS,JSON.stringify(a));}catch(e){}}
  function marcarAba(){var a=lerAbas(),agora=Date.now();Object.keys(a).forEach(function(k){if(agora-a[k].v>ABA_VIVA_MS)delete a[k];});a[_abaId]={c:(a[_abaId]&&a[_abaId].c)||agora,v:agora};gravarAbas(a);}
  function tirarAba(){var a=lerAbas();delete a[_abaId];gravarAbas(a);}
  // lembra se for a única aba do SAGA aberta, ou a mais antiga (fechar a janela inteira fecha todas de uma vez)
  function abaQueLembra(){
    var a=lerAbas(),agora=Date.now(),eu=a[_abaId],outras=0,maisAntiga=true;
    Object.keys(a).forEach(function(k){if(k===_abaId||agora-a[k].v>ABA_VIVA_MS)return;outras++;if(eu&&(a[k].c<eu.c||(a[k].c===eu.c&&k<_abaId)))maisAntiga=false;});
    return outras===0||maisAntiga;
  }
  function irParaPonto(){var p='ponto_eletronico_padrao_metalico.html';if(location.pathname.indexOf(p)>=0){var b=document.querySelector('.btn-ponto[data-botao="saida"],.btn-ponto[data-botao="encerrar"]');if(b){b.scrollIntoView({block:'center'});b.focus();}return;}global.sagaIrPara(p);}
  function lembrarPontoNaTela(){
    if(document.getElementById('sagaLembretePonto'))return;
    var d=document.createElement('div');d.id='sagaLembretePonto';d.setAttribute('role','alertdialog');
    d.style.cssText='position:fixed;right:18px;bottom:18px;z-index:5200;max-width:360px;padding:16px 18px;border-radius:14px;border:1px solid var(--gold,#2f6cd6);background:var(--panel-solid,#1c2638);color:var(--text,#e8edf5);box-shadow:0 20px 50px rgba(0,0,0,.4);font-size:12.5px;line-height:1.5;opacity:0;transform:translateY(10px);transition:opacity .3s cubic-bezier(.22,.78,.25,1),transform .3s cubic-bezier(.22,.78,.25,1)';
    d.innerHTML='<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;font-weight:700;margin-bottom:4px">Seu ponto ainda está aberto</div>'
      +'<div style="color:var(--muted,#a3afc2);margin-bottom:12px">Você bateu a entrada hoje e ainda não bateu a '+(_ponto.livre?'saída (Encerrar)':'saída')+'. Vai embora? Bata o ponto antes de fechar.</div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-x style="height:32px;padding:0 13px;border-radius:9px;border:1px solid var(--border,rgba(255,255,255,.16));background:transparent;color:var(--text,#e8edf5);font:inherit;font-size:12px;cursor:pointer">Agora não</button><button type="button" data-ir style="height:32px;padding:0 13px;border-radius:9px;border:1px solid var(--gold,#2f6cd6);background:color-mix(in srgb,var(--gold,#2f6cd6) 22%,transparent);color:var(--text,#e8edf5);font:inherit;font-size:12px;cursor:pointer">Bater o ponto agora</button></div>';
    var fechar=function(){d.style.opacity='0';d.style.transform='translateY(10px)';setTimeout(function(){d.remove();},320);};
    d.querySelector('[data-x]').onclick=fechar;
    d.querySelector('[data-ir]').onclick=function(){fechar();irParaPonto();};
    document.body.appendChild(d);requestAnimationFrame(function(){d.style.opacity='1';d.style.transform='none';});
  }
  async function sairComLembrete(){
    fecharTodosPopovers();
    if(await conferirPonto()){
      var bater=await global.sagaConfirmar('Seu ponto ainda está aberto','Você bateu a entrada hoje e ainda não bateu a saída. Quer bater o ponto antes de sair do sistema?','Bater o ponto agora',false);
      if(bater){irParaPonto();return;}
      if(!(await global.sagaConfirmar('Sair sem bater o ponto?','O ponto de hoje fica sem a saída e vai precisar de justificativa depois.','Sair assim mesmo')))return;
    }
    _navegando=Date.now();
    global.sagaLogout();
  }
  function ligarLembretePonto(){
    if(window.top!==window||!global._sb||!_perfilAtual||_abaId)return;
    _abaId=Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    marcarAba();setInterval(marcarAba,30000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden){marcarAba();if(Date.now()-_ponto.conferido>60000)conferirPonto();}});
    global.addEventListener('pagehide',tirarAba);
    global.addEventListener('pageshow',function(ev){if(ev.persisted){marcarAba();conferirPonto();}});
    // bateu o ponto em outra aba: confere de novo aqui
    global.addEventListener('storage',function(e){if(e.key==='saga-ponto-mudou')conferirPonto();});
    conferirPonto();setInterval(conferirPonto,120000);
    // navegação dentro do sistema (troca de tela, recarregar, voltar) não é "fechar"
    if(global.navigation&&global.navigation.addEventListener)global.navigation.addEventListener('navigate',function(){_navegando=Date.now();});
    // F5 / Ctrl+R (recarregar pelo teclado) também não é fechar
    document.addEventListener('keydown',function(e){if(e.key==='F5'||((e.ctrlKey||e.metaKey)&&(e.key==='r'||e.key==='R')))_navegando=Date.now();},true);
    document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(a&&!a.target&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey)_navegando=Date.now();},true);
    var irOriginal=global.sagaIrPara;global.sagaIrPara=function(u){_navegando=Date.now();return irOriginal.apply(this,arguments);};
    global.addEventListener('beforeunload',function(e){
      if(!_ponto.aberto||Date.now()-_navegando<4000||!abaQueLembra())return;
      e.preventDefault();e.returnValue='';
      // se a pessoa escolher ficar, a página continua viva e mostra o lembrete com o botão do ponto
      setTimeout(function(){lembrarPontoNaTela();},800);
      return '';
    });
  }

  // ===== Trava até bater o ponto (11/11, Dr. Victor; bloco 162, T156) =====
  // Quem tem ponto entra no sistema, mas as outras telas ficam travadas até bater o ponto do dia. O banco decide
  // (ponto_trava); ficam fora: administrador, Diretoria (horário livre), quem não tem ponto, fim de semana, feriado
  // liberado, dia de folga/atestado/férias/licença e quem já marcou hoje. A tela do Ponto nunca trava. A resposta do
  // dia fica guardada neste navegador: liberada, não pergunta de novo; travada, a cortina já nasce na primeira imagem
  // da tela seguinte (sem mostrar o conteúdo por um instante). Bateu o ponto (nesta aba ou em outra), a trava sai.
  // A cortina fica abaixo do menu superior e do lateral: o sino, a busca e o "Sair" continuam funcionando.
  function ehTelaPonto(){return _telaAtual==='ponto'||/ponto_eletronico_padrao_metalico\.html$/i.test(location.pathname);}
  function lerTravaGuardada(){try{var g=JSON.parse(localStorage.getItem(CHAVE_TRAVA)||'null');if(g&&g.uid&&g.uid===idSessaoLocal()&&g.dia===hojeLocal())return g;}catch(e){}return null;}
  function guardarTrava(travar,nome){try{localStorage.setItem(CHAVE_TRAVA,JSON.stringify({uid:idSessaoLocal(),dia:hojeLocal(),travar:!!travar,nome:nome||''}));}catch(e){}}
  function semMovimentoTrava(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function posicionarTrava(d){
    var sb=document.getElementById('sidebarSaga'),tb=document.getElementById('topbarSaga');
    d.style.left=((sb&&global.innerWidth>760)?Math.max(0,sb.getBoundingClientRect().right):0)+'px';
    d.style.top=(tb?Math.max(0,tb.getBoundingClientRect().bottom):64)+'px';
  }
  function temMolduraSaga(){return !!(document.getElementById('sidebarSaga')||document.getElementById('topbarSaga'));}
  function mostrarTravaPonto(nome,cedo){
    if(!document.body||!temMolduraSaga())return;
    _trava.ligada=true;
    if(!document.getElementById('sagaTravaPontoCss')){var st=document.createElement('style');st.id='sagaTravaPontoCss';st.textContent='html.saga-trava-ponto .saga-conteudo{visibility:hidden!important}';(document.head||document.documentElement).appendChild(st);}
    document.documentElement.classList.add('saga-trava-ponto');
    var d=document.getElementById('sagaTravaPonto');
    if(!d){
      var fade=!cedo&&!semMovimentoTrava();
      d=document.createElement('div');d.id='sagaTravaPonto';d.setAttribute('role','alertdialog');d.setAttribute('aria-labelledby','sagaTravaTitulo');d.setAttribute('data-saga-movimento-proprio','');
      d.style.cssText='position:fixed;right:0;bottom:0;top:64px;left:0;z-index:140;background:var(--navy-1,#e8ecf1);display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;'+(fade?'opacity:0;transition:opacity .32s cubic-bezier(.22,.78,.25,1);':'');
      d.innerHTML='<div style="max-width:440px;text-align:center;background:var(--panel,#fff);border:1px solid var(--border,#d5dbe4);border-radius:16px;padding:32px 28px;box-shadow:0 10px 30px rgba(0,0,0,.12)">'
        +'<div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--gold,#2f6cd6) 14%,transparent);color:var(--gold,#2f6cd6)"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
        +'<div id="sagaTravaTitulo" style="font-family:Cormorant Garamond,serif;font-size:22px;font-weight:600;color:var(--text,#13233a);margin-bottom:6px">Bata o ponto para começar</div>'
        +'<div data-texto style="font-size:12.5px;color:var(--muted,#4a586e);line-height:1.55;margin-bottom:18px"></div>'
        +'<button type="button" data-ir style="height:36px;padding:0 18px;border-radius:9px;border:1px solid var(--gold,#2f6cd6);background:color-mix(in srgb,var(--gold,#2f6cd6) 18%,transparent);color:var(--text,#13233a);font:inherit;font-size:12.5px;cursor:pointer">Ir para o Ponto</button>'
        +'<div style="font-size:11.5px;color:var(--muted,#4a586e);margin-top:14px;line-height:1.5">Fora do escritório? Na tela do Ponto você pede home office.</div>'
        +'</div>';
      d.querySelector('[data-ir]').addEventListener('click',function(){global.sagaIrPara('ponto_eletronico_padrao_metalico.html');});
      document.body.appendChild(d);
      posicionarTrava(d);
      if(fade)requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.opacity='1';});});
    }
    d.querySelector('[data-texto]').textContent=(nome?'Olá, '+nome+'! ':'')+'Para usar o sistema hoje, primeiro bata o ponto de entrada. As outras telas são liberadas assim que o ponto for batido.';
    if(!_trava.timer)_trava.timer=setInterval(function(){if(!document.hidden)conferirTravaPonto(true);},60000);
  }
  function tirarTravaPonto(){
    _trava.ligada=false;
    if(_trava.timer){clearInterval(_trava.timer);_trava.timer=null;}
    document.documentElement.classList.remove('saga-trava-ponto');
    var d=document.getElementById('sagaTravaPonto');if(!d)return;
    d.id='';
    if(semMovimentoTrava()){d.remove();return;}
    d.style.transition='opacity .26s cubic-bezier(.22,.78,.25,1)';d.style.opacity='0';
    setTimeout(function(){d.remove();},300);
  }
  async function conferirTravaPonto(forcar){
    if(global.top!==global||!global._sb||!idSessaoLocal())return;
    var g=lerTravaGuardada();
    if(!forcar&&g&&!g.travar){if(_trava.ligada)tirarTravaPonto();return;}
    try{
      var r=await global._sb.rpc('ponto_trava');
      // sem resposta do banco: não trava (quem já estava dentro continua)
      if(r.error||!r.data){if(_trava.ligada)tirarTravaPonto();return;}
      guardarTrava(r.data.travar,r.data.nome);
      if(r.data.travar&&!ehTelaPonto())mostrarTravaPonto(r.data.nome);
      else if(_trava.ligada)tirarTravaPonto();
    }catch(e){}
  }
  // primeira imagem da tela: a resposta guardada de hoje diz "travada"? a cortina já aparece
  function travaCedo(){
    if(global.top!==global||ehTelaPonto()||!temMolduraSaga())return;
    var g=lerTravaGuardada();
    if(g&&g.travar)mostrarTravaPonto(g.nome,true);
  }
  function ligarTravaPonto(){
    if(_trava.ligado||global.top!==global)return;
    _trava.ligado=true;
    global.addEventListener('storage',function(e){if(e.key==='saga-ponto-mudou')conferirTravaPonto(true);});
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&_trava.ligada)conferirTravaPonto(true);});
    global.addEventListener('pageshow',function(ev){if(ev.persisted)conferirTravaPonto(true);});
    global.addEventListener('resize',function(){var x=document.getElementById('sagaTravaPonto');if(x)posicionarTrava(x);});
    var sb=document.getElementById('sidebarSaga');
    if(sb&&global.ResizeObserver){try{new ResizeObserver(function(){var x=document.getElementById('sagaTravaPonto');if(x)posicionarTrava(x);}).observe(sb);}catch(e){}}
  }

  async function carregar(telaAtiva){
    _telaAtual=telaAtiva||'';
    // Sem login valido: vai para o login sem mostrar nada da tela (saga_guard.js a mantem escondida)
    if(global._sb){
      try{
        var ses=await global._sb.auth.getSession();
        if(!ses.data||!ses.data.session){window.location.replace('login_padrao_metalico.html');return;}
      }catch(e){}
    }
    // Login diário (bloco 181): login de antes do corte das 20h sai; as regras de horário valem para a inatividade
    if(!(await conferirLoginDiario()))return;
    // Sessao parada alem do limite (ex.: computador ligado a noite toda): sai antes de montar a tela
    if(await verificarInatividade())return;
    // Horario e local de acesso (a tela continua escondida enquanto confere)
    if(!(await verificarAcesso(false)))return;
    // Entrada só pela internet do escritório (chave em Ponto > Configurações): espera a autorização do administrador
    await conferirEntradaRede();
    registrarEntrada();
    registrarAtividade();
    ligarControleInatividade();
    montarMoldura(telaAtiva);
    travaCedo();ligarTravaPonto();conferirTravaPonto(false);
    ligarPresencaESino();
    ligarBuscaGlobal();
    marcarConteudo();
    await carregarPerfil();
    carregarMarca();
    await aplicarPermissoes(telaAtiva);
    // Presenca e contador do sino carregam em paralelo e nao seguram a tela
    carregarPresenca();
    contarNaoLidas();
    carregarFotosEquipe();
    ligarContadorChat();
    ligarLembretePonto();
    document.dispatchEvent(new CustomEvent('saga-ui-pronto',{detail:{telaAtiva:telaAtiva}}));
  }

  // 09/11: página devolvida pela memória do navegador (botão voltar): confere de novo no banco a cor, a letra e o perfil
  global.addEventListener('pageshow',function(ev){if(ev.persisted&&_perfilAtual)carregarPerfil();});

  global.SagaUI={conferirPonto:function(){try{localStorage.setItem('saga-ponto-mudou',String(Date.now()));}catch(e){}conferirTravaPonto(true);return conferirPonto();},abrirNotificacao:function(n){return abrirNotificacao(n);},atualizarPerfil:function(){return carregarPerfil().then(contarNaoLidas).then(carregarMarca);},carregar:carregar,podeVerTela:podeVerTela,atualizarChat:agendarContagemChat,contarAvisos:contarNaoLidas,recarregarPresenca:carregarPresenca,recarregarNotificacoes:carregarNotificacoes,contarDia:function(){return contarDia();}};
})(window);

/* Copiar com um clique (07/11): qualquer botão com data-copiar="texto" (e data-copiar-rotulo="CPF") copia o texto.
   window.sagaIconeCopiar(texto, rotulo) devolve o HTML do botãozinho; window.sagaCopiar(texto, rotulo) copia direto. */
(function(global){
  var ICONE='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var OK='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function esc(t){var d=document.createElement('div');d.textContent=t==null?'':String(t);return d.innerHTML.replace(/"/g,'&quot;');}
  function avisar(msg){if(typeof global.showToast==='function'){try{global.showToast(msg,'success');return;}catch(e){}}}
  global.sagaCopiar=function(texto,rotulo){
    texto=String(texto==null?'':texto);if(!texto)return Promise.resolve(false);
    var feito=function(){avisar((rotulo||'Texto')+' copiado.');return true;};
    var antigo=function(){var t=document.createElement('textarea');t.value=texto;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}t.remove();return ok?feito():false;};
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(texto).then(feito,antigo);
    return Promise.resolve(antigo());
  };
  global.sagaIconeCopiar=function(texto,rotulo){
    if(texto==null||String(texto).trim()==='')return '';
    return '<button type="button" class="saga-copiar" data-copiar="'+esc(texto)+'" data-copiar-rotulo="'+esc(rotulo||'Texto')+'" title="Copiar '+esc((rotulo||'').toLowerCase())+'" aria-label="Copiar '+esc(rotulo||'')+'">'+ICONE+'</button>';
  };
  if(!document.getElementById('sagaCopiarCss')){var st=document.createElement('style');st.id='sagaCopiarCss';
    st.textContent='.saga-copiar{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-left:5px;padding:0;border:1px solid transparent;border-radius:6px;background:none;color:var(--muted,#8a94a8);cursor:pointer;vertical-align:middle;flex:0 0 auto;transition:color .2s,background .2s,border-color .2s,transform .2s cubic-bezier(.22,.78,.25,1)}.saga-copiar:hover,.saga-copiar:focus-visible{color:var(--gold-light,#7fa6e6);border-color:var(--border-soft,#2f3d55);background:color-mix(in srgb,var(--gold,#4b8af5) 10%,transparent);outline:0}.saga-copiar:active{transform:scale(.88)}.saga-copiar.copiado{color:var(--success,#3fb98a)}';
    (document.head||document.documentElement).appendChild(st);}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-copiar]');if(!b)return;
    e.preventDefault();e.stopPropagation();
    global.sagaCopiar(b.getAttribute('data-copiar'),b.getAttribute('data-copiar-rotulo')).then(function(ok){
      if(!ok||!b.classList.contains('saga-copiar'))return;var antes=b.innerHTML;b.innerHTML=OK;b.classList.add('copiado');
      setTimeout(function(){b.innerHTML=antes;b.classList.remove('copiado');},1200);});
  },true);
})(window);
