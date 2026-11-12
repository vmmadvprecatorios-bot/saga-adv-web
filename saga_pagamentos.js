/* SAGA · Pagamentos e parcelas na ficha do cliente (T159, 12/11/2026; bloco 167).
   Pedido do Dr. Victor: um bloco na coluna da direita da ficha para os pagamentos que o cliente faz ou recebe em parcelas
   (honorários parcelados combinados com o escritório, pensão alimentícia que o pai paga, acordo da outra parte...): o total,
   o número de parcelas (o valor de cada uma sai sozinho, e vice-versa), os vencimentos e a marcação de cada parcela paga
   (data, valor e forma). Decisão dele (11/11): honorários pagos por fora entram no Financeiro como RECEBIDOS.
   As parcelas pagas ficam recolhidas em "Pagas"; as que faltam ficam à vista, com a próxima (ou a atrasada) em destaque.
     SagaPagamentos.configurar({toast:fn(msg,'ok'|'erro'|'alerta')})
     SagaPagamentos.blocoFicha(el, {secao, botao, pessoaId, pessoaNome, processos:[{id, rotulo}], processoAtivo:fn})
     SagaPagamentos.rolar()                       -> leva a tela até o bloco (aviso do sino: &foco=pagamentos)
     SagaPagamentos.permissoes(forcar)            -> {ver_honorarios, mexer_honorarios, ver, mexer, admin}
   Quem vê e quem mexe (o banco confere de novo): honorários = quem vê / lança no Financeiro; os outros = quem vê / edita
   processos; remover um acordo = só o administrador (vira inativo, o histórico fica).
   Tudo grava pelas funções pagamento_* do banco. Movimento: curva cubic-bezier(.22,.78,.25,1), respeita a chave
   "Efeitos de movimento" (localStorage saga-movimento = 'reduzido' troca na hora). */
(function(global){
  'use strict';
  var CURVA = 'cubic-bezier(.22,.78,.25,1)';
  var MOSTRAR_ABERTAS = 4;
  var cfg = { toast: null };
  var cache = { perm: null, tipos: null };
  var atual = null; // {el, ctx, acordos, pagasAbertas:Set, maisAbertas:Set}

  function sb(){ return global._sb; }
  function esc(t){ var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function cor(v){ return /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#8a94a8'; }
  function semMov(){ try { return localStorage.getItem('saga-movimento') === 'reduzido'; } catch(e) { return false; } }
  function aviso(msg, tipo){
    if (cfg.toast) { try { cfg.toast(msg, tipo || 'ok'); return; } catch(e) {} }
    if (typeof global.showToast === 'function') { global.showToast(esc(msg), tipo === 'erro' ? 'error' : tipo === 'alerta' ? 'warning' : 'success'); return; }
    try { global.alert(msg); } catch(e) {}
  }
  function erroTxt(e){ var m = (e && (e.message || e.msg)) || 'tente de novo.'; return String(m).replace(/^erro do simulado em [a-z_]+: /, ''); }
  function confirmar(titulo, texto, botao, perigo){
    if (global.sagaConfirmar) return global.sagaConfirmar(titulo, texto, botao, perigo);
    return Promise.resolve(global.confirm(texto));
  }
  function recolher(el, ocultar, fim){
    if (!el) { if (fim) fim(); return; }
    if (global.sagaRecolher && !semMov()) global.sagaRecolher(el, ocultar, fim);
    else { el.hidden = !!ocultar; if (fim) fim(); }
  }
  function pad(n){ return String(n).padStart(2, '0'); }
  function dig(v){ return String(v == null ? '' : v).replace(/\D/g, ''); }

  /* ---------- dinheiro (formata enquanto digita: ninguém digita ponto nem vírgula) ---------- */
  function moeda(n){ return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function mascaraMoeda(v){
    var d = dig(v).replace(/^0+(?=\d)/, '').slice(0, 13);
    if (!d) return '';
    return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function lerMoeda(v){ var d = dig(v); return d ? parseInt(d, 10) / 100 : null; }
  function paraCampo(n){ return n == null || n === '' || isNaN(Number(n)) ? '' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function ligarMoeda(inp, aoMudar){
    inp.addEventListener('input', function(){
      var fim = inp.value.length - (inp.selectionEnd == null ? inp.value.length : inp.selectionEnd);
      inp.value = mascaraMoeda(inp.value);
      var pos = Math.max(0, inp.value.length - fim);
      try { inp.setSelectionRange(pos, pos); } catch(e) {}
      if (aoMudar) aoMudar();
    });
  }
  // o mesmo jeito do banco: cada parcela = total ÷ número (centavos para baixo); a última leva a diferença
  function dividir(total, n){
    var cent = Math.round(Number(total || 0) * 100), base = Math.floor(cent / n);
    return { base: base / 100, ultima: (cent - base * (n - 1)) / 100 };
  }

  /* ---------- datas (sem fuso: tudo em aaaa-mm-dd) ---------- */
  function isoDe(dt){ return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
  function isoHoje(){ return isoDe(new Date()); }
  function partes(iso){ var p = String(iso || '').slice(0, 10).split('-'); return { a: +p[0], m: +p[1] - 1, d: +p[2] }; }
  function dBr(iso){ if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function diasAte(iso){
    var p = partes(iso), h = new Date();
    return Math.round((new Date(p.a, p.m, p.d) - new Date(h.getFullYear(), h.getMonth(), h.getDate())) / 86400000);
  }
  function somaDias(iso, n){ var p = partes(iso); return isoDe(new Date(p.a, p.m, p.d + n)); }
  function somaMeses(iso, n){ // 31/01 + 1 mês = 28 ou 29/02, como no banco
    var p = partes(iso), ult = new Date(p.a, p.m + n + 1, 0).getDate();
    return isoDe(new Date(p.a, p.m + n, Math.min(p.d, ult)));
  }
  function vencimento(primeiro, per, i){
    if (per === 'quinzenal') return somaDias(primeiro, 15 * (i - 1));
    if (per === 'semanal') return somaDias(primeiro, 7 * (i - 1));
    return somaMeses(primeiro, i - 1);
  }

  /* ---------- estilo (só variáveis do tema) ---------- */
  function css(){
    if (document.getElementById('spg-css')) return;
    var s = document.createElement('style'); s.id = 'spg-css';
    s.textContent =
      '.spg-lista{display:flex;flex-direction:column;gap:10px}.spg-lista [hidden]{display:none!important}' +
      '.spg-vazio{font-size:11px;color:var(--muted);line-height:1.5}' +
      '.spg-ac{border:1px solid var(--border-soft,var(--border));border-radius:12px;padding:10px 11px;display:flex;flex-direction:column;gap:7px;transition:border-color .3s ' + CURVA + ',box-shadow .3s ' + CURVA + '}' +
      '.spg-ac.realce{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}' +
      '.spg-cab{display:flex;align-items:flex-start;gap:8px}.spg-cab-txt{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:3px}' +
      '.spg-tit{font-size:12px;font-weight:600;color:var(--text);overflow-wrap:anywhere}' +
      '.spg-tipo{align-self:flex-start;display:inline-block;max-width:100%;padding:3px 7px;border-radius:6px;background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c);font-size:9.5px;font-weight:700;line-height:1.1}' +
      'body:not([data-theme="light"]) .spg-tipo{color:color-mix(in srgb,var(--c) 62%,#ffffff)}' +
      '.spg-sub{font-size:10px;color:var(--muted);line-height:1.45;overflow-wrap:anywhere}' +
      '.spg-ed{flex:0 0 auto;width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--border-soft,var(--border));border-radius:8px;background:transparent;color:var(--muted);cursor:pointer;transition:border-color .25s ' + CURVA + ',color .25s ' + CURVA + '}' +
      '.spg-ed:hover{border-color:var(--gold);color:var(--gold)}' +
      '.spg-barra{height:5px;border-radius:99px;background:color-mix(in srgb,var(--text) 9%,transparent);overflow:hidden}' +
      '.spg-barra i{display:block;height:100%;border-radius:99px;background:var(--success,#2fae7a);transition:width .42s ' + CURVA + '}' +
      '.spg-res{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:10.5px;color:var(--muted)}.spg-res b{color:var(--text);font-weight:600}' +
      '.spg-prox{font-size:10.5px;line-height:1.45;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--gold) 9%,transparent);color:var(--text)}' +
      '.spg-prox.atraso{background:color-mix(in srgb,var(--danger,#e5484d) 12%,transparent);color:var(--danger,#e5484d);font-weight:600}' +
      '.spg-prox.ok{background:color-mix(in srgb,var(--success,#2fae7a) 12%,transparent);color:var(--success,#2fae7a);font-weight:600}' +
      '.spg-parcs{display:flex;flex-direction:column}' +
      '.spg-parc{display:grid;grid-template-columns:22px 34px 1fr auto 22px;align-items:center;gap:6px;padding:5px 0;border-top:1px dashed var(--border-soft,var(--border));font-size:10.5px;color:var(--text);font-variant-numeric:tabular-nums}' +
      '.spg-parc:first-child{border-top:0}' +
      '.spg-parc .n{color:var(--muted)}.spg-parc .d small{display:block;color:var(--muted);font-size:9.5px}.spg-parc .v{font-weight:600;text-align:right}' +
      '.spg-parc.atraso .d{color:var(--danger,#e5484d);font-weight:600}' +
      '.spg-parc.paga .v,.spg-parc.paga .d{color:var(--muted)}' +
      '.spg-parc.saindo .d,.spg-parc.saindo .v,.spg-parc.saindo .n{text-decoration:line-through;text-decoration-color:var(--success,#2fae7a);opacity:.55;transition:opacity .32s ' + CURVA + '}' +
      '.spg-chk{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--border);background:transparent;display:grid;place-items:center;color:transparent;cursor:pointer;padding:0;transition:background-color .25s ' + CURVA + ',border-color .25s ' + CURVA + ',color .25s ' + CURVA + ',transform .2s ' + CURVA + '}' +
      '.spg-chk:hover:not([disabled]){border-color:var(--success,#2fae7a)}.spg-chk:active:not([disabled]){transform:scale(.9)}' +
      '.spg-chk[aria-pressed=true]{background:color-mix(in srgb,var(--success,#2fae7a) 22%,transparent);border-color:var(--success,#2fae7a);color:var(--success,#2fae7a)}' +
      '.spg-chk[disabled]{cursor:default;opacity:.55}' +
      '.spg-ep{width:22px;height:22px;display:grid;place-items:center;border:0;background:transparent;color:var(--muted);cursor:pointer;border-radius:6px;padding:0}.spg-ep:hover{color:var(--gold)}' +
      '.spg-mais-bt,.spg-pagas-bt{align-self:flex-start;border:0;background:transparent;color:var(--muted);font:inherit;font-size:10.5px;cursor:pointer;padding:2px 0;display:inline-flex;gap:5px;align-items:center}' +
      '.spg-mais-bt:hover,.spg-pagas-bt:hover{color:var(--gold)}' +
      '.spg-pagas-bt i{display:inline-block;transition:transform .3s ' + CURVA + '}.spg-pagas-bt[aria-expanded=true] i{transform:rotate(90deg)}' +
      '.spg-nota{font-size:9.5px;color:var(--muted);line-height:1.45}' +
      '.spg-ov{position:fixed;inset:0;z-index:1750;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,14,.6);opacity:0;transition:opacity 260ms ' + CURVA + '}' +
      '.spg-ov.aberto{opacity:1}.spg-ov.sem-mov,.spg-ov.sem-mov .spg-modal{transition:none!important}' +
      '.spg-modal{background:var(--panel-solid,var(--panel));color:var(--text);border:1px solid var(--border);border-radius:16px;width:min(560px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.35);transform:translateY(14px) scale(.985);transition:transform 380ms ' + CURVA + '}' +
      '.spg-ov.aberto .spg-modal{transform:none}' +
      '.spg-mcab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--border-soft,var(--border))}' +
      '.spg-mcab h3{margin:0;font-size:17px;font-weight:600;color:var(--text)}.spg-mcab p{margin:4px 0 0;font-size:11px;color:var(--muted);line-height:1.45}' +
      '.spg-x{background:none;border:1px solid var(--border-soft,var(--border));color:var(--muted);font-size:14px;cursor:pointer;border-radius:9px;width:30px;height:30px;flex:0 0 auto}' +
      '.spg-corpo{padding:14px 18px;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:12px}' +
      '.spg-pe{display:flex;align-items:center;gap:8px;padding:12px 18px 16px;border-top:1px solid var(--border-soft,var(--border));flex-wrap:wrap}.spg-pe .esp{flex:1 1 auto}' +
      '.spg-modal [hidden]{display:none!important}' +
      '.spg-campo{display:flex;flex-direction:column;gap:5px;min-width:0}' +
      '.spg-campo>label,.spg-rot{font-size:9.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--gold)}' +
      '.spg-in{font:inherit;font-size:12px;color:var(--text);background:color-mix(in srgb,var(--text) 5%,transparent);border:1px solid var(--border-soft,var(--border));border-radius:9px;padding:9px 10px;width:100%;box-sizing:border-box;min-width:0;outline:0}' +
      '.spg-in:focus{border-color:var(--gold)}textarea.spg-in{min-height:60px;resize:vertical}' +
      '.spg-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.spg-g3{display:grid;grid-template-columns:1.2fr .8fr 1.2fr;gap:10px}' +
      '.spg-dica{font-size:10.5px;color:var(--muted);line-height:1.5}' +
      '.spg-previa{font-size:11px;line-height:1.5;padding:9px 10px;border-radius:10px;background:color-mix(in srgb,var(--gold) 8%,transparent);color:var(--text)}' +
      '.spg-previa.erro{background:color-mix(in srgb,var(--danger,#e5484d) 12%,transparent);color:var(--danger,#e5484d)}' +
      '.spg-hon{font-size:10.5px;line-height:1.5;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--success,#2fae7a) 40%,transparent);color:var(--text)}' +
      '.spg-seg{display:inline-flex;gap:4px;padding:3px;border:1px solid var(--border-soft,var(--border));border-radius:999px;flex-wrap:wrap;align-self:flex-start}' +
      '.spg-seg button{font:inherit;font-size:11px;border:1px solid transparent;background:transparent;color:var(--text);border-radius:999px;padding:5px 12px;cursor:pointer}' +
      '.spg-erro{font-size:11px;color:var(--danger,#e5484d);min-height:0}' +
      '@media (max-width:600px){.spg-ov{padding:8px;align-items:flex-end}.spg-g2,.spg-g3{grid-template-columns:1fr}.spg-pe .btn-primary,.spg-pe .btn-secondary{flex:1 1 auto}}';
    document.head.appendChild(s);
  }

  /* ---------- janela (faz o próprio movimento pela opacidade: o saga_guard só anota) ---------- */
  var pilha = [];
  function janela(titulo, sub, corpo, pe){
    css();
    var ov = document.createElement('div'); ov.className = 'spg-ov' + (semMov() ? ' sem-mov' : '');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', titulo);
    ov.innerHTML = '<div class="spg-modal"><div class="spg-mcab"><div><h3>' + esc(titulo) + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><button type="button" class="spg-x" aria-label="Fechar">✕</button></div>' +
      '<div class="spg-corpo">' + corpo + '</div><div class="spg-pe">' + pe + '</div></div>';
    document.body.appendChild(ov);
    var tecla = function(e){ if (e.key !== 'Escape' || pilha[pilha.length - 1] !== ov) return; if (e.target && e.target.closest && e.target.closest('.se-menu')) return; e.stopPropagation(); fechar(); };
    function fechar(){
      if (ov._fechando) return; ov._fechando = true; document.removeEventListener('keydown', tecla, true);
      var ix = pilha.indexOf(ov); if (ix >= 0) pilha.splice(ix, 1);
      if (semMov()) { ov.remove(); return; }
      ov.classList.remove('aberto'); setTimeout(function(){ ov.remove(); }, 380);
    }
    document.addEventListener('keydown', tecla, true); pilha.push(ov);
    ov.querySelector('.spg-x').addEventListener('click', fechar);
    ov.addEventListener('mousedown', function(e){ ov._fora = e.target === ov; });
    ov.addEventListener('click', function(e){ if (e.target === ov && ov._fora) fechar(); ov._fora = false; });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-fechar]'), function(b){ b.addEventListener('click', fechar); });
    if (semMov()) ov.classList.add('aberto');
    else requestAnimationFrame(function(){ requestAnimationFrame(function(){ ov.classList.add('aberto'); }); });
    ov.fechar = fechar;
    ov.q = function(nome){ return ov.querySelector('[data-s="' + nome + '"]'); };
    return ov;
  }
  function ocupar(ov, sim){ Array.prototype.forEach.call(ov.querySelectorAll('.spg-pe button'), function(b){ b.disabled = !!sim; }); }

  /* ---------- dados ---------- */
  async function permissoes(forcar){
    if (cache.perm && !forcar) return cache.perm;
    var r = await sb().rpc('pagamentos_minhas_permissoes');
    if (r.error) throw r.error;
    cache.perm = r.data || {};
    return cache.perm;
  }
  async function tipos(forcar){
    if (cache.tipos && !forcar) return cache.tipos;
    var r = await sb().from('etiquetas_catalogo').select('id,nome,cor,ordem,ativo,acao').eq('categoria', 'pagamento_tipo').order('ordem');
    cache.tipos = r.error ? [] : (r.data || []);
    return cache.tipos;
  }
  function ehHonorarios(tipo){
    if (!tipo) return false;
    var t = (cache.tipos || []).find(function(x){ return x.id === tipo.id; });
    return !!(t && t.acao === 'honorarios');
  }
  function catalogo(categoria, textos){
    if (!global.SagaEtiquetas) return null;
    var perm = cache.perm || {};
    return global.SagaEtiquetas.criar({
      sb: sb(), categoria: categoria, admin: !!perm.admin, textos: textos,
      salvar: function(p){ return sb().rpc('catalogo_salvar', { p_categoria: categoria, p_id: p.p_id, p_nome: p.p_nome, p_cor: p.p_cor, p_ativo: p.p_ativo, p_conta_protocolada: null }); },
      erro: function(m){ aviso(m, 'erro'); }
    });
  }

  /* ---------- bloco da ficha ---------- */
  function resumo(a){
    var ps = a.parcelas || [], hoje = isoHoje();
    var pagas = ps.filter(function(p){ return !!p.pago_em; });
    var abertas = ps.filter(function(p){ return !p.pago_em; });
    var pago = pagas.reduce(function(s, p){ return s + Number(p.valor_pago != null ? p.valor_pago : p.valor); }, 0);
    var falta = abertas.reduce(function(s, p){ return s + Number(p.valor || 0); }, 0);
    var atrasadas = abertas.filter(function(p){ return String(p.vencimento).slice(0, 10) < hoje; });
    return { pagas: pagas, abertas: abertas, pago: pago, falta: falta, atrasadas: atrasadas, total: Number(a.valor_total || 0), n: ps.length };
  }
  var ICONE_OK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICONE_LAPIS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  function htmlParcela(a, p, n){
    var paga = !!p.pago_em, d = diasAte(p.vencimento), atraso = !paga && d < 0;
    var quando = paga
      ? 'venceu ' + dBr(p.vencimento) + '<small>paga em ' + esc(dBr(p.pago_em)) + (p.forma ? ' · ' + esc(p.forma) : '') + (p.observacao ? ' · ' + esc(p.observacao) : '') + '</small>'
      : (atraso ? 'venceu ' + dBr(p.vencimento) + '<small>atrasada há ' + (-d) + ' dia' + (-d === 1 ? '' : 's') + '</small>' : (d === 0 ? 'vence hoje' : 'vence ' + dBr(p.vencimento)) + (p.observacao ? '<small>' + esc(p.observacao) + '</small>' : ''));
    var valor = paga ? moeda(p.valor_pago != null ? p.valor_pago : p.valor) : moeda(p.valor);
    return '<div class="spg-parc' + (paga ? ' paga' : '') + (atraso ? ' atraso' : '') + '" data-parc="' + esc(p.id) + '">' +
      '<button type="button" class="spg-chk" data-marcar="' + esc(p.id) + '" aria-pressed="' + paga + '" ' + (a.pode_mexer ? '' : 'disabled ') +
        'title="' + (paga ? 'Paga (clique para desmarcar)' : 'Marcar como paga') + '" aria-label="Parcela ' + p.numero + ' de ' + n + (paga ? ', paga' : ', marcar como paga') + '">' + ICONE_OK + '</button>' +
      '<span class="n">' + p.numero + '/' + n + '</span><span class="d">' + quando + '</span><span class="v">' + valor + '</span>' +
      (a.pode_mexer && !paga ? '<button type="button" class="spg-ep" data-editar-parc="' + esc(p.id) + '" title="Mudar o vencimento ou o valor desta parcela" aria-label="Editar a parcela ' + p.numero + '">' + ICONE_LAPIS + '</button>' : '<span></span>') +
      '</div>';
  }
  function htmlAcordo(a){
    var r = resumo(a), n = r.n || a.n_parcelas, pct = r.total > 0 ? Math.min(100, Math.round(r.pago / r.total * 100)) : 0;
    var proc = a.numero_processo_cnj ? 'Processo ' + esc(a.numero_processo_cnj) : (a.processo_id ? 'Processo sem número' : 'Sem processo (só do cliente)');
    var sub = [proc];
    if (a.pagador) sub.push('Quem paga: ' + esc(a.pagador));
    var prox = r.abertas[0], proxHtml;
    if (r.atrasadas.length) {
      var at = r.atrasadas[0], da = -diasAte(at.vencimento);
      proxHtml = '<div class="spg-prox atraso">' + (r.atrasadas.length > 1 ? r.atrasadas.length + ' parcelas atrasadas · ' : '') + 'parcela ' + at.numero + '/' + n + ' (' + moeda(at.valor) + ') venceu em ' + dBr(at.vencimento) + ', há ' + da + ' dia' + (da === 1 ? '' : 's') + '</div>';
    } else if (prox) {
      var dp = diasAte(prox.vencimento);
      proxHtml = '<div class="spg-prox">Próxima: parcela ' + prox.numero + '/' + n + ' · ' + moeda(prox.valor) + ' · ' + (dp === 0 ? 'vence hoje' : 'vence em ' + dBr(prox.vencimento)) + '</div>';
    } else proxHtml = '<div class="spg-prox ok">Tudo pago ✓</div>';
    var abertasVisiveis = r.abertas.slice(0, MOSTRAR_ABERTAS), resto = r.abertas.slice(MOSTRAR_ABERTAS);
    var maisAberto = atual && atual.maisAbertas.has(a.id), pagasAberto = atual && atual.pagasAbertas.has(a.id);
    return '<div class="spg-ac" data-ac="' + esc(a.id) + '">' +
      '<div class="spg-cab"><div class="spg-cab-txt">' + (a.tipo_nome ? '<span class="spg-tipo" style="--c:' + cor(a.tipo_cor) + '">' + esc(a.tipo_nome) + '</span>' : '') +
        '<span class="spg-tit">' + esc(a.descricao || a.tipo_nome || 'Pagamento combinado') + '</span><span class="spg-sub">' + sub.join(' · ') + '</span></div>' +
        (a.pode_mexer ? '<button type="button" class="spg-ed" data-editar-ac="' + esc(a.id) + '" title="Editar este pagamento" aria-label="Editar este pagamento">' + ICONE_LAPIS + '</button>' : '') + '</div>' +
      '<div class="spg-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Quanto já foi pago"><i style="width:' + pct + '%"></i></div>' +
      '<div class="spg-res"><span>Pago <b>' + moeda(r.pago) + '</b> de <b>' + moeda(r.total) + '</b></span><span>' + r.pagas.length + ' de ' + n + ' parcela' + (n === 1 ? '' : 's') + '</span></div>' +
      proxHtml +
      (abertasVisiveis.length ? '<div class="spg-parcs">' + abertasVisiveis.map(function(p){ return htmlParcela(a, p, n); }).join('') + '</div>' : '') +
      (resto.length ? '<div class="spg-parcs spg-mais"' + (maisAberto ? '' : ' hidden') + '>' + resto.map(function(p){ return htmlParcela(a, p, n); }).join('') + '</div>' +
        '<button type="button" class="spg-mais-bt" data-mais="' + esc(a.id) + '" aria-expanded="' + !!maisAberto + '">' + (maisAberto ? 'Mostrar menos' : 'Ver mais ' + resto.length + ' parcela' + (resto.length === 1 ? '' : 's') + ' a pagar') + '</button>' : '') +
      (r.pagas.length ? '<button type="button" class="spg-pagas-bt" data-pagas="' + esc(a.id) + '" aria-expanded="' + !!pagasAberto + '"><i>▸</i>Pagas (' + r.pagas.length + ')</button>' +
        '<div class="spg-parcs spg-pagas"' + (pagasAberto ? '' : ' hidden') + '>' + r.pagas.slice().reverse().map(function(p){ return htmlParcela(a, p, n); }).join('') + '</div>' : '') +
      (a.honorarios ? '<div class="spg-nota">Honorários: cada parcela paga entra no Financeiro como recebida.</div>' : '') +
      (a.observacao ? '<div class="spg-nota">' + esc(a.observacao) + '</div>' : '') +
      '</div>';
  }
  function desenhar(){
    if (!atual) return;
    var el = atual.el, perm = cache.perm || {};
    if (!atual.acordos.length) {
      el.innerHTML = '<div class="spg-vazio">Nenhum pagamento combinado com este cliente.' + (perm.mexer || perm.mexer_honorarios ? ' Registre aqui honorários parcelados, pensão ou acordo e marque cada parcela paga.' : '') + '</div>';
      return;
    }
    el.innerHTML = '<div class="spg-lista">' + atual.acordos.map(htmlAcordo).join('') + '</div>';
  }
  function acordoPorId(id){ return (atual && atual.acordos || []).find(function(a){ return a.id === id; }) || null; }
  function parcelaPorId(id){
    var achado = null;
    (atual && atual.acordos || []).some(function(a){ var p = (a.parcelas || []).find(function(x){ return x.id === id; }); if (p) { achado = { a: a, p: p }; return true; } return false; });
    return achado;
  }
  async function recarregar(){
    if (!atual) return;
    var r = await sb().rpc('pagamentos_da_ficha', { p_pessoa: atual.ctx.pessoaId });
    if (r.error) { aviso('Não foi possível atualizar os pagamentos: ' + erroTxt(r.error), 'erro'); return; }
    atual.acordos = Array.isArray(r.data) ? r.data : [];
    desenhar();
  }
  function ligarCliques(el){
    if (el._spgLigado) return; el._spgLigado = true;
    el.addEventListener('click', function(ev){
      var b = ev.target.closest('button'); if (!b || !el.contains(b) || b.disabled) return;
      if (b.dataset.marcar) { var x = parcelaPorId(b.dataset.marcar); if (x) (x.p.pago_em ? desmarcar(x.a, x.p) : abrirMarcar(x.a, x.p)); return; }
      if (b.dataset.editarParc) { var y = parcelaPorId(b.dataset.editarParc); if (y) abrirParcela(y.a, y.p); return; }
      if (b.dataset.editarAc) { var a = acordoPorId(b.dataset.editarAc); if (a) abrirAcordo(a); return; }
      if (b.dataset.pagas || b.dataset.mais) {
        var id = b.dataset.pagas || b.dataset.mais, conj = b.dataset.pagas ? atual.pagasAbertas : atual.maisAbertas;
        var alvo = b.dataset.pagas ? b.nextElementSibling : b.previousElementSibling;
        var abrir = !conj.has(id);
        if (abrir) conj.add(id); else conj.delete(id);
        b.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        if (b.dataset.mais) { var qtd = alvo ? alvo.querySelectorAll('.spg-parc').length : 0; b.textContent = abrir ? 'Mostrar menos' : 'Ver mais ' + qtd + ' parcela' + (qtd === 1 ? '' : 's') + ' a pagar'; }
        recolher(alvo, !abrir);
      }
    });
  }
  async function blocoFicha(el, ctx){
    css();
    var sec = ctx.secao, botao = ctx.botao;
    atual = { el: el, ctx: ctx, acordos: [], pagasAbertas: (atual && atual.ctx && atual.ctx.pessoaId === ctx.pessoaId) ? atual.pagasAbertas : new Set(), maisAbertas: (atual && atual.ctx && atual.ctx.pessoaId === ctx.pessoaId) ? atual.maisAbertas : new Set() };
    var perm;
    try { perm = await permissoes(); } catch(e) { if (sec) sec.hidden = true; return false; }
    if (!perm || (!perm.ver && !perm.ver_honorarios)) { if (sec) sec.hidden = true; return false; }
    var r = await sb().rpc('pagamentos_da_ficha', { p_pessoa: ctx.pessoaId });
    if (r.error) { if (sec) sec.hidden = true; return false; }   // banco ainda sem o bloco 167, ou sem acesso
    atual.acordos = Array.isArray(r.data) ? r.data : [];
    tipos();
    if (botao) { botao.hidden = !(perm.mexer || perm.mexer_honorarios); botao.onclick = function(){ abrirAcordo(null); }; }
    ligarCliques(el);
    desenhar();
    if (sec) sec.hidden = false;
    return true;
  }
  function rolar(){
    var sec = atual && atual.ctx && atual.ctx.secao; if (!sec || sec.hidden) return;
    setTimeout(function(){
      var primeiro = sec.querySelector('.spg-prox.atraso');
      var card = primeiro ? primeiro.closest('.spg-ac') : sec.querySelector('.spg-ac');
      // para o cartão (o atrasado, se houver) logo abaixo da barra do topo, que fica fixa por cima da tela
      var alvo = card || sec, barra = document.getElementById('topbarSaga');
      var folga = (barra ? Math.max(0, barra.getBoundingClientRect().bottom) : 64) + 14;
      try { global.scrollTo({ top: Math.max(0, alvo.getBoundingClientRect().top + (global.scrollY || 0) - folga), behavior: semMov() ? 'auto' : 'smooth' }); } catch(e) {}
      if (card) { card.classList.add('realce'); setTimeout(function(){ card.classList.remove('realce'); }, 2400); }
    }, 250);
  }

  /* ---------- marcar e desmarcar uma parcela ---------- */
  function abrirMarcar(a, p){
    var n = (a.parcelas || []).length || a.n_parcelas, hoje = isoHoje(), formaSel = null;
    var ov = janela('Parcela ' + p.numero + '/' + n + ' paga', esc(a.descricao || a.tipo_nome || 'Pagamento') + ' · vencimento ' + dBr(p.vencimento) + ' · ' + moeda(p.valor),
      '<div class="spg-g2"><div class="spg-campo"><label for="spgData">Data do pagamento</label><input class="spg-in" id="spgData" data-s="data" type="date" max="' + hoje + '" value="' + hoje + '"></div>' +
      '<div class="spg-campo"><label for="spgValor">Valor pago (R$)</label><input class="spg-in" id="spgValor" data-s="valor" inputmode="numeric" autocomplete="off" value="' + paraCampo(p.valor) + '"></div></div>' +
      '<div class="spg-campo"><span class="spg-rot">Forma de pagamento</span><div data-s="forma"></div></div>' +
      '<div class="spg-campo"><label for="spgObsP">Observação (opcional)</label><input class="spg-in" id="spgObsP" data-s="obs" maxlength="200" autocomplete="off" placeholder="Ex.: pagou pelo filho; comprovante no WhatsApp"></div>' +
      (a.honorarios ? '<div class="spg-hon">Honorários: o valor entra no Financeiro como <b>recebido</b> nesta data.</div>' : '') +
      '<div class="spg-erro" data-s="erro" role="alert"></div>',
      '<span class="esp"></span><button type="button" class="btn-secondary" data-fechar>Cancelar</button><button type="button" class="btn-primary" data-s="ok">Marcar como paga</button>');
    ligarMoeda(ov.q('valor'));
    var cat = catalogo('pagamento_forma', { campo: 'Forma de pagamento', vazio: 'Não informada', nova: '+ Nova forma', editar: 'Editar forma', novaT: 'Nova forma', salvar: 'Salvar forma', erro: 'Não foi possível salvar a forma.', carregar: 'Não foi possível carregar as formas de pagamento.' });
    if (cat) { cat.carregar().then(function(){ cat.montar(ov.q('forma'), { valor: function(){ return formaSel; }, escolher: function(e){ formaSel = e; } }); }); }
    else ov.q('forma').innerHTML = '<input class="spg-in" data-s="formaTxt" maxlength="40" placeholder="Ex.: PIX">';
    ov.q('ok').addEventListener('click', async function(){
      var data = ov.q('data').value, valor = lerMoeda(ov.q('valor').value), erro = ov.q('erro');
      erro.textContent = '';
      if (!data) { erro.textContent = 'Informe a data do pagamento.'; return; }
      if (data > hoje) { erro.textContent = 'A data do pagamento não pode ser depois de hoje.'; return; }
      if (!valor || valor <= 0) { erro.textContent = 'Informe o valor pago.'; return; }
      var forma = formaSel ? formaSel.nome : (ov.q('formaTxt') ? ov.q('formaTxt').value.trim() : '');
      ocupar(ov, true);
      var r = await sb().rpc('pagamento_parcela_marcar', { p_parcela: p.id, p_pago: true, p_valor: valor, p_data: data, p_forma: forma || null, p_obs: ov.q('obs').value.trim() || null });
      ocupar(ov, false);
      if (r.error) { erro.textContent = 'Não foi possível marcar: ' + erroTxt(r.error); return; }
      ov.fechar();
      aviso('Parcela ' + p.numero + '/' + n + ' marcada como paga' + (a.honorarios ? ' e lançada no Financeiro.' : '.'), 'ok');
      saidaRiscada(p.id, recarregar);
    });
    setTimeout(function(){ try { ov.q('valor').focus(); ov.q('valor').select(); } catch(e) {} }, 60);
  }
  // a linha é riscada e sai da lista das que faltam pagar (vai para "Pagas")
  function saidaRiscada(parcelaId, depois){
    var linha = atual && atual.el.querySelector('.spg-parc[data-parc="' + parcelaId + '"]');
    if (!linha || semMov()) { depois(); return; }
    var chk = linha.querySelector('.spg-chk'); if (chk) chk.setAttribute('aria-pressed', 'true');
    linha.classList.add('saindo');
    setTimeout(function(){ recolher(linha, true, function(){ depois(); }); }, 320);
  }
  async function desmarcar(a, p){
    var n = (a.parcelas || []).length || a.n_parcelas;
    var ok = await confirmar('Desmarcar a parcela?', 'A parcela ' + p.numero + '/' + n + ' volta para "a pagar"' + (a.honorarios ? ' e o valor sai do Financeiro' : '') + '. Fica no registro de atividades.', 'Desmarcar', false);
    if (!ok) return;
    var r = await sb().rpc('pagamento_parcela_marcar', { p_parcela: p.id, p_pago: false, p_valor: null, p_data: null, p_forma: null, p_obs: null });
    if (r.error) { aviso('Não foi possível desmarcar: ' + erroTxt(r.error), 'erro'); return; }
    aviso('Parcela ' + p.numero + '/' + n + ' voltou para "a pagar".', 'ok');
    await recarregar();
  }

  /* ---------- mudar uma parcela que falta pagar ---------- */
  function abrirParcela(a, p){
    var n = (a.parcelas || []).length || a.n_parcelas;
    var ov = janela('Parcela ' + p.numero + '/' + n, 'Mude o vencimento ou o valor desta parcela. O total do pagamento passa a ser a soma das parcelas.',
      '<div class="spg-g2"><div class="spg-campo"><label for="spgVenc">Vencimento</label><input class="spg-in" id="spgVenc" data-s="venc" type="date" value="' + esc(String(p.vencimento).slice(0, 10)) + '"></div>' +
      '<div class="spg-campo"><label for="spgValP">Valor (R$)</label><input class="spg-in" id="spgValP" data-s="valor" inputmode="numeric" autocomplete="off" value="' + paraCampo(p.valor) + '"></div></div>' +
      '<div class="spg-campo"><label for="spgObsE">Observação (opcional)</label><input class="spg-in" id="spgObsE" data-s="obs" maxlength="200" autocomplete="off" value="' + esc(p.observacao || '') + '"></div>' +
      '<div class="spg-erro" data-s="erro" role="alert"></div>',
      '<span class="esp"></span><button type="button" class="btn-secondary" data-fechar>Cancelar</button><button type="button" class="btn-primary" data-s="ok">Salvar parcela</button>');
    ligarMoeda(ov.q('valor'));
    ov.q('ok').addEventListener('click', async function(){
      var venc = ov.q('venc').value, valor = lerMoeda(ov.q('valor').value), erro = ov.q('erro');
      erro.textContent = '';
      if (!venc) { erro.textContent = 'Informe o vencimento.'; return; }
      if (!valor || valor <= 0) { erro.textContent = 'Informe um valor maior que zero.'; return; }
      ocupar(ov, true);
      var r = await sb().rpc('pagamento_parcela_editar', { p_parcela: p.id, p_vencimento: venc, p_valor: valor, p_obs: ov.q('obs').value.trim() || null });
      ocupar(ov, false);
      if (r.error) { erro.textContent = 'Não foi possível salvar: ' + erroTxt(r.error); return; }
      ov.fechar(); aviso('Parcela ' + p.numero + '/' + n + ' atualizada.', 'ok'); await recarregar();
    });
  }

  /* ---------- novo pagamento / editar ---------- */
  async function abrirAcordo(a){
    var perm = cache.perm || {}, ctx = atual ? atual.ctx : {};
    await tipos();
    var tipoSel = a && a.tipo_id ? ((cache.tipos || []).find(function(t){ return t.id === a.tipo_id; }) || { id: a.tipo_id, nome: a.tipo_nome, cor: a.tipo_cor }) : null;
    if (!a && !perm.mexer && perm.mexer_honorarios) tipoSel = (cache.tipos || []).find(function(t){ return t.acao === 'honorarios' && t.ativo; }) || null;
    var temPaga = !!(a && (a.parcelas || []).some(function(p){ return !!p.pago_em; }));
    var procAtivo = a ? a.processo_id : (typeof ctx.processoAtivo === 'function' ? ctx.processoAtivo() : null);
    var procs = (ctx.processos || []).slice();
    if (a && a.processo_id && !procs.some(function(p){ return p.id === a.processo_id; })) procs.push({ id: a.processo_id, rotulo: a.numero_processo_cnj || 'Processo' });
    var per = a ? a.periodicidade : 'mensal';
    var ov = janela(a ? 'Editar pagamento' : 'Novo pagamento', a
        ? (temPaga ? 'As parcelas já pagas ficam como estão; as que faltam são refeitas com o valor que sobra.' : 'Mudar o total, o número de parcelas ou as datas refaz as parcelas.')
        : 'Honorários parcelados, pensão, acordo da outra parte... O valor de cada parcela sai sozinho (e o total também, se preferir digitar a parcela).',
      '<div class="spg-campo"><span class="spg-rot">Tipo</span><div data-s="tipo"></div></div>' +
      '<div class="spg-hon" data-s="hon" hidden>Honorários: cada parcela marcada como paga entra no Financeiro como <b>recebida</b>, na data do pagamento.</div>' +
      '<div class="spg-g2"><div class="spg-campo"><label for="spgProc">Processo</label><select class="spg-in" id="spgProc" data-s="proc"><option value="">Sem processo (só do cliente)</option>' +
        procs.map(function(p){ return '<option value="' + esc(p.id) + '"' + (p.id === procAtivo ? ' selected' : '') + '>' + esc(p.rotulo) + '</option>'; }).join('') + '</select></div>' +
      '<div class="spg-campo"><label for="spgPagador">Quem paga</label><input class="spg-in" id="spgPagador" data-s="pagador" maxlength="120" autocomplete="off" placeholder="Ex.: o próprio cliente, o pai da criança" value="' + esc(a && a.pagador || '') + '"></div></div>' +
      '<div class="spg-campo"><label for="spgDesc">Descrição (opcional)</label><input class="spg-in" id="spgDesc" data-s="desc" maxlength="140" autocomplete="off" placeholder="Ex.: honorários do contrato; pensão de 2027" value="' + esc(a && a.descricao || '') + '"></div>' +
      '<div class="spg-g3"><div class="spg-campo"><label for="spgTotal">Valor total (R$)</label><input class="spg-in" id="spgTotal" data-s="total" inputmode="numeric" autocomplete="off" placeholder="0,00" value="' + (a ? paraCampo(a.valor_total) : '') + '"></div>' +
      '<div class="spg-campo"><label for="spgN">Nº de parcelas</label><input class="spg-in" id="spgN" data-s="n" type="number" min="1" max="240" step="1" inputmode="numeric" value="' + (a ? a.n_parcelas : 1) + '"></div>' +
      '<div class="spg-campo"><label for="spgParc">Valor de cada parcela (R$)</label><input class="spg-in" id="spgParc" data-s="parc" inputmode="numeric" autocomplete="off" placeholder="0,00"></div></div>' +
      '<div class="spg-g2"><div class="spg-campo"><label for="spgPrim">1º vencimento</label><input class="spg-in" id="spgPrim" data-s="prim" type="date" value="' + esc(a ? String(a.primeiro_vencimento).slice(0, 10) : isoHoje()) + '"></div>' +
      '<div class="spg-campo"><span class="spg-rot">Repete</span><div class="seg spg-seg" data-s="per" role="group" aria-label="De quanto em quanto tempo">' +
        [['mensal', 'Mensal', 'Todo mês'], ['quinzenal', 'Quinzenal', 'A cada 15 dias'], ['semanal', 'Semanal', 'Toda semana']].map(function(o){ return '<button type="button" data-per="' + o[0] + '" class="' + (o[0] === per ? 'active' : '') + '" aria-pressed="' + (o[0] === per) + '" title="' + o[2] + '">' + o[1] + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="spg-previa" data-s="previa"></div>' +
      '<div class="spg-campo"><label for="spgObsA">Observação (opcional)</label><textarea class="spg-in" id="spgObsA" data-s="obs" maxlength="600">' + esc(a && a.observacao || '') + '</textarea></div>' +
      '<div class="spg-erro" data-s="erro" role="alert"></div>',
      (a && perm.admin ? '<button type="button" class="btn-danger" data-pg-remover data-s="remover" title="Só o administrador remove (fica no histórico)">Remover</button>' : '') +
      '<span class="esp"></span><button type="button" class="btn-secondary" data-fechar>Cancelar</button><button type="button" class="btn-primary" data-s="ok">' + (a ? 'Salvar' : 'Criar parcelas') + '</button>');

    var inTotal = ov.q('total'), inN = ov.q('n'), inParc = ov.q('parc'), inPrim = ov.q('prim'), previa = ov.q('previa');
    function lerN(){ var v = parseInt(inN.value, 10); return isFinite(v) ? v : null; }
    function mostrarHon(){ var h = ehHonorarios(tipoSel); var el = ov.q('hon'); if (!!h === !el.hidden) return; recolher(el, !h); }
    function desenharPrevia(){
      var total = lerMoeda(inTotal.value), n = lerN(), prim = inPrim.value;
      previa.classList.remove('erro');
      if (!n || n < 1 || n > 240) { previa.classList.add('erro'); previa.textContent = 'O número de parcelas vai de 1 a 240.'; return; }
      if (!total) { previa.textContent = 'Digite o valor total ou o valor de cada parcela.'; return; }
      var pagoJa = 0, nPagas = 0;
      if (a) (a.parcelas || []).forEach(function(p){ if (p.pago_em && p.numero <= n) { pagoJa += Number(p.valor_pago != null ? p.valor_pago : p.valor); nPagas++; } });
      var faltam = n - nPagas, resta = Math.round((total - pagoJa) * 100) / 100;
      if (a && temPaga && faltam > 0 && resta <= 0) { previa.classList.add('erro'); previa.textContent = 'O que já foi pago (' + moeda(pagoJa) + ') cobre o total: aumente o total ou diminua o número de parcelas.'; return; }
      var txt;
      if (a && temPaga) {
        if (!faltam) txt = 'Todas as ' + n + ' parcelas já estão pagas.';
        else { var dv = dividir(resta, faltam); txt = nPagas + ' paga' + (nPagas === 1 ? '' : 's') + ' (' + moeda(pagoJa) + ') + ' + faltam + ' a pagar de ' + moeda(dv.base) + (dv.ultima !== dv.base ? ' (a última de ' + moeda(dv.ultima) + ')' : ''); }
      } else {
        var d = dividir(total, n);
        txt = n === 1 ? '1 parcela de ' + moeda(total) : (d.ultima === d.base ? n + ' parcelas de ' + moeda(d.base) : (n - 1) + ' parcelas de ' + moeda(d.base) + ' e a última de ' + moeda(d.ultima));
      }
      if (prim && n) {
        var perAtual = (ov.q('per').querySelector('button.active') || {}).dataset;
        var pv = perAtual ? perAtual.per : 'mensal';
        txt += ' · de ' + dBr(prim) + (n > 1 ? ' a ' + dBr(vencimento(prim, pv, n)) : '');
      }
      previa.textContent = txt + '.';
    }
    function totalParaParcela(){
      var total = lerMoeda(inTotal.value), n = lerN();
      inParc.value = total && n && n >= 1 && n <= 240 ? paraCampo(dividir(total, n).base) : '';
      desenharPrevia();
    }
    function parcelaParaTotal(){
      var parc = lerMoeda(inParc.value), n = lerN();
      if (parc && n && n >= 1 && n <= 240) inTotal.value = paraCampo(Math.round(parc * n * 100) / 100);
      desenharPrevia();
    }
    ligarMoeda(inTotal, totalParaParcela);
    ligarMoeda(inParc, parcelaParaTotal);
    inN.addEventListener('input', function(){ if (lerMoeda(inParc.value) && !lerMoeda(inTotal.value)) parcelaParaTotal(); else totalParaParcela(); });
    inPrim.addEventListener('input', desenharPrevia);
    ov.q('per').addEventListener('click', function(e){
      var b = e.target.closest('button[data-per]'); if (!b) return;
      Array.prototype.forEach.call(ov.q('per').querySelectorAll('button'), function(x){ x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      desenharPrevia();
    });
    if (a) totalParaParcela(); else desenharPrevia();

    var cat = catalogo('pagamento_tipo', { campo: 'Tipo', vazio: 'Sem tipo', nova: '+ Novo tipo', editar: 'Editar tipo', novaT: 'Novo tipo', salvar: 'Salvar tipo', erro: 'Não foi possível salvar o tipo.', carregar: 'Não foi possível carregar os tipos.' });
    if (cat) {
      cat.carregar().then(function(){
        cat.montar(ov.q('tipo'), { valor: function(){ return tipoSel; }, escolher: function(e){ tipoSel = e; mostrarHon(); }, alterou: function(){ tipos(true).then(mostrarHon); } });
        mostrarHon();
      });
    }
    var rem = ov.q('remover');
    if (rem) rem.addEventListener('click', async function(){
      var ok = await confirmar('Remover este pagamento?', 'Ele sai da ficha' + (a.honorarios ? ' e os valores lançados no Financeiro saem também' : '') + '. As parcelas ficam guardadas no histórico.', 'Remover', true);
      if (!ok) return;
      ocupar(ov, true);
      var r = await sb().rpc('pagamento_acordo_remover', { p_id: a.id });
      ocupar(ov, false);
      if (r.error) { ov.q('erro').textContent = 'Não foi possível remover: ' + erroTxt(r.error); return; }
      ov.fechar(); aviso('Pagamento removido da ficha.', 'ok');
      var card = atual && atual.el.querySelector('.spg-ac[data-ac="' + a.id + '"]');
      if (card && !semMov()) recolher(card, true, recarregar); else await recarregar();
    });
    ov.q('ok').addEventListener('click', async function(){
      var erro = ov.q('erro'), total = lerMoeda(inTotal.value), n = lerN(), prim = inPrim.value;
      erro.textContent = '';
      var hon = ehHonorarios(tipoSel);
      if (hon && !perm.mexer_honorarios) { erro.textContent = 'Só quem lança no Financeiro registra honorários parcelados.'; return; }
      if (!hon && !perm.mexer) { erro.textContent = 'Você pode registrar só honorários parcelados.'; return; }
      if (!n || n < 1 || n > 240) { erro.textContent = 'O número de parcelas vai de 1 a 240.'; return; }
      if (!total || total <= 0) { erro.textContent = 'Informe o valor total ou o valor de cada parcela.'; return; }
      if (!prim) { erro.textContent = 'Informe o 1º vencimento.'; return; }
      if (previa.classList.contains('erro')) { erro.textContent = previa.textContent; return; }
      var b = ov.q('per').querySelector('button.active');
      var p = {
        id: a ? a.id : null, pessoa_id: ctx.pessoaId, processo_id: ov.q('proc').value || null, tipo_id: tipoSel ? tipoSel.id : null,
        honorarios: hon, descricao: ov.q('desc').value.trim(), pagador: ov.q('pagador').value.trim(), valor_total: total, n_parcelas: n,
        primeiro_vencimento: prim, periodicidade: b ? b.dataset.per : 'mensal', observacao: ov.q('obs').value.trim()
      };
      ocupar(ov, true);
      var r = await sb().rpc('pagamento_acordo_salvar', { p: p });
      ocupar(ov, false);
      if (r.error) { erro.textContent = 'Não foi possível salvar: ' + erroTxt(r.error); return; }
      ov.fechar();
      aviso(a ? 'Pagamento atualizado.' : 'Pagamento criado com ' + n + ' parcela' + (n === 1 ? '' : 's') + '.', 'ok');
      await recarregar();
      var novoId = r.data && r.data.id;
      var card = novoId && atual && atual.el.querySelector('.spg-ac[data-ac="' + novoId + '"]');
      if (card && !a && !semMov()) { card.classList.add('realce'); setTimeout(function(){ card.classList.remove('realce'); }, 1800); }
    });
    setTimeout(function(){ try { inTotal.focus(); } catch(e) {} }, 60);
  }

  global.SagaPagamentos = {
    configurar: function(o){ Object.assign(cfg, o || {}); },
    blocoFicha: blocoFicha,
    recarregar: recarregar,
    rolar: rolar,
    permissoes: permissoes,
    novo: function(){ return abrirAcordo(null); },
    moeda: moeda,
    _dividir: dividir,
    _vencimento: vencimento
  };
})(window);
