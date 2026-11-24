/* =====================================================================
   SAGA · Teses e oportunidades > Mapa dos servidores (blocos 400 a 403)
   Servidores federais, aposentados e pensionistas do Portal da Transparência (SIAPE),
   mês a mês: quem se aposentou, faleceu, ganhou pensão, saiu, entrou, teve abate-teto,
   PSS ou IR que parou. SÓ o administrador geral (o banco recusa os outros: siape_checar).
   Partes: Visão geral (gráfico por ano/mês, meses "em massa" à parte), Eventos (lista com
   filtros e a oportunidade de cada evento), Clientes do SAGA, Prováveis falecidos
   (conferência) e Carga e LGPD. Exporta CSV (Captação) e PDF (SagaPdf), com registro.
   CPF sempre mascarado (***.123.456-**): o Portal só mostra 6 dígitos.
   ===================================================================== */
(function(global){
  'use strict';
  var M={montado:false,painel:null,parte:'geral',pedido:0,
    g:{orgao:'',lista:'',cliente:'',uf:'',tipo:'aposentou',ano:null,dados:null},
    ev:null,cli:null,
    fal:{situacao:'sem',busca:'',pagina:1,dados:null,sel:{}}};
  var LIM=50,MAX_CSV=20000,MAX_PDF=1000;
  // 24/11 (Dr. Victor): paginação comum (saga_paginacao.js). A página continua em f.pagina; o tamanho fica na escolha da pessoa.
  var PAGS={};
  function pagDe(chave,aoMudar){if(!PAGS[chave])PAGS[chave]=SagaPaginacao.criar({tela:'mapa-'+chave,rotulo:chave==='fal'?'fichas':'eventos',aoMudar:aoMudar});return PAGS[chave];}
  function rolarTopo(){var a=$('aba-mapa');if(a&&a.scrollIntoView)a.scrollIntoView({behavior:parado()?'auto':'smooth',block:'start'});}
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  var EVT={aposentou:'Aposentou',faleceu:'Faleceu e deixou pensão',pensao_nova:'Pensão nova',perdeu_aposentadoria:'Saiu dos aposentados sem pensão',
    perdeu_pensao:'Pensão encerrada',entrou:'Entrou na lista',saiu:'Saiu da lista',voltou:'Voltou à lista',mudou_orgao:'Mudou de órgão',
    mudou_cargo:'Mudou de cargo',mudou_situacao:'Mudou de situação',abate_teto_comecou:'Abate-teto começou',abate_teto_parou:'Abate-teto parou',
    pss_parou:'PSS parou',pss_voltou:'PSS voltou',ir_parou:'IR parou',ir_voltou:'IR voltou'};
  var GRUPOS=[['De cada pessoa',['aposentou','faleceu','pensao_nova','perdeu_aposentadoria','perdeu_pensao']],
    ['Na folha (abate-teto, PSS, IR)',['abate_teto_comecou','abate_teto_parou','pss_parou','pss_voltou','ir_parou','ir_voltou']],
    ['Na lista (entradas, saídas, mudanças)',['entrou','saiu','voltou','mudou_orgao','mudou_cargo','mudou_situacao']]];
  var CLI_EVT=['faleceu','pensao_nova','aposentou','perdeu_aposentadoria','perdeu_pensao','abate_teto_comecou','pss_parou','ir_parou'];
  var LISTA={S:'Ativo',A:'Aposentado',P:'Pensionista'};
  var ALIAS={'inss':/seguro social|\binss\b/i,'policia federal':/pol[ií]cia federal/i,'policia rodoviaria federal':/rodovi[áa]ria/i,
    'ufal':/universidade federal de alagoas|\bufal\b/i,'receita federal':/receita|fazenda|economia/i,'ifal':/instituto federal de alagoas|\bifal\b/i};

  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erro(e){return esc(global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e)));}
  function cor(c){return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(c||''))?c:'var(--muted)';}
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function $(id){return document.getElementById(id);}
  function sb(){return global._sb;}
  function sem(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function mesTxt(m){m=String(m||'');return m.length===6?m.slice(4)+'/'+m.slice(0,4):m;}
  function dataBR(d){if(!d)return '';var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));return m?m[3]+'/'+m[2]+'/'+m[1]:String(d);}
  function dataHora(d){if(!d)return '';try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return d;}}
  function cpfMask(c){c=String(c||'').replace(/\D/g,'');return c.length===6?'***.'+c.slice(0,3)+'.'+c.slice(3)+'-**':'—';}
  /* mês "mm/aaaa" digitado com máscara -> AAAAMM */
  function mesMascara(v){var d=String(v||'').replace(/\D/g,'').slice(0,6);return d.length>2?d.slice(0,2)+'/'+d.slice(2):d;}
  function mesNum(v){var m=/^(\d{2})\/(\d{4})$/.exec(String(v||''));if(!m)return 0;var mm=+m[1];if(mm<1||mm>12)return 0;return +(m[2]+m[1]);}
  function mesDeNum(n){n=String(n||'');return n.length===6?n.slice(4)+'/'+n.slice(0,4):'';}
  function versao(){var s=document.querySelector('script[src*="saga_ui.js"]');var m=s&&/\?v=(\d+)/.exec(s.getAttribute('src'));return m?m[1]:'';}
  function carregar(arq,glob){return new Promise(function(ok,falha){if(global[glob])return ok();var s=document.createElement('script');s.src=arq+'?v='+versao();s.onload=function(){ok();};s.onerror=function(){falha(new Error('Não carregou '+arq));};document.head.appendChild(s);});}
  function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}

  var CSS=`
#aba-mapa .ms-aviso{border:1px solid var(--border-soft);border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--muted);margin-bottom:12px;background:var(--panel);line-height:1.5}
#aba-mapa .ms-aviso b{color:var(--text)}
#aba-mapa .ms-aviso.amar{border-left-color:#c98500}
#aba-mapa .ms-aviso.verm{border-left-color:var(--danger,#d6452d);color:var(--text)}
#aba-mapa .ms-partes{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
#aba-mapa .ms-corpo{transition:opacity .28s cubic-bezier(.22,.78,.25,1),transform .28s cubic-bezier(.22,.78,.25,1)}
#aba-mapa .ms-corpo.entrando{opacity:0;transform:translateY(6px)}
#aba-mapa .ms-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:14px}
#aba-mapa .ms-num{border:1px solid var(--border-soft);border-radius:12px;padding:9px 10px;background:var(--panel);color:var(--text);font:inherit;text-align:left;min-height:64px;display:flex;flex-direction:column;gap:2px}
#aba-mapa button.ms-num{cursor:pointer}
#aba-mapa button.ms-num:hover,#aba-mapa button.ms-num:focus-visible{border-color:var(--gold);outline:0}
#aba-mapa .ms-num b{font-size:19px;font-variant-numeric:lining-nums tabular-nums}
#aba-mapa .ms-num span{font-size:11px;color:var(--muted);line-height:1.25}
#aba-mapa .ms-num small{font-size:10.5px;color:#c98500}
#aba-mapa .ms-bloco{border:1px solid var(--border-soft);border-radius:14px;background:var(--panel);padding:12px 14px;margin-bottom:14px}
#aba-mapa .ms-bloco h3{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--text)}
#aba-mapa .ms-bloco p.sub{font-size:11.5px;color:var(--muted);margin:-4px 0 10px;line-height:1.45}
#aba-mapa .ms-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
#aba-mapa .ms-filtros input:not([type=checkbox]),#aba-mapa .ms-filtros select{min-width:130px}
#aba-mapa .ms-filtros .ms-busca{flex:1 1 200px}
#aba-mapa .ms-filtros input.ms-mes{width:120px;min-width:0}
#aba-mapa .ms-filtros label.ms-chk{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--muted);white-space:nowrap}
#aba-mapa .ms-graf{overflow-x:auto}
#aba-mapa .ms-graf svg{display:block;min-width:520px;width:100%;height:220px}
#aba-mapa .ms-graf svg text{fill:var(--muted);font-size:10px;font-family:inherit}
#aba-mapa .ms-graf svg .ms-col{cursor:pointer}
#aba-mapa .ms-graf svg .ms-col:hover rect,#aba-mapa .ms-graf svg .ms-col:focus rect{opacity:.85}
#aba-mapa .ms-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-top:6px}
#aba-mapa .ms-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
#aba-mapa .ms-rolagem{overflow-x:auto}
#aba-mapa .ms-tab{width:100%;border-collapse:collapse;font-size:12.5px}
#aba-mapa .ms-tab th{text-align:left;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:7px 8px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
#aba-mapa .ms-tab td{padding:7px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top}
#aba-mapa .ms-tab td.n{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
#aba-mapa .ms-tab a{color:var(--text);font-weight:600;text-decoration:none}#aba-mapa .ms-tab a:hover{text-decoration:underline}
#aba-mapa .ms-sub{display:block;font-size:10.5px;color:var(--muted);line-height:1.4}
#aba-mapa .ms-sub.amar{color:#c98500}
#aba-mapa .ms-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border-soft);border-radius:999px;padding:1px 8px;font-size:10.5px;white-space:nowrap;margin:0 3px 3px 0;background:transparent;color:var(--text);font-family:inherit;cursor:default}
#aba-mapa button.ms-chip{cursor:pointer}#aba-mapa button.ms-chip:hover{border-color:var(--gold)}
#aba-mapa .ms-chip i{width:8px;height:8px;border-radius:50%;background:var(--c,var(--muted));flex:0 0 auto}
#aba-mapa .ms-chip.cli{border-color:var(--gold);color:var(--gold)}
#aba-mapa .ms-chip.massa{border-color:#c98500;color:#c98500}
#aba-mapa .ms-chip.info{border-style:dashed}
#aba-mapa .ms-op{font-size:11.5px;color:var(--muted);line-height:1.45;max-width:340px}
#aba-mapa tr.ms-destaque td{background:color-mix(in srgb,var(--gold) 7%,transparent)}
#aba-mapa .ms-vazio{padding:24px;text-align:center;color:var(--muted);font-size:13px}
#aba-mapa .ms-pag{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12px;color:var(--muted);flex-wrap:wrap}
#aba-mapa .ms-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
#aba-mapa .ms-carregando{opacity:.55;transition:opacity .2s cubic-bezier(.22,.78,.25,1)}
#aba-mapa .ms-selbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid var(--border-soft);border-radius:12px;padding:8px 10px;margin-bottom:10px;background:var(--panel);font-size:12.5px}
#aba-mapa .ms-selbar input[type=text]{min-width:160px;flex:1 1 160px}
#aba-mapa .ms-alerta{border:1px solid var(--border-soft);border-left:3px solid #c98500;border-radius:12px;padding:10px 12px;background:var(--panel);margin-bottom:14px;font-size:12.5px;line-height:1.5}
#aba-mapa .ms-alerta .linha{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-top:1px solid var(--border-soft);padding-top:8px;margin-top:8px}
#aba-mapa input[type=checkbox]{width:16px;height:16px}
#aba-mapa ul.ms-lista{margin:4px 0 0 18px;padding:0;font-size:12px;color:var(--muted);line-height:1.5}
#moMapa .ms-mlin{display:flex;gap:6px;align-items:center;margin-bottom:6px}
#moMapa .ms-mlin input[type=text]{flex:1 1 auto;min-width:0}
#moMapa .ms-mlin input[type=color]{width:36px;height:32px;padding:2px;border-radius:8px}
#moMapa .ms-mlin.fora{opacity:.55}
#moMapa .ms-merro{color:var(--danger,#d6452d);font-size:12px}
#moMapa .ms-op-ev{border:1px solid var(--border-soft);border-radius:12px;padding:10px;margin-bottom:10px}
#moMapa .ms-op-ev h4{font-size:13px;margin:0 0 6px}
#moMapa .ms-op-ev textarea{width:100%;min-height:54px}
#moMapa .ms-op-prod{max-height:150px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 10px;margin-top:6px;font-size:12px}
#moMapa .ms-op-prod label{display:flex;gap:6px;align-items:flex-start}
@media(max-width:700px){#aba-mapa .ms-tab thead{display:none}#aba-mapa .ms-tab tr{display:block;border-bottom:1px solid var(--border-soft);padding:6px 0}#aba-mapa .ms-tab td{display:block;border:0;padding:3px 4px}#aba-mapa .ms-tab td[data-r]::before{content:attr(data-r) ": ";color:var(--muted);font-size:10.5px}#aba-mapa .ms-filtros input:not([type=checkbox]),#aba-mapa .ms-filtros select{flex:1 1 45%;min-width:0}#aba-mapa .ms-filtros input.ms-mes{flex:1 1 40%;width:auto}#aba-mapa input[type=checkbox]{width:22px;height:22px}#aba-mapa .ms-acoes{margin-left:0}}
@media(prefers-reduced-motion:reduce){#aba-mapa .ms-corpo,#aba-mapa .ms-carregando{transition:none}}
html.saga-movimento-reduzido #aba-mapa .ms-corpo{transition:none}
`;
  function estilos(){if($('sagaMapaCss'))return;var s=document.createElement('style');s.id='sagaMapaCss';s.textContent=CSS;document.head.appendChild(s);}
  function aviso(msg,tipo){var w=$('msMsg');if(!w)return;w.className='ms-aviso'+(tipo==='erro'?' verm':tipo==='amar'?' amar':'');w.innerHTML=msg;w.hidden=!msg;}

  /* ---------- oportunidade de um evento ---------- */
  function produtos(){return (M.painel&&M.painel.produtos)||[];}
  function produtoPorId(id){return produtos().find(function(p){return p.id===id;});}
  function orgaoBate(prod,orgao){
    var os=prod&&prod.orgaos;if(!Array.isArray(os)||!os.length)return true;
    var o=sem(orgao);
    return os.some(function(x){var k=sem(x),re=ALIAS[k];return re?re.test(orgao||''):(o.indexOf(k)>=0);});
  }
  function oportunidade(l){
    var op=((M.painel&&M.painel.oportunidades)||{})[l.evento];if(!op)return null;
    var ps=(op.produtos||[]).map(produtoPorId).filter(function(p){return p&&orgaoBate(p,l.orgao);});
    return {texto:op.texto||'',informativo:!!op.informativo,produtos:ps};
  }
  function htmlOportunidade(l){
    var o=oportunidade(l);if(!o)return '<span class="ms-sub">—</span>';
    return '<div class="ms-op">'+(o.informativo?'<b>Só informativo.</b> ':'')+esc(o.texto)+'</div>'+
      (o.produtos.length?'<div style="margin-top:4px">'+o.produtos.map(function(p){return '<button type="button" class="ms-chip'+(o.informativo?' info':'')+'" data-produto="'+esc(p.id)+'" style="--c:'+cor(p.cor)+'" title="Abrir na Prateleira"><i></i>'+esc(p.nome)+'</button>';}).join('')+'</div>':'');
  }
  function abrirProduto(id){
    if(typeof global.trocarAba==='function')global.trocarAba('prateleira');
    setTimeout(function(){if(typeof global.abrirPasta==='function')global.abrirPasta(id);},parado()?0:230);
  }
  function editarPublico(id){
    if(typeof global.trocarAba==='function')global.trocarAba('prateleira');
    setTimeout(function(){if(typeof global.formPublico==='function')global.formPublico(id);},parado()?0:230);
  }

  /* ---------- montagem ---------- */
  function htmlPartes(){
    var c=(M.painel&&M.painel.conferencia)||{};
    var bt=function(k,t){return '<button class="pill'+(M.parte===k?' active':'')+'" type="button" data-parte="'+k+'">'+t+'</button>';};
    return bt('geral','Visão geral')+bt('eventos','Eventos')+bt('clientes','Clientes do SAGA')+bt('falecidos','Prováveis falecidos'+(c.sem?' ('+num(c.sem)+' a conferir)':''))+bt('carga','Carga e LGPD');
  }
  function htmlPreparo(){
    var p=M.painel||{};
    if(p.preparado_erro)return '<div class="ms-aviso verm"><b>A última preparação das tabelas do Mapa falhou:</b> '+esc(p.preparado_erro)+'. A tela mostra o que foi preparado antes. O agendador tenta de novo às 3h50; se continuar, aparece em Configurações > Saúde do sistema.</div>';
    if(!p.preparado_em)return '<div class="ms-aviso amar"><b>As tabelas de trabalho do Mapa ainda não foram preparadas</b> (bloco 403). Sem elas, cada consulta conta os ~250 mil eventos na hora e pode passar do tempo da tela. Falta rodar o bloco 403 e depois <code>select public.siape_mapa_preparar();</code> no SQL Editor.</div>';
    return '';
  }
  function desenhar(){
    var pane=$('aba-mapa');if(!pane)return;var p=M.painel||{};
    pane.innerHTML='<div class="ms-aviso"><b>Finalidade (LGPD):</b> '+esc(p.finalidade||'')+'</div>'+htmlPreparo()+
      '<div class="ms-aviso" id="msMsg" hidden></div>'+
      '<div class="ms-partes" id="msPartes" role="group" aria-label="Partes do Mapa">'+htmlPartes()+'</div>'+
      '<div class="ms-corpo" id="msCorpo"></div>';
    $('msPartes').onclick=function(e){var b=e.target.closest('[data-parte]');if(b)trocarParte(b.dataset.parte);};
    pane.onclick=function(e){
      var pr=e.target.closest('[data-produto]');if(pr){e.preventDefault();abrirProduto(pr.dataset.produto);return;}
      var pu=e.target.closest('[data-publico]');if(pu){editarPublico(pu.dataset.publico);return;}
      var ir=e.target.closest('[data-ir-eventos]');if(ir){irParaEventos(JSON.parse(ir.dataset.irEventos));return;}
    };
    desenharParte();
  }
  function trocarParte(k){
    M.parte=k;var ps=$('msPartes');if(ps)ps.querySelectorAll('[data-parte]').forEach(function(b){b.classList.toggle('active',b.dataset.parte===k);});
    desenharParte();
  }
  function desenharParte(){
    var c=$('msCorpo');if(!c)return;
    if(!parado()){c.classList.add('entrando');requestAnimationFrame(function(){requestAnimationFrame(function(){c.classList.remove('entrando');});});}
    if(M.parte==='geral')parteGeral(c);
    else if(M.parte==='eventos')parteLista(c,M.ev);
    else if(M.parte==='clientes')parteClientes(c);
    else if(M.parte==='falecidos')parteFalecidos(c);
    else parteCarga(c);
  }

  /* ---------- Visão geral ---------- */
  function opcoesOrgao(atual){return '<option value="">Todos os órgãos</option>'+(((M.painel||{}).orgaos)||[]).map(function(o){return '<option value="'+esc(o.cod)+'"'+(o.cod===atual?' selected':'')+'>'+esc(o.nome)+' ('+num(o.n)+')</option>';}).join('');}
  function opcoesUf(atual){return '<option value="">Toda UF</option>'+(((M.painel||{}).ufs)||[]).map(function(u){return '<option value="'+esc(u)+'"'+(u===atual?' selected':'')+'>'+esc(u)+'</option>';}).join('');}
  function opcoesLista(atual){return '<option value="">Ativos, aposentados e pensionistas</option>'+['S','A','P'].map(function(k){return '<option value="'+k+'"'+(k===atual?' selected':'')+'>'+LISTA[k]+'s</option>';}).join('');}
  function opcoesCliente(atual){return '<option value="">Cliente do SAGA ou não</option><option value="sim"'+(atual==='sim'?' selected':'')+'>Só clientes do SAGA</option><option value="nao"'+(atual==='nao'?' selected':'')+'>Só quem não é cliente</option>';}
  function opcoesTipo(atual,todos){
    return (todos?'<option value="">Todos os eventos de cada pessoa</option>':'')+GRUPOS.map(function(g){return '<optgroup label="'+esc(g[0])+'">'+g[1].map(function(k){return '<option value="'+k+'"'+(k===atual?' selected':'')+'>'+esc(EVT[k])+'</option>';}).join('')+'</optgroup>';}).join('');
  }
  function parteGeral(c){
    var p=M.painel||{},pes=p.pessoas||{},cl=p.clientes||{},tp=p.tipos||{},conf=p.conferencia||{};
    function n(k){return (pes[k]&&pes[k].total)||0;}
    function np(k){return (pes[k]&&pes[k].no_portal)||0;}
    var nums='<div class="ms-nums">'+
      '<div class="ms-num"><b>'+num(n('S')+n('A')+n('P'))+'</b><span>pessoas no Mapa ('+num(np('S')+np('A')+np('P'))+' ainda no Portal)</span></div>'+
      '<div class="ms-num"><b>'+num(n('S'))+'</b><span>ativos</span></div><div class="ms-num"><b>'+num(n('A'))+'</b><span>aposentados</span></div><div class="ms-num"><b>'+num(n('P'))+'</b><span>pensionistas</span></div>'+
      '<button type="button" class="ms-num" data-parte-ir="clientes"><b>'+num(cl.servidor)+'</b><span>fichas do SAGA achadas no Portal</span></button>'+
      '<button type="button" class="ms-num" data-parte-ir="falecidos"><b>'+num(cl.instituidor)+'</b><span>clientes que deixaram pensão (prováveis falecidos)</span>'+(conf.sem?'<small>'+num(conf.sem)+' a conferir</small>':'')+'</button></div>';
    var tipos='<div class="ms-bloco"><h3>Eventos por tipo</h3><p class="sub">Clique para ver a lista. "Em massa" = meses em que a folha inteira mudou de uma vez (ex.: '+esc(exemploMassa())+'): ficam à parte, fora da lista de cada pessoa.</p><div class="ms-nums" style="margin-bottom:0">'+
      GRUPOS.map(function(g){return g[1].map(function(k){var t=tp[k]||{};if(!t.total)return '';
        return '<button type="button" class="ms-num" data-ir-eventos="'+esc(JSON.stringify({eventos:[k]}))+'"><b>'+num((t.total||0)-(t.massa||0))+'</b><span>'+esc(EVT[k])+'</span>'+(t.massa?'<small>+ '+num(t.massa)+' em meses em massa</small>':'')+'</button>';}).join('');}).join('')+'</div></div>';
    c.innerHTML=htmlAlertaTeses()+nums+
      '<div class="ms-bloco"><h3>Eventos por ano e mês</h3><p class="sub">Clique num ano para ver os meses; clique num mês para ver as pessoas.</p>'+
      '<div class="ms-filtros"><select id="msGTipo" aria-label="Evento">'+opcoesTipo(M.g.tipo,false)+'</select><select id="msGOrgao" aria-label="Órgão">'+opcoesOrgao(M.g.orgao)+'</select>'+
      '<select id="msGLista" aria-label="Lista">'+opcoesLista(M.g.lista)+'</select><select id="msGUf" aria-label="UF">'+opcoesUf(M.g.uf)+'</select><select id="msGCli" aria-label="Cliente">'+opcoesCliente(M.g.cliente)+'</select>'+
      (M.g.ano?'<b style="font-size:13px">'+esc(M.g.ano)+', mês a mês</b><button class="btn" type="button" id="msGVoltar">← Todos os anos</button>':'')+'</div>'+
      '<div class="ms-graf" id="msGraf"><div class="ms-vazio">Carregando…</div></div><div class="ms-leg"><span><i style="background:var(--gold)"></i>de cada pessoa</span><span><i style="background:#c98500;opacity:.55"></i>em massa (mudança da folha inteira)</span></div></div>'+
      htmlMassa()+tipos;
    ['msGTipo','msGOrgao','msGLista','msGUf','msGCli'].forEach(function(id){$(id).onchange=function(){var k={msGTipo:'tipo',msGOrgao:'orgao',msGLista:'lista',msGUf:'uf',msGCli:'cliente'}[id];M.g[k]=this.value;if(k!=='tipo')M.g.dados=null;desenharGraf();};});
    var v=$('msGVoltar');if(v)v.onclick=function(){M.g.ano=null;parteGeral(c);};
    c.querySelectorAll('[data-parte-ir]').forEach(function(b){b.onclick=function(){trocarParte(b.dataset.parteIr);};});
    var mt=$('msMassaTab');if(mt)mt.onclick=function(e){var b=e.target.closest('[data-massa]');if(!b)return;var d=b.dataset.massa.split('|');irParaEventos({eventos:[d[1]],mes:+d[0],incluir_massa:true});};
    desenharGraf();
  }
  function exemploMassa(){var m=((M.painel||{}).massa||[])[0];return m?mesTxt(m.mes)+', '+EVT[m.evento]+' '+num(m.n):'04/2026, PSS parou 8.299';}
  function htmlMassa(){
    var ms=(M.painel||{}).massa||[],r=(M.painel||{}).massa_regra||{};
    if(!ms.length)return '';
    return '<div class="ms-bloco"><h3>Meses em massa ('+num(ms.length)+')</h3><p class="sub">Mudança da folha inteira, não de cada pessoa: pelo menos '+num(r.min||500)+' eventos iguais no mês e '+num(r.vezes||10)+' vezes o normal daquele evento. Aposentou, faleceu e pensão nova nunca entram aqui.</p>'+
      '<div class="ms-rolagem" style="max-height:260px;overflow:auto"><table class="ms-tab" id="msMassaTab"><thead><tr><th>Mês</th><th>Evento</th><th>Quantos</th><th></th></tr></thead><tbody>'+
      ms.map(function(m){return '<tr><td class="n" data-r="Mês">'+esc(mesTxt(m.mes))+'</td><td data-r="Evento">'+esc(EVT[m.evento]||m.evento)+'</td><td class="n" data-r="Quantos">'+num(m.n)+'</td><td><button class="btn" type="button" data-massa="'+esc(m.mes+'|'+m.evento)+'">Ver as pessoas</button></td></tr>';}).join('')+
      '</tbody></table></div></div>';
  }
  function htmlAlertaTeses(){
    var al=(M.painel||{}).alerta_teses||[];if(!al.length)return '';
    return '<div class="ms-alerta"><b>Atenção ao público de duas teses de execução.</b> Depois do cruzamento com o Portal, a Base de dados passou a dar quase 4.900 "aptos" em cada uma. O público delas hoje pede só a situação e o ano de ingresso, então vale para qualquer servidor federal do Brasil. Falta dizer de qual título coletivo, órgão e UF é cada execução. Nada foi mudado: confira e ajuste em "Editar público", se for o caso.'+
      al.map(function(t){var pub=t.publico||{},partes=[];
        if(pub.situacoes)partes.push('situação: '+pub.situacoes.join(', '));if(pub.ingresso_ate)partes.push('ingresso até '+pub.ingresso_ate);if(pub.orgaos)partes.push('órgão: '+pub.orgaos.join(', '));if(pub.ufs)partes.push('UF: '+pub.ufs.join(', '));
        return '<div class="linha"><div><b>'+esc(t.nome)+'</b><span class="ms-sub">'+num(t.apto)+' aptos · '+num(t.confirmar)+' a confirmar · '+num(t.tem)+' já têm · público: '+esc(partes.join('; ')||'sem regra')+'</span></div><button class="btn" type="button" data-publico="'+esc(t.produto_id)+'">Editar público</button></div>';}).join('')+'</div>';
  }
  function filtrosGraf(){return {orgao:M.g.orgao,lista:M.g.lista,uf:M.g.uf,cliente:M.g.cliente,sem_temporarios:true};}
  async function desenharGraf(){
    var box=$('msGraf');if(!box)return;
    if(!M.g.dados){
      var meu=++M.pedido;box.classList.add('ms-carregando');
      var r=await sb().rpc('siape_mapa_meses',{p:filtrosGraf()});
      if(meu!==M.pedido)return;box.classList.remove('ms-carregando');
      if(r.error){box.innerHTML='<div class="ms-aviso verm">Não deu para montar o gráfico: '+erro(r.error)+'</div>';return;}
      M.g.dados=r.data||[];
    }
    var tipo=M.g.tipo,dados=M.g.dados.filter(function(d){return d.evento===tipo;}),barras=[];
    if(M.g.ano){
      for(var mm=1;mm<=12;mm++){var chave=+(M.g.ano+String(mm).padStart(2,'0'));var d=dados.filter(function(x){return x.mes===chave;});
        barras.push({rot:String(mm).padStart(2,'0'),chave:chave,ind:d.filter(function(x){return !x.massa;}).reduce(function(s,x){return s+x.n;},0),massa:d.filter(function(x){return x.massa;}).reduce(function(s,x){return s+x.n;},0)});}
    }else{
      var anos={};dados.forEach(function(x){var a=String(x.mes).slice(0,4);if(+a<2013)return;var o=anos[a]||(anos[a]={ind:0,massa:0});if(x.massa)o.massa+=x.n;else o.ind+=x.n;});
      Object.keys(anos).sort().forEach(function(a){barras.push({rot:a,chave:a,ind:anos[a].ind,massa:anos[a].massa});});
    }
    if(!barras.length||!barras.some(function(b){return b.ind||b.massa;})){box.innerHTML='<div class="ms-vazio">Nenhum evento "'+esc(EVT[tipo])+'" com esses filtros'+(M.g.ano?' em '+esc(M.g.ano):'')+'.</div>';return;}
    var W=Math.max(520,barras.length*44),H=220,top=18,base=H-26,max=Math.max.apply(null,barras.map(function(b){return b.ind+b.massa;}))||1,bw=Math.min(30,(W-20)/barras.length-8);
    var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(EVT[tipo])+' por '+(M.g.ano?'mês de '+esc(M.g.ano):'ano')+'">';
    barras.forEach(function(b,i){
      var x=10+i*((W-20)/barras.length)+((W-20)/barras.length-bw)/2,hi=(base-top)*b.ind/max,hm=(base-top)*b.massa/max;
      var titulo=(M.g.ano?b.rot+'/'+M.g.ano:b.rot)+': '+num(b.ind)+' de cada pessoa'+(b.massa?' + '+num(b.massa)+' em massa':'');
      svg+='<g class="ms-col" tabindex="0" role="button" data-col="'+esc(b.chave)+'" aria-label="'+esc(titulo)+'"><title>'+esc(titulo)+'</title>'+
        '<rect x="'+x+'" y="'+top+'" width="'+bw+'" height="'+(base-top)+'" fill="transparent"></rect>'+
        (hi?'<rect data-sg="coluna" x="'+x+'" y="'+(base-hi)+'" width="'+bw+'" height="'+hi+'" rx="3" style="fill:var(--gold)"></rect>':'')+
        (hm?'<rect data-sg-ignorar x="'+x+'" y="'+(base-hi-hm)+'" width="'+bw+'" height="'+hm+'" rx="3" style="fill:#c98500;opacity:.55"></rect>':'')+
        '<text x="'+(x+bw/2)+'" y="'+(base-hi-hm-4)+'" text-anchor="middle">'+num(b.ind+b.massa)+'</text>'+
        '<text x="'+(x+bw/2)+'" y="'+(H-10)+'" text-anchor="middle">'+esc(b.rot)+'</text></g>';
    });
    svg+='</svg>';box.innerHTML=svg;
    function clicar(g){var k=g.dataset.col;if(M.g.ano)irParaEventos({eventos:[tipo],mes:+k,incluir_massa:true,orgao:M.g.orgao,lista:M.g.lista,uf:M.g.uf,cliente:M.g.cliente});else{M.g.ano=k;parteGeral($('msCorpo'));}}
    box.querySelectorAll('[data-col]').forEach(function(g){g.onclick=function(){clicar(g);};g.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();clicar(g);}};});
  }

  /* ---------- lista de eventos (Eventos e Clientes do SAGA) ---------- */
  function estadoLista(chave,f){return {chave:chave,f:Object.assign({eventos:[],orgao:'',lista:'',uf:'',cargo:'',de:0,ate:0,mes:0,cliente:'',falecido:false,sem_temporarios:true,incluir_massa:false,busca:'',datas:SD()?SD().vazio():{},pagina:1},f||{}),dados:null,pedido:0};}
  function SD(){return global.SagaServidoresDatas||null;}
  function irParaEventos(f){M.ev=estadoLista('ev',f);trocarParte('eventos');}
  function paramsLista(L,extra){var f=L.f;var p={eventos:f.eventos,orgao:f.orgao,lista:f.lista,uf:f.uf,cargo:f.cargo,de:f.de||0,ate:f.ate||0,cliente:f.cliente,falecido:f.falecido,sem_temporarios:f.sem_temporarios,incluir_massa:f.incluir_massa,busca:f.busca,pagina:f.pagina,limite:LIM};if(f.mes)p.mes=f.mes;if(SD()&&SD().qtd(f.datas))Object.assign(p,SD().params(f.datas));return Object.assign(p,extra||{});}
  function parteLista(c,L,cabecalho){
    var f=L.f,pre=L.chave;
    c.innerHTML=(cabecalho||'')+'<div class="ms-filtros">'+
      '<input class="ms-busca" id="'+pre+'Busca" type="search" autocomplete="off" placeholder="Nome ou 6 dígitos do CPF" value="'+esc(f.busca)+'" aria-label="Buscar">'+
      '<select id="'+pre+'Tipo" aria-label="Evento">'+opcoesTipo(f.eventos.length===1?f.eventos[0]:'',true)+'</select>'+
      '<select id="'+pre+'Orgao" aria-label="Órgão">'+opcoesOrgao(f.orgao)+'</select>'+
      '<select id="'+pre+'Lista" aria-label="Lista">'+opcoesLista(f.lista)+'</select>'+
      '<select id="'+pre+'Uf" aria-label="UF">'+opcoesUf(f.uf)+'</select>'+
      '<input id="'+pre+'Cargo" type="search" autocomplete="off" placeholder="Cargo (pedaço)" value="'+esc(f.cargo)+'" aria-label="Cargo">'+
      (pre==='cli'?'':'<select id="'+pre+'Cli" aria-label="Cliente">'+opcoesCliente(f.cliente)+'</select>')+
      '<input class="ms-mes" id="'+pre+'De" inputmode="numeric" maxlength="7" placeholder="de mm/aaaa" value="'+esc(mesDeNum(f.de))+'" aria-label="De (mês/ano)">'+
      '<input class="ms-mes" id="'+pre+'Ate" inputmode="numeric" maxlength="7" placeholder="até mm/aaaa" value="'+esc(mesDeNum(f.ate))+'" aria-label="Até (mês/ano)">'+
      '<label class="ms-chk"><input type="checkbox" id="'+pre+'Fal"'+(f.falecido?' checked':'')+'> Só prováveis falecidos</label>'+
      '<label class="ms-chk"><input type="checkbox" id="'+pre+'Temp"'+(f.sem_temporarios?' checked':'')+'> Sem vínculos temporários</label>'+
      '<label class="ms-chk"><input type="checkbox" id="'+pre+'Massa"'+(f.incluir_massa?' checked':'')+'> Incluir meses em massa</label>'+
      '<button class="btn" type="button" id="'+pre+'Limpar">Limpar filtros</button>'+(SD()?SD().html(pre+'Dt',f.datas||(f.datas=SD().vazio())):'')+'</div>'+
      (f.mes?'<div class="ms-aviso">Mostrando só '+esc(mesTxt(f.mes))+'. <button class="btn" type="button" id="'+pre+'TirarMes">Tirar o mês</button></div>':'')+
      '<div class="ms-pag" style="justify-content:flex-start;margin:0 0 8px"><span id="'+pre+'Total"></span><span class="ms-acoes"><button class="btn" type="button" id="'+pre+'Csv">Exportar para a Captação (CSV)</button><button class="btn" type="button" id="'+pre+'Pdf">PDF</button>'+(pre==='ev'?'<button class="btn" type="button" id="'+pre+'Op">Oportunidades por evento</button>':'')+'</span></div>'+
      '<div id="'+pre+'Lista2"><div class="ms-vazio">Carregando…</div></div>';
    var tm=null;function mudou(){f.pagina=1;clearTimeout(tm);tm=setTimeout(function(){carregarLista(L);},350);}
    $(pre+'Busca').oninput=function(){f.busca=this.value.trim();mudou();};
    $(pre+'Cargo').oninput=function(){f.cargo=this.value.trim();mudou();};
    $(pre+'Tipo').onchange=function(){f.eventos=this.value?[this.value]:(pre==='cli'?CLI_EVT.slice():[]);mudou();};
    $(pre+'Orgao').onchange=function(){f.orgao=this.value;mudou();};
    $(pre+'Lista').onchange=function(){f.lista=this.value;mudou();};
    $(pre+'Uf').onchange=function(){f.uf=this.value;mudou();};
    if($(pre+'Cli'))$(pre+'Cli').onchange=function(){f.cliente=this.value;mudou();};
    ['De','Ate'].forEach(function(k){$(pre+k).oninput=function(){var v=mesMascara(this.value);if(v!==this.value)this.value=v;var n=mesNum(v);this.style.borderColor=(v.length===7&&!n)?'var(--danger,#d6452d)':'';if(v===''||n){f[k==='De'?'de':'ate']=n;mudou();}};});
    $(pre+'Fal').onchange=function(){f.falecido=this.checked;mudou();};
    $(pre+'Temp').onchange=function(){f.sem_temporarios=this.checked;mudou();};
    $(pre+'Massa').onchange=function(){f.incluir_massa=this.checked;mudou();};
    if(SD())SD().ligar(pre+'Dt',f.datas,mudou);
    $(pre+'Limpar').onclick=function(){var n=pre==='cli'?estadoCli():estadoLista('ev');if(pre==='cli')M.cli=n;else M.ev=n;desenharParte();};
    var tmz=$(pre+'TirarMes');if(tmz)tmz.onclick=function(){f.mes=0;desenharParte();};
    $(pre+'Csv').onclick=function(){exportarCsv(L,this);};
    $(pre+'Pdf').onclick=function(){exportarPdf(L,this);};
    var op=$(pre+'Op');if(op)op.onclick=organizarOportunidades;
    carregarLista(L);
  }
  async function carregarLista(L){
    var pre=L.chave,box=$(pre+'Lista2');if(!box)return;var meu=++L.pedido;box.classList.add('ms-carregando');
    var P=pagDe(pre,function(P){L.f.pagina=P.pagina;carregarLista(L);rolarTopo();});P.pagina=L.f.pagina||1;
    var extra={};
    var r=await SagaPaginacao.buscarEmPartes(function(off,lim){return sb().rpc('siape_mapa_eventos',{p:paramsLista(L,{pagina:Math.floor(off/lim)+1,limite:lim})}).then(function(x){if(x.error)return x;extra=x.data||{};return {linhas:extra.linhas,total:extra.total};});},
      {offset:P.offset(),quantos:P.quantos(),lote:500,progresso:function(a,t){if(meu===L.pedido&&t>500)box.innerHTML='<div class="sg-pag-carregando">Carregando '+num(a)+' de '+num(t)+'…</div>';}});
    if(meu!==L.pedido)return;box.classList.remove('ms-carregando');
    if(r.error){box.innerHTML='<div class="ms-aviso verm">Não deu para buscar os eventos: '+erro(r.error)+'</div>';$(pre+'Total').textContent='';return;}
    L.dados=Object.assign({},extra,{total:r.total,linhas:r.linhas});P.total(r.total);L.f.pagina=P.pagina;desenharLinhas(L);
    var temDatas=SD()&&SD().qtd(L.f.datas);
    if(temDatas&&!('datas_preparadas' in L.dados))box.insertAdjacentHTML('afterbegin','<div class="ms-aviso amar"><b>A lista abaixo NÃO está filtrada pelas datas:</b> o filtro por datas e tempo de serviço chega com o bloco 424.</div>');
    else if(temDatas&&L.dados.datas_preparadas===false)box.insertAdjacentHTML('afterbegin','<div class="ms-aviso amar">As datas entram na tabela do Mapa na próxima preparação da noite (3h50). Até lá o filtro por datas não acha ninguém.</div>');
  }
  function htmlPessoa(l){
    return '<b>'+esc(l.nome)+'</b><span class="ms-sub">'+esc(cpfMask(l.cpf6))+' · '+esc(LISTA[l.lista]||l.lista)+(l.no_portal?'':' · fora do Portal')+(l.temporario?' · temporário':'')+'</span>'+
      '<span class="ms-sub">'+esc(l.orgao||'')+(l.uf?' · '+esc(l.uf):'')+'</span>'+(l.cargo?'<span class="ms-sub">'+esc(l.cargo)+'</span>':'')+
      (SD()&&SD().curto({ingresso:l.ingresso,tempo_servico:l.tempo_servico,tempo_estimativa:l.lista==='S'&&l.no_portal})?'<span class="ms-sub">'+esc(SD().curto({ingresso:l.ingresso,tempo_servico:l.tempo_servico,tempo_estimativa:l.lista==='S'&&l.no_portal}))+'</span>':'');
  }
  function htmlDetalhe(l){
    var d=l.detalhe||{},p=[];
    if(l.evento==='aposentou'&&d.data)p.push('aposentadoria em '+dataBR(d.data));
    if(l.evento==='pensao_nova'){if(d.inicio)p.push('início '+dataBR(d.inicio));if(d.instituidor||l.instituidor_nome)p.push('servidor: '+(d.instituidor||l.instituidor_nome));if(d.tipo)p.push(d.tipo);}
    if(d.desde)p.push('desde '+mesTxt(d.desde));
    if(d.saiu_mes)p.push('saiu da lista em '+mesTxt(d.saiu_mes));
    if(l.de||l.para)p.push((l.de||'')+(l.de&&l.para?' → ':'')+(l.para||''));
    return p.length?'<span class="ms-sub">'+esc(p.join(' · '))+'</span>':'';
  }
  function htmlClientes(l){
    var cs=l.clientes||[];if(!cs.length)return '<span class="ms-sub">Não é cliente</span>';
    return cs.map(function(k){return '<a href="'+FICHA+'?pessoa_id='+encodeURIComponent(k.pessoa_id)+'">'+esc(k.nome||'Ficha')+'</a><span class="ms-sub">'+esc(k.codigo||'')+(k.papel==='instituidor'?' · deixou esta pensão (provável falecido)':'')+(k.vital==='falecido'?' · ficha: falecido':'')+'</span>';}).join('');
  }
  function desenharLinhas(L){
    var pre=L.chave,box=$(pre+'Lista2'),d=L.dados||{},ls=d.linhas||[];
    var tot=$(pre+'Total');if(tot)tot.innerHTML=num(d.total)+' eventos'+(d.escondidos_massa?' · <span style="color:#c98500">'+num(d.escondidos_massa)+' de meses em massa fora da lista</span>':'');
    if(!ls.length){box.innerHTML='<div class="ms-vazio">Nenhum evento com esses filtros.</div>';return;}
    box.innerHTML='<div class="ms-rolagem"><table class="ms-tab"><thead><tr><th>Mês</th><th>Evento</th><th>Pessoa no Portal</th><th>No SAGA</th><th>Oportunidade</th></tr></thead><tbody>'+
      ls.map(function(l){var cli=(l.clientes||[]).length;
        return '<tr'+(cli?' class="ms-destaque"':'')+'><td class="n" data-r="Mês">'+esc(mesTxt(l.mes))+'</td>'+
          '<td data-r="Evento"><b>'+esc(EVT[l.evento]||l.evento)+'</b>'+(l.massa?' <span class="ms-chip massa">mês em massa</span>':'')+htmlDetalhe(l)+'</td>'+
          '<td data-r="Pessoa">'+htmlPessoa(l)+'</td><td data-r="No SAGA">'+htmlClientes(l)+'</td><td data-r="Oportunidade">'+htmlOportunidade(l)+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      PAGS[pre].html();
    PAGS[pre].ligar(box);
  }
  function descricao(L){
    var f=L.f,p=[];
    if(f.eventos.length)p.push(f.eventos.map(function(k){return EVT[k];}).join(', '));
    if(f.mes)p.push('mês '+mesTxt(f.mes));
    if(f.orgao){var o=(((M.painel||{}).orgaos)||[]).find(function(x){return x.cod===f.orgao;});p.push('órgão: '+(o?o.nome:f.orgao));}
    if(f.lista)p.push(LISTA[f.lista]+'s');if(f.uf)p.push('UF '+f.uf);if(f.cargo)p.push('cargo: '+f.cargo);
    if(f.cliente)p.push(f.cliente==='sim'?'clientes do SAGA':'não clientes');if(f.falecido)p.push('prováveis falecidos');
    if(f.de)p.push('de '+mesTxt(f.de));if(f.ate)p.push('até '+mesTxt(f.ate));if(f.busca)p.push('busca: '+f.busca);
    if(f.incluir_massa)p.push('com meses em massa');if(!f.sem_temporarios)p.push('com temporários');
    if(SD())p=p.concat(SD().descricao(f.datas));
    return p.join(' · ')||'Sem filtro';
  }
  async function exportarCsv(L,b){
    var txt=b.textContent;b.disabled=true;b.textContent='Exportando…';
    try{
      var r=await sb().rpc('siape_mapa_eventos',{p:paramsLista(L,{pagina:1,limite:MAX_CSV})});
      if(r.error)throw r.error;var d=r.data||{},ls=d.linhas||[];
      if(!ls.length){aviso('Nada para exportar com esses filtros.','amar');return;}
      function c(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
      var linhas=[['Nome no Portal','CPF (mascarado)','Situação','Órgão','UF','Cargo','Evento','Mês','Detalhe','Oportunidade','Teses','Cliente do SAGA','Código','Ingresso no serviço público','Ingresso no órgão','Aposentadoria','Pensão desde','Anos de serviço público (estimativa para ativos)'].map(c).join(';')];
      ls.forEach(function(l){var o=oportunidade(l)||{produtos:[]},cs=l.clientes||[],dt=document.createElement('div');dt.innerHTML=htmlDetalhe(l);
        linhas.push([l.nome,cpfMask(l.cpf6),LISTA[l.lista]||l.lista,l.orgao||'',l.uf||'',l.cargo||'',EVT[l.evento]||l.evento,mesTxt(l.mes),dt.textContent,(o.informativo?'Só informativo. ':'')+(o.texto||''),o.produtos.map(function(p){return p.nome;}).join(' | '),
          cs.map(function(k){return (k.nome||'')+(k.papel==='instituidor'?' (deixou a pensão)':'');}).join(' | '),cs.map(function(k){return k.codigo||'';}).join(' | '),dataBR(l.ingresso),dataBR(l.ingresso_orgao),dataBR(l.aposentadoria),dataBR(l.pensao_inicio),l.tempo_servico==null?'':Math.floor(+l.tempo_servico)].map(c).join(';'));});
      var blob=new Blob(['﻿'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mapa-servidores.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
      if(d.total>ls.length)aviso('Saíram as '+num(ls.length)+' primeiras de '+num(d.total)+' linhas (limite do arquivo). Filtre mais para pegar o resto.','amar');
      var x=await sb().rpc('siape_registrar',{p_resumo:'Mapa dos servidores: exportou CSV ('+ls.length+' linhas; '+descricao(L)+')',p_acao:'consultou',p_depois:{filtros:paramsLista(L,{pagina:1,limite:MAX_CSV}),linhas:ls.length}});
      if(x.error)aviso('O arquivo saiu, mas o registro da exportação falhou: '+erro(x.error),'erro');
    }catch(e){aviso('Não deu para exportar: '+erro(e),'erro');}
    finally{b.disabled=false;b.textContent=txt;}
  }
  async function exportarPdf(L,b){
    b.disabled=true;
    try{
      await carregar('saga_pdf.js','SagaPdf');
      var r=await sb().rpc('siape_mapa_eventos',{p:paramsLista(L,{pagina:1,limite:MAX_PDF})});
      if(r.error)throw r.error;var d=r.data||{},ls=d.linhas||[];
      if(!ls.length){aviso('Nada para pôr no PDF com esses filtros.','amar');return;}
      var h='<div class="kpis"><div class="forte"><span>Eventos</span><b>'+num(d.total)+'</b></div>'+(d.total>ls.length?'<div><span>No documento</span><b>'+num(ls.length)+' primeiros</b></div>':'')+'<div><span>Clientes do SAGA</span><b>'+num(ls.filter(function(l){return (l.clientes||[]).length;}).length)+'</b></div></div>'+
        '<div class="obs">'+esc(descricao(L))+'. CPF mascarado pelo próprio Portal da Transparência. Finalidade: '+esc((M.painel||{}).finalidade||'')+'</div>'+
        '<table class="tab"><thead><tr><th>Mês</th><th>Evento</th><th>Nome</th><th>CPF</th><th>Situação · órgão · cargo</th><th>No SAGA</th><th>Oportunidade</th></tr></thead><tbody>'+
        ls.map(function(l){var o=oportunidade(l)||{produtos:[]};return '<tr><td class="num">'+esc(mesTxt(l.mes))+'</td><td>'+esc(EVT[l.evento]||l.evento)+'</td><td>'+esc(l.nome)+'</td><td class="num">'+esc(cpfMask(l.cpf6))+'</td><td>'+esc((LISTA[l.lista]||'')+' · '+(l.orgao||'')+(l.cargo?' · '+l.cargo:''))+'</td><td>'+esc((l.clientes||[]).map(function(k){return k.codigo||k.nome;}).join(', '))+'</td><td>'+esc(o.produtos.map(function(p){return p.nome;}).join(', ')||(o.texto||''))+'</td></tr>';}).join('')+'</tbody></table>';
      SagaPdf.imprimir({titulo:'Mapa dos servidores',subtitulo:'Portal da Transparência (SIAPE) · '+num(d.total)+' eventos',arquivo:'mapa-servidores',paisagem:true,paginas:[h]});
      sb().rpc('siape_registrar',{p_resumo:'Mapa dos servidores: gerou PDF ('+ls.length+' linhas; '+descricao(L)+')',p_acao:'consultou'}).then(function(x){if(x.error)aviso('O PDF saiu, mas o registro falhou: '+erro(x.error),'erro');});
    }catch(e){aviso('Não deu para montar o PDF: '+erro(e),'erro');}
    finally{b.disabled=false;}
  }

  /* ---------- Clientes do SAGA ---------- */
  function estadoCli(){var d=new Date();d.setMonth(d.getMonth()-24);return estadoLista('cli',{cliente:'sim',eventos:CLI_EVT.slice(),de:+(d.getFullYear()+String(d.getMonth()+1).padStart(2,'0'))});}
  async function parteClientes(c){
    if(!M.cli)M.cli=estadoCli();
    var cab='<div class="ms-bloco"><h3>Clientes do SAGA com evento no Portal</h3><p class="sub">Fichas do SAGA achadas no Portal com certeza (nome completo + 6 dígitos do CPF) que tiveram um evento. Faleceu e deixou pensão = habilitação dos herdeiros; aposentou = abono de permanência, Tema 1.233, férias e licença-prêmio; PSS ou IR que parou = conferir (IR só informativo). Sem os meses em massa.</p><div class="ms-nums" id="cliNums" style="margin-bottom:0"><div class="ms-vazio">Carregando…</div></div></div>';
    parteLista(c,M.cli,cab);
    var r=await sb().rpc('siape_mapa_clientes_resumo',{p_meses:12});var box=$('cliNums');if(!box)return;
    if(r.error){box.innerHTML='<div class="ms-aviso verm">Não deu para contar: '+erro(r.error)+'</div>';return;}
    var pe=(r.data&&r.data.por_evento)||{},de=r.data&&r.data.de;
    box.innerHTML=CLI_EVT.map(function(k){return '<button type="button" class="ms-num" data-cli-ev="'+k+'"><b>'+num(pe[k])+'</b><span>'+esc(EVT[k])+'</span><small style="color:var(--muted)">clientes desde '+esc(mesTxt(de))+'</small></button>';}).join('');
    box.onclick=function(e){var b=e.target.closest('[data-cli-ev]');if(!b)return;M.cli.f.eventos=[b.dataset.cliEv];M.cli.f.de=de;M.cli.f.pagina=1;parteClientes($('msCorpo'));};
  }

  /* ---------- Prováveis falecidos ---------- */
  function opcoesConf(){return ((M.painel&&M.painel.conferencia&&M.painel.conferencia.opcoes)||[]);}
  function confPorId(id){return opcoesConf().find(function(o){return o.id===id;});}
  function parteFalecidos(c){
    var F=M.fal,cf=(M.painel&&M.painel.conferencia)||{};
    function chip(k,t,n){return '<button type="button" class="pill'+(F.situacao===k?' active':'')+'" data-fsit="'+esc(k)+'">'+esc(t)+' ('+num(n)+')</button>';}
    c.innerHTML='<div class="ms-bloco"><h3>Prováveis falecidos</h3><p class="sub">Fichas do SAGA cujo nome e 6 dígitos do CPF aparecem como <b>servidor que deixou pensão</b> no Portal. Pode ser homônimo com CPF parecido: confira antes de qualquer contato. "Falecimento confirmado" pode marcar a ficha como falecida (só com a caixinha marcada).</p>'+
      '<div class="ms-partes" id="falSit">'+chip('sem','Ainda não conferidos',cf.sem)+chip('','Todos',(M.painel&&M.painel.clientes&&M.painel.clientes.instituidor)||0)+opcoesConf().filter(function(o){return o.ativo||o.qtd;}).map(function(o){return chip(o.id,o.nome,o.qtd);}).join('')+'</div>'+
      '<div class="ms-filtros"><input class="ms-busca" id="falBusca" type="search" autocomplete="off" placeholder="Nome ou código VMM" value="'+esc(F.busca)+'" aria-label="Buscar"><button class="btn" type="button" id="falOrg">Organizar situações</button><button class="btn" type="button" id="falCsv">Exportar (CSV)</button></div>'+
      '<div class="ms-selbar" id="falSel"></div><div id="falLista"><div class="ms-vazio">Carregando…</div></div></div>';
    $('falSit').onclick=function(e){var b=e.target.closest('[data-fsit]');if(!b)return;F.situacao=b.dataset.fsit;F.pagina=1;F.sel={};parteFalecidos(c);};
    var tm=null;$('falBusca').oninput=function(){F.busca=this.value.trim();F.pagina=1;clearTimeout(tm);tm=setTimeout(carregarFal,350);};
    $('falOrg').onclick=organizarSituacoes;$('falCsv').onclick=function(){exportarFal(this);};
    desenharSelFal();carregarFal();
  }
  async function carregarFal(){
    var F=M.fal,box=$('falLista');if(!box)return;var meu=++M.pedido;box.classList.add('ms-carregando');
    var P=pagDe('fal',function(P){M.fal.pagina=P.pagina;carregarFal();rolarTopo();});P.pagina=F.pagina||1;
    var r=await SagaPaginacao.buscarEmPartes(function(off,lim){return sb().rpc('siape_falecidos_listar',{p:{situacao:F.situacao,busca:F.busca,pagina:Math.floor(off/lim)+1,limite:lim}}).then(function(x){return x.error?x:{linhas:(x.data||{}).linhas,total:(x.data||{}).total};});},
      {offset:P.offset(),quantos:P.quantos(),lote:500});
    if(meu!==M.pedido)return;box.classList.remove('ms-carregando');
    if(r.error){box.innerHTML='<div class="ms-aviso verm">Não deu para buscar os prováveis falecidos: '+erro(r.error)+'</div>';return;}
    F.dados={total:r.total,linhas:r.linhas};P.total(r.total);F.pagina=P.pagina;desenharFal();
  }
  function desenharFal(){
    var F=M.fal,box=$('falLista'),d=F.dados||{},ls=d.linhas||[];if(!box)return;
    if(!ls.length){box.innerHTML='<div class="ms-vazio">Nenhuma ficha nesta situação.</div>';desenharSelFal();return;}
    var todos=ls.every(function(l){return F.sel[l.pessoa_id];});
    box.innerHTML='<div class="ms-rolagem"><table class="ms-tab"><thead><tr><th><input type="checkbox" id="falTodos" aria-label="Escolher todos desta página"'+(todos?' checked':'')+'></th><th>Ficha no SAGA</th><th>Pensão no Portal</th><th>Conferência</th></tr></thead><tbody>'+
      ls.map(function(l){var o=confPorId(l.situacao_id);
        return '<tr><td><input type="checkbox" data-fsel="'+esc(l.pessoa_id)+'" aria-label="Escolher '+esc(l.nome)+'"'+(F.sel[l.pessoa_id]?' checked':'')+'></td>'+
          '<td data-r="Ficha"><a href="'+FICHA+'?pessoa_id='+encodeURIComponent(l.pessoa_id)+'">'+esc(l.nome)+'</a><span class="ms-sub">'+esc(l.codigo||'')+' · '+num(l.processos)+' processo(s)'+(l.situacao_vital==='falecido'?' · ficha: falecido':'')+(l.data_falecimento?' em '+esc(dataBR(l.data_falecimento)):'')+'</span></td>'+
          '<td data-r="Pensão">'+(l.pensoes||[]).map(function(p){return '<span class="ms-sub"><b style="color:var(--text)">'+esc(p.pensionista)+'</b> · '+esc(cpfMask(p.cpf6))+' · '+esc(p.orgao||'')+(p.inicio?' · desde '+esc(dataBR(p.inicio)):'')+(p.tipo?' · '+esc(p.tipo):'')+(p.no_portal?'':' · <span class="amar">pensão já fora do Portal</span>')+'</span>';}).join('')+'</td>'+
          '<td data-r="Conferência">'+(o?'<span class="ms-chip" style="--c:'+cor(o.cor)+'"><i></i>'+esc(o.nome)+'</span>':'<span class="ms-sub amar">não conferido</span>')+(l.obs?'<span class="ms-sub">'+esc(l.obs)+'</span>':'')+(l.conferido_em?'<span class="ms-sub">'+esc(l.conferido_por||'')+' · '+esc(dataHora(l.conferido_em))+'</span>':'')+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      PAGS.fal.html();PAGS.fal.ligar(box);
    box.querySelectorAll('[data-fsel]').forEach(function(ch){ch.onchange=function(){if(ch.checked)F.sel[ch.dataset.fsel]=1;else delete F.sel[ch.dataset.fsel];desenharSelFal();};});
    $('falTodos').onchange=function(){var ch=this.checked;ls.forEach(function(l){if(ch)F.sel[l.pessoa_id]=1;else delete F.sel[l.pessoa_id];});desenharFal();};
    desenharSelFal();
  }
  function desenharSelFal(){
    var bar=$('falSel');if(!bar)return;var F=M.fal,n=Object.keys(F.sel).length;
    bar.innerHTML=n?'<b>'+num(n)+' escolhidas</b><select id="falAplicarSit" aria-label="Situação"><option value="">Escolha a situação…</option>'+opcoesConf().filter(function(o){return o.ativo;}).map(function(o){return '<option value="'+esc(o.id)+'" data-acao="'+esc(o.acao||'')+'">'+esc(o.nome)+'</option>';}).join('')+'</select>'+
      '<input type="text" id="falObs" maxlength="300" placeholder="Observação (opcional)" aria-label="Observação"><label class="ms-chk" id="falMarcarL" hidden><input type="checkbox" id="falMarcar"> marcar a ficha como falecida</label>'+
      '<button class="btn btn-ouro" type="button" id="falAplicar">Aplicar</button><button class="btn" type="button" id="falLimparSel">Limpar escolha</button>'
      :'<span class="ms-sub" style="display:inline">Escolha fichas na lista para marcar a conferência.</span>';
    if(!n)return;
    $('falAplicarSit').onchange=function(){var o=this.selectedOptions[0];$('falMarcarL').hidden=!(o&&o.dataset.acao==='falecido');};
    $('falLimparSel').onclick=function(){F.sel={};desenharFal();};
    $('falAplicar').onclick=async function(){
      var sit=$('falAplicarSit').value,b=this;if(!sit){aviso('Escolha a situação antes de aplicar.','amar');return;}
      b.disabled=true;b.textContent='Aplicando…';
      var r=await sb().rpc('siape_conferir',{p_pessoas:Object.keys(F.sel),p_situacao:sit,p_obs:$('falObs').value||null,p_marcar_ficha:!!($('falMarcar')&&$('falMarcar').checked&&!$('falMarcarL').hidden)});
      if(r.error){aviso('Não deu para marcar a conferência: '+erro(r.error),'erro');b.disabled=false;b.textContent='Aplicar';return;}
      var d=r.data||{},o=confPorId(sit);aviso(num(d.conferidas)+' ficha(s) marcadas como <b>'+esc(o?o.nome:'')+'</b>'+(d.fichas_falecido?'; '+num(d.fichas_falecido)+' ficha(s) agora com "falecido"':'')+'.');
      F.sel={};await recarregarPainel();if(M.parte==='falecidos')parteFalecidos($('msCorpo'));
    };
  }
  async function exportarFal(b){
    b.disabled=true;
    try{
      var F=M.fal,r=await sb().rpc('siape_falecidos_listar',{p:{situacao:F.situacao,busca:F.busca,pagina:1,limite:5000}});
      if(r.error)throw r.error;var ls=(r.data&&r.data.linhas)||[];if(!ls.length){aviso('Nada para exportar.','amar');return;}
      function c(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
      var out=[['Ficha','Código','Processos','Pensionista no Portal','CPF do pensionista (mascarado)','Órgão','Pensão desde','Conferência','Observação'].map(c).join(';')];
      ls.forEach(function(l){var o=confPorId(l.situacao_id);(l.pensoes||[{}]).forEach(function(p){out.push([l.nome,l.codigo||'',l.processos,p.pensionista||'',cpfMask(p.cpf6),p.orgao||'',dataBR(p.inicio),o?o.nome:'não conferido',l.obs||''].map(c).join(';'));});});
      var blob=new Blob(['﻿'+out.join('\r\n')],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mapa-provaveis-falecidos.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
      var x=await sb().rpc('siape_registrar',{p_resumo:'Mapa dos servidores: exportou CSV dos prováveis falecidos ('+ls.length+' fichas)',p_acao:'consultou'});
      if(x.error)aviso('O arquivo saiu, mas o registro falhou: '+erro(x.error),'erro');
    }catch(e){aviso('Não deu para exportar: '+erro(e),'erro');}
    finally{b.disabled=false;}
  }

  /* ---------- janelas: situações da conferência e oportunidades ---------- */
  function janela(largo){
    var mo=$('moMapa');
    if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='moMapa';mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-label','Mapa dos servidores');
      mo.innerHTML='<div class="md" id="mdMapa"></div>';document.body.appendChild(mo);
      mo.addEventListener('click',function(e){if(e.target===mo||e.target.closest('[data-fechar-mapa]'))fecharJanela();});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&mo.classList.contains('aberto'))fecharJanela();});}
    $('mdMapa').className='md'+(largo?' largo':' estreito');
    return mo;
  }
  function fecharJanela(){var mo=$('moMapa');if(mo)mo.classList.remove('aberto');}
  function organizarSituacoes(){
    var mo=janela(false),os=opcoesConf().slice();
    $('mdMapa').innerHTML='<div class="md-cab"><div><h2>Situações da conferência</h2><p>Renomear, cor, ordem e tirar da lista (as fichas já marcadas guardam a situação). "A conferir" e "Falecimento confirmado" são do sistema: podem ser renomeadas, mas não saem.</p></div><button class="md-x" type="button" data-fechar-mapa aria-label="Fechar">✕</button></div>'+
      '<div class="md-corpo"><div id="msmLinhas">'+os.map(function(o,i){
        return '<div class="ms-mlin'+(o.ativo?'':' fora')+'" data-id="'+esc(o.id)+'"><input type="color" value="'+esc(/^#[0-9a-f]{6}$/i.test(o.cor)?o.cor:'#8a94a6')+'" aria-label="Cor"><input type="text" maxlength="60" value="'+esc(o.nome)+'" aria-label="Nome">'+
          '<button class="btn" type="button" data-sobe'+(i===0?' disabled':'')+' aria-label="Subir">▲</button><button class="btn" type="button" data-desce'+(i===os.length-1?' disabled':'')+' aria-label="Descer">▼</button>'+
          '<button class="btn" type="button" data-salvar>Salvar</button>'+(o.acao?'':'<button class="btn" type="button" data-ativo="'+(o.ativo?'0':'1')+'">'+(o.ativo?'Tirar da lista':'Voltar')+'</button>')+'</div>';
      }).join('')+'</div><div class="ms-mlin"><input type="color" id="msmNovaCor" value="#8a94a6" aria-label="Cor da nova situação"><input type="text" id="msmNova" maxlength="60" placeholder="Nova situação" aria-label="Nova situação"><button class="btn btn-ouro" type="button" id="msmCriar">+ Criar</button></div><div class="ms-merro" id="msmErro"></div></div>';
    mo.classList.add('aberto');
    function falhou(e){$('msmErro').textContent='Não deu para salvar: '+(global.sagaErroBanco?global.sagaErroBanco(e):(e.message||e));}
    async function depois(){await recarregarPainel();organizarSituacoes();if(M.parte==='falecidos')parteFalecidos($('msCorpo'));}
    $('msmCriar').onclick=async function(){var n=$('msmNova').value.trim();if(!n){$('msmErro').textContent='Escreva o nome da nova situação.';return;}
      var r=await sb().rpc('siape_conf_opcao_salvar',{p_id:null,p_nome:n,p_cor:$('msmNovaCor').value,p_ativo:true});if(r.error)return falhou(r.error);depois();};
    $('msmLinhas').onclick=async function(e){var lin=e.target.closest('[data-id]');if(!lin)return;var id=lin.dataset.id,o=os.find(function(x){return x.id===id;});
      var nome=lin.querySelector('input[type=text]').value,c=lin.querySelector('input[type=color]').value,r;
      if(e.target.closest('[data-salvar]'))r=await sb().rpc('siape_conf_opcao_salvar',{p_id:id,p_nome:nome,p_cor:c,p_ativo:o.ativo});
      else if(e.target.closest('[data-ativo]'))r=await sb().rpc('siape_conf_opcao_salvar',{p_id:id,p_nome:nome,p_cor:c,p_ativo:e.target.dataset.ativo==='1'});
      else if(e.target.closest('[data-sobe]')||e.target.closest('[data-desce]')){var i=os.indexOf(o),j=i+(e.target.closest('[data-sobe]')?-1:1);if(j<0||j>=os.length)return;os.splice(j,0,os.splice(i,1)[0]);
        r=await sb().rpc('siape_conf_opcoes_ordenar',{p_ids:os.map(function(x){return x.id;})});}
      else return;
      if(r.error)return falhou(r.error);depois();};
  }
  function organizarOportunidades(){
    var mo=janela(true),ops=JSON.parse(JSON.stringify((M.painel&&M.painel.oportunidades)||{})),ps=produtos();
    $('mdMapa').innerHTML='<div class="md-cab"><div><h2>Oportunidades por evento</h2><p>O que cada evento do Portal pode significar para o escritório e quais teses da Prateleira ligar. Tese que pede um órgão (ex.: PRF) só aparece nos eventos daquele órgão. "Só informativo" nunca vira filtro de captação (ex.: IR por doença grave, dado sensível).</p></div><button class="md-x" type="button" data-fechar-mapa aria-label="Fechar">✕</button></div>'+
      '<div class="md-corpo">'+GRUPOS.map(function(g){return g[1].map(function(k){var o=ops[k]||{texto:'',produtos:[],informativo:false};
        return '<div class="ms-op-ev" data-ev="'+k+'"><h4>'+esc(EVT[k])+'</h4><textarea maxlength="600" aria-label="Texto da oportunidade" placeholder="Sem oportunidade ligada">'+esc(o.texto||'')+'</textarea>'+
          '<label class="ms-chk" style="font-size:12px"><input type="checkbox" data-info'+(o.informativo?' checked':'')+'> Só informativo</label>'+
          '<details'+((o.produtos||[]).length?' open':'')+'><summary style="font-size:12px;cursor:pointer">Teses ligadas ('+num((o.produtos||[]).length)+')</summary><div class="ms-op-prod">'+ps.map(function(p){return '<label><input type="checkbox" value="'+esc(p.id)+'"'+((o.produtos||[]).indexOf(p.id)>=0?' checked':'')+'> '+esc(p.nome)+'</label>';}).join('')+'</div></details></div>';}).join('');}).join('')+
      '<div class="ms-merro" id="msoErro"></div></div><div class="md-rod"><button class="btn" type="button" data-fechar-mapa>Cancelar</button><button class="btn btn-ouro" type="button" id="msoSalvar">Salvar</button></div>';
    mo.classList.add('aberto');
    $('msoSalvar').onclick=async function(){
      var b=this,p={};document.querySelectorAll('#mdMapa [data-ev]').forEach(function(el){
        p[el.dataset.ev]={texto:el.querySelector('textarea').value.trim(),informativo:el.querySelector('[data-info]').checked,produtos:Array.prototype.map.call(el.querySelectorAll('.ms-op-prod input:checked'),function(i){return i.value;})};});
      b.disabled=true;b.textContent='Salvando…';
      var r=await sb().rpc('siape_oportunidades_salvar',{p:p});
      if(r.error){$('msoErro').textContent='Não deu para salvar: '+(global.sagaErroBanco?global.sagaErroBanco(r.error):r.error.message);b.disabled=false;b.textContent='Salvar';return;}
      M.painel.oportunidades=r.data||p;fecharJanela();aviso('Oportunidades por evento salvas.');if(M.ev&&M.ev.dados)desenharLinhas(M.ev);if(M.cli&&M.cli.dados&&M.parte==='clientes')desenharLinhas(M.cli);
    };
  }

  /* ---------- Carga e LGPD ---------- */
  function parteCarga(c){
    var p=M.painel||{},cg=p.cargas||{},mz=p.meses||{},al=p.alcance||{},orgs=al.orgaos||{};
    c.innerHTML='<div class="ms-bloco"><h3>De onde vêm os dados</h3><p class="sub">Portal da Transparência (SIAPE), cadastro e remuneração. Ativos desde '+esc(mesTxt(mz.de))+'; aposentados e pensionistas desde 01/2020; último mês carregado: '+esc(mesTxt(mz.ate))+'. '+num(cg.total)+' cargas mensais'+(cg.com_erro?', <b style="color:var(--danger,#d6452d)">'+num(cg.com_erro)+' com erro</b>':'')+'; última em '+esc(dataHora(cg.ultima))+'.</p>'+
      '<ul class="ms-lista"><li>Órgãos: '+esc(Object.keys(orgs).map(function(k){return orgs[k];}).join(', '))+'.</li><li>Cargos: '+esc(al.cargos||'')+'.</li><li>Quem trabalha em '+esc(al.uf||'')+' e órgãos com '+esc(al.nomes||'')+'.</li></ul>'+
      '<p class="sub" style="margin-top:8px">Tabelas da tela preparadas em '+(p.preparado_em?esc(dataHora(p.preparado_em)):'<b>ainda não preparadas</b>')+' (refeitas toda madrugada às 3h50).</p></div>'+
      '<div class="ms-bloco"><h3>Avisos da carga</h3><ul class="ms-lista">'+(p.notas_meses||[]).map(function(n){return '<li>'+(n.mes?'<b>'+esc(mesTxt(n.mes))+'</b> ('+esc(n.lista)+'): ':'')+esc(n.texto)+'</li>';}).join('')+'</ul>'+
      ((p.renomeacoes||[]).length?'<p class="sub" style="margin-top:10px">Mudanças de nome de órgão ou cargo para centenas de pessoas no mesmo mês foram tratadas como renomeação (não viraram evento):</p><div class="ms-rolagem" style="max-height:220px;overflow:auto"><table class="ms-tab"><tbody>'+(p.renomeacoes||[]).map(function(r){return '<tr><td class="n">'+esc(mesTxt(r.mes))+' · '+esc(LISTA[r.lista]||r.lista)+'</td><td>'+esc(String(r.texto||'').replace(/^renomeações ignoradas:\s*/,''))+'</td></tr>';}).join('')+'</tbody></table></div>':'')+'</div>'+
      '<div class="ms-bloco"><h3>LGPD</h3><ul class="ms-lista"><li><b>Finalidade:</b> '+esc(p.finalidade||'')+'</li><li><b>Mínimo necessário:</b> sem CPF completo (o Portal mostra só 6 dígitos), sem matrícula e sem endereço. Remuneração só como marca (abate-teto, PSS, IR que começou ou parou).</li><li><b>Quem vê:</b> só o administrador geral. Cada exportação (CSV, PDF) e cada conferência vai para o Registro de atividades (módulo Teses).</li><li><b>Dado sensível:</b> IR ou PSS que parou pode indicar doença grave. Fica só como informação e nunca é filtro de captação.</li><li><b>Quanto tempo:</b> enquanto a pessoa estiver no Portal ou for cliente. A regra de limpeza (24 meses fora da lista para quem não é cliente) ainda não está ligada.</li></ul></div>';
  }

  /* ---------- abrir ---------- */
  async function recarregarPainel(){
    var r=await sb().rpc('siape_mapa_painel');
    if(r.error){aviso('Não deu para atualizar os números: '+erro(r.error),'erro');return;}
    M.painel=r.data||{};var ps=$('msPartes');if(ps)ps.innerHTML=htmlPartes();
  }
  async function abrir(){
    var pane=$('aba-mapa');if(!pane)return;estilos();
    if(M.montado&&M.painel)return;
    pane.innerHTML='<div class="ms-vazio">Carregando o Mapa dos servidores…</div>';
    var r=await sb().rpc('siape_mapa_painel');
    if(r.error){pane.innerHTML='<div class="ms-aviso verm">Não deu para abrir o Mapa dos servidores: '+erro(r.error)+'</div>';return;}
    M.painel=r.data||{};M.montado=true;if(!M.ev)M.ev=estadoLista('ev');
    var q=new URLSearchParams(location.search),pt=q.get('mapa');if(pt&&/^(geral|eventos|clientes|falecidos|carga)$/.test(pt))M.parte=pt;
    desenhar();
  }
  async function liberar(){
    try{var p=global.sagaPerfil?await global.sagaPerfil():null;var ok=!!(p&&p.eh_administrador);var bt=$('abaMapa');if(bt)bt.hidden=!ok;return ok;}catch(e){return false;}
  }
  global.SagaMapaServidores={abrir:abrir,liberar:liberar,_estado:M};
})(window);
