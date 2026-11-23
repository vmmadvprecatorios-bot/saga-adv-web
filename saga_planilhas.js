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

  /* ================= montagem da tela (23/11, Dr. Victor: "quero funcionalidades de planilha e poder VOLTAR") =================
     Tela inteira: Voltar sempre à vista (volta para onde veio: lista de Planilhas em Modelos ou a ficha), barra de fórmulas
     com a caixa de nome, letras e números fixos, congelar, arrastar para preencher, ordenar, filtrar, zoom e atalhos.
     A grade DESENHA SÓ O QUE APARECE (camadas com as células visíveis; o resto é espaço vazio): 2.000 linhas ficam leves. */
  var CORES = [
    { k: '', r: 'Sem cor', c: 'transparent' }, { k: 'titulo', r: 'Título', c: 'color-mix(in srgb,var(--gold) 45%,var(--panel-solid))' },
    { k: 'secao', r: 'Seção', c: 'color-mix(in srgb,var(--gold) 20%,var(--panel-solid))' }, { k: 'entrada', r: 'Dado a preencher (não sai no PDF)', c: 'color-mix(in srgb,#eab308 30%,var(--panel-solid))' },
    { k: 'total', r: 'Total', c: 'color-mix(in srgb,var(--gold) 30%,var(--panel-solid))' }, { k: 'ok', r: 'Conferido', c: 'color-mix(in srgb,#16a34a 30%,var(--panel-solid))' },
    { k: 'aviso', r: 'Atenção', c: 'color-mix(in srgb,#e5484d 28%,var(--panel-solid))' }
  ];
  /* cores de letra que se leem no claro e no escuro */
  var CORES_TXT = [ { k: '', r: 'Automática' }, { k: '#d64545', r: 'Vermelho' }, { k: '#d97706', r: 'Laranja' }, { k: '#16a34a', r: 'Verde' }, { k: '#2f6fd6', r: 'Azul' }, { k: '#7c3aed', r: 'Roxo' }, { k: '#6b7280', r: 'Cinza' } ];
  var ZOOMS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200];
  var HW = 46, HH = 24;
  function ico(p){ return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    voltar: ico('<path d="M15 18l-6-6 6-6"/>'), desfazer: ico('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'), refazer: ico('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>'),
    esq: ico('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'), centro: ico('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'), dir: ico('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
    quebra: ico('<path d="M4 6h16M4 12h13a3 3 0 010 6h-4"/><path d="M15 16l-2 2 2 2"/><path d="M4 18h5"/>'), soma: ico('<path d="M17 5H7l6 7-6 7h10"/>'),
    ordenar: ico('<path d="M7 4v16M4 17l3 3 3-3"/><path d="M14 6h6M14 12h4M14 18h2"/>'), filtro: ico('<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>'),
    congelar: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/>'), bordas: ico('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16" stroke-dasharray="2 2"/>'),
    mesclar: ico('<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M8 12h8M10 10l-2 2 2 2M14 10l2 2-2 2"/>'), nota: ico('<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4"/>'),
    linhas: ico('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h16M12 8v8"/>'), mais: ico('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
    letra: '<span class="pl-letra">A<i id="fCorTxtBarra"></i></span>', balde: ico('<path d="M6 11l6-6 7 7-6 6a2 2 0 01-2.8 0L6 13.8A2 2 0 016 11z"/><path d="M19 15s2 2.2 2 3.5a2 2 0 01-4 0c0-1.3 2-3.5 2-3.5z"/>')
  };
  function montar(){
    var r = $('plRaiz');
    r.innerHTML =
      '<div class="pl-topo">'
      + '<button class="btn pl-voltar" id="plVoltar" type="button" title="Voltar para onde você estava (Alt+←)">' + IC.voltar + '<span>Voltar</span></button>'
      + '<div class="pl-nome"><input id="plTitulo" aria-label="Nome da planilha" maxlength="200"><div class="pl-info" id="plInfo"></div></div>'
      + '<div class="pl-acoes">'
      + '<button class="btn btn-ouro" id="plSalvar" type="button" title="Salvar (Ctrl+S): cada vez cria uma versão nova">Salvar</button>'
      + '<button class="btn some-cel" id="plVersoes" type="button">Versões</button>'
      + '<button class="btn some-cel" id="plPdf" type="button">PDF</button>'
      + '<button class="btn some-cel" id="plXlsx" type="button">Excel</button>'
      + '<button class="btn some-cel" id="plGuardar" type="button" title="Guardar o PDF ou o Excel na pasta do cliente">Guardar na pasta</button>'
      + '<button class="btn ic" id="plMais" type="button" title="Mais: importar Excel, salvar como modelo…" aria-label="Mais ações">' + IC.mais + '</button>'
      + '<input type="file" id="plImportar" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>'
      + '</div></div>'
      + '<div id="plAvisos"></div>'
      + '<div class="pl-ferr" role="toolbar" aria-label="Formatar e organizar">'
      + '<button class="btn ic" id="fDesfazer" type="button" title="Desfazer (Ctrl+Z)">' + IC.desfazer + '</button><button class="btn ic" id="fRefazer" type="button" title="Refazer (Ctrl+Y)">' + IC.refazer + '</button><span class="sep"></span>'
      + '<button class="btn ic" id="fReais" type="button" title="Formato em reais (R$)">R$</button><button class="btn ic" id="fPct" type="button" title="Formato em porcentagem">%</button>'
      + '<select id="fFormato" title="Formato do número"><option value="">Automático</option><option value="reais">R$</option><option value="pct">%</option><option value="num">Número</option><option value="int">Inteiro</option><option value="data">Data</option><option value="texto">Texto</option></select>'
      + '<button class="btn ic" id="fMenos" type="button" title="Menos casas decimais">,0</button><button class="btn ic" id="fMais" type="button" title="Mais casas decimais">,00</button><span class="sep"></span>'
      + '<button class="btn ic" id="fB" type="button" title="Negrito (Ctrl+B)"><b>N</b></button><button class="btn ic" id="fI" type="button" title="Itálico (Ctrl+I)"><i>I</i></button>'
      + '<button class="btn ic" id="fCorTxt" type="button" title="Cor da letra">' + IC.letra + '</button>'
      + '<button class="btn ic" id="fFundo" type="button" title="Cor do fundo">' + IC.balde + '</button>'
      + '<button class="btn ic" id="fBordas" type="button" title="Bordas">' + IC.bordas + '</button>'
      + '<button class="btn ic" id="fMesclar" type="button" title="Mesclar as células marcadas (ou desfazer)">' + IC.mesclar + '</button><span class="sep"></span>'
      + '<button class="btn ic" id="fEsq" type="button" title="Alinhar à esquerda">' + IC.esq + '</button><button class="btn ic" id="fCentro" type="button" title="Centralizar">' + IC.centro + '</button><button class="btn ic" id="fDir" type="button" title="Alinhar à direita">' + IC.dir + '</button>'
      + '<button class="btn ic" id="fQuebra" type="button" title="Quebrar o texto em linhas">' + IC.quebra + '</button><span class="sep"></span>'
      + '<button class="btn" id="fSoma" type="button" title="Autossoma (Alt+=): soma os números de cima (ou da esquerda)">' + IC.soma + '<span>Soma</span></button>'
      + '<button class="btn" id="fOrdenar" type="button" title="Ordenar as linhas">' + IC.ordenar + '<span>Ordenar</span></button>'
      + '<button class="btn" id="fFiltro" type="button" title="Filtrar as linhas pelo valor de uma coluna">' + IC.filtro + '<span>Filtro</span></button>'
      + '<button class="btn" id="fCongelar" type="button" title="Deixar linhas e colunas paradas ao rolar">' + IC.congelar + '<span>Congelar</span></button><span class="sep"></span>'
      + '<button class="btn" id="fLinhas" type="button" title="Inserir ou excluir linhas e colunas">' + IC.linhas + '<span>Linhas e colunas</span></button>'
      + '<button class="btn ic" id="fNota" type="button" title="Nota ou aviso na célula">' + IC.nota + '</button>'
      + '</div>'
      + '<div class="pl-barra"><input class="end" id="plEnd" aria-label="Célula (digite, ex.: B12 ou A1:C5, e Enter para ir)" title="Digite a célula (ex.: B12 ou A1:C5) e Enter para ir" spellcheck="false" autocomplete="off"><div class="fx">fx</div><input id="plFx" autocomplete="off" spellcheck="false" aria-label="Conteúdo ou fórmula da célula"></div>'
      + '<div class="pl-grade-caixa" id="plCaixa" tabindex="0" role="grid" aria-label="Planilha"><div class="pl-vista" id="plVista"></div><div class="pl-espaco" id="plEspaco"></div></div>'
      + '<div class="pl-pe"><div class="pl-abas" id="plAbas"></div>'
      + '<div class="pl-status"><span id="plSoma"></span><span id="plFiltroInfo"></span>'
      + '<label class="pl-zoom" title="Zoom (Ctrl + roda do mouse)">' + '<button type="button" class="btn ic" id="zMenos" aria-label="Diminuir o zoom">−</button><select id="plZoom" aria-label="Zoom">' + ZOOMS.map(function(z){ return '<option value="' + z + '">' + z + '%</option>'; }).join('') + '</select><button type="button" class="btn ic" id="zMais" aria-label="Aumentar o zoom">+</button></label></div></div>';
    montarVista();
    ligarTela();
  }

  /* ================= geometria (larguras, alturas, linhas escondidas pelo filtro, congelados) ================= */
  var G = null;
  function z(){ return (S.zoom || 100) / 100; }
  function largura(c){ var w = (aba().colunas || {})[M.colTxt(c)]; return w || LARG; }
  function altura(l){ var h = (aba().linhas || {})[l]; return h || ALT; }
  function congel(){ var cg = aba().congelar || {}; return { l: Math.max(0, cg.l | 0), c: Math.max(0, cg.c | 0) }; }
  function geo(){
    var a = aba(), u = M.usada(a), k = z(), cg = congel(), esc0 = escondidas();
    var nc = Math.max(u.colunas + 8, 26, S.minC || 0, cg.c + 6), nl = Math.max(u.linhas + 60, 200, S.minL || 0, cg.l + 30);
    var cx = [0], ly = [0];
    for(var c = 1; c <= nc; c++) cx[c] = cx[c - 1] + Math.max(4, Math.round(largura(c) * k));
    for(var l = 1; l <= nl; l++) ly[l] = ly[l - 1] + (esc0[l] ? 0 : Math.max(6, Math.round(altura(l) * k)));
    var fc = Math.min(cg.c, nc), fl = Math.min(cg.l, nl);
    G = { nc: nc, nl: nl, cx: cx, ly: ly, fc: fc, fl: fl, fw: cx[fc], fh: ly[fl], hw: Math.round(HW * Math.max(.8, Math.min(k, 1.3))), hh: Math.round(HH * Math.max(.85, Math.min(k, 1.3))) };
    var esp = $('plEspaco'); if(esp){ esp.style.width = (G.hw + cx[nc]) + 'px'; esp.style.height = (G.hh + ly[nl]) + 'px'; }
    S.vista.chave = '';
    return G;
  }
  /* procura a coluna/linha que contém a posição x (busca binária no acumulado) */
  function achar(arr, n, x){ var lo = 1, hi = n; if(x < 0) return 1; while(lo < hi){ var m = (lo + hi) >> 1; if(arr[m] <= x) lo = m + 1; else hi = m; } return lo; }

  /* ================= filtro (só nesta tela; não muda o que vai para o PDF/Excel) ================= */
  function filtroAtual(){ return (S.filtros || {})[S.ativa] || null; }
  function escondidas(){
    var f = filtroAtual(), out = {};
    if(!f) return out;
    var a = aba(), calc = S.calc;
    Object.keys(f.ex).forEach(function(c){
      var ex = f.ex[c]; if(!ex || !Object.keys(ex).length) return;
      for(var l = f.l + 1; l <= f.l2; l++){ var r = M.ref(+c, l), ce = a.celulas[r], t = ce ? M.mostrar(calc.valor(S.ativa, r), ce) : ''; if(ex[t]) out[l] = 1; }
    });
    return out;
  }

  /* ================= desenho: só as células que aparecem ================= */
  function montarVista(){
    var v = $('plVista');
    v.innerHTML =
        '<div class="pl-clip" id="vCorpo"><div class="pl-in"></div></div>'
      + '<div class="pl-clip" id="vTopo"><div class="pl-in"></div></div>'
      + '<div class="pl-clip" id="vEsq"><div class="pl-in"></div></div>'
      + '<div class="pl-clip" id="vCanto"><div class="pl-in"></div></div>'
      + '<div class="pl-clip pl-hc" id="hColF"><div class="pl-in"></div></div><div class="pl-clip pl-hc" id="hColS"><div class="pl-in"></div></div>'
      + '<div class="pl-clip pl-hl" id="hLinF"><div class="pl-in"></div></div><div class="pl-clip pl-hl" id="hLinS"><div class="pl-in"></div></div>'
      + '<div class="pl-cantinho" id="hTudo" title="Marcar tudo (Ctrl+A)"></div>'
      + '<div class="pl-linha-cong pl-lc-h" id="lcH"></div><div class="pl-linha-cong pl-lc-v" id="lcV"></div>';
    S.vista = { chave: '', camadas: {} };
    ['vCorpo', 'vTopo', 'vEsq', 'vCanto', 'hColF', 'hColS', 'hLinF', 'hLinS'].forEach(function(id){ S.vista.camadas[id] = $(id).firstChild; });
  }
  function medidas(){
    var cx = $('plCaixa'), w = cx.clientWidth, h = cx.clientHeight;
    var v = $('plVista'); v.style.width = w + 'px'; v.style.height = h + 'px';
    $('plEspaco').style.marginTop = (-h) + 'px';
    return { w: w, h: h };
  }
  function janelaVisivel(){
    var cx = $('plCaixa'), sl = cx.scrollLeft, st = cx.scrollTop, m = S.med || medidas();
    var bw = m.w - G.hw - G.fw, bh = m.h - G.hh - G.fh;
    var c0 = Math.max(G.fc + 1, achar(G.cx, G.nc, G.fw + sl) - 2), c1 = Math.min(G.nc, achar(G.cx, G.nc, G.fw + sl + bw) + 2);
    var l0 = Math.max(G.fl + 1, achar(G.ly, G.nl, G.fh + st) - 6), l1 = Math.min(G.nl, achar(G.ly, G.nl, G.fh + st + bh) + 6);
    return { c0: c0, c1: c1, l0: l0, l1: l1, sl: sl, st: st, bw: bw, bh: bh };
  }
  function mapaMesclas(){
    var mestre = {}, coberto = {}, lista = [];
    (aba().mesclas || []).forEach(function(m){
      var p = m.split(':'), a = M.endereco(p[0]), b = M.endereco(p[1]); if(!a || !b) return;
      mestre[a.c + ',' + a.l] = { c2: b.c, l2: b.l }; lista.push({ c1: a.c, l1: a.l, c2: b.c, l2: b.l });
      for(var l = a.l; l <= b.l; l++) for(var c = a.c; c <= b.c; c++) if(c !== a.c || l !== a.l) coberto[c + ',' + l] = m;
    });
    return { mestre: mestre, coberto: coberto, lista: lista };
  }
  function classes(c, v){
    var k = [];
    if(!c) return '';
    if(c.b) k.push('b'); if(c.i) k.push('i');
    if(c.al) k.push('al-' + c.al); else if(typeof v === 'number') k.push('n');
    if(c.q) k.push('quebra');
    if(c.fundo && /^[a-z]+$/.test(c.fundo)) k.push('f-' + c.fundo);
    if(c.cinza) k.push('f-cinza');
    if(c.borda) k.push('bd');
    if(M.ehErro(v)) k.push('erro');
    return k.join(' ');
  }
  /* html das células de um retângulo (c0..c1, l0..l1), em coordenadas da planilha */
  function htmlCelulas(c0, c1, l0, l1, mm){
    var a = aba(), h = [], f = filtroAtual();
    function vazioAte(c, l, lim){ var x = c; while(x < lim){ var r2 = M.ref(x + 1, l), o = a.celulas[r2]; if(mm.coberto[(x + 1) + ',' + l] || mm.mestre[(x + 1) + ',' + l] || (o && ((o.v !== undefined && o.v !== '') || o.f))) break; x++; } return x; }
    for(var l = l0; l <= l1; l++){
      var hl = G.ly[l] - G.ly[l - 1]; if(!hl) continue;
      for(var c = c0; c <= c1; c++){
        var chave = c + ',' + l; if(mm.coberto[chave]) continue;
        var r = M.ref(c, l), ce = a.celulas[r], x = G.cx[c - 1], y = G.ly[l - 1], w = G.cx[c] - x, hh = hl;
        var me = mm.mestre[chave]; if(me){ w = G.cx[Math.min(me.c2, G.nc)] - x; hh = G.ly[Math.min(me.l2, G.nl)] - y; }
        if(!ce){ h.push('<div class="c" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + hh + 'px"></div>'); continue; }
        var v = S.calc.valor(S.ativa, r), t = M.mostrar(v, ce), cls = classes(ce, v), st = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + hh + 'px';
        if(ce.fundo && /^#[0-9a-f]{6}$/i.test(ce.fundo)) st += ';background:' + ce.fundo + '33';
        if(ce.cor && /^#[0-9a-f]{6}$/i.test(ce.cor)) st += ';color:' + ce.cor;
        /* texto que passa da célula entra nas vizinhas vazias (como no Excel) */
        if(t && !me && !ce.q && typeof v !== 'number' && !M.ehErro(v) && (!ce.al || ce.al === 'esq')){
          var prec = larguraTexto(t, ce) + 10;
          if(prec > w){ var ate = vazioAte(c, l, Math.min(G.nc, c + 12)), ac = c; while(ac < ate && G.cx[ac] - x < prec) ac++;
            if(ac > c){ var wl = G.cx[ac] - x; st = st.replace('width:' + w + 'px', 'width:' + wl + 'px'); cls += ' ov'; } }
        }
        var tit = M.ehErro(v) ? v.e + ': ' + (M.ERROS[v.e] || '') : (ce.nota || '');
        h.push('<div class="c ' + cls + '" style="' + st + '"' + (tit ? ' title="' + esc(tit) + '"' : '') + '>' + esc(t)
          + (ce.nota ? '<span class="nota' + (ce.conferir ? ' conferir' : '') + '"></span>' : '') + '</div>');
      }
      if(f && l === f.l) for(var fc0 = Math.max(c0, f.c1); fc0 <= Math.min(c1, f.c2); fc0++){
        var ativo = f.ex[fc0] && Object.keys(f.ex[fc0]).length;
        h.push('<button type="button" class="pl-fbtn' + (ativo ? ' on' : '') + '" data-fc="' + fc0 + '" style="left:' + (G.cx[fc0] - 19) + 'px;top:' + (G.ly[l - 1] + Math.max(1, (hl - 17) / 2)) + 'px" title="Filtrar esta coluna" aria-label="Filtrar a coluna ' + M.colTxt(fc0) + '">▾</button>');
      }
    }
    /* mesclas que começam fora da janela mas aparecem dentro */
    mm.lista.forEach(function(q){
      if(q.c1 >= c0 && q.l1 >= l0) return;
      if(q.c2 < c0 || q.c1 > c1 || q.l2 < l0 || q.l1 > l1) return;
      if(q.c1 >= c0 && q.c1 <= c1 && q.l1 >= l0 && q.l1 <= l1) return;
      var r = M.ref(q.c1, q.l1), ce = a.celulas[r], v = ce ? S.calc.valor(S.ativa, r) : '', x = G.cx[q.c1 - 1], y = G.ly[q.l1 - 1];
      h.push('<div class="c ' + classes(ce, v) + '" style="left:' + x + 'px;top:' + y + 'px;width:' + (G.cx[q.c2] - x) + 'px;height:' + (G.ly[q.l2] - y) + 'px">' + esc(ce ? M.mostrar(v, ce) : '') + '</div>');
    });
    return h.join('');
  }
  var _mt = null, _mtCache = {};
  function larguraTexto(t, ce){
    var k = (ce && ce.b ? 'b' : 'r') + t; if(_mtCache[k] != null) return _mtCache[k] * z();
    _mt = _mt || document.createElement('canvas').getContext('2d');
    _mt.font = (ce && ce.b ? '700 ' : '400 ') + '12.5px Montserrat, Arial, sans-serif';
    var w = _mt.measureText(String(t).split('\n')[0]).width;
    if(Object.keys(_mtCache).length > 5000) _mtCache = {};
    _mtCache[k] = w; return w * z();
  }
  function htmlCabCol(c0, c1, n){
    var h = [];
    for(var c = c0; c <= c1; c++){ var x = G.cx[c - 1], w = G.cx[c] - x; h.push('<div class="hc' + (c >= n.c1 && c <= n.c2 ? ' sel' : '') + '" data-col="' + c + '" style="left:' + x + 'px;width:' + w + 'px;height:' + G.hh + 'px">' + M.colTxt(c) + '</div>'); }
    return h.join('');
  }
  function htmlCabLin(l0, l1, n){
    var h = [], esc0 = filtroAtual();
    for(var l = l0; l <= l1; l++){ var y = G.ly[l - 1], hh = G.ly[l] - y; if(!hh) continue; h.push('<div class="hl' + (l >= n.l1 && l <= n.l2 ? ' sel' : '') + (esc0 && l > esc0.l && l <= esc0.l2 ? ' filtrada' : '') + '" data-lin="' + l + '" style="top:' + y + 'px;height:' + hh + 'px;width:' + G.hw + 'px">' + l + '</div>'); }
    return h.join('');
  }
  /* caixa da seleção, célula ativa, alça de preencher e marca do copiar (desenhadas em cada camada; cada uma corta o que não é dela) */
  function htmlSelecao(){
    if(!S.sel) return '';
    var n = norm(S.sel), mm = S.vista.mm || mapaMesclas(), h = '';
    function caixa(c1, l1, c2, l2, cls){ c2 = Math.min(c2, G.nc); l2 = Math.min(l2, G.nl); var x = G.cx[c1 - 1], y = G.ly[l1 - 1]; return '<div class="' + cls + '" style="left:' + x + 'px;top:' + y + 'px;width:' + (G.cx[c2] - x) + 'px;height:' + (G.ly[l2] - y) + 'px"></div>'; }
    var me = mm.mestre[S.sel.c1 + ',' + S.sel.l1] || { c2: S.sel.c1, l2: S.sel.l1 };
    if(n.c1 !== n.c2 || n.l1 !== n.l2) h += caixa(n.c1, n.l1, n.c2, n.l2, 'pl-selbox');
    h += caixa(S.sel.c1, S.sel.l1, me.c2, me.l2, 'pl-ativa');
    if(S.pode.criar && !S.ed){ var ax = G.cx[Math.min(Math.max(n.c2, me.c2), G.nc)], ay = G.ly[Math.min(Math.max(n.l2, me.l2), G.nl)]; h += '<div class="pl-alca" title="Arraste para preencher" style="left:' + (ax - 4) + 'px;top:' + (ay - 4) + 'px"></div>'; }
    if(S.prev) h += caixa(S.prev.c1, S.prev.l1, S.prev.c2, S.prev.l2, 'pl-prev');
    if(S.clip && S.clip.marca && S.clip.aba === S.ativa){ var k = S.clip.marca; h += caixa(k.c1, k.l1, k.c2, k.l2, 'pl-formiga'); }
    if(S.refMarca && S.refMarca.aba === S.ativa){ var q = S.refMarca; h += caixa(q.c1, q.l1, q.c2, q.l2, 'pl-refbox'); }
    return h;
  }
  var _raf = 0;
  function agendar(){ if(_raf) return; _raf = requestAnimationFrame(function(){ _raf = 0; pintar(); }); }
  /* pinta a tela: refaz o html das células só quando a janela visível muda; o resto é só deslocar */
  function pintar(forcar){
    if(!G || !S.pasta) return;
    var J = janelaVisivel(), cam = S.vista.camadas, n = S.sel ? norm(S.sel) : { c1: 0, c2: -1, l1: 0, l2: -1 };
    var chave = [J.c0, J.c1, J.l0, J.l1, S.ver, S.ativa].join(',');
    var hw = G.hw, hh = G.hh;
    /* posição das camadas */
    function pos(id, l, t, w, h){ var e = $(id).style; e.left = l + 'px'; e.top = t + 'px'; e.width = Math.max(0, w) + 'px'; e.height = Math.max(0, h) + 'px'; }
    var m = S.med;
    pos('vCorpo', hw + G.fw, hh + G.fh, m.w - hw - G.fw, m.h - hh - G.fh);
    pos('vTopo', hw + G.fw, hh, m.w - hw - G.fw, G.fh);
    pos('vEsq', hw, hh + G.fh, G.fw, m.h - hh - G.fh);
    pos('vCanto', hw, hh, G.fw, G.fh);
    pos('hColF', hw, 0, G.fw, hh); pos('hColS', hw + G.fw, 0, m.w - hw - G.fw, hh);
    pos('hLinF', 0, hh, hw, G.fh); pos('hLinS', 0, hh + G.fh, hw, m.h - hh - G.fh);
    pos('hTudo', 0, 0, hw, hh);
    var lcH = $('lcH'), lcV = $('lcV');
    lcH.hidden = !G.fl; lcV.hidden = !G.fc; if(G.fl){ lcH.style.top = (hh + G.fh - 1) + 'px'; } if(G.fc){ lcV.style.left = (hw + G.fw - 1) + 'px'; }
    var tx = -J.sl - G.fw, ty = -J.st - G.fh;
    cam.vCorpo.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    cam.vTopo.style.transform = 'translate(' + tx + 'px,0)';
    cam.vEsq.style.transform = 'translate(0,' + ty + 'px)';
    cam.hColS.style.transform = 'translate(' + tx + 'px,0)';
    cam.hLinS.style.transform = 'translate(0,' + ty + 'px)';
    if(forcar || chave !== S.vista.chave){
      S.vista.chave = chave;
      var mm = S.vista.mm = mapaMesclas();
      cam.vCorpo.innerHTML = htmlCelulas(J.c0, J.c1, J.l0, J.l1, mm) + '<div class="pl-sel" data-sel></div>';
      cam.vTopo.innerHTML = G.fl ? htmlCelulas(J.c0, J.c1, 1, G.fl, mm) + '<div class="pl-sel" data-sel></div>' : '';
      cam.vEsq.innerHTML = G.fc ? htmlCelulas(1, G.fc, J.l0, J.l1, mm) + '<div class="pl-sel" data-sel></div>' : '';
      cam.vCanto.innerHTML = G.fc && G.fl ? htmlCelulas(1, G.fc, 1, G.fl, mm) + '<div class="pl-sel" data-sel></div>' : '';
      S.vista.jan = J;
    }
    var J0 = S.vista.jan;
    cam.hColF.innerHTML = G.fc ? htmlCabCol(1, G.fc, n) : '';
    cam.hColS.innerHTML = htmlCabCol(J0.c0, J0.c1, n);
    cam.hLinF.innerHTML = G.fl ? htmlCabLin(1, G.fl, n) : '';
    cam.hLinS.innerHTML = htmlCabLin(J0.l0, J0.l1, n);
    var hs = htmlSelecao();
    document.querySelectorAll('#plVista [data-sel]').forEach(function(d){ d.innerHTML = hs; });
    posicionarEditor();
  }
  function recalcular(){ S.calc = M.calcular(S.pasta); }
  function redesenhar(){ recalcular(); S.ver = (S.ver || 0) + 1; geo(); S.med = medidas(); pintar(true); desenharAbas(); desenharAvisos(); atualizarBarra(); somaSelecao(); }
  function desenharGrade(){ geo(); S.med = medidas(); pintar(true); }
  function pintarSelecao(){ pintar(); atualizarBarra(); somaSelecao(); }

  /* ================= abas ================= */
  function desenharAbas(){
    var todos = S.calc.tudo();
    $('plAbas').innerHTML = S.pasta.abas.map(function(a, i){
      var n = Object.keys(todos[i] || {}).filter(function(r){ return M.ehErro(todos[i][r]); }).length;
      return '<button type="button" class="pl-aba' + (i === S.ativa ? ' active' : '') + '" data-aba="' + i + '" title="Clique duas vezes para renomear">' + esc(a.nome) + (n ? '<span class="err" title="' + n + ' célula(s) com erro">● ' + n + '</span>' : '') + '</button>';
    }).join('') + (S.pode.criar ? '<button type="button" class="btn ic" id="plAbaNova" title="Nova aba" aria-label="Nova aba">+</button>' : '')
      + (S.pasta.abas.length > 1 && S.pode.criar ? '<button type="button" class="btn ic" id="plAbaMenu" title="Mover, renomear ou tirar esta aba" aria-label="Opções da aba">⋯</button>' : '');
    $('plAbas').querySelectorAll('[data-aba]').forEach(function(b){
      b.onclick = function(){ trocarAba(+b.getAttribute('data-aba')); };
      b.ondblclick = function(){ renomearAba(+b.getAttribute('data-aba')); };
    });
    if($('plAbaNova')) $('plAbaNova').onclick = novaAba;
    if($('plAbaMenu')) $('plAbaMenu').onclick = menuAba;
  }
  function trocarAba(i){
    if(i === S.ativa) return;
    if(S.ed && !S.ed.formula) confirmarEdicao();
    S.ativa = i; S.pasta.ativa = i; S.sel = { c1: 1, l1: 1, c2: 1, l2: 1 }; S.minC = 0; S.minL = 0;
    $('plCaixa').scrollTop = 0; $('plCaixa').scrollLeft = 0;
    S.ver = (S.ver || 0) + 1; geo(); pintar(true); desenharAbas(); atualizarBarra(); somaSelecao(); infoFiltro();
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
    janela('jNomeAba', titulo, '', '<label class="rot" for="naNome">Nome</label><input class="campo" id="naNome" maxlength="31"><div class="erro-campo" id="naErro"></div>',
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
      + '<button class="btn" type="button" id="maRen">Renomear</button><button class="btn btn-perigo" type="button" id="maTirar">Tirar esta aba</button></div><div class="erro-campo" id="maErro"></div>',
      '<button class="btn" type="button" data-fechar>Fechar</button>');
    function mover(d){ guardarDesfazer(); var a = S.pasta.abas.splice(i, 1)[0]; S.pasta.abas.splice(i + d, 0, a); S.ativa = i + d; S.pasta.ativa = S.ativa; S.filtros = {}; fecharJanela('jMenuAba'); mudou(); }
    $('maEsq').onclick = function(){ mover(-1); }; $('maDir').onclick = function(){ mover(1); };
    $('maRen').onclick = function(){ fecharJanela('jMenuAba'); renomearAba(i); };
    $('maTirar').onclick = function(){
      var nome = aba().nome, usadaEm = [];
      S.pasta.abas.forEach(function(o, k){ if(k === i) return; Object.keys(o.celulas || {}).forEach(function(r){ var c = o.celulas[r]; if(c.f && (c.f.toLowerCase().indexOf(nome.toLowerCase() + "'!") >= 0 || c.f.toLowerCase().indexOf(nome.toLowerCase() + '!') >= 0)) usadaEm.push(o.nome + '!' + r); }); });
      confirmar('Tirar a aba "' + nome + '"?', usadaEm.length ? 'Outras abas usam esta (' + usadaEm.slice(0, 5).join(', ') + (usadaEm.length > 5 ? '…' : '') + '): essas fórmulas vão mostrar #REF!. Dá para desfazer com Ctrl+Z.' : 'Dá para desfazer com Ctrl+Z; as versões salvas continuam guardadas.', 'Tirar a aba', function(){
        guardarDesfazer(); S.pasta.abas.splice(i, 1); S.ativa = Math.max(0, i - 1); S.pasta.ativa = S.ativa; S.filtros = {}; mudou();
      }, true);
    };
  }
  /* confirmação dentro da tela (no lugar do confirm do navegador) */
  function confirmar(titulo, texto, rotulo, fazer, perigo){
    janela('jConfirmar', titulo, esc(texto || ''), '', '<button class="btn" type="button" data-fechar>Cancelar</button><button class="btn ' + (perigo ? 'btn-perigo' : 'btn-ouro') + '" type="button" id="jcOk">' + esc(rotulo) + '</button>');
    $('jcOk').onclick = function(){ fecharJanela('jConfirmar'); fazer(); };
    setTimeout(function(){ var b = $('jcOk'); if(b) b.focus(); }, 60);
  }

  /* ================= seleção ================= */
  function norm(s){ return { c1: Math.min(s.c1, s.c2), l1: Math.min(s.l1, s.l2), c2: Math.max(s.c1, s.c2), l2: Math.max(s.l1, s.l2) }; }
  function ativaRef(){ return M.ref(S.sel.c1, S.sel.l1); }
  function txtSel(){ var n = norm(S.sel); return M.ref(S.sel.c1, S.sel.l1) + (n.c1 !== n.c2 || n.l1 !== n.l2 ? ' · ' + M.ref(n.c1, n.l1) + ':' + M.ref(n.c2, n.l2) : ''); }
  function atualizarBarra(){
    if(!S.sel) return;
    var e = $('plEnd'); if(document.activeElement !== e) e.value = txtSel();
    if(!S.ed) $('plFx').value = M.paraEditar(cel(ativaRef()));
    var c = cel(ativaRef()) || {};
    $('fFormato').value = c.t || '';
    $('fB').classList.toggle('ativo', !!c.b); $('fI').classList.toggle('ativo', !!c.i);
    $('fReais').classList.toggle('ativo', c.t === 'reais'); $('fPct').classList.toggle('ativo', c.t === 'pct');
    $('fEsq').classList.toggle('ativo', c.al === 'esq'); $('fCentro').classList.toggle('ativo', c.al === 'centro'); $('fDir').classList.toggle('ativo', c.al === 'dir');
    $('fQuebra').classList.toggle('ativo', !!c.q);
    var bar = $('fCorTxtBarra'); if(bar) bar.style.background = c.cor && /^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : 'var(--text)';
    var cg = congel(); $('fCongelar').classList.toggle('ativo', !!(cg.l || cg.c)); $('fFiltro').classList.toggle('ativo', !!filtroAtual());
  }
  function somaSelecao(){
    var n = norm(S.sel), s = 0, q = 0, nums = 0, mn = Infinity, mx = -Infinity, esc0 = escondidas(), t = 0;
    if(n.c1 === n.c2 && n.l1 === n.l2){ $('plSoma').innerHTML = ''; return; }
    var a = aba();
    Object.keys(a.celulas).forEach(function(r){
      var e = M.endereco(r); if(!e || e.c < n.c1 || e.c > n.c2 || e.l < n.l1 || e.l > n.l2 || esc0[e.l]) return;
      if(++t > 200000) return;
      var v = S.calc.valor(S.ativa, r); if(v !== '' && v != null) q++; if(typeof v === 'number'){ s += v; nums++; if(v < mn) mn = v; if(v > mx) mx = v; }
    });
    var f = function(x){ return esc(M.mostrar(x, { t: 'num', casas: 2 })); };
    $('plSoma').innerHTML = nums ? 'Soma <b>' + f(s) + '</b> · Média <b>' + f(s / nums) + '</b> · Mín. <b>' + f(mn) + '</b> · Máx. <b>' + f(mx) + '</b> · <b>' + q + '</b> preenchida(s)' : '<b>' + q + '</b> preenchida(s)';
  }
  function irPara(c, l, estender, semRolar){
    c = Math.max(1, Math.min(c, 16384)); l = Math.max(1, Math.min(l, 100000));
    if(estender){ S.sel.c2 = c; S.sel.l2 = l; }
    else S.sel = { c1: c, l1: l, c2: c, l2: l };
    var cresceu = false;
    if(c > G.nc - 4){ S.minC = c + 10; cresceu = true; }
    if(l > G.nl - 10){ S.minL = l + 60; cresceu = true; }
    if(cresceu) geo();
    if(!semRolar) rolarAte(estender ? S.sel.c2 : c, estender ? S.sel.l2 : l);
    pintar(); atualizarBarra(); somaSelecao();
  }
  function rolarAte(c, l){
    var cx = $('plCaixa'), m = S.med, bw = m.w - G.hw - G.fw, bh = m.h - G.hh - G.fh;
    if(c > G.fc){ var x0 = G.cx[c - 1] - G.fw, x1 = G.cx[c] - G.fw; if(x0 < cx.scrollLeft) cx.scrollLeft = x0; else if(x1 > cx.scrollLeft + bw) cx.scrollLeft = x1 - bw + 2; }
    if(l > G.fl){ var y0 = G.ly[l - 1] - G.fh, y1 = G.ly[l] - G.fh; if(y0 < cx.scrollTop) cx.scrollTop = y0; else if(y1 > cx.scrollTop + bh) cx.scrollTop = y1 - bh + 2; }
  }
  /* posição da tela (dentro da grade) → célula */
  function celulaEm(px, py){
    var cx = $('plCaixa'), x = px - G.hw, y = py - G.hh;
    var X = x < G.fw ? x : x + cx.scrollLeft, Y = y < G.fh ? y : y + cx.scrollTop;
    return { c: x < 0 ? 0 : achar(G.cx, G.nc, X), l: y < 0 ? 0 : achar(G.ly, G.nl, Y), x: x, y: y, X: X, Y: Y };
  }
  /* retângulo da célula na tela (dentro da grade) */
  function retCelula(c, l, c2, l2){
    var cx = $('plCaixa'); c2 = c2 || c; l2 = l2 || l;
    var x = G.hw + G.cx[c - 1] - (c > G.fc ? cx.scrollLeft : 0), y = G.hh + G.ly[l - 1] - (l > G.fl ? cx.scrollTop : 0);
    return { x: x, y: y, w: G.cx[Math.min(c2, G.nc)] - G.cx[c - 1], h: G.ly[Math.min(l2, G.nl)] - G.ly[l - 1] };
  }
  /* "região atual" em volta de uma célula (como o Ctrl+A do Excel): linhas e colunas seguidas com conteúdo */
  function cheia(a, c, l){ var o = a.celulas[M.ref(c, l)]; return !!(o && ((o.v !== undefined && o.v !== '') || o.f)); }
  function regiao(c, l){
    var a = aba(), r = { c1: c, c2: c, l1: l, l2: l }, mudou0 = true, guarda = 0;
    function linhaTem(ll, c1, c2){ for(var x = c1; x <= c2; x++) if(cheia(a, x, ll)) return true; return false; }
    function colTem(cc, l1, l2){ for(var y = l1; y <= l2; y++) if(cheia(a, cc, y)) return true; return false; }
    while(mudou0 && guarda++ < 5000){
      mudou0 = false;
      if(r.l1 > 1 && linhaTem(r.l1 - 1, Math.max(1, r.c1 - 1), r.c2 + 1)){ r.l1--; mudou0 = true; }
      if(linhaTem(r.l2 + 1, Math.max(1, r.c1 - 1), r.c2 + 1)){ r.l2++; mudou0 = true; }
      if(r.c1 > 1 && colTem(r.c1 - 1, Math.max(1, r.l1 - 1), r.l2 + 1)){ r.c1--; mudou0 = true; }
      if(colTem(r.c2 + 1, Math.max(1, r.l1 - 1), r.l2 + 1)){ r.c2++; mudou0 = true; }
    }
    return r;
  }
  /* para ordenar/filtrar: tira do alto as linhas de TÍTULO (mescladas de lado a lado), como "Cálculo do PSS" */
  function semTitulo(r){
    var ms = (aba().mesclas || []).map(function(m){ var p = m.split(':'), x = M.endereco(p[0]), y = M.endereco(p[1]); return { c1: x.c, l1: x.l, c2: y.c, l2: y.l }; });
    var guarda = 0;
    while(r.l1 < r.l2 && guarda++ < 20){
      var tit = ms.filter(function(q){ return q.l1 <= r.l1 && q.l2 >= r.l1 && q.c2 > q.c1 && !(q.c2 < r.c1 || q.c1 > r.c2); });
      if(!tit.length) break;
      r.l1 = Math.max.apply(null, tit.map(function(q){ return q.l2; })) + 1;
    }
    return r;
  }
  /* Ctrl+seta: vai até a borda dos dados (como no Excel) */
  function pular(c, l, dc, dl){
    var a = aba(), u = M.usada(a), limC = Math.max(u.colunas, 1), limL = Math.max(u.linhas, 1);
    var cc = c + dc, ll = l + dl;
    if(cc < 1 || ll < 1) return { c: Math.max(1, cc), l: Math.max(1, ll) };
    var atual = cheia(a, c, l), prox = cheia(a, cc, ll);
    if(atual && prox){ while(cc + dc >= 1 && ll + dl >= 1 && cheia(a, cc + dc, ll + dl)){ cc += dc; ll += dl; } return { c: cc, l: ll }; }
    while(cc >= 1 && ll >= 1 && !cheia(a, cc, ll)){ if((dc > 0 && cc > limC) || (dl > 0 && ll > limL)) return { c: dc ? (dc > 0 ? limC : 1) : c, l: dl ? (dl > 0 ? limL : 1) : l }; cc += dc; ll += dl; }
    return { c: Math.max(1, cc), l: Math.max(1, ll) };
  }

  /* ================= edição ================= */
  function guardarDesfazer(){ S.desfazer.push(JSON.stringify({ p: S.pasta, a: S.ativa })); if(S.desfazer.length > 80) S.desfazer.shift(); S.refazer = []; }
  function mudou(){ S.pendente = true; redesenhar(); estadoSalvo(); }
  function voltarPara(txt){ var o = JSON.parse(txt); if(o && o.p){ S.pasta = o.p; S.ativa = Math.min(o.a || 0, S.pasta.abas.length - 1); } else { S.pasta = o; S.ativa = Math.min(S.ativa, S.pasta.abas.length - 1); } }
  function desfazer(){ if(S.ed) cancelarEdicao(); if(!S.desfazer.length){ toast('Nada para desfazer.'); return; } S.refazer.push(JSON.stringify({ p: S.pasta, a: S.ativa })); voltarPara(S.desfazer.pop()); mudou(); }
  function refazer(){ if(S.ed) cancelarEdicao(); if(!S.refazer.length){ toast('Nada para refazer.'); return; } S.desfazer.push(JSON.stringify({ p: S.pasta, a: S.ativa })); voltarPara(S.refazer.pop()); mudou(); }
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
    S.ed = { r: r, aba: S.ativa, c: S.sel.c1, l: S.sel.l1, original: M.paraEditar(c), formula: false };
    var val = inicial != null ? inicial : S.ed.original;
    if(viaBarra){ S.ed.barra = true; S.ed.formula = String(val)[0] === '='; return; }
    rolarAte(S.sel.c1, S.sel.l1);
    var ta = document.createElement('textarea'); ta.className = 'pl-ed'; ta.id = 'plEd'; ta.spellcheck = false; ta.setAttribute('aria-label', 'Editar a célula ' + r);
    ta.style.fontSize = (12.5 * z()) + 'px';
    $('plVista').appendChild(ta);
    S.ed.ta = ta; posicionarEditor();
    ta.value = val; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    $('plFx').value = val; S.ed.formula = String(val)[0] === '=';
    ajustarLargura(ta);
    ta.addEventListener('input', function(){ mascara(ta, c); $('plFx').value = ta.value; S.ed.formula = ta.value[0] === '='; S.ed.refPos = null; ajustarLargura(ta); });
    ta.addEventListener('keydown', teclaEditor);
    pintar();
  }
  function posicionarEditor(){
    var ta = $('plEd'); if(!ta || !S.ed || S.ed.aba !== S.ativa) { if(ta && S.ed && S.ed.aba !== S.ativa) ta.style.visibility = 'hidden'; return; }
    ta.style.visibility = '';
    var mm = S.vista.mm || mapaMesclas(), me = mm.mestre[S.ed.c + ',' + S.ed.l] || { c2: S.ed.c, l2: S.ed.l };
    var R = retCelula(S.ed.c, S.ed.l, me.c2, me.l2);
    ta.style.left = (R.x - 1) + 'px'; ta.style.top = (R.y - 1) + 'px';
    ta.style.minWidth = Math.max(R.w + 2, 90) + 'px'; ta.style.minHeight = Math.max(R.h + 2, 24) + 'px';
  }
  function ajustarLargura(ta){ var lin = ta.value.split('\n'), n = Math.min(70, Math.max.apply(null, lin.map(function(x){ return x.length; })) + 2); ta.style.width = Math.max(parseFloat(ta.style.minWidth) || 90, n * 7.4 * z()) + 'px'; ta.style.height = Math.max(parseFloat(ta.style.minHeight) || 24, lin.length * 17 * z() + 8) + 'px'; }
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
    var txt = textoEditado(), ed = S.ed; S.ed = null; S.refMarca = null;
    var ta = $('plEd'); if(ta) ta.remove();
    if(ed.aba !== S.ativa){ S.ativa = ed.aba; S.pasta.ativa = ed.aba; S.sel = { c1: ed.c, l1: ed.l, c2: ed.c, l2: ed.l }; geo(); }
    if(txt !== ed.original){ guardarDesfazer(); gravarCelula(S.pasta.abas[ed.aba], ed.r, txt); mudou(); }
    else { pintar(true); desenharAbas(); }
    if(mover){
      var n = norm(S.sel), dentro = n.c1 !== n.c2 || n.l1 !== n.l2;
      var dc = mover === 'dir' ? 1 : mover === 'esq' ? -1 : 0, dl = mover === 'baixo' ? 1 : mover === 'cima' ? -1 : 0;
      if(dentro) andarDentro(dc, dl); else irPara(S.sel.c1 + dc, S.sel.l1 + dl);
    }
    atualizarBarra();
    $('plCaixa').focus({ preventScroll: true });
  }
  /* Enter/Tab com várias células marcadas: anda só dentro da seleção (como no Excel) */
  function andarDentro(dc, dl){
    var n = norm(S.sel), c = S.sel.c1 + dc, l = S.sel.l1 + dl, keep = { c2: S.sel.c2, l2: S.sel.l2, a1: S.sel.c2, b1: S.sel.l2 };
    if(c > n.c2){ c = n.c1; l++; } if(c < n.c1){ c = n.c2; l--; }
    if(l > n.l2){ l = n.l1; if(dl) c++; } if(l < n.l1){ l = n.l2; if(dl) c--; }
    if(c > n.c2) c = n.c1; if(c < n.c1) c = n.c2;
    S.sel = { c1: c, l1: l, c2: keep.c2 === c && keep.l2 === l ? keep.c2 : n.c1 === c ? n.c2 : n.c1, l2: n.l1 === l ? n.l2 : n.l1 };
    S.sel = { c1: c, l1: l, c2: c === n.c1 ? n.c2 : n.c1, l2: l === n.l1 ? n.l2 : n.l1 };
    rolarAte(c, l); pintar(); atualizarBarra();
  }
  function cancelarEdicao(){ var ta = $('plEd'); if(ta) ta.remove(); var ed = S.ed; S.ed = null; S.refMarca = null; if(ed && ed.aba !== S.ativa){ S.ativa = ed.aba; geo(); desenharAbas(); } pintar(true); atualizarBarra(); $('plCaixa').focus({ preventScroll: true }); }
  function teclaEditor(e){
    if(e.key === 'Enter' && !e.altKey){ e.preventDefault(); confirmarEdicao(e.shiftKey ? 'cima' : 'baixo'); return; }
    if(e.key === 'Enter' && e.altKey){ e.preventDefault(); var t = e.target, p = t.selectionStart; t.value = t.value.slice(0, p) + '\n' + t.value.slice(t.selectionEnd); t.setSelectionRange(p + 1, p + 1); $('plFx').value = t.value; ajustarLargura(t); return; }
    if(e.key === 'Tab'){ e.preventDefault(); confirmarEdicao(e.shiftKey ? 'esq' : 'dir'); return; }
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); cancelarEdicao(); return; }
    /* setas sem ter mexido no texto (começou digitando): confirma e anda, como no Excel */
    if(/^Arrow/.test(e.key) && S.ed && S.ed.digitando && !S.ed.formula){ e.preventDefault(); confirmarEdicao({ ArrowDown: 'baixo', ArrowUp: 'cima', ArrowRight: 'dir', ArrowLeft: 'esq' }[e.key]); }
  }
  /* clicar numa célula enquanto escreve a fórmula: põe a referência */
  function porReferencia(c, l, c2, l2){
    var alvo = $('plEd') || $('plFx');
    var r = M.ref(c, l) + (c2 != null && (c2 !== c || l2 !== l) ? ':' + M.ref(Math.max(c, c2), Math.max(l, l2)) : '');
    if(c2 != null && (c2 < c || l2 < l)) r = M.ref(Math.min(c, c2), Math.min(l, l2)) + ':' + M.ref(Math.max(c, c2), Math.max(l, l2));
    if(S.ed.aba !== S.ativa){ var n = aba().nome; r = (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n) ? n : "'" + n.replace(/'/g, "''") + "'") + '!' + r; }
    var p = alvo.selectionStart, q = alvo.selectionEnd, v = alvo.value;
    if(S.ed.refPos != null && S.ed.refFim === p){ v = v.slice(0, S.ed.refPos) + v.slice(p); p = q = S.ed.refPos; }
    alvo.value = v.slice(0, p) + r + v.slice(q); S.ed.refPos = p; S.ed.refFim = p + r.length;
    alvo.focus(); alvo.setSelectionRange(p + r.length, p + r.length);
    if(alvo.id === 'plEd'){ $('plFx').value = alvo.value; ajustarLargura(alvo); }
    S.refMarca = { aba: S.ativa, c1: Math.min(c, c2 || c), l1: Math.min(l, l2 || l), c2: Math.max(c, c2 || c), l2: Math.max(l, l2 || l) };
    pintar();
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
    if((n.c2 - n.c1 + 1) * (n.l2 - n.l1 + 1) > 60000){
      /* seleção enorme (coluna ou linha inteira): só as células que existem */
      Object.keys(a.celulas).forEach(function(r){ var e = M.endereco(r); if(e.c >= n.c1 && e.c <= n.c2 && e.l >= n.l1 && e.l <= n.l2){ fn(a.celulas[r], r, e.c, e.l); if(!Object.keys(a.celulas[r]).length) delete a.celulas[r]; } });
      return;
    }
    for(var l = n.l1; l <= n.l2; l++) for(var c = n.c1; c <= n.c2; c++){
      var r = M.ref(c, l); if(!a.celulas[r] && criar) a.celulas[r] = {};
      if(a.celulas[r]) fn(a.celulas[r], r, c, l);
      if(a.celulas[r] && !Object.keys(a.celulas[r]).length) delete a.celulas[r];
    }
  }
  function formatar(fn){ if(!S.pode.criar) return; guardarDesfazer(); cadaCelula(fn, true); mudou(); }
  function limparSelecao(){ if(!S.pode.criar) return; guardarDesfazer(); cadaCelula(function(c){ delete c.v; delete c.f; }); mudou(); }
  function alternar(p){ var at = (cel(ativaRef()) || {})[p]; formatar(function(c){ if(at) delete c[p]; else c[p] = true; }); }
  function alinhar(al){ var at = (cel(ativaRef()) || {}).al; formatar(function(c){ if(at === al) delete c.al; else c.al = al; }); }
  function casas(d){ formatar(function(c){ var base = c.casas != null ? c.casas : (c.t === 'int' ? 0 : 2); c.casas = Math.max(0, Math.min(10, base + d)); }); }
  function formato(t){ var at = (cel(ativaRef()) || {}).t; formatar(function(c){ if(at === t) delete c.t; else c.t = t; delete c.casas; }); }
  function mesclar(){
    if(!S.pode.criar) return;
    var n = norm(S.sel), a = aba(), alvo = M.ref(n.c1, n.l1) + ':' + M.ref(n.c2, n.l2);
    a.mesclas = a.mesclas || [];
    var existe = a.mesclas.filter(function(m){ var p = m.split(':'), x = M.endereco(p[0]), y = M.endereco(p[1]); return !(y.c < n.c1 || x.c > n.c2 || y.l < n.l1 || x.l > n.l2); });
    if(existe.length){ guardarDesfazer(); a.mesclas = a.mesclas.filter(function(m){ return existe.indexOf(m) < 0; }); mudou(); return; }
    if(n.c1 === n.c2 && n.l1 === n.l2){ toast('Marque duas ou mais células para mesclar.'); return; }
    var cheias = 0; cadaCelula(function(c, r){ if(r !== M.ref(n.c1, n.l1) && (c.v !== undefined && c.v !== '' || c.f)) cheias++; });
    function faz(){ guardarDesfazer(); a.mesclas.push(alvo); S.sel = { c1: n.c1, l1: n.l1, c2: n.c2, l2: n.l2 }; mudou(); }
    if(cheias) confirmar('Mesclar as células?', 'Mesclar mantém só o conteúdo da 1ª célula; ' + cheias + ' outra(s) célula(s) marcadas têm conteúdo e vão ficar escondidas.', 'Mesclar', faz);
    else faz();
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
  function linhasColunas(eixo, inserir, depois){
    if(!S.pode.criar) return;
    var n = norm(S.sel), qtd = eixo === 'linha' ? n.l2 - n.l1 + 1 : n.c2 - n.c1 + 1;
    if(inserir && qtd > 500) qtd = 1;
    guardarDesfazer(); S.filtros = {};
    if(eixo === 'linha'){ if(inserir) M.inserir(S.pasta, S.ativa, 'linha', depois ? n.l2 + 1 : n.l1, qtd); else M.excluir(S.pasta, S.ativa, 'linha', n.l1, qtd); }
    else { if(inserir) M.inserir(S.pasta, S.ativa, 'coluna', depois ? n.c2 + 1 : n.c1, qtd); else M.excluir(S.pasta, S.ativa, 'coluna', n.c1, qtd); }
    S.sel = { c1: n.c1, l1: n.l1, c2: n.c1, l2: n.l1 }; mudou();
  }
  /* copiar a 1ª linha (ou coluna) marcada para as outras: Ctrl+D / Ctrl+R */
  function preencherAbaixo(){ var n = norm(S.sel); if(n.l2 === n.l1) return; preencher({ c1: n.c1, l1: n.l1, c2: n.c2, l2: n.l1 }, n, 'baixo', true); }
  function preencherDireita(){ var n = norm(S.sel); if(n.c2 === n.c1) return; preencher({ c1: n.c1, l1: n.l1, c2: n.c1, l2: n.l2 }, n, 'dir', true); }
  /* arrastar a alça: copia ou continua a série (1, 2, 3…; datas; "Parcela 1, Parcela 2"; fórmulas com as referências andando) */
  function preencher(orig, alvo, dir, soCopia){
    if(!S.pode.criar) return;
    var a = aba(); guardarDesfazer();
    var vert = dir === 'baixo' || dir === 'cima';
    var nFontes = vert ? orig.l2 - orig.l1 + 1 : orig.c2 - orig.c1 + 1;
    var linhas = vert ? [orig.c1, orig.c2] : [orig.l1, orig.l2];
    for(var k = linhas[0]; k <= linhas[1]; k++){
      var fontes = [];
      for(var i = 0; i < nFontes; i++){ var c = vert ? k : orig.c1 + i, l = vert ? orig.l1 + i : k; fontes.push({ c: c, l: l, ce: a.celulas[M.ref(c, l)] }); }
      var nums = fontes.map(function(f){ return f.ce && !f.ce.f && typeof f.ce.v === 'number' ? f.ce.v : null; });
      var serie = !soCopia && nums.every(function(x){ return x !== null; }) && (nums.length >= 2 || (fontes[0].ce && fontes[0].ce.t === 'data'));
      var passo = serie ? (nums.length >= 2 ? (nums[nums.length - 1] - nums[0]) / (nums.length - 1) : 1) : 0;
      var txtNum = !soCopia && fontes.length === 1 && fontes[0].ce && typeof fontes[0].ce.v === 'string' ? /^(.*?)(\d+)$/.exec(fontes[0].ce.v) : null;
      var de = vert ? (dir === 'baixo' ? orig.l2 + 1 : orig.l1 - 1) : (dir === 'dir' ? orig.c2 + 1 : orig.c1 - 1);
      var ate = vert ? (dir === 'baixo' ? alvo.l2 : alvo.l1) : (dir === 'dir' ? alvo.c2 : alvo.c1);
      var sentido = (dir === 'baixo' || dir === 'dir') ? 1 : -1, passoN = 0;
      for(var p = de; sentido > 0 ? p <= ate : p >= ate; p += sentido){
        passoN++;
        var idx = sentido > 0 ? (passoN - 1) % nFontes : (nFontes - 1) - ((passoN - 1) % nFontes);
        var f = fontes[idx], cc = vert ? k : p, ll = vert ? p : k, r = M.ref(cc, ll);
        if(!f.ce){ delete a.celulas[r]; continue; }
        var novo = JSON.parse(JSON.stringify(f.ce)); delete novo.nota; delete novo.conferir;
        if(novo.f) novo.f = M.transpor(f.ce.f, cc - f.c, ll - f.l);
        else if(serie) novo.v = Math.round(((sentido > 0 ? nums[nums.length - 1] : nums[0]) + passo * passoN * sentido) * 1e10) / 1e10;
        else if(txtNum){ var base = parseInt(txtNum[2], 10) + passoN * sentido; novo.v = txtNum[1] + (base < 0 ? 0 : String(base).padStart(txtNum[2].length, '0')); }
        a.celulas[r] = novo;
      }
    }
    S.sel = { c1: alvo.c1, l1: alvo.l1, c2: alvo.c2, l2: alvo.l2 };
    mudou();
  }
  function autossoma(){
    if(!S.pode.criar) return;
    var n = norm(S.sel), a = aba();
    function num(c, l){ return typeof S.calc.valor(S.ativa, M.ref(c, l)) === 'number'; }
    if(n.l2 > n.l1 || n.c2 > n.c1){
      /* várias células: total embaixo de cada coluna marcada */
      guardarDesfazer();
      for(var c = n.c1; c <= n.c2; c++){ var r = M.ref(c, n.l2 + 1); a.celulas[r] = Object.assign({}, a.celulas[M.ref(c, n.l2)] || {}, { f: '=SUM(' + M.ref(c, n.l1) + ':' + M.ref(c, n.l2) + ')' }); delete a.celulas[r].v; delete a.celulas[r].nota; delete a.celulas[r].conferir; a.celulas[r].b = true; }
      S.sel = { c1: n.c1, l1: n.l2 + 1, c2: n.c2, l2: n.l2 + 1 }; mudou(); return;
    }
    var c0 = S.sel.c1, l0 = S.sel.l1, l = l0 - 1, faixa = '';
    while(l >= 1 && !num(c0, l) && l > l0 - 2) l--;
    if(l >= 1 && num(c0, l)){ var fim = l; while(l > 1 && num(c0, l - 1)) l--; faixa = M.ref(c0, l) + ':' + M.ref(c0, fim); }
    else { var c1 = c0 - 1; if(c1 >= 1 && num(c1, l0)){ var fim2 = c1; while(c1 > 1 && num(c1 - 1, l0)) c1--; faixa = M.ref(c1, l0) + ':' + M.ref(fim2, l0); } }
    comecarEdicao('=SOMA(' + faixa + ')');
    var ta = $('plEd'); if(ta && !faixa){ ta.setSelectionRange(6, 6); }
  }

  /* ================= congelar ================= */
  function congelar(l, c){
    if(!S.pode.criar){ /* quem só vê também pode congelar na tela, sem salvar */ }
    var a = aba(), ant = JSON.stringify(a.congelar || null);
    if(l == null && c == null) delete a.congelar; else a.congelar = { l: Math.max(0, l | 0), c: Math.max(0, c | 0) };
    if(!a.congelar || (!a.congelar.l && !a.congelar.c)) delete a.congelar;
    if(JSON.stringify(a.congelar || null) !== ant && S.pode.criar){ S.pendente = true; estadoSalvo(); }
    $('plCaixa').scrollTop = 0; $('plCaixa').scrollLeft = 0;
    geo(); pintar(true); atualizarBarra();
  }

  /* ================= ordenar ================= */
  function regiaoParaOrdenar(){
    var n = norm(S.sel);
    if(n.l2 - n.l1 >= 1 && n.c2 - n.c1 >= 1 && n.l2 - n.l1 < 100000) return { r: n, cab: false, escolhida: true };
    var r = semTitulo(regiao(S.sel.c1, S.sel.l1));
    /* 1ª linha é cabeçalho quando é texto e a de baixo tem número na coluna, ou quando está em negrito */
    var a = aba(), c1 = a.celulas[M.ref(S.sel.c1, r.l1)], c2 = a.celulas[M.ref(S.sel.c1, r.l1 + 1)];
    var v1 = c1 ? S.calc.valor(S.ativa, M.ref(S.sel.c1, r.l1)) : '', v2 = c2 ? S.calc.valor(S.ativa, M.ref(S.sel.c1, r.l1 + 1)) : '';
    var cab = !!(c1 && (c1.b || c1.fundo === 'titulo' || c1.fundo === 'secao' || (typeof v1 === 'string' && typeof v2 === 'number')));
    return { r: r, cab: cab };
  }
  function comparar(x, y){
    var vx = x.k, vy = y.k;
    var ex = vx === '' || vx == null, ey = vy === '' || vy == null;
    if(ex || ey) return ex === ey ? 0 : ex ? 1 : -1;
    if(typeof vx === 'number' && typeof vy === 'number') return vx - vy;
    if(typeof vx === 'number') return -1; if(typeof vy === 'number') return 1;
    return String(vx).localeCompare(String(vy), 'pt-BR', { numeric: true, sensitivity: 'base' });
  }
  function ordenar(desc, colOrd, R){
    if(!S.pode.criar){ toast('Sem permissão para mudar esta planilha.', 'error'); return; }
    var info = R || regiaoParaOrdenar(), r = info.r, a = aba(), col = colOrd || S.sel.c1;
    var l1 = r.l1 + (info.cab ? 1 : 0);
    if(r.l2 <= l1){ toast('Não há linhas para ordenar aqui.'); return; }
    if(col < r.c1 || col > r.c2) col = r.c1;
    var dentro = (a.mesclas || []).some(function(m){ var p = m.split(':'), x = M.endereco(p[0]), y = M.endereco(p[1]); return !(y.c < r.c1 || x.c > r.c2 || y.l < l1 || x.l > r.l2); });
    if(dentro){ toast('Há células mescladas nessas linhas: desfaça a mescla antes de ordenar.', 'error'); return; }
    var linhas = [];
    for(var l = l1; l <= r.l2; l++){ var cels = {}; for(var c = r.c1; c <= r.c2; c++){ var x = a.celulas[M.ref(c, l)]; if(x) cels[c] = x; } linhas.push({ l: l, k: a.celulas[M.ref(col, l)] ? S.calc.valor(S.ativa, M.ref(col, l)) : '', cels: cels }); }
    linhas.forEach(function(o){ if(M.ehErro(o.k)) o.k = String(o.k.e); });
    var ordem = linhas.slice().sort(function(x, y){ var d = comparar(x, y); if(desc && !(x.k === '' || y.k === '')) d = -d; return d || x.l - y.l; });
    guardarDesfazer();
    for(l = l1; l <= r.l2; l++) for(c = r.c1; c <= r.c2; c++) delete a.celulas[M.ref(c, l)];
    ordem.forEach(function(o, i){
      var nl = l1 + i;
      Object.keys(o.cels).forEach(function(c){ var x = JSON.parse(JSON.stringify(o.cels[c])); if(x.f) x.f = M.transpor(o.cels[c].f, 0, nl - o.l); a.celulas[M.ref(+c, nl)] = x; });
    });
    S.filtros = {};
    mudou();
    toast('Ordenado ' + (desc ? 'do maior para o menor (Z→A)' : 'do menor para o maior (A→Z)') + ' pela coluna ' + M.colTxt(col) + ', linhas ' + l1 + ' a ' + r.l2 + (info.cab ? ' (a linha ' + r.l1 + ' é o cabeçalho e ficou no lugar)' : '') + '. Ctrl+Z desfaz.', 'success');
  }

  /* ================= filtro ================= */
  function alternarFiltro(){
    S.filtros = S.filtros || {};
    if(filtroAtual()){ delete S.filtros[S.ativa]; geo(); pintar(true); infoFiltro(); atualizarBarra(); return; }
    var r = semTitulo(regiao(S.sel.c1, S.sel.l1));
    if(r.l2 <= r.l1){ toast('Ponha a seleção dentro de uma tabela com cabeçalho e linhas embaixo para filtrar.'); return; }
    S.filtros[S.ativa] = { l: r.l1, l2: r.l2, c1: r.c1, c2: r.c2, ex: {} };
    geo(); pintar(true); infoFiltro(); atualizarBarra();
    toast('Filtro ligado na linha ' + r.l1 + ' (colunas ' + M.colTxt(r.c1) + ' a ' + M.colTxt(r.c2) + '): clique no ▾ do cabeçalho. O filtro só esconde na tela; PDF e Excel saem completos.');
  }
  function infoFiltro(){
    var f = filtroAtual(), el = $('plFiltroInfo'); if(!el) return;
    if(!f){ el.innerHTML = ''; return; }
    var esc0 = escondidas(), n = Object.keys(esc0).length, tot = f.l2 - f.l;
    el.innerHTML = 'Filtro: <b>' + (tot - n) + '</b> de ' + tot + ' linha(s)' + (n ? ' <button type="button" class="lnk" id="plFiltroLimpar">Mostrar todas</button>' : '');
    if($('plFiltroLimpar')) $('plFiltroLimpar').onclick = function(){ f.ex = {}; geo(); pintar(true); infoFiltro(); };
  }
  function abrirFiltroColuna(c, ancora){
    var f = filtroAtual(); if(!f) return;
    var a = aba(), vals = {}, ordemV = [];
    for(var l = f.l + 1; l <= f.l2; l++){ var r = M.ref(c, l), ce = a.celulas[r], t = ce ? M.mostrar(S.calc.valor(S.ativa, r), ce) : ''; if(!(t in vals)){ vals[t] = 0; ordemV.push(t); } vals[t]++; }
    ordemV.sort(function(x, y){ if(x === '') return 1; if(y === '') return -1; return x.localeCompare(y, 'pt-BR', { numeric: true }); });
    var ex = Object.assign({}, f.ex[c] || {});
    var pop = popover(ancora, '<div class="pl-fpop"><div class="pl-fpop-tit">Coluna ' + M.colTxt(c) + '</div>'
      + '<div class="pl-fpop-ord"><button type="button" class="btn" data-o="az">Ordenar A→Z</button><button type="button" class="btn" data-o="za">Z→A</button></div>'
      + '<input class="campo" id="fpBusca" placeholder="Buscar valor" aria-label="Buscar valor">'
      + '<label class="pl-fpop-tudo"><input type="checkbox" id="fpTudo"> Marcar todos</label>'
      + '<div class="pl-fpop-lista" id="fpLista"></div>'
      + '<div class="pl-fpop-rod"><button type="button" class="btn" data-fechar-pop>Cancelar</button><button type="button" class="btn btn-ouro" id="fpOk">Aplicar</button></div></div>');
    function desenha(){
      var q = ($('fpBusca').value || '').toLowerCase();
      $('fpLista').innerHTML = ordemV.filter(function(t){ return !q || t.toLowerCase().indexOf(q) >= 0; }).slice(0, 500).map(function(t, i){
        return '<label><input type="checkbox" data-v="' + esc(t) + '"' + (ex[t] ? '' : ' checked') + '> <span>' + (t === '' ? '<i>(vazias)</i>' : esc(t)) + '</span><small>' + vals[t] + '</small></label>';
      }).join('') + (ordemV.length > 500 ? '<div class="dica">Mostrando 500 valores; use a busca.</div>' : '');
      $('fpTudo').checked = !ordemV.some(function(t){ return ex[t]; });
      $('fpLista').querySelectorAll('input').forEach(function(i){ i.onchange = function(){ var v = i.getAttribute('data-v'); if(i.checked) delete ex[v]; else ex[v] = 1; $('fpTudo').checked = !ordemV.some(function(t){ return ex[t]; }); }; });
    }
    desenha();
    $('fpBusca').oninput = desenha;
    $('fpTudo').onchange = function(){ var on = this.checked; ordemV.forEach(function(t){ if(on) delete ex[t]; else ex[t] = 1; }); desenha(); };
    $('fpOk').onclick = function(){ f.ex[c] = ex; fecharPopover(); geo(); pintar(true); infoFiltro(); somaSelecao(); };
    pop.querySelectorAll('[data-o]').forEach(function(b){ b.onclick = function(){ fecharPopover(); ordenar(b.getAttribute('data-o') === 'za', c, { r: { l1: f.l, l2: f.l2, c1: f.c1, c2: f.c2 }, cab: true }); }; });
    setTimeout(function(){ $('fpBusca').focus(); }, 30);
  }

  /* ================= menus pequenos (popover) ================= */
  function popover(ancora, html){
    fecharPopover();
    var p = document.createElement('div'); p.className = 'pl-pop'; p.id = 'plPop'; p.setAttribute('role', 'menu'); p.innerHTML = html;
    document.body.appendChild(p);
    var r = ancora.getBoundingClientRect ? ancora.getBoundingClientRect() : ancora;
    var w = p.offsetWidth, h = p.offsetHeight, vw = innerWidth, vh = innerHeight;
    var x = Math.min(Math.max(8, r.left), vw - w - 8), y = r.bottom + 4; if(y + h > vh - 8) y = Math.max(8, (r.top || r.bottom) - h - 4);
    p.style.left = x + 'px'; p.style.top = y + 'px';
    requestAnimationFrame(function(){ p.classList.add('aberto'); });
    p.querySelectorAll('[data-fechar-pop]').forEach(function(b){ b.onclick = fecharPopover; });
    return p;
  }
  function fecharPopover(){ var p = $('plPop'); if(!p) return; p.id = ''; p.classList.remove('aberto'); setTimeout(function(){ p.remove(); }, reduzido() ? 0 : 200); }
  function menu(ancora, itens){
    var p = popover(ancora, itens.map(function(it, i){
      if(it === '-') return '<div class="pl-pop-sep"></div>';
      if(it.titulo) return '<div class="pl-pop-tit">' + esc(it.titulo) + '</div>';
      return '<button type="button" role="menuitem" class="pl-pop-it" data-i="' + i + '"' + (it.off ? ' disabled' : '') + '>' + (it.cor !== undefined ? '<i class="pl-amostra" style="background:' + it.cor + '"></i>' : '') + '<span>' + esc(it.r) + '</span>' + (it.k ? '<small>' + esc(it.k) + '</small>' : '') + '</button>';
    }).join(''));
    p.querySelectorAll('[data-i]').forEach(function(b){ b.onclick = function(){ var it = itens[+b.getAttribute('data-i')]; fecharPopover(); if(it && it.f) it.f(); }; });
    var pri = p.querySelector('[data-i]'); if(pri) pri.focus();
    p.addEventListener('keydown', function(e){
      var bs = Array.prototype.slice.call(p.querySelectorAll('[data-i]:not([disabled])')), i = bs.indexOf(document.activeElement);
      if(e.key === 'ArrowDown'){ e.preventDefault(); (bs[i + 1] || bs[0]).focus(); } else if(e.key === 'ArrowUp'){ e.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); }
    });
    return p;
  }
  document.addEventListener('mousedown', function(e){ var p = $('plPop'); if(p && !p.contains(e.target) && !e.target.closest('[data-abre-pop]')) fecharPopover(); }, true);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && $('plPop')){ fecharPopover(); e.stopPropagation(); $('plCaixa').focus({ preventScroll: true }); } }, true);
  function menuContexto(x, y){
    var n = norm(S.sel), ed = S.pode.criar, ql = n.l2 - n.l1 + 1, qc = n.c2 - n.c1 + 1;
    menu({ left: x, bottom: y, top: y }, [
      { r: 'Recortar', k: 'Ctrl+X', off: !ed, f: function(){ copiarParaArea(true); } },
      { r: 'Copiar', k: 'Ctrl+C', f: function(){ copiarParaArea(false); } },
      { r: 'Colar', k: 'Ctrl+V', off: !ed, f: colarDaArea },
      '-',
      { r: 'Inserir ' + (ql > 1 ? ql + ' linhas' : 'linha') + ' acima', off: !ed, f: function(){ linhasColunas('linha', true); } },
      { r: 'Inserir ' + (ql > 1 ? ql + ' linhas' : 'linha') + ' abaixo', off: !ed, f: function(){ linhasColunas('linha', true, true); } },
      { r: 'Excluir ' + (ql > 1 ? ql + ' linhas' : 'a linha') + ' ' + n.l1 + (ql > 1 ? ' a ' + n.l2 : ''), off: !ed, f: function(){ linhasColunas('linha', false); } },
      { r: 'Inserir ' + (qc > 1 ? qc + ' colunas' : 'coluna') + ' à esquerda', off: !ed, f: function(){ linhasColunas('coluna', true); } },
      { r: 'Excluir ' + (qc > 1 ? qc + ' colunas' : 'a coluna') + ' ' + M.colTxt(n.c1) + (qc > 1 ? ' a ' + M.colTxt(n.c2) : ''), off: !ed, f: function(){ linhasColunas('coluna', false); } },
      '-',
      { r: 'Limpar o conteúdo', k: 'Delete', off: !ed, f: limparSelecao },
      { r: 'Limpar a formatação', off: !ed, f: function(){ formatar(function(c){ ['t', 'casas', 'b', 'i', 'al', 'q', 'fundo', 'cor', 'borda', 'cinza'].forEach(function(k){ delete c[k]; }); }); } },
      { r: 'Ordenar A→Z', off: !ed, f: function(){ ordenar(false); } },
      { r: 'Ordenar Z→A', off: !ed, f: function(){ ordenar(true); } },
      { r: 'Nota…', off: !ed, f: nota }
    ]);
  }

  /* ================= copiar e colar (também do e para o Excel) ================= */
  function copiar(cortar){
    var n = norm(S.sel), a = aba(), linhas = [], cels = [];
    if((n.l2 - n.l1 + 1) * (n.c2 - n.c1 + 1) > 400000){ toast('Seleção grande demais para copiar.', 'error'); return ''; }
    var esc0 = escondidas();
    for(var l = n.l1; l <= n.l2; l++){
      if(esc0[l]) continue;
      var lin = [], cl = [];
      for(var c = n.c1; c <= n.c2; c++){ var r = M.ref(c, l), ce = a.celulas[r], t = ce ? M.mostrar(S.calc.valor(S.ativa, r), ce) : ''; if(/[\t\n"]/.test(t)) t = '"' + t.replace(/"/g, '""') + '"'; lin.push(t); cl.push(ce ? JSON.parse(JSON.stringify(ce)) : null); }
      linhas.push(lin.join('\t')); cels.push(cl);
    }
    var txt = linhas.join('\n');
    S.clip = { txt: txt, cels: cels, c: n.c1, l: n.l1, cortar: !!cortar, aba: S.ativa, marca: { c1: n.c1, l1: n.l1, c2: n.c2, l2: n.l2 } };
    pintar();
    return txt;
  }
  /* texto do Excel/Google: colunas por tabulação; célula com quebra de linha vem entre aspas */
  function lerTabela(txt){
    var s = String(txt || '').replace(/\r\n?/g, '\n'), lin = [], cel0 = '', linha = [], q = false;
    for(var i = 0; i < s.length; i++){
      var ch = s[i];
      if(q){ if(ch === '"'){ if(s[i + 1] === '"'){ cel0 += '"'; i++; } else q = false; } else cel0 += ch; continue; }
      if(ch === '"' && cel0 === ''){ q = true; continue; }
      if(ch === '\t'){ linha.push(cel0); cel0 = ''; continue; }
      if(ch === '\n'){ linha.push(cel0); lin.push(linha); linha = []; cel0 = ''; continue; }
      cel0 += ch;
    }
    if(cel0 !== '' || linha.length) { linha.push(cel0); lin.push(linha); }
    return lin;
  }
  function colar(txt){
    if(!S.pode.criar){ toast('Sem permissão para mudar esta planilha.', 'error'); return; }
    var a = aba(), n = norm(S.sel);
    if(S.clip && txt != null && txt.replace(/\r/g, '') === S.clip.txt){
      guardarDesfazer();
      var dc = n.c1 - S.clip.c, dl = n.l1 - S.clip.l, origem = S.pasta.abas[S.clip.aba];
      /* uma célula copiada e várias marcadas: repete em todas */
      var repL = S.clip.cels.length === 1 && S.clip.cels[0].length === 1 ? n.l2 - n.l1 + 1 : S.clip.cels.length;
      var repC = S.clip.cels.length === 1 && S.clip.cels[0].length === 1 ? n.c2 - n.c1 + 1 : (S.clip.cels[0] || []).length;
      if(S.clip.cortar){ S.clip.cels.forEach(function(lin, i){ lin.forEach(function(x, j){ delete origem.celulas[M.ref(S.clip.c + j, S.clip.l + i)]; }); }); }
      for(var i = 0; i < repL; i++) for(var j = 0; j < repC; j++){
        var x = S.clip.cels[i % S.clip.cels.length][j % S.clip.cels[0].length], r = M.ref(n.c1 + j, n.l1 + i);
        if(!x){ delete a.celulas[r]; continue; }
        var novo = JSON.parse(JSON.stringify(x)); if(novo.f && !S.clip.cortar) novo.f = M.transpor(x.f, dc + j - (j % S.clip.cels[0].length), dl + i - (i % S.clip.cels.length));
        a.celulas[r] = novo;
      }
      if(S.clip.cortar) S.clip = null;
      S.sel = { c1: n.c1, l1: n.l1, c2: n.c1 + repC - 1, l2: n.l1 + repL - 1 };
    } else {
      var tab = lerTabela(txt); if(!tab.length) return;
      if(tab.length * (tab[0] || []).length > 300000){ toast('O que foi colado é grande demais (mais de 300 mil células).', 'error'); return; }
      guardarDesfazer();
      tab.forEach(function(linha, i){ linha.forEach(function(v, j){ gravarCelula(a, M.ref(n.c1 + j, n.l1 + i), v); }); });
      S.sel = { c1: n.c1, l1: n.l1, c2: n.c1 + Math.max(1, (tab[0] || []).length) - 1, l2: n.l1 + tab.length - 1 };
      if(S.clip) S.clip.marca = null;
    }
    mudou();
  }
  async function copiarParaArea(cortar){
    var t = copiar(cortar);
    try{ await navigator.clipboard.writeText(t); toast(cortar ? 'Recortado: escolha onde colar e use Ctrl+V.' : 'Copiado.'); }catch(e){ toast('Copiado aqui na planilha (o navegador não deixou usar a área de transferência: use Ctrl+C).'); }
  }
  async function colarDaArea(){
    try{ var t = await navigator.clipboard.readText(); colar(t); }
    catch(e){ if(S.clip) colar(S.clip.txt); else toast('O navegador não deixou ler a área de transferência: use Ctrl+V.', 'error'); }
  }

  /* ================= voltar (23/11, Dr. Victor: "quero poder VOLTAR") ================= */
  function destinoVoltar(){
    var q = new URLSearchParams(location.search).get('voltar');
    if(q && /^[a-z0-9_]+\.html(\?[\w\-=&%.,+]*)?$/i.test(q)) return q;
    var d = S.doc || {};
    if(d.processo_id || d.pessoa_id){ var pid = (S.ctx.pessoa && S.ctx.pessoa.id) || d.pessoa_id; if(pid) return FICHA + '?pessoa_id=' + encodeURIComponent(pid) + (d.processo_id ? '&processo_id=' + encodeURIComponent(d.processo_id) : ''); }
    return 'biblioteca_padrao_metalico_FINAL.html?aba=planilhas';
  }
  function rotuloVoltar(){ var d = destinoVoltar(); return /^ficha_/.test(d) ? 'Voltar para a ficha' : /aba=planilhas/.test(d) ? 'Voltar para Planilhas' : 'Voltar'; }
  function sair(){
    S.pendente = false;
    var d = destinoVoltar(), ref = '';
    try{ var u = new URL(document.referrer); if(u.origin === location.origin) ref = u.pathname.split('/').pop() + u.search; }catch(e){}
    /* veio de lá mesmo: volta pelo histórico (a tela de trás reaparece como estava: filtros, rolagem) */
    if(ref && history.length > 1 && ref.split('?')[0] === d.split('?')[0]){ history.back(); setTimeout(function(){ location.href = d; }, 900); }
    else location.href = d;
  }
  function voltar(){
    if(S.ed) confirmarEdicao();
    if(!S.pendente){ sair(); return; }
    janela('jVoltar', 'Há alterações não salvas', 'Se sair agora, o que você mudou desde o último "Salvar" se perde.', '<div class="erro-campo" id="jvErro"></div>',
      '<button class="btn" type="button" data-fechar>Continuar aqui</button><button class="btn btn-perigo" type="button" id="jvSair">Sair sem salvar</button>' + (S.pode.criar ? '<button class="btn btn-ouro" type="button" id="jvSalvar">Salvar e voltar</button>' : ''));
    $('jvSair').onclick = function(){ fecharJanela('jVoltar'); sair(); };
    if($('jvSalvar')){ $('jvSalvar').onclick = async function(){ this.disabled = true; this.textContent = 'Salvando…'; await salvar(); if(!S.pendente){ fecharJanela('jVoltar'); sair(); } else { this.disabled = false; this.textContent = 'Salvar e voltar'; $('jvErro').textContent = 'Não salvei (o motivo está no alto da planilha). Nada se perdeu: você continua aqui.'; } }; setTimeout(function(){ $('jvSalvar').focus(); }, 60); }
  }

  /* ================= zoom ================= */
  function lerZoom(){ try{ var v = parseInt(localStorage.getItem('saga-planilha-zoom') || '100', 10); return ZOOMS.indexOf(v) >= 0 ? v : 100; }catch(e){ return 100; } }
  function mudarZoom(v){
    v = ZOOMS.reduce(function(m, x){ return Math.abs(x - v) < Math.abs(m - v) ? x : m; }, 100);
    if(v === S.zoom) return;
    var cx = $('plCaixa'), k = v / (S.zoom || 100);
    S.zoom = v; try{ localStorage.setItem('saga-planilha-zoom', String(v)); }catch(e){}
    $('plZoom').value = String(v); $('plVista').style.fontSize = (12.5 * z()) + 'px';
    geo(); cx.scrollLeft *= k; cx.scrollTop *= k; pintar(true);
  }

  /* ================= eventos ================= */
  function ligarTela(){
    var g = $('plCaixa'), v = $('plVista'), arr = null;
    S.zoom = lerZoom(); $('plZoom').value = String(S.zoom); v.style.fontSize = (12.5 * z()) + 'px';
    $('plTitulo').addEventListener('input', function(){ S.pendente = true; estadoSalvo(); });
    $('plVoltar').onclick = voltar;
    g.addEventListener('scroll', function(){ agendar(); if(S.ed) posicionarEditor(); }, { passive: true });
    if(window.ResizeObserver) new ResizeObserver(function(){ if(!G) return; S.med = medidas(); pintar(true); }).observe(g);
    g.addEventListener('wheel', function(e){ if(e.ctrlKey || e.metaKey){ e.preventDefault(); var i = ZOOMS.indexOf(S.zoom); mudarZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + (e.deltaY < 0 ? 1 : -1)))]); } }, { passive: false });
    function local(e){ var b = v.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    /* borda de coluna/linha no cabeçalho (para arrastar a largura/altura) */
    function bordaCab(p){
      var P = celulaEm(p.x, p.y);
      if(p.y < G.hh && p.x >= G.hw){ var c = P.c, xc = G.hw + G.cx[c] - (c > G.fc ? g.scrollLeft : 0), xa = G.hw + G.cx[c - 1] - (c > G.fc ? g.scrollLeft : 0); if(Math.abs(p.x - xc) <= 4) return { eixo: 'c', n: c }; if(c > 1 && Math.abs(p.x - xa) <= 4) return { eixo: 'c', n: c - 1 }; }
      if(p.x < G.hw && p.y >= G.hh){ var l = P.l, yc = G.hh + G.ly[l] - (l > G.fl ? g.scrollTop : 0), ya = G.hh + G.ly[l - 1] - (l > G.fl ? g.scrollTop : 0); if(Math.abs(p.y - yc) <= 3) return { eixo: 'l', n: l }; if(l > 1 && Math.abs(p.y - ya) <= 3){ var lp = l - 1; while(lp > 1 && G.ly[lp] === G.ly[lp - 1]) lp--; return { eixo: 'l', n: lp }; } }
      return null;
    }
    v.addEventListener('pointermove', function(e){
      if(arr) return;
      var p = local(e), b = bordaCab(p);
      v.style.cursor = b ? (b.eixo === 'c' ? 'col-resize' : 'row-resize') : (p.x < G.hw && p.y >= G.hh ? 'e-resize' : (p.y < G.hh && p.x >= G.hw ? 's-resize' : ''));
      if(!b && e.target.classList && e.target.classList.contains('pl-alca')) v.style.cursor = 'crosshair';
    });
    v.addEventListener('pointerdown', function(e){
      if(e.target.id === 'plEd') return;
      if(e.button === 2) return;
      fecharPopover();
      var p = local(e), toque = e.pointerType === 'touch';
      var fb = e.target.closest && e.target.closest('[data-fc]');
      if(fb){ e.preventDefault(); abrirFiltroColuna(+fb.getAttribute('data-fc'), fb); return; }
      if(e.target.classList && e.target.classList.contains('pl-alca')){ e.preventDefault(); if(S.ed) confirmarEdicao(); arr = { modo: 'alca', orig: norm(S.sel) }; v.setPointerCapture(e.pointerId); return; }
      var b = bordaCab(p);
      if(b && !toque){
        e.preventDefault();
        arr = { modo: b.eixo === 'c' ? 'larg' : 'alt', n: b.n, ini: b.eixo === 'c' ? p.x : p.y, base: b.eixo === 'c' ? largura(b.n) : altura(b.n) };
        v.setPointerCapture(e.pointerId); return;
      }
      var P = celulaEm(p.x, p.y);
      if(p.x < G.hw && p.y < G.hh){ e.preventDefault(); if(S.ed) confirmarEdicao(); var u = M.usada(aba()); S.sel = { c1: 1, l1: 1, c2: Math.max(u.colunas, 1), l2: Math.max(u.linhas, 1) }; pintarSelecao(); g.focus({ preventScroll: true }); return; }
      /* referência na fórmula (clicar/arrastar com a fórmula aberta) */
      if(S.ed && aceitaReferencia() && P.c && P.l){ e.preventDefault(); arr = { modo: 'ref', c: P.c, l: P.l }; porReferencia(P.c, P.l); v.setPointerCapture(e.pointerId); return; }
      if(S.ed) confirmarEdicao();
      if(toque){ arr = { modo: 'toque', x: e.clientX, y: e.clientY, P: P }; return; }
      e.preventDefault();
      if(p.y < G.hh){ if(e.shiftKey){ S.sel.c2 = P.c; S.sel.l1 = 1; S.sel.l2 = G.nl; } else S.sel = { c1: P.c, l1: 1, c2: P.c, l2: G.nl }; arr = { modo: 'cols' }; }
      else if(p.x < G.hw){ if(e.shiftKey){ S.sel.l2 = P.l; S.sel.c1 = 1; S.sel.c2 = G.nc; } else S.sel = { c1: 1, l1: P.l, c2: G.nc, l2: P.l }; arr = { modo: 'lins' }; }
      else { if(e.shiftKey){ S.sel.c2 = P.c; S.sel.l2 = P.l; } else S.sel = { c1: P.c, l1: P.l, c2: P.c, l2: P.l }; arr = { modo: 'sel' }; }
      v.setPointerCapture(e.pointerId);
      pintarSelecao(); g.focus({ preventScroll: true });
    });
    /* arrastar perto da borda rola a grade */
    var rolagem = null;
    function autoRolar(p){
      var m = S.med, dx = p.x > m.w - 20 ? 18 : p.x < G.hw + G.fw + 4 && p.x >= G.hw ? -18 : 0, dy = p.y > m.h - 20 ? 18 : p.y < G.hh + G.fh + 4 && p.y >= G.hh ? -18 : 0;
      clearInterval(rolagem); rolagem = null;
      if((dx || dy) && arr && arr.modo !== 'larg' && arr.modo !== 'alt'){ rolagem = setInterval(function(){ g.scrollLeft += dx; g.scrollTop += dy; }, 40); }
    }
    v.addEventListener('pointermove', function(e){
      if(!arr) return;
      var p = local(e);
      if(arr.modo === 'toque'){ if(Math.abs(e.clientX - arr.x) + Math.abs(e.clientY - arr.y) > 8) arr = null; return; }
      if(arr.modo === 'larg' || arr.modo === 'alt'){
        var nv = Math.max(arr.modo === 'larg' ? 24 : 14, Math.round(arr.base + ((arr.modo === 'larg' ? p.x : p.y) - arr.ini) / z()));
        var a = aba(); if(arr.modo === 'larg'){ a.colunas = a.colunas || {}; a.colunas[M.colTxt(arr.n)] = nv; } else { a.linhas = a.linhas || {}; a.linhas[arr.n] = nv; }
        arr.mexeu = true; geo(); pintar(true); return;
      }
      autoRolar(p);
      var P = celulaEm(Math.max(G.hw, p.x), Math.max(G.hh, p.y));
      if(arr.modo === 'ref'){ porReferencia(arr.c, arr.l, P.c, P.l); return; }
      if(arr.modo === 'alca'){
        var o = arr.orig, dBaixo = P.l - o.l2, dCima = o.l1 - P.l, dDir = P.c - o.c2, dEsq = o.c1 - P.c, mx = Math.max(dBaixo, dCima, dDir, dEsq);
        if(mx <= 0){ S.prev = null; arr.dir = null; }
        else if(mx === dBaixo){ S.prev = { c1: o.c1, l1: o.l1, c2: o.c2, l2: P.l }; arr.dir = 'baixo'; }
        else if(mx === dCima){ S.prev = { c1: o.c1, l1: P.l, c2: o.c2, l2: o.l2 }; arr.dir = 'cima'; }
        else if(mx === dDir){ S.prev = { c1: o.c1, l1: o.l1, c2: P.c, l2: o.l2 }; arr.dir = 'dir'; }
        else { S.prev = { c1: P.c, l1: o.l1, c2: o.c2, l2: o.l2 }; arr.dir = 'esq'; }
        pintar(); return;
      }
      if(arr.modo === 'cols') S.sel.c2 = P.c; else if(arr.modo === 'lins') S.sel.l2 = P.l; else { S.sel.c2 = P.c; S.sel.l2 = P.l; }
      pintarSelecao();
    });
    function soltar(e){
      clearInterval(rolagem); rolagem = null;
      if(!arr) return;
      var x = arr; arr = null;
      if(x.modo === 'larg' || x.modo === 'alt'){ if(x.mexeu && S.pode.criar){ S.pendente = true; estadoSalvo(); } return; }
      if(x.modo === 'alca'){ var pv = S.prev; S.prev = null; if(pv && x.dir) preencher(x.orig, pv, x.dir, e && e.ctrlKey); else pintar(); return; }
      if(x.modo === 'toque' && e && e.type === 'pointerup'){
        var P = x.P; if(!P.c || !P.l) return;
        var mesma = S.sel && S.sel.c1 === P.c && S.sel.l1 === P.l && S.sel.c2 === P.c && S.sel.l2 === P.l;
        if(p0Y(x) < G.hh) S.sel = { c1: P.c, l1: 1, c2: P.c, l2: G.nl };
        else if(p0X(x) < G.hw) S.sel = { c1: 1, l1: P.l, c2: G.nc, l2: P.l };
        else S.sel = { c1: P.c, l1: P.l, c2: P.c, l2: P.l };
        pintarSelecao();
        if(mesma && S.pode.criar) comecarEdicao();
      }
    }
    function p0X(x){ return x.x - v.getBoundingClientRect().left; } function p0Y(x){ return x.y - v.getBoundingClientRect().top; }
    v.addEventListener('pointerup', soltar); v.addEventListener('pointercancel', function(){ arr = null; clearInterval(rolagem); S.prev = null; });
    v.addEventListener('dblclick', function(e){
      var p = local(e), b = bordaCab(p);
      if(b && b.eixo === 'c' && S.pode.criar){ ajustarColuna(b.n); return; }
      if(p.x > G.hw && p.y > G.hh && e.target.id !== 'plEd' && !(e.target.closest && e.target.closest('[data-fc]'))) comecarEdicao();
    });
    v.addEventListener('contextmenu', function(e){
      if(e.target.id === 'plEd') return;
      e.preventDefault();
      var p = local(e), P = celulaEm(p.x, p.y), n = norm(S.sel);
      if(S.ed) confirmarEdicao();
      if(P.c && P.l && !(P.c >= n.c1 && P.c <= n.c2 && P.l >= n.l1 && P.l <= n.l2)){ S.sel = { c1: P.c, l1: P.l, c2: P.c, l2: P.l }; pintarSelecao(); }
      menuContexto(e.clientX, e.clientY);
    });
    g.addEventListener('keydown', teclaGrade);
    document.addEventListener('copy', function(e){ if(S.ed || document.activeElement !== g) return; e.preventDefault(); e.clipboardData.setData('text/plain', copiar(false)); });
    document.addEventListener('cut', function(e){ if(S.ed || document.activeElement !== g || !S.pode.criar) return; e.preventDefault(); e.clipboardData.setData('text/plain', copiar(true)); });
    document.addEventListener('paste', function(e){ if(S.ed || document.activeElement !== g) return; e.preventDefault(); colar(e.clipboardData.getData('text/plain')); });
    /* caixa de nome: digitar B12 ou A1:C5 (ou Aba!B2) e Enter */
    var en = $('plEnd');
    en.addEventListener('focus', function(){ en.select(); });
    en.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){ e.preventDefault(); atualizarBarra(); g.focus({ preventScroll: true }); return; }
      if(e.key !== 'Enter') return;
      e.preventDefault();
      var t = en.value.trim().replace(/\s/g, ''), ai = S.ativa, m0 = /^(?:'?([^'!]+)'?!)?\$?([A-Za-z]{1,3})\$?(\d+)(?::\$?([A-Za-z]{1,3})\$?(\d+))?$/.exec(t);
      if(!m0){ toast('Escreva a célula assim: B12, A1:C5 ou Aba!B2.', 'error'); return; }
      if(m0[1]){ ai = S.pasta.abas.findIndex(function(a){ return a.nome.toLowerCase() === m0[1].toLowerCase(); }); if(ai < 0){ toast('Não existe a aba "' + m0[1] + '".', 'error'); return; } }
      if(ai !== S.ativa) trocarAba(ai);
      var c1 = M.colNum(m0[2]), l1 = +m0[3], c2 = m0[4] ? M.colNum(m0[4]) : c1, l2 = m0[5] ? +m0[5] : l1;
      irPara(c1, l1); if(m0[4]){ S.sel.c2 = c2; S.sel.l2 = l2; pintarSelecao(); }
      g.focus({ preventScroll: true });
    });
    /* barra de fórmula */
    var fx = $('plFx');
    fx.addEventListener('focus', function(){ if(!S.pode.criar){ fx.blur(); return; } if(!S.ed) comecarEdicao(null, true); });
    fx.addEventListener('input', function(){ if(!S.ed) comecarEdicao(null, true); S.ed.formula = fx.value[0] === '='; S.ed.refPos = null; var ta = $('plEd'); if(ta){ ta.value = fx.value; ajustarLargura(ta); } else mascara(fx, cel(S.ed.r) || {}); });
    fx.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.altKey){ e.preventDefault(); confirmarEdicao('baixo'); }
      else if(e.key === 'Escape'){ e.preventDefault(); cancelarEdicao(); }
      else if(e.key === 'Tab'){ e.preventDefault(); confirmarEdicao('dir'); }
    });
    fx.addEventListener('blur', function(){ setTimeout(function(){ if(S.ed && S.ed.barra && document.activeElement !== fx && !arr) confirmarEdicao(); }, 150); });
    /* ferramentas */
    $('fDesfazer').onclick = desfazer; $('fRefazer').onclick = refazer;
    $('fFormato').onchange = function(){ var t = this.value; formatar(function(c){ if(t) c.t = t; else delete c.t; delete c.casas; }); };
    $('fReais').onclick = function(){ formato('reais'); }; $('fPct').onclick = function(){ formato('pct'); };
    $('fMenos').onclick = function(){ casas(-1); }; $('fMais').onclick = function(){ casas(1); };
    $('fB').onclick = function(){ alternar('b'); }; $('fI').onclick = function(){ alternar('i'); }; $('fQuebra').onclick = function(){ alternar('q'); };
    $('fEsq').onclick = function(){ alinhar('esq'); }; $('fCentro').onclick = function(){ alinhar('centro'); }; $('fDir').onclick = function(){ alinhar('dir'); };
    $('fCorTxt').setAttribute('data-abre-pop', '1'); $('fFundo').setAttribute('data-abre-pop', '1'); $('fBordas').setAttribute('data-abre-pop', '1');
    $('fOrdenar').setAttribute('data-abre-pop', '1'); $('fCongelar').setAttribute('data-abre-pop', '1'); $('fLinhas').setAttribute('data-abre-pop', '1'); $('plMais').setAttribute('data-abre-pop', '1');
    $('fCorTxt').onclick = function(){ menu(this, [{ titulo: 'Cor da letra' }].concat(CORES_TXT.map(function(c){ return { r: c.r, cor: c.k || 'var(--text)', f: function(){ formatar(function(x){ if(c.k) x.cor = c.k; else delete x.cor; }); } }; }))); };
    $('fFundo').onclick = function(){ menu(this, [{ titulo: 'Cor do fundo' }].concat(CORES.map(function(c){ return { r: c.r, cor: c.c, f: function(){ formatar(function(x){ if(c.k) x.fundo = c.k; else delete x.fundo; }); } }; }))); };
    $('fBordas').onclick = function(){ menu(this, [
      { r: 'Contorno em todas as marcadas', f: function(){ formatar(function(x){ x.borda = true; }); } },
      { r: 'Sem bordas', f: function(){ formatar(function(x){ delete x.borda; }); } }, '-',
      { r: aba().bordas === 'marcadas' ? '✓ No PDF, linhas só nas células com borda' : 'No PDF, linhas só nas células com borda', f: function(){ guardarDesfazer(); var a = aba(); if(a.bordas === 'marcadas') delete a.bordas; else a.bordas = 'marcadas'; mudou(); } }
    ]); };
    $('fMesclar').onclick = mesclar; $('fNota').onclick = nota; $('fSoma').onclick = autossoma;
    $('fOrdenar').onclick = function(){ menu(this, [
      { r: 'A→Z (do menor para o maior) pela coluna ' + M.colTxt(S.sel.c1), off: !S.pode.criar, f: function(){ ordenar(false); } },
      { r: 'Z→A (do maior para o menor) pela coluna ' + M.colTxt(S.sel.c1), off: !S.pode.criar, f: function(){ ordenar(true); } }
    ]); };
    $('fFiltro').onclick = alternarFiltro;
    $('fCongelar').onclick = function(){ var cg = congel(); menu(this, [
      { r: 'Congelar a 1ª linha', f: function(){ congelar(1, cg.c); } },
      { r: 'Congelar até a linha ' + S.sel.l1, off: S.sel.l1 < 1, f: function(){ congelar(S.sel.l1, cg.c); } },
      { r: 'Congelar a 1ª coluna', f: function(){ congelar(cg.l, 1); } },
      { r: 'Congelar até a coluna ' + M.colTxt(S.sel.c1), f: function(){ congelar(cg.l, S.sel.c1); } },
      { r: 'Congelar linhas e colunas acima e à esquerda de ' + M.ref(S.sel.c1, S.sel.l1), off: S.sel.c1 < 2 && S.sel.l1 < 2, f: function(){ congelar(S.sel.l1 - 1, S.sel.c1 - 1); } },
      '-', { r: 'Descongelar tudo', off: !cg.l && !cg.c, f: function(){ congelar(null, null); } }
    ]); };
    $('fLinhas').onclick = function(){ var n = norm(S.sel), ql = n.l2 - n.l1 + 1, qc = n.c2 - n.c1 + 1, ed = !S.pode.criar; menu(this, [
      { r: 'Inserir ' + (ql > 1 ? ql + ' linhas' : 'linha') + ' acima', off: ed, f: function(){ linhasColunas('linha', true); } },
      { r: 'Inserir ' + (ql > 1 ? ql + ' linhas' : 'linha') + ' abaixo', off: ed, f: function(){ linhasColunas('linha', true, true); } },
      { r: 'Excluir ' + (ql > 1 ? 'as linhas ' + n.l1 + ' a ' + n.l2 : 'a linha ' + n.l1), off: ed, f: function(){ linhasColunas('linha', false); } }, '-',
      { r: 'Inserir ' + (qc > 1 ? qc + ' colunas' : 'coluna') + ' à esquerda', off: ed, f: function(){ linhasColunas('coluna', true); } },
      { r: 'Inserir ' + (qc > 1 ? qc + ' colunas' : 'coluna') + ' à direita', off: ed, f: function(){ linhasColunas('coluna', true, true); } },
      { r: 'Excluir ' + (qc > 1 ? 'as colunas ' + M.colTxt(n.c1) + ' a ' + M.colTxt(n.c2) : 'a coluna ' + M.colTxt(n.c1)), off: ed, f: function(){ linhasColunas('coluna', false); } }, '-',
      { r: 'Preencher para baixo', k: 'Ctrl+D', off: ed || ql < 2, f: preencherAbaixo },
      { r: 'Preencher para a direita', k: 'Ctrl+R', off: ed || qc < 2, f: preencherDireita },
      { r: 'Ajustar a largura da coluna ao conteúdo', off: ed, f: function(){ for(var c = n.c1; c <= Math.min(n.c2, n.c1 + 50); c++) ajustarColuna(c, true); S.pendente = true; estadoSalvo(); geo(); pintar(true); } }
    ]); };
    $('plMais').onclick = function(){ menu(this, [
      { r: 'Versões', f: versoes }, { r: 'Baixar em PDF', f: function(){ janelaPdf(false); } }, { r: 'Baixar em Excel (.xlsx)', f: function(){ baixarXlsx(); } },
      { r: 'Guardar na pasta do cliente', off: !(S.doc && S.doc.processo_id), f: function(){ janelaPdf(true); } }, '-',
      { r: 'Importar um Excel (.xlsx) nesta planilha', off: !S.pode.criar, f: function(){ $('plImportar').click(); } },
      { r: 'Salvar uma cópia como modelo de planilha', off: !S.pode.criar, f: salvarComoModelo }
    ]); };
    $('plZoom').onchange = function(){ mudarZoom(+this.value); };
    $('zMenos').onclick = function(){ var i = ZOOMS.indexOf(S.zoom); mudarZoom(ZOOMS[Math.max(0, i - 1)]); };
    $('zMais').onclick = function(){ var i = ZOOMS.indexOf(S.zoom); mudarZoom(ZOOMS[Math.min(ZOOMS.length - 1, i + 1)]); };
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
  /* largura da coluna pelo maior texto (duplo clique na borda do cabeçalho) */
  var _medir = null;
  function ajustarColuna(c, semRedesenhar){
    _medir = _medir || document.createElement('canvas').getContext('2d');
    var a = aba(), mx = 30;
    _medir.font = '600 12.5px Montserrat, Arial, sans-serif';
    Object.keys(a.celulas).forEach(function(r){ var e = M.endereco(r); if(!e || e.c !== c) return; var ce = a.celulas[r]; if(ce.q) return; var t = M.mostrar(S.calc.valor(S.ativa, r), ce); String(t).split('\n').forEach(function(p){ mx = Math.max(mx, _medir.measureText(p).width + 16); }); });
    if(!semRedesenhar) guardarDesfazer();
    a.colunas = a.colunas || {}; a.colunas[M.colTxt(c)] = Math.min(600, Math.ceil(mx));
    if(!semRedesenhar){ S.pendente = true; estadoSalvo(); geo(); pintar(true); }
  }
  function teclaGrade(e){
    if(S.ed || e.target.id === 'plEd') return;
    var k = e.key, ctrl = e.ctrlKey || e.metaKey, s = S.sel;
    var cc = e.shiftKey ? s.c2 : s.c1, ll = e.shiftKey ? s.l2 : s.l1;
    var esc0 = escondidas();
    function proxLinha(l, d){ var x = l + d; while(x >= 1 && esc0[x]) x += d; return x < 1 ? l : x; }
    var setas = { ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowLeft: [-1, 0] };
    if(setas[k]){
      e.preventDefault();
      var d = setas[k];
      if(ctrl){ var p = pular(cc, ll, d[0], d[1]); irPara(p.c, p.l, e.shiftKey); return; }
      irPara(cc + d[0], d[1] ? proxLinha(ll, d[1]) : ll, e.shiftKey); return;
    }
    if(k === 'PageDown' || k === 'PageUp'){ e.preventDefault(); var pg = Math.max(1, Math.floor((S.med.h - G.hh - G.fh) / (ALT * z())) - 1); irPara(cc, Math.max(1, ll + (k === 'PageDown' ? pg : -pg)), e.shiftKey); return; }
    if(k === 'Home'){ e.preventDefault(); if(ctrl) irPara(1, 1, e.shiftKey); else irPara(1, ll, e.shiftKey); return; }
    if(k === 'End' && ctrl){ e.preventDefault(); var u = M.usada(aba()); irPara(Math.max(1, u.colunas), Math.max(1, u.linhas), e.shiftKey); return; }
    if(k === 'Enter'){ e.preventDefault(); var n = norm(s); if(n.c1 !== n.c2 || n.l1 !== n.l2) andarDentro(0, e.shiftKey ? -1 : 1); else irPara(s.c1, proxLinha(s.l1, e.shiftKey ? -1 : 1)); return; }
    if(k === 'Tab'){ e.preventDefault(); var n2 = norm(s); if(n2.c1 !== n2.c2 || n2.l1 !== n2.l2) andarDentro(e.shiftKey ? -1 : 1, 0); else irPara(s.c1 + (e.shiftKey ? -1 : 1), s.l1); return; }
    if(k === 'F2'){ e.preventDefault(); comecarEdicao(); return; }
    if(k === 'Escape'){ if(S.clip && S.clip.marca){ S.clip.marca = null; pintar(); } return; }
    if(k === 'Delete' || k === 'Backspace'){ e.preventDefault(); limparSelecao(); return; }
    if(e.altKey && (k === '=' || k === '+')){ e.preventDefault(); autossoma(); return; }
    if(ctrl){
      var kk = k.toLowerCase();
      if(kk === 'z'){ e.preventDefault(); if(e.shiftKey) refazer(); else desfazer(); return; }
      if(kk === 'y'){ e.preventDefault(); refazer(); return; }
      if(kk === 'b'){ e.preventDefault(); alternar('b'); return; }
      if(kk === 'i'){ e.preventDefault(); alternar('i'); return; }
      if(kk === 'd'){ e.preventDefault(); preencherAbaixo(); return; }
      if(kk === 'r'){ e.preventDefault(); preencherDireita(); return; }
      if(kk === 'a'){ e.preventDefault(); var r0 = regiao(s.c1, s.l1), n3 = norm(s), u2 = M.usada(aba()); if(r0.c1 === n3.c1 && r0.c2 === n3.c2 && r0.l1 === n3.l1 && r0.l2 === n3.l2 || (r0.c1 === r0.c2 && r0.l1 === r0.l2)) S.sel = { c1: 1, l1: 1, c2: Math.max(u2.colunas, 1), l2: Math.max(u2.linhas, 1) }; else S.sel = { c1: r0.c1, l1: r0.l1, c2: r0.c2, l2: r0.l2 }; pintarSelecao(); return; }
      if(k === ';'){ e.preventDefault(); if(!S.pode.criar) return; var h = new Date(); guardarDesfazer(); var a = aba(), r = ativaRef(); a.celulas[r] = Object.assign(a.celulas[r] || {}, { v: M.dataSerie(h.getDate(), h.getMonth() + 1, h.getFullYear()), t: 'data' }); delete a.celulas[r].f; mudou(); return; }
      if(k === '+' || k === '='){ e.preventDefault(); var i0 = ZOOMS.indexOf(S.zoom); mudarZoom(ZOOMS[Math.min(ZOOMS.length - 1, i0 + 1)]); return; }
      if(k === '-'){ e.preventDefault(); var i1 = ZOOMS.indexOf(S.zoom); mudarZoom(ZOOMS[Math.max(0, i1 - 1)]); return; }
      return;
    }
    if(k.length === 1 && !e.altKey){ e.preventDefault(); comecarEdicao(k); if(S.ed) S.ed.digitando = true; var ta = $('plEd'); if(ta){ mascara(ta, cel(ativaRef()) || {}); $('plFx').value = ta.value; } }
  }
  /* cópia desta planilha como MODELO DE PLANILHA (sem cliente; aparece em Modelos > Planilhas) */
  function salvarComoModelo(){
    janela('jModelo', 'Salvar como modelo de planilha', 'Uma cópia desta planilha vira modelo (sem cliente) e aparece em Modelos &gt; Planilhas &gt; Modelos de planilha, para começar outras iguais. Apague antes os dados que não devem ir para o modelo.',
      '<label class="rot" for="mdNome">Nome do modelo</label><input class="campo" id="mdNome" maxlength="200"><div class="erro-campo" id="mdErro"></div>',
      '<button class="btn" type="button" data-fechar>Cancelar</button><button class="btn btn-ouro" type="button" id="mdOk">Salvar o modelo</button>');
    $('mdNome').value = 'Modelo: ' + ($('plTitulo').value.trim() || 'Planilha');
    $('mdOk').onclick = async function(){
      var b = this, nome = $('mdNome').value.trim(); if(!nome){ $('mdErro').textContent = 'Dê um nome ao modelo.'; return; }
      b.disabled = true; b.textContent = 'Salvando…';
      try{
        if(S.ed) confirmarEdicao();
        var r = await _sb.rpc('editavel_salvar', { p_id: null, p_tipo: 'planilha', p_titulo: nome, p_conteudo: JSON.parse(JSON.stringify(S.pasta)), p_versao_base: null, p_processo_id: null, p_pessoa_id: null, p_pasta_id: null, p_modelo: 'modelo_planilha', p_calculo_id: null, p_nota: null });
        if(r.error) throw r.error;
        fecharJanela('jModelo'); toast('Modelo "' + nome + '" salvo em Modelos > Planilhas.', 'success');
      }catch(e){ $('mdErro').textContent = 'Não salvei o modelo. Motivo: ' + msgErro(e) + '.'; }
      finally{ b.disabled = false; b.textContent = 'Salvar o modelo'; }
    };
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
    if(!S.ctx.pessoa && !S.ctx.processo) partes.unshift('<span class="pl-chip">' + (d.modelo === 'modelo_planilha' ? 'Modelo de planilha' : 'Do escritório (sem cliente)') + '</span>');
    if(!S.pode.criar) partes.push('<span class="pl-chip">Só leitura</span>');
    info.innerHTML = partes.join('');
    $('plSalvar').disabled = !S.pode.criar;
    var vb = $('plVoltar'); if(vb){ vb.querySelector('span').textContent = rotuloVoltar(); vb.title = rotuloVoltar() + ' (Alt+←)'; }
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
      var u = new URL(location.href); if(u.searchParams.get('doc') !== d.id){ ['novo', 'modelo', 'modelo_planilha', 'processo', 'pessoa', 'pasta'].forEach(function(k){ u.searchParams.delete(k); }); u.searchParams.set('doc', d.id); history.replaceState(history.state, '', u.toString()); }
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
      if(a.congelar && (a.congelar.l || a.congelar.c)) ws.views = [{ state: 'frozen', xSplit: a.congelar.c || 0, ySplit: a.congelar.l || 0 }];
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
        var fonte = {}; if(ce.b) fonte.bold = true; if(ce.i) fonte.italic = true; if(ce.fundo === 'titulo'){ fonte.color = { argb: 'FFFFFFFF' }; fonte.bold = true; } else if(ce.cor && /^#[0-9a-f]{6}$/i.test(ce.cor)) fonte.color = { argb: 'FF' + ce.cor.slice(1).toUpperCase() };
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
        var vw = (ws.views || [])[0], cong = vw && vw.state === 'frozen' && (vw.xSplit || vw.ySplit) ? { l: vw.ySplit || 0, c: vw.xSplit || 0 } : null;
        if(ws.state && ws.state !== 'visible') avisos.push('A aba "' + ws.name + '" estava oculta no Excel e veio junto.');
        var a = { nome: ws.name.slice(0, 31), celulas: {}, colunas: {}, linhas: {}, mesclas: [] }; if(cong) a.congelar = cong;
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
            if(xc.font){ if(xc.font.bold) ce.b = true; if(xc.font.italic) ce.i = true; var fa = xc.font.color && xc.font.color.argb; if(fa && /^[0-9a-f]{8}$/i.test(fa)){ var fh = fa.slice(2).toUpperCase(); if(fh !== '000000' && fh !== 'FFFFFF') ce.cor = '#' + fh.toLowerCase(); } }
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
      S.avisosTela = (S.avisosTela || []).filter(function(a){ return !a.importou && !a.importar; });
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
          var txtCor = M.ehErro(it.v) ? P.rgb(0.75, 0.1, 0.1) : (ce.fundo === 'titulo' ? P.rgb(1, 1, 1) : (ce.cinza ? P.rgb(0.4, 0.45, 0.52) : (ce.cor && /^#[0-9a-f]{6}$/i.test(ce.cor) ? P.rgb.apply(null, hexRgb(ce.cor)) : P.rgb(0.07, 0.1, 0.16))));
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
          if(!ex.error && ex.data && ex.data.length){ location.replace('editor_planilha.html?doc=' + ex.data[0].id + '&v=' + encodeURIComponent(q.get('v') || '') + (q.get('voltar') ? '&voltar=' + encodeURIComponent(q.get('voltar')) : '')); return; }
          var mo = await SagaCalculosPlanilhas.montar({ sb: _sb, processoId: proc, modelo: modelo });
          S.pasta = mo.pasta; S.doc.modelo = modelo; S.doc.calculo_id = mo.calculo_id || null; S.doc.titulo = mo.titulo; S.pendente = false; /* montada agora: 'Ainda não salvo' (nada foi mudado à mão) */
          (mo.avisosTela || []).forEach(function(a){ S.avisosTela.push(a); });
        } else if(q.get('modelo_planilha')){
          /* começar de um MODELO DE PLANILHA (Modelos > Planilhas): o conteúdo do modelo vira uma planilha nova */
          var mp = await _sb.from('documentos_editaveis').select('titulo,conteudo,modelo').eq('id', q.get('modelo_planilha')).maybeSingle();
          if(mp.error) throw mp.error; if(!mp.data) throw new Error('modelo de planilha não encontrado (ou sem permissão para ver)');
          S.pasta = mp.data.conteudo && mp.data.conteudo.abas ? JSON.parse(JSON.stringify(mp.data.conteudo)) : M.pastaNova();
          S.doc.titulo = (q.get('titulo') || mp.data.titulo.replace(/^Modelo:\s*/i, '')).slice(0, 200);
          S.pendente = true;
          S.avisosTela.push({ tipo: 'atencao', titulo: 'Planilha nova a partir do modelo "' + mp.data.titulo + '".', texto: 'Ainda não foi salva: confira e clique em Salvar. O modelo continua como estava.' });
        } else S.pasta = M.pastaNova();
        if(q.get('novo') === 'modelo'){ S.doc.modelo = 'modelo_planilha'; S.doc.processo_id = null; S.doc.pessoa_id = null; S.ctx = {}; S.doc.titulo = q.get('titulo') || 'Modelo: nova planilha'; }
        else if(q.get('titulo') && !S.doc.titulo) S.doc.titulo = q.get('titulo').slice(0, 200);
        S.doc.titulo = S.doc.titulo || 'Planilha';
      }
      $('plTitulo').value = (S.doc && S.doc.titulo) || 'Planilha';
      document.title = 'VMMADV | ' + $('plTitulo').value;
      S.ativa = Math.min(S.pasta.ativa || 0, S.pasta.abas.length - 1);
      S.sel = { c1: 1, l1: 1, c2: 1, l2: 1 };
      if(!S.pode.criar) S.avisosTela.push({ tipo: 'atencao', titulo: 'Só leitura.', texto: 'Seu perfil não tem a permissão de criar documentos dos clientes: dá para ver, baixar em PDF e em Excel, mas não salvar.' });
      if(q.get('importar') === '1' && !docId && S.pode.criar){
        S.avisosTela.push({ tipo: 'atencao', importar: true, titulo: 'Planilha nova a partir de um Excel.', texto: 'Escolha o arquivo (.xlsx): ele é lido neste computador e nada vai para site de fora.', acao: { rotulo: 'Escolher o arquivo Excel', fazer: function(){ $('plImportar').click(); } } });
      }
      redesenhar(); estadoSalvo();
      $('plCaixa').focus({ preventScroll: true });
      if(q.get('arquivo_bib') && !docId) abrirArquivoBiblioteca(q.get('arquivo_bib'));
    }catch(e){
      $('plRaiz').innerHTML = '<div class="aviso erro" style="margin-top:18px"><div><b>Não consegui abrir a planilha.</b>Motivo: ' + esc(msgErro(e)) + '. Atualize a página (F5) ou volte à ficha.</div></div>';
    }
  }
  /* arquivo .xlsx da pasta "Planilhas Contábeis" (Arquivos de Modelos): abre uma CÓPIA no editor; o original não muda */
  async function abrirArquivoBiblioteca(id){
    try{
      var r = await _sb.from('biblioteca_arquivos').select('nome_arquivo,caminho_storage').eq('id', id).maybeSingle();
      if(r.error) throw r.error; if(!r.data) throw new Error('arquivo não encontrado (ou sem permissão para ver os arquivos)');
      if(!/\.xlsx$/i.test(r.data.nome_arquivo)) throw new Error('só arquivos .xlsx abrem no editor');
      var b = await _sb.storage.from('biblioteca-arquivos').download(r.data.caminho_storage);
      if(b.error) throw b.error;
            await importarXlsx({ name: r.data.nome_arquivo, arrayBuffer: function(){ return b.data.arrayBuffer(); } });
    }catch(e){ avisoErro('Não consegui abrir o arquivo da pasta Planilhas Contábeis.', e); }
  }
  /* troca o conteúdo pelo do modelo (ex.: cálculo mais novo) sem perder o histórico */
  function aplicarModelo(pasta, calculoId){ guardarDesfazer(); S.pasta = pasta; S.ativa = 0; if(calculoId) S.doc.calculo_id = calculoId; S.sel = { c1: 1, l1: 1, c2: 1, l2: 1 }; mudou(); }

  window.SagaPlanilhas = { estado: S, gerarPdf: gerarPdf, montarXlsx: montarXlsx, importarXlsx: importarXlsx, redesenhar: redesenhar, desenharAvisos: desenharAvisos, aplicarModelo: aplicarModelo };
  iniciar().catch(function(e){ var r = $('plRaiz'); if(r) r.innerHTML = '<div class="aviso erro"><div><b>A tela da planilha não abriu direito.</b>Motivo: ' + esc(msgErro(e)) + '. Atualize a página (F5).</div></div>'; });
})();
