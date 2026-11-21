// Gera o PDF do POP (manual/POP_SAGA_ADV.pdf) a partir de manual/conteudo.js, com o modelo manual/pop_pdf.html.
// Uso (na pasta do repositório): node ferramentas/gerar_pop.js
// Precisa do Playwright com o Chromium. Sobe um servidor local só para isso e fecha no fim.
// Rode de novo sempre que mudar o manual/conteudo.js ou os prints (manual/img).
// Tamanho (22/11): os prints (1800-1920 px) vão para o PDF diminuídos para LARGURA_PDF px e JPEG QUALIDADE_PDF,
// só no PDF (os arquivos de manual/img não mudam). Na folha A4 isso dá ~160 dpi: lê bem e o PDF fica bem menor.
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const RAIZ=path.resolve(__dirname,'..');
const SAIDA=path.join(RAIZ,'manual','POP_SAGA_ADV.pdf');
const LARGURA_PDF=1000, QUALIDADE_PDF=0.72;
const MENORES=new Map(); // '/manual/img/x.jpg' -> Buffer (versão diminuída só para o PDF)
const TIPOS={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};

const servidor=http.createServer((req,res)=>{
  const caminho=decodeURIComponent(req.url.split('?')[0]);
  if(MENORES.has(caminho)&&!/[?&]original=1/.test(req.url)){res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(MENORES.get(caminho));return;}
  const arq=path.join(RAIZ,caminho);
  if(!arq.startsWith(RAIZ+path.sep)||!fs.existsSync(arq)||fs.statSync(arq).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':TIPOS[path.extname(arq)]||'application/octet-stream'});
  fs.createReadStream(arq).pipe(res);
});

(async()=>{
  await new Promise(ok=>servidor.listen(0,'127.0.0.1',ok));
  const porta=servidor.address().port;
  const navegador=await chromium.launch();
  try{
    // diminui os prints no próprio navegador (canvas), sem programa extra
    const reduz=await navegador.newPage();
    const imgs=fs.readdirSync(path.join(RAIZ,'manual','img')).filter(f=>/\.jpe?g$/i.test(f));
    await reduz.goto('http://127.0.0.1:'+porta+'/manual/img/'+imgs[0]+'?original=1'); // mesma origem: o canvas pode exportar
    let antes=0,depois=0;
    for(const f of imgs){
      const url='/manual/img/'+f;
      const b64=await reduz.evaluate(async([u,L,Q])=>{
        const im=new Image();im.src=u+'?original=1';await im.decode();
        if(im.naturalWidth<=L)return null;
        const c=document.createElement('canvas');c.width=L;c.height=Math.round(im.naturalHeight*L/im.naturalWidth);
        const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(im,0,0,c.width,c.height);
        return c.toDataURL('image/jpeg',Q).split(',')[1];
      },[url,LARGURA_PDF,QUALIDADE_PDF]);
      const orig=fs.statSync(path.join(RAIZ,'manual','img',f)).size;antes+=orig;
      if(b64){const buf=Buffer.from(b64,'base64');if(buf.length<orig){MENORES.set(url,buf);depois+=buf.length;continue;}}
      depois+=orig;
    }
    await reduz.close();
    console.log('Prints para o PDF: '+imgs.length+' ('+Math.round(antes/1024)+' KB -> '+Math.round(depois/1024)+' KB)');
    const pagina=await navegador.newPage();
    const erros=[];pagina.on('pageerror',e=>erros.push(String(e.message||e)));
    await pagina.goto('http://127.0.0.1:'+porta+'/manual/pop_pdf.html',{waitUntil:'networkidle'});
    await pagina.waitForFunction(()=>window.__popPronto===true,null,{timeout:60000});
    if(erros.length)throw new Error('Erro no modelo do PDF: '+erros.join(' | '));
    const faltando=await pagina.evaluate(()=>[].slice.call(document.images).filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')));
    if(faltando.length)throw new Error('Prints que não abriram: '+faltando.join(', '));
    await pagina.pdf({path:SAIDA,format:'A4',printBackground:true,preferCSSPageSize:true});
    const kb=Math.round(fs.statSync(SAIDA).size/1024);
    console.log('PDF gerado: '+path.relative(RAIZ,SAIDA)+' ('+kb+' KB)');
  }finally{
    await navegador.close();servidor.close();
  }
})().catch(e=>{console.error(e.message||e);process.exit(1);});
