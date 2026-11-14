/* SAGA · Disparos de e-mail (T179, 14/11/2026; blocos 205 a 207).
   Pedido do Dr. Victor: escolher o cliente, pôr na lista de disparo e o sistema manda sozinho, de tempos em tempos,
   o e-mail com o MODELO da tese (pré-aprovado; só os dados do cliente mudam; nunca valores), pelo remetente escolhido
   (ou em rodízio), dentro do limite de cada remetente por manhã e por tarde.
     SagaDisparos.configurar({toast:fn(msg,'ok'|'erro'|'alerta')})
     SagaDisparos.enviar({itens:[{pessoa_id, processo_id?, nome?}], processos?:[{id,rotulo}], aoSalvar:fn})
         -> janela "Enviar e-mail": modelo (automático pela tese ou escolhido), remetente (rodízio ou escolhido),
            e-mail do cliente (um só), quando, prévia com os avisos e "Pôr na fila"
     SagaDisparos.blocoFicha(el, {secao, botao, pessoaId, pessoaNome, processos:[{id,rotulo}], processoAtivo:fn})
         -> histórico dos e-mails do cliente na ficha (na fila, enviado, erro com o motivo, respondido) + botão
     SagaDisparos.situacao(s) -> {rotulo, cor}
   Tudo grava pelas funções disparo_* do banco (que conferem a permissão disparos.enviar de novo).
   Movimento: curva cubic-bezier(.22,.78,.25,1), respeita "Efeitos de movimento" (saga-movimento = 'reduzido'). */
(function(global){
  'use strict';
  var CURVA = 'cubic-bezier(.22,.78,.25,1)';
  var cfg = { toast: null };
  var SIT = {
    na_fila: { rotulo: 'Na fila', cor: 'cinza' }, enviando: { rotulo: 'Enviando', cor: 'cinza' },
    enviado: { rotulo: 'Enviado', cor: 'ok' }, respondido: { rotulo: 'Respondido', cor: 'ok' },
    erro: { rotulo: 'Não saiu', cor: 'vermelho' }, cancelado: { rotulo: 'Cancelado', cor: 'cinza' }
  };

  function sb(){ return global._sb; }
  function esc(t){ var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function semMov(){ try { return localStorage.getItem('saga-movimento') === 'reduzido'; } catch(e) { return false; } }
  function aviso(msg, tipo){
    if (cfg.toast) { try { cfg.toast(msg, tipo || 'ok'); return; } catch(e) {} }
    if (typeof global.showToast === 'function') { global.showToast(esc(msg), tipo === 'erro' ? 'error' : tipo === 'alerta' ? 'warning' : 'success'); return; }
    try { global.alert(msg); } catch(e) {}
  }
  function erroTxt(e){ var m = (e && (e.message || e.msg)) || 'tente de novo.'; return String(m).replace(/^erro do simulado em [a-z_]+: /, ''); }
  function recolher(el, ocultar, fim){
    if (!el) { if (fim) fim(); return; }
    if (global.sagaRecolher && !semMov()) global.sagaRecolher(el, ocultar, fim);
    else { el.hidden = !!ocultar; if (fim) fim(); }
  }
  function dataHora(d){ if (!d) return ''; var x = new Date(d); return x.toLocaleDateString('pt-BR') + ' ' + x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function situacao(s){ return SIT[s] || { rotulo: s || '?', cor: 'cinza' }; }

  /* ---------- estilo (só variáveis do tema) ---------- */
  function css(){
    if (document.getElementById('sd-css')) return;
    var s = document.createElement('style'); s.id = 'sd-css';
    s.textContent =
      '.sd-selo{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid var(--border-soft,var(--border));color:var(--muted);white-space:nowrap}' +
      '.sd-selo.ok{color:var(--success,#16a34a);border-color:color-mix(in srgb,var(--success,#16a34a) 50%,transparent)}' +
      '.sd-selo.amarelo{color:var(--warning,#d97706);border-color:color-mix(in srgb,var(--warning,#d97706) 50%,transparent)}' +
      '.sd-selo.vermelho{color:var(--danger,#e5484d);border-color:color-mix(in srgb,var(--danger,#e5484d) 55%,transparent)}' +
      '.sd-lista{display:flex;flex-direction:column;gap:8px}.sd-lista [hidden]{display:none!important}' +
      '.sd-vazio{font-size:11px;color:var(--muted);line-height:1.5}' +
      '.sd-it{border:1px solid var(--border-soft,var(--border));border-radius:12px;padding:9px 11px;display:flex;flex-direction:column;gap:5px;cursor:pointer;transition:border-color .25s ' + CURVA + '}' +
      '.sd-it:hover{border-color:color-mix(in srgb,var(--gold) 55%,transparent)}' +
      '.sd-it-cab{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}' +
      '.sd-it-tit{font-size:12px;font-weight:600;color:var(--text);overflow-wrap:anywhere}' +
      '.sd-it-sub{font-size:10px;color:var(--muted);line-height:1.45;overflow-wrap:anywhere}' +
      '.sd-it-erro{font-size:10.5px;line-height:1.45;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--danger,#e5484d) 11%,transparent);color:var(--danger,#e5484d)}' +
      '.sd-it-erro.amarelo{background:color-mix(in srgb,var(--warning,#d97706) 12%,transparent);color:var(--warning,#d97706)}' +
      '.sd-it-corpo{font-size:11px;line-height:1.55;color:var(--text);white-space:pre-wrap;padding:8px 9px;border-radius:9px;background:color-mix(in srgb,var(--text) 4%,transparent)}' +
      '.sd-aviso-desc{font-size:10.5px;line-height:1.45;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--warning,#d97706) 12%,transparent);color:var(--text)}' +
      '.sd-ov{position:fixed;inset:0;z-index:1750;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,14,.6);opacity:0;transition:opacity 260ms ' + CURVA + '}' +
      '.sd-ov.aberto{opacity:1}.sd-ov.sem-mov,.sd-ov.sem-mov .sd-modal{transition:none!important}' +
      '.sd-modal{background:var(--panel-solid,var(--panel));color:var(--text);border:1px solid var(--border);border-radius:16px;width:min(640px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.35);transform:translateY(14px) scale(.985);transition:transform 380ms ' + CURVA + '}' +
      '.sd-ov.aberto .sd-modal{transform:none}.sd-modal [hidden]{display:none!important}' +
      '.sd-mcab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--border-soft,var(--border))}' +
      '.sd-mcab h3{margin:0;font-size:17px;font-weight:600;color:var(--text)}.sd-mcab p{margin:4px 0 0;font-size:11px;color:var(--muted);line-height:1.45}' +
      '.sd-x{background:none;border:1px solid var(--border-soft,var(--border));color:var(--muted);font-size:14px;cursor:pointer;border-radius:9px;width:30px;height:30px;flex:0 0 auto}' +
      '.sd-corpo{padding:14px 18px;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:12px}' +
      '.sd-pe{display:flex;align-items:center;gap:8px;padding:12px 18px 16px;border-top:1px solid var(--border-soft,var(--border));flex-wrap:wrap}.sd-pe .esp{flex:1 1 auto}' +
      '.sd-modal .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border-radius:10px;font:inherit;font-size:12px;cursor:pointer}' +
      '.sd-modal .btn:disabled{opacity:.5;cursor:default}' +
      '.sd-campo{display:flex;flex-direction:column;gap:5px;min-width:0}' +
      '.sd-campo>label{font-size:9.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--gold)}' +
      '.sd-in{font:inherit;font-size:12px;color:var(--text);background:color-mix(in srgb,var(--text) 5%,transparent);border:1px solid var(--border-soft,var(--border));border-radius:9px;padding:9px 10px;width:100%;box-sizing:border-box;min-width:0;outline:0}' +
      '.sd-in:focus{border-color:var(--gold)}' +
      '.sd-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.sd-dica{font-size:10.5px;color:var(--muted);line-height:1.5}' +
      '.sd-previa{border:1px solid var(--border-soft,var(--border));border-radius:12px;overflow:hidden}' +
      '.sd-previa-cab{font-size:11px;padding:8px 11px;background:color-mix(in srgb,var(--gold) 8%,transparent);line-height:1.5}.sd-previa-cab b{font-weight:600}' +
      '.sd-previa-corpo{font-size:12px;line-height:1.6;padding:10px 12px;white-space:pre-wrap;max-height:260px;overflow:auto}' +
      '.sd-avisos{display:flex;flex-direction:column;gap:5px}.sd-avisos div{font-size:11px;line-height:1.45;padding:6px 9px;border-radius:8px;background:color-mix(in srgb,var(--warning,#d97706) 12%,transparent);color:var(--text)}' +
      '.sd-erro{font-size:11.5px;line-height:1.5;color:var(--danger,#e5484d)}' +
      '.sd-pulados{font-size:11px;line-height:1.5;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--warning,#d97706) 10%,transparent)}' +
      '.sd-pulados li{margin-left:16px}' +
      '@media (max-width:600px){.sd-ov{padding:8px;align-items:flex-end}.sd-g2{grid-template-columns:1fr}.sd-pe .btn{flex:1 1 auto}}';
    document.head.appendChild(s);
  }

  /* ---------- janela genérica com movimento próprio ---------- */
  function abrirJanela(titulo, sub, corpoHtml, peHtml){
    css();
    var ov = document.createElement('div');
    ov.className = 'sd-ov' + (semMov() ? ' sem-mov' : '');
    ov.setAttribute('data-saga-movimento-proprio', '');
    ov.innerHTML = '<div class="sd-modal" role="dialog" aria-modal="true"><div class="sd-mcab"><div><h3>' + esc(titulo) + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') +
      '</div><button class="sd-x" type="button" data-sd-fechar aria-label="Fechar">✕</button></div><div class="sd-corpo">' + corpoHtml + '</div><div class="sd-pe">' + peHtml + '</div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ ov.classList.add('aberto'); }); });
    function fechar(){
      document.removeEventListener('keydown', tecla);
      ov.classList.remove('aberto');
      setTimeout(function(){ ov.remove(); }, semMov() ? 0 : 280);
    }
    function tecla(e){ if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', tecla);
    ov.addEventListener('mousedown', function(e){ if (e.target === ov) fechar(); });
    ov.addEventListener('click', function(e){ if (e.target.closest('[data-sd-fechar]')) fechar(); });
    return { ov: ov, q: function(s){ return ov.querySelector(s); }, fechar: fechar };
  }

  /* ---------- "Enviar e-mail" (um ou vários clientes) ---------- */
  async function enviar(o){
    o = o || {};
    var itens = (o.itens || []).filter(function(x){ return x && x.pessoa_id; });
    if (!itens.length) { aviso('Escolha pelo menos um cliente.', 'alerta'); return; }
    var um = itens.length === 1;
    var op;
    try { var r = await sb().rpc('disparo_opcoes'); if (r.error) throw r.error; op = r.data || {}; }
    catch(e) { aviso('Não consegui abrir os disparos: ' + erroTxt(e), 'erro'); return; }
    var modelos = op.modelos || [], contas = op.contas || [];
    var turno = op.turno, c = op.config || {};
    var hh = function(t){ return String(t || '').slice(0, 5); };
    var quando = !c.ativo ? '<b>O robô está desligado</b> (Disparos de e-mail > Configurações): o e-mail fica na fila até ele ser ligado.'
      : turno ? 'Sai na próxima rodada (a cada 10 min), dentro do limite do remetente.'
      : 'Agora está fora do horário de envio (manhã ' + hh(c.manha_ini) + '–' + hh(c.manha_fim) + ', tarde ' + hh(c.tarde_ini) + '–' + hh(c.tarde_fim) + (c.so_dias_uteis ? ', dias úteis' : '') + '): sai no próximo turno.';
    var optsMod = '<option value="">Automático: o modelo da tese de cada processo</option>' + modelos.map(function(m){
      return '<option value="' + esc(m.id) + '">' + esc(m.nome) + (m.tese ? ' · ' + esc(m.tese) : ' · todas as teses') + '</option>'; }).join('');
    var optsConta = '<option value="">Automático: rodízio entre os remetentes disponíveis</option>' + contas.map(function(k){
      var est = k.situacao === 'erro_login' ? ' (senha recusada)' : k.situacao === 'erro' ? ' (com erro)' : (k.pausada_ate && new Date(k.pausada_ate) > new Date()) ? ' (pausado)' : '';
      return '<option value="' + esc(k.id) + '">' + esc(k.apelido) + ' · ' + esc(k.email) + est + '</option>'; }).join('');
    var procs = o.processos || [];
    var corpo =
      (modelos.length ? '' : '<div class="sd-erro"><b>Ainda não há modelo de e-mail.</b> O administrador cria em Disparos de e-mail > Modelos.</div>') +
      (contas.length ? '' : '<div class="sd-erro"><b>Nenhum e-mail de envio disponível para você.</b> Cadastre o seu em Disparos de e-mail > Remetentes (ou peça ao administrador).</div>') +
      (um ? '' : '<div class="sd-dica"><b>' + itens.length + ' clientes</b> escolhidos. Cada um recebe o modelo da tese do seu processo, preenchido com os dados dele. Quem não tiver e-mail, modelo ou já estiver na fila é pulado (a lista aparece no fim).</div>') +
      (um && procs.length > 1 ? '<div class="sd-campo"><label for="sdProc">Processo</label><select class="sd-in" id="sdProc">' + procs.map(function(p){
        return '<option value="' + esc(p.id) + '"' + (p.id === itens[0].processo_id ? ' selected' : '') + '>' + esc(p.rotulo) + '</option>'; }).join('') + '</select></div>' : '') +
      '<div class="sd-g2"><div class="sd-campo"><label for="sdModelo">Modelo</label><select class="sd-in" id="sdModelo">' + optsMod + '</select></div>' +
      '<div class="sd-campo"><label for="sdConta">Sai por (remetente)</label><select class="sd-in" id="sdConta">' + optsConta + '</select></div></div>' +
      (um ? '<div class="sd-campo"><label for="sdEmail">E-mail do cliente</label><input class="sd-in" id="sdEmail" type="email" autocomplete="off" placeholder="o e-mail cadastrado na ficha"><div class="sd-dica">Vem da ficha/Localização. Trocar aqui vale só para este envio.</div></div>' : '') +
      '<div class="sd-campo"><label for="sdQuando">Quando</label><select class="sd-in" id="sdQuando"><option value="">Na próxima rodada</option><option value="data">A partir de uma data e hora…</option></select>' +
      '<input class="sd-in" id="sdData" type="datetime-local" hidden><div class="sd-dica">' + quando + '</div></div>' +
      '<div id="sdPrevia"><div class="sd-dica">Montando a prévia…</div></div><div id="sdRes" hidden></div>';
    var j = abrirJanela(um ? 'Enviar e-mail' : 'Enviar e-mail para ' + itens.length + ' clientes',
      um ? esc(itens[0].nome || '') : 'O e-mail entra na fila e o sistema manda sozinho, de tempos em tempos.',
      corpo, '<span class="esp"></span><button class="btn" type="button" data-sd-fechar>Cancelar</button><button class="btn btn-ouro" type="button" id="sdOk"' + (modelos.length ? '' : ' disabled') + '>Pôr na fila</button>');
    var q = j.q;
    var procAtual = function(){ var s = q('#sdProc'); return s ? s.value : (itens[0].processo_id || null); };
    var tPrev = null, primeira = true;
    async function previa(){
      var alvo = q('#sdPrevia'); if (!alvo) return;
      var it = itens[0];
      try {
        var r = await sb().rpc('disparo_previa', { p_pessoa: it.pessoa_id, p_processo: um ? procAtual() : (it.processo_id || null),
          p_modelo: q('#sdModelo').value || null, p_conta: q('#sdConta').value || null, p_email: um ? (q('#sdEmail').value.trim() || null) : null });
        if (r.error) throw r.error;
        var p = r.data || {};
        if (p.erro) { alvo.innerHTML = '<div class="sd-erro">' + esc(p.erro) + '</div>'; return; }
        if (um && primeira && p.para_email && !q('#sdEmail').value) q('#sdEmail').value = p.para_email;
        primeira = false;
        alvo.innerHTML = (um ? '' : '<div class="sd-dica">Prévia do 1º cliente (' + esc(it.nome || '') + '):</div>') +
          '<div class="sd-previa"><div class="sd-previa-cab"><b>Para:</b> ' + esc(p.para_email || '— sem e-mail —') + '<br><b>Assunto:</b> ' + esc(p.assunto) +
          '<br><b>Modelo:</b> ' + esc(p.modelo) + '</div><div class="sd-previa-corpo">' + esc(p.corpo) + '</div></div>' +
          ((p.avisos || []).length ? '<div class="sd-avisos" style="margin-top:8px">' + p.avisos.map(function(a){ return '<div>' + esc(a) + '</div>'; }).join('') + '</div>' : '');
      } catch(e) { alvo.innerHTML = '<div class="sd-erro">Não consegui montar a prévia: ' + esc(erroTxt(e)) + '</div>'; }
    }
    function adiar(){ clearTimeout(tPrev); tPrev = setTimeout(previa, 350); }
    ['#sdModelo', '#sdConta', '#sdProc'].forEach(function(s){ var el = q(s); if (el) el.addEventListener('change', previa); });
    if (um) q('#sdEmail').addEventListener('input', adiar);
    q('#sdQuando').addEventListener('change', function(){ q('#sdData').hidden = this.value !== 'data'; });
    previa();
    q('#sdOk').addEventListener('click', async function(){
      var bt = this; var aPartir = null;
      if (q('#sdQuando').value === 'data') {
        var v = q('#sdData').value; if (!v) { aviso('Escolha a data e a hora.', 'alerta'); return; }
        aPartir = new Date(v).toISOString();
      }
      var lista = itens.map(function(it){ return { pessoa_id: it.pessoa_id, processo_id: um ? procAtual() : (it.processo_id || null), email: um ? (q('#sdEmail').value.trim() || null) : null }; });
      bt.disabled = true; bt.textContent = 'Pondo na fila…';
      try {
        var r = await sb().rpc('disparo_por_na_fila', { p_itens: lista, p_modelo: q('#sdModelo').value || null, p_conta: q('#sdConta').value || null, p_a_partir: aPartir, p_origem: 'tela' });
        if (r.error) throw r.error;
        var d = r.data || {}, pul = d.pulados || [];
        if (o.aoSalvar) try { o.aoSalvar(d); } catch(e) {}
        if (!pul.length) { aviso(d.adicionados === 1 ? 'E-mail na fila de disparo.' : d.adicionados + ' e-mails na fila de disparo.', 'ok'); j.fechar(); return; }
        var res = q('#sdRes');
        res.innerHTML = '<div class="sd-pulados"><b>' + (d.adicionados || 0) + ' na fila; ' + pul.length + ' ficaram de fora:</b><ul>' +
          pul.map(function(p){ return '<li>' + esc(p.nome) + ': ' + esc(p.motivo) + '</li>'; }).join('') + '</ul></div>';
        recolher(res, false);
        bt.textContent = 'Feito'; q('[data-sd-fechar].btn').textContent = 'Fechar';
        aviso((d.adicionados || 0) + ' na fila; ' + pul.length + ' ficaram de fora (veja o motivo).', d.adicionados ? 'alerta' : 'erro');
      } catch(e) {
        bt.disabled = false; bt.textContent = 'Pôr na fila';
        aviso('Não consegui pôr na fila: ' + erroTxt(e), 'erro');
      }
    });
  }

  /* ---------- histórico na ficha do cliente ---------- */
  var atual = null;
  function seloHtml(it){
    var s = situacao(it.situacao), cor = s.cor;
    if (it.situacao === 'na_fila' && it.proxima_tentativa_em) cor = 'amarelo';
    return '<span class="sd-selo ' + cor + '">' + esc(s.rotulo) + '</span>';
  }
  function itemHtml(it){
    var quando = it.situacao === 'enviado' || it.situacao === 'respondido' ? 'Enviado em ' + dataHora(it.enviado_em) + (it.remetente ? ' por ' + it.remetente : '')
      : it.situacao === 'na_fila' ? 'Na fila desde ' + dataHora(it.criado_em) + (it.a_partir && new Date(it.a_partir) > new Date() ? ' · sai a partir de ' + dataHora(it.a_partir) : '')
      : 'Pedido em ' + dataHora(it.criado_em);
    var erro = it.erro && (it.situacao === 'erro' || it.situacao === 'na_fila')
      ? '<div class="sd-it-erro' + (it.situacao === 'na_fila' ? ' amarelo' : '') + '">' + esc(it.erro) + '</div>' : '';
    return '<div class="sd-it" data-sd-it="' + esc(it.id) + '" tabindex="0" role="button" aria-expanded="false"><div class="sd-it-cab"><div class="sd-it-tit">' + esc(it.assunto || it.modelo || 'E-mail') + '</div>' + seloHtml(it) + '</div>' +
      '<div class="sd-it-sub">' + esc(quando) + ' · para ' + esc(it.para) + (it.criado_por ? ' · pôs na fila: ' + esc(it.criado_por) : '') + (it.respondido_em ? ' · respondeu em ' + esc(dataHora(it.respondido_em)) : '') + '</div>' + erro +
      '<div class="sd-it-corpo" hidden>' + esc(it.corpo || 'O texto é montado na hora do envio, com o modelo "' + (it.modelo || '') + '".') + '</div></div>';
  }
  async function blocoFicha(el, ctx){
    css();
    atual = { el: el, ctx: ctx };
    if (!el) return false;
    var r;
    try { r = await sb().rpc('disparos_da_pessoa', { p_pessoa: ctx.pessoaId }); if (r.error) throw r.error; }
    catch(e) {
      if (ctx.secao) ctx.secao.hidden = false;
      el.innerHTML = '<div class="sd-it-erro">Não consegui ler os e-mails deste cliente: ' + esc(erroTxt(e)) + '</div>'; return false;
    }
    var d = r.data || {};
    if (!d.pode_ver) { if (ctx.secao) ctx.secao.hidden = true; return false; }
    if (ctx.secao) ctx.secao.hidden = false;
    if (ctx.botao) { ctx.botao.hidden = !d.pode_enviar; ctx.botao.onclick = function(){
      var proc = ctx.processoAtivo ? ctx.processoAtivo() : null;
      enviar({ itens: [{ pessoa_id: ctx.pessoaId, processo_id: proc, nome: ctx.pessoaNome }], processos: ctx.processos || [], aoSalvar: function(){ blocoFicha(el, ctx); } });
    }; }
    var itens = d.itens || [];
    el.innerHTML = '<div class="sd-lista">' +
      (d.descadastrado ? '<div class="sd-aviso-desc">Este cliente pediu para não receber e-mails (' + esc(d.email) + ').</div>' : '') +
      (!d.email && !itens.length ? '<div class="sd-vazio">Sem e-mail cadastrado: cadastre na ficha ou na Localização para poder enviar.</div>' : '') +
      (itens.length ? itens.map(itemHtml).join('') : (d.email ? '<div class="sd-vazio">Nenhum e-mail enviado pelo SAGA ainda.</div>' : '')) + '</div>';
    if (!el.dataset.sdLigado) {
      el.dataset.sdLigado = '1';
      var alternar = function(card){
        var c = card.querySelector('.sd-it-corpo'); if (!c) return;
        var abrir = c.hidden; card.setAttribute('aria-expanded', abrir ? 'true' : 'false'); recolher(c, !abrir);
      };
      el.addEventListener('click', function(e){ var card = e.target.closest('[data-sd-it]'); if (card) alternar(card); });
      el.addEventListener('keydown', function(e){ if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-sd-it]')) { e.preventDefault(); alternar(e.target); } });
    }
    return true;
  }

  global.SagaDisparos = {
    configurar: function(o){ cfg.toast = (o && o.toast) || null; },
    enviar: enviar, blocoFicha: blocoFicha, situacao: situacao, css: css, abrirJanela: abrirJanela
  };
})(window);
