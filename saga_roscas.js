/* Desenho compartilhado de roscas. Recebe dados prontos, sem consultar ou gravar no banco. */
(function(global){
  'use strict';
  var ESTILOS=`
.sr-graficos{--g1:#5483B3;--g2:#2E8B8B;--g3:#7DA0CA;--g4:#477C8B;--g5:#91B3B9;--g6:#3F6FB0;--g7:#6FB7B0;--g8:#A9C7E8;--g-venc:#f08a4b;--g-hoje:#f5b84c;--g-ok:#5483B3;--g-sem:#8a94a8;display:grid;grid-template-columns:repeat(var(--sr-colunas,4),minmax(0,1fr));gap:12px;margin-bottom:14px}
[data-theme="light"] .sr-graficos{--g1:#052659;--g2:#245568;--g3:#5483B3;--g4:#2E8B8B;--g5:#123747;--g6:#477C8B;--g7:#3F6FB0;--g8:#7DA0CA;--g-venc:#d6452d;--g-hoje:#e08a00;--g-ok:#2563EB}
.sr-graf{background:var(--panel);border:1px solid var(--border-soft);border-radius:15px;padding:13px 14px;min-width:0}.sr-graf h4{margin:0 0 8px;font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);font-weight:700}
.sr-graf-corpo{display:flex;align-items:center;min-height:190px;gap:12px;min-width:0}.sr-rosca{position:relative;width:104px;height:104px;flex:0 0 auto}.sr-rosca svg{width:100%;height:100%;display:block}
.sr-rosca .trilho{fill:none;stroke:color-mix(in srgb,var(--text) 9%,transparent);stroke-width:14}.sr-rosca .sr-fatia{fill:none;stroke-width:14;cursor:pointer;transition:opacity .2s,stroke-width .2s}.sr-rosca .sr-fatia.sem-clique{cursor:default}.sr-rosca .sr-fatia:hover{stroke-width:16}.sr-rosca.filtrada .sr-fatia:not(.ativa){opacity:.3}
.sr-rosca .centro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;font-size:20px;font-weight:700;line-height:1;color:var(--text)}.sr-rosca .centro small{font-size:8.5px;font-weight:600;letter-spacing:.4px;color:var(--muted);margin-top:3px;text-transform:uppercase}
.sr-leg-lista{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}.sr-leg{display:flex;align-items:center;gap:7px;width:100%;padding:3px 5px;border:0;border-radius:7px;background:none;color:var(--text);font:inherit;font-size:11px;text-align:left;min-width:0}
button.sr-leg{cursor:pointer}button.sr-leg:hover,button.sr-leg:focus-visible{background:color-mix(in srgb,var(--text) 7%,transparent);outline:0}.sr-leg.ativa{background:color-mix(in srgb,var(--gold) 14%,transparent);font-weight:700}
.sr-leg i{width:9px;height:9px;border-radius:3px;flex:0 0 auto;background:var(--c)}.sr-leg span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sr-leg b{font-variant-numeric:tabular-nums;color:var(--muted);font-size:10.5px}
@media(max-width:1180px){.sr-graficos{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.sr-graficos{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.sr-graf{flex:0 0 86%;scroll-snap-align:start}}
.sr-secao{container-type:inline-size}@container(max-width:1050px){.sr-graficos{grid-template-columns:repeat(2,minmax(0,1fr))}}@container(max-width:600px){.sr-graficos{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.sr-graf{flex:0 0 86%;scroll-snap-align:start}}.sr-graficos[hidden]{display:none}.sr-graficos-barra{display:flex;justify-content:flex-end;margin:-7px 0 7px}.sr-toggle{font:inherit;font-size:10.5px;color:var(--muted);padding:5px 8px;border:1px solid var(--border-soft);border-radius:8px;background:var(--panel);cursor:pointer}.sr-toggle:active{transform:scale(.96)}.sr-rosca .sr-fatia{transition:opacity .2s,stroke-width .2s,stroke-dasharray .6s,stroke-dashoffset .6s}.sr-rosca .sr-fatia{transform-box:fill-box;transform-origin:center}.sr-rosca .sr-fatia:focus-visible{stroke-width:16;outline:none}.sr-leg-lista{max-height:190px;overflow-y:auto}.sr-leg:active{transform:scale(.97)}.sr-rosca .centro .n{font-variant-numeric:tabular-nums}@media (min-resolution:100000dppx){.sr-rosca .sr-fatia{transition:none}}


.sr-graficos[hidden],.sr-secao[hidden]{display:none}.sr-dinheiro .n{font-size:13px;line-height:1.15;max-width:78px;text-align:center}.sr-leg b{white-space:nowrap}.sr-negativo b{color:var(--danger)}@container(min-width:1051px) and (max-width:1250px){.sr-graficos[data-colunas="4"]{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container(max-width:600px){.sr-moeda .sr-leg{display:grid;grid-template-columns:9px minmax(0,1fr);gap:1px 7px}.sr-moeda .sr-leg span{white-space:normal;overflow-wrap:anywhere}.sr-moeda .sr-leg b{grid-column:2}.sr-moeda .sr-leg-lista{max-height:240px}}
`;
  var moeda=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  var curta=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',notation:'compact',maximumFractionDigits:1});
  function valor(n){n=Number(n);return Number.isFinite(n)?n:0;}
  function estilos(){
    if(document.getElementById('sagaRoscasCss'))return;
    var s=document.createElement('style');s.id='sagaRoscasCss';s.textContent=ESTILOS;document.head.appendChild(s);
  }
  function contar(el,alvo,formatar){
    if(el._alvo===alvo&&el._formatar===formatar)return;
    if(el._quadro)cancelAnimationFrame(el._quadro);
    var de=el._valor||0;el._alvo=alvo;el._formatar=formatar;
    if((window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches||de===alvo){el._valor=alvo;el.textContent=formatar(alvo);return;}
    var inicio=null;
    function passo(ts){if(inicio===null)inicio=ts;var k=Math.min(1,(ts-inicio)/600);el._valor=de+(alvo-de)*(1-Math.pow(1-k,3));el.textContent=formatar(el._valor);if(k<1)el._quadro=requestAnimationFrame(passo);else el._quadro=null;}
    el._quadro=requestAnimationFrame(passo);
  }
  var numero=function(n){return Math.round(n).toLocaleString('pt-BR');};
  var dinheiro=function(n){return curta.format(n);};
  function criar(root,op){
    estilos();var grupos=[],cartoes=new Map(),selecionados=new Map(),ocultos=false;
    try{ocultos=localStorage.getItem(op.chave)==='1';}catch(e){}
    root.classList.add('sr-secao');
    root.innerHTML='<div class="sr-graficos-barra"><button type="button" class="sr-toggle" aria-expanded="true"></button></div><div class="sr-graficos"></div>';
    var btn=root.querySelector('.sr-toggle'),painel=root.querySelector('.sr-graficos');
    painel.id=root.id+'-painel';painel.setAttribute('aria-label',op.rotulo||'Gráficos');btn.setAttribute('aria-controls',painel.id);
    function atualizar(lista){
      grupos=lista;root.hidden=!grupos.length;painel.hidden=ocultos;btn.textContent=ocultos?'Mostrar gráficos':'Ocultar gráficos';btn.setAttribute('aria-expanded',String(!ocultos));
      if(ocultos)return;
      painel.dataset.colunas=String(Math.min(4,grupos.length));
      painel.style.setProperty('--sr-colunas',String(Math.max(1,Math.min(4,grupos.length))));
      var ids=new Set(),circ=2*Math.PI*40;
      grupos.forEach(function(g,indice){
        ids.add(g.id);var card=cartoes.get(g.id);
        if(!card){
          card=document.createElement('div');card.className='sr-graf';card.dataset.g=g.id;
          card.innerHTML='<h4></h4><div class="sr-graf-corpo"><div class="sr-rosca"><svg viewBox="0 0 100 100" role="group"><circle class="trilho" cx="50" cy="50" r="40"></circle><g class="sr-arcos" transform="rotate(-90 50 50)"></g></svg><div class="centro"><span class="n">0</span><small></small></div></div><div class="sr-leg-lista"></div></div>';
          card._fatias=new Map();card._legendas=new Map();cartoes.set(g.id,card);painel.appendChild(card);
        }
        if(painel.children[indice]!==card)painel.insertBefore(card,painel.children[indice]||null);
        card.classList.toggle('sr-moeda',!!g.moeda);
        var total=g.total==null?g.itens.reduce(function(s,x){return s+valor(x.valor);},0):valor(g.total);
        var peso=g.itens.reduce(function(s,x){return s+Math.abs(valor(x.valor));},0),acc=0,positivas=g.itens.filter(function(x){return valor(x.valor)!==0;}).length;
        var formatar=g.formatar||(g.moeda?dinheiro:numero),extenso=g.formatarCompleto||g.formatar||(g.moeda?function(n){return moeda.format(n);}:numero);
        card.dataset.total=String(total);card.title=g.dica||'';card.querySelector('h4').textContent=g.titulo;
        card.querySelector('.centro').classList.toggle('sr-dinheiro',!!g.moeda);card.querySelector('.centro').title=extenso(total);
        card.querySelector('small').textContent=g.rotulo||(g.moeda?'total':'itens');
        card.querySelector('svg').setAttribute('aria-label',g.titulo+': '+extenso(total));contar(card.querySelector('.n'),total,formatar);
        var chaves=new Set(),alguma=false;
        g.itens.forEach(function(x,k){
          var id=String(x.id),v=valor(x.valor),ativa=x.ativa==null?selecionados.get(g.id)===id:!!x.ativa;
          alguma=alguma||ativa;chaves.add(id);
          var cor=x.cor&&CSS.supports('color',x.cor)?x.cor:'var(--g'+(k%8+1)+')';
          var c=card._fatias.get(id),novo=!c;
          if(!c){c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('class','sr-fatia');c.setAttribute('cx','50');c.setAttribute('cy','50');c.setAttribute('r','40');c.setAttribute('role','button');c.setAttribute('tabindex','0');c.dataset.graf=g.id;c.dataset.v=id;c.appendChild(document.createElementNS('http://www.w3.org/2000/svg','title'));card._fatias.set(id,c);card.querySelector('.sr-arcos').appendChild(c);}
          var len=peso?Math.abs(v)/peso*circ:0,vis=Math.max(0,len-(positivas>1&&peso>positivas?2.2:0));
          c.style.stroke=cor;c.style.display=v?'':'none';c.classList.toggle('ativa',ativa);c.setAttribute('aria-pressed',String(ativa));c.setAttribute('aria-label',x.nome+': '+extenso(v));c.querySelector('title').textContent=x.nome+': '+extenso(v);
          var arco=vis.toFixed(2)+' '+(circ-vis).toFixed(2),offset=(-acc).toFixed(2);
          if(c.getAttribute('stroke-dasharray')!==arco)c.setAttribute('stroke-dasharray',arco);
          if(c.getAttribute('stroke-dashoffset')!==offset)c.setAttribute('stroke-dashoffset',offset);
          if(novo&&v&&!(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches)c.animate([{strokeDasharray:'0 '+circ},{strokeDasharray:arco}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});
          acc+=len;
          var b=card._legendas.get(id);
          if(!b){b=document.createElement('button');b.type='button';b.className='sr-leg';b.dataset.graf=g.id;b.dataset.v=id;b.innerHTML='<i></i><span></span><b></b>';card._legendas.set(id,b);}
          b.classList.toggle('ativa',ativa);b.setAttribute('aria-pressed',String(ativa));b.title=(x.dica||x.nome)+': '+extenso(v);b.querySelector('i').style.setProperty('--c',cor);b.querySelector('span').textContent=x.nome;b.querySelector('b').textContent=extenso(v);b.classList.toggle('sr-negativo',v<0);
          var legenda=card.querySelector('.sr-leg-lista');if(legenda.children[k]!==b)legenda.insertBefore(b,legenda.children[k]||null);
        });
        card.querySelector('.sr-rosca').classList.toggle('filtrada',alguma);
        [card._fatias,card._legendas].forEach(function(m){m.forEach(function(el,k){if(!chaves.has(k)){el.remove();m.delete(k);}});});
        var vazio=card.querySelector('.sr-vazio');
        if(!g.itens.length&&!vazio){vazio=document.createElement('div');vazio.className='sr-leg sr-vazio';vazio.textContent='Sem dados';card.querySelector('.sr-leg-lista').appendChild(vazio);}
        if(g.itens.length&&vazio)vazio.remove();
      });
      cartoes.forEach(function(c,id){if(!ids.has(id)){if(c.querySelector('.n')._quadro)cancelAnimationFrame(c.querySelector('.n')._quadro);c.remove();cartoes.delete(id);}});
    }
    function escolher(gid,id){
      var g=grupos.find(function(g){return g.id===gid;}),item=g&&g.itens.find(function(x){return String(x.id)===id;});if(!item)return;
      if(g.escolher)g.escolher(item);
      else{selecionados.set(gid,selecionados.get(gid)===id?null:id);atualizar(grupos);}
    }
    btn.onclick=function(){ocultos=!ocultos;try{localStorage.setItem(op.chave,ocultos?'1':'0');}catch(e){}atualizar(grupos);};
    painel.onclick=function(e){var b=e.target.closest('[data-graf]');if(b)escolher(b.dataset.graf,b.dataset.v);};
    painel.onkeydown=function(e){var b=e.target.closest('circle[data-graf]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();escolher(b.dataset.graf,b.dataset.v);}};
    return {atualizar:atualizar};
  }
  function topo(itens,max,rotulo){
    var lista=itens.slice().sort(function(a,b){return valor(b.valor)-valor(a.valor)||a.nome.localeCompare(b.nome,'pt-BR');});
    if(lista.length>max){var resto=lista.slice(max);lista=lista.slice(0,max);lista.push({id:'__outras__',nome:rotulo||'Outras',valor:resto.reduce(function(s,x){return s+valor(x.valor);},0),cor:'var(--g-sem)',dica:resto.map(function(x){return x.nome;}).join(', ')});}
    return lista;
  }
  global.SagaRoscas={criar:criar,topo:topo};
})(window);
