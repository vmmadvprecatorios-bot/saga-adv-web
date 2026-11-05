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
      return '<th data-sp-col="'+h(c.id)+'"><button type="button" class="sp-th'+(ativo?' ativo':'')+'" data-sp-menu="'+h(c.id)+'" title="Filtrar e ordenar">'+h(nomeCol(c))+seta+'<span class="sp-funil">'+(filtros[c.id]?'⏷':'▾')+'</span></button></th>';
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
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)m.animate([{opacity:0,transform:'translateY(-6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,1.4,.4,1)'});
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
      }else{
        campo=document.createElement('input');campo.type=c.tipo==='data'?'date':'text';
        campo.value=v==null?'':(c.tipo==='data'?String(v).slice(0,10):String(v));
        aplicarMascara(campo,c,v);
        ler=function(){var x=campo.value.trim();if(!x)return null;var m=tipoMascara(c);return m==='cpf'||m==='cnj'||m==='tel'?formatar(m,x):x;};
      }
      campo.className='sp-editor';td.innerHTML='';td.appendChild(campo);campo.focus();if(campo.tagName==='INPUT'&&campo.type==='text'&&campo.select)campo.select();
      var feito=false;
      var cancelar=function(){if(feito)return;feito=true;terminar();td.innerHTML=antes;};
      var salvar=async function(){
        if(feito)return;
        if(campo.value==='__nova'){
          feito=true;var inp=document.createElement('input');inp.type='text';inp.className='sp-editor';inp.placeholder='Nome da nova opção';td.innerHTML='';td.appendChild(inp);inp.focus();
          var pronto=false;
          var criar=async function(){if(pronto)return;pronto=true;var nome=inp.value.trim();if(!nome){terminar();td.innerHTML=antes;return;}
            td.classList.add('sp-salvando');
            try{var lista=(c.opcoes||[]).map(function(o){return {id:o.id,nome:o.nome,cor:o.cor,ativo:o.ativo!==false};}).concat([{nome:nome}]);
              await rpcOk('lista_coluna_salvar',{p_id:c.id,p_nome:c.nome,p_opcoes:lista});await carregarColunas();
              var c2=cols.find(function(x){return x.id===c.id;});var nova=(c2.opcoes||[]).find(function(o){return norm(o.nome)===norm(nome);});
              await cfg.gravar(nova?nova.id:null,c2);aviso('Opção "'+h(nome)+'" criada.');}
            catch(e){aviso(h(e.message||'Não foi possível salvar.'),true);}
            terminar();cfg.depois();};
          inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();criar();}else if(e.key==='Escape'){pronto=true;terminar();td.innerHTML=antes;}});
          inp.addEventListener('blur',function(){setTimeout(criar,0);});
          return;
        }
        var novo;try{novo=ler();}catch(e){aviso(h(e.message),true);return;}
        feito=true;
        if(JSON.stringify(novo==null?null:novo)===JSON.stringify(v==null||v===''?null:v)){terminar();td.innerHTML=antes;return;}
        td.classList.add('sp-salvando');
        try{await cfg.gravar(novo,c);}catch(e){aviso(h(e.message||'Não foi possível salvar.'),true);}
        terminar();cfg.depois();
      };
      campo.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();cancelar();}else if(e.key==='Enter'){e.preventDefault();salvar();}});
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
    await editarCelula(td,{c:c,v:bruto(p,c),texto:texto(p,c),opcoes:function(){return opcoesDe(c);},
      podeNova:c.tipo==='opcao'&&!c.campo_sistema&&SagaPlanilha._gerenciar,
      gravar:function(valor,cc){return gravar(p,cc||c,valor);},depois:aplicar});
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
      '<div class="sp-col-lista">'+cs.map(function(c){return '<label class="sp-item"><input type="checkbox" value="'+h(c.id)+'"'+(ocultas[c.id]?'':' checked')+(ocultavel(c)?'':' disabled')+'> <span>'+h(nomeCol(c))+'</span></label>';}).join('')+'</div>'+
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
    renderAbas();
    var b=document.getElementById('spBarra');if(!b)return;
    var n=Object.keys(filtros).length+(ordem?1:0);
    var capt=FASE_FIXA==='captacao';
    b.innerHTML=(capt?'<div class="sp-pills" role="group" aria-label="Data de retorno">'+[['','Todos os retornos'],['hoje','Retorno hoje'],['atrasados','Atrasados'],['semana','Próximos 7 dias']].map(function(o){return '<button type="button" class="sp-pill'+(retorno===o[0]?' ativo':'')+'" data-retorno="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>'+
        '<button type="button" class="sp-pill sp-pill-solta'+(minhas?' ativo':'')+'" data-minhas aria-pressed="'+minhas+'">Minhas fichas</button>'+
        '<button type="button" class="btn-secondary sp-btn" data-importar>Importar planilha</button><button type="button" class="btn-secondary sp-btn" data-distribuir>Distribuir fichas</button>':
      '<div class="sp-pills" role="group" aria-label="Protocolo">'+[['','Todos'],['sim','Protocolados'],['nao','Não protocolados']].map(function(o){return '<button type="button" class="sp-pill'+(protocolo===o[0]?' ativo':'')+'" data-protocolo="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>')+
      '<button type="button" class="btn-secondary sp-btn" data-colunas>Colunas</button>'+
      (n?'<button type="button" class="sp-limpar-tudo" data-limpar>Limpar filtros das colunas ('+n+')</button>':'');
    b.querySelectorAll('[data-protocolo]').forEach(function(x){x.onclick=function(){protocolo=x.dataset.protocolo;aplicar();};});
    b.querySelector('[data-colunas]').onclick=escolherColunas;
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
      '<div class="sp-sub">'+(atual!=='*'&&teses.length?'<div class="sp-pills sp-teses" role="group" aria-label="Tese"><button type="button" class="sp-pill'+(!teseAtual?' ativo':'')+'" data-tese="">Todas as teses</button>'+teses.map(function(t){return '<button type="button" class="sp-pill'+(teseAtual===t.id?' ativo':'')+'" data-tese="'+h(t.id)+'">'+h(t.nome)+'</button>';}).join('')+'</div>':'')+
      (tipo?'<label class="sp-tipo">Tipo de ação <select data-tipo><option value="">Todos</option>'+opcoesDaColuna(tipo).map(function(o){return '<option value="'+h(o.id)+'"'+(String(o.id)===String(tipoSel)?' selected':'')+'>'+h(o.nome)+'</option>';}).join('')+'</select></label>':'')+(state.admin?'<a class="sp-org" href="configuracoes_padrao_metalico.html?aba=areas-teses">Organizar áreas e teses</a>':'')+'</div>';
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
      '.sp-selo{display:inline-flex;align-items:center;gap:6px;font-size:12px}.sp-selo i{width:7px;height:7px;border-radius:50%;flex:0 0 auto}.sp-rapidos{display:flex;gap:2px;flex-wrap:wrap}'+
      '.sp-ficha{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 14px}.sp-ficha .campo-dado{min-width:0}.sp-ficha .campo-dado-valor{min-height:22px;overflow-wrap:anywhere}'+
      '.sp-ficha .sp-editavel{cursor:pointer;border-radius:6px;padding:2px 4px;margin:-2px -4px}.sp-ficha .sp-editavel:hover{background:color-mix(in srgb,var(--gold) 8%,transparent)}.sp-ficha .sp-lapis{opacity:0;font-size:11px;margin-left:5px;color:var(--muted)}.sp-ficha .sp-editavel:hover .sp-lapis{opacity:1}'+
      '.sp-ficha-barra{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px;padding-top:10px;border-top:1px solid var(--border-soft)}'+
      '.sp-ficha-toggle{border:0;background:none;color:var(--gold-light);font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:4px 0}.sp-ficha-toggle:active{transform:scale(.97)}'+
      '.sp-ficha-padrao{border:0;background:none;color:var(--muted);font:inherit;font-size:11px;text-decoration:underline;cursor:pointer}'+
      '.sp-ficha-todos{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 14px}.sp-ficha-todos[hidden]{display:none}'+
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
  // ---------- importar planilha (colar do Excel/Google Planilhas ou arquivo .csv) ----------
  function janela(titulo,corpo,rodape){
    var ov=document.createElement('div');ov.className='modal-overlay sp-ov';ov.style.display='flex';
    ov.innerHTML='<div class="modal sp-modal sp-modal-larga" role="dialog" aria-modal="true" aria-label="'+h(titulo)+'"><div class="modal-head"><h3>'+h(titulo)+'</h3><button class="modal-close" type="button" data-fechar aria-label="Fechar">×</button></div><div class="modal-body">'+corpo+'</div><div class="modal-foot">'+(rodape||'')+'</div></div>';
    document.body.appendChild(ov);
    var fechar=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-fechar]'))fechar();});
    ov.addEventListener('keydown',function(e){if(e.key==='Escape')fechar();});
    var m=ov.querySelector('.modal');if(!matchMedia('(prefers-reduced-motion: reduce)').matches)m.animate([{opacity:0,transform:'translateY(14px) scale(.97)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,1.3,.4,1)'});
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
    'processo.tese':['tese'],'pessoa.uf':['uf','estado'],'pessoa.telefone':['telefone','celular','whatsapp','fone'],'pessoa.email':['email','e-mail']};
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
      '<p class="sp-ajuda">Copie as linhas no Excel ou no Google Planilhas e cole abaixo (Ctrl+V), ou escolha um arquivo .csv. Pode vir só com nome e CPF, ou com processo, TRF, tipo de ação e valor, em qualquer ordem: o sistema reconhece as colunas e o senhor confere antes de gravar.</p>'+
      '<textarea class="sp-colar" placeholder="Cole aqui as linhas da planilha"></textarea>'+
      '<div class="sp-imp-linha"><label class="btn-secondary sp-arquivo">Escolher arquivo .csv<input type="file" accept=".csv,.txt,.tsv" hidden></label><span class="sp-ajuda" style="margin:0">Planilha do Excel (.xlsx): use Arquivo &gt; Salvar como &gt; CSV, ou copie e cole.</span></div>'+
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
        '<div class="sp-imp-linha"><label class="sp-ajuda" style="margin:0">Tese para as linhas sem tese:</label><select class="sp-tese">'+teses.map(function(t){return '<option value="'+h(t.id)+'">'+h(t.nome)+'</option>';}).join('')+'</select></div>';
      j.q('.sp-imp-mapa').querySelectorAll('select[data-col]').forEach(function(sel){sel.onchange=function(){mapa[+sel.dataset.col]=sel.value;conferencia=null;j.q('[data-gravar]').hidden=true;j.q('.sp-imp-res').innerHTML='';};});
      j.q('[data-conferir]').disabled=false;
    };
    var linhasParaGravar=function(){
      var compId=(cols.find(function(c){return c.nome==='Competência';})||{}).id;
      return dados.map(function(l){var o={};mapa.forEach(function(k,i){if(!k||l[i]==null||l[i]==='')return;var v=l[i];if(k===compId)v=normTribunal(v);if(k==='pessoa.cpf'||k==='processo.numero')v=formatar(k==='pessoa.cpf'?'cpf':'cnj',v);o[k]=v;});return o;});
    };
    j.q('.sp-colar').addEventListener('input',function(){montar(this.value);});
    j.q('input[type=file]').addEventListener('change',function(){var f=this.files[0];if(!f)return;var r=new FileReader();r.onload=function(){j.q('.sp-colar').value=r.result;montar(r.result);};r.readAsText(f,'utf-8');});
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
    var cRet=colPorChave('captacao.data_retorno'),cTipo=cols.find(function(c){return c.nome==='Tipo de ação'&&!c.campo_sistema;}),cTrf=cols.find(function(c){return c.nome==='Competência'&&!c.campo_sistema;});
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
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)kv.querySelectorAll('.coluna-kanban').forEach(function(c,i){c.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*45,easing:'cubic-bezier(.2,1.2,.4,1)',fill:'backwards'});});
    return true;
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
    return exibir(c,texto({},c,v));
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
    var cs=cols.filter(function(c){if(!c.ativo||!(c.escopo==='ambos'||c.escopo===row.fase)||c.campo_sistema==='processo.fase')return false;
        // Na Captação: as colunas da planilha de captação e, das outras, só as que estiverem preenchidas
        if(capt&&c.ordem_captacao==null&&c.ordem<100){var v0=valorLinha(row,c);return !(v0==null||v0===''||(Array.isArray(v0)&&!v0.length));}
        return true;}).sort(function(a,b){return ordemCol(a,row.fase)-ordemCol(b,row.fase);});
    var sensiveis=['processo.numero','processo.tese','processo.responsavel','processo.valor_causa','processo.valor_precatorio'];
    var podeEd=function(c){if(!opts.podeEditar||sig)return false;if(SISTEMA_SO_LEITURA.indexOf(c.campo_sistema)!==-1)return false;if(sensiveis.indexOf(c.campo_sistema)!==-1&&!opts.podeEditarDados)return false;return true;};
    var campoHtml=function(c){
      var v=valorLinha(row,c),t=sig&&c.campo_sistema!=='pessoa.nome'?'••••':textoLinha(row,c,v),conteudo;
      if(c.tipo==='link'&&!sig&&Array.isArray(v)&&v.length)conteudo=v.map(function(l){var u=/^https?:\/\//i.test(l.url||'')?l.url:'';return u?'<a href="'+h(u)+'" target="_blank" rel="noopener noreferrer" class="sp-link">'+h(l.texto||l.url)+'</a>':'';}).join(' · ');
      else{var cor=c.campo_sistema==='processo.status'?row.status_cor:c.campo_sistema==='processo.situacao_acao'?row.situacao_acao_cor:(c.tipo==='opcao'&&!c.campo_sistema?((c.opcoes||[]).find(function(o){return String(o.id)===String(v);})||{}).cor:null);
        conteudo=t?(cor?'<span class="sp-selo"><i style="background:'+h(cor)+'"></i>'+h(t)+'</span>':h(t)):'<span class="sp-vazio">—</span>';}
      var fixo=fixos.has(c.id);
      return '<div class="campo-dado" data-sp-campo="'+h(c.id)+'"><div class="campo-dado-label">'+h(nomeCol(c,row.fase))+'<button type="button" class="sp-fixar" data-sp-fixar="'+h(c.id)+'" title="'+(fixo?'Tirar do resumo (continua em Todos os dados)':'Mostrar sempre no resumo')+'" aria-label="'+(fixo?'Tirar do resumo':'Mostrar no resumo')+'">'+(fixo?'×':'+')+'</button></div><div class="campo-dado-valor'+(podeEd(c)?' sp-editavel':'')+'" data-sp-ficha="'+h(c.id)+'"'+(podeEd(c)?' tabindex="0" title="Clique para editar"':'')+'>'+conteudo+(podeEd(c)?'<span class="sp-lapis" aria-hidden="true">✎</span>':'')+'</div></div>';
    };
    // Resumo: só os campos escolhidos (padrão = os de antes); o resto fica em "Todos os dados", que abre e fecha
    var chaveFixos='saga-ficha-campos-'+(capt?'captacao-':'')+(opts.usuarioId||''),chaveAberto='saga-ficha-todos-aberto';
    var PADRAO=capt?['processo.numero','processo.captador','processo.valor_precatorio','processo.status','#Tipo de ação','#Competência','@captacao.data_retorno','@captacao.etiquetas']
      :['processo.tese','processo.responsavel','processo.valor_precatorio','processo.valor_causa','processo.numero','extra:Honorários','extra:Data de início'];
    var fixos;try{var salvo=JSON.parse(localStorage.getItem(chaveFixos)||'null');if(Array.isArray(salvo))fixos=new Set(salvo);}catch(e){}
    if(!fixos){fixos=new Set();cs.forEach(function(c){if(PADRAO.indexOf(c.campo_sistema)!==-1||(!c.campo_sistema&&!c.chave&&PADRAO.indexOf('#'+c.nome)!==-1)||(c.chave&&PADRAO.indexOf('@'+c.chave)!==-1))fixos.add(c.id);});PADRAO.filter(function(k){return k.indexOf('extra:')===0;}).forEach(function(k){fixos.add(k);});}
    var extras=(opts.extras||[]).map(function(html){var m=/campo-dado-label">([^<]*)/.exec(html);if(!m)return {id:'extra:?',html:html};var nome=m[1].trim();var id='extra:'+nome;
      return {id:id,html:html.replace('<div class="campo-dado-label">'+m[1],'<div class="campo-dado-label">'+m[1]+'<button type="button" class="sp-fixar" data-sp-fixar="'+h(id)+'" title="'+(fixos.has(id)?'Tirar do resumo':'Mostrar sempre no resumo')+'">'+(fixos.has(id)?'×':'+')+'</button>')};});
    var resumo=cs.filter(function(c){return fixos.has(c.id);}).map(campoHtml).concat(extras.filter(function(x){return fixos.has(x.id);}).map(function(x){return x.html;}));
    var resto=cs.filter(function(c){return !fixos.has(c.id);}),restoExtras=extras.filter(function(x){return !fixos.has(x.id);});
    var daPlanilha=function(c){return capt?c.ordem_captacao!=null:c.ordem<100;};
    var aberto=false;try{aberto=localStorage.getItem(chaveAberto)==='1';}catch(e){}
    el.classList.add('sp-ficha');
    el.innerHTML=(resumo.length?resumo.join(''):'<div class="sp-vazio" style="grid-column:1/-1">Nenhum campo no resumo. Abra "Todos os dados" e toque em + para escolher.</div>')+
      '<div class="sp-ficha-barra"><button type="button" class="sp-ficha-toggle" aria-expanded="'+aberto+'">'+(aberto?'▾':'▸')+' Todos os dados do processo ('+(resto.length+restoExtras.length)+')</button>'+
      '<button type="button" class="sp-ficha-padrao" title="Voltar aos campos de antes">Voltar ao padrão</button></div>'+
      '<div class="sp-ficha-todos"'+(aberto?'':' hidden')+'>'+resto.filter(daPlanilha).map(campoHtml).join('')+
        (resto.some(function(c){return !daPlanilha(c);})||restoExtras.length?'<div class="sp-ficha-tit">Outros dados do processo</div>'+resto.filter(function(c){return !daPlanilha(c);}).map(campoHtml).join('')+restoExtras.map(function(x){return x.html;}).join(''):'')+'</div>';
    var salvarFixos=function(){try{localStorage.setItem(chaveFixos,JSON.stringify(Array.from(fixos)));}catch(e){}};
    el.querySelector('.sp-ficha-toggle').onclick=function(){var box=el.querySelector('.sp-ficha-todos'),abrir=box.hidden;box.hidden=!abrir;this.setAttribute('aria-expanded',abrir);this.textContent=(abrir?'▾':'▸')+this.textContent.slice(1);try{localStorage.setItem(chaveAberto,abrir?'1':'0');}catch(e){}
      if(abrir&&!matchMedia('(prefers-reduced-motion: reduce)').matches)box.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:240,easing:'cubic-bezier(.2,1.2,.4,1)'});};
    el.querySelector('.sp-ficha-padrao').onclick=function(){try{localStorage.removeItem(chaveFixos);}catch(e){}fichaDados(el,processoId,opts);};
    el.querySelectorAll('[data-sp-fixar]').forEach(function(b){b.onclick=function(e){e.stopPropagation();var id=b.dataset.spFixar;if(fixos.has(id))fixos.delete(id);else fixos.add(id);salvarFixos();fichaDados(el,processoId,opts);};});
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
    var abrir=function(alvo){
      var c=cols.find(function(x){return x.id===alvo.dataset.spFicha;});if(!c||!podeEd(c))return;
      editarCelula(alvo,{c:c,v:valorLinha(row,c),texto:textoLinha(row,c,valorLinha(row,c)),opcoes:async function(){return opcoesFicha(c);},
        podeNova:c.tipo==='opcao'&&!c.campo_sistema&&cat.gerenciar,
        gravar:function(valor,cc){return rpcOk('lista_salvar_celula',{p_processo_id:processoId,p_coluna_id:(cc||c).id,p_valor:valor});},
        depois:function(){if(c.campo_sistema&&opts.aoMudarSistema)opts.aoMudarSistema();else fichaDados(el,processoId,opts);}});
    };
    el.onclick=function(e){if(e.target.closest('a,select,input'))return;var alvo=e.target.closest('[data-sp-ficha].sp-editavel');if(alvo)abrir(alvo);};
    el.onkeydown=function(e){if(e.key!=='Enter'||e.target.closest('select,input'))return;var alvo=e.target.closest('[data-sp-ficha].sp-editavel');if(alvo){e.preventDefault();abrir(alvo);}};
    return true;
  }
  function formatarCampo(tipo,v){return formatar(tipo,v);}

  return {renderFunil:renderFunil,mesmaEtapa:mesmaEtapa,fichaDados:fichaDados,formatar:formatarCampo,UFS:UFS,iniciar:iniciar,passa:passa,ordenar:ordenar,renderTabela:renderTabela,limpar:limpar,pronta:function(){return pronta;},_gerenciar:false};
})();
