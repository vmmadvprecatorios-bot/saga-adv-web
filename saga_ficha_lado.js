/* =====================================================================================
   SAGA · Ficha ao lado (09/11, pedido do Dr. Victor: "ficha ao lado sem sair da lista")
   Na Lista (planilha e Kanban), o clique no nome do cliente abre a ficha num painel à direita
   e a lista continua na tela. ↑ ↓ passam para o cliente de cima / de baixo; "Tela cheia" abre a
   ficha como antes; Esc ou × fecham (a lista se atualiza em silêncio, sem piscar).
   Celular e telas estreitas, ou quem escolher "Em tela cheia" (Ajustar ▾), continuam abrindo como antes.
   Uso: SagaFichaLado.configurar({nomeDe:fn(id), telaCheia:fn(id), aoFechar:fn()});
        SagaFichaLado.abrir(id) → true se abriu ao lado (false: a tela deve abrir a ficha como antes)
   ===================================================================================== */
(function(global){
  'use strict';
  var CHAVE='saga-ficha-ao-lado',LARG_MIN=1000,CURVA='cubic-bezier(.22,.78,.25,1)',FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  var cfg={},painel=null,quadro=null,atualId=null,fechando=false,obs=null,espera=null;

  function preferido(){try{return localStorage.getItem(CHAVE)!=='nao';}catch(e){return true;}}
  function definir(sim){try{localStorage.setItem(CHAVE,sim?'sim':'nao');}catch(e){}}
  function semMov(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function idCss(id){return String(id).replace(/["\\]/g,'');}
  function visivel(el){return !!(el.offsetParent||el.getClientRects().length);}

  function estilo(){
    if(document.getElementById('spLadoEstilo'))return;
    var s=document.createElement('style');s.id='spLadoEstilo';
    s.textContent=
      '.sp-lado{position:fixed;right:0;bottom:0;width:min(860px,54vw);min-width:480px;z-index:150;display:flex;flex-direction:column;background:var(--panel-solid,#212e44);border-left:1px solid var(--border);box-shadow:-18px 0 40px rgba(0,0,0,.28)}'+
      '.sp-lado-topo{display:flex;align-items:center;gap:6px;padding:8px 10px 8px 16px;border-bottom:1px solid var(--border-soft);min-height:48px}'+
      '.sp-lado-nome{flex:1;min-width:0;font-weight:700;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.sp-lado-pos{font-size:11px;color:var(--muted);margin-right:4px;font-variant-numeric:tabular-nums;white-space:nowrap}'+
      '.sp-lado-btn{height:28px;padding:0 10px;font-size:12px;border-radius:8px}.sp-lado-btn:disabled{opacity:.4;cursor:default}'+
      '.sp-lado-x{width:30px;height:30px;border:0;background:none;color:var(--muted);font-size:20px;line-height:1;border-radius:8px;cursor:pointer}.sp-lado-x:hover{color:var(--text);background:color-mix(in srgb,var(--text) 6%,transparent)}'+
      '.sp-lado-corpo{position:relative;flex:1;min-height:0}'+
      '.sp-lado-corpo iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;transition:opacity .3s '+CURVA+'}'+
      '.sp-lado.carregando iframe{opacity:.25}'+
      '.sp-lado-aviso{position:absolute;top:22px;left:0;right:0;text-align:center;font-size:12px;color:var(--muted);opacity:0;pointer-events:none;transition:opacity .3s '+CURVA+'}.sp-lado.carregando .sp-lado-aviso{opacity:1}'+
      'html.sp-lado-aberto .conteudo{padding-right:calc(min(860px,54vw) + 18px)!important}'+
      '#tbodyPrincipal tr.sp-lado-atual>td{background:color-mix(in srgb,var(--gold) 11%,transparent)!important}'+
      '.card-kanban.sp-lado-atual{outline:2px solid color-mix(in srgb,var(--gold) 65%,transparent);outline-offset:1px}';
    document.head.appendChild(s);
  }
  // a ordem em que os clientes aparecem agora (planilha; se não houver, o Kanban)
  function idsNaTela(){
    var ids=Array.prototype.filter.call(document.querySelectorAll('#tbodyPrincipal tr[data-sp-proc]'),visivel).map(function(tr){return tr.dataset.spProc;});
    if(!ids.length)ids=Array.prototype.filter.call(document.querySelectorAll('#kanbanView .card-kanban[data-processo-id]'),visivel).map(function(c){return c.dataset.processoId;});
    return ids.filter(function(x,i){return ids.indexOf(x)===i;});
  }
  function marcar(rolar){
    document.querySelectorAll('.sp-lado-atual').forEach(function(x){x.classList.remove('sp-lado-atual');});
    if(!atualId)return;
    var achados=document.querySelectorAll('#tbodyPrincipal tr[data-sp-proc="'+idCss(atualId)+'"],#kanbanView .card-kanban[data-processo-id="'+idCss(atualId)+'"]');
    achados.forEach(function(x){x.classList.add('sp-lado-atual');});
    if(rolar&&achados[0]&&achados[0].scrollIntoView)try{achados[0].scrollIntoView({block:'nearest',inline:'nearest',behavior:semMov()?'auto':'smooth'});}catch(e){}
  }
  function setas(){
    if(!painel)return;
    var ids=idsNaTela(),i=ids.indexOf(String(atualId));
    painel.querySelector('[data-lado="ant"]').disabled=i<=0;
    painel.querySelector('[data-lado="prox"]').disabled=i<0||i>=ids.length-1;
    painel.querySelector('.sp-lado-pos').textContent=i>=0?(i+1)+' de '+ids.length:'';
  }
  // a planilha redesenha as linhas (filtro, ordem, gravação): a marca e as setas acompanham
  function vigiar(){
    if(obs||!global.MutationObserver)return;
    obs=new MutationObserver(function(){clearTimeout(espera);espera=setTimeout(function(){marcar(false);setas();},60);});
    ['listaView','kanbanView'].forEach(function(id){var el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true});});
  }
  function deslizarConteudo(){
    var ct=document.querySelector('.conteudo');if(!ct||semMov())return;
    ct.style.transition='padding-right 380ms '+CURVA;clearTimeout(ct._spLado);ct._spLado=setTimeout(function(){ct.style.transition='';},420);
  }
  function montar(){
    estilo();
    painel=document.createElement('aside');painel.id='spFichaLado';painel.className='sp-lado';
    painel.setAttribute('role','dialog');painel.setAttribute('aria-label','Ficha do cliente ao lado da lista');
    var topo=document.getElementById('topbarSaga');painel.style.top=Math.max(0,topo?Math.round(topo.getBoundingClientRect().bottom):64)+'px';
    painel.innerHTML='<div class="sp-lado-topo"><div class="sp-lado-nome"></div><span class="sp-lado-pos"></span>'+
      '<button type="button" class="btn-secondary sp-lado-btn" data-lado="ant" title="Cliente de cima na lista" aria-label="Cliente de cima na lista">↑</button>'+
      '<button type="button" class="btn-secondary sp-lado-btn" data-lado="prox" title="Cliente de baixo na lista" aria-label="Cliente de baixo na lista">↓</button>'+
      '<button type="button" class="btn-secondary sp-lado-btn" data-lado="cheia" title="Abrir a ficha em tela cheia">Tela cheia</button>'+
      '<button type="button" class="sp-lado-x" data-lado="fechar" title="Fechar (Esc)" aria-label="Fechar">×</button></div>'+
      '<div class="sp-lado-corpo"><div class="sp-lado-aviso">Abrindo a ficha…</div><iframe title="Ficha do cliente"></iframe></div>';
    document.body.appendChild(painel);quadro=painel.querySelector('iframe');
    painel.addEventListener('click',function(e){
      var b=e.target.closest('[data-lado]');if(!b||b.disabled)return;var a=b.dataset.lado;
      if(a==='fechar'){fechar();return;}
      if(a==='cheia'){var id=atualId;fechar(true);if(cfg.telaCheia)cfg.telaCheia(id);else location.href=FICHA+'?processo_id='+encodeURIComponent(id);return;}
      var ids=idsNaTela(),i=ids.indexOf(String(atualId)),j=a==='ant'?i-1:i+1;
      if(i>=0&&ids[j])carregar(ids[j],true);
    });
    quadro.addEventListener('load',function(){
      if(!painel)return;painel.classList.remove('carregando');
      var url='';try{url=quadro.contentWindow.location.href;}catch(e){}
      // a ficha saiu dela mesma (processo excluído, sessão vencida...): fecha o painel; outra tela abre inteira
      if(url&&url!=='about:blank'&&url.indexOf(FICHA)===-1){fechar();if(url.indexOf('lista_processos_padrao_metalico.html')===-1)location.href=url;}
    });
    document.documentElement.classList.add('sp-lado-aberto');deslizarConteudo();
    if(!semMov())painel.animate([{transform:'translateX(100%)',opacity:.5},{transform:'none',opacity:1}],{duration:380,easing:CURVA});
    vigiar();
  }
  function carregar(id,rolar){
    atualId=String(id);
    painel.querySelector('.sp-lado-nome').textContent=(cfg.nomeDe&&cfg.nomeDe(id))||'Ficha do cliente';
    painel.classList.add('carregando');
    quadro.src=FICHA+'?processo_id='+encodeURIComponent(id)+'&ao_lado=1';
    marcar(!!rolar);setas();
  }
  function abrir(id){
    if(!id||fechando||!preferido()||window.innerWidth<LARG_MIN)return false;
    if(!painel)montar();
    if(String(id)!==String(atualId))carregar(id,false);
    return true;
  }
  function fechar(semAtualizar){
    if(!painel||fechando)return;
    var p=painel;fechando=true;painel=null;quadro=null;atualId=null;marcar(false);
    if(obs){obs.disconnect();obs=null;}
    document.documentElement.classList.remove('sp-lado-aberto');deslizarConteudo();
    var fim=function(){p.remove();fechando=false;};
    if(semMov())fim();else{var an=p.animate([{transform:'none',opacity:1},{transform:'translateX(100%)',opacity:.5}],{duration:300,easing:CURVA,fill:'forwards'});an.onfinish=fim;an.oncancel=fim;}
    if(!semAtualizar&&cfg.aoFechar)try{cfg.aoFechar();}catch(e){}
  }
  // Esc dentro da ficha (sem janela aberta lá) também fecha o painel
  global.addEventListener('message',function(e){if(e.origin===location.origin&&e.data&&e.data.saga==='ficha-lado-fechar')fechar();});
  document.addEventListener('keydown',function(e){
    if(!painel||e.key!=='Escape'||e.defaultPrevented)return;
    if(document.querySelector('.modal-overlay.open,.modal-overlay.ativo,.sp-ov,.sp-menu,#sagaConfirma'))return;
    fechar();
  });
  global.addEventListener('resize',function(){if(painel&&global.innerWidth<LARG_MIN)fechar();});

  global.SagaFichaLado={configurar:function(o){cfg=o||{};},abrir:abrir,fechar:fechar,aberto:function(){return !!painel;},atual:function(){return atualId;},preferido:preferido,definir:definir};
})(window);
