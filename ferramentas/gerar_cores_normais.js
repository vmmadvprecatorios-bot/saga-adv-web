// 17/11 (Dr. Victor, cores em dobro): gera as variáveis das versões NORMAIS (sem vidro) das cores de vidro
// (Azul profundo, Ciano, Âmbar, Aurora) e do Ônix, no mesmo formato dos temas de campanha (--t-*), e confere o
// contraste (texto, apagado e destaque >= 4,5 sobre o painel). Uso: node ferramentas/gerar_cores_normais.js
// A saída vai para o bloco "CORES EM DOBRO" do saga_tema.css (colar no lugar do bloco antigo).
function hsl(h,s,l){h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));l=Math.max(0,Math.min(1,l));var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;
  if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}return [r,g,b].map(function(v){return Math.round((v+m)*255);});}
function hx(c){return '#'+c.map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('').toUpperCase();}
function lum(c){var a=c.map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
function ct(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function aj(h,s,l,fundo,min,subir){var c=hsl(h,s,l);for(var i=0;i<60&&ct(c,fundo)<min;i++){l+=subir?.01:-.01;c=hsl(h,s,l);}return c;}
function rgba(c,a){return 'rgba('+c.join(',')+','+a+')';}
var CORES=[
  {id:'profundo',h:211,s:.85,hf:211,sf:.55},
  {id:'ciano',h:188,s:.85,hf:192,sf:.6},
  {id:'ambar',h:24,s:.95,hf:28,sf:.35},
  {id:'aurora',h:249,s:.9,hf:251,sf:.45},
  {id:'onix',h:0,s:0,hf:0,sf:0,neutro:true}];
var out=[],rel=[];
CORES.forEach(function(c){
  // ESCURO
  var z=c.neutro?[.055,.07,.09,.12,.155]:[.085,.10,.125,.15,.19],n1=hsl(c.hf,c.sf,z[0]),n2=hsl(c.hf,c.sf,z[1]),n3=hsl(c.hf,c.sf,z[2]),pn=hsl(c.hf,c.sf*.9,z[3]),pn2=hsl(c.hf,c.sf*.9,z[4]);
  var tx=hsl(c.hf,Math.min(.3,c.sf),.94),mu=aj(c.hf,Math.min(.18,c.sf),.66,pn2,4.5,true);
  var gold=c.neutro?hsl(0,0,.85):aj(c.h,c.s,.62,pn2,4.5,true),gl=c.neutro?hsl(0,0,.95):aj(c.h,c.s,.74,pn2,6,true),gd=c.neutro?hsl(0,0,.72):hsl(c.h,c.s,.5);
  var top=hsl(c.hf,c.sf*.9,.13),lat0=c.neutro?hsl(0,0,.17):hsl(c.h,c.s*.55,.24),lat1=c.neutro?hsl(0,0,.12):hsl(c.hf,c.sf,.15),lat2=c.neutro?hsl(0,0,.08):hsl(c.hf,c.sf,.10);
  var ativo=c.neutro?hsl(0,0,.92):aj(c.h,c.s,.72,lat0,4.5,true);
  var e={'--navy-1':hx(n1),'--navy-2':hx(n2),'--navy-3':hx(n3),'--panel':hx(pn),'--panel-2':hx(pn2),'--panel-solid':hx(pn),'--border':c.neutro?'rgba(255,255,255,.12)':rgba(hsl(c.hf,.5,.85),.14),'--border-soft':c.neutro?'rgba(255,255,255,.07)':rgba(hsl(c.hf,.5,.85),.08),
    '--text':hx(tx),'--muted':hx(mu),'--gold':hx(gold),'--gold-light':hx(gl),'--gold-deep':hx(gd),'--info':hx(gl)};
  var et={'--t-zeb1':hx(pn),'--t-zeb2':hx(hsl(c.hf,c.sf*.9,.175)),'--t-zebh':hx(hsl(c.hf,c.sf*.9,.21)),'--t-hoje':hx(c.neutro?hsl(0,0,.24):hsl(c.h,c.s*.6,.24)),'--t-top':hx(top),'--t-topb':'rgba(255,255,255,.07)','--t-brand':hx(tx),'--t-brandb':hx(gold),'--t-ham':hx(tx),'--t-av':hx(c.neutro?hsl(0,0,.32):hsl(c.h,c.s*.8,.42)),
    '--t-lat':'linear-gradient(180deg,'+hx(lat0)+' 0%,'+hx(lat1)+' 45%,'+hx(lat2)+' 100%)','--t-sec':hx(aj(c.hf,Math.min(.25,c.sf),.62,lat0,4.5,true)),'--t-item':hx(hsl(c.hf,Math.min(.3,c.sf),.93)),'--t-icon':hx(hsl(c.hf,Math.min(.3,c.sf),.80)),'--t-ativo':hx(ativo)};
  var fe=[hx(hsl(c.hf,c.sf,.16)),hx(n1),hx(hsl(c.hf,c.sf,.07))];
  // CLARO
  var w=[255,255,255],l1=hsl(c.hf,c.sf*.6,.92),l2=hsl(c.hf,c.sf*.6,.955),l3=hsl(c.hf,c.sf*.6,.88),p2=hsl(c.hf,c.sf*.8,.98);
  var ctx=aj(c.hf,Math.min(.45,c.sf),.16,w,12,false),cmu=aj(c.hf,Math.min(.2,c.sf),.40,p2,6,false);
  var cg=c.neutro?hsl(0,0,.16):aj(c.h,c.s,.52,w,5,false),cgl=c.neutro?hsl(0,0,.26):aj(c.h,c.s,.58,w,3.6,false),cgd=c.neutro?hsl(0,0,.08):hsl(c.h,c.s,Math.max(.12,lum(cg)>0?.24:.24));
  var clat0=c.neutro?hsl(0,0,.30):aj(c.h,c.s*.6,.40,w,4.8,false),clat1=c.neutro?hsl(0,0,.22):hsl(c.h,c.s*.65,.32),clat2=c.neutro?hsl(0,0,.15):hsl(c.hf,c.sf*.9,.22);
  var cl={'--navy-1':hx(l1),'--navy-2':hx(l2),'--navy-3':hx(l3),'--panel':'#FFFFFF','--panel-2':hx(p2),'--panel-solid':'#FFFFFF','--border':rgba(hsl(c.hf,Math.min(.5,c.sf),.15),.18),'--border-soft':rgba(hsl(c.hf,Math.min(.5,c.sf),.15),.11),
    '--text':hx(ctx),'--muted':hx(cmu),'--gold':hx(cg),'--gold-light':hx(cgl),'--gold-deep':hx(cgd),'--info':hx(cg)};
  var ct2={'--t-zeb1':'#FFFFFF','--t-zeb2':hx(hsl(c.hf,c.sf*.6,.965)),'--t-zebh':hx(hsl(c.hf,c.sf*.6,.935)),'--t-hoje':hx(c.neutro?hsl(0,0,.90):hsl(c.h,c.s*.6,.91)),'--t-top':hx(hsl(c.hf,c.sf*.6,.90)),'--t-topb':rgba(hsl(c.hf,Math.min(.5,c.sf),.2),.16),'--t-brand':hx(ctx),'--t-brandb':hx(cg),'--t-ham':hx(cg),'--t-av':hx(cg),
    '--t-lat':'linear-gradient(180deg,'+hx(clat0)+' 0%,'+hx(clat1)+' 45%,'+hx(clat2)+' 100%)','--t-sec':hx(aj(c.hf,Math.min(.3,c.sf),.80,clat0,4.5,true)),'--t-item':'#FFFFFF','--t-icon':hx(hsl(c.hf,Math.min(.3,c.sf),.88)),'--t-ativo':hx(c.neutro?hsl(0,0,.95):aj(c.h,c.s,.80,clat0,4.5,true))};
  var fc=[hx(hsl(c.hf,c.sf*.6,.965)),hx(l1)];
  function bloco(o,imp){return Object.keys(o).map(function(k){return k+':'+o[k]+(imp&&k.indexOf('--t-')!==0?'!important':'');}).join(';');}
  out.push('html[data-cor="'+c.id+'"] body[data-theme="dark"]{'+bloco(e,true)+';'+bloco(et)+'}');
  out.push('html[data-cor="'+c.id+'"]:has(> body[data-theme="dark"]),html[data-cor="'+c.id+'"] body[data-theme="dark"]{background:radial-gradient(1200px 640px at 70% -10%,'+fe[0]+','+fe[1]+' 55%,'+fe[2]+') fixed!important}');
  out.push('html[data-cor="'+c.id+'"] body[data-theme="light"]{'+bloco(cl,true)+';'+bloco(ct2)+'}');
  out.push('html[data-cor="'+c.id+'"]:has(> body[data-theme="light"]),html[data-cor="'+c.id+'"] body[data-theme="light"]{background:linear-gradient(180deg,'+fc[0]+','+fc[1]+') fixed!important}');
  rel.push(c.id+' escuro: texto '+ct(tx,pn2).toFixed(1)+' apagado '+ct(mu,pn2).toFixed(1)+' destaque '+ct(gold,pn2).toFixed(1)+' menu '+ct(hsl(c.hf,Math.min(.3,c.sf),.93),lat0).toFixed(1)+
    ' | claro: texto '+ct(ctx,p2).toFixed(1)+' apagado '+ct(cmu,p2).toFixed(1)+' destaque '+ct(cg,w).toFixed(1)+' menu '+ct(w,clat0).toFixed(1)+' topo '+ct(ctx,hsl(c.hf,c.sf*.6,.90)).toFixed(1)+
    ' AMOSTRA '+JSON.stringify([hx(n1),hx(lat0),hx(gold),hx(l1),'#FFFFFF',hx(cg)]));
});
if(process.argv[2]==='--relatorio')console.log(rel.join('\n'));else console.log(out.join('\n'));
