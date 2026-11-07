/* Catálogo de etiquetas de tarefas. Não acessa o banco até criar().carregar(). */
(function(global){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function cor(v){return /^#[0-9a-f]{6}$/i.test(v||'')?v:'#64748b';}
  function selo(e){return e?'<span class="se-tag" style="--c:'+cor(e.cor)+'">'+esc(e.nome)+'</span>':'';}
  function estilos(){
    if(document.getElementById('sagaEtiquetasCss'))return;
    var s=document.createElement('style');s.id='sagaEtiquetasCss';
    s.textContent=`
      .se-tag{display:inline-block;max-width:100%;box-sizing:border-box;padding:3px 7px;border-radius:6px;background:color-mix(in srgb,var(--c) 13%,transparent);color:var(--c);font-size:10px;font-weight:700;line-height:1.4;overflow-wrap:anywhere;vertical-align:middle}
      .se-campo{min-width:0;width:100%;font-size:12px}.se-campo button{font:inherit;color:var(--text);cursor:pointer;transition:transform .15s}.se-campo button:active{transform:scale(.97)}
      .se-botao{display:flex;align-items:center;gap:8px;width:100%;min-height:36px;padding:7px 10px;border:1px solid var(--border-soft);border-radius:9px;background:var(--panel-2,var(--panel));text-align:left;box-sizing:border-box}
      .se-botao[aria-expanded=true]{border-color:var(--gold)}.se-botao>span:nth-child(2){min-width:0;overflow-wrap:anywhere}.se-seta{margin-left:auto;color:var(--muted)}
      .se-bola{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--c,var(--muted));flex:0 0 auto}
      .se-menu{margin-top:5px;padding:4px;border:1px solid var(--border-soft);border-radius:10px;background:var(--panel-solid,var(--panel));animation:seAbrir .28s cubic-bezier(.2,1.4,.4,1)}
      .se-menu[hidden],.se-editor[hidden]{display:none}.se-lista{max-height:220px;overflow-y:auto;overscroll-behavior:contain}.se-linha{display:flex;align-items:center;gap:3px;min-width:0}
      .se-opcao,.se-nova,.se-editar{display:flex;align-items:center;gap:9px;padding:9px;border:0;border-radius:7px;background:transparent;text-align:left}
      .se-opcao{flex:1;min-width:0;overflow-wrap:anywhere}.se-opcao[aria-pressed=true]{font-weight:700}.se-nova{width:100%;color:var(--gold)!important}.se-editar{flex:0 0 auto}
      .se-opcao:hover,.se-editar:hover,.se-nova:hover,.se-campo button:focus-visible{background:color-mix(in srgb,var(--gold) 12%,transparent);outline:1px solid var(--gold)}
      .se-editor{padding:9px;display:grid;gap:8px;border-top:1px solid var(--border-soft)}.se-editor label{display:block;font:inherit;color:var(--muted)}
      .se-editor input[type=text]{width:100%;min-width:0;box-sizing:border-box;background:var(--panel);color:var(--text);border:1px solid var(--border-soft);border-radius:7px;padding:8px;font:inherit}
      .se-editor input[type=color]{width:52px;height:32px;max-width:100%;padding:2px;border:1px solid var(--border-soft);border-radius:6px;background:var(--panel)}
      .se-editor label.se-ativo{display:flex;align-items:center;gap:6px}.se-editor .se-ativo input{width:auto}.se-acoes{display:flex;gap:6px;flex-wrap:wrap}.se-acoes button{border:1px solid var(--border-soft);border-radius:7px;padding:7px 10px;background:var(--panel)}
      .se-erro{color:var(--danger);font-size:11px;overflow-wrap:anywhere}.se-previa{margin-top:6px}.se-campo button:disabled{cursor:default;opacity:.65}
      @keyframes seAbrir{from{opacity:0;transform:translateY(-5px) scale(.98)}to{opacity:1;transform:none}}
      @media (min-resolution:100000dppx){.se-menu{animation:none}}
    `;
    document.head.appendChild(s);
  }
  function criar(o){
    var itens=[],widgets=[];
    // 09/11: o mesmo menu serve para outras listas do catálogo (ex.: categoria do lançamento no Financeiro)
    var CAT=o.categoria||'tarefa';
    var TX=Object.assign({campo:'Etiqueta',vazio:'Sem etiqueta',nova:'+ Nova etiqueta',editar:'Editar etiqueta',novaT:'Nova etiqueta',salvar:'Salvar etiqueta',erro:'Não foi possível salvar a etiqueta.',carregar:'Não foi possível carregar as etiquetas.'},o.textos||{});
    async function carregar(){
      try{
        var r=await o.sb.from('etiquetas_catalogo').select('id,nome,cor,ativo,ordem').eq('categoria',CAT).order('ordem').order('nome');
        if(r.error)throw r.error;
        itens=r.data||[];
        widgets.forEach(function(w){w.atualizar();});
        return true;
      }catch(e){
        if(o.reserva)itens=o.reserva;
        if(o.erro)o.erro(TX.carregar);
        return false;
      }
    }
    function montar(root,op){
      estilos();root.classList.add('se-campo');
      root.innerHTML='<button type="button" class="se-botao" aria-label="'+TX.campo+'" aria-expanded="false"><span class="se-bola"></span><span></span><span class="se-seta">▾</span></button>'+
        '<div class="se-menu" hidden><div class="se-lista" role="group" aria-label="Etiquetas"></div><div class="se-admin"></div><div class="se-editor" hidden></div></div><div class="se-previa"></div>';
      var btn=root.querySelector('.se-botao'),menu=root.querySelector('.se-menu'),lista=root.querySelector('.se-lista'),editor=root.querySelector('.se-editor');
      var ocupado=false;
      function permitido(){return !op.podeEditar||op.podeEditar();}
      function fechar(){if(ocupado)return;menu.hidden=true;editor.hidden=true;btn.setAttribute('aria-expanded','false');}
      function atualizar(){
        var e=op.valor();btn.querySelector('.se-bola').style.setProperty('--c',cor(e&&e.cor));
        btn.children[1].textContent=e?e.nome:TX.vazio;btn.disabled=!permitido();
        root.querySelector('.se-previa').innerHTML=selo(e);
      }
      function renderMenu(){
        var atual=op.valor();
        lista.innerHTML='<div class="se-linha"><button type="button" class="se-opcao" data-sem aria-pressed="'+(!atual)+'"><span class="se-bola"></span>'+TX.vazio+'</button></div>'+
          itens.filter(function(e){return e.ativo===true;}).map(function(e){return '<div class="se-linha"><button type="button" class="se-opcao" data-id="'+esc(e.id)+'" aria-pressed="'+!!(atual&&(atual.id===e.id||(!atual.id&&atual.nome===e.nome)))+'"><span class="se-bola" style="--c:'+cor(e.cor)+'"></span>'+esc(e.nome)+'</button>'+
            (o.admin&&!e.reserva?'<button type="button" class="se-editar" data-id="'+esc(e.id)+'" aria-label="Editar '+esc(e.nome)+'" title="Editar etiqueta">✎</button>':'')+'</div>';}).join('');
        root.querySelector('.se-admin').innerHTML=o.admin?'<button type="button" class="se-nova">'+TX.nova+'</button>':'';
        // A etiqueta inativa permanece no selo, sem voltar às opções de escolha.
      }
      function abrir(){if(!permitido()||ocupado)return;renderMenu();editor.hidden=true;menu.hidden=false;btn.setAttribute('aria-expanded','true');
        // 09/11: dentro de janelas, o menu aparece inteiro (rola a janela até o fim do menu)
        try{requestAnimationFrame(function(){var r=menu.getBoundingClientRect();if(r.bottom>innerHeight-8)menu.scrollIntoView({block:'nearest',behavior:(localStorage.getItem('saga-movimento')==='reduzido'?'auto':'smooth')});});}catch(e){}}
      function editar(e){
        if(!o.admin||!permitido())return;
        editor.hidden=false;
        editor.innerHTML='<strong>'+(e?TX.editar:TX.novaT)+'</strong><label>Nome (até 40 caracteres)<input class="se-nome" type="text" maxlength="40" autocomplete="off"></label><label>Cor <input class="se-cor" type="color"></label>'+
          (e?'<label class="se-ativo"><input type="checkbox" checked>Mostrar na lista</label>':'')+'<div class="se-erro" role="alert"></div><div class="se-acoes"><button type="button" class="se-salvar">'+TX.salvar+'</button><button type="button" class="se-cancelar">Cancelar</button></div>';
        editor.querySelector('.se-nome').value=e?e.nome:'';
        editor.querySelector('.se-cor').value=cor(e?e.cor:'#4b8af5');
        editor.querySelector('.se-cancelar').onclick=function(){editor.hidden=true;};
        editor.querySelector('.se-salvar').onclick=async function(){
          if(ocupado)return;
          var nome=editor.querySelector('.se-nome').value.trim(),msg=editor.querySelector('.se-erro');
          if(!nome||Array.from(nome).length>40){msg.textContent='Informe um nome de até 40 caracteres.';return;}
          ocupado=true;editor.querySelectorAll('button,input').forEach(function(b){b.disabled=true;});
          try{
            var p={p_id:e?e.id:null,p_nome:nome,p_cor:editor.querySelector('.se-cor').value,p_ativo:e?editor.querySelector('.se-ativo input').checked:true};
            var r=o.salvar?await o.salvar(p):await o.sb.rpc('etiqueta_tarefa_salvar',p);if(r&&r.error)throw r.error;
            var ok=await carregar();
            if(!ok){msg.textContent='Etiqueta salva. Feche e abra a tela para atualizar a lista.';return;}
            if(o.alterou)o.alterou(e,p);
            if(op.alterou)op.alterou(e,p);
            atualizar();renderMenu();editor.hidden=true;
          }catch(err){msg.textContent=err.message||TX.erro;}
          finally{ocupado=false;editor.querySelectorAll('button,input').forEach(function(b){b.disabled=false;});}
        };
        editor.querySelector('.se-nome').focus();
        editor.scrollIntoView({block:'nearest',behavior:'smooth'});
      }
      btn.onclick=function(){if(menu.hidden)abrir();else fechar();};
      btn.onkeydown=function(e){if(e.key==='ArrowDown'){e.preventDefault();abrir();lista.querySelector('button').focus();}};
      menu.onclick=function(ev){
        if(ocupado||!permitido())return;
        var b=ev.target.closest('button');if(!b)return;
        var e=itens.find(function(x){return x.id===b.dataset.id;});
        if(b.classList.contains('se-editar'))editar(e);
        else if(b.classList.contains('se-nova'))editar(null);
        else if(b.classList.contains('se-opcao')){op.escolher(e||null);atualizar();fechar();btn.focus({preventScroll:true});}
      };
      menu.onkeydown=function(e){
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fechar();btn.focus({preventScroll:true});}
        if(e.target.closest('.se-editor'))return;
        var bs=Array.from(menu.querySelectorAll('.se-lista button,.se-nova')),i=bs.indexOf(document.activeElement);
        if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();bs[Math.max(0,Math.min(bs.length-1,i+(e.key==='ArrowDown'?1:-1)))].focus();}
      };
      // Fecha após o clique: recolher no pointerdown deslocaria os botões abaixo do menu antes de acioná-los.
      document.addEventListener('click',function(e){if(!root.contains(e.target))fechar();});
      var w={atualizar:atualizar,fechar:fechar};widgets.push(w);atualizar();return w;
    }
    return {carregar:carregar,montar:montar,todas:function(){return itens;},porId:function(id){return itens.find(function(e){return e.id===id;})||null;}};
  }
  estilos();global.SagaEtiquetas={criar:criar,selo:selo,cor:cor};
})(window);
