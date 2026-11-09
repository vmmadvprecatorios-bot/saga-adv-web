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
  // Marca de "vazio" nos filtros. Antes começava com um caractere invisível (\u0000) que o navegador trocava por "�"
  // dentro das caixinhas de marcar: escolher só "(Vazias)" escondia tudo (vistoria 09/11). VAZIO_ANTIGO converte filtros guardados.
  var VAZIO='__saga_vazio__',VAZIO_ANTIGO='\u0000vazio';
  function trocaVazioAntigo(lista){return (lista||[]).map(function(v){return v===VAZIO_ANTIGO||v==='\ufffdvazio'?VAZIO:v;});}
  var SISTEMA_SO_LEITURA=['processo.fase','processo.criado_em','processo.atualizado_em','processo.providencia'];
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
      case 'processo.providencia':return p.providencia_atual;
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
      case 'processo.providencia':return v+(p&&p.providencia_prazo?' · até '+String(p.providencia_prazo).slice(0,10).split('-').reverse().slice(0,2).join('/'):'');
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

  function colunasDaTela(){var lista=cols.filter(function(c){return c.ativo&&(c.escopo==='ambos'||c.escopo===FASE_FIXA)&&!(FASE_FIXA==='juridico'&&SO_CAPTACAO.indexOf(c.campo_sistema)!==-1);}).sort(function(a,b){return ordemCol(a)-ordemCol(b);});
    // ordem própria da pessoa (arrastando o cabeçalho); colunas novas entram no lugar de sempre
    if(ordemCols&&ordemCols.length){var pos={};ordemCols.forEach(function(id,i){pos[id]=i;});var base=lista.slice();lista.sort(function(a,b){var pa=pos[a.id],pb=pos[b.id];if(pa!=null&&pb!=null)return pa-pb;return base.indexOf(a)-base.indexOf(b);});}
    return lista;}
  function visiveis(){var oc=ocultas||{};return colunasDaTela().filter(function(c){return !oc[c.id];});}
  function lerPreferencias(){
    try{var s=JSON.parse(localStorage.getItem(CHAVE())||'null');if(s){ocultas=s.ocultas||{};filtros={};Object.keys(s.filtros||{}).forEach(function(k){filtros[k]=new Set(trocaVazioAntigo(s.filtros[k]));});ordem=s.ordem||null;protocolo=s.protocolo||'';retorno=s.retorno||'';minhas=!!s.minhas;ordemCols=Array.isArray(s.ordemCols)?s.ordemCols:null;}}catch(e){}
    if(!ocultas)ocultas=padraoOcultas();
  }
  // Na Captação, o padrão mostra só as colunas da planilha de captação; as outras ficam em "Colunas"
  function padraoOcultas(){var o={};if(FASE_FIXA==='captacao')colunasDaTela().forEach(function(c){if(c.ordem_captacao==null)o[c.id]=true;});return o;}
  function guardar(){
    try{var f={};Object.keys(filtros).forEach(function(k){f[k]=Array.from(filtros[k]);});localStorage.setItem(CHAVE(),JSON.stringify({ocultas:ocultas,filtros:f,ordem:ordem,protocolo:protocolo,retorno:retorno,minhas:minhas,ordemCols:ordemCols}));}catch(e){}
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
    renderTotais(tabela,cs,lista);aplicarLarguras();aplicarAltura();atualizarFixas();restaurarSelecao();
    ligarArrastarColunas(thead);restaurarMarcados();
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
  // Autoajuste como no Excel (08/11): todas as colunas ao conteúdo, de uma vez (mede cada coluna sem limite e grava)
  function ajustarTodasAoConteudo(){
    var cs=colunasDaTela(),l=lerLarguras();
    cs.forEach(function(c){delete l[c.id];});aplicarLarguras();
    var tmp=document.createElement('style');tmp.textContent='.sp-tabela td,.sp-tabela th{max-width:none!important}';document.head.appendChild(tmp);
    cs.forEach(function(c){var th=document.querySelector('.sp-tabela th[data-sp-col="'+idCss(c.id)+'"]');var w=th?Math.ceil(th.getBoundingClientRect().width):0;if(w)l[c.id]=Math.max(70,Math.min(640,w+2));});
    tmp.remove();aplicarLarguras();guardarLarguras();atualizarFixas();
  }
  // Altura das linhas: Compacta / Normal / Confortável, ajuste fino (px) ou "ao conteúdo" (o texto quebra em várias linhas)
  var CHAVE_ALT=function(){return CHAVE_LARG()+'-altura';};
  var ALTURAS={compacta:32,normal:0,confortavel:66};
  function lerAltura(){try{return JSON.parse(localStorage.getItem(CHAVE_ALT())||'null')||{modo:'normal'};}catch(e){return {modo:'normal'};}}
  function guardarAltura(a){try{localStorage.setItem(CHAVE_ALT(),JSON.stringify(a));}catch(e){}}
  function aplicarAltura(){
    var st=document.getElementById('spAltura');if(!st){st=document.createElement('style');st.id='spAltura';document.head.appendChild(st);}
    var a=lerAltura(),css='';
    if(a.modo==='auto')css='.sp-tabela tbody td{white-space:normal!important;overflow-wrap:anywhere;text-overflow:clip!important;vertical-align:top;padding-top:7px!important;padding-bottom:7px!important;line-height:1.4}';
    else{var px=a.modo==='manual'?Number(a.px)||0:ALTURAS[a.modo]||0;
      if(px)css='.sp-tabela tbody td{height:'+px+'px;padding-top:0!important;padding-bottom:0!important}'+(px<34?'.sp-tabela tbody td{font-size:11.5px}':'');}
    st.textContent=css;
    if(typeof atualizarFixas==='function')atualizarFixas();
  }
  function menuAjuste(ancora){
    fecharMenu();
    var m=document.createElement('div');m.className='sp-menu';m.style.width='300px';
    var desenhar=function(){
      var a=lerAltura(),px=a.modo==='manual'?a.px:(ALTURAS[a.modo]||40);
      m.innerHTML='<div class="sp-menu-tit">Largura das colunas</div>'+
        '<button type="button" class="sp-op" data-aj="todas">Ajustar todas ao conteúdo</button>'+
        '<button type="button" class="sp-op" data-aj="padrao">Voltar à largura padrão</button>'+
        '<p class="sp-ajuda" style="margin:2px 4px 8px">À mão: arraste a borda do título da coluna. Duplo clique na borda ajusta só aquela coluna.</p>'+
        '<div class="sp-menu-tit">Altura das linhas</div>'+
        '<div class="sp-aj-alturas">'+[['compacta','Compacta'],['normal','Normal'],['confortavel','Confortável'],['auto','Ao conteúdo']].map(function(o){return '<button type="button" class="sp-pill'+(a.modo===o[0]?' ativo':'')+'" data-alt="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>'+
        '<label class="sp-aj-fino">Ajuste fino <input type="range" min="26" max="90" step="2" value="'+px+'" data-alt-px aria-label="Altura das linhas em pixels"'+(a.modo==='auto'?' disabled':'')+'><span>'+(a.modo==='auto'?'automática':px+' px')+'</span></label>'+
        '<p class="sp-ajuda" style="margin:2px 4px 4px">"Ao conteúdo" quebra o texto em várias linhas para caber tudo, como o Autoajuste do Excel.</p>';
    };
    desenhar();
    document.body.appendChild(m);menuAberto=m;
    var r=ancora.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-308))+'px';caberNaTela(m,r);
    m.addEventListener('click',function(e){
      e.stopPropagation();var t=e.target.closest('button');if(!t)return;
      if(t.dataset.aj==='todas'){ajustarTodasAoConteudo();aviso('Colunas ajustadas ao conteúdo.');return;}
      if(t.dataset.aj==='padrao'){larguraPadrao();aviso('Larguras das colunas voltaram ao original.');return;}
      if(t.dataset.alt){guardarAltura({modo:t.dataset.alt});aplicarAltura();desenhar();}
    });
    m.addEventListener('input',function(e){var i=e.target.closest('[data-alt-px]');if(!i)return;guardarAltura({modo:'manual',px:Number(i.value)});aplicarAltura();var sp=i.parentNode.querySelector('span');if(sp)sp.textContent=i.value+' px';m.querySelectorAll('[data-alt]').forEach(function(b){b.classList.remove('ativo');});});
  }
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
  // Como no Excel: a seleção PARA na borda (não dá a volta para a outra linha); com Ctrl salta até a primeira/última célula
  function moverSel(dl,dc,ate){
    var td=celulaSel();if(!td)return false;
    var tr=td.closest('tr'),cels=Array.prototype.slice.call(tr.querySelectorAll('td[data-sp-cel]')),i=cels.indexOf(td);
    if(dc){var j=ate?(dc>0?cels.length-1:0):i+dc;
      if(j<0||j>=cels.length||j===i)return true;   // parede: fica na última (ou na primeira) célula
      selecionar(cels[j],true);return true;}
    var linhas=Array.prototype.filter.call(tr.parentNode.children,function(x){return x.querySelector('td[data-sp-cel]');});
    var alvo=ate?(dl>0?linhas[linhas.length-1]:linhas[0]):(dl>0?tr.nextElementSibling:tr.previousElementSibling);
    while(alvo&&!ate&&!alvo.querySelector('td[data-sp-cel]'))alvo=dl>0?alvo.nextElementSibling:alvo.previousElementSibling;
    if(!alvo||alvo===tr)return true;
    var n=alvo.querySelector('td[data-sp-cel="'+idCss(sel.col)+'"]');if(n)selecionar(n,true);return true;
  }
  function textoDaCelula(td){return td.getAttribute('title')||td.innerText||'';}
  function ligarTeclado(tabela){
    tabela.addEventListener('click',function(e){
      var td=e.target.closest('td[data-sp-cel]');
      if(!td||e.target.closest('a,button,input,select,.sp-editor'))return;
      selecionar(td,false);
    });
    document.addEventListener('mousedown',function(e){if(sel&&!e.target.closest('#listaView table')&&!e.target.closest('.sp-menu,.modal-overlay,.toast,.sp-foco-menu,[data-foco]'))selecionar(null);});
    document.addEventListener('keydown',function(e){
      if(!sel||editando||menuAberto||e.altKey)return;
      var t=e.target;if(t&&(t.closest('input,textarea,select,[contenteditable="true"]')))return;
      if(document.querySelector('.modal-overlay.ativo,.sp-ov'))return;
      var td=celulaSel();if(!td){sel=null;return;}
      var k=e.key,feito=true;
      if((e.ctrlKey||e.metaKey)&&(k==='c'||k==='C')){var txt=textoDaCelula(td);if(txt&&txt!=='—'&&navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){aviso('Copiado: '+h(txt.length>40?txt.slice(0,40)+'…':txt));},function(){});}}
      else if((e.ctrlKey||e.metaKey)&&/^Arrow/.test(k)){if(k==='ArrowDown')moverSel(1,0,true);else if(k==='ArrowUp')moverSel(-1,0,true);else if(k==='ArrowRight')moverSel(0,1,true);else moverSel(0,-1,true);}
      else if((e.ctrlKey||e.metaKey)&&(k==='Home'||k==='End')){var linhasT=Array.prototype.filter.call(td.closest('tbody').children,function(x){return x.querySelector('td[data-sp-cel]');});var lin=k==='Home'?linhasT[0]:linhasT[linhasT.length-1];var cs=lin&&lin.querySelectorAll('td[data-sp-cel]');if(cs&&cs.length)selecionar(k==='Home'?cs[0]:cs[cs.length-1],true);}
      else if(e.ctrlKey||e.metaKey)feito=false;
      else if(k==='Home'||k==='End'){var csH=td.closest('tr').querySelectorAll('td[data-sp-cel]');selecionar(k==='Home'?csH[0]:csH[csH.length-1],true);}
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
  function redesenhar(){renderBarra();if(state.view==='lista')renderLista();else renderKanban();if(typeof atualizarContagem==='function')atualizarContagem();try{pintarLote();}catch(e){}}
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
  // Menu sempre inteiro na tela: abre para baixo; se não couber, para cima; se ainda não couber, rola por dentro
  function caberNaTela(m,r){
    var h=m.offsetHeight,baixo=window.innerHeight-r.bottom-12,cima=r.top-12;
    if(h<=baixo){m.style.top=(r.bottom+4)+'px';return;}
    if(h<=cima){m.style.top=(r.top-4-h)+'px';return;}
    var usar=Math.max(baixo,cima);m.style.maxHeight=usar+'px';m.style.overflowY='auto';
    m.style.top=(baixo>=cima?r.bottom+4:r.top-4-usar)+'px';
  }
  function menuEscolherColunaFiltro(ancora){
    fecharMenu();
    var cs=colunasDaTela().filter(function(c){return c.tipo!=='link';});
    var m=document.createElement('div');m.className='sp-menu';m.style.width='270px';
    m.innerHTML='<div class="sp-menu-tit">Filtrar por</div><input type="search" class="sp-busca" placeholder="Procurar coluna..." data-q>'+
      '<div class="sp-lista">'+cs.map(function(c){return '<button type="button" class="sp-item sp-col-opcao" data-c="'+h(c.id)+'"><span>'+h(nomeCol(c))+'</span>'+(filtros[c.id]?'<em>✓</em>':'')+'</button>';}).join('')+'</div>';
    document.body.appendChild(m);menuAberto=m;
    var r=ancora.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-278))+'px';caberNaTela(m,r);
    var q=m.querySelector('[data-q]');q.focus();
    q.oninput=function(){var t=norm(q.value);m.querySelectorAll('.sp-col-opcao').forEach(function(b){b.hidden=t&&norm(b.textContent).indexOf(t)<0;});};
    m.addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(!b)return;e.stopPropagation();var c=cols.find(function(x){return x.id===b.dataset.c;});if(c)abrirMenu(c,ancora);});
  }
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
    m.style.width=w+'px';m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-w-8))+'px';caberNaTela(m,r);
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
    // entrada do menu animada pelo saga_guard.js (animar aqui dobrava o efeito)
    if(false)m.animate([{opacity:0,transform:'translateY(-6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,1.4,.4,1)'});
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
      // porcentagem de verdade (honorários etc.): de 0 a 100, até 2 casas depois da vírgula (09/11: aceitava 2050%)
      case 'pct100':{var t=String(v==null?'':v).replace(/\./g,',').replace(/[^\d,]/g,'').replace(/,(?=.*,)/g,'');var pp=t.split(',');pp[0]=pp[0].replace(/^0+(?=\d)/,'');if(pp[1]!=null)pp[1]=pp[1].slice(0,2);t=pp.join(',');var nn=Number(t.replace(',','.'));if(isFinite(nn)&&nn>100)t='100';return t;}
    }
    return v;
  }
  function tipoMascara(c){
    if(c.campo_sistema==='pessoa.cpf')return 'cpf';
    if(c.campo_sistema==='processo.numero')return 'cnj';
    if(c.campo_sistema==='pessoa.telefone')return 'tel';
    if(c.tipo==='moeda')return 'moeda';
    if(c.tipo==='porcentagem')return 'pct100';
    if(c.tipo==='numero')return 'pct';
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
    inp.addEventListener('input',function(){var fimAntes=inp.value.length-inp.selectionEnd;inp.value=formatar(modo==='reais'?'moeda':'pct100',inp.value);var pos=Math.max(0,inp.value.length-fimAntes);try{inp.setSelectionRange(pos,pos);}catch(e){}desenhar();});
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
    inp.inputMode=t==='pct'||t==='pct100'?'decimal':'numeric';
    if(t==='moeda')inp.value=v==null||v===''?'':formatar('moeda',Number(v).toFixed(2));
    else if(t==='pct'||t==='pct100')inp.value=v==null?'':String(v).replace('.',',');
    else inp.value=formatar(t,v==null?'':v);
    inp.placeholder={cpf:'000.000.000-00',cnj:'0000000-00.0000.0.00.0000',tel:'(00) 00000-0000',moeda:'0,00',pct:'0',pct100:'0,00'}[t]||'';
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
  /* ----- Cor do foco da planilha (cruz da célula selecionada): padrão do tema ou cor escolhida, guardada no navegador de cada pessoa ----- */
  var CORES_FOCO=[['#2f6cd6','Azul'],['#1f8a5b','Verde'],['#d4a017','Amarelo'],['#e07b2f','Laranja'],['#d6457a','Rosa'],['#7b5cd6','Roxo'],['#c0392b','Vermelho'],['#6b7280','Cinza']];
  function corFoco(){try{return localStorage.getItem('saga-foco-cor')||'';}catch(e){return '';}}
  function aplicarCorFoco(){var c=corFoco();if(/^#[0-9a-f]{6}$/i.test(c))document.documentElement.style.setProperty('--sp-foco-escolhido',c);else document.documentElement.style.removeProperty('--sp-foco-escolhido');}
  function definirCorFoco(c){try{if(c)localStorage.setItem('saga-foco-cor',c);else localStorage.removeItem('saga-foco-cor');}catch(e){}aplicarCorFoco();}
  aplicarCorFoco();
  var menuFoco=null;
  function fecharMenuFoco(){if(menuFoco){menuFoco.remove();menuFoco=null;document.removeEventListener('pointerdown',foraFoco,true);document.removeEventListener('keydown',escFoco,true);}}
  function foraFoco(e){if(menuFoco&&!menuFoco.contains(e.target)&&!e.target.closest('[data-foco]'))fecharMenuFoco();}
  function escFoco(e){if(e.key==='Escape'){e.stopPropagation();fecharMenuFoco();}}
  function abrirMenuFoco(btn){
    if(menuFoco){fecharMenuFoco();return;}
    var atual=corFoco(),m=document.createElement('div');m.className='sp-foco-menu';m.setAttribute('role','menu');m.setAttribute('aria-label','Cor do foco');
    m.innerHTML='<div class="tit">Cor do foco</div><button type="button" class="padrao'+(atual?'':' on')+'" data-padrao><span class="sp-foco-bola" style="background:var(--gold)"></span>Padrão do tema</button>'+
      '<div class="sp-foco-cores">'+CORES_FOCO.map(function(c){return '<button type="button" title="'+c[1]+'" aria-label="'+c[1]+'" data-cor="'+c[0]+'" style="--c:'+c[0]+'"'+(atual.toLowerCase()===c[0]?' class="on"':'')+'></button>';}).join('')+'</div>'+
      '<label class="sp-foco-outra"><input type="color" value="'+(atual||'#2f6cd6')+'" data-outra> Outra cor…</label>';
    document.body.appendChild(m);menuFoco=m;
    var r=btn.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.min(r.bottom+6,innerHeight-m.offsetHeight-8)+'px';
    m.addEventListener('click',function(e){
      if(e.target.closest('[data-padrao]')){definirCorFoco('');fecharMenuFoco();aviso('Foco na cor padrão do tema.');return;}
      var c=e.target.closest('[data-cor]');if(c){definirCorFoco(c.dataset.cor);fecharMenuFoco();aviso('Cor do foco alterada.');}
    });
    var outra=m.querySelector('[data-outra]');outra.addEventListener('input',function(e){definirCorFoco(e.target.value);});outra.addEventListener('change',function(e){definirCorFoco(e.target.value);aviso('Cor do foco alterada.');});
    setTimeout(function(){document.addEventListener('pointerdown',foraFoco,true);document.addEventListener('keydown',escFoco,true);},0);
  }
  function escolherColunas(){
    fecharMenu();
    var cs=colunasDaTela();
    var ov=document.createElement('div');ov.className='modal-overlay sp-ov';ov.style.display='flex';
    ov.innerHTML='<div class="modal sp-modal" role="dialog" aria-modal="true" aria-label="Colunas da lista"><div class="modal-head"><h3>Colunas da lista</h3><button class="modal-close" type="button" data-fechar>×</button></div>'+
      '<div class="modal-body"><p class="sp-ajuda">Mesma ordem da planilha do escritório. Marque as colunas que quer ver; vale só para você.</p>'+
      '<div class="sp-col-acoes"><button type="button" class="btn-secondary" data-todas>Mostrar todas</button><button type="button" class="btn-secondary" data-poucas>Só as principais</button><button type="button" class="btn-secondary" data-larg title="Volta todas as colunas à largura automática">Larguras originais</button></div>'+
      '<div class="sp-col-lista">'+cs.map(function(c){var ger=SagaPlanilha._gerenciar;return '<div class="sp-item sp-item-col" data-col="'+h(c.id)+'"><label><input type="checkbox" value="'+h(c.id)+'"'+(ocultas[c.id]?'':' checked')+(ocultavel(c)?'':' disabled')+'> <span>'+h(nomeCol(c))+'</span></label>'+
        (ger?'<span class="sp-col-ger"><button type="button" class="sp-ico" data-renomear="'+h(c.id)+'" title="Renomear coluna" aria-label="Renomear coluna">✎</button>'+(c.campo_sistema?'':'<button type="button" class="sp-ico" data-remover-col="'+h(c.id)+'" title="Remover coluna (os dados ficam guardados)" aria-label="Remover coluna">✕</button>')+'</span>':'')+'</div>';}).join('')+'</div>'+
      (SagaPlanilha._gerenciar?gerenciarColunasHtml():'')+
      '</div><div class="modal-foot"><button type="button" class="btn-primary" data-ok>Aplicar</button></div></div>';
    document.body.appendChild(ov);
    var fechar=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-fechar]'))fechar();});
    var PRINCIPAIS=['processo.numero','pessoa.nome','pessoa.cpf','processo.area','processo.tese','processo.status','processo.responsavel','processo.situacao_acao','processo.ultima_movimentacao','processo.captador'];
    ov.querySelector('[data-larg]').onclick=function(){larguraPadrao();aviso('Larguras das colunas voltaram ao original.');};
    ov.querySelector('[data-todas]').onclick=function(){ov.querySelectorAll('.sp-col-lista input').forEach(function(i){i.checked=true;});};
    ov.querySelector('[data-poucas]').onclick=function(){ov.querySelectorAll('.sp-col-lista input').forEach(function(i){var c=cols.find(function(x){return x.id===i.value;});i.checked=!ocultavel(c)||PRINCIPAIS.indexOf(c.campo_sistema)!==-1||/status da peti|tipo de a|compet/i.test(norm(c.nome));});};
    ov.querySelector('[data-ok]').onclick=function(){ocultas={};ov.querySelectorAll('.sp-col-lista input').forEach(function(i){if(!i.checked)ocultas[i.value]=true;});Object.keys(filtros).forEach(function(k){if(ocultas[k])delete filtros[k];});fechar();aplicar();};
    if(SagaPlanilha._gerenciar)ligarGerenciarColunas(ov,fechar);
  }
  /* ----- Criar, renomear, remover e restaurar colunas (administrador ou quem tem "gerenciar colunas") -----
     Remover só desativa: os valores ficam guardados e a coluna pode voltar. Colunas do sistema (nome, CPF, status...) só se escondem. */
  var TIPOS_COLUNA=[['texto','Texto'],['numero','Número'],['moeda','Valor em R$'],['porcentagem','Porcentagem'],['data','Data'],['sim_nao','Sim / Não'],['opcao','Lista de opções (menu)'],['usuario','Colaborador'],['link','Link']];
  function gerenciarColunasHtml(){
    var fase=FASE_FIXA==='captacao'?'Captação':'Jurídico';
    var removidas=cols.filter(function(c){return !c.ativo&&!c.campo_sistema;}).sort(function(a,b){return String(a.nome).localeCompare(String(b.nome),'pt-BR');});
    return '<div class="sp-nova-col"><div class="sp-nova-tit">+ Nova coluna</div>'+
      '<div class="sp-nova-grade"><input type="text" class="sp-editor" data-nc-nome maxlength="80" placeholder="Nome da coluna">'+
      '<select class="sp-editor" data-nc-tipo>'+TIPOS_COLUNA.map(function(t){return '<option value="'+t[0]+'">'+t[1]+'</option>';}).join('')+'</select>'+
      '<select class="sp-editor" data-nc-escopo><option value="ambos">Jurídico e Captação</option><option value="'+(FASE_FIXA==='captacao'?'captacao':'juridico')+'">Só '+fase+'</option><option value="'+(FASE_FIXA==='captacao'?'juridico':'captacao')+'">Só '+(FASE_FIXA==='captacao'?'Jurídico':'Captação')+'</option></select></div>'+
      '<textarea class="sp-editor" data-nc-opcoes rows="3" placeholder="Opções do menu, uma por linha" hidden></textarea>'+
      '<div class="sp-nova-rod"><span class="sp-ajuda">A coluna nova aparece na planilha e em "Todos os dados" da ficha do cliente.</span><button type="button" class="btn-primary" data-nc-criar>Criar coluna</button></div></div>'+
      (removidas.length?'<details class="sp-removidas"><summary>Colunas removidas ('+removidas.length+')</summary>'+removidas.map(function(c){return '<div class="sp-item sp-item-col"><span>'+h(c.nome)+'</span><button type="button" class="btn-secondary sp-btn" data-restaurar="'+h(c.id)+'">Restaurar</button></div>';}).join('')+'</details>':'');
  }
  function ligarGerenciarColunas(ov,fechar){
    var tipo=ov.querySelector('[data-nc-tipo]'),ops=ov.querySelector('[data-nc-opcoes]');
    tipo.onchange=function(){ops.hidden=tipo.value!=='opcao';};
    var reabrir=async function(msg){await carregarColunas();fechar();aplicar();escolherColunas();if(msg)aviso(msg);};
    ov.querySelector('[data-nc-criar]').onclick=async function(){
      var nome=ov.querySelector('[data-nc-nome]').value.trim();
      if(!nome){aviso('Escreva o nome da coluna.',true);ov.querySelector('[data-nc-nome]').focus();return;}
      var lista=null;
      if(tipo.value==='opcao'){lista=ops.value.split('\n').map(function(x){return x.trim();}).filter(Boolean).map(function(n){return {nome:n};});if(!lista.length){aviso('Escreva ao menos uma opção (uma por linha).',true);ops.focus();return;}}
      this.disabled=true;
      try{await rpcOk('lista_coluna_salvar',{p_id:null,p_nome:nome,p_tipo:tipo.value,p_escopo:ov.querySelector('[data-nc-escopo]').value,p_opcoes:lista,p_ativo:true});await reabrir('Coluna "'+h(nome)+'" criada.');}
      catch(e){this.disabled=false;aviso(h(e.message||'Não foi possível criar.'),true);}
    };
    ov.querySelectorAll('[data-renomear]').forEach(function(b){b.onclick=function(){
      var c=cols.find(function(x){return x.id===b.dataset.renomear;});if(!c)return;
      var item=b.closest('.sp-item-col'),span=item.querySelector('label span');
      var inp=document.createElement('input');inp.type='text';inp.className='sp-editor';inp.maxLength=80;inp.value=c.nome;span.replaceWith(inp);inp.focus();inp.select();
      var feito=false;
      var salvar=async function(){if(feito)return;feito=true;var n=inp.value.trim();
        if(!n||n===c.nome){inp.replaceWith(span);return;}
        try{await rpcOk('lista_coluna_salvar',{p_id:c.id,p_nome:n,p_tipo:null,p_escopo:null,p_opcoes:null,p_ativo:null});await reabrir('Coluna renomeada para "'+h(n)+'".');}
        catch(e){aviso(h(e.message||'Não foi possível renomear.'),true);inp.replaceWith(span);}};
      inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();salvar();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();feito=true;inp.replaceWith(span);}});
      inp.addEventListener('blur',function(){setTimeout(salvar,0);});
    };});
    ov.querySelectorAll('[data-remover-col]').forEach(function(b){b.onclick=async function(){
      var c=cols.find(function(x){return x.id===b.dataset.removerCol;});if(!c)return;
      var aqui=FASE_FIXA==='captacao'?'Captação':'Jurídico',outra=FASE_FIXA==='captacao'?'Jurídico':'Captação';
      // pergunta na própria linha: só desta planilha ou das duas (os dados ficam guardados)
      var item=b.closest('.sp-item-col'),ger=item.querySelector('.sp-col-ger');
      var soAqui=await new Promise(function(res){
        var q=document.createElement('span');q.className='sp-col-pergunta';
        q.innerHTML=(c.escopo==='ambos'?'<button type="button" class="btn-secondary sp-btn" data-r="aqui">Só da '+aqui+'</button><button type="button" class="btn-secondary sp-btn sp-perigo perigo" data-r="tudo">Das duas</button>':'<button type="button" class="btn-secondary sp-btn sp-perigo perigo" data-r="tudo">Remover</button>')+'<button type="button" class="sp-ico" data-r="nao" title="Cancelar">↩</button>';
        ger.hidden=true;item.classList.add('perguntando');item.appendChild(q);
        q.addEventListener('click',function(e){var x=e.target.closest('[data-r]');if(!x)return;q.remove();ger.hidden=false;item.classList.remove('perguntando');res(x.dataset.r==='nao'?null:x.dataset.r==='aqui');});
      });
      if(soAqui===null)return;
      try{
        if(soAqui)await rpcOk('lista_coluna_salvar',{p_id:c.id,p_nome:c.nome,p_tipo:null,p_escopo:FASE_FIXA==='captacao'?'juridico':'captacao',p_opcoes:null,p_ativo:null});
        else await rpcOk('lista_coluna_salvar',{p_id:c.id,p_nome:c.nome,p_tipo:null,p_escopo:null,p_opcoes:null,p_ativo:false});
        delete filtros[c.id];
        await reabrir('Coluna "'+h(c.nome)+'" removida'+(soAqui?' da '+aqui:'')+'.');
      }catch(e){aviso(h(e.message||'Não foi possível remover.'),true);}
    };});
    ov.querySelectorAll('[data-restaurar]').forEach(function(b){b.onclick=async function(){
      var c=cols.find(function(x){return x.id===b.dataset.restaurar;});if(!c)return;
      try{await rpcOk('lista_coluna_salvar',{p_id:c.id,p_nome:c.nome,p_tipo:null,p_escopo:null,p_opcoes:null,p_ativo:true});await reabrir('Coluna "'+h(c.nome)+'" de volta.');}
      catch(e){aviso(h(e.message||'Não foi possível restaurar.'),true);}
    };});
  }

  // ---------- barra (protocolados, colunas, filtros ativos) ----------
  function renderBarra(){
    renderAbas();
    var b=document.getElementById('spBarra');if(!b)return;
    var n=Object.keys(filtros).length+(ordem?1:0);
    var capt=FASE_FIXA==='captacao';
    // Grupos de botões que já estão na tela são reaproveitados (só troca o selecionado): assim o destaque desliza
    // inteiro, como nos outros botões do sistema (refazer o HTML a cada clique cortava o efeito no meio)
    var gruposAntes={};b.querySelectorAll('.sp-pills[role="group"]').forEach(function(g){gruposAntes[g.getAttribute('aria-label')]=g;});
    b.innerHTML=(capt?'<div class="sp-pills" role="group" aria-label="Data de retorno">'+[['','Todos os retornos'],['hoje','Retorno hoje'],['atrasados','Atrasados'],['semana','Próximos 7 dias']].map(function(o){return '<button type="button" class="sp-pill'+(retorno===o[0]?' ativo':'')+'" data-retorno="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>'+
        '<button type="button" class="sp-pill sp-pill-solta'+(minhas?' ativo':'')+'" data-minhas aria-pressed="'+minhas+'">Minhas fichas</button>'+
        (state.permissoes&&state.permissoes.criar?'<button type="button" class="btn-secondary sp-btn" data-importar title="Colar do Excel ou escolher um arquivo .xlsx/.csv">Importar planilha</button>':'')+'<button type="button" class="btn-secondary sp-btn" data-distribuir>Distribuir fichas</button>':
      '<div class="sp-pills" role="group" aria-label="Protocolo">'+[['','Todos'],['sim','Protocolados'],['nao','Não protocolados']].map(function(o){return '<button type="button" class="sp-pill'+(protocolo===o[0]?' ativo':'')+'" data-protocolo="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>'+
        (state.permissoes&&state.permissoes.criar?'<button type="button" class="btn-secondary sp-btn" data-importar title="Colar do Excel ou escolher um arquivo .xlsx/.csv">Importar planilha</button>':''))+
      '<div class="sp-pills sp-modo-cel" role="group" aria-label="Como mostrar no celular"><button type="button" class="sp-pill'+(verTabelaNoCelular()?' ativo':'')+'" data-modo="tabela">Planilha</button><button type="button" class="sp-pill'+(verTabelaNoCelular()?'':' ativo')+'" data-modo="cartoes">Cartões</button></div>'+
      '<button type="button" class="btn-secondary sp-btn" data-foco title="Cor do destaque da célula, da linha e da coluna selecionadas"><span class="sp-foco-bola"></span> Foco</button>'+
      '<button type="button" class="btn-secondary sp-btn" data-colunas>Colunas</button>'+
      '<button type="button" class="btn-secondary sp-btn" data-ajustar title="Autoajuste: largura das colunas e altura das linhas, à mão ou automático (como no Excel)">Ajustar ▾</button>'+
      '<button type="button" class="btn-secondary sp-btn" data-visoes title="Guardar e trocar combinações de filtros, ordem e colunas">Visões ▾</button>'+
      '<button type="button" class="btn-secondary sp-btn" data-exportar title="Baixar em Excel exatamente o que está na tela: colunas visíveis, filtros e ordem (todas as páginas)">Exportar Excel</button>'+
      // "+ Filtrar": escolhe qualquer coluna e os valores, também no Kanban (onde os cabeçalhos da planilha não aparecem); os filtros se somam
      '<button type="button" class="btn-secondary sp-btn" data-filtrar title="Filtrar por qualquer coluna da planilha; os filtros se somam">+ Filtrar</button>'+
      Object.keys(filtros).map(function(id){var c=cols.find(function(x){return x.id===id;});if(!c)return '';var v=filtros[id],q=Array.isArray(v)?v.length:(v&&v.size)||0;
        return '<button type="button" class="sp-chip-filtro" data-chip="'+h(id)+'" title="Mudar este filtro">'+h(nomeCol(c))+(q?' · '+q:'')+'<span data-tirar="'+h(id)+'" title="Tirar este filtro" aria-label="Tirar este filtro">×</span></button>';}).join('')+
      (n?'<button type="button" class="sp-limpar-tudo" data-limpar>Limpar filtros das colunas ('+n+')</button>':'');
    b.querySelectorAll('.sp-pills[role="group"]').forEach(function(novo){
      var velho=gruposAntes[novo.getAttribute('aria-label')];
      var reais=function(g){return Array.prototype.filter.call(g.children,function(x){return x.getAttribute('aria-hidden')!=='true';});};
      if(!velho)return;var vReais=reais(velho);
      if(vReais.length!==novo.children.length)return;
      Array.prototype.forEach.call(novo.children,function(nb,i){var vb=vReais[i];if(vb.textContent!==nb.textContent)return;
        vb.className=nb.className;Array.prototype.forEach.call(nb.attributes,function(at){if(at.name!=='class')vb.setAttribute(at.name,at.value);});});
      novo.replaceWith(velho);
    });
    // troca o selecionado na hora e só remonta a tabela depois que o deslize começou (montar a tabela no mesmo instante travava o efeito)
    b.querySelectorAll('[data-protocolo]').forEach(function(x){x.onclick=function(){if(protocolo===x.dataset.protocolo)return;protocolo=x.dataset.protocolo;
      x.parentNode.querySelectorAll('.sp-pill').forEach(function(y){y.classList.toggle('ativo',y===x);});
      requestAnimationFrame(function(){setTimeout(aplicar,60);});};});
    b.querySelector('[data-colunas]').onclick=escolherColunas;
    b.querySelector('[data-visoes]').onclick=function(e){e.stopPropagation();menuVisoes(this);};
    b.querySelector('[data-ajustar]').onclick=function(e){e.stopPropagation();menuAjuste(this);};
    b.querySelector('[data-exportar]').onclick=function(){exportarExcel(false);};
    b.querySelector('[data-foco]').onclick=function(e){e.stopPropagation();abrirMenuFoco(this);};
    b.querySelector('[data-filtrar]').onclick=function(e){e.stopPropagation();menuEscolherColunaFiltro(this);};
    b.querySelectorAll('[data-chip]').forEach(function(x){x.onclick=function(e){e.stopPropagation();
      var t=e.target.closest('[data-tirar]');if(t){delete filtros[t.dataset.tirar];aplicar();return;}
      var c=cols.find(function(y){return y.id===x.dataset.chip;});if(c)abrirMenu(c,x);};});
    b.querySelectorAll('[data-modo]').forEach(function(x){x.onclick=function(){try{localStorage.setItem(CHAVE_CEL(),x.dataset.modo);}catch(e){}aplicarModoCelular();renderBarra();};});
    aplicarModoCelular();
    b.querySelectorAll('[data-retorno]').forEach(function(x){x.onclick=function(){if(retorno===x.dataset.retorno)return;retorno=x.dataset.retorno;x.parentNode.querySelectorAll('.sp-pill').forEach(function(y){y.classList.toggle('ativo',y===x);});requestAnimationFrame(function(){setTimeout(aplicar,60);});};});
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
      '.sp-imp-resumo{margin-top:10px;font-size:12.5px}.sp-erro{color:var(--danger,#e5484d)}.sp-alerta{color:var(--warning,#e0a93b)}.sp-imp-erros{font-size:11.5px;color:var(--muted);margin:6px 0 0 18px}'+
      '.sp-imp-fx .sp-ajuda{margin:10px 0 6px}.sp-imp-fx-lista{max-height:220px;overflow:auto;overscroll-behavior:contain;border:1px solid var(--border-soft);border-radius:9px;padding:2px 8px}.sp-imp-fx-item{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:3px 0;border-bottom:1px solid var(--border-soft)}.sp-imp-fx-item:last-child{border-bottom:0}.sp-imp-fx-item .sp-item{flex:0 1 auto;min-width:0;max-width:100%}'+
      '.sp-imp-fx-seta{color:var(--muted)}.sp-imp-fx-alvo{font-size:12px;color:var(--muted);transition:opacity .3s cubic-bezier(.22,.78,.25,1)}.sp-imp-fx-alvo select{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:7px;padding:4px 6px;font:inherit;font-size:11.5px;max-width:340px}'+
      '.sp-imp-fx-nova{font-size:11.5px;color:var(--gold-light);opacity:0;transition:opacity .3s cubic-bezier(.22,.78,.25,1)}.sp-imp-fx-item.desligado .sp-imp-fx-alvo{opacity:.4;text-decoration:line-through}.sp-imp-fx-item.desligado .sp-imp-fx-nova{opacity:1}.sp-arquivo{cursor:pointer;display:inline-flex;align-items:center}'+
      '.sp-dist-bloco{margin-bottom:12px}.sp-dist-tit{font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:4px}.sp-dist-pessoas{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:2px;max-height:180px;overflow:auto}.sp-bloco{width:64px;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:3px 6px;font:inherit}.sp-dist-previa{font-size:12.5px;padding:8px 0}'+
      '.sp-funil .coluna-kanban{flex:0 0 280px}.sp-pct{font-size:10.5px;color:var(--muted);margin-left:4px}.sp-funil-barra{height:3px;margin:0 14px 8px;background:var(--border-soft);border-radius:2px;overflow:hidden}.sp-funil-barra i{display:block;height:100%;border-radius:2px;transition:width .6s cubic-bezier(.2,1,.3,1)}'+
      '.sp-card-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin:4px 0}.sp-card-status i{width:7px;height:7px;border-radius:50%;flex:0 0 auto}.sp-card-linha{font-size:11.5px;margin:3px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.sp-ret{font-weight:600}.sp-ret.atrasado{color:var(--danger,#e5484d)}.sp-ret.hoje{color:var(--warning,#e0a93b)}.sp-card-valor{font-size:12px;font-weight:700;color:var(--gold-light);margin:4px 0}.sp-card-cap{font-size:11px;color:var(--muted)}'+
      '.sp-pill-solta{border:1px solid var(--border-soft);background:var(--panel)}'+
      '#spAbas{margin:0 0 12px}.sp-abas{display:flex;gap:2px;overflow-x:auto;border-bottom:1px solid var(--border-soft);scrollbar-width:thin}.sp-aba{border:0;background:none;color:var(--muted);font:inherit;font-size:12.5px;font-weight:600;padding:10px 14px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;transition:color .2s,border-color .25s}'+
      '.sp-aba{border-radius:9px}.sp-abas{padding-bottom:3px}.sp-aba:hover{color:var(--text)}.sp-aba.ativo{color:var(--gold-light);border-bottom-color:var(--gold)}.sp-aba:active{transform:scale(.97)}'+
      '.sp-org{margin-left:auto;font-size:11.5px;color:var(--gold-light);text-decoration:underline}.sp-sub{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px}.sp-teses{flex-wrap:wrap}.sp-tipo{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted)}.sp-tipo select{background:var(--panel);color:var(--text);border:1px solid var(--border-soft);border-radius:8px;padding:6px 8px;font:inherit;font-size:12px;max-width:240px}'+
      '.sp-col-opcao{width:100%;border:0;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center}.sp-col-opcao:hover{background:color-mix(in srgb,var(--gold) 10%,transparent)}.sp-col-opcao[hidden]{display:none}.sp-chip-filtro{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 6px 0 10px;border-radius:9px;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);background:color-mix(in srgb,var(--gold) 12%,transparent);color:var(--text);font:inherit;font-size:11.5px;font-weight:500;cursor:pointer;white-space:nowrap}.sp-chip-filtro span{width:18px;height:18px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--muted)}.sp-chip-filtro span:hover{background:color-mix(in srgb,var(--text) 10%,transparent);color:var(--text)}'+
      '.sp-item-col{display:flex;align-items:center;gap:6px;justify-content:space-between}.sp-item-col label{display:flex;align-items:center;gap:6px;min-width:0;flex:1}.sp-item-col label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-item-col .sp-editor{min-width:0}.sp-col-ger{display:flex;gap:2px;flex:0 0 auto;opacity:.55;transition:opacity .2s cubic-bezier(.22,.78,.25,1)}.sp-item-col:hover .sp-col-ger,.sp-item-col:focus-within .sp-col-ger{opacity:1}.sp-ico{width:24px;height:24px;border-radius:7px;border:1px solid transparent;background:none;color:var(--muted);font-size:11px;cursor:pointer}.sp-ico:hover{color:var(--text);border-color:var(--border-soft)}'+
      '.sp-foco-menu{position:fixed;z-index:3000;width:230px;padding:8px;border:1px solid var(--border-soft);border-radius:12px;background:var(--panel-solid,var(--panel));box-shadow:0 16px 38px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:6px}'+
      '.sp-foco-menu .tit{font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-weight:600;padding:2px 4px}.sp-foco-menu .padrao{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;border:0;background:none;color:var(--text);font:inherit;font-size:12px;cursor:pointer;text-align:left}.sp-foco-menu .padrao:hover,.sp-foco-menu .padrao.on{background:color-mix(in srgb,var(--gold) 12%,transparent)}'+
      '.sp-foco-cores{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;padding:2px 4px}.sp-foco-cores button{width:20px;height:20px;border-radius:50%;border:2px solid transparent;background:var(--c);cursor:pointer;padding:0}.sp-foco-cores button.on{border-color:var(--text)}.sp-foco-cores button:hover{transform:scale(1.12)}'+
      '.sp-foco-menu button,.sp-foco-outra{touch-action:manipulation;-webkit-tap-highlight-color:transparent}'+
      '@media (pointer:coarse){.sp-foco-menu{width:264px;padding:10px}.sp-foco-menu .padrao{padding:10px;font-size:13px}.sp-foco-cores{grid-template-columns:repeat(4,1fr);gap:12px;padding:4px 6px;justify-items:center}.sp-foco-cores button{width:38px;height:38px}.sp-foco-cores button:hover{transform:none}.sp-foco-outra{padding:6px;font-size:13px}.sp-foco-outra input{width:44px;height:34px}}'+
      '.sp-foco-outra{display:flex;align-items:center;gap:8px;font-size:12px;padding:2px 4px;color:var(--text)}.sp-foco-outra input{width:30px;height:24px;padding:0;border:1px solid var(--border-soft);border-radius:6px;background:none;cursor:pointer}.sp-foco-bola{width:10px;height:10px;border-radius:50%;background:var(--sp-foco-escolhido,var(--gold));display:inline-block;margin-right:6px;vertical-align:-1px}'+
      '.sp-nova-col{margin-top:14px;padding:12px;border:1px solid var(--border-soft);border-radius:12px;display:flex;flex-direction:column;gap:8px}.sp-nova-tit{font-size:12px;font-weight:600}.sp-nova-grade{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:6px}.sp-nova-rod{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.sp-col-ger[hidden]{display:none}.sp-item-col.perguntando{grid-column:1/-1;background:color-mix(in srgb,var(--danger) 7%,transparent);border-radius:9px}.sp-col-pergunta{display:flex;gap:4px;flex:0 0 auto}.sp-col-pergunta .sp-btn{height:26px;padding:0 8px;font-size:11px}.sp-perigo{color:var(--danger)!important}.sp-removidas{margin-top:10px;font-size:12px}.sp-removidas summary{cursor:pointer;color:var(--muted)}.sp-removidas .sp-item-col{padding:5px 2px}@media(max-width:620px){.sp-nova-grade{grid-template-columns:1fr}}'+
      '.sp-modal{max-width:620px;width:94vw}.sp-col-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px;max-height:52vh;overflow:auto;margin-top:8px}.sp-ajuda{font-size:11.5px;color:var(--muted);margin:0 0 8px}.sp-col-acoes{display:flex;gap:6px;flex-wrap:wrap}'+
      '#listaView .tabela-scroll{max-height:70vh;overflow:auto}'+
      '.sp-kb-por{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted)}.sp-kb-por select{background:var(--panel);color:var(--text);border:1px solid var(--border-soft);border-radius:9px;padding:7px 9px;font:inherit;font-size:12px;max-width:230px}.sp-kb-por select:focus{border-color:var(--gold);outline:0}'+
      '.sp-kb-padrao{border:0;background:none;color:var(--gold-light);font:inherit;font-size:11.5px;text-decoration:underline;cursor:pointer}'+
      '.sp-aj-alturas{display:flex;flex-wrap:wrap;gap:4px;padding:2px 4px 6px}.sp-aj-fino{display:flex;align-items:center;gap:8px;padding:4px 6px;font-size:12px;color:var(--text)}.sp-aj-fino input{flex:1;accent-color:var(--gold)}.sp-aj-fino span{min-width:62px;text-align:right;color:var(--muted);font-size:11px}'+
      '.sp-kb-novo{border:1px solid var(--border-soft);background:transparent;color:var(--text);font:inherit;font-size:14px;line-height:1;width:24px;height:24px;border-radius:8px;cursor:pointer;margin-left:4px;transition:border-color .2s cubic-bezier(.22,.78,.25,1),background-color .2s cubic-bezier(.22,.78,.25,1)}.sp-kb-novo:hover{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 12%,transparent)}'+
      '.sp-novo-coluna{margin:0 0 12px;padding:8px 11px;border-radius:9px;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);background:color-mix(in srgb,var(--gold) 9%,transparent);font-size:12px}.sp-novo-coluna[hidden]{display:none}'+
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
      // Cor do foco (cruz): padrão = cor do tema (no claro a própria cor de destaque; no escuro a versão clara, mais forte); o botão "Foco" troca
      '.sp-tabela{--sp-foco:var(--sp-foco-escolhido,var(--gold));--sp-foco-a:12%;--sp-foco-b:20%}'+
      'body:not([data-theme="light"]) .sp-tabela{--sp-foco:var(--sp-foco-escolhido,var(--gold-light,var(--gold)));--sp-foco-a:17%;--sp-foco-b:28%}'+
      '.sp-tabela td.sp-sel{box-shadow:inset 0 0 0 2px var(--sp-foco)!important;border-radius:3px}'+
      // a cor da linha fica por cima do fundo zebrado do tema (camada de imagem), sem apagar o zebrado
      '.sp-tabela .sp-cruz-l,.sp-tabela .sp-cruz-c{background-image:linear-gradient(color-mix(in srgb,var(--sp-foco) var(--sp-foco-a),transparent),color-mix(in srgb,var(--sp-foco) var(--sp-foco-a),transparent))!important;transition:background-image .2s cubic-bezier(.22,.78,.25,1)}'+
      '.sp-tabela .sp-cruz-l.sp-cruz-c{background-image:linear-gradient(color-mix(in srgb,var(--sp-foco) var(--sp-foco-b),transparent),color-mix(in srgb,var(--sp-foco) var(--sp-foco-b),transparent))!important}'+
      '.sp-tabela th.sp-cruz-c .sp-th{color:var(--sp-foco)}.sp-tabela th.sp-cruz-c{box-shadow:inset 0 -2px 0 var(--sp-fold)}'+
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
    estilosPacote2();document.addEventListener('change',aoMarcar);
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
    var m=ov.querySelector('.modal');/* entrada da janela animada pelo saga_guard.js (animar aqui dobrava o efeito) */if(false)m.animate([{opacity:0,transform:'translateY(14px) scale(.97)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,1.3,.4,1)'});
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
    var j=janela('Importar planilha para '+(FASE_FIXA==='captacao'?'a Captação':'o Jurídico'),
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
    // Fichas de cliente que já existem com o MESMO NOME (o CPF não achou ninguém): o senhor confirma na prévia.
    // Regra do Dr. Victor (08/11): uma ficha por pessoa; ficha nova só quando for outra pessoa.
    var grupos=[];
    var descFicha=function(f){return f.nome+(f.tem_cpf?' · CPF ...'+f.cpf_final:' · sem CPF')+' · '+(f.processos?f.processos+' processo'+(f.processos>1?'s':''):'sem processo');};
    j.q('[data-conferir]').onclick=async function(){
      if(!dados)return;if(mapa.indexOf('pessoa.nome')===-1){aviso('Indique qual coluna é o nome do cliente.',true);return;}
      var b=this,linhas;b.disabled=true;b.textContent='Conferindo...';
      try{linhas=linhasParaGravar();conferencia=await rpcOk('lista_conferir_linhas',{p_linhas:linhas});}
      catch(e){aviso(h(e.message||'Não foi possível conferir.'),true);b.disabled=false;b.textContent='Conferir';return;}
      b.disabled=false;b.textContent='Conferir de novo';
      var erros=conferencia.filter(function(x){return x.erro;}),cli=conferencia.filter(function(x){return !x.erro&&x.cliente_existente_id;}),proc=conferencia.filter(function(x){return !x.erro&&x.processo_existente_id;}),rep=conferencia.filter(function(x){return !x.erro&&(x.cpf_repetido_na_colagem||x.numero_repetido_na_colagem);});
      var repNome=conferencia.filter(function(x){return !x.erro&&x.nome_repetido_na_colagem;});
      grupos=[];var porChave={};
      conferencia.forEach(function(x){
        if(x.erro||x.cliente_existente_id||!x.nome_chave||!Array.isArray(x.mesmo_nome)||!x.mesmo_nome.length)return;
        var g=porChave[x.nome_chave];
        if(!g){g=porChave[x.nome_chave]={nome:(linhas[x.linha-1]||{})['pessoa.nome']||x.nome_chave,linhas:[],fichas:[],ids:{}};grupos.push(g);}
        g.linhas.push(x);x.mesmo_nome.forEach(function(f){if(!g.ids[f.id]){g.ids[f.id]=1;g.fichas.push(f);}});
      });
      var nMesmo=grupos.reduce(function(t,g){return t+g.linhas.length;},0);
      var boas=conferencia.length-erros.length;
      j.q('.sp-imp-res').innerHTML='<div class="sp-imp-resumo"><b>'+boas+'</b> linha(s) prontas para gravar'+(erros.length?' · <span class="sp-erro">'+erros.length+' com erro (não serão gravadas)</span>':'')+
        (cli.length?' · '+cli.length+' com CPF de cliente já cadastrado: o processo novo entra na ficha que já existe':'')+
        (nMesmo?' · '+nMesmo+' com o nome de um cliente que já tem ficha (confira abaixo)':'')+
        (repNome.length?' · '+repNome.length+(repNome.length>1?' repetem':' repete')+' um nome da própria planilha: fica'+(repNome.length>1?'m':'')+' na mesma ficha':'')+
        (proc.length?' · <span class="sp-alerta">'+proc.length+' número(s) de processo que já existem</span>':'')+(rep.length?' · <span class="sp-alerta">'+rep.length+' repetida(s) na própria planilha</span>':'')+'</div>'+
        (erros.length?'<ul class="sp-imp-erros">'+erros.slice(0,10).map(function(x){return '<li>Linha '+x.linha+': '+h(x.erro)+'</li>';}).join('')+(erros.length>10?'<li>... e mais '+(erros.length-10)+'</li>':'')+'</ul>':'')+
        (grupos.length?'<div class="sp-imp-fx"><p class="sp-ajuda">Estes nomes já têm ficha de cliente no SAGA. O processo novo entra na ficha que já existe (uma ficha por pessoa). <b>Desmarque</b> se for outra pessoa: aí ela ganha ficha nova.</p><div class="sp-imp-fx-lista">'+
          grupos.map(function(g,i){
            return '<div class="sp-imp-fx-item"><label class="sp-item"><input type="checkbox" data-fx="'+i+'" checked><span><b>'+h(g.nome)+'</b>'+(g.linhas.length>1?' ('+g.linhas.length+' linhas)':'')+'</span></label>'+
              '<span class="sp-imp-fx-seta" aria-hidden="true">→</span><span class="sp-imp-fx-alvo">'+
              (g.fichas.length>1?'<select data-fx-sel="'+i+'" aria-label="Qual ficha">'+g.fichas.map(function(f){return '<option value="'+h(f.id)+'">'+h(descFicha(f))+'</option>';}).join('')+'</select>':h(descFicha(g.fichas[0])))+
              '</span><span class="sp-imp-fx-nova">ficha nova</span></div>';
          }).join('')+'</div></div>':'')+
        (proc.length||rep.length?'<label class="sp-item"><input type="checkbox" class="sp-pular-rep" checked> Não gravar as linhas com processo que já existe ou repetidas</label>':'');
      j.q('.sp-imp-res').querySelectorAll('[data-fx]').forEach(function(c){c.onchange=function(){c.closest('.sp-imp-fx-item').classList.toggle('desligado',!c.checked);};});
      var g=j.q('[data-gravar]');g.hidden=!boas;g.textContent='Gravar '+boas+' linha(s)';
    };
    j.q('[data-gravar]').onclick=async function(){
      if(!conferencia)return;var b=this;
      var pularRep=j.q('.sp-pular-rep')&&j.q('.sp-pular-rep').checked;
      var pular=new Set(conferencia.filter(function(x){return x.erro||(pularRep&&(x.processo_existente_id||x.cpf_repetido_na_colagem&&x.numero_repetido_na_colagem||x.numero_repetido_na_colagem));}).map(function(x){return x.linha;}));
      var linhas=linhasParaGravar(),tese=j.q('.sp-tese')&&j.q('.sp-tese').value||null,criadas=0,novos=0;
      // ficha confirmada acima; só nas linhas em que ela vale (CPF diferente é outra pessoa: o banco já tirou da lista)
      grupos.forEach(function(g,i){
        var c=j.q('[data-fx="'+i+'"]');if(!c||!c.checked)return;
        var sel=j.q('[data-fx-sel="'+i+'"]'),id=sel?sel.value:g.fichas[0].id;
        g.linhas.forEach(function(x){if(linhas[x.linha-1]&&x.mesmo_nome.some(function(f){return f.id===id;}))linhas[x.linha-1]['pessoa.id']=id;});
      });
      var chaveDa=function(n){var x=conferencia[n-1];return x&&x.nome_chave;},criadasPorNome={};
      b.disabled=true;j.q('[data-conferir]').disabled=true;
      try{
        for(var ini=0;ini<linhas.length;ini+=1000){
          var lote=linhas.slice(ini,ini+1000),pl=[];for(var k=0;k<lote.length;k++)if(pular.has(ini+k+1))pl.push(k+1);
          if(pl.length===lote.length)continue;
          // mais de 1.000 linhas: o mesmo nome (sem CPF) num lote seguinte vai para a ficha criada no lote anterior
          lote.forEach(function(o,k){var ch=chaveDa(ini+k+1);if(!o['pessoa.id']&&!o['pessoa.cpf']&&ch&&criadasPorNome[ch])o['pessoa.id']=criadasPorNome[ch];});
          b.textContent='Gravando '+Math.min(ini+1000,linhas.length)+' de '+linhas.length+'...';
          var r=await rpcOk('lista_criar_linhas',{p_tela:FASE_FIXA,p_linhas:lote,p_tese_padrao:tese,p_pular:pl});
          criadas+=r.length;
          r.forEach(function(x){if(!x.cliente_novo)return;novos++;var ch=chaveDa(ini+x.linha);if(ch)criadasPorNome[ch]=x.pessoa_id;});
        }
      }catch(e){aviso(h(e.message||'Não foi possível gravar.'),true);b.disabled=false;b.textContent='Tentar de novo';j.q('[data-conferir]').disabled=false;return;}
      j.fechar();aviso(criadas+(FASE_FIXA==='captacao'?' ficha(s) criada(s) na Captação':' processo(s) cadastrado(s) no Jurídico')+(novos?' ('+novos+' cliente(s) novo(s))':'')+'.');
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
    // cascata das colunas só quando o funil aparece pela primeira vez (não a cada filtro ou redesenho: fazia o quadro tremer)
    var entraFunil=!kv.__funilJaMostrado;kv.__funilJaMostrado=true;
    if(entraFunil&&!(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches)kv.querySelectorAll('.coluna-kanban').forEach(function(c,i){c.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*45,easing:'cubic-bezier(.2,1.2,.4,1)',fill:'backwards'});});
    return true;
  }

  // ---------- Kanban organizado pela coluna escolhida, com filtro em cada coluna ----------
  // Guardado só neste aparelho e nesta conta (como as larguras): {por: id da coluna, filtros: {grupo: {coluna: [chaves]}}}
  var CHAVE_KB=function(){return 'saga-planilha-kanban-'+FASE_FIXA+'-'+(state.meuInternoId||'');};
  var kb=null,opsCache={};
  var FAIXAS=[[0,50000,'Até R$ 50 mil'],[50000,100000,'R$ 50 a 100 mil'],[100000,200000,'R$ 100 a 200 mil'],[200000,500000,'R$ 200 a 500 mil'],[500000,Infinity,'Acima de R$ 500 mil']];
  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  function lerKb(){if(!kb){try{kb=JSON.parse(localStorage.getItem(CHAVE_KB())||'null');}catch(e){}kb=kb||{por:null,filtros:{}};kb.filtros=kb.filtros||{};try{Object.keys(kb.filtros).forEach(function(k){var f=kb.filtros[k];if(Array.isArray(f))kb.filtros[k]=trocaVazioAntigo(f);else if(f&&typeof f==='object')Object.keys(f).forEach(function(c){if(Array.isArray(f[c]))f[c]=trocaVazioAntigo(f[c]);});});}catch(e){}}return kb;}
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
  // "+" no título da coluna do Kanban: abre o Novo Processo e o processo nasce já com o valor daquela coluna
  var CAMPO_NOVO={'processo.status':'status_id','processo.tese':'tese_id','processo.area':'area_direito_id','processo.situacao_acao':'situacao_acao_id','processo.responsavel':'responsavel_id','processo.captador':'captador_id'};
  var pendenteNovo=null;
  function podeNovoNaColuna(c){return !!(state.permissoes&&state.permissoes.criar)&&podeSoltar(c)&&(!c.campo_sistema||!!CAMPO_NOVO[c.campo_sistema])&&typeof abrirNovoProcesso==='function';}
  function novoNaColuna(c,k,nome){
    abrirNovoProcesso();
    pendenteNovo={c:c,k:k,nome:nome};
    var valor=k===VAZIO?null:(tipoGrupo(c)==='simnao'?k==='true':k);
    if(c.campo_sistema==='processo.status'&&valor){state.novoStatus={id:valor,nome:nome};var ls=document.getElementById('labelNovoStatus');if(ls)ls.textContent=nome;}
    if(c.campo_sistema==='processo.tese'&&valor){state.novoTese={id:valor,nome:nome};var lt=document.getElementById('labelNovaTese');if(lt)lt.textContent=nome;}
    var corpo=document.querySelector('#modalNovoProcesso .modal-body');
    if(corpo){var av=document.getElementById('spNovoNaColuna');if(!av){av=document.createElement('div');av.id='spNovoNaColuna';av.className='sp-novo-coluna';corpo.insertBefore(av,corpo.firstChild);}
      av.innerHTML='Vai entrar na coluna <b>'+h(nome||'(vazio)')+'</b> ('+h(nomeCol(c))+').';av.hidden=false;}
  }
  // usado pelo salvarNovoProcesso: devolve o que acrescentar aos dados e esquece o pedido
  function dadosNovoNaColuna(){
    var pn=pendenteNovo;
    if(!pn)return null;
    var valor=pn.k===VAZIO?null:(tipoGrupo(pn.c)==='simnao'?pn.k==='true':pn.k);
    if(pn.c.campo_sistema)return CAMPO_NOVO[pn.c.campo_sistema]?{campo:CAMPO_NOVO[pn.c.campo_sistema],valor:valor}:null;
    var campos={};campos[pn.c.id]=valor;return {campos:campos};
  }
  function esquecerNovoNaColuna(){pendenteNovo=null;var av=document.getElementById('spNovoNaColuna');if(av)av.hidden=true;}
  function filtrosDoGrupo(k){var f=lerKb().filtros[k]||{};return f;}
  function passaGrupo(p,k){var f=filtrosDoGrupo(k);for(var id in f){var c=cols.find(function(x){return x.id===id;});if(!c||!f[id].length)continue;if(f[id].indexOf(chave(p,c))<0)return false;}return true;}
  function seletorKanban(){
    var el=document.getElementById('spKanbanPor');if(!el)return;
    var k=lerKb(),cs=colunasDaTela().filter(agrupavel);
    el.style.display=state.view==='kanban'?'':'none';
    var bn=document.getElementById('btnNovaColunaKanban');if(bn&&state.view==='kanban')bn.style.display=k.por||!state.podeGerenciarCatalogos?'none':'';
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
        '<button type="button" class="sp-kb-filtro'+(nf?' ativo':'')+'" data-kb-filtro="'+h(g.k)+'" title="Filtrar só esta coluna">'+(nf?nf+' filtro'+(nf>1?'s':''):'Filtrar')+' ▾</button>'+
          (podeNovoNaColuna(c)?'<button type="button" class="sp-kb-novo" data-kb-novo="'+h(g.k)+'" title="Novo processo nesta coluna" aria-label="Novo processo em '+h(g.nome)+'">+</button>':'')+'</div>'+
        '<div class="sp-funil-barra"><i style="width:'+pct+'%;background:'+h(cor)+'"></i></div>'+
        (chips?'<div class="sp-kb-chips">'+chips+'<button type="button" class="sp-kb-limpar" data-kb-limpar="'+h(g.k)+'">limpar</button></div>':'')+
        '<div class="coluna-corpo" data-sp-grupo="'+h(g.k)+'">'+vis.sort(ord).map(function(p){return cartaoGenerico(p,c);}).join('')+(vis.length?'':'<div class="sp-kb-nada">'+(todos.length?'Nenhum cartão com estes filtros.':'Nenhum processo.')+'</div>')+'</div></div>';
    }).join('')+'</div>';
    kv.querySelectorAll('[data-kb-filtro]').forEach(function(b){b.onclick=function(e){e.stopPropagation();menuFiltroGrupo(b,b.dataset.kbFiltro,c);};});
    kv.querySelectorAll('[data-kb-novo]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var g=grupos.find(function(x){return x.k===b.dataset.kbNovo;});novoNaColuna(c,b.dataset.kbNovo,g?g.nome:'');};});
    kv.querySelectorAll('[data-kb-tira]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var x=b.dataset.kbTira.split('|');delete lerKb().filtros[x[0]][x[1]];guardarKb();renderKanban();};});
    kv.querySelectorAll('[data-kb-limpar]').forEach(function(b){b.onclick=function(e){e.stopPropagation();delete lerKb().filtros[b.dataset.kbLimpar];guardarKb();renderKanban();};});
    if(state.permissoes.editar===true&&podeSoltar(c)&&typeof ativarArrasteKanban==='function')ativarArrasteKanban(kv);
    // cascata das colunas só quando a organização muda (não a cada filtro ou redesenho: fazia o quadro tremer)
    var orgNova=kv.__orgMostrada!==c.id;kv.__orgMostrada=c.id;
    if(orgNova&&!(window.sagaMq?sagaMq():{matches:false}).matches)kv.querySelectorAll('.coluna-kanban').forEach(function(col,i){if(col.animate)col.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:Math.min(i,10)*40,easing:'cubic-bezier(.22,.78,.25,1)',fill:'backwards'});});
    return true;
  }
  // soltar um cartão em outra coluna muda aquele dado do processo (só listas de opções e Sim/Não)
  // Soltar no Kanban "Organizar por": o cartão pousa na coluna nova na hora (mesmo efeito das Minhas Tarefas)
  // e o Kanban não é redesenhado inteiro (era o que piscava); só volta se a gravação falhar.
  async function soltarNoGrupo(pid,k,proximo){
    var kk=lerKb(),c=cols.find(function(x){return x.id===kk.por;}),p=processo(pid);if(!c||!p||!podeSoltar(c))return;
    if(chaveGrupo(p,c)===k)return;
    if(!editavel(p,c)){aviso('Você não pode mudar este dado.',true);return;}
    var valor=k===VAZIO?null:(tipoGrupo(c)==='simnao'?k==='true':k);
    var corpo=document.querySelector('[data-sp-grupo="'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'"]'),card=document.querySelector('.card-kanban[data-processo-id="'+pid+'"]');
    var movido=false;
    if(corpo&&card){
      if(proximo&&proximo.parentNode===corpo)corpo.insertBefore(card,proximo);else corpo.appendChild(card);
      document.querySelectorAll('.coluna-kanban').forEach(function(col){var cc=col.querySelector('.coluna-corpo'),ct=col.querySelector('.coluna-contagem');if(cc&&ct)ct.textContent=cc.querySelectorAll('.card-kanban').length;});
      var col=corpo.closest('.coluna-kanban');if(col){col.classList.add('recebeu-card');setTimeout(function(){col.classList.remove('recebeu-card');},650);}
      card.classList.add('pousando');setTimeout(function(){card.classList.remove('pousando');},450);
      movido=true;
    }
    try{await gravar(p,c,valor);aviso(h(nomeCol(c))+' atualizado.');}
    catch(e){aviso(h(e.message||'Não foi possível mudar.'),true);renderKanban();return;}
    if(!movido)renderKanban();
  }
  // filtro de uma coluna do Kanban: escolhe a coluna da planilha e os valores (soma com os outros filtros da coluna)
  // Filtro de uma coluna do Kanban: redesenha, mas só os cartões dessa coluna entram suaves (o resto do quadro fica parado)
  function redesenharSoColuna(k){
    window.__sagaSemConteudoAte=Date.now()+600;
    renderKanban();
    var corpo=document.querySelector('[data-sp-grupo="'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'"]');
    var calmo=(window.sagaMq?sagaMq():{matches:false}).matches;
    if(corpo&&!calmo&&corpo.animate)corpo.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:260,easing:'cubic-bezier(.22,.78,.25,1)'});
  }
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
      m.querySelector('[data-x="limpar"]').onclick=function(){if(lerKb().filtros[k])delete lerKb().filtros[k][sel.id];guardarKb();fecharMenu();redesenharSoColuna(k);};
      m.querySelector('[data-x="ok"]').onclick=function(){var v=Array.prototype.map.call(m.querySelectorAll('.sp-lista input:checked'),function(i){return i.value;});var fk=lerKb().filtros[k]=lerKb().filtros[k]||{};if(v.length)fk[sel.id]=v;else delete fk[sel.id];guardarKb();fecharMenu();redesenharSoColuna(k);};
    };
    desenhar();
    document.body.appendChild(m);menuAberto=m;
    var r=ancora.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.right-290,window.innerWidth-298))+'px';caberNaTela(m,r);
    // a entrada do menu é animada pelo saga_guard.js (animar aqui também dobrava o efeito)
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

  /* =====================================================================================
     PACOTE 2 DA PLANILHA (08/11): alterar vários de uma vez, exportar para Excel o que está
     na tela, visões salvas e ordem das colunas arrastando o cabeçalho. Tudo por pessoa e
     neste aparelho (decisão do Dr. Victor: ajustes não passam para outro aparelho).
     ===================================================================================== */
  var CURVA='cubic-bezier(.22,.78,.25,1)';
  function semMovimento(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function listaFiltrada(){
    var base=(state.baseProcessos||[]).filter(function(p){return typeof processoNoEscopo==='function'?processoNoEscopo(p):passa(p);});
    return ordenar(base);
  }
  function estilosPacote2(){
    if(document.getElementById('spEstilo2'))return;
    var st=document.createElement('style');st.id='spEstilo2';st.textContent=
      // barra dos marcados (embaixo, no meio)
      '#spLote{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:1200;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);padding:9px 12px;border:1px solid var(--border);border-radius:14px;background:var(--panel-solid,var(--panel));box-shadow:0 14px 34px rgba(0,0,0,.28);backdrop-filter:blur(14px);transform:translate(-50%,0);opacity:1;transition:opacity .26s '+CURVA+',transform .26s '+CURVA+'}'+
      '#spLote.sp-lote-fora{opacity:0;transform:translate(-50%,16px);pointer-events:none}'+
      'body.sp-com-lote .saga-conteudo:last-of-type,body.sp-com-lote #listaView{padding-bottom:76px}'+
      '#spLote{width:max-content}@media(max-width:760px){#spLote{left:12px;right:12px;width:auto;transform:none;gap:6px;padding:8px 10px}#spLote.sp-lote-fora{transform:translateY(16px)}#spLote b{width:100%;text-align:center;font-size:12px}#spLote .sp-btn{flex:1 1 auto;padding:7px 8px;font-size:11.5px}}'+
      '#spLote b{font-size:12.5px;color:var(--text);font-weight:600;font-variant-numeric:tabular-nums}#spLote .sp-lote-todos{font:inherit;font-size:11.5px;color:var(--gold-light);background:none;border:0;text-decoration:underline;cursor:pointer;padding:2px}'+
      // arrastar coluna
      '.sp-tabela th.sp-col-arrastando{opacity:.45}.sp-tabela th[data-sp-col]{cursor:grab}'+
      '#spMarcaColuna{position:fixed;width:3px;border-radius:2px;background:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 22%,transparent);z-index:3100;pointer-events:none;transition:left .12s '+CURVA+'}'+
      '#spFantasmaCol{position:fixed;z-index:3101;pointer-events:none;padding:8px 12px;border:1px solid var(--gold);border-radius:9px;background:var(--panel-solid,var(--panel));color:var(--text);font-size:11px;letter-spacing:.8px;text-transform:uppercase;box-shadow:0 10px 24px rgba(0,0,0,.28)}'+
      // visões salvas
      '.sp-visao{display:flex;align-items:center;gap:4px}.sp-visao .sp-op{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-visao .sp-ico{flex:0 0 auto}'+
      '.sp-visao-nova{display:flex;gap:6px;padding:6px 2px 2px}.sp-visao-nova input{flex:1;min-width:0;background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:7px 9px;font:inherit;font-size:12px}'+
      '.sp-lote-form{display:grid;gap:12px}.sp-lote-form label{display:grid;gap:5px;font-size:12px;color:var(--muted)}.sp-lote-form select,.sp-lote-form input{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:9px 10px;font:inherit;font-size:13px}'+
      '.sp-lote-prog{height:6px;border-radius:4px;background:color-mix(in srgb,var(--text) 10%,transparent);overflow:hidden}.sp-lote-prog i{display:block;height:100%;width:0;background:var(--gold);transition:width .2s '+CURVA+'}';
    document.head.appendChild(st);
  }

  // ---------- 1) Marcar várias linhas e alterar de uma vez ----------
  var marcados=new Set();
  function chkLinhas(){return Array.prototype.slice.call(document.querySelectorAll('#listaView .chk-linha'));}
  function restaurarMarcados(){
    chkLinhas().forEach(function(c){c.checked=marcados.has(c.value);});
    var t=document.getElementById('chkTodos');if(t){var v=chkLinhas();t.checked=v.length>0&&v.every(function(c){return c.checked;});}
    pintarLote();
  }
  function aoMarcar(e){
    var t=e.target;if(!t||!t.closest||!t.closest('#listaView'))return;
    if(t.id==='chkTodos'){chkLinhas().forEach(function(c){c.checked=t.checked;if(t.checked)marcados.add(c.value);else marcados.delete(c.value);});pintarLote();return;}
    if(t.classList&&t.classList.contains('chk-linha')){if(t.checked)marcados.add(t.value);else marcados.delete(t.value);
      var tt=document.getElementById('chkTodos');if(tt){var v=chkLinhas();tt.checked=v.length>0&&v.every(function(c){return c.checked;});}pintarLote();}
  }
  function colunasEmLote(){
    return colunasDaTela().filter(function(c){
      if(SISTEMA_SO_LEITURA.indexOf(c.campo_sistema)!==-1)return false;
      // dados que são de cada pessoa ou de cada processo não fazem sentido iguais para vários
      if(['pessoa.nome','pessoa.cpf','pessoa.telefone','pessoa.email','processo.numero','processo.valor_causa','processo.valor_precatorio','processo.ultima_movimentacao'].indexOf(c.campo_sistema)!==-1)return false;
      if(['processo.tese','processo.responsavel'].indexOf(c.campo_sistema)!==-1&&!state.permissoes.editar_dados)return false;
      return ['opcao','usuario','sim_nao','data','texto','porcentagem','moeda','numero'].indexOf(c.tipo)!==-1||!!c.campo_sistema;
    });
  }
  function pintarLote(){
    var bar=document.getElementById('spLote');
    if(!bar){bar=document.createElement('div');bar.id='spLote';bar.className='sp-lote-fora';bar.setAttribute('role','region');bar.setAttribute('aria-label','Processos marcados');document.body.appendChild(bar);}
    // tira da lista quem saiu do filtro
    var vivos={};listaFiltrada().forEach(function(p){vivos[p.id]=1;});marcados.forEach(function(id){if(!vivos[id])marcados.delete(id);});
    var n=marcados.size,total=Object.keys(vivos).length,naTela=chkLinhas().length;
    document.body.classList.toggle('sp-com-lote',!!n&&state.view==='lista');
    if(!n||state.view!=='lista'){bar.classList.add('sp-lote-fora');return;}
    bar.innerHTML='<b>'+n+(n===1?' processo marcado':' processos marcados')+'</b>'+
      (n<total&&n>=naTela&&total>naTela?'<button type="button" class="sp-lote-todos" data-lote-todos>Marcar todos os '+total+' do filtro</button>':'')+
      (state.permissoes.editar?'<button type="button" class="btn-primary sp-btn" data-lote-alterar>Alterar…</button>':'')+
      '<button type="button" class="btn-secondary sp-btn" data-lote-exportar>Exportar marcados</button>'+
      '<button type="button" class="btn-secondary sp-btn" data-lote-limpar>Desmarcar</button>';
    bar.classList.remove('sp-lote-fora');
    var bt=bar.querySelector('[data-lote-todos]');if(bt)bt.onclick=function(){Object.keys(vivos).forEach(function(id){marcados.add(id);});restaurarMarcados();};
    var ba=bar.querySelector('[data-lote-alterar]');if(ba)ba.onclick=abrirAlterarLote;
    bar.querySelector('[data-lote-exportar]').onclick=function(){exportarExcel(true);};
    bar.querySelector('[data-lote-limpar]').onclick=function(){marcados.clear();restaurarMarcados();};
  }
  function abrirAlterarLote(){
    var cs=colunasEmLote(),ids=Array.from(marcados);
    var j=janela('Alterar '+ids.length+(ids.length===1?' processo':' processos'),
      '<div class="sp-lote-form"><p class="sp-ajuda">Escolha a coluna e o valor novo. O valor vale para todos os processos marcados; quem não puder ser alterado (por exemplo, sigiloso) fica como está.</p>'+
      '<label>Coluna<select id="spLoteCol"><option value="">Escolha a coluna…</option>'+cs.map(function(c){return '<option value="'+h(c.id)+'">'+h(nomeCol(c))+'</option>';}).join('')+'</select></label>'+
      '<label id="spLoteValorRot" hidden>Valor novo<span id="spLoteValor"></span></label>'+
      '<div class="sp-lote-prog" id="spLoteProg" hidden><i></i></div><div class="sp-ajuda" id="spLoteMsg"></div></div>',
      '<button type="button" class="btn-secondary" data-fechar>Cancelar</button><button type="button" class="btn-primary" id="spLoteOk" disabled>Aplicar</button>');
    var selC=j.q('#spLoteCol'),cx=j.q('#spLoteValor'),rot=j.q('#spLoteValorRot'),ok=j.q('#spLoteOk'),ler=null,col=null;
    selC.onchange=async function(){
      col=cols.find(function(x){return x.id===selC.value;});ler=null;cx.innerHTML='';rot.hidden=!col;ok.disabled=!col;if(!col)return;
      var ops=await opcoesDe(col),campo;
      if(ops){campo=document.createElement('select');campo.innerHTML='<option value="">— deixar vazio —</option>'+ops.map(function(o){return '<option value="'+h(o.id)+'">'+h(o.nome)+'</option>';}).join('');ler=function(){return campo.value||null;};}
      else if(col.tipo==='sim_nao'){campo=document.createElement('select');campo.innerHTML='<option value="">— deixar vazio —</option><option value="true">Sim</option><option value="false">Não</option>';ler=function(){return campo.value===''?null:campo.value==='true';};}
      else{campo=document.createElement('input');campo.type=col.tipo==='data'?'date':'text';aplicarMascara(campo,col,null);
        ler=function(){var x=campo.value.trim();if(!x)return null;var m=tipoMascara(col);return m==='cpf'||m==='cnj'||m==='tel'?formatar(m,x):x;};}
      campo.id='spLoteCampo';cx.appendChild(campo);ok.textContent='Aplicar a '+ids.length;
    };
    ok.onclick=async function(){
      if(!col||!ler)return;var valor;try{valor=ler();}catch(e){aviso(h(e.message),true);return;}
      ok.disabled=true;selC.disabled=true;var prog=j.q('#spLoteProg'),barra=prog.querySelector('i'),msg=j.q('#spLoteMsg');prog.hidden=false;
      var feitos=0,pulados=0,erros=0;
      for(var i=0;i<ids.length;i++){
        var p=processo(ids[i]);
        if(!p||!editavel(p,col)){pulados++;}
        else{try{await gravar(p,col,valor);feitos++;}catch(e){erros++;}}
        barra.style.width=Math.round((i+1)/ids.length*100)+'%';msg.textContent=(i+1)+' de '+ids.length+'…';
      }
      j.fechar();redesenhar();
      aviso(feitos+(feitos===1?' processo alterado':' processos alterados')+(pulados?'; '+pulados+' sem permissão para alterar':'')+(erros?'; '+erros+' com erro (tente de novo)':'')+'.',erros>0);
    };
  }

  // ---------- 2) Exportar para Excel o que está na tela (colunas visíveis, filtro e ordem atuais) ----------
  var CRC=null;
  function crc32(b){if(!CRC){CRC=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CRC[n]=c>>>0;}}var x=0xFFFFFFFF;for(var i=0;i<b.length;i++)x=CRC[(x^b[i])&255]^(x>>>8);return (x^0xFFFFFFFF)>>>0;}
  function zipSemCompressao(arquivos){
    var enc=new TextEncoder(),partes=[],centrais=[],pos=0;
    function u16(v){return [v&255,(v>>>8)&255];}function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
    arquivos.forEach(function(a){
      var nome=enc.encode(a.nome),dados=enc.encode(a.texto),crc=crc32(dados);
      var loc=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(crc),u32(dados.length),u32(dados.length),u16(nome.length),u16(0));
      partes.push(new Uint8Array(loc),nome,dados);
      centrais.push({nome:nome,crc:crc,tam:dados.length,pos:pos});pos+=loc.length+nome.length+dados.length;
    });
    var ini=pos,tamCentral=0;
    centrais.forEach(function(c){var cab=[].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c.crc),u32(c.tam),u32(c.tam),u16(c.nome.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(c.pos));
      partes.push(new Uint8Array(cab),c.nome);tamCentral+=cab.length+c.nome.length;});
    partes.push(new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(centrais.length),u16(centrais.length),u32(tamCentral),u32(ini),u16(0))));
    return new Blob(partes,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function xmlTexto(v){return String(v==null?'':v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function letraCol(i){var s='';i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
  function valorExcel(p,c){
    // devolve {n:número} para valores, {t:texto} para o resto (como aparece na tela)
    var sig=!!p.sigilo&&!state.permissoes.editar_dados;
    if(sig&&c.campo_sistema!=='pessoa.nome')return {t:'(sigiloso)'};
    var v=bruto(p,c);
    if(v==null||v===''||(Array.isArray(v)&&!v.length))return {t:''};
    if((c.tipo==='moeda'||c.tipo==='numero'||c.tipo==='porcentagem')&&isFinite(Number(v)))return {n:Number(v),pct:c.tipo==='porcentagem',moeda:c.tipo==='moeda'};
    if(c.tipo==='link'&&Array.isArray(v))return {t:v.map(function(l){return l.url;}).join(' ')};
    return {t:exibir(c,texto(p,c,v))||''};
  }
  function exportarExcel(soMarcados){
    var cs=visiveis(),lista=listaFiltrada();
    if(soMarcados)lista=lista.filter(function(p){return marcados.has(String(p.id));});
    if(!lista.length){aviso('Nada para exportar com os filtros de agora.',true);return;}
    var linhas=['<row r="1">'+cs.map(function(c,i){return '<c r="'+letraCol(i)+'1" t="inlineStr" s="1"><is><t>'+xmlTexto(nomeCol(c))+'</t></is></c>';}).join('')+'</row>'];
    lista.forEach(function(p,k){var r=k+2;
      linhas.push('<row r="'+r+'">'+cs.map(function(c,i){var x=valorExcel(p,c),ref=letraCol(i)+r;
        if(x.n!=null)return '<c r="'+ref+'"'+(x.moeda?' s="2"':x.pct?' s="3"':'')+'><v>'+(x.pct?x.n/100:x.n)+'</v></c>';
        return x.t?'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xmlTexto(x.t)+'</t></is></c>':'';}).join('')+'</row>');});
    var larg=cs.map(function(c,i){var w=Math.min(48,Math.max(10,String(nomeCol(c)).length+4));return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>';}).join('');
    var nomeAba=(FASE_FIXA==='captacao'?'Captação':'Jurídico');
    var arquivos=[
      {nome:'[Content_Types].xml',texto:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'},
      {nome:'_rels/.rels',texto:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {nome:'xl/workbook.xml',texto:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+xmlTexto(nomeAba)+'" sheetId="1" r:id="rId1"/></sheets></workbook>'},
      {nome:'xl/_rels/workbook.xml.rels',texto:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
      {nome:'xl/styles.xml',texto:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>'},
      {nome:'xl/worksheets/sheet1.xml',texto:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+larg+'</cols><sheetData>'+linhas.join('')+'</sheetData><autoFilter ref="A1:'+letraCol(cs.length-1)+(lista.length+1)+'"/></worksheet>'}
    ];
    var blob=zipSemCompressao(arquivos),url=URL.createObjectURL(blob),a=document.createElement('a');
    var d=new Date(),dt=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    a.href=url;a.download='SAGA_'+(FASE_FIXA==='captacao'?'Captacao':'Juridico')+(soMarcados?'_marcados':'')+'_'+dt+'.xlsx';/* nome sem acento: alguns navegadores trocam por "download" */document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(url);a.remove();},2000);
    aviso('Planilha com '+lista.length+(lista.length===1?' processo':' processos')+' e '+cs.length+' colunas baixada.');
    return blob;
  }

  // ---------- 3) Visões salvas (filtros, ordem, colunas, ordem das colunas) ----------
  var CHAVE_VISOES=function(){return 'saga-planilha-visoes-'+FASE_FIXA+'-'+(state.meuInternoId||'');};
  function lerVisoes(){try{var v=JSON.parse(localStorage.getItem(CHAVE_VISOES())||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
  function guardarVisoes(v){try{localStorage.setItem(CHAVE_VISOES(),JSON.stringify(v));}catch(e){aviso('Não foi possível guardar neste navegador.',true);}}
  function estadoAtual(){var f={};Object.keys(filtros).forEach(function(k){f[k]=Array.from(filtros[k]);});
    return {ocultas:Object.assign({},ocultas||{}),filtros:f,ordem:ordem,protocolo:protocolo,retorno:retorno,minhas:minhas,ordemCols:ordemCols?ordemCols.slice():null};}
  function aplicarVisao(v){var s=v.estado||{};ocultas=s.ocultas||padraoOcultas();filtros={};Object.keys(s.filtros||{}).forEach(function(k){filtros[k]=new Set(s.filtros[k]);});
    ordem=s.ordem||null;protocolo=s.protocolo||'';retorno=s.retorno||'';minhas=!!s.minhas;ordemCols=s.ordemCols||null;fecharMenu();aplicar();aviso('Visão "'+h(v.nome)+'" aplicada.');}
  function menuVisoes(ancora){
    fecharMenu();
    var vs=lerVisoes(),m=document.createElement('div');m.className='sp-menu';m.style.width='290px';
    var desenhar=function(){
      vs=lerVisoes();
      m.innerHTML='<div class="sp-menu-tit">Visões salvas</div>'+
        (vs.length?'<div class="sp-lista">'+vs.map(function(v,i){return '<div class="sp-visao"><button type="button" class="sp-op" data-ver="'+i+'" title="Aplicar esta visão">'+h(v.nome)+'</button><button type="button" class="sp-ico" data-renomear-v="'+i+'" title="Renomear" aria-label="Renomear '+h(v.nome)+'">✎</button><button type="button" class="sp-ico" data-subir-v="'+i+'" title="Subir na lista" aria-label="Subir '+h(v.nome)+'"'+(i?'':' disabled')+'>↑</button><button type="button" class="sp-ico" data-tirar-v="'+i+'" title="Remover" aria-label="Remover '+h(v.nome)+'">×</button></div>';}).join('')+'</div>':
          '<p class="sp-ajuda" style="margin:2px 4px 6px">Nenhuma visão salva ainda. Monte os filtros, a ordem e as colunas e salve aqui (ex.: "Protocolados TRF-5").</p>')+
        '<div class="sp-visao-nova"><input type="text" maxlength="40" placeholder="Nome da visão atual" data-nome-v aria-label="Nome da visão atual"><button type="button" class="btn-primary sp-btn" data-salvar-v>Salvar</button></div>'+
        '<button type="button" class="sp-op" data-padrao-v>Voltar ao padrão (sem filtros)</button>';
    };
    desenhar();
    document.body.appendChild(m);menuAberto=m;
    var r=ancora.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,window.innerWidth-298))+'px';caberNaTela(m,r);
    m.addEventListener('click',function(e){
      e.stopPropagation();var t=e.target.closest('button');if(!t)return;
      if(t.dataset.ver!=null){aplicarVisao(vs[+t.dataset.ver]);return;}
      if(t.dataset.tirarV!=null){var n=vs[+t.dataset.tirarV].nome;vs.splice(+t.dataset.tirarV,1);guardarVisoes(vs);desenhar();aviso('Visão "'+h(n)+'" removida.');return;}
      if(t.dataset.subirV!=null){var i=+t.dataset.subirV;if(i>0){var x=vs[i];vs[i]=vs[i-1];vs[i-1]=x;guardarVisoes(vs);desenhar();}return;}
      if(t.dataset.renomearV!=null){var k=+t.dataset.renomearV,linha=t.parentNode;linha.innerHTML='<input type="text" maxlength="40" class="sp-editor" value="'+h(vs[k].nome)+'" aria-label="Novo nome">';var inp=linha.querySelector('input');inp.focus();inp.select();
        var ok=function(){var nn=inp.value.trim();if(nn){vs[k].nome=nn;guardarVisoes(vs);}desenhar();};inp.onkeydown=function(ev){if(ev.key==='Enter'){ev.preventDefault();ok();}else if(ev.key==='Escape'){ev.stopPropagation();desenhar();}};inp.onblur=ok;return;}
      if(t.hasAttribute('data-salvar-v')){var nm=m.querySelector('[data-nome-v]').value.trim();if(!nm){m.querySelector('[data-nome-v]').focus();return;}
        var ja=vs.findIndex(function(v){return norm(v.nome)===norm(nm);});var nova={nome:nm,estado:estadoAtual(),em:new Date().toISOString()};
        if(ja>=0)vs[ja]=nova;else vs.push(nova);guardarVisoes(vs);desenhar();aviso(ja>=0?'Visão "'+h(nm)+'" atualizada.':'Visão "'+h(nm)+'" salva.');return;}
      if(t.hasAttribute('data-padrao-v')){filtros={};ordem=null;protocolo='';retorno='';minhas=false;ordemCols=null;ocultas=padraoOcultas();fecharMenu();aplicar();aviso('Planilha de volta ao padrão.');}
    });
    m.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.hasAttribute('data-nome-v')){e.preventDefault();m.querySelector('[data-salvar-v]').click();}});
  }

  // ---------- 4) Ordem das colunas: arrastar o cabeçalho ----------
  var ordemCols=null;
  function ligarArrastarColunas(thead){
    if(thead._spArrastar)return;thead._spArrastar=true;
    var ini=null,arr=null,marca=null,fant=null,alvo=null,ignorarClique=false;
    thead.addEventListener('click',function(e){if(ignorarClique){e.stopPropagation();e.preventDefault();ignorarClique=false;}},true);
    thead.addEventListener('pointerdown',function(e){
      if(e.button!==0||e.target.closest('[data-sp-redim]'))return;
      var th=e.target.closest('th[data-sp-col]');if(!th)return;
      var c=cols.find(function(x){return x.id===th.dataset.spCol;});if(!c||c.campo_sistema==='pessoa.nome')return;
      ini={x:e.clientX,y:e.clientY,th:th,id:th.dataset.spCol};
    });
    window.addEventListener('pointermove',function(e){
      if(!ini)return;
      if(!arr){if(Math.abs(e.clientX-ini.x)<8)return;arr=ini;arr.th.classList.add('sp-col-arrastando');
        fant=document.createElement('div');fant.id='spFantasmaCol';fant.textContent=arr.th.textContent.replace(/[▾⏷↑↓]/g,'').trim();document.body.appendChild(fant);
        marca=document.createElement('div');marca.id='spMarcaColuna';document.body.appendChild(marca);fecharMenu();}
      fant.style.left=(e.clientX+12)+'px';fant.style.top=(e.clientY+10)+'px';
      var ths=Array.prototype.slice.call(thead.querySelectorAll('th[data-sp-col]')),tr=thead.getBoundingClientRect(),melhor=null;
      ths.forEach(function(t){var rr=t.getBoundingClientRect(),meio=rr.left+rr.width/2;var lado=e.clientX<meio?'antes':'depois';var x=lado==='antes'?rr.left:rr.right;var d=Math.abs(e.clientX-x);if(!melhor||d<melhor.d)melhor={d:d,t:t,lado:lado,x:x};});
      if(melhor){var cn=cols.find(function(x){return x.id===melhor.t.dataset.spCol;});
        if(cn&&cn.campo_sistema==='pessoa.nome'&&melhor.lado==='antes'){melhor.lado='depois';melhor.x=melhor.t.getBoundingClientRect().right;}
        alvo=melhor;marca.style.left=(melhor.x-1)+'px';marca.style.top=tr.top+'px';marca.style.height=Math.min(window.innerHeight-tr.top,thead.parentNode.getBoundingClientRect().height)+'px';}
    });
    window.addEventListener('pointerup',function(){
      if(!ini)return;var a=arr,al=alvo;ini=null;arr=null;alvo=null;
      if(fant){fant.remove();fant=null;}if(marca){marca.remove();marca=null;}
      if(!a)return;ignorarClique=true;setTimeout(function(){ignorarClique=false;},0);a.th.classList.remove('sp-col-arrastando');
      if(!al||al.t.dataset.spCol===a.id)return;
      var lista=colunasDaTela().map(function(c){return c.id;}).filter(function(id){return id!==a.id;});
      var pos=lista.indexOf(al.t.dataset.spCol);if(pos<0)return;if(al.lado==='depois')pos++;
      lista.splice(pos,0,a.id);
      // a coluna anda até o lugar novo (o cabeçalho desliza; a tabela inteira é redesenhada em seguida)
      var antesX={};Array.prototype.forEach.call(thead.querySelectorAll('th[data-sp-col]'),function(t){antesX[t.dataset.spCol]=t.getBoundingClientRect().left;});
      ordemCols=lista;guardar();redesenhar();
      if(!semMovimento()){var th2=document.querySelector('#listaView table thead');if(th2)Array.prototype.forEach.call(th2.querySelectorAll('th[data-sp-col]'),function(t){var x0=antesX[t.dataset.spCol];if(x0==null)return;var dx=x0-t.getBoundingClientRect().left;if(Math.abs(dx)>1&&t.animate)t.animate([{transform:'translateX('+dx+'px)'},{transform:'none'}],{duration:300,easing:CURVA});});}
      aviso('Ordem das colunas guardada (só para você). Para voltar à ordem do escritório: Visões › Voltar ao padrão.');
    });
  }

  return {dadosNovoNaColuna:dadosNovoNaColuna,esquecerNovoNaColuna:esquecerNovoNaColuna,exportarExcel:exportarExcel,pintarLote:pintarLote,retornoDe:function(p){var c=colPorChave('captacao.data_retorno'),v=c&&(p.campos||{})[c.id];return v?String(v).slice(0,10):null;},renderFunil:renderFunil,mesmaEtapa:mesmaEtapa,fichaDados:fichaDados,formatar:formatarCampo,UFS:UFS,iniciar:iniciar,passa:passa,ordenar:ordenar,renderTabela:renderTabela,cartoesHtml:cartoesHtml,kanbanAgrupado:kanbanAgrupado,soltarNoGrupo:soltarNoGrupo,limpar:limpar,pronta:function(){return pronta;},_gerenciar:false};
})();
