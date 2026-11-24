/* SAGA ADV · Datas e tempo de serviço dos servidores (24/11/2026, Dr. Victor pelo Diário 5; bloco 424)
   Ajudante comum do Mapa dos servidores (saga_mapa_servidores.js) e da Base única (saga_servidores_base.js):
   filtros por ano de ingresso no serviço público, ingresso no órgão, aposentadoria, início da pensão e anos de serviço público.
   "Tempo para aposentar" é ESTIMATIVA: só os anos de serviço público pelo Portal (sem idade, sexo e tempo fora do serviço público). */
(function(global){
  'use strict';
  var CAMPOS=[['ing','Ingresso no serviço público'],['org','Ingresso no órgão'],['apos','Aposentadoria'],['pens','Início da pensão']];
  var ATALHOS=[['35 anos ou mais','35',''],['30 a 34','30','35'],['25 a 29','25','30'],['menos de 25','','25']];
  var CHAVES=['ing_de','ing_ate','org_de','org_ate','apos_de','apos_ate','pens_de','pens_ate','tempo_min','tempo_max','abono','ferias_sem','d13_sem','apos_ir','apos_tipo'];
  // 24/11 (bloco 426): abono de permanência e Tema 1.233 (abono no 13º e no 1/3 de férias). ESTIMATIVA a conferir.
  var ABONO={recebe:'Recebe abono',nao:'Não recebe abono',poderia:'Poderia aposentar (35+ anos) e não recebe abono'};
  var AVISO_ABONO='Abono = "Outras remunerações eventuais" igual ao PSS do mês no Portal (provável). 13º e 1/3 de férias sem o abono = a conta do Portal não inclui o abono (Tema 1.233 do STJ). Tudo estimativa a conferir.';
  // 24/11 (bloco 427, LGPD aprovado pelo Dr. Victor): aposentado por invalidez/incapacidade × IR. Texto sempre neutro.
  var APOS_IR={qualquer:'Ainda paga IR ou IR parou',paga:'Ainda paga IR',parou:'IR parou (últimos 24 meses)'};
  var APOS_TIPO={invalidez:'Só invalidez',incapacidade:'Só incapacidade'};
  var NEUTRO='Possível isenção de IR a conferir com o cliente';
  var AVISO='Estimativa só pelos anos de serviço público do Portal: o Portal não traz idade, sexo nem o tempo fora do serviço público. Serve para achar quem conferir, nunca para decidir sozinho.';
  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function $(id){return document.getElementById(id);}
  function dataBR(d){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));return m?m[3]+'/'+m[2]+'/'+m[1]:'';}
  function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function vazio(){var o={};CHAVES.forEach(function(k){o[k]='';});return o;}
  function qtd(f){f=f||{};return CHAVES.filter(function(k){return f[k]!=='' && f[k]!=null && f[k]!==false && !(k==='apos_tipo'&&!f.apos_ir);}).length;}
  function temAbono(f){f=f||{};return !!(f.abono||f.ferias_sem||f.d13_sem);}
  function temAposIr(f){f=f||{};return !!f.apos_ir;}
  function params(f,semAbono,semAposIr){var o={};f=f||{};CHAVES.forEach(function(k){if(f[k]===''||f[k]==null||f[k]===false)return;if(semAbono&&(k==='abono'||k==='ferias_sem'||k==='d13_sem'))return;if((semAposIr||!f.apos_ir)&&(k==='apos_ir'||k==='apos_tipo'))return;o[k]=(k==='ferias_sem'||k==='d13_sem')?true:String(f[k]);});return o;}
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
      '.sd-chk{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--text)}.sd-linha select{min-width:0}'+
      '@media(max-width:700px){.sd-corpo{grid-template-columns:1fr}.sd-par input{flex:1 1 40%;width:auto}}';
    document.head.appendChild(s);
  }
  // bloco recolhível com os filtros; pre = prefixo único dos ids
  function html(pre,f,op){
    estilos();f=f||vazio();var n=qtd(f);op=op||{};
    var abono=op.abono?'<div class="sd-linha"><span>Abono de permanência (estimativa)</span><select id="'+pre+'_abono" aria-label="Abono de permanência"><option value="">Recebendo ou não</option>'+
      Object.keys(ABONO).map(function(k){return '<option value="'+k+'"'+(f.abono===k?' selected':'')+'>'+esc(ABONO[k])+'</option>';}).join('')+'</select></div>'+
      '<div class="sd-linha"><span>Tema 1.233 (estimativa)</span><label class="sd-chk"><input type="checkbox" id="'+pre+'_ferias_sem"'+(f.ferias_sem?' checked':'')+'> 1/3 de férias sem o abono</label>'+
      '<label class="sd-chk"><input type="checkbox" id="'+pre+'_d13_sem"'+(f.d13_sem?' checked':'')+'> 13º sem o abono</label></div>':'';
    if(op.aposir)abono+='<div class="sd-linha"><span>Aposentado por invalidez ou incapacidade × IR</span><select id="'+pre+'_apos_ir" aria-label="Aposentado por invalidez ou incapacidade e IR"><option value="">Sem este filtro</option>'+
      Object.keys(APOS_IR).map(function(k){return '<option value="'+k+'"'+(f.apos_ir===k?' selected':'')+'>'+esc(APOS_IR[k])+'</option>';}).join('')+'</select>'+
      '<select id="'+pre+'_apos_tipo" aria-label="Tipo de aposentadoria"><option value="">Invalidez e incapacidade</option>'+
      Object.keys(APOS_TIPO).map(function(k){return '<option value="'+k+'"'+(f.apos_tipo===k?' selected':'')+'>'+esc(APOS_TIPO[k])+'</option>';}).join('')+'</select>'+
      '<span class="sd-est">'+esc(NEUTRO)+'</span></div>';
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
      '<div class="sd-corpo">'+linhas+tempo+abono+'<div class="sd-nota">'+esc(AVISO)+' As datas vêm do Portal da Transparência; quem não tem a data no Portal fica de fora quando o filtro é usado.'+(op.abono?' '+esc(AVISO_ABONO):'')+(op.aposir?' Aposentado × IR: tipo de aposentadoria e IR do mês pelo Portal; sem os meses em que o IR parou para a folha inteira. '+esc(NEUTRO)+'.':'')+'</div>'+(op.abono?'<div class="sd-nota" id="'+pre+'_abono_aviso" hidden></div>':'')+'</div></details>';
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
    var ab=$(pre+'_abono');if(ab)ab.addEventListener('change',function(){f.abono=ab.value;contar(pre,f);mudou();});
    ['apos_ir','apos_tipo'].forEach(function(k){var el=$(pre+'_'+k);if(el)el.addEventListener('change',function(){f[k]=el.value;contar(pre,f);mudou();});});
    ['ferias_sem','d13_sem'].forEach(function(k){var el=$(pre+'_'+k);if(el)el.addEventListener('change',function(){f[k]=el.checked;contar(pre,f);mudou();});});
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
    if(f.abono)p.push((ABONO[f.abono]||f.abono).toLowerCase()+' (estimativa)');if(f.ferias_sem)p.push('1/3 de férias sem o abono');if(f.d13_sem)p.push('13º sem o abono');
    if(f.apos_ir)p.push('aposentado por '+(f.apos_tipo||'invalidez ou incapacidade')+': '+(APOS_IR[f.apos_ir]||f.apos_ir).toLowerCase());
    return p;
  }
  function anos(t){if(t==null||t==='')return '';var n=Math.floor(+t);return n+(n===1?' ano':' anos');}
  // linha curta para a lista: ingresso e anos de serviço
  function curto(d){
    if(!d)return '';var p=[];
    if(d.ingresso)p.push('ingresso '+String(d.ingresso).slice(0,4));
    if(d.tempo_servico!=null)p.push(anos(d.tempo_servico)+' de serviço'+(d.tempo_estimativa?' (estimativa)':''));
    if(d.abono&&d.abono.recebe)p.push('recebe abono');
    if(d.abono&&(d.abono.ferias_sem||d.abono.d13_sem))p.push('Tema 1.233: '+[d.abono.ferias_sem?d.abono.ferias_sem+' férias':'',d.abono.d13_sem?d.abono.d13_sem+' 13º':''].filter(Boolean).join(' e ')+' sem o abono (estimativa)');
    if(d.apos_ir&&(d.apos_ir.paga||d.apos_ir.parou_mes))p.push('aposentado por '+d.apos_ir.tipo+': '+(d.apos_ir.paga?'ainda paga IR':'IR parou em '+mesTxt(d.apos_ir.parou_mes))+' (possível isenção a conferir)');
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
    if(d.abono)p.push(quadroAbono(d.abono));
    if(d.apos_ir)p.push('<div class="bu-lin">Aposentadoria por '+esc(d.apos_ir.tipo)+': <b>'+(d.apos_ir.paga?'ainda paga IR'+(d.apos_ir.mes?' em '+esc(mesTxt(d.apos_ir.mes)):''):d.apos_ir.parou_mes?'IR parou em '+esc(mesTxt(d.apos_ir.parou_mes)):'sem IR no último mês lido')+'</b> <span class="sd-est">'+esc(NEUTRO)+'</span></div>');
    return p.join('');
  }
  function reais(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function mesTxt(m){m=String(m||'');return m.length===6?m.slice(4)+'/'+m.slice(0,4):m;}
  function quadroAbono(a){
    var h='<div class="bu-lin">Abono de permanência: <b>'+(a.recebe?'recebe'+(a.valor?' '+esc(reais(a.valor)):''):'não recebe no último mês lido')+'</b>'+
      (a.desde?' <span class="bu-sub">desde '+(a.desde_antes?'antes de ':'')+esc(mesTxt(a.desde))+(a.ultimo_mes&&!a.recebe?' até '+esc(mesTxt(a.ultimo_mes)):'')+'</span>':'')+'</div>';
    if(a.ferias_sem||a.d13_sem)h+='<div class="bu-lin">Tema 1.233 <span class="sd-est">(estimativa a conferir)</span>: '+
      [a.ferias_sem?esc(a.ferias_sem)+' férias com o 1/3 sem o abono (≈ '+esc(reais(a.ferias_dif))+')':'',a.d13_sem?esc(a.d13_sem)+' 13º sem o abono (≈ '+esc(reais(a.d13_dif))+')':''].filter(Boolean).join(' · ')+'</div>';
    if(a.a_conferir)h+='<div class="bu-lin"><span class="bu-sub">'+esc(a.a_conferir)+' mês(es) com férias ou 13º em que a conta não fechou: conferir no contracheque.</span></div>';
    return h;
  }
  global.SagaServidoresDatas={vazio:vazio,qtd:qtd,temAbono:temAbono,temAposIr:temAposIr,NEUTRO:NEUTRO,params:params,html:html,ligar:ligar,descricao:descricao,curto:curto,quadro:quadro,quadroAbono:quadroAbono,reais:reais,anos:anos,faixa:faixa,dataBR:dataBR,AVISO:AVISO,AVISO_ABONO:AVISO_ABONO,ABONO:ABONO};
})(window);
