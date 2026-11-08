/* =====================================================================================
   SAGA · Prazos em dias úteis (08/11)
   Conta prazos pulando sábados, domingos e os feriados com o escritório fechado
   (Ponto Eletrônico > feriados). Nas intimações, usa também o recesso forense de 20/12 a 20/01
   (art. 220 do CPC) e a regra do Diário eletrônico (Lei 11.419/2006, art. 4º, §§ 3º e 4º):
   publicação = 1º dia útil depois da disponibilização; o prazo começa no dia útil seguinte.
   É uma AJUDA: feriados próprios do tribunal (ex.: suspensões por portaria) não entram na conta.
   Uso: SagaPrazos.ligar(input, {sb, modo:'intimacao'|'tarefa', inicio:'AAAA-MM-DD' ou função, sugestao:N ou função})
   ===================================================================================== */
(function(global){
  'use strict';
  var feriados=null,pedido=null;
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function data(s){var p=String(s).slice(0,10).split('-');return new Date(+p[0],+p[1]-1,+p[2],12);}
  function br(s){var d=data(s);return ['dom','seg','ter','qua','qui','sex','sáb'][d.getDay()]+', '+String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
  function carregar(sb){
    if(feriados)return Promise.resolve(feriados);
    if(pedido)return pedido;
    pedido=(async function(){
      var m={};
      try{var r=await sb.from('ponto_feriados').select('data,descricao,liberado');(r.data||[]).forEach(function(f){if(f.liberado!==false)m[String(f.data).slice(0,10)]=f.descricao||'Feriado';});}catch(e){}
      feriados=m;return m;
    })();
    return pedido;
  }
  function recesso(d){var mes=d.getMonth()+1,dia=d.getDate();return (mes===12&&dia>=20)||(mes===1&&dia<=20);}
  // por que o dia não é útil (ou '' se for útil)
  function motivo(d,opc){
    var w=d.getDay();if(w===0)return 'domingo';if(w===6)return 'sábado';
    var k=iso(d);if(feriados&&feriados[k])return feriados[k];
    if(opc&&opc.recesso&&recesso(d))return 'recesso forense';
    return '';
  }
  function util(d,opc){return !motivo(d,opc);}
  function proximoUtil(d,opc){var x=new Date(d);do{x.setDate(x.getDate()+1);}while(!util(x,opc));return x;}
  // soma N dias úteis: o dia do começo não conta (art. 224 do CPC); conta a partir do dia útil seguinte
  function somar(inicioISO,n,opc){var d=data(inicioISO);for(var i=0;i<n;i++)d=proximoUtil(d,opc);return iso(d);}
  // intimação pelo Diário: disponibilizada em D → publicada no 1º dia útil depois → prazo a partir daí
  function prazoIntimacao(disponibilizacaoISO,n){var opc={recesso:true};var pub=proximoUtil(data(disponibilizacaoISO),opc);return {publicacao:iso(pub),vencimento:somar(iso(pub),n,opc)};}
  // tenta achar no texto "prazo de 15 dias" / "no prazo de 5 (cinco) dias úteis" / "manifestação em 15 dias"
  function prazoDoTexto(t){t=String(t||'');var m=/prazo (?:comum )?(?:de|em) (\d{1,3})\s*(?:\([^)]{1,30}\))?\s*dias/i.exec(t)||/\b(?:em|dentro de) (\d{1,3})\s*(?:\([^)]{1,30}\))?\s*dias/i.exec(t);return m?Math.min(365,+m[1]):null;}

  // Sugere o prazo de resposta de uma intimação (o advogado confirma). Ordem: prazo escrito no texto;
  // regras pelo que a intimação pede; regras pelo tipo do ato; se nada bater, 5 dias (art. 218, § 3º, do CPC).
  function sugerir(o){
    o=o||{};var t=String(o.texto||''),tipo=String(o.tipo||'').toLowerCase();
    var jef=/juizado/i.test(String(o.orgao||''))||/juizado especial/i.test(t.slice(0,800));
    var n=prazoDoTexto(t),motivo;
    if(n)motivo='prazo escrito na intimação';
    else if(/embargos de declara/i.test(t)&&/(contrarraz|manifest|resposta)/i.test(t)){n=5;motivo='resposta aos embargos de declaração (art. 1.023, § 2º, do CPC)';}
    else if(/contrarraz/i.test(t)){n=jef?10:15;motivo=jef?'contrarrazões ao recurso no Juizado (art. 42, § 2º, da Lei 9.099/95)':'contrarrazões ao recurso (art. 1.003, § 5º, do CPC)';}
    else if(/r[ée]plica|sobre a contesta|(?:à|a) contesta[çc][ãa]o/i.test(t)){n=15;motivo='réplica à contestação (arts. 350 e 351 do CPC)';}
    else if(/(laudo|per[íi]cia|pericial)/i.test(t)&&/manifest/i.test(t)){n=15;motivo='manifestação sobre o laudo (art. 477, § 1º, do CPC)';}
    else if(/senten[çc]a/.test(tipo)){n=jef?10:15;motivo=jef?'recurso inominado contra a sentença (art. 42 da Lei 9.099/95)':'apelação contra a sentença (art. 1.003, § 5º, do CPC)';}
    else if(/ac[óo]rd[ãa]o/.test(tipo)){n=15;motivo='recurso contra o acórdão (art. 1.003, § 5º, do CPC)';}
    else if(/decis[ãa]o/.test(tipo)&&!jef){n=15;motivo='agravo de instrumento contra a decisão (arts. 1.003, § 5º, e 1.015 do CPC)';}
    else{n=5;motivo='sem prazo escrito: prazo geral de 5 dias (art. 218, § 3º, do CPC)';}
    var r=prazoIntimacao(o.disponibilizacao||iso(new Date()),n);
    return {dias:n,motivo:motivo,doTexto:motivo==='prazo escrito na intimação',publicacao:r.publicacao,vencimento:r.vencimento};
  }

  function estilos(){
    if(document.getElementById('sagaPrazosCss'))return;
    var s=document.createElement('style');s.id='sagaPrazosCss';
    s.textContent='.sp-prazos{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:6px}'+
      '.sp-prazos button{font:inherit;font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid var(--border-soft,var(--border));background:color-mix(in srgb,var(--text) 5%,transparent);color:var(--text);cursor:pointer;transition:background-color .2s cubic-bezier(.22,.78,.25,1),border-color .2s cubic-bezier(.22,.78,.25,1)}'+
      '.sp-prazos button:hover{border-color:color-mix(in srgb,var(--gold) 55%,transparent);background:color-mix(in srgb,var(--gold) 12%,transparent)}'+
      '.sp-prazos button.sp-prazo-texto{border-color:color-mix(in srgb,var(--gold) 50%,transparent);background:color-mix(in srgb,var(--gold) 14%,transparent)}'+
      '.sp-prazos-rot{font-size:10.5px;color:var(--muted);flex-basis:100%}'+
      '.sp-prazo-info{font-size:11px;color:var(--muted);margin-top:4px;line-height:1.45}.sp-prazo-info b{color:var(--text);font-weight:600}.sp-prazo-info .sp-prazo-alerta{color:var(--warning,#d97706)}';
    document.head.appendChild(s);
  }
  // Liga os atalhos embaixo de um campo de data
  function ligar(input,cfg){
    if(!input||input._sagaPrazos)return;input._sagaPrazos=true;estilos();
    cfg=cfg||{};var modo=cfg.modo||'tarefa';
    var caixa=document.createElement('div');caixa.className='sp-prazos';
    var info=document.createElement('div');info.className='sp-prazo-info';info.setAttribute('aria-live','polite');
    var alvo=input.parentNode;alvo.appendChild(caixa);alvo.appendChild(info);
    var val=function(x){return typeof x==='function'?x():x;};
    var aplicado=null; // última conta feita pelos botões (mantém a explicação completa)
    function inicio(){return val(cfg.inicio)||iso(new Date());}
    function mostrarInfo(){
      var v=input.value;if(!v){info.textContent='';aplicado=null;return;}
      if(aplicado&&aplicado.v===v){info.innerHTML=aplicado.html;return;}aplicado=null;
      var d=data(v),m=motivo(d,{recesso:modo==='intimacao'});
      info.innerHTML=(m?'<span class="sp-prazo-alerta">Atenção: '+br(v)+' não é dia útil ('+m+'). </span>':'Vence '+'<b>'+br(v)+'</b>. ')+
        (modo==='intimacao'?'Conta feita pelo SAGA (sem sábados, domingos, feriados do escritório e recesso de 20/12 a 20/01); confira feriados e suspensões do tribunal.':'');
    }
    function aplicar(n){
      carregar(cfg.sb||global._sb).then(function(){
        var venc,txt;
        if(modo==='intimacao'){var r=prazoIntimacao(inicio(),n);venc=r.vencimento;txt=n+' dias úteis: publicada em '+br(r.publicacao)+', vence em ';}
        else{venc=somar(inicio(),n,{recesso:false});txt=n+' dias úteis a partir de hoje: vence em ';}
        aplicado={v:venc,html:txt+'<b>'+br(venc)+'</b>.'+(modo==='intimacao'?' Conta do SAGA (sem sábados, domingos, feriados do escritório e recesso); confira feriados e suspensões do tribunal.':'')};
        input.value=venc;info.innerHTML=aplicado.html;
        input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
      });
    }
    function desenhar(){
      var sug=val(cfg.sugestao);var ns=[5,10,15,30];
      caixa.innerHTML='<span class="sp-prazos-rot">Prazo em dias úteis:</span>'+
        (sug&&ns.indexOf(sug)<0?'<button type="button" class="sp-prazo-texto" data-n="'+sug+'" title="Prazo encontrado no texto da intimação">'+sug+' (do texto)</button>':'')+
        ns.map(function(n){return '<button type="button" data-n="'+n+'"'+(sug===n?' class="sp-prazo-texto" title="Prazo encontrado no texto da intimação"':'')+'>'+n+(sug===n?' (do texto)':'')+'</button>';}).join('');
    }
    caixa.addEventListener('click',function(e){var b=e.target.closest('[data-n]');if(!b||input.disabled)return;e.preventDefault();aplicar(+b.dataset.n);});
    input.addEventListener('change',function(){carregar(cfg.sb||global._sb).then(mostrarInfo);});
    desenhar();carregar(cfg.sb||global._sb).then(mostrarInfo);
    return {redesenhar:function(){aplicado=null;desenhar();carregar(cfg.sb||global._sb).then(mostrarInfo);}};
  }
  global.SagaPrazos={ligar:ligar,carregar:carregar,sugerir:sugerir,dataBR:br,somar:somar,prazoIntimacao:prazoIntimacao,prazoDoTexto:prazoDoTexto,diaUtil:function(s,opc){return util(data(s),opc);}};
})(window);
