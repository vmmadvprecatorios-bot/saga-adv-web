// SAGA UI - carrega sidebar e topbar unificadas + logica compartilhada da topbar
// Uso: <div id="sidebarSaga"></div>  +  <header class="topbar" id="topbarSaga"></header>
// Chamar (apos criar o cliente _sb do Supabase): SagaUI.carregar('nome-tela');
// A sidebar e a topbar sao embutidas neste arquivo (nao dependem de fetch).
(function(global){
  var _temaSalvo=localStorage.getItem('saga-tema')||'dark';
  if(document.body)document.body.setAttribute('data-theme',_temaSalvo);
  else document.addEventListener('DOMContentLoaded',function(){document.body.setAttribute('data-theme',_temaSalvo);});

  var _perfilAtual=null;

  var SIDEBAR_HTML=''
    +'<div class="nav-section">Operacao</div>'
    +'<div class="nav-item" data-tela="processos" onclick="window.location.href=\'lista_processos_padrao_metalico.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Processos em Andamento</div>'
    +'<div class="nav-item" data-tela="agenda" onclick="window.location.href=\'calendario_padrao_metalico.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Agenda</div>'
    +'<div class="nav-section">Comunicacao</div>'
    +'<div class="nav-item" data-tela="chat" onclick="window.location.href=\'chat_interno_padrao_metalico.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Chat Interno</div>'
    +'<div class="nav-item" data-tela="ponto" onclick="window.location.href=\'ponto_eletronico_padrao_metalico.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Ponto Eletronico</div>'
    +'<div class="nav-section">Gestao</div>'
    +'<div class="nav-item" data-tela="colaboradores" onclick="window.location.href=\'gestao_colaboradores_padrao_metalico.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Colaboradores</div>'
    +'<div class="nav-item" data-tela="dashboard" onclick="window.location.href=\'dashboard_padrao_metalico.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Dashboard</div>'
    +'<div class="nav-item" data-tela="biblioteca" onclick="window.location.href=\'biblioteca_padrao_metalico_FINAL.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M4 4v16a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1h-4a2 2 0 00-2 2v16" stroke="currentColor" stroke-width="1.5"/><path d="M8 3v16" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Biblioteca de Modelos</div>'
    +'<div class="nav-item" data-tela="financeiro" onclick="window.location.href=\'financeiro.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Financeiro</div>'
    +'<div class="nav-item" data-tela="marketing" onclick="window.location.href=\'marketing_campanhas_padrao_metalico.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8v18l-18-8v-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 15v4a2 2 0 002 2h2" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Marketing</div>';

  var TOPBAR_HTML=''
    +'<div class="top-left">'
    +'<button class="hamburger" id="hamburger" aria-label="Abrir navegacao" type="button"><span></span><span></span><span></span></button>'
    +'<div class="brand" onclick="window.location.href=\'dashboard_padrao_metalico.html\'" style="cursor:pointer">'
    +'<svg class="crest" viewBox="0 0 220 220" aria-hidden="true"><defs><linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e8d48a"/><stop offset="38%" stop-color="#c9a84c"/><stop offset="60%" stop-color="#8a6f33"/><stop offset="100%" stop-color="#f3e6bd"/></linearGradient></defs><g transform="translate(110,110)"><path d="M0 -55l44 22v33c0 27-19 44-44 55-25-11-44-28-44-55v-33l44-22z" fill="none" stroke="url(#crestGold)" stroke-width="6"/><text x="0" y="10" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="38" font-weight="700" fill="url(#crestGold)">VM</text></g></svg>'
    +'<div class="brand-name">VMM<b>ADV</b></div>'
    +'</div>'
    +'</div>'
    +'<div class="top-center">'
    +'<label class="quick-search" aria-label="Busca global">'
    +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 16.5L20 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
    +'<input id="globalSearch" placeholder="Buscar processos, pessoas, colaboradores..." autocomplete="off">'
    +'<div class="popover global-search-pop" id="globalSearchPop"></div>'
    +'</label>'
    +'</div>'
    +'<div class="top-right">'
    +'<div class="presence-wrap">'
    +'<button class="presence-btn" id="presenceBtn" type="button"><span class="dot online"></span><span id="onlineText">Carregando...</span></button>'
    +'<div class="popover" id="presencePop"></div>'
    +'</div>'
    +'<div class="notification-wrap">'
    +'<button class="icon-btn" id="notifBtn" type="button" aria-label="Notificacoes"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 16v-5a6 6 0 10-12 0v5l-2 3h16l-2-3z" stroke="var(--gold)" stroke-width="1.6"/><path d="M9 21a3 3 0 006 0" stroke="var(--gold)" stroke-width="1.6"/></svg><span class="notif-count" id="notifCount" style="display:none">0</span></button>'
    +'<div class="popover notification-pop" id="notifPop"></div>'
    +'</div>'
    +'<button class="icon-btn" id="refreshBtn" type="button" aria-label="Atualizar informacoes"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 11-3-6.7L21 8" stroke="var(--gold)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="var(--gold)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    +'<button class="theme-toggle" id="themeToggle" type="button" aria-label="Alternar tema"><svg class="sun" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span class="knob"></span><svg class="moon" viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></button>'
    +'<div class="avatar-wrap" id="avatarWrap">'
    +'<div class="avatar" id="avatarTop" title="Menu do usuario">--</div>'
    +'<div class="popover avatar-pop" id="avatarPop">'
    +'<div class="avatar-pop-info">'
    +'<div class="avatar-pop-nome" id="avatarPopNome">--</div>'
    +'<div class="avatar-pop-email" id="avatarPopEmail">--</div>'
    +'</div>'
    +'<div class="pop-divisor"></div>'
    +'<div class="pop-row pop-row-sair" data-acao="sair">'
    +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Sair do sistema'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>';

  function esc(v){var d=document.createElement('div');d.textContent=v||'';return d.innerHTML;}
  function iniciais(nome){return String(nome||'').trim().split(/\s+/).slice(0,2).map(function(p){return p[0]||'';}).join('').toUpperCase()||'--';}
  function formatarDataRel(iso){
    if(!iso)return '';
    var d=new Date(iso);
    var diff=(Date.now()-d.getTime())/1000;
    if(diff<60)return 'Agora';
    if(diff<3600)return Math.floor(diff/60)+' min';
    if(diff<86400)return Math.floor(diff/3600)+' h';
    return d.toLocaleDateString('pt-BR');
  }

  function fecharTodosPopovers(){
    document.querySelectorAll('.popover').forEach(function(p){p.classList.remove('open');});
  }

  function ligarTema(){
    var btn=document.getElementById('themeToggle');
    if(!btn||btn.dataset.ligado)return;
    btn.dataset.ligado='true';
    btn.addEventListener('click',function(){
      var atual=document.body.getAttribute('data-theme');
      var novo=atual==='dark'?'light':'dark';
      document.body.setAttribute('data-theme',novo);
      localStorage.setItem('saga-tema',novo);
    });
  }

  function ligarHamburger(){
    var ham=document.getElementById('hamburger');
    if(!ham||ham.dataset.ligado)return;
    ham.dataset.ligado='true';
    ham.addEventListener('click',function(){
      var sb=document.getElementById('sidebarSaga');
      var ov=document.getElementById('overlay');
      if(sb)sb.classList.toggle('open');
      if(ov)ov.classList.toggle('aberto');
    });
    var ov=document.getElementById('overlay');
    if(ov&&!ov.dataset.ligado){
      ov.dataset.ligado='true';
      ov.addEventListener('click',function(){
        var sb=document.getElementById('sidebarSaga');
        if(sb)sb.classList.remove('open');
        ov.classList.remove('aberto');
      });
    }
  }

  function ligarPresencaESino(){
    var btnP=document.getElementById('presenceBtn');
    var btnN=document.getElementById('notifBtn');
    var av=document.getElementById('avatarTop');
    if(btnP&&!btnP.dataset.ligado){
      btnP.dataset.ligado='true';
      btnP.addEventListener('click',function(e){
        e.stopPropagation();
        var p=document.getElementById('presencePop');
        var aberto=p.classList.contains('open');
        fecharTodosPopovers();
        if(!aberto){p.classList.add('open');carregarPresenca();}
      });
    }
    if(btnN&&!btnN.dataset.ligado){
      btnN.dataset.ligado='true';
      btnN.addEventListener('click',function(e){
        e.stopPropagation();
        var p=document.getElementById('notifPop');
        var aberto=p.classList.contains('open');
        fecharTodosPopovers();
        if(!aberto){p.classList.add('open');carregarNotificacoes();}
      });
    }
    if(av&&!av.dataset.ligado){
      av.dataset.ligado='true';
      av.addEventListener('click',function(e){
        e.stopPropagation();
        var p=document.getElementById('avatarPop');
        var aberto=p.classList.contains('open');
        fecharTodosPopovers();
        if(!aberto)p.classList.add('open');
      });
    }
    var btnSair=document.querySelector('[data-acao="sair"]');
    if(btnSair&&!btnSair.dataset.ligado){
      btnSair.dataset.ligado='true';
      btnSair.addEventListener('click',function(e){
        e.stopPropagation();
        sagaLogout();
      });
    }
    var btnRefresh=document.getElementById('refreshBtn');
    if(btnRefresh&&!btnRefresh.dataset.ligado){
      btnRefresh.dataset.ligado='true';
      btnRefresh.addEventListener('click',function(){
        btnRefresh.classList.add('girando');
        setTimeout(function(){btnRefresh.classList.remove('girando');},700);
        document.dispatchEvent(new CustomEvent('saga-atualizar'));
        carregarPresenca();
        contarNaoLidas();
      });
    }
    if(!document.body.dataset.sagaClickLigado){
      document.body.dataset.sagaClickLigado='true';
      document.addEventListener('click',function(e){
        if(!e.target.closest('.presence-wrap')&&!e.target.closest('.notification-wrap')&&!e.target.closest('.avatar-wrap')&&!e.target.closest('.quick-search'))fecharTodosPopovers();
      });
    }
  }

  async function carregarPerfil(){
    if(!global._sb)return;
    try{
      var s=await global._sb.auth.getSession();
      if(!s.data||!s.data.session)return;
      var authId=s.data.session.user.id;
      var r=await global._sb.from('usuarios').select('id,nome_completo,email,eh_administrador').eq('auth_user_id',authId).single();
      if(r.error||!r.data)return;
      _perfilAtual=r.data;
      var av=document.getElementById('avatarTop');if(av)av.textContent=iniciais(r.data.nome_completo);
      var nm=document.getElementById('avatarPopNome');if(nm)nm.textContent=r.data.nome_completo||'';
      var em=document.getElementById('avatarPopEmail');if(em)em.textContent=r.data.email||'';
    }catch(e){}
  }

  async function carregarPresenca(){
    if(!global._sb)return;
    try{
      var q=await global._sb.from('usuarios').select('id,nome_completo').eq('ativo',true);
      var total=(q.data||[]).length;
      var lbl=document.getElementById('onlineText');
      if(lbl)lbl.textContent=total+' online agora';
      var pop=document.getElementById('presencePop');
      if(pop){
        var linhas=(q.data||[]).map(function(u){
          return '<div class="pop-row"><span class="online-dot"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(u.nome_completo)+'</div><div style="font-size:9px;color:var(--muted)">Online</div></div></div>';
        }).join('');
        pop.innerHTML='<div class="pop-title">Colaboradores ativos</div>'+(linhas||'<div style="font-size:10.5px;color:var(--muted);padding:12px;text-align:center">Ninguem online.</div>');
      }
    }catch(e){}
  }

  async function carregarNotificacoes(){
    if(!global._sb||!_perfilAtual)return;
    var pop=document.getElementById('notifPop');
    if(!pop)return;
    pop.innerHTML='<div class="pop-title">Notificacoes</div><div style="font-size:10.5px;color:var(--muted);padding:12px;text-align:center">Carregando...</div>';
    try{
      var r=await global._sb.from('notificacoes').select('id,titulo,mensagem,lida,criado_em').eq('usuario_id',_perfilAtual.id).order('criado_em',{ascending:false}).limit(20);
      if(r.error)throw r.error;
      var cabecalho='<div class="pop-title" style="display:flex;justify-content:space-between;align-items:center"><span>Notificacoes</span><button type="button" id="btnMarcarTodasLidas" style="background:none;border:none;color:var(--gold);font-size:10px;cursor:pointer">Marcar todas como lidas</button></div>';
      if(!r.data||!r.data.length){pop.innerHTML=cabecalho+'<div style="font-size:10.5px;color:var(--muted);padding:12px;text-align:center">Sem notificacoes recentes.</div>';return;}
      pop.innerHTML=cabecalho+r.data.map(function(n){
        return '<div class="notification-item"><span class="n-dot '+(n.lida?'read':'')+'"></span><div class="notification-text"><div style="font-weight:600">'+esc(n.titulo||'Notificacao')+'</div><div style="color:var(--muted);margin-top:2px">'+esc(n.mensagem||'')+'</div><div class="notification-time">'+formatarDataRel(n.criado_em)+'</div></div></div>';
      }).join('');
      var btnMarcar=document.getElementById('btnMarcarTodasLidas');
      if(btnMarcar)btnMarcar.addEventListener('click',function(ev){ev.stopPropagation();marcarTodasComoLidas();});
      atualizarBadgeNotif(r.data.filter(function(n){return !n.lida;}).length);
    }catch(e){
      pop.innerHTML='<div class="pop-title">Notificacoes</div><div style="font-size:10.5px;color:#e08383;padding:12px;text-align:center">Erro ao carregar.</div>';
    }
  }

  async function contarNaoLidas(){
    if(!global._sb||!_perfilAtual)return;
    try{
      var r=await global._sb.from('notificacoes').select('id',{count:'exact',head:true}).eq('usuario_id',_perfilAtual.id).eq('lida',false);
      atualizarBadgeNotif(r.count||0);
    }catch(e){}
  }

  function atualizarBadgeNotif(n){
    var b=document.getElementById('notifCount');
    if(!b)return;
    if(n>0){b.textContent=n>99?'99+':String(n);b.style.display='';}
    else b.style.display='none';
  }

  async function marcarTodasComoLidas(){
    if(!global._sb||!_perfilAtual)return;
    try{
      await global._sb.from('notificacoes').update({lida:true}).eq('usuario_id',_perfilAtual.id).eq('lida',false);
      carregarNotificacoes();
    }catch(e){}
  }

  function ligarBuscaGlobal(){
    var input=document.getElementById('globalSearch');
    if(!input||input.dataset.ligado)return;
    input.dataset.ligado='true';
    var t=null;
    input.addEventListener('input',function(){
      clearTimeout(t);
      var termo=input.value.trim();
      var pop=document.getElementById('globalSearchPop');
      if(termo.length<3){if(pop)pop.classList.remove('open');return;}
      t=setTimeout(function(){executarBuscaGlobal(termo);},350);
    });
    input.addEventListener('focus',function(){
      var pop=document.getElementById('globalSearchPop');
      if(pop&&input.value.trim().length>=3)pop.classList.add('open');
    });
  }

  async function executarBuscaGlobal(termo){
    if(!global._sb)return;
    var pop=document.getElementById('globalSearchPop');
    if(!pop)return;
    pop.classList.add('open');
    pop.innerHTML='<div style="padding:14px;font-size:10.5px;color:var(--muted);text-align:center">Buscando...</div>';
    try{
      var like='%'+termo+'%';
      var termoDigitos=termo.replace(/\D/g,'');
      var promessas=[
        global._sb.from('pessoas').select('id,nome_completo,cpf').or('nome_completo.ilike.'+like+(termoDigitos?',cpf.ilike.%'+termoDigitos+'%':'')).limit(5),
        global._sb.from('processos').select('id,numero_processo_cnj,pessoa:pessoas!pessoa_id(nome_completo)').or('numero_processo_cnj.ilike.'+like).eq('excluido_logico',false).limit(5),
        global._sb.from('usuarios').select('id,nome_completo,email').or('nome_completo.ilike.'+like+',email.ilike.'+like).eq('ativo',true).limit(5),
      ];
      var res=await Promise.all(promessas);
      var pessoas=(res[0].data||[]);
      var processos=(res[1].data||[]);
      var colaboradores=(res[2].data||[]);
      var html='';
      if(pessoas.length){
        html+='<div class="pop-title">Pessoas</div>';
        html+=pessoas.map(function(p){return '<div class="pop-row" onclick="window.location.href=\'ficha_cliente_padrao_metalico_FINAL.html?pessoa_id='+esc(p.id)+'\'"><span class="online-dot" style="background:var(--gold)"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(p.nome_completo)+'</div><div style="font-size:9px;color:var(--muted)">'+(p.cpf?'CPF '+esc(p.cpf):'Sem CPF')+'</div></div></div>';}).join('');
      }
      if(processos.length){
        html+='<div class="pop-title">Processos</div>';
        html+=processos.map(function(pr){var pn=pr.pessoa&&pr.pessoa.nome_completo?pr.pessoa.nome_completo:'Sem cliente';return '<div class="pop-row" onclick="window.location.href=\'ficha_cliente_padrao_metalico_FINAL.html?processo_id='+esc(pr.id)+'\'"><span class="online-dot" style="background:var(--gold)"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(pn)+'</div><div style="font-size:9px;color:var(--muted)">'+(pr.numero_processo_cnj?esc(pr.numero_processo_cnj):'Sem numero CNJ')+'</div></div></div>';}).join('');
      }
      if(colaboradores.length){
        html+='<div class="pop-title">Colaboradores</div>';
        html+=colaboradores.map(function(u){return '<div class="pop-row" onclick="window.location.href=\'gestao_colaboradores_padrao_metalico.html\'"><span class="online-dot" style="background:var(--gold)"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(u.nome_completo)+'</div><div style="font-size:9px;color:var(--muted)">'+esc(u.email||'')+'</div></div></div>';}).join('');
      }
      if(!html)html='<div style="padding:14px;font-size:10.5px;color:var(--muted);text-align:center">Nenhum resultado.</div>';
      pop.innerHTML=html;
    }catch(e){
      pop.innerHTML='<div style="padding:14px;font-size:10.5px;color:#e08383;text-align:center">Erro na busca.</div>';
    }
  }

  global.sagaLogout=async function(){
    if(!global._sb)return;
    try{await global._sb.auth.signOut();}catch(e){}
    window.location.href='login_padrao_metalico.html';
  };

  async function carregar(telaAtiva){
    var sb=document.getElementById('sidebarSaga');
    if(sb)sb.innerHTML=SIDEBAR_HTML;
    var tb=document.getElementById('topbarSaga');
    if(tb)tb.innerHTML=TOPBAR_HTML;
    if(telaAtiva){
      var alvo=document.querySelector('#sidebarSaga [data-tela="'+telaAtiva+'"]');
      if(alvo)alvo.classList.add('active');
    }
    ligarTema();
    ligarHamburger();
    ligarPresencaESino();
    ligarBuscaGlobal();
    await carregarPerfil();
    await carregarPresenca();
    await contarNaoLidas();
    document.dispatchEvent(new CustomEvent('saga-ui-pronto',{detail:{telaAtiva:telaAtiva}}));
  }

  global.SagaUI={carregar:carregar,recarregarPresenca:carregarPresenca,recarregarNotificacoes:carregarNotificacoes};
})(window);
