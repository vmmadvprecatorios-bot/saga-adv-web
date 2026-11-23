/* =====================================================================
   SAGA · Teses e oportunidades > Base única > Listagens (bloco 422; 23/11/2026, Dr. Victor pelo Diário 5)
   PORTA DE ENTRADA das listagens achadas em processos (servidores, pensionistas, exequentes, precatórios),
   de qualquer órgão, esfera e UF. O ARQUIVO É LIDO NESTE COMPUTADOR e nunca sobe: PDF (texto ou escaneado,
   pelo SagaLeitorDocs), foto/print, Excel (.xlsx), CSV ou texto colado. Só os DADOS de cada linha vão
   para o banco.
   Passos: 1) de onde veio a listagem (processo, órgão, esfera, UF...); 2) ler o arquivo; 3) revisar as
   linhas; 4) "Conferir com a base" mostra quantas são pessoas NOVAS, JÁ EXISTENTES e A CONFERIR antes de
   gravar (base_listagem_previa, não grava nada); 5) "Gravar" em lotes (base_listagem_gravar), cada linha
   ligada à pessoa pela base_ligar_fonte: só complementa, nunca sobrescreve; sem CPF = a conferir.
   Listagem grande (mais de 2.000 linhas) só se grava das 22h às 6h de Maceió (regra do Diário, 23/11).
   SÓ o administrador geral (o banco recusa os outros). CPF sempre mascarado na tela.
   ===================================================================== */
(function(global){
  'use strict';
  var L={el:null,abrirPessoa:null,lista:null,passo:'lista',meta:null,arq:null,linhas:[],previa:null,pag:1,filtro:'',
    gravando:false,gravadas:0,listagemId:null,tabela:null,mapa:null,lendo:false};
  var LIM=50,LOTE_PREVIA=3000,LOTE_GRAVAR=300,GRANDE=2000;
  var TIPOS={servidores:'Servidores',pensionistas:'Pensionistas',exequentes:'Exequentes / autores',precatorios:'Precatórios e RPVs',outra:'Outra'};
  var ESFERAS={federal:'Federal',estadual:'Estadual',municipal:'Municipal'};
  var UFS=['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  var CAMPOS={'':'(não usar)',nome:'Nome',doc:'CPF ou CNPJ',cpf6:'CPF parcial (6 dígitos do meio)',matricula:'Matrícula',orgao:'Órgão',cargo:'Cargo',uf:'UF',
    numero_precatorio:'Nº do precatório/RPV',numero_processo:'Nº do processo',ano:'Ano',valor:'Valor (R$)',natureza:'Natureza'};
  var ST={nova:'Pessoa nova',existe:'Já existe',conferir:'A conferir'};
  var QUAL={completa:'nome e documento',so_cpf:'só documento',so_nome:'só nome',conferir:'conferir'};

  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erroTxt(e){return global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e));}
  function erro(e){
    var t=erroTxt(e);
    if(e&&(e.code==='PGRST202'||e.code==='42883'||e.code==='42P01'||/could not find the function|does not exist/i.test(e.message||'')))
      t='a porta das listagens ainda não está no banco (bloco 422 por aplicar). Detalhe: '+t;
    return esc(t);
  }
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function $(id){return document.getElementById(id);}
  function sb(){return global._sb;}
  function dig(v){return String(v==null?'':v).replace(/\D/g,'');}
  function dataHora(d){if(!d)return '';try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return d;}}
  function dataBR(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));return m?m[3]+'/'+m[2]+'/'+m[1]:'';}
  function reais(v){return v==null||v===''?'':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function versao(){var s=document.querySelector('script[src*="saga_ui.js"]');var m=s&&/\?v=(\d+)/.exec(s.getAttribute('src'));return m?m[1]:'';}
  function script(arq,glob){return new Promise(function(ok,falha){if(global[glob])return ok(global[glob]);var s=document.createElement('script');s.src=arq+(versao()?'?v='+versao():'');s.onload=function(){global[glob]?ok(global[glob]):falha(new Error('não carregou '+arq));};s.onerror=function(){falha(new Error('não carregou '+arq));};document.head.appendChild(s);});}
  function horaMaceio(){try{return +new Date().toLocaleString('en-US',{timeZone:'America/Maceio',hour:'2-digit',hour12:false})%24;}catch(e){return new Date().getHours();}}
  function noturno(){var h=horaMaceio();return h>=22||h<6;}

  /* ---------- documentos ---------- */
  function cpfValido(d){
    if(!/^\d{11}$/.test(d)||/^(\d)\1{10}$/.test(d))return false;
    for(var t=9;t<11;t++){var s=0;for(var i=0;i<t;i++)s+=(+d[i])*(t+1-i);var r=(s*10)%11%10;if(r!==+d[t])return false;}
    return true;
  }
  function cnpjValido(d){
    if(!/^\d{14}$/.test(d)||/^(\d)\1{13}$/.test(d))return false;
    function dv(n){var p=n===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];var s=0;for(var i=0;i<n;i++)s+=(+d[i])*p[i];var r=s%11;return r<2?0:11-r;}
    return dv(12)===+d[12]&&dv(13)===+d[13];
  }
  function mascaraDoc(l){
    if(l.cnpj)return global.sagaFmt?global.sagaFmt.cpf(l.cnpj):l.cnpj;
    var c6=l.cpf?l.cpf.slice(3,9):l.cpf6;
    return c6?'***.'+c6.slice(0,3)+'.'+c6.slice(3)+'-**':'';
  }
  /* põe o documento lido no lugar certo; CPF/CNPJ com dígito errado não vai (fica em dados.doc_lido e a linha vai "a conferir") */
  function porDoc(l,bruto){
    var d=dig(bruto);if(!d)return;
    if(d.length<=11&&d.length>=9){d=('00'+d).slice(-11);}
    if(d.length===11){if(cpfValido(d)){l.cpf=d;}else{l.dados.doc_lido=bruto;l.qualidade='conferir';l.problema='CPF com dígito errado';}}
    else if(d.length===14){if(cnpjValido(d)){l.cnpj=d;}else{l.dados.doc_lido=bruto;l.qualidade='conferir';l.problema='CNPJ com dígito errado';}}
    else{l.dados.doc_lido=bruto;l.qualidade='conferir';l.problema='documento incompleto';}
  }
  function valorBR(v){
    if(typeof v==='number')return isFinite(v)?Math.round(v*100)/100:null;
    var s=String(v||'').replace(/[R$\s]/g,'');if(!s)return null;
    if(/,\d{1,2}$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    var n=parseFloat(s);return isFinite(n)?Math.round(n*100)/100:null;
  }
  function novaLinha(pagina){return {usar:true,pagina:pagina||null,nome:'',cpf:null,cnpj:null,cpf6:null,dados:{},qualidade:'',problema:''};}
  function fecharLinha(l){
    l.nome=String(l.nome||'').replace(/\s+/g,' ').trim();
    if(!l.qualidade)l.qualidade=l.nome&&(l.cpf||l.cnpj)?'completa':(l.nome?(l.cpf6?'completa':'so_nome'):'so_cpf');
    return l;
  }

  /* ---------- leitura de TEXTO (PDF, print, texto colado) ---------- */
  var RX_CNJ=/\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g;
  var RX_CNPJ=/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{14}\b/;
  var RX_CPF=/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{3}\s\d{3}\s\d{3}\s\d{2}\b|(?<!\d)\d{11}(?!\d)/;
  var RX_CPF6=/[*xX•]{3}\.?(\d{3})\.?(\d{3})-?[*xX•]{2}/;
  var RX_VALOR=/(?:R\$\s?)?\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g;
  var RX_NOME=/[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'´`]+(?:\s+(?:d[aeo]s?|e|[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'´`]+)){1,9}/g;
  var CABEC=/^(nome|cpf|cnpj|cep|uf|identidade|rg|matr[ií]cula|p[áa]gina|benefici[áa]rio|servidor|rela[çc][ãa]o|listagem|total|ministério|poder judici|justiça federal|processo)\b/i;
  function nomeDaLinha(t){
    var m=t.match(RX_NOME);if(!m)return '';
    var melhor=m.map(function(s){return s.trim();}).filter(function(s){return s.split(/\s+/).length>=2&&!CABEC.test(s);})
      .sort(function(a,b){return b.length-a.length;})[0]||'';
    melhor=melhor.split(/\s+/).filter(function(w){return !/^(PRC|RPV|CPF|CNPJ|CEP|RG|UF|N[º°O]?)$/i.test(w);}).join(' ');
    while(/\s(d[aeo]s?|e)$/i.test(melhor))melhor=melhor.replace(/\s\S+$/,'');
    return melhor.split(' ').length>=2&&melhor.length>=6?melhor:'';
  }
  function linhasDoTexto(paginas,juntar){
    var out=[],pend=null;
    function soltar(){if(pend){out.push(fecharLinha(pend));pend=null;}}
    (paginas||[]).forEach(function(pg){
      String(pg.texto||'').split(/\r?\n/).forEach(function(raw){
        var t=raw.replace(/\s+/g,' ').trim();if(t.length<3)return;
        var l=novaLinha(pg.n),resto=t,m;
        var cnjs=resto.match(RX_CNJ);if(cnjs){l.dados.processos_citados=cnjs.slice(0,3);l.numero_processo=dig(cnjs[0]);resto=resto.replace(RX_CNJ,' ');}
        if((m=resto.match(RX_CNPJ))){porDoc(l,m[0]);resto=resto.replace(m[0],' ');}
        else if((m=resto.match(RX_CPF))){porDoc(l,m[0]);resto=resto.replace(m[0],' ');}
        else if((m=resto.match(RX_CPF6))){l.cpf6=m[1]+m[2];resto=resto.replace(m[0],' ');}
        var vs=resto.match(RX_VALOR);if(vs){l.valor=valorBR(vs[vs.length-1]);resto=resto.replace(RX_VALOR,' ');}
        var prc=/(?:PRC|RPV|precat[óo]rio)\s*(?:n[º°o.]*\s*)?([\w./-]{4,})/i.exec(resto);if(prc)l.numero_precatorio=prc[1];
        var cep=/\b\d{5}-?\d{3}\b/.exec(resto);if(cep){l.dados.cep=dig(cep[0]);}
        var uf=/\b([A-Z]{2})\b(?=\s+\d{5}-?\d{3}|\s*$)/.exec(resto);if(uf&&UFS.indexOf(uf[1])>=0){l.uf=uf[1];resto=resto.slice(0,uf.index)+' '+resto.slice(uf.index+2);}
        if(prc)resto=resto.replace(prc[0],' ');
        l.nome=nomeDaLinha(resto);
        var temDoc=!!(l.cpf||l.cnpj||l.cpf6||l.dados.doc_lido);
        if(!l.nome&&!temDoc)return;
        if(l.nome&&temDoc){soltar();out.push(fecharLinha(l));}
        else if(l.nome){soltar();pend=l;}
        else{
          if(juntar&&pend){
            pend.cpf=l.cpf;pend.cnpj=l.cnpj;pend.cpf6=l.cpf6;pend.dados=Object.assign(pend.dados,l.dados);
            pend.valor=pend.valor||l.valor;pend.qualidade='conferir';pend.problema=(l.problema?l.problema+'; ':'')+'nome e documento em linhas seguidas';
            out.push(fecharLinha(pend));pend=null;
          }else{soltar();out.push(fecharLinha(l));}
        }
      });
    });
    soltar();
    return out;
  }

  /* ---------- leitura de TABELA (Excel, CSV) ---------- */
  function csvLinhas(txt){
    var pri=String(txt).split(/\r?\n/).slice(0,5).join('\n');
    var sep=[';','\t',','].map(function(s){return [s,(pri.split(s).length)];}).sort(function(a,b){return b[1]-a[1];})[0][0];
    var linhas=[],cel='',lin=[],aspas=false;
    for(var i=0;i<txt.length;i++){
      var c=txt[i];
      if(aspas){if(c==='"'){if(txt[i+1]==='"'){cel+='"';i++;}else aspas=false;}else cel+=c;}
      else if(c==='"')aspas=true;
      else if(c===sep){lin.push(cel);cel='';}
      else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;lin.push(cel);linhas.push(lin);lin=[];cel='';}
      else cel+=c;
    }
    if(cel||lin.length){lin.push(cel);linhas.push(lin);}
    return linhas.filter(function(l){return l.some(function(x){return String(x).trim();});});
  }
  function adivinhar(cab){
    var h=String(cab||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    if(/cpf.*cnpj|cnpj.*cpf|documento/.test(h))return 'doc';
    if(/cpf|cnpj/.test(h))return 'doc';
    if(/nome|benefici|credor|servidor|exequente|autor|titular/.test(h))return 'nome';
    if(/matr|siape/.test(h))return 'matricula';
    if(/orgao|lotac|entidade|devedor/.test(h))return 'orgao';
    if(/cargo|funcao/.test(h))return 'cargo';
    if(/^uf$|estado/.test(h))return 'uf';
    if(/precat|prc|rpv|requisi|oficio/.test(h))return 'numero_precatorio';
    if(/processo|autos/.test(h))return 'numero_processo';
    if(/^ano|exercicio|orcament/.test(h))return 'ano';
    if(/valor|montante|total|bruto|liquido/.test(h))return 'valor';
    if(/natureza/.test(h))return 'natureza';
    return '';
  }
  function acharCabecalho(rows){
    for(var i=0;i<Math.min(rows.length,15);i++){var n=rows[i].filter(function(c){return adivinhar(c);}).length;if(n>=2)return i;}
    return -1;
  }
  function linhasDaTabela(t){
    var out=[];
    t.rows.forEach(function(r,i){
      if(i<=t.cab)return;
      var l=novaLinha(null);l.dados={linha_planilha:i+1};
      t.mapa.forEach(function(campo,j){
        var v=r[j]==null?'':String(r[j]).trim();if(!campo||!v)return;
        if(campo==='nome')l.nome=v;
        else if(campo==='doc'){if(!l.cpf&&!l.cnpj)porDoc(l,v);}
        else if(campo==='cpf6'){var d=dig(v);if(d.length===11&&cpfValido(d))l.cpf=d;else if(d.length===6)l.cpf6=d;else{l.dados.doc_lido=v;l.problema='CPF parcial sem os 6 dígitos do meio';}}
        else if(campo==='valor')l.valor=valorBR(r[j]);
        else if(campo==='ano'){var a=parseInt(dig(v).slice(0,4),10);if(a>1900&&a<2100)l.ano=a;}
        else if(campo==='uf'){var u=v.toUpperCase();if(UFS.indexOf(u)>=0)l.uf=u;}
        else if(campo==='numero_processo')l.numero_processo=dig(v);
        else l[campo]=v;
      });
      if(!l.nome&&!l.cpf&&!l.cnpj&&!l.cpf6&&!l.dados.doc_lido)return;
      out.push(fecharLinha(l));
    });
    return out;
  }
  async function lerPlanilha(arquivo){
    if(/\.csv$/i.test(arquivo.name)||/text\/csv/.test(arquivo.type)){var txt=await arquivo.text();return {abas:['CSV'],rowsPorAba:[csvLinhas(txt)]};}
    await script('vendor/exceljs-4.4.0/exceljs.min.js','ExcelJS');
    var wb=new global.ExcelJS.Workbook();await wb.xlsx.load(await arquivo.arrayBuffer());
    var abas=[],rows=[];
    wb.eachSheet(function(ws){
      var rs=[];ws.eachRow({includeEmpty:false},function(row){var a=[];row.eachCell({includeEmpty:true},function(c,col){var v=c.value;
        if(v&&typeof v==='object'){v=v.result!=null?v.result:(v.text!=null?v.text:(v.richText?v.richText.map(function(x){return x.text;}).join(''):(v instanceof Date?v.toISOString().slice(0,10):c.text)));}
        a[col-1]=v;});rs.push(a);});
      abas.push(ws.name);rows.push(rs);
    });
    return {abas:abas,rowsPorAba:rows};
  }
  async function impressaoDigital(arquivo){
    try{var h=await crypto.subtle.digest('SHA-256',await arquivo.arrayBuffer());return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}catch(e){return null;}
  }

  /* ---------- tela ---------- */
  var CSS=`
#aba-base-unica .bl-passos{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;font-size:11.5px;color:var(--muted)}
#aba-base-unica .bl-passos span{border:1px solid var(--border-soft);border-radius:999px;padding:2px 10px}
#aba-base-unica .bl-passos span.on{border-color:var(--gold);color:var(--text)}
#aba-base-unica .bl-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px 10px;margin-bottom:10px}
#aba-base-unica .bl-grade label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--muted)}
#aba-base-unica .bl-grade label.largo{grid-column:1/-1}
#aba-base-unica .bl-zona{border:1px dashed var(--border);border-radius:12px;padding:16px;text-align:center;color:var(--muted);font-size:12.5px;margin-bottom:10px;transition:border-color .25s cubic-bezier(.22,.78,.25,1)}
#aba-base-unica .bl-zona.sobre{border-color:var(--gold)}
#aba-base-unica .bl-zona textarea{width:100%;min-height:110px;margin-top:10px;font:inherit;font-size:12px}
#aba-base-unica .bl-prog{font-size:12px;color:var(--muted);margin:6px 0}
#aba-base-unica .bl-barra{height:6px;border-radius:99px;background:var(--border-soft);overflow:hidden;margin:6px 0}
#aba-base-unica .bl-barra i{display:block;height:100%;width:0;background:var(--gold);transition:width .3s cubic-bezier(.22,.78,.25,1)}
#aba-base-unica .bl-st{display:inline-block;border-radius:999px;padding:1px 8px;font-size:10.5px;border:1px solid var(--border-soft);white-space:nowrap}
#aba-base-unica .bl-st.nova{border-color:var(--gold);color:var(--gold)}
#aba-base-unica .bl-st.conferir{border-color:#c98500;color:#c98500}
#aba-base-unica .bl-prob{color:#c98500;font-size:10.5px;display:block}
#aba-base-unica .bl-tab input[type=text]{width:100%;min-width:160px}
#aba-base-unica tr.bl-fora td{opacity:.45}
#aba-base-unica .bl-mapa{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px 10px;margin:8px 0}
#aba-base-unica .bl-mapa label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--muted);min-width:0}
#aba-base-unica .bl-mapa label span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#aba-base-unica .bl-botoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
@media(max-width:700px){#aba-base-unica .bl-grade{grid-template-columns:1fr}#aba-base-unica .bl-tab input[type=text]{min-width:0}}
@media(prefers-reduced-motion:reduce){#aba-base-unica .bl-barra i,#aba-base-unica .bl-zona{transition:none}}
`;
  function estilos(){if($('sagaBaseListagensCss'))return;var s=document.createElement('style');s.id='sagaBaseListagensCss';s.textContent=CSS;document.head.appendChild(s);}
  function msg(h,tipo){var w=$('blMsg');if(!w)return;w.className='bu-aviso'+(tipo==='erro'?' verm':tipo==='amar'?' amar':'');w.innerHTML=h;w.hidden=!h;}
  function entrar(){var c=L.el;if(!c||parado())return;c.classList.add('entrando');requestAnimationFrame(function(){requestAnimationFrame(function(){c.classList.remove('entrando');});});}
  function opc(obj,atual,vazio){return (vazio!=null?'<option value="">'+esc(vazio)+'</option>':'')+Object.keys(obj).map(function(k){return '<option value="'+esc(k)+'"'+(k===atual?' selected':'')+'>'+esc(obj[k])+'</option>';}).join('');}
  function passos(at){
    var P=[['meta','1. De onde veio'],['ler','2. Ler o arquivo'],['revisar','3. Revisar e conferir'],['fim','4. Gravado']];
    return '<div class="bl-passos" aria-label="Passos">'+P.map(function(p){return '<span class="'+(p[0]===at?'on':'')+'">'+p[1]+'</span>';}).join('')+'</div>';
  }

  /* ----- 0. lista das listagens já importadas ----- */
  async function telaLista(){
    L.passo='lista';var c=L.el;
    c.innerHTML='<div class="bu-aviso" id="blMsg" hidden></div><div class="bu-bloco"><div class="bu-filtros"><h3 style="margin:0">Listagens importadas</h3><div class="bu-acoes"><button class="btn" type="button" id="blNova">+ Nova listagem</button></div></div>'+
      '<p class="sub">Listagem achada num processo (servidores, pensionistas, exequentes, precatórios), de qualquer órgão, esfera ou UF. O arquivo é lido neste computador e não sobe: só os dados de cada linha vão para a Base única, sem repetir pessoa (só completa o que falta; sem CPF fica "a conferir").</p>'+
      '<div id="blLista"><div class="bu-vazio">Carregando…</div></div></div>';
    entrar();
    $('blNova').onclick=function(){L.meta=null;L.linhas=[];L.previa=null;L.arq=null;L.listagemId=null;L.gravadas=0;telaMeta();};
    var r=await sb().rpc('base_listagens_listar');
    var w=$('blLista');if(!w)return;
    if(r.error){w.innerHTML='<div class="bu-aviso verm">Não deu para listar: '+erro(r.error)+'</div>';return;}
    L.lista=r.data||[];
    if(!L.lista.length){w.innerHTML='<div class="bu-vazio">Nenhuma listagem importada ainda.</div>';return;}
    w.innerHTML='<div class="bu-rolagem"><table class="bu-tab"><thead><tr><th>Listagem</th><th>Processo</th><th>Órgão · esfera · UF</th><th>Linhas</th><th>Importada</th><th></th></tr></thead><tbody>'+
      L.lista.map(function(l){
        return '<tr><td data-r="Listagem"><b>'+esc(l.titulo)+'</b><span class="bu-sub">'+esc(TIPOS[l.tipo]||l.tipo)+(l.paginas?' · páginas '+esc(l.paginas):'')+(l.arquivo_nome?' · '+esc(l.arquivo_nome):'')+'</span></td>'+
          '<td data-r="Processo" class="n">'+esc(l.processo?(global.sagaFmt?global.sagaFmt.cnj(l.processo):l.processo):'')+(l.tribunal?'<span class="bu-sub">'+esc(l.tribunal)+'</span>':'')+(l.data_juntada?'<span class="bu-sub">juntada em '+esc(dataBR(l.data_juntada))+(l.juntada_por?' por '+esc(l.juntada_por):'')+'</span>':'')+'</td>'+
          '<td data-r="Órgão">'+esc(l.orgao||'')+(l.esfera?' · '+esc(ESFERAS[l.esfera]||l.esfera):'')+(l.uf?' · '+esc(l.uf):'')+(l.municipio?' · '+esc(l.municipio):'')+'</td>'+
          '<td data-r="Linhas" class="n">'+num(l.linhas)+'<span class="bu-sub">'+num(l.novas)+' novas · '+num(l.existentes)+' já existiam · '+num(l.conferir)+' a conferir</span></td>'+
          '<td data-r="Importada">'+esc(dataHora(l.criado_em))+(l.por?'<span class="bu-sub">'+esc(l.por)+'</span>':'')+'</td>'+
          '<td><button class="btn sec" type="button" data-ver-lst="'+(+l.id)+'">Ver linhas</button></td></tr>';
      }).join('')+'</tbody></table></div>';
    w.onclick=function(e){var b=e.target.closest('[data-ver-lst]');if(b)verLinhas(+b.dataset.verLst,1);};
  }
  async function verLinhas(id,pag){
    var l=(L.lista||[]).find(function(x){return +x.id===id;})||{titulo:'Listagem'};
    var w=$('blLista');if(!w)return;
    w.innerHTML='<div class="bu-vazio">Carregando as linhas…</div>';
    var r=await sb().rpc('base_listagem_linhas_ver',{p_listagem:id,p_pagina:pag,p_limite:LIM});
    if(r.error){w.innerHTML='<div class="bu-aviso verm">Não deu para ver as linhas: '+erro(r.error)+'</div>';return;}
    var d=r.data||{},tot=+d.total||0,np=Math.max(1,Math.ceil(tot/LIM));
    w.innerHTML='<div class="bu-filtros"><button class="btn sec" type="button" id="blVoltarLista">← Listagens</button><b>'+esc(l.titulo)+'</b><span class="bu-sub">'+num(tot)+' linhas</span></div>'+
      '<div class="bu-rolagem"><table class="bu-tab"><thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Precatório · valor</th><th>Leitura</th><th>Ligada</th></tr></thead><tbody>'+
      (d.linhas||[]).map(function(x){return '<tr><td data-r="Nome">'+(x.base_id?'<button type="button" class="bu-nome" data-pessoa="'+(+x.base_id)+'">'+esc(x.nome||'(sem nome)')+'</button>':esc(x.nome||'(sem nome)'))+(x.pagina?'<span class="bu-sub">página '+esc(x.pagina)+'</span>':'')+'</td>'+
        '<td data-r="CPF/CNPJ" class="n">'+esc(x.doc||'')+'</td><td data-r="Precatório">'+esc(x.numero_precatorio||'')+(x.valor!=null?' '+esc(reais(x.valor)):'')+(x.orgao?'<span class="bu-sub">'+esc(x.orgao)+'</span>':'')+'</td>'+
        '<td data-r="Leitura">'+esc(QUAL[x.qualidade]||x.qualidade||'')+'</td><td data-r="Ligada">'+esc({cpf:'pelo CPF',cnpj:'pelo CNPJ',nome_cpf6:'nome + 6 dígitos',codigo_portal:'código do Portal',nova:'pessoa nova',manual:'à mão'}[x.como]||x.como||'')+'</td></tr>';}).join('')+
      '</tbody></table></div><div class="bu-pag">Página '+pag+' de '+np+' <button class="btn sec" type="button" id="blAnt"'+(pag<=1?' disabled':'')+'>Anterior</button><button class="btn sec" type="button" id="blProx"'+(pag>=np?' disabled':'')+'>Próxima</button></div>';
    $('blVoltarLista').onclick=telaLista;
    $('blAnt').onclick=function(){verLinhas(id,pag-1);};$('blProx').onclick=function(){verLinhas(id,pag+1);};
  }

  /* ----- 1. de onde veio ----- */
  function telaMeta(){
    L.passo='meta';var m=L.meta||{tipo:'servidores',esfera:'federal'};
    L.el.innerHTML='<div class="bu-aviso" id="blMsg" hidden></div>'+passos('meta')+'<div class="bu-bloco"><h3>De onde veio esta listagem</h3>'+
      '<p class="sub">Isso fica guardado junto de cada pessoa (a fonte). Só o título é obrigatório.</p>'+
      '<div class="bl-grade">'+
      '<label class="largo">Título *<input type="text" id="blTitulo" maxlength="160" value="'+esc(m.titulo||'')+'" placeholder="Ex.: Servidores federais em AL juntados pela União (SINTSEP/AL)"></label>'+
      '<label>Tipo<select id="blTipo">'+opc(TIPOS,m.tipo)+'</select></label>'+
      '<label>Esfera<select id="blEsfera">'+opc(ESFERAS,m.esfera,'(não sei)')+'</select></label>'+
      '<label>Processo<input type="text" id="blProcesso" inputmode="numeric" value="'+esc(m.processo?(global.sagaFmt?global.sagaFmt.cnj(m.processo):m.processo):'')+'" placeholder="0000000-00.0000.0.00.0000"></label>'+
      '<label>Tribunal / vara<input type="text" id="blTribunal" value="'+esc(m.tribunal||'')+'" placeholder="Ex.: TRF5 · 3ª Vara Federal de AL"></label>'+
      '<label>Órgão<input type="text" id="blOrgao" value="'+esc(m.orgao||'')+'" placeholder="Ex.: União, INSS, Estado de AL"></label>'+
      '<label>UF<select id="blUf"><option value="">(todas / não sei)</option>'+UFS.map(function(u){return '<option'+(u===m.uf?' selected':'')+'>'+u+'</option>';}).join('')+'</select></label>'+
      '<label>Município<input type="text" id="blMunicipio" value="'+esc(m.municipio||'')+'"></label>'+
      '<label>Data da juntada<input type="text" id="blData" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa" value="'+esc(m.data_br||'')+'"></label>'+
      '<label>Juntada por<input type="text" id="blJuntada" value="'+esc(m.juntada_por||'')+'" placeholder="Ex.: União (AGU)"></label>'+
      '<label class="largo">Observação<input type="text" id="blObs" maxlength="500" value="'+esc(m.observacao||'')+'"></label>'+
      '</div><div class="bl-botoes"><button class="btn sec" type="button" id="blCancelar">Cancelar</button><button class="btn" type="button" id="blSeguir">Seguir: ler o arquivo</button></div></div>';
    entrar();
    $('blProcesso').oninput=function(){var d=dig(this.value).slice(0,20),p='#######-##.####.#.##.####',r='',i=0;for(var k=0;k<p.length&&i<d.length;k++)r+=p[k]==='#'?d[i++]:p[k];this.value=r;};
    $('blData').oninput=function(){var d=dig(this.value).slice(0,8);this.value=d.length>4?d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4):d.length>2?d.slice(0,2)+'/'+d.slice(2):d;};
    $('blCancelar').onclick=telaLista;
    $('blSeguir').onclick=function(){
      var t=$('blTitulo').value.trim();if(!t){msg('Dê um título à listagem.','amar');$('blTitulo').focus();return;}
      var db=$('blData').value.trim(),iso=null;
      if(db){var mm=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(db);var dt=mm&&new Date(+mm[3],+mm[2]-1,+mm[1]);
        if(!mm||dt.getDate()!==+mm[1]||dt.getMonth()!==+mm[2]-1){msg('A data da juntada não existe: confira (dd/mm/aaaa).','amar');$('blData').focus();return;}
        iso=mm[3]+'-'+mm[2]+'-'+mm[1];}
      var pr=dig($('blProcesso').value);if(pr&&pr.length!==20){msg('O número do processo precisa ter 20 dígitos (ou fique em branco).','amar');$('blProcesso').focus();return;}
      L.meta={titulo:t,tipo:$('blTipo').value,esfera:$('blEsfera').value,processo:pr,tribunal:$('blTribunal').value.trim(),orgao:$('blOrgao').value.trim(),
        uf:$('blUf').value,municipio:$('blMunicipio').value.trim(),data_juntada:iso,data_br:db,juntada_por:$('blJuntada').value.trim(),observacao:$('blObs').value.trim()};
      telaLer();
    };
  }

  /* ----- 2. ler o arquivo ----- */
  function telaLer(){
    L.passo='ler';
    L.el.innerHTML='<div class="bu-aviso" id="blMsg" hidden></div>'+passos('ler')+'<div class="bu-bloco"><h3>Ler o arquivo</h3>'+
      '<p class="sub">PDF (com texto ou escaneado), foto/print, Excel (.xlsx), CSV ou texto colado. A leitura é feita neste computador: o arquivo não sai daqui e não fica guardado em lugar nenhum. PDF escaneado é lido página por página (pode levar alguns minutos).</p>'+
      '<div class="bl-zona" id="blZona">Solte o arquivo aqui ou <button class="btn sec" type="button" id="blEscolher">Escolher arquivo</button>'+
      '<input type="file" id="blArq" hidden accept=".pdf,.xlsx,.csv,.txt,image/*,application/pdf">'+
      '<div class="bl-grade" style="margin-top:10px;text-align:left"><label>PDF: ler a partir da página<input type="text" id="blDe" inputmode="numeric" placeholder="1"></label><label>até a página<input type="text" id="blAte" inputmode="numeric" placeholder="última"></label>'+
      '<label class="largo" style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="blJuntar" checked> Juntar nome e CPF que vieram em linhas seguidas (essas linhas ficam "a conferir")</label></div>'+
      '<textarea id="blTexto" placeholder="…ou cole aqui o texto da listagem (uma pessoa por linha)"></textarea></div>'+
      '<div class="bl-prog" id="blProg" hidden></div><div id="blTabela"></div>'+
      '<div class="bl-botoes"><button class="btn sec" type="button" id="blVoltar">← Voltar</button><button class="btn" type="button" id="blLerTexto">Ler o texto colado</button></div></div>';
    entrar();
    var inp=$('blArq'),zona=$('blZona');
    $('blEscolher').onclick=function(){inp.click();};
    inp.onchange=function(){if(inp.files[0])lerArquivo(inp.files[0]);inp.value='';};
    zona.ondragover=function(e){e.preventDefault();zona.classList.add('sobre');};
    zona.ondragleave=function(){zona.classList.remove('sobre');};
    zona.ondrop=function(e){e.preventDefault();zona.classList.remove('sobre');var f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)lerArquivo(f);};
    $('blVoltar').onclick=telaMeta;
    $('blLerTexto').onclick=function(){
      var t=$('blTexto').value;if(!t.trim()){msg('Cole o texto ou escolha um arquivo.','amar');return;}
      L.arq={nome:null,hash:null,paginas:null};
      L.linhas=linhasDoTexto([{n:null,texto:t}],$('blJuntar').checked);
      depoisDeLer('texto colado');
    };
  }
  function prog(t){var p=$('blProg');if(p){p.hidden=!t;p.textContent=t||'';}}
  async function lerArquivo(f){
    if(L.lendo)return;L.lendo=true;msg('');
    try{
      prog('Lendo '+f.name+'…');
      var hash=await impressaoDigital(f);
      L.arq={nome:f.name,hash:hash,paginas:null};
      if(/\.(xlsx|csv)$/i.test(f.name)||/spreadsheet|csv/.test(f.type)){
        var pl=await lerPlanilha(f);prog('');L.lendo=false;telaMapa(pl);return;
      }
      var Ld=await script('saga_leitor_docs.js','SagaLeitorDocs');
      var de=parseInt(dig($('blDe').value),10)||1,ate=parseInt(dig($('blAte').value),10)||100000;
      if(ate<de){msg('"Até a página" é menor que "a partir da página".','amar');L.lendo=false;prog('');return;}
      var r=await Ld.lerArquivo(f,{de:de,maxPaginas:ate,progresso:function(t){prog(f.name+': '+t);}});
      L.arq.paginas=(r.paginas.length?(r.paginas[0].n||de)+'-'+(r.paginas[r.paginas.length-1].n||de):'');
      L.arq.metodo=r.metodo;L.arq.total=r.total_paginas;
      L.linhas=linhasDoTexto(r.paginas,$('blJuntar').checked);
      prog('');
      depoisDeLer(f.name+(r.total_paginas?' · páginas '+L.arq.paginas+' de '+r.total_paginas:'')+(r.paginas_imagem?' · '+num(r.paginas_imagem)+' lidas pela imagem':''));
    }catch(e){prog('');msg('Não deu para ler o arquivo: '+esc(erroTxt(e))+'. Nada foi gravado.','erro');}
    L.lendo=false;
  }
  function telaMapa(pl){
    var w=$('blTabela');var ai=0;
    function montar(){
      var rows=pl.rowsPorAba[ai]||[],cab=acharCabecalho(rows),ncol=rows.reduce(function(m,r){return Math.max(m,r.length);},0);
      var cabs=cab>=0?rows[cab]:[];
      L.tabela={rows:rows,cab:cab,mapa:[]};
      for(var j=0;j<ncol;j++)L.tabela.mapa[j]=cab>=0?adivinhar(cabs[j]):'';
      var ex=rows.slice(cab+1,cab+4);
      w.innerHTML='<div class="bu-bloco" style="margin-top:10px"><h3>Qual coluna é o quê</h3><p class="sub">'+(cab>=0?'Cabeçalho achado na linha '+(cab+1)+'. ':'Não achei o cabeçalho: escolha as colunas. ')+'Confira e mude se precisar. A coluna "CPF ou CNPJ" aceita os dois.</p>'+
        (pl.abas.length>1?'<label class="bu-sub">Aba <select id="blAba">'+pl.abas.map(function(a,i){return '<option value="'+i+'"'+(i===ai?' selected':'')+'>'+esc(a)+'</option>';}).join('')+'</select></label>':'')+
        '<div class="bl-mapa">'+L.tabela.mapa.map(function(v,j){
          var amostra=ex.map(function(r){return r[j]==null?'':String(r[j]);}).filter(Boolean).slice(0,2).join(' · ');
          return '<label><span title="'+esc(cabs[j]||'')+'">'+esc(cabs[j]||('Coluna '+(j+1)))+'</span><select data-col="'+j+'">'+opc(CAMPOS,v)+'</select><span class="bu-sub">'+esc(amostra.slice(0,60))+'</span></label>';}).join('')+
        '</div><div class="bl-botoes"><button class="btn" type="button" id="blUsarMapa">Usar estas colunas</button></div></div>';
      if($('blAba'))$('blAba').onchange=function(){ai=+this.value;montar();};
      w.querySelectorAll('[data-col]').forEach(function(s){s.onchange=function(){L.tabela.mapa[+s.dataset.col]=s.value;};});
      $('blUsarMapa').onclick=function(){
        if(L.tabela.mapa.indexOf('nome')<0&&L.tabela.mapa.indexOf('doc')<0){msg('Escolha ao menos a coluna do nome ou a do CPF/CNPJ.','amar');return;}
        L.linhas=linhasDaTabela(L.tabela);depoisDeLer(L.arq.nome+(pl.abas.length>1?' · aba '+pl.abas[ai]:''));
      };
    }
    montar();
  }
  function depoisDeLer(origem){
    if(!L.linhas.length){msg('Não achei nenhuma pessoa nesse conteúdo (nome ou CPF). Confira o arquivo, as páginas ou as colunas.','amar');return;}
    L.arq.origem=origem;L.previa=null;L.pag=1;L.filtro='';telaRevisar();
  }

  /* ----- 3. revisar e conferir ----- */
  function contagem(){
    var c={total:0,usar:0,completa:0,so_cpf:0,so_nome:0,conferir:0,prob:0};
    L.linhas.forEach(function(l){c.total++;if(!l.usar)return;c.usar++;c[l.qualidade]=(c[l.qualidade]||0)+1;if(l.problema)c.prob++;});
    return c;
  }
  function visiveis(){
    return L.linhas.map(function(l,i){return [l,i];}).filter(function(p){
      var l=p[0],f=L.filtro;if(!f)return true;
      if(f==='prob')return !!l.problema;if(f==='fora')return !l.usar;
      if(/^st:/.test(f))return l.usar&&l.st===f.slice(3);
      return l.qualidade===f;
    });
  }
  function telaRevisar(){
    L.passo='revisar';var c=contagem(),pv=L.previa;
    var grande=c.usar>GRANDE,podeGravar=pv&&!L.gravando&&(!grande||noturno());
    L.el.innerHTML='<div class="bu-aviso" id="blMsg" hidden></div>'+passos('revisar')+
      '<div class="bu-aviso">Lido de <b>'+esc(L.arq.origem||'')+'</b>. Confira as linhas: corrija um nome, tire do lote o que não é pessoa. O CPF aparece mascarado; CPF ou CNPJ com dígito errado não é usado (a linha fica "a conferir").</div>'+
      '<div class="bu-nums">'+
        '<button type="button" class="bu-num" data-flt=""><b>'+num(c.usar)+'</b><span>linhas que vão ('+num(c.total)+' lidas)</span></button>'+
        '<button type="button" class="bu-num" data-flt="completa"><b>'+num(c.completa)+'</b><span>com nome e documento</span></button>'+
        '<button type="button" class="bu-num" data-flt="so_nome"><b>'+num(c.so_nome)+'</b><span>só com o nome</span></button>'+
        '<button type="button" class="bu-num" data-flt="so_cpf"><b>'+num(c.so_cpf)+'</b><span>só com o documento</span></button>'+
        '<button type="button" class="bu-num" data-flt="prob"><b>'+num(c.prob)+'</b><span>com aviso de leitura</span></button>'+
        (pv?'<button type="button" class="bu-num" data-flt="st:nova"><b>'+num(pv.novas)+'</b><span>pessoas novas na base</span></button>'+
          '<button type="button" class="bu-num" data-flt="st:existe"><b>'+num(pv.existentes)+'</b><span>já existem na base</span></button>'+
          '<button type="button" class="bu-num" data-flt="st:conferir"><b>'+num(pv.conferir)+'</b><span>a conferir</span></button>':'')+
      '</div>'+
      (pv?'':'<div class="bu-aviso amar">Antes de gravar, clique em <b>Conferir com a base</b>: mostra quem é novo, quem já existe e quem fica a conferir. Não grava nada.</div>')+
      (grande&&!noturno()?'<div class="bu-aviso amar">Listagem grande ('+num(c.usar)+' linhas): pela regra do Diário de 23/11, só se grava das <b>22h às 6h</b> de Maceió, para não pesar no banco durante o dia. A conferência pode ser feita agora.</div>':'')+
      '<div class="bu-bloco"><div class="bu-filtros"><select id="blFiltro" aria-label="Mostrar">'+
        opc({'':'Todas as linhas',completa:'Nome e documento',so_nome:'Só nome',so_cpf:'Só documento',conferir:'Leitura a conferir',prob:'Com aviso de leitura',fora:'Tiradas do lote','st:nova':'Pessoas novas','st:existe':'Já existem','st:conferir':'A conferir na base'},L.filtro)+
        '</select><div class="bu-acoes"><button class="btn sec" type="button" id="blVoltar">← Ler outro</button><button class="btn sec" type="button" id="blConferir"'+(L.gravando?' disabled':'')+'>Conferir com a base</button><button class="btn" type="button" id="blGravar"'+(podeGravar?'':' disabled')+'>Gravar '+num(c.usar)+' linhas</button></div></div>'+
        '<div class="bl-prog" id="blProg" hidden></div><div class="bl-barra" id="blBarra" hidden><i></i></div>'+
        '<div id="blLinhas"></div></div>';
    entrar();
    L.el.querySelectorAll('[data-flt]').forEach(function(b){b.onclick=function(){L.filtro=b.dataset.flt;L.pag=1;$('blFiltro').value=L.filtro;desenharLinhas();};});
    $('blFiltro').onchange=function(){L.filtro=this.value;L.pag=1;desenharLinhas();};
    $('blVoltar').onclick=telaLer;
    $('blConferir').onclick=conferir;
    $('blGravar').onclick=gravar;
    desenharLinhas();
  }
  function desenharLinhas(){
    var w=$('blLinhas');if(!w)return;
    var vs=visiveis(),np=Math.max(1,Math.ceil(vs.length/LIM));if(L.pag>np)L.pag=np;
    var pg=vs.slice((L.pag-1)*LIM,L.pag*LIM);
    if(!vs.length){w.innerHTML='<div class="bu-vazio">Nenhuma linha neste filtro.</div>';return;}
    w.innerHTML='<div class="bu-rolagem"><table class="bu-tab bl-tab"><thead><tr><th>Vai</th><th>Nome</th><th>CPF/CNPJ</th><th>Outros dados</th><th>Na base</th></tr></thead><tbody>'+
      pg.map(function(p){var l=p[0],i=p[1];
        var outros=[l.numero_precatorio?'precatório '+l.numero_precatorio:'',l.valor!=null?reais(l.valor):'',l.orgao||'',l.cargo||'',l.matricula?'matr. '+l.matricula:'',l.uf||'',l.ano||''].filter(Boolean).join(' · ');
        return '<tr class="'+(l.usar?'':'bl-fora')+'"><td data-r="Vai"><input type="checkbox" data-usar="'+i+'"'+(l.usar?' checked':'')+' aria-label="Usar esta linha"></td>'+
          '<td data-r="Nome"><input type="text" data-nome="'+i+'" value="'+esc(l.nome)+'" aria-label="Nome">'+(l.pagina?'<span class="bu-sub">página '+esc(l.pagina)+'</span>':'')+(l.problema?'<span class="bl-prob">'+esc(l.problema)+'</span>':'')+'</td>'+
          '<td data-r="CPF/CNPJ" class="n">'+esc(mascaraDoc(l)||(l.dados.doc_lido?'(lido: inválido)':''))+'<span class="bu-sub">'+esc(QUAL[l.qualidade]||'')+'</span></td>'+
          '<td data-r="Outros">'+esc(outros)+'</td>'+
          '<td data-r="Na base">'+(l.st?'<span class="bl-st '+esc(l.st)+'">'+esc(ST[l.st]||l.st)+'</span>'+(l.base_id&&L.abrirPessoa?' <button type="button" class="bu-nome" data-pessoa="'+(+l.base_id)+'">'+esc(l.nome_base||'ver')+'</button>':'')+(l.motivo?'<span class="bu-sub">'+esc(l.motivo)+'</span>':''):'<span class="bu-sub">ainda não conferida</span>')+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<div class="bu-pag">'+num(vs.length)+' linhas · página '+L.pag+' de '+np+' <button class="btn sec" type="button" id="blAnt"'+(L.pag<=1?' disabled':'')+'>Anterior</button><button class="btn sec" type="button" id="blProx"'+(L.pag>=np?' disabled':'')+'>Próxima</button></div>';
    $('blAnt').onclick=function(){L.pag--;desenharLinhas();};$('blProx').onclick=function(){L.pag++;desenharLinhas();};
    w.querySelectorAll('[data-usar]').forEach(function(x){x.onchange=function(){L.linhas[+x.dataset.usar].usar=x.checked;L.previa=null;x.closest('tr').classList.toggle('bl-fora',!x.checked);atualizarBotoes();};});
    w.querySelectorAll('[data-nome]').forEach(function(x){x.onchange=function(){var l=L.linhas[+x.dataset.nome];l.nome=x.value.replace(/\s+/g,' ').trim();l.qualidade='';l.st=null;fecharLinha(l);L.previa=null;atualizarBotoes();};});
  }
  function atualizarBotoes(){var g=$('blGravar');if(g){g.disabled=true;g.textContent='Gravar '+num(contagem().usar)+' linhas';}}
  function barra(f){var b=$('blBarra');if(!b)return;b.hidden=f==null;if(f!=null)b.firstChild.style.width=Math.round(f*100)+'%';}
  function linhaParaBanco(l){
    var o={nome:l.nome||null,cpf:l.cpf,cnpj:l.cnpj,cpf6:l.cpf?null:l.cpf6,pagina:l.pagina,matricula:l.matricula,orgao:l.orgao,cargo:l.cargo,uf:l.uf,
      numero_precatorio:l.numero_precatorio,numero_processo:l.numero_processo,ano:l.ano,valor:l.valor,natureza:l.natureza,qualidade:l.qualidade,dados:l.dados||{}};
    Object.keys(o).forEach(function(k){if(o[k]==null||o[k]==='')delete o[k];});
    return o;
  }
  async function conferir(){
    var us=L.linhas.map(function(l,i){return [l,i];}).filter(function(p){return p[0].usar;});
    if(!us.length){msg('Nenhuma linha marcada para ir.','amar');return;}
    $('blConferir').disabled=true;msg('');
    var tot={novas:0,existentes:0,conferir:0};
    L.linhas.forEach(function(l){l.st=null;l.base_id=null;l.nome_base=null;l.motivo=null;});
    for(var k=0;k<us.length;k+=LOTE_PREVIA){
      prog('Conferindo com a base… '+num(Math.min(k+LOTE_PREVIA,us.length))+' de '+num(us.length));barra(k/us.length);
      var lote=us.slice(k,k+LOTE_PREVIA).map(function(p){var l=p[0];return {i:p[1],nome:l.nome||null,cpf:l.cpf,cnpj:l.cnpj,cpf6:l.cpf?null:l.cpf6};});
      var r=await sb().rpc('base_listagem_previa',{p_linhas:lote});
      if(r.error){prog('');barra(null);$('blConferir').disabled=false;msg('A conferência parou: '+erro(r.error)+'. Nada foi gravado.','erro');return;}
      var d=r.data||{},rs=d.resumo||{};
      tot.novas+=+rs.novas||0;tot.existentes+=+rs.existentes||0;tot.conferir+=+rs.conferir||0;
      (d.linhas||[]).forEach(function(x){var l=L.linhas[+x.i];if(!l)return;l.st=x.status;l.base_id=x.base_id;l.nome_base=x.nome_na_base;l.motivo=x.motivo;});
    }
    prog('');barra(null);L.previa=tot;telaRevisar();
    msg('Conferido: <b>'+num(tot.novas)+'</b> pessoas novas, <b>'+num(tot.existentes)+'</b> já existem na base (só completam o que falta), <b>'+num(tot.conferir)+'</b> ficam a conferir. Nada foi gravado ainda.');
  }

  /* ----- 4. gravar ----- */
  async function gravar(){
    var us=L.linhas.filter(function(l){return l.usar;});
    if(!us.length||!L.previa)return;
    if(us.length>GRANDE&&!noturno()){msg('Listagem grande: grave entre 22h e 6h de Maceió.','amar');return;}
    var cf=global.sagaConfirmar?await global.sagaConfirmar('Gravar a listagem','Vão '+num(us.length)+' linhas para a Base única: '+num(L.previa.novas)+' pessoas novas, '+num(L.previa.existentes)+' já existentes (só completam o que falta) e '+num(L.previa.conferir)+' a conferir. Nada é apagado nem trocado.','Gravar',false):true;
    if(!cf)return;
    L.gravando=true;$('blGravar').disabled=true;$('blConferir').disabled=true;$('blVoltar').disabled=true;msg('');
    try{
      if(!L.listagemId){
        var m=Object.assign({},L.meta);delete m.data_br;
        m.arquivo_nome=L.arq.nome;m.arquivo_hash=L.arq.hash;m.paginas=L.arq.paginas||null;
        var cr=await sb().rpc('base_listagem_criar',{p:m,p_forcar:false});
        if(cr.error)throw cr.error;
        if(cr.data&&cr.data.ja_importada){
          var de=global.sagaConfirmar?await global.sagaConfirmar('Este arquivo já foi importado','O mesmo arquivo entrou em '+dataHora(cr.data.em)+' como "'+(cr.data.titulo||'')+'" ('+num(cr.data.linhas)+' linhas). Importar de novo não repete pessoa, mas repete as linhas da listagem. Importar mesmo assim?','Importar mesmo assim',false):false;
          if(!de){L.gravando=false;telaRevisar();msg('Nada foi gravado: o arquivo já tinha sido importado.','amar');return;}
          cr=await sb().rpc('base_listagem_criar',{p:m,p_forcar:true});if(cr.error)throw cr.error;
        }
        L.listagemId=cr.data.id;L.gravadas=0;
      }
      var res={novas:0,existentes:0,conferir:0};
      for(var k=L.gravadas;k<us.length;k+=LOTE_GRAVAR){
        prog('Gravando… '+num(Math.min(k+LOTE_GRAVAR,us.length))+' de '+num(us.length));barra(k/us.length);
        var g=await sb().rpc('base_listagem_gravar',{p_listagem:L.listagemId,p_linhas:us.slice(k,k+LOTE_GRAVAR).map(linhaParaBanco)});
        if(g.error){var e=new Error(erroTxt(g.error));e.lote=k;throw e;}
        L.gravadas=Math.min(k+LOTE_GRAVAR,us.length);
        res.novas+=+g.data.novas||0;res.existentes+=+g.data.existentes||0;res.conferir+=+g.data.conferir||0;
      }
      barra(1);
      var fim=await sb().rpc('base_listagem_concluir',{p_listagem:L.listagemId});
      L.gravando=false;telaFim(fim.error?null:fim.data,res,fim.error);
    }catch(e){
      L.gravando=false;prog('');barra(null);
      var ja=L.gravadas?' As primeiras '+num(L.gravadas)+' linhas já estão gravadas e ficam; clique em Gravar de novo para continuar de onde parou.':' Nada foi gravado.';
      telaRevisar();
      msg('A gravação parou'+(e.lote!=null?' no lote que começa na linha '+num(e.lote+1):'')+': '+(e.code?erro(e):esc(e.message||String(e)))+'.'+ja,'erro');
    }
  }
  function telaFim(l,res,erroFim){
    L.passo='fim';
    L.el.innerHTML='<div class="bu-aviso" id="blMsg" hidden></div>'+passos('fim')+'<div class="bu-bloco"><h3>Listagem gravada</h3>'+
      '<div class="bu-nums"><div class="bu-num"><b>'+num(res.novas+res.existentes+res.conferir)+'</b><span>linhas gravadas</span></div><div class="bu-num"><b>'+num(res.novas)+'</b><span>pessoas novas</span></div><div class="bu-num"><b>'+num(res.existentes)+'</b><span>já existiam (completadas)</span></div><div class="bu-num"><b>'+num(res.conferir)+'</b><span>a conferir</span></div></div>'+
      (erroFim?'<div class="bu-aviso amar">As linhas foram gravadas, mas o resumo no Registro de atividades não entrou: '+erro(erroFim)+'.</div>':'<p class="sub">Fica no Registro de atividades (módulo Teses). As pessoas "a conferir" aparecem na parte A conferir da Base única.</p>')+
      '<div class="bl-botoes"><button class="btn sec" type="button" id="blFimLista">Ver as listagens</button>'+(l&&l.id?'<button class="btn sec" type="button" id="blFimLinhas">Ver as linhas desta</button>':'')+'</div></div>';
    entrar();
    $('blFimLista').onclick=telaLista;
    if($('blFimLinhas'))$('blFimLinhas').onclick=async function(){await telaLista();verLinhas(l.id,1);};
  }

  function montar(el,o){
    estilos();L.el=el;L.abrirPessoa=(o&&o.abrirPessoa)||null;
    if(L.passo==='revisar'&&L.linhas.length)telaRevisar();else if(L.passo==='meta')telaMeta();else telaLista();
  }
  global.SagaBaseListagens={montar:montar,_t:{linhasDoTexto:linhasDoTexto,csvLinhas:csvLinhas,adivinhar:adivinhar,cpfValido:cpfValido,cnpjValido:cnpjValido,valorBR:valorBR},_estado:L};
})(window);
