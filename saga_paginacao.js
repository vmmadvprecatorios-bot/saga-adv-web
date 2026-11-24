/* =====================================================================
   SAGA ADV · Paginação comum de TODAS as listas (24/11/2026, Dr. Victor:
   "estilo a planilha: posso abrir 5, 10, 50, 100 ou todos numa aba só;
   se eu abrir 50, ele divide em tantas páginas. TODA listagem no sistema").

   window.SagaPaginacao.criar({tela, padrao, rotulo, aoMudar, teto})
     tela    : nome curto da lista; a escolha "Mostrar N" fica em
               localStorage 'saga-pag-<tela>' (acompanha a conta pelo sagaSinc)
     padrao  : 5 | 10 | 50 | 100 | 'todos' (padrão 50)
     rotulo  : palavra do "Mostrando 1-50 de 1.234 <rotulo>" (ex.: 'pessoas')
     aoMudar : function(pag) chamada quando a pessoa troca a página ou o tamanho
     teto    : quantas linhas "Todos" mostra de uma vez (padrão 2.000); acima
               disso divide em páginas desse tamanho e avisa (não trava a tela)
   Devolve o objeto pag:
     pag.pagina                 página atual (1, 2, 3...)
     pag.tamanho()              5 | 10 | 50 | 100 | 'todos'
     pag.quantos()              linhas por página de verdade (Todos = teto)
     pag.offset()               (pagina-1) * quantos()
     pag.inicio()               volta para a página 1 (chamar ao mudar filtro)
     pag.fatia(lista)           para listas já inteiras na tela: a parte da página
                                (guarda o total sozinho)
     pag.total(n)               informa o total (lista que vem do banco)
     pag.html()                 a barra pronta (texto); depois do innerHTML
     pag.ligar(raiz)            liga os cliques da(s) barra(s) dentro de raiz
     pag.render(el)             atalho: el.innerHTML = pag.html(); pag.ligar(el)
   SagaPaginacao.buscarEmPartes(pedir, {offset, quantos, lote, progresso})
     pedir(offset, limite) -> Promise<{linhas:[], total:n} | {error}>
     Junta várias chamadas de 'lote' em 'lote' (o limite da função do banco),
     2 ao mesmo tempo, até 'quantos' linhas; progresso(feitas, total) mostra
     "Carregando 600 de 2.000…". Devolve {linhas, total, error}.
   Regras do CLAUDE.md: variáveis do tema, botão escolhido com 'active'
   (o destaque desliza pelo saga_guard), curva do sistema, celular sem rolar
   para o lado e área de toque de 40 px.
   ===================================================================== */
(function(){
  'use strict';
  if(window.SagaPaginacao)return;
  var OPCOES=[5,10,50,100,'todos'],TETO=2000;
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function ler(tela){try{var v=localStorage.getItem('saga-pag-'+tela);if(v==='todos')return v;v=parseInt(v,10);return OPCOES.indexOf(v)>=0?v:null;}catch(e){return null;}}
  function gravar(tela,v){try{localStorage.setItem('saga-pag-'+tela,String(v));}catch(e){}}

  // estilo base (as cores dos botões vêm das regras de botões do saga_tema.css: .sg-pag-b)
  function estilo(){
    if(document.getElementById('sagaPaginacaoCss'))return;
    var st=document.createElement('style');st.id='sagaPaginacaoCss';
    st.textContent=
      '.sg-pag{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;margin:12px 0 4px;font-size:12px;color:var(--muted);min-width:0;max-width:100%}'+
      '.sg-pag-info{white-space:nowrap}.sg-pag-info b{color:var(--text);font-weight:600;font-variant-numeric:lining-nums tabular-nums}'+
      '.sg-pag-qtd,.sg-pag-nav{display:flex;flex-wrap:wrap;align-items:center;gap:5px;min-width:0}'+
      '.sg-pag-qtd>span{margin-right:2px}'+
      '.sg-pag-b{min-width:32px;height:30px;padding:0 9px;border-radius:8px;border:1px solid var(--border-soft,var(--border));background:transparent;color:var(--text);font:inherit;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:lining-nums tabular-nums;'+
        'transition:background-color .25s cubic-bezier(.22,.78,.25,1),border-color .25s cubic-bezier(.22,.78,.25,1)}'+
      '.sg-pag-b:disabled{opacity:.35;cursor:default}'+
      '.sg-pag-b:focus-visible,.sg-pag-ir input:focus-visible{outline:2px solid var(--gold);outline-offset:1px}'+
      '.sg-pag-pts{min-width:18px;text-align:center}'+
      '.sg-pag-ir{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;margin-left:4px}'+
      '.sg-pag-ir input{width:64px;height:30px;padding:0 6px;border-radius:8px;border:1px solid var(--border-soft,var(--border));background:var(--panel);color:var(--text);font:inherit;font-size:12px;-moz-appearance:textfield}'+
      '.sg-pag-ir input::-webkit-inner-spin-button,.sg-pag-ir input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}'+
      '.sg-pag-aviso{flex-basis:100%;padding:7px 10px;border-radius:8px;border:1px solid color-mix(in srgb,#d4a017 55%,transparent);background:color-mix(in srgb,#d4a017 14%,transparent);color:var(--text);font-size:12px}'+
      '.sg-pag-carregando{font-size:12px;color:var(--muted);padding:8px 2px}'+
      '@media (max-width:760px){.sg-pag{justify-content:flex-start}.sg-pag-b,.sg-pag-ir input{min-height:40px;height:40px;min-width:40px}.sg-pag-longe{display:none}.sg-pag-info{white-space:normal}}';
    (document.head||document.documentElement).appendChild(st);
  }

  function criar(o){
    o=o||{};estilo();
    var tela=o.tela||'lista',teto=o.teto||TETO,tam=ler(tela);
    if(tam==null)tam=OPCOES.indexOf(o.padrao)>=0?o.padrao:50;
    var tot=0,id='sgp'+Math.random().toString(36).slice(2,8);
    var pag={pagina:1};
    pag.tamanho=function(){return tam;};
    pag.quantos=function(){return tam==='todos'?teto:tam;};
    pag.paginas=function(){return Math.max(1,Math.ceil(tot/pag.quantos()));};
    pag.offset=function(){return (pag.pagina-1)*pag.quantos();};
    pag.inicio=function(){pag.pagina=1;return pag;};
    pag.total=function(n){if(n!=null){tot=Math.max(0,Number(n)||0);if(pag.pagina>pag.paginas())pag.pagina=pag.paginas();}return tot;};
    pag.fatia=function(lista){lista=lista||[];pag.total(lista.length);var q=pag.quantos();return (tam==='todos'&&lista.length<=teto)?lista:lista.slice(pag.offset(),pag.offset()+q);};
    function mudar(){if(typeof o.aoMudar==='function')o.aoMudar(pag);}
    pag.irPara=function(p){p=Math.max(1,Math.min(pag.paginas(),parseInt(p,10)||1));if(p===pag.pagina)return;pag.pagina=p;mudar();};
    pag.mudarTamanho=function(v){
      v=v==='todos'?'todos':parseInt(v,10);if(OPCOES.indexOf(v)<0||v===tam)return;
      // continua mostrando a mesma linha de cima: 51-100 em 50 por página vira página 6 em 10 por página
      var primeira=pag.offset();tam=v;gravar(tela,v);pag.pagina=Math.floor(primeira/pag.quantos())+1;
      if(pag.pagina>pag.paginas())pag.pagina=pag.paginas();
      mudar();
    };
    pag.html=function(){
      var q=pag.quantos(),np=pag.paginas(),p=pag.pagina,de=tot?pag.offset()+1:0,ate=Math.min(tot,pag.offset()+q);
      var h='<div class="sg-pag" data-sg-pag="'+id+'" role="navigation" aria-label="Páginas da lista">';
      h+='<div class="sg-pag-info" aria-live="polite">Mostrando <b>'+num(de)+(ate>de?'–'+num(ate):'')+'</b> de <b>'+num(tot)+'</b>'+(o.rotulo?" "+(window.sagaEsc?window.sagaEsc(o.rotulo):String(o.rotulo)):"")+'</div>';
      h+='<div class="sg-pag-qtd" role="group" aria-label="Quantos por página"><span>Mostrar</span>';
      OPCOES.forEach(function(v){h+='<button type="button" class="sg-pag-b'+(v===tam?' active':'')+'" data-sg-qtd="'+v+'" aria-pressed="'+(v===tam)+'">'+(v==='todos'?'Todos':v)+'</button>';});
      h+='</div>';
      if(np>1){
        h+='<div class="sg-pag-nav">';
        h+='<button type="button" class="sg-pag-b sg-pag-longe" data-sg-ir="1"'+(p<=1?' disabled':'')+' title="Primeira página" aria-label="Primeira página">«</button>';
        h+='<button type="button" class="sg-pag-b" data-sg-ir="'+(p-1)+'"'+(p<=1?' disabled':'')+' title="Página anterior" aria-label="Página anterior">‹</button>';
        var ini=Math.max(1,p-2),fim=Math.min(np,p+2),lista=[];
        if(ini>1){lista.push(1);if(ini>2)lista.push('…');}
        for(var i=ini;i<=fim;i++)lista.push(i);
        if(fim<np){if(fim<np-1)lista.push('…');lista.push(np);}
        lista.forEach(function(n){
          if(n==='…'){h+='<span class="sg-pag-pts" aria-hidden="true">…</span>';return;}
          var longe=Math.abs(n-p)>1&&n!==1&&n!==np;
          h+='<button type="button" class="sg-pag-b'+(n===p?' active':'')+(longe?' sg-pag-longe':'')+'" data-sg-ir="'+n+'"'+(n===p?' aria-current="page"':'')+' aria-label="Página '+n+'">'+num(n)+'</button>';
        });
        h+='<button type="button" class="sg-pag-b" data-sg-ir="'+(p+1)+'"'+(p>=np?' disabled':'')+' title="Próxima página" aria-label="Próxima página">›</button>';
        h+='<button type="button" class="sg-pag-b sg-pag-longe" data-sg-ir="'+np+'"'+(p>=np?' disabled':'')+' title="Última página" aria-label="Última página">»</button>';
        h+='<label class="sg-pag-ir">Ir para <input type="number" inputmode="numeric" min="1" max="'+np+'" value="'+p+'" aria-label="Ir para a página (1 a '+np+')"> de '+num(np)+'</label>';
        h+='</div>';
      }
      if(tam==='todos'&&tot>teto)h+='<div class="sg-pag-aviso" role="status">Lista grande ('+num(tot)+'): para não travar a tela, "Todos" mostra de '+num(teto)+' em '+num(teto)+'. Use as páginas ou os filtros.</div>';
      return h+'</div>';
    };
    pag.ligar=function(raiz){
      (raiz||document).querySelectorAll('[data-sg-pag="'+id+'"]').forEach(function(b){
        if(b._sgLigado)return;b._sgLigado=1;
        b.addEventListener('click',function(e){
          var t=e.target.closest('button');if(!t||t.disabled)return;
          if(t.hasAttribute('data-sg-qtd')){
            // destaque troca na hora do clique; a lista redesenha depois do deslize (~420 ms se o movimento estiver ligado)
            b.querySelectorAll('[data-sg-qtd]').forEach(function(x){x.classList.toggle('active',x===t);});
            var v=t.getAttribute('data-sg-qtd'),reduz=false;try{reduz=localStorage.getItem('saga-movimento')==='reduzido';}catch(_){}
            setTimeout(function(){pag.mudarTamanho(v);},reduz?0:360);
          }else if(t.hasAttribute('data-sg-ir'))pag.irPara(t.getAttribute('data-sg-ir'));
        });
        var inp=b.querySelector('.sg-pag-ir input');
        if(inp){inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();pag.irPara(inp.value);}});inp.addEventListener('change',function(){pag.irPara(inp.value);});}
      });
      return pag;
    };
    pag.render=function(el){if(!el)return pag;el.innerHTML=pag.html();return pag.ligar(el);};
    return pag;
  }

  // "Todos" numa lista do banco: várias chamadas no limite da função, 2 ao mesmo tempo, sem travar a tela
  async function buscarEmPartes(pedir,op){
    op=op||{};var lote=op.lote||200,quantos=op.quantos||lote,offset=op.offset||0;
    if(quantos<=lote){var r=await pedir(offset,quantos);return r&&r.error?{error:r.error,linhas:[],total:0}:{linhas:(r&&r.linhas)||[],total:(r&&r.total)||0};}
    // offset sempre múltiplo do lote aqui (páginas de 'teto', que é múltiplo de 200)
    var prim=await pedir(offset,lote);if(prim&&prim.error)return {error:prim.error,linhas:[],total:0};
    var total=prim.total||0,alvo=Math.min(quantos,Math.max(0,total-offset)),partes=[prim.linhas||[]],feitas=partes[0].length;
    if(op.progresso)op.progresso(feitas,alvo);
    var offs=[];for(var o=offset+lote;o<offset+alvo;o+=lote)offs.push(o);
    var erro=null,i=0;
    async function trabalhador(){
      while(i<offs.length&&!erro){
        var k=i++,off=offs[k];var r=await pedir(off,lote); // sempre o lote inteiro: funções que pedem 'página' precisam de offset múltiplo do limite
        if(r&&r.error){erro=r.error;return;}
        partes[k+1]=(r&&r.linhas)||[];feitas+=partes[k+1].length;if(op.progresso)op.progresso(feitas,alvo);
      }
    }
    await Promise.all([trabalhador(),trabalhador()]);
    if(erro)return {error:erro,linhas:[],total:total};
    return {linhas:[].concat.apply([],partes).slice(0,alvo),total:total};
  }

  window.SagaPaginacao={criar:criar,buscarEmPartes:buscarEmPartes,OPCOES:OPCOES,TETO:TETO};
})();
