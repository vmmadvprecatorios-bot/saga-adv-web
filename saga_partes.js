/* SAGA · Partes do processo (T86): o processo ligado ao titular/servidor e cada herdeiro como parte, com ficha própria.
   Mostra a lista das partes na ficha, deixa incluir (pessoa que já existe ou cadastro novo), editar e retirar.
   Tudo grava pelas funções do banco (processo_parte_salvar / processo_parte_remover), que conferem as permissões.
   Uso: SagaPartes.render({sb, raiz, processoId, podeEditar, podeEditarDados, aoMudar, pessoaAtualId}) */
(function(global){
  'use strict';
  var S={sb:null,cfg:null,modo:'unico',partes:[],papeis:[],pessoas:{},carregando:0,estilos:false};
  var esc=function(t){var d=document.createElement('div');d.textContent=t==null?'':String(t);return d.innerHTML;};
  var cpfFmt=function(c){var d=String(c||'').replace(/\D/g,'');return d.length===11?d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):d.length===14?d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):(c||'');};
  var pct=function(v){return v==null?'':String(Number(v)).replace('.',',')+'%';};
  var aviso=function(m,erro){if(global.showToast)global.showToast(m,erro?'error':'success');};

  function estilos(){
    if(S.estilos)return;S.estilos=true;
    var s=document.createElement('style');s.textContent=
      '.pt-linha{display:flex;gap:8px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border-soft)}.pt-linha:last-of-type{border-bottom:0}'+
      '.pt-corpo{flex:1;min-width:0}.pt-nome{font-weight:700;font-size:12px;color:var(--text);text-decoration:none;overflow-wrap:anywhere}a.pt-nome:hover{color:var(--gold-light)}'+
      '.pt-papel{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:7px;font-size:9.5px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);border:1px solid color-mix(in srgb,var(--c) 35%,transparent)}'+
      '.pt-sub{display:block;margin-top:2px;font-size:10px;color:var(--muted)}.pt-acoes{display:flex;gap:4px}'+
      '.pt-acoes button{width:24px;height:24px;border-radius:7px;border:1px solid var(--border-soft);background:var(--panel);color:var(--muted);cursor:pointer;font-size:11px;padding:0}.pt-acoes button:hover{color:var(--gold-light);border-color:var(--gold)}'+
      '.pt-vazio{font-size:11px;color:var(--muted);padding:6px 0}.pt-add{margin-top:8px;width:100%;padding:8px;border-radius:9px;border:1px dashed color-mix(in srgb,var(--gold) 45%,transparent);background:transparent;color:var(--gold);font:inherit;font-size:11px;font-weight:700;cursor:pointer}'+
      '.pt-add:hover{background:color-mix(in srgb,var(--gold) 8%,transparent)}'+
      '.pt-res{max-height:170px;overflow-y:auto;border:1px solid var(--border-soft);border-radius:9px;margin-top:4px}.pt-res button{display:block;width:100%;text-align:left;padding:8px 10px;border:0;background:transparent;color:var(--text);font:inherit;font-size:11.5px;cursor:pointer}.pt-res button:hover{background:color-mix(in srgb,var(--gold) 10%,transparent)}'+
      '.pt-sel{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:9px;background:color-mix(in srgb,var(--gold) 10%,transparent);font-size:12px}'+
      '.pt-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
      '.pt-modo{display:flex;align-items:center;gap:8px;margin:2px 0 8px;font-size:10.5px;color:var(--muted)}.pt-modo .seg{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--border-soft);border-radius:10px;background:color-mix(in srgb,var(--text) 3%,transparent)}.pt-modo .seg button{border:0;border-radius:7px;background:transparent;color:var(--muted);font:inherit;font-size:10.5px;font-weight:500;padding:4px 10px;cursor:pointer;transition:background-color .2s cubic-bezier(.22,.78,.25,1),color .2s cubic-bezier(.22,.78,.25,1)}.pt-modo .seg button.active{background:color-mix(in srgb,var(--gold) 16%,transparent);color:var(--text)}'+
      '.pt-docs{display:flex;flex-direction:column;gap:5px;margin-top:4px}.pt-doc{display:flex;align-items:center;gap:7px;font-size:11.5px}.pt-doc input[type=checkbox]{width:auto;height:auto;margin:0}.pt-doc span{flex:1;overflow-wrap:anywhere}.pt-doc.ok span{text-decoration:line-through;color:var(--muted)}.pt-doc button{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:0 4px}.pt-sug{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.pt-sug button{border:1px dashed var(--border-soft);background:transparent;color:var(--muted);border-radius:8px;font:inherit;font-size:10px;padding:3px 8px;cursor:pointer}.pt-sug button:hover{color:var(--gold-light);border-color:var(--gold)}'+
      '.pt-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.pt-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 4px 3px 9px;border-radius:9px;background:color-mix(in srgb,var(--gold) 10%,transparent);font-size:11px}.pt-chip button{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:0 4px}';
    document.head.appendChild(s);
  }

  async function carregar(){
    var c=S.cfg,sb=S.sb;
    var pa=await sb.from('etiquetas_catalogo').select('id,nome,cor,ordem').eq('categoria','papel_parte').eq('ativo',true).order('ordem');
    S.papeis=pa.data||[];
    var r=await sb.from('processos_partes').select('id,pessoa_id,papel_id,herdeiro_de_id,principal,quota,percentual_honorarios,documentos,observacao,ordem').eq('processo_id',c.processoId).eq('ativo',true).order('ordem');
    S.partes=r.error?[]:(r.data||[]);
    var rm=await sb.from('processos').select('contrato_modo').eq('id',c.processoId).maybeSingle();
    S.modo=(rm.data&&rm.data.contrato_modo)||'unico';
    var ids=Array.from(new Set(S.partes.map(function(p){return p.pessoa_id;})));
    S.pessoas={};
    if(ids.length){var rp=await sb.from('pessoas').select('id,nome_completo,cpf,situacao_vital').in('id',ids);(rp.data||[]).forEach(function(p){S.pessoas[p.id]=p;});}
  }
  var nomeDe=function(id){return (S.pessoas[id]||{}).nome_completo||'—';};
  var papelDe=function(id){return S.papeis.find(function(p){return p.id===id;});};

  function desenhar(){
    var c=S.cfg;if(!c||!c.raiz)return;
    var linhas=S.partes.map(function(p){
      var pap=papelDe(p.papel_id),subs=[];
      if(p.herdeiro_de_id)subs.push('herdeiro de '+nomeDe(p.herdeiro_de_id));
      if(p.quota!=null)subs.push('quota '+pct(p.quota));
      if(p.percentual_honorarios!=null)subs.push('honorários '+pct(p.percentual_honorarios)+' (diferente do processo)');
      var docs=Array.isArray(p.documentos)?p.documentos:[];if(docs.length)subs.push('documentos '+docs.filter(function(d){return d.ok;}).length+'/'+docs.length);
      var pes=S.pessoas[p.pessoa_id]||{};if(pes.cpf)subs.push(cpfFmt(pes.cpf));
      var atual=c.pessoaAtualId&&c.pessoaAtualId===p.pessoa_id;
      var nome=atual?'<span class="pt-nome">'+esc(nomeDe(p.pessoa_id))+' (esta ficha)</span>':'<a class="pt-nome" href="ficha_cliente_padrao_metalico_FINAL.html?pessoa_id='+encodeURIComponent(p.pessoa_id)+'&processo_id='+encodeURIComponent(c.processoId)+'">'+esc(nomeDe(p.pessoa_id))+'</a>';
      return '<div class="pt-linha" data-parte="'+esc(p.id)+'"><div class="pt-corpo">'+nome+(pap?'<span class="pt-papel" style="--c:'+esc(pap.cor||'#6fa3d8')+'">'+esc(pap.nome)+'</span>':'')+
        (p.principal?'<span class="pt-papel" style="--c:#8b93a8">principal</span>':'')+
        (subs.length?'<span class="pt-sub">'+esc(subs.join(' · '))+'</span>':'')+(p.observacao?'<span class="pt-sub">'+esc(p.observacao)+'</span>':'')+'</div>'+
        (c.podeEditar?'<div class="pt-acoes"><button type="button" data-ed="'+esc(p.id)+'" title="Editar" aria-label="Editar parte">✎</button>'+(p.principal?'':'<button type="button" data-rm="'+esc(p.id)+'" title="Retirar do processo" aria-label="Retirar do processo">✕</button>')+'</div>':'')+'</div>';
    }).join('');
    c.raiz.innerHTML='<div class="secao-titulo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.5"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15 15c3 0 6 1.7 6 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Partes do processo ('+S.partes.length+')</div>'+
      (S.partes.length>1?'<div class="pt-modo"><span>Contrato:</span>'+(c.podeEditar?'<span class="seg" role="group" aria-label="Contrato"><button type="button" data-modo="unico" class="'+(S.modo==='unico'?'active':'')+'" aria-pressed="'+(S.modo==='unico')+'">Único</button><button type="button" data-modo="por_parte" class="'+(S.modo==='por_parte'?'active':'')+'" aria-pressed="'+(S.modo==='por_parte')+'">Um por herdeiro</button></span>':'<b>'+(S.modo==='por_parte'?'um por herdeiro':'único')+'</b>')+'</div>':'')+
      (linhas||'<div class="pt-vazio">Nenhuma parte cadastrada.</div>')+
      (c.podeEditar?'<button type="button" class="pt-add" id="ptAdd">+ Adicionar herdeiro ou parte</button>':'');
    c.raiz.querySelectorAll('[data-ed]').forEach(function(b){b.onclick=function(){janela(S.partes.find(function(p){return p.id===b.dataset.ed;}));};});
    c.raiz.querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){retirar(b.dataset.rm);};});
    c.raiz.querySelectorAll('[data-modo]').forEach(function(b){b.onclick=function(){mudarModo(b.dataset.modo);};});
    var add=c.raiz.querySelector('#ptAdd');if(add)add.onclick=function(){janela(null);};
  }

  // 08/11: troca na hora do clique (o destaque desliza como nos outros seletores) e só volta se o banco recusar
  function marcarModo(m){if(!S.cfg||!S.cfg.raiz)return;S.cfg.raiz.querySelectorAll('.pt-modo [data-modo]').forEach(function(b){var on=b.dataset.modo===m;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});}
  async function mudarModo(m){
    if(m===S.modo||S.mudandoModo)return;
    var antes=S.modo,t0=Date.now();S.mudandoModo=true;marcarModo(m);
    var r=await S.sb.rpc('processo_contrato_modo_salvar',{p_processo_id:S.cfg.processoId,p_modo:m});
    // espera o destaque terminar de deslizar (~340 ms) antes de redesenhar: redesenhar no meio cortava o efeito
    var falta=420-(Date.now()-t0);if(falta>0)await new Promise(function(ok){setTimeout(ok,falta);});
    S.mudandoModo=false;
    if(r.error){marcarModo(antes);aviso(r.error.message||'Não foi possível mudar o contrato.',true);return;}
    S.modo=m;desenhar();aviso(m==='por_parte'?'Contrato: um por herdeiro.':'Contrato: único para todas as partes.');
  }

  async function retirar(id){
    var p=S.partes.find(function(x){return x.id===id;});if(!p)return;
    var ok=global.sagaConfirmar?await global.sagaConfirmar('Retirar parte','Retirar '+nomeDe(p.pessoa_id)+' deste processo? O histórico fica registrado e a pessoa continua cadastrada.','Retirar',true):true;
    if(!ok)return;
    var r=await S.sb.rpc('processo_parte_remover',{p_parte_id:id});
    if(r.error){aviso(r.error.message||'Não foi possível retirar.',true);return;}
    aviso('Parte retirada do processo.');
    await atualizar();
  }
  async function atualizar(){await carregar();desenhar();if(S.cfg.aoMudar)S.cfg.aoMudar();}

  // ---------- janela de incluir / editar ----------
  function janela(parte){
    var c=S.cfg,edit=!!parte,escolhida=edit?{id:parte.pessoa_id,nome_completo:nomeDe(parte.pessoa_id)}:null,novaPessoa=false;
    var ov=document.createElement('div');ov.className='modal-overlay open';ov.id='ptJanela';
    // Menus suspensos no padrão do sistema (custom-select da ficha); sem eles, cai no menu simples do navegador
    var optPap=[['','— sem papel —']].concat(S.papeis.map(function(p){return [p.id,p.nome];}));
    var optDe=[['','— ninguém (parte direta) —']].concat(S.partes.filter(function(p){return !edit||p.pessoa_id!==parte.pessoa_id;}).map(function(p){return [p.pessoa_id,nomeDe(p.pessoa_id)];}));
    var valPap=edit&&parte.papel_id?parte.papel_id:'',valDe=edit&&parte.herdeiro_de_id?parte.herdeiro_de_id:'';
    var temCustom=typeof global.customSelectMarkup==='function'&&typeof global.bindCustomSelects==='function';
    var menu=function(id,val,opts){return temCustom?global.customSelectMarkup(id,val,opts):'<select id="'+id+'">'+opts.map(function(o){return '<option value="'+esc(o[0])+'"'+(o[0]===val?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>';};
    ov.innerHTML='<div class="modal" role="dialog" aria-modal="true" style="max-width:520px"><div class="modal-head"><div class="modal-title-stack"><h3>'+(edit?'Editar parte':'Adicionar herdeiro ou parte')+'</h3><p>Herdeiros ou outras partes (mesmo sem parentesco, como co-autores). Cada pessoa tem a própria ficha e vê este processo nela.</p></div><button class="modal-close" data-fechar aria-label="Fechar">✕</button></div>'+
      '<div class="modal-body">'+
      '<div class="form-field" id="ptCampoPessoa"><label>Pessoa</label>'+(edit?'<div class="pt-sel"><b>'+esc(escolhida.nome_completo)+'</b></div>':
        '<input type="text" id="ptBusca" placeholder="Buscar por nome ou CPF..." autocomplete="off"><div class="pt-res" id="ptRes" hidden></div><button type="button" class="pt-add" id="ptNova" style="margin-top:6px">+ Cadastrar nova pessoa</button>'+
        '<div id="ptNovaBox" hidden style="margin-top:8px"><div class="form-field"><label>Nome completo</label><input type="text" id="ptNome"></div><div class="form-field"><label>CPF (opcional)</label><input type="text" id="ptCpf" inputmode="numeric" maxlength="18" placeholder="000.000.000-00"></div></div>')+'</div>'+
      '<div class="pt-2"><div class="form-field"><label>Papel</label>'+menu('ptPapel',valPap,optPap)+'</div><div class="form-field"><label>Herdeiro de</label>'+menu('ptDe',valDe,optDe)+'</div></div>'+
      '<div class="pt-2"><div class="form-field"><label for="ptQuota">Quota-parte % (opcional)</label><input type="text" id="ptQuota" inputmode="decimal" placeholder="Ex.: 25" value="'+(edit&&parte.quota!=null?esc(String(parte.quota).replace('.',',')):'')+'"></div>'+
      (c.podeEditarDados?'<div class="form-field"><label for="ptPct">Honorários % (só se diferente)</label><input type="text" id="ptPct" inputmode="decimal" placeholder="igual ao do processo" value="'+(edit&&parte.percentual_honorarios!=null?esc(String(parte.percentual_honorarios).replace('.',',')):'')+'"></div>':'<div></div>')+'</div>'+
      '<div class="form-field"><label>Documentos desta pessoa</label><div class="pt-docs" id="ptDocs"></div><div style="display:flex;gap:6px;margin-top:6px"><input type="text" id="ptDocNovo" placeholder="Novo documento (Enter para incluir)"></div><div class="pt-sug" id="ptSug"></div></div>'+
      '<div class="form-field"><label for="ptObs">Observação</label><input type="text" id="ptObs" value="'+(edit&&parte.observacao?esc(parte.observacao):'')+'"></div>'+
      '<div id="ptErro" style="color:var(--danger);font-size:11px;min-height:14px"></div></div>'+
      '<div class="modal-foot"><button class="btn-secondary" data-fechar type="button">Cancelar</button><button class="btn-primary" id="ptSalvar" type="button">Salvar</button></div></div>';
    document.body.appendChild(ov);
    if(temCustom)global.bindCustomSelects(ov);
    var docs=(edit&&Array.isArray(parte.documentos)?parte.documentos:[]).map(function(d){return {nome:d.nome,ok:!!d.ok,obs:d.obs||''};});
    var SUG=['RG e CPF','Comprovante de residência','Certidão de óbito','Certidão de casamento','Procuração assinada','Contrato assinado','Declaração de herdeiros'];
    var desenharDocs=function(){
      var box=ov.querySelector('#ptDocs');
      box.innerHTML=docs.length?docs.map(function(d,i){return '<label class="pt-doc'+(d.ok?' ok':'')+'"><input type="checkbox" data-i="'+i+'"'+(d.ok?' checked':'')+'><span>'+esc(d.nome)+'</span><button type="button" data-x="'+i+'" aria-label="Remover documento">✕</button></label>';}).join(''):'<div class="pt-vazio">Nenhum documento na lista.</div>';
      box.querySelectorAll('input[data-i]').forEach(function(ch){ch.onchange=function(){docs[+ch.dataset.i].ok=ch.checked;desenharDocs();};});
      box.querySelectorAll('button[data-x]').forEach(function(b){b.onclick=function(e){e.preventDefault();docs.splice(+b.dataset.x,1);desenharDocs();};});
      var sug=ov.querySelector('#ptSug'),usados=docs.map(function(d){return d.nome;});
      sug.innerHTML=SUG.filter(function(n){return usados.indexOf(n)<0;}).map(function(n){return '<button type="button" data-s="'+esc(n)+'">+ '+esc(n)+'</button>';}).join('');
      sug.querySelectorAll('button').forEach(function(b){b.onclick=function(){docs.push({nome:b.dataset.s,ok:false,obs:''});desenharDocs();};});
    };
    desenharDocs();
    ov.querySelector('#ptDocNovo').addEventListener('keydown',function(e){if(e.key!=='Enter')return;e.preventDefault();var v=this.value.trim();if(v){docs.push({nome:v,ok:false,obs:''});this.value='';desenharDocs();}});
    var fechar=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-fechar]'))fechar();});
    var q=function(id){return ov.querySelector('#'+id);};
    if(!edit){
      var t=null;
      q('ptBusca').addEventListener('input',function(){
        var v=this.value.trim();clearTimeout(t);escolhida=null;
        if(v.length<2){q('ptRes').hidden=true;return;}
        t=setTimeout(async function(){
          var dig=v.replace(/\D/g,'');
          var f='nome_completo.ilike.%'+v.replace(/[%,()]/g,' ')+'%'+(dig.length>=3?',cpf.ilike.%'+dig+'%':'');
          var r=await S.sb.from('pessoas').select('id,nome_completo,cpf').or(f).limit(8);
          var l=r.data||[],box=q('ptRes');box.hidden=false;
          box.innerHTML=l.length?l.map(function(p){return '<button type="button" data-id="'+esc(p.id)+'"><b>'+esc(p.nome_completo)+'</b> <span style="color:var(--muted);font-size:10px">'+esc(cpfFmt(p.cpf))+'</span></button>';}).join(''):'<div class="pt-vazio" style="padding:8px 10px">Ninguém encontrado. Use "Cadastrar nova pessoa".</div>';
          box.querySelectorAll('button').forEach(function(b){b.onclick=function(){var p=l.find(function(x){return x.id===b.dataset.id;});escolhida=p;q('ptBusca').value=p.nome_completo;box.hidden=true;};});
        },250);
      });
      q('ptNova').onclick=function(){novaPessoa=!novaPessoa;q('ptNovaBox').hidden=!novaPessoa;if(novaPessoa){q('ptBusca').value='';escolhida=null;q('ptNome').focus();}};
      q('ptCpf').addEventListener('input',function(){this.value=cpfFmt(this.value);});
    }
    q('ptSalvar').onclick=async function(){
      var erro=q('ptErro');erro.textContent='';
      var dados={papel_id:q('ptPapel').value||null,herdeiro_de_id:q('ptDe').value||null,documentos:docs,quota:q('ptQuota').value.trim().replace(',','.')||null,observacao:q('ptObs').value.trim()||null};
      if(c.podeEditarDados){var h=q('ptPct').value.trim().replace(',','.');dados.percentual_honorarios=h||null;}
      if(edit)dados.id=parte.id;
      else if(escolhida)dados.pessoa_id=escolhida.id;
      else if(novaPessoa){dados.nome=q('ptNome').value.trim();dados.cpf=q('ptCpf').value.trim()||null;if(!dados.nome){erro.textContent='Escreva o nome da pessoa.';return;}}
      else{erro.textContent='Escolha uma pessoa da lista ou cadastre uma nova.';return;}
      if(dados.quota!=null&&(isNaN(Number(dados.quota))||Number(dados.quota)<=0||Number(dados.quota)>100)){erro.textContent='A quota-parte deve ficar entre 0 e 100.';return;}
      // Cliente repetido (11/11, T152): pessoa nova com ficha parecida no SAGA → usar a existente ou escrever o motivo
      var decisao=null;
      if(!edit&&novaPessoa&&global.SagaFichas){
        decisao=await global.SagaFichas.decidir(S.sb,{nome:dados.nome,cpf:dados.cpf,usar:'Usar esta ficha'});
        if(decisao.acao==='cancelar')return;
        if(decisao.acao==='usar'){dados.pessoa_id=decisao.pessoa.id;delete dados.nome;delete dados.cpf;decisao=null;}
      }
      var b=this;b.disabled=true;
      var r=await S.sb.rpc('processo_parte_salvar',{p_processo_id:c.processoId,p_dados:dados});
      b.disabled=false;
      if(r.error){erro.textContent=r.error.message||'Não foi possível salvar.';return;}
      if(decisao&&decisao.motivo){try{var rp=await S.sb.from('processos_partes').select('pessoa_id').eq('id',r.data).maybeSingle();if(rp.data)await global.SagaFichas.registrar(S.sb,rp.data.pessoa_id,decisao.motivo,decisao.parecidas);}catch(x){}}
      fechar();aviso(edit?'Parte atualizada.':'Parte incluída no processo.');
      await atualizar();
    };
    var foco=q('ptBusca')||q('ptQuota');if(foco)foco.focus();
  }

  async function render(cfg){
    estilos();S.sb=cfg.sb;S.cfg=cfg;
    if(!cfg.raiz||!cfg.processoId){if(cfg.raiz){cfg.raiz.innerHTML='';delete cfg.raiz.dataset.ptProcesso;}return;}
    var minha=++S.carregando;
    // 12/11 (T160): ao recarregar o MESMO processo, o quadro fica como está até os dados novos chegarem
    // (antes mostrava "Carregando…" e encolhia por um instante, e as tarefas logo abaixo davam um pulo)
    var mesmo=cfg.raiz.dataset.ptProcesso===String(cfg.processoId)&&cfg.raiz.childElementCount>0;
    if(!mesmo)cfg.raiz.innerHTML='<div class="secao-titulo">Partes do processo</div><div class="pt-vazio">Carregando…</div>';
    cfg.raiz.dataset.ptProcesso=String(cfg.processoId);
    try{await carregar();}catch(e){cfg.raiz.innerHTML='';delete cfg.raiz.dataset.ptProcesso;return;}
    if(minha!==S.carregando)return;
    desenhar();
  }
  // ---------- seletor de várias pessoas (Novo processo) ----------
  // SagaPartes.seletor({sb, raiz, podeCriar}) -> {itens(): [...]}; SagaPartes.salvarLote(sb, processoId, itens) -> nº de falhas
  async function seletor(cfg){
    estilos();
    var sb=cfg.sb,raiz=cfg.raiz,itens=[],papeis=[],papelSel='';
    var pa=await sb.from('etiquetas_catalogo').select('id,nome').eq('categoria','papel_parte').eq('ativo',true).order('ordem');
    papeis=pa.data||[];
    var herd=papeis.find(function(p){return /herdeir/i.test(p.nome);});papelSel=herd?herd.id:'';
    var temCustom=typeof global.customSelectMarkup==='function'&&typeof global.bindCustomSelects==='function';
    var opts=[['','— sem papel —']].concat(papeis.map(function(p){return [p.id,p.nome];}));
    raiz.innerHTML='<label>Outros clientes ou herdeiros deste processo (opcional)</label>'+
      '<div class="pt-2"><div><input type="text" id="psBusca" placeholder="Buscar por nome ou CPF..." autocomplete="off"></div><div id="psPapelBox">'+(temCustom?global.customSelectMarkup('psPapel',papelSel,opts):'<div class="pt-sug" id="psPapelBt" style="margin-top:0">'+papeis.map(function(p){return '<button type="button" data-p="'+esc(p.id)+'">'+esc(p.nome)+'</button>';}).join('')+'</div>')+'</div></div>'+
      '<div class="pt-res" id="psRes" hidden></div>'+
      (cfg.podeCriar?'<button type="button" class="pt-add" id="psNova" style="margin-top:6px">+ Cadastrar nova pessoa</button><div id="psNovaBox" hidden style="margin-top:8px"><div class="pt-2"><input type="text" id="psNome" placeholder="Nome completo"><input type="text" id="psCpf" inputmode="numeric" maxlength="18" placeholder="CPF (opcional)"></div><button type="button" class="pt-add" id="psNovaOk" style="margin-top:6px">Incluir na lista</button></div>':'')+
      '<div class="pt-chips" id="psChips"></div>';
    if(temCustom)global.bindCustomSelects(raiz);
    var q=function(id){return raiz.querySelector('#'+id);};
    var papelAtual=function(){var e=q('psPapel');return e?e.value||null:(papelSel||null);};
    var bts=q('psPapelBt');
    if(bts){var marca=function(){bts.querySelectorAll('button').forEach(function(b){var on=b.dataset.p===papelSel;b.style.color=on?'var(--gold-light)':'';b.style.borderColor=on?'var(--gold)':'';});};marca();bts.querySelectorAll('button').forEach(function(b){b.onclick=function(){papelSel=papelSel===b.dataset.p?'':b.dataset.p;marca();};});}
    var nomePapel=function(id){var p=papeis.find(function(x){return x.id===id;});return p?p.nome:'';};
    var chips=function(){
      var box=q('psChips');
      box.innerHTML=itens.map(function(it,i){return '<span class="pt-chip"><b>'+esc(it.nome)+'</b>'+(it.papel_id?'<span style="color:var(--muted)">'+esc(nomePapel(it.papel_id))+'</span>':'')+'<button type="button" data-x="'+i+'" aria-label="Tirar">✕</button></span>';}).join('');
      box.querySelectorAll('button').forEach(function(b){b.onclick=function(){itens.splice(+b.dataset.x,1);chips();};});
    };
    var t=null;
    q('psBusca').addEventListener('input',function(){
      var v=this.value.trim();clearTimeout(t);
      if(v.length<2){q('psRes').hidden=true;return;}
      t=setTimeout(async function(){
        var dig=v.replace(/\D/g,'');
        var f='nome_completo.ilike.%'+v.replace(/[%,()]/g,' ')+'%'+(dig.length>=3?',cpf.ilike.%'+dig+'%':'');
        var r=await sb.from('pessoas').select('id,nome_completo,cpf').or(f).limit(8);
        var l=(r.data||[]).filter(function(p){return !(cfg.excluir||[]).includes(p.id)&&!itens.some(function(i){return i.pessoa_id===p.id;});});
        var box=q('psRes');box.hidden=false;
        box.innerHTML=l.length?l.map(function(p){return '<button type="button" data-id="'+esc(p.id)+'"><b>'+esc(p.nome_completo)+'</b> <span style="color:var(--muted);font-size:10px">'+esc(cpfFmt(p.cpf))+'</span></button>';}).join(''):'<div class="pt-vazio" style="padding:8px 10px">Ninguém encontrado.</div>';
        box.querySelectorAll('button').forEach(function(b){b.onclick=function(){var p=l.find(function(x){return x.id===b.dataset.id;});itens.push({pessoa_id:p.id,nome:p.nome_completo,papel_id:papelAtual()});q('psBusca').value='';box.hidden=true;chips();};});
      },250);
    });
    if(cfg.podeCriar){
      q('psNova').onclick=function(){q('psNovaBox').hidden=!q('psNovaBox').hidden;if(!q('psNovaBox').hidden)q('psNome').focus();};
      q('psCpf').addEventListener('input',function(){this.value=cpfFmt(this.value);});
      q('psNovaOk').onclick=async function(){
        var n=q('psNome').value.trim(),cpf=q('psCpf').value.trim()||null;if(!n){aviso('Escreva o nome da pessoa.',true);return;}
        // Cliente repetido (11/11, T152): ficha parecida no SAGA → usar a existente ou escrever o motivo da ficha separada
        var it={nome:n,cpf:cpf,papel_id:papelAtual()};
        if(global.SagaFichas){
          var dec=await global.SagaFichas.decidir(sb,{nome:n,cpf:cpf,usar:'Usar esta ficha'});
          if(dec.acao==='cancelar')return;
          if(dec.acao==='usar'){
            if(itens.some(function(x){return x.pessoa_id===dec.pessoa.id;})||(cfg.excluir||[]).includes(dec.pessoa.id)){aviso('Essa pessoa já está na lista.',true);return;}
            it={pessoa_id:dec.pessoa.id,nome:dec.pessoa.nome_completo,papel_id:papelAtual()};
          }else if(dec.motivo){it.motivo=dec.motivo;it.parecidas=dec.parecidas;}
        }
        itens.push(it);q('psNome').value='';q('psCpf').value='';q('psNovaBox').hidden=true;chips();
      };
    }
    return {itens:function(){return itens.slice();},limpar:function(){itens=[];chips();}};
  }
  async function salvarLote(sb,processoId,itens){
    var falhas=0;
    for(var i=0;i<itens.length;i++){
      var it=itens[i],d={papel_id:it.papel_id||null};
      if(it.pessoa_id)d.pessoa_id=it.pessoa_id;else{d.nome=it.nome;d.cpf=it.cpf||null;}
      var r=await sb.rpc('processo_parte_salvar',{p_processo_id:processoId,p_dados:d});
      if(r.error){falhas++;continue;}
      if(it.motivo&&global.SagaFichas){try{var rp=await sb.from('processos_partes').select('pessoa_id').eq('id',r.data).maybeSingle();if(rp.data)await global.SagaFichas.registrar(sb,rp.data.pessoa_id,it.motivo,it.parecidas);}catch(x){}}
    }
    return falhas;
  }
  global.SagaPartes={render:render,seletor:seletor,salvarLote:salvarLote};
})(window);
