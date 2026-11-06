/* SAGA · Painéis de acompanhamento da Lista de processos (T60 e T98)
   Jurídico: "Processos parados" — quanto tempo cada processo está sem movimentação (cores por faixa), roscas clicáveis
             como filtro e a lista dos mais parados primeiro, para dar impulso processual.
   Captação: "Retornos" — datas de retorno combinadas com o cliente: atrasados, hoje, amanhã, esta semana; roscas clicáveis,
             quem tem mais retornos e a lista do que é mais urgente.
   Uso na Lista: SagaPaineis.render(raiz, {fase, base, statusDe, nomeDe, aoMudar, abrir}) e SagaPaineis.passa(p) no filtro da tela. */
(function(global){
  'use strict';
  var S={faixa:null,pessoa:null,cfg:null,roscas:null,ocultos:false,pronto:false};
  try{S.ocultos=localStorage.getItem('saga-painel-acomp-oculto')==='1';}catch(e){}
  var esc=function(t){var d=document.createElement('div');d.textContent=t==null?'':String(t);return d.innerHTML;};

  var FAIXAS_JUR=[
    {id:'hoje',nome:'Movimentado hoje',min:0,max:0,cor:'#4b8af5'},
    {id:'s1',nome:'Até 1 semana',min:1,max:7,cor:'#3fb98a'},
    {id:'m1',nome:'Até 1 mês',min:8,max:30,cor:'#8bc34a'},
    {id:'m15',nome:'Até 1 mês e meio',min:31,max:45,cor:'#e0c03b'},
    {id:'m2',nome:'Até 2 meses',min:46,max:60,cor:'#f0a03c'},
    {id:'m3',nome:'Até 3 meses',min:61,max:90,cor:'#f07a3a'},
    {id:'m4',nome:'Até 4 meses',min:91,max:120,cor:'#e5604d'},
    {id:'m5',nome:'Até 5 meses',min:121,max:150,cor:'#d6452d'},
    {id:'m5p',nome:'Mais de 5 meses',min:151,max:99999,cor:'#9b2335'},
    {id:'sem',nome:'Sem data',min:null,max:null,cor:'#8a94a8'}
  ];
  // retorno: "dias" = hoje − data de retorno (positivo = atrasado, negativo = ainda vai chegar)
  var FAIXAS_CAP=[
    {id:'a2',nome:'Atrasado há mais de 2 semanas',min:15,max:99999,cor:'#9b2335'},
    {id:'a1',nome:'Atrasado de 1 a 2 semanas',min:8,max:14,cor:'#d6452d'},
    {id:'a0',nome:'Atrasado até 1 semana',min:1,max:7,cor:'#f07a3a'},
    {id:'hoje',nome:'Retorno hoje',min:0,max:0,cor:'#4b8af5'},
    {id:'am',nome:'Amanhã',min:-1,max:-1,cor:'#3fb98a'},
    {id:'sm',nome:'Esta semana',min:-7,max:-2,cor:'#8bc34a'},
    {id:'dp',nome:'Depois',min:-99999,max:-8,cor:'#7da0ca'},
    {id:'sem',nome:'Sem data',min:null,max:null,cor:'#8a94a8'}
  ];

  function hojeISO(){var x=new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
  function dias(iso){ // hoje − data
    if(!iso)return null;var a=String(iso).slice(0,10).split('-').map(Number),h=hojeISO().split('-').map(Number);
    if(a.length<3||isNaN(a[0]))return null;
    return Math.round((Date.UTC(h[0],h[1]-1,h[2])-Date.UTC(a[0],a[1]-1,a[2]))/864e5);
  }
  function ehCap(){return S.cfg&&S.cfg.fase==='captacao';}
  function faixas(){return ehCap()?FAIXAS_CAP:FAIXAS_JUR;}
  function dataDe(p){
    if(ehCap())return global.SagaPlanilha&&SagaPlanilha.retornoDe?SagaPlanilha.retornoDe(p):null;
    return p.ultima_movimentacao_em?String(p.ultima_movimentacao_em).slice(0,10):null;
  }
  function faixaDe(p){
    var d=dias(dataDe(p)),fs=faixas();
    if(d==null)return fs[fs.length-1];
    return fs.find(function(f){return f.min!=null&&d>=f.min&&d<=f.max;})||fs[fs.length-1];
  }
  // fora do painel: processos encerrados (Jurídico) ou sem sucesso (Captação)
  function conta(p){
    var st=S.cfg&&S.cfg.statusDe?S.cfg.statusDe(p):{};
    if(ehCap())return st.etapa!=='Sem sucesso';
    return !/^(finalizado|arquivado)/i.test(String(st.nome||'').normalize('NFD').replace(/[̀-ͯ]/g,''));
  }
  function passa(p){
    if(!S.cfg||(!S.faixa&&S.pessoa===null))return true;
    if(!conta(p))return false;
    if(S.faixa&&faixaDe(p).id!==S.faixa)return false;
    if(S.pessoa!==null&&String((S.cfg.pessoaDe?S.cfg.pessoaDe(p):'')||'')!==S.pessoa)return false;
    return true;
  }

  function estilos(){
    if(document.getElementById('sagaPaineisCss'))return;
    var s=document.createElement('style');s.id='sagaPaineisCss';s.textContent=[
      '.pn-secao{margin:0 0 14px;border:1px solid var(--border-soft);border-radius:16px;background:var(--panel);padding:13px 14px}',
      '.pn-cab{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pn-cab h3{font-size:12px;letter-spacing:.7px;text-transform:uppercase;font-weight:700;color:var(--text)}',
      '.pn-cab p{font-size:11px;color:var(--muted);flex:1;min-width:200px}',
      '.pn-tog{font:inherit;font-size:10.5px;color:var(--muted);padding:5px 9px;border:1px solid var(--border-soft);border-radius:8px;background:var(--panel);cursor:pointer}.pn-tog:hover{border-color:var(--gold);color:var(--text)}',
      '.pn-corpo{overflow:hidden}',
      '.pn-corpo .sr-graficos{margin:10px 0 4px;grid-template-columns:repeat(2,minmax(0,1fr))}',
      '.pn-corpo .sr-graf-corpo{height:252px}.pn-corpo .sr-leg-lista{max-height:248px}',
      '.pn-lista{margin-top:6px}.pn-lista h4{font-size:10.5px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);font-weight:700;margin:6px 2px 7px}',
      '.pn-lin{display:grid;grid-template-columns:10px minmax(0,1.5fr) minmax(0,1fr) minmax(0,.9fr) auto;align-items:center;gap:10px;width:100%;text-align:left;padding:7px 10px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text);font:inherit;font-size:12px;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}',
      '.pn-lin:hover{background:color-mix(in srgb,var(--gold) 8%,transparent);border-color:var(--border-soft);transform:translateX(2px)}',
      '.pn-lin i{width:9px;height:9px;border-radius:50%;background:var(--c)}.pn-lin b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pn-lin span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px}',
      '.pn-chip{font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:9px;color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);border:1px solid color-mix(in srgb,var(--c) 38%,transparent);white-space:nowrap}',
      '.pn-vazio{font-size:12px;color:var(--muted);padding:10px 4px}',
      '.pn-mais{display:none;width:100%;margin-top:6px;font:inherit;font-size:11.5px;font-weight:600;color:var(--gold-light);padding:8px;border:1px dashed var(--border-soft);border-radius:9px;background:none;cursor:pointer}.pn-mais:active{transform:scale(.98)}',
      '@media(max-width:760px){.pn-secao{padding:12px}.pn-cab{gap:6px 10px}.pn-cab h3{flex:1}.pn-cab p{order:3;flex:1 1 100%;min-width:0;font-size:10.5px}.pn-lin{grid-template-columns:10px minmax(0,1fr) auto;padding:7px 6px}.pn-lin span{display:none}.pn-corpo .sr-graficos{display:flex}.pn-corpo .sr-graf{flex-basis:88%}.pn-corpo .sr-graf-corpo{height:auto;min-height:150px}.pn-corpo .sr-leg-lista{max-height:190px}.pn-lista:not(.pn-todos) .pn-lin:nth-of-type(n+6){display:none}.pn-mais{display:block}}'
    ].join('\n');document.head.appendChild(s);
  }

  function montar(raiz){
    estilos();
    raiz.classList.add('pn-secao');
    raiz.innerHTML='<div class="pn-cab"><h3></h3><p></p><button type="button" class="pn-tog"></button></div><div class="pn-corpo" id="pnCorpo"><div id="pnRoscas"></div><div class="pn-lista" id="pnLista"></div></div>';
    S.roscas=global.SagaRoscas.criar(raiz.querySelector('#pnRoscas'),{chave:'saga-painel-acomp-roscas',rotulo:'Gráficos do painel',semBarra:true});
    raiz.querySelector('.pn-tog').onclick=function(){
      S.ocultos=!S.ocultos;try{localStorage.setItem('saga-painel-acomp-oculto',S.ocultos?'1':'0');}catch(e){}
      var corpo=raiz.querySelector('#pnCorpo');this.textContent=S.ocultos?'Mostrar painel':'Ocultar painel';
      if(global.sagaRecolher)global.sagaRecolher(corpo,S.ocultos);else corpo.hidden=S.ocultos;
    };
    raiz.querySelector('#pnLista').addEventListener('click',function(e){var m=e.target.closest('[data-pn-mais]');if(m){var bx=this;var todos=!bx.classList.contains('pn-todos'),h0=bx.offsetHeight;bx.classList.toggle('pn-todos',todos);var h1=bx.offsetHeight,calmo=global.sagaMq&&global.sagaMq().matches;if(!calmo&&bx.animate&&h0!==h1){bx.style.overflow='hidden';bx.animate([{height:h0+'px'},{height:h1+'px'}],{duration:340,easing:'cubic-bezier(.22,.78,.25,1)'}).onfinish=function(){bx.style.overflow='';};}m.textContent=todos?'Mostrar menos':'Ver todos ('+bx.querySelectorAll('.pn-lin').length+')';return;}var b=e.target.closest('[data-pid]');if(!b||!S.cfg||!S.cfg.abrir)return;S.cfg.abrir(b.dataset.pid);});
    S.pronto=true;
  }

  function rotuloData(p){
    var d=dias(dataDe(p));
    if(ehCap()){
      if(d==null)return 'sem data';if(d>1)return 'atrasado '+d+' dias';if(d===1)return 'atrasado 1 dia';if(d===0)return 'hoje';if(d===-1)return 'amanhã';return 'em '+(-d)+' dias';
    }
    if(d==null)return 'sem data';if(d<=0)return 'hoje';if(d===1)return 'há 1 dia';return 'há '+d+' dias';
  }
  function dataBR(iso){var x=String(iso||'').slice(0,10).split('-');return x.length===3?x[2]+'/'+x[1]+'/'+x[0]:'';}

  function render(raiz,cfg){
    S.cfg=cfg;
    if(!cfg||(cfg.fase!=='juridico'&&cfg.fase!=='captacao')||!global.SagaRoscas){raiz.hidden=true;return;}
    raiz.hidden=false;
    if(!S.pronto||!raiz.querySelector('#pnCorpo'))montar(raiz);
    var cap=ehCap(),fs=faixas();
    raiz.querySelector('h3').textContent=cap?'Retornos da Captação':'Processos parados';
    raiz.querySelector('p').textContent=cap?'Datas de retorno combinadas com os clientes. Clique em uma fatia para filtrar a lista.':'Há quanto tempo cada processo está sem movimentação (intimação, comentário, tarefa, documento ou mudança de status). Clique em uma fatia para filtrar.';
    var tog=raiz.querySelector('.pn-tog');tog.textContent=S.ocultos?'Mostrar painel':'Ocultar painel';
    var corpo=raiz.querySelector('#pnCorpo');if(!corpo._recolhendo)corpo.hidden=S.ocultos;

    var base=(cfg.base||[]).filter(conta);
    // contagem por faixa: respeita os outros filtros da tela, mas não a faixa escolhida (para ver todas as fatias)
    var porFaixa={};fs.forEach(function(f){porFaixa[f.id]=0;});
    var baseFaixa=base.filter(function(p){return S.pessoa===null||String((cfg.pessoaDe(p))||'')===S.pessoa;});
    baseFaixa.forEach(function(p){porFaixa[faixaDe(p).id]++;});
    // quem tem mais: parados há mais de 1 mês (Jurídico) ou atrasados/hoje (Captação)
    var urgentes=base.filter(function(p){var d=dias(dataDe(p));return d!=null&&(cap?d>=0:d>30)&&(!S.faixa||faixaDe(p).id===S.faixa);});
    var mapa={};urgentes.forEach(function(p){var k=String(cfg.pessoaDe(p)||'');mapa[k]=(mapa[k]||0)+1;});
    var pessoas=Object.keys(mapa).map(function(k,i){return {id:k||'__sem__',chave:k,nome:k?cfg.nomeDe(k):(cap?'Sem captador':'Sem responsável'),valor:mapa[k]};}).sort(function(a,b){return b.valor-a.valor||a.nome.localeCompare(b.nome,'pt-BR');});
    var top=pessoas.slice(0,6);if(pessoas.length>6)top.push({id:'__outros__',nome:'Outros',valor:pessoas.slice(6).reduce(function(s,x){return s+x.valor;},0),cor:'var(--g-sem)'});
    S.roscas.atualizar([
      {id:'faixa',titulo:cap?'Data de retorno':'Tempo sem movimentação',rotulo:'processos',itens:fs.map(function(f){return {id:f.id,nome:f.nome,valor:porFaixa[f.id],cor:f.cor,ativa:S.faixa===f.id};}),
        escolher:function(it){S.faixa=S.faixa===it.id?null:it.id;cfg.aoMudar();}},
      {id:'pessoa',titulo:cap?'Atrasados e de hoje, por captador':'Parados há mais de 1 mês, por responsável',rotulo:'processos',itens:top.map(function(x,k){return {id:x.id,nome:x.nome,valor:x.valor,cor:x.cor||('var(--g'+(k%8+1)+')'),ativa:S.pessoa!==null&&S.pessoa===x.chave};}),
        escolher:function(it){if(it.id==='__outros__')return;var chave=it.id==='__sem__'?'':it.id;S.pessoa=S.pessoa===chave?null:chave;cfg.aoMudar();}}
    ]);

    // lista dos mais urgentes (respeita todos os filtros, inclusive os do painel)
    var lista=base.filter(function(p){return passa(p);});
    var ordenada=lista.map(function(p){return {p:p,d:dias(dataDe(p))};}).filter(function(x){return x.d!=null;});
    ordenada.sort(function(a,b){return cap?(b.d-a.d):(b.d-a.d);});
    if(cap)ordenada=ordenada.filter(function(x){return true;});
    var itens=ordenada.slice(0,12);
    var box=raiz.querySelector('#pnLista');
    box.innerHTML='<h4>'+(cap?'Retornos mais urgentes':'Mais parados primeiro')+' ('+ordenada.length+(ordenada.length>12?', mostrando 12':'')+')</h4>'+
      (itens.length?itens.map(function(x){
        var p=x.p,f=faixaDe(p),st=cfg.statusDe(p)||{},pe=p.pessoa||{};
        return '<button type="button" class="pn-lin" data-pid="'+esc(p.id)+'" style="--c:'+f.cor+'"><i></i><b>'+esc(pe.nome_completo||'Sem nome')+'</b><span>'+esc(st.nome||'')+'</span><span>'+esc(cfg.nomeDe(cfg.pessoaDe(p))||'')+(cap&&dataDe(p)?' · '+dataBR(dataDe(p)):'')+'</span><em class="pn-chip" style="--c:'+f.cor+';font-style:normal">'+esc(rotuloData(p))+'</em></button>';
      }).join('')+(itens.length>5?'<button type="button" class="pn-mais" data-pn-mais>'+(box.classList.contains('pn-todos')?'Mostrar menos':'Ver todos ('+itens.length+')')+'</button>':''):'<div class="pn-vazio">'+(cap?'Nenhum retorno com data neste filtro.':'Nenhum processo com data de movimentação neste filtro.')+'</div>');
  }
  function limpar(){S.faixa=null;S.pessoa=null;}
  function ativo(){return !!(S.faixa||S.pessoa!==null);}
  global.SagaPaineis={render:render,passa:passa,limpar:limpar,ativo:ativo};
})(window);
