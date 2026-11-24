/* =====================================================================
   SAGA · Teses e oportunidades > Servidores de AL e Maceió (blocos 450 a 453)
   Servidores ATIVOS, APOSENTADOS e PENSIONISTAS do Estado de Alagoas (API pública do Portal da
   Transparência) e da Prefeitura de Maceió (exportação oficial do portal antigo), mês a mês,
   lidos pelo robô servidores-al. Para licença-prêmio, falecidos sem pensionista (inventário),
   pensões novas e aposentadorias. SÓ o administrador geral (o banco recusa os outros: servpub_checar).
   CPF sempre como o Portal mostra (mascarado). Exportação registrada no Registro de atividades.
   Contato com quem não é cliente só pela ANCREF.
   ===================================================================== */
(function(global){
  'use strict';
  var S={montado:false,painel:null,parte:'geral',
    f:{ente:'',lista:'',evento:'',de:'',ate:'',texto:'',orgao:'',cargo:'',portal:false,min:'',max:'',clientes:'',pagina:1},
    pedido:0};
  var LIM=50,MAX_CSV=20000;
  // 24/11 (Dr. Victor): paginação comum (saga_paginacao.js); a página continua em S.f.pagina
  var PAG=null;function pag(){if(!PAG)PAG=SagaPaginacao.criar({tela:'servidores-al',rotulo:'pessoas',aoMudar:function(P){S.f.pagina=P.pagina;carregarLista();}});return PAG;}
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  var ENTE={estado_al:'Estado de Alagoas',municipio_maceio:'Prefeitura de Maceió'};
  var LISTA={ativo:'Ativo',aposentado:'Aposentado',pensionista:'Pensionista'};
  var EVENTO={aposentou:'Aposentou',aposentado_saiu:'Aposentado saiu da folha sem pensão (provável falecido: conferir)',pensao_nova:'Pensão nova',
    entrou:'Entrou na folha',saiu:'Saiu da folha (ativo)',pensao_terminou:'Pensão terminou',mudou_cargo:'Mudou de cargo',mudou_orgao:'Mudou de órgão'};
  var EV_CURTO={aposentou:'aposentou',aposentado_novo:'aposentou',aposentado_saiu:'saiu sem pensão',pensao_nova:'pensão nova',entrou:'entrou',saiu:'saiu',
    pensao_terminou:'pensão terminou',mudou_cargo:'mudou de cargo',mudou_orgao:'mudou de órgão',voltou:'voltou à folha'};

  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erro(e){return esc(global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e)));}
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function reais(v){if(v==null||v==='')return '—';return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function $(id){return document.getElementById(id);}
  function sb(){return global._sb;}
  function mesBR(d){var m=/^(\d{4})-(\d{2})/.exec(String(d||''));return m?m[2]+'/'+m[1]:'';}
  function dataHora(d){if(!d)return '';try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return d;}}
  function mesMascara(v){var d=String(v||'').replace(/\D/g,'').slice(0,6);return d.length>2?d.slice(0,2)+'/'+d.slice(2):d;}
  function mesNum(v){var m=/^(\d{2})\/(\d{4})$/.exec(String(v||''));if(!m)return null;var mm=+m[1];if(mm<1||mm>12)return null;return +(m[2]+m[1]);}
  function valorMascara(v){var d=String(v||'').replace(/\D/g,'').slice(0,9);if(!d)return '';return Number(d).toLocaleString('pt-BR');}
  function valorNum(v){var d=String(v||'').replace(/\D/g,'');return d?Number(d):null;}
  function versao(){var s=document.querySelector('script[src*="saga_ui.js"]');var m=s&&/\?v=(\d+)/.exec(s.getAttribute('src'));return m?m[1]:'';}
  function carregar(arq,glob){return new Promise(function(ok,falha){if(global[glob])return ok();var s=document.createElement('script');s.src=arq+'?v='+versao();s.onload=function(){ok();};s.onerror=function(){falha(new Error('Não carregou '+arq));};document.head.appendChild(s);});}
  function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}

  var CSS=`
#aba-servidores_al .sa-aviso{border:1px solid var(--border-soft);border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--muted);margin-bottom:12px;background:var(--panel);line-height:1.5}
#aba-servidores_al .sa-aviso b{color:var(--text)}
#aba-servidores_al .sa-aviso.amar{border-left-color:#c98500}
#aba-servidores_al .sa-aviso.verm{border-left-color:var(--danger,#d6452d);color:var(--text)}
#aba-servidores_al .sa-partes{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
#aba-servidores_al .sa-corpo{transition:opacity .28s cubic-bezier(.22,.78,.25,1),transform .28s cubic-bezier(.22,.78,.25,1)}
#aba-servidores_al .sa-corpo.entrando{opacity:0;transform:translateY(6px)}
#aba-servidores_al .sa-ente{margin-bottom:14px}
#aba-servidores_al .sa-ente h3{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--text)}
#aba-servidores_al .sa-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
#aba-servidores_al .sa-num{border:1px solid var(--border-soft);border-radius:12px;padding:9px 10px;background:var(--panel);color:var(--text);font:inherit;text-align:left;min-height:64px;display:flex;flex-direction:column;gap:2px}
#aba-servidores_al button.sa-num{cursor:pointer}
#aba-servidores_al button.sa-num:hover,#aba-servidores_al button.sa-num:focus-visible{border-color:var(--gold);outline:0}
#aba-servidores_al .sa-num b{font-size:19px;font-variant-numeric:lining-nums tabular-nums}
#aba-servidores_al .sa-num span{font-size:11px;color:var(--muted);line-height:1.25}
#aba-servidores_al .sa-bloco{border:1px solid var(--border-soft);border-radius:14px;background:var(--panel);padding:12px 14px;margin-bottom:14px}
#aba-servidores_al .sa-bloco h3{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--text)}
#aba-servidores_al .sa-bloco p.sub,#aba-servidores_al .sa-bloco li{font-size:12px;color:var(--muted);line-height:1.5}
#aba-servidores_al .sa-bloco ul{margin:4px 0 0;padding-left:18px}
#aba-servidores_al .sa-selo{display:inline-flex;align-items:center;border:1px solid var(--border-soft);border-radius:999px;padding:1px 8px;font-size:10.5px;white-space:nowrap;margin:0 3px 3px 0;color:var(--text)}
#aba-servidores_al .sa-selo.conf{border-color:#c98500;color:#c98500}
#aba-servidores_al .sa-selo.cli,#moServAl .sa-selo.cli{border-color:var(--gold);color:var(--gold)}
#aba-servidores_al .sa-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
#aba-servidores_al .sa-filtros input:not([type=checkbox]),#aba-servidores_al .sa-filtros select{min-width:130px}
#aba-servidores_al .sa-filtros .sa-busca{flex:1 1 220px}
#aba-servidores_al .sa-filtros input.sa-mes,#aba-servidores_al .sa-filtros input.sa-val{width:118px;min-width:0}
#aba-servidores_al .sa-filtros label.sa-chk{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--muted);white-space:nowrap}
#aba-servidores_al .sa-rolagem{overflow-x:auto}
#aba-servidores_al .sa-tab,#moServAl .sa-tab{width:100%;border-collapse:collapse;font-size:12.5px}
#aba-servidores_al .sa-tab th,#moServAl .sa-tab th{text-align:left;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:7px 8px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
#aba-servidores_al .sa-tab td,#moServAl .sa-tab td{padding:7px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top}
#aba-servidores_al .sa-tab td.n,#moServAl .sa-tab td.n{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
#aba-servidores_al .sa-nome,#moServAl .sa-nome{background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--text);cursor:pointer;text-align:left}
#aba-servidores_al .sa-nome:hover,#aba-servidores_al .sa-nome:focus-visible{text-decoration:underline;outline:0}
#aba-servidores_al .sa-sub,#moServAl .sa-sub{display:block;font-size:10.5px;color:var(--muted);line-height:1.4}
#aba-servidores_al .sa-vazio{padding:24px;text-align:center;color:var(--muted);font-size:13px}
#aba-servidores_al .sa-pag{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12px;color:var(--muted);flex-wrap:wrap}
#aba-servidores_al .sa-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
#aba-servidores_al .sa-carregando{opacity:.55;transition:opacity .2s cubic-bezier(.22,.78,.25,1)}
#aba-servidores_al .sa-barra{height:8px;border-radius:999px;background:var(--border-soft);overflow:hidden;margin:6px 0}
#aba-servidores_al .sa-barra > i{display:block;height:100%;background:var(--gold);border-radius:999px}
#moServAl .sa-sec{margin:12px 0 0}
#moServAl .sa-sec h4{font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);margin:0 0 6px}
#moServAl .sa-lin{font-size:12.5px;line-height:1.5;padding:4px 0;border-bottom:1px solid var(--border-soft)}
#moServAl .sa-lin:last-child{border-bottom:0}
#moServAl .sa-rolagem{overflow-x:auto;max-height:280px;overflow-y:auto}
@media(max-width:700px){#aba-servidores_al .sa-tab thead{display:none}#aba-servidores_al .sa-tab tr{display:block;border-bottom:1px solid var(--border-soft);padding:6px 0}#aba-servidores_al .sa-tab td{display:block;border:0;padding:3px 4px}#aba-servidores_al .sa-tab td[data-r]::before{content:attr(data-r) ": ";color:var(--muted);font-size:10.5px}#aba-servidores_al .sa-filtros input:not([type=checkbox]),#aba-servidores_al .sa-filtros select{flex:1 1 45%;min-width:0}#aba-servidores_al .sa-filtros input.sa-mes,#aba-servidores_al .sa-filtros input.sa-val{flex:1 1 40%;width:auto}#aba-servidores_al .sa-acoes{margin-left:0}}
@media(prefers-reduced-motion:reduce){#aba-servidores_al .sa-corpo,#aba-servidores_al .sa-carregando{transition:none}}
html.saga-movimento-reduzido #aba-servidores_al .sa-corpo{transition:none}
`;
  function estilos(){if($('sagaServAlCss'))return;var s=document.createElement('style');s.id='sagaServAlCss';s.textContent=CSS;document.head.appendChild(s);}
  function aviso(msg,tipo){var w=$('saMsg');if(!w)return;w.className='sa-aviso'+(tipo==='erro'?' verm':tipo==='amar'?' amar':'');w.innerHTML=msg;w.hidden=!msg;}

  /* ---------- montagem ---------- */
  function htmlPartes(){
    var bt=function(k,t){return '<button class="pill'+(S.parte===k?' active':'')+'" type="button" data-parte="'+k+'">'+t+'</button>';};
    return bt('geral','Visão geral')+bt('pessoas','Pessoas')+bt('licenca','Licença-prêmio')+bt('carga','Carga e LGPD');
  }
  function htmlCarga(){
    var p=S.painel||{},c=p.carga||{},u=p.ultima_rodada,h='';
    if(u&&u.ok===false)h+='<div class="sa-aviso verm"><b>A última rodada do robô falhou</b> ('+esc(dataHora(u.inicio))+'): '+esc(u.mensagem||'sem motivo')+'. O robô tenta de novo sozinho; se repetir, aparece na Saúde do sistema.</div>';
    var falta=Object.keys(c).some(function(k){return c[k].feitas<c[k].total;});
    if(falta)h+='<div class="sa-aviso amar"><b>Carga em andamento.</b> '+Object.keys(c).map(function(k){return esc(ENTE[k]||k)+': '+num(c[k].feitas)+' de '+num(c[k].total)+' meses lidos'+(c[k].ultimo_mes?' (até '+esc(mesBR(c[k].ultimo_mes))+')':'');}).join(' · ')+'. Os números crescem sozinhos.</div>';
    return h;
  }
  function desenhar(){
    var pane=$('aba-servidores_al');if(!pane)return;var p=S.painel||{};
    pane.innerHTML='<div class="sa-aviso"><b>Finalidade (LGPD):</b> '+esc(p.finalidade||'')+' Só o administrador geral vê; CPF como o Portal mostra (mascarado); cada exportação fica no Registro de atividades.</div>'+
      htmlCarga()+'<div class="sa-aviso" id="saMsg" hidden></div>'+
      '<div class="sa-partes" id="saPartes" role="group" aria-label="Partes">'+htmlPartes()+'</div><div class="sa-corpo" id="saCorpo"></div>';
    $('saPartes').onclick=function(e){var b=e.target.closest('[data-parte]');if(b)trocarParte(b.dataset.parte);};
    pane.onclick=function(e){
      var pe=e.target.closest('[data-pessoa]');if(pe){e.preventDefault();abrirPessoa(+pe.dataset.pessoa);return;}
      var ir=e.target.closest('[data-ir]');if(ir){try{irPessoas(JSON.parse(ir.dataset.ir));}catch(x){}return;}
    };
    desenharParte();
  }
  function trocarParte(k){
    S.parte=k;var ps=$('saPartes');if(ps)ps.querySelectorAll('[data-parte]').forEach(function(b){b.classList.toggle('active',b.dataset.parte===k);});
    desenharParte();
  }
  function desenharParte(){
    var c=$('saCorpo');if(!c)return;
    if(!parado()){c.classList.add('entrando');requestAnimationFrame(function(){requestAnimationFrame(function(){c.classList.remove('entrando');});});}
    if(S.parte==='pessoas')partePessoas(c);else if(S.parte==='licenca')parteLicenca(c);else if(S.parte==='carga')parteCarga(c);else parteGeral(c);
  }

  /* ---------- Visão geral ---------- */
  function parteGeral(c){
    var p=S.painel||{},pe=p.por_ente||{},ev=p.eventos_12m||{};
    function bt(n,t,filtro){return '<button type="button" class="sa-num" data-ir=\''+esc(JSON.stringify(filtro))+'\'><b>'+num(n)+'</b><span>'+esc(t)+'</span></button>';}
    var h='';
    ['estado_al','municipio_maceio'].forEach(function(e){
      var x=pe[e]||{};function v(t){return ev[e+':'+t]||0;}
      h+='<div class="sa-ente"><h3>'+esc(ENTE[e])+'</h3><div class="sa-nums">'+
        bt(x.ativo,'ativos na folha',{ente:e,lista:'ativo',portal:true})+bt(x.aposentado,'aposentados na folha',{ente:e,lista:'aposentado',portal:true})+
        bt(x.pensionista,'pensionistas na folha',{ente:e,lista:'pensionista',portal:true})+
        bt(v('aposentado_novo'),'aposentaram nos últimos 12 meses',{ente:e,evento:'aposentou'})+
        bt(v('aposentado_saiu'),'aposentados que saíram sem pensão em 12 meses (provável falecido: conferir)',{ente:e,evento:'aposentado_saiu'})+
        bt(v('pensao_nova'),'pensões novas em 12 meses',{ente:e,evento:'pensao_nova'})+
        '<div class="sa-num"><b>'+num(x.fora)+'</b><span>já saíram da folha (histórico)</span></div></div></div>';
    });
    h+='<div class="sa-nums" style="margin-bottom:14px">'+bt(p.clientes,'fichas do SAGA ligadas (nome + dígitos do CPF)',{clientes:'sim'})+
      '<div class="sa-num"><b>'+num(p.na_base_unica)+'</b><span>pessoas já ligadas à Base única</span></div></div>'+
      '<div class="sa-bloco"><h3>Como ler</h3><ul>'+
      '<li><b>Aposentou</b>: saiu da lista de ativos e entrou na de aposentados no mês. No Estado não há data de admissão nem do ato de aposentadoria: o mês é o da folha.</li>'+
      '<li><b>Saiu sem pensão</b>: aposentado que sumiu da folha 2 meses seguidos e não voltou. Pode ser falecimento sem pensionista, perda do benefício ou mudança de folha: <b>sempre conferir</b> antes de qualquer contato.</li>'+
      '<li><b>Pensão nova</b>: apareceu como pensionista. O Portal não diz de quem é a pensão.</li>'+
      '<li>Ligação com as fichas: nome completo igual <b>e</b> os dígitos visíveis do CPF iguais. Nunca só o nome.</li></ul></div>';
    c.innerHTML=h;
  }

  /* ---------- Pessoas ---------- */
  function irPessoas(filtro){
    S.f={ente:filtro.ente||'',lista:filtro.lista||'',evento:filtro.evento||'',de:filtro.de||'',ate:filtro.ate||'',texto:'',orgao:'',cargo:filtro.cargo||'',
      portal:!!filtro.portal,min:filtro.min||'',max:'',clientes:filtro.clientes||'',pagina:1};
    trocarParte('pessoas');
  }
  function opcoes(obj,atual,vazio){return '<option value="">'+esc(vazio)+'</option>'+Object.keys(obj).map(function(k){return '<option value="'+esc(k)+'"'+(k===atual?' selected':'')+'>'+esc(obj[k])+'</option>';}).join('');}
  function partePessoas(c){
    var F=S.f;
    c.innerHTML='<div class="sa-bloco"><div class="sa-filtros">'+
      '<input type="search" class="sa-busca" id="saTexto" placeholder="Nome" value="'+esc(F.texto)+'" aria-label="Buscar pelo nome">'+
      '<select id="saEnte" aria-label="Esfera">'+opcoes(ENTE,F.ente,'Estado e Maceió')+'</select>'+
      '<select id="saLista" aria-label="Situação">'+opcoes(LISTA,F.lista,'Toda situação')+'</select>'+
      '<input type="text" id="saOrgao" placeholder="Órgão ou secretaria" value="'+esc(F.orgao)+'" aria-label="Órgão">'+
      '<input type="text" id="saCargo" placeholder="Cargo" value="'+esc(F.cargo)+'" aria-label="Cargo">'+
      '<select id="saEvento" aria-label="Acontecimento">'+opcoes(EVENTO,F.evento,'Qualquer acontecimento')+'</select>'+
      '<input type="text" class="sa-mes" id="saDe" inputmode="numeric" placeholder="de mm/aaaa" value="'+esc(F.de)+'" aria-label="Acontecimento a partir de">'+
      '<input type="text" class="sa-mes" id="saAte" inputmode="numeric" placeholder="até mm/aaaa" value="'+esc(F.ate)+'" aria-label="Acontecimento até">'+
      '<input type="text" class="sa-val" id="saMin" inputmode="numeric" placeholder="R$ de" value="'+esc(F.min)+'" aria-label="Remuneração a partir de">'+
      '<input type="text" class="sa-val" id="saMax" inputmode="numeric" placeholder="R$ até" value="'+esc(F.max)+'" aria-label="Remuneração até">'+
      '<select id="saCli" aria-label="Cliente do SAGA"><option value="">Cliente ou não</option><option value="sim"'+(F.clientes==='sim'?' selected':'')+'>Só clientes do SAGA</option><option value="nao"'+(F.clientes==='nao'?' selected':'')+'>Só quem não é cliente</option></select>'+
      '<label class="sa-chk"><input type="checkbox" id="saPortal"'+(F.portal?' checked':'')+'> Só quem ainda está na folha</label>'+
      '<div class="sa-acoes"><button class="btn" type="button" id="saLimpar">Limpar</button><button class="btn" type="button" id="saCsv">CSV</button><button class="btn" type="button" id="saPdf">PDF</button></div></div>'+
      '<div id="saLista2"><div class="sa-vazio">Carregando…</div></div></div>';
    ['saDe','saAte'].forEach(function(id){$(id).addEventListener('input',function(e){e.target.value=mesMascara(e.target.value);});});
    ['saMin','saMax'].forEach(function(id){$(id).addEventListener('input',function(e){e.target.value=valorMascara(e.target.value);});});
    var tm=null;function mudou(){clearTimeout(tm);tm=setTimeout(function(){lerFiltros();S.f.pagina=1;carregarLista();},400);}
    ['saTexto','saOrgao','saCargo','saDe','saAte','saMin','saMax'].forEach(function(id){$(id).addEventListener('input',mudou);});
    ['saEnte','saLista','saEvento','saCli','saPortal'].forEach(function(id){$(id).addEventListener('change',mudou);});
    $('saLimpar').onclick=function(){irPessoas({});};
    $('saCsv').onclick=function(){exportar('csv');};
    $('saPdf').onclick=function(){exportar('pdf');};
    carregarLista();
  }
  function lerFiltros(){
    var F=S.f;F.texto=$('saTexto').value.trim();F.ente=$('saEnte').value;F.lista=$('saLista').value;F.orgao=$('saOrgao').value.trim();F.cargo=$('saCargo').value.trim();
    F.evento=$('saEvento').value;F.de=$('saDe').value;F.ate=$('saAte').value;F.min=$('saMin').value;F.max=$('saMax').value;F.clientes=$('saCli').value;F.portal=$('saPortal').checked;
  }
  function params(F,lim,pag){
    return {p_ente:F.ente||null,p_lista:F.lista||null,p_evento:F.evento||null,p_ev_de:mesNum(F.de),p_ev_ate:mesNum(F.ate),p_texto:F.texto||null,
      p_orgao:F.orgao||null,p_cargo:F.cargo||null,p_so_portal:!!F.portal,p_bruto_min:valorNum(F.min),p_bruto_max:valorNum(F.max),
      p_clientes:F.clientes||null,p_limite:lim,p_offset:(pag-1)*lim};
  }
  function htmlFichas(fs){return (fs||[]).map(function(f){return '<a class="sa-selo cli" href="'+FICHA+'?pessoa_id='+encodeURIComponent(f.id)+'">'+esc(f.codigo||'cliente')+'</a>';}).join('');}
  async function carregarLista(){
    var box=$('saLista2');if(!box)return;var F=S.f,meu=++S.pedido;box.classList.add('sa-carregando');
    if((F.de&&!mesNum(F.de))||(F.ate&&!mesNum(F.ate))){box.classList.remove('sa-carregando');box.innerHTML='<div class="sa-aviso amar">Mês inválido: use mm/aaaa (ex.: 03/2025).</div>';return;}
    var P=pag();P.pagina=F.pagina||1;
    var r=await SagaPaginacao.buscarEmPartes(function(off,lim){return sb().rpc('servpub_buscar',params(F,lim,Math.floor(off/lim)+1)).then(function(x){return x.error?x:{linhas:(x.data||{}).linhas,total:(x.data||{}).total};});},
      {offset:P.offset(),quantos:P.quantos(),lote:500,progresso:function(a,t){if(meu===S.pedido&&t>500)box.innerHTML='<div class="sg-pag-carregando">Carregando '+num(a)+' de '+num(t)+'…</div>';}});
    if(meu!==S.pedido)return;box.classList.remove('sa-carregando');
    if(r.error){box.innerHTML='<div class="sa-aviso verm">Não deu para buscar: '+erro(r.error)+'</div>';return;}
    var d=r,ls=d.linhas||[];P.total(d.total);F.pagina=P.pagina;
    if(!ls.length){box.innerHTML='<div class="sa-vazio">Ninguém com esses filtros.</div>';return;}
    box.innerHTML='<div class="sa-rolagem"><table class="sa-tab"><thead><tr><th>Pessoa</th><th>Situação</th><th>Órgão e cargo</th><th>Remuneração</th><th>Na folha</th></tr></thead><tbody>'+
      ls.map(function(l){
        return '<tr><td><button type="button" class="sa-nome" data-pessoa="'+(+l.id)+'">'+esc(l.nome)+'</button>'+
          '<span class="sa-sub">'+esc(l.cpf_mascara||'sem CPF')+' · '+esc(ENTE[l.ente]||l.ente)+'</span>'+htmlFichas(l.fichas)+'</td>'+
          '<td data-r="Situação"><span class="sa-selo">'+esc(LISTA[l.lista]||l.lista)+(l.vinculo&&l.lista==='ativo'?' · '+esc(l.vinculo):'')+'</span>'+
            (l.ev_mes?'<span class="sa-selo'+(F.evento==='aposentado_saiu'?' conf':'')+'">'+esc(EV_CURTO[F.evento]||F.evento)+' em '+esc(mesBR(l.ev_mes))+'</span>':'')+
            (!l.no_portal?'<span class="sa-selo conf">fora da folha desde '+esc(mesBR(l.saiu_mes)||'?')+'</span>':'')+'</td>'+
          '<td data-r="Órgão e cargo">'+esc(l.orgao||'—')+(l.cargo?'<span class="sa-sub">'+esc(l.cargo)+'</span>':'')+'</td>'+
          '<td data-r="Remuneração" class="n">'+reais(l.ultimo_bruto!=null?l.ultimo_bruto:l.ultimo_liquido)+'<span class="sa-sub">'+(l.ultimo_bruto!=null?'bruto':'líquido')+' de '+esc(mesBR(l.ultimo_mes))+'</span></td>'+
          '<td data-r="Na folha" class="n">'+esc(mesBR(l.primeiro_mes))+' a '+esc(mesBR(l.ultimo_mes))+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      P.html();
    P.ligar(box);
  }
  async function todasLinhas(F){
    var r=await sb().rpc('servpub_buscar',params(F,500,1));if(r.error)throw r.error;
    var total=(r.data||{}).total||0,ls=(r.data.linhas||[]).slice(),pag=2;
    if(total>MAX_CSV)aviso('São '+num(total)+' pessoas: a exportação leva as primeiras '+num(MAX_CSV)+'. Use os filtros para dividir.','amar');
    while(ls.length<Math.min(total,MAX_CSV)){var x=await sb().rpc('servpub_buscar',params(F,500,pag++));if(x.error)throw x.error;var a=x.data.linhas||[];if(!a.length)break;ls=ls.concat(a);}
    return ls;
  }
  async function exportar(tipo){
    var F=S.f,b=$(tipo==='csv'?'saCsv':'saPdf');b.disabled=true;var txt=b.textContent;b.textContent='Gerando…';
    try{
      var ls=await todasLinhas(F);
      var cab=['Nome','CPF (mascarado)','Esfera','Situação','Vínculo','Órgão','Cargo','Remuneração (último mês)','Na folha de','até','Ainda na folha','Acontecimento','Mês do acontecimento','Cliente do SAGA'];
      var linhas=ls.map(function(l){return [l.nome,l.cpf_mascara||'',ENTE[l.ente]||l.ente,LISTA[l.lista]||l.lista,l.vinculo||'',l.orgao||'',l.cargo||'',
        l.ultimo_bruto!=null?l.ultimo_bruto:(l.ultimo_liquido!=null?l.ultimo_liquido:''),mesBR(l.primeiro_mes),mesBR(l.ultimo_mes),l.no_portal?'sim':'não',
        F.evento?(EV_CURTO[F.evento]||F.evento):'',mesBR(l.ev_mes),(l.fichas||[]).map(function(f){return f.codigo;}).join(' ')];});
      var reg=await sb().rpc('servpub_registrar',{p_resumo:'Servidores AL/Maceió: exportou '+tipo.toUpperCase()+' ('+linhas.length+' pessoas)',p_depois:{filtros:params(F,MAX_CSV,1),linhas:linhas.length,tipo:tipo}});
      if(reg.error)throw reg.error;
      if(tipo==='csv'){
        var csv='﻿'+[cab].concat(linhas).map(function(r){return r.map(function(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(';');}).join('\r\n');
        var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='servidores-al-maceio.csv';document.body.appendChild(a);a.click();a.remove();
      }else{
        await carregar('saga_pdf.js','SagaPdf');
        if(!global.SagaPdf)throw new Error('O gerador de PDF (saga_pdf.js) não carregou nesta tela.');
        var tab='<table class="tab"><thead><tr><th>Nome</th><th>CPF</th><th>Esfera</th><th>Situação</th><th>Órgão / cargo</th><th>Remuneração</th><th>Acontecimento</th></tr></thead><tbody>'+
          ls.map(function(l){return '<tr><td>'+esc(l.nome)+'</td><td>'+esc(l.cpf_mascara||'')+'</td><td>'+esc(ENTE[l.ente]||'')+'</td><td>'+esc(LISTA[l.lista]||'')+'</td><td>'+esc(l.orgao||'')+(l.cargo?' / '+esc(l.cargo):'')+'</td><td>'+esc(reais(l.ultimo_bruto!=null?l.ultimo_bruto:l.ultimo_liquido))+'</td><td>'+(l.ev_mes?esc((EV_CURTO[F.evento]||'')+' '+mesBR(l.ev_mes)):'')+'</td></tr>';}).join('')+'</tbody></table>';
        global.SagaPdf.imprimir({titulo:'Servidores do Estado de Alagoas e de Maceió',subtitulo:num(ls.length)+' pessoas · dados públicos dos Portais da Transparência · uso interno (LGPD)',arquivo:'servidores-al-maceio',paisagem:true,paginas:[tab]});
      }
      aviso(tipo.toUpperCase()+' gerado com '+num(linhas.length)+' pessoas. Registrado no Registro de atividades. Contato com quem não é cliente só pela ANCREF.','');
    }catch(e){aviso('Não deu para exportar: '+erro(e),'erro');}
    b.disabled=false;b.textContent=txt;
  }

  /* ---------- Licença-prêmio ---------- */
  function parteLicenca(c){
    var hoje=new Date(),cinco=('0'+(hoje.getMonth()+1)).slice(-2)+'/'+(hoje.getFullYear()-5);
    c.innerHTML='<div class="sa-bloco"><h3>Público da licença-prêmio <span class="sa-selo conf">a confirmar com o Dr. Victor</span></h3><ul>'+
      '<li><b>Prazo</b>: 5 anos contados da aposentadoria (STJ, Tema 516). Quem se aposentou antes de '+esc(cinco)+' já está fora.</li>'+
      '<li><b>Estado de Alagoas</b>: Lei 5.247/1991, art. 91 (3 meses a cada 5 anos), revogado pela Lei 6.043, de 02/07/1998; valem os períodos completos até essa data. Público: quem entrou até 1993. O Portal do Estado <b>não</b> informa a data de admissão: conferir na ficha funcional.</li>'+
      '<li><b>Prefeitura de Maceió</b>: segundo o sindicato (Sindspref, 2024), a licença continua para todo efetivo (Lei 4.973/2000, a confirmar no texto). Quanto mais tempo de casa e maior o salário, maior o valor (caso modelo VMM-00054-LP: engenheiro, 35 anos de serviço, causa de R$ 553 mil).</li>'+
      '<li><b>Herdeiros e pensionistas</b> de quem morreu: a confirmar.</li>'+
      '<li><b>Não pode</b>: aposentado há mais de 5 anos; quem gozou ou contou a licença em dobro; comissionado sem vínculo; celetista.</li></ul></div>'+
      '<div class="sa-nums">'+
      '<button type="button" class="sa-num" data-ir=\''+esc(JSON.stringify({ente:'municipio_maceio',evento:'aposentou',de:cinco}))+'\'><b>Maceió</b><span>aposentados nos últimos 5 anos</span></button>'+
      '<button type="button" class="sa-num" data-ir=\''+esc(JSON.stringify({ente:'estado_al',evento:'aposentou',de:cinco}))+'\'><b>Estado</b><span>aposentados nos últimos 5 anos (conferir a admissão até 1993)</span></button>'+
      '<button type="button" class="sa-num" data-ir=\''+esc(JSON.stringify({evento:'aposentou',de:cinco,min:'10.000'}))+'\'><b>R$ 10 mil+</b><span>aposentados nos últimos 5 anos com remuneração alta</span></button>'+
      '<button type="button" class="sa-num" data-ir=\''+esc(JSON.stringify({evento:'aposentado_saiu',de:cinco}))+'\'><b>Herdeiros</b><span>aposentados que saíram da folha sem pensão (conferir falecimento)</span></button>'+
      '</div>';
  }

  /* ---------- Carga e LGPD ---------- */
  function parteCarga(c){
    var p=S.painel||{},cg=p.carga||{};
    var h='<div class="sa-bloco"><h3>Carga dos Portais</h3><p class="sub">O robô do SAGA lê devagar: Estado pela API pública do Portal da Transparência (desde 01/2019); Maceió pela exportação oficial da tela Servidores do portal antigo (desde 01/2020, um vínculo e um mês por vez). Erros aparecem aqui e na Saúde do sistema.</p>';
    Object.keys(cg).forEach(function(k){var x=cg[k],pc=x.total?Math.round(100*x.feitas/x.total):0;
      h+='<div style="margin:10px 0"><b>'+esc(ENTE[k]||k)+'</b>: '+num(x.feitas)+' de '+num(x.total)+' pedaços lidos'+(x.ultimo_mes?' (até '+esc(mesBR(x.ultimo_mes))+')':'')+(x.vazias?' · '+num(x.vazias)+' ainda não publicados':'')+
        '<div class="sa-barra"><i style="width:'+pc+'%"></i></div>'+(x.erro?'<span class="sa-sub" style="color:var(--danger,#d6452d)">'+num(x.erro)+' com erro: '+esc(x.erro_msg||'')+' (nova tentativa sozinha)</span>':'')+'</div>';});
    var u=p.ultima_rodada;
    h+=(u?'<p class="sub">Última rodada: '+esc(dataHora(u.inicio))+' · '+(u.ok?'ok':'falhou')+' · '+esc(u.mensagem||'')+'</p>':'<p class="sub">O robô ainda não rodou.</p>')+
      '<div class="sa-pag"><div class="sa-acoes"><button class="btn" type="button" id="saCruzar">Cruzar com as fichas do SAGA</button></div></div></div>'+
      '<div class="sa-bloco"><h3>LGPD</h3><ul><li>Só dados públicos dos Portais e só os campos úteis (nome, CPF mascarado, órgão, cargo, vínculo, remuneração quando muda, entradas e saídas da folha).</li>'+
      '<li>Só o administrador geral vê. Ninguém grava pela tela. Nada apaga.</li><li>Contato com quem não é cliente só pela ANCREF; "Não enviar mais" fica na Base única e a pessoa continua na lista.</li></ul></div>';
    c.innerHTML=h;
    $('saCruzar').onclick=async function(){var b=this;b.disabled=true;b.textContent='Cruzando…';
      var r=await sb().rpc('servpub_cruzar');b.disabled=false;b.textContent='Cruzar com as fichas do SAGA';
      if(r.error){aviso('Não deu para cruzar: '+erro(r.error),'erro');return;}
      aviso('Cruzamento feito: '+num(r.data.novas)+' ligação(ões) nova(s); '+num(r.data.total)+' no total.','');recarregarPainel();};
  }
  async function recarregarPainel(){var r=await sb().rpc('servpub_painel');if(!r.error){S.painel=r.data||{};}}

  /* ---------- janela da pessoa ---------- */
  function janela(){
    var mo=$('moServAl');
    if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='moServAl';mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-label','Servidor');
      mo.innerHTML='<div class="md largo" id="mdServAl"></div>';document.body.appendChild(mo);
      mo.addEventListener('click',function(e){if(e.target===mo||e.target.closest('[data-fechar-sa]'))fechar();var p=e.target.closest('[data-pessoa]');if(p){e.preventDefault();abrirPessoa(+p.dataset.pessoa);}});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&mo.classList.contains('aberto'))fechar();});}
    return mo;
  }
  function fechar(){var mo=$('moServAl');if(mo)mo.classList.remove('aberto');}
  async function abrirPessoa(id){
    var mo=janela(),md=$('mdServAl');
    md.innerHTML='<div class="md-cab"><div><h2>Carregando…</h2></div><button class="md-x" type="button" data-fechar-sa aria-label="Fechar">✕</button></div>';
    mo.classList.add('aberto');
    var r=await sb().rpc('servpub_pessoa',{p_id:id});
    if(r.error){md.innerHTML='<div class="md-cab"><div><h2>Não deu para abrir</h2><p>'+erro(r.error)+'</p></div><button class="md-x" type="button" data-fechar-sa aria-label="Fechar">✕</button></div>';return;}
    var d=r.data||{},s=d.pessoa||{};
    function sec(t,h){return h?'<div class="sa-sec"><h4>'+esc(t)+'</h4>'+h+'</div>':'';}
    var fichas=(d.fichas||[]).map(function(f){return '<div class="sa-lin">Ficha: <a href="'+FICHA+'?pessoa_id='+encodeURIComponent(f.id)+'">'+esc(f.codigo||'')+' · '+esc(f.nome||'')+'</a>'+(f.situacao_vital==='falecido'?' <span class="sa-selo">falecido na ficha</span>':'')+'</div>';}).join('');
    var outras=(d.outras||[]).map(function(o){return '<div class="sa-lin"><button type="button" class="sa-nome" data-pessoa="'+(+o.id)+'">'+esc(LISTA[o.lista]||o.lista)+'</button> · '+esc(o.orgao||'')+(o.cargo?' · '+esc(o.cargo):'')+'<span class="sa-sub">Na folha de '+esc(mesBR(o.primeiro_mes))+' a '+esc(mesBR(o.ultimo_mes))+(o.no_portal?' (ainda está)':'')+'</span></div>';}).join('');
    var evs=(d.eventos||[]).map(function(e){var x=e.detalhe||{};return '<div class="sa-lin">'+esc(mesBR(e.mes))+' · '+esc(EV_CURTO[e.tipo]||e.tipo)+(x.de&&x.para?': '+esc(x.de)+' → '+esc(x.para):'')+'</div>';}).join('');
    var rem=(d.remuneracao||[]).length?'<div class="sa-rolagem"><table class="sa-tab"><thead><tr><th>Mês</th><th>Bruto</th><th>Líquido</th></tr></thead><tbody>'+
      d.remuneracao.map(function(x){return '<tr><td class="n">'+esc(mesBR(x.mes))+'</td><td class="n">'+reais(x.bruto)+'</td><td class="n">'+reais(x.liquido)+'</td></tr>';}).join('')+
      '</tbody></table></div><p class="sa-sub">Só os meses em que o valor mudou (o valor vale até o próximo mês da lista).</p>':'';
    md.innerHTML='<div class="md-cab"><div><h2>'+esc(s.nome||'')+'</h2><p>'+esc(s.cpf_mascara||'sem CPF')+' · '+esc(ENTE[s.ente]||s.ente)+' · '+esc(LISTA[s.lista]||s.lista)+(s.vinculo?' · '+esc(s.vinculo):'')+'</p>'+
      '<p>'+esc(s.orgao||'')+(s.cargo?' · '+esc(s.cargo):'')+(s.funcao?' · função '+esc(s.funcao):'')+'</p>'+
      '<p>Na folha de '+esc(mesBR(s.primeiro_mes))+' a '+esc(mesBR(s.ultimo_mes))+(s.no_portal?' (ainda está)':' · saiu em '+esc(mesBR(s.saiu_mes)))+'</p></div>'+
      '<button class="md-x" type="button" data-fechar-sa aria-label="Fechar">✕</button></div>'+
      sec('Fichas do SAGA',fichas)+sec('A mesma pessoa em outra lista',outras)+sec('Acontecimentos',evs)+sec('Remuneração',rem);
  }

  /* ---------- abrir ---------- */
  async function abrir(){
    var pane=$('aba-servidores_al');if(!pane)return;estilos();
    if(S.montado&&S.painel)return;
    pane.innerHTML='<div class="sa-vazio">Carregando os servidores de Alagoas e de Maceió…</div>';
    var r=await sb().rpc('servpub_painel');
    if(r.error){pane.innerHTML='<div class="sa-aviso verm">Não deu para abrir: '+erro(r.error)+'</div>';return;}
    S.painel=r.data||{};S.montado=true;
    var q=new URLSearchParams(location.search),pt=q.get('servidores');if(pt&&/^(geral|pessoas|licenca|carga)$/.test(pt))S.parte=pt;
    desenhar();
  }
  async function liberar(){
    try{var p=global.sagaPerfil?await global.sagaPerfil():null;var ok=!!(p&&p.eh_administrador);var bt=$('abaServidoresAl');if(bt)bt.hidden=!ok;return ok;}catch(e){return false;}
  }
  global.SagaServidoresAl={abrir:abrir,liberar:liberar,_estado:S};
})(window);
