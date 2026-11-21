/* =====================================================================
   SAGA · Editor de PDF (T168; 13/11/2026, pedido do Dr. Victor)
   Juntar, separar, tirar, girar, reordenar, numerar, escrever texto, tapar área e comprimir PDFs
   TUDO no navegador (LGPD): o arquivo não vai para o banco, para o armazenamento nem para outro site.
   Só sai do computador se a pessoa clicar em "Guardar na pasta do cliente" (quando o PDF veio da ficha).
   Bibliotecas guardadas no repositório, versão fixa: pdf.js 4.10.38 (ler e desenhar as páginas, o mesmo
   leitor da ficha) e pdf-lib 1.17.1 (montar o PDF novo). Licenças: Apache 2.0 e MIT.
   Coordenadas: cada anotação é guardada em frações da página SEM giro (x da esquerda, y de baixo,
   como no PDF), então girar a página depois leva o texto e a tarja junto.
   ===================================================================== */
(function(){
'use strict';
var PDFJS_DIR='vendor/pdfjs-4.10.38/';
var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
var BUCKET='documentos-clientes';
var CURVA='cubic-bezier(.22,.78,.25,1)';
var CORES_TEXTO={preto:[0,0,0],azul:[0.07,0.16,0.36],vermelho:[0.75,0.1,0.1]};
var E={docs:[],paginas:[],sel:new Set(),numeracao:null,historico:[],seq:0,origem:null,nomeTocado:false,trabalhando:false,pendente:false,tela:'inicio',ferr:null,resultado:null};

function $(id){return document.getElementById(id);}
function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
function semMovimento(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
function toast(msg,tipo){var w=$('toastWrap');var t=document.createElement('div');t.className='toast '+(tipo||'');t.textContent=msg;w.appendChild(t);setTimeout(function(){t.remove();},5200);}
function tamanhoTxt(b){if(b==null)return '';if(b<1024)return b+' B';if(b<1024*1024)return (b/1024).toFixed(0)+' KB';return (b/1024/1024).toFixed(b<10*1024*1024?2:1).replace('.',',')+' MB';}
function letra(i){var s='';i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
function novoId(){return 'x'+(++E.seq);}
function rot(p){return ((p.rotIntr+p.rotUser)%360+360)%360;}
function baseNome(n){return String(n||'documento').replace(/\.pdf$/i,'').trim()||'documento';}
function nomeLimpo(n){n=String(n||'').replace(/[\\/:*?"<>|]+/g,'-').trim();if(!n)n='documento';if(!/\.pdf$/i.test(n))n+='.pdf';return n;}

/* ---------- bibliotecas ---------- */
var _pdfjs=null;
function carregarPdfjs(){
  if(!_pdfjs){
    _pdfjs=import('./'+PDFJS_DIR+'pdf.min.mjs').then(function(m){
      m.GlobalWorkerOptions.workerSrc=new URL(PDFJS_DIR+'pdf.worker.min.mjs',location.href).href;return m;
    }).catch(function(e){_pdfjs=null;throw e;});
  }
  return _pdfjs;
}

/* ---------- avisos (erros sempre à vista) ---------- */
function aviso(tipo,titulo,texto,acoes){
  var el=document.createElement('div');el.className='aviso '+tipo;
  el.innerHTML='<div><b>'+esc(titulo)+'</b>'+esc(texto)+'</div><div class="aviso-acoes"></div>';
  var box=el.querySelector('.aviso-acoes');
  (acoes||[]).forEach(function(a){var b=document.createElement('button');b.type='button';b.className='btn';b.textContent=a.rotulo;b.addEventListener('click',function(){a.fazer(el);});box.appendChild(b);});
  var x=document.createElement('button');x.type='button';x.className='btn';x.textContent='Entendi';x.addEventListener('click',function(){tirarAviso(el);});box.appendChild(x);
  $('avisos').appendChild(el);
  if(window.sagaRecolher){el.hidden=true;window.sagaRecolher(el,false);}
  return el;
}
function tirarAviso(el){if(window.sagaRecolher)window.sagaRecolher(el,true,function(){el.remove();});else el.remove();}
function motivoPdfjs(e){
  var n=(e&&e.name)||'',m=(e&&e.message)||String(e||'');
  if(n==='InvalidPDFException')return 'o arquivo não é um PDF válido ou está corrompido (estrutura do PDF não encontrada). Peça uma cópia nova a quem enviou ou baixe de novo do tribunal.';
  if(n==='MissingPDFException')return 'o arquivo está vazio ou não foi encontrado.';
  if(n==='UnexpectedResponseException')return 'o arquivo não pôde ser lido ('+m+').';
  return 'erro ao ler o PDF: '+m;
}

/* ---------- abrir arquivos ---------- */
async function abrirArquivos(lista){
  var arqs=Array.prototype.slice.call(lista||[]);
  if(!arqs.length)return;
  for(var i=0;i<arqs.length;i++){
    var f=arqs[i];
    if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'){
      aviso('erro','"'+f.name+'" não foi aberto.','Motivo: não é um arquivo PDF (o editor só abre .pdf). Para imagem ou Word, gere o PDF antes.');continue;
    }
    var bytes;
    try{bytes=new Uint8Array(await f.arrayBuffer());}catch(e){aviso('erro','"'+f.name+'" não foi aberto.','Motivo: o navegador não conseguiu ler o arquivo do computador ('+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+').');continue;}
    await abrirBytes(bytes,f.name,null);
  }
}
async function abrirBytes(bytes,nome,senha,origem){
  var pdfjs;
  try{pdfjs=await carregarPdfjs();}catch(e){aviso('erro','O leitor de PDF não carregou.','Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'. Atualize a página (F5); se continuar, avise o administrador.');return false;}
  if(bytes.length<5||String.fromCharCode.apply(null,bytes.subarray(0,1024).filter(function(c){return c<128;})).indexOf('%PDF')<0){
    aviso('erro','"'+nome+'" não foi aberto.','Motivo: o arquivo não começa como um PDF (pode estar corrompido, ser outro formato com a extensão .pdf ou ter vindo pela metade). Baixe de novo.');return false;
  }
  var pdf;
  try{pdf=await pdfjs.getDocument({data:bytes.slice(),password:senha||undefined,isEvalSupported:false}).promise;}
  catch(e){
    if(e&&e.name==='PasswordException'){pedirSenha(bytes,nome,e.code===2,origem);return false;}
    aviso('erro','"'+nome+'" não foi aberto.','Motivo: '+motivoPdfjs(e));return false;
  }
  var rasterizar=!!senha,libDoc=null,motivoImg=senha?'aberto com senha':'';
  if(!senha){
    try{libDoc=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});}
    catch(e){
      rasterizar=true;
      var m=(e&&e.message)||'';
      if(/encrypt/i.test(m)){
        motivoImg='tem trava de edição do autor';
        aviso('atencao','"'+nome+'" tem trava de edição colocada por quem gerou o PDF.','Dá para ler, mas não para copiar as páginas como estão. O editor vai usar as páginas como imagem no PDF novo (o texto delas deixa de ser selecionável). Se precisar do texto, peça o arquivo sem a trava.');
      }else{
        motivoImg='estrutura com defeito';
        aviso('atencao','"'+nome+'" tem defeito na estrutura do PDF.','O leitor conseguiu mostrar as páginas, mas a montagem do PDF novo não (motivo técnico: '+m+'). As páginas vão como imagem no PDF novo.');
      }
    }
  }
  var doc={id:novoId(),letra:letra(E.docs.length),nome:nome,tamanho:bytes.length,bytes:bytes,pdf:pdf,lib:libDoc,rasterizar:rasterizar,motivoImg:motivoImg,origem:origem||null};
  E.docs.push(doc);
  var pend=E.pendente;guardarHistorico();E.pendente=pend||E.docs.length>1;
  for(var i=1;i<=pdf.numPages;i++){
    var pg;
    try{pg=await pdf.getPage(i);}catch(e){aviso('erro','Página '+i+' de "'+nome+'" não abriu.','Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro')+'. As outras páginas foram abertas.');continue;}
    var v=pg.view;
    E.paginas.push({id:novoId(),doc:doc,idx:i-1,rotIntr:((pg.rotate||0)%360+360)%360,rotUser:0,x1:v[0],y1:v[1],w:v[2]-v[0],h:v[3]-v[1],anot:[],definitiva:true});
  }
  if(!E.nomeTocado){$('nomeSaida').value=nomeSugerido();}
  desenhar();
  return true;
}
function nomeSugerido(){
  if(!E.docs.length)return '';
  var b=baseNome(E.docs[0].nome);
  return b+(E.docs.length>1?' (juntado)':' (editado)')+'.pdf';
}

/* senha */
var _senhaPend=null;
function pedirSenha(bytes,nome,errada,origem){
  _senhaPend={bytes:bytes,nome:nome,origem:origem};
  $('jSenhaSub').textContent='"'+nome+'" pede uma senha para abrir. Sem ela não dá para ver as páginas.';
  $('senhaErro').textContent=errada?'Senha errada. Confira maiúsculas e minúsculas e tente de novo.':'';
  $('senhaCampo').value='';
  abrirJanela('jSenha');setTimeout(function(){$('senhaCampo').focus();},60);
}
async function confirmarSenha(){
  var p=_senhaPend;if(!p)return;
  var s=$('senhaCampo').value;if(!s){$('senhaErro').textContent='Digite a senha.';return;}
  _senhaPend=null;fecharJanela('jSenha');
  await abrirBytes(p.bytes,p.nome,s,p.origem);
}
function cancelarSenha(){
  if(_senhaPend){aviso('erro','"'+_senhaPend.nome+'" não foi aberto.','Motivo: o PDF é protegido por senha e a senha não foi digitada.');_senhaPend=null;}
}

/* ---------- histórico (desfazer) ---------- */
function retrato(){
  return {paginas:E.paginas.map(function(p){return Object.assign({},p,{anot:p.anot.map(function(a){return Object.assign({},a);})});}),numeracao:E.numeracao?Object.assign({},E.numeracao):null,docs:E.docs.slice()};
}
function guardarHistorico(){E.pendente=true;E.historico.push(retrato());if(E.historico.length>40)E.historico.shift();$('bDesfazer').disabled=false;}
function desfazer(){
  var r=E.historico.pop();if(!r)return;
  E.paginas=r.paginas;E.numeracao=r.numeracao;E.docs=r.docs;
  var ids=new Set(E.paginas.map(function(p){return p.id;}));E.sel.forEach(function(id){if(!ids.has(id))E.sel.delete(id);});
  $('bDesfazer').disabled=!E.historico.length;
  desenhar(true);toast('Desfeito.');
}

/* ---------- desenhar a grade ---------- */
var observador=null;
function desenhar(animar){
  var tem=E.paginas.length>0;
  document.body.classList.toggle('tem-paginas',tem);
  // posições antes (para os cartões deslizarem até o lugar novo)
  var antes={};
  if(animar&&!semMovimento())document.querySelectorAll('#grade .pg').forEach(function(el){antes[el.dataset.id]=el.getBoundingClientRect();});
  var grade=$('grade');
  var existentes={};grade.querySelectorAll('.pg').forEach(function(el){existentes[el.dataset.id]=el;});
  var frag=document.createDocumentFragment();
  E.paginas.forEach(function(p,i){
    var el=existentes[p.id];
    if(!el){el=criarCartao(p);}
    delete existentes[p.id];
    atualizarCartao(el,p,i);
    frag.appendChild(el);
  });
  Object.keys(existentes).forEach(function(k){existentes[k].remove();});
  grade.appendChild(frag);
  // desliza
  if(animar&&!semMovimento()){
    grade.querySelectorAll('.pg').forEach(function(el){
      var a=antes[el.dataset.id];if(!a)return;var b=el.getBoundingClientRect();
      var dx=a.left-b.left,dy=a.top-b.top;if(!dx&&!dy)return;
      el.style.transition='none';el.style.transform='translate('+dx+'px,'+dy+'px)';void el.offsetWidth;
      el.style.transition='transform 360ms '+CURVA;el.style.transform='';
      setTimeout(function(){el.style.transition='';},380);
    });
  }
  desenharResumo();
}
function criarCartao(p){
  var el=document.createElement('div');el.className='pg';el.dataset.id=p.id;el.tabIndex=0;
  el.innerHTML='<input type="checkbox" class="marca" aria-label="Marcar página">'
    +'<div class="acoes-pg">'
    +'<button type="button" data-a="girarD" title="Girar para a direita"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 9a8 8 0 10-2 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 4v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    +'<button type="button" data-a="editar" title="Escrever texto ou tapar área"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9l-4-4L4 16v4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></button>'
    +'<button type="button" data-a="tirar" title="Tirar esta página"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    +'</div>'
    +'<div class="folha"><span class="carregando">Abrindo…</span></div>'
    +'<span class="editada" hidden>✎ editada</span>'
    +'<div class="rodape"><span class="num"></span><span class="orig"></span><span class="mover"><button type="button" data-a="esq" title="Mover para trás" aria-label="Mover para trás">‹</button><button type="button" data-a="dir" title="Mover para a frente" aria-label="Mover para a frente">›</button></span></div>';
  if(!observador)observador=new IntersectionObserver(function(ents){ents.forEach(function(en){if(en.isIntersecting){var pe=E.paginas.find(function(x){return x.id===en.target.dataset.id;});if(pe)renderMini(en.target,pe);}});},{rootMargin:'300px'});
  observador.observe(el);
  return el;
}
function atualizarCartao(el,p,i){
  el.classList.toggle('marcada',E.sel.has(p.id));
  el.querySelector('.marca').checked=E.sel.has(p.id);
  el.querySelector('.num').textContent=String(i+1);
  el.querySelector('.orig').innerHTML='<span class="letra" title="'+esc(p.doc.nome)+'">'+esc(p.doc.letra)+'</span>p. '+(p.idx+1);
  el.querySelector('.editada').hidden=!p.anot.length;
  el.setAttribute('aria-label','Página '+(i+1)+' (arquivo '+p.doc.letra+', página '+(p.idx+1)+')');
  var cv=el.querySelector('canvas');
  if(cv&&cv.dataset.chave!==chaveMini(p))renderMini(el,p);
}
function chaveMini(p){return p.doc.id+'-'+p.idx+'-'+rot(p);}
async function renderMini(el,p){
  var chave=chaveMini(p);
  var cv=el.querySelector('canvas');
  if(cv&&(cv.dataset.chave===chave||cv.dataset.fazendo===chave))return;
  var novo=document.createElement('canvas');novo.dataset.fazendo=chave;
  if(cv)cv.dataset.fazendo=chave;
  try{
    var pg=await p.doc.pdf.getPage(p.idx+1);
    var vp1=pg.getViewport({scale:1,rotation:rot(p)});
    var alvoH=190,alvoW=150,dpr=Math.min(window.devicePixelRatio||1,2);
    var esc_=Math.min(alvoW/vp1.width,alvoH/vp1.height)*dpr;
    var vp=pg.getViewport({scale:esc_,rotation:rot(p)});
    novo.width=Math.ceil(vp.width);novo.height=Math.ceil(vp.height);
    novo.style.width=Math.round(vp.width/dpr)+'px';novo.style.height=Math.round(vp.height/dpr)+'px';
    await pg.render({canvasContext:novo.getContext('2d'),viewport:vp}).promise;
    novo.dataset.chave=chave;delete novo.dataset.fazendo;
    if(chaveMini(p)!==chave)return;
    var folha=el.querySelector('.folha');folha.innerHTML='';folha.appendChild(novo);
  }catch(e){
    var f=el.querySelector('.folha');f.innerHTML='<span class="carregando" style="color:var(--danger,#e5484d);padding:8px;text-align:center">Não consegui mostrar esta página: '+esc((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro')+'</span>';
  }
}
function desenharResumo(){
  var n=E.paginas.length,m=E.sel.size;
  var tot=E.docs.reduce(function(s,d){return s+(E.paginas.some(function(p){return p.doc===d;})?d.tamanho:0);},0);
  var usados=E.docs.filter(function(d){return E.paginas.some(function(p){return p.doc===d;});});
  $('resumo').innerHTML='<b>'+n+'</b> página'+(n!==1?'s':'')+' de <b>'+usados.length+'</b> arquivo'+(usados.length!==1?'s':'')+' · tamanho dos originais: <b>'+tamanhoTxt(tot)+'</b>'
    +(m?' · <b>'+m+'</b> marcada'+(m>1?'s':''):'')
    +(E.numeracao?' · numeração ligada':'')
    +' · arraste as páginas para mudar a ordem; clique para marcar.';
  $('arquivos').innerHTML=usados.map(function(d){
    var np=E.paginas.filter(function(p){return p.doc===d;}).length;
    return '<span class="arq"><span class="letra">'+esc(d.letra)+'</span><span class="nm" title="'+esc(d.nome)+'">'+esc(d.nome)+'</span><small>'+np+' pág. · '+tamanhoTxt(d.tamanho)+'</small>'
      +(d.rasterizar?'<span class="selo-img" title="As páginas deste arquivo entram como imagem: '+esc(d.motivoImg)+'">vai como imagem</span>':'')
      +'<button type="button" data-tirar-doc="'+esc(d.id)+'" title="Tirar este arquivo" aria-label="Tirar este arquivo">×</button></span>';
  }).join('');
  $('tMarcarTodas').textContent=m&&m===n?'Desmarcar':'Marcar todas';
  $('bTirar').disabled=!m;$('bExtrair').disabled=!m;
  $('tNumerar').textContent=E.numeracao?'Numeração ✓':'Numerar';
  atualizarConcluir();
}

/* ---------- ações de página ---------- */
function alvos(){return E.sel.size?E.paginas.filter(function(p){return E.sel.has(p.id);}):E.paginas.slice();}
function girar(lista,graus){
  if(!lista.length)return;
  guardarHistorico();
  lista.forEach(function(p){
    p.rotUser=((p.rotUser+graus)%360+360)%360;
    var el=document.querySelector('.pg[data-id="'+p.id+'"]');var cv=el&&el.querySelector('canvas');
    if(cv&&!semMovimento()){cv.classList.add('girando');cv.style.transform='rotate('+graus+'deg)';setTimeout(function(){cv.classList.remove('girando');desenharUm(p);},330);}
    else desenharUm(p);
  });
}
function desenharUm(p){var el=document.querySelector('.pg[data-id="'+p.id+'"]');if(el){var i=E.paginas.indexOf(p);atualizarCartao(el,p,i);}}
function tirar(lista){
  if(!lista.length)return;
  guardarHistorico();
  var ids=new Set(lista.map(function(p){return p.id;}));
  var els=Array.prototype.slice.call(document.querySelectorAll('#grade .pg')).filter(function(el){return ids.has(el.dataset.id);});
  var feito=function(){E.paginas=E.paginas.filter(function(p){return !ids.has(p.id);});ids.forEach(function(id){E.sel.delete(id);});desenhar(true);};
  if(semMovimento()||!els.length){feito();}
  else{els.forEach(function(el){el.style.transition='opacity 240ms ease,transform 260ms '+CURVA;el.style.opacity='0';el.style.transform='scale(.86)';});setTimeout(feito,250);}
  toast(lista.length===1?'Página tirada. "Desfazer" traz de volta.':lista.length+' páginas tiradas. "Desfazer" traz de volta.');
}
function moverPara(p,novoIdx){
  var i=E.paginas.indexOf(p);if(i<0)return;
  novoIdx=Math.max(0,Math.min(E.paginas.length-1,novoIdx));if(novoIdx===i)return;
  guardarHistorico();E.paginas.splice(i,1);E.paginas.splice(novoIdx,0,p);desenhar(true);
}
function tirarDoc(id){
  var d=E.docs.find(function(x){return x.id===id;});if(!d)return;
  var l=E.paginas.filter(function(p){return p.doc===d;});
  if(l.length)tirar(l);
}

/* ---------- arrastar para reordenar (mouse e toque) ---------- */
(function(){
  var ar=null;
  function inicio(e){
    var el=e.target.closest('.pg');if(!el||e.button>0)return;
    if(e.target.closest('button,input,.acoes-pg'))return;
    ar={el:el,id:el.dataset.id,x:e.clientX,y:e.clientY,ativo:false,toque:e.pointerType!=='mouse',ptr:e.pointerId,timer:null,clicou:true};
    if(ar.toque){ar.timer=setTimeout(function(){if(ar&&!ar.ativo){ar.clicou=false;comecar(e.clientX,e.clientY);}},380);}
  }
  function comecar(x,y){
    ar.ativo=true;ar.clicou=false;
    var r=ar.el.getBoundingClientRect();
    var g=ar.el.cloneNode(true);g.className='pg fantasma';g.style.width=Math.min(r.width,140)+'px';
    var cvO=ar.el.querySelector('canvas'),cvG=g.querySelector('canvas');if(cvO&&cvG){cvG.getContext('2d').drawImage(cvO,0,0);}
    document.body.appendChild(g);ar.g=g;ar.el.classList.add('fantasma-origem');
    ar.ind=document.createElement('div');ar.ind.className='indicador';
    seguir(x,y);
    if(navigator.vibrate&&ar.toque)try{navigator.vibrate(15);}catch(e){}
  }
  function seguir(x,y){
    ar.g.style.left=(x-50)+'px';ar.g.style.top=(y-40)+'px';
    var alvo=document.elementFromPoint(x,y);var c=alvo&&alvo.closest&&alvo.closest('#grade .pg');
    if(ar.ind.parentNode)ar.ind.remove();ar.destino=null;
    if(!c||c===ar.el){return;}
    var r=c.getBoundingClientRect();var depois=x>r.left+r.width/2;
    var idx=E.paginas.findIndex(function(p){return p.id===c.dataset.id;});
    ar.destino={idx:idx,depois:depois};
    c.appendChild(ar.ind);ar.ind.style.left=depois?'auto':'-9px';ar.ind.style.right=depois?'-9px':'auto';
    // rola a tela perto das bordas
    if(y<110)window.scrollBy(0,-14);else if(y>window.innerHeight-50)window.scrollBy(0,14);
  }
  function mover(e){
    if(!ar||e.pointerId!==ar.ptr)return;
    if(!ar.ativo){
      var d=Math.hypot(e.clientX-ar.x,e.clientY-ar.y);
      if(ar.toque){if(d>10){clearTimeout(ar.timer);ar=null;}return;}
      if(d>6){comecar(e.clientX,e.clientY);}else return;
    }
    e.preventDefault();seguir(e.clientX,e.clientY);
  }
  function fim(e){
    if(!ar||(e&&e.pointerId!==ar.ptr))return;
    clearTimeout(ar.timer);
    var a=ar;ar=null;
    if(!a.ativo){if(a.clicou&&e&&e.type==='pointerup')alternarMarca(a.id);return;}
    a.g.remove();a.el.classList.remove('fantasma-origem');if(a.ind.parentNode)a.ind.remove();
    if(a.destino){
      var p=E.paginas.find(function(x){return x.id===a.id;});var de=E.paginas.indexOf(p);
      var para=a.destino.idx+(a.destino.depois?1:0);if(para>de)para--;
      moverPara(p,para);
    }
    var bloq=function(ev){ev.stopPropagation();ev.preventDefault();window.removeEventListener('click',bloq,true);};
    window.addEventListener('click',bloq,true);setTimeout(function(){window.removeEventListener('click',bloq,true);},300);
  }
  document.addEventListener('pointerdown',inicio);
  document.addEventListener('pointermove',mover,{passive:false});
  document.addEventListener('pointerup',fim);
  document.addEventListener('pointercancel',function(e){if(ar&&!ar.ativo){clearTimeout(ar.timer);ar=null;}else fim(e);});
  document.addEventListener('touchmove',function(e){if(ar&&ar.ativo)e.preventDefault();},{passive:false});
  document.addEventListener('contextmenu',function(e){if(ar&&ar.toque&&e.target.closest('.pg'))e.preventDefault();});
})();
function alternarMarca(id){
  if(E.sel.has(id))E.sel.delete(id);else E.sel.add(id);
  var el=document.querySelector('.pg[data-id="'+id+'"]');if(el){el.classList.toggle('marcada',E.sel.has(id));el.querySelector('.marca').checked=E.sel.has(id);}
  desenharResumo();
}

/* ---------- conversão de coordenadas (frações) ---------- */
// u = página sem giro (x da esquerda, y de baixo); d = como aparece na tela (x da esquerda, y de cima), girada R graus no sentido do relógio
function u2d(ux,uy,R){
  if(R===90)return [uy,ux];
  if(R===180)return [1-ux,uy];
  if(R===270)return [1-uy,1-ux];
  return [ux,1-uy];
}
function d2u(fx,fy,R){
  if(R===90)return [fy,fx];
  if(R===180)return [1-fx,fy];
  if(R===270)return [1-fy,1-fx];
  return [fx,1-fy];
}
function dimsTela(p,R){return (R===90||R===270)?[p.h,p.w]:[p.w,p.h];}

/* ---------- montar o PDF (o coração do editor) ---------- */
// paginas: lista na ordem; op.raster = {dpi,q} transforma todas em imagem; op.progresso(i,n)
async function montarPdf(paginas,op){
  op=op||{};
  var L=PDFLib;
  var out=await L.PDFDocument.create();
  out.setProducer('SAGA ADV · Editor de PDF');out.setCreator('SAGA ADV');
  var fonte=await out.embedFont(L.StandardFonts.Helvetica);
  // páginas copiadas de cada arquivo numa chamada só (recursos como fontes não se repetem)
  var copias={};
  var porDoc={};
  paginas.forEach(function(p){if(!precisaImagem(p,op)){(porDoc[p.doc.id]=porDoc[p.doc.id]||{doc:p.doc,idx:[]}).idx.push(p.idx);}});
  for(var k in porDoc){
    var g=porDoc[k];var uniq=Array.from(new Set(g.idx));
    var cp=await out.copyPages(g.doc.lib,uniq);
    uniq.forEach(function(ix,j){copias[k+':'+ix]=cp[j];});
  }
  var total=paginas.length;
  var usados={};
  var numeracao=op.numeracao===undefined?E.numeracao:op.numeracao;
  for(var i=0;i<paginas.length;i++){
    var p=paginas[i],R=rot(p),pagina,info;
    if(op.progresso)op.progresso(i,total);
    if(precisaImagem(p,op)){
      var dpi=op.raster?op.raster.dpi:(p.doc.rasterizar?150:200),q=op.raster?op.raster.q:0.85;
      var img=await paginaComoJpeg(p,dpi,q);
      var jpg=await out.embedJpg(img.bytes);
      var dw=img.wPt,dh=img.hPt;
      pagina=out.addPage([dw,dh]);
      pagina.drawImage(jpg,{x:0,y:0,width:dw,height:dh});
      info={x1:0,y1:0,w:dw,h:dh,R:0};
    }else{
      var chave=p.doc.id+':'+p.idx;
      var pg=copias[chave];
      if(usados[chave]){pg=(await out.copyPages(p.doc.lib,[p.idx]))[0];}
      usados[chave]=true;
      pagina=out.addPage(pg);
      pagina.setRotation(L.degrees(R));
      info={x1:p.x1,y1:p.y1,w:p.w,h:p.h,R:R};
      desenharAnotacoes(pagina,p,info,fonte);
    }
    if(numeracao)desenharNumero(pagina,info,fonte,i,total,numeracao);
  }
  if(op.progresso)op.progresso(total,total);
  return await out.save({useObjectStreams:true});
}
function precisaImagem(p,op){
  if(op&&op.raster)return true;
  if(p.doc.rasterizar)return true;
  return p.definitiva&&p.anot.some(function(a){return a.tipo==='tarja';});
}
function corPdf(nome){var c=CORES_TEXTO[nome]||CORES_TEXTO.preto;return PDFLib.rgb(c[0],c[1],c[2]);}
// ponto da tela (em pontos, y de cima) -> ponto do PDF de saída
function telaParaPdf(info,Xd,Yd){
  var dims=(info.R===90||info.R===270)?[info.h,info.w]:[info.w,info.h];
  var u=d2u(Xd/dims[0],Yd/dims[1],info.R);
  return [info.x1+u[0]*info.w,info.y1+u[1]*info.h];
}
// fração da página sem giro -> ponto da tela (em pontos), na página de saída
function anotParaTela(p,ux,uy){var R=rot(p);var d=u2d(ux,uy,R);var dims=dimsTela(p,R);return [d[0]*dims[0],d[1]*dims[1]];}
function desenharAnotacoes(pagina,p,info,fonte){
  p.anot.forEach(function(a){
    if(a.tipo==='tarja'){
      var c1=anotParaTela(p,a.ux1,a.uy1),c2=anotParaTela(p,a.ux2,a.uy2);
      var q1=telaParaPdf(info,c1[0],c1[1]),q2=telaParaPdf(info,c2[0],c2[1]);
      pagina.drawRectangle({x:Math.min(q1[0],q2[0]),y:Math.min(q1[1],q2[1]),width:Math.abs(q2[0]-q1[0]),height:Math.abs(q2[1]-q1[1]),color:a.cor==='preto'?PDFLib.rgb(0,0,0):PDFLib.rgb(1,1,1),borderWidth:0});
    }else if(a.tipo==='texto'){
      desenharTextoPdf(pagina,p,info,fonte,a);
    }
  });
}
function desenharTextoPdf(pagina,p,info,fonte,a){
  // ângulo na tela (anti-horário): o texto nasceu de pé com a página girada r0; girar a página leva o texto junto
  var aparente=((a.r0-rot(p))%360+360)%360;
  var theta=(aparente+info.R)%360; // ângulo no PDF de saída
  var t=theta*Math.PI/180;
  var topo=anotParaTela(p,a.ux,a.uy); // canto de cima à esquerda do texto, na tela
  var base=telaParaPdf(info,topo[0],topo[1]);
  var down=[Math.cos(t-Math.PI/2),Math.sin(t-Math.PI/2)];
  var linhas=String(a.texto||'').split('\n');
  linhas.forEach(function(l,i){
    var off=a.tam*0.82+i*a.tam*1.2;
    pagina.drawText(textoSeguro(l,fonte),{x:base[0]+down[0]*off,y:base[1]+down[1]*off,size:a.tam,font:fonte,color:corPdf(a.cor),rotate:PDFLib.degrees(theta)});
  });
}
// a fonte padrão do PDF (Helvetica) só tem as letras do português/latim; troca o que ela não tem
function textoSeguro(s,fonte){
  var ok='';for(var i=0;i<s.length;i++){var c=s[i];try{fonte.encodeText(c);ok+=c;}catch(e){ok+=c==='\t'?'    ':'?';}}
  return ok;
}
function textoNumero(n,total,fmt){
  if(fmt==='nN')return n+' / '+total;
  if(fmt==='pag')return 'Página '+n+' de '+total;
  if(fmt==='fls')return 'Fls. '+n;
  return String(n);
}
function desenharNumero(pagina,info,fonte,i,total,cfg){
  if(cfg.capa&&i===0)return;
  var ini=cfg.inicio==null?1:cfg.inicio;
  var n=ini+(cfg.capa?i-1:i);
  var tot=ini+(cfg.capa?total-2:total-1);
  var txt=textoNumero(n,tot,cfg.formato);
  var tam=cfg.tam||10;
  var dims=(info.R===90||info.R===270)?[info.h,info.w]:[info.w,info.h];
  var tw=fonte.widthOfTextAtSize(txt,tam);
  var margem=Math.max(18,Math.min(36,dims[0]*0.05));
  var X,Y;
  if(cfg.pos==='esq')X=margem;else if(cfg.pos==='dir'||cfg.pos==='topo')X=dims[0]-margem-tw;else X=(dims[0]-tw)/2;
  Y=cfg.pos==='topo'?margem+tam*0.8:dims[1]-margem*0.8;
  var b=telaParaPdf(info,X,Y);
  pagina.drawText(txt,{x:b[0],y:b[1],size:tam,font:fonte,color:PDFLib.rgb(0.15,0.15,0.15),rotate:PDFLib.degrees(info.R)});
}
// página -> JPEG (com o giro, o texto e as tarjas desenhados por cima)
async function paginaComoJpeg(p,dpi,q){
  var pg=await p.doc.pdf.getPage(p.idx+1);
  var R=rot(p);
  var esc_=dpi/72;
  var vp=pg.getViewport({scale:esc_,rotation:R});
  var maxLado=6000;if(Math.max(vp.width,vp.height)>maxLado){esc_=esc_*maxLado/Math.max(vp.width,vp.height);vp=pg.getViewport({scale:esc_,rotation:R});}
  var cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
  var ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
  await pg.render({canvasContext:ctx,viewport:vp,background:'#fff'}).promise;
  desenharAnotacoesCanvas(ctx,p,cv.width,cv.height,esc_);
  var blob=await new Promise(function(ok,falha){cv.toBlob(function(b){if(b)ok(b);else falha(new Error('o navegador não conseguiu gerar a imagem da página (memória cheia?)'));},'image/jpeg',q);});
  var bytes=new Uint8Array(await blob.arrayBuffer());
  cv.width=cv.height=0;
  return {bytes:bytes,wPt:vp.width/esc_,hPt:vp.height/esc_};
}
function corCss(nome){var c=CORES_TEXTO[nome]||CORES_TEXTO.preto;return 'rgb('+c.map(function(x){return Math.round(x*255);}).join(',')+')';}
function desenharAnotacoesCanvas(ctx,p,W,H,esc_){
  var R=rot(p);
  p.anot.forEach(function(a){
    if(a.tipo==='tarja'){
      var d1=u2d(a.ux1,a.uy1,R),d2=u2d(a.ux2,a.uy2,R);
      ctx.fillStyle=a.cor==='preto'?'#000':'#fff';
      ctx.fillRect(Math.min(d1[0],d2[0])*W,Math.min(d1[1],d2[1])*H,Math.abs(d2[0]-d1[0])*W,Math.abs(d2[1]-d1[1])*H);
    }else if(a.tipo==='texto'){
      var d=u2d(a.ux,a.uy,R);var aparente=((a.r0-R)%360+360)%360;
      ctx.save();ctx.translate(d[0]*W,d[1]*H);ctx.rotate(-aparente*Math.PI/180);
      ctx.fillStyle=corCss(a.cor);ctx.font=(a.tam*esc_)+'px Helvetica, Arial, sans-serif';ctx.textBaseline='alphabetic';
      String(a.texto||'').split('\n').forEach(function(l,i){ctx.fillText(l,0,a.tam*esc_*(0.82+i*1.2));});
      ctx.restore();
    }
  });
}

/* ---------- baixar ---------- */
function baixarBytes(bytes,nome,tipo){
  var blob=bytes instanceof Blob?bytes:new Blob([bytes],{type:tipo||'application/pdf'});
  var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=nome;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},4000);
}
function falhaMontar(e,oque){
  var m=(window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||String(e||'erro desconhecido');
  aviso('erro','Não consegui '+oque+'.','Motivo: '+m+'. Nada foi baixado. Tente de novo; se o erro continuar, avise o administrador com esta mensagem.');
}
async function trabalhar(botao,fn){
  if(E.trabalhando)return;E.trabalhando=true;
  var txt=botao?botao.innerHTML:null;if(botao){botao.disabled=true;botao.textContent='Montando…';}
  try{await fn();}finally{E.trabalhando=false;if(botao){botao.innerHTML=txt;botao.disabled=false;}desenharResumo();}
}
async function gerarTudo(){
  if(!E.paginas.length)return;
  await trabalhar($('bConcluir'),async function(){
    try{
      var bytes=await montarPdf(E.paginas,{});
      var f=ferr();
      mostrarResultado({titulo:f.pronto||'PDF pronto',detalhe:E.paginas.length+' página'+(E.paginas.length!==1?'s':'')+' · '+tamanhoTxt(bytes.length)+'.',arquivos:[{nome:nomeLimpo($('nomeSaida').value||nomeSugerido()),bytes:bytes,tipo:'application/pdf',paginas:E.paginas.length}]});
    }catch(e){falhaMontar(e,'montar o PDF');}
  });
}
async function extrairMarcadas(){
  var l=E.paginas.filter(function(p){return E.sel.has(p.id);});if(!l.length)return;
  await trabalhar($('bExtrair'),async function(){
    try{
      var bytes=await montarPdf(l,{});
      mostrarResultado({titulo:'Páginas extraídas',detalhe:l.length+' página'+(l.length>1?'s':'')+' ('+faixaTexto(l)+') · '+tamanhoTxt(bytes.length)+'. O arquivo de onde elas saíram continua aberto ("Voltar e ajustar").',arquivos:[{nome:baseNome($('nomeSaida').value||nomeSugerido())+' - paginas '+faixaTexto(l)+'.pdf',bytes:bytes,tipo:'application/pdf',paginas:l.length}]});
    }catch(e){falhaMontar(e,'extrair as páginas');}
  });
}
function faixaTexto(l){
  var nums=l.map(function(p){return E.paginas.indexOf(p)+1;}).sort(function(a,b){return a-b;});
  var partes=[],ini=nums[0],ant=nums[0];
  for(var i=1;i<=nums.length;i++){var n=nums[i];if(n===ant+1){ant=n;continue;}partes.push(ini===ant?String(ini):ini+'-'+ant);ini=ant=n;}
  return partes.join(' e ');
}

/* ---------- separar ---------- */
function lerIntervalos(txt,total){
  var partes=String(txt||'').split(/[,;]+/).map(function(s){return s.trim();}).filter(Boolean);
  if(!partes.length)throw new Error('Escreva pelo menos um intervalo. Ex.: 1-3, 5');
  return partes.map(function(s){
    var m=s.match(/^(\d+)\s*(?:-|a|até)\s*(\d+)$/i)||s.match(/^(\d+)$/);
    if(!m)throw new Error('"'+s+'" não é um intervalo. Use números e traço, ex.: 1-3');
    var a=parseInt(m[1],10),b=m[2]?parseInt(m[2],10):a;
    if(a<1||b<1)throw new Error('"'+s+'": as páginas começam em 1.');
    if(a>total||b>total)throw new Error('"'+s+'": o documento tem só '+total+' páginas.');
    if(b<a)throw new Error('"'+s+'": o começo é maior que o fim.');
    return [a,b];
  });
}
function gruposSeparar(){
  var tipo=document.querySelector('input[name="sep"]:checked').value,n=E.paginas.length;
  if(tipo==='cada')return E.paginas.map(function(p,i){return {nome:'pagina '+(i+1),pags:[p]};});
  if(tipo==='blocos'){
    var k=parseInt($('sepBlocos').value,10);if(!(k>=1))throw new Error('Diga de quantas em quantas páginas (1 ou mais).');
    var g=[];for(var i=0;i<n;i+=k){var fim=Math.min(n,i+k);g.push({nome:'paginas '+(i+1)+(fim>i+1?'-'+fim:''),pags:E.paginas.slice(i,fim)});}return g;
  }
  return lerIntervalos($('sepIntervalos').value,n).map(function(r){return {nome:'paginas '+r[0]+(r[1]>r[0]?'-'+r[1]:''),pags:E.paginas.slice(r[0]-1,r[1])};});
}
function previaSeparar(){
  $('sepErro').textContent='';
  try{var g=gruposSeparar();$('sepPrevia').textContent=g.length+' arquivo'+(g.length>1?'s':'')+': '+g.slice(0,6).map(function(x){return x.nome;}).join('; ')+(g.length>6?'; …':'')+(g.length>1?' (num .zip).':'.');$('sepOk').disabled=false;}
  catch(e){$('sepPrevia').textContent='';$('sepErro').textContent=e.message;$('sepOk').disabled=true;}
}
async function separar(){
  var g;try{g=gruposSeparar();}catch(e){$('sepErro').textContent=e.message;return;}
  var base=baseNome($('nomeSaida').value||nomeSugerido());
  var prog=$('sepProg');prog.classList.add('ativo');
  $('sepOk').disabled=true;
  try{
    var arquivos=[];
    for(var i=0;i<g.length;i++){
      progresso(prog,i,g.length,'Arquivo '+(i+1)+' de '+g.length);
      arquivos.push({nome:base+' - '+g[i].nome+'.pdf',bytes:await montarPdf(g[i].pags,{})});
    }
    progresso(prog,1,1,'Pronto.');
    fecharJanela('jSeparar');
    mostrarResultado({titulo:'PDF separado',detalhe:arquivos.length+' arquivo'+(arquivos.length>1?'s':'')+'. "Baixar" traz todos juntos num .zip; cada um também tem o seu botão.',zip:base+' (separado).zip',arquivos:arquivos.map(function(a,i){return {nome:a.nome,bytes:a.bytes,tipo:'application/pdf',paginas:g[i].pags.length};})});
  }catch(e){$('sepErro').textContent='Não consegui separar. Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'. Nada foi baixado.';}
  finally{prog.classList.remove('ativo');$('sepOk').disabled=false;}
}
function progresso(el,i,n,txt){el.querySelector('i').style.width=(n?Math.round(i/n*100):0)+'%';el.querySelector('small').textContent=txt||'';}

/* .zip simples (sem compressão: PDF já é comprimido por dentro) */
var _crc=null;
function crc32(b){
  if(!_crc){_crc=new Uint32Array(256);for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;_crc[n]=c>>>0;}}
  var x=0xFFFFFFFF;for(var i=0;i<b.length;i++)x=_crc[(x^b[i])&255]^(x>>>8);return (x^0xFFFFFFFF)>>>0;
}
function zipar(arqs){
  var enc=new TextEncoder(),partes=[],central=[],off=0;
  var d=new Date();var hora=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);var dia=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  var usados={};
  arqs.forEach(function(a){
    var nome=a.nome;var k=1;while(usados[nome]){nome=a.nome.replace(/\.pdf$/i,'')+' ('+(++k)+').pdf';}usados[nome]=1;
    var nb=enc.encode(nome),crc=crc32(a.bytes),tam=a.bytes.length;
    var h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,hora,true);h.setUint16(12,dia,true);
    h.setUint32(14,crc,true);h.setUint32(18,tam,true);h.setUint32(22,tam,true);h.setUint16(26,nb.length,true);h.setUint16(28,0,true);
    partes.push(new Uint8Array(h.buffer),nb,a.bytes);
    var c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,hora,true);c.setUint16(14,dia,true);
    c.setUint32(16,crc,true);c.setUint32(20,tam,true);c.setUint32(24,tam,true);c.setUint16(28,nb.length,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),nb);
    off+=30+nb.length+tam;
  });
  var tamC=central.reduce(function(s,x){return s+x.length;},0);
  var f=new DataView(new ArrayBuffer(22));
  f.setUint32(0,0x06054b50,true);f.setUint16(8,arqs.length,true);f.setUint16(10,arqs.length,true);f.setUint32(12,tamC,true);f.setUint32(16,off,true);
  return new Blob(partes.concat(central,[new Uint8Array(f.buffer)]),{type:'application/zip'});
}

/* ---------- numerar ---------- */
function abrirNumerar(){
  var c=E.numeracao||{formato:'n',pos:'centro',inicio:1,tam:10,capa:false};
  escolherPill('numFormato',c.formato);escolherPill('numPos',c.pos);
  $('numInicio').value=c.inicio;$('numTam').value=c.tam;$('numCapa').checked=!!c.capa;
  $('numTirar').hidden=!E.numeracao;
  abrirJanela('jNumerar');
}
function escolherPill(grupo,v){$(grupo).querySelectorAll('.pill').forEach(function(b){b.classList.toggle('active',b.dataset.v===v);});}
function valorPill(grupo){var b=$(grupo).querySelector('.pill.active');return b?b.dataset.v:null;}
function salvarNumerar(){
  guardarHistorico();
  E.numeracao={formato:valorPill('numFormato')||'n',pos:valorPill('numPos')||'centro',inicio:Math.max(0,parseInt($('numInicio').value,10)||1),tam:Math.max(6,Math.min(24,parseInt($('numTam').value,10)||10)),capa:$('numCapa').checked};
  fecharJanela('jNumerar');desenharResumo();
  if(E.ferr==='numerar')gerarTudo();else toast('Numeração ligada: entra no PDF ao gerar ("Gerar o PDF").');
}

/* ---------- comprimir (16/11: refeito) ----------
   ERRO ANTIGO (16/11, Dr. Victor): Leve/Média/Forte transformavam CADA PÁGINA numa foto JPEG. Num PDF de texto
   (ou escaneado em preto e branco, que já vem em formato de fax bem leve) a foto é muito MAIOR que o original:
   4,7 KB viravam 2 MB. Agora: o texto continua texto; só as IMAGENS de dentro do PDF (fotos, páginas escaneadas
   coloridas) são reduzidas e regravadas, e só quando a imagem nova fica menor. Regra: se o resultado não diminuir,
   o SAGA avisa ("já está otimizado") e fica com o original; nunca entrega arquivo maior sem avisar. */
var NIVEIS_IMG={leve:{lado:2400,q:0.82,nome:'Leve'},media:{lado:1700,q:0.7,nome:'Recomendada'},forte:{lado:1150,q:0.55,nome:'Forte'}};
function _num(ctx,v){v=ctx.lookup(v);return v&&v.asNumber?v.asNumber():null;}
function _nome(ctx,v){v=ctx.lookup(v);return v&&v.asString?v.asString():(v&&v.encodedName?v.encodedName:null);}
async function _inflar(bytes){
  if(typeof DecompressionStream==='undefined')throw new Error('navegador sem descompressão');
  var st=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(st).arrayBuffer());
}
function _a85(b){
  var out=[],t=0,n=0,i=0;if(b[0]===60&&b[1]===126)i=2;
  for(;i<b.length;i++){var c=b[i];if(c===126)break;if(c<=32)continue;if(c===122&&n===0){out.push(0,0,0,0);continue;}
    t=t*85+(c-33);n++;if(n===5){out.push((t>>>24)&255,(t>>>16)&255,(t>>>8)&255,t&255);t=0;n=0;}}
  if(n>1){for(var k=n;k<5;k++)t=t*85+84;var by=[(t>>>24)&255,(t>>>16)&255,(t>>>8)&255,t&255];for(var m=0;m<n-1;m++)out.push(by[m]);}
  return new Uint8Array(out);
}
function _hexDec(b){var s=String.fromCharCode.apply(null,Array.prototype.filter.call(b,function(c){return /[0-9a-fA-F]/.test(String.fromCharCode(c));}));if(s.length%2)s+='0';var o=new Uint8Array(s.length/2);for(var i=0;i<o.length;i++)o[i]=parseInt(s.substr(i*2,2),16);return o;}
function _despredizer(dados,colunas,cores){
  // PNG predictors (Predictor >= 10): cada linha começa com o tipo de filtro
  var bpl=colunas*cores,linhas=Math.floor(dados.length/(bpl+1)),out=new Uint8Array(linhas*bpl),ant=new Uint8Array(bpl);
  for(var y=0;y<linhas;y++){
    var t=dados[y*(bpl+1)],o=y*(bpl+1)+1,lin=out.subarray(y*bpl,(y+1)*bpl);
    for(var x=0;x<bpl;x++){
      var a=x>=cores?lin[x-cores]:0,b=ant[x],c=x>=cores?ant[x-cores]:0,v=dados[o+x];
      if(t===1)v+=a;else if(t===2)v+=b;else if(t===3)v+=(a+b)>>1;
      else if(t===4){var p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}
      lin[x]=v&255;
    }
    ant=lin;
  }
  return out;
}
async function _imagemParaCanvas(ctx,obj,L){
  var d=obj.dict,N=L.PDFName;
  var W=_num(ctx,d.get(N.of('Width'))),H=_num(ctx,d.get(N.of('Height')));
  if(!W||!H)return null;
  var f=ctx.lookup(d.get(N.of('Filter'))),filtros=[];
  if(f instanceof L.PDFArray){for(var fi=0;fi<f.size();fi++)filtros.push(_nome(ctx,f.get(fi)));}else if(f)filtros.push(_nome(ctx,f));
  var dadosBrutos=obj.contents;
  // embrulhos de texto (ASCII85 / ASCIIHex) vêm antes do formato da imagem: desembrulha
  while(filtros.length>1&&(filtros[0]==='/ASCII85Decode'||filtros[0]==='/A85'||filtros[0]==='/ASCIIHexDecode'||filtros[0]==='/AHx')){
    dadosBrutos=(filtros[0]==='/ASCIIHexDecode'||filtros[0]==='/AHx')?_hexDec(dadosBrutos):_a85(dadosBrutos);filtros.shift();
  }
  if(filtros.length!==1)return null;
  var filtro=filtros[0];
  if(d.get(N.of('ImageMask'))||d.get(N.of('Mask'))||d.get(N.of('Decode')))return null;
  var cs=ctx.lookup(d.get(N.of('ColorSpace'))),comps=null;
  if(cs instanceof L.PDFName){var n=cs.asString();comps=n==='/DeviceRGB'?3:n==='/DeviceGray'?1:null;}
  else if(cs instanceof L.PDFArray&&cs.size()===2&&_nome(ctx,cs.get(0))==='/ICCBased'){var icc=ctx.lookup(cs.get(1));var nn=icc&&icc.dict?_num(ctx,icc.dict.get(N.of('N'))):null;comps=(nn===1||nn===3)?nn:null;}
  if(!comps)return null; // CMYK, Indexed e outros: ficam como estão
  var bmp;
  if(filtro==='/DCTDecode'){
    bmp=await createImageBitmap(new Blob([dadosBrutos],{type:'image/jpeg'}));
  }else if(filtro==='/FlateDecode'){
    if(_num(ctx,d.get(N.of('BitsPerComponent')))!==8)return null;
    var dados=await _inflar(dadosBrutos);
    var dp=ctx.lookup(d.get(N.of('DecodeParms')));
    if(dp&&dp.get){var pred=_num(ctx,dp.get(N.of('Predictor')))||1;if(pred>=10)dados=_despredizer(dados,_num(ctx,dp.get(N.of('Columns')))||W,comps);else if(pred!==1)return null;}
    if(dados.length<W*H*comps)return null;
    var px=new Uint8ClampedArray(W*H*4);
    for(var i=0,j=0;i<W*H;i++){if(comps===3){px[j]=dados[i*3];px[j+1]=dados[i*3+1];px[j+2]=dados[i*3+2];}else{px[j]=px[j+1]=px[j+2]=dados[i];}px[j+3]=255;j+=4;}
    bmp=await createImageBitmap(new ImageData(px,W,H));
  }else return null; // CCITT e JBIG2 (escaneado preto e branco): já são levíssimos
  return {bmp:bmp,W:W,H:H,cinza:comps===1};
}
async function otimizarPdf(bytes,nivel,prog){
  var L=PDFLib,N=L.PDFName;
  var doc=await L.PDFDocument.load(bytes,{updateMetadata:false});
  var ctx=doc.context,cfg=NIVEIS_IMG[nivel];
  var lista=ctx.enumerateIndirectObjects();
  var mascaras=new Set();
  lista.forEach(function(par){var o=par[1];if(o instanceof L.PDFRawStream&&o.dict.get(N.of('SMask'))){var r=o.dict.get(N.of('SMask'));if(r instanceof L.PDFRef)mascaras.add(r.toString());}});
  var info={imagens:0,reduzidas:0,fluxos:0};
  for(var k=0;k<lista.length;k++){
    var ref=lista[k][0],o=lista[k][1];
    if(!(o instanceof L.PDFRawStream))continue;
    if(prog&&k%20===0)prog(k,lista.length);
    var d=o.dict,sub=_nome(ctx,d.get(N.of('Subtype')));
    if(sub==='/Image'){
      info.imagens++;
      if(!cfg||mascaras.has(ref.toString())||o.contents.length<25000)continue;
      var im=null;try{im=await _imagemParaCanvas(ctx,o,L);}catch(e){im=null;}
      if(!im)continue;
      var s=Math.min(1,cfg.lado/Math.max(im.W,im.H)),w=Math.max(1,Math.round(im.W*s)),h=Math.max(1,Math.round(im.H*s));
      var cv=document.createElement('canvas');cv.width=w;cv.height=h;var c2=cv.getContext('2d');
      c2.fillStyle='#fff';c2.fillRect(0,0,w,h);c2.imageSmoothingQuality='high';c2.drawImage(im.bmp,0,0,w,h);try{im.bmp.close();}catch(e){}
      var blob=await new Promise(function(ok){cv.toBlob(ok,'image/jpeg',cfg.q);});cv.width=cv.height=0;
      if(!blob)continue;
      var nb=new Uint8Array(await blob.arrayBuffer());
      if(nb.length>=o.contents.length*0.85)continue; // não ganhou: fica a imagem original
      var nd={Type:'XObject',Subtype:'Image',Width:w,Height:h,BitsPerComponent:8,ColorSpace:'DeviceRGB',Filter:'DCTDecode'};
      var novo=ctx.stream(nb,nd);
      ['SMask','Intent','Interpolate','OC','Metadata'].forEach(function(ch){var v=d.get(N.of(ch));if(v)novo.dict.set(N.of(ch),v);});
      ctx.assign(ref,novo);info.reduzidas++;
    }else if(!d.get(N.of('Filter'))&&o.contents.length>256&&!/\/(XRef|ObjStm)/.test(_nome(ctx,d.get(N.of('Type')))||'')){
      // fluxo gravado sem compressão (texto da página, fontes): compacta sem perder nada
      var z=ctx.flateStream(o.contents);
      d.entries().forEach(function(e){var kn=e[0].asString();if(kn!=='/Length'&&kn!=='/Filter')z.dict.set(e[0],e[1]);});
      if(z.contents.length<o.contents.length){ctx.assign(ref,z);info.fluxos++;}
    }
  }
  var saida=await doc.save({useObjectStreams:true});
  info.bytes=saida;return info;
}
// o que está na tela é exatamente o arquivo original? (um arquivo só, todas as páginas, na ordem, sem mudança)
function intacto(){
  if(E.docs.length!==1||E.numeracao)return null;
  var d=E.docs[0];if(d.rasterizar||E.paginas.length!==d.pdf.numPages)return null;
  for(var i=0;i<E.paginas.length;i++){var p=E.paginas[i];if(p.doc!==d||p.idx!==i||p.rotUser||p.anot.length)return null;}
  return d;
}
var _comp=null;
function abrirComprimir(){
  _comp=null;$('compResultado').hidden=true;$('compErro').textContent='';$('compBaixar').disabled=true;
  atualizarAvisoComp();abrirJanela('jComprimir');
}
function nivelComp(){return document.querySelector('input[name="nivel"]:checked').value;}
function atualizarAvisoComp(){$('compAviso').hidden=nivelComp()!=='imagem';}
async function calcularComp(){
  var nivel=nivelComp(),prog=$('compProg');
  $('compErro').textContent='';$('compResultado').hidden=true;$('compBaixar').disabled=true;$('compCalc').disabled=true;prog.classList.add('ativo');
  try{
    var orig=intacto();
    var antes=orig?orig.tamanho:E.docs.filter(function(d){return E.paginas.some(function(p){return p.doc===d;});}).reduce(function(s,d){return s+d.tamanho;},0);
    progresso(prog,0,3,'Montando o PDF…');
    var base=await montarPdf(E.paginas,{progresso:function(i,n){progresso(prog,i,n*3,'Montando o PDF: página '+Math.min(i+1,n)+' de '+n);}});
    var cand=[];
    if(nivel==='imagem'){
      var bi=await montarPdf(E.paginas,{raster:{dpi:110,q:0.62},progresso:function(i,n){progresso(prog,n+i,n*3,'Página '+Math.min(i+1,n)+' de '+n+' virando imagem');}});
      cand.push({bytes:bi,como:'páginas como imagem'});
    }else{
      progresso(prog,1,3,'Reduzindo as imagens de dentro do PDF…');
      var r=await otimizarPdf(base,nivel==='sem'?null:nivel,function(i,n){progresso(prog,n+i,n*3,'Conferindo o arquivo por dentro…');});
      cand.push({bytes:r.bytes,como:nivel==='sem'?'arquivo reorganizado':!r.imagens?'o PDF não tem fotos para reduzir; arquivo reorganizado':(!r.reduzidas?'nenhuma das '+r.imagens+' imagens precisou ser reduzida':r.reduzidas+' de '+r.imagens+' '+(r.imagens>1?'imagens reduzidas':'imagem reduzida')),info:r});
    }
    cand.push({bytes:base,como:'sem compressão'});
    var melhor=cand.reduce(function(a,b){return b.bytes.length<a.bytes.length?b:a;});
    var ref=orig?orig.tamanho:base.length; // com mudanças na tela, a comparação justa é com o PDF montado
    var ganhou=melhor.bytes.length<ref*0.98;
    var final;
    if(ganhou)final={bytes:melhor.bytes,otimizado:false,como:melhor.como};
    else final={bytes:orig?orig.bytes:base,otimizado:true,como:orig?'original mantido':'sem compressão'};
    _comp={bytes:final.bytes,nivel:nivel,menor:ganhou,antes:antes,otimizado:final.otimizado};
    var dif=antes?Math.round((1-final.bytes.length/antes)*100):0;
    var rotN={sem:'sem perder qualidade',leve:'leve',media:'recomendada',forte:'forte',imagem:'páginas como imagem'}[nivel];
    $('compResultado').innerHTML='<div><small>Antes</small><strong>'+tamanhoTxt(antes)+'</strong></div><div class="seta">→</div><div><small>Depois ('+rotN+')</small><strong>'+tamanhoTxt(final.bytes.length)+'</strong></div>'
      +'<div class="ganho">'+(ganhou?'<b>'+dif+'% menor</b> ('+esc(melhor.como)+').'+(melhor.como==='páginas como imagem'?' O texto deixou de ser selecionável.':' O texto continua selecionável.')+(nivel!=='sem'&&melhor.como==='sem compressão'?' O nível escolhido não ajudou neste arquivo: ficou só a reorganização.':'')
        :'<b style="color:var(--warning,#d97706)">Este arquivo já está otimizado: comprimir não reduz.</b> O melhor resultado foi '+tamanhoTxt(melhor.bytes.length)+'. '+(orig?'Vamos manter o ORIGINAL, sem mudança.':'Vamos usar o PDF sem compressão.')+(nivel!=='forte'&&nivel!=='imagem'?' Se quiser tentar mais forte, escolha "Forte" e calcule de novo.':''))+'</div>';
    $('compResultado').hidden=false;$('compBaixar').disabled=false;
    $('compBaixar').textContent=ganhou?'Usar o comprimido':'Continuar com o original';
  }catch(e){$('compErro').textContent='Não consegui comprimir. Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'. Nada mudou.';}
  finally{prog.classList.remove('ativo');$('compCalc').disabled=false;}
}
function baixarComp(){
  if(!_comp)return;
  var b=baseNome($('nomeSaida').value||nomeSugerido()).replace(/ \((editado|juntado)\)$/,'');
  fecharJanela('jComprimir');
  mostrarResultado({titulo:_comp.menor?'PDF comprimido':'Arquivo mantido',
    detalhe:_comp.menor?'Antes '+tamanhoTxt(_comp.antes)+' → depois '+tamanhoTxt(_comp.bytes.length)+' ('+Math.round((1-_comp.bytes.length/_comp.antes)*100)+'% menor).':'Este arquivo já está otimizado: comprimir não reduz. Ficou o '+(_comp.otimizado?'original':'PDF')+', com '+tamanhoTxt(_comp.bytes.length)+'.',
    alerta:!_comp.menor,
    arquivos:[{nome:b+(_comp.menor?' (comprimido)':'')+'.pdf',bytes:_comp.bytes,tipo:'application/pdf',paginas:E.paginas.length}]});
}

/* ---------- editar página (texto e tarja) ---------- */
var ED={p:null,esc:1,ferr:'texto',sel:null,arr:null};
async function abrirEditar(p){
  ED.p=p;ED.sel=null;
  abrirJanela('jEditar');
  await desenharPalco();
  escolherFerr(ED.ferr);
  setTimeout(function(){if(ED.ferr==='texto')$('edTexto').focus();},80);
}
async function desenharPalco(){
  var p=ED.p;if(!p)return;
  var i=E.paginas.indexOf(p);
  $('jEditarT').textContent='Editar a página '+(i+1);
  $('jEditarSub').textContent='Arquivo '+p.doc.letra+' ('+p.doc.nome+'), página '+(p.idx+1)+'. As mudanças entram no PDF ao baixar.';
  $('edAnt').disabled=i<=0;$('edProx').disabled=i>=E.paginas.length-1;
  $('edDefinitiva').checked=p.definitiva;
  var palco=$('palco'),cv=$('palcoCanvas');
  try{
    var pg=await p.doc.pdf.getPage(p.idx+1);
    var R=rot(p);var vp1=pg.getViewport({scale:1,rotation:R});
    var largura=Math.max(260,palco.clientWidth-26),altura=Math.max(300,palco.clientHeight-26||600);
    var ajuste=Math.min(largura/vp1.width,(window.innerWidth<900?9999:altura/vp1.height));
    ED.esc=ajuste;
    var dpr=Math.min(window.devicePixelRatio||1,2);
    var vp=pg.getViewport({scale:ajuste*dpr,rotation:R});
    cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
    cv.style.width=Math.round(vp.width/dpr)+'px';cv.style.height=Math.round(vp.height/dpr)+'px';
    await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  }catch(e){toast('Não consegui mostrar a página: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro'),'error');}
  desenharCamada();
}
function desenharCamada(){
  var p=ED.p,cam=$('camada');cam.innerHTML='';
  var R=rot(p),W=$('palcoCanvas').clientWidth,H=$('palcoCanvas').clientHeight;
  p.anot.forEach(function(a,k){
    var el=document.createElement('div');el.className='an'+(a.tipo==='tarja'?' tarja':'')+(ED.sel===a?' sel':'');el.dataset.k=k;
    if(a.tipo==='tarja'){
      var d1=u2d(a.ux1,a.uy1,R),d2=u2d(a.ux2,a.uy2,R);
      el.style.left=Math.min(d1[0],d2[0])*W+'px';el.style.top=Math.min(d1[1],d2[1])*H+'px';el.style.width=Math.abs(d2[0]-d1[0])*W+'px';el.style.height=Math.abs(d2[1]-d1[1])*H+'px';
      el.style.background=a.cor==='preto'?'#000':'#fff';el.style.boxShadow='0 0 0 1px rgba(0,0,0,.25)';
    }else{
      var d=u2d(a.ux,a.uy,R);var aparente=((a.r0-R)%360+360)%360;
      el.style.left=d[0]*W+'px';el.style.top=d[1]*H+'px';el.style.fontSize=(a.tam*ED.esc)+'px';el.style.color=corCss(a.cor);
      el.style.transform='rotate('+(-aparente)+'deg)';el.textContent=a.texto;
    }
    cam.appendChild(el);
  });
  cam.classList.toggle('modo-mover',ED.ferr==='mover');
  var s=ED.sel;
  $('edTirarSel').disabled=!s;
  $('edSelInfo').textContent=s?(s.tipo==='tarja'?'Tarja '+(s.cor==='preto'?'preta':'branca')+'. Arraste para mudar de lugar.':'Texto: "'+(s.texto.length>40?s.texto.slice(0,40)+'…':s.texto)+'". Mude o texto, o tamanho e a cor ao lado; arraste para mudar de lugar.'):'Nada escolhido. Use "Mover" e clique num texto ou tarja.';
}
function escolherFerr(v){
  ED.ferr=v;escolherPill('edFerr',v);
  $('edBlocoTexto').hidden=!(v==='texto'||(v==='mover'&&ED.sel&&ED.sel.tipo==='texto'));
  $('edBlocoTarja').hidden=v!=='tarja';
  $('edDica').textContent=v==='texto'?'Escreva no campo "Texto" e clique (ou toque) na página onde ele deve começar.':v==='tarja'?'Arraste sobre a página para cobrir a área (assinatura, CPF, dado que não deve aparecer).':'Clique num texto ou tarja para escolher; arraste para mudar de lugar.';
  desenharCamada();
}
function pontoFracao(e){var r=$('palcoCanvas').getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
function ligarCamada(){
  var cam=$('camada');
  cam.addEventListener('pointerdown',function(e){
    var p=ED.p;if(!p)return;var R=rot(p);var f=pontoFracao(e);
    var alvo=e.target.closest('.an');
    if(alvo&&(ED.ferr==='mover'||ED.ferr==='texto')){
      var a=p.anot[+alvo.dataset.k];ED.sel=a;
      if(ED.ferr==='texto')escolherFerr('mover');
      if(a.tipo==='texto'){$('edTexto').value=a.texto;$('edTam').value=a.tam;$('edCor').value=a.cor;$('edBlocoTexto').hidden=false;}
      guardarHistorico();
      ED.arr={tipo:'mover',a:a,ini:f,orig:Object.assign({},a),R:R};cam.setPointerCapture(e.pointerId);desenharCamada();e.preventDefault();return;
    }
    if(ED.ferr==='mover'){ED.sel=null;desenharCamada();return;}
    if(ED.ferr==='texto'){
      var t=$('edTexto').value.replace(/\s+$/,'');
      if(!t){toast('Escreva o texto ao lado antes de clicar na página.');$('edTexto').focus();return;}
      guardarHistorico();
      var u=d2u(f[0],f[1],R);
      var an={tipo:'texto',ux:u[0],uy:u[1],texto:t,tam:Math.max(6,Math.min(72,parseInt($('edTam').value,10)||12)),cor:$('edCor').value,r0:R};
      p.anot.push(an);ED.sel=an;escolherFerr('mover');$('edBlocoTexto').hidden=false;
      desenharUm(p);return;
    }
    if(ED.ferr==='tarja'){
      ED.arr={tipo:'tarja',ini:f,R:R};var r=document.createElement('div');r.className='rasc';cam.appendChild(r);ED.arr.el=r;cam.setPointerCapture(e.pointerId);e.preventDefault();
    }
  });
  cam.addEventListener('pointermove',function(e){
    var a=ED.arr;if(!a)return;var f=pontoFracao(e);var W=$('palcoCanvas').clientWidth,H=$('palcoCanvas').clientHeight;
    if(a.tipo==='tarja'){
      a.el.style.left=Math.min(a.ini[0],f[0])*W+'px';a.el.style.top=Math.min(a.ini[1],f[1])*H+'px';a.el.style.width=Math.abs(f[0]-a.ini[0])*W+'px';a.el.style.height=Math.abs(f[1]-a.ini[1])*H+'px';
    }else if(a.tipo==='mover'){
      var dx=f[0]-a.ini[0],dy=f[1]-a.ini[1],o=a.orig,R=a.R;
      if(o.tipo==='texto'){var d=u2d(o.ux,o.uy,R);var u=d2u(d[0]+dx,d[1]+dy,R);a.a.ux=u[0];a.a.uy=u[1];}
      else{var d1=u2d(o.ux1,o.uy1,R),d2=u2d(o.ux2,o.uy2,R);var u1=d2u(d1[0]+dx,d1[1]+dy,R),u2=d2u(d2[0]+dx,d2[1]+dy,R);a.a.ux1=u1[0];a.a.uy1=u1[1];a.a.ux2=u2[0];a.a.uy2=u2[1];}
      desenharCamada();
    }
  });
  var soltar=function(e){
    var a=ED.arr;if(!a)return;ED.arr=null;
    if(a.tipo==='tarja'){
      var f=pontoFracao(e);a.el.remove();
      if(Math.abs(f[0]-a.ini[0])<0.005||Math.abs(f[1]-a.ini[1])<0.005)return;
      guardarHistorico();
      var u1=d2u(a.ini[0],a.ini[1],a.R),u2=d2u(f[0],f[1],a.R);
      var an={tipo:'tarja',ux1:u1[0],uy1:u1[1],ux2:u2[0],uy2:u2[1],cor:$('edTarjaCor').value};
      ED.p.anot.push(an);ED.p.definitiva=$('edDefinitiva').checked;ED.sel=an;desenharCamada();desenharUm(ED.p);
    }else{
      // movimento sem sair do lugar: tira o registro do histórico que não mudou nada
      var o=a.orig,x=a.a;if(o.ux===x.ux&&o.uy===x.uy&&o.ux1===x.ux1&&o.uy1===x.uy1)E.historico.pop();
      $('bDesfazer').disabled=!E.historico.length;
    }
  };
  cam.addEventListener('pointerup',soltar);cam.addEventListener('pointercancel',soltar);
  function mudarSel(){var s=ED.sel;if(!s||s.tipo!=='texto')return;var t=$('edTexto').value.replace(/\s+$/,'');if(!t)return;s.texto=t;s.tam=Math.max(6,Math.min(72,parseInt($('edTam').value,10)||12));s.cor=$('edCor').value;desenharCamada();}
  $('edTexto').addEventListener('input',function(){if(ED.ferr==='mover')mudarSel();});
  $('edTam').addEventListener('input',function(){if(ED.ferr==='mover')mudarSel();});
  $('edCor').addEventListener('change',function(){if(ED.ferr==='mover')mudarSel();});
  $('edDefinitiva').addEventListener('change',function(){if(ED.p){ED.p.definitiva=this.checked;}});
  $('edTirarSel').addEventListener('click',function(){var s=ED.sel;if(!s)return;guardarHistorico();ED.p.anot=ED.p.anot.filter(function(x){return x!==s;});ED.sel=null;desenharCamada();desenharUm(ED.p);});
  $('edFerr').addEventListener('click',function(e){var b=e.target.closest('.pill');if(!b)return;if(b.dataset.v!=='mover')ED.sel=null;escolherFerr(b.dataset.v);});
  $('edAnt').addEventListener('click',function(){var i=E.paginas.indexOf(ED.p);if(i>0){ED.p=E.paginas[i-1];ED.sel=null;desenharPalco();}});
  $('edProx').addEventListener('click',function(){var i=E.paginas.indexOf(ED.p);if(i<E.paginas.length-1){ED.p=E.paginas[i+1];ED.sel=null;desenharPalco();}});
  document.addEventListener('keydown',function(e){
    if(!$('jEditar').classList.contains('aberto'))return;
    if((e.key==='Delete'||e.key==='Backspace')&&ED.sel&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('edTirarSel').click();}
  });
}

/* ---------- veio da ficha: abrir o documento e guardar o resultado ---------- */
async function abrirDaFicha(docId){
  var av=aviso('atencao','Abrindo o documento da ficha…','O arquivo vem da pasta do cliente só para este navegador. O que você fizer aqui fica no computador até você baixar ou clicar em "Guardar na pasta do cliente".');
  try{
    var r=await _sb.from('documentos').select('id,processo_id,pessoa_id,pasta_id,nome_arquivo,caminho_storage,tipo_documento').eq('id',docId).maybeSingle();
    if(r.error)throw r.error;
    if(!r.data)throw new Error('o documento não foi encontrado ou você não tem permissão para vê-lo');
    var d=r.data;
    var u=await _sb.storage.from(BUCKET).createSignedUrl(d.caminho_storage,300);
    if(u.error||!u.data)throw (u.error||new Error('não foi possível abrir o arquivo no armazenamento'));
    var resp=await fetch(u.data.signedUrl,{cache:'no-store'});
    if(!resp.ok)throw new Error('o armazenamento respondeu erro '+resp.status);
    var bytes=new Uint8Array(await resp.arrayBuffer());
    tirarAviso(av);
    E.origem=d;
    var ok=await abrirBytes(bytes,d.nome_arquivo||'documento.pdf',null,d);
    if(ok){
      var linkF=FICHA+'?pessoa_id='+encodeURIComponent(d.pessoa_id||'')+(d.processo_id?'&processo_id='+encodeURIComponent(d.processo_id):'');
      aviso('atencao','Documento da ficha aberto: "'+(d.nome_arquivo||'')+'".','Escolha abaixo o que fazer com ele. No fim, "Guardar na pasta do cliente" já vem com este cliente, processo e pasta (vira um documento novo; o original continua lá).',[{rotulo:'Voltar para a ficha',fazer:function(){location.href=linkF;}}]);
      irPara('inicio');
    }
  }catch(e){
    tirarAviso(av);
    aviso('erro','Não consegui abrir o documento da ficha.','Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'. Baixe o documento na ficha e arraste para cá.');
  }
}
/* =====================================================================
   16/11 (Dr. Victor): tela inicial em CARTÕES (todas as funções à vista), conversões (Word, imagens, PDF→imagem)
   e, depois de CADA operação, a tela de resultado: Guardar na pasta do cliente, Baixar, Compartilhar
   e "Fazer outra operação com este arquivo" (encadear sem baixar e subir de novo).
   ===================================================================== */
function svg(d){return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>';}
var IC={
  juntar:svg('<rect x="3" y="4" width="8" height="11" rx="1.5"/><rect x="13" y="9" width="8" height="11" rx="1.5"/><path d="M9 18h3m0 0l-1.5-1.5M12 18l-1.5 1.5"/>'),
  separar:svg('<path d="M6 4v16M18 4v16M10 12h4"/><path d="M12 9l-2 3 2 3M12 9l2 3-2 3"/>'),
  extrair:svg('<path d="M8 3h8l3 3v6M5 21V5a2 2 0 012-2"/><path d="M13 17h8m0 0l-3-3m3 3l-3 3"/>'),
  tirar:svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>'),
  girar:svg('<path d="M20 9a8 8 0 10-2 9"/><path d="M20 4v5h-5"/>'),
  organizar:svg('<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7m-2.5-2.5l2.5 2.5-2.5 2.5"/>'),
  numerar:svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 15h2v3M12 15v3"/>'),
  escrever:svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
  comprimir:svg('<path d="M8 3v6H2M16 3v6h6M8 21v-6H2M16 21v-6h6"/>'),
  word:svg('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12l1.2 5 1.3-4 1.3 4 1.2-5"/>'),
  imagens:svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M3 17l5-5 4 4 3-3 6 6"/>'),
  pdfimg:svg('<path d="M14 3H7a2 2 0 00-2 2v5"/><path d="M14 3v5h5v2"/><rect x="9" y="12" width="12" height="9" rx="1.5"/><path d="M9 19l3-3 2.5 2.5 2-2 4.5 4"/>')
};
var FERR=[
  {k:'juntar',g:'Organizar',nome:'Juntar PDFs',desc:'Vários PDFs num só, na ordem que você escolher.',aceita:'pdf',botao:'Juntar e gerar o PDF',pronto:'PDFs juntados',dica:'Use "Mais PDFs" para acrescentar e arraste as páginas para a ordem certa.'},
  {k:'separar',g:'Organizar',nome:'Separar PDF',desc:'Cada página, intervalos (1-3, 5) ou de tantas em tantas.',aceita:'pdf',botao:'Separar…',abre:'separar',dica:'Escolha como separar. Vários arquivos vêm juntos num .zip.'},
  {k:'extrair',g:'Organizar',nome:'Extrair páginas',desc:'Um PDF novo só com as páginas que você marcar.',aceita:'pdf',botao:'Extrair as marcadas',pronto:'Páginas extraídas',dica:'Clique nas páginas que quer levar (ficam marcadas) e depois em "Extrair as marcadas".'},
  {k:'tirar',g:'Organizar',nome:'Tirar páginas',desc:'Apagar do PDF as páginas que não servem.',aceita:'pdf',botao:'Gerar o PDF sem elas',pronto:'Páginas tiradas',dica:'Marque as páginas e clique em "Tirar marcadas" (ou na lixeira de cada página).'},
  {k:'girar',g:'Organizar',nome:'Girar páginas',desc:'Pôr em pé a página escaneada de lado.',aceita:'pdf',botao:'Gerar o PDF',pronto:'Páginas giradas',dica:'Use a seta de cada página, ou marque várias e use "Girar à esq./dir.".'},
  {k:'organizar',g:'Organizar',nome:'Reordenar páginas',desc:'Arrastar as páginas para a ordem certa.',aceita:'pdf',botao:'Gerar o PDF',pronto:'PDF reorganizado',dica:'Arraste as páginas (no celular, segure e arraste, ou use as setinhas ‹ ›).'},
  {k:'numerar',g:'Editar',nome:'Numerar páginas',desc:'1, 1 / 10, Página 1 de 10 ou Fls. 1; capa sem número.',aceita:'pdf',botao:'Gerar o PDF numerado',pronto:'PDF numerado',abre:'numerar',dica:'Escolha o formato do número; depois clique em "Gerar o PDF numerado".'},
  {k:'escrever',g:'Editar',nome:'Escrever ou tapar',desc:'Pôr um texto, ou cobrir assinatura, CPF ou dado sigiloso.',aceita:'pdf',botao:'Gerar o PDF',pronto:'PDF editado',dica:'Clique no lápis da página para escrever ou tapar uma área.'},
  {k:'comprimir',g:'Otimizar',nome:'Comprimir PDF',desc:'Reduzir o tamanho, mantendo o texto. Se não diminuir, avisa.',aceita:'pdf',botao:'Comprimir…',abre:'comprimir',dica:'Escolha o nível e clique em "Calcular".'},
  {k:'word',g:'Converter',nome:'Word para PDF',desc:'Arquivo .docx vira PDF aqui mesmo, sem ir para site nenhum.',aceita:'docx'},
  {k:'imagens',g:'Converter',nome:'Imagens para PDF',desc:'Fotos do celular, JPG e PNG viram um PDF.',aceita:'img'},
  {k:'pdfimg',g:'Converter',nome:'PDF para imagem',desc:'Cada página vira uma imagem JPG ou PNG.',aceita:'pdf',botao:'Converter em imagens…',abre:'paraimagem',dica:'Escolha o formato e a definição.'}
];
function ferrPorK(k){return FERR.find(function(f){return f.k===k;});}
function ferr(){return ferrPorK(E.ferr||'organizar')||ferrPorK('organizar');}
function desenharCartoes(){
  // todas as funções numa grade só (como no iLovePDF), com o grupo em selo discreto
  $('cartoes').innerHTML='<div class="cartoes-g">'+FERR.map(function(f){
    return '<button type="button" class="cartao" data-ferr="'+f.k+'"><span class="topo-c"><span class="ic">'+IC[f.k]+'</span><span class="selo">'+esc(f.g)+'</span></span><b>'+esc(f.nome)+'</b><span class="d">'+esc(f.desc)+'</span></button>';
  }).join('')+'</div>';
}
function irPara(tela){
  ['inicio','trabalho','resultado'].forEach(function(t){var el=$('tela'+t.charAt(0).toUpperCase()+t.slice(1));var v=t===tela;if(el.hidden===!v)return;el.hidden=!v;});
  E.tela=tela;
  if(tela==='inicio')atualizarBanner();
  window.scrollTo({top:0,behavior:semMovimento()?'auto':'smooth'});
}
function atualizarBanner(){
  var tem=E.paginas.length>0;$('atualBanner').hidden=!tem;
  if(!tem)return;
  var usados=E.docs.filter(function(d){return E.paginas.some(function(p){return p.doc===d;});});
  $('atualNome').textContent=nomeLimpo($('nomeSaida').value||nomeSugerido());
  $('atualInfo').textContent=E.paginas.length+' página'+(E.paginas.length!==1?'s':'')+(usados.length>1?' de '+usados.length+' arquivos':'')+(E.origem&&E.origem.processo_id?' · veio da pasta do cliente':'');
}
function escolherTipo(){
  // a zona "arraste aqui": aceita tudo
  var inp=$('entradaArquivos');inp.setAttribute('accept','application/pdf,.pdf,image/*,.heic,.heif,.docx,.doc');inp.click();
  setTimeout(function(){inp.setAttribute('accept','application/pdf,.pdf');},1500);
}
function escolherFerramenta(k){
  var f=ferrPorK(k);if(!f)return;
  if(f.aceita==='docx'){E.esperaFerr=k;$('entradaWord').click();return;}
  if(f.aceita==='img'){E.esperaFerr=k;abrirImagens([]);return;}
  if(E.paginas.length){entrarTrabalho(k);return;}
  E.esperaFerr=k;var inp=$('entradaArquivos');inp.multiple=true;inp.click();
}
async function receberArquivos(lista){
  var arqs=Array.prototype.slice.call(lista||[]);if(!arqs.length)return;
  var pdfs=[],imgs=[],words=[],outros=[];
  arqs.forEach(function(f){var n=(f.name||'').toLowerCase(),t=f.type||'';
    if(/\.pdf$/.test(n)||t==='application/pdf')pdfs.push(f);
    else if(/^image\//.test(t)||/\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/.test(n))imgs.push(f);
    else if(/\.docx?$/.test(n)||/wordprocessingml|msword/.test(t))words.push(f);
    else outros.push(f);});
  outros.forEach(function(f){aviso('erro','"'+f.name+'" não foi aberto.','Motivo: o Editor abre PDF, imagens (JPG, PNG, foto do celular) e Word (.docx). Este formato não é nenhum deles.');});
  var k=E.esperaFerr;E.esperaFerr=null;
  if(words.length){for(var i=0;i<words.length;i++)await converterWord(words[i]);}
  if(imgs.length){abrirImagens(imgs);}
  if(pdfs.length){
    var antes=E.paginas.length;
    for(var j=0;j<pdfs.length;j++){var by;try{by=new Uint8Array(await pdfs[j].arrayBuffer());}catch(e){aviso('erro','"'+pdfs[j].name+'" não foi aberto.','Motivo: o navegador não conseguiu ler o arquivo ('+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro')+').');continue;}await abrirBytes(by,pdfs[j].name,null);}
    if(E.paginas.length>antes){
      if(E.tela!=='trabalho'||k)entrarTrabalho(k||(E.docs.length>1?'juntar':(E.ferr||'organizar')));
    }
  }
}
function entrarTrabalho(k){
  E.ferr=k||E.ferr||'organizar';var f=ferr();
  $('ferrIc').innerHTML=IC[f.k]||'';$('ferrNome').textContent=f.nome;$('ferrDica').textContent=f.dica||'';
  irPara('trabalho');desenhar();
  if(f.abre==='separar')setTimeout(function(){$('bSeparar').click();},120);
  else if(f.abre==='numerar')setTimeout(abrirNumerar,120);
  else if(f.abre==='comprimir')setTimeout(abrirComprimir,120);
  else if(f.abre==='paraimagem')setTimeout(abrirParaImagem,120);
}
function atualizarConcluir(){
  var f=ferr();var b=$('bConcluir');if(!b)return;
  $('tConcluir').textContent=f.botao||'Gerar o PDF';
  b.disabled=!E.paginas.length||(f.k==='extrair'&&!E.sel.size);
  b.title=f.k==='extrair'&&!E.sel.size?'Marque primeiro as páginas que quer extrair':'';
}
function concluir(){
  var f=ferr();
  if(f.abre==='separar'){$('bSeparar').click();return;}
  if(f.abre==='comprimir'){abrirComprimir();return;}
  if(f.abre==='paraimagem'){abrirParaImagem();return;}
  if(f.k==='extrair'){extrairMarcadas();return;}
  gerarTudo();
}
function limparTrabalho(){
  E.docs.forEach(function(d){try{d.pdf.destroy();}catch(e){}});
  E.docs=[];E.paginas=[];E.sel.clear();E.historico=[];E.numeracao=null;E.nomeTocado=false;E.origem=null;E.pendente=false;
  $('nomeSaida').value='';$('bDesfazer').disabled=true;$('grade').innerHTML='';desenhar();
}

/* ---------- Word → PDF ---------- */
async function converterWord(file){
  if(!window.SagaWordPdf){aviso('erro','O conversor de Word não carregou.','Atualize a página (F5). Se continuar, avise o administrador.');return;}
  var prog=$('cvProg');$('jConverterSub').textContent='"'+file.name+'" · tudo neste computador: o arquivo não vai para nenhum site.';
  progresso(prog,0,1,'Lendo o arquivo…');abrirJanela('jConverter');
  try{
    var bytes=new Uint8Array(await file.arrayBuffer());
    var r=await SagaWordPdf.converter(bytes,{titulo:baseNome(file.name.replace(/\.docx?$/i,'')),progresso:function(x,t){progresso(prog,x,1,t);}});
    fecharJanela('jConverter');
    var nome=file.name.replace(/\.docx?$/i,'')+'.pdf';
    mostrarResultado({titulo:'Word convertido em PDF',detalhe:r.paginas+' página'+(r.paginas!==1?'s':'')+' · '+tamanhoTxt(r.bytes.length)+'. Confira o PDF antes de protocolar: abra pelo "Baixar" ou continue com "Fazer outra operação".',
      avisos:r.avisos,alerta:r.avisos.length>0,
      nota:'Conversão feita no próprio navegador. Documentos simples (petições, contratos, procurações) saem fiéis; se algo complexo sair diferente, no Word use Arquivo > Salvar como > PDF.',
      arquivos:[{nome:nome,bytes:r.bytes,tipo:'application/pdf',paginas:r.paginas}]});
  }catch(e){
    fecharJanela('jConverter');
    aviso('erro','"'+file.name+'" não foi convertido.','Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'. Alternativa: abra no Word e use Arquivo > Salvar como > PDF; depois traga o PDF para cá.');
  }
}

/* ---------- Imagens → PDF ---------- */
var IMG={lista:[]};
function abrirImagens(files){
  if(!$('jImagens').classList.contains('aberto')){IMG.lista=[];$('imgErro').textContent='';}
  abrirJanela('jImagens');
  if(files&&files.length)acrescentarImagens(files);else if(!IMG.lista.length)$('entradaImagens').click();
  desenharListaImg();
}
function acrescentarImagens(files){
  Array.prototype.forEach.call(files||[],function(f){
    if(!/^image\//.test(f.type||'')&&!/\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i.test(f.name)){$('imgErro').textContent='"'+f.name+'" não é imagem e ficou de fora.';return;}
    IMG.lista.push({id:novoId(),file:f,url:URL.createObjectURL(f)});
  });
  desenharListaImg();
}
function desenharListaImg(){
  var l=IMG.lista;
  $('imgLista').innerHTML=l.length?l.map(function(x,i){
    return '<div class="li" data-id="'+x.id+'"><img src="'+x.url+'" alt="" onerror="this.style.visibility=\'hidden\'"><span class="nm">'+(i+1)+'. '+esc(x.file.name)+'<small>'+tamanhoTxt(x.file.size)+'</small></span>'
      +'<button type="button" data-img="sobe" title="Subir" aria-label="Subir"'+(i===0?' disabled':'')+'>▲</button><button type="button" data-img="desce" title="Descer" aria-label="Descer"'+(i===l.length-1?' disabled':'')+'>▼</button><button type="button" data-img="tira" title="Tirar" aria-label="Tirar da lista">×</button></div>';
  }).join(''):'<div class="dica">Nenhuma imagem ainda. Clique em "+ Mais imagens" ou arraste as fotos para cá.</div>';
  $('imgOk').disabled=!l.length;
}
async function imagensParaPdf(lista,op){
  op=op||{};var L=PDFLib;var out=await L.PDFDocument.create();out.setProducer('SAGA ADV · Editor de PDF');out.setCreator('SAGA ADV');
  var margem=op.margem==null?20:op.margem,falhas=[];
  for(var i=0;i<lista.length;i++){
    var f=lista[i];if(op.progresso)op.progresso(i,lista.length,f.name);
    var bmp;
    try{bmp=await createImageBitmap(f,{imageOrientation:'from-image'});}
    catch(e){falhas.push({nome:f.name,motivo:/\.hei[cf]$/i.test(f.name)||/heic|heif/.test(f.type||'')?'foto no formato HEIC do iPhone, que este navegador não abre. No iPhone: Ajustes > Câmera > Formatos > "Mais Compatível" (as próximas fotos saem em JPG), ou mande a foto pelo próprio iPhone (o Safari já converte)':'o navegador não conseguiu abrir esta imagem (arquivo corrompido ou formato desconhecido)'});continue;}
    var w=bmp.width,h=bmp.height,s=1;
    if(op.qualidade!=='orig'){s=Math.min(1,2200/Math.max(w,h));}
    var cw=Math.max(1,Math.round(w*s)),ch=Math.max(1,Math.round(h*s));
    var cv=document.createElement('canvas');cv.width=cw;cv.height=ch;var c=cv.getContext('2d');
    var png=/png$/i.test(f.type||'')||/\.png$/i.test(f.name);
    if(!png){c.fillStyle='#fff';c.fillRect(0,0,cw,ch);}
    c.imageSmoothingQuality='high';c.drawImage(bmp,0,0,cw,ch);try{bmp.close();}catch(e){}
    var blob=await new Promise(function(ok){cv.toBlob(ok,png?'image/png':'image/jpeg',op.qualidade==='orig'?0.92:0.8);});
    if(png&&blob&&op.qualidade!=='orig'){
      // PNG de foto (não de print) fica bem menor em JPG: usa o JPG só quando ganha muito
      var cj=document.createElement('canvas');cj.width=cw;cj.height=ch;var x2=cj.getContext('2d');x2.fillStyle='#fff';x2.fillRect(0,0,cw,ch);x2.drawImage(cv,0,0);
      var bj=await new Promise(function(ok){cj.toBlob(ok,'image/jpeg',0.8);});cj.width=cj.height=0;
      if(bj&&bj.size<blob.size*0.5){blob=bj;png=false;}
    }
    cv.width=cv.height=0;
    if(!blob){falhas.push({nome:f.name,motivo:'faltou memória para preparar a imagem'});continue;}
    var by=new Uint8Array(await blob.arrayBuffer());
    var img=png?await out.embedPng(by):await out.embedJpg(by);
    var pw,ph;
    if(op.pagina==='imagem'){pw=w*72/150;ph=h*72/150;if(Math.max(pw,ph)>1400){var k2=1400/Math.max(pw,ph);pw*=k2;ph*=k2;}pw+=margem*2;ph+=margem*2;}
    else{if(w>h){pw=841.89;ph=595.28;}else{pw=595.28;ph=841.89;}}
    var pag=out.addPage([pw,ph]);
    var aw=pw-margem*2,ah=ph-margem*2,esc_=Math.min(aw/w,ah/h);if(op.pagina==='imagem')esc_=aw/w;
    var dw=w*esc_,dh=h*esc_;
    pag.drawImage(img,{x:(pw-dw)/2,y:(ph-dh)/2,width:dw,height:dh});
  }
  if(op.progresso)op.progresso(lista.length,lista.length,'');
  if(!out.getPageCount())return {bytes:null,falhas:falhas};
  return {bytes:await out.save({useObjectStreams:true}),falhas:falhas,paginas:out.getPageCount()};
}
async function gerarImagensPdf(){
  if(!IMG.lista.length)return;
  var prog=$('imgProg');prog.classList.add('ativo');$('imgOk').disabled=true;$('imgErro').textContent='';
  try{
    var r=await imagensParaPdf(IMG.lista.map(function(x){return x.file;}),{pagina:valorPill('imgPagina'),margem:+valorPill('imgMargem'),qualidade:valorPill('imgQualidade'),progresso:function(i,n,nm){progresso(prog,i,n,i<n?'Imagem '+(i+1)+' de '+n+(nm?': '+nm:''):'Gravando…');}});
    if(!r.bytes){$('imgErro').textContent='Nenhuma imagem pôde ser lida. '+r.falhas.map(function(f){return '"'+f.nome+'": '+f.motivo;}).join(' · ');return;}
    fecharJanela('jImagens');
    var nome=IMG.lista.length===1?IMG.lista[0].file.name.replace(/\.[^.]+$/,'')+'.pdf':'Imagens ('+r.paginas+').pdf';
    IMG.lista.forEach(function(x){URL.revokeObjectURL(x.url);});IMG.lista=[];
    mostrarResultado({titulo:'Imagens convertidas em PDF',detalhe:r.paginas+' página'+(r.paginas!==1?'s':'')+' · '+tamanhoTxt(r.bytes.length)+'.',alerta:r.falhas.length>0,
      avisos:r.falhas.map(function(f){return '"'+f.nome+'" ficou de fora: '+f.motivo+'.';}),
      arquivos:[{nome:nome,bytes:r.bytes,tipo:'application/pdf',paginas:r.paginas}]});
  }catch(e){$('imgErro').textContent='Não consegui gerar o PDF. Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'.';}
  finally{prog.classList.remove('ativo');$('imgOk').disabled=!IMG.lista.length;}
}

/* ---------- PDF → imagem ---------- */
function abrirParaImagem(){$('piErro').textContent='';escolherPill('piPaginas',E.sel.size?'marcadas':'todas');abrirJanela('jParaImagem');}
async function converterParaImagem(){
  var fmt=valorPill('piFormato')||'jpg',dpi=+(valorPill('piDpi')||150),so=valorPill('piPaginas')==='marcadas';
  var lista=so?E.paginas.filter(function(p){return E.sel.has(p.id);}):E.paginas.slice();
  if(!lista.length){$('piErro').textContent=so?'Nenhuma página marcada. Marque as páginas ou escolha "Todas".':'Não há páginas.';return;}
  var prog=$('piProg');prog.classList.add('ativo');$('piOk').disabled=true;$('piErro').textContent='';
  var base=baseNome($('nomeSaida').value||nomeSugerido()).replace(/ \((editado|juntado)\)$/,'');
  try{
    var arqs=[];
    for(var i=0;i<lista.length;i++){
      progresso(prog,i,lista.length,'Página '+(i+1)+' de '+lista.length);
      var p=lista[i],pg=await p.doc.pdf.getPage(p.idx+1),R=rot(p),esc_=dpi/72;
      var vp=pg.getViewport({scale:esc_,rotation:R});if(Math.max(vp.width,vp.height)>7000){esc_*=7000/Math.max(vp.width,vp.height);vp=pg.getViewport({scale:esc_,rotation:R});}
      var cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);var ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
      await pg.render({canvasContext:ctx,viewport:vp,background:'#fff'}).promise;
      desenharAnotacoesCanvas(ctx,p,cv.width,cv.height,esc_);
      var blob=await new Promise(function(ok){cv.toBlob(ok,fmt==='png'?'image/png':'image/jpeg',0.88);});cv.width=cv.height=0;
      if(!blob)throw new Error('faltou memória na página '+(E.paginas.indexOf(p)+1)+' (tente a definição "Tela")');
      arqs.push({nome:base+' - pagina '+(E.paginas.indexOf(p)+1)+'.'+fmt,bytes:new Uint8Array(await blob.arrayBuffer()),tipo:fmt==='png'?'image/png':'image/jpeg'});
    }
    fecharJanela('jParaImagem');
    mostrarResultado({titulo:'PDF convertido em imagem',detalhe:arqs.length+(arqs.length>1?' imagens ':' imagem ')+fmt.toUpperCase()+' ('+dpi+' dpi)'+(arqs.length>1?'. "Baixar" traz todas juntas num .zip.':'.'),zip:base+' (imagens).zip',arquivos:arqs});
  }catch(e){$('piErro').textContent='Não consegui converter. Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'.';}
  finally{prog.classList.remove('ativo');$('piOk').disabled=false;}
}

/* ---------- resultado ---------- */
function mostrarResultado(r){
  r.salvo=false;r.arquivos.forEach(function(a){a.guardado=null;});
  E.resultado=r;desenharResultado();irPara('resultado');
}
function ehPdf(a){return a.tipo==='application/pdf';}
function desenharResultado(){
  var r=E.resultado;if(!r)return;var n=r.arquivos.length,um=n===1,a0=r.arquivos[0];
  var ok='<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var al='<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" stroke-width="1.6"/></svg>';
  var h='<div class="res"><div class="res-cab"><span class="res-ok'+(r.alerta?' alerta':'')+'">'+(r.alerta?al:ok)+'</span><div><h2>'+esc(r.titulo)+'</h2><p>'+esc(r.detalhe||'')+'</p></div></div>';
  if(r.avisos&&r.avisos.length)h+='<div class="aviso atencao res-avisos"><div><b>Atenção, confira:</b><ul>'+r.avisos.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div></div>';
  if(r.nota)h+='<p class="dica" style="font-size:11.5px;color:var(--muted);margin-top:10px;line-height:1.5">'+esc(r.nota)+'</p>';
  h+='<div class="res-arqs">'+r.arquivos.map(function(a,i){
    return '<div class="res-arq" data-i="'+i+'"><span class="res-mini" data-mini="'+i+'"></span><div class="res-info">'
      +(um?'<label class="sr" for="resNome">Nome do arquivo</label><input id="resNome" value="'+esc(a.nome)+'" spellcheck="false">':'<b style="font-size:12.5px;font-weight:600;word-break:break-word">'+esc(a.nome)+'</b>')
      +'<small>'+(ehPdf(a)?'PDF':a.tipo==='image/png'?'Imagem PNG':'Imagem JPG')+' · '+tamanhoTxt(a.bytes.length)+(a.paginas?' · '+a.paginas+' página'+(a.paginas>1?'s':''):'')+'</small>'
      +(a.guardado?'<small class="guardado">✓ Guardado na pasta do cliente: '+esc(a.guardado.onde)+'</small>':'')+'</div>'
      +(um?'':'<div class="linha" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" type="button" data-res-baixar="'+i+'">Baixar</button>'+(ehPdf(a)?'<button class="btn" type="button" data-res-continuar="'+i+'">Continuar com este</button>':'')+'</div>')
      +'</div>';
  }).join('')+'</div>';
  var podeCont=um&&ehPdf(a0);
  var algumGuardado=r.arquivos.some(function(a){return a.guardado;});
  h+='<div class="res-acoes">'
    +'<button type="button" class="res-acao principal" id="resGuardar"><span class="ic">'+svg('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M12 10v6m0 0l-2.5-2.5M12 16l2.5-2.5"/>')+'</span><span><b>Guardar na pasta do cliente</b><small>'+(algumGuardado?'Já guardado; pode guardar em outro cliente':'Escolher cliente, processo e pasta')+'</small></span></button>'
    +'<button type="button" class="res-acao" id="resBaixar"><span class="ic">'+svg('<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>')+'</span><span><b>Baixar</b><small>'+(um?'Para a pasta de downloads':'Todos num .zip')+'</small></span></button>'
    +'<button type="button" class="res-acao" id="resCompartilhar"><span class="ic">'+svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>')+'</span><span><b>Compartilhar</b><small>Link do SAGA com prazo, WhatsApp ou e-mail</small></span></button>'
    +'<button type="button" class="res-acao" id="resContinuar"'+(podeCont?'':' disabled title="'+(um?'Só um PDF pode seguir para outra operação':'Escolha "Continuar com este" no arquivo')+'"')+'><span class="ic">'+svg('<path d="M4 12h12m0 0l-4-4m4 4l-4 4"/><path d="M20 5v14"/>')+'</span><span><b>Fazer outra operação com este arquivo</b><small>Converter → comprimir → guardar, sem baixar e subir de novo</small></span></button>'
    +'</div>';
  h+='<div class="res-rod">'+(E.paginas.length?'<button class="btn" type="button" id="resVoltar">Voltar e ajustar</button>':'')+'<button class="btn" type="button" id="resInicio">Todas as ferramentas</button><button class="btn" type="button" id="resNovo">Começar de novo</button></div></div>';
  $('telaResultado').innerHTML=h;
  r.arquivos.forEach(function(a,i){miniatura(a,document.querySelector('[data-mini="'+i+'"]'));});
}
async function miniatura(a,el){
  if(!el)return;
  try{
    if(!ehPdf(a)){var u=URL.createObjectURL(new Blob([a.bytes],{type:a.tipo}));var im=document.createElement('img');im.onload=function(){setTimeout(function(){URL.revokeObjectURL(u);},1000);};im.src=u;el.appendChild(im);return;}
    var pdfjs=await carregarPdfjs();var d=await pdfjs.getDocument({data:a.bytes.slice(),isEvalSupported:false}).promise;var pg=await d.getPage(1);
    var v1=pg.getViewport({scale:1}),dpr=Math.min(window.devicePixelRatio||1,2),s=Math.min(54/v1.width,70/v1.height)*dpr,vp=pg.getViewport({scale:s});
    var cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);cv.style.width=Math.round(vp.width/dpr)+'px';
    await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;el.appendChild(cv);d.destroy();
  }catch(e){el.textContent='PDF';}
}
function nomeResultado(i){var r=E.resultado,a=r.arquivos[i];var inp=$('resNome');if(inp&&r.arquivos.length===1){var v=inp.value.trim();if(v){var ext=ehPdf(a)?'.pdf':(a.tipo==='image/png'?'.png':'.jpg');a.nome=v.replace(/[\\/:*?"<>|]+/g,'-');if(!new RegExp('\\'+ext+'$','i').test(a.nome))a.nome+=ext;}}return a.nome;}
function baixarResultado(i){
  var r=E.resultado;if(!r)return;
  if(i==null&&r.arquivos.length>1){baixarBytes(zipar(r.arquivos.map(function(a){return {nome:a.nome,bytes:a.bytes};})),r.zip||'arquivos.zip','application/zip');}
  else{var a=r.arquivos[i||0];baixarBytes(a.bytes,nomeResultado(i||0),a.tipo);}
  r.salvo=true;E.pendente=false;toast('Baixado. Veja na pasta de downloads.','success');
}
async function continuarCom(i){
  var r=E.resultado,a=r.arquivos[i];if(!a||!ehPdf(a))return;
  var nome=nomeResultado(i);var origem=a.guardado?a.guardado.doc:(E.origem||null);
  limparTrabalho();
  E.origem=origem;
  var ok=await abrirBytes(a.bytes.slice(),nome,null,origem);
  if(!ok)return;
  $('nomeSaida').value=nome;E.nomeTocado=true;E.pendente=!a.guardado&&!r.salvo;E.historico=[];$('bDesfazer').disabled=true;
  E.ferr=null;E.resultado=null;
  irPara('inicio');toast('Pronto: escolha a próxima operação para "'+nome+'".');
}

/* ---------- guardar na pasta do cliente ---------- */
var G={pessoa:null,processos:[],pastas:[],busca:0};
function abrirGuardar(){
  var r=E.resultado;if(!r)return;
  $('guardarErro').textContent='';
  $('jGuardarSub').textContent=r.arquivos.length>1?r.arquivos.length+' arquivos vão para a mesma pasta, como documentos NOVOS na ficha.':'Escolha o cliente, o processo e a pasta. O arquivo vira um documento NOVO na ficha.';
  $('gNomes').innerHTML=r.arquivos.length===1?'<label class="rot" for="guardarNome">Nome do documento</label><input class="campo" id="guardarNome" autocomplete="off" style="width:100%">':'<div class="dica">'+r.arquivos.map(function(a){return esc(a.nome);}).join('<br>')+'</div>';
  if(r.arquivos.length===1)$('guardarNome').value=nomeResultado(0);
  abrirJanela('jGuardar');
  var o=E.origem;
  if(o&&o.pessoa_id&&(!G.pessoa||G.pessoa.id!==o.pessoa_id)){escolherPessoa({id:o.pessoa_id,nome_completo:o.cliente_nome||'Cliente do documento aberto'},o.processo_id,o.pasta_id);}
  else if(!G.pessoa){mostrarBusca();setTimeout(function(){$('gBusca').focus();},80);}
  else conferirGuardar();
}
function mostrarBusca(){G.pessoa=null;$('gEscolhido').hidden=true;$('gBuscaBloco').hidden=false;$('gProcesso').innerHTML='<option value="">Escolha o cliente primeiro</option>';$('gProcesso').disabled=true;$('gPasta').disabled=true;conferirGuardar();}
async function buscarCliente(){
  var t=$('gBusca').value.trim(),n=++G.busca,lista=$('gLista');
  if(t.length<2){lista.innerHTML='';return;}
  lista.innerHTML='<div class="vazio">Procurando…</div>';
  try{
    var r=await _sb.rpc('busca_global',{p_termo:t});if(n!==G.busca)return;
    if(r.error)throw r.error;
    var d=r.data||{},pes=(d.pessoas||[]).slice(0,12),pro=(d.processos||[]).slice(0,8);
    var h=pes.map(function(p){return '<button type="button" data-pes="'+esc(p.id)+'" data-nome="'+esc(p.nome_completo||'')+'"><span>'+esc(p.nome_completo||'(sem nome)')+'</span><small>'+esc(p.codigo||'')+'</small></button>';}).join('')
      +pro.filter(function(p){return p.pessoa_id||p.pessoa;}).map(function(p){return '<button type="button" data-proc="'+esc(p.id)+'"><span>'+esc((p.pessoa&&p.pessoa.nome_completo)||'Processo')+'</span><small>'+esc(p.codigo||p.numero_processo_cnj||'')+'</small></button>';}).join('');
    lista.innerHTML=h||'<div class="vazio">Nada encontrado para "'+esc(t)+'". Confira o nome, o CPF ou o código.</div>';
  }catch(e){if(n===G.busca)lista.innerHTML='<div class="vazio" style="color:var(--danger,#e5484d)">A busca falhou: '+esc((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro')+'</div>';}
}
async function escolherPessoa(p,procId,pastaId){
  G.pessoa=p;$('gBuscaBloco').hidden=true;$('gLista').innerHTML='';
  var ch=$('gEscolhido');ch.hidden=false;ch.innerHTML='<b>'+esc(p.nome_completo)+(p.codigo?' · '+esc(p.codigo):'')+'</b><button class="btn" type="button" id="gTrocar">Trocar</button>';
  $('gTrocar').addEventListener('click',function(){mostrarBusca();$('gBusca').focus();});
  $('gProcesso').innerHTML='<option value="">Carregando…</option>';$('gProcesso').disabled=true;$('gPasta').disabled=true;
  try{
    var r1=await _sb.from('processos').select('id,codigo,numero_processo_cnj,criado_em').eq('pessoa_id',p.id).or('excluido_logico.is.null,excluido_logico.eq.false').order('criado_em',{ascending:true});
    if(r1.error)throw r1.error;
    var r2=await _sb.from('pastas_cliente').select('id,nome,pai_id,ordem').eq('pessoa_id',p.id).eq('ativo',true);
    if(r2.error)throw r2.error;
    if(G.pessoa!==p)return;
    if(!p.codigo||p.nome_completo==='Cliente do documento aberto'){var r3=await _sb.from('pessoas').select('nome_completo,codigo').eq('id',p.id).maybeSingle();if(r3.data){p.nome_completo=r3.data.nome_completo;p.codigo=r3.data.codigo;ch.querySelector('b').textContent=p.nome_completo+(p.codigo?' · '+p.codigo:'');}}
    G.processos=r1.data||[];
    $('gProcesso').innerHTML=G.processos.length?G.processos.map(function(x){return '<option value="'+esc(x.id)+'">'+esc([x.codigo,x.numero_processo_cnj?sagaCnj(x.numero_processo_cnj):'sem número'].filter(Boolean).join(' · '))+'</option>';}).join(''):'<option value="">Este cliente não tem processo: guarde por outro cliente ou cadastre o processo</option>';
    if(procId)$('gProcesso').value=procId;
    $('gProcesso').disabled=!G.processos.length;
    var mapa={};(r2.data||[]).forEach(function(x){mapa[x.id]=x;});
    function cam(x){var n=[],k=0;while(x&&k<10){n.unshift(x.nome);x=mapa[x.pai_id];k++;}return n.join(' / ');}
    G.pastas=(r2.data||[]).map(function(x){return {id:x.id,nome:cam(x)};}).sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');});
    $('gPasta').innerHTML='<option value="">Documentos (sem pasta)</option>'+G.pastas.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>';}).join('');
    if(pastaId)$('gPasta').value=pastaId;$('gPasta').disabled=false;
  }catch(e){$('guardarErro').textContent='Não consegui ler os processos e as pastas deste cliente. Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro')+'.';}
  conferirGuardar();
}
function sagaCnj(n){try{return window.sagaFmt&&sagaFmt.cnj?sagaFmt.cnj(n):n;}catch(e){return n;}}
function conferirGuardar(){$('guardarOk').disabled=!(G.pessoa&&$('gProcesso').value);}
async function guardar(){
  var r=E.resultado;if(!r||!G.pessoa)return;var procId=$('gProcesso').value;if(!procId)return;
  var pastaId=$('gPasta').value||null;
  var prog=$('guardarProg');prog.classList.add('ativo');$('guardarOk').disabled=true;$('guardarErro').textContent='';
  try{
    var s=await _sb.auth.getSession();var uid=s.data&&s.data.session&&s.data.session.user&&s.data.session.user.id;
    if(!uid)throw new Error('sua sessão expirou; entre de novo no SAGA');
    var us=await _sb.from('usuarios').select('id').eq('auth_user_id',uid).maybeSingle();
    if(us.error||!us.data)throw new Error('não achei o seu cadastro de usuário ('+((us.error&&(window.sagaErroBanco?window.sagaErroBanco(us.error):us.error.message))||'sem cadastro')+')');
    var proc=G.processos.find(function(x){return x.id===procId;})||{};
    var pasta=G.pastas.find(function(x){return x.id===pastaId;});
    var onde=G.pessoa.nome_completo+' › '+(proc.codigo||'processo')+' › '+(pasta?pasta.nome:'Documentos');
    for(var i=0;i<r.arquivos.length;i++){
      var a=r.arquivos[i];
      var nome=r.arquivos.length===1?($('guardarNome').value.trim()||a.nome):a.nome;
      nome=nome.replace(/[\\/:*?"<>|]+/g,'-');var ext=ehPdf(a)?'.pdf':(a.tipo==='image/png'?'.png':'.jpg');if(!new RegExp('\\'+ext+'$','i').test(nome))nome+=ext;
      progresso(prog,i,r.arquivos.length,'Enviando '+(i+1)+' de '+r.arquivos.length+': '+nome);
      var caminho=procId+'/'+crypto.randomUUID()+'_'+nome.replace(/[^a-zA-Z0-9._-]/g,'_');
      var up=await _sb.storage.from(BUCKET).upload(caminho,new Blob([a.bytes],{type:a.tipo}),{contentType:a.tipo});
      if(up.error)throw up.error;
      var ins=await _sb.from('documentos').insert({processo_id:procId,pessoa_id:G.pessoa.id,usuario_id:us.data.id,nome_arquivo:nome,caminho_storage:caminho,tipo_documento:ehPdf(a)?'pdf':'imagem',tamanho_bytes:a.bytes.length,pasta_id:pastaId,visivel_portal_cliente:false,excluido_logico:false}).select('id').single();
      if(ins.error){var rm=await _sb.storage.from(BUCKET).remove([caminho]);throw new Error(((window.sagaErroBanco?window.sagaErroBanco(ins.error):ins.error.message)||'o registro do documento foi recusado')+(rm.error?' (e o arquivo enviado ficou solto: avise o administrador)':''));}
      a.nome=nome;a.guardado={onde:onde,caminho:caminho,docId:ins.data.id,doc:{id:ins.data.id,processo_id:procId,pessoa_id:G.pessoa.id,pasta_id:pastaId,nome_arquivo:nome,caminho_storage:caminho,cliente_nome:G.pessoa.nome_completo}};
    }
    progresso(prog,1,1,'Pronto.');
    r.salvo=true;E.pendente=false;
    fecharJanela('jGuardar');desenharResultado();
    var linkF=FICHA+'?pessoa_id='+encodeURIComponent(G.pessoa.id)+'&processo_id='+encodeURIComponent(procId);
    aviso('atencao',(r.arquivos.length>1?r.arquivos.length+' arquivos guardados':'"'+r.arquivos[0].nome+'" guardado')+' na pasta do cliente.',onde+'.',[{rotulo:'Abrir a ficha',fazer:function(){window.open(linkF,'_blank','noopener');}}]);
    toast('Guardado na pasta do cliente.','success');
    if(E._depoisGuardar){var f=E._depoisGuardar;E._depoisGuardar=null;f();}
  }catch(e){
    var m=(window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||String(e||'erro desconhecido');
    if(/row-level security|permission|not allowed|unauthorized|violates/i.test(m))m='você não tem permissão para guardar documentos neste cliente ('+m+')';
    $('guardarErro').textContent='Não guardei. Motivo: '+m+'. O arquivo continua aqui; você pode baixar.';
  }finally{prog.classList.remove('ativo');conferirGuardar();}
}

/* ---------- compartilhar ---------- */
function abrirCompartilhar(){
  var r=E.resultado;if(!r)return;var um=r.arquivos.length===1,a=r.arquivos[0];
  $('jCompartilharSub').textContent=um?'"'+nomeResultado(0)+'" ('+tamanhoTxt(a.bytes.length)+')':r.arquivos.length+' arquivos';
  var files=r.arquivos.map(function(x){return new File([x.bytes],x.nome,{type:x.tipo});});
  var pode=false;try{pode=!!(navigator.canShare&&navigator.canShare({files:files}));}catch(e){}
  $('cpEnviar').hidden=!pode;
  $('cpEnviarDica').textContent=pode?'Abre a lista de aplicativos do aparelho (WhatsApp, e-mail, Drive…) com o arquivo já anexado. Vai direto do aparelho, sem passar por site nenhum.':'Neste navegador o arquivo não vai direto para outro aplicativo. Baixe e anexe no WhatsApp Web ou no e-mail (ou use o link com prazo, abaixo).';
  $('cpLinkBloco').hidden=true;$('cpErro').textContent='';
  var gu=um&&a.guardado;
  $('cpSemPasta').hidden=!!gu;
  $('cpSemPasta').innerHTML=!um?'O link é de um arquivo por vez: use "Continuar com este" no arquivo que quer mandar.':'Para gerar o link, o arquivo precisa estar guardado na pasta do cliente (o link aponta para essa cópia).';
  $('cpGerar').textContent=gu?'Gerar o link':'Guardar na pasta do cliente e gerar o link';
  $('cpGerar').disabled=!um;
  abrirJanela('jCompartilhar');
}
async function enviarArquivo(){
  var r=E.resultado;var files=r.arquivos.map(function(x,i){return new File([x.bytes],r.arquivos.length===1?nomeResultado(0):x.nome,{type:x.tipo});});
  try{await navigator.share({files:files,title:files[0].name});r.salvo=true;}
  catch(e){if(e&&e.name==='AbortError')return;$('cpErro').textContent='O aparelho não conseguiu enviar: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro')+'. Baixe e anexe.';}
}
async function gerarLink(){
  var r=E.resultado;var a=r&&r.arquivos[0];if(!a)return;
  if(!a.guardado){fecharJanela('jCompartilhar');E._depoisGuardar=function(){abrirCompartilhar();gerarLink();};abrirGuardar();return;}
  var horas=+(valorPill('cpPrazo')||72);$('cpErro').textContent='';$('cpGerar').disabled=true;
  try{
    var u=await _sb.storage.from(BUCKET).createSignedUrl(a.guardado.caminho,horas*3600,{download:a.nome});
    if(u.error||!u.data)throw (u.error||new Error('o armazenamento não devolveu o link'));
    var reg=await _sb.rpc('documento_link_registrar',{p_documento:a.guardado.docId,p_horas:horas,p_meio:'Editor de PDF'});
    if(reg.error)throw new Error('o link foi criado, mas o registro dele falhou ('+(window.sagaErroBanco?window.sagaErroBanco(reg.error):reg.error.message)+'); por segurança, não use este link e avise o administrador');
    var ate=new Date(Date.now()+horas*3600*1000);
    var quando=ate.toLocaleDateString('pt-BR')+' às '+ate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    $('cpLink').value=u.data.signedUrl;$('cpValidade').textContent='Vale até '+quando+'. Depois disso o link para de funcionar.';
    var msg='Segue o documento "'+a.nome+'" (o link vale até '+quando+'): '+u.data.signedUrl;
    $('cpWhats').href='https://wa.me/?text='+encodeURIComponent(msg);
    $('cpEmail').href='mailto:?subject='+encodeURIComponent(a.nome)+'&body='+encodeURIComponent(msg);
    $('cpLinkBloco').hidden=false;if(window.sagaRecolher){$('cpLinkBloco').hidden=true;window.sagaRecolher($('cpLinkBloco'),false);}
  }catch(e){$('cpErro').textContent='Não gerei o link. Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'.';$('cpLinkBloco').hidden=true;}
  finally{$('cpGerar').disabled=false;}
}

function ligarTelas(){
  $('cartoes').addEventListener('click',function(e){var b=e.target.closest('[data-ferr]');if(b)escolherFerramenta(b.dataset.ferr);});
  $('atualVer').addEventListener('click',function(){entrarTrabalho(E.ferr||'organizar');});
  $('atualFechar').addEventListener('click',async function(){
    if(E.pendente){var ok=window.sagaConfirmar?await sagaConfirmar('Fechar este arquivo','Ele sai da tela (o que está no seu computador ou na pasta do cliente não muda). O que não foi baixado nem guardado se perde.','Fechar',false):confirm('Fechar este arquivo?');if(!ok)return;}
    limparTrabalho();irPara('inicio');
  });
  $('bVoltarInicio').addEventListener('click',function(){irPara('inicio');});
  $('bConcluir').addEventListener('click',concluir);
  $('bParaImagem').addEventListener('click',abrirParaImagem);
  $('piOk').addEventListener('click',converterParaImagem);
  ['piFormato','piDpi','piPaginas','imgPagina','imgMargem','imgQualidade','cpPrazo'].forEach(function(g){$(g).addEventListener('click',function(e){var b=e.target.closest('.pill');if(b)escolherPill(g,b.dataset.v);});});
  $('imgMais').addEventListener('click',function(){$('entradaImagens').click();});
  $('imgOk').addEventListener('click',gerarImagensPdf);
  $('imgLista').addEventListener('click',function(e){
    var b=e.target.closest('[data-img]');if(!b)return;var id=b.closest('.li').dataset.id,i=IMG.lista.findIndex(function(x){return x.id===id;});if(i<0)return;
    var a=b.dataset.img;if(a==='tira'){URL.revokeObjectURL(IMG.lista[i].url);IMG.lista.splice(i,1);}
    else{var j=a==='sobe'?i-1:i+1;if(j<0||j>=IMG.lista.length)return;var t=IMG.lista[i];IMG.lista[i]=IMG.lista[j];IMG.lista[j]=t;}
    desenharListaImg();
  });
  $('telaResultado').addEventListener('click',function(e){
    var t=e.target.closest('button');if(!t)return;
    if(t.id==='resBaixar')baixarResultado(null);
    else if(t.id==='resGuardar')abrirGuardar();
    else if(t.id==='resCompartilhar')abrirCompartilhar();
    else if(t.id==='resContinuar')continuarCom(0);
    else if(t.id==='resVoltar'){irPara('trabalho');}
    else if(t.id==='resInicio'){irPara('inicio');}
    else if(t.id==='resNovo'){(async function(){var r=E.resultado;if(r&&!r.salvo){var ok=window.sagaConfirmar?await sagaConfirmar('Começar de novo','O resultado ainda não foi baixado nem guardado e vai se perder.','Começar de novo',false):confirm('Começar de novo?');if(!ok)return;}E.resultado=null;limparTrabalho();$('avisos').innerHTML='';irPara('inicio');})();}
    else if(t.dataset.resBaixar!=null)baixarResultado(+t.dataset.resBaixar);
    else if(t.dataset.resContinuar!=null)continuarCom(+t.dataset.resContinuar);
  });
  var tb;$('gBusca').addEventListener('input',function(){clearTimeout(tb);tb=setTimeout(buscarCliente,280);});
  $('gLista').addEventListener('click',async function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.pes)escolherPessoa({id:b.dataset.pes,nome_completo:b.dataset.nome});
    else if(b.dataset.proc){var r=await _sb.from('processos').select('id,pessoa_id').eq('id',b.dataset.proc).maybeSingle();if(r.data&&r.data.pessoa_id)escolherPessoa({id:r.data.pessoa_id,nome_completo:'Cliente do documento aberto'},r.data.id);}
  });
  $('gProcesso').addEventListener('change',conferirGuardar);
  $('guardarOk').addEventListener('click',guardar);
  $('cpEnviar').addEventListener('click',enviarArquivo);
  $('cpBaixar').addEventListener('click',function(){baixarResultado(null);});
  $('cpGerar').addEventListener('click',gerarLink);
  $('cpCopiar').addEventListener('click',async function(){try{await navigator.clipboard.writeText($('cpLink').value);toast('Link copiado.','success');}catch(e){$('cpLink').select();document.execCommand('copy');toast('Link copiado.','success');}});
}

/* ---------- janelas ---------- */
function abrirJanela(id){var j=$(id);j.classList.add('aberto');}
function fecharJanela(id){var j=$(id);j.classList.remove('aberto');if(id==='jSenha')cancelarSenha();if(id==='jEditar'){ED.p=null;ED.sel=null;}}
function janelaAberta(){var a=document.querySelector('.mo.aberto');return a?a.id:null;}

/* ---------- ligar a tela ---------- */
function ligar(){
  try{if(semMovimento())document.documentElement.classList.add('sem-movimento');}catch(e){}
  var entrada=$('entradaArquivos');
  $('solta').addEventListener('click',function(){E.esperaFerr=null;escolherTipo();});
  $('solta').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();E.esperaFerr=null;escolherTipo();}});
  $('bAbrir').addEventListener('click',function(){E.esperaFerr=null;entrada.click();});
  entrada.addEventListener('change',function(){var f=this.files;receberArquivos(f).then(function(){entrada.value='';});});
  $('entradaImagens').addEventListener('change',function(){var f=this.files,el=this;receberArquivos(f).then(function(){el.value='';});});
  $('entradaWord').addEventListener('change',function(){var f=this.files,el=this;receberArquivos(f).then(function(){el.value='';});});
  // arrastar arquivos do computador
  var cont=0;
  function temArquivo(e){return e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')>=0;}
  document.addEventListener('dragenter',function(e){if(!temArquivo(e))return;e.preventDefault();cont++;document.body.classList.add('arrastando-arquivo');$('solta').classList.add('sobre');});
  document.addEventListener('dragover',function(e){if(!temArquivo(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});
  document.addEventListener('dragleave',function(e){if(!temArquivo(e))return;cont=Math.max(0,cont-1);if(!cont){document.body.classList.remove('arrastando-arquivo');$('solta').classList.remove('sobre');}});
  document.addEventListener('drop',function(e){if(!temArquivo(e))return;e.preventDefault();cont=0;document.body.classList.remove('arrastando-arquivo');$('solta').classList.remove('sobre');if(janelaAberta()==='jImagens'){acrescentarImagens(e.dataTransfer.files);return;}receberArquivos(e.dataTransfer.files);});

  $('bMarcarTodas').addEventListener('click',function(){
    if(E.sel.size===E.paginas.length)E.sel.clear();else E.paginas.forEach(function(p){E.sel.add(p.id);});
    desenhar();
  });
  $('bGirarE').addEventListener('click',function(){girar(alvos(),-90);});
  $('bGirarD').addEventListener('click',function(){girar(alvos(),90);});
  $('bTirar').addEventListener('click',function(){tirar(E.paginas.filter(function(p){return E.sel.has(p.id);}));});
  $('bExtrair').addEventListener('click',extrairMarcadas);
  $('bSeparar').addEventListener('click',function(){$('sepCadaInfo').textContent=E.paginas.length+' arquivo'+(E.paginas.length>1?'s':'')+', um por página.';$('sepErro').textContent='';previaSeparar();abrirJanela('jSeparar');});
  $('bNumerar').addEventListener('click',abrirNumerar);
  $('bComprimir').addEventListener('click',abrirComprimir);
  $('bDesfazer').addEventListener('click',desfazer);
  $('bLimpar').addEventListener('click',async function(){
    var ok=window.sagaConfirmar?await sagaConfirmar('Fechar tudo','Os PDFs abertos saem da tela (os arquivos do seu computador não mudam). O que não foi baixado se perde.','Fechar tudo',false):confirm('Fechar tudo?');
    if(!ok)return;
    E.docs.forEach(function(d){try{d.pdf.destroy();}catch(e){}});
    limparTrabalho();$('avisos').innerHTML='';irPara('inicio');
  });
  ligarTelas();
  $('nomeSaida').addEventListener('input',function(){E.nomeTocado=!!this.value.trim();});
  $('arquivos').addEventListener('click',function(e){var b=e.target.closest('[data-tirar-doc]');if(b)tirarDoc(b.dataset.tirarDoc);});
  $('grade').addEventListener('change',function(e){if(e.target.classList.contains('marca')){alternarMarca(e.target.closest('.pg').dataset.id);}});
  $('grade').addEventListener('click',function(e){
    var b=e.target.closest('button[data-a]');if(!b)return;
    var el=b.closest('.pg');var p=E.paginas.find(function(x){return x.id===el.dataset.id;});if(!p)return;
    var a=b.dataset.a,i=E.paginas.indexOf(p);
    if(a==='girarD')girar([p],90);
    else if(a==='tirar')tirar([p]);
    else if(a==='editar')abrirEditar(p);
    else if(a==='esq')moverPara(p,i-1);
    else if(a==='dir')moverPara(p,i+1);
  });
  $('grade').addEventListener('keydown',function(e){
    var el=e.target.closest('.pg');if(!el||e.target!==el)return;
    var p=E.paginas.find(function(x){return x.id===el.dataset.id;});var i=E.paginas.indexOf(p);
    if(e.key===' '||e.key==='Enter'){e.preventDefault();alternarMarca(p.id);}
    else if(e.key==='ArrowLeft'&&e.altKey){e.preventDefault();moverPara(p,i-1);setTimeout(function(){var n=document.querySelector('.pg[data-id="'+p.id+'"]');if(n)n.focus();},50);}
    else if(e.key==='ArrowRight'&&e.altKey){e.preventDefault();moverPara(p,i+1);setTimeout(function(){var n=document.querySelector('.pg[data-id="'+p.id+'"]');if(n)n.focus();},50);}
  });
  // janelas
  document.querySelectorAll('.mo').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-fechar]'))fecharJanela(m.id);});});
  document.addEventListener('keydown',function(e){
    var j=janelaAberta();
    if(e.key==='Escape'&&j){fecharJanela(j);return;}
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&(e.key==='z'||e.key==='Z')&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();desfazer();if(j==='jEditar'&&ED.p){var ainda=E.paginas.find(function(x){return x.id===ED.p.id;});if(ainda){ED.p=ainda;ED.sel=null;desenharPalco();}else fecharJanela('jEditar');}}
  });
  // opções (bolinhas) com destaque
  document.querySelectorAll('.opcao input[type="radio"]').forEach(function(r){r.addEventListener('change',function(){
    document.querySelectorAll('input[name="'+r.name+'"]').forEach(function(x){x.closest('.opcao').classList.toggle('active',x.checked);});
    if(r.name==='sep')previaSeparar();
    if(r.name==='nivel'){atualizarAvisoComp();_comp=null;$('compResultado').hidden=true;$('compBaixar').disabled=true;$('compBaixar').textContent='Usar o comprimido';}
  });});
  $('sepIntervalos').addEventListener('focus',function(){var r=document.querySelector('input[name="sep"][value="intervalos"]');if(!r.checked){r.checked=true;r.dispatchEvent(new Event('change'));}});
  $('sepBlocos').addEventListener('focus',function(){var r=document.querySelector('input[name="sep"][value="blocos"]');if(!r.checked){r.checked=true;r.dispatchEvent(new Event('change'));}});
  $('sepIntervalos').addEventListener('input',previaSeparar);$('sepBlocos').addEventListener('input',previaSeparar);
  $('sepIntervalos').addEventListener('input',function(){var v=this.value,n=v.replace(/[^0-9,\-; ]/g,'');if(n!==v)this.value=n;});
  $('sepOk').addEventListener('click',separar);
  ['numFormato','numPos'].forEach(function(g){$(g).addEventListener('click',function(e){var b=e.target.closest('.pill');if(b)escolherPill(g,b.dataset.v);});});
  $('numOk').addEventListener('click',salvarNumerar);
  $('numTirar').addEventListener('click',function(){guardarHistorico();E.numeracao=null;fecharJanela('jNumerar');desenharResumo();toast('Numeração tirada.');});
  $('compCalc').addEventListener('click',calcularComp);$('compBaixar').addEventListener('click',baixarComp);
  $('senhaOk').addEventListener('click',confirmarSenha);
  $('senhaCampo').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();confirmarSenha();}});
  ligarCamada();
  window.addEventListener('resize',function(){if(ED.p&&$('jEditar').classList.contains('aberto')){clearTimeout(window._edRz);window._edRz=setTimeout(desenharPalco,200);}});
  window.addEventListener('beforeunload',function(e){if((E.paginas.length&&E.pendente)||(E.resultado&&!E.resultado.salvo)){e.preventDefault();e.returnValue='';}});
}

async function init(){
  ligar();
  desenharCartoes();
  desenhar();
  if(window.SagaUI&&SagaUI.carregar)await SagaUI.carregar('editor_pdf');
  var doc=new URLSearchParams(location.search).get('doc');
  if(doc)abrirDaFicha(doc);
  else{var f0=new URLSearchParams(location.search).get('ferramenta');if(f0&&ferrPorK(f0))escolherFerramenta(f0);}
}
window.SagaEditorPdf={montarPdf:montarPdf,estado:E,abrirBytes:abrirBytes,lerIntervalos:lerIntervalos,zipar:zipar,otimizarPdf:otimizarPdf,imagensParaPdf:imagensParaPdf,mostrarResultado:mostrarResultado,escolherFerramenta:escolherFerramenta};
init().catch(function(e){aviso('erro','A tela do Editor de PDF não abriu direito.','Motivo: '+((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'. Atualize a página (F5).');});
})();
