/* SAGA · Editor de planilhas (21/11/2026, Dr. Victor; bloco 320)
   Planilha com fórmulas dentro do SAGA, ligada ao cliente/processo, com VERSÕES (nada se apaga),
   exportação em PDF (no papel timbrado, com todas as colunas, para juntar nos autos; ou simples) e em Excel (.xlsx),
   e importação de Excel. Tudo no navegador (LGPD): o arquivo não sai do computador, só o conteúdo vai para o banco.
   Tela: editor_planilha.html?doc=<id> | ?novo=planilha&processo=<id>[&pasta=<id>] | ?modelo=pss&processo=<id>
   Motor das contas: saga_planilhas_motor.js (SagaPlanilhasMotor). Modelos do cálculo: saga_calculos_planilhas.js. */
(function(){
  'use strict';
  var M = window.SagaPlanilhasMotor;
  var BUCKET = 'documentos-clientes', FICHA = 'ficha_cliente_padrao_metalico_FINAL.html';
  var LARG = 96, ALT = 26;
  var S = { doc: null, pasta: null, ativa: 0, sel: null, calc: null, desfazer: [], refazer: [], pendente: false, pode: {}, ed: null, ctx: {}, clip: null, perms: [] };
  function $(id){ return document.getElementById(id); }
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }
  function aba(){ return S.pasta.abas[S.ativa]; }
  function cel(r, a){ a = a || aba(); return (a.celulas || {})[r]; }
  function toast(t, tipo){ var w = $('toastWrap'); if(!w) return; var d = document.createElement('div'); d.className = 'toast ' + (tipo || ''); d.textContent = t; w.appendChild(d); setTimeout(function(){ d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(function(){ d.remove(); }, 450); }, 3800); }
  function msgErro(e){ var m = (e && (e.message|| e.error_description)) || String(e || 'erro desconhecido'); if(/row-level security|permission denied|not allowed|violates/i.test(m)) m = 'sem permissão (' + m + ')'; return m; }

  /* ================= janelas ================= */
  function janela(id, titulo, sub, corpo, rodape, larga){
    var j = $(id);
    if(!j){ j = document.createElement('div'); j.className = 'mo'; j.id = id; j.setAttribute('role', 'dialog'); j.setAttribute('aria-modal', 'true'); j.setAttribute('data-saga-movimento-proprio', '1'); document.body.appendChild(j);
      j.addEventListener('click', function(e){ if(e.target === j) fecharJanela(id); }); }
    j.innerHTML = '<div class="md"' + (larga ? ' style="max-width:' + larga + 'px"' : '') + '><div class="md-cab"><h2>' + esc(titulo) + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="md-corpo">' + corpo + '</div><div class="md-rod">' + rodape + '</div></div>';
    j.querySelectorAll('[data-fechar]').forEach(function(b){ b.onclick = function(){ fecharJanela(id); }; });
    requestAnimationFrame(function(){ j.classList.add('aberto'); });
    return j;
  }
  function fecharJanela(id){ var j = $(id); if(j) j.classList.remove('aberto'); }
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ var a = document.querySelector('.mo.aberto'); if(a){ a.classList.remove('aberto'); e.stopPropagation(); } } }, true);

  /* ================= montagem da tela ================= */
  var CORES = [
    { k: '', r: 'Sem cor', c: 'transparent' }, { k: 'titulo', r: 'Título', c: 'color-mix(in srgb,var(--gold) 45%,var(--panel-solid))' },
    { k: 'secao', r: 'Seção', c: 'color-mix(in srgb,var(--gold) 20%,var(--panel-solid))' }, { k: 'entrada', r: 'Dado a preencher', c: 'color-mix(in srgb,#eab308 30%,var(--panel-solid))' },
    { k: 'total', r: 'Total', c: 'color-mix(in srgb,var(--gold) 30%,var(--panel-solid))' }, { k: 'ok', r: 'Conferido', c: 'color-mix(in srgb,#16a34a 30%,var(--panel-solid))' },
    { k: 'aviso', r: 'Atenção', c: 'color-mix(in srgb,#e5484d 28%,var(--panel-solid))' }
  ];
  function montar(){
    var r = $('plRaiz');
    r.innerHTML =
      '<div class="pl-topo"><div class="pl-nome"><input id="plTitulo" aria-label="Nome da planilha" maxlength="200">'
      + '<div class="pl-info" id="plInfo"></div></div>'
      + '<div class="pl-acoes">'
      + '<button class="btn btn-ouro" id="plSalvar" type="button" title="Salvar (Ctrl+S): cada vez cria uma versão nova">Salvar</button>'
      + '<button class="btn" id="plVersoes" type="button">Versões</button>'
      + '<button class="btn" id="plPdf" type="button">PDF</button>'
      + '<button class="btn" id="plXlsx" type="button">Excel</button>'
      + '<button class="btn" id="plGuardar" type="button" title="Guardar o PDF ou o Excel na pasta do cliente">Guardar na pasta</button>'
      + '<label class="btn" id="plImportarRot" title="Abrir um Excel (.xlsx) nesta planilha">Importar Excel<input type="file" id="plImportar" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label>'
      + '</div></div>'
      + '<div id="plAvisos"></div>'
      + '<div class="pl-ferr" role="toolbar" aria-label="Formatar">'
      + '<button class="btn ic" id="fDesfazer" type="button" title="Desfazer (Ctrl+Z)">↶</button><button class="btn ic" id="fRefazer" type="button" title="Refazer (Ctrl+Y)">↷</button><span class="sep"></span>'
      + '<select id="fFormato" title="Formato do número"><option value="">Automático</option><option value="reais">R$</option><option value="pct">%</option><option value="num">Número</option><option value="int">Inteiro</option><option value="data">Data</option><option value="texto">Texto</option></select>'
      + '<button class="btn ic" id="fMenos" type="button" title="Menos casas decimais">,0</button><button class="btn ic" id="fMais" type="button" title="Mais casas decimais">,00</button><span class="sep"></span>'
      + '<button class="btn ic" id="fB" type="button" title="Negrito (Ctrl+B)"><b>N</b></button><button class="btn ic" id="fI" type="button" title="Itálico (Ctrl+I)"><i>I</i></button>'
      + '<button class="btn ic" id="fEsq" type="button" title="Alinhar à esquerda">⟸</button><button class="btn ic" id="fCentro" type="button" title="Centralizar">≡</button><button class="btn ic" id="fDir" type="button" title="Alinhar à direita">⟹</button>'
      + '<button class="btn ic some-cel" id="fQuebra" type="button" title="Quebrar o texto em linhas">↵</button><span class="sep"></span>'
      + '<span class="pl-cores" id="fCores">' + CORES.map(function(c){ return '<button type="button" data-cor="' + c.k + '" title="' + esc(c.r) + '" style="background:' + c.c + '"></button>'; }).join('') + '</span><span class="sep"></span>'
      + '<button class="btn some-cel" id="fMesclar" type="button" title="Mesclar as células marcadas (ou desfazer)">Mesclar</button>'
      + '<button class="btn" id="fNota" type="button" title="Nota ou aviso na célula">Nota</button><span class="sep"></span>'
      + '<button class="btn some-cel" id="fLinIns" type="button" title="Inserir linha acima">+ Linha</button><button class="btn some-cel" id="fLinExc" type="button" title="Excluir as linhas marcadas">− Linha</button>'
      + '<button class="btn some-cel" id="fColIns" type="button" title="Inserir coluna à esquerda">+ Coluna</button><button class="btn some-cel" id="fColExc" type="button" title="Excluir as colunas marcadas">− Coluna</button>'
      + '<button class="btn some-cel" id="fPreencher" type="button" title="Copiar a 1ª linha marcada para as de baixo (Ctrl+D)">Preencher ↓</button>'
      + '</div>'
      + '<div class="pl-barra"><div class="end" id="plEnd">A1</div><div class="fx">fx</div><input id="plFx" autocomplete="off" spellcheck="false" aria-label="Conteúdo ou fórmula da célula"></div>'
      + '<div class="pl-grade-caixa" id="plCaixa"><table class="pl" id="plGrade"></table></div>'
      + '<div class="pl-abas" id="plAbas"></div>'
      + '<div class="pl-rod"><span id="plSoma"></span><span>Digite <b>=</b> para fórmula (SOMA, ARRED, SE ou em inglês: SUM, ROUND, IF). Clique numa célula enquanto escreve a fórmula para pôr a referência.</span></div>';
    ligarTela();
  }

  /* ================= desenho da grade ================= */
  function areaVisivel(){
    var u = M.usada(aba());
    return { cols: Math.max(u.colunas + 4, 14), lins: Math.max(u.linhas + 15, 50) };
  }
  function largura(c){ var w = (aba().colunas || {})[M.colTxt(c)]; return w || LARG; }
  function mapaMesclas(){
    var mestre = {}, coberto = {};
    (aba().mesclas || []).forEach(function(m){
      var p = m.split(':'), a = M.endereco(p[0]), b = M.endereco(p[1]); if(!a || !b) return;
      mestre[a.c + ',' + a.l] = { cs: b.c - a.c + 1, rs: b.l - a.l + 1 };
      for(var l = a.l; l <= b.l; l++) for(var c = a.c; c <= b.c; c++) if(c !== a.c || l !== a.l) coberto[c + ',' + l] = m;
    });
    return { mestre: mestre, coberto: coberto };
  }
  function classes(c, v){
    var k = [];
    if(!c) return '';
    if(c.b) k.push('b'); if(c.i) k.push('i');
    if(c.al) k.push('al-' + c.al); else if(typeof v === 'number') k.push('n');
    if(c.q) k.push('quebra');
    if(c.fundo && /^[a-z]+$/.test(c.fundo)) k.push('f-' + c.fundo);
    if(c.cinza) k.push('f-cinza');
    if(M.ehErro(v)) k.push('erro');
    return k.join(' ');
  }
  function desenharGrade(){
    var A = areaVisivel(), mm = mapaMesclas(), h = '<colgroup><col style="width:44px">';
    S.area = A;
    for(var c = 1; c <= A.cols; c++) h += '<col style="width:' + largura(c) + 'px">';
    h += '</colgroup><thead><tr><th class="canto"></th>';
    for(c = 1; c <= A.cols; c++) h += '<th data-col="' + c + '">' + M.colTxt(c) + '<span class="alca" data-alca="' + c + '"></span></th>';
    h += '</tr></thead><tbody>';
    var lin = aba().linhas || {};
    for(var l = 1; l <= A.lins; l++){
      h += '<tr' + (lin[l] ? ' style="height:' + lin[l] + 'px"' : '') + '><th class="lin" data-lin="' + l + '">' + l + '</th>';
      for(c = 1; c <= A.cols; c++){
        var chave = c + ',' + l; if(mm.coberto[chave]) continue;
        var r = M.ref(c, l), ce = cel(r), v = ce ? S.calc.valor(S.ativa, r) : '';
        var me = mm.mestre[chave];
        var st = ce && ce.fundo && /^#/.test(ce.fundo) ? ' style="background:' + esc(ce.fundo) + '33"' : '';
        h += '<td data-c="' + c + '" data-l="' + l + '"' + (me ? ' colspan="' + me.cs + '" rowspan="' + me.rs + '"' : '') + ' class="' + classes(ce, v) + '"' + st
          + (M.ehErro(v) ? ' title="' + esc(v.e + ': ' + (M.ERROS[v.e] || '')) + '"' : (ce && ce.nota ? ' title="' + esc(ce.nota) + '"' : '')) + '>'
          + esc(ce ? M.mostrar(v, ce) : '') + (ce && ce.nota ? '<span class="nota' + (ce.conferir ? ' conferir' : '') + '"></span>' : '') + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody>';
    $('plGrade').innerHTML = h;
    pintarSelecao();
  }
  function recalcular(){ S.calc = M.calcular(S.pasta); }
  function redesenhar(){ recalcular(); desenharGrade(); desenharAbas(); desenharAvisos(); atualizarBarra(); }

  /* ================= abas ================= */
  function desenharAbas(){
    var todos = S.calc.tudo();
    $('plAbas').innerHTML = S.pasta.abas.map(function(a, i){
      var n = Object.keys(todos[i] || {}).filter(function(r){ return M.ehErro(todos[i][r]); }).length;
      return '<button type="button" class="pl-aba' + (i === S.ativa ? ' active' : '') + '" data-aba="' + i + '" title="Clique duas vezes para renomear">' + esc(a.nome) + (n ? '<span class="err" title="' + n + ' célula(s) com erro">● ' + n + '</span>' : '') + '</button>';
    }).join('') + '<button type="button" class="btn" id="plAbaNova" title="Nova aba">+</button>'
      + (S.pasta.abas.length > 1 ? '<button type="button" class="btn" id="plAbaMenu" title="Mover ou tirar esta aba">⋯</button>' : '');
    $('plAbas').querySelectorAll('[data-aba]').forEach(function(b){
      b.onclick = function(){ trocarAba(+b.getAttribute('data-aba')); };
      b.ondblclick = function(){ renomearAba(+b.getAttribute('data-aba')); };
    });
    $('plAbaNova').onclick = novaAba;
    if($('plAbaMenu')) $('plAbaMenu').onclick = menuAba;
  }
  function trocarAba(i){
    if(i === S.ativa) return;
    if(S.ed && !S.ed.formula) confirmarEdicao();
    S.ativa = i; S.pasta.ativa = i; S.sel = { c1: 1, l1: 1, c2: 1, l2: 1 };
    desenharGrade(); desenharAbas(); atualizarBarra();
    $('plCaixa').scrollTop = 0; $('plCaixa').scrollLeft = 0;
  }
  function nomeAbaValido(n, ignorar){
    n = (n || '').trim();
    if(!n) return 'Dê um nome à aba.';
    if(n.length > 31) return 'O Excel aceita no máximo 31 letras no nome da aba.';
    if(/[\[\]:*?\/\\]/.test(n)) return 'O nome da aba não pode ter [ ] : * ? / \\';
    if(S.pasta.abas.some(function(a, i){ return i !== ignorar && a.nome.toLowerCase() === n.toLowerCase(); })) return 'Já existe uma aba com esse nome.';
    return '';
  }
  function pedirNome(titulo, atual, ignorar, feito){
    var j = janela('jNomeAba', titulo, '', '<label class="rot" for="naNome">Nome</label><input class="campo" id="naNome" maxlength="31"><div class="erro-campo" id="naErro"></div>',
      '<button class="btn" type="button" data-fechar>Cancelar</button><button class="btn btn-ouro" type="button" id="naOk">Pronto</button>');
    var i = $('naNome'); i.value = atual || ''; setTimeout(function(){ i.focus(); i.select(); }, 60);
    function ok(){ var e = nomeAbaValido(i.value, ignorar); if(e){ $('naErro').textContent = e; return; } fecharJanela('jNomeAba'); feito(i.value.trim()); }
    $('naOk').onclick = ok; i.onkeydown = function(e){ if(e.key === 'Enter'){ e.preventDefault(); ok(); } };
  }
  function renomearAba(i){
    if(!S.pode.criar) return;
    pedirNome('Renomear a aba', S.pasta.abas[i].nome, i, function(n){ guardarDesfazer(); M.renomearAba(S.pasta, i, n); mudou(); });
  }
  function novaAba(){
    if(!S.pode.criar) return;
    var n = S.pasta.abas.length + 1; while(nomeAbaValido('Planilha ' + n, -1)) n++;
    pedirNome('Nova aba', 'Planilha ' + n, -1, function(nome){ guardarDesfazer(); S.pasta.abas.push({ nome: nome, celulas: {}, colunas: {}, mesclas: [] }); mudou(); trocarAba(S.pasta.abas.length - 1); });
  }
  function menuAba(){
    var i = S.ativa, n = S.pasta.abas.length;
    janela('jMenuAba', 'Aba "' + aba().nome + '"', 'Tirar a aba apaga só desta planilha (as versões salvas antes continuam guardadas).',
      '<div class="pl-acoes"><button class="btn" type="button" id="maEsq"' + (i === 0 ? ' disabled' : '') + '>◀ Mover para a esquerda</button><button class="btn" type="button" id="maDir"' + (i === n - 1 ? ' disabled' : '') + '>Mover para a direita ▶</button>'
      + '<button class="btn" type="button" id="maRen">Renomear</button><button class="btn btn-perigo" type="button" id="maTirar">Tirar esta aba</button></div>',
      '<button class="btn" type="button" data-fechar>Fechar</button>');
    function mover(d){ guardarDesfazer(); var a = S.pasta.abas.splice(i, 1)[0]; S.pasta.abas.splice(i + d, 0, a); S.ativa = i + d; fecharJanela('jMenuAba'); mudou(); }
    $('maEsq').onclick = function(){ mover(-1); }; $('maDir').onclick = function(){ mover(1); };
    $('maRen').onclick = function(){ fecharJanela('jMenuAba'); renomearAba(i); };
    $('maTirar').onclick = function(){
      var nome = aba().nome, usadaEm = [];
      S.pasta.abas.forEach(function(o, k){ if(k === i) return; Object.keys(o.celulas || {}).forEach(function(r){ var c = o.celulas[r]; if(c.f && c.f.toLowerCase().indexOf(nome.toLowerCase() + "'!") >= 0 || (c.f && c.f.toLowerCase().indexOf(nome.toLowerCase() + '!') >= 0)) usadaEm.push(o.nome + '!' + r); }); });
      if(usadaEm.length && !confirm('Outras abas usam esta (' + usadaEm.slice(0, 5).join(', ') + (usadaEm.length > 5 ? '…' : '') + '): essas fórmulas vão mostrar #REF!. Tirar mesmo assim?')) return;
      if(!usadaEm.length && !confirm('Tirar a aba "' + nome + '" desta planilha?')) return;
      guardarDesfazer(); S.pasta.abas.splice(i, 1); S.ativa = Math.max(0, i - 1); S.pasta.ativa = S.ativa; fecharJanela('jMenuAba'); mudou();
    };
  }

  /* ================= seleção ================= */
  function norm(s){ return { c1: Math.min(s.c1, s.c2), l1: Math.min(s.l1, s.l2), c2: Math.max(s.c1, s.c2), l2: Math.max(s.l1, s.l2) }; }
  function pintarSelecao(){
    var g = $('plGrade'); if(!g || !S.sel) return;
    g.querySelectorAll('td.sel,td.ativa').forEach(function(t){ t.classList.remove('sel', 'ativa'); });
    g.querySelectorAll('th.sel').forEach(function(t){ t.classList.remove('sel'); });
    var n = norm(S.sel);
    for(var l = n.l1; l <= n.l2; l++) for(var c = n.c1; c <= n.c2; c++){
      var td = g.querySelector('td[data-c="' + c + '"][data-l="' + l + '"]'); if(td) td.classList.add('sel');
    }
    var at = g.querySelector('td[data-c="' + S.sel.c1 + '"][data-l="' + S.sel.l1 + '"]'); if(at) at.classList.add('ativa');
    for(c = n.c1; c <= n.c2; c++){ var th = g.querySelector('thead th[data-col="' + c + '"]'); if(th) th.classList.add('sel'); }
    for(l = n.l1; l <= n.l2; l++){ var tl = g.querySelector('th[data-lin="' + l + '"]'); if(tl) tl.classList.add('sel'); }
    somaSelecao();
  }
  function ativaRef(){ return M.ref(S.sel.c1, S.sel.l1); }
  function atualizarBarra(){
    if(!S.sel) return;
    $('plEnd').textContent = M.ref(S.sel.c1, S.sel.l1) + (S.sel.c2 !== S.sel.c1 || S.sel.l2 !== S.sel.l1 ? ':' + M.ref(S.sel.c2, S.sel.l2) : '');
    if(!S.ed) $('plFx').value = M.paraEditar(cel(ativaRef()));
    var c = cel(ativaRef()) || {};
    $('fFormato').value = c.t || '';
    $('fB').classList.toggle('ativo', !!c.b); $('fI').classList.toggle('ativo', !!c.i);
  }
  function somaSelecao(){
    var n = norm(S.sel), s = 0, q = 0, nums = 0;
    if(n.c1 === n.c2 && n.l1 === n.l2){ $('plSoma').innerHTML = ''; return; }
    for(var l = n.l1; l <= n.l2; l++) for(var c = n.c1; c <= n.c2; c++){ var v = S.calc.valor(S.ativa, M.ref(c, l)); if(v !== '' && v != null) q++; if(typeof v === 'number'){ s += v; nums++; } }
    $('plSoma').innerHTML = nums ? 'Soma: <b>' + esc(M.mostrar(s, { t: 'num', casas: 2 })) + '</b> · Média: <b>' + esc(M.mostrar(s / nums, { t: 'num', casas: 2 })) + '</b> · ' + q + ' preenchida(s)' : q + ' preenchida(s)';
  }
  function irPara(c, l, estender){
    c = Math.max(1, c); l = Math.max(1, l);
    if(estender){ S.sel.c2 = c; S.sel.l2 = l; }
    else S.sel = { c1: c, l1: l, c2: c, l2: l };
    if(c > S.area.cols - 2 || l > S.area.lins - 3){ S.area = null; desenharGrade(); } else pintarSelecao();
    atualizarBarra(); rolarAte(estender ? S.sel.c2 : c, estender ? S.sel.l2 : l);
  }
  function rolarAte(c, l){
    var td = $('plGrade').querySelector('td[data-c="' + c + '"][data-l="' + l + '"]'), cx = $('plCaixa'); if(!td) return;
    var r = td.getBoundingClientRect(), b = cx.getBoundingClientRect();
    if(r.bottom > b.bottom - 4) cx.scrollTop += r.bottom - b.bottom + 8;
    if(r.top < b.top + 30) cx.scrollTop -= (b.top + 30 - r.top);
    if(r.right > b.right - 4) cx.scrollLeft += r.right - b.right + 8;
    if(r.left < b.left + 46) cx.scrollLeft -= (b.left + 46 - r.left);
  }

  /* ================= edição ================= */
  function guardarDesfazer(){ S.desfazer.push(JSON.stringify(S.pasta)); if(S.desfazer.length > 80) S.desfazer.shift(); S.refazer = []; }
  function mudou(){ S.pendente = true; redesenhar(); estadoSalvo(); }
  function desfazer(){ if(!S.desfazer.length) return; S.refazer.push(JSON.stringify(S.pasta)); S.pasta = JSON.parse(S.desfazer.pop()); S.ativa = Math.min(S.ativa, S.pasta.abas.length - 1); mudou(); }
  function refazer(){ if(!S.refazer.length) return; S.desfazer.push(JSON.stringify(S.pasta)); S.pasta = JSON.parse(S.refazer.pop()); S.ativa = Math.min(S.ativa, S.pasta.abas.length - 1); mudou(); }
  function gravarCelula(a, r, txt){
    var c = a.celulas[r] || {}, e = M.lerEntrada(txt, c);
    delete c.v; delete c.f;
    if(e.f) c.f = e.f; else if(e.v !== '' && e.v != null) c.v = e.v;
    if(e.t && !c.t) c.t = e.t;
    if(!Object.keys(c).length) delete a.celulas[r]; else a.celulas[r] = c;
  }
  function comecarEdicao(inicial, viaBarra){
    if(!S.pode.criar){ toast('Você só pode ver esta planilha (sem permissão para editar documentos).', 'error'); return; }
    var r = ativaRef(), c = cel(r) || {};
    var td = $('plGrade').querySelector('td[data-c="' + S.sel.c1 + '"][data-l="' + S.sel.l1 + '"]');
    S.ed = { r: r, aba: S.ativa, original: M.paraEditar(c), formula: false };
    var val = inicial != null ? inicial : S.ed.original;
    if(viaBarra){ S.ed.barra = true; S.ed.formula = String(val)[0] === '='; return; }
    var ta = document.createElement('textarea'); ta.className = 'pl-ed'; ta.id = 'plEd'; ta.spellcheck = false;
    var cx = $('plCaixa'), rr = td.getBoundingClientRect(), rb = cx.getBoundingClientRect();
    ta.style.left = (rr.left - rb.left + cx.scrollLeft - 1) + 'px'; ta.style.top = (rr.top - rb.top + cx.scrollTop - 1) + 'px';
    ta.style.minWidth = Math.max(rr.width + 2, 120) + 'px'; ta.style.height = Math.max(rr.height + 2, 28) + 'px';
    ta.value = val; cx.appendChild(ta); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    $('plFx').value = val; S.ed.formula = String(val)[0] === '=';
    ajustarLargura(ta);
    ta.addEventListener('input', function(){ mascara(ta, c); $('plFx').value = ta.value; S.ed.formula = ta.value[0] === '='; ajustarLargura(ta); });
    ta.addEventListener('keydown', teclaEditor);
  }
  function ajustarLargura(ta){ var n = Math.min(60, Math.max(ta.value.length + 2, 10)); ta.style.width = Math.max(parseFloat(ta.style.minWidth), n * 7.6) + 'px'; }
  /* formata sozinho enquanto digita (regra de 04/11): R$ com centavos, data dd/mm/aaaa, % com vírgula */
  function mascara(inp, c){
    var v = inp.value; if(!c || !c.t || v[0] === '=') return;
    var d = v.replace(/\D/g, ''), neg = /^-/.test(v);
    if(c.t === 'reais'){ if(!d){ inp.value = neg ? '-' : ''; return; } inp.value = (neg ? '-' : '') + (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    else if(c.t === 'data'){ d = d.slice(0, 8); inp.value = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4) : (d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d); }
    else if(c.t === 'pct' || c.t === 'num'){ inp.value = (neg ? '-' : '') + v.replace(/[^\d,]/g, '').replace(/(,.*?),/g, '$1'); }
    else if(c.t === 'int'){ inp.value = (neg ? '-' : '') + d; }
  }
  function textoEditado(){ var ta = $('plEd'); return ta ? ta.value : $('plFx').value; }
  function confirmarEdicao(mover){
    if(!S.ed) return;
    var txt = textoEditado(), ed = S.ed; S.ed = null;
    var ta = $('plEd'); if(ta) ta.remove();
    if(txt !== ed.original){
      guardarDesfazer();
      gravarCelula(S.pasta.abas[ed.aba], ed.r, txt);
      if(ed.aba !== S.ativa){ S.ativa = ed.aba; S.pasta.ativa = ed.aba; var e = M.endereco(ed.r); S.sel = { c1: e.c, l1: e.l, c2: e.c, l2: e.l }; }
      mudou();
    } else if(ed.aba !== S.ativa){ S.ativa = ed.aba; desenharGrade(); desenharAbas(); }
    if(mover) irPara(S.sel.c1 + (mover === 'dir' ? 1 : mover === 'esq' ? -1 : 0), S.sel.l1 + (mover === 'baixo' ? 1 : mover === 'cima' ? -1 : 0));
    atualizarBarra();
  }
  function cancelarEdicao(){ var ta = $('plEd'); if(ta) ta.remove(); var ed = S.ed; S.ed = null; if(ed && ed.aba !== S.ativa){ S.ativa = ed.aba; desenharGrade(); desenharAbas(); } atualizarBarra(); }
  function teclaEditor(e){
    if(e.key === 'Enter' && !e.altKey){ e.preventDefault(); confirmarEdicao(e.shiftKey ? 'cima' : 'baixo'); return; }
    if(e.key === 'Enter' && e.altKey){ e.preventDefault(); var t = e.target, p = t.selectionStart; t.value = t.value.slice(0, p) + '\n' + t.value.slice(t.selectionEnd); t.setSelectionRange(p + 1, p + 1); return; }
    if(e.key === 'Tab'){ e.preventDefault(); confirmarEdicao(e.shiftKey ? 'esq' : 'dir'); return; }
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); cancelarEdicao(); return; }
  }
  /* clicar numa célula enquanto escreve a fórmula: põe a referência */
  function porReferencia(c, l, c2, l2){
    var alvo = $('plEd') || $('plFx');
    var r = M.ref(c, l) + (c2 != null && (c2 !== c || l2 !== l) ? ':' + M.ref(c2, l2) : '');
    if(S.ed.aba !== S.ativa){ var n = aba().nome; r = (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n) ? n : "'" + n.replace(/'/g, "''") + "'") + '!' + r; }
    var p = alvo.selectionStart, q = alvo.selectionEnd, v = alvo.value;
    /* troca a referência que acabou de ser posta (arrastar) */
    if(S.ed.refPos != null && S.ed.refFim === p){ v = v.slice(0, S.ed.refPos) + v.slice(p); p = q = S.ed.refPos; }
    alvo.value = v.slice(0, p) + r + v.slice(q); S.ed.refPos = p; S.ed.refFim = p + r.length;
    alvo.focus(); alvo.setSelectionRange(p + r.length, p + r.length);
    if(alvo.id === 'plEd'){ $('plFx').value = alvo.value; ajustarLargura(alvo); }
  }
  function aceitaReferencia(){
    if(!S.ed || !S.ed.formula) return false;
    var alvo = $('plEd') || $('plFx'), p = alvo.selectionStart, antes = alvo.value.slice(0, p).replace(/\s+$/, '');
    if(S.ed.refFim === p) return true;
    return /[=+\-*\/^&(,;:<>]$/.test(antes);
  }

  /* ================= ações na seleção ================= */
  function cadaCelula(fn, criar){
    var n = norm(S.sel), a = aba();
    for(var l = n.l1; l <= n.l2; l++) for(var c = n.c1; c <= n.c2; c++){
      var r = M.ref(c, l); if(!a.celulas[r] && criar) a.celulas[r] = {};
      if(a.celulas[r]) fn(a.celulas[r], r, c, l);
      if(a.celulas[r] && !Object.keys(a.celulas[r]).length) delete a.celulas[r];
    }
  }
  function formatar(fn){ if(!S.pode.criar) return; guardarDesfazer(); cadaCelula(fn, true); mudou(); }
  function limparSelecao(){ if(!S.pode.criar) return; guardarDesfazer(); cadaCelula(function(c){ delete c.v; delete c.f; }); mudou(); }
  function alternar(p){ var at = (cel(ativaRef()) || {})[p]; formatar(function(c){ if(at) delete c[p]; else c[p] = true; }); }
  function alinhar(al){ formatar(function(c){ if(c.al === al) delete c.al; else c.al = al; }); }
  function casas(d){ formatar(function(c){ var base = c.casas != null ? c.casas : (c.t === 'int' ? 0 : 2); c.casas = Math.max(0, Math.min(10, base + d)); }); }
  function mesclar(){
    if(!S.pode.criar) return;
    var n = norm(S.sel), a = aba(), alvo = M.ref(n.c1, n.l1) + ':' + M.ref(n.c2, n.l2);
    a.mesclas = a.mesclas || [];
    var existe = a.mesclas.filter(function(m){ var p = m.split(':'), x = M.endereco(p[0]), y = M.endereco(p[1]); return !(y.c < n.c1 || x.c > n.c2 || y.l < n.l1 || x.l > n.l2); });
    guardarDesfazer();
    if(existe.length){ a.mesclas = a.mesclas.filter(function(m){ return existe.indexOf(m) < 0; }); }
    else if(n.c1 !== n.c2 || n.l1 !== n.l2){
      var cheias = 0; cadaCelula(function(c, r){ if(r !== M.ref(n.c1, n.l1) && (c.v !== undefined && c.v !== '' || c.f)) cheias++; });
      if(cheias && !confirm('Mesclar mantém só o conteúdo da 1ª célula; ' + cheias + ' outra(s) célula(s) marcadas têm conteúdo e vão ficar escondidas. Mesclar mesmo assim?')){ S.desfazer.pop(); return; }
      a.mesclas.push(alvo);
    } else { S.desfazer.pop(); return; }
    mudou();
  }
  function nota(){
    if(!S.pode.criar) return;
    var c = cel(ativaRef()) || {};
    janela('jNota', 'Nota da célula ' + ativaRef(), 'A nota aparece ao parar o mouse na célula (triângulo no canto). Não vai para o PDF; no Excel vira comentário.',
      '<textarea class="campo" id="ntTexto" rows="4" maxlength="1000"></textarea><label style="display:flex;gap:8px;align-items:center;font-size:12.5px"><input type="checkbox" id="ntConferir"> Marcar como <b>a conferir com o Dr. Victor</b> (aparece no quadro de avisos)</label>',
      '<button class="btn" type="button" id="ntTirar">Tirar a nota</button><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn btn-ouro" type="button" id="ntOk">Pronto</button>');
    $('ntTexto').value = c.nota || ''; $('ntConferir').checked = !!c.conferir; setTimeout(function(){ $('ntTexto').focus(); }, 60);
    $('ntOk').onclick = function(){ var t = $('ntTexto').value.trim(), cf = $('ntConferir').checked; fecharJanela('jNota'); guardarDesfazer(); var a = aba(), r = ativaRef(); a.celulas[r] = a.celulas[r] || {}; if(t){ a.celulas[r].nota = t; if(cf) a.celulas[r].conferir = true; else delete a.celulas[r].conferir; } else { delete a.celulas[r].nota; delete a.celulas[r].conferir; } if(!Object.keys(a.celulas[r]).length) delete a.celulas[r]; mudou(); };
    $('ntTirar').onclick = function(){ fecharJanela('jNota'); guardarDesfazer(); var a = aba(), r = ativaRef(); if(a.celulas[r]){ delete a.celulas[r].nota; delete a.celulas[r].conferir; if(!Object.keys(a.celulas[r]).length) delete a.celulas[r]; } mudou(); };
  }
  function linhasColunas(eixo, inserir){
    if(!S.pode.criar) return;
    var n = norm(S.sel); guardarDesfazer();
    if(eixo === 'linha'){ if(inserir) M.inserir(S.pasta, S.ativa, 'linha', n.l1, 1); else M.excluir(S.pasta, S.ativa, 'linha', n.l1, n.l2 - n.l1 + 1); }
    else { if(inserir) M.inserir(S.pasta, S.ativa, 'coluna', n.c1, 1); else M.excluir(S.pasta, S.ativa, 'coluna', n.c1, n.c2 - n.c1 + 1); }
    S.sel = { c1: n.c1, l1: n.l1, c2: n.c1, l2: n.l1 }; S.area = null; mudou();
  }
  function preencherAbaixo(){
    if(!S.pode.criar) return;
    var n = norm(S.sel); if(n.l2 === n.l1) return;
    guardarDesfazer(); var a = aba();
    for(var c = n.c1; c <= n.c2; c++){
      var base = a.celulas[M.ref(c, n.l1)];
      for(var l = n.l1 + 1; l <= n.l2; l++){
        var r = M.ref(c, l);
        if(!base){ delete a.celulas[r]; continue; }
        var novo = JSON.parse(JSON.stringify(base)); delete novo.nota; delete novo.conferir;
        if(novo.f) novo.f = M.transpor(base.f, 0, l - n.l1);
        a.celulas[r] = novo;
      }
    }
    mudou();
  }

  /* ================= copiar e colar ================= */
  function copiar(cortar){
    var n = norm(S.sel), a = aba(), linhas = [], cels = [];
    for(var l = n.l1; l <= n.l2; l++){
      var lin = [], cl = [];
      for(var c = n.c1; c <= n.c2; c++){ var r = M.ref(c, l), ce = a.celulas[r]; lin.push(ce ? M.mostrar(S.calc.valor(S.ativa, r), ce) : ''); cl.push(ce ? JSON.parse(JSON.stringify(ce)) : null); }
      linhas.push(lin.join('\t')); cels.push(cl);
    }
    var txt = linhas.join('\n');
    S.clip = { txt: txt, cels: cels, c: n.c1, l: n.l1, cortar: !!cortar, aba: S.ativa };
    return txt;
  }
  function colar(txt){
    if(!S.pode.criar) return;
    var a = aba(), n = norm(S.sel);
    guardarDesfazer();
    if(S.clip && txt != null && txt.replace(/\r/g, '') === S.clip.txt){
      var dc = n.c1 - S.clip.c, dl = n.l1 - S.clip.l, origem = S.pasta.abas[S.clip.aba];
      if(S.clip.cortar){ S.clip.cels.forEach(function(lin, i){ lin.forEach(function(x, j){ delete origem.celulas[M.ref(S.clip.c + j, S.clip.l + i)]; }); }); }
      S.clip.cels.forEach(function(lin, i){ lin.forEach(function(x, j){
        var r = M.ref(n.c1 + j, n.l1 + i);
        if(!x){ delete a.celulas[r]; return; }
        var novo = JSON.parse(JSON.stringify(x)); if(novo.f && !S.clip.cortar) novo.f = M.transpor(x.f, dc, dl);
        a.celulas[r] = novo;
      }); });
      if(S.clip.cortar) S.clip = null;
    } else {
      String(txt || '').replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach(function(linha, i){
        linha.split('\t').forEach(function(v, j){ gravarCelula(a, M.ref(n.c1 + j, n.l1 + i), v); });
      });
    }
    mudou();
  }

  /* ================= eventos ================= */
  function ligarTela(){
    var g = $('plCaixa'), arrastando = false, larg = null;
    $('plTitulo').addEventListener('input', function(){ S.pendente = true; estadoSalvo(); });
    g.addEventListener('mousedown', function(e){
      var al = e.target.closest('[data-alca]');
      if(al){ e.preventDefault(); var c = +al.getAttribute('data-alca'); larg = { c: c, x: e.clientX, w: largura(c) }; return; }
      var th = e.target.closest('thead th[data-col]');
      if(th){ var cc = +th.getAttribute('data-col'); if(S.ed) confirmarEdicao(); S.sel = { c1: cc, l1: 1, c2: cc, l2: S.area.lins }; pintarSelecao(); atualizarBarra(); return; }
      var tl = e.target.closest('th[data-lin]');
      if(tl){ var ll = +tl.getAttribute('data-lin'); if(S.ed) confirmarEdicao(); S.sel = { c1: 1, l1: ll, c2: S.area.cols, l2: ll }; pintarSelecao(); atualizarBarra(); return; }
      var td = e.target.closest('td[data-c]'); if(!td) return;
      if(e.target.id === 'plEd') return;
      var c2 = +td.getAttribute('data-c'), l2 = +td.getAttribute('data-l');
      if(S.ed && aceitaReferencia()){ e.preventDefault(); S.refArr = { c: c2, l: l2 }; porReferencia(c2, l2); arrastando = 'ref'; return; }
      if(S.ed) confirmarEdicao();
      e.preventDefault();
      if(e.shiftKey){ S.sel.c2 = c2; S.sel.l2 = l2; } else S.sel = { c1: c2, l1: l2, c2: c2, l2: l2 };
      arrastando = 'sel'; pintarSelecao(); atualizarBarra();
      g.focus({ preventScroll: true });
    });
    g.addEventListener('mouseover', function(e){
      if(!arrastando) return; var td = e.target.closest('td[data-c]'); if(!td) return;
      var c = +td.getAttribute('data-c'), l = +td.getAttribute('data-l');
      if(arrastando === 'ref'){ porReferencia(S.refArr.c, S.refArr.l, c, l); return; }
      S.sel.c2 = c; S.sel.l2 = l; pintarSelecao(); atualizarBarra();
    });
    document.addEventListener('mousemove', function(e){ if(!larg) return; var w = Math.max(30, larg.w + e.clientX - larg.x); var col = $('plGrade').querySelectorAll('colgroup col')[larg.c]; if(col) col.style.width = w + 'px'; larg.nw = w; });
    document.addEventListener('mouseup', function(){
      if(larg && larg.nw){ if(S.pode.criar){ guardarDesfazer(); var a = aba(); a.colunas = a.colunas || {}; a.colunas[M.colTxt(larg.c)] = Math.round(larg.nw); S.pendente = true; estadoSalvo(); } }
      larg = null; arrastando = false;
    });
    g.addEventListener('dblclick', function(e){ var td = e.target.closest('td[data-c]'); if(td && e.target.id !== 'plEd') comecarEdicao(); });
    g.tabIndex = 0;
    g.addEventListener('keydown', teclaGrade);
    g.addEventListener('copy', function(e){ if(S.ed) return; e.preventDefault(); e.clipboardData.setData('text/plain', copiar(false)); });
    g.addEventListener('cut', function(e){ if(S.ed || !S.pode.criar) return; e.preventDefault(); e.clipboardData.setData('text/plain', copiar(true)); });
    g.addEventListener('paste', function(e){ if(S.ed) return; e.preventDefault(); colar(e.clipboardData.getData('text/plain')); });
    /* barra de fórmula */
    var fx = $('plFx');
    fx.addEventListener('focus', function(){ if(!S.pode.criar){ fx.blur(); return; } if(!S.ed) comecarEdicao(null, true); });
    fx.addEventListener('input', function(){ if(!S.ed) comecarEdicao(null, true); S.ed.formula = fx.value[0] === '='; var ta = $('plEd'); if(ta) ta.value = fx.value; else mascara(fx, cel(S.ed.r) || {}); });
    fx.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); confirmarEdicao('baixo'); g.focus({ preventScroll: true }); }
      else if(e.key === 'Escape'){ e.preventDefault(); cancelarEdicao(); g.focus({ preventScroll: true }); }
      else if(e.key === 'Tab'){ e.preventDefault(); confirmarEdicao('dir'); g.focus({ preventScroll: true }); }
    });
    fx.addEventListener('blur', function(){ setTimeout(function(){ if(S.ed && S.ed.barra && document.activeElement !== fx && !arrastando) confirmarEdicao(); }, 150); });
    /* ferramentas */
    $('fDesfazer').onclick = desfazer; $('fRefazer').onclick = refazer;
    $('fFormato').onchange = function(){ var t = this.value; formatar(function(c){ if(t) c.t = t; else delete c.t; delete c.casas; }); };
    $('fMenos').onclick = function(){ casas(-1); }; $('fMais').onclick = function(){ casas(1); };
    $('fB').onclick = function(){ alternar('b'); }; $('fI').onclick = function(){ alternar('i'); }; $('fQuebra').onclick = function(){ alternar('q'); };
    $('fEsq').onclick = function(){ alinhar('esq'); }; $('fCentro').onclick = function(){ alinhar('centro'); }; $('fDir').onclick = function(){ alinhar('dir'); };
    $('fCores').querySelectorAll('[data-cor]').forEach(function(b){ b.onclick = function(){ var k = b.getAttribute('data-cor'); formatar(function(c){ if(k) c.fundo = k; else delete c.fundo; }); }; });
    $('fMesclar').onclick = mesclar; $('fNota').onclick = nota;
    $('fLinIns').onclick = function(){ linhasColunas('linha', true); }; $('fLinExc').onclick = function(){ linhasColunas('linha', false); };
    $('fColIns').onclick = function(){ linhasColunas('coluna', true); }; $('fColExc').onclick = function(){ linhasColunas('coluna', false); };
    $('fPreencher').onclick = preencherAbaixo;
    $('plSalvar').onclick = function(){ salvar(); };
    $('plVersoes').onclick = versoes;
    $('plPdf').onclick = function(){ janelaPdf(false); };
    $('plXlsx').onclick = function(){ baixarXlsx(); };
    $('plGuardar').onclick = function(){ janelaPdf(true); };
    $('plImportar').onchange = function(){ var f = this.files && this.files[0]; this.value = ''; if(f) importarXlsx(f); };
    document.addEventListener('keydown', function(e){
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); if(S.ed) confirmarEdicao(); salvar(); }
    });
    window.addEventListener('beforeunload', function(e){ if(S.pendente){ e.preventDefault(); e.returnValue = ''; } });
  }
  function teclaGrade(e){
    if(S.ed || e.target.id === 'plEd') return;
    var k = e.key, ctrl = e.ctrlKey || e.metaKey, s = S.sel;
    var cc = e.shiftKey ? s.c2 : s.c1, ll = e.shiftKey ? s.l2 : s.l1;
    if(k === 'ArrowDown'){ e.preventDefault(); irPara(cc, ll + 1, e.shiftKey); return; }
    if(k === 'ArrowUp'){ e.preventDefault(); irPara(cc, ll - 1, e.shiftKey); return; }
    if(k === 'ArrowRight'){ e.preventDefault(); irPara(cc + 1, ll, e.shiftKey); return; }
    if(k === 'ArrowLeft'){ e.preventDefault(); irPara(cc - 1, ll, e.shiftKey); return; }
    if(k === 'Enter'){ e.preventDefault(); irPara(s.c1, s.l1 + (e.shiftKey ? -1 : 1)); return; }
    if(k === 'Tab'){ e.preventDefault(); irPara(s.c1 + (e.shiftKey ? -1 : 1), s.l1); return; }
    if(k === 'F2'){ e.preventDefault(); comecarEdicao(); return; }
    if(k === 'Delete' || k === 'Backspace'){ e.preventDefault(); limparSelecao(); return; }
    if(ctrl){
      var kk = k.toLowerCase();
      if(kk === 'z'){ e.preventDefault(); if(e.shiftKey) refazer(); else desfazer(); return; }
      if(kk === 'y'){ e.preventDefault(); refazer(); return; }
      if(kk === 'b'){ e.preventDefault(); alternar('b'); return; }
      if(kk === 'i'){ e.preventDefault(); alternar('i'); return; }
      if(kk === 'd'){ e.preventDefault(); preencherAbaixo(); return; }
      if(kk === 'a'){ e.preventDefault(); S.sel = { c1: 1, l1: 1, c2: S.area.cols, l2: S.area.lins }; pintarSelecao(); atualizarBarra(); return; }
      return;
    }
    if(k.length === 1 && !e.altKey){ e.preventDefault(); comecarEdicao(k); var ta = $('plEd'); if(ta){ mascara(ta, cel(ativaRef()) || {}); $('plFx').value = ta.value; } }
  }

  /* ================= avisos (erros sempre à vista) ================= */
  function desenharAvisos(){
    var box = $('plAvisos'), h = '';
    (S.avisosTela || []).forEach(function(a, i){ h += '<div class="aviso ' + (a.tipo || 'atencao') + '"><div><b>' + esc(a.titulo) + '</b>' + esc(a.texto || '') + (a.acao ? ' <span class="lnk" data-acao="' + i + '">' + esc(a.acao.rotulo) + '</span>' : '') + '</div></div>'; });
    var todos = S.calc.tudo(), erros = [], conferir = [];
    S.pasta.abas.forEach(function(a, i){
      Object.keys(todos[i] || {}).forEach(function(r){ var v = todos[i][r]; if(M.ehErro(v)) erros.push({ i: i, r: r, e: v.e }); });
      Object.keys(a.celulas || {}).forEach(function(r){ var c = a.celulas[r]; if(c.conferir && c.nota) conferir.push({ i: i, r: r, t: c.nota }); });
    });
    (S.pasta.avisos || []).forEach(function(t){ h += '<div class="aviso atencao"><div>' + esc(t) + '</div></div>'; });
    if(conferir.length) h += '<div class="aviso atencao"><div><b>A conferir com o Dr. Victor (' + conferir.length + ')</b><ul>' + conferir.map(function(x){ return '<li><span class="lnk" data-ir="' + x.i + '|' + x.r + '">' + esc(S.pasta.abas[x.i].nome + ' › ' + x.r) + '</span>: ' + esc(x.t) + '</li>'; }).join('') + '</ul></div></div>';
    if(erros.length){
      var porTipo = {}; erros.forEach(function(x){ porTipo[x.e] = (porTipo[x.e] || 0) + 1; });
      h += '<div class="aviso erro"><div><b>' + erros.length + ' célula(s) com erro na conta</b>' + Object.keys(porTipo).map(function(t){ return esc(t) + ' (' + porTipo[t] + '): ' + esc(M.ERROS[t] || ''); }).join('<br>')
        + '<br>Onde: ' + erros.slice(0, 12).map(function(x){ return '<span class="lnk" data-ir="' + x.i + '|' + x.r + '">' + esc(S.pasta.abas[x.i].nome + ' › ' + x.r) + '</span>'; }).join(', ') + (erros.length > 12 ? '…' : '') + '</div></div>';
    }
    box.innerHTML = h;
    box.querySelectorAll('[data-acao]').forEach(function(s){ s.onclick = function(){ var a = (S.avisosTela || [])[+s.getAttribute('data-acao')]; if(a && a.acao) a.acao.fazer(); }; });
    box.querySelectorAll('[data-ir]').forEach(function(s){ s.onclick = function(){ var p = s.getAttribute('data-ir').split('|'), e = M.endereco(p[1]); if(+p[0] !== S.ativa) trocarAba(+p[0]); irPara(e.c, e.l); $('plCaixa').focus({ preventScroll: true }); }; });
  }
  function estadoSalvo(){
    var d = S.doc || {}, info = $('plInfo');
    var partes = [];
    if(S.ctx.pessoa) partes.push('<a class="pl-chip" href="' + FICHA + '?pessoa_id=' + encodeURIComponent(S.ctx.pessoa.id) + (d.processo_id ? '&processo_id=' + encodeURIComponent(d.processo_id) : '') + '" target="_blank" rel="noopener">' + esc(S.ctx.pessoa.nome_completo || 'Cliente') + (S.ctx.pessoa.codigo ? ' · ' + esc(S.ctx.pessoa.codigo) : '') + ' ↗</a>');
    if(S.ctx.processo) partes.push('<span class="pl-chip">' + esc(S.ctx.processo.codigo || 'Processo') + (S.ctx.processo.numero_processo_cnj ? ' · ' + esc(fmtCnj(S.ctx.processo.numero_processo_cnj)) : '') + '</span>');
    partes.push('<span class="pl-chip ' + (S.pendente ? 'pendente' : 'salvo') + '">' + (S.pendente ? 'Alterações não salvas' : (d.id ? 'Salvo · versão ' + d.versao : 'Ainda não salvo')) + '</span>');
    if(!S.pode.criar) partes.push('<span class="pl-chip">Só leitura</span>');
    info.innerHTML = partes.join('');
    $('plSalvar').disabled = !S.pode.criar;
  }
  function fmtCnj(n){ try{ return window.sagaFmt && sagaFmt.cnj ? sagaFmt.cnj(n) : n; }catch(e){ return n; } }

  /* ================= salvar e versões ================= */
  async function salvar(nota){
    if(!S.pode.criar){ toast('Sem permissão para salvar documentos.', 'error'); return; }
    if(S.ed) confirmarEdicao();
    var titulo = $('plTitulo').value.trim() || 'Planilha';
    var b = $('plSalvar'); b.disabled = true; b.textContent = 'Salvando…';
    try{
      var d = S.doc || {};
      S.pasta.ativa = S.ativa;
      var r = await _sb.rpc('editavel_salvar', { p_id: d.id || null, p_tipo: 'planilha', p_titulo: titulo, p_conteudo: S.pasta, p_versao_base: d.id ? d.versao : null,
        p_processo_id: d.id ? null : (d.processo_id || null), p_pessoa_id: d.id ? null : (d.pessoa_id || null), p_pasta_id: d.pasta_id || null,
        p_modelo: d.id ? null : (d.modelo || null), p_calculo_id: d.id ? null : (d.calculo_id || null), p_nota: nota || null });
      if(r.error) throw r.error;
      d.id = r.data.id; d.versao = r.data.versao; d.titulo = titulo; S.doc = d; S.pendente = false;
      var u = new URL(location.href); if(u.searchParams.get('doc') !== d.id){ u.search = '?doc=' + d.id; history.replaceState(history.state, '', u.toString()); }
      S.avisosTela = (S.avisosTela || []).filter(function(a){ return !a.salvar; });
      toast('Salvo (versão ' + d.versao + ').', 'success');
      desenharAvisos();
    }catch(e){
      S.avisosTela = (S.avisosTela || []).filter(function(a){ return !a.salvar; });
      S.avisosTela.push({ tipo: 'erro', salvar: true, titulo: 'Não salvei a planilha.', texto: 'Motivo: ' + msgErro(e) + '. O que você fez continua aqui na tela; tente de novo ou baixe em Excel para não perder.' });
      desenharAvisos();
    }finally{ b.textContent = 'Salvar'; estadoSalvo(); }
  }
  async function versoes(){
    var d = S.doc || {};
    if(!d.id){ janela('jVersoes', 'Versões', '', '<div class="dica">Esta planilha ainda não foi salva. Cada "Salvar" cria uma versão nova; nenhuma versão se apaga.</div>', '<button class="btn" type="button" data-fechar>Fechar</button>'); return; }
    janela('jVersoes', 'Versões', 'Cada "Salvar" criou uma versão; nada se apaga. Abrir uma versão antiga põe o conteúdo dela na tela; ao salvar, vira a versão mais nova.', '<div class="lista-versoes" id="lvLista"><div class="dica">Carregando…</div></div>', '<button class="btn" type="button" data-fechar>Fechar</button>');
    try{
      var r = await _sb.from('documentos_editaveis_versoes').select('id,versao,titulo,nota,salvo_em,salvo_por').eq('editavel_id', d.id).order('versao', { ascending: false }).limit(200);
      if(r.error) throw r.error;
      var ids = Array.from(new Set((r.data || []).map(function(v){ return v.salvo_por; }).filter(Boolean))), nomes = {};
      if(ids.length){ var u = await _sb.from('usuarios').select('id,nome_completo').in('id', ids); (u.data || []).forEach(function(x){ nomes[x.id] = x.nome_completo; }); }
      $('lvLista').innerHTML = (r.data || []).map(function(v){
        return '<div class="v"><div><b>Versão ' + v.versao + '</b>' + (v.versao === d.versao ? ' (atual)' : '') + '<br><small>' + esc(new Date(v.salvo_em).toLocaleString('pt-BR')) + ' · ' + esc(nomes[v.salvo_por] || '') + (v.nota ? ' · ' + esc(v.nota) : '') + '</small></div>'
          + (v.versao !== d.versao ? '<button class="btn" type="button" data-ver="' + v.id + '">Abrir esta versão</button>' : '') + '</div>';
      }).join('') || '<div class="dica">Nenhuma versão.</div>';
      $('lvLista').querySelectorAll('[data-ver]').forEach(function(b){ b.onclick = async function(){
        if(S.pendente && !confirm('Há alterações não salvas na tela. Trocar pela versão antiga mesmo assim?')) return;
        var x = await _sb.from('documentos_editaveis_versoes').select('versao,conteudo,titulo').eq('id', b.getAttribute('data-ver')).single();
        if(x.error){ toast('Não abri a versão: ' + msgErro(x.error), 'error'); return; }
        guardarDesfazer(); S.pasta = x.data.conteudo; S.ativa = Math.min(S.pasta.ativa || 0, S.pasta.abas.length - 1); $('plTitulo').value = x.data.titulo;
        S.avisosTela = (S.avisosTela || []).filter(function(a){ return !a.versao; });
        S.avisosTela.push({ tipo: 'atencao', versao: true, titulo: 'Você está vendo a versão ' + x.data.versao + ' (antiga).', texto: 'Para voltar a ela de vez, clique em Salvar: ela vira a versão mais nova. As outras versões continuam guardadas.' });
        fecharJanela('jVersoes'); mudou();
      }; });
    }catch(e){ $('lvLista').innerHTML = '<div class="erro-campo">Não consegui ler as versões: ' + esc(msgErro(e)) + '</div>'; }
  }

  /* ================= bibliotecas (versão fixa, guardadas no site) ================= */
  var cacheScripts = {};
  function script(src){
    if(!cacheScripts[src]) cacheScripts[src] = new Promise(function(ok, falha){ var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function(){ delete cacheScripts[src]; falha(new Error('não consegui carregar ' + src)); }; document.head.appendChild(s); });
    return cacheScripts[src];
  }
  async function exceljs(){ if(!window.ExcelJS) await script('vendor/exceljs-4.4.0/exceljs.min.js'); return window.ExcelJS; }
  async function pdflib(){ if(!window.PDFLib) await script('vendor/pdf-lib-1.17.1/pdf-lib.min.js'); if(!window.fontkit) await script('vendor/pdf-lib-fontkit-1.1.1/fontkit.umd.min.js'); return { PDFLib: window.PDFLib, fontkit: window.fontkit }; }
  function baixarBytes(bytes, nome, tipo){ var b = new Blob([bytes], { type: tipo }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function nomeArquivo(ext){ return (($('plTitulo').value.trim() || 'Planilha').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120)) + '.' + ext; }

  /* ================= Excel (.xlsx) ================= */
  var FUNDO_XLSX = { titulo: '1F3E6D', secao: 'E3EBF6', entrada: 'FFF8DB', total: 'D6E1F0', ok: 'E4F4E8', aviso: 'FDECEA' };
  function numFmt(c){
    var cs = c.casas, z = function(n, pad){ return n ? '.' + new Array(n + 1).join(pad || '0') : ''; };
    switch(c.t){
      case 'reais': return '"R$" #,##0' + z(cs == null ? 2 : cs) + ';-"R$" #,##0' + z(cs == null ? 2 : cs);
      case 'pct': return '0' + z(cs == null ? 2 : cs) + '%';
      case 'num': return '#,##0' + z(cs == null ? 2 : cs);
      case 'int': return '#,##0';
      case 'data': return 'dd/mm/yyyy';
      case 'texto': return '@';
    }
    return cs != null ? '0' + z(cs) : null;
  }
  function serieParaDate(n){ var d = M.serieData(n); return new Date(Date.UTC(d.a, d.m - 1, d.d)); }
  async function montarXlsx(){
    var X = await exceljs(), wb = new X.Workbook();
    wb.creator = 'SAGA ADV'; wb.created = new Date();
    var todos = S.calc.tudo();
    S.pasta.abas.forEach(function(a, i){
      var ws = wb.addWorksheet(a.nome, { pageSetup: { paperSize: 9, orientation: a.paisagem ? 'landscape' : 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      var u = M.usada(a);
      for(var c = 1; c <= Math.max(u.colunas, 1); c++) ws.getColumn(c).width = Math.max(4, Math.round(largura2(a, c) / 7.2));
      Object.keys(a.linhas || {}).forEach(function(l){ ws.getRow(+l).height = a.linhas[l] * 0.75; });
      Object.keys(a.celulas || {}).forEach(function(r){
        var ce = a.celulas[r], xc = ws.getCell(r), v = todos[i][r];
        if(ce.f){
          var res = M.ehErro(v) ? { error: v.e === '#CICLO!' || v.e === '#ERRO!' ? '#VALUE!' : v.e } : (v === '' ? undefined : v);
          xc.value = { formula: ce.f.slice(1), result: res };
        } else if(ce.v !== undefined && ce.v !== ''){
          xc.value = (ce.t === 'data' && typeof ce.v === 'number') ? serieParaDate(ce.v) : ce.v;
        }
        var nf = numFmt(ce); if(nf) xc.numFmt = nf;
        var fonte = {}; if(ce.b) fonte.bold = true; if(ce.i) fonte.italic = true; if(ce.fundo === 'titulo'){ fonte.color = { argb: 'FFFFFFFF' }; fonte.bold = true; }
        if(Object.keys(fonte).length) xc.font = fonte;
        var hex = ce.fundo ? (FUNDO_XLSX[ce.fundo] || (/^#[0-9a-f]{6}$/i.test(ce.fundo) ? ce.fundo.slice(1).toUpperCase() : null)) : null;
        if(hex) xc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } };
        var al = {}; if(ce.al) al.horizontal = ce.al === 'esq' ? 'left' : ce.al === 'centro' ? 'center' : 'right'; if(ce.q){ al.wrapText = true; al.vertical = 'top'; }
        if(Object.keys(al).length) xc.alignment = al;
        if(ce.borda || ce.fundo) xc.border = { top: { style: 'thin', color: { argb: 'FFC9D3E0' } }, left: { style: 'thin', color: { argb: 'FFC9D3E0' } }, bottom: { style: 'thin', color: { argb: 'FFC9D3E0' } }, right: { style: 'thin', color: { argb: 'FFC9D3E0' } } };
        if(ce.nota) xc.note = (ce.conferir ? 'A conferir com o Dr. Victor: ' : '') + ce.nota;
      });
      (a.mesclas || []).forEach(function(m){ try{ ws.mergeCells(m); }catch(e){} });
    });
    return new Uint8Array(await wb.xlsx.writeBuffer());
  }
  function largura2(a, c){ return (a.colunas || {})[M.colTxt(c)] || LARG; }
  async function baixarXlsx(){
    try{ var b = await montarXlsx(); baixarBytes(b, nomeArquivo('xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); toast('Excel gerado.', 'success'); }
    catch(e){ avisoErro('Não gerei o Excel.', e); }
  }
  function avisoErro(titulo, e){ S.avisosTela = (S.avisosTela || []).filter(function(a){ return a.titulo !== titulo; }); S.avisosTela.push({ tipo: 'erro', titulo: titulo, texto: 'Motivo: ' + msgErro(e) + '.' }); desenharAvisos(); window.scrollTo({ top: 0, behavior: reduzido() ? 'auto' : 'smooth' }); }
  async function importarXlsx(arquivo){
    if(!S.pode.criar){ toast('Sem permissão para editar.', 'error'); return; }
    try{
      var X = await exceljs(), wb = new X.Workbook();
      await wb.xlsx.load(await arquivo.arrayBuffer());
      var nova = { formato: 1, ativa: 0, abas: [] }, avisos = [];
      wb.eachSheet(function(ws){
        if(ws.state && ws.state !== 'visible') avisos.push('A aba "' + ws.name + '" estava oculta no Excel e veio junto.');
        var a = { nome: ws.name.slice(0, 31), celulas: {}, colunas: {}, linhas: {}, mesclas: [] };
        (ws.columns || []).forEach(function(col, k){ if(col && col.width) a.colunas[M.colTxt(k + 1)] = Math.round(col.width * 7.2); });
        ws.eachRow({ includeEmpty: false }, function(row, l){
          if(row.height) a.linhas[l] = Math.round(row.height / 0.75);
          row.eachCell({ includeEmpty: false }, function(xc, c){
            var r = M.ref(c, l), ce = {}, v = xc.value;
            if(xc.isMerged && xc.master !== xc) return;
            var f = null; try{ f = xc.formula; }catch(e){}
            if(f) ce.f = '=' + f;
            else if(v && typeof v === 'object'){
              if(v instanceof Date) ce.v = M.dataSerie(v.getUTCDate(), v.getUTCMonth() + 1, v.getUTCFullYear()), ce.t = 'data';
              else if(v.richText) ce.v = v.richText.map(function(t){ return t.text; }).join('');
              else if(v.text != null) ce.v = String(v.text);
              else if(v.error) ce.f = '=' + v.error;
              else if(v.result != null) ce.v = v.result;
            } else if(v != null) ce.v = v;
            var nf = xc.numFmt || '';
            if(nf){
              if(/R\$|\[\$R\$/.test(nf)) ce.t = 'reais'; else if(/%/.test(nf)) ce.t = 'pct'; else if(/[dmy]{2}/i.test(nf) && !/#/.test(nf)) ce.t = 'data'; else if(/#,##0\.0/.test(nf)) ce.t = 'num'; else if(/^#,##0$/.test(nf)) ce.t = 'int';
              var m = /\.(0+)/.exec(nf); if(ce.t && ce.t !== 'data' && m && m[1].length !== 2) ce.casas = m[1].length; if(ce.t === 'pct' && !m) ce.casas = 0;
            }
            if(ce.t === 'data' && typeof ce.v === 'number' && ce.v > 100000) delete ce.t;
            if(xc.font){ if(xc.font.bold) ce.b = true; if(xc.font.italic) ce.i = true; }
            if(xc.alignment){ var h = xc.alignment.horizontal; if(h === 'left') ce.al = 'esq'; else if(h === 'center' || h === 'centerContinuous') ce.al = 'centro'; else if(h === 'right') ce.al = 'dir'; if(xc.alignment.wrapText) ce.q = true; }
            if(xc.fill && xc.fill.fgColor && xc.fill.fgColor.argb && xc.fill.pattern === 'solid'){ var hex = xc.fill.fgColor.argb.slice(-6).toUpperCase(); if(hex !== 'FFFFFF'){ var tok = Object.keys(FUNDO_XLSX).filter(function(k){ return FUNDO_XLSX[k] === hex; })[0]; ce.fundo = tok || '#' + hex; } }
            if(xc.note){ ce.nota = typeof xc.note === 'string' ? xc.note : ((xc.note.texts || []).map(function(t){ return t.text; }).join('')); }
            if(Object.keys(ce).length) a.celulas[r] = ce;
          });
        });
        try{ var mg = (ws.model && ws.model.merges) || []; a.mesclas = mg.slice(); }catch(e){}
        nova.abas.push(a);
      });
      if(!nova.abas.length) throw new Error('o arquivo não tem nenhuma aba');
      var vazia = !S.pasta.abas.some(function(a){ return Object.keys(a.celulas || {}).length; });
      if(!vazia && !confirm('Trocar o conteúdo desta planilha pelo do Excel "' + arquivo.name + '"? (Dá para desfazer com Ctrl+Z; as versões salvas continuam guardadas.)')) return;
      guardarDesfazer(); S.pasta = nova; S.ativa = 0; S.sel = { c1: 1, l1: 1, c2: 1, l2: 1 };
      if(!$('plTitulo').value.trim() || /^Planilha( \d+)?$/.test($('plTitulo').value.trim())) $('plTitulo').value = arquivo.name.replace(/\.xlsx$/i, '');
      S.avisosTela = (S.avisosTela || []).filter(function(a){ return !a.importou; });
      S.avisosTela.push({ tipo: 'atencao', importou: true, titulo: 'Excel aberto: "' + arquivo.name + '" (' + nova.abas.length + ' aba(s)).', texto: 'O arquivo foi lido neste computador (não foi para nenhum site). Confira as contas: fórmulas que o SAGA ainda não conhece aparecem com #NAME?. ' + avisos.join(' ') + ' Salve para guardar no SAGA.' });
      mudou();
    }catch(e){ avisoErro('Não consegui abrir o Excel.', e); }
  }

  /* ================= PDF (timbrado ou simples) ================= */
  var FUNDO_PDF = { titulo: [0.122, 0.243, 0.427], secao: [0.890, 0.922, 0.965], total: [0.839, 0.882, 0.941], ok: [0.894, 0.957, 0.910], aviso: [0.992, 0.925, 0.918] };
  function hexRgb(h){ h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; }
  async function bytesUrl(u){ var r = await fetch(u); if(!r.ok) throw new Error('não consegui carregar ' + u + ' (erro ' + r.status + ')'); return new Uint8Array(await r.arrayBuffer()); }
  async function gerarPdf(o){
    var L = await pdflib(), P = L.PDFLib, doc = await P.PDFDocument.create();
    doc.registerFontkit(L.fontkit);
    doc.setTitle($('plTitulo').value.trim() || 'Planilha'); doc.setCreator('SAGA ADV'); doc.setProducer('SAGA ADV (pdf-lib)');
    var F = { r: await doc.embedFont(await bytesUrl('vendor/fontes/LiberationSans-Regular.ttf'), { subset: true }), b: await doc.embedFont(await bytesUrl('vendor/fontes/LiberationSans-Bold.ttf'), { subset: true }),
      i: await doc.embedFont(await bytesUrl('vendor/fontes/LiberationSans-Italic.ttf'), { subset: true }) };
    var pgW, pgH, x0, topo, base, fundoDoc = null, cfg = null, nFundo = 0, larguraUtil;
    if(o.timbrado){
      cfg = o.timbrado.config || {}; var fu = cfg.fundo || {}, mg = fu.pgMar || { top: 1701, right: 1843, bottom: 2268, left: 1843 };
      fundoDoc = await P.PDFDocument.load(await window.SagaTimbrado.arquivo(_sb, o.timbrado.fundo_pdf)); nFundo = fundoDoc.getPageCount();
      var tam0 = fundoDoc.getPage(0).getSize(); pgW = tam0.width; pgH = tam0.height;
      x0 = mg.left / 20; topo = mg.top / 20 + (cfg.ajuste_topo || 0); base = pgH - mg.bottom / 20; larguraUtil = pgW - (mg.left + mg.right) / 20;
    } else {
      pgW = o.paisagem ? 842 : 595; pgH = o.paisagem ? 595 : 842; x0 = 34; topo = 58; base = pgH - 40; larguraUtil = pgW - 68;
    }
    var paginas = [];
    async function novaPagina(){
      var pg;
      if(fundoDoc){ var idx = paginas.length === 0 ? 0 : Math.min(1, nFundo - 1); var cp = await doc.copyPages(fundoDoc, [idx]); pg = doc.addPage(cp[0]); }
      else pg = doc.addPage([pgW, pgH]);
      paginas.push({ pg: pg });
      return pg;
    }
    var pg = null, y = topo;
    var todos = S.calc.tudo(), avisosPdf = [];
    for(var n = 0; n < o.abas.length; n++){
      var ai = o.abas[n], a = S.pasta.abas[ai], u = M.usada(a); if(!u.colunas || !u.linhas) continue;
      if(!pg || n > 0){ pg = await novaPagina(); y = topo; }
      /* larguras: todas as colunas cabem na largura da página */
      var cols = [], tot = 0; for(var c = 1; c <= u.colunas; c++){ var w = largura2(a, c) * 0.75; cols.push(w); tot += w; }
      var k = larguraUtil / tot, fs = Math.max(5, Math.min(9.5, 9.4 * k));
      if(9.4 * k < 5) avisosPdf.push('A aba "' + a.nome + '" é muito larga: as letras ficaram no tamanho mínimo (5).');
      cols = cols.map(function(w){ return w * k; });
      var xs = [x0]; cols.forEach(function(w, j){ xs.push(xs[j] + w); });
      var mm = (function(){ var me = {}, co = {}; (a.mesclas || []).forEach(function(m){ var p = m.split(':'), A = M.endereco(p[0]), B = M.endereco(p[1]); if(!A || !B) return; me[A.c + ',' + A.l] = { c2: B.c, l2: B.l }; for(var l = A.l; l <= B.l; l++) for(var cc = A.c; cc <= B.c; cc++) if(cc !== A.c || l !== A.l) co[cc + ',' + l] = 1; }); return { me: me, co: co }; })();
      if(o.nomeAba){ pg.drawText(a.nome, { x: x0, y: pgH - y - fs, size: fs + 1.5, font: F.b, color: P.rgb(0.12, 0.24, 0.43) }); y += fs * 2.2; }
      for(var l = 1; l <= u.linhas; l++){
        /* altura da linha (texto que não cabe quebra em linhas) */
        var linhasTxt = 1, itens = [];
        for(c = 1; c <= u.colunas; c++){
          if(mm.co[c + ',' + l]) continue;
          var r = M.ref(c, l), ce = a.celulas[r], v = ce ? todos[ai][r] : '';
          var me = mm.me[c + ',' + l], c2 = me ? me.c2 : c;
          var w2 = xs[c2] - xs[c - 1];
          var t = ce ? M.mostrar(v, ce) : '';
          var fonte = ce && (ce.b || ce.fundo === 'titulo' || ce.fundo === 'total') ? F.b : (ce && ce.i ? F.i : F.r);
          var num = typeof v === 'number' && !(ce && ce.al === 'esq');
          var cab = t;
          /* texto que passa da célula invade as vizinhas vazias (como no Excel); se não houver espaço, quebra */
          var lim = w2 - 4, txtW = t ? fonte.widthOfTextAtSize(t, fs) : 0, partes = [t];
          if(t && txtW > lim && !num){
            var ext = c2; while(!(ce && ce.q) && ext < u.colunas && !a.celulas[M.ref(ext + 1, l)] && !mm.co[(ext + 1) + ',' + l] && fonte.widthOfTextAtSize(t, fs) > xs[ext] - xs[c - 1] - 4) ext++;
            lim = xs[ext] - xs[c - 1] - 4;
            if(fonte.widthOfTextAtSize(t, fs) > lim){ partes = quebrar(t, fonte, fs, w2 - 4); linhasTxt = Math.max(linhasTxt, partes.length); lim = w2 - 4; }
          } else if(t && ce && ce.q){ partes = quebrar(t, fonte, fs, w2 - 4); linhasTxt = Math.max(linhasTxt, partes.length); }
          String(t).split('\n').length > 1 && (partes = [].concat.apply([], String(t).split('\n').map(function(p){ return quebrar(p, fonte, fs, w2 - 4); })), linhasTxt = Math.max(linhasTxt, partes.length));
          itens.push({ c: c, c2: c2, rs: me ? me.l2 - l + 1 : 1, ce: ce, v: v, partes: partes, fonte: fonte, num: num, w: w2 });
        }
        var hLin = Math.max(fs * 1.62, linhasTxt * fs * 1.22 + fs * 0.55);
        var vazia = !itens.some(function(it){ return it.ce && (it.partes[0] || it.ce.fundo); });
        if(vazia) hLin = fs * 0.9;
        if(y + hLin > base){ pg = await novaPagina(); y = topo; }
        itens.forEach(function(it){
          var x = xs[it.c - 1], ce = it.ce; if(!ce) return;
          var h = hLin * it.rs, Y = pgH - y - h;
          var cor = ce.fundo ? (FUNDO_PDF[ce.fundo] || (/^#[0-9a-f]{6}$/i.test(ce.fundo) ? hexRgb(ce.fundo) : null)) : null;
          if(cor) pg.drawRectangle({ x: x, y: Y, width: it.w, height: h, color: P.rgb(cor[0], cor[1], cor[2]) });
          if(a.bordas === 'marcadas' ? (ce.borda || cor) : (it.partes[0] || cor || ce.borda)) pg.drawRectangle({ x: x, y: Y, width: it.w, height: h, borderColor: P.rgb(0.79, 0.83, 0.88), borderWidth: 0.4 });
          var txtCor = M.ehErro(it.v) ? P.rgb(0.75, 0.1, 0.1) : (ce.fundo === 'titulo' ? P.rgb(1, 1, 1) : (ce.cinza ? P.rgb(0.4, 0.45, 0.52) : P.rgb(0.07, 0.1, 0.16)));
          it.partes.forEach(function(p, q){
            if(!p) return;
            var tw = it.fonte.widthOfTextAtSize(p, fs), al = ce.al || (it.num ? 'dir' : 'esq');
            var tx = al === 'dir' ? x + it.w - 2.2 - tw : al === 'centro' ? x + (it.w - tw) / 2 : x + 2.2;
            var ty = pgH - y - fs * 1.08 - q * fs * 1.22 - (it.partes.length === 1 ? (hLin - fs * 1.62) / 2 : 0);
            pg.drawText(p, { x: tx, y: ty, size: fs, font: it.fonte, color: txtCor });
          });
        });
        y += hLin;
      }
    }
    if(!paginas.length) throw new Error('as abas escolhidas estão vazias');
    /* fundo do timbrado por baixo de cada página e número da página */
    var T = paginas.length;
    if(fundoDoc){
      var pn = (cfg.fundo || {}).pagina_numero, nf = cfg.numero || {};
      if(pn) paginas.forEach(function(x, p){ var tam = nf.tamanho || 9, txt = pn.formato === 'N' ? String(p + 1) : (p + 1) + ' / ' + T, wn = F.r.widthOfTextAtSize(txt, tam);
        x.pg.drawText(txt, { x: pn.x_direita - wn, y: pgH - pn.base_caixa + 2, size: tam, font: F.r, color: P.rgb(0, 0, 0) }); });
    } else {
      var titulo = ($('plTitulo').value.trim() || 'Planilha'), quem = [S.ctx.pessoa && S.ctx.pessoa.nome_completo, S.ctx.processo && (S.ctx.processo.numero_processo_cnj ? fmtCnj(S.ctx.processo.numero_processo_cnj) : S.ctx.processo.codigo)].filter(Boolean).join(' · ');
      paginas.forEach(function(x, i){
        x.pg.drawText(titulo, { x: 34, y: pgH - 34, size: 12, font: F.b, color: P.rgb(0.07, 0.14, 0.23) });
        if(quem) x.pg.drawText(quem, { x: 34, y: pgH - 47, size: 8, font: F.r, color: P.rgb(0.37, 0.44, 0.53) });
        x.pg.drawLine({ start: { x: 34, y: pgH - 51 }, end: { x: pgW - 34, y: pgH - 51 }, thickness: 1, color: P.rgb(0.12, 0.24, 0.43) });
        var rod = 'Página ' + (i + 1) + ' de ' + T, wr = F.r.widthOfTextAtSize(rod, 7);
        x.pg.drawText(rod, { x: pgW - 34 - wr, y: 22, size: 7, font: F.r, color: P.rgb(0.55, 0.6, 0.66) });
        x.pg.drawText('SAGA ADV · ' + new Date().toLocaleDateString('pt-BR'), { x: 34, y: 22, size: 7, font: F.r, color: P.rgb(0.55, 0.6, 0.66) });
      });
    }
    return { bytes: await doc.save(), paginas: T, avisos: avisosPdf };
  }
  function quebrar(t, f, fs, w){
    var palavras = String(t).split(/\s+/), linhas = [], atual = '';
    palavras.forEach(function(p){ var tenta = atual ? atual + ' ' + p : p; if(f.widthOfTextAtSize(tenta, fs) <= w || !atual) atual = tenta; else { linhas.push(atual); atual = p; } });
    if(atual) linhas.push(atual);
    return linhas.length ? linhas : [''];
  }
  async function janelaPdf(guardar){
    var timbrados = [];
    try{ if(window.SagaTimbrado) timbrados = await window.SagaTimbrado.listar(_sb); }catch(e){ timbrados = []; S.erroTimbrado = msgErro(e); }
    timbrados = (timbrados || []).filter(function(t){ return t.fundo_pdf; });
    var ehAncref = function(t){ return /ancref/i.test((t.nome || '') + ' ' + (t.chave || '')); };
    timbrados.sort(function(a, b){ return (ehAncref(a) ? 1 : 0) - (ehAncref(b) ? 1 : 0); });
    var opTimb = timbrados.map(function(t, i){ return '<option value="' + i + '">' + esc(t.nome || 'Timbrado') + (ehAncref(t) ? ' (só quando o Dr. Victor pedir)' : '') + '</option>'; }).join('');
    var corpo = (guardar ? '<label class="rot">O que guardar</label><div class="pills" id="jpTipo"><button class="pill active" type="button" data-v="pdf">PDF</button><button class="pill" type="button" data-v="xlsx">Excel (.xlsx)</button></div>' : '')
      + '<div id="jpPdfOps"><label class="rot">Papel</label><div class="pills" id="jpPapel"><button class="pill active" type="button" data-v="timbrado"' + (timbrados.length ? '' : ' disabled') + '>No papel timbrado (para juntar nos autos)</button><button class="pill" type="button" data-v="simples">Simples, deitado</button></div>'
      + (timbrados.length ? '<select class="campo" id="jpTimbrado" style="margin-top:6px">' + opTimb + '</select>' : '<div class="dica">' + (S.erroTimbrado ? 'Não consegui ler os papéis timbrados: ' + esc(S.erroTimbrado) + '.' : 'Nenhum papel timbrado com o fundo em PDF guardado (Modelos > Petições e timbrados).') + '</div>')
      + '<label class="rot" style="margin-top:6px">Abas</label><div class="marcar-abas" id="jpAbas">' + S.pasta.abas.map(function(a, i){ return '<label><input type="checkbox" value="' + i + '"' + (a.imprimir === false ? '' : ' checked') + '> ' + esc(a.nome) + '</label>'; }).join('') + '</div>'
      + '<label style="display:flex;gap:8px;align-items:center;font-size:12.5px"><input type="checkbox" id="jpNomeAba"> Escrever o nome da aba em cima de cada uma</label>'
      + '<div class="dica">Todas as colunas usadas entram na largura da página (as letras diminuem se a tabela for larga). Uma aba por página.</div></div>'
      + (guardar ? '<label class="rot">Pasta do cliente</label><select class="campo" id="jpPasta"><option value="">Carregando as pastas…</option></select><label class="rot">Nome do arquivo</label><input class="campo" id="jpNome">' : '')
      + '<div class="erro-campo" id="jpErro"></div>';
    janela('jPdf', guardar ? 'Guardar na pasta do cliente' : 'Gerar PDF', guardar ? 'O arquivo vai para a pasta escolhida da ficha (como os outros documentos).' : 'O PDF é montado neste computador.', corpo,
      '<button class="btn" type="button" data-fechar>Cancelar</button><button class="btn btn-ouro" type="button" id="jpOk">' + (guardar ? 'Guardar' : 'Gerar e baixar') + '</button>', 560);
    var tipo = 'pdf', papel = timbrados.length ? 'timbrado' : 'simples';
    if(!timbrados.length){ $('jpPapel').querySelectorAll('.pill').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-v') === 'simples'); }); }
    function pills(id, fn){ var g = $(id); if(!g) return; g.querySelectorAll('.pill').forEach(function(b){ b.onclick = function(){ if(b.disabled) return; g.querySelectorAll('.pill').forEach(function(x){ x.classList.toggle('active', x === b); }); fn(b.getAttribute('data-v')); }; }); }
    pills('jpPapel', function(v){ papel = v; if($('jpTimbrado')) $('jpTimbrado').hidden = v !== 'timbrado'; });
    pills('jpTipo', function(v){ tipo = v; $('jpPdfOps').hidden = v !== 'pdf'; if($('jpNome')) $('jpNome').value = $('jpNome').value.replace(/\.(pdf|xlsx)$/i, '') + '.' + v; });
    if(guardar){
      $('jpNome').value = nomeArquivo('pdf');
      carregarPastas().then(function(ps){ $('jpPasta').innerHTML = '<option value="">Documentos (sem pasta)</option>' + ps.map(function(x){ return '<option value="' + esc(x.id) + '"' + (x.id === (S.doc && S.doc.pasta_id) ? ' selected' : '') + '>' + esc(x.nome) + '</option>'; }).join(''); })
        .catch(function(e){ $('jpErro').textContent = 'Não consegui ler as pastas do cliente: ' + msgErro(e) + '.'; });
    }
    $('jpOk').onclick = async function(){
      var b = $('jpOk'); $('jpErro').textContent = '';
      var abas = Array.prototype.slice.call($('jpAbas').querySelectorAll('input:checked')).map(function(i){ return +i.value; });
      if(tipo === 'pdf' && !abas.length){ $('jpErro').textContent = 'Marque pelo menos uma aba.'; return; }
      var t = papel === 'timbrado' && $('jpTimbrado') ? timbrados[+$('jpTimbrado').value] : null;
      if(t && ehAncref(t) && !confirm('O papel da ANCREF só vale quando o Dr. Victor pede. Usar mesmo assim?')) return;
      var nErros = 0, todos = S.calc.tudo(); abas.forEach(function(i){ Object.keys(todos[i]).forEach(function(r){ if(M.ehErro(todos[i][r])) nErros++; }); });
      if(tipo === 'pdf' && nErros && !confirm('As abas escolhidas têm ' + nErros + ' célula(s) com erro na conta (aparecem em vermelho no PDF). Gerar mesmo assim?')) return;
      b.disabled = true; b.textContent = 'Montando…';
      try{
        var bytes, nome, mime;
        if(tipo === 'xlsx'){ bytes = await montarXlsx(); mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; }
        else { var r = await gerarPdf({ abas: abas, timbrado: t, paisagem: papel === 'simples', nomeAba: $('jpNomeAba').checked }); bytes = r.bytes; mime = 'application/pdf'; if(r.avisos.length) toast(r.avisos.join(' '), ''); }
        if(guardar){
          nome = ($('jpNome').value.trim() || nomeArquivo(tipo)).replace(/[\\/:*?"<>|]+/g, '-'); if(!new RegExp('\\.' + tipo + '$', 'i').test(nome)) nome += '.' + tipo;
          await guardarNaPasta(bytes, nome, mime, $('jpPasta').value || null, tipo);
          fecharJanela('jPdf'); toast('"' + nome + '" guardado na pasta do cliente.', 'success');
        } else { baixarBytes(bytes, nomeArquivo('pdf'), mime); fecharJanela('jPdf'); toast('PDF gerado (' + (tipo === 'pdf' ? '' : '') + 'baixado).', 'success'); }
      }catch(e){ $('jpErro').textContent = (guardar ? 'Não guardei. ' : 'Não gerei o PDF. ') + 'Motivo: ' + msgErro(e) + '.'; }
      finally{ b.disabled = false; b.textContent = guardar ? 'Guardar' : 'Gerar e baixar'; }
    };
  }
  async function carregarPastas(){
    if(!S.ctx.pessoa) return [];
    var r = await _sb.from('pastas_cliente').select('id,nome,pai_id').eq('pessoa_id', S.ctx.pessoa.id).eq('ativo', true);
    if(r.error) throw r.error;
    var mapa = {}; (r.data || []).forEach(function(x){ mapa[x.id] = x; });
    function cam(x){ var n = [], k = 0; while(x && k < 10){ n.unshift(x.nome); x = mapa[x.pai_id]; k++; } return n.join(' / '); }
    return (r.data || []).map(function(x){ return { id: x.id, nome: cam(x) }; }).sort(function(a, b){ return a.nome.localeCompare(b.nome, 'pt-BR'); });
  }
  async function guardarNaPasta(bytes, nome, mime, pastaId, tipo){
    var d = S.doc || {};
    if(!d.processo_id) throw new Error('esta planilha não está ligada a um processo; abra-a pela ficha do processo para guardar na pasta');
    var s = await _sb.auth.getSession(), uid = s.data && s.data.session && s.data.session.user && s.data.session.user.id;
    if(!uid) throw new Error('sua sessão expirou; entre de novo no SAGA');
    var us = await _sb.from('usuarios').select('id').eq('auth_user_id', uid).maybeSingle();
    if(us.error || !us.data) throw new Error('não achei o seu cadastro de usuário');
    var caminho = d.processo_id + '/' + crypto.randomUUID() + '_' + nome.replace(/[^a-zA-Z0-9._-]/g, '_');
    var up = await _sb.storage.from(BUCKET).upload(caminho, new Blob([bytes], { type: mime }), { contentType: mime });
    if(up.error) throw up.error;
    var ins = await _sb.from('documentos').insert({ processo_id: d.processo_id, pessoa_id: S.ctx.pessoa ? S.ctx.pessoa.id : d.pessoa_id, usuario_id: us.data.id, nome_arquivo: nome, caminho_storage: caminho,
      tipo_documento: tipo === 'pdf' ? 'pdf' : 'planilha', tamanho_bytes: bytes.length, pasta_id: pastaId, visivel_portal_cliente: false, excluido_logico: false }).select('id').single();
    if(ins.error){ var rm = await _sb.storage.from(BUCKET).remove([caminho]); throw new Error(((window.sagaErroBanco?window.sagaErroBanco(ins.error):ins.error.message) || 'o registro do documento foi recusado') + (rm.error ? ' (e o arquivo enviado ficou solto: avise o administrador)' : '')); }
    return ins.data.id;
  }

  /* ================= abrir ================= */
  async function contexto(processoId, pessoaId){
    if(processoId){
      var p = await _sb.from('processos').select('id,codigo,numero_processo_cnj,pessoa_id').eq('id', processoId).maybeSingle();
      if(p.error) throw p.error; if(!p.data) throw new Error('processo não encontrado (ou sem permissão para ver)');
      S.ctx.processo = p.data; pessoaId = pessoaId || p.data.pessoa_id;
    }
    if(pessoaId){ var q = await _sb.from('pessoas').select('id,nome_completo,codigo').eq('id', pessoaId).maybeSingle(); if(!q.error && q.data) S.ctx.pessoa = q.data; }
  }
  async function iniciar(){
    montar();
    if(window.SagaUI && SagaUI.carregar) await SagaUI.carregar('editor_planilha');
    try{ var pr = await _sb.rpc('minhas_permissoes'); S.perms = (pr && pr.data) || []; }catch(e){ S.perms = []; }
    S.pode = { criar: S.perms.indexOf('documentos.criar') >= 0, ver: S.perms.indexOf('documentos.visualizar') >= 0 };
    var q = new URLSearchParams(location.search), docId = q.get('doc');
    S.avisosTela = [];
    try{
      if(docId){
        var r = await _sb.from('documentos_editaveis').select('*').eq('id', docId).maybeSingle();
        if(r.error) throw r.error;
        if(!r.data) throw new Error('planilha não encontrada (ou você não tem permissão para ver documentos dos clientes)');
        if(r.data.tipo !== 'planilha') throw new Error('este documento não é uma planilha');
        S.doc = r.data; S.pasta = r.data.conteudo && r.data.conteudo.abas ? r.data.conteudo : M.pastaNova();
        if(!r.data.ativo) S.avisosTela.push({ tipo: 'atencao', titulo: 'Esta planilha foi tirada da lista pelo administrador.', texto: 'Você está vendo a última versão guardada.' });
        await contexto(r.data.processo_id, r.data.pessoa_id);
        if(r.data.modelo && window.SagaCalculosPlanilhas && SagaCalculosPlanilhas.conferirAtualizacao){ try{ await SagaCalculosPlanilhas.conferirAtualizacao(S, { sb: _sb, aplicar: aplicarModelo }); }catch(e){} }
      } else {
        var proc = q.get('processo'), pes = q.get('pessoa'), modelo = q.get('modelo');
        await contexto(proc, pes);
        S.doc = { processo_id: proc || null, pessoa_id: (S.ctx.pessoa && S.ctx.pessoa.id) || pes || null, pasta_id: q.get('pasta') || null, versao: 0 };
        if(modelo){
          if(!window.SagaCalculosPlanilhas) throw new Error('os modelos de cálculo não carregaram');
          var ex = await _sb.from('documentos_editaveis').select('id').eq('processo_id', proc).eq('modelo', modelo).eq('ativo', true).order('atualizado_em', { ascending: false }).limit(1);
          if(!ex.error && ex.data && ex.data.length){ location.replace('editor_planilha.html?doc=' + ex.data[0].id + '&v=' + (q.get('v') || '')); return; }
          var mo = await SagaCalculosPlanilhas.montar({ sb: _sb, processoId: proc, modelo: modelo });
          S.pasta = mo.pasta; S.doc.modelo = modelo; S.doc.calculo_id = mo.calculo_id || null; S.doc.titulo = mo.titulo; S.pendente = false; /* montada agora: 'Ainda não salvo' (nada foi mudado à mão) */
          (mo.avisosTela || []).forEach(function(a){ S.avisosTela.push(a); });
        } else S.pasta = M.pastaNova();
        S.doc.titulo = S.doc.titulo || 'Planilha';
        if(!S.ctx.pessoa) S.avisosTela.push({ tipo: 'atencao', titulo: 'Planilha sem cliente.', texto: 'Abra pela ficha do cliente (Pastas do cliente > + Planilha) para poder salvar e guardar na pasta.' });
      }
      $('plTitulo').value = (S.doc && S.doc.titulo) || 'Planilha';
      document.title = 'VMMADV | ' + $('plTitulo').value;
      S.ativa = Math.min(S.pasta.ativa || 0, S.pasta.abas.length - 1);
      S.sel = { c1: 1, l1: 1, c2: 1, l2: 1 };
      if(!S.pode.criar) S.avisosTela.push({ tipo: 'atencao', titulo: 'Só leitura.', texto: 'Seu perfil não tem a permissão de criar documentos dos clientes: dá para ver, baixar em PDF e em Excel, mas não salvar.' });
      redesenhar(); estadoSalvo();
      $('plCaixa').focus({ preventScroll: true });
    }catch(e){
      $('plRaiz').innerHTML = '<div class="aviso erro" style="margin-top:18px"><div><b>Não consegui abrir a planilha.</b>Motivo: ' + esc(msgErro(e)) + '. Atualize a página (F5) ou volte à ficha.</div></div>';
    }
  }
  /* troca o conteúdo pelo do modelo (ex.: cálculo mais novo) sem perder o histórico */
  function aplicarModelo(pasta, calculoId){ guardarDesfazer(); S.pasta = pasta; S.ativa = 0; if(calculoId) S.doc.calculo_id = calculoId; S.sel = { c1: 1, l1: 1, c2: 1, l2: 1 }; mudou(); }

  window.SagaPlanilhas = { estado: S, gerarPdf: gerarPdf, montarXlsx: montarXlsx, importarXlsx: importarXlsx, redesenhar: redesenhar, desenharAvisos: desenharAvisos, aplicarModelo: aplicarModelo };
  iniciar().catch(function(e){ var r = $('plRaiz'); if(r) r.innerHTML = '<div class="aviso erro"><div><b>A tela da planilha não abriu direito.</b>Motivo: ' + esc(msgErro(e)) + '. Atualize a página (F5).</div></div>'; });
})();
