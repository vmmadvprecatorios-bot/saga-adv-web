/* SAGA · Texto formatado (negrito, itálico, sublinhado, destaque, lista), com parágrafos e texto justificado.
   Serve para qualquer campo de texto livre do sistema (comentários, descrições, observações).
   Uso:
     SagaTexto.ligar(textarea)   -> troca o campo por um editor com barra de formatação; o campo original
                                    continua existindo e .value passa a ler/gravar o texto formatado,
                                    então o código que já usa textarea.value segue funcionando.
     SagaTexto.html(conteudo)    -> devolve o HTML seguro para MOSTRAR um texto salvo (aceita texto antigo, sem formatação).
     SagaTexto.ligarTodos(raiz)  -> liga todos os campos marcados com data-saga-texto.
   O que é salvo: HTML simples e limpo (<p>, <b>, <i>, <u>, <mark>, <ul>, <ol>, <li>, <br>). Nada além disso passa. */
(function(global){
  'use strict';
  var PERMITIDAS={B:'b',STRONG:'b',I:'i',EM:'i',U:'u',MARK:'mark',BR:'br',P:'p',DIV:'p',UL:'ul',OL:'ol',LI:'li'};
  var BLOCOS={p:1,ul:1,ol:1};
  // cores do marca-texto (como no Word): amarelo é a padrão
  var PALETA=[['amarelo','#f5c542','Amarelo'],['verde','#6fcf7f','Verde'],['azul','#5bc0eb','Azul'],['rosa','#f78fb3','Rosa'],['laranja','#f59e42','Laranja'],['roxo','#b69cf0','Roxo'],['vermelho','#f2706b','Vermelho'],['cinza','#b0b7c3','Cinza']];
  function rgbDe(txt){
    var m=/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(txt);if(m)return [+m[1],+m[2],+m[3]];
    m=/#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(txt);if(!m)return null;var h=m[1];if(h.length===3)h=h.replace(/./g,'$&$&');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  function nomeDaCor(txt){
    var c=rgbDe(txt);if(!c)return 'amarelo';var melhor='amarelo',dist=1e9;
    PALETA.forEach(function(p){var q=rgbDe(p[1]),d=Math.pow(c[0]-q[0],2)+Math.pow(c[1]-q[1],2)+Math.pow(c[2]-q[2],2);if(d<dist){dist=d;melhor=p[0];}});
    return melhor;
  }
  function corValida(n){return PALETA.some(function(p){return p[0]===n;});}
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  // ---------- limpeza: só as marcas permitidas, sem atributos ----------
  function limparNo(no,saida){
    no.childNodes.forEach(function(f){
      if(f.nodeType===3){saida.appendChild(document.createTextNode(f.nodeValue.replace(/\u00a0/g,' ')));return;}
      if(f.nodeType!==1)return;
      var tag=f.tagName,alvo=PERMITIDAS[tag];
      // destaque feito pelo navegador vira <mark>; negrito/itálico/sublinhado em estilo também são reconhecidos
      if(tag==='SPAN'||tag==='FONT'){
        var st=(f.getAttribute('style')||'').toLowerCase(),env=null;
        if(/background(-color)?\s*:\s*(?!transparent|rgba\(0,\s*0,\s*0,\s*0\)|initial|inherit|rgb\(255,\s*255,\s*255\))/.test(st))env='mark';
        else if(/font-weight\s*:\s*(bold|[6-9]00)/.test(st))env='b';
        else if(/font-style\s*:\s*italic/.test(st))env='i';
        else if(/text-decoration[^;]*underline/.test(st))env='u';
        if(env){var n=document.createElement(env);if(env==='mark')n.setAttribute('data-c',nomeDaCor(st));limparNo(f,n);if(n.childNodes.length)saida.appendChild(n);}
        else limparNo(f,saida);
        return;
      }
      if(!alvo){ if(!/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|NOSCRIPT|TEMPLATE)$/.test(tag))limparNo(f,saida); return; }
      var novo=document.createElement(alvo);
      if(alvo==='mark'&&corValida(f.getAttribute('data-c')))novo.setAttribute('data-c',f.getAttribute('data-c'));
      if(alvo!=='br')limparNo(f,novo);
      saida.appendChild(novo);
    });
  }
  // garante que tudo fique dentro de parágrafos/listas
  function emBlocos(raiz){
    var fim=document.createElement('div'),atual=null;
    Array.from(raiz.childNodes).forEach(function(f){
      var tag=f.nodeType===1?f.tagName.toLowerCase():'';
      if(BLOCOS[tag]){atual=null;fim.appendChild(f);}
      else{if(!atual){atual=document.createElement('p');fim.appendChild(atual);}atual.appendChild(f);}
    });
    // <p> dentro de <li> ou <p> dentro de <p> viram quebra de linha
    fim.querySelectorAll('li p, p p').forEach(function(p){var pai=p.parentNode;while(p.firstChild)pai.insertBefore(p.firstChild,p);pai.insertBefore(document.createElement('br'),p);p.remove();});
    fim.querySelectorAll('p').forEach(function(p){if(!p.childNodes.length)p.appendChild(document.createElement('br'));});
    return fim;
  }
  function limpar(html){
    var t=document.createElement('template');t.innerHTML=html;
    var saida=document.createElement('div');limparNo(t.content,saida);
    return emBlocos(saida).innerHTML;
  }
  function textoDoHtml(html){var d=document.createElement('div');d.innerHTML=html;return (d.textContent||'').replace(/ /g,' ').trim();}
  function ehFormatado(s){return /^\s*<(p|ul|ol)[\s>]/i.test(String(s||''));}
  // texto simples (comentários antigos): cada linha vira um parágrafo; o espaço entre parágrafos vem do estilo
  function deTextoSimples(s){
    return String(s==null?'':s).replace(/\r\n?/g,'\n').split('\n').filter(function(l){return l.trim()!=='';}).map(function(l){return '<p>'+esc(l)+'</p>';}).join('');
  }
  function paraHtml(conteudo){return ehFormatado(conteudo)?limpar(conteudo):deTextoSimples(conteudo);}
  // destaca @menções dentro do texto já limpo
  function comMencoes(html){
    var d=document.createElement('div');d.innerHTML=html;
    var w=document.createTreeWalker(d,NodeFilter.SHOW_TEXT),nos=[];while(w.nextNode())nos.push(w.currentNode);
    nos.forEach(function(n){
      if(!/@[A-Za-zÀ-ÿ]/.test(n.nodeValue))return;
      if(global.SagaMencoes){var tp=document.createElement('template');tp.innerHTML=global.SagaMencoes.destacar(n.nodeValue);n.parentNode.replaceChild(tp.content,n);return;}
      var partes=n.nodeValue.split(/(@[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ. ]*[A-Za-zÀ-ÿ])/),frag=document.createDocumentFragment();
      partes.forEach(function(p,i){if(i%2){var s=document.createElement('span');s.className='mencao';s.textContent=p;frag.appendChild(s);}else if(p)frag.appendChild(document.createTextNode(p));});
      n.parentNode.replaceChild(frag,n);
    });
    return d.innerHTML;
  }
  function mostrar(conteudo){return '<div class="saga-texto">'+comMencoes(paraHtml(conteudo))+'</div>';}

  // ---------- estilo (uma vez só) ----------
  function estilos(){
    if(document.getElementById('sagaTextoCss'))return;
    var s=document.createElement('style');s.id='sagaTextoCss';
    s.textContent=[
      '.saga-texto{text-align:justify;text-justify:inter-word;hyphens:auto;overflow-wrap:anywhere}',
      '.saga-texto p{margin:0 0 .6em}.saga-texto p:last-child{margin-bottom:0}',
      '.saga-texto ul,.saga-texto ol{margin:0 0 .6em;padding-left:1.4em}.saga-texto li{margin:.1em 0}',
      '.saga-texto mark,.saga-editor-area mark{background:color-mix(in srgb,#f5c542 32%,transparent);color:inherit;padding:0 2px;border-radius:3px}',
      PALETA.map(function(p){return '.saga-texto mark[data-c="'+p[0]+'"],.saga-editor-area mark[data-c="'+p[0]+'"]{background:color-mix(in srgb,'+p[1]+' 32%,transparent)}';}).join('\n'),
      // marca-texto: menu suspenso que abre abaixo do botão A (antes era uma faixa de bolinhas exposta)
      '.saga-editor{position:relative}',
      '.saga-mtcores{display:none;position:absolute;z-index:60;min-width:138px;padding:5px;border:1px solid var(--border);border-radius:11px;background:var(--panel-solid,var(--panel));box-shadow:0 14px 34px rgba(0,0,0,.28);flex-direction:column;gap:1px}.saga-mtcores.aberto{display:flex}',
      '.saga-mtcores button{display:flex;align-items:center;gap:8px;width:100%;padding:4px 8px;border:0;border-radius:7px;background:transparent;color:var(--text);font:inherit;font-size:11.5px;text-align:left;cursor:pointer}.saga-mtcores button:hover,.saga-mtcores button:focus-visible{background:color-mix(in srgb,var(--text) 8%,transparent);outline:0}',
      '.saga-mtcores button i{width:9px;height:9px;border-radius:50%;flex:0 0 auto;opacity:.75;box-shadow:inset 0 0 0 1px rgba(127,127,127,.25)}.saga-mtcores .sem{margin-top:3px;border-top:1px solid var(--border-soft);border-radius:0 0 7px 7px;color:var(--muted)}.saga-mtcores .sem i{background:transparent;position:relative;overflow:hidden}.saga-mtcores .sem i::after{content:"";position:absolute;left:-2px;right:-2px;top:50%;height:1.5px;background:var(--muted);transform:rotate(-45deg)}',
      '.saga-editor{width:100%;border:1px solid var(--border-soft);border-radius:11px;background:color-mix(in srgb,var(--text) 4%,transparent);overflow:visible}',
      '.saga-editor:focus-within{border-color:var(--gold)}',
      '.saga-editor-barra{border-radius:10px 10px 0 0;display:flex;flex-wrap:wrap;gap:3px;padding:5px 6px;border-bottom:1px solid var(--border-soft);background:color-mix(in srgb,var(--text) 3%,transparent)}',
      '.saga-editor-barra button{min-width:28px;height:26px;padding:0 7px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--text);font:inherit;font-size:12px;cursor:pointer;line-height:1}',
      '.saga-editor-barra button:hover{background:color-mix(in srgb,var(--gold) 12%,transparent);border-color:color-mix(in srgb,var(--gold) 30%,transparent)}',
      '.saga-editor-barra button.ligado{background:color-mix(in srgb,var(--gold) 20%,transparent);border-color:var(--gold)}',
      '.saga-editor-barra .sep{width:1px;background:var(--border-soft);margin:3px 3px}',
      '.saga-editor-area{min-height:76px;max-height:340px;overflow-y:auto;padding:10px 13px;outline:0;color:var(--text);font:inherit;font-size:11.5px;line-height:1.55;text-align:justify;text-justify:inter-word;hyphens:auto;overflow-wrap:anywhere}',
      '.saga-editor-area p{margin:0 0 .6em}.saga-editor-area p:last-child{margin-bottom:0}.saga-editor-area ul,.saga-editor-area ol{margin:0 0 .6em;padding-left:1.4em}',
      '.saga-editor-area:empty::before{content:attr(data-ph);color:var(--muted);pointer-events:none}',
      '.saga-editor-area .mencao{padding:1px 5px;border-radius:5px;background:color-mix(in srgb,var(--gold) 13%,transparent);color:var(--gold-light);font-weight:700}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- o editor ----------
  var BOTOES=[['bold','<b>N</b>','Negrito (Ctrl+B)'],['italic','<i>I</i>','Itálico (Ctrl+I)'],['underline','<u>S</u>','Sublinhado (Ctrl+U)'],['destaque','<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1">A<i style="display:block;width:11px;height:2px;margin-top:1px;border-radius:2px;background:#d9b95a;opacity:.8"></i></span>','Destacar (marca-texto)'],'|',['insertUnorderedList','• Lista','Lista com marcadores'],['insertOrderedList','1. Lista','Lista numerada'],'|',['limpar','Tx','Tirar a formatação']];
  // Tira o marca-texto do trecho selecionado (ou do destaque onde está o cursor), sem mexer no resto do texto
  function removerDestaque(area){
    var sel=global.getSelection();if(!sel||!sel.rangeCount)return;
    var r=sel.getRangeAt(0);if(!area.contains(r.commonAncestorContainer))return;
    var alvos=Array.prototype.filter.call(area.querySelectorAll('mark,span[style*="background"]'),function(m){
      try{return r.collapsed?m.contains(r.startContainer):r.intersectsNode(m);}catch(e){return false;}
    });
    var ultimo=null,primeiro=null;
    alvos.forEach(function(m){
      var mr=document.createRange();mr.selectNodeContents(m);
      var ini=(!r.collapsed&&r.compareBoundaryPoints(Range.START_TO_START,mr)>0)?r.startContainer:null,fim=null;
      var a=document.createRange(),meio=document.createRange(),d=document.createRange();
      var cortaIni=!r.collapsed&&r.compareBoundaryPoints(Range.START_TO_START,mr)>0,cortaFim=!r.collapsed&&r.compareBoundaryPoints(Range.END_TO_END,mr)<0;
      var pIni=cortaIni?[r.startContainer,r.startOffset]:[mr.startContainer,mr.startOffset],pFim=cortaFim?[r.endContainer,r.endOffset]:[mr.endContainer,mr.endOffset];
      a.setStart(mr.startContainer,mr.startOffset);a.setEnd(pIni[0],pIni[1]);
      meio.setStart(pIni[0],pIni[1]);meio.setEnd(pFim[0],pFim[1]);
      d.setStart(pFim[0],pFim[1]);d.setEnd(mr.endContainer,mr.endOffset);
      var fa=a.cloneContents(),fm=meio.cloneContents(),fd=d.cloneContents();
      var blocos=document.createDocumentFragment(),aM=null,dM=null;
      if(fa.textContent.length){aM=m.cloneNode(false);aM.appendChild(fa);blocos.appendChild(aM);}
      var marc=document.createComment('');var nosMeio=Array.prototype.slice.call(fm.childNodes);
      blocos.appendChild(fm);
      if(fd.textContent.length){dM=m.cloneNode(false);dM.appendChild(fd);blocos.appendChild(dM);}
      if(!primeiro&&nosMeio.length)primeiro=nosMeio[0];if(nosMeio.length)ultimo=nosMeio[nosMeio.length-1];
      m.parentNode.replaceChild(blocos,m);
    });
    if(primeiro&&ultimo&&primeiro.parentNode&&ultimo.parentNode){
      try{var nr=document.createRange();nr.setStartBefore(primeiro);nr.setEndAfter(ultimo);sel.removeAllRanges();sel.addRange(nr);}catch(e){}
    }
    area.normalize();
  }
  function ligar(campo){
    if(!campo||campo._sagaTexto)return campo&&campo._sagaTexto;
    estilos();
    var ph=campo.getAttribute('placeholder')||'';
    var cx=document.createElement('div');cx.className='saga-editor';
    var barra=document.createElement('div');barra.className='saga-editor-barra';
    var area=document.createElement('div');area.className='saga-editor-area';area.contentEditable='true';area.setAttribute('role','textbox');area.setAttribute('aria-multiline','true');area.setAttribute('data-ph',ph);
    if(campo.getAttribute('aria-label'))area.setAttribute('aria-label',campo.getAttribute('aria-label'));
    else if(campo.id){var lb=document.querySelector('label[for="'+campo.id+'"]');if(lb){area.setAttribute('aria-label',lb.textContent.trim());lb.addEventListener('click',function(){area.focus();});}}
    BOTOES.forEach(function(b){
      if(b==='|'){var s=document.createElement('span');s.className='sep';barra.appendChild(s);return;}
      var btn=document.createElement('button');btn.type='button';btn.innerHTML=b[1];btn.title=b[2];btn.setAttribute('aria-label',b[2]);btn.dataset.cmd=b[0];
      btn.addEventListener('mousedown',function(e){e.preventDefault();}); // não tira o cursor do texto
      btn.addEventListener('click',function(){if(b[0]==='destaque'){alternarCores(btn);return;}comando(b[0]);area.focus();estado();});
      barra.appendChild(btn);
    });
    var faixa=document.createElement('div');faixa.className='saga-mtcores';faixa.setAttribute('role','group');faixa.setAttribute('aria-label','Cores do marca-texto');
    PALETA.forEach(function(p){
      var c=document.createElement('button');c.type='button';c.innerHTML='<i style="background:'+p[1]+'"></i>'+p[2];c.setAttribute('aria-label','Marca-texto '+p[2]);
      c.addEventListener('mousedown',function(e){e.preventDefault();});
      c.addEventListener('click',function(){try{removerDestaque(area);document.execCommand('hiliteColor',false,p[1]);}catch(e){}fecharCores();area.focus();estado();area.dispatchEvent(new Event('input',{bubbles:true}));});
      faixa.appendChild(c);
    });
    var sem=document.createElement('button');sem.type='button';sem.className='sem';sem.innerHTML='<i></i>Sem cor';
    sem.addEventListener('mousedown',function(e){e.preventDefault();});
    sem.addEventListener('click',function(){try{removerDestaque(area);}catch(e){}fecharCores();area.focus();estado();area.dispatchEvent(new Event('input',{bubbles:true}));});
    faixa.appendChild(sem);
    cx.appendChild(barra);cx.appendChild(faixa);cx.appendChild(area);
    // abre o menu de cores logo abaixo do botão A, com movimento suave (respeita "efeitos de movimento")
    function alternarCores(btn){
      if(faixa.classList.contains('aberto')){fecharCores();return;}
      // o menu flutua por cima da página (não é cortado pelo cartão nem invade o bloco de baixo) e abre para cima quando falta espaço
      if(faixa.parentNode!==document.body)document.body.appendChild(faixa);
      faixa.style.position='fixed';faixa.style.zIndex='5000';faixa.style.visibility='hidden';
      faixa.classList.add('aberto');
      var bx=btn.getBoundingClientRect(),w=faixa.offsetWidth,h=faixa.offsetHeight;
      var acima=bx.bottom+4+h>window.innerHeight-8&&bx.top-4-h>8;
      faixa.style.left=Math.max(8,Math.min(bx.left,window.innerWidth-w-8))+'px';
      faixa.style.top=(acima?bx.top-4-h:Math.min(bx.bottom+4,window.innerHeight-h-8))+'px';
      faixa.style.visibility='';
      var calmo=window.sagaMq&&window.sagaMq().matches;
      // a abertura e o fechamento são animados pelo saga_guard.js (animar aqui também dobrava o efeito)
      setTimeout(function(){document.addEventListener('mousedown',foraCores,true);document.addEventListener('keydown',escCores,true);window.addEventListener('scroll',fecharCores,true);window.addEventListener('resize',fecharCores);},0);
    }
    function fecharCores(e){if(e&&e.type==='scroll'&&faixa.contains(e.target))return;faixa.classList.remove('aberto');document.removeEventListener('mousedown',foraCores,true);document.removeEventListener('keydown',escCores,true);window.removeEventListener('scroll',fecharCores,true);window.removeEventListener('resize',fecharCores);}
    function foraCores(e){if(!faixa.contains(e.target)&&!(e.target.closest&&e.target.closest('[data-cmd="destaque"]')))fecharCores();}
    function escCores(e){if(e.key==='Escape'){e.stopPropagation();fecharCores();area.focus();}}
    campo.style.display='none';campo.parentNode.insertBefore(cx,campo.nextSibling);
    function comando(c){
      try{
        if(c==='destaque'){
          var sel=global.getSelection(),pai=sel&&sel.anchorNode&&(sel.anchorNode.nodeType===1?sel.anchorNode:sel.anchorNode.parentNode);
          var jaMarcado=pai&&pai.closest&&pai.closest('mark');
          if(jaMarcado)removerDestaque(area);else document.execCommand('hiliteColor',false,'#f5c542');
        }else if(c==='limpar'){document.execCommand('removeFormat');removerDestaque(area);}
        else document.execCommand(c,false,null);
      }catch(e){}
    }
    function estado(){
      barra.querySelectorAll('button[data-cmd]').forEach(function(b){
        var c=b.dataset.cmd,lig=false;
        try{if(c==='destaque'){var sel=global.getSelection(),n=sel&&sel.anchorNode;var p=n&&(n.nodeType===1?n:n.parentNode);lig=!!(p&&p.closest&&area.contains(p)&&p.closest('mark'));}
            else if(c!=='limpar')lig=document.queryCommandState(c);}catch(e){}
        b.classList.toggle('ligado',!!lig);
      });
    }
    try{document.execCommand('defaultParagraphSeparator',false,'p');}catch(e){}
    function ler(){
      var h=limpar(area.innerHTML).replace(/^(<p><br><\/p>)+|(<p><br><\/p>)+$/g,'');
      return textoDoHtml(h)?h:'';
    }
    function definir(v){area.innerHTML=(v==null||v==='')?'':paraHtml(v);}
    // o campo original passa a refletir o editor (código antigo continua lendo e gravando .value)
    Object.defineProperty(campo,'value',{configurable:true,get:ler,set:definir});
    campo.focus=function(){area.focus();};
    campo._sagaTexto={leitura:function(b){area.contentEditable=b?'false':'true';barra.style.display=b?'none':'';if(b)faixa.classList.remove('aberto');},area:area,caixa:cx,inserir:function(txt){area.focus();document.execCommand('insertText',false,txt);},foco:function(){area.focus();}};
    area.addEventListener('keyup',estado);area.addEventListener('mouseup',estado);area.addEventListener('focus',estado);
    area.addEventListener('input',function(){campo.dispatchEvent(new Event('input',{bubbles:true}));});
    area.addEventListener('paste',function(e){
      e.preventDefault();
      var cd=e.clipboardData||global.clipboardData,html=cd&&cd.getData('text/html'),txt=cd&&cd.getData('text/plain')||'';
      var ins=html?limpar(html):deTextoSimples(txt);
      document.execCommand('insertHTML',false,ins.replace(/^<p>|<\/p>$/g,'').replace(/<\/p><p>/g,'<br>'));
    });
    area.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){var f=campo.form||null;campo.dispatchEvent(new CustomEvent('saga-enviar',{bubbles:true}));}
    });
    if(campo.value!==undefined&&campo.defaultValue)definir(campo.defaultValue);
    return campo._sagaTexto;
  }
  function ligarTodos(raiz){(raiz||document).querySelectorAll('textarea[data-saga-texto]').forEach(ligar);}

  global.SagaTexto={ligar:ligar,ligarTodos:ligarTodos,html:mostrar,limpar:limpar,puro:function(v){return textoDoHtml(paraHtml(v));},vazio:function(v){return !textoDoHtml(paraHtml(v));}};
})(window);
