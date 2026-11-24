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
.bp-pane .bp-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:14px}
.bp-pane .bp-num{border:1px solid var(--border-soft);border-radius:12px;padding:9px 10px;background:var(--panel);color:var(--text);font:inherit;text-align:left;min-height:62px;display:flex;flex-direction:column;gap:2px}
.bp-pane button.bp-num{cursor:pointer}
.bp-pane button.bp-num:hover,.bp-pane button.bp-num:focus-visible{border-color:var(--gold);outline:0}
.bp-pane button.bp-num.active{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 10%,var(--panel))}
.bp-pane .bp-num b{font-size:18px;font-variant-numeric:lining-nums tabular-nums}
.bp-pane .bp-num span{font-size:11px;color:var(--muted);line-height:1.25}
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
@media (max-width:700px){.bp-pane .bp-filtros input:not([type=checkbox]),.bp-pane .bp-filtros select{min-width:0;flex:1 1 140px}}
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
    var S={montado:false,painel:null,f:Object.assign({pagina:1},cfg.filtroInicial||{}),dados:null,pedido:0,abertos:{}};
    function pane(){return $(cfg.pane);}
    function aviso(msg,tipo){var w=$(cfg.id+'Msg');if(!w)return;w.className='bp-aviso'+(tipo==='erro'?' verm':tipo==='amar'?' amar':'');w.innerHTML=msg;w.hidden=!msg;}
    function params(extra){var p={};Object.keys(S.f).forEach(function(k){var v=S.f[k];if(k==='pagina')return;if(v===''||v==null||v===false)return;p[k]=v;});return Object.assign(p,extra||{});}
    function descricao(){var p=params(),t=[];(cfg.filtros||[]).forEach(function(fl){var v=p[fl.k];if(v==null||v==='')return;if(fl.tipo==='chk')t.push(fl.label);else if(fl.tipo==='select'){var o=(fl.opcoes||[]).find(function(x){return String(x[0])===String(v);});t.push((fl.label?fl.label+': ':'')+(o?o[1]:v));}else if(fl.tipo==='reais')t.push(fl.label+' '+reais(v));else t.push(fl.label+': '+v);});return t.join(' · ')||'Sem filtro';}

    function htmlNumeros(){
      var ns=cfg.numeros(S.painel||{});
      return '<div class="bp-nums">'+ns.map(function(n,i){
        var ativo=n.filtro&&Object.keys(n.filtro).every(function(k){return String(S.f[k]||'')===String(n.filtro[k]);});
        return (n.filtro?'<button class="bp-num'+(ativo?' active':'')+'" type="button" data-num="'+i+'">':'<div class="bp-num">')+
          '<b>'+esc(n.v)+'</b><span>'+esc(n.t)+'</span>'+(n.sub?'<span>'+esc(n.sub)+'</span>':'')+(n.filtro?'</button>':'</div>');}).join('')+'</div>';
    }
    function htmlFiltros(){
      return '<div class="bp-filtros">'+(cfg.filtros||[]).map(function(fl){
        var v=S.f[fl.k];var id=cfg.id+'F_'+fl.k;
        if(fl.tipo==='busca')return '<input class="bp-busca" id="'+id+'" type="search" placeholder="'+esc(fl.label)+'" value="'+esc(v||'')+'" aria-label="'+esc(fl.label)+'">';
        if(fl.tipo==='select')return '<select id="'+id+'" aria-label="'+esc(fl.label)+'">'+fl.opcoes.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(v||'')===String(o[0])?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>';
        if(fl.tipo==='reais')return '<input class="bp-reais" id="'+id+'" inputmode="numeric" placeholder="'+esc(fl.label)+'" aria-label="'+esc(fl.label)+'" value="'+esc(v?mascaraReais(v):'')+'">';
        if(fl.tipo==='chk')return '<label class="bp-chk"><input type="checkbox" id="'+id+'"'+(v?' checked':'')+'> '+esc(fl.label)+'</label>';
        return '';}).join('')+'<button class="btn" type="button" id="'+cfg.id+'Limpar">Limpar filtros</button></div>';
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
      p.querySelectorAll('[data-num]').forEach(function(b){b.onclick=function(){var n=cfg.numeros(S.painel||{})[+b.dataset.num];if(!n||!n.filtro)return;
        var ja=Object.keys(n.filtro).every(function(k){return String(S.f[k]||'')===String(n.filtro[k]);});
        Object.keys(n.filtro).forEach(function(k){S.f[k]=ja?'':n.filtro[k];});S.f.pagina=1;desenhar();};});
      var tm=null;function mudou(){S.f.pagina=1;clearTimeout(tm);tm=setTimeout(carregarLista,350);}
      (cfg.filtros||[]).forEach(function(fl){var el=$(cfg.id+'F_'+fl.k);if(!el)return;
        if(fl.tipo==='busca')el.oninput=function(){S.f[fl.k]=el.value.trim();mudou();};
        else if(fl.tipo==='select')el.onchange=function(){S.f[fl.k]=el.value;mudou();};
        else if(fl.tipo==='reais')el.oninput=function(){var pos=el.value.length;el.value=mascaraReais(el.value);S.f[fl.k]=numReais(el.value);mudou();};
        else if(fl.tipo==='chk')el.onchange=function(){S.f[fl.k]=el.checked;mudou();};});
      $(cfg.id+'Limpar').onclick=function(){S.f=Object.assign({pagina:1},cfg.filtroInicial||{});desenhar();};
      $(cfg.id+'Csv').onclick=function(){exportarCsv(this);};
      $(cfg.id+'Pdf').onclick=function(){exportarPdf(this);};
      $(cfg.id+'Cruzar').onclick=function(){cruzar(this);};
    }
    async function carregarLista(){
      var box=$(cfg.id+'Lista');if(!box)return;var meu=++S.pedido;box.classList.add('entrando');
      var r=await sb().rpc(cfg.rpcListar,{p:params(),p_limite:LIM,p_offset:(S.f.pagina-1)*LIM});
      if(meu!==S.pedido)return;box.classList.remove('entrando');
      if(r.error){box.innerHTML='<div class="bp-aviso verm">Não deu para carregar a lista: '+erro(r.error)+'. Tente de novo ou mude os filtros.</div>';$(cfg.id+'Total').textContent='';return;}
      var d=S.dados=r.data||{},ls=d.linhas||[];S.abertos={};
      $(cfg.id+'Total').textContent=num(d.total)+' '+(d.total===1?cfg.palavra[0]:cfg.palavra[1])+' · '+descricao();
      if(!ls.length){box.innerHTML='<div class="bp-vazio">Ninguém com esses filtros.</div>';return;}
      box.innerHTML='<div class="bp-rolagem"><table class="bp-tab"><thead><tr>'+cfg.colunas.map(function(c){return '<th'+(c.n?' style="text-align:right"':'')+'>'+esc(c.t)+'</th>';}).join('')+'</tr></thead><tbody>'+
        ls.map(function(l,i){return '<tr class="bp-linha" data-i="'+i+'" tabindex="0" aria-expanded="false">'+cfg.colunas.map(function(c){return '<td'+(c.n?' class="n"':'')+'>'+c.html(l)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>'+
        '<div class="bp-pag"><span>página '+num(S.f.pagina)+' de '+num(Math.max(1,Math.ceil((d.total||0)/LIM)))+'</span><span class="bp-acoes">'+
        '<button class="btn" type="button" data-pg="-1"'+(S.f.pagina<=1?' disabled':'')+'>Anterior</button><button class="btn" type="button" data-pg="1"'+(S.f.pagina*LIM>=(d.total||0)?' disabled':'')+'>Próxima</button></span></div>';
      box.querySelectorAll('[data-pg]').forEach(function(b){b.onclick=function(){S.f.pagina+=+b.dataset.pg;carregarLista();var a=pane();if(a&&a.scrollIntoView)a.scrollIntoView({behavior:parado()?'auto':'smooth',block:'start'});};});
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
