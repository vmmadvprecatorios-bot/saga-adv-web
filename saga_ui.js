// SAGA UI - carrega sidebar e topbar unificadas + logica compartilhada da topbar
// Uso: <div id="sidebarSaga"></div>  +  <header class="topbar" id="topbarSaga"></header>
// Chamar (apos criar o cliente _sb do Supabase): SagaUI.carregar('nome-tela');
// A sidebar e a topbar sao embutidas neste arquivo (nao dependem de fetch).
(function(global){
  // Confirmacao no padrao do SAGA (no lugar do confirm() do navegador). Devolve uma Promise<boolean>.
  global.sagaConfirmar=function(titulo,texto,botao,perigo){
    return new Promise(function(ok){
      var antigo=document.getElementById('sagaConfirma');if(antigo)antigo.remove();
      var d=document.createElement('div');d.id='sagaConfirma';
      d.style.cssText='position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,14,.55);backdrop-filter:blur(4px)';
      var cor=perigo===false?'var(--gold,#2f6cd6)':'var(--danger,#e5484d)';
      d.innerHTML='<div role="dialog" aria-modal="true" style="width:100%;max-width:420px;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:16px;background:var(--panel-solid,#1c2638);color:var(--text,#e8edf5);box-shadow:0 24px 50px rgba(0,0,0,.45);padding:20px 22px">'+
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:21px;font-weight:700;margin-bottom:8px"></div>'+
        '<div style="font-size:12.5px;line-height:1.55;color:var(--muted,#a3afc2);margin-bottom:18px;white-space:pre-wrap"></div>'+
        '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-r="0" style="height:36px;padding:0 16px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,.16));background:transparent;color:var(--text,#e8edf5);font:inherit;font-size:12px;font-weight:700;cursor:pointer">Cancelar</button>'+
        '<button type="button" data-r="1" style="height:36px;padding:0 16px;border-radius:10px;border:1px solid '+cor+';background:'+cor+';color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer"></button></div></div>';
      var caixa=d.firstChild;caixa.children[0].textContent=titulo||'Confirmar';caixa.children[1].textContent=texto||'';
      caixa.querySelector('[data-r="1"]').textContent=botao||'Confirmar';
      function fim(v){document.removeEventListener('keydown',tecla,true);d.remove();ok(v);}
      function tecla(e){if(e.key==='Escape'){e.preventDefault();fim(false);}else if(e.key==='Enter'){e.preventDefault();fim(true);}}
      d.addEventListener('click',function(e){var b=e.target.closest('[data-r]');if(b)fim(b.dataset.r==='1');else if(e.target===d)fim(false);});
      document.addEventListener('keydown',tecla,true);
      document.body.appendChild(d);
      setTimeout(function(){var b=caixa.querySelector('[data-r="0"]');if(b)b.focus();},30);
    });
  };
  // Telas que sabem se atualizar sozinhas (escutam 'saga-atualizar'); as outras sao recarregadas pelo botao de atualizar
  var _telaSeAtualiza=false;
  (function(){
    var orig=document.addEventListener;
    document.addEventListener=function(tipo){if(tipo==='saga-atualizar')_telaSeAtualiza=true;return orig.apply(this,arguments);};
  })();
  // Troca de tela pelo menu; com saga_guard.js ha uma saida suave
  if(!global.sagaIrPara)global.sagaIrPara=function(url){if(url)window.location.href=url;};
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
      '#sidebarSaga a.nav-item,#sidebarSaga a.nav-item:hover,#sidebarSaga a.nav-item:visited{text-decoration:none !important;}'+
      /* ===== Troca de tema com a luz saindo do botao ===== */
      'html.saga-tema-trocando *:not(#themeToggle):not(#themeToggle *),html.saga-tema-trocando *::before,html.saga-tema-trocando *::after{transition:none !important;}'+
      'html.saga-tema-trocando::view-transition-old(root),html.saga-tema-trocando::view-transition-new(root){animation:none !important;mix-blend-mode:normal;}'+
      'html.saga-tema-trocando::view-transition-group(root){animation:none !important;}'+
      'html.saga-tema-escurecendo::view-transition-old(root){z-index:2;}'+
      '#themeToggle{view-transition-name:saga-tema-botao;}'+
      'html.saga-tema-trocando::view-transition-old(saga-tema-botao){display:none;}'+
      'html.saga-tema-trocando::view-transition-new(saga-tema-botao),html.saga-tema-trocando::view-transition-group(saga-tema-botao){animation:none !important;}'+
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
      '#topbarSaga .theme-toggle .knob{position:absolute !important;top:3px !important;left:3px !important;width:24px !important;height:24px !important;border-radius:50% !important;background:linear-gradient(135deg,var(--gold-light),var(--gold)) !important;box-shadow:0 2px 7px rgba(0,0,0,.18) !important;transition:left .42s cubic-bezier(.34,1.45,.64,1) !important;}'+
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
      '#topbarSaga .notif-grupo-qtd{min-width:26px !important;height:26px !important;padding:0 6px !important;border-radius:13px !important;color:#fff !important;font-size:11.5px !important;font-weight:700 !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;flex:0 0 auto !important;}'+
      '#topbarSaga .notif-ok{flex:0 0 auto !important;border:1px solid var(--border) !important;background:transparent !important;color:var(--text) !important;border-radius:7px !important;padding:5px 10px !important;font-size:10.5px !important;font-weight:700 !important;cursor:pointer !important;}'+
      '#topbarSaga .notif-ok:hover{background:var(--gold) !important;color:#fff !important;border-color:var(--gold) !important;}'+
      '#topbarSaga .avatar-pop-nome{color:#e8eaf0 !important;}[data-theme="light"] #topbarSaga .avatar-pop-nome{color:#13233a !important;}'+
      '#topbarSaga .avatar-pop-email{color:#8b93a8 !important;}[data-theme="light"] #topbarSaga .avatar-pop-email{color:#4a586e !important;}'+
      '#topbarSaga .pop-divisor{background:color-mix(in srgb,var(--gold) 12%,transparent) !important;}'+
      '#topbarSaga .pop-row-sair{color:#e85d5d !important;}'+
      '#topbarSaga a.pop-row-link{display:flex !important;align-items:center !important;gap:9px !important;text-decoration:none !important;color:inherit !important;cursor:pointer !important;}'+
      '#topbarSaga .avatar{position:relative !important;overflow:hidden !important;cursor:pointer !important;}'+
      '#topbarSaga .avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;}'+
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
      '#topbarSaga .theme-toggle .knob{transition:left .42s cubic-bezier(.34,1.45,.64,1),background .25s ease !important;}'+
      '#sidebarSaga .sem-permissao,#sidebarSaga .perm-pendente{display:none !important;}'+
      '@media(max-width:760px){#sidebarSaga{position:fixed !important;}#topbarSaga .top-center{display:none !important;}}'+
      /* ===== CELULAR (ate 760px): menu lateral deslizante, barra compacta, sem rolagem lateral ===== */
      '@media(max-width:760px){'+
        'html,body{overflow-x:clip !important;max-width:100vw !important;}'+
        '#topbarSaga{padding:0 10px !important;gap:8px !important;width:100% !important;}'+
        '#topbarSaga .top-left{gap:8px !important;min-width:0 !important;}'+
        '#topbarSaga .top-right{gap:6px !important;margin-left:auto !important;}'+
        '#topbarSaga .crest{width:26px !important;height:26px !important;}'+
        '#topbarSaga .brand-name{font-size:16px !important;}'+
        '#topbarSaga .presence-btn{padding:0 !important;width:34px !important;height:34px !important;justify-content:center !important;}'+
        '#topbarSaga #onlineText{display:none !important;}'+
        '#topbarSaga .icon-btn{width:34px !important;height:34px !important;}'+
        '#topbarSaga .theme-toggle{width:56px !important;height:30px !important;}'+
        '#topbarSaga .theme-toggle svg{width:13px !important;height:13px !important;}'+
        '#topbarSaga .theme-toggle .knob{width:22px !important;height:22px !important;top:3px !important;}'+
        '[data-theme="light"] #topbarSaga .theme-toggle .knob{left:3px !important;}'+
        '[data-theme="dark"] #topbarSaga .theme-toggle .knob{left:29px !important;}'+
        '#topbarSaga .avatar{width:32px !important;height:32px !important;}'+
        '#sidebarSaga,#sidebarSaga.collapsed{position:fixed !important;top:64px !important;left:0 !important;bottom:0 !important;height:calc(100vh - 64px) !important;height:calc(100dvh - 64px) !important;max-height:none !important;min-height:0 !important;overscroll-behavior:contain !important;'+
          'width:min(290px,84vw) !important;min-width:0 !important;flex-basis:auto !important;padding:16px 0 24px !important;opacity:1 !important;overflow-y:auto !important;'+
          'border:none !important;z-index:1500 !important;transform:translateX(-105%) !important;transition:transform .25s ease !important;box-shadow:none !important;}'+
        '#sidebarSaga.open{transform:translateX(0) !important;box-shadow:8px 0 30px rgba(0,0,0,.35) !important;}'+
        '#sidebarSaga .nav-item{padding:14px 22px !important;font-size:15px !important;font-weight:500 !important;}'+
        '#sidebarSaga .nav-item .nav-icon{width:18px !important;height:18px !important;}'+
        '#sidebarSaga .nav-section{font-size:11px !important;padding:18px 22px 8px !important;}'+
        /* o fundo escuro cobre so a area a direita do menu: em telas onde o menu fica dentro de outra camada, ele nunca fica por cima dos itens */
        /* janelas da barra superior (notificacoes, online, busca, perfil): largura da tela, logo abaixo da barra */
        '#topbarSaga .popover{position:fixed !important;top:68px !important;left:8px !important;right:8px !important;width:auto !important;max-width:none !important;max-height:calc(100dvh - 84px) !important;overflow-y:auto !important;overscroll-behavior:contain !important;}'+
        'html.saga-menu-aberto,html.saga-menu-aberto body{overflow:hidden !important;overscroll-behavior:none !important;}'+
        '#overlay{touch-action:none !important;}#overlay:not(.aberto){display:none !important;}#overlay.aberto{display:block !important;}'+
        '#overlay{position:fixed !important;top:64px !important;bottom:0 !important;right:0 !important;left:min(290px,84vw) !important;width:auto !important;height:auto !important;z-index:1400 !important;background:rgba(5,10,20,.45) !important;}'+
      '}';
    (document.head||document.documentElement).appendChild(style);
  }
  if(document.head)_injetarEstiloBase();
  else document.addEventListener('DOMContentLoaded',_injetarEstiloBase);

  var _sidebarColapsada=localStorage.getItem('saga-sidebar-colapsada')==='true';

  // Celular: o menu lateral e o fundo escuro ficam direto no <body>. Dentro do layout da tela
  // eles herdavam a altura de outra camada e sobrava um espaco branco embaixo.
  var _lugarOriginalMenu=null,_rolagemTravada=0;
  function ajustarMenuParaCelular(){
    var sb=document.getElementById('sidebarSaga'),ov=document.getElementById('overlay');
    if(!sb)return;
    if(window.innerWidth<=760){
      if(sb.parentElement!==document.body){
        _lugarOriginalMenu={pai:sb.parentElement,prox:sb.nextSibling,ovPai:ov&&ov.parentElement,ovProx:ov&&ov.nextSibling};
        document.body.appendChild(sb);
        if(ov)document.body.appendChild(ov);
      }
    }else{
      if(sb.classList.contains('open'))fecharMenuCelular();
      if(_lugarOriginalMenu&&sb.parentElement===document.body){
        _lugarOriginalMenu.pai.insertBefore(sb,_lugarOriginalMenu.prox);
        if(ov&&_lugarOriginalMenu.ovPai)_lugarOriginalMenu.ovPai.insertBefore(ov,_lugarOriginalMenu.ovProx);
        _lugarOriginalMenu=null;
      }
    }
  }
  // Com o menu aberto no celular, a pagina de tras nao rola nem recebe toques
  function travarPagina(travar){
    var html=document.documentElement,b=document.body;
    if(travar){
      if(html.classList.contains('saga-menu-aberto'))return;
      _rolagemTravada=window.scrollY||0;
      html.classList.add('saga-menu-aberto');
      b.style.position='fixed';b.style.top=(-_rolagemTravada)+'px';b.style.left='0';b.style.right='0';b.style.width='100%';
    }else{
      if(!html.classList.contains('saga-menu-aberto'))return;
      html.classList.remove('saga-menu-aberto');
      b.style.position='';b.style.top='';b.style.left='';b.style.right='';b.style.width='';
      window.scrollTo(0,_rolagemTravada);
    }
  }
  function fecharMenuCelular(){
    var sb=document.getElementById('sidebarSaga'),ov=document.getElementById('overlay'),ham=document.getElementById('hamburger');
    if(sb)sb.classList.remove('open');
    if(ov)ov.classList.remove('aberto');
    if(ham)ham.classList.remove('ativo');
    travarPagina(false);
  }
  function _aplicarColapsoSalvo(){
    var sb=document.getElementById('sidebarSaga');
    if(sb&&_sidebarColapsada)sb.classList.add('collapsed');
  }
  if(document.getElementById('sidebarSaga'))_aplicarColapsoSalvo();
  else document.addEventListener('DOMContentLoaded',_aplicarColapsoSalvo);

  var _perfilAtual=null;

  var SIDEBAR_HTML=''
    +'<div class="nav-section">Operacao</div>'
    +'<div class="nav-item" data-tela="processos" onclick="sagaIrPara(\'lista_processos_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Processos em Andamento</div>'
    +'<div class="nav-item" data-tela="agenda" onclick="sagaIrPara(\'calendario_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Agenda<span class="nav-badge-chat nav-badge-dia" id="navBadgeAgenda" style="display:none" title="Compromissos de hoje"></span></div>'
    +'<div class="nav-item" data-tela="tarefas" onclick="sagaIrPara(\'minhas_tarefas.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Minhas Tarefas<span class="nav-badge-chat nav-badge-dia" id="navBadgeTarefas" style="display:none"></span></div>'
    +'<div class="nav-section">Comunicacao</div>'
    +'<div class="nav-item" data-tela="chat" onclick="sagaIrPara(\'chat_interno_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Chat Interno<span class="nav-badge-chat" id="navBadgeChat" style="display:none"></span></div>'
    +'<div class="nav-item" data-tela="ponto" onclick="sagaIrPara(\'ponto_eletronico_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Ponto Eletronico</div>'
    +'<div class="nav-section">Gestao</div>'
    +'<div class="nav-item" data-tela="colaboradores" onclick="sagaIrPara(\'gestao_colaboradores_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Colaboradores</div>'
    +'<div class="nav-item" data-tela="dashboard" onclick="sagaIrPara(\'dashboard_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Dashboard</div>'
    +'<div class="nav-item" data-tela="biblioteca" onclick="sagaIrPara(\'biblioteca_padrao_metalico_FINAL.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M4 4v16a1 1 0 001 1h14a1 1 0 001-1V4a1 1 0 00-1-1h-4a2 2 0 00-2 2v16" stroke="currentColor" stroke-width="1.5"/><path d="M8 3v16" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Biblioteca de Modelos</div>'
    +'<div class="nav-item" data-tela="financeiro" onclick="sagaIrPara(\'financeiro.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    +'Financeiro</div>'
    +'<div class="nav-item" data-tela="marketing" onclick="sagaIrPara(\'marketing_campanhas_padrao_metalico.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-8v18l-18-8v-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 15v4a2 2 0 002 2h2" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Marketing</div>'
    +'<div class="nav-item sem-permissao" data-tela="permissoes" onclick="sagaIrPara(\'painel_admin_permissoes.html\')">'
    +'<svg class="nav-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z" stroke="currentColor" stroke-width="1.5"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    +'Permissões</div>';

  var TOPBAR_HTML=''
    +'<div class="top-left">'
    +'<button class="hamburger" id="hamburger" aria-label="Abrir navegacao" type="button"><span></span><span></span><span></span></button>'
    +'<div class="brand">'
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
    +'<button class="icon-btn" id="privBtn" type="button" aria-label="Modo privacidade" title="Ocultar dados dos clientes (para gravar tela)"><svg class="olho-aberto" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="var(--gold)" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="var(--gold)" stroke-width="1.6"/></svg><svg class="olho-fechado" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.9 17.9A10.4 10.4 0 0112 20c-7 0-11-8-11-8a19 19 0 015.1-5.9M9.9 4.2A9.7 9.7 0 0112 4c7 0 11 8 11 8a19 19 0 01-2.2 3.2M14.1 14.1a3 3 0 11-4.2-4.2" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round"/><path d="M1 1l22 22" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round"/></svg></button>'
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
    +'<a class="pop-row pop-row-link" href="configuracoes_padrao_metalico.html?aba=perfil" data-ir="configuracoes_padrao_metalico.html?aba=perfil">'
    +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
    +'Meu perfil</a>'
    +'<a class="pop-row pop-row-link" href="configuracoes_padrao_metalico.html?aba=preferencias" data-ir="configuracoes_padrao_metalico.html?aba=preferencias">'
    +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" stroke="currentColor" stroke-width="1.5"/></svg>'
    +'Configurações</a>'
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
      function aplicar(){
        document.body.setAttribute('data-theme',novo);
        try{localStorage.setItem('saga-tema',novo);}catch(e){}
      }
      trocarTemaComLuz(btn,novo,aplicar);
    });
  }

  // Modo claro: a luz sai do botao do sol e se espalha em circulo pela tela.
  // Modo escuro: a luz volta e se recolhe para dentro do botao.
  var _temaTrocando=false;
  function trocarTemaComLuz(btn,novo,aplicar){
    var html=document.documentElement;
    var reduz=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!document.startViewTransition||reduz||_temaTrocando){aplicar();return;}
    _temaTrocando=true;
    var r=btn.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    var raio=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
    var clarear=novo==='light';
    html.classList.add('saga-tema-trocando');
    html.classList.toggle('saga-tema-escurecendo',!clarear);
    var vt;
    try{vt=document.startViewTransition(aplicar);}catch(e){aplicar();fim();return;}
    function fim(){_temaTrocando=false;html.classList.remove('saga-tema-trocando','saga-tema-escurecendo');}
    vt.ready.then(function(){
      var circulos=['circle(0px at '+x+'px '+y+'px)','circle('+raio+'px at '+x+'px '+y+'px)'];
      html.animate({clipPath:clarear?circulos:circulos.slice().reverse()},
        {duration:clarear?650:560,easing:clarear?'cubic-bezier(.4,0,.2,1)':'cubic-bezier(.55,0,.6,1)',fill:'forwards',
         pseudoElement:clarear?'::view-transition-new(root)':'::view-transition-old(root)'});
    }).catch(function(){});
    vt.finished.then(fim,fim);
  }

  function ligarHamburger(){
    var ham=document.getElementById('hamburger');
    if(!ham||ham.dataset.ligado)return;
    ham.dataset.ligado='true';
    // Toda tela precisa do fundo escuro do menu do celular (tocar nele fecha o menu)
    if(!document.getElementById('overlay')){var ovNovo=document.createElement('div');ovNovo.id='overlay';ovNovo.className='overlay';ovNovo.style.display='none';document.body.appendChild(ovNovo);}
    ajustarMenuParaCelular();
    window.addEventListener('resize',ajustarMenuParaCelular);
    var sbInicial=document.getElementById('sidebarSaga');
    if(sbInicial&&sbInicial.classList.contains('collapsed'))ham.classList.add('ativo');
    ham.addEventListener('click',function(){
      var sb=document.getElementById('sidebarSaga');
      var ov=document.getElementById('overlay');
      if(window.innerWidth<=760){
        ajustarMenuParaCelular();
        if(sb&&sb.classList.contains('open')){fecharMenuCelular();return;}
        if(sb)sb.classList.add('open');
        if(ov)ov.classList.add('aberto');
        ham.classList.add('ativo');
        travarPagina(true);
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
      ov.addEventListener('click',fecharMenuCelular);
      // Arrastar o dedo no fundo escuro nao rola a pagina de tras
      ov.addEventListener('touchmove',function(e){e.preventDefault();},{passive:false});
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
    document.querySelectorAll('#avatarPop [data-ir]').forEach(function(a){
      if(a.dataset.ligado)return;a.dataset.ligado='true';
      a.addEventListener('click',function(e){
        if(e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;
        e.preventDefault();e.stopPropagation();fecharTodosPopovers();global.sagaIrPara(a.getAttribute('href'));
      });
    });
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
        if(!_telaSeAtualiza){global.sagaIrPara(location.href);return;}
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
      var r=await global._sb.from('usuarios').select('id,nome_completo,email,eh_administrador,ativo,foto_url,preferencias,preferencias_notificacao').eq('auth_user_id',authId).single();
      if(r.error||!r.data)return;
      // Colaborador desligado (inativo) com sessao ainda aberta: sai na hora
      if(r.data.ativo===false){await global.sagaLogout('desligado');return;}
      _perfilAtual=r.data;
      var av=document.getElementById('avatarTop');if(av)av.textContent=iniciais(r.data.nome_completo);try{localStorage.setItem('saga-iniciais',iniciais(r.data.nome_completo));}catch(e){}
      mostrarFotoAvatar(r.data.foto_url);
      // tamanho da letra escolhido nas Configuracoes vale em qualquer aparelho
      var letra=String((r.data.preferencias||{}).letra||'1');
      try{if(localStorage.getItem('saga-letra')!==letra){localStorage.setItem('saga-letra',letra);document.documentElement.style.zoom=letra==='1'?'':letra;}}catch(e){}
      _avisosDesligados=((r.data.preferencias_notificacao||{}).desligados)||[];
      var nm=document.getElementById('avatarPopNome');if(nm)nm.textContent=r.data.nome_completo||'';
      var em=document.getElementById('avatarPopEmail');if(em)em.textContent=r.data.email||'';
    }catch(e){}
  }

  // ===== PRESENCA EM TEMPO REAL =====
  // Cada tela aberta entra no canal "presenca-saga" do Supabase Realtime.
  // Quem fecha o sistema ou perde a conexao sai da lista automaticamente.
  var NOMES_TELAS={configuracoes:'Configurações',processos:'Processos',agenda:'Agenda',tarefas:'Minhas Tarefas',chat:'Chat Interno',ponto:'Ponto Eletrônico',colaboradores:'Colaboradores',dashboard:'Dashboard',biblioteca:'Biblioteca',financeiro:'Financeiro',marketing:'Marketing',ficha:'Ficha do Cliente'};
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
        var q=await global._sb.from('usuarios').select('id,nome_completo').eq('ativo',true).not('auth_user_id','is',null).order('nome_completo');
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
    // Revalida o acesso em segundo plano quando passam os 30 minutos
    setInterval(function(){verificarAcesso(false);},60000);
  }

  // Tipos gravados pelos gatilhos do banco (notificar_nova_tarefa, notificar_mencao etc.)
  var TIPOS_NOTIF={
    tarefa_prazo:{titulo:'Tarefa',tela:'minhas_tarefas.html'},
    tarefa_repasse:{titulo:'Tarefa repassada',tela:'minhas_tarefas.html'},
    chat_mensagem:{titulo:'Chat',tela:'chat_interno_padrao_metalico.html'},
    mencao:{titulo:'Menção'},
    tarefa_hoje:{titulo:'Tarefa para hoje',tela:'minhas_tarefas.html'},
    tarefa_atrasada:{titulo:'Tarefa atrasada',tela:'minhas_tarefas.html'},
    compromisso_hoje:{titulo:'Compromisso hoje',tela:'calendario_padrao_metalico.html'}
  };
  function infoNotif(n){
    var t=TIPOS_NOTIF[n.tipo];
    if(t)return t;
    if(n.referencia_tabela==='tarefas')return {titulo:'Tarefa',tela:'minhas_tarefas.html'};
    return {titulo:'Aviso'};
  }
  // Sino agrupado: uma linha por tipo (Chat, Tarefas, Agenda, Mencoes, Outros), so com o que nao foi lido.
  // Clicar abre o lugar (o item exato quando ha um so) e tira o grupo do sino; o botao OK so dispensa.
  var GRUPOS_NOTIF=[
    {chave:'chat',titulo:'Chat',tipos:['chat_mensagem'],tela:'chat_interno_padrao_metalico.html',um:'mensagem nova',varios:'mensagens novas',cor:'#e5484d'},
    {chave:'tarefas',titulo:'Tarefas',tipos:['tarefa_prazo','tarefa_repasse','tarefa_hoje','tarefa_atrasada'],tela:'minhas_tarefas.html',um:'aviso de tarefa',varios:'avisos de tarefas',cor:'#f59e0b'},
    {chave:'agenda',titulo:'Agenda',tipos:['compromisso_hoje'],tela:'calendario_padrao_metalico.html',um:'compromisso hoje',varios:'compromissos hoje',cor:'#3b82f6'},
    {chave:'mencao',titulo:'Menções',tipos:['mencao'],tela:null,um:'menção em comentário',varios:'menções em comentários',cor:'#8b5cf6'},
    {chave:'marketing',titulo:'Marketing',tipos:['aprovacao'],tela:'marketing_campanhas_padrao_metalico.html?aba=materiais',um:'aviso de material',varios:'avisos de materiais',cor:'#f97316'},
    {chave:'outros',titulo:'Outros avisos',tipos:null,tela:null,um:'aviso',varios:'avisos',cor:'#64748b'}
  ];
  function grupoDoTipo(tipo){
    for(var i=0;i<GRUPOS_NOTIF.length-1;i++){if(GRUPOS_NOTIF[i].tipos.indexOf(tipo)!==-1)return GRUPOS_NOTIF[i];}
    return GRUPOS_NOTIF[GRUPOS_NOTIF.length-1];
  }
  // Avisos que a pessoa desligou nas Configuracoes nao entram no sino
  var _avisosDesligados=[];
  function mostrarFotoAvatar(url){
    var av=document.getElementById('avatarTop');if(!av)return;
    try{if(url)localStorage.setItem('saga-foto',url);else localStorage.removeItem('saga-foto');}catch(e){}
    var img=av.querySelector('img');
    if(url){if(!img){img=document.createElement('img');img.alt='';av.appendChild(img);}img.src=url;}
    else if(img)img.remove();
  }
  function agruparNotif(lista){
    var mapa={};
    lista.forEach(function(n){var g=grupoDoTipo(n.tipo);if(_avisosDesligados.indexOf(g.chave)>=0)return;(mapa[g.chave]=mapa[g.chave]||{grupo:g,itens:[]}).itens.push(n);});
    return GRUPOS_NOTIF.filter(function(g){return mapa[g.chave];}).map(function(g){return mapa[g.chave];});
  }
  async function marcarLidas(ids){
    if(!ids.length)return;
    try{await global._sb.from('notificacoes').update({lida:true}).in('id',ids);}catch(e){}
  }
  async function abrirGrupoNotif(g){
    var ids=g.itens.map(function(n){return n.id;});
    // Um item so (ou todos do mesmo item): vai direto nele
    var refs={};g.itens.forEach(function(n){refs[n.referencia_id||n.id]=1;});
    if(Object.keys(refs).length===1){await abrirNotificacao(g.itens[0],ids);return;}
    await marcarLidas(ids);
    if(g.grupo.tela)window.location.href=g.grupo.tela;
    else carregarNotificacoes();
  }

  async function abrirNotificacao(n,idsParaMarcar){
    await marcarLidas(idsParaMarcar||(n.lida?[]:[n.id]));
    // Leva direto ao item: tarefa aberta, compromisso no dia, conversa do chat, comentarios do processo
    try{
      var d=await global._sb.rpc('destino_notificacao',{p_id:n.id});
      if(d.data&&d.data.tela){
        var p=new URLSearchParams();
        Object.keys(d.data).forEach(function(k){if(k!=='tela'&&d.data[k])p.set(k,d.data[k]);});
        window.location.href=d.data.tela+'?'+p.toString();
        return;
      }
    }catch(e){}
    var tela=infoNotif(n).tela;
    if(tela)window.location.href=tela;
    else contarNaoLidas();
  }

  async function carregarNotificacoes(){
    if(!global._sb||!_perfilAtual)return;
    var pop=document.getElementById('notifPop');
    if(!pop)return;
    pop.innerHTML='<div class="pop-title">Notificações</div><div style="font-size:10.5px;color:var(--muted);padding:12px;text-align:center">Carregando...</div>';
    try{
      var r=await global._sb.from('notificacoes').select('id,tipo,resumo,referencia_tabela,referencia_id,lida,criado_em').eq('usuario_id',_perfilAtual.id).eq('lida',false).order('criado_em',{ascending:false}).limit(300);
      if(r.error)throw r.error;
      var grupos=agruparNotif(r.data||[]);
      atualizarBadgeNotif(grupos.length);
      var cabecalho='<div class="pop-title" style="display:flex;justify-content:space-between;align-items:center"><span>Notificações</span>'+(grupos.length?'<button type="button" id="btnMarcarTodasLidas" style="background:none;border:none;color:var(--gold);font-size:10px;cursor:pointer">Dispensar todas</button>':'')+'</div>';
      if(!grupos.length){pop.innerHTML=cabecalho+'<div style="font-size:11px;color:var(--muted);padding:16px;text-align:center">Nenhuma notificação nova.</div>';return;}
      pop.innerHTML=cabecalho+grupos.map(function(g,i){
        var q=g.itens.length,ult=g.itens[0];
        return '<div class="notification-item notif-grupo" data-grupo="'+i+'" style="cursor:pointer;align-items:center">'
          +'<span class="notif-grupo-qtd" style="background:'+g.grupo.cor+'">'+(q>99?'99+':q)+'</span>'
          +'<div class="notification-text" style="flex:1;min-width:0"><div style="font-weight:700">'+esc(g.grupo.titulo)+' <span style="font-weight:500;color:var(--muted)">· '+q+' '+esc(q===1?g.grupo.um:g.grupo.varios)+'</span></div>'
          +'<div style="color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ult.resumo||'')+'</div>'
          +'<div class="notification-time">'+formatarDataRel(ult.criado_em)+'</div></div>'
          +'<button type="button" class="notif-ok" data-ok="'+i+'" title="Dispensar estes avisos">OK</button></div>';
      }).join('');
      pop.querySelectorAll('[data-grupo]').forEach(function(el){
        el.addEventListener('click',function(ev){ev.stopPropagation();abrirGrupoNotif(grupos[+el.getAttribute('data-grupo')]);});
      });
      pop.querySelectorAll('[data-ok]').forEach(function(el){
        el.addEventListener('click',async function(ev){
          ev.stopPropagation();
          el.disabled=true;
          await marcarLidas(grupos[+el.getAttribute('data-ok')].itens.map(function(n){return n.id;}));
          carregarNotificacoes();
        });
      });
      var btnMarcar=document.getElementById('btnMarcarTodasLidas');
      if(btnMarcar)btnMarcar.addEventListener('click',function(ev){ev.stopPropagation();marcarTodasComoLidas();});
    }catch(e){
      pop.innerHTML='<div class="pop-title">Notificações</div><div style="font-size:10.5px;color:#e08383;padding:12px;text-align:center">Erro ao carregar.</div>';
    }
  }

  // Numero do sino = quantos tipos (grupos) tem novidade
  async function contarNaoLidas(){
    if(!global._sb||!_perfilAtual)return;
    try{
      var r=await global._sb.from('notificacoes').select('tipo').eq('usuario_id',_perfilAtual.id).eq('lida',false).limit(1000);
      if(r.error)return;
      var g={};(r.data||[]).forEach(function(n){var k=grupoDoTipo(n.tipo).chave;if(_avisosDesligados.indexOf(k)<0)g[k]=1;});
      atualizarBadgeNotif(Object.keys(g).length);
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

  // ===== Controle de acesso por horario e local (T29) =====
  // O banco decide (acesso_verificar) e registra cada verificacao. A localizacao so e pedida
  // quando a regra exige; o administrador nunca e bloqueado. Revalida a cada 30 minutos.
  var CHAVE_ACESSO='saga-acesso',VALIDADE_ACESSO_MS=30*60000,_acessoVerificando=null;
  function lerLocalizacao(){
    return new Promise(function(ok){
      if(!navigator.geolocation)return ok(null);
      navigator.geolocation.getCurrentPosition(function(p){ok({lat:p.coords.latitude,lng:p.coords.longitude,precisao:p.coords.accuracy});},
        function(){ok(null);},{enableHighAccuracy:true,timeout:12000,maximumAge:120000});
    });
  }
  async function consultarAcesso(loc){
    var r=await global._sb.rpc('acesso_verificar',{p_lat:loc?loc.lat:null,p_lng:loc?loc.lng:null,p_precisao:loc?loc.precisao:null,p_navegador:(navigator.userAgent||'').slice(0,200)});
    if(r.error)throw r.error;
    return r.data||{};
  }
  async function verificarAcesso(forcar){
    if(!global._sb)return true;
    var uid=idSessaoLocal(),guardado=null;
    try{guardado=JSON.parse(sessionStorage.getItem(CHAVE_ACESSO)||'null');}catch(e){}
    if(!forcar&&guardado&&guardado.uid===uid&&guardado.ate>Date.now())return true;
    if(_acessoVerificando)return _acessoVerificando;
    _acessoVerificando=(async function(){
      try{
        var d=await consultarAcesso(null);
        if(!d.ok&&d.motivo==='sem localização'){var loc=await lerLocalizacao();d=await consultarAcesso(loc);}
        if(d.ok){try{sessionStorage.setItem(CHAVE_ACESSO,JSON.stringify({uid:uid,ate:Date.now()+VALIDADE_ACESSO_MS}));}catch(e){}return true;}
        try{sessionStorage.setItem('saga-acesso-msg',d.mensagem||'Acesso não permitido agora.');}catch(e){}
        await global.sagaLogout('acesso');
        return false;
      }catch(e){
        // Falha de rede: nao tranca quem ja estava dentro; tenta de novo na proxima verificacao
        return true;
      }finally{_acessoVerificando=null;}
    })();
    return _acessoVerificando;
  }

  global.sagaLogout=async function(motivo){
    if(!global._sb)return;
    try{if(_canalPresenca)await _canalPresenca.untrack();}catch(e){}
    try{await global._sb.auth.signOut();}catch(e){}
    try{localStorage.removeItem(CHAVE_ATIVIDADE);}catch(e){}
    try{localStorage.removeItem('saga-permissoes');sessionStorage.removeItem(CHAVE_ACESSO);}catch(e){}
    window.location.href='login_padrao_metalico.html'+(motivo==='inatividade'||motivo==='desligado'||motivo==='acesso'?'?motivo='+motivo:'');
  };


  // Modo privacidade (para gravar tela): oculta parte do CPF, do nome do cliente, do numero do processo e os valores.
  // Por padrao fica desligado e todos veem os dados completos. A escolha fica guardada neste navegador.
  var PRIV_CHAVE='saga_privacidade';
  var PRIV_NOMES='.nome-cliente,.cartao-nome,.card-nome,.pessoa-selecionada-nome,.ficha-titulo h1,.cli,.client-picker-row b,.client-picker-row strong,.item-mencao span,[data-saga-nome]';
  var _privLigado=false,_privObs=null,_privTimer=null;
  function privNome(t){
    var fora={da:1,das:1,de:1,di:1,'do':1,dos:1,e:1};
    var primeiro=true;
    return t.replace(/[A-Za-zÀ-ÿ]+/g,function(p){
      if(primeiro){primeiro=false;return p;}
      if(fora[p.toLowerCase()])return '';
      return p.charAt(0)+'.';
    }).replace(/\s{2,}/g,' ');
  }
  function privTexto(t){
    return t
      .replace(/\b(\d{3})\.\d{3}\.\d{3}-(\d{2})\b/g,'$1.•••.•••-$2')
      .replace(/\b\d+?(\d{2}-\d{2}\.\d{4}\.\d\.\d{2}\.)\d{4}\b/g,'•••••$1••••')
      .replace(/R\$\s?-?[\d.]+(,\d{2})?/g,'R$ •••••');
  }
  function privAplicar(raiz){
    var w=document.createTreeWalker(raiz||document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentElement;
      if(!p||/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)||p.isContentEditable)return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    var n;
    while((n=w.nextNode())){
      if(n.__sagaMasc!==undefined&&n.data===n.__sagaMasc)continue;
      var orig=n.data;
      var m=privTexto(orig);
      if(n.parentElement.closest(PRIV_NOMES))m=privNome(m);
      if(m!==orig){n.__sagaOrig=orig;n.__sagaMasc=m;n.data=m;}
      else{n.__sagaOrig=undefined;n.__sagaMasc=undefined;}
    }
  }
  function privRestaurar(){
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
    while((n=w.nextNode())){
      if(n.__sagaMasc!==undefined&&n.data===n.__sagaMasc)n.data=n.__sagaOrig;
      n.__sagaOrig=undefined;n.__sagaMasc=undefined;
    }
  }
  function privDefinir(ligar){
    _privLigado=!!ligar;
    try{localStorage.setItem(PRIV_CHAVE,_privLigado?'1':'0');}catch(e){}
    document.documentElement.classList.toggle('saga-privado',_privLigado);
    var b=document.getElementById('privBtn');
    if(b){b.classList.toggle('ativo',_privLigado);b.title=_privLigado?'Modo privacidade ligado: clique para mostrar os dados':'Ocultar dados dos clientes (para gravar tela)';}
    if(_privLigado){
      privAplicar();
      if(!_privObs){
        _privObs=new MutationObserver(function(){clearTimeout(_privTimer);_privTimer=setTimeout(function(){if(_privLigado)privAplicar();},30);});
        _privObs.observe(document.body,{childList:true,subtree:true,characterData:true});
      }
    }else{
      if(_privObs){_privObs.disconnect();_privObs=null;}
      privRestaurar();
    }
  }
  function ligarPrivacidade(){
    if(!document.getElementById('sagaPrivEstilo')){
      var st=document.createElement('style');st.id='sagaPrivEstilo';
      st.textContent='#privBtn .olho-fechado{display:none}#privBtn.ativo .olho-aberto{display:none}#privBtn.ativo .olho-fechado{display:inline}'
        +'#topbarSaga #privBtn.ativo{background:#c0392b !important;border-color:#c0392b !important}#topbarSaga #privBtn.ativo svg [stroke]{stroke:#fff !important}'
        +'html.saga-privado input:not([type=checkbox]):not([type=radio]):not([type=search]):not(:placeholder-shown){filter:blur(5px)}html.saga-privado #topbarSaga input{filter:none}html.saga-privado input:focus{filter:none}';
      document.head.appendChild(st);
    }
    var b=document.getElementById('privBtn');
    if(b)b.addEventListener('click',function(){privDefinir(!_privLigado);});
    var salvo='0';try{salvo=localStorage.getItem(PRIV_CHAVE)||'0';}catch(e){}
    privDefinir(salvo==='1');
  }


  // Contador de mensagens nao lidas do Chat: numero no item do menu lateral
  // e numero no titulo da aba do navegador. Atualiza na hora quando chega mensagem (tempo real).
  var _chatCanal=null,_chatTimer=null,_tituloOriginal=null;
  async function contarChat(){
    if(!global._sb||!_perfilAtual)return;
    try{
      var r=await global._sb.rpc('chat_nao_lidas');
      if(r.error||!Array.isArray(r.data))return;
      var total=r.data.reduce(function(s,x){return s+(x.qtd||0);},0);
      var b=document.getElementById('navBadgeChat');
      if(b){b.textContent=total>99?'99+':String(total);b.style.display=total>0?'':'none';}
      if(_tituloOriginal===null)_tituloOriginal=document.title.replace(/^\(\d+\+?\)\s*/,'');
      document.title=(total>0?'('+(total>99?'99+':total)+') ':'')+_tituloOriginal;
      document.dispatchEvent(new CustomEvent('saga-chat-nao-lidas',{detail:{total:total,porConversa:r.data||[]}}));
    }catch(e){}
  }
  // Itens do dia no menu lateral: compromissos de hoje (Agenda) e tarefas de hoje + atrasadas (Minhas Tarefas)
  async function contarDia(){
    if(!global._sb||!_perfilAtual)return;
    try{
      var r=await global._sb.rpc('resumo_do_dia');
      if(r.error||!r.data||typeof r.data!=='object')return;
      var d=r.data;
      var ag=document.getElementById('navBadgeAgenda');
      if(ag){var c=d.compromissos_hoje||0;ag.textContent=c>99?'99+':String(c);ag.style.display=c>0?'':'none';}
      var tf=document.getElementById('navBadgeTarefas');
      if(tf){
        var hoje=d.tarefas_hoje||0,atr=d.tarefas_atrasadas||0,tot=hoje+atr;
        tf.textContent=tot>99?'99+':String(tot);tf.style.display=tot>0?'':'none';
        tf.classList.toggle('atrasada',atr>0);
        tf.title=(hoje?hoje+' para hoje':'')+(hoje&&atr?' e ':'')+(atr?atr+' atrasada'+(atr>1?'s':''):'');
      }
    }catch(e){}
  }
  function agendarContagemChat(){clearTimeout(_chatTimer);_chatTimer=setTimeout(contarChat,400);}
  function ligarContadorChat(){
    if(!document.getElementById('sagaChatEstilo')){
      var st=document.createElement('style');st.id='sagaChatEstilo';
      st.textContent='#sidebarSaga .nav-badge-chat{margin-left:auto !important;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#e5484d !important;color:#fff !important;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,.25)}'
        +'#sidebarSaga .nav-badge-dia{background:#3b82f6 !important}#sidebarSaga .nav-badge-dia.atrasada{background:#e5484d !important}'
        +'';
      document.head.appendChild(st);
    }
    contarChat();
    if(global._sb&&!_chatCanal){
      _chatCanal=global._sb.channel('saga-chat-contador')
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_mensagens'},agendarContagemChat)
        .subscribe();
    }
    document.addEventListener('visibilitychange',function(){if(!document.hidden){agendarContagemChat();contarDia();contarNaoLidas();}});
    // Avisos do dia (tarefas de hoje, atrasadas, compromissos) entram no sino uma vez por dia
    if(global._sb&&_perfilAtual)global._sb.rpc('gerar_avisos_do_dia').then(function(){contarNaoLidas();},function(){});
    contarDia();
    setInterval(function(){contarChat();contarDia();contarNaoLidas();},60000);
  }


  // Permissoes aplicadas no menu e nas telas (a mesma regra do banco: perfil + excecoes individuais).
  // Basta ter UMA das permissoes da lista para ver a tela. Telas sem lista ficam liberadas.
  var PERMS_TELA={
    processos:['processos.visualizar'],
    agenda:['compromissos.visualizar'],
    tarefas:['tarefas.visualizar'],
    chat:['chat.usar'],
    ponto:['ponto.bater','ponto.visualizar_proprio','ponto.visualizar_equipe'],
    colaboradores:['colaboradores.visualizar','usuarios.convidar','usuarios.gerenciar_papeis'],
    dashboard:['dashboard.visualizar'],
    biblioteca:['biblioteca.visualizar'],
    financeiro:['financeiro.visualizar'],
    marketing:['campanhas.visualizar','materiais_marketing.visualizar'],
    permissoes:['permissoes.gerenciar']
  };
  var _minhasPermissoes=null;
  function podeVerTela(tela){
    var req=PERMS_TELA[tela];
    if(!req||!_minhasPermissoes)return true;
    return req.some(function(p){return _minhasPermissoes.indexOf(p)!==-1;});
  }
  // Usuario da sessao salva pelo Supabase neste navegador (leitura imediata, sem esperar a rede)
  function idSessaoLocal(){
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i);
        if(/^sb-.*-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k));return v&&v.user&&v.user.id||null;}
      }
    }catch(e){}
    return null;
  }
  function pintarMenuPermissoes(){
    document.querySelectorAll('#sidebarSaga .nav-item[data-tela]').forEach(function(it){
      it.classList.remove('perm-pendente');
      it.classList.toggle('sem-permissao',!podeVerTela(it.getAttribute('data-tela')));
    });
    document.querySelectorAll('#sidebarSaga .nav-section').forEach(function(sec){
      sec.classList.remove('perm-pendente');
      var el=sec.nextElementSibling,algum=false;
      while(el&&!el.classList.contains('nav-section')){if(el.classList.contains('nav-item')&&!el.classList.contains('sem-permissao'))algum=true;el=el.nextElementSibling;}
      sec.classList.toggle('sem-permissao',!algum);
    });
  }
  // Logo que o menu e desenhado: usa as permissoes guardadas da ultima vez (mesmo usuario).
  // Sem guardadas (primeiro acesso ou outro usuario), as telas com restricao ficam ocultas ate o banco responder.
  function prepararMenuPermissoes(){
    var uid=idSessaoLocal(),guardado=null;
    try{guardado=JSON.parse(localStorage.getItem('saga-permissoes')||'null');}catch(e){}
    if(uid&&guardado&&guardado.uid===uid&&Array.isArray(guardado.perms)){
      _minhasPermissoes=guardado.perms;
      pintarMenuPermissoes();
      return;
    }
    document.querySelectorAll('#sidebarSaga .nav-item[data-tela],#sidebarSaga .nav-section').forEach(function(el){
      var tela=el.getAttribute('data-tela');
      // Telas basicas (Processos, Agenda, Tarefas, Chat, Ponto) aparecem; as restritas esperam
      if(!tela||['processos','agenda','tarefas','chat','ponto'].indexOf(tela)===-1)el.classList.add('perm-pendente');
    });
    document.querySelectorAll('#sidebarSaga .nav-section').forEach(function(sec){
      if(/operac|comunic/i.test(sec.textContent))sec.classList.remove('perm-pendente');
    });
  }
  async function aplicarPermissoes(telaAtiva){
    if(!global._sb||!_perfilAtual)return;
    var ok=false;
    try{
      var r=await global._sb.rpc('minhas_permissoes');
      if(!r.error&&Array.isArray(r.data)){
        _minhasPermissoes=r.data;ok=true;
        try{localStorage.setItem('saga-permissoes',JSON.stringify({uid:idSessaoLocal(),perms:r.data}));}catch(e){}
      }
    }catch(e){}
    if(!ok&&!_minhasPermissoes){
      // Sem resposta do banco: mostra o menu completo (o banco continua bloqueando os dados)
      document.querySelectorAll('#sidebarSaga .perm-pendente').forEach(function(el){el.classList.remove('perm-pendente');});
      return;
    }
    pintarMenuPermissoes();
    // Tela aberta sem permissao (link direto ou favorito): bloqueia o conteudo
    if(telaAtiva&&!podeVerTela(telaAtiva))bloquearTela();
  }
  function bloquearTela(){
    if(document.getElementById('sagaSemAcesso'))return;
    var sb=document.getElementById('sidebarSaga');
    var esq=(sb&&window.innerWidth>760)?Math.max(0,sb.getBoundingClientRect().right):0;
    var primeira=document.querySelector('#sidebarSaga .nav-item[data-tela]:not(.sem-permissao)');
    var destino=primeira?(primeira.getAttribute('href')||(primeira.getAttribute('onclick')||'').replace(/^.*\('([^']+)'\).*$/,'$1')):'';
    var d=document.createElement('div');d.id='sagaSemAcesso';
    d.style.cssText='position:fixed;top:64px;right:0;bottom:0;left:'+esq+'px;z-index:1300;background:var(--navy-1,#e8ecf1);display:flex;align-items:center;justify-content:center;padding:24px;';
    d.innerHTML='<div style="max-width:420px;text-align:center;background:var(--panel,#fff);border:1px solid var(--border,#d5dbe4);border-radius:16px;padding:32px 28px;box-shadow:0 10px 30px rgba(0,0,0,.12)">'
      +'<div style="width:52px;height:52px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,#e5484d 14%,transparent);color:#e5484d"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" stroke-width="1.8"/></svg></div>'
      +'<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-weight:600;color:var(--text,#13233a);margin-bottom:6px">Sem acesso a esta tela</div>'
      +'<div style="font-size:12.5px;color:var(--muted,#4a586e);line-height:1.5;margin-bottom:18px">Seu perfil não tem permissão para abrir esta área. Se precisar, peça ao administrador para liberar.</div>'
      +(destino?'<a href="'+destino+'" style="display:inline-block;background:var(--gold,#1f3e6d);color:#fff;text-decoration:none;font-size:12.5px;font-weight:700;padding:10px 18px;border-radius:9px">Voltar ao início</a>':'')
      +'</div>';
    document.body.appendChild(d);
  }

  // Marca os blocos de conteudo da tela (tudo que nao e menu superior nem lateral)
  function marcarConteudo(){
    var molduras=[document.getElementById('sidebarSaga'),document.getElementById('topbarSaga')].filter(Boolean);
    function temMoldura(el){return molduras.some(function(m){return el===m||el.contains(m);});}
    (function percorrer(pai){
      Array.prototype.forEach.call(pai.children,function(el){
        if(/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)||molduras.indexOf(el)!==-1)return;
        if(el.id==='overlay'||el.id==='sagaSemAcesso')return;
        if(temMoldura(el))percorrer(el);
        else{var pos=getComputedStyle(el).position;if(pos!=='fixed')el.classList.add('saga-conteudo');}
      });
    })(document.body);
  }

  // Menus superior e lateral montados assim que a tela abre (sem esperar o banco):
  // a troca de tela nao pisca os menus. O carregar() so completa o que depende do banco.
  var _molduraMontada=false;
  function telaDoEndereco(){
    var arq=(location.pathname.split('/').pop()||'').toLowerCase(),achou='';
    document.querySelectorAll('#sidebarSaga .nav-item[data-tela]').forEach(function(el){
      var m=(el.getAttribute('href')||el.getAttribute('onclick')||'').match(/([^'\/]+\.html)/);
      if(m&&m[1].toLowerCase()===arq)achou=el.getAttribute('data-tela');
    });
    return achou;
  }
  // Cada item do menu vira um link (<a href>): clique normal troca de tela com a transicao;
  // Ctrl/Cmd+clique, clique do meio ou "Abrir em nova aba" abrem o sistema em outra aba do navegador
  function linksDoMenu(sb){
    sb.querySelectorAll('.nav-item[onclick]').forEach(function(el){
      var m=(el.getAttribute('onclick')||'').match(/sagaIrPara\('([^']+)'\)/);if(!m)return;
      var a=document.createElement('a');
      Array.prototype.forEach.call(el.attributes,function(at){if(at.name!=='onclick')a.setAttribute(at.name,at.value);});
      a.setAttribute('href',m[1]);a.innerHTML=el.innerHTML;
      el.parentNode.replaceChild(a,el);
    });
    if(sb.dataset.linksLigados)return;sb.dataset.linksLigados='1';
    sb.addEventListener('click',function(ev){
      var a=ev.target.closest('a.nav-item[href]');if(!a)return;
      if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.altKey||ev.button!==0)return; // deixa o navegador abrir em outra aba
      ev.preventDefault();global.sagaIrPara(a.getAttribute('href'));
    });
  }
  function montarMoldura(telaAtiva){
    var sb=document.getElementById('sidebarSaga'),tb=document.getElementById('topbarSaga');
    if(!sb&&!tb)return;
    if(!_molduraMontada){
      _molduraMontada=true;
      if(sb){sb.innerHTML=SIDEBAR_HTML;linksDoMenu(sb);prepararMenuPermissoes();}
      if(tb)tb.innerHTML=TOPBAR_HTML;
      try{var ini=localStorage.getItem('saga-iniciais');var avt=document.getElementById('avatarTop');if(ini&&avt)avt.textContent=ini;var ft=localStorage.getItem('saga-foto');if(ft)mostrarFotoAvatar(ft);}catch(e){}
      ligarTema();
      ligarPrivacidade();
      ligarHamburger();
    }
    var tela=telaAtiva||telaDoEndereco();
    if(tela){
      document.querySelectorAll('#sidebarSaga .nav-item.active').forEach(function(el){el.classList.remove('active');});
      var alvo=document.querySelector('#sidebarSaga [data-tela="'+tela+'"]');
      if(alvo)alvo.classList.add('active');
    }
    marcarConteudo();
    document.dispatchEvent(new CustomEvent('saga-ui-moldura'));
  }
  function montarMolduraCedo(){
    // So com login salvo neste navegador (sem login o saga_guard ja mandou para o login)
    if(!idSessaoLocal())return;
    try{montarMoldura('');}catch(e){}
  }
  if(document.getElementById('sidebarSaga')||document.getElementById('topbarSaga'))montarMolduraCedo();
  else document.addEventListener('DOMContentLoaded',montarMolduraCedo);

  async function carregar(telaAtiva){
    _telaAtual=telaAtiva||'';
    // Sem login valido: vai para o login sem mostrar nada da tela (saga_guard.js a mantem escondida)
    if(global._sb){
      try{
        var ses=await global._sb.auth.getSession();
        if(!ses.data||!ses.data.session){window.location.replace('login_padrao_metalico.html');return;}
      }catch(e){}
    }
    // Sessao parada alem do limite (ex.: computador ligado a noite toda): sai antes de montar a tela
    if(await verificarInatividade())return;
    // Horario e local de acesso (a tela continua escondida enquanto confere)
    if(!(await verificarAcesso(false)))return;
    registrarAtividade();
    ligarControleInatividade();
    montarMoldura(telaAtiva);
    ligarPresencaESino();
    ligarBuscaGlobal();
    marcarConteudo();
    await carregarPerfil();
    await aplicarPermissoes(telaAtiva);
    // Presenca e contador do sino carregam em paralelo e nao seguram a tela
    carregarPresenca();
    contarNaoLidas();
    ligarContadorChat();
    document.dispatchEvent(new CustomEvent('saga-ui-pronto',{detail:{telaAtiva:telaAtiva}}));
  }

  global.SagaUI={atualizarPerfil:function(){return carregarPerfil().then(contarNaoLidas);},carregar:carregar,podeVerTela:podeVerTela,atualizarChat:agendarContagemChat,contarAvisos:contarNaoLidas,recarregarPresenca:carregarPresenca,recarregarNotificacoes:carregarNotificacoes};
})(window);
