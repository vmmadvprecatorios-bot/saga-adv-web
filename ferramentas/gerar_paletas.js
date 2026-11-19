// 19/11 (Dr. Victor): CORES NOVAS a partir das PALETAS que ele mandou (prints com os códigos de cada tom, do mais
// escuro ao mais claro). Cada paleta vira uma cor NORMAL (este gerador) e uma VIDRO (semente no saga_guard.js,
// SAGA_VIDRO_SEMENTES). Usa os tons da própria paleta:
//  ESCURO: fundo e painéis = os tons escuros (escurecidos até ficarem fundo de verdade), texto = o tom mais claro,
//          destaque = o tom claro vivo; menu lateral escuro com os tons do meio; barra de cima clara (como as campanhas).
//  CLARO (inverso do escuro, regra de 19/11): fundo e painéis = os tons claros tingidos, texto = o tom mais escuro,
//          destaque = o tom do meio (escurecido até ler bem); barra de cima ESCURA e menu lateral CLARO.
//  Contraste conferido: texto >= 9, apagado e destaque >= 4,5, letra sobre o botão de destaque >= 4,5.
// Uso: node ferramentas/gerar_paletas.js            (relatório)
//      node ferramentas/gerar_paletas.js --gravar   (troca o bloco "PALETAS" no fim do saga_tema.css)
// Paleta nova: acrescentar em PALETAS (id, nome, tons do mais escuro ao mais claro) e no SAGA_CORES/SAGA_FUNDOS/
// FUNDOS/AMOSTRAS/SAGA_VIDRO_SEMENTES (o relatório imprime os valores prontos).
const fs=require('fs'),path=require('path');
const PALETAS=[
  {id:'rubi',nome:'Rubi',tons:['#2B0505','#540A0A','#8A0F11','#C71F24','#F26A6D','#FDECEE']},
  {id:'bordo',nome:'Bordô',tons:['#1F080F','#430C1D','#6E122C','#991D3C','#C4385A','#F7E4E9']},
  {id:'ouro',nome:'Ouro',tons:['#2F2000','#5E4300','#9B7300','#D4A200','#FFD700','#FFF9E0']},
  {id:'lima',nome:'Lima',tons:['#0E1F08','#264311','#487E1D','#76C52C','#A4E75A','#E2F7C2']},
  {id:'aco',nome:'Aço',tons:['#06141B','#11212D','#253745','#4A5C6A','#9BA8AB','#CCD0CF']},
  {id:'marsala',nome:'Marsala',tons:['#561C24','#6D2932','#C7B7A3','#E8D8C4']},
  {id:'cafe',nome:'Café',tons:['#3B2A1F','#6F4E37','#B08968','#D4B996','#EDE3D4','#FFF9F0']},
  {id:'mel',nome:'Mel',tons:['#5A4A0D','#7A5E12','#A67917','#CC961F','#EBB84A','#F3D789','#FFF3D8']}];
const h2r=h=>{const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];};
const hx=c=>'#'+c.map(v=>('0'+Math.round(Math.max(0,Math.min(255,v))).toString(16)).slice(-2)).join('').toUpperCase();
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function lum(c){const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
const ct=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const PRETO=[0,0,0],BRANCO=[255,255,255];
// leva a cor em direção ao preto (ou branco) até ter o contraste mínimo com todos os fundos
function aj(c,fundos,min,para){let x=c.slice();for(let i=0;i<100&&fundos.some(f=>ct(x,f)<min);i++)x=mix(x,para,.04);return x;}
function ateLum(c,alvo,para){let x=c.slice();for(let i=0;i<100&&(para===PRETO?lum(x)>alvo:lum(x)<alvo);i++)x=mix(x,para,.04);return x;}
const rgba=(c,a)=>'rgba('+c.map(Math.round).join(',')+','+a+')';
const out=[],rel=[],ids=[];
PALETAS.forEach(P=>{
  const t=P.tons.map(h2r),n=t.length,esc=t[0],esc2=t[1],meio=t[Math.floor((n-1)/2)],vivo=t[n-2],claro=t[n-1];
  ids.push(P.id);
  // ===== ESCURO =====
  const e1=ateLum(esc,.012,PRETO),e2=mix(e1,esc2,.12),e3=mix(e1,esc2,.22);
  const pn=ateLum(mix(e1,esc2,.38),.03,PRETO),pn2=ateLum(mix(e1,esc2,.55),.045,PRETO);
  const tx=aj(claro,[pn2],9,BRANCO),mu=aj(mix(claro,pn2,.45),[pn2,pn],4.6,BRANCO);
  const gold=aj(vivo,[pn2,pn],4.6,BRANCO),gl=aj(mix(vivo,claro,.45),[pn2],6,BRANCO),gd=t[Math.max(0,n-3)];
  const letraBotaoE=ct(BRANCO,gold)>=4.5?BRANCO:aj(esc,[gold],4.6,PRETO);
  const lat0=ateLum(mix(esc2,meio,.35),.06,PRETO),lat1=ateLum(esc2,.03,PRETO),lat2=e1;
  const latTx=aj(claro,[lat0],7,BRANCO),latIc=aj(mix(claro,lat0,.25),[lat0],4.6,BRANCO),latSec=aj(mix(claro,lat0,.4),[lat0],4.6,BRANCO),latAt=aj(vivo,[lat0],4.6,BRANCO);
  const topE=mix(claro,BRANCO,.25),topTxE=aj(esc,[topE],9,PRETO),topDestE=aj(t[Math.max(0,n-3)],[topE],4.6,PRETO);
  const E={'--navy-1':hx(e1),'--navy-2':hx(e2),'--navy-3':hx(e3),'--panel':hx(pn),'--panel-2':hx(pn2),'--panel-solid':hx(pn),
    '--border':rgba(claro,.14),'--border-soft':rgba(claro,.08),'--text':hx(tx),'--muted':hx(mu),'--gold':hx(gold),'--gold-light':hx(gl),'--gold-deep':hx(gd),'--info':hx(gl),
    '--t-zeb1':hx(pn),'--t-zeb2':hx(mix(pn,pn2,.5)),'--t-zebh':hx(pn2),'--t-hoje':hx(mix(pn2,vivo,.18)),
    '--t-top':hx(topE),'--t-topb':rgba(esc,.16),'--t-brand':hx(topTxE),'--t-brandb':hx(topDestE),'--t-ham':hx(topTxE),'--t-av':hx(topDestE),
    '--t-lat':'linear-gradient(180deg,'+hx(lat0)+' 0%,'+hx(lat1)+' 45%,'+hx(lat2)+' 100%)','--t-sec':hx(latSec),'--t-item':hx(latTx),'--t-icon':hx(latIc),'--t-ativo':hx(latAt),'--t-letra-botao':hx(letraBotaoE)};
  // ===== CLARO =====
  const c1=mix(claro,vivo,.42),c2=mix(claro,vivo,.26),c3=mix(claro,vivo,.55);
  const cp=mix(claro,BRANCO,.35),cp2=mix(claro,vivo,.12);
  const fundosC=[cp,cp2,c1];
  const ctx=aj(esc,fundosC,9,PRETO),cmu=aj(mix(esc,meio,.5),fundosC,4.6,PRETO);
  const cg=aj(t[Math.max(0,n-3)],fundosC.concat([BRANCO]),4.6,PRETO),cgl=aj(t[Math.max(0,n-3)],[cp],3.6,PRETO),cgd=aj(esc2,[cp],7,PRETO);
  const ctop=ateLum(esc2,.025,PRETO),ctopTx=aj(claro,[ctop],9,BRANCO),ctopMu=aj(mix(claro,ctop,.35),[ctop],4.6,BRANCO),ctopDest=aj(vivo,[ctop],4.6,BRANCO);
  const cl0=mix(claro,vivo,.5),cl1=mix(claro,vivo,.6),cl2=mix(claro,vivo,.7);
  const clTx=aj(esc,[cl0,cl1,cl2],9,PRETO),clSec=aj(mix(esc,meio,.4),[cl0,cl1,cl2],4.6,PRETO),clIc=aj(esc2,[cl0,cl1,cl2],4.6,PRETO),clAt=aj(esc2,[cl0,cl1,cl2],4.6,PRETO);
  const C={'--navy-1':hx(c1),'--navy-2':hx(c2),'--navy-3':hx(c3),'--panel':hx(cp),'--panel-2':hx(cp2),'--panel-solid':hx(cp),
    '--border':rgba(esc,.22),'--border-soft':rgba(esc,.13),'--text':hx(ctx),'--muted':hx(cmu),'--gold':hx(cg),'--gold-light':hx(cgl),'--gold-deep':hx(cgd),'--info':hx(cg),
    '--shadow':'0 10px 28px '+rgba(esc,.16),
    '--t-zeb1':hx(cp),'--t-zeb2':hx(cp2),'--t-zebh':hx(mix(claro,vivo,.22)),'--t-hoje':hx(mix(claro,vivo,.35)),
    '--t-top':hx(ctop),'--t-topb':'rgba(0,0,0,.18)','--t-brand':hx(ctopTx),'--t-brandb':hx(ctopDest),'--t-ham':hx(ctopTx),'--t-av':hx(cg),'--t-topmu':hx(ctopMu),
    '--t-lat':'linear-gradient(180deg,'+hx(cl0)+' 0%,'+hx(cl1)+' 45%,'+hx(cl2)+' 100%)','--t-latb':rgba(esc,.16),'--t-sec':hx(clSec),'--t-item':hx(clTx),'--t-icon':hx(clIc),'--t-ativo':hx(clAt),
    '--t-hover':rgba(esc,.08),'--t-ativobg':rgba(esc2,.16),'--t-letra-botao':'#FFFFFF'};
  const sel='html[data-cor="'+P.id+'"]';
  const imp=o=>Object.keys(o).map(k=>k+':'+o[k]+(k.startsWith('--t-')?'':'!important')).join(';');
  out.push(sel+' body[data-theme="dark"]{'+imp(E)+'}');
  out.push(sel+':has(> body[data-theme="dark"]),'+sel+' body[data-theme="dark"]{background:radial-gradient(1200px 640px at 70% -10%,'+hx(ateLum(mix(esc2,meio,.2),.03,PRETO))+','+hx(e1)+' 55%,'+hx(mix(e1,PRETO,.25))+') fixed!important}');
  out.push(sel+' body[data-theme="light"]{'+imp(C)+'}');
  out.push(sel+':has(> body[data-theme="light"]),'+sel+' body[data-theme="light"]{background:linear-gradient(180deg,'+hx(c2)+','+hx(c1)+') fixed!important}');
  P.res={escuro:hx(e1),claro:hx(c2),amostra:[hx(e1),hx(lat0),hx(gold),hx(c1),hx(cp),hx(cg)],semente:hx(t[Math.max(0,n-3)])};
  rel.push(P.id.padEnd(8)+' ESCURO texto '+ct(tx,pn2).toFixed(1)+' apagado '+ct(mu,pn2).toFixed(1)+' destaque '+ct(gold,pn2).toFixed(1)+' botão '+ct(letraBotaoE,gold).toFixed(1)+' menu '+ct(latTx,lat0).toFixed(1)+'/'+ct(latSec,lat0).toFixed(1)+
    ' | CLARO texto '+ct(ctx,cp2).toFixed(1)+' apagado '+Math.min(...fundosC.map(f=>ct(cmu,f))).toFixed(1)+' destaque '+Math.min(...fundosC.map(f=>ct(cg,f))).toFixed(1)+' branco/destaque '+ct(BRANCO,cg).toFixed(1)+' barra '+ct(ctopTx,ctop).toFixed(1)+'/'+ct(ctopDest,ctop).toFixed(1)+' menu '+ct(clTx,cl2).toFixed(1)+'/'+ct(clSec,cl2).toFixed(1));
});
const H='html:is('+ids.map(i=>'[data-cor="'+i+'"]').join(',')+')';
const L=H+' body[data-theme="light"]',BOT=':is(.btn-primary,.btn-view.ativo,.cat-tab.ativo,.pill-quantidade.ativo,.pag-btn.ativo,.pill-fase.ativo,.pill-direcao.ativo,.filter-pill.active,.aba-topo.ativa,.segment.active,.process-tab.active,.page-pill.active,.invite-tab.active,.choice-pill.active,.signature-tab.active,.pill-qtd-pagina.selecionada,.pill-filtro-rapido.selecionada,.opcao-visao-tarefas.ativa,.opcao-tipo-tarefa.ativa,.mes-rapido-item.selecionado,.custom-select-option.selected,.step-index,.avatar,.mini-avatar)';
const regras=`
/* menus das paletas (claro e escuro com as variáveis --t-* de cada uma) */
${H} body #topbarSaga{background:var(--t-top)!important;border-bottom:1px solid var(--t-topb)!important}
${H} body #topbarSaga .brand-name{color:var(--t-brand)!important}
${H} body #topbarSaga .brand-name b{color:var(--t-brandb)!important}
${H} body #hamburger{color:var(--t-ham)!important}
${H} body #hamburger span{background:var(--t-ham)!important}
${H} body #topbarSaga .quick-search:focus-within{border-color:var(--t-brandb)!important}
${H} body :is(#topbarSaga .avatar,#avatarTop,#topbarSaga .theme-toggle .knob){background:var(--t-av)!important;color:var(--t-letra-botao)!important}
${H} body #sidebarSaga{background:var(--t-lat)!important;border-right:none!important}
${H} body #sidebarSaga :is(.nav-section,.nav-secao,.nav-grupo-titulo){color:var(--t-sec)!important}
${H} body #sidebarSaga .nav-item{color:var(--t-item)!important}
${H} body #sidebarSaga .nav-item :is(.nav-icon,svg){color:var(--t-icon)!important}
${H} body #sidebarSaga .nav-item:hover{color:var(--t-item)!important;background:rgba(255,255,255,.08)!important}
${H} body #sidebarSaga :is(.nav-item.active,.nav-item.ativo){color:var(--t-item)!important;border-left-color:var(--t-ativo)!important;background:rgba(255,255,255,.14)!important}
${H} body #sidebarSaga :is(.nav-item.active,.nav-item.ativo) :is(.nav-icon,svg){color:var(--t-ativo)!important}
${H} body ${BOT}{color:var(--t-letra-botao)!important}
${H} body tbody tr:nth-child(odd) > td{background:var(--t-zeb1)}
${H} body tbody tr:nth-child(even) > td{background:var(--t-zeb2)}
${H} body tbody tr:hover > td{background:var(--t-zebh)}
${H} body :is(.grade-mes > .celula-dia,.fundo-horas > .linha-hora,.coluna-horas > .hora-label):nth-child(odd){background:var(--t-zeb1)}
${H} body :is(.grade-mes > .celula-dia,.fundo-horas > .linha-hora,.coluna-horas > .hora-label):nth-child(even){background:var(--t-zeb2)}
${H} body .grade-mes > .celula-dia:hover{background:var(--t-zebh)}
${H} body .grade-mes > .celula-dia.hoje{background:var(--t-hoje)}
/* claro: barra de cima escura (letra clara) e menu lateral claro (letra escura) */
${L} #topbarSaga :is(.quick-search,.presence-btn,.icon-btn,.theme-toggle,.btn-topo,#cadeadoBtn){background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.20)!important;color:var(--t-brand)!important}
${L} #topbarSaga .quick-search input{color:var(--t-brand)!important}
${L} #topbarSaga .quick-search input::placeholder{color:var(--t-topmu)!important}
${L} #topbarSaga :is(.quick-search svg,.icon-btn svg,.theme-toggle svg,.presence-btn,.presence-btn span,#cadeadoBtn svg){color:var(--t-brand)!important}
${L} #sidebarSaga{border-right:1px solid var(--t-latb)!important}
${L} #sidebarSaga .nav-item:hover{background:var(--t-hover)!important}
${L} #sidebarSaga :is(.nav-item.active,.nav-item.ativo){background:var(--t-ativobg)!important;font-weight:600}
${L} :is(.panel,.card,.modal,.modal-box){background-color:var(--panel)}
`;
const INI='/* ===== PALETAS NOVAS (19/11/2026, Dr. Victor) — gerado por ferramentas/gerar_paletas.js: não editar à mão ===== */';
const FIM='/* ===== fim das PALETAS NOVAS ===== */';
const bloco=INI+'\n'+out.join('\n')+'\n'+regras.trim()+'\n'+FIM;
console.log(rel.join('\n'));
console.log('\nSAGA_FUNDOS/FUNDOS: '+PALETAS.map(P=>P.id+":['"+P.res.escuro+"','"+P.res.claro+"']").join(','));
console.log('AMOSTRAS: '+PALETAS.map(P=>P.id+':'+JSON.stringify(P.res.amostra).replace(/"/g,"'")).join(','));
console.log('SEMENTES: '+PALETAS.map(P=>"'vidro-"+P.id+"':{cor:'"+P.res.semente+"'}").join(','));
if(process.argv.includes('--gravar')){
  const f=path.join(__dirname,'..','saga_tema.css');const antes=fs.readFileSync(f,'utf8');
  let novo;const i=antes.indexOf(INI),j=antes.indexOf(FIM);
  if(i>=0&&j>i)novo=antes.slice(0,i)+bloco+antes.slice(j+FIM.length);else novo=antes.replace(/\s*$/,'\n\n')+bloco+'\n';
  if(novo.length<antes.length*0.9)throw new Error('o saga_tema.css encolheu demais: nada gravado');
  fs.writeFileSync(f,novo);console.log('gravado: '+antes.length+' -> '+novo.length+' bytes');
}
