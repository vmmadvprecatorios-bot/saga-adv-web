/* =====================================================================
   SAGA · Papéis timbrados e petições (T167, 14/11/2026, Dr. Victor)
   Gera a petição em Word (.docx) e em PDF, no próprio navegador, POR CIMA
   do papel timbrado guardado no SAGA (Biblioteca > Papéis timbrados).
   - Word: abre o .docx do timbrado e põe o texto no corpo, com a mesma
     montagem das skills do Claude (peticao-vmm, peticao-ancref,
     peticao-sarmento: blocos enderecamento, autos, paragrafo, titulo_peca,
     topico, pedidos, citacao, fecho, assinatura...).
   - PDF: desenha o texto (pdf-lib) sobre o FUNDO em PDF do timbrado
     (1ª página e demais), com o número da página no lugar do rodapé.
   Trocar o timbrado = trocar só os arquivos dele; os modelos são só texto.
   Uso: SagaTimbrado.listar(sb) · SagaTimbrado.gerar({sb, timbrado, modelo,
        valores, formato:'docx'|'pdf', impressao}) · SagaTimbrado.baixar(blob, nome)
   Nada sai do computador: os arquivos vêm do lugar privado 'timbrados'.
   ===================================================================== */
window.SagaTimbrado = (function(){
  'use strict';
  var BUCKET = 'timbrados';
  var VERSAO = (function(){
    try{ var s = document.currentScript && document.currentScript.src; var m = s && s.match(/[?&]v=(\d+)/); return m ? m[1] : ''; }catch(e){ return ''; }
  })();
  var BASE = (function(){
    try{ var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^\/]*$/, '') : ''; }catch(e){ return ''; }
  })();

  /* ---------------- utilidades ---------------- */
  function escXml(t){
    return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function escAttr(t){ return escXml(t).replace(/"/g,'&quot;'); }
  var avisos = [];
  function limpar(t){
    t = String(t == null ? '' : t);
    if(/[—–]/.test(t)){ avisos.push('Travessão trocado por vírgula em: ' + t.slice(0,60) + '...'); t = t.replace(/\s*[—–]\s*/g, ', '); }
    return t;
  }
  var ROMANOS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX',
                 'XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX'];
  var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  function dataPorExtenso(d){
    d = d || new Date();
    var p = new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Maceio',day:'numeric',month:'numeric',year:'numeric'}).formatToParts(d);
    var o = {}; p.forEach(function(x){ o[x.type] = x.value; });
    return o.day + ' de ' + MESES[(+o.month) - 1] + ' de ' + o.year;
  }

  /* Preenche os campos {chave} do modelo. Campo vazio fica como [Rótulo] para completar no Word. */
  function preencher(blocos, campos, valores){
    valores = valores || {};
    var rot = {};
    (campos || []).forEach(function(c){ rot[c.chave] = c.rotulo || c.chave; });
    function troca(s){
      return String(s).replace(/\{([a-z0-9_]+)\}/gi, function(m, k){
        var v = valores[k];
        if(v == null || String(v).trim() === ''){
          if(k === 'data') return dataPorExtenso();
          if(k === 'cidade') return 'Maceió/AL';
          return '[' + (rot[k] || k) + ']';
        }
        return String(v).trim();
      });
    }
    function anda(x){
      if(typeof x === 'string') return troca(x);
      if(Array.isArray(x)) return x.map(anda).filter(function(v){ return v !== '' && v !== '[]'; });
      if(x && typeof x === 'object'){ var o = {}; Object.keys(x).forEach(function(k){ o[k] = anda(x[k]); }); return o; }
      return x;
    }
    return anda(blocos || []);
  }

  var ASSINATURA_XML="<w:tbl><w:tblPr><w:tblStyle w:val=\"SimplesTabela1\"/><w:tblW w:w=\"0\" w:type=\"auto\"/><w:jc w:val=\"center\"/><w:tblInd w:w=\"0\" w:type=\"dxa\"/><w:tblBorders><w:top w:val=\"none\" w:sz=\"0\" w:space=\"0\" w:color=\"auto\"/><w:left w:val=\"none\" w:sz=\"0\" w:space=\"0\" w:color=\"auto\"/><w:bottom w:val=\"none\" w:sz=\"0\" w:space=\"0\" w:color=\"auto\"/><w:right w:val=\"none\" w:sz=\"0\" w:space=\"0\" w:color=\"auto\"/><w:insideH w:val=\"none\" w:sz=\"0\" w:space=\"0\" w:color=\"auto\"/><w:insideV w:val=\"none\" w:sz=\"0\" w:space=\"0\" w:color=\"auto\"/></w:tblBorders><w:tblLook w:val=\"04A0\" w:firstRow=\"1\" w:lastRow=\"0\" w:firstColumn=\"1\" w:lastColumn=\"0\" w:noHBand=\"0\" w:noVBand=\"1\"/></w:tblPr><w:tblGrid><w:gridCol w:w=\"4272\"/><w:gridCol w:w=\"4272\"/></w:tblGrid><w:tr w:rsidR=\"009E391D\" w14:paraId=\"674E51F9\" w14:textId=\"77777777\" w:rsidTr=\"00684ACA\"><w:trPr><w:cnfStyle w:val=\"100000000000\" w:firstRow=\"1\" w:lastRow=\"0\" w:firstColumn=\"0\" w:lastColumn=\"0\" w:oddVBand=\"0\" w:evenVBand=\"0\" w:oddHBand=\"0\" w:evenHBand=\"0\" w:firstRowFirstColumn=\"0\" w:firstRowLastColumn=\"0\" w:lastRowFirstColumn=\"0\" w:lastRowLastColumn=\"0\"/><w:trHeight w:val=\"599\"/><w:jc w:val=\"center\"/></w:trPr><w:tc><w:tcPr><w:cnfStyle w:val=\"001000000000\" w:firstRow=\"0\" w:lastRow=\"0\" w:firstColumn=\"1\" w:lastColumn=\"0\" w:oddVBand=\"0\" w:evenVBand=\"0\" w:oddHBand=\"0\" w:evenHBand=\"0\" w:firstRowFirstColumn=\"0\" w:firstRowLastColumn=\"0\" w:lastRowFirstColumn=\"0\" w:lastRowLastColumn=\"0\"/><w:tcW w:w=\"4272\" w:type=\"dxa\"/></w:tcPr><w:p w14:paraId=\"141C5CAC\" w14:textId=\"77777777\" w:rsidR=\"009E391D\" w:rsidRPr=\"0060427B\" w:rsidRDefault=\"009E391D\" w:rsidP=\"00684ACA\"><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:ind w:hanging=\"144\"/><w:jc w:val=\"center\"/><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:b w:val=\"0\"/><w:bCs w:val=\"0\"/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:b w:val=\"0\"/><w:bCs w:val=\"0\"/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr><w:t>João Francisco de Camargo</w:t></w:r></w:p><w:p w14:paraId=\"1F1BFADE\" w14:textId=\"77777777\" w:rsidR=\"009E391D\" w:rsidRPr=\"00CF53FB\" w:rsidRDefault=\"009E391D\" w:rsidP=\"00684ACA\"><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:jc w:val=\"center\"/><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:i/><w:iCs/></w:rPr></w:pPr><w:r w:rsidRPr=\"00CF53FB\"><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:i/><w:iCs/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr><w:t>OAB 6.805-AL</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w=\"4272\" w:type=\"dxa\"/></w:tcPr><w:p w14:paraId=\"0F73DBF6\" w14:textId=\"77777777\" w:rsidR=\"009E391D\" w:rsidRPr=\"0060427B\" w:rsidRDefault=\"009E391D\" w:rsidP=\"00684ACA\"><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:jc w:val=\"center\"/><w:cnfStyle w:val=\"100000000000\" w:firstRow=\"1\" w:lastRow=\"0\" w:firstColumn=\"0\" w:lastColumn=\"0\" w:oddVBand=\"0\" w:evenVBand=\"0\" w:oddHBand=\"0\" w:evenHBand=\"0\" w:firstRowFirstColumn=\"0\" w:firstRowLastColumn=\"0\" w:lastRowFirstColumn=\"0\" w:lastRowLastColumn=\"0\"/><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:b w:val=\"0\"/><w:bCs w:val=\"0\"/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:b w:val=\"0\"/><w:bCs w:val=\"0\"/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr><w:t>Victor de Medeiros Morais</w:t></w:r></w:p><w:p w14:paraId=\"6ACA2084\" w14:textId=\"77777777\" w:rsidR=\"009E391D\" w:rsidRPr=\"00CF53FB\" w:rsidRDefault=\"009E391D\" w:rsidP=\"00684ACA\"><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:jc w:val=\"center\"/><w:cnfStyle w:val=\"100000000000\" w:firstRow=\"1\" w:lastRow=\"0\" w:firstColumn=\"0\" w:lastColumn=\"0\" w:oddVBand=\"0\" w:evenVBand=\"0\" w:oddHBand=\"0\" w:evenHBand=\"0\" w:firstRowFirstColumn=\"0\" w:firstRowLastColumn=\"0\" w:lastRowFirstColumn=\"0\" w:lastRowLastColumn=\"0\"/><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:i/><w:iCs/><w:highlight w:val=\"yellow\"/></w:rPr></w:pPr><w:r w:rsidRPr=\"00CF53FB\"><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:i/><w:iCs/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr><w:t>OAB 15.318-AL</w:t></w:r></w:p></w:tc></w:tr><w:tr w:rsidR=\"009E391D\" w14:paraId=\"73163240\" w14:textId=\"77777777\" w:rsidTr=\"00684ACA\"><w:trPr><w:cnfStyle w:val=\"000000100000\" w:firstRow=\"0\" w:lastRow=\"0\" w:firstColumn=\"0\" w:lastColumn=\"0\" w:oddVBand=\"0\" w:evenVBand=\"0\" w:oddHBand=\"1\" w:evenHBand=\"0\" w:firstRowFirstColumn=\"0\" w:firstRowLastColumn=\"0\" w:lastRowFirstColumn=\"0\" w:lastRowLastColumn=\"0\"/><w:trHeight w:val=\"599\"/><w:jc w:val=\"center\"/></w:trPr><w:tc><w:tcPr><w:cnfStyle w:val=\"001000000000\" w:firstRow=\"0\" w:lastRow=\"0\" w:firstColumn=\"1\" w:lastColumn=\"0\" w:oddVBand=\"0\" w:evenVBand=\"0\" w:oddHBand=\"0\" w:evenHBand=\"0\" w:firstRowFirstColumn=\"0\" w:firstRowLastColumn=\"0\" w:lastRowFirstColumn=\"0\" w:lastRowLastColumn=\"0\"/><w:tcW w:w=\"8544\" w:type=\"dxa\"/><w:gridSpan w:val=\"2\"/></w:tcPr><w:p w14:paraId=\"42ABBE8F\" w14:textId=\"77777777\" w:rsidR=\"009E391D\" w:rsidRPr=\"000E062F\" w:rsidRDefault=\"009E391D\" w:rsidP=\"00684ACA\"><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:jc w:val=\"center\"/><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:b w:val=\"0\"/><w:bCs w:val=\"0\"/><w:i/><w:iCs/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr></w:pPr><w:proofErr w:type=\"spellStart\"/><w:r w:rsidRPr=\"000E062F\"><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:b w:val=\"0\"/><w:bCs w:val=\"0\"/><w:i/><w:iCs/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr><w:t>Hevelyn</w:t></w:r><w:proofErr w:type=\"spellEnd\"/><w:r w:rsidRPr=\"000E062F\"><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:b w:val=\"0\"/><w:bCs w:val=\"0\"/><w:i/><w:iCs/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr><w:t xml:space=\"preserve\"> Carla Dantas de Lima</w:t></w:r></w:p><w:p w14:paraId=\"51BA4C84\" w14:textId=\"77777777\" w:rsidR=\"009E391D\" w:rsidRPr=\"000E062F\" w:rsidRDefault=\"009E391D\" w:rsidP=\"00684ACA\"><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:jc w:val=\"center\"/><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:i/><w:iCs/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr></w:pPr><w:r w:rsidRPr=\"000E062F\"><w:rPr><w:rFonts w:ascii=\"Segoe UI\" w:hAnsi=\"Segoe UI\" w:cs=\"Segoe UI\"/><w:i/><w:iCs/><w:smallCaps/><w:sz w:val=\"24\"/><w:szCs w:val=\"24\"/></w:rPr><w:t xml:space=\"preserve\">assessora jurídica </w:t></w:r></w:p></w:tc></w:tr></w:tbl>";
  /* ================================================================
     PARTE 1 · WORD (.docx): a mesma montagem do gerar_peticao.py das skills
     ================================================================ */
  var CINZA = 'F2F2F2', LINHA = 'D9D9D9', AZUL = '0A2F41', OURO = 'C9A46B';
  var NOIND = '<w:ind w:left="0" w:firstLine="0"/>';
  var NOME = '<w:b/><w:bCs/><w:i/><w:iCs/><w:smallCaps/>';
  var NEG = '<w:b/><w:bCs/>';

  function construtorDocx(W){
    var LINKS = [];
    function run(t, rpr){
      return '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + escXml(t) + '</w:t></w:r>';
    }
    function hiperlink(url, texto, extra){
      url = String(url).trim();
      if(!/^https?:\/\//.test(url)) throw new Error('Link inválido (precisa começar com http:// ou https://): ' + url);
      var rid = 'rIdVmmLink' + (LINKS.length + 1);
      LINKS.push([rid, url]);
      var rpr = '<w:rStyle w:val="Hyperlink"/><w:color w:val="0563C1"/><w:u w:val="single"/>' + (extra || '');
      return '<w:hyperlink r:id="' + rid + '" w:history="1">' + run(texto, rpr) + '</w:hyperlink>';
    }
    function inline(texto, extra){
      extra = extra || '';
      texto = limpar(texto);
      var out = '';
      texto.split(/(\[\[.+?\]\]|\*\*.+?\*\*|__.+?__)/).forEach(function(parte){
        if(!parte) return;
        if(parte.indexOf('[[') === 0 && /\]\]$/.test(parte)){
          var miolo = parte.slice(2, -2), i = miolo.indexOf('|');
          var rotulo = i >= 0 ? miolo.slice(0, i) : miolo, url = i >= 0 ? miolo.slice(i + 1) : miolo;
          out += hiperlink(url, rotulo, extra);
        } else if(parte.indexOf('**') === 0 && /\*\*$/.test(parte) && parte.length > 4){
          out += run(parte.slice(2, -2), NOME + extra);
        } else if(parte.indexOf('__') === 0 && /__$/.test(parte) && parte.length > 4){
          out += run(parte.slice(2, -2), NEG + extra);
        } else out += run(parte, extra);
      });
      return out;
    }
    function par(style, conteudo, ppr){
      return '<w:p><w:pPr><w:pStyle w:val="' + style + '"/>' + (ppr || '') + '</w:pPr>' + (conteudo || '') + '</w:p>';
    }
    function branco(n){ var s = ''; for(var i = 0; i < (n || 1); i++) s += par('corpopetio', '', NOIND); return s; }
    function bordas(cor){
      return ['top','left','bottom','right','insideH','insideV'].map(function(s){
        return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="' + cor + '"/>';
      }).join('');
    }
    var B = {
      enderecamento: function(b){ return par('endereamento', inline(b.texto)); },
      distribuicao: function(b){
        var rpr = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:i/><w:iCs/><w:smallCaps/>';
        return '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:rPr>' + rpr + '</w:rPr></w:pPr>' +
               run(limpar(b.texto || 'Distribuição Por Sorteio'), rpr) + '</w:p>';
      },
      quadro_resumo: function(b){
        var ppr = '<w:pBdr><w:right w:val="single" w:sz="4" w:space="4" w:color="' + LINHA + '"/></w:pBdr>' +
                  '<w:shd w:val="clear" w:color="auto" w:fill="' + CINZA + '"/><w:ind w:left="1276" w:right="1183"/>';
        var ita = '<w:i/><w:iCs/>';
        var out = par('corpopetio', run(limpar(b.titulo || 'Quadro de resumo:'), '<w:b/><w:bCs/>' + ita), ppr + '<w:jc w:val="center"/>');
        (b.itens || []).forEach(function(item, i){ out += par('corpopetio', inline((i + 1) + 'º - ' + item, ita), ppr); });
        return out;
      },
      valor_causa: function(b){
        return par('corpopetio', run('Dá-se à causa o valor de ') + run(limpar(b.valor), NEG) + run(' (' + limpar(b.extenso) + ').'));
      },
      autos: function(b){ return par('corpopetio', run(limpar(b.texto), NEG), NOIND); },
      linha_negrito: function(b){ return par('corpopetio', run(limpar(b.texto), NEG), NOIND); },
      paragrafo: function(b){ return par('corpopetio', inline(b.texto), NOIND + '<w:jc w:val="both"/>'); },
      titulo_peca: function(b){
        var ppr = '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr>' +
                  '<w:shd w:val="clear" w:color="auto" w:fill="' + CINZA + '"/>' +
                  '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>';
        var rpr = '<w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:b/><w:bCs/><w:i/><w:iCs/>' +
                  '<w:smallCaps/><w:sz w:val="28"/><w:szCs w:val="28"/>';
        return par('Cabealho', run(limpar(b.texto), rpr), ppr);
      },
      topico: function(b){ return par('Ttulo2', run(limpar(b.texto))); },
      destaque: function(b){
        var ppr = '<w:pBdr><w:right w:val="single" w:sz="4" w:space="4" w:color="' + LINHA + '"/></w:pBdr>' +
                  '<w:shd w:val="clear" w:color="auto" w:fill="' + CINZA + '"/>' + NOIND + '<w:jc w:val="both"/>';
        return par('corpopetio', inline(b.texto, '<w:i/><w:iCs/>'), ppr);
      },
      pedidos: function(b){
        var cn = 900, ct = W - 900, sz = '<w:sz w:val="22"/><w:szCs w:val="22"/>', linhas = '';
        (b.itens || []).forEach(function(item, i){
          var shd = i % 2 === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="' + CINZA + '"/>' : '';
          var num = par('corpopetio', run(ROMANOS[i] || String(i + 1), NEG + '<w:color w:val="' + AZUL + '"/>' + sz), NOIND + '<w:jc w:val="right"/>');
          var txt = par('corpopetio', inline(item, sz), NOIND + '<w:jc w:val="both"/>');
          var tc = function(w, c){ return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + shd + '<w:vAlign w:val="center"/></w:tcPr>' + c + '</w:tc>'; };
          linhas += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + tc(cn, num) + tc(ct, txt) + '</w:tr>';
        });
        return '<w:tbl><w:tblPr><w:tblW w:w="' + W + '" w:type="dxa"/><w:tblBorders>' + bordas(LINHA) + '</w:tblBorders>' +
               '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>' +
               '<w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
               '<w:tblGrid><w:gridCol w:w="' + cn + '"/><w:gridCol w:w="' + ct + '"/></w:tblGrid>' + linhas + '</w:tbl>';
      },
      tabela: function(b){
        var cab = b.cabecalho || [], linhas = b.linhas || [];
        var ncol = cab.length || (linhas[0] || []).length || 1;
        var larg = b.larguras || (ncol > 1 ? [W - 2 * 1900].concat(Array(ncol - 1).fill(1900)) : [W]);
        var alin = b.alinhamento || ['left'].concat(Array(ncol - 1).fill('right'));
        var sz = '<w:sz w:val="22"/><w:szCs w:val="22"/>';
        function cel(txt, w, jc, neg, fundo){
          var shd = fundo ? '<w:shd w:val="clear" w:color="auto" w:fill="' + fundo + '"/>' : '';
          var p = par('corpopetio', inline(String(txt), (neg ? NEG : '') + sz), NOIND + '<w:jc w:val="' + jc + '"/>');
          return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + shd + '<w:vAlign w:val="center"/></w:tcPr>' + p + '</w:tc>';
        }
        var rows = '';
        if(cab.length) rows += '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + cab.map(function(c, i){ return cel(c, larg[i], alin[i], true, CINZA); }).join('') + '</w:tr>';
        linhas.forEach(function(l, k){
          var neg = b.total && k === linhas.length - 1;
          rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + l.map(function(c, i){ return cel(c, larg[i], alin[i], neg, neg ? CINZA : null); }).join('') + '</w:tr>';
        });
        var soma = larg.reduce(function(a, b2){ return a + b2; }, 0);
        return '<w:tbl><w:tblPr><w:tblW w:w="' + soma + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + bordas(LINHA) + '</w:tblBorders>' +
               '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>' +
               '<w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
               '<w:tblGrid>' + larg.map(function(w){ return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' + rows + '</w:tbl>';
      },
      citacao: function(b){
        var ind = 868, ce = 1134, cd = W - ind - ce;
        var sig = '<w:p><w:pPr><w:pStyle w:val="corpopetio"/><w:shd w:val="clear" w:color="auto" w:fill="404040"/>' +
                  '<w:spacing w:before="0" w:after="0" w:line="552" w:lineRule="exact"/>' + NOIND + '<w:jc w:val="center"/></w:pPr>' +
                  run(b.sigla, '<w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:b/><w:bCs/><w:i/><w:iCs/>' +
                      '<w:color w:val="FFFFFF"/><w:sz w:val="36"/><w:szCs w:val="36"/>') + '</w:p>';
        var dir = '';
        if(b.titulo){ dir += par('ementacitao', run(limpar(b.titulo)), NOIND); dir += par('citao-juris-lei', '', NOIND); }
        (Array.isArray(b.texto) ? b.texto : [b.texto]).forEach(function(t){ dir += par('citao-juris-lei', inline(t), NOIND); });
        if(b.fonte) dir += par('citao-juris-lei', run(limpar(b.fonte), NEG), NOIND);
        if(b.link){
          var pq = '<w:sz w:val="20"/><w:szCs w:val="20"/>';
          dir += par('citao-juris-lei', run(b.link_rotulo || 'Disponível em: ', NEG + pq) + hiperlink(b.link, b.link, pq), NOIND);
        }
        var nb = '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>';
        return '<w:tbl><w:tblPr><w:tblW w:w="' + (ce + cd) + '" w:type="dxa"/><w:tblInd w:w="' + ind + '" w:type="dxa"/>' +
               '<w:tblBorders>' + nb + '<w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>' +
               '<w:tblGrid><w:gridCol w:w="' + ce + '"/><w:gridCol w:w="' + cd + '"/></w:tblGrid><w:tr>' +
               '<w:tc><w:tcPr><w:tcW w:w="' + ce + '" w:type="dxa"/></w:tcPr>' + sig + '</w:tc>' +
               '<w:tc><w:tcPr><w:tcW w:w="' + cd + '" w:type="dxa"/></w:tcPr>' + dir + '</w:tc></w:tr></w:tbl>';
      },
      fecho: function(b){
        var cidade = b.cidade || 'Maceió/AL';
        var rpr = '<w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:i/><w:iCs/><w:sz w:val="24"/><w:szCs w:val="24"/>';
        var linhas = b.linhas || ['Nestes Termos,', 'Pede-Se E Espera Deferimento.'];
        var out = linhas.map(function(l){
          return '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:rPr>' + rpr + '</w:rPr></w:pPr>' + run(limpar(l), rpr) + '</w:p>';
        }).join('');
        return out + branco() + par('corpopetio', run(cidade + ', ' + (b.data || dataPorExtenso()) + '.'), NOIND);
      },
      assinatura: function(b){
        var xml = ASSINATURA_XML;
        if(b.camargo === false){
          var tcs = xml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
          var cam = tcs.filter(function(c){ return c.indexOf('Camargo') >= 0; })[0];
          var vic = tcs.filter(function(c){ return c.indexOf('Medeiros Morais') >= 0; })[0];
          if(cam && vic){
            var nova = vic.replace('<w:tcW w:w="4272" w:type="dxa"/>', '<w:tcW w:w="8544" w:type="dxa"/><w:gridSpan w:val="2"/>');
            xml = xml.replace(cam, '').replace(vic, nova);
          }
        }
        return xml;
      },
      quebra_pagina: function(){ return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; },
      branco: function(b){ return branco(b.n || 1); }
    };
    return {
      corpo: function(blocos){
        var s = '';
        blocos.forEach(function(b){
          var f = B[b.tipo];
          if(!f) throw new Error('Tipo de bloco desconhecido no modelo: ' + b.tipo + '. Válidos: ' + Object.keys(B).join(', '));
          s += f(b);
        });
        return s + branco();
      },
      links: LINKS
    };
  }

  /* ajustes do Padrão VMM (Garamond), como no gerar_peticao.py da peticao-vmm */
  var DISP = /(<w:pStyle w:val="citao-juris-lei"\/>(?:(?!<\/w:pPr>)[\s\S])*)(<\/w:pPr>(?:(?!<\/w:p>)[\s\S])*?Disponível em:)/g;
  function ajustarTabelas(x){
    x = x.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, function(t){
      if(t.indexOf('citao-juris-lei') >= 0){
        if(t.indexOf('<w:cantSplit/>') < 0) t = t.replace('<w:tr>', '<w:tr><w:trPr><w:cantSplit/></w:trPr>');
        return t;
      }
      return t.split('<w:trPr><w:cantSplit/></w:trPr>').join('').split('<w:cantSplit/>').join('');
    });
    return x.replace(DISP, '$1<w:jc w:val="left"/>$2');
  }
  function tipografia(x){
    var F = 'Garamond', RF = '<w:rFonts w:ascii="' + F + '" w:hAnsi="' + F + '" w:cs="' + F + '"/>';
    x = x.split('w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"').join('w:ascii="' + F + '" w:hAnsi="' + F + '" w:cs="' + F + '"');
    x = x.replace(/<w:rFonts w:ascii="Segoe UI"[^>]*\/>/g, RF);
    x = x.split('w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"').join('w:ascii="' + F + '" w:hAnsi="' + F + '" w:cs="' + F + '"');
    x = x.split('<w:smallCaps/><w:sz w:val="28"/><w:szCs w:val="28"/>').join('<w:smallCaps/><w:spacing w:val="20"/><w:sz w:val="31"/><w:szCs w:val="31"/>');
    x = x.split('<w:i/><w:iCs/><w:sz w:val="24"/><w:szCs w:val="24"/>').join('<w:i/><w:iCs/><w:sz w:val="26"/><w:szCs w:val="26"/>');
    x = x.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, function(t){
      if(t.indexOf('citao-juris-lei') >= 0) return t;
      t = t.split('<w:sz w:val="22"/><w:szCs w:val="22"/>').join('<w:sz w:val="24"/><w:szCs w:val="24"/>');
      return t.replace(/(<w:pStyle w:val="corpopetio"\/>)(?!(?:(?!<\/w:pPr>)[\s\S])*<w:spacing)/g, '$1<w:spacing w:after="0" w:line="264" w:lineRule="auto"/>');
    });
    var vazio = '<w:p><w:pPr><w:pStyle w:val="corpopetio"/><w:ind w:left="0" w:firstLine="0"/></w:pPr></w:p>';
    return x.split(vazio).join(vazio.replace('<w:ind', '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind'));
  }
  function assinaturaLeve(x){
    return x.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, function(t){
      if(t.indexOf('Hevelyn') < 0) return t;
      t = t.split('w:noHBand="0"').join('w:noHBand="1"').replace('w:firstRow="1" w:lastRow="0" w:firstColumn="1"', 'w:firstRow="0" w:lastRow="0" w:firstColumn="0"');
      t = t.replace(/<w:tblStyle w:val="[^"]*"\/>/, '');
      t = t.replace(/<w:top w:val="none"[^/]*\/>/, '<w:top w:val="single" w:sz="4" w:space="0" w:color="' + OURO + '"/>');
      t = t.replace(/<w:shd [^>]*\/>/g, '').replace(/<w:cnfStyle [^>]*\/>/g, '').split('<w:highlight w:val="yellow"/>').join('');
      return t.split('<w:trHeight w:val="599"/>').join('<w:trHeight w:val="520"/>');
    });
  }

  /* Monta o .docx: zip do timbrado + corpo novo. Devolve Uint8Array. */
  function montarDocx(PizZip, bytesTimbrado, blocos, perfil){
    avisos = [];
    var zip = new PizZip(bytesTimbrado);
    var doc = zip.file('word/document.xml').asText();
    var sect = (doc.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g) || []).pop() || '';
    var pg = sect.match(/<w:pgSz[^>]*w:w="(\d+)"/), mg = sect.match(/<w:pgMar[^>]*>/);
    var esq = mg && mg[0].match(/w:left="(\d+)"/), dir = mg && mg[0].match(/w:right="(\d+)"/);
    var W = (pg ? +pg[1] : 12240) - (esq ? +esq[1] : 1843) - (dir ? +dir[1] : 1843);
    var c = construtorDocx(W);
    var corpo = c.corpo(blocos);
    var i0 = doc.indexOf('<w:body>'), i1 = doc.lastIndexOf('<w:sectPr');
    if(i0 < 0 || i1 < 0) throw new Error('O Word do timbrado não tem o corpo esperado (falta <w:body> ou <w:sectPr>).');
    doc = doc.slice(0, i0) + '<w:body>' + corpo + doc.slice(i1);
    if(perfil === 'garamond') doc = assinaturaLeve(tipografia(ajustarTabelas(doc)));
    zip.file('word/document.xml', doc);
    if(c.links.length){
      var rp = 'word/_rels/document.xml.rels', rels = zip.file(rp).asText();
      var novos = c.links.map(function(l){
        return '<Relationship Id="' + l[0] + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + escAttr(l[1]) + '" TargetMode="External"/>';
      }).join('');
      zip.file(rp, rels.replace('</Relationships>', novos + '</Relationships>'));
    }
    return { bytes: zip.generate({ type: 'uint8array', compression: 'DEFLATE' }), avisos: avisos.slice(), links: c.links.map(function(l){ return l[1]; }) };
  }

  /* ================================================================
     PARTE 2 · PDF: o texto desenhado por cima do fundo do timbrado
     ================================================================ */
  var ARQ_FONTES = {
    garamond: { r:'EBGaramond-Regular.ttf', i:'EBGaramond-Italic.ttf', b:'EBGaramond-Bold.ttf', bi:'EBGaramond-BoldItalic.ttf' },
    sans:     { r:'OpenSans-Regular.ttf', i:'OpenSans-Italic.ttf', b:'OpenSans-Bold.ttf', bi:'OpenSans-BoldItalic.ttf' },
    serif:    { r:'LiberationSerif-Regular.ttf', i:'LiberationSerif-Italic.ttf', b:'LiberationSerif-Bold.ttf', bi:'LiberationSerif-BoldItalic.ttf' }
  };
  var cacheFontes = {};
  function bytesFonte(nome){
    if(!cacheFontes[nome]){
      cacheFontes[nome] = fetch(BASE + 'vendor/fontes/' + nome + (VERSAO ? '?v=' + VERSAO : '')).then(function(r){
        if(!r.ok) throw new Error('A fonte ' + nome + ' não carregou (erro ' + r.status + ').');
        return r.arrayBuffer();
      }).catch(function(e){ delete cacheFontes[nome]; throw e; });
    }
    return cacheFontes[nome];
  }

  /* Estilos do texto em pontos. 'garamond' = Padrão VMM (com os ajustes de tipografia);
     'classica' = ANCREF e Sarmento (Segoe UI no Word; Open Sans no PDF). */
  function estilos(perfil){
    var g = perfil === 'garamond';
    var T = g ? 'garamond' : 'sans', C = g ? 'garamond' : 'serif';
    return {
      g: g,
      corpo:   { fam:T, size:g ? 12.5 : 12, color:g ? '1F1F1F' : '202124', mult:g ? 1.35 : 1 },
      branco:  { fam:T, size:g ? 12.5 : 12, mult:1 },
      ender:   { fam:T, size:14, b:1, i:1, sc:1, sp:g ? 0.6 : 0.1, color:'202124', mult:g ? 1.25 : 1 },
      distrib: { fam:C, size:11, b:1, i:1, sc:1, color:'000000', mult:1 },
      titulo:  { fam:T, size:g ? 15.5 : 14, b:1, i:1, sc:1, sp:g ? 1 : 0, color:'000000', mult:1 },
      topico:  { fam:T, size:g ? 14.5 : 14, b:1, i:g ? 0 : 1, sc:1, sp:g ? 0.8 : 0, color:AZUL, mult:1 },
      fecho:   { fam:T, size:g ? 13 : 12, i:1, color:'000000', mult:1 },
      tab:     { fam:T, size:g ? 12 : 11, color:g ? '1F1F1F' : '202124', mult:g ? 1.1 : 1 },
      citTit:  { fam:C, size:12, b:1, i:1, sc:1, color:'000000', mult:1 },
      cit:     { fam:C, size:g ? 11.5 : 10, i:g ? 1 : 0, color:'000000', mult:g ? 1.15 : 1 },
      sigla:   { fam:T, size:18, b:1, i:1, color:'FFFFFF' },
      assin:   { fam:T, size:12, color:'000000', mult:1 }
    };
  }

  /* texto com **nome**, __negrito__ e [[rótulo|link]] -> pedaços com estilo */
  function pedacos(texto, base){
    texto = limpar(texto);
    var out = [];
    texto.split(/(\[\[.+?\]\]|\*\*.+?\*\*|__.+?__)/).forEach(function(parte){
      if(!parte) return;
      if(parte.indexOf('[[') === 0 && /\]\]$/.test(parte)){
        var m = parte.slice(2, -2), i = m.indexOf('|');
        out.push(Object.assign({}, base, { t: i >= 0 ? m.slice(0, i) : m, link: (i >= 0 ? m.slice(i + 1) : m).trim(), color:'0563C1', sub:1 }));
      } else if(parte.indexOf('**') === 0 && /\*\*$/.test(parte) && parte.length > 4){
        out.push(Object.assign({}, base, { t: parte.slice(2, -2), b:1, i:1, sc:1 }));
      } else if(parte.indexOf('__') === 0 && /__$/.test(parte) && parte.length > 4){
        out.push(Object.assign({}, base, { t: parte.slice(2, -2), b:1 }));
      } else out.push(Object.assign({}, base, { t: parte }));
    });
    return out;
  }

  function hexCor(PDFLib, h){
    h = String(h || '000000').replace('#', '');
    return PDFLib.rgb(parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255);
  }

  function motor(PDFLib, F){
    function fonte(r){ var v = (r.b ? 'b' : '') + (r.i ? 'i' : ''); return F[r.fam || 'garamond'][v || 'r']; }
    function asc(f, s){ return f.heightAtSize(s, { descender:false }); }
    function alt(f, s){ return f.heightAtSize(s); }
    /* versalete: minúsculas viram maiúsculas menores (0,8) */
    function partes(r){
      var f = fonte(r), s = r.size, sp = r.sp || 0;
      if(!r.sc) return [{ t:r.t, f:f, s:s, sp:sp, r:r }];
      var out = [], cur = null;
      for(var k = 0; k < r.t.length; k++){
        var ch = r.t[k], up = ch.toUpperCase(), min = ch !== up && ch.toLowerCase() === ch;
        var sz = min ? s * 0.8 : s, t = min ? up : ch;
        if(cur && cur.s === sz) cur.t += t; else { cur = { t:t, f:f, s:sz, sp:sp, r:r }; out.push(cur); }
      }
      return out;
    }
    function largura(p){ return p.f.widthOfTextAtSize(p.t, p.s) + p.sp * p.t.length; }

    /* quebra um parágrafo em linhas, na largura dada */
    function linhas(par, larg){
      var palavras = [], atual = null, espacoDepois = null;
      function nova(){ atual = { ps:[], w:0, esp:0 }; palavras.push(atual); }
      par.runs.forEach(function(r){
        String(r.t).split(/(\n| +)/).forEach(function(tok){
          if(tok === '') return;
          if(tok === '\n'){ palavras.push({ quebra:true }); atual = null; return; }
          if(/^ +$/.test(tok)){
            if(atual){ var f = fonte(r); atual.esp = f.widthOfTextAtSize(tok, r.size) + (r.sp || 0) * tok.length; atual.espR = r; atual = null; }
            return;
          }
          if(!atual) nova();
          partes(Object.assign({}, r, { t:tok })).forEach(function(p){ p.w = largura(p); atual.ps.push(p); atual.w += p.w; });
        });
      });
      var ls = [], L = null;
      function abre(prim){ L = { ws:[], w:0, prim:prim }; ls.push(L); }
      abre(true);
      palavras.forEach(function(w){
        if(w.quebra){ L.forcada = true; abre(false); return; }
        var lim = larg - (L.prim ? (par.first || 0) : 0) - (L.prim && par.prefixo ? par.prefixo.w : 0);
        var antes = L.ws.length ? L.ws[L.ws.length - 1].esp : 0;
        if(L.ws.length && L.w + antes + w.w > lim + 0.01){ abre(false); antes = 0; lim = larg; }
        if(!L.ws.length && w.w > lim){
          /* palavra maior que a linha (link longo): quebra por letra */
          var resto = w.ps.slice(), cab = { ps:[], w:0, esp:0 };
          resto.forEach(function(p){
            for(var k = 0; k < p.t.length; k++){
              var q = Object.assign({}, p, { t:p.t[k] }); q.w = largura(q);
              if(cab.w + q.w > lim && cab.ps.length){ L.ws.push(cab); L.w = cab.w; abre(false); lim = larg; cab = { ps:[], w:0, esp:0 }; }
              cab.ps.push(q); cab.w += q.w;
            }
          });
          cab.esp = w.esp; L.ws.push(cab); L.w = cab.w; return;
        }
        L.w += antes + w.w; L.ws.push(w);
      });
      /* altura de cada linha */
      ls.forEach(function(l){
        var a = 0, h = 0, d = 0;
        var todas = [];
        l.ws.forEach(function(w){ w.ps.forEach(function(p){ todas.push(p); }); });
        if(!todas.length){ var f0 = fonte(par.base), s0 = par.base.size; todas = [{ f:f0, s:s0 }]; }
        todas.forEach(function(p){ a = Math.max(a, asc(p.f, p.s)); d = Math.max(d, alt(p.f, p.s) - asc(p.f, p.s)); });
        h = a + d;
        if(par.exato){ l.h = par.exato; l.base = (par.exato - h) / 2 + a; }
        else { l.h = h * (par.mult || 1); l.base = l.h - d; }
      });
      return ls;
    }

    function desenharLinha(ctx, page, l, par, x0, larg, yTopo, ultima){
      var H = page.getHeight();
      var lim = larg - (l.prim ? (par.first || 0) : 0) - (l.prim && par.prefixo ? par.prefixo.w : 0);
      var x = x0 + (l.prim ? (par.first || 0) : 0);
      var yb = H - (yTopo + l.base);
      if(l.prim && par.prefixo){
        var pf = par.prefixo;
        pf.ps.forEach(function(p){ escrever(page, p, x, yb); x += p.w; });
        x = x0 + (l.prim ? (par.first || 0) : 0) + pf.w;
      }
      var gaps = Math.max(0, l.ws.length - 1), extra = 0;
      if(par.align === 'center') x += (lim - l.w) / 2;
      else if(par.align === 'right') x += (lim - l.w);
      else if(par.align === 'both' && !ultima && !l.forcada && gaps) extra = (lim - l.w) / gaps;
      l.ws.forEach(function(w, k){
        w.ps.forEach(function(p){
          escrever(page, p, x, yb);
          if(p.r.sub){ page.drawLine({ start:{ x:x, y:yb - 1.4 }, end:{ x:x + p.w, y:yb - 1.4 }, thickness:0.5, color:hexCor(PDFLib, p.r.color) }); }
          if(p.r.link) ctx.links.push({ page:page, url:p.r.link, rect:[x, yb - 2, x + p.w, yb + asc(p.f, p.s)] });
          x += p.w;
        });
        if(k < l.ws.length - 1) x += w.esp + extra;
      });
    }
    function escrever(page, p, x, y){
      if(!p.t) return;
      if(p.sp) page.pushOperators(PDFLib.setCharacterSpacing(p.sp));
      page.drawText(p.t, { x:x, y:y, size:p.s, font:p.f, color:hexCor(PDFLib, p.r.color) });
      if(p.sp) page.pushOperators(PDFLib.setCharacterSpacing(0));
    }

    /* parágrafo -> caixas (uma por linha) para paginar */
    function caixasPar(par, x0, larg){
      var area = larg - (par.indL || 0) - (par.indR || 0);
      var ls = linhas(par, area), n = ls.length;
      return ls.map(function(l, k){
        var extraFim = (k === n - 1 && par.bBottom) ? (par.bBottom.space + par.bBottom.w) : 0;
        return {
          h: l.h + extraFim,
          kwn: !!par.keepNext || (n >= 2 && (k === 0 || k === n - 2)) || (par.inteiro && k < n - 1),
          vazio: !l.ws.length && !par.fill,
          desenhar: function(ctx, page, y){
            var H = page.getHeight(), xa = x0 + (par.indL || 0);
            if(par.fill) page.drawRectangle({ x:xa, y:H - y - l.h - extraFim, width:area, height:l.h + extraFim, color:hexCor(PDFLib, par.fill) });
            if(par.bRight){
              var xr = xa + area + par.bRight.space;
              page.drawLine({ start:{ x:xr, y:H - y }, end:{ x:xr, y:H - y - l.h - extraFim }, thickness:par.bRight.w, color:hexCor(PDFLib, par.bRight.color) });
            }
            desenharLinha(ctx, page, l, par, xa, area, y, k === n - 1);
            if(extraFim){
              var yl = H - y - l.h - par.bBottom.space;
              page.drawLine({ start:{ x:xa, y:yl }, end:{ x:xa + area, y:yl }, thickness:par.bBottom.w, color:hexCor(PDFLib, par.bBottom.color) });
            }
          }
        };
      });
    }
    function alturaItens(itens, larg){
      return itens.reduce(function(a, par){ return a + caixasPar(par, 0, larg).reduce(function(s, c){ return s + c.h; }, 0); }, 0);
    }

    /* tabela -> uma caixa por linha (a linha da tabela não se divide) */
    function caixasTab(tab, x0){
      var m = tab.mar || { t:0, b:0, l:5.4, r:5.4 };
      var xs = [x0 + (tab.ind || 0)];
      tab.cols.forEach(function(w){ xs.push(xs[xs.length - 1] + w); });
      var nRows = tab.rows.length;
      return tab.rows.map(function(row, ri){
        var col = 0;
        var cels = row.cells.map(function(c){
          var span = c.span || 1, xa = xs[col], xb = xs[col + span]; col += span;
          var larg = xb - xa - m.l - m.r;
          var h = alturaItens(c.itens, larg);
          return { c:c, xa:xa, xb:xb, larg:larg, h:h };
        });
        var rh = Math.max(row.minH || 0, Math.max.apply(null, cels.map(function(e){ return e.h + m.t + m.b; })));
        return {
          h: rh,
          kwn: !!tab.inteira && ri < nRows - 1,
          desenhar: function(ctx, page, y){
            var H = page.getHeight();
            cels.forEach(function(e){
              if(e.c.fill) page.drawRectangle({ x:e.xa, y:H - y - rh, width:e.xb - e.xa, height:rh, color:hexCor(PDFLib, e.c.fill) });
              var yy = y + m.t + (e.c.valign === 'center' ? (rh - m.t - m.b - e.h) / 2 : 0);
              e.c.itens.forEach(function(par){
                caixasPar(par, e.xa + m.l, e.larg).forEach(function(cx){ cx.desenhar(ctx, page, yy); yy += cx.h; });
              });
            });
            var b = tab.borda;
            if(b){
              var cor = hexCor(PDFLib, b.cor), xa = xs[0], xb = xs[xs.length - 1];
              page.drawLine({ start:{ x:xa, y:H - y }, end:{ x:xb, y:H - y }, thickness:0.5, color:cor });
              page.drawLine({ start:{ x:xa, y:H - y - rh }, end:{ x:xb, y:H - y - rh }, thickness:0.5, color:cor });
              var c2 = 0;
              page.drawLine({ start:{ x:xa, y:H - y }, end:{ x:xa, y:H - y - rh }, thickness:0.5, color:cor });
              row.cells.forEach(function(c){ c2 += c.span || 1; var xx = xs[c2]; page.drawLine({ start:{ x:xx, y:H - y }, end:{ x:xx, y:H - y - rh }, thickness:0.5, color:cor }); });
            }
            if(tab.topo && ri === 0){
              page.drawLine({ start:{ x:xs[0], y:H - y }, end:{ x:xs[xs.length - 1], y:H - y }, thickness:0.5, color:hexCor(PDFLib, tab.topo) });
            }
          }
        };
      });
    }
    return { caixasPar:caixasPar, caixasTab:caixasTab, partes:partes, largura:largura, fonte:fonte, asc:asc, alt:alt };
  }

  /* blocos do modelo -> parágrafos e tabelas (as mesmas medidas do Word) */
  function itensPdf(blocos, E, W, mt){
    var tw = function(v){ return v / 20; };
    var itens = [], ntop = 0;
    function P(base, runs, extra){ return Object.assign({ base:base, runs:runs, align:'both', mult:base.mult || 1 }, extra || {}); }
    function txt(base, t, extra){ return P(base, pedacos(t, base), extra); }
    function branco(n){ for(var i = 0; i < (n || 1); i++) itens.push(P(E.branco, [], { mult:1 })); }
    var bordaFina = function(cor, space){ return { color:cor, w:0.5, space:space }; };
    blocos.forEach(function(b){
      switch(b.tipo){
        case 'enderecamento': itens.push(txt(E.ender, b.texto, { mult:E.ender.mult })); break;
        case 'distribuicao': itens.push(P(E.distrib, [Object.assign({}, E.distrib, { t:limpar(b.texto || 'Distribuição Por Sorteio') })], { align:'left' })); break;
        case 'autos': case 'linha_negrito':
          itens.push(P(E.corpo, [Object.assign({}, E.corpo, { t:limpar(b.texto), b:1 })], { align:'left' })); break;
        case 'paragrafo': itens.push(txt(E.corpo, b.texto)); break;
        case 'valor_causa':
          itens.push(P(E.corpo, [Object.assign({}, E.corpo, { t:'Dá-se à causa o valor de ' }), Object.assign({}, E.corpo, { t:limpar(b.valor), b:1 }),
                                 Object.assign({}, E.corpo, { t:' (' + limpar(b.extenso) + ').' })])); break;
        case 'titulo_peca':
          itens.push(P(E.titulo, [Object.assign({}, E.titulo, { t:limpar(b.texto) })], { align:'center', fill:CINZA, bBottom:bordaFina('000000', 1), mult:1, inteiro:true })); break;
        case 'topico':
          ntop++;
          var tp = Object.assign({}, E.topico, { sc:0 });
          var pref = mt.partes(Object.assign({}, tp, { t:ntop + '.' }));
          var pw = pref.reduce(function(a, p){ return a + mt.largura(p); }, 0);
          pref.forEach(function(p){ p.w = mt.largura(p); });
          itens.push(P(E.topico, [Object.assign({}, E.topico, { t:limpar(b.texto) })], { align:'both', bBottom:bordaFina('000000', 1), keepNext:true, mult:1,
            prefixo:{ ps:pref, w:Math.max(tw(426), pw + 4) } }));
          break;
        case 'destaque':
          itens.push(P(E.corpo, pedacos(b.texto, Object.assign({}, E.corpo, { i:1 })), { fill:CINZA, bRight:bordaFina(LINHA, 4) })); break;
        case 'quadro_resumo':
          var q = { fill:CINZA, bRight:bordaFina(LINHA, 4), indL:tw(1276), indR:tw(1183) };
          itens.push(P(E.corpo, [Object.assign({}, E.corpo, { t:limpar(b.titulo || 'Quadro de resumo:'), b:1, i:1 })], Object.assign({ align:'center' }, q)));
          (b.itens || []).forEach(function(it, i){ itens.push(P(E.corpo, pedacos((i + 1) + 'º - ' + it, Object.assign({}, E.corpo, { i:1 })), q)); });
          break;
        case 'pedidos':
          var cn = tw(900), ct = tw(W - 900);
          itens.push({ tab:true, cols:[cn, ct], borda:{ cor:LINHA }, mar:{ t:tw(100), b:tw(100), l:tw(120), r:tw(120) },
            rows:(b.itens || []).map(function(it, i){
              var fill = i % 2 === 0 ? CINZA : null;
              return { cells:[
                { fill:fill, valign:'center', itens:[P(E.tab, [Object.assign({}, E.tab, { t:ROMANOS[i] || String(i + 1), b:1, color:AZUL })], { align:'right' })] },
                { fill:fill, valign:'center', itens:[P(E.tab, pedacos(it, E.tab))] }
              ] };
            }) });
          break;
        case 'tabela':
          var cab = b.cabecalho || [], lin = b.linhas || [], nc = cab.length || (lin[0] || []).length || 1;
          var larg = (b.larguras || (nc > 1 ? [W - 2 * 1900].concat(Array(nc - 1).fill(1900)) : [W])).map(tw);
          var al = b.alinhamento || ['left'].concat(Array(nc - 1).fill('right'));
          var soma = larg.reduce(function(a, x){ return a + x; }, 0);
          var linhaT = function(l, neg, fill){ return { cells:l.map(function(c, i){
            return { fill:fill, valign:'center', itens:[P(E.tab, pedacos(String(c), Object.assign({}, E.tab, neg ? { b:1 } : {})), { align:al[i] === 'right' ? 'right' : (al[i] === 'center' ? 'center' : 'left') })] };
          }) }; };
          var rows = [];
          if(cab.length) rows.push(linhaT(cab, true, CINZA));
          lin.forEach(function(l, k){ var t = b.total && k === lin.length - 1; rows.push(linhaT(l, t, t ? CINZA : null)); });
          itens.push({ tab:true, cols:larg, ind:(tw(W) - soma) / 2, borda:{ cor:LINHA }, mar:{ t:tw(80), b:tw(80), l:tw(120), r:tw(120) }, rows:rows });
          break;
        case 'citacao':
          var ind = tw(868), ce = tw(1134), cd = tw(W - 868 - 1134);
          var dir = [], bR = null; /* o filete da direita do estilo não aparece no PDF aprovado (LibreOffice) */
          if(b.titulo){ dir.push(P(E.citTit, [Object.assign({}, E.citTit, { t:limpar(b.titulo) })], { bRight:null })); dir.push(P(E.cit, [], { bRight:bR })); }
          (Array.isArray(b.texto) ? b.texto : [b.texto]).forEach(function(t){ dir.push(P(E.cit, pedacos(t, E.cit), { bRight:bR })); });
          if(b.fonte) dir.push(P(E.cit, [Object.assign({}, E.cit, { t:limpar(b.fonte), b:1 })], { bRight:bR }));
          if(b.link){
            var pq = Object.assign({}, E.cit, { size:10 });
            dir.push(P(E.cit, [Object.assign({}, pq, { t:b.link_rotulo || 'Disponível em: ', b:1 }), Object.assign({}, pq, { t:b.link, link:b.link, color:'0563C1', sub:1 })], { align:'left', bRight:bR }));
          }
          itens.push({ tab:true, cols:[ce, cd], ind:ind, inteira:true, mar:{ t:0, b:0, l:5.4, r:5.4 }, rows:[{ cells:[
            { itens:[P(E.sigla, [Object.assign({}, E.sigla, { t:b.sigla })], { align:'center', fill:'404040', exato:tw(552) })] },
            { itens:dir }
          ] }] });
          break;
        case 'fecho':
          (b.linhas || ['Nestes Termos,', 'Pede-Se E Espera Deferimento.']).forEach(function(l){
            itens.push(P(E.fecho, [Object.assign({}, E.fecho, { t:limpar(l) })], { align:'left', keepNext:true }));
          });
          branco(1);
          itens.push(P(E.corpo, [Object.assign({}, E.corpo, { t:(b.cidade || 'Maceió/AL') + ', ' + (b.data || dataPorExtenso()) + '.' })]));
          break;
        case 'assinatura':
          var A = E.assin, cls = !E.g;
          var nome = function(t, it){ return P(A, [Object.assign({}, A, { t:t, sc:1, i:it ? 1 : 0 })], { align:'center' }); };
          var oab = function(t){ return P(A, [Object.assign({}, A, { t:t, sc:1, i:1, b:cls ? 1 : 0 })], { align:'center' }); };
          var r1 = b.camargo === false
            ? [{ span:2, valign:'center', itens:[nome('Victor de Medeiros Morais'), oab('OAB 15.318-AL')] }]
            : [{ valign:'center', itens:[nome('João Francisco de Camargo'), oab('OAB 6.805-AL')] },
               { valign:'center', itens:[nome('Victor de Medeiros Morais'), oab('OAB 15.318-AL')] }];
          var cw = tw(4272), minH = tw(E.g ? 520 : 599);
          itens.push({ tab:true, cols:[cw, cw], ind:(tw(W) - 2 * cw) / 2, inteira:true, topo:E.g ? OURO : null, mar:{ t:0, b:0, l:5.4, r:5.4 }, rows:[
            { minH:minH, cells:r1 },
            { minH:minH, cells:[{ span:2, valign:'center', fill:cls ? CINZA : null, itens:[nome('Hevelyn Carla Dantas de Lima', true), oab('Assessora Jurídica')] }] }
          ] });
          break;
        case 'quebra_pagina': itens.push({ quebra:true }); break;
        case 'branco': branco(b.n || 1); break;
        default: throw new Error('Tipo de bloco desconhecido no modelo: ' + b.tipo);
      }
    });
    branco(1);
    return itens;
  }

  async function montarPdf(PDFLib, fontkit, bytesFundo, blocos, timbrado){
    avisos = [];
    var cfg = timbrado.config || {}, fundo = cfg.fundo || {};
    var perfil = cfg.tipografia === 'garamond' ? 'garamond' : 'classica';
    var pgSz = fundo.pgSz || { w:12240, h:15840 }, pgMar = fundo.pgMar || { top:1701, right:1843, bottom:2268, left:1843 };
    var W = (+pgSz.w) - (+pgMar.left) - (+pgMar.right);
    var doc = await PDFLib.PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(timbrado._titulo || 'Petição');
    doc.setCreator('SAGA ADV');
    doc.setProducer('SAGA ADV (pdf-lib)');
    var fams = perfil === 'garamond' ? ['garamond'] : ['sans', 'serif'];
    var F = {};
    for(var i = 0; i < fams.length; i++){
      var fam = fams[i]; F[fam] = {};
      for(var v in ARQ_FONTES[fam]){
        F[fam][v] = await doc.embedFont(await bytesFonte(ARQ_FONTES[fam][v]), { subset:true });
      }
    }
    if(!F.garamond) F.garamond = F.sans;
    var E = estilos(perfil), mt = motor(PDFLib, F);
    var itens = itensPdf(blocos, E, W, mt);
    var x0 = (+pgMar.left) / 20, topo = (+pgMar.top) / 20 + (cfg.ajuste_topo || 0);
    var fundoDoc = await PDFLib.PDFDocument.load(bytesFundo);
    var nFundo = fundoDoc.getPageCount();
    var Hpag = (+pgSz.h) / 20, limite = Hpag - (+pgMar.bottom) / 20;
    /* caixas em ordem */
    var caixas = [];
    itens.forEach(function(it){
      if(it.quebra){ caixas.push({ quebra:true }); return; }
      var cs = it.tab ? mt.caixasTab(it, x0) : mt.caixasPar(it, x0, W / 20);
      cs.forEach(function(c){ caixas.push(c); });
    });
    /* linhas em branco logo depois de "manter com o próximo" também ficam juntas */
    for(var k = 0; k < caixas.length - 1; k++){ if(caixas[k].kwn && caixas[k + 1].vazio) caixas[k + 1].kwn = true; }
    /* paginação */
    var paginas = [[]], y = topo;
    for(k = 0; k < caixas.length; k++){
      var c = caixas[k];
      if(c.quebra){ paginas.push([]); y = topo; continue; }
      var cadeia = c.h, j = k;
      while(caixas[j] && caixas[j].kwn && caixas[j + 1] && !caixas[j + 1].quebra){ j++; cadeia += caixas[j].h; }
      var pag = paginas[paginas.length - 1];
      if(pag.length && (y + c.h > limite || (cadeia <= limite - topo && y + cadeia > limite))){ paginas.push([]); y = topo; pag = paginas[paginas.length - 1]; }
      pag.push({ c:c, y:y }); y += c.h;
    }
    while(paginas.length > 1 && !paginas[paginas.length - 1].some(function(e){ return !e.c.vazio; })) paginas.pop();
    var ctx = { links:[] }, T = paginas.length;
    var idx = [];
    for(var p = 0; p < T; p++) idx.push(p === 0 ? 0 : Math.min(1, nFundo - 1));
    var copias = await doc.copyPages(fundoDoc, idx);
    var nf = cfg.numero || {}, pn = fundo.pagina_numero;
    var fNum = pn ? (F[nf.fonte === 'garamond' ? 'garamond' : (F.sans ? 'sans' : 'garamond')] || F.garamond).r : null;
    copias.forEach(function(page, n){
      doc.addPage(page);
      paginas[n].forEach(function(e){ e.c.desenhar(ctx, page, e.y); });
      if(pn && fNum){
        var tam = nf.tamanho || 9, txt = pn.formato === 'N' ? String(n + 1) : (n + 1) + ' / ' + T;
        var wn = fNum.widthOfTextAtSize(txt, tam), desc = fNum.heightAtSize(tam) - fNum.heightAtSize(tam, { descender:false });
        page.drawText(txt, { x:pn.x_direita - wn, y:page.getHeight() - pn.base_caixa + desc, size:tam, font:fNum, color:hexCor(PDFLib, nf.cor || '000000') });
      }
    });
    /* links clicáveis do texto */
    ctx.links.forEach(function(l){
      var annot = doc.context.obj({ Type:'Annot', Subtype:'Link', Rect:l.rect, Border:[0, 0, 0],
        A:{ Type:'Action', S:'URI', URI:PDFLib.PDFString.of(l.url) } });
      var ref = doc.context.register(annot);
      var arr = l.page.node.lookup(PDFLib.PDFName.of('Annots'));
      if(arr) arr.push(ref); else l.page.node.set(PDFLib.PDFName.of('Annots'), doc.context.obj([ref]));
    });
    return { bytes: await doc.save(), paginas: T, avisos: avisos.slice() };
  }

  /* ================================================================
     PARTE 3 · bibliotecas, arquivos e a função pública
     ================================================================ */
  var cacheScripts = {};
  function script(src){
    if(!cacheScripts[src]){
      cacheScripts[src] = new Promise(function(ok, falha){
        var s = document.createElement('script');
        s.src = BASE + src + (VERSAO ? '?v=' + VERSAO : '');
        s.onload = function(){ ok(); };
        s.onerror = function(){ delete cacheScripts[src]; falha(new Error('Não carregou ' + src + '. Atualize a página (F5).')); };
        document.head.appendChild(s);
      });
    }
    return cacheScripts[src];
  }
  async function libsDocx(){
    if(!window.PizZip) await script('vendor/pizzip-3.1.6/pizzip.min.js');
    return window.PizZip;
  }
  async function libsPdf(){
    if(!window.PDFLib) await script('vendor/pdf-lib-1.17.1/pdf-lib.min.js');
    if(!window.fontkit) await script('vendor/pdf-lib-fontkit-1.1.1/fontkit.umd.min.js');
    return { PDFLib: window.PDFLib, fontkit: window.fontkit };
  }

  var cacheArquivos = {};
  async function arquivo(sb, caminho){
    if(!caminho) throw new Error('Este timbrado ainda não tem esse arquivo guardado no SAGA.');
    if(cacheArquivos[caminho]) return cacheArquivos[caminho];
    var r = await sb.storage.from(BUCKET).download(caminho);
    if(r.error){
      var msg = r.error.message || String(r.error);
      throw new Error('Não foi possível baixar o arquivo do timbrado (' + caminho + '): ' + msg + '.');
    }
    var buf = new Uint8Array(await r.data.arrayBuffer());
    cacheArquivos[caminho] = buf;
    return buf;
  }
  function esquecer(caminho){ if(caminho) delete cacheArquivos[caminho]; else cacheArquivos = {}; }

  async function listar(sb){
    var r = await sb.from('timbrados').select('*').eq('ativo', true).order('ordem');
    if(r.error) throw new Error('Não foi possível ler os papéis timbrados: ' + r.error.message);
    return r.data || [];
  }
  async function listarModelos(sb){
    var r = await sb.from('modelos_peticao').select('*, teses(nome)').eq('ativo', true).order('ordem').order('titulo');
    if(r.error) throw new Error('Não foi possível ler os modelos de petição: ' + r.error.message);
    return r.data || [];
  }

  function nomeArquivo(t){
    return String(t || 'Peticao').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Peticao';
  }
  function baixar(bytes, nome, tipo){
    var blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: tipo || 'application/octet-stream' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  /* opcoes: { sb, timbrado, modelo | blocos, valores, formato:'docx'|'pdf', impressao } */
  async function gerar(o){
    var t = o.timbrado; if(!t) throw new Error('Escolha o papel timbrado.');
    var blocos = o.blocos || preencher((o.modelo && o.modelo.blocos) || [], (o.modelo && o.modelo.campos) || [], o.valores);
    if(!blocos.length) throw new Error('O modelo está vazio.');
    var imp = !!o.impressao && (o.formato === 'pdf' ? !!t.fundo_pdf_impressao : !!t.arquivo_docx_impressao);
    if(o.formato === 'pdf'){
      var L = await libsPdf();
      var fundo = await arquivo(o.sb, imp ? t.fundo_pdf_impressao : t.fundo_pdf);
      t._titulo = o.titulo || (o.modelo && o.modelo.titulo) || 'Petição';
      var r = await montarPdf(L.PDFLib, L.fontkit, fundo, blocos, t);
      r.tipo = 'application/pdf'; r.ext = 'pdf'; r.impressao = imp;
      return r;
    }
    var Z = await libsDocx();
    var base = await arquivo(o.sb, imp ? t.arquivo_docx_impressao : t.arquivo_docx);
    var perfil = (t.config && t.config.tipografia) === 'garamond' ? 'garamond' : 'classica';
    var d = montarDocx(Z, base, blocos, perfil);
    d.tipo = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; d.ext = 'docx'; d.impressao = imp;
    return d;
  }

  return {
    listar: listar,
    listarModelos: listarModelos,
    arquivo: arquivo,
    esquecer: esquecer,
    gerar: gerar,
    baixar: baixar,
    nomeArquivo: nomeArquivo,
    preencher: preencher,
    dataPorExtenso: dataPorExtenso,
    camposDoModelo: function(m){ return (m && m.campos) || []; },
    BUCKET: BUCKET,
    _interno: { montarDocx: montarDocx, montarPdf: montarPdf, itensPdf: itensPdf, estilos: estilos }
  };
})();
