/* Lista, Resumido e Kanban compartilham consultas paginadas e filtros no servidor. */
window.SagaLista = (function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const h = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const tipos = ['texto','numero','moeda','porcentagem','data','sim_nao','opcao','usuario','link'];
  const somenteLeitura = ['processo.fase','processo.criado_em','processo.atualizado_em'];
  const campos = {'pessoa.nome':'nome','pessoa.cpf':'cpf','pessoa.uf':'uf','pessoa.situacao_vital':'situacao_vital','pessoa.telefone':'telefone','pessoa.email':'email','processo.numero':'numero','processo.area':'area_id','processo.tese':'tese_id','processo.status':'status_id','processo.fase':'fase','processo.responsavel':'responsavel_id','processo.captador':'captador_id','processo.situacao_acao':'situacao_acao_id','processo.valor_causa':'valor_causa','processo.valor_precatorio':'valor_precatorio','processo.criado_em':'criado_em','processo.atualizado_em':'atualizado_em'};
  const rotulos = {'processo.area':'area','processo.tese':'tese','processo.status':'status','processo.responsavel':'responsavel','processo.captador':'captador','processo.situacao_acao':'situacao_acao'};
  const enumerados = Object.keys(rotulos).concat('pessoa.situacao_vital');
  let ready = false, tela = 'juridico', cols = [], rows = [], total = 0, shown = 50;
  let config = {}, visoes = [], gerenciar = false, serial = 0, groups = [], charts = [];
  let busy = false, editing = false, activeDialog;
  function padrao() { return {colunas:[], filtros:[], ordem:[], kanban_coluna:null, por_pagina:50}; }
  function erro(e) { showToast(e.message || 'Não foi possível concluir. Tente novamente.', 'error'); }
  async function rpc(nome, args) { const r = await _sb.rpc(nome, args); if (r.error) throw r.error; return r.data; }
  async function query(q) { const r = await q; if (r.error) throw r.error; return r.data || []; }
  function isEnum(c) { return c.tipo === 'opcao' || c.tipo === 'usuario' || enumerados.includes(c.campo_sistema); }
  function valor(r, c) { return c.campo_sistema ? r[campos[c.campo_sistema]] : (r.campos || {})[c.id]; }
  function sigiloso(r) { return r.sigilo && !state.permissoes.editar_dados; }
  function editavel(r,c) { return state.permissoes.editar && !sigiloso(r) && !somenteLeitura.includes(c.campo_sistema); }
  function urlSegura(url) { try { const u = new URL(url); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } }
  function nomeValor(c, v, r) {
    if (v == null || v === '') return '';
    if (rotulos[c.campo_sistema] && r) return r[rotulos[c.campo_sistema]] || String(v);
    if (c.tipo === 'sim_nao') return v === true ? 'Sim' : 'Não';
    if (c.tipo === 'usuario') return (state.responsaveis.find(u => String(u.id) === String(v)) || {}).nome_completo || String(v);
    if (c.tipo === 'opcao') return ((c.opcoes || []).find(o => String(o.id) === String(v)) || {}).nome || String(v);
    if (c.tipo === 'moeda') return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
    if (c.tipo === 'porcentagem') return Number(v).toLocaleString('pt-BR') + '%';
    if (c.tipo === 'numero') return Number(v).toLocaleString('pt-BR');
    if (c.tipo === 'data') return String(v).slice(0,10).split('-').reverse().join('/');
    return String(v);
  }
  function escopoCols() { return cols.filter(c => c.ativo && (c.escopo === 'ambos' || c.escopo === tela)); }
  function pref(c) { let p = config.colunas.find(x => x.id === c.id); if (!p) { p = {id:c.id,oculta:false,largura:180}; config.colunas.push(p); } return p; }
  function visiveis() {
    const base = escopoCols(), nomes = base.find(c => c.campo_sistema === 'pessoa.nome');
    const ordem = config.colunas.map(c => c.id);
    base.sort((a,b) => (ordem.includes(a.id) ? ordem.indexOf(a.id) : 10000 + a.ordem) - (ordem.includes(b.id) ? ordem.indexOf(b.id) : 10000 + b.ordem));
    return (nomes ? [nomes] : []).concat(base.filter(c => c !== nomes && !pref(c).oculta));
  }
  function filtros() {
    const f = clone(config.filtros || []);
    if (state.filtroArea !== '*') f.push({coluna:'processo.area',op:state.filtroArea?'igual':'vazio',valor:state.filtroArea});
    if (state.filtroTese) f.push({coluna:'processo.tese',op:'igual',valor:state.filtroTese.id});
    [['filtroStatus','processo.status'],['filtroResponsavel','processo.responsavel']].forEach(([s,c]) => {
      const v=state[s]; if (v) f.push({coluna:c,op:v.sem?'vazio':v.ids?'em':'igual',valor:v.ids||v.id});
    });
    if (state.filtroPeriodoDe) f.push({coluna:'processo.criado_em',op:'maior_igual',valor:state.filtroPeriodoDe});
    if (state.filtroPeriodoAte) f.push({coluna:'processo.criado_em',op:'menor_igual',valor:state.filtroPeriodoAte});
    return f;
  }
  function parametros(extra) { return Object.assign({p_tela:tela,p_filtros:filtros(),p_ordem:clone(config.ordem),p_busca:state.busca.trim(),p_limite:50,p_inicio:0},extra); }
  function parametrosGrupo(coluna) { return {p_tela:tela,p_coluna:coluna,p_filtros:filtros(),p_busca:state.busca.trim()}; }
  function clearLegacy() {
    state.filtroArea='*'; state.filtroTese=state.filtroStatus=state.filtroResponsavel=null;
    state.filtroPeriodoDe=state.filtroPeriodoAte=null; state.faseLista=state.faseKanbanAtiva=FASE_TODAS;
    state.buscaKanban=''; $('buscaKanban').value=''; $('inputPeriodoDe').value=''; $('inputPeriodoAte').value='';
  }
  function count() {
    const n = state.view === 'kanban' ? groups.reduce((n,g)=>n+g.rows.length,0) : Math.min(shown,rows.length);
    $('contagem').textContent = n + ' de ' + total + (tela === 'captacao' ? ' fichas da Captação' : ' processos do Jurídico');
    $('lxCount').textContent = n + ' de ' + total;
    $('lxMore').disabled = busy || n >= total || state.view === 'kanban';
    $('lxSize').value = config.por_pagina;
  }
  function setBusy(value) { busy=value; $('lxRoot').setAttribute('aria-busy',String(value)); $('lxStatus').textContent=value?'Carregando...':''; count(); }
  async function load(append, preserve) {
    if (!ready) return;
    editing=false;
    if (!state.permissoes.visualizar) { rows=[];total=0;groups=[];render();$('lxStatus').textContent='Você não tem permissão para ver processos.';return; }
    const retained=preserve?{loaded:rows.length,shown,top:$('lxGrid').scrollTop,left:$('lxGrid').scrollLeft}:null;
    const token=++serial, args=parametros({p_inicio:append?rows.length:0});
    setBusy(true); $('lxRetry').hidden=true;
    if (!append) { rows=[]; total=0; groups=[]; shown=config.por_pagina==='todos'?50:Number(config.por_pagina)||50; if(!retained)render(); }
    try {
      if (state.view === 'kanban') {
        const c=kanbanCol();
        if (!c) { $('kanbanView').textContent='Nenhuma coluna disponível para organizar.';return; }
        const data=await rpc('lista_grupos',parametrosGrupo(c.id)); if(token!==serial)return;
        groups=(data||[]).map(g=>Object.assign({},g,{rows:[],loading:false}));
        total=groups.reduce((n,g)=>n+Number(g.total),0); renderKanban();
        // Quatro consultas simultâneas, sempre lotes de 50 por grupo.
        let cursor=0;
        await Promise.all(Array.from({length:Math.min(4,groups.length)},async()=>{
          while(cursor<groups.length && token===serial) { const i=cursor++; await loadGroup(i,token,true); }
        }));
      } else {
        const data=await rpc('lista_buscar',args); if(token!==serial)return;
        total=Number(data.total)||0;rows=append?rows.concat(data.linhas||[]):data.linhas||[];
        const all=config.por_pagina==='todos';
        while(rows.length<(all?total:retained?Math.min(retained.loaded,total):0)){
          const next=await rpc('lista_buscar',parametros({p_inicio:rows.length}));if(token!==serial)return;
          if(!(next.linhas||[]).length)throw new Error('A leitura da lista ficou incompleta. Tente novamente.');rows=rows.concat(next.linhas);total=Number(next.total)||0;
          $('lxStatus').textContent='Carregando '+rows.length+' de '+total+'...';
        }
        if(state.view==='resumido'&&rows.length){
          const ids=(append?data.linhas||[]:rows).map(r=>r.id),map=new Map(rows.map(r=>[r.id,r]));
          for(let start=0;start<ids.length;start+=50){
            const dates=await query(_sb.from('processos').select('id,data_inicio,data_prazo').in('id',ids.slice(start,start+50)));
            if(token!==serial)return;
            dates.forEach(d=>{const r=map.get(d.id);if(r)Object.assign(r,d);});
          }
        }
        if(append)shown=Math.min(rows.length,shown+50);
        if(retained)shown=Math.min(retained.shown,rows.length);
        if(all)shown=rows.length;
        render();
        if(retained){$('lxGrid').scrollTop=retained.top;$('lxGrid').scrollLeft=retained.left;}
      }
      if(token===serial) await loadCharts(token);
    } catch(e) { if(token===serial) { erro(e);$('lxStatus').textContent='Não foi possível carregar a lista.';$('lxRetry').hidden=false; } }
    finally { if(token===serial) { busy=false;$('lxRoot').setAttribute('aria-busy','false');if($('lxRetry').hidden)$('lxStatus').textContent='';count();renderChips(); } }
  }
  async function more() {
    if(busy)return;
    if(shown+50<=rows.length||rows.length>=total) { shown=Math.min(rows.length,shown+50);render();return; }
    await load(true);
  }
  function renderChips() {
    renderTagsAtivas();
    const root=$('lxChips');root.replaceChildren();
    config.filtros.forEach((f,i)=>{
      const c=cols.find(c=>c.id===f.coluna||c.campo_sistema===f.coluna);
      const btn=document.createElement('button');btn.className='tag-filtro';
      btn.textContent=(f.coluna==='processo.captador'&&f.valor===state.meuInternoId?'Minhas fichas':(c?c.nome:f.coluna)+': '+f.op+' '+(Array.isArray(f.valor)?f.valor.map(v=>c?nomeValor(c,v):v).join(', '):c?nomeValor(c,f.valor):f.valor||''))+' ×';
      btn.title='Remover filtro';btn.onclick=()=>{config.filtros.splice(i,1);load();};root.append(btn);
    });
    if(config.ordem.length) { const b=document.createElement('button');b.className='tag-filtro';b.textContent='Ordenação ('+config.ordem.length+') ×';b.onclick=()=>{config.ordem=[];load();};root.append(b); }
  }
  function cellHTML(r,c) {
    if(sigiloso(r))return '<span aria-label="Dado sigiloso">••••••</span>';
    const v=valor(r,c);
    if(c.tipo==='link')return (Array.isArray(v)?v:[]).map(l=>urlSegura(l.url)?'<a href="'+h(urlSegura(l.url))+'" target="_blank" rel="noopener noreferrer">'+h(l.texto||l.url)+'</a>':'').join(' · ')+(editavel(r,c)?'<button class="lx-pencil" aria-label="Editar links">✎</button>':'');
    if(c.campo_sistema==='pessoa.nome')return '<a href="ficha_cliente_padrao_metalico_FINAL.html?processo_id='+encodeURIComponent(r.id)+'">'+h(nomeValor(c,v,r))+'</a>';
    const o=(c.opcoes||[]).find(o=>String(o.id)===String(v));
    const cor=o&&o.cor|| (c.campo_sistema==='processo.status'?r.status_cor:c.campo_sistema==='processo.situacao_acao'?r.situacao_acao_cor:null);
    return '<span'+(cor&&CSS.supports('color',cor)?' class="lx-option" style="--lx-color:'+h(cor)+'"':'')+'>'+h(nomeValor(c,v,r))+'</span>';
  }
  function renderGrid() {
    const cs=visiveis(), list=rows.slice(0,shown);
    const root=$('lxGrid'),scrollTop=root.scrollTop,scrollLeft=root.scrollLeft;
    const virtual=list.length>150,start=virtual?Math.max(0,Math.floor(scrollTop/40)-12):0,end=virtual?Math.min(list.length,start+80):list.length;
    root.replaceChildren();
    const table=document.createElement('table');table.className='lx-table';table.setAttribute('role','grid');table.setAttribute('aria-label','Lista de processos');table.setAttribute('aria-rowcount',total+1);
    const cg=document.createElement('colgroup');cs.forEach(c=>{const el=document.createElement('col');el.style.width=Math.max(110,Math.min(600,pref(c).largura||180))+'px';cg.append(el);});table.append(cg);
    const head=table.createTHead().insertRow();
    cs.forEach((c,i)=>{
      const th=document.createElement('th');th.scope='col';
      const order=config.ordem.find(o=>o.coluna===c.id);th.setAttribute('aria-sort',order?(order.direcao==='asc'?'ascending':'descending'):'none');
      th.innerHTML='<button class="lx-head" aria-label="Menu: '+h(c.nome)+'">'+h(c.nome)+(order?(order.direcao==='asc'?' ↑':' ↓'):'')+' ▾</button><span class="lx-resize" title="Arraste para ajustar a largura"></span>';
      th.querySelector('button').onclick=()=>headerMenu(c);
      th.querySelector('.lx-resize').onpointerdown=e=>{
        e.preventDefault();const start=e.clientX,w=th.offsetWidth,handle=e.currentTarget;handle.setPointerCapture(e.pointerId);
        handle.onpointermove=ev=>{pref(c).largura=Math.max(110,Math.min(600,w+ev.clientX-start));cg.children[i].style.width=pref(c).largura+'px';};
        handle.onpointerup=()=>{handle.onpointermove=null;};
      };head.append(th);
    });
    const body=table.createTBody();
    function spacer(height){if(!height)return;const tr=body.insertRow(),td=tr.insertCell();tr.setAttribute('aria-hidden','true');td.colSpan=cs.length;td.style.cssText='height:'+height+'px;padding:0;border:0;position:static';}
    spacer(start*40);
    list.slice(start,end).forEach((r,index)=>{
      const ri=index+start;
      const tr=body.insertRow();tr.setAttribute('aria-rowindex',ri+2);
      cs.forEach((c,ci)=>{
        const td=tr.insertCell();td.tabIndex=ri===0&&ci===0?0:-1;td.dataset.row=ri;td.dataset.col=ci;td.innerHTML=cellHTML(r,c);td.setAttribute('aria-label',c.nome+': '+(sigiloso(r)?'Dado sigiloso':c.tipo==='link'?'Links':nomeValor(c,valor(r,c),r)));
        let openTimer;
        const nameLink=c.campo_sistema==='pessoa.nome'&&td.querySelector('a');
        if(nameLink)nameLink.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;e.preventDefault();clearTimeout(openTimer);openTimer=setTimeout(()=>verFicha(r.id),250);};
        td.ondblclick=e=>{e.preventDefault();clearTimeout(openTimer);editCell(td,r,c);};
        const pencil=td.querySelector('.lx-pencil');if(pencil)pencil.onclick=()=>editCell(td,r,c);
        td.onkeydown=e=>{
          if(editing)return;
          if(e.key==='Enter'){e.preventDefault();editCell(td,r,c);return;}
          const delta={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0],Tab:[0,e.shiftKey?-1:1]}[e.key];
          if(delta){e.preventDefault();focusCell(ri+delta[0],ci+delta[1]);}
        };
      });
    });
    spacer((list.length-end)*40);
    root.append(table);
    root.scrollTop=scrollTop;root.scrollLeft=scrollLeft;
    let frame;
    root.onscroll=()=>{if(!virtual||editing)return;const next=Math.max(0,Math.floor(root.scrollTop/40)-12);if(Math.abs(next-start)>12){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>renderGrid());}};
    if(!list.length) {const empty=document.createElement('p');empty.textContent='Nenhum processo encontrado.';root.append(empty);}
  }
  function focusCell(ri,ci) {
    const n=visiveis().length;if(ci<0){ri--;ci=n-1;}if(ci>=n){ri++;ci=0;}
    if(ri<0||ri>=Math.min(shown,rows.length))return;
    let td=$('lxGrid').querySelector('[data-row="'+ri+'"][data-col="'+ci+'"]');
    if(!td){$('lxGrid').scrollTop=ri*40;renderGrid();td=$('lxGrid').querySelector('[data-row="'+ri+'"][data-col="'+ci+'"]');}
    if(td){$('lxGrid').querySelectorAll('td[tabindex="0"]').forEach(t=>t.tabIndex=-1);td.tabIndex=0;td.focus();}
  }
  async function choices(c) {
    if(c.tipo==='opcao'&&!c.campo_sistema)return (c.opcoes||[]).filter(o=>o.ativo!==false).sort((a,b)=>(a.ordem||0)-(b.ordem||0)).map(o=>({id:o.id,nome:o.nome,cor:o.cor}));
    if(c.campo_sistema==='pessoa.situacao_vital')return [{id:'vivo',nome:'Vivo'},{id:'falecido',nome:'Falecido'}];
    if(c.tipo==='usuario'||['processo.responsavel','processo.captador'].includes(c.campo_sistema))return state.responsaveis.map(u=>({id:u.id,nome:u.nome_completo}));
    if(c.campo_sistema==='processo.status')return state.statusList;
    if(c.campo_sistema==='processo.tese')return state.teses;
    if(c.campo_sistema==='processo.area'&&catalogoTeses)return catalogoTeses.todasAreas();
    const gs=await rpc('lista_grupos',{p_tela:tela,p_coluna:c.id,p_filtros:[],p_busca:''});
    return (gs||[]).filter(g=>g.valor!=null).map(g=>({id:g.valor,nome:g.rotulo}));
  }
  async function save(r,c,v) {
    if(!editavel(r,c))throw new Error('Você não tem permissão para editar esta célula.');
    return rpc('lista_salvar_celula',{p_processo_id:r.id,p_coluna_id:c.id,p_valor:v});
  }
  async function editCell(td,r,c) {
    if(editing||!editavel(r,c))return;
    editing=true;const old=td.innerHTML, v=valor(r,c),ri=Number(td.dataset.row),ci=Number(td.dataset.col);
    try {
      let options=isEnum(c)?await choices(c):null;
      if(!td.isConnected){editing=false;return;}
      td.replaceChildren();const box=document.createElement('div');box.className='lx-editor';
      let input, getValue;
      if(c.tipo==='link') {
        input=document.createElement('textarea');input.setAttribute('aria-label','Links: um por linha, texto | https://endereço');input.placeholder='Texto | https://endereço (um por linha)';input.value=(Array.isArray(v)?v:[]).map(l=>(l.texto||'')+' | '+l.url).join('\n');
        getValue=()=>{if(!input.value.trim())return null;return input.value.trim().split('\n').map(line=>{const k=line.indexOf('|'),texto=k<0?'':line.slice(0,k).trim(),url=(k<0?line:line.slice(k+1)).trim();if(!urlSegura(url))throw new Error('Use um endereço completo começando com https:// ou http://.');return {url,texto};});};
      } else if(options) {
        input=document.createElement('select');input.innerHTML='<option value="">Sem valor</option>'+options.map(o=>'<option value="'+h(o.id)+'"'+(o.cor&&CSS.supports('color',o.cor)?' style="color:'+h(o.cor)+'"':'')+'>'+h(o.nome)+'</option>').join('');
        if(v!=null&&!options.some(o=>String(o.id)===String(v))){const op=new Option(nomeValor(c,v,r)+' (desativada)',v);op.disabled=true;input.add(op);}
        input.value=v==null?'':v;getValue=()=>input.value||null;
      } else if(c.tipo==='sim_nao') {
        input=document.createElement('input');input.type='checkbox';input.setAttribute('role','switch');input.checked=v===true;getValue=()=>input.checked;
      } else {
        input=document.createElement('input');input.type=c.tipo==='data'?'date':'text';
        if(['numero','moeda','porcentagem'].includes(c.tipo))input.inputMode='decimal';
        input.value=v==null?'':c.tipo==='data'?String(v).slice(0,10):['numero','moeda','porcentagem'].includes(c.tipo)?String(v).replace('.',','):v;
        getValue=()=>input.value.trim()||null;
      }
      input.setAttribute('aria-label','Editar '+c.nome);box.append(input);
      const yes=document.createElement('button');yes.textContent='✓';yes.title='Salvar';box.append(yes);
      const no=document.createElement('button');no.textContent='×';no.title='Cancelar';box.append(no);td.append(box);input.focus();
      let saving=false;
      const cancel=()=>{if(saving)return;editing=false;renderGrid();focusCell(ri,ci);};no.onclick=cancel;
      const commit=async move=>{
        if(saving)return;saving=true;box.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
        try{await save(r,c,getValue());editing=false;await load(false,true);focusCell(ri,ci+(move||0));}
        catch(e){editing=false;renderGrid();focusCell(ri,ci);erro(e);}
      };yes.onclick=()=>commit(0);
      box.addEventListener('focusout',e=>{
        if(box.contains(e.relatedTarget)||saving)return;
        queueMicrotask(()=>{if(editing&&box.isConnected&&!box.contains(document.activeElement))commit(0);});
      });
      input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();cancel();}else if(e.key==='Tab'||e.key==='Enter'&&c.tipo!=='link'){e.preventDefault();e.stopPropagation();commit(e.key==='Tab'?(e.shiftKey?-1:1):0);}};
    }catch(e){editing=false;td.innerHTML=old;erro(e);}
  }
  function dialog(title) {
    if(activeDialog)activeDialog.remove();
    const overlay=document.createElement('div');overlay.className='modal-overlay lx-modal';overlay.style.display='flex';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);
    overlay.innerHTML='<div class="modal lx-dialog"><div class="modal-head"><h3>'+h(title)+'</h3><button class="modal-close" aria-label="Fechar">×</button></div><div class="modal-body"></div></div>';
    const previous=document.activeElement;const close=()=>{overlay.remove();if(activeDialog===overlay)activeDialog=null;if(previous&&previous.isConnected)previous.focus();};
    overlay.querySelector('button').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close();};
    overlay.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const els=[...overlay.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden);const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
    document.body.append(overlay);activeDialog=overlay;overlay.querySelector('button').focus();return {body:overlay.querySelector('.modal-body'),close};
  }
  function button(root,text,fn) { const b=document.createElement('button');b.type='button';b.className='btn-secondary';b.textContent=text;b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){erro(e);}finally{b.disabled=false;}};root.append(b);return b; }
  function field(root,label,type,value) { const l=document.createElement('label');l.className='lx-field';l.textContent=label;const el=document.createElement(type==='select'?'select':'input');if(type!=='select')el.type=type;el.setAttribute('aria-label',label);el.value=value==null?'':value;l.append(el);root.append(l);return el; }
  function optionSelect(root,label,options,value) {const el=field(root,label,'select');el.innerHTML=options.map(o=>'<option value="'+h(o.id)+'">'+h(o.nome)+'</option>').join('');if(value!=null)el.value=value;return el;}
  async function headerMenu(c) {
    const d=dialog(c.nome),actions=document.createElement('div');actions.className='lx-actions';d.body.append(actions);
    ['asc','desc'].forEach(dir=>button(actions,dir==='asc'?'Ordenar crescente':'Ordenar decrescente',()=>{config.ordem=config.ordem.filter(o=>o.coluna!==c.id);config.ordem.unshift({coluna:c.id,direcao:dir});d.close();return load();}));
    if(c.campo_sistema!=='pessoa.nome')button(actions,'Ocultar coluna',()=>{pref(c).oculta=true;d.close();render();});
    [-40,40].forEach(n=>button(actions,n<0?'Estreitar':'Alargar',()=>{pref(c).largura=Math.max(110,Math.min(600,(pref(c).largura||180)+n));renderGrid();}));
    const ops=['igual','diferente','vazio','nao_vazio'];
    if(c.tipo==='data')ops.push('menor','maior','entre','atrasados');
    else if(['numero','moeda','porcentagem'].includes(c.tipo))ops.push('maior','menor','maior_igual','menor_igual','entre');
    else if(isEnum(c))ops.push('em','nao_em');
    else if(c.tipo!=='sim_nao')ops.push('contem','nao_contem');
    const nomes={igual:'Igual a',diferente:'Diferente de',vazio:'Vazio',nao_vazio:'Preenchido',menor:c.tipo==='data'?'Antes de':'Menor que',maior:c.tipo==='data'?'Depois de':'Maior que',entre:'Entre',atrasados:'Atrasados',em:'Uma das opções',nao_em:'Nenhuma das opções',contem:'Contém',nao_contem:'Não contém',maior_igual:'Maior ou igual',menor_igual:'Menor ou igual'};
    const op=optionSelect(d.body,'Filtrar',ops.map(id=>({id,nome:nomes[id]})),isEnum(c)?'em':c.tipo==='texto'?'contem':'igual');
    const values=document.createElement('div');d.body.append(values);let read;
    async function draw() {
      values.replaceChildren();
      if(['vazio','nao_vazio','atrasados'].includes(op.value)){read=()=>null;return;}
      if(isEnum(c)) {
        const opts=await choices(c);if(!values.isConnected)return;
        const search=field(values,'Buscar opção','search');const list=document.createElement('div');list.className='lx-checks';values.append(list);
        opts.forEach(o=>{const l=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.value=o.id;l.append(check,document.createTextNode(o.nome));list.append(l);});
        search.oninput=()=>list.querySelectorAll('label').forEach(l=>l.hidden=!l.textContent.toLocaleLowerCase('pt-BR').includes(search.value.toLocaleLowerCase('pt-BR')));
        read=()=>{const vals=[...list.querySelectorAll('input:checked')].map(i=>i.value);if(!vals.length)throw new Error('Escolha pelo menos uma opção.');return ['em','nao_em'].includes(op.value)?vals:vals[0];};
      } else if(c.tipo==='sim_nao') {const i=optionSelect(values,'Valor',[{id:'true',nome:'Sim'},{id:'false',nome:'Não'}]);read=()=>i.value==='true';}
      else {const a=field(values,'Valor',c.tipo==='data'?'date':'text'),b=op.value==='entre'?field(values,'Até',c.tipo==='data'?'date':'text'):null;read=()=>{if(!a.value||b&&!b.value)throw new Error('Preencha o valor do filtro.');const parse=v=>['numero','moeda','porcentagem'].includes(c.tipo)?parseNumero(v):v;return b?[parse(a.value),parse(b.value)]:parse(a.value);};}
    }
    op.onchange=()=>draw().catch(erro);await draw();
    button(d.body,'Aplicar filtro',()=>{const o=op.value;config.filtros.push({coluna:c.id,op:o==='atrasados'?'menor':o,valor:o==='atrasados'?'hoje':read()});d.close();return load();});
  }
  function parseNumero(v) {const n=Number(String(v).replace(/R\$|%|\s/g,'').replace(/\./g,'').replace(',','.'));if(!Number.isFinite(n))throw new Error('Informe um número válido.');return n;}
  function groupable(c) {return ['opcao','usuario','sim_nao'].includes(c.tipo)||enumerados.includes(c.campo_sistema)&&c.campo_sistema!=='pessoa.situacao_vital';}
  function kanbanCol() {const cs=escopoCols().filter(groupable);return cs.find(c=>c.id===config.kanban_coluna)||cs.find(c=>tela==='captacao'?c.campo_sistema==='processo.status':c.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='status da peticao')||cs.find(c=>c.campo_sistema==='processo.situacao_acao')||cs[0];}
  function syncKanbanSelect() {const c=kanbanCol();$('lxGroup').innerHTML=escopoCols().filter(groupable).map(c=>'<option value="'+h(c.id)+'">'+h(c.nome)+'</option>').join('');if(c)$('lxGroup').value=c.id;}
  function groupFilter(c,g) {return {coluna:c.id,op:g.valor==null||g.valor===''?'vazio':'igual',valor:g.valor};}
  async function loadGroup(i,token,initial) {
    const g=groups[i],c=kanbanCol();if(!g||g.loading||!c)return;
    g.loading=true;
    try {
      const data=await rpc('lista_buscar',parametros({p_filtros:filtros().concat(groupFilter(c,g)),p_inicio:g.rows.length}));
      if(token!==serial||groups[i]!==g)return;
      g.error=false;g.rows=g.rows.concat(data.linhas||[]);g.total=Number(data.total)||0;
      renderGroup(i);count();
    }catch(e){if(token===serial){g.error=true;renderGroup(i);if(!initial)erro(e);else throw e;}}
    finally{g.loading=false;if(token===serial)renderGroup(i);}
  }
  function cardHTML(r) {
    const safe=sigiloso(r),name=safe?'••••••':r.nome;
    return '<div class="card-kanban" data-processo-id="'+h(r.id)+'" draggable="'+(state.permissoes.editar&&!safe)+'" tabindex="0"><div class="card-nome">'+h(name)+'</div><div>'+h(safe?'':r.tese||'Sem tese')+'</div><div class="card-cpf">'+h(safe?'':r.numero||r.cpf||'')+'</div>'+providenciaHtml(r)+(state.permissoes.editar&&!safe?'<button class="btn-acao lx-move" title="Mover cartão">Mover</button>':'')+'</div>';
  }
  function renderGroup(i) {
    const g=groups[i],el=$('kanbanView').querySelector('[data-lx-group="'+i+'"]');if(!g||!el)return;
    el.querySelector('.coluna-contagem').textContent=g.rows.length+' de '+g.total;
    const body=el.querySelector('.coluna-corpo');body.innerHTML=g.rows.map(cardHTML).join('');
    const moreBtn=el.querySelector('.lx-group-more');moreBtn.hidden=g.rows.length>=g.total;moreBtn.disabled=g.loading;moreBtn.textContent=g.error?'Tentar novamente':'+50';
    body.querySelectorAll('.card-kanban').forEach(card=>{
      const row=g.rows.find(r=>String(r.id)===card.dataset.processoId);
      card.onclick=e=>{if(!e.target.closest('button,a'))verFicha(row.id);};card.onkeydown=e=>{if(e.key==='Enter'&&e.target===card)verFicha(row.id);};
      const move=card.querySelector('.lx-move');if(move)move.onclick=()=>moveDialog(row);
    });
    state.processos=groups.flatMap(g=>g.rows).map(legacyRow);carregarProvidenciasVisiveis();
  }
  function renderKanban() {
    const kv=$('kanbanView');if(kv._limparArraste)kv._limparArraste();kv.innerHTML='<div class="quadro-kanban">'+groups.map((g,i)=>'<div class="coluna-kanban" data-lx-group="'+i+'"><div class="coluna-header"><span class="coluna-titulo">'+h(g.rotulo||'Sem valor')+'</span><span class="coluna-contagem">0 de '+Number(g.total)+'</span></div><div class="coluna-corpo" data-status-id="'+i+'"></div><button class="btn-secondary lx-group-more">+50</button></div>').join('')+'</div>';
    groups.forEach((g,i)=>{const el=kv.querySelector('[data-lx-group="'+i+'"]');el.querySelector('button').onclick=()=>loadGroup(i,serial,false);renderGroup(i);});
    if(state.permissoes.editar)ativarArrasteKanban(kv);
  }
  async function moveDialog(row) {
    const c=kanbanCol(),d=dialog('Mover cartão');const opts=await choices(c);
    if(!d.body.isConnected)return;
    const sel=optionSelect(d.body,c.nome,[{id:'',nome:'Sem valor'}].concat(c.tipo==='sim_nao'?[{id:'true',nome:'Sim'},{id:'false',nome:'Não'}]:opts),valor(row,c));
    button(d.body,'Mover',async()=>{await save(row,c,sel.value===''?null:c.tipo==='sim_nao'?sel.value==='true':sel.value);d.close();await load();});
  }
  async function move(processoId,groupIndex,colunaDestino,proximoIrmao) {
    const row=groups.flatMap(g=>g.rows).find(r=>String(r.id)===String(processoId)),g=groups[Number(groupIndex)],c=kanbanCol();
    if(!row||!g||!c||!editavel(row,c))return;
    if(String(valor(row,c)??'')===String(g.valor??''))return;
    const card=$('kanbanView').querySelector('[data-processo-id="'+CSS.escape(String(processoId))+'"]');
    if(card){const body=colunaDestino.querySelector('.coluna-corpo');body.insertBefore(card,proximoIrmao&&proximoIrmao.parentNode===body?proximoIrmao:null);card.animate([{transform:'scale(.96)'},{transform:'scale(1.03)'},{transform:'scale(1)'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'});}
    try{await save(row,c,g.valor===''?null:g.valor);await load();}catch(e){erro(e);renderKanban();}
  }
  function legacyRow(r) {
    // O resumo mantém o desenho existente e o selo da próxima providência.
    const mask=sigiloso(r);return Object.assign({},r,{numero_processo_cnj:mask?'':r.numero,data_inicio:r.data_inicio||r.criado_em&&r.criado_em.slice(0,10),valor_causa:mask?null:r.valor_causa,pessoa:{nome_completo:mask?'••••••':r.nome,cpf:mask?'':r.cpf,uf:r.uf,telefone_whatsapp:mask?'':r.telefone},tese:{id:r.tese_id,nome:r.tese},status:{id:r.status_id,nome:r.status,cor:r.status_cor,fase:r.fase},responsavel:{id:r.responsavel_id,nome_completo:r.responsavel},area_direito_id:r.area_id});
  }
  function render() {
    $('lxGrid').hidden=state.view!=='lista';$('listaView').style.display=state.view==='resumido'?'block':'none';$('kanbanView').style.display=state.view==='kanban'?'block':'none';$('lxGroupWrap').hidden=state.view!=='kanban';$('lxMore').hidden=state.view==='kanban';
    ['lista','resumido','kanban'].forEach(v=>$(v==='lista'?'btnViewLista':v==='resumido'?'btnViewResumido':'btnViewKanban').classList.toggle('ativo',state.view===v));
    if(state.view==='lista')renderGrid();
    if(state.view==='resumido') {
      state.processos=rows.slice(0,shown).map(legacyRow);state.totalProcessos=total;renderLista();
      document.querySelectorAll('#cartoesMobile .cartao-cliente').forEach((el,i)=>{el.style.borderLeft='3px solid '+(rows[i].status_cor&&CSS.supports('color',rows[i].status_cor)?rows[i].status_cor:'var(--gold)');});
    }
    count();renderChips();
  }
  async function loadCharts(token) {
    const defs=[['fase','Por fase','processo.fase'],['status','Por status','processo.status'],['area','Por área do direito','processo.area'],['responsavel','Por responsável','processo.responsavel']];
    try{
      const data=await Promise.all(defs.map(d=>rpc('lista_grupos',parametrosGrupo(d[2]))));if(token!==serial)return;
      charts=defs.map((d,i)=>({k:d[0],titulo:d[1],itens:(data[i]||[]).map((g,k)=>({v:String(g.valor??''),nome:g.rotulo||'Sem valor',n:Number(g.total)||0,cor:'var(--g'+(k%8+1)+')',valores:[g.valor],ativa:filtros().some(f=>f.coluna===d[2]&&String(f.valor)===String(g.valor))}))}));
      state.erroGraficos=false;renderGraficosProcessos();
    }catch(e){if(token===serial){state.erroGraficos=true;renderGraficosProcessos();erro(e);}}
  }
  function chartClick(key,value) {
    const campo={fase:'processo.fase',status:'processo.status',area:'processo.area',responsavel:'processo.responsavel'}[key];
    const index=config.filtros.findIndex(f=>f.coluna===campo&&String(f.valor??'')===value);
    if(index>=0)config.filtros.splice(index,1);else config.filtros.push({coluna:campo,op:value===''?'vazio':'igual',valor:value||null});load();
  }
  async function readViews(token) {const data=await query(_sb.from('lista_visoes').select('id,nome,config,padrao').eq('usuario_id',state.meuInternoId).eq('tela',tela).order('nome'));if(token===undefined||token===serial)visoes=data;}
  function applyConfig(c) {
    const base=padrao();config=Object.assign(base,clone(c||{}));
    if(!Array.isArray(config.colunas))config.colunas=[];if(!Array.isArray(config.filtros))config.filtros=[];if(!Array.isArray(config.ordem))config.ordem=[];
    if(![5,10,20,50,'todos'].includes(config.por_pagina))config.por_pagina=50;
    clearLegacy();syncKanbanSelect();
    sincronizarUI();
  }
  async function scope(value) {
    tela=value;const token=++serial;clearLegacy();config=padrao();
    $('lxTela').value=tela;
    document.querySelector('.header-pagina h1').textContent=tela==='captacao'?'Fichas da Captação':'Lista do Jurídico';
    localStorage.setItem('saga-lista-tela-'+state.meuInternoId,tela);
    const url=new URL(location.href);url.searchParams.set('tela',tela);history.replaceState(null,'',url);
    await readViews(token);if(token!==serial)return;
    applyConfig((visoes.find(v=>v.padrao)||{}).config);
    if(tela==='captacao'&&!visoes.some(v=>v.padrao))config.filtros.push({coluna:'processo.captador',op:'igual',valor:state.meuInternoId});
    await load();
  }
  function currentConfig() {return Object.assign(clone(config),{filtros:filtros(),kanban_coluna:(kanbanCol()||{}).id||null});}
  async function saveView(nome,defaultView) {
    const data={usuario_id:state.meuInternoId,tela,nome,config:currentConfig(),padrao:defaultView};
    const existing=defaultView?visoes.find(v=>v.padrao):null;
    await query(existing?_sb.from('lista_visoes').update(data).eq('id',existing.id).eq('usuario_id',state.meuInternoId):_sb.from('lista_visoes').insert(data));
    await readViews();showToast('Visão salva só para você.','success');
  }
  function viewDialog() {
    const d=dialog('Minha visão');
    button(d.body,'Salvar como padrão',async()=>{await saveView('Minha visão padrão',true);d.close();});
    const name=field(d.body,'Nome da visão','text');
    button(d.body,'Salvar com nome',async()=>{if(!name.value.trim())throw new Error('Dê um nome à visão.');await saveView(name.value.trim(),false);d.close();});
    if(visoes.length){const select=optionSelect(d.body,'Escolher visão salva',visoes.map(v=>({id:v.id,nome:v.nome})));button(d.body,'Abrir visão',()=>{applyConfig(visoes.find(v=>String(v.id)===select.value).config);d.close();return load();});}
    button(d.body,'Voltar ao padrão do escritório',()=>{applyConfig(padrao());d.close();return load();});
    const list=document.createElement('div');list.className='lx-checks';d.body.append(list);
    escopoCols().forEach(c=>{const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=c.campo_sistema==='pessoa.nome'||!pref(c).oculta;input.disabled=c.campo_sistema==='pessoa.nome';l.append(input,document.createTextNode(c.nome));input.onchange=()=>{pref(c).oculta=!input.checked;render();};list.append(l);});
    const order=document.createElement('div');order.className='lx-manage-list';d.body.append(order);
    const draw=()=>{order.replaceChildren();escopoCols().sort((a,b)=>config.colunas.findIndex(x=>x.id===a.id)-config.colunas.findIndex(x=>x.id===b.id)).forEach(c=>{const row=document.createElement('div');row.textContent=c.nome;row.draggable=true;row.dataset.id=c.id;order.append(row);});makeSortable(order,()=>{const ids=[...order.children].map(el=>el.dataset.id);config.colunas.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));render();});};draw();
  }
  function makeSortable(root,changed) {
    let drag;
    const syncButtons=()=>[...root.children].forEach((row,i)=>{const up=row.querySelector('[data-lx-up]'),down=row.querySelector('[data-lx-down]');if(up)up.disabled=i===0;if(down)down.disabled=i===root.children.length-1;});
    [...root.children].forEach(row=>{
      const up=button(row,'↑',()=>{if(row.previousElementSibling)root.insertBefore(row,row.previousElementSibling);changed();syncButtons();});up.dataset.lxUp='';up.title='Mover para cima';up.setAttribute('aria-label','Mover para cima');
      const down=button(row,'↓',()=>{if(row.nextElementSibling)root.insertBefore(row.nextElementSibling,row);changed();syncButtons();});down.dataset.lxDown='';down.title='Mover para baixo';down.setAttribute('aria-label','Mover para baixo');
    });syncButtons();
    root.ondragstart=e=>{drag=e.target.closest('[data-id]');if(!drag)return;e.dataTransfer.setData('text/plain',drag.dataset.id);};
    root.ondragover=e=>{const target=e.target.closest('[data-id]');if(!drag||!target||drag===target)return;e.preventDefault();root.insertBefore(drag,e.clientY<target.getBoundingClientRect().top+target.offsetHeight/2?target:target.nextSibling);};
    root.ondrop=e=>{if(!drag)return;e.preventDefault();drag=null;changed();syncButtons();};
    root.ondragend=()=>{drag=null;};
  }
  async function refreshCols() {cols=await query(_sb.from('lista_colunas').select('id,nome,tipo,escopo,campo_sistema,opcoes,ordem,ativo').order('ordem'));if($('lxGroup'))syncKanbanSelect();}
  async function persistColumn(c) {return rpc('lista_coluna_salvar',{p_id:c.id||null,p_nome:c.nome,p_tipo:c.tipo,p_escopo:c.escopo,p_opcoes:c.opcoes||[],p_ativo:c.ativo!==false});}
  function manageDialog() {
    if(!gerenciar)return;
    const d=dialog('Gerenciar colunas');const intro=document.createElement('p');intro.textContent='Arraste para mudar a ordem do escritório. Ao remover, os dados ficam guardados. As colunas do sistema só podem ser renomeadas, reordenadas e ocultadas.';d.body.append(intro);
    const list=document.createElement('div');list.className='lx-manage-list';d.body.append(list);
    cols.filter(c=>c.ativo).forEach(c=>{
      const row=document.createElement('div');row.draggable=true;row.dataset.id=c.id;row.append(document.createTextNode('⠿ '+c.nome));
      button(row,'Editar',()=>columnDialog(c));
      button(row,c.campo_sistema?'Ocultar para mim':'Remover',async()=>{
        if(c.campo_sistema){pref(c).oculta=true;render();return;}
        if(!confirm('Remover a coluna '+c.nome+'? Os dados ficam guardados.'))return;
        await persistColumn(Object.assign({},c,{ativo:false}));await refreshCols();d.close();manageDialog();await load();
      });list.append(row);
    });
    makeSortable(list,()=>{});
    button(d.body,'Salvar ordem do escritório',async()=>{const ids=[...list.children].map(el=>el.dataset.id).concat(cols.filter(c=>!c.ativo).map(c=>c.id));await rpc('lista_colunas_reordenar',{p_ids:ids});await refreshCols();d.close();await load();});
    button(d.body,'Criar coluna',()=>columnDialog(null));
  }
  function columnDialog(original) {
    if(!gerenciar)return;
    const c=clone(original||{id:null,nome:'',tipo:'texto',escopo:tela,ativo:true,opcoes:[]}),d=dialog(original?'Editar coluna':'Criar coluna');
    const name=field(d.body,'Nome','text',c.nome);
    const type=optionSelect(d.body,'Tipo',tipos.map(id=>({id,nome:{sim_nao:'Sim ou não',opcao:'Opção',usuario:'Usuário',numero:'Número'}[id]||id})),c.tipo);type.disabled=!!original;
    const scope=optionSelect(d.body,'Onde aparece',[{id:'ambos',nome:'Jurídico e Captação'},{id:'juridico',nome:'Jurídico'},{id:'captacao',nome:'Captação'}],c.escopo);scope.disabled=!!c.campo_sistema;
    const options=document.createElement('div');d.body.append(options);
    function drawOptions() {
      options.replaceChildren();options.hidden=type.value!=='opcao'||!!c.campo_sistema;if(options.hidden)return;
      const list=document.createElement('div');list.className='lx-manage-list';options.append(list);
      c.opcoes.forEach((o,i)=>{
        const row=document.createElement('div');row.draggable=true;row.dataset.id=String(i);
        const n=field(row,'Opção','text',o.nome);n.oninput=()=>o.nome=n.value;
        const color=field(row,'Cor','color',/^#[0-9a-f]{6}$/i.test(o.cor||'')?o.cor:'#4b8af5');color.oninput=()=>o.cor=color.value;
        button(row,o.ativo===false?'Reativar':'Remover',()=>{o.ativo=o.ativo===false;drawOptions();});list.append(row);
      });
      makeSortable(list,()=>{c.opcoes=[...list.children].map(el=>c.opcoes[Number(el.dataset.id)]);drawOptions();});
      button(options,'Adicionar opção',()=>{c.opcoes.push({nome:'Nova opção',cor:'#4b8af5',ativo:true});drawOptions();});
    }
    type.onchange=drawOptions;drawOptions();
    button(d.body,'Salvar coluna',async()=>{
      if(!name.value.trim())throw new Error('Informe o nome da coluna.');
      if(c.opcoes.some(o=>!o.nome.trim()))throw new Error('Informe o nome de todas as opções.');
      Object.assign(c,{nome:name.value.trim(),tipo:type.value,escopo:scope.value});await persistColumn(c);await refreshCols();d.close();await load();manageDialog();
    });
  }
  function installUI() {
    const style=document.createElement('style');style.textContent=`
      .conteudo{min-width:0;max-width:100%}.lx-toolbar,.lx-actions,.lx-footer,#lxChips{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}
      #lxRoot [hidden],.lx-toolbar [hidden],.lx-footer [hidden]{display:none!important}
      .lx-toolbar select,.lx-footer select,.lx-field input,.lx-field select,.lx-editor input,.lx-editor select,.lx-editor textarea{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:7px;padding:8px;max-width:100%}
      #lxGrid{width:100%;max-width:100%;overflow:auto;max-height:65vh;border:1px solid var(--border);border-radius:10px;overscroll-behavior:contain}
      #lxGrid[hidden],#lxGroupWrap[hidden]{display:none}.lx-table{table-layout:fixed;width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;font-size:12px}
      .lx-table th,.lx-table td{box-sizing:border-box;min-width:110px;height:40px;padding:8px;border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--panel)}
      .lx-table tr:nth-child(even) td{background:var(--panel-2)}.lx-table th{position:sticky;top:0;z-index:3;background:var(--panel-2)}.lx-table th:first-child,.lx-table td:first-child{position:sticky;left:0;z-index:2}.lx-table th:first-child{z-index:4}
      .lx-table td:focus{outline:2px solid var(--gold);outline-offset:-2px}.lx-head{border:0;background:none;color:var(--text);font:inherit;cursor:pointer;max-width:100%;text-overflow:ellipsis;overflow:hidden}.lx-resize{position:absolute;right:0;top:0;bottom:0;width:8px;cursor:col-resize;touch-action:none}
      .lx-table a{color:var(--gold-light);text-decoration:underline}.lx-option{border-left:4px solid var(--lx-color);padding-left:5px}.lx-pencil{margin-left:5px;background:none;color:var(--text);border:0;cursor:pointer}
      .lx-editor{display:flex;gap:3px}.lx-editor input,.lx-editor select,.lx-editor textarea{min-width:0;width:100%;padding:3px}.lx-editor button{background:var(--panel-2);border:1px solid var(--border);color:var(--text);cursor:pointer}
      .lx-field{display:flex;flex-direction:column;gap:5px;font-size:12px;margin:12px 0;min-width:0}.lx-checks{display:grid;gap:8px;max-height:230px;overflow:auto;margin:12px 0}.lx-checks label{display:flex;gap:8px;font-size:12px}.lx-checks label[hidden]{display:none}
      .lx-dialog{width:min(720px,95vw);max-height:90vh;overflow:auto;animation:lx-mola .3s cubic-bezier(.22,1,.36,1)}.lx-dialog .modal-body{overflow:visible}.lx-dialog .btn-secondary{margin:4px}.lx-manage-list{display:grid;gap:6px}.lx-manage-list>div{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px;background:var(--panel-2);border:1px solid var(--border);border-radius:8px;cursor:grab}.lx-manage-list .lx-field{flex:1;margin:0}
      #listaView .tabela-scroll,#listaView .rodape-tabela{display:none!important}#listaView .cartoes-mobile{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}#listaView .cartao-cliente{margin:0}#barraKanban{display:none!important}.lx-group-more{margin:8px}.lx-move{width:auto;padding:4px 8px}
      @keyframes lx-mola{from{transform:translateY(18px) scale(.97);opacity:0}to{transform:none;opacity:1}}@media(prefers-reduced-motion:reduce){.lx-dialog{animation:none}}
      @media(max-width:600px){.lx-toolbar{align-items:stretch}.lx-toolbar select{max-width:100%}.lx-table th,.lx-table td{font-size:11px}.lx-footer{font-size:11px}.lx-dialog .modal-body{padding:12px}.botoes-view{flex-wrap:wrap}.quadro-kanban{max-width:100%}}
    `;document.head.append(style);
    const root=document.createElement('section');root.id='lxRoot';
    root.innerHTML='<div class="lx-toolbar"><label>Área da Lista <select id="lxTela"><option value="juridico">Jurídico</option><option value="captacao">Captação</option></select></label><button class="btn-secondary" id="lxView">Minha visão</button><button class="btn-secondary" id="lxManage" hidden>Gerenciar colunas</button><label id="lxGroupWrap" hidden>Organizar por: <select id="lxGroup"></select></label></div><div id="lxChips"></div><div id="lxStatus" role="status"></div><button id="lxRetry" class="btn-secondary" hidden>Tentar novamente</button><div id="lxGrid"></div>';
    $('listaView').before(root);
    document.querySelector('.header-pagina').after(root.querySelector('.lx-toolbar'));
    const footer=document.createElement('div');footer.className='lx-footer';footer.innerHTML='<span id="lxCount"></span><button class="btn-secondary" id="lxMore">+50</button><label>Mostrar <select id="lxSize"><option>5</option><option>10</option><option>20</option><option selected>50</option><option value="todos">todos</option></select></label>';$('kanbanView').after(footer);
    const resumo=document.createElement('button');resumo.id='btnViewResumido';resumo.className='btn-view';resumo.textContent='Resumido';resumo.onclick=()=>setView('resumido');$('btnViewLista').after(resumo);
    $('lxTela').onchange=e=>scope(e.target.value).catch(erro);$('lxView').onclick=viewDialog;$('lxManage').hidden=!gerenciar;$('lxManage').onclick=manageDialog;$('lxMore').onclick=more;
    $('lxSize').onchange=e=>{config.por_pagina=e.target.value==='todos'?'todos':Number(e.target.value);if(config.por_pagina==='todos'&&state.view!=='kanban'){load(false,true);return;}shown=config.por_pagina==='todos'?rows.length:config.por_pagina;render();};
    $('lxGroup').onchange=e=>{config.kanban_coluna=e.target.value;load();};$('lxRetry').onclick=()=>load();
    $('inputBusca').placeholder='Buscar em todas as colunas...';
    document.querySelectorAll('#dropdownPeriodo label').forEach(l=>l.textContent=l.textContent.replace('Data de inicio','Data de criação'));
  }
  async function setView(v) {if(!['lista','resumido','kanban'].includes(v))v='lista';state.view=v;localStorage.setItem('saga-lista-modo-'+state.meuInternoId,v);render();await load();}
  async function init() {
    const allowed=await rpc('pode_gerenciar_colunas');gerenciar=state.admin||allowed===true;
    await refreshCols();config=padrao();installUI();ready=true;
    state.view=localStorage.getItem('saga-lista-modo-'+state.meuInternoId)||'lista';if(!['lista','resumido','kanban'].includes(state.view))state.view='lista';
    const url=new URLSearchParams(location.search).get('tela'),last=localStorage.getItem('saga-lista-tela-'+state.meuInternoId);
    await scope(['captacao','juridico'].includes(url)?url:last==='captacao'?'captacao':'juridico');
  }
  return {init,load,setView,move,get ready(){return ready;},get charts(){return charts;},chartClick,clear(){config.filtros=[];config.ordem=[];clearLegacy();state.busca='';$('inputBusca').value='';sincronizarUI();load();}};
})();
