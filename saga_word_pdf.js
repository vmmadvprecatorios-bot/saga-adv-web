/* =====================================================================
   SAGA · Word (.docx) → PDF no navegador (T168, 16/11/2026, pedido do Dr. Victor)
   O arquivo NÃO sai do computador (LGPD): o .docx é aberto aqui (PizZip), o texto é diagramado aqui
   e o PDF é montado aqui (pdf-lib + fontkit), com as fontes guardadas no próprio site (vendor/fontes).
   Fontes no lugar das do Word (mesma largura de letra, então as linhas e as páginas batem):
     Calibri → Carlito · Cambria → Caladea · Arial/Helvetica → Liberation Sans · Times New Roman → Liberation Serif
     Garamond → EB Garamond · Segoe UI, Verdana, Tahoma e outras sem serifa → Open Sans · outras com serifa → Liberation Serif
   Converte: parágrafos (alinhamento, recuos, espaçamento, entrelinhas), negrito, itálico, sublinhado, tachado,
   cores, marca-texto, tamanhos, sobrescrito, listas numeradas e com marcador, tabelas (larguras, bordas, fundo,
   células mescladas na horizontal), imagens (no texto e soltas), quebras de página, cabeçalho e rodapé (com o
   número da página) e o tamanho/margens da página.
   NÃO converte (vira aviso, sempre à vista): caixas de texto, formas, gráficos, equações, comentários, controle
   de alterações e imagens EMF/WMF. Para esses casos: no Word, Arquivo > Salvar como > PDF.
   ===================================================================== */
(function(){
'use strict';
var W_NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
var BASE_FONTES='vendor/fontes/';
var FAMILIAS={
  carlito:['Carlito-Regular.ttf','Carlito-Bold.ttf','Carlito-Italic.ttf','Carlito-BoldItalic.ttf'],
  caladea:['Caladea-Regular.ttf','Caladea-Bold.ttf','Caladea-Italic.ttf','Caladea-BoldItalic.ttf'],
  lsans:['LiberationSans-Regular.ttf','LiberationSans-Bold.ttf','LiberationSans-Italic.ttf','LiberationSans-BoldItalic.ttf'],
  lserif:['LiberationSerif-Regular.ttf','LiberationSerif-Bold.ttf','LiberationSerif-Italic.ttf','LiberationSerif-BoldItalic.ttf'],
  garamond:['EBGaramond-Regular.ttf','EBGaramond-Bold.ttf','EBGaramond-Italic.ttf','EBGaramond-BoldItalic.ttf'],
  opensans:['OpenSans-Regular.ttf','OpenSans-Bold.ttf','OpenSans-Italic.ttf','OpenSans-BoldItalic.ttf']
};
function familiaDe(nome){
  var n=String(nome||'').toLowerCase();
  if(/calibri|carlito/.test(n))return 'carlito';
  if(/cambria|caladea/.test(n))return 'caladea';
  if(/arial|helvetica|liberation sans|arimo/.test(n))return 'lsans';
  if(/garamond/.test(n))return 'garamond';
  if(/times|liberation serif|tinos/.test(n))return 'lserif';
  if(/segoe|verdana|tahoma|open sans|trebuchet|century gothic|gill|lato|roboto|montserrat|aptos|candara|corbel|franklin/.test(n))return 'opensans';
  if(/georgia|book antiqua|palatino|bookman|century|constantia|baskerville|serif/.test(n))return 'lserif';
  return 'carlito';
}
var _scripts={};
function script(src){
  if(!_scripts[src])_scripts[src]=new Promise(function(ok,falha){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){delete _scripts[src];falha(new Error('não carregou '+src+' (atualize a página com F5)'));};document.head.appendChild(s);});
  return _scripts[src];
}
var _fontes={};
function bytesFonte(nome){
  if(!_fontes[nome])_fontes[nome]=fetch(BASE_FONTES+nome).then(function(r){if(!r.ok)throw new Error('a fonte '+nome+' não carregou (erro '+r.status+')');return r.arrayBuffer();}).catch(function(e){delete _fontes[nome];throw e;});
  return _fontes[nome];
}

/* ---------- XML ---------- */
function xml(txt){var d=new DOMParser().parseFromString(txt,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('o Word tem uma parte com defeito (XML inválido)');return d;}
function filhos(el,nome){var r=[];if(!el)return r;for(var c=el.firstChild;c;c=c.nextSibling)if(c.nodeType===1&&(!nome||c.localName===nome))r.push(c);return r;}
function filho(el,nome){if(!el)return null;for(var c=el.firstChild;c;c=c.nextSibling)if(c.nodeType===1&&c.localName===nome)return c;return null;}
function at(el,nome){if(!el)return null;var v=el.getAttributeNS(W_NS,nome);if(v===''||v==null)v=el.getAttribute('w:'+nome);return v===''?null:v;}
function num(v,pad){var n=parseFloat(v);return isNaN(n)?pad:n;}
function liga(el){if(!el)return undefined;var v=at(el,'val');return !(v==='0'||v==='false'||v==='none');}
function desc(el,nome){return el?Array.prototype.slice.call(el.getElementsByTagNameNS('*',nome)):[];}

/* ---------- estilos ---------- */
function lerRPr(r,o){
  o=o||{};if(!r)return o;
  var e;
  if((e=filho(r,'b'))){o.b=liga(e);}
  if((e=filho(r,'i'))){o.i=liga(e);}
  if((e=filho(r,'u'))){var v=at(e,'val');o.u=!!(v&&v!=='none');}
  if((e=filho(r,'strike'))){o.strike=liga(e);}
  if((e=filho(r,'dstrike'))){o.strike=liga(e);}
  if((e=filho(r,'caps'))){o.caps=liga(e);}
  if((e=filho(r,'smallCaps'))){o.smallCaps=liga(e);}
  if((e=filho(r,'vanish'))){o.oculto=liga(e);}
  if((e=filho(r,'sz'))){o.sz=num(at(e,'val'),22)/2;}
  if((e=filho(r,'color'))){var c=at(e,'val');if(c&&c!=='auto')o.cor=c;else if(c==='auto')o.cor=null;}
  if((e=filho(r,'highlight'))){o.marca=at(e,'val');}
  if((e=filho(r,'shd'))){var f=at(e,'fill');if(f&&f!=='auto')o.fundo=f;}
  if((e=filho(r,'vertAlign'))){o.vert=at(e,'val');}
  if((e=filho(r,'rFonts'))){var fn=at(e,'ascii')||at(e,'hAnsi');if(fn)o.fonte=fn;else if(at(e,'asciiTheme'))o.fonteTema=at(e,'asciiTheme');}
  return o;
}
function lerPPr(p,o){
  o=o||{};if(!p)return o;
  var e;
  if((e=filho(p,'jc'))){var v=at(e,'val');o.jc=v==='both'||v==='distribute'?'both':v==='center'?'center':(v==='right'||v==='end')?'right':'left';}
  if((e=filho(p,'ind'))){
    var l=at(e,'left')||at(e,'start'),r=at(e,'right')||at(e,'end'),fl=at(e,'firstLine'),hg=at(e,'hanging');
    if(l!=null)o.esq=num(l,0)/20;if(r!=null)o.dir=num(r,0)/20;
    if(fl!=null)o.prim=num(fl,0)/20;if(hg!=null)o.prim=-num(hg,0)/20;
  }
  if((e=filho(p,'spacing'))){
    var b=at(e,'before'),a=at(e,'after'),ln=at(e,'line'),lr=at(e,'lineRule');
    if(b!=null&&at(e,'beforeAutospacing')!=='1')o.antes=num(b,0)/20;
    if(a!=null&&at(e,'afterAutospacing')!=='1')o.depois=num(a,0)/20;
    if(ln!=null){if(!lr||lr==='auto')o.linha={mult:num(ln,240)/240};else o.linha={pt:num(ln,240)/20,regra:lr};}
  }
  if((e=filho(p,'pageBreakBefore')))o.quebraAntes=liga(e);
  if((e=filho(p,'contextualSpacing')))o.contextual=liga(e);
  if((e=filho(p,'numPr'))){var ni=filho(e,'numId'),il=filho(e,'ilvl');o.num={id:ni?at(ni,'val'):null,nivel:il?num(at(il,'val'),0):0};}
  if((e=filho(p,'shd'))){var f=at(e,'fill');if(f&&f!=='auto')o.fundo=f;}
  if((e=filho(p,'tabs'))){o.tabs=filhos(e,'tab').filter(function(t){return at(t,'val')!=='clear';}).map(function(t){return {pos:num(at(t,'pos'),0)/20,tipo:at(t,'val')||'left',lider:at(t,'leader')};}).sort(function(a,b){return a.pos-b.pos;});}
  return o;
}
function Estilos(doc,tema){
  var S={def:{p:{},r:{sz:10}},porId:{},normalP:null,tema:tema||{}};
  if(!doc)return S;
  var dd=desc(doc,'docDefaults')[0];
  if(dd){var rd=desc(dd,'rPr')[0];if(rd)lerRPr(rd,S.def.r);var pd=desc(dd,'pPr')[0];if(pd)lerPPr(pd,S.def.p);}
  filhos(doc.documentElement,'style').forEach(function(st){
    var id=at(st,'styleId'),bo=filho(st,'basedOn');
    var tbl=filho(st,'tblPr');
    S.porId[id]={tipo:at(st,'type'),base:bo?at(bo,'val'):null,p:lerPPr(filho(st,'pPr')),r:lerRPr(filho(st,'rPr')),bordas:tbl?lerBordas(filho(tbl,'tblBorders')):null,nome:(filho(st,'name')&&at(filho(st,'name'),'val'))||''};
    if(at(st,'type')==='paragraph'&&(at(st,'default')==='1'||at(st,'default')==='true'))S.normalP=id;
  });
  return S;
}
function cadeia(S,id,campo){var lista=[],v=0;while(id&&S.porId[id]&&v<20){lista.unshift(S.porId[id][campo]);id=S.porId[id].base;v++;}return lista;}
function juntar(lista){var o={};lista.forEach(function(x){if(x)for(var k in x)if(x[k]!==undefined)o[k]=x[k];});return o;}
function lerBordas(el){
  if(!el)return null;var o={};
  ['top','left','bottom','right','insideH','insideV','start','end'].forEach(function(k){var b=filho(el,k);if(b){var v=at(b,'val');o[k==='start'?'left':k==='end'?'right':k]=(v&&v!=='nil'&&v!=='none')?{w:Math.max(0.25,num(at(b,'sz'),4)/8),cor:at(b,'color')}:null;}});
  return o;
}

/* ---------- numeração (listas) ---------- */
function Numeracao(doc){
  var N={abs:{},nums:{},cont:{}};
  if(!doc)return N;
  filhos(doc.documentElement,'abstractNum').forEach(function(a){
    var niveis={};
    filhos(a,'lvl').forEach(function(l){
      var il=num(at(l,'ilvl'),0),f=filho(l,'numFmt'),t=filho(l,'lvlText'),s=filho(l,'start');
      niveis[il]={fmt:f?at(f,'val'):'decimal',texto:t?at(t,'val'):'',inicio:s?num(at(s,'val'),1):1,p:lerPPr(filho(l,'pPr')),r:lerRPr(filho(l,'rPr'))};
    });
    N.abs[at(a,'abstractNumId')]=niveis;
  });
  filhos(doc.documentElement,'num').forEach(function(n){
    var ab=filho(n,'abstractNumId');var ov={};
    filhos(n,'lvlOverride').forEach(function(o){var so=filho(o,'startOverride');if(so)ov[num(at(o,'ilvl'),0)]=num(at(so,'val'),1);});
    N.nums[at(n,'numId')]={abs:ab?at(ab,'val'):null,ov:ov};
  });
  return N;
}
function romano(n){var v=[[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']],s='';v.forEach(function(p){while(n>=p[0]){s+=p[1];n-=p[0];}});return s;}
function letraN(n){var s='';while(n>0){var m=(n-1)%26;s=String.fromCharCode(97+m)+s;n=Math.floor((n-1)/26);}return s;}
function formatarNum(n,fmt){
  if(fmt==='lowerLetter')return letraN(n);if(fmt==='upperLetter')return letraN(n).toUpperCase();
  if(fmt==='lowerRoman')return romano(n);if(fmt==='upperRoman')return romano(n).toUpperCase();
  if(fmt==='decimalZero')return (n<10?'0':'')+n;if(fmt==='ordinal')return n+'º';
  return String(n);
}
function simbolo(t){
  // marcadores da fonte Symbol/Wingdings (área privada F0xx) viram caracteres comuns
  return String(t||'').replace(/[\uF000-\uF0FF]/g,function(c){var k=c.charCodeAt(0)&0xFF;return k===0xB7?'•':k===0xA7?'▪':k===0xD8?'➢':k===0x76?'❖':k===0xFC?'✓':k===0x6F?'○':'•';}).replace(/^o$/,'○');
}
function rotuloLista(N,numPr){
  if(!numPr||!numPr.id||numPr.id==='0')return null;
  var n=N.nums[numPr.id];if(!n)return null;var niveis=N.abs[n.abs];if(!niveis)return null;
  var il=numPr.nivel||0,lv=niveis[il];if(!lv)return null;
  var cont=N.cont[n.abs]=N.cont[n.abs]||{};
  for(var k in cont)if(+k>il)delete cont[k];
  if(cont[il]==null)cont[il]=(n.ov[il]!=null?n.ov[il]:lv.inicio);else cont[il]++;
  var txt;
  if(lv.fmt==='bullet')txt=simbolo(lv.texto)||'•';
  else if(lv.fmt==='none')txt='';
  else txt=String(lv.texto||'').replace(/%(\d)/g,function(m,d){var i=+d-1,l2=niveis[i]||lv;var v=cont[i]!=null?cont[i]:(l2.inicio||1);return formatarNum(v,i===il?lv.fmt:l2.fmt);});
  return {texto:txt,p:lv.p,r:lv.r};
}

/* ---------- leitura do documento ---------- */
function Leitor(zip,S,N,rels,avisos){
  this.zip=zip;this.S=S;this.N=N;this.rels=rels;this.avisos=avisos;
}
function relsDe(zip,parte){
  var cam=parte.replace(/([^\/]+)$/,'_rels/$1.rels');var f=zip.file(cam);var m={};
  if(!f)return m;
  filhos(xml(f.asText()).documentElement,'Relationship').forEach(function(r){m[r.getAttribute('Id')]={alvo:r.getAttribute('Target'),tipo:r.getAttribute('Type'),externo:r.getAttribute('TargetMode')==='External'};});
  return m;
}
function caminhoRel(alvo){alvo=String(alvo||'').replace(/^\//,'');if(/^word\//.test(alvo))return alvo;var p=('word/'+alvo).split('/'),o=[];p.forEach(function(x){if(x==='..')o.pop();else if(x!=='.')o.push(x);});return o.join('/');}
function avisar(L,txt){if(L.avisos.indexOf(txt)<0)L.avisos.push(txt);}

function lerBlocos(L,container){
  var blocos=[];
  filhos(container).forEach(function(el){
    var n=el.localName;
    if(n==='p')blocos.push(lerPar(L,el));
    else if(n==='tbl')blocos.push(lerTabela(L,el));
    else if(n==='sdt'){var c=filho(el,'sdtContent');if(c)blocos=blocos.concat(lerBlocos(L,c));}
    else if(n==='customXml'||n==='smartTag'){blocos=blocos.concat(lerBlocos(L,el));}
  });
  return blocos;
}
function lerPar(L,p){
  var S=L.S,pPrEl=filho(p,'pPr');
  var direto=lerPPr(pPrEl);
  var ps=pPrEl&&filho(pPrEl,'pStyle');var sid=ps?at(ps,'val'):S.normalP;
  var estP=juntar([S.def.p,L.tabP].concat(cadeia(S,sid,'p')));
  var estR=juntar([S.def.r,L.tabR].concat(cadeia(S,sid,'r')));
  var numPr=direto.num||estP.num;
  var lista=rotuloLista(L.N,numPr);
  var pp=juntar([estP,lista?lista.p:null,direto]);
  var marcaR=pPrEl&&filho(pPrEl,'rPr')?lerRPr(filho(pPrEl,'rPr')):{};
  var par={tipo:'p',estilo:sid,pp:pp,itens:[],flutuantes:[],quebraSecao:!!(pPrEl&&filho(pPrEl,'sectPr'))};
  if(lista&&lista.texto!==''){par.rotulo={texto:lista.texto,r:juntar([estR,lista.r])};}
  var campo=null; // campo complexo (fldChar)
  function percorrer(el,rEstilo){
    filhos(el).forEach(function(c){
      var n=c.localName;
      if(n==='r'){lerRun(c,rEstilo);}
      else if(n==='hyperlink'||n==='smartTag'||n==='customXml'||n==='ins'||n==='fldSimple'){
        if(n==='fldSimple'){var ins=(at(c,'instr')||'').trim().split(/\s+/)[0].toUpperCase();if(ins==='PAGE'||ins==='NUMPAGES'){par.itens.push({campo:ins,r:juntar([estR])});return;}}
        percorrer(c,rEstilo);
      }
      else if(n==='sdt'){var sc=filho(c,'sdtContent');if(sc)percorrer(sc,rEstilo);}
      else if(n==='del'||n==='moveFrom'){avisar(L,'O Word tinha alterações controladas: o PDF mostra o texto como está aceito (o que foi apagado não aparece).');}
      else if(n==='oMath'||n==='oMathPara'){avisar(L,'Equações do Word não são convertidas.');}
    });
  }
  function lerRun(r,base){
    var rPr=filho(r,'rPr');var rs=rPr&&filho(rPr,'rStyle');
    var est=juntar([estR].concat(rs?cadeia(S,at(rs,'val'),'r'):[]).concat([lerRPr(rPr)]));
    filhos(r).forEach(function(c){
      var n=c.localName;
      if(n==='fldChar'){var t=at(c,'fldCharType');if(t==='begin')campo={instr:'',fase:'instr'};else if(t==='separate'&&campo){campo.fase='res';var ins=campo.instr.trim().split(/\s+/)[0].toUpperCase();if(ins==='PAGE'||ins==='NUMPAGES'){par.itens.push({campo:ins,r:est});campo.pular=true;}}else if(t==='end'){if(campo&&!campo.pular){var ie=campo.instr.trim().split(/\s+/)[0].toUpperCase();if(ie==='PAGE'||ie==='NUMPAGES')par.itens.push({campo:ie,r:est});}campo=null;}return;}
      if(n==='instrText'){if(campo)campo.instr+=c.textContent;return;}
      if(campo&&(campo.fase==='instr'||campo.pular))return;
      if(est.oculto)return;
      if(n==='t')par.itens.push({t:c.textContent,r:est});
      else if(n==='tab'||n==='ptab')par.itens.push({tab:true,r:est});
      else if(n==='br'){var bt=at(c,'type');par.itens.push(bt==='page'?{pagina:true}:bt==='column'?{pagina:true}:{linha:true,r:est});}
      else if(n==='cr')par.itens.push({linha:true,r:est});
      else if(n==='noBreakHyphen')par.itens.push({t:'-',r:est});
      else if(n==='softHyphen'){}
      else if(n==='sym'){var ch=at(c,'char');par.itens.push({t:simbolo(String.fromCharCode(parseInt(ch||'2022',16))),r:est});}
      else if(n==='lastRenderedPageBreak'){}
      else if(n==='drawing'){lerDesenho(c,est);}
      else if(n==='pict'||n==='object'){
        var ims=desc(c,'imagedata');
        if(ims.length){var rid=ims[0].getAttribute('r:id')||ims[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');var sh=desc(c,'shape')[0];var st=sh?sh.getAttribute('style')||'':'';var mw=st.match(/width:([\d.]+)pt/),mh=st.match(/height:([\d.]+)pt/);if(rid&&mw&&mh)par.itens.push({img:{rid:rid,w:+mw[1],h:+mh[1],rels:L.rels}});else avisar(L,'Uma figura antiga do Word não foi convertida.');}
        else avisar(L,'Formas e objetos antigos do Word não são convertidos.');
      }
      else if(n==='AlternateContent'){var ch2=filho(c,'Choice');var fb=filho(c,'Fallback');var alvo=ch2||fb;if(alvo){var dr=desc(alvo,'drawing')[0];if(dr)lerDesenho(dr,est);}}
    });
  }
  function lerDesenho(dr,est){
    var inl=filho(dr,'inline'),anc=filho(dr,'anchor'),el=inl||anc;if(!el)return;
    var ext=filho(el,'extent');var w=num(ext&&ext.getAttribute('cx'),0)/12700,h=num(ext&&ext.getAttribute('cy'),0)/12700;
    var blip=desc(el,'blip')[0];
    if(!blip){
      if(desc(el,'txbx').length||desc(el,'wsp').length){
        // caixa de texto: o texto vai como parágrafos normais logo abaixo (melhor que sumir)
        desc(el,'txbxContent').forEach(function(tx){par.extraBlocos=(par.extraBlocos||[]).concat(lerBlocos(L,tx));});
        avisar(L,'Caixas de texto e formas: o texto delas foi posto no corpo do documento, sem o desenho da caixa.');
      }else avisar(L,'Gráficos, SmartArt e formas do Word não são convertidos.');
      return;
    }
    var rid=blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed')||blip.getAttribute('r:embed');
    var img={rid:rid,w:w,h:h,rels:L.rels};
    if(anc){
      var ph=filho(anc,'positionH'),pv=filho(anc,'positionV');
      img.pos={
        h:{rel:ph?ph.getAttribute('relativeFrom'):'column',off:num(ph&&filho(ph,'posOffset')&&filho(ph,'posOffset').textContent,0)/12700,al:ph&&filho(ph,'align')?filho(ph,'align').textContent:null},
        v:{rel:pv?pv.getAttribute('relativeFrom'):'paragraph',off:num(pv&&filho(pv,'posOffset')&&filho(pv,'posOffset').textContent,0)/12700,al:pv&&filho(pv,'align')?filho(pv,'align').textContent:null},
        atras:anc.getAttribute('behindDoc')==='1'
      };
      par.flutuantes.push(img);
    }else par.itens.push({img:img,r:est});
  }
  percorrer(p,estR);
  par.rFim=juntar([estR,marcaR]);
  return par;
}
function lerTabela(L,t){
  var S=L.S,tp=filho(t,'tblPr');
  var ts=tp&&filho(tp,'tblStyle');var sid=ts?at(ts,'val'):null;
  var bordas=null;cadeia(S,sid,'bordas').forEach(function(b){if(b)bordas=Object.assign(bordas||{},b);});
  var bd=tp&&lerBordas(filho(tp,'tblBorders'));if(bd)bordas=Object.assign(bordas||{},bd);
  var estP=juntar(cadeia(S,sid,'p')),estR=juntar(cadeia(S,sid,'r'));
  var grade=filhos(filho(t,'tblGrid'),'gridCol').map(function(g){return num(at(g,'w'),0)/20;});
  var jc=tp&&filho(tp,'jc')?at(filho(tp,'jc'),'val'):null;
  var ind=tp&&filho(tp,'tblInd')?num(at(filho(tp,'tblInd'),'w'),0)/20:0;
  var cm=tp&&filho(tp,'tblCellMar');var marE=5.4,marD=5.4;
  if(cm){var e=filho(cm,'left')||filho(cm,'start'),d=filho(cm,'right')||filho(cm,'end');if(e)marE=num(at(e,'w'),108)/20;if(d)marD=num(at(d,'w'),108)/20;}
  var linhas=filhos(t,'tr').map(function(tr){
    var trPr=filho(tr,'trPr');var trh=trPr&&filho(trPr,'trHeight');
    var gb=trPr&&filho(trPr,'gridBefore');
    return {alt:trh?num(at(trh,'val'),0)/20:0,exata:trh&&at(trh,'hRule')==='exact',antes:gb?num(at(gb,'val'),0):0,celulas:filhos(tr,'tc').map(function(tc){
      var pr=filho(tc,'tcPr');var gs=pr&&filho(pr,'gridSpan');var vm=pr&&filho(pr,'vMerge');var sh=pr&&filho(pr,'shd');var va=pr&&filho(pr,'vAlign');
      var cel={span:gs?num(at(gs,'val'),1):1,vmerge:vm?(at(vm,'val')==='restart'?'inicio':'cont'):null,fundo:sh&&at(sh,'fill')&&at(sh,'fill')!=='auto'?at(sh,'fill'):null,valign:va?at(va,'val'):'top',bordas:pr?lerBordas(filho(pr,'tcBorders')):null};
      var antP=L.tabP,antR=L.tabR;L.tabP=estP;L.tabR=estR;
      try{cel.blocos=lerBlocos(L,tc);}finally{L.tabP=antP;L.tabR=antR;}
      return cel;
    })};
  });
  return {tipo:'tbl',grade:grade,bordas:bordas,jc:jc,ind:ind,marE:marE,marD:marD,linhas:linhas,estR:estR};
}
function lerSecao(s){
  var sz=filho(s,'pgSz'),mg=filho(s,'pgMar');
  var o={w:num(at(sz,'w'),11906)/20,h:num(at(sz,'h'),16838)/20,
    top:num(at(mg,'top'),1440)/20,bottom:num(at(mg,'bottom'),1440)/20,left:num(at(mg,'left'),1440)/20,right:num(at(mg,'right'),1440)/20,
    header:num(at(mg,'header'),708)/20,footer:num(at(mg,'footer'),708)/20,cab:{},rod:{},tituloPg:!!filho(s,'titlePg')};
  if(at(sz,'orient')==='landscape'&&o.w<o.h){var x=o.w;o.w=o.h;o.h=x;}
  filhos(s,'headerReference').forEach(function(h){o.cab[at(h,'type')||'default']=h.getAttribute('r:id')||h.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');});
  filhos(s,'footerReference').forEach(function(h){o.rod[at(h,'type')||'default']=h.getAttribute('r:id')||h.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');});
  return o;
}

/* ---------- PDF ---------- */
function corRgb(PDFLib,hex,pad){
  hex=String(hex||'').replace('#','');
  var nomes={yellow:'FFFF00',green:'00FF00',cyan:'00FFFF',magenta:'FF00FF',blue:'0000FF',red:'FF0000',darkBlue:'000080',darkCyan:'008080',darkGreen:'008000',darkMagenta:'800080',darkRed:'800000',darkYellow:'808000',darkGray:'808080',lightGray:'C0C0C0',black:'000000',white:'FFFFFF'};
  if(nomes[hex])hex=nomes[hex];
  if(!/^[0-9a-f]{6}$/i.test(hex))return pad||PDFLib.rgb(0,0,0);
  return PDFLib.rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);
}

async function converter(entrada,op){
  op=op||{};
  var prog=op.progresso||function(){};
  await script('vendor/pizzip-3.1.6/pizzip.min.js');
  if(!window.fontkit)await script('vendor/pdf-lib-fontkit-1.1.1/fontkit.umd.min.js');
  var PDFLib=window.PDFLib;
  var bytes=entrada instanceof Uint8Array?entrada:new Uint8Array(entrada);
  if(bytes[0]===0xD0&&bytes[1]===0xCF)throw new Error('este é um Word antigo (.doc). Abra no Word e use Arquivo > Salvar como > "Documento do Word (.docx)" ou direto "PDF"');
  if(!(bytes[0]===0x50&&bytes[1]===0x4B))throw new Error('o arquivo não é um Word .docx (pode estar corrompido ou ser outro formato com a extensão trocada)');
  var zip;try{zip=new window.PizZip(bytes);}catch(e){throw new Error('o .docx está corrompido ('+((e&&e.message)||'não abriu')+')');}
  if(zip.file('word/document.xml')==null){
    if(zip.file('EncryptedPackage')||zip.file('EncryptionInfo'))throw new Error('o Word está protegido por senha. Abra no Word, tire a senha e tente de novo');
    throw new Error('não achei o texto dentro do .docx (arquivo incompleto ou de outro programa)');
  }
  var avisos=[];
  prog(0.05,'Lendo o Word…');
  // tema (fontes do tema: Calibri/Cambria nos documentos novos)
  var tema={maior:'Calibri Light',menor:'Calibri'};
  var tf=zip.file('word/theme/theme1.xml');
  if(tf){try{var td=xml(tf.asText());var mj=desc(td,'majorFont')[0],mn=desc(td,'minorFont')[0];if(mj&&filho(mj,'latin'))tema.maior=filho(mj,'latin').getAttribute('typeface');if(mn&&filho(mn,'latin'))tema.menor=filho(mn,'latin').getAttribute('typeface');}catch(e){}}
  var S=Estilos(zip.file('word/styles.xml')?xml(zip.file('word/styles.xml').asText()):null,tema);
  var N=Numeracao(zip.file('word/numbering.xml')?xml(zip.file('word/numbering.xml').asText()):null);
  var docXml=xml(zip.file('word/document.xml').asText());
  var corpo=desc(docXml,'body')[0];
  var relsDoc=relsDe(zip,'word/document.xml');
  var L=new Leitor(zip,S,N,relsDoc,avisos);
  var blocos=lerBlocos(L,corpo);
  // caixas de texto viram blocos logo depois do parágrafo
  var exp=[];blocos.forEach(function(b){exp.push(b);if(b.extraBlocos)exp=exp.concat(b.extraBlocos);});blocos=exp;
  var secs=filhos(corpo,'sectPr');var sec=secs.length?lerSecao(secs[secs.length-1]):lerSecao(null);
  if(desc(docXml,'commentReference').length)avisar(L,'Os comentários do Word não vão para o PDF.');
  function lerParte(rid){
    if(!rid||!relsDoc[rid])return null;
    var cam=caminhoRel(relsDoc[rid].alvo),f=zip.file(cam);if(!f)return null;
    var Lh=new Leitor(zip,S,N,relsDe(zip,cam),avisos);
    return lerBlocos(Lh,xml(f.asText()).documentElement);
  }
  var cab={def:lerParte(sec.cab['default']),prim:sec.tituloPg?lerParte(sec.cab.first):null};
  var rod={def:lerParte(sec.rod['default']),prim:sec.tituloPg?lerParte(sec.rod.first):null};

  prog(0.2,'Preparando as fontes…');
  var pdf=await PDFLib.PDFDocument.create();
  pdf.registerFontkit(window.fontkit);
  pdf.setProducer('SAGA ADV · Word para PDF');pdf.setCreator('SAGA ADV');
  if(op.titulo)pdf.setTitle(op.titulo);
  var fontes={};
  async function fonte(r){
    var nome=r.fonte||(r.fonteTema&&/major/i.test(r.fonteTema)?S.tema.maior:S.tema.menor);
    var fam=familiaDe(nome),v=(r.b?1:0)+(r.i?2:0);var k=fam+v;
    if(!fontes[k]){fontes[k]=(async function(){var f=await pdf.embedFont(await bytesFonte(FAMILIAS[fam][v]),{subset:true});var fk=f.embedder&&f.embedder.font;return {f:f,fk:fk,upm:fk?fk.unitsPerEm:1000,asc:fk?fk.ascent:800,des:fk?fk.descent:-200,gap:fk?fk.lineGap:0};})();}
    return fontes[k];
  }
  // imagens (cada uma embutida uma vez)
  var imgsCache={};
  async function imagem(img){
    var rel=img.rels[img.rid];if(!rel){return null;}
    var cam=caminhoRel(rel.alvo);
    if(imgsCache[cam]!==undefined)return imgsCache[cam];
    imgsCache[cam]=null;
    var f=zip.file(cam);if(!f){avisar(L,'Uma imagem do Word não foi encontrada dentro do arquivo.');return null;}
    var b=f.asUint8Array(),ext=(cam.split('.').pop()||'').toLowerCase();
    try{
      if(b[0]===0xFF&&b[1]===0xD8)imgsCache[cam]=await pdf.embedJpg(b);
      else if(b[0]===0x89&&b[1]===0x50)imgsCache[cam]=await pdf.embedPng(b);
      else if(/emf|wmf/.test(ext)){avisar(L,'Imagens no formato EMF/WMF (desenhos do Office) não são convertidas.');}
      else{
        var bmp=await createImageBitmap(new Blob([b]));var cv=document.createElement('canvas');cv.width=bmp.width;cv.height=bmp.height;cv.getContext('2d').drawImage(bmp,0,0);
        var bl=await new Promise(function(ok){cv.toBlob(ok,'image/png');});imgsCache[cam]=await pdf.embedPng(new Uint8Array(await bl.arrayBuffer()));
      }
    }catch(e){avisar(L,'Uma imagem do Word não pôde ser lida ('+((e&&e.message)||ext)+').');}
    return imgsCache[cam];
  }

  /* ---- diagramação: parágrafo → linhas ---- */
  async function medir(par,larg){
    var pp=par.pp;
    var itens=[];
    if(par.rotulo){itens.push({rotulo:true,t:par.rotulo.texto,r:par.rotulo.r});itens.push({tab:true,r:par.rotulo.r,doRotulo:true});}
    par.itens.forEach(function(x){itens.push(x);});
    // palavras (com o espaço que vem depois) e pedaços especiais
    var toks=[];
    for(var i=0;i<itens.length;i++){
      var it=itens[i];
      if(it.t!=null){
        var r=it.r||{};var txt=it.t;if(r.caps||r.smallCaps)txt=txt.toUpperCase();
        var partes=txt.match(/[^\s]+\s*|\s+/g)||[];
        partes.forEach(function(pt){toks.push({t:pt,r:r});});
      }else toks.push(it);
    }
    var esq=pp.esq||0,dir=pp.dir||0,prim=pp.prim||0;
    var linhas=[],L1=null;
    function nova(){L1={tk:[],w:0,asc:0,des:0,ini:linhas.length===0?esq+prim:esq};L1.max=larg-L1.ini-dir;linhas.push(L1);}
    nova();
    for(var j=0;j<toks.length;j++){
      var tk=toks[j];
      if(tk.pagina){L1.fim='pagina';linhas.quebraPagina=true;nova();continue;}
      if(tk.linha){L1.fim='linha';var fz=await fonte(tk.r||par.rFim||{});var s0=tamanho(tk.r||{});L1.asc=Math.max(L1.asc,fz.asc/fz.upm*s0);L1.des=Math.max(L1.des,-fz.des/fz.upm*s0+fz.gap/fz.upm*s0);nova();continue;}
      if(tk.campo){var fc=await fonte(tk.r||{});var sc=tamanho(tk.r||{});var wc=fc.f.widthOfTextAtSize('00',sc);L1.tk.push({campo:tk.campo,r:tk.r,f:fc,s:sc,w:wc,x:L1.w});L1.w+=wc;L1.asc=Math.max(L1.asc,fc.asc/fc.upm*sc);L1.des=Math.max(L1.des,(-fc.des+fc.gap)/fc.upm*sc);continue;}
      if(tk.img){
        var em=await imagem(tk.img);if(!em)continue;
        var iw=tk.img.w,ih=tk.img.h;if(iw>L1.max&&L1.max>20){ih=ih*L1.max/iw;iw=L1.max;}
        if(L1.w+iw>L1.max+0.5&&L1.tk.length)nova();
        L1.tk.push({img:em,w:iw,h:ih,x:L1.w});L1.w+=iw;L1.asc=Math.max(L1.asc,ih);continue;
      }
      if(tk.tab){
        var fT=await fonte(tk.r||{});var sT=tamanho(tk.r||{});
        var posAbs=L1.ini+L1.w,prox=null;
        (pp.tabs||[]).forEach(function(t){if(prox==null&&t.pos>posAbs+0.5&&t.tipo!=='clear')prox=t;});
        if(tk.doRotulo&&prim<0&&posAbs<esq-0.5)prox={pos:esq,tipo:'left'};
        var alvo=prox?prox.pos:Math.floor(posAbs/36+1)*36;
        var wt=Math.max(0,alvo-posAbs);
        L1.tk.push({tab:true,w:wt,x:L1.w,tipoTab:prox?prox.tipo:'left',lider:prox&&prox.lider,r:tk.r,f:fT,s:sT});L1.w+=wt;continue;
      }
      var r=tk.r||{};var f=await fonte(r);var s=tamanho(r);
      var txt=seguro(f,tk.t);
      var w=f.f.widthOfTextAtSize(txt,s);
      var wSemEsp=f.f.widthOfTextAtSize(txt.replace(/\s+$/,''),s);
      if(L1.w+wSemEsp>L1.max+0.5&&L1.tk.length&&!/^\s+$/.test(txt)){L1.fim='auto';nova();}
      if(!L1.tk.length&&/^\s+$/.test(txt)&&linhas.length>1&&linhas[linhas.length-2].fim==='auto')continue;
      // palavra maior que a linha: quebra por letra
      if(wSemEsp>L1.max&&L1.max>10){
        var pedaco='';for(var c=0;c<txt.length;c++){var t2=pedaco+txt[c];if(f.f.widthOfTextAtSize(t2,s)>L1.max-L1.w&&pedaco){L1.tk.push(tok(pedaco,r,f,s,L1.w));L1.w+=f.f.widthOfTextAtSize(pedaco,s);mede(L1,f,s);L1.fim='auto';nova();pedaco=txt[c];}else pedaco=t2;}
        txt=pedaco;w=f.f.widthOfTextAtSize(txt,s);
      }
      L1.tk.push(tok(txt,r,f,s,L1.w));L1.w+=w;mede(L1,f,s);
    }
    // altura de cada linha (regra do Word)
    var fFim=await fonte(par.rFim||{}),sFim=tamanho(par.rFim||{});
    linhas.forEach(function(l){
      if(!l.asc){l.asc=fFim.asc/fFim.upm*sFim;l.des=(-fFim.des+fFim.gap)/fFim.upm*sFim;}
      var natural=l.asc+l.des,h=natural;
      var ln=pp.linha;
      if(ln&&ln.mult)h=natural*ln.mult;
      else if(ln&&ln.pt){if(ln.regra==='exact')h=ln.pt;else h=Math.max(natural,ln.pt);}
      l.h=h;
      if(ln&&ln.pt&&ln.regra==='exact')l.base=h-l.des;
      else if(ln&&ln.pt)l.base=l.asc+(h-natural);
      else l.base=l.asc; // entrelinhas múltiplas: o Word põe o espaço extra embaixo da linha
    });
    // linha final só com espaço (parágrafo vazio) continua com altura
    return linhas;
  }
  function tok(t,r,f,s,x){return {t:t,r:r,f:f,s:s,x:x};}
  function mede(l,f,s){l.asc=Math.max(l.asc,f.asc/f.upm*s);l.des=Math.max(l.des,(-f.des+f.gap)/f.upm*s);}
  function tamanho(r){var s=r.sz||11;if(r.vert==='superscript'||r.vert==='subscript')s*=0.65;if(r.smallCaps)s*=0.8;return s;}
  function seguro(f,t){
    if(!f.fk)return t;var o='';
    for(var i=0;i<t.length;i++){var c=t[i],cp=t.codePointAt(i);if(cp>0xFFFF)i++;
      if(c===' '){o+=' ';continue;}
      if(c==='‑'){o+='-';continue;}
      try{o+=f.fk.hasGlyphForCodePoint(cp)?String.fromCodePoint(cp):'?';}catch(e){o+='?';}
    }
    return o;
  }

  /* ---- páginas ---- */
  var paginas=[]; // cada uma: lista de comandos para desenhar
  var pagina=null,y=0,topoCorpo=sec.top,baseCorpo=sec.h-sec.bottom;
  var larguraCorpo=sec.w-sec.left-sec.right;
  function novaPagina(){pagina={cmds:[]};paginas.push(pagina);y=topoCorpo;}
  novaPagina();
  var ultimoEstilo=null,depoisAnterior=0;

  function desenharLinha(cmds,l,x0,yTopo,pp,ultima){
    var extra=0,nEsp=0,larg=l.max;
    var jc=pp.jc||'left';
    var largUsada=l.w;
    // espaço do fim da linha não conta
    var ult=l.tk[l.tk.length-1];var sobraEsp=0;
    if(ult&&ult.t){var semEsp=ult.t.replace(/\s+$/,'');sobraEsp=ult.f.f.widthOfTextAtSize(ult.t,ult.s)-ult.f.f.widthOfTextAtSize(semEsp,ult.s);}
    largUsada-=sobraEsp;
    var dx=0;
    if(jc==='center')dx=(larg-largUsada)/2;else if(jc==='right')dx=larg-largUsada;
    else if(jc==='both'&&!ultima&&l.fim==='auto'){
      // posição do último tab: só o que vem depois dele é justificado
      var ini=0;l.tk.forEach(function(t,i){if(t.tab)ini=i+1;});
      for(var i=ini;i<l.tk.length-1;i++)if(l.tk[i].t&&/\s$/.test(l.tk[i].t))nEsp++;
      if(nEsp)extra=(larg-largUsada)/nEsp;
      if(extra>larg*0.5)extra=0;
      l.inicioJust=ini;
    }
    var yBase=yTopo+l.base;
    var acum=0;
    // tab à direita/centro: empurra o texto seguinte
    for(var k=0;k<l.tk.length;k++){
      var t=l.tk[k];
      if(t.tab&&(t.tipoTab==='right'||t.tipoTab==='center'||t.tipoTab==='end')){
        var resto=0;for(var m=k+1;m<l.tk.length&&!l.tk[m].tab;m++)resto+=l.tk[m].w!=null?l.tk[m].w:l.tk[m].f.f.widthOfTextAtSize(l.tk[m].t,l.tk[m].s);
        var ajuste=t.tipoTab==='center'?resto/2:resto;
        t.ajusteTab=-Math.min(ajuste,t.w);
      }
    }
    for(var j=0;j<l.tk.length;j++){
      var tk=l.tk[j];
      var x=x0+l.ini+dx+tk.x+acum;
      if(tk.tab){
        if(tk.ajusteTab)acum+=tk.ajusteTab;
        if(tk.lider==='dot'||tk.lider==='hyphen'||tk.lider==='underscore'){
          var ch=tk.lider==='dot'?'.':tk.lider==='hyphen'?'-':'_';var wc=tk.f.f.widthOfTextAtSize(ch,tk.s);var n=Math.floor((tk.w+(tk.ajusteTab||0)-2)/wc);
          if(n>0)cmds.push({tipo:'texto',t:new Array(n+1).join(ch),x:x+1,y:yBase,f:tk.f.f,s:tk.s,cor:null});
        }
        continue;
      }
      if(tk.img){cmds.push({tipo:'img',img:tk.img,x:x,y:yBase-tk.h,w:tk.w,h:tk.h});continue;}
      var r=tk.r||{};
      var w=tk.w!=null?tk.w:tk.f.f.widthOfTextAtSize(tk.t,tk.s);
      var yb=yBase;if(r.vert==='superscript')yb-=tk.s*0.55;else if(r.vert==='subscript')yb+=tk.s*0.2;
      if(r.marca||r.fundo)cmds.push({tipo:'ret',x:x,y:yTopo,w:w+(extra&&/\s$/.test(tk.t||'')?extra:0),h:l.h,cor:r.marca||r.fundo});
      if(tk.campo)cmds.push({tipo:'campo',campo:tk.campo,x:x,y:yb,f:tk.f.f,s:tk.s,cor:r.cor});
      else cmds.push({tipo:'texto',t:tk.t,x:x,y:yb,f:tk.f.f,s:tk.s,cor:r.cor});
      var wSem=tk.t?tk.f.f.widthOfTextAtSize(tk.t.replace(/\s+$/,''),tk.s):w;
      if(r.u)cmds.push({tipo:'linha',x1:x,x2:x+(j===l.tk.length-1?wSem:w+(extra&&/\s$/.test(tk.t||'')&&j>=(l.inicioJust||0)?extra:0)),y:yb+tk.s*0.12,esp:Math.max(0.5,tk.s/18),cor:r.cor});
      if(r.strike)cmds.push({tipo:'linha',x1:x,x2:x+wSem,y:yb-tk.s*0.3,esp:Math.max(0.5,tk.s/18),cor:r.cor});
      if(extra&&j>=(l.inicioJust||0)&&tk.t&&/\s$/.test(tk.t))acum+=extra;
    }
  }

  async function diagramarPar(par,ctx){
    // ctx: {cmds, x0, larg, y, limite(y)->bool para quebrar, novaPagina()}
    var pp=par.pp;
    var linhas=await medir(par,ctx.larg);
    var antes=pp.antes||0,depois=pp.depois||0;
    if(pp.contextual&&ctx.ultimoEstilo===par.estilo){antes=0;ctx.y-=ctx.depoisAnterior||0;}
    if(ctx.paginada&&pp.quebraAntes&&ctx.y>ctx.topo+1)ctx.nova();
    var espAntes=antes; // o Word soma o "depois" do parágrafo anterior com o "antes" deste
    if(ctx.paginada&&ctx.y<=ctx.topo+0.5&&ctx.paginaN&&ctx.paginaN()>1)espAntes=0; // no alto de uma página nova o "antes" não conta
    ctx.y+=espAntes;
    var flu=par.flutuantes||[];
    var yIniPar=ctx.y;
    for(var i=0;i<linhas.length;i++){
      var l=linhas[i];
      if(ctx.paginada&&ctx.y+l.h>ctx.base+0.5&&ctx.y>ctx.topo+0.5){ctx.nova();if(i===0)yIniPar=ctx.y;}
      if(pp.fundo&&ctx.cmds)ctx.cmds().push({tipo:'ret',x:ctx.x0+(pp.esq||0),y:ctx.y,w:ctx.larg-(pp.esq||0)-(pp.dir||0),h:l.h+(i===linhas.length-1?depois:0),cor:pp.fundo});
      var ultima=i===linhas.length-1||l.fim==='linha'||l.fim==='pagina';
      desenharLinha(ctx.cmds(),l,ctx.x0,ctx.y,pp,ultima);
      ctx.y+=l.h;
      if(l.fim==='pagina'&&ctx.paginada)ctx.nova();
    }
    // imagens soltas (ancoradas)
    for(var k=0;k<flu.length;k++){
      var im=flu[k],em=await imagem(im);if(!em)continue;
      var x,yy;var ph=im.pos.h,pv=im.pos.v;
      var refX=ph.rel==='page'?0:ph.rel==='margin'||ph.rel==='column'?sec.left:ctx.x0;
      var refW=ph.rel==='page'?sec.w:larguraCorpo;
      if(ph.al==='center')x=refX+(refW-im.w)/2;else if(ph.al==='right')x=refX+refW-im.w;else if(ph.al==='left')x=refX;else x=refX+ph.off;
      var refY=pv.rel==='page'?0:pv.rel==='margin'||pv.rel==='topMargin'?sec.top:yIniPar;
      var refH=pv.rel==='page'?sec.h:(baseCorpo-topoCorpo);
      if(pv.rel==='topMargin')refY=0;
      if(pv.al==='center')yy=refY+(refH-im.h)/2;else if(pv.al==='bottom')yy=refY+refH-im.h;else if(pv.al==='top')yy=refY;else yy=refY+pv.off;
      ctx.cmds().unshift({tipo:'img',img:em,x:x,y:yy,w:im.w,h:im.h});
    }
    ctx.y+=depois;ctx.depoisAnterior=depois;ctx.ultimoEstilo=par.estilo;
    if(par.quebraSecao&&ctx.paginada)ctx.nova();
  }

  async function alturaBlocos(blocos,larg){
    var tmp={cmds:function(){return [];},x0:0,larg:larg,y:0,paginada:false,depoisAnterior:0,topo:0};
    for(var i=0;i<blocos.length;i++){if(blocos[i].tipo==='p')await diagramarPar(blocos[i],tmp);else tmp.y+=await diagramarTabela(blocos[i],tmp,true);}
    return tmp.y;
  }
  async function diagramarTabela(t,ctx,soMedir){
    var grade=t.grade.slice();var tot=grade.reduce(function(a,b){return a+b;},0)||ctx.larg;
    var disp=ctx.larg-(t.ind||0);
    if(!grade.length){var nc=Math.max.apply(null,t.linhas.map(function(l){return l.celulas.reduce(function(a,c){return a+c.span;},0);}))||1;grade=new Array(nc).fill(disp/nc);tot=disp;}
    if(tot>disp+1){grade=grade.map(function(g){return g*disp/tot;});tot=disp;}
    var x0=ctx.x0+(t.ind||0);if(t.jc==='center')x0=ctx.x0+(ctx.larg-tot)/2;else if(t.jc==='right'||t.jc==='end')x0=ctx.x0+ctx.larg-tot;
    var yIni=ctx.y,total=0;
    // vMerge: célula que continua fica sem conteúdo e sem borda entre as linhas
    for(var li=0;li<t.linhas.length;li++){
      var linha=t.linhas[li];
      var col=linha.antes||0,cels=[];
      for(var ci=0;ci<linha.celulas.length;ci++){
        var c=linha.celulas[ci];var x=x0;for(var a=0;a<col;a++)x+=grade[a]||0;var w=0;for(var b=0;b<c.span;b++)w+=grade[col+b]||0;
        cels.push({c:c,x:x,w:w,col:col});col+=c.span;
      }
      var h=0;
      for(var k=0;k<cels.length;k++){var ce=cels[k];ce.hc=ce.c.vmerge==='cont'?0:await alturaBlocos(ce.c.blocos,ce.w-t.marE-t.marD);h=Math.max(h,ce.hc);}
      h=Math.max(h+1,linha.alt||0);if(linha.exata)h=linha.alt;
      if(soMedir){total+=h;continue;}
      if(ctx.paginada&&ctx.y+h>ctx.base+0.5&&ctx.y>ctx.topo+0.5)ctx.nova();
      var yL=ctx.y;
      for(var m=0;m<cels.length;m++){
        var cc=cels[m],cel=cc.c;
        if(cel.fundo)ctx.cmds().push({tipo:'ret',x:cc.x,y:yL,w:cc.w,h:h,cor:cel.fundo});
        if(cel.vmerge!=='cont'){
          var dy=cel.valign==='center'?(h-cc.hc)/2:cel.valign==='bottom'?(h-cc.hc):0;
          var sub={cmds:ctx.cmds,x0:cc.x+t.marE,larg:cc.w-t.marE-t.marD,y:yL+dy,paginada:false,depoisAnterior:0,topo:yL};
          for(var q=0;q<cel.blocos.length;q++){if(cel.blocos[q].tipo==='p')await diagramarPar(cel.blocos[q],sub);else sub.y+=await diagramarTabela(cel.blocos[q],sub,false)||0;}
        }
        // bordas
        var B=Object.assign({},t.bordas||{}),cb=cel.bordas||{};
        var proxCont=li+1<t.linhas.length&&(function(){var cl=0;var nl=t.linhas[li+1].celulas;for(var z=0;z<nl.length;z++){if(cl===cc.col)return nl[z].vmerge==='cont';cl+=nl[z].span;}return false;})();
        var bt=cb.top!==undefined?cb.top:(li===0?B.top:B.insideH);
        var bb=cb.bottom!==undefined?cb.bottom:(li===t.linhas.length-1?B.bottom:B.insideH);
        var bl=cb.left!==undefined?cb.left:(cc.col===0?B.left:B.insideV);
        var br=cb.right!==undefined?cb.right:(cc.col+cel.span>=grade.length?B.right:B.insideV);
        if(cel.vmerge==='cont')bt=null;if(proxCont)bb=null;
        if(bt)ctx.cmds().push({tipo:'linha',x1:cc.x,x2:cc.x+cc.w,y:yL,esp:bt.w,cor:bt.cor});
        if(bb)ctx.cmds().push({tipo:'linha',x1:cc.x,x2:cc.x+cc.w,y:yL+h,esp:bb.w,cor:bb.cor});
        if(bl)ctx.cmds().push({tipo:'linhaV',x:cc.x,y1:yL,y2:yL+h,esp:bl.w,cor:bl.cor});
        if(br)ctx.cmds().push({tipo:'linhaV',x:cc.x+cc.w,y1:yL,y2:yL+h,esp:br.w,cor:br.cor});
      }
      ctx.y+=h;
    }
    if(soMedir)return total;
    ctx.depoisAnterior=0;ctx.ultimoEstilo=null;
    return 0;
  }

  // altura do cabeçalho empurra o corpo para baixo (como no Word)
  if(cab.def){var hc=await alturaBlocos(cab.def,larguraCorpo);topoCorpo=Math.max(sec.top,sec.header+hc);}
  if(rod.def){var hr=await alturaBlocos(rod.def,larguraCorpo);baseCorpo=Math.min(sec.h-sec.bottom,sec.h-sec.footer-hr);}
  y=topoCorpo;

  var C={cmds:function(){return pagina.cmds;},x0:sec.left,larg:larguraCorpo,y:topoCorpo,paginada:true,depoisAnterior:0,topo:topoCorpo,base:baseCorpo,
    nova:function(){novaPagina();C.y=topoCorpo;C.depoisAnterior=0;},paginaN:function(){return paginas.length;}};
  for(var bi=0;bi<blocos.length;bi++){
    if(bi%15===0)prog(0.25+0.55*bi/blocos.length,'Diagramando: '+Math.round(100*bi/blocos.length)+'%');
    var bl=blocos[bi];
    if(bl.tipo==='p')await diagramarPar(bl,C);else await diagramarTabela(bl,C,false);
  }
  // página final vazia (só a quebra no fim): tira
  if(paginas.length>1&&!paginas[paginas.length-1].cmds.length)paginas.pop();

  prog(0.85,'Montando o PDF…');
  var total=paginas.length;
  for(var pi=0;pi<paginas.length;pi++){
    var pg=pdf.addPage([sec.w,sec.h]);
    var cmds=[];
    var bc=(sec.tituloPg&&pi===0)?cab.prim:cab.def,br2=(sec.tituloPg&&pi===0)?rod.prim:rod.def;
    if(bc){var cx={cmds:function(){return cmds;},x0:sec.left,larg:larguraCorpo,y:sec.header,paginada:false,depoisAnterior:0,topo:sec.header};for(var a=0;a<bc.length;a++){if(bc[a].tipo==='p')await diagramarPar(bc[a],cx);else await diagramarTabela(bc[a],cx,false);}}
    if(br2){var hh=await alturaBlocos(br2,larguraCorpo);var cr={cmds:function(){return cmds;},x0:sec.left,larg:larguraCorpo,y:sec.h-sec.footer-hh,paginada:false,depoisAnterior:0,topo:0};for(var b2=0;b2<br2.length;b2++){if(br2[b2].tipo==='p')await diagramarPar(br2[b2],cr);else await diagramarTabela(br2[b2],cr,false);}}
    var todos=cmds.filter(function(c){return c.tipo==='img';}).concat(paginas[pi].cmds,cmds.filter(function(c){return c.tipo!=='img';}));
    desenharCmds(pg,todos,sec.h,pi+1,total,PDFLib);
  }
  prog(0.95,'Gravando…');
  var saida=await pdf.save({useObjectStreams:true});
  prog(1,'Pronto.');
  return {bytes:saida,paginas:total,avisos:avisos};
}
function desenharCmds(pg,cmds,H,n,total,PDFLib){
  cmds.forEach(function(c){
    if(c.tipo==='texto'||c.tipo==='campo'){
      var t=c.tipo==='campo'?String(c.campo==='NUMPAGES'?total:n):c.t.replace(/\s+$/,'');
      if(!t)return;
      try{pg.drawText(t,{x:c.x,y:H-c.y,size:c.s,font:c.f,color:c.cor?corRgb(PDFLib,c.cor):PDFLib.rgb(0,0,0)});}catch(e){}
    }else if(c.tipo==='img'){
      pg.drawImage(c.img,{x:c.x,y:H-c.y-c.h,width:c.w,height:c.h});
    }else if(c.tipo==='ret'){
      pg.drawRectangle({x:c.x,y:H-c.y-c.h,width:c.w,height:c.h,color:corRgb(PDFLib,c.cor,PDFLib.rgb(1,1,0)),borderWidth:0});
    }else if(c.tipo==='linha'){
      pg.drawLine({start:{x:c.x1,y:H-c.y},end:{x:c.x2,y:H-c.y},thickness:c.esp||0.5,color:c.cor&&c.cor!=='auto'?corRgb(PDFLib,c.cor):PDFLib.rgb(0,0,0)});
    }else if(c.tipo==='linhaV'){
      pg.drawLine({start:{x:c.x,y:H-c.y1},end:{x:c.x,y:H-c.y2},thickness:c.esp||0.5,color:c.cor&&c.cor!=='auto'?corRgb(PDFLib,c.cor):PDFLib.rgb(0,0,0)});
    }
  });
}
window.SagaWordPdf={converter:converter,familiaDe:familiaDe};
})();
