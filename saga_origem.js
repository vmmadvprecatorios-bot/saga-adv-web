/* =====================================================================
   saga_origem.js — De onde veio o cliente (Marketing, parte 2; bloco 148)
   - SagaOrigem.carregar(forcar): lê origem_opcoes() (origens das listas "redes sociais" e "outras origens" e as
     campanhas, só o nome e o código; quem não vê o Marketing também recebe os nomes)
   - SagaOrigem.texto(origemId, campanhaId): "Instagram · campanha IR 2027"
   - SagaOrigem.acharCodigo(texto): a campanha cujo código está na mensagem do cliente ([IR27], "código IR27" ou só IR27)
   - SagaOrigem.linkWhats(campanha): link wa.me com a mensagem pronta e o código no fim
   - SagaOrigem.formulario(el, {origemId, campanhaId, admin}): as perguntas "Veio das redes sociais?" e
     "Veio de uma campanha?", com o campo para colar a 1ª mensagem; devolve {ler()}
   Os menus são listas editáveis (etiquetas_catalogo 'origem_rede' e 'origem_outra'): o administrador geral cria
   opções aqui mesmo ("+ Nova opção") e renomeia, reordena e remove no Marketing ("Origens dos clientes").
   ===================================================================== */
window.SagaOrigem = (function () {
  'use strict';
  var cache = null, promessa = null, cssFeito = false;

  function vazio() { return { origens: [], campanhas: [] }; }
  function cliente() { try { return typeof _sb !== 'undefined' ? _sb : (window._sb || null); } catch (e) { return window._sb || null; } }
  function carregar(forcar) {
    if (cache && !forcar) return Promise.resolve(cache);
    if (promessa && !forcar) return promessa;
    var sb = cliente();
    if (!sb) return Promise.resolve(cache || vazio());
    promessa = sb.rpc('origem_opcoes').then(function (r) {
      if (r.error) throw r.error;
      var d = r.data || {};
      cache = { origens: d.origens || [], campanhas: d.campanhas || [] };
      return cache;
    }).catch(function (e) { console.warn('Origem do cliente:', e); promessa = null; cache = cache || vazio(); return cache; });
    return promessa;
  }
  function dados() { return cache || vazio(); }
  function pronto() { return !!cache; }
  function origem(id) { if (!id) return null; return dados().origens.find(function (o) { return String(o.id) === String(id); }) || null; }
  function campanha(id) { if (!id) return null; return dados().campanhas.find(function (c) { return String(c.id) === String(id); }) || null; }
  function nomeOrigem(id) { var o = origem(id); return o ? o.nome : ''; }
  function nomeCampanha(id) { var c = campanha(id); return c ? c.nome : ''; }
  function texto(origemId, campanhaId) {
    var c = campanha(campanhaId);
    return [nomeOrigem(origemId), c ? 'campanha ' + c.nome : ''].filter(Boolean).join(' · ');
  }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  // origens ativas de uma lista (redes = true/false), mais a já escolhida mesmo que removida
  function origensDe(redes, atual) {
    return dados().origens.filter(function (o) { return !!o.rede === !!redes && (o.ativo !== false || String(o.id) === String(atual || '')); });
  }
  // campanhas: as que não terminaram primeiro
  function campanhasMenu() {
    return dados().campanhas.slice().sort(function (a, b) { return (a.status === 'finalizada') - (b.status === 'finalizada'); });
  }
  function rotuloCampanha(c) { return c.nome + (c.codigo ? ' [' + c.codigo + ']' : '') + (c.status === 'finalizada' ? ' (finalizada)' : ''); }

  // código da campanha dentro da mensagem do cliente
  function acharCodigo(t) {
    t = String(t || '');
    if (!t.trim()) return null;
    var cs = dados().campanhas.filter(function (c) { return c.codigo; }).sort(function (a, b) { return String(b.codigo).length - String(a.codigo).length; });
    var m = t.match(/\[\s*([A-Za-z0-9-]{2,12})\s*\]/) || t.match(/c[oó]digo\s*:?\s*([A-Za-z0-9-]{2,12})/i);
    if (m) {
      var k = m[1].toUpperCase();
      var c1 = cs.find(function (x) { return String(x.codigo).toUpperCase() === k; });
      if (c1) return c1;
    }
    var up = t.toUpperCase();
    return cs.find(function (c) {
      var k = String(c.codigo).toUpperCase().replace(/-/g, '\\-');
      return new RegExp('(^|[^A-Z0-9])' + k + '($|[^A-Z0-9-])').test(up);
    }) || null;
  }

  // link do WhatsApp da campanha: wa.me/55DDDNUMERO?text=mensagem [CÓDIGO]
  function numeroWhats(n) { var d = String(n || '').replace(/\D/g, ''); if (!d) return ''; if (d.length === 10 || d.length === 11) d = '55' + d; return d; }
  function mensagemCompleta(c) {
    var m = String((c && c.whatsapp_mensagem) || '').trim(), cod = c && c.codigo ? '[' + c.codigo + ']' : '';
    return (m + (m && cod ? ' ' : '') + cod).trim();
  }
  function linkWhats(c) {
    var n = numeroWhats(c && c.whatsapp_numero);
    if (!n) return '';
    var m = mensagemCompleta(c);
    return 'https://wa.me/' + n + (m ? '?text=' + encodeURIComponent(m) : '');
  }

  function estilos() {
    if (cssFeito) return; cssFeito = true;
    var s = document.createElement('style'); s.id = 'saga-origem-css';
    s.textContent =
      '.so-form{display:flex;flex-direction:column;gap:12px}' +
      '.so-form [hidden]{display:none!important}' +
      '.so-q{display:flex;flex-direction:column;gap:6px;min-width:0}' +
      '.so-q>.so-rot{font-size:12px;font-weight:600;color:var(--text-2,var(--muted))}' +
      '.so-seg{display:inline-flex;flex-wrap:wrap;gap:4px;padding:3px;border:1px solid var(--border);border-radius:999px;background:var(--sb-sec,transparent);width:max-content;max-width:100%}' +
      '.so-seg button{font:inherit;font-size:12.5px;font-weight:500;border:1px solid transparent;background:transparent;color:var(--text);border-radius:999px;padding:5px 14px;cursor:pointer}' +
      '.so-seg button.active{background:var(--sb-escolha,rgba(127,127,127,.16));border-color:var(--sb-escolha-borda,var(--border))}' +
      '.so-q select,.so-q input{height:38px;border:1px solid var(--border);border-radius:10px;background:var(--panel-2,var(--panel));color:var(--text);padding:0 10px;font:inherit;font-size:13px;width:100%;box-sizing:border-box;min-width:0}' +
      '.so-nova{display:flex;gap:6px}.so-nova input{flex:1}' +
      '.so-nova button{height:38px;border-radius:10px;border:1px solid var(--sb-acao-borda,var(--border));background:var(--sb-acao,transparent);color:var(--text);font:inherit;font-size:12.5px;padding:0 12px;cursor:pointer;white-space:nowrap}' +
      '.so-dica{font-size:11.5px;color:var(--muted);line-height:1.4}' +
      '.so-achou{font-size:12px;color:var(--success,#2fae7a);line-height:1.4}' +
      '.so-achou.nao{color:var(--muted)}' +
      '.so-sep{height:1px;background:var(--border);opacity:.7;margin:2px 0}';
    document.head.appendChild(s);
  }

  // mostra/esconde com o movimento do sistema (sagaRecolher respeita "Efeitos de movimento")
  function mostrar(el, sim) {
    if (!el) return;
    if (sim === !el.hidden) return;
    if (window.sagaRecolher) window.sagaRecolher(el, !sim); else el.hidden = !sim;
  }

  function formulario(el, o) {
    estilos(); o = o || {};
    var orig = origem(o.origemId);
    var st = {
      redes: orig ? (orig.rede ? 'sim' : 'nao') : '',
      origem: o.origemId || '',
      camp: o.campanhaId ? 'sim' : 'nao',
      campanha: o.campanhaId || ''
    };
    el.innerHTML =
      '<div class="so-form">' +
        '<div class="so-q"><label class="so-rot" for="soMsg' + (o.id || '') + '">Cole aqui a 1ª mensagem do cliente (opcional)</label>' +
          '<input data-so="msg" id="soMsg' + (o.id || '') + '" autocomplete="off" placeholder="Ex.: Olá! Vi o anúncio... [IR27]">' +
          '<div class="so-dica">O SAGA procura o código da campanha na mensagem (o código vai no fim da mensagem pronta do link de WhatsApp de cada campanha).</div>' +
          '<div class="so-achou" data-so="achou" hidden></div></div>' +
        '<div class="so-sep"></div>' +
        '<div class="so-q"><span class="so-rot">Veio das redes sociais (ou do Google)?</span>' +
          '<div class="so-seg" role="group" aria-label="Veio das redes sociais?"><button type="button" data-redes="sim">Sim</button><button type="button" data-redes="nao">Não</button><button type="button" data-redes="">Não sei</button></div></div>' +
        '<div class="so-q" data-so="qual" hidden><label class="so-rot" data-so="qualRot"></label><select data-so="origem"></select>' +
          '<div class="so-nova" data-so="nova" hidden><input data-so="novaNome" maxlength="60" placeholder="Nome da nova opção"><button type="button" data-so="novaCriar">Criar</button></div></div>' +
        '<div class="so-q"><span class="so-rot">Veio de uma campanha do escritório?</span>' +
          '<div class="so-seg" role="group" aria-label="Veio de uma campanha?"><button type="button" data-camp="sim">Sim</button><button type="button" data-camp="nao">Não</button></div></div>' +
        '<div class="so-q" data-so="campWrap" hidden><label class="so-rot">Qual campanha?</label><select data-so="campanha"></select></div>' +
      '</div>';
    var q = function (k) { return el.querySelector('[data-so="' + k + '"]'); };
    var selO = q('origem'), selC = q('campanha'), wrapQual = q('qual'), wrapCamp = q('campWrap'), nova = q('nova');
    var qualRot = q('qualRot'); qualRot.setAttribute('for', 'soOrig' + (o.id || '')); selO.id = 'soOrig' + (o.id || '');

    function pintarSeg() {
      el.querySelectorAll('[data-redes]').forEach(function (b) { b.classList.toggle('active', b.dataset.redes === st.redes); });
      el.querySelectorAll('[data-camp]').forEach(function (b) { b.classList.toggle('active', b.dataset.camp === st.camp); });
    }
    function encherOrigens() {
      if (!st.redes) return;
      var lista = origensDe(st.redes === 'sim', st.origem);
      if (st.origem && !lista.some(function (x) { return String(x.id) === String(st.origem); })) st.origem = '';
      selO.innerHTML = '<option value="">Escolha...</option>' + lista.map(function (x) {
        return '<option value="' + esc(x.id) + '">' + esc(x.nome) + (x.ativo === false ? ' (removida)' : '') + '</option>';
      }).join('') + (o.admin ? '<option value="__nova">+ Nova opção...</option>' : '');
      selO.value = st.origem || '';
      qualRot.textContent = st.redes === 'sim' ? 'Qual rede?' : 'Como o cliente chegou?';
    }
    function encherCampanhas() {
      var lista = campanhasMenu();
      selC.innerHTML = '<option value="">Escolha a campanha...</option>' + lista.map(function (c) {
        return '<option value="' + esc(c.id) + '">' + esc(rotuloCampanha(c)) + '</option>';
      }).join('');
      if (!lista.length) selC.innerHTML = '<option value="">Nenhuma campanha cadastrada no Marketing</option>';
      selC.value = st.campanha || '';
    }
    function atualizar(animar) {
      pintarSeg(); encherOrigens(); encherCampanhas();
      var vQual = !!st.redes, vCamp = st.camp === 'sim';
      if (animar) { mostrar(wrapQual, vQual); mostrar(wrapCamp, vCamp); }
      else { wrapQual.hidden = !vQual; wrapCamp.hidden = !vCamp; }
      if (selO.value !== '__nova') nova.hidden = true;
    }
    // a campanha escolhida traz a rede principal dela, se a origem ainda estiver em branco
    function usarRedeDaCampanha(c) {
      if (!c || !c.origem_id || st.origem) return;
      var oc = origem(c.origem_id); if (!oc) return;
      st.redes = oc.rede ? 'sim' : 'nao'; st.origem = oc.id;
    }
    el.querySelectorAll('[data-redes]').forEach(function (b) {
      b.addEventListener('click', function () { if (st.redes !== b.dataset.redes) { st.redes = b.dataset.redes; st.origem = ''; } atualizar(true); });
    });
    el.querySelectorAll('[data-camp]').forEach(function (b) {
      b.addEventListener('click', function () { st.camp = b.dataset.camp; if (st.camp === 'nao') st.campanha = ''; atualizar(true); });
    });
    selO.addEventListener('change', function () {
      if (selO.value === '__nova') { mostrar(nova, true); q('novaNome').focus(); return; }
      st.origem = selO.value; mostrar(nova, false);
    });
    selC.addEventListener('change', function () { st.campanha = selC.value; usarRedeDaCampanha(campanha(st.campanha)); atualizar(true); });
    q('novaCriar').addEventListener('click', async function () {
      var nome = q('novaNome').value.trim(), btn = this;
      if (!nome) { q('novaNome').focus(); return; }
      btn.disabled = true;
      try {
        var r = await cliente().rpc('catalogo_salvar', { p_categoria: st.redes === 'sim' ? 'origem_rede' : 'origem_outra', p_id: null, p_nome: nome, p_cor: '#8a94a8', p_ativo: true, p_conta_protocolada: null });
        if (r.error) throw r.error;
        await carregar(true); st.origem = r.data; q('novaNome').value = ''; atualizar(true);
      } catch (e) { if (typeof showToast === 'function') showToast('Não foi possível criar: ' + esc(e.message || e), 'error'); }
      finally { btn.disabled = false; }
    });
    var achou = q('achou');
    q('msg').addEventListener('input', function () {
      var v = this.value, c = acharCodigo(v);
      if (!v.trim()) { achou.hidden = true; return; }
      achou.hidden = false;
      if (c) {
        st.camp = 'sim'; st.campanha = c.id;
        if (c.origem_id && origem(c.origem_id)) { var oc = origem(c.origem_id); st.redes = oc.rede ? 'sim' : 'nao'; st.origem = oc.id; }
        achou.classList.remove('nao');
        achou.textContent = 'Campanha encontrada: ' + c.nome + ' (código ' + c.codigo + ')' + (c.origem_id && origem(c.origem_id) ? ', rede ' + nomeOrigem(c.origem_id) : '') + '.';
        atualizar(true);
      } else {
        achou.classList.add('nao');
        achou.textContent = 'Nenhum código de campanha nesta mensagem. Marque abaixo, se souber.';
      }
    });
    atualizar(false);
    return {
      ler: function () {
        if (st.redes && !st.origem) throw new Error(st.redes === 'sim' ? 'Escolha qual rede.' : 'Escolha como o cliente chegou.');
        if (st.camp === 'sim' && !st.campanha) throw new Error('Escolha a campanha (ou marque "Não").');
        return { origem_id: st.redes ? (st.origem || null) : null, campanha_id: st.camp === 'sim' ? (st.campanha || null) : null };
      }
    };
  }

  return {
    carregar: carregar, dados: dados, pronto: pronto, origem: origem, campanha: campanha,
    nomeOrigem: nomeOrigem, nomeCampanha: nomeCampanha, texto: texto, origensDe: origensDe, campanhasMenu: campanhasMenu,
    rotuloCampanha: rotuloCampanha, acharCodigo: acharCodigo, numeroWhats: numeroWhats, mensagemCompleta: mensagemCompleta,
    linkWhats: linkWhats, formulario: formulario
  };
})();
