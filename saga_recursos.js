/* Recursos ligados ao processo (bloco 142, 10/11/2026, pedido do Dr. Victor).
   O recurso (agravo de instrumento, apelação, embargos...) fica DENTRO do processo de onde saiu, com o número próprio dele,
   e não como processo novo. Assim, em cada processo do cliente, dá para saber quais recursos existem e o número de cada um.
   - Ficha: selo com a quantidade na aba do processo, quadro "Recursos deste processo" e a janela Novo/Editar recurso.
   - Planilha: os recursos aparecem embaixo do número do processo.
   - Menus (tipo e situação): etiquetas_catalogo, listas recurso_tipo e recurso_situacao. Quem gerencia etiquetas cria,
     renomeia, reordena e remove (remover só desativa: o histórico fica).
   - Só o administrador remove um recurso (o banco recusa para os outros; o botão some pela lista do saga_tema.css).
   - A intimação que chega com o número do recurso cai no processo principal (o banco faz isso sozinho). */
(function(global){
  'use strict';
  var CAMPOS='id,processo_id,tipo_id,numero,tribunal,orgao,relator,interposto_em,situacao_id,quem_recorreu,observacao,ativo,criado_em,atualizado_em';
  var CURVA='cubic-bezier(.22,.78,.25,1)';
  var R={sb:null,cat:[],porProcesso:{},lidoEm:{},ctx:null};
  var SIGLAS={'agravo de instrumento':'AI','apelação':'AP','embargos de declaração':'ED','agravo interno':'AgInt','recurso inominado':'RI',
    'recurso especial':'REsp','recurso extraordinário':'RE','agravo em recurso especial':'AREsp','agravo em recurso extraordinário':'ARE',
    'recurso ordinário':'RO','mandado de segurança':'MS','reclamação':'Rcl','pedido de uniformização':'PU'};
  var UF_TJ=['','AC','AL','AP','AM','BA','CE','DFT','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SE','SP','TO'];
  var ICO='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4v7a5 5 0 005 5h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 12l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICO_COPIAR='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M5 15V6a2 2 0 012-2h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function e(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function dig(v){return String(v==null?'':v).replace(/\D/g,'');}
  function cor(o){return o&&/^#[0-9a-f]{6}$/i.test(o.cor||'')?o.cor:'#8a94a8';}
  function reduzido(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(x){return false;}}
  function aviso(msg,tipo){if(typeof global.showToast==='function')global.showToast(e(msg),tipo||'success');}
  // número do processo no formato CNJ enquanto digita (com letras, como "REsp 2.123.456/AL", fica como a pessoa escreveu)
  function mascaraCnj(v){
    if(/[a-z]/i.test(v||''))return v;
    var d=dig(v).slice(0,20),tam=[7,2,4,1,2,4],sep=['','-','.','.','.','.'],r='',i=0;
    for(var k=0;k<tam.length&&i<d.length;k++){r+=sep[k]+d.slice(i,i+tam[k]);i+=tam[k];}
    return r;
  }
  function cnj(v){var d=dig(v);return d.length===20?mascaraCnj(d):(v||'');}
  function mascaraData(v){var d=dig(v).slice(0,8);return d.length>4?d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4):d.length>2?d.slice(0,2)+'/'+d.slice(2):d;}
  function dataBR(iso){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');return m?m[3]+'/'+m[2]+'/'+m[1]:'';}
  function isoDeBR(t){
    var m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t||'');if(!m)return null;
    var d=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
    if(d.getUTCFullYear()!==+m[3]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[1])return null;
    return m[3]+'-'+m[2]+'-'+m[1];
  }
  // tribunal a partir do número CNJ (J = justiça, TR = tribunal); o órgão julgador a pessoa escreve
  function tribunalDoNumero(v){
    var d=dig(v);if(d.length!==20)return '';
    var j=d.charAt(13),tr=parseInt(d.slice(14,16),10);
    if(j==='8')return UF_TJ[tr]?'TJ'+UF_TJ[tr]:'';
    if(j==='4')return tr>=1&&tr<=6?'TRF'+tr:'';
    if(j==='5')return tr===0?'TST':'TRT'+tr;
    if(j==='3')return 'STJ';
    if(j==='1')return 'STF';
    if(j==='6')return tr===0?'TSE':'TRE';
    if(j==='7')return 'STM';
    return '';
  }
  function opcoes(categoria,todas){
    return R.cat.filter(function(c){return c.categoria===categoria&&(todas||c.ativo!==false);})
      .sort(function(a,b){return (a.ordem||0)-(b.ordem||0)||String(a.nome).localeCompare(String(b.nome),'pt-BR');});
  }
  function op(id){return R.cat.find(function(c){return c.id===id;})||null;}
  function sigla(t){
    var n=String((t&&t.nome)||'').toLowerCase().trim();
    if(SIGLAS[n])return SIGLAS[n];
    var s=n.split(/\s+/).filter(function(p){return p.length>2;}).map(function(p){return p.charAt(0).toUpperCase();}).join('');
    return s.slice(0,5)||'R';
  }
  function encerrado(r){var s=op(r.situacao_id);return !!(s&&s.conta_encerrada);}
  function ordenar(a,b){return String(a.interposto_em||'9999').localeCompare(String(b.interposto_em||'9999'))||String(a.criado_em||'').localeCompare(String(b.criado_em||''));}

  /* ---------------- leitura ---------------- */
  async function carregarCatalogo(){
    var r=await R.sb.from('etiquetas_catalogo').select('id,nome,cor,categoria,ordem,ativo,conta_encerrada').in('categoria',['recurso_tipo','recurso_situacao']).order('ordem',{ascending:true});
    if(!r.error)R.cat=r.data||[];
  }
  // recursos dos processos informados (em lotes de 150, para não fazer um pedido grande demais)
  async function carregar(sb,ids){
    if(sb)R.sb=sb;
    if(!R.sb)return R.porProcesso;
    var lista=Array.from(new Set((ids||[]).filter(Boolean)));
    var lotes=[];for(var i=0;i<lista.length;i+=150)lotes.push(lista.slice(i,i+150));
    var res=await Promise.all([carregarCatalogo()].concat(lotes.map(function(l){
      return R.sb.from('processos_recursos').select(CAMPOS).in('processo_id',l).eq('ativo',true);
    })));
    lista.forEach(function(id){R.porProcesso[id]=[];});
    res.slice(1).forEach(function(x){
      if(!x||x.error)return;
      (x.data||[]).forEach(function(rec){(R.porProcesso[rec.processo_id]=R.porProcesso[rec.processo_id]||[]).push(rec);});
    });
    var agora=Date.now();
    lista.forEach(function(id){R.porProcesso[id].sort(ordenar);R.lidoEm[id]=agora;});
    return R.porProcesso;
  }
  function doProcesso(pid){return (R.porProcesso[pid]||[]).slice();}
  function descricao(r){var t=op(r.tipo_id),s=op(r.situacao_id);return (t?t.nome:'Recurso')+' '+(r.numero||'(mesmo número do processo)')+(s?' · '+s.nome:'');}

  /* ---------------- aparência ---------------- */
  function estilos(){
    if(document.getElementById('sagaRecursosCss'))return;
    var s=document.createElement('style');s.id='sagaRecursosCss';
    s.textContent=''
      +'.rec-aba{display:inline-flex;align-items:center;gap:4px;margin-left:2px;padding:1px 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold) 35%,transparent);background:color-mix(in srgb,var(--gold) 9%,transparent);color:inherit;font-size:9.5px;font-weight:600;line-height:1.6}'
      +'.rec-quadro{margin-top:16px;padding-top:14px;border-top:1px dashed var(--border-soft)}'
      +'.rec-cab{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}'
      +'.rec-tit{display:inline-flex;align-items:center;gap:7px;color:var(--gold);font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}'
      +'.rec-tit b{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,var(--gold) 14%,transparent);color:var(--text);font-size:10px;letter-spacing:0}'
      +'.rec-cab .btn-secondary{height:30px;padding:0 11px;font-size:10.5px}'
      +'.rec-lista{display:grid;gap:9px}'
      +'.rec-item{position:relative;padding:11px 13px 11px 15px;border:1px solid var(--border-soft);border-radius:12px;background:color-mix(in srgb,var(--text) 3%,transparent);min-width:0;overflow-wrap:anywhere}'
      +'.rec-item::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--c,var(--gold))}'
      +'.rec-item.encerrado{opacity:.78}'
      +'.rec-l1{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:12px}'
      +'.rec-sigla{display:inline-grid;place-items:center;min-width:30px;height:20px;padding:0 6px;border-radius:6px;background:color-mix(in srgb,var(--c,var(--gold)) 16%,transparent);color:var(--text);font-size:9.5px;font-weight:700}'
      +'.rec-quem{padding:1px 7px;border-radius:999px;border:1px solid var(--border-soft);color:var(--muted);font-size:9.5px}'
      +'.rec-sit{display:inline-flex;align-items:center;gap:5px;margin-left:auto;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--s) 13%,transparent);color:var(--text);font-size:10px;font-weight:600}'
      +'.rec-sit i{width:7px;height:7px;border-radius:50%;background:var(--s)}'
      +'.rec-num{display:flex;align-items:center;gap:6px;margin-top:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:var(--text)}'
      +'.rec-num .rec-sem{font-family:inherit;color:var(--muted);font-size:11px}'
      +'.rec-copiar{display:inline-grid;place-items:center;width:24px;height:24px;border:1px solid var(--border-soft);border-radius:7px;background:transparent;color:var(--muted);cursor:pointer;transition:color .2s '+CURVA+',border-color .2s '+CURVA+'}'
      +'.rec-copiar:hover{color:var(--gold);border-color:var(--gold)}'
      +'.rec-l2,.rec-l3{margin-top:4px;color:var(--muted);font-size:11px;line-height:1.45}'
      +'.rec-obs{margin-top:6px;padding:7px 9px;border-radius:8px;background:color-mix(in srgb,var(--text) 4%,transparent);color:var(--text);font-size:11px;line-height:1.5;white-space:pre-wrap}'
      +'.rec-acoes{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px}'
      +'.rec-acoes button{height:28px;padding:0 10px;font-size:10.5px}'
      +'.rec-vazio{color:var(--muted);font-size:11px;line-height:1.5}'
      +'.rec-modal{max-width:560px!important}'
      +'.rec-form .rec-campo{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;min-width:0}'
      +'.rec-form .rec-campo>span{color:var(--gold);font-size:9px;font-weight:700;letter-spacing:.65px;text-transform:uppercase}'
      +'.rec-form .rec-campo small{color:var(--muted);font-size:10px;line-height:1.4}'
      +'.rec-form input,.rec-form select,.rec-form textarea{width:100%;box-sizing:border-box;outline:0;border:1px solid var(--border-soft);border-radius:9px;background:color-mix(in srgb,var(--text) 5%,transparent);color:var(--text);font:inherit;font-size:11.5px;padding:9px 10px}'
      +'.rec-form input:focus,.rec-form select:focus,.rec-form textarea:focus{border-color:var(--gold)}'
      +'.rec-form textarea{min-height:70px;resize:vertical}'
      +'.rec-grade{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}'
      +'.rec-seg{display:inline-flex;gap:4px;padding:3px;border:1px solid var(--border-soft);border-radius:11px;align-self:flex-start}'
      +'.rec-seg button{height:30px;padding:0 13px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:11px;cursor:pointer}'
      +'.rec-aviso{margin:-4px 0 12px;padding:8px 10px;border-radius:9px;border:1px solid color-mix(in srgb,var(--warning) 45%,transparent);background:color-mix(in srgb,var(--warning) 10%,transparent);color:var(--text);font-size:11px;line-height:1.45}'
      +'.rec-erro{margin-top:4px;color:var(--danger);font-size:11px}'
      +'.rec-ger-linha{display:flex;align-items:center;gap:6px;margin-bottom:7px}'
      +'.rec-ger-linha input[type=text]{flex:1;min-width:0}'
      +'.rec-ger-linha input[type=color]{width:36px;height:32px;padding:2px;flex:0 0 auto}'
      +'.rec-ger-linha button{width:30px;height:30px;flex:0 0 auto;border:1px solid var(--border-soft);border-radius:8px;background:transparent;color:var(--text);cursor:pointer}'
      +'.rec-ger-linha button:disabled{opacity:.35;cursor:default}'
      +'.rec-ger-linha label{display:flex;align-items:center;gap:4px;color:var(--muted);font-size:9.5px;white-space:nowrap}'
      +'.rec-ger-linha label input{width:auto}'
      +'.rec-pl{display:inline-flex;gap:3px;margin-right:6px;vertical-align:middle}'
      +'.rec-pl:empty{display:none}'
      +'.rec-pl span{display:inline-flex;align-items:center;padding:0 5px;border-radius:5px;border:1px solid color-mix(in srgb,var(--c,var(--gold)) 55%,transparent);background:color-mix(in srgb,var(--c,var(--gold)) 14%,transparent);color:var(--text);font-size:9.5px;font-weight:700;line-height:16px;white-space:nowrap;cursor:help}'
      +'@media(max-width:560px){.rec-grade{grid-template-columns:1fr}.rec-sit{margin-left:0}}';
    document.head.appendChild(s);
  }

  /* ---------------- selo na aba do processo e plaquinhas da planilha ---------------- */
  function seloAba(pid){
    var l=R.porProcesso[pid]||[];if(!l.length)return '';
    estilos();
    return '<span class="rec-aba" title="'+e(l.map(descricao).join('\n'))+'">'+ICO+l.length+(l.length===1?' recurso':' recursos')+'</span>';
  }
  // planilha: selo curto (AI, AP...) antes do número; a coluna é estreita, então o número do recurso fica na dica do mouse
  function plaquinhas(pid){
    var l=R.porProcesso[pid]||[];if(!l.length)return '';
    var dica=e(l.map(descricao).join('\n'));
    return l.slice(0,2).map(function(r){var t=op(r.tipo_id);return '<span style="--c:'+e(cor(t))+'" title="'+dica+'">'+e(sigla(t))+'</span>';}).join('')
      +(l.length>2?'<span title="'+dica+'">+'+(l.length-2)+'</span>':'');
  }
  // planilha: preenche, embaixo do número de cada processo desenhado, os recursos dele
  var pedidoPlanilha=0;
  async function preencherPlanilha(raiz,sb){
    if(!raiz)return;
    var els=Array.prototype.slice.call(raiz.querySelectorAll('[data-rec-proc]'));if(!els.length)return;
    estilos();
    var ids=els.map(function(el){return el.getAttribute('data-rec-proc');});
    var pedido=++pedidoPlanilha,agora=Date.now();
    var faltam=ids.filter(function(id){return !(R.lidoEm[id]>agora-60000);});
    if(faltam.length){try{await carregar(sb,faltam);}catch(x){return;}}
    if(pedido!==pedidoPlanilha)return;
    els.forEach(function(el){if(el.isConnected)el.innerHTML=plaquinhas(el.getAttribute('data-rec-proc'));});
  }

  /* ---------------- quadro "Recursos deste processo" (ficha) ---------------- */
  // o: {sb, podeEditar, podeGerenciar, processos:[{id,rotulo,numero}], aoMudar}
  function quadro(raiz,processo,o){
    if(!raiz)return;
    o=o||{};if(o.sb)R.sb=o.sb;
    R.ctx=Object.assign({},o,{processoId:processo&&processo.id});
    if(!processo){raiz.innerHTML='';return;}
    var l=R.porProcesso[processo.id]||[],pode=!!o.podeEditar;
    if(!l.length&&!pode){raiz.innerHTML='';return;}
    estilos();
    raiz.innerHTML='<div class="rec-quadro"><div class="rec-cab"><span class="rec-tit">'+ICO+'Recursos deste processo'+(l.length?' <b>'+l.length+'</b>':'')+'</span>'
      +(pode?'<button type="button" class="btn-secondary" data-rec="novo">+ Recurso</button>':'')+'</div>'
      +(l.length?'<div class="rec-lista">'+l.map(function(r){return cartao(r,pode);}).join('')+'</div>'
        :'<p class="rec-vazio">Nenhum recurso. Agravo de instrumento, apelação, embargos e os outros recursos deste processo ficam aqui, cada um com o seu número.</p>')
      +'</div>';
    raiz.onclick=async function(ev){
      var b=ev.target.closest('[data-rec]');if(!b||!raiz.contains(b))return;
      var acao=b.dataset.rec,item=b.closest('[data-rec-id]'),rec=item?l.find(function(x){return x.id===item.dataset.recId;}):null;
      if(acao==='copiar'){copiar(b.dataset.num);return;}
      if(acao==='novo'){abrirJanela({processoId:processo.id});return;}
      if(acao==='editar'&&rec){abrirJanela({recurso:rec});return;}
      if(acao==='remover'&&rec)await remover(rec);
    };
  }
  function cartao(r,pode){
    var t=op(r.tipo_id),s=op(r.situacao_id),local=[r.tribunal,r.orgao,r.relator].filter(Boolean).join(' · ');
    return '<div class="rec-item'+(encerrado(r)?' encerrado':'')+'" data-rec-id="'+e(r.id)+'" style="--c:'+e(cor(t))+'">'
      +'<div class="rec-l1"><span class="rec-sigla">'+e(sigla(t))+'</span><b>'+e(t?t.nome:'Recurso')+'</b>'
        +(r.quem_recorreu==='outra_parte'?'<span class="rec-quem">da outra parte</span>':'')
        +(s?'<span class="rec-sit" style="--s:'+e(cor(s))+'"><i></i>'+e(s.nome)+'</span>':'')+'</div>'
      +'<div class="rec-num">'+(r.numero?'<span>'+e(r.numero)+'</span><button type="button" class="rec-copiar" data-rec="copiar" data-num="'+e(r.numero)+'" title="Copiar o número do recurso" aria-label="Copiar o número do recurso">'+ICO_COPIAR+'</button>'+(global.SagaTribunais?global.SagaTribunais.icone(r.numero):'')
        :'<span class="rec-sem">Usa o mesmo número do processo</span>')+'</div>'
      +(local?'<div class="rec-l2">'+e(local)+'</div>':'')
      +(r.interposto_em?'<div class="rec-l3">Protocolado em '+e(dataBR(r.interposto_em))+'</div>':'')
      +(r.observacao?'<div class="rec-obs">'+e(r.observacao)+'</div>':'')
      +(pode?'<div class="rec-acoes"><button type="button" class="btn-secondary" data-rec="editar">Editar</button><button type="button" class="btn-danger" data-rec="remover" data-remover>Remover</button></div>':'')
      +'</div>';
  }
  function copiar(txt){
    var ok=function(){aviso('Número copiado: '+txt);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,function(){aviso(txt,'info');});else aviso(txt,'info');
  }
  async function remover(rec){
    var t=op(rec.tipo_id);
    var sim=typeof global.sagaConfirmar==='function'?await global.sagaConfirmar('Remover recurso',(t?t.nome:'Recurso')+' '+(rec.numero||'')+' sai deste processo (fica no registro de alterações). As intimações que vieram por ele voltam a ficar sem processo.','Remover'):window.confirm('Remover este recurso?');
    if(!sim)return;
    var r=await R.sb.from('processos_recursos').update({ativo:false}).eq('id',rec.id);
    if(r.error){aviso('Não foi possível remover: '+(r.error.message||''),'error');return;}
    R.porProcesso[rec.processo_id]=(R.porProcesso[rec.processo_id]||[]).filter(function(x){return x.id!==rec.id;});
    aviso('Recurso removido.');
    if(R.ctx&&R.ctx.aoMudar)R.ctx.aoMudar(rec.processo_id);
  }

  /* ---------------- janelas ---------------- */
  function novaJanela(html,larga,aoFechar){
    estilos();
    var d=document.createElement('div');d.className='modal-overlay open';
    d.innerHTML='<div class="modal'+(larga?' rec-modal':'')+'" role="dialog" aria-modal="true">'+html+'</div>';
    document.body.appendChild(d);
    var fechada=false;
    function tecla(ev){if(ev.key==='Escape'&&!document.getElementById('sagaConfirma')){ev.stopPropagation();fechar();}}
    function fechar(){
      if(fechada)return;fechada=true;document.removeEventListener('keydown',tecla,true);
      // tirar o "open" deixa o saga_guard fazer a saída suave; depois a janela sai da página
      d.classList.remove('open');
      setTimeout(function(){d.remove();},reduzido()?0:360);
      if(aoFechar){try{aoFechar();}catch(x){}}
    }
    document.addEventListener('keydown',tecla,true);
    d.addEventListener('click',function(ev){if(ev.target===d||ev.target.closest('[data-fechar]'))fechar();});
    d.fechar=fechar;
    return d;
  }
  function campo(rotulo,html,ajuda){return '<label class="rec-campo"><span>'+e(rotulo)+'</span>'+html+(ajuda?'<small>'+e(ajuda)+'</small>':'')+'</label>';}
  function opcoesHtml(categoria,sel,vazio,gerencia){
    var l=opcoes(categoria),atual=sel&&!l.some(function(c){return c.id===sel;})?op(sel):null;
    return '<option value="">'+e(vazio)+'</option>'
      +(atual?'<option value="'+e(atual.id)+'" selected>'+e(atual.nome)+' (removida do menu)</option>':'')
      +l.map(function(c){return '<option value="'+e(c.id)+'"'+(c.id===sel?' selected':'')+'>'+e(c.nome)+'</option>';}).join('')
      +(gerencia?'<option value="__nova">+ Nova opção...</option><option value="__gerenciar">Gerenciar opções (renomear, ordem, remover)...</option>':'');
  }
  function abrirNovo(o){
    o=o||{};if(o.sb)R.sb=o.sb;
    if(o.processos||o.aoMudar)R.ctx=Object.assign({},R.ctx||{},o);
    abrirJanela({processoId:o.processoId});
  }
  // o: {recurso?, processoId?}; usa o contexto do quadro (processos, permissões, aoMudar)
  function abrirJanela(o){
    o=o||{};var ctx=R.ctx||{};var r=o.recurso||{};var procs=ctx.processos||[];
    var pid=r.processo_id||o.processoId||ctx.processoId||(procs[0]&&procs[0].id)||'';
    var ger=!!ctx.podeGerenciar,quem=r.quem_recorreu==='outra_parte'?'outra_parte':'nos';
    var d=novaJanela('<div class="modal-head"><div class="modal-title-stack"><h3>'+(r.id?'Editar recurso':'Novo recurso')+'</h3><p>O recurso fica dentro do processo de onde saiu, com o número próprio dele. As intimações com esse número caem neste processo.</p></div><button type="button" class="modal-close" data-fechar aria-label="Fechar">✕</button></div>'
      +'<div class="modal-body rec-form">'
      +campo('De qual processo','<select id="recProc">'+procs.map(function(p){return '<option value="'+e(p.id)+'"'+(p.id===pid?' selected':'')+'>'+e(p.rotulo)+'</option>';}).join('')+'</select>')
      +campo('Tipo do recurso','<select id="recTipo">'+opcoesHtml('recurso_tipo',r.tipo_id,'Escolha o tipo...',ger)+'</select>')
      +campo('Número do recurso','<input id="recNum" type="text" inputmode="numeric" autocomplete="off" maxlength="40" placeholder="0000000-00.0000.0.00.0000">','Deixe em branco se o recurso usa o mesmo número do processo (ex.: embargos de declaração).')
      +'<div id="recAviso" class="rec-aviso" hidden></div>'
      +'<div class="rec-campo"><span>Quem recorreu</span><div class="seg rec-seg" role="group" aria-label="Quem recorreu"><button type="button" data-quem="nos" class="'+(quem==='nos'?'active':'')+'">Nós</button><button type="button" data-quem="outra_parte" class="'+(quem==='outra_parte'?'active':'')+'">A outra parte</button></div></div>'
      +'<div class="rec-grade">'+campo('Tribunal','<input id="recTrib" type="text" maxlength="60" autocomplete="off" placeholder="Ex.: TJDFT">')+campo('Órgão julgador','<input id="recOrgao" type="text" maxlength="120" autocomplete="off" placeholder="Ex.: 2ª Turma Cível">')+'</div>'
      +'<div class="rec-grade">'+campo('Relator','<input id="recRelator" type="text" maxlength="120" autocomplete="off" placeholder="Ex.: Des. Fulano de Tal">')+campo('Protocolado em','<input id="recData" type="text" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="dd/mm/aaaa">')+'</div>'
      +campo('Situação','<select id="recSit">'+opcoesHtml('recurso_situacao',r.situacao_id,'Sem situação',ger)+'</select>')
      +campo('Observação','<textarea id="recObs" maxlength="2000" placeholder="Ex.: pedido de efeito suspensivo; preparo em 5 dias"></textarea>')
      +'<div class="rec-erro" id="recErro" role="alert"></div>'
      +'</div><div class="modal-foot"><button type="button" class="btn-secondary" data-fechar>Cancelar</button><button type="button" class="btn-primary" id="recSalvar">'+(r.id?'Salvar recurso':'Cadastrar recurso')+'</button></div>',true);
    var $=function(id){return d.querySelector('#'+id);};
    $('recNum').value=r.numero||'';$('recTrib').value=r.tribunal||'';$('recOrgao').value=r.orgao||'';$('recRelator').value=r.relator||'';
    $('recData').value=dataBR(r.interposto_em);$('recObs').value=r.observacao||'';
    var tribAuto=!r.tribunal;
    $('recNum').addEventListener('input',function(){var a=this.value,m=mascaraCnj(a);if(m!==a)this.value=m;conferirNumero();});
    $('recProc').addEventListener('change',conferirNumero);
    $('recTrib').addEventListener('input',function(){tribAuto=!this.value.trim();});
    $('recData').addEventListener('input',function(){var m=mascaraData(this.value);if(m!==this.value)this.value=m;});
    d.querySelector('.rec-seg').addEventListener('click',function(ev){var b=ev.target.closest('[data-quem]');if(!b)return;quem=b.dataset.quem;d.querySelectorAll('[data-quem]').forEach(function(x){x.classList.toggle('active',x===b);});});
    [['recTipo','recurso_tipo','Escolha o tipo...','Tipos de recurso'],['recSit','recurso_situacao','Sem situação','Situações do recurso']].forEach(function(cfg){
      var sel=$(cfg[0]),anterior=sel.value;
      sel.addEventListener('focus',function(){anterior=sel.value;});
      sel.addEventListener('change',async function(){
        if(sel.value==='__nova'){
          sel.value=anterior;
          var nome=(window.prompt('Nome da nova opção ('+cfg[3].toLowerCase()+'):')||'').trim();if(!nome)return;
          var novo=await criarOpcao(cfg[1],nome);if(!novo)return;
          sel.innerHTML=opcoesHtml(cfg[1],novo.id,cfg[2],ger);anterior=novo.id;
        }else if(sel.value==='__gerenciar'){
          sel.value=anterior;
          gerenciar(cfg[1],cfg[3],function(){var v=sel.value;sel.innerHTML=opcoesHtml(cfg[1],v,cfg[2],ger);});
        }else anterior=sel.value;
      });
    });
    var pedidoConf=0;
    async function conferirNumero(){
      var box=$('recAviso'),num=$('recNum').value,dd=dig(num),meu=++pedidoConf;
      box.hidden=true;box.textContent='';
      if(dd.length!==20)return;
      if(tribAuto){var t=tribunalDoNumero(dd);if(t)$('recTrib').value=t;}
      var proc=procs.find(function(p){return p.id===$('recProc').value;});
      if(proc&&dig(proc.numero)===dd){box.textContent='Este é o número do próprio processo. Se o recurso usa o mesmo número, deixe o campo em branco.';box.hidden=false;return;}
      if((R.porProcesso[$('recProc').value]||[]).some(function(x){return x.id!==r.id&&dig(x.numero)===dd;})){box.textContent='Este recurso já está cadastrado neste processo.';box.hidden=false;return;}
      try{
        var q=await R.sb.from('processos').select('id,numero_processo_cnj,pessoa_id').eq('excluido_logico',false).or('numero_processo_cnj.eq.'+cnj(dd)+',numero_processo_cnj.eq.'+dd).limit(3);
        if(meu!==pedidoConf||q.error||!(q.data||[]).length)return;
        box.textContent='Atenção: já existe um processo cadastrado com este número no SAGA. Se ele foi criado por engano como processo separado, avise o administrador para juntar; enquanto ele existir, as intimações desse número vão para ele.';
        box.hidden=false;
      }catch(x){}
    }
    if(r.numero)conferirNumero();
    $('recSalvar').addEventListener('click',async function(){
      var bt=this,erro=$('recErro');erro.textContent='';
      var proc=$('recProc').value,tipo=$('recTipo').value,dataTxt=$('recData').value.trim(),iso=dataTxt?isoDeBR(dataTxt):null;
      if(!proc){erro.textContent='Escolha o processo.';return;}
      if(!tipo||tipo.indexOf('__')===0){erro.textContent='Escolha o tipo do recurso.';$('recTipo').focus();return;}
      if(dataTxt&&!iso){erro.textContent='Confira a data do protocolo (dd/mm/aaaa).';$('recData').focus();return;}
      var sit=$('recSit').value;if(sit.indexOf('__')===0)sit='';
      var dados={processo_id:proc,tipo_id:tipo,numero:$('recNum').value.trim()||null,tribunal:$('recTrib').value.trim()||null,orgao:$('recOrgao').value.trim()||null,
        relator:$('recRelator').value.trim()||null,interposto_em:iso,situacao_id:sit||null,quem_recorreu:quem,observacao:$('recObs').value.trim()||null};
      bt.disabled=true;
      try{
        var res=r.id?await R.sb.from('processos_recursos').update(dados).eq('id',r.id).select(CAMPOS).single()
                     :await R.sb.from('processos_recursos').insert(dados).select(CAMPOS).single();
        if(res.error)throw res.error;
        var salvo=res.data;
        Object.keys(R.porProcesso).forEach(function(k){R.porProcesso[k]=R.porProcesso[k].filter(function(x){return x.id!==salvo.id;});});
        (R.porProcesso[salvo.processo_id]=R.porProcesso[salvo.processo_id]||[]).push(salvo);R.porProcesso[salvo.processo_id].sort(ordenar);
        d.fechar();
        aviso(r.id?'Recurso salvo.':'Recurso cadastrado no processo.');
        if(ctx.aoMudar)ctx.aoMudar(salvo.processo_id,r.processo_id&&r.processo_id!==salvo.processo_id?r.processo_id:null);
        // intimações com este número que estavam soltas e agora caíram no processo
        if(salvo.numero){try{var c=await R.sb.from('intimacoes').select('id',{count:'exact',head:true}).eq('recurso_id',salvo.id);
          if(!c.error&&c.count>0)aviso(c.count+(c.count===1?' intimação deste recurso está':' intimações deste recurso estão')+' neste processo.','info');}catch(x){}}
      }catch(err){
        var m=String(err&&err.message||'');
        erro.textContent=/row-level security|permission/i.test(m)?'Você não tem permissão para cadastrar recursos.':(m||'Não foi possível salvar.');
      }finally{bt.disabled=false;}
    });
    setTimeout(function(){var f=$(r.id?'recNum':'recTipo');if(f)f.focus();},60);
  }

  /* ---------------- menus: nova opção e gerenciar ---------------- */
  async function criarOpcao(categoria,nome){
    if(opcoes(categoria,true).some(function(c){return c.nome.toLowerCase()===nome.toLowerCase();})){aviso('Já existe uma opção com esse nome.','warning');return null;}
    var ordem=opcoes(categoria,true).reduce(function(m,c){return Math.max(m,c.ordem||0);},0)+1;
    var r=await R.sb.from('etiquetas_catalogo').insert({categoria:categoria,nome:nome.slice(0,60),cor:'#8a94a8',ordem:ordem,ativo:true}).select('id,nome,cor,categoria,ordem,ativo,conta_encerrada').single();
    if(r.error){aviso('Não foi possível criar: '+(r.error.message||''),'error');return null;}
    R.cat.push(r.data);return r.data;
  }
  function gerenciar(categoria,titulo,aoFechar){
    var situacao=categoria==='recurso_situacao';
    var d=novaJanela('<div class="modal-head"><div class="modal-title-stack"><h3>'+e(titulo)+'</h3><p>Renomeie, mude a cor, troque a ordem ou remova. Remover só tira do menu: o que já foi gravado continua mostrando o nome.'+(situacao?' "Encerra" marca a situação que fecha o recurso (ex.: provido, não provido).':'')+'</p></div><button type="button" class="modal-close" data-fechar aria-label="Fechar">✕</button></div>'
      +'<div class="modal-body rec-form"><div id="recGer"></div><button type="button" class="btn-secondary" id="recGerNova">+ Nova opção</button></div>'
      +'<div class="modal-foot"><button type="button" class="btn-primary" data-fechar>Pronto</button></div>',false,aoFechar);
    var box=d.querySelector('#recGer');
    function pintar(){
      var l=opcoes(categoria);
      box.innerHTML=l.map(function(c,i){
        return '<div class="rec-ger-linha" data-gid="'+e(c.id)+'"><input type="color" value="'+e(cor(c))+'" data-g="cor" aria-label="Cor"><input type="text" value="'+e(c.nome)+'" maxlength="60" data-g="nome" aria-label="Nome">'
          +(situacao?'<label title="Esta situação encerra o recurso"><input type="checkbox" data-g="fim"'+(c.conta_encerrada?' checked':'')+'>Encerra</label>':'')
          +'<button type="button" data-g="sobe" title="Subir"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-g="desce" title="Descer"'+(i===l.length-1?' disabled':'')+'>↓</button>'
          +'<button type="button" data-g="tira" data-remover title="Remover do menu (só desativa)" style="color:var(--danger)">✕</button></div>';
      }).join('')||'<p class="rec-vazio">Nenhuma opção.</p>';
    }
    async function salvar(id,campos){
      var r=await R.sb.from('etiquetas_catalogo').update(campos).eq('id',id);
      if(r.error){aviso('Não foi possível salvar: '+(r.error.message||''),'error');return false;}
      Object.assign(op(id)||{},campos);return true;
    }
    pintar();
    box.addEventListener('change',async function(ev){
      var linha=ev.target.closest('[data-gid]');if(!linha)return;var g=ev.target.dataset.g,id=linha.dataset.gid;
      if(g==='nome'){var n=ev.target.value.trim();if(!n){ev.target.value=(op(id)||{}).nome||'';return;}await salvar(id,{nome:n.slice(0,60)});}
      else if(g==='cor')await salvar(id,{cor:ev.target.value});
      else if(g==='fim')await salvar(id,{conta_encerrada:ev.target.checked});
    });
    box.addEventListener('click',async function(ev){
      var b=ev.target.closest('button[data-g]');if(!b)return;var id=b.closest('[data-gid]').dataset.gid;
      var l=opcoes(categoria),i=l.findIndex(function(x){return x.id===id;});
      if(b.dataset.g==='tira'){
        var sim=typeof global.sagaConfirmar==='function'?await global.sagaConfirmar('Remover opção','"'+l[i].nome+'" sai do menu. Os recursos que já usam esta opção continuam mostrando o nome.','Remover'):window.confirm('Remover?');
        if(!sim)return;await salvar(id,{ativo:false});
      }else{
        var j=b.dataset.g==='sobe'?i-1:i+1;if(j<0||j>=l.length)return;
        var x=l.splice(i,1)[0];l.splice(j,0,x);
        for(var k=0;k<l.length;k++)if(l[k].ordem!==k+1){if(!await salvar(l[k].id,{ordem:k+1}))break;}
      }
      pintar();
    });
    d.querySelector('#recGerNova').addEventListener('click',async function(){
      var nome=(window.prompt('Nome da nova opção:')||'').trim();if(!nome)return;
      if(await criarOpcao(categoria,nome))pintar();
    });
  }

  global.SagaRecursos={carregar:carregar,doProcesso:doProcesso,seloAba:seloAba,quadro:quadro,abrirNovo:abrirNovo,preencherPlanilha:preencherPlanilha,
    plaquinhas:plaquinhas,tribunalDoNumero:tribunalDoNumero,mascaraCnj:mascaraCnj,cnj:cnj,sigla:sigla,_R:R};
})(window);
