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
    'html.saga-entrando body{opacity:0 !important;}'+
    'body{transition:opacity .14s ease;}'+
    'html.saga-saindo body{opacity:0 !important;transition:opacity .08s ease;}'+
    '@media (prefers-reduced-motion:reduce){body,html.saga-saindo body{transition:none !important;}}';
  (document.head||html).appendChild(estilo);
  html.classList.add('saga-entrando');

  if(!temSessao){
    location.replace(LOGIN);
    return;
  }

  function mostrar(){html.classList.remove('saga-entrando');}
  document.addEventListener('saga-ui-visivel',mostrar);
  document.addEventListener('saga-ui-pronto',mostrar);
  // Rede de seguranca: se algo travar, a tela aparece mesmo assim
  setTimeout(mostrar,6000);

  // Volta pelo botao do navegador (pagina guardada em cache): nao fica apagada
  window.addEventListener('pageshow',function(ev){
    if(ev.persisted){html.classList.remove('saga-saindo');mostrar();}
  });

  // Saida suave ao trocar de tela pelo menu
  window.sagaIrPara=function(url){
    if(!url)return;
    var reduz=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduz){location.href=url;return;}
    html.classList.add('saga-saindo');
    setTimeout(function(){location.href=url;},80);
  };
})();
