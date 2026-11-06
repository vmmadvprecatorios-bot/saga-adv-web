/* SAGA · Leitor de planilha do Excel (.xlsx) sem biblioteca de fora.
   O .xlsx é um pacote ZIP com arquivos XML. Este módulo abre o pacote com o descompactador do próprio navegador
   (DecompressionStream 'deflate-raw') e lê as células das abas. Não executa nada do arquivo: só lê texto e números.
   Uso: SagaXlsx.abrir(arrayBuffer) -> Promise<{abas:[nome...], ler:(indice)=>Promise<linhas[][]>}>
        SagaXlsx.paraTexto(linhas) -> texto separado por tabulação (o mesmo formato de colar do Excel). */
(function(global){
  'use strict';
  var LIMITE_ARQUIVO=40*1024*1024; // 40 MB descompactado por parte, para não travar o navegador

  function u16(d,o){return d[o]|(d[o+1]<<8);}
  function u32(d,o){return (d[o]|(d[o+1]<<8)|(d[o+2]<<16)|(d[o+3]<<24))>>>0;}

  function indice(dados){
    var d=new Uint8Array(dados),fim=-1;
    for(var i=d.length-22;i>=Math.max(0,d.length-65557);i--){if(u32(d,i)===0x06054b50){fim=i;break;}}
    if(fim<0)throw new Error('Este arquivo não parece ser uma planilha .xlsx.');
    var total=u16(d,fim+10),pos=u32(d,fim+16),mapa={};
    for(var k=0;k<total;k++){
      if(u32(d,pos)!==0x02014b50)throw new Error('Planilha danificada.');
      var metodo=u16(d,pos+10),tam=u32(d,pos+20),tamReal=u32(d,pos+24),nl=u16(d,pos+28),el=u16(d,pos+30),cl=u16(d,pos+32),local=u32(d,pos+42);
      var nome=new TextDecoder().decode(d.subarray(pos+46,pos+46+nl));
      mapa[nome]={metodo:metodo,tam:tam,tamReal:tamReal,local:local};
      pos+=46+nl+el+cl;
    }
    return {d:d,mapa:mapa};
  }
  async function arquivo(z,nome){
    var e=z.mapa[nome];if(!e)return null;
    if(e.tamReal>LIMITE_ARQUIVO)throw new Error('A planilha é grande demais para ler no navegador. Divida em partes menores.');
    var d=z.d,o=e.local;if(u32(d,o)!==0x04034b50)throw new Error('Planilha danificada.');
    var ini=o+30+u16(d,o+26)+u16(d,o+28),bruto=d.subarray(ini,ini+e.tam);
    if(e.metodo===0)return new TextDecoder().decode(bruto);
    if(e.metodo!==8)throw new Error('Formato de compactação não suportado.');
    if(typeof DecompressionStream==='undefined')throw new Error('Este navegador não abre .xlsx. Use Chrome, Edge ou Safari atualizados, ou salve como CSV.');
    var fluxo=new Blob([bruto]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(fluxo).text();
  }
  function xml(txt){var doc=new DOMParser().parseFromString(txt,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('Planilha danificada.');return doc;}
  function filhos(no,nome){var r=[];for(var i=0;i<no.childNodes.length;i++){var c=no.childNodes[i];if(c.nodeType===1&&(c.localName===nome))r.push(c);}return r;}
  function todos(no,nome){return Array.prototype.slice.call(no.getElementsByTagNameNS('*',nome));}
  function textoDe(no){return todos(no,'t').filter(function(t){var p=t.parentNode;return !(p&&p.localName==='rPh');}).map(function(t){return t.textContent;}).join('');}
  function colunaDe(ref){var m=/^([A-Z]+)/.exec(ref||'');if(!m)return -1;var n=0;for(var i=0;i<m[1].length;i++)n=n*26+(m[1].charCodeAt(i)-64);return n-1;}
  var FORMATOS_DATA={14:1,15:1,16:1,17:1,18:1,19:1,20:1,21:1,22:1,27:1,30:1,36:1,45:1,46:1,47:1,50:1,57:1};
  function ehData(codigo,formatos){
    if(FORMATOS_DATA[codigo])return true;var f=formatos[codigo];if(!f)return false;
    f=f.replace(/"[^"]*"/g,'').replace(/\[[^\]]*\]/g,'');return /[dmyh]/i.test(f)&&!/^[#0.,\s%]+$/.test(f);
  }
  function dataBR(serial,base1904){
    var ms=Math.round((serial+(base1904?1462:0)-25569)*86400000),d=new Date(ms);
    var dd=String(d.getUTCDate()).padStart(2,'0'),mm=String(d.getUTCMonth()+1).padStart(2,'0'),aa=d.getUTCFullYear();
    return dd+'/'+mm+'/'+aa;
  }
  function numeroBR(n){
    if(!isFinite(n))return String(n);
    if(Math.abs(n-Math.round(n))<1e-9&&Math.abs(n)<1e15)return String(Math.round(n));
    return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:6,useGrouping:true});
  }

  async function abrir(dados){
    var z=indice(dados);
    var wb=await arquivo(z,'xl/workbook.xml');if(!wb)throw new Error('Este arquivo não parece ser uma planilha .xlsx.');
    var wbDoc=xml(wb),rels={};
    var relTxt=await arquivo(z,'xl/_rels/workbook.xml.rels');
    if(relTxt)todos(xml(relTxt),'Relationship').forEach(function(r){var alvo=r.getAttribute('Target')||'';alvo=alvo.replace(/^\/?xl\//,'').replace(/^\//,'');rels[r.getAttribute('Id')]='xl/'+alvo;});
    var base1904=todos(wbDoc,'workbookPr').some(function(p){var v=p.getAttribute('date1904');return v==='1'||v==='true';});
    var abas=todos(wbDoc,'sheet').map(function(s,i){
      var rid=s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||s.getAttribute('r:id');
      return {nome:s.getAttribute('name')||('Aba '+(i+1)),caminho:rels[rid]||('xl/worksheets/sheet'+(i+1)+'.xml'),oculta:s.getAttribute('state')==='hidden'||s.getAttribute('state')==='veryHidden'};
    }).filter(function(a){return !a.oculta;});
    if(!abas.length)throw new Error('A planilha não tem abas visíveis.');
    var textos=[],ssTxt=await arquivo(z,'xl/sharedStrings.xml');
    if(ssTxt)todos(xml(ssTxt),'si').forEach(function(si){textos.push(textoDe(si));});
    var estilos=[],formatos={},stTxt=await arquivo(z,'xl/styles.xml');
    if(stTxt){var st=xml(stTxt);todos(st,'numFmt').forEach(function(f){formatos[+f.getAttribute('numFmtId')]=f.getAttribute('formatCode')||'';});
      var xfs=todos(st,'cellXfs')[0];if(xfs)filhos(xfs,'xf').forEach(function(x){estilos.push(+(x.getAttribute('numFmtId')||0));});}
    async function ler(i){
      var aba=abas[i||0],txt=await arquivo(z,aba.caminho);if(!txt)throw new Error('Não foi possível abrir a aba "'+aba.nome+'".');
      var doc=xml(txt),linhas=[];
      todos(doc,'row').forEach(function(row){
        var r=(+row.getAttribute('r')||linhas.length+1)-1,linha=[],ultimaCol=-1;
        filhos(row,'c').forEach(function(c){
          var col=colunaDe(c.getAttribute('r'));if(col<0)col=ultimaCol+1;ultimaCol=col;
          var t=c.getAttribute('t')||'n',v=filhos(c,'v')[0],bruto=v?v.textContent:'',valor='';
          if(t==='s')valor=textos[+bruto]||'';
          else if(t==='inlineStr'){var is=filhos(c,'is')[0];valor=is?textoDe(is):'';}
          else if(t==='str'||t==='e')valor=bruto;
          else if(t==='b')valor=bruto==='1'?'Sim':bruto==='0'?'Não':'';
          else if(bruto!==''){var n=Number(bruto),fmt=estilos[+(c.getAttribute('s')||0)]||0;valor=isNaN(n)?bruto:(ehData(fmt,formatos)?dataBR(n,base1904):numeroBR(n));}
          linha[col]=String(valor).trim();
        });
        for(var k=0;k<linha.length;k++)if(linha[k]==null)linha[k]='';
        linhas[r]=linha;
      });
      for(var k=0;k<linhas.length;k++)if(!linhas[k])linhas[k]=[];
      return linhas.filter(function(l){return l.some(function(x){return x!=='';});});
    }
    return {abas:abas.map(function(a){return a.nome;}),ler:ler};
  }
  function paraTexto(linhas){
    return (linhas||[]).map(function(l){return l.map(function(v){v=String(v==null?'':v);return /[\t\n"]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join('\t');}).join('\n');
  }
  global.SagaXlsx={abrir:abrir,paraTexto:paraTexto};
})(window);
