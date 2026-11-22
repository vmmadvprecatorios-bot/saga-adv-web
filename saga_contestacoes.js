/* =====================================================================
   SAGA · CONTESTAÇÕES (modelos da parte contrária) em Modelos (22/11/2026, Dr. Victor; bloco 395)
   "No caso de ter que fazer uma réplica manual, eu vejo o modelo da contestação que está dentro do sistema."
   - Seção nova "Contestações (modelos da parte contrária)" na tela Modelos (Petições e timbrados), logo depois
     dos Modelos de petição: lista por tese e por "tipo N", com as teses de defesa (preliminares e mérito),
     busca NO TEXTO das contestações, "Ver o texto", "Abrir o PDF" (quando houver) e "Ver a réplica deste tipo"
     (abre o modelo de réplica no editor dos Modelos).
   - Quem vê: quem vê os documentos dos clientes ou gerencia os modelos (contestacoes_pode_ver; a RLS decide).
     Marcar revisada: quem gerencia os modelos. Tirar da lista (não apaga): só o administrador.
   - Tudo pelo banco: contestacoes_listar, contestacao_ver, contestacao_salvar, contestacao_desativar.
   Carregado por 1 linha no fim do biblioteca_padrao_metalico_FINAL.html.
   ===================================================================== */
window.SagaContestacoes = (function(){
  'use strict';
  var EASE = 'cubic-bezier(.22,.78,.25,1)';
  var S = { lista:[], tese:'', busca:'', pode:false, admin:false, gestor:false, carregando:false, temporizador:null, abertos:{} };
  function sb(){ return window._sb; }
  var esc = window.sagaEsc || function(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/`/g,'&#96;'); };
  function erroTxt(e){ return (window.sagaErroBanco ? window.sagaErroBanco(e) : (e && e.message)) || String(e); }
  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }

  var css = document.createElement('style');
  css.textContent = [
    '.ct-ferr{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}',
    '.ct-ferr .tb-busca{flex:1 1 260px;min-width:0}',
    '.ct-teses{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}',
    '.ct-grupo{margin:14px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}',
    '.ct-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}',
    '.ct-card{border:1px solid var(--border-soft);border-radius:14px;padding:12px 14px;background:var(--panel);display:flex;flex-direction:column;gap:8px;min-width:0}',
    '.ct-topo{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}',
    '.ct-tipo{font-size:11px;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);color:var(--gold);border-radius:999px;padding:2px 9px;white-space:nowrap}',
    '.ct-tit{font-size:13.5px;line-height:1.35;margin:0;overflow-wrap:anywhere}',
    '.ct-selo{font-size:10.5px;border-radius:999px;padding:2px 8px;white-space:nowrap;border:1px solid var(--border-soft);color:var(--muted)}',
    '.ct-selo.rev{color:#2e9e6a;border-color:color-mix(in srgb,#2e9e6a 45%,transparent)}',
    '.ct-selo.arev{color:#d97706;border-color:color-mix(in srgb,#d97706 45%,transparent)}',
    '.ct-def{font-size:12px;line-height:1.45;color:var(--text)}',
    '.ct-def b{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}',
    '.ct-def ul{margin:3px 0 0;padding-left:18px}',
    '.ct-def li{margin:1px 0;overflow-wrap:anywhere}',
    '.ct-mais{font-size:11.5px;color:var(--muted);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline}',
    '.ct-trecho{font-size:12px;color:var(--muted);border-left:2px solid color-mix(in srgb,var(--gold) 50%,transparent);padding-left:8px;overflow-wrap:anywhere}',
    '.ct-trecho mark{background:color-mix(in srgb,var(--gold) 28%,transparent);color:var(--text);border-radius:3px;padding:0 2px}',
    '.ct-acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}',
    '.ct-acoes button{font:inherit;font-size:12px;padding:6px 10px;border-radius:9px;cursor:pointer;border:1px solid var(--border-soft);min-height:34px}',
    '.ct-sem{font-size:11.5px;color:var(--muted)}',
    '.ct-fundo{align-items:flex-start!important;padding-top:40px!important}',
    '.ct-texto{background:#fff;color:#1b1b1b;border-radius:8px;padding:24px 30px;font-family:"EB Garamond",Garamond,Georgia,serif;font-size:15px;line-height:1.55;max-height:62vh;overflow:auto;box-shadow:0 2px 10px rgba(0,0,0,.25)}',
    '.ct-texto p{margin:0 0 10px;text-align:justify;overflow-wrap:anywhere}',
    '.ct-texto h4{font-family:Montserrat,Arial,sans-serif;font-size:12.5px;letter-spacing:.03em;margin:16px 0 8px;color:#1f3e6d}',
    '.ct-texto mark{background:#ffe58a;color:#1b1b1b}',
    '@media (max-width:600px){.ct-texto{padding:16px 14px;font-size:14px}.ct-grade{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------------- montar a seção dentro de Modelos ---------------- */
  function montar(){
    var painel = document.getElementById('painelTimbrados');
    if(!painel || document.getElementById('ctSecao')) return !!painel;
    var secs = painel.querySelectorAll('section.tb-sec');
    var sec = document.createElement('section');
    sec.className = 'tb-sec'; sec.id = 'ctSecao'; sec.hidden = true;
    sec.innerHTML =
      '<h2>Contestações (modelos da parte contrária)</h2>' +
      '<p class="tb-sub">As contestações da União separadas por tipo, com as teses de defesa e a réplica que responde a cada tipo. Para uma réplica feita à mão: ache o tipo parecido com a contestação do processo e abra a réplica correspondente.</p>' +
      '<div class="ct-ferr"><input type="search" class="tb-busca" id="ctBusca" placeholder="Buscar no texto das contestações (ex.: prescrição, regime de competência)" aria-label="Buscar no texto das contestações"></div>' +
      '<div class="ct-teses tb-filtros" id="ctTeses" role="group" aria-label="Filtrar por tese"></div>' +
      '<div id="ctErro"></div><div id="ctLista"><div class="tb-vazio">Carregando as contestações...</div></div>';
    if(secs.length) secs[0].parentNode.insertBefore(sec, secs[0].nextSibling); else painel.appendChild(sec);
    sec.querySelector('#ctBusca').addEventListener('input', function(){
      S.busca = this.value; clearTimeout(S.temporizador);
      S.temporizador = setTimeout(carregar, 350);
    });
    iniciar();
    return true;
  }

  async function iniciar(){
    var pp = await Promise.all([
      window.sagaPode ? window.sagaPode('modelos_documentos.gerenciar') : Promise.resolve(false),
      window.sagaPerfil ? window.sagaPerfil() : Promise.resolve(null)
    ]).catch(function(){ return [false, null]; });
    S.gestor = !!pp[0];
    var perfil = pp[1];
    S.admin = !!((perfil && perfil.eh_administrador) || document.documentElement.classList.contains('saga-pode-apagar'));
    if(S.admin) S.gestor = true;
    carregar(true);
  }

  async function carregar(primeira){
    var sec = document.getElementById('ctSecao'); if(!sec) return;
    var erro = sec.querySelector('#ctErro');
    S.carregando = true;
    var r = await sb().rpc('contestacoes_listar', { p_tese: null, p_busca: (S.busca || '').trim() || null, p_limite: 300 });
    S.carregando = false;
    if(r.error){
      if(r.error.code === '42501'){ sec.hidden = true; return; } /* quem não vê os documentos não vê a seção */
      sec.hidden = false;
      erro.innerHTML = '<div class="tb-erro"><b>Não carregou as contestações:</b> ' + esc(erroTxt(r.error)) + '<br>Se continuar, avise o administrador com esta mensagem.</div>';
      return;
    }
    erro.innerHTML = '';
    S.lista = (r.data && r.data.contestacoes) || [];
    if(!(S.busca || '').trim()) S.todas = S.lista.slice(); /* contagem por tese para a árvore (22/11) */
    if(primeira && !S.lista.length && !S.gestor){ sec.hidden = true; avisar(); return; }
    sec.hidden = false;
    desenharTeses(); desenhar(); avisar();
  }

  function desenharTeses(){
    var cx = document.getElementById('ctTeses'); if(!cx) return;
    var cont = {};
    S.lista.forEach(function(c){ var k = c.tese_sigla || 'sem'; cont[k] = cont[k] || { n:0, nome:c.tese || 'Sem tese' }; cont[k].n++; });
    var ops = [['', 'Todas', S.lista.length]].concat(Object.keys(cont).sort().map(function(k){ return [k, cont[k].nome, cont[k].n]; }));
    if(S.tese && !cont[S.tese]) S.tese = '';
    cx.innerHTML = ops.map(function(o){
      return '<button type="button" class="filter-pill' + (S.tese === o[0] ? ' active' : '') + '" data-ct-tese="' + esc(o[0]) + '">' + esc(o[1]) + ' (' + o[2] + ')</button>';
    }).join('');
    cx.querySelectorAll('[data-ct-tese]').forEach(function(b){
      b.addEventListener('click', function(){
        S.tese = b.getAttribute('data-ct-tese');
        cx.querySelectorAll('[data-ct-tese]').forEach(function(x){ x.classList.toggle('active', x === b); });
        setTimeout(desenhar, reduzido() ? 0 : 200);
      });
    });
  }

  function listaDef(titulo, itens, id, chave){
    if(!itens || !itens.length) return '';
    var aberto = S.abertos[id + chave], mostra = aberto ? itens : itens.slice(0, 4);
    return '<div class="ct-def"><b>' + titulo + '</b><ul>' + mostra.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      (itens.length > 4 ? '<button type="button" class="ct-mais" data-ct-mais="' + esc(id) + '" data-ct-chave="' + chave + '">' + (aberto ? 'Mostrar menos' : 'Mais ' + (itens.length - 4)) + '</button>' : '') + '</div>';
  }
  function trechoHtml(t){
    if(!t) return '';
    return '<div class="ct-trecho">' + esc(t).replace(/⟦/g, '<mark>').replace(/⟧/g, '</mark>') + '</div>';
  }
  function htmlCard(c){
    var res = c.resumo || {};
    var semDef = !(res.preliminares && res.preliminares.length) && !(res.merito && res.merito.length);
    return '<article class="ct-card" data-ct-id="' + esc(c.id) + '">' +
      '<div class="ct-topo"><span class="ct-tipo">' + esc(c.tipo_rotulo || (c.tipo_n ? 'tipo ' + c.tipo_n : 'sem tipo')) + '</span>' +
        '<span class="ct-selo ' + (c.revisado ? 'rev">Revisada' : 'arev">A revisar') + '</span></div>' +
      '<h4 class="ct-tit">' + esc(c.titulo) + '</h4>' +
      trechoHtml(c.trecho) +
      listaDef('Preliminares', res.preliminares, c.id, 'p') +
      listaDef('Mérito', res.merito, c.id, 'm') +
      (semDef ? '<div class="ct-sem">' + esc(res.observacao || 'Sem resumo das teses: leia o texto.') + '</div>' : '') +
      '<div class="ct-acoes">' +
        '<button type="button" class="btn-secundario" data-ct-ver="' + esc(c.id) + '">Ver o texto</button>' +
        (c.tem_pdf ? '<button type="button" class="btn-secundario" data-ct-pdf="' + esc(c.id) + '">Abrir o PDF</button>' : '') +
        (c.replica ? '<button type="button" class="btn-secundario" data-ct-replica="' + esc(c.replica.id) + '">Ver a réplica deste tipo</button>' : '<span class="ct-sem">Sem réplica ligada a este tipo</span>') +
        (S.gestor && !c.revisado ? '<button type="button" class="btn-secundario" data-ct-revisar="' + esc(c.id) + '">Marcar revisada</button>' : '') +
        (S.admin ? '<button type="button" class="btn-secundario btn-perigo" data-ct-tirar="' + esc(c.id) + '">Tirar da lista</button>' : '') +
      '</div></article>';
  }

  function desenhar(){
    var l = document.getElementById('ctLista'); if(!l) return;
    var lista = S.lista.filter(function(c){ return !S.tese || (c.tese_sigla || 'sem') === S.tese; });
    if(!lista.length){
      l.innerHTML = '<div class="tb-vazio">' + (S.busca ? 'Nenhuma contestação com essa busca.' : 'Nenhuma contestação cadastrada ainda.') + '</div>';
      return;
    }
    var grupos = {}, ordem = [];
    lista.forEach(function(c){ var k = c.tese || 'Sem tese'; if(!grupos[k]){ grupos[k] = []; ordem.push(k); } grupos[k].push(c); });
    l.innerHTML = (S.busca ? '<div class="tb-caminho">Busca no texto · ' + lista.length + ' contestação(ões)</div>' : '') +
      ordem.map(function(k){ return '<div class="ct-grupo">' + esc(k) + ' · ' + grupos[k].length + '</div><div class="ct-grade">' + grupos[k].map(htmlCard).join('') + '</div>'; }).join('');
    ligar(l);
  }

  function ligar(l){
    l.querySelectorAll('[data-ct-mais]').forEach(function(b){ b.addEventListener('click', function(){
      var k = b.getAttribute('data-ct-mais') + b.getAttribute('data-ct-chave'); S.abertos[k] = !S.abertos[k];
      var card = b.closest('.ct-card'), c = S.lista.find(function(x){ return x.id === card.getAttribute('data-ct-id'); });
      if(c){ var novo = document.createElement('div'); novo.innerHTML = htmlCard(c); card.replaceWith(novo.firstChild); ligar(l); }
    }); });
    l.querySelectorAll('[data-ct-ver]').forEach(function(b){ if(b._ct) return; b._ct = 1; b.addEventListener('click', function(){ verTexto(b.getAttribute('data-ct-ver')); }); });
    l.querySelectorAll('[data-ct-pdf]').forEach(function(b){ if(b._ct) return; b._ct = 1; b.addEventListener('click', function(){ abrirPdf(b.getAttribute('data-ct-pdf'), b); }); });
    l.querySelectorAll('[data-ct-replica]').forEach(function(b){ if(b._ct) return; b._ct = 1; b.addEventListener('click', function(){ verReplica(b.getAttribute('data-ct-replica'), b); }); });
    l.querySelectorAll('[data-ct-revisar]').forEach(function(b){ if(b._ct) return; b._ct = 1; b.addEventListener('click', function(){ marcarRevisada(b.getAttribute('data-ct-revisar'), b); }); });
    l.querySelectorAll('[data-ct-tirar]').forEach(function(b){ if(b._ct) return; b._ct = 1; b.addEventListener('click', function(){ tirar(b.getAttribute('data-ct-tirar'), b); }); });
  }

  /* ---------------- janela (detalhe: presa no alto, conteúdo chega depois) ---------------- */
  function janela(html){
    var f = document.getElementById('ctJanela');
    if(!f){
      f = document.createElement('div'); f.className = 'me-fundo ct-fundo'; f.id = 'ctJanela';
      f.setAttribute('data-saga-movimento-proprio', '1');
      document.body.appendChild(f);
      f.addEventListener('click', function(e){ if(e.target === f) fecharJanela(); });
      document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && f.classList.contains('aberto')) fecharJanela(); });
    }
    f.innerHTML = '<div class="me-jan" role="dialog" aria-modal="true" aria-labelledby="ctJanTit" style="max-width:900px">' + html + '</div>';
    f.classList.toggle('sem-movimento', reduzido());
    requestAnimationFrame(function(){ f.classList.add('aberto'); });
    return f;
  }
  function fecharJanela(){ var f = document.getElementById('ctJanela'); if(f) f.classList.remove('aberto'); }

  function textoHtml(t, busca){
    var marcas = [];
    if(busca) busca.split(/\s+/).filter(function(w){ return w.length >= 4 && !/^(or|and|não|-)/i.test(w); }).forEach(function(w){ marcas.push(w.replace(/[.*+?^${}()|[\]\\"]/g, '')); });
    var re = marcas.length ? new RegExp('(' + marcas.join('|') + ')', 'gi') : null;
    return String(t || '').split(/\n{2,}/).map(function(p){
      var h = /^## /.test(p), x = esc(h ? p.slice(3) : p);
      if(re) x = x.replace(re, '<mark>$1</mark>');
      return h ? '<h4>' + x + '</h4>' : '<p>' + x + '</p>';
    }).join('');
  }

  async function verTexto(id){
    var c = S.lista.find(function(x){ return x.id === id; }) || {};
    var f = janela('<h3 id="ctJanTit">' + esc(c.titulo || 'Contestação') + '</h3>' +
      '<p class="me-sub">' + esc([c.tese, c.tipo_rotulo, c.origem_caminho].filter(Boolean).join(' · ')) + '</p>' +
      '<div id="ctJanCorpo"><div class="tb-vazio">Carregando o texto...</div></div>' +
      '<div class="me-botoes"><button type="button" class="btn-secundario" id="ctCopiar" disabled>Copiar o texto</button>' +
        (c.replica ? '<button type="button" class="btn-secundario" id="ctJanReplica">Ver a réplica deste tipo</button>' : '') +
        '<button type="button" class="btn-secundario" id="ctFechar">Fechar</button></div>');
    f.querySelector('#ctFechar').onclick = fecharJanela;
    if(c.replica) f.querySelector('#ctJanReplica').onclick = function(){ fecharJanela(); verReplica(c.replica.id, this); };
    var r = await sb().rpc('contestacao_ver', { p_id: id });
    var corpo = f.querySelector('#ctJanCorpo');
    if(r.error){ corpo.innerHTML = '<div class="me-erro"><b>Não abriu o texto:</b> ' + esc(erroTxt(r.error)) + '</div>'; return; }
    var d = r.data || {};
    corpo.innerHTML = '<div class="me-amarelo">Texto tirado do arquivo (conversão automática): pode ter quebras de linha ou palavras partidas. Nome e CPF da parte autora viram {parte_autora} e {cpf}.</div>' +
      '<div class="ct-texto">' + (d.texto ? textoHtml(d.texto, S.busca) : '<p>(sem texto)</p>') + '</div>';
    var bc = f.querySelector('#ctCopiar'); bc.disabled = !d.texto;
    bc.onclick = function(){
      var txt = String(d.texto || '').replace(/^## /gm, '');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject(new Error('sem área de transferência')))
        .then(function(){ bc.textContent = 'Copiado'; setTimeout(function(){ bc.textContent = 'Copiar o texto'; }, 1600); })
        .catch(function(e){ bc.textContent = 'Não copiou: ' + (e && e.message || e); });
    };
  }

  async function abrirPdf(id, b){
    var c = S.lista.find(function(x){ return x.id === id; });
    var r = await sb().rpc('contestacao_ver', { p_id: id });
    if(r.error || !r.data || !r.data.arquivo_path){ b.textContent = 'PDF não encontrado' + (r.error ? ': ' + erroTxt(r.error) : ''); return; }
    var s = await sb().storage.from('contestacoes-modelos').createSignedUrl(r.data.arquivo_path, 600);
    if(s.error){ b.textContent = 'Não abriu: ' + erroTxt(s.error); return; }
    var u = window.sagaUrlSegura ? window.sagaUrlSegura(s.data.signedUrl) : s.data.signedUrl;
    if(u) window.open(u, '_blank', 'noopener');
  }

  async function verReplica(modeloId, b){
    var txt = b ? b.textContent : '';
    if(b){ b.disabled = true; b.textContent = 'Abrindo...'; }
    var r = await sb().from('modelos_peticao').select('*').eq('id', modeloId).maybeSingle();
    if(b){ b.disabled = false; b.textContent = txt; }
    if(r.error || !r.data){
      var msg = r.error ? erroTxt(r.error) : 'modelo não encontrado (ou sem permissão para ver os modelos de petição)';
      if(b) b.insertAdjacentHTML('afterend', '<span class="ct-sem" style="color:#d9534f">Não abriu a réplica: ' + esc(msg) + '</span>');
      return;
    }
    if(window.SagaModelosEditor) window.SagaModelosEditor.abrir(r.data, {});
  }

  async function marcarRevisada(id, b){
    var c = S.lista.find(function(x){ return x.id === id; }); if(!c) return;
    b.disabled = true; b.textContent = 'Gravando...';
    var r = await sb().rpc('contestacao_salvar', { p_id: id, p_dados: { titulo: c.titulo, revisado: true } });
    if(r.error){ b.disabled = false; b.textContent = 'Não gravou: ' + erroTxt(r.error); return; }
    c.revisado = true; desenhar();
  }

  async function tirar(id, b){
    var c = S.lista.find(function(x){ return x.id === id; }); if(!c) return;
    if(!confirm('Tirar da lista a contestação "' + c.titulo + '"? Ela não é apagada (fica guardada no banco).')) return;
    b.disabled = true; b.textContent = 'Tirando...';
    var r = await sb().rpc('contestacao_desativar', { p_id: id });
    if(r.error){ b.disabled = false; b.textContent = 'Não tirou: ' + erroTxt(r.error); return; }
    var card = b.closest('.ct-card');
    var fim = function(){ S.lista = S.lista.filter(function(x){ return x.id !== id; }); if(S.todas) S.todas = S.todas.filter(function(x){ return x.id !== id; }); desenharTeses(); desenhar(); avisar(); };
    if(card && window.sagaRecolher && !reduzido()){ try{ window.sagaRecolher(card, true, fim); return; }catch(e){} }
    fim();
  }

  /* espera o painel dos Modelos aparecer (ele é montado pelo saga_biblioteca_timbrados.js) */
  var tent = 0;
  (function esperar(){
    if(!window._sb){ if(tent++ < 200) return setTimeout(esperar, 100); return; }
    if(montar()) return;
    if(tent++ < 200) setTimeout(esperar, 100);
  })();

  /* 22/11 (Dr. Victor: "tudo junto na mesma organização"): a árvore única dos Modelos (saga_biblioteca_timbrados.js)
     mostra "Contestações > <tese>"; ela lê as teses daqui (resumo), filtra (filtrar) e manda a busca geral (buscar). */
  var ouvintes = [];
  function avisar(){ ouvintes.forEach(function(f){ try{ f(); }catch(e){} }); }
  function resumo(){
    var sec = document.getElementById('ctSecao');
    if(!S.todas || (sec && sec.hidden && !S.gestor)) return null;
    var cont = {}, ordem = [];
    S.todas.forEach(function(c){ var k = c.tese_sigla || 'sem'; if(!cont[k]){ cont[k] = { sigla:k, nome:c.tese || 'Sem tese', n:0 }; ordem.push(k); } cont[k].n++; });
    return { total:S.todas.length, teses:ordem.sort(function(a, b){ return cont[a].nome.localeCompare(cont[b].nome, 'pt-BR'); }).map(function(k){ return cont[k]; }) };
  }
  function filtrar(sigla){
    S.tese = sigla || '';
    var cx = document.getElementById('ctTeses');
    if(cx) cx.querySelectorAll('[data-ct-tese]').forEach(function(x){ x.classList.toggle('active', x.getAttribute('data-ct-tese') === S.tese); });
    if((S.busca || '').trim()){ S.busca = ''; var bx = document.getElementById('ctBusca'); if(bx) bx.value = ''; return carregar(false); }
    desenhar();
  }
  function buscar(q){
    S.busca = q || ''; S.tese = '';
    var bx = document.getElementById('ctBusca'); if(bx) bx.value = S.busca;
    clearTimeout(S.temporizador);
    return carregar(false);
  }

  return { recarregar: function(){ return carregar(false); }, resumo:resumo, filtrar:filtrar, buscar:buscar, aoMudar:function(f){ ouvintes.push(f); } };
})();
