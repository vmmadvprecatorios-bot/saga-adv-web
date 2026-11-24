/* =====================================================================
   SAGA · Teses e oportunidades > Base única (blocos 420 e 421)
   Uma pessoa por CPF/CNPJ juntando todas as fontes: Portal da Transparência mês a mês
   (ativos, aposentados, pensionistas), servidor que deixou pensão, Listagem de Alagoas,
   fichas do SAGA e, depois, as outras listagens, médicos, PGFN... (base_ligar_fonte).
   SÓ o administrador geral (o banco recusa os outros: base_checar).
   Partes: Visão geral, Pessoas (filtros: situação, falecidos entre meses, UF, órgão, fonte,
   clientes) com etiquetas sempre à vista, A conferir (juntar / pessoas diferentes) e Listagens
   (porta de entrada das listagens de processos, bloco 422: saga_base_listagens.js).
   CPF sempre mascarado; "Não enviar mais" fica na pessoa e toda exportação pula.
   ===================================================================== */
(function(global){
  'use strict';
  var B={montado:false,painel:null,parte:'geral',
    f:{texto:'',situacao:'',fonte:'',clientes:false,de:'',ate:'',uf:'',orgao:'',esfera:'',ente:'',datas:null,pagina:1},entes:null,v423:null,abono:null,
    lista:null,conf:null,pedido:0};
  var MAX_CSV=20000;
  // 24/11 (Dr. Victor): paginação comum (Mostrar 5·10·50·100·Todos), saga_paginacao.js
  var PAG=null;function pag(){if(!PAG)PAG=SagaPaginacao.criar({tela:'base-pessoas',rotulo:'pessoas',aoMudar:function(P){B.f.pagina=P.pagina;carregarLista();}});return PAG;}
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  var SIT={ativo:'Ativo',aposentado:'Inativo (aposentado)',pensionista:'Pensionista',falecido_provavel:'Provável falecido',
    falecido_confirmado:'Falecido (confirmado)',saiu_sem_pensao:'Saiu sem deixar pensão',fora_do_portal:'Fora do Portal',sem_portal:'Só em listagem/ficha'};
  var FONTE={portal:'Portal da Transparência',portal_instituidor:'Deixou pensão (Portal)',listagem_al:'Listagem de Alagoas',listagem:'Listagem de processo',ficha:'Ficha do SAGA'};
  var COMO={cpf:'pelo CPF',cnpj:'pelo CNPJ',nome_cpf6:'nome completo + 6 dígitos do CPF',codigo_portal:'código do Portal',nova:'pessoa nova',manual:'juntada à mão'};

  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erro(e){return esc(global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e)));}
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function $(id){return document.getElementById(id);}
  function sb(){return global._sb;}
  function mesTxt(m){m=String(m||'');return m.length===6?m.slice(4)+'/'+m.slice(0,4):m;}
  function dataBR(d){if(!d)return '';var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));return m?m[3]+'/'+m[2]+'/'+m[1]:String(d);}
  function dataHora(d){if(!d)return '';try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return d;}}
  function mesMascara(v){var d=String(v||'').replace(/\D/g,'').slice(0,6);return d.length>2?d.slice(0,2)+'/'+d.slice(2):d;}
  function mesNum(v){var m=/^(\d{2})\/(\d{4})$/.exec(String(v||''));if(!m)return null;var mm=+m[1];if(mm<1||mm>12)return null;return +(m[2]+m[1]);}
  function parado(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function versao(){var s=document.querySelector('script[src*="saga_ui.js"]');var m=s&&/\?v=(\d+)/.exec(s.getAttribute('src'));return m?m[1]:'';}
  function carregar(arq,glob){return new Promise(function(ok,falha){if(global[glob])return ok();var s=document.createElement('script');s.src=arq+'?v='+versao();s.onload=function(){ok();};s.onerror=function(){falha(new Error('Não carregou '+arq));};document.head.appendChild(s);});}

  var CSS=`
#aba-base-unica .bu-aviso{border:1px solid var(--border-soft);border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--muted);margin-bottom:12px;background:var(--panel);line-height:1.5}
#aba-base-unica .bu-aviso b{color:var(--text)}
#aba-base-unica .bu-aviso.amar{border-left-color:#c98500}
#aba-base-unica .bu-aviso.verm{border-left-color:var(--danger,#d6452d);color:var(--text)}
#aba-base-unica .bu-partes{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
#aba-base-unica .bu-corpo{transition:opacity .28s cubic-bezier(.22,.78,.25,1),transform .28s cubic-bezier(.22,.78,.25,1)}
#aba-base-unica .bu-corpo.entrando{opacity:0;transform:translateY(6px)}
#aba-base-unica .bu-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:14px}
#aba-base-unica .bu-num{border:1px solid var(--border-soft);border-radius:12px;padding:9px 10px;background:var(--panel);color:var(--text);font:inherit;text-align:left;min-height:64px;display:flex;flex-direction:column;gap:2px}
#aba-base-unica button.bu-num{cursor:pointer}
#aba-base-unica button.bu-num:hover,#aba-base-unica button.bu-num:focus-visible{border-color:var(--gold);outline:0}
#aba-base-unica .bu-num b{font-size:19px;font-variant-numeric:lining-nums tabular-nums}
#aba-base-unica .bu-num span{font-size:11px;color:var(--muted);line-height:1.25}
#aba-base-unica .bu-bloco{border:1px solid var(--border-soft);border-radius:14px;background:var(--panel);padding:12px 14px;margin-bottom:14px}
#aba-base-unica .bu-bloco h3{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--text)}
#aba-base-unica .bu-bloco p.sub{font-size:11.5px;color:var(--muted);margin:-4px 0 10px;line-height:1.45}
#aba-base-unica .bu-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
#aba-base-unica .bu-filtros input:not([type=checkbox]),#aba-base-unica .bu-filtros select{min-width:130px}
#aba-base-unica .bu-filtros .bu-busca{flex:1 1 220px}
#aba-base-unica .bu-filtros input.bu-mes{width:110px;min-width:0}
#aba-base-unica .bu-filtros label.bu-chk{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--muted);white-space:nowrap}
#aba-base-unica .bu-rolagem{overflow-x:auto}
#aba-base-unica .bu-tab{width:100%;border-collapse:collapse;font-size:12.5px}
#aba-base-unica .bu-tab th{text-align:left;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:7px 8px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
#aba-base-unica .bu-tab td{padding:7px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top}
#aba-base-unica .bu-tab td.n{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
#aba-base-unica .bu-nome{background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--text);cursor:pointer;text-align:left}
#aba-base-unica .bu-nome:hover,#aba-base-unica .bu-nome:focus-visible{text-decoration:underline;outline:0}
#aba-base-unica .bu-sub,#moBase .bu-sub{display:block;font-size:10.5px;color:var(--muted);line-height:1.4}
#aba-base-unica .bu-selo,#moBase .bu-selo{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border-soft);border-radius:999px;padding:1px 8px;font-size:10.5px;white-space:nowrap;margin:0 3px 3px 0;color:var(--text)}
#aba-base-unica .bu-selo i,#moBase .bu-selo i{width:8px;height:8px;border-radius:50%;background:var(--c,var(--muted));flex:0 0 auto}
#aba-base-unica .bu-selo.esfera,#moBase .bu-selo.esfera{border-style:dashed}
#aba-base-unica .bu-selo.alerta,#moBase .bu-selo.alerta{border-color:var(--danger,#d6452d);color:var(--danger,#d6452d)}
#aba-base-unica .bu-selo.cli,#moBase .bu-selo.cli{border-color:var(--gold);color:var(--gold)}
#aba-base-unica .bu-vazio{padding:24px;text-align:center;color:var(--muted);font-size:13px}
#aba-base-unica .bu-pag{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12px;color:var(--muted);flex-wrap:wrap}
#aba-base-unica .bu-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
#aba-base-unica .bu-carregando{opacity:.55;transition:opacity .2s cubic-bezier(.22,.78,.25,1)}
#aba-base-unica .bu-par{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
#aba-base-unica .bu-par > div{border:1px solid var(--border-soft);border-radius:10px;padding:8px 10px;min-width:0}
#moBase .bu-sec{margin:12px 0 0}
#moBase .bu-sec h4{font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);margin:0 0 6px}
#moBase .bu-lin{font-size:12.5px;line-height:1.5;padding:4px 0;border-bottom:1px solid var(--border-soft)}
#moBase .bu-lin:last-child{border-bottom:0}
#moBase .bu-merro{color:var(--danger,#d6452d);font-size:12px}
#moBase .bu-form{display:grid;gap:6px;margin-top:6px}
#moBase .bu-form textarea{min-height:54px}
@media(max-width:700px){#aba-base-unica .bu-tab thead{display:none}#aba-base-unica .bu-tab tr{display:block;border-bottom:1px solid var(--border-soft);padding:6px 0}#aba-base-unica .bu-tab td{display:block;border:0;padding:3px 4px}#aba-base-unica .bu-tab td[data-r]::before{content:attr(data-r) ": ";color:var(--muted);font-size:10.5px}#aba-base-unica .bu-filtros input:not([type=checkbox]),#aba-base-unica .bu-filtros select{flex:1 1 45%;min-width:0}#aba-base-unica .bu-filtros input.bu-mes{flex:1 1 40%;width:auto}#aba-base-unica .bu-par{grid-template-columns:1fr}#aba-base-unica .bu-acoes{margin-left:0}}
@media(prefers-reduced-motion:reduce){#aba-base-unica .bu-corpo,#aba-base-unica .bu-carregando{transition:none}}
html.saga-movimento-reduzido #aba-base-unica .bu-corpo{transition:none}
`;
  function estilos(){if($('sagaBaseUnicaCss'))return;var s=document.createElement('style');s.id='sagaBaseUnicaCss';s.textContent=CSS;document.head.appendChild(s);}
  function aviso(msg,tipo){var w=$('buMsg');if(!w)return;w.className='bu-aviso'+(tipo==='erro'?' verm':tipo==='amar'?' amar':'');w.innerHTML=msg;w.hidden=!msg;}
  function corOk(c){return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(c||''))?c:'';}

  /* ---------- etiquetas (selos) sempre à vista ---------- */
  function htmlSelos(sel){
    return (sel||[]).map(function(s){
      var cl='bu-selo'+(s.cat==='base_esfera'?' esfera':'')+(s.acao==='nao_enviar'?' alerta':'')+(s.acao==='cliente'?' cli':'');
      var c=corOk(s.cor);
      return '<span class="'+cl+'"'+(c?' style="--c:'+c+'"':'')+'><i></i>'+esc(s.nome)+'</span>';
    }).join('');
  }

  /* ---------- montagem ---------- */
  function htmlPartes(){
    var p=B.painel||{};
    var bt=function(k,t){return '<button class="pill'+(B.parte===k?' active':'')+'" type="button" data-parte="'+k+'">'+t+'</button>';};
    return bt('geral','Visão geral')+bt('pessoas','Pessoas')+bt('conferir','A conferir'+(p.a_conferir?' ('+num(p.a_conferir)+')':''))+bt('listagens','Listagens');
  }
  function htmlRodada(){
    var r=(B.painel||{}).ultima_rodada;
    if(!r)return '<div class="bu-aviso amar">A base ainda não teve uma rodada de unificação registrada pelo agendador.</div>';
    if(r.ok===false)return '<div class="bu-aviso verm"><b>A última unificação falhou</b> ('+esc(dataHora(r.fim||r.inicio))+'): '+esc(r.erro||'sem motivo')+'. A tela mostra o que já estava unido. Use "Unificar agora" para tentar de novo; se continuar, aparece no sino.</div>';
    if(!r.fim)return '<div class="bu-aviso amar">Unificação em andamento desde '+esc(dataHora(r.inicio))+'.</div>';
    var s=r.resumo||{};
    return '<div class="bu-aviso">Última unificação: <b>'+esc(dataHora(r.fim))+'</b> · '+num(s.segundos)+' s'+(s.fichas_ligadas_novas?' · '+num(s.fichas_ligadas_novas)+' fichas ligadas':'')+(s.a_conferir_novas?' · '+num(s.a_conferir_novas)+' para conferir':'')+'.</div>';
  }
  function desenhar(){
    var pane=$('aba-base-unica');if(!pane)return;var p=B.painel||{};
    pane.innerHTML='<div class="bu-aviso"><b>Finalidade (LGPD):</b> '+esc(p.finalidade||'')+' Só o administrador geral vê; CPF sempre mascarado; cada exportação fica no Registro de atividades.</div>'+
      htmlRodada()+'<div class="bu-aviso" id="buMsg" hidden></div>'+
      '<div class="bu-partes" id="buPartes" role="group" aria-label="Partes da Base única">'+htmlPartes()+'</div>'+
      '<div class="bu-corpo" id="buCorpo"></div>';
    $('buPartes').onclick=function(e){var b=e.target.closest('[data-parte]');if(b)trocarParte(b.dataset.parte);};
    pane.onclick=function(e){
      var pe=e.target.closest('[data-pessoa]');if(pe){e.preventDefault();abrirPessoa(+pe.dataset.pessoa);return;}
      var ir=e.target.closest('[data-ir]');if(ir){irPessoas(JSON.parse(ir.dataset.ir));return;}
    };
    desenharParte();
  }
  function trocarParte(k){
    B.parte=k;var ps=$('buPartes');if(ps)ps.querySelectorAll('[data-parte]').forEach(function(b){b.classList.toggle('active',b.dataset.parte===k);});
    desenharParte();
  }
  function desenharParte(){
    var c=$('buCorpo');if(!c)return;
    if(!parado()){c.classList.add('entrando');requestAnimationFrame(function(){requestAnimationFrame(function(){c.classList.remove('entrando');});});}
    if(B.parte==='pessoas')partePessoas(c);else if(B.parte==='conferir')parteConferir(c);else if(B.parte==='listagens')parteListagens(c);else parteGeral(c);
  }

  /* ---------- Listagens (porta de entrada; saga_base_listagens.js, carregado só quando abre) ---------- */
  function parteListagens(c){
    c.innerHTML='<div class="bu-vazio">Carregando…</div>';
    carregar('saga_base_listagens.js','SagaBaseListagens').then(function(){global.SagaBaseListagens.montar(c,{abrirPessoa:abrirPessoa});})
      .catch(function(e){c.innerHTML='<div class="bu-aviso verm">Não deu para abrir as Listagens: '+erro(e)+'</div>';});
  }

  /* ---------- Visão geral ---------- */
  function parteGeral(c){
    var p=B.painel||{},s=p.por_situacao||{},f=p.por_fonte||{};
    function bt(n,t,filtro){return '<button type="button" class="bu-num" data-ir=\''+esc(JSON.stringify(filtro))+'\'><b>'+num(n)+'</b><span>'+esc(t)+'</span></button>';}
    c.innerHTML='<div class="bu-nums">'+
      '<div class="bu-num"><b>'+num(p.pessoas)+'</b><span>pessoas na base (uma por CPF/CNPJ)</span></div>'+
      bt(s.ativo,'ativos no Portal',{situacao:'ativo'})+bt(s.aposentado,'inativos (aposentados)',{situacao:'aposentado'})+
      bt(s.pensionista,'pensionistas',{situacao:'pensionista'})+bt(s.falecido_provavel,'prováveis falecidos (deixaram pensão ou saíram por falecimento)',{situacao:'falecido_provavel'})+
      bt(s.falecido_confirmado,'falecimento confirmado',{situacao:'falecido_confirmado'})+bt(s.saiu_sem_pensao,'saíram dos aposentados sem deixar pensão (morte sem pensionista ou perda do benefício)',{situacao:'saiu_sem_pensao'})+
      bt(s.fora_do_portal,'saíram do Portal por outro motivo',{situacao:'fora_do_portal'})+bt(s.sem_portal,'só em listagem ou ficha',{situacao:'sem_portal'})+
      bt(p.com_ficha,'ligadas a uma ficha do SAGA',{clientes:true})+
      '<div class="bu-num"><b>'+num(p.com_cpf_completo)+'</b><span>com CPF completo (vindo de ficha ou listagem)</span></div>'+
      '<div class="bu-num"><b>'+num(p.vinculos_pensao)+'</b><span>pensões ligadas ao servidor de origem</span></div>'+
      '<button type="button" class="bu-num" data-parte-ir="conferir"><b>'+num(p.a_conferir)+'</b><span>a conferir (nome igual sem CPF)</span></button>'+
      '<div class="bu-num"><b>'+num(p.nao_enviar)+'</b><span>marcadas "Não enviar mais"</span></div></div>'+
      '<div class="bu-bloco"><h3>Fontes</h3><p class="sub">Quantas pessoas cada fonte trouxe. Uma pessoa pode estar em várias. Nada é copiado: a base guarda só quem é quem e as ligações.</p>'+
      '<div class="bu-rolagem"><table class="bu-tab"><thead><tr><th>Fonte</th><th>Pessoas</th></tr></thead><tbody>'+
      Object.keys(f).sort(function(a,b){return f[b]-f[a];}).map(function(k){return '<tr><td>'+esc(FONTE[k]||k)+'</td><td class="n">'+num(f[k])+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      (p.al_sem_cpf_fora?'<p class="sub" style="margin-top:10px">'+num(p.al_sem_cpf_fora)+' linhas da Listagem de Alagoas sem CPF ficaram de fora: na carga provisória o nome e o CPF estão separados. Entram quando vier a leitura completa do PDF.</p>':'')+
      '<div class="bu-pag"><div class="bu-acoes"><button class="btn" type="button" id="buUnificar"'+(p.pedido_aberto?' disabled':'')+'>'+(p.pedido_aberto?'Unificação pedida…':'Unificar agora')+'</button></div></div></div>';
    c.querySelectorAll('[data-parte-ir]').forEach(function(b){b.onclick=function(){trocarParte(b.dataset.parteIr);};});
    var u=$('buUnificar');if(u)u.onclick=pedirUnificar;
  }
  async function pedirUnificar(){
    var b=$('buUnificar');if(b){b.disabled=true;b.textContent='Unificação pedida…';}
    var r=await sb().rpc('base_pedir_unificar');
    if(r.error){aviso('Não deu para pedir a unificação: '+erro(r.error),'erro');if(b){b.disabled=false;b.textContent='Unificar agora';}return;}
    aviso('Unificação pedida. O agendador começa em até 1 minuto; esta tela confere sozinha a cada 20 segundos.','amar');
    esperarRodada();
  }
  function esperarRodada(){
    var t0=Date.now(),ini=((B.painel||{}).ultima_rodada||{}).fim||'';
    var it=setInterval(async function(){
      var pane=$('aba-base-unica');if(!pane||!pane.isConnected||Date.now()-t0>20*60000){clearInterval(it);return;}
      var r=await sb().rpc('base_painel');if(r.error)return;
      var nova=(r.data.ultima_rodada||{});if(!r.data.pedido_aberto&&(nova.fim||'')!==ini){clearInterval(it);B.painel=r.data;desenhar();aviso(nova.ok===false?'A unificação falhou: '+esc(nova.erro||''):'Unificação concluída.',nova.ok===false?'erro':'');}
    },20000);
  }

  /* ---------- Pessoas ---------- */
  function SD(){return global.SagaServidoresDatas||null;}
  function irPessoas(filtro){
    pag().inicio();
    B.f={texto:'',situacao:filtro.situacao||'',fonte:filtro.fonte||'',clientes:!!filtro.clientes,de:'',ate:'',uf:filtro.uf||'',orgao:'',esfera:filtro.esfera||'',ente:filtro.ente||'',datas:Object.assign(SD()?SD().vazio():{},filtro.datas||{}),pagina:1};
    trocarParte('pessoas');
  }
  function opcoes(obj,atual,vazio){return '<option value="">'+esc(vazio)+'</option>'+Object.keys(obj).map(function(k){return '<option value="'+esc(k)+'"'+(k===atual?' selected':'')+'>'+esc(obj[k])+'</option>';}).join('');}

  /* ---------- UF e esfera/ente (bloco 423) ---------- */
  var UFS=['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  var ESFERA={federal:'Federal',estadual:'Estadual',municipal:'Municipal'};
  var UFORIG={historico_ativo:'pelo tempo de ativo',instituidor:'pela UF de quem deixou a pensão',orgao:'pelo órgão',listagem:'pela listagem',ficha:'pela ficha',manual:'à mão'};
  function htmlUfs(at){
    return '<option value="">Toda UF</option>'+(B.v423===false?'':'<option value="SEM"'+(at==='SEM'?' selected':'')+'>Sem UF</option>')+
      UFS.map(function(u){return '<option'+(u===at?' selected':'')+'>'+u+'</option>';}).join('');
  }
  function htmlEntes(esf,at){
    var l=(B.entes||[{esfera:'federal',ente:'União'}]).filter(function(e){return !esf||e.esfera===esf;});
    return '<option value="">Todo ente</option>'+l.map(function(e){return '<option value="'+esc(e.ente)+'"'+(e.ente===at?' selected':'')+'>'+esc(e.ente)+' ('+esc(ESFERA[e.esfera]||e.esfera)+')</option>';}).join('');
  }
  async function carregarEntes(){
    if(B.v423!==null){return;}
    var r=await sb().rpc('base_entes');
    if(r.error){B.v423=false;var u=$('buUf');if(u){var v=u.value;u.innerHTML=htmlUfs(v==='SEM'?'':v);}return;}
    B.v423=true;B.entes=r.data||[];var e=$('buEnte');if(e)e.innerHTML=htmlEntes($('buEsfera').value,B.f.ente);
  }
  function partePessoas(c){
    var F=B.f;
    c.innerHTML='<div class="bu-bloco"><div class="bu-filtros">'+
      '<input type="search" class="bu-busca" id="buTexto" placeholder="Nome, CPF (11 dígitos), 6 dígitos do meio ou CNPJ" value="'+esc(F.texto)+'" aria-label="Buscar pessoa">'+
      '<select id="buSit" aria-label="Situação">'+opcoes(SIT,F.situacao,'Toda situação')+'</select>'+
      '<select id="buFonte" aria-label="Fonte">'+opcoes(FONTE,F.fonte,'Toda fonte')+'</select>'+
      '<select id="buUf" aria-label="UF">'+htmlUfs(F.uf)+'</select>'+
      '<select id="buEsfera" aria-label="Esfera">'+opcoes(ESFERA,F.esfera,'Toda esfera')+'</select>'+
      '<select id="buEnte" aria-label="Ente da Federação">'+htmlEntes(F.esfera,F.ente)+'</select>'+
      '<input type="text" id="buOrgao" placeholder="Órgão (parte do nome)" value="'+esc(F.orgao)+'" aria-label="Órgão">'+
      '<input type="text" class="bu-mes" id="buDe" inputmode="numeric" placeholder="faleceu de mm/aaaa" value="'+esc(F.de)+'" aria-label="Faleceu a partir de">'+
      '<input type="text" class="bu-mes" id="buAte" inputmode="numeric" placeholder="até mm/aaaa" value="'+esc(F.ate)+'" aria-label="Faleceu até">'+
      '<label class="bu-chk"><input type="checkbox" id="buCli"'+(F.clientes?' checked':'')+'> Só clientes do SAGA</label>'+
      (SD()?SD().html('buDt',F.datas||(F.datas=SD().vazio()),{abono:true}):'')+
      '<div class="bu-acoes"><button class="btn" type="button" id="buLimpar">Limpar</button><button class="btn" type="button" id="buCsv">CSV para a Captação</button></div></div>'+
      '<div id="buLista"><div class="bu-vazio">Carregando…</div></div></div>';
    ['buDe','buAte'].forEach(function(id){$(id).addEventListener('input',function(e){e.target.value=mesMascara(e.target.value);});});
    var tm=null;function mudou(){clearTimeout(tm);tm=setTimeout(function(){lerFiltros();B.f.pagina=1;carregarLista();},350);}
    ['buTexto','buOrgao','buDe','buAte'].forEach(function(id){$(id).addEventListener('input',mudou);});
    ['buSit','buFonte','buCli','buUf','buEnte'].forEach(function(id){$(id).addEventListener('change',mudou);});
    if(SD())SD().ligar('buDt',F.datas,function(){B.f.pagina=1;clearTimeout(tm);tm=setTimeout(carregarLista,350);});
    $('buEsfera').addEventListener('change',function(){var e=$('buEnte');e.innerHTML=htmlEntes(this.value,'');mudou();});
    carregarEntes();
    $('buLimpar').onclick=function(){irPessoas({});};
    $('buCsv').onclick=exportarCsv;
    carregarLista();
  }
  function lerFiltros(){
    var F=B.f;F.texto=$('buTexto').value.trim();F.situacao=$('buSit').value;F.fonte=$('buFonte').value;F.uf=$('buUf').value;F.esfera=$('buEsfera').value;F.ente=$('buEnte').value;
    F.orgao=$('buOrgao').value.trim();F.de=$('buDe').value;F.ate=$('buAte').value;F.clientes=$('buCli').checked;
  }
  // o filtro do abono só é mandado quando os dados existem (blocos 425/426 + carga); senão a lista avisa, nunca filtra calada
  async function conferirAbono(){
    var r=await sb().rpc('siape_abono_listar',{p:{limite:1,busca:'000000'}});
    if(r.error){B.abono=(r.error.code==='PGRST202'||/could not find the function/i.test(r.error.message||''))?'sem_bloco':'erro';B.abonoErro=global.sagaErroBanco?global.sagaErroBanco(r.error):r.error.message;return;}
    B.abono=(r.data&&r.data.sem_carga)?'sem_carga':'ok';
  }
  function params(F,lim,off){
    var o={p_texto:F.texto||null,p_situacao:F.situacao||null,p_fonte:F.fonte||null,p_so_clientes:!!F.clientes,
      p_falecido_de:mesNum(F.de),p_falecido_ate:mesNum(F.ate),p_uf:F.uf||null,p_orgao:F.orgao||null,p_limite:lim,p_offset:off||0};
    if(F.esfera)o.p_esfera=F.esfera;if(F.ente)o.p_ente=F.ente;
    if(SD()&&SD().qtd(F.datas)){var pf=SD().params(F.datas,B.abono!=='ok');if(Object.keys(pf).length)o.p_filtros=pf;}
    return o;
  }
  async function carregarLista(){
    var box=$('buLista');if(!box)return;var F=B.f,meu=++B.pedido;box.classList.add('bu-carregando');
    if((F.de&&!mesNum(F.de))||(F.ate&&!mesNum(F.ate))){box.classList.remove('bu-carregando');box.innerHTML='<div class="bu-aviso amar">Mês inválido: use mm/aaaa (ex.: 03/2025).</div>';return;}
    var P=pag();P.pagina=B.f.pagina||1;
    if(SD()&&SD().temAbono(F.datas)&&B.abono!=='ok')await conferirAbono();
    if(meu!==B.pedido)return;
    var r=await SagaPaginacao.buscarEmPartes(function(off,lim){return sb().rpc('base_buscar',params(F,lim,off)).then(function(x){return x.error?x:{linhas:(x.data||{}).linhas,total:(x.data||{}).total,d:x.data};});},
      {offset:P.offset(),quantos:P.quantos(),lote:200,progresso:function(a,t){if(meu===B.pedido&&t>200)box.innerHTML='<div class="sg-pag-carregando">Carregando '+num(a)+' de '+num(t)+'…</div>';}});
    if(meu!==B.pedido)return;box.classList.remove('bu-carregando');
    if(r.error&&SD()&&SD().qtd(F.datas)&&(r.error.code==='PGRST202'||/could not find the function/i.test(r.error.message||''))){box.innerHTML='<div class="bu-aviso amar">O filtro por datas e tempo de serviço ainda não está no banco (chega com o bloco 424). Limpe as datas para buscar.</div>';return;}
    if(r.error&&(F.esfera||F.ente)&&(r.error.code==='PGRST202'||/could not find the function/i.test(r.error.message||''))){box.innerHTML='<div class="bu-aviso amar">O filtro por esfera e ente ainda não está no banco (chega com o bloco 423). Tire a esfera e o ente para buscar.</div>';return;}
    if(r.error){box.innerHTML='<div class="bu-aviso verm">Não deu para buscar: '+erro(r.error)+'</div>';return;}
    var d={linhas:r.linhas,total:r.total},ls=d.linhas||[];B.lista=d;P.total(d.total);B.f.pagina=P.pagina;
    var avAb=(SD()&&SD().temAbono(F.datas)&&B.abono!=='ok')?'<div class="bu-aviso amar"><b>A lista abaixo NÃO está filtrada pelo abono:</b> '+(B.abono==='sem_carga'?'a carga do abono de permanência ainda não foi feita (dados do Portal, numa noite).':B.abono==='sem_bloco'?'o filtro do abono chega com os blocos 425 e 426.':'não deu para conferir se os dados do abono existem: '+esc(B.abonoErro||''))+'</div>':'';
    if(!ls.length){box.innerHTML=avAb+'<div class="bu-vazio">Ninguém com esses filtros.</div>';return;}
    box.innerHTML=avAb+'<div class="bu-rolagem"><table class="bu-tab"><thead><tr><th>Pessoa</th><th>Etiquetas</th><th>Órgão</th><th>Faleceu</th></tr></thead><tbody>'+
      ls.map(function(l){
        return '<tr><td><button type="button" class="bu-nome" data-pessoa="'+(+l.id)+'">'+esc(l.nome||'(sem nome na fonte)')+'</button>'+
          '<span class="bu-sub">'+esc(l.doc||'sem CPF')+(l.uf?' · '+esc(l.uf)+(UFORIG[l.uf_origem]?' ('+UFORIG[l.uf_origem]+')':''):' · sem UF')+'</span>'+
          (SD()&&l.datas&&SD().curto(l.datas)?'<span class="bu-sub">'+esc(SD().curto(l.datas))+'</span>':'')+'</td>'+
          '<td data-r="Etiquetas">'+htmlSelos(l.selos)+'</td><td data-r="Órgão">'+esc(l.orgao||'—')+'</td>'+
          '<td data-r="Faleceu" class="n">'+(l.falecido_mes?esc(mesTxt(l.falecido_mes)):'—')+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      P.html();
    P.ligar(box);
  }
  async function exportarCsv(){
    var F=B.f,b=$('buCsv');b.disabled=true;b.textContent='Gerando…';
    try{
      var r=await sb().rpc('base_buscar',params(F,200,0));if(r.error)throw r.error;
      var total=(r.data||{}).total||0,ls=(r.data.linhas||[]).slice(),pag=2;
      if(total>MAX_CSV){aviso('São '+num(total)+' pessoas: o CSV leva as primeiras '+num(MAX_CSV)+'. Use os filtros para dividir.','amar');}
      while(ls.length<Math.min(total,MAX_CSV)){var x=await sb().rpc('base_buscar',params(F,200,(pag++-1)*200));if(x.error)throw x.error;var a=x.data.linhas||[];if(!a.length)break;ls=ls.concat(a);}
      var pula=0,linhas=[['Nome','CPF (mascarado)','Situação','Etiquetas','Órgão','UF','Faleceu (mês)','Cliente do SAGA','Ingresso no serviço público','Ingresso no órgão','Aposentadoria','Pensão desde','Anos de serviço público (estimativa para ativos)','Abono de permanência (provável)','1/3 de férias sem o abono (Tema 1.233, estimativa)','13º sem o abono (Tema 1.233, estimativa)']];
      ls.forEach(function(l){
        if((l.selos||[]).some(function(s){return s.acao==='nao_enviar';})){pula++;return;}
        linhas.push([l.nome||'',l.doc||'',SIT[l.situacao]||l.situacao,(l.selos||[]).map(function(s){return s.nome;}).join(' | '),l.orgao||'',(l.uf||'')+(UFORIG[l.uf_origem]?' ('+UFORIG[l.uf_origem]+')':''),l.falecido_mes?mesTxt(l.falecido_mes):'',l.ficha_id?'sim':'não'].concat((function(d){d=d||{};return [dataBR(d.ingresso),dataBR(d.ingresso_orgao),dataBR(d.aposentadoria),dataBR(d.pensao_inicio),d.tempo_servico==null?'':Math.floor(+d.tempo_servico),d.abono?(d.abono.recebe?'recebe'+(d.abono.valor?' '+d.abono.valor:''):'não recebe'):'',d.abono&&d.abono.ferias_sem?d.abono.ferias_sem+' (≈ '+d.abono.ferias_dif+')':'',d.abono&&d.abono.d13_sem?d.abono.d13_sem+' (≈ '+d.abono.d13_dif+')':''];})(l.datas)));
      });
      var csv='﻿'+linhas.map(function(r){return r.map(function(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(';');}).join('\r\n');
      var reg=await sb().rpc('base_registrar',{p_resumo:'Base única: exportou CSV ('+(linhas.length-1)+' pessoas; '+pula+' puladas por "Não enviar mais")',p_depois:{filtros:params(F,MAX_CSV,0),linhas:linhas.length-1,puladas:pula}});
      if(reg.error)throw reg.error;
      var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='base-unica.csv';document.body.appendChild(a);a.click();a.remove();
      aviso('CSV gerado com '+num(linhas.length-1)+' pessoas'+(pula?' ('+num(pula)+' puladas por "Não enviar mais")':'')+'. Registrado no Registro de atividades.','');
    }catch(e){aviso('Não deu para gerar o CSV: '+erro(e),'erro');}
    b.disabled=false;b.textContent='CSV para a Captação';
  }

  /* ---------- A conferir ---------- */
  async function parteConferir(c){
    c.innerHTML='<div class="bu-bloco"><h3>Possíveis duplicadas</h3><p class="sub">O sistema nunca junta sozinho quem não tem CPF. Aqui ficam as pessoas com o mesmo nome em que uma delas não tem nenhum dígito de CPF. Decida: são a mesma pessoa (juntar) ou pessoas diferentes. A decisão fica gravada e vai para o Registro de atividades.</p><div id="buConf"><div class="bu-vazio">Carregando…</div></div></div>';
    var r=await sb().rpc('base_conferir_listar',{p_limite:30,p_offset:0});var box=$('buConf');if(!box)return;
    if(r.error){box.innerHTML='<div class="bu-aviso verm">Não deu para carregar: '+erro(r.error)+'</div>';return;}
    var its=(r.data||{}).itens||[];
    if(!its.length){box.innerHTML='<div class="bu-vazio">Nada a conferir agora.</div>';return;}
    function cart(p){return '<div><button type="button" class="bu-nome" data-pessoa="'+(+p.id)+'">'+esc(p.nome||'(sem nome)')+'</button><span class="bu-sub">'+esc(p.doc||'sem CPF')+' · '+esc(p.orgao||'sem órgão')+(p.uf?' · '+esc(p.uf):'')+'</span>'+htmlSelos(p.selos)+'</div>';}
    box.innerHTML=its.map(function(it){return '<div class="bu-bloco" data-item="'+(+it.id)+'"><span class="bu-sub">'+esc(it.motivo)+'</span><div class="bu-par">'+cart(it.a)+cart(it.b)+'</div>'+
      '<div class="bu-pag"><div class="bu-acoes"><button class="btn" type="button" data-dec="diferentes">São pessoas diferentes</button><button class="btn btn-ouro" type="button" data-dec="juntar">É a mesma pessoa: juntar</button></div></div></div>';}).join('')+
      ((r.data.total||0)>its.length?'<p class="sub">Mostrando '+its.length+' de '+num(r.data.total)+'.</p>':'');
    box.onclick=async function(e){
      var b=e.target.closest('[data-dec]');if(!b)return;var item=b.closest('[data-item]');
      item.querySelectorAll('button').forEach(function(x){x.disabled=true;});
      var x=await sb().rpc('base_conferir_decidir',{p_id:+item.dataset.item,p_decisao:b.dataset.dec,p_obs:null});
      if(x.error){aviso('Não deu para gravar a decisão: '+erro(x.error),'erro');item.querySelectorAll('button').forEach(function(y){y.disabled=false;});return;}
      if(global.sagaRecolher&&!parado())global.sagaRecolher(item,false);else item.remove();
      setTimeout(function(){if(item.isConnected)item.remove();},450);
      if(B.painel){B.painel.a_conferir=Math.max(0,(B.painel.a_conferir||1)-1);var ps=$('buPartes');if(ps)ps.innerHTML=htmlPartes();}
    };
  }

  /* ---------- janela da pessoa ---------- */
  function janela(){
    var mo=$('moBase');
    if(!mo){mo=document.createElement('div');mo.className='mo';mo.id='moBase';mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('aria-label','Pessoa da Base única');
      mo.innerHTML='<div class="md largo" id="mdBase"></div>';document.body.appendChild(mo);
      mo.addEventListener('click',function(e){if(e.target===mo||e.target.closest('[data-fechar-base]'))fechar();var p=e.target.closest('[data-pessoa]');if(p){e.preventDefault();abrirPessoa(+p.dataset.pessoa);}});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&mo.classList.contains('aberto'))fechar();});}
    return mo;
  }
  function fechar(){var mo=$('moBase');if(mo)mo.classList.remove('aberto');}
  async function abrirPessoa(id){
    var mo=janela(),md=$('mdBase');
    md.innerHTML='<div class="md-cab"><div><h2>Carregando…</h2></div><button class="md-x" type="button" data-fechar-base aria-label="Fechar">✕</button></div>';
    mo.classList.add('aberto');
    var rr=await Promise.all([sb().rpc('base_pessoa',{p_id:id}),sb().rpc('base_pessoa_datas',{p_id:id})]),r=rr[0],rd=rr[1];
    if(r.error){md.innerHTML='<div class="md-cab"><div><h2>Não deu para abrir</h2><p>'+erro(r.error)+'</p></div><button class="md-x" type="button" data-fechar-base aria-label="Fechar">✕</button></div>';return;}
    var p=r.data||{};
    function sec(t,h){return h?'<div class="bu-sec"><h4>'+esc(t)+'</h4>'+h+'</div>':'';}
    var portal=(p.portal||[]).map(function(s){return '<div class="bu-lin"><b>'+esc({S:'Ativo',A:'Aposentado',P:'Pensionista'}[s.lista]||s.lista)+'</b> · '+esc(s.orgao||'')+(s.cargo?' · '+esc(s.cargo):'')+(s.uf?' · '+esc(s.uf):'')+
      '<span class="bu-sub">No Portal de '+esc(mesTxt(s.primeiro_mes))+' a '+esc(mesTxt(s.ultimo_mes))+(s.no_portal?' (ainda está)':'')+(s.ingresso?' · ingresso '+esc(dataBR(s.ingresso)):'')+(s.aposentadoria?' · aposentadoria '+esc(dataBR(s.aposentadoria)):'')+(s.pensao_inicio?' · pensão desde '+esc(dataBR(s.pensao_inicio)):'')+(s.saiu_destino?' · saiu: '+esc(s.saiu_destino):'')+'</span></div>';}).join('');
    var evs=(p.eventos||[]).map(function(e){return '<div class="bu-lin">'+esc(mesTxt(e.mes))+' · '+esc(e.evento.replace(/_/g,' '))+(e.para?' → '+esc(e.para):'')+'</div>';}).join('');
    var pens=(p.deixou_pensao_para||[]).map(function(v){return '<div class="bu-lin"><button type="button" class="bu-nome" data-pessoa="'+(+v.id)+'">'+esc(v.nome||'')+'</button><span class="bu-sub">'+esc(SIT[v.situacao]||v.situacao)+(v.inicio?' · pensão desde '+esc(dataBR(v.inicio)):'')+(v.tipo?' · '+esc(v.tipo):'')+'</span></div>';}).join('');
    var de=(p.pensao_de||[]).map(function(v){return '<div class="bu-lin">Pensão deixada por <button type="button" class="bu-nome" data-pessoa="'+(+v.id)+'">'+esc(v.nome||'')+'</button><span class="bu-sub">'+(v.falecido_mes?'falecido por volta de '+esc(mesTxt(v.falecido_mes)):'')+(v.inicio?' · desde '+esc(dataBR(v.inicio)):'')+'</span></div>';}).join('');
    var lst=(p.listagens||[]).map(function(l){return '<div class="bu-lin">'+esc(l.fonte)+(l.lista?' · '+esc(l.lista):'')+(l.pagina?' · página '+esc(l.pagina):'')+'<span class="bu-sub">Ligada '+esc(COMO[l.como]||l.como)+(l.nome_na_lista?' · nome na lista: '+esc(l.nome_na_lista):'')+'</span></div>';}).join('');
    var outras=(p.outras_fontes||[]).map(function(f){return '<div class="bu-lin">'+esc(FONTE[f.fonte]||f.fonte)+'<span class="bu-sub">Ligada '+esc(COMO[f.como]||f.como)+' em '+esc(dataHora(f.em))+'</span></div>';}).join('');
    var per=(p.periodos_pagos||[]).map(function(x){return '<div class="bu-lin"><b>'+esc(x.tese)+'</b>: pago '+esc(dataBR(x.pago_de)||'?')+' a '+esc(dataBR(x.pago_ate)||'?')+(x.falta_de?' · falta '+esc(dataBR(x.falta_de))+' a '+esc(dataBR(x.falta_ate)||'hoje'):'')+(x.fonte?'<span class="bu-sub">Fonte: '+esc(x.fonte)+'</span>':'')+'</div>';}).join('');
    var ne=(p.nao_enviar||[]).map(function(n){return '<div class="bu-lin"><b>Não enviar mais</b> · '+esc(dataBR(n.quando))+(n.canal?' · '+esc(n.canal):'')+(n.por?' · registrado por '+esc(n.por):'')+(n.o_que_disse?'<span class="bu-sub">"'+esc(n.o_que_disse)+'"</span>':'')+'</div>';}).join('');
    var ficha=p.ficha?'<div class="bu-lin">Ficha do SAGA: <a href="'+FICHA+'?pessoa_id='+encodeURIComponent(p.ficha.id)+'">'+esc(p.ficha.codigo||'')+' · '+esc(p.ficha.nome||'')+'</a>'+(p.ficha.situacao_vital==='falecido'?' <span class="bu-selo alerta">falecido na ficha</span>':'')+'</div>':'';
    md.innerHTML='<div class="md-cab"><div><h2>'+esc(p.nome||'(sem nome)')+'</h2><p>'+esc(p.doc||'sem CPF')+(p.cpf_completo?' · CPF completo guardado':'')+(p.orgao?' · '+esc(p.orgao):'')+(p.uf?' · '+esc(p.uf):'')+(p.veio_de?' · (esta pessoa foi juntada a outra)':'')+'</p><div>'+htmlSelos(p.selos)+'</div></div><button class="md-x" type="button" data-fechar-base aria-label="Fechar">✕</button></div>'+
      sec('Ficha do SAGA',ficha)+(SD()?sec('Datas e tempo de serviço (Portal)',rd.error?((rd.error.code==='PGRST202'||/could not find the function/i.test(rd.error.message||''))?'<div class="bu-aviso amar">As datas juntas e o tempo de serviço chegam com o bloco 424 (as datas de cada linha do Portal aparecem abaixo).</div>':'<div class="bu-aviso verm">Não deu para ler as datas: '+erro(rd.error)+'</div>'):SD().quadro(rd.data)):'')+sec('Portal da Transparência',portal)+sec('Deixou pensão para',pens)+sec('Pensão',de)+sec('Listagens',lst)+sec('Outras fontes',outras)+
      sec('Eventos no Portal (mais recentes)',evs)+sec('Períodos pagos por tese',per)+sec('Contato',ne||'<div class="bu-lin">Pode receber contato.</div>')+
      '<div class="bu-sec"><h4>Registrar "Não enviar mais"</h4><p class="bu-sub">A pessoa continua na base; toda exportação e disparo passam a pular. Fica com quem registrou e quando.</p>'+
      '<div class="bu-form"><input type="text" id="buNeCanal" placeholder="Canal (WhatsApp, e-mail, carta, telefone)"><textarea id="buNeDisse" placeholder="O que a pessoa disse"></textarea>'+
      '<div><button class="btn" type="button" id="buNeSalvar">Marcar "Não enviar mais"</button> <span class="bu-merro" id="buNeErro"></span></div></div></div>';
    $('buNeSalvar').onclick=async function(){
      var b=this;b.disabled=true;
      var x=await sb().rpc('base_nao_enviar_registrar',{p_base:p.id,p_canal:$('buNeCanal').value,p_o_que_disse:$('buNeDisse').value,p_quando:null});
      if(x.error){$('buNeErro').textContent='Não gravou: '+(global.sagaErroBanco?global.sagaErroBanco(x.error):x.error.message);b.disabled=false;return;}
      abrirPessoa(p.id);
    };
  }

  /* ---------- abrir ---------- */
  async function abrir(){
    var pane=$('aba-base-unica');if(!pane)return;estilos();
    if(B.montado&&B.painel)return;
    pane.innerHTML='<div class="bu-vazio">Carregando a Base única…</div>';
    var r=await sb().rpc('base_painel');
    if(r.error){pane.innerHTML='<div class="bu-aviso verm">Não deu para abrir a Base única: '+erro(r.error)+'</div>';return;}
    B.painel=r.data||{};B.montado=true;
    var q=new URLSearchParams(location.search),pt=q.get('base');if(pt&&/^(geral|pessoas|conferir|listagens)$/.test(pt))B.parte=pt;
    desenhar();
  }
  async function liberar(){
    try{var p=global.sagaPerfil?await global.sagaPerfil():null;var ok=!!(p&&p.eh_administrador);var bt=$('abaBaseUnica');if(bt)bt.hidden=!ok;return ok;}catch(e){return false;}
  }
  global.SagaServidoresBase={abrir:abrir,liberar:liberar,_estado:B};
})(window);
