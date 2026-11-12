/* Andamentos do processo pelo DataJud (CNJ) (bloco 152, T21b, 10/11/2026, pedido do Dr. Victor).
   - Ficha > Dados do Processo: quadro "Andamentos no tribunal (CNJ)" com os andamentos do processo e dos recursos dele,
     destaque nos importantes (pagamento/alvará, RPV/precatório, trânsito em julgado, sentença, acórdão, decisão, audiência,
     baixa), "Atualizar agora" (consulta o CNJ só para este processo) e "Ver todos".
   - Intimações: botão "Andamentos do CNJ" abre a janela com os andamentos recentes de todos os processos que a pessoa vê
     (período e "Só os importantes"); o administrador geral também liga/desliga o robô diário, carrega tudo, testa a
     ligação e cola a chave pública do CNJ, se precisar.
   Os dados vêm do DataJud (base pública do CNJ), que pode atrasar alguns dias em relação ao site do tribunal.
   Tudo grava pela função do servidor datajud-andamentos e pelas funções datajud_* do banco. */
(function(global){
  'use strict';
  var CURVA='cubic-bezier(.22,.78,.25,1)';
  var VISIVEIS=6;
  var A={sb:null,dados:{},carregando:{},aberto:{}};
  var CAT={
    pagamento:{n:'Pagamento',c:'var(--success)'},requisicao:{n:'RPV / Precatório',c:'var(--success)'},
    transito:{n:'Trânsito em julgado',c:'var(--gold)'},sentenca:{n:'Sentença',c:'var(--gold)'},acordao:{n:'Acórdão / Julgamento',c:'var(--gold)'},
    decisao:{n:'Decisão',c:'var(--info)'},audiencia:{n:'Audiência',c:'var(--info)'},baixa:{n:'Baixa / Arquivamento',c:'var(--muted)'},
    despacho:{n:'Despacho'},juntada:{n:'Juntada'},conclusao:{n:'Conclusão'},publicacao:{n:'Publicação / Intimação'},
    expedicao:{n:'Expedição'},remessa:{n:'Remessa'},outro:{n:'Andamento'}};
  var GRAUS={G1:'1º grau',G2:'2º grau',JE:'Juizado',TR:'Turma Recursal',TRU:'Turma Regional',TNU:'Turma Nacional',SUP:'Tribunal superior'};
  var ICO='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.6"/></svg>';
  var ICO_ATU='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8 8 0 10-2.3 5.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 5v6h-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function e(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function dig(v){return String(v==null?'':v).replace(/\D/g,'');}
  function cnj(v){var d=dig(v);return d.length===20?d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16):(v||'');}
  function reduzido(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(x){return false;}}
  function partes(iso){
    var d=new Date(iso);if(isNaN(d))return null;
    var f=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
    var o={};f.forEach(function(p){o[p.type]=p.value;});return o;
  }
  // data do andamento: só a data quando a hora veio "vazia" (00:00 ou o meio-dia que o robô usa quando o tribunal não manda a hora)
  function quando(iso){var p=partes(iso);if(!p)return '';var h=p.hour+':'+p.minute;return p.day+'/'+p.month+'/'+p.year+(h==='00:00'||h==='12:00'?'':' '+h);}
  function relativo(iso){
    var p=partes(iso);if(!p)return '';
    var hoje=partes(new Date().toISOString()),ontem=partes(new Date(Date.now()-864e5).toISOString());
    var dia=p.day+'/'+p.month+'/'+p.year,h=p.hour+'h'+p.minute;
    if(dia===hoje.day+'/'+hoje.month+'/'+hoje.year)return 'hoje às '+h;
    if(dia===ontem.day+'/'+ontem.month+'/'+ontem.year)return 'ontem às '+h;
    return 'em '+p.day+'/'+p.month+' às '+h;
  }
  function aviso(msg,tipo){
    if(typeof global.showToast==='function'){global.showToast(e(msg),tipo||'success');return;}
    estilos();
    var t=document.createElement('div');t.className='and-toast'+(tipo==='error'?' erro':'');t.textContent=msg;document.body.appendChild(t);
    requestAnimationFrame(function(){t.classList.add('mostra');});
    setTimeout(function(){t.classList.remove('mostra');setTimeout(function(){t.remove();},reduzido()?0:320);},3800);
  }
  function recolher(el,ocultar){
    if(!el)return;
    if(global.sagaRecolher){global.sagaRecolher(el,ocultar);return;}
    el.hidden=!!ocultar;
  }
  function irParaFicha(ev,processoId){
    var url='ficha_cliente_padrao_metalico_FINAL.html?processo_id='+encodeURIComponent(processoId)+'&foco=andamentos';
    if(ev&&(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.button===1))return; // Ctrl+clique / botão do meio: o link abre numa aba nova
    if(ev)ev.preventDefault();
    if(typeof global.sagaIrPara==='function')global.sagaIrPara(url);else location.href=url;
  }

  function estilos(){
    if(document.getElementById('sagaAndamentosCss'))return;
    var s=document.createElement('style');s.id='sagaAndamentosCss';
    s.textContent=''
      +'.and-quadro [hidden],.and-janela [hidden]{display:none!important}'
      +'.and-quadro{margin-top:16px;padding-top:14px;border-top:1px dashed var(--border-soft)}'
      +'.and-cab{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}'
      +'.and-tit{display:inline-flex;align-items:center;gap:7px;color:var(--gold);font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}'
      +'.and-tit b{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,var(--gold) 14%,transparent);color:var(--text);font-size:10px;letter-spacing:0}'
      +'.and-acoes{display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
      +'.and-quando{color:var(--muted);font-size:10.5px}'
      +'.and-cab .btn-secondary{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;font-size:10.5px;border-radius:9px}'
      +'.and-cab .btn-secondary[disabled]{opacity:.6;cursor:wait}'
      +'.and-lista{display:grid;gap:7px}'
      +'.and-item{position:relative;padding:9px 12px 9px 14px;border:1px solid var(--border-soft);border-radius:11px;background:color-mix(in srgb,var(--text) 2.5%,transparent);min-width:0;overflow-wrap:anywhere}'
      +'.and-item::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--c,var(--border))}'
      +'.and-item.imp{background:color-mix(in srgb,var(--c,var(--gold)) 6%,transparent)}'
      +'.and-l1{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--muted);font-size:10.5px}'
      +'.and-data{color:var(--text);font-variant-numeric:tabular-nums;font-weight:600}'
      +'.and-tag{padding:1px 7px;border-radius:999px;border:1px solid var(--border-soft);font-size:9.5px;line-height:1.5}'
      +'.and-novo{border-color:color-mix(in srgb,var(--gold) 45%,transparent);background:color-mix(in srgb,var(--gold) 12%,transparent);color:var(--text);font-weight:600}'
      +'.and-nome{margin-top:4px;color:var(--text);font-size:12px;line-height:1.45}'
      +'.and-item.imp .and-nome{font-weight:600}'
      +'.and-cat{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:6px;background:color-mix(in srgb,var(--c,var(--gold)) 16%,transparent);color:var(--text);font-size:9.5px;font-weight:700;vertical-align:1px}'
      +'.and-compl{margin-top:3px;color:var(--muted);font-size:11px;line-height:1.45}'
      +'.and-mais{display:grid;gap:7px;margin-top:7px}'
      +'.and-ver{margin-top:9px;background:none;border:0;padding:4px 0;color:var(--gold);font:inherit;font-size:11px;font-weight:600;cursor:pointer}'
      +'.and-ver:hover{text-decoration:underline}'
      +'.and-vazio{color:var(--muted);font-size:11px;line-height:1.55;margin:0}'
      +'.and-vazio b{color:var(--text);font-weight:600}'
      +'.and-nota{margin:10px 0 0;color:var(--muted);font-size:10px;line-height:1.5}'
      +'.and-freq input{width:56px;padding:2px 6px;border:1px solid var(--border);border-radius:7px;background:var(--panel,transparent);color:var(--text);font:inherit;text-align:center}'
      +'.and-freq .btn-secondary{padding:3px 12px;margin-left:4px;font-size:11px;border-radius:999px}'
      +'.and-robo-erros{margin:4px 0 6px;padding-left:18px;font-size:11px}.and-vermelho{color:var(--danger,#e5484d)}'
      +'.and-amarelo{color:color-mix(in srgb,var(--warning,#e0a93b) 80%,var(--text))}'
      +'.and-passageiro{color:var(--text);border:1px solid color-mix(in srgb,var(--warning,#e0a93b) 55%,transparent);background:color-mix(in srgb,var(--warning,#e0a93b) 12%,transparent);border-radius:9px;padding:7px 10px;font-size:11px;margin-bottom:8px}'
      +'.and-erro{color:var(--text);border:1px solid color-mix(in srgb,var(--danger,#e5484d) 40%,transparent);background:color-mix(in srgb,var(--danger,#e5484d) 8%,transparent);border-radius:9px;padding:7px 10px;font-size:11px;margin-bottom:8px}'
      +'.and-roda{display:inline-block;width:11px;height:11px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--gold);animation:andGira .8s linear infinite}'
      +'@keyframes andGira{to{transform:rotate(360deg)}}'
      // janela (Intimações)
      +'.and-fundo{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;background:rgba(5,10,20,.55);opacity:0;transition:opacity .26s '+CURVA+';overflow-y:auto}'
      +'.and-fundo.aberta{opacity:1}'
      +'.and-janela{width:100%;max-width:820px;background:var(--panel-solid,var(--panel));color:var(--text);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);padding:20px 22px 18px;transform:translateY(12px) scale(.985);transition:transform .32s '+CURVA+'}'
      +'.and-fundo.aberta .and-janela{transform:none}'
      +'html.sem-movimento .and-fundo,html.sem-movimento .and-janela{transition:none}'
      +'.and-jcab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}'
      +'.and-jcab h2{margin:0 0 4px;font-family:"Cormorant Garamond",Georgia,serif;font-size:24px;font-weight:600}'
      +'.and-jcab p{margin:0;color:var(--muted);font-size:11.5px;line-height:1.5;max-width:62ch}'
      +'.and-x{width:32px;height:32px;flex:none;border-radius:9px;border:1px solid var(--border-soft);background:transparent;color:var(--muted);cursor:pointer;font-size:14px}'
      +'.and-x:hover{color:var(--text);border-color:var(--border)}'
      +'.and-robo{border:1px solid var(--border-soft);border-radius:12px;padding:11px 13px;margin-bottom:12px;background:color-mix(in srgb,var(--text) 2.5%,transparent);font-size:11.5px;line-height:1.55}'
      +'.and-robo-l1{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}'
      +'.and-robo-sit{display:inline-flex;align-items:center;gap:7px;font-weight:600}'
      +'.and-robo-sit i{width:8px;height:8px;border-radius:50%;background:var(--muted)}'
      +'.and-robo-sit.ligado i{background:var(--success)}'
      +'.and-robo-bts{display:flex;gap:7px;flex-wrap:wrap}'
      +'.and-robo-bts button{height:30px;padding:0 11px;font-size:10.5px;border-radius:9px}'
      +'.and-robo-num{color:var(--muted);margin-top:4px}'
      +'.and-robo-exec{margin:6px 0 0;padding:0;list-style:none;color:var(--muted);font-size:10.5px}'
      +'.and-robo-exec li{margin-top:2px}'
      +'.and-robo-chave{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}'
      +'.and-robo-chave button{height:32px;padding:0 12px;font-size:10.5px;border-radius:9px}'
      +'.and-robo-chave input{flex:1;min-width:200px;height:32px;box-sizing:border-box;border:1px solid var(--border-soft);border-radius:9px;background:color-mix(in srgb,var(--text) 5%,transparent);color:var(--text);font:inherit;font-size:11px;padding:0 10px}'
      +'.and-filtros{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}'
      +'.and-seg{display:inline-flex;gap:3px;padding:3px;border:1px solid var(--border-soft);border-radius:11px}'
      +'.and-seg button,.and-so{height:28px;padding:0 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:10.5px;cursor:pointer}'
      +'.and-seg button.active,.and-so.active{background:color-mix(in srgb,var(--gold) 16%,transparent);border-color:color-mix(in srgb,var(--gold) 40%,transparent);color:var(--text)}'
      +'.and-so{border-color:var(--border-soft)}'
      +'.and-dia{margin:12px 0 6px;color:var(--gold);font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}'
      +'.and-feed .and-item{display:block;text-decoration:none;color:inherit;transition:border-color .2s '+CURVA+',transform .2s '+CURVA+'}'
      +'.and-feed .and-item:hover{border-color:var(--border);transform:translateX(2px)}'
      +'html.sem-movimento .and-feed .and-item{transition:none}'
      +'.and-cli{color:var(--text);font-weight:600}'
      +'.and-toast{position:fixed;left:50%;bottom:24px;z-index:9500;transform:translate(-50%,12px);opacity:0;max-width:min(92vw,520px);padding:10px 14px;border-radius:11px;border:1px solid var(--border);background:var(--panel-solid,var(--panel));color:var(--text);font-size:12px;box-shadow:var(--shadow);transition:opacity .26s '+CURVA+',transform .26s '+CURVA+'}'
      +'.and-toast.mostra{opacity:1;transform:translate(-50%,0)}'
      +'.and-toast.erro{border-color:color-mix(in srgb,var(--danger,#e5484d) 50%,transparent)}'
      +'@media(max-width:560px){.and-janela{padding:16px 14px}.and-jcab h2{font-size:21px}.and-fundo{padding:16px 8px}}';
    document.head.appendChild(s);
  }

  function item(m,o){
    var c=CAT[m.categoria]||CAT.outro,imp=!!m.importante;
    var compl=String(m.texto||'');if(compl.indexOf(m.nome)===0)compl=compl.slice(String(m.nome).length).replace(/^\s*—\s*/,'');
    var tags=(m.grau?'<span class="and-tag">'+e(GRAUS[m.grau]||m.grau)+'</span>':'')
      +(m.recurso_id?'<span class="and-tag">Recurso</span>':'')
      +(m.novo?'<span class="and-tag and-novo">novo</span>':'');
    var corpo='<div class="and-l1"><span class="and-data">'+e(quando(m.data_hora))+'</span>'+tags
        +(o&&o.feed?'<span>·</span><span class="and-cli">'+e(m.cliente||'Cliente')+'</span><span>'+e(cnj(m.processo_numero||m.numero))+'</span>':'')+'</div>'
      +'<div class="and-nome">'+(imp?'<span class="and-cat">'+e(c.n)+'</span>':'')+e(m.nome)+'</div>'
      +(compl?'<div class="and-compl">'+e(compl)+'</div>':'')
      +(m.orgao&&!(o&&o.feed)?'<div class="and-compl">'+e(m.orgao)+'</div>':'');
    var estilo=imp&&c.c?' style="--c:'+c.c+'"':'';
    if(o&&o.feed)return '<a class="and-item'+(imp?' imp':'')+'" href="ficha_cliente_padrao_metalico_FINAL.html?processo_id='+encodeURIComponent(m.processo_id)+'&foco=andamentos" data-and-proc="'+e(m.processo_id)+'"'+estilo+'>'+corpo+'</a>';
    return '<div class="and-item'+(imp?' imp':'')+'"'+estilo+'>'+corpo+'</div>';
  }

  // ---------- quadro da ficha ----------
  async function carregar(processoId){
    var r=await A.sb.rpc('datajud_andamentos',{p_processo:processoId,p_limite:400});
    if(r.error)throw r.error;
    A.dados[processoId]=r.data||{numeros:[],andamentos:[]};
    return A.dados[processoId];
  }
  function corpoQuadro(processo,d){
    var temNumero=dig(processo.cnj||processo.numero||'').length===20;
    if(!d)return '<p class="and-vazio"><span class="and-roda" aria-hidden="true"></span> Carregando os andamentos...</p>';
    var nums=d.numeros||[],ands=d.andamentos||[],robo=d.robo||{};
    // erro passageiro (o CNJ pediu para esperar, demorou ou estava fora do ar): o número volta sozinho para a fila (bloco 182)
    var passageiro=function(t){return /(tenta de novo|\(429\)|demorou demais|n[aã]o consegui falar com o datajud)/i.test(String(t||''));};
    var erro=nums.filter(function(n){return n.erro&&!passageiro(n.erro);})[0];
    var naFila=!erro&&nums.some(function(n){return n.erro&&passageiro(n.erro);});
    // regra de 12/11 (erros sempre à vista): erro passageiro em AMARELO com o motivo, quando foi e a próxima tentativa
    var pass=naFila&&nums.filter(function(n){return n.erro&&passageiro(n.erro);})[0];
    var motivo=function(t){t=String(t||'');return /\(429\)/.test(t)?'erro 429: pedidos demais ao CNJ ao mesmo tempo (limite de consultas)':/demorou demais/i.test(t)?'o CNJ demorou demais para responder (mais de 60 s)':/falar com o datajud/i.test(t)?'não consegui falar com o CNJ (internet ou o CNJ fora do ar)':t;};
    var html=erro?'<div class="and-erro">A última consulta ao CNJ'+(erro.consultado_em?' ('+e(quando(erro.consultado_em))+')':'')+' deu erro: '+e(erro.erro)+'</div>'
      :pass?'<div class="and-passageiro"><b>A consulta ao CNJ deu erro'+(pass.consultado_em?' em '+e(quando(pass.consultado_em)):'')+':</b> '+e(motivo(pass.erro))+'. O robô tenta de novo sozinho na próxima rodada (de madrugada, entre 1h e 6h40); para tentar agora, use <b>Atualizar agora</b>.</div>':'';
    if(!ands.length){
      if(!nums.length&&!temNumero)return html+'<p class="and-vazio">Este processo ainda não tem número no padrão do CNJ. Quando tiver, o SAGA busca os andamentos sozinho.</p>';
      if(naFila)return html;
      if(!nums.length)return html+'<p class="and-vazio">Ainda não consultado no CNJ. '+(robo.ativo?'O robô diário consulta todos os processos do Jurídico de madrugada; ':'')+'Use <b>Atualizar agora</b> para buscar já.</p>';
      if(nums.every(function(n){return n.encontrado===false;}))return html+'<p class="and-vazio">Não encontrado na base pública do CNJ. Pode ser processo em segredo de justiça, muito recente ou que o tribunal ainda não enviou ao CNJ.</p>';
      return html+'<p class="and-vazio">Nenhum andamento na base pública do CNJ até agora.</p>';
    }
    var primeiros=ands.slice(0,VISIVEIS),resto=ands.slice(VISIVEIS);
    html+='<div class="and-lista">'+primeiros.map(function(m){return item(m);}).join('')+'</div>';
    if(resto.length){
      var aberto=!!A.aberto[processo.id];
      html+='<div class="and-mais"'+(aberto?'':' hidden')+'>'+resto.map(function(m){return item(m);}).join('')+'</div>'
        +'<button type="button" class="and-ver" data-and="ver">'+(aberto?'Mostrar menos':'Ver todos ('+ands.length+')')+'</button>';
    }
    return html;
  }
  function htmlQuadro(processo,d){
    var nums=(d&&d.numeros)||[],tot=(d&&d.andamentos||[]).length;
    var ult=nums.map(function(n){return n.consultado_em;}).filter(Boolean).sort().pop();
    var temNumero=dig(processo.cnj||processo.numero||'').length===20||nums.length>0;
    return '<div class="and-quadro" data-and-pid="'+e(processo.id)+'">'
      +'<div class="and-cab"><span class="and-tit">'+ICO+'Andamentos no tribunal (CNJ)'+(tot?' <b>'+tot+'</b>':'')+'</span>'
      +'<div class="and-acoes">'+(ult?'<span class="and-quando">Consultado '+e(relativo(ult))+'</span>':'')
      +(temNumero?'<button type="button" class="btn-secondary" data-and="atualizar">'+ICO_ATU+'Atualizar agora</button>':'')+'</div></div>'
      +'<div class="and-corpo">'+corpoQuadro(processo,d)+'</div>'
      +'<p class="and-nota">Fonte: DataJud, a base pública do CNJ. Pode atrasar alguns dias em relação ao site do tribunal; para conferir na hora, use o botão do tribunal ao lado do número do processo.</p>'
      +'</div>';
  }
  function quadro(raiz,processo,o){
    if(!raiz)return;
    o=o||{};if(o.sb)A.sb=o.sb;
    if(!processo||!A.sb){raiz.innerHTML='';return;}
    estilos();
    var pid=processo.id;
    raiz.dataset.andPid=pid;
    raiz.innerHTML=htmlQuadro(processo,A.dados[pid]);
    raiz.onclick=async function(ev){
      var b=ev.target.closest('[data-and]');if(!b||!raiz.contains(b))return;
      if(b.dataset.and==='ver'){
        A.aberto[pid]=!A.aberto[pid];
        var mais=raiz.querySelector('.and-mais');recolher(mais,!A.aberto[pid]);
        b.textContent=A.aberto[pid]?'Mostrar menos':'Ver todos ('+((A.dados[pid]||{}).andamentos||[]).length+')';
        return;
      }
      if(b.dataset.and==='atualizar')await atualizar(raiz,processo,o,b);
    };
    if(!A.dados[pid]&&!A.carregando[pid]){
      A.carregando[pid]=true;
      carregar(pid).then(function(){
        A.carregando[pid]=false;
        if(raiz.dataset.andPid===pid)raiz.innerHTML=htmlQuadro(processo,A.dados[pid]);
      }).catch(function(){
        A.carregando[pid]=false;
        var c=raiz.dataset.andPid===pid&&raiz.querySelector('.and-corpo');
        if(c)c.innerHTML='<p class="and-vazio">Não consegui carregar os andamentos agora. Tente de novo daqui a pouco.</p>';
      });
    }
  }
  async function atualizar(raiz,processo,o,botao){
    var pid=processo.id;
    if(botao){botao.disabled=true;botao.innerHTML='<span class="and-roda" aria-hidden="true"></span>Consultando o CNJ...';}
    try{
      var r=await A.sb.functions.invoke('datajud-andamentos',{body:{acao:'processo',processo_id:pid}});
      var d=r.data||{};
      if(r.error&&!d.mensagem){try{d=await r.error.context.json();}catch(x){d={mensagem:'Não consegui consultar o CNJ agora.'};}}
      aviso(d.mensagem||(d.ok?'Andamentos atualizados.':'Não consegui consultar o CNJ agora.'),d.ok?'success':'error');
      await carregar(pid);
    }catch(x){
      aviso('Não consegui consultar o CNJ agora. Tente de novo daqui a pouco.','error');
    }
    if(raiz.dataset.andPid===pid)quadro(raiz,processo,o);
  }
  function rolar(raiz){
    if(!raiz)return;
    setTimeout(function(){raiz.scrollIntoView({behavior:reduzido()?'auto':'smooth',block:'start'});},350);
  }

  // ---------- janela da tela de Intimações ----------
  var J={dias:7,soImp:false,fundo:null,ehAdmin:false};
  function fecharJanela(){
    var f=J.fundo;if(!f)return;J.fundo=null;
    document.removeEventListener('keydown',teclaJanela);
    f.classList.remove('aberta');setTimeout(function(){f.remove();},reduzido()?0:300);
  }
  function teclaJanela(ev){if(ev.key==='Escape')fecharJanela();}
  async function janela(o){
    o=o||{};if(o.sb)A.sb=o.sb;
    if(!A.sb||J.fundo)return;
    estilos();
    var f=document.createElement('div');f.className='and-fundo';
    f.innerHTML='<div class="and-janela" role="dialog" aria-modal="true" aria-labelledby="andTitulo">'
      +'<div class="and-jcab"><div><h2 id="andTitulo">Andamentos do CNJ</h2><p>Andamentos dos processos do Jurídico (e dos recursos deles) trazidos do DataJud, a base pública do CNJ. Pode atrasar alguns dias em relação ao site do tribunal. Clique para abrir a ficha.</p></div>'
      +'<button type="button" class="and-x" data-and="fechar" aria-label="Fechar">✕</button></div>'
      +'<div id="andRobo"></div>'
      +'<div class="and-filtros"><div class="and-seg" role="group" aria-label="Período">'
        +[[7,'7 dias'],[30,'30 dias'],[90,'90 dias']].map(function(p){return '<button type="button" data-and-dias="'+p[0]+'" class="'+(J.dias===p[0]?'active':'')+'">'+p[1]+'</button>';}).join('')
      +'</div><button type="button" class="and-so'+(J.soImp?' active':'')+'" data-and="so" aria-pressed="'+J.soImp+'">Só os importantes</button></div>'
      +'<div class="and-feed" id="andFeed"><p class="and-vazio"><span class="and-roda" aria-hidden="true"></span> Carregando...</p></div></div>';
    document.body.appendChild(f);J.fundo=f;
    document.addEventListener('keydown',teclaJanela);
    requestAnimationFrame(function(){f.classList.add('aberta');});
    f.addEventListener('click',async function(ev){
      if(ev.target===f){fecharJanela();return;}
      var a=ev.target.closest('[data-and-proc]');
      if(a){irParaFicha(ev,a.dataset.andProc);return;}
      var b=ev.target.closest('[data-and],[data-and-dias]');if(!b)return;
      if(b.dataset.andDias){
        J.dias=Number(b.dataset.andDias);
        f.querySelectorAll('[data-and-dias]').forEach(function(x){x.classList.toggle('active',x===b);});
        setTimeout(feed,reduzido()?0:420);return;
      }
      var acao=b.dataset.and;
      if(acao==='fechar'){fecharJanela();return;}
      if(acao==='so'){J.soImp=!J.soImp;b.classList.toggle('active',J.soImp);b.setAttribute('aria-pressed',String(J.soImp));feed();return;}
      if(acao==='ligar'||acao==='desligar'){await salvarRobo({p_ativo:acao==='ligar'},acao==='ligar'?'Robô ligado: consulta de madrugada, entre 1h e 6h40.':'Robô diário desligado.');return;}
      if(acao==='todos'){await carregarTudo(b);return;}
      if(acao==='testar'){await testarLigacao(b);return;}
      if(acao==='chave-mostrar'){var c=f.querySelector('.and-robo-chave');recolher(c,!c.hidden);return;}
      if(acao==='freq-salvar'){
        var da=parseInt((f.querySelector('#andDiasAtivos')||{}).value,10),dd=parseInt((f.querySelector('#andDiasDemais')||{}).value,10);
        if(!(da>=1&&da<=90)||!(dd>=1&&dd<=365)){aviso('Ativos: de 1 a 90 dias. Encerrados e sacados: de 1 a 365 dias.','error');return;}
        await salvarRobo({p_dias_ativos:da,p_dias_demais:dd},'Frequência salva: ativos a cada '+da+' dia(s); encerrados e sacados a cada '+dd+' dia(s).');return;
      }
      if(acao==='chave-salvar'){var v=(f.querySelector('#andChave')||{}).value||'';await salvarRobo({p_chave:v.trim()},v.trim()?'Chave colada. O robô passa a usar esta chave.':'O robô volta a buscar a chave sozinho na página do CNJ.');return;}
    });
    var rb=await A.sb.rpc('datajud_robo');
    J.ehAdmin=!!(rb.data&&rb.data.admin);
    await robo(rb.data);
    await feed();
  }
  async function robo(info){
    var el=J.fundo&&J.fundo.querySelector('#andRobo');if(!el)return;
    var html='';
    if(J.ehAdmin){
      var s=await A.sb.rpc('datajud_situacao');
      if(s.error){el.innerHTML='';return;}
      var d=s.data||{};
      var ult=(d.execucoes||[])[0];
      html='<div class="and-robo"><div class="and-robo-l1"><span class="and-robo-sit'+(d.ativo?' ligado':'')+'"><i></i>Robô de madrugada (1h às 6h40): '+(d.ativo?'ligado':'desligado')+'</span>'
        +'<div class="and-robo-bts">'
          +(d.ativo?'<button type="button" class="btn-secondary" data-and="desligar">Desligar</button>':'<button type="button" class="btn-primary" data-and="ligar">Ligar o robô</button>')
          +'<button type="button" class="btn-secondary" data-and="todos">Carregar tudo agora</button>'
          +'<button type="button" class="btn-secondary" data-and="testar">Testar a ligação</button>'
        +'</div></div>'
        +'<div class="and-robo-num">'+(d.total_numeros!=null?d.total_numeros:d.na_fila)+' número(s) de processo e recurso no Jurídico · '+d.consultados+' já consultado(s) · '+d.encontrados+' encontrado(s) no CNJ · '+d.andamentos+' andamento(s)'
          +(d.aguardando?' · <span class="and-amarelo">'+d.aguardando+' com erro passageiro (o robô tenta de novo sozinho)</span>':'')
          +(d.com_erro?' · '+d.com_erro+' com erro':'')+'</div>'
        +((d.erros_motivos||[]).length?'<ul class="and-robo-erros">'+d.erros_motivos.map(function(x){
            return '<li class="'+(x.passageiro?'and-amarelo':'and-vermelho')+'">'+x.quantos+' número(s): '+e(x.erro)+(x.ultima?' (última tentativa '+e(relativo(x.ultima))+')':'')
              +(x.passageiro?' · o robô tenta de novo sozinho na próxima rodada':' · precisa de conferência')+'</li>';}).join('')+'</ul>':'')
        +'<div class="and-robo-num and-freq">Consulta cada processo: ativos a cada <input id="andDiasAtivos" type="number" min="1" max="90" value="'+(d.dias_ativos||7)+'" aria-label="Dias entre consultas dos processos ativos"> dias · encerrados e sacados a cada <input id="andDiasDemais" type="number" min="1" max="365" value="'+(d.dias_demais||30)+'" aria-label="Dias entre consultas dos encerrados e sacados"> dias <button type="button" class="btn-secondary" data-and="freq-salvar">Salvar</button><br>Intimação nova ligada ao processo: consultado na próxima rodada, com prioridade.</div>'
        +(ult?'<ul class="and-robo-exec"><li>Última rodada ('+e(relativo(ult.inicio))+'): '+e(ult.mensagem||(ult.fim?'terminou':'em andamento...'))+'</li></ul>':'')
        +'<div class="and-robo-num">Chave pública do CNJ: '+(d.chave?(d.chave_origem==='manual'?'colada à mão':'buscada sozinha na página do CNJ')+' ('+e(d.chave)+')':'o robô busca sozinho na página do CNJ na 1ª consulta')
          +' · <button type="button" class="and-ver" data-and="chave-mostrar" style="margin:0;padding:0">'+(d.chave_origem==='manual'?'trocar':'colar à mão')+'</button></div>'
        +'<div class="and-robo-chave" hidden><input id="andChave" type="text" autocomplete="off" spellcheck="false" placeholder="Cole aqui a chave pública (vazio = buscar sozinho na página do CNJ)"><button type="button" class="btn-secondary" data-and="chave-salvar">Salvar chave</button></div>'
        +'</div>';
    }else if(info){
      html='<div class="and-robo"><span class="and-robo-sit'+(info.ativo?' ligado':'')+'"><i></i>Robô diário: '+(info.ativo?'ligado (de madrugada, entre 1h e 6h40)':'desligado')+'</span>'
        +(info.ultima&&info.ultima.inicio?'<div class="and-robo-num">Última rodada '+e(relativo(info.ultima.inicio))+'.</div>':'')+'</div>';
    }
    el.innerHTML=html;
  }
  async function salvarRobo(args,ok){
    var r=await A.sb.rpc('datajud_config_salvar',Object.assign({p_ativo:null,p_chave:null,p_dias_aviso:null},args));
    if(r.error){aviso(r.error.message||'Não consegui salvar.','error');return;}
    aviso(ok,'success');
    await robo();
  }
  async function chamarRobo(corpo){
    var r=await A.sb.functions.invoke('datajud-andamentos',{body:corpo});
    var d=r.data||{};
    if(r.error&&!d.mensagem){try{d=await r.error.context.json();}catch(x){d={ok:false,mensagem:'Não consegui falar com o robô agora.'};}}
    return d;
  }
  // 1ª carga: o DataJud demora (~50 s por consulta), então cada chamada faz uma parte e a tela chama de novo até a fila acabar
  async function carregarTudo(b){
    var texto='Consultar agora no CNJ todos os processos do Jurídico? Leva alguns minutos (o CNJ responde devagar); pode continuar usando o sistema em outra aba. Os andamentos antigos entram como já vistos, sem aviso no sino.';
    var sim=typeof global.sagaConfirmar==='function'?await global.sagaConfirmar('Carregar os andamentos',texto,'Carregar agora',false):global.confirm(texto);
    if(!sim)return;
    b.disabled=true;var t=b.textContent;
    var d={},rodada=0,consultados=0,novos=0;
    do{
      rodada++;
      b.innerHTML='<span class="and-roda" aria-hidden="true"></span> Consultando o CNJ...'+(d.restantes?' faltam '+d.restantes:'');
      d=await chamarRobo({acao:'todos'});
      consultados+=Number(d.consultados||0);novos+=Number(d.novos||0);
    }while(d.ok&&d.parou&&d.restantes>0&&rodada<15&&J.fundo);
    var msg=d.ok?('Pronto: '+consultados+' número(s) consultado(s) e '+novos+' andamento(s) trazido(s).'+(d.restantes?' Ainda faltam '+d.restantes+': o robô continua de madrugada.':'')):(d.mensagem||'Não consegui carregar agora.');
    aviso(msg,d.ok?'success':'error');
    b.disabled=false;b.textContent=t;
    await robo();await feed();
  }
  async function testarLigacao(b){
    b.disabled=true;var t=b.textContent;b.innerHTML='<span class="and-roda" aria-hidden="true"></span> Testando...';
    var d=await chamarRobo({acao:'testar'});
    var det=(d.resultados||[]).map(function(x){return String(x.tribunal||'').toUpperCase()+': '+(x.erro?x.erro:(x.encontrado?x.andamentos+' andamento(s)':'não encontrado'));}).join(' · ');
    aviso((d.mensagem||'')+(det?' '+det:''),d.ok?'success':'error');
    b.disabled=false;b.textContent=t;
    await robo();
  }
  function rotuloDia(iso){
    var p=partes(iso);if(!p)return '';
    var hoje=partes(new Date().toISOString()),ontem=partes(new Date(Date.now()-864e5).toISOString());
    var dia=p.day+'/'+p.month+'/'+p.year;
    if(dia===hoje.day+'/'+hoje.month+'/'+hoje.year)return 'Hoje';
    if(dia===ontem.day+'/'+ontem.month+'/'+ontem.year)return 'Ontem';
    return dia;
  }
  async function feed(){
    var el=J.fundo&&J.fundo.querySelector('#andFeed');if(!el)return;
    var r=await A.sb.rpc('datajud_recentes',{p_dias:J.dias,p_so_importantes:J.soImp,p_limite:300});
    if(!J.fundo)return;
    if(r.error){el.innerHTML='<p class="and-vazio">Não consegui carregar os andamentos agora.</p>';return;}
    var l=r.data||[];
    if(!l.length){el.innerHTML='<p class="and-vazio">Nenhum andamento '+(J.soImp?'importante ':'')+'nos últimos '+J.dias+' dias.'+(J.ehAdmin?' Se o robô ainda não foi ligado, use <b>Carregar tudo agora</b>.':'')+'</p>';return;}
    var html='',diaAtual='';
    l.forEach(function(m){var d=rotuloDia(m.data_hora);if(d!==diaAtual){diaAtual=d;html+='<div class="and-dia">'+e(d)+'</div>';}html+=item(m,{feed:true});});
    el.innerHTML='<div class="and-lista">'+html+'</div>';
  }

  global.SagaAndamentos={quadro:quadro,carregar:carregar,janela:janela,rolar:rolar,
    _limpar:function(pid){if(pid)delete A.dados[pid];else A.dados={};}};
})(window);
