/* SAGA · Ficha do cliente organizada e retrátil (19/11/2026, Dr. Victor; opção C escolhida por ele).
   "Quero poder deixar tudo em modo retrátil, como um menu suspenso. Se eu quiser deixar tudo recolhido, só o primeiro
   cartão (nome do cliente) fica fixo; o resto eu posso ocultar. Se eu ocultar as informações de um lado, as centrais
   expandem."
   - Cada bloco da ficha (seções com data-bloco no HTML) ganha o título clicável com a setinha: abre e recolhe com o
     movimento do sistema (window.sagaRecolher); fechado, mostra um resumo curto ("2 tarefas", "3 comentários").
   - Barra "Blocos da ficha": Abrir tudo, Recolher tudo, Colunas (As duas / Só a do meio / Só a lateral; a coluna que
     sobra ocupa a largura toda e fica uma faixa fina para trazer a outra de volta) e "Organizar blocos" (mostrar ou não,
     a ordem ▲▼ e em que coluna cada bloco fica; "Voltar ao padrão").
   - Tudo lembrado NESTE navegador (localStorage 'saga-ficha-blocos'). O cartão de cima (nome, contatos, abas) é fixo.
   - Links que pedem um bloco (&foco=pagamentos, &foco=andamentos, &foco=comentarios) abrem o bloco sozinhos.
   - Respeita a chavinha "Efeitos de movimento" (saga-movimento = 'reduzido' troca na hora).
   Bloco novo na ficha: pôr data-bloco (e data-titulo, se o título for desenhado depois pelo JS) e acrescentar em BLOCOS. */
(function(global){
  'use strict';
  var CHAVE='saga-ficha-blocos';
  // ordem e coluna padrão; resumo = texto curto quando o bloco está fechado
  var BLOCOS=[
    {k:'processo',col:'meio',nome:'Processo (situação, fase, etiquetas, petição)'},
    {k:'dados',col:'meio',nome:'Dados do processo'},
    {k:'recursos',col:'meio',nome:'Recursos deste processo',resumo:function(c){var b=c.querySelector('.rec-tit b');return b?n(b.textContent,'recurso','recursos'):'nenhum';}},
    {k:'andamentos',col:'meio',nome:'Andamentos no tribunal (CNJ)',resumo:function(c){var b=c.querySelector('.and-tit b');return b?n(b.textContent,'andamento','andamentos'):'';}},
    {k:'resumo_agente',col:'meio',nome:'Resumo do agente de petições'},
    {k:'checklists',col:'meio',nome:'Checklists',resumo:function(c){var q=c.querySelectorAll('.checklist-bloco').length;return q?n(q,'checklist','checklists'):'nenhum';}},
    {k:'atendimentos',col:'meio',nome:'Atendimentos'},
    // 21/11 (ideia 3 do check-up): começa FECHADO e só carrega quando a pessoa abre (saga_linha_tempo.js)
    {k:'linha_tempo',col:'meio',nome:'Linha do tempo',fechadoPadrao:true},
    {k:'comentarios',col:'meio',nome:'Comentários e histórico',resumo:function(c){var q=c.querySelectorAll('#timeline .item-timeline:not(.evento-sistema)').length;return q?n(q,'comentário','comentários'):'nenhum comentário';}},
    {k:'retorno',col:'lado',nome:'Retorno agendado',resumo:function(c){var t=c.querySelector('#blocoRetorno .titulo-retorno,#blocoRetorno h4,#blocoRetorno strong,#blocoRetorno b');return t?curto(t.textContent):'';}},
    {k:'partes',col:'lado',nome:'Partes do processo',resumo:function(c){var t=c.querySelector('#secaoPartes > .secao-titulo');var m=t&&t.textContent.match(/\((\d+)\)/);return m?n(m[1],'parte','partes'):'';}},
    {k:'responsavel',col:'lado',nome:'Responsável',resumo:function(c){var t=c.querySelector('.responsavel-nome');return t?curto(t.textContent):'';}},
    {k:'pastas',col:'lado',nome:'Pastas e documentos'},
    {k:'tarefas',col:'lado',nome:'Tarefas e intimações',resumo:function(c){var q=c.querySelectorAll('#taskList .item-tarefa-mini').length;return q?n(q,'item aberto','itens abertos'):'nada aberto';}},
    {k:'pagamentos',col:'lado',nome:'Pagamentos'},
    {k:'emails',col:'lado',nome:'E-mails enviados'},
    {k:'agente',col:'lado',nome:'Agente de petições'},
    {k:'notas',col:'lado',nome:'Notas',resumo:function(c){var q=c.querySelectorAll('.nota-ficha').length;return q?n(q,'nota','notas'):'nenhuma';}},
    {k:'acoes',col:'lado',nome:'Ações'}];
  function n(q,um,varios){q=parseInt(q,10)||0;return q+' '+(q===1?um:varios);}
  function curto(t){t=String(t||'').replace(/\s+/g,' ').trim();return t.length>34?t.slice(0,33)+'…':t;}
  function semMovimento(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function ler(){var p=null;try{p=JSON.parse(localStorage.getItem(CHAVE)||'null');}catch(e){}p=p&&typeof p==='object'?p:{};
    return {fechados:Array.isArray(p.fechados)?p.fechados:[],ocultos:Array.isArray(p.ocultos)?p.ocultos:[],colunas:['ambas','meio','lado'].indexOf(p.colunas)>=0?p.colunas:'ambas',
      ordem:p.ordem&&Array.isArray(p.ordem.meio)&&Array.isArray(p.ordem.lado)?p.ordem:null,vistos:Array.isArray(p.vistos)?p.vistos:[]};}
  var P=ler();
  // bloco novo que nasce fechado (fechadoPadrao): na 1ª vez entra na lista dos fechados; depois vale a escolha da pessoa
  BLOCOS.forEach(function(d){if(d.fechadoPadrao&&P.vistos.indexOf(d.k)<0){P.vistos.push(d.k);if(P.fechados.indexOf(d.k)<0)P.fechados.push(d.k);try{localStorage.setItem(CHAVE,JSON.stringify(P));}catch(e){}}});
  function gravar(){try{localStorage.setItem(CHAVE,JSON.stringify(P));}catch(e){}}
  var B={};// k -> {def, el, cab, corpo, res}
  var corpoFicha,colMeio,colLado,barra,trilho;

  function seta(){return '<span class="fb-seta" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';}
  // monta um bloco: o título existente vira o botão (botões de dentro dele continuam funcionando); sem título fixo, cria um
  function montar(def){
    var el=document.querySelector('[data-bloco="'+def.k+'"]');if(!el)return;
    var cab=null,primeiro=el.firstElementChild;
    if(!el.hasAttribute('data-titulo')&&primeiro&&primeiro.classList.contains('secao-titulo'))cab=primeiro;
    else{cab=document.createElement('div');cab.className='secao-titulo';cab.textContent=el.getAttribute('data-titulo')||def.nome;el.insertBefore(cab,el.firstChild);}
    cab.classList.add('fb-cab');cab.setAttribute('role','button');cab.setAttribute('tabindex','0');
    cab.insertAdjacentHTML('afterbegin',seta());
    var res=document.createElement('span');res.className='fb-resumo';
    // o resumo fica antes dos botões do título (ex.: "+ Marcar atendimento"), que somem com o bloco fechado
    cab.appendChild(res);
    var corpo=document.createElement('div');corpo.className='fb-corpo';
    while(cab.nextSibling)corpo.appendChild(cab.nextSibling);
    el.appendChild(corpo);el.classList.add('fb-bloco');
    var b={def:def,el:el,cab:cab,corpo:corpo,res:res};B[def.k]=b;
    cab.addEventListener('click',function(ev){if(ev.target.closest('button,a,input,select,textarea,label,[data-pg-remover]')&&!ev.target.closest('.fb-seta'))return;alternar(def.k);});
    cab.addEventListener('keydown',function(ev){if(ev.target!==cab)return;if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();alternar(def.k);}});
    var fechado=P.fechados.indexOf(def.k)>=0;
    estadoVisual(b,!fechado);if(fechado)corpo.hidden=true;
    try{new MutationObserver(function(){if(b.el.classList.contains('fb-fechado'))atualizarResumo(b);}).observe(corpo,{childList:true,subtree:true,characterData:true});}catch(e){}
  }
  function estadoVisual(b,aberto){b.el.classList.toggle('fb-fechado',!aberto);b.cab.setAttribute('aria-expanded',aberto?'true':'false');
    b.cab.title=aberto?'Recolher este bloco':'Abrir este bloco';if(!aberto)atualizarResumo(b);else b.res.textContent='';}
  function atualizarResumo(b){var t='';try{t=b.def.resumo?b.def.resumo(b.corpo):'';}catch(e){}if(b.res.textContent!==t)b.res.textContent=t;}
  function abrirFechar(k,abrir,semAnimar){var b=B[k];if(!b)return;var aberto=!b.el.classList.contains('fb-fechado');if(aberto===abrir)return;
    estadoVisual(b,abrir);
    var i=P.fechados.indexOf(k);if(abrir&&i>=0)P.fechados.splice(i,1);if(!abrir&&i<0)P.fechados.push(k);gravar();
    if(semAnimar||!global.sagaRecolher||b.el.hidden||b.el.offsetParent===null){b.corpo.hidden=!abrir;return;}
    global.sagaRecolher(b.corpo,!abrir);}
  function alternar(k){var b=B[k];if(b)abrirFechar(k,b.el.classList.contains('fb-fechado'));}
  function todos(abrir){Object.keys(B).forEach(function(k){abrirFechar(k,abrir);});}

  /* ---------- colunas e ordem ---------- */
  function ordemPadrao(){var o={meio:[],lado:[]};BLOCOS.forEach(function(d){o[d.col].push(d.k);});return o;}
  function ordemAtual(){var o=P.ordem||ordemPadrao(),vistos={};var r={meio:[],lado:[]};
    ['meio','lado'].forEach(function(c){(o[c]||[]).forEach(function(k){if(B[k]&&!vistos[k]){vistos[k]=1;r[c].push(k);}});});
    BLOCOS.forEach(function(d){if(B[d.k]&&!vistos[d.k])r[d.col].push(d.k);});return r;}
  function aplicarOrdem(){var o=ordemAtual();o.meio.forEach(function(k){colMeio.appendChild(B[k].el);});o.lado.forEach(function(k){colLado.appendChild(B[k].el);});
    Object.keys(B).forEach(function(k){B[k].el.classList.toggle('fb-oculto',P.ocultos.indexOf(k)>=0);});}
  function aplicarColunas(animar){
    var faz=function(){corpoFicha.setAttribute('data-fb-colunas',P.colunas);
      if(barra)barra.querySelectorAll('[data-fb-col]').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-fb-col')===P.colunas);});
      if(trilho){trilho.hidden=P.colunas==='ambas';trilho.querySelector('span').textContent=P.colunas==='meio'?'Painel lateral recolhido':'Processo recolhido';
        trilho.title=P.colunas==='meio'?'Abrir o painel lateral':'Abrir o processo';}};
    if(animar&&!semMovimento()&&document.startViewTransition){try{document.startViewTransition(faz);return;}catch(e){}}
    faz();}
  function mudarColunas(c){if(P.colunas===c)return;P.colunas=c;gravar();aplicarColunas(true);}

  /* ---------- barra e janela "Organizar blocos" ---------- */
  function montarBarra(){
    barra=document.getElementById('fichaBlocosBarra');if(!barra)return;
    barra.innerHTML='<b class="fb-barra-tit" title="Clique no título de cada bloco para abrir ou recolher. A escolha fica guardada neste navegador.">Blocos da ficha</b><span class="fb-esp"></span>'
      +'<button type="button" class="btn-secundario fb-b" data-fb-acao="abrir">Abrir tudo</button><button type="button" class="btn-secundario fb-b" data-fb-acao="recolher">Recolher tudo</button>'
      +'<span class="fb-grupo" role="group" aria-label="Colunas"><span class="fb-rot">Colunas:</span><button type="button" class="fb-b" data-fb-col="ambas">As duas</button><button type="button" class="fb-b" data-fb-col="meio">Só a do meio</button><button type="button" class="fb-b" data-fb-col="lado">Só a lateral</button></span>'
      +'<button type="button" class="btn-secundario fb-b" data-fb-acao="organizar" aria-expanded="false"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="6" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="12" r="2" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="18" r="2" stroke="currentColor" stroke-width="1.6"/></svg>Organizar blocos</button>'
      +'<div class="fb-org" id="fichaBlocosOrg" hidden></div>';
    barra.hidden=false;
    barra.addEventListener('click',function(ev){var x=ev.target.closest('[data-fb-acao],[data-fb-col]');if(!x||!barra.contains(x))return;
      if(x.hasAttribute('data-fb-col'))return mudarColunas(x.getAttribute('data-fb-col'));
      var a=x.getAttribute('data-fb-acao');if(a==='abrir')todos(true);else if(a==='recolher')todos(false);else if(a==='organizar')organizar(true);});
    document.addEventListener('mousedown',function(ev){var o=document.getElementById('fichaBlocosOrg');if(o&&!o.hidden&&!o.contains(ev.target)&&!ev.target.closest('[data-fb-acao="organizar"]'))organizar(false);});
    document.addEventListener('keydown',function(ev){var o=document.getElementById('fichaBlocosOrg');if(ev.key==='Escape'&&o&&!o.hidden)organizar(false);});
    // faixa fina para trazer de volta a coluna escondida
    trilho=document.createElement('button');trilho.type='button';trilho.className='fb-trilho';trilho.hidden=true;
    trilho.innerHTML='<i aria-hidden="true">‹</i><span></span>';trilho.addEventListener('click',function(){mudarColunas('ambas');});
    corpoFicha.appendChild(trilho);
  }
  function organizar(abrir){var o=document.getElementById('fichaBlocosOrg'),bt=barra.querySelector('[data-fb-acao="organizar"]');if(!o)return;
    if(abrir===undefined)abrir=o.hidden;if(abrir===!o.hidden)return;bt.setAttribute('aria-expanded',abrir?'true':'false');
    if(abrir){desenharOrg();o.hidden=true;if(global.sagaRecolher)global.sagaRecolher(o,false);else o.hidden=false;}
    else{if(global.sagaRecolher)global.sagaRecolher(o,true);else o.hidden=true;}}
  function desenharOrg(){var o=document.getElementById('fichaBlocosOrg');if(!o)return;var ord=ordemAtual();
    var linha=function(k,col,i,tot){var b=B[k],vis=P.ocultos.indexOf(k)<0,semDado=b.el.hidden;
      return '<div class="fb-org-l'+(vis?'':' fb-org-off')+'" data-k="'+k+'"><label class="fb-org-nome"><input type="checkbox" data-fb-vis'+(vis?' checked':'')+'> <span>'+b.def.nome+(semDado?' <small>(aparece quando houver)</small>':'')+'</span></label>'
        +'<span class="fb-org-col" role="group" aria-label="Coluna"><button type="button" data-fb-mover="meio" class="'+(col==='meio'?'active':'')+'">Meio</button><button type="button" data-fb-mover="lado" class="'+(col==='lado'?'active':'')+'">Lado</button></span>'
        +'<span class="fb-org-mv"><button type="button" data-fb-sobe title="Subir"'+(i===0?' disabled':'')+'>▲</button><button type="button" data-fb-desce title="Descer"'+(i===tot-1?' disabled':'')+'>▼</button></span></div>';};
    var h='<div class="fb-org-topo"><b>Organizar blocos da ficha</b><span>Marque o que aparece, escolha a coluna e a ordem. Vale só neste navegador.</span></div>';
    [['meio','Coluna do meio'],['lado','Coluna lateral']].forEach(function(c){h+='<div class="fb-org-sec">'+c[1]+'</div>';ord[c[0]].forEach(function(k,i){h+=linha(k,c[0],i,ord[c[0]].length);});});
    h+='<div class="fb-org-pe"><button type="button" class="btn-secundario" data-fb-padrao>Voltar ao padrão</button><span class="fb-esp"></span><button type="button" class="btn-secundario" data-fb-fechar>Fechar</button></div>';
    o.innerHTML=h;
    if(!o._ligado){o._ligado=true;
      o.addEventListener('click',function(ev){var t=ev.target;
        if(t.closest('[data-fb-fechar]'))return organizar(false);
        if(t.closest('[data-fb-padrao]')){P.ordem=null;P.ocultos=[];P.colunas='ambas';gravar();aplicarOrdem();aplicarColunas(true);desenharOrg();return;}
        var l=t.closest('.fb-org-l');if(!l)return;var k=l.getAttribute('data-k'),ord=ordemAtual(),col=ord.meio.indexOf(k)>=0?'meio':'lado',lista=ord[col],i=lista.indexOf(k);
        var mv=t.closest('[data-fb-mover]');
        if(mv){var nova=mv.getAttribute('data-fb-mover');if(nova===col)return;lista.splice(i,1);ord[nova].push(k);}
        else if(t.closest('[data-fb-sobe]')&&i>0){lista.splice(i,1);lista.splice(i-1,0,k);}
        else if(t.closest('[data-fb-desce]')&&i<lista.length-1){lista.splice(i,1);lista.splice(i+1,0,k);}
        else return;
        P.ordem=ord;gravar();
        var faz=function(){aplicarOrdem();};
        if(!semMovimento()&&document.startViewTransition){try{document.startViewTransition(faz);}catch(e){faz();}}else faz();
        desenharOrg();});
      o.addEventListener('change',function(ev){var c=ev.target.closest('[data-fb-vis]');if(!c)return;var k=c.closest('.fb-org-l').getAttribute('data-k'),i=P.ocultos.indexOf(k);
        if(c.checked&&i>=0)P.ocultos.splice(i,1);if(!c.checked&&i<0)P.ocultos.push(k);gravar();
        var b=B[k];c.closest('.fb-org-l').classList.toggle('fb-org-off',!c.checked);
        if(c.checked){b.el.classList.remove('fb-oculto');if(global.sagaRecolher&&!b.el.hidden){b.el.style.display='none';b.el.style.display='';global.sagaRecolher(b.el,false);}}
        else if(global.sagaRecolher&&!b.el.hidden&&b.el.offsetParent!==null)global.sagaRecolher(b.el,true,function(){b.el.hidden=false;b.el.classList.add('fb-oculto');});
        else b.el.classList.add('fb-oculto');});}
  }

  /* ---------- pedidos de fora: abrir um bloco (links com &foco=..., outras telas) ---------- */
  function abrir(k,rolar){var b=B[k];if(!b)return;b.el.classList.remove('fb-oculto');
    if(P.colunas!=='ambas'){var o=ordemAtual(),col=o.meio.indexOf(k)>=0?'meio':'lado';if(P.colunas!==col){P.colunas='ambas';gravar();aplicarColunas(false);}}
    abrirFechar(k,true,true);if(rolar)setTimeout(function(){b.el.scrollIntoView({behavior:semMovimento()?'auto':'smooth',block:'start'});},60);}
  // qualquer elemento de dentro de um bloco fechado que alguém mande rolar até ele abre o bloco antes
  function abrirOndeEsta(el){var s=el&&el.closest&&el.closest('.fb-bloco');if(s){var k=s.getAttribute('data-bloco');if(B[k]&&(s.classList.contains('fb-fechado')||s.classList.contains('fb-oculto')))abrir(k,false);}}

  function iniciar(){
    corpoFicha=document.getElementById('processContentFrame');if(!corpoFicha)return;
    colMeio=corpoFicha.querySelector('.coluna-principal');colLado=corpoFicha.querySelector('.coluna-lateral');if(!colMeio||!colLado)return;
    BLOCOS.forEach(montar);
    montarBarra();aplicarOrdem();aplicarColunas(false);
    // links que pedem um bloco
    try{var f=new URLSearchParams(location.search).get('foco');var mapa={pagamentos:'pagamentos',andamentos:'andamentos',comentarios:'comentarios',tarefas:'tarefas',documentos:'pastas',relatorios:'pastas'};if(f&&mapa[f])abrir(mapa[f],false);}catch(e){}
    // scrollIntoView em algo de dentro de um bloco fechado (ex.: SagaPagamentos.rolar, SagaAndamentos.rolar): abre antes
    var orig=Element.prototype.scrollIntoView;
    if(!orig._fichaBlocos){var novo=function(){try{abrirOndeEsta(this);}catch(e){}return orig.apply(this,arguments);};novo._fichaBlocos=true;Element.prototype.scrollIntoView=novo;}
  }
  global.SagaFichaBlocos={abrir:abrir,fechar:function(k){abrirFechar(k,false);},todos:todos,colunas:mudarColunas,organizar:organizar,BLOCOS:BLOCOS};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})(window);
