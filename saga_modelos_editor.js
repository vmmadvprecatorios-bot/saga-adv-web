/* =====================================================================
   SAGA · Modelos de petição: EDITOR e IMPORTAR PASTA (20/11/2026, Dr. Victor; bloco 279)
   - Importar pasta: o Dr. Victor arrasta (ou escolhe) a pasta de petições dele, separada por áreas e subpastas.
     Cada Word (.docx) é lido AQUI no navegador (PizZip; nada vai para site de fora): vira um modelo do SAGA
     (blocos: endereçamento, autos, parágrafos, títulos, tópicos, citações, pedidos, fecho, assinatura), com a ÁREA
     (1ª pasta) e a SUBPASTA (o resto do caminho). O número do processo, o CPF, o CNPJ, o nome do cliente e a
     qualificação viram CAMPOS ({numero_processo}, {cpf}, {cnpj}, {cliente}, {qualificacao}); o resto do texto fica
     como estava e o modelo entra "A revisar" (pode ter outro dado de cliente no meio do texto: conferir no editor).
   - Editor: o modelo aparece como uma folha (Garamond), um bloco por parágrafo, com o tipo de cada um, os campos
     ({campo}) e "Inserir campo"; salvar pela modelo_peticao_salvar; "Baixar Word de teste" por cima do timbrado.
   Quem usa: o administrador ou quem gerencia os modelos (modelos_documentos.gerenciar).
   Uso: SagaModelosEditor.abrir(modelo|null, {aoSalvar}) · SagaModelosEditor.importar({aoTerminar})
   ===================================================================== */
window.SagaModelosEditor = (function(){
  'use strict';
  var EASE = 'cubic-bezier(.22,.78,.25,1)';
  var TIPOS = [
    ['enderecamento','Endereçamento'],['autos','Autos nº'],['paragrafo','Parágrafo'],['titulo_peca','Título da peça'],
    ['topico','Tópico (título de seção)'],['citacao','Citação (recuada)'],['pedidos','Pedidos (um por linha)'],
    ['destaque','Destaque'],['linha_negrito','Linha em negrito'],['fecho','Fecho (cidade e data)'],['assinatura','Assinaturas'],
    ['branco','Linha em branco'],['quebra_pagina','Quebra de página']
  ];
  var SEM_TEXTO = { assinatura:1, branco:1, quebra_pagina:1, fecho:1 };
  var CAMPOS_PADRAO = {
    cliente:['Nome do cliente'], qualificacao:['Qualificação'], numero_processo:['Número do processo','processo'],
    vara:['Juízo / vara'], cpf:['CPF'], cnpj:['CNPJ'], nome_peca:['Nome da peça'], cidade:['Cidade'], data:['Data (vazio = hoje)'],
    fatos:['Dos fatos',null,true], direito:['Do direito',null,true]
  };
  var E = { pode:null, teses:null, modelo:null, blocos:[], campos:[], focoTxt:null, aoSalvar:null, imp:null };

  function sb(){ return window._sb; }
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; }
  function toast(m, t){ if(typeof window.showToast === 'function') window.showToast(m, t || 'info'); }

  /* ---------------- estilos ---------------- */
  var css = document.createElement('style');
  css.textContent = [
    '.me-fundo{position:fixed;inset:0;z-index:320;display:flex;align-items:safe center;justify-content:center;padding:18px;background:rgba(0,0,0,.6);opacity:0;visibility:hidden;transition:opacity .3s ' + EASE + ',visibility 0s linear .3s}',
    '.me-fundo.aberto{opacity:1;visibility:visible;transition:opacity .3s ' + EASE + '}',
    '.me-fundo.sem-movimento{transition:none}',
    '.me-jan{width:100%;max-width:1060px;max-height:100%;overflow:auto;background:linear-gradient(135deg,var(--panel-solid,var(--panel)),var(--navy-2,var(--panel)));border:1px solid var(--border-soft);border-radius:18px;padding:22px;box-shadow:0 30px 70px rgba(0,0,0,.45);color:var(--text)}',
    '.me-jan h3{margin:0 0 4px;font-size:18px}',
    '.me-sub{font-size:12px;color:var(--muted);margin:0 0 14px;line-height:1.5}',
    '.me-grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 12px;margin-bottom:12px}',
    '.me-grade label,.me-lado label{display:block;font-size:11px;color:var(--muted);margin-bottom:4px}',
    '.me-grade input,.me-grade select,.me-lado input:not([type=checkbox]),.me-lado select{width:100%;box-sizing:border-box}',
    '.me-lado input[type=checkbox]{width:auto;flex:0 0 auto}',
    '.me-corpo{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:14px;align-items:start}',
    '.me-folha{background:#fff;color:#1b1b1b;border-radius:8px;padding:28px 34px;font-family:"EB Garamond",Garamond,Georgia,serif;font-size:15px;line-height:1.5;min-height:300px;box-shadow:0 2px 10px rgba(0,0,0,.25)}',
    '.me-bloco{position:relative;display:grid;grid-template-columns:118px minmax(0,1fr) auto;gap:6px;align-items:start;padding:3px 0;border-radius:6px}',
    '.me-bloco:hover{background:#f4f6fa}',
    '.me-bloco select{font:12px Montserrat,Arial,sans-serif!important;color:#445!important;background:#f1f3f7!important;border:1px solid #d9dee8!important;border-radius:6px!important;padding:3px 4px!important;height:auto!important}',
    '.me-bloco textarea{width:100%;box-sizing:border-box;border:1px solid transparent!important;background:transparent!important;color:#1b1b1b!important;font:inherit!important;line-height:1.5!important;resize:none;overflow:hidden;padding:2px 6px!important;border-radius:6px!important;min-height:26px}',
    '.me-bloco textarea:focus{border-color:#c9d3e6!important;background:#fbfcfe!important;outline:none}',
    '.me-bloco[data-tipo="enderecamento"] textarea,.me-bloco[data-tipo="titulo_peca"] textarea{font-weight:700!important;text-transform:uppercase}',
    '.me-bloco[data-tipo="titulo_peca"] textarea{text-align:center}',
    '.me-bloco[data-tipo="topico"] textarea,.me-bloco[data-tipo="autos"] textarea,.me-bloco[data-tipo="linha_negrito"] textarea{font-weight:700!important}',
    '.me-bloco[data-tipo="citacao"] textarea{font-style:italic!important;padding-left:40px!important}',
    '.me-fixo{font:12px Montserrat,Arial,sans-serif;color:#7a8394;padding:5px 6px;font-style:italic}',
    '.me-fecho{display:flex;gap:6px;flex-wrap:wrap}.me-fecho input{font:13px Montserrat,Arial,sans-serif!important;color:#1b1b1b!important;background:#f7f8fb!important;border:1px solid #d9dee8!important;border-radius:6px!important;padding:4px 6px!important;width:200px}',
    '.me-acoes-b{display:flex;gap:2px;opacity:.25;transition:opacity .2s}',
    '.me-bloco:hover .me-acoes-b,.me-bloco:focus-within .me-acoes-b{opacity:1}',
    '.me-acoes-b button{font:12px Montserrat,Arial,sans-serif;background:#eef1f6;border:1px solid #d9dee8;color:#334;border-radius:6px;padding:2px 6px;cursor:pointer;line-height:1.3}',
    '.me-lado{display:flex;flex-direction:column;gap:12px;position:sticky;top:0}',
    '.me-caixa{background:var(--panel);border:1px solid var(--border-soft);border-radius:12px;padding:12px}',
    '.me-caixa h4{margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold)}',
    '.me-campos{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto}',
    '.me-campo{display:grid;grid-template-columns:1fr auto;gap:4px;align-items:center;font-size:12px}',
    '.me-campo code{font-size:11px;color:var(--gold)}',
    '.me-campo input[type=text]{font-size:12px;padding:4px 6px}',
    '.me-chip{white-space:nowrap;font:11px Montserrat,Arial,sans-serif;border:1px solid var(--border-soft);border-radius:999px;padding:3px 8px;background:transparent;color:var(--text);cursor:pointer}',
    '.me-botoes{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}',
    '.me-msg{font-size:12px;margin-top:8px}',
    '.me-jan button.btn-secundario,.me-jan button.btn-confirmar-bib,.me-jan button.btn-perigo,.tb-ferr button{font:inherit;font-size:12.5px;padding:8px 14px;border-radius:10px;cursor:pointer;border:1px solid var(--border-soft)}',
    '.me-jan button[disabled]{opacity:.55;cursor:not-allowed}',
    '.me-erro{background:color-mix(in srgb,#d9534f 12%,transparent);border:1px solid color-mix(in srgb,#d9534f 50%,transparent);border-radius:10px;padding:9px 12px;font-size:12px;margin:8px 0}',
    '.me-ok{background:color-mix(in srgb,#2e9e6a 12%,transparent);border:1px solid color-mix(in srgb,#2e9e6a 45%,transparent);border-radius:10px;padding:9px 12px;font-size:12px;margin:8px 0}',
    '.me-amarelo{background:color-mix(in srgb,#d97706 12%,transparent);border:1px solid color-mix(in srgb,#d97706 45%,transparent);border-radius:10px;padding:9px 12px;font-size:12px;margin:8px 0}',
    '.me-solta{border:2px dashed color-mix(in srgb,var(--gold) 50%,transparent);border-radius:14px;padding:26px;text-align:center;font-size:13px;color:var(--muted);transition:background .25s ' + EASE + '}',
    '.me-solta.sobre{background:color-mix(in srgb,var(--gold) 9%,transparent)}',
    '.me-tab{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}',
    '.me-tab th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:6px;border-bottom:1px solid var(--border-soft)}',
    '.me-tab td{padding:6px;border-bottom:1px solid var(--border-soft);vertical-align:top}',
    '.me-tab .av{color:#d97706;font-size:11px}',
    '.me-so-ler .me-acoes-b,.me-so-ler #meMaisBloco{display:none}',
    '.me-so-ler .me-folha textarea:disabled{opacity:1;color:var(--text);background:transparent;border-color:transparent;resize:none}',
    '.me-so-ler .me-folha select:disabled{opacity:.6}',
    '.me-versoes{font-size:12px;color:var(--muted);line-height:1.6;margin:6px 0 0}',
    '@media (max-width:860px){.me-corpo{grid-template-columns:1fr}.me-grade{grid-template-columns:1fr}.me-lado{position:static}.me-bloco{grid-template-columns:1fr}.me-folha{padding:18px 14px}}'
  ].join('\n');
  document.head.appendChild(css);

  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }
  function janela(id, html){
    var f = document.getElementById(id);
    if(!f){
      f = document.createElement('div'); f.className = 'me-fundo'; f.id = id;
      f.setAttribute('data-saga-movimento-proprio', '1');
      document.body.appendChild(f);
      f.addEventListener('click', function(e){ if(e.target === f) fechar(f); });
    }
    f.innerHTML = '<div class="me-jan" role="dialog" aria-modal="true">' + html + '</div>';
    f.classList.toggle('sem-movimento', reduzido());
    requestAnimationFrame(function(){ f.classList.add('aberto'); });
    return f;
  }
  function fechar(f){ if(f) f.classList.remove('aberto'); }

  async function podeEditar(){
    if(E.pode != null) return E.pode;
    try{ var r = await sb().rpc('modelo_peticao_pode'); E.pode = !r.error && r.data === true; }catch(e){ E.pode = false; }
    return E.pode;
  }
  async function teses(){
    if(E.teses) return E.teses;
    var r = await sb().from('teses').select('id,nome').eq('ativo', true).order('nome');
    E.teses = r.error ? [] : (r.data || []);
    return E.teses;
  }

  /* ================================================================
     LEITURA DO WORD (.docx) -> blocos do modelo
     ================================================================ */
  async function pizzip(){
    if(window.PizZip) return window.PizZip;
    await new Promise(function(ok, falha){
      var s = document.createElement('script'); s.src = 'vendor/pizzip-3.1.6/pizzip.min.js';
      s.onload = ok; s.onerror = function(){ falha(new Error('não consegui carregar o leitor de Word (vendor/pizzip)')); };
      document.head.appendChild(s);
    });
    return window.PizZip;
  }
  function textoXml(x){ return x.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'); }
  /* lê os parágrafos do corpo (também os de tabelas), com negrito, centralizado, recuo e lista */
  function paragrafos(xml){
    var corpo = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [,''])[1];
    var ps = corpo.match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) || [];
    return ps.map(function(p){
      var ppr = (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
      var runs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
      var partes = [], tudoNegrito = true, temTexto = false;
      runs.forEach(function(r){
        var rpr = (r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
        var neg = /<w:b\/>|<w:b w:val="(1|true|on)"\/>/.test(rpr);
        var t = '';
        (r.match(/<w:t[^>]*>[\s\S]*?<\/w:t>|<w:tab\/>|<w:br\/>/g) || []).forEach(function(x){
          if(x === '<w:tab/>') t += ' '; else if(x === '<w:br/>') t += '\n'; else t += textoXml(x.replace(/<[^>]+>/g, ''));
        });
        if(!t) return;
        if(t.trim()){ temTexto = true; if(!neg) tudoNegrito = false; }
        partes.push({ t:t, neg:neg });
      });
      var texto = partes.map(function(x){ return x.t; }).join('').replace(/[  ]+/g, ' ').trim();
      var comNegrito = partes.map(function(x){ return x.neg && x.t.trim() && !tudoNegrito ? x.t.replace(/^(\s*)(.*?)(\s*)$/, '$1**$2**$3') : x.t; }).join('').replace(/[  ]+/g, ' ').trim();
      var esq = +((ppr.match(/<w:ind [^>]*w:left="(\d+)"/) || [,0])[1]);
      return { texto:texto, rico:comNegrito, negrito:temTexto && tudoNegrito, centro:/<w:jc w:val="center"\/>/.test(ppr),
               lista:/<w:numPr>/.test(ppr), recuo:esq };
    });
  }
  var RE_CNJ = /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g;
  var RE_CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
  var RE_CNPJ = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;
  var RE_DATA_FECHO = /^[A-ZÀ-Úa-zà-ú .'-]{3,40}(\/[A-Z]{2})?,\s*(\d{1,2}|\[?data\]?)\s*(de\s+)?[a-zç]+\s+(de\s+)?\d{4}\.?$/i;
  function anonimizar(t, achados){
    return t.replace(RE_CNJ, function(){ achados.numero_processo = 1; return '{numero_processo}'; })
            .replace(RE_CNPJ, function(){ achados.cnpj = 1; return '{cnpj}'; })
            .replace(RE_CPF, function(){ achados.cpf = 1; return '{cpf}'; });
  }
  /* "**FULANO DE TAL**, brasileiro, ..., por seus advogados, vem ..." -> {cliente}, {qualificacao} */
  function trocarCliente(t, achados){
    var m = t.match(/^(\*\*)?([A-ZÀ-Ú][A-ZÀ-Ú'´ .]{5,90}?)(\*\*)?\s*,\s*([\s\S]+?)(,\s*(?:por\s+(?:seus?|sua|intermédio)|neste\s+ato|vem|vêm))/);
    if(!m) return t;
    var nome = m[2].trim();
    if(nome.split(/\s+/).length < 2) return t;
    achados.cliente = 1; achados.qualificacao = 1;
    return '**{cliente}**, {qualificacao}' + t.slice(m[0].length - m[5].length);
  }
  function blocosDoWord(ps){
    var bl = [], achados = {}, avisos = [], i = 0, viuTitulo = false, viuQualif = false, brancos = 0, pedidos = null, fim = false;
    function poe(b){ if(pedidos && b.tipo !== 'pedidos'){ bl.push(pedidos); pedidos = null; } bl.push(b); brancos = 0; }
    ps.forEach(function(p, idx){
      if(fim) return;
      if(!p.texto){ if(bl.length && brancos < 2){ if(pedidos){ bl.push(pedidos); pedidos = null; } bl.push({ tipo:'branco' }); brancos++; } return; }
      var t = anonimizar(p.rico || p.texto, achados), cru = p.texto;
      if(!bl.length && /^(EXCELENT|EXMO|EXM\.|AO\s|À\s|A\s+DOUTA|AO\s+DOUTO|ILUSTR|SENHOR|SR\.)/i.test(cru)){ poe({ tipo:'enderecamento', texto:cru.replace(/\*\*/g, '') }); return; }
      if(/^(autos|processo)\s*(n[º°o.]|número|:)/i.test(cru) && cru.length < 120){ poe({ tipo:'autos', texto:anonimizar(cru, achados) }); return; }
      if(RE_DATA_FECHO.test(cru)){
        var cid = cru.split(',')[0].trim();
        poe({ tipo:'fecho', cidade:/maceió/i.test(cid) ? '{cidade}' : cid, data:'{data}' });
        poe({ tipo:'assinatura' }); fim = true; return;
      }
      if(/^(nestes\s+termos|termos\s+em\s+que|pede\s+(e\s+espera\s+)?deferimento)/i.test(cru)) return; /* o fecho já traz */
      if(!viuQualif && /\b(vem|vêm)\b[\s\S]*(respeitosamente|presença|perante)/i.test(cru)){
        var tc = trocarCliente(t, achados);
        if(tc === t) avisos.push('nome do cliente não achado na qualificação: confira');
        poe({ tipo:'paragrafo', texto:tc }); viuQualif = true; return;
      }
      if(p.centro && p.negrito && cru.length < 140 && !viuTitulo && viuQualif){ poe({ tipo:'titulo_peca', texto:cru }); viuTitulo = true; return; }
      if(p.negrito && cru.length < 110 && !/[.;:]$/.test(cru) && bl.length){ poe({ tipo:'topico', texto:cru.replace(/^([IVXLC]+|\d+)\s*[-–.)]\s*/, '') }); return; }
      if(p.lista || /^([a-z]\)|\d+\)|\d+\.\s|[a-z]\.\s)/i.test(cru)){
        if(!pedidos) pedidos = { tipo:'pedidos', itens:[] };
        pedidos.itens.push(t.replace(/^([a-z]\)|\d+\)|\d+\.|[a-z]\.)\s*/i, ''));
        brancos = 0; return;
      }
      if(p.recuo >= 1700){ poe({ tipo:'citacao', texto:t }); return; }
      poe({ tipo:'paragrafo', texto:t });
    });
    if(pedidos) bl.push(pedidos);
    while(bl.length && bl[bl.length - 1].tipo === 'branco') bl.pop();
    if(!fim) bl.push({ tipo:'branco' }, { tipo:'fecho', cidade:'{cidade}', data:'{data}' }, { tipo:'assinatura' });
    if(!viuQualif) avisos.push('parágrafo de qualificação ("vem respeitosamente...") não achado');
    var campos = camposUsados(bl);
    return { blocos:bl, campos:campos, avisos:avisos, achados:achados };
  }
  function camposUsados(bl){
    var vistos = {}, lista = [];
    JSON.stringify(bl).replace(/\{([a-z0-9_]+)\}/g, function(m, k){
      if(!vistos[k]){ vistos[k] = 1; var p = CAMPOS_PADRAO[k] || [k.replace(/_/g, ' ').replace(/^./, function(c){ return c.toUpperCase(); })];
        var c = { chave:k, rotulo:p[0] }; if(p[1]) c.formato = p[1]; if(p[2]) c.longo = true; lista.push(c); }
      return m;
    });
    return lista;
  }

  /* ================================================================
     IMPORTAR PASTA
     ================================================================ */
  function lerArquivo(f){ return new Promise(function(ok, falha){ var r = new FileReader(); r.onload = function(){ ok(new Uint8Array(r.result)); }; r.onerror = function(){ falha(r.error); }; r.readAsArrayBuffer(f); }); }
  async function entradasDaPasta(item, caminho, saida){
    if(item.isFile){ var f = await new Promise(function(ok, falha){ item.file(ok, falha); }); saida.push({ arquivo:f, caminho:caminho + f.name }); return; }
    if(item.isDirectory){
      var leitor = item.createReader(), lote;
      do{
        lote = await new Promise(function(ok, falha){ leitor.readEntries(ok, falha); });
        for(var i = 0; i < lote.length; i++) await entradasDaPasta(lote[i], caminho + item.name + '/', saida);
      }while(lote.length);
    }
  }
  function partesDoCaminho(caminho){
    var p = caminho.split('/').filter(Boolean);
    var nome = p.pop() || '';
    if(p.length > 1) p.shift(); /* a pasta de cima (a que foi arrastada) não é área */
    return { area:p[0] || 'Sem área', subpasta:p.slice(1).join(' / '), nome:nome, titulo:nome.replace(/\.(docx|doc)$/i, '').replace(/[_]+/g, ' ').trim() };
  }
  async function processar(lista){
    var Z = await pizzip(), out = [];
    for(var i = 0; i < lista.length; i++){
      var it = lista[i], pc = partesDoCaminho(it.caminho), linha = { caminho:it.caminho, area:pc.area, subpasta:pc.subpasta, titulo:pc.titulo, nome:pc.nome, incluir:true };
      if(/^~\$/.test(pc.nome) || /^\./.test(pc.nome)) continue;
      if(/\.doc$/i.test(pc.nome)){ linha.erro = 'Word antigo (.doc): abra no Word e "Salvar como" .docx para importar'; linha.incluir = false; out.push(linha); continue; }
      if(!/\.docx$/i.test(pc.nome)) continue;
      try{
        var zip = new Z(await lerArquivo(it.arquivo));
        var xml = zip.file('word/document.xml');
        if(!xml) throw new Error('não é um Word válido');
        var r = blocosDoWord(paragrafos(xml.asText()));
        linha.blocos = r.blocos; linha.campos = r.campos; linha.avisos = r.avisos;
        if(r.blocos.length < 4){ linha.avisos.push('quase sem texto'); }
      }catch(e){ linha.erro = 'não consegui ler: ' + ((e && e.message) || e) + (/encrypt|password|senha/i.test(String(e)) ? ' (Word com senha)' : ''); linha.incluir = false; }
      out.push(linha);
      if(i % 10 === 9) await new Promise(function(ok){ setTimeout(ok, 0); });
    }
    return out;
  }
  function desenharImportacao(f){
    var L = E.imp.linhas, ok = L.filter(function(l){ return l.incluir; }).length;
    var porArea = {};
    L.forEach(function(l){ porArea[l.area] = (porArea[l.area] || 0) + 1; });
    f.querySelector('#meImpLista').innerHTML = !L.length ? '<div class="me-amarelo">Nenhum Word (.docx) achado nesta pasta.</div>' :
      '<div class="me-sub" style="margin:10px 0 0">' + L.length + ' arquivo(s) · áreas: ' + Object.keys(porArea).map(function(a){ return esc(a) + ' (' + porArea[a] + ')'; }).join(', ') + '</div>' +
      '<div style="max-height:46vh;overflow:auto"><table class="me-tab"><thead><tr><th></th><th>Área</th><th>Subpasta</th><th>Modelo</th><th>Campos achados</th><th>Atenção</th></tr></thead><tbody>' +
      L.map(function(l, i){
        return '<tr><td><input type="checkbox" data-me-inc="' + i + '"' + (l.incluir ? ' checked' : '') + (l.erro ? ' disabled' : '') + ' aria-label="Importar ' + esc(l.titulo) + '"></td>' +
          '<td>' + esc(l.area) + '</td><td>' + esc(l.subpasta || '—') + '</td><td>' + esc(l.titulo) + '</td>' +
          '<td>' + (l.campos ? l.campos.map(function(c){ return '<code>{' + esc(c.chave) + '}</code>'; }).join(' ') : '') + '</td>' +
          '<td class="av">' + (l.erro ? '<span style="color:#d9534f">' + esc(l.erro) + '</span>' : esc((l.avisos || []).join('; '))) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    f.querySelector('#meImpOk').disabled = !ok;
    f.querySelector('#meImpOk').textContent = 'Importar ' + ok + ' modelo(s)';
    f.querySelectorAll('[data-me-inc]').forEach(function(c){ c.addEventListener('change', function(){ L[+c.getAttribute('data-me-inc')].incluir = c.checked; desenharImportacao(f); }); });
  }
  async function receberArquivos(f, lista){
    var msg = f.querySelector('#meImpMsg');
    msg.innerHTML = '<div class="me-sub">Lendo ' + lista.length + ' arquivo(s) aqui no seu computador...</div>';
    try{
      E.imp.linhas = await processar(lista);
      msg.innerHTML = '<div class="me-amarelo">Confira a lista. Os modelos entram como <b>"A revisar"</b>: o número do processo, o CPF/CNPJ, o nome do cliente e a qualificação já viraram campos, mas o texto pode ter outro dado de cliente (nome de parente, valores, datas). Abra cada um no editor antes de usar.</div>';
      desenharImportacao(f);
    }catch(e){ msg.innerHTML = '<div class="me-erro"><b>Erro ao ler a pasta:</b> ' + esc((e && e.message) || e) + '</div>'; }
  }
  async function importar(o){
    if(!(await podeEditar())){ toast('Só o administrador (ou quem gerencia os modelos) importa modelos.', 'error'); return; }
    E.imp = { linhas:[], aoTerminar:(o && o.aoTerminar) || null };
    var f = janela('meImportar',
      '<h3>Importar pasta de petições</h3>' +
      '<p class="me-sub">Arraste aqui a pasta com as suas petições (separadas por áreas e subpastas) ou escolha a pasta. Cada Word vira um modelo: a 1ª pasta é a área (ex.: Direito Tributário) e o resto do caminho é a subpasta. Tudo é lido aqui no seu computador; só o TEXTO dos modelos vai para o SAGA (os arquivos não sobem).</p>' +
      '<div class="me-solta" id="meSolta">Solte a pasta aqui<br><span style="font-size:12px">ou</span><br>' +
        '<button type="button" class="btn-secundario" id="meEscolher">Escolher pasta</button> <button type="button" class="btn-secundario" id="meEscolherArq">Escolher arquivos</button>' +
        '<input type="file" id="meInpPasta" webkitdirectory directory multiple hidden><input type="file" id="meInpArq" accept=".docx,.doc" multiple hidden></div>' +
      '<div id="meImpMsg"></div><div id="meImpLista"></div>' +
      '<div class="me-botoes"><button type="button" class="btn-secundario" id="meImpFechar">Fechar</button><button type="button" class="btn-confirmar-bib" id="meImpOk" disabled>Importar</button></div>');
    var solta = f.querySelector('#meSolta');
    f.querySelector('#meEscolher').onclick = function(){ f.querySelector('#meInpPasta').click(); };
    f.querySelector('#meEscolherArq').onclick = function(){ f.querySelector('#meInpArq').click(); };
    ['#meInpPasta','#meInpArq'].forEach(function(s){
      f.querySelector(s).onchange = function(){ var l = Array.prototype.map.call(this.files, function(x){ return { arquivo:x, caminho:x.webkitRelativePath || x.name }; }); receberArquivos(f, l); this.value = ''; };
    });
    solta.addEventListener('dragover', function(e){ e.preventDefault(); solta.classList.add('sobre'); });
    solta.addEventListener('dragleave', function(){ solta.classList.remove('sobre'); });
    solta.addEventListener('drop', async function(e){
      e.preventDefault(); solta.classList.remove('sobre');
      var itens = e.dataTransfer.items, lista = [];
      try{
        for(var i = 0; i < itens.length; i++){ var en = itens[i].webkitGetAsEntry && itens[i].webkitGetAsEntry(); if(en) await entradasDaPasta(en, '', lista); }
      }catch(err){ f.querySelector('#meImpMsg').innerHTML = '<div class="me-erro"><b>Erro ao abrir a pasta:</b> ' + esc(err.message || err) + '</div>'; return; }
      receberArquivos(f, lista);
    });
    f.querySelector('#meImpFechar').onclick = function(){ fechar(f); };
    f.querySelector('#meImpOk').onclick = async function(){
      var b = this, sel = E.imp.linhas.filter(function(l){ return l.incluir && l.blocos; }), novos = 0, iguais = 0, erros = [];
      b.disabled = true;
      var msg = f.querySelector('#meImpMsg');
      for(var i = 0; i < sel.length; i += 40){
        b.textContent = 'Importando ' + Math.min(i + 40, sel.length) + ' de ' + sel.length + '...';
        var lote = sel.slice(i, i + 40).map(function(l){
          return { titulo:l.titulo, area:l.area, subpasta:l.subpasta, arquivo_origem:l.nome, tipo_peca:'Petição', blocos:l.blocos, campos:l.campos };
        });
        var r = await sb().rpc('modelos_peticao_importar', { p_lista: lote });
        if(r.error){ erros.push({ arquivo:'lote ' + (i / 40 + 1), erro:r.error.message }); continue; }
        novos += r.data.novos; iguais += r.data.ja_existiam; erros = erros.concat(r.data.erros || []);
      }
      msg.innerHTML = '<div class="' + (erros.length ? 'me-amarelo' : 'me-ok') + '"><b>' + novos + ' modelo(s) importado(s)</b>' + (iguais ? ' · ' + iguais + ' já estavam no SAGA (mesmo arquivo na mesma pasta)' : '') +
        (erros.length ? '<br><b>Com erro (' + erros.length + '):</b> ' + erros.map(function(x){ return esc(x.arquivo) + ': ' + esc(x.erro); }).join('<br>') : '') +
        '<br>Eles aparecem na lista como "A revisar".</div>';
      b.textContent = 'Importado';
      if(E.imp.aoTerminar) try{ E.imp.aoTerminar(); }catch(e){}
    };
  }

  /* ================================================================
     EDITOR
     ================================================================ */
  function textoBloco(b){
    if(b.tipo === 'pedidos') return (b.itens || []).join('\n');
    if(b.tipo === 'citacao' && Array.isArray(b.texto)) return b.texto.join('\n');
    return b.texto || '';
  }
  function crescer(t){ t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  function htmlBloco(b, i){
    var sel = '<select data-me-tipo="' + i + '" aria-label="Tipo do bloco">' + TIPOS.map(function(t){ return '<option value="' + t[0] + '"' + (t[0] === b.tipo ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') +
      (TIPOS.some(function(t){ return t[0] === b.tipo; }) ? '' : '<option value="' + esc(b.tipo) + '" selected>' + esc(b.tipo) + '</option>') + '</select>';
    var meio;
    if(b.tipo === 'fecho') meio = '<div class="me-fecho"><input type="text" data-me-cidade="' + i + '" value="' + esc(b.cidade || '{cidade}') + '" aria-label="Cidade"><input type="text" data-me-data="' + i + '" value="' + esc(b.data || '{data}') + '" aria-label="Data"></div>';
    else if(SEM_TEXTO[b.tipo]) meio = '<div class="me-fixo">' + ({ assinatura:'(as assinaturas do timbrado escolhido)', branco:'(linha em branco)', quebra_pagina:'(começa nova página)' }[b.tipo]) + '</div>';
    else if(['enderecamento','autos','paragrafo','titulo_peca','topico','citacao','pedidos','destaque','linha_negrito'].indexOf(b.tipo) < 0) meio = '<div class="me-fixo">(bloco especial: ' + esc(b.tipo) + '; mantido como está)</div>';
    else meio = '<textarea rows="1" data-me-txt="' + i + '" placeholder="' + (b.tipo === 'pedidos' ? 'Um pedido por linha' : 'Escreva o texto') + '">' + esc(textoBloco(b)) + '</textarea>';
    return '<div class="me-bloco" data-tipo="' + esc(b.tipo) + '">' + sel + meio +
      '<div class="me-acoes-b"><button type="button" data-me-sobe="' + i + '" title="Subir" aria-label="Subir">▲</button><button type="button" data-me-desce="' + i + '" title="Descer" aria-label="Descer">▼</button>' +
      '<button type="button" data-me-novo="' + i + '" title="Novo bloco abaixo" aria-label="Novo bloco abaixo">＋</button><button type="button" data-me-tira="' + i + '" title="Tirar este bloco" aria-label="Tirar este bloco">✕</button></div></div>';
  }
  function lerFolha(f){
    f.querySelectorAll('[data-me-txt]').forEach(function(t){
      var b = E.blocos[+t.getAttribute('data-me-txt')]; if(!b) return;
      if(b.tipo === 'pedidos'){ b.itens = t.value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean); delete b.texto; }
      else { b.texto = t.value; delete b.itens; }
    });
    f.querySelectorAll('[data-me-cidade]').forEach(function(x){ E.blocos[+x.getAttribute('data-me-cidade')].cidade = x.value; });
    f.querySelectorAll('[data-me-data]').forEach(function(x){ E.blocos[+x.getAttribute('data-me-data')].data = x.value; });
  }
  function desenharFolha(f){
    var folha = f.querySelector('#meFolha');
    folha.innerHTML = E.blocos.length ? E.blocos.map(htmlBloco).join('') : '<div class="me-fixo">Modelo vazio: clique em "+ Bloco" para começar.</div>';
    folha.querySelectorAll('textarea').forEach(function(t){ crescer(t); t.addEventListener('input', function(){ crescer(t); }); t.addEventListener('focus', function(){ E.focoTxt = t; }); });
    if(f.classList.contains('me-so-ler')) folha.querySelectorAll('textarea,select,input').forEach(function(x){ x.disabled = true; });
    desenharCampos(f);
  }
  function desenharCampos(f){
    lerFolha(f);
    if(!f.querySelector('#meCampos')) return;
    var usados = camposUsados(E.blocos), mapa = {};
    E.campos.forEach(function(c){ mapa[c.chave] = c; });
    usados.forEach(function(c){ if(!mapa[c.chave]){ E.campos.push(c); mapa[c.chave] = c; } });
    var naoUsados = {}; E.campos.forEach(function(c){ naoUsados[c.chave] = !usados.some(function(u){ return u.chave === c.chave; }); });
    f.querySelector('#meCampos').innerHTML = E.campos.map(function(c, i){
      return '<div class="me-campo"><div><code>{' + esc(c.chave) + '}</code>' + (naoUsados[c.chave] ? ' <span style="font-size:10px;color:var(--muted)">(não usado)</span>' : '') +
        '<input type="text" data-me-rot="' + i + '" value="' + esc(c.rotulo || '') + '" aria-label="Nome do campo ' + esc(c.chave) + '"></div>' +
        '<button type="button" class="me-chip" data-me-ins="' + esc(c.chave) + '" title="Pôr este campo onde está o cursor">Inserir</button></div>';
    }).join('') || '<div class="me-sub">Nenhum campo ainda.</div>';
    f.querySelectorAll('[data-me-rot]').forEach(function(x){ x.addEventListener('input', function(){ E.campos[+x.getAttribute('data-me-rot')].rotulo = x.value; }); });
  }
  function inserirCampo(f, chave){
    var t = E.focoTxt;
    if(!t || !document.body.contains(t)){ toast('Clique primeiro no texto, no ponto onde o campo deve entrar.', 'info'); return; }
    var s = t.selectionStart, e = t.selectionEnd, v = t.value;
    t.value = v.slice(0, s) + '{' + chave + '}' + v.slice(e);
    t.focus(); t.selectionStart = t.selectionEnd = s + chave.length + 2; crescer(t);
    desenharCampos(f);
  }
  async function abrir(m, o){
    if(!(await podeEditar())){ toast('Só o administrador (ou quem gerencia os modelos) edita os modelos.', 'error'); return; }
    E.modelo = m || null; E.aoSalvar = (o && o.aoSalvar) || null; E.focoTxt = null;
    E.blocos = JSON.parse(JSON.stringify((m && m.blocos) || [{ tipo:'enderecamento', texto:'Ao Douto Juízo da {vara}' }, { tipo:'branco', n:2 }, { tipo:'autos', texto:'Autos nº {numero_processo}' }, { tipo:'branco', n:2 },
      { tipo:'paragrafo', texto:'**{cliente}**, {qualificacao}, por seus advogados infra-assinados, vem, respeitosamente, à presença de Vossa Excelência, apresentar' }, { tipo:'branco' },
      { tipo:'titulo_peca', texto:'{nome_peca}' }, { tipo:'branco' }, { tipo:'paragrafo', texto:'' }, { tipo:'branco' }, { tipo:'fecho', cidade:'{cidade}', data:'{data}' }, { tipo:'assinatura' }]));
    E.campos = JSON.parse(JSON.stringify((m && m.campos) || []));
    var ts = await teses();
    var f = janela('meEditor',
      '<h3>' + (m ? 'Editar modelo' : 'Novo modelo') + '</h3>' +
      '<p class="me-sub">Cada linha é um bloco da petição (o tipo fica à esquerda). Para o SAGA preencher sozinho, use campos entre chaves, ex.: <code>{cliente}</code>, <code>{numero_processo}</code>, <code>{qualificacao}</code>, <code>{vara}</code>. **nome** sai em negrito e versalete; __texto__ só em negrito. O papel timbrado é escolhido na hora de gerar (VMM, Sarmento; ANCREF só quando o Dr. Victor pedir).</p>' +
      (m && m.revisado === false ? '<div class="me-amarelo">Modelo importado: <b>confira se sobrou algum dado de cliente</b> no texto (nomes, valores, datas) e troque por campos. Depois marque "Revisado".</div>' : '') +
      '<div class="me-grade">' +
        '<div><label for="meTitulo">Título do modelo</label><input type="text" id="meTitulo" value="' + esc(m ? m.titulo : '') + '"></div>' +
        '<div><label for="meTipo">Tipo de peça</label><input type="text" id="meTipo" value="' + esc(m ? (m.tipo_peca || '') : 'Petição') + '" placeholder="Ex.: Impulso processual"></div>' +
        '<div><label for="meTese">Tese (opcional)</label><select id="meTese"><option value="">Modelo geral (todas as teses)</option>' + ts.map(function(t){ return '<option value="' + esc(t.id) + '"' + (m && m.tese_id === t.id ? ' selected' : '') + '>' + esc(t.nome) + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="meArea">Área</label><input type="text" id="meArea" value="' + esc(m ? (m.area || '') : '') + '" placeholder="Ex.: Direito Tributário"></div>' +
        '<div><label for="meSubpasta">Subpasta</label><input type="text" id="meSubpasta" value="' + esc(m ? (m.subpasta || '') : '') + '" placeholder="Ex.: Execução fiscal / Defesas"></div>' +
        '<div><label for="meTimbrado">Timbrado que vem escolhido</label><select id="meTimbrado"><option value="">Nenhum (escolher na hora)</option><option value="vmm"' + (m && m.timbrado_chave === 'vmm' ? ' selected' : '') + '>Victor Morais Advocacia</option><option value="sarmento"' + (m && m.timbrado_chave === 'sarmento' ? ' selected' : '') + '>Sarmento</option><option value="ancref"' + (m && m.timbrado_chave === 'ancref' ? ' selected' : '') + '>ANCREF (só quando o Dr. Victor pedir)</option></select></div>' +
        '<div style="grid-column:1/-1"><label for="meDesc">Descrição (quando usar)</label><input type="text" id="meDesc" value="' + esc(m ? (m.descricao || '') : '') + '"></div>' +
      '</div>' +
      '<div class="me-corpo"><div><div class="me-folha" id="meFolha"></div><div class="me-botoes" style="justify-content:flex-start"><button type="button" class="btn-secundario" id="meMaisBloco">+ Bloco no fim</button></div></div>' +
        '<div class="me-lado"><div class="me-caixa"><h4>Campos</h4><div class="me-campos" id="meCampos"></div>' +
          '<div style="display:flex;gap:6px;margin-top:8px"><input type="text" id="meNovoCampo" placeholder="novo_campo" aria-label="Nome do campo novo"><button type="button" class="me-chip" id="meAddCampo">+ Campo</button></div></div>' +
          '<div class="me-caixa"><label style="display:flex;gap:8px;align-items:center;font-size:12px"><input type="checkbox" id="meRevisado"' + (!m || m.revisado !== false ? ' checked' : '') + '> Revisado (pronto para usar)</label></div></div></div>' +
      '<div class="me-msg" id="meMsg"></div>' +
      '<div class="me-botoes">' + (m && window.sagaPodeApagar && sagaPodeApagar() ? '<button type="button" class="btn-perigo" id="meTirar" style="margin-right:auto">Tirar da lista</button>' : '') +
        '<button type="button" class="btn-secundario" id="meFechar">Fechar</button><button type="button" class="btn-secundario" id="meTeste">Baixar Word de teste</button><button type="button" class="btn-confirmar-bib" id="meSalvar">Salvar modelo</button></div>');
    desenharFolha(f);
    var folha = f.querySelector('#meFolha');
    folha.addEventListener('change', function(e){
      var s = e.target.closest('[data-me-tipo]'); if(!s) return;
      lerFolha(f); var b = E.blocos[+s.getAttribute('data-me-tipo')], novo = s.value;
      if(novo === 'pedidos'){ b.itens = String(b.texto || '').split('\n').filter(Boolean); delete b.texto; }
      else if(b.tipo === 'pedidos'){ b.texto = (b.itens || []).join('\n'); delete b.itens; }
      if(novo === 'fecho'){ b.cidade = b.cidade || '{cidade}'; b.data = b.data || '{data}'; }
      b.tipo = novo; desenharFolha(f);
    });
    folha.addEventListener('click', function(e){
      var b = e.target.closest('[data-me-sobe],[data-me-desce],[data-me-novo],[data-me-tira]'); if(!b) return;
      lerFolha(f);
      var i = +(b.getAttribute('data-me-sobe') || b.getAttribute('data-me-desce') || b.getAttribute('data-me-novo') || b.getAttribute('data-me-tira'));
      if(b.hasAttribute('data-me-sobe') && i > 0){ var x = E.blocos.splice(i, 1)[0]; E.blocos.splice(i - 1, 0, x); }
      else if(b.hasAttribute('data-me-desce') && i < E.blocos.length - 1){ var y = E.blocos.splice(i, 1)[0]; E.blocos.splice(i + 1, 0, y); }
      else if(b.hasAttribute('data-me-novo')) E.blocos.splice(i + 1, 0, { tipo:'paragrafo', texto:'' });
      else if(b.hasAttribute('data-me-tira')) E.blocos.splice(i, 1);
      desenharFolha(f);
      if(b.hasAttribute('data-me-novo')){ var t = f.querySelector('[data-me-txt="' + (i + 1) + '"]'); if(t) t.focus(); }
    });
    folha.addEventListener('input', function(e){ if(e.target.matches('textarea')){ clearTimeout(E._t); E._t = setTimeout(function(){ desenharCampos(f); }, 500); } });
    f.querySelector('#meCampos').addEventListener('click', function(e){ var b = e.target.closest('[data-me-ins]'); if(b) inserirCampo(f, b.getAttribute('data-me-ins')); });
    f.querySelector('#meCampos').addEventListener('mousedown', function(e){ if(e.target.closest('[data-me-ins]')) e.preventDefault(); });
    f.querySelector('#meAddCampo').onclick = function(){
      var v = f.querySelector('#meNovoCampo').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if(!v){ toast('Escreva o nome do campo (ex.: valor_da_causa).', 'info'); return; }
      if(!E.campos.some(function(c){ return c.chave === v; })) E.campos.push({ chave:v, rotulo:v.replace(/_/g, ' ').replace(/^./, function(c){ return c.toUpperCase(); }) });
      f.querySelector('#meNovoCampo').value = ''; desenharCampos(f); inserirCampo(f, v);
    };
    f.querySelector('#meMaisBloco').onclick = function(){ lerFolha(f); E.blocos.push({ tipo:'paragrafo', texto:'' }); desenharFolha(f); var t = f.querySelector('[data-me-txt="' + (E.blocos.length - 1) + '"]'); if(t) t.focus(); };
    f.querySelector('#meFechar').onclick = function(){ fechar(f); };
    f.querySelector('#meTeste').onclick = function(){ testar(f, this); };
    f.querySelector('#meSalvar').onclick = function(){ salvar(f, this); };
    var tira = f.querySelector('#meTirar');
    if(tira) tira.onclick = async function(){
      var ok = window.sagaConfirmar ? await sagaConfirmar('Tirar o modelo da lista', 'O modelo "' + (m.titulo || '') + '" some da lista, mas fica guardado no banco.', 'Tirar da lista', true) : confirm('Tirar da lista?');
      if(!ok) return;
      var r = await sb().rpc('modelo_peticao_desativar', { p_id: m.id });
      if(r.error){ f.querySelector('#meMsg').innerHTML = '<div class="me-erro"><b>Não consegui tirar:</b> ' + esc(r.error.message) + '</div>'; return; }
      fechar(f); toast('Modelo tirado da lista.', 'success'); if(E.aoSalvar) E.aoSalvar();
    };
  }
  function dadosDoForm(f){
    lerFolha(f);
    var blocos = E.blocos.filter(function(b){ return !(b.tipo === 'paragrafo' && !String(b.texto || '').trim()); });
    var usados = camposUsados(blocos).map(function(c){ return c.chave; });
    return { titulo:f.querySelector('#meTitulo').value.trim(), tipo_peca:f.querySelector('#meTipo').value.trim(), tese_id:f.querySelector('#meTese').value || null,
      area:f.querySelector('#meArea').value.trim(), subpasta:f.querySelector('#meSubpasta').value.trim(), timbrado_chave:f.querySelector('#meTimbrado').value || null,
      descricao:f.querySelector('#meDesc').value.trim(), revisado:f.querySelector('#meRevisado').checked,
      blocos:blocos, campos:E.campos.filter(function(c){ return usados.indexOf(c.chave) >= 0; }) };
  }
  async function salvar(f, b){
    var d = dadosDoForm(f), msg = f.querySelector('#meMsg');
    if(!d.titulo){ msg.innerHTML = '<div class="me-erro">Dê um título ao modelo.</div>'; return; }
    if(!d.blocos.length){ msg.innerHTML = '<div class="me-erro">O modelo está vazio.</div>'; return; }
    b.disabled = true; var t = b.textContent; b.textContent = 'Salvando...';
    var r = await sb().rpc('modelo_peticao_salvar', { p_id: E.modelo ? E.modelo.id : null, p_dados: d });
    b.disabled = false; b.textContent = t;
    if(r.error){ msg.innerHTML = '<div class="me-erro"><b>Não consegui salvar:</b> ' + esc(r.error.message) + '</div>'; return; }
    E.modelo = Object.assign({}, E.modelo || {}, d, { id: r.data.id });
    msg.innerHTML = '<div class="me-ok">Modelo salvo.</div>';
    if(E.aoSalvar) try{ E.aoSalvar(); }catch(e){}
  }
  async function testar(f, b){
    var d = dadosDoForm(f), msg = f.querySelector('#meMsg');
    if(!window.SagaTimbrado){ msg.innerHTML = '<div class="me-erro">O gerador de petições não carregou nesta tela (atualize com F5).</div>'; return; }
    b.disabled = true; var t = b.textContent; b.textContent = 'Gerando...';
    try{
      var ts = await SagaTimbrado.listar(sb());
      var tim = ts.filter(function(x){ return x.chave === (d.timbrado_chave || 'vmm'); })[0] || ts[0];
      var r = await SagaTimbrado.gerar({ sb: sb(), timbrado: tim, modelo: { titulo: d.titulo, campos: d.campos, blocos: d.blocos }, valores: {}, formato: 'docx', realce: true });
      SagaTimbrado.baixar(r.bytes, SagaTimbrado.nomeArquivo('Teste - ' + (d.titulo || 'modelo')) + '.docx', r.tipo);
      msg.innerHTML = '<div class="me-ok">Word de teste baixado (os campos saem destacados em amarelo).' + (r.avisos && r.avisos.length ? '<br>' + r.avisos.map(esc).join('<br>') : '') + '</div>';
    }catch(e){ msg.innerHTML = '<div class="me-erro"><b>Não consegui gerar o Word:</b> ' + esc((e && e.message) || e) + '</div>'; }
    b.disabled = false; b.textContent = t;
  }

  /* ================================================================
     TEXTO DE UMA PETIÇÃO PRONTA (20/11, Dr. Victor): a petição da Renata
     chega como texto; quem aprova lê e corrige aqui (cada salvar = versão nova).
     o = { titulo, sub, intro (texto de ajuda no lugar do parágrafo padrão, 21/11), aviso, blocos, podeCorrigir, versoes, aoSalvar(blocos) -> Promise, aoPrevia(blocos) -> Promise }
     ================================================================ */
  function abrirTexto(o){
    E.blocos = JSON.parse(JSON.stringify(o.blocos || [])); E.campos = []; E.focoTxt = null; E.aoSalvar = null;
    var pode = !!o.podeCorrigir;
    var f = janela('meTexto',
      '<h3>' + esc(o.titulo || 'Petição') + '</h3>' +
      '<p class="me-sub">' + (o.sub ? o.sub + '<br>' : '') + (o.intro ? esc(o.intro) : pode
        ? 'Leia e corrija direto aqui: cada linha é um parágrafo da petição (o tipo fica à esquerda). O que a Renata não achou na ficha aparece entre <b>⟦[ ]⟧</b>: troque pelo dado certo. **nome** sai em negrito e versalete; __texto__ só em negrito. "Salvar correções" grava uma versão nova; o Word e o PDF finais saem do texto quando você aprovar.'
        : 'Só leitura: a petição já foi decidida.') + '</p>' +
      (o.aviso ? '<div class="me-amarelo">' + o.aviso + '</div>' : '') +
      '<div class="me-folha" id="meFolha"></div>' +
      '<div class="me-botoes" style="justify-content:flex-start"><button type="button" class="btn-secundario" id="meMaisBloco">+ Parágrafo no fim</button></div>' +
      (o.versoes && o.versoes.length ? '<div class="me-versoes"><b>Versões:</b> ' + o.versoes.map(function(v){
        return 'v' + esc(v.versao) + ' ' + esc(v.origem === 'renata' ? 'Renata' : (v.por || '')) + (v.em ? ' em ' + esc(new Date(v.em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })) : '');
      }).join(' · ') + '</div>' : '') +
      '<div class="me-msg" id="meMsg"></div>' +
      '<div class="me-botoes"><button type="button" class="btn-secundario" id="meFechar">Fechar</button>' +
        (o.aoVer ? '<button type="button" class="btn-secundario" id="meVer">Ver como vai sair</button>' : '') +
        (o.aoPrevia ? '<button type="button" class="btn-secundario" id="mePrevia">Prévia em Word</button>' : '') +
        (pode ? '<button type="button" class="btn-confirmar-bib" id="meSalvar">Salvar correções</button>' : '') + '</div>');
    f.classList.toggle('me-so-ler', !pode);
    desenharFolha(f);
    var folha = f.querySelector('#meFolha'), mudou = false;
    folha.onchange = function(e){
      var s = e.target.closest('[data-me-tipo]'); if(!s) return;
      lerFolha(f); var b = E.blocos[+s.getAttribute('data-me-tipo')], novo = s.value;
      if(novo === 'pedidos'){ b.itens = String(b.texto || '').split('\n').filter(Boolean); delete b.texto; }
      else if(b.tipo === 'pedidos'){ b.texto = (b.itens || []).join('\n'); delete b.itens; }
      if(novo === 'fecho'){ b.cidade = b.cidade || 'Maceió/AL'; b.data = b.data || ''; }
      b.tipo = novo; mudou = true; desenharFolha(f);
    };
    folha.onclick = function(e){
      var b = e.target.closest('[data-me-sobe],[data-me-desce],[data-me-novo],[data-me-tira]'); if(!b) return;
      lerFolha(f); mudou = true;
      var i = +(b.getAttribute('data-me-sobe') || b.getAttribute('data-me-desce') || b.getAttribute('data-me-novo') || b.getAttribute('data-me-tira'));
      if(b.hasAttribute('data-me-sobe') && i > 0){ var x = E.blocos.splice(i, 1)[0]; E.blocos.splice(i - 1, 0, x); }
      else if(b.hasAttribute('data-me-desce') && i < E.blocos.length - 1){ var y = E.blocos.splice(i, 1)[0]; E.blocos.splice(i + 1, 0, y); }
      else if(b.hasAttribute('data-me-novo')) E.blocos.splice(i + 1, 0, { tipo:'paragrafo', texto:'' });
      else if(b.hasAttribute('data-me-tira')) E.blocos.splice(i, 1);
      desenharFolha(f);
      if(b.hasAttribute('data-me-novo')){ var t = f.querySelector('[data-me-txt="' + (i + 1) + '"]'); if(t) t.focus(); }
    };
    folha.oninput = function(){ mudou = true; };
    f.querySelector('#meMaisBloco').onclick = function(){ lerFolha(f); mudou = true; E.blocos.push({ tipo:'paragrafo', texto:'' }); desenharFolha(f); var t = f.querySelector('[data-me-txt="' + (E.blocos.length - 1) + '"]'); if(t) t.focus(); };
    function blocosAtuais(){ lerFolha(f); return E.blocos.filter(function(b){ return !(b.tipo === 'paragrafo' && !String(b.texto || '').trim()); }); }
    f.querySelector('#meFechar').onclick = async function(){
      if(pode && mudou){
        var ok = window.sagaConfirmar ? await sagaConfirmar('Fechar sem salvar?', 'As correções feitas agora se perdem.', 'Fechar sem salvar', true) : confirm('Fechar sem salvar as correções?');
        if(!ok) return;
      }
      fechar(f);
    };
    var vv = f.querySelector('#meVer');
    if(vv) vv.onclick = function(){ o.aoVer(blocosAtuais()); };
    var pv = f.querySelector('#mePrevia');
    if(pv) pv.onclick = async function(){
      var msg = f.querySelector('#meMsg'); pv.disabled = true; var t = pv.textContent; pv.textContent = 'Gerando...';
      try{ await o.aoPrevia(blocosAtuais()); msg.innerHTML = '<div class="me-ok">Prévia baixada (não vai para a pasta do cliente).</div>'; }
      catch(e){ msg.innerHTML = '<div class="me-erro"><b>Não consegui gerar a prévia:</b> ' + esc((e && e.message) || e) + '</div>'; }
      pv.disabled = false; pv.textContent = t;
    };
    var sv = f.querySelector('#meSalvar');
    if(sv) sv.onclick = async function(){
      var msg = f.querySelector('#meMsg'), bl = blocosAtuais();
      if(!bl.length){ msg.innerHTML = '<div class="me-erro">O texto ficou vazio.</div>'; return; }
      sv.disabled = true; var t = sv.textContent; sv.textContent = 'Salvando...';
      try{
        var r = await o.aoSalvar(bl);
        mudou = false;
        msg.innerHTML = '<div class="me-ok">' + (r && r.sem_mudanca ? 'Nada mudou: o texto continua na versão ' + esc(r.versao) + '.' : 'Correções salvas (versão ' + esc(r && r.versao) + '). O Word final sai deste texto quando você aprovar.') + '</div>';
      }catch(e){ msg.innerHTML = '<div class="me-erro"><b>Não consegui salvar:</b> ' + esc((e && e.message) || e) + '</div>'; }
      sv.disabled = false; sv.textContent = t;
    };
    return f;
  }

  return { abrir: abrir, abrirTexto: abrirTexto, importar: importar, podeEditar: podeEditar, _interno: { paragrafos: paragrafos, blocosDoWord: blocosDoWord } };
})();
