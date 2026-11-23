/* SAGA · Ler extrato dos honorários (22/11/2026, Dr. Victor; bloco 390)
   "Quando eu saco os meus honorários, bato foto do extrato, mando no sistema e ele faz o filtro."
   O CLIENTE saca o próprio precatório/RPV; o escritório recebe só os HONORÁRIOS.
   Fluxo: foto, print ou PDF (um ou vários) → leitura NESTE computador (SagaLeitorDocs: pdf.js + Tesseract do site; a
   imagem não vai para site nenhum) → cada pagamento achado (data, bruto, IR, outros descontos, líquido, número do
   processo, beneficiário/parte, origem e banco, com a página e o trecho de onde veio) → o SAGA acha o processo
   (extrato_honorarios_achar: número CNJ, recurso, parte do número/RPV, código VMM, nome do cliente ou da parte) →
   CONFERÊNCIA lado a lado (lido × processo × esperado/recebido, diferença em destaque) → só ao confirmar:
   extrato em "Documentos probatórios > Extratos dos honorários" do cliente, extrato_honorarios_lancar (recebido, data, IR; anotação na ficha;
   registro; a distribuição se refaz pelos gatilhos). Sem processo: lista "Sem processo", à vista, para ligar à mão.
   Carregado por 1 linha no fim do financeiro.html. Só para quem tem "Financeiro: editar". */
(function(){
  'use strict';
  var BUCKET = 'documentos-clientes', FICHA = 'ficha_cliente_padrao_metalico_FINAL.html';
  var VER = (function(){ var s = document.currentScript && document.currentScript.src || ''; var m = /[?&]v=([^&]+)/.exec(s); return m ? m[1] : ''; })();
  var S = { arquivos: [], pagamentos: [], atual: -1, eu: null, admin: false, lista: [] };

  function sb(){ return window._sb; }
  function esc(t){ return window.sagaEsc ? window.sagaEsc(t) : String(t == null ? '' : t).replace(/[&<>"'`]/g, function(c){ return '&#' + c.charCodeAt(0) + ';'; }); }
  function erroTxt(e){ return window.sagaErroBanco ? window.sagaErroBanco(e) : ((e && e.message) || String(e)); }
  function $(id){ return document.getElementById(id); }
  function toast(m, t){ if(window.showToast) window.showToast(esc(m), t || ''); }
  function moeda(v){ return v == null || v === '' || isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function num(s){ if(s == null) return null; var t = String(s).replace(/[^\d,.-]/g, ''); if(!t) return null; t = t.replace(/\./g, '').replace(',', '.'); var n = parseFloat(t); return isNaN(n) ? null : Math.round(n * 100) / 100; }
  function dataBR(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function isoDeBR(br){ var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br || ''); if(!m) return null; var d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? m[3] + '-' + m[2] + '-' + m[1] : null; }
  function semCpf(t){ return String(t || '').replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g, '[CPF]'); }
  function semAcento(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* ===================== LEITURA DO TEXTO DO EXTRATO ===================== */
  var RX_DIN = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2})(?!\d)/g;
  var RX_CNJ = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g;
  var RX_DATA = /\b(\d{2})[\/.](\d{2})[\/.](\d{4})\b/g;
  var ROT = {
    valor_bruto: /valor\s+(bruto|original|total|do\s+levantamento|levantado|sacado|requisitado|do\s+alvar[aá]|da\s+rpv|do\s+saque|do\s+resgate|da\s+requisi[cç][aã]o)|total\s+bruto|\bbruto\b/i,
    ir_retido: /\bIRRF\b|\bI\.?\s?R\.?\b|imposto\s+(de\s+)?renda|imposto\s+retido|reten[cç][aã]o\s+(na\s+fonte|do\s+ir)/,
    outros_descontos: /\bPSS\b|\bINSS\b|contribui[cç][aã]o\s+previd|tarifa|\bdesconto/i,
    valor_liquido: /l[ií]quido|valor\s+(creditado|pago|transferido|depositado|a\s+receber|do\s+cr[eé]dito)|cr[eé]dito\s+em\s+conta/i,
    data_pagamento: /data\s+(do\s+|da\s+|de\s+)?(pagamento|cr[eé]dito|levantamento|saque|transfer[eê]ncia|efetiva[cç][aã]o|opera[cç][aã]o|movimento|resgate)|pago\s+em|creditado\s+em|efetivad[oa]\s+em/i
  };
  var RX_IR_CI = /imposto|irrf|reten[cç]/i;
  var BANCOS = [['Banco do Brasil', /banco\s+do\s+brasil|\bB\.?B\.?\s+S\.?A/i], ['Caixa', /caixa\s+econ[oô]mica|\bCEF\b|\bcaixa\b/i], ['Bradesco', /bradesco/i], ['Itaú', /ita[uú]/i],
    ['Santander', /santander/i], ['Sicoob', /sicoob/i], ['Sicredi', /sicredi/i], ['Nubank', /nubank|nu\s+pagamentos/i], ['Inter', /banco\s+inter\b/i], ['BRB', /\bBRB\b/]];
  var ESCRITORIO = /victor|morais|advocacia|advogad|sarmento|camargo|ancref|vmm/i;

  function linhasDe(paginas){
    var out = [];
    (paginas || []).forEach(function(p){ String(p.texto || '').split(/\r?\n/).forEach(function(l){ l = l.replace(/\s+/g, ' ').trim(); if(l) out.push({ t: l, pg: p.n, img: !!p.imagem }); }); });
    return out;
  }
  function origemDe(L, i, j){ var tr = L.slice(i, (j == null ? i : j) + 1).map(function(x){ return x.t; }).join(' · '); return { pagina: L[i].pg, imagem: L[i].img, trecho: semCpf(tr).slice(0, 240) }; }
  function dinheiroNaLinha(s){ RX_DIN.lastIndex = 0; var m = RX_DIN.exec(s); return m ? num(m[1]) : null; }
  function acharValor(L, rot, filtro){
    for(var i = 0; i < L.length; i++){
      var m = rot.exec(L[i].t); if(!m) continue;
      if(filtro && !filtro(L[i].t)) continue;
      var depois = L[i].t.slice(m.index + m[0].length), v = dinheiroNaLinha(depois);
      if(v != null) return { valor: v, o: origemDe(L, i) };
      if(i + 1 < L.length && !Object.keys(ROT).some(function(k){ return ROT[k].test(L[i + 1].t); })){ v = dinheiroNaLinha(L[i + 1].t); if(v != null) return { valor: v, o: origemDe(L, i, i + 1) }; }
    }
    return null;
  }
  function acharData(L){
    for(var i = 0; i < L.length; i++){
      if(!ROT.data_pagamento.test(L[i].t)) continue;
      var alvo = L[i].t + ' ' + (L[i + 1] ? L[i + 1].t : ''); RX_DATA.lastIndex = 0; var m = RX_DATA.exec(alvo);
      if(m){ var iso = isoDeBR(m[1] + '/' + m[2] + '/' + m[3]); if(iso) return { valor: iso, o: origemDe(L, i, RX_DATA.lastIndex > L[i].t.length ? i + 1 : i) }; }
    }
    // sem rótulo: a data mais recente do texto (não é data de nascimento: ano >= 2015)
    var melhor = null;
    L.forEach(function(x, i){ RX_DATA.lastIndex = 0; var m; while((m = RX_DATA.exec(x.t))){ var iso = isoDeBR(m[1] + '/' + m[2] + '/' + m[3]); if(iso && +m[3] >= 2015 && (!melhor || iso > melhor.valor)) melhor = { valor: iso, o: origemDe(L, i), semRotulo: true }; } });
    return melhor;
  }
  /* 23/11 (extrato real do Dr. Victor: "Comprovante de Resgate Precatório Federal" do Banco do Brasil): o número do processo vem no campo
     "Processo" com 20 dígitos SEM pontos (às vezes com um espaço antes do último); o do precatório e o do alvará vêm em campos próprios */
  var RX_NAO_PROC = /precat|alvar|protocolo|autentica|ag[eê]ncia|conta|cpf|cnpj/i;
  /* dígito verificador do CNJ (Res. 65/2008): NNNNNNN DD AAAA J TR OOOO → (N A J TR O DD) mod 97 = 1 */
  function cnjValido(d){ if(!/^\d{20}$/.test(d) || typeof BigInt === 'undefined') return false; try{ return BigInt(d.slice(0, 7) + d.slice(9) + d.slice(7, 9)) % 97n === 1n; }catch(e){ return false; } }
  /* a foto às vezes perde um dígito (no comprovante do BB o último vem separado por espaço): completa só se UMA opção fechar a conta */
  function cnjCompletar(d){
    if(d.length === 20) return { d: d, ok: cnjValido(d) };
    if(d.length !== 19) return null;
    var boas = [];
    for(var k = 0; k <= 19; k++) for(var x = 0; x <= 9; x++){ var t = d.slice(0, k) + x + d.slice(k); if(cnjValido(t) && boas.indexOf(t) < 0) boas.push(t); }
    var fim = boas.filter(function(t){ return t.slice(0, 19) === d; });
    if(fim.length === 1) return { d: fim[0], ok: true, completado: true };
    return boas.length === 1 ? { d: boas[0], ok: true, completado: true } : null;
  }
  function cnjFmt(d){ return d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d.charAt(13) + '.' + d.slice(14, 16) + '.' + d.slice(16, 20); }
  function acharNumero(L){
    for(var j = 0; j < L.length; j++){
      var mp = /^(?:n[uú]mero\s+do\s+)?processo\b\s*(?:n[ºo°.]*)?\s*[:\-]?\s*(.*)$/i.exec(L[j].t);
      if(!mp) continue;
      var dg = mp[1].replace(/[^\d]/g, '');
      var cc = cnjCompletar(dg.length > 20 ? dg.slice(0, 20) : dg);
      if(cc){ var oo = origemDe(L, j); if(cc.completado) oo.aviso = 'faltava um dígito na leitura: completei pela conferência do número CNJ'; else if(!cc.ok) oo.aviso = 'o dígito verificador deste número não confere: confira'; return { valor: cnjFmt(cc.d), o: oo }; }
      if(dg.length >= 7) return { valor: mp[1].replace(/[^\d.\-\/]/g, ''), o: origemDe(L, j) };
    }
    for(var i = 0; i < L.length; i++){ if(RX_NAO_PROC.test(L[i].t)) continue; RX_CNJ.lastIndex = 0; var m = RX_CNJ.exec(L[i].t); if(m) return { valor: m[0], o: origemDe(L, i) }; }
    var rx = /(processo|autos|rpv|precat[oó]rio|requisi[cç][aã]o|alvar[aá]|conta\s+judicial)\s*(n[ºo°.]*\s*)?[:\-]?\s*([\d][\d.\-\/]{5,30}\d)/i;
    for(i = 0; i < L.length; i++){ var k = rx.exec(L[i].t); if(k) return { valor: k[3], o: origemDe(L, i) }; }
    return null;
  }
  function acharPrecatorio(L){
    for(var i = 0; i < L.length; i++){ var m = /precat[oó]rio\s*(?:n[ºo°.]*)?\s*[:\-]?\s*([\d][\d .\-\/]{9,40}\d)/i.exec(L[i].t); if(m){ var d = m[1].replace(/\D/g, ''); if(d.length >= 10) return { valor: d, o: origemDe(L, i) }; } }
    return null;
  }
  /* "Contr.Prev.Oficial" do comprovante do BB é o PSS do SERVIDOR (cliente/herdeiro), não desconto dos honorários: só informação */
  function acharContrPrev(L){
    for(var i = 0; i < L.length; i++){ if(!/contr\.?\s*prev|contribui[cç][aã]o\s+previd[eê]nci[aá]ria\s+oficial/i.test(L[i].t)) continue; var v = dinheiroNaLinha(L[i].t); if(v != null) return { valor: v, o: origemDe(L, i) }; }
    return null;
  }
  function acharNome(L){
    var rxParte = /(autor[a]?|requerente|exequente|parte|titular|credor[a]?|cliente|benefici[aá]ri[oa]|favorecid[oa])\s*(\(a\))?\s*[:\-]\s*([A-Za-zÀ-ÿ' ]{6,90})/i, alt = null;
    for(var i = 0; i < L.length; i++){
      var m = rxParte.exec(L[i].t); if(!m) continue;
      var nome = m[3].replace(/\s+(cpf|cnpj|oab|valor|data|banco|ag[eê]ncia|conta)\b.*$/i, '').trim();
      if(nome.split(' ').length < 2) continue;
      if(ESCRITORIO.test(nome)){ continue; }
      if(/benefici|favorecid/i.test(m[1])){ if(!alt) alt = { valor: nome, o: origemDe(L, i) }; continue; }
      return { valor: nome, o: origemDe(L, i) };
    }
    return alt;
  }
  function acharOrigem(texto){
    if(/resgate\s+(de\s+)?precat|precat[oó]rio\s+federal/i.test(texto)) return 'precatorio';
    if(/resgate\s+(de\s+)?rpv|\bRPV\b\s+federal/i.test(texto)) return 'rpv';
    if(/alvar[aá]/i.test(texto)) return 'alvara';
    if(/\bRPV\b|requisi[cç][aã]o\s+de\s+pequeno/i.test(texto)) return 'rpv';
    if(/precat[oó]rio/i.test(texto)) return 'precatorio';
    return '';
  }
  function acharBanco(texto){ for(var i = 0; i < BANCOS.length; i++) if(BANCOS[i][1].test(texto)) return BANCOS[i][0]; return ''; }

  /* um pagamento a partir de um pedaço do texto */
  function lerBloco(L){
    var texto = L.map(function(x){ return x.t; }).join('\n'), c = {}, avisos = [];
    function pos(k, r){ if(r){ c[k] = r.valor; c._o = c._o || {}; c._o[k] = r.o; } }
    pos('valor_bruto', acharValor(L, ROT.valor_bruto, function(t){ return !ROT.valor_liquido.test(t); }));
    pos('ir_retido', acharValor(L, ROT.ir_retido) || acharValor(L, RX_IR_CI, function(t){ return /imposto|irrf/i.test(t); }));
    pos('outros_descontos', acharValor(L, ROT.outros_descontos, function(t){ return !ROT.ir_retido.test(t) && !RX_IR_CI.test(t) && !/contr\.?\s*prev|oficial|dedu[cç]/i.test(t); }));
    pos('valor_liquido', acharValor(L, ROT.valor_liquido));
    var dt = acharData(L); pos('data_pagamento', dt); if(dt && dt.semRotulo) avisos.push('A data do pagamento não tinha rótulo: usei a data mais recente do extrato. Confira.');
    pos('numero_lido', acharNumero(L));
    pos('beneficiario_lido', acharNome(L));
    pos('numero_precatorio', acharPrecatorio(L));
    pos('contr_prev_cliente', acharContrPrev(L));
    c.origem = acharOrigem(texto); c.banco = acharBanco(texto);
    if(c.valor_bruto == null && c.valor_liquido != null) { c.valor_bruto = Math.round((c.valor_liquido + (c.ir_retido || 0) + (c.outros_descontos || 0)) * 100) / 100; avisos.push('O extrato não mostra o valor bruto: calculei líquido + IR + descontos. Confira.'); }
    if(c.valor_bruto != null && c.valor_liquido != null){
      var dif = Math.round((c.valor_bruto - (c.ir_retido || 0) - (c.outros_descontos || 0) - c.valor_liquido) * 100) / 100;
      if(Math.abs(dif) >= 0.05) avisos.push('As contas não fecham: bruto − IR − descontos dá ' + moeda(c.valor_bruto - (c.ir_retido || 0) - (c.outros_descontos || 0)) + ', mas o líquido lido é ' + moeda(c.valor_liquido) + ' (diferença ' + moeda(dif) + '). Confira os números.');
    }
    if(c.valor_bruto == null && c.valor_liquido == null) avisos.push('Não achei o valor recebido neste trecho: digite à mão.');
    c._avisos = avisos;
    return c;
  }
  /* extrato com vários pagamentos: separa pelo número de cada processo */
  function lerTexto(paginas){
    var L = linhasDe(paginas), idx = [], vistos = {};
    L.forEach(function(x, i){ if(RX_NAO_PROC.test(x.t)) return; RX_CNJ.lastIndex = 0; var m; while((m = RX_CNJ.exec(x.t))){ var d = m[0].replace(/\D/g, ''); if(!vistos[d]){ vistos[d] = 1; idx.push(i); } } });
    if(idx.length <= 1) return [lerBloco(L)];
    /* cada pagamento vai do número do processo até o próximo; o que vem antes do 1º (cabeçalho: data, banco) vale para todos */
    var out = [], cab = lerBloco(L.slice(0, idx[0])), todo = L.map(function(x){ return x.t; }).join('\n');
    idx.forEach(function(ini, k){
      var c = lerBloco(L.slice(ini, k + 1 < idx.length ? idx[k + 1] : L.length));
      if(!c.data_pagamento && cab.data_pagamento){ c.data_pagamento = cab.data_pagamento; c._o = c._o || {}; c._o.data_pagamento = cab._o.data_pagamento; c._avisos = c._avisos.filter(function(a){ return !/data do pagamento/.test(a); }); }
      if(!c.banco) c.banco = acharBanco(todo); if(!c.origem) c.origem = acharOrigem(todo);
      out.push(c);
    });
    return out.filter(function(c){ return c.valor_bruto != null || c.valor_liquido != null; });
  }

  /* ===================== TELA ===================== */
  function css(){
    if($('xhCss')) return;
    var s = document.createElement('style'); s.id = 'xhCss';
    s.textContent = '#xhJanela .modal{max-width:1180px}#xhLista .modal{max-width:980px}'
      + '.xh-zona{border:1.5px dashed var(--border);border-radius:14px;padding:22px;text-align:center;font-size:13px;color:var(--muted);cursor:pointer}.xh-zona.arrastando{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 8%,transparent)}'
      + '.xh-zona b{color:var(--text)}.xh-arqs{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.xh-arq{font-size:11px;padding:4px 9px;border-radius:9px;border:1px solid var(--border-soft);display:inline-flex;gap:6px;align-items:center}.xh-arq button{color:var(--muted)}'
      + '.xh-prog{font-size:12px;color:var(--muted);margin-top:10px}.xh-erro{font-size:12px;color:var(--danger,#e5484d);margin-top:8px;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--danger,#e5484d) 40%,transparent)}'
      + '.xh-pags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.xh-pag{font-size:11px;padding:6px 10px;border-radius:10px;border:1px solid var(--border-soft);text-align:left}.xh-pag.active{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 12%,transparent)}.xh-pag small{display:block;color:var(--muted)}'
      + '.xh-pag.feito{opacity:.6;text-decoration:line-through}'
      + '.xh-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(0,.95fr);gap:14px}@media(max-width:980px){.xh-grid{grid-template-columns:minmax(0,1fr)}}'
      + '.xh-col{border:1px solid var(--border-soft);border-radius:14px;padding:13px;min-width:0}.xh-col h3{font-family:"Cormorant Garamond",serif;font-size:18px;font-weight:600;margin-bottom:8px}'
      + '.xh-campo{margin-bottom:9px}.xh-campo label{display:block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}.xh-campo input,.xh-campo select{width:100%;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--panel);padding:0 10px;font-size:13px}'
      + '.xh-de{font-size:10.5px;color:var(--muted);margin-top:3px;line-height:1.35;word-break:break-word}.xh-de.img{color:var(--warning,#d39b2a)}'
      + '.xh-aviso{font-size:12px;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--warning,#d39b2a) 45%,transparent);background:color-mix(in srgb,var(--warning,#d39b2a) 9%,transparent);margin-bottom:8px}'
      + '.xh-cand{display:block;border:1px solid var(--border-soft);border-radius:11px;padding:8px 10px;margin-bottom:6px;font-size:12px;cursor:pointer}.xh-cand.active{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 10%,transparent)}.xh-cand small{display:block;color:var(--muted)}.xh-cand input{margin-right:6px}'
      + '.xh-busca{display:flex;gap:6px;margin-top:8px}.xh-busca input{flex:1;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--panel);padding:0 10px;font-size:13px}'
      + '.xh-conta{display:grid;grid-template-columns:1fr auto;gap:5px 10px;font-size:13px}.xh-conta span{color:var(--muted)}.xh-conta b{text-align:right;font-variant-numeric:lining-nums tabular-nums}'
      + '.xh-dif{margin-top:10px;padding:12px;border-radius:12px;text-align:center;font-size:13px}.xh-dif b{display:block;font-size:22px;font-family:"Cormorant Garamond",serif}.xh-dif.mais{background:color-mix(in srgb,var(--success,#2f9e6b) 14%,transparent);border:1px solid color-mix(in srgb,var(--success,#2f9e6b) 45%,transparent)}'
      + '.xh-dif.menos{background:color-mix(in srgb,var(--danger,#e5484d) 12%,transparent);border:1px solid color-mix(in srgb,var(--danger,#e5484d) 45%,transparent)}.xh-dif.igual{border:1px solid var(--border-soft)}'
      + '.xh-modo{display:flex;flex-direction:column;gap:5px;font-size:12px;margin-top:10px}.xh-ok{font-size:12px;padding:10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--success,#2f9e6b) 45%,transparent);margin-top:8px}'
      + '.xh-tab{width:100%;border-collapse:collapse;font-size:12px}.xh-tab th{text-align:left;font-size:10px;text-transform:uppercase;color:var(--muted);padding:6px;border-bottom:1px solid var(--border-soft)}.xh-tab td{padding:7px 6px;border-bottom:1px solid var(--border-soft);vertical-align:top}.xh-tab td.num{text-align:right;white-space:nowrap}'
      + '.xh-qtd{font-size:10px;padding:1px 7px;border-radius:9px;background:color-mix(in srgb,var(--danger,#e5484d) 18%,transparent);margin-left:4px}';
    document.head.appendChild(s);
  }
  function janela(id, titulo, sub, corpo, pe){
    var j = $(id); if(j) j.remove();
    j = document.createElement('div'); j.className = 'modal-overlay'; j.id = id; j.setAttribute('role', 'dialog'); j.setAttribute('aria-modal', 'true');
    j.innerHTML = '<div class="modal"><div class="modal-head"><div><h2>' + esc(titulo) + '</h2><p>' + esc(sub) + '</p></div><button class="modal-close" type="button" data-xh-fechar aria-label="Fechar">✕</button></div>'
      + '<div class="modal-body">' + corpo + '</div>' + (pe ? '<div class="modal-foot">' + pe + '</div>' : '') + '</div>';
    document.body.appendChild(j);
    j.addEventListener('click', function(e){ if(e.target === j || e.target.closest('[data-xh-fechar]')) fechar(id); });
    requestAnimationFrame(function(){ j.classList.add('open'); });
    return j;
  }
  function fechar(id){ var j = $(id); if(j) j.classList.remove('open'); if(id === 'xhJanela'){ S.arquivos = []; S.pagamentos = []; } }
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ if($('xhJanela') && $('xhJanela').classList.contains('open')) fechar('xhJanela'); else if($('xhLista') && $('xhLista').classList.contains('open')) fechar('xhLista'); } });

  /* ---- passo 1: escolher e ler ---- */
  function abrir(){
    css(); S.arquivos = []; S.pagamentos = []; S.atual = -1;
    janela('xhJanela', 'Ler extrato dos honorários', 'Foto, print ou PDF do extrato do saque. Tudo é lido NESTE computador: a imagem não vai para nenhum site. Nada é gravado sem a sua conferência.',
      '<div class="xh-zona" id="xhZona" tabindex="0"><b>Solte aqui o extrato</b> (um ou vários: foto, print ou PDF)<br>ou clique para escolher · também dá para colar o print com Ctrl+V<input type="file" id="xhArq" multiple hidden accept="application/pdf,.pdf,image/*"></div>'
      + '<div class="xh-arqs" id="xhArqs"></div><div id="xhProg" class="xh-prog"></div><div id="xhConf"></div>',
      '<button class="btn-secondary" type="button" data-xh-fechar>Fechar</button><button class="btn-primary" type="button" id="xhLer" disabled>Ler o extrato</button>');
    var z = $('xhZona'), inp = $('xhArq');
    z.onclick = function(e){ if(e.target === inp) return; inp.click(); };
    z.onkeydown = function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); inp.click(); } };
    inp.onchange = function(){ juntar(inp.files); inp.value = ''; };
    z.addEventListener('dragover', function(e){ e.preventDefault(); z.classList.add('arrastando'); });
    z.addEventListener('dragleave', function(){ z.classList.remove('arrastando'); });
    z.addEventListener('drop', function(e){ e.preventDefault(); z.classList.remove('arrastando'); juntar(e.dataTransfer && e.dataTransfer.files); });
    $('xhLer').onclick = lerTudo;
  }
  document.addEventListener('paste', function(e){
    var j = $('xhJanela'); if(!j || !j.classList.contains('open') || !$('xhZona')) return;
    var fs = []; Array.prototype.forEach.call((e.clipboardData && e.clipboardData.items) || [], function(it){ if(it.kind === 'file'){ var f = it.getAsFile(); if(f) fs.push(new File([f], 'print-' + (S.arquivos.length + fs.length + 1) + '.png', { type: f.type || 'image/png' })); } });
    if(fs.length){ e.preventDefault(); juntar(fs); }
  });
  function juntar(lista){
    Array.prototype.forEach.call(lista || [], function(f){
      if(!(/pdf/.test(f.type) || /\.pdf$/i.test(f.name) || /^image\//.test(f.type))){ toast('"' + f.name + '" não é PDF nem imagem: ficou de fora.', 'error'); return; }
      if(f.size > 25 * 1024 * 1024){ toast('"' + f.name + '" passa de 25 MB: ficou de fora.', 'error'); return; }
      if(S.arquivos.length >= 12){ toast('No máximo 12 arquivos por vez.', 'error'); return; }
      S.arquivos.push(f);
    });
    desenharArquivos();
  }
  function desenharArquivos(){
    var a = $('xhArqs'); if(!a) return;
    a.innerHTML = S.arquivos.map(function(f, i){ return '<span class="xh-arq">' + esc(f.name) + ' <button type="button" data-xh-tirar="' + i + '" aria-label="Tirar">✕</button></span>'; }).join('');
    a.querySelectorAll('[data-xh-tirar]').forEach(function(b){ b.onclick = function(){ S.arquivos.splice(+b.dataset.xhTirar, 1); desenharArquivos(); }; });
    if($('xhLer')) $('xhLer').disabled = !S.arquivos.length;
  }
  function carregarLeitor(){
    if(window.SagaLeitorDocs) return Promise.resolve(window.SagaLeitorDocs);
    return new Promise(function(ok, falha){
      var s = document.createElement('script'); s.src = 'saga_leitor_docs.js' + (VER ? '?v=' + VER : '');
      s.onload = function(){ window.SagaLeitorDocs ? ok(window.SagaLeitorDocs) : falha(new Error('o leitor de documentos não carregou')); };
      s.onerror = function(){ falha(new Error('não foi possível carregar o leitor de documentos (saga_leitor_docs.js)')); };
      document.head.appendChild(s);
    });
  }
  async function lerTudo(){
    var prog = $('xhProg'), btn = $('xhLer'); btn.disabled = true; S.pagamentos = [];
    var erros = [];
    try{
      var L = await carregarLeitor();
      for(var i = 0; i < S.arquivos.length; i++){
        var f = S.arquivos[i];
        try{
          var r = await L.lerArquivo(f, { progresso: function(m){ prog.textContent = 'Lendo "' + f.name + '" (' + (i + 1) + ' de ' + S.arquivos.length + '): ' + m; } });
          var achados = lerTexto(r.paginas);
          if(!achados.length || (achados.length === 1 && achados[0].valor_bruto == null && achados[0].valor_liquido == null && !achados[0].numero_lido)){
            erros.push('"' + f.name + '": não achei pagamento no texto lido' + (r.paginas_imagem ? ' (lido da imagem: tente uma foto mais nítida, reta e com boa luz)' : '') + '. Você pode digitar à mão.');
            achados = [lerBloco([])];
          }
          achados.forEach(function(c){ c.arquivo = f; c.arquivo_nome = f.name; c.imagem = r.paginas_imagem > 0; S.pagamentos.push(c); });
        }catch(e){ erros.push('"' + f.name + '": ' + erroTxt(e)); }
      }
    }catch(e){ erros.push(erroTxt(e)); }
    prog.innerHTML = erros.length ? '<div class="xh-erro">' + erros.map(esc).join('<br>') + '</div>' : '';
    if(!S.pagamentos.length){ btn.disabled = false; return; }
    $('xhZona').style.display = 'none'; $('xhArqs').style.display = 'none'; btn.style.display = 'none';
    prog.insertAdjacentHTML('beforeend', '<div class="xh-prog">' + S.pagamentos.length + ' pagamento(s) lido(s). Confira cada um: nada é gravado sem o seu "Confirmar".</div>');
    await Promise.all(S.pagamentos.map(acharCandidatos));
    mostrar(0);
  }
  async function acharCandidatos(c){
    c.candidatos = []; c.erroAchar = null;
    try{
      var r = await sb().rpc('extrato_honorarios_achar', { p_numero: c.numero_lido || null, p_nome: c.beneficiario_lido || null, p_codigo: c.codigo || null });
      if(r.error) throw r.error;
      c.candidatos = Array.isArray(r.data) ? r.data : [];
      if(!c.candidatos.length && c.numero_precatorio){
        var r2 = await sb().rpc('extrato_honorarios_achar', { p_numero: c.numero_precatorio, p_nome: null, p_codigo: null });
        if(r2.error) throw r2.error;
        c.candidatos = Array.isArray(r2.data) ? r2.data : [];
      }
      if(c.candidatos.length && (c.candidatos[0].pontos >= 90 || c.candidatos.length === 1)) c.escolhido = c.candidatos[0].processo_id;
    }catch(e){ c.erroAchar = erroTxt(e); }
  }

  /* ---- passo 2: conferência lado a lado ---- */
  var CAMPOS = [['data_pagamento', 'Data do pagamento', 'data'], ['valor_bruto', 'Valor bruto recebido', 'reais'], ['ir_retido', 'IR retido', 'reais'], ['outros_descontos', 'Outros descontos (PSS, tarifa...)', 'reais'],
    ['valor_liquido', 'Valor líquido', 'reais'], ['numero_lido', 'Número do processo', 'texto'], ['numero_precatorio', 'Número do precatório / RPV', 'texto'], ['beneficiario_lido', 'Cliente ou parte', 'texto'], ['banco', 'Banco', 'texto'],
    ['contr_prev_cliente', 'Contr. prev. oficial (PSS do cliente: só informação, não é desconto dos honorários)', 'reais']];
  function deOnde(c, k){
    var o = c._o && c._o[k]; if(!o) return c[k] != null && c[k] !== '' ? '<div class="xh-de">digitado ou calculado</div>' : '<div class="xh-de">não achei no extrato</div>';
    return '<div class="xh-de' + (o.imagem ? ' img' : '') + '">' + esc((c.arquivo_nome || '') + ' · pág. ' + o.pagina + ' · "' + o.trecho + '"') + (o.imagem ? ' · <b>lido da imagem: confira</b>' : '') + (o.aviso ? ' · <b>' + esc(o.aviso) + '</b>' : '') + '</div>';
  }
  function valorCampo(c, k, t){ var v = c[k]; if(v == null) return ''; if(t === 'reais') return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); if(t === 'data') return dataBR(v); return String(v); }
  function mostrar(i){
    S.atual = i; var c = S.pagamentos[i], box = $('xhConf'); if(!c || !box) return;
    var abas = S.pagamentos.length > 1 ? '<div class="xh-pags">' + S.pagamentos.map(function(p, k){
      return '<button type="button" class="xh-pag' + (k === i ? ' active' : '') + (p.feito ? ' feito' : '') + '" data-xh-pag="' + k + '">Pagamento ' + (k + 1) + '<small>' + esc(moeda(p.valor_bruto)) + (p.data_pagamento ? ' · ' + esc(dataBR(p.data_pagamento)) : '') + (p.feito ? ' · ' + esc(p.feito) : '') + '</small></button>'; }).join('') + '</div>' : '';
    var lidos = '<div class="xh-col"><h3>O que foi lido</h3>' + (c._avisos || []).map(function(a){ return '<div class="xh-aviso">' + esc(a) + '</div>'; }).join('')
      + CAMPOS.map(function(f){ return '<div class="xh-campo"><label for="xh_' + f[0] + '">' + esc(f[1]) + '</label><input id="xh_' + f[0] + '" data-k="' + f[0] + '" data-t="' + f[2] + '" value="' + esc(valorCampo(c, f[0], f[2])) + '"' + (f[2] === 'data' ? ' inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10"' : f[2] === 'reais' ? ' inputmode="numeric" placeholder="0,00"' : '') + '>' + deOnde(c, f[0]) + '</div>'; }).join('')
      + '<div class="xh-campo"><label for="xh_origem">Origem</label><select id="xh_origem" data-k="origem"><option value="">—</option>' + [['alvara', 'Alvará'], ['rpv', 'RPV'], ['precatorio', 'Precatório'], ['outro', 'Outro']].map(function(o){ return '<option value="' + o[0] + '"' + (c.origem === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>';
    var proc = '<div class="xh-col"><h3>Processo achado</h3>' + (c.erroAchar ? '<div class="xh-erro">Não consegui procurar o processo: ' + esc(c.erroAchar) + '</div>' : '')
      + (c.candidatos && c.candidatos.length ? c.candidatos.map(function(p){ return '<label class="xh-cand' + (c.escolhido === p.processo_id ? ' active' : '') + '"><input type="radio" name="xhProc" value="' + esc(p.processo_id) + '"' + (c.escolhido === p.processo_id ? ' checked' : '') + '><b>' + esc(p.cliente || '—') + '</b>' + (p.codigo ? ' · ' + esc(p.codigo) : '')
          + '<small>' + esc((p.numero || 'sem número') + (p.tese ? ' · ' + p.tese : '') + ' · achado por ' + (p.achado_por || '')) + '</small>' + (p.ja_lancados ? '<small>' + esc(p.ja_lancados) + ' extrato(s) já lançado(s) neste processo</small>' : '') + '</label>'; }).join('')
        : '<div class="xh-aviso">Nenhum processo achado com o número ou o nome lidos. Procure abaixo ou mande para "Sem processo".</div>')
      + '<div class="xh-busca"><input id="xhBusca" placeholder="Nome, número do processo ou código VMM"><button class="btn-secondary btn-sm" type="button" id="xhBuscar" style="height:34px">Procurar</button></div></div>';
    var conta = '<div class="xh-col"><h3>Esperado × recebido</h3><div id="xhConta"></div>'
      + '<div class="xh-modo" id="xhModo"><label><input type="radio" name="xhModo" value="somar"' + (c.modo !== 'substituir' ? ' checked' : '') + '> Somar ao que já foi recebido (saque em partes)</label><label><input type="radio" name="xhModo" value="substituir"' + (c.modo === 'substituir' ? ' checked' : '') + '> Substituir o recebido (o valor antigo estava errado)</label></div>'
      + '<label class="xh-modo" style="flex-direction:row;gap:6px"><input type="checkbox" id="xhGuardar"' + (c.guardar === false ? '' : ' checked') + '> Guardar o extrato na pasta "Documentos probatórios › Extratos dos honorários" do cliente</label>'
      + '<label class="xh-modo" style="flex-direction:row;gap:6px"><input type="checkbox" id="xhForcar"' + (c.forcar ? ' checked' : '') + '> Lançar mesmo assim se o SAGA achar que é repetido</label>'
      + '<div id="xhRes"></div></div>';
    box.innerHTML = abas + '<div class="xh-grid">' + lidos + proc + conta + '</div>'
      + '<div class="modal-foot" style="padding:12px 0 0"><button class="btn-secondary" type="button" id="xhSemProc">Mandar para "Sem processo"</button>' + (S.pagamentos.length > 1 ? '<button class="btn-secondary" type="button" id="xhProx">Pular</button>' : '') + '<button class="btn-primary" type="button" id="xhConfirmar">Confirmar e lançar</button></div>';
    if(c.feito){ ['xhSemProc', 'xhConfirmar'].forEach(function(id){ var b = $(id); if(b) b.disabled = true; }); $('xhRes').innerHTML = '<div class="xh-ok">' + esc(c.feitoTxt || c.feito) + '</div>'; }
    box.querySelectorAll('[data-xh-pag]').forEach(function(b){ b.onclick = function(){ lerCampos(c); mostrar(+b.dataset.xhPag); }; });
    box.querySelectorAll('input[data-k],select[data-k]').forEach(function(inp){
      inp.addEventListener('input', function(){ if(inp.dataset.t === 'reais') mascaraReais(inp); if(inp.dataset.t === 'data') mascaraData(inp); lerCampos(c); desenharConta(c); });
    });
    box.querySelectorAll('input[name=xhProc]').forEach(function(r){ r.onchange = function(){ c.escolhido = r.value; box.querySelectorAll('.xh-cand').forEach(function(l){ l.classList.toggle('active', l.contains(r) && r.checked); }); desenharConta(c); }; });
    box.querySelectorAll('input[name=xhModo]').forEach(function(r){ r.onchange = function(){ c.modo = r.value; desenharConta(c); }; });
    $('xhGuardar').onchange = function(){ c.guardar = this.checked; };
    $('xhForcar').onchange = function(){ c.forcar = this.checked; };
    $('xhBuscar').onclick = function(){ buscarManual(c); };
    $('xhBusca').onkeydown = function(e){ if(e.key === 'Enter'){ e.preventDefault(); buscarManual(c); } };
    $('xhConfirmar').onclick = function(){ confirmar(c); };
    $('xhSemProc').onclick = function(){ semProcesso(c); };
    if($('xhProx')) $('xhProx').onclick = function(){ lerCampos(c); mostrar((i + 1) % S.pagamentos.length); };
    desenharConta(c);
  }
  function mascaraReais(inp){ var d = inp.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''); if(!d){ inp.value = ''; return; } while(d.length < 3) d = '0' + d; var int = d.slice(0, -2), dec = d.slice(-2); inp.value = Number(int).toLocaleString('pt-BR') + ',' + dec; }
  function mascaraData(inp){ var d = inp.value.replace(/\D/g, '').slice(0, 8); inp.value = d.length > 4 ? d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4) : d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; inp.classList.toggle('saga-data-invalida', d.length === 8 && !isoDeBR(inp.value)); }
  function lerCampos(c){
    var box = $('xhConf'); if(!box) return;
    box.querySelectorAll('input[data-k],select[data-k]').forEach(function(inp){
      var k = inp.dataset.k, t = inp.dataset.t, v = inp.value.trim(), antes = c[k];
      c[k] = t === 'reais' ? num(v) : t === 'data' ? isoDeBR(v) : (v || '');
      if(String(antes == null ? '' : antes) !== String(c[k] == null ? '' : c[k]) && c._o && c._o[k]) delete c._o[k];
    });
  }
  function escolhido(c){ return (c.candidatos || []).filter(function(p){ return p.processo_id === c.escolhido; })[0] || null; }
  function desenharConta(c){
    var el = $('xhConta'); if(!el) return; var p = escolhido(c);
    if(!p){ el.innerHTML = '<div class="xh-aviso">Escolha o processo ao lado para ver o esperado × recebido.</div>'; return; }
    var b = c.valor_bruto || 0, jaRec = Number(p.recebido || 0), tot = (c.modo === 'substituir' ? 0 : jaRec) + b, esp = p.esperado == null ? null : Number(p.esperado);
    var h = '<div class="xh-conta"><span>Honorários esperados</span><b>' + moeda(esp) + '</b>'
      + '<span>Já recebido antes</span><b>' + moeda(jaRec) + (p.data_recebimento ? ' <small style="font-weight:400;color:var(--muted)">(' + esc(dataBR(p.data_recebimento)) + ')</small>' : '') + '</b>'
      + '<span>Este pagamento (bruto)</span><b>' + moeda(b) + '</b>'
      + '<span>IR retido · líquido</span><b>' + moeda(c.ir_retido || 0) + ' · ' + moeda(c.valor_liquido) + '</b>'
      + '<span>Recebido depois de lançar</span><b>' + moeda(tot) + '</b></div>';
    if(esp == null) h += '<div class="xh-dif igual">Este processo ainda não tem valor esperado no Financeiro (falta o percentual ou a sentença).</div>';
    else { var dif = Math.round((tot - esp) * 100) / 100; h += Math.abs(dif) < 0.01 ? '<div class="xh-dif igual"><b>Bateu</b>recebido = esperado</div>'
      : '<div class="xh-dif ' + (dif > 0 ? 'mais' : 'menos') + '"><b>' + (dif > 0 ? '+' : '−') + esc(moeda(Math.abs(dif))) + '</b>' + (dif > 0 ? 'recebeu MAIS do que o esperado' : 'recebeu MENOS do que o esperado' + (c.modo === 'substituir' ? '' : ': pode faltar outra parte')) + '</div>'; }
    if(jaRec > 0) h += '<div class="xh-aviso" style="margin-top:8px">Este processo já tem ' + esc(moeda(jaRec)) + ' recebido. Se este extrato é do MESMO saque, escolha "Substituir"; se é outra parte, "Somar".</div>';
    el.innerHTML = h;
  }
  async function buscarManual(c){
    var t = ($('xhBusca').value || '').trim(); if(t.length < 3){ toast('Digite ao menos 3 letras ou números.', 'error'); return; }
    var btn = $('xhBuscar'); btn.disabled = true;
    try{
      var dig = t.replace(/\D/g, ''), ehCod = /^vmm/i.test(t) || /^\d{1,5}$/.test(t);
      var r = await sb().rpc('extrato_honorarios_achar', { p_numero: dig.length >= 7 ? t : null, p_nome: /[a-zà-ÿ]{3}/i.test(t) && !/^vmm/i.test(t) ? t : null, p_codigo: ehCod ? t : null });
      if(r.error) throw r.error;
      var novos = Array.isArray(r.data) ? r.data : [];
      if(!novos.length){ toast('Nada achado com "' + t + '".', 'error'); return; }
      lerCampos(c);
      var ids = {}; c.candidatos = novos.concat((c.candidatos || []).filter(function(p){ return !novos.some(function(n){ return n.processo_id === p.processo_id; }); }));
      c.candidatos.forEach(function(p){ ids[p.processo_id] = 1; });
      if(novos.length === 1) c.escolhido = novos[0].processo_id;
      mostrar(S.atual);
    }catch(e){ toast('Não consegui procurar: ' + erroTxt(e), 'error'); }
    finally{ if($('xhBuscar')) $('xhBuscar').disabled = false; }
  }
  function dadosParaBanco(c){
    var lidos = {}; Object.keys(c._o || {}).forEach(function(k){ var o = c._o[k]; lidos[k] = { arquivo: c.arquivo_nome || '', pagina: o.pagina, trecho: semCpf(o.trecho), imagem: !!o.imagem }; });
    return { data_pagamento: c.data_pagamento || null, valor_bruto: c.valor_bruto, ir_retido: c.ir_retido, outros_descontos: c.outros_descontos, valor_liquido: c.valor_liquido,
      numero_lido: c.numero_lido || null, beneficiario_lido: c.beneficiario_lido || null, origem: c.origem || null, banco: c.banco || null, arquivo_nome: c.arquivo_nome || null, dados_lidos: lidos,
      observacao: [c.numero_precatorio ? 'Precatório/RPV nº ' + c.numero_precatorio : '', c.contr_prev_cliente ? 'Contr. prev. oficial do cliente (PSS; não é desconto dos honorários): ' + moeda(c.contr_prev_cliente) : ''].filter(Boolean).join('. ') || null };
  }
  async function meuId(){
    if(S.eu) return S.eu;
    try{ var p = window.sagaPerfil ? await window.sagaPerfil() : null; if(p && p.id) return (S.eu = p.id); }catch(e){}
    var s = await sb().auth.getSession(), uid = s.data && s.data.session && s.data.session.user.id;
    if(!uid) throw new Error('sua sessão expirou; entre de novo no SAGA');
    var u = await sb().from('usuarios').select('id').eq('auth_user_id', uid).maybeSingle();
    if(u.error || !u.data) throw new Error('não achei o seu cadastro de usuário');
    return (S.eu = u.data.id);
  }
  async function guardarExtrato(arquivo, p){
    var pa = await sb().rpc('extrato_pasta_garantir', { p_pessoa: p.pessoa_id }); if(pa.error) throw pa.error;
    var eu = await meuId();
    var nome = String(arquivo.name || 'extrato').replace(/[\\/:*?"<>|]+/g, '-');
    if(!/^extrato/i.test(nome)) nome = 'Extrato dos honorários - ' + nome;
    var caminho = p.processo_id + '/' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now()) + '_' + nome.replace(/[^a-zA-Z0-9._-]/g, '_');
    var up = await sb().storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type || 'application/octet-stream' });
    if(up.error) throw up.error;
    var ext = (nome.match(/\.([a-z0-9]+)$/i) || [])[1];
    var ins = await sb().from('documentos').insert({ processo_id: p.processo_id, pessoa_id: p.pessoa_id, usuario_id: eu, nome_arquivo: nome, caminho_storage: caminho,
      tipo_documento: ext ? ext.toLowerCase() : null, tamanho_bytes: arquivo.size, pasta_id: pa.data, visivel_portal_cliente: false, excluido_logico: false }).select('id').single();
    if(ins.error){ var rm = await sb().storage.from(BUCKET).remove([caminho]); throw new Error(erroTxt(ins.error) + (rm.error ? ' (e o arquivo enviado ficou solto: avise o administrador)' : '')); }
    return ins.data.id;
  }
  async function confirmar(c){
    lerCampos(c); var p = escolhido(c), res = $('xhRes'), btn = $('xhConfirmar');
    if(!p){ toast('Escolha o processo antes de confirmar.', 'error'); return; }
    if(!c.data_pagamento){ toast('Falta a data do pagamento (dd/mm/aaaa).', 'error'); return; }
    if(!(c.valor_bruto > 0)){ toast('Falta o valor bruto recebido.', 'error'); return; }
    btn.disabled = true; res.innerHTML = '<div class="xh-prog">Gravando…</div>';
    var docId = c.documentoId || null, avisoDoc = '';
    try{
      if(c.arquivo && c.guardar !== false && !docId){
        try{ docId = await guardarExtrato(c.arquivo, p); c.documentoId = docId; }
        catch(e){ avisoDoc = 'O extrato NÃO foi guardado na pasta (' + erroTxt(e) + '). '; if(!confirm('Não consegui guardar o extrato na pasta do cliente:\n' + erroTxt(e) + '\n\nLançar os valores mesmo assim, sem o arquivo?')){ res.innerHTML = '<div class="xh-erro">' + esc(avisoDoc) + 'Nada foi lançado.</div>'; btn.disabled = false; return; } }
      }
      var r = await sb().rpc('extrato_honorarios_lancar', { p_processo: p.processo_id, p_dados: dadosParaBanco(c), p_documento: docId, p_modo: c.modo === 'substituir' ? 'substituir' : 'somar', p_extrato: c.extratoId || null, p_forcar: !!c.forcar });
      if(r.error) throw r.error;
      var d = r.data || {};
      c.feito = 'Lançado'; c.feitoTxt = 'Lançado. ' + (d.anotacao || '') + (docId ? ' Extrato guardado em Documentos probatórios › Extratos dos honorários.' : '');
      var ficha = FICHA + '?pessoa_id=' + encodeURIComponent(p.pessoa_id) + '&processo_id=' + encodeURIComponent(p.processo_id);
      res.innerHTML = '<div class="xh-ok"><b>Lançado no Financeiro.</b> ' + esc(avisoDoc) + esc(d.anotacao || '') + (docId ? ' O extrato foi para Documentos probatórios › Extratos dos honorários.' : '') + ' A anotação foi para a ficha e para o Registro de atividades. <a class="btn-secondary btn-sm" href="' + esc(ficha) + '" target="_blank" rel="noopener">Abrir a ficha ↗</a></div>';
      ['xhSemProc', 'xhConfirmar'].forEach(function(id){ var b = $(id); if(b) b.disabled = true; });
      document.dispatchEvent(new Event('saga-atualizar'));
      contarPendentes();
      var prox = S.pagamentos.findIndex(function(x){ return !x.feito; });
      if(prox >= 0 && S.pagamentos.length > 1) setTimeout(function(){ if(S.atual !== prox && $('xhConf')) mostrar(prox); }, 1600);
    }catch(e){
      var m = erroTxt(e);
      res.innerHTML = '<div class="xh-erro"><b>Não lançado.</b> ' + esc(avisoDoc + m) + (/já foi lançado/.test((e && e.message) || '') ? '<br>Se é outro pagamento, marque "Lançar mesmo assim" e confirme de novo.' : '') + (docId ? '<br>O extrato já está guardado na pasta; ao confirmar de novo ele não sobe outra vez.' : '') + '</div>';
      btn.disabled = false;
    }
  }
  async function semProcesso(c){
    lerCampos(c);
    if(!(c.valor_bruto > 0) && !(c.valor_liquido > 0)){ toast('Falta o valor do pagamento.', 'error'); return; }
    var b = $('xhSemProc'); b.disabled = true;
    try{
      var r = await sb().rpc('extrato_honorarios_sem_processo', { p_dados: dadosParaBanco(c) }); if(r.error) throw r.error;
      c.feito = 'Sem processo'; c.feitoTxt = 'Ficou na lista "Sem processo" do Financeiro, à vista, para ligar à mão. O arquivo não foi guardado (ele vai para a pasta quando o pagamento for ligado ao processo).';
      mostrar(S.atual); contarPendentes();
    }catch(e){ toast('Não consegui guardar na lista: ' + erroTxt(e), 'error'); b.disabled = false; }
  }

  /* ---- lista "Sem processo" e lançados ---- */
  async function abrirLista(aba){
    css(); aba = aba || 'sem_processo';
    janela('xhLista', 'Extratos dos honorários', 'Pagamentos lidos dos extratos. "Sem processo" fica aqui até alguém ligar ao processo certo.',
      '<div class="tabs" style="margin-bottom:12px"><button class="tab-btn' + (aba === 'sem_processo' ? ' active' : '') + '" data-xh-aba="sem_processo">Sem processo</button><button class="tab-btn' + (aba === 'para_aprovar' ? ' active' : '') + '" data-xh-aba="para_aprovar">Esperando aprovação</button><button class="tab-btn' + (aba === 'lancado' ? ' active' : '') + '" data-xh-aba="lancado">Lançados</button></div><div id="xhListaCorpo" class="xh-prog">Carregando…</div>',
      '<button class="btn-secondary" type="button" data-xh-fechar>Fechar</button>');
    $('xhLista').querySelectorAll('[data-xh-aba]').forEach(function(b){ b.onclick = function(){ $('xhLista').querySelectorAll('[data-xh-aba]').forEach(function(x){ x.classList.toggle('active', x === b); }); carregarLista(b.dataset.xhAba); }; });
    carregarLista(aba);
  }
  async function carregarLista(sit){
    var corpo = $('xhListaCorpo'); if(!corpo) return; corpo.innerHTML = 'Carregando…';
    var r = await sb().rpc('extratos_honorarios_listar', { p_situacao: sit, p_limite: 200 });
    if(r.error){ corpo.innerHTML = '<div class="xh-erro">Não consegui ler a lista: ' + esc(erroTxt(r.error)) + '. Atualize a página; se continuar, avise o administrador.</div>'; return; }
    var L = S.lista = Array.isArray(r.data) ? r.data : [];
    if(!L.length){ corpo.innerHTML = '<div class="xh-prog">' + (sit === 'sem_processo' ? 'Nenhum pagamento sem processo. Tudo ligado.' : sit === 'para_aprovar' ? 'Nada esperando aprovação.' : 'Nenhum extrato lançado ainda.') + '</div>'; return; }
    var ORI = { alvara: 'Alvará', rpv: 'RPV', precatorio: 'Precatório', outro: 'Outro' };
    corpo.innerHTML = '<div class="tabela-wrap"><table class="xh-tab"><thead><tr><th>Pagamento</th><th>Lido</th>' + (sit !== 'sem_processo' ? '<th>Processo</th>' : '') + '<th class="num">Bruto</th><th class="num">IR</th><th class="num">Líquido</th><th></th></tr></thead><tbody>'
      + L.map(function(x, i){
        return '<tr><td>' + esc(x.data_pagamento ? dataBR(x.data_pagamento) : 'sem data') + (x.origem ? '<div class="xh-de">' + esc(ORI[x.origem] || x.origem) + (x.banco ? ' · ' + esc(x.banco) : '') + '</div>' : '') + '<div class="xh-de">' + esc('por ' + (x.criado_por || '—') + ' em ' + dataBR(String(x.criado_em || '').slice(0, 10))) + '</div></td>'
          + '<td>' + esc(x.numero_lido || '—') + '<div class="xh-de">' + esc(x.beneficiario_lido || '') + (x.arquivo_nome ? ' · ' + esc(x.arquivo_nome) : '') + '</div></td>'
          + (sit !== 'sem_processo' ? '<td>' + esc(x.cliente || '—') + (x.codigo ? '<div class="xh-de">' + esc(x.codigo) + '</div>' : '') + (sit === 'lancado' ? '<div class="xh-de">' + esc('esperado ' + moeda(x.esperado_antes) + ' · recebido ' + moeda(x.recebido_depois)) + '</div>' : '') + '</td>' : '')
          + '<td class="num">' + esc(moeda(x.valor_bruto)) + '</td><td class="num">' + esc(moeda(x.ir_retido)) + '</td><td class="num">' + esc(moeda(x.valor_liquido)) + '</td>'
          + '<td style="white-space:nowrap">' + (sit === 'sem_processo' ? '<button class="btn-secondary btn-sm" type="button" data-xh-ligar="' + i + '">Ligar a um processo</button>' + (S.admin ? ' <button class="btn-danger btn-sm" type="button" data-xh-tirar-lista="' + i + '">Tirar da lista</button>' : '') : sit === 'para_aprovar' ? '<a class="btn-secondary btn-sm" href="agentes_aprovar.html">Para aprovar ↗</a>' : (x.pessoa_id ? '<a class="btn-secondary btn-sm" href="' + esc(FICHA + '?pessoa_id=' + encodeURIComponent(x.pessoa_id) + '&processo_id=' + encodeURIComponent(x.processo_id)) + '">Ficha ↗</a>' : '')) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    corpo.querySelectorAll('[data-xh-ligar]').forEach(function(b){ b.onclick = function(){ ligar(S.lista[+b.dataset.xhLigar]); }; });
    corpo.querySelectorAll('[data-xh-tirar-lista]').forEach(function(b){ b.onclick = function(){ tirarDaLista(S.lista[+b.dataset.xhTirarLista]); }; });
  }
  async function ligar(x){
    fechar('xhLista'); css();
    janela('xhJanela', 'Ligar pagamento a um processo', 'Pagamento que ficou sem processo. Escolha o processo, confira e confirme. Se tiver o extrato à mão, anexe para ir à pasta do cliente.',
      '<div class="xh-campo" style="max-width:460px"><label for="xhAnexo">Anexar o extrato (opcional)</label><input type="file" id="xhAnexo" accept="application/pdf,.pdf,image/*"></div><div id="xhProg" class="xh-prog"></div><div id="xhConf"></div>', '');
    var c = { data_pagamento: x.data_pagamento, valor_bruto: x.valor_bruto == null ? null : Number(x.valor_bruto), ir_retido: x.ir_retido == null ? null : Number(x.ir_retido),
      outros_descontos: x.outros_descontos == null ? null : Number(x.outros_descontos), valor_liquido: x.valor_liquido == null ? null : Number(x.valor_liquido), numero_lido: x.numero_lido, beneficiario_lido: x.beneficiario_lido,
      origem: x.origem || '', banco: x.banco || '', arquivo_nome: x.arquivo_nome, extratoId: x.id, _o: {}, _avisos: [] };
    Object.keys(x.dados_lidos || {}).forEach(function(k){ var o = x.dados_lidos[k]; c._o[k] = { pagina: o.pagina, trecho: o.trecho, imagem: o.imagem }; });
    S.pagamentos = [c]; await acharCandidatos(c); mostrar(0);
    $('xhAnexo').onchange = function(){ var f = this.files && this.files[0]; c.arquivo = f || null; if(f) c.arquivo_nome = f.name; };
  }
  async function tirarDaLista(x){
    var m = prompt('Tirar este pagamento da lista "Sem processo" (' + moeda(x.valor_bruto || x.valor_liquido) + '). Ele não é apagado: fica guardado com o motivo.\n\nMotivo:');
    if(m == null) return;
    var r = await sb().rpc('extrato_honorarios_descartar', { p_extrato: x.id, p_motivo: m });
    if(r.error){ toast('Não tirei da lista: ' + erroTxt(r.error), 'error'); return; }
    toast('Tirado da lista.', 'success'); carregarLista('sem_processo'); contarPendentes();
  }

  /* ---- botões no alto do Financeiro ---- */
  async function contarPendentes(){
    var b = $('xhBtnLista'); if(!b) return;
    var r = await sb().from('honorarios_extratos').select('id', { count: 'exact', head: true }).eq('situacao', 'sem_processo').eq('ativo', true);
    if(r.error){ b.innerHTML = 'Extratos <span class="xh-qtd" title="' + esc(erroTxt(r.error)) + '">erro</span>'; return; }
    b.innerHTML = 'Extratos' + (r.count ? ' <span class="xh-qtd" title="Pagamentos sem processo">' + r.count + ' sem processo</span>' : '');
  }
  async function iniciar(){
    var acoes = document.querySelector('.head-actions'); if(!acoes || $('xhBtnLer')) return;
    if(/[?&]minha=1/.test(location.search)) return;
    var pode = false;
    try{ pode = window.sagaPode ? await window.sagaPode('financeiro.editar') : false; }catch(e){ pode = false; }
    if(!pode) return;
    try{ S.admin = (await sb().rpc('eh_admin_sistema')).data === true; }catch(e){}
    css();
    var b1 = document.createElement('button'); b1.className = 'btn-primary'; b1.type = 'button'; b1.id = 'xhBtnLer'; b1.textContent = 'Ler extrato dos honorários';
    var b2 = document.createElement('button'); b2.className = 'btn-secondary'; b2.type = 'button'; b2.id = 'xhBtnLista'; b2.textContent = 'Extratos';
    acoes.insertBefore(b2, acoes.firstChild); acoes.insertBefore(b1, b2);
    b1.onclick = abrir; b2.onclick = function(){ abrirLista('sem_processo'); };
    contarPendentes();
    if(/[?&]extrato=1/.test(location.search)) abrir();
  }
  function quandoPronto(){
    if(!window._sb) return setTimeout(quandoPronto, 200);
    var n = 0; (function esperar(){ if(document.querySelector('.head-actions') && document.querySelector('.tabs')) return iniciar(); if(++n < 100) setTimeout(esperar, 200); })();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', quandoPronto); else quandoPronto();

  window.SagaExtratoHonorarios = { abrir: abrir, abrirLista: abrirLista, lerTexto: lerTexto, lerBloco: lerBloco };
})();
