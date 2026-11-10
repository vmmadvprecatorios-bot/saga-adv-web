// Gera o PDF do POP (manual/POP_SAGA_ADV.pdf) a partir de manual/conteudo.js, com o modelo manual/pop_pdf.html.
// Uso (na pasta do repositório): node ferramentas/gerar_pop.js
// Precisa do Playwright com o Chromium. Sobe um servidor local só para isso e fecha no fim.
// Rode de novo sempre que mudar o manual/conteudo.js ou os prints (manual/img).
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const RAIZ=path.resolve(__dirname,'..');
const SAIDA=path.join(RAIZ,'manual','POP_SAGA_ADV.pdf');
const TIPOS={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};

const servidor=http.createServer((req,res)=>{
  const caminho=decodeURIComponent(req.url.split('?')[0]);
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
