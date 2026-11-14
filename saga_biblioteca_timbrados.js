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
  var S = { timbrados:[], modelos:[], filtro:'todos', admin:false, carregado:false, aberto:false, modelo:null };

  function sb(){ return window._sb; }
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; }
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
    item.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8h5M9 12h7M9 16h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>Timbrados e modelos</span>';
    var cab = coluna.querySelector('.categorias-cabecalho');
    if(cab && cab.nextSibling) coluna.insertBefore(item, cab.nextSibling); else coluna.appendChild(item);
    item.addEventListener('click', abrir);
    item.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrir(); } });
    /* clicar numa pasta normal sai do painel */
    coluna.addEventListener('click', function(e){
      if(S.aberto && e.target.closest('.item-categoria-lateral, .btn-nova-categoria-lateral')) fechar();
    }, true);
    var volta = document.getElementById('btnVoltarBiblioteca');
    if(volta) volta.addEventListener('click', function(e){ if(S.aberto){ e.stopImmediatePropagation(); fechar(); } }, true);
    var bc = document.getElementById('breadcrumbWrap');
    if(bc) bc.addEventListener('click', function(){ if(S.aberto) fechar(); }, true);

    var painel = document.createElement('div');
    painel.id = 'painelTimbrados';
    painel.innerHTML =
      '<section class="tb-sec">' +
        '<h2>Modelos de petição</h2>' +
        '<p class="tb-sub">Escolha um modelo, preencha o que quiser (o que ficar em branco sai entre colchetes para completar no Word) e baixe em Word ou em PDF, já no papel timbrado, no Padrão VMM.</p>' +
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
    try{ if(new URLSearchParams(location.search).get('aba') === 'timbrados') setTimeout(abrir, 50); }catch(e){}
  }

  function abrir(){
    var conteudo = document.querySelector('.conteudo-biblioteca');
    if(!conteudo) return;
    S.aberto = true;
    document.getElementById('painelTimbrados').classList.toggle('sem-movimento', reduzido());
    conteudo.classList.add('modo-timbrados');
    document.getElementById('itemTimbradosBib').classList.add('ativa');
    document.querySelectorAll('.coluna-categorias .item-categoria-lateral.ativa').forEach(function(i){ i.classList.add('tb-era-ativa'); i.classList.remove('ativa'); });
    var h1 = document.querySelector('.header-pagina h1');
    if(h1){ h1.setAttribute('data-tb-titulo', h1.textContent); h1.textContent = 'Timbrados e modelos'; }
    try{ var u = new URL(location.href); u.searchParams.set('aba', 'timbrados'); history.replaceState(history.state, '', u); }catch(e){}
    if(!S.carregado) carregar();
  }
  function fechar(){
    var conteudo = document.querySelector('.conteudo-biblioteca');
    S.aberto = false;
    if(conteudo) conteudo.classList.remove('modo-timbrados');
    var it = document.getElementById('itemTimbradosBib'); if(it) it.classList.remove('ativa');
    document.querySelectorAll('.coluna-categorias .tb-era-ativa').forEach(function(i){ i.classList.remove('tb-era-ativa'); });
    var h1 = document.querySelector('.header-pagina h1');
    if(h1 && h1.getAttribute('data-tb-titulo')){ h1.textContent = h1.getAttribute('data-tb-titulo'); h1.removeAttribute('data-tb-titulo'); }
    try{ var u = new URL(location.href); u.searchParams.delete('aba'); history.replaceState(history.state, '', u); }catch(e){}
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
    S.carregado = true;
    desenharTimbrados();
    desenharFiltros();
    desenharModelos();
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
      caixa.innerHTML = '<span style="padding:10px;text-align:center;color:#d9534f">Não deu para mostrar a folha: ' + esc(e.message || e) + '</span>';
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
      if(msg) msg.innerHTML = '<div class="tb-erro"><b>Não baixou:</b> ' + esc(e.message || e) + '</div>';
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
  function desenharModelos(){
    var l = document.getElementById('tbListaModelos');
    var ms = S.modelos.filter(function(m){ return S.filtro === 'todos' || !m.timbrado_chave || m.timbrado_chave === S.filtro; });
    if(!ms.length){ l.innerHTML = '<div class="tb-vazio">Nenhum modelo para este escritório ainda.</div>'; return; }
    l.innerHTML = ms.map(function(m){
      return '<div class="tb-modelo">' +
        '<div class="tb-mtxt"><b>' + esc(m.titulo) + '</b>' +
          '<small><span class="tb-selo">' + esc(nomeTimbrado(m.timbrado_chave)) + '</span>' +
          (m.tipo_peca ? esc(m.tipo_peca) : '') + (m.teses && m.teses.nome ? ' · Tese: ' + esc(m.teses.nome) : '') + '</small>' +
          (m.descricao ? '<small style="display:block;margin-top:3px">' + esc(m.descricao) + '</small>' : '') +
        '</div>' +
        '<button type="button" class="btn-confirmar-bib" data-tb-gerar="' + esc(m.id) + '">Gerar petição</button>' +
      '</div>';
    }).join('');
    l.querySelectorAll('[data-tb-gerar]').forEach(function(b){
      b.addEventListener('click', function(){ abrirGerar(b.getAttribute('data-tb-gerar')); });
    });
  }

  /* ---------------- janelas ---------------- */
  function criarModais(){
    var m1 = document.createElement('div');
    m1.className = 'modal-overlay-bib'; m1.id = 'modalGerarPeticaoTb';
    m1.innerHTML = '<div class="modal-bib" role="dialog" aria-modal="true" aria-labelledby="tbGerarTitulo">' +
      '<h3 id="tbGerarTitulo">Gerar petição</h3>' +
      '<div class="modal-sub" id="tbGerarSub"></div>' +
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
      msg.innerHTML = '<div class="tb-erro"><b>Não foi possível gerar o ' + (formato === 'pdf' ? 'PDF' : 'Word') + ':</b> ' + esc(e.message || e) + '</div>';
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
        if(up.error) throw new Error('não subiu ' + arq.name + ': ' + up.error.message);
        subidos.push(caminho); mudar[x[1]] = caminho;
      }
      var r = await sb().from('timbrados').update(mudar).eq('id', t.id).select('*').single();
      if(r.error) throw new Error('os arquivos subiram, mas o cadastro do timbrado não mudou: ' + r.error.message);
      SagaTimbrado.esquecer();
      S.timbrados = S.timbrados.map(function(y){ return y.id === t.id ? r.data : y; });
      desenharTimbrados();
      msg.innerHTML = '<div class="tb-ok">Guardado. As próximas petições já saem com o timbrado novo.</div>';
      setTimeout(function(){ fecharModal(document.getElementById('modalTrocarTimbradoTb')); }, reduzido() ? 0 : 900);
      toast('Timbrado ' + t.nome + ' trocado.', 'sucesso');
    }catch(e){
      msg.innerHTML = '<div class="tb-erro"><b>Não foi possível trocar:</b> ' + esc(e.message || e) + '</div>';
    }finally{ b.disabled = false; b.textContent = txt; }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
  window.SagaBibliotecaTimbrados = { abrir:abrir, fechar:fechar, recarregar:function(){ S.carregado = false; return carregar(); } };
})();
