/* SAGA · Ficha em 3 MÓDULOS (21/11/2026, Dr. Victor; layout aprovado: "é exatamente isso").
   (1) CLIENTE (cartão de cima: nome, código, contatos, abas dos processos), (2) PROCESSO (coluna do meio) e
   (3) PAINEL LATERAL (retorno, partes, responsável, pastas, tarefas, pagamentos...): cada um num cartão com borda
   própria e título com a setinha que recolhe/abre o MÓDULO INTEIRO; os blocos de dentro continuam recolhendo um por um
   (saga_ficha_blocos.js).
   - Cliente recolhido: fica uma linha (nome · código) e as ABAS DOS PROCESSOS continuam à vista (decisão dele); o resto sobe.
   - Painel lateral recolhido: o Processo ocupa a largura toda (e vice-versa). É o MESMO "Colunas" da barra Blocos da
     ficha (SagaFichaBlocos.colunas: 'ambas' | 'meio' | 'lado'); os dois caminhos mostram a mesma coisa.
   - Escolha do Cliente lembrada em localStorage 'saga-ficha-modulos' (acompanha a conta); as colunas ficam no
     'saga-ficha-blocos' de sempre. Movimento suave (sagaRecolher); "Efeitos de movimento" desligado troca na hora.
   - No celular os cartões ficam empilhados e cada um recolhe. */
(function(){
  'use strict';
  var CHAVE='saga-ficha-modulos';
  function ler(){try{return JSON.parse(localStorage.getItem(CHAVE)||'{}')||{};}catch(e){return {};}}
  function gravar(o){try{localStorage.setItem(CHAVE,JSON.stringify(o));}catch(e){}}
  var SETA='<svg class="fm-seta" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CSS=[
    '#fichaCliente.fm{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;display:flex;flex-direction:column;gap:14px;overflow:visible;backdrop-filter:none!important}',
    '#fichaCliente.fm>.ficha-header,#fichaCliente.fm .coluna-principal,#fichaCliente.fm .coluna-lateral{background:var(--panel);border:1px solid var(--border);border-radius:16px;box-shadow:0 6px 22px rgba(0,0,0,.10);min-width:0}',
    '#fichaCliente.fm>.ficha-header{border-bottom:1px solid var(--border)}',
    '#fichaCliente.fm>.fb-barra{border:1px solid var(--border-soft);border-radius:12px;background:var(--panel)}',
    '#fichaCliente.fm .ficha-corpo{gap:14px;background:none;border:0;align-items:start}',
    '#fichaCliente.fm .coluna-principal{border-right:1px solid var(--border)!important;border-bottom:1px solid var(--border)!important}',
    '#fichaCliente.fm .ficha-corpo:not([data-fb-colunas="ambas"])>.fb-trilho:not([hidden]){border:1px solid var(--border-soft)!important;border-radius:14px;background:var(--panel)!important}',
    '#fichaCliente.fm>.localization-view{border:1px solid var(--border);border-radius:16px;background:var(--panel)}',
    '.fm-tit{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding:0 0 10px;border-bottom:1px solid var(--border-soft);min-width:0}',
    '.fm-tit button{all:unset;display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);white-space:nowrap;padding:4px 2px;min-height:28px}',
    '.fm-tit button,.fm-tit button:hover,.fm-tit button:focus,.fm-tit button:active{background:none!important;border:0!important;box-shadow:none!important}',
    '.fm-tit button:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:6px}',
    '.fm-seta{transition:transform .32s cubic-bezier(.22,.78,.25,1)}',
    '.fm-tit[data-fechado="1"] .fm-seta{transform:rotate(-90deg)}',
    '.fm-res{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}',
    '.fm-tit:not([data-fechado="1"]) .fm-res{visibility:hidden}',
    '.ficha-header .fm-cab-corpo[hidden]{display:none!important}',
    '.ficha-header.fm-recolhido .fm-tit{margin-bottom:8px}',
    '@media(max-width:760px){.fm-tit button{min-height:40px}}',
    'html.saga-sem-movimento .fm-seta{transition:none}',
    '.coluna-lateral>.fm-tit{grid-column:1/-1}',
    // celular (ficha estreita): as colunas não valem (cartões empilhados); cada módulo recolhe no próprio cartão
    '@container ficha (max-width:760px){.coluna-principal.fm-cel-fechado>*:not(.fm-tit),.coluna-lateral.fm-cel-fechado>*:not(.fm-tit){display:none!important}.coluna-principal.fm-cel-fechado .fm-tit,.coluna-lateral.fm-cel-fechado .fm-tit{margin-bottom:0;border-bottom:0;padding-bottom:0}}'
  ].join('\n');

  function iniciar(){
    var ficha=document.getElementById('fichaCliente'),cab=ficha&&ficha.querySelector('.ficha-header'),corpo=document.getElementById('processContentFrame');
    if(!ficha||!cab||!corpo||ficha.classList.contains('fm'))return;
    var meio=corpo.querySelector('.coluna-principal'),lado=corpo.querySelector('.coluna-lateral');if(!meio||!lado)return;
    var st=document.createElement('style');st.id='fichaModulosCss';st.textContent=CSS;document.head.appendChild(st);
    ficha.classList.add('fm');

    // CLIENTE: tudo do cartão de cima vai para um embrulho que recolhe; as abas dos processos ficam de fora (à vista)
    var abas=cab.querySelector('.process-tabs');
    var emb=document.createElement('div');emb.className='fm-cab-corpo';
    Array.prototype.slice.call(cab.childNodes).forEach(function(n){if(n!==abas)emb.appendChild(n);});
    cab.insertBefore(emb,abas||null);
    function titulo(el,k,nome){var t=document.createElement('div');t.className='fm-tit';t.setAttribute('data-mod',k);
      t.innerHTML='<button type="button" data-mod-alternar="'+k+'" aria-expanded="true">'+SETA+nome+'</button><span class="fm-res"></span>';
      el.insertBefore(t,el.firstChild);return t;}
    var tCab=titulo(cab,'topo','Cliente'),tMeio=titulo(meio,'meio','Processo'),tLado=titulo(lado,'lado','Painel lateral');

    function texto(sel,raiz){var e=(raiz||document).querySelector(sel);return e?String(e.textContent||'').replace(/\s+/g,' ').trim():'';}
    function resumos(){
      var nome=texto('.ficha-titulo h1',emb),cod=texto('#fichaCodigoCliente b',emb);
      tCab.querySelector('.fm-res').textContent=[nome,cod].filter(Boolean).join(' · ')+' · telefones, e-mails e endereço recolhidos';
      var aba=document.querySelector('#processTabs .active, #processTabs [aria-selected="true"]');
      tMeio.querySelector('.fm-res').textContent=aba?String(aba.textContent||'').replace(/\s+/g,' ').trim():'';
      var visiveis=Array.prototype.slice.call(lado.querySelectorAll('[data-bloco]')).filter(function(b){return !b.hidden;}).length;
      tLado.querySelector('.fm-res').textContent=visiveis+(visiveis===1?' bloco':' blocos')+': retorno, partes, responsável, pastas, tarefas…';
    }
    function marcar(t,fechado){t.setAttribute('data-fechado',fechado?'1':'0');var b=t.querySelector('button');b.setAttribute('aria-expanded',fechado?'false':'true');
      b.title=fechado?'Abrir este módulo':'Recolher este módulo';}
    function colunas(){return corpo.getAttribute('data-fb-colunas')||'ambas';}
    function estreita(){return ficha.getBoundingClientRect().width<=760;}
    function pintarColunas(){
      if(estreita()){P=ler();meio.classList.toggle('fm-cel-fechado',!!P.celMeio);lado.classList.toggle('fm-cel-fechado',!!P.celLado);marcar(tMeio,!!P.celMeio);marcar(tLado,!!P.celLado);}
      else{meio.classList.remove('fm-cel-fechado');lado.classList.remove('fm-cel-fechado');var c=colunas();marcar(tMeio,c==='lado');marcar(tLado,c==='meio');}
      resumos();}

    // estado guardado do Cliente
    var P=ler();
    if(P.topo){emb.hidden=true;cab.classList.add('fm-recolhido');}
    marcar(tCab,!!P.topo);pintarColunas();

    document.addEventListener('click',function(e){
      var b=e.target.closest('[data-mod-alternar]');if(!b||!ficha.contains(b))return;
      var k=b.getAttribute('data-mod-alternar');
      if(k==='topo'){
        var fechar=!emb.hidden;P=ler();P.topo=fechar;gravar(P);resumos();marcar(tCab,fechar);cab.classList.toggle('fm-recolhido',fechar);
        if(window.sagaRecolher)window.sagaRecolher(emb,fechar);else emb.hidden=fechar;return;
      }
      if(estreita()){var chave=k==='lado'?'celLado':'celMeio',col=k==='lado'?lado:meio;P=ler();P[chave]=!P[chave];gravar(P);
        col.style.opacity='0';col.classList.toggle('fm-cel-fechado',P[chave]);marcar(k==='lado'?tLado:tMeio,P[chave]);
        var sem=document.documentElement.classList.contains('saga-sem-movimento');
        col.style.transition=sem?'':'opacity .26s cubic-bezier(.22,.78,.25,1)';requestAnimationFrame(function(){col.style.opacity='';setTimeout(function(){col.style.transition='';},300);});
        return;}
      var c=colunas(),alvo=k==='lado'?(c==='meio'?'ambas':'meio'):(c==='lado'?'ambas':'lado');
      if(window.SagaFichaBlocos&&SagaFichaBlocos.colunas)SagaFichaBlocos.colunas(alvo);
    });
    // a barra "Colunas" e a faixa fina mudam o data-fb-colunas: as setas acompanham
    new MutationObserver(pintarColunas).observe(corpo,{attributes:true,attributeFilter:['data-fb-colunas']});
    // nome, código e aba chegam depois (o banco responde depois da 1ª imagem)
    var abasEl=document.getElementById('processTabs');
    if(abasEl)new MutationObserver(function(){resumos();}).observe(abasEl,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected']});
    setTimeout(resumos,1500);
    var tr=null;window.addEventListener('resize',function(){clearTimeout(tr);tr=setTimeout(pintarColunas,150);});
    window.SagaFichaModulos={recolherCliente:function(f){if(!!f!==emb.hidden){var b=tCab.querySelector('button');b.click();}},resumos:resumos};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
