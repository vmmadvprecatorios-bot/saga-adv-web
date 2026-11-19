// 19/11 (Dr. Victor): MODO CLARO COM A COR. "O modo claro está muito puxado para o branco: todos muito parecidos,
// o tom da cor muito suave. E o que é branco no modo escuro tem que ir para o preto no modo claro e vice-versa."
// Gera o bloco "MODO CLARO COM A COR" do fim do saga_tema.css para as cores NORMAIS (sem vidro):
//  - fundo, painéis, zebra e menu tingidos de verdade com a cor de cada tema (cada tema bem diferente do outro);
//  - inversão do escuro: a barra de cima, que no escuro é clara, fica ESCURA na cor do tema (letra clara);
//    o menu lateral, que no escuro é escuro, fica CLARO tingido (letra escura);
//  - contraste conferido (texto >= 7, apagado e destaque >= 4,5 sobre o painel e o fundo; letra branca sobre o destaque >= 4,5).
// Uso: node ferramentas/gerar_claros.js            (mostra o relatório do contraste)
//      node ferramentas/gerar_claros.js --gravar   (troca o bloco entre as marcas no saga_tema.css; lê antes e confere o tamanho)
// O modo ESCURO não é tocado. As cores de VIDRO saem da conta do saga_guard.js (sagaVidroLivre, parte do claro).
const fs=require('fs'),path=require('path');
function hsl(h,s,l){h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));l=Math.max(0,Math.min(1,l));const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;
  if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}return [r,g,b].map(v=>Math.round((v+m)*255));}
const hx=c=>'#'+c.map(v=>('0'+v.toString(16)).slice(-2)).join('').toUpperCase();
function lum(c){const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
function ct(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
// desce (ou sobe) a luz até ter o contraste mínimo com TODOS os fundos
function aj(h,s,l,fundos,min,subir){let c=hsl(h,s,l);for(let i=0;i<80&&fundos.some(f=>ct(c,f)<min);i++){l+=subir?.01:-.01;c=hsl(h,s,l);}return c;}
const rgba=(c,a)=>'rgba('+c.join(',')+','+a+')';
const BRANCO=[255,255,255];
// h/s = destaque; hf/sf = fundo (Natal: fundo verde e destaque vermelho; Grafite: fundo quase sem cor e destaque champanhe)
const CORES=[
  {id:'azul',sel:'html:is(:not([data-cor]),[data-cor="azul"])',h:218,s:.80,hf:216,sf:.45},
  {id:'grafite',sel:'html[data-cor="grafite"]',h:36,s:.38,hf:40,sf:.07,top:[0,0,.13]},
  {id:'onix',sel:'html[data-cor="onix"]',h:0,s:0,hf:0,sf:0,neutro:true,top:[0,0,.07]},
  {id:'novembro',sel:'html[data-cor="novembro"]',h:206,s:.80,hf:206,sf:.62},
  {id:'rosa',sel:'html[data-cor="rosa"]',h:334,s:.70,hf:332,sf:.55},
  {id:'natal',sel:'html[data-cor="natal"]',h:357,s:.68,hf:146,sf:.32,top:[148,.45,.20]},
  {id:'profundo',sel:'html[data-cor="profundo"]',h:211,s:.85,hf:212,sf:.55},
  {id:'ciano',sel:'html[data-cor="ciano"]',h:188,s:.85,hf:190,sf:.55},
  {id:'ambar',sel:'html[data-cor="ambar"]',h:26,s:.92,hf:30,sf:.50},
  {id:'aurora',sel:'html[data-cor="aurora"]',h:252,s:.75,hf:252,sf:.45}];
const out=[],rel=[];
const B='body[data-theme="light"]';
CORES.forEach(c=>{
  const sf=c.sf,k=c.neutro?0:1;
  // fundo e superfícies: a página é a parte mais "puxada" para a cor; o painel é mais claro, mas tingido (nada de branco puro)
  const n1=hsl(c.hf,Math.min(.6,sf*1.0),c.neutro?.84:.86),n2=hsl(c.hf,Math.min(.6,sf*1.0),c.neutro?.88:.90),n3=hsl(c.hf,Math.min(.6,sf*1.0),c.neutro?.80:.82);
  const pn=hsl(c.hf,Math.min(.55,sf*.9),c.neutro?.955:.955),pn2=hsl(c.hf,Math.min(.55,sf*.9),c.neutro?.915:.925);
  const fundos=[pn,pn2,n1];
  const tx=aj(c.hf,Math.min(.5,sf),.15,fundos,9,false);
  const mu=aj(c.hf,Math.min(.25,sf),.38,fundos,4.6,false);
  // destaque: legível sobre o painel e com letra branca por cima (botão cheio)
  const gold=c.neutro?hsl(0,0,.18):aj(c.h,c.s,.44,fundos.concat([BRANCO]),4.6,false);
  const gl=c.neutro?hsl(0,0,.30):aj(c.h,c.s,.52,[pn],3.6,false);
  const gd=c.neutro?hsl(0,0,.08):hsl(c.h,c.s,Math.max(.14,lum(gold)>.08?.26:.22));
  const borda=hsl(c.hf,Math.min(.5,sf+.1),.2);
  // barra de cima ESCURA na cor do tema (inverte a do escuro)
  const tp=c.top?hsl(c.top[0],c.top[1],c.top[2]):hsl(c.h,Math.min(.7,c.s*.75),.24);
  const tpTx=hsl(c.hf,Math.min(.3,sf),.96),tpMu=aj(c.hf,Math.min(.3,sf),.80,[tp],4.6,true);
  const tpDest=c.neutro?hsl(0,0,.92):aj(c.h,c.s,.72,[tp],4.6,true);
  // menu lateral CLARO tingido (inverte o do escuro): letra escura
  const la0=hsl(c.hf,Math.min(.6,sf*1.05),c.neutro?.86:.84),la1=hsl(c.hf,Math.min(.6,sf*1.05),c.neutro?.83:.81),la2=hsl(c.hf,Math.min(.6,sf*1.05),c.neutro?.79:.77);
  const laTx=aj(c.hf,Math.min(.5,sf),.14,[la0,la1,la2],9,false),laSec=aj(c.hf,Math.min(.3,sf),.36,[la0,la1,la2],4.6,false),laIc=aj(c.hf,Math.min(.4,sf),.30,[la0,la1,la2],4.6,false);
  const laAt=c.neutro?hsl(0,0,.10):aj(c.h,c.s,.36,[la0,la1,la2],4.6,false);
  const v={'--navy-1':hx(n1),'--navy-2':hx(n2),'--navy-3':hx(n3),'--panel':hx(pn),'--panel-2':hx(pn2),'--panel-solid':hx(pn),
    '--border':rgba(borda,.24),'--border-soft':rgba(borda,.14),'--text':hx(tx),'--muted':hx(mu),'--gold':hx(gold),'--gold-light':hx(gl),'--gold-deep':hx(gd),'--info':hx(gold),
    '--shadow':'0 10px 28px '+rgba(borda,.16),
    '--t-zeb1':hx(pn),'--t-zeb2':hx(pn2),'--t-zebh':hx(hsl(c.hf,Math.min(.55,sf*.95),.88)),'--t-hoje':hx(c.neutro?hsl(0,0,.84):hsl(c.h,c.s*.6,.86)),
    '--t-top':hx(tp),'--t-topb':'rgba(0,0,0,.18)','--t-brand':hx(tpTx),'--t-brandb':hx(tpDest),'--t-ham':hx(tpTx),'--t-av':hx(c.neutro?hsl(0,0,.40):hsl(c.h,c.s,.50)),
    '--t-topmu':hx(tpMu),'--t-lat':'linear-gradient(180deg,'+hx(la0)+' 0%,'+hx(la1)+' 45%,'+hx(la2)+' 100%)','--t-latb':rgba(borda,.16),'--t-sec':hx(laSec),'--t-item':hx(laTx),'--t-icon':hx(laIc),'--t-ativo':hx(laAt),
    '--t-latfundo':hx(la1),'--t-hover':rgba(borda,.08),'--t-ativobg':rgba(c.neutro?[0,0,0]:hsl(c.h,c.s,.45),.16)};
  out.push(c.sel+' '+B+'{'+Object.keys(v).map(x=>x+':'+v[x]+'!important').join(';')+'}');
  out.push(c.sel+':has(> '+B+'),'+c.sel+' '+B+'{background:linear-gradient(180deg,'+hx(n2)+','+hx(n1)+') fixed!important}');
  rel.push(c.id.padEnd(9)+' texto '+ct(tx,pn2).toFixed(1)+' | apagado '+Math.min(...fundos.map(f=>ct(mu,f))).toFixed(1)+' | destaque '+Math.min(...fundos.map(f=>ct(gold,f))).toFixed(1)+' | branco/destaque '+ct(BRANCO,gold).toFixed(1)+
    ' | barra '+ct(tpTx,tp).toFixed(1)+'/'+ct(tpDest,tp).toFixed(1)+' | menu '+ct(laTx,la2).toFixed(1)+'/'+ct(laSec,la2).toFixed(1)+'/'+ct(laAt,la2).toFixed(1)+'  fundo '+hx(n1)+' painel '+hx(pn));
});
const S='html:is(:not([data-cor]),[data-cor="azul"],[data-cor="grafite"],[data-cor="onix"],[data-cor="novembro"],[data-cor="rosa"],[data-cor="natal"],[data-cor="profundo"],[data-cor="ciano"],[data-cor="ambar"],[data-cor="aurora"]) '+B;
const regras=`
/* barra de cima escura (no claro), com a letra e os ícones claros */
${S} #topbarSaga{background:var(--t-top)!important;border-bottom:1px solid var(--t-topb)!important}
${S} #topbarSaga .brand-name{color:var(--t-brand)!important}
${S} #topbarSaga .brand-name b{color:var(--t-brandb)!important}
${S} #hamburger{color:var(--t-ham)!important}
${S} #hamburger span{background:var(--t-ham)!important}
${S} #topbarSaga :is(.quick-search,.presence-btn,.icon-btn,.theme-toggle,.btn-topo,.cadeado-btn,#cadeadoBtn){background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.20)!important;color:var(--t-brand)!important}
${S} #topbarSaga :is(.quick-search,.presence-btn,.icon-btn,.theme-toggle,#cadeadoBtn):hover{background:rgba(255,255,255,.16)!important}
${S} #topbarSaga .quick-search:focus-within{border-color:var(--t-brandb)!important}
${S} #topbarSaga .quick-search input{color:var(--t-brand)!important}
${S} #topbarSaga .quick-search input::placeholder{color:var(--t-topmu)!important}
${S} #topbarSaga :is(.quick-search svg,.icon-btn svg,.theme-toggle svg,.presence-btn,.presence-btn span,#cadeadoBtn svg){color:var(--t-brand)!important}
${S} :is(#topbarSaga .avatar,#avatarTop,#topbarSaga .theme-toggle .knob){background:var(--t-av)!important;color:#FFFFFF!important}
/* menu lateral claro, tingido, com a letra escura */
${S} #sidebarSaga{background:var(--t-lat)!important;border-right:1px solid var(--t-latb)!important}
${S} #sidebarSaga :is(.nav-section,.nav-secao,.nav-grupo-titulo){color:var(--t-sec)!important}
${S} #sidebarSaga .nav-item{color:var(--t-item)!important}
${S} #sidebarSaga .nav-item :is(.nav-icon,svg){color:var(--t-icon)!important}
${S} #sidebarSaga .nav-item:hover{color:var(--t-item)!important;background:var(--t-hover)!important}
${S} #sidebarSaga :is(.nav-item.active,.nav-item.ativo){color:var(--t-item)!important;border-left-color:var(--t-ativo)!important;background:var(--t-ativobg)!important;font-weight:600}
${S} #sidebarSaga :is(.nav-item.active,.nav-item.ativo) :is(.nav-icon,svg){color:var(--t-ativo)!important}
/* tabelas zebradas e calendário na cor do tema */
${S} tbody tr:nth-child(odd) > td{background:var(--t-zeb1)}
${S} tbody tr:nth-child(even) > td{background:var(--t-zeb2)}
${S} tbody tr:hover > td{background:var(--t-zebh)}
${S} :is(.grade-mes > .celula-dia,.fundo-horas > .linha-hora,.coluna-horas > .hora-label):nth-child(odd){background:var(--t-zeb1)}
${S} :is(.grade-mes > .celula-dia,.fundo-horas > .linha-hora,.coluna-horas > .hora-label):nth-child(even){background:var(--t-zeb2)}
${S} .grade-mes > .celula-dia:hover{background:var(--t-zebh)}
${S} .grade-mes > .celula-dia.hoje{background:var(--t-hoje)}
/* cartões e janelas: o branco fixo das telas vira o painel tingido */
${S} :is(.panel,.card,.modal,.modal-box){background-color:var(--panel)}
`;
const VIDRO=`
/* VIDRO no claro: as 4 cores de vidro antigas passam a usar a conta do saga_guard.js (SAGA_VIDRO_CLARO) só no claro */
html:is([data-cor="vidro"],[data-cor="vidro-ciano"],[data-cor="vidro-ambar"],[data-cor="vidro-aurora"]) ${B}{--navy-1:var(--vl-c-fundo)!important;--navy-2:var(--vl-c-navy2)!important;--navy-3:var(--vl-c-navy3)!important;--panel:var(--vl-c-panel)!important;--panel-2:var(--vl-c-panel2)!important;--panel-solid:var(--vl-c-solid)!important;--border:var(--vl-c-borda)!important;--border-soft:var(--vl-c-borda2)!important;--text:var(--vl-c-texto)!important;--muted:var(--vl-c-muted)!important;--gold:var(--vl-c-gold)!important;--gold-light:var(--vl-c-gold2)!important;--gold-deep:var(--vl-c-gold)!important;--info:var(--vl-c-gold2)!important;--vd-fundo:var(--vl-c-fundo);--vd-ceu:var(--vl-c-ceu);--vd-halo:var(--vl-c-halo);--vd-montes:var(--vl-c-montes);--vd-cidade:var(--vl-c-cidade);--vd-grade:var(--vl-c-grade);--vd-veu:var(--vl-c-veu);--vd-vidro:var(--vl-c-vidro);--vd-vidro-forte:var(--vl-c-vidro2);--vd-brilho:var(--vl-c-brilho)}
/* VIDRO no claro: barra de cima de vidro ESCURO na cor (inverte a do escuro), letra clara */
html[data-cor^="vidro"] ${B} #topbarSaga{background:var(--vl-c-top)!important;border-bottom-color:rgba(0,0,0,.2)!important}
html[data-cor^="vidro"] ${B} #topbarSaga .brand-name{color:var(--vl-c-toptx)!important}
html[data-cor^="vidro"] ${B} #topbarSaga .brand-name b{color:var(--vl-c-topdest)!important}
html[data-cor^="vidro"] ${B} #hamburger{color:var(--vl-c-toptx)!important}
html[data-cor^="vidro"] ${B} #hamburger span{background:var(--vl-c-toptx)!important}
html[data-cor^="vidro"] ${B} #topbarSaga :is(.quick-search,.presence-btn,.icon-btn,.theme-toggle,#cadeadoBtn){background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.20)!important;color:var(--vl-c-toptx)!important}
html[data-cor^="vidro"] ${B} #topbarSaga .quick-search:focus-within{background:rgba(255,255,255,.16)!important;border-color:var(--vl-c-topdest)!important}
html[data-cor^="vidro"] ${B} #topbarSaga .quick-search input{color:var(--vl-c-toptx)!important;-webkit-text-fill-color:var(--vl-c-toptx)}
html[data-cor^="vidro"] ${B} #topbarSaga .quick-search input::placeholder{color:var(--vl-c-topmu)!important;-webkit-text-fill-color:var(--vl-c-topmu)}
html[data-cor^="vidro"] ${B} #topbarSaga :is(.quick-search svg,.icon-btn svg,.theme-toggle svg,.presence-btn,.presence-btn span,#cadeadoBtn svg){color:var(--vl-c-toptx)!important}
html[data-cor^="vidro"] ${B} :is(#topbarSaga .avatar,#avatarTop,#topbarSaga .theme-toggle .knob){background:var(--vl-c-topdest)!important;color:#111!important}
`;
const INI='/* ===== MODO CLARO COM A COR (19/11/2026, Dr. Victor) — gerado por ferramentas/gerar_claros.js: não editar à mão ===== */';
const FIM='/* ===== fim do MODO CLARO COM A COR ===== */';
const bloco=INI+'\n'+out.join('\n')+'\n'+regras.trim()+'\n'+VIDRO.trim()+'\n'+FIM;
console.log(rel.join('\n'));
if(process.argv.includes('--gravar')){
  const f=path.join(__dirname,'..','saga_tema.css');const antes=fs.readFileSync(f,'utf8');
  let novo;const i=antes.indexOf(INI),j=antes.indexOf(FIM);
  if(i>=0&&j>i)novo=antes.slice(0,i)+bloco+antes.slice(j+FIM.length);else novo=antes.replace(/\s*$/,'\n\n')+bloco+'\n';
  if(novo.length<antes.length*0.9)throw new Error('o saga_tema.css encolheu demais: nada gravado');
  fs.writeFileSync(f,novo);console.log('gravado: '+antes.length+' -> '+novo.length+' bytes');
}
