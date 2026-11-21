/* SAGA · LINHA DO TEMPO DO PROCESSO (21/11/2026, ideia 3 do check-up; Dr. Victor pelo Diário 5; bloco 355).
   Bloco "Linha do tempo" da ficha (data-bloco="linha_tempo"): tudo o que aconteceu no processo numa lista só, do mais
   novo para o mais antigo (intimações, andamentos do CNJ, comentários, tarefas, documentos, agenda, etapas, petições da
   Renata, relatórios), pela processo_linha_tempo (SECURITY INVOKER: cada pessoa só vê o que já pode ver).
   - Começa FECHADO e só pede ao banco quando a pessoa abre (a ficha não fica mais lenta); troca de processo recarrega.
   - Filtros por tipo (vários ao mesmo tempo), "Só o importante", busca no que já veio, 50 por vez ("Ver mais").
   - Texto de fora sempre por sagaEsc; erro à vista com o motivo (sagaErroBanco). */
(function(){
  'use strict';
  var TIPOS=[['intimacao','Intimações','📨'],['andamento','Andamentos','⚖️'],['comentario','Comentários','💬'],['tarefa','Tarefas','✔️'],
    ['documento','Documentos','📄'],['compromisso','Agenda','📅'],['situacao','Etapas','🔀'],['peca','Petições','✍️'],['relatorio','Relatórios','📤']];
  var ICONE={tarefa_concluida:'✅'};TIPOS.forEach(function(t){ICONE[t[0]]=t[2];});
  var esc=function(v){return window.sagaEsc?window.sagaEsc(v==null?'':String(v)):String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');};
  var S={pid:null,itens:[],temMais:false,tipos:[],importante:false,busca:'',carregando:false,erro:'',pedido:0};
  var sec,box;

  function processoAtual(){try{return (typeof state!=='undefined'&&state.activeView!=='location'&&state.activeProcessId)||null;}catch(e){return null;}}
  function aberto(){return sec&&!sec.classList.contains('fb-fechado')&&!sec.classList.contains('fb-oculto');}
  function nomeDe(id){if(!id)return '';var n=window.sagaNomePessoa&&window.sagaNomePessoa(id);
    if(!n){try{var u=(state.todosUsuarios||state.responsaveis||[]).find(function(x){return x.id===id;});n=u&&u.nome_completo;}catch(e){}}
    return n?(window.sagaNomeExibicao?window.sagaNomeExibicao(n):String(n).split(' ')[0]):'';}
  function dataHora(iso){var d=new Date(iso);if(isNaN(d))return '';var p=function(n){return String(n).padStart(2,'0');};
    var h=p(d.getHours())+':'+p(d.getMinutes());return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+(h==='00:00'?'':' '+h);}

  async function carregar(mais){
    var pid=processoAtual();if(!pid||!window._sb&&typeof _sb==='undefined')return;
    var sb=window._sb||_sb;
    var meu=++S.pedido;S.carregando=true;S.erro='';if(!mais){S.itens=[];S.temMais=false;}S.pid=pid;desenhar();
    var antes=mais&&S.itens.length?S.itens[S.itens.length-1].quando:null;
    var r;try{r=await sb.rpc('processo_linha_tempo',{p_processo:pid,p_tipos:S.tipos.length?S.tipos:null,p_antes:antes,p_limite:50,p_so_importante:S.importante});}
    catch(e){r={error:{message:String(e&&e.message||e)}};}
    if(meu!==S.pedido)return;
    S.carregando=false;
    if(r.error){S.erro=/processo_linha_tempo|PGRST202/.test((r.error.message||'')+(r.error.code||''))?'A linha do tempo ainda não foi ligada no banco (bloco 355). Avise o administrador.':'Não foi possível carregar a linha do tempo: '+(window.sagaErroBanco?window.sagaErroBanco(r.error):(r.error.message||'erro'));desenhar();return;}
    var d=r.data||{};S.itens=S.itens.concat(d.itens||[]);S.temMais=!!d.tem_mais;desenhar();
  }
  function link(it){
    switch(it.tipo){
      case 'intimacao':return {href:'monitoramento_multi_oab.html?intimacao='+encodeURIComponent(it.id)};
      case 'tarefa':case 'tarefa_concluida':return {href:'minhas_tarefas.html?tarefa='+encodeURIComponent(it.id)};
      case 'compromisso':return {href:'calendario_padrao_metalico.html'};
      case 'peca':return {href:'agentes_aprovar.html'};
      case 'andamento':return {bloco:'andamentos'};
      case 'comentario':return {bloco:'comentarios'};
      case 'documento':case 'relatorio':return {bloco:'pastas'};
      default:return null;}
  }
  function desenhar(){
    if(!box)return;
    var q=S.busca.trim().toLowerCase();
    var lista=S.itens.filter(function(it){return !q||[it.titulo,it.texto,nomeDe(it.quem)].join(' ').toLowerCase().indexOf(q)>=0;});
    var h='<div class="lt-barra"><div class="lt-tipos" role="group" aria-label="Tipos">'+
      TIPOS.map(function(t){return '<button type="button" class="lt-tipo'+(S.tipos.indexOf(t[0])>=0?' active':'')+'" data-lt-tipo="'+t[0]+'" aria-pressed="'+(S.tipos.indexOf(t[0])>=0)+'">'+t[2]+' '+esc(t[1])+'</button>';}).join('')+
      '</div><div class="lt-linha2"><label class="lt-imp"><input type="checkbox" data-lt-imp'+(S.importante?' checked':'')+'> Só o importante</label>'+
      '<div class="lt-busca"><input type="search" data-lt-busca placeholder="Buscar na linha do tempo" value="'+esc(S.busca)+'" aria-label="Buscar na linha do tempo"></div>'+
      (S.tipos.length||S.importante?'<button type="button" class="lt-limpar" data-lt-limpar>Limpar filtros</button>':'')+'</div></div>';
    if(S.erro)h+='<div class="lt-erro" role="alert">'+esc(S.erro)+' <button type="button" class="lt-limpar" data-lt-tentar>Tentar de novo</button></div>';
    else if(!S.carregando&&!lista.length)h+='<div class="lt-vazio">'+(q?'Nada com esse texto no que já foi carregado.':'Nada registrado neste processo'+(S.tipos.length||S.importante?' com esses filtros':'')+'.')+'</div>';
    h+='<ol class="lt-lista">'+lista.map(function(it){var l=link(it),quem=nomeDe(it.quem);
      var tag=l&&l.href?'a':'button',attr=l&&l.href?' href="'+esc(l.href)+'"':(l&&l.bloco?' type="button" data-lt-bloco="'+esc(l.bloco)+'"':' type="button" disabled');
      return '<li class="lt-item'+(it.importante?' imp':'')+'"><span class="lt-ico" aria-hidden="true">'+(ICONE[it.tipo]||'•')+'</span>'+
        '<'+tag+' class="lt-cont"'+attr+'><span class="lt-tit">'+esc(it.titulo)+'</span>'+
        '<span class="lt-meta">'+esc(dataHora(it.quando))+(quem?' · '+esc(quem):'')+'</span>'+
        (it.texto?'<span class="lt-txt">'+esc(it.texto)+'</span>':'')+'</'+tag+'></li>';}).join('')+'</ol>';
    if(S.carregando)h+='<div class="lt-vazio">Carregando…</div>';
    else if(S.temMais&&!S.erro)h+='<button type="button" class="lt-mais" data-lt-mais>Ver mais</button>';
    box.innerHTML=h;
  }
  var CSS='.lt-barra{display:grid;gap:8px;margin-bottom:12px}.lt-tipos{display:flex;flex-wrap:wrap;gap:6px}'+
    '.lt-tipo{font-size:11.5px;padding:5px 10px;border-radius:999px;border:1px solid var(--border-soft);background:none;color:var(--muted);cursor:pointer;min-height:30px}'+
    '.lt-tipo.active{color:var(--text);border-color:color-mix(in srgb,var(--gold) 45%,transparent);background:color-mix(in srgb,var(--gold) 12%,transparent)}'+
    '.lt-linha2{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.lt-imp{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--muted)}'+
    '.lt-busca{flex:1;min-width:180px}.lt-busca input{width:100%;min-height:34px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);padding:6px 10px;font:inherit;font-size:12.5px}'+
    '.lt-limpar,.lt-mais{font-size:12px;padding:6px 12px;border-radius:9px;border:1px solid var(--border-soft);background:none;color:var(--text);cursor:pointer}.lt-mais{display:block;margin:10px auto 0}'+
    '.lt-lista{list-style:none;margin:0;padding:0 0 0 14px;border-left:2px solid var(--border-soft);display:grid;gap:6px}'+
    '.lt-item{position:relative;display:flex;gap:8px;align-items:flex-start}.lt-ico{position:absolute;left:-26px;top:6px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;background:var(--panel);border:1px solid var(--border-soft)}'+
    '.lt-item.imp .lt-ico{border-color:var(--gold)}'+
    '.lt-cont{all:unset;box-sizing:border-box;display:grid;gap:2px;width:100%;padding:7px 10px 7px 12px;border-radius:9px;cursor:pointer;min-width:0}'+
    '.lt-cont:hover,.lt-cont:focus-visible{background:color-mix(in srgb,var(--text) 5%,transparent)}.lt-cont:focus-visible{outline:2px solid var(--gold)}.lt-cont[disabled]{cursor:default}'+
    '.lt-tit{font-size:13px;color:var(--text);font-weight:600;overflow-wrap:anywhere}.lt-meta{font-size:11px;color:var(--muted)}.lt-txt{font-size:12px;color:var(--muted);overflow-wrap:anywhere;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'+
    '.lt-vazio{font-size:12.5px;color:var(--muted);padding:6px 0}.lt-erro{font-size:12.5px;color:var(--danger);padding:8px 10px;border:1px solid color-mix(in srgb,var(--danger) 40%,transparent);border-radius:9px;margin-bottom:8px}'+
    '@media(pointer:coarse){.lt-tipo{min-height:38px}}';

  function conferir(){if(!aberto())return;var pid=processoAtual();if(pid&&(pid!==S.pid||(!S.itens.length&&!S.carregando&&!S.erro)))carregar(false);
    if(!pid&&box)box.innerHTML='<div class="lt-vazio">Escolha um processo para ver a linha do tempo.</div>';}
  var tmTroca=null;
  function iniciar(){
    sec=document.querySelector('[data-bloco="linha_tempo"]');box=document.getElementById('linhaTempoFicha');if(!sec||!box)return;
    var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
    new MutationObserver(function(){conferir();}).observe(sec,{attributes:true,attributeFilter:['class']});
    var abas=document.getElementById('processTabs');
    if(abas)new MutationObserver(function(){clearTimeout(tmTroca);tmTroca=setTimeout(function(){if(processoAtual()!==S.pid){S.itens=[];S.pid=null;}conferir();},250);}).observe(abas,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    box.addEventListener('click',function(e){
      var t=e.target.closest('[data-lt-tipo]');if(t){var k=t.getAttribute('data-lt-tipo'),i=S.tipos.indexOf(k);if(i>=0)S.tipos.splice(i,1);else S.tipos.push(k);carregar(false);return;}
      if(e.target.closest('[data-lt-limpar]')){S.tipos=[];S.importante=false;carregar(false);return;}
      if(e.target.closest('[data-lt-tentar]')){carregar(false);return;}
      if(e.target.closest('[data-lt-mais]')){carregar(true);return;}
      var b=e.target.closest('[data-lt-bloco]');if(b){var k2=b.getAttribute('data-lt-bloco');if(window.SagaFichaBlocos&&SagaFichaBlocos.abrir)SagaFichaBlocos.abrir(k2);
        var alvo=document.querySelector('[data-bloco="'+k2+'"]');if(alvo)alvo.scrollIntoView({behavior:document.documentElement.classList.contains('saga-sem-movimento')?'auto':'smooth',block:'start'});}
    });
    box.addEventListener('change',function(e){if(e.target.matches('[data-lt-imp]')){S.importante=e.target.checked;carregar(false);}});
    var tmB=null;box.addEventListener('input',function(e){if(e.target.matches('[data-lt-busca]')){S.busca=e.target.value;clearTimeout(tmB);tmB=setTimeout(function(){var pos=e.target.selectionStart;desenhar();var n=box.querySelector('[data-lt-busca]');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}},200);}});
    conferir();
  }
  window.SagaLinhaTempo={recarregar:function(){carregar(false);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
