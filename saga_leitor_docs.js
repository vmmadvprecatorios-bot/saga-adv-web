/* SAGA · Leitor dos documentos do cliente (21/11/2026, Dr. Victor; bloco 322)
   Lê PDF (texto de cada página pelo pdf.js) e, quando a página é escaneada (só imagem) ou o arquivo é foto/print,
   lê a imagem com o Tesseract guardado no site (vendor/tesseract-6.0.1). Tudo NESTE computador (LGPD): o arquivo
   não vai para nenhum site. O texto lido de documento da pasta fica guardado (documentos_leituras) para não ler de
   novo e para a Renata e o conector usarem.
   Uso: SagaLeitorDocs.lerArquivo(file, {progresso}) → {texto, paginas:[{n,texto,imagem}], metodo, paginas_imagem}
        SagaLeitorDocs.lerDocumento(sb, doc, {progresso, forcar}) → idem + {doc, guardada, erroGuardar} (usa a leitura guardada)
        SagaLeitorDocs.acharNasPaginas(paginas, fnLer) → junta o que fnLer(texto) acha em cada página, com a página e o trecho */
(function(){
  'use strict';
  var PDFJS = 'vendor/pdfjs-4.10.38/', OCR = 'vendor/tesseract-6.0.1/', BUCKET = 'documentos-clientes';
  var _pdfjs = null, _ocr = null;
  function pdfjs(){
    if(!_pdfjs) _pdfjs = import(new URL(PDFJS + 'pdf.min.mjs', location.href).href).then(function(m){ m.GlobalWorkerOptions.workerSrc = new URL(PDFJS + 'pdf.worker.min.mjs', location.href).href; return m; })
      .catch(function(e){ _pdfjs = null; throw new Error('o leitor de PDF não carregou (' + (e.message || e) + ')'); });
    return _pdfjs;
  }
  function tesseract(){
    if(window.Tesseract && window.Tesseract.createWorker) return Promise.resolve(window.Tesseract);
    if(!_ocr) _ocr = new Promise(function(ok, falha){
      var s = document.createElement('script'); s.src = OCR + 'tesseract.min.js';
      s.onload = function(){ window.Tesseract ? ok(window.Tesseract) : falha(new Error('o leitor de imagem não carregou')); };
      s.onerror = function(){ _ocr = null; s.remove(); falha(new Error('não foi possível carregar o leitor de imagem (' + OCR + 'tesseract.min.js)')); };
      document.head.appendChild(s);
    });
    return _ocr;
  }
  async function trabalhador(progresso){
    var T = await tesseract(), base = new URL(OCR, document.baseURI || location.href).href;
    var w = await T.createWorker('por', 1, { workerPath: base + 'worker.min.js', corePath: base + 'core', langPath: base + 'lang', gzip: true, workerBlobURL: false,
      logger: function(m){ if(progresso && m && m.status === 'recognizing text') progresso('lendo a imagem… ' + Math.round((m.progress || 0) * 100) + '%'); } });
    await w.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
    return w;
  }
  /* imagem (foto/print) → canvas em tons de cinza, aumentada; tema escuro invertido */
  async function prepararImagem(arquivo){
    var img = window.createImageBitmap ? await createImageBitmap(arquivo) : await new Promise(function(ok, falha){ var u = URL.createObjectURL(arquivo), i = new Image(); i.onload = function(){ URL.revokeObjectURL(u); ok(i); }; i.onerror = function(){ URL.revokeObjectURL(u); falha(new Error('imagem inválida')); }; i.src = u; });
    var esc = Math.max(1, Math.min(3, 2600 / img.width, 9000 / img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
    var ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, c.width, c.height); if(img.close) img.close();
    cinza(ctx, c); return c;
  }
  function cinza(ctx, c){
    var px = ctx.getImageData(0, 0, c.width, c.height), d = px.data, soma = 0;
    for(var i = 0; i < d.length; i += 4){ var y = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; d[i] = d[i + 1] = d[i + 2] = y; soma += y; }
    if(soma / (d.length / 4) < 115) for(i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
    ctx.putImageData(px, 0, 0);
  }
  function ehImagem(f){ return /^image\//.test(f.type || '') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name || ''); }
  function ehTexto(f){ return /text\/plain/.test(f.type || '') || /\.txt$/i.test(f.name || ''); }

  async function lerArquivo(arquivo, o){
    o = o || {}; var prog = o.progresso || function(){};
    if(ehTexto(arquivo)){ var t = await arquivo.text(); return { texto: t, paginas: [{ n: 1, texto: t }], metodo: 'texto', paginas_imagem: 0 }; }
    if(ehImagem(arquivo)){
      prog('preparando a imagem…'); var w = await trabalhador(prog);
      try{ var c = await prepararImagem(arquivo), r = await w.recognize(c); c.width = c.height = 0; var tx = String((r && r.data && r.data.text) || ''); return { texto: tx, paginas: [{ n: 1, texto: tx, imagem: true }], metodo: 'imagem', paginas_imagem: 1 }; }
      finally{ try{ await w.terminate(); }catch(e){} }
    }
    var lib = await pdfjs(), dados = new Uint8Array(await arquivo.arrayBuffer());
    var doc;
    try{ doc = await lib.getDocument({ data: dados }).promise; }
    catch(e){ if(/password/i.test(e && (e.name + e.message))) throw new Error('o PDF tem senha: abra-o, salve uma cópia sem senha e tente de novo'); throw new Error('não consegui abrir o PDF (' + (e.message || e) + ')'); }
    var maxPag = Math.min(doc.numPages, o.maxPaginas || 60), paginas = [], w2 = null, nImg = 0;
    try{
      for(var i = 1; i <= maxPag; i++){
        prog('página ' + i + ' de ' + maxPag + '…');
        var pg = await doc.getPage(i), tc = await pg.getTextContent(), ult = null, linha = [], out = [];
        tc.items.forEach(function(it){ var y = it.transform ? Math.round(it.transform[5]) : 0; if(ult !== null && Math.abs(y - ult) > 2){ out.push(linha.join(' ')); linha = []; } linha.push(it.str); ult = y; if(it.hasEOL){ out.push(linha.join(' ')); linha = []; ult = null; } });
        if(linha.length) out.push(linha.join(' '));
        var tx2 = out.join('\n');
        if(tx2.replace(/\s/g, '').length < 40 && o.ocr !== false){
          /* página escaneada: desenha e lê a imagem */
          if(!w2) w2 = await trabalhador(function(m){ prog('página ' + i + ' (imagem): ' + m); });
          var vp = pg.getViewport({ scale: 2.2 }), cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
          var ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
          await pg.render({ canvasContext: ctx, viewport: vp }).promise; cinza(ctx, cv);
          var rr = await w2.recognize(cv); cv.width = cv.height = 0;
          tx2 = String((rr && rr.data && rr.data.text) || ''); nImg++;
          paginas.push({ n: i, texto: tx2, imagem: true });
        } else paginas.push({ n: i, texto: tx2 });
        try{ pg.cleanup(); }catch(e){}
      }
    } finally { if(w2){ try{ await w2.terminate(); }catch(e){} } try{ doc.destroy(); }catch(e){} }
    var metodo = nImg === 0 ? 'texto' : (nImg === paginas.length ? 'imagem' : 'misto');
    return { texto: paginas.map(function(p){ return p.texto; }).join('\n'), paginas: paginas, metodo: metodo, paginas_imagem: nImg, total_paginas: doc.numPages, cortado: doc.numPages > maxPag };
  }

  /* documento da pasta: usa a leitura guardada; senão baixa, lê e guarda */
  async function lerDocumento(sb, doc, o){
    o = o || {};
    if(!o.forcar){
      var g = await sb.from('documentos_leituras').select('texto,metodo,paginas,paginas_imagem,campos,lido_em').eq('documento_id', doc.id).eq('ativo', true).maybeSingle();
      if(!g.error && g.data && g.data.texto){
        var pags = (g.data.campos && g.data.campos._paginas) || null;
        var paginas = pags ? splitPaginas(g.data.texto, pags) : [{ n: 1, texto: g.data.texto }];
        return { texto: g.data.texto, paginas: paginas, metodo: g.data.metodo, paginas_imagem: g.data.paginas_imagem, doc: doc, guardada: true, lido_em: g.data.lido_em };
      }
    }
    var dl = await sb.storage.from(BUCKET).download(doc.caminho_storage);
    if(dl.error) throw new Error('não consegui abrir "' + doc.nome_arquivo + '" (' + dl.error.message + ')');
    var f = new File([dl.data], doc.nome_arquivo || 'documento', { type: dl.data.type || (/\.pdf$/i.test(doc.nome_arquivo || '') ? 'application/pdf' : '') });
    var r = await lerArquivo(f, o);
    r.doc = doc;
    /* guarda o texto (com o tamanho de cada página, para achar a página depois) */
    try{
      var tam = r.paginas.map(function(p){ return p.texto.length + 1; });
      var s = await sb.rpc('leitura_documento_salvar', { p_documento: doc.id, p_metodo: r.metodo, p_texto: r.texto, p_paginas: r.total_paginas || r.paginas.length,
        p_paginas_imagem: r.paginas_imagem || 0, p_campos: Object.assign({}, o.campos || {}, { _paginas: tam }), p_tipo: o.tipo || null });
      if(s.error) r.erroGuardar = s.error.message;
    }catch(e){ r.erroGuardar = e.message || String(e); }
    return r;
  }
  function splitPaginas(texto, tamanhos){
    var out = [], pos = 0;
    tamanhos.forEach(function(t, i){ out.push({ n: i + 1, texto: texto.slice(pos, pos + t - 1) }); pos += t; });
    return out;
  }
  /* roda o leitor de campos em cada página e anota de onde veio */
  function acharNasPaginas(paginas, fnLer, arquivo){
    var achados = {};
    paginas.forEach(function(p){
      var a = fnLer(p.texto) || {};
      Object.keys(a).forEach(function(k){
        var x = a[k], org = { arquivo: arquivo || '', pagina: p.n, trecho: x.trecho || '', imagem: !!p.imagem };
        if(!achados[k]){ achados[k] = { valor: x.valor, outros: (x.outros || []).slice(), trecho: x.trecho, origem: org }; return; }
        [x.valor].concat(x.outros || []).forEach(function(v){ if(String(v) !== String(achados[k].valor) && achados[k].outros.indexOf(v) < 0) achados[k].outros.push(v); });
      });
    });
    return achados;
  }
  function ehDoc(f){ return ehImagem(f) || ehTexto(f) || /pdf/.test(f.type || '') || /\.pdf$/i.test(f.name || ''); }

  window.SagaLeitorDocs = { lerArquivo: lerArquivo, lerDocumento: lerDocumento, acharNasPaginas: acharNasPaginas, ehImagem: ehImagem, ehDoc: ehDoc };
})();
