// SAGA GUARD - porta de entrada das telas internas.
// Carregado no <head>, antes de qualquer conteudo aparecer:
// 1) sem login salvo no navegador, vai direto para o login (nada da tela aparece);
// 2) com login, a tela fica escondida ate o saga_ui.js confirmar a sessao e as
//    permissoes (evento 'saga-ui-pronto') e a tela terminar de buscar os dados;
//    entao o conteudo entra em cascata suave (e sai do mesmo jeito ao trocar de tela).
(function(){
  var LOGIN='login_padrao_metalico.html';
  var CHAVE='sb-fmoskdxgjulagedzjxxk-auth-token';
  var html=document.documentElement;
  // Ficha ao lado (09/11): a tela aberta dentro do painel da Lista (?ao_lado=1) aparece sem a barra do topo,
  // o menu lateral e o botão Voltar; ir para outra tela troca a tela inteira, não o painel.
  var aoLado=window.top!==window&&/[?&]ao_lado=1(&|$)/.test(location.search);
  if(aoLado)html.classList.add('saga-ao-lado');

  // Efeitos de movimento: ligados para TODOS os perfis e aparelhos (antes o SAGA desligava sozinho quando o
  // computador ou celular estava com 'reduzir movimento' / 'mostrar animacoes' desligado). So desliga se a pessoa
  // escolher no SAGA (Configurações > Preferências > Efeitos de movimento).
  window.sagaMq=function(){var r=false;try{r=localStorage.getItem('saga-movimento')==='reduzido';}catch(e){}var nada=function(){};return {matches:r,addEventListener:nada,removeEventListener:nada,addListener:nada,removeListener:nada};};
  if(window.sagaMq().matches){
    html.classList.add('saga-sem-movimento');
    try{document.write('<style id="sagaSemMovimento">html.saga-sem-movimento *,html.saga-sem-movimento *::before,html.saga-sem-movimento *::after,html.saga-sem-movimento #topbarSaga *,html.saga-sem-movimento #sidebarSaga *,html.saga-sem-movimento #topbarSaga *::before,html.saga-sem-movimento #topbarSaga *::after,html.saga-sem-movimento #sidebarSaga *::before,html.saga-sem-movimento #sidebarSaga *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}</style>');}catch(e){}
  }

  // Tamanho da letra escolhido nas Configuracoes (antes da primeira imagem da tela)
  try{var letra=localStorage.getItem('saga-letra');if(letra&&letra!=='1')html.style.zoom=letra;}catch(e){}

  var tema='dark';
  try{tema=localStorage.getItem('saga-tema')||'dark';}catch(e){}
  // Cor do tema (Azul padrão ou Grafite), escolhida nas Configurações > Preferências (ou fixada pelo administrador)
  var cor='azul';
  try{cor=localStorage.getItem('saga-cor-salva')||localStorage.getItem('saga-cor')||'azul';}catch(e){}
  if(cor&&cor!=='azul')html.setAttribute('data-cor',cor);
  // fundo de cada cor antes da 1ª imagem ([escuro, claro]; a mesma lista do SAGA_FUNDOS no saga_ui.js)
  var FUNDOS={azul:['#172234','#DAE3F1'],grafite:['#1A1A1A','#E7E6E4'],novembro:['#0B1B2C','#D6E8F5'],rosa:['#1E1219','#F4D7E5'],natal:['#0E1D16','#DDEEE4'],vidro:['#0A1B2E','#E1E8F0'],'vidro-ciano':['#04161C','#DDF3F3'],'vidro-ambar':['#120D08','#F6ECDD'],'vidro-aurora':['#0E0A1F','#ECE8FA'],'vidro-livre':['#0A1B2E','#E1E8F0'],
    // 17/11 (Dr. Victor): cores em dobro (versão normal das cores de vidro) e o Ônix (preto e cinza)
    profundo:['#0A1B2E','#D7E5F4'],ciano:['#06181E','#D7EFF4'],ambar:['#140F0A','#F2E6D9'],aurora:['#100C22','#DFDAF1'],onix:['#0E0E0F','#E0E0E0'],
    rubi:['#2B0505','#FACACC'],bordo:['#1F080F','#EAB7C4'],ouro:['#261A00','#FFF0A6'],lima:['#0E1F08','#D2F3A7'],aco:['#06141B','#BFC6C6'],marsala:['#331015','#DFCFBB'],cafe:['#241A13','#FAF3E9'],mel:['#221C05','#FCECC3']};
  html.style.background=(FUNDOS[cor]||FUNDOS.azul)[tema==='light'?1:0];
  html.style.colorScheme=tema==='light'?'light':'dark';
  // 12/11 (T151b): "Vidro com a sua cor" (coringa). A partir da cor escolhida monta as variáveis do claro (--vl-c-*)
  // e do escuro (--vl-e-*) no html, com o destaque e o texto conferidos para ter boa leitura (contraste mínimo).
  (function(){
    function hsl2rgb(h,s,l){h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));l=Math.max(0,Math.min(1,l));var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,r=0,g=0,b=0;
      if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
      return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)];}
    function hex2hsl(hex){var n=parseInt(String(hex||'').replace('#',''),16);if(isNaN(n))n=0x5AA9FF;var r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,h=0,s=0,d=mx-mn;
      if(d){s=d/(1-Math.abs(2*l-1));if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}return [h,s,l];}
    function hx(c){return '#'+c.map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('');}
    function lum(c){var a=c.map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
    function contraste(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
    // sobe (ou desce) a luz da cor até ter o contraste pedido com o fundo
    function ajustar(h,s,l,fundo,min,subir){var c=hsl2rgb(h,s,l);for(var i=0;i<40&&contraste(c,fundo)<min;i++){l+=subir?.02:-.02;c=hsl2rgb(h,s,l);}return c;}
    function rgba(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
    var W=1600,H=900;
    function estrelas(){var s=7,o='';function rnd(){s=(s*9301+49297)%233280;return s/233280;}for(var i=0;i<110;i++){o+="<circle cx='"+Math.round(rnd()*W)+"' cy='"+Math.round(rnd()*H*.5)+"' r='"+(rnd()*1.2+.3).toFixed(1)+"' fill='%23fff' fill-opacity='"+(.25+rnd()*.6).toFixed(2)+"'/>";}return o;}
    function svg(corpo){return "url(\"data:image/svg+xml,"+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 "+W+" "+H+"' preserveAspectRatio='xMidYMax slice'>").replace(/%23/g,'%23')+corpo+encodeURIComponent('</svg>')+"\")";}
    function montes(cores,escuro,alfas){var o=escuro?estrelas():'';cores.forEach(function(cor,k){var base=H*(.52+k*.14),amp=H*(.16-k*.03),seed=k*37+11,d='M0 '+H;
      for(var px=0;px<=W+40;px+=40){d+='L'+px+' '+Math.round(base-Math.abs(Math.sin(px/(180-k*30)+seed))*amp-Math.sin(px/67+seed*2)*amp*.25);}
      o+="<path d='"+d+"L"+W+" "+H+"Z' fill='"+cor.replace('#','%23')+"' fill-opacity='"+alfas[k]+"'/>";});return svg(o);}
    function cidade(cores,escuro,alfas,bri){var o=escuro?estrelas():'';for(var k=0;k<3;k++){var px=-10,base=H*(.62+k*.12),d='',j2='';
      while(px<W){var bw=24+((px*7+k*13)%46),bh=H*(.08+((px*13+k*29)%100)/100*.22)*(1-k*.2);d+='M'+px+' '+Math.round(base-bh)+'h'+bw+'V'+H+'h-'+bw+'Z';
        if(escuro&&k===2){for(var j=0;j<6;j++){if(((px+j*17)%5)===0)j2+='M'+(px+5+(j%3)*7)+' '+Math.round(base-bh+8+Math.floor(j/3)*10)+'h3v4h-3Z';}}px+=bw+2;}
      o+="<path d='"+d+"' fill='"+cores[k].replace('#','%23')+"' fill-opacity='"+alfas[k]+"'/>";if(j2)o+="<path d='"+j2+"' fill='"+bri.replace('#','%23')+"' fill-opacity='.5'/>";}return svg(o);}
    // op (17/11, cores em dobro): matizFundo/satFundo = o fundo com outra cor que o destaque (ex.: Natal = fundo verde e
    // destaque vermelho; Grafite e Ônix = fundo sem cor); satDestaque/luzDestaque = destaque cinza (Ônix); halo = cor do brilho
    // do céu no escuro (Ônix: brilho quente). Sem op = o "A sua cor" de sempre (mesma conta).
    window.sagaVidroLivre=function(hex,op){op=op||{};
      var t=hex2hsl(hex),h=t[0],s=Math.max(.35,Math.min(.9,t[1])),v={},hf=op.matizFundo!=null?op.matizFundo:h,sb=op.satFundo!=null?op.satFundo:s*.6;
      var saB=op.satDestaque!=null?op.satDestaque:Math.max(s,.7),saD=op.satDestaque!=null?op.satDestaque:Math.max(s,.6),stx=op.satFundo!=null?Math.min(.3,sb):.3,smu=op.satFundo!=null?Math.min(.15,sb):.15;
      var lB=op.luzDestaque!=null?op.luzDestaque:.6,lD=op.luzDestaque!=null?Math.min(.95,op.luzDestaque+.12):.72;
      var halo=op.halo?(function(){var n=parseInt(op.halo.replace('#',''),16);return [n>>16&255,n>>8&255,n&255];})():null;
      // escuro
      var f=hsl2rgb(hf,sb,.08),f2=hsl2rgb(hf,sb,.14),vid=hsl2rgb(hf,sb,.18);
      var bri=ajustar(h,saB,lB,f2,3.2,true),dest=ajustar(h,saD,lD,f2,4.5,true),tx=hsl2rgb(hf,stx,.94),mu=ajustar(hf,smu,.7,f2,4.5,true);
      var mo=[hx(hsl2rgb(hf,sb*.8,.10)),hx(hsl2rgb(hf,sb*.8,.13)),hx(hsl2rgb(hf,sb*.8,.16))];
      v.e={fundo:hx(f),navy2:rgba(f,.55),navy3:rgba(f2,.6),panel:rgba(vid,.58),panel2:rgba(vid,.66),solid:hx(f2),borda:'rgba(220,232,245,.16)',borda2:'rgba(220,232,245,.09)',texto:hx(tx),muted:hx(mu),gold:hx(bri),gold2:hx(dest),
        ceu:'linear-gradient(180deg,'+hx(hsl2rgb(hf,sb,.06))+' 0%,'+hx(hsl2rgb(hf,sb,.17))+' 60%,'+hx(hsl2rgb(hf,sb*.8,.32))+' 100%)',halo:'radial-gradient(900px 600px at 78% 18%,'+rgba(halo||bri,.30)+',transparent 70%)',
        montes:montes(mo,true,[1,1,1]),cidade:cidade(mo,true,[1,1,1],hx(bri)),grade:rgba(bri,.22),veu:'linear-gradient(180deg,'+rgba(f,.30)+','+rgba(f,.70)+')',vidro:rgba(vid,.40),vidro2:rgba(vid,.66),brilho:hx(bri)};
      // claro (19/11, Dr. Victor: "o modo claro está muito puxado para o branco; mais puxado para a cor; o que é branco no
      // escuro vai para o preto no claro e vice-versa"): céu, fundo e vidro TINGIDOS da cor (nada de branco puro) e a
      // barra de cima ESCURA na cor (top*), com o texto, o apagado e o destaque conferidos sobre o vidro tingido
      var sc=Math.min(.6,Math.max(.12,sb*1.05));if(op.satFundo!=null&&sb<.05)sc=sb;
      var cf=hsl2rgb(hf,sc,.85),cf2=hsl2rgb(hf,sc,.92),branco=[255,255,255],vtc=hsl2rgb(hf,sc,.955),vtc2=hsl2rgb(hf,sc,.925);
      var cdest=ajustar(h,saD,.32,vtc2,4.8,false),cbri=ajustar(h,saB,.45,vtc,3,false),ctx=ajustar(hf,op.satFundo!=null?Math.min(.4,sb):.4,.14,vtc2,11,false),cmu=ajustar(hf,op.satFundo!=null?Math.min(.18,sb):.18,.34,vtc2,5.5,false);
      while(contraste(cdest,branco)<4.5){var ht=hex2hsl(hx(cdest));cdest=hsl2rgb(ht[0],ht[1],ht[2]-.02);}
      var cmo=[hx(hsl2rgb(hf,sb,.62)),hx(hsl2rgb(hf,sb,.50)),hx(hsl2rgb(hf,sb,.38))];
      var ctop=op.satDestaque===0?hsl2rgb(0,0,.09):hsl2rgb(h,Math.min(.65,Math.max(.25,saD*.7)),.17),ctopTx=hsl2rgb(hf,Math.min(.3,sc),.96);
      var ctopDest=op.satDestaque===0?hsl2rgb(0,0,.9):ajustar(h,saB,.7,ctop,4.6,true),ctopMu=ajustar(hf,Math.min(.25,sc),.78,ctop,4.6,true),borC=hsl2rgb(hf,Math.min(.5,sc+.1),.2);
      v.c={fundo:hx(cf),navy2:rgba(cf,.55),navy3:rgba(cf2,.6),panel:rgba(vtc,.62),panel2:rgba(vtc2,.72),solid:hx(vtc),borda:rgba(borC,.2),borda2:rgba(borC,.12),texto:hx(ctx),muted:hx(cmu),gold:hx(cdest),gold2:hx(cbri),
        ceu:'linear-gradient(180deg,'+hx(hsl2rgb(hf,sc,.72))+' 0%,'+hx(cf)+' 60%,'+hx(cf2)+' 100%)',halo:'radial-gradient(900px 600px at 78% 18%,'+rgba(cbri,.34)+',transparent 70%)',
        montes:montes(cmo,false,[.55,.7,.85]),cidade:cidade(cmo,false,[.55,.7,.85],hx(cbri)),grade:rgba(cbri,.22),veu:'linear-gradient(180deg,'+rgba(cf,.25)+','+rgba(cf,.55)+')',vidro:rgba(vtc,.55),vidro2:rgba(vtc,.78),brilho:hx(cbri),
        top:rgba(ctop,.86),toptx:hx(ctopTx),topmu:hx(ctopMu),topdest:hx(ctopDest)};
      v.amostra=[v.e.fundo,v.e.solid,v.e.gold,v.c.fundo,v.c.gold2,v.c.gold];
      return v;};
    // 17/11 (Dr. Victor, cores em dobro): a versão VIDRO das cores normais e o Vidro Ônix (preto e cinza) saem da mesma
    // conta do "A sua cor", com a semente fixa de cada uma (variáveis --vl-*, regras do vidro-livre no saga_tema.css)
    window.SAGA_VIDRO_SEMENTES={
      'vidro-azul':{cor:'#4B8AF5',satFundo:.45},
      'vidro-grafite':{cor:'#D4B98A',satFundo:.0,satDestaque:.45},
      'vidro-novembro':{cor:'#3A9DE6',satFundo:.55},
      'vidro-rosa':{cor:'#E85A93',satFundo:.35},
      'vidro-natal':{cor:'#E0454E',matizFundo:150,satFundo:.40},
      'vidro-onix':{cor:'#E8E8E8',satFundo:.0,satDestaque:0,luzDestaque:.82,halo:'#B9874F'},
      // 19/11: paletas do Dr. Victor em vidro
      'vidro-rubi':{cor:'#C71F24'},'vidro-bordo':{cor:'#991D3C'},'vidro-ouro':{cor:'#D4A200'},'vidro-lima':{cor:'#76C52C'},'vidro-aco':{cor:'#4A5C6A',satFundo:.35},'vidro-marsala':{cor:'#6D2932',matizFundo:33,satFundo:.3},'vidro-cafe':{cor:'#B08968',satFundo:.35},'vidro-mel':{cor:'#CC961F'}};
    // 19/11 (modo claro com a cor): as 4 cores de vidro antigas usam a conta só no CLARO (o escuro delas fica no saga_tema.css)
    window.SAGA_VIDRO_CLARO={vidro:{cor:'#3C86D6',satFundo:.5},'vidro-ciano':{cor:'#14A8B0',satFundo:.5},'vidro-ambar':{cor:'#D27A1E',satFundo:.45},'vidro-aurora':{cor:'#7C5CE6',satFundo:.45}};
    // põe as variáveis no html (vale para o claro e o escuro; o tema troca sem refazer a conta)
    window.sagaVidroAplicarLivre=function(hex,op){var html=document.documentElement,v=window.sagaVidroLivre(hex,op);
      ['e','c'].forEach(function(p){Object.keys(v[p]).forEach(function(k){html.style.setProperty('--vl-'+p+'-'+k,v[p][k]);});});
      return v;};
  })();
  // 12/11 (T151): Vidro tecnológico: fundo e "mais fosco" escolhidos pela pessoa, antes da 1ª imagem
  try{var vf=localStorage.getItem('saga-vidro-fundo')||'montanhas',vi=vf==='imagem'?localStorage.getItem('saga-vidro-imagem'):null;
    if(vf==='imagem'&&!vi)vf='montanhas';html.setAttribute('data-vidro-fundo',vf);
    if(localStorage.getItem('saga-vidro-fosco')==='1')html.classList.add('vidro-fosco');
    if(vi)html.style.setProperty('--vidro-img','url("'+vi+'")');}catch(e){}
  // coringa: monta as cores da pessoa antes da 1ª imagem (a cor fica em saga-vidro-cor)
  try{var vlc=localStorage.getItem('saga-vidro-cor')||'#5AA9FF',sem=window.SAGA_VIDRO_SEMENTES[cor];
    if(cor==='vidro-livre'||sem){var vl=sem?window.sagaVidroAplicarLivre(sem.cor,sem):window.sagaVidroAplicarLivre(vlc);html.style.background=tema==='light'?vl.c.fundo:vl.e.fundo;}
    else if(window.SAGA_VIDRO_CLARO[cor]){var vc=window.SAGA_VIDRO_CLARO[cor],vl2=window.sagaVidroAplicarLivre(vc.cor,vc);if(tema==='light')html.style.background=vl2.c.fundo;}}catch(e){}
  try{html.style.setProperty('--vd-fundo-html',html.style.background);}catch(e){}
  // 17/11 (Dr. Victor): FUNDO ANIMADO do Vidro tecnológico (brasas de neon, rede de dados, circuito), na cor do tema.
  // Um canvas fixo atrás de tudo (#sagaVidroAnim), só com uma cor de vidro e fora das janelas embutidas; no máximo 30
  // quadros por segundo, para quando a aba está escondida e fica PARADO com "Efeitos de movimento" desligado.
  // Escolhas deste navegador: saga-vidro-efeito (nenhum|brasas|rede|circuito), saga-vidro-intensidade (1..3) e
  // saga-vidro-velocidade (1..3). window.sagaVidroAnimar() relê tudo (chamado pelo sagaVidro.aplicar do saga_ui.js).
  (function(){
    var cv=null,ctx=null,raf=0,ult=0,itens=[],cfg=null,W=0,H=0,dpr=1,cor=[90,169,255],claro=false,t0=0,pulsos=[];
    var INT=[0,.55,1,1.6],VEL=[0,.55,1,1.7];
    function ler(){var o={efeito:'nenhum',int:2,vel:2};try{o.efeito=localStorage.getItem('saga-vidro-efeito')||'nenhum';o.int=+localStorage.getItem('saga-vidro-intensidade')||2;o.vel=+localStorage.getItem('saga-vidro-velocidade')||2;}catch(e){}
      o.int=Math.max(1,Math.min(3,o.int));o.vel=Math.max(1,Math.min(3,o.vel));return o;}
    function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
    function ativo(){var h=document.documentElement;return (h.getAttribute('data-cor')||'').indexOf('vidro')===0&&!h.classList.contains('saga-embed')&&cfg&&cfg.efeito!=='nenhum';}
    function lerCor(){try{var b=document.body,v=getComputedStyle(b).getPropertyValue('--vd-brilho').trim()||getComputedStyle(b).getPropertyValue('--gold').trim();
      claro=b.getAttribute('data-theme')==='light';var m=/^#?([0-9a-f]{6})$/i.exec(v);if(m){var n=parseInt(m[1],16);cor=[n>>16&255,n>>8&255,n&255];}
      else{m=/rgba?\(([^)]+)\)/.exec(v);if(m){var p=m[1].split(',');cor=[+p[0],+p[1],+p[2]];}}}catch(e){}}
    function rgba(a){return 'rgba('+cor[0]+','+cor[1]+','+cor[2]+','+a.toFixed(3)+')';}
    function medir(){dpr=Math.min(1.5,window.devicePixelRatio||1);W=window.innerWidth;H=window.innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
    function rnd(a,b){return a+Math.random()*(b-a);}
    function montar(){itens=[];pulsos=[];var k=INT[cfg.int],area=W*H/(1280*720);
      if(cfg.efeito==='brasas'){var n=Math.round(55*k*Math.min(1.6,Math.max(.5,area)));for(var i=0;i<n;i++)itens.push(brasa(true));}
      else if(cfg.efeito==='rede'){var n2=Math.round(42*k*Math.min(1.5,Math.max(.5,area)));for(var j=0;j<n2;j++)itens.push({x:rnd(0,W),y:rnd(0,H),vx:rnd(-.25,.25),vy:rnd(-.25,.25),r:rnd(1,2.2)});}
      else if(cfg.efeito==='circuito'){var passo=72;for(var y=passo/2;y<H;y+=passo)itens.push({h:true,p:y});for(var x=passo/2;x<W;x+=passo*1.5)itens.push({h:false,p:x});var np=Math.round(10*k);for(var q=0;q<np;q++)pulsos.push(pulso());}}
    function brasa(espalhar){return {x:rnd(0,W),y:espalhar?rnd(0,H):H+rnd(0,40),r:rnd(.8,2.6),v:rnd(.25,.9),o:rnd(0,6.28),a:rnd(.35,.95),dx:rnd(-.15,.15)};}
    function pulso(){var l=itens[Math.floor(Math.random()*itens.length)]||{h:true,p:H/2};return {l:l,s:rnd(-200,0),v:rnd(1.4,3.2)*(Math.random()<.5?-1:1),c:rnd(60,160),raio:Math.random()<.12};}
    function quadro(dt){var k=INT[cfg.int],ve=VEL[cfg.vel]*dt/16.67,alfa=claro?.75:1;ctx.clearRect(0,0,W,H);
      if(cfg.efeito==='brasas'){ctx.globalCompositeOperation=claro?'source-over':'lighter';
        for(var i=0;i<itens.length;i++){var p=itens[i];p.y-=p.v*ve;p.o+=.02*ve;p.x+=(Math.sin(p.o)*.35+p.dx)*ve;if(p.y<-20){itens[i]=brasa(false);continue;}
          var a=p.a*alfa*(0.55+0.45*Math.sin(p.o*1.7))*Math.min(1,(H-p.y+40)/160)*Math.min(1,(p.y+20)/120),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5);
          g.addColorStop(0,rgba(a));g.addColorStop(.3,rgba(a*.45));g.addColorStop(1,rgba(0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r*5,0,6.2832);ctx.fill();}
        ctx.globalCompositeOperation='source-over';}
      else if(cfg.efeito==='rede'){var lim=140,lim2=lim*lim;ctx.lineWidth=1;
        for(var a1=0;a1<itens.length;a1++){var n=itens[a1];n.x+=n.vx*ve;n.y+=n.vy*ve;if(n.x<-20)n.x=W+20;if(n.x>W+20)n.x=-20;if(n.y<-20)n.y=H+20;if(n.y>H+20)n.y=-20;}
        for(var b1=0;b1<itens.length;b1++){var A=itens[b1];for(var c1=b1+1;c1<itens.length;c1++){var B=itens[c1],dx=A.x-B.x,dy=A.y-B.y,d=dx*dx+dy*dy;if(d<lim2){ctx.strokeStyle=rgba((1-Math.sqrt(d)/lim)*.35*alfa);ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();}}}
        for(var e1=0;e1<itens.length;e1++){var N=itens[e1];ctx.fillStyle=rgba(.75*alfa);ctx.beginPath();ctx.arc(N.x,N.y,N.r,0,6.2832);ctx.fill();}}
      else if(cfg.efeito==='circuito'){ctx.lineWidth=1;ctx.strokeStyle=rgba(.07*alfa*k);ctx.beginPath();
        for(var i2=0;i2<itens.length;i2++){var L=itens[i2];if(L.h){ctx.moveTo(0,L.p);ctx.lineTo(W,L.p);}else{ctx.moveTo(L.p,0);ctx.lineTo(L.p,H);}}ctx.stroke();
        ctx.globalCompositeOperation=claro?'source-over':'lighter';
        for(var j2=0;j2<pulsos.length;j2++){var P=pulsos[j2],tam=P.l.h?W:H;P.s+=P.v*ve*2;var pos=P.v>0?P.s:tam-P.s;
          if(P.s>tam+P.c){pulsos[j2]=pulso();continue;}
          var x1,y1,x2,y2;if(P.l.h){x1=pos;x2=pos-(P.v>0?P.c:-P.c);y1=y2=P.l.p;}else{y1=pos;y2=pos-(P.v>0?P.c:-P.c);x1=x2=P.l.p;}
          var gr=ctx.createLinearGradient(x2,y2,x1,y1);gr.addColorStop(0,rgba(0));gr.addColorStop(1,rgba((P.raio?1:.8)*alfa));
          ctx.strokeStyle=gr;ctx.lineWidth=P.raio?2.2:1.4;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x1,y1);ctx.stroke();
          ctx.fillStyle=rgba(.9*alfa);ctx.beginPath();ctx.arc(x1,y1,P.raio?2.6:1.8,0,6.2832);ctx.fill();}
        ctx.globalCompositeOperation='source-over';ctx.lineWidth=1;}}
    function laco(t){raf=0;if(!cv||document.hidden||!ativo())return;var dt=t-ult;
      if(dt>=32){quadro(Math.min(dt,100));ult=t;}raf=requestAnimationFrame(laco);}
    function parar(){if(raf)cancelAnimationFrame(raf);raf=0;}
    function seguir(){parar();if(!ativo()||document.hidden)return;if(parado()){quadro(16.67);return;}ult=performance.now();raf=requestAnimationFrame(laco);}
    window.sagaVidroAnimar=function(){cfg=ler();var lig=ativo();
      if(!lig){if(cv){parar();var c0=cv;c0.style.opacity='0';cv=null;ctx=null;setTimeout(function(){c0.remove();},parado()?0:420);}return;}
      if(!document.body)return;
      if(!cv){cv=document.createElement('canvas');cv.id='sagaVidroAnim';cv.setAttribute('aria-hidden','true');
        cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;opacity:0;transition:opacity '+(parado()?'0s':'.42s cubic-bezier(.22,.78,.25,1)');
        document.body.insertBefore(cv,document.body.firstChild);ctx=cv.getContext('2d');requestAnimationFrame(function(){if(cv)cv.style.opacity='1';});}
      var chave=cfg.efeito+'|'+cfg.int;lerCor();
      if(cv._chave!==chave||!W){cv._chave=chave;medir();montar();}
      quadro(16.67);seguir();};
    // medição de custo (teste): quanto tempo leva desenhar N quadros
    window.sagaVidroAnimar.medir=function(n){if(!ctx)return null;var t=performance.now();for(var i=0;i<(n||60);i++)quadro(33);return (performance.now()-t)/(n||60);};
    var tm=0;window.addEventListener('resize',function(){if(!cv)return;clearTimeout(tm);tm=setTimeout(function(){medir();montar();quadro(16.67);},150);});
    document.addEventListener('visibilitychange',function(){if(cv)seguir();});
    document.addEventListener('saga-movimento-mudou',function(){if(cv){cv.style.transition=parado()?'none':'opacity .42s cubic-bezier(.22,.78,.25,1)';seguir();}});
    // cor e claro/escuro mudam sem recarregar: relê a cor
    function observar(){try{var antes='';new MutationObserver(function(){var h=document.documentElement,k=(h.getAttribute('data-cor')||'')+(h.classList.contains('saga-embed')?'e':'');if(k===antes)return;antes=k;window.sagaVidroAnimar();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-cor','class']});
      new MutationObserver(function(){if(cv){lerCor();if(parado())quadro(16.67);}}).observe(document.body,{attributes:true,attributeFilter:['data-theme']});}catch(e){}}
    window.addEventListener('storage',function(e){if(e.key&&/^saga-(vidro-|movimento)/.test(e.key))window.sagaVidroAnimar();});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){window.sagaVidroAnimar();observar();});else{window.sagaVidroAnimar();observar();}
  })();

  // 19/11 (Dr. Victor: "vi o sistema por dentro antes do login"): login guardado no navegador NÃO basta para mostrar
  // a tela. Só aparece na hora (sem esperar o servidor) quando a sessão é CONFIÁVEL: chave de acesso ainda dentro da
  // validade, conferida hoje pelo saga_ui.js (saga-sessao-conferida, até o corte das 20h) e uso recente. Senão (ex.:
  // computador ligado de manhã com o login de ontem), a tela fica COBERTA (só o fundo do tema) até o saga_ui.js
  // conferir a sessão no servidor (evento 'saga-sessao-ok'); sem sessão válida vai direto para o login.
  var MARCA_OK='saga-sessao-conferida';
  function lerToken(){
    try{var b=localStorage.getItem(CHAVE),t=b?JSON.parse(b):null;if(t&&t.currentSession)t=t.currentSession;return t&&(t.refresh_token||t.access_token)?t:null;}catch(e){return null;}
  }
  function sessaoConfiavel(){
    var t=lerToken();if(!t)return false;
    try{
      if(!((t.expires_at||0)*1000>Date.now()+30000))return false;
      var m=JSON.parse(localStorage.getItem(MARCA_OK)||'null'),u=t.user&&t.user.id;
      if(!m||!u||m.u!==u||!(m.ate>Date.now()))return false;
      // parado há mais de 25 min: confere antes (as regras de inatividade podem ter vencido o login)
      var ult=parseInt(localStorage.getItem('saga-ultima-atividade')||'0',10);
      if(ult&&Date.now()-ult>25*60000)return false;
      return true;
    }catch(e){return false;}
  }
  var temSessao=!!lerToken();
  var sessaoOk=temSessao&&sessaoConfiavel();
  if(!temSessao){try{localStorage.removeItem(MARCA_OK);}catch(e){}}
  window.sagaSessaoConfiavel=sessaoConfiavel;

  var estilo=document.createElement('style');
  estilo.id='sagaGuardEstilo';
  estilo.textContent=
    // Ate o login ser confirmado e os menus montados, nada aparece
    'html.saga-entrando body{opacity:0 !important;}'+
    // Espaco da barra de rolagem sempre reservado: o menu superior nao pula entre telas
    'html{scrollbar-gutter:stable;}'+
    // Menus superior e lateral ficam parados; so o conteudo da tela faz a transicao.
    // O conteudo so aparece quando a tela terminou de buscar os dados (nada pela metade).
    'html.saga-carregando .saga-conteudo{opacity:0 !important;}'+
    // Fio fino de carregamento sob o menu superior, so se a espera passar de um instante
    '#sagaCarregando{position:fixed;left:0;right:0;height:2px;z-index:1400;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .2s ease;}'+
    '#sagaCarregando.ativo{opacity:1;}'+
    '#sagaCarregando::after{content:"";position:absolute;top:0;bottom:0;width:38%;left:-38%;border-radius:2px;background:linear-gradient(90deg,transparent,var(--saga-fio,var(--gold,#c9a96e)),transparent);box-shadow:0 0 8px var(--saga-fio-brilho,transparent);animation:sagaFio 1s ease-in-out infinite;}'+
    // Azul escuro: o destaque azul some no fundo azul; o fio fica claro, com um leve brilho
    'html:not([data-cor="grafite"]) body[data-theme="dark"] #sagaCarregando{--saga-fio:#dce8ff;--saga-fio-brilho:rgba(150,190,255,.55);}'+
    '@keyframes sagaFio{to{left:100%;}}'+
    // Todas as telas com o menu padrao: mesmo fundo (sem quadriculado nem brilhos proprios)
    // e mesma barra de rolagem, para nada mudar de lugar ou de cor na troca de tela
    'html.saga-padrao body{background:linear-gradient(160deg,var(--navy-1),var(--navy-2) 50%,var(--navy-3)) fixed !important;}'+
    'html.saga-padrao body::before,html.saga-padrao body::after{content:none !important;display:none !important;}'+
    'html.saga-padrao ::-webkit-scrollbar{width:8px;height:8px;}'+
    'html.saga-padrao ::-webkit-scrollbar-track{background:transparent;}'+
    'html.saga-padrao ::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--gold) 32%,transparent);border-radius:8px;}'+
    // Troca de tela sem piscar: o navegador mantem a tela anterior ate a nova ter os menus prontos
    '@view-transition{navigation:auto;}'+
    '::view-transition-group(root){animation-duration:.12s;}'+
    // Menus: a imagem da tela anterior fica parada ate a tela nova ter desenhado os dela (nada pisca)
    '@media(min-width:761px){#sidebarSaga{view-transition-name:saga-lateral;}#topbarSaga{view-transition-name:saga-topo;}}'+
    '@keyframes sagaMenuVelho{0%,99%{opacity:1;}100%{opacity:0;}}@keyframes sagaMenuNovo{0%,99%{opacity:0;}100%{opacity:1;}}'+
    '::view-transition-group(saga-topo){animation:none;}'+
    // Menu lateral (08/11): se a largura muda entre as telas (aberto pelo mouse -> recolhido), a imagem antiga
    // não é espremida (ficava "pequenininha"): fica no tamanho real, cortada, e a largura desliza suave
    '::view-transition-group(saga-lateral){overflow:clip;animation-duration:.3s;animation-timing-function:cubic-bezier(.22,.78,.25,1);}'+
    '::view-transition-image-pair(saga-lateral){overflow:clip;}'+
    '::view-transition-old(saga-lateral),::view-transition-new(saga-lateral){inline-size:auto;block-size:100%;object-fit:none;object-position:left top;}'+
    'html.saga-sem-movimento::view-transition-group(saga-lateral){animation:none;}'+
    '::view-transition-old(saga-lateral),::view-transition-old(saga-topo){animation:sagaMenuVelho .35s linear both;mix-blend-mode:normal;}'+
    '::view-transition-new(saga-lateral),::view-transition-new(saga-topo){animation:sagaMenuNovo .35s linear both;mix-blend-mode:normal;}'+
    '#sidebarSaga,#topbarSaga{font-family:Montserrat,Arial,sans-serif;}'+
    // Enquanto a tela monta, os menus nao animam nada (evita a tremida do menu lateral)
    'html.saga-fixando #sidebarSaga,html.saga-fixando #sidebarSaga *,html.saga-fixando #topbarSaga,html.saga-fixando #topbarSaga *{transition:none !important;animation:none !important;}'+
    (aoLado?'html.saga-ao-lado #topbarSaga,html.saga-ao-lado #sidebarSaga,html.saga-ao-lado .page-toolbar,html.saga-ao-lado #prototypeNav,html.saga-ao-lado #overlay{display:none !important;}'+
      'html.saga-ao-lado .app{display:block !important;}html.saga-ao-lado .conteudo{padding:12px 14px 40px !important;}':'');
  (document.head||html).appendChild(estilo);
  html.classList.add('saga-entrando','saga-carregando','saga-fixando');

  if(!temSessao){
    location.replace(LOGIN);
    return;
  }

  // Aviso discreto enquanto confere (só aparece se demorar): fora do body (que está escondido), sem nada do sistema
  var portao=null,portaoTimer=null,portaoInicio=Date.now(),portaoErro='';
  function textoPortao(){
    var seg=(Date.now()-portaoInicio)/1000;
    if(navigator.onLine===false)return ['Este computador está sem internet.','Assim que a internet voltar, o SAGA confere o seu login e abre sozinho.',true];
    if(portaoErro)return ['Não consegui falar com o servidor do SAGA.','Motivo: '+portaoErro+'. Tentando de novo a cada 5 segundos.',true];
    if(seg>6)return ['Ainda conferindo o seu login…','A internet pode estar lenta. O SAGA continua tentando.',true];
    return ['Conferindo o seu login…','',false];
  }
  function pintarPortao(){
    if(!portao)return;var t=textoPortao();
    portao.querySelector('b').textContent=t[0];portao.querySelector('span').textContent=t[1];
    portao.querySelector('a').style.display=t[2]?'':'none';
  }
  function abrirPortao(){
    if(sessaoOk||portao)return;
    var escuro=tema!=='light';
    portao=document.createElement('div');portao.id='sagaPortao';portao.setAttribute('role','status');portao.setAttribute('aria-live','polite');
    portao.style.cssText='position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:24px 16px;font-family:Montserrat,Arial,sans-serif;text-align:center;color:'+(escuro?'#dfe6f2':'#1c2a3f')+';opacity:0;transition:opacity .32s cubic-bezier(.22,.78,.25,1)';
    portao.innerHTML='<div style="max-width:360px;display:flex;flex-direction:column;align-items:center;gap:10px">'+
      '<div style="width:120px;height:2px;border-radius:2px;overflow:hidden;background:'+(escuro?'rgba(255,255,255,.12)':'rgba(0,0,0,.08)')+'"><i style="display:block;width:40%;height:100%;background:currentColor;opacity:.6;animation:sagaFio 1.1s ease-in-out infinite;position:relative;left:-40%"></i></div>'+
      '<b style="font-weight:500;font-size:14px"></b><span style="font-size:12.5px;opacity:.75;line-height:1.5"></span>'+
      '<a href="'+LOGIN+'" style="font-size:12.5px;color:inherit;opacity:.85">Ir para a tela de entrada</a></div>';
    (document.body?document.documentElement:document.documentElement).appendChild(portao);
    pintarPortao();
    requestAnimationFrame(function(){if(portao)portao.style.opacity='1';});
    portaoTimer=setInterval(pintarPortao,1000);
  }
  function fecharPortao(){
    clearTimeout(portaoEspera);clearInterval(portaoTimer);
    if(!portao)return;var p=portao;portao=null;p.style.opacity='0';setTimeout(function(){p.remove();},reduzAgora()?0:320);
  }
  function reduzAgora(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  var portaoEspera=sessaoOk?0:setTimeout(abrirPortao,700);
  window.addEventListener('online',pintarPortao);window.addEventListener('offline',pintarPortao);
  document.addEventListener('saga-sessao-rede',function(ev){portaoErro=(ev.detail&&ev.detail.erro)||'sem resposta do servidor';abrirPortao();pintarPortao();});

  // Menus aparecem so com as letras ja carregadas (sem trocar de fonte na frente do usuario)
  var molduraPedida=false,molduraEsperando=false,mostrarEsperando=false;
  function mostrarMoldura(){
    // 19/11: sessão ainda não conferida: nada aparece (nem o menu); fica anotado para depois
    if(!sessaoOk){molduraEsperando=true;return;}
    if(molduraPedida)return;molduraPedida=true;
    // Os menus aparecem na hora, junto com a primeira imagem da tela (esperar as letras deixava tudo apagado por instantes)
    html.classList.remove('saga-entrando');
  }
  // saga_ui.js conferiu a sessão no servidor: libera o que estava esperando, com o movimento de sempre
  document.addEventListener('saga-sessao-ok',function(){
    if(sessaoOk)return;sessaoOk=true;portaoErro='';fecharPortao();
    if(molduraEsperando||mostrarEsperando)mostrarMoldura();
    if(mostrarEsperando&&typeof mostrar==='function')mostrar();
  });
  // Telas antigas sem o menu padrao (data-simples): sem sessão confiável, passam pelo login (ele devolve para o Ponto)
  if(document.currentScript&&document.currentScript.dataset.simples){
    if(!sessaoOk){location.replace(LOGIN);return;}
    html.classList.remove('saga-carregando','saga-fixando');
    document.addEventListener('DOMContentLoaded',mostrarMoldura);
    return;
  }
  var reduz=!!(window.matchMedia&&(window.sagaMq?sagaMq():{matches:false,addEventListener:function(){}}).matches);
  // A chave "Efeitos de movimento" vale na hora: as Configurações avisam a troca e as animações por script obedecem
  document.addEventListener('saga-movimento-mudou',function(){try{reduz=window.sagaMq().matches;}catch(e){}});

  // Conta as buscas ao banco em andamento: a tela so aparece quando todas terminam
  var pendentes=0,ultimaBusca=0;
  if(window.fetch){
    var fetchOriginal=window.fetch;
    // 09/11: ao voltar de página (botão do mouse ou seta do navegador) o Chrome devolvia respostas ANTIGAS do banco
    // guardadas na memória dele (ex.: o perfil com a cor de antes da troca: o tema salvo como Grafite voltava para o Azul).
    // Toda busca ao banco (Supabase) vai sempre ao servidor e a resposta não fica guardada no computador.
    var BANCO=/^https:\/\/[a-z0-9-]+\.supabase\.co\//i;
    window.fetch=function(entrada,opcoes){
      pendentes++;ultimaBusca=Date.now();
      function fim(){pendentes=Math.max(0,pendentes-1);ultimaBusca=Date.now();}
      var args=arguments;
      try{
        var url=typeof entrada==='string'?entrada:(entrada&&entrada.url)||String(entrada||'');
        if(BANCO.test(url)&&!(opcoes&&opcoes.cache))args=[entrada,Object.assign({},opcoes||{},{cache:'no-store'})];
      }catch(e){}
      try{return fetchOriginal.apply(this,args).then(function(r){fim();return r;},function(e){fim();throw e;});}
      catch(e){fim();throw e;}
    };
  }

  // Blocos que entram em cascata: os filhos visiveis do conteudo (um nivel a mais nos blocos grandes)
  function visivel(el){
    if(/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName))return false;
    var cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed')return false;
    var r=el.getBoundingClientRect();return r.width>0&&r.height>0;
  }
  function filhosVisiveis(el){return Array.prototype.filter.call(el.children,visivel);}
  // Grupo de cartoes lado a lado (grade ou linha): cada cartao entra na sua vez
  function ehGrupoDeCartoes(el){
    var cs=getComputedStyle(el),f=filhosVisiveis(el);
    if(f.length<2||f.length>12)return null;
    if(!/grid|flex/.test(cs.display))return null;
    if(/flex/.test(cs.display)&&/column/.test(cs.flexDirection))return null;
    // so cartoes de verdade (nao botoes pequenos de uma barra)
    var grandes=f.filter(function(x){var r=x.getBoundingClientRect();return r.height>=56&&r.width>=110;});
    return grandes.length>=2?f:null;
  }
  function blocosCascata(){
    var itens=[],altura=window.innerHeight||800;
    function juntar(el,nivel){
      var r=el.getBoundingClientRect();
      if(r.top>altura)return; // abaixo da dobra: aparece junto com o ultimo
      var cartoes=ehGrupoDeCartoes(el);
      if(cartoes){cartoes.forEach(function(x){itens.push(x);});return;}
      var filhos=nivel<2&&r.height>altura*0.45?filhosVisiveis(el):[];
      if(filhos.length>1){filhos.forEach(function(x){juntar(x,nivel+1);});return;}
      itens.push(el);
    }
    Array.prototype.forEach.call(document.querySelectorAll('.saga-conteudo'),function(c){
      var nivel=filhosVisiveis(c);
      while(nivel.length===1&&nivel[0].children.length)nivel=filhosVisiveis(nivel[0]);
      if(!nivel.length)nivel=[c];
      nivel.forEach(function(el){juntar(el,0);});
    });
    return itens.slice(0,24);
  }
  // Mola: passa um pouquinho do ponto e assenta (como no iPhone)
  var MOLA='cubic-bezier(.34,1.45,.64,1)';
  function cascata(itens,entrada){
    var max=entrada?9:6,passo=entrada?28:14,dur=entrada?360:110,total=0;
    itens.forEach(function(el,i){
      if(!el.animate)return;
      var atraso=Math.min(i,max)*passo;total=Math.max(total,atraso+dur);
      el.animate(entrada
        ?[{opacity:0,transform:'translateY(10px) scale(.93)'},{opacity:1,offset:.6},{opacity:1,transform:'none'}]
        :[{opacity:1,transform:'none'},{opacity:0,transform:'scale(.97)'}],
        {duration:dur,delay:atraso,easing:entrada?MOLA:'ease-in',fill:entrada?'backwards':'forwards'});
      if(entrada)animarDetalhes(el,atraso+80);
    });
    return total;
  }
  // Numeros sobem contando e barras dos graficos crescem, cada um no tempo do seu cartao
  var RE_NUM=/^(\D{0,4}?)(-?)(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?(\s?(?:%|h|min|dias?)?)$/;
  function animarDetalhes(raiz,atraso){
    var andou=0;
    raiz.querySelectorAll('*').forEach(function(el){
      if(andou>40)return;
      // numero grande sozinho no elemento
      if(!el.children.length){
        var t=(el.textContent||'').trim(),m=RE_NUM.exec(t);
        if(m&&parseFloat(getComputedStyle(el).fontSize)>=19){contar(el,m,atraso);andou++;}
        return;
      }
    });
    raiz.querySelectorAll('[style*="width"],[style*="height"],circle[stroke-dasharray],circle[style*="dash"]').forEach(function(el){
      if(andou>60||!el.animate)return;andou++;
      if(el.tagName.toLowerCase()==='circle'){
        var tot=parseFloat(getComputedStyle(el).strokeDasharray)||0,fim=getComputedStyle(el).strokeDashoffset;
        if(tot>0)el.animate([{strokeDashoffset:String(tot)},{strokeDashoffset:fim}],{duration:900,delay:atraso,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
        return;
      }
      var st=el.getAttribute('style')||'',r=el.getBoundingClientRect();
      if(/(^|;)\s*width\s*:\s*[\d.]+%/.test(st)&&r.height>0&&r.height<=18&&r.width>0)
        el.animate([{transform:'scaleX(0)',transformOrigin:'left center'},{transform:'scaleX(1)',transformOrigin:'left center'}],{duration:800,delay:atraso,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      else if(/(^|;)\s*height\s*:\s*[\d.]+%/.test(st)&&r.width>0&&r.width<=48&&r.height>0)
        el.animate([{transform:'scaleY(0)',transformOrigin:'center bottom'},{transform:'scaleY(1)',transformOrigin:'center bottom'}],{duration:800,delay:atraso,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
    });
  }
  function contar(el,m,atraso){
    var pre=m[1],neg=m[2],inteiro=m[3].replace(/\./g,''),dec=m[4]?m[4].slice(1):'',suf=m[5]||'';
    var alvo=parseFloat(inteiro+(dec?'.'+dec:''));
    if(!(alvo>0))return;
    var casas=dec.length,milhar=m[3].indexOf('.')>=0||alvo>=1000,dur=Math.min(1100,600+Math.log10(alvo+1)*120);
    function fmt(v){
      var p=v.toFixed(casas).split('.'),i=p[0];
      if(milhar)i=i.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
      return pre+neg+i+(casas?','+p[1]:'')+suf;
    }
    var original=el.textContent,ultimo=fmt(0),ini=null;
    el.textContent=ultimo;
    setTimeout(function(){
      function passo(ts){
        if(el.textContent!==ultimo)return; // a tela mudou o valor: para de contar
        if(ini===null)ini=ts;
        var k=Math.min(1,(ts-ini)/dur),e=1-Math.pow(1-k,3);
        ultimo=k<1?fmt(alvo*e):original;el.textContent=ultimo;
        if(k<1)requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    },atraso);
  }

  // Abas e botoes de escolha: o destaque desliza do botao antigo para o novo (como no iPhone)
  var ATIVO=/(^|\s)(active|ativo|ativa|selected|selecionado|selecionada)(\s|$)/;
  function botaoDeGrupo(el){
    if(!el||el.nodeType!==1||!el.parentElement)return false;
    if(el.closest('#sidebarSaga,#topbarSaga,.modal-overlay:not(.open),.leaflet-container'))return false;
    var r=el.getBoundingClientRect();
    return r.height>0&&r.height<=60&&r.width<=360&&(el.tagName==='BUTTON'||el.getAttribute('role')==='tab'||getComputedStyle(el).cursor==='pointer');
  }
  var ultimoAtivo=new WeakMap(),ultimaTrocaGrupo=0;
  // (08/11) Grupos redesenhados do zero (ex.: barra da planilha, que refaz o HTML a cada clique) perdiam a memória e
  // o destaque trocava seco. Agora o grupo também é lembrado por um "nome" (rótulo + classe + id do bloco onde está).
  var ultimoPorNome=new Map();
  function nomeGrupo(grupo){var dono=grupo.parentElement&&grupo.parentElement.closest('[id]');return (grupo.getAttribute('aria-label')||'')+'|'+(typeof grupo.className==='string'?grupo.className:'')+'|'+(dono?dono.id:'')+'|'+Array.prototype.filter.call(grupo.children,function(x){return x.getAttribute('aria-hidden')!=='true';}).length;}
  function lembrar(grupo,ativo){
    var g=grupo.getBoundingClientRect(),r=ativo.getBoundingClientRect();
    var m={el:ativo,txt:ativo.textContent,grupo:grupo,x:r.left-g.left+grupo.scrollLeft,y:r.top-g.top+grupo.scrollTop,w:r.width,h:r.height};
    ultimoAtivo.set(grupo,m);ultimoPorNome.set(nomeGrupo(grupo),m);
  }
  function deslizar(grupo,de,para){
    if(reduz||!grupo.animate)return;
    // Le a cor final do botao (sem a transicao propria dele, que ainda estaria no meio do caminho)
    var transAntes=[para.style.getPropertyValue('transition'),para.style.getPropertyPriority('transition')];
    para.style.setProperty('transition','none','important');
    var cs=getComputedStyle(para),fundo=cs.backgroundImage!=='none'?cs.backgroundImage:'',cor=cs.backgroundColor;
    var raio=cs.borderRadius,sombra=cs.boxShadow;
    if(!fundo&&(!cor||/rgba\(0, 0, 0, 0\)|transparent/.test(cor))){ // ativo sem fundo: nada a deslizar
      if(transAntes[0])para.style.setProperty('transition',transAntes[0],transAntes[1]);else para.style.removeProperty('transition');
      return;
    }
    var g=grupo.getBoundingClientRect(),r=para.getBoundingClientRect();
    var fim={x:r.left-g.left+grupo.scrollLeft,y:r.top-g.top+grupo.scrollTop,w:r.width,h:r.height};
    if((Math.abs(fim.x-de.x)<2&&Math.abs(fim.y-de.y)<2)||Math.abs(fim.y-de.y)>de.h*1.5){ // mesmo lugar ou outra linha: sem deslizar
      if(transAntes[0])para.style.setProperty('transition',transAntes[0],transAntes[1]);else para.style.removeProperty('transition');
      return;
    }
    if(getComputedStyle(grupo).position==='static')grupo.style.position='relative';
    grupo.style.isolation='isolate';
    var fantasma=document.createElement('div');
    fantasma.setAttribute('aria-hidden','true');
    fantasma.style.cssText='position:absolute;z-index:-1;pointer-events:none;margin:0;left:0;top:0;'+
      'border-radius:'+raio+';box-shadow:'+sombra+';background-color:'+cor+';'+(fundo?'background-image:'+fundo+';':'');
    grupo.appendChild(fantasma);
    // (08/11) os outros botões do grupo apagam o destaque na hora: a transição deles deixava, por um instante, dois destaques na tela
    var irmaos=Array.prototype.filter.call(grupo.children,function(x){return x!==para&&x!==fantasma&&x.style;});
    var transIrmaos=irmaos.map(function(x){var t=[x.style.getPropertyValue('transition'),x.style.getPropertyPriority('transition')];x.style.setProperty('transition','none','important');return t;});
    var props=['background-color','background-image','box-shadow','border-color','transition'],antes={};
    props.forEach(function(p){antes[p]=[para.style.getPropertyValue(p),para.style.getPropertyPriority(p)];});
    antes.transition=transAntes;
    para.style.setProperty('background-color','transparent','important');
    para.style.setProperty('background-image','none','important');
    para.style.setProperty('box-shadow','none','important');
    para.style.setProperty('border-color','transparent','important');
    para.style.setProperty('transition','color .2s ease','important');
    // (08/11) só posição e escala (o navegador desenha à parte): animar largura travava quando a tela estava
    // ocupada montando a planilha no mesmo instante. Curva do sistema, sem "quique".
    fantasma.style.width=fim.w+'px';fantasma.style.height=fim.h+'px';fantasma.style.transformOrigin='0 0';fantasma.style.willChange='transform';
    var anim=fantasma.animate([
      {transform:'translate('+de.x+'px,'+de.y+'px) scale('+(de.w/fim.w)+','+(de.h/fim.h)+')'},
      {transform:'translate('+fim.x+'px,'+fim.y+'px) scale(1,1)'}
    ],{duration:340,easing:'cubic-bezier(.22,.78,.25,1)',fill:'forwards'});
    function volta(p){if(antes[p][0])para.style.setProperty(p,antes[p][0],antes[p][1]);else para.style.removeProperty(p);}
    function pronto(){
      // devolve a cor do botao ainda sem transicao (para nao piscar) e so depois a transicao dele
      props.forEach(function(p){if(p!=='transition')volta(p);});
      void para.offsetWidth;
      fantasma.remove();
      requestAnimationFrame(function(){volta('transition');irmaos.forEach(function(x,i){if(transIrmaos[i][0])x.style.setProperty('transition',transIrmaos[i][0],transIrmaos[i][1]);else x.style.removeProperty('transition');});});
    }
    anim.onfinish=pronto;anim.oncancel=pronto;
  }
  function conferirGrupos(){
    document.querySelectorAll('.active,.ativo,.ativa,.selected,.selecionado,.selecionada').forEach(function(el){try{
      if(typeof el.className!=='string'||!botaoDeGrupo(el))return;
      var grupo=el.parentElement,irmaos=Array.prototype.filter.call(grupo.children,function(x){return x!==el&&x.tagName===el.tagName;});
      if(!irmaos.length)return;
      var antes=ultimoAtivo.get(grupo);
      if(!antes){var pn=ultimoPorNome.get(nomeGrupo(grupo));if(pn&&!pn.grupo.isConnected)antes=pn;}
      // (11/11) Janela que está abrindo agora (ex.: abrir outra sugestão): o destaque já nasce no lugar certo,
      // sem deslizar do que estava marcado na janela anterior (dentro da janela que abria, parecia tremer)
      if(antes){var jan=grupo.closest('[role="dialog"],.mo,.modal-overlay');if(jan&&visivelAntes.get(jan)===false)antes=null;}
      // O destaque mudou de botao (troca de classe ou botoes redesenhados): desliza do antigo para o novo
      if(antes&&antes.el!==el&&!(antes.el.isConnected&&ATIVO.test(antes.el.className))&&!(!antes.el.isConnected&&antes.txt===el.textContent)){ultimaTrocaGrupo=Date.now();deslizar(grupo,antes,el);}
      lembrar(grupo,el);
    }catch(e){if(window.SAGA_DEBUG)console.warn('[saga] abas',e);}});
  }
  // Janelas que aparecem (online agora, notificacoes, cadastros, menus suspensos, avisos): surgem suaves, na curva do sistema
  var visivelAntes=new WeakMap();
  // (09/11) data-saga-movimento-proprio: a camada cuida do próprio movimento (ex.: tarefa embutida na ficha);
  // o saga_guard não anima nem faz a cópia que some por cima (fazia o fundo "voltar" e piscar ao fechar)
  function ehJanela(el){
    if(!el||el.nodeType!==1||el.id==='sagaCarregando'||el.getAttribute('aria-hidden')==='true'||el.closest('[data-saga-movimento-proprio]'))return false;
    if(/^(SCRIPT|STYLE|LINK|svg|path|INPUT|SELECT|OPTION|TEXTAREA|IMG|BR)$/i.test(el.tagName))return false;
    if(el.closest('#sidebarSaga,.leaflet-container'))return false;
    var cs=getComputedStyle(el),p=cs.position;
    // absoluto so conta se estiver por cima do resto (menus e popovers), nao blocos posicionados da pagina
    return p==='fixed'||(p==='absolute'&&(parseInt(cs.zIndex,10)||0)>=10);
  }
  function estaVisivel(el){
    var cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.05)return false;
    var r=el.getBoundingClientRect();
    return r.width>=60&&r.height>=36&&r.bottom>0&&r.top<innerHeight;
  }
  var displayAberto=new WeakMap();
  function registrarJanelas(){
    document.querySelectorAll('body *').forEach(function(el){if(ehJanela(el)){var v=estaVisivel(el);visivelAntes.set(el,v);if(v)displayAberto.set(el,getComputedStyle(el).display);}});
  }
  // Ao fechar: uma copia da janela, no mesmo lugar, encolhe e some (a janela de verdade ja fechou)
  function fecharJanela(el){
    if(reduz||!el.parentNode)return;
    var disp=displayAberto.get(el)||'block';
    var antes=[el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')];
    el.style.setProperty('display',disp,'important');
    var r=el.getBoundingClientRect(),copia=null;
    if(r.width>=60&&r.height>=36)copia=el.cloneNode(true);
    if(antes[0])el.style.setProperty('display',antes[0],antes[1]);else el.style.removeProperty('display');
    if(!copia||!copia.animate)return;
    copia.removeAttribute('id');copia.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id');});
    copia.setAttribute('aria-hidden','true');
    copia.style.setProperty('display',disp,'important');
    copia.style.setProperty('pointer-events','none','important');
    el.parentNode.insertBefore(copia,el.nextSibling);
    var telaToda=r.width>=innerWidth*0.9&&r.height>=innerHeight*0.85,anim;
    if(telaToda){
      anim=copia.animate([{opacity:1},{opacity:0}],{duration:200,easing:'ease-in',fill:'forwards'});
      var maior=null,area=0;
      Array.prototype.forEach.call(copia.children,function(c){var b=c.getBoundingClientRect(),a=b.width*b.height;if(a>area&&a<r.width*r.height*0.98){area=a;maior=c;}});
      if(maior){var bm=getComputedStyle(maior).transform;bm=bm==='none'?'':bm+' ';
        maior.animate([{transform:bm+'scale(1)'},{transform:bm+'translateY(10px) scale(.95)'}],{duration:200,easing:'ease-in',fill:'forwards'});}
    }else{
      var base=getComputedStyle(copia).transform;base=base==='none'?'':base+' ';
      var origem=(r.left+r.width/2>innerWidth/2?'top right':'top left');
      if(r.top>innerHeight*0.6)origem=origem.replace('top','bottom');
      anim=copia.animate([{opacity:1,transform:base+'scale(1)',transformOrigin:origem},{opacity:0,transform:base+'scale(.92)',transformOrigin:origem}],{duration:170,easing:'ease-in',fill:'forwards'});
    }
    anim.onfinish=function(){copia.remove();};
    setTimeout(function(){if(copia.isConnected)copia.remove();},600);
  }
  // Chamado na hora da mudanca (antes de a tela ser desenhada), para a janela nao sumir de uma vez
  // (11/11, Dr. Victor) Janela que faz o PRÓPRIO movimento pela transição do CSS (opacidade que vai de 0 a 1 e volta):
  // o saga_guard não anima por cima. Antes, ao fechar, a janela ainda estava opaca no primeiro quadro e contava como
  // "abrindo": o saga_guard tocava o movimento de ABRIR e ela fechava, abria de novo e fechava (Sugestões, Pedidos de busca...).
  // Ao abrir, se o primeiro quadro já tinha um pouco de opacidade, entravam os dois movimentos juntos (tremia).
  // Devolve null (sem transição própria em andamento) ou se a janela vai TERMINAR visível (true) ou fechada (false).
  function movimentoProprio(el){
    if(!el.getAnimations||typeof CSSTransition==='undefined')return null;
    var fim=null;
    el.getAnimations().forEach(function(a){
      if(!(a instanceof CSSTransition)||a.playState!=='running'||a.transitionProperty!=='opacity')return;
      try{var k=a.effect.getKeyframes(),ult=k[k.length-1];if(ult&&ult.opacity!==undefined&&ult.opacity!=='')fim=parseFloat(ult.opacity)>=0.05;}catch(e){}
    });
    if(fim===true){var cs=getComputedStyle(el);if(cs.display==='none')fim=false;}
    return fim;
  }
  function verFechamentos(lista){
    lista.forEach(function(m){
      if(m.type!=='attributes')return;
      var el=m.target;
      if(visivelAntes.get(el)!==true||!ehJanela(el))return;
      try{
        var mp=movimentoProprio(el);
        if(mp!==null){visivelAntes.set(el,mp);return;} // o próprio CSS da janela faz a saída suave
        if(!estaVisivel(el)){visivelAntes.set(el,false);fecharJanela(el);}
      }catch(e){}
    });
  }
  // Janelas (09/11, Dr. Victor): abrem na curva do sistema, sem a mola que passava do ponto e voltava
  var CURVA_JANELA='cubic-bezier(.22,.78,.25,1)';
  function animarJanela(el){
    if(reduz||!el.animate)return;
    var r=el.getBoundingClientRect(),base=getComputedStyle(el).transform;base=base==='none'?'':base+' ';
    var telaToda=r.width>=innerWidth*0.9&&r.height>=innerHeight*0.85;
    if(telaToda){
      // fundo escurece suave e a janela de dentro cresce suave (sem passar do ponto)
      el.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'});
      var maior=null,area=0;
      Array.prototype.forEach.call(el.children,function(c){var b=c.getBoundingClientRect(),a=b.width*b.height;if(a>area&&a<r.width*r.height*0.98){area=a;maior=c;}});
      if(maior){var bm=getComputedStyle(maior).transform;bm=bm==='none'?'':bm+' ';
        maior.animate([{opacity:0,transform:bm+'translateY(16px) scale(.94)'},{opacity:1,offset:.5},{opacity:1,transform:bm+'translateY(0) scale(1)'}],{duration:340,easing:CURVA_JANELA});}
      return;
    }
    var origem=(r.left+r.width/2>innerWidth/2?'top right':'top left');
    if(r.top>innerHeight*0.6)origem=origem.replace('top','bottom');
    el.animate([{opacity:0,transform:base+'scale(.9)',transformOrigin:origem},{opacity:1,offset:.45,transformOrigin:origem},{opacity:1,transform:base+'scale(1)',transformOrigin:origem}],{duration:300,easing:CURVA_JANELA});
  }
  var paraConferir=new Set();
  // paraConteudo: só o que de fato APARECEU (conteúdo novo desenhado, ou bloco que estava escondido e foi mostrado).
  // Mudança de classe/estilo num bloco que já estava na tela não conta (clicar em "Filtrar" fazia o Kanban inteiro tremer).
  var paraConteudo=new Set();
  var CLASSE_MOSTRA=/(^|\s)(ativo|ativa|active|aberto|aberta|open|visivel|show)(\s|$)/;
  function anotarMudancas(lista){
    lista.forEach(function(m){
      if(m.type==='attributes'){
        paraConferir.add(m.target);
        var o=m.oldValue||'',t=m.target,apareceu=false;
        if(m.attributeName==='style')apareceu=/display\s*:\s*none/.test(o)&&!/display\s*:\s*none/.test(t.getAttribute('style')||'');
        else if(m.attributeName==='hidden')apareceu=m.oldValue!==null&&!t.hasAttribute('hidden');
        else if(m.attributeName==='class')apareceu=!CLASSE_MOSTRA.test(o)&&CLASSE_MOSTRA.test(typeof t.className==='string'?t.className:'');
        if(apareceu)paraConteudo.add(t);
      }
      else m.addedNodes.forEach(function(n){if(n.nodeType===1){paraConferir.add(n);paraConteudo.add(n);}});
    });
  }
  // (08/11) Troca de aba/modo (Kanban ↔ Lista, abas do Ponto, de Colaboradores, filtros...): o botão já deslizava,
  // mas o conteúdo trocava seco. Agora o bloco grande que aparece logo depois de uma troca de seleção entra suave.
  var animadosConteudo=new WeakMap();
  function ehConteudo(el){
    if(!el||el.nodeType!==1||!el.isConnected||el.getAttribute('aria-hidden')==='true')return false;
    if(/^(SCRIPT|STYLE|LINK|BUTTON|INPUT|SELECT|OPTION|TEXTAREA|svg|path|TR|TD|TH|TBODY|THEAD|LI|SPAN|B|I|LABEL)$/i.test(el.tagName))return false;
    if(el.closest('[class*="modal"],.mo,.si-ov,[role="dialog"],[class*="popover"],[class*="dropdown"],[class*="menu"]'))return false; // dentro de janela/menu: o saga_guard já anima a janela
    if(el.closest('#sidebarSaga,#topbarSaga,.leaflet-container,[data-saga-movimento-proprio]')||ehJanela(el))return false;
    var cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return false;
    var r=el.getBoundingClientRect();
    return r.width>=150&&r.height>=56;
  }
  // (08/11, Dr. Victor: "sempre que aplicar um filtro ou selecionar algo que mude as informações, efeito de movimento")
  // escolher num menu suspenso, opção de filtro, chip, legenda de gráfico ou aba também conta como troca
  document.addEventListener('change',function(e){var t=e.target;if(t&&(t.tagName==='SELECT'||t.type==='checkbox'||t.type==='radio'||t.type==='date'))ultimaTrocaGrupo=Date.now();},true);
  document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[class*="opcao"],[class*="option"],[class*="pill"],[class*="chip"],[class*="filtro"],[class*="leg"],[class*="tab"],[class*="aba"],[role="tab"],[role="option"],[role="menuitem"],[data-filtro],[data-f]');
    if(t&&!t.closest('#sidebarSaga,#topbarSaga,table,[contenteditable="true"]')&&!e.target.closest('table')){var rr=t.getBoundingClientRect();if(rr.width<=420&&rr.height<=80)ultimaTrocaGrupo=Date.now();}},true);
  function animarConteudo(lista){
    if(reduz||Date.now()-ultimaTrocaGrupo>900)return;
    var feitos=[];
    // linhas de tabela redesenhadas: anima a tabela inteira uma vez
    lista=lista.filter(function(el){return !(el&&el.nodeType===1&&/^(TD|TH)$/.test(el.tagName));}).map(function(el){return el&&el.nodeType===1&&/^(TR|TBODY)$/.test(el.tagName)&&el.closest?el.closest('table')||el:el;});
    lista.forEach(function(el){try{
      if(!ehConteudo(el))return;
      if(feitos.some(function(f){return f.contains(el)||el.contains(f);}))return; // só o bloco de fora
      var ult=animadosConteudo.get(el);if(ult&&Date.now()-ult<500)return;
      // dentro de um bloco que acabou de entrar (ex.: aba que carrega os dados logo depois): não anima de novo (tremia)
      for(var an=el.parentElement;an;an=an.parentElement){var ta=animadosConteudo.get(an);if(ta&&Date.now()-ta<1200)return;}
      if(el.getAnimations&&el.getAnimations().some(function(a){return a.playState==='running';}))return;
      animadosConteudo.set(el,Date.now());feitos.push(el);
      if(el.animate)el.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:300,easing:'cubic-bezier(.22,.78,.25,1)'});
    }catch(e){}});
  }
  function conferirJanelas(){
    var itens=Array.from(paraConferir);paraConferir.clear();
    var novos=Array.from(paraConteudo);paraConteudo.clear();
    try{var prof=function(n){var d=0;while(n&&n.parentNode){d++;n=n.parentNode;}return d;};if(!(window.__sagaSemConteudoAte>Date.now()))animarConteudo(novos.filter(function(n){return n&&n.nodeType===1;}).map(function(n){return [prof(n),n];}).sort(function(a,b){return a[0]-b[0];}).map(function(x){return x[1];}));}catch(e){}
    itens.forEach(function(el){try{
      if(!el.isConnected||!ehJanela(el))return;
      // abrindo ou fechando pela transição do próprio CSS: só anota como ela vai terminar (sem animar por cima)
      var mp=movimentoProprio(el);
      if(mp!==null){visivelAntes.set(el,mp);if(mp)displayAberto.set(el,getComputedStyle(el).display);return;}
      var antes=visivelAntes.get(el),agora=estaVisivel(el);
      visivelAntes.set(el,agora);
      if(agora)displayAberto.set(el,getComputedStyle(el).display);
      if(agora&&antes!==true)animarJanela(el);
    }catch(e){}});
  }
  var agendado=false;
  function agendarConferencia(){
    if(agendado)return;agendado=true;
    requestAnimationFrame(function(){agendado=false;try{conferirGrupos();}catch(e){}try{conferirJanelas();}catch(e){}});
  }

  var fio=null,fioTimer=null;
  function mostrarFio(){
    if(!document.body)return;
    if(!fio){fio=document.createElement('div');fio.id='sagaCarregando';document.body.appendChild(fio);}
    var tb=document.getElementById('topbarSaga');
    fio.style.top=(tb?Math.max(0,tb.getBoundingClientRect().bottom):0)+'px';
    fio.classList.add('ativo');
  }

  html.classList.add('saga-padrao');
  // A primeira imagem da tela so e desenhada depois de montados os menus (fim da leitura da pagina)
  try{document.write('<link rel="expect" href="#sagaFimDaTela" blocking="render">');}catch(e){}
  // Aba aberta dentro da tela: lembrada nesta aba do navegador; ao recarregar (F5), volta para ela
  var ATRIBS_ABA=['data-aba','data-aba-col','data-view','data-visao'];
  var CHAVE_ABA='saga-abas:'+location.pathname;
  function lerAbas(){try{return JSON.parse(sessionStorage.getItem(CHAVE_ABA)||'{}')||{};}catch(e){return {};}}
  // Link que pede uma aba (ex.: configuracoes...?aba=preferencias, atalhos do menu da foto): ela vale mais que a lembrada
  try{var abaUrl=new URLSearchParams(location.search).get('aba');if(abaUrl){var mu=lerAbas();mu['data-aba']=abaUrl;sessionStorage.setItem(CHAVE_ABA,JSON.stringify(mu));}}catch(e){}
  document.addEventListener('click',function(ev){
    var el=ev.target&&ev.target.closest&&ev.target.closest('[data-aba],[data-aba-col],[data-view],[data-visao]');
    if(!el||el.closest('.modal-overlay,#sidebarSaga,#topbarSaga'))return;
    var at=ATRIBS_ABA.find(function(a){return el.hasAttribute(a);});if(!at)return;
    var m=lerAbas();m[at]=el.getAttribute(at);
    try{sessionStorage.setItem(CHAVE_ABA,JSON.stringify(m));}catch(e){}
    // o endereço acompanha a aba escolhida (assim o F5 não volta para a aba do link)
    if(at==='data-aba'){try{var uu=new URL(location.href);if(uu.searchParams.has('aba')&&uu.searchParams.get('aba')!==m[at]){uu.searchParams.set('aba',m[at]);history.replaceState(history.state,'',uu);}}catch(e){}}
  },true);
  var abasRestauradas=false;
  function restaurarAbas(){
    abasRestauradas=true;
    var m=lerAbas(),clicou=false;
    ATRIBS_ABA.forEach(function(at){
      if(!m[at])return;
      var el=Array.prototype.find.call(document.querySelectorAll('['+at+'="'+String(m[at]).replace(/"/g,'')+'"]'),function(x){return !x.closest('.modal-overlay')&&x.getClientRects().length;});
      if(!el||/(^|\s)(active|ativo|ativa|selected)(\s|$)/.test(el.className||''))return;
      try{el.click();clicou=true;}catch(e){}
    });
    return clicou;
  }

  var jaMostrou=false;
  function mostrar(){
    if(!sessaoOk){mostrarEsperando=true;return;}
    mostrarMoldura();
    if(jaMostrou)return;jaMostrou=true;
    clearTimeout(fioTimer);if(fio)fio.classList.remove('ativo');
    if(!reduz){try{cascata(blocosCascata(),true);}catch(e){}}
    html.classList.remove('saga-carregando');
    try{
      conferirGrupos();registrarJanelas();
      new MutationObserver(function(lista){try{verFechamentos(lista);}catch(e){}anotarMudancas(lista);agendarConferencia();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','hidden','open']});
    }catch(e){}
  }
  // Menus prontos: espera a tela terminar de buscar os dados (sem buscas por um instante) e mostra tudo de uma vez
  function esperarDados(){
    if(jaMostrou)return;
    var inicio=Date.now();
    fioTimer=setTimeout(mostrarFio,260);
    (function conferir(){
      if(jaMostrou)return;
      var quieto=pendentes===0&&Date.now()-ultimaBusca>=90;
      // Antes de mostrar, volta para a aba em que a pessoa estava (e espera os dados dessa aba)
      if(quieto&&!abasRestauradas){var mudou=false;try{mudou=restaurarAbas();}catch(e){}if(mudou){ultimaBusca=Date.now();setTimeout(conferir,25);return;}}
      if(quieto||Date.now()-inicio>2800){if(!abasRestauradas){try{restaurarAbas();}catch(e){}}mostrar();return;}
      setTimeout(conferir,25);
    })();
  }
  document.addEventListener('saga-ui-moldura',mostrarMoldura);
  document.addEventListener('saga-ui-pronto',function(){
    mostrarMoldura();
    // A tela pode chamar algo logo depois de pronta: a contagem comeca no proximo instante
    ultimaBusca=Date.now();
    esperarDados();
    setTimeout(function(){html.classList.remove('saga-fixando');},400);
  });
  // Rede de seguranca: se algo travar, a tela aparece mesmo assim (mas só com a sessão conferida: 19/11)
  setTimeout(function(){mostrar();html.classList.remove('saga-fixando');},8000);

  // ===== Janela aberta = tela de trás parada (19/11, Dr. Victor) =====
  // "Com qualquer janela aberta no sistema (pop-up, modal, janela de detalhe), a tela de trás NÃO se move (roda do
  // mouse, toque, teclado) até fechar a da frente." Janela = camada fixa visível que cobre a tela (o fundo escuro das
  // janelas) ou [role=dialog][aria-modal=true] / <dialog open> por cima. Enquanto houver uma (empilhadas: até fechar
  // todas), html.saga-janela-aberta trava a rolagem da página (a posição fica; a largura não muda, scrollbar-gutter),
  // a roda e o toque só rolam o que está DENTRO da janela da frente (sem passar para trás: overscroll-behavior:contain)
  // e as teclas de rolar só valem com o foco dentro dela. Menu lateral e barra de cima continuam com as regras deles.
  (function(){
    var FORA='#sidebarSaga,#topbarSaga,#sagaPortao,#sagaTravaPonto,#sagaAguardaEntrada,#sagaCarregando,#sagaVidroAnim,#overlay,#toast-container,[data-saga-sem-trava]';
    var cand=new Set(),ativas=[],travado=false,pedido=false;
    var st=document.createElement('style');st.id='sagaTravaJanela';
    st.textContent='html.saga-janela-aberta,html.saga-janela-aberta body{overflow:hidden !important;}'+
      '[data-saga-janela-ativa],[data-saga-janela-ativa] *{overscroll-behavior:contain;}';
    (document.head||html).appendChild(st);
    var NAO_TAG=/^(TD|TH|TR|TBODY|THEAD|TABLE|SPAN|A|B|I|EM|STRONG|SMALL|P|LI|UL|OL|INPUT|SELECT|OPTION|TEXTAREA|BUTTON|LABEL|IMG|BR|SCRIPT|STYLE|LINK|svg|path|g|circle|rect|line|text|use)$/i;
    function olhar(el){try{if(el&&el.nodeType===1&&!NAO_TAG.test(el.tagName)&&!el.closest(FORA)&&getComputedStyle(el).position==='fixed')cand.add(el);}catch(e){}}
    function varrer(raiz){if(!raiz||raiz.nodeType!==1)return;olhar(raiz);var l=raiz.querySelectorAll('*');for(var i=0;i<l.length;i++)olhar(l[i]);}
    function ehAberta(el){
      if(!el.isConnected)return false;
      var cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||cs.pointerEvents==='none'||parseFloat(cs.opacity)<0.05)return false;
      var r=el.getBoundingClientRect();
      // janela dentro de um fundo fechado (o pai está escondido): tamanho zero, não conta
      if((el.tagName==='DIALOG'&&el.open)||(el.getAttribute('role')==='dialog'&&el.getAttribute('aria-modal')==='true'))return r.width>=60&&r.height>=36;
      return r.width>=innerWidth*0.9&&r.height>=innerHeight*0.85;
    }
    function conferir(){
      var novas=[];
      cand.forEach(function(el){if(!el.isConnected){cand.delete(el);return;}if(ehAberta(el))novas.push(el);});
      document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]').forEach(function(el){if(novas.indexOf(el)<0&&!el.closest(FORA)&&ehAberta(el))novas.push(el);});
      // a da frente por último (z-index maior; empate: a que vem depois no documento)
      novas.sort(function(a,b){var za=parseInt(getComputedStyle(a).zIndex,10)||0,zb=parseInt(getComputedStyle(b).zIndex,10)||0;if(za!==zb)return za-zb;return a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1;});
      ativas.forEach(function(el){if(novas.indexOf(el)<0)el.removeAttribute('data-saga-janela-ativa');});
      novas.forEach(function(el){el.setAttribute('data-saga-janela-ativa','');});
      ativas=novas;
      var deve=ativas.length>0;
      if(deve!==travado){travado=deve;html.classList.toggle('saga-janela-aberta',deve);}
    }
    window.sagaJanelaAberta=function(){conferir();return ativas.length>0;};
    function frente(){return ativas[ativas.length-1]||null;}
    function liberado(t){return !!(t&&t.closest&&t.closest('#sidebarSaga,#topbarSaga'));}
    // algum bloco rolável entre o alvo e a janela consegue rolar nessa direção?
    function podeRolar(alvo,jan,dx,dy){
      for(var el=alvo;el&&el.nodeType===1;el=el.parentElement){
        var cs=getComputedStyle(el);
        if(dy&&/(auto|scroll|overlay)/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+1){if(dy<0?el.scrollTop>0:el.scrollTop+el.clientHeight<el.scrollHeight-1)return true;}
        if(dx&&/(auto|scroll|overlay)/.test(cs.overflowX)&&el.scrollWidth>el.clientWidth+1){if(dx<0?el.scrollLeft>0:el.scrollLeft+el.clientWidth<el.scrollWidth-1)return true;}
        if(el===jan)break;
      }
      return false;
    }
    function decidir(ev,dx,dy){
      if(!travado)return;var t=ev.target;if(liberado(t))return;
      var j=frente();
      if(!j||!j.contains(t)){if(ev.cancelable)ev.preventDefault();return;}
      if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0;
      if(!podeRolar(t,j,dx,dy)&&ev.cancelable)ev.preventDefault();
    }
    document.addEventListener('wheel',function(ev){if(ev.ctrlKey)return;decidir(ev,ev.deltaX,ev.deltaY);},{capture:true,passive:false});
    var tx=0,ty=0;
    document.addEventListener('touchstart',function(ev){var p=ev.touches&&ev.touches[0];if(p){tx=p.clientX;ty=p.clientY;}},{capture:true,passive:true});
    document.addEventListener('touchmove',function(ev){if(!travado||!ev.touches||ev.touches.length!==1)return;var p=ev.touches[0];decidir(ev,tx-p.clientX,ty-p.clientY);tx=p.clientX;ty=p.clientY;},{capture:true,passive:false});
    var TECLAS={' ':1,PageUp:1,PageDown:1,Home:1,End:1,ArrowUp:1,ArrowDown:1};
    document.addEventListener('keydown',function(ev){
      if(!travado||!TECLAS[ev.key]||ev.defaultPrevented)return;
      var a=document.activeElement,j=frente();
      if(a&&j&&j.contains(a)&&a!==j)return; // dentro da janela: as teclas valem (campos, listas, a própria rolagem dela)
      if(a&&a.closest&&a.closest('#sidebarSaga,#topbarSaga'))return;
      if(a&&(a.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))return;
      ev.preventDefault();
    },true);
    function iniciar(){
      varrer(document.body);conferir();
      new MutationObserver(function(lista){
        lista.forEach(function(m){if(m.type==='childList')m.addedNodes.forEach(varrer);else olhar(m.target);});
        if(!pedido){pedido=true;requestAnimationFrame(function(){pedido=false;conferir();});}
      }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','open','aria-modal']});
      // a janela que abre pela transição do CSS só fica visível no fim dela
      ['transitionend','transitionrun','animationend'].forEach(function(t){document.addEventListener(t,function(){requestAnimationFrame(conferir);},true);});
      setInterval(conferir,400);
      addEventListener('resize',conferir);
    }
    if(document.body)iniciar();else document.addEventListener('DOMContentLoaded',iniciar);
  })();

  // Transicao entre paginas: quando a outra pagina nao participa (ex.: login), o navegador cancela sem erro aparente
  function calarTransicao(ev){
    var vt=ev&&ev.viewTransition;if(!vt)return;
    ['ready','finished','updateCallbackDone'].forEach(function(k){if(vt[k]&&vt[k].catch)vt[k].catch(function(){});});
  }
  window.addEventListener('pageswap',calarTransicao);
  window.addEventListener('pagereveal',calarTransicao);

  // 19/11: ao sair da página para a memória do navegador, ela é guardada ESCONDIDA; ao voltar, só reaparece depois
  // de conferir o login (sem login vai para a tela de entrada sem mostrar nada; ex.: saiu do sistema e apertou voltar)
  window.addEventListener('pagehide',function(ev){if(ev.persisted)html.classList.add('saga-entrando');});
  // Volta pelo botao do navegador (pagina guardada em cache): nao fica apagada
  window.addEventListener('pageshow',function(ev){
    if(ev.persisted){
      if(!lerToken()){try{localStorage.removeItem(MARCA_OK);}catch(e){}location.replace(LOGIN);return;}
      molduraPedida=false;
      if(!sessaoConfiavel()){
        sessaoOk=false;molduraEsperando=true;portaoInicio=Date.now();portaoErro='';
        portaoEspera=setTimeout(abrirPortao,700);
        document.dispatchEvent(new CustomEvent('saga-reconferir'));
      }
      saindo=false;html.classList.remove('saga-carregando');mostrarMoldura();
      // a cópia guardada pelo navegador é de antes da última troca: reaplica cor, modo e letra salvos agora
      try{
        var corS=localStorage.getItem('saga-cor-salva')||localStorage.getItem('saga-cor')||'azul',temaS=localStorage.getItem('saga-tema')||'dark',letraS=localStorage.getItem('saga-letra')||'1';
        if(corS==='azul')html.removeAttribute('data-cor');else html.setAttribute('data-cor',corS);
        if(document.body&&document.body.getAttribute('data-theme')!==temaS)document.body.setAttribute('data-theme',temaS);
        html.style.zoom=letraS==='1'?'':letraS;
        if(window.sagaAplicarCor)window.sagaAplicarCor(corS,{deOutraAba:true});
      }catch(e){}
      if(document.getAnimations)document.getAnimations().forEach(function(a){try{a.cancel();}catch(e){}});
    }
  });

  // Kanbans: agarrar o fundo com o mouse e puxar para o lado (como o Google Planilhas / Trello).
  // Vale para qualquer quadro com colunas que passam da tela; clicar num cartão continua arrastando o cartão.
  (function(){
    var QUADROS='.quadro-kanban,.kanban-wrapper,.si-quadro,.kanban,.mat-kanban,[data-arrastar-lado]';
    var NAO='[draggable="true"],[class*="card"],[class*="cartao"],button,a,input,select,textarea,label,option,[contenteditable="true"],.menu-ordenar,.sp-menu';
    var st=document.createElement('style');
    st.textContent='.saga-pode-puxar{cursor:grab}body.saga-puxando,body.saga-puxando *{cursor:grabbing!important;user-select:none!important}';
    (document.head||document.documentElement).appendChild(st);
    function rolavel(el){
      for(var e=el;e&&e!==document.body;e=e.parentElement){
        var cs=getComputedStyle(e);
        if((cs.overflowX==='auto'||cs.overflowX==='scroll')&&e.scrollWidth>e.clientWidth+2)return e;
      }
      return null;
    }
    var p=null;
    document.addEventListener('mousemove',function(ev){
      if(p)return;
      var q=ev.target.closest&&ev.target.closest(QUADROS);
      document.querySelectorAll('.saga-pode-puxar').forEach(function(x){if(x!==q)x.classList.remove('saga-pode-puxar');});
      if(q&&!ev.target.closest(NAO)&&rolavel(q))q.classList.add('saga-pode-puxar');else if(q)q.classList.remove('saga-pode-puxar');
    },{passive:true});
    document.addEventListener('mousedown',function(ev){
      if(ev.button!==0||!ev.target.closest)return;
      var q=ev.target.closest(QUADROS);if(!q||ev.target.closest(NAO))return;
      var r=rolavel(q);if(!r)return;
      p={r:r,x:ev.clientX,y:ev.clientY,sl:r.scrollLeft,st:window.scrollY,ativo:false};
    });
    document.addEventListener('mousemove',function(ev){
      if(!p)return;
      var dx=ev.clientX-p.x;
      if(!p.ativo){if(Math.abs(dx)<4)return;p.ativo=true;document.body.classList.add('saga-puxando');}
      ev.preventDefault();
      p.r.scrollLeft=p.sl-dx;
    });
    function soltar(){
      if(!p)return;var foi=p.ativo;p=null;document.body.classList.remove('saga-puxando');
      // depois de puxar, o clique que vem junto não abre nada
      if(foi){var bloq=function(e){e.stopPropagation();e.preventDefault();window.removeEventListener('click',bloq,true);};window.addEventListener('click',bloq,true);setTimeout(function(){window.removeEventListener('click',bloq,true);},350);}
    }
    document.addEventListener('mouseup',soltar);window.addEventListener('blur',soltar);
  })();

  // Recolher / expandir um bloco com movimento fluido (altura, transparência e leve subida).
  // sagaRecolher(el, true) recolhe e depois esconde; sagaRecolher(el, false) mostra e expande.
  // Com "efeitos de movimento" desligados, só troca na hora.
  window.sagaRecolher=function(el,ocultar,fim){
    if(!el)return;
    var curva='cubic-bezier(.22,.78,.25,1)',sem=false;
    try{sem=localStorage.getItem('saga-movimento')==='reduzido';}catch(e){}
    var limpar=function(){['height','opacity','transform','overflow','transition','marginBottom','willChange'].forEach(function(k){el.style[k]='';});};
    if(el._recolhendo){clearTimeout(el._recolhendo);el._recolhendo=null;limpar();}
    if(sem||!el.isConnected){el.hidden=!!ocultar;limpar();if(fim)fim();return;}
    var mb=getComputedStyle(el).marginBottom;
    var terminar=function(){el._recolhendo=null;if(ocultar)el.hidden=true;limpar();if(fim)fim();};
    var trans='height 420ms '+curva+',opacity 300ms ease,transform 420ms '+curva+',margin-bottom 420ms '+curva;
    el.style.overflow='hidden';el.style.willChange='height,opacity,transform';
    if(ocultar){
      el.style.height=el.offsetHeight+'px';void el.offsetHeight;
      el.style.transition=trans;
      el.style.height='0px';el.style.opacity='0';el.style.transform='translateY(-10px)';el.style.marginBottom='0px';
    }else{
      el.hidden=false;var h=el.scrollHeight;
      el.style.height='0px';el.style.opacity='0';el.style.transform='translateY(-10px)';el.style.marginBottom='0px';void el.offsetHeight;
      el.style.transition=trans;
      el.style.height=h+'px';el.style.opacity='1';el.style.transform='none';el.style.marginBottom=mb;
    }
    el._recolhendo=setTimeout(terminar,470);
  };

  // Riscar e queimar (12/11, Dr. Victor; T160): ao concluir uma tarefa ou uma intimação, uma linha risca o texto
  // da esquerda para a direita (300 ms); quando o banco confirma, o item "queima" da esquerda para a direita, com
  // uma brasa na borda (440 ms), e depois recolhe (altura, espaço interno e o vão da lista). Assim a pessoa vê
  // que clicou certo.
  // sagaRiscar(el, {texto, esperar, recolher}) devolve uma Promise com true (feito) ou false (desfeito):
  //   texto: seletor (ou elemento) dos pedaços que levam o risco, ex.: o título; sem texto, só queima;
  //   esperar: Promise do salvamento (true/false); se der false ou erro, o risco é desfeito e nada some;
  //   recolher: false = só risca e o item fica no lugar (ex.: linha da lista que continua aparecendo riscada).
  // No fim o item fica com display:none: quem chamou redesenha a lista (ele aparece em "Concluídas").
  // Linha de tabela (tr) não queima: risca e esmaece. Com "efeitos de movimento" desligados, só espera o banco.
  // sagaRiscar.pulsar(el) acende de leve o lugar para onde o item foi (ex.: "Concluídas (3)").
  (function(){
    var curva='cubic-bezier(.22,.78,.25,1)',fogo='cubic-bezier(.45,.05,.55,.95)',pronto=false;
    function semMovimento(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
    function estilo(){
      if(pronto)return;pronto=true;
      var s=document.createElement('style');s.id='sagaRiscarCss';
      s.textContent='.saga-risco-txt{background-image:linear-gradient(currentColor,currentColor);background-repeat:no-repeat;background-position:0 58%;background-size:0 1.6px;-webkit-box-decoration-break:clone;box-decoration-break:clone;transition:background-size 300ms '+curva+'}'
        +'.saga-riscado .saga-risco-txt{background-size:100% 1.6px}'
        +'.saga-queima{-webkit-mask-image:linear-gradient(90deg,transparent 40%,#000 60%);mask-image:linear-gradient(90deg,transparent 40%,#000 60%);-webkit-mask-size:260% 100%;mask-size:260% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:100% 0;mask-position:100% 0}'
        +'.saga-queima.saga-queima-vai{-webkit-transition:-webkit-mask-position 440ms '+fogo+';transition:mask-position 440ms '+fogo+',-webkit-mask-position 440ms '+fogo+';-webkit-mask-position:0 0;mask-position:0 0}'
        +'.saga-brasa{position:absolute;top:0;bottom:0;left:0;pointer-events:none;z-index:3;border-radius:inherit;background:linear-gradient(90deg,transparent 0,color-mix(in srgb,var(--warning,#e0a93b) 60%,transparent) 45%,color-mix(in srgb,var(--danger,#e5636a) 75%,transparent) 68%,transparent 100%);filter:blur(2px)}'
        +'tr.saga-riscado>td{transition:opacity 360ms ease}tr.saga-some>td{opacity:0}'
        +'@keyframes sagaPulso{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--success,#4cc38a) 50%,transparent);background-color:color-mix(in srgb,var(--success,#4cc38a) 18%,transparent)}100%{box-shadow:0 0 0 9px transparent;background-color:transparent}}'
        +'.saga-pulso{animation:sagaPulso 950ms ease-out 1}';
      (document.head||document.documentElement).appendChild(s);
    }
    function espera(ms){return new Promise(function(r){setTimeout(r,ms);});}
    // recolhe por inteiro (altura, espaço interno, borda e o vão da lista) e esconde com display:none,
    // que vale mesmo quando o CSS da tela dá display:flex ao item (o atributo hidden sozinho não esconde)
    function recolherTudo(el){
      return new Promise(function(fim){
        if(!el.isConnected){fim(true);return;}
        var pai=el.parentElement,vao=0,antes=!!el.previousElementSibling;
        if(pai){var pc=getComputedStyle(pai);if(/flex/.test(pc.display)&&/column/.test(pc.flexDirection)){var g=parseFloat(pc.rowGap)||0;if(g>0&&(antes||el.nextElementSibling))vao=g;}}
        el.style.boxSizing='border-box';el.style.height=el.offsetHeight+'px';el.style.overflow='hidden';
        void el.offsetHeight;
        el.style.transition=['height','padding-top','padding-bottom','border-top-width','border-bottom-width','margin-top','margin-bottom'].map(function(k){return k+' 420ms '+curva;}).join(',');
        el.style.height='0px';el.style.paddingTop='0px';el.style.paddingBottom='0px';el.style.borderTopWidth='0px';el.style.borderBottomWidth='0px';
        el.style.marginTop=(vao&&antes?-vao:0)+'px';el.style.marginBottom=(vao&&!antes?-vao:0)+'px';
        setTimeout(function(){el.style.display='none';el.hidden=true;fim(true);},440);
      });
    }
    window.sagaRiscar=function(el,op){
      op=op||{};
      var salvou=Promise.resolve(op.esperar===undefined?true:op.esperar).then(function(v){return v!==false;},function(){return false;});
      if(!el||!el.isConnected||semMovimento())return salvou;
      estilo();
      var alvos=[];
      if(op.texto)alvos=typeof op.texto==='string'?Array.prototype.slice.call(el.querySelectorAll(op.texto)):[].concat(op.texto);
      if(el.tagName==='TR'&&!alvos.length)alvos=Array.prototype.slice.call(el.children);
      var envoltos=[],brasa=null,posAntes=el.style.position;
      alvos.forEach(function(a){
        if(!a||a.nodeType!==1||!a.firstChild||a.querySelector('.saga-risco-txt'))return;
        var sp=document.createElement('span');sp.className='saga-risco-txt';
        while(a.firstChild)sp.appendChild(a.firstChild);
        a.appendChild(sp);envoltos.push([a,sp]);
      });
      void el.offsetWidth;
      el.classList.add('saga-riscado');
      function desfazer(){
        el.classList.remove('saga-riscado','saga-queima','saga-queima-vai','saga-some');
        envoltos.forEach(function(p){while(p[1].firstChild)p[0].insertBefore(p[1].firstChild,p[1]);p[1].remove();});
        if(brasa)brasa.remove();el.style.position=posAntes;el.hidden=false;
      }
      return Promise.all([salvou,espera(330)]).then(function(r){
        if(!r[0]){desfazer();return false;}
        if(op.recolher===false||!el.isConnected)return true;
        if(el.tagName==='TR'){el.classList.add('saga-some');return espera(380).then(function(){el.style.display='none';el.hidden=true;return true;});}
        var w=el.offsetWidth,b=Math.max(44,Math.min(96,Math.round(w*0.2)));
        if(getComputedStyle(el).position==='static')el.style.position='relative';
        brasa=document.createElement('span');brasa.className='saga-brasa';brasa.setAttribute('aria-hidden','true');
        brasa.style.width=b+'px';brasa.style.transform='translateX('+Math.round(-0.3*w-b/2)+'px)';
        el.appendChild(brasa);el.classList.add('saga-queima');
        void el.offsetWidth;
        brasa.style.transition='transform 440ms '+fogo;
        el.classList.add('saga-queima-vai');
        brasa.style.transform='translateX('+Math.round(1.3*w-b/2)+'px)';
        return espera(450).then(function(){return recolherTudo(el);});
      });
    };
    window.sagaRiscar.pulsar=function(alvo){
      if(!alvo||semMovimento())return;
      estilo();
      alvo.classList.remove('saga-pulso');void alvo.offsetWidth;alvo.classList.add('saga-pulso');
      setTimeout(function(){alvo.classList.remove('saga-pulso');},1000);
    };
  })();

  // Saida suave ao trocar de tela pelo menu: os blocos somem em cascata rapida
  var saindo=false;
  window.sagaIrPara=function(url){
    if(!url||saindo)return;
    if(reduz||!jaMostrou){location.href=url;return;}
    saindo=true;
    var total=0,menu=0;
    try{total=cascata(blocosCascata(),false);}catch(e){}
    try{menu=deslizarMenu(url);}catch(e){}
    setTimeout(function(){location.href=url;},Math.max(Math.min(total,150),menu));
  };
  if(aoLado){
    window.sagaIrPara=function(url){if(!url)return;try{if(window.top.sagaIrPara){window.top.sagaIrPara(url);return;}window.top.location.href=url;}catch(e){location.href=url;}};
    // Esc fecha o painel quando não há janela aberta na ficha nem campo sendo digitado (checado antes de a ficha tratar o Esc)
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape')return;
      var t=e.target;if(t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(document.querySelector('.modal-overlay.open,.modal-overlay.ativo,.sp-ov,.sp-menu,#sagaConfirma,.dropdown-modelos.aberto'))return;
      try{window.parent.postMessage({saga:'ficha-lado-fechar'},location.origin);}catch(x){}
    },true);
  }

  // Menu lateral parado: ao clicar, so o destaque muda de item, sem movimento
  function deslizarMenu(url){
    var sb=document.getElementById('sidebarSaga');if(!sb)return 0;
    var atual=sb.querySelector('.nav-item.active'),alvo=null;
    sb.querySelectorAll('.nav-item[href],.nav-item[onclick]').forEach(function(el){if(el.getAttribute('href')===url||(el.getAttribute('onclick')||'').indexOf("'"+url+"'")>=0)alvo=el;});
    if(!atual||!alvo||atual===alvo)return 0;
    atual.classList.remove('active');alvo.classList.add('active');
    return 0;
  }

  // Todo botao responde ao toque: afunda um pouquinho ao apertar e volta com mola (como no iPhone)
  var SEL_BOTAO='button,[role="button"],.btn-primary,.btn-secondary,.btn-danger,.pill,.tab-btn,.btn-view,.filter-pill,.segment,.mat-kcard,a.btn,.icon-btn,.theme-toggle';
  var apertado=null;
  function soltar(){
    var el=apertado;apertado=null;
    if(!el||!el._sagaAperto)return;
    var a=el._sagaAperto;el._sagaAperto=null;
    a.cancel();
    el.animate([{transform:'scale(.95)'},{transform:'scale(1)'}],{duration:380,easing:'cubic-bezier(.34,1.56,.64,1)'});
  }
  if(!reduz){
    document.addEventListener('pointerdown',function(ev){
      if(ev.button!==0||reduz)return;
      var el=ev.target.closest&&ev.target.closest(SEL_BOTAO);
      if(!el||!el.animate||el.disabled||el.closest('[draggable="true"],.leaflet-container'))return;
      var r=el.getBoundingClientRect();if(r.width>420||r.height>260)return;
      soltar();apertado=el;
      el._sagaAperto=el.animate([{transform:'scale(1)'},{transform:'scale(.95)'}],{duration:110,easing:'ease-out',fill:'forwards'});
    },true);
    ['pointerup','pointercancel','dragstart'].forEach(function(t){document.addEventListener(t,soltar,true);});
    window.addEventListener('blur',soltar);
  }

  // Janela aberta (cadastro, cartão, aviso, menu do celular): a rodinha do mouse e o dedo rolam só a janela.
  // Ao chegar ao fim da janela, a tela de trás não rola junto. Vale para todas as telas.
  // (08/11) incluídas as janelas .mo (Notas, Teses, Cartas), .si-ov (Intimações), visores de documento e qualquer [role=dialog]/[aria-modal]
  var SEL_CAMADA='[class*="modal"],[class*="overlay"],[class*="backdrop"],[class*="dialog"],[class*="drawer"],dialog[open],.mo,.si-ov,[class*="-ov"],[class*="visor"],[role="dialog"],[aria-modal="true"]';
  function camadaAberta(){
    var lista=document.querySelectorAll(SEL_CAMADA),melhor=null,zMelhor=-1;
    for(var i=0;i<lista.length;i++){
      var el=lista[i],cs=getComputedStyle(el);
      if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)<0.05||cs.pointerEvents==='none')continue;
      var r=el.getBoundingClientRect();
      if(r.width<innerWidth*0.9||r.height<innerHeight*0.9)continue;
      var z=parseInt(cs.zIndex,10)||0;
      if(z>=zMelhor){zMelhor=z;melhor=el;}
    }
    return melhor;
  }
  function podeRolar(el,dy,dx){
    var cs=getComputedStyle(el);
    if(dy){
      if(!/(auto|scroll|overlay)/.test(cs.overflowY)||el.scrollHeight<=el.clientHeight+1)return false;
      return dy<0?el.scrollTop>0:el.scrollTop+el.clientHeight<el.scrollHeight-1;
    }
    if(!/(auto|scroll|overlay)/.test(cs.overflowX)||el.scrollWidth<=el.clientWidth+1)return false;
    return dx<0?el.scrollLeft>0:el.scrollLeft+el.clientWidth<el.scrollWidth-1;
  }
  function travarRolagem(ev,dy,dx){
    if(!dy&&!dx)return;
    var camada=camadaAberta();if(!camada)return;
    var t=ev.target&&ev.target.nodeType===1?ev.target:(ev.target&&ev.target.parentElement);
    // fora da janela (ex.: menu do celular aberto por cima da tela): deixa rolar o que estiver por cima da camada
    var raiz=t&&camada.contains(t)?camada:null;
    if(!raiz){
      var dono=t;
      while(dono&&dono!==document.body){var z=parseInt(getComputedStyle(dono).zIndex,10);if(getComputedStyle(dono).position==='fixed'&&z>(parseInt(getComputedStyle(camada).zIndex,10)||0))break;dono=dono.parentElement;}
      if(!dono||dono===document.body){ev.preventDefault();return;}
      raiz=dono;
    }
    for(var el=t;el;el=el.parentElement){
      if(podeRolar(el,dy,dx))return;
      if(el===raiz)break;
    }
    ev.preventDefault();
  }
  document.addEventListener('wheel',function(ev){
    if(ev.ctrlKey)return; // zoom do navegador
    var dy=Math.abs(ev.deltaY)>=Math.abs(ev.deltaX)?ev.deltaY:0,dx=dy?0:(ev.shiftKey?ev.deltaY:ev.deltaX);
    travarRolagem(ev,dy,dx);
  },{passive:false,capture:true});
  var toque=null;
  document.addEventListener('touchstart',function(ev){var p=ev.touches[0];toque=p?{x:p.clientX,y:p.clientY}:null;},{passive:true,capture:true});
  document.addEventListener('touchmove',function(ev){
    if(!toque||ev.touches.length!==1)return;
    var p=ev.touches[0],dy=toque.y-p.clientY,dx=toque.x-p.clientX;
    if(Math.abs(dy)>=Math.abs(dx))travarRolagem(ev,dy,0);else travarRolagem(ev,0,dx);
  },{passive:false,capture:true});
  // Listas dentro de janelas e menus suspensos: ao chegar ao fim, não passam a rolagem para a tela
  (document.head||html).appendChild(Object.assign(document.createElement('style'),{textContent:
    '[class*="modal"],[class*="modal"] *,[class*="popover"],[class*="popover"] *,[class*="dropdown"],[class*="dropdown"] *,[class*="pop-"],dialog,dialog *,.mo,.mo *,.si-ov,.si-ov *,[class*="visor"],[class*="visor"] *{overscroll-behavior:contain;}'}));
})();

/* =====================================================================
   VOLTAR SEM PERDER OS FILTROS (17/11, Dr. Victor)
   Ao VOLTAR (botão do mouse, seta do navegador) ou AVANÇAR para uma tela, ela aparece como estava:
   filtros, busca, página, aba, visão e rolagem. Abrir pelo MENU (ou por link) é uma entrada nova
   no histórico e continua abrindo LIMPA (regra de 09/11 das planilhas). F5 também abre limpa.
   Cada entrada do histórico ganha um código (history.state.sagaEntrada); ao sair da tela
   (pagehide), cada tela registrada grava o seu estado em sessionStorage 'saga-volta:<código>'
   (só nesta aba). Tela que quer isso chama, DEPOIS de montar os filtros e os dados:
     SagaVolta.registrar('chave', {ler:function(){return {...}}, aplicar:function(o){...}, rolagem:['#seletor']})
   aplicar() só é chamado quando a tela foi aberta pelo voltar/avançar e há estado guardado.
   ===================================================================== */
(function(){
  if(window.SagaVolta)return;
  var PREF='saga-volta:';
  var nav=null;try{nav=performance.getEntriesByType('navigation')[0];}catch(e){}
  var voltando=!!(nav&&nav.type==='back_forward');
  function lerId(){var st=history.state;return st&&typeof st==='object'&&st.sagaEntrada?String(st.sagaEntrada):null;}
  function gravarId(id){try{var st=history.state;var novo=(st&&typeof st==='object')?Object.assign({},st):{};novo.sagaEntrada=id;history.replaceState(novo,'',location.href);}catch(e){}}
  var idCarga=lerId(),dados=null;
  if(voltando&&idCarga){try{dados=JSON.parse(sessionStorage.getItem(PREF+idCarga)||'null');}catch(e){}if(dados&&dados.caminho!==location.pathname)dados=null;}
  if(!idCarga){idCarga=Date.now().toString(36)+Math.random().toString(36).slice(2,8);gravarId(idCarga);}
  var registros={};
  function limpar(){
    try{var ks=[];for(var i=0;i<sessionStorage.length;i++){var k=sessionStorage.key(i);if(k&&k.indexOf(PREF)===0)ks.push(k);}
      if(ks.length<=40)return;
      ks.map(function(k){var t=0;try{t=JSON.parse(sessionStorage.getItem(k)).t||0;}catch(e){}return {k:k,t:t};})
        .sort(function(a,b){return a.t-b.t;}).slice(0,ks.length-40).forEach(function(o){sessionStorage.removeItem(o.k);});
    }catch(e){}
  }
  function salvar(){
    if(!Object.keys(registros).length)return;
    // a tela pode ter trocado o history.state (replaceState(null...)): o código volta para a entrada
    var id=lerId();if(!id){id=idCarga;gravarId(id);}
    var d={caminho:location.pathname,t:Date.now(),rol:{x:window.scrollX,y:window.scrollY},el:{},telas:{}};
    Object.keys(registros).forEach(function(k){
      var r=registros[k];
      try{d.telas[k]=r.ler();}catch(e){}
      (r.rolagem||[]).forEach(function(sel){var el=document.querySelector(sel);if(el)d.el[sel]={x:el.scrollLeft,y:el.scrollTop};});
    });
    try{sessionStorage.setItem(PREF+id,JSON.stringify(d));limpar();}catch(e){}
  }
  window.addEventListener('pagehide',salvar);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')salvar();});
  function restaurarRolagem(seletores){
    if(!dados)return;
    var tent=0,parar=false;
    function cancelar(){parar=true;}
    ['wheel','touchstart','keydown','mousedown'].forEach(function(ev){window.addEventListener(ev,cancelar,{once:true,passive:true,capture:true});});
    (function passo(){
      if(parar)return;tent++;var ok=true;
      if(dados.rol&&(dados.rol.y||dados.rol.x)){window.scrollTo(dados.rol.x,dados.rol.y);if(Math.abs(window.scrollY-dados.rol.y)>2)ok=false;}
      seletores.forEach(function(sel){var el=document.querySelector(sel),p=dados.el&&dados.el[sel];if(!el||!p)return;
        el.scrollLeft=p.x;el.scrollTop=p.y;if(Math.abs(el.scrollTop-p.y)>2||Math.abs(el.scrollLeft-p.x)>2)ok=false;});
      if(!ok&&tent<40)setTimeout(passo,100);
    })();
  }
  window.SagaVolta={
    voltando:voltando,
    // estado guardado desta tela (ou null): para a tela que precisa saber ANTES de carregar os dados
    estado:function(chave){return dados&&dados.telas&&dados.telas[chave]!=null?dados.telas[chave]:null;},
    registrar:function(chave,o){
      registros[chave]=o;
      var est=this.estado(chave);
      if(est==null||o._aplicado)return false;
      o._aplicado=true;
      try{if(o.aplicar)o.aplicar(est);}catch(e){if(window.console)console.warn('SagaVolta: não consegui pôr a tela como estava',e);}
      restaurarRolagem(o.rolagem||[]);
      return true;
    },
    salvar:salvar
  };
})();
