/* =====================================================================
   PONTO VMMADV: calculo do dia e do mes
   Transcricao fiel das funcoes situacaoDoDia_, calcularDia_ e recalcularPlanilha_
   do Apps Script "Painel do Ponto VMMADV" (Etapa 3.3). Minutos contados desde 00:00.
   Usado pela tela do ponto (navegador) e pelos relatorios automaticos.
   ===================================================================== */
(function (raiz) {
  var SIT_MANUAL = ['Home office', 'Atestado médico', 'Falta abonada', 'Falta justificada', 'Folga compensatória', 'Férias', 'Licença'];
  var SIT_SEM_CARGA = ['Sábado', 'Domingo', 'Feriado', 'Ponto facultativo', 'Não admitido', 'Desligado', 'Sem controle', 'Férias', 'Licença'];
  var SIT_ABONA = ['Atestado médico', 'Falta abonada'];
  var NOMES_DIA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  function dois(n) { return ('0' + n).slice(-2); }
  function hhmm(min) {
    if (min === null || min === undefined) return '';
    var s = min < 0 ? '-' : '';
    var v = Math.abs(Math.round(min));
    return s + dois(Math.floor(v / 60)) + ':' + dois(v % 60);
  }
  function hhmmRelogio(min) { // horario de uma marcacao: corta os segundos
    if (min === null || min === undefined) return '';
    var v = Math.floor(min);
    return dois(Math.floor(v / 60)) + ':' + dois(v % 60);
  }
  function diaSemana(key) { var p = key.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); }
  function diasNoMes(a, m) { return new Date(Date.UTC(a, m, 0)).getUTCDate(); }

  // Jornada vigente no dia: lista ordenada por vigente_desde (nulo = desde o inicio)
  function jornadaDoDia(c, jornadas, key) {
    var lista = (jornadas || []).slice().sort(function (a, b) { return (a.vigente_desde || '') < (b.vigente_desde || '') ? -1 : 1; });
    if (!lista.length) return c;
    var vale = null;
    lista.forEach(function (j) { if (!j.vigente_desde || j.vigente_desde <= key) vale = j; });
    if (!vale) vale = lista[0];
    var out = {};
    for (var k in c) out[k] = c[k];
    out.carga = vale.carga_min; out.entrada = vale.entrada_min; out.saida = vale.saida_min;
    return out;
  }

  function situacaoDoDia(key, c, cfg, feriados, atual) {
    if (c.admissao && key < c.admissao) return 'Não admitido';
    if (c.demissao && key > c.demissao) return 'Desligado';
    if (SIT_MANUAL.indexOf(atual) >= 0) return atual;
    if (cfg.inicio && key < cfg.inicio) return 'Sem controle';
    var f = feriados[key];
    if (f && f.liberado) return f.facultativo ? 'Ponto facultativo' : 'Feriado';
    var w = diaSemana(key);
    return w === 6 ? 'Sábado' : (w === 0 ? 'Domingo' : 'Dia útil');
  }
  function pausaAberta(mk) { for (var i = 1; i <= 5; i += 2) if (mk[i] !== null && mk[i + 1] === null) return i; return -1; }

  function calcularDia(key, hoje, sit, mk, abonoManual, c, reg, cfg, feriados) {
    var r = { carga: null, pausas: null, pausaRem: null, trab: null, saldo: null, atraso: null, antec: null,
      status: '', ocorr: [], abono: 0, falta: false, incompleta: false, fAtraso: false, fAntec: false, fPausa: false };
    var ehHoje = key === hoje, futuro = key > hoje;
    if (feriados[key] && (sit === 'Feriado' || sit === 'Ponto facultativo')) r.ocorr.push(feriados[key].desc);

    if (reg.livre) {
      var trabL = 0, aberto = false;
      for (var i = 0; i < 8; i += 2) {
        if (mk[i] !== null && mk[i + 1] !== null) trabL += Math.max(0, mk[i + 1] - mk[i]);
        else if (mk[i] !== null) aberto = true;
      }
      if (trabL > 0 || aberto) {
        r.trab = trabL;
        r.status = aberto ? (ehHoje ? 'Em andamento' : 'Marcação incompleta') : 'Registrado';
        if (aberto && !ehHoje) { r.incompleta = true; r.ocorr.push('Período sem encerramento'); }
      }
      return r;
    }

    var temMarca = mk.some(function (v) { return v !== null; });
    if (futuro && !temMarca) return r;
    var carga = SIT_SEM_CARGA.indexOf(sit) >= 0 ? 0 : (c.carga || 0);
    var abono = Math.min(carga, (SIT_ABONA.indexOf(sit) >= 0 ? carga : 0) + (abonoManual || 0));
    r.abono = abono;
    var tol = cfg.tol;
    var ent = mk[0], sai = mk[7];
    var pa = pausaAberta(mk);

    if (ent === null) {
      if (carga === 0) return r;
      r.carga = carga;
      if (abono >= carga) { r.trab = 0; r.saldo = 0; r.status = 'Abonado'; return r; }
      if (ehHoje) { r.status = 'Aguardando entrada'; return r; }
      r.trab = 0;
      r.saldo = abono - carga;
      if (sit === 'Falta justificada') r.status = 'Falta justificada';
      else if (sit === 'Folga compensatória') r.status = 'Folga compensatória';
      else { r.status = 'Falta'; r.falta = true; }
      return r;
    }

    r.carga = carga;
    if (carga > 0) {
      r.atraso = Math.max(0, Math.round(ent - c.entrada));
      if (r.atraso > 0) r.ocorr.push('Atraso de ' + r.atraso + ' min' + (r.atraso <= tol ? ' (na tolerância)' : ''));
      if (r.atraso > tol) r.fAtraso = true;
    }

    if (sai === null || pa >= 0) {
      if (ehHoje) { r.status = 'Em andamento'; return r; }
      r.status = 'Marcação incompleta';
      r.incompleta = true;
      r.trab = 0;
      r.saldo = abono - carga;
      r.ocorr.push(pa >= 0 ? 'Pausa sem encerramento' : 'Saída não registrada');
      return r;
    }

    var span = Math.max(0, sai - ent);
    var durs = [];
    for (var k = 1; k <= 5; k += 2) if (mk[k] !== null && mk[k + 1] !== null) durs.push(Math.max(0, mk[k + 1] - mk[k]));
    var totalPausas = durs.reduce(function (s, v) { return s + v; }, 0);
    var almoco = 0, curtas = durs.slice();
    if (reg.almoco > 0 && durs.length) {
      var iMax = durs.indexOf(Math.max.apply(null, durs));
      if (durs[iMax] >= 30) { almoco = durs[iMax]; curtas.splice(iMax, 1); }
    }
    var somaCurtas = curtas.reduce(function (s, v) { return s + v; }, 0);
    var permitido = reg.pausas * reg.duracao;
    var direito = 0;
    if (carga > 0 && permitido > 0) {
      if (reg.pausas >= 2) direito = (ent <= c.entrada + tol ? reg.duracao : 0) + (sai >= c.saida - tol ? reg.duracao : 0);
      else direito = (span - almoco >= carga - tol) ? permitido : 0;
    }
    var rem = Math.min(somaCurtas, direito);
    var excesso = Math.max(0, Math.round(somaCurtas - permitido));
    var trab = span - totalPausas + rem;
    var bruto = trab + abono - carga;
    var saldo = Math.abs(bruto) <= tol ? 0 : bruto;

    r.pausas = totalPausas; r.pausaRem = rem; r.trab = trab; r.saldo = saldo;
    if (carga > 0) {
      r.antec = Math.max(0, Math.round(c.saida - sai));
      if (r.antec > 0) r.ocorr.push('Saída ' + r.antec + ' min antes' + (r.antec <= tol ? ' (na tolerância)' : ''));
      if (r.antec > tol) r.fAntec = true;
    }
    if (excesso > 0) { r.ocorr.push('Pausa excedida em ' + excesso + ' min'); r.fPausa = true; }
    if (somaCurtas > 0 && rem < Math.min(somaCurtas, permitido)) r.ocorr.push('Pausa não remunerada: jornada incompleta');
    if (abonoManual > 0) { r.fAtraso = false; r.fAntec = false; r.ocorr.push('Abono de ' + hhmm(abonoManual) + ' aprovado'); }
    if (carga === 0) r.status = 'Trabalho fora do expediente';
    else if (saldo < 0) r.status = 'Horas negativas';
    else if (saldo > 0) r.status = 'Horas positivas';
    else r.status = 'Carga cumprida';
    return r;
  }

  // Mes inteiro de um colaborador. dados = { colab, jornadas, regime, cfg, feriados{key:{desc,facultativo,liberado}},
  //   marcacoes{key:[8]}, dias{key:{situacao,abono_min}} }. Devolve { dias:[...], resumo }
  function calcularMes(a, m, hoje, dados) {
    var reg = dados.regime, cfg = dados.cfg, t = { carga: 0, trab: 0, abono: 0, saldo: 0, atrasos: 0, antec: 0, pausas: 0, faltas: 0, incompletas: 0, dias: 0 };
    var lista = [];
    for (var d = 1; d <= diasNoMes(a, m); d++) {
      var key = a + '-' + dois(m) + '-' + dois(d);
      var cj = jornadaDoDia(dados.colab, dados.jornadas, key);
      var dia = (dados.dias || {})[key] || {};
      var sit = situacaoDoDia(key, cj, cfg, dados.feriados, dia.situacao || '');
      var mk = ((dados.marcacoes || {})[key] || [null, null, null, null, null, null, null, null]).slice();
      var r = calcularDia(key, hoje, sit, mk, dia.abono_min || 0, cj, reg, cfg, dados.feriados);
      lista.push({ key: key, dia: d, nomeDia: NOMES_DIA[diaSemana(key)], sit: sit, mk: mk, d: r, cj: cj, relatorio: dia.relatorio || '', observacao: dia.observacao || '', abonoManual: dia.abono_min || 0 });
      if (r.carga) t.carga += r.carga;
      if (r.trab) { t.trab += r.trab; t.dias++; }
      if (r.saldo !== null) { t.saldo += r.saldo; t.abono += r.abono; }
      if (r.fAtraso) t.atrasos++;
      if (r.fAntec) t.antec++;
      if (r.fPausa) t.pausas++;
      if (r.falta) t.faltas++;
      if (r.incompleta) t.incompletas++;
    }
    var fim = a + '-' + dois(m) + '-' + dois(diasNoMes(a, m));
    var cargaRef = jornadaDoDia(dados.colab, dados.jornadas, hoje < fim ? hoje : fim).carga || 0;
    var ocorr = t.atrasos + t.antec + t.pausas;
    t.valido = t.saldo > cargaRef ? cargaRef : t.saldo;
    t.excedente = Math.max(0, t.saldo - cargaRef);
    t.ocorrencias = ocorr;
    t.alerta = !reg.livre && (ocorr >= cfg.limite || t.faltas > 0);
    t.perfil = reg.livre ? '' : (t.alerta ? 'ALERTA: ' + [t.faltas ? t.faltas + ' falta(s)' : '', ocorr ? ocorr + ' ocorrência(s)' : ''].filter(String).join(', ') : 'Regular');
    t.livre = reg.livre;
    return { dias: lista, resumo: t };
  }

  // ---------- Banco de horas (fechamentoMensal_ e transportarSaldos_ da planilha) ----------
  // Dia do fechamento no mes (padrao 25; em mes mais curto, o ultimo dia).
  function diaFechamento(a, m, dia) { return Math.min(dia || 25, diasNoMes(a, m)); }

  // Soma um periodo (chaves yyyy-MM-dd, inclusive) a partir dos dias de calcularMes.
  function somarPeriodo(dias, ini, fim) {
    var s = { carga: 0, trab: 0, abono: 0, saldo: 0, atrasos: 0, antec: 0, pausas: 0, faltas: 0, incompletas: 0, diasTrab: 0 };
    dias.forEach(function (x) {
      if (x.key < ini || x.key > fim) return;
      var d = x.d;
      if (d.carga) s.carga += d.carga;
      if (d.trab) { s.trab += d.trab; s.diasTrab++; }
      if (d.saldo !== null) { s.saldo += d.saldo; s.abono += d.abono; }
      if (d.fAtraso) s.atrasos++;
      if (d.fAntec) s.antec++;
      if (d.fPausa) s.pausas++;
      if (d.falta) s.faltas++;
      if (d.incompleta) s.incompletas++;
    });
    return s;
  }

  // Fechamento: saldo do dia 1o ao fechamento + saldo transportado do mes anterior.
  // Negativo vai para desconto; positivo ate 1 dia de carga e compensado ate o fim do mes; o resto e desconsiderado.
  function fechamento(dias, ini, fim, anterior, cargaDia) {
    var s = somarPeriodo(dias, ini, fim);
    var ant = anterior || 0, total = ant + s.saldo, desc = 0, comp = 0, exc = 0;
    if (total < 0) desc = -total;
    else { comp = Math.min(total, cargaDia || 0); exc = total - comp; }
    return { anterior: ant, periodo: s.saldo, total: total, descontar: desc, compensar: comp, excedente: exc, soma: s };
  }

  // Transporte: saldo do dia seguinte ao fechamento ate o fim do mes + o que ficou para compensar.
  function transporte(dias, ini, fim, compensar) {
    var s = somarPeriodo(dias, ini, fim);
    return { pos: s.saldo, transportar: s.saldo + (compensar || 0) };
  }

  var api = { SIT_MANUAL: SIT_MANUAL, NOMES_DIA: NOMES_DIA, hhmm: hhmm, hhmmRelogio: hhmmRelogio, diaSemana: diaSemana, diasNoMes: diasNoMes,
    jornadaDoDia: jornadaDoDia, situacaoDoDia: situacaoDoDia, calcularDia: calcularDia, calcularMes: calcularMes,
    diaFechamento: diaFechamento, somarPeriodo: somarPeriodo, fechamento: fechamento, transporte: transporte };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.PontoCalculo = api;
})(typeof window !== 'undefined' ? window : globalThis);
