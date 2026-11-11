/* Consulta do processo no site do tribunal (09/11/2026, pedido do Dr. Victor).
   Ao lado do número do processo (ficha, cartão do Kanban, linha da planilha, recursos): um botãozinho que COPIA o número
   e ABRE a consulta processual do tribunal daquele processo (PJe, e-SAJ, eproc...), com os links que o Dr. Victor mantém em
   Intimações > Links dos tribunais (tabela tribunais_links: tribunal_chave, nome, sistema, link, ordem).
   O tribunal sai do próprio número CNJ (J.TR). Mais de um link para o mesmo tribunal: abre um menu para escolher
   (processo do próprio tribunal, origem 0000, mostra primeiro o link de 2º grau, quando houver).
   Uso: SagaTribunais.icone(numero) (ícone) ou SagaTribunais.icone(numero,{rotulo:true}) (ícone + sigla).
   11/11 (Dr. Victor, T149): processo da Justiça Federal de 1º grau também sabe a SEÇÃO (estado), pela origem do número
   (ex.: 4.02.51xx = Rio de Janeiro, 4.02.50xx = Espírito Santo). No e-Proc cada seção tem o seu endereço, então o link da
   seção (tribunal_chave JFRJ, JFES...) vem primeiro; o do TRF (2º grau) vem depois. Link ainda "(configurar)" fica por último.
   SagaTribunais.selo(numero) devolve a etiqueta curta do estado (ex.: "RJ"), para os cartões. */
(function(global){
  'use strict';
  var L={lista:null,promessa:null,sb:null};
  var UF_TJ=['','AC','AL','AP','AM','BA','CE','DFT','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SE','SP','TO'];
  var CURVA='cubic-bezier(.22,.78,.25,1)';
  // origem (2 primeiros dígitos do OOOO) -> estado, por TRF
  var SECAO={1:{'30':'AC','31':'AP','32':'AM','33':'BA','34':'DF','35':'GO','36':'MT','37':'MA','39':'PA','40':'PI','41':'RO','42':'RR','43':'TO'},
    2:{'50':'ES','51':'RJ'},3:{'60':'MS','62':'MS','61':'SP','63':'SP'},4:{'70':'PR','71':'RS','72':'SC'},
    5:{'80':'AL','81':'CE','82':'PB','83':'PE','84':'RN','85':'SE'},6:{'38':'MG'}};
  var UF_NOME={AC:'do Acre',AL:'de Alagoas',AP:'do Amapá',AM:'do Amazonas',BA:'da Bahia',CE:'do Ceará',DF:'do Distrito Federal',ES:'do Espírito Santo',
    GO:'de Goiás',MA:'do Maranhão',MT:'de Mato Grosso',MS:'de Mato Grosso do Sul',MG:'de Minas Gerais',PA:'do Pará',PB:'da Paraíba',PR:'do Paraná',
    PE:'de Pernambuco',PI:'do Piauí',RJ:'do Rio de Janeiro',RN:'do Rio Grande do Norte',RS:'do Rio Grande do Sul',RO:'de Rondônia',RR:'de Roraima',
    SC:'de Santa Catarina',SE:'de Sergipe',SP:'de São Paulo',TO:'do Tocantins'};
  var ICO='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4h6v6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4l-9 9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

  function e(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function dig(v){return String(v==null?'':v).replace(/\D/g,'');}
  function cnj(v){var d=dig(v);return d.length===20?d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16,20):String(v||'');}
  function chaveNorm(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  // mesma apresentação da tela de Intimações: TRF-5, TJ-DFT, TRT-19
  function siglaBonita(k){var m=/^([A-Z]+)(\d+)$/.exec(k);if(m)return m[1]+'-'+m[2];if(/^TJ[A-Z]{2,3}$/.test(k))return 'TJ-'+k.slice(2);return k;}
  function reduzido(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(x){return false;}}
  function aviso(msg,tipo){if(typeof global.showToast==='function'){try{global.showToast(e(msg),tipo||'info');}catch(x){}}}
  function cliente(){if(L.sb)return L.sb;try{if(typeof _sb!=='undefined'&&_sb)return _sb;}catch(x){}return global._sb||null;}

  // tribunal a partir do número CNJ: {chave:'TJDFT', sigla:'TJ-DFT', segundoGrau:true|false}
  function tribunal(numero){
    var d=dig(numero);if(d.length!==20)return null;
    var j=d.charAt(13),tr=parseInt(d.slice(14,16),10),k='';
    if(j==='8')k=UF_TJ[tr]?'TJ'+UF_TJ[tr]:'';
    else if(j==='4')k=tr>=1&&tr<=6?'TRF'+tr:'';
    else if(j==='5')k=tr===0?'TST':'TRT'+tr;
    else if(j==='3')k='STJ';
    else if(j==='1')k='STF';
    else if(j==='7')k='STM';
    if(!k)return null;
    var segundo=d.slice(16,20)==='0000',uf='';
    if(j==='4'&&!segundo)uf=(SECAO[tr]||{})[d.slice(16,18)]||'';
    else if(j==='8')uf=UF_TJ[tr]==='DFT'?'DF':(UF_TJ[tr]||'');
    var secao=j==='4'&&uf?'JF'+uf:'';
    return {chave:k,sigla:siglaBonita(k),segundoGrau:segundo,uf:uf,secao:secao,
      secaoNome:secao?'Justiça Federal '+(UF_NOME[uf]||uf):''};
  }
  function carregar(sb){
    if(sb)L.sb=sb;
    if(L.lista)return Promise.resolve(L.lista);
    if(L.promessa)return L.promessa;
    var c=cliente();if(!c)return Promise.resolve([]);
    L.promessa=Promise.resolve(c.from('tribunais_links').select('tribunal_chave,nome,sistema,link,ordem').order('tribunal_chave').order('ordem').order('nome'))
      .then(function(r){L.lista=r&&!r.error?(r.data||[]):[];L.promessa=null;return L.lista;},function(){L.promessa=null;return [];});
    return L.promessa;
  }
  function linksDe(info){
    var dois=function(x){return /2[ºo°]?\s*grau|segundo grau|\b2g\b|pje2|2grau|2i\./i.test((x.nome||'')+' '+(x.sistema||'')+' '+(x.link||''));};
    var peso=function(x){return info.segundoGrau?(dois(x)?0:1):(dois(x)?1:0);};
    var provisorio=function(x){return /configurar/i.test(x.nome||'')||/google\.[a-z.]+\/search/i.test(x.link||'');};
    var ordem=function(a,b){return peso(a)-peso(b)||(a.ordem||0)-(b.ordem||0)||String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');};
    var validos=(L.lista||[]).filter(function(x){return /^https?:\/\//i.test(x.link||'');});
    var daSecao=info.secao&&!info.segundoGrau?validos.filter(function(x){return chaveNorm(x.tribunal_chave)===info.secao;}).sort(ordem)
      .map(function(x){return Object.assign({},x,{_secao:info.secaoNome});}):[];
    var doTrib=validos.filter(function(x){return chaveNorm(x.tribunal_chave)===info.chave;}).sort(ordem);
    var todos=daSecao.concat(doTrib);
    return todos.filter(function(x){return !provisorio(x);}).concat(todos.filter(provisorio));
  }

  function estilos(){
    if(document.getElementById('sagaTribunaisCss'))return;
    var s=document.createElement('style');s.id='sagaTribunaisCss';
    s.textContent=''
      +'.saga-trib{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:22px;height:22px;margin-left:4px;padding:0 4px;border:1px solid transparent;border-radius:6px;color:var(--muted,#8a94a8);font-size:10px;font-weight:600;text-decoration:none;vertical-align:middle;cursor:pointer;white-space:nowrap;transition:color .2s '+CURVA+',border-color .2s '+CURVA+',background-color .2s '+CURVA+'}'
      +'.saga-trib:hover,.saga-trib:focus-visible{color:var(--gold);border-color:color-mix(in srgb,var(--gold) 45%,transparent);background:color-mix(in srgb,var(--gold) 9%,transparent);outline:0}'
      +'.saga-trib.com-rotulo{padding:0 7px;border-color:var(--border-soft,rgba(127,127,127,.3));color:var(--text)}'
      +'.saga-trib.botao{height:30px;padding:0 11px;margin-left:0;border-color:var(--sb-sec-borda,var(--border-soft));background:var(--sb-sec,transparent);color:var(--text);font-size:11px;font-weight:500}'
      +'.saga-trib.botao:hover{background:var(--sb-sec-hover,transparent)}'
      +'.saga-trib-menu{position:fixed;z-index:6000;min-width:230px;max-width:min(330px,calc(100vw - 16px));padding:5px;border:1px solid var(--border,rgba(127,127,127,.3));border-radius:11px;background:var(--panel-solid,var(--panel,#1c2638));color:var(--text);box-shadow:0 16px 36px rgba(0,0,0,.35)}'
      +'.saga-trib-menu b{display:block;padding:6px 9px 4px;color:var(--gold);font-size:9px;letter-spacing:.6px;text-transform:uppercase}'
      +'.saga-trib-menu a{display:block;padding:8px 9px;border-radius:7px;color:var(--text);text-decoration:none;font-size:11.5px;line-height:1.35}'
      +'.saga-trib-menu a small{display:block;color:var(--muted);font-size:10px}'
      +'.saga-trib-menu a:hover,.saga-trib-menu a:focus-visible{background:color-mix(in srgb,var(--gold) 12%,transparent);outline:0}'
      +'.saga-trib-uf{display:inline-flex;align-items:center;height:17px;padding:0 6px;margin-left:4px;border:1px solid color-mix(in srgb,var(--info,#4b8af5) 45%,transparent);border-radius:999px;background:color-mix(in srgb,var(--info,#4b8af5) 12%,transparent);color:var(--text);font-size:9.5px;font-weight:700;letter-spacing:.04em;vertical-align:middle;line-height:1}';
    (document.head||document.documentElement).appendChild(s);
  }

  // HTML do botãozinho. o: {rotulo:true|'texto'} mostra a sigla ao lado do ícone; {botao:true} vira botão "Ver no TJ-DFT"; {classe:'...'}
  function icone(numero,o){
    o=o||{};var info=tribunal(numero);if(!info)return '';
    estilos();carregar();
    var texto=o.botao?'Ver no '+info.sigla:(o.rotulo?(typeof o.rotulo==='string'?o.rotulo:info.sigla):'');
    return '<a href="#" class="saga-trib'+(o.botao?' botao':texto?' com-rotulo':'')+(o.classe?' '+e(o.classe):'')+'" data-trib-num="'+dig(numero)+'"'
      +' title="Abrir no site do '+e(info.sigla)+' (o número do processo é copiado para colar na consulta)" aria-label="Abrir o processo no site do '+e(info.sigla)+'">'
      +ICO+(texto?'<span>'+e(texto)+'</span>':'')+'</a>';
  }

  var menuAberto=null;
  function fecharMenu(){
    var m=menuAberto;if(!m)return;menuAberto=null;
    document.removeEventListener('keydown',teclaMenu,true);
    m.hidden=true;setTimeout(function(){m.remove();},reduzido()?0:300);
  }
  function teclaMenu(ev){if(ev.key==='Escape'){ev.stopPropagation();fecharMenu();}}
  function menu(ancora,links,info){
    fecharMenu();
    var m=document.createElement('div');m.className='saga-trib-menu';m.setAttribute('role','menu');
    var misto=links.some(function(l){return l._secao;})&&links.some(function(l){return !l._secao;});
    m.innerHTML='<b>Abrir no '+e(info.sigla)+(info.secaoNome?' · '+e(info.uf):'')+'</b>'+links.map(function(l){
      var onde=misto?(l._secao?l._secao:info.sigla+' (2º grau)'):'';
      var sub=[onde,l.sistema].filter(Boolean).join(' · ');
      return '<a role="menuitem" href="'+e(l.link)+'" target="_blank" rel="noopener noreferrer">'+e(l.nome||'Consulta processual')+(sub?'<small>'+e(sub)+'</small>':'')+'</a>';}).join('');
    document.body.appendChild(m);menuAberto=m;
    var r=ancora.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
    var x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+6;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-6);
    m.style.left=x+'px';m.style.top=y+'px';
    m.addEventListener('click',function(){setTimeout(fecharMenu,0);});
    document.addEventListener('keydown',teclaMenu,true);
    var p=m.querySelector('a');if(p)p.focus({preventScroll:true});
  }
  function abrir(numero,ancora){
    var info=tribunal(numero);if(!info)return;
    // copia o número para colar na consulta do tribunal
    if(typeof global.sagaCopiar==='function')global.sagaCopiar(cnj(numero),'Número do processo');
    var seguir=function(){
      var l=linksDe(info);
      if(!l.length){aviso('Ainda não há link do '+(info.secaoNome?info.sigla+' ('+info.secaoNome+')':info.sigla)+'. Cadastre em Intimações > Links dos tribunais.','warning');return;}
      if(l.length===1){global.open(l[0].link,'_blank','noopener');return;}
      menu(ancora,l,info);
    };
    if(L.lista)seguir();else carregar().then(seguir);
  }
  // um só ouvinte para a página toda (antes do clique do cartão, que abriria a ficha)
  document.addEventListener('click',function(ev){
    if(menuAberto&&!menuAberto.contains(ev.target)&&!(ev.target.closest&&ev.target.closest('[data-trib-num]')))fecharMenu();
    var a=ev.target.closest&&ev.target.closest('[data-trib-num]');if(!a)return;
    ev.preventDefault();ev.stopPropagation();
    abrir(a.getAttribute('data-trib-num'),a);
  },true);
  // botão do meio (ou Ctrl+clique) não abre a ficha por trás
  document.addEventListener('auxclick',function(ev){var a=ev.target.closest&&ev.target.closest('[data-trib-num]');if(a){ev.preventDefault();ev.stopPropagation();}},true);

  // etiqueta curta do estado da Justiça Federal de 1º grau (ex.: "RJ"), para cartões e listas
  function selo(numero,o){
    o=o||{};var info=tribunal(numero);if(!info||!info.secao)return '';
    estilos();
    return '<span class="saga-trib-uf'+(o.classe?' '+e(o.classe):'')+'" title="'+e(info.secaoNome+' ('+info.sigla+')')+'">'+e(info.uf)+'</span>';
  }
  global.SagaTribunais={icone:icone,selo:selo,tribunal:tribunal,carregar:carregar,links:function(numero){var i=tribunal(numero);return i?linksDe(i):[];},abrir:abrir};
})(window);
