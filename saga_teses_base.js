/* =====================================================================
   SAGA · Teses e oportunidades > Base de dados (T191 etapa 2; blocos 370 e 371)
   SÓ o administrador geral. Cruza o perfil dos clientes com o público de cada
   produto da Prateleira: apto (ainda sem a tese), a confirmar, falta dado, já tem.
   O banco recusa qualquer outra pessoa (teses_base_painel / _clientes / _pedir_recalculo).
   Doença grave é dado sensível (LGPD): nunca filtro.
   ===================================================================== */
(function(global){
  'use strict';
  var B={montado:false,painel:null,vis:'teses',f:{produto:'',estado:'oportunidade',situacao:'',orgao:'',uf:'',fase:'',busca:'',pagina:1},lista:null,esperando:null,roscas:null};
  var ESTADOS={apto:'Apto (ainda sem a tese)',confirmar:'A confirmar',falta:'Falta dado',tem:'Já tem a tese'};
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erro(e){return esc(global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e)));}
  function cor(c){return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(c||''))?c:'var(--gold)';}
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function dataHora(d){if(!d)return '';try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return d;}}
  function $(id){return document.getElementById(id);}
  function versao(){var s=document.querySelector('script[src*="saga_ui.js"]');var m=s&&/\?v=(\d+)/.exec(s.getAttribute('src'));return m?m[1]:'';}
  function carregar(arq,glob){return new Promise(function(ok,falha){if(global[glob])return ok();var s=document.createElement('script');s.src=arq+'?v='+versao();s.onload=function(){ok();};s.onerror=function(){falha(new Error('Não carregou '+arq));};document.head.appendChild(s);});}
  function produtos(){return (B.painel&&B.painel.produtos)||[];}
  function prodPorId(id){return produtos().find(function(p){return p.id===id;});}
  function sb(){return global._sb;}

  var CSS=`
#aba-base .tb-topo{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}
#aba-base .tb-rodada{font-size:12px;color:var(--muted);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#aba-base .tb-rodada .ok{color:var(--success,#2e9d6a)}#aba-base .tb-rodada .amar{color:#c98500}#aba-base .tb-rodada .verm{color:var(--danger,#d6452d);font-weight:700}
#aba-base .tb-acoes{display:flex;gap:8px;flex-wrap:wrap}
#aba-base .tb-aviso{border:1px solid var(--border-soft);border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--muted);margin-bottom:12px;background:var(--panel)}
#aba-base .tb-erro{border-left-color:var(--danger,#d6452d);color:var(--text)}
#aba-base .tb-vis{display:inline-flex;gap:3px;padding:3px;border:1px solid var(--border-soft);border-radius:12px;background:var(--panel);margin-bottom:12px}
#aba-base .tb-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
#aba-base .tb-card{position:relative;border:1px solid var(--border-soft);border-radius:14px;background:var(--panel);padding:12px 14px 12px 18px;min-width:0;overflow:hidden}
#aba-base .tb-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--tc)}
#aba-base .tb-card h3{margin:0 0 2px;font-size:14px;line-height:1.3}
#aba-base .tb-card .sig{font-size:10.5px;color:var(--muted);letter-spacing:.4px}
#aba-base .tb-nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:10px 0 8px}
#aba-base .tb-num{border:1px solid var(--border-soft);border-radius:10px;padding:6px 4px;text-align:center;cursor:pointer;background:none;color:var(--text);font:inherit;min-height:44px}
#aba-base .tb-num:hover,#aba-base .tb-num:focus-visible{border-color:var(--tc);outline:0}
#aba-base .tb-num b{display:block;font-size:17px;font-variant-numeric:lining-nums tabular-nums}
#aba-base .tb-num span{display:block;font-size:9.5px;color:var(--muted);line-height:1.2}
#aba-base .tb-num.apto b{color:var(--tc)}
#aba-base .tb-falta{font-size:11px;color:var(--muted);display:flex;gap:5px;flex-wrap:wrap}
#aba-base .tb-chip{border:1px solid var(--border-soft);border-radius:999px;padding:2px 8px;font-size:10.5px;white-space:nowrap}
#aba-base .tb-obs{font-size:11px;color:var(--muted);margin-top:6px}
#aba-base .tb-rod{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#aba-base .tb-sem{margin-top:14px}
#aba-base .tb-sem summary{cursor:pointer;font-size:12px;color:var(--muted)}
#aba-base .tb-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
#aba-base .tb-filtros input,#aba-base .tb-filtros select{min-width:130px}
#aba-base .tb-tabela{width:100%;border-collapse:collapse;font-size:12.5px}
#aba-base .tb-tabela th{text-align:left;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:7px 8px;border-bottom:1px solid var(--border-soft)}
#aba-base .tb-tabela td{padding:7px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top}
#aba-base .tb-tabela a{color:var(--text);font-weight:600;text-decoration:none}#aba-base .tb-tabela a:hover{text-decoration:underline}
#aba-base .tb-cod{display:block;font-size:10.5px;color:var(--muted);font-variant-numeric:lining-nums tabular-nums}
#aba-base .tb-pl{font-size:9.5px;border:1px solid var(--border-soft);border-radius:6px;padding:0 4px;margin-left:4px;color:var(--muted)}
#aba-base .tb-dots{display:flex;gap:5px;flex-wrap:wrap}
#aba-base .tb-dot{display:inline-flex;align-items:center;gap:3px;font-size:10px;border-radius:999px;padding:1px 7px 1px 3px;border:1px solid var(--border-soft);white-space:nowrap}
#aba-base .tb-dot i{width:10px;height:10px;border-radius:50%;flex:0 0 auto;background:var(--tc);border:2px solid var(--tc)}
#aba-base .tb-dot.confirmar i{background:transparent}
#aba-base .tb-dot.falta{opacity:.6}#aba-base .tb-dot.falta i{background:var(--muted);border-color:var(--muted)}
#aba-base .tb-dot.tem i{background:var(--tc)}#aba-base .tb-dot.tem::after{content:"✓";font-size:10px}
#aba-base .tb-pag{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12px;color:var(--muted)}
#aba-base .tb-legenda{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin:6px 0 10px}
#aba-base .tb-vazio{padding:24px;text-align:center;color:var(--muted);font-size:13px}
#aba-base .tb-rolagem{overflow-x:auto}
@media(max-width:700px){#aba-base .tb-tabela thead{display:none}#aba-base .tb-tabela tr{display:block;border-bottom:1px solid var(--border-soft);padding:6px 0}#aba-base .tb-tabela td{display:block;border:0;padding:3px 4px}#aba-base .tb-filtros input,#aba-base .tb-filtros select{flex:1 1 45%;min-width:0}#aba-base .tb-nums{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
  function estilos(){if($('sagaTesesBaseCss'))return;var s=document.createElement('style');s.id='sagaTesesBaseCss';s.textContent=CSS;document.head.appendChild(s);}

  function htmlRodada(){
    var p=B.painel||{},r=p.rodada,h='';
    if(!r)return '<span class="amar">A conta ainda não foi feita. Clique em "Recalcular agora".</span>';
    if(r.pedido&&!r.fim)return '<span class="amar">Conta pedida às '+esc(dataHora(r.inicio))+': começa em até 1 minuto (o agendador do banco faz a conta).</span>';
    if(r.ok===false)h='<span class="verm">A última conta falhou ('+esc(dataHora(r.inicio))+'): '+esc(r.erro||'sem motivo')+'.</span> ';
    if(p.ultima_ok)h+='<span class="ok">Contado em '+esc(dataHora(p.ultima_ok))+'</span> · refeito toda madrugada às 3h20';
    else if(r.ok!==false)h+='<span class="amar">Contando…</span>';
    return h;
  }
  function htmlTopo(){
    return '<div class="tb-topo"><div class="tb-rodada" id="tbRodada">'+htmlRodada()+'</div>'+
      '<div class="tb-acoes"><button class="btn" type="button" id="tbRecalc">Recalcular agora</button><button class="btn" type="button" id="tbPdf">PDF</button></div></div>'+
      '<div class="tb-aviso"><b>Só o administrador vê esta aba.</b> Apto = cumpre todos os critérios do público com os dados do SAGA e ainda não tem a tese. A confirmar = algo precisa ser conferido (dado tirado da planilha do Jurídico, plano de saúde, precatório cancelado, doença grave). Falta dado = o cliente não tem o dado que o critério pede (diz qual). Doença grave nunca é filtro (LGPD).</div>';
  }
  function htmlTotais(){
    var t=(B.painel&&B.painel.totais)||{};
    function k(n,r){return '<div class="kpi" style="cursor:default"><b style="font-size:18px">'+num(n)+'</b><div style="font-size:11px;color:var(--muted)">'+esc(r)+'</div></div>';}
    return '<div class="kpis">'+k(t.clientes,'clientes titulares')+k(t.juridico,'no Jurídico')+k(t.captacao,'só na Captação')+k(t.com_precatorio,'com precatório (PSS e outros)')+k(t.com_situacao,'com situação funcional ('+num(t.situacao_planilha)+' da planilha)')+k(t.com_orgao,'com órgão ('+num(t.orgao_planilha)+' da planilha)')+'</div>';
  }
  function htmlCardTese(p){
    var fal=Object.keys(p.faltam||{}).sort(function(a,b){return p.faltam[b]-p.faltam[a];}).slice(0,3);
    function n(est,rot,cls){return '<button type="button" class="tb-num '+(cls||'')+'" data-tb-ir="'+esc(p.id)+'" data-tb-est="'+est+'" title="Ver a lista: '+esc(rot)+'"><b>'+num(p[est])+'</b><span>'+esc(rot)+'</span></button>';}
    return '<div class="tb-card" style="--tc:'+cor(p.cor)+'"><h3>'+esc(p.nome)+'</h3><div class="sig">'+esc(p.sigla||'sem sigla')+(p.apto_juridico?' · '+num(p.apto_juridico)+' aptos no Jurídico':'')+'</div>'+
      '<div class="tb-nums">'+n('apto','aptos sem a tese','apto')+n('confirmar','a confirmar')+n('falta','falta dado')+n('tem','já têm')+'</div>'+
      (fal.length?'<div class="tb-falta">O que mais falta: '+fal.map(function(f){return '<span class="tb-chip">'+esc(f)+' ('+num(p.faltam[f])+')</span>';}).join('')+'</div>':'')+
      (p.nao_pode?'<div class="tb-obs">Quem não pode: '+esc(p.nao_pode)+'</div>':'')+
      (p.prazo?'<div class="tb-obs">Prazo: '+esc(p.prazo)+'</div>':'')+
      '<div class="tb-rod">'+(p.tese_id?'<a class="btn btn-sm" href="clientes_perfil.html?tese='+encodeURIComponent(p.tese_id)+'" data-clientes-tese="'+esc(p.tese_id)+'">Achar clientes</a>':'<span class="tb-obs">Produto sem tese ligada: "já tem" não é contado</span>')+'</div></div>';
  }
  function desenharTeses(){
    var box=$('tbConteudo');if(!box)return;
    var com=produtos().filter(function(p){return p.com_publico;}),sem=produtos().filter(function(p){return !p.com_publico;});
    if(!com.length){box.innerHTML='<div class="tb-vazio">Nenhum produto da Prateleira tem público definido ainda. Use "Editar público" na Prateleira.</div>';return;}
    box.innerHTML='<div id="tbRoscas"></div><div class="tb-grade">'+com.map(htmlCardTese).join('')+'</div>'+
      (sem.length?'<details class="tb-sem"><summary>Produtos sem público definido ('+sem.length+'): não entram na conta</summary><div class="tb-falta" style="margin-top:8px">'+sem.map(function(p){return '<span class="tb-chip">'+esc(p.nome)+'</span>';}).join('')+'</div><div class="tb-obs">Para incluir, abra o produto na Prateleira e use "Editar público".</div></details>':'');
    desenharRoscas(com);
  }
  function desenharRoscas(com){
    var root=$('tbRoscas');if(!root||!global.SagaRoscas)return;
    root.id='tbRoscas';B.roscas=global.SagaRoscas.criar(root,{chave:'saga-teses-base-graficos',rotulo:'Gráficos da Base de dados'});
    var faltas={};com.forEach(function(p){Object.keys(p.faltam||{}).forEach(function(k){faltas[k]=(faltas[k]||0)+p.faltam[k];});});
    var opor=com.map(function(p){return {id:p.id,nome:p.nome,valor:(p.apto||0)+(p.confirmar||0),cor:cor(p.cor)};}).filter(function(x){return x.valor;}).sort(function(a,b){return b.valor-a.valor;});
    var est={apto:0,confirmar:0,falta:0,tem:0};com.forEach(function(p){Object.keys(est).forEach(function(k){est[k]+=p[k]||0;});});
    B.roscas.atualizar([
      {id:'op',titulo:'Oportunidades por tese',rotulo:'aptos + conferir',itens:global.SagaRoscas.topo(opor,8,'Outras teses'),escolher:function(it){if(it.id!=='__outras__')irLista(it.id,'oportunidade');}},
      {id:'est',titulo:'Situação de todos os cruzamentos',rotulo:'cruzamentos',itens:Object.keys(est).map(function(k){return {id:k,nome:ESTADOS[k],valor:est[k]};}),escolher:function(it){irLista('',it.id);}},
      {id:'falta',titulo:'O que mais falta nos perfis',rotulo:'faltas',itens:global.SagaRoscas.topo(Object.keys(faltas).map(function(k){return {id:k,nome:k,valor:faltas[k]};}).sort(function(a,b){return b.valor-a.valor;}),7,'Outros dados')}
    ]);
  }
  function irLista(prod,est){B.f.produto=prod||'';B.f.estado=est||'';B.f.pagina=1;trocarVis('clientes');}

  /* ---------- por cliente ---------- */
  function htmlFiltros(){
    var f=B.f;
    function op(v,r,sel){return '<option value="'+esc(v)+'"'+(String(sel)===String(v)?' selected':'')+'>'+esc(r)+'</option>';}
    return '<div class="tb-filtros">'+
      '<select id="tbFProd" aria-label="Tese">'+op('','Todas as teses',f.produto)+produtos().filter(function(p){return p.com_publico;}).map(function(p){return op(p.id,p.nome,f.produto);}).join('')+'</select>'+
      '<select id="tbFEst" aria-label="Situação na tese">'+op('','Qualquer situação',f.estado)+op('oportunidade','Aptos + a confirmar',f.estado)+Object.keys(ESTADOS).map(function(k){return op(k,ESTADOS[k],f.estado);}).join('')+'</select>'+
      '<select id="tbFSit" aria-label="Situação funcional">'+op('','Ativo, aposentado, pensionista',f.situacao)+op('ativo','Ativo',f.situacao)+op('aposentado','Aposentado',f.situacao)+op('pensionista','Pensionista',f.situacao)+op('sem','Sem situação no perfil',f.situacao)+'</select>'+
      '<select id="tbFFase" aria-label="Fase">'+op('','Jurídico e Captação',f.fase)+op('juridico','Jurídico',f.fase)+op('captacao','Só Captação',f.fase)+'</select>'+
      '<select id="tbFUf" aria-label="UF">'+op('','Todas as UFs',f.uf)+(global.SagaPlanilha&&SagaPlanilha.UFS||'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ')).map(function(u){return op(u,u,f.uf);}).join('')+'</select>'+
      '<input id="tbFOrg" type="search" placeholder="Órgão (ex.: UFAL, PF)" value="'+esc(f.orgao)+'" autocomplete="off">'+
      '<input id="tbFBusca" type="search" placeholder="Nome ou código" value="'+esc(f.busca)+'" autocomplete="off">'+
      '<button class="btn" type="button" id="tbCsv">Exportar (CSV)</button></div>'+
      '<div class="tb-legenda"><span class="tb-dot" style="--tc:var(--gold)"><i></i>apto</span><span class="tb-dot confirmar" style="--tc:var(--gold)"><i></i>a confirmar</span><span class="tb-dot falta" style="--tc:var(--gold)"><i></i>falta dado</span><span class="tb-dot tem" style="--tc:var(--gold)"><i></i>já tem</span></div>';
  }
  function dotHtml(t){
    var p=prodPorId(t.p);if(!p)return '';
    var dica=p.nome+': '+ESTADOS[t.e]+((t.f&&t.f.length)?' · falta: '+t.f.join(', '):'')+((t.m&&t.m.length)?' · conferir: '+t.m.join('; '):'');
    return '<span class="tb-dot '+esc(t.e)+'" style="--tc:'+cor(p.cor)+'" title="'+esc(dica)+'"><i></i>'+esc(p.sigla||p.nome.slice(0,12))+'</span>';
  }
  function ordemDot(a,b){var o={apto:0,confirmar:1,tem:2,falta:3};return (o[a.e]-o[b.e]);}
  function linhaHtml(l){
    var link=FICHA+'?pessoa_id='+encodeURIComponent(l.pessoa_id)+(l.processo_id?'&processo_id='+encodeURIComponent(l.processo_id):'');
    var dots=(l.teses||[]).slice().sort(ordemDot).map(dotHtml).join('');
    return '<tr><td><a href="'+esc(link)+'">'+esc(l.nome||'Sem nome')+'</a><span class="tb-cod">'+esc(l.codigo||'')+'</span></td>'+
      '<td>'+(l.fase==='juridico'?'Jurídico':'Captação')+(l.uf?' · '+esc(l.uf):'')+'</td>'+
      '<td>'+(l.sit?esc(l.sit.replace('/',' / '))+(l.sit_fonte==='planilha'?'<span class="tb-pl" title="Tirado da planilha do Jurídico: conferir">planilha</span>':''):'<span style="color:var(--muted)">—</span>')+'</td>'+
      '<td>'+(l.org?esc(l.org)+(l.org_fonte==='planilha'?'<span class="tb-pl" title="Tirado da planilha do Jurídico: conferir">planilha</span>':''):'<span style="color:var(--muted)">—</span>')+(l.precatorio?'<span class="tb-cod">tem precatório</span>':'')+'</td>'+
      '<td><div class="tb-dots">'+(dots||'<span style="color:var(--muted)">nenhuma tese no público</span>')+'</div></td></tr>';
  }
  function parametros(extra){var f=B.f,p={produto:f.produto,estado:f.estado,situacao:f.situacao,orgao:f.orgao,uf:f.uf,fase:f.fase,busca:f.busca,pagina:f.pagina,limite:50};for(var k in extra)p[k]=extra[k];return p;}
  // 24/11 (Dr. Victor): paginação comum (saga_paginacao.js); a página continua em B.f.pagina
  var PAG=null;function pag(){if(!PAG)PAG=SagaPaginacao.criar({tela:'teses-base',rotulo:'clientes',aoMudar:function(P){B.f.pagina=P.pagina;carregarLista();var t=$('tbConteudo');if(t&&t.scrollIntoView)t.scrollIntoView({block:'start'});}});return PAG;}
  async function carregarLista(){
    var box=$('tbLista');if(!box)return;box.innerHTML='<div class="tb-vazio">Carregando…</div>';
    var P=pag();P.pagina=B.f.pagina||1;var meu=B.pedidoLista=(B.pedidoLista||0)+1,extra={};
    var r=await SagaPaginacao.buscarEmPartes(function(off,lim){return sb().rpc('teses_base_clientes',{p:parametros({pagina:Math.floor(off/lim)+1,limite:lim})}).then(function(x){if(x.error)return x;extra=x.data||{};return {linhas:extra.linhas,total:extra.total};});},
      {offset:P.offset(),quantos:P.quantos(),lote:200,progresso:function(a,t){if(meu===B.pedidoLista&&t>200)box.innerHTML='<div class="sg-pag-carregando">Carregando '+num(a)+' de '+num(t)+'…</div>';}});
    if(meu!==B.pedidoLista)return;
    if(r.error){box.innerHTML='<div class="tb-aviso tb-erro">Não deu para carregar a lista: '+erro(r.error)+'</div>';return;}
    B.lista=Object.assign({},extra,{linhas:r.linhas,total:r.total});var ls=B.lista.linhas||[],tot=B.lista.total||0;P.total(tot);B.f.pagina=P.pagina;
    if(!ls.length){box.innerHTML='<div class="tb-vazio">Nenhum cliente com esses filtros.</div>';return;}
    box.innerHTML='<div class="tb-rolagem"><table class="tb-tabela"><thead><tr><th>Cliente</th><th>Fase</th><th>Situação</th><th>Órgão</th><th>Teses (público)</th></tr></thead><tbody>'+ls.map(linhaHtml).join('')+'</tbody></table></div>'+
      P.html();
    P.ligar(box);
  }
  function desenharClientes(){
    var box=$('tbConteudo');if(!box)return;
    box.innerHTML=htmlFiltros()+'<div id="tbLista"></div>';
    var tm;function deb(fn){return function(){var v=this.value;clearTimeout(tm);tm=setTimeout(function(){fn(v);},300);};}
    [['tbFProd','produto'],['tbFEst','estado'],['tbFSit','situacao'],['tbFFase','fase'],['tbFUf','uf']].forEach(function(x){$(x[0]).addEventListener('change',function(){B.f[x[1]]=this.value;B.f.pagina=1;carregarLista();});});
    $('tbFOrg').addEventListener('input',deb(function(v){B.f.orgao=v;B.f.pagina=1;carregarLista();}));
    $('tbFBusca').addEventListener('input',deb(function(v){B.f.busca=v;B.f.pagina=1;carregarLista();}));
    $('tbCsv').onclick=exportarCsv;
    carregarLista();
  }

  /* ---------- exportar ---------- */
  async function exportarCsv(){
    var b=$('tbCsv');b.disabled=true;b.textContent='Exportando…';
    try{
      var r=await sb().rpc('teses_base_clientes',{p:parametros({exportar:true,limite:9999,pagina:1})});
      if(r.error)throw r.error;
      var ls=(r.data&&r.data.linhas)||[];
      function c(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
      var linhas=[['Código','Cliente','Fase','UF','Situação','Fonte da situação','Órgão','Fonte do órgão','Aptos','A confirmar','Falta dado','Já tem'].map(c).join(';')];
      ls.forEach(function(l){
        function por(e){return (l.teses||[]).filter(function(t){return t.e===e;}).map(function(t){var p=prodPorId(t.p);return (p&&(p.sigla||p.nome))+(e==='falta'&&t.f&&t.f.length?' ('+t.f.join(', ')+')':'');}).join(' | ');}
        linhas.push([l.codigo,l.nome,l.fase==='juridico'?'Jurídico':'Captação',l.uf,l.sit,l.sit_fonte,l.org,l.org_fonte,por('apto'),por('confirmar'),por('falta'),por('tem')].map(c).join(';'));
      });
      var blob=new Blob(['﻿'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='base-de-dados-teses.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
      var pd=prodPorId(B.f.produto);
      sb().rpc('teses_base_registrar',{p_resumo:'exportou CSV ('+ls.length+' clientes'+(pd?', tese '+(pd.sigla||pd.nome):'')+')'}).then(function(x){if(x.error)console.warn('Registro da exportação falhou:',x.error);});
    }catch(e){aviso('Não deu para exportar: '+erro(e));}
    b.disabled=false;b.textContent='Exportar (CSV)';
  }
  async function pdf(){
    try{await carregar('saga_pdf.js','SagaPdf');}catch(e){aviso('Não deu para abrir o PDF: '+erro(e));return;}
    var p=B.painel||{},t=p.totais||{},com=produtos().filter(function(x){return x.com_publico;});
    var h='<div class="kpis"><div><b>'+num(t.clientes)+'</b> clientes titulares</div><div><b>'+num(t.juridico)+'</b> no Jurídico</div><div><b>'+num(t.captacao)+'</b> só na Captação</div><div><b>'+num(t.com_precatorio)+'</b> com precatório</div></div>'+
      '<table class="tab"><thead><tr><th>Tese</th><th>Aptos sem a tese</th><th>A confirmar</th><th>Falta dado</th><th>Já têm</th><th>O que mais falta</th></tr></thead><tbody>'+
      com.map(function(x){var fal=Object.keys(x.faltam||{}).sort(function(a,b){return x.faltam[b]-x.faltam[a];}).slice(0,2).map(function(k){return esc(k)+' ('+num(x.faltam[k])+')';}).join('; ');
        return '<tr><td>'+esc(x.nome)+(x.sigla?' ('+esc(x.sigla)+')':'')+'</td><td>'+num(x.apto)+'</td><td>'+num(x.confirmar)+'</td><td>'+num(x.falta)+'</td><td>'+num(x.tem)+'</td><td>'+fal+'</td></tr>';}).join('')+'</tbody></table>'+
      '<p style="font-size:10px;color:#555">Apto = cumpre todos os critérios com os dados do SAGA e ainda não tem a tese. A confirmar = dado da planilha do Jurídico ou algo que só o cliente informa. Doença grave nunca é filtro (LGPD). Sem nome nem CPF de clientes neste relatório.</p>';
    SagaPdf.imprimir({titulo:'Base de dados das teses',subtitulo:'Contado em '+dataHora(p.ultima_ok),arquivo:'base-de-dados-teses',paisagem:true,paginas:[h]});
    sb().rpc('teses_base_registrar',{p_resumo:'gerou o PDF por tese'}).then(function(x){if(x.error)console.warn(x.error);});
  }

  /* ---------- recalcular ---------- */
  async function recalcular(){
    var b=$('tbRecalc');b.disabled=true;b.textContent='Pedido…';
    var r=await sb().rpc('teses_base_pedir_recalculo');
    if(r.error){b.disabled=false;b.textContent='Recalcular agora';aviso('Não deu para pedir a conta: '+erro(r.error));return;}
    var antes=B.painel&&B.painel.ultima_ok,tentativas=0;
    $('tbRodada').innerHTML='<span class="amar">Conta pedida: começa em até 1 minuto e leva alguns segundos. A tela atualiza sozinha.</span>';
    clearInterval(B.esperando);
    B.esperando=setInterval(async function(){
      tentativas++;
      var p=await sb().rpc('teses_base_painel');
      if(!p.error&&p.data&&(p.data.ultima_ok!==antes||(p.data.rodada&&p.data.rodada.ok===false&&!p.data.rodada.pedido))){
        clearInterval(B.esperando);B.painel=p.data;b.disabled=false;b.textContent='Recalcular agora';redesenhar();return;}
      if(tentativas>24){clearInterval(B.esperando);b.disabled=false;b.textContent='Recalcular agora';$('tbRodada').innerHTML='<span class="verm">A conta não terminou em 4 minutos. Confira em Configurações &gt; Saúde do sistema (agendador teses-base-pedidos).</span>';}
    },10000);
  }
  function aviso(html){var box=$('tbAvisoErro');if(box){box.innerHTML=html;box.hidden=false;}}

  /* ---------- montagem ---------- */
  function trocarVis(v){
    B.vis=v;document.querySelectorAll('#tbVis [data-tb-vis]').forEach(function(b){b.classList.toggle('active',b.dataset.tbVis===v);});
    if(v==='clientes')desenharClientes();else desenharTeses();
  }
  function redesenhar(){
    var pane=$('aba-base');if(!pane)return;
    pane.innerHTML=htmlTopo()+'<div class="tb-aviso tb-erro" id="tbAvisoErro" hidden></div>'+htmlTotais()+
      '<div class="tb-vis" id="tbVis" role="group" aria-label="Modo de ver"><button class="pill'+(B.vis==='teses'?' active':'')+'" type="button" data-tb-vis="teses">Por tese</button><button class="pill'+(B.vis==='clientes'?' active':'')+'" type="button" data-tb-vis="clientes">Por cliente</button></div><div id="tbConteudo"></div>';
    $('tbRecalc').onclick=recalcular;$('tbPdf').onclick=pdf;
    $('tbVis').onclick=function(e){var b=e.target.closest('[data-tb-vis]');if(b)trocarVis(b.dataset.tbVis);};
    pane.onclick=function(e){
      var n=e.target.closest('[data-tb-ir]');if(n){irLista(n.dataset.tbIr,n.dataset.tbEst);return;}
    };
    trocarVis(B.vis);
  }
  async function abrir(){
    var pane=$('aba-base');if(!pane)return;estilos();
    if(B.montado&&B.painel)return;
    pane.innerHTML='<div class="tb-vazio">Carregando a Base de dados…</div>';
    try{await carregar('saga_roscas.js','SagaRoscas');}catch(e){console.warn(e);}
    var r=await sb().rpc('teses_base_painel');
    if(r.error){pane.innerHTML='<div class="tb-aviso tb-erro">Não deu para abrir a Base de dados: '+erro(r.error)+'</div>';return;}
    B.painel=r.data||{};B.montado=true;redesenhar();
  }
  async function liberar(){
    // a aba só aparece para o administrador geral (o banco recusa os outros de qualquer jeito)
    try{var p=global.sagaPerfil?await global.sagaPerfil():null;var bt=$('abaBase');if(bt)bt.hidden=!(p&&p.eh_administrador);return !!(p&&p.eh_administrador);}catch(e){return false;}
  }
  global.SagaTesesBase={abrir:abrir,liberar:liberar,_estado:B};
})(window);
