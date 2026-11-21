/* SAGA · Motor das planilhas (21/11/2026, Dr. Victor; bloco 320)
   Faz as contas como o Excel, aqui no navegador (nada sai do computador).
   Pasta de trabalho (o que fica salvo em documentos_editaveis.conteudo):
     { formato:1, ativa:0, abas:[ { nome, celulas:{ A1:{ v, f, t, casas, b, i, al, fundo, cor, nota, conferir, borda } },
       colunas:{ A:120 }, mesclas:['A1:H1'], paisagem:false, grade:true } ] }
     v = valor digitado (número, texto ou booleano); f = fórmula com '=' (forma canônica do Excel em inglês: SUM, ROUND, IF;
     argumentos com vírgula, decimal com ponto). Também aceita digitar em português (SOMA; ARRED; SE e ';' com ',' decimal).
     t = formato: reais | pct | num | int | data | texto. Datas ficam como número de série do Excel (dias desde 30/12/1899).
   Uso: var M = SagaPlanilhasMotor; var calc = M.calcular(pasta); calc.valor('Aba', 'A1'); M.texto(valor, celula)
        M.normalizarFormula('=SOMA(A1;A2)') → '=SUM(A1,A2)'; M.inserir(pasta, abaIdx, 'linha'|'coluna', pos, n); M.excluir(...)
   Erros (sempre à vista): #DIV/0! #REF! #VALUE! #NAME? #N/A #NUM! #CICLO! com a explicação em M.ERROS. */
(function(raiz){
  'use strict';

  /* ---------------- endereços ---------------- */
  function colNum(s){ var n = 0; s = s.toUpperCase(); for(var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; }
  function colTxt(n){ var s = ''; while(n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function endereco(ref){ var m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(ref); return m ? { c: colNum(m[1]), l: +m[2] } : null; }
  function ref(c, l){ return colTxt(c) + l; }

  var ERROS = {
    '#DIV/0!': 'Divisão por zero: falta um valor que entra na conta (ex.: a LOA ou o principal).',
    '#REF!': 'Referência quebrada: a fórmula aponta para uma célula ou aba que não existe mais.',
    '#VALUE!': 'Valor de tipo errado na conta (ex.: texto onde devia haver número).',
    '#NAME?': 'Nome de função ou de aba desconhecido.',
    '#N/A': 'Valor não disponível.',
    '#NUM!': 'Número inválido na conta.',
    '#CICLO!': 'Referência circular: a célula depende dela mesma.',
    '#ERRO!': 'Fórmula com erro de escrita.'
  };
  function Erro(c){ this.e = c; }
  Erro.prototype.toString = function(){ return this.e; };
  function erro(c){ return new Erro(c); }
  function ehErro(v){ return v instanceof Erro; }

  /* ---------------- leitura da fórmula ---------------- */
  var NOMES_PT = {
    'SOMA':'SUM','ARRED':'ROUND','ARREDONDAR.PARA.CIMA':'ROUNDUP','ARREDONDAR.PARA.BAIXO':'ROUNDDOWN','SE':'IF','SEERRO':'IFERROR',
    'MÍNIMO':'MIN','MINIMO':'MIN','MÁXIMO':'MAX','MAXIMO':'MAX','MÉDIA':'AVERAGE','MEDIA':'AVERAGE','E':'AND','OU':'OR','NÃO':'NOT','NAO':'NOT',
    'CONT.NÚM':'COUNT','CONT.NUM':'COUNT','CONT.VALORES':'COUNTA','CONCATENAR':'CONCATENATE','SOMARPRODUTO':'SUMPRODUCT','TRUNCAR':'TRUNC',
    'DATA':'DATE','ANO':'YEAR','MÊS':'MONTH','MES':'MONTH','DIA':'DAY','HOJE':'TODAY','SOMASE':'SUMIF','ÉERRO':'ISERROR','EERRO':'ISERROR',
    'ÉCÉL.VAZIA':'ISBLANK','ECEL.VAZIA':'ISBLANK','DIAS':'DAYS','MOD':'MOD','POTÊNCIA':'POWER','POTENCIA':'POWER','RAIZ':'SQRT','TEXTO':'TEXT'
  };
  function tokens(f, pt){
    var t = [], i = 0, s = f;
    while(i < s.length){
      var ch = s[i];
      if(/\s/.test(ch)){ i++; continue; }
      if(ch === '"'){ var j = i + 1, txt = ''; while(j < s.length){ if(s[j] === '"'){ if(s[j + 1] === '"'){ txt += '"'; j += 2; continue; } break; } txt += s[j++]; } if(j >= s.length) throw erro('#ERRO!'); t.push({ k:'str', v:txt }); i = j + 1; continue; }
      if(ch === '#'){ var me = /^#(REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!)/.exec(s.slice(i)); if(me){ t.push({ k:'err', v:me[0] }); i += me[0].length; continue; } throw erro('#ERRO!'); }
      var mq = /^'((?:[^']|'')+)'!/.exec(s.slice(i));
      if(mq){ t.push({ k:'aba', v:mq[1].replace(/''/g, "'") }); i += mq[0].length; continue; }
      var dec = pt ? ',' : '.';
      var mn = pt ? /^\d+(?:,\d+)?(?:[eE][+-]?\d+)?/.exec(s.slice(i)) : /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
      if(mn && !/^[A-Za-z]/.test(s.slice(i + mn[0].length)) ){ t.push({ k:'num', v:parseFloat(mn[0].replace(dec, '.')) }); i += mn[0].length; continue; }
      var mw = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*/.exec(s.slice(i));
      var mr = /^\$?[A-Za-z]{1,3}\$?\d+/.exec(s.slice(i));
      if(mr && !/^[A-Za-z0-9_(]/.test(s.slice(i + mr[0].length)) || (mr && s[i + mr[0].length] === ':')){
        if(s[i + mr[0].length] === '!'){ t.push({ k:'aba', v:mr[0] }); i += mr[0].length + 1; continue; }
        t.push({ k:'ref', v:mr[0] }); i += mr[0].length; continue;
      }
      if(mw){
        var w = mw[0], dep = s.slice(i + w.length);
        if(dep[0] === '!'){ t.push({ k:'aba', v:w }); i += w.length + 1; continue; }
        if(/^\s*\(/.test(dep)){ var up = w.toUpperCase(); t.push({ k:'fn', v:NOMES_PT[up] || up }); i += w.length; continue; }
        var U = w.toUpperCase();
        if(U === 'TRUE' || U === 'VERDADEIRO'){ t.push({ k:'bool', v:true }); i += w.length; continue; }
        if(U === 'FALSE' || U === 'FALSO'){ t.push({ k:'bool', v:false }); i += w.length; continue; }
        t.push({ k:'nome', v:w }); i += w.length; continue;
      }
      var op2 = s.substr(i, 2);
      if(op2 === '<>' || op2 === '<=' || op2 === '>='){ t.push({ k:'op', v:op2 }); i += 2; continue; }
      if('+-*/^&=<>%:(),;'.indexOf(ch) >= 0){
        if(ch === ';' || (ch === ',' && !pt)) t.push({ k:'sep' });
        else if(ch === ',' && pt) t.push({ k:'sep' });
        else if(ch === '(' || ch === ')') t.push({ k:ch });
        else if(ch === ':') t.push({ k:':' });
        else t.push({ k:'op', v:ch });
        i++; continue;
      }
      throw erro('#ERRO!');
    }
    return t;
  }
  /* fórmula em português (tem ';' ou nome de função em português) */
  function pareceptBR(f){ return f.indexOf(';') >= 0; }

  /* árvore */
  function arvore(f){
    var corpo = f.replace(/^=/, '');
    var pt = pareceptBR(corpo);
    var tk = tokens(corpo, pt), p = 0;
    function ver(){ return tk[p]; }
    function pega(k){ var x = tk[p]; if(!x || (k && x.k !== k)) throw erro('#ERRO!'); p++; return x; }
    function comparacao(){ var a = concat(); while(ver() && ver().k === 'op' && ['=','<>','<','>','<=','>='].indexOf(ver().v) >= 0){ var o = pega().v; a = { op:o, a:a, b:concat() }; } return a; }
    function concat(){ var a = soma(); while(ver() && ver().k === 'op' && ver().v === '&'){ pega(); a = { op:'&', a:a, b:soma() }; } return a; }
    function soma(){ var a = mult(); while(ver() && ver().k === 'op' && (ver().v === '+' || ver().v === '-')){ var o = pega().v; a = { op:o, a:a, b:mult() }; } return a; }
    function mult(){ var a = pot(); while(ver() && ver().k === 'op' && (ver().v === '*' || ver().v === '/')){ var o = pega().v; a = { op:o, a:a, b:pot() }; } return a; }
    function pot(){ var a = unario(); while(ver() && ver().k === 'op' && ver().v === '^'){ pega(); a = { op:'^', a:a, b:unario() }; } return a; }
    function unario(){ if(ver() && ver().k === 'op' && (ver().v === '-' || ver().v === '+')){ var o = pega().v; var x = unario(); return o === '-' ? { op:'neg', a:x } : x; } return pct(); }
    function pct(){ var a = prim(); while(ver() && ver().k === 'op' && ver().v === '%'){ pega(); a = { op:'%', a:a }; } return a; }
    function celulaOuFaixa(aba){
      var r1 = pega('ref').v;
      if(ver() && ver().k === ':'){ pega(); var r2 = pega('ref').v; return { faixa:[r1, r2], aba:aba }; }
      return { cel:r1, aba:aba };
    }
    function prim(){
      var x = ver(); if(!x) throw erro('#ERRO!');
      if(x.k === 'num'){ p++; return { n:x.v }; }
      if(x.k === 'str'){ p++; return { s:x.v }; }
      if(x.k === 'bool'){ p++; return { bo:x.v }; }
      if(x.k === 'err'){ p++; return { err:x.v }; }
      if(x.k === '('){ p++; var e = comparacao(); pega(')'); return e; }
      if(x.k === 'aba'){ p++; if(ver() && ver().k === 'err'){ return { err:pega().v }; } return celulaOuFaixa(x.v); }
      if(x.k === 'ref') return celulaOuFaixa(null);
      if(x.k === 'fn'){
        p++; pega('('); var args = [];
        if(ver() && ver().k !== ')'){
          for(;;){
            if(ver() && (ver().k === 'sep' || ver().k === ')')) args.push({ vazio:true }); else args.push(comparacao());
            if(ver() && ver().k === 'sep'){ p++; continue; }
            break;
          }
        }
        pega(')'); return { fn:x.v, args:args };
      }
      if(x.k === 'nome'){ p++; return { nome:x.v }; }
      throw erro('#ERRO!');
    }
    var a = comparacao(); if(p < tk.length) throw erro('#ERRO!');
    return a;
  }

  /* escreve a fórmula de volta (forma canônica: inglês, vírgula entre argumentos, ponto decimal) */
  function abaTxt(a){ return /^[A-Za-z_][A-Za-z0-9_]*$/.test(a) && !/^[A-Za-z]{1,3}\d+$/.test(a) ? a + '!' : "'" + a.replace(/'/g, "''") + "'!"; }
  function escrever(n){
    if(n.n != null) return String(n.n);
    if(n.s != null) return '"' + n.s.replace(/"/g, '""') + '"';
    if(n.bo != null) return n.bo ? 'TRUE' : 'FALSE';
    if(n.err) return n.err;
    if(n.cel) return (n.aba ? abaTxt(n.aba) : '') + n.cel;
    if(n.faixa) return (n.aba ? abaTxt(n.aba) : '') + n.faixa[0] + ':' + n.faixa[1];
    if(n.fn) return n.fn + '(' + n.args.map(function(x){ return x.vazio ? '' : escrever(x); }).join(',') + ')';
    if(n.nome) return n.nome;
    if(n.op === 'neg') return '-' + escrever(n.a);
    if(n.op === '%') return escrever(n.a) + '%';
    var pa = n.a.op && n.a.op !== 'neg' && n.a.op !== '%' && prec(n.a.op) < prec(n.op) ? '(' + escrever(n.a) + ')' : escrever(n.a);
    var pb = n.b.op && n.b.op !== 'neg' && n.b.op !== '%' && prec(n.b.op) <= prec(n.op) ? '(' + escrever(n.b) + ')' : escrever(n.b);
    return pa + n.op + pb;
  }
  function prec(o){ return { '=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1,'&':2,'+':3,'-':3,'*':4,'/':4,'^':5 }[o] || 6; }
  function normalizarFormula(f){
    if(typeof f !== 'string' || f[0] !== '=') return f;
    try{ return '=' + escrever(arvore(f)); }catch(e){ return f; }
  }

  /* ---------------- conversões ---------------- */
  function numero(v){
    if(ehErro(v)) return v;
    if(v == null || v === '') return 0;
    if(typeof v === 'number') return v;
    if(typeof v === 'boolean') return v ? 1 : 0;
    var s = String(v).trim(); if(s === '') return 0;
    var n = lerNumeroBR(s); return n == null ? erro('#VALUE!') : n;
  }
  /* "1.234,56" "R$ 10,00" "13,6%" "0.25" → número (ou null) */
  function lerNumeroBR(s){
    s = String(s).trim(); if(!s) return null;
    var pctx = /%$/.test(s); s = s.replace(/^R\$\s*/i, '').replace(/%$/, '').trim();
    if(!/^[-+]?[\d.,]+$/.test(s)) return null;
    var n;
    if(s.indexOf(',') >= 0) n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    else if(/^\d{1,3}(\.\d{3})+$/.test(s.replace(/^[-+]/, ''))) n = parseFloat(s.replace(/\./g, ''));
    else n = parseFloat(s);
    if(!isFinite(n)) return null;
    return pctx ? n / 100 : n;
  }
  function texto(v){ if(ehErro(v)) return v; if(v == null) return ''; if(typeof v === 'boolean') return v ? 'VERDADEIRO' : 'FALSO'; return String(v); }
  function achatar(v, out){ out = out || []; if(Array.isArray(v)) v.forEach(function(x){ achatar(x, out); }); else out.push(v); return out; }

  /* datas: número de série do Excel */
  var DIA = 86400000, BASE = Date.UTC(1899, 11, 30);
  function dataSerie(d, m, a){ return Math.round((Date.UTC(a, m - 1, d) - BASE) / DIA); }
  function serieData(n){ var d = new Date(BASE + Math.round(n) * DIA); return { d:d.getUTCDate(), m:d.getUTCMonth() + 1, a:d.getUTCFullYear() }; }
  function lerData(s){
    if(s == null) return null; s = String(s).trim();
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if(m) return dataSerie(+m[1], +m[2], +m[3]);
    m = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(s); if(m) return dataSerie(+m[3], +m[2], +m[1]);
    return null;
  }

  /* ---------------- funções ---------------- */
  function arred(x, c, modo){
    var f = Math.pow(10, c), y = x * f;
    var r = modo === 'cima' ? (y < 0 ? -Math.ceil(-y - 1e-9) : Math.ceil(y - 1e-9)) : modo === 'baixo' ? (y < 0 ? -Math.floor(-y + 1e-9) : Math.floor(y + 1e-9)) : (y < 0 ? -Math.round(-y + 1e-9) : Math.round(y + 1e-9));
    return r / f;
  }
  var FN = {
    SUM: function(a){ var s = 0; for(var i = 0; i < a.length; i++){ var l = achatar(a[i]); for(var j = 0; j < l.length; j++){ var v = l[j]; if(ehErro(v)) return v; if(typeof v === 'number') s += v; else if(!Array.isArray(a[i]) && v !== '' && v != null){ var n = numero(v); if(ehErro(n)) return n; s += n; } } } return s; },
    ROUND: function(a){ var x = numero(a[0]), c = a.length > 1 ? numero(a[1]) : 0; if(ehErro(x)) return x; if(ehErro(c)) return c; return arred(x, c); },
    ROUNDUP: function(a){ var x = numero(a[0]), c = a.length > 1 ? numero(a[1]) : 0; if(ehErro(x)) return x; return arred(x, c, 'cima'); },
    ROUNDDOWN: function(a){ var x = numero(a[0]), c = a.length > 1 ? numero(a[1]) : 0; if(ehErro(x)) return x; return arred(x, c, 'baixo'); },
    TRUNC: function(a){ return FN.ROUNDDOWN(a); },
    INT: function(a){ var x = numero(a[0]); return ehErro(x) ? x : Math.floor(x); },
    ABS: function(a){ var x = numero(a[0]); return ehErro(x) ? x : Math.abs(x); },
    SQRT: function(a){ var x = numero(a[0]); return ehErro(x) ? x : (x < 0 ? erro('#NUM!') : Math.sqrt(x)); },
    POWER: function(a){ var x = numero(a[0]), y = numero(a[1]); return ehErro(x) ? x : ehErro(y) ? y : Math.pow(x, y); },
    MOD: function(a){ var x = numero(a[0]), y = numero(a[1]); if(ehErro(x)) return x; if(ehErro(y)) return y; if(y === 0) return erro('#DIV/0!'); return x - y * Math.floor(x / y); },
    MIN: function(a){ var l = achatar(a).filter(function(v){ return typeof v === 'number' || ehErro(v); }); for(var i = 0; i < l.length; i++) if(ehErro(l[i])) return l[i]; return l.length ? Math.min.apply(null, l) : 0; },
    MAX: function(a){ var l = achatar(a).filter(function(v){ return typeof v === 'number' || ehErro(v); }); for(var i = 0; i < l.length; i++) if(ehErro(l[i])) return l[i]; return l.length ? Math.max.apply(null, l) : 0; },
    AVERAGE: function(a){ var l = achatar(a).filter(function(v){ return typeof v === 'number' || ehErro(v); }); for(var i = 0; i < l.length; i++) if(ehErro(l[i])) return l[i]; return l.length ? l.reduce(function(s, x){ return s + x; }, 0) / l.length : erro('#DIV/0!'); },
    COUNT: function(a){ return achatar(a).filter(function(v){ return typeof v === 'number'; }).length; },
    COUNTA: function(a){ return achatar(a).filter(function(v){ return v !== '' && v != null; }).length; },
    AND: function(a){ var l = achatar(a); for(var i = 0; i < l.length; i++){ if(ehErro(l[i])) return l[i]; if(!l[i]) return false; } return true; },
    OR: function(a){ var l = achatar(a); for(var i = 0; i < l.length; i++){ if(ehErro(l[i])) return l[i]; if(l[i]) return true; } return false; },
    NOT: function(a){ var v = a[0]; return ehErro(v) ? v : !v; },
    CONCATENATE: function(a){ var s = ''; var l = achatar(a); for(var i = 0; i < l.length; i++){ if(ehErro(l[i])) return l[i]; s += texto(l[i]); } return s; },
    CONCAT: function(a){ return FN.CONCATENATE(a); },
    SUMPRODUCT: function(a){ var ls = a.map(function(x){ return achatar(x); }); var n = ls[0] ? ls[0].length : 0, s = 0; for(var i = 0; i < n; i++){ var p = 1; for(var k = 0; k < ls.length; k++){ var v = ls[k][i]; if(ehErro(v)) return v; p *= typeof v === 'number' ? v : 0; } s += p; } return s; },
    DATE: function(a){ var y = numero(a[0]), m = numero(a[1]), d = numero(a[2]); if(ehErro(y)) return y; return Math.round((Date.UTC(y, m - 1, d) - BASE) / DIA); },
    YEAR: function(a){ var n = numero(a[0]); return ehErro(n) ? n : serieData(n).a; },
    MONTH: function(a){ var n = numero(a[0]); return ehErro(n) ? n : serieData(n).m; },
    DAY: function(a){ var n = numero(a[0]); return ehErro(n) ? n : serieData(n).d; },
    DAYS: function(a){ var x = numero(a[0]), y = numero(a[1]); return ehErro(x) ? x : ehErro(y) ? y : x - y; },
    TODAY: function(){ var h = new Date(); return dataSerie(h.getDate(), h.getMonth() + 1, h.getFullYear()); },
    ISERROR: function(a){ return ehErro(a[0]); },
    ISBLANK: function(a){ return a[0] === '' || a[0] == null; },
    TEXT: function(a){ return texto(a[0]); }
  };
  var PREGUICOSAS = { IF: 1, IFERROR: 1, SUMIF: 1 };

  /* ---------------- cálculo da pasta ---------------- */
  function calcular(pasta){
    var abas = (pasta && pasta.abas) || [], porNome = {};
    abas.forEach(function(a, i){ porNome[a.nome.toLowerCase()] = i; });
    var cache = {}, visitando = {}, arvores = {};
    function idxAba(nome, atual){ if(nome == null) return atual; var i = porNome[String(nome).toLowerCase()]; return i == null ? -1 : i; }
    function valorCel(ai, r){
      var e = endereco(r); if(!e) return erro('#REF!');
      var chave = ai + '!' + colTxt(e.c) + e.l;
      if(chave in cache) return cache[chave];
      var aba = abas[ai], c = aba && aba.celulas && aba.celulas[colTxt(e.c) + e.l];
      if(!c) return '';
      if(c.f == null || c.f === ''){ return c.v == null ? '' : c.v; }
      if(visitando[chave]) return erro('#CICLO!');
      visitando[chave] = true;
      var v;
      try{
        var arv = arvores[chave] || (arvores[chave] = arvore(c.f));
        v = avaliar(arv, ai);
        if(Array.isArray(v)) v = achatar(v)[0];
        if(typeof v === 'number' && !isFinite(v)) v = erro('#DIV/0!');
        if(v == null) v = 0;
      }catch(x){ v = ehErro(x) ? x : erro('#ERRO!'); }
      delete visitando[chave];
      cache[chave] = v; return v;
    }
    function faixa(ai, r1, r2){
      var a = endereco(r1), b = endereco(r2); if(!a || !b) return erro('#REF!');
      var out = [];
      for(var l = Math.min(a.l, b.l); l <= Math.max(a.l, b.l); l++) for(var c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) out.push(valorCel(ai, ref(c, l)));
      return out;
    }
    function avaliar(n, ai){
      if(n.n != null) return n.n;
      if(n.s != null) return n.s;
      if(n.bo != null) return n.bo;
      if(n.err) return erro(n.err);
      if(n.vazio) return '';
      if(n.cel){ var i = idxAba(n.aba, ai); return i < 0 ? erro('#REF!') : valorCel(i, n.cel); }
      if(n.faixa){ var j = idxAba(n.aba, ai); return j < 0 ? erro('#REF!') : faixa(j, n.faixa[0], n.faixa[1]); }
      if(n.nome) return erro('#NAME?');
      if(n.fn){
        if(n.fn === 'IF'){ var cnd = avaliar(n.args[0], ai); if(Array.isArray(cnd)) cnd = cnd[0]; if(ehErro(cnd)) return cnd; var vb = typeof cnd === 'string' ? cnd !== '' : !!cnd; var ramo = vb ? n.args[1] : n.args[2]; return ramo ? (ramo.vazio ? 0 : avaliar(ramo, ai)) : (vb ? true : false); }
        if(n.fn === 'IFERROR'){ var v0 = avaliar(n.args[0], ai); if(Array.isArray(v0)) v0 = v0[0]; return ehErro(v0) ? avaliar(n.args[1], ai) : v0; }
        if(n.fn === 'SUMIF'){
          var rg = avaliar(n.args[0], ai), crit = avaliar(n.args[1], ai), sm = n.args[2] ? avaliar(n.args[2], ai) : rg;
          rg = achatar(rg); sm = achatar(sm); var tot = 0, cm = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(crit)), op = cm[1] || '=', alvo = cm[2], an = lerNumeroBR(alvo);
          for(var k = 0; k < rg.length; k++){ var x = rg[k], ok;
            var xn = typeof x === 'number' ? x : lerNumeroBR(x);
            if(an != null && xn != null) ok = op === '=' ? xn === an : op === '<>' ? xn !== an : op === '<' ? xn < an : op === '>' ? xn > an : op === '<=' ? xn <= an : xn >= an;
            else ok = op === '<>' ? String(x).toLowerCase() !== alvo.toLowerCase() : String(x).toLowerCase() === alvo.toLowerCase();
            if(ok && typeof sm[k] === 'number') tot += sm[k]; }
          return tot;
        }
        var f = FN[n.fn]; if(!f) return erro('#NAME?');
        var args = n.args.map(function(a){ return a.vazio ? '' : avaliar(a, ai); });
        return f(args);
      }
      if(n.op === 'neg'){ var x1 = numero(un(avaliar(n.a, ai))); return ehErro(x1) ? x1 : -x1; }
      if(n.op === '%'){ var x2 = numero(un(avaliar(n.a, ai))); return ehErro(x2) ? x2 : x2 / 100; }
      var A = un(avaliar(n.a, ai)), B = un(avaliar(n.b, ai));
      if(ehErro(A)) return A; if(ehErro(B)) return B;
      if(n.op === '&') return texto(A) + texto(B);
      if(['=','<>','<','>','<=','>='].indexOf(n.op) >= 0){
        var a1 = A === '' ? (typeof B === 'string' ? '' : 0) : A, b1 = B === '' ? (typeof A === 'string' ? '' : 0) : B, cmp;
        if(typeof a1 === 'string' && typeof b1 === 'string'){ a1 = a1.toLowerCase(); b1 = b1.toLowerCase(); }
        else if(typeof a1 === 'string' || typeof b1 === 'string'){ cmp = typeof a1 === 'string' ? 1 : -1; }
        if(cmp == null) cmp = a1 < b1 ? -1 : a1 > b1 ? 1 : 0;
        return { '=':cmp === 0, '<>':cmp !== 0, '<':cmp < 0, '>':cmp > 0, '<=':cmp <= 0, '>=':cmp >= 0 }[n.op];
      }
      var x = numero(A), y = numero(B); if(ehErro(x)) return x; if(ehErro(y)) return y;
      switch(n.op){
        case '+': return x + y; case '-': return x - y; case '*': return x * y;
        case '/': return y === 0 ? erro('#DIV/0!') : x / y;
        case '^': return Math.pow(x, y);
      }
      return erro('#ERRO!');
    }
    function un(v){ return Array.isArray(v) ? (v.length === 1 ? v[0] : erro('#VALUE!')) : v; }
    return {
      valor: function(aba, r){ var i = typeof aba === 'number' ? aba : idxAba(aba, 0); return i < 0 ? erro('#REF!') : valorCel(i, r.replace(/\$/g, '').toUpperCase()); },
      tudo: function(){ var out = []; abas.forEach(function(a, i){ var m = {}; Object.keys(a.celulas || {}).forEach(function(r){ m[r] = valorCel(i, r); }); out.push(m); }); return out; }
    };
  }

  /* ---------------- texto mostrado na célula ---------------- */
  function fmtNum(n, casas, min){ return n.toLocaleString('pt-BR', { minimumFractionDigits: min == null ? casas : min, maximumFractionDigits: casas }); }
  function mostrar(v, c){
    c = c || {};
    if(ehErro(v)) return v.e;
    if(v === '' || v == null) return '';
    if(typeof v === 'boolean') return v ? 'VERDADEIRO' : 'FALSO';
    if(typeof v === 'number'){
      var cs = c.casas;
      switch(c.t){
        case 'reais': return (v < 0 ? '-R$ ' : 'R$ ') + fmtNum(Math.abs(v), cs == null ? 2 : cs);
        case 'pct': return fmtNum(v * 100, cs == null ? 2 : cs) + '%';
        case 'num': return fmtNum(v, cs == null ? 2 : cs);
        case 'int': return fmtNum(v, 0);
        case 'data': if(v > 0 && v < 2958466){ var d = serieData(v); return ('0' + d.d).slice(-2) + '/' + ('0' + d.m).slice(-2) + '/' + d.a; } return fmtNum(v, 2);
        case 'texto': return String(v).replace('.', ',');
      }
      return fmtNum(v, cs == null ? 8 : cs, 0);
    }
    return String(v);
  }
  /* o que a pessoa digitou → {v} ou {f} */
  function lerEntrada(txt, c){
    c = c || {};
    if(txt == null) return { v: '' };
    var s = String(txt);
    if(s[0] === '=' && s.length > 1) return { f: normalizarFormula(s) };
    var tr = s.trim();
    if(tr === '') return { v: '' };
    if(c.t === 'texto') return { v: s };
    if(c.t === 'data' || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(tr)){ var d = lerData(tr); if(d != null) return { v: d, t: c.t || 'data' }; }
    var n = lerNumeroBR(tr);
    if(n != null){
      if(c.t === 'pct' && !/%$/.test(tr)) n = n / 100;
      var sug = !c.t ? (/^R\$/i.test(tr) ? 'reais' : /%$/.test(tr) ? 'pct' : null) : null;
      return sug ? { v: n, t: sug } : { v: n };
    }
    if(/^(verdadeiro|true)$/i.test(tr)) return { v: true };
    if(/^(falso|false)$/i.test(tr)) return { v: false };
    return { v: s };
  }
  /* texto para a caixa de edição */
  function paraEditar(c){
    if(!c) return '';
    if(c.f) return c.f;
    var v = c.v; if(v == null) return '';
    if(typeof v === 'number'){
      if(c.t === 'pct') return fmtNum(v * 100, 10, 0);
      if(c.t === 'data') return mostrar(v, c);
      if(c.t === 'reais') return fmtNum(v, Math.max(2, c.casas || 2), 2);
      return fmtNum(v, 10, 0).replace(/\./g, '');
    }
    if(typeof v === 'boolean') return v ? 'VERDADEIRO' : 'FALSO';
    return String(v);
  }

  /* ---------------- inserir / excluir linhas e colunas (as fórmulas acompanham) ---------------- */
  function moverRefs(f, abaAlvo, abaDaFormula, eixo, pos, n){
    /* n > 0: inseriu n a partir de pos (as de pos em diante andam n). n < 0: excluiu -n a partir de pos. */
    try{
      var a = arvore(f), quebrou = false;
      (function anda(x){
        if(!x || typeof x !== 'object') return;
        if(x.cel || x.faixa){
          var nomeAba = x.aba == null ? abaDaFormula : x.aba;
          if(String(nomeAba).toLowerCase() === String(abaAlvo).toLowerCase()){
            var muda = function(r){
              var m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(r); var c = colNum(m[2]), l = +m[4];
              var v = eixo === 'linha' ? l : c;
              if(n > 0){ if(v >= pos) v += n; }
              else { if(v >= pos && v < pos - n) return null; if(v >= pos - n) v += n; }
              if(eixo === 'linha') l = v; else c = v;
              return m[1] + colTxt(c) + m[3] + l;
            };
            if(x.cel){ var r = muda(x.cel); if(r == null){ x.err = '#REF!'; delete x.cel; quebrou = true; } else x.cel = r; }
            else {
              var r1 = muda(x.faixa[0]), r2 = muda(x.faixa[1]);
              if(r1 == null && r2 == null){ x.err = '#REF!'; delete x.faixa; quebrou = true; }
              else {
                if(r1 == null){ var e1 = endereco(x.faixa[0].replace(/\$/g, '')); r1 = eixo === 'linha' ? colTxt(e1.c) + pos : colTxt(pos) + e1.l; }
                if(r2 == null){ var e2 = endereco(x.faixa[1].replace(/\$/g, '')); r2 = eixo === 'linha' ? colTxt(e2.c) + (pos - 1) : colTxt(pos - 1) + e2.l; }
                x.faixa = [r1, r2];
              }
            }
          }
        }
        if(x.a) anda(x.a); if(x.b) anda(x.b); if(x.args) x.args.forEach(anda);
      })(a);
      return '=' + escrever(a);
    }catch(e){ return f; }
  }
  function deslocar(pasta, ai, eixo, pos, n){
    var aba = pasta.abas[ai], novas = {};
    Object.keys(aba.celulas || {}).forEach(function(r){
      var e = endereco(r), v = eixo === 'linha' ? e.l : e.c;
      if(n < 0 && v >= pos && v < pos - n) return;
      if(v >= pos) v += n;
      novas[eixo === 'linha' ? ref(e.c, v) : ref(v, e.l)] = aba.celulas[r];
    });
    aba.celulas = novas;
    if(eixo === 'coluna' && aba.colunas){
      var cols = {}; Object.keys(aba.colunas).forEach(function(k){ var c = colNum(k); if(n < 0 && c >= pos && c < pos - n) return; if(c >= pos) c += n; cols[colTxt(c)] = aba.colunas[k]; }); aba.colunas = cols;
    }
    if(eixo === 'linha' && aba.linhas){
      var lin = {}; Object.keys(aba.linhas).forEach(function(k){ var l = +k; if(n < 0 && l >= pos && l < pos - n) return; if(l >= pos) l += n; lin[l] = aba.linhas[k]; }); aba.linhas = lin;
    }
    if(aba.mesclas) aba.mesclas = aba.mesclas.map(function(m){
      var p = m.split(':'), a = endereco(p[0]), b = endereco(p[1]);
      function mv(e){ var v = eixo === 'linha' ? e.l : e.c; if(n < 0 && v >= pos && v < pos - n) return null; if(v >= pos) v += n; return eixo === 'linha' ? { c:e.c, l:v } : { c:v, l:e.l }; }
      var a2 = mv(a), b2 = mv(b); if(!a2 || !b2) return null;
      return ref(a2.c, a2.l) + ':' + ref(b2.c, b2.l);
    }).filter(Boolean);
    pasta.abas.forEach(function(outra){
      Object.keys(outra.celulas || {}).forEach(function(r){
        var c = outra.celulas[r];
        if(c.f) c.f = moverRefs(c.f, aba.nome, outra.nome, eixo, pos, n);
      });
    });
  }
  function inserir(pasta, ai, eixo, pos, n){ deslocar(pasta, ai, eixo, pos, Math.abs(n || 1)); }
  function excluir(pasta, ai, eixo, pos, n){ deslocar(pasta, ai, eixo, pos, -Math.abs(n || 1)); }
  /* renomear aba: as fórmulas que apontam para ela acompanham */
  function renomearAba(pasta, ai, novo){
    var velho = pasta.abas[ai].nome;
    pasta.abas.forEach(function(outra){
      Object.keys(outra.celulas || {}).forEach(function(r){
        var c = outra.celulas[r]; if(!c.f) return;
        try{
          var a = arvore(c.f), mudou = false;
          (function anda(x){ if(!x || typeof x !== 'object') return; if((x.cel || x.faixa) && x.aba && x.aba.toLowerCase() === velho.toLowerCase()){ x.aba = novo; mudou = true; } if(x.a) anda(x.a); if(x.b) anda(x.b); if(x.args) x.args.forEach(anda); })(a);
          if(mudou) c.f = '=' + escrever(a);
        }catch(e){}
      });
    });
    pasta.abas[ai].nome = novo;
  }
  /* copiar uma fórmula para outra célula (referências relativas andam junto, como no Excel) */
  function transpor(f, dc, dl){
    try{
      var a = arvore(f);
      (function anda(x){
        if(!x || typeof x !== 'object') return;
        function mv(r){ var m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(r); var c = colNum(m[2]), l = +m[4]; if(!m[1]) c += dc; if(!m[3]) l += dl; if(c < 1 || l < 1) return null; return m[1] + colTxt(c) + m[3] + l; }
        if(x.cel){ var r = mv(x.cel); if(r == null){ x.err = '#REF!'; delete x.cel; } else x.cel = r; }
        if(x.faixa){ var r1 = mv(x.faixa[0]), r2 = mv(x.faixa[1]); if(r1 == null || r2 == null){ x.err = '#REF!'; delete x.faixa; } else x.faixa = [r1, r2]; }
        if(x.a) anda(x.a); if(x.b) anda(x.b); if(x.args) x.args.forEach(anda);
      })(a);
      return '=' + escrever(a);
    }catch(e){ return f; }
  }
  /* área usada da aba */
  function usada(aba){
    var maxC = 0, maxL = 0;
    Object.keys(aba.celulas || {}).forEach(function(r){ var c = aba.celulas[r]; if((c.v === '' || c.v == null) && !c.f && !c.fundo) return; var e = endereco(r); if(e.c > maxC) maxC = e.c; if(e.l > maxL) maxL = e.l; });
    (aba.mesclas || []).forEach(function(m){ var e = endereco(m.split(':')[1]); if(e.c > maxC) maxC = e.c; if(e.l > maxL) maxL = e.l; });
    return { colunas: maxC, linhas: maxL };
  }
  function pastaNova(){ return { formato: 1, ativa: 0, abas: [{ nome: 'Planilha 1', celulas: {}, colunas: {}, mesclas: [] }] }; }

  raiz.SagaPlanilhasMotor = {
    colNum: colNum, colTxt: colTxt, endereco: endereco, ref: ref,
    calcular: calcular, mostrar: mostrar, lerEntrada: lerEntrada, paraEditar: paraEditar,
    normalizarFormula: normalizarFormula, arvore: arvore, escrever: escrever, transpor: transpor,
    inserir: inserir, excluir: excluir, renomearAba: renomearAba, usada: usada, pastaNova: pastaNova,
    ehErro: ehErro, ERROS: ERROS, lerNumeroBR: lerNumeroBR, lerData: lerData, dataSerie: dataSerie, serieData: serieData
  };
})(typeof window !== 'undefined' ? window : globalThis);
