/* =====================================================================
   SAGA · Teses e oportunidades > Listagem de Alagoas (blocos 415 a 418)
   Listas de servidores e pensionistas FEDERAIS em Alagoas juntadas pela União
   em 2018 na execução do SINTSEP/AL (0003191-41.1997.4.05.8000).
   Para os 28,86% e os 47,94%. SÓ o administrador geral (o banco recusa os outros).
   Marcar, filtrar, achar quem já é cliente e exportar a lista para a Captação.
   ===================================================================== */
(function(global){
  'use strict';
  var L={montado:false,painel:null,lista:null,f:{busca:'',achado:'',tese:'',marca:'',qualidade:'',cep:'',pagina:1},sel:{},todosDoFiltro:false,pedido:0};
  var LIM=50,MAX=25000;
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  var ACHADO={cpf:'pelo CPF',nome:'só pelo nome: conferir',nome_varios:'nome igual em várias fichas'};
  var QUAL={completa:'Nome e CPF',so_cpf:'Só o CPF lido',so_nome:'Só o nome lido',conferir:'Conferir'};
  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erro(e){return esc(global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e)));}
  function cor(c){return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(c||''))?c:'var(--muted)';}
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function dataHora(d){if(!d)return '';try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return d;}}
  function $(id){return document.getElementById(id);}
  function sb(){return global._sb;}
  function dig(v){return String(v||'').replace(/\D/g,'');}
  function fmtCpf(c){c=dig(c);return c.length===11?c.slice(0,3)+'.'+c.slice(3,6)+'.'+c.slice(6,9)+'-'+c.slice(9):c;}
  function cpfParcial(d){d=d.slice(0,11);var o=d.slice(0,3);if(d.length>3)o+='.'+d.slice(3,6);if(d.length>6)o+='.'+d.slice(6,9);if(d.length>9)o+='-'+d.slice(9);return o;}
  function fmtCep(c){c=dig(c);return c.length===8?c.slice(0,5)+'-'+c.slice(5):c;}
  function cepParcial(d){d=d.slice(0,8);return d.length>5?d.slice(0,5)+'-'+d.slice(5):d;}
  function versao(){var s=document.querySelector('script[src*="saga_ui.js"]');var m=s&&/\?v=(\d+)/.exec(s.getAttribute('src'));return m?m[1]:'';}
  function carregar(arq,glob){return new Promise(function(ok,falha){if(global[glob])return ok();var s=document.createElement('script');s.src=arq+'?v='+versao();s.onload=function(){ok();};s.onerror=function(){falha(new Error('Não carregou '+arq));};document.head.appendChild(s);});}
  function marcas(){return (L.painel&&L.painel.marcas)||[];}
  function marcaPorId(id){return marcas().find(function(m){return m.id===id;});}

  var CSS=`
#aba-listagem .la-aviso{border:1px solid var(--border-soft);border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--muted);margin-bottom:12px;background:var(--panel);line-height:1.5}
#aba-listagem .la-aviso b{color:var(--text)}
#aba-listagem .la-aviso.amar{border-left-color:#c98500}
#aba-listagem .la-erro{border-left-color:var(--danger,#d6452d);color:var(--text)}
#aba-listagem .la-topo{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}
#aba-listagem .la-cruz{font-size:12px;color:var(--muted)}
#aba-listagem .la-acoes{display:flex;gap:8px;flex-wrap:wrap}
#aba-listagem .la-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:14px}
#aba-listagem .la-num{border:1px solid var(--border-soft);border-radius:12px;padding:9px 10px;background:var(--panel);color:var(--text);font:inherit;text-align:left;cursor:pointer;min-height:64px;display:flex;flex-direction:column;gap:2px}
#aba-listagem .la-num:hover,#aba-listagem .la-num:focus-visible{border-color:var(--gold);outline:0}
#aba-listagem .la-num.active{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 12%,var(--panel))}
#aba-listagem .la-num b{font-size:19px;font-variant-numeric:lining-nums tabular-nums}
#aba-listagem .la-num span{font-size:11px;color:var(--muted);line-height:1.25}
#aba-listagem .la-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
#aba-listagem .la-filtros input,#aba-listagem .la-filtros select{min-width:140px}
#aba-listagem .la-filtros .la-busca{flex:1 1 220px}
#aba-listagem .la-selbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid var(--border-soft);border-radius:12px;padding:8px 10px;margin-bottom:10px;background:var(--panel);font-size:12.5px}
#aba-listagem .la-selbar .q{font-weight:600}
#aba-listagem .la-selbar input[type=text]{min-width:160px;flex:1 1 160px}
#aba-listagem .la-rolagem{overflow-x:auto}
#aba-listagem .la-tab{width:100%;border-collapse:collapse;font-size:12.5px}
#aba-listagem .la-tab th{text-align:left;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:7px 8px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
#aba-listagem .la-tab td{padding:7px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top}
#aba-listagem .la-tab td.n{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
#aba-listagem .la-tab a{color:var(--text);font-weight:600;text-decoration:none}#aba-listagem .la-tab a:hover{text-decoration:underline}
#aba-listagem .la-sub{display:block;font-size:10.5px;color:var(--muted)}
#aba-listagem .la-sub.amar{color:#c98500}
#aba-listagem .la-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border-soft);border-radius:999px;padding:1px 8px;font-size:10.5px;white-space:nowrap;margin:0 3px 3px 0}
#aba-listagem .la-chip i{width:8px;height:8px;border-radius:50%;background:var(--c,var(--muted));flex:0 0 auto}
#aba-listagem .la-chip.tem{border-color:var(--success,#2e9d6a);color:var(--success,#2e9d6a)}
#aba-listagem .la-vazio{padding:24px;text-align:center;color:var(--muted);font-size:13px}
#aba-listagem .la-pag{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12px;color:var(--muted)}
#aba-listagem .la-carregando{opacity:.55;transition:opacity .2s cubic-bezier(.22,.78,.25,1)}
#aba-listagem input[type=checkbox]{width:16px;height:16px}
#moLal .la-mlin{display:flex;gap:6px;align-items:center;margin-bottom:6px}
#moLal .la-mlin input[type=text]{flex:1 1 auto;min-width:0}
#moLal .la-mlin input[type=color]{width:36px;height:32px;padding:2px;border-radius:8px}
#moLal .la-mlin.fora{opacity:.55}
#moLal .la-merro{color:var(--danger,#d6452d);font-size:12px}
@media(max-width:700px){#aba-listagem .la-tab thead{display:none}#aba-listagem .la-tab tr{display:block;border-bottom:1px solid var(--border-soft);padding:6px 0}#aba-listagem .la-tab td{display:block;border:0;padding:3px 4px}#aba-listagem .la-tab td[data-r]::before{content:attr(data-r) ": ";color:var(--muted);font-size:10.5px}#aba-listagem .la-filtros input,#aba-listagem .la-filtros select{flex:1 1 45%;min-width:0}#aba-listagem .la-tab input[type=checkbox]{width:22px;height:22px}}
@media(prefers-reduced-motion:reduce){#aba-listagem .la-carregando{transition:none}}
`;
  function estilos(){if($('sagaListagemAlCss'))return;var s=document.createElement('style');s.id='sagaListagemAlCss';s.textContent=CSS;document.head.appendChild(s);}
  function aviso(msg,tipo){var w=$('laMsg');if(!w)return;w.className='la-aviso'+(tipo==='erro'?' la-erro':tipo==='amar'?' amar':'');w.innerHTML=msg;w.hidden=!msg;}

  /* ---------- painel ---------- */
  function htmlNums(){
    var p=L.painel||{},f=L.f;
    function bt(chave,valor,texto,ativo){return '<button type="button" class="la-num'+(ativo?' active':'')+'" data-num="'+chave+'"><b>'+num(valor)+'</b><span>'+texto+'</span></button>';}
    return bt('todos',p.linhas,'linhas na listagem',!f.achado&&!f.tese&&!f.marca)+
      '<div class="la-num" style="cursor:default"><b>'+num(p.com_cpf)+'</b><span>com CPF legível</span></div>'+
      bt('clientes',p.clientes,'clientes do SAGA achados ('+num(p.por_cpf)+' pelo CPF)',f.achado==='sim'&&!f.tese)+
      bt('sem_as_duas',p.sem_as_duas,'clientes sem os 28,86% nem os 47,94%',f.tese==='sem_as_duas')+
      bt('2886',p.com_2886,'já com 28,86%',f.tese==='2886')+
      bt('4794',p.com_4794,'já com 47,94%',f.tese==='4794')+
      bt('so_nome',p.por_nome,'achados só pelo nome (conferir)',f.achado==='nome')+
      bt('nao',p.nao_clientes,'linhas sem ficha no SAGA',f.achado==='nao');
  }
  function htmlCruz(){
    var li=(L.painel&&L.painel.lista)||{};var h='';
    if(li.cruzado_erro)h='<span style="color:var(--danger,#d6452d);font-weight:600">O último cruzamento falhou: '+esc(li.cruzado_erro)+'.</span> ';
    h+=li.cruzado_em?'Cruzado com as fichas em '+esc(dataHora(li.cruzado_em))+' · refeito toda madrugada junto com a Base de dados':'Ainda não cruzado com as fichas.';
    return h;
  }
  function htmlFiltros(){
    var f=L.f;
    function op(v,t,atual){return '<option value="'+esc(v)+'"'+(v===atual?' selected':'')+'>'+esc(t)+'</option>';}
    return '<div class="la-filtros">'+
      '<input class="la-busca" id="laBusca" type="search" autocomplete="off" placeholder="Nome ou CPF" value="'+esc(f.busca)+'" aria-label="Buscar por nome ou CPF">'+
      '<select id="laAchado" aria-label="No SAGA">'+op('','No SAGA ou não',f.achado)+op('sim','Já é cliente do SAGA',f.achado)+op('cpf','Achado pelo CPF',f.achado)+op('nome','Achado só pelo nome',f.achado)+op('nome_varios','Nome igual em várias fichas',f.achado)+op('nao','Não está no SAGA',f.achado)+'</select>'+
      '<select id="laTese" aria-label="Ações">'+op('','Qualquer ação',f.tese)+op('sem_as_duas','Cliente sem 28,86% nem 47,94%',f.tese)+op('2886','Já tem 28,86%',f.tese)+op('4794','Já tem 47,94%',f.tese)+'</select>'+
      '<select id="laMarca" aria-label="Marca">'+op('','Todas as marcas',f.marca)+op('sem','Sem marca',f.marca)+marcas().filter(function(m){return m.ativo;}).map(function(m){return op(m.id,m.nome+' ('+num(m.qtd)+')',f.marca);}).join('')+'</select>'+
      '<select id="laQual" aria-label="Leitura">'+op('','Toda leitura',f.qualidade)+op('completa','Nome e CPF',f.qualidade)+op('so_cpf','Só o CPF lido',f.qualidade)+op('so_nome','Só o nome lido',f.qualidade)+'</select>'+
      '<input id="laCep" inputmode="numeric" maxlength="9" placeholder="CEP (começo)" value="'+esc(cepParcial(dig(f.cep)))+'" aria-label="CEP">'+
      '<button class="btn" type="button" id="laLimpar">Limpar filtros</button></div>';
  }
  function desenhar(){
    var pane=$('aba-listagem');if(!pane)return;
    var p=L.painel||{};
    var prov=p.provisoria?'<div class="la-aviso amar"><b>Carga provisória:</b> '+num(p.provisoria)+' linhas tiradas do texto que já tinha sido extraído da listagem (2025). Em muitas páginas o nome e o CPF saíram separados: '+num((p.qualidade||{}).completa)+' linhas têm os dois, '+num((p.qualidade||{}).so_cpf)+' só o CPF e '+num((p.qualidade||{}).so_nome)+' só o nome. A leitura completa do PDF vai substituir esta carga (o que for marcado aqui fica).</div>':'';
    pane.innerHTML='<div class="la-aviso">'+esc((p.lista&&p.lista.nome)||'Listagem')+' · processo '+esc((p.lista&&p.lista.processo)||'')+'. Estar na listagem conta como <b>"a confirmar"</b> nos 28,86% e 47,94% da Base de dados (nunca "apto" sozinho). Só o administrador geral vê esta aba.</div>'+prov+
      '<div class="la-aviso" id="laMsg" hidden></div>'+
      '<div class="la-topo"><div class="la-cruz" id="laCruz">'+htmlCruz()+'</div><div class="la-acoes">'+
        '<button class="btn" type="button" id="laCruzar">Cruzar de novo</button><button class="btn" type="button" id="laMarcas">Organizar marcas</button>'+
        '<button class="btn" type="button" id="laCsv">Exportar para a Captação (CSV)</button><button class="btn" type="button" id="laPdf">PDF</button></div></div>'+
      '<div class="la-nums" id="laNums">'+htmlNums()+'</div>'+
      htmlFiltros()+
      '<div class="la-selbar" id="laSel"></div>'+
      '<div id="laLista"><div class="la-vazio">Carregando…</div></div>';
    ligar();desenharSel();
  }
  function ligar(){
    $('laNums').onclick=function(e){var b=e.target.closest('[data-num]');if(!b)return;var k=b.dataset.num,f=L.f;
      f.achado='';f.tese='';f.qualidade='';
      if(k==='clientes')f.achado='sim';else if(k==='so_nome')f.achado='nome';else if(k==='nao')f.achado='nao';
      else if(k==='sem_as_duas'||k==='2886'||k==='4794')f.tese=k;
      if(k==='todos')f.marca='';
      mudou(true);};
    var tm=null;
    $('laBusca').oninput=function(){var v=this.value;if(/^[\d.\-\s]+$/.test(v)&&v.trim()){var c=cpfParcial(dig(v));if(c!==v)this.value=c;}L.f.busca=this.value.trim();clearTimeout(tm);tm=setTimeout(function(){mudou(false);},400);};
    $('laCep').oninput=function(){var c=cepParcial(dig(this.value));if(c!==this.value)this.value=c;L.f.cep=dig(c);clearTimeout(tm);tm=setTimeout(function(){mudou(false);},400);};
    $('laAchado').onchange=function(){L.f.achado=this.value;mudou(true);};
    $('laTese').onchange=function(){L.f.tese=this.value;mudou(true);};
    $('laMarca').onchange=function(){L.f.marca=this.value;mudou(true);};
    $('laQual').onchange=function(){L.f.qualidade=this.value;mudou(true);};
    $('laLimpar').onclick=function(){L.f={busca:'',achado:'',tese:'',marca:'',qualidade:'',cep:'',pagina:1};desenhar();carregarLista();};
    $('laCruzar').onclick=cruzar;$('laMarcas').onclick=organizarMarcas;$('laCsv').onclick=exportarCsv;$('laPdf').onclick=pdf;
  }
  function mudou(redesenharNums){L.f.pagina=1;L.sel={};L.todosDoFiltro=false;if(redesenharNums){var n=$('laNums');if(n)n.innerHTML=htmlNums();['laAchado','laTese','laMarca','laQual'].forEach(function(id){var el=$(id);if(el){var k={laAchado:'achado',laTese:'tese',laMarca:'marca',laQual:'qualidade'}[id];el.value=L.f[k];}});}desenharSel();carregarLista();}
  function parametros(extra){var f=L.f;return Object.assign({busca:f.busca,achado:f.achado,tese:f.tese,marca:f.marca,qualidade:f.qualidade,cep:f.cep,pagina:f.pagina,limite:LIM},extra||{});}

  /* ---------- lista ---------- */
  // 24/11 (Dr. Victor): paginação comum (saga_paginacao.js); a página continua em L.f.pagina
  var PAG=null;function pag(){if(!PAG)PAG=SagaPaginacao.criar({tela:'listagem-al',rotulo:'linhas',aoMudar:function(P){L.f.pagina=P.pagina;carregarLista();}});return PAG;}
  async function carregarLista(){
    var box=$('laLista');if(!box)return;var meu=++L.pedido;box.classList.add('la-carregando');
    var P=pag();P.pagina=L.f.pagina||1;
    var r=await SagaPaginacao.buscarEmPartes(function(off,lim){return sb().rpc('listagem_al_buscar',{p:parametros({pagina:Math.floor(off/lim)+1,limite:lim})}).then(function(x){return x.error?x:{linhas:(x.data||{}).linhas,total:(x.data||{}).total};});},
      {offset:P.offset(),quantos:P.quantos(),lote:1000});
    if(meu!==L.pedido)return;box.classList.remove('la-carregando');
    if(r.error){box.innerHTML='<div class="la-aviso la-erro">Não deu para buscar na listagem: '+erro(r.error)+'</div>';return;}
    L.lista={total:r.total,linhas:r.linhas};P.total(r.total);L.f.pagina=P.pagina;desenharLista();
  }
  function desenharLista(){
    var box=$('laLista');if(!box)return;var d=L.lista||{},ls=d.linhas||[];
    if(!ls.length){box.innerHTML='<div class="la-vazio">Nenhuma linha da listagem com esses filtros.</div>';desenharSel();return;}
    var todos=ls.every(function(l){return L.sel[l.id];});
    box.innerHTML='<div class="la-rolagem"><table class="la-tab"><thead><tr><th><input type="checkbox" id="laTodos" aria-label="Marcar todos desta página"'+(todos?' checked':'')+'></th><th>Na listagem</th><th>CPF</th><th>CEP</th><th>Ficha no SAGA</th><th>Ações</th><th>Marca</th></tr></thead><tbody>'+
      ls.map(function(l){
        var m=marcaPorId(l.marca_id);
        var ficha=l.pessoa_id?'<a href="'+FICHA+'?pessoa_id='+encodeURIComponent(l.pessoa_id)+'" data-ficha>'+esc(l.ficha_nome||'Ficha')+'</a><span class="la-sub">'+esc(l.ficha_codigo||'')+' · '+esc(ACHADO[l.achado_por]||'')+'</span>'
          :(l.achado_por==='nome_varios'?'<span class="la-sub amar">Nome igual em várias fichas: procurar pelo nome</span>':'<span class="la-sub">Não está no SAGA</span>');
        var acoes=l.pessoa_id?((l.t2886?'<span class="la-chip tem">28,86% ✓</span>':'')+(l.t4794?'<span class="la-chip tem">47,94% ✓</span>':'')+(!l.t2886&&!l.t4794?'<span class="la-chip">sem as duas</span>':'')):'';
        return '<tr><td><input type="checkbox" data-sel="'+esc(l.id)+'" aria-label="Escolher '+esc(l.nome||fmtCpf(l.cpf))+'"'+(L.sel[l.id]?' checked':'')+'></td>'+
          '<td data-r="Na listagem">'+(l.nome?esc(l.nome):'<span class="la-sub">nome não lido</span>')+'<span class="la-sub">'+esc(QUAL[l.qualidade]||'')+(l.numero?' · nº '+esc(l.numero):'')+'</span></td>'+
          '<td class="n" data-r="CPF">'+(l.cpf?esc(fmtCpf(l.cpf)):'—')+'</td>'+
          '<td class="n" data-r="CEP">'+(l.cep?esc(fmtCep(l.cep)):'—')+'</td>'+
          '<td data-r="Ficha">'+ficha+'</td><td data-r="Ações">'+acoes+'</td>'+
          '<td data-r="Marca">'+(m?'<span class="la-chip" style="--c:'+cor(m.cor)+'"><i></i>'+esc(m.nome)+'</span>':'<span class="la-sub">sem marca</span>')+(l.marca_obs?'<span class="la-sub">'+esc(l.marca_obs)+'</span>':'')+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      pag().html();
    pag().ligar(box);
    box.querySelectorAll('[data-sel]').forEach(function(c){c.onchange=function(){var id=Number(c.dataset.sel);if(c.checked)L.sel[id]=1;else delete L.sel[id];L.todosDoFiltro=false;desenharSel();};});
    $('laTodos').onchange=function(){var ch=this.checked;ls.forEach(function(l){if(ch)L.sel[l.id]=1;else delete L.sel[l.id];});L.todosDoFiltro=false;desenharLista();};
    desenharSel();
  }

  /* ---------- marcar vários ---------- */
  function qtdSel(){return L.todosDoFiltro?((L.lista&&L.lista.total)||0):Object.keys(L.sel).length;}
  function desenharSel(){
    var bar=$('laSel');if(!bar)return;var n=qtdSel(),tot=(L.lista&&L.lista.total)||0;
    var opts=marcas().filter(function(m){return m.ativo;}).map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.nome)+'</option>';}).join('');
    bar.innerHTML=(n?'<span class="q">'+num(n)+(L.todosDoFiltro?' (todas do filtro)':'')+' escolhidas</span>':'<span class="la-sub" style="display:inline">Escolha linhas na lista para marcar.</span>')+
      (!L.todosDoFiltro&&tot>((L.lista&&L.lista.linhas||[]).length)&&tot<=MAX?'<button class="btn" type="button" id="laTodosFiltro">Escolher todas as '+num(tot)+' do filtro</button>':'')+
      (n?'<select id="laMarcaAplicar" aria-label="Marca a aplicar"><option value="">Escolha a marca…</option>'+opts+'<option value="__tirar">Tirar a marca</option></select><input type="text" id="laObs" maxlength="200" placeholder="Observação (opcional)" aria-label="Observação"><button class="btn btn-ouro" type="button" id="laAplicar">Aplicar</button><button class="btn" type="button" id="laDesmarcar">Limpar escolha</button>':'');
    var tf=$('laTodosFiltro');if(tf)tf.onclick=function(){L.todosDoFiltro=true;desenharSel();};
    var ap=$('laAplicar');if(ap)ap.onclick=aplicarMarca;
    var dm=$('laDesmarcar');if(dm)dm.onclick=function(){L.sel={};L.todosDoFiltro=false;desenharLista();};
  }
  async function idsDoFiltro(){
    var r=await sb().rpc('listagem_al_buscar',{p:parametros({pagina:1,limite:MAX})});
    if(r.error)throw r.error;return ((r.data&&r.data.linhas)||[]).map(function(l){return l.id;});
  }
  async function aplicarMarca(){
    var v=$('laMarcaAplicar').value,b=$('laAplicar');
    if(!v){aviso('Escolha a marca antes de aplicar.','amar');return;}
    b.disabled=true;b.textContent='Aplicando…';
    try{
      var ids=L.todosDoFiltro?await idsDoFiltro():Object.keys(L.sel).map(Number);
      var r=await sb().rpc('listagem_al_marcar',{p_ids:ids,p_marca:v==='__tirar'?null:v,p_obs:$('laObs').value||null});
      if(r.error)throw r.error;
      var m=marcaPorId(v);aviso(num(r.data&&r.data.marcados)+' linhas '+(m?'marcadas como <b>'+esc(m.nome)+'</b>':'sem marca agora')+'.');
      L.sel={};L.todosDoFiltro=false;await recarregarPainel();carregarLista();
    }catch(e){aviso('Não deu para marcar: '+erro(e),'erro');b.disabled=false;b.textContent='Aplicar';}
  }

  /* ---------- organizar as marcas (só o administrador; tirar = desativar) ---------- */
  function janela(){
    var mo=$('moLal');
    if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='moLal';mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-label','Marcas da listagem');
      mo.innerHTML='<div class="md estreito" id="mdLal"></div>';document.body.appendChild(mo);
      mo.addEventListener('click',function(e){if(e.target===mo||e.target.closest('[data-fechar-lal]'))fecharJanela();});}
    return mo;
  }
  function fecharJanela(){var mo=$('moLal');if(mo)mo.classList.remove('aberto');}
  function organizarMarcas(){
    var mo=janela(),ms=marcas().slice();
    $('mdLal').innerHTML='<div class="md-cab"><div><h2>Marcas da listagem</h2><p>Renomear, cor, ordem e tirar da lista (as linhas já marcadas guardam a marca).</p></div><button class="md-x" type="button" data-fechar-lal aria-label="Fechar">✕</button></div>'+
      '<div class="md-corpo"><div id="lalLinhas">'+ms.map(function(m,i){
        return '<div class="la-mlin'+(m.ativo?'':' fora')+'" data-id="'+esc(m.id)+'"><input type="color" value="'+esc(/^#[0-9a-f]{6}$/i.test(m.cor)?m.cor:'#8a94a6')+'" aria-label="Cor"><input type="text" maxlength="60" value="'+esc(m.nome)+'" aria-label="Nome da marca">'+
          '<button class="btn" type="button" data-sobe'+(i===0?' disabled':'')+' aria-label="Subir">▲</button><button class="btn" type="button" data-desce'+(i===ms.length-1?' disabled':'')+' aria-label="Descer">▼</button>'+
          '<button class="btn" type="button" data-salvar>Salvar</button><button class="btn" type="button" data-ativo="'+(m.ativo?'0':'1')+'">'+(m.ativo?'Tirar da lista':'Voltar')+'</button></div>';
      }).join('')+'</div><div class="la-mlin"><input type="color" id="lalNovaCor" value="#8a94a6" aria-label="Cor da nova marca"><input type="text" id="lalNova" maxlength="60" placeholder="Nova marca" aria-label="Nova marca"><button class="btn btn-ouro" type="button" id="lalCriar">+ Criar</button></div><div class="la-merro" id="lalErro"></div></div>';
    mo.classList.add('aberto');
    function falhou(e){$('lalErro').textContent='Não deu para salvar: '+(global.sagaErroBanco?global.sagaErroBanco(e):(e.message||e));}
    async function depois(){await recarregarPainel();organizarMarcas();}
    $('lalCriar').onclick=async function(){var n=$('lalNova').value.trim();if(!n){$('lalErro').textContent='Escreva o nome da nova marca.';return;}
      var r=await sb().rpc('listagem_al_marca_salvar',{p_id:null,p_nome:n,p_cor:$('lalNovaCor').value,p_ativo:true});if(r.error)return falhou(r.error);depois();};
    $('lalLinhas').onclick=async function(e){var lin=e.target.closest('[data-id]');if(!lin)return;var id=lin.dataset.id,m=ms.find(function(x){return x.id===id;});
      var nome=lin.querySelector('input[type=text]').value,c=lin.querySelector('input[type=color]').value,r;
      if(e.target.closest('[data-salvar]'))r=await sb().rpc('listagem_al_marca_salvar',{p_id:id,p_nome:nome,p_cor:c,p_ativo:m.ativo});
      else if(e.target.closest('[data-ativo]'))r=await sb().rpc('listagem_al_marca_salvar',{p_id:id,p_nome:nome,p_cor:c,p_ativo:e.target.dataset.ativo==='1'});
      else if(e.target.closest('[data-sobe]')||e.target.closest('[data-desce]')){var i=ms.indexOf(m),j=i+(e.target.closest('[data-sobe]')?-1:1);if(j<0||j>=ms.length)return;ms.splice(j,0,ms.splice(i,1)[0]);
        r=await sb().rpc('listagem_al_marcas_ordenar',{p_ids:ms.map(function(x){return x.id;})});}
      else return;
      if(r.error)return falhou(r.error);depois();};
  }

  /* ---------- cruzar, exportar ---------- */
  async function cruzar(){
    var b=$('laCruzar');b.disabled=true;b.textContent='Cruzando…';
    var r=await sb().rpc('listagem_al_cruzar');
    if(r.error){aviso('Não deu para cruzar com as fichas: '+erro(r.error),'erro');}
    else{var d=r.data||{};aviso('Cruzado: '+num(d.por_cpf)+' linhas pelo CPF, '+num(d.por_nome)+' só pelo nome, '+num(d.nome_em_varias_fichas)+' com nome igual em várias fichas; '+num(d.base_de_dados)+' resultados da Base de dados passaram a "a confirmar".');await recarregarPainel();carregarLista();}
    b.disabled=false;b.textContent='Cruzar de novo';
  }
  function descricaoFiltros(){
    var f=L.f,p=[];
    if(f.busca)p.push('Busca: '+f.busca);
    if(f.achado)p.push({sim:'Já é cliente',cpf:'Achado pelo CPF',nome:'Achado só pelo nome',nome_varios:'Nome em várias fichas',nao:'Não está no SAGA'}[f.achado]);
    if(f.tese)p.push({sem_as_duas:'Sem 28,86% nem 47,94%','2886':'Já tem 28,86%','4794':'Já tem 47,94%'}[f.tese]);
    if(f.marca)p.push('Marca: '+(f.marca==='sem'?'sem marca':((marcaPorId(f.marca)||{}).nome||'')));
    if(f.qualidade)p.push('Leitura: '+QUAL[f.qualidade]);
    if(f.cep)p.push('CEP começando em '+f.cep);
    return p.join(' · ')||'Sem filtro';
  }
  async function exportarCsv(){
    var b=$('laCsv');b.disabled=true;b.textContent='Exportando…';
    try{
      var r=await sb().rpc('listagem_al_buscar',{p:parametros({pagina:1,limite:MAX})});
      if(r.error)throw r.error;
      var ls=(r.data&&r.data.linhas)||[];
      if(!ls.length){aviso('Nada para exportar com esses filtros.','amar');return;}
      function c(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
      var linhas=[['Nome na listagem','CPF','CEP','Leitura','Ficha no SAGA','Código','Achado','Tem 28,86%','Tem 47,94%','Marca','Observação'].map(c).join(';')];
      ls.forEach(function(l){var m=marcaPorId(l.marca_id);
        linhas.push([l.nome,l.cpf?fmtCpf(l.cpf):'',l.cep?fmtCep(l.cep):'',QUAL[l.qualidade]||'',l.ficha_nome||'',l.ficha_codigo||'',ACHADO[l.achado_por]||'',l.t2886?'sim':'',l.t4794?'sim':'',m?m.nome:'',l.marca_obs||''].map(c).join(';'));});
      var blob=new Blob(['﻿'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='listagem-alagoas.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
      var x=await sb().rpc('listagem_al_registrar',{p_resumo:'Exportou CSV da listagem de Alagoas ('+ls.length+' linhas; '+descricaoFiltros()+')',p_acao:'consultou'});
      if(x.error)aviso('O arquivo saiu, mas o registro da exportação falhou: '+erro(x.error),'erro');
    }catch(e){aviso('Não deu para exportar: '+erro(e),'erro');}
    finally{b.disabled=false;b.textContent='Exportar para a Captação (CSV)';}
  }
  async function pdf(){
    var b=$('laPdf');b.disabled=true;
    try{
      await carregar('saga_pdf.js','SagaPdf');
      var r=await sb().rpc('listagem_al_buscar',{p:parametros({pagina:1,limite:1000})});
      if(r.error)throw r.error;
      var d=r.data||{},ls=d.linhas||[];
      if(!ls.length){aviso('Nada para pôr no PDF com esses filtros.','amar');return;}
      var h='<div class="kpis"><div class="forte"><span>Linhas</span><b>'+num(d.total)+'</b></div>'+(d.total>ls.length?'<div><span>No documento</span><b>'+num(ls.length)+' primeiras</b></div>':'')+'</div><div class="obs">'+esc(descricaoFiltros())+'</div>'+
        '<table class="tab"><thead><tr><th>Nome na listagem</th><th>CPF</th><th>CEP</th><th>Ficha no SAGA</th><th>Ações</th><th>Marca</th></tr></thead><tbody>'+
        ls.map(function(l){var m=marcaPorId(l.marca_id);return '<tr><td>'+esc(l.nome||'')+'</td><td class="num">'+esc(l.cpf?fmtCpf(l.cpf):'')+'</td><td class="num">'+esc(l.cep?fmtCep(l.cep):'')+'</td><td>'+esc(l.ficha_codigo||'')+(l.ficha_nome?' '+esc(l.ficha_nome):'')+'</td><td>'+(l.t2886?'28,86% ':'')+(l.t4794?'47,94%':'')+'</td><td>'+esc(m?m.nome:'')+'</td></tr>';}).join('')+'</tbody></table>';
      SagaPdf.imprimir({titulo:'Listagem de Alagoas',subtitulo:'SINTSEP/AL · '+num(d.total)+' linhas',arquivo:'listagem-alagoas',paisagem:true,paginas:[h]});
      sb().rpc('listagem_al_registrar',{p_resumo:'Gerou PDF da listagem de Alagoas ('+ls.length+' linhas; '+descricaoFiltros()+')',p_acao:'consultou'}).then(function(x){if(x.error)aviso('O PDF saiu, mas o registro falhou: '+erro(x.error),'erro');});
    }catch(e){aviso('Não deu para montar o PDF: '+erro(e),'erro');}
    finally{b.disabled=false;}
  }

  /* ---------- abrir ---------- */
  async function recarregarPainel(){
    var r=await sb().rpc('listagem_al_painel');
    if(r.error){aviso('Não deu para atualizar os números: '+erro(r.error),'erro');return;}
    L.painel=r.data||{};var n=$('laNums');if(n)n.innerHTML=htmlNums();var c=$('laCruz');if(c)c.innerHTML=htmlCruz();
    var sel=$('laMarca');if(sel){var v=L.f.marca;sel.innerHTML='<option value="">Todas as marcas</option><option value="sem">Sem marca</option>'+marcas().filter(function(m){return m.ativo;}).map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.nome)+' ('+num(m.qtd)+')</option>';}).join('');sel.value=v;}
  }
  async function abrir(){
    var pane=$('aba-listagem');if(!pane)return;estilos();
    if(L.montado&&L.painel)return;
    pane.innerHTML='<div class="la-vazio">Carregando a listagem…</div>';
    var r=await sb().rpc('listagem_al_painel');
    if(r.error){pane.innerHTML='<div class="la-aviso la-erro">Não deu para abrir a listagem de Alagoas: '+erro(r.error)+'</div>';return;}
    L.painel=r.data||{};L.montado=true;desenhar();carregarLista();
  }
  async function liberar(){
    try{var p=global.sagaPerfil?await global.sagaPerfil():null;var ok=!!(p&&p.eh_administrador);var bt=$('abaListagemAl');if(bt)bt.hidden=!ok;return ok;}catch(e){return false;}
  }
  global.SagaListagemAl={abrir:abrir,liberar:liberar,_estado:L};
})(window);
