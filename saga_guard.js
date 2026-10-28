// SAGA GUARD - porta de entrada das telas internas.
// Carregado no <head>, antes de qualquer conteudo aparecer:
// 1) sem login salvo no navegador, vai direto para o login (nada da tela aparece);
// 2) com login, a tela fica escondida ate o saga_ui.js confirmar a sessao e as
//    permissoes (evento 'saga-ui-pronto'); entao aparece com um fade suave.
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
    // Menus superior e lateral ficam parados; so o conteudo da tela faz a transicao
    '@keyframes sagaEntra{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}'+
    '@keyframes sagaSai{from{opacity:1;}to{opacity:0;transform:translateY(-4px);}}'+
    'html.saga-carregando .saga-conteudo{opacity:0 !important;}'+
    'html.saga-entrou .saga-conteudo{animation:sagaEntra .16s ease-out backwards;}'+
    'html.saga-saindo .saga-conteudo{animation:sagaSai .09s ease-in forwards;}'+
    // Enquanto a tela monta, os menus nao animam nada (evita a tremida do menu lateral)
    'html.saga-fixando #sidebarSaga,html.saga-fixando #sidebarSaga *,html.saga-fixando #topbarSaga,html.saga-fixando #topbarSaga *{transition:none !important;animation:none !important;}'+
    '@media (prefers-reduced-motion:reduce){html.saga-entrou .saga-conteudo,html.saga-saindo .saga-conteudo{animation:none !important;}}';
  (document.head||html).appendChild(estilo);
  html.classList.add('saga-entrando','saga-carregando','saga-fixando');

  if(!temSessao){
    location.replace(LOGIN);
    return;
  }

  function mostrarMoldura(){html.classList.remove('saga-entrando');}
  var jaMostrou=false;
  function mostrar(){
    mostrarMoldura();
    if(jaMostrou)return;jaMostrou=true;
    html.classList.add('saga-entrou');
    html.classList.remove('saga-carregando');
    setTimeout(function(){html.classList.remove('saga-entrou');},400);
  }
  document.addEventListener('saga-ui-moldura',mostrarMoldura);
  document.addEventListener('saga-ui-visivel',mostrar);
  document.addEventListener('saga-ui-pronto',function(){
    mostrar();
    setTimeout(function(){html.classList.remove('saga-fixando');},400);
  });
  // Rede de seguranca: se algo travar, a tela aparece mesmo assim
  setTimeout(function(){mostrar();html.classList.remove('saga-fixando');},6000);

  // Volta pelo botao do navegador (pagina guardada em cache): nao fica apagada
  window.addEventListener('pageshow',function(ev){
    if(ev.persisted){html.classList.remove('saga-saindo','saga-carregando');mostrarMoldura();}
  });

  // Saida suave ao trocar de tela pelo menu
  window.sagaIrPara=function(url){
    if(!url)return;
    var reduz=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduz){location.href=url;return;}
    html.classList.add('saga-saindo');
    setTimeout(function(){location.href=url;},90);
  };
})();
