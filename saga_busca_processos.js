/* =====================================================================
   BUSCA DE PROCESSOS SEM O ESCAVADOR (23/11/2026, Dr. Victor; etapa 2; blocos 435 a 438)
   O robô do banco (pg_net) procura o número do processo dos cartões sem número:
   DJEN do CNJ pelo NOME da parte e Portal de Precatórios do TRF5 pelo CPF.
   NADA é gravado sozinho: cada achado espera o clique "É este" (grava o número no cartão, só se estiver vazio)
   ou "Não é" (com o motivo). No 1º mês TODO achado passa pelo clique, inclusive o "seguro".
   Onde aparece:
   - Captação (lista_processos_padrao_metalico.html?fase=captacao): botão "Processos achados (N)" que abre a janela
     de conferência (filtros Seguro / A conferir / Conferidos, busca, faixa do robô com os erros à vista e, só para o
     administrador, ligar/desligar, "Buscar agora", "Pôr os cartões novos na fila"); aba "Comparar com o Escavador".
     ?busca_processos=1 abre direto (link da Saúde do sistema).
   - Ficha: quadro "Processos achados nas fontes públicas" no bloco de dados do processo, com os mesmos botões e
     "Buscar processos deste cliente" (põe o cartão na frente da fila).
   Carregado por 1 linha no fim de cada tela. Textos de fora sempre pela sagaEsc; links pela sagaUrlSegura.
   ===================================================================== */
(function(){
  'use strict';
  var esc = function(v){ return window.sagaEsc ? window.sagaEsc(v) : String(v == null ? '' : v).replace(/[&<>"'`]/g, function(c){ return '&#' + c.charCodeAt(0) + ';'; }); };
  var urlOk = function(u){ return window.sagaUrlSegura ? window.sagaUrlSegura(u) : (/^https:\/\//i.test(String(u || '')) ? String(u) : ''); };
  var erroTxt = function(e){ return (window.sagaErroBanco ? window.sagaErroBanco(e) : (e && e.message)) || String(e || 'erro'); };
  var sb = function(){ return window._sb; };
  var $ = function(id){ return document.getElementById(id); };
  var FICHA = 'ficha_cliente_padrao_metalico_FINAL.html';
  var NA_FICHA = /ficha_cliente/.test(location.pathname);
  var S = { filtro: 'pendentes', busca: '', pagina: 1, aba: 'conferir', dados: null, ocupado: false, pode: { editar: false, admin: false } };

  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }
  function toast(m, t){ if(window.showToast) window.showToast(esc(m), t || 'info'); }
  function dataHora(t){ if(!t) return '—'; var d = new Date(t); if(isNaN(d)) return '—'; return d.toLocaleString('pt-BR', { timeZone: 'America/Maceio', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''); }
  function dataBR(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function fichaUrl(a){ return FICHA + '?pessoa_id=' + encodeURIComponent(a.pessoa_id || '') + (a.processo_id ? '&processo_id=' + encodeURIComponent(a.processo_id) : ''); }
  function trib(num){ try{ return window.SagaTribunais ? window.SagaTribunais.icone(num) : ''; }catch(e){ return ''; } }
  var FONTE = { djen: 'DJEN (CNJ)', trf5_prc: 'Precatórios TRF5', trf5_rpv: 'RPV TRF5' };
  var SIT = { na_fila: 'na fila', buscando: 'buscando agora', feito: 'buscado', erro: 'com erro', tem_numero: 'já tem número' };

  /* ---------------- estilos (só variáveis do tema) ---------------- */
  function css(){
    if($('bpCss')) return;
    var s = document.createElement('style'); s.id = 'bpCss';
    s.textContent =
      '.bp-ov{position:fixed;inset:0;z-index:1750;display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow-y:auto;background:rgba(4,7,14,.62);opacity:0;visibility:hidden;transition:opacity .32s cubic-bezier(.22,.78,.25,1),visibility .32s}'
      + '.bp-ov.aberto{opacity:1;visibility:visible}'
      + '.bp-modal{width:100%;max-width:880px;border:1px solid var(--border);border-radius:18px;background:var(--panel-solid,var(--panel));color:var(--text);box-shadow:0 28px 70px rgba(0,0,0,.45);transform:translateY(10px);transition:transform .32s cubic-bezier(.22,.78,.25,1)}'
      + '.bp-ov.aberto .bp-modal{transform:none}'
      + '.bp-mh{display:flex;justify-content:space-between;gap:12px;padding:18px 20px 12px;border-bottom:1px solid var(--border-soft)}'
      + '.bp-mh h2{font-family:"Cormorant Garamond",serif;font-size:24px;font-weight:600;margin:0}.bp-mh p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.45;max-width:64ch}'
      + '.bp-x{width:32px;height:32px;flex:0 0 32px;border-radius:9px;border:1px solid var(--border-soft);background:transparent;color:var(--muted);cursor:pointer}'
      + '.bp-mb{padding:14px 20px 20px;min-width:0}'
      + '.bp-abas,.bp-filtros{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}'
      + '.bp-btn{font:inherit;font-size:12px;font-weight:500;padding:6px 12px;border-radius:9px;border:1px solid var(--sb-sec-borda,var(--border-soft));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer;min-height:32px}'
      + '.bp-btn.active{border-color:color-mix(in srgb,var(--gold) 55%,transparent);background:color-mix(in srgb,var(--gold) 14%,transparent)}'
      + '.bp-btn.principal{border-color:color-mix(in srgb,var(--gold) 60%,transparent);background:color-mix(in srgb,var(--gold) 16%,transparent);color:var(--text)}'
      + '.bp-btn.perigo{border-color:color-mix(in srgb,var(--danger,#e5484d) 45%,transparent);color:var(--danger,#e5484d)}'
      + '.bp-btn:disabled{opacity:.5;cursor:default}'
      + '.bp-btn b{font-weight:700;margin-left:4px}'
      + '.bp-busca{display:flex;gap:6px;margin-bottom:10px}.bp-busca input{flex:1;min-width:0;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);padding:0 10px;font:inherit;font-size:13px}'
      + '.bp-robo{display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:12px;border:1px solid var(--border-soft);margin-bottom:12px;font-size:12.5px;line-height:1.5}'
      + '.bp-robo .bp-bola{width:11px;height:11px;border-radius:50%;flex:0 0 11px;margin-top:5px;background:var(--muted)}'
      + '.bp-robo.verde .bp-bola{background:var(--success,#2fa36b)}.bp-robo.amarelo{border-color:var(--warning,#d79b1f)}.bp-robo.amarelo .bp-bola{background:var(--warning,#d79b1f)}'
      + '.bp-robo.vermelho{border-color:var(--danger,#e5484d)}.bp-robo.vermelho .bp-bola{background:var(--danger,#e5484d)}'
      + '.bp-robo>div{min-width:0;flex:1}.bp-sub{font-size:11.5px;color:var(--muted)}.bp-acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'
      + '.bp-erros{margin-top:8px;display:grid;gap:4px}.bp-erro{font-size:11.5px;padding:5px 8px;border-radius:8px;border-left:3px solid var(--warning,#d79b1f);background:color-mix(in srgb,var(--warning,#d79b1f) 8%,transparent);overflow-wrap:anywhere}'
      + '.bp-erro.vermelho{border-left-color:var(--danger,#e5484d);background:color-mix(in srgb,var(--danger,#e5484d) 8%,transparent)}'
      + '.bp-lista{display:grid;gap:8px}'
      + '.bp-card{border:1px solid var(--border-soft);border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:1.5;min-width:0}'
      + '.bp-card.seguro{border-left:3px solid var(--success,#2fa36b)}.bp-card.conferir{border-left:3px solid var(--warning,#d79b1f)}'
      + '.bp-topo{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}'
      + '.bp-cod{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11.5px;color:var(--muted)}'
      + '.bp-nome{font-weight:600;color:var(--text);text-decoration:none}.bp-nome:hover{color:var(--gold)}'
      + '.bp-num{font-variant-numeric:lining-nums tabular-nums;font-weight:600;white-space:nowrap}'
      + '.bp-selo{font-size:10.5px;font-weight:700;padding:1px 8px;border-radius:999px;white-space:nowrap}'
      + '.bp-selo.seguro{color:var(--success,#2fa36b);background:color-mix(in srgb,var(--success,#2fa36b) 14%,transparent)}'
      + '.bp-selo.conferir{color:var(--warning,#d79b1f);background:color-mix(in srgb,var(--warning,#d79b1f) 15%,transparent)}'
      + '.bp-selo.decidido{color:var(--muted);background:color-mix(in srgb,var(--text) 7%,transparent)}'
      + '.bp-info{color:var(--muted);font-size:11.5px;margin-top:3px;overflow-wrap:anywhere}'
      + '.bp-trecho{margin-top:6px;padding:7px 9px;border-radius:8px;background:color-mix(in srgb,var(--text) 4%,transparent);font-size:11.5px;overflow-wrap:anywhere}'
      + '.bp-alerta{margin-top:6px;font-size:11.5px;color:var(--warning,#d79b1f)}'
      + '.bp-dec{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}'
      + '.bp-nao{display:none;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}.bp-nao.aberto{display:flex}'
      + '.bp-nao input{flex:1 1 220px;min-width:0;height:32px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);padding:0 9px;font:inherit;font-size:12.5px}'
      + '.bp-vazio{color:var(--muted);font-size:12.5px;padding:14px 4px}.bp-msg{font-size:12.5px;padding:9px 12px;border-radius:10px;border:1px solid var(--danger,#e5484d);color:var(--danger,#e5484d);overflow-wrap:anywhere}'
      + '.bp-pag{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:var(--muted)}'
      + '.bp-comp{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px}.bp-comp div{border:1px solid var(--border-soft);border-radius:10px;padding:8px 10px;font-size:11.5px;color:var(--muted)}.bp-comp b{display:block;font-size:20px;color:var(--text);font-family:"Cormorant Garamond",serif}'
      + '.bp-form{display:grid;gap:8px;border:1px solid var(--border-soft);border-radius:12px;padding:11px 13px;margin-bottom:12px}.bp-form label{font-size:11px;font-weight:700;color:var(--muted)}'
      + '.bp-form input[type=text],.bp-form textarea{width:100%;box-sizing:border-box;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);padding:7px 9px;font:inherit;font-size:12.5px}'
      + '.bp-tab{width:100%;border-collapse:collapse;font-size:12px}.bp-tab th{text-align:left;font-size:10px;text-transform:uppercase;color:var(--muted);padding:6px;border-bottom:1px solid var(--border-soft)}.bp-tab td{padding:7px 6px;border-bottom:1px solid var(--border-soft);vertical-align:top;overflow-wrap:anywhere}'
      + '.bp-tabwrap{overflow-x:auto}'
      + '#bpFicha{margin:10px 0;border:1px solid var(--border-soft);border-radius:12px;padding:10px 12px;font-size:12.5px}'
      + '#bpFicha .bp-ftit{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-weight:600}'
      + '#bpBotao .bp-qtd{display:inline-flex;min-width:18px;justify-content:center;margin-left:6px;padding:0 6px;border-radius:999px;font-size:11px;background:color-mix(in srgb,var(--gold) 20%,transparent)}'
      + '@media(max-width:640px){.bp-ov{padding:8px}.bp-mh,.bp-mb{padding-left:13px;padding-right:13px}.bp-btn{min-height:40px}}';
    document.head.appendChild(s);
  }

  /* ---------------- janela ---------------- */
  function janela(){
    var j = $('bpJanela'); if(j) return j;
    css();
    document.body.insertAdjacentHTML('beforeend',
      '<div class="bp-ov" id="bpJanela" role="dialog" aria-modal="true" aria-labelledby="bpTitulo">'
      + '<div class="bp-modal"><div class="bp-mh"><div><h2 id="bpTitulo">Processos achados nas fontes públicas</h2>'
      + '<p>O robô procura o número do processo dos cartões sem número no DJEN do CNJ (pelo nome) e no Portal de Precatórios do TRF5 (pelo CPF). Nada é gravado sozinho: confira cada achado e clique em "É este" ou "Não é".</p></div>'
      + '<button class="bp-x" type="button" data-bp="fechar" aria-label="Fechar">✕</button></div>'
      + '<div class="bp-mb" id="bpCorpo"><div class="bp-vazio">Carregando…</div></div></div></div>');
    j = $('bpJanela');
    if(reduzido()){ j.style.transition = 'none'; j.firstChild.style.transition = 'none'; }
    j.addEventListener('click', clique);
    j.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && e.target.id === 'bpBuscaTxt'){ S.busca = e.target.value; S.pagina = 1; carregar(); }
      if(e.key === 'Enter' && e.target.matches('.bp-nao input')){ var c = e.target.closest('[data-achado]'); decidir(c.getAttribute('data-achado'), 'nao_e', e.target.value, c); }
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && j.classList.contains('aberto')) fechar(); });
    return j;
  }
  function abrir(){ var j = janela(); requestAnimationFrame(function(){ j.classList.add('aberto'); }); carregar(); }
  function fechar(){ var j = $('bpJanela'); if(j) j.classList.remove('aberto'); contar(); if(NA_FICHA) desenharFicha(); }

  function clique(e){
    var j = $('bpJanela');
    if(e.target === j){ fechar(); return; }
    var b = e.target.closest('[data-bp]'); if(!b) return;
    var a = b.getAttribute('data-bp'), card = b.closest('[data-achado]'), id = card && card.getAttribute('data-achado');
    if(a === 'fechar'){ fechar(); return; }
    if(a === 'aba'){ S.aba = b.getAttribute('data-v'); carregar(); return; }
    if(a === 'filtro'){ S.filtro = b.getAttribute('data-v'); S.pagina = 1; carregar(); return; }
    if(a === 'buscar'){ var t = $('bpBuscaTxt'); S.busca = t ? t.value : ''; S.pagina = 1; carregar(); return; }
    if(a === 'pag'){ S.pagina = Math.max(1, S.pagina + (+b.getAttribute('data-v'))); carregar(); return; }
    if(a === 'recarregar'){ carregar(); return; }
    if(a === 'e_este'){ decidir(id, 'e_este', null, card); return; }
    if(a === 'nao_abrir'){ var n = card.querySelector('.bp-nao'); n.classList.add('aberto'); var i = n.querySelector('input'); if(i) i.focus(); return; }
    if(a === 'nao_motivo'){ var inp = card.querySelector('.bp-nao input'); inp.value = b.getAttribute('data-v'); inp.focus(); return; }
    if(a === 'nao_ok'){ decidir(id, 'nao_e', card.querySelector('.bp-nao input').value, card); return; }
    if(a === 'voltar'){ decidir(id, 'voltar', null, card); return; }
    if(a === 'robo'){ robo(JSON.parse(b.getAttribute('data-v') || '{}'), b); return; }
    if(a === 'comparar'){ comparar(b); return; }
  }

  async function carregar(){
    var c = $('bpCorpo'); if(!c) return;
    try{
      // 24/11 (Dr. Victor): paginação comum (saga_paginacao.js). Com o bloco 463 a função aceita 'limite' e devolve 'total';
      // sem ele continua de 30 em 30 com Anterior/Próximos.
      var P = pag(); P.pagina = S.pagina || 1; var extra = null, meu = S.pedidoLista = (S.pedidoLista || 0) + 1;
      var r = await SagaPaginacao.buscarEmPartes(function(off, lim){
        return sb().rpc('busca_proc_painel', { p: { filtro: S.filtro, busca: S.busca || null, pagina: Math.floor(off / lim) + 1, limite: lim, comparacao: S.aba === 'comparar' && !extra } }).then(function(x){
          if(x.error) return x; var d = x.data || {}; var ach = d.achados || [];
          if(d.total != null && ach.length > lim) ach = ach.slice(0, lim);   // a função manda 1 a mais para saber se há outra página
          if(!extra) extra = d; return { linhas: ach, total: d.total != null ? d.total : ach.length };
        });
      }, { offset: P.offset(), quantos: P.quantos(), lote: 500 });
      if(meu !== S.pedidoLista) return;
      if(r.error) throw r.error;
      S.dados = Object.assign({}, extra || {}, { achados: r.linhas }); S.pode = S.dados.pode || S.pode;
      S.temTotal = extra && extra.total != null; if(S.temTotal){ P.total(r.total); S.pagina = P.pagina; }
      desenhar();
    }catch(e){
      c.innerHTML = '<div class="bp-msg">Não consegui ler a busca de processos: ' + esc(erroTxt(e)) + '. <button class="bp-btn" type="button" data-bp="recarregar">Tentar de novo</button></div>';
    }
  }

  /* faixa do robô: situação, o que fez, erros à vista (amarelo passageiro, vermelho repetido) */
  function htmlRobo(d){
    var r = d.robo || {}, f = r.fila || {}, erros = r.erros || [], sit, txt;
    var verm = erros.filter(function(e){ return e.nivel === 'vermelho'; }).length, amar = erros.length - verm;
    if(!r.ativo){ sit = 'cinza'; txt = 'Robô DESLIGADO: nada é buscado até o administrador ligar.'; }
    else if(r.pausa_ate){ sit = 'amarelo'; txt = 'Em pausa até ' + dataHora(r.pausa_ate) + ' (' + (r.pausa_motivo || 'pedido demais à fonte') + '): volta sozinho.'; }
    else if(verm){ sit = 'vermelho'; txt = verm + ' cartão(ões) com erro em 3 buscas seguidas: veja abaixo.'; }
    else if(amar){ sit = 'amarelo'; txt = amar + ' cartão(ões) com erro passageiro: o robô tenta de novo sozinho em 6 h.'; }
    else { sit = 'verde'; txt = r.forcar_ate ? 'Buscando agora (fora do horário) até ' + dataHora(r.forcar_ate) + '.' : (r.na_janela ? 'Buscando normalmente.' : 'Ligado: busca das ' + r.hora_ini + 'h às ' + r.hora_fim + 'h (horário de Maceió).'); }
    var fila = ['na_fila', 'buscando', 'feito', 'erro', 'tem_numero'].filter(function(k){ return f[k]; }).map(function(k){ return (f[k] || 0).toLocaleString('pt-BR') + ' ' + SIT[k]; }).join(' · ');
    var h = '<div class="bp-robo ' + sit + '"><span class="bp-bola"></span><div><b>' + esc(txt) + '</b>'
      + '<div class="bp-sub">Cartões: ' + esc(fila || 'nenhum na fila') + (r.com_aviso ? ' · ' + r.com_aviso + ' com nome muito comum (busca só nos TRFs)' : '')
      + ' · Últimas 24 h: ' + (r.pedidos_24h || 0) + ' consulta(s), ' + (r.erros_24h || 0) + ' com erro · Última resposta: ' + dataHora(r.ultima_resposta) + '</div>';
    if(r.ultimo_erro && r.ultimo_erro.erro) h += '<div class="bp-sub">Último erro (' + dataHora(r.ultimo_erro.quando) + '): ' + esc(r.ultimo_erro.erro) + '</div>';
    if(erros.length) h += '<details class="bp-erros"><summary class="bp-sub" style="cursor:pointer">Ver os cartões com erro (' + erros.length + ')</summary>' + erros.map(function(e){
      return '<div class="bp-erro ' + (e.nivel === 'vermelho' ? 'vermelho' : '') + '"><b>' + esc(e.codigo || '') + '</b> ' + esc(e.cliente || '') + ': ' + esc(e.erro || '')
        + ' <span class="bp-sub">(' + esc(e.erro_codigo || '') + '; ' + (e.tentativas || 0) + ' busca(s) com erro; última ' + dataHora(e.quando)
        + (e.nivel === 'vermelho' ? '; parado: peça a busca de novo pela ficha' : '; próxima ' + dataHora(e.proxima)) + ')</span></div>';
    }).join('') + '</details>';
    if(S.pode.admin){
      h += '<div class="bp-acoes">'
        + (r.ativo ? '<button class="bp-btn perigo" type="button" data-bp="robo" data-v=\'{"ativo":false}\'>Desligar o robô</button>'
                   : '<button class="bp-btn principal" type="button" data-bp="robo" data-v=\'{"ativo":true}\'>Ligar o robô</button>')
        + (r.ativo ? '<button class="bp-btn" type="button" data-bp="robo" data-v=\'{"buscar_agora":true}\' title="Busca fora do horário por 1 hora">Buscar agora (1 h)</button>' : '')
        + (r.pausa_ate ? '<button class="bp-btn" type="button" data-bp="robo" data-v=\'{"tirar_pausa":true}\'>Tirar a pausa</button>' : '')
        + '<button class="bp-btn" type="button" data-bp="robo" data-v=\'{"carregar_fila":true}\' title="Põe na fila os cartões da Captação sem número que ainda não estão nela (também roda toda noite)">Pôr os cartões novos na fila</button>'
        + '</div><div class="bp-sub">Horário: das ' + r.hora_ini + 'h às ' + r.hora_fim + 'h · até ' + r.por_vez + ' consultas ao mesmo tempo · ' + r.paginas_max + ' página(s) de 100 por busca no DJEN.</div>';
    }
    return h + '</div></div>';
  }

  function desenhar(){
    var c = $('bpCorpo'), d = S.dados || {}, k = d.contagem || {};
    var h = '<div class="bp-abas"><button class="bp-btn' + (S.aba === 'conferir' ? ' active' : '') + '" type="button" data-bp="aba" data-v="conferir">Conferir achados<b>' + (k.pendentes || 0) + '</b></button>'
      + '<button class="bp-btn' + (S.aba === 'comparar' ? ' active' : '') + '" type="button" data-bp="aba" data-v="comparar">Comparar com o Escavador</button></div>';
    h += htmlRobo(d);
    if(S.aba === 'comparar'){ c.innerHTML = h + htmlComparar(d); return; }
    h += '<div class="bp-filtros">' + [['pendentes', 'Para conferir', k.pendentes], ['seguro', 'Seguros', k.seguro], ['conferir', 'A conferir', k.conferir], ['decididos', 'Já conferidos', k.decididos]].concat(k.individuais ? [['individuais', 'Nome comum: individuais', k.individuais]] : []).map(function(f){
      return '<button class="bp-btn' + (S.filtro === f[0] ? ' active' : '') + '" type="button" data-bp="filtro" data-v="' + f[0] + '">' + f[1] + '<b>' + (f[2] || 0) + '</b></button>';
    }).join('') + '</div>';
    h += '<div class="bp-busca"><input id="bpBuscaTxt" type="search" placeholder="Buscar por nome, código VMM ou número" value="' + esc(S.busca) + '" aria-label="Buscar"><button class="bp-btn" type="button" data-bp="buscar">Buscar</button></div>';
    var lista = (d.achados || []), mais = !S.temTotal && lista.length > (d.por_pagina || 30);
    if(mais) lista = lista.slice(0, d.por_pagina || 30);
    h += '<div class="bp-lista">' + (lista.map(htmlAchado).join('') || '<div class="bp-vazio">' + (S.filtro === 'decididos' ? 'Nenhum achado conferido ainda.' : 'Nenhum achado esperando conferência.') + '</div>') + '</div>';
    if(S.temTotal) h += pag().html();
    else if(S.pagina > 1 || mais) h += '<div class="bp-pag"><button class="bp-btn" type="button" data-bp="pag" data-v="-1"' + (S.pagina > 1 ? '' : ' disabled') + '>‹ Anteriores</button><span>Página ' + S.pagina + '</span><button class="bp-btn" type="button" data-bp="pag" data-v="1"' + (mais ? '' : ' disabled') + '>Próximos ›</button></div>';
    c.innerHTML = h;
    if(S.temTotal) pag().ligar(c);
  }
  var PAG = null;
  function pag(){ if(!PAG) PAG = SagaPaginacao.criar({ tela: 'processos-achados', rotulo: 'achados', aoMudar: function(P){ S.pagina = P.pagina; carregar(); } }); return PAG; }

  function htmlAchado(a){
    var pend = a.decisao === 'pendente';
    var selo = pend ? '<span class="bp-selo ' + a.nivel + '">' + (a.nivel === 'seguro' ? 'Seguro' : 'A conferir') + '</span>'
      : '<span class="bp-selo decidido">' + ({ e_este: 'É este', nao_e: 'Não é', outro_escolhido: 'Outro foi escolhido' }[a.decisao] || a.decisao) + (a.decidido_em ? ' · ' + dataHora(a.decidido_em) : '') + '</span>';
    var info = [a.tribunal, a.orgao, a.classe, a.requisitorio, a.qtd_partes ? a.qtd_partes + ' autor(es)' : '', a.data_pub ? 'publicado em ' + dataBR(a.data_pub) : '',
      (a.fontes || [a.fonte]).map(function(f){ return FONTE[f] || f; }).join(' + '), a.publicacoes > 1 ? a.publicacoes + ' publicações' : ''].filter(Boolean).map(esc).join(' · ');
    var link = urlOk(a.link);
    var h = '<div class="bp-card ' + (pend ? a.nivel : '') + '" data-achado="' + esc(a.id) + '"><div class="bp-topo">' + selo
      + (NA_FICHA ? '' : '<span class="bp-cod">' + esc(a.codigo || '') + '</span><a class="bp-nome" href="' + esc(fichaUrl(a)) + '">' + esc(a.cliente || 'Cliente') + '</a>')
      + '<span class="bp-num">' + esc(a.numero) + '</span>' + trib(a.numero) + '</div>'
      + '<div class="bp-info">' + info + '</div>'
      + (a.motivo ? '<div class="bp-info">Por quê: ' + esc(a.motivo) + '</div>' : '')
      + (a.trecho ? '<div class="bp-trecho">' + esc(a.trecho) + '</div>' : '')
      + (link ? '<div class="bp-info"><a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Ver a publicação ↗</a></div>' : '');
    if(a.ja_no_saga) h += '<div class="bp-alerta">Este número já está no cartão ' + esc(a.ja_no_saga_codigo || '') + ' do SAGA.</div>';
    if(pend && a.individual_nome_comum) h += '<div class="bp-alerta">Nome muito comum e ação individual (1 autor): na maioria das vezes é outra pessoa com o mesmo nome. Confira com cuidado.</div>';
    if(pend && a.numero_atual) h += '<div class="bp-alerta">O cartão já tem o número ' + esc(a.numero_atual) + ': "É este" não troca número; confira na ficha.</div>';
    if(a.decisao === 'nao_e' && a.motivo_nao) h += '<div class="bp-info">Motivo: ' + esc(a.motivo_nao) + '</div>';
    if(S.pode.editar){
      if(pend){
        h += '<div class="bp-dec"><button class="bp-btn principal" type="button" data-bp="e_este"' + (a.numero_atual ? ' disabled' : '') + ' title="Grava este número no cartão (com registro)">É este</button>'
          + '<button class="bp-btn" type="button" data-bp="nao_abrir">Não é</button></div>'
          + '<div class="bp-nao"><input type="text" maxlength="300" placeholder="Motivo (obrigatório)" aria-label="Motivo">'
          + ['Homônimo', 'Outro CPF', 'Outra tese', 'Processo de outra pessoa da família'].map(function(m){ return '<button class="bp-btn" type="button" data-bp="nao_motivo" data-v="' + esc(m) + '">' + esc(m) + '</button>'; }).join('')
          + '<button class="bp-btn principal" type="button" data-bp="nao_ok">Confirmar "Não é"</button></div>';
      } else if(a.decisao === 'nao_e'){
        h += '<div class="bp-dec"><button class="bp-btn" type="button" data-bp="voltar">Voltar a conferir</button></div>';
      }
    }
    return h + '</div>';
  }

  async function decidir(id, decisao, motivo, card){
    if(S.ocupado || !id) return;
    if(decisao === 'nao_e' && String(motivo || '').trim().length < 3){ toast('Escreva o motivo do "Não é" (ex.: homônimo, outro CPF).', 'warning'); return; }
    S.ocupado = true;
    card && card.querySelectorAll('button').forEach(function(b){ b.disabled = true; });
    var p = Promise.resolve(sb().rpc('busca_proc_decidir', { p_achado: id, p_decisao: decisao, p_motivo: motivo || null })).then(function(r){ if(r.error) throw r.error; return r.data; });
    try{
      if(decisao !== 'voltar' && window.sagaRiscar && card) await window.sagaRiscar(card, { esperar: p });
      var d = await p;
      toast(decisao === 'e_este' ? 'Número ' + (d && d.numero || '') + ' gravado no cartão.' : decisao === 'nao_e' ? 'Marcado como "Não é".' : 'Voltou para conferir.', 'success');
    }catch(e){
      toast('Não gravou: ' + erroTxt(e), 'error');
    }
    S.ocupado = false;
    if($('bpJanela') && $('bpJanela').classList.contains('aberto')) carregar(); else desenharFicha();
    contar();
  }

  async function robo(op, b){
    if(S.ocupado) return;
    S.ocupado = true; if(b) b.disabled = true;
    try{
      var r = await sb().rpc('busca_proc_config_salvar', { p: op });
      if(r.error) throw r.error;
      toast(op.carregar_fila ? (r.data && r.data.na_fila_novos || 0) + ' cartão(ões) novo(s) na fila.' : 'Robô atualizado.', 'success');
    }catch(e){ toast('Não mudou o robô: ' + erroTxt(e), 'error'); }
    S.ocupado = false; carregar();
  }

  /* ---------------- comparação com o Escavador (1º mês) ---------------- */
  function htmlComparar(d){
    var c = d.comparacao || {}, r = c.resumo || {}, l = c.lista || [];
    var comEsc = (r.igual || 0) + (r.so_escavador || 0) + (r.diferente || 0);
    var pct = comEsc ? Math.round(100 * (r.igual || 0) / comEsc) : null;
    var h = '<div class="bp-sub" style="margin-bottom:8px">Quadro do 1º mês: para cada cartão passado no Escavador, cole o que ele mostrou. O Escavador só é cancelado depois de 1 mês comparando os dois (decisão do Dr. Victor).</div>'
      + '<div class="bp-comp"><div><b>' + (r.total || 0) + '</b>cartões comparados</div><div><b>' + (pct == null ? '—' : pct + '%') + '</b>o SAGA achou o mesmo que o Escavador</div>'
      + '<div><b>' + (r.so_escavador || 0) + '</b>só o Escavador achou</div><div><b>' + (r.so_saga || 0) + '</b>só o SAGA achou</div><div><b>' + (r.diferente || 0) + '</b>números diferentes</div><div><b>' + (r.nenhum || 0) + '</b>nenhum achou</div></div>';
    if(S.pode.editar){
      h += '<div class="bp-form"><label for="bpCmpCod">Código do cartão (ex.: VMM-03645-PSS)</label><input type="text" id="bpCmpCod" autocomplete="off">'
        + '<label for="bpCmpNum">Número(s) que o Escavador mostrou</label><textarea id="bpCmpNum" rows="2"></textarea>'
        + '<label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" id="bpCmpNada"> O Escavador não achou nada</label>'
        + '<label for="bpCmpObs">Observação (opcional)</label><input type="text" id="bpCmpObs" maxlength="500">'
        + '<div><button class="bp-btn principal" type="button" data-bp="comparar">Registrar a comparação</button></div></div>';
    }
    h += '<div class="bp-tabwrap"><table class="bp-tab"><thead><tr><th>Cartão</th><th>Escavador</th><th>SAGA</th><th>Resultado</th><th>Quando</th></tr></thead><tbody>'
      + (l.map(function(x){
        return '<tr><td><span class="bp-cod">' + esc(x.codigo || '') + '</span><br>' + esc(x.cliente || '') + '</td><td>' + (x.nada ? 'nada' : esc(x.escavador || '')) + '</td><td>' + esc((x.saga || []).join(', ') || 'nada')
          + '</td><td>' + esc({ igual: 'Igual', so_escavador: 'Só o Escavador', so_saga: 'Só o SAGA', diferente: 'Diferente', nenhum: 'Nenhum achou' }[x.resultado] || x.resultado) + (x.obs ? '<br><span class="bp-sub">' + esc(x.obs) + '</span>' : '') + '</td><td>' + dataHora(x.em) + '</td></tr>';
      }).join('') || '<tr><td colspan="5" class="bp-vazio">Nenhuma comparação registrada ainda.</td></tr>') + '</tbody></table></div>';
    return h;
  }
  async function comparar(b){
    if(S.ocupado) return;
    var cod = ($('bpCmpCod').value || '').trim().toUpperCase(), num = $('bpCmpNum').value, nada = $('bpCmpNada').checked, obs = $('bpCmpObs').value;
    if(!cod){ toast('Escreva o código do cartão.', 'warning'); return; }
    S.ocupado = true; b.disabled = true;
    try{
      var p = await sb().from('processos').select('id').eq('codigo', cod).eq('excluido_logico', false).limit(1);
      if(p.error) throw p.error;
      if(!p.data || !p.data.length) throw new Error('Não achei o cartão ' + cod + ' (confira o código)');
      var r = await sb().rpc('busca_proc_comparar', { p_processo: p.data[0].id, p_escavador: num, p_nada: nada, p_obs: obs || null });
      if(r.error) throw r.error;
      toast('Comparação registrada.', 'success');
    }catch(e){ toast('Não registrou: ' + erroTxt(e), 'error'); }
    S.ocupado = false; carregar();
  }

  /* ---------------- botão na Captação ---------------- */
  async function contar(){
    var b = $('bpBotao'); if(!b) return;
    try{
      var r = await sb().rpc('busca_proc_painel', { p: { so_contagem: true } });
      if(r.error) throw r.error;
      var n = (r.data && r.data.contagem && r.data.contagem.pendentes) || 0;
      b.querySelector('.bp-qtd').textContent = n.toLocaleString('pt-BR');
      b.hidden = false;
    }catch(e){
      if(e && (e.code === '42501' || e.code === 'PGRST202' || /42501|permiss/i.test(e.message || ''))){ b.hidden = true; return; } /* PGRST202: funções do banco ainda não aplicadas (blocos 437/438) */
      b.hidden = false; b.querySelector('.bp-qtd').textContent = '!'; b.title = 'Erro ao contar os achados: ' + erroTxt(e);
    }
  }
  function ligarLista(){
    if(typeof window.FASE_FIXA !== 'undefined' && window.FASE_FIXA !== 'captacao') return;
    if(!/fase=captacao/.test(location.search) && window.FASE_FIXA !== 'captacao') return;
    var ref = $('btnNovoProcesso'); if(!ref || $('bpBotao')) return;
    css();
    ref.insertAdjacentHTML('beforebegin', '<button class="btn-secondary" type="button" id="bpBotao" hidden title="Números de processo achados pelo robô no DJEN do CNJ e no Portal de Precatórios do TRF5, esperando a sua conferência">Processos achados<span class="bp-qtd">…</span></button>');
    $('bpBotao').addEventListener('click', abrir);
    contar();
    if(/[?&]busca_processos=1/.test(location.search)) abrir();
  }

  /* ---------------- quadro na ficha ---------------- */
  function processoAtual(){ try{ return typeof window.getActiveProcess === 'function' ? window.getActiveProcess() : null; }catch(e){ return null; } }
  var _tf = null, _nf = 0;
  function desenharFicha(){
    clearTimeout(_tf);
    _tf = setTimeout(async function(){
      var p = processoAtual(), alvo = document.querySelector('section[data-bloco="dados"]') || $('processRelatorios');
      var box = $('bpFicha');
      if(!p || !alvo){ if(box) box.hidden = true; return; }
      css();
      if(!box){ box = document.createElement('div'); box.id = 'bpFicha'; if(alvo.id === 'processRelatorios') alvo.parentNode.insertBefore(box, alvo); else alvo.appendChild(box); }
      var n = ++_nf;
      try{
        var r = await sb().rpc('busca_proc_painel', { p: { processo: p.id, filtro: 'todos' } });
        if(n !== _nf) return;
        if(r.error) throw r.error;
        var d = r.data || {}; S.pode = d.pode || S.pode;
        var lista = (d.achados || []), al = (d.alvos || [])[0], semNum = !String(p.numero_processo_cnj || '').trim();
        if(!lista.length && !al && !semNum){ box.hidden = true; box.innerHTML = ''; return; }
        box.hidden = false;
        var sit = al ? 'Busca: ' + (SIT[al.situacao] || al.situacao) + (al.ultima_busca_em ? ' em ' + dataHora(al.ultima_busca_em) : '') + (al.aviso ? ' · nome muito comum (busca só nos TRFs)' : '') : 'Ainda não buscado.';
        var h = '<div class="bp-ftit"><span>Processos achados nas fontes públicas</span><button class="bp-btn" type="button" id="bpPedir" title="Põe este cartão na frente da fila do robô">Buscar processos deste cliente</button></div>'
          + '<div class="bp-sub">' + esc(sit) + '</div>';
        if(al && al.erro) h += '<div class="bp-erro ' + (al.situacao === 'erro' ? 'vermelho' : '') + '">' + esc(al.erro) + ' (' + esc(al.erro_codigo || '') + '; '
          + (al.situacao === 'erro' ? 'parou depois de 3 buscas com erro: peça de novo' : 'o robô tenta de novo em ' + dataHora(al.proxima_em)) + ')</div>';
        h += '<div class="bp-lista" style="margin-top:8px">' + (lista.map(htmlAchado).join('') || (al && al.situacao === 'feito' ? '<div class="bp-vazio">Nada achado com o nome exato numa execução federal' + (al.descartados ? ' (' + al.descartados + ' publicação(ões) de homônimo descartada(s))' : '') + '.</div>' : '')) + '</div>';
        box.innerHTML = h;
        $('bpPedir').onclick = pedir;
        box.onclick = function(e){
          var b = e.target.closest('[data-bp]'); if(!b) return;
          var a = b.getAttribute('data-bp'), card = b.closest('[data-achado]'), id = card && card.getAttribute('data-achado');
          if(a === 'e_este') decidir(id, 'e_este', null, card);
          else if(a === 'nao_abrir'){ card.querySelector('.bp-nao').classList.add('aberto'); card.querySelector('.bp-nao input').focus(); }
          else if(a === 'nao_motivo'){ card.querySelector('.bp-nao input').value = b.getAttribute('data-v'); }
          else if(a === 'nao_ok') decidir(id, 'nao_e', card.querySelector('.bp-nao input').value, card);
          else if(a === 'voltar') decidir(id, 'voltar', null, card);
        };
      }catch(e){
        if(e && (e.code === '42501' || e.code === 'PGRST202')){ box.hidden = true; return; }
        box.hidden = false; box.innerHTML = '<div class="bp-msg">Não consegui ler os processos achados: ' + esc(erroTxt(e)) + '</div>';
      }
    }, 120);
  }
  async function pedir(){
    var p = processoAtual(); if(!p || S.ocupado) return;
    S.ocupado = true;
    try{
      var r = await sb().rpc('busca_proc_pedir', { p_processo: p.id });
      if(r.error) throw r.error;
      toast((r.data && r.data.aviso) || 'Pedido na fila.', r.data && r.data.robo_ligado === false ? 'warning' : 'success');
    }catch(e){ toast('Não pediu a busca: ' + erroTxt(e), 'error'); }
    S.ocupado = false; desenharFicha();
  }
  function ligarFicha(){
    if(typeof window.renderRelatorios === 'function' && !window.renderRelatorios._buscaProc){
      var orig = window.renderRelatorios;
      window.renderRelatorios = function(){ var r = orig.apply(this, arguments); try{ desenharFicha(); }catch(e){} return r; };
      window.renderRelatorios._buscaProc = true;
    }
    desenharFicha();
  }

  function iniciar(){ if(!sb()) return; if(NA_FICHA) ligarFicha(); else ligarLista(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.SagaBuscaProcessos = { abrir: abrir, contar: contar, desenharFicha: desenharFicha };
})();
