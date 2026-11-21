/* =====================================================================
   SAGA · Biblioteca > Papéis timbrados e modelos (T167 parte 1, 14/11/2026)
   - Os 3 papéis timbrados oficiais (VMM, ANCREF, Sarmento), um de cada,
     guardados no lugar privado 'timbrados' (tabela timbrados).
   - Modelos de petição (tabela modelos_peticao): só o TEXTO; o Word e o
     PDF saem na hora, por cima do timbrado escolhido (saga_timbrado.js).
   - Trocar o timbrado (só o administrador): trocar os arquivos dele.
   Abre por Biblioteca > "Papéis timbrados e modelos" ou ?aba=timbrados.
   ===================================================================== */
(function(){
  'use strict';
  var EASE = 'cubic-bezier(.22,.78,.25,1)';
  var S = { timbrados:[], modelos:[], filtro:'todos', admin:false, carregado:false, aberto:false, modelo:null, pastas:[], pasta:null, podeOrganizar:false, abertas:{} };

  function sb(){ return window._sb; }
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function toast(m, t){ if(typeof window.showToast === 'function') window.showToast(m, t || 'info'); }
  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }
  function kb(n){ return n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  /* ---------------- estilos ---------------- */
  var css = document.createElement('style');
  css.textContent = [
    '.item-timbrados-bib{display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:10px;cursor:pointer;margin:0 0 8px;font-size:12px;color:var(--muted);font-weight:500;border:1px dashed color-mix(in srgb,var(--gold) 35%,transparent);transition:background .25s ' + EASE + ',color .25s ' + EASE + ';white-space:nowrap}',
    '.item-timbrados-bib:hover{background:color-mix(in srgb,var(--text) 4%,transparent)}',
    '.item-timbrados-bib.ativa{background:color-mix(in srgb,var(--gold) 10%,transparent);color:var(--gold);font-weight:700;border-style:solid}',
    '.item-timbrados-bib span{overflow:hidden;text-overflow:ellipsis}',
    '.layout-biblioteca.categorias-retraidas .item-timbrados-bib{justify-content:center;padding-left:0;padding-right:0}',
    '.layout-biblioteca.categorias-retraidas .item-timbrados-bib span{display:none}',
    '.conteudo-biblioteca.modo-timbrados > :not(.header-pagina):not(#painelTimbrados){display:none!important}',
    '.conteudo-biblioteca.modo-timbrados .botoes-view{display:none!important}',
    '#painelTimbrados{display:none}',
    /* com os modelos abertos, a pasta marcada da Biblioteca fica sem destaque (só "Petições e timbrados" marcado) */
    'body.tb-modo-timbrados .coluna-categorias .item-categoria-lateral.ativa{background:transparent!important;color:var(--muted)!important;font-weight:500!important;box-shadow:none!important}',
    'body.tb-modo-timbrados .coluna-categorias .destaque-pasta{opacity:0!important}',
    '.conteudo-biblioteca.modo-timbrados #painelTimbrados{display:block;animation:tbEntra .36s ' + EASE + ' both}',
    '.conteudo-biblioteca.modo-timbrados #painelTimbrados.sem-movimento{animation:none}',
    '@keyframes tbEntra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '.tb-sec{margin:0 0 26px}',
    '.tb-sec h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);margin:0 0 4px;font-weight:700}',
    '.tb-sec .tb-sub{font-size:12.5px;color:var(--muted);margin:0 0 14px;max-width:80ch;line-height:1.5}',
    '.tb-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}',
    '.tb-card{background:var(--panel);border:1px solid var(--border-soft);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0}',
    '.tb-folha{aspect-ratio:8.5/11;background:#fff;border-radius:6px;border:1px solid var(--border-soft);overflow:hidden;display:flex;align-items:center;justify-content:center;color:#8a93a3;font-size:11px}',
    '.tb-folha canvas{width:100%;height:100%;display:block;opacity:0;transition:opacity .36s ' + EASE + '}',
    '.tb-folha canvas.pronto{opacity:1}',
    '.tb-card h3{margin:0;font-size:14px;color:var(--text)}',
    '.tb-card p{margin:0;font-size:11.5px;color:var(--muted);line-height:1.45}',
    '.tb-arquivos{font-size:11px;color:var(--muted);display:flex;flex-direction:column;gap:2px}',
    '.tb-arquivos .falta{color:#d9534f}',
    '.tb-acoes{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}',
    '.tb-acoes button,.tb-modelo button{font:inherit;font-size:11.5px;padding:7px 11px;border-radius:9px;border:1px solid var(--border-soft);cursor:pointer}',
    '.tb-filtros{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}',
    '.tb-versao .filter-pill,.tb-filtros .filter-pill{font:inherit;font-size:11.5px;padding:6px 12px;border-radius:999px;border:1px solid var(--border-soft);background:transparent;color:var(--muted);cursor:pointer}',
    '.tb-versao .filter-pill.active,.tb-filtros .filter-pill.active{color:var(--text)}',
    '.tb-lista{display:flex;flex-direction:column;gap:8px}',
    '.tb-ferr{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}',
    '.tb-ferr .tb-busca{flex:1;min-width:220px;max-width:420px}',
    '#tbBotoesEditor{display:inline-flex;gap:8px;flex-wrap:wrap}#tbBotoesEditor[hidden]{display:none}',
    '.tb-area{background:color-mix(in srgb,var(--panel) 60%,transparent);border:1px solid var(--border-soft);border-radius:12px;padding:8px 12px;margin:0 0 8px}',
    '.tb-area summary{cursor:pointer;font-size:13px;color:var(--text);padding:4px 0}',
    '.tb-area summary span{font-size:11px;color:var(--muted);margin-left:6px}',
    '.tb-area .tb-lista{margin:6px 0 8px}',
    '.tb-subpasta{font-size:11px;letter-spacing:.04em;color:var(--gold);margin:8px 0 2px}',
    '.tb-revisar{border-color:color-mix(in srgb,#d97706 55%,transparent)!important;color:#d97706!important}',
    '.tb-modelo{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--border-soft);border-radius:12px;padding:12px 14px;flex-wrap:wrap}',
    '.tb-modelo .tb-mtxt{flex:1;min-width:200px}',
    '.tb-modelo b{font-size:13px;color:var(--text);display:block}',
    '.tb-modelo small{font-size:11px;color:var(--muted)}',
    '.tb-selo{display:inline-block;font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);color:var(--gold);margin-right:6px;white-space:nowrap}',
    '.tb-erro{background:color-mix(in srgb,#d9534f 12%,transparent);border:1px solid color-mix(in srgb,#d9534f 50%,transparent);color:var(--text);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.5;margin:8px 0}',
    '.tb-erro b{color:#d9534f}',
    '.tb-ok{background:color-mix(in srgb,#2e9e6a 12%,transparent);border:1px solid color-mix(in srgb,#2e9e6a 45%,transparent);border-radius:10px;padding:8px 12px;font-size:12px;margin:8px 0}',
    '.tb-aviso{font-size:11.5px;color:var(--muted);line-height:1.5;margin:6px 0 0}',
    '.tb-vazio{font-size:12.5px;color:var(--muted);padding:18px;border:1px dashed var(--border-soft);border-radius:12px;text-align:center}',
    '#modalGerarPeticaoTb .modal-bib,#modalTrocarTimbradoTb .modal-bib{max-width:640px;max-height:calc(100vh - 40px);overflow:auto}',
    '#modalGerarPeticaoTb .tb-campos{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}',
    '#modalGerarPeticaoTb .tb-campos .largo{grid-column:1/-1}',
    '#modalGerarPeticaoTb textarea,#modalGerarPeticaoTb select,#modalTrocarTimbradoTb input[type=file]{width:100%;background:var(--panel);border:1px solid var(--border-soft);border-radius:9px;padding:9px 12px;color:var(--text);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box}',
    '#modalTrocarTimbradoTb input[type=file]::file-selector-button{font:inherit;font-size:12px;background:var(--sb-sec);border:1px solid var(--sb-sec-borda);color:var(--text);border-radius:8px;padding:5px 10px;margin-right:10px;cursor:pointer}',
    '#modalGerarPeticaoTb textarea{min-height:74px;resize:vertical;line-height:1.45}',
    '#modalGerarPeticaoTb .tb-versao{display:flex;gap:6px;flex-wrap:wrap}',
    '.tb-botoes-fim{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}',
    '.tb-botoes-fim button{font:inherit;font-size:12.5px;padding:9px 14px;border-radius:10px;cursor:pointer;border:1px solid var(--border-soft)}',
    '.tb-botoes-fim button[disabled]{opacity:.55;cursor:progress}',
    /* 21/11 (Dr. Victor): pastas dos modelos em árvore na barra lateral */
    '.tb-grupo-lateral{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:12px 10px 4px;opacity:.8}',
    'body:not(.tb-modo-timbrados) #tbArvore{display:none}',
    '#tbArvore{margin:2px 0 8px 6px;font-size:12.5px}',
    '#tbArvore .tb-no{display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:8px;cursor:pointer;color:var(--muted);white-space:nowrap;overflow:hidden}',
    '#tbArvore .tb-no:hover{background:color-mix(in srgb,var(--gold) 8%,transparent);color:var(--text)}',
    '#tbArvore .tb-no.ativa{background:color-mix(in srgb,var(--gold) 14%,transparent);color:var(--text)}',
    '#tbArvore .tb-no .tb-seta{width:14px;flex:0 0 14px;text-align:center;font-size:10px;opacity:.8}',
    '#tbArvore .tb-no .tb-nome{overflow:hidden;text-overflow:ellipsis;flex:1}',
    '#tbArvore .tb-no .tb-n{font-size:10.5px;opacity:.75}',
    '#tbArvore .tb-filhos{margin-left:12px}',
    '.tb-caminho{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:12px;color:var(--muted);margin:0 0 10px}',
    '.tb-caminho button{font:inherit;font-size:12px;background:none;border:0;color:var(--gold);cursor:pointer;padding:2px 4px}',
    '.tb-pastas{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin:0 0 12px}',
    '.tb-pasta{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:12px;border:1px solid var(--border-soft);background:var(--panel);cursor:pointer;color:var(--text);font:inherit;font-size:13px;text-align:left}',
    '.tb-pasta small{display:block;font-size:11px;color:var(--muted)}',
    '.tb-org{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}',
    '.tb-org button{font:inherit;font-size:11.5px;padding:6px 10px;border-radius:9px;cursor:pointer}',
    '.tb-onde{font-size:10.5px;color:var(--muted);display:block;margin-top:2px}',
    '@media (max-width:640px){#modalGerarPeticaoTb .tb-campos{grid-template-columns:1fr}.tb-grade{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------------- montar os elementos na página ---------------- */
  function montar(){
    var coluna = document.querySelector('.coluna-categorias');
    var conteudo = document.querySelector('.conteudo-biblioteca');
    if(!coluna || !conteudo || document.getElementById('itemTimbradosBib')) return;
    var item = document.createElement('div');
    item.className = 'item-timbrados-bib';
    item.id = 'itemTimbradosBib';
    item.title = 'Papéis timbrados e modelos de petição';
    item.setAttribute('role', 'button');
    item.tabIndex = 0;
    item.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8h5M9 12h7M9 16h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>Petições e timbrados</span>';
    var cab = coluna.querySelector('.categorias-cabecalho');
    if(cab && cab.nextSibling) coluna.insertBefore(item, cab.nextSibling); else coluna.appendChild(item);
    /* 21/11 (Dr. Victor): a barra lateral separa os MODELOS (com as pastas em árvore) dos ARQUIVOS da antiga Biblioteca */
    var t1 = document.createElement('div'); t1.className = 'tb-grupo-lateral categoria-label'; t1.textContent = 'Modelos de petição';
    coluna.insertBefore(t1, item);
    var arv = document.createElement('div'); arv.id = 'tbArvore'; arv.setAttribute('role', 'tree'); arv.setAttribute('aria-label', 'Pastas dos modelos');
    coluna.insertBefore(arv, item.nextSibling);
    var t2 = document.createElement('div'); t2.className = 'tb-grupo-lateral categoria-label'; t2.textContent = 'Arquivos';
    coluna.insertBefore(t2, arv.nextSibling);
    arv.addEventListener('click', function(e){
      var seta = e.target.closest('[data-tb-seta]');
      if(seta){ e.stopPropagation(); var id = seta.getAttribute('data-tb-seta'); S.abertas[id] = !S.abertas[id]; desenharArvore(); return; }
      var no = e.target.closest('[data-tb-pasta]'); if(!no) return;
      escolherPasta(no.getAttribute('data-tb-pasta') || null);
    });
    item.addEventListener('click', function(){ if(!S.aberto) abrir('clique'); });
    item.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir('clique'); } });
    /* clicar numa pasta normal sai do painel */
    coluna.addEventListener('click', function(e){
      if(S.aberto && e.target.closest('.item-categoria-lateral, .btn-nova-categoria-lateral')) fechar('clique');
    }, true);
    var volta = document.getElementById('btnVoltarBiblioteca');
    if(volta) volta.addEventListener('click', function(e){ if(S.aberto){ e.stopImmediatePropagation(); fechar('clique'); } }, true);
    var bc = document.getElementById('breadcrumbWrap');
    if(bc) bc.addEventListener('click', function(){ if(S.aberto) fechar('clique'); }, true);
    /* 20/11 (Dr. Victor: "fui para outra seção e não tinha como voltar aos modelos"): cada troca de seção vira uma
       entrada do histórico (bibliotecaAba no history.state, mantendo o resto do state); voltar/avançar troca a seção */
    window.addEventListener('popstate', function(e){
      var aba = e.state && e.state.bibliotecaAba;
      if(aba === 'timbrados' && !S.aberto) abrir('historico');
      else if(aba !== 'timbrados' && S.aberto) fechar('historico');
    });

    var painel = document.createElement('div');
    painel.id = 'painelTimbrados';
    painel.innerHTML =
      '<section class="tb-sec">' +
        '<h2>Modelos de petição</h2>' +
        '<p class="tb-sub">Escolha um modelo, preencha o que quiser (o que ficar em branco sai entre colchetes para completar no Word) e baixe em Word ou em PDF, já no papel timbrado, no Padrão VMM.</p>' +
        '<div class="tb-ferr" id="tbFerr"><input type="search" class="tb-busca" id="tbBuscaModelos" placeholder="Buscar em todos os modelos" aria-label="Buscar modelo">' +
          '<span id="tbBotoesEditor" hidden><button type="button" class="btn-secundario" id="tbNovoModelo">+ Novo modelo</button><button type="button" class="btn-secundario" id="tbImportarPasta">Importar pasta de petições</button></span></div>' +
        '<div class="tb-filtros" id="tbFiltros" role="group" aria-label="Filtrar por escritório"></div>' +
        '<div id="tbErroModelos"></div>' +
        '<div class="tb-lista" id="tbListaModelos"><div class="tb-vazio">Carregando os modelos...</div></div>' +
      '</section>' +
      '<section class="tb-sec">' +
        '<h2>Papéis timbrados</h2>' +
        '<p class="tb-sub">Os papéis oficiais de cada escritório, guardados uma vez só. Toda petição gerada aqui sai por cima deles. Para mudar o timbrado de todas as petições, basta trocar os arquivos do timbrado.</p>' +
        '<div id="tbErroTimbrados"></div>' +
        '<div class="tb-grade" id="tbGradeTimbrados"><div class="tb-vazio">Carregando os papéis timbrados...</div></div>' +
      '</section>';
    conteudo.appendChild(painel);
    criarModais();
    /* 19/11 (T194, Dr. Victor): Biblioteca e Modelos viraram uma tela só ("Modelos"). Ela abre nas petições e timbrados;
       ?aba=arquivos (ou voltar para uma pasta) abre os arquivos da antiga Biblioteca. */
    try{
      var qa = new URLSearchParams(location.search).get('aba');
      var naPasta = history.state && history.state.bibliotecaPastas && (history.state.bibliotecaPastas.caminho || []).length > 1;
      if(qa === 'timbrados' || (qa !== 'arquivos' && !naPasta)) setTimeout(function(){ abrir('inicio'); }, 50);
      else marcarAba('arquivos', false);
    }catch(e){ setTimeout(function(){ abrir('inicio'); }, 50); }
  }

  function marcarAba(aba, nova){
    try{
      var u = new URL(location.href); u.searchParams.set('aba', aba);
      var st = Object.assign({}, history.state || {}, { bibliotecaAba: aba });
      if(nova) history.pushState(st, '', u); else history.replaceState(st, '', u);
    }catch(e){}
  }
  function abrir(modo){
    var conteudo = document.querySelector('.conteudo-biblioteca');
    if(!conteudo) return;
    S.aberto = true;
    document.getElementById('painelTimbrados').classList.toggle('sem-movimento', reduzido());
    conteudo.classList.add('modo-timbrados');
    document.getElementById('itemTimbradosBib').classList.add('ativa');
    document.body.classList.add('tb-modo-timbrados');
    var h1 = document.querySelector('.header-pagina h1');
    if(h1){ h1.setAttribute('data-tb-titulo', h1.textContent); h1.textContent = 'Modelos'; }
    if(modo !== 'historico') marcarAba('timbrados', modo === 'clique');
    if(!S.carregado) carregar();
  }
  function fechar(modo){
    var conteudo = document.querySelector('.conteudo-biblioteca');
    S.aberto = false;
    if(conteudo) conteudo.classList.remove('modo-timbrados');
    var it = document.getElementById('itemTimbradosBib'); if(it) it.classList.remove('ativa');
    document.body.classList.remove('tb-modo-timbrados');
    var h1 = document.querySelector('.header-pagina h1');
    if(h1 && h1.getAttribute('data-tb-titulo')){ h1.textContent = h1.getAttribute('data-tb-titulo'); h1.removeAttribute('data-tb-titulo'); }
    if(modo !== 'historico') marcarAba('arquivos', modo === 'clique');
  }

  /* ---------------- dados ---------------- */
  async function carregar(){
    var c = sb();
    if(!c || !window.SagaTimbrado){ mostrarErro('tbErroTimbrados', 'A tela não terminou de carregar (falta a ligação com o banco). Atualize a página (F5).'); return; }
    try{
      var a = await c.rpc('eh_admin_sistema');
      S.admin = !a.error && a.data === true;
    }catch(e){ S.admin = false; }
    try{
      S.timbrados = await SagaTimbrado.listar(c);
      document.getElementById('tbErroTimbrados').innerHTML = '';
    }catch(e){ S.timbrados = []; mostrarErro('tbErroTimbrados', e.message); }
    try{
      S.modelos = await SagaTimbrado.listarModelos(c);
      document.getElementById('tbErroModelos').innerHTML = '';
    }catch(e){ S.modelos = []; mostrarErro('tbErroModelos', e.message); }
    await carregarPastas();
    S.carregado = true;
    /* 20/11 (bloco 279): editor e importação dos modelos (saga_modelos_editor.js) para quem gerencia os modelos */
    if(window.SagaModelosEditor && !S.ligouEditor){
      S.ligouEditor = true;
      SagaModelosEditor.podeEditar().then(function(ok){
        S.podeEditar = ok; document.getElementById('tbBotoesEditor').hidden = !ok; desenharModelos();
      });
      document.getElementById('tbNovoModelo').addEventListener('click', function(){ SagaModelosEditor.abrir(null, { aoSalvar: recarregarModelos }); });
      document.getElementById('tbImportarPasta').addEventListener('click', function(){ SagaModelosEditor.importar({ aoTerminar: recarregarModelos }); });
      document.getElementById('tbBuscaModelos').addEventListener('input', function(){ S.busca = this.value; desenharModelos(); });
    }
    desenharTimbrados();
    desenharFiltros();
    desenharModelos();
  }
  async function recarregarModelos(){
    try{ S.modelos = await SagaTimbrado.listarModelos(sb()); document.getElementById('tbErroModelos').innerHTML = ''; }
    catch(e){ mostrarErro('tbErroModelos', e.message); }
    await carregarPastas();
    desenharModelos();
  }

  /* ---------------- pastas dos modelos (21/11, bloco 306) ---------------- */
  async function carregarPastas(){
    try{
      var r = await sb().rpc('modelos_pastas_listar');
      if(r.error) throw r.error;
      S.pastas = (r.data && r.data.pastas) || []; S.podeOrganizar = !!(r.data && r.data.pode_organizar);
    }catch(e){ S.pastas = []; mostrarErro('tbErroModelos', 'Não consegui ler as pastas dos modelos: ' + ((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message)) || e)); }
    var raiz = raizPasta();
    if(raiz && S.abertas[raiz.id] == null) S.abertas[raiz.id] = true;
    if(S.pasta && S.pasta !== 'sem' && !S.pastas.some(function(p){ return p.id === S.pasta; })) S.pasta = null;
    desenharArvore();
  }
  function raizPasta(){ return S.pastas.filter(function(p){ return !p.pai_id; })[0] || null; }
  function filhas(id){ return S.pastas.filter(function(p){ return p.pai_id === id; }).sort(function(a, b){ return (a.ordem - b.ordem) || a.nome.localeCompare(b.nome, 'pt-BR'); }); }
  function pastaPor(id){ return S.pastas.filter(function(p){ return p.id === id; })[0] || null; }
  function caminhoDe(id){ var c = [], p = pastaPor(id), g = 0; while(p && g++ < 30){ c.unshift(p); p = pastaPor(p.pai_id); } return c; }
  function totalNa(id){ var n = S.modelos.filter(function(m){ return m.pasta_id === id; }).length; filhas(id).forEach(function(f){ n += totalNa(f.id); }); return n; }
  function semPasta(){ return S.modelos.filter(function(m){ return !m.pasta_id || !pastaPor(m.pasta_id); }); }
  function desenharArvore(){
    var arv = document.getElementById('tbArvore'); if(!arv) return;
    function no(p, nivel){
      var fs = filhas(p.id), aberta = !!S.abertas[p.id];
      return '<div class="tb-no' + (S.pasta === p.id ? ' ativa' : '') + '" data-tb-pasta="' + esc(p.id) + '" role="treeitem" title="' + esc(p.nome) + '">' +
        '<span class="tb-seta"' + (fs.length ? ' data-tb-seta="' + esc(p.id) + '" aria-label="' + (aberta ? 'Recolher' : 'Abrir') + '"' : '') + '>' + (fs.length ? (aberta ? '▾' : '▸') : '') + '</span>' +
        '<span class="tb-nome">' + esc(p.nome) + '</span><span class="tb-n">' + totalNa(p.id) + '</span></div>' +
        (fs.length && aberta ? '<div class="tb-filhos">' + fs.map(function(f){ return no(f, nivel + 1); }).join('') + '</div>' : '');
    }
    var raiz = raizPasta(), sp = semPasta().length;
    arv.innerHTML = (raiz ? no(raiz, 0) : '') + (sp ? '<div class="tb-no' + (S.pasta === 'sem' ? ' ativa' : '') + '" data-tb-pasta="sem"><span class="tb-seta"></span><span class="tb-nome">Sem pasta</span><span class="tb-n">' + sp + '</span></div>' : '');
  }
  function escolherPasta(id){
    S.pasta = id;
    if(id && id !== 'sem'){ caminhoDe(id).forEach(function(p){ S.abertas[p.id] = true; }); }
    if(S.busca){ S.busca = ''; var bx = document.getElementById('tbBuscaModelos'); if(bx) bx.value = ''; }
    desenharArvore(); desenharModelos();
  }
  /* janelinha própria para nome e para escolher pasta */
  function pedir(titulo, rotulo, valor, opcoes){
    return new Promise(function(ok){
      var m = document.getElementById('modalPastaTb');
      if(!m){
        m = document.createElement('div'); m.className = 'modal-overlay-bib'; m.id = 'modalPastaTb';
        m.innerHTML = '<div class="modal-bib" role="dialog" aria-modal="true" style="max-width:460px"><h3 id="tbPTit"></h3><div class="modal-campo-bib"><label for="tbPCampo" id="tbPRot"></label><div id="tbPCaixa"></div></div>' +
          '<div id="tbPMsg"></div><div class="tb-botoes-fim"><button type="button" class="btn-secundario" id="tbPCancelar">Cancelar</button><button type="button" class="btn-confirmar-bib" id="tbPOk">Confirmar</button></div></div>';
        document.body.appendChild(m);
      }
      m.querySelector('#tbPTit').textContent = titulo; m.querySelector('#tbPRot').textContent = rotulo; m.querySelector('#tbPMsg').innerHTML = '';
      m.querySelector('#tbPCaixa').innerHTML = opcoes
        ? '<select id="tbPCampo" style="width:100%">' + opcoes.map(function(o){ return '<option value="' + esc(o[0]) + '"' + (o[0] === valor ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'
        : '<input type="text" id="tbPCampo" style="width:100%" maxlength="120" value="' + esc(valor || '') + '">';
      var campo = m.querySelector('#tbPCampo');
      function fim(v){ m.classList.remove('aberto'); ok(v); }
      m.querySelector('#tbPOk').onclick = function(){ var v = campo.value; if(!opcoes && !v.trim()){ m.querySelector('#tbPMsg').innerHTML = '<div class="tb-erro">Escreva o nome.</div>'; return; } fim(v); };
      m.querySelector('#tbPCancelar').onclick = function(){ fim(null); };
      m.onclick = function(e){ if(e.target === m) fim(null); };
      campo.onkeydown = function(e){ if(e.key === 'Enter'){ e.preventDefault(); m.querySelector('#tbPOk').click(); } };
      m.classList.add('aberto'); setTimeout(function(){ campo.focus(); if(campo.select) campo.select(); }, 60);
    });
  }
  function opcoesPastas(){
    var lista = [];
    (function anda(id, prefixo){ filhas(id).forEach(function(p){ lista.push([p.id, prefixo + p.nome]); anda(p.id, prefixo + p.nome + ' › '); }); })(null, '');
    return lista;
  }
  async function rpcOk(nome, args, msg){
    var r = await sb().rpc(nome, args);
    if(r.error){ toastTb('Não consegui ' + msg + ': ' + ((window.sagaErroBanco?window.sagaErroBanco(r.error):r.error.message) || r.error), 'error'); return null; }
    return r.data || {};
  }
  function toastTb(m, t){ if(typeof window.showToast === 'function') window.showToast(m, t || 'info'); else if(t === 'error') alert(m); }
  async function organizar(acao, alvo){
    var p = pastaPor(S.pasta);
    if(acao === 'nova'){
      var nome = await pedir('Nova pasta', 'Nome da pasta (dentro de "' + (p ? p.nome : 'Petições') + '")', '');
      if(!nome) return;
      var r = await rpcOk('modelo_pasta_salvar', { p_id: null, p_nome: nome, p_pai: p ? p.id : null }, 'criar a pasta');
      if(r){ S.abertas[p ? p.id : ''] = true; await carregarPastas(); escolherPasta(r.id); }
    }else if(acao === 'renomear' && p){
      var n2 = await pedir('Renomear pasta', 'Nome novo', p.nome); if(!n2 || n2 === p.nome) return;
      if(await rpcOk('modelo_pasta_salvar', { p_id: p.id, p_nome: n2, p_pai: p.pai_id }, 'renomear')){ await carregarPastas(); desenharModelos(); }
    }else if(acao === 'mover_pasta' && p){
      var ops = opcoesPastas().filter(function(o){ return o[0] !== p.id && caminhoDe(o[0]).every(function(c){ return c.id !== p.id; }); });
      var dest = await pedir('Mudar a pasta de lugar', 'Colocar "' + p.nome + '" dentro de', p.pai_id, ops); if(!dest || dest === p.pai_id) return;
      if(await rpcOk('modelo_pasta_salvar', { p_id: p.id, p_nome: p.nome, p_pai: dest }, 'mudar a pasta de lugar')){ await carregarPastas(); escolherPasta(p.id); }
    }else if((acao === 'subir' || acao === 'descer') && p){
      var irm = filhas(p.pai_id), i = irm.indexOf(p), j = acao === 'subir' ? i - 1 : i + 1;
      if(j < 0 || j >= irm.length) return;
      var t = irm[i]; irm[i] = irm[j]; irm[j] = t;
      if(await rpcOk('modelo_pastas_ordenar', { p_ids: irm.map(function(x){ return x.id; }) }, 'reordenar')){ await carregarPastas(); desenharModelos(); }
    }else if(acao === 'tirar' && p){
      var ok = window.sagaConfirmar ? await sagaConfirmar('Tirar a pasta da lista', 'A pasta "' + p.nome + '" sai da lista (fica guardada). Os modelos e as subpastas dela sobem para "' + ((pastaPor(p.pai_id) || {}).nome || 'Petições') + '". Nada é apagado.', 'Tirar da lista', true) : confirm('Tirar a pasta "' + p.nome + '" da lista? Os modelos dela sobem um nível.');
      if(!ok) return;
      if(await rpcOk('modelo_pasta_desativar', { p_id: p.id }, 'tirar a pasta da lista')){ S.pasta = p.pai_id; await carregarPastas(); desenharModelos(); }
    }else if(acao === 'mover_modelo'){
      var m = S.modelos.filter(function(x){ return x.id === alvo; })[0]; if(!m) return;
      var d2 = await pedir('Mover modelo', 'Pasta de "' + m.titulo + '"', m.pasta_id || '', [['', '(sem pasta)']].concat(opcoesPastas())); if(d2 == null) return;
      if(await rpcOk('modelos_mover', { p_modelos: [m.id], p_pasta: d2 || null }, 'mover o modelo')){ toastTb('Modelo movido.', 'success'); await recarregarModelos(); }
    }
  }
  function mostrarErro(id, msg){
    var el = document.getElementById(id);
    if(el) el.innerHTML = '<div class="tb-erro"><b>Erro:</b> ' + esc(msg) + '<br>Se continuar, avise o administrador com esta mensagem.</div>';
  }
  function nomeTimbrado(chave){
    var t = S.timbrados.filter(function(x){ return x.chave === chave; })[0];
    return t ? t.nome : (chave || 'Qualquer escritório');
  }

  /* ---------------- papéis timbrados ---------------- */
  function desenharTimbrados(){
    var g = document.getElementById('tbGradeTimbrados');
    if(!S.timbrados.length){ g.innerHTML = '<div class="tb-vazio">Nenhum papel timbrado guardado ainda.</div>'; return; }
    g.innerHTML = S.timbrados.map(function(t){
      var arqs = [
        ['Word', t.arquivo_docx], ['Fundo do PDF', t.fundo_pdf]
      ];
      if(t.arquivo_docx_impressao || t.fundo_pdf_impressao) arqs.push(['Word para impressão', t.arquivo_docx_impressao], ['Fundo do PDF para impressão', t.fundo_pdf_impressao]);
      return '<div class="tb-card" data-tb="' + esc(t.chave) + '">' +
        '<div class="tb-folha" data-tb-folha="' + esc(t.chave) + '">Mostrando a folha...</div>' +
        '<h3>' + esc(t.nome) + '</h3>' +
        '<p>' + esc(t.descricao || '') + '</p>' +
        '<div class="tb-arquivos">' + arqs.map(function(a){
          return '<span' + (a[1] ? '' : ' class="falta"') + '>' + esc(a[0]) + ': ' + (a[1] ? 'guardado' : 'falta') + '</span>';
        }).join('') + '<span>Atualizado em ' + esc(new Date(t.atualizado_em).toLocaleString('pt-BR', { timeZone:'America/Maceio', dateStyle:'short', timeStyle:'short' })) + '</span></div>' +
        '<div class="tb-acoes">' +
          '<button type="button" class="btn-secundario" data-tb-acao="word" data-tb-chave="' + esc(t.chave) + '">Word em branco</button>' +
          '<button type="button" class="btn-secundario" data-tb-acao="pdf" data-tb-chave="' + esc(t.chave) + '">PDF em branco</button>' +
          (t.arquivo_docx_impressao ? '<button type="button" class="btn-secundario" data-tb-acao="word-imp" data-tb-chave="' + esc(t.chave) + '" title="Sem as faixas coloridas, para imprimir">Word para impressão</button>' : '') +
          (S.admin ? '<button type="button" class="btn-secundario" data-tb-acao="trocar" data-tb-chave="' + esc(t.chave) + '">Trocar timbrado</button>' : '') +
        '</div>' +
        '<div class="tb-msg" data-tb-msg="' + esc(t.chave) + '"></div>' +
      '</div>';
    }).join('');
    g.querySelectorAll('[data-tb-acao]').forEach(function(b){ b.addEventListener('click', acaoTimbrado); });
    S.timbrados.forEach(function(t){ miniatura(t); });
  }

  var _pdfjs = null;
  function pdfjs(){
    if(!_pdfjs){
      _pdfjs = import('./vendor/pdfjs-4.10.38/pdf.min.mjs').then(function(m){
        m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs-4.10.38/pdf.worker.min.mjs', location.href).href; return m;
      }).catch(function(e){ _pdfjs = null; throw e; });
    }
    return _pdfjs;
  }
  async function miniatura(t){
    var caixa = document.querySelector('[data-tb-folha="' + t.chave + '"]');
    if(!caixa) return;
    try{
      if(!t.fundo_pdf) throw new Error('falta o fundo em PDF');
      var bytes = await SagaTimbrado.arquivo(sb(), t.fundo_pdf);
      var m = await pdfjs();
      var doc = await m.getDocument({ data:bytes.slice(0) }).promise;
      var pg = await doc.getPage(1);
      var vp0 = pg.getViewport({ scale:1 });
      caixa.style.aspectRatio = vp0.width + '/' + vp0.height;
      var esc2 = Math.min(2, (caixa.clientWidth || 250) * (window.devicePixelRatio || 1) / vp0.width);
      var vp = pg.getViewport({ scale:esc2 });
      var cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await pg.render({ canvasContext:cv.getContext('2d'), viewport:vp }).promise;
      caixa.innerHTML = ''; caixa.appendChild(cv);
      requestAnimationFrame(function(){ cv.classList.add('pronto'); });
    }catch(e){
      caixa.innerHTML = '<span style="padding:10px;text-align:center;color:#d9534f">Não deu para mostrar a folha: ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</span>';
    }
  }

  async function acaoTimbrado(ev){
    var b = ev.currentTarget, chave = b.getAttribute('data-tb-chave'), acao = b.getAttribute('data-tb-acao');
    var t = S.timbrados.filter(function(x){ return x.chave === chave; })[0];
    if(!t) return;
    if(acao === 'trocar'){ abrirTrocar(t); return; }
    var msg = document.querySelector('[data-tb-msg="' + chave + '"]');
    var txt = b.textContent; b.disabled = true; b.textContent = 'Preparando...';
    try{
      if(acao === 'word' || acao === 'word-imp'){
        var bytes = await SagaTimbrado.arquivo(sb(), acao === 'word' ? t.arquivo_docx : t.arquivo_docx_impressao);
        SagaTimbrado.baixar(bytes, 'Papel timbrado ' + t.nome + (acao === 'word-imp' ? ' (impressao)' : '') + '.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      } else {
        var r = await SagaTimbrado.gerar({ sb:sb(), timbrado:t, blocos:[{ tipo:'branco' }], formato:'pdf', titulo:'Papel timbrado ' + t.nome });
        SagaTimbrado.baixar(r.bytes, 'Papel timbrado ' + t.nome + '.pdf', 'application/pdf');
      }
      if(msg) msg.innerHTML = '';
    }catch(e){
      if(msg) msg.innerHTML = '<div class="tb-erro"><b>Não baixou:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>';
    }finally{ b.disabled = false; b.textContent = txt; }
  }

  /* ---------------- modelos ---------------- */
  function desenharFiltros(){
    var f = document.getElementById('tbFiltros');
    var ops = [['todos', 'Todos']].concat(S.timbrados.map(function(t){ return [t.chave, t.nome]; }));
    f.innerHTML = ops.map(function(o){
      return '<button type="button" class="filter-pill' + (S.filtro === o[0] ? ' active' : '') + '" data-tb-filtro="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
    }).join('');
    f.querySelectorAll('[data-tb-filtro]').forEach(function(b){
      b.addEventListener('click', function(){
        S.filtro = b.getAttribute('data-tb-filtro');
        f.querySelectorAll('.filter-pill').forEach(function(x){ x.classList.toggle('active', x === b); });
        desenharModelos();
      });
    });
  }
  function semAc(t){ return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function htmlModelo(m){
    return '<div class="tb-modelo">' +
      '<div class="tb-mtxt"><b>' + esc(m.titulo) + '</b>' +
        '<small>' + (m.timbrado_chave ? '<span class="tb-selo">' + esc(nomeTimbrado(m.timbrado_chave)) + '</span>' : '') +
        (m.revisado === false ? '<span class="tb-selo tb-revisar">A revisar</span>' : '') +
        (m.tipo_peca ? esc(m.tipo_peca) : '') + (m.teses && m.teses.nome ? ' · Tese: ' + esc(m.teses.nome) : '') + '</small>' +
        (m.descricao ? '<small style="display:block;margin-top:3px">' + esc(m.descricao) + '</small>' : '') +
        (S.busca && m.pasta_id && pastaPor(m.pasta_id) ? '<span class="tb-onde">Pasta: ' + caminhoDe(m.pasta_id).map(function(p){ return esc(p.nome); }).join(' › ') + '</span>' : '') +
      '</div>' +
      (S.podeOrganizar ? '<button type="button" class="btn-secundario" data-tb-mover="' + esc(m.id) + '" title="Mudar de pasta">Mover</button>' : '') +
      (S.podeEditar ? '<button type="button" class="btn-secundario" data-tb-editar="' + esc(m.id) + '">Editar</button>' : '') +
      '<button type="button" class="btn-confirmar-bib" data-tb-gerar="' + esc(m.id) + '">Gerar petição</button>' +
    '</div>';
  }
  function desenharModelos(){
    var l = document.getElementById('tbListaModelos');
    var b = semAc(S.busca);
    function doEscritorio(m){ return S.filtro === 'todos' || !m.timbrado_chave || m.timbrado_chave === S.filtro; }
    var html = '';
    if(b){
      /* busca geral: procura em TODAS as pastas e mostra onde cada modelo está */
      var achados = S.modelos.filter(function(m){
        if(!doEscritorio(m)) return false;
        var onde = m.pasta_id ? caminhoDe(m.pasta_id).map(function(p){ return p.nome; }).join(' ') : '';
        return semAc([m.titulo, m.area, m.subpasta, m.tipo_peca, m.descricao, m.teses && m.teses.nome, onde].join(' ')).indexOf(b) >= 0;
      });
      l.innerHTML = achados.length ? '<div class="tb-caminho">Busca em todas as pastas · ' + achados.length + ' modelo(s)</div>' + achados.map(htmlModelo).join('') : '<div class="tb-vazio">Nenhum modelo com essa busca.</div>';
    }else{
      if(!S.pasta && raizPasta()) S.pasta = raizPasta().id;
      var p = S.pasta === 'sem' ? null : pastaPor(S.pasta);
      var ms = S.pasta === 'sem' ? semPasta() : S.modelos.filter(function(m){ return p && m.pasta_id === p.id; });
      ms = ms.filter(doEscritorio);
      var fs = p ? filhas(p.id) : [];
      html += '<div class="tb-caminho">' + (S.pasta === 'sem' ? '<b>Sem pasta</b>' : caminhoDe(p && p.id).map(function(c, k, a){ return k < a.length - 1 ? '<button type="button" data-tb-ir="' + esc(c.id) + '">' + esc(c.nome) + '</button> ›' : '<b>' + esc(c.nome) + '</b>'; }).join(' ')) + '</div>';
      if(S.podeOrganizar && S.pasta !== 'sem') html += '<div class="tb-org"><button type="button" class="btn-secundario" data-tb-org="nova">+ Nova pasta aqui</button>' +
        (p && p.pai_id ? '<button type="button" class="btn-secundario" data-tb-org="renomear">Renomear</button><button type="button" class="btn-secundario" data-tb-org="mover_pasta">Mudar de lugar</button><button type="button" class="btn-secundario" data-tb-org="subir" title="Subir na lista">▲</button><button type="button" class="btn-secundario" data-tb-org="descer" title="Descer na lista">▼</button><button type="button" class="btn-perigo" data-tb-org="tirar">Tirar da lista</button>' : '') + '</div>';
      if(fs.length) html += '<div class="tb-pastas">' + fs.map(function(f){ return '<button type="button" class="tb-pasta" data-tb-ir="' + esc(f.id) + '"><span aria-hidden="true">📁</span><span>' + esc(f.nome) + '<small>' + totalNa(f.id) + ' modelo(s)</small></span></button>'; }).join('') + '</div>';
      html += ms.length ? ms.map(htmlModelo).join('') : (fs.length ? '' : '<div class="tb-vazio">Nenhum modelo nesta pasta' + (S.filtro !== 'todos' ? ' para este escritório' : '') + '.</div>');
      l.innerHTML = html;
    }
    l.querySelectorAll('[data-tb-ir]').forEach(function(x){ x.addEventListener('click', function(){ escolherPasta(x.getAttribute('data-tb-ir')); }); });
    l.querySelectorAll('[data-tb-org]').forEach(function(x){ x.addEventListener('click', function(){ organizar(x.getAttribute('data-tb-org')); }); });
    l.querySelectorAll('[data-tb-mover]').forEach(function(x){ x.addEventListener('click', function(){ organizar('mover_modelo', x.getAttribute('data-tb-mover')); }); });
    l.querySelectorAll('[data-tb-gerar]').forEach(function(x){
      x.addEventListener('click', function(){ abrirGerar(x.getAttribute('data-tb-gerar')); });
    });
    l.querySelectorAll('[data-tb-editar]').forEach(function(x){
      x.addEventListener('click', function(){
        var m = S.modelos.filter(function(y){ return y.id === x.getAttribute('data-tb-editar'); })[0];
        if(m && window.SagaModelosEditor) SagaModelosEditor.abrir(m, { aoSalvar: recarregarModelos });
      });
    });
  }

  /* ---------------- janelas ---------------- */
  function criarModais(){
    var m1 = document.createElement('div');
    m1.className = 'modal-overlay-bib'; m1.id = 'modalGerarPeticaoTb';
    m1.innerHTML = '<div class="modal-bib" role="dialog" aria-modal="true" aria-labelledby="tbGerarTitulo">' +
      '<h3 id="tbGerarTitulo">Gerar petição</h3>' +
      '<div class="modal-sub" id="tbGerarSub"></div>' +
      /* 19/11 (T194 etapa 4): de quem é a petição? Cliente do Jurídico puxa da ficha (SagaPeticoes); cliente de fora preenche aqui */
      '<div class="modal-campo-bib" id="tbGerarQuem" hidden><label>De quem é a petição?</label><div class="tb-versao" role="group">' +
        '<button type="button" class="filter-pill" id="tbGerarCliente">Cliente do Jurídico (puxa os dados da ficha)</button>' +
        '<button type="button" class="filter-pill active" id="tbGerarFora">Cliente de fora (preencher aqui)</button></div></div>' +
      '<div class="modal-campo-bib"><label for="tbGerarTimbrado">Papel timbrado</label><select id="tbGerarTimbrado"></select></div>' +
      '<div class="modal-campo-bib" id="tbGerarVersaoCampo"><label>Versão</label><div class="tb-versao" role="group">' +
        '<button type="button" class="filter-pill active" data-tb-versao="cores">Colorida (para enviar)</button>' +
        '<button type="button" class="filter-pill" data-tb-versao="impressao">Para imprimir (sem faixas)</button></div></div>' +
      '<div class="tb-campos" id="tbGerarCampos"></div>' +
      '<p class="tb-aviso">Dica: nome de pessoa ou órgão entre dois asteriscos (**Maria José da Silva**) sai em negrito e versalete, como no Padrão VMM; entre dois sublinhados (__texto__) sai só em negrito.</p>' +
      '<div id="tbGerarMsg"></div>' +
      '<p class="tb-aviso">Tudo é montado aqui no seu computador; nada é enviado para fora. No PDF, as fontes Segoe UI e Times (ANCREF e Sarmento) são trocadas por fontes parecidas (Open Sans e Liberation Serif); no Word ficam as originais.</p>' +
      '<div class="tb-botoes-fim">' +
        '<button type="button" class="btn-secundario" id="tbGerarCancelar">Fechar</button>' +
        '<button type="button" class="btn-confirmar-bib" id="tbGerarWord">Baixar Word</button>' +
        '<button type="button" class="btn-confirmar-bib" id="tbGerarPdf">Baixar PDF</button>' +
      '</div></div>';
    document.body.appendChild(m1);
    m1.addEventListener('click', function(e){ if(e.target === m1) fecharModal(m1); });
    document.getElementById('tbGerarCancelar').addEventListener('click', function(){ fecharModal(m1); });
    document.getElementById('tbGerarWord').addEventListener('click', function(){ gerar('docx'); });
    document.getElementById('tbGerarPdf').addEventListener('click', function(){ gerar('pdf'); });
    document.getElementById('tbGerarTimbrado').addEventListener('change', atualizarVersao);
    document.getElementById('tbGerarCliente').addEventListener('click', function(){
      var mod = S.modelo; fecharModal(m1);
      if(window.SagaPeticoes) setTimeout(function(){ window.SagaPeticoes.escolherCliente({ sb: sb(), modelo: mod }); }, 220);
    });
    m1.querySelectorAll('[data-tb-versao]').forEach(function(b){
      b.addEventListener('click', function(){
        if(b.disabled) return;
        m1.querySelectorAll('[data-tb-versao]').forEach(function(x){ x.classList.toggle('active', x === b); });
      });
    });

    var m2 = document.createElement('div');
    m2.className = 'modal-overlay-bib'; m2.id = 'modalTrocarTimbradoTb';
    m2.innerHTML = '<div class="modal-bib" role="dialog" aria-modal="true" aria-labelledby="tbTrocarTitulo">' +
      '<h3 id="tbTrocarTitulo">Trocar timbrado</h3>' +
      '<div class="modal-sub" id="tbTrocarSub"></div>' +
      '<div class="modal-campo-bib"><label for="tbArqDocx">Word do timbrado (.docx)</label><input type="file" id="tbArqDocx" accept=".docx"></div>' +
      '<div class="modal-campo-bib"><label for="tbArqFundo">Fundo do PDF (.pdf com 2 páginas: a 1ª e as demais, sem o número da página)</label><input type="file" id="tbArqFundo" accept="application/pdf,.pdf"></div>' +
      '<div class="modal-campo-bib" id="tbArqImpCampos"><label for="tbArqDocxImp">Word para impressão (opcional)</label><input type="file" id="tbArqDocxImp" accept=".docx">' +
        '<label for="tbArqFundoImp" style="margin-top:10px">Fundo do PDF para impressão (opcional)</label><input type="file" id="tbArqFundoImp" accept="application/pdf,.pdf"></div>' +
      '<p class="tb-aviso">Mande só o que mudou: o que ficar vazio continua como está. O fundo do PDF é o timbrado "em branco" (o Claude prepara com a ferramenta ferramentas/timbrado_fundo.py, que também mede onde vai o número da página). O arquivo antigo continua guardado; nada é apagado.</p>' +
      '<div id="tbTrocarMsg"></div>' +
      '<div class="tb-botoes-fim">' +
        '<button type="button" class="btn-secundario" id="tbTrocarCancelar">Cancelar</button>' +
        '<button type="button" class="btn-confirmar-bib" id="tbTrocarSalvar">Guardar os arquivos novos</button>' +
      '</div></div>';
    document.body.appendChild(m2);
    m2.addEventListener('click', function(e){ if(e.target === m2) fecharModal(m2); });
    document.getElementById('tbTrocarCancelar').addEventListener('click', function(){ fecharModal(m2); });
    document.getElementById('tbTrocarSalvar').addEventListener('click', salvarTroca);
  }
  function abrirModal(m){ m.classList.add('aberto'); }
  function fecharModal(m){ m.classList.remove('aberto'); }

  function abrirGerar(id){
    var m = S.modelos.filter(function(x){ return x.id === id; })[0];
    if(!m) return;
    S.modelo = m;
    document.getElementById('tbGerarTitulo').textContent = m.titulo;
    document.getElementById('tbGerarSub').textContent = (m.tipo_peca || 'Petição') + (m.descricao ? ' · ' + m.descricao : '');
    var sel = document.getElementById('tbGerarTimbrado');
    sel.innerHTML = S.timbrados.map(function(t){
      return '<option value="' + esc(t.chave) + '"' + (t.chave === m.timbrado_chave ? ' selected' : '') + '>' + esc(t.nome) + '</option>';
    }).join('');
    var campos = SagaTimbrado.camposDoModelo(m);
    document.getElementById('tbGerarCampos').innerHTML = campos.map(function(c){
      var id2 = 'tbCampo_' + c.chave;
      var ph = c.exemplo ? 'Ex.: ' + c.exemplo : (c.chave === 'data' ? 'Vazio = hoje' : 'Vazio = [' + (c.rotulo || c.chave) + ']');
      return '<div class="modal-campo-bib' + (c.longo ? ' largo' : '') + '"><label for="' + id2 + '">' + esc(c.rotulo || c.chave) + '</label>' +
        (c.longo ? '<textarea id="' + id2 + '" data-tb-campo="' + esc(c.chave) + '" placeholder="' + esc(ph) + '"></textarea>'
                 : '<input type="text" id="' + id2 + '" data-tb-campo="' + esc(c.chave) + '"' + (c.formato === 'processo' ? ' inputmode="numeric" data-tb-cnj="1"' : '') + ' placeholder="' + esc(ph) + '">') +
        '</div>';
    }).join('');
    document.querySelectorAll('[data-tb-cnj]').forEach(function(i){ i.addEventListener('input', mascaraCnj); });
    document.getElementById('tbGerarMsg').innerHTML = '';
    var quem = document.getElementById('tbGerarQuem');
    quem.hidden = true;
    if(window.SagaPeticoes){ window.SagaPeticoes.podeFazer().then(function(ok){ quem.hidden = !ok; }); }
    atualizarVersao();
    abrirModal(document.getElementById('modalGerarPeticaoTb'));
  }
  /* número do processo formatado enquanto digita: 0000000-00.0000.0.00.0000 */
  function mascaraCnj(e){
    var d = e.target.value.replace(/\D/g, '').slice(0, 20), o = '';
    var partes = [[0,7,''],[7,9,'-'],[9,13,'.'],[13,14,'.'],[14,16,'.'],[16,20,'.']];
    partes.forEach(function(p){ if(d.length > p[0]) o += p[2] + d.slice(p[0], p[1]); });
    e.target.value = o;
  }
  function timbradoEscolhido(){
    var ch = document.getElementById('tbGerarTimbrado').value;
    return S.timbrados.filter(function(t){ return t.chave === ch; })[0];
  }
  function atualizarVersao(){
    var t = timbradoEscolhido(), tem = !!(t && t.arquivo_docx_impressao);
    var campo = document.getElementById('tbGerarVersaoCampo');
    campo.style.display = tem ? '' : 'none';
    if(!tem){
      campo.querySelectorAll('[data-tb-versao]').forEach(function(x){ x.classList.toggle('active', x.getAttribute('data-tb-versao') === 'cores'); });
    }
  }
  async function gerar(formato){
    var m = S.modelo, t = timbradoEscolhido();
    var msg = document.getElementById('tbGerarMsg');
    if(!m || !t){ msg.innerHTML = '<div class="tb-erro"><b>Erro:</b> escolha o papel timbrado.</div>'; return; }
    var valores = {};
    document.querySelectorAll('[data-tb-campo]').forEach(function(i){ valores[i.getAttribute('data-tb-campo')] = i.value; });
    var imp = !!document.querySelector('#modalGerarPeticaoTb [data-tb-versao="impressao"].active');
    var bw = document.getElementById('tbGerarWord'), bp = document.getElementById('tbGerarPdf');
    var botao = formato === 'pdf' ? bp : bw, txt = botao.textContent;
    bw.disabled = bp.disabled = true; botao.textContent = 'Gerando...';
    msg.innerHTML = '';
    try{
      var r = await SagaTimbrado.gerar({ sb:sb(), timbrado:t, modelo:m, valores:valores, formato:formato, impressao:imp });
      var nome = SagaTimbrado.nomeArquivo((valores.nome_peca || m.titulo) + (valores.cliente ? ' - ' + valores.cliente : '') + ' - ' + t.nome + (r.impressao ? ' (impressao)' : '')) + '.' + r.ext;
      SagaTimbrado.baixar(r.bytes, nome, r.tipo);
      msg.innerHTML = '<div class="tb-ok">Pronto: ' + esc(nome) + (r.paginas ? ' (' + r.paginas + (r.paginas === 1 ? ' página' : ' páginas') + ')' : '') + ' foi baixado.' +
        (r.avisos && r.avisos.length ? '<br>' + r.avisos.map(esc).join('<br>') : '') + '</div>';
    }catch(e){
      msg.innerHTML = '<div class="tb-erro"><b>Não foi possível gerar o ' + (formato === 'pdf' ? 'PDF' : 'Word') + ':</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>';
    }finally{
      bw.disabled = bp.disabled = false; botao.textContent = txt;
    }
  }

  /* ---------------- trocar timbrado (só o administrador) ---------------- */
  function abrirTrocar(t){
    S.trocando = t;
    document.getElementById('tbTrocarTitulo').textContent = 'Trocar timbrado: ' + t.nome;
    document.getElementById('tbTrocarSub').textContent = 'Depois de guardar, todas as petições novas saem com o timbrado novo.';
    ['tbArqDocx','tbArqFundo','tbArqDocxImp','tbArqFundoImp'].forEach(function(id){ document.getElementById(id).value = ''; });
    document.getElementById('tbTrocarMsg').innerHTML = '';
    abrirModal(document.getElementById('modalTrocarTimbradoTb'));
  }
  async function salvarTroca(){
    var t = S.trocando, msg = document.getElementById('tbTrocarMsg'), b = document.getElementById('tbTrocarSalvar');
    if(!t) return;
    var mapa = [['tbArqDocx','arquivo_docx','docx'],['tbArqFundo','fundo_pdf','pdf'],['tbArqDocxImp','arquivo_docx_impressao','docx'],['tbArqFundoImp','fundo_pdf_impressao','pdf']];
    var escolhidos = mapa.filter(function(x){ return document.getElementById(x[0]).files[0]; });
    if(!escolhidos.length){ msg.innerHTML = '<div class="tb-erro"><b>Nada escolhido:</b> escolha pelo menos um arquivo.</div>'; return; }
    for(var i = 0; i < escolhidos.length; i++){
      var f = document.getElementById(escolhidos[i][0]).files[0];
      if(!new RegExp('\\.' + escolhidos[i][2] + '$', 'i').test(f.name)){ msg.innerHTML = '<div class="tb-erro"><b>Arquivo errado:</b> ' + esc(f.name) + ' precisa ser .' + escolhidos[i][2] + '.</div>'; return; }
      if(f.size > 20 * 1048576){ msg.innerHTML = '<div class="tb-erro"><b>Arquivo grande demais:</b> ' + esc(f.name) + ' tem ' + kb(f.size) + ' (limite 20 MB).</div>'; return; }
    }
    b.disabled = true; var txt = b.textContent; b.textContent = 'Guardando...';
    var mudar = {}, subidos = [];
    try{
      var carimbo = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      for(i = 0; i < escolhidos.length; i++){
        var x = escolhidos[i], arq = document.getElementById(x[0]).files[0];
        var caminho = t.chave + '/' + carimbo + '_' + x[1] + '.' + x[2];
        var up = await sb().storage.from(SagaTimbrado.BUCKET).upload(caminho, arq, {
          contentType: x[2] === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert:false });
        if(up.error) throw new Error('não subiu ' + arq.name + ': ' + (window.sagaErroBanco?window.sagaErroBanco(up.error):up.error.message));
        subidos.push(caminho); mudar[x[1]] = caminho;
      }
      var r = await sb().from('timbrados').update(mudar).eq('id', t.id).select('*').single();
      if(r.error) throw new Error('os arquivos subiram, mas o cadastro do timbrado não mudou: ' + (window.sagaErroBanco?window.sagaErroBanco(r.error):r.error.message));
      SagaTimbrado.esquecer();
      S.timbrados = S.timbrados.map(function(y){ return y.id === t.id ? r.data : y; });
      desenharTimbrados();
      msg.innerHTML = '<div class="tb-ok">Guardado. As próximas petições já saem com o timbrado novo.</div>';
      setTimeout(function(){ fecharModal(document.getElementById('modalTrocarTimbradoTb')); }, reduzido() ? 0 : 900);
      toast('Timbrado ' + t.nome + ' trocado.', 'sucesso');
    }catch(e){
      msg.innerHTML = '<div class="tb-erro"><b>Não foi possível trocar:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>';
    }finally{ b.disabled = false; b.textContent = txt; }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  window.SagaBibliotecaTimbrados = { abrir:abrir, fechar:fechar, recarregar:function(){ S.carregado = false; return carregar(); } };
})();
