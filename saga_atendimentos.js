/* SAGA · Agenda de atendimentos (T141, 10/11/2026; bloco 149).
   Pedido do Dr. Victor: horários fixos de quem atende; ao marcar, cliente cadastrado obrigatório, quem atende,
   presencial ou telepresencial (WhatsApp exige o telefone do cliente; Google Meet exige o e-mail); atalhos para o
   WhatsApp e o Meet; o atendimento e a conversa dele aparecem na agenda e na ficha do cliente (a mesma conversa);
   respostas prontas num menu editável + texto livre.
   Usado pela Agenda (calendario_padrao_metalico.html) e pela ficha do cliente.
     SagaAtendimentos.configurar({toast:fn(msg,'ok'|'erro'|'alerta')})
     SagaAtendimentos.marcar({pessoaId, pessoaNome, processoId, responsavelId, aoSalvar(id)})  -> janela "Marcar atendimento"
     SagaAtendimentos.horarios({usuarioId, aoSalvar})                                          -> janela "Horários de atendimento"
     SagaAtendimentos.carregar(id) / daPessoa(pessoaId)                                        -> atendimentos_listar
     SagaAtendimentos.bloco(el, atendimento, {mostrarCliente, onMudou})                        -> forma, atalhos, situação e conversa
     SagaAtendimentos.listaFicha(el, {pessoaId, pessoaNome})                                    -> seção "Atendimentos" da ficha
   Tudo grava pelas funções atendimento_* do banco (bloco 149). Movimento: curva cubic-bezier(.22,.78,.25,1), respeita
   a chave "Efeitos de movimento" (localStorage saga-movimento = 'reduzido' troca na hora). */
(function(global){
  'use strict';
  var CURVA = 'cubic-bezier(.22,.78,.25,1)';
  var DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var ORDEM_DIAS = [1,2,3,4,5,6,0];
  var DURACOES = [15,20,30,40,45,50,60,90,120];
  var cfg = { toast: null };
  var cache = { eu: undefined, admin: false, respostas: null, atendentes: null, escritorio: null };

  function sb(){ return global._sb; }
  function esc(t){ var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function semMov(){ try { return localStorage.getItem('saga-movimento') === 'reduzido'; } catch(e) { return false; } }
  function aviso(msg, tipo){
    if (cfg.toast) { try { cfg.toast(msg, tipo || 'ok'); return; } catch(e) {} }
    if (typeof global.showToast === 'function') { global.showToast(msg, tipo === 'erro' ? 'error' : tipo === 'alerta' ? 'warning' : 'success'); return; }
    try { global.alert(msg); } catch(e) {}
  }
  function erroTxt(e){ var m = (e && (e.message || e.msg)) || 'tente de novo.'; return String(m).replace(/^erro do simulado em [a-z_]+: /, ''); }
  function dig(v){ return String(v == null ? '' : v).replace(/\D/g, ''); }
  function telLimpo(v){ var d = dig(v); if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2); return d; }
  function fmtTel(v){
    var d = telLimpo(v);
    if (d.length === 11) return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
    return String(v || '');
  }
  function telMascara(d){
    d = d.slice(0, 11); if (!d) return '';
    if (d.length <= 2) return '(' + d;
    var t = '(' + d.slice(0,2) + ') ', r = d.slice(2);
    if (d.length <= 6) return t + r;
    if (d.length <= 10) return t + r.slice(0,4) + '-' + r.slice(4);
    return t + r.slice(0,5) + '-' + r.slice(5);
  }
  function ligarMascaraTel(inp){ inp.addEventListener('input', function(){ inp.value = telMascara(telLimpo(inp.value)); }); }
  function emailOk(v){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim()); }
  function fmtCpf(v){ var d = dig(v); return d.length === 11 ? d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9) : (v || ''); }
  function dDia(d){ return new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }); }
  function dCurta(d){ return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
  function dHora(d){ return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function dQuando(d){ return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function isoDia(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function primeiro(n){ return String(n || '').trim().split(/\s+/)[0] || ''; }
  function recolher(el, ocultar){ if (!el) return; if (global.sagaRecolher) global.sagaRecolher(el, ocultar); else el.hidden = !!ocultar; }
  function confirmar(titulo, texto, botao){
    if (global.sagaConfirmar) return global.sagaConfirmar(titulo, texto, botao, false);
    return Promise.resolve(global.confirm(texto));
  }

  /* ---------- estilo (só variáveis do tema; botões com as classes da regra dos botões finos) ---------- */
  function css(){
    if (document.getElementById('sat-css')) return;
    var s = document.createElement('style'); s.id = 'sat-css';
    s.textContent =
      '.sat-ov{position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,10,18,.55);opacity:0;transition:opacity 260ms ' + CURVA + '}' +
      '.sat-ov.aberto{opacity:1}.sat-ov.sem-mov,.sat-ov.sem-mov .sat-modal{transition:none!important}' +
      '.sat-modal{background:var(--panel-solid,var(--panel,#1b2233));color:var(--text);border:1px solid var(--border);border-radius:16px;width:min(640px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.35);transform:translateY(14px) scale(.985);transition:transform 380ms ' + CURVA + '}' +
      '.sat-ov.aberto .sat-modal{transform:none}' +
      '.sat-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--border)}' +
      '.sat-cab h3{margin:0;font-size:17px;font-weight:600;color:var(--text)}' +
      '.sat-x{background:none;border:0;color:var(--muted,var(--text));font-size:17px;cursor:pointer;border-radius:8px;padding:4px 8px}' +
      '.sat-corpo{padding:14px 18px;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:14px}' +
      '.sat-pe{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px 16px;border-top:1px solid var(--border);flex-wrap:wrap}' +
      '.sat-modal [hidden],.sat-bloco [hidden],.sat-lista [hidden]{display:none!important}' +
      '.sat-campo{display:flex;flex-direction:column;gap:6px;min-width:0}' +
      '.sat-campo>label,.sat-rot{font-size:12px;font-weight:600;color:var(--muted,var(--text));letter-spacing:.02em}' +
      '.sat-in,.sat-campo select,.sat-campo textarea,.sat-resp select,.sat-resp textarea{font:inherit;font-size:13.5px;color:var(--text);background:var(--panel-2,transparent);border:1px solid var(--border);border-radius:10px;padding:9px 11px;width:100%;box-sizing:border-box;min-width:0}' +
      '.sat-campo textarea,.sat-resp textarea{min-height:62px;resize:vertical}' +
      '.sat-dica{font-size:12px;color:var(--muted,var(--text));line-height:1.45}.sat-dica a{color:var(--text);text-decoration:underline}' +
      '.sat-b{font:inherit;font-size:13px;border-radius:999px;padding:8px 14px;cursor:pointer;border:1px solid var(--border);display:inline-flex;align-items:center;gap:6px;text-decoration:none;line-height:1.2;color:var(--text);background:transparent}' +
      '.sat-b[disabled]{opacity:.5;cursor:not-allowed}.sat-b.peq{font-size:12px;padding:5px 11px}' +
      '.sat-seg{display:inline-flex;gap:4px;padding:3px;border:1px solid var(--border);border-radius:999px;flex-wrap:wrap;align-self:flex-start;max-width:100%}' +
      '.sat-seg button{font:inherit;font-size:13px;border:1px solid transparent;background:transparent;color:var(--text);border-radius:999px;padding:6px 14px;cursor:pointer}' +
      '.sat-busca{position:relative}' +
      '.sat-res{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:5;background:var(--panel-solid,var(--panel));border:1px solid var(--border);border-radius:12px;box-shadow:0 14px 34px rgba(0,0,0,.3);max-height:260px;overflow:auto}' +
      '.sat-res button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--text);padding:9px 12px;cursor:pointer;font:inherit;font-size:13px}' +
      '.sat-res button:hover,.sat-res button:focus-visible{background:var(--sb-sec-hover,rgba(127,127,127,.12));outline:none}' +
      '.sat-res small{display:block;color:var(--muted,var(--text));font-size:11.5px}.sat-res .sat-vazio{padding:10px 12px;font-size:12.5px;color:var(--muted,var(--text))}' +
      '.sat-cli{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--border);border-radius:12px;padding:9px 12px}' +
      '.sat-cli b{font-weight:600}.sat-cli small{display:block;color:var(--muted,var(--text));font-size:11.5px}' +
      '.sat-semana{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}' +
      '.sat-dia{font-size:12px;font-weight:600;margin:8px 0 5px;text-transform:capitalize;color:var(--text)}' +
      '.sat-slots{display:flex;flex-wrap:wrap;gap:6px}' +
      '.sat-slot{font:inherit;font-size:12.5px;border:1px solid var(--border);background:transparent;color:var(--text);border-radius:999px;padding:5px 11px;cursor:pointer;font-variant-numeric:tabular-nums;transition:background-color .25s ' + CURVA + ',border-color .25s ' + CURVA + '}' +
      '.sat-slot.livre:hover{border-color:var(--gold)}' +
      '.sat-slot.ocupado,.sat-slot.passado{opacity:.42;cursor:not-allowed;text-decoration:line-through}' +
      '.sat-slot.active{background:var(--sb-escolha,rgba(127,127,127,.18));border-color:var(--sb-escolha-borda,var(--gold));box-shadow:inset 0 0 0 1px var(--sb-escolha-borda,var(--gold));font-weight:600}' +
      '.sat-linha2{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sat-linha2 .sat-in{width:auto;flex:1 1 180px}' +
      '.sat-sug{display:flex;flex-wrap:wrap;gap:6px}' +
      '.sat-chk{display:inline-flex;gap:7px;align-items:center;font-size:12.5px;color:var(--text);cursor:pointer}' +
      '.sat-bloco{display:flex;flex-direction:column;gap:10px}' +
      '.sat-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}' +
      '.sat-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;border:1px solid var(--border);border-radius:999px;padding:3px 10px;color:var(--text);max-width:100%;overflow-wrap:anywhere}' +
      '.sat-chip i{width:8px;height:8px;border-radius:50%;background:var(--c,#8a94a8);display:inline-block;flex:0 0 auto}' +
      '.sat-linha{font-size:13px;color:var(--muted,var(--text));overflow-wrap:anywhere}.sat-linha b{color:var(--text);font-weight:600}.sat-linha a{color:var(--text)}' +
      '.sat-obs{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;border-left:2px solid var(--border);padding-left:10px;color:var(--text)}' +
      '.sat-atalhos{display:flex;flex-wrap:wrap;gap:6px}' +
      '.sat-conv{display:flex;flex-direction:column;gap:8px}' +
      '.sat-msg{border:1px solid var(--border);border-radius:12px;padding:9px 11px}' +
      '.sat-msg-cab{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--muted,var(--text))}.sat-msg-cab b{color:var(--text);font-weight:600}' +
      '.sat-msg-txt{font-size:13.5px;margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text)}' +
      '.sat-msg-acoes{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}' +
      '.sat-resp{display:flex;flex-direction:column;gap:8px;border-top:1px dashed var(--border);padding-top:10px}' +
      '.sat-resp-linha{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:space-between}' +
      '.sat-vazio{font-size:12.5px;color:var(--muted,var(--text))}' +
      '.sat-lista{display:flex;flex-direction:column;gap:8px}' +
      '.sat-item{border:1px solid var(--border);border-radius:14px;padding:10px 12px}' +
      '.sat-item-cab{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;background:none;border:0;color:inherit;font:inherit;width:100%;text-align:left;padding:0}' +
      '.sat-item-tit{display:block;font-size:13.5px;font-weight:600;color:var(--text);text-transform:capitalize}' +
      '.sat-item-sub{display:block;font-size:12px;color:var(--muted,var(--text))}' +
      '.sat-item-corpo{margin-top:10px}' +
      '.sat-grade-dia{display:grid;grid-template-columns:86px 1fr;gap:8px;align-items:start;padding:8px 0;border-bottom:1px solid var(--border)}' +
      '.sat-grade-dia b{font-size:13px;font-weight:600;padding-top:6px}' +
      '.sat-faixa{display:inline-flex;align-items:center;gap:6px;margin:0 10px 6px 0;font-size:12.5px;color:var(--muted,var(--text))}' +
      '.sat-faixa input{width:auto;padding:6px 8px}' +
      '.sat-org{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border)}.sat-org input[type=text]{flex:1 1 auto}' +
      '.sat-org input[type=color]{width:34px;height:30px;padding:0;border:1px solid var(--border);border-radius:8px;background:none}' +
      '@media (max-width:600px){.sat-ov{padding:8px;align-items:flex-end}.sat-modal{max-height:calc(100vh - 16px)}.sat-grade-dia{grid-template-columns:1fr}.sat-pe .sat-b{flex:1 1 auto;justify-content:center}}';
    document.head.appendChild(s);
  }

  /* ---------- janela ---------- */
  var pilha = [];
  function janela(titulo, corpo, pe){
    css();
    var ov = document.createElement('div'); ov.className = 'sat-ov' + (semMov() ? ' sem-mov' : '');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', titulo);
    ov.innerHTML = '<div class="sat-modal"><div class="sat-cab"><h3>' + esc(titulo) + '</h3><button type="button" class="sat-x" aria-label="Fechar">✕</button></div>' +
      '<div class="sat-corpo">' + corpo + '</div>' + (pe ? '<div class="sat-pe">' + pe + '</div>' : '') + '</div>';
    document.body.appendChild(ov);
    var tecla = function(e){ if (e.key !== 'Escape' || pilha[pilha.length - 1] !== ov) return; e.stopPropagation(); fechar(); };
    function fechar(){
      if (ov._fechando) return; ov._fechando = true; document.removeEventListener('keydown', tecla, true);
      var ix = pilha.indexOf(ov); if (ix >= 0) pilha.splice(ix, 1);
      if (semMov()) { ov.remove(); return; }
      ov.classList.remove('aberto'); setTimeout(function(){ ov.remove(); }, 380);
    }
    document.addEventListener('keydown', tecla, true); pilha.push(ov);
    ov.querySelector('.sat-x').addEventListener('click', fechar);
    ov.addEventListener('mousedown', function(e){ ov._fora = e.target === ov; });
    ov.addEventListener('click', function(e){ if (e.target === ov && ov._fora) fechar(); ov._fora = false; });
    ov.addEventListener('wheel', function(e){ if (!e.target.closest('.sat-corpo')) e.preventDefault(); }, { passive: false });
    if (semMov()) ov.classList.add('aberto');
    else requestAnimationFrame(function(){ requestAnimationFrame(function(){ ov.classList.add('aberto'); }); });
    ov.fechar = fechar;
    ov.q = function(sel){ return ov.querySelector('[data-s="' + sel + '"]'); };
    return ov;
  }
  function ativar(grupo, el){ Array.prototype.forEach.call(grupo.querySelectorAll('button'), function(b){ b.classList.toggle('active', b === el); b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); }); }

  /* ---------- dados ---------- */
  async function quemSou(){
    if (cache.eu !== undefined) return cache.eu;
    try { var r = await sb().rpc('meu_perfil_id'); cache.eu = r.data || null; } catch(e) { cache.eu = null; }
    try { var a = await sb().rpc('eh_admin_sistema'); cache.admin = a.data === true; } catch(e) { cache.admin = false; }
    return cache.eu;
  }
  async function respostas(forcar){
    if (cache.respostas && !forcar) return cache.respostas;
    var r = await sb().from('etiquetas_catalogo').select('id,nome,cor,ordem,ativo,acao').eq('categoria', 'atendimento_resposta').order('ordem');
    cache.respostas = (r.data || []).slice().sort(function(a, b){ return (a.ordem || 0) - (b.ordem || 0); });
    return cache.respostas;
  }
  async function atendentes(forcar){
    if (cache.atendentes && !forcar) return cache.atendentes;
    var r = await sb().rpc('atendimento_atendentes');
    cache.atendentes = Array.isArray(r.data) ? r.data : [];
    return cache.atendentes;
  }
  async function escritorio(){
    if (cache.escritorio) return cache.escritorio;
    try { var r = await sb().rpc('escritorio_publico'); cache.escritorio = (r.data && r.data.nome) || 'o escritório'; } catch(e) { cache.escritorio = 'o escritório'; }
    return cache.escritorio;
  }
  async function carregar(id){
    var r = await sb().rpc('atendimentos_listar', { p_pessoa: null, p_id: id });
    if (r.error) throw r.error;
    return (r.data || [])[0] || null;
  }
  async function daPessoa(pessoaId){
    var r = await sb().rpc('atendimentos_listar', { p_pessoa: pessoaId, p_id: null });
    if (r.error) throw r.error;
    return r.data || [];
  }

  /* ---------- textos de um atendimento ---------- */
  function forma(at){
    if (at.modalidade === 'presencial') return 'Presencial' + (at.local ? ' · ' + at.local : '');
    if (at.canal === 'whatsapp') return 'WhatsApp · ' + fmtTel(at.telefone);
    if (at.canal === 'meet') return 'Google Meet · ' + (at.email || '');
    return 'Atendimento';
  }
  function situacao(at){
    if (at.concluido) return { txt: at.resposta || 'Concluído', cor: at.resposta_cor || '#22a06b' };
    if (new Date(at.fim || at.inicio).getTime() < Date.now()) return { txt: at.resposta || 'Aguardando o resultado', cor: at.resposta_cor || '#e0a93b' };
    return { txt: 'Marcado', cor: '#3b82f6' };
  }
  function utc(d){ return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function linkAgenda(at, nomeEsc){
    var fim = at.fim || new Date(new Date(at.inicio).getTime() + 1800000).toISOString();
    var ehLink = /^https:\/\//i.test(at.local || '');
    var p = new URLSearchParams();
    p.set('text', 'Atendimento – ' + nomeEsc);
    p.set('dates', utc(at.inicio) + '/' + utc(fim));
    p.set('details', 'Atendimento por vídeo (Google Meet) com ' + (at.responsavel || 'o escritório') + '.' + (ehLink ? '\nLink da reunião: ' + at.local : ''));
    if (at.email) p.set('add', at.email);
    if (ehLink) p.set('location', at.local); else p.set('vcon', 'meet');
    return 'https://calendar.google.com/calendar/r/eventedit?' + p.toString();
  }

  /* ---------- bloco do atendimento (agenda e ficha) ---------- */
  async function bloco(el, at, opts){
    opts = opts || {}; css(); await quemSou();
    var rs = await respostas();
    var nomeEsc = await escritorio();
    var sit = situacao(at);
    var ehLink = /^https:\/\//i.test(at.local || '');
    var atalhos = [];
    if (at.canal === 'whatsapp' && at.telefone) atalhos.push('<a class="sat-b btn-sm peq" href="https://wa.me/55' + esc(telLimpo(at.telefone)) + '" target="_blank" rel="noopener" title="Abre a conversa no WhatsApp (o computador oferece abrir no WhatsApp Business)">Abrir no WhatsApp</a>');
    if (at.canal === 'meet') {
      if (ehLink) atalhos.push('<a class="sat-b btn-sm peq" href="' + esc(at.local) + '" target="_blank" rel="noopener">Entrar no Meet</a>');
      atalhos.push('<a class="sat-b btn-sm peq" href="' + esc(linkAgenda(at, nomeEsc)) + '" target="_blank" rel="noopener" title="Abre o Google Agenda com o e-mail do cliente como convidado' + (ehLink ? '' : ' e a sala do Meet') + '">Convidar pelo Google Agenda</a>');
      if (at.email) atalhos.push('<button type="button" class="sat-b btn-sm peq" data-a="copiarEmail">Copiar o e-mail</button>');
    }
    if (opts.mostrarCliente !== false && at.pessoa_id) atalhos.push('<a class="sat-b btn-sm peq" href="ficha_cliente_padrao_metalico_FINAL.html?pessoa_id=' + encodeURIComponent(at.pessoa_id) + '">Abrir a ficha do cliente</a>');
    var conv = (at.comentarios || []).map(function(k){
      return '<div class="sat-msg" data-k="' + esc(k.id) + '"><div class="sat-msg-cab"><b>' + esc(primeiro(k.autor) || 'Colega') + '</b><span>' + esc(dQuando(k.criado_em)) + (k.editado_em ? ' · editado' : '') + '</span>' +
        (k.resposta ? '<span class="sat-chip"><i style="--c:' + esc(k.resposta_cor || '#8a94a8') + '"></i>' + esc(k.resposta) + '</span>' : '') + '</div>' +
        (k.texto ? '<div class="sat-msg-txt">' + esc(k.texto) + '</div>' : '') +
        ((k.pode_editar || k.pode_remover) ? '<div class="sat-msg-acoes">' + (k.pode_editar ? '<button type="button" class="sat-b btn-sm peq" data-a="editar">Editar</button>' : '') +
          (k.pode_remover ? '<button type="button" class="sat-b btn-sm peq" data-a="remover" data-remover title="Remover (só desativa)">Remover</button>' : '') + '</div>' : '') + '</div>';
    }).join('');
    var opcoes = '<option value="">Resposta pronta (opcional)</option>' + rs.filter(function(r){ return r.ativo !== false; }).map(function(r){ return '<option value="' + esc(r.id) + '">' + esc(r.nome) + '</option>'; }).join('') +
      (cache.admin ? '<option value="__nova">+ Nova resposta…</option><option value="__org">Organizar respostas…</option>' : '');
    el.innerHTML = '<div class="sat-bloco">' +
      '<div class="sat-chips"><span class="sat-chip"><i style="--c:' + esc(sit.cor) + '"></i>' + esc(sit.txt) + '</span><span class="sat-chip">' + esc(forma(at)) + '</span></div>' +
      (opts.mostrarCliente !== false ? '<div class="sat-linha">Cliente: <b>' + esc(at.cliente || '—') + '</b>' + (at.processo_numero ? ' · processo ' + esc(at.processo_numero) : '') + '</div>' : (at.processo_numero ? '<div class="sat-linha">Processo ' + esc(at.processo_numero) + '</div>' : '')) +
      '<div class="sat-linha"><span style="text-transform:capitalize">' + esc(dDia(at.inicio)) + '</span>, ' + esc(dHora(at.inicio)) + (at.fim ? ' às ' + esc(dHora(at.fim)) : '') + ' · atende <b>' + esc(at.responsavel || '—') + '</b>' +
        (at.criado_por ? ' · marcado por ' + esc(primeiro(at.criado_por)) : '') + '</div>' +
      (at.observacao ? '<div class="sat-obs">' + esc(at.observacao) + '</div>' : '') +
      (atalhos.length ? '<div class="sat-atalhos">' + atalhos.join('') + '</div>' : '') +
      '<div class="sat-rot">Conversa do atendimento</div>' +
      '<div class="sat-conv">' + (conv || '<div class="sat-vazio">Ainda sem comentários. O que for escrito aqui aparece também na ficha do cliente e na agenda.</div>') + '</div>' +
      (at.pode_comentar ? '<div class="sat-resp"><select data-s="resp" aria-label="Resposta pronta">' + opcoes + '</select>' +
        '<textarea data-s="txt" maxlength="4000" placeholder="Escreva aqui o que aconteceu (opcional se escolher uma resposta pronta)"></textarea>' +
        '<div class="sat-resp-linha">' + (at.pode_editar && !at.concluido ? '<label class="sat-chk"><input type="checkbox" data-s="concluir"> Concluir o atendimento (risca na agenda)</label>' : '<span></span>') +
        '<button type="button" class="sat-b btn-salvar-modal" data-a="comentar">Comentar</button></div></div>' : '') +
      (at.concluido && at.pode_editar ? '<div><button type="button" class="sat-b btn-sm peq" data-a="reabrir">Reabrir o atendimento</button></div>' : '') +
      '<div data-s="remarcar" hidden><button type="button" class="sat-b btn-salvar-modal" data-a="remarcar">Marcar novo horário com o cliente</button></div>' +
      '</div>';
    var q = function(s){ return el.querySelector('[data-s="' + s + '"]'); };
    async function recarregar(extra){
      try { var novo = await carregar(at.id); if (novo) { await bloco(el, novo, opts); if (extra) extra(); } } catch(e) {}
      if (opts.onMudou) try { opts.onMudou(); } catch(e) {}
    }
    var sel = q('resp');
    if (sel) sel.addEventListener('change', async function(){
      if (sel.value === '__nova') { sel.value = ''; var nova = await novaResposta(); if (nova) { await bloco(el, at, opts); var s2 = el.querySelector('[data-s="resp"]'); if (s2) { s2.value = nova; s2.dispatchEvent(new Event('change')); } } return; }
      if (sel.value === '__org') { sel.value = ''; organizarRespostas(function(){ bloco(el, at, opts); }); return; }
      var c = q('concluir'); if (c && sel.value) c.checked = true;
    });
    if (el._satClique) el.removeEventListener('click', el._satClique);
    el._satClique = async function(e){
      var b = e.target.closest('[data-a]'); if (!b || !el.contains(b)) return;
      if (b.closest('.sat-bloco') && b.closest('.sat-item-corpo') && b.closest('.sat-item-corpo') !== el && el.contains(b.closest('.sat-item-corpo'))) return;
      var a = b.dataset.a;
      if (a === 'copiarEmail') { try { await navigator.clipboard.writeText(at.email); aviso('E-mail copiado.', 'ok'); } catch(err) { aviso(at.email, 'ok'); } return; }
      if (a === 'comentar') {
        var rid = sel ? sel.value : '', txt = (q('txt').value || '').trim(), conc = !!(q('concluir') && q('concluir').checked);
        if (!rid && !txt) { aviso('Escolha uma resposta pronta ou escreva o comentário.', 'alerta'); return; }
        b.disabled = true;
        var r = await sb().rpc('atendimento_comentar', { p_compromisso: at.id, p_resposta: rid || null, p_texto: txt || null, p_concluir: conc });
        b.disabled = false;
        if (r.error) { aviso('Não foi possível comentar: ' + erroTxt(r.error), 'erro'); return; }
        var resp = rs.filter(function(x){ return x.id === rid; })[0];
        aviso(conc ? 'Comentário gravado e atendimento concluído.' : 'Comentário gravado.', 'ok');
        await recarregar(function(){ if (resp && resp.acao === 'remarcar') { var w = el.querySelector('[data-s="remarcar"]'); if (w) recolher(w, false); } });
        return;
      }
      if (a === 'reabrir') {
        b.disabled = true;
        var r2 = await sb().rpc('agenda_concluir', { p_id: at.id, p_concluido: false, p_comentario: null });
        b.disabled = false;
        if (r2.error) { aviso('Não foi possível reabrir: ' + erroTxt(r2.error), 'erro'); return; }
        aviso('Atendimento reaberto.', 'ok'); await recarregar(); return;
      }
      if (a === 'remarcar') { marcar({ pessoaId: at.pessoa_id, pessoaNome: at.cliente, processoId: at.processo_id, responsavelId: at.responsavel_id, aoSalvar: function(){ if (opts.onMudou) opts.onMudou(); } }); return; }
      var msg = b.closest('[data-k]'); if (!msg) return;
      var k = (at.comentarios || []).filter(function(x){ return x.id === msg.dataset.k; })[0]; if (!k) return;
      if (a === 'editar') {
        var area = document.createElement('div'); area.className = 'sat-resp';
        area.innerHTML = '<textarea maxlength="4000"></textarea><div class="sat-resp-linha"><span></span><span style="display:flex;gap:6px"><button type="button" class="sat-b btn-sm peq" data-e="cancelar">Cancelar</button><button type="button" class="sat-b btn-salvar-modal peq" data-e="salvar">Salvar</button></span></div>';
        area.querySelector('textarea').value = k.texto || '';
        var acoes = msg.querySelector('.sat-msg-acoes'); if (acoes) acoes.hidden = true;
        msg.appendChild(area); area.querySelector('textarea').focus();
        area.addEventListener('click', async function(ev){
          var bb = ev.target.closest('[data-e]'); if (!bb) return; ev.stopPropagation();
          if (bb.dataset.e === 'cancelar') { area.remove(); if (acoes) acoes.hidden = false; return; }
          bb.disabled = true;
          var r3 = await sb().rpc('atendimento_comentario_editar', { p_id: k.id, p_texto: area.querySelector('textarea').value });
          bb.disabled = false;
          if (r3.error) { aviso('Não foi possível salvar: ' + erroTxt(r3.error), 'erro'); return; }
          aviso('Comentário editado (fica no registro de alterações).', 'ok'); await recarregar();
        });
        return;
      }
      if (a === 'remover') {
        if (!(await confirmar('Remover comentário', 'O comentário sai da conversa (só é desativado; o histórico fica no registro).', 'Remover'))) return;
        var r4 = await sb().rpc('atendimento_comentario_remover', { p_id: k.id });
        if (r4.error) { aviso('Não foi possível remover: ' + erroTxt(r4.error), 'erro'); return; }
        aviso('Comentário removido.', 'ok'); await recarregar();
      }
    };
    el.addEventListener('click', el._satClique);
  }

  /* ---------- respostas prontas: criar e organizar (só o administrador geral) ---------- */
  async function novaResposta(){
    var nome = (global.prompt('Nome da nova resposta pronta:') || '').trim(); if (!nome) return null;
    var rs = await respostas();
    if (rs.some(function(r){ return r.ativo !== false && r.nome.toLowerCase() === nome.toLowerCase(); })) { aviso('Já existe uma resposta com esse nome.', 'alerta'); return null; }
    var r = await sb().rpc('catalogo_salvar', { p_categoria: 'atendimento_resposta', p_id: null, p_nome: nome.slice(0, 60), p_cor: '#8a94a8', p_ativo: true, p_conta_protocolada: null });
    if (r.error) { aviso('Não foi possível criar: ' + erroTxt(r.error), 'erro'); return null; }
    await respostas(true); aviso('Resposta pronta criada.', 'ok');
    return r.data || null;
  }
  async function organizarRespostas(depois){
    var ov = janela('Respostas prontas do atendimento', '<div class="sat-dica">Renomeie, troque a cor, mude a ordem ou tire do menu (só desativa: os comentários que já usam continuam mostrando o nome).</div><div data-s="lista"></div><div><button type="button" class="sat-b btn-sm peq" data-a="nova">+ Nova resposta</button></div>',
      '<button type="button" class="sat-b btn-salvar-modal" data-a="fechar">Pronto</button>');
    async function desenhar(){
      var rs = (await respostas(true)).filter(function(r){ return r.ativo !== false; });
      ov.q('lista').innerHTML = rs.length ? rs.map(function(r, i){
        return '<div class="sat-org" data-id="' + esc(r.id) + '"><input type="color" data-c="cor" value="' + esc(/^#[0-9a-f]{6}$/i.test(r.cor || '') ? r.cor : '#8a94a8') + '" aria-label="Cor"><input type="text" class="sat-in" data-c="nome" maxlength="60" value="' + esc(r.nome) + '" aria-label="Nome">' +
          '<button type="button" class="sat-b btn-sm peq" data-c="sobe" title="Subir"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" class="sat-b btn-sm peq" data-c="desce" title="Descer"' + (i === rs.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" class="sat-b btn-sm peq" data-c="tira" data-remover title="Tirar do menu (só desativa)">✕</button></div>';
      }).join('') : '<div class="sat-vazio">Nenhuma resposta ativa.</div>';
    }
    async function salvar(id, campos){
      var r0 = (cache.respostas || []).filter(function(x){ return x.id === id; })[0]; if (!r0) return;
      var r = await sb().rpc('catalogo_salvar', { p_categoria: 'atendimento_resposta', p_id: id, p_nome: campos.nome || r0.nome, p_cor: campos.cor || r0.cor || '#8a94a8', p_ativo: campos.ativo === false ? false : true, p_conta_protocolada: null });
      if (r.error) aviso('Não foi possível salvar: ' + erroTxt(r.error), 'erro');
      await desenhar();
    }
    ov.addEventListener('change', function(e){
      var l = e.target.closest('[data-id]'); if (!l) return;
      if (e.target.dataset.c === 'nome') { var n = e.target.value.trim(); if (!n) { aviso('Escreva o nome.', 'alerta'); desenhar(); return; } salvar(l.dataset.id, { nome: n.slice(0, 60) }); }
      if (e.target.dataset.c === 'cor') salvar(l.dataset.id, { cor: e.target.value });
    });
    ov.addEventListener('click', async function(e){
      var a = e.target.closest('[data-a]');
      if (a && a.dataset.a === 'fechar') { ov.fechar(); if (depois) depois(); return; }
      if (a && a.dataset.a === 'nova') { if (await novaResposta()) desenhar(); return; }
      var b = e.target.closest('button[data-c]'); if (!b) return;
      var l = b.closest('[data-id]'), rs = (cache.respostas || []).filter(function(r){ return r.ativo !== false; });
      var i = rs.findIndex(function(r){ return r.id === l.dataset.id; }); if (i < 0) return;
      if (b.dataset.c === 'tira') { if (!(await confirmar('Tirar do menu', 'Tirar "' + rs[i].nome + '" das respostas prontas?', 'Tirar'))) return; salvar(rs[i].id, { ativo: false }); return; }
      var j = i + (b.dataset.c === 'sobe' ? -1 : 1); if (j < 0 || j >= rs.length) return;
      var oa = rs[i].ordem || i + 1, oc = rs[j].ordem || j + 1; if (oa === oc) { oa = i + 1; oc = j + 1; }
      var r1 = await sb().from('etiquetas_catalogo').update({ ordem: oc }).eq('id', rs[i].id).select('id');
      var r2 = await sb().from('etiquetas_catalogo').update({ ordem: oa }).eq('id', rs[j].id).select('id');
      if (r1.error || r2.error) aviso('Não foi possível mudar a ordem.', 'erro');
      desenhar();
    });
    desenhar();
  }

  /* ---------- seção "Atendimentos" da ficha do cliente ---------- */
  async function listaFicha(el, opts){
    opts = opts || {}; css();
    el.innerHTML = '<div class="sat-vazio">Carregando os atendimentos…</div>';
    var l;
    try { l = await daPessoa(opts.pessoaId); } catch(e) { el.innerHTML = '<div class="sat-vazio">Não foi possível carregar os atendimentos.</div>'; return; }
    var agora = Date.now();
    var prox = l.filter(function(a){ return !a.concluido && new Date(a.fim || a.inicio).getTime() >= agora; }).sort(function(a, b){ return new Date(a.inicio) - new Date(b.inicio); });
    var resto = l.filter(function(a){ return prox.indexOf(a) < 0; }).sort(function(a, b){ return new Date(b.inicio) - new Date(a.inicio); });
    var ord = prox.concat(resto);
    if (!ord.length) { el.innerHTML = '<div class="sat-vazio">Nenhum atendimento marcado com este cliente. Use "+ Marcar atendimento".</div>'; return; }
    el._satOpts = opts;
    var LIM = 5, todos = !!el._todos;
    el.innerHTML = '<div class="sat-lista">' + ord.map(function(a, i){
      var s = situacao(a);
      return '<div class="sat-item" data-id="' + esc(a.id) + '"' + (!todos && i >= LIM ? ' hidden' : '') + '><button type="button" class="sat-item-cab" aria-expanded="' + (i === 0 ? 'true' : 'false') + '">' +
        '<span><span class="sat-item-tit">' + esc(dDia(a.inicio)) + ', ' + esc(dHora(a.inicio)) + '</span><span class="sat-item-sub">' + esc(forma(a)) + ' · atende ' + esc(primeiro(a.responsavel)) + ((a.comentarios || []).length ? ' · ' + a.comentarios.length + ' comentário' + (a.comentarios.length > 1 ? 's' : '') : '') + '</span></span>' +
        '<span class="sat-chip"><i style="--c:' + esc(s.cor) + '"></i>' + esc(s.txt) + '</span></button><div class="sat-item-corpo"' + (i === 0 ? '' : ' hidden') + '></div></div>';
    }).join('') + (!todos && ord.length > LIM ? '<button type="button" class="sat-b btn-sm peq" data-a="todos">Ver todos os ' + ord.length + ' atendimentos</button>' : '') + '</div>';
    var primeiroCorpo = el.querySelector('.sat-item-corpo');
    if (primeiroCorpo) bloco(primeiroCorpo, ord[0], { mostrarCliente: false, onMudou: function(){ listaFicha(el, opts); } });
    if (el._ligado) return; el._ligado = true;
    el.addEventListener('click', function(e){
      var t = e.target.closest('[data-a="todos"]');
      if (t) { el._todos = true; Array.prototype.forEach.call(el.querySelectorAll('.sat-item[hidden]'), function(x){ recolher(x, false); }); t.remove(); return; }
      var cab = e.target.closest('.sat-item-cab'); if (!cab || !el.contains(cab)) return;
      var item = cab.closest('.sat-item'), corpo = item.querySelector('.sat-item-corpo');
      var abrir = corpo.hidden;
      cab.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      if (abrir && !corpo.innerHTML) {
        corpo.innerHTML = '<div class="sat-vazio">Carregando…</div>';
        carregar(item.dataset.id).then(function(at){ if (at) bloco(corpo, at, { mostrarCliente: false, onMudou: function(){ listaFicha(el, el._satOpts); } }).then(function(){ recolher(corpo, false); }); });
        corpo.hidden = false; return;
      }
      recolher(corpo, !abrir);
    });
  }

  /* ---------- janela "Marcar atendimento" ---------- */
  async function marcar(opts){
    opts = opts || {};
    var eu = await quemSou();
    var st = { pessoa: null, resp: null, semana: 0, slot: null, mod: null, canal: null, contatos: { telefones: [], emails: [] }, lista: [] };
    var durs = DURACOES.map(function(m){ return '<option value="' + m + '"' + (m === 30 ? ' selected' : '') + '>' + m + ' min</option>'; }).join('');
    var ov = janela('Marcar atendimento',
      '<div class="sat-campo"><span class="sat-rot">Cliente *</span>' +
        '<div class="sat-cli" data-s="cliSel" hidden><span><b data-s="cliNome"></b><small data-s="cliCpf"></small></span><button type="button" class="sat-b btn-sm peq" data-a="trocarCli">Trocar</button></div>' +
        '<div class="sat-busca" data-s="cliBusca"><input class="sat-in" data-s="cliTermo" placeholder="Nome, CPF, telefone ou e-mail do cliente" autocomplete="off" aria-label="Procurar o cliente"><div class="sat-res" data-s="cliRes" hidden></div></div>' +
        '<div class="sat-dica" data-s="cliDica">O cliente precisa estar cadastrado no SAGA. Não achou? <a href="lista_processos_padrao_metalico.html?fase=captacao&amp;novo=1" target="_blank" rel="noopener">Cadastre antes na Captação (abre em outra aba)</a> e procure de novo aqui.</div></div>' +
      '<div class="sat-campo" data-s="procCampo" hidden><label>Processo do cliente (opcional)</label><select data-s="proc"></select></div>' +
      '<div class="sat-campo"><label>Quem vai atender *</label><select data-s="resp" aria-label="Quem vai atender"></select><div class="sat-dica" data-s="respDica" hidden></div></div>' +
      '<div class="sat-campo"><span class="sat-rot">Dia e horário *</span>' +
        '<div class="sat-semana"><button type="button" class="sat-b btn-sm peq" data-a="semAnt">‹ Semana anterior</button><span class="sat-dica" data-s="semTxt"></span><button type="button" class="sat-b btn-sm peq" data-a="semProx">Próxima semana ›</button></div>' +
        '<div data-s="slots"></div>' +
        '<div data-s="outroWrap" hidden><label class="sat-chk"><input type="checkbox" data-s="outroChk"> Outro horário (fora dos horários de atendimento)</label>' +
          '<div class="sat-linha2" data-s="outroCampos" hidden style="margin-top:6px"><input type="datetime-local" class="sat-in" data-s="outroIni" aria-label="Dia e hora"><select class="sat-in" data-s="outroDur" aria-label="Duração">' + durs + '</select></div></div></div>' +
      '<div class="sat-campo"><span class="sat-rot">Como vai ser *</span>' +
        '<div class="seg sat-seg" data-s="segMod" role="group" aria-label="Presencial ou telepresencial"><button type="button" data-mod="presencial">Presencial</button><button type="button" data-mod="telepresencial">Telepresencial (vídeo)</button></div>' +
        '<div class="sat-campo" data-s="presWrap" hidden><label>Local</label><input class="sat-in" data-s="local" maxlength="300"></div>' +
        '<div class="sat-campo" data-s="teleWrap" hidden><span class="sat-rot">Por onde?</span>' +
          '<div class="seg sat-seg" data-s="segCanal" role="group" aria-label="WhatsApp ou Google Meet"><button type="button" data-canal="whatsapp">WhatsApp</button><button type="button" data-canal="meet">Google Meet</button></div>' +
          '<div class="sat-campo" data-s="telWrap" hidden><label>Telefone (WhatsApp) do cliente *</label><input class="sat-in" data-s="tel" inputmode="tel" placeholder="(82) 99999-9999" autocomplete="off"><div class="sat-sug" data-s="telSug"></div>' +
            '<label class="sat-chk" data-s="telGuardarWrap" hidden><input type="checkbox" data-s="telGuardar" checked> Guardar este telefone na ficha do cliente</label></div>' +
          '<div class="sat-campo" data-s="mailWrap" hidden><label>E-mail do cliente (para o convite do Meet) *</label><input class="sat-in" data-s="mail" type="email" placeholder="cliente@exemplo.com" autocomplete="off"><div class="sat-sug" data-s="mailSug"></div>' +
            '<label class="sat-chk" data-s="mailGuardarWrap" hidden><input type="checkbox" data-s="mailGuardar" checked> Guardar este e-mail na ficha do cliente</label>' +
            '<label style="margin-top:6px">Link da sala do Meet (opcional)</label><input class="sat-in" data-s="link" placeholder="https://meet.google.com/..." autocomplete="off">' +
            '<div class="sat-dica">Sem link? Depois de marcar, use "Convidar pelo Google Agenda" no atendimento: o Google cria a sala e manda o convite para o e-mail do cliente.</div></div>' +
        '</div></div>' +
      '<div class="sat-campo"><label>Observação (opcional)</label><textarea data-s="obs" maxlength="4000" placeholder="Assunto, documentos para trazer, quem indicou..."></textarea></div>',
      '<button type="button" class="sat-b btn-sm" data-a="cancelar">Cancelar</button><button type="button" class="sat-b btn-salvar-modal" data-a="salvar">Marcar atendimento</button>');
    var q = ov.q;
    var lista = await atendentes(true);
    var podeFora = function(){ return !!st.resp && (st.resp.id === eu || cache.admin); };

    /* cliente */
    var tBusca = null;
    q('cliTermo').addEventListener('input', function(){
      clearTimeout(tBusca); var t = q('cliTermo').value.trim();
      if (t.length < 2) { q('cliRes').hidden = true; return; }
      tBusca = setTimeout(async function(){
        var r = await sb().rpc('busca_global', { p_termo: t });
        if (q('cliTermo').value.trim() !== t) return;
        var d = r.data || {}, vistos = {}, itens = [];
        (d.pessoas || []).forEach(function(p){ if (vistos[p.id]) return; vistos[p.id] = 1; itens.push({ id: p.id, nome: p.nome_completo || p.nome, sub: p.cpf ? 'CPF ' + fmtCpf(p.cpf) : '' }); });
        (d.contatos || []).forEach(function(c){ if (!c.pessoa_id || vistos[c.pessoa_id]) return; vistos[c.pessoa_id] = 1; itens.push({ id: c.pessoa_id, nome: c.nome_completo, sub: (c.onde || '') + (c.valor ? ': ' + c.valor : '') }); });
        q('cliRes').innerHTML = itens.length ? itens.slice(0, 12).map(function(i){ return '<button type="button" data-cli="' + esc(i.id) + '" data-nome="' + esc(i.nome) + '" data-sub="' + esc(i.sub) + '">' + esc(i.nome) + (i.sub ? '<small>' + esc(i.sub) + '</small>' : '') + '</button>'; }).join('')
          : '<div class="sat-vazio">Nenhum cliente com esse nome, CPF, telefone ou e-mail.</div>';
        q('cliRes').hidden = false;
      }, 280);
    });
    q('cliRes').addEventListener('click', function(e){ var b = e.target.closest('[data-cli]'); if (!b) return; escolherCliente(b.dataset.cli, b.dataset.nome, b.dataset.sub); });
    async function escolherCliente(id, nome, sub){
      st.pessoa = { id: id, nome: nome };
      q('cliNome').textContent = nome || 'Cliente'; q('cliCpf').textContent = sub || '';
      q('cliRes').hidden = true; q('cliBusca').hidden = true; q('cliDica').hidden = true; q('cliSel').hidden = false;
      // processos do cliente
      var rp = await sb().from('processos').select('id,numero_processo_cnj,teses!tese_id(nome)').eq('pessoa_id', id).eq('excluido_logico', false).order('criado_em', { ascending: false });
      var ps = rp.data || [];
      q('proc').innerHTML = '<option value="">Sem processo (atendimento do cliente)</option>' + ps.map(function(p){ return '<option value="' + esc(p.id) + '">' + esc((p.teses && p.teses.nome ? p.teses.nome + ' · ' : '') + (p.numero_processo_cnj || 'sem número')) + '</option>'; }).join('');
      if (opts.processoId && ps.some(function(p){ return p.id === opts.processoId; })) q('proc').value = opts.processoId;
      q('procCampo').hidden = !ps.length;
      // telefones e e-mails que a ficha já tem
      var rc = await sb().rpc('atendimento_contatos_cliente', { p_pessoa: id });
      st.contatos = (rc.data && typeof rc.data === 'object') ? { telefones: rc.data.telefones || [], emails: rc.data.emails || [] } : { telefones: [], emails: [] };
      q('telSug').innerHTML = st.contatos.telefones.map(function(t){ return '<button type="button" class="sat-b btn-sm peq" data-tel="' + esc(t.numero) + '" title="' + esc(t.onde) + '">' + esc(fmtTel(t.numero)) + (t.whatsapp ? ' · WhatsApp' : '') + '</button>'; }).join('');
      q('mailSug').innerHTML = st.contatos.emails.map(function(m){ return '<button type="button" class="sat-b btn-sm peq" data-mail="' + esc(m.email) + '" title="' + esc(m.onde) + '">' + esc(m.email) + '</button>'; }).join('');
      if (!q('tel').value && st.contatos.telefones[0]) q('tel').value = fmtTel(st.contatos.telefones[0].numero);
      if (!q('mail').value && st.contatos.emails[0]) q('mail').value = st.contatos.emails[0].email;
      conferirGuardar();
    }
    q('cliSel').addEventListener('click', function(e){ if (!e.target.closest('[data-a="trocarCli"]')) return; st.pessoa = null; q('cliSel').hidden = true; q('cliBusca').hidden = false; q('cliDica').hidden = false; q('procCampo').hidden = true; q('cliTermo').value = ''; q('cliTermo').focus(); });

    /* quem atende e horários */
    q('resp').innerHTML = lista.length ? lista.map(function(a){ return '<option value="' + esc(a.id) + '">' + esc(a.nome) + (a.tem_horarios ? '' : ' (sem horários definidos)') + '</option>'; }).join('') : '<option value="">Ninguém está marcado como "Atende clientes"</option>';
    var inicial = opts.responsavelId && lista.some(function(a){ return a.id === opts.responsavelId; }) ? opts.responsavelId
      : (lista.some(function(a){ return a.id === eu && a.tem_horarios; }) ? eu : ((lista.filter(function(a){ return a.tem_horarios; })[0] || lista[0] || {}).id || ''));
    q('resp').value = inicial;
    function trocarResp(){
      st.resp = lista.filter(function(a){ return a.id === q('resp').value; })[0] || null; st.semana = 0; st.slot = null;
      var dica = q('respDica');
      if (!lista.length) { dica.innerHTML = 'Peça ao administrador para ligar "Atende clientes" no Painel de permissões (Agenda).'; dica.hidden = false; }
      else if (st.resp && !st.resp.tem_horarios) { dica.innerHTML = esc(primeiro(st.resp.nome)) + ' ainda não definiu os horários de atendimento.' + (podeFora() ? ' <a href="#" data-a="defHor">Definir os horários agora</a>' : ' Peça para definir em Agenda &gt; Meus horários.'); dica.hidden = false; }
      else dica.hidden = true;
      q('outroWrap').hidden = !podeFora();
      if (!podeFora()) { q('outroChk').checked = false; q('outroCampos').hidden = true; }
      if (st.mod === 'presencial') q('local').value = (st.resp && st.resp.local_presencial) || 'Escritório';
      if (st.canal === 'meet' && !q('link').value) q('link').value = (st.resp && st.resp.link_meet) || '';
      carregarSlots();
    }
    q('resp').addEventListener('change', trocarResp);
    q('respDica').addEventListener('click', function(e){ if (!e.target.closest('[data-a="defHor"]')) return; e.preventDefault(); horarios({ usuarioId: st.resp && st.resp.id, aoSalvar: async function(){ lista = await atendentes(true); var v = q('resp').value; q('resp').innerHTML = lista.map(function(a){ return '<option value="' + esc(a.id) + '">' + esc(a.nome) + (a.tem_horarios ? '' : ' (sem horários definidos)') + '</option>'; }).join(''); q('resp').value = v; trocarResp(); } }); });
    async function carregarSlots(){
      var box = q('slots'); st.slot = null;
      var de = new Date(); de.setHours(0, 0, 0, 0); de.setDate(de.getDate() + st.semana * 7);
      var ate = new Date(de); ate.setDate(ate.getDate() + 6);
      q('semTxt').textContent = dCurta(de) + ' a ' + dCurta(ate);
      ov.querySelector('[data-a="semAnt"]').disabled = st.semana <= 0;
      if (!st.resp) { box.innerHTML = ''; return; }
      if (!st.resp.tem_horarios) { box.innerHTML = '<div class="sat-vazio">Sem horários de atendimento definidos.' + (podeFora() ? ' Use "Outro horário" abaixo.' : '') + '</div>'; return; }
      box.innerHTML = '<div class="sat-vazio">Carregando os horários…</div>';
      var r = await sb().rpc('atendimento_horarios', { p_usuario: st.resp.id, p_de: isoDia(de), p_ate: isoDia(ate) });
      if (r.error) { box.innerHTML = '<div class="sat-vazio">Não foi possível carregar os horários.</div>'; return; }
      var dias = {}, ordem = [];
      (r.data || []).forEach(function(h){ var k = isoDia(new Date(h.inicio)); if (!dias[k]) { dias[k] = []; ordem.push(k); } dias[k].push(h); });
      var livres = (r.data || []).filter(function(h){ return h.situacao === 'livre'; }).length;
      if (!ordem.length) { box.innerHTML = '<div class="sat-vazio">Nenhum horário de atendimento nesta semana.</div>'; return; }
      box.innerHTML = (livres ? '' : '<div class="sat-vazio">Todos os horários desta semana estão ocupados. Veja a próxima semana.</div>') + ordem.map(function(k){
        return '<div class="sat-dia">' + esc(dDia(dias[k][0].inicio)) + '</div><div class="sat-slots">' + dias[k].map(function(h){
          var s = h.situacao === 'livre' ? 'livre' : h.situacao === 'passado' ? 'passado' : 'ocupado';
          return '<button type="button" class="sat-slot ' + s + '" data-ini="' + esc(h.inicio) + '" data-fim="' + esc(h.fim) + '"' + (s === 'livre' ? '' : ' disabled') + ' title="' + (s === 'livre' ? 'Livre' : s === 'passado' ? 'Já passou' : 'Ocupado') + '">' + esc(dHora(h.inicio)) + '</button>';
        }).join('') + '</div>';
      }).join('');
    }
    q('slots').addEventListener('click', function(e){
      var b = e.target.closest('.sat-slot.livre'); if (!b) return;
      Array.prototype.forEach.call(q('slots').querySelectorAll('.sat-slot.active'), function(x){ x.classList.remove('active'); });
      b.classList.add('active'); st.slot = { inicio: b.dataset.ini, fim: b.dataset.fim };
      if (q('outroChk').checked) { q('outroChk').checked = false; recolher(q('outroCampos'), true); }
    });
    q('outroChk').addEventListener('change', function(){
      recolher(q('outroCampos'), !q('outroChk').checked);
      if (q('outroChk').checked) { st.slot = null; Array.prototype.forEach.call(q('slots').querySelectorAll('.sat-slot.active'), function(x){ x.classList.remove('active'); }); if (st.resp) q('outroDur').value = String(DURACOES.indexOf(st.resp.duracao_min) >= 0 ? st.resp.duracao_min : 30); }
    });

    /* forma */
    q('segMod').addEventListener('click', function(e){
      var b = e.target.closest('[data-mod]'); if (!b) return;
      st.mod = b.dataset.mod; ativar(q('segMod'), b);
      if (st.mod === 'presencial' && !q('local').value) q('local').value = (st.resp && st.resp.local_presencial) || 'Escritório';
      recolher(q('presWrap'), st.mod !== 'presencial'); recolher(q('teleWrap'), st.mod !== 'telepresencial');
    });
    q('segCanal').addEventListener('click', function(e){
      var b = e.target.closest('[data-canal]'); if (!b) return;
      st.canal = b.dataset.canal; ativar(q('segCanal'), b);
      if (st.canal === 'meet' && !q('link').value) q('link').value = (st.resp && st.resp.link_meet) || '';
      recolher(q('telWrap'), st.canal !== 'whatsapp'); recolher(q('mailWrap'), st.canal !== 'meet');
      conferirGuardar();
    });
    ligarMascaraTel(q('tel'));
    q('tel').addEventListener('input', conferirGuardar); q('mail').addEventListener('input', conferirGuardar);
    q('telSug').addEventListener('click', function(e){ var b = e.target.closest('[data-tel]'); if (!b) return; q('tel').value = fmtTel(b.dataset.tel); conferirGuardar(); });
    q('mailSug').addEventListener('click', function(e){ var b = e.target.closest('[data-mail]'); if (!b) return; q('mail').value = b.dataset.mail; conferirGuardar(); });
    function conferirGuardar(){
      var t = telLimpo(q('tel').value), m = q('mail').value.trim().toLowerCase();
      var telNovo = !!st.pessoa && t.length >= 10 && !st.contatos.telefones.some(function(x){ return String(x.numero).slice(-8) === t.slice(-8); });
      var mailNovo = !!st.pessoa && emailOk(m) && !st.contatos.emails.some(function(x){ return String(x.email).toLowerCase() === m; });
      q('telGuardarWrap').hidden = !telNovo; q('mailGuardarWrap').hidden = !mailNovo;
    }

    /* semanas, cancelar, salvar */
    ov.addEventListener('click', async function(e){
      var b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'semAnt') { if (st.semana > 0) { st.semana--; carregarSlots(); } return; }
      if (b.dataset.a === 'semProx') { st.semana++; carregarSlots(); return; }
      if (b.dataset.a === 'cancelar') { ov.fechar(); return; }
      if (b.dataset.a === 'salvar') salvar(b, false);
    });
    async function salvar(b, forcar){
      if (!st.pessoa) { aviso('Escolha o cliente (ele precisa estar cadastrado no SAGA).', 'alerta'); q('cliTermo').focus(); return; }
      if (!st.resp) { aviso('Escolha quem vai atender.', 'alerta'); return; }
      var ini = null, fim = null;
      if (q('outroChk').checked) {
        if (!q('outroIni').value) { aviso('Escolha o dia e a hora do outro horário.', 'alerta'); return; }
        var d0 = new Date(q('outroIni').value); ini = d0.toISOString(); fim = new Date(d0.getTime() + Number(q('outroDur').value || 30) * 60000).toISOString();
      } else if (st.slot) { ini = st.slot.inicio; fim = st.slot.fim; }
      if (!ini) { aviso('Escolha um horário livre.', 'alerta'); return; }
      if (!st.mod) { aviso('Escolha se o atendimento é presencial ou telepresencial.', 'alerta'); return; }
      var tel = telLimpo(q('tel').value), mail = q('mail').value.trim();
      if (st.mod === 'telepresencial') {
        if (!st.canal) { aviso('Escolha a forma: WhatsApp ou Google Meet.', 'alerta'); return; }
        if (st.canal === 'whatsapp' && (tel.length < 10 || tel.length > 11)) { aviso('Para atender pelo WhatsApp, informe o telefone do cliente com DDD.', 'alerta'); q('tel').focus(); return; }
        if (st.canal === 'meet' && !emailOk(mail)) { aviso('Para atender pelo Google Meet, informe o e-mail do cliente.', 'alerta'); q('mail').focus(); return; }
        var link = q('link').value.trim();
        if (st.canal === 'meet' && link && !/^https:\/\/\S+$/i.test(link)) { aviso('O link da sala precisa começar com https://', 'alerta'); return; }
      }
      var guardar = (st.mod === 'telepresencial') && ((st.canal === 'whatsapp' && !q('telGuardarWrap').hidden && q('telGuardar').checked) || (st.canal === 'meet' && !q('mailGuardarWrap').hidden && q('mailGuardar').checked));
      var p = {
        pessoa_id: st.pessoa.id, responsavel_id: st.resp.id, processo_id: q('proc').value || null,
        inicio: ini, fim: q('outroChk').checked ? fim : null, modalidade: st.mod,
        canal: st.mod === 'telepresencial' ? st.canal : null,
        telefone: st.mod === 'telepresencial' && st.canal === 'whatsapp' ? tel : null,
        email: st.mod === 'telepresencial' && st.canal === 'meet' ? mail : null,
        local: st.mod === 'presencial' ? q('local').value.trim() : (st.canal === 'meet' ? q('link').value.trim() : ''),
        observacao: q('obs').value.trim(), salvar_contato: guardar, forcar: !!forcar
      };
      b.disabled = true; b.textContent = 'Marcando…';
      var r = await sb().rpc('atendimento_marcar', { p: p });
      b.disabled = false; b.textContent = 'Marcar atendimento';
      if (r.error) {
        var m = erroTxt(r.error);
        if (/HORARIO_OCUPADO/.test(m)) {
          if (await confirmar('Horário ocupado', 'Já há compromisso nesse horário na agenda de ' + primeiro(st.resp.nome) + '. Marcar mesmo assim?', 'Marcar mesmo assim')) salvar(b, true);
          return;
        }
        aviso('Não foi possível marcar: ' + m, 'erro');
        if (/não está livre/.test(m)) carregarSlots();
        return;
      }
      aviso('Atendimento marcado: ' + dDia(ini) + ', ' + dHora(ini) + ', com ' + primeiro(st.resp.nome) + '.', 'ok');
      ov.fechar();
      if (opts.aoSalvar) try { opts.aoSalvar(r.data); } catch(e2) {}
    }

    if (opts.pessoaId) escolherCliente(opts.pessoaId, opts.pessoaNome || 'Cliente', '');
    trocarResp();
    if (!opts.pessoaId) setTimeout(function(){ try { q('cliTermo').focus(); } catch(e) {} }, 60);
    return ov;
  }

  /* ---------- janela "Horários de atendimento" (grade semanal) ---------- */
  async function horarios(opts){
    opts = opts || {};
    var eu = await quemSou();
    var lista = await atendentes(true);
    var alvoId = opts.usuarioId || eu;
    if (!cache.admin && alvoId !== eu) alvoId = eu;
    var ov = janela('Horários de atendimento',
      '<div class="sat-dica">Os horários fixos de cada semana em que você atende clientes. A equipe só consegue marcar nesses horários (os ocupados pela sua agenda aparecem riscados). Você mesmo e o administrador podem marcar fora deles.</div>' +
      '<div class="sat-campo" data-s="quemCampo"' + (cache.admin && lista.length > 1 ? '' : ' hidden') + '><label>Horários de</label><select data-s="quem"></select></div>' +
      '<div data-s="semPerm" class="sat-dica" hidden></div>' +
      '<div data-s="form"><div data-s="grade"></div>' +
        '<div class="sat-linha2" style="margin-top:10px"><div class="sat-campo" style="flex:1 1 160px"><label>Duração de cada atendimento</label><select class="sat-in" data-s="dur">' + DURACOES.map(function(m){ return '<option value="' + m + '">' + m + ' minutos</option>'; }).join('') + '</select></div>' +
        '<div class="sat-campo" style="flex:2 1 220px"><label>Local do atendimento presencial</label><input class="sat-in" data-s="local" maxlength="200" placeholder="Escritório"></div></div>' +
        '<div class="sat-campo"><label>Link fixo da sua sala do Google Meet (opcional)</label><input class="sat-in" data-s="link" maxlength="300" placeholder="https://meet.google.com/abc-defg-hij"><div class="sat-dica">Com o link fixo, todo atendimento pelo Meet já leva a sua sala.</div></div>' +
        '<div class="sat-dica" data-s="previa"></div></div>',
      '<button type="button" class="sat-b btn-sm" data-a="cancelar">Cancelar</button><button type="button" class="sat-b btn-salvar-modal" data-a="salvar">Salvar horários</button>');
    var q = ov.q, grade = [];
    q('quem').innerHTML = lista.map(function(a){ return '<option value="' + esc(a.id) + '">' + esc(a.nome) + '</option>'; }).join('');
    function faixaHtml(f){ return '<span class="sat-faixa">de <input type="time" class="sat-in" data-f="ini" value="' + esc(f.ini) + '"> até <input type="time" class="sat-in" data-f="fim" value="' + esc(f.fim) + '"><button type="button" class="sat-b btn-sm peq" data-a="tiraFaixa" aria-label="Tirar esta faixa">✕</button></span>'; }
    function desenhar(){
      q('grade').innerHTML = ORDEM_DIAS.map(function(d){
        var fs = grade.filter(function(f){ return f.dia === d; });
        return '<div class="sat-grade-dia" data-dia="' + d + '"><b>' + DIAS[d] + '</b><div><div data-faixas>' + (fs.length ? fs.map(faixaHtml).join('') : '<span class="sat-vazio">Não atende</span>') + '</div><button type="button" class="sat-b btn-sm peq" data-a="addFaixa">+ horário</button></div></div>';
      }).join('');
      previa();
    }
    function lerGrade(){
      var g = [];
      Array.prototype.forEach.call(q('grade').querySelectorAll('[data-dia]'), function(l){
        Array.prototype.forEach.call(l.querySelectorAll('.sat-faixa'), function(f){ g.push({ dia: Number(l.dataset.dia), ini: f.querySelector('[data-f="ini"]').value, fim: f.querySelector('[data-f="fim"]').value }); });
      });
      return g;
    }
    function minutos(h){ var p = String(h || '').split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); }
    function previa(){
      var g = lerGrade(), dur = Number(q('dur').value || 30), tot = 0;
      var partes = ORDEM_DIAS.map(function(d){
        var n = g.filter(function(f){ return f.dia === d && f.ini && f.fim; }).reduce(function(s, f){ return s + Math.max(0, Math.floor((minutos(f.fim) - minutos(f.ini)) / dur)); }, 0);
        tot += n; return n ? DIAS[d].slice(0, 3) + ' ' + n : null;
      }).filter(Boolean);
      q('previa').textContent = tot ? 'Por semana: ' + tot + ' horário' + (tot > 1 ? 's' : '') + ' de ' + dur + ' min (' + partes.join(', ') + ').' : 'Nenhum horário por semana ainda.';
    }
    function preencher(){
      var a = lista.filter(function(x){ return x.id === alvoId; })[0];
      var sem = q('semPerm');
      if (!a) {
        sem.textContent = 'Você ainda não está na lista de quem atende clientes. Peça ao administrador para ligar "Atende clientes" no Painel de permissões (Agenda).';
        sem.hidden = false; q('form').hidden = true; ov.querySelector('[data-a="salvar"]').disabled = true; return;
      }
      sem.hidden = true; q('form').hidden = false; ov.querySelector('[data-a="salvar"]').disabled = false;
      q('quem').value = a.id;
      grade = (a.grade || []).map(function(f){ return { dia: Number(f.dia), ini: f.ini, fim: f.fim }; });
      q('dur').value = String(DURACOES.indexOf(a.duracao_min) >= 0 ? a.duracao_min : 30);
      q('local').value = a.local_presencial || ''; q('link').value = a.link_meet || '';
      desenhar();
    }
    q('quem').addEventListener('change', function(){ alvoId = q('quem').value; preencher(); });
    q('grade').addEventListener('input', previa); q('dur').addEventListener('change', previa);
    ov.addEventListener('click', async function(e){
      var b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'cancelar') { ov.fechar(); return; }
      if (b.dataset.a === 'addFaixa') {
        var l = b.closest('[data-dia]'), cx = l.querySelector('[data-faixas]'), fs = cx.querySelectorAll('.sat-faixa');
        var ult = fs.length ? fs[fs.length - 1].querySelector('[data-f="fim"]').value : '';
        var ini = ult ? (ult < '13:00' ? '14:00' : ult) : '09:00';
        var fimMin = Math.min(minutos(ini) + 180, 23 * 60 + 59), fim = ini === '09:00' ? '12:00' : String(Math.floor(fimMin / 60)).padStart(2, '0') + ':' + String(fimMin % 60).padStart(2, '0');
        if (!fs.length) cx.innerHTML = '';
        var tmp = document.createElement('div'); tmp.innerHTML = faixaHtml({ ini: ini, fim: fim });
        var nova = tmp.firstChild; cx.appendChild(nova); previa(); return;
      }
      if (b.dataset.a === 'tiraFaixa') { var cx2 = b.closest('[data-faixas]'); b.closest('.sat-faixa').remove(); if (!cx2.querySelector('.sat-faixa')) cx2.innerHTML = '<span class="sat-vazio">Não atende</span>'; previa(); return; }
      if (b.dataset.a === 'salvar') {
        var g = lerGrade();
        if (g.some(function(f){ return !f.ini || !f.fim; })) { aviso('Preencha o "de" e o "até" de cada horário.', 'alerta'); return; }
        b.disabled = true;
        var r = await sb().rpc('atendimento_config_salvar', { p_usuario: alvoId, p_grade: g, p_duracao: Number(q('dur').value || 30), p_local: q('local').value.trim() || null, p_link_meet: q('link').value.trim() || null });
        b.disabled = false;
        if (r.error) { aviso('Não foi possível salvar: ' + erroTxt(r.error), 'erro'); return; }
        cache.atendentes = null;
        aviso('Horários de atendimento salvos.', 'ok'); ov.fechar();
        if (opts.aoSalvar) try { opts.aoSalvar(); } catch(e2) {}
      }
    });
    preencher();
    return ov;
  }

  global.SagaAtendimentos = {
    configurar: function(o){ Object.keys(o || {}).forEach(function(k){ cfg[k] = o[k]; }); },
    marcar: marcar, horarios: horarios, bloco: bloco, listaFicha: listaFicha,
    carregar: carregar, daPessoa: daPessoa, respostas: respostas, atendentes: atendentes,
    forma: forma, situacao: situacao, fmtTel: fmtTel,
    souAdmin: function(){ return cache.admin; }
  };
})(window);
