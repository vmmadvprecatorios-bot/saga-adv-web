/* Áreas e teses: seleção vinculada e manutenção exclusiva do administrador geral. */
(function(global){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ordenar=lista=>lista.slice().sort((a,b)=>(a.ordem??0)-(b.ordem??0)||a.nome.localeCompare(b.nome,'pt-BR'));
  function estilos(){
    if(document.getElementById('sagaTesesCss'))return;
    const s=document.createElement('style');s.id='sagaTesesCss';s.textContent=`
      .st-par{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;width:100%;min-width:0}.st-campo{min-width:0;font-size:12px}.st-label{display:block;margin-bottom:6px;color:var(--muted);font-size:10px;font-weight:700}
      .st-campo button,.st-editor button,.st-gestao button{font:inherit;cursor:pointer;transition:transform .15s;color:var(--text)}.st-campo button:active,.st-editor button:active,.st-gestao button:active{transform:scale(.96)}
      .st-trigger{display:flex;align-items:center;gap:8px;width:100%;min-height:36px;padding:8px 10px;border:1px solid var(--border-soft);border-radius:9px;background:var(--panel);text-align:left;box-sizing:border-box}.st-trigger span{min-width:0;overflow-wrap:anywhere}.st-trigger i{margin-left:auto;font-style:normal;color:var(--muted)}
      .st-menu{margin-top:5px;padding:4px;border:1px solid var(--border-soft);border-radius:10px;background:var(--panel-solid);animation:stMola .25s cubic-bezier(.2,1.4,.4,1)}.st-menu[hidden],.st-editor[hidden]{display:none}.st-opcoes{max-height:230px;overflow-y:auto;overscroll-behavior:contain}
      .st-linha{display:flex;gap:4px;align-items:center;min-width:0}.st-opcao,.st-lapis,.st-novo{border:0;border-radius:7px;background:transparent;padding:8px;text-align:left}.st-opcao{flex:1;min-width:0;overflow-wrap:anywhere}.st-opcao[aria-pressed=true]{font-weight:700;color:var(--gold)}.st-lapis{flex:0 0 auto}.st-novo{width:100%;color:var(--gold)!important}.st-opcao:hover,.st-lapis:hover,.st-novo:hover{background:color-mix(in srgb,var(--gold) 12%,transparent)}
      .st-editor{display:grid;gap:9px;padding:12px;margin-top:8px;border:1px solid var(--border-soft);border-radius:10px;background:var(--panel-solid);font-size:12px}.st-editor label{font:inherit;color:var(--muted)}.st-editor input[type=text]{width:100%;min-width:0;box-sizing:border-box;padding:9px;border:1px solid var(--border-soft);border-radius:7px;background:var(--panel);color:var(--text);font:inherit}.st-editor label.st-ativo{display:flex;align-items:center;gap:7px}.st-ativo input{width:auto!important}
      .st-acoes{display:flex;flex-wrap:wrap;gap:6px}.st-acoes button,.st-gestao>button{padding:7px 10px;border:1px solid var(--border-soft);border-radius:8px;background:var(--panel);font-size:11px}.st-erro{color:var(--danger);font-size:12px;overflow-wrap:anywhere}.st-gestao{display:grid;gap:12px;min-width:0}.st-grupo{padding:12px;border:1px solid var(--border-soft);border-radius:12px;background:var(--panel)}
      .st-registro{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 0;min-width:0}.st-registro>span{flex:1;min-width:90px;overflow-wrap:anywhere}.st-registro.st-inativo>span{text-decoration:line-through;opacity:.5}.st-teses{padding-left:12px;border-left:2px solid var(--border-soft)}.st-gestao[aria-busy=true] button{pointer-events:none;opacity:.5}
      @keyframes stMola{from{opacity:0;transform:translateY(-5px) scale(.98)}to{opacity:1;transform:none}}@media(max-width:600px){.st-par{grid-template-columns:minmax(0,1fr)}.st-teses{padding-left:8px}.st-registro .st-acoes{width:100%}}@media (min-resolution:100000dppx){.st-menu{animation:none}}
    `;document.head.appendChild(s);
  }
  // Menus em posição normal: expandem o conteúdo e acompanham a rolagem da janela.
  function menu(root,label,opcoes,valor,escolher,admin){
    root.classList.add('st-campo');root.innerHTML='<span class="st-label">'+esc(label)+'</span><button type="button" class="st-trigger" aria-expanded="false" aria-label="'+esc(label)+'"><span></span><i>▾</i></button><div class="st-menu" hidden><div class="st-opcoes" role="group" aria-label="'+esc(label)+'"></div><div class="st-fim"></div></div>';
    const btn=root.querySelector('button'),painel=root.querySelector('.st-menu');
    function fechar(){painel.hidden=true;btn.setAttribute('aria-expanded','false');}
    function atualizar(){btn.querySelector('span').textContent=valor().nome;}
    function abrir(){
      const atual=valor().id;
      root.querySelector('.st-opcoes').innerHTML=opcoes().map(e=>'<div class="st-linha"><button type="button" class="st-opcao" data-id="'+esc(e.id??'')+'" aria-pressed="'+(e.id===atual)+'">'+esc(e.nome)+'</button>'+(admin&&e.id&&e.id!=='*'?'<button type="button" class="st-lapis" data-id="'+esc(e.id)+'" aria-label="Editar '+esc(e.nome)+'">✎</button>':'')+'</div>').join('');
      root.querySelector('.st-fim').innerHTML=admin?'<button type="button" class="st-novo">+ Nova '+(label==='Tese'?'tese':'área')+'</button>':'';
      painel.hidden=false;btn.setAttribute('aria-expanded','true');
    }
    btn.onclick=()=>{if(painel.hidden)abrir();else fechar();};
    btn.onkeydown=e=>{
      if(e.key==='ArrowDown'){e.preventDefault();abrir();painel.querySelector('button')?.focus();}
      if(e.key==='Escape'&&!painel.hidden){e.preventDefault();e.stopPropagation();fechar();}
    };
    painel.onclick=e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.classList.contains('st-lapis')){admin(b.dataset.id);return;}
      if(b.classList.contains('st-novo')){admin(null);return;}
      escolher(b.dataset.id||null);fechar();atualizar();btn.focus({preventScroll:true});
    };
    painel.onkeydown=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fechar();btn.focus();}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();const bs=Array.from(painel.querySelectorAll('button')),i=bs.indexOf(document.activeElement);
        bs[Math.max(0,Math.min(bs.length-1,i+(e.key==='ArrowDown'?1:-1)))]?.focus();
      }
    };
    const fora=e=>{if(!root.contains(e.target))fechar();};document.addEventListener('click',fora);
    atualizar();return {atualizar,fechar,destruir:()=>document.removeEventListener('click',fora)};
  }
  function criar(o){
    let areas=[],teses=[],ocupado=false;const widgets=[],paineis=[],montados=new WeakMap();
    const area=id=>areas.find(a=>a.id===id)||null,tese=id=>teses.find(t=>t.id===id)||null;
    const todasAreas=()=>ordenar(areas),todasTeses=()=>ordenar(teses);
    function notificar(){
      widgets.slice().forEach(w=>{if(w.root.isConnected)w.atualizar();else w.destruir();});
      paineis.forEach(p=>{if(p.isConnected)renderGestao(p);});
      if(o.mudou)o.mudou();
    }
    async function carregar(){
      try{
        const r=await Promise.all([
          o.sb.from('areas_direito').select('id,nome,ativo,ordem').order('ordem').order('nome'),
          o.sb.from('teses').select('id,nome,descricao,cor,ativo,ordem,area_direito_id').order('ordem').order('nome')]);
        if(r[0].error||r[1].error)throw r[0].error||r[1].error;
        areas=r[0].data||[];teses=r[1].data||[];notificar();return true;
      }catch(e){if(o.erro)o.erro(e.message||'Não foi possível carregar as áreas e teses.');return false;}
    }
    async function gravar(tipo,item){
      if(!o.admin)throw new Error('Só o administrador geral cria ou altera áreas e teses.');
      const p={p_id:item.id||null,p_nome:item.nome.trim(),p_ativo:item.ativo!==false,p_ordem:item.ordem??null};
      if(tipo==='tese')p.p_area_id=item.area_direito_id||null;
      const r=await o.sb.rpc(tipo==='tese'?'tese_salvar':'area_direito_salvar',p);if(r.error)throw r.error;
      return r.data;
    }
    async function salvar(tipo,item){await gravar(tipo,item);if(!(await carregar()))throw new Error('Opção salva, mas não foi possível atualizar a lista. Recarregue a tela.');}
    async function mover(tipo,id,delta){
      const atual=tipo==='tese'?tese(id):area(id);
      const lista=tipo==='tese'?todasTeses().filter(t=>(t.area_direito_id||null)===(atual.area_direito_id||null)):todasAreas();
      const i=lista.findIndex(x=>x.id===id),destino=i+delta;if(i<0||destino<0||destino>=lista.length)return;
      [lista[i],lista[destino]]=[lista[destino],lista[i]];
      try{for(let k=0;k<lista.length;k++)await gravar(tipo,{...lista[k],ordem:k+1});}
      finally{await carregar();}
    }
    function editor(root,tipo,id,areaId){
      if(!o.admin||ocupado)return;
      const atual=(tipo==='tese'?tese(id):area(id))||{nome:'',ativo:true,area_direito_id:areaId==='*'?null:areaId};
      root.innerHTML='<div class="st-editor"><strong>'+(id?'Editar ':'Nova ')+(tipo==='tese'?'tese':'área')+'</strong><label>Nome<input class="st-nome" type="text" autocomplete="off"></label>'+(tipo==='tese'?'<div class="st-editor-area"></div>':'')+'<label class="st-ativo"><input type="checkbox"> Ativa na lista</label><div class="st-erro" role="alert"></div><div class="st-acoes"><button type="button" class="st-salvar">Salvar</button><button type="button" class="st-cancelar">Cancelar</button>'+(id?'<button type="button" class="st-subir">↑ Subir</button><button type="button" class="st-descer">↓ Descer</button>':'')+'</div></div>';
      const form=root.firstChild,input=form.querySelector('.st-nome');input.value=atual.nome;form.querySelector('input[type=checkbox]').checked=atual.ativo!==false;
      let areaEscolhida=atual.area_direito_id||null,areaMenu=null;
      if(tipo==='tese')areaMenu=menu(form.querySelector('.st-editor-area'),'Área do direito',()=>[{id:null,nome:'Sem área'}].concat(todasAreas().filter(a=>a.ativo||a.id===areaEscolhida)),()=>({id:areaEscolhida,nome:area(areaEscolhida)?.nome||'Sem área'}),id=>{areaEscolhida=id;},null);
      function fechar(){areaMenu?.destruir();root.replaceChildren();}
      async function executar(acao){
        if(ocupado)return;ocupado=true;form.querySelectorAll('button,input').forEach(b=>b.disabled=true);
        try{await acao();fechar();}
        catch(e){form.querySelector('.st-erro').textContent=e.message||'Não foi possível salvar.';}
        finally{ocupado=false;form.querySelectorAll('button,input').forEach(b=>b.disabled=false);}
      }
      form.querySelector('.st-cancelar').onclick=fechar;
      form.querySelector('.st-salvar').onclick=()=>{
        if(!input.value.trim()){form.querySelector('.st-erro').textContent='Informe o nome.';input.focus();return;}
        executar(()=>salvar(tipo,{...atual,id:id||null,nome:input.value,ativo:form.querySelector('input[type=checkbox]').checked,area_direito_id:areaEscolhida}));
      };
      if(id){form.querySelector('.st-subir').onclick=()=>executar(()=>mover(tipo,id,-1));form.querySelector('.st-descer').onclick=()=>executar(()=>mover(tipo,id,1));}
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();form.querySelector('.st-salvar').click();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fechar();}};
      input.focus({preventScroll:true});form.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
    function montar(root,op={}){
      montados.get(root)?.destruir();
      estilos();root.classList.add('st-par');
      root.innerHTML='<div class="st-area"></div><div class="st-tese"></div><div class="st-edicao" style="grid-column:1/-1"></div>';
      let teseId=null,areaId='*';
      const editorRoot=root.querySelector('.st-edicao');
      const ativo=t=>t.ativo===true&&(!t.area_direito_id||area(t.area_direito_id)?.ativo===true);
      function valor(){return {areaId,teseId};}
      function mudou(){atualizar();if(op.mudou)op.mudou(valor());}
      function editar(tipo,id){a.fechar();t.fechar();editor(editorRoot,tipo,id,areaId);}
      const a=menu(root.querySelector('.st-area'),'Área do direito',()=>[{id:'*',nome:op.filtro?'Todas as áreas':'Escolha a área'},{id:null,nome:'Sem área'}].concat(todasAreas().filter(a=>a.ativo===true)),()=>({id:areaId,nome:areaId==='*'?(op.filtro?'Todas as áreas':'Escolha a área'):area(areaId)?.nome||'Sem área'}),id=>{
        areaId=id;const te=tese(teseId);
        if(te&&(te.area_direito_id||null)!==areaId&&!(op.permitirAreaAvulsa&&!te.area_direito_id))teseId=null;
        mudou();
      },o.admin&&!op.filtro?id=>editar('area',id):null);
      const t=menu(root.querySelector('.st-tese'),'Tese',()=>[{id:null,nome:op.filtro?'Todas as teses':'Escolha a tese'}].concat(todasTeses().filter(te=>ativo(te)&&(areaId==='*'||(te.area_direito_id||null)===areaId))),()=>({id:teseId,nome:tese(teseId)?.nome||(op.filtro?'Todas as teses':'Escolha a tese')}),id=>{
        teseId=id;if(id)areaId=tese(id)?.area_direito_id||null;mudou();
      },o.admin&&!op.filtro?id=>editar('tese',id):null);
      const ti=document.createElement('input'),ai=document.createElement('input');ti.type=ai.type='hidden';if(op.teseInputId)ti.id=op.teseInputId;if(op.areaInputId)ai.id=op.areaInputId;root.append(ti,ai);
      function atualizar(){
        // A classificação atual acompanha a tese; opções inativas já usadas conservam o nome.
        if(tese(teseId)?.area_direito_id)areaId=tese(teseId).area_direito_id;
        a.atualizar();t.atualizar();ti.value=teseId||'';ai.value=areaId==='*'?'':areaId||'';
      }
      function definir(v={}){teseId=v.teseId||null;areaId=v.areaId===undefined?'*':v.areaId;atualizar();a.fechar();t.fechar();}
      const w={root,valor,definir,atualizar,destruir:()=>{a.destruir();t.destruir();const i=widgets.indexOf(w);if(i>=0)widgets.splice(i,1);}};
      widgets.push(w);montados.set(root,w);definir(op);return w;
    }
    function renderGestao(root){
      if(!o.admin){root.replaceChildren();return;}
      root.classList.add('st-gestao');
      function linha(tipo,e){return '<div class="st-registro'+(e.ativo?'':' st-inativo')+'" data-tipo="'+tipo+'" data-id="'+esc(e.id)+'"><span>'+esc(e.nome)+'</span><div class="st-acoes"><button type="button" data-acao="editar">'+(tipo==='tese'?'Editar / mudar área':'Renomear')+'</button><button type="button" data-acao="subir" aria-label="Subir '+esc(e.nome)+'">↑</button><button type="button" data-acao="descer" aria-label="Descer '+esc(e.nome)+'">↓</button><button type="button" data-acao="ativo">'+(e.ativo?'Desativar':'Reativar')+'</button></div></div>';}
      root.innerHTML='<button type="button" data-nova-area>+ Nova área</button><div class="st-erro" role="alert"></div>'+todasAreas().concat([{id:null,nome:'Sem área'}]).map(a=>'<section class="st-grupo" data-area="'+esc(a.id||'')+'">'+(a.id?linha('area',a):'<h3>Sem área</h3>')+'<div class="st-teses">'+todasTeses().filter(t=>(t.area_direito_id||null)===a.id).map(t=>linha('tese',t)).join('')+'<div class="st-acoes"><button type="button" data-nova-tese>+ Nova tese</button></div></div></section>').join('')+'<div class="st-gestao-editor"></div>';
      root.onclick=async ev=>{
        const b=ev.target.closest('button');if(!b||ocupado||b.closest('.st-editor'))return;
        const ed=root.querySelector('.st-gestao-editor'),row=b.closest('[data-tipo]'),tipo=row?.dataset.tipo,id=row?.dataset.id,e=tipo==='tese'?tese(id):area(id);
        if(b.hasAttribute('data-nova-area')){editor(ed,'area',null,null);return;}
        if(b.hasAttribute('data-nova-tese')){editor(ed,'tese',null,b.closest('[data-area]').dataset.area||null);return;}
        if(b.dataset.acao==='editar'){editor(ed,tipo,id,null);return;}
        if(!e)return;ocupado=true;root.setAttribute('aria-busy','true');
        try{if(b.dataset.acao==='ativo')await salvar(tipo,{...e,ativo:!e.ativo});else await mover(tipo,id,b.dataset.acao==='subir'?-1:1);}
        catch(err){root.querySelector('.st-erro').textContent=err.message||'Não foi possível salvar.';}
        finally{ocupado=false;root.removeAttribute('aria-busy');}
      };
    }
    function gerenciar(root){if(!paineis.includes(root))paineis.push(root);renderGestao(root);}
    function texto(teseId,areaId){const t=tese(teseId),a=area(t?.area_direito_id||areaId);return (a?a.nome+' · ':'')+(t?.nome||'Tese indisponível');}
    estilos();return {carregar,montar,gerenciar,editor,salvar,mover,area,tese,todasAreas,todasTeses,texto};
  }
  global.SagaTeses={criar};
})(window);
