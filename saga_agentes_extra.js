/* =====================================================================
   SAGA · Para aprovar: RELATÓRIO DAS AGENTES (PDF) e RECADOS PARA AS AGENTES
   (20/11/2026, Dr. Victor; blocos 286-288). Arquivo à parte para não mexer no código da tela
   (agentes_aprovar.html), que outras conversas também editam: ele mesmo põe os botões
   "Recados" e "Relatório" no alto da tela e o botão "Recado" em cada entrega.
   - Relatório: agentes_relatorio(de, até) → SagaPdf.imprimir (só leitura; sem CPF).
   - Recados: agente_recados_painel / agente_recado_enviar / agente_recados_vistos / agente_recados_arquivar.
     A agente lê e responde pelo conector (meus_recados / responder_recado) na próxima rodada;
     a resposta chega no sino de quem escreveu (referencia_tabela 'agente_recados').
   REVISÃO DAS PETIÇÕES (21/11/2026, Dr. Victor; blocos 300-302): a Luísa confere cada petição da Renata
   antes de chegar aqui. Na entrega aparece o selo (Revisada / ponto não resolvido / Não revisada) e a lista
   curta do que foi conferido; no quadro "Com a Renata", as que estão na revisão ou voltaram dela.
   CUMPRIMENTO DE SENTENÇA (22/11/2026, Dr. Victor; bloco 385): tipo de peça novo "cumprimento" (nome no NOME_PECA da tela)
   e, no Relatório, a tabela "Petições pedidas por tipo".
   Só para quem tem agentes.aprovar (o banco recusa os outros). Erros sempre à vista.
   ===================================================================== */
(function(){
  'use strict';
  var R={dados:null,ag:'',arquivadas:false,para:'luisa',proc:null,ent:null,buscaN:0,erro:null,abrirConversa:null};
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  function $(id){return document.getElementById(id);}
  function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function sb(){return window._sb;}
  function aviso(msg,tipo){
    var w=$('toastWrap');if(!w){alert(msg);return;}
    var t=document.createElement('div');t.className='toast '+(tipo||'');t.textContent=msg;w.appendChild(t);setTimeout(function(){t.remove();},6000);
  }
  function hojeMaceio(){var p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Maceio',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return p;}
  function addDias(iso,n){var d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function dataBR(iso){if(!iso)return '';var s=String(iso).slice(0,10).split('-');return s[2]+'/'+s[1]+'/'+s[0];}
  function dataHora(ts){if(!ts)return '';return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(ts)).replace(',',' às');}
  function horas(h){
    if(h==null||h==='')return '—';h=Number(h);
    if(h<1)return Math.max(1,Math.round(h*60))+' min';
    if(h<48)return String(h.toFixed(1)).replace('.',',')+' h';
    return String((h/24).toFixed(1)).replace('.',',')+' dias';
  }
  function n(v){return v==null?0:Number(v)||0;}
  /* CUMPRIMENTO DE SENTENÇA (22/11/2026, Dr. Victor; bloco 385): tipo de peça novo da Renata. O nome do tipo fica aqui e
     entra no NOME_PECA da tela (agentes_aprovar.html), para a etiqueta dos "Pedidos para a Renata" sair certa. */
  var NOME_PECA_X={impulso:'Impulso processual',manifestacao:'Manifestação',inicial_pss:'Inicial do PSS',cumprimento:'Cumprimento de sentença',outra:'Outra peça'};
  try{if(typeof NOME_PECA==='object'&&NOME_PECA&&!NOME_PECA.cumprimento)NOME_PECA.cumprimento=NOME_PECA_X.cumprimento;}catch(e){}
  function cnj(x){return window.sagaFmt&&sagaFmt.cnj?sagaFmt.cnj(x):(x||'');}
  function chave(a){a=String(a||'').toLowerCase();return ({triagem:'luisa',manutencao:'luisa',coordenador:'luisa',luisa:'luisa',redator:'renata',renata:'renata'})[a]||a;}
  var NOME={luisa:'Luísa',renata:'Renata'};
  var TIPOS={classificacao_intimacao:'Triagem de intimação',classificacao_andamento:'Triagem de andamento do CNJ',classificacao_pedido:'Triagem de pedido da equipe',
    relatorio_manutencao:'Conferência diária do sistema',peticao:'Petição pronta'};
  function tipoNome(t){return TIPOS[t]||String(t||'').replace(/_/g,' ').replace(/^./,function(c){return c.toUpperCase();});}
  var SIT={pendente:'Aguardando aprovação',ajustar:'Voltou para ajuste',aprovado:'Aprovada',executado:'Aprovada',reprovado:'Reprovada',
    substituida:'Refeita (versão nova)',erro:'Erro ao executar',cancelado:'Cancelada'};

  /* ---------- estilo próprio (pouco; o resto vem da tela e do tema) ---------- */
  var css=document.createElement('style');
  css.textContent=
    '.ax-mo{align-items:safe center}.ax-mo.ax-alto{align-items:flex-start;padding-top:5vh}'+
    '.ax-mo .md{max-height:100%;overflow:auto}.ax-mo .md.ax-larga{max-width:760px}'+
    '.ax-mo .pills{flex-wrap:wrap}.ax-mo .pill{white-space:nowrap}'+
    '.ax-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;font-size:10.5px;font-weight:600;background:color-mix(in srgb,var(--gold) 30%,transparent);color:var(--text)}'+
    '.ax-badge[hidden]{display:none}'+
    '.ax-linha{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'+
    '.ax-linha input[type=date]{height:36px;border-radius:10px;border:1px solid var(--border-soft);background:var(--panel);padding:0 10px;font-size:12.5px;color:var(--text)}'+
    '.ax-erro{margin-top:8px;padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb,var(--danger,#e5484d) 55%,transparent);background:color-mix(in srgb,var(--danger,#e5484d) 9%,transparent);font-size:12px;line-height:1.5}'+
    '.ax-erro[hidden]{display:none}'+
    '.ax-nota{font-size:11.5px;color:var(--muted);line-height:1.55}'+
    '.ax-rev{margin-top:8px;padding:9px 11px;border-radius:10px;border:1px solid var(--border-soft);background:color-mix(in srgb,var(--panel) 70%,transparent);font-size:12px;line-height:1.55}'+
    '.ax-rev.ok{border-color:color-mix(in srgb,var(--success,#30a46c) 45%,transparent)}'+
    '.ax-rev.amarelo{border-color:color-mix(in srgb,var(--warning,#f5a524) 55%,transparent)}'+
    '.ax-rev ul{margin:4px 0 0;padding-left:18px}.ax-rev li{margin:1px 0}.ax-rev .ax-rev-tit{font-weight:600}'+
    '.ax-conv{border:1px solid var(--border-soft);border-radius:12px;background:var(--panel);margin-top:10px;overflow:hidden}'+
    '.ax-conv-cab{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;padding:9px 12px;border-bottom:1px solid var(--border-soft);font-size:12px}'+
    '.ax-conv-cab b{font-weight:600}.ax-conv-cab .ax-nota a{color:var(--text)}'+
    '.ax-msgs{display:flex;flex-direction:column;gap:6px;padding:10px 12px}'+
    '.ax-msg{max-width:86%;padding:7px 10px;border-radius:12px;font-size:12.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;border:1px solid var(--border-soft)}'+
    '.ax-msg small{display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;white-space:normal}'+
    '.ax-msg.ax-pessoa{align-self:flex-end;background:color-mix(in srgb,var(--gold) 10%,var(--panel))}'+
    '.ax-msg.ax-agente{align-self:flex-start;background:color-mix(in srgb,var(--text) 4%,transparent)}'+
    '.ax-msg.ax-nova{border-color:color-mix(in srgb,var(--gold) 60%,transparent)}'+
    '.ax-resp{display:flex;gap:6px;padding:0 12px 10px;align-items:flex-end}'+
    '.ax-resp textarea,.ax-novo textarea{flex:1;min-height:40px;border-radius:10px;border:1px solid var(--border-soft);background:var(--panel-solid);padding:8px 10px;font-size:12.5px;outline:0;resize:vertical;color:var(--text)}'+
    '.ax-resp textarea:focus,.ax-novo textarea:focus{border-color:var(--gold)}'+
    '.ax-novo{border:1px dashed var(--border-soft);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}'+
    '.ax-ligado{font-size:12px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}'+
    '.ax-ligado[hidden]{display:none}'+
    '.ax-busca{position:relative}.ax-busca input{width:100%;height:34px;border-radius:10px;border:1px solid var(--border-soft);background:var(--panel-solid);padding:0 10px;font-size:12.5px;color:var(--text)}'+
    '.ax-res{display:flex;flex-direction:column;gap:2px;margin-top:4px;max-height:180px;overflow:auto}'+
    '.ax-res button{text-align:left;padding:6px 8px;border-radius:8px;font-size:12px;display:flex;justify-content:space-between;gap:10px}'+
    '.ax-res button:hover{background:color-mix(in srgb,var(--text) 6%,transparent)}.ax-res small{color:var(--muted)}'+
    '.ax-vazio{padding:22px 10px;text-align:center;color:var(--muted);font-size:12.5px}';
  document.head.appendChild(css);

  /* ---------- SagaPdf: a tela não carrega; carrega aqui na hora ---------- */
  function garantirPdf(){
    if(window.SagaPdf)return Promise.resolve();
    return new Promise(function(ok,falha){
      var v='';var me=document.querySelector('script[src*="saga_agentes_extra.js"]');if(me){var m=me.src.match(/\?v=(\d+)/);if(m)v='?v='+m[1];}
      var s=document.createElement('script');s.src='saga_pdf.js'+v;s.onload=function(){ok();};s.onerror=function(){falha(new Error('não consegui carregar o saga_pdf.js'));};
      document.head.appendChild(s);
    });
  }

  /* ---------- janelas ---------- */
  function janela(id,html,alto,larga){
    var mo=document.createElement('div');mo.className='mo ax-mo'+(alto?' ax-alto':'');mo.id=id;
    mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');mo.setAttribute('data-saga-movimento-proprio','');
    mo.innerHTML='<div class="md'+(larga?' ax-larga':'')+'">'+html+'</div>';
    document.body.appendChild(mo);
    mo.addEventListener('click',function(e){if(e.target===mo||e.target.closest('[data-ax-fechar]'))fechar(mo);});
    return mo;
  }
  function abrir(mo){requestAnimationFrame(function(){mo.classList.add('aberto');});}
  function fechar(mo){mo.classList.remove('aberto');}
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    ['axRecados','axRelatorio'].forEach(function(id){var m=$(id);if(m&&m.classList.contains('aberto'))fechar(m);});
  });

  /* =====================================================================
     RELATÓRIO EM PDF
     ===================================================================== */
  var PERIODOS=[['7d','Últimos 7 dias'],['semana','Esta semana'],['semana_passada','Semana passada'],['mes','Este mês'],['mes_passado','Mês passado']];
  function periodo(k){
    var h=hojeMaceio(),d=new Date(h+'T12:00:00Z'),dow=(d.getUTCDay()+6)%7; // 0 = segunda
    if(k==='semana')return [addDias(h,-dow),h];
    if(k==='semana_passada'){var seg=addDias(h,-dow-7);return [seg,addDias(seg,6)];}
    if(k==='mes')return [h.slice(0,8)+'01',h];
    if(k==='mes_passado'){var ini=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-1,1)),fim=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),0));return [ini.toISOString().slice(0,10),fim.toISOString().slice(0,10)];}
    return [addDias(h,-6),h];
  }
  function montarRelatorio(){
    if($('axRelatorio'))return $('axRelatorio');
    var mo=janela('axRelatorio',
      '<div class="md-cab"><h2>Relatório das agentes</h2><p>O que a Luísa e a Renata fizeram no período: rodadas, triagem, entregas, aprovações, petições, falhas e o que ficou pendente. Sai em PDF, no papel do escritório, sem CPF.</p></div>'+
      '<div class="md-corpo" style="gap:10px">'+
        '<div class="pills" role="group" aria-label="Período" id="axPer">'+PERIODOS.map(function(p,i){return '<button class="pill'+(i===0?' active':'')+'" type="button" data-per="'+p[0]+'">'+p[1]+'</button>';}).join('')+'</div>'+
        '<div class="ax-linha"><label class="ax-nota" for="axDe">De</label><input type="date" id="axDe"><label class="ax-nota" for="axAte">até</label><input type="date" id="axAte"></div>'+
        '<div class="ax-nota">O PDF abre na janela de impressão do navegador: escolha "Salvar como PDF" para guardar ou mandar ao Dr. Camargo.</div>'+
        '<div class="ax-erro" id="axRelErro" hidden></div>'+
      '</div>'+
      '<div class="md-rod"><button class="btn" type="button" data-ax-fechar>Fechar</button><button class="btn btn-ouro" type="button" id="axGerar">Gerar PDF</button></div>',false,false);
    var p=periodo('7d');$('axDe').value=p[0];$('axAte').value=p[1];
    $('axPer').addEventListener('click',function(e){
      var b=e.target.closest('[data-per]');if(!b)return;
      this.querySelectorAll('.pill').forEach(function(x){x.classList.toggle('active',x===b);});
      var q=periodo(b.dataset.per);$('axDe').value=q[0];$('axAte').value=q[1];
    });
    ['axDe','axAte'].forEach(function(id){$(id).addEventListener('input',function(){$('axPer').querySelectorAll('.pill').forEach(function(x){x.classList.remove('active');});});});
    $('axGerar').addEventListener('click',gerarRelatorio);
    return mo;
  }
  async function gerarRelatorio(){
    var de=$('axDe').value,ate=$('axAte').value,er=$('axRelErro'),b=$('axGerar');
    er.hidden=true;
    if(!de||!ate||ate<de){er.hidden=false;er.innerHTML='<b>Período inválido.</b> Escolha a data de início e a de fim (a de fim não pode ser antes).';return;}
    b.disabled=true;b.textContent='Preparando…';
    try{
      await garantirPdf();
      var r=await sb().rpc('agentes_relatorio',{p_de:de,p_ate:ate});
      if(r.error)throw r.error;
      SagaPdf.imprimir(paginasRelatorio(r.data||{}));
    }catch(e){
      er.hidden=false;er.innerHTML='<b>Não consegui gerar o relatório.</b>Motivo: '+esc((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro desconhecido')+'<br>Tente de novo; se continuar, mande esta mensagem ao administrador.';
    }finally{b.disabled=false;b.textContent='Gerar PDF';}
  }
  function kpi(rot,val,cls){return '<div'+(cls?' class="'+cls+'"':'')+'><span>'+esc(rot)+'</span><b>'+esc(val)+'</b></div>';}
  function pct(v){return v==null?'—':v+'%';}
  function paginasRelatorio(d){
    var ags=d.agentes||[],lu=ags[0]||{},re=ags[1]||{},pend=d.pendente||{};
    var tot={rod:0,ok:0,falha:0,lidos:0,ent:0,apr:0,apr1:0,dec1:0,ajus:0,repr:0,tok:0,custo:null};
    ags.forEach(function(a){
      var r=a.rodadas||{},dc=a.decisoes||{};
      tot.rod+=n(r.total);tot.ok+=n(r.ok);tot.falha+=n(r.erro)+n(r.passageiro);tot.lidos+=n(r.itens_lidos);
      tot.ent+=n((a.entregas||{}).total);tot.apr+=n(dc.aprovadas);tot.apr1+=n(dc.aprovadas_de_primeira);tot.ajus+=n(dc.ajustes);tot.repr+=n(dc.reprovadas);
      tot.tok+=n(r.tokens);if(r.custo!=null)tot.custo=(tot.custo||0)+Number(r.custo);
    });
    var den1=0;ags.forEach(function(a){den1+=n((a.decisoes||{}).decididas_primeira_versao);});
    var percGeral=den1?Math.round(100*tot.apr1/den1):null;
    var periodoTxt=dataBR(d.de)+' a '+dataBR(d.ate);
    var h='';
    h+='<div class="obs"><p><b>Quem são.</b> A <b>Luísa</b> é a coordenadora: recebe tudo o que chega ao escritório (intimações, andamentos do CNJ, pedidos da equipe), classifica, calcula o prazo, diz o que fazer e confere o sistema todo dia. A <b>Renata</b> é a executora: prepara as petições pelos modelos do escritório.</p>'+
      '<p><b>Regra.</b> Nada sai para fora sem aprovação: tudo o que elas fazem vai para a tela "Para aprovar" do SAGA, onde o Dr. Victor ou a Hevelyn aprovam, mandam ajustar ou reprovam. Protocolo e assinatura são sempre de uma pessoa.</p></div>';
    h+='<div class="secao">Resumo do período</div><div class="kpis">'+
      kpi('Rodadas de trabalho',tot.rod,'forte')+kpi('Itens lidos',tot.lidos)+kpi('Entregas feitas',tot.ent,'forte')+kpi('Aprovadas',tot.apr)+
      kpi('Aprovadas de primeira',pct(percGeral))+kpi('Mandadas ajustar',tot.ajus)+kpi('Reprovadas',tot.repr,tot.repr?'ruim':'')+kpi('Rodadas com falha',tot.falha,tot.falha?'ruim':'')+'</div>';
    var rvq=d.revisao||{};
    if(n(rvq.revisoes)>0)h+='<div class="secao">Revisão das petições (Luísa confere antes de chegar ao Dr. Victor)</div><div class="kpis">'+
      kpi('Revisões feitas',n(rvq.revisoes),'forte')+kpi('Revisadas',n(rvq.revisadas))+kpi('Revisadas de primeira',n(rvq.revisadas_de_primeira))+
      kpi('Voltaram para a Renata',n(rvq.voltaram))+kpi('Não resolvidas',n(rvq.nao_resolvidas),n(rvq.nao_resolvidas)?'ruim':'')+kpi('Sem revisão (tempo ou prazo)',n(rvq.nao_revisadas))+'</div>';
    // por agente
    function blocoAgente(a){
      var r=a.rodadas||{},dc=a.decisoes||{},en=a.entregas||{},rc=a.recados||{},s='';
      s+='<div class="secao">'+esc(a.nome||NOME[a.agente]||a.agente)+(a.agente==='luisa'?' · coordenadora e triagem':' · petições')+'</div><div class="kpis">'+
        kpi('Rodadas',n(r.total))+kpi('Certas',n(r.ok))+kpi('Com falha',n(r.erro)+n(r.passageiro),(n(r.erro)+n(r.passageiro))?'ruim':'')+kpi('Entregas',n(en.total),'forte')+
        kpi('Aprovadas',n(dc.aprovadas))+kpi('De primeira',pct(dc.percentual_primeira))+kpi('Tempo até aprovar (média)',horas(dc.horas_media))+kpi('Tempo até aprovar (metade em até)',horas(dc.horas_mediana))+'</div>';
      if(a.triagem){var t=a.triagem;s+='<div class="kpis">'+kpi('Intimações triadas',n(t.intimacoes))+kpi('Andamentos do CNJ',n(t.andamentos_cnj))+kpi('Pedidos da equipe',n(t.pedidos))+kpi('Sem providência (ignorados)',n(t.ignorados))+'</div>';}
      if(a.pecas){var k=a.pecas;s+='<div class="kpis">'+kpi('Petições pedidas',n(k.pedidas))+kpi('Petições prontas',n(k.prontas),'forte')+kpi('Petições aprovadas',n(k.aprovadas))+kpi('Protocoladas',n(k.protocoladas))+kpi('Com erro',n(k.com_erro),n(k.com_erro)?'ruim':'')+'</div>';
        var ptp=k.por_tipo||{},cps=Object.keys(ptp);
        if(cps.length)s+='<table class="tab"><thead><tr><th>Petições pedidas por tipo</th><th class="num">Quantidade</th></tr></thead><tbody>'+cps.map(function(c){return '<tr><td>'+esc(NOME_PECA_X[c]||c)+'</td><td class="num">'+esc(n(ptp[c]))+'</td></tr>';}).join('')+'</tbody></table>';}
      var pt=en.por_tipo||[];
      s+=pt.length?'<table class="tab"><thead><tr><th>Entregas por tipo</th><th class="num">Quantidade</th></tr></thead><tbody>'+pt.map(function(x){return '<tr><td>'+esc(tipoNome(x.tipo))+'</td><td class="num">'+esc(x.n)+'</td></tr>';}).join('')+'</tbody></table>'
        :'<div class="nada">Nenhuma entrega no período.</div>';
      if(n(rc.recebidos))s+='<div class="mini" style="margin-top:4px">Recados do Dr. Victor/Hevelyn: '+n(rc.recebidos)+' recebido(s), '+n(rc.respondidos)+' respondido(s)'+(rc.horas_resposta!=null?', resposta em '+horas(rc.horas_resposta)+' em média':'')+'.</div>';
      return s;
    }
    h+=blocoAgente(lu)+blocoAgente(re);
    // qualidade
    h+='<div class="secao">Qualidade (decisões tomadas no período)</div><table class="tab"><thead><tr><th>Agente</th><th class="num">Aprovadas</th><th class="num">De primeira</th><th class="num">Mandadas ajustar</th><th class="num">Reprovadas</th><th class="num">% de primeira</th><th class="num">Tempo até aprovar</th></tr></thead><tbody>'+
      ags.map(function(a){var dc=a.decisoes||{};return '<tr><td>'+esc(a.nome)+'</td><td class="num">'+n(dc.aprovadas)+'</td><td class="num">'+n(dc.aprovadas_de_primeira)+'</td><td class="num">'+n(dc.ajustes)+'</td><td class="num">'+n(dc.reprovadas)+'</td><td class="num">'+pct(dc.percentual_primeira)+'</td><td class="num">'+horas(dc.horas_media)+'</td></tr>';}).join('')+
      '</tbody></table><div class="mini" style="margin-top:3px">"De primeira" = aprovada sem pedir ajuste. "Mandadas ajustar" conta cada vez que uma entrega voltou com comentário; a agente refaz e entrega uma versão nova.</div>';
    // falhas
    var falhas=[];ags.forEach(function(a){((a.rodadas||{}).falhas||[]).forEach(function(f){falhas.push({ag:a.nome,f:f});});});
    falhas.sort(function(x,y){return String(y.f.quando).localeCompare(String(x.f.quando));});
    h+='<div class="secao">Rodadas com falha</div>'+(falhas.length?'<table class="tab"><thead><tr><th>Quando</th><th>Agente</th><th>Tipo</th><th>Motivo</th></tr></thead><tbody>'+
      falhas.map(function(x){return '<tr><td>'+esc(dataHora(x.f.quando))+'</td><td>'+esc(x.ag)+'</td><td>'+(x.f.situacao==='erro'?'<span class="alerta">Erro</span>':'Passageiro (tentou de novo)')+'</td><td>'+esc(x.f.mensagem||'')+'</td></tr>';}).join('')+'</tbody></table>'
      :'<div class="nada">Nenhuma rodada com falha no período.</div>');
    // custo
    h+='<div class="obs"><p><b>Custo.</b> As agentes trabalham dentro da assinatura do Claude do escritório'+(tot.custo!=null?' (custo estimado registrado: US$ '+String(tot.custo.toFixed(2)).replace('.',',')+')':', sem cobrança por uso')+'.'+(tot.tok?' Volume processado: '+tot.tok.toLocaleString('pt-BR')+' tokens.':'')+'</p></div>';
    // pendente
    h+='<div class="secao">O que ficou pendente (hoje)</div><div class="kpis">'+
      kpi('Aguardando aprovação',n(pend.para_aprovar),n(pend.para_aprovar)?'forte':'')+kpi('Com prazo em até 2 dias',n(pend.para_aprovar_vencendo),n(pend.para_aprovar_vencendo)?'ruim':'')+
      kpi('Em ajuste com as agentes',n(pend.em_ajuste))+kpi('Ainda não triados',n(pend.a_triar))+kpi('Petições na fila',n(pend.pecas_fila))+
      kpi('Petições para protocolar',n(pend.pecas_para_protocolar))+kpi('Com erro',n(pend.com_erro)+n(pend.pecas_erro),(n(pend.com_erro)+n(pend.pecas_erro))?'ruim':'')+kpi('Recados sem resposta',n(pend.recados_sem_resposta))+'</div>';
    var pl=pend.lista||[];
    if(pl.length)h+='<table class="tab"><thead><tr><th>Agente</th><th>O quê</th><th>Cliente</th><th>Situação</th><th>Prazo</th></tr></thead><tbody>'+
      pl.map(function(x){return '<tr><td>'+esc(x.agente_nome)+'</td><td>'+esc(x.titulo)+'</td><td>'+esc(x.cliente||'')+(x.codigo?' <span class="mini">'+esc(x.codigo)+'</span>':'')+'</td><td>'+esc(SIT[x.situacao]||x.situacao)+'</td><td>'+esc(dataBR(x.prazo))+'</td></tr>';}).join('')+'</tbody></table>';
    var paginas=[h];
    // lista das entregas
    var l=d.entregas||[];
    var h2='<div class="secao">Entregas do período ('+l.length+(n(d.total_entregas_periodo)>l.length?' de '+n(d.total_entregas_periodo):'')+')</div>';
    h2+=l.length?'<table class="tab"><thead><tr><th>Entregue em</th><th>Agente</th><th>O quê</th><th>Cliente / processo</th><th>Situação</th><th class="num">Até decidir</th></tr></thead><tbody>'+
      l.map(function(x){return '<tr><td>'+esc(dataHora(x.criado_em))+'</td><td>'+esc(x.agente_nome)+'</td><td>'+esc(x.titulo)+'<div class="mini">'+esc(tipoNome(x.tipo))+(x.versao>1?' · versão '+esc(x.versao):'')+'</div></td>'+
        '<td>'+esc(x.cliente||'—')+'<div class="mini">'+esc(x.codigo||'')+(x.numero?' · '+esc(cnj(x.numero)):'')+'</div></td><td>'+esc(SIT[x.situacao]||x.situacao)+(x.decidido_por?'<div class="mini">'+esc(x.decidido_por)+'</div>':'')+'</td><td class="num">'+horas(x.horas)+'</td></tr>';}).join('')+'</tbody></table>'
      :'<div class="nada">Nenhuma entrega no período.</div>';
    paginas.push(h2);
    return {titulo:'Relatório das agentes',subtitulo:'Luísa e Renata · '+periodoTxt,arquivo:'Relatorio agentes '+String(d.de)+' a '+String(d.ate),paginas:paginas};
  }

  /* =====================================================================
     RECADOS
     ===================================================================== */
  function montarRecados(){
    if($('axRecados'))return $('axRecados');
    var mo=janela('axRecados',
      '<div class="md-cab"><h2>Recados para as agentes</h2><p>Escreva para a Luísa ou a Renata. Ela lê e responde na próxima rodada dela; a resposta aparece aqui e no sino. O recado vale como pedido seu, mas as regras continuam: nada sai para fora sem aprovação, elas param na tela de assinatura e não apagam nada.</p></div>'+
      '<div class="md-corpo" style="gap:10px">'+
        '<div class="ax-novo"><div class="ax-linha"><span class="ax-nota">Para</span><div class="pills" role="group" aria-label="Para quem" id="axPara"><button class="pill active" type="button" data-para="luisa">Luísa</button><button class="pill" type="button" data-para="renata">Renata</button></div></div>'+
          '<div class="ax-ligado" id="axLigado" hidden></div>'+
          '<div class="ax-busca" id="axBuscaBloco"><input type="search" id="axBusca" autocomplete="off" placeholder="Ligar a um processo (opcional): nome, código ou número"><div class="ax-res" id="axRes"></div></div>'+
          '<textarea id="axTexto" maxlength="4000" placeholder="Escreva o recado"></textarea>'+
          '<div class="ax-linha" style="justify-content:flex-end"><button class="btn btn-ouro" type="button" id="axEnviar">Enviar recado</button></div></div>'+
        '<div class="ax-linha"><div class="pills" role="group" aria-label="Qual agente" id="axFiltroAg"><button class="pill active" type="button" data-fag="">Todas</button><button class="pill" type="button" data-fag="luisa">Luísa</button><button class="pill" type="button" data-fag="renata">Renata</button></div>'+
          '<div class="pills" role="group" aria-label="Abertas ou arquivadas" id="axFiltroArq"><button class="pill active" type="button" data-arq="0">Conversas</button><button class="pill" type="button" data-arq="1">Arquivadas</button></div></div>'+
        '<div class="ax-erro" id="axRecErro" hidden></div>'+
        '<div id="axConversas"><div class="ax-vazio">Carregando…</div></div>'+
      '</div>'+
      '<div class="md-rod"><button class="btn" type="button" data-ax-fechar>Fechar</button></div>',true,true);
    $('axPara').addEventListener('click',function(e){var b=e.target.closest('[data-para]');if(!b)return;R.para=b.dataset.para;this.querySelectorAll('.pill').forEach(function(x){x.classList.toggle('active',x===b);});});
    $('axFiltroAg').addEventListener('click',function(e){var b=e.target.closest('[data-fag]');if(!b||R.ag===b.dataset.fag)return;R.ag=b.dataset.fag;this.querySelectorAll('.pill').forEach(function(x){x.classList.toggle('active',x===b);});setTimeout(carregarRecados,0);});
    $('axFiltroArq').addEventListener('click',function(e){var b=e.target.closest('[data-arq]');if(!b)return;var v=b.dataset.arq==='1';if(R.arquivadas===v)return;R.arquivadas=v;this.querySelectorAll('.pill').forEach(function(x){x.classList.toggle('active',x===b);});setTimeout(carregarRecados,0);});
    $('axEnviar').addEventListener('click',enviarNovo);
    $('axBusca').addEventListener('input',buscarProcesso);
    $('axRes').addEventListener('click',function(e){var b=e.target.closest('[data-proc]');if(!b)return;ligar({proc:b.dataset.proc,rotulo:b.dataset.rot});});
    $('axLigado').addEventListener('click',function(e){if(e.target.closest('[data-desligar]'))ligar(null);});
    $('axConversas').addEventListener('click',cliqueConversa);
    return mo;
  }
  function ligar(x){
    R.proc=x&&x.proc||null;R.ent=x&&x.ent||null;
    var l=$('axLigado');
    if(!x){l.hidden=true;l.innerHTML='';$('axBuscaBloco').hidden=false;return;}
    l.hidden=false;$('axBuscaBloco').hidden=true;$('axRes').innerHTML='';$('axBusca').value='';
    l.innerHTML='<span class="ax-nota">Ligado a</span> <b>'+esc(x.rotulo||'processo')+'</b> <button class="btn" type="button" data-desligar style="height:28px">Tirar</button>';
  }
  async function buscarProcesso(){
    var t=this.value.trim(),lista=$('axRes'),k=++R.buscaN;
    if(t.length<3){lista.innerHTML='';return;}
    await new Promise(function(r){setTimeout(r,280);});if(k!==R.buscaN)return;
    try{
      var r=await sb().rpc('busca_global',{p_termo:t});if(k!==R.buscaN)return;if(r.error)throw r.error;
      var pro=((r.data||{}).processos||[]).slice(0,10);
      lista.innerHTML=pro.length?pro.map(function(p){var nome=(p.pessoa&&p.pessoa.nome_completo)||'Processo',rot=nome+(p.codigo?' · '+p.codigo:'');
        return '<button type="button" data-proc="'+esc(p.id)+'" data-rot="'+esc(rot)+'"><span>'+esc(nome)+'</span><small>'+esc(p.codigo||cnj(p.numero_processo_cnj)||'')+'</small></button>';}).join('')
        :'<div class="ax-nota">Nenhum processo encontrado para "'+esc(t)+'".</div>';
    }catch(e){if(k===R.buscaN)lista.innerHTML='<div class="ax-nota" style="color:var(--danger,#e5484d)">A busca falhou: '+esc((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||'erro')+'</div>';}
  }
  async function enviarNovo(){
    var t=$('axTexto').value.trim(),b=$('axEnviar');
    if(!t){aviso('Escreva o recado.','error');$('axTexto').focus();return;}
    b.disabled=true;
    var r=await sb().rpc('agente_recado_enviar',{p_agente:R.para,p_texto:t,p_processo:R.proc,p_entrega:R.ent,p_conversa:null});
    b.disabled=false;
    if(r.error){mostrarErroRec('Não consegui enviar o recado.',r.error);return;}
    $('axTexto').value='';ligar(null);
    aviso('Recado enviado. '+((r.data&&r.data.quando_responde)||''),'success');
    await carregarRecados();
  }
  function mostrarErroRec(tit,e){var er=$('axRecErro');er.hidden=false;er.innerHTML='<b>'+esc(tit)+'</b> Motivo: '+esc((window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||String(e||'erro desconhecido'));}
  async function carregarRecados(){
    var box=$('axConversas');$('axRecErro').hidden=true;
    var r=await sb().rpc('agente_recados_painel',{p_agente:R.ag||null,p_arquivadas:R.arquivadas});
    if(r.error){box.innerHTML='';mostrarErroRec('Não consegui carregar os recados.',r.error);return;}
    R.dados=r.data||{};desenharConversas();contar(R.dados.contagem);
    // o que a agente respondeu e está à vista fica como visto (e some do sino)
    var novas=(R.dados.conversas||[]).filter(function(c){return n(c.novas)>0;});
    if(novas.length&&$('axRecados').classList.contains('aberto')){
      await Promise.all(novas.map(function(c){return sb().rpc('agente_recados_vistos',{p_conversa:c.conversa_id});}));
      atualizarContagem();
    }
  }
  function desenharConversas(){
    var l=(R.dados&&R.dados.conversas)||[],box=$('axConversas');
    if(!l.length){box.innerHTML='<div class="ax-vazio">'+(R.arquivadas?'Nenhuma conversa arquivada.':'Nenhum recado ainda. Escreva o primeiro acima.')+'</div>';return;}
    box.innerHTML=l.map(function(c){
      var f=c.pessoa_id?FICHA+'?pessoa_id='+encodeURIComponent(c.pessoa_id)+(c.processo_id?'&processo_id='+encodeURIComponent(c.processo_id):''):null;
      var sobre=[c.cliente,c.codigo,c.numero?cnj(c.numero):null].filter(Boolean).join(' · ');
      var st=n(c.aguardando)?'<span class="selo amarelo">Aguardando a '+esc(c.agente_nome)+(c.lido_pela_agente?' · ela já leu':' · ainda não leu')+'</span>':'<span class="selo ok">Respondido</span>';
      return '<div class="ax-conv" data-conv="'+esc(c.conversa_id)+'" id="axc-'+esc(c.conversa_id)+'"><div class="ax-conv-cab"><div><b>'+esc(c.agente_nome)+'</b>'+
        (sobre?' <span class="ax-nota">· '+esc(sobre)+(f?' <a href="'+esc(f)+'">ficha ↗</a>':'')+'</span>':'')+
        (c.entrega_titulo?'<div class="ax-nota">Sobre a entrega: '+esc(c.entrega_titulo)+'</div>':'')+'</div>'+
        '<div class="ax-linha">'+st+'<button class="btn" type="button" style="height:28px" data-arquivar="'+(c.arquivada?'0':'1')+'">'+(c.arquivada?'Tirar do arquivo':'Arquivar')+'</button></div></div>'+
        '<div class="ax-msgs">'+(c.mensagens||[]).map(function(m){
          var ag=m.autor_tipo==='agente';
          return '<div class="ax-msg '+(ag?'ax-agente':'ax-pessoa')+(ag&&!m.lido_em?' ax-nova':'')+'"><small>'+esc(m.quem||'')+' · '+esc(dataHora(m.criado_em))+
            (!ag?(m.respondido_em?' · respondido':(m.lido_em?' · lido pela agente':' · ainda não lido')):'')+'</small>'+esc(m.texto)+'</div>';}).join('')+'</div>'+
        '<div class="ax-resp"><textarea maxlength="4000" placeholder="Escrever mais nesta conversa" aria-label="Escrever mais nesta conversa"></textarea><button class="btn" type="button" data-mais>Enviar</button></div></div>';
    }).join('');
    if(R.abrirConversa){var el=$('axc-'+R.abrirConversa);R.abrirConversa=null;if(el)el.scrollIntoView({block:'start',behavior:'smooth'});}
  }
  async function cliqueConversa(e){
    var cv=e.target.closest('[data-conv]');if(!cv)return;var id=cv.dataset.conv;
    var bm=e.target.closest('[data-mais]');
    if(bm){
      var ta=cv.querySelector('.ax-resp textarea'),t=ta.value.trim();
      if(!t){aviso('Escreva o recado.','error');ta.focus();return;}
      bm.disabled=true;
      var r=await sb().rpc('agente_recado_enviar',{p_agente:null,p_texto:t,p_processo:null,p_entrega:null,p_conversa:id});
      bm.disabled=false;
      if(r.error){mostrarErroRec('Não consegui enviar.',r.error);return;}
      aviso('Recado enviado.','success');await carregarRecados();return;
    }
    var ba=e.target.closest('[data-arquivar]');
    if(ba){
      var arq=ba.dataset.arquivar==='1';
      var go=async function(){var r=await sb().rpc('agente_recados_arquivar',{p_conversa:id,p_arquivar:arq});if(r.error){mostrarErroRec('Não consegui '+(arq?'arquivar':'tirar do arquivo')+'.',r.error);return false;}return true;};
      var ok=await go();
      if(ok&&window.sagaRecolher)await new Promise(function(fim){try{sagaRecolher(cv,true,fim);}catch(x){fim();}setTimeout(fim,700);});
      if(ok){aviso(arq?'Conversa arquivada (nada foi apagado).':'Conversa de volta.','success');await carregarRecados();}
    }
  }
  function contar(c){
    var b=$('axBadge');if(!b||!c)return;
    var nn=n(c.novas);b.hidden=!nn;b.textContent=nn?String(nn):'';
    var bt=$('axBtnRecados');if(bt)bt.title=nn?nn+' resposta(s) nova(s) das agentes':(n(c.aguardando)?n(c.aguardando)+' recado(s) aguardando resposta':'Recados para as agentes');
  }
  async function atualizarContagem(){
    try{var r=await sb().rpc('agente_recados_painel',{p_agente:null,p_arquivadas:false});if(!r.error)contar((r.data||{}).contagem);}catch(e){}
  }
  async function abrirRecados(opc){
    opc=opc||{};var mo=montarRecados();
    if(opc.conversa)R.abrirConversa=opc.conversa;
    if(opc.para){R.para=opc.para;$('axPara').querySelectorAll('.pill').forEach(function(x){x.classList.toggle('active',x.dataset.para===opc.para);});}
    if(opc.ligar)ligar(opc.ligar);
    abrir(mo);
    await carregarRecados();
    if(opc.ligar||opc.para)setTimeout(function(){$('axTexto').focus();},120);
  }

  /* ---------- botões na tela ---------- */
  function porBotoes(){
    var at=$('btnAtualizar');if(!at||$('axBtnRelatorio'))return false;
    var wrap=document.createElement('div');wrap.className='ax-linha';
    at.parentNode.insertBefore(wrap,at);
    wrap.innerHTML='<button class="btn" type="button" id="axBtnRecados">Recados <span class="ax-badge" id="axBadge" hidden></span></button>'+
      '<button class="btn" type="button" id="axBtnRelatorio">Relatório (PDF)</button>';
    wrap.appendChild(at);
    $('axBtnRecados').addEventListener('click',function(){abrirRecados();});
    $('axBtnRelatorio').addEventListener('click',function(){abrir(montarRelatorio());});
    return true;
  }
  /* ---------- revisão das petições (Luísa) ---------- */
  function lista(arr){arr=(arr||[]).filter(function(x){return x&&String(x).trim();});return arr.length?'<ul style="margin:4px 0 0;padding-left:18px">'+arr.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'';}
  function htmlRevisao(rv){
    if(!rv||!rv.situacao)return '';
    var au=rv.automatica||{},conf=(rv.conferido||[]).concat(au.conferido||[]),prob=rv.problemas||[],avs=au.avisos||[],autoProb=au.problemas||[];
    var cls='amarelo',tit;
    if(rv.situacao==='revisada'){cls='ok';tit='Revisada'+(rv.revisor?' pela '+rv.revisor:'')+(rv.em?' em '+dataHora(rv.em):'');}
    else if(rv.situacao==='nao_resolvido'){tit='Revisão: '+(prob.length||1)+' ponto(s) não resolvido(s) depois de '+(rv.volta?Math.max(1,Number(rv.volta)-1):2)+' volta(s) para a Renata';}
    else if(rv.situacao==='nao_revisada'){tit='Não revisada'+(rv.motivo?': '+rv.motivo:'')+'. Confira com atenção.';}
    else return '';
    var h='<div class="ax-rev '+cls+'" data-ax-rev><div class="ax-rev-tit">'+esc(tit)+'</div>';
    if(rv.situacao!=='revisada'&&prob.length)h+='<div style="margin-top:4px"><b>O que ficou:</b>'+lista(prob)+'</div>';
    if(rv.situacao==='revisada'&&prob.length)h+='<div style="margin-top:4px"><b>Observações da revisão:</b>'+lista(prob)+'</div>';
    if(autoProb.length&&rv.situacao!=='revisada')h+='<div style="margin-top:4px"><b>Conferência automática achou:</b>'+lista(autoProb)+'</div>';
    if(rv.comentario)h+='<div style="margin-top:4px"><b>Comentário:</b> '+esc(rv.comentario)+'</div>';
    if(conf.length)h+='<div style="margin-top:4px"><b>Conferido:</b> '+esc(conf.join('; '))+'.</div>';
    if(avs.length)h+='<div style="margin-top:4px"><b>Para conferir:</b>'+lista(avs)+'</div>';
    return h+'</div>';
  }
  // texto do quadro "Com a Renata" para as que estão na revisão (chamado pelo agentes_aprovar.html)
  function revisaoNaFila(k){
    var rv=k.revisao||{};
    if(k.situacao==='em_revisao')return '<div class="det" style="margin-top:6px">Na revisão da Luísa'+(k.revisao_desde?' desde '+esc(dataHora(k.revisao_desde)):'')+
      (k.revisao_voltas?' (corrigida pela Renata, '+esc(k.revisao_voltas)+'ª volta)':'')+'. Revisada, aparece aqui em cima, em Para aprovar. Se passar de 2 h na revisão ou o prazo for em até 2 dias úteis, vem sozinha, marcada "Não revisada".</div>';
    return '<div class="aviso-amarelo" style="margin-top:6px"><b>A Luísa pediu correção ('+esc(k.revisao_voltas||1)+'ª volta).</b> A Renata corrige na próxima rodada.'+lista(rv.problemas)+(rv.comentario?'<div>'+esc(rv.comentario)+'</div>':'')+'</div>';
  }
  function revisaoEntregas(){
    var area=$('area');if(!area||!window.P)return;
    area.querySelectorAll('.ped[data-id]').forEach(function(el){
      if(el.querySelector('[data-ax-rev]'))return;
      var e=(P.lista||[]).filter(function(x){return x.id===el.dataset.id;})[0];
      if(!e||e.tipo!=='peticao'||!e.conteudo||!e.conteudo.revisao)return;
      var h=htmlRevisao(e.conteudo.revisao);if(!h)return;
      var sel=el.querySelector('.selos'),d=document.createElement('div');d.innerHTML=h;
      if(sel)sel.parentNode.insertBefore(d.firstChild,sel);
      var rv=e.conteudo.revisao,s2=document.createElement('span');
      s2.className='selo '+(rv.situacao==='revisada'?'ok':'amarelo');
      s2.textContent=rv.situacao==='revisada'?'Revisada':(rv.situacao==='nao_revisada'?'Não revisada':'Revisão: ponto não resolvido');
      if(sel)sel.insertBefore(s2,sel.firstChild);
    });
  }
  // botão "Recado" em cada entrega (abre o recado já ligado a ela)
  function botoesEntregas(){
    var area=$('area');if(!area||!window.P||!P.dados||!P.dados.pode_aprovar)return;
    area.querySelectorAll('.ped[data-id]').forEach(function(el){
      var ac=el.querySelector('.acoes');if(!ac||ac.querySelector('[data-ax-recado]'))return;
      var e=(P.lista||[]).filter(function(x){return x.id===el.dataset.id;})[0];if(!e)return;
      var ag=chave(e.agente);if(ag!=='luisa'&&ag!=='renata')return;
      var b=document.createElement('button');b.className='btn';b.type='button';b.setAttribute('data-ax-recado','');b.textContent='Recado';
      b.title='Escrever para a '+NOME[ag]+' sobre esta entrega';
      b.addEventListener('click',function(ev){ev.stopPropagation();
        abrirRecados({para:ag,ligar:{proc:e.processo_id||null,ent:e.id,rotulo:e.titulo+(e.codigo?' · '+e.codigo:'')}});});
      ac.insertBefore(b,ac.firstChild);
    });
  }
  function iniciar(){
    if(!porBotoes())return;
    var area=$('area');if(area)new MutationObserver(function(){revisaoEntregas();botoesEntregas();}).observe(area,{childList:true});
    var tentativas=0;
    (function esperar(){ // espera a tela carregar (sessão e permissões) antes de contar
      if(window.P&&P.dados){
        revisaoEntregas();
        if(!P.dados.pode_aprovar){var w=$('axBtnRecados');if(w)w.parentNode.hidden=true;return;}
        botoesEntregas();atualizarContagem();
        var q=new URLSearchParams(location.search);
        if(q.has('recados'))abrirRecados({conversa:q.get('recados')||null});
        if(q.get('relatorio')==='1')abrir(montarRelatorio());
        return;
      }
      if(++tentativas<120)setTimeout(esperar,250);
    })();
    document.addEventListener('visibilitychange',function(){if(!document.hidden)atualizarContagem();});
  }
  window.SagaAgentesExtra={revisaoNaFila:revisaoNaFila,htmlRevisao:htmlRevisao,abrirRecados:abrirRecados,abrirRelatorio:function(){abrir(montarRelatorio());},paginasRelatorio:paginasRelatorio};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
