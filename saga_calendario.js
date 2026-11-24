/* saga_calendario.js — CALENDÁRIO EMBUTIDO em todo campo de data do SAGA (24/11/2026, Dr. Victor:
   "todos os locais dentro do sistema em que eu tiver que digitar uma data, quero o CALENDÁRIO EMBUTIDO, para eu
   transitar entre anos, meses e dias com velocidade maior").

   Carregado pelo saga_ui.js (mesma versão). Troca SOZINHO, em todas as telas:
   - input[type=date]           -> campo dd/mm/aaaa       (o original fica hidden com AAAA-MM-DD)
   - input[type=datetime-local] -> campo dd/mm/aaaa hh:mm (o original fica hidden com AAAA-MM-DDTHH:MM)
   - input[type=month]          -> campo mm/aaaa           (o original fica hidden com AAAA-MM)
   - campo de texto com placeholder "dd/mm/aaaa..." (máscara própria da tela): só ganha o botão e o calendário;
     o valor continua dd/mm/aaaa nele mesmo (aceita só o ano quando a tela aceita).
   O que a tela grava NÃO muda: input.value do original continua no formato de sempre; input/change disparam nele.
   Calendário: grade do mês, setas, clique no mês (lista dos 12) e no ano (grade de 20 anos, ‹ › pulam 20),
   "Hoje", "Limpar", destaque do escolhido e de hoje, min/max do campo; teclado com o foco no campo:
   setas = dia/semana, PageUp/PageDown = mês, Shift+PageUp/PageDown = ano, Home/End = início/fim da semana,
   Enter = escolher, Esc = fechar (sem fechar a janela de trás), Alt+↓ ou ↓ = abrir.
   Celular: painel embaixo, toques de 40 px, sem teclado (botão "Digitar" abre o teclado numérico).
   Campo que deve ficar com o do navegador: atributo data-saga-data-nativo. */
(function(global){
  'use strict';
  if(global.SagaCalendario)return;
  var doc=document;
  var MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var MESES_C=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  var SEMANA=['D','S','T','Q','Q','S','S'],SEMANA_L=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  var CURVA='cubic-bezier(.22,.78,.25,1)';
  var SVG_CAL='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="7" y="12.5" width="3" height="2.6" rx=".6" fill="currentColor"/></svg>';

  function parado(){try{if(localStorage.getItem('saga-movimento')==='reduzido')return true;}catch(e){}return doc.documentElement.classList.contains('saga-sem-movimento');}
  function celular(){try{return matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,screen.width||innerWidth)<=820;}catch(e){return false;}}
  function p2(n){return (n<10?'0':'')+n;}
  function iso(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
  function hoje(){var d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
  function deIso(v){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v||'');if(!m)return null;var d=new Date(+m[1],+m[2]-1,+m[3]);return d.getMonth()===+m[2]-1?d:null;}
  function deBr(v){var m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(v||'');if(!m)return null;var d=new Date(+m[3],+m[2]-1,+m[1]);return d.getFullYear()===+m[3]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[1]?d:null;}
  function br(d){return p2(d.getDate())+'/'+p2(d.getMonth()+1)+'/'+d.getFullYear();}
  function mesmoDia(a,b){return !!a&&!!b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
  function somaDias(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);}
  function somaMeses(d,n){var a=d.getFullYear(),m=d.getMonth()+n,ult=new Date(a,m+1,0).getDate();return new Date(a,m,Math.min(d.getDate(),ult));}
  function horaOk(h){var m=/^(\d{2}):(\d{2})$/.exec(h||'');return !!m&&+m[1]<24&&+m[2]<60;}
  function esc(s){return global.sagaEsc?global.sagaEsc(s):String(s==null?'':s).replace(/[&<>"'`]/g,function(c){return '&#'+c.charCodeAt(0)+';';});}

  /* ===== aparência: só as variáveis do tema (claro, escuro, Grafite, Vidro, Paletas) ===== */
  function estilos(){
    if(doc.getElementById('sagaCalCss'))return;
    var st=doc.createElement('style');st.id='sagaCalCss';
    st.textContent=
    '.saga-cal-caixa{position:relative;display:inline-block;vertical-align:middle;max-width:100%;min-width:0}'+
    '.saga-cal-caixa.sc-cheio{display:block;width:100%}'+
    '.saga-cal-caixa>input.saga-cal-vis{padding-right:36px!important;box-sizing:border-box}'+
    '.saga-cal-caixa.sc-cheio>input.saga-cal-vis{width:100%!important}'+
    '.saga-cal-caixa>input.saga-cal-vis.saga-data-invalida{border-color:#d9534f!important;box-shadow:0 0 0 2px color-mix(in srgb,#d9534f 25%,transparent)!important}'+
    '.saga-cal-caixa .saga-cal-btn{position:absolute!important;right:3px;top:50%;transform:translateY(-50%);width:30px!important;height:30px!important;min-width:0!important;min-height:0!important;padding:0!important;margin:0!important;'+
      'display:inline-flex!important;align-items:center;justify-content:center;border:0!important;border-radius:8px!important;background:transparent!important;box-shadow:none!important;'+
      'color:var(--muted,var(--text))!important;cursor:pointer;opacity:.85;transition:background-color .2s '+CURVA+',color .2s '+CURVA+',opacity .2s '+CURVA+'}'+
    '.saga-cal-caixa .saga-cal-btn:hover,.saga-cal-caixa .saga-cal-btn[aria-expanded="true"]{opacity:1;color:var(--gold)!important;background:color-mix(in srgb,var(--gold) 14%,transparent)!important}'+
    '.saga-cal-caixa .saga-cal-btn:focus-visible{outline:2px solid color-mix(in srgb,var(--gold) 70%,transparent)!important;outline-offset:1px}'+
    '.saga-cal-caixa .saga-cal-btn:disabled{opacity:.35;cursor:not-allowed}'+
    '@media (pointer:coarse){.saga-cal-caixa>input.saga-cal-vis{padding-right:44px!important;min-height:40px}.saga-cal-caixa .saga-cal-btn{width:40px!important;height:40px!important;right:0}}'+
    /* o painel */
    '#sagaCal{position:fixed;z-index:2147483000;left:0;top:0;width:296px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:12px;border-radius:16px;'+
      'background:var(--panel-solid,var(--panel));color:var(--text);border:1px solid var(--border-soft,var(--border));'+
      'box-shadow:0 18px 48px rgba(0,0,0,.32),0 2px 8px rgba(0,0,0,.16);font-size:13px;line-height:1.2;'+
      'opacity:0;transform:translateY(-6px) scale(.98);transform-origin:top left;transition:opacity .22s '+CURVA+',transform .26s '+CURVA+';user-select:none;-webkit-user-select:none;touch-action:manipulation}'+
    '#sagaCal[hidden]{display:none!important}'+
    '#sagaCal.sc-aberto{opacity:1;transform:none}'+
    '#sagaCal.sc-cima{transform-origin:bottom left;transform:translateY(6px) scale(.98)}#sagaCal.sc-cima.sc-aberto{transform:none}'+
    'html[data-cor^="vidro"] #sagaCal{background:color-mix(in srgb,var(--panel-solid,var(--navy-2)) 92%,transparent);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}'+
    '#sagaCal.sc-sem-mov,#sagaCal.sc-sem-mov *{transition:none!important;animation:none!important}'+
    '#sagaCal .sc-cab{display:flex;align-items:center;gap:4px;margin-bottom:8px}'+
    '#sagaCal button{font:inherit;color:var(--text);-webkit-tap-highlight-color:transparent}'+
    '#sagaCal .sc-seta{flex:0 0 auto;width:32px;height:32px;padding:0;border-radius:10px;border:1px solid transparent;background:transparent;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:17px;line-height:1;color:var(--muted,var(--text));transition:background-color .2s '+CURVA+',border-color .2s '+CURVA+',color .2s '+CURVA+'}'+
    '#sagaCal .sc-seta:hover:not(:disabled){background:var(--sb-sec-hover);border-color:var(--sb-sec-borda);color:var(--text)}'+
    '#sagaCal .sc-seta:disabled{opacity:.3;cursor:not-allowed}'+
    '#sagaCal .sc-titulo{flex:1 1 auto;display:flex;justify-content:center;gap:4px;min-width:0}'+
    '#sagaCal .sc-tit-b{height:32px;padding:0 10px;border-radius:10px;border:1px solid var(--sb-sec-borda);background:var(--sb-sec);cursor:pointer;font-weight:500;font-size:13.5px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;transition:background-color .2s '+CURVA+',border-color .2s '+CURVA+'}'+
    '#sagaCal .sc-tit-b::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);opacity:.6;transition:transform .25s '+CURVA+'}'+
    '#sagaCal .sc-tit-b[aria-expanded="true"]::after{transform:translateY(1px) rotate(225deg)}'+
    '#sagaCal .sc-tit-b:hover{background:var(--sb-sec-hover);border-color:color-mix(in srgb,var(--gold) 50%,transparent)}'+
    '#sagaCal .sc-tit-b[aria-expanded="true"]{background:var(--sb-escolha);border-color:var(--sb-escolha-borda)}'+
    '#sagaCal .sc-corpo{position:relative;overflow:hidden}'+
    '#sagaCal .sc-vista{animation:scEntra .24s '+CURVA+' both}'+
    '#sagaCal .sc-vista.sc-de-tras{animation-name:scEntraT}#sagaCal .sc-vista.sc-zoom{animation-name:scZoom}'+
    '@keyframes scEntra{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}'+
    '@keyframes scEntraT{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}'+
    '@keyframes scZoom{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}'+
    '#sagaCal .sc-sem{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:2px}'+
    '#sagaCal .sc-sem span{text-align:center;font-size:11px;font-weight:600;color:var(--muted,var(--text));opacity:.85;padding:3px 0;letter-spacing:.04em}'+
    '#sagaCal .sc-grade{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}'+
    '#sagaCal .sc-grade.sc-g3{grid-template-columns:repeat(3,1fr);gap:6px}#sagaCal .sc-grade.sc-g4{grid-template-columns:repeat(4,1fr);gap:6px}'+
    '#sagaCal .sc-d{position:relative;height:34px;min-width:0;padding:0;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:10px;border:1px solid transparent;background:transparent;cursor:pointer;font-size:13px;font-variant-numeric:lining-nums tabular-nums;'+
      'transition:background-color .18s '+CURVA+',border-color .18s '+CURVA+',color .18s '+CURVA+'}'+
    '#sagaCal .sc-g3 .sc-d,#sagaCal .sc-g4 .sc-d{height:44px;font-size:13.5px}'+
    '#sagaCal .sc-d:hover:not(:disabled){background:var(--sb-sec-hover);border-color:var(--sb-sec-borda)}'+
    '#sagaCal .sc-d.sc-fora{color:var(--muted,var(--text));opacity:.5}'+
    '#sagaCal .sc-d.sc-fds:not(.sc-escolhido){color:color-mix(in srgb,var(--text) 72%,var(--gold))}'+
    '#sagaCal .sc-d.sc-hoje{border-color:color-mix(in srgb,var(--gold) 70%,transparent);font-weight:600}'+
    '#sagaCal .sc-d.sc-hoje::after{content:"";position:absolute;left:50%;bottom:4px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--gold)}'+
    '#sagaCal .sc-d.sc-escolhido{background:var(--sb-escolha);border-color:var(--sb-escolha-borda);font-weight:600;color:var(--text)}'+
    '#sagaCal .sc-d.sc-foco{box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--gold) 75%,transparent)}'+
    '#sagaCal .sc-d:disabled{opacity:.25;cursor:not-allowed;text-decoration:line-through}'+
    '#sagaCal .sc-pe{display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-soft,var(--border));flex-wrap:wrap}'+
    '#sagaCal .sc-pe .sc-esp{flex:1 1 auto}'+
    '#sagaCal .sc-pb{height:30px;padding:0 12px;border-radius:10px;border:1px solid var(--sb-sec-borda);background:var(--sb-sec);cursor:pointer;font-size:12.5px;font-weight:500;transition:background-color .2s '+CURVA+',border-color .2s '+CURVA+'}'+
    '#sagaCal .sc-pb:hover:not(:disabled){background:var(--sb-sec-hover);border-color:color-mix(in srgb,var(--gold) 50%,transparent)}'+
    '#sagaCal .sc-pb.sc-pri{background:var(--sb-acao);border-color:var(--sb-acao-borda);font-weight:600}'+
    '#sagaCal .sc-pb.sc-pri:hover:not(:disabled){background:var(--sb-acao-hover);border-color:var(--gold)}'+
    '#sagaCal .sc-pb:disabled{opacity:.4;cursor:not-allowed}'+
    '#sagaCal .sc-hora{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12.5px;color:var(--muted,var(--text))}'+
    '#sagaCal .sc-hora input{width:78px;height:32px;padding:0 8px;border-radius:10px;border:1px solid var(--border-soft,var(--border));background:var(--sb-sec);color:var(--text);font:inherit;font-size:13.5px;text-align:center;font-variant-numeric:lining-nums tabular-nums;user-select:text;-webkit-user-select:text}'+
    '#sagaCal .sc-hora input:focus{outline:0;border-color:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 22%,transparent)}'+
    '#sagaCal .sc-hora input.sc-erro{border-color:#d9534f}'+
    '#sagaCal .sc-dica{margin-top:8px;font-size:11px;color:var(--muted,var(--text));opacity:.8;line-height:1.35}'+
    '#sagaCal .sc-vivo{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'+
    /* celular: painel embaixo, no meio, toques de 40 px */
    '#sagaCal.sc-cel{left:50%!important;top:auto!important;bottom:calc(12px + env(safe-area-inset-bottom,0px));width:min(380px,calc(100vw - 24px));padding:14px;transform:translate(-50%,24px);transform-origin:bottom center;border-radius:20px}'+
    '#sagaCal.sc-cel.sc-aberto{transform:translate(-50%,0)}'+
    '#sagaCal.sc-cel .sc-seta{width:40px;height:40px}#sagaCal.sc-cel .sc-tit-b{height:40px;font-size:15px}'+
    '#sagaCal.sc-cel .sc-d{height:42px;font-size:15px}#sagaCal.sc-cel .sc-g3 .sc-d,#sagaCal.sc-cel .sc-g4 .sc-d{height:48px}'+
    '#sagaCal.sc-cel .sc-pb{height:40px;padding:0 14px;font-size:14px}#sagaCal.sc-cel .sc-hora input{height:40px;width:90px;font-size:15px}'+
    '#sagaCal.sc-cel .sc-dica{display:none}';
    (doc.head||doc.documentElement).appendChild(st);
  }

  /* ===== o painel (um só para a página) ===== */
  var P=null,S=null; // S = estado do campo aberto
  function painel(){
    if(P)return P;
    estilos();
    P=doc.createElement('div');P.id='sagaCal';P.hidden=true;
    P.setAttribute('role','dialog');P.setAttribute('aria-modal','false');P.setAttribute('aria-label','Calendário');
    P.setAttribute('data-saga-sem-trava','');P.setAttribute('data-saga-movimento-proprio','');
    // o foco fica no campo: clicar no painel não tira o foco dele (só o campo de hora recebe foco)
    P.addEventListener('mousedown',function(e){if(!(e.target.closest&&e.target.closest('.sc-hora input')))e.preventDefault();});
    P.addEventListener('click',clique);
    // cliques no painel não chegam à tela de trás (menus e filtros que fecham com clique fora continuam abertos)
    ['mousedown','mouseup','click','pointerdown','pointerup','touchstart','touchend','dblclick','input','change','keyup'].forEach(function(t){P.addEventListener(t,function(e){e.stopPropagation();});});
    P.addEventListener('input',function(e){if(e.target.classList.contains('sc-hora-in')){var d=e.target.value.replace(/\D/g,'').slice(0,4);e.target.value=d.length>2?d.slice(0,2)+':'+d.slice(2):d;e.target.classList.toggle('sc-erro',e.target.value.length===5&&!horaOk(e.target.value));}});
    P.addEventListener('keydown',function(e){
      if(!e.target.classList.contains('sc-hora-in'))return;
      if(e.key==='Enter'){e.preventDefault();e.stopPropagation();aplicarHora(true);}
      else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fechar(true);}
    });
    return P;
  }

  function lerMinMax(c){
    var mi=c.orig.getAttribute('min')||c.orig.dataset.min||'',ma=c.orig.getAttribute('max')||c.orig.dataset.max||'';
    function d(v,fim){if(!v)return null;if(/^\d{4}-\d{2}$/.test(v)){var a=+v.slice(0,4),m=+v.slice(5,7)-1;return fim?new Date(a,m+1,0):new Date(a,m,1);}return deIso(v);}
    return {min:d(mi,false),max:d(ma,true)};
  }
  function foraDoLimite(d){return (S.min&&d<S.min)||(S.max&&d>S.max);}
  function mesFora(a,m){var i=new Date(a,m,1),f=new Date(a,m+1,0);return (S.min&&f<S.min)||(S.max&&i>S.max);}
  function anoFora(a){return (S.min&&a<S.min.getFullYear())||(S.max&&a>S.max.getFullYear());}

  function render(anim){
    var c=S.campo,html='',v=S.vista,ref=S.foco;
    var a=ref.getFullYear(),m=ref.getMonth(),hj=hoje();
    var titulo;
    if(v==='dias'){
      titulo='<button type="button" class="sc-tit-b" data-a="v-meses" aria-expanded="false" aria-label="Escolher o mês">'+MESES[m]+'</button>'+
             '<button type="button" class="sc-tit-b" data-a="v-anos" aria-expanded="false" aria-label="Escolher o ano">'+a+'</button>';
    }else if(v==='meses'){
      titulo=(c.modo==='mes'?'':'<button type="button" class="sc-tit-b" data-a="v-dias" aria-expanded="true" aria-label="Voltar para os dias">'+MESES[m]+'</button>')+
             '<button type="button" class="sc-tit-b" data-a="v-anos" aria-expanded="false" aria-label="Escolher o ano">'+a+'</button>';
    }else{
      var ini=S.anoIni;
      titulo='<button type="button" class="sc-tit-b" data-a="v-volta-anos" aria-expanded="true" aria-label="Fechar a lista de anos">'+ini+' – '+(ini+19)+'</button>';
    }
    var antesOk,depoisOk;
    if(v==='dias'){antesOk=!mesFora(new Date(a,m-1,1).getFullYear(),new Date(a,m-1,1).getMonth());depoisOk=!mesFora(new Date(a,m+1,1).getFullYear(),new Date(a,m+1,1).getMonth());}
    else if(v==='meses'){antesOk=!anoFora(a-1);depoisOk=!anoFora(a+1);}
    else{antesOk=!anoFora(S.anoIni-1);depoisOk=!anoFora(S.anoIni+20);}
    var rotAnt=v==='dias'?'Mês anterior':v==='meses'?'Ano anterior':'20 anos antes',rotPro=v==='dias'?'Próximo mês':v==='meses'?'Próximo ano':'20 anos depois';
    html+='<div class="sc-cab"><button type="button" class="sc-seta" data-a="ant" aria-label="'+rotAnt+'" title="'+rotAnt+'"'+(antesOk?'':' disabled')+'>‹</button>'+
          '<div class="sc-titulo">'+titulo+'</div>'+
          '<button type="button" class="sc-seta" data-a="pro" aria-label="'+rotPro+'" title="'+rotPro+'"'+(depoisOk?'':' disabled')+'>›</button></div>';
    html+='<div class="sc-corpo"><div class="sc-vista'+(anim?' '+anim:'')+'">';
    if(v==='dias'){
      html+='<div class="sc-sem" aria-hidden="true">'+SEMANA.map(function(s){return '<span>'+s+'</span>';}).join('')+'</div>';
      html+='<div class="sc-grade" role="grid" aria-label="'+MESES[m]+' de '+a+'">';
      var prim=new Date(a,m,1),d0=somaDias(prim,-prim.getDay());
      for(var i=0;i<42;i++){
        var d=somaDias(d0,i),cls='sc-d';
        if(d.getMonth()!==m)cls+=' sc-fora';
        if(d.getDay()===0||d.getDay()===6)cls+=' sc-fds';
        if(mesmoDia(d,hj))cls+=' sc-hoje';
        if(mesmoDia(d,S.valor))cls+=' sc-escolhido';
        if(mesmoDia(d,ref))cls+=' sc-foco';
        var rot=d.getDate()+' de '+MESES[d.getMonth()]+' de '+d.getFullYear()+', '+SEMANA_L[d.getDay()]+(mesmoDia(d,hj)?' (hoje)':'');
        html+='<button type="button" class="'+cls+'" data-a="dia" data-d="'+iso(d)+'" tabindex="-1" aria-label="'+rot+'"'+(mesmoDia(d,S.valor)?' aria-selected="true"':'')+(foraDoLimite(d)?' disabled':'')+'>'+d.getDate()+'</button>';
      }
      html+='</div>';
    }else if(v==='meses'){
      html+='<div class="sc-grade sc-g3" role="grid" aria-label="Meses de '+a+'">';
      for(var k=0;k<12;k++){
        var cl='sc-d';if(S.valor&&S.valor.getFullYear()===a&&S.valor.getMonth()===k)cl+=' sc-escolhido';
        if(hj.getFullYear()===a&&hj.getMonth()===k)cl+=' sc-hoje';if(k===m)cl+=' sc-foco';
        html+='<button type="button" class="'+cl+'" data-a="mes" data-m="'+k+'" tabindex="-1" aria-label="'+MESES[k]+' de '+a+'"'+(mesFora(a,k)?' disabled':'')+'>'+MESES_C[k]+'</button>';
      }
      html+='</div>';
    }else{
      html+='<div class="sc-grade sc-g4" role="grid" aria-label="Anos">';
      for(var y=S.anoIni;y<S.anoIni+20;y++){
        var ca='sc-d';if(S.valor&&S.valor.getFullYear()===y)ca+=' sc-escolhido';if(hj.getFullYear()===y)ca+=' sc-hoje';if(y===a)ca+=' sc-foco';
        html+='<button type="button" class="'+ca+'" data-a="ano" data-y="'+y+'" tabindex="-1"'+(anoFora(y)?' disabled':'')+'>'+y+'</button>';
      }
      html+='</div>';
    }
    html+='</div></div>';
    if(c.modo==='datahora')html+='<div class="sc-hora"><label for="sagaCalHora">Hora</label><input id="sagaCalHora" class="sc-hora-in" inputmode="numeric" maxlength="5" placeholder="hh:mm" autocomplete="off" value="'+esc(S.hora||'')+'"></div>';
    var hojeOk=c.modo==='mes'?!mesFora(hj.getFullYear(),hj.getMonth()):!foraDoLimite(hj);
    html+='<div class="sc-pe"><button type="button" class="sc-pb" data-a="hoje"'+(hojeOk?'':' disabled')+'>'+(c.modo==='mes'?'Este mês':c.modo==='datahora'?'Agora':'Hoje')+'</button>'+
          (c.semLimpar?'':'<button type="button" class="sc-pb" data-a="limpar">Limpar</button>')+
          (celular()?'<button type="button" class="sc-pb" data-a="digitar" aria-label="Digitar a data com o teclado">Digitar</button>':'')+
          '<span class="sc-esp"></span>'+
          (c.modo==='datahora'?'<button type="button" class="sc-pb sc-pri" data-a="ok">OK</button>':'<button type="button" class="sc-pb" data-a="fechar">Fechar</button>')+'</div>';
    if(!celular()&&S.vista==='dias'&&c.modo!=='mes')html+='<div class="sc-dica">Setas: dia · PgUp/PgDn: mês · Shift+PgUp/PgDn: ano · Enter escolhe</div>';
    html+='<div class="sc-vivo" aria-live="polite">'+(v==='dias'?MESES[m]+' de '+a:v==='meses'?String(a):S.anoIni+' a '+(S.anoIni+19))+'</div>';
    P.innerHTML=html;
    if(S.vista==='meses'){var bm=P.querySelector('[data-a="v-meses"]');if(bm)bm.setAttribute('aria-expanded','true');}
  }

  function irPara(nd,anim){
    if(!nd)return;var antes=S.foco;S.foco=nd;
    var mudouTela=S.vista==='dias'?(antes.getFullYear()!==nd.getFullYear()||antes.getMonth()!==nd.getMonth()):S.vista==='meses'?antes.getFullYear()!==nd.getFullYear():false;
    if(S.vista==='anos'&&(nd.getFullYear()<S.anoIni||nd.getFullYear()>=S.anoIni+20)){S.anoIni=nd.getFullYear()-((nd.getFullYear()%20+20)%20);mudouTela=true;}
    if(mudouTela||anim)render(anim||(nd>antes?'':'sc-de-tras'));
    else{ // só move o destaque do foco (sem redesenhar: nada pisca)
      var at=P.querySelector('.sc-foco');if(at)at.classList.remove('sc-foco');
      var sel=S.vista==='dias'?'[data-d="'+iso(nd)+'"]':S.vista==='meses'?'[data-m="'+nd.getMonth()+'"]':'[data-y="'+nd.getFullYear()+'"]';
      var nb=P.querySelector(sel);if(nb)nb.classList.add('sc-foco');
    }
  }
  function trocarVista(v,anim){
    S.vista=v;if(v==='anos')S.anoIni=S.foco.getFullYear()-((S.foco.getFullYear()%20+20)%20);
    render(anim||'sc-zoom');
  }

  function clique(e){
    var b=e.target.closest&&e.target.closest('button[data-a]');if(!b||b.disabled||!S)return;
    var a=b.getAttribute('data-a'),f=S.foco;
    if(a==='ant'||a==='pro'){var s=a==='ant'?-1:1;
      if(S.vista==='dias')irPara(somaMeses(new Date(f.getFullYear(),f.getMonth(),1),s),s<0?'sc-de-tras':'sc-vista');
      else if(S.vista==='meses')irPara(new Date(f.getFullYear()+s,f.getMonth(),1),s<0?'sc-de-tras':'sc-vista');
      else{S.anoIni+=20*s;S.foco=new Date(f.getFullYear()+20*s,f.getMonth(),1);render(s<0?'sc-de-tras':'');}
    }
    else if(a==='v-meses')trocarVista('meses');
    else if(a==='v-anos')trocarVista('anos');
    else if(a==='v-dias')trocarVista('dias');
    else if(a==='v-volta-anos')trocarVista(S.campo.modo==='mes'?'meses':'dias');
    else if(a==='dia'){escolher(deIso(b.getAttribute('data-d')));}
    else if(a==='mes'){var nd=new Date(f.getFullYear(),+b.getAttribute('data-m'),1);if(S.campo.modo==='mes'){escolher(nd);return;}S.foco=new Date(nd.getFullYear(),nd.getMonth(),Math.min(f.getDate(),new Date(nd.getFullYear(),nd.getMonth()+1,0).getDate()));trocarVista('dias');}
    else if(a==='ano'){var y=+b.getAttribute('data-y');S.foco=new Date(y,f.getMonth(),Math.min(f.getDate(),new Date(y,f.getMonth()+1,0).getDate()));trocarVista('meses');}
    else if(a==='hoje'){var h=new Date();if(S.campo.modo==='datahora')S.hora=p2(h.getHours())+':'+p2(h.getMinutes());escolher(hoje());}
    else if(a==='limpar'){gravar(null);fechar(true);}
    else if(a==='fechar'){fechar(true);}
    else if(a==='ok'){aplicarHora(true);}
    else if(a==='digitar'){var c=S.campo;fechar(false);c.digitando=true;c.vis.inputMode='numeric';c.vis.blur();setTimeout(function(){c.vis.focus();},60);}
  }

  function aplicarHora(fecharDepois){
    var hi=P.querySelector('.sc-hora-in'),h=hi?hi.value:'';
    if(h&&!horaOk(h)){if(hi){hi.classList.add('sc-erro');hi.focus();}return;}
    S.hora=h;
    if(S.valor||h)gravar(S.valor||S.foco);
    if(fecharDepois)fechar(true);
  }
  function escolher(d){
    if(!d||foraDoLimite(d)&&S.campo.modo!=='mes')return;
    if(S.campo.modo==='datahora'){var hi=P.querySelector('.sc-hora-in');var h=hi?hi.value:S.hora;if(h&&horaOk(h))S.hora=h;if(!S.hora)S.hora='09:00';}
    gravar(d);fechar(true);
  }

  /* grava no campo (e o campo dispara input/change no original) */
  function gravar(d){
    var c=S.campo;S.valor=d;
    if(c.tipo==='texto'){ // campo de texto da própria tela (dd/mm/aaaa)
      var t=d?br(d):'';if(c.vis.value!==t){c.vis.value=t;c.vis.dispatchEvent(new Event('input',{bubbles:true}));c.vis.dispatchEvent(new Event('change',{bubbles:true}));}
      return;
    }
    var v='';
    if(d){v=c.modo==='mes'?d.getFullYear()+'-'+p2(d.getMonth()+1):iso(d);if(c.modo==='datahora')v+='T'+(S.hora&&horaOk(S.hora)?S.hora:'00:00');}
    c.definir(v,true);
  }

  /* ===== posição ===== */
  function posicionar(){
    if(!S||!P)return;
    var c=S.campo;
    if(celular()){P.classList.add('sc-cel');P.style.left='';P.style.top='';return;}
    P.classList.remove('sc-cel');
    var alvo=c.caixa||c.vis,r=alvo.getBoundingClientRect();
    if(r.bottom<0||r.top>innerHeight){fechar(false);return;}
    // mede sem a animação de entrada (o scale de .98 desviava a conta) e sem transição
    var trA=P.style.transition,tfA=P.style.transform;P.style.transition='none';P.style.transform='none';
    P.style.left='0px';P.style.top='0px';
    var pr=P.getBoundingClientRect(),k=P.offsetWidth?pr.width/P.offsetWidth:1;if(!k||!isFinite(k))k=1;
    P.style.transform=tfA;void P.offsetWidth;P.style.transition=trA;
    var w=pr.width,h=pr.height,gap=6;
    // o painel pode estar dentro de uma camada com filtro/transformação (vidro): a origem do fixed é ela
    var ox=pr.left,oy=pr.top;
    var x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+gap,cima=false;
    if(y+h>innerHeight-8&&r.top-gap-h>=8){y=r.top-gap-h;cima=true;}
    else if(y+h>innerHeight-8)y=Math.max(8,innerHeight-h-8);
    P.classList.toggle('sc-cima',cima);
    P.style.left=((x-ox)/k)+'px';P.style.top=((y-oy)/k)+'px';
  }

  /* ===== abrir e fechar ===== */
  var fecharTimer=null;
  function abrir(c,porToque){
    if(c.vis.disabled||c.vis.readOnly&&!c.leituraPorToque)return;
    if(S&&S.campo===c){return;}
    if(S)fechar(false);
    painel();clearTimeout(fecharTimer);
    // dentro de uma janela (modal), o painel vai para dentro dela: a trava "tela de trás parada" continua valendo
    // <dialog> aberto fica na camada de cima do navegador: o painel precisa ir para dentro dele; o resto, no body
    var dono=c.caixa.closest('dialog[open]')||doc.body;
    if(P.parentNode!==dono)dono.appendChild(P);
    var mm=lerMinMax(c),val=c.ler(),h=hoje();
    S={campo:c,vista:c.modo==='mes'?'meses':'dias',min:mm.min,max:mm.max,valor:val,hora:c.horaAtual(),anoIni:0};
    var base=val||(c.ano?new Date(c.ano,h.getMonth(),Math.min(h.getDate(),28)):h);
    if(!val&&mm.max&&base>mm.max)base=new Date(mm.max);if(!val&&mm.min&&base<mm.min)base=new Date(mm.min);
    S.foco=base;
    if(c.ano&&!val)S.vista='anos';
    if(S.vista==='anos')S.anoIni=base.getFullYear()-((base.getFullYear()%20+20)%20);
    P.classList.toggle('sc-sem-mov',parado());
    P.classList.remove('sc-aberto');P.hidden=false;
    render('');posicionar();
    c.btn.setAttribute('aria-expanded','true');c.vis.setAttribute('aria-expanded','true');
    void P.offsetWidth;P.classList.add('sc-aberto');
  }
  function fechar(devolverFoco){
    if(!S)return;var c=S.campo;S=null;
    c.btn.setAttribute('aria-expanded','false');c.vis.setAttribute('aria-expanded','false');
    P.classList.remove('sc-aberto');
    if(parado())P.hidden=true;else fecharTimer=setTimeout(function(){if(!S)P.hidden=true;},230);
    if(devolverFoco&&!celular()&&doc.activeElement!==c.vis){try{c.vis.focus({preventScroll:true});}catch(e){}}
  }

  /* teclado: o foco fica no campo; quando o painel está aberto, as teclas mexem no calendário (antes da janela de trás) */
  global.addEventListener('keydown',function(e){
    var c=e.target&&e.target._sagaCal;
    if(!c)return;
    var aberto=S&&S.campo===c;
    if(!aberto){
      if((e.key==='ArrowDown'&&(e.altKey||!c.vis.value))||(e.key==='ArrowDown'&&e.altKey)||e.key==='F4'){e.preventDefault();e.stopImmediatePropagation();abrir(c);}
      return;
    }
    var f=S.foco,k=e.key,v=S.vista,nd=null,cons=true;
    if(k==='Escape'){fechar(true);}
    else if(k==='Enter'){
      if(v==='dias'){if(!foraDoLimite(f))escolher(f);}
      else if(v==='meses'){if(!mesFora(f.getFullYear(),f.getMonth())){if(c.modo==='mes')escolher(new Date(f.getFullYear(),f.getMonth(),1));else trocarVista('dias');}}
      else if(!anoFora(f.getFullYear()))trocarVista('meses');
    }
    else if(k==='Tab'){fechar(false);cons=false;}
    else if(v==='dias'){
      if(k==='ArrowLeft')nd=somaDias(f,-1);else if(k==='ArrowRight')nd=somaDias(f,1);
      else if(k==='ArrowUp')nd=somaDias(f,-7);else if(k==='ArrowDown')nd=somaDias(f,7);
      else if(k==='PageUp')nd=somaMeses(f,e.shiftKey?-12:-1);else if(k==='PageDown')nd=somaMeses(f,e.shiftKey?12:1);
      else if(k==='Home')nd=somaDias(f,-f.getDay());else if(k==='End')nd=somaDias(f,6-f.getDay());
      else cons=false;
    }else if(v==='meses'){
      if(k==='ArrowLeft')nd=somaMeses(f,-1);else if(k==='ArrowRight')nd=somaMeses(f,1);
      else if(k==='ArrowUp')nd=somaMeses(f,-3);else if(k==='ArrowDown')nd=somaMeses(f,3);
      else if(k==='PageUp')nd=somaMeses(f,-12);else if(k==='PageDown')nd=somaMeses(f,12);
      else cons=false;
    }else{
      if(k==='ArrowLeft')nd=somaMeses(f,-12);else if(k==='ArrowRight')nd=somaMeses(f,12);
      else if(k==='ArrowUp')nd=somaMeses(f,-48);else if(k==='ArrowDown')nd=somaMeses(f,48);
      else if(k==='PageUp')nd=somaMeses(f,-240);else if(k==='PageDown')nd=somaMeses(f,240);
      else cons=false;
    }
    if(nd)irPara(nd);
    if(cons){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  // fora do painel e do campo: fecha
  doc.addEventListener('pointerdown',function(e){
    if(!S)return;var t=e.target;
    if(P.contains(t)||S.campo.caixa.contains(t))return;
    fechar(false);
  },true);
  global.addEventListener('resize',function(){if(S)posicionar();});
  doc.addEventListener('scroll',function(e){if(S&&!(P.contains(e.target)))posicionar();},true);

  /* ===== preparar um campo ===== */
  function caixaEm(vis,orig){
    var cx=doc.createElement('span');cx.className='saga-cal-caixa';
    // largura: campo que ocupa a linha inteira (100% ou bloco) continua inteiro
    var cheio=false;
    try{
      var cs=getComputedStyle(orig),pw=orig.parentElement?orig.parentElement.clientWidth:0;
      var pcs=orig.parentElement&&getComputedStyle(orig.parentElement),flex=pcs&&/flex/.test(pcs.display),grade=pcs&&/grid/.test(pcs.display);
      if(/%$/.test(orig.style.width)||/%$/.test(cs.width))cheio=true;
      else if(flex){cheio=false;}
      else if(grade){cheio=true;}
      else if(cs.display==='block'||cs.display==='flex')cheio=true;
      else if(orig.offsetWidth&&pw&&orig.offsetWidth>=pw-4)cheio=true;
      if(flex){cx.style.flex=cs.flex;if(cs.flexGrow!=='0'){cx.style.minWidth='0';vis.style.width='100%';}}
      if(cs.maxWidth&&cs.maxWidth!=='none'&&!/%$/.test(cs.maxWidth)&&cheio)cx.style.maxWidth=cs.maxWidth;
      if(orig.style.width&&!/%$/.test(orig.style.width)){cheio=false;}
      ['marginTop','marginBottom','marginLeft','marginRight'].forEach(function(p){if(orig.style[p]){cx.style[p]=orig.style[p];vis.style[p]='0';}});
    }catch(e){}
    if(cheio)cx.classList.add('sc-cheio');
    return cx;
  }
  function botao(c){
    var b=doc.createElement('button');b.type='button';b.className='saga-cal-btn';b.tabIndex=-1;
    b.setAttribute('aria-label','Abrir o calendário');b.title='Abrir o calendário';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');
    b.innerHTML=SVG_CAL;
    b.addEventListener('mousedown',function(e){e.preventDefault();});
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(S&&S.campo===c){fechar(true);return;}var toque=celular();if(!toque)c.vis.focus();abrir(c,toque);});
    return b;
  }

  // espelha no campo visível o que a tela muda no original (hidden, display, disabled, min/max, classe)
  function espelhar(c){
    var o=c.orig,vis=c.vis;
    function sync(){
      vis.disabled=o.disabled;vis.readOnly=o.readOnly;vis.required=o.required;
      c.btn.disabled=o.disabled||o.readOnly;
      var esc=o.hidden||(o.style.display==='none');c.caixa.hidden=esc;c.caixa.style.display=esc?'none':'';
      if(o.getAttribute('title')&&!vis.title)vis.title=o.getAttribute('title');
      var cls=(o.className||'').replace(/\bsaga-cal-[\w-]+/g,'').trim();
      var atual=(vis.className||'').replace(/\b(saga-cal-vis|saga-data-invalida)\b/g,'').trim();
      if(cls!==atual)vis.className=(cls+' saga-cal-vis'+(vis.classList.contains('saga-data-invalida')?' saga-data-invalida':'')).trim();
      if(S&&S.campo===c&&(vis.disabled||esc))fechar(false);
    }
    sync();
    new MutationObserver(sync).observe(o,{attributes:true,attributeFilter:['hidden','style','disabled','readonly','required','class','title']});
  }

  // eventos ligados pela tela no ORIGINAL (Enter salva, Esc cancela, blur grava...) continuam valendo
  function repassar(c){
    var o=c.orig,vis=c.vis;
    ['keydown','keyup','keypress'].forEach(function(t){
      vis.addEventListener(t,function(e){
        if(e.defaultPrevented&&t==='keydown'&&S&&S.campo===c)return;
        var n=new KeyboardEvent(t,{key:e.key,code:e.code,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,metaKey:e.metaKey,repeat:e.repeat,bubbles:false,cancelable:true});
        if(!o.dispatchEvent(n))e.preventDefault();
      });
    });
    vis.addEventListener('focus',function(){o.dispatchEvent(new FocusEvent('focus',{bubbles:false}));});
    vis.addEventListener('blur',function(e){
      var para=e.relatedTarget;if(P&&para&&P.contains(para))return; // foi para a hora do calendário
      o.dispatchEvent(new FocusEvent('blur',{bubbles:false}));
    });
    o.focus=function(op){try{vis.focus(op);}catch(e){vis.focus();}};
    o.select=function(){vis.select();};
    o.blur=function(){vis.blur();};
    o.showPicker=function(){vis.focus();abrir(c);};
    o.click=function(){abrir(c);};
  }

  var MODOS={date:{modo:'data',ph:'dd/mm/aaaa',len:10},'datetime-local':{modo:'datahora',ph:'dd/mm/aaaa hh:mm',len:16},month:{modo:'mes',ph:'mm/aaaa',len:7}};

  function prepararTroca(inp){
    var tipo=(inp.getAttribute('type')||'').toLowerCase(),M=MODOS[tipo];if(!M)return inp;
    estilos();
    var vis=doc.createElement('input');
    vis.type='text';vis.inputMode='numeric';vis.placeholder=inp.getAttribute('placeholder')&&/aaaa/.test(inp.getAttribute('placeholder'))?inp.getAttribute('placeholder'):M.ph;
    vis.maxLength=M.len;vis.autocomplete='off';vis.spellcheck=false;vis.dataset.sagaData='1';
    vis.className=((inp.className||'')+' saga-cal-vis').trim();vis.style.cssText=inp.style.cssText;
    vis.style.removeProperty('display');
    vis.setAttribute('data-saga-tipo',tipo);
    if(inp.id){vis.id=inp.id+'__vis';var lab=inp.labels&&inp.labels[0];if(lab){lab.htmlFor=vis.id;}else vis.setAttribute('aria-labelledby',inp.id);}
    vis.setAttribute('aria-label',inp.getAttribute('aria-label')||(inp.labels&&inp.labels[0]&&inp.labels[0].textContent.trim())||('Data ('+M.ph+')'));
    if(inp.name)vis.setAttribute('data-name',inp.name);
    var desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
    var c={orig:inp,vis:vis,modo:M.modo,tipo:'troca',semLimpar:false};
    function mostrar(v){
      if(!v)return '';
      if(M.modo==='mes'){var m=/^(\d{4})-(\d{2})/.exec(v);return m?m[2]+'/'+m[1]:'';}
      var d=deIso(v);if(!d)return '';var t=br(d);
      if(M.modo==='datahora'){var h=/T(\d{2}:\d{2})/.exec(v);t+=' '+(h?h[1]:'00:00');}
      return t;
    }
    function doTexto(t){
      if(M.modo==='mes'){var m=/^(\d{2})\/(\d{4})$/.exec(t);return m&&+m[1]>=1&&+m[1]<=12?m[2]+'-'+m[1]:'';}
      var d=deBr(t);if(!d)return '';
      if(M.modo==='datahora'){var h=t.slice(11);if(t.length!==16||!horaOk(h))return '';return iso(d)+'T'+h;}
      return t.length===10?iso(d):'';
    }
    function mascara(t){
      var d=t.replace(/\D/g,'');
      if(M.modo==='mes'){d=d.slice(0,6);return d.length>2?d.slice(0,2)+'/'+d.slice(2):d;}
      d=d.slice(0,M.modo==='datahora'?12:8);
      var r=d;if(d.length>4)r=d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4,8);else if(d.length>2)r=d.slice(0,2)+'/'+d.slice(2);
      if(d.length>8)r+=' '+d.slice(8,10)+(d.length>10?':'+d.slice(10):'');
      return r;
    }
    c.definir=function(v,avisar){
      if(desc.get.call(inp)!==v){desc.set.call(inp,v);if(avisar){inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));}}
      var t=mostrar(v);if(vis.value!==t)vis.value=t;vis.classList.remove('saga-data-invalida');
    };
    c.ler=function(){var v=desc.get.call(inp);if(M.modo==='mes'){var m=/^(\d{4})-(\d{2})/.exec(v||'');return m?new Date(+m[1],+m[2]-1,1):null;}return deIso(v);};
    c.horaAtual=function(){var h=/T(\d{2}:\d{2})/.exec(desc.get.call(inp)||'');return h?h[1]:'';};
    vis.value=mostrar(desc.get.call(inp)||inp.getAttribute('value')||'');
    var cx=caixaEm(vis,inp);c.caixa=cx;
    // campo que já estava com o foco (ex.: editor de célula da planilha, que dá foco logo ao criar): o foco passa
    // para o campo novo SEM avisar "blur" à tela (senão ela gravaria e fecharia o editor na hora)
    var tinhaFoco=doc.activeElement===inp,cala=function(e){e.stopImmediatePropagation();};
    if(tinhaFoco){inp.addEventListener('blur',cala,true);inp.addEventListener('focusout',cala,true);}
    inp.parentNode.insertBefore(cx,inp);cx.appendChild(vis);
    if(tinhaFoco){try{vis.focus({preventScroll:true});}catch(e){}}
    inp.type='hidden';
    if(tinhaFoco){inp.removeEventListener('blur',cala,true);inp.removeEventListener('focusout',cala,true);}
    c.btn=botao(c);cx.appendChild(c.btn);
    // o texto dd/mm/aaaa do campo visível não chega à tela como "input"/"change": quem avisa é o original (AAAA-MM-DD)
    ['input','change'].forEach(function(t){vis.addEventListener(t,function(e){if(e.isTrusted)e.stopPropagation();});});
    vis.addEventListener('input',function(){
      var r=mascara(vis.value);if(r!==vis.value)vis.value=r;
      var v=doTexto(r),completo=r.length===M.len;
      vis.classList.toggle('saga-data-invalida',completo&&!v);
      var nv=completo?v:'';
      if(desc.get.call(inp)!==nv){desc.set.call(inp,nv);inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));}
      if(S&&S.campo===c&&v){var d=c.ler();if(d){S.valor=d;S.hora=c.horaAtual();irPara(d,'sc-zoom');}}
    });
    // valor posto pela tela depois (inp.value='2026-11-16'): o campo visível acompanha
    Object.defineProperty(inp,'value',{configurable:true,get:function(){return desc.get.call(inp);},set:function(v){desc.set.call(inp,v==null?'':v);var t=mostrar(v);if(vis.value!==t)vis.value=t;vis.classList.remove('saga-data-invalida');}});
    Object.defineProperty(inp,'valueAsDate',{configurable:true,get:function(){var d=c.ler();return d?new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())):null;},set:function(d){inp.value=d?d.toISOString().slice(0,M.modo==='mes'?7:10):'';}});
    ligarCampo(c);
    espelhar(c);repassar(c);
    inp._sagaVisivel=vis;inp._sagaCalCampo=c;
    return inp;
  }

  // campo de texto que já tem a máscara da tela (placeholder dd/mm/aaaa): só ganha o botão e o calendário
  function prepararTexto(inp){
    estilos();
    var c={orig:inp,vis:inp,modo:'data',tipo:'texto',semLimpar:false};
    var aceitaAno=/ano/i.test(inp.getAttribute('placeholder')||'');
    c.ler=function(){return deBr(inp.value);};
    c.horaAtual=function(){return '';};
    Object.defineProperty(c,'ano',{get:function(){var m=aceitaAno&&/^(\d{4})$/.exec((inp.value||'').trim());return m?+m[1]:0;}});
    c.definir=function(){};
    var cx=caixaEm(inp,inp);c.caixa=cx;
    inp.parentNode.insertBefore(cx,inp);cx.appendChild(inp);
    inp.classList.add('saga-cal-vis');
    c.btn=botao(c);cx.appendChild(c.btn);
    inp.addEventListener('input',function(){if(S&&S.campo===c){var d=deBr(inp.value);if(d){S.valor=d;irPara(d,'sc-zoom');}}});
    ligarCampo(c);
    var mo=new MutationObserver(function(){cx.hidden=inp.hidden||inp.style.display==='none';c.btn.disabled=inp.disabled||inp.readOnly;});
    mo.observe(inp,{attributes:true,attributeFilter:['hidden','style','disabled','readonly']});
    c.btn.disabled=inp.disabled||inp.readOnly;
    inp._sagaCalCampo=c;
    return inp;
  }

  function ligarCampo(c){
    var vis=c.vis;vis._sagaCal=c;
    vis.setAttribute('aria-haspopup','dialog');vis.setAttribute('aria-expanded','false');
    // clicar no campo abre o calendário (no computador o cursor continua no campo para digitar)
    vis.addEventListener('mousedown',function(){if(!celular()&&!(S&&S.campo===c))setTimeout(function(){if(doc.activeElement===vis)abrir(c);},0);});
    // celular: o campo abre o calendário SEM o teclado (inputmode none); "Digitar" no painel traz o teclado numérico
    if(celular())vis.inputMode='none';
    vis.addEventListener('click',function(){if(celular()&&!c.digitando&&!(S&&S.campo===c))abrir(c,true);});
    vis.addEventListener('blur',function(e){
      if(c.digitando&&!(P&&e.relatedTarget&&P.contains(e.relatedTarget))){setTimeout(function(){if(doc.activeElement!==vis){c.digitando=false;if(celular())vis.inputMode='none';}},120);}
      if(!S||S.campo!==c)return;var para=e.relatedTarget;
      if(para&&P&&P.contains(para))return;
      setTimeout(function(){if(S&&S.campo===c&&doc.activeElement!==vis&&!(P&&P.contains(doc.activeElement)))fechar(false);},0);
    });
  }

  function preparar(inp){
    if(!inp||inp.nodeType!==1||inp.tagName!=='INPUT'||inp.dataset.sagaData||inp.hasAttribute('data-saga-data-nativo'))return inp;
    if(!inp.parentNode)return inp;
    var tipo=(inp.getAttribute('type')||'').toLowerCase();
    if(MODOS[tipo]){inp.dataset.sagaData='1';return prepararTroca(inp);}
    if((tipo===''||tipo==='text')&&/^dd\/mm\/aaaa/i.test(inp.getAttribute('placeholder')||'')&&!inp.classList.contains('saga-cal-vis')){inp.dataset.sagaData='1';return prepararTexto(inp);}
    return inp;
  }
  var SELETOR='input[type="date"],input[type="datetime-local"],input[type="month"],input[placeholder^="dd/mm/aaaa"]';
  function varrer(r){
    if(!r||r.nodeType!==1)return;
    if(r.matches&&r.matches(SELETOR))preparar(r);
    if(r.querySelectorAll)r.querySelectorAll(SELETOR).forEach(preparar);
  }
  // a tela tirou o campo original (ex.: campo.remove() no editor de célula): o campo visível e o botão saem junto
  function tirados(n){
    if(!n||n.nodeType!==1)return;
    var l=n._sagaCalCampo?[n]:[];if(n.querySelectorAll)l=l.concat(Array.prototype.slice.call(n.querySelectorAll('input')).filter(function(i){return i._sagaCalCampo;}));
    l.forEach(function(i){var c=i._sagaCalCampo;if(c&&!i.isConnected&&c.caixa&&c.caixa.isConnected&&!c.caixa.contains(i)){if(S&&S.campo===c)fechar(false);c.caixa.remove();}
      else if(c&&c.tipo==='texto'&&c.caixa.isConnected&&!c.caixa.contains(i)){c.caixa.remove();}});
  }
  function iniciar(){
    varrer(doc.body);
    new MutationObserver(function(ms){
      for(var i=0;i<ms.length;i++){var m=ms[i];
        if(m.type==='childList'){
          for(var j=0;j<m.addedNodes.length;j++)varrer(m.addedNodes[j]);
          for(var k=0;k<m.removedNodes.length;k++)tirados(m.removedNodes[k]);
        }
        else if(m.type==='attributes'&&m.target.tagName==='INPUT')preparar(m.target); // campo que vira date depois (campo.type='date')
      }
    }).observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['type','placeholder']});
  }

  global.SagaCalendario={preparar:preparar,abrir:function(inp){var c=inp&&inp._sagaCalCampo;if(c)abrir(c);},fechar:function(){fechar(false);},aberto:function(){return !!S;},varrer:varrer};
  // o ajudante comum: a mesma chamada de antes (window.sagaCampoData) agora traz o calendário
  global.sagaCampoData=function(inp){return preparar(inp);};
  if(doc.body)iniciar();else doc.addEventListener('DOMContentLoaded',iniciar);
})(window);
