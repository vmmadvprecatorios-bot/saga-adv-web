/* saga_visor.js · Ver um documento DENTRO do SAGA, sem baixar (21/11/2026, Dr. Victor)
   PDF: desenhado com o pdf.js guardado no site (o mesmo leitor da ficha). Word (.docx): convertido para PDF
   AQUI no navegador (saga_word_pdf.js; o arquivo não sai do aparelho) e mostrado igual.
   Uso:
     SagaVisor.abrir({ titulo, sub, obter: async () => Uint8Array (PDF), aoBaixar: fn opcional })
     SagaVisor.pdfDeWord(bytesDocx) -> Promise<{bytes, avisos}>
   Computador e celular: a janela ocupa a tela, as páginas se ajustam à largura; + / − mudam o tamanho. */
window.SagaVisor = (function(){
  'use strict';
  var PDFJS = 'vendor/pdfjs-4.10.38/';
  var EASE = 'cubic-bezier(.22,.78,.25,1)';
  var V = { pdf:null, zoom:1, gen:0, obs:null, el:null };
  var versao = (function(){ try{ var s = document.currentScript && document.currentScript.src; var m = /[?&]v=(\d+)/.exec(s || ''); return m ? m[1] : ''; }catch(e){ return ''; } })();

  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function semMovimento(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }
  function script(src){
    return new Promise(function(ok, falha){
      if(document.querySelector('script[data-visor-src="' + src + '"]')){ ok(); return; }
      var s = document.createElement('script'); s.src = src + (versao && /^saga_/.test(src) ? '?v=' + versao : ''); s.async = true; s.setAttribute('data-visor-src', src);
      s.onload = function(){ ok(); }; s.onerror = function(){ falha(new Error('não carregou ' + src)); };
      document.head.appendChild(s);
    });
  }
  var _pdfjs = null;
  function pdfjs(){
    if(!_pdfjs) _pdfjs = import(new URL(PDFJS + 'pdf.min.mjs', location.href).href).then(function(m){
      m.GlobalWorkerOptions.workerSrc = new URL(PDFJS + 'pdf.worker.min.mjs', location.href).href; return m;
    }).catch(function(e){ _pdfjs = null; throw e; });
    return _pdfjs;
  }
  async function pdfDeWord(bytes){
    if(!window.PDFLib) await script('vendor/pdf-lib-1.17.1/pdf-lib.min.js');
    if(!window.SagaWordPdf) await script('saga_word_pdf.js');
    if(!window.SagaWordPdf) throw new Error('o conversor de Word não carregou');
    var r = await SagaWordPdf.converter(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), {});
    return { bytes: r.bytes, avisos: r.avisos || [] };
  }

  var css = document.createElement('style');
  css.textContent = [
    '.sv-fundo{position:fixed;inset:0;z-index:2600;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(4,8,18,.72);opacity:0;visibility:hidden;transition:opacity .28s ' + EASE + ',visibility 0s linear .28s}',
    '.sv-fundo.aberto{opacity:1;visibility:visible;transition:opacity .28s ' + EASE + '}',
    '.sv-fundo.sem-mov{transition:none}',
    '.sv-caixa{width:100%;max-width:1060px;height:100%;display:flex;flex-direction:column;background:var(--panel-solid,var(--panel,#1b2333));border:1px solid var(--border-soft,rgba(255,255,255,.12));border-radius:16px;overflow:hidden;color:var(--text,#eee);box-shadow:0 30px 70px rgba(0,0,0,.45)}',
    '.sv-topo{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border-soft,rgba(255,255,255,.12));flex-wrap:wrap}',
    '.sv-tit{flex:1;min-width:0}.sv-tit b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sv-tit span{display:block;font-size:11.5px;color:var(--muted,#9aa);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sv-bts{display:flex;gap:6px;align-items:center}.sv-bts button{min-width:34px;height:32px;border-radius:9px;border:1px solid var(--border-soft,rgba(255,255,255,.15));background:transparent;color:inherit;font:inherit;font-size:13px;padding:0 9px;cursor:pointer}',
    '.sv-corpo{flex:1;overflow:auto;background:var(--navy-1,#0d1422);-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',
    '.sv-paginas{display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px}',
    '.sv-pag{background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);position:relative}.sv-pag canvas{display:block;width:100%;height:100%}',
    '.sv-num{position:absolute;right:6px;bottom:4px;font-size:10px;color:#888}',
    '.sv-msg{padding:40px 18px;text-align:center;color:var(--muted,#9aa);font-size:14px;line-height:1.6}',
    '.sv-aviso{margin:10px 12px 0;padding:8px 10px;border-radius:9px;border:1px solid rgba(224,169,59,.5);font-size:12px;color:var(--text,#eee)}',
    '.sv-giro{display:inline-block;width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:svgiro .8s linear infinite;vertical-align:-3px;margin-right:8px}',
    '@keyframes svgiro{to{transform:rotate(360deg)}}',
    /* 21/11 (Dr. Victor): camada de texto do pdf.js, para selecionar e copiar (também no celular, pressionando) */
    '.textLayer{position:absolute;text-align:initial;inset:0;overflow:clip;opacity:1;line-height:1;-webkit-text-size-adjust:none;text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;caret-color:CanvasText;z-index:2}',
    '.textLayer span,.textLayer br{color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}',
    '.textLayer span.markedContent{top:0;height:0}',
    '.textLayer ::selection{background:rgba(40,110,255,.32);color:transparent}',
    '.textLayer br::selection{background:transparent}',
    '.textLayer .endOfContent{display:block;position:absolute;inset:100% 0 0;z-index:-1;cursor:default;-webkit-user-select:none;user-select:none}',
    '.textLayer.selecting .endOfContent{top:0}',
    '.sv-pag .textLayer,.doc-visor-pagina .textLayer{-webkit-user-select:text;user-select:text}',
    '.sv-semtexto{position:absolute;left:6px;bottom:4px;font-size:10px;color:#999}',
    '@media (max-width:640px){.sv-fundo{padding:0}.sv-caixa{border-radius:0;border:0}}'
  ].join('\n');
  document.head.appendChild(css);

  /* camada de texto sobre a página desenhada (selecionar, copiar, Ctrl+F do navegador); PDF escaneado não tem texto */
  async function camadaTexto(m, pagina, vp, folha){
    try{
      if(!m || !m.TextLayer) return false;
      if(folha.querySelector('.textLayer')) return true;
      if(folha._svTexto) return folha._svTexto;
      folha._svTexto = true;
      var tc = await pagina.getTextContent();
      if(!tc || !tc.items || !tc.items.some(function(i){ return i.str && i.str.trim(); })){
        if(!folha.querySelector('.sv-semtexto')){ var a = document.createElement('span'); a.className = 'sv-semtexto'; a.textContent = 'página só em imagem (escaneada): sem texto para copiar'; folha.appendChild(a); }
        return false;
      }
      var div = document.createElement('div'); div.className = 'textLayer';
      folha.style.setProperty('--scale-factor', vp.scale);
      folha.appendChild(div);
      var tl = new m.TextLayer({ textContentSource: tc, container: div, viewport: vp });
      await tl.render();
      var fim = document.createElement('div'); fim.className = 'endOfContent'; div.appendChild(fim);
      div.addEventListener('mousedown', function(){ div.classList.add('selecting'); });
      document.addEventListener('mouseup', function(){ div.classList.remove('selecting'); });
      return true;
    }catch(e){ return false; }
  }

  /* texto de TODAS as páginas logo ao abrir (sem desenhar a imagem), para o Ctrl+F do navegador achar em qualquer página; até 150 páginas */
  async function textoTodas(m, pdf, folhas, escala, vivo){
    for(var i = 0; i < folhas.length && i < 150; i++){
      if(vivo && !vivo()) return;
      try{ var pg = await pdf.getPage(+folhas[i].dataset.pagina); if(vivo && !vivo()) return; await camadaTexto(m, pg, pg.getViewport({ scale: escala }), folhas[i]); }catch(e){}
    }
  }

  function fechar(){
    var el = V.el; if(!el) return;
    V.gen++;
    if(V.obs){ V.obs.disconnect(); V.obs = null; }
    if(V.pdf){ try{ V.pdf.destroy(); }catch(e){} V.pdf = null; }
    el.classList.remove('aberto');
    document.removeEventListener('keydown', tecla);
    setTimeout(function(){ if(!el.classList.contains('aberto')) el.remove(); }, semMovimento() ? 0 : 300);
    V.el = null;
  }
  function tecla(ev){
    if(ev.key === 'Escape') fechar();
    else if(V.pdf && (ev.key === '+' || ev.key === '=')) zoom(1.25);
    else if(V.pdf && ev.key === '-') zoom(0.8);
  }
  function zoom(f){ if(!V.pdf) return; V.zoom = Math.max(0.5, Math.min(4, V.zoom * f)); desenhar(); }

  async function desenhar(){
    var pdf = V.pdf, corpo = V.el && V.el.querySelector('.sv-corpo'); if(!pdf || !corpo) return;
    var gen = ++V.gen;
    var z = V.el.querySelector('[data-sv="ajustar"]'); if(z) z.textContent = Math.round(V.zoom * 100) + '%';
    if(V.obs){ V.obs.disconnect(); V.obs = null; }
    var largura = Math.max(240, Math.min(corpo.clientWidth - 24, 1000));
    var p1 = await pdf.getPage(1); if(gen !== V.gen) return;
    var base = p1.getViewport({ scale:1 }), escala = largura / base.width * V.zoom;
    var aviso = corpo.querySelector('.sv-aviso');
    corpo.innerHTML = '<div class="sv-paginas"></div>';
    if(aviso) corpo.insertBefore(aviso, corpo.firstChild);
    var lista = corpo.querySelector('.sv-paginas'), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for(var n = 1; n <= pdf.numPages; n++){
      var f = document.createElement('div'); f.className = 'sv-pag'; f.dataset.pagina = n;
      f.style.width = Math.round(base.width * escala) + 'px'; f.style.height = Math.round(base.height * escala) + 'px';
      f.innerHTML = '<span class="sv-num">' + n + '</span>'; lista.appendChild(f);
    }
    async function pinta(folha){
      if(folha.dataset.feito) return; folha.dataset.feito = '1';
      try{
        var pg = await pdf.getPage(+folha.dataset.pagina); if(gen !== V.gen) return;
        var vp = pg.getViewport({ scale: escala * dpr });
        var c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        folha.insertBefore(c, folha.firstChild);
        await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        if(gen === V.gen) await camadaTexto(await pdfjs(), pg, pg.getViewport({ scale: escala }), folha);
      }catch(e){ folha.dataset.feito = ''; }
    }
    if('IntersectionObserver' in window){
      V.obs = new IntersectionObserver(function(ents){ ents.forEach(function(en){ if(en.isIntersecting) pinta(en.target); }); }, { root: corpo, rootMargin: '600px 0px' });
      lista.querySelectorAll('.sv-pag').forEach(function(x){ V.obs.observe(x); });
    }else lista.querySelectorAll('.sv-pag').forEach(pinta);
    pdfjs().then(function(m){ textoTodas(m, pdf, lista.querySelectorAll('.sv-pag'), escala, function(){ return gen === V.gen; }); });
  }

  async function abrir(o){
    o = o || {};
    if(V.el) fechar();
    var el = document.createElement('div');
    el.className = 'sv-fundo' + (semMovimento() ? ' sem-mov' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Ver documento'); el.setAttribute('data-saga-movimento-proprio', '1');
    el.innerHTML = '<div class="sv-caixa"><div class="sv-topo"><div class="sv-tit"><b title="' + esc(o.titulo) + '">' + esc(o.titulo || 'Documento') + '</b><span>' + esc(o.sub || '') + '</span></div>' +
      '<div class="sv-bts"><button type="button" data-sv="menos" title="Diminuir" aria-label="Diminuir">−</button><button type="button" data-sv="ajustar" title="Ajustar à largura">100%</button><button type="button" data-sv="mais" title="Aumentar" aria-label="Aumentar">+</button>' +
      (o.aoBaixar ? '<button type="button" data-sv="baixar" title="Baixar">Baixar</button>' : '') +
      '<button type="button" data-sv="fechar" title="Fechar (Esc)" aria-label="Fechar">✕</button></div></div>' +
      '<div class="sv-corpo"><div class="sv-msg"><span class="sv-giro"></span>' + esc(o.carregando || 'Preparando a visualização...') + '</div></div></div>';
    document.body.appendChild(el); V.el = el; V.zoom = 1;
    requestAnimationFrame(function(){ el.classList.add('aberto'); });
    document.addEventListener('keydown', tecla);
    el.addEventListener('click', function(ev){
      if(ev.target === el){ fechar(); return; }
      var b = ev.target.closest('[data-sv]'); if(!b) return;
      var a = b.getAttribute('data-sv');
      if(a === 'fechar') fechar(); else if(a === 'mais') zoom(1.25); else if(a === 'menos') zoom(0.8);
      else if(a === 'ajustar'){ V.zoom = 1; desenhar(); } else if(a === 'baixar' && o.aoBaixar) o.aoBaixar();
    });
    var gen = ++V.gen, corpo = el.querySelector('.sv-corpo');
    try{
      var r = await o.obter();
      if(gen !== V.gen || V.el !== el) return;
      var bytes = r && r.bytes ? r.bytes : r, avisos = (r && r.avisos) || [];
      var m = await pdfjs();
      var pdf = await m.getDocument({ data: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), isEvalSupported: false }).promise;
      if(V.el !== el){ pdf.destroy(); return; }
      V.pdf = pdf;
      var sub = el.querySelector('.sv-tit span'); if(sub) sub.textContent = (o.sub ? o.sub + ' · ' : '') + pdf.numPages + (pdf.numPages === 1 ? ' página' : ' páginas');
      corpo.innerHTML = avisos.length ? '<div class="sv-aviso"><b>Na visualização:</b> ' + avisos.slice(0, 4).map(esc).join('; ') + '</div>' : '';
      await desenhar();
    }catch(e){
      if(V.el !== el) return;
      corpo.innerHTML = '<div class="sv-msg"><b>Não consegui mostrar o documento aqui.</b><br>Motivo: ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message)) || e) + '.' +
        (o.aoBaixar ? '<br><br><button type="button" data-sv="baixar" class="btn">Baixar para ver no aparelho</button>' : '') + '</div>';
    }
  }

  return { abrir: abrir, fechar: fechar, pdfDeWord: pdfDeWord, camadaTexto: camadaTexto, textoTodas: textoTodas };
})();
