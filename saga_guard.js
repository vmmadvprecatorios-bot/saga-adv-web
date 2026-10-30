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
  // Grupo de cartoes lado a lado (grade ou linha): cada cartao entra na sua vez
  function ehGrupoDeCartoes(el){
    var cs=getComputedStyle(el),f=filhosVisiveis(el);
    if(f.length<2||f.length>12)return null;
    if(!/grid|flex/.test(cs.display))return null;
    if(/flex/.test(cs.display)&&/column/.test(cs.flexDirection))return null;
    // so cartoes de verdade (nao botoes pequenos de uma barra)
    var grandes=f.filter(function(x){var r=x.getBoundingClientRect();return r.height>=56&&r.width>=110;});
    return grandes.length>=2?f:null;
  }
  function blocosCascata(){
    var itens=[],altura=window.innerHeight||800;
    function juntar(el,nivel){
      var r=el.getBoundingClientRect();
      if(r.top>altura)return; // abaixo da dobra: aparece junto com o ultimo
      var cartoes=ehGrupoDeCartoes(el);
      if(cartoes){cartoes.forEach(function(x){itens.push(x);});return;}
      var filhos=nivel<2&&r.height>altura*0.45?filhosVisiveis(el):[];
      if(filhos.length>1){filhos.forEach(function(x){juntar(x,nivel+1);});return;}
      itens.push(el);
    }
    Array.prototype.forEach.call(document.querySelectorAll('.saga-conteudo'),function(c){
      var nivel=filhosVisiveis(c);
      while(nivel.length===1&&nivel[0].children.length)nivel=filhosVisiveis(nivel[0]);
      if(!nivel.length)nivel=[c];
      nivel.forEach(function(el){juntar(el,0);});
    });
    return itens.slice(0,24);
  }
  // Mola: passa um pouquinho do ponto e assenta (como no iPhone)
  var MOLA='cubic-bezier(.34,1.45,.64,1)';
  function cascata(itens,entrada){
    var max=entrada?9:6,passo=entrada?28:14,dur=entrada?360:110,total=0;
    itens.forEach(function(el,i){
      if(!el.animate)return;
      var atraso=Math.min(i,max)*passo;total=Math.max(total,atraso+dur);
      el.animate(entrada
        ?[{opacity:0,transform:'translateY(10px) scale(.93)'},{opacity:1,offset:.6},{opacity:1,transform:'none'}]
        :[{opacity:1,transform:'none'},{opacity:0,transform:'scale(.97)'}],
        {duration:dur,delay:atraso,easing:entrada?MOLA:'ease-in',fill:entrada?'backwards':'forwards'});
      if(entrada)animarDetalhes(el,atraso+80);
    });
    return total;
  }
  // Numeros sobem contando e barras dos graficos crescem, cada um no tempo do seu cartao
  var RE_NUM=/^(\D{0,4}?)(-?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(\s?(?:%|h|min|dias?)?)$/;
  function animarDetalhes(raiz,atraso){
    var andou=0;
    raiz.querySelectorAll('*').forEach(function(el){
      if(andou>40)return;
      // numero grande sozinho no elemento
      if(!el.children.length){
        var t=(el.textContent||'').trim(),m=RE_NUM.exec(t);
        if(m&&parseFloat(getComputedStyle(el).fontSize)>=19){contar(el,m,atraso);andou++;}
        return;
      }
    });
    raiz.querySelectorAll('[style*="width"],[style*="height"],circle[stroke-dasharray],circle[style*="dash"]').forEach(function(el){
      if(andou>60||!el.animate)return;andou++;
      if(el.tagName.toLowerCase()==='circle'){
        var tot=parseFloat(getComputedStyle(el).strokeDasharray)||0,fim=getComputedStyle(el).strokeDashoffset;
        if(tot>0)el.animate([{strokeDashoffset:String(tot)},{strokeDashoffset:fim}],{duration:900,delay:atraso,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
        return;
      }
      var st=el.getAttribute('style')||'',r=el.getBoundingClientRect();
      if(/(^|;)\s*width\s*:\s*[\d.]+%/.test(st)&&r.height>0&&r.height<=18&&r.width>0)
        el.animate([{transform:'scaleX(0)',transformOrigin:'left center'},{transform:'scaleX(1)',transformOrigin:'left center'}],{duration:800,delay:atraso,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      else if(/(^|;)\s*height\s*:\s*[\d.]+%/.test(st)&&r.width>0&&r.width<=48&&r.height>0)
        el.animate([{transform:'scaleY(0)',transformOrigin:'center bottom'},{transform:'scaleY(1)',transformOrigin:'center bottom'}],{duration:800,delay:atraso,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
    });
  }
  function contar(el,m,atraso){
    var pre=m[1],neg=m[2],inteiro=m[3].replace(/\./g,''),dec=m[4]?m[4].slice(1):'',suf=m[5]||'';
    var alvo=parseFloat(inteiro+(dec?'.'+dec:''));
    if(!(alvo>0))return;
    var casas=dec.length,milhar=m[3].indexOf('.')>=0||alvo>=1000,dur=Math.min(1100,600+Math.log10(alvo+1)*120);
    function fmt(v){
      var p=v.toFixed(casas).split('.'),i=p[0];
      if(milhar)i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
      return pre+neg+i+(casas?','+p[1]:'')+suf;
    }
    var original=el.textContent,ultimo=fmt(0),ini=null;
    el.textContent=ultimo;
    setTimeout(function(){
      function passo(ts){
        if(el.textContent!==ultimo)return; // a tela mudou o valor: para de contar
        if(ini===null)ini=ts;
        var k=Math.min(1,(ts-ini)/dur),e=1-Math.pow(1-k,3);
        ultimo=k<1?fmt(alvo*e):original;el.textContent=ultimo;
        if(k<1)requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    },atraso);
  }

  // Abas e botoes de escolha: o destaque desliza do botao antigo para o novo (como no iPhone)
  var ATIVO=/(^|\s)(active|ativo|ativa|selected|selecionado|selecionada)(\s|$)/;
  function botaoDeGrupo(el){
    if(!el||el.nodeType!==1||!el.parentElement)return false;
    if(el.closest('#sidebarSaga,#topbarSaga,.modal-overlay:not(.open)'))return false;
    var r=el.getBoundingClientRect();
    return r.height>0&&r.height<=60&&r.width<=360&&(el.tagName==='BUTTON'||el.getAttribute('role')==='tab'||getComputedStyle(el).cursor==='pointer');
  }
  var ultimoAtivo=new WeakMap();
  function lembrar(grupo,ativo){
    var g=grupo.getBoundingClientRect(),r=ativo.getBoundingClientRect();
    ultimoAtivo.set(grupo,{el:ativo,txt:ativo.textContent,x:r.left-g.left+grupo.scrollLeft,y:r.top-g.top+grupo.scrollTop,w:r.width,h:r.height});
  }
  function deslizar(grupo,de,para){
    if(reduz||!grupo.animate)return;
    // Le a cor final do botao (sem a transicao propria dele, que ainda estaria no meio do caminho)
    var transAntes=[para.style.getPropertyValue('transition'),para.style.getPropertyPriority('transition')];
    para.style.setProperty('transition','none','important');
    var cs=getComputedStyle(para),fundo=cs.backgroundImage!=='none'?cs.backgroundImage:'',cor=cs.backgroundColor;
    var raio=cs.borderRadius,sombra=cs.boxShadow;
    if(!fundo&&(!cor||/rgba\(0, 0, 0, 0\)|transparent/.test(cor))){ // ativo sem fundo: nada a deslizar
      if(transAntes[0])para.style.setProperty('transition',transAntes[0],transAntes[1]);else para.style.removeProperty('transition');
      return;
    }
    var g=grupo.getBoundingClientRect(),r=para.getBoundingClientRect();
    var fim={x:r.left-g.left+grupo.scrollLeft,y:r.top-g.top+grupo.scrollTop,w:r.width,h:r.height};
    if((Math.abs(fim.x-de.x)<2&&Math.abs(fim.y-de.y)<2)||Math.abs(fim.y-de.y)>de.h*1.5){ // mesmo lugar ou outra linha: sem deslizar
      if(transAntes[0])para.style.setProperty('transition',transAntes[0],transAntes[1]);else para.style.removeProperty('transition');
      return;
    }
    if(getComputedStyle(grupo).position==='static')grupo.style.position='relative';
    grupo.style.isolation='isolate';
    var fantasma=document.createElement('div');
    fantasma.setAttribute('aria-hidden','true');
    fantasma.style.cssText='position:absolute;z-index:-1;pointer-events:none;margin:0;left:0;top:0;'+
      'border-radius:'+raio+';box-shadow:'+sombra+';background-color:'+cor+';'+(fundo?'background-image:'+fundo+';':'');
    grupo.appendChild(fantasma);
    var props=['background-color','background-image','box-shadow','border-color','transition'],antes={};
    props.forEach(function(p){antes[p]=[para.style.getPropertyValue(p),para.style.getPropertyPriority(p)];});
    antes.transition=transAntes;
    para.style.setProperty('background-color','transparent','important');
    para.style.setProperty('background-image','none','important');
    para.style.setProperty('box-shadow','none','important');
    para.style.setProperty('border-color','transparent','important');
    para.style.setProperty('transition','color .2s ease','important');
    var anim=fantasma.animate([
      {transform:'translate('+de.x+'px,'+de.y+'px)',width:de.w+'px',height:de.h+'px'},
      {transform:'translate('+fim.x+'px,'+fim.y+'px)',width:fim.w+'px',height:fim.h+'px'}
    ],{duration:380,easing:'cubic-bezier(.3,1.18,.55,1)',fill:'forwards'});
    function volta(p){if(antes[p][0])para.style.setProperty(p,antes[p][0],antes[p][1]);else para.style.removeProperty(p);}
    function pronto(){
      // devolve a cor do botao ainda sem transicao (para nao piscar) e so depois a transicao dele
      props.forEach(function(p){if(p!=='transition')volta(p);});
      void para.offsetWidth;
      fantasma.remove();
      requestAnimationFrame(function(){volta('transition');});
    }
    anim.onfinish=pronto;anim.oncancel=pronto;
  }
  function conferirGrupos(){
    document.querySelectorAll('.active,.ativo,.ativa,.selected,.selecionado,.selecionada').forEach(function(el){try{
      if(typeof el.className!=='string'||!botaoDeGrupo(el))return;
      var grupo=el.parentElement,irmaos=Array.prototype.filter.call(grupo.children,function(x){return x!==el&&x.tagName===el.tagName;});
      if(!irmaos.length)return;
      var antes=ultimoAtivo.get(grupo);
      // O destaque mudou de botao (troca de classe ou botoes redesenhados): desliza do antigo para o novo
      if(antes&&antes.el!==el&&!(antes.el.isConnected&&ATIVO.test(antes.el.className))&&!(!antes.el.isConnected&&antes.txt===el.textContent))deslizar(grupo,antes,el);
      lembrar(grupo,el);
    }catch(e){if(window.SAGA_DEBUG)console.warn('[saga] abas',e);}});
  }
  // Janelas que aparecem (online agora, notificacoes, cadastros, menus suspensos, avisos): surgem com mola
  var visivelAntes=new WeakMap();
  function ehJanela(el){
    if(!el||el.nodeType!==1||el.id==='sagaCarregando'||el.getAttribute('aria-hidden')==='true')return false;
    if(/^(SCRIPT|STYLE|LINK|svg|path|INPUT|SELECT|OPTION|TEXTAREA|IMG|BR)$/i.test(el.tagName))return false;
    if(el.closest('#sidebarSaga'))return false;
    var cs=getComputedStyle(el),p=cs.position;
    // absoluto so conta se estiver por cima do resto (menus e popovers), nao blocos posicionados da pagina
    return p==='fixed'||(p==='absolute'&&(parseInt(cs.zIndex,10)||0)>=10);
  }
  function estaVisivel(el){
    var cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.05)return false;
    var r=el.getBoundingClientRect();
    return r.width>=60&&r.height>=36&&r.bottom>0&&r.top<innerHeight;
  }
  var displayAberto=new WeakMap();
  function registrarJanelas(){
    document.querySelectorAll('body *').forEach(function(el){if(ehJanela(el)){var v=estaVisivel(el);visivelAntes.set(el,v);if(v)displayAberto.set(el,getComputedStyle(el).display);}});
  }
  // Ao fechar: uma copia da janela, no mesmo lugar, encolhe e some (a janela de verdade ja fechou)
  function fecharJanela(el){
    if(reduz||!el.parentNode)return;
    var disp=displayAberto.get(el)||'block';
    var antes=[el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')];
    el.style.setProperty('display',disp,'important');
    var r=el.getBoundingClientRect(),copia=null;
    if(r.width>=60&&r.height>=36)copia=el.cloneNode(true);
    if(antes[0])el.style.setProperty('display',antes[0],antes[1]);else el.style.removeProperty('display');
    if(!copia||!copia.animate)return;
    copia.removeAttribute('id');copia.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id');});
    copia.setAttribute('aria-hidden','true');
    copia.style.setProperty('display',disp,'important');
    copia.style.setProperty('pointer-events','none','important');
    el.parentNode.insertBefore(copia,el.nextSibling);
    var telaToda=r.width>=innerWidth*0.9&&r.height>=innerHeight*0.85,anim;
    if(telaToda){
      anim=copia.animate([{opacity:1},{opacity:0}],{duration:200,easing:'ease-in',fill:'forwards'});
      var maior=null,area=0;
      Array.prototype.forEach.call(copia.children,function(c){var b=c.getBoundingClientRect(),a=b.width*b.height;if(a>area&&a<r.width*r.height*0.98){area=a;maior=c;}});
      if(maior){var bm=getComputedStyle(maior).transform;bm=bm==='none'?'':bm+' ';
        maior.animate([{transform:bm+'scale(1)'},{transform:bm+'translateY(10px) scale(.95)'}],{duration:200,easing:'ease-in',fill:'forwards'});}
    }else{
      var base=getComputedStyle(copia).transform;base=base==='none'?'':base+' ';
      var origem=(r.left+r.width/2>innerWidth/2?'top right':'top left');
      if(r.top>innerHeight*0.6)origem=origem.replace('top','bottom');
      anim=copia.animate([{opacity:1,transform:base+'scale(1)',transformOrigin:origem},{opacity:0,transform:base+'scale(.92)',transformOrigin:origem}],{duration:170,easing:'ease-in',fill:'forwards'});
    }
    anim.onfinish=function(){copia.remove();};
    setTimeout(function(){if(copia.isConnected)copia.remove();},600);
  }
  // Chamado na hora da mudanca (antes de a tela ser desenhada), para a janela nao sumir de uma vez
  function verFechamentos(lista){
    lista.forEach(function(m){
      if(m.type!=='attributes')return;
      var el=m.target;
      if(visivelAntes.get(el)!==true||!ehJanela(el))return;
      try{if(!estaVisivel(el)){visivelAntes.set(el,false);fecharJanela(el);}}catch(e){}
    });
  }
  function animarJanela(el){
    if(reduz||!el.animate)return;
    var r=el.getBoundingClientRect(),base=getComputedStyle(el).transform;base=base==='none'?'':base+' ';
    var telaToda=r.width>=innerWidth*0.9&&r.height>=innerHeight*0.85;
    if(telaToda){
      // fundo escurece suave e a janela de dentro cresce com mola
      el.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'});
      var maior=null,area=0;
      Array.prototype.forEach.call(el.children,function(c){var b=c.getBoundingClientRect(),a=b.width*b.height;if(a>area&&a<r.width*r.height*0.98){area=a;maior=c;}});
      if(maior){var bm=getComputedStyle(maior).transform;bm=bm==='none'?'':bm+' ';
        maior.animate([{opacity:0,transform:bm+'translateY(16px) scale(.94)'},{opacity:1,offset:.5},{opacity:1,transform:bm+'translateY(0) scale(1)'}],{duration:380,easing:MOLA});}
      return;
    }
    var origem=(r.left+r.width/2>innerWidth/2?'top right':'top left');
    if(r.top>innerHeight*0.6)origem=origem.replace('top','bottom');
    el.animate([{opacity:0,transform:base+'scale(.9)',transformOrigin:origem},{opacity:1,offset:.45,transformOrigin:origem},{opacity:1,transform:base+'scale(1)',transformOrigin:origem}],{duration:320,easing:MOLA});
  }
  var paraConferir=new Set();
  function anotarMudancas(lista){
    lista.forEach(function(m){
      if(m.type==='attributes')paraConferir.add(m.target);
      else m.addedNodes.forEach(function(n){if(n.nodeType===1){paraConferir.add(n);}});
    });
  }
  function conferirJanelas(){
    var itens=Array.from(paraConferir);paraConferir.clear();
    itens.forEach(function(el){try{
      if(!el.isConnected||!ehJanela(el))return;
      var antes=visivelAntes.get(el),agora=estaVisivel(el);
      visivelAntes.set(el,agora);
      if(agora)displayAberto.set(el,getComputedStyle(el).display);
      if(agora&&antes!==true)animarJanela(el);
    }catch(e){}});
  }
  var agendado=false;
  function agendarConferencia(){
    if(agendado)return;agendado=true;
    requestAnimationFrame(function(){agendado=false;try{conferirJanelas();}catch(e){}try{conferirGrupos();}catch(e){}});
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
    try{
      conferirGrupos();registrarJanelas();
      new MutationObserver(function(lista){try{verFechamentos(lista);}catch(e){}anotarMudancas(lista);agendarConferencia();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','open']});
    }catch(e){}
  }
  // Menus prontos: espera a tela terminar de buscar os dados (sem buscas por um instante) e mostra tudo de uma vez
  function esperarDados(){
    if(jaMostrou)return;
    var inicio=Date.now();
    fioTimer=setTimeout(mostrarFio,260);
    (function conferir(){
      if(jaMostrou)return;
      var quieto=pendentes===0&&Date.now()-ultimaBusca>=90;
      if(quieto||Date.now()-inicio>2800){mostrar();return;}
      setTimeout(conferir,25);
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

  // Transicao entre paginas: quando a outra pagina nao participa (ex.: login), o navegador cancela sem erro aparente
  function calarTransicao(ev){
    var vt=ev&&ev.viewTransition;if(!vt)return;
    ['ready','finished','updateCallbackDone'].forEach(function(k){if(vt[k]&&vt[k].catch)vt[k].catch(function(){});});
  }
  window.addEventListener('pageswap',calarTransicao);
  window.addEventListener('pagereveal',calarTransicao);

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
    var total=0,menu=0;
    try{total=cascata(blocosCascata(),false);}catch(e){}
    try{menu=deslizarMenu(url);}catch(e){}
    setTimeout(function(){location.href=url;},Math.max(Math.min(total,150),menu));
  };

  // Menu lateral: o destaque desliza do item atual ate o item clicado antes de trocar de tela
  function deslizarMenu(url){
    var sb=document.getElementById('sidebarSaga');if(!sb||!sb.animate)return 0;
    var atual=sb.querySelector('.nav-item.active'),alvo=null;
    sb.querySelectorAll('.nav-item[href],.nav-item[onclick]').forEach(function(el){if(el.getAttribute('href')===url||(el.getAttribute('onclick')||'').indexOf("'"+url+"'")>=0)alvo=el;});
    if(!atual||!alvo||atual===alvo)return 0;
    var cs=getComputedStyle(atual),s=sb.getBoundingClientRect(),a=atual.getBoundingClientRect(),b=alvo.getBoundingClientRect();
    var fantasma=document.createElement('div');
    fantasma.setAttribute('aria-hidden','true');
    fantasma.style.cssText='position:absolute;z-index:-1;pointer-events:none;left:0;top:0;width:'+a.width+'px;height:'+a.height+'px;'+
      'background:'+cs.backgroundColor+';border-left:'+cs.borderLeftWidth+' solid '+cs.borderLeftColor+';border-radius:'+cs.borderRadius+';';
    sb.style.isolation='isolate';
    sb.appendChild(fantasma);
    // os dois itens ficam sem fundo; o texto ja assume o destaque no item novo
    [atual,alvo].forEach(function(el){
      el.style.setProperty('background','transparent','important');
      el.style.setProperty('border-left-color','transparent','important');
      el.style.setProperty('transition','color .2s ease','important');
    });
    atual.classList.remove('active');alvo.classList.add('active');
    var y0=a.top-s.top+sb.scrollTop,y1=b.top-s.top+sb.scrollTop,x=a.left-s.left;
    fantasma.animate([
      {transform:'translate('+x+'px,'+y0+'px)',height:a.height+'px'},
      {transform:'translate('+x+'px,'+y1+'px)',height:b.height+'px'}
    ],{duration:240,easing:'cubic-bezier(.3,1.18,.55,1)',fill:'forwards'});
    return 210;
  }

  // Todo botao responde ao toque: afunda um pouquinho ao apertar e volta com mola (como no iPhone)
  var SEL_BOTAO='button,[role="button"],.btn-primary,.btn-secondary,.btn-danger,.nav-item,.pill,.tab-btn,.btn-view,.filter-pill,.segment,.mat-kcard,a.btn,.icon-btn,.theme-toggle';
  var apertado=null;
  function soltar(){
    var el=apertado;apertado=null;
    if(!el||!el._sagaAperto)return;
    var a=el._sagaAperto;el._sagaAperto=null;
    a.cancel();
    el.animate([{transform:'scale(.95)'},{transform:'scale(1)'}],{duration:380,easing:'cubic-bezier(.34,1.56,.64,1)'});
  }
  if(!reduz){
    document.addEventListener('pointerdown',function(ev){
      if(ev.button!==0)return;
      var el=ev.target.closest&&ev.target.closest(SEL_BOTAO);
      if(!el||!el.animate||el.disabled||el.closest('[draggable="true"]'))return;
      var r=el.getBoundingClientRect();if(r.width>420||r.height>260)return;
      soltar();apertado=el;
      el._sagaAperto=el.animate([{transform:'scale(1)'},{transform:'scale(.95)'}],{duration:110,easing:'ease-out',fill:'forwards'});
    },true);
    ['pointerup','pointercancel','dragstart'].forEach(function(t){document.addEventListener(t,soltar,true);});
    window.addEventListener('blur',soltar);
  }
})();
