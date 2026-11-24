/* SAGA ADV · Datas e tempo de serviço dos servidores (24/11/2026, Dr. Victor pelo Diário 5; bloco 424)
   Ajudante comum do Mapa dos servidores (saga_mapa_servidores.js) e da Base única (saga_servidores_base.js):
   filtros por ano de ingresso no serviço público, ingresso no órgão, aposentadoria, início da pensão e anos de serviço público.
   "Tempo para aposentar" é ESTIMATIVA: só os anos de serviço público pelo Portal (sem idade, sexo e tempo fora do serviço público). */
(function(global){
  'use strict';
  var CAMPOS=[['ing','Ingresso no serviço público'],['org','Ingresso no órgão'],['apos','Aposentadoria'],['pens','Início da pensão']];
  var ATALHOS=[['35 anos ou mais','35',''],['30 a 34','30','35'],['25 a 29','25','30'],['menos de 25','','25']];
  var CHAVES=['ing_de','ing_ate','org_de','org_ate','apos_de','apos_ate','pens_de','pens_ate','tempo_min','tempo_max'];
  var AVISO='Estimativa só pelos anos de serviço público do Portal: o Portal não traz idade, sexo nem o tempo fora do serviço público. Serve para achar quem conferir, nunca para decidir sozinho.';
  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function $(id){return document.getElementById(id);}
  function dataBR(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));return m?m[3]+'/'+m[2]+'/'+m[1]:'';}
  function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function vazio(){var o={};CHAVES.forEach(function(k){o[k]='';});return o;}
  function qtd(f){f=f||{};return CHAVES.filter(function(k){return f[k]!=='' && f[k]!=null;}).length;}
  function params(f){var o={};f=f||{};CHAVES.forEach(function(k){if(f[k]!==''&&f[k]!=null)o[k]=String(f[k]);});return o;}
  function anoOk(v){var n=+v;return /^\d{4}$/.test(v)&&n>=1900&&n<=new Date().getFullYear()+1;}
  function estilos(){
    if($('sagaServDatasCss'))return;var s=document.createElement('style');s.id='sagaServDatasCss';
    s.textContent='.sd-datas{flex:1 1 100%;border:1px solid var(--border-soft);border-radius:10px;background:var(--panel);margin:2px 0}'+
      '.sd-datas>summary{cursor:pointer;padding:8px 12px;font-size:12.5px;color:var(--text);list-style:none;display:flex;gap:8px;align-items:center}'+
      '.sd-datas>summary::-webkit-details-marker{display:none}.sd-datas>summary::before{content:"›";display:inline-block;transition:transform .3s cubic-bezier(.22,.78,.25,1)}'+
      '.sd-datas[open]>summary::before{transform:rotate(90deg)}.sd-datas.sd-parado>summary::before{transition:none}'+
      '.sd-num{font-size:11px;border-radius:999px;padding:1px 8px;background:color-mix(in srgb,var(--gold) 18%,transparent);color:var(--text)}'+
      '.sd-corpo{padding:4px 12px 12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px 18px}'+
      '.sd-linha{display:flex;flex-direction:column;gap:4px}.sd-linha>span{font-size:11.5px;color:var(--muted)}'+
      '.sd-par{display:flex;gap:6px;align-items:center}.sd-par input{width:86px;min-width:0}.sd-par em{font-style:normal;white-space:nowrap;font-size:11.5px;color:var(--muted)}'+
      '.sd-atalhos{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.sd-atalhos .pill{font-size:11.5px;padding:3px 10px}'+
      '.sd-nota{grid-column:1/-1;font-size:11.5px;color:var(--muted);line-height:1.5}'+
      '.sd-est{font-size:11px;color:#c98500}'+
      '@media(max-width:700px){.sd-corpo{grid-template-columns:1fr}.sd-par input{flex:1 1 40%;width:auto}}';
    document.head.appendChild(s);
  }
  // bloco recolhível com os filtros; pre = prefixo único dos ids
  function html(pre,f){
    estilos();f=f||vazio();var n=qtd(f);
    var linhas=CAMPOS.map(function(c){var k=c[0];
      return '<div class="sd-linha"><span>'+esc(c[1])+' (ano)</span><div class="sd-par">'+
        '<input type="text" inputmode="numeric" maxlength="4" id="'+pre+'_'+k+'_de" placeholder="de aaaa" value="'+esc(f[k+'_de'])+'" aria-label="'+esc(c[1])+': de (ano)">'+
        '<em>até</em><input type="text" inputmode="numeric" maxlength="4" id="'+pre+'_'+k+'_ate" placeholder="aaaa" value="'+esc(f[k+'_ate'])+'" aria-label="'+esc(c[1])+': até (ano)"></div></div>';}).join('');
    var tempo='<div class="sd-linha"><span>Anos de serviço público (ativo: até hoje; aposentado: até aposentar)</span><div class="sd-par">'+
      '<input type="text" inputmode="numeric" maxlength="2" id="'+pre+'_tempo_min" placeholder="de" value="'+esc(f.tempo_min)+'" aria-label="Anos de serviço: a partir de">'+
      '<em>até</em><input type="text" inputmode="numeric" maxlength="2" id="'+pre+'_tempo_max" placeholder="menos de" value="'+esc(f.tempo_max)+'" aria-label="Anos de serviço: menos de"></div>'+
      '<div class="sd-atalhos" id="'+pre+'_atalhos">'+ATALHOS.map(function(a){var on=String(f.tempo_min||'')===a[1]&&String(f.tempo_max||'')===a[2];
        return '<button type="button" class="pill'+(on?' active':'')+'" data-min="'+a[1]+'" data-max="'+a[2]+'">'+esc(a[0])+'</button>';}).join('')+'</div></div>';
    return '<details class="sd-datas'+(parado()?' sd-parado':'')+'" id="'+pre+'_datas"'+(n?' open':'')+'><summary>Datas e tempo de serviço'+(n?' <span class="sd-num">'+n+' filtro'+(n>1?'s':'')+'</span>':'')+'</summary>'+
      '<div class="sd-corpo">'+linhas+tempo+'<div class="sd-nota">'+esc(AVISO)+' As datas vêm do Portal da Transparência; quem não tem a data no Portal fica de fora quando o filtro é usado.</div></div></details>';
  }
  function contar(pre,f){
    var n=qtd(f),s=document.querySelector('#'+pre+'_datas>summary');if(!s)return;
    var b=s.querySelector('.sd-num');if(n){if(!b){b=document.createElement('span');b.className='sd-num';s.appendChild(b);}b.textContent=n+' filtro'+(n>1?'s':'');}else if(b)b.remove();
  }
  // liga os campos; mudou() é chamado quando um valor válido muda
  function ligar(pre,f,mudou){
    CAMPOS.forEach(function(c){['de','ate'].forEach(function(lado){
      var el=$(pre+'_'+c[0]+'_'+lado),k=c[0]+'_'+lado;if(!el)return;
      el.addEventListener('input',function(){var v=el.value.replace(/\D/g,'').slice(0,4);if(v!==el.value)el.value=v;
        var ok=v===''||anoOk(v);el.style.borderColor=(v.length===4&&!ok)?'var(--danger,#d6452d)':'';
        if(ok&&(v===''||v.length===4)&&f[k]!==v){f[k]=v;contar(pre,f);mudou();}});
    });});
    ['tempo_min','tempo_max'].forEach(function(k){var el=$(pre+'_'+k);if(!el)return;
      el.addEventListener('input',function(){var v=el.value.replace(/\D/g,'').slice(0,2);if(v!==el.value)el.value=v;if(f[k]!==v){f[k]=v;contar(pre,f);marcarAtalho(pre,f);mudou();}});});
    var at=$(pre+'_atalhos');if(at)at.addEventListener('click',function(e){var b=e.target.closest('[data-min]');if(!b)return;
      var ja=b.classList.contains('active');f.tempo_min=ja?'':b.dataset.min;f.tempo_max=ja?'':b.dataset.max;
      $(pre+'_tempo_min').value=f.tempo_min;$(pre+'_tempo_max').value=f.tempo_max;contar(pre,f);marcarAtalho(pre,f);mudou();});
  }
  function marcarAtalho(pre,f){var at=$(pre+'_atalhos');if(!at)return;at.querySelectorAll('[data-min]').forEach(function(b){b.classList.toggle('active',String(f.tempo_min||'')===b.dataset.min&&String(f.tempo_max||'')===b.dataset.max);});}
  // texto dos filtros (PDF, registro)
  function descricao(f){
    var p=[];f=f||{};
    CAMPOS.forEach(function(c){var de=f[c[0]+'_de'],ate=f[c[0]+'_ate'];if(de||ate)p.push(c[1].toLowerCase()+' '+(de&&ate?de+' a '+ate:de?'a partir de '+de:'até '+ate));});
    if(f.tempo_min||f.tempo_max)p.push('anos de serviço '+(f.tempo_min&&f.tempo_max?f.tempo_min+' a menos de '+f.tempo_max:f.tempo_min?f.tempo_min+' ou mais':'menos de '+f.tempo_max)+' (estimativa)');
    return p;
  }
  function anos(t){if(t==null||t==='')return '';var n=Math.floor(+t);return n+(n===1?' ano':' anos');}
  // linha curta para a lista: ingresso e anos de serviço
  function curto(d){
    if(!d)return '';var p=[];
    if(d.ingresso)p.push('ingresso '+String(d.ingresso).slice(0,4));
    if(d.tempo_servico!=null)p.push(anos(d.tempo_servico)+' de serviço'+(d.tempo_estimativa?' (estimativa)':''));
    return p.join(' · ');
  }
  function faixa(t){if(t==null)return '';t=+t;return t>=35?'35 anos ou mais: pode já ter tempo para se aposentar':t>=30?'30 a 34 anos: perto do tempo para se aposentar':t>=25?'25 a 29 anos':'menos de 25 anos';}
  // quadro da janela da pessoa
  function quadro(d){
    if(!d||!(d.ingresso||d.ingresso_orgao||d.aposentadoria||d.pensao_inicio))return '<div class="bu-lin">O Portal não traz datas desta pessoa.</div>';
    var p=[];
    if(d.ingresso)p.push('<div class="bu-lin">Ingresso no serviço público: <b>'+esc(dataBR(d.ingresso))+'</b></div>');
    if(d.ingresso_orgao)p.push('<div class="bu-lin">Ingresso no órgão: <b>'+esc(dataBR(d.ingresso_orgao))+'</b></div>');
    if(d.aposentadoria)p.push('<div class="bu-lin">Aposentadoria: <b>'+esc(dataBR(d.aposentadoria))+'</b></div>');
    if(d.pensao_inicio)p.push('<div class="bu-lin">Pensão desde: <b>'+esc(dataBR(d.pensao_inicio))+'</b></div>');
    if(d.tempo_servico!=null)p.push('<div class="bu-lin">Tempo de serviço público: <b>'+esc(anos(d.tempo_servico))+'</b>'+(d.tempo_estimativa?' até hoje <span class="sd-est">· estimativa: '+esc(faixa(d.tempo_servico))+'</span><span class="bu-sub">'+esc(AVISO)+'</span>':' (do ingresso até a aposentadoria)')+'</div>');
    return p.join('');
  }
  global.SagaServidoresDatas={vazio:vazio,qtd:qtd,params:params,html:html,ligar:ligar,descricao:descricao,curto:curto,quadro:quadro,anos:anos,faixa:faixa,dataBR:dataBR,AVISO:AVISO};
})(window);
