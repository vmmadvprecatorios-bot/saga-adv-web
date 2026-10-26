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
      '#topbarSaga{height:64px !important;position:sticky !important;top:0 !important;z-index:200 !important;display:flex !important;align-items:center !important;padding:0 24px !important;border-bottom:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:linear-gradient(135deg,rgba(20,28,48,.94),rgba(10,14,26,.98)) !important;gap:16px !important;}'+
      '[data-theme="light"] #topbarSaga{background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(243,245,248,.985)) !important;border-bottom-color:rgba(19,38,66,.18) !important;}'+
      '#topbarSaga .top-left,#topbarSaga .top-right{display:flex !important;align-items:center !important;gap:14px !important;}'+
      '#topbarSaga .top-center{flex:1 !important;display:flex !important;justify-content:center !important;min-width:0 !important;}'+
      '#topbarSaga .brand{display:flex !important;align-items:center !important;gap:10px !important;}'+
      '#topbarSaga .crest{width:32px !important;height:32px !important;flex:0 0 auto !important;}'+
      '#topbarSaga .brand-name{font-family:"Cormorant Garamond",serif !important;font-size:19px !important;font-weight:600 !important;color:#e8eaf0 !important;letter-spacing:.5px !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '#topbarSaga .brand-name b{color:var(--gold) !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name b{color:var(--gold) !important;}'+
      '#hamburger{display:flex !important;flex-direction:column !important;width:32px !important;height:32px !important;align-items:center !important;justify-content:center !important;gap:4px !important;padding:0 !important;margin-right:0 !important;border-radius:8px !important;background:none !important;border:none !important;}'+
      '#hamburger span{display:block !important;width:18px !important;height:2px !important;min-height:2px !important;flex-shrink:0 !important;background:var(--gold) !important;margin:0 !important;border-radius:2px !important;transition:transform .25s ease,opacity .2s ease !important;}'+
      '[data-theme="light"] #hamburger span{background:var(--gold) !important;}'+
      '#hamburger.ativo span:nth-child(1){transform:translateY(6px) rotate(45deg) !important;}'+
      '#hamburger.ativo span:nth-child(2){opacity:0 !important;}'+
      '#hamburger.ativo span:nth-child(3){transform:translateY(-6px) rotate(-45deg) !important;}'+
      '#topbarSaga .quick-search{width:min(520px,50vw) !important;height:36px !important;display:flex !important;align-items:center !important;gap:8px !important;padding:0 12px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;border-radius:10px !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .quick-search svg{color:#8b93a8 !important;flex:0 0 auto !important;}'+
      '#topbarSaga .quick-search input{border:0 !important;outline:0 !important;background:transparent !important;color:#e8eaf0 !important;font-size:11px !important;width:100% !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '#topbarSaga .presence-btn{border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;border-radius:18px !important;padding:7px 12px !important;display:flex !important;align-items:center !important;gap:7px !important;color:#8b93a8 !important;font-size:11px !important;white-space:nowrap !important;}'+
      '[data-theme="light"] #topbarSaga .presence-btn{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;color:#4a586e !important;}'+
      '#topbarSaga .dot{width:7px !important;height:7px !important;border-radius:50% !important;display:inline-block !important;}'+
      '#topbarSaga .dot.online{background:#5dd8a0 !important;box-shadow:0 0 7px #5dd8a0 !important;}'+
      '#topbarSaga .icon-btn{width:36px !important;height:36px !important;display:grid !important;place-items:center !important;border-radius:10px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;position:relative !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .notif-count{position:absolute !important;right:-5px !important;top:-5px !important;min-width:16px !important;height:16px !important;padding:0 4px !important;border-radius:8px !important;background:#e85d5d !important;color:#fff !important;font-size:9px !important;display:grid !important;place-items:center !important;font-weight:700 !important;}'+
      '#topbarSaga .theme-toggle{width:70px !important;height:32px !important;padding:3px !important;border-radius:18px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;background:rgba(255,255,255,.045) !important;position:relative !important;display:flex !important;justify-content:space-between !important;align-items:center !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle{border-color:rgba(19,38,66,.18) !important;background:rgba(255,255,255,.74) !important;}'+
      '#topbarSaga .theme-toggle svg{z-index:2 !important;width:15px !important;height:15px !important;}'+
      '#topbarSaga .theme-toggle .knob{position:absolute !important;top:3px !important;left:3px !important;width:24px !important;height:24px !important;border-radius:50% !important;background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;box-shadow:0 2px 7px rgba(0,0,0,.18) !important;transition:left .25s ease !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle .knob{left:41px !important;background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;}'+
      '#topbarSaga .avatar{width:34px !important;height:34px !important;border-radius:50% !important;display:grid !important;place-items:center !important;background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;color:#0a0e1a !important;font-family:"Cormorant Garamond",serif !important;font-weight:700 !important;font-size:13px !important;}'+
      '[data-theme="light"] #topbarSaga .avatar{background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;}'+
      '#topbarSaga .popover{display:none;position:absolute !important;right:0 !important;top:calc(100% + 8px) !important;width:300px !important;z-index:600 !important;padding:8px !important;border:1px solid color-mix(in srgb,var(--gold) 12%,transparent) !important;border-radius:14px !important;background:linear-gradient(145deg,#1b2540,#11182c) !important;box-shadow:0 24px 50px rgba(0,0,0,.5) !important;}'+
      '#topbarSaga .popover.open{display:block;}'+
      '[data-theme="light"] #topbarSaga .popover{background:linear-gradient(145deg,#ffffff,#eef2f7) !important;border-color:rgba(19,38,66,.18) !important;}'+
      '#topbarSaga .pop-title{padding:7px 8px 5px !important;font-size:9px !important;text-transform:uppercase !important;letter-spacing:1px !important;color:#8b93a8 !important;}'+
      '#topbarSaga .pop-row{display:flex !important;align-items:center !important;gap:9px !important;padding:9px !important;border-radius:9px !important;}'+
      '#topbarSaga .pop-row:hover{background:color-mix(in srgb,var(--gold) 9%,transparent) !important;}'+
      '#topbarSaga .online-dot{width:7px !important;height:7px !important;border-radius:50% !important;background:#5dd8a0 !important;box-shadow:0 0 7px #5dd8a0 !important;flex:0 0 auto !important;}'+
      '#topbarSaga .notification-item .n-dot{width:7px !important;height:7px !important;border-radius:50% !important;background:var(--gold) !important;margin-top:5px !important;flex:0 0 auto !important;}'+
      '#topbarSaga .notification-item .n-dot.read{visibility:hidden !important;}'+
      '#topbarSaga .avatar-pop-nome{color:#e8eaf0 !important;}[data-theme="light"] #topbarSaga .avatar-pop-nome{color:#13233a !important;}'+
      '#topbarSaga .avatar-pop-email{color:#8b93a8 !important;}[data-theme="light"] #topbarSaga .avatar-pop-email{color:#4a586e !important;}'+
      '#topbarSaga .pop-divisor{background:color-mix(in srgb,var(--gold) 12%,transparent) !important;}'+
      '#topbarSaga .pop-row-sair{color:#e85d5d !important;}'+
      /* ===== SIDEBAR: aparencia fixa, retratil, sticky ===== */
      '#sidebarSaga{width:208px !important;background:var(--navy-2) !important;border-right:1px solid var(--border) !important;padding:22px 0 !important;position:sticky !important;top:64px !important;height:calc(100vh - 64px) !important;overflow-y:auto !important;flex-grow:0 !important;flex-shrink:0 !important;flex-basis:208px !important;transition:width .22s ease,min-width .22s ease,flex-basis .22s ease,padding .22s ease,opacity .18s ease !important;}'+
      '[data-theme="light"] #sidebarSaga{background:#ffffff !important;border-right-color:var(--border) !important;}'+
      '#sidebarSaga.collapsed{width:0 !important;min-width:0 !important;flex-basis:0 !important;padding:0 !important;opacity:0 !important;overflow:hidden !important;border:none !important;}'+
      '#sidebarSaga .nav-section,#sidebarSaga .nav-secao{font-size:10px !important;letter-spacing:1.6px !important;color:#9aa6b8 !important;text-transform:uppercase !important;font-weight:600 !important;padding:17px 22px 7px !important;opacity:1 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-section,[data-theme="light"] #sidebarSaga .nav-secao{color:#5b6880 !important;}'+
      '#sidebarSaga .nav-item{display:flex !important;align-items:center !important;gap:11px !important;padding:11px 22px !important;font-size:13px !important;color:#d5dbe4 !important;font-weight:500 !important;cursor:pointer !important;border-left:2px solid transparent !important;background:transparent !important;transition:all .2s !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item{color:#22324a !important;}'+
      '#sidebarSaga .nav-item:hover{color:#ffffff !important;background:rgba(255,255,255,.06) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item:hover{color:#13233a !important;background:rgba(19,38,66,.06) !important;}'+
      '#sidebarSaga .nav-item .nav-icon{width:16px !important;height:16px !important;flex:0 0 auto !important;color:#b3bdcc !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item .nav-icon{color:#3b4b64 !important;}'+
      '#sidebarSaga .nav-item.active,#sidebarSaga .nav-item.ativo{color:#ffffff !important;font-weight:600 !important;border-left:3px solid var(--gold) !important;background:color-mix(in srgb,var(--gold) 18%,transparent) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active,[data-theme="light"] #sidebarSaga .nav-item.ativo{color:var(--gold) !important;border-left-color:var(--gold) !important;background:color-mix(in srgb,var(--gold) 10%,transparent) !important;}'+
      '#sidebarSaga .nav-item.active .nav-icon,#sidebarSaga .nav-item.ativo .nav-icon{color:var(--gold-light) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="light"] #sidebarSaga .nav-item.ativo .nav-icon{color:var(--gold) !important;}'+
      /* ===== TOPBAR: controles bem visiveis (novo visual azul-marinho) ===== */
      '#topbarSaga{background:var(--navy-2) !important;border-bottom:1px solid var(--border) !important;}'+
      '[data-theme="light"] #topbarSaga{background:#ffffff !important;border-bottom-color:var(--border) !important;}'+
      '#topbarSaga .quick-search,#topbarSaga .presence-btn,#topbarSaga .icon-btn,#topbarSaga .theme-toggle{background:#1f2a3d !important;border:1px solid rgba(255,255,255,.16) !important;color:#dfe5ee !important;transition:background .15s,border-color .15s !important;}'+
      '#topbarSaga .icon-btn:hover,#topbarSaga .presence-btn:hover,#topbarSaga .theme-toggle:hover{background:#273550 !important;border-color:rgba(255,255,255,.26) !important;}'+
      '#topbarSaga .quick-search:focus-within{border-color:var(--gold) !important;background:#22304a !important;}'+
      '#topbarSaga .quick-search svg{color:#b8c2d1 !important;}'+
      '#topbarSaga .quick-search input{color:#f1f4f8 !important;font-size:12px !important;}'+
      '#topbarSaga .quick-search input::placeholder{color:#a3adbd !important;opacity:1 !important;}'+
      '#topbarSaga .icon-btn svg,#topbarSaga .theme-toggle svg{color:#e3e9f1 !important;}'+
      '#topbarSaga .icon-btn svg [stroke],#topbarSaga .theme-toggle svg [stroke]{stroke:currentColor !important;}'+
      '#topbarSaga .presence-btn{color:#dfe5ee !important;font-weight:500 !important;}'+
      '#topbarSaga .theme-toggle .knob,[data-theme="light"] #topbarSaga .theme-toggle .knob{background:var(--gold) !important;box-shadow:0 2px 8px rgba(0,0,0,.3) !important;}'+
      '#topbarSaga .avatar{background:var(--gold) !important;color:#ffffff !important;}'+
      '#hamburger span,[data-theme="light"] #hamburger span{background:currentColor !important;}#hamburger{color:#e3e9f1 !important;}'+
      '[data-theme="light"] #hamburger{color:var(--gold) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search,[data-theme="light"] #topbarSaga .presence-btn,[data-theme="light"] #topbarSaga .icon-btn,[data-theme="light"] #topbarSaga .theme-toggle{background:#eef1f5 !important;border-color:rgba(19,38,66,.22) !important;color:#22324a !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn:hover,[data-theme="light"] #topbarSaga .presence-btn:hover,[data-theme="light"] #topbarSaga .theme-toggle:hover{background:#f7f9fb !important;border-color:rgba(19,38,66,.32) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:var(--gold) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn svg,[data-theme="light"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      /* ===== BARRAS EM CONTRASTE: modo claro com barras azul-marinho, modo escuro com barras claras ===== */
      '[data-theme="light"] #topbarSaga,[data-theme="light"] #sidebarSaga{background:#15284a !important;border-color:rgba(255,255,255,.10) !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name b{color:#8fb6ff !important;}'+
      '[data-theme="light"] #hamburger{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search,[data-theme="light"] #topbarSaga .presence-btn,[data-theme="light"] #topbarSaga .icon-btn,[data-theme="light"] #topbarSaga .theme-toggle{background:rgba(255,255,255,.10) !important;border-color:rgba(255,255,255,.22) !important;color:#eef3fa !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn:hover,[data-theme="light"] #topbarSaga .presence-btn:hover,[data-theme="light"] #topbarSaga .theme-toggle:hover{background:rgba(255,255,255,.18) !important;border-color:rgba(255,255,255,.32) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search:focus-within{background:rgba(255,255,255,.16) !important;border-color:#8fb6ff !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search svg{color:#c4d0e2 !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input::placeholder{color:#b9c6d9 !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn svg,[data-theme="light"] #topbarSaga .theme-toggle svg{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle .knob,[data-theme="light"] #topbarSaga .avatar{background:#4b8af5 !important;color:#ffffff !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-section,[data-theme="light"] #sidebarSaga .nav-secao{color:#9fb2cc !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item{color:#e3eaf4 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item .nav-icon{color:#c1cde0 !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item:hover{color:#ffffff !important;background:rgba(255,255,255,.08) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active,[data-theme="light"] #sidebarSaga .nav-item.ativo{color:#ffffff !important;border-left-color:#8fb6ff !important;background:rgba(255,255,255,.14) !important;}'+
      '[data-theme="light"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="light"] #sidebarSaga .nav-item.ativo .nav-icon{color:#8fb6ff !important;}'+
      '[data-theme="dark"] #topbarSaga{background:#f4f6f9 !important;border-bottom-color:rgba(19,38,66,.14) !important;}'+
      '[data-theme="dark"] #sidebarSaga{background:#e9eef4 !important;border-right-color:rgba(19,38,66,.14) !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name b{color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #hamburger{color:#1f3e6d !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search,[data-theme="dark"] #topbarSaga .presence-btn,[data-theme="dark"] #topbarSaga .icon-btn,[data-theme="dark"] #topbarSaga .theme-toggle{background:#ffffff !important;border-color:rgba(19,38,66,.18) !important;color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn:hover,[data-theme="dark"] #topbarSaga .presence-btn:hover,[data-theme="dark"] #topbarSaga .theme-toggle:hover{background:#e6ebf2 !important;border-color:rgba(19,38,66,.30) !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn svg,[data-theme="dark"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob,[data-theme="dark"] #topbarSaga .avatar{background:#2f6cd6 !important;color:#ffffff !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-section,[data-theme="dark"] #sidebarSaga .nav-secao{color:#5b6880 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item{color:#1c2c44 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item .nav-icon{color:#3b4b64 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item:hover{color:#0d1b30 !important;background:rgba(19,38,66,.07) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active,[data-theme="dark"] #sidebarSaga .nav-item.ativo{color:#1f3e6d !important;border-left-color:#2f6cd6 !important;background:rgba(47,108,214,.12) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="dark"] #sidebarSaga .nav-item.ativo .nav-icon{color:#2f6cd6 !important;}'+
      /* Modo claro (ajuste final): barra superior branca, menu lateral azul em degrade */
      '[data-theme="light"] #topbarSaga{background:#dde3ea !important;border-bottom:1px solid rgba(19,38,66,.18) !important;box-shadow:0 1px 4px rgba(19,38,66,.10) !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '[data-theme="light"] #topbarSaga .brand-name b{color:#2f6cd6 !important;}'+
      '[data-theme="light"] #hamburger{color:#1f3e6d !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search,[data-theme="light"] #topbarSaga .presence-btn,[data-theme="light"] #topbarSaga .icon-btn,[data-theme="light"] #topbarSaga .theme-toggle{background:#eef1f5 !important;border-color:rgba(19,38,66,.22) !important;color:#22324a !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn:hover,[data-theme="light"] #topbarSaga .presence-btn:hover,[data-theme="light"] #topbarSaga .theme-toggle:hover{background:#f7f9fb !important;border-color:rgba(19,38,66,.32) !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:#2f6cd6 !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="light"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="light"] #topbarSaga .icon-btn svg,[data-theme="light"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle .knob,[data-theme="light"] #topbarSaga .avatar{background:#1f3e6d !important;color:#ffffff !important;}'+
      '[data-theme="light"] #sidebarSaga{background:linear-gradient(180deg,#1f3f70 0%,#16305a 45%,#0f2140 100%) !important;border-right:none !important;}'+
      /* Modo escuro (ajuste final): barra superior escura, menu lateral azul em degrade */
      '[data-theme="dark"] #topbarSaga{background:#111927 !important;border-bottom:1px solid rgba(255,255,255,.09) !important;box-shadow:0 1px 3px rgba(0,0,0,.25) !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name{color:#ffffff !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name b{color:#6fa2ff !important;}'+
      '[data-theme="dark"] #hamburger{color:#e3e9f1 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search,[data-theme="dark"] #topbarSaga .presence-btn,[data-theme="dark"] #topbarSaga .icon-btn,[data-theme="dark"] #topbarSaga .theme-toggle{background:#1f2a3d !important;border-color:rgba(255,255,255,.16) !important;color:#dfe5ee !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn:hover,[data-theme="dark"] #topbarSaga .presence-btn:hover,[data-theme="dark"] #topbarSaga .theme-toggle:hover{background:#273550 !important;border-color:rgba(255,255,255,.26) !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search:focus-within{background:#22304a !important;border-color:#4b8af5 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search svg{color:#b8c2d1 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input{color:#f1f4f8 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input::placeholder{color:#a3adbd !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn svg,[data-theme="dark"] #topbarSaga .theme-toggle svg{color:#e3e9f1 !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob,[data-theme="dark"] #topbarSaga .avatar{background:#4b8af5 !important;color:#ffffff !important;}'+
      '[data-theme="dark"] #sidebarSaga{background:linear-gradient(180deg,#24497f 0%,#1a3663 45%,#122749 100%) !important;border-right:none !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-section,[data-theme="dark"] #sidebarSaga .nav-secao{color:#a9bbd4 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item{color:#eaf0f8 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item .nav-icon{color:#c8d4e6 !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item:hover{color:#ffffff !important;background:rgba(255,255,255,.08) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active,[data-theme="dark"] #sidebarSaga .nav-item.ativo{color:#ffffff !important;border-left-color:#9cc0ff !important;background:rgba(255,255,255,.15) !important;}'+
      '[data-theme="dark"] #sidebarSaga .nav-item.active .nav-icon,[data-theme="dark"] #sidebarSaga .nav-item.ativo .nav-icon{color:#9cc0ff !important;}'+
      /* Modo escuro (versao final): barra superior branca como no claro; menu lateral azul em degrade */
      '[data-theme="dark"] #topbarSaga{background:#dde3ea !important;border-bottom:1px solid rgba(19,38,66,.18) !important;box-shadow:0 1px 4px rgba(0,0,0,.18) !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .brand-name b{color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #hamburger{color:#1f3e6d !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search,[data-theme="dark"] #topbarSaga .presence-btn,[data-theme="dark"] #topbarSaga .icon-btn,[data-theme="dark"] #topbarSaga .theme-toggle{background:#eef1f5 !important;border-color:rgba(19,38,66,.22) !important;color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn:hover,[data-theme="dark"] #topbarSaga .presence-btn:hover,[data-theme="dark"] #topbarSaga .theme-toggle:hover{background:#f7f9fb !important;border-color:rgba(19,38,66,.32) !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search:focus-within{background:#ffffff !important;border-color:#2f6cd6 !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search svg{color:#4a586e !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input{color:#13233a !important;}'+
      '[data-theme="dark"] #topbarSaga .quick-search input::placeholder{color:#5b6880 !important;}'+
      '[data-theme="dark"] #topbarSaga .icon-btn svg,[data-theme="dark"] #topbarSaga .theme-toggle svg{color:#22324a !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob,[data-theme="dark"] #topbarSaga .avatar{background:#2f6cd6 !important;color:#ffffff !important;}'+
      /* Botao claro/escuro: bolinha amarela (sol) no claro, azul-noite (lua) no escuro */
      '[data-theme="light"] #topbarSaga .theme-toggle .knob{left:3px !important;background:linear-gradient(135deg,#ffcf5c,#f5a623) !important;box-shadow:0 2px 8px rgba(245,166,35,.45) !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle .knob{left:41px !important;background:linear-gradient(135deg,#3b5ba8,#1d3263) !important;box-shadow:0 2px 8px rgba(29,50,99,.5) !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle svg.sun{color:#ffffff !important;}'+
      '[data-theme="light"] #topbarSaga .theme-toggle svg.moon{color:#7b8799 !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle svg.moon{color:#ffffff !important;}'+
      '[data-theme="dark"] #topbarSaga .theme-toggle svg.sun{color:#7b8799 !important;}'+
      '#topbarSaga .theme-toggle .knob{transition:left .25s ease,background .25s ease !important;}'+
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
    +'<div class="nav-item" data-tela="tarefas" onclick="window.location.href=\'minhas_tarefas.html\'">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Minhas Tarefas</div>'
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
    +'<svg class="crest" viewBox="0 0 220 220" aria-hidden="true"><defs><linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6fa2ff"/><stop offset="38%" stop-color="#4b8af5"/><stop offset="60%" stop-color="#2f6cd6"/><stop offset="100%" stop-color="#cfe0ff"/></linearGradient></defs><g transform="translate(110,110)"><path d="M0 -55l44 22v33c0 27-19 44-44 55-25-11-44-28-44-55v-33l44-22z" fill="none" stroke="url(#crestGold)" stroke-width="6"/><text x="0" y="10" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="38" font-weight="700" fill="url(#crestGold)">VM</text></g></svg>'
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

  // Janelas (modais): clicar no fundo escuro ou apertar Esc fecha a janela,
  // como o X. Usa o proprio botao de fechar da janela, para manter a limpeza
  // que cada tela faz ao fechar. Ligado ao carregar o arquivo, em todas as telas.
  var SELETOR_JANELAS='[class*="modal"][class*="overlay"],.visualizador-overlay,.painel-dia-overlay,.seletor-rapido-overlay';
  var SELETOR_BOTAO_FECHAR='.modal-close,[data-close-modal],[data-close],[aria-label^="Fechar"],[title^="Fechar"]';
  function janelaVisivel(el){
    if(!el.getClientRects().length)return false;
    var cs=getComputedStyle(el);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity||'1')>0.05;
  }
  function janelaDoTopo(){
    var abertas=Array.prototype.filter.call(document.querySelectorAll(SELETOR_JANELAS),janelaVisivel);
    if(!abertas.length)return null;
    abertas.sort(function(a,b){return (parseInt(getComputedStyle(a).zIndex,10)||0)-(parseInt(getComputedStyle(b).zIndex,10)||0);});
    return abertas[abertas.length-1];
  }
  function fecharJanela(ov){
    var btn=ov.querySelector(SELETOR_BOTAO_FECHAR);
    if(!btn){
      btn=Array.prototype.find.call(ov.querySelectorAll('button'),function(b){
        var t=(b.textContent||'').trim();
        return t==='✕'||t==='×'||t==='Cancelar'||t==='Fechar';
      });
    }
    if(btn){btn.click();return;}
    ov.classList.remove('open','aberto','show','ativo');
    if(ov.style.display&&ov.style.display!=='none')ov.style.display='none';
  }
  function ligarFechamentoJanelas(){
    var inicioNoFundo=null;
    // So fecha quando o clique comeca e termina no fundo: arrastar para
    // selecionar um texto e soltar fora da janela nao fecha nada.
    document.addEventListener('mousedown',function(e){
      inicioNoFundo=(e.target.matches&&e.target.matches(SELETOR_JANELAS))?e.target:null;
    },true);
    document.addEventListener('click',function(e){
      var ov=e.target;
      if(!ov.matches||!ov.matches(SELETOR_JANELAS)||ov!==inicioNoFundo)return;
      inicioNoFundo=null;
      fecharJanela(ov);
    });
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||e.defaultPrevented)return;
      var ov=janelaDoTopo();
      if(ov){e.preventDefault();fecharJanela(ov);}
    });
  }
  ligarFechamentoJanelas();

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
      var r=await global._sb.from('usuarios').select('id,nome_completo,email,eh_administrador,ativo').eq('auth_user_id',authId).single();
      if(r.error||!r.data)return;
      // Colaborador desligado (inativo) com sessao ainda aberta: sai na hora
      if(r.data.ativo===false){await global.sagaLogout('desligado');return;}
      _perfilAtual=r.data;
      var av=document.getElementById('avatarTop');if(av)av.textContent=iniciais(r.data.nome_completo);
      var nm=document.getElementById('avatarPopNome');if(nm)nm.textContent=r.data.nome_completo||'';
      var em=document.getElementById('avatarPopEmail');if(em)em.textContent=r.data.email||'';
    }catch(e){}
  }

  // ===== PRESENCA EM TEMPO REAL =====
  // Cada tela aberta entra no canal "presenca-saga" do Supabase Realtime.
  // Quem fecha o sistema ou perde a conexao sai da lista automaticamente.
  var NOMES_TELAS={processos:'Processos',agenda:'Agenda',tarefas:'Minhas Tarefas',chat:'Chat Interno',ponto:'Ponto Eletrônico',colaboradores:'Colaboradores',dashboard:'Dashboard',biblioteca:'Biblioteca',financeiro:'Financeiro',marketing:'Marketing',ficha:'Ficha do Cliente'};
  var _canalPresenca=null;
  var _telaAtual='';
  var _colaboradoresAtivos=null;

  function iniciarPresenca(){
    if(!global._sb||!_perfilAtual||_canalPresenca)return;
    _canalPresenca=global._sb.channel('presenca-saga',{config:{presence:{key:_perfilAtual.id}}});
    _canalPresenca.on('presence',{event:'sync'},renderizarPresenca);
    _canalPresenca.subscribe(function(status){
      if(status==='SUBSCRIBED'){
        _canalPresenca.track({nome:_perfilAtual.nome_completo,tela:NOMES_TELAS[_telaAtual]||'',desde:new Date().toISOString()});
      }
    });
  }

  function renderizarPresenca(){
    var estado=_canalPresenca?_canalPresenca.presenceState():{};
    var online=Object.keys(estado).map(function(id){
      var metas=estado[id]||[];
      var telas=metas.map(function(m){return m.tela;}).filter(Boolean);
      return {id:id,nome:(metas[0]&&metas[0].nome)||'Colaborador',telas:telas.filter(function(t,i){return telas.indexOf(t)===i;})};
    }).sort(function(a,b){return a.nome.localeCompare(b.nome);});
    var lbl=document.getElementById('onlineText');
    if(lbl)lbl.textContent=online.length+' online agora';
    var pop=document.getElementById('presencePop');
    if(!pop)return;
    var idsOnline=online.map(function(u){return u.id;});
    var offline=(_colaboradoresAtivos||[]).filter(function(u){return idsOnline.indexOf(u.id)===-1;});
    var htmlOnline=online.map(function(u){
      return '<div class="pop-row"><span class="online-dot"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(u.nome)+'</div><div style="font-size:9px;color:var(--muted)">'+esc(u.telas.length?'Em: '+u.telas.join(', '):'Online')+'</div></div></div>';
    }).join('');
    var htmlOffline=offline.map(function(u){
      return '<div class="pop-row" style="opacity:.6"><span style="width:7px;height:7px;border-radius:50%;background:#8b93a8;flex:0 0 auto"></span><div style="flex:1"><div style="font-size:11px;font-weight:600">'+esc(u.nome_completo)+'</div><div style="font-size:9px;color:var(--muted)">Offline</div></div></div>';
    }).join('');
    pop.innerHTML='<div class="pop-title">Online agora</div>'+(htmlOnline||'<div style="font-size:10.5px;color:var(--muted);padding:10px;text-align:center">Ninguém online.</div>')+
      (htmlOffline?'<div class="pop-title">Offline</div>'+htmlOffline:'');
  }

  async function carregarPresenca(){
    if(!global._sb)return;
    try{
      if(!_colaboradoresAtivos){
        var q=await global._sb.from('usuarios').select('id,nome_completo').eq('ativo',true).order('nome_completo');
        _colaboradoresAtivos=q.data||[];
      }
      iniciarPresenca();
      renderizarPresenca();
    }catch(e){}
  }

  // ===== SAIDA AUTOMATICA POR INATIVIDADE =====
  // Expediente: segunda a sexta, das 8h as 18h (horario de Maceio).
  // Durante o expediente o sistema nunca desconecta sozinho. Fora dele,
  // desconecta apos 2 horas sem uso, contando so o tempo fora do expediente.
  var HORA_INICIO_EXPEDIENTE=8,HORA_FIM_EXPEDIENTE=18;
  var LIMITE_INATIVIDADE_MIN=120;
  var CHAVE_ATIVIDADE='saga-ultima-atividade';
  var _fmtMaceio=new Intl.DateTimeFormat('en-US',{timeZone:'America/Maceio',weekday:'short',hour:'2-digit',hour12:false});

  function emExpediente(ms){
    var partes={};
    _fmtMaceio.formatToParts(new Date(ms)).forEach(function(p){partes[p.type]=p.value;});
    var hora=parseInt(partes.hour,10)%24;
    var diaUtil=['Mon','Tue','Wed','Thu','Fri'].indexOf(partes.weekday)!==-1;
    return diaUtil&&hora>=HORA_INICIO_EXPEDIENTE&&hora<HORA_FIM_EXPEDIENTE;
  }

  // Minutos fora do expediente entre a ultima atividade e agora
  function minutosOciososForaDoExpediente(){
    var ultima=parseInt(localStorage.getItem(CHAVE_ATIVIDADE)||'0',10);
    if(!ultima)return 0;
    var agora=Date.now(),passo=5*60*1000,total=0;
    var inicio=Math.max(ultima,agora-15*24*60*60*1000);
    for(var t=inicio;t<agora;t+=passo){
      if(!emExpediente(t))total+=Math.min(passo,agora-t)/60000;
      if(total>=LIMITE_INATIVIDADE_MIN)break;
    }
    return total;
  }

  var _ultimoRegistroAtividade=0;
  function registrarAtividade(){
    var agora=Date.now();
    if(agora-_ultimoRegistroAtividade<30000)return;
    _ultimoRegistroAtividade=agora;
    try{localStorage.setItem(CHAVE_ATIVIDADE,String(agora));}catch(e){}
  }

  async function verificarInatividade(){
    if(!global._sb)return false;
    if(minutosOciososForaDoExpediente()>=LIMITE_INATIVIDADE_MIN){
      await global.sagaLogout('inatividade');
      return true;
    }
    return false;
  }

  function ligarControleInatividade(){
    if(document.body.dataset.sagaInatividadeLigada)return;
    document.body.dataset.sagaInatividadeLigada='true';
    ['mousemove','mousedown','keydown','scroll','touchstart','wheel'].forEach(function(ev){
      document.addEventListener(ev,registrarAtividade,{passive:true,capture:true});
    });
    setInterval(verificarInatividade,60000);
  }

  // Tipos gravados pelos gatilhos do banco (notificar_nova_tarefa, notificar_mencao etc.)
  var TIPOS_NOTIF={
    tarefa_prazo:{titulo:'Tarefa',tela:'minhas_tarefas.html'},
    tarefa_repasse:{titulo:'Tarefa repassada',tela:'minhas_tarefas.html'},
    chat_mensagem:{titulo:'Chat',tela:'chat_interno_padrao_metalico.html'},
    mencao:{titulo:'Menção'}
  };
  function infoNotif(n){
    var t=TIPOS_NOTIF[n.tipo];
    if(t)return t;
    if(n.referencia_tabela==='tarefas')return {titulo:'Tarefa',tela:'minhas_tarefas.html'};
    return {titulo:'Aviso'};
  }
  async function abrirNotificacao(n){
    try{if(!n.lida)await global._sb.from('notificacoes').update({lida:true}).eq('id',n.id);}catch(e){}
    var tela=infoNotif(n).tela;
    if(tela)window.location.href=tela;
    else contarNaoLidas();
  }

  async function carregarNotificacoes(){
    if(!global._sb||!_perfilAtual)return;
    var pop=document.getElementById('notifPop');
    if(!pop)return;
    pop.innerHTML='<div class="pop-title">Notificacoes</div><div style="font-size:10.5px;color:var(--muted);padding:12px;text-align:center">Carregando...</div>';
    try{
      var r=await global._sb.from('notificacoes').select('id,tipo,resumo,referencia_tabela,referencia_id,lida,criado_em').eq('usuario_id',_perfilAtual.id).order('criado_em',{ascending:false}).limit(20);
      if(r.error)throw r.error;
      var cabecalho='<div class="pop-title" style="display:flex;justify-content:space-between;align-items:center"><span>Notificacoes</span><button type="button" id="btnMarcarTodasLidas" style="background:none;border:none;color:var(--gold);font-size:10px;cursor:pointer">Marcar todas como lidas</button></div>';
      if(!r.data||!r.data.length){pop.innerHTML=cabecalho+'<div style="font-size:10.5px;color:var(--muted);padding:12px;text-align:center">Sem notificacoes recentes.</div>';return;}
      pop.innerHTML=cabecalho+r.data.map(function(n){
        return '<div class="notification-item" data-notif-id="'+esc(n.id)+'" style="cursor:pointer"><span class="n-dot '+(n.lida?'read':'')+'"></span><div class="notification-text"><div style="font-weight:600">'+esc(infoNotif(n).titulo)+'</div><div style="color:var(--muted);margin-top:2px">'+esc(n.resumo||'')+'</div><div class="notification-time">'+formatarDataRel(n.criado_em)+'</div></div></div>';
      }).join('');
      pop.querySelectorAll('[data-notif-id]').forEach(function(el){
        el.addEventListener('click',function(ev){
          ev.stopPropagation();
          var n=r.data.find(function(x){return String(x.id)===el.getAttribute('data-notif-id');});
          if(n)abrirNotificacao(n);
        });
      });
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

  global.sagaLogout=async function(motivo){
    if(!global._sb)return;
    try{if(_canalPresenca)await _canalPresenca.untrack();}catch(e){}
    try{await global._sb.auth.signOut();}catch(e){}
    try{localStorage.removeItem(CHAVE_ATIVIDADE);}catch(e){}
    window.location.href='login_padrao_metalico.html'+(motivo==='inatividade'||motivo==='desligado'?'?motivo='+motivo:'');
  };

  async function carregar(telaAtiva){
    _telaAtual=telaAtiva||'';
    // Sessao parada alem do limite (ex.: computador ligado a noite toda): sai antes de montar a tela
    if(await verificarInatividade())return;
    registrarAtividade();
    ligarControleInatividade();
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
    // Presenca e contador do sino carregam em paralelo e nao seguram a tela
    carregarPresenca();
    contarNaoLidas();
    document.dispatchEvent(new CustomEvent('saga-ui-pronto',{detail:{telaAtiva:telaAtiva}}));
  }

  global.SagaUI={carregar:carregar,recarregarPresenca:carregarPresenca,recarregarNotificacoes:carregarNotificacoes};
})(window);
