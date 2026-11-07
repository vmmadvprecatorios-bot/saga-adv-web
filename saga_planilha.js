/* =====================================================================
   SAGA · Planilha da Lista de Processos (Jurídico e Captação)
   Colunas na mesma ordem da planilha do escritório (tabela lista_colunas),
   um tipo de informação por coluna, filtro em cada coluna como no Excel
   (lista de valores com caixas, busca, ordenar A-Z/Z-A), edição na célula
   (clique duplo) gravando pelo banco (lista_salvar_celula), escolher colunas
   (preferência de cada usuário neste navegador) e filtro rápido
   Protocolados / Não protocolados. Mantém o visual e o Kanban da tela.
   Usa da tela: _sb, state, esc, FASE_FIXA, showToast, verFicha, renderLista,
   aplicarFiltros, sagaConfirmar.
   ===================================================================== */
window.SagaPlanilha=(function(){
  'use strict';
  var cols=[],situacoes=[],pronta=false,filtros={},ordem=null,protocolo='',retorno='',minhas=false,ocultas=null,editando=false,menuAberto=null;
  var CHAVE=function(){return 'saga-planilha2-'+FASE_FIXA+'-'+(state.meuInternoId||'');};
  // Nome e ordem próprios da Captação (planilha de captação do escritório)
  function nomeCol(c,fase){return (fase||(typeof FASE_FIXA!=='undefined'?FASE_FIXA:''))==='captacao'&&c.nome_captacao?c.nome_captacao:c.nome;}
  function ordemCol(c,fase){return (fase||(typeof FASE_FIXA!=='undefined'?FASE_FIXA:''))==='captacao'?(c.ordem_captacao!=null?c.ordem_captacao:1000+c.ordem):c.ordem;}
  function colPorChave(k){return cols.find(function(c){return c.chave===k;});}
  function hojeISO(d){var x=d||new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
  var VAZIO='\u0000vazio';
  var SISTEMA_SO_LEITURA=['processo.fase','processo.criado_em','processo.atualizado_em'];
  // Colunas que só fazem sentido numa fase
  var SO_CAPTACAO=['processo.captador'];

  function h(v){return esc(v==null?'':String(v));}
  function norm(v){return String(v==null?'':v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
  function nomeUsuario(id){var u=(state.responsaveis||[]).find(function(x){return String(x.id)===String(id);});return u?u.nome_completo:'';}
  function nomeArea(id){try{var a=(catalogoTeses.todasAreas()||[]).find(function(x){return String(x.id)===String(id);});return a?a.nome:'';}catch(e){return '';}}
  function situacao(id){return situacoes.find(function(s){return String(s.id)===String(id);});}
  function idsProtocolada(){return situacoes.filter(function(s){return s.conta_protocolada;}).map(function(s){return String(s.id);});}

  // Valor guardado (para filtrar e editar) e texto mostrado
  function bruto(p,c){
    var pe=p.pessoa||{};
    switch(c.campo_sistema){
      case 'pessoa.nome':return pe.nome_completo;
      case 'pessoa.cpf':return pe.cpf;
      case 'pessoa.uf':return pe.uf;
      case 'pessoa.situacao_vital':return pe.situacao_vital==='nao_informado'?null:pe.situacao_vital;
      case 'pessoa.telefone':return pe.telefone_whatsapp;
      case 'pessoa.email':return pe.email;
      case 'processo.numero':return p.numero_processo_cnj;
      case 'processo.area':return p.area_direito_id;
      case 'processo.tese':return p.tese_id;
      case 'processo.status':return p.status_id;
      case 'processo.fase':return (p.status||{}).fase;
      case 'processo.responsavel':return p.responsavel_id;
      case 'processo.captador':return p.captador_id;
      case 'processo.situacao_acao':return p.situacao_acao_id;
      case 'processo.valor_causa':return p.valor_causa;
      case 'processo.valor_precatorio':return p.valor_precatorio_origem;
      case 'processo.criado_em':return p.criado_em&&String(p.criado_em).slice(0,10);
      case 'processo.atualizado_em':return p.atualizado_em&&String(p.atualizado_em).slice(0,10);
      case 'processo.ultima_movimentacao':return p.ultima_movimentacao_em&&String(p.ultima_movimentacao_em).slice(0,10);
    }
    return (p.campos||{})[c.id];
  }
  function texto(p,c,v){
    if(v===undefined)v=bruto(p,c);
    if(v==null||v==='')return '';
    switch(c.campo_sistema){
      case 'processo.area':return nomeArea(v)||'';
      case 'processo.tese':return (p.tese||{}).nome||'';
      case 'processo.status':return (p.status||{}).nome||'';
      case 'processo.fase':return v==='juridico'?'Jurídico':v==='captacao'?'Captação':v;
      case 'processo.responsavel':case 'processo.captador':return nomeUsuario(v)||'';
      case 'processo.situacao_acao':return (situacao(v)||{}).nome||'';
      case 'pessoa.situacao_vital':return v==='vivo'?'Vivo':v==='falecido'?'Falecido':v;
    }
    if(c.tipo==='sim_nao')return v===true||v==='true'?'Sim':'Não';
    if(c.tipo==='usuario')return nomeUsuario(v)||'';
    if(c.tipo==='opcao'){var o=(c.opcoes||[]).find(function(o){return String(o.id)===String(v);});return o?o.nome:String(v);}
    if(c.tipo==='moeda')return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
    if(c.tipo==='porcentagem'){
      var pc=Number(v).toLocaleString('pt-BR')+'%';
      // Honorários (sucumbenciais, totais e a parte de cada escritório/participante): % do valor da causa; mostra também quanto dá em reais
      if((/sucumb/i.test(c.nome||'')||/^hon_/.test(c.chave||''))&&p&&Number(p.valor_causa)>0)pc+=' ('+new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(p.valor_causa)*Number(v)/100)+')';
      return pc;
    }
    if(c.tipo==='numero')return Number(v).toLocaleString('pt-BR');
    if(c.tipo==='data')return String(v).slice(0,10).split('-').reverse().join('/');
    if(c.tipo==='link')return (Array.isArray(v)?v:[]).map(function(l){return l.texto||l.url;}).join(' · ');
    return String(v);
  }
  function chave(p,c){var v=bruto(p,c);if(v==null||v===''||(Array.isArray(v)&&!v.length))return VAZIO;if(c.tipo==='link')return texto(p,c,v);return String(v);}
  function corDe(p,c){
    var v=bruto(p,c);
    if(c.campo_sistema==='processo.status')return (p.status||{}).cor;
    if(c.campo_sistema==='processo.situacao_acao')return (situacao(v)||{}).cor;
    if(c.tipo==='opcao'&&!c.campo_sistema){var o=(c.opcoes||[]).find(function(o){return String(o.id)===String(v);});return o&&o.cor;}
    return null;
  }

  function colunasDaTela(){return cols.filter(function(c){return c.ativo&&(c.escopo==='ambos'||c.escopo===FASE_FIXA)&&!(FASE_FIXA==='juridico'&&SO_CAPTACAO.indexOf(c.campo_sistema)!==-1);}).sort(function(a,b){return ordemCol(a)-ordemCol(b);});}
  function visiveis(){var oc=ocultas||{};return colunasDaTela().filter(function(c){return !oc[c.id];});}
  function lerPreferencias(){
    try{var s=JSON.parse(localStorage.getItem(CHAVE())||'null');if(s){ocultas=s.ocultas||{};filtros={};Object.keys(s.filtros||{}).forEach(function(k){filtros[k]=new Set(s.filtros[k]);});ordem=s.ordem||null;protocolo=s.protocolo||'';retorno=s.retorno||'';minhas=!!s.minhas;}}catch(e){}
    if(!ocultas)ocultas=padraoOcultas();
  }
  // Na Captação, o padrão mostra só as colunas da planilha de captação; as outras ficam em "Colunas"
  function padraoOcultas(){var o={};if(FASE_FIXA==='captacao')colunasDaTela().forEach(function(c){if(c.ordem_captacao==null)o[c.id]=true;});return o;}
  function guardar(){
    try{var f={};Object.keys(filtros).forEach(function(k){f[k]=Array.from(filtros[k]);});localStorage.setItem(CHAVE(),JSON.stringify({ocultas:ocultas,filtros:f,ordem:ordem,protocolo:protocolo,retorno:retorno,minhas:minhas}));}catch(e){}
  }

  // ---------- filtros e ordem (usados pela tela em processoNoEscopo e prepararVisaoProcessos) ----------
  function passa(p,ignorarCol){
    if(!pronta)return true;
    if(minhas&&String(p.captador_id||'')!==String(state.meuInternoId||''))return false;
    if(retorno){var cr=colPorChave('captacao.data_retorno'),dr=cr&&(p.campos||{})[cr.id],hoje=hojeISO(),em7=hojeISO(new Date(Date.now()+7*864e5));
      if(!dr)return false;dr=String(dr).slice(0,10);
      if(retorno==='hoje'&&dr!==hoje)return false;if(retorno==='atrasados'&&!(dr<hoje))return false;if(retorno==='semana'&&!(dr>hoje&&dr<=em7))return false;}
    if(protocolo){var ok=idsProtocolada().indexOf(String(p.situacao_acao_id||''))!==-1;if(protocolo==='sim'&&!ok)return false;if(protocolo==='nao'&&ok)return false;}
    for(var id in filtros){
      if(id===ignorarCol)continue;
      var c=cols.find(function(x){return x.id===id;});if(!c)continue;
      if(!filtros[id].has(chave(p,c)))return false;
    }
    return true;
  }
  function ordenar(lista){
    if(!pronta||!ordem)return lista;
    var c=cols.find(function(x){return x.id===ordem.coluna;});if(!c)return lista;
    var num=['numero','moeda','porcentagem'].indexOf(c.tipo)!==-1,dir=ordem.direcao==='desc'?-1:1;
    return lista.slice().sort(function(a,b){
      var va=bruto(a,c),vb=bruto(b,c),ea=va==null||va==='',eb=vb==null||vb==='';
      if(ea||eb)return ea===eb?0:ea?1:-1;
      if(num)return (Number(va)-Number(vb))*dir;
      if(c.tipo==='data')return String(va).localeCompare(String(vb))*dir;
      // opções da planilha (ex.: coluna Mês) seguem a ordem do menu, não a alfabética
      if(c.tipo==='opcao'&&!c.campo_sistema){var oa=(c.opcoes||[]).find(function(o){return String(o.id)===String(va);}),ob=(c.opcoes||[]).find(function(o){return String(o.id)===String(vb);});if(oa&&ob)return ((oa.ordem||0)-(ob.ordem||0))*dir;}
      return texto(a,c,va).localeCompare(texto(b,c,vb),'pt-BR',{numeric:true,sensitivity:'base'})*dir;
    });
  }

  // ---------- tabela ----------
  function renderTabela(lista){
    renderAbas();
    var cs=visiveis(),thead=document.querySelector('#listaView table thead'),tb=document.getElementById('tbodyPrincipal');
    if(!thead||!tb)return;
    var tabela=thead.parentNode;tabela.classList.add('sp-tabela');
    thead.innerHTML='<tr><th class="checkbox-col"><input type="checkbox" id="chkTodos"></th>'+cs.map(function(c){
      var ativo=filtros[c.id]||(ordem&&ordem.coluna===c.id);
      var seta=ordem&&ordem.coluna===c.id?(ordem.direcao==='asc'?' ↑':' ↓'):'';
      return '<th data-sp-col="'+h(c.id)+'"><button type="button" class="sp-th'+(ativo?' ativo':'')+'" data-sp-menu="'+h(c.id)+'" title="'+h(nomeCol(c))+' · filtrar e ordenar"><span class="sp-th-nome">'+h(nomeCol(c))+seta+'</span><span class="sp-funil">'+(filtros[c.id]?'⏷':'▾')+'</span></button><span class="sp-redim" data-sp-redim="'+h(c.id)+'" title="Arraste para mudar a largura · clique duplo ajusta ao texto"></span></th>';
    }).join('')+'<th></th></tr>';
    tb.innerHTML=lista.map(function(p){
      var sig=!!p.sigilo&&!state.permissoes.editar_dados;
      return '<tr data-sp-proc="'+h(p.id)+'"><td onclick="event.stopPropagation()"><input type="checkbox" class="chk-linha" value="'+h(p.id)+'"></td>'+cs.map(function(c){
        var t=sig&&c.campo_sistema!=='pessoa.nome'?'••••':exibir(c,texto(p,c)),cor=sig?null:corDe(p,c),v=bruto(p,c);
        var conteudo;
        if(c.campo_sistema==='pessoa.nome')conteudo='<span class="nome-cliente sp-link-ficha">'+h(t||'N/D')+'</span>';
        else if(c.tipo==='link'&&!sig&&Array.isArray(v))conteudo=v.map(function(l){var u=/^https?:\/\//i.test(l.url||'')?l.url:'';return u?'<a href="'+h(u)+'" target="_blank" rel="noopener noreferrer" class="sp-link" onclick="event.stopPropagation()">'+h(l.texto||l.url)+'</a>':'';}).join(' · ');
        else if(cor&&t)conteudo='<span class="sp-selo"><i style="background:'+h(cor)+'"></i>'+h(t)+'</span>';
        else conteudo=h(t)||'<span class="sp-vazio">—</span>';
        return '<td data-sp-cel="'+h(c.id)+'" class="'+(editavel(p,c)?'sp-editavel':'')+'" title="'+h(t)+'">'+conteudo+'</td>';
      }).join('')+'<td>'+acoesBtns(p)+'</td></tr>';
    }).join('');
    tb.querySelectorAll('tr[data-sp-proc]').forEach(function(tr){tr.onclick=null;});
    renderTotais(tabela,cs,lista);aplicarLarguras();atualizarFixas();restaurarSelecao();
    var kp=document.getElementById('spKanbanPor');if(kp)kp.style.display='none';
  }
  // ---------- largura das colunas (arrastar a borda do cabeçalho; vale só para você) ----------
  var CHAVE_LARG=function(){return 'saga-planilha-larg-'+FASE_FIXA+'-'+(state.meuInternoId||'');};
  var larguras=null,sel=null;
  function lerLarguras(){if(!larguras){try{larguras=JSON.parse(localStorage.getItem(CHAVE_LARG())||'{}')||{};}catch(e){larguras={};}}return larguras;}
  function guardarLarguras(){try{localStorage.setItem(CHAVE_LARG(),JSON.stringify(larguras||{}));}catch(e){}}
  function idCss(id){return String(id).replace(/["\\]/g,'');}
  function regraLargura(id,w){id=idCss(id);return '.sp-tabela [data-sp-col="'+id+'"],.sp-tabela [data-sp-cel="'+id+'"],.sp-tabela [data-sp-tot="'+id+'"]{width:'+w+'px;min-width:'+w+'px;max-width:'+w+'px}';}
  function aplicarLarguras(){
    var st=document.getElementById('spLarguras');if(!st){st=document.createElement('style');st.id='spLarguras';document.head.appendChild(st);}
    var l=lerLarguras();st.textContent=Object.keys(l).map(function(id){return regraLargura(id,l[id]);}).join('');
  }
  function ajustarAoTexto(id){
    var l=lerLarguras();delete l[id];aplicarLarguras();
    var tmp=document.createElement('style');var ic=idCss(id);tmp.textContent='.sp-tabela [data-sp-cel="'+ic+'"],.sp-tabela [data-sp-col="'+ic+'"],.sp-tabela [data-sp-tot="'+ic+'"]{max-width:none!important}';document.head.appendChild(tmp);
    var th=document.querySelector('.sp-tabela th[data-sp-col="'+ic+'"]');var w=th?Math.ceil(th.getBoundingClientRect().width):0;tmp.remove();
    if(w){l[id]=Math.max(70,Math.min(640,w+2));}
    aplicarLarguras();guardarLarguras();atualizarFixas();
  }
  function ligarRedimensionar(tabela){
    tabela.addEventListener('pointerdown',function(e){
      var al=e.target.closest('[data-sp-redim]');if(!al||e.button!==0)return;
      e.preventDefault();e.stopPropagation();fecharMenu();
      var id=al.dataset.spRedim,th=al.parentNode,x0=e.clientX,w0=th.getBoundingClientRect().width,l=lerLarguras();
      document.body.classList.add('sp-redimensionando');al.classList.add('ativo');
      try{al.setPointerCapture(e.pointerId);}catch(x){}
      var mover=function(ev){l[id]=Math.round(Math.max(60,Math.min(900,w0+ev.clientX-x0)));aplicarLarguras();atualizarFixas();};
      var soltar=function(){al.removeEventListener('pointermove',mover);al.removeEventListener('pointerup',soltar);al.removeEventListener('pointercancel',soltar);
        document.body.classList.remove('sp-redimensionando');al.classList.remove('ativo');guardarLarguras();};
      al.addEventListener('pointermove',mover);al.addEventListener('pointerup',soltar);al.addEventListener('pointercancel',soltar);
    });
    tabela.addEventListener('dblclick',function(e){var al=e.target.closest('[data-sp-redim]');if(al){e.stopPropagation();ajustarAoTexto(al.dataset.spRedim);}},true);
    tabela.addEventListener('click',function(e){if(e.target.closest('[data-sp-redim]'))e.stopPropagation();},true);
  }
  function larguraPadrao(){larguras={};guardarLarguras();aplicarLarguras();atualizarFixas();}
  // ---------- coluna do Cliente parada à esquerda ao rolar para o lado ----------
  function atualizarFixas(){
    var tabela=document.querySelector('#listaView table.sp-tabela');if(!tabela)return;
    tabela.querySelectorAll('.sp-fixa').forEach(function(el){el.classList.remove('sp-fixa','sp-fixa-ult');el.style.left='';});
    var ths=tabela.querySelectorAll('thead th'),fim=-1;
    for(var i=1;i<ths.length&&i<=3;i++){var c=cols.find(function(x){return x.id===ths[i].dataset.spCol;});if(c&&c.campo_sistema==='pessoa.nome'){fim=i;break;}}
    if(fim<0)return;
    var esq=[],acc=0;for(var k=0;k<=fim;k++){esq.push(acc);acc+=ths[k].getBoundingClientRect().width;}
    tabela.querySelectorAll('tr').forEach(function(tr){
      for(var k=0;k<=fim;k++){var cel=tr.children[k];if(!cel)break;cel.classList.add('sp-fixa');if(k===fim)cel.classList.add('sp-fixa-ult');cel.style.left=esq[k]+'px';}
    });
  }
  // ---------- linha de totais (soma do que está filtrado, em todas as páginas) ----------
  function renderTotais(tabela,cs,lista){
    var tf=tabela.querySelector('tfoot');
    if(!lista.length){if(tf)tf.remove();return;}
    if(!tf){tf=document.createElement('tfoot');tabela.appendChild(tf);}
    var todos=(typeof processoNoEscopo==='function'&&state.baseProcessos)?state.baseProcessos.filter(function(p){return processoNoEscopo(p);}):lista;
    var podeVer=!!(state.permissoes&&state.permissoes.editar_dados);
    var filtrado=Object.keys(filtros).length||protocolo||retorno||minhas;
    var rotulo='<span class="sp-tot-qtd">'+todos.length.toLocaleString('pt-BR')+' '+(todos.length===1?'processo':'processos')+'</span>'+(filtrado?'<span class="sp-tot-sub">filtrados</span>':'');
    var temNome=cs.some(function(c){return c.campo_sistema==='pessoa.nome';}),posto=false;
    tf.innerHTML='<tr><td></td>'+cs.map(function(c){
      var num=c.tipo==='moeda'||c.tipo==='numero',conteudo='';
      if(num){var soma=0,qtd=0;todos.forEach(function(p){if(p.sigilo&&!podeVer)return;var v=Number(bruto(p,c));if(isFinite(v)&&bruto(p,c)!=null&&bruto(p,c)!==''){soma+=v;qtd++;}});
        if(qtd)conteudo=(c.tipo==='moeda'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(soma):soma.toLocaleString('pt-BR'))+'<span class="sp-tot-sub">soma de '+qtd+'</span>';}
      else if(!posto&&(c.campo_sistema==='pessoa.nome'||!temNome)){posto=true;conteudo=rotulo;}
      return '<td data-sp-tot="'+h(c.id)+'"'+(num?' class="sp-tot-num"':'')+'>'+conteudo+'</td>';
    }).join('')+'<td></td></tr>';
  }
  // ---------- célula selecionada e teclado (como no Excel) ----------
  function celulaSel(){
    if(!sel)return null;var tr=document.querySelector('#tbodyPrincipal tr[data-sp-proc="'+idCss(sel.proc)+'"]');
    return tr?tr.querySelector('td[data-sp-cel="'+idCss(sel.col)+'"]'):null;
  }
  function selecionar(td,rolar){
    document.querySelectorAll('.sp-tabela td.sp-sel').forEach(function(x){x.classList.remove('sp-sel');});
    pintarCruz(null);
    if(!td){sel=null;return;}
    sel={proc:td.closest('tr').dataset.spProc,col:td.dataset.spCel};td.classList.add('sp-sel');pintarCruz(td);
    if(rolar){
      var sc=td.closest('.tabela-scroll'),r=td.getBoundingClientRect();
      if(sc){var rs=sc.getBoundingClientRect(),fx=sc.querySelector('thead th.sp-fixa-ult'),esq=rs.left+(fx&&!td.classList.contains('sp-fixa')?fx.getBoundingClientRect().right-rs.left:0);
        if(r.left<esq)sc.scrollLeft-=esq-r.left+8;else if(r.right>rs.right)sc.scrollLeft+=r.right-rs.right+8;
        var th=sc.querySelector('thead'),tfo=sc.querySelector('tfoot'),topo=rs.top+(th?th.getBoundingClientRect().height:0),base=rs.bottom-(tfo?tfo.getBoundingClientRect().height:0);
        if(r.top<topo)sc.scrollTop-=topo-r.top;else if(r.bottom>base)sc.scrollTop+=r.bottom-base;}
      r=td.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight)td.scrollIntoView({block:'nearest'});
    }
  }
  function restaurarSelecao(){var td=celulaSel();if(td){td.classList.add('sp-sel');pintarCruz(td);}}
  // destaque em cruz, como no Excel: a linha e a coluna da célula selecionada ficam com um tom suave
  function pintarCruz(td){
    document.querySelectorAll('.sp-tabela .sp-cruz-l,.sp-tabela .sp-cruz-c').forEach(function(x){x.classList.remove('sp-cruz-l','sp-cruz-c');});
    if(!td)return;
    var tr=td.closest('tr');if(tr)Array.prototype.forEach.call(tr.children,function(c){c.classList.add('sp-cruz-l');});
    var id=idCss(td.dataset.spCel);
    document.querySelectorAll('.sp-tabela [data-sp-cel="'+id+'"],.sp-tabela [data-sp-col="'+id+'"],.sp-tabela [data-sp-tot="'+id+'"]').forEach(function(c){c.classList.add('sp-cruz-c');});
  }
  function moverSel(dl,dc){
    var td=celulaSel();if(!td)return false;
    var tr=td.closest('tr'),cels=Array.prototype.slice.call(tr.querySelectorAll('td[data-sp-cel]')),i=cels.indexOf(td);
    if(dc){var j=i+dc;
      if(j<0||j>=cels.length){var outra=dc>0?tr.nextElementSibling:tr.previousElementSibling;if(!outra)return true;var oc=outra.querySelectorAll('td[data-sp-cel]');selecionar(dc>0?oc[0]:oc[oc.length-1],true);return true;}
      selecionar(cels[j],true);return true;}
    var alvo=dl>0?tr.nextElementSibling:tr.previousElementSibling;if(!alvo)return true;
    var n=alvo.querySelector('td[data-sp-cel="'+idCss(sel.col)+'"]');if(n)selecionar(n,true);return true;
  }
  function textoDaCelula(td){return td.getAttribute('title')||td.innerText||'';}
  function ligarTeclado(tabela){
    tabela.addEventListener('click',function(e){
      var td=e.target.closest('td[data-sp-cel]');
      if(!td||e.target.closest('a,button,input,select,.sp-editor'))return;
      selecionar(td,false);
    });
    document.addEventListener('mousedown',function(e){if(sel&&!e.target.closest('#listaView table')&&!e.target.closest('.sp-menu,.modal-overlay,.toast'))selecionar(null);});
    document.addEventListener('keydown',function(e){
      if(!sel||editando||menuAberto||e.altKey)return;
      var t=e.target;if(t&&(t.closest('input,textarea,select,[contenteditable="true"]')))return;
      if(document.querySelector('.modal-overlay.ativo,.sp-ov'))return;
      var td=celulaSel();if(!td){sel=null;return;}
      var k=e.key,feito=true;
      if((e.ctrlKey||e.metaKey)&&(k==='c'||k==='C')){var txt=textoDaCelula(td);if(txt&&txt!=='—'&&navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){aviso('Copiado: '+h(txt.length>40?txt.slice(0,40)+'…':txt));},function(){});}}
      else if(e.ctrlKey||e.metaKey)feito=false;
      else if(k==='ArrowDown')moverSel(1,0);else if(k==='ArrowUp')moverSel(-1,0);
      else if(k==='ArrowRight')moverSel(0,1);else if(k==='ArrowLeft')moverSel(0,-1);
      else if(k==='Tab')moverSel(0,e.shiftKey?-1:1);
      else if(k==='Enter'||k==='F2'){
        var c=cols.find(function(x){return x.id===sel.col;});
        if(c&&c.campo_sistema==='pessoa.nome'&&k==='Enter')verFicha(sel.proc);else if(td.classList.contains('sp-editavel'))editar(td);
      }
      else if(k==='Escape')selecionar(null);
      else feito=false;
      if(feito)e.preventDefault();
    });
  }
  // depois de editar: Enter desce, Tab vai para a próxima, Esc fica onde está
  function aposEditar(tecla){
    if(tecla==='Enter')moverSel(1,0);else if(tecla==='Tab')moverSel(0,1);else if(tecla==='ShiftTab')moverSel(0,-1);else restaurarSelecao();
  }
  function redesenhar(){renderBarra();if(state.view==='lista')renderLista();else renderKanban();if(typeof atualizarContagem==='function')atualizarContagem();}
  // Celular: cada processo vira um cartão com as colunas visíveis da planilha (a tabela larga fica opcional)
  function cartoesHtml(lista){
    var cs=visiveis(),hoje=hojeISO();
    var cNome=cs.find(function(c){return c.campo_sistema==='pessoa.nome';})||colPorChave('pessoa.nome')||cols.find(function(c){return c.campo_sistema==='pessoa.nome';});
    var cSt=cols.find(function(c){return c.campo_sistema==='processo.status';});
    return lista.map(function(p){
      var sig=!!p.sigilo&&!state.permissoes.editar_dados,pe=p.pessoa||{};
      var st=cSt&&!sig?texto(p,cSt):'',stCor=cSt&&!sig?corDe(p,cSt):null;
      var campos=cs.filter(function(c){return c.campo_sistema!=='pessoa.nome'&&c.campo_sistema!=='processo.status';}).map(function(c){
        var v=bruto(p,c);if(v==null||v===''||(Array.isArray(v)&&!v.length))return '';
        var t=sig&&c.campo_sistema!=='pessoa.nome'?'••••':exibir(c,texto(p,c)),cor=sig?null:corDe(p,c),conteudo;
        if(!t&&!(c.tipo==='link'))return '';
        if(c.tipo==='link'&&!sig&&Array.isArray(v))conteudo=v.map(function(l){var u=/^https?:\/\//i.test(l.url||'')?l.url:'';return u?'<a href="'+h(u)+'" target="_blank" rel="noopener noreferrer" class="sp-link" onclick="event.stopPropagation()">'+h(l.texto||l.url)+'</a>':'';}).join(' · ');
        else if(c.chave==='captacao.data_retorno'&&!sig){var iso=String(v).slice(0,10),cl=iso<hoje?'atrasado':iso===hoje?'hoje':'';conteudo='<span class="sp-ret '+cl+'">'+h(t)+(cl==='atrasado'?' · atrasado':cl==='hoje'?' · hoje':'')+'</span>';}
        else if(cor)conteudo='<span class="sp-selo"><i style="background:'+h(cor)+'"></i>'+h(t)+'</span>';
        else conteudo=h(t);
        return '<div class="sp-cc-campo"><span class="sp-cc-rot">'+h(nomeCol(c))+'</span><span class="sp-cc-val">'+conteudo+'</span></div>';
      }).filter(Boolean).slice(0,6);
      var nome=cNome?texto(p,cNome):pe.nome_completo;
      return '<div class="cartao-cliente sp-cc" data-sp-proc="'+h(p.id)+'" onclick="verFicha(\''+h(p.id)+'\')">'+
        '<div class="sp-cc-topo"><div class="cartao-nome">'+h(nome||'N/D')+'</div>'+(st?'<span class="sp-cc-status" style="--c:'+h(stCor||'#8a94a8')+'"><i></i>'+h(st)+'</span>':'')+'</div>'+
        (campos.length?'<div class="sp-cc-campos">'+campos.join('')+'</div>':'')+
        (typeof providenciaHtml==='function'?providenciaHtml(p):'')+
        '<div class="cartao-rodape" onclick="event.stopPropagation()">'+(typeof acoesBtns==='function'?acoesBtns(p):'')+'</div></div>';
    }).join('');
  }
  // No celular a lista abre como planilha (pedido do Dr. Victor, 07/11); os cartões ficam como opção
  var CHAVE_CEL=function(){return 'saga-planilha-celular2-'+(state.meuInternoId||'');};
  function verTabelaNoCelular(){try{return localStorage.getItem(CHAVE_CEL())!=='cartoes';}catch(e){return true;}}
  function aplicarModoCelular(){document.body.classList.toggle('sp-ver-tabela',verTabelaNoCelular());}
  function editavel(p,c){
    if(!state.permissoes.editar)return false;
    if(p.sigilo&&!state.permissoes.editar_dados)return false;
    if(SISTEMA_SO_LEITURA.indexOf(c.campo_sistema)!==-1)return false;
    if(['processo.numero','processo.tese','processo.responsavel','processo.valor_causa','processo.valor_precatorio'].indexOf(c.campo_sistema)!==-1&&!state.permissoes.editar_dados)return false;
    return true;
  }
  function processo(id){return (state.baseProcessos||[]).find(function(p){return String(p.id)===String(id);});}

  // ---------- menu de filtro estilo Excel ----------
  function fecharMenu(){if(menuAberto){menuAberto.remove();menuAberto=null;}}
  function abrirMenu(c,ancora){
    fecharMenu();
    var base=(state.baseProcessos||[]).filter(function(p){return processoNoEscopoSemPlanilha(p)&&passa(p,c.id);});
    var mapa=new Map();
    base.forEach(function(p){var k=chave(p,c);if(!mapa.has(k))mapa.set(k,{k:k,t:k===VAZIO?'(Vazias)':texto(p,c)||'(Vazias)',n:0});mapa.get(k).n++;});
    var ordemOp={};(c.opcoes||[]).forEach(function(o){ordemOp[String(o.id)]=o.ordem||0;});
    var itens=Array.from(mapa.values()).sort(function(a,b){if(a.k===VAZIO)return 1;if(b.k===VAZIO)return -1;
      if(c.tipo==='opcao'&&!c.campo_sistema&&(a.k in ordemOp)&&(b.k in ordemOp))return ordemOp[a.k]-ordemOp[b.k];
      return a.t.localeCompare(b.t,'pt-BR',{numeric:true,sensitivity:'base'});});
    var atual=filtros[c.id];
    var m=document.createElement('div');m.className='sp-menu';m.setAttribute('role','dialog');m.setAttribute('aria-label','Filtro da coluna '+nomeCol(c));
    m.innerHTML='<div class="sp-menu-tit">'+h(nomeCol(c))+'</div>'+
      '<button type="button" class="sp-op" data-ord="asc">Ordenar de A a Z ↑</button><button type="button" class="sp-op" data-ord="desc">Ordenar de Z a A ↓</button>'+
      (ocultavel(c)?'<button type="button" class="sp-op" data-ocultar>Ocultar esta coluna</button>':'')+
      '<div class="sp-sep"></div><div class="sp-rapidos"><button type="button" class="sp-op" data-so="vazias">Só as vazias</button><button type="button" class="sp-op" data-so="preenchidas">Só as preenchidas</button></div><input type="search" class="sp-busca" placeholder="Pesquisar">'+
      '<label class="sp-item sp-todos"><input type="checkbox" data-todos> <b>(Selecionar tudo)</b></label>'+
      '<div class="sp-lista">'+itens.map(function(i){return '<label class="sp-item"><input type="checkbox" value="'+h(i.k)+'"'+(!atual||atual.has(i.k)?' checked':'')+'> <span>'+h(i.t)+'</span><em>'+i.n+'</em></label>';}).join('')+'</div>'+
      '<div class="sp-menu-acoes"><button type="button" class="btn-secondary sp-limpar">Limpar filtro</button><button type="button" class="btn-primary sp-ok">OK</button></div>';
    document.body.appendChild(m);menuAberto=m;
    var r=ancora.getBoundingClientRect(),w=Math.min(300,window.innerWidth-16);
    m.style.width=w+'px';m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-w-8))+'px';m.style.top=Math.min(r.bottom+4,window.innerHeight-60)+'px';
    var checks=function(){return Array.from(m.querySelectorAll('.sp-lista input'));};
    var todos=m.querySelector('[data-todos]');
    var sincTodos=function(){var vis=checks().filter(function(i){return !i.closest('label').hidden;});todos.checked=vis.length&&vis.every(function(i){return i.checked;});};
    sincTodos();
    todos.onchange=function(){checks().forEach(function(i){if(!i.closest('label').hidden)i.checked=todos.checked;});};
    m.querySelector('.sp-lista').onchange=sincTodos;
    m.querySelector('.sp-busca').oninput=function(){var q=norm(this.value);checks().forEach(function(i){var l=i.closest('label');l.hidden=q&&norm(l.textContent).indexOf(q)===-1;});sincTodos();};
    m.querySelectorAll('[data-so]').forEach(function(b){b.onclick=function(){var vaz=b.dataset.so==='vazias';filtros[c.id]=new Set(itens.filter(function(i){return vaz?i.k===VAZIO:i.k!==VAZIO;}).map(function(i){return i.k;}));if(!filtros[c.id].size&&vaz)filtros[c.id]=new Set([VAZIO]);fecharMenu();aplicar();};});
    m.querySelectorAll('[data-ord]').forEach(function(b){b.onclick=function(){ordem={coluna:c.id,direcao:b.dataset.ord};fecharMenu();aplicar();};});
    var oc=m.querySelector('[data-ocultar]');if(oc)oc.onclick=function(){ocultas[c.id]=true;delete filtros[c.id];fecharMenu();aplicar();};
    m.querySelector('.sp-limpar').onclick=function(){delete filtros[c.id];if(ordem&&ordem.coluna===c.id)ordem=null;fecharMenu();aplicar();};
    m.querySelector('.sp-ok').onclick=function(){
      var busca=m.querySelector('.sp-busca').value.trim();
      var marcados=checks().filter(function(i){return i.checked&&(!busca||!i.closest('label').hidden);}).map(function(i){return i.value;});
      if(marcados.length===checks().length&&!busca)delete filtros[c.id];else filtros[c.id]=new Set(marcados);
      fecharMenu();aplicar();
    };
    m.querySelector('.sp-busca').focus();
    if(!(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches)m.animate([{opacity:0,transform:'translateY(-6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,1.4,.4,1)'});
  }
  function ocultavel(c){return c.campo_sistema!=='pessoa.nome';}
  function processoNoEscopoSemPlanilha(p){var antes=pronta;pronta=false;try{return processoNoEscopo(p);}finally{pronta=antes;}}
  function aplicar(){guardar();state.page=1;renderBarra();if(typeof renderTagsAtivas==='function')renderTagsAtivas();if(state.view==='lista')renderLista();else renderKanban();if(typeof atualizarContagem==='function')atualizarContagem();}

  // ---------- máscaras e listas padrão (o usuário nunca digita pontos, traços ou barras) ----------
  var UFS=['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  function soDigitos(v){return String(v==null?'':v).replace(/\D/g,'');}
  function porPadrao(d,pad){var r='',i=0;for(var k=0;k<pad.length&&i<d.length;k++){if(pad[k]==='#')r+=d[i++];else r+=pad[k];}return r;}
  function formatar(tipo,v){
    var d=soDigitos(v);
    switch(tipo){
      case 'cpf':return d.length>11?porPadrao(d.slice(0,14),'##.###.###/####-##'):porPadrao(d,'###.###.###-##');
      case 'cnj':return porPadrao(d.slice(0,20),'#######-##.####.#.##.####');
      case 'tel':return d.length>10?porPadrao(d.slice(0,11),'(##) #####-####'):porPadrao(d,'(##) ####-####');
      case 'moeda':if(!d)return '';return (parseInt(d,10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      case 'pct':return String(v==null?'':v).replace(/[^\d,]/g,'').replace(/,(?=.*,)/g,'');
    }
    return v;
  }
  function tipoMascara(c){
    if(c.campo_sistema==='pessoa.cpf')return 'cpf';
    if(c.campo_sistema==='processo.numero')return 'cnj';
    if(c.campo_sistema==='pessoa.telefone')return 'tel';
    if(c.tipo==='moeda')return 'moeda';
    if(c.tipo==='porcentagem'||c.tipo==='numero')return 'pct';
    return null;
  }
  // Honorários (sucumbenciais, totais e partes): guardados em % do valor da causa, mas dá para digitar em R$
  // (o botão ao lado alterna % / R$; em R$ o sistema converte para % do valor da causa)
  function ehHonorario(c){return c&&c.tipo==='porcentagem'&&(/sucumb/i.test(c.nome||'')||/^hon_/.test(c.chave||''));}
  function campoHonorario(v,causaFn){
    var wrap=document.createElement('span');wrap.className='sp-hon';
    var inp=document.createElement('input');inp.type='text';inp.className='sp-editor';inp.inputMode='decimal';
    var bt=document.createElement('button');bt.type='button';bt.className='sp-hon-modo';
    var dica=document.createElement('span');dica.className='sp-hon-dica';
    var modo='pct',orig=null; // orig: o % de onde veio o R$ mostrado (trocar de modo sem mexer não muda o valor)
    var causa=function(){var n=Number(causaFn?causaFn():null);return n>0?n:null;};
    var moedaTxt=function(n){return formatar('moeda',Number(n).toFixed(2));};
    var pctTxt=function(n){return String(Math.round(Number(n)*1000000)/1000000).replace('.',',');};
    var lerNum=function(){var t=inp.value.trim();if(!t)return null;var n=modo==='reais'?parseFloat(t.replace(/\./g,'').replace(',','.')):parseFloat(t.replace('%','').replace(',','.'));return isNaN(n)?null:n;};
    function desenhar(){bt.textContent=modo==='reais'?'R$':'%';bt.title=modo==='reais'?'Digitando em reais: clique para digitar em percentual':'Digitando em percentual: clique para digitar em reais';
      inp.placeholder=modo==='reais'?'0,00':'0';
      var n=lerNum(),c=causa();dica.textContent=n==null||!c?'':(modo==='reais'?'= '+String(Math.round((orig&&orig.txt===inp.value?orig.pct:n/c*100)*100)/100).replace('.',',')+'% da causa':'= R$ '+moedaTxt(c*n/100));}
    inp.value=v==null||v===''?'':String(v).replace('.',',');
    inp.addEventListener('input',function(){var fimAntes=inp.value.length-inp.selectionEnd;inp.value=formatar(modo==='reais'?'moeda':'pct',inp.value);var pos=Math.max(0,inp.value.length-fimAntes);try{inp.setSelectionRange(pos,pos);}catch(e){}desenhar();});
    // mousedown sem tirar o foco: assim a célula não salva ao clicar no botão
    bt.addEventListener('mousedown',function(e){e.preventDefault();});
    bt.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();
      var n=lerNum(),c=causa();
      if(modo==='pct'){if(!c){aviso('Para digitar em R$, preencha antes o valor da causa.',true);return;}modo='reais';inp.value=n==null?'':moedaTxt(c*n/100);orig=n==null?null:{pct:n,txt:inp.value};}
      else{modo='pct';inp.value=n==null||!c?'':pctTxt(orig&&orig.txt===inp.value?orig.pct:n/c*100);orig=null;}
      desenhar();inp.focus();});
    wrap.appendChild(inp);wrap.appendChild(bt);wrap.appendChild(dica);desenhar();
    var ler=function(){var n=lerNum();if(n==null)return null;
      if(modo==='reais'){var c=causa();if(!c)throw new Error('Para digitar em R$, preencha antes o valor da causa.');n=orig&&orig.txt===inp.value?orig.pct:n/c*100;}
      if(n<0||n>100)throw new Error('O percentual deve ficar entre 0 e 100% do valor da causa.');
      return pctTxt(n);};
    return {wrap:wrap,input:inp,ler:ler};
  }
  function aplicarMascara(inp,c,v){
    var t=tipoMascara(c);if(!t)return;
    inp.inputMode=t==='pct'?'decimal':'numeric';
    if(t==='moeda')inp.value=v==null||v===''?'':formatar('moeda',Number(v).toFixed(2));
    else if(t==='pct')inp.value=v==null?'':String(v).replace('.',',');
    else inp.value=formatar(t,v==null?'':v);
    inp.placeholder={cpf:'000.000.000-00',cnj:'0000000-00.0000.0.00.0000',tel:'(00) 00000-0000',moeda:'0,00',pct:'0'}[t]||'';
    inp.addEventListener('input',function(){var fimAntes=inp.value.length-inp.selectionEnd;inp.value=formatar(t,inp.value);var pos=Math.max(0,inp.value.length-fimAntes);try{inp.setSelectionRange(pos,pos);}catch(e){}});
  }
  // Texto mostrado de CPF, processo e telefone sempre com a pontuação certa
  function exibir(c,t){var m=tipoMascara(c);if(t&&(m==='cpf'||m==='cnj'||m==='tel'))return formatar(m,t);return t;}

  // ---------- editor da célula (planilha e ficha) ----------
  // cfg: {c, v, texto, opcoes: async()=>[{id,nome}]|null, podeNova, gravar: async(valor), depois()}
  async function editarCelula(td,cfg){
    if(editando)return;
    editando=true;var antes=td.innerHTML,c=cfg.c,v=cfg.v;
    var terminar=function(){editando=false;};
    try{
      var ops=cfg.opcoes?await cfg.opcoes():null,campo,ler;
      if(ops){
        campo=document.createElement('select');
        campo.innerHTML='<option value="">— vazio —</option>'+ops.map(function(o){return '<option value="'+h(o.id)+'">'+h(o.nome)+'</option>';}).join('')+(cfg.podeNova?'<option value="__nova">+ Nova opção...</option>':'');
        if(v!=null&&v!==''&&!ops.some(function(o){return String(o.id)===String(v);})){var op=new Option((cfg.texto||String(v))+' (desativada)',v);op.disabled=true;campo.add(op,1);}
        campo.value=v==null?'':String(v);
        ler=function(){return campo.value||null;};
      }else if(c.tipo==='sim_nao'){
        campo=document.createElement('select');campo.innerHTML='<option value="">— vazio —</option><option value="true">Sim</option><option value="false">Não</option>';
        campo.value=v===true||v==='true'?'true':v===false||v==='false'?'false':'';ler=function(){return campo.value===''?null:campo.value==='true';};
      }else if(c.tipo==='link'){
        campo=document.createElement('input');campo.type='url';campo.placeholder='https://...';campo.value=Array.isArray(v)&&v[0]?v[0].url:'';
        ler=function(){var u=campo.value.trim();if(!u)return null;if(!/^https?:\/\//i.test(u))throw new Error('O link precisa começar com https://');var t=Array.isArray(v)&&v[0]&&v[0].texto&&v[0].texto!==v[0].url?v[0].texto:u;return [{url:u,texto:t}];};
      }else if(ehHonorario(c)){
        var hc=campoHonorario(v,cfg.causa);campo=hc.input;ler=hc.ler;var caixa=hc.wrap;
      }else{
        campo=document.createElement('input');campo.type=c.tipo==='data'?'date':'text';
        campo.value=v==null?'':(c.tipo==='data'?String(v).slice(0,10):String(v));
        aplicarMascara(campo,c,v);
        ler=function(){var x=campo.value.trim();if(!x)return null;var m=tipoMascara(c);return m==='cpf'||m==='cnj'||m==='tel'?formatar(m,x):x;};
      }
      campo.className='sp-editor';td.innerHTML='';td.appendChild(caixa||campo);campo.focus();if(campo.tagName==='INPUT'&&campo.type==='text'&&campo.select)campo.select();
      var feito=false,tecla=null,fim=function(){if(cfg.fim)try{cfg.fim(tecla);}catch(x){}};
      var cancelar=function(){if(feito)return;feito=true;terminar();td.innerHTML=antes;fim();};
      var salvar=async function(){
        if(feito)return;
        if(campo.value==='__nova'){
          feito=true;var inp=document.createElement('input');inp.type='text';inp.className='sp-editor';inp.placeholder='Nome da nova opção';td.innerHTML='';td.appendChild(inp);inp.focus();
          var pronto=false;
          var criar=async function(){if(pronto)return;pronto=true;var nome=inp.value.trim();if(!nome){terminar();td.innerHTML=antes;return;}
            td.classList.add('sp-salvando');
            try{
              if(cfg.criarOpcao){var idNovo=await cfg.criarOpcao(nome);await cfg.gravar(idNovo,c);aviso('Opção "'+h(nome)+'" criada.');}
              else{var lista=(c.opcoes||[]).map(function(o){return {id:o.id,nome:o.nome,cor:o.cor,ativo:o.ativo!==false};}).concat([{nome:nome}]);
              await rpcOk('lista_coluna_salvar',{p_id:c.id,p_nome:c.nome,p_opcoes:lista});await carregarColunas();
              var c2=cols.find(function(x){return x.id===c.id;});var nova=(c2.opcoes||[]).find(function(o){return norm(o.nome)===norm(nome);});
              await cfg.gravar(nova?nova.id:null,c2);aviso('Opção "'+h(nome)+'" criada.');}}
            catch(e){aviso(h(e.message||'Não foi possível salvar.'),true);}
            terminar();cfg.depois();};
          inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();criar();}else if(e.key==='Escape'){pronto=true;terminar();td.innerHTML=antes;}});
          inp.addEventListener('blur',function(){setTimeout(criar,0);});
          return;
        }
        var novo;try{novo=ler();}catch(e){aviso(h(e.message),true);return;}
        feito=true;
        if(JSON.stringify(novo==null?null:novo)===JSON.stringify(v==null||v===''?null:v)){terminar();td.innerHTML=antes;fim();return;}
        td.classList.add('sp-salvando');
        try{await cfg.gravar(novo,c);}catch(e){aviso(h(e.message||'Não foi possível salvar.'),true);}
        terminar();cfg.depois();fim();
      };
      campo.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();cancelar();}else if(e.key==='Enter'){e.preventDefault();tecla='Enter';salvar();}else if(e.key==='Tab'){e.preventDefault();tecla=e.shiftKey?'ShiftTab':'Tab';salvar();}});
      campo.addEventListener('blur',function(){setTimeout(salvar,0);});
      if(campo.tagName==='SELECT')campo.addEventListener('change',function(){salvar();});
    }catch(e){terminar();td.innerHTML=antes;aviso(h(e.message||'Erro.'),true);}
  }
  function aviso(msg,erro){
    if(typeof showToast!=='function')return;
    var naFicha=!!document.getElementById('toastArea');
    showToast(msg,erro?(naFicha?'error':'danger'):'success');
  }

  // ---------- edição na planilha ----------
  async function opcoesDe(c){
    if(c.campo_sistema==='pessoa.uf')return UFS.map(function(u){return {id:u,nome:u};});
    if(c.campo_sistema==='processo.status')return (state.statusList||[]).filter(function(s){return (s.fase||'')===FASE_FIXA;}).map(function(s){return {id:s.id,nome:s.nome};});
    if(c.campo_sistema==='processo.tese')return (state.teses||[]).filter(function(t){return t.ativo!==false;}).map(function(t){return {id:t.id,nome:t.nome};});
    if(c.campo_sistema==='processo.area'){try{return (catalogoTeses.todasAreas()||[]).filter(function(a){return a.ativo!==false;}).map(function(a){return {id:a.id,nome:a.nome};});}catch(e){return [];}}
    if(c.campo_sistema==='processo.situacao_acao')return situacoes.filter(function(s){return s.ativo!==false;}).map(function(s){return {id:s.id,nome:s.nome};});
    if(c.campo_sistema==='pessoa.situacao_vital')return [{id:'vivo',nome:'Vivo'},{id:'falecido',nome:'Falecido'}];
    if(c.tipo==='usuario')return (state.responsaveis||[]).map(function(u){return {id:u.id,nome:u.nome_completo};});
    if(c.tipo==='opcao')return opcoesDaColuna(c);
    return null;
  }
  function opcoesDaColuna(c){return (c.opcoes||[]).filter(function(o){return o.ativo!==false;}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);}).map(function(o){return {id:o.id,nome:o.nome};});}
  async function editar(td){
    var p=processo(td.closest('tr').dataset.spProc),c=cols.find(function(x){return x.id===td.dataset.spCel;});
    if(!p||!c||!editavel(p,c))return;
    var criar=criadorDeOpcao(c,p);
    await editarCelula(td,{c:c,v:bruto(p,c),texto:texto(p,c),opcoes:function(){return opcoesDe(c);},
      podeNova:(c.tipo==='opcao'&&!c.campo_sistema&&SagaPlanilha._gerenciar)||!!criar,criarOpcao:criar,
      gravar:function(valor,cc){return gravar(p,cc||c,valor);},depois:redesenhar,fim:aposEditar,causa:function(){return p.valor_causa;}});
  }
  // "+ Nova opção" nas colunas do sistema: cria no cadastro próprio (tipo de ação, área, situação, status) e já escolhe na célula
  function criadorDeOpcao(c,p){
    var adm=!!state.admin;
    if(c.campo_sistema==='processo.tese'&&adm)return async function(nome){
      var id=await rpcOk('tese_salvar',{p_id:null,p_nome:nome,p_area_id:p.area_direito_id||null,p_ativo:true,p_ordem:null});
      try{await catalogoTeses.carregar();state.teses=catalogoTeses.todasTeses();state.todasTeses=state.teses;if(typeof renderDropdownsTeses==='function')renderDropdownsTeses();}catch(e){}
      return id;};
    if(c.campo_sistema==='processo.area'&&adm)return async function(nome){
      var id=await rpcOk('area_direito_salvar',{p_id:null,p_nome:nome,p_ativo:true,p_ordem:null});
      try{await catalogoTeses.carregar();}catch(e){}renderAbas();return id;};
    if(c.campo_sistema==='processo.situacao_acao'&&adm)return async function(nome){
      var id=await rpcOk('catalogo_salvar',{p_categoria:'situacao_acao',p_id:null,p_nome:nome,p_cor:'#7da0ca',p_ativo:true,p_conta_protocolada:false});
      var r=await _sb.from('etiquetas_catalogo').select('id,nome,cor,ativo,ordem,conta_protocolada').eq('categoria','situacao_acao').order('ordem');if(!r.error)situacoes=r.data||[];
      return id;};
    if(c.campo_sistema==='processo.status'&&(adm||state.podeGerenciarColunas))return async function(nome){
      var lista=state.statusList||[],ordem=lista.reduce(function(m,s){return Math.max(m,s.ordem||0);},0)+1;
      var r=await _sb.from('status_funil').insert({nome:nome,cor:'#7da0ca',fase:FASE_FIXA,ordem:ordem,ativo:true}).select('id,nome,cor,fase,ordem,etapa').single();
      if(r.error)throw new Error('Não foi possível criar o status. Verifique suas permissões.');
      lista.push(r.data);if(typeof renderDropdownsStatus==='function')renderDropdownsStatus();return r.data.id;};
    return null;
  }
  async function rpcOk(n,a){var r=await _sb.rpc(n,a);if(r.error)throw r.error;return r.data;}
  async function gravar(p,c,valor){
    var r=await rpcOk('lista_salvar_celula',{p_processo_id:p.id,p_coluna_id:c.id,p_valor:valor});
    // Atualiza a linha na tela sem recarregar tudo
    if(!c.campo_sistema){p.campos=p.campos||{};if(r==null)delete p.campos[c.id];else p.campos[c.id]=r;return;}
    var pe=p.pessoa=p.pessoa||{};
    switch(c.campo_sistema){
      case 'pessoa.nome':pe.nome_completo=r;break;case 'pessoa.cpf':pe.cpf=r;break;case 'pessoa.uf':pe.uf=r;break;
      case 'pessoa.situacao_vital':pe.situacao_vital=r;break;case 'pessoa.telefone':pe.telefone_whatsapp=r;break;case 'pessoa.email':pe.email=r;break;
      case 'processo.numero':p.numero_processo_cnj=r;break;case 'processo.area':p.area_direito_id=r;break;
      case 'processo.tese':p.tese_id=r;p.tese=(state.teses||[]).find(function(t){return String(t.id)===String(r);})||p.tese;break;
      case 'processo.status':p.status_id=r;p.status=(state.statusList||[]).find(function(s){return String(s.id)===String(r);})||p.status;break;
      case 'processo.responsavel':p.responsavel_id=r;p.responsavel={id:r,nome_completo:nomeUsuario(r)};break;
      case 'processo.captador':p.captador_id=r;break;case 'processo.situacao_acao':p.situacao_acao_id=r;break;
      case 'processo.valor_causa':p.valor_causa=r;break;case 'processo.valor_precatorio':p.valor_precatorio_origem=r;break;
      case 'processo.ultima_movimentacao':p.ultima_movimentacao_em=r;break;
    }
    if(typeof invalidarBaseProcessos==='function'){var base=state.baseProcessos;invalidarBaseProcessos();state.baseProcessos=base;}
  }

  // ---------- escolher colunas ----------
  function escolherColunas(){
    fecharMenu();
    var cs=colunasDaTela();
    var ov=document.createElement('div');ov.className='modal-overlay sp-ov';ov.style.display='flex';
    ov.innerHTML='<div class="modal sp-modal" role="dialog" aria-modal="true" aria-label="Colunas da lista"><div class="modal-head"><h3>Colunas da lista</h3><button class="modal-close" type="button" data-fechar>×</button></div>'+
      '<div class="modal-body"><p class="sp-ajuda">Mesma ordem da planilha do escritório. Marque as colunas que quer ver; vale só para você.</p>'+
      '<div class="sp-col-acoes"><button type="button" class="btn-secondary" data-todas>Mostrar todas</button><button type="button" class="btn-secondary" data-poucas>Só as principais</button><button type="button" class="btn-secondary" data-larg title="Volta todas as colunas à largura automática">Larguras originais</button></div>'+
      '<div class="sp-col-lista">'+cs.map(function(c){return '<label class="sp-item"><input type="checkbox" value="'+h(c.id)+'"'+(ocultas[c.id]?'':' checked')+(ocultavel(c)?'':' disabled')+'> <span>'+h(nomeCol(c))+'</span></label>';}).join('')+'</div>'+
      (SagaPlanilha._gerenciar?'<p class="sp-ajuda">Criar, renomear ou remover colunas do escritório e as opções de cada uma: em breve aqui; por enquanto, peça ao Claude.</p>':'')+
      '</div><div class="modal-foot"><button type="button" class="btn-primary" data-ok>Aplicar</button></div></div>';
    document.body.appendChild(ov);
    var fechar=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-fechar]'))fechar();});
    var PRINCIPAIS=['processo.numero','pessoa.nome','pessoa.cpf','processo.area','processo.tese','processo.status','processo.responsavel','processo.situacao_acao','processo.ultima_movimentacao','processo.captador'];
    ov.querySelector('[data-larg]').onclick=function(){larguraPadrao();aviso('Larguras das colunas voltaram ao original.');};
    ov.querySelector('[data-todas]').onclick=function(){ov.querySelectorAll('.sp-col-lista input').forEach(function(i){i.checked=true;});};
    ov.querySelector('[data-poucas]').onclick=function(){ov.querySelectorAll('.sp-col-lista input').forEach(function(i){var c=cols.find(function(x){return x.id===i.value;});i.checked=!ocultavel(c)||PRINCIPAIS.indexOf(c.campo_sistema)!==-1||/status da peti|tipo de a|compet/i.test(norm(c.nome));});};
    ov.querySelector('[data-ok]').onclick=function(){ocultas={};ov.querySelectorAll('.sp-col-lista input').forEach(function(i){if(!i.checked)ocultas[i.value]=true;});Object.keys(filtros).forEach(function(k){if(ocultas[k])delete filtros[k];});fechar();aplicar();};
  }

  // ---------- barra (protocolados, colunas, filtros ativos) ----------
  function renderBarra(){
    renderAbas();
    var b=document.getElementById('spBarra');if(!b)return;
    var n=Object.keys(filtros).length+(ordem?1:0);
    var capt=FASE_FIXA==='captacao';
    b.innerHTML=(capt?'<div class="sp-pills" role="group" aria-label="Data de retorno">'+[['','Todos os retornos'],['hoje','Retorno hoje'],['atrasados','Atrasados'],['semana','Próximos 7 dias']].map(function(o){return '<button type="button" class="sp-pill'+(retorno===o[0]?' ativo':'')+'" data-retorno="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>'+
        '<button type="button" class="sp-pill sp-pill-solta'+(minhas?' ativo':'')+'" data-minhas aria-pressed="'+minhas+'">Minhas fichas</button>'+
        '<button type="button" class="btn-secondary sp-btn" data-importar>Importar planilha</button><button type="button" class="btn-secondary sp-btn" data-distribuir>Distribuir fichas</button>':
      '<div class="sp-pills" role="group" aria-label="Protocolo">'+[['','Todos'],['sim','Protocolados'],['nao','Não protocolados']].map(function(o){return '<button type="button" class="sp-pill'+(protocolo===o[0]?' ativo':'')+'" data-protocolo="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>')+
      '<div class="sp-pills sp-modo-cel" role="group" aria-label="Como mostrar no celular"><button type="button" class="sp-pill'+(verTabelaNoCelular()?' ativo':'')+'" data-modo="tabela">Planilha</button><button type="button" class="sp-pill'+(verTabelaNoCelular()?'':' ativo')+'" data-modo="cartoes">Cartões</button></div>'+
      '<button type="button" class="btn-secondary sp-btn" data-colunas>Colunas</button>'+
      (n?'<button type="button" class="sp-limpar-tudo" data-limpar>Limpar filtros das colunas ('+n+')</button>':'');
    b.querySelectorAll('[data-protocolo]').forEach(function(x){x.onclick=function(){protocolo=x.dataset.protocolo;aplicar();};});
    b.querySelector('[data-colunas]').onclick=escolherColunas;
    b.querySelectorAll('[data-modo]').forEach(function(x){x.onclick=function(){try{localStorage.setItem(CHAVE_CEL(),x.dataset.modo);}catch(e){}aplicarModoCelular();renderBarra();};});
    aplicarModoCelular();
    b.querySelectorAll('[data-retorno]').forEach(function(x){x.onclick=function(){retorno=x.dataset.retorno;aplicar();};});
    var bm=b.querySelector('[data-minhas]');if(bm)bm.onclick=function(){minhas=!minhas;aplicar();};
    var bi=b.querySelector('[data-importar]');if(bi)bi.onclick=abrirImportar;
    var bd=b.querySelector('[data-distribuir]');if(bd)bd.onclick=abrirDistribuir;
    var l=b.querySelector('[data-limpar]');if(l)l.onclick=function(){filtros={};ordem=null;aplicar();};
  }
  // ---------- abas por área do direito, botões das teses da área e menu de tipo de ação ----------
  function renderAbas(){
    var w=document.getElementById('spAbas');if(!w||typeof catalogoTeses==='undefined')return;
    var areas=[];try{areas=(catalogoTeses.todasAreas()||[]).filter(function(a){return a.ativo!==false;});}catch(e){}
    var atual=state.filtroArea,teses=[];
    try{teses=(catalogoTeses.todasTeses()||[]).filter(function(t){return t.ativo!==false&&(atual==='*'?false:(t.area_direito_id||null)===(atual||null));});}catch(e){}
    var teseAtual=state.filtroTese&&state.filtroTese.id;
    var tipo=cols.find(function(c){return c.nome==='Tipo de ação'&&!c.campo_sistema;}),tipoSel=tipo&&filtros[tipo.id]&&filtros[tipo.id].size===1?Array.from(filtros[tipo.id])[0]:'';
    w.innerHTML='<div class="sp-abas" role="tablist" aria-label="Área do direito">'+
      [{id:'*',nome:'Todas as áreas'}].concat(areas).concat([{id:null,nome:'Sem área'}]).map(function(a){var at=(a.id===atual)||(a.id===null&&atual===null);return '<button type="button" role="tab" aria-selected="'+at+'" class="sp-aba'+(at?' ativo':'')+'" data-area="'+(a.id===null?'__sem':h(a.id))+'">'+h(a.nome)+'</button>';}).join('')+'</div>'+
      '<div class="sp-sub">'+(atual!=='*'&&teses.length?'<div class="sp-pills sp-teses" role="group" aria-label="Tipo de ação"><button type="button" class="sp-pill'+(!teseAtual?' ativo':'')+'" data-tese="">Todos os tipos de ação</button>'+teses.map(function(t){return '<button type="button" class="sp-pill'+(teseAtual===t.id?' ativo':'')+'" data-tese="'+h(t.id)+'">'+h(t.nome)+'</button>';}).join('')+'</div>':'')+
      (tipo?'<label class="sp-tipo">Tipo de ação <select data-tipo><option value="">Todos</option>'+opcoesDaColuna(tipo).map(function(o){return '<option value="'+h(o.id)+'"'+(String(o.id)===String(tipoSel)?' selected':'')+'>'+h(o.nome)+'</option>';}).join('')+'</select></label>':'')+(state.admin?'<a class="sp-org" href="configuracoes_padrao_metalico.html?aba=areas-teses">Organizar áreas e tipos de ação</a>':'')+'</div>';
    w.querySelectorAll('[data-area]').forEach(function(b){b.onclick=function(){var v=b.dataset.area;state.filtroArea=v==='*'?'*':v==='__sem'?null:v;state.filtroTese=null;
      try{localStorage.setItem('saga-planilha-area-'+FASE_FIXA,JSON.stringify(state.filtroArea));}catch(e){}
      if(typeof renderDropdownsTeses==='function')renderDropdownsTeses();renderAbas();aplicarFiltros();};});
    w.querySelectorAll('[data-tese]').forEach(function(b){b.onclick=function(){state.filtroTese=b.dataset.tese?catalogoTeses.tese(b.dataset.tese):null;if(typeof renderDropdownsTeses==='function')renderDropdownsTeses();renderAbas();aplicarFiltros();};});
    var st=w.querySelector('[data-tipo]');if(st)st.onchange=function(){if(st.value)filtros[tipo.id]=new Set([st.value]);else delete filtros[tipo.id];aplicar();};
  }
  function limpar(){filtros={};ordem=null;protocolo='';retorno='';minhas=false;guardar();renderBarra();}

  function estilos(){
    if(document.getElementById('spEstilo'))return;
    var st=document.createElement('style');st.id='spEstilo';st.textContent=
      '.sp-tabela{min-width:max-content}.sp-tabela th{padding:0;position:sticky;top:0;z-index:2;background:var(--panel)}'+
      '.sp-th{display:flex;align-items:center;gap:6px;width:100%;padding:13px 14px;border:0;background:none;color:inherit;font:inherit;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;white-space:nowrap;text-align:left}'+
      '.sp-th:hover,.sp-th.ativo{color:var(--gold-light)}.sp-funil{opacity:.7;font-size:10px}.sp-th:active{transform:scale(.97)}'+
      '.sp-tabela td{max-width:260px;overflow:hidden;text-overflow:ellipsis}.sp-tabela td.sp-editavel{cursor:cell}.sp-tabela td.sp-editavel:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 35%,transparent)}'+
      '.sp-tabela td.sp-salvando{opacity:.5}.sp-vazio{color:var(--muted)}.sp-link{color:var(--gold-light);text-decoration:underline}.sp-link-ficha{cursor:pointer}.sp-link-ficha:hover{text-decoration:underline}'+
      '.sp-hon{display:flex;align-items:center;gap:4px;min-width:170px}.sp-hon .sp-editor{min-width:0;flex:1}.sp-hon-modo{flex:0 0 auto;height:28px;min-width:34px;padding:0 6px;border-radius:7px;border:1px solid color-mix(in srgb,var(--gold) 45%,var(--border-soft));background:color-mix(in srgb,var(--gold) 10%,transparent);color:var(--text);font:inherit;font-size:11px;font-weight:600;cursor:pointer}.sp-hon-modo:hover{border-color:var(--gold)}.sp-hon-dica{flex:0 0 auto;font-size:10px;color:var(--muted);white-space:nowrap}'+
      '.sp-editor{width:100%;min-width:140px;background:var(--panel);color:var(--text);border:1px solid var(--gold);border-radius:7px;padding:6px 8px;font:inherit;font-size:12px}'+
      '.sp-menu{position:fixed;z-index:3000;background:var(--panel-solid,var(--panel));border:1px solid var(--border);border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.35);padding:10px;max-height:min(480px,80vh);display:flex;flex-direction:column;gap:4px;backdrop-filter:blur(16px)}'+
      '.sp-menu-tit{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;padding:2px 4px 6px}'+
      '.sp-op{text-align:left;border:0;background:none;color:var(--text);font:inherit;font-size:12px;padding:7px 8px;border-radius:7px;cursor:pointer}.sp-op:hover{background:color-mix(in srgb,var(--gold) 12%,transparent)}'+
      '.sp-sep{height:1px;background:var(--border-soft);margin:4px 0}.sp-busca{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 9px;font:inherit;font-size:12px}'+
      '.sp-lista{overflow:auto;max-height:220px;display:flex;flex-direction:column;overscroll-behavior:contain}.sp-item{display:flex;align-items:center;gap:7px;font-size:12px;padding:5px 6px;border-radius:6px;cursor:pointer}.sp-item:hover{background:color-mix(in srgb,var(--text) 5%,transparent)}.sp-item span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-item em{font-style:normal;color:var(--muted);font-size:10.5px}.sp-item[hidden]{display:none}'+
      '.sp-menu-acoes{display:flex;justify-content:flex-end;gap:6px;margin-top:6px}'+
      '#spBarra{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}.sp-pills{display:flex;gap:4px;background:var(--panel);border:1px solid var(--border-soft);border-radius:9px;padding:3px}'+
      '.sp-pill{border:0;background:none;color:var(--muted);font:inherit;font-size:11.5px;font-weight:600;padding:6px 11px;border-radius:7px;cursor:pointer}.sp-pill.ativo{background:var(--gold);color:#fff}.sp-pill:active{transform:scale(.96)}'+
      '.sp-limpar-tudo{border:0;background:none;color:var(--gold-light);font:inherit;font-size:11.5px;text-decoration:underline;cursor:pointer}'+
      '.sp-modal.sp-modal-larga{max-width:860px}.sp-colar{width:100%;min-height:110px;resize:vertical;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:10px;font:inherit;font-size:12px}'+
      '.sp-imp-linha{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}.sp-imp-linha select,.sp-imp-tab select{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:7px;padding:5px 6px;font:inherit;font-size:11.5px;max-width:200px}'+
      '.sp-imp-tab{overflow:auto;max-height:240px;border:1px solid var(--border-soft);border-radius:9px;margin-top:6px}.sp-imp-tab table{min-width:0;width:max-content}.sp-imp-tab th,.sp-imp-tab td{padding:6px 9px;font-size:11.5px;text-transform:none;letter-spacing:0}.sp-imp-orig{color:var(--muted);font-size:10.5px;margin-bottom:4px}'+
      '.sp-imp-resumo{margin-top:10px;font-size:12.5px}.sp-erro{color:var(--danger,#e5484d)}.sp-alerta{color:var(--warning,#e0a93b)}.sp-imp-erros{font-size:11.5px;color:var(--muted);margin:6px 0 0 18px}.sp-arquivo{cursor:pointer;display:inline-flex;align-items:center}'+
      '.sp-dist-bloco{margin-bottom:12px}.sp-dist-tit{font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px}.sp-dist-pessoas{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:2px;max-height:180px;overflow:auto}.sp-bloco{width:64px;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:3px 6px;font:inherit}.sp-dist-previa{font-size:12.5px;padding:8px 0}'+
      '.sp-funil .coluna-kanban{flex:0 0 280px}.sp-pct{font-size:10.5px;color:var(--muted);margin-left:4px}.sp-funil-barra{height:3px;margin:0 14px 8px;background:var(--border-soft);border-radius:2px;overflow:hidden}.sp-funil-barra i{display:block;height:100%;border-radius:2px;transition:width .6s cubic-bezier(.2,1,.3,1)}'+
      '.sp-card-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin:4px 0}.sp-card-status i{width:7px;height:7px;border-radius:50%;flex:0 0 auto}.sp-card-linha{font-size:11.5px;margin:3px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.sp-ret{font-weight:600}.sp-ret.atrasado{color:var(--danger,#e5484d)}.sp-ret.hoje{color:var(--warning,#e0a93b)}.sp-card-valor{font-size:12px;font-weight:700;color:var(--gold-light);margin:4px 0}.sp-card-cap{font-size:11px;color:var(--muted)}'+
      '.sp-pill-solta{border:1px solid var(--border-soft);background:var(--panel)}'+
      '#spAbas{margin:0 0 12px}.sp-abas{display:flex;gap:2px;overflow-x:auto;border-bottom:1px solid var(--border-soft);scrollbar-width:thin}.sp-aba{border:0;background:none;color:var(--muted);font:inherit;font-size:12.5px;font-weight:600;padding:10px 14px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:color .2s,border-color .25s}'+
      '.sp-aba:hover{color:var(--text)}.sp-aba.ativo{color:var(--gold-light);border-bottom-color:var(--gold)}.sp-aba:active{transform:scale(.97)}'+
      '.sp-org{margin-left:auto;font-size:11.5px;color:var(--gold-light);text-decoration:underline}.sp-sub{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}.sp-teses{flex-wrap:wrap}.sp-tipo{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted)}.sp-tipo select{background:var(--panel);color:var(--text);border:1px solid var(--border-soft);border-radius:8px;padding:6px 8px;font:inherit;font-size:12px;max-width:240px}'+
      '.sp-modal{max-width:520px;width:94vw}.sp-col-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px;max-height:52vh;overflow:auto;margin-top:8px}.sp-ajuda{font-size:11.5px;color:var(--muted);margin:0 0 8px}.sp-col-acoes{display:flex;gap:6px;flex-wrap:wrap}'+
      '#listaView .tabela-scroll{max-height:70vh;overflow:auto}'+
      '.sp-kb-por{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted)}.sp-kb-por select{background:var(--panel);color:var(--text);border:1px solid var(--border-soft);border-radius:9px;padding:7px 9px;font:inherit;font-size:12px;max-width:230px}.sp-kb-por select:focus{border-color:var(--gold);outline:0}'+
      '.sp-kb-padrao{border:0;background:none;color:var(--gold-light);font:inherit;font-size:11.5px;text-decoration:underline;cursor:pointer}'+
      '.sp-kb-filtro{margin-left:auto;border:1px solid var(--border-soft);background:transparent;color:var(--muted);font:inherit;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:8px;cursor:pointer;white-space:nowrap}.sp-kb-filtro:hover,.sp-kb-filtro.ativo{border-color:var(--gold);color:var(--gold-light)}'+
      '.sp-kb .coluna-cabecalho{flex-wrap:wrap;row-gap:6px}.sp-kb .coluna-titulo{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;flex:1 1 120px;min-width:0}.sp-kb-chips{display:flex;flex-wrap:wrap;gap:4px;padding:0 12px 8px}.sp-kb-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 4px 2px 8px;border-radius:999px;background:color-mix(in srgb,var(--gold) 12%,transparent);border:1px solid color-mix(in srgb,var(--gold) 35%,transparent);font-size:10.5px;color:var(--text);max-width:100%}.sp-kb-chip button{border:0;background:none;color:var(--muted);cursor:pointer;font-size:13px;line-height:1;padding:0 3px}'+
      '.sp-kb-limpar{border:0;background:none;color:var(--muted);font:inherit;font-size:10.5px;text-decoration:underline;cursor:pointer}.sp-kb-nada{padding:14px 10px;color:var(--muted);font-size:11.5px;text-align:center}'+
      '.sp-th{min-width:0;overflow:hidden}.sp-th-nome{overflow:hidden;text-overflow:ellipsis;min-width:0}.sp-funil{flex:0 0 auto}'+
      '.sp-redim{position:absolute;top:0;right:-4px;width:9px;height:100%;cursor:col-resize;z-index:3;touch-action:none}'+
      '.sp-redim::after{content:"";position:absolute;top:22%;bottom:22%;left:4px;width:1px;background:var(--border);transition:background .2s,top .2s cubic-bezier(.22,.78,.25,1),bottom .2s cubic-bezier(.22,.78,.25,1)}'+
      '.sp-tabela th:hover .sp-redim::after{background:color-mix(in srgb,var(--gold) 45%,transparent)}.sp-redim:hover::after,.sp-redim.ativo::after{background:var(--gold);top:0;bottom:0;width:2px;left:3.5px}'+
      'body.sp-redimensionando,body.sp-redimensionando *{cursor:col-resize!important;user-select:none!important}'+
      '.sp-tabela .sp-fixa{position:sticky;z-index:1}.sp-tabela thead th.sp-fixa{z-index:4}.sp-tabela tfoot td.sp-fixa{z-index:4}'+
      '.sp-tabela td.sp-fixa{background-clip:padding-box}.sp-tabela thead th.sp-fixa{background:var(--panel-solid,var(--panel))}'+
      '.tabela-scroll.sp-rolado .sp-fixa-ult{box-shadow:8px 0 12px -10px rgba(0,0,0,.55)}'+
      '.sp-tabela td.sp-sel{box-shadow:inset 0 0 0 2px var(--gold)!important;border-radius:3px}'+
      // a cor da linha fica por cima do fundo zebrado do tema (camada de imagem), sem apagar o zebrado
      '.sp-tabela .sp-cruz-l,.sp-tabela .sp-cruz-c{background-image:linear-gradient(color-mix(in srgb,var(--gold) 10%,transparent),color-mix(in srgb,var(--gold) 10%,transparent))!important;transition:background-image .2s cubic-bezier(.22,.78,.25,1)}'+
      '.sp-tabela .sp-cruz-l.sp-cruz-c{background-image:linear-gradient(color-mix(in srgb,var(--gold) 16%,transparent),color-mix(in srgb,var(--gold) 16%,transparent))!important}'+
      '.sp-tabela th.sp-cruz-c .sp-th{color:var(--gold-light)}.sp-tabela th.sp-cruz-c{box-shadow:inset 0 -2px 0 var(--gold)}'+
      '.sp-tabela tfoot td{position:sticky;bottom:0;z-index:2;background:var(--panel-solid,var(--panel));border-top:1px solid var(--border);padding:10px 14px;font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '.sp-tabela tfoot .sp-tot-num{color:var(--gold-light);font-variant-numeric:tabular-nums}.sp-tot-sub{display:block;font-size:9.5px;font-weight:500;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);margin-top:2px}'+
      '.sp-modo-cel{display:none}.sp-cc-topo{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.sp-cc-topo .cartao-nome{font-weight:600;min-width:0;overflow-wrap:anywhere}'+
      '.sp-cc-status{display:inline-flex;align-items:center;gap:5px;flex:0 1 auto;max-width:48%;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:8px;color:var(--text);background:color-mix(in srgb,var(--c) 16%,transparent);border:1px solid color-mix(in srgb,var(--c) 40%,transparent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-cc-status i{width:7px;height:7px;border-radius:50%;background:var(--c);flex:0 0 auto}'+
      '.sp-cc-campos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin-top:10px}.sp-cc-campo{min-width:0;display:flex;flex-direction:column;gap:1px}.sp-cc-rot{font-size:9.5px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}.sp-cc-val{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-cc .cartao-rodape{justify-content:flex-end;margin-top:10px;padding-top:8px}.sp-cc:active{transform:scale(.99)}'+
      '@media(max-width:760px){.sp-modo-cel{display:flex}#spBarra{gap:8px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}#spBarra::-webkit-scrollbar{display:none}#spBarra>*{flex:0 0 auto}.sp-pill{white-space:nowrap}.sp-abas{scrollbar-width:none}.sp-sub{gap:8px}.sp-org{margin-left:0}.sp-tipo{width:100%}.sp-tipo select{flex:1;max-width:none}'+
      'body.sp-planilha:not(.sp-ver-tabela) #listaView .tabela-scroll table{display:none}body.sp-planilha:not(.sp-ver-tabela) #listaView .cartoes-mobile{display:flex}body.sp-planilha.sp-ver-tabela #listaView .tabela-scroll{display:block;max-height:65vh}body.sp-planilha.sp-ver-tabela #listaView .tabela-scroll table{display:table}body.sp-planilha.sp-ver-tabela #listaView .cartoes-mobile{display:none}body.sp-planilha.sp-ver-tabela .sp-tabela td{padding:9px 10px;font-size:12px}body.sp-planilha.sp-ver-tabela .sp-th{padding:10px}body.sp-planilha.sp-ver-tabela .sp-tabela tfoot td{padding:8px 10px}body.sp-planilha.sp-ver-tabela .sp-tabela td.sp-fixa-ult{max-width:46vw}body.sp-planilha.sp-ver-tabela .sp-tabela th.checkbox-col,body.sp-planilha.sp-ver-tabela .sp-tabela td:first-child{padding-left:8px;padding-right:4px}}'+
      '.sp-selo{display:inline-flex;align-items:center;gap:6px;font-size:12px}.sp-selo i{width:7px;height:7px;border-radius:50%;flex:0 0 auto}.sp-rapidos{display:flex;gap:2px;flex-wrap:wrap}'+
      '.sp-ficha{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 14px}.sp-ficha .campo-dado{min-width:0}.sp-ficha .campo-dado-valor{min-height:22px;overflow-wrap:anywhere}'+
      '.sp-ficha .sp-editavel{cursor:pointer;border-radius:6px;padding:2px 4px;margin:-2px -4px}.sp-ficha .sp-editavel:hover{background:color-mix(in srgb,var(--gold) 8%,transparent)}.sp-ficha .sp-lapis{opacity:0;font-size:11px;margin-left:5px;color:var(--muted)}.sp-ficha .sp-editavel:hover .sp-lapis{opacity:1}'+
      '.sp-ficha-barra{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px;padding-top:10px;border-top:1px solid var(--border-soft)}'+
      '.sp-ficha-toggle{border:0;background:none;color:var(--gold-light);font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:4px 0}.sp-ficha-toggle:active{transform:scale(.97)}'+
      '.sp-ficha-padrao{border:0;background:none;color:var(--muted);font:inherit;font-size:11px;text-decoration:underline;cursor:pointer}'+
      '.sp-ficha-todos{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 14px}.sp-ficha-todos[hidden]{display:none}'+
      '.sp-ficha-editando .campo-dado-label{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.sp-ferr{margin-left:auto;display:inline-flex;gap:4px}.sp-ferr button{min-width:22px;height:22px;border-radius:6px;border:1px solid var(--border);background:var(--panel);color:var(--muted);font-size:11px;cursor:pointer;padding:0 6px}.sp-ferr button:hover:not(:disabled){color:var(--gold-light);border-color:var(--gold)}.sp-ferr button:disabled{opacity:.35;cursor:default}.sp-ferr .sp-fx.ligado{color:var(--gold-light);border-color:var(--gold)}'+
      '.sp-num{display:inline-block;min-width:22px;font-variant-numeric:tabular-nums;color:var(--gold-light);font-weight:700}.sp-ficha-dica{grid-column:1/-1;font-size:11px;color:var(--muted)}.sp-edit-wrap{display:flex;flex-direction:column;gap:6px}.sp-ficha-editando .sp-editor{width:100%}'+
      '.sp-fixar{margin-left:6px;width:17px;height:17px;line-height:15px;border-radius:50%;border:1px solid var(--border);background:var(--panel);color:var(--muted);font-size:11px;cursor:pointer;opacity:0;transition:opacity .15s;padding:0;vertical-align:middle}'+
      '.campo-dado:hover .sp-fixar,.sp-fixar:focus-visible{opacity:1}.sp-fixar:hover{color:var(--gold-light);border-color:var(--gold)}@media(hover:none){.sp-fixar{opacity:.7}}'+
      '.sp-ficha-tit{grid-column:1/-1;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-top:6px;padding-top:8px;border-top:1px solid var(--border-soft)}';
    document.head.appendChild(st);
  }

  async function carregarColunas(){
    var r=await _sb.from('lista_colunas').select('id,nome,tipo,escopo,campo_sistema,opcoes,ordem,ativo,ordem_captacao,nome_captacao,chave').order('ordem');
    if(r.error)throw r.error;cols=r.data||[];
  }
  async function iniciar(){
    estilos();
    try{
      var res=await Promise.all([carregarColunas(),
        _sb.from('etiquetas_catalogo').select('id,nome,cor,ativo,ordem,conta_protocolada').eq('categoria','situacao_acao').order('ordem'),
        _sb.rpc('pode_gerenciar_colunas')]);
      situacoes=(res[1]&&res[1].data)||[];SagaPlanilha._gerenciar=!!(res[2]&&res[2].data===true)||!!state.admin;
    }catch(e){console.warn('Planilha: sem colunas do banco',e);return false;}
    if(!cols.length)return false;
    lerPreferencias();
    var abas=document.createElement('div');abas.id='spAbas';var cab=document.querySelector('.barra-filtros');(cab||document.getElementById('listaView')).parentNode.insertBefore(abas,cab||document.getElementById('listaView'));
    var barra=document.createElement('div');barra.id='spBarra';
    var lv=document.getElementById('listaView');lv.parentNode.insertBefore(barra,lv);
    var bk=document.getElementById('barraKanban');if(bk&&!document.getElementById('spKanbanPor')){var kp=document.createElement('div');kp.id='spKanbanPor';kp.className='sp-kb-por';kp.style.display='none';bk.insertBefore(kp,bk.querySelector('.busca-kanban'));}
    pronta=true;renderBarra();
    // Clique no nome abre a ficha; clique duplo em outra célula edita; cabeçalho abre o filtro
    var tabela=document.querySelector('#listaView table');
    tabela.addEventListener('click',function(e){
      if(e.target.id==='chkTodos'){var marcado=e.target.checked;tabela.querySelectorAll('.chk-linha').forEach(function(c){c.checked=marcado;});return;}
      var th=e.target.closest('[data-sp-menu]');if(th){e.stopPropagation();var c=cols.find(function(x){return x.id===th.dataset.spMenu;});if(c)abrirMenu(c,th);return;}
      if(e.target.closest('.sp-editor,a,button,input'))return;
      var tr=e.target.closest('tr[data-sp-proc]');if(!tr)return;
      if(e.target.closest('.sp-link-ficha'))verFicha(tr.dataset.spProc);
    });
    tabela.addEventListener('dblclick',function(e){var td=e.target.closest('td[data-sp-cel]');if(td&&!e.target.closest('a'))editar(td);});
    ligarRedimensionar(tabela);ligarTeclado(tabela);
    var sc=tabela.closest('.tabela-scroll');if(sc)sc.addEventListener('scroll',function(){sc.classList.toggle('sp-rolado',sc.scrollLeft>2);},{passive:true});
    document.addEventListener('mousedown',function(e){if(menuAberto&&!menuAberto.contains(e.target)&&!e.target.closest('[data-sp-menu]'))fecharMenu();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')fecharMenu();});
    window.addEventListener('resize',fecharMenu);
    return true;
  }
  // ---------- importar planilha (colar do Excel/Google Planilhas, arquivo .xlsx (saga_xlsx.js) ou .csv) ----------
  function janela(titulo,corpo,rodape){
    var ov=document.createElement('div');ov.className='modal-overlay sp-ov';ov.style.display='flex';
    ov.innerHTML='<div class="modal sp-modal sp-modal-larga" role="dialog" aria-modal="true" aria-label="'+h(titulo)+'"><div class="modal-head"><h3>'+h(titulo)+'</h3><button class="modal-close" type="button" data-fechar aria-label="Fechar">×</button></div><div class="modal-body">'+corpo+'</div><div class="modal-foot">'+(rodape||'')+'</div></div>';
    document.body.appendChild(ov);
    var fechar=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-fechar]'))fechar();});
    ov.addEventListener('keydown',function(e){if(e.key==='Escape')fechar();});
    var m=ov.querySelector('.modal');if(!(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches)m.animate([{opacity:0,transform:'translateY(14px) scale(.97)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,1.3,.4,1)'});
    return {ov:ov,fechar:fechar,q:function(sel){return ov.querySelector(sel);}};
  }
  function lerTabela(txt){
    txt=String(txt||'').replace(/\r\n?/g,'\n').replace(/\n+$/,'');if(!txt.trim())return [];
    var prim=txt.split('\n')[0],sep=prim.indexOf('\t')!==-1?'\t':((prim.match(/;/g)||[]).length>(prim.match(/,/g)||[]).length?';':',');
    var linhas=[],campo='',linha=[],aspas=false;
    for(var i=0;i<txt.length;i++){var ch=txt[i];
      if(aspas){if(ch==='"'){if(txt[i+1]==='"'){campo+='"';i++;}else aspas=false;}else campo+=ch;continue;}
      if(ch==='"'&&campo==='')aspas=true;else if(ch===sep){linha.push(campo);campo='';}else if(ch==='\n'){linha.push(campo);linhas.push(linha);linha=[];campo='';}else campo+=ch;}
    linha.push(campo);linhas.push(linha);
    return linhas.map(function(l){return l.map(function(x){return x.trim();});}).filter(function(l){return l.some(function(x){return x!=='';});});
  }
  var APELIDOS={'pessoa.nome':['nome','nome do cliente','cliente','nome da parte','parte','autor','beneficiario'],'pessoa.cpf':['cpf','cpf/cnpj','documento'],
    'processo.numero':['processo','processo cnj','numero do processo','n do processo','cnj','numero cnj','n processo'],'processo.valor_precatorio':['valor','valor bruto','valor bruto do prc','valor do precatorio','prc'],
    'processo.tese':['tese','tipo de acao','tipo de ação'],'pessoa.uf':['uf','estado'],'pessoa.telefone':['telefone','celular','whatsapp','fone'],'pessoa.email':['email','e-mail']};
  function alvosImportacao(){
    var lista=colunasDaTela().filter(function(c){return SISTEMA_SO_LEITURA.indexOf(c.campo_sistema)===-1&&['processo.situacao_acao','processo.area'].indexOf(c.campo_sistema)===-1;});
    var tese=cols.find(function(c){return c.campo_sistema==='processo.tese';});if(tese&&lista.indexOf(tese)===-1)lista.push(tese);
    return lista.map(function(c){return {chave:c.campo_sistema||c.id,c:c,nome:nomeCol(c)};});
  }
  function normTribunal(v){
    var n=String(v||'').toUpperCase().trim(),m;
    if((m=/^TRF\s*-?\s*(\d)\s*(?:[-\/ ]+\s*([A-Z]{2}))?\s*$/.exec(n)))return 'TRF-'+m[1]+(m[2]?' / '+m[2]:'');
    if((m=/^TJ\s*-?\s*([A-Z]{2,3})\s*$/.exec(n)))return 'TJ-'+m[1];
    return v;
  }
  function porCabecalho(cab,alvos,usados){
    usados=usados||{};
    return cab.map(function(t){
      var n=norm(t).replace(/[^a-z0-9\/ ]/g,' ').replace(/\s+/g,' ').trim();if(!n)return '';
      var a=alvos.find(function(x){return !usados[x.chave]&&(norm(x.nome)===n||norm(x.c.nome)===n);})||
        alvos.find(function(x){return !usados[x.chave]&&(APELIDOS[x.chave]||[]).indexOf(n)!==-1;});
      if(a){usados[a.chave]=1;return a.chave;}return '';});
  }
  function adivinhar(cab,amostras,alvos){
    // 1) pelo cabeçalho; 2) pelo conteúdo (CPF, número CNJ, valor, tribunal, opções conhecidas, nome)
    var usados={},mapa=porCabecalho(cab,alvos,usados);
    var teste=function(col,re){var vs=amostras.map(function(l){return l[col]||'';}).filter(Boolean);return vs.length&&vs.filter(function(v){return re.test(v);}).length/vs.length>=0.6;};
    var achar=function(fn){return alvos.find(function(x){return !usados[x.chave]&&fn(x);});};
    mapa=mapa.map(function(m,col){
      if(m)return m;var vs=amostras.map(function(l){return l[col]||'';}).filter(Boolean);if(!vs.length)return '';
      var alvo=null;
      if(teste(col,/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/))alvo=achar(function(x){return x.chave==='pessoa.cpf';});
      else if(teste(col,/^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/))alvo=achar(function(x){return x.chave==='processo.numero';});
      else if(teste(col,/^(R\$\s*)?\d{1,3}(\.\d{3})*,\d{2}$/))alvo=achar(function(x){return x.chave==='processo.valor_precatorio';});
      else if(teste(col,/^(STF|STJ|TNU|TRF|TJ)/i))alvo=achar(function(x){return x.c.nome==='Competência';});
      else{
        var porOpcao=achar(function(x){var ops=(x.c.opcoes||[]).map(function(o){return norm(o.nome);});return x.c.tipo==='opcao'&&!x.c.campo_sistema&&ops.length&&vs.filter(function(v){return ops.indexOf(norm(v))!==-1;}).length/vs.length>=0.5;});
        if(porOpcao)alvo=porOpcao;
        else if(vs.filter(function(v){return /^[A-Za-zÀ-ÿ'.]+(\s+[A-Za-zÀ-ÿ'.]+)+$/.test(v);}).length/vs.length>=0.6)alvo=achar(function(x){return x.chave==='pessoa.nome';});
      }
      if(alvo){usados[alvo.chave]=1;return alvo.chave;}return '';
    });
    return mapa;
  }
  function abrirImportar(){
    if(!state.permissoes.criar){aviso('Você não tem permissão para cadastrar processos.',true);return;}
    var alvos=alvosImportacao(),dados=null,mapa=[],temCab=false;
    var teses=(state.teses||[]).filter(function(t){return t.ativo!==false;});
    var j=janela('Importar planilha para a Captação',
      '<p class="sp-ajuda">Copie as linhas no Excel ou no Google Planilhas e cole abaixo (Ctrl+V), ou escolha um arquivo do Excel (.xlsx) ou .csv. Pode vir só com nome e CPF, ou com processo, TRF, tipo de ação e valor, em qualquer ordem: o sistema reconhece as colunas e o senhor confere antes de gravar.</p>'+
      '<textarea class="sp-colar" placeholder="Cole aqui as linhas da planilha"></textarea>'+
      '<div class="sp-imp-linha"><label class="btn-secondary sp-arquivo">Escolher arquivo (.xlsx ou .csv)<input type="file" accept=".xlsx,.csv,.txt,.tsv" hidden></label><span class="sp-ajuda sp-arq-info" style="margin:0">Excel (.xlsx), CSV ou copiar e colar.</span><label class="sp-ajuda sp-arq-aba" style="margin:0" hidden>Aba: <select></select></label></div>'+
      '<div class="sp-imp-mapa"></div><div class="sp-imp-res"></div>',
      '<button type="button" class="btn-secondary" data-fechar>Cancelar</button><button type="button" class="btn-primary" data-conferir disabled>Conferir</button><button type="button" class="btn-primary" data-gravar hidden>Gravar</button>');
    var conferencia=null;
    var montar=function(txt){
      var t=lerTabela(txt);conferencia=null;j.q('[data-gravar]').hidden=true;j.q('.sp-imp-res').innerHTML='';
      if(!t.length){dados=null;j.q('.sp-imp-mapa').innerHTML='';j.q('[data-conferir]').disabled=true;return;}
      var largura=Math.max.apply(null,t.map(function(l){return l.length;}));t=t.map(function(l){while(l.length<largura)l.push('');return l;});
      var tentativa=porCabecalho(t[0],alvos);
      temCab=tentativa.filter(Boolean).length>=Math.max(1,Math.ceil(t[0].filter(Boolean).length/3))&&!/^\d{3}\.?\d{3}/.test(t[0].join(' '));
      var corpo=temCab?t.slice(1):t,cab=temCab?t[0]:t[0].map(function(){return '';});
      if(corpo.length>5000){aviso('No máximo 5.000 linhas por vez. Divida a planilha.',true);return;}
      dados=corpo;mapa=adivinhar(cab,corpo.slice(0,30),alvos);
      var opcoesSel=function(sel){return '<option value="">— ignorar —</option>'+alvos.map(function(a){return '<option value="'+h(a.chave)+'"'+(a.chave===sel?' selected':'')+'>'+h(a.nome)+'</option>';}).join('');};
      j.q('.sp-imp-mapa').innerHTML='<div class="sp-ajuda"><b>'+corpo.length+'</b> linha(s)'+(temCab?' (a primeira linha era o cabeçalho)':'')+'. Confira em que coluna do SAGA vai cada coluna colada:</div>'+
        '<div class="sp-imp-tab"><table><thead><tr>'+cab.map(function(c,i){return '<th><div class="sp-imp-orig">'+h(c||('Coluna '+(i+1)))+'</div><select data-col="'+i+'">'+opcoesSel(mapa[i])+'</select></th>';}).join('')+'</tr></thead><tbody>'+
        corpo.slice(0,5).map(function(l){return '<tr>'+l.map(function(v){return '<td>'+h(v)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>'+
        '<div class="sp-imp-linha"><label class="sp-ajuda" style="margin:0">Tipo de ação para as linhas sem tipo:</label><select class="sp-tese">'+teses.map(function(t){return '<option value="'+h(t.id)+'">'+h(t.nome)+'</option>';}).join('')+'</select></div>';
      j.q('.sp-imp-mapa').querySelectorAll('select[data-col]').forEach(function(sel){sel.onchange=function(){mapa[+sel.dataset.col]=sel.value;conferencia=null;j.q('[data-gravar]').hidden=true;j.q('.sp-imp-res').innerHTML='';};});
      j.q('[data-conferir]').disabled=false;
    };
    var linhasParaGravar=function(){
      var compId=(cols.find(function(c){return c.nome==='Competência';})||{}).id;
      return dados.map(function(l){var o={};mapa.forEach(function(k,i){if(!k||l[i]==null||l[i]==='')return;var v=l[i];if(k===compId)v=normTribunal(v);if(k==='pessoa.cpf'||k==='processo.numero')v=formatar(k==='pessoa.cpf'?'cpf':'cnj',v);o[k]=v;});return o;});
    };
    j.q('.sp-colar').addEventListener('input',function(){montar(this.value);});
    var info=j.q('.sp-arq-info'),caixaAba=j.q('.sp-arq-aba'),selAba=caixaAba.querySelector('select');
    var usarTexto=function(txt){j.q('.sp-colar').value=txt;montar(txt);};
    j.q('input[type=file]').addEventListener('change',async function(){var f=this.files[0];this.value='';if(!f)return;caixaAba.hidden=true;
      if(/\.xlsx$/i.test(f.name)){
        if(!window.SagaXlsx){aviso('Leitor de Excel não carregou. Recarregue a página.',true);return;}
        info.textContent='Lendo '+f.name+'...';
        try{var livro=await SagaXlsx.abrir(await f.arrayBuffer());
          var lerAba=async function(i){info.textContent='Lendo a aba "'+livro.abas[i]+'"...';var linhas=await livro.ler(i);info.textContent=f.name+': '+linhas.length+' linha(s) na aba "'+livro.abas[i]+'".';usarTexto(SagaXlsx.paraTexto(linhas));};
          if(livro.abas.length>1){selAba.innerHTML=livro.abas.map(function(n,i){return '<option value="'+i+'">'+h(n)+'</option>';}).join('');caixaAba.hidden=false;selAba.onchange=function(){lerAba(+selAba.value).catch(function(e){info.textContent='';aviso(h(e.message||'Não foi possível ler a planilha.'),true);});};}
          await lerAba(0);
        }catch(e){info.textContent='Excel (.xlsx), CSV ou copiar e colar.';aviso(h(e.message||'Não foi possível ler a planilha.'),true);}
        return;}
      var r=new FileReader();r.onload=function(){info.textContent=f.name;usarTexto(r.result);};r.readAsText(f,'utf-8');});
    j.q('[data-conferir]').onclick=async function(){
      if(!dados)return;if(mapa.indexOf('pessoa.nome')===-1){aviso('Indique qual coluna é o nome do cliente.',true);return;}
      var b=this;b.disabled=true;b.textContent='Conferindo...';
      try{var linhas=linhasParaGravar();conferencia=await rpcOk('lista_conferir_linhas',{p_linhas:linhas});}
      catch(e){aviso(h(e.message||'Não foi possível conferir.'),true);b.disabled=false;b.textContent='Conferir';return;}
      b.disabled=false;b.textContent='Conferir de novo';
      var erros=conferencia.filter(function(x){return x.erro;}),cli=conferencia.filter(function(x){return !x.erro&&x.cliente_existente_id;}),proc=conferencia.filter(function(x){return !x.erro&&x.processo_existente_id;}),rep=conferencia.filter(function(x){return !x.erro&&(x.cpf_repetido_na_colagem||x.numero_repetido_na_colagem);});
      var boas=conferencia.length-erros.length;
      j.q('.sp-imp-res').innerHTML='<div class="sp-imp-resumo"><b>'+boas+'</b> linha(s) prontas para gravar'+(erros.length?' · <span class="sp-erro">'+erros.length+' com erro (não serão gravadas)</span>':'')+
        (cli.length?' · '+cli.length+' cliente(s) já cadastrado(s): o processo novo entra na ficha que já existe':'')+(proc.length?' · <span class="sp-alerta">'+proc.length+' número(s) de processo que já existem</span>':'')+(rep.length?' · <span class="sp-alerta">'+rep.length+' repetida(s) na própria planilha</span>':'')+'</div>'+
        (erros.length?'<ul class="sp-imp-erros">'+erros.slice(0,10).map(function(x){return '<li>Linha '+x.linha+': '+h(x.erro)+'</li>';}).join('')+(erros.length>10?'<li>... e mais '+(erros.length-10)+'</li>':'')+'</ul>':'')+
        (proc.length||rep.length?'<label class="sp-item"><input type="checkbox" class="sp-pular-rep" checked> Não gravar as linhas com processo que já existe ou repetidas</label>':'');
      var g=j.q('[data-gravar]');g.hidden=!boas;g.textContent='Gravar '+boas+' linha(s)';
    };
    j.q('[data-gravar]').onclick=async function(){
      if(!conferencia)return;var b=this;
      var pularRep=j.q('.sp-pular-rep')&&j.q('.sp-pular-rep').checked;
      var pular=new Set(conferencia.filter(function(x){return x.erro||(pularRep&&(x.processo_existente_id||x.cpf_repetido_na_colagem&&x.numero_repetido_na_colagem||x.numero_repetido_na_colagem));}).map(function(x){return x.linha;}));
      var linhas=linhasParaGravar(),tese=j.q('.sp-tese')&&j.q('.sp-tese').value||null,criadas=0,novos=0;
      b.disabled=true;j.q('[data-conferir]').disabled=true;
      try{
        for(var ini=0;ini<linhas.length;ini+=1000){
          var lote=linhas.slice(ini,ini+1000),pl=[];for(var k=0;k<lote.length;k++)if(pular.has(ini+k+1))pl.push(k+1);
          if(pl.length===lote.length)continue;
          b.textContent='Gravando '+Math.min(ini+1000,linhas.length)+' de '+linhas.length+'...';
          var r=await rpcOk('lista_criar_linhas',{p_tela:'captacao',p_linhas:lote,p_tese_padrao:tese,p_pular:pl});
          criadas+=r.length;novos+=r.filter(function(x){return x.cliente_novo;}).length;
        }
      }catch(e){aviso(h(e.message||'Não foi possível gravar.'),true);b.disabled=false;b.textContent='Tentar de novo';j.q('[data-conferir]').disabled=false;return;}
      j.fechar();aviso(criadas+' ficha(s) criada(s) na Captação'+(novos?' ('+novos+' cliente(s) novo(s))':'')+'.');
      if(typeof invalidarBaseProcessos==='function')invalidarBaseProcessos();if(typeof carregarProcessos==='function')carregarProcessos();
    };
    setTimeout(function(){j.q('.sp-colar').focus();},50);
  }

  // ---------- distribuir fichas entre os captadores ----------
  function abrirDistribuir(){
    var marcadas=Array.from(document.querySelectorAll('#listaView .chk-linha:checked')).map(function(c){return c.value;});
    var doFiltro=(state.baseProcessos||[]).filter(function(p){return processoNoEscopo(p);});
    var semCaptador=doFiltro.filter(function(p){return !p.captador_id;});
    var pessoas=state.responsaveis||[];
    var j=janela('Distribuir fichas entre os captadores',
      '<div class="sp-dist-bloco"><div class="sp-dist-tit">Quais fichas</div>'+
        (marcadas.length?'<label class="sp-item"><input type="radio" name="spFichas" value="marcadas" checked> As marcadas na lista ('+marcadas.length+')</label>':'')+
        '<label class="sp-item"><input type="radio" name="spFichas" value="semcaptador"'+(marcadas.length?'':' checked')+'> As do filtro atual sem Jovem Talento ('+semCaptador.length+')</label>'+
        '<label class="sp-item"><input type="radio" name="spFichas" value="filtro"> Todas do filtro atual ('+doFiltro.length+')</label></div>'+
      '<div class="sp-dist-bloco"><div class="sp-dist-tit">Para quem</div><div class="sp-dist-pessoas">'+pessoas.map(function(u){return '<label class="sp-item"><input type="checkbox" value="'+h(u.id)+'"> <span>'+h(u.nome_completo)+'</span></label>';}).join('')+'</div>'+
        '<p class="sp-ajuda">Só aparecem colaboradores que já têm conta no SAGA.</p></div>'+
      '<div class="sp-dist-bloco"><div class="sp-dist-tit">Como</div>'+
        '<label class="sp-item"><input type="radio" name="spModo" value="sorteio" checked> Sorteio: quantidade igual para cada um</label>'+
        '<label class="sp-item"><input type="radio" name="spModo" value="sequencia"> Um para cada, na ordem da lista</label>'+
        '<label class="sp-item"><input type="radio" name="spModo" value="blocos"> Em blocos de <input type="number" class="sp-bloco" value="10" min="1" max="1000"> seguidas para cada um</label></div>'+
      '<div class="sp-dist-previa"></div>',
      '<button type="button" class="btn-secondary" data-fechar>Cancelar</button><button type="button" class="btn-primary" data-ok>Distribuir</button>');
    var fichas=function(){var v=(j.q('input[name=spFichas]:checked')||{}).value;return v==='marcadas'?marcadas:(v==='filtro'?doFiltro:semCaptador).map(function(p){return p.id;});};
    var escolhidos=function(){return Array.from(j.ov.querySelectorAll('.sp-dist-pessoas input:checked')).map(function(i){return i.value;});};
    var previa=function(){var f=fichas().length,c=escolhidos().length;j.q('.sp-dist-previa').innerHTML=!c?'<span class="sp-ajuda">Marque os captadores.</span>':'<b>'+f+'</b> ficha(s) para <b>'+c+'</b> captador(es): cerca de <b>'+Math.floor(f/c)+(f%c?' a '+Math.ceil(f/c):'')+'</b> para cada um.';};
    j.ov.addEventListener('change',previa);previa();
    j.q('[data-ok]').onclick=async function(){
      var ids=fichas(),caps=escolhidos(),modo=j.q('input[name=spModo]:checked').value;
      if(!ids.length){aviso('Nenhuma ficha para distribuir.',true);return;}if(!caps.length){aviso('Marque pelo menos um captador.',true);return;}
      var ok=window.sagaConfirmar?await sagaConfirmar('Distribuir fichas','Distribuir '+ids.length+' ficha(s) entre '+caps.length+' captador(es)? Cada um recebe um aviso no sino.','Distribuir'):true;if(!ok)return;
      var b=this;b.disabled=true;b.textContent='Distribuindo...';
      try{var r=await rpcOk('captacao_distribuir',{p_processos:ids,p_captadores:caps,p_modo:modo,p_bloco:Number(j.q('.sp-bloco').value)||10,p_partes:null});
        j.fechar();aviso('Distribuído: '+(r||[]).map(function(x){return h(String(x.nome||'').split(' ')[0])+' '+x.quantidade;}).join(' · '));
        if(typeof invalidarBaseProcessos==='function')invalidarBaseProcessos();if(typeof carregarProcessos==='function')carregarProcessos();}
      catch(e){aviso(h(e.message||'Não foi possível distribuir.'),true);b.disabled=false;b.textContent='Distribuir';}
    };
  }

  // ---------- Kanban da Captação como funil de vendas ----------
  function statusDe(p){var id=p.status_id;return (state.statusList||[]).find(function(s){return String(s.id)===String(id);})||p.status||{};}
  function etapasFunil(){
    var sts=(state.statusList||[]).filter(function(s){return s.fase==='captacao'&&s.etapa;}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
    var lista=[];sts.forEach(function(s){var e=lista.find(function(x){return x.nome===s.etapa;});if(!e){e={nome:s.etapa,status:[],cor:s.cor||'#5483B3'};lista.push(e);}e.status.push(s);});
    return lista;
  }
  function mesmaEtapa(pid,statusId){
    if(FASE_FIXA!=='captacao')return false;
    var p=(state.baseProcessos||[]).find(function(x){return String(x.id)===String(pid);});if(!p)return false;
    var atual=statusDe(p).etapa,novo=((state.statusList||[]).find(function(s){return String(s.id)===String(statusId);})||{}).etapa;
    return !!atual&&atual===novo;
  }
  function renderFunil(kv){
    var etapas=etapasFunil();if(!etapas.length)return false;
    var cRet=colPorChave('captacao.data_retorno'),cTipo=cols.find(function(c){return c.campo_sistema==='processo.tese';}),cTrf=cols.find(function(c){return c.nome==='Competência'&&!c.campo_sistema;});
    var hoje=hojeISO(),total=state.processos.length,pode=state.permissoes.editar===true;
    var grupos=etapas.map(function(e){return {e:e,itens:[]};}),fora=[];
    state.processos.forEach(function(p){var et=statusDe(p).etapa;var g=grupos.find(function(x){return x.e.nome===et;});if(g)g.itens.push(p);else fora.push(p);});
    var ret=function(p){return cRet&&(p.campos||{})[cRet.id]?String(p.campos[cRet.id]).slice(0,10):'';};
    var cartao=function(p){
      var sig=!!p.sigilo&&!state.permissoes.editar_dados,pe=p.pessoa||{},st=statusDe(p),r=ret(p);
      var whats=String(pe.telefone_whatsapp||'').replace(/\D/g,'');
      var tipo=cTipo?texto(p,cTipo):'',trf=cTrf?texto(p,cTrf):'',cap=nomeUsuario(p.captador_id);
      var classeRet=!r?'':r<hoje?'atrasado':r===hoje?'hoje':'';
      return '<div class="card-kanban sp-card" data-processo-id="'+h(p.id)+'" draggable="'+(pode?'true':'false')+'" onclick="verFicha(\''+h(p.id)+'\')">'+
        '<div class="card-nome">'+h(sig?'••••':(pe.nome_completo||'N/D'))+'</div>'+
        '<div class="sp-card-status"><i style="background:'+h(st.cor||'#8a94a8')+'"></i>'+h(st.nome||'')+'</div>'+
        ((tipo||trf)?'<div class="sp-card-linha">'+h([tipo,trf].filter(Boolean).join(' · '))+'</div>':'')+
        '<div class="sp-card-linha">'+(r?'<span class="sp-ret '+classeRet+'">Retorno '+h(r.split('-').reverse().join('/'))+(classeRet==='atrasado'?' · atrasado':classeRet==='hoje'?' · hoje':'')+'</span>':'<span class="sp-vazio">Sem data de retorno</span>')+'</div>'+
        (p.valor_precatorio_origem&&!sig?'<div class="sp-card-valor">'+h(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(p.valor_precatorio_origem)))+'</div>':'')+
        '<div class="card-rodape"><div style="display:flex;align-items:center;gap:6px">'+(cap?'<div class="card-avatar" data-saga-nome="'+h(cap)+'"'+(p.captador_id?' data-saga-usuario="'+h(p.captador_id)+'"':'')+' title="Jovem Talento: '+h(cap)+'">'+h(cap.split(' ').map(function(x){return x[0];}).slice(0,2).join(''))+'</div><span class="sp-card-cap">'+h(cap.split(' ')[0])+'</span>':'<span class="sp-vazio">Sem Jovem Talento</span>')+'</div>'+
        (whats.length>=10&&!sig?'<a class="card-whats-mini" href="https://wa.me/55'+h(whats)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abrir WhatsApp">WhatsApp</a>':'')+'</div></div>';
    };
    var ordenar=function(a,b){var ra=ret(a),rb=ret(b);if(ra&&rb&&ra!==rb)return ra<rb?-1:1;if(ra&&!rb)return -1;if(rb&&!ra)return 1;return String((a.pessoa||{}).nome_completo||'').localeCompare(String((b.pessoa||{}).nome_completo||''),'pt-BR');};
    kv.innerHTML='<div class="quadro-kanban sp-funil">'+grupos.map(function(g,i){
      var pct=total?Math.round(g.itens.length*100/total):0;
      return '<div class="coluna-kanban" data-coluna-id="'+h(g.e.status[0].id)+'">'+
        '<div class="coluna-cabecalho"><span class="coluna-cor-dot" style="background:'+h(g.e.cor)+'"></span><div class="coluna-titulo">'+h(g.e.nome)+'</div><span class="coluna-contagem">'+g.itens.length+'</span><span class="sp-pct" title="do total">'+pct+'%</span></div>'+
        '<div class="sp-funil-barra"><i style="width:'+pct+'%;background:'+h(g.e.cor)+'"></i></div>'+
        '<div class="coluna-corpo" data-status-id="'+h(g.e.status[0].id)+'">'+g.itens.sort(ordenar).map(cartao).join('')+'</div></div>';
    }).join('')+(fora.length?'<div class="coluna-kanban"><div class="coluna-cabecalho"><div class="coluna-titulo">Sem etapa</div><span class="coluna-contagem">'+fora.length+'</span></div><div class="coluna-corpo" data-status-id="'+h(etapas[0].status[0].id)+'">'+fora.map(cartao).join('')+'</div></div>':'')+'</div>';
    if(pode&&typeof ativarArrasteKanban==='function')ativarArrasteKanban(kv);
    if(!(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches)kv.querySelectorAll('.coluna-kanban').forEach(function(c,i){c.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*45,easing:'cubic-bezier(.2,1.2,.4,1)',fill:'backwards'});});
    return true;
  }

  // ---------- Kanban organizado pela coluna escolhida, com filtro em cada coluna ----------
  // Guardado só neste aparelho e nesta conta (como as larguras): {por: id da coluna, filtros: {grupo: {coluna: [chaves]}}}
  var CHAVE_KB=function(){return 'saga-planilha-kanban-'+FASE_FIXA+'-'+(state.meuInternoId||'');};
  var kb=null,opsCache={};
  var FAIXAS=[[0,50000,'Até R$ 50 mil'],[50000,100000,'R$ 50 a 100 mil'],[100000,200000,'R$ 100 a 200 mil'],[200000,500000,'R$ 200 a 500 mil'],[500000,Infinity,'Acima de R$ 500 mil']];
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  function lerKb(){if(!kb){try{kb=JSON.parse(localStorage.getItem(CHAVE_KB())||'null');}catch(e){}kb=kb||{por:null,filtros:{}};kb.filtros=kb.filtros||{};}return kb;}
  function guardarKb(){try{localStorage.setItem(CHAVE_KB(),JSON.stringify(kb));}catch(e){}}
  function agrupavel(c){
    if(!c||!c.ativo)return false;
    if(['pessoa.nome','pessoa.cpf','processo.numero','pessoa.telefone','pessoa.email','processo.criado_em','processo.atualizado_em'].indexOf(c.campo_sistema)>=0)return false;
    if(c.campo_sistema==='processo.fase')return false;
    return ['opcao','sim_nao','usuario','moeda','numero','data'].indexOf(c.tipo)>=0||['processo.status','processo.tese','processo.area','processo.situacao_acao','processo.responsavel','processo.captador','pessoa.uf','pessoa.situacao_vital','processo.valor_causa','processo.valor_precatorio','processo.ultima_movimentacao'].indexOf(c.campo_sistema)>=0;
  }
  function tipoGrupo(c){
    if(c.tipo==='moeda'||c.tipo==='numero'||c.campo_sistema==='processo.valor_causa'||c.campo_sistema==='processo.valor_precatorio')return 'faixa';
    if(c.tipo==='data'||c.campo_sistema==='processo.ultima_movimentacao')return 'mes';
    if(c.tipo==='sim_nao')return 'simnao';
    return 'opcao';
  }
  function chaveGrupo(p,c){
    var v=bruto(p,c),t=tipoGrupo(c);
    if(v==null||v===''||(Array.isArray(v)&&!v.length))return VAZIO;
    if(t==='faixa'){var n=Number(v);if(!isFinite(n))return VAZIO;for(var i=0;i<FAIXAS.length;i++)if(n>=FAIXAS[i][0]&&n<FAIXAS[i][1])return 'f'+i;return VAZIO;}
    if(t==='mes')return String(v).slice(0,7);
    if(t==='simnao')return v===true||v==='true'?'true':'false';
    return String(v);
  }
  // colunas do Kanban na ordem lógica (ordem do menu; meses do mais novo para o mais antigo)
  function gruposDe(c,lista){
    var t=tipoGrupo(c),g=[];
    if(t==='faixa')g=FAIXAS.map(function(f,i){return {k:'f'+i,nome:f[2]};});
    else if(t==='simnao')g=[{k:'true',nome:'Sim',cor:'#16a34a'},{k:'false',nome:'Não',cor:'#e5484d'}];
    else if(t==='mes'){var ms={};lista.forEach(function(p){var k=chaveGrupo(p,c);if(k!==VAZIO)ms[k]=1;});g=Object.keys(ms).sort().reverse().map(function(k){return {k:k,nome:MESES[Number(k.slice(5,7))-1]+' de '+k.slice(0,4)};});}
    else{
      var ops=opsCache[c.id]||[];
      g=ops.map(function(o){var cor=null;if(c.campo_sistema==='processo.status'){var st=(state.statusList||[]).find(function(x){return String(x.id)===String(o.id);});cor=st&&st.cor;}else if(c.campo_sistema==='processo.situacao_acao'){cor=(situacao(o.id)||{}).cor;}else if(c.tipo==='opcao'&&!c.campo_sistema){var oo=(c.opcoes||[]).find(function(x){return String(x.id)===String(o.id);});cor=oo&&oo.cor;}else if(c.campo_sistema==='processo.tese'){var te=(state.teses||[]).find(function(x){return String(x.id)===String(o.id);});cor=te&&te.cor;}return {k:String(o.id),nome:o.nome,cor:cor};});
      // valores antigos que não estão mais no menu também ganham coluna
      var ja={};g.forEach(function(x){ja[x.k]=1;});lista.forEach(function(p){var k=chaveGrupo(p,c);if(k!==VAZIO&&!ja[k]){ja[k]=1;g.push({k:k,nome:texto(p,c)||k});}});
    }
    g.push({k:VAZIO,nome:t==='simnao'?'Não informado':'Sem '+nomeCol(c).toLowerCase(),vazio:true});
    return g;
  }
  function podeSoltar(c){return tipoGrupo(c)==='opcao'||tipoGrupo(c)==='simnao';}
  function filtrosDoGrupo(k){var f=lerKb().filtros[k]||{};return f;}
  function passaGrupo(p,k){var f=filtrosDoGrupo(k);for(var id in f){var c=cols.find(function(x){return x.id===id;});if(!c||!f[id].length)continue;if(f[id].indexOf(chave(p,c))<0)return false;}return true;}
  function seletorKanban(){
    var el=document.getElementById('spKanbanPor');if(!el)return;
    var k=lerKb(),cs=colunasDaTela().filter(agrupavel);
    el.style.display=state.view==='kanban'?'':'none';
    var bn=document.getElementById('btnNovaColunaKanban');if(bn&&state.view==='kanban')bn.style.display=k.por?'none':'';
    el.innerHTML='<label for="spKbSel">Organizar por</label><select id="spKbSel"><option value="">Padrão ('+(FASE_FIXA==='captacao'?'etapas do funil':'status do processo')+')</option>'+cs.map(function(c){return '<option value="'+h(c.id)+'"'+(k.por===c.id?' selected':'')+'>'+h(nomeCol(c))+'</option>';}).join('')+'</select>'+
      (k.por?'<button type="button" class="sp-kb-padrao" id="spKbPadrao" title="Voltar à organização padrão desta área">Voltar ao padrão</button>':'');
    el.querySelector('#spKbSel').onchange=function(){k.por=this.value||null;k.filtros={};guardarKb();if(typeof renderKanban==='function')renderKanban();};
    var bp=el.querySelector('#spKbPadrao');if(bp)bp.onclick=function(){k.por=null;k.filtros={};guardarKb();renderKanban();};
  }
  function cartaoGenerico(p,c){
    var sig=!!p.sigilo&&!state.permissoes.editar_dados,pe=p.pessoa||{},st=statusDe(p);
    var whats=String(pe.telefone_whatsapp||'').replace(/\D/g,'');
    var cTipo=cols.find(function(x){return x.campo_sistema==='processo.tese';});var tipo=cTipo?texto(p,cTipo):'';
    var pessoaId=FASE_FIXA==='captacao'?p.captador_id:p.responsavel_id,nomeP=nomeUsuario(pessoaId);
    var cPet=cols.find(function(x){return /status da peti/i.test(norm(x.nome))&&!x.campo_sistema;});var pet=cPet&&c.id!==cPet.id?texto(p,cPet):'';
    var valor=p.valor_precatorio_origem||p.valor_causa;
    return '<div class="card-kanban sp-card" data-processo-id="'+h(p.id)+'" draggable="'+(state.permissoes.editar===true&&podeSoltar(c)?'true':'false')+'" onclick="verFicha(\''+h(p.id)+'\')">'+
      '<div class="card-nome">'+h(sig?'••••':(pe.nome_completo||'N/D'))+'</div>'+
      (c.campo_sistema!=='processo.status'?'<div class="sp-card-status"><i style="background:'+h(st.cor||'#8a94a8')+'"></i>'+h(st.nome||'')+'</div>':'')+
      ((tipo&&c.campo_sistema!=='processo.tese')||pet?'<div class="sp-card-linha">'+h([c.campo_sistema!=='processo.tese'?tipo:'',pet].filter(Boolean).join(' · '))+'</div>':'')+
      (valor&&!sig?'<div class="sp-card-valor">'+h(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(valor)))+'</div>':'')+
      '<div class="card-rodape"><div style="display:flex;align-items:center;gap:6px">'+(nomeP?'<div class="card-avatar" data-saga-nome="'+h(nomeP)+'"'+(pessoaId?' data-saga-usuario="'+h(pessoaId)+'"':'')+' title="'+h(nomeP)+'">'+h(nomeP.split(' ').map(function(x){return x[0];}).slice(0,2).join(''))+'</div><span class="sp-card-cap">'+h(nomeP.split(' ')[0])+'</span>':'')+'</div>'+
      (whats.length>=10&&!sig?'<a class="card-whats-mini" href="https://wa.me/55'+h(whats)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abrir WhatsApp">WhatsApp</a>':'')+'</div></div>';
  }
  // chamado pela tela no começo do renderKanban: devolve true quando desenhou (organização escolhida)
  function kanbanAgrupado(kv){
    seletorKanban();
    var k=lerKb(),c=k.por?cols.find(function(x){return x.id===k.por;}):null;
    if(!c||!agrupavel(c)){if(k.por){k.por=null;guardarKb();seletorKanban();}return false;}
    if(tipoGrupo(c)==='opcao'&&!opsCache[c.id]){kv.innerHTML='<div class="estado-vazio-kanban"><b>Organizando…</b></div>';opcoesDe(c).then(function(o){opsCache[c.id]=o||[];renderKanban();});return true;}
    var lista=state.processos,grupos=gruposDe(c,lista),total=lista.length;
    var porG={};grupos.forEach(function(g){porG[g.k]=[];});
    lista.forEach(function(p){var kk=chaveGrupo(p,c);(porG[kk]=porG[kk]||[]).push(p);});
    var ord=function(a,b){return String((a.pessoa||{}).nome_completo||'').localeCompare(String((b.pessoa||{}).nome_completo||''),'pt-BR');};
    kv.innerHTML='<div class="quadro-kanban sp-funil sp-kb">'+grupos.filter(function(g){return !(g.vazio&&!(porG[g.k]||[]).length&&tipoGrupo(c)!=='simnao');}).map(function(g){
      var todos=(porG[g.k]||[]),vis=todos.filter(function(p){return passaGrupo(p,g.k);}),nf=Object.keys(filtrosDoGrupo(g.k)).filter(function(id){return (filtrosDoGrupo(g.k)[id]||[]).length;}).length;
      var pct=total?Math.round(todos.length*100/total):0,cor=g.cor||(g.vazio?'#8a94a8':'var(--gold)');
      var chips=Object.keys(filtrosDoGrupo(g.k)).map(function(id){var cc=cols.find(function(x){return x.id===id;});var vs=filtrosDoGrupo(g.k)[id];if(!cc||!vs.length)return '';
        var nomes=vs.map(function(v){if(v===VAZIO)return '(vazio)';var pp=(state.baseProcessos||[]).find(function(p){return chave(p,cc)===v;});return pp?texto(pp,cc):v;});
        return '<span class="sp-kb-chip">'+h(nomeCol(cc))+': '+h(nomes.join(', '))+'<button type="button" data-kb-tira="'+h(g.k)+'|'+h(id)+'" aria-label="Tirar filtro">×</button></span>';}).join('');
      return '<div class="coluna-kanban" data-coluna-id="'+h(g.k)+'">'+
        '<div class="coluna-cabecalho"><span class="coluna-cor-dot" style="background:'+h(cor)+'"></span><div class="coluna-titulo">'+h(g.nome)+'</div><span class="coluna-contagem">'+(nf?vis.length+' de '+todos.length:todos.length)+'</span><span class="sp-pct">'+pct+'%</span>'+
        '<button type="button" class="sp-kb-filtro'+(nf?' ativo':'')+'" data-kb-filtro="'+h(g.k)+'" title="Filtrar só esta coluna">'+(nf?nf+' filtro'+(nf>1?'s':''):'Filtrar')+' ▾</button></div>'+
        '<div class="sp-funil-barra"><i style="width:'+pct+'%;background:'+h(cor)+'"></i></div>'+
        (chips?'<div class="sp-kb-chips">'+chips+'<button type="button" class="sp-kb-limpar" data-kb-limpar="'+h(g.k)+'">limpar</button></div>':'')+
        '<div class="coluna-corpo" data-sp-grupo="'+h(g.k)+'">'+vis.sort(ord).map(function(p){return cartaoGenerico(p,c);}).join('')+(vis.length?'':'<div class="sp-kb-nada">'+(todos.length?'Nenhum cartão com estes filtros.':'Nenhum processo.')+'</div>')+'</div></div>';
    }).join('')+'</div>';
    kv.querySelectorAll('[data-kb-filtro]').forEach(function(b){b.onclick=function(e){e.stopPropagation();menuFiltroGrupo(b,b.dataset.kbFiltro,c);};});
    kv.querySelectorAll('[data-kb-tira]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var x=b.dataset.kbTira.split('|');delete lerKb().filtros[x[0]][x[1]];guardarKb();renderKanban();};});
    kv.querySelectorAll('[data-kb-limpar]').forEach(function(b){b.onclick=function(e){e.stopPropagation();delete lerKb().filtros[b.dataset.kbLimpar];guardarKb();renderKanban();};});
    if(state.permissoes.editar===true&&podeSoltar(c)&&typeof ativarArrasteKanban==='function')ativarArrasteKanban(kv);
    if(!(window.sagaMq?sagaMq():{matches:false}).matches)kv.querySelectorAll('.coluna-kanban').forEach(function(col,i){if(col.animate)col.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:Math.min(i,10)*40,easing:'cubic-bezier(.22,.78,.25,1)',fill:'backwards'});});
    return true;
  }
  // soltar um cartão em outra coluna muda aquele dado do processo (só listas de opções e Sim/Não)
  async function soltarNoGrupo(pid,k){
    var kk=lerKb(),c=cols.find(function(x){return x.id===kk.por;}),p=processo(pid);if(!c||!p||!podeSoltar(c))return;
    if(chaveGrupo(p,c)===k){renderKanban();return;}
    if(!editavel(p,c)){aviso('Você não pode mudar este dado.',true);renderKanban();return;}
    var valor=k===VAZIO?null:(tipoGrupo(c)==='simnao'?k==='true':k);
    try{await gravar(p,c,valor);aviso(h(nomeCol(c))+' atualizado.');}catch(e){aviso(h(e.message||'Não foi possível mudar.'),true);}
    renderKanban();
  }
  // filtro de uma coluna do Kanban: escolhe a coluna da planilha e os valores (soma com os outros filtros da coluna)
  function menuFiltroGrupo(ancora,k,cPor){
    fecharMenu();
    var itens=(state.processos||[]).filter(function(p){return chaveGrupo(p,cPor)===k;});
    var cs=colunasDaTela().filter(function(c){return c.id!==cPor.id&&['link'].indexOf(c.tipo)<0&&c.campo_sistema!=='pessoa.nome';});
    var f=filtrosDoGrupo(k),sel=cs.find(function(c){return /protocol|documenta/i.test(norm(c.nome))&&!(f[c.id]||[]).length;})||cs[0];
    var m=document.createElement('div');m.className='sp-menu';m.style.width='290px';
    var desenhar=function(){
      var vals={};itens.forEach(function(p){var v=chave(p,sel);vals[v]=vals[v]||{n:0,t:v===VAZIO?'(vazio)':texto(p,sel)||v};vals[v].n++;});
      var atuais=f[sel.id]||[];
      m.innerHTML='<div class="sp-menu-tit">Filtrar esta coluna</div><select class="sp-busca" id="spKbCol">'+cs.map(function(c){return '<option value="'+h(c.id)+'"'+(c===sel?' selected':'')+'>'+h(nomeCol(c))+((f[c.id]||[]).length?' ✓':'')+'</option>';}).join('')+'</select>'+
        '<div class="sp-lista">'+Object.keys(vals).sort(function(a,b){return vals[a].t.localeCompare(vals[b].t,'pt-BR',{numeric:true});}).map(function(v){return '<label class="sp-item"><input type="checkbox" value="'+h(v)+'"'+(atuais.indexOf(v)>=0?' checked':'')+'><span>'+h(exibir(sel,vals[v].t))+'</span><em>'+vals[v].n+'</em></label>';}).join('')+'</div>'+
        '<div class="sp-menu-acoes"><button type="button" class="btn-secondary" data-x="limpar">Limpar</button><button type="button" class="btn-primary" data-x="ok">Aplicar</button></div>';
      m.querySelector('#spKbCol').onchange=function(){sel=cs.find(function(c){return c.id===this.value;}.bind(this));desenhar();};
      m.querySelector('[data-x="limpar"]').onclick=function(){if(lerKb().filtros[k])delete lerKb().filtros[k][sel.id];guardarKb();fecharMenu();renderKanban();};
      m.querySelector('[data-x="ok"]').onclick=function(){var v=Array.prototype.map.call(m.querySelectorAll('.sp-lista input:checked'),function(i){return i.value;});var fk=lerKb().filtros[k]=lerKb().filtros[k]||{};if(v.length)fk[sel.id]=v;else delete fk[sel.id];guardarKb();fecharMenu();renderKanban();};
    };
    desenhar();
    document.body.appendChild(m);menuAberto=m;
    var r=ancora.getBoundingClientRect();m.style.top=Math.min(r.bottom+6,window.innerHeight-m.offsetHeight-8)+'px';m.style.left=Math.max(8,Math.min(r.right-290,window.innerWidth-298))+'px';
    if(!(window.sagaMq?sagaMq():{matches:false}).matches&&m.animate)m.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.22,.78,.25,1)'});
  }

  // ---------- ficha do cliente: "Dados do Processo" na ordem da planilha, editável ----------
  var catFicha=null;
  async function catalogosFicha(){
    if(catFicha)return catFicha;
    var r=await Promise.all([
      _sb.from('status_funil').select('id,nome,fase,ordem,ativo').order('ordem'),
      _sb.from('teses').select('id,nome,ativo').order('nome'),
      _sb.from('areas_direito').select('id,nome,ativo,ordem').order('ordem'),
      _sb.from('usuarios').select('id,nome_completo').eq('ativo',true).not('auth_user_id','is',null).order('nome_completo'),
      _sb.from('etiquetas_catalogo').select('id,nome,cor,ativo,ordem,conta_protocolada').eq('categoria','situacao_acao').order('ordem'),
      _sb.rpc('pode_gerenciar_colunas')]);
    catFicha={status:r[0].data||[],teses:r[1].data||[],areas:r[2].data||[],usuarios:r[3].data||[],gerenciar:r[5]&&r[5].data===true};
    situacoes=r[4].data||situacoes;
    return catFicha;
  }
  var CAMPO_LINHA={'pessoa.nome':'nome','pessoa.cpf':'cpf','pessoa.uf':'uf','pessoa.situacao_vital':'situacao_vital','pessoa.telefone':'telefone','pessoa.email':'email',
    'processo.numero':'numero','processo.area':'area_id','processo.tese':'tese_id','processo.status':'status_id','processo.fase':'fase','processo.responsavel':'responsavel_id',
    'processo.captador':'captador_id','processo.situacao_acao':'situacao_acao_id','processo.valor_causa':'valor_causa','processo.valor_precatorio':'valor_precatorio',
    'processo.criado_em':'criado_em','processo.atualizado_em':'atualizado_em','processo.ultima_movimentacao':'ultima_movimentacao'};
  var ROTULO_LINHA={'processo.area':'area','processo.tese':'tese','processo.status':'status','processo.responsavel':'responsavel','processo.captador':'captador','processo.situacao_acao':'situacao_acao'};
  function valorLinha(row,c){
    if(!c.campo_sistema)return (row.campos||{})[c.id];
    var v=row[CAMPO_LINHA[c.campo_sistema]];
    if(c.tipo==='data'&&v)v=String(v).slice(0,10);
    if(c.campo_sistema==='pessoa.situacao_vital'&&v==='nao_informado')v=null;
    return v;
  }
  function textoLinha(row,c,v){
    if(v==null||v==='')return '';
    if(ROTULO_LINHA[c.campo_sistema])return row[ROTULO_LINHA[c.campo_sistema]]||'';
    if(c.campo_sistema==='processo.fase')return v==='juridico'?'Jurídico':'Captação';
    if(c.campo_sistema==='pessoa.situacao_vital')return v==='vivo'?'Vivo':'Falecido';
    return exibir(c,texto({valor_causa:row.valor_causa},c,v));
  }
  // ---------- caixas de edição da ficha (modo "lápis": editar vários campos e salvar de uma vez) ----------
  function mesmoValor(a,b){return JSON.stringify(a==null||a===''?null:a)===JSON.stringify(b==null||b===''?null:b);}
  function controleCampo(c,v,textoAtual,ops,podeNova,causaFn){
    var campo,ler,bruto,definir,wrap=null,inpNova=null;
    if(ops){
      campo=document.createElement('select');
      campo.innerHTML='<option value="">— vazio —</option>'+ops.map(function(o){return '<option value="'+h(o.id)+'">'+h(o.nome)+'</option>';}).join('')+(podeNova?'<option value="__nova">+ Nova opção...</option>':'');
      if(v!=null&&v!==''&&!ops.some(function(o){return String(o.id)===String(v);})){var op=new Option((textoAtual||String(v))+' (desativada)',v);op.disabled=true;campo.add(op,1);}
      campo.value=v==null?'':String(v);campo.className='sp-editor';
      wrap=document.createElement('span');wrap.className='sp-edit-wrap';wrap.appendChild(campo);
      inpNova=document.createElement('input');inpNova.type='text';inpNova.className='sp-editor';inpNova.placeholder='Nome da nova opção';inpNova.hidden=true;wrap.appendChild(inpNova);
      campo.addEventListener('change',function(){inpNova.hidden=campo.value!=='__nova';if(!inpNova.hidden)inpNova.focus();});
      ler=function(){if(campo.value==='__nova'){var n=inpNova.value.trim();if(!n)throw new Error('Escreva o nome da nova opção.');return {__nova:n};}return campo.value||null;};
      bruto=function(){return campo.value+'\u0001'+inpNova.value;};
      definir=function(b){var p=String(b).split('\u0001');if(Array.from(campo.options).some(function(o){return o.value===p[0];}))campo.value=p[0];inpNova.value=p[1]||'';inpNova.hidden=campo.value!=='__nova';};
    }else if(c.tipo==='sim_nao'){
      campo=document.createElement('select');campo.className='sp-editor';campo.innerHTML='<option value="">— vazio —</option><option value="true">Sim</option><option value="false">Não</option>';
      campo.value=v===true||v==='true'?'true':v===false||v==='false'?'false':'';
      ler=function(){return campo.value===''?null:campo.value==='true';};bruto=function(){return campo.value;};definir=function(b){campo.value=b;};
    }else if(c.tipo==='link'){
      campo=document.createElement('input');campo.type='url';campo.className='sp-editor';campo.placeholder='https://...';campo.value=Array.isArray(v)&&v[0]?v[0].url:'';
      ler=function(){var u=campo.value.trim();if(!u)return null;if(!/^https?:\/\//i.test(u))throw new Error('O link precisa começar com https://');var t=Array.isArray(v)&&v[0]&&v[0].texto&&v[0].texto!==v[0].url?v[0].texto:u;return [{url:u,texto:t}];};
      bruto=function(){return campo.value;};definir=function(b){campo.value=b;};
    }else if(ehHonorario(c)){
      var hc=campoHonorario(v,causaFn);campo=hc.input;wrap=hc.wrap;ler=hc.ler;
      bruto=function(){return campo.value;};definir=function(b){campo.value=b;};
    }else{
      campo=document.createElement('input');campo.className='sp-editor';campo.type=c.tipo==='data'?'date':'text';
      campo.value=v==null?'':(c.tipo==='data'?String(v).slice(0,10):String(v));
      aplicarMascara(campo,c,v);
      ler=function(){var x=campo.value.trim();if(!x)return null;var m=tipoMascara(c);return m==='cpf'||m==='cnj'||m==='tel'?formatar(m,x):x;};
      bruto=function(){return campo.value;};definir=function(b){campo.value=b;};
    }
    var inicial;try{inicial=ler();}catch(e){inicial=v;}
    return {campo:wrap||campo,ler:ler,bruto:bruto,definir:definir,mudou:function(novo){return novo&&novo.__nova?true:!mesmoValor(novo,inicial);}};
  }
  function controleExtra(x){
    var campo=document.createElement('input');campo.className='sp-editor';
    var ler;
    if(x.tipo==='data'){
      campo.type='date';campo.value=x.valor?String(x.valor).slice(0,10):'';
      ler=function(){if(!campo.value)throw new Error('Informe a data de início do processo.');return campo.value;};
    }else{
      campo.type='text';campo.inputMode='decimal';campo.placeholder='Ex.: 20';campo.value=x.valor==null?'':String(x.valor).replace('.',',');
      ler=function(){var t=campo.value.trim();if(!t)return null;var n=parseFloat(t.replace('%','').replace(',','.'));if(isNaN(n)||n<0||n>100)throw new Error('O percentual de honorários deve ficar entre 0 e 100.');return n;};
    }
    return {campo:campo,ler:ler,bruto:function(){return campo.value;},definir:function(b){campo.value=b;},mudou:function(novo){return !mesmoValor(novo,x.valor==null||x.valor===''?null:(x.tipo==='data'?String(x.valor).slice(0,10):Number(x.valor)));}};
  }
  async function fichaDados(el,processoId,opts){
    opts=opts||{};estilos();
    try{
      if(!cols.length)await carregarColunas();
      var cat=await catalogosFicha();
      var r=await _sb.rpc('lista_buscar',{p_tela:'todas',p_filtros:[{coluna:'processo.id',op:'igual',valor:processoId}],p_ordem:[],p_busca:null,p_limite:1,p_inicio:0});
      if(r.error)throw r.error;
      var row=(r.data&&r.data.linhas||[])[0];if(!row)return false;
      if(opts.ativo&&!opts.ativo())return false;
    }catch(e){console.warn('Dados do processo:',e);return false;}
    var sig=row.sigilo&&!opts.podeEditarDados;
    var capt=row.fase==='captacao';
    var editando=opts.editando===true;
    var cs=cols.filter(function(c){if(!c.ativo||!(c.escopo==='ambos'||c.escopo===row.fase)||c.campo_sistema==='processo.fase')return false;
        // Na Captação: as colunas da planilha de captação e, das outras, só as que estiverem preenchidas
        if(capt&&c.ordem_captacao==null&&c.ordem<100){var v0=valorLinha(row,c);return !(v0==null||v0===''||(Array.isArray(v0)&&!v0.length));}
        return true;}).sort(function(a,b){return ordemCol(a,row.fase)-ordemCol(b,row.fase);});
    var sensiveis=['processo.numero','processo.tese','processo.responsavel','processo.valor_causa','processo.valor_precatorio'];
    var podeEd=function(c){if(!opts.podeEditar||sig)return false;if(SISTEMA_SO_LEITURA.indexOf(c.campo_sistema)!==-1)return false;if(sensiveis.indexOf(c.campo_sistema)!==-1&&!opts.podeEditarDados)return false;return true;};
    var extras=(opts.extras||[]).map(function(x){return {id:x.id,nome:x.nome,texto:x.texto||'',tipo:x.tipo,valor:x.valor,editavel:!!x.editavel&&!sig};});
    var campos={};cs.forEach(function(c){campos[c.id]={c:c};});extras.forEach(function(x){campos[x.id]={x:x};});
    // Resumo: só os campos escolhidos, na ordem escolhida; "Todos os dados" tem sempre todos, numerados na ordem da planilha
    var chaveFixos='saga-ficha-ordem-'+(capt?'captacao-':'')+(opts.usuarioId||''),chaveAntiga='saga-ficha-campos-'+(capt?'captacao-':'')+(opts.usuarioId||''),chaveAberto='saga-ficha-todos-aberto';
    var PADRAO=capt?['processo.numero','processo.captador','processo.valor_precatorio','processo.status','processo.tese','#Competência','@captacao.data_retorno','@captacao.etiquetas']
      :['processo.tese','processo.responsavel','processo.valor_precatorio','processo.valor_causa','processo.numero','extra:Honorários','extra:Data de início'];
    var ehPadrao=function(c,k){return k.indexOf('extra:')===0?false:(c.campo_sistema===k||(!c.campo_sistema&&!c.chave&&k==='#'+c.nome)||(c.chave&&k==='@'+c.chave));};
    var ordem=null;
    try{var s1=JSON.parse(localStorage.getItem(chaveFixos)||'null');if(Array.isArray(s1))ordem=s1;else{var s0=JSON.parse(localStorage.getItem(chaveAntiga)||'null');if(Array.isArray(s0))ordem=s0;}}catch(e){}
    if(!ordem){ordem=[];PADRAO.forEach(function(k){if(k.indexOf('extra:')===0){ordem.push(k);return;}var c=cs.find(function(x){return ehPadrao(x,k);});if(c)ordem.push(c.id);});}
    ordem=ordem.filter(function(id,i){return campos[id]&&ordem.indexOf(id)===i;});
    var salvarOrdem=function(){try{localStorage.setItem(chaveFixos,JSON.stringify(ordem));}catch(e){}};
    var no_resumo=function(id){return ordem.indexOf(id)!==-1;};
    var rotulo=function(id){return campos[id].c?nomeCol(campos[id].c,row.fase):campos[id].x.nome;};
    // texto/HTML de leitura
    var valorHtml=function(c){
      var v=valorLinha(row,c),t=sig&&c.campo_sistema!=='pessoa.nome'?'••••':textoLinha(row,c,v);
      if(c.tipo==='link'&&!sig&&Array.isArray(v)&&v.length)return v.map(function(l){var u=/^https?:\/\//i.test(l.url||'')?l.url:'';return u?'<a href="'+h(u)+'" target="_blank" rel="noopener noreferrer" class="sp-link">'+h(l.texto||l.url)+'</a>':'';}).join(' · ');
      var cor=c.campo_sistema==='processo.status'?row.status_cor:c.campo_sistema==='processo.situacao_acao'?row.situacao_acao_cor:(c.tipo==='opcao'&&!c.campo_sistema?((c.opcoes||[]).find(function(o){return String(o.id)===String(v);})||{}).cor:null);
      return t?(cor?'<span class="sp-selo"><i style="background:'+h(cor)+'"></i>'+h(t)+'</span>':h(t)):'<span class="sp-vazio">—</span>';
    };
    // um cartão de dado; "tudo" = dentro de Todos os dados (numerado)
    var cartao=function(id,tudo,num){
      var f=campos[id],c=f.c,x=f.x,editavelAqui=editando&&(c?podeEd(c):x.editavel)&&(!tudo||!no_resumo(id));
      var valor=c?valorHtml(c):(x.texto?h(x.texto):'<span class="sp-vazio">—</span>');
      var ferr='';
      if(editando){
        if(!tudo){var i=ordem.indexOf(id);ferr='<span class="sp-ferr"><button type="button" data-sp-mover="-1" data-id="'+h(id)+'" title="Mover para antes" aria-label="Mover para antes"'+(i===0?' disabled':'')+'>◀</button><button type="button" data-sp-mover="1" data-id="'+h(id)+'" title="Mover para depois" aria-label="Mover para depois"'+(i===ordem.length-1?' disabled':'')+'>▶</button><button type="button" data-sp-fixar="'+h(id)+'" title="Tirar do resumo (continua em Todos os dados)" aria-label="Tirar do resumo">×</button></span>';}
        else ferr='<span class="sp-ferr"><button type="button" data-sp-fixar="'+h(id)+'" class="sp-fx'+(no_resumo(id)?' ligado':'')+'" title="'+(no_resumo(id)?'Tirar do resumo':'Mostrar no resumo')+'">'+(no_resumo(id)?'No resumo ×':'+ Resumo')+'</button></span>';
      }
      // botãozinho de copiar ao lado do valor (só na leitura; links e dados em sigilo não)
      var copiar='';
      if(!editando&&window.sagaIconeCopiar){
        var puro=c?(c.tipo==='link'||(sig&&c.campo_sistema!=='pessoa.nome')?'':textoLinha(row,c,valorLinha(row,c))):(x.texto||'');
        if(puro&&!/^(não informad[oa]|n\/d|—|-)$/i.test(String(puro).trim()))copiar=sagaIconeCopiar(puro,rotulo(id));
      }
      return '<div class="campo-dado'+(tudo?' sp-tudo-item':'')+'" data-sp-campo="'+h(id)+'"><div class="campo-dado-label">'+(tudo?'<span class="sp-num">'+num+'</span>':'')+h(rotulo(id))+ferr+'</div><div class="campo-dado-valor" data-sp-ficha="'+h(id)+'">'+(editavelAqui?'':valor+copiar)+'</div></div>';
    };
    var resumoHtml=ordem.length?ordem.map(function(id){return cartao(id,false);}).join(''):'<div class="sp-vazio" style="grid-column:1/-1">Nenhum campo no resumo.'+(editando?' Em "Todos os dados", use + Resumo.':'')+'</div>';
    var aberto=false;try{aberto=localStorage.getItem(chaveAberto)==='1';}catch(e){}
    var tudoIds=cs.map(function(c){return c.id;}).concat(extras.map(function(x){return x.id;}));
    el.classList.add('sp-ficha');el.classList.toggle('sp-ficha-editando',editando);
    el.innerHTML=resumoHtml+
      '<div class="sp-ficha-barra"><button type="button" class="sp-ficha-toggle" aria-expanded="'+aberto+'">'+(aberto?'▾':'▸')+' Todos os dados do processo ('+tudoIds.length+')</button>'+
      (editando?'<button type="button" class="sp-ficha-padrao" title="Voltar aos campos de antes">Voltar ao padrão</button>':'')+'</div>'+
      '<div class="sp-ficha-todos"'+(aberto?'':' hidden')+'>'+(editando?'<div class="sp-ficha-dica">Os campos que já estão no resumo são editados lá em cima. Use <b>+ Resumo</b> para trazer um campo para o resumo.</div>':'')+tudoIds.map(function(id,i){return cartao(id,true,i+1);}).join('')+'</div>';
    el.querySelector('.sp-ficha-toggle').onclick=function(){var box=el.querySelector('.sp-ficha-todos'),abrir=box.hidden;box.hidden=!abrir;this.setAttribute('aria-expanded',abrir);this.textContent=(abrir?'▾':'▸')+this.textContent.slice(1);try{localStorage.setItem(chaveAberto,abrir?'1':'0');}catch(e){}
      if(abrir&&!(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches)box.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:240,easing:'cubic-bezier(.2,1.2,.4,1)'});};
    // as caixas de edição precisam sobreviver a recarregar o desenho: guardamos o que foi digitado antes de redesenhar
    var controles={};
    var redesenhar=function(){var pend=lerPendentes();opts.rascunho=pend;fichaDados(el,processoId,opts);};
    var lerPendentes=function(){var o={};Object.keys(controles).forEach(function(id){try{o[id]=controles[id].bruto();}catch(e){}});return o;};
    if(editando){
      var pad=el.querySelector('.sp-ficha-padrao');if(pad)pad.onclick=function(){ordem=null;try{localStorage.removeItem(chaveFixos);localStorage.removeItem(chaveAntiga);}catch(e){}opts.rascunho=lerPendentes();fichaDados(el,processoId,opts);};
      el.querySelectorAll('[data-sp-fixar]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var id=b.dataset.spFixar,i=ordem.indexOf(id);if(i>=0)ordem.splice(i,1);else ordem.push(id);salvarOrdem();redesenhar();};});
      el.querySelectorAll('[data-sp-mover]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var id=b.dataset.id,i=ordem.indexOf(id),j=i+Number(b.dataset.spMover);if(i<0||j<0||j>=ordem.length)return;ordem.splice(j,0,ordem.splice(i,1)[0]);salvarOrdem();redesenhar();};});
      var opcoesFicha=function(c){
        if(c.campo_sistema==='pessoa.uf')return UFS.map(function(u){return {id:u,nome:u};});
        if(c.campo_sistema==='processo.status')return cat.status.filter(function(s){return s.ativo!==false&&s.fase===row.fase;}).map(function(s){return {id:s.id,nome:s.nome};});
        if(c.campo_sistema==='processo.tese')return cat.teses.filter(function(t){return t.ativo!==false;}).map(function(t){return {id:t.id,nome:t.nome};});
        if(c.campo_sistema==='processo.area')return cat.areas.filter(function(a){return a.ativo!==false;}).map(function(a){return {id:a.id,nome:a.nome};});
        if(c.campo_sistema==='processo.situacao_acao')return situacoes.filter(function(s){return s.ativo!==false;}).map(function(s){return {id:s.id,nome:s.nome};});
        if(c.campo_sistema==='pessoa.situacao_vital')return [{id:'vivo',nome:'Vivo'},{id:'falecido',nome:'Falecido'}];
        if(c.tipo==='usuario')return cat.usuarios.map(function(u){return {id:u.id,nome:u.nome_completo};});
        if(c.tipo==='opcao')return opcoesDaColuna(c);
        return null;
      };
      var rasc=opts.rascunho||{};
      el.querySelectorAll('[data-sp-ficha]').forEach(function(td){
        var id=td.dataset.spFicha,f=campos[id];if(!f||td.innerHTML.trim()!=='')return;
        var ctl=f.c?controleCampo(f.c,valorLinha(row,f.c),textoLinha(row,f.c,valorLinha(row,f.c)),opcoesFicha(f.c),f.c.tipo==='opcao'&&!f.c.campo_sistema&&cat.gerenciar,function(){return row.valor_causa;}):controleExtra(f.x);
        td.appendChild(ctl.campo);controles[id]=ctl;
        if(Object.prototype.hasOwnProperty.call(rasc,id))ctl.definir(rasc[id]);
      });
      opts.rascunho=null;
      // Salvar tudo de uma vez (o botão Salvar da ficha chama isto)
      el._sagaSalvar=async function(){
        var mudancas=[],extrasMud={},sistema=false;
        for(var id in controles){
          var ctl=controles[id],f=campos[id],novo;
          try{novo=ctl.ler();}catch(e){aviso(h(e.message),true);return false;}
          if(f.x){if(!ctl.mudou(novo))continue;extrasMud[f.x.tipo]=novo;continue;}
          if(!ctl.mudou(novo))continue;
          mudancas.push({c:f.c,novo:novo,ctl:ctl});
        }
        if(!mudancas.length&&!Object.keys(extrasMud).length){return true;}
        try{
          for(var k=0;k<mudancas.length;k++){
            var m=mudancas[k],valor=m.novo,c2=m.c;
            if(valor&&valor.__nova){
              var lista=(c2.opcoes||[]).map(function(o){return {id:o.id,nome:o.nome,cor:o.cor,ativo:o.ativo!==false};}).concat([{nome:valor.__nova}]);
              await rpcOk('lista_coluna_salvar',{p_id:c2.id,p_nome:c2.nome,p_opcoes:lista});await carregarColunas();
              c2=cols.find(function(x){return x.id===c2.id;})||c2;var nova=(c2.opcoes||[]).find(function(o){return norm(o.nome)===norm(valor.__nova);});valor=nova?nova.id:null;
            }
            await rpcOk('lista_salvar_celula',{p_processo_id:processoId,p_coluna_id:c2.id,p_valor:valor});
            if(m.c.campo_sistema)sistema=true;
          }
          if(Object.keys(extrasMud).length){var ok=await opts.salvarExtras(extrasMud);if(ok===false)return false;sistema=true;}
        }catch(e){aviso(h(e.message||'Não foi possível salvar.'),true);return false;}
        aviso('Dados do processo atualizados.');
        if(sistema&&opts.aoMudarSistema)opts.aoMudarSistema();
        return true;
      };
    }else{el._sagaSalvar=null;}
    return true;
  }
  function formatarCampo(tipo,v){return formatar(tipo,v);}

  return {retornoDe:function(p){var c=colPorChave('captacao.data_retorno'),v=c&&(p.campos||{})[c.id];return v?String(v).slice(0,10):null;},renderFunil:renderFunil,mesmaEtapa:mesmaEtapa,fichaDados:fichaDados,formatar:formatarCampo,UFS:UFS,iniciar:iniciar,passa:passa,ordenar:ordenar,renderTabela:renderTabela,cartoesHtml:cartoesHtml,kanbanAgrupado:kanbanAgrupado,soltarNoGrupo:soltarNoGrupo,limpar:limpar,pronta:function(){return pronta;},_gerenciar:false};
})();
