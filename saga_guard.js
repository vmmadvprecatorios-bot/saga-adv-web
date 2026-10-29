// SAGA GUARD - porta de entrada das telas internas.
// Carregado no <head>, antes de qualquer conteudo aparecer:
// 1) sem login salvo no navegador, vai direto para o login (nada da tela aparece);
// 2) com login, a tela fica escondida ate o saga_ui.js confirmar a sessao e as
//    permissoes (evento 'saga-ui-pronto') e a tela terminar de buscar os dados;
//    entao o conteudo entra em cascata suave (e sai do mesmo jeito ao trocar de tela).
(function(){
  var LOGIN='login_padrao_metalico.html';
  var CHAVE='sb-fmoskdxgjulagedzjxxk-auth-token';
  var html=document.documentElement;

  var tema='dark';
  try{tema=localStorage.getItem('saga-tema')||'dark';}catch(e){}
  html.style.background=tema==='light'?'#f3f5f8':'#172234';
  html.style.colorScheme=tema==='light'?'light':'dark';

  var temSessao=false;
  try{
    var bruto=localStorage.getItem(CHAVE);
    var s=bruto?JSON.parse(bruto):null;
    if(s&&s.currentSession)s=s.currentSession;
    temSessao=!!(s&&(s.refresh_token||s.access_token));
  }catch(e){}

  var estilo=document.createElement('style');
  estilo.id='sagaGuardEstilo';
  estilo.textContent=
    // Ate o login ser confirmado e os menus montados, nada aparece
    'html.saga-entrando body{opacity:0 !important;}'+
    // Espaco da barra de rolagem sempre reservado: o menu superior nao pula entre telas
    'html{scrollbar-gutter:stable;}'+
    // Menus superior e lateral ficam parados; so o conteudo da tela faz a transicao.
    // O conteudo so aparece quando a tela terminou de buscar os dados (nada pela metade).
    'html.saga-carregando .saga-conteudo{opacity:0 !important;}'+
    // Fio fino de carregamento sob o menu superior, so se a espera passar de um instante
    '#sagaCarregando{position:fixed;left:0;right:0;height:2px;z-index:1400;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .2s ease;}'+
    '#sagaCarregando.ativo{opacity:1;}'+
    '#sagaCarregando::after{content:"";position:absolute;top:0;bottom:0;width:38%;left:-38%;border-radius:2px;background:linear-gradient(90deg,transparent,var(--gold,#c9a96e),transparent);animation:sagaFio 1s ease-in-out infinite;}'+
    '@keyframes sagaFio{to{left:100%;}}'+
    // Todas as telas com o menu padrao: mesmo fundo (sem quadriculado nem brilhos proprios)
    // e mesma barra de rolagem, para nada mudar de lugar ou de cor na troca de tela
    'html.saga-padrao body{background:linear-gradient(160deg,var(--navy-1),var(--navy-2) 50%,var(--navy-3)) fixed !important;}'+
    'html.saga-padrao body::before,html.saga-padrao body::after{content:none !important;display:none !important;}'+
    'html.saga-padrao ::-webkit-scrollbar{width:8px;height:8px;}'+
    'html.saga-padrao ::-webkit-scrollbar-track{background:transparent;}'+
    'html.saga-padrao ::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--gold) 32%,transparent);border-radius:8px;}'+
    // Troca de tela sem piscar: o navegador mantem a tela anterior ate a nova ter os menus prontos
    '@view-transition{navigation:auto;}'+
    '::view-transition-group(root){animation-duration:.12s;}'+
    '#sidebarSaga,#topbarSaga{font-family:Montserrat,Arial,sans-serif;}'+
    // Enquanto a tela monta, os menus nao animam nada (evita a tremida do menu lateral)
    'html.saga-fixando #sidebarSaga,html.saga-fixando #sidebarSaga *,html.saga-fixando #topbarSaga,html.saga-fixando #topbarSaga *{transition:none !important;animation:none !important;}';
  (document.head||html).appendChild(estilo);
  html.classList.add('saga-entrando','saga-carregando','saga-fixando');

  if(!temSessao){
    location.replace(LOGIN);
    return;
  }

  // Menus aparecem so com as letras ja carregadas (sem trocar de fonte na frente do usuario)
  var molduraPedida=false;
  function mostrarMoldura(){
    if(molduraPedida)return;molduraPedida=true;
    function ok(){html.classList.remove('saga-entrando');}
    if(document.fonts&&document.fonts.status==='loading'){
      var feito=false;function uma(){if(!feito){feito=true;ok();}}
      document.fonts.ready.then(uma);setTimeout(uma,250);
    }else ok();
  }
  // Telas antigas sem o menu padrao (data-simples): basta ter login salvo; aparecem quando a pagina termina de carregar
  if(document.currentScript&&document.currentScript.dataset.simples){
    html.classList.remove('saga-carregando','saga-fixando');
    document.addEventListener('DOMContentLoaded',mostrarMoldura);
    return;
  }
  var reduz=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Conta as buscas ao banco em andamento: a tela so aparece quando todas terminam
  var pendentes=0,ultimaBusca=0;
  if(window.fetch){
    var fetchOriginal=window.fetch;
    window.fetch=function(){
      pendentes++;ultimaBusca=Date.now();
      function fim(){pendentes=Math.max(0,pendentes-1);ultimaBusca=Date.now();}
      try{return fetchOriginal.apply(this,arguments).then(function(r){fim();return r;},function(e){fim();throw e;});}
      catch(e){fim();throw e;}
    };
  }

  // Blocos que entram em cascata: os filhos visiveis do conteudo (um nivel a mais nos blocos grandes)
  function visivel(el){
    if(/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName))return false;
    var cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed')return false;
    var r=el.getBoundingClientRect();return r.width>0&&r.height>0;
  }
  function filhosVisiveis(el){return Array.prototype.filter.call(el.children,visivel);}
  function blocosCascata(){
    var itens=[],altura=window.innerHeight||800;
    Array.prototype.forEach.call(document.querySelectorAll('.saga-conteudo'),function(c){
      var nivel=filhosVisiveis(c);
      while(nivel.length===1&&nivel[0].children.length)nivel=filhosVisiveis(nivel[0]);
      if(!nivel.length)nivel=[c];
      nivel.forEach(function(el){
        var filhos=el.getBoundingClientRect().height>altura*0.45?filhosVisiveis(el):[];
        if(filhos.length>1)itens.push.apply(itens,filhos);else itens.push(el);
      });
    });
    // So o que esta na tela anima; o que esta abaixo da dobra aparece junto com o ultimo
    return itens.filter(function(el){return el.getBoundingClientRect().top<altura;});
  }
  function cascata(itens,entrada){
    var max=7,passo=entrada?42:20,dur=entrada?240:110,total=0;
    itens.forEach(function(el,i){
      if(!el.animate)return;
      var atraso=Math.min(i,max)*passo;total=Math.max(total,atraso+dur);
      el.animate(entrada
        ?[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}]
        :[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-5px)'}],
        {duration:dur,delay:atraso,easing:entrada?'cubic-bezier(.2,.7,.25,1)':'ease-in',fill:entrada?'backwards':'forwards'});
    });
    return total;
  }

  var fio=null,fioTimer=null;
  function mostrarFio(){
    if(!document.body)return;
    if(!fio){fio=document.createElement('div');fio.id='sagaCarregando';document.body.appendChild(fio);}
    var tb=document.getElementById('topbarSaga');
    fio.style.top=(tb?Math.max(0,tb.getBoundingClientRect().bottom):0)+'px';
    fio.classList.add('ativo');
  }

  html.classList.add('saga-padrao');
  // A primeira imagem da tela so e desenhada depois de montados os menus (fim da leitura da pagina)
  try{document.write('<link rel="expect" href="#sagaFimDaTela" blocking="render">');}catch(e){}
  var jaMostrou=false;
  function mostrar(){
    mostrarMoldura();
    if(jaMostrou)return;jaMostrou=true;
    clearTimeout(fioTimer);if(fio)fio.classList.remove('ativo');
    if(!reduz){try{cascata(blocosCascata(),true);}catch(e){}}
    html.classList.remove('saga-carregando');
  }
  // Menus prontos: espera a tela terminar de buscar os dados (sem buscas por um instante) e mostra tudo de uma vez
  function esperarDados(){
    if(jaMostrou)return;
    var inicio=Date.now();
    fioTimer=setTimeout(mostrarFio,260);
    (function conferir(){
      if(jaMostrou)return;
      var quieto=pendentes===0&&Date.now()-ultimaBusca>=140;
      if(quieto||Date.now()-inicio>2800){mostrar();return;}
      setTimeout(conferir,40);
    })();
  }
  document.addEventListener('saga-ui-moldura',mostrarMoldura);
  document.addEventListener('saga-ui-pronto',function(){
    mostrarMoldura();
    // A tela pode chamar algo logo depois de pronta: a contagem comeca no proximo instante
    ultimaBusca=Date.now();
    esperarDados();
    setTimeout(function(){html.classList.remove('saga-fixando');},400);
  });
  // Rede de seguranca: se algo travar, a tela aparece mesmo assim
  setTimeout(function(){mostrar();html.classList.remove('saga-fixando');},8000);

  // Volta pelo botao do navegador (pagina guardada em cache): nao fica apagada
  window.addEventListener('pageshow',function(ev){
    if(ev.persisted){
      saindo=false;html.classList.remove('saga-carregando');mostrarMoldura();
      if(document.getAnimations)document.getAnimations().forEach(function(a){try{a.cancel();}catch(e){}});
    }
  });

  // Saida suave ao trocar de tela pelo menu: os blocos somem em cascata rapida
  var saindo=false;
  window.sagaIrPara=function(url){
    if(!url||saindo)return;
    if(reduz||!jaMostrou){location.href=url;return;}
    saindo=true;
    var total=0;
    try{total=cascata(blocosCascata(),false);}catch(e){}
    setTimeout(function(){location.href=url;},Math.min(total,200));
  };
})();
