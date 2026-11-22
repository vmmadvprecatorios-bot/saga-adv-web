/* SAGA · Cálculo do PSS dentro do processo (T194 etapa 5, 19/11/2026, Dr. Victor; bloco 267)
   As MESMAS fórmulas da planilha matriz da skill preenchimento-planilha-inicial-pss (repositório vmmadv-skills):
   - 1ª aba ("Planilha para apuração de valor"): tem direito? PSS máximo sobre o principal (11% do principal bruto),
     PSS cobrado a mais sobre os JUROS (PSS recolhido − PSS máximo do principal), tese dos 6% até 06/1997 (5% a maior
     sobre a parcela do principal das competências até junho de 1997) e, se houver, a isenção total (valor informado).
   - Aba de cumprimento ("Plan. Cump. de sentença - PSS"): cada valor corrigido pela SELIC da Calculadora do Cidadão
     desde a sua retenção (2ª parcela em linha própria) e a repartição dos honorários (contratuais e de sucumbência).
   Regra da skill: usar só o que está nos documentos; o índice SELIC é o da Calculadora do Cidadão (o botão abre a
   calculadora com as datas e o valor; o print vai para a pasta do processo). Só o Jurídico faz e confere (calculos.fazer).
   Guardado em calculos_processo (versões; nada se apaga). Os valores entram sozinhos na petição de PSS.
   Uso: SagaCalculos.abrir({sb, processoId, aoSalvar}) · SagaCalculos.calcular(entradas) · SagaCalculos.camposPeticao(r) */
window.SagaCalculos = (function(){
  'use strict';
  var S = { ctx: null, atual: null, pode: false };
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function sb(){ return (S.ctx && S.ctx.sb) || window._sb; }
  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }
  function r2(v){ return Math.round((Number(v) || 0) * 100) / 100; }
  function num(v){
    if(v == null || v === '') return null;
    if(typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).replace(/[^\d,.-]/g, '');
    if(s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s); return isFinite(n) ? n : null;
  }
  function reais(v){ var n = Number(v); if(v == null || !isFinite(n)) return ''; return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(v, casas){ var n = Number(v); if(v == null || !isFinite(n)) return ''; return (n * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas == null ? 2 : casas, maximumFractionDigits: casas == null ? 2 : casas }) + '%'; }
  function extenso(v){ try{ return window.SagaPeticoes && window.SagaPeticoes._t ? window.SagaPeticoes._t.reaisExtenso(v) : ''; }catch(e){ return ''; } }

  /* ---------------- a conta (planilha matriz) ---------------- */
  function calcular(e){
    e = e || {};
    var A42 = num(e.loa), C42 = num(e.liq_principal), E42 = num(e.liq_juros), A45 = num(e.pss_recolhido), A48 = num(e.honorarios_req) || 0;
    var r = { faltando: [], avisos: [] };
    if(C42 == null) r.faltando.push('Valor principal líquido do requisitório');
    if(E42 == null) r.faltando.push('Valor dos juros líquido do requisitório');
    if(A45 == null) r.faltando.push('PSS recolhido no requisitório');
    if(A42 == null) r.faltando.push('Valor da LOA (coluna AO)');
    var A58 = (C42 || 0) + (E42 || 0);
    var C45 = A58 ? (C42 || 0) / A58 : 0, E45 = A58 ? (E42 || 0) / A58 : 0;
    var C48 = (C42 || 0) + C45 * A48, E48 = (E42 || 0) + E45 * A48;
    var C51 = (A42 || 0) * C45, E51 = (A42 || 0) * E45;
    var C54 = C48 * 0.11;                 /* PSS máximo a ser recolhido sobre o principal bruto */
    var E54 = (A45 || 0) - C54;           /* PSS que caiu sobre os juros (indevido) */
    var A55 = (C42 || 0) + (E42 || 0) + A48;
    var C60 = (A42 || 0) * C45 * 0.11, C57 = C54 ? (C60 - C54) / C54 : 0, E60 = E54 * C57 + E54;
    r.req = { A58: r2(A58), C45: C45, E45: E45, C48: r2(C48), E48: r2(E48), C51: r2(C51), E51: r2(E51), C54: r2(C54), E54: r2(E54), A55: r2(A55), C57: C57, C60: r2(C60), E60: r2(E60) };
    var totalInformado = num(e.total_requisitorio);
    if(totalInformado != null && Math.abs(totalInformado - A55) > 0.05) r.avisos.push('Conferência: principal + juros + honorários (' + reais(A55) + ') não bate com o valor total do requisitório informado (' + reais(totalInformado) + '). Revise os valores.');
    /* teses */
    var juros = (A45 != null && E54 > 1) ? r2(E54) : 0;
    r.incidiu_juros = juros > 0;
    var pAte = num(e.principal_ate_1997), pTot = num(e.principal_total_demonstrativo);
    var prop = (pAte != null && pTot) ? pAte / pTot : null;
    var principalReq = num(e.principal_requisitado);
    if(principalReq == null) principalReq = r2(C48);
    var parcela = prop != null ? r2(principalReq * prop) : null;
    var excesso5 = parcela != null ? r2(parcela * 0.05) : 0;
    var isencao = e.isencao_total ? (num(e.valor_isencao) || 0) : 0;
    r.tese = { proporcao_1997: prop, principal_requisitado: r2(principalReq), parcela_ate_1997: parcela, excesso_5: excesso5, juros: juros, isencao: r2(isencao),
      base_total: r2(excesso5 + juros + isencao) };
    if(prop == null) r.avisos.push('Sem o demonstrativo mês a mês (principal até 06/1997 e de todo o período), a tese dos 6% não é calculada.');
    /* cumprimento (SELIC de cada retenção) */
    var s1 = num(e.selic_1), s2 = num(e.selic_2), p2 = num(e.parcela2_valor) || 0;
    if(s1 == null && (excesso5 || juros || isencao)) r.faltando.push('Percentual SELIC da retenção (Calculadora do Cidadão)');
    var D6 = r2(isencao + excesso5), D12 = juros;
    var G6 = r2(D6 * (1 + (s1 || 0))), G9 = r2(p2 * (1 + (s2 || 0))), G12 = r2(D12 * (1 + (s1 || 0)));
    var total = r2(G6 + G9 + G12);
    var pc = num(e.pct_contratuais); if(pc == null) pc = 0.25;
    var ps = num(e.pct_sucumbencia); if(ps == null) ps = 0;
    var sar = num(e.pct_sarmento), vic = num(e.pct_victor), val = num(e.pct_valdenor) || 0;
    if(sar == null && vic == null){ sar = 0.114; vic = 0.136; r.avisos.push('Divisão dos honorários contratuais pelos percentuais da matriz (Sarmento 11,4% e Victor 13,6%): confirme no contrato.'); }
    sar = sar || 0; vic = vic || 0;
    var G15 = r2(total * pc), G16 = r2(total * ps);
    var linhas = [];
    if(sar) linhas.push({ nome: 'Sarmento, Camargo & Sarmento', pct: sar, valor: r2(total * sar) });
    if(vic) linhas.push({ nome: 'Dr. Victor de Medeiros Morais', pct: vic, valor: r2(total * vic) });
    if(val) linhas.push({ nome: 'Dr. Valdenor de Lima Morais', pct: val, valor: r2(total * val) });
    /* como na skill (exemplo validado): o último advogado fica com a diferença, para a soma bater com os contratuais nos centavos */
    if(linhas.length > 1 && Math.abs(linhas.reduce(function(a, l){ return a + l.pct; }, 0) - pc) < 1e-9){
      linhas[linhas.length - 1].valor = r2(r2(total * pc) - linhas.slice(0, -1).reduce(function(a, l){ return a + l.valor; }, 0));
    }
    var somaAdv = r2(linhas.reduce(function(a, l){ return a + l.valor; }, 0));
    if(linhas.length && Math.abs(somaAdv - G15) > 0.05) r.avisos.push('A soma da divisão entre os advogados (' + reais(somaAdv) + ') não bate com os honorários contratuais (' + reais(G15) + ').');
    r.cumprimento = { D6: D6, G6: G6, D9: r2(p2), G9: G9, D12: D12, G12: G12, total: total, honorarios_contratuais: G15, honorarios_sucumbencia: G16,
      valor_autor: r2(total - G15), divisao: linhas, pct_contratuais: pc, pct_sucumbencia: ps };
    r.total_restituir = total || r.tese.base_total;
    r.valido = r.tese.base_total > 0;
    return r;
  }

  /* campos das petições de PSS (as chaves dos modelos) */
  function camposPeticao(e, r){
    e = e || {}; r = r || calcular(e);
    var v = {};
    function put(k, val){ if(val != null && String(val).trim() !== '') v[k] = String(val); }
    var A45 = num(e.pss_recolhido);
    if(A45 != null) put('valor_pss_retido', reais(A45) + ' (' + extenso(A45) + ')');
    if(r.tese.juros) put('valor_pss_juros', reais(r.tese.juros) + ' (' + extenso(r.tese.juros) + ')');
    put('data_base', e.data_base);
    put('requisitorio', e.prc);
    put('periodo_credito', e.exercicios);
    put('competencias_6', e.competencias_ate_1997);
    put('datas_retencao', e.datas_retencao);
    if(num(e.principal_ate_1997) != null) put('principal_ate_1997', reais(num(e.principal_ate_1997)));
    if(num(e.principal_total_demonstrativo) != null) put('principal_total_demonstrativo', reais(num(e.principal_total_demonstrativo)));
    if(r.tese.proporcao_1997 != null) put('proporcao_1997', pct(r.tese.proporcao_1997));
    put('principal_requisitado', reais(r.tese.principal_requisitado));
    if(r.tese.parcela_ate_1997 != null) put('parcela_ate_1997', reais(r.tese.parcela_ate_1997));
    if(r.tese.excesso_5){ put('valor_excesso', reais(r.tese.excesso_5)); put('valor_excesso_extenso', extenso(r.tese.excesso_5)); }
    if(r.total_restituir){ put('valor_causa', reais(r.total_restituir)); put('valor_causa_extenso', extenso(r.total_restituir)); }
    return v;
  }

  /* ---------------- interface ---------------- */
  var CAMPOS = [
    { g: 'Identificação (da ficha ou dos documentos)' },
    { k: 'beneficiario', r: 'Nome do beneficiário' },
    { k: 'cpf_beneficiario', r: 'CPF do beneficiário', f: 'cpf' },
    { k: 'processo_execucao', r: 'Processo de execução', ex: '0000000-00.0000.0.00.0000' },
    { k: 'assunto', r: 'Assunto do processo', ex: 'Índice de 28,86% Lei 8.622/1993' },
    { k: 'nm_meses', r: 'Nº de meses (NM, RRA)', f: 'int' },
    { k: 'vendeu_prc', r: 'Vendeu o PRC (cessão de crédito)?', ex: 'Sim / Não' },
    { g: 'Requisitório e espelho do tribunal' },
    { k: 'prc', r: 'Sequencial do PRC/RPV', ex: 'PRC900003-AL' },
    { k: 'data_base', r: 'Data-base do requisitório', ex: '31/12/2019', f: 'data' },
    { k: 'data_pagamento', r: 'Data do pagamento (depósito)', ex: '26/12/2023', f: 'data' },
    { k: 'liq_principal', r: 'Valor principal (líquido, sem honorários)', f: 'reais' },
    { k: 'liq_juros', r: 'Valor dos juros (líquido)', f: 'reais' },
    { k: 'honorarios_req', r: 'Honorários contratuais destacados no requisitório', f: 'reais' },
    { k: 'pss_recolhido', r: 'PSS recolhido no requisitório (Valor PSSS)', f: 'reais' },
    { k: 'total_requisitorio', r: 'Valor total do requisitório (para conferir)', f: 'reais' },
    { k: 'loa', r: 'Valor da LOA (coluna AO)', f: 'reais', dica: 'Se faltar, dá para usar o valor levantado no comprovante de saque (avise o Dr. Victor).' },
    { g: 'Demonstrativo mês a mês (tese dos 6% até 06/1997)' },
    { k: 'exercicios', r: 'Exercícios / período do crédito', ex: '01/1993 a 12/2000' },
    { k: 'competencias_ate_1997', r: 'Competências até 06/1997', ex: 'janeiro de 1993 a junho de 1997' },
    { k: 'principal_ate_1997', r: 'Principal atualizado das competências até 06/1997', f: 'reais' },
    { k: 'principal_total_demonstrativo', r: 'Principal atualizado de todo o período', f: 'reais' },
    { k: 'principal_requisitado', r: 'Principal requisitado na data-base (vazio = principal bruto calculado)', f: 'reais' },
    { k: 'isencao_total', r: 'Isenção total (aposentado antes de 2004 ou sentença que define)', f: 'sim' },
    { k: 'valor_isencao', r: 'Valor da isenção total (mês a mês, 100%)', f: 'reais' },
    { g: 'SELIC (Calculadora do Cidadão)' },
    { k: 'data_atualizacao', r: 'Data final da atualização (dia do protocolo)', f: 'data' },
    { k: 'datas_retencao', r: 'Data(s) da retenção, por extenso na petição', ex: 'agosto de 2022 e maio de 2023' },
    { k: 'selic_1', r: 'Percentual SELIC da 1ª retenção (índice − 1)', f: 'pct', ex: '90,700238%', calc: 1 },
    { k: 'parcela2_valor', r: '2ª parcela: PSS retido a maior (se houve 2º saque)', f: 'reais' },
    { k: 'parcela2_data', r: '2ª parcela: data da retenção', f: 'data' },
    { k: 'selic_2', r: 'Percentual SELIC da 2ª retenção', f: 'pct', calc: 2 },
    { g: 'Contrato (honorários)' },
    { k: 'pct_contratuais', r: 'Honorários contratuais (%)', f: 'pct', ex: '25%' },
    { k: 'pct_sucumbencia', r: 'Honorários de sucumbência (%)', f: 'pct', ex: '0% no Juizado' },
    { k: 'pct_sarmento', r: 'Sarmento, Camargo & Sarmento (% do total)', f: 'pct', ex: '11,4%' },
    { k: 'pct_victor', r: 'Dr. Victor (% do total)', f: 'pct', ex: '13,6%' },
    { k: 'pct_valdenor', r: 'Dr. Valdenor (% do total)', f: 'pct', ex: '0%' }
  ];
  /* formata sozinho enquanto digita (regra de 04/11): R$ com centavos, data dd/mm/aaaa, % com vírgula */
  function mascara(inp, f){
    inp.addEventListener('input', function(){
      var d = inp.value.replace(/\D/g, '');
      if(f === 'reais'){ if(!d){ inp.value = ''; return; } var n = parseInt(d, 10) / 100; inp.value = n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      else if(f === 'data'){ d = d.slice(0, 8); inp.value = d.length > 4 ? d.slice(0,2) + '/' + d.slice(2,4) + '/' + d.slice(4) : (d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d); }
      else if(f === 'pct'){ inp.value = inp.value.replace(/[^\d,]/g, '').replace(/(,.*?),/g, '$1'); }
      else if(f === 'int'){ inp.value = d.slice(0, 4); }
      else if(f === 'cpf'){ d = d.slice(0, 11); inp.value = d.length > 9 ? d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9) : d.length > 6 ? d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6) : d.length > 3 ? d.slice(0,3) + '.' + d.slice(3) : d; }
    });
  }
  function lerPct(s){ var n = num(s); return n == null ? null : n / 100; }
  function ler(){
    var e = {};
    CAMPOS.forEach(function(c){
      if(!c.k) return;
      var el = document.getElementById('cl_' + c.k); if(!el) return;
      if(c.f === 'sim') e[c.k] = el.checked;
      else if(c.f === 'pct') e[c.k] = lerPct(el.value);
      else if(c.f === 'reais') e[c.k] = num(el.value);
      else if(c.f === 'int') e[c.k] = el.value.trim() ? parseInt(el.value, 10) : null;
      else e[c.k] = el.value.trim() || null;
    });
    var org = {}; Object.keys(S.origem || {}).forEach(function(k){ if(e[k] != null && e[k] !== '') org[k] = S.origem[k]; });
    if(Object.keys(org).length) e._origem = org;
    return e;
  }
  function valorCampo(c, v){
    if(v == null) return '';
    if(c.f === 'reais') return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if(c.f === 'pct') return (Number(v) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 8 });
    return String(v);
  }
  function linkCalculadora(n){
    var e = ler(), r = calcular(e);
    var ini = n === 2 ? e.parcela2_data : (e.data_pagamento || e.data_base), fim = e.data_atualizacao;
    var valor = n === 2 ? e.parcela2_valor : (r.tese.excesso_5 + r.tese.juros + r.tese.isencao);
    if(!ini || !fim || !valor) return null;
    return 'https://www3.bcb.gov.br/CALCIDADAO/publico/corrigirPelaSelic.do?method=corrigirPelaSelic&dataInicial=' + encodeURIComponent(ini)
      + '&dataFinal=' + encodeURIComponent(fim) + '&valorCorrecao=' + String(r2(valor).toFixed(2)).replace('.', ',');
  }

  /* SELIC pelo serviço público do Banco Central (série 11, SELIC diária): opção AO LADO da digitação, para conferir.
     A fonte da skill continua sendo a Calculadora do Cidadão (com o print na pasta); o Dr. Victor decide se passa a valer. */
  function dataBR(s){ var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || '').trim()); return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null; }
  async function selicBancoCentral(n){
    var e = ler(), ini = n === 2 ? e.parcela2_data : (e.data_pagamento || e.data_base), fim = e.data_atualizacao, msg = document.getElementById('clMsg');
    if(!dataBR(ini) || !dataBR(fim)){ msg.innerHTML = '<div class="cl-aviso">Preencha a data ' + (n === 2 ? 'da 2ª retenção' : 'do pagamento') + ' e a data final (dd/mm/aaaa) para buscar a SELIC.</div>'; return; }
    msg.innerHTML = '<div class="cl-sub">Buscando a SELIC diária no Banco Central (' + esc(ini) + ' a ' + esc(fim) + ')…</div>';
    try{
      var u = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=' + encodeURIComponent(ini) + '&dataFinal=' + encodeURIComponent(fim);
      var r = await fetch(u, { cache: 'no-store' });
      if(!r.ok) throw new Error('o Banco Central respondeu erro ' + r.status);
      var dados = await r.json(); if(!Array.isArray(dados) || !dados.length) throw new Error('o Banco Central não devolveu taxas para esse período');
      var d0 = dataBR(ini), d1 = dataBR(fim), fator = 1, dias = 0;
      dados.forEach(function(x){ var d = dataBR(x.data), v = parseFloat(String(x.valor).replace(',', '.')); if(d && isFinite(v) && d >= d0 && d < d1){ fator *= 1 + v / 100; dias++; } });
      var pctTxt = ((fator - 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
      msg.innerHTML = '<div class="cl-aviso"><b>SELIC acumulada pelo Banco Central: ' + esc(pctTxt) + '%</b> (fator ' + fator.toFixed(8).replace('.', ',') + '; ' + dias + ' dias úteis, de ' + esc(ini) + ' até o dia anterior a ' + esc(fim) + ').'
        + ' É uma conferência: a skill manda usar a Calculadora do Cidadão (com o print na pasta). Se os dois baterem, pode usar. <button type="button" id="clUsarBcb">Usar este percentual</button></div>';
      document.getElementById('clUsarBcb').onclick = function(){ var el = document.getElementById('cl_selic_' + n); if(el){ el.value = pctTxt; el.dispatchEvent(new Event('change')); S.origem = S.origem || {}; S.origem['selic_' + n] = { arquivo: 'Banco Central (SELIC diária, série 11)', trecho: ini + ' a ' + fim }; mostrarOrigem('selic_' + n); } msg.innerHTML = ''; };
    }catch(x){
      msg.innerHTML = '<div class="cl-erro"><b>Não consegui buscar a SELIC no Banco Central:</b> ' + esc(x.message || x) + (/fetch|network|Failed/i.test(String(x.message || x)) ? ' (o navegador não alcançou o serviço do Banco Central: sem internet ou o serviço recusou o acesso).' : '') + ' Use a Calculadora do Cidadão.</div>';
    }
  }

  /* ---------------- leitura dos documentos (requisitório, espelho do tribunal) ----------------
     Tudo no navegador (LGPD): o PDF não sai do computador nem é guardado; só os números lidos vão para os campos,
     depois de a pessoa conferir. Rótulos da tabela da skill (Valor principal, Valor juros, Valor PSSS, honorários
     contratuais/cessão, Valor total, Data base de cálculo, código PRC/RPV, "Depósito efetivado"). */
  var PDFJS = 'vendor/pdfjs-4.10.38/', _pdfjs = null;
  function versao(){ var sc = document.querySelector('script[src*="saga_calculos.js"]'); var m = sc && /[?&]v=([^&]+)/.exec(sc.src); return m ? m[1] : ''; }
  function pdfjs(){
    if(!_pdfjs) _pdfjs = import(new URL(PDFJS + 'pdf.min.mjs', location.href).href).then(function(m){ m.GlobalWorkerOptions.workerSrc = new URL(PDFJS + 'pdf.worker.min.mjs', location.href).href; return m; })
      .catch(function(er){ _pdfjs = null; throw er; });
    return _pdfjs;
  }
  async function textoDoPdf(arquivo){
    var lib = await pdfjs();
    var doc = await lib.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise, out = [];
    for(var i = 1; i <= Math.min(doc.numPages, 40); i++){
      var pg = await doc.getPage(i), tc = await pg.getTextContent(), ultY = null, linha = [];
      tc.items.forEach(function(it){
        var y = it.transform ? Math.round(it.transform[5]) : 0;
        if(ultY !== null && Math.abs(y - ultY) > 2){ out.push(linha.join(' ')); linha = []; }
        linha.push(it.str); ultY = y; if(it.hasEOL){ out.push(linha.join(' ')); linha = []; ultY = null; }
      });
      if(linha.length) out.push(linha.join(' '));
    }
    try{ doc.destroy(); }catch(e){}
    return out.join('\n');
  }
  function semAcento(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  var RX_VALOR = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})(?!\d)/;
  var RX_DATA = /(\d{2})\/(\d{2})\/(\d{4})/;
  var ROTULOS = [
    { k: 'liq_principal', r: /valor\s*(?:do\s*)?principal(?!\s*(?:bruto|atualizado\s+de\s+todo))/g, t: 'reais' },
    { k: 'liq_juros', r: /valor\s*(?:dos?\s*)?juros/g, t: 'reais' },
    { k: 'pss_recolhido', r: /valor\s*(?:do\s*)?psss?\b|contribuicao\s+(?:ao\s+)?psss?\b/g, t: 'reais' },
    { k: 'honorarios_req', r: /(?:valor\s*(?:dos?\s*)?)?honorarios\s+contratuais(?:\s*\/\s*cessao)?|valor\s+(?:da\s+)?cessao/g, t: 'reais' },
    { k: 'total_requisitorio', r: /valor\s+total(?:\s+do\s+requisitorio|\s+requisitado)?/g, t: 'reais' },
    { k: 'data_base', r: /data[\s-]*base(?:\s+de\s+calculo)?/g, t: 'data' }
  ];
  /* acha os valores no texto; devolve {campo: {valor, outros:[...], trecho}} */
  var RX_CPF = /\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g, RX_CNJ = /\b(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})\b/g;
  function lerTexto(texto){
    var t = semAcento(texto).replace(/[ \t ]+/g, ' '), achados = {};
    function guarda(k, v, trecho){
      if(v == null || v === '') return;
      var a = achados[k] || (achados[k] = { valor: v, outros: [], trecho: trecho });
      if(String(a.valor) !== String(v) && a.outros.indexOf(v) < 0) a.outros.push(v);
    }
    ROTULOS.forEach(function(rot){
      rot.r.lastIndex = 0; var m;
      while((m = rot.r.exec(t))){
        var depois = t.slice(m.index + m[0].length, m.index + m[0].length + 90);
        var mm = rot.t === 'data' ? RX_DATA.exec(depois) : RX_VALOR.exec(depois);
        if(!mm) continue;
        /* o valor tem de vir logo depois do rótulo (sem outro rótulo "valor ..." no meio) */
        var meio = depois.slice(0, mm.index);
        if(/valor\s|data\s/.test(meio)) continue;
        var v = rot.t === 'data' ? mm[0] : num(mm[1]);
        guarda(rot.k, v, (m[0] + depois.slice(0, mm.index + mm[0].length)).trim());
      }
    });
    var rp = /\b(prc|rpv)\s*-?\s*(\d{5,})\s*-?\s*([a-z]{2})\b/g, m2;
    while((m2 = rp.exec(t))) guarda('prc', m2[1].toUpperCase() + m2[2] + '-' + m2[3].toUpperCase(), m2[0]);
    var rd = /deposito\s+efetivado/g, m3;
    while((m3 = rd.exec(t))){
      var antes = t.slice(Math.max(0, m3.index - 60), m3.index), depois2 = t.slice(m3.index, m3.index + 80);
      var dd = RX_DATA.exec(depois2) || (function(){ var all = antes.match(/\d{2}\/\d{2}\/\d{4}/g); return all ? [all[all.length - 1]] : null; })();
      if(dd) guarda('data_pagamento', dd[0], 'depósito efetivado ' + dd[0]);
    }
    /* identificação: CPF e nome perto de "beneficiário/requerente/exequente/credor"; número do processo; NM; assunto; cessão */
    var rb = /(beneficiario|requerente|reqte|exequente|credor)\s*[:\-]?\s*/g, mb, orig = String(texto || '').replace(/[ \t ]+/g, ' '), origSem = semAcento(orig);
    while((mb = rb.exec(t))){
      var trecho = t.slice(mb.index, mb.index + 160);
      RX_CPF.lastIndex = 0; var mc = RX_CPF.exec(trecho.slice(mb[0].length, 120));
      if(mc) guarda('cpf_beneficiario', mc[1] + '.' + mc[2] + '.' + mc[3] + '-' + mc[4], trecho.slice(0, mb[0].length + mc.index + mc[0].length));
      var pos = origSem.indexOf(mb[0].trim(), Math.max(0, mb.index - 5));
      if(pos >= 0){
        var resto = orig.slice(pos + mb[0].trim().length, pos + mb[0].trim().length + 120).replace(/^[\s:\-–]+/, '');
        var nm = /^([A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'.]+(?:\s+(?!CPF\b|CNPJ\b|RG\b|OAB\b)[A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'.]*(?![a-záéíóúâêôãõçü])){1,8})/.exec(resto);
        if(nm && !/^(CPF|CNPJ|NOME|VALOR|DATA)\b/.test(nm[1])) guarda('beneficiario', nm[1].trim(), mb[0].trim() + ' ' + nm[1].trim());
      }
    }
    RX_CNJ.lastIndex = 0; var mj;
    while((mj = RX_CNJ.exec(t))){
      var ctx = t.slice(Math.max(0, mj.index - 50), mj.index);
      if(/execu|origin|processo/.test(ctx)) guarda('processo_execucao', mj[1] + '-' + mj[2] + '.' + mj[3] + '.' + mj[4] + '.' + mj[5] + '.' + mj[6], (ctx.slice(-30) + mj[0]).replace(/\s+/g, ' ').trim());
    }
    var mn = /\b(?:nm|n[ºo°.]*\s*de\s*meses|numero\s+de\s+meses)\s*[:\-]?\s*(\d{1,3})\b/.exec(t);
    if(mn) guarda('nm_meses', parseInt(mn[1], 10), mn[0]);
    var ma = /assunto\s*[:\-]?\s*([^\n]{8,140})/.exec(origSem);
    if(ma){ var pa = origSem.indexOf(ma[0]); var orA = orig.slice(pa, pa + ma[0].length).replace(/^assunto\s*[:\-]?\s*/i, '').trim(); guarda('assunto', orA, 'assunto: ' + orA.slice(0, 60)); }
    if(/cessao\s+de\s+credito|cessionari/.test(t)){ var mcs = /[^\n]{0,40}(cessao\s+de\s+credito|cessionari)[^\n]{0,40}/.exec(t); guarda('vendeu_prc', 'Sim', mcs ? mcs[0].trim() : 'cessão de crédito'); }
    return achados;
  }
  function rotuloCampo(k){ var c = CAMPOS.filter(function(x){ return x.k === k; })[0]; return c ? c.r : k; }
  function origemTxt(o){ if(!o) return ''; return (o.arquivo || 'texto colado') + (o.pagina ? ' · pág. ' + o.pagina : '') + (o.imagem ? ' (lida da imagem)' : ''); }
  function blocoLeitor(){
    return '<div class="cl-leitor" id="clLeitor"><div class="cl-leitor-topo"><b>Ler os documentos</b> <span>Solte aqui o requisitório, o espelho do tribunal e o demonstrativo (PDF, foto ou print) ou puxe da pasta do cliente: o SAGA acha os valores e mostra de onde veio cada um para você conferir. PDF escaneado é lido pela imagem. Tudo é lido neste computador.</span></div>'
      + '<div class="cl-leitor-acoes"><label class="cl-arq">Escolher arquivos<input type="file" id="clArquivos" accept="application/pdf,.pdf,.txt,image/*" multiple hidden></label>'
      + '<button type="button" id="clDaPasta">Ler da pasta do cliente</button>'
      + '<button type="button" id="clColarAbrir">Colar o texto</button></div>'
      + '<div id="clColar" hidden><textarea id="clTexto" rows="4" placeholder="Cole aqui o texto copiado do requisitório ou do espelho"></textarea><div class="cl-botoes" style="margin-top:6px"><button type="button" id="clLerTexto">Ler o texto colado</button></div></div>'
      + '<div id="clLidos"></div></div>';
  }
  function mostrarLidos(achados, origem, avisoExtra){
    var box = document.getElementById('clLidos'); if(!box) return;
    var ks = Object.keys(achados).filter(function(k){ return CAMPOS.some(function(c){ return c.k === k; }); });
    if(!ks.length){
      box.innerHTML = '<div class="cl-aviso"><b>Não achei os valores em ' + esc(origem) + '.</b> ' + esc(avisoExtra || 'Confira se é o requisitório ou o espelho do tribunal; se for, copie o texto do PDF e use "Colar o texto", ou digite os valores.') + '</div>';
      return;
    }
    var h = '<div class="cl-lidos-caixa"><div class="cl-aviso" style="margin-top:0"><b>Lido de ' + esc(origem) + ': confira cada número</b> antes de usar (a coluna "De onde veio" mostra o arquivo, a página e o trecho). Campo já preenchido com outro valor vem desmarcado.' + (avisoExtra ? ' ' + esc(avisoExtra) : '') + '</div><table><tbody><tr><td><b>Campo</b></td><td><b>De onde veio</b></td><td><b>Valor</b></td></tr>';
    ks.forEach(function(k){
      var a = achados[k], c = CAMPOS.filter(function(x){ return x.k === k; })[0], el = document.getElementById('cl_' + k);
      var atual = el ? el.value.trim() : '', novo = valorCampo(c, a.valor);
      var marca = !atual || atual === novo;
      var o = a.origem || {};
      h += '<tr><td><label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-cl-lido="' + esc(k) + '" data-cl-valor="' + esc(novo) + '"' + (marca ? ' checked' : '') + '> <span>' + esc(rotuloCampo(k))
        + (a.outros.length ? '<br><small style="color:#b45309">Achei também: ' + a.outros.map(function(x){ return esc(valorCampo(c, x)); }).join(', ') + ' (mais de um beneficiário ou parcela? use o do cliente)</small>' : '')
        + (atual && atual !== novo ? '<br><small>Hoje no campo: ' + esc(atual) + '</small>' : '') + '</span></label></td>'
        + '<td style="text-align:left;font-size:11.5px"><b>' + esc(origemTxt(o)) + '</b>' + (a.trecho ? '<br><small style="color:var(--muted)">“' + esc(String(a.trecho).slice(0, 110)) + '”</small>' : '') + (o.imagem ? '<br><small style="color:#b45309">Lido da imagem: confira cada número.</small>' : '') + '</td>'
        + '<td>' + esc(novo) + '</td></tr>';
    });
    h += '</tbody></table><div class="cl-botoes" style="margin-top:8px"><button type="button" id="clLidosDescartar">Descartar</button><button type="button" class="pri" id="clLidosUsar">Usar os marcados</button></div></div>';
    box.innerHTML = h;
    document.getElementById('clLidosDescartar').onclick = function(){ box.innerHTML = ''; };
    document.getElementById('clLidosUsar').onclick = function(){
      var n = 0; S.origem = S.origem || {};
      box.querySelectorAll('[data-cl-lido]').forEach(function(cb){
        if(!cb.checked) return; var k = cb.getAttribute('data-cl-lido'), el = document.getElementById('cl_' + k); if(!el || el.disabled) return;
        el.value = cb.getAttribute('data-cl-valor'); el.classList.add('cl-veio-doc');
        var a = achados[k] || {}; S.origem[k] = Object.assign({}, a.origem || {}, { trecho: String(a.trecho || '').slice(0, 160) });
        mostrarOrigem(k); el.dispatchEvent(new Event('change')); n++;
      });
      box.innerHTML = '<div class="cl-ok">' + n + ' valor(es) preenchido(s) a partir do documento (contorno amarelo; embaixo de cada um, de onde veio). Confira com o documento e complete o que falta (LOA, demonstrativo, SELIC).</div>';
    };
  }
  function mostrarOrigem(k){
    var el = document.getElementById('cl_' + k); if(!el) return;
    var box = el.parentNode, s = box.querySelector('.cl-origem'), o = (S.origem || {})[k];
    if(!o){ if(s) s.remove(); return; }
    if(!s){ s = document.createElement('small'); s.className = 'cl-origem'; box.appendChild(s); }
    s.textContent = 'Veio de: ' + origemTxt(o) + (o.trecho ? ' · “' + String(o.trecho).slice(0, 70) + '”' : '');
    s.title = o.trecho || '';
  }
  function juntarAchados(total, novos){
    Object.keys(novos).forEach(function(k){
      if(!total[k]){ total[k] = novos[k]; return; }
      [novos[k].valor].concat(novos[k].outros || []).forEach(function(v){ if(String(v) !== String(total[k].valor) && total[k].outros.indexOf(v) < 0) total[k].outros.push(v); });
    });
  }
  function versaoArq(){ var v = versao(); return v ? '?v=' + v : ''; }
  function leitor(){
    if(window.SagaLeitorDocs) return Promise.resolve(window.SagaLeitorDocs);
    return new Promise(function(ok, falha){ var s = document.createElement('script'); s.src = 'saga_leitor_docs.js' + versaoArq(); s.onload = function(){ window.SagaLeitorDocs ? ok(window.SagaLeitorDocs) : falha(new Error('o leitor de documentos não carregou')); }; s.onerror = function(){ falha(new Error('não consegui carregar o leitor de documentos (saga_leitor_docs.js)')); }; document.head.appendChild(s); });
  }
  async function lerArquivos(lista){
    var box = document.getElementById('clLidos'); if(!lista || !lista.length) return;
    box.innerHTML = '<div class="cl-sub" id="clProg">Lendo ' + lista.length + ' arquivo(s)...</div>';
    var achados = {}, nomes = [], semTexto = [], erros = [], comImagem = [];
    var L; try{ L = await leitor(); }catch(e){ box.innerHTML = '<div class="cl-erro"><b>Não consegui ler:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>'; return; }
    for(var i = 0; i < lista.length; i++){
      var f = lista[i]; nomes.push(f.name);
      try{
        var r = await L.lerArquivo(f, { progresso: function(m){ var p = document.getElementById('clProg'); if(p) p.textContent = 'Lendo "' + f.name + '": ' + m; } });
        if(r.texto.replace(/\s/g, '').length < 30){ semTexto.push(f.name); continue; }
        if(r.paginas_imagem) comImagem.push(f.name);
        juntarAchados(achados, L.acharNasPaginas(r.paginas, lerTexto, f.name));
      }catch(e){ erros.push(f.name + ' (' + ((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + ')'); }
    }
    var extra = (comImagem.length ? 'Lido da imagem (escaneado/foto): ' + comImagem.join(', ') + '; confira os números com atenção. ' : '')
      + (semTexto.length ? 'Não achei texto em: ' + semTexto.join(', ') + ' (imagem ilegível?); digite os valores. ' : '')
      + (erros.length ? 'Não abriu: ' + erros.join('; ') + '.' : '');
    mostrarLidos(achados, nomes.length === 1 ? nomes[0] : nomes.length + ' arquivos', extra.trim());
  }
  /* 19/11 (bloco 269, pedido B) e 21/11 (bloco 322): pega sozinho o requisitório, o espelho e o demonstrativo já guardados na pasta
     do cliente; o que já foi lido antes vem pronto (documentos_leituras), sem ler de novo */
  var RX_DOC = /requisit|espelho|precat|\brpv\b|prc\d|demonstrat|extrato|loa\b|or[cç]ament|planilha|c[aá]lculo/i;
  /* pastas onde ficam o requisitório, o espelho e o demonstrativo (e as subpastas delas): Documentos probatórios, Requisitório, Espelhos */
  var RX_PASTA_CRED = /probat|requisit|espelho|precat|\brpv\b/i;
  async function pastasDoCredito(docs){
    var ids = docs.map(function(d){ return d.pasta_id; }).filter(Boolean).filter(function(v, i, a){ return a.indexOf(v) === i; }), ok = {};
    if(!ids.length) return ok;
    var rp = await sb().from('pastas_cliente').select('id,nome,pai_id').in('id', ids);
    if(rp.error) return ok;
    var mapa = {}; (rp.data || []).forEach(function(p){ mapa[p.id] = p; });
    var pais = (rp.data || []).map(function(p){ return p.pai_id; }).filter(function(x){ return x && !mapa[x]; });
    if(pais.length){ var rq = await sb().from('pastas_cliente').select('id,nome,pai_id').in('id', pais); if(!rq.error) (rq.data || []).forEach(function(p){ mapa[p.id] = p; }); }
    ids.forEach(function(id){ var p = mapa[id], n = 0; while(p && n++ < 4){ if(RX_PASTA_CRED.test(p.nome || '')){ ok[id] = true; break; } p = mapa[p.pai_id]; } });
    return ok;
  }
  async function lerDaPasta(){
    var box = document.getElementById('clLidos');
    box.innerHTML = '<div class="cl-sub" id="clProg">Procurando o requisitório e o espelho na pasta do cliente…</div>';
    try{
      var L = await leitor();
      var r = await sb().from('documentos').select('id,nome_arquivo,caminho_storage,criado_em,pasta_id').eq('processo_id', S.ctx.processoId)
        .or('excluido_logico.is.null,excluido_logico.eq.false').order('criado_em', { ascending: false }).limit(200);
      if(r.error) throw r.error;
      var docs = (r.data || []).filter(function(d){ return /\.(pdf|png|jpe?g|webp)$/i.test(d.nome_arquivo || ''); });
      /* 22/11 (Dr. Victor, bloco 391): também tudo o que está nas pastas "Documentos probatórios" e "Requisitório", qualquer que seja o nome do arquivo */
      var pastasProb = await pastasDoCredito(docs);
      var alvo = docs.filter(function(d){ return pastasProb[d.pasta_id] || RX_DOC.test(d.nome_arquivo || ''); })
        .sort(function(a, b){ return (RX_DOC.test(b.nome_arquivo || '') ? 1 : 0) - (RX_DOC.test(a.nome_arquivo || '') ? 1 : 0); }).slice(0, 8);
      if(!alvo.length){
        box.innerHTML = '<div class="cl-aviso"><b>Não achei o requisitório nem o espelho na pasta deste processo.</b> Procurei nas pastas "Documentos probatórios" e "Requisitório" e arquivos com "requisitório", "espelho", "precatório", "RPV", "demonstrativo", "planilha", "cálculo" ou "LOA" no nome ('
          + docs.length + ' PDF/imagem na pasta). Guarde o documento na ficha com um desses nomes, ou solte o arquivo aqui.</div>';
        return;
      }
      var achados = {}, erros = [], guardados = 0, comImagem = [], semGuardar = [];
      for(var i = 0; i < alvo.length; i++){
        var d = alvo[i];
        try{
          var x = await L.lerDocumento(sb(), d, { progresso: function(m){ var p = document.getElementById('clProg'); if(p) p.textContent = 'Lendo "' + d.nome_arquivo + '" (' + (i + 1) + ' de ' + alvo.length + '): ' + m; } });
          if(x.guardada) guardados++;
          if(x.paginas_imagem) comImagem.push(d.nome_arquivo);
          if(x.erroGuardar) semGuardar.push(d.nome_arquivo + ' (' + x.erroGuardar + ')');
          juntarAchados(achados, L.acharNasPaginas(x.paginas, lerTexto, d.nome_arquivo));
        }catch(e){ erros.push(d.nome_arquivo + ' (' + ((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + ')'); }
      }
      var extra = 'Documentos lidos: ' + alvo.map(function(d){ return d.nome_arquivo; }).join(', ') + '.'
        + (guardados ? ' ' + guardados + ' já tinham sido lidos antes (sem ler de novo).' : '')
        + (comImagem.length ? ' Lido da imagem: ' + comImagem.join(', ') + '; confira com atenção.' : '')
        + (semGuardar.length ? ' Não guardei a leitura de: ' + semGuardar.join('; ') + '.' : '')
        + (erros.length ? ' Não abriu: ' + erros.join('; ') + '.' : '');
      mostrarLidos(achados, 'a pasta do cliente', extra);
    }catch(e){ box.innerHTML = '<div class="cl-erro"><b>Não consegui ler a pasta do cliente:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>'; }
  }
  function ligarLeitor(){
    var zona = document.getElementById('clLeitor'), inp = document.getElementById('clArquivos'); if(!zona) return;
    inp.onchange = function(){ lerArquivos(Array.prototype.slice.call(inp.files || [])); inp.value = ''; };
    zona.addEventListener('dragover', function(e){ e.preventDefault(); zona.classList.add('arrastando'); });
    zona.addEventListener('dragleave', function(){ zona.classList.remove('arrastando'); });
    zona.addEventListener('drop', function(e){ e.preventDefault(); zona.classList.remove('arrastando'); lerArquivos(Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || [])); });
    document.getElementById('clColarAbrir').onclick = function(){ var c = document.getElementById('clColar'); if(window.sagaRecolher){ try{ window.sagaRecolher(c, !c.hidden ? false : true); return; }catch(x){} } c.hidden = !c.hidden; };
    document.getElementById('clDaPasta').onclick = lerDaPasta;
    document.getElementById('clLerTexto').onclick = function(){ var t = document.getElementById('clTexto').value, a = lerTexto(t); Object.keys(a).forEach(function(k){ a[k].origem = { arquivo: 'texto colado' }; }); mostrarLidos(a, 'o texto colado'); };
  }

  function css(){
    if(document.getElementById('sagaCalculosCss')) return;
    var s = document.createElement('style'); s.id = 'sagaCalculosCss';
    s.textContent = [
      '#calcModal{position:fixed;inset:0;z-index:1250;display:flex;align-items:safe center;justify-content:center;padding:24px 16px;overscroll-behavior:contain;background:color-mix(in srgb,#000 55%,transparent);opacity:0;visibility:hidden;transition:opacity .3s cubic-bezier(.22,.78,.25,1),visibility .3s}',
      '#calcModal.aberto{opacity:1;visibility:visible}#calcModal.sem-movimento{transition:none}',
      '#calcModal .cl-caixa{background:var(--panel-solid,var(--panel));color:var(--text);border:1px solid var(--border);border-radius:16px;width:min(1100px,100%);box-sizing:border-box;max-height:100%;min-height:min(640px,100%);overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);overscroll-behavior:contain}',
      '#calcModal h3{margin:0 0 4px;font-size:18px}#calcModal .cl-sub{color:var(--muted);font-size:12.5px;margin-bottom:12px}',
      '#calcModal .cl-grade{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:18px}',
      '#calcModal .cl-g{grid-column:1/-1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin:12px 0 2px}',
      '#calcModal .cl-campos{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}',
      '#calcModal .cl-campo{display:flex;flex-direction:column;gap:3px;min-width:0}#calcModal .cl-campo label{font-size:11.5px;color:var(--muted)}',
      '#calcModal .cl-campo small{font-size:10.5px;color:var(--muted)}#calcModal .cl-campo a{font-size:11px;color:var(--gold)}#calcModal .cl-campo small.cl-origem{color:#b45309;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#calcModal .cl-res{position:sticky;top:0;align-self:start;border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:color-mix(in srgb,var(--text) 3%,var(--panel-solid,var(--panel)))}',
      '#calcModal table{width:100%;border-collapse:collapse;font-size:12.5px}#calcModal td{padding:4px 0;border-bottom:1px solid var(--border-soft,var(--border))}#calcModal td:last-child{text-align:right;font-variant-numeric:lining-nums tabular-nums}',
      '#calcModal .cl-total td{font-weight:700;border-bottom:0;padding-top:8px}',
      '#calcModal .cl-selo{display:inline-block;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:8px}',
      '#calcModal .cl-selo.ok{color:#16a34a;background:color-mix(in srgb,#16a34a 14%,transparent)}#calcModal .cl-selo.nao{color:#dc2626;background:color-mix(in srgb,#dc2626 12%,transparent)}',
      '#calcModal .cl-aviso{font-size:12px;margin-top:8px;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,#eab308 55%,transparent);background:color-mix(in srgb,#eab308 9%,transparent)}',
      '#calcModal .cl-erro{color:#dc2626;font-size:12.5px;margin-top:8px}#calcModal .cl-ok{color:var(--gold);font-size:12.5px;margin-top:8px}',
      '#calcModal .cl-botoes{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}',
      '#calcModal .cl-botoes button{font:inherit;font-size:12.5px;padding:9px 16px;border-radius:10px;border:1px solid var(--sb-sec-borda,var(--border));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer}',
      '#calcModal .cl-botoes button.pri{background:var(--sb-acao);border-color:var(--sb-acao-borda)}#calcModal .cl-botoes button[disabled]{opacity:.55;cursor:not-allowed}',
      '#calcModal .cl-leitor{border:1px dashed var(--border);border-radius:12px;padding:10px 12px;margin:4px 0 6px;transition:border-color .25s cubic-bezier(.22,.78,.25,1),background .25s cubic-bezier(.22,.78,.25,1)}',
      '#calcModal .cl-leitor.arrastando{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 8%,transparent)}',
      '#calcModal .cl-leitor-topo{font-size:12.5px}#calcModal .cl-leitor-topo span{color:var(--muted)}',
      '#calcModal .cl-leitor-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
      '#calcModal .cl-leitor-acoes button,#calcModal .cl-arq{font:inherit;font-size:12px;padding:7px 12px;border-radius:10px;border:1px solid var(--sb-sec-borda,var(--border));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer}',
      '#calcModal textarea{width:100%;margin-top:8px;font:inherit;font-size:12.5px}#calcModal .cl-lidos-caixa{margin-top:8px}',
      '#calcModal input.cl-veio-doc{outline:2px solid color-mix(in srgb,#eab308 70%,transparent);outline-offset:1px}',
      '@media (max-width:820px){#calcModal .cl-grade{grid-template-columns:1fr}#calcModal .cl-campos{grid-template-columns:1fr}#calcModal .cl-res{position:static}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function modal(){
    var m = document.getElementById('calcModal'); if(m) return m;
    css();
    m = document.createElement('div'); m.id = 'calcModal'; m.setAttribute('data-saga-movimento-proprio', '1');
    m.innerHTML = '<div class="cl-caixa" role="dialog" aria-modal="true" aria-labelledby="clTitulo"><div id="clConteudo"></div></div>';
    m.addEventListener('click', function(e){ if(e.target === m) fechar(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && m.classList.contains('aberto')) fechar(); });
    document.body.appendChild(m);
    return m;
  }
  function fechar(){ var m = document.getElementById('calcModal'); if(m) m.classList.remove('aberto'); }

  function resultadoHtml(e, r){
    var t = r.tese, c = r.cumprimento, q = r.req;
    var h = '<div class="cl-selo ' + (r.valido ? 'ok' : 'nao') + '">' + (r.valido ? 'Há valor a restituir: ' + esc(reais(r.total_restituir)) : (r.faltando.length ? 'Faltam dados para concluir' : 'Sem valor a restituir com estes dados')) + '</div>';
    h += '<table><tbody>'
      + '<tr><td>PSS máximo sobre o principal (11%)</td><td>' + esc(reais(q.C54)) + '</td></tr>'
      + '<tr><td>PSS cobrado sobre os juros (indevido)</td><td>' + esc(reais(Math.max(q.E54, 0) || 0)) + '</td></tr>'
      + (t.proporcao_1997 != null ? '<tr><td>Proporção até 06/1997</td><td>' + esc(pct(t.proporcao_1997)) + '</td></tr><tr><td>Parcela do principal até 06/1997</td><td>' + esc(reais(t.parcela_ate_1997)) + '</td></tr><tr><td>PSS a maior (5%)</td><td>' + esc(reais(t.excesso_5)) + '</td></tr>' : '')
      + (t.isencao ? '<tr><td>Isenção total</td><td>' + esc(reais(t.isencao)) + '</td></tr>' : '')
      + '<tr class="cl-total"><td>Base a restituir (sem SELIC)</td><td>' + esc(reais(t.base_total)) + '</td></tr>'
      + '<tr><td>Corrigido pela SELIC (1ª retenção)</td><td>' + esc(reais(c.G6 + c.G12)) + '</td></tr>'
      + (c.G9 ? '<tr><td>2ª parcela corrigida</td><td>' + esc(reais(c.G9)) + '</td></tr>' : '')
      + '<tr class="cl-total"><td>Total do cumprimento</td><td>' + esc(reais(c.total)) + '</td></tr>'
      + '<tr><td>Honorários contratuais (' + esc(pct(c.pct_contratuais, 1)) + ')</td><td>' + esc(reais(c.honorarios_contratuais)) + '</td></tr>'
      + c.divisao.map(function(l){ return '<tr><td style="padding-left:12px">' + esc(l.nome) + ' (' + esc(pct(l.pct, 1)) + ')</td><td>' + esc(reais(l.valor)) + '</td></tr>'; }).join('')
      + '<tr><td>Honorários de sucumbência (' + esc(pct(c.pct_sucumbencia, 1)) + ')</td><td>' + esc(reais(c.honorarios_sucumbencia)) + '</td></tr>'
      + '<tr class="cl-total"><td>Valor do autor</td><td>' + esc(reais(c.valor_autor)) + '</td></tr>'
      + '</tbody></table>'
      + '<table style="margin-top:8px"><tbody><tr><td>Conferência: principal + juros + honorários</td><td>' + esc(reais(q.A55)) + '</td></tr><tr><td>Principal + juros</td><td>' + esc(reais(q.A58)) + '</td></tr></tbody></table>';
    if(r.faltando.length) h += '<div class="cl-aviso"><b>Falta:</b> ' + r.faltando.map(esc).join('; ') + '.</div>';
    r.avisos.forEach(function(a){ h += '<div class="cl-aviso">' + esc(a) + '</div>'; });
    return h;
  }

  async function abrir(ctx){
    S.ctx = ctx || {};
    var m = modal();
    document.getElementById('clConteudo').innerHTML = '<h3 id="clTitulo">Cálculo do PSS</h3><div class="cl-sub">Carregando...</div>';
    m.classList.toggle('sem-movimento', reduzido());
    requestAnimationFrame(function(){ m.classList.add('aberto'); });
    var info = null, erro = null;
    try{ var r = await sb().rpc('calculo_do_processo', { p_processo_id: S.ctx.processoId }); if(r.error) throw r.error; info = r.data || {}; }
    catch(x){ erro = x.message || String(x); }
    S.pode = !!(info && info.pode); S.atual = info && info.atual;
    var ent = (S.atual && S.atual.entradas) || S.ctx.entradas || {};
    var grade = '', abertos = false;
    CAMPOS.forEach(function(c){
      if(c.g){ grade += (abertos ? '</div>' : '') + '<div class="cl-g">' + esc(c.g) + '</div><div class="cl-campos">'; abertos = true; return; }
      var id = 'cl_' + c.k, v = valorCampo(c, ent[c.k]);
      if(c.f === 'sim'){ grade += '<label class="cl-campo" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="' + id + '"' + (ent[c.k] ? ' checked' : '') + '> <span style="font-size:12.5px">' + esc(c.r) + '</span></label>'; return; }
      grade += '<div class="cl-campo"><label for="' + id + '">' + esc(c.r) + '</label><input type="text" id="' + id + '" value="' + esc(v) + '"' + (c.f === 'reais' || c.f === 'data' ? ' inputmode="numeric"' : '') + ' placeholder="' + esc(c.ex ? 'Ex.: ' + c.ex : (c.f === 'reais' ? '0,00' : '')) + '">'
        + (c.calc ? '<a href="#" data-cl-calc="' + c.calc + '">Abrir a Calculadora do Cidadão com estas datas ↗</a><a href="#" data-cl-bcb="' + c.calc + '">Ou buscar a SELIC no Banco Central (para conferir)</a>' : '') + (c.dica ? '<small>' + esc(c.dica) + '</small>' : '') + '</div>';
    });
    if(abertos) grade += '</div>';
    var sit = S.atual ? ('Versão ' + S.atual.versao + ' · ' + (S.atual.situacao === 'conferido' ? 'conferido por ' + (S.atual.conferido_por_nome || '') + ' em ' + new Date(S.atual.conferido_em).toLocaleDateString('pt-BR') : 'rascunho de ' + (S.atual.criado_por_nome || '')) ) : 'Ainda não há cálculo salvo neste processo.';
    document.getElementById('clConteudo').innerHTML = '<h3 id="clTitulo">Cálculo do PSS' + (S.ctx.titulo ? ' · ' + esc(S.ctx.titulo) : '') + '</h3>'
      + '<div class="cl-sub">' + esc(sit) + ' As fórmulas são as da planilha matriz do PSS. Use só o que está nos documentos (requisitório, espelho, demonstrativo, contrato); o índice SELIC vem da Calculadora do Cidadão e o print vai para a pasta do processo.</div>'
      + (erro ? '<div class="cl-erro"><b>Não deu para ler o cálculo salvo:</b> ' + esc(erro) + '</div>' : '')
      + (!S.pode ? '<div class="cl-aviso">Você pode ver o cálculo, mas só o Jurídico salva e confere (permissão "Petições e cálculos").</div>' : '')
      + (S.pode ? blocoLeitor() : '')
      + '<div class="cl-grade"><div>' + grade + '</div><div class="cl-res" id="clRes"></div></div>'
      + '<div id="clMsg"></div>'
      + '<div class="cl-botoes"><button type="button" data-cl-fechar>Fechar</button>'
      + (window.SagaPdf ? '<button type="button" id="clPdf">Resumo em PDF</button>' : '')
      + '<button type="button" id="clPlanilhas" title="Abre as planilhas do cálculo (apuração, cumprimento, individualizada, herdeiros e IR-RRA) para editar e exportar em PDF ou Excel">Planilhas do cálculo ↗</button>'
      + '<button type="button" id="clSalvar"' + (S.pode ? '' : ' disabled') + '>Salvar rascunho</button>'
      + '<button type="button" class="pri" id="clConferir"' + (S.pode ? '' : ' disabled') + '>Conferi: salvar no processo</button></div>';
    CAMPOS.forEach(function(c){ if(c.k && c.f && c.f !== 'sim'){ var el = document.getElementById('cl_' + c.k); if(el) mascara(el, c.f); } });
    /* de onde veio cada dado lido dos documentos (fica salvo junto do cálculo) */
    S.origem = Object.assign({}, ent._origem || {});
    Object.keys(S.origem).forEach(mostrarOrigem);
    CAMPOS.forEach(function(c){ if(!c.k) return; var el = document.getElementById('cl_' + c.k); if(el) el.addEventListener('input', function(){ if(S.origem && S.origem[c.k]){ delete S.origem[c.k]; el.classList.remove('cl-veio-doc'); mostrarOrigem(c.k); } }); });
    ligarLeitor();
    /* sem cálculo salvo: já procura e lê sozinho os documentos da pasta (ele só confere) */
    if(S.pode && !S.atual) lerDaPasta();
    var res = document.getElementById('clRes');
    function atualizar(){ var e = ler(); res.innerHTML = resultadoHtml(e, calcular(e)); }
    document.querySelectorAll('#calcModal input').forEach(function(i){ i.addEventListener('input', atualizar); i.addEventListener('change', atualizar); });
    document.querySelectorAll('[data-cl-calc]').forEach(function(a){ a.onclick = function(ev){ ev.preventDefault(); var u = linkCalculadora(+a.getAttribute('data-cl-calc'));
      if(!u){ document.getElementById('clMsg').innerHTML = '<div class="cl-aviso">Para abrir a calculadora preencha a data do pagamento (ou a da 2ª retenção), a data final e os valores.</div>'; return; }
      window.open(u, '_blank', 'noopener'); }; });
    document.querySelectorAll('[data-cl-bcb]').forEach(function(a){ a.onclick = function(ev){ ev.preventDefault(); selicBancoCentral(+a.getAttribute('data-cl-bcb')); }; });
    var bpl = document.getElementById('clPlanilhas');
    if(bpl) bpl.onclick = function(){
      if(!S.atual){ document.getElementById('clMsg').innerHTML = '<div class="cl-aviso">Salve o cálculo (rascunho ou conferido) antes: as planilhas são montadas a partir do cálculo salvo.</div>'; return; }
      window.open('editor_planilha.html?modelo=pss&processo=' + encodeURIComponent(S.ctx.processoId) + versaoArq().replace('?', '&'), '_blank', 'noopener');
    };
    document.querySelector('[data-cl-fechar]').onclick = fechar;
    document.getElementById('clSalvar').onclick = function(){ salvar(false); };
    document.getElementById('clConferir').onclick = function(){ salvar(true); };
    var bp = document.getElementById('clPdf'); if(bp) bp.onclick = pdf;
    atualizar();
  }

  async function salvar(conferir){
    var e = ler(), r = calcular(e), msg = document.getElementById('clMsg');
    if(conferir && r.faltando.length){ msg.innerHTML = '<div class="cl-erro"><b>Não dá para marcar como conferido:</b> falta ' + r.faltando.map(esc).join('; ') + '.</div>'; return; }
    var b1 = document.getElementById('clSalvar'), b2 = document.getElementById('clConferir'); b1.disabled = b2.disabled = true;
    try{
      r.campos_peticao = camposPeticao(e, r);
      var x = await sb().rpc('calculo_salvar', { p_processo_id: S.ctx.processoId, p_entradas: e, p_resultado: r, p_valido: !!r.valido, p_total: r.total_restituir || 0, p_conferir: !!conferir });
      if(x.error) throw x.error;
      msg.innerHTML = '<div class="cl-ok">' + (conferir ? 'Cálculo conferido e salvo no processo.' : 'Rascunho salvo.') + ' Os valores já entram na petição de PSS deste processo.</div>';
      if(typeof S.ctx.aoSalvar === 'function'){ try{ S.ctx.aoSalvar({ entradas: e, resultado: r }); }catch(z){} }
    }catch(z){ msg.innerHTML = '<div class="cl-erro"><b>Não salvou:</b> ' + esc(z.message || z) + '</div>'; }
    finally{ b1.disabled = b2.disabled = !S.pode; }
  }

  function pdf(){
    var e = ler(), r = calcular(e), c = r.cumprimento, t = r.tese;
    var linhas = function(arr){ return arr.map(function(l){ return '<tr><td>' + esc(l[0]) + '</td><td style="text-align:right">' + esc(l[1]) + '</td></tr>'; }).join(''); };
    var html = '<h2>Planilha de cálculo · PSS</h2>'
      + '<table class="tab"><tbody>' + linhas([['Requisitório', e.prc || ''], ['Data-base', e.data_base || ''], ['Data da atualização', e.data_atualizacao || ''],
          ['PSS recolhido no requisitório', reais(e.pss_recolhido)], ['PSS máximo sobre o principal (11%)', reais(r.req.C54)], ['PSS sobre os juros (indevido)', reais(Math.max(r.req.E54, 0) || 0)],
          ['Proporção das competências até 06/1997', t.proporcao_1997 != null ? pct(t.proporcao_1997) : '-'], ['PSS a maior (5%)', reais(t.excesso_5)], ['Isenção total', reais(t.isencao)]]) + '</tbody></table>'
      + '<h3>Cumprimento de sentença</h3><table class="tab"><tbody>' + linhas([['Valor a restituir (1ª retenção)', reais(c.D6 + c.D12)], ['SELIC (1ª retenção)', e.selic_1 != null ? pct(e.selic_1, 6) : '-'],
          ['Corrigido', reais(c.G6 + c.G12)], ['2ª parcela corrigida', reais(c.G9)], ['TOTAL', reais(c.total)], ['Honorários contratuais', reais(c.honorarios_contratuais)],
          ['Honorários de sucumbência', reais(c.honorarios_sucumbencia)], ['Valor do autor', reais(c.valor_autor)]].concat(c.divisao.map(function(l){ return [l.nome + ' (' + pct(l.pct, 1) + ')', reais(l.valor)]; }))) + '</tbody></table>'
      + (r.avisos.length ? '<p><b>Atenção:</b> ' + r.avisos.map(esc).join(' ') + '</p>' : '');
    window.SagaPdf.imprimir({ titulo: 'Cálculo do PSS', subtitulo: S.ctx.titulo || '', arquivo: 'Calculo_PSS', paginas: [html] });
  }

  return { abrir: abrir, calcular: calcular, camposPeticao: camposPeticao, lerTexto: lerTexto };
})();
