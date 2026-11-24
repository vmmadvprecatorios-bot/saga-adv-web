/* SAGA · Modelos > Planilhas (23/11/2026, Dr. Victor pelo Diário 5: "quero uma TELA de planilhas, uma aba no menu
   lateral só para isso; pode ser dentro de Modelos"; bloco 440).
   Lista TODAS as planilhas do SAGA (documentos_editaveis tipo planilha): de clientes (por cliente/processo), do
   escritório (sem cliente), modelos de planilha (modelo = 'modelo_planilha') e os arquivos .xlsx da pasta
   "Planilhas Contábeis" dos Arquivos. Busca, filtros, "+ Nova planilha" (em branco, para um cliente, de um modelo,
   importar Excel) e abrir no editor em tela inteira com o Voltar para cá (editor_planilha.html?...&voltar=...).
   Carregado por 1 linha no fim do biblioteca_padrao_metalico_FINAL.html; a árvore (saga_biblioteca_timbrados.js)
   mostra a seção quando a vista é 'planilhas' (?aba=planilhas). Ler: documentos.visualizar; criar: documentos.criar;
   tirar da lista: só o administrador (editavel_tirar, só desativa). */
(function(){
  'use strict';
  var POR_PAG = 50, EDITOR = 'editor_planilha.html', FICHA = 'ficha_cliente_padrao_metalico_FINAL.html';
  var S = { tipo: 'todas', busca: '', pag: 0, total: 0, lista: [], carregado: false, vez: 0, contas: {}, arquivos: [], tBusca: null, erroContas: '' };
  function $(id){ return document.getElementById(id); }
  function esc(v){ if(window.sagaEsc) return window.sagaEsc(v); var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function sb(){ return window._sb; }
  function erroTxt(e){ return (window.sagaErroBanco ? sagaErroBanco(e) : (e && e.message)) || String(e); }
  function perms(){ try{ var g = JSON.parse(localStorage.getItem('saga-permissoes') || 'null'); return (g && g.perms) || []; }catch(e){ return []; } }
  function podeCriar(){ if(S.pc != null) return S.pc; var p = perms(); return p.indexOf('documentos.criar') >= 0 || document.documentElement.classList.contains('saga-pode-apagar'); }
  function podeTirar(){ return document.documentElement.classList.contains('saga-pode-apagar'); }
  function versao(){ var sc = document.querySelector('script[src*="saga_planilhas_lista.js"]'); var m = sc && /[?&]v=([^&]+)/.exec(sc.src); return m ? m[1] : ''; }
  function voltarAqui(){ return 'biblioteca_padrao_metalico_FINAL.html?aba=planilhas'; }
  function urlEditor(q){ return EDITOR + '?' + q + (versao() ? '&v=' + versao() : '') + '&voltar=' + encodeURIComponent(voltarAqui()); }
  function ir(ev, url){ if(ev && (ev.ctrlKey || ev.metaKey || ev.button === 1)){ window.open(url, '_blank', 'noopener'); return; } (window.sagaIrPara || function(u){ location.href = u; })(url); }
  function toast(t, tipo){ if(window.showToast) showToast(t, tipo || 'info'); }
  function dataBR(d){ try{ return new Date(d).toLocaleDateString('pt-BR'); }catch(e){ return ''; } }
  function cnj(n){ try{ return window.sagaFmt && sagaFmt.cnj ? sagaFmt.cnj(n) : n; }catch(e){ return n; } }
  var TIPOS = [ { k: 'todas', r: 'Todas' }, { k: 'clientes', r: 'De clientes' }, { k: 'escritorio', r: 'Do escritório' }, { k: 'modelos', r: 'Modelos de planilha' }, { k: 'contabeis', r: 'Planilhas Contábeis' } ];

  function css(){
    if($('plListaCss')) return;
    var s = document.createElement('style'); s.id = 'plListaCss';
    s.textContent = [
      '#plSecao .pls-ferr{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 10px}',
      '#plSecao .pls-busca{flex:1 1 240px;min-width:0;height:36px;border-radius:10px;border:1px solid var(--border-soft);background:var(--panel);color:var(--text);padding:0 12px;font:inherit;font-size:12.5px}',
      '#plSecao .pls-filtros{display:flex;gap:4px;flex-wrap:wrap;padding:3px;border:1px solid var(--border-soft);border-radius:12px;background:var(--panel);margin-bottom:10px;width:max-content;max-width:100%}',
      '#plSecao .pls-filtros button{height:30px;padding:0 12px;border-radius:9px;font:inherit;font-size:12px;color:var(--muted);border:1px solid transparent;background:none;cursor:pointer;transition:background .2s cubic-bezier(.22,.78,.25,1),color .2s}',
      '#plSecao .pls-filtros button.active{color:var(--text);background:color-mix(in srgb,var(--gold) 14%,transparent);border-color:color-mix(in srgb,var(--gold) 45%,transparent)}',
      '#plSecao .pls-filtros small{margin-left:5px;opacity:.75;font-variant-numeric:lining-nums tabular-nums}',
      '#plSecao .pls-lista{display:flex;flex-direction:column;gap:6px}',
      '#plSecao .pls-item{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 12px;border:1px solid var(--border-soft);border-radius:12px;background:var(--panel);color:var(--text);text-decoration:none;transition:border-color .2s cubic-bezier(.22,.78,.25,1),background .2s}',
      '#plSecao .pls-item:hover{border-color:color-mix(in srgb,var(--gold) 45%,var(--border-soft))}',
      '#plSecao .pls-ic{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--gold) 13%,transparent);color:var(--gold)}',
      '#plSecao .pls-txt{min-width:0;display:flex;flex-direction:column;gap:2px}',
      '#plSecao .pls-txt b{font-weight:600;font-size:13px;overflow-wrap:anywhere}',
      '#plSecao .pls-txt span{font-size:11.5px;color:var(--muted);overflow-wrap:anywhere}',
      '#plSecao .pls-sel{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.3px;padding:1px 7px;border-radius:999px;border:1px solid var(--border-soft);margin-right:6px;color:var(--text)}',
      '#plSecao .pls-acoes{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}',
      '#plSecao .pls-acoes :is(a,button),#plSecao .pls-pag>button,#plsNova,.pls-rod button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border-radius:10px;font:inherit;font-size:12px;font-weight:500;text-decoration:none;white-space:nowrap;cursor:pointer;color:var(--text);border:1px solid var(--sb-sec-borda,var(--border-soft));background:var(--sb-sec,var(--panel));transition:border-color .2s cubic-bezier(.22,.78,.25,1),background .2s}',
      '#plSecao .pls-acoes :is(a,button):hover,#plsNova:hover,.pls-rod button:hover{border-color:color-mix(in srgb,var(--gold) 50%,var(--border-soft))}',
      '#plSecao .pls-acoes .btn-primario,#plsNova,.pls-rod .btn-primario{border-color:color-mix(in srgb,var(--gold) 55%,transparent);background:color-mix(in srgb,var(--gold) 15%,var(--panel))}',
      '#plsNova{height:36px}',
      '.pls-rod .btn-perigo{color:var(--danger,#e5484d);border-color:color-mix(in srgb,var(--danger,#e5484d) 45%,transparent)}',
      '#plSecao .pls-acoes :is(a,button):disabled,#plSecao .pls-pag>button:disabled{opacity:.45;cursor:default}',
      '#plSecao .pls-pag{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12px;color:var(--muted)}#plSecao .pls-pag>.sg-pag{flex:1;margin:0}',
      '#plSecao .pls-erro{border:1px solid color-mix(in srgb,var(--danger,#e5484d) 55%,transparent);background:color-mix(in srgb,var(--danger,#e5484d) 9%,transparent);border-radius:12px;padding:10px 12px;font-size:12.5px;margin-bottom:10px}',
      '#plSecao .pls-vazio{padding:22px;text-align:center;color:var(--muted);font-size:13px;border:1px dashed var(--border-soft);border-radius:12px}',
      '.pls-mo{position:fixed;inset:0;z-index:2500;display:flex;align-items:safe center;justify-content:center;padding:18px;background:rgba(6,10,20,.6);opacity:0;visibility:hidden;transition:opacity .26s cubic-bezier(.22,.78,.25,1),visibility 0s linear .26s;overflow-y:auto}',
      '.pls-mo.aberto{opacity:1;visibility:visible;transition:opacity .26s cubic-bezier(.22,.78,.25,1),visibility 0s}',
      'html[data-movimento="reduzido"] .pls-mo{transition:none}',
      '.pls-md{width:100%;max-width:560px;max-height:100%;display:flex;flex-direction:column;border-radius:18px;background:var(--panel-solid);border:1px solid var(--border);box-shadow:var(--shadow);transform:translateY(10px) scale(.985);transition:transform .34s cubic-bezier(.22,.78,.25,1)}',
      '.pls-mo.aberto .pls-md{transform:none}',
      '.pls-md h2{font-family:"Cormorant Garamond",serif;font-size:22px;font-weight:600;padding:16px 18px 4px;margin:0}',
      '.pls-md .pls-sub{font-size:12px;color:var(--muted);padding:0 18px 10px;border-bottom:1px solid var(--border-soft);line-height:1.5}',
      '.pls-md .pls-corpo{padding:14px 18px;display:flex;flex-direction:column;gap:9px;overflow-y:auto;min-height:0}',
      '.pls-md .pls-rod{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:10px 18px 16px;border-top:1px solid var(--border-soft)}',
      '.pls-md label.rot{font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-weight:600}',
      '.pls-md .campo{height:36px;border-radius:10px;border:1px solid var(--border-soft);background:var(--panel);color:var(--text);padding:0 10px;font:inherit;font-size:12.5px;width:100%}',
      '.pls-md .pls-res{display:flex;flex-direction:column;gap:4px;height:220px;overflow-y:auto;border:1px solid var(--border-soft);border-radius:10px;padding:5px}',
      '.pls-md .pls-res button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;padding:7px 9px;border-radius:8px;font:inherit;font-size:12.5px;color:var(--text);background:none;border:1px solid transparent;cursor:pointer}',
      '.pls-md .pls-res button:hover,.pls-md .pls-res button:focus-visible{background:color-mix(in srgb,var(--gold) 11%,transparent)}',
      '.pls-md .pls-res small{color:var(--muted);font-size:11px}',
      '.pls-md .pls-erro-campo{font-size:12px;color:var(--danger,#e5484d)}.pls-md .pls-erro-campo:empty{display:none}',
      '.pls-md .pls-dica{font-size:11.5px;color:var(--muted);line-height:1.5}',
      '.pls-op{display:flex;flex-direction:column;gap:6px}',
      '.pls-op button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:10px 12px;border-radius:11px;border:1px solid var(--border-soft);background:var(--panel);color:var(--text);font:inherit;font-size:13px;cursor:pointer;transition:border-color .2s}',
      '.pls-op button:hover,.pls-op button:focus-visible{border-color:color-mix(in srgb,var(--gold) 50%,var(--border-soft))}',
      '.pls-op button small{color:var(--muted);font-size:11.5px}',
      '@media (max-width:640px){#plSecao .pls-item{grid-template-columns:30px minmax(0,1fr)}#plSecao .pls-acoes{grid-column:1/-1;justify-content:flex-start}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  var IC_TAB = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M4 15h16M10 4v16"/></svg>';

  /* ---------------- janela simples (formulário no meio da tela) ---------------- */
  function janela(titulo, sub, corpo, rodape){
    var j = $('plsJanela');
    if(!j){ j = document.createElement('div'); j.id = 'plsJanela'; j.className = 'pls-mo'; j.setAttribute('role', 'dialog'); j.setAttribute('aria-modal', 'true'); j.setAttribute('data-saga-movimento-proprio', '1'); document.body.appendChild(j);
      j.addEventListener('click', function(e){ if(e.target === j) fechar(); });
      document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && j.classList.contains('aberto')){ e.stopPropagation(); fechar(); } }, true); }
    j.innerHTML = '<div class="pls-md"><h2>' + esc(titulo) + '</h2>' + (sub ? '<div class="pls-sub">' + sub + '</div>' : '') + '<div class="pls-corpo">' + corpo + '</div><div class="pls-rod">' + (rodape || '<button type="button" class="btn-secundario" data-fechar>Cancelar</button>') + '</div></div>';
    j.querySelectorAll('[data-fechar]').forEach(function(b){ b.onclick = fechar; });
    requestAnimationFrame(function(){ j.classList.add('aberto'); });
    return j;
  }
  function fechar(){ var j = $('plsJanela'); if(j) j.classList.remove('aberto'); }

  /* ---------------- montagem da seção dentro de Modelos ---------------- */
  function montar(){
    var painel = $('painelTimbrados');
    if(!painel) return false;
    if($('plSecao')) return true;
    css();
    var sec = document.createElement('section');
    sec.className = 'tb-sec'; sec.id = 'plSecao';
    sec.innerHTML =
      '<h2>Planilhas</h2>' +
      '<p class="tb-sub">Todas as planilhas do SAGA: as de cada cliente, as do escritório e os modelos. Abra para editar em tela inteira (fórmulas, várias abas, PDF no papel timbrado e Excel); o "Voltar" do editor traz você de volta para cá.</p>' +
      '<div class="pls-ferr"><input type="search" class="pls-busca" id="plsBusca" placeholder="Buscar planilha, cliente ou código VMM" aria-label="Buscar planilha">' +
        '<button type="button" class="btn-primario" id="plsNova" hidden>+ Nova planilha</button></div>' +
      '<div class="pls-filtros" id="plsFiltros" role="group" aria-label="Que planilhas mostrar">' + TIPOS.map(function(t){ return '<button type="button" data-t="' + t.k + '"' + (t.k === S.tipo ? ' class="active"' : '') + '>' + esc(t.r) + '<small data-n="' + t.k + '"></small></button>'; }).join('') + '</div>' +
      '<div id="plsErro"></div><div class="pls-lista" id="plsLista"><div class="pls-vazio">Carregando as planilhas…</div></div><div class="pls-pag" id="plsPag"></div>';
    painel.appendChild(sec);
    $('plsFiltros').addEventListener('click', function(e){ var b = e.target.closest('[data-t]'); if(!b) return; escolherTipo(b.getAttribute('data-t')); });
    $('plsBusca').addEventListener('input', function(){ clearTimeout(S.tBusca); var v = this.value; S.tBusca = setTimeout(function(){ S.busca = v.trim(); S.pag = 0; carregar(); }, 320); });
    $('plsNova').addEventListener('click', novaPlanilha);
    if(podeCriar()) $('plsNova').hidden = false;
    /* a permissão vem do saga_inicio (uma vez por tela): mostra o botão e redesenha a lista quando chegar */
    if(window.sagaPode) Promise.resolve(window.sagaPode('documentos.criar')).then(function(ok){ S.pc = !!ok; $('plsNova').hidden = !ok; if(S.lista.length) desenhar(); }).catch(function(){});
    /* voltar pela seta do navegador: filtros, busca e página como estavam (SagaVolta) */
    if(window.SagaVolta && SagaVolta.registrar){
      try{ SagaVolta.registrar('planilhas', { ler: function(){ return { tipo: S.tipo, busca: S.busca, pag: S.pag }; }, aplicar: function(o){ if(!o) return; S.tipo = o.tipo || 'todas'; S.busca = o.busca || ''; S.pag = o.pag || 0; $('plsBusca').value = S.busca; marcarTipo(); if(S.carregado) carregar(); }, rolagem: [] }); }catch(e){}
    }
    return true;
  }
  function marcarTipo(){ var f = $('plsFiltros'); if(!f) return; f.querySelectorAll('[data-t]').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-t') === S.tipo); }); }
  function escolherTipo(t){ if(t === S.tipo) return; S.tipo = t; S.pag = 0; marcarTipo(); setTimeout(carregar, 0); }

  /* ---------------- dados ---------------- */
  async function contas(){
    try{
      var base = function(){ return sb().from('documentos_editaveis').select('id', { count: 'exact', head: true }).eq('tipo', 'planilha').eq('ativo', true); };
      var r = await Promise.all([ base(), base().not('pessoa_id', 'is', null), base().is('pessoa_id', null).or('modelo.is.null,modelo.neq.modelo_planilha'), base().eq('modelo', 'modelo_planilha'), arquivosContabeis() ]);
      r.slice(0, 4).forEach(function(x){ if(x.error) throw x.error; });
      S.contas = { todas: r[0].count, clientes: r[1].count, escritorio: r[2].count, modelos: r[3].count, contabeis: S.arquivos.length };
      S.erroContas = '';
    }catch(e){ S.erroContas = erroTxt(e); }
    ouvintes.forEach(function(fn){ try{ fn(); }catch(e){} });
    var f = $('plsFiltros'); if(!f) return;
    f.querySelectorAll('[data-n]').forEach(function(s){ var n = S.contas[s.getAttribute('data-n')]; s.textContent = n == null ? '' : String(n); });
  }
  async function arquivosContabeis(){
    var c = await sb().from('biblioteca_categorias').select('id,nome').ilike('nome', '%planilh%');
    if(c.error) throw c.error;
    var ids = (c.data || []).map(function(x){ return x.id; });
    if(!ids.length){ S.arquivos = []; return; }
    var a = await sb().from('biblioteca_arquivos').select('id,nome_arquivo,categoria_id,criado_em').in('categoria_id', ids).eq('ativo', true).order('nome_arquivo').limit(500);
    if(a.error) throw a.error;
    S.arquivos = a.data || [];
  }
  async function idsDePessoas(q){
    var termo = q.replace(/[%_\\,()]/g, ' ').trim(); if(!termo) return [];
    var r = await sb().from('pessoas').select('id').or('nome_completo.ilike.*' + termo + '*,codigo.ilike.*' + termo + '*').limit(300);
    if(r.error) throw r.error;
    return (r.data || []).map(function(x){ return x.id; });
  }
  async function carregar(){
    if(!montar()) return;
    var vez = ++S.vez, lista = $('plsLista'), erro = $('plsErro');
    erro.innerHTML = '';
    if(!S.carregado){ S.carregado = true; contas(); }
    if(S.tipo === 'contabeis'){ desenharArquivos(); return; }
    lista.setAttribute('aria-busy', 'true');
    try{
      var ids = S.busca ? await idsDePessoas(S.busca) : [];
      if(vez !== S.vez) return;
      function montar(){
      var q = sb().from('documentos_editaveis').select('id,titulo,modelo,versao,atualizado_em,processo_id,pessoa_id,pessoas(nome_completo,codigo),processos(codigo,numero_processo_cnj)', { count: 'exact' }).eq('tipo', 'planilha').eq('ativo', true);
      if(S.tipo === 'clientes') q = q.not('pessoa_id', 'is', null);
      else if(S.tipo === 'escritorio') q = q.is('pessoa_id', null).or('modelo.is.null,modelo.neq.modelo_planilha');
      else if(S.tipo === 'modelos') q = q.eq('modelo', 'modelo_planilha');
      if(S.busca){
        var termo = S.busca.replace(/[%_\\,()]/g, ' ').trim();
        var ors = ['titulo.ilike.*' + termo + '*'];
        if(ids.length) ors.push('pessoa_id.in.(' + ids.join(',') + ')');
        q = q.or(ors.join(','));
      }
      return q.order('atualizado_em', { ascending: false });
      }
      // 24/11 (Dr. Victor): paginação comum (saga_paginacao.js); S.pag continua contando de 0
      var P = pag(); P.pagina = (S.pag || 0) + 1;
      var r = await SagaPaginacao.buscarEmPartes(function(off, lim){ return montar().range(off, off + lim - 1).then(function(x){ return x.error ? x : { linhas: x.data, total: x.count }; }); },
        { offset: P.offset(), quantos: P.quantos(), lote: 1000 });
      if(vez !== S.vez) return;
      if(r.error) throw r.error;
      S.lista = r.linhas || []; S.total = r.total || 0; P.total(S.total); S.pag = P.pagina - 1;
      desenhar();
    }catch(e){
      if(vez !== S.vez) return;
      lista.innerHTML = '';
      erro.innerHTML = '<div class="pls-erro"><b>Não consegui ler as planilhas.</b> Motivo: ' + esc(erroTxt(e)) + '. Atualize a página ou tente de novo.</div>';
    }finally{ lista.removeAttribute('aria-busy'); }
    if(S.erroContas) erro.insertAdjacentHTML('beforeend', '<div class="pls-erro">Não consegui contar as planilhas de cada tipo: ' + esc(S.erroContas) + '.</div>');
  }
  function tipoDe(d){ return d.modelo === 'modelo_planilha' ? 'Modelo' : d.pessoa_id ? 'Cliente' : 'Escritório'; }
  function desenhar(){
    var l = $('plsLista'), pg = $('plsPag');
    if(!S.lista.length){
      l.innerHTML = '<div class="pls-vazio">' + (S.busca ? 'Nenhuma planilha com essa busca.' : S.tipo === 'modelos' ? 'Ainda não há modelos de planilha. Abra uma planilha e use ⋯ > "Salvar uma cópia como modelo de planilha", ou "+ Nova planilha" > "Modelo de planilha".' : 'Nenhuma planilha aqui ainda.' + (podeCriar() ? ' Use "+ Nova planilha".' : '')) + '</div>';
      pg.innerHTML = ''; return;
    }
    l.innerHTML = S.lista.map(function(d){
      var p = d.pessoas || null, pr = d.processos || null, onde = [];
      if(p) onde.push(esc(p.nome_completo || 'Cliente') + (p.codigo ? ' · ' + esc(p.codigo) : ''));
      if(pr) onde.push(esc(pr.codigo || '') + (pr.numero_processo_cnj ? ' · ' + esc(cnj(pr.numero_processo_cnj)) : ''));
      if(!p && !pr) onde.push(d.modelo === 'modelo_planilha' ? 'Modelo para começar outras planilhas iguais' : 'Do escritório (sem cliente)');
      var url = urlEditor('doc=' + encodeURIComponent(d.id));
      return '<div class="pls-item" data-id="' + esc(d.id) + '"><span class="pls-ic">' + IC_TAB + '</span>' +
        '<div class="pls-txt"><b><span class="pls-sel">' + tipoDe(d) + '</span>' + esc(d.titulo) + '</b><span>' + onde.join(' · ') + '</span><span>Versão ' + esc(d.versao) + ' · atualizada em ' + esc(dataBR(d.atualizado_em)) + '</span></div>' +
        '<div class="pls-acoes">' +
          (d.modelo === 'modelo_planilha' && podeCriar() ? '<button type="button" class="btn-primario" data-usar="' + esc(d.id) + '">Usar este modelo</button>' : '') +
          '<a class="btn-secundario" href="' + esc(url) + '" data-abrir>' + (d.modelo === 'modelo_planilha' ? 'Editar o modelo' : 'Abrir') + '</a>' +
          (p && d.pessoa_id ? '<a class="btn-secundario" href="' + esc(FICHA + '?pessoa_id=' + encodeURIComponent(d.pessoa_id) + (d.processo_id ? '&processo_id=' + encodeURIComponent(d.processo_id) : '')) + '" data-ficha>Ficha ↗</a>' : '') +
          (podeTirar() ? '<button type="button" class="btn-secundario btn-tirar-planilha" data-tirar="' + esc(d.id) + '" title="Tirar da lista (só o administrador; as versões ficam guardadas)">Tirar da lista</button>' : '') +
        '</div></div>';
    }).join('');
    l.querySelectorAll('[data-abrir],[data-ficha]').forEach(function(a){ a.addEventListener('click', function(e){ if(e.ctrlKey || e.metaKey || e.button === 1) return; e.preventDefault(); ir(e, a.getAttribute('href')); }); });
    l.querySelectorAll('[data-usar]').forEach(function(b){ b.addEventListener('click', function(){ var d = S.lista.filter(function(x){ return x.id === b.getAttribute('data-usar'); })[0]; escolherDestino({ modelo: d }); }); });
    l.querySelectorAll('[data-tirar]').forEach(function(b){ b.addEventListener('click', function(){ tirar(b.getAttribute('data-tirar')); }); });
    pag().render(pg);
  }
  var PAG = null;
  function pag(){ if(!PAG) PAG = SagaPaginacao.criar({ tela: 'planilhas', rotulo: 'planilha(s)', aoMudar: function(P){ S.pag = P.pagina - 1; carregar(); } }); return PAG; }
  function desenharArquivos(){
    var l = $('plsLista'), pg = $('plsPag'), q = S.busca.toLowerCase();
    var arqs = S.arquivos.filter(function(a){ return !q || String(a.nome_arquivo).toLowerCase().indexOf(q) >= 0; });
    pg.innerHTML = '<span>' + arqs.length + ' arquivo(s) na pasta Planilhas Contábeis</span>';
    if(!arqs.length){ l.innerHTML = '<div class="pls-vazio">Nenhum arquivo na pasta Planilhas Contábeis' + (q ? ' com essa busca' : '') + '. Os arquivos dessa pasta (Excel) podem ser abertos no editor como uma cópia; o original não muda.</div>'; return; }
    l.innerHTML = arqs.map(function(a){
      var xlsx = /\.xlsx$/i.test(a.nome_arquivo);
      return '<div class="pls-item"><span class="pls-ic">' + IC_TAB + '</span><div class="pls-txt"><b><span class="pls-sel">Arquivo</span>' + esc(a.nome_arquivo) + '</b><span>Planilhas Contábeis · ' + esc(dataBR(a.criado_em)) + (xlsx ? '' : ' · só arquivos .xlsx abrem no editor') + '</span></div>' +
        '<div class="pls-acoes">' + (xlsx && podeCriar() ? '<a class="btn-secundario" data-abrir href="' + esc(urlEditor('novo=planilha&arquivo_bib=' + encodeURIComponent(a.id))) + '">Abrir no editor (cópia)</a>' : '') + '</div></div>';
    }).join('');
    l.querySelectorAll('[data-abrir]').forEach(function(x){ x.addEventListener('click', function(e){ if(e.ctrlKey || e.metaKey) return; e.preventDefault(); ir(e, x.getAttribute('href')); }); });
  }
  async function tirar(id){
    var d = S.lista.filter(function(x){ return x.id === id; })[0]; if(!d) return;
    var j = janela('Tirar "' + d.titulo + '" da lista?', 'A planilha some da lista, mas não é apagada: as versões ficam guardadas e vão para o Registro de atividades.', '<div class="pls-erro-campo" id="plsTErro"></div>',
      '<button type="button" class="btn-secundario" data-fechar>Cancelar</button><button type="button" class="btn-perigo" id="plsTOk">Tirar da lista</button>');
    $('plsTOk').onclick = async function(){
      this.disabled = true;
      var r = await sb().rpc('editavel_tirar', { p_id: id });
      if(r.error){ this.disabled = false; $('plsTErro').textContent = 'Não tirei da lista: ' + erroTxt(r.error) + '.'; return; }
      fechar(); toast('Planilha tirada da lista (as versões ficam guardadas).', 'success'); S.carregado = false; carregar();
    };
  }

  /* ---------------- + Nova planilha ---------------- */
  function novaPlanilha(){
    janela('Nova planilha', 'Escolha como começar. A planilha abre em tela inteira; o "Voltar" traz você de volta para esta lista.',
      '<div class="pls-op">' +
        '<button type="button" data-n="branco"><b>Em branco, do escritório</b><small>Sem cliente: controles, tabelas e contas do escritório.</small></button>' +
        '<button type="button" data-n="cliente"><b>Em branco, para um cliente</b><small>Ligada ao processo do cliente; aparece também na ficha e pode ir para a pasta dele.</small></button>' +
        '<button type="button" data-n="modelo"><b>A partir de um modelo de planilha</b><small>Começa com o conteúdo de um modelo (o modelo não muda).</small></button>' +
        '<button type="button" data-n="importar"><b>Importar um Excel (.xlsx)</b><small>O arquivo é lido neste computador; nada vai para site de fora.</small></button>' +
        '<button type="button" data-n="novo_modelo"><b>Modelo de planilha novo</b><small>Para servir de base a outras planilhas iguais.</small></button>' +
      '</div>');
    $('plsJanela').querySelectorAll('[data-n]').forEach(function(b){ b.onclick = function(ev){
      var n = b.getAttribute('data-n');
      if(n === 'branco'){ fechar(); ir(ev, urlEditor('novo=planilha')); }
      else if(n === 'novo_modelo'){ fechar(); ir(ev, urlEditor('novo=modelo')); }
      else if(n === 'importar'){ escolherDestino({ importar: true }); }
      else if(n === 'cliente'){ escolherCliente(function(pr){ fechar(); ir(null, urlEditor('novo=planilha&processo=' + encodeURIComponent(pr.id))); }); }
      else if(n === 'modelo') escolherModelo();
    }; });
  }
  async function escolherModelo(){
    janela('Escolher o modelo de planilha', '', '<input class="campo" id="plsMBusca" placeholder="Buscar modelo" aria-label="Buscar modelo"><div class="pls-res" id="plsMRes"><div class="pls-dica">Carregando…</div></div><div class="pls-erro-campo" id="plsMErro"></div>');
    var r = await sb().from('documentos_editaveis').select('id,titulo,versao,atualizado_em').eq('tipo', 'planilha').eq('modelo', 'modelo_planilha').eq('ativo', true).order('titulo').limit(300);
    if(r.error){ $('plsMRes').innerHTML = ''; $('plsMErro').textContent = 'Não consegui ler os modelos: ' + erroTxt(r.error) + '.'; return; }
    var ms = r.data || [];
    function desenha(){
      var q = ($('plsMBusca').value || '').toLowerCase();
      var l = ms.filter(function(m){ return !q || m.titulo.toLowerCase().indexOf(q) >= 0; });
      $('plsMRes').innerHTML = l.length ? l.map(function(m){ return '<button type="button" data-m="' + esc(m.id) + '"><b>' + esc(m.titulo) + '</b><small>versão ' + esc(m.versao) + ' · ' + esc(dataBR(m.atualizado_em)) + '</small></button>'; }).join('') : '<div class="pls-dica">' + (ms.length ? 'Nenhum modelo com essa busca.' : 'Ainda não há modelos de planilha. Abra uma planilha e use ⋯ > "Salvar uma cópia como modelo de planilha".') + '</div>';
      $('plsMRes').querySelectorAll('[data-m]').forEach(function(b){ b.onclick = function(){ escolherDestino({ modelo: ms.filter(function(x){ return x.id === b.getAttribute('data-m'); })[0] }); }; });
    }
    desenha(); $('plsMBusca').oninput = desenha; $('plsMBusca').focus();
  }
  /* para quem é a planilha nova (modelo ou Excel importado): do escritório ou de um cliente */
  function escolherDestino(o){
    var nome = o.modelo ? 'a partir de "' + o.modelo.titulo + '"' : 'com o Excel importado';
    janela('De quem é a planilha?', 'Planilha nova ' + esc(nome) + '.',
      '<div class="pls-op"><button type="button" data-d="esc"><b>Do escritório</b><small>Sem cliente.</small></button><button type="button" data-d="cli"><b>De um cliente</b><small>Ligada ao processo do cliente.</small></button></div>');
    function abrir(ev, extra){ fechar(); ir(ev, urlEditor('novo=planilha' + (o.modelo ? '&modelo_planilha=' + encodeURIComponent(o.modelo.id) : '&importar=1') + (extra || ''))); }
    $('plsJanela').querySelector('[data-d="esc"]').onclick = function(ev){ abrir(ev); };
    $('plsJanela').querySelector('[data-d="cli"]').onclick = function(){ escolherCliente(function(pr){ abrir(null, '&processo=' + encodeURIComponent(pr.id)); }); };
  }
  function escolherCliente(feito){
    janela('Escolher o cliente e o processo', 'Busque pelo nome, CPF, código VMM ou número do processo.',
      '<input class="campo" id="plsCBusca" placeholder="Nome, CPF, código VMM ou número do processo" aria-label="Buscar cliente ou processo" autocomplete="off"><div class="pls-res" id="plsCRes"><div class="pls-dica">Digite pelo menos 3 letras.</div></div><div class="pls-erro-campo" id="plsCErro"></div>');
    var t = null, vez = 0;
    $('plsCBusca').focus();
    $('plsCBusca').oninput = function(){
      clearTimeout(t); var v = this.value.trim();
      t = setTimeout(async function(){
        var minha = ++vez; $('plsCErro').textContent = '';
        if(v.length < 3){ $('plsCRes').innerHTML = '<div class="pls-dica">Digite pelo menos 3 letras.</div>'; return; }
        try{
          var r = await sb().rpc('busca_global', { p_termo: v });
          if(minha !== vez) return;
          if(r.error) throw r.error;
          var pessoas = (r.data && r.data.pessoas) || [], procs = (r.data && r.data.processos) || [];
          var ids = pessoas.map(function(p){ return p.id; }).slice(0, 40);
          var extra = [];
          if(ids.length){ var q = await sb().from('processos').select('id,codigo,numero_processo_cnj,pessoa_id,pessoas(nome_completo,codigo)').in('pessoa_id', ids).or('excluido_logico.is.null,excluido_logico.eq.false').limit(120); if(q.error) throw q.error; extra = q.data || []; }
          if(minha !== vez) return;
          var vistos = {}, lista = [];
          procs.concat(extra).forEach(function(p){ if(!p || !p.id || vistos[p.id]) return; vistos[p.id] = 1; lista.push(p); });
          $('plsCRes').innerHTML = lista.length ? lista.slice(0, 80).map(function(p){
            var pe = p.pessoas || {}, nome = pe.nome_completo || p.nome_completo || p.cliente || 'Cliente';
            return '<button type="button" data-p="' + esc(p.id) + '"><b>' + esc(nome) + '</b><small>' + esc(p.codigo || '') + (p.numero_processo_cnj ? ' · ' + esc(cnj(p.numero_processo_cnj)) : ' · sem número') + '</small></button>';
          }).join('') : '<div class="pls-dica">Nenhum processo achado.</div>';
          $('plsCRes').querySelectorAll('[data-p]').forEach(function(b){ b.onclick = function(){ feito({ id: b.getAttribute('data-p') }); }; });
        }catch(e){ if(minha === vez){ $('plsCRes').innerHTML = ''; $('plsCErro').textContent = 'Não consegui buscar: ' + erroTxt(e) + '.'; } }
      }, 320);
    };
  }

  /* ---------------- ligação com a árvore de Modelos ---------------- */
  function resumo(){ return { total: S.contas.todas == null ? null : (S.contas.todas || 0) + (S.arquivos.length || 0) }; }
  var ouvintes = [];
  function mostrar(){ if(!montar()) return; if(!S.carregado) carregar(); else if(!$('plsLista').children.length) carregar(); }
  function iniciar(){
    var t = 0;
    (function esp(){
      if($('painelTimbrados') && window._sb){ montar(); if(new URLSearchParams(location.search).get('aba') === 'planilhas') carregar(); else contas(); }
      else if(t++ < 100) setTimeout(esp, 100);
    })();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.SagaPlanilhasLista = { mostrar: mostrar, filtrar: function(t){ if(!montar()) return; S.tipo = t || 'todas'; S.pag = 0; marcarTipo(); carregar(); }, tipo: function(){ return S.tipo; }, recarregar: function(){ S.carregado = false; return carregar(); }, resumo: resumo, aoMudar: function(f){ ouvintes.push(f); } };
})();
