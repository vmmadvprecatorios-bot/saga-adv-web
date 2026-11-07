/* =====================================================================
   SAGA · Documento para imprimir / salvar em PDF
   Monta uma página limpa (fundo branco, cabeçalho com a marca do escritório,
   tabelas organizadas, número da página no rodapé) num quadro invisível e abre
   a janela de impressão do navegador. Lá a pessoa escolhe "Salvar como PDF".
   Uso: SagaPdf.imprimir({titulo, subtitulo, arquivo, paisagem, paginas:[html,...]})
   Classes prontas para o conteúdo: .kpis (caixas de números), table.tab (tabela),
   .num (número à direita), .fds/.feriado/.apagado (linhas), .neg/.pos (saldo),
   .alerta, .obs (bloco de texto), .assinaturas, .secao (título de seção), .nada.
   ===================================================================== */
window.SagaPdf=(function(){
  'use strict';
  function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
  function marca(){var logo='',nome='';try{logo=localStorage.getItem('saga-logo')||'';nome=localStorage.getItem('saga-escritorio')||'';}catch(e){}return {logo:logo,nome:nome||'Victor Morais Advocacia'};}
  function agora(){return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(',',' às');}
  // Sempre no tema Azul claro (Azul Porcelana): marinho, linhas alternando branco e azul bem claro
  var CSS=
    '*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}'+
    'body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#13233a;font-size:9pt;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    '.pagina{break-after:page}.pagina:last-child{break-after:auto}'+
    '.cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:9px;margin-bottom:14px;border-bottom:2px solid #1f3e6d}'+
    '.marca{display:flex;align-items:center;gap:10px}.marca img{height:34px;max-width:170px;object-fit:contain}'+
    '.marca .nome{font-family:"Cormorant Garamond",Georgia,serif;font-size:17pt;font-weight:700;color:#13233a;letter-spacing:.3px}.marca .nome em{font-style:normal;color:#2c5592}'+
    '.marca .esc{font-size:7.5pt;letter-spacing:1.4px;text-transform:uppercase;color:#5f6f86}'+
    '.titulo{text-align:right}.titulo h1{margin:0;font-family:"Cormorant Garamond",Georgia,serif;font-size:18pt;font-weight:700;color:#13233a;line-height:1.1}'+
    '.titulo .sub{font-size:8.5pt;color:#5f6f86;margin-top:3px}'+
    '.pessoa{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin:0 0 10px}'+
    '.pessoa h2{margin:0;font-family:"Cormorant Garamond",Georgia,serif;font-size:15pt;color:#13233a}.pessoa .info{font-size:8.5pt;color:#5f6f86}'+
    '.secao{font-size:7.5pt;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#1f3e6d;margin:14px 0 6px}'+
    '.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin:0 0 12px}'+
    '.kpis div{border:1px solid #d3dce9;border-radius:6px;padding:6px 8px;background:#f3f6fa;break-inside:avoid}'+
    '.kpis div>span{display:block;font-size:6.8pt;letter-spacing:.6px;text-transform:uppercase;color:#5f6f86}.kpis b{display:block;font-size:11pt;color:#13233a;margin-top:1px;font-variant-numeric:tabular-nums}'+
    '.kpis .forte{background:#e3ebf6;border-color:#b9c8de}.kpis .ruim b{color:#b42318}'+
    'table.tab{width:100%;border-collapse:collapse;font-size:8pt}'+
    'table.tab thead{display:table-header-group}table.tab tr{break-inside:avoid}'+
    'table.tab th{background:#1f3e6d;color:#fff;font-weight:600;font-size:6.9pt;letter-spacing:.6px;text-transform:uppercase;text-align:left;padding:5px 6px;border:1px solid #1f3e6d}'+
    'table.tab td{padding:4px 6px;border:1px solid #dbe3ee;vertical-align:top}'+
    'table.tab tbody tr:nth-child(odd) td{background:#ffffff}table.tab tbody tr:nth-child(even) td{background:#eef2f7}'+
    'table.tab .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}table.tab th.num{text-align:right}table.tab .c,table.tab th.c{text-align:center}'+
    'table.tab tr.fds td{background:#e4e9f1!important;color:#6b7a90}table.tab tr.feriado td{background:#dde8f7!important;color:#2c5592}table.tab tr.apagado td{color:#a3adbd}'+
    'table.tab tr.total td{background:#d6e1f0!important;font-weight:700;border-top:2px solid #1f3e6d;color:#13233a}'+
    'table.tab tr.gap td{background:#fdf0f0!important;color:#b42318;font-style:italic}'+
    '.neg{color:#b42318;font-weight:700}.pos{color:#1f7a3f;font-weight:700}.alerta{color:#b42318;font-weight:700}'+
    '.mini{font-size:7.5pt;color:#5f6f86}.etq{display:inline-block;border:1px solid #c9d5e6;border-radius:4px;padding:0 4px;font-size:7pt;white-space:nowrap}'+
    '.obs{border:1px solid #d3dce9;border-left:3px solid #1f3e6d;border-radius:6px;padding:8px 10px;background:#f3f6fa;margin-top:10px;break-inside:avoid}.obs p{margin:0 0 4px}'+
    '.nada{color:#5f6f86;font-style:italic;padding:8px 0}'+
    '.assinaturas{display:flex;gap:40px;margin-top:34px;break-inside:avoid}.assinaturas div{flex:1;border-top:1px solid #5f6f86;padding-top:4px;text-align:center;font-size:8pt;color:#3d4b60}'+
    '.rodape{margin-top:10px;font-size:7pt;color:#8a96a8}'+
    // folha de ponto: ficha da pessoa, resumo em dois grupos e o mês inteiro numa página
    '.ficha-colab{display:grid;grid-template-columns:2.2fr .7fr 1.2fr 1fr 1.7fr 1.2fr;border:1px solid #c9d5e6;border-radius:8px;overflow:hidden;margin:0 0 8px}'+
    '.ficha-colab div{padding:5px 9px;border-left:1px solid #dbe3ee;background:#f7f9fc;min-width:0}.ficha-colab div:first-child{border-left:0;background:#e3ebf6}'+
    '.ficha-colab span{display:block;font-size:6.3pt;letter-spacing:.7px;text-transform:uppercase;color:#5f6f86}.ficha-colab b{display:block;font-size:9pt;color:#13233a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ficha-colab .larga b{font-family:"Cormorant Garamond",Georgia,serif;font-size:12.5pt;line-height:1.1}'+
    '.grupos{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 8px}.grupos.um{grid-template-columns:1fr}'+
    '.grupo-tit{font-size:6.6pt;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#1f3e6d;margin:0 0 3px}'+
    '.grupos .kpis{grid-template-columns:repeat(5,1fr);gap:4px;margin:0}.grupos.um .kpis{grid-template-columns:repeat(3,1fr)}.grupos .kpis div{padding:3px 6px}.grupos .kpis b{font-size:9.5pt}.grupos .kpis div>span{font-size:6pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    'table.folha{font-size:7.3pt;line-height:1.2}table.folha td{padding:1.1px 6px}table.folha th{padding:3.5px 6px}'+
    'table.folha td.dia{white-space:nowrap}table.folha .dsem{color:#5f6f86;font-size:6.6pt;text-transform:uppercase;letter-spacing:.4px}'+
    'table.folha tr.semana td{border-top:1.6px solid #9fb3cf}table.folha td.ocorr{font-size:6.8pt;color:#3d4b60}'+
    '.legenda{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:6.8pt;color:#5f6f86;margin-top:4px}.legenda i{display:inline-block;width:10px;height:8px;border:1px solid #c9d5e6;border-radius:2px;margin-left:8px}.legenda i:first-child{margin-left:0}.legenda .l-fds{background:#e4e9f1}.legenda .l-fer{background:#dde8f7}.legenda span{margin-left:auto}'+
    '.compacta{line-height:1.22}.compacta .assinaturas{margin-top:14px}.compacta .cab{margin-bottom:8px;padding-bottom:6px}';
  function cabecalho(o){
    var m=marca();
    var esquerda=m.logo?'<img src="'+esc(m.logo)+'" alt="">':'<div><div class="nome">VMM<em>ADV</em></div><div class="esc">'+esc(m.nome)+'</div></div>';
    return '<div class="cab"><div class="marca">'+esquerda+'</div><div class="titulo"><h1>'+esc(o.titulo||'')+'</h1><div class="sub">'+esc(o.subtitulo||'')+(o.subtitulo?' · ':'')+'Gerado em '+agora()+'</div></div></div>';
  }
  function imprimir(o){
    o=o||{};var m=marca();
    var paginas=(o.paginas&&o.paginas.length?o.paginas:['<div class="nada">Nada para imprimir.</div>']);
    var pagina='@page{size:A4 '+(o.paisagem?'landscape':'portrait')+';margin:'+(o.paisagem?'9mm 10mm 11mm':'12mm 11mm 14mm')+';'+
      '@bottom-left{content:"'+m.nome.replace(/"/g,'')+' · SAGA ADV";font-family:Arial,sans-serif;font-size:7pt;color:#9aa0aa}'+
      '@bottom-right{content:"Página " counter(page) " de " counter(pages);font-family:Arial,sans-serif;font-size:7pt;color:#9aa0aa}}';
    var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(o.arquivo||o.titulo||'SAGA')+'</title>'+
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">'+
      '<style>'+pagina+CSS+'</style></head><body>'+
      paginas.map(function(p){return '<section class="pagina">'+cabecalho(o)+p+'</section>';}).join('')+'</body></html>';
    var ifr=document.createElement('iframe');
    ifr.setAttribute('aria-hidden','true');ifr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(ifr);
    var d=ifr.contentDocument;d.open();d.write(html);d.close();
    var tituloAntes=document.title,feito=false;
    var limpar=function(){document.title=tituloAntes;setTimeout(function(){ifr.remove();},500);};
    var abrir=function(){
      if(feito)return;feito=true;
      // o nome sugerido para o arquivo PDF vem do título da página
      document.title=o.arquivo||o.titulo||tituloAntes;
      try{ifr.contentWindow.focus();ifr.contentWindow.print();}catch(e){window.print();}
      // a janela de impressão segura o script até fechar; o "afterprint" cobre os navegadores que não seguram
      setTimeout(limpar,1500);
    };
    var esperar=[];
    try{if(d.fonts&&d.fonts.ready)esperar.push(d.fonts.ready);}catch(e){}
    Array.prototype.forEach.call(d.images,function(im){if(!im.complete)esperar.push(new Promise(function(r){im.onload=im.onerror=r;}));});
    Promise.race([Promise.all(esperar),new Promise(function(r){setTimeout(r,2500);})]).then(function(){setTimeout(abrir,120);});
    return ifr;
  }
  return {imprimir:imprimir,esc:esc,nomeEscritorio:function(){return marca().nome;}};
})();
