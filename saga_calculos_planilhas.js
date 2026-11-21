/* SAGA · Planilhas do cálculo do PSS montadas sozinhas (21/11/2026, Dr. Victor; blocos 320 e 321)
   A partir do cálculo do processo (calculos_processo, bloco 267) e da ficha (peticao_dados), monta a pasta de trabalho
   com as MESMAS fórmulas da planilha matriz, organizada no padrão do SAGA:
     1. Apuração do PSS        = 1ª aba da matriz ("Planilha para apuração de valor") + a tese dos 6% do cálculo do SAGA
     2. Cumprimento PSS        = "Plan. Cump. de sentença - PSS" (com as correções fixas da skill preenchimento-planilha-inicial-pss)
     3. Planilha individualizada (a que vai para os autos)
     4. Divisão entre herdeiros (partes do processo com a cota)
     5. Cumprimento IR-RRA     = "Plan. Cump. de Sent. - IR-RRA" (estrutura e fórmulas da matriz; pontos a conferir marcados)
   Onde a matriz e a skill divergem: vale a correção da skill (aprovada pelo Dr. Victor) com uma nota na célula;
   o resto que parece erro fica como na matriz, marcado "a conferir com o Dr. Victor" (decisão dele, 21/11).
   Os dados fixos dos advogados vêm do banco (calculos_config, bloco 321), nunca do código.
   Uso: SagaCalculosPlanilhas.montar({sb, processoId}) → {titulo, pasta, calculo_id, avisosTela}
        SagaCalculosPlanilhas.construir(entradas, ficha, config) → pasta (sem banco; usado nos testes) */
(function(raiz){
  'use strict';
  var A1 = 'Apuração do PSS', CP = 'Cumprimento PSS', IND = 'Planilha individualizada', HER = 'Divisão entre herdeiros', IR = 'Cumprimento IR-RRA';
  function q(n){ return "'" + n.replace(/'/g, "''") + "'!"; }
  function Aba(nome, larguras){
    var a = { nome: nome, celulas: {}, colunas: {}, mesclas: [] };
    'ABCDEFGHIJKL'.split('').forEach(function(l, i){ if(larguras[i]) a.colunas[l] = larguras[i]; });
    return {
      a: a,
      p: function(r, x){ var c = a.celulas[r] || (a.celulas[r] = {}); Object.keys(x).forEach(function(k){ if(x[k] !== undefined && x[k] !== null && x[k] !== '') c[k] = x[k]; }); if(!Object.keys(c).length) delete a.celulas[r]; return this; },
      m: function(f){ a.mesclas.push(f); return this; }
    };
  }
  function num(v){ if(v == null || v === '') return null; var n = typeof v === 'number' ? v : (window.SagaPlanilhasMotor || raiz.SagaPlanilhasMotor).lerNumeroBR(String(v)); return n == null || !isFinite(n) ? null : n; }
  function data(v){ return v ? (raiz.SagaPlanilhasMotor.lerData(v)) : null; }
  function cnj(n){ var d = String(n || '').replace(/\D/g, ''); return d.length === 20 ? d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d.slice(13, 14) + '.' + d.slice(14, 16) + '.' + d.slice(16) : (n || ''); }
  var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  function hojeExtenso(){ var h = new Date(); return h.getDate() + ' de ' + MESES[h.getMonth()] + ' de ' + h.getFullYear(); }

  /* advogados do contrato (os que têm % > 0 no cálculo); a ordem segue a matriz: Sarmento, Victor, Valdenor */
  function advogados(e, cfg){
    var lista = (cfg && cfg.advogados) || [], por = {}; lista.forEach(function(x){ por[x.chave] = x; });
    var pct = { sarmento: num(e.pct_sarmento), victor: num(e.pct_victor), valdenor: num(e.pct_valdenor) };
    var padrao = pct.sarmento == null && pct.victor == null;
    if(padrao){ pct.sarmento = 0.114; pct.victor = 0.136; }
    return { padrao: padrao, lista: ['sarmento', 'victor', 'valdenor'].filter(function(k){ return pct[k] > 0; }).map(function(k){
      var x = por[k] || { chave: k, nome: k, nome_planilha: k.toUpperCase(), doc: '', oab: '' };
      return { chave: k, nome: x.nome, nome_planilha: x.nome_planilha || x.nome, doc: x.doc || '', oab: x.oab || '', pct: pct[k] };
    }) };
  }

  function construir(e, ficha, cfg){
    e = e || {}; ficha = ficha || {}; cfg = cfg || {};
    var pes = ficha.pessoa || {}, pro = ficha.processo || {};
    var adv = advogados(e, cfg), avisos = [];
    var nome = e.beneficiario || pes.nome || '', cpf = e.cpf_beneficiario || pes.cpf || '';

    /* ---------- 1. Apuração do PSS ---------- */
    var a = Aba(A1, [400, 160, 120]);
    a.p('A1', { v: 'APURAÇÃO DO PSS (VIABILIDADE)', fundo: 'titulo' }).m('A1:C1');
    a.p('A2', { v: 'Mesmas fórmulas da 1ª aba da planilha matriz ("Planilha para apuração de valor"). A coluna C diz a célula correspondente na matriz.', cinza: true, q: true }).m('A2:C2');
    a.p('A4', { v: '1. Identificação', fundo: 'secao' }).p('B4', { fundo: 'secao' }).p('C4', { v: 'Na matriz', fundo: 'secao', cinza: true });
    var id = [
      [5, 'Nome do beneficiário', nome, null, 'B1'], [6, 'CPF', cpf, 'texto', 'B2'], [7, 'Qualificação', e.qualificacao, null, 'B4'],
      [8, 'Nome do servidor originário', e.servidor_originario || nome, null, 'B6'], [9, 'CPF do servidor originário', e.cpf_servidor || cpf, 'texto', 'B7'],
      [10, 'Sequencial PRC/RPV', e.prc, null, 'B14'], [11, 'Data do pagamento (depósito efetivado)', data(e.data_pagamento), 'data', 'B15'],
      [12, 'Processo de execução', e.processo_execucao || cnj(pro.numero), null, 'B16'], [13, 'Assunto do processo', e.assunto, null, 'B17'],
      [14, 'Vendeu o PRC (cessão de crédito)', e.vendeu_prc, null, 'B18']
    ];
    id.forEach(function(x){ a.p('A' + x[0], { v: x[1] }).p('B' + x[0], { v: x[2], t: x[3], fundo: 'entrada' }).p('C' + x[0], { v: x[4], cinza: true }); });
    a.p('A16', { v: '2. Requisitório', fundo: 'secao' }).p('B16', { fundo: 'secao' }).p('C16', { fundo: 'secao' });
    [[17, 'Incidiu pelo valor total (Sim / Não / Parcial)', e.incidiu_total, null, 'B22'], [18, 'Nº de meses (NM, RRA)', num(e.nm_meses), 'int', 'B23'],
     [19, 'Data-base do requisitório', data(e.data_base), 'data', 'B24'], [20, 'Base IRPF RRA', num(e.base_irpf), 'reais', 'B25'], [21, 'Exercícios', e.exercicios, null, 'B29']]
      .forEach(function(x){ a.p('A' + x[0], { v: x[1] }).p('B' + x[0], { v: x[2], t: x[3], fundo: 'entrada' }).p('C' + x[0], { v: x[4], cinza: true }); });
    a.p('A23', { v: '3. Valores do requisitório e da LOA', fundo: 'secao' }).p('B23', { fundo: 'secao' }).p('C23', { fundo: 'secao' });
    [[24, 'Valor da LOA (coluna AO)', num(e.loa), 'A42'], [25, 'Líquido · valor principal (requisitório)', num(e.liq_principal), 'C42'], [26, 'Líquido · valor dos juros (requisitório)', num(e.liq_juros), 'E42'],
     [27, 'Valor recolhido do PSS no requisitório', num(e.pss_recolhido), 'A45'], [28, 'Honorários do requisitório (contratuais/cessão)', num(e.honorarios_req) || 0, 'A48'],
     [29, 'Valor total do requisitório (para conferir)', num(e.total_requisitorio), '-']]
      .forEach(function(x){ a.p('A' + x[0], { v: x[1] }).p('B' + x[0], { v: x[2], t: 'reais', fundo: 'entrada' }).p('C' + x[0], { v: x[3], cinza: true }); });
    a.p('A31', { v: '4. Conta (planilha matriz)', fundo: 'secao' }).p('B31', { fundo: 'secao' }).p('C31', { fundo: 'secao' });
    [[32, 'Valor principal + valor dos juros (líquidos)', '=SUM(B25,B26)', 'reais', 'A58'],
     [33, 'Percentual do principal', '=B25*100/B32/100', 'pct', 'C45'], [34, 'Percentual dos juros', '=B26*100/B32/100', 'pct', 'E45'],
     [35, 'Bruto · valor principal (requisitório)', '=B25+B33*B28', 'reais', 'C48'], [36, 'Bruto · valor dos juros (requisitório)', '=B26+B34*B28', 'reais', 'E48'],
     [37, 'Valor principal bruto pela LOA', '=B24*B33', 'reais', 'C51'], [38, 'Valor dos juros bruto pela LOA', '=B24*B34', 'reais', 'E51'],
     [39, 'PSS máximo a recolher · principal bruto (11%)', '=B35*0.11', 'reais', 'C54'], [40, 'PSS que caiu sobre os juros (PSS recolhido − máximo do principal)', '=B27-B39', 'reais', 'E54'],
     [41, 'Valor total do requisitório (principal + juros + honorários)', '=B25+B26+B28', 'reais', 'A55'],
     [42, 'Percentual de atualização · principal', '=(B44-B39)/B39', 'pct', 'C57'], [43, 'Percentual de atualização · juros', '=B42', 'pct', 'E57'],
     [44, 'Valor máximo a recolher do principal, atualizado pela LOA', '=B24*B33*0.11', 'reais', 'C60'], [45, 'Valor máximo a recolher dos juros, atualizado pela LOA', '=B40*B43+B40', 'reais', 'E60'],
     [46, 'Valor do principal retido no requisitório', '=B27*B33', 'reais', 'C63'], [47, 'Valor dos juros retido no requisitório', '=B27-B46', 'reais', 'E63']]
      .forEach(function(x){ a.p('A' + x[0], { v: x[1] }).p('B' + x[0], { f: x[2], t: x[3], casas: x[3] === 'pct' ? 4 : null }).p('C' + x[0], { v: x[4], cinza: true }); });
    a.p('A49', { v: '5. Tese dos 6% (competências até 06/1997) e isenção total', fundo: 'secao' }).p('B49', { fundo: 'secao' }).p('C49', { v: 'cálculo do SAGA', fundo: 'secao', cinza: true });
    a.p('A50', { v: 'Principal atualizado das competências até 06/1997 (demonstrativo)' }).p('B50', { v: num(e.principal_ate_1997), t: 'reais', fundo: 'entrada' });
    a.p('A51', { v: 'Principal atualizado de todo o período (demonstrativo)' }).p('B51', { v: num(e.principal_total_demonstrativo), t: 'reais', fundo: 'entrada' });
    a.p('A52', { v: 'Proporção das competências até 06/1997' }).p('B52', { f: '=IF(B51>0,B50/B51,0)', t: 'pct', casas: 4 });
    a.p('A53', { v: 'Principal requisitado na data-base' }).p('B53', num(e.principal_requisitado) != null ? { v: num(e.principal_requisitado), t: 'reais', fundo: 'entrada' } : { f: '=B35', t: 'reais', nota: 'Sem o valor do demonstrativo, usa o principal bruto do requisitório (B35), como o cálculo do SAGA.' });
    a.p('A54', { v: 'Parcela do principal das competências até 06/1997' }).p('B54', { f: '=ROUND(B53*B52,2)', t: 'reais' });
    a.p('A55', { v: 'PSS cobrado a maior (5% sobre a parcela até 06/1997)' }).p('B55', { f: '=ROUND(B54*0.05,2)', t: 'reais' });
    a.p('A56', { v: 'Isenção total (aposentado antes de 2004 ou sentença que define)? Sim / Não' }).p('B56', { v: e.isencao_total ? 'Sim' : 'Não', fundo: 'entrada', al: 'centro' });
    a.p('A57', { v: 'Valor da isenção total (mês a mês, 100%)' }).p('B57', { v: num(e.valor_isencao), t: 'reais', fundo: 'entrada' });
    a.p('A58', { v: 'PSS indevido sobre os juros' }).p('B58', { f: '=IF(B40>1,ROUND(B40,2),0)', t: 'reais' });
    a.p('A60', { v: '6. Resumo estratégico', fundo: 'secao' }).p('B60', { fundo: 'secao' }).p('C60', { fundo: 'secao' });
    a.p('A61', { v: 'Melhor tese' }).p('B61', { v: e.melhor_tese, fundo: 'entrada' }).p('C61', { v: 'B30', cinza: true });
    a.p('A62', { v: 'MÊS À MÊS · 100% (isenção total)' }).p('B62', { f: '=IF(B56="Sim",B57,0)', t: 'reais' }).p('C62', { v: 'B33', cinza: true });
    a.p('A63', { v: 'MÊS À MÊS · 5%' }).p('B63', { f: '=B55', t: 'reais' }).p('C63', { v: 'B34', cinza: true });
    a.p('A64', { v: 'JUROS DE MORA (PSS sobre os juros)' }).p('B64', { f: '=B58', t: 'reais' }).p('C64', { v: 'B35', cinza: true });
    a.p('A65', { v: 'Total a ser restituído (sem SELIC)', fundo: 'total' }).p('B65', { f: '=SUM(B62:B64)', t: 'reais', fundo: 'total' }).p('C65', { v: 'B37', cinza: true });
    a.p('A67', { v: 'Conferências', fundo: 'secao' }).p('B67', { fundo: 'secao' }).p('C67', { fundo: 'secao' });
    a.p('A68', { v: 'Principal + juros + honorários = valor total do requisitório?' }).p('B68', { f: '=IF(B29="","informe o total",IF(ABS(B41-B29)<=0.05,"OK","DIVERGÊNCIA"))', al: 'centro', b: true });
    a.p('A69', { v: 'O PSS incidiu só sobre o principal (B40 praticamente zero)?' }).p('B69', { f: '=IF(ABS(B40)<1,"Sim","Não: há PSS sobre os juros")', al: 'centro', b: true });
    a.a.imprimir = false;

    /* ---------- 2. Cumprimento de sentença PSS ---------- */
    var c = Aba(CP, [330, 120, 120, 90, 110, 100, 100, 100, 120, 130]);
    c.p('A1', { v: 'CUMPRIMENTO DE SENTENÇA · RESTITUIÇÃO DO PSS', fundo: 'titulo' }).m('A1:J1');
    c.p('A2', { v: 'Beneficiário' }).p('B2', { f: '=' + q(A1) + 'B5', b: true }).m('B2:E2').p('F2', { v: 'CPF', al: 'dir' }).p('G2', { f: '=' + q(A1) + 'B6', t: 'texto' }).m('G2:H2');
    ['Parcela', 'Valor do PRC (LOA)', 'Valor principal', '% principal', 'PSS a restituir', 'SELIC (%)', 'Retenção em', 'Atualizado até', 'Nº de meses', 'Valor a restituir'].forEach(function(t, i){ c.p(String.fromCharCode(65 + i) + '4', { v: t, fundo: 'secao', q: true, al: i ? 'centro' : null }); });
    c.p('A5', { v: 'PSS sobre o principal · 1ª retenção (competências 1993 a 06/1997)', q: true })
      .p('B5', { f: '=' + q(A1) + 'B24', t: 'reais' }).p('C5', { f: '=' + q(A1) + 'B37', t: 'reais' }).p('D5', { f: '=C5*100/B5/100', t: 'pct' })
      .p('E5', { f: '=' + q(A1) + 'B62+' + q(A1) + 'B63', t: 'reais', nota: 'Correção da skill: com a tese de 100% (isenção total antes de 2004) entram as linhas de 100% e de 5%; a matriz puxava só a de 5% (B34).' })
      .p('F5', { v: num(e.selic_1), t: 'pct', casas: 6, fundo: 'entrada', nota: 'Percentual da Calculadora do Cidadão (índice − 1), da data da retenção até a data final. Salve o print na pasta do processo.' })
      .p('G5', { v: data(e.data_pagamento) || data(e.data_base), t: 'data', fundo: 'entrada' }).p('H5', { v: data(e.data_atualizacao), t: 'data', fundo: 'entrada' }).p('I5', { v: e.meses_1, fundo: 'entrada', al: 'centro' })
      .p('J5', { f: '=ROUND(E5*F5+E5,2)', t: 'reais', nota: 'Correção da skill: arredondado aos centavos (ROUND), para bater com a Calculadora do Cidadão e a petição.' });
    c.p('A6', { v: 'PSS sobre o principal · 2ª parcela (2º saque)', q: true }).p('B6', { f: '=B5', t: 'reais' }).p('C6', { f: '=C5', t: 'reais' }).p('D6', { f: '=D5', t: 'pct' })
      .p('E6', { v: num(e.parcela2_valor) || 0, t: 'reais', fundo: 'entrada' }).p('F6', { v: num(e.selic_2), t: 'pct', casas: 6, fundo: 'entrada' })
      .p('G6', { v: data(e.parcela2_data), t: 'data', fundo: 'entrada' }).p('H6', { f: '=H5', t: 'data' }).p('I6', { v: e.meses_2, fundo: 'entrada', al: 'centro' }).p('J6', { f: '=ROUND(E6*F6+E6,2)', t: 'reais' });
    c.p('A7', { v: 'PSS sobre os juros', q: true }).p('B7', { f: '=B5', t: 'reais' }).p('C7', { f: '=B5-C5', t: 'reais', nota: 'Na matriz: valor dos juros = valor do PRC − valor principal (B12 = A6 − B6).' }).p('D7', { f: '=100%-D5', t: 'pct' })
      .p('E7', { f: '=' + q(A1) + 'B64', t: 'reais' }).p('F7', { f: '=F5', t: 'pct', casas: 6 }).p('G7', { f: '=G5', t: 'data' }).p('H7', { f: '=H5', t: 'data' }).p('I7', { f: '=I5', al: 'centro' }).p('J7', { f: '=ROUND(E7*F7+E7,2)', t: 'reais' });
    c.p('A8', { v: 'Valor total do cumprimento de sentença', fundo: 'total' }).p('E8', { f: '=SUM(E5:E7)', t: 'reais', fundo: 'total' }).p('J8', { f: '=SUM(J5:J7)', t: 'reais', fundo: 'total',
      nota: 'Correção da skill: o total soma também a 2ª parcela, SUM(G6,G9,G12); a matriz somava só G6 e G12.' });
    ['B8', 'C8', 'D8', 'F8', 'G8', 'H8', 'I8'].forEach(function(r){ c.p(r, { fundo: 'total' }); });
    c.p('A10', { v: 'Honorários', fundo: 'secao' }).p('B10', { v: 'Percentual', fundo: 'secao', al: 'centro' }).p('J10', { v: 'Total', fundo: 'secao', al: 'centro' });
    ['C10', 'D10', 'E10', 'F10', 'G10', 'H10', 'I10'].forEach(function(r){ c.p(r, { fundo: 'secao' }); });
    var pc = num(e.pct_contratuais); if(pc == null) pc = 0.25;
    var ps = num(e.pct_sucumbencia);
    c.p('A11', { v: 'Honorários contratuais' }).p('B11', { v: pc, t: 'pct', fundo: 'entrada' }).p('J11', { f: '=ROUND(J8*B11,2)', t: 'reais' });
    c.p('A12', { v: 'Honorários sucumbenciais' }).p('B12', { v: ps == null ? 0 : ps, t: 'pct', fundo: 'entrada',
      nota: 'Decisão do Dr. Victor (21/11): a sucumbência começa em 0% (no Juizado não há, art. 55 da Lei 9.099/95) e se digita o percentual quando a sentença ou o acórdão fixar.' })
      .p('J12', { f: '=ROUND(J8*B12,2)', t: 'reais' });
    c.p('A13', { v: 'Honorários totais', b: true }).p('B13', { f: '=SUM(B11,B12)', t: 'pct', b: true }).p('J13', { f: '=SUM(J11:J12)', t: 'reais', b: true });
    /* repartição dos contratuais */
    var l = 15;
    c.p('A' + l, { v: 'Repartição dos honorários contratuais', fundo: 'secao' }).p('B' + l, { v: 'Percentual', fundo: 'secao', al: 'centro' }).p('C' + l, { v: 'CNPJ/CPF', fundo: 'secao', al: 'centro' }).m('C' + l + ':D' + l)
      .p('E' + l, { v: 'OAB', fundo: 'secao', al: 'centro' }).m('E' + l + ':F' + l).p('J' + l, { v: 'Total', fundo: 'secao', al: 'centro' });
    ['G', 'H', 'I'].forEach(function(x){ c.p(x + l, { fundo: 'secao' }); });
    var linhasCont = {}, primeira = l + 1;
    adv.lista.forEach(function(x, i){
      var r = l + 1 + i; linhasCont[x.chave] = r;
      c.p('A' + r, { v: x.nome }).p('B' + r, { v: x.pct, t: 'pct', casas: 1, fundo: 'entrada' }).p('C' + r, { v: x.doc, fundo: x.doc ? null : 'entrada', t: 'texto', nota: x.doc ? null : 'Preencha o CPF/CNPJ (vai para a planilha individualizada).' }).m('C' + r + ':D' + r)
        .p('E' + r, { v: x.oab }).m('E' + r + ':F' + r)
        .p('J' + r, i === adv.lista.length - 1 && adv.lista.length > 1 ? { f: '=J11-SUM(J' + primeira + ':J' + (r - 1) + ')', t: 'reais', nota: 'Como na skill (exemplo validado): o último advogado fica com a diferença, para a soma bater com os honorários contratuais nos centavos.' } : { f: '=ROUND(J8*B' + r + ',2)', t: 'reais' });
    });
    var ultCont = l + adv.lista.length;
    l = ultCont + 1;
    c.p('A' + l, { v: 'Soma dos percentuais = honorários contratuais?', cinza: true }).p('B' + l, { f: '=IF(ROUND(SUM(B' + primeira + ':B' + ultCont + ')-B11,6)=0,"OK","DIVERGÊNCIA")', al: 'centro', b: true });
    if(adv.padrao){ c.p('B' + primeira, { conferir: true, nota: 'O cálculo não tinha a divisão do contrato: ficaram os percentuais da matriz (Sarmento 11,4% e Victor 13,6%). Confirme no contrato.' }); }
    /* repartição da sucumbência */
    l += 2;
    c.p('A' + l, { v: 'Repartição dos honorários sucumbenciais', fundo: 'secao' }).p('B' + l, { v: 'Percentual', fundo: 'secao', al: 'centro' }).p('C' + l, { v: 'CNPJ/CPF', fundo: 'secao', al: 'centro' }).m('C' + l + ':D' + l)
      .p('E' + l, { v: 'OAB', fundo: 'secao', al: 'centro' }).m('E' + l + ':F' + l).p('J' + l, { v: 'Total', fundo: 'secao', al: 'centro' });
    ['G', 'H', 'I'].forEach(function(x){ c.p(x + l, { fundo: 'secao' }); });
    var linhasSuc = {}, priSuc = l + 1, feitos = [];
    adv.lista.forEach(function(x, i){
      var r = l + 1 + i; linhasSuc[x.chave] = r;
      var pct, tot;
      /* decisão do Dr. Victor (21/11): a sucumbência se divide nos MESMOS percentuais dos honorários contratuais */
      pct = { f: '=IF(B11=0,0,B12*B' + linhasCont[x.chave] + '/B11)', t: 'pct', casas: 2, nota: i === 0 ? 'Decisão do Dr. Victor (21/11): a sucumbência se divide na mesma proporção dos honorários contratuais (ex.: 11,4% e 13,6% de 25% = 45,6% e 54,4%).' : null };
      tot = i === adv.lista.length - 1 && adv.lista.length > 1 ? { f: '=J12-SUM(J' + (l + 1) + ':J' + (r - 1) + ')', t: 'reais' } : { f: '=ROUND(J8*B' + r + ',2)', t: 'reais' };
      c.p('A' + r, { v: x.nome }).p('B' + r, pct).p('C' + r, { f: '=C' + linhasCont[x.chave], t: 'texto' }).m('C' + r + ':D' + r).p('E' + r, { f: '=E' + linhasCont[x.chave] }).m('E' + r + ':F' + r).p('J' + r, tot);
      feitos.push(r);
    });
    var ultSuc = l + adv.lista.length;
    l = ultSuc + 2;
    c.p('A' + l, { v: 'Honorários contratuais (soma da repartição)', b: true }).p('J' + l, { f: '=SUM(J' + primeira + ':J' + ultCont + ')', t: 'reais', b: true, nota: 'Na matriz: "honorários totais" (G29) = soma da repartição dos contratuais.' });
    var linhaAutor = l + 1;
    c.p('A' + linhaAutor, { v: 'Valor do autor', fundo: 'total' }).p('J' + linhaAutor, { f: '=J8-J11', t: 'reais', fundo: 'total' });
    c.p('A' + (linhaAutor + 1), { v: 'Valor total / cumprimento de sentença', fundo: 'total' }).p('J' + (linhaAutor + 1), { f: '=J8', t: 'reais', fundo: 'total' });
    c.a.imprimir = false; c.a.paisagem = true;

    /* ---------- 3. Planilha individualizada ---------- */
    var p = Aba(IND, [250, 130, 95, 170, 75, 105, 105, 115]);
    p.p('A1', { v: 'PLANILHA DE CÁLCULO INDIVIDUALIZADA (ART. 534, § 1º, DO CPC; ART. 9º, X, DA RESOLUÇÃO CJF Nº 822/2023)', fundo: 'titulo', q: true, al: 'centro' }).m('A1:H1');
    p.a.linhas = { 1: 38 };
    p.p('A3', { v: 'Processo', b: true, borda: true }).p('B3', { v: cnj(pro.numero) || '', fundo: pro.numero ? null : 'entrada', t: 'texto', borda: true }).m('B3:H3');
    p.p('A4', { v: 'Juízo', b: true, borda: true }).p('B4', { v: pro.orgao_julgador || '', borda: true, fundo: pro.orgao_julgador ? null : 'entrada', nota: pro.orgao_julgador ? 'Do cadastro do CNJ (DataJud): confira o nome do juízo.' : 'Preencha o juízo.' }).m('B4:H4');
    p.p('A5', { v: 'Classe', b: true, borda: true }).p('B5', { v: 'Cumprimento de Sentença contra a Fazenda Pública', borda: true }).m('B5:H5');
    p.p('A6', { v: 'Exequente', b: true, borda: true }).p('B6', { f: '=' + q(CP) + 'B2', borda: true }).m('B6:D6').p('E6', { v: 'CPF', b: true, al: 'dir', borda: true }).p('F6', { f: '=' + q(CP) + 'G2', t: 'texto', borda: true }).m('F6:H6');
    p.p('A7', { v: 'Executada', b: true, borda: true }).p('B7', { v: 'UNIÃO FEDERAL (FAZENDA NACIONAL)', borda: true }).m('B7:H7');
    p.p('A9', { v: '1. COMPOSIÇÃO DO CRÉDITO EXECUTADO', fundo: 'secao' }).m('A9:H9');
    ['Parcela', 'Valor (PSS)', 'Retenção em', 'Atualizado até', 'SELIC (%)', 'Parcela SELIC', '', 'Total'].forEach(function(t, i){ if(t) p.p(String.fromCharCode(65 + i) + '10', { v: t, b: true, al: i ? 'centro' : null, borda: true }); });
    p.m('F10:G10');
    var comp = [{ r: 5, t: 'PSS retido a maior sobre o principal · 1ª retenção' }];
    if((num(e.parcela2_valor) || 0) > 0) comp.push({ r: 6, t: 'PSS retido a maior · 2ª parcela' });
    comp.push({ r: 7, t: 'PSS retido sobre os juros' });
    var lc = 11;
    comp.forEach(function(x){
      p.p('A' + lc, { v: x.t, q: true, borda: true }).p('B' + lc, { f: '=' + q(CP) + 'E' + x.r, t: 'reais', borda: true }).p('C' + lc, { f: '=' + q(CP) + 'G' + x.r, t: 'data', al: 'centro', borda: true })
        .p('D' + lc, { f: '=' + q(CP) + 'H' + x.r, t: 'data', al: 'centro', borda: true }).p('E' + lc, { f: '=' + q(CP) + 'F' + x.r, t: 'pct', casas: 4, borda: true })
        .p('F' + lc, { f: '=H' + lc + '-B' + lc, t: 'reais', borda: true }).m('F' + lc + ':G' + lc).p('H' + lc, { f: '=' + q(CP) + 'J' + x.r, t: 'reais', borda: true });
      lc++;
    });
    var tCredito = lc;
    p.p('A' + lc, { v: 'VALOR TOTAL EXECUTADO (PRINCIPAL + SELIC)', fundo: 'total' }).p('B' + lc, { f: '=SUM(B11:B' + (lc - 1) + ')', t: 'reais', fundo: 'total' }).p('C' + lc, { fundo: 'total' }).p('D' + lc, { fundo: 'total' }).p('E' + lc, { fundo: 'total' })
      .p('F' + lc, { f: '=SUM(F11:F' + (lc - 1) + ')', t: 'reais', fundo: 'total' }).m('F' + lc + ':G' + lc).p('H' + lc, { f: '=SUM(H11:H' + (lc - 1) + ')', t: 'reais', fundo: 'total' });
    lc++;
    p.p('A' + lc, { v: 'Observação: em repetição de indébito tributário, a taxa SELIC (art. 39, § 4º, da Lei nº 9.250/95) engloba a correção monetária e os juros de mora, contados de cada retenção indevida.', q: true, i: true, cinza: true }).m('A' + lc + ':H' + lc);
    p.a.linhas[lc] = 34;
    lc += 2;
    var B = '$B$' + tCredito, F = '$F$' + tCredito, H = '$H$' + tCredito;
    p.p('A' + lc, { v: '2. INDIVIDUALIZAÇÃO POR BENEFICIÁRIO (VALORES LÍQUIDOS APÓS O DESTAQUE DOS HONORÁRIOS CONTRATUAIS)', fundo: 'secao', q: true }).m('A' + lc + ':H' + lc); lc++;
    var cab = ['Beneficiário', 'CPF / CNPJ', 'OAB', 'Qualidade', 'Percentual', 'Principal', 'SELIC', 'Total'];
    function cabecalho(){ cab.forEach(function(t, i){ p.p(String.fromCharCode(65 + i) + lc, { v: t, b: true, al: i ? 'centro' : null, borda: true }); }); lc++; }
    cabecalho();
    var lExe = lc, lAdv1 = lc + 1, lAdvN = lc + adv.lista.length;
    var faixaE = adv.lista.length ? 'E' + lAdv1 + ':E' + lAdvN : null;
    p.p('A' + lExe, { f: '=B6', borda: true, q: true }).p('B' + lExe, { f: '=F6', t: 'texto', borda: true }).p('C' + lExe, { v: '-', al: 'centro', borda: true }).p('D' + lExe, { v: 'Exequente (valor líquido)', borda: true })
      .p('E' + lExe, { f: faixaE ? '=1-SUM(' + faixaE + ')' : '=1', t: 'pct', casas: 1, borda: true })
      .p('F' + lExe, { f: '=' + B + (faixaE ? '-SUM(F' + lAdv1 + ':F' + lAdvN + ')' : ''), t: 'reais', borda: true })
      .p('G' + lExe, { f: '=' + F + (faixaE ? '-SUM(G' + lAdv1 + ':G' + lAdvN + ')' : ''), t: 'reais', borda: true })
      .p('H' + lExe, { f: '=F' + lExe + '+G' + lExe, t: 'reais', borda: true });
    adv.lista.forEach(function(x, i){
      var r = lAdv1 + i, rc = linhasCont[x.chave];
      p.p('A' + r, { v: x.nome_planilha, borda: true, q: true }).p('B' + r, { f: '=' + q(CP) + 'C' + rc, t: 'texto', borda: true }).p('C' + r, { f: '=' + q(CP) + 'E' + rc, borda: true, al: 'centro' }).p('D' + r, { v: 'Honorários contratuais', borda: true })
        .p('E' + r, { f: '=' + q(CP) + 'B' + rc, t: 'pct', casas: 1, borda: true }).p('F' + r, { f: '=ROUND(' + B + '*E' + r + ',2)', t: 'reais', borda: true })
        .p('G' + r, { f: '=H' + r + '-F' + r, t: 'reais', borda: true }).p('H' + r, { f: '=ROUND(' + H + '*E' + r + ',2)', t: 'reais', borda: true });
    });
    lc = lAdvN + 1;
    p.p('A' + lc, { v: 'TOTAL', fundo: 'total' }).p('B' + lc, { fundo: 'total' }).p('C' + lc, { fundo: 'total' }).p('D' + lc, { fundo: 'total' })
      .p('E' + lc, { f: '=SUM(E' + lExe + ':E' + (lc - 1) + ')', t: 'pct', casas: 1, fundo: 'total' }).p('F' + lc, { f: '=SUM(F' + lExe + ':F' + (lc - 1) + ')', t: 'reais', fundo: 'total' })
      .p('G' + lc, { f: '=SUM(G' + lExe + ':G' + (lc - 1) + ')', t: 'reais', fundo: 'total' }).p('H' + lc, { f: '=SUM(H' + lExe + ':H' + (lc - 1) + ')', t: 'reais', fundo: 'total' });
    var lTot1 = lc; lc++;
    p.p('A' + lc, { v: 'Conferência (total individualizado = total executado)', cinza: true }).m('A' + lc + ':G' + lc)
      .p('H' + lc, { f: '=IF(ROUND(H' + lTot1 + '-' + H + ',2)=0,"OK","DIVERGÊNCIA")', al: 'centro', b: true, nota: 'Correção da skill: a matriz comparava com a célula B8 (o nome da executada) e sempre dava erro; aqui compara com o total executado.' });
    lc += 2;
    p.p('A' + lc, { v: '3. HONORÁRIOS DE SUCUMBÊNCIA (INDIVIDUALIZAÇÃO POR BENEFICIÁRIO)', fundo: 'secao', q: true }).m('A' + lc + ':H' + lc); lc++;
    cabecalho();
    var lS1 = lc;
    adv.lista.forEach(function(x, i){
      var r = lS1 + i, rs = linhasSuc[x.chave];
      p.p('A' + r, { v: x.nome_planilha, borda: true, q: true }).p('B' + r, { f: '=' + q(CP) + 'C' + rs, t: 'texto', borda: true }).p('C' + r, { f: '=' + q(CP) + 'E' + rs, borda: true, al: 'centro' }).p('D' + r, { v: 'Honorários de sucumbência', borda: true })
        .p('E' + r, { f: '=' + q(CP) + 'B' + rs, t: 'pct', casas: 2, borda: true }).p('F' + r, { f: '=ROUND(' + B + '*E' + r + ',2)', t: 'reais', borda: true })
        .p('G' + r, { f: '=H' + r + '-F' + r, t: 'reais', borda: true }).p('H' + r, { f: '=ROUND(' + H + '*E' + r + ',2)', t: 'reais', borda: true });
    });
    lc = lS1 + adv.lista.length;
    p.p('A' + lc, { v: 'TOTAL', fundo: 'total' }).p('B' + lc, { fundo: 'total' }).p('C' + lc, { fundo: 'total' }).p('D' + lc, { fundo: 'total' })
      .p('E' + lc, { f: '=SUM(E' + lS1 + ':E' + (lc - 1) + ')', t: 'pct', casas: 2, fundo: 'total' }).p('F' + lc, { f: '=SUM(F' + lS1 + ':F' + (lc - 1) + ')', t: 'reais', fundo: 'total' })
      .p('G' + lc, { f: '=SUM(G' + lS1 + ':G' + (lc - 1) + ')', t: 'reais', fundo: 'total' }).p('H' + lc, { f: '=SUM(H' + lS1 + ':H' + (lc - 1) + ')', t: 'reais', fundo: 'total' });
    var lTotS = lc; lc++;
    p.p('A' + lc, { v: 'Conferência (igual ao total da sucumbência no cumprimento)', cinza: true }).m('A' + lc + ':G' + lc)
      .p('H' + lc, { f: '=IF(ABS(ROUND(H' + lTotS + '-' + q(CP) + 'J12,2))<=0.02,"OK","DIVERGÊNCIA")', al: 'centro', b: true });
    lc += 2;
    p.p('A' + lc, { v: '4. RESUMO DOS HONORÁRIOS CONTRATUAIS DESTACADOS', fundo: 'secao' }).m('A' + lc + ':H' + lc); lc++;
    p.p('A' + lc, { v: 'Rubrica', b: true, borda: true }).m('A' + lc + ':D' + lc).p('E' + lc, { v: 'Percentual', b: true, al: 'centro', borda: true }).p('F' + lc, { v: 'Principal', b: true, al: 'centro', borda: true })
      .p('G' + lc, { v: 'SELIC', b: true, al: 'centro', borda: true }).p('H' + lc, { v: 'Total', b: true, al: 'centro', borda: true }); lc++;
    p.p('A' + lc, { v: 'Honorários contratuais totais', borda: true }).m('A' + lc + ':D' + lc)
      .p('E' + lc, { f: faixaE ? '=SUM(' + faixaE + ')' : '=0', t: 'pct', casas: 1, borda: true }).p('F' + lc, { f: faixaE ? '=SUM(F' + lAdv1 + ':F' + lAdvN + ')' : '=0', t: 'reais', borda: true })
      .p('G' + lc, { f: faixaE ? '=SUM(G' + lAdv1 + ':G' + lAdvN + ')' : '=0', t: 'reais', borda: true }).p('H' + lc, { f: faixaE ? '=SUM(H' + lAdv1 + ':H' + lAdvN + ')' : '=0', t: 'reais', borda: true });
    lc += 3;
    p.p('A' + lc, { v: (cfg.cidade || 'Maceió/AL') + ', ' + hojeExtenso() + '.', fundo: 'entrada', nota: 'Data do cálculo: confira antes de juntar.' }).m('A' + lc + ':H' + lc);
    lc += 3;
    var vic = ((cfg.advogados || []).filter(function(x){ return x.chave === 'victor'; })[0]) || { nome_planilha: 'VICTOR DE MEDEIROS MORAIS', oab: 'OAB/AL 15.318' };
    p.p('A' + lc, { v: vic.nome_planilha, b: true, al: 'centro' }).m('A' + lc + ':H' + lc); lc++;
    p.p('A' + lc, { v: (vic.oab || '').replace(/ - /, ' '), al: 'centro' }).m('A' + lc + ':H' + lc);
    p.a.imprimir = true; p.a.bordas = 'marcadas';

    /* ---------- 4. Divisão entre herdeiros ---------- */
    var h = Aba(HER, [300, 140, 150, 100, 140]);
    h.p('A1', { v: 'DIVISÃO DO VALOR DO AUTOR ENTRE A PENSIONISTA E OS HERDEIROS', fundo: 'titulo' }).m('A1:E1');
    h.p('A3', { v: 'Beneficiário do processo', b: true }).p('B3', { f: '=' + q(CP) + 'B2' }).m('B3:E3');
    h.p('A4', { v: 'CPF do processo', b: true }).p('B4', { f: '=' + q(CP) + 'G2', t: 'texto' }).m('B4:E4');
    h.p('A6', { v: 'Valor do autor / cumprimento de sentença', b: true }).p('B6', { f: '=' + q(CP) + 'J' + linhaAutor, t: 'reais', b: true });
    ['Nome', 'CPF', 'Qualificação', 'Percentual', 'Valor (R$)'].forEach(function(t, i){ h.p(String.fromCharCode(65 + i) + '8', { v: t, fundo: 'secao', al: i ? 'centro' : null }); });
    var herdeiros = (ficha.partes || []).filter(function(x){ return num(x.quota) > 0; });
    var semCota = !herdeiros.length;
    if(semCota) herdeiros = [{ nome: pes.nome || nome, cpf: pes.cpf || cpf, papel: 'Titular', quota: 1 }];
    var somaQ = herdeiros.reduce(function(s, x){ return s + (num(x.quota) || 0); }, 0);
    var emPct = somaQ > 1.5; /* cota guardada como 50 (em vez de 0,5) */
    herdeiros.forEach(function(x, i){
      var r = 9 + i, qv = num(x.quota) || 0;
      h.p('A' + r, { v: x.nome || '' }).p('B' + r, { v: x.cpf || '', t: 'texto' }).p('C' + r, { v: x.papel || '' }).p('D' + r, { v: emPct ? qv / 100 : qv, t: 'pct', casas: 2, fundo: 'entrada' })
        .p('E' + r, { f: '=$B$6*D' + r, t: 'reais' });
    });
    var lh = 9 + herdeiros.length + 1;
    h.p('A' + lh, { v: 'Total', fundo: 'total' }).p('B' + lh, { fundo: 'total' }).p('C' + lh, { fundo: 'total' }).p('D' + lh, { f: '=SUM(D9:D' + (lh - 2) + ')', t: 'pct', fundo: 'total' }).p('E' + lh, { f: '=SUM(E9:E' + (lh - 2) + ')', t: 'reais', fundo: 'total' });
    h.p('A' + (lh + 1), { v: 'Conferência: percentual total = 100% e total = Valor do autor', cinza: true }).m('A' + (lh + 1) + ':D' + (lh + 1))
      .p('E' + (lh + 1), { f: '=IF(AND(ROUND(D' + lh + '-1,6)=0,ABS(E' + lh + '-B6)<0.01),"OK","DIVERGÊNCIA")', al: 'centro', b: true });
    if(semCota) h.p('A9', { nota: 'Nenhuma parte do processo tem a cota preenchida: ficou só o titular com 100%. Cadastre os herdeiros com a cota na ficha (Partes do processo) e monte de novo, ou preencha aqui.' });
    h.a.imprimir = false;

    /* ---------- 5. Cumprimento IR-RRA (estrutura e fórmulas da matriz) ---------- */
    var r5 = Aba(IR, [260, 110, 85, 110, 120, 20, 20, 120, 90, 130]);
    r5.p('A1', { v: 'CUMPRIMENTO DE SENTENÇA · IR-RRA (estrutura da matriz)', fundo: 'titulo' }).m('A1:J1');
    r5.p('A2', { v: 'Beneficiário' }).p('B2', { f: '=' + q(A1) + 'B5', b: true }).m('B2:E2').p('H2', { v: 'CPF', al: 'dir' }).p('I2', { f: '=' + q(A1) + 'B6', t: 'texto' }).m('I2:J2');
    ['Valor do PRC', 'Valor principal', '% principal', 'Imposto de Renda devido', 'IR retido na fonte', '', '', 'IR a ser restituído', 'SELIC (%)', 'Valor a ser restituído'].forEach(function(t, i){ if(t) r5.p(String.fromCharCode(65 + i) + '4', { v: t, fundo: 'secao', q: true, al: 'centro' }); else r5.p(String.fromCharCode(65 + i) + '4', { fundo: 'secao' }); });
    r5.p('A5', { f: '=' + q(A1) + 'B24', t: 'reais' }).p('B5', { f: '=' + q(A1) + 'B37', t: 'reais' }).p('C5', { f: '=B5*100/A5/100', t: 'pct' })
      .p('D5', { v: num(e.ir_devido), t: 'reais', fundo: 'entrada' }).p('E5', { v: num(e.ir_retido_principal), t: 'reais', fundo: 'entrada' })
      .p('H5', { v: num(e.ir_restituir_principal), t: 'reais', fundo: 'entrada' }).p('I5', { v: num(e.ir_selic), t: 'pct', casas: 6, fundo: 'entrada' })
      .p('J5', { f: '=E5+H5', t: 'reais', conferir: true, nota: 'Fórmula da matriz: J5 = E5 + H5 (IR retido + IR a ser restituído). A coluna I (nº de meses / SELIC) não entra na conta. Conferir com o Dr. Victor.' });
    r5.p('A8', { v: 'Valor do PRC', fundo: 'secao', al: 'centro' }).p('B8', { v: 'Valor dos juros', fundo: 'secao', al: 'centro' }).p('C8', { v: '% juros', fundo: 'secao', al: 'centro' }).p('D8', { v: 'IR sobre os juros', fundo: 'secao', al: 'centro' })
      .p('E8', { v: 'IR retido na fonte', fundo: 'secao', al: 'centro' }).p('F8', { fundo: 'secao' }).p('G8', { fundo: 'secao' }).p('H8', { v: 'IR a ser restituído', fundo: 'secao', al: 'centro' }).p('I8', { v: 'SELIC (%)', fundo: 'secao', al: 'centro' }).p('J8', { v: 'Valor a ser restituído', fundo: 'secao', al: 'centro' });
    r5.p('A9', { f: '=A5', t: 'reais' }).p('B9', { f: '=A5-B5', t: 'reais' }).p('C9', { f: '=100%-C5', t: 'pct' }).p('D9', { v: 0, t: 'reais', fundo: 'entrada' })
      .p('E9', { v: num(e.ir_retido_juros), t: 'reais', fundo: 'entrada' }).p('H9', { v: num(e.ir_restituir_juros), t: 'reais', fundo: 'entrada' }).p('I9', { f: '=I5', t: 'pct', casas: 6 }).p('J9', { f: '=E9+H9', t: 'reais' });
    r5.p('B12', { v: 'Percentual', fundo: 'secao', al: 'centro' }).p('J12', { v: 'Total', fundo: 'secao', al: 'centro' });
    r5.p('A13', { v: 'Honorários contratuais' }).p('B13', { f: '=' + q(CP) + 'B11', t: 'pct' }).p('J13', { f: '=J29*B13', t: 'reais' });
    r5.p('A14', { v: 'Honorários sucumbenciais' }).p('B14', { v: 0, t: 'pct', fundo: 'entrada' }).p('J14', { f: '=J29*B14', t: 'reais' });
    r5.p('A15', { v: 'Honorários totais', b: true }).p('B15', { f: '=SUM(B13,B14)', t: 'pct', b: true }).p('J15', { f: '=SUM(J13:J14)', t: 'reais', b: true });
    r5.p('A17', { v: 'Honorários contratuais', fundo: 'secao' }).p('B17', { v: 'Percentual', fundo: 'secao', al: 'centro' }).p('D17', { v: 'CNPJ/CPF', fundo: 'secao', al: 'centro' }).p('H17', { v: 'OAB', fundo: 'secao', al: 'centro' }).p('J17', { v: 'Total', fundo: 'secao', al: 'centro' });
    var lr = 18, contIR = {};
    adv.lista.forEach(function(x){
      contIR[x.chave] = lr;
      r5.p('A' + lr, { v: x.nome }).p('B' + lr, { f: '=' + q(CP) + 'B' + linhasCont[x.chave], t: 'pct', casas: 1 }).p('D' + lr, { f: '=' + q(CP) + 'C' + linhasCont[x.chave], t: 'texto' }).m('D' + lr + ':G' + lr).p('H' + lr, { v: x.oab }).m('H' + lr + ':I' + lr)
        .p('J' + lr, { f: '=J29*B' + lr, t: 'reais', nota: x.chave === 'valdenor' ? 'Decisão do Dr. Victor (21/11): total × percentual (a matriz tinha "=J29=B20", que comparava em vez de multiplicar).' : null });
      lr++;
    });
    r5.p('B18', { nota: 'Decisão do Dr. Victor (21/11): percentuais do contrato (a matriz trazia 11,4% + 25% + 1% = 37,4%).' });
    lr++;
    r5.p('A' + lr, { v: 'Honorários sucumbenciais', fundo: 'secao' }).p('B' + lr, { v: 'Percentual', fundo: 'secao', al: 'centro' }).p('D' + lr, { v: 'CNPJ/CPF', fundo: 'secao', al: 'centro' }).p('H' + lr, { v: 'OAB', fundo: 'secao', al: 'centro' }).p('J' + lr, { v: 'Total', fundo: 'secao', al: 'centro' });
    lr++;
    var feitosIR = [];
    adv.lista.forEach(function(x){
      var pctF = '=IF(B13=0,0,B14*B' + contIR[x.chave] + '/B13)';
      r5.p('A' + lr, { v: x.nome }).p('B' + lr, { f: pctF, t: 'pct', casas: 2 }).p('D' + lr, { f: '=D' + contIR[x.chave], t: 'texto' }).m('D' + lr + ':G' + lr).p('H' + lr, { f: '=H' + contIR[x.chave] }).m('H' + lr + ':I' + lr)
        .p('J' + lr, { f: '=J29*B' + lr, t: 'reais', nota: feitosIR.length ? null : 'Decisão do Dr. Victor (21/11): mesma proporção dos honorários contratuais, total × percentual (a matriz usava sucumbência ÷ 25 × 12 e × 1).' });
      feitosIR.push(lr); lr++;
    });
    lr++;
    r5.p('A' + lr, { v: 'Honorários totais', b: true }).p('J' + lr, { f: '=J15', t: 'reais', b: true }); var lrHon = lr; lr++;
    r5.p('A' + lr, { v: 'Valor do autor', fundo: 'total' }).p('J' + lr, { f: '=J5-J' + lrHon, t: 'reais', fundo: 'total', conferir: true, nota: 'Fórmula da matriz: Valor do autor = J5 − honorários (deixa de fora o valor dos juros, J9). Conferir com o Dr. Victor.' }); lr++;
    /* o total fica na linha 29, como na matriz, porque as fórmulas acima apontam para J29 */
    if(lr > 29){ /* muitas linhas: aponta para a linha certa */
      Object.keys(r5.a.celulas).forEach(function(k){ var x = r5.a.celulas[k]; if(x.f) x.f = x.f.replace(/J29/g, 'J' + lr); });
    } else lr = 29;
    r5.p('A' + lr, { v: 'Valor total / cumprimento de sentença', fundo: 'total' }).p('J' + lr, { f: '=SUM(J5,J9)', t: 'reais', fundo: 'total' });
    r5.a.imprimir = false; r5.a.paisagem = true;

    /* de onde veio cada dado lido dos documentos: vira nota na célula */
    var ONDE = { beneficiario: 'B5', cpf_beneficiario: 'B6', prc: 'B10', data_pagamento: 'B11', processo_execucao: 'B12', assunto: 'B13', vendeu_prc: 'B14', nm_meses: 'B18', data_base: 'B19',
      exercicios: 'B21', loa: 'B24', liq_principal: 'B25', liq_juros: 'B26', pss_recolhido: 'B27', honorarios_req: 'B28', total_requisitorio: 'B29', principal_ate_1997: 'B50', principal_total_demonstrativo: 'B51' };
    Object.keys(e._origem || {}).forEach(function(k){
      var o = e._origem[k], alvo = ONDE[k], aba = a;
      if(!alvo && (k === 'selic_1' || k === 'selic_2')){ alvo = k === 'selic_1' ? 'F5' : 'F6'; aba = c; }
      if(!alvo || !o) return;
      var txt = 'Veio de: ' + (o.arquivo || 'documento') + (o.pagina ? ', pág. ' + o.pagina : '') + (o.imagem ? ' (lido da imagem: confira)' : '') + (o.trecho ? ' · “' + String(o.trecho).slice(0, 120) + '”' : '');
      var atual = aba.a.celulas[alvo] && aba.a.celulas[alvo].nota;
      aba.p(alvo, { nota: atual ? atual + ' · ' + txt : txt });
    });
    var pasta = { formato: 1, ativa: 2, abas: [a.a, c.a, p.a, h.a, r5.a], modelo: 'pss' };
    pasta.avisos = ['Montada a partir do cálculo do PSS deste processo, com as mesmas fórmulas da planilha matriz. Células amarelas = dados a preencher ou conferir; triângulo vermelho = ponto a conferir com o Dr. Victor; triângulo laranja = nota (passe o mouse). Para os autos, junte só a "Planilha individualizada" (já vem marcada no PDF).'];
    return pasta;
  }

  async function montar(o){
    var sb = o.sb, pid = o.processoId;
    if(!pid) throw new Error('abra pelo processo (falta o processo)');
    var r = await sb.rpc('calculo_do_processo', { p_processo_id: pid }); if(r.error) throw r.error;
    var atual = r.data && r.data.atual;
    var avisos = [];
    if(!atual) avisos.push({ tipo: 'atencao', titulo: 'Este processo ainda não tem o cálculo do PSS salvo.', texto: 'A planilha veio com os campos em branco (amarelos). O mais seguro é fazer o cálculo na ficha (Cálculo do PSS, que lê o requisitório e o espelho) e montar de novo.' });
    else if(atual.situacao !== 'conferido') avisos.push({ tipo: 'atencao', titulo: 'O cálculo deste processo ainda é rascunho (versão ' + atual.versao + ').', texto: 'Confira e marque "Conferi" no Cálculo do PSS antes de juntar a planilha.' });
    var ficha = {}, cfg = {};
    try{ var f = await sb.rpc('peticao_dados', { p_processo_id: pid }); if(!f.error) ficha = f.data || {}; else avisos.push({ tipo: 'atencao', titulo: 'Não li os dados da ficha.', texto: 'Motivo: ' + f.error.message + '. Preencha o processo, o juízo e as partes à mão.' }); }catch(e){}
    try{ var c = await sb.rpc('calculos_config'); if(!c.error) cfg = c.data || {}; }catch(e){}
    var e = (atual && atual.entradas) || {};
    var pasta = construir(e, ficha, cfg);
    var nomeCli = (ficha.pessoa && ficha.pessoa.nome) || '';
    return { titulo: 'Cálculo do PSS' + (nomeCli ? ' · ' + nomeCli : ''), pasta: pasta, calculo_id: atual ? atual.id : null, avisosTela: avisos };
  }

  /* a planilha foi montada de um cálculo antigo? oferece atualizar (versão nova; nada se perde) */
  async function conferirAtualizacao(S, o){
    if(S.doc.modelo !== 'pss' || !S.doc.processo_id) return;
    var r = await o.sb.rpc('calculo_do_processo', { p_processo_id: S.doc.processo_id }); if(r.error || !r.data || !r.data.atual) return;
    var atual = r.data.atual;
    if(atual.id === S.doc.calculo_id) return;
    S.avisosTela.push({ tipo: 'atencao', titulo: 'O cálculo do PSS deste processo mudou depois que esta planilha foi montada (agora versão ' + atual.versao + ').',
      texto: 'O que você mudou à mão nesta planilha fica nas versões anteriores; ao salvar, a montagem nova vira a versão mais nova.',
      acao: { rotulo: 'Montar de novo com o cálculo atual', fazer: async function(){
        if(S.pendente && !confirm('Há alterações não salvas. Montar de novo mesmo assim?')) return;
        try{ var m = await montar({ sb: o.sb, processoId: S.doc.processo_id }); S.avisosTela = (S.avisosTela || []).filter(function(a){ return !a.acao; }); o.aplicar(m.pasta, m.calculo_id); }
        catch(e){ alert('Não consegui montar de novo: ' + (e.message || e)); }
      } } });
  }

  raiz.SagaCalculosPlanilhas = { montar: montar, construir: construir, conferirAtualizacao: conferirAtualizacao, ABAS: [A1, CP, IND, HER, IR] };
})(typeof window !== 'undefined' ? window : globalThis);
