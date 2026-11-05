/* SAGA ADV: tarefas e intimações abertas a partir da ficha do cliente (mão dupla).
   Clicar numa tarefa ou intimação da ficha abre uma janela com os dados, o texto e os comentários;
   dá para comentar ali, editar/concluir a tarefa, ou ir para a tela da tarefa/intimação.
   Usa o que a ficha já tem: _sb, state, perms, esc, showToast, getActiveProcess, abrirModalTarefa, concluirTarefa. */
(function(){
  'use strict';
  const e=s=>esc(s==null?'':String(s));
  const fmt=d=>{if(!d)return '';const x=new Date(String(d).length===10?d+'T00:00:00':d);return isNaN(x)?'':x.toLocaleDateString('pt-BR');};
  const fmtHora=d=>{if(!d)return '';const x=new Date(d);return x.toLocaleDateString('pt-BR')+' '+x.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});};
  const nomeDe=id=>{const u=(state.responsaveis||[]).find(x=>x.id===id);return u?u.nome_completo:(id&&state.usuario&&id===state.usuario.internoId?'Você':'Equipe');};
  const ini=n=>String(n||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()||'?';

  function janela(titulo,sub,corpo,rodape){
    fechar();
    const d=document.createElement('div');d.id='faJanela';d.className='modal-overlay open';
    d.innerHTML='<div class="modal fa-modal" role="dialog" aria-modal="true"><div class="modal-head"><div class="modal-title-stack"><h3>'+titulo+'</h3><p>'+sub+'</p></div><button class="modal-close" data-fa-fechar aria-label="Fechar">✕</button></div><div class="modal-body fa-corpo">'+corpo+'</div><div class="modal-foot fa-rodape">'+rodape+'</div></div>';
    document.body.appendChild(d);
    d.addEventListener('click',ev=>{if(ev.target===d||ev.target.closest('[data-fa-fechar]'))fechar();});
    document.addEventListener('keydown',tecla);
    return d;
  }
  function tecla(ev){if(ev.key==='Escape')fechar();}
  function fechar(){const d=document.getElementById('faJanela');if(d)d.remove();document.removeEventListener('keydown',tecla);}

  function htmlComentarios(lista,vazio){
    if(!lista.length)return '<div class="fa-vazio">'+e(vazio)+'</div>';
    return lista.map(c=>'<div class="fa-com"><div class="fa-av" data-saga-usuario="'+e(c.autor)+'" data-saga-nome="'+e(nomeDe(c.autor))+'">'+e(ini(nomeDe(c.autor)))+'</div><div class="fa-com-corpo"><div class="fa-com-cab"><b>'+e(nomeDe(c.autor))+'</b><span>'+e(fmtHora(c.em))+'</span>'+(c.tipo&&c.tipo!=='comentario'?'<em>'+e(c.tipo==='tarefa'?'virou tarefa':c.tipo==='vista'?'vista':c.tipo)+'</em>':'')+'</div><div class="fa-com-texto">'+e(c.texto)+'</div></div></div>').join('');
  }
  function caixaComentar(){
    return '<div class="fa-comentar"><textarea id="faTexto" rows="3" placeholder="Escreva um comentário... (Enter pula linha)"></textarea><button type="button" class="btn-primary" id="faEnviar">Comentar</button></div>';
  }
  function recarregarFicha(){
    const p=getActiveProcess();
    if(p&&typeof carregarDetalhesProcesso==='function'){carregarDetalhesProcesso(p.id).then(()=>{if(typeof renderActiveProcess==='function')renderActiveProcess();});}
  }

  /* ---------- Tarefa ---------- */
  async function abrirTarefa(id){
    const proc=getActiveProcess();
    let t=proc&&(proc.tarefas||[]).find(x=>x.id===id);
    if(!t){
      const r=await _sb.from('tarefas').select('id,titulo,descricao,data_prazo,concluida,responsavel_id,criado_por_id,origem').eq('id',id).maybeSingle();
      if(r.error||!r.data){showToast('Não foi possível abrir esta tarefa (talvez você não tenha acesso).','warning');return;}
      t={id:r.data.id,titulo:r.data.titulo,descricao:r.data.descricao||'',dataPrazo:r.data.data_prazo,concluida:r.data.concluida,responsavelId:r.data.responsavel_id,responsavelNome:nomeDe(r.data.responsavel_id),criadoPorId:r.data.criado_por_id,origem:r.data.origem,etiqueta:null};
    }
    const [rc,ri]=await Promise.all([
      _sb.from('tarefas_comentarios').select('id,autor_id,texto,criado_em').eq('tarefa_id',id).order('criado_em',{ascending:true}),
      _sb.from('intimacoes').select('id,tipo_documento,tribunal').eq('tarefa_id',id).limit(1)
    ]);
    const coms=(rc.data||[]).map(c=>({autor:c.autor_id,texto:c.texto,em:c.criado_em}));
    const origem=(ri.data||[])[0]||null;
    const podeEditar=!t.concluida&&perms.tarefasEditar===true;
    const chips=['<span class="fa-chip '+(t.concluida?'ok':'aberta')+'">'+(t.concluida?'Concluída':'Em aberto')+'</span>',
      t.dataPrazo?'<span class="fa-chip">Prazo '+e(fmt(t.dataPrazo))+'</span>':'<span class="fa-chip">Sem prazo</span>',
      t.responsavelNome?'<span class="fa-chip">Responsável: '+e(t.responsavelNome)+'</span>':'',
      t.etiqueta&&t.etiqueta.nome?'<span class="fa-chip" style="border-color:'+e(t.etiqueta.cor||'')+'">'+e(t.etiqueta.nome)+'</span>':''].join('');
    const corpo='<div class="fa-chips">'+chips+'</div>'
      +(t.descricao?'<div class="fa-rotulo">Descrição</div><div class="fa-texto">'+e(t.descricao)+'</div>':'')
      +(origem?'<button type="button" class="fa-link" data-fa-intim="'+e(origem.id)+'">Veio da intimação: '+e((origem.tipo_documento||'Intimação')+(origem.tribunal?' ('+origem.tribunal+')':''))+' ›</button>':'')
      +'<div class="fa-rotulo">Comentários ('+coms.length+')</div><div class="fa-coms" id="faComs">'+htmlComentarios(coms,'Nenhum comentário ainda.')+'</div>'+caixaComentar();
    const rodape='<a class="btn-secondary fa-ir" href="minhas_tarefas.html?tarefa='+encodeURIComponent(id)+'">Abrir em Minhas Tarefas ↗</a>'
      +(podeEditar?'<button type="button" class="btn-secondary" id="faEditar">Editar</button><button type="button" class="btn-primary" id="faConcluir">Concluir tarefa</button>':'');
    const d=janela(e(t.titulo),'Tarefa deste processo',corpo,rodape);
    const ed=d.querySelector('#faEditar');if(ed)ed.addEventListener('click',()=>{fechar();abrirModalTarefa(id);});
    const cc=d.querySelector('#faConcluir');if(cc)cc.addEventListener('click',async()=>{cc.disabled=true;const ok=await concluirTarefa(id);cc.disabled=false;if(ok!==false)fechar();});
    const oi=d.querySelector('[data-fa-intim]');if(oi)oi.addEventListener('click',()=>abrirIntimacao(oi.dataset.faIntim));
    d.querySelector('#faEnviar').addEventListener('click',async ev=>{
      const ta=d.querySelector('#faTexto');const texto=ta.value.trim();if(!texto){ta.focus();return;}
      ev.target.disabled=true;
      const r=await _sb.from('tarefas_comentarios').insert({tarefa_id:id,autor_id:state.usuario.internoId,texto:texto});
      ev.target.disabled=false;
      if(r.error){showToast('Não foi possível comentar: '+(r.error.message||'sem acesso a esta tarefa.'),'error');return;}
      coms.push({autor:state.usuario.internoId,texto:texto,em:new Date().toISOString()});
      d.querySelector('#faComs').innerHTML=htmlComentarios(coms,'');ta.value='';
      showToast('Comentário salvo na tarefa.','success');
    });
  }

  /* ---------- Intimação ---------- */
  async function abrirIntimacao(id){
    const [ri,rc]=await Promise.all([
      _sb.from('intimacoes').select('id,tribunal,orgao,classe,tipo_documento,tipo_comunicacao,data_disponibilizacao,prazo,etiqueta,etiqueta_cor,concluida,situacao,texto,resumo,link,tarefa_id,triagem,triagem_nota,numero_processo_mascara').eq('id',id).maybeSingle(),
      _sb.from('intimacoes_comentarios').select('id,usuario_id,tipo,texto,criado_em').eq('intimacao_id',id).order('criado_em',{ascending:true})
    ]);
    if(ri.error||!ri.data){showToast('Não foi possível abrir esta intimação (talvez você não tenha acesso).','warning');return;}
    const i=ri.data;
    const coms=(rc.data||[]).map(c=>({autor:c.usuario_id,texto:c.texto,em:c.criado_em,tipo:c.tipo}));
    const chips=['<span class="fa-chip '+(i.concluida?'ok':'aberta')+'">'+(i.concluida?'Resolvida':'Em aberto')+'</span>',
      i.etiqueta?'<span class="fa-chip" style="border-color:'+e(i.etiqueta_cor||'')+'">'+e(i.etiqueta)+'</span>':'',
      i.prazo?'<span class="fa-chip">Prazo '+e(fmt(i.prazo))+'</span>':'',
      '<span class="fa-chip">Disponibilizada em '+e(fmt(i.data_disponibilizacao))+'</span>',
      i.triagem?'<span class="fa-chip">'+(i.triagem==='tarefa'?'Virou tarefa':'Vista')+'</span>':''].join('');
    const texto=i.texto||i.resumo||'';
    const corpo='<div class="fa-chips">'+chips+'</div>'
      +'<div class="fa-sub">'+e([i.tribunal,i.orgao,i.classe].filter(Boolean).join(' · '))+(i.numero_processo_mascara?'<br>Processo '+e(i.numero_processo_mascara):'')+'</div>'
      +(i.triagem_nota?'<div class="fa-rotulo">Anotação da triagem</div><div class="fa-texto">'+e(i.triagem_nota)+'</div>':'')
      +(texto?'<div class="fa-rotulo">Texto da intimação</div><div class="fa-texto fa-teor">'+e(texto)+'</div>':'')
      +(i.tarefa_id?'<button type="button" class="fa-link" data-fa-tarefa="'+e(i.tarefa_id)+'">Ver a tarefa criada desta intimação ›</button>':'')
      +'<div class="fa-rotulo">Comentários e histórico ('+coms.length+')</div><div class="fa-coms" id="faComs">'+htmlComentarios(coms,'Nenhum comentário ainda.')+'</div>'+caixaComentar();
    const rodape=(i.link?'<a class="btn-secondary fa-ir" href="'+e(i.link)+'" target="_blank" rel="noopener">Ver no tribunal ↗</a>':'')
      +'<a class="btn-primary fa-ir" href="monitoramento_multi_oab.html?intimacao='+encodeURIComponent(id)+'">Abrir em Intimações ↗</a>';
    const d=janela(e((i.etiqueta?i.etiqueta+' · ':'')+(i.tipo_documento||'Intimação')),'Intimação deste processo',corpo,rodape);
    const vt=d.querySelector('[data-fa-tarefa]');if(vt)vt.addEventListener('click',()=>abrirTarefa(vt.dataset.faTarefa));
    d.querySelector('#faEnviar').addEventListener('click',async ev=>{
      const ta=d.querySelector('#faTexto');const t=ta.value.trim();if(!t){ta.focus();return;}
      ev.target.disabled=true;
      const r=await _sb.rpc('intimacao_comentar',{p_id:id,p_texto:t});
      ev.target.disabled=false;
      if(r.error){showToast('Não foi possível comentar: '+(r.error.message||''),'error');return;}
      coms.push({autor:state.usuario.internoId,texto:t,em:new Date().toISOString(),tipo:'comentario'});
      d.querySelector('#faComs').innerHTML=htmlComentarios(coms,'');ta.value='';
      showToast('Comentário salvo na intimação.','success');
    });
  }

  const css=document.createElement('style');
  css.textContent='.fa-modal{max-width:620px!important;width:100%}.fa-corpo{max-height:68vh;overflow:auto}'
   +'.fa-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.fa-chip{padding:3px 9px;border:1px solid var(--border-soft);border-radius:999px;font-size:10.5px;color:var(--text)}.fa-chip.aberta{border-color:color-mix(in srgb,var(--warning,#e0a93b) 60%,transparent);color:var(--warning,#e0a93b)}.fa-chip.ok{border-color:color-mix(in srgb,var(--success,#16a34a) 60%,transparent);color:var(--success,#16a34a)}'
   +'.fa-sub{color:var(--muted);font-size:11px;margin-bottom:10px;line-height:1.5}.fa-rotulo{margin:14px 0 6px;color:var(--muted);font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}'
   +'.fa-texto{white-space:pre-wrap;word-break:break-word;color:var(--text);font-size:12px;line-height:1.55;padding:10px 12px;border:1px solid var(--border-soft);border-radius:10px;background:color-mix(in srgb,var(--text) 3%,transparent)}.fa-teor{max-height:240px;overflow:auto}'
   +'.fa-link{display:block;margin-top:10px;padding:0;border:0;background:none;color:var(--gold);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;text-align:left}.fa-link:hover{text-decoration:underline}'
   +'.fa-coms{display:flex;flex-direction:column;gap:10px}.fa-com{display:flex;gap:9px}.fa-av{width:28px;height:28px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--gold) 18%,transparent);color:var(--text);font-size:9.5px;font-weight:700;background-size:cover;background-position:center}'
   +'.fa-com-corpo{min-width:0;flex:1}.fa-com-cab{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;font-size:11px;color:var(--text)}.fa-com-cab span{color:var(--muted);font-size:9.5px}.fa-com-cab em{font-style:normal;font-size:9px;padding:1px 6px;border-radius:6px;background:color-mix(in srgb,var(--gold) 12%,transparent);color:var(--gold)}'
   +'.fa-com-texto{margin-top:2px;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.5;color:var(--text)}.fa-vazio{color:var(--muted);font-size:11px;font-style:italic}'
   +'.fa-comentar{display:flex;flex-direction:column;gap:8px;margin-top:12px}.fa-comentar textarea{width:100%;resize:vertical;padding:9px 11px;border:1px solid var(--border-soft);border-radius:9px;background:color-mix(in srgb,var(--text) 4%,transparent);color:var(--text);font:inherit;font-size:12px}.fa-comentar textarea:focus{outline:none;border-color:var(--gold)}.fa-comentar .btn-primary{align-self:flex-end}'
   +'.fa-rodape{flex-wrap:wrap;gap:8px}.fa-ir{text-decoration:none;display:inline-flex;align-items:center}'
   +'.item-tarefa-mini[data-fa-abrir]{cursor:pointer}.item-tarefa-mini[data-fa-abrir]:hover{border-color:color-mix(in srgb,var(--gold) 45%,transparent)}'
   +'.fa-resolvidas{margin-top:6px}.fa-resolvidas>summary{cursor:pointer;list-style:none;color:var(--muted);font-size:10.5px;font-weight:700;padding:6px 2px}.fa-resolvidas>summary::-webkit-details-marker{display:none}.fa-resolvidas>summary::before{content:"▸ ";}.fa-resolvidas[open]>summary::before{content:"▾ ";}.fa-resolvidas .item-tarefa-mini{opacity:.75}';
  document.head.appendChild(css);
  window.SagaFichaAtividades={abrirTarefa:abrirTarefa,abrirIntimacao:abrirIntimacao,fechar:fechar};
})();
