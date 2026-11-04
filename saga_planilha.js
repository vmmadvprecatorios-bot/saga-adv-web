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
  var cols=[],situacoes=[],pronta=false,filtros={},ordem=null,protocolo='',ocultas=null,editando=false,menuAberto=null;
  var CHAVE=function(){return 'saga-planilha-'+FASE_FIXA+'-'+(state.meuInternoId||'');};
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
    if(c.tipo==='porcentagem')return Number(v).toLocaleString('pt-BR')+'%';
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

  function colunasDaTela(){return cols.filter(function(c){return c.ativo&&(c.escopo==='ambos'||c.escopo===FASE_FIXA)&&!(FASE_FIXA==='juridico'&&SO_CAPTACAO.indexOf(c.campo_sistema)!==-1);});}
  function visiveis(){var oc=ocultas||{};return colunasDaTela().filter(function(c){return !oc[c.id];});}
  function lerPreferencias(){
    try{var s=JSON.parse(localStorage.getItem(CHAVE())||'null');if(s){ocultas=s.ocultas||{};filtros={};Object.keys(s.filtros||{}).forEach(function(k){filtros[k]=new Set(s.filtros[k]);});ordem=s.ordem||null;protocolo=s.protocolo||'';}}catch(e){}
    if(!ocultas)ocultas={};
  }
  function guardar(){
    try{var f={};Object.keys(filtros).forEach(function(k){f[k]=Array.from(filtros[k]);});localStorage.setItem(CHAVE(),JSON.stringify({ocultas:ocultas,filtros:f,ordem:ordem,protocolo:protocolo}));}catch(e){}
  }

  // ---------- filtros e ordem (usados pela tela em processoNoEscopo e prepararVisaoProcessos) ----------
  function passa(p,ignorarCol){
    if(!pronta)return true;
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
      return texto(a,c,va).localeCompare(texto(b,c,vb),'pt-BR',{numeric:true,sensitivity:'base'})*dir;
    });
  }

  // ---------- tabela ----------
  function renderTabela(lista){
    var cs=visiveis(),thead=document.querySelector('#listaView table thead'),tb=document.getElementById('tbodyPrincipal');
    if(!thead||!tb)return;
    var tabela=thead.parentNode;tabela.classList.add('sp-tabela');
    thead.innerHTML='<tr><th class="checkbox-col"><input type="checkbox" id="chkTodos"></th>'+cs.map(function(c){
      var ativo=filtros[c.id]||(ordem&&ordem.coluna===c.id);
      var seta=ordem&&ordem.coluna===c.id?(ordem.direcao==='asc'?' ↑':' ↓'):'';
      return '<th data-sp-col="'+h(c.id)+'"><button type="button" class="sp-th'+(ativo?' ativo':'')+'" data-sp-menu="'+h(c.id)+'" title="Filtrar e ordenar">'+h(c.nome)+seta+'<span class="sp-funil">'+(filtros[c.id]?'⏷':'▾')+'</span></button></th>';
    }).join('')+'<th></th></tr>';
    tb.innerHTML=lista.map(function(p){
      var sig=!!p.sigilo&&!state.permissoes.editar_dados;
      return '<tr data-sp-proc="'+h(p.id)+'"><td onclick="event.stopPropagation()"><input type="checkbox" class="chk-linha" value="'+h(p.id)+'"></td>'+cs.map(function(c){
        var t=sig&&c.campo_sistema!=='pessoa.nome'?'••••':texto(p,c),cor=sig?null:corDe(p,c),v=bruto(p,c);
        var conteudo;
        if(c.campo_sistema==='pessoa.nome')conteudo='<span class="nome-cliente sp-link-ficha">'+h(t||'N/D')+'</span>';
        else if(c.tipo==='link'&&!sig&&Array.isArray(v))conteudo=v.map(function(l){var u=/^https?:\/\//i.test(l.url||'')?l.url:'';return u?'<a href="'+h(u)+'" target="_blank" rel="noopener noreferrer" class="sp-link" onclick="event.stopPropagation()">'+h(l.texto||l.url)+'</a>':'';}).join(' · ');
        else if(cor&&t)conteudo='<span class="badge-status" style="background:color-mix(in srgb,'+h(cor)+' 15%,transparent);color:'+h(cor)+'"><span style="background:'+h(cor)+'"></span>'+h(t)+'</span>';
        else conteudo=h(t)||'<span class="sp-vazio">—</span>';
        return '<td data-sp-cel="'+h(c.id)+'" class="'+(editavel(p,c)?'sp-editavel':'')+'" title="'+h(t)+'">'+conteudo+'</td>';
      }).join('')+'<td>'+acoesBtns(p)+'</td></tr>';
    }).join('');
    tb.querySelectorAll('tr[data-sp-proc]').forEach(function(tr){tr.onclick=null;});
  }
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
    var itens=Array.from(mapa.values()).sort(function(a,b){if(a.k===VAZIO)return 1;if(b.k===VAZIO)return -1;return a.t.localeCompare(b.t,'pt-BR',{numeric:true,sensitivity:'base'});});
    var atual=filtros[c.id];
    var m=document.createElement('div');m.className='sp-menu';m.setAttribute('role','dialog');m.setAttribute('aria-label','Filtro da coluna '+c.nome);
    m.innerHTML='<div class="sp-menu-tit">'+h(c.nome)+'</div>'+
      '<button type="button" class="sp-op" data-ord="asc">Ordenar de A a Z ↑</button><button type="button" class="sp-op" data-ord="desc">Ordenar de Z a A ↓</button>'+
      (ocultavel(c)?'<button type="button" class="sp-op" data-ocultar>Ocultar esta coluna</button>':'')+
      '<div class="sp-sep"></div><input type="search" class="sp-busca" placeholder="Pesquisar">'+
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
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)m.animate([{opacity:0,transform:'translateY(-6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,1.4,.4,1)'});
  }
  function ocultavel(c){return c.campo_sistema!=='pessoa.nome';}
  function processoNoEscopoSemPlanilha(p){var antes=pronta;pronta=false;try{return processoNoEscopo(p);}finally{pronta=antes;}}
  function aplicar(){guardar();state.page=1;renderBarra();if(typeof renderTagsAtivas==='function')renderTagsAtivas();if(state.view==='lista')renderLista();else renderKanban();if(typeof atualizarContagem==='function')atualizarContagem();}

  // ---------- edição na célula ----------
  async function opcoesDe(c){
    if(c.campo_sistema==='processo.status')return (state.statusList||[]).filter(function(s){return (s.fase||'')===FASE_FIXA;}).map(function(s){return {id:s.id,nome:s.nome};});
    if(c.campo_sistema==='processo.tese')return (state.teses||[]).filter(function(t){return t.ativo!==false;}).map(function(t){return {id:t.id,nome:t.nome};});
    if(c.campo_sistema==='processo.area'){try{return (catalogoTeses.todasAreas()||[]).filter(function(a){return a.ativo!==false;}).map(function(a){return {id:a.id,nome:a.nome};});}catch(e){return [];}}
    if(c.campo_sistema==='processo.situacao_acao')return situacoes.filter(function(s){return s.ativo!==false;}).map(function(s){return {id:s.id,nome:s.nome};});
    if(c.campo_sistema==='pessoa.situacao_vital')return [{id:'vivo',nome:'Vivo'},{id:'falecido',nome:'Falecido'}];
    if(c.tipo==='usuario')return (state.responsaveis||[]).map(function(u){return {id:u.id,nome:u.nome_completo};});
    if(c.tipo==='opcao')return (c.opcoes||[]).filter(function(o){return o.ativo!==false;}).sort(function(a,b){return (a.ordem||0)-(b.ordem||0);}).map(function(o){return {id:o.id,nome:o.nome};});
    return null;
  }
  async function editar(td){
    if(editando)return;
    var p=processo(td.closest('tr').dataset.spProc),c=cols.find(function(x){return x.id===td.dataset.spCel;});
    if(!p||!c||!editavel(p,c))return;
    editando=true;var antes=td.innerHTML,v=bruto(p,c);
    try{
      var ops=await opcoesDe(c),campo,ler;
      var podeNova=c.tipo==='opcao'&&!c.campo_sistema&&SagaPlanilha._gerenciar;
      if(ops){
        campo=document.createElement('select');
        campo.innerHTML='<option value="">— vazio —</option>'+ops.map(function(o){return '<option value="'+h(o.id)+'">'+h(o.nome)+'</option>';}).join('')+(podeNova?'<option value="__nova">+ Nova opção...</option>':'');
        if(v!=null&&!ops.some(function(o){return String(o.id)===String(v);})){var op=new Option(texto(p,c,v)+' (desativada)',v);op.disabled=true;campo.add(op,1);}
        campo.value=v==null?'':String(v);
        ler=function(){return campo.value||null;};
      }else if(c.tipo==='sim_nao'){
        campo=document.createElement('select');campo.innerHTML='<option value="">— vazio —</option><option value="true">Sim</option><option value="false">Não</option>';
        campo.value=v===true||v==='true'?'true':v===false||v==='false'?'false':'';ler=function(){return campo.value===''?null:campo.value==='true';};
      }else if(c.tipo==='link'){
        campo=document.createElement('input');campo.type='url';campo.placeholder='https://...';campo.value=Array.isArray(v)&&v[0]?v[0].url:'';
        ler=function(){var u=campo.value.trim();if(!u)return null;var t=Array.isArray(v)&&v[0]&&v[0].texto&&v[0].texto!==v[0].url?v[0].texto:u;return [{url:u,texto:t}];};
      }else{
        campo=document.createElement('input');campo.type=c.tipo==='data'?'date':'text';
        if(['numero','moeda','porcentagem'].indexOf(c.tipo)!==-1){campo.inputMode='decimal';campo.value=v==null?'':String(v).replace('.',',');}
        else campo.value=v==null?'':(c.tipo==='data'?String(v).slice(0,10):String(v));
        ler=function(){return campo.value.trim()||null;};
      }
      campo.className='sp-editor';td.innerHTML='';td.appendChild(campo);campo.focus();if(campo.select&&campo.tagName==='INPUT'&&campo.type==='text')campo.select();
      var feito=false;
      var cancelar=function(){if(feito)return;feito=true;editando=false;td.innerHTML=antes;};
      var salvar=async function(){
        if(feito)return;
        if(campo.value==='__nova'){
          // Campo para escrever a opção nova, no lugar do menu
          feito=true;var inp=document.createElement('input');inp.type='text';inp.className='sp-editor';inp.placeholder='Nome da nova opção';td.innerHTML='';td.appendChild(inp);inp.focus();
          var pronto=false;
          var criar=async function(){if(pronto)return;pronto=true;var nome=inp.value.trim();if(!nome){editando=false;td.innerHTML=antes;return;}
            td.classList.add('sp-salvando');
            try{var lista=(c.opcoes||[]).map(function(o){return {id:o.id,nome:o.nome,cor:o.cor,ativo:o.ativo!==false};}).concat([{nome:nome}]);
              await rpcOk('lista_coluna_salvar',{p_id:c.id,p_nome:c.nome,p_opcoes:lista});await carregarColunas();
              var c2=cols.find(function(x){return x.id===td.dataset.spCel;});var nova=(c2.opcoes||[]).find(function(o){return norm(o.nome)===norm(nome);});
              await gravar(p,c2,nova?nova.id:null);showToast('Opção "'+esc(nome)+'" criada.','success');}
            catch(e){showToast(esc(e.message||'Não foi possível salvar.'),'danger');}
            editando=false;aplicar();};
          inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();criar();}else if(e.key==='Escape'){pronto=true;editando=false;td.innerHTML=antes;}});
          inp.addEventListener('blur',function(){setTimeout(criar,0);});
          return;
        }
        var novo;try{novo=ler();}catch(e){showToast(esc(e.message),'danger');return;}
        feito=true;
        if(String(novo==null?'':JSON.stringify(novo))===String(v==null?'':JSON.stringify(v))){editando=false;td.innerHTML=antes;return;}
        td.classList.add('sp-salvando');
        try{await gravar(p,c,novo);}catch(e){showToast(esc(e.message||'Não foi possível salvar.'),'danger');}
        editando=false;aplicar();
      };
      campo.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();cancelar();}else if(e.key==='Enter'){e.preventDefault();salvar();}});
      campo.addEventListener('blur',function(){setTimeout(salvar,0);});
      if(campo.tagName==='SELECT')campo.addEventListener('change',function(){salvar();});
    }catch(e){editando=false;td.innerHTML=antes;showToast(esc(e.message||'Erro.'),'danger');}
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
      '<div class="sp-col-acoes"><button type="button" class="btn-secondary" data-todas>Mostrar todas</button><button type="button" class="btn-secondary" data-poucas>Só as principais</button></div>'+
      '<div class="sp-col-lista">'+cs.map(function(c){return '<label class="sp-item"><input type="checkbox" value="'+h(c.id)+'"'+(ocultas[c.id]?'':' checked')+(ocultavel(c)?'':' disabled')+'> <span>'+h(c.nome)+'</span></label>';}).join('')+'</div>'+
      (SagaPlanilha._gerenciar?'<p class="sp-ajuda">Criar, renomear ou remover colunas do escritório e as opções de cada uma: em breve aqui; por enquanto, peça ao Claude.</p>':'')+
      '</div><div class="modal-foot"><button type="button" class="btn-primary" data-ok>Aplicar</button></div></div>';
    document.body.appendChild(ov);
    var fechar=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-fechar]'))fechar();});
    var PRINCIPAIS=['processo.numero','pessoa.nome','pessoa.cpf','processo.area','processo.tese','processo.status','processo.responsavel','processo.situacao_acao','processo.ultima_movimentacao','processo.captador'];
    ov.querySelector('[data-todas]').onclick=function(){ov.querySelectorAll('.sp-col-lista input').forEach(function(i){i.checked=true;});};
    ov.querySelector('[data-poucas]').onclick=function(){ov.querySelectorAll('.sp-col-lista input').forEach(function(i){var c=cols.find(function(x){return x.id===i.value;});i.checked=!ocultavel(c)||PRINCIPAIS.indexOf(c.campo_sistema)!==-1||/status da peti|tipo de a|compet/i.test(norm(c.nome));});};
    ov.querySelector('[data-ok]').onclick=function(){ocultas={};ov.querySelectorAll('.sp-col-lista input').forEach(function(i){if(!i.checked)ocultas[i.value]=true;});Object.keys(filtros).forEach(function(k){if(ocultas[k])delete filtros[k];});fechar();aplicar();};
  }

  // ---------- barra (protocolados, colunas, filtros ativos) ----------
  function renderBarra(){
    var b=document.getElementById('spBarra');if(!b)return;
    var n=Object.keys(filtros).length+(ordem?1:0);
    b.innerHTML='<div class="sp-pills" role="group" aria-label="Protocolo">'+[['','Todos'],['sim','Protocolados'],['nao','Não protocolados']].map(function(o){return '<button type="button" class="sp-pill'+(protocolo===o[0]?' ativo':'')+'" data-protocolo="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>'+
      '<button type="button" class="btn-secondary sp-btn" data-colunas>Colunas</button>'+
      (n?'<button type="button" class="sp-limpar-tudo" data-limpar>Limpar filtros das colunas ('+n+')</button>':'');
    b.querySelectorAll('[data-protocolo]').forEach(function(x){x.onclick=function(){protocolo=x.dataset.protocolo;aplicar();};});
    b.querySelector('[data-colunas]').onclick=escolherColunas;
    var l=b.querySelector('[data-limpar]');if(l)l.onclick=function(){filtros={};ordem=null;aplicar();};
  }
  function limpar(){filtros={};ordem=null;protocolo='';guardar();renderBarra();}

  function estilos(){
    if(document.getElementById('spEstilo'))return;
    var st=document.createElement('style');st.id='spEstilo';st.textContent=
      '.sp-tabela{min-width:max-content}.sp-tabela th{padding:0;position:sticky;top:0;z-index:2;background:var(--panel)}'+
      '.sp-th{display:flex;align-items:center;gap:6px;width:100%;padding:13px 14px;border:0;background:none;color:inherit;font:inherit;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;white-space:nowrap;text-align:left}'+
      '.sp-th:hover,.sp-th.ativo{color:var(--gold-light)}.sp-funil{opacity:.7;font-size:10px}.sp-th:active{transform:scale(.97)}'+
      '.sp-tabela td{max-width:260px;overflow:hidden;text-overflow:ellipsis}.sp-tabela td.sp-editavel{cursor:cell}.sp-tabela td.sp-editavel:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 35%,transparent)}'+
      '.sp-tabela td.sp-salvando{opacity:.5}.sp-vazio{color:var(--muted)}.sp-link{color:var(--gold-light);text-decoration:underline}.sp-link-ficha{cursor:pointer}.sp-link-ficha:hover{text-decoration:underline}'+
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
      '.sp-modal{max-width:520px;width:94vw}.sp-col-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px;max-height:52vh;overflow:auto;margin-top:8px}.sp-ajuda{font-size:11.5px;color:var(--muted);margin:0 0 8px}.sp-col-acoes{display:flex;gap:6px;flex-wrap:wrap}'+
      '#listaView .tabela-scroll{max-height:70vh;overflow:auto}';
    document.head.appendChild(st);
  }

  async function carregarColunas(){
    var r=await _sb.from('lista_colunas').select('id,nome,tipo,escopo,campo_sistema,opcoes,ordem,ativo').order('ordem');
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
    var barra=document.createElement('div');barra.id='spBarra';
    var lv=document.getElementById('listaView');lv.parentNode.insertBefore(barra,lv);
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
    document.addEventListener('mousedown',function(e){if(menuAberto&&!menuAberto.contains(e.target)&&!e.target.closest('[data-sp-menu]'))fecharMenu();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')fecharMenu();});
    window.addEventListener('resize',fecharMenu);
    return true;
  }
  return {iniciar:iniciar,passa:passa,ordenar:ordenar,renderTabela:renderTabela,limpar:limpar,pronta:function(){return pronta;},_gerenciar:false};
})();
