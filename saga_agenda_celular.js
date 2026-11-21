/* SAGA · Agenda no celular / Google Agenda (21/11/2026, ideia 5 do check-up; blocos 357 e 358).
   Botão "Ver no celular" na Agenda: cada pessoa gera um LINK PESSOAL (só leitura) com os compromissos dela (e, se quiser,
   os da agenda do escritório) para assinar no Google Agenda ou no iPhone. "Gerar link novo" desliga o anterior na hora;
   "Desligar o link" para quando o celular for perdido. Funções do banco: agenda_link_situacao / agenda_link_gerar /
   agenda_link_desligar; o arquivo .ics sai da função do servidor agenda-ics. Colaborador vê no celular só o tipo e o
   código VMM (sem nome de cliente); o administrador geral vê o título completo. O SAGA também avisa no sino 30 min antes
   de cada compromisso (bloco 358). Erros sempre à vista. */
(function(){
  'use strict';
  var sb=window._sb; if(!sb)return;
  var BASE=(window.SUPABASE_URL||'https://fmoskdxgjulagedzjxxk.supabase.co')+'/functions/v1/agenda-ics?t=';
  var h=function(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');};
  var dataHora=function(v){if(!v)return '';var d=new Date(v);return d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});};
  var situacao=null,escritorio=false,ocupado=false,ios=/iPhone|iPad|iPod/.test(navigator.userAgent);

  var css=document.createElement('style');css.textContent=[
    '#modalAgCel .modal-comp{max-width:560px;max-height:100%}',
    '#modalAgCel.aberto{display:flex;align-items:safe center}',
    '.agc-p{font-size:13px;color:var(--muted);line-height:1.55;margin:0 0 12px}',
    '.agc-seg{display:inline-flex;gap:4px;padding:4px;border:1px solid var(--border);border-radius:12px;margin:2px 0 14px;flex-wrap:wrap}',
    '.agc-seg button{border:0;background:none;color:var(--muted);font:inherit;font-size:12.5px;padding:7px 12px;border-radius:9px;cursor:pointer}',
    '.agc-seg button.active{background:color-mix(in srgb,var(--gold) 18%,transparent);color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 45%,transparent)}',
    '.agc-link{display:flex;gap:8px;align-items:center;margin:4px 0 6px}',
    '.agc-link input{flex:1;min-width:0;font:12px ui-monospace,Menlo,monospace;padding:9px 10px;border:1px solid var(--border);border-radius:9px;background:var(--panel-2,var(--panel));color:var(--text)}',
    '.agc-info{font-size:12px;color:var(--muted);margin:0 0 14px}',
    '.agc-acoes{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 4px}',
    '.agc-passo{border:1px solid var(--border-soft);border-radius:12px;padding:10px 14px;margin:8px 0}',
    '.agc-passo summary{cursor:pointer;font-weight:600;font-size:13px;color:var(--text)}',
    '.agc-passo ol{margin:8px 0 2px;padding-left:20px;font-size:12.5px;color:var(--muted);line-height:1.55}',
    '.agc-erro{border:1px solid color-mix(in srgb,#e5484d 55%,transparent);background:color-mix(in srgb,#e5484d 10%,transparent);color:var(--text);border-radius:10px;padding:9px 12px;font-size:12.5px;margin:8px 0}',
    '.agc-aviso{border:1px solid color-mix(in srgb,var(--gold) 40%,transparent);border-radius:10px;padding:9px 12px;font-size:12.5px;color:var(--text);margin:8px 0}',
    '.agc-ok{font-size:12px;color:var(--gold);margin-left:4px}'
  ].join('\n');document.head.appendChild(css);

  // botão na barra da Agenda (ao lado de "Meus horários")
  var ref=document.getElementById('btnMeusHorarios')||document.getElementById('btnMarcarAtendimento');
  if(!ref)return;
  var btn=document.createElement('button');btn.type='button';btn.className='btn-hoje';btn.id='btnAgendaCelular';
  btn.title='Ver a sua agenda do SAGA no Google Agenda ou no iPhone (link pessoal, só leitura)';btn.textContent='Ver no celular';
  ref.parentNode.insertBefore(btn,ref.nextSibling);

  var ov=document.createElement('div');ov.className='modal-overlay';ov.id='modalAgCel';
  ov.innerHTML='<div class="modal-comp" role="dialog" aria-modal="true" aria-labelledby="agcTit"><div class="modal-comp-header"><h3 id="agcTit">Agenda no celular</h3>'+
    '<button class="btn-fechar-modal" type="button" data-agc-fechar aria-label="Fechar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>'+
    '<div id="agcCorpo"><p class="agc-p">Carregando…</p></div></div>';
  document.body.appendChild(ov);
  var corpo=ov.querySelector('#agcCorpo');

  function abrir(){ov.classList.add('aberto');carregar();}
  function fechar(){ov.classList.remove('aberto');}
  btn.addEventListener('click',abrir);
  ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-agc-fechar]'))fechar();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov.classList.contains('aberto'))fechar();});

  function erroTexto(e){var m=(e&&(e.message||e.details))||String(e||'');
    if(/agenda_link|function .* does not exist|schema cache/i.test(m))return 'A agenda no celular ainda não foi ligada no banco (bloco 357). Avise o administrador.';
    if(/Failed to fetch|NetworkError|Load failed/i.test(m))return 'Sem ligação com o servidor agora. Confira a internet e tente de novo.';
    return window.sagaErroBanco?window.sagaErroBanco(e):(m||'Não foi possível concluir.');}
  function mostrarErro(msg){var d=corpo.querySelector('.agc-erro');if(!d){d=document.createElement('div');d.className='agc-erro';d.setAttribute('role','alert');corpo.insertBefore(d,corpo.firstChild);}d.textContent=msg;}

  async function carregar(){
    corpo.innerHTML='<p class="agc-p">Carregando…</p>';
    try{var r=await sb.rpc('agenda_link_situacao');if(r.error)throw r.error;situacao=r.data||{ativo:false};desenhar();}
    catch(e){situacao=null;corpo.innerHTML='';mostrarErro(erroTexto(e));}
  }
  function seg(){return '<div class="agc-seg" role="group" aria-label="O que entra no celular"><button type="button" data-agc-esc="0" class="'+(escritorio?'':'active')+'">Só a minha agenda</button><button type="button" data-agc-esc="1" class="'+(escritorio?'active':'')+'">A minha + a do escritório</button></div>';}
  function desenhar(){
    var s=situacao||{};var h1='';
    if(!s.ativo){
      h1+='<p class="agc-p">Gere um <b>link pessoal</b> com os seus compromissos do SAGA para ver no <b>Google Agenda</b> ou no <b>calendário do iPhone</b>. É só leitura: para marcar ou mudar, continue usando o SAGA.</p>'+seg()+
        '<div class="agc-acoes"><button type="button" class="btn-salvar-modal" data-agc-gerar>Gerar meu link</button></div>'+
        '<p class="agc-info">O SAGA também avisa no sino 30 minutos antes de cada compromisso seu.</p>';
    }else{
      escritorio=!!s.incluir_escritorio;
      var url=BASE+encodeURIComponent(s.token);
      h1+='<p class="agc-p">Este é o seu link pessoal. <b>Não mande para ninguém</b>: quem tiver o link vê os seus compromissos.</p>'+
        '<div class="agc-link"><input id="agcUrl" readonly value="'+h(url)+'" aria-label="Link da agenda" onfocus="this.select()"><button type="button" class="btn-hoje" data-agc-copiar>Copiar</button><span class="agc-ok" id="agcOk" aria-live="polite"></span></div>'+
        '<p class="agc-info">'+(escritorio?'Entra a sua agenda e a do escritório.':'Entra só a sua agenda.')+' Criado em '+h(dataHora(s.criado_em))+'. '+
        (s.ultimo_acesso_em?'Última leitura pelo celular/Google: '+h(dataHora(s.ultimo_acesso_em))+' ('+(s.acessos||0)+(s.acessos==1?' leitura':' leituras')+').':'Ainda não foi lido por nenhum celular.')+'</p>'+
        '<details class="agc-passo"'+(ios?'':' open')+'><summary>No Google Agenda (Android ou computador)</summary><ol>'+
          '<li>No <b>computador</b>, abra o Google Agenda (calendar.google.com) com a sua conta.</li>'+
          '<li>Na esquerda, em <b>Outras agendas</b>, clique em <b>+</b> e depois em <b>Do URL</b>.</li>'+
          '<li>Cole o link acima e clique em <b>Adicionar agenda</b>. Em alguns minutos ela aparece também no celular (no app do Google Agenda).</li>'+
          '<li>Lembrete: no Google, clique nos três pontinhos da agenda "SAGA" > <b>Configurações</b> > <b>Notificações de eventos</b> e escolha 30 minutos. (O Google não usa o lembrete que vem no link.)</li>'+
          '<li>O Google relê agendas de fora algumas vezes por dia: compromisso novo pode levar algumas horas para aparecer. No SAGA aparece na hora.</li></ol></details>'+
        '<details class="agc-passo"'+(ios?' open':'')+'><summary>No iPhone</summary><ol>'+
          '<li>Toque em <b>Abrir no iPhone</b> abaixo e confirme <b>Assinar</b>. Ou: Ajustes > Calendário > Contas > Adicionar Conta > Outra > <b>Adicionar Calendário Assinado</b> e cole o link.</li>'+
          '<li>O iPhone avisa 30 minutos antes (o lembrete vem no link).</li></ol></details>'+
        '<div class="agc-acoes"><a class="btn-hoje" href="'+h(url.replace(/^https:/,'webcal:'))+'">Abrir no iPhone</a></div>'+
        '<details class="agc-passo"><summary>Trocar ou desligar o link</summary>'+
          '<p class="agc-p" style="margin-top:8px">Gerar um link novo desliga o atual na hora (o celular que usava o antigo para de receber). Use se o celular for perdido ou o link for parar em outra mão.</p>'+seg()+
          '<div class="agc-acoes"><button type="button" class="btn-hoje" data-agc-gerar>Gerar link novo</button><button type="button" class="btn-excluir-modal" data-agc-desligar>Desligar o link</button></div></details>'+
        '<p class="agc-info">O SAGA também avisa no sino 30 minutos antes de cada compromisso seu.</p>';
    }
    corpo.innerHTML=h1;
  }
  corpo.addEventListener('click',async function(e){
    var b=e.target.closest('button');if(!b||ocupado)return;
    if(b.hasAttribute('data-agc-esc')){escritorio=b.getAttribute('data-agc-esc')==='1';b.parentNode.querySelectorAll('button').forEach(function(x){x.classList.toggle('active',x===b);});return;}
    if(b.hasAttribute('data-agc-copiar')){var inp=corpo.querySelector('#agcUrl'),ok=corpo.querySelector('#agcOk');
      try{await navigator.clipboard.writeText(inp.value);ok.textContent='Copiado';}catch(_){inp.focus();inp.select();ok.textContent='Selecionado: aperte Ctrl+C';}
      setTimeout(function(){ok.textContent='';},2500);return;}
    if(b.hasAttribute('data-agc-gerar')){
      if(situacao&&situacao.ativo){var conf=window.sagaConfirmar?await sagaConfirmar('Gerar um link novo?','O link atual para de funcionar na hora. Quem já assinou vai precisar assinar o link novo.','Gerar link novo'):true;if(!conf)return;}
      ocupado=true;b.disabled=true;
      try{var r=await sb.rpc('agenda_link_gerar',{p_incluir_escritorio:escritorio});if(r.error)throw r.error;situacao=r.data;desenhar();}
      catch(err){b.disabled=false;mostrarErro(erroTexto(err));}finally{ocupado=false;}
      return;}
    if(b.hasAttribute('data-agc-desligar')){
      var c2=window.sagaConfirmar?await sagaConfirmar('Desligar o link da agenda?','O celular e o Google Agenda param de receber os seus compromissos. Você pode gerar outro link quando quiser.','Desligar',true):true;if(!c2)return;
      ocupado=true;b.disabled=true;
      try{var r2=await sb.rpc('agenda_link_desligar');if(r2.error)throw r2.error;situacao={ativo:false};desenhar();}
      catch(err){b.disabled=false;mostrarErro(erroTexto(err));}finally{ocupado=false;}
    }
  });
  // ?celular=1 abre direto (ex.: link do Manual)
  if(/[?&]celular=1/.test(location.search))setTimeout(abrir,600);
  window.SagaAgendaCelular={abrir:abrir};
})();
