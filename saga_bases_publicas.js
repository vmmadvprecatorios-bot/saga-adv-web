/* =====================================================================
   SAGA · Teses e oportunidades > Médicos e Devedores/PGFN (bases públicas; blocos 445 a 448)
   Motor comum das duas abas: números no alto (clicáveis), filtros, lista com 50 por página,
   detalhe da linha, exportação CSV (para contato) e PDF, sempre com registro.
   SÓ o administrador geral (o banco recusa os outros: bases_checar).
   Quem pediu para não receber ("Não enviar mais", Base única) aparece marcado e a exportação
   para contato tira essas pessoas sozinha. Quem não é cliente sai marcado com a identidade
   ANCREF (contato informativo pela associação); quem já é cliente sai como escritório (VMM).
   As configurações de cada aba ficam em saga_base_devedores.js e saga_base_medicos.js.
   ===================================================================== */
(function(global){
  'use strict';
  var LIM=50,MAX_CSV=25000,MAX_PDF=1000;
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';

  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erro(e){return esc(global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e)));}
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function reais(n){return Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});}
  function reaisCurto(n){n=Number(n||0);if(n>=1e9)return 'R$ '+(n/1e9).toLocaleString('pt-BR',{maximumFractionDigits:1})+' bi';if(n>=1e6)return 'R$ '+(n/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi';if(n>=1e3)return 'R$ '+(n/1e3).toLocaleString('pt-BR',{maximumFractionDigits:0})+' mil';return reais(n);}
  function dataBR(d){if(!d)return '';var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));return m?m[3]+'/'+m[2]+'/'+m[1]:String(d);}
  function comp(c){c=String(c||'');return c.length===6?c.slice(4)+'/'+c.slice(0,4):c;}
  function dataHora(d){if(!d)return '';try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return d;}}
  function $(id){return document.getElementById(id);}
  function sb(){return global._sb;}
  function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function versao(){var s=document.querySelector('script[src*="saga_ui.js"]');var m=s&&/\?v=(\d+)/.exec(s.getAttribute('src'));return m?m[1]:'';}
  function carregar(arq,glob){return new Promise(function(ok,falha){if(global[glob])return ok();var s=document.createElement('script');s.src=arq+'?v='+versao();s.onload=function(){ok();};s.onerror=function(){falha(new Error('Não carregou '+arq));};document.head.appendChild(s);});}
  function csvCel(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
  /* valor em R$ digitado com máscara (só números; centavos ignorados) */
  function mascaraReais(v){var d=String(v||'').replace(/\D/g,'').replace(/^0+/,'');return d?'R$ '+Number(d).toLocaleString('pt-BR'):'';}
  function numReais(v){var d=String(v||'').replace(/\D/g,'');return d?Number(d):null;}

  var CSS=`
.bp-pane .bp-aviso{border:1px solid var(--border-soft);border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--muted);margin-bottom:12px;background:var(--panel);line-height:1.5}
.bp-pane .bp-aviso b{color:var(--text)}
.bp-pane .bp-aviso.amar{border-left-color:#c98500}
.bp-pane .bp-aviso.verm{border-left-color:var(--danger,#d6452d);color:var(--text)}
.bp-pane .bp-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:6px;margin-bottom:12px}
.bp-pane .bp-num{border:1px solid var(--border-soft);border-radius:12px;padding:6px 9px;background:var(--panel);color:var(--text);font:inherit;text-align:left;min-height:48px;display:flex;flex-direction:column;gap:2px}
.bp-pane button.bp-num{cursor:pointer}
.bp-pane button.bp-num:hover,.bp-pane button.bp-num:focus-visible{border-color:var(--gold);outline:0}
.bp-pane button.bp-num.active{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 10%,var(--panel))}
.bp-pane .bp-num b{font-size:15px;font-weight:600;font-variant-numeric:lining-nums tabular-nums}
.bp-pane .bp-num span{font-size:10.5px;color:var(--muted);line-height:1.25}
.bp-pane .bp-bloco{border:1px solid var(--border-soft);border-radius:14px;background:var(--panel);padding:12px 14px;margin-bottom:14px}
.bp-pane .bp-bloco h3{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--text)}
.bp-pane .bp-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
.bp-pane .bp-filtros input:not([type=checkbox]),.bp-pane .bp-filtros select{min-width:120px}
.bp-pane .bp-filtros .bp-busca{flex:1 1 220px}
.bp-pane .bp-filtros input.bp-reais{width:130px;min-width:0}
.bp-pane .bp-filtros label.bp-chk{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--muted);white-space:nowrap}
.bp-pane .bp-rolagem{overflow-x:auto}
.bp-pane table.bp-tab{width:100%;border-collapse:collapse;font-size:12.5px;min-width:760px}
.bp-pane table.bp-tab th{text-align:left;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding:7px 8px;border-bottom:1px solid var(--border-soft);font-weight:600;white-space:nowrap}
.bp-pane table.bp-tab td{padding:7px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top;color:var(--text)}
.bp-pane table.bp-tab td.n{text-align:right;white-space:nowrap;font-variant-numeric:lining-nums tabular-nums}
.bp-pane table.bp-tab tr.bp-linha{cursor:pointer}
.bp-pane table.bp-tab tr.bp-linha:hover td{background:color-mix(in srgb,var(--gold) 6%,transparent)}
.bp-pane table.bp-tab tr.bp-det td{background:color-mix(in srgb,var(--panel) 70%,transparent);padding:0}
.bp-pane .bp-det-corpo{padding:10px 12px;font-size:12px;line-height:1.55;overflow:hidden;transition:max-height .32s cubic-bezier(.22,.78,.25,1),opacity .32s cubic-bezier(.22,.78,.25,1)}
.bp-pane .bp-sub{display:block;font-size:11px;color:var(--muted)}
.bp-pane .bp-chip{display:inline-block;font-size:10.5px;padding:1px 7px;border-radius:999px;border:1px solid var(--border-soft);color:var(--muted);white-space:nowrap;margin:1px 3px 1px 0}
.bp-pane .bp-chip.ok{border-color:#2e8b57;color:#2e8b57}
.bp-pane .bp-chip.amar{border-color:#c98500;color:#c98500}
.bp-pane .bp-chip.verm{border-color:var(--danger,#d6452d);color:var(--danger,#d6452d)}
.bp-pane .bp-chip.dest{border-color:var(--gold);color:var(--gold)}
.bp-pane .bp-pag{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--muted);flex-wrap:wrap}
.bp-pane .bp-acoes{display:flex;gap:6px;flex-wrap:wrap}
.bp-pane .bp-vazio{padding:18px;text-align:center;color:var(--muted);font-size:12.5px}
.bp-pane .bp-mini{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:6px}
.bp-pane .bp-mini th,.bp-pane .bp-mini td{padding:4px 6px;border-bottom:1px solid var(--border-soft);text-align:left;vertical-align:top}
.bp-pane .bp-mini td.n{text-align:right;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.bp-pane .bp-corpo{transition:opacity .28s cubic-bezier(.22,.78,.25,1)}
.bp-pane .bp-corpo.entrando{opacity:.35}
.bp-pane .bp-grupo{display:inline-flex;gap:4px;align-items:center;flex-wrap:nowrap}
.bp-pane .bp-filtros.bp-linha1{margin-bottom:6px}
.bp-pane .bp-filtros input:not([type=checkbox]),.bp-pane .bp-filtros select{height:30px;padding:3px 8px;font-size:12px;border-radius:8px;min-width:0}
.bp-pane .bp-filtros select{max-width:190px}
.bp-pane .bp-filtros .bp-busca{flex:1 1 180px;max-width:250px}
.bp-pane .bp-pag .btn,.bp-pane .bp-acoes .btn{height:28px;padding:2px 10px;font-size:11.5px}
.bp-pane .bp-filtros select{max-width:170px}
.bp-pane .bp-filtros input.bp-reais{width:112px}
.bp-pane .bp-filtros .btn{height:30px;padding:3px 10px;font-size:12px}
.bp-pane .bp-mais b{display:inline-block;min-width:16px;margin-left:4px;padding:0 5px;border-radius:999px;font-size:10.5px;font-weight:600;background:color-mix(in srgb,var(--gold) 22%,transparent);color:var(--text)}
.bp-pane .bp-mais-corpo{border:1px solid var(--border-soft);border-radius:10px;padding:8px;margin-bottom:6px}
.bp-pane .bp-mais-corpo .bp-filtros{margin:0}
.bp-pane .bp-etqs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px}
.bp-pane .bp-etqs:empty{display:none}
.bp-pane .bp-etq{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:1px 4px 1px 9px;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold) 45%,var(--border-soft));background:color-mix(in srgb,var(--gold) 8%,transparent);color:var(--text)}
.bp-pane .bp-etq button{border:0;background:none;color:var(--muted);cursor:pointer;font-size:11px;line-height:1;padding:2px 4px;border-radius:999px;min-height:0;height:auto}
.bp-pane .bp-etq button:hover,.bp-pane .bp-etq button:focus-visible{color:var(--text);background:color-mix(in srgb,var(--gold) 15%,transparent)}
.bp-pane .bp-cid{position:relative;display:inline-block}
.bp-pane .bp-cid-btn b{display:inline-block;min-width:16px;margin-left:4px;padding:0 5px;border-radius:999px;font-size:10.5px;font-weight:600;background:color-mix(in srgb,var(--gold) 22%,transparent);color:var(--text)}
.bp-pane .bp-cid-menu{position:absolute;z-index:30;top:calc(100% + 4px);left:0;width:min(320px,calc(100vw - 40px));background:var(--panel);border:1px solid var(--border-soft);border-radius:10px;padding:8px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.bp-pane .bp-cid-menu input.bp-cid-busca{width:100%;height:30px;font-size:12px;padding:3px 8px;border-radius:8px;margin-bottom:6px}
.bp-pane .bp-cid-lista{max-height:260px;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:2px}
.bp-pane .bp-cid-lista label.bp-chk{justify-content:flex-start;padding:3px 4px;border-radius:6px;color:var(--text)}
.bp-pane .bp-cid-lista label.bp-chk span{flex:1}
.bp-pane .bp-cid-lista label.bp-chk small{color:var(--muted);font-variant-numeric:lining-nums tabular-nums}
.bp-pane .bp-cid-pe{display:flex;justify-content:space-between;gap:6px;margin-top:6px}
.bp-pane .bp-nota{font-size:11px;color:var(--muted);margin:0 0 6px;line-height:1.45}
@media (max-width:700px){.bp-pane .bp-filtros input:not([type=checkbox]),.bp-pane .bp-filtros select{flex:1 1 130px;max-width:none}.bp-pane .bp-filtros .bp-busca{max-width:none;flex-basis:100%}.bp-pane .bp-grupo{flex:1 1 100%;flex-wrap:wrap}.bp-pane .bp-filtros input.bp-reais{flex:1 1 100px;width:auto}}
`;
  function estilos(){if($('sagaBasesPublicasCss'))return;var s=document.createElement('style');s.id='sagaBasesPublicasCss';s.textContent=CSS;document.head.appendChild(s);}

  /* chip "Não enviar mais" e ligação com a ficha (comuns às duas abas) */
  function htmlContato(l){
    if(l.pode_contatar===false){var n=l.nao_enviar||{};return '<span class="bp-chip verm" title="'+esc('Pediu para não receber'+(n.quando?' em '+dataBR(n.quando):'')+(n.canal?' ('+n.canal+')':'')+(n.o_que_disse?': '+n.o_que_disse:''))+'">Não enviar mais</span>';}
    return '';
  }
  function htmlFicha(l){
    if(!l.pessoa_id)return '<span class="bp-sub">não é cliente</span>';
    var conf=l.ligacao==='a_conferir';
    return '<a href="'+FICHA+'?pessoa_id='+encodeURIComponent(l.pessoa_id)+'">'+esc(l.pessoa_codigo||'Ficha')+'</a>'+
      '<span class="bp-sub">'+(conf?'<span class="bp-chip amar">a conferir (só o nome)</span>':'<span class="bp-chip ok">cliente</span>')+'</span>';
  }
  function identidade(l){return l.pessoa_id&&l.ligacao!=='a_conferir'?'Escritório (VMM): já é cliente':'ANCREF: contato informativo, não é cliente';}

  function criar(cfg){
    var S={porPagina:LIM,montado:false,painel:null,f:Object.assign({pagina:1},cfg.filtroInicial||{}),dados:null,pedido:0,abertos:{}};
    function pane(){return $(cfg.pane);}
    function aviso(msg,tipo){var w=$(cfg.id+'Msg');if(!w)return;w.className='bp-aviso'+(tipo==='erro'?' verm':tipo==='amar'?' amar':'');w.innerHTML=msg;w.hidden=!msg;}
    function params(extra){var p={};Object.keys(S.f).forEach(function(k){var v=S.f[k];if(k==='pagina')return;if(v===''||v==null||v===false)return;if(Array.isArray(v)&&!v.length)return;p[k]=v;});return Object.assign(p,extra||{});}
    function descricao(){var p=params(),t=[];(cfg.filtros||[]).forEach(function(fl){var v=p[fl.k];if(v==null||v==='')return;if(fl.tipo==='chk')t.push(fl.label);else if(fl.tipo==='select'){var o=(fl.opcoes||[]).find(function(x){return String(x[0])===String(v);});t.push((fl.label?fl.label+': ':'')+(o?o[1]:v));}else if(fl.tipo==='reais')t.push(fl.label+' '+reais(v));else if(fl.tipo==='faixa'){}else if(Array.isArray(v))t.push(fl.label+': '+v.join(', '));else t.push(fl.label+': '+v);});(cfg.filtros||[]).forEach(function(fl){if(fl.tipo!=='faixa')return;var a=p[fl.de],b=p[fl.ate];if(a||b)t.push(fl.label+(a?' de '+reais(a):'')+(b?' até '+reais(b):''));});return t.join(' · ')||'Sem filtro';}

    function painelVisto(){return Object.assign({},S.painel||{},S.painelF||{});}
    function htmlNumeros(){
      var ns=cfg.numeros(painelVisto());
      return '<div class="bp-nums">'+ns.map(function(n,i){
        var ativo=n.filtro&&Object.keys(n.filtro).every(function(k){return String(S.f[k]||'')===String(n.filtro[k]);});
        return (n.filtro?'<button class="bp-num'+(ativo?' active':'')+'" type="button" data-num="'+i+'">':'<div class="bp-num">')+
          '<b>'+esc(n.v)+'</b><span>'+esc(n.t)+'</span>'+(n.sub?'<span>'+esc(n.sub)+'</span>':'')+(n.filtro?'</button>':'</div>');}).join('')+'</div>'+
        (cfg.rpcPainelFiltro?'<p class="bp-nota" style="margin-top:-6px">'+(S.painelF?'Números com os filtros escolhidos.':S.semPainelFiltro?'Números da base inteira (os números que seguem os filtros entram com o bloco 457).':'Números da base inteira.')+'</p>':'');
    }
    function ligarNumeros(){
      var p=pane();if(!p)return;
      p.querySelectorAll('[data-num]').forEach(function(b){b.onclick=function(){var n=cfg.numeros(painelVisto())[+b.dataset.num];if(!n||!n.filtro)return;
        var ja=Object.keys(n.filtro).every(function(k){return String(S.f[k]||'')===String(n.filtro[k]);});
        Object.keys(n.filtro).forEach(function(k){S.f[k]=ja?'':n.filtro[k];});S.f.pagina=1;desenhar();};});
    }
    var pedidoPainel=0;
    async function atualizarPainelFiltro(){
      if(!cfg.rpcPainelFiltro||S.semPainelFiltro)return;
      var meu=++pedidoPainel,pr=params();delete pr.ordem;
      var r=await sb().rpc(cfg.rpcPainelFiltro,{p:pr});
      if(meu!==pedidoPainel)return;
      if(r.error){var c=String(r.error.code||'');
        if(c==='PGRST202'||c==='42883'){S.semPainelFiltro=true;S.painelF=null;}
        else{S.painelF=null;aviso('Os números do alto não acompanharam os filtros: '+erro(r.error)+'. A lista abaixo está certa.','amar');}}
      else S.painelF=r.data||null;
      var w=$(cfg.id+'Nums');if(w){w.innerHTML=htmlNumeros();ligarNumeros();}
    }
    function faixaAtiva(fl,a){return String(S.f[fl.de]||'')===String(a[1]||'')&&String(S.f[fl.ate]||'')===String(a[2]||'');}
    function visivel(fl){return !fl.exige||!!(S.painel||{})[fl.exige];}
    function htmlFaixa(fl){
      var pn=S.painel||{},sel=-1;(fl.atalhos||[]).forEach(function(a,i){if(faixaAtiva(fl,a))sel=i;});
      return '<span class="bp-grupo" role="group" aria-label="'+esc(fl.label)+'">'+
        '<input class="bp-reais" id="'+cfg.id+'F_'+fl.de+'" inputmode="numeric" placeholder="Valor de R$" title="'+esc(fl.label)+': de" aria-label="'+esc(fl.label)+' de" value="'+esc(S.f[fl.de]?mascaraReais(S.f[fl.de]):'')+'">'+
        '<input class="bp-reais" id="'+cfg.id+'F_'+fl.ate+'" inputmode="numeric" placeholder="até R$" aria-label="'+esc(fl.label)+' até" value="'+esc(S.f[fl.ate]?mascaraReais(S.f[fl.ate]):'')+'">'+
        '<select id="'+cfg.id+'F_'+fl.k+'_atalho" aria-label="Faixa de valor"><option value="">Faixa de valor</option>'+(fl.atalhos||[]).map(function(a,i){var q=a[3]?a[3](pn):null;
          return '<option value="'+i+'"'+(i===sel?' selected':'')+'>'+esc(a[0])+(q!=null?' ('+esc(num(q))+')':'')+'</option>';}).join('')+'</select></span>';
    }
    function htmlUmFiltro(fl){
        var v=S.f[fl.k];var id=cfg.id+'F_'+fl.k;
        if(!visivel(fl))return '';
        if(fl.tipo==='faixa')return htmlFaixa(fl);
        if(fl.tipo==='cidades'){var sel=Array.isArray(v)?v:[];
          return '<span class="bp-cid"><button class="btn bp-cid-btn'+(sel.length?' tem':'')+'" type="button" id="'+id+'" aria-expanded="false" aria-haspopup="true">'+esc(fl.label)+(sel.length?' <b>'+sel.length+'</b>':'')+'</button>'+
            '<div class="bp-cid-menu" id="'+id+'_menu" hidden><input type="search" class="bp-cid-busca" id="'+id+'_busca" placeholder="Buscar cidade" aria-label="Buscar cidade">'+
            '<div class="bp-cid-lista" id="'+id+'_lista"><div class="bp-sub">Carregando…</div></div>'+
            '<div class="bp-cid-pe"><button class="btn" type="button" id="'+id+'_limpar">Tirar todas</button><button class="btn" type="button" id="'+id+'_ok">Pronto</button></div></div></span>';}
        if(fl.tipo==='busca')return '<input class="bp-busca" id="'+id+'" type="search" placeholder="'+esc(fl.label)+'" value="'+esc(v||'')+'" aria-label="'+esc(fl.label)+'">';
        if(fl.tipo==='select')return '<select id="'+id+'" aria-label="'+esc(fl.label)+'" title="'+esc(fl.label)+'">'+fl.opcoes.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(v||'')===String(o[0])?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>';
        if(fl.tipo==='reais')return '<input class="bp-reais" id="'+id+'" inputmode="numeric" placeholder="'+esc(fl.label)+'" aria-label="'+esc(fl.label)+'" value="'+esc(v?mascaraReais(v):'')+'">';
        if(fl.tipo==='chk')return '<label class="bp-chk"><input type="checkbox" id="'+id+'"'+(v?' checked':'')+'> '+esc(fl.label)+'</label>';
        return '';
    }
    /* filtros ativos (etiquetas com ✕): [{k:[chaves], t:texto, principal}] */
    function ativos(){
      var out=[];(cfg.filtros||[]).forEach(function(fl){
        if(!visivel(fl))return;
        if(fl.tipo==='faixa'){var a=S.f[fl.de],b=S.f[fl.ate];if(a||b)out.push({k:[fl.de,fl.ate],t:'Valor'+(a?' de '+reais(a):'')+(b?' até '+reais(b):''),principal:fl.principal});return;}
        var v=S.f[fl.k];if(v==null||v===''||v===false||fl.tipo==='busca')return;
        if(Array.isArray(v)){if(!v.length)return;out.push({k:[fl.k],t:fl.label+': '+(v.length>3?v.slice(0,3).join(', ')+' e mais '+(v.length-3):v.join(', ')),principal:fl.principal,lista:true});return;}
        var t=fl.label;if(fl.tipo==='select'){var o=(fl.opcoes||[]).find(function(x){return String(x[0])===String(v);});t=(fl.curto||fl.label)+': '+(o?o[1]:v);}
        else if(fl.tipo==='reais')t=fl.label+' '+reais(v);
        out.push({k:[fl.k],t:t,principal:fl.principal});});
      return out;
    }
    function htmlAtivos(){var a=ativos();return a.map(function(x,i){return '<span class="bp-etq">'+esc(x.t)+'<button type="button" data-tirar="'+i+'" aria-label="Tirar o filtro '+esc(x.t)+'" title="Tirar este filtro">✕</button></span>';}).join('');}
    function nMais(){return ativos().filter(function(x){return !x.principal;}).length;}
    function htmlFiltros(){
      var fs=(cfg.filtros||[]).filter(visivel),pri=fs.filter(function(f){return f.principal;}),resto=fs.filter(function(f){return !f.principal;});
      var nm=nMais();
      return '<div class="bp-filtros bp-linha1">'+pri.map(htmlUmFiltro).join('')+
        (resto.length?'<button class="btn bp-mais'+(nm?' tem':'')+'" type="button" id="'+cfg.id+'Mais" aria-expanded="'+(S.maisAberto?'true':'false')+'" aria-controls="'+cfg.id+'MaisCorpo">Mais filtros'+(nm?' <b>'+nm+'</b>':'')+'</button>':'')+
        '<button class="btn bp-limpar" type="button" id="'+cfg.id+'Limpar">Limpar</button></div>'+
        (cfg.notaDestaque?'<p class="bp-nota">'+esc(cfg.notaDestaque)+'</p>':'')+
        '<div class="bp-mais-corpo" id="'+cfg.id+'MaisCorpo"'+(S.maisAberto?'':' hidden')+'><div class="bp-filtros">'+resto.map(htmlUmFiltro).join('')+'</div></div>'+
        '<div class="bp-etqs" id="'+cfg.id+'Ativos">'+htmlAtivos()+'</div>';
    }
    function desenhar(){
      var p=pane();if(!p)return;var pn=S.painel||{};
      p.innerHTML='<div class="bp-aviso"><b>Só o administrador geral vê esta base.</b> '+esc(pn.finalidade||'')+'</div>'+
        '<div id="'+cfg.id+'Msg" class="bp-aviso" hidden></div>'+
        '<div id="'+cfg.id+'Nums">'+htmlNumeros()+'</div>'+
        (cfg.htmlTopo?cfg.htmlTopo(pn):'')+
        '<div class="bp-bloco"><h3>'+esc(cfg.tituloLista)+'</h3>'+htmlFiltros()+
        '<div class="bp-pag" style="margin:0 0 8px"><span id="'+cfg.id+'Total"></span><span class="bp-acoes">'+
        '<button class="btn" type="button" id="'+cfg.id+'Csv" title="Tira sozinho quem pediu para não receber">Exportar para contato (CSV)</button>'+
        '<button class="btn" type="button" id="'+cfg.id+'Pdf">PDF</button>'+
        '<button class="btn" type="button" id="'+cfg.id+'Cruzar" title="Liga de novo com as fichas do SAGA">Cruzar com as fichas</button></span></div>'+
        '<div id="'+cfg.id+'Lista" class="bp-corpo"><div class="bp-vazio">Carregando…</div></div></div>'+
        (cfg.htmlRodape?cfg.htmlRodape(pn):'');
      ligar();carregarLista();
    }
    function ligar(){
      var p=pane();
      ligarNumeros();
      var tm=null;function mudou(){S.f.pagina=1;marcarNumeros();atualizarAtivos();clearTimeout(tm);tm=setTimeout(carregarLista,350);}
      function marcarNumeros(){var ns=cfg.numeros(painelVisto());p.querySelectorAll('[data-num]').forEach(function(b){var n=ns[+b.dataset.num];b.classList.toggle('active',!!(n&&n.filtro&&Object.keys(n.filtro).every(function(k){return String(S.f[k]||'')===String(n.filtro[k]);})));});}
      function atualizarAtivos(){var w=$(cfg.id+'Ativos');if(w)w.innerHTML=htmlAtivos();ligarTirar();
        var b=$(cfg.id+'Mais');if(b){var nm=nMais();b.classList.toggle('tem',!!nm);b.innerHTML='Mais filtros'+(nm?' <b>'+nm+'</b>':'');}}
      function ligarTirar(){p.querySelectorAll('[data-tirar]').forEach(function(b){b.onclick=function(){var x=ativos()[+b.dataset.tirar];if(!x)return;x.k.forEach(function(k){S.f[k]=x.lista?[]:'';});
        x.k.forEach(function(k){var el=$(cfg.id+'F_'+k);if(el&&!x.lista){if(el.type==='checkbox')el.checked=false;else el.value='';}});if(x.lista)marcarCidadesBtn();
        (cfg.filtros||[]).forEach(function(fl){if(fl.tipo==='faixa'){var at=$(cfg.id+'F_'+fl.k+'_atalho');if(at)at.value='';}});mudou();};});}
      ligarTirar();
      var mb=$(cfg.id+'Mais');if(mb)mb.onclick=function(){var c=$(cfg.id+'MaisCorpo');S.maisAberto=c.hidden;mb.setAttribute('aria-expanded',S.maisAberto?'true':'false');
        if(window.sagaRecolher)window.sagaRecolher(c,!S.maisAberto);else c.hidden=!S.maisAberto;};
      (cfg.filtros||[]).forEach(function(fl){if(fl.tipo!=='faixa'||!visivel(fl))return;
        var at=$(cfg.id+'F_'+fl.k+'_atalho');
        function marcar(){var sel='';fl.atalhos.forEach(function(a,i){if(faixaAtiva(fl,a))sel=String(i);});if(at)at.value=sel;}
        [fl.de,fl.ate].forEach(function(k){var el=$(cfg.id+'F_'+k);if(el)el.oninput=function(){el.value=mascaraReais(el.value);S.f[k]=numReais(el.value)||'';marcar();mudou();};});
        if(at)at.onchange=function(){var a=at.value===''?null:fl.atalhos[+at.value];S.f[fl.de]=a?(a[1]||''):'';S.f[fl.ate]=a?(a[2]||''):'';
          var e1=$(cfg.id+'F_'+fl.de),e2=$(cfg.id+'F_'+fl.ate);if(e1)e1.value=S.f[fl.de]?mascaraReais(S.f[fl.de]):'';if(e2)e2.value=S.f[fl.ate]?mascaraReais(S.f[fl.ate]):'';mudou();};});
      (cfg.filtros||[]).forEach(function(fl){if(fl.tipo!=='cidades'||!visivel(fl))return;ligarCidades(fl);});
      function marcarCidadesBtn(){(cfg.filtros||[]).forEach(function(fl){if(fl.tipo!=='cidades')return;var b=$(cfg.id+'F_'+fl.k);if(!b)return;var n=(S.f[fl.k]||[]).length;b.classList.toggle('tem',!!n);b.innerHTML=esc(fl.label)+(n?' <b>'+n+'</b>':'');
        var l=$(cfg.id+'F_'+fl.k+'_lista');if(l)l.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=(S.f[fl.k]||[]).indexOf(c.value)>=0;});});}
      function ligarCidades(fl){
        var id=cfg.id+'F_'+fl.k,btn=$(id),menu=$(id+'_menu'),busca=$(id+'_busca'),lista=$(id+'_lista');if(!btn)return;
        if(!S.cidades)S.cidades={};
        function fechar(){if(menu.hidden)return;btn.setAttribute('aria-expanded','false');if(window.sagaRecolher)window.sagaRecolher(menu,true);else menu.hidden=true;document.removeEventListener('mousedown',fora,true);document.removeEventListener('keydown',tecla,true);}
        function fora(ev){if(!menu.contains(ev.target)&&ev.target!==btn)fechar();}
        function tecla(ev){if(ev.key==='Escape'){fechar();btn.focus();}}
        function pintar(){var uf=S.f[fl.depende]||'';var arr=S.cidades[uf];var q=(busca.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
          if(!uf){lista.innerHTML='<div class="bp-sub">Escolha a UF para ver as cidades.</div>';return;}
          if(arr&&arr.erro){lista.innerHTML='<div class="bp-sub" style="color:var(--danger,#d6452d)">'+esc(arr.erro)+'</div>';return;}
          if(!arr){lista.innerHTML='<div class="bp-sub">Carregando…</div>';return;}
          var sel=S.f[fl.k]||[];var vis=arr.filter(function(c){return !q||String(c.municipio).toUpperCase().indexOf(q)>=0;}).slice(0,400);
          lista.innerHTML=vis.length?vis.map(function(c){return '<label class="bp-chk"><input type="checkbox" value="'+esc(c.municipio)+'"'+(sel.indexOf(c.municipio)>=0?' checked':'')+'> <span>'+esc(c.municipio)+'</span><small>'+esc(num(c.n))+'</small></label>';}).join(''):'<div class="bp-sub">Nenhuma cidade com esse nome.</div>';
          lista.querySelectorAll('input[type=checkbox]').forEach(function(c){c.onchange=function(){var s2=(S.f[fl.k]||[]).slice();var i=s2.indexOf(c.value);if(c.checked&&i<0)s2.push(c.value);if(!c.checked&&i>=0)s2.splice(i,1);S.f[fl.k]=s2;marcarCidadesBtn();mudou();};});}
        async function carregar(){var uf=S.f[fl.depende]||'';if(!uf||S.cidades[uf])return pintar();pintar();
          var r=await sb().rpc(fl.rpc,{p_uf:uf});
          if(r.error){var c=String(r.error.code||'');S.cidades[uf]={erro:(c==='PGRST202'||c==='42883')?'O menu de cidades entra com o bloco 457 (ainda não está no banco).':'Não deu para carregar as cidades: '+erro(r.error)+'.'};}
          else S.cidades[uf]=r.data||[];pintar();}
        btn.onclick=function(){if(!menu.hidden){fechar();return;}btn.setAttribute('aria-expanded','true');if(window.sagaRecolher)window.sagaRecolher(menu,false);else menu.hidden=false;
          busca.value='';carregar();setTimeout(function(){busca.focus();},30);document.addEventListener('mousedown',fora,true);document.addEventListener('keydown',tecla,true);};
        busca.oninput=pintar;
        $(id+'_limpar').onclick=function(){S.f[fl.k]=[];marcarCidadesBtn();pintar();mudou();};
        $(id+'_ok').onclick=fechar;
      }
      (cfg.filtros||[]).forEach(function(fl){if(fl.tipo==='faixa'||fl.tipo==='cidades')return;var el=$(cfg.id+'F_'+fl.k);if(!el)return;
        if(fl.tipo==='busca')el.oninput=function(){S.f[fl.k]=el.value.trim();mudou();};
        else if(fl.tipo==='select')el.onchange=function(){S.f[fl.k]=el.value;(cfg.filtros||[]).forEach(function(d){if(d.tipo==='cidades'&&d.depende===fl.k&&(S.f[d.k]||[]).length){S.f[d.k]=[];marcarCidadesBtn();}});mudou();};
        else if(fl.tipo==='reais')el.oninput=function(){el.value=mascaraReais(el.value);S.f[fl.k]=numReais(el.value)||'';mudou();};
        else if(fl.tipo==='chk')el.onchange=function(){S.f[fl.k]=el.checked;mudou();};});
      $(cfg.id+'Limpar').onclick=function(){S.f=Object.assign({pagina:1},cfg.filtroInicial||{});desenhar();};
      $(cfg.id+'Csv').onclick=function(){exportarCsv(this);};
      $(cfg.id+'Pdf').onclick=function(){exportarPdf(this);};
      $(cfg.id+'Cruzar').onclick=function(){cruzar(this);};
    }
    /* PAGINAÇÃO: um lugar só. Quando o padrão do sistema (5/10/50/100/Todos + páginas numeradas, feito por outra conversa)
       existir, trocar SÓ esta função: ela recebe a caixa e o total, e usa S.f.pagina e S.porPagina (lidos em carregarLista). */
    // 24/11 (Dr. Victor): paginação comum do sistema (saga_paginacao.js: Mostrar 5·10·50·100·Todos, páginas numeradas, Ir para).
    // "Todos" = até 2.000 por página (o banco aceita até 25.000 por pedido; o Brasil todo dos devedores passa de 1,5 mi: páginas de 2.000 com aviso).
    var PAG=null;
    function pagObj(){if(!PAG&&global.SagaPaginacao)PAG=global.SagaPaginacao.criar({tela:'bases-'+cfg.id,rotulo:cfg.palavra[1],aoMudar:function(P){irPagina(P.pagina,P.quantos());}});return PAG;}
    if(pagObj())S.porPagina=PAG.quantos();
    function paginacao(caixa,total){
      if(!caixa)return;var P=pagObj();
      if(!P){var pp=S.porPagina,pags=Math.max(1,Math.ceil(total/pp));
        caixa.innerHTML='<span>página '+num(S.f.pagina)+' de '+num(pags)+'</span><span class="bp-acoes">'+
          '<button class="btn" type="button" data-pg="-1"'+(S.f.pagina<=1?' disabled':'')+'>Anterior</button><button class="btn" type="button" data-pg="1"'+(S.f.pagina>=pags?' disabled':'')+'>Próxima</button></span>';
        caixa.querySelectorAll('[data-pg]').forEach(function(b){b.onclick=function(){irPagina(S.f.pagina+(+b.dataset.pg));};});return;}
      P.pagina=S.f.pagina||1;P.total(total);
      if(P.pagina!==S.f.pagina){S.f.pagina=P.pagina;}
      caixa.style.display='block';P.render(caixa);
    }
    function irPagina(n,porPagina){if(porPagina)S.porPagina=porPagina;S.f.pagina=Math.max(1,n);carregarLista();var a=pane();if(a&&a.scrollIntoView)a.scrollIntoView({behavior:parado()?'auto':'smooth',block:'start'});}
    async function carregarLista(){
      var box=$(cfg.id+'Lista');if(!box)return;var meu=++S.pedido;box.classList.add('entrando');
      atualizarPainelFiltro();
      var r=await sb().rpc(cfg.rpcListar,{p:params(),p_limite:S.porPagina,p_offset:(S.f.pagina-1)*S.porPagina});
      if(meu!==S.pedido)return;box.classList.remove('entrando');
      if(r.error){box.innerHTML='<div class="bp-aviso verm">Não deu para carregar a lista: '+erro(r.error)+'. Tente de novo ou mude os filtros.</div>';$(cfg.id+'Total').textContent='';return;}
      var d=S.dados=r.data||{},ls=d.linhas||[];S.abertos={};
      $(cfg.id+'Total').textContent=num(d.total)+' '+(d.total===1?cfg.palavra[0]:cfg.palavra[1])+' · '+descricao();
      if(!ls.length){box.innerHTML='<div class="bp-vazio">Ninguém com esses filtros.</div>';return;}
      box.innerHTML='<div class="bp-rolagem"><table class="bp-tab"><thead><tr>'+cfg.colunas.map(function(c){return '<th'+(c.n?' style="text-align:right"':'')+'>'+esc(c.t)+'</th>';}).join('')+'</tr></thead><tbody>'+
        ls.map(function(l,i){return '<tr class="bp-linha" data-i="'+i+'" tabindex="0" aria-expanded="false">'+cfg.colunas.map(function(c){return '<td'+(c.n?' class="n"':'')+'>'+c.html(l)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>'+
        '<div class="bp-pag" id="'+cfg.id+'Pag"></div>';
      paginacao($(cfg.id+'Pag'),d.total||0);
      box.querySelectorAll('tr.bp-linha').forEach(function(tr){
        tr.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(ev){ev.stopPropagation();});});
        function alternar(){abrirDetalhe(tr,ls[+tr.dataset.i]);}
        tr.onclick=alternar;tr.onkeydown=function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();alternar();}};});
    }
    async function abrirDetalhe(tr,l){
      var prox=tr.nextElementSibling;
      if(prox&&prox.classList.contains('bp-det')){var c=prox.querySelector('.bp-det-corpo');tr.setAttribute('aria-expanded','false');
        if(parado()||!c){prox.remove();return;}c.style.maxHeight=c.scrollHeight+'px';requestAnimationFrame(function(){c.style.maxHeight='0px';c.style.opacity='0';});setTimeout(function(){prox.remove();},330);return;}
      var det=document.createElement('tr');det.className='bp-det';det.innerHTML='<td colspan="'+cfg.colunas.length+'"><div class="bp-det-corpo" style="max-height:0;opacity:0">Carregando…</div></td>';
      tr.after(det);tr.setAttribute('aria-expanded','true');var c=det.querySelector('.bp-det-corpo');
      function mostrar(h){c.innerHTML=h;if(parado()){c.style.maxHeight='none';c.style.opacity='1';return;}requestAnimationFrame(function(){c.style.maxHeight=c.scrollHeight+'px';c.style.opacity='1';setTimeout(function(){c.style.maxHeight='none';},340);});}
      try{mostrar(await cfg.detalhe(l));}catch(e){mostrar('<div class="bp-aviso verm">Não deu para abrir o detalhe: '+erro(e)+'</div>');}
    }
    async function exportarCsv(b){
      var txt=b.textContent;b.disabled=true;b.textContent='Exportando…';
      try{
        var r=await sb().rpc(cfg.rpcListar,{p:params({contatar:true}),p_limite:MAX_CSV,p_offset:0});
        if(r.error)throw r.error;var d=r.data||{},ls=(d.linhas||[]).filter(function(l){return l.pode_contatar!==false;});
        if(!ls.length){aviso('Nada para exportar com esses filtros.','amar');return;}
        var linhas=[cfg.csv.cab.concat(['Contato como','Cliente do SAGA']).map(csvCel).join(';')];
        ls.forEach(function(l){linhas.push(cfg.csv.linha(l).concat([identidade(l),l.pessoa_codigo||'']).map(csvCel).join(';'));});
        var blob=new Blob(['﻿'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8'});
        var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=cfg.arquivo+'.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
        var msg='Saíram '+num(ls.length)+' linhas. Quem não é cliente está marcado "ANCREF" (contato só informativo, pela associação, e nada sai sem aprovação); quem pediu para não receber ficou de fora.';
        if(d.total>ls.length)msg+=' A lista tinha '+num(d.total)+': o arquivo leva no máximo '+num(MAX_CSV)+'. Filtre mais para pegar o resto.';
        aviso(msg,d.total>ls.length?'amar':'');
        var x=await sb().rpc('bases_registrar',{p_base:cfg.base,p_resumo:cfg.titulo+': exportou CSV para contato ('+ls.length+' linhas; '+descricao()+')',p_acao:'consultou',p_depois:{filtros:params(),linhas:ls.length}});
        if(x.error)aviso('O arquivo saiu, mas o registro da exportação falhou: '+erro(x.error),'erro');
      }catch(e){aviso('Não deu para exportar: '+erro(e),'erro');}
      finally{b.disabled=false;b.textContent=txt;}
    }
    async function exportarPdf(b){
      b.disabled=true;
      try{
        await carregar('saga_pdf.js','SagaPdf');
        var r=await sb().rpc(cfg.rpcListar,{p:params(),p_limite:MAX_PDF,p_offset:0});
        if(r.error)throw r.error;var d=r.data||{},ls=d.linhas||[];
        if(!ls.length){aviso('Nada para pôr no PDF com esses filtros.','amar');return;}
        var h='<div class="kpis"><div class="forte"><span>'+esc(cfg.palavra[1])+'</span><b>'+num(d.total)+'</b></div>'+(d.total>ls.length?'<div><span>No documento</span><b>'+num(ls.length)+' primeiros</b></div>':'')+'</div>'+
          '<div class="obs">'+esc(descricao())+'. '+esc((S.painel||{}).finalidade||'')+'</div>'+
          '<table class="tab"><thead><tr>'+cfg.pdf.cab.map(function(t){return '<th>'+esc(t)+'</th>';}).join('')+'</tr></thead><tbody>'+
          ls.map(function(l){return '<tr>'+cfg.pdf.linha(l).map(function(v,i){return '<td'+(cfg.pdf.num&&cfg.pdf.num[i]?' class="num"':'')+'>'+esc(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
        SagaPdf.imprimir({titulo:cfg.titulo,subtitulo:cfg.subtituloPdf+' · '+num(d.total)+' '+cfg.palavra[1],arquivo:cfg.arquivo,paisagem:true,paginas:[h]});
        sb().rpc('bases_registrar',{p_base:cfg.base,p_resumo:cfg.titulo+': gerou PDF ('+ls.length+' linhas; '+descricao()+')',p_acao:'consultou'}).then(function(x){if(x.error)aviso('O PDF saiu, mas o registro falhou: '+erro(x.error),'erro');});
      }catch(e){aviso('Não deu para montar o PDF: '+erro(e),'erro');}
      finally{b.disabled=false;}
    }
    async function cruzar(b){
      var txt=b.textContent;b.disabled=true;b.textContent='Cruzando…';
      try{var r=await sb().rpc(cfg.rpcCruzar);if(r.error)throw r.error;aviso('Cruzamento feito: '+esc(cfg.textoCruzar(r.data||{}))+'.');await recarregar();}
      catch(e){aviso('Não deu para cruzar com as fichas: '+erro(e),'erro');}
      finally{b.disabled=false;b.textContent=txt;}
    }
    async function recarregar(){var r=await sb().rpc(cfg.rpcPainel);if(r.error){aviso('Não deu para atualizar os números: '+erro(r.error),'erro');return;}S.painel=r.data||{};var n=$(cfg.id+'Nums');if(n)n.innerHTML=htmlNumeros();ligar();carregarLista();}
    async function abrir(){
      var p=pane();if(!p)return;estilos();p.classList.add('bp-pane');
      if(S.montado&&S.painel)return;
      p.innerHTML='<div class="bp-vazio">Carregando '+esc(cfg.titulo)+'…</div>';
      var r=await sb().rpc(cfg.rpcPainel);
      if(r.error){p.innerHTML='<div class="bp-aviso verm">Não deu para abrir '+esc(cfg.titulo)+': '+erro(r.error)+'</div>';return;}
      S.painel=r.data||{};S.montado=true;desenhar();
    }
    async function liberar(){
      try{var pf=global.sagaPerfil?await global.sagaPerfil():null;var ok=!!(pf&&pf.eh_administrador);var bt=$(cfg.botao);if(bt)bt.hidden=!ok;return ok;}catch(e){return false;}
    }
    return {abrir:abrir,liberar:liberar,_estado:S};
  }
  global.SagaBasesPublicas={criar:criar,u:{esc:esc,num:num,reais:reais,reaisCurto:reaisCurto,dataBR:dataBR,comp:comp,dataHora:dataHora,htmlContato:htmlContato,htmlFicha:htmlFicha,erro:erro}};
})(window);
