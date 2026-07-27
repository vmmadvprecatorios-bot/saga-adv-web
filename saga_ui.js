// SAGA UI - carrega sidebar e topbar unificadas + logica compartilhada da topbar
// Uso: <div id="sidebarSaga"></div>  +  <header class="topbar" id="topbarSaga"></header>
// Chamar (apos criar o cliente _sb do Supabase): SagaUI.carregar('nome-tela');
// A sidebar e a topbar sao embutidas neste arquivo (nao dependem de fetch).
(function(global){
  var _temaSalvo=localStorage.getItem('saga-tema')||'dark';
  if(document.body)document.body.setAttribute('data-theme',_temaSalvo);
  else document.addEventListener('DOMContentLoaded',function(){document.body.setAttribute('data-theme',_temaSalvo);});

  // Estilo base injetado uma unica vez: torna a sidebar fixa (sticky) em todas
  // as telas e habilita o modo retratil (colapsado), sem precisar editar o
  // CSS de cada pagina individualmente.
  function _injetarEstiloBase(){
    if(document.getElementById('sagaUiEstiloBase'))return;
    var style=document.createElement('style');
    style.id='sagaUiEstiloBase';
    style.textContent=
      /* ===== TOPBAR: aparencia fixa, nao depende de variaveis de cada tela ===== */
      '#topbarSaga{height:64px !important;position:sticky !important;top:0 !important;z-index:200 !important;display:flex !important;align-items:center !important;padding:0 24px !important;border-bottom:1px solid rgba(201,168,76,.12) !important;background:linear-gradient(135deg,rgba(20,28,48,.94),rgba(10,14,26,.98)) !important;gap:16px !important;}'+
      '[data-theme="light"] #topbarSaga{background:linear-gradient(135deg,rgba(255,253,248,.96),rgba(247,245,240,.985)) !important;border-bottom-color:rgba(138,106,35,.18) !important;}'+
      '#topbarSaga .top-left,#topbarSaga .top-right{display:flex !important;align-items:center !important;gap:14px !important;}'+
      '#topbarSaga .top-center{flex:1 !important;display:flex !important;justify-content:center !important;min-width:0 !important;}'+
      '#topbarSaga .brand{display:flex !important;align-items:center !important;gap:10px !important;}'+
      '#topbarSaga .crest{width:32px !important;height:32px !important;flex:0 0 auto !important;}'+
      '#topbarSaga .brand-name{font-family:"Cormorant Garamond",serif !important;font-size:19px !important;font-weight:600 !important;color:#e8eaf0 !important;letter-spacing:.5px !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name{color:#2a2517 !important;}'+
      '#topbarSaga .brand-name b{color:#c9a84c !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name b{color:#a3812f !important;}'+
      '#hamburger{display:flex !important;flex-direction:column !important;width:32px !important;height:32px !important;align-items:center !important;justify-content:center !important;border-radius:8px !important;background:none !important;border:none !important;}'+
      '#hamburger span{display:block !important;width:18px !important;height:1.7px !important;background:#c9a84c !important;margin:3px auto !important;border-radius:2px !important;transition:transform .25s ease,opacity .2s ease !important;}'+
      '[data-theme="light"] #hamburger span{background:#a3812f !important;}'+
      '#hamburger.ativo span:nth-child(1){transform:translateY(7px) rotate(45deg) !important;}'+
      '#hamburger.ativo span:nth-child(2){opacity:0 !important;}'+
      '#hamburger.ativo span:nth-child(3){transform:translateY(-7px) rotate(-45deg) !important;}'+
      '#topbarSaga .quick-search{width:min(520px,50vw) !important;height:36px !important;display:flex !important;align-items:center !important;gap:8px !important;padding:0 12px !important;border:1px solid rgba(201,168,76,.12) !important;background:rgba(255,255,255,.045) !important;border-radius:10px !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search{border-color:rgba(138,106,35,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .quick-search svg{color:#8b93a8 !important;flex:0 0 auto !important;}'+
      '#topbarSaga .quick-search input{border:0 !important;outline:0 !important;background:transparent !important;color:#e8eaf0 !important;font-size:11px !important;width:100% !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#2a2517 !important;}'+
      '#topbarSaga .presence-btn{border:1px solid rgba(201,168,76,.12) !important;background:rgba(255,255,255,.045) !important;border-radius:18px !important;padding:7px 12px !important;display:flex !important;align-items:center !important;gap:7px !important;color:#8b93a8 !important;font-size:11px !important;white-space:nowrap !important;}'+
      '[data-theme="light"] #topbarSaga .presence-btn{border-color:rgba(138,106,35,.18) !important;background:rgba(255,255,255,.74) !important;color:#7a7461 !important;}'+
      '#topbarSaga .dot{width:7px !important;height:7px !important;border-radius:50% !important;display:inline-block !important;}'+
      '#topbarSaga .dot.online{background:#5dd8a0 !important;box-shadow:0 0 7px #5dd8a0 !important;}'+
      '#topbarSaga .icon-btn{width:36px !important;height:36px !important;display:grid !important;place-items:center !important;border-radius:10px !important;border:1px solid rgba(201,168,76,.12) !important;background:rgba(255,255,255,.045) !important;position:relative !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn{border-color:rgba(138,106,35,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .notif-count{position:absolute !important;right:-5px !important;top:-5px !important;min-width:16px !important;height:16px !important;padding:0 4px !important;border-radius:8px !important;background:#e85d5d !important;color:#fff !important;font-size:9px !important;display:grid !important;place-items:center !important;font-weight:700 !important;}'+
      '#topbarSaga .theme-toggle{width:70px !important;height:32px !important;padding:3px !important;border-radius:18px !important;border:1px solid rgba(201,168,76,.12) !important;background:rgba(255,255,255,.045) !important;position:relative !important;display:flex !important;justify-content:space-between !important;align-items:center !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle{border-color:rgba(138,106,35,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .theme-toggle svg{z-index:2 !important;width:15px !important;height:15px !important;}'+
      '#topbarSaga .theme-toggle .knob{position:absolute !important;top:3px !important;left:3px !important;width:24px !important;height:24px !important;border-radius:50% !important;background:linear-gradient(135deg,#e8d48a,#c9a84c) !important;box-shadow:0 2px 7px rgba(0,0,0,.18) !important;transition:left .25s ease !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle .knob{left:41px !important;background:linear-gradient(135deg,#d7b85e,#a3812f) !important;}'+
      '#topbarSaga .avatar{width:34px !important;height:34px !important;border-radius:50% !important;display:grid !important;place-items:center !important;background:linear-gradient(135deg,#e8d48a,#c9a84c) !important;color:#0a0e1a !important;font-family:"Cormorant Garamond",serif !important;font-weight:700 !important;font-size:13px !important;}'+
      '[data-theme="light"] #topbarSaga .avatar{background:linear-gradient(135deg,#d7b85e,#a3812f) !important;}'+
      '#topbarSaga .popover{display:none;position:absolute !important;right:0 !important;top:calc(100% + 8px) !important;width:300px !important;z-index:600 !important;padding:8px !important;border:1px solid rgba(201,168,76,.12) !important;border-radius:14px !important;background:linear-gradient(145deg,#1b2540,#11182c) !important;box-shadow:0 24px 50px rgba(0,0,0,.5) !important;}'+
      '#topbarSaga .popover.open{display:block;}'+
      '[data-theme="light"] #topbarSaga .popover{background:linear-gradient(145deg,#fffdf8,#f4eddc) !important;border-color:rgba(138,106,35,.18) !important;}'+
      '#topbarSaga .pop-title{padding:7px 8px 5px !important;font-size:9px !important;text-transform:uppercase !important;letter-spacing:1px !important;color:#8b93a8 !important;}'+
      '#topbarSaga .pop-row{display:flex !important;align-items:center !important;gap:9px !important;padding:9px !important;border-radius:9px !important;}'+
      '#topbarSaga .pop-row:hover{background:rgba(201,168,76,.09) !important;}'+
      '#topbarSaga .online-dot{width:7px !important;height:7px !important;border-radius:50% !important;background:#5dd8a0 !important;box-shadow:0 0 7px #5dd8a0 !important;flex:0 0 auto !important;}'+
      '#topbarSaga .notification-item .n-dot{width:7px !important;height:7px !important;border-radius:50% !important;background:#c9a84c !important;margin-top:5px !important;flex:0 0 auto !important;}'+
      '#topbarSaga .notification-item .n-dot.read{visibility:hidden !important;}'+
      '#topbarSaga .avatar-pop-nome{color:#e8eaf0 !important;}[data-theme="light"] #topbarSaga .avatar-pop-nome{color:#2a2517 !important;}'+
      '#topbarSaga .avatar-pop-email{color:#8b93a8 !important;}[data-theme="light"] #topbarSaga .avatar-pop-email{color:#7a7461 !important;}'+
      '#topbarSaga .pop-divisor{background:rgba(201,168,76,.12) !important;}'+
      '#topbarSaga .pop-row-sair{color:#e85d5d !important;}'+
      /* ===== SIDEBAR: aparencia fixa, retratil, sticky ===== */
      '#sidebarSaga{width:208px !important;background:rgba(255,255,255,.045) !important;border-right:1px solid rgba(201,168,76,.12) !important;padding:22px 0 !important;position:sticky !important;top:64px !important;height:calc(100vh - 64px) !important;overflow-y:auto !important;flex-grow:0 !important;flex-shrink:0 !important;flex-basis:208px !important;transition:width .22s ease,min-width .22s ease,flex-basis .22s ease,padding .22s ease,opacity .18s ease !important;}'+
      '[data-theme="light"] #sidebarSaga{background:rgba(255,255,255,.74) !important;border-right-color:rgba(138,106,35,.18) !important;}'+
      '#sidebarSaga.collapsed{width:0 !important;min-width:0 !important;flex-basis:0 !important;padding:0 !important;opacity:0 !important;overflow:hidden !important;border:none !important;}'+
      '#sidebarSaga .nav-section,#sidebarSaga .nav-secao{font-size:9.5px !important;letter-spacing:2px !important;color:#8b93a8 !important;text-transform:uppercase !important;font-weight:400 !important;padding:17px 22px 7px !important;opacity:1 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-section,[data-theme="light"] #sidebarSaga .nav-secao{color:#7a7461 !important;}'+
      '#sidebarSaga .nav-item{display:flex !important;align-items:center !important;gap:11px !important;padding:11px 22px !important;font-size:12.5px !important;color:#8b93a8 !important;font-weight:400 !important;cursor:pointer !important;border-left:2px solid transparent !important;background:transparent !important;transition:all .2s !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item{color:#7a7461 !important;}'+
      '#sidebarSaga .nav-item:hover{color:#e8eaf0 !important;background:rgba(255,255,255,.03) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item:hover{color:#2a2517 !important;background:rgba(0,0,0,.03) !important;}'+
      '#sidebarSaga .nav-item .nav-icon{width:15px !important;height:15px !important;flex:0 0 auto !important;color:#8b93a8 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item .nav-icon{color:#7a7461 !important;}'+
      '#sidebarSaga .nav-item.active,#sidebarSaga .nav-item.ativo{color:#e8d48a !important;font-weight:700 !important;border-left:2px solid #e8d48a !important;background:linear-gradient(90deg,rgba(201,168,76,.12),transparent) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active,[data-theme="light"] #sidebarSaga .nav-item.ativo{color:#a3812f !important;border-left-color:#a3812f !important;background:linear-gradient(90deg,rgba(138,106,35,.14),transparent) !important;}'+
      '#sidebarSaga .nav-item.active .nav-icon,#sidebarSaga .nav-item.ativo .nav-icon{color:#e8d48a !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="light"] #sidebarSaga .nav-item.ativo .nav-icon{color:#a3812f !important;}'+
      '@media(max-width:760px){#sidebarSaga{position:fixed !important;}#topbarSaga .top-center{display:none !important;}}';
    (document.head||document.documentElement).appendChild(style);
  }
  if(document.head)_injetarEstiloBase();
  else document.addEventListener('DOMContentLoaded',_injetarEstiloBase);

  var _sidebarColapsada=localStorage.getItem('saga-sidebar-colapsada')==='true';
  function _aplicarColapsoSalvo(){
    var sb=document.getElementById('sidebarSaga');
    if(sb&&_sidebarColapsada)sb.classList.add('collapsed');
  }
  if(document.getElementById('sidebarSaga'))_aplicarColapsoSalvo();
  else document.addEventListener('DOMContentLoaded',_aplicarColapsoSalvo);

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
    var sbInicial=document.getElementById('sidebarSaga');
    if(sbInicial&&sbInicial.classList.contains('collapsed'))ham.classList.add('ativo');
    ham.addEventListener('click',function(){
      var sb=document.getElementById('sidebarSaga');
      var ov=document.getElementById('overlay');
      if(window.innerWidth<=760){
        if(sb)sb.classList.toggle('open');
        if(ov)ov.classList.toggle('aberto');
        ham.classList.toggle('ativo',!!(sb&&sb.classList.contains('open')));
        return;
      }
      if(sb){
        sb.classList.toggle('collapsed');
        localStorage.setItem('saga-sidebar-colapsada',sb.classList.contains('collapsed')?'true':'false');
        ham.classList.toggle('ativo',sb.classList.contains('collapsed'));
      }
    });
    var ov=document.getElementById('overlay');
    if(ov&&!ov.dataset.ligado){
      ov.dataset.ligado='true';
      ov.addEventListener('click',function(){
        var sb=document.getElementById('sidebarSaga');
        if(sb)sb.classList.remove('open');
        ov.classList.remove('aberto');
        ham.classList.remove('ativo');
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
