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
var NIVEIS={leve:{dpi:150,q:0.8,nome:'Leve'},media:{dpi:110,q:0.65,nome:'Média'},forte:{dpi:80,q:0.5,nome:'Forte'}};
var E={docs:[],paginas:[],sel:new Set(),numeracao:null,historico:[],seq:0,origem:null,nomeTocado:false,trabalhando:false,pendente:false};

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
    try{bytes=new Uint8Array(await f.arrayBuffer());}catch(e){aviso('erro','"'+f.name+'" não foi aberto.','Motivo: o navegador não conseguiu ler o arquivo do computador ('+((e&&e.message)||'erro desconhecido')+').');continue;}
    await abrirBytes(bytes,f.name,null);
  }
}
async function abrirBytes(bytes,nome,senha,origem){
  var pdfjs;
  try{pdfjs=await carregarPdfjs();}catch(e){aviso('erro','O leitor de PDF não carregou.','Motivo: '+((e&&e.message)||'erro desconhecido')+'. Atualize a página (F5); se continuar, avise o administrador.');return false;}
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
    try{pg=await pdf.getPage(i);}catch(e){aviso('erro','Página '+i+' de "'+nome+'" não abriu.','Motivo: '+((e&&e.message)||'erro')+'. As outras páginas foram abertas.');continue;}
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
    var f=el.querySelector('.folha');f.innerHTML='<span class="carregando" style="color:var(--danger,#e5484d);padding:8px;text-align:center">Não consegui mostrar esta página: '+esc((e&&e.message)||'erro')+'</span>';
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
  $('bBaixar').disabled=!n;
  $('bGuardar').hidden=!(E.origem&&E.origem.processo_id);
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
  var m=(e&&e.message)||String(e||'erro desconhecido');
  aviso('erro','Não consegui '+oque+'.','Motivo: '+m+'. Nada foi baixado. Tente de novo; se o erro continuar, avise o administrador com esta mensagem.');
}
async function trabalhar(botao,fn){
  if(E.trabalhando)return;E.trabalhando=true;
  var txt=botao?botao.innerHTML:null;if(botao){botao.disabled=true;botao.textContent='Montando…';}
  try{await fn();}finally{E.trabalhando=false;if(botao){botao.innerHTML=txt;botao.disabled=false;}desenharResumo();}
}
async function baixarTudo(){
  if(!E.paginas.length)return;
  await trabalhar($('bBaixar'),async function(){
    try{
      var bytes=await montarPdf(E.paginas,{});
      baixarBytes(bytes,nomeLimpo($('nomeSaida').value||nomeSugerido()));E.pendente=false;
      toast('PDF pronto: '+tamanhoTxt(bytes.length)+'. Veja na pasta de downloads.','success');
    }catch(e){falhaMontar(e,'montar o PDF');}
  });
}
async function extrairMarcadas(){
  var l=E.paginas.filter(function(p){return E.sel.has(p.id);});if(!l.length)return;
  await trabalhar($('bExtrair'),async function(){
    try{
      var bytes=await montarPdf(l,{});
      baixarBytes(bytes,baseNome($('nomeSaida').value||nomeSugerido())+' - paginas '+faixaTexto(l)+'.pdf');
      toast(l.length+' página'+(l.length>1?'s':'')+' extraída'+(l.length>1?'s':'')+' ('+tamanhoTxt(bytes.length)+').','success');
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
    if(arquivos.length===1)baixarBytes(arquivos[0].bytes,arquivos[0].nome);
    else baixarBytes(zipar(arquivos),base+' (separado).zip','application/zip');
    toast(arquivos.length===1?'Arquivo pronto.':arquivos.length+' arquivos prontos, juntos num .zip.','success');
    fecharJanela('jSeparar');
  }catch(e){$('sepErro').textContent='Não consegui separar. Motivo: '+((e&&e.message)||'erro desconhecido')+'. Nada foi baixado.';}
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
  fecharJanela('jNumerar');desenharResumo();toast('Numeração ligada: entra no PDF ao baixar.');
}

/* ---------- comprimir ---------- */
var _comp=null;
function abrirComprimir(){
  _comp=null;$('compResultado').hidden=true;$('compErro').textContent='';$('compBaixar').disabled=true;
  atualizarAvisoComp();abrirJanela('jComprimir');
}
function nivelComp(){return document.querySelector('input[name="nivel"]:checked').value;}
function atualizarAvisoComp(){$('compAviso').hidden=nivelComp()==='sem';}
async function calcularComp(){
  var nivel=nivelComp(),prog=$('compProg');
  $('compErro').textContent='';$('compResultado').hidden=true;$('compBaixar').disabled=true;$('compCalc').disabled=true;prog.classList.add('ativo');
  try{
    var antes=E.docs.filter(function(d){return E.paginas.some(function(p){return p.doc===d;});}).reduce(function(s,d){return s+d.tamanho;},0);
    var op={progresso:function(i,n){progresso(prog,i,n,'Página '+Math.min(i+1,n)+' de '+n);}};
    if(nivel!=='sem')op.raster=NIVEIS[nivel];
    var bytes=await montarPdf(E.paginas,op);
    var menor=bytes.length<antes;
    _comp={bytes:bytes,nivel:nivel,menor:menor};
    var dif=antes?Math.round((1-bytes.length/antes)*100):0;
    $('compResultado').innerHTML='<div><small>Antes</small><strong>'+tamanhoTxt(antes)+'</strong></div><div class="seta">→</div><div><small>Depois ('+(nivel==='sem'?'sem perder qualidade':NIVEIS[nivel].nome)+')</small><strong>'+tamanhoTxt(bytes.length)+'</strong></div>'
      +'<div class="ganho">'+(menor?'<b>'+dif+'% menor.</b>':'<b style="color:var(--warning,#d97706)">Não ficou menor ('+(dif<0?Math.abs(dif)+'% maior':'igual')+').</b> Motivo provável: o PDF já é leve (só texto)'+(E.paginas.some(function(p){return precisaImagem(p,{});})?' ou tem páginas que viram imagem (tarja definitiva ou arquivo travado)':'')+'. Experimente outro nível ou baixe o original.')+'</div>';
    $('compResultado').hidden=false;$('compBaixar').disabled=false;
    $('compBaixar').textContent=menor?'Baixar o menor':'Baixar mesmo assim';
  }catch(e){$('compErro').textContent='Não consegui comprimir. Motivo: '+((e&&e.message)||'erro desconhecido')+'.';}
  finally{prog.classList.remove('ativo');$('compCalc').disabled=false;}
}
function baixarComp(){
  if(!_comp)return;
  var b=baseNome($('nomeSaida').value||nomeSugerido()).replace(/ \(editado\)$/,'');
  baixarBytes(_comp.bytes,b+(_comp.nivel==='sem'?'':' (comprimido)')+'.pdf');
  toast('PDF comprimido baixado ('+tamanhoTxt(_comp.bytes.length)+').','success');
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
  }catch(e){toast('Não consegui mostrar a página: '+((e&&e.message)||'erro'),'error');}
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
      aviso('atencao','Documento da ficha aberto: "'+(d.nome_arquivo||'')+'".','Ao terminar, use "Baixar PDF" ou "Guardar na pasta do cliente" (vira um documento novo na mesma pasta; o original continua lá).',[{rotulo:'Voltar para a ficha',fazer:function(){location.href=linkF;}}]);
    }
  }catch(e){
    tirarAviso(av);
    aviso('erro','Não consegui abrir o documento da ficha.','Motivo: '+((e&&e.message)||'erro desconhecido')+'. Baixe o documento na ficha e arraste para cá.');
  }
}
function abrirGuardar(){
  var o=E.origem;if(!o)return;
  $('jGuardarSub').textContent='O PDF montado aqui ('+E.paginas.length+' páginas) vai para a pasta do cliente, ao lado de "'+(o.nome_arquivo||'')+'".';
  $('guardarNome').value=nomeLimpo($('nomeSaida').value||nomeSugerido());$('guardarErro').textContent='';
  abrirJanela('jGuardar');
}
async function guardar(){
  var o=E.origem;if(!o||!o.processo_id)return;
  var nome=nomeLimpo($('guardarNome').value);
  var prog=$('guardarProg');prog.classList.add('ativo');$('guardarOk').disabled=true;$('guardarErro').textContent='';
  var caminho=null;
  try{
    progresso(prog,0,3,'Montando o PDF…');
    var bytes=await montarPdf(E.paginas,{progresso:function(i,n){progresso(prog,i,n*3,'Montando o PDF: página '+Math.min(i+1,n)+' de '+n);}});
    progresso(prog,2,3,'Enviando para a pasta do cliente…');
    var s=await _sb.auth.getSession();var uid=s.data&&s.data.session&&s.data.session.user&&s.data.session.user.id;
    if(!uid)throw new Error('sua sessão expirou; entre de novo no SAGA');
    var us=await _sb.from('usuarios').select('id').eq('auth_user_id',uid).maybeSingle();
    if(us.error||!us.data)throw new Error('não achei o seu cadastro de usuário ('+((us.error&&us.error.message)||'sem cadastro')+')');
    caminho=o.processo_id+'/'+crypto.randomUUID()+'_'+nome.replace(/[^a-zA-Z0-9._-]/g,'_');
    var up=await _sb.storage.from(BUCKET).upload(caminho,new Blob([bytes],{type:'application/pdf'}),{contentType:'application/pdf'});
    if(up.error)throw up.error;
    var ins=await _sb.from('documentos').insert({processo_id:o.processo_id,pessoa_id:o.pessoa_id,usuario_id:us.data.id,nome_arquivo:nome,caminho_storage:caminho,tipo_documento:'pdf',tamanho_bytes:bytes.length,pasta_id:o.pasta_id||null,visivel_portal_cliente:false,excluido_logico:false});
    if(ins.error){var rm=await _sb.storage.from(BUCKET).remove([caminho]);caminho=null;throw new Error((ins.error.message||'o registro do documento foi recusado')+(rm.error?' (e o arquivo enviado ficou solto: avise o administrador)':''));}
    progresso(prog,3,3,'Pronto.');
    fecharJanela('jGuardar');
    var linkF=FICHA+'?pessoa_id='+encodeURIComponent(o.pessoa_id||'')+'&processo_id='+encodeURIComponent(o.processo_id);
    aviso('atencao','"'+nome+'" foi guardado na pasta do cliente ('+tamanhoTxt(bytes.length)+').','O documento original continua lá, sem mudança.',[{rotulo:'Abrir a ficha',fazer:function(){location.href=linkF;}}]);
    E.pendente=false;toast('Guardado na pasta do cliente.','success');
  }catch(e){
    var m=(e&&e.message)||String(e||'erro desconhecido');
    if(/row-level security|permission|not allowed|unauthorized/i.test(m))m='você não tem permissão para guardar documentos neste cliente ('+m+')';
    $('guardarErro').textContent='Não guardei. Motivo: '+m+'. O PDF continua aqui; você pode baixar.';
  }finally{prog.classList.remove('ativo');$('guardarOk').disabled=false;}
}

/* ---------- janelas ---------- */
function abrirJanela(id){var j=$(id);j.classList.add('aberto');}
function fecharJanela(id){var j=$(id);j.classList.remove('aberto');if(id==='jSenha')cancelarSenha();if(id==='jEditar'){ED.p=null;ED.sel=null;}}
function janelaAberta(){var a=document.querySelector('.mo.aberto');return a?a.id:null;}

/* ---------- ligar a tela ---------- */
function ligar(){
  try{if(semMovimento())document.documentElement.classList.add('sem-movimento');}catch(e){}
  var entrada=$('entradaArquivos');
  $('solta').addEventListener('click',function(){entrada.click();});
  $('solta').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();entrada.click();}});
  $('bAbrir').addEventListener('click',function(){entrada.click();});
  entrada.addEventListener('change',function(){var f=this.files;abrirArquivos(f).then(function(){entrada.value='';});});
  // arrastar arquivos do computador
  var cont=0;
  function temArquivo(e){return e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')>=0;}
  document.addEventListener('dragenter',function(e){if(!temArquivo(e))return;e.preventDefault();cont++;document.body.classList.add('arrastando-arquivo');$('solta').classList.add('sobre');});
  document.addEventListener('dragover',function(e){if(!temArquivo(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});
  document.addEventListener('dragleave',function(e){if(!temArquivo(e))return;cont=Math.max(0,cont-1);if(!cont){document.body.classList.remove('arrastando-arquivo');$('solta').classList.remove('sobre');}});
  document.addEventListener('drop',function(e){if(!temArquivo(e))return;e.preventDefault();cont=0;document.body.classList.remove('arrastando-arquivo');$('solta').classList.remove('sobre');abrirArquivos(e.dataTransfer.files);});

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
    E.docs=[];E.paginas=[];E.sel.clear();E.historico=[];E.numeracao=null;E.nomeTocado=false;E.origem=null;$('nomeSaida').value='';$('bDesfazer').disabled=true;
    $('grade').innerHTML='';$('avisos').innerHTML='';desenhar();
  });
  $('bBaixar').addEventListener('click',baixarTudo);
  $('bGuardar').addEventListener('click',abrirGuardar);
  $('guardarOk').addEventListener('click',guardar);
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
    if(r.name==='nivel'){atualizarAvisoComp();_comp=null;$('compResultado').hidden=true;$('compBaixar').disabled=true;}
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
  window.addEventListener('beforeunload',function(e){if(E.paginas.length&&E.pendente){e.preventDefault();e.returnValue='';}});
}

async function init(){
  ligar();
  desenhar();
  if(window.SagaUI&&SagaUI.carregar)await SagaUI.carregar('editor_pdf');
  var doc=new URLSearchParams(location.search).get('doc');
  if(doc)abrirDaFicha(doc);
}
window.SagaEditorPdf={montarPdf:montarPdf,estado:E,abrirBytes:abrirBytes,lerIntervalos:lerIntervalos,zipar:zipar};
init().catch(function(e){aviso('erro','A tela do Editor de PDF não abriu direito.','Motivo: '+((e&&e.message)||'erro desconhecido')+'. Atualize a página (F5).');});
})();
