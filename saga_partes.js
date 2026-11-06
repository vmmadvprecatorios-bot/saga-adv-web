/* SAGA · Partes do processo (T86): o processo ligado ao titular/servidor e cada herdeiro como parte, com ficha própria.
   Mostra a lista das partes na ficha, deixa incluir (pessoa que já existe ou cadastro novo), editar e retirar.
   Tudo grava pelas funções do banco (processo_parte_salvar / processo_parte_remover), que conferem as permissões.
   Uso: SagaPartes.render({sb, raiz, processoId, podeEditar, podeEditarDados, aoMudar, pessoaAtualId}) */
(function(global){
  'use strict';
  var S={sb:null,cfg:null,partes:[],papeis:[],pessoas:{},carregando:0,estilos:false};
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
      '.pt-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}';
    document.head.appendChild(s);
  }

  async function carregar(){
    var c=S.cfg,sb=S.sb;
    var pa=await sb.from('etiquetas_catalogo').select('id,nome,cor,ordem').eq('categoria','papel_parte').eq('ativo',true).order('ordem');
    S.papeis=pa.data||[];
    var r=await sb.from('processos_partes').select('id,pessoa_id,papel_id,herdeiro_de_id,principal,quota,percentual_honorarios,observacao,ordem').eq('processo_id',c.processoId).eq('ativo',true).order('ordem');
    S.partes=r.error?[]:(r.data||[]);
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
      var pes=S.pessoas[p.pessoa_id]||{};if(pes.cpf)subs.push(cpfFmt(pes.cpf));
      var atual=c.pessoaAtualId&&c.pessoaAtualId===p.pessoa_id;
      var nome=atual?'<span class="pt-nome">'+esc(nomeDe(p.pessoa_id))+' (esta ficha)</span>':'<a class="pt-nome" href="ficha_cliente_padrao_metalico_FINAL.html?pessoa_id='+encodeURIComponent(p.pessoa_id)+'&processo_id='+encodeURIComponent(c.processoId)+'">'+esc(nomeDe(p.pessoa_id))+'</a>';
      return '<div class="pt-linha" data-parte="'+esc(p.id)+'"><div class="pt-corpo">'+nome+(pap?'<span class="pt-papel" style="--c:'+esc(pap.cor||'#6fa3d8')+'">'+esc(pap.nome)+'</span>':'')+
        (p.principal?'<span class="pt-papel" style="--c:#8b93a8">principal</span>':'')+
        (subs.length?'<span class="pt-sub">'+esc(subs.join(' · '))+'</span>':'')+(p.observacao?'<span class="pt-sub">'+esc(p.observacao)+'</span>':'')+'</div>'+
        (c.podeEditar?'<div class="pt-acoes"><button type="button" data-ed="'+esc(p.id)+'" title="Editar" aria-label="Editar parte">✎</button>'+(p.principal?'':'<button type="button" data-rm="'+esc(p.id)+'" title="Retirar do processo" aria-label="Retirar do processo">✕</button>')+'</div>':'')+'</div>';
    }).join('');
    c.raiz.innerHTML='<div class="secao-titulo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.5"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15 15c3 0 6 1.7 6 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Partes do processo ('+S.partes.length+')</div>'+
      (linhas||'<div class="pt-vazio">Nenhuma parte cadastrada.</div>')+
      (c.podeEditar?'<button type="button" class="pt-add" id="ptAdd">+ Adicionar herdeiro ou parte</button>':'');
    c.raiz.querySelectorAll('[data-ed]').forEach(function(b){b.onclick=function(){janela(S.partes.find(function(p){return p.id===b.dataset.ed;}));};});
    c.raiz.querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){retirar(b.dataset.rm);};});
    var add=c.raiz.querySelector('#ptAdd');if(add)add.onclick=function(){janela(null);};
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
      '<div class="form-field"><label for="ptObs">Observação</label><input type="text" id="ptObs" value="'+(edit&&parte.observacao?esc(parte.observacao):'')+'"></div>'+
      '<div id="ptErro" style="color:var(--danger);font-size:11px;min-height:14px"></div></div>'+
      '<div class="modal-foot"><button class="btn-secondary" data-fechar type="button">Cancelar</button><button class="btn-primary" id="ptSalvar" type="button">Salvar</button></div></div>';
    document.body.appendChild(ov);
    if(temCustom)global.bindCustomSelects(ov);
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
      var dados={papel_id:q('ptPapel').value||null,herdeiro_de_id:q('ptDe').value||null,quota:q('ptQuota').value.trim().replace(',','.')||null,observacao:q('ptObs').value.trim()||null};
      if(c.podeEditarDados){var h=q('ptPct').value.trim().replace(',','.');dados.percentual_honorarios=h||null;}
      if(edit)dados.id=parte.id;
      else if(escolhida)dados.pessoa_id=escolhida.id;
      else if(novaPessoa){dados.nome=q('ptNome').value.trim();dados.cpf=q('ptCpf').value.trim()||null;if(!dados.nome){erro.textContent='Escreva o nome da pessoa.';return;}}
      else{erro.textContent='Escolha uma pessoa da lista ou cadastre uma nova.';return;}
      if(dados.quota!=null&&(isNaN(Number(dados.quota))||Number(dados.quota)<=0||Number(dados.quota)>100)){erro.textContent='A quota-parte deve ficar entre 0 e 100.';return;}
      var b=this;b.disabled=true;
      var r=await S.sb.rpc('processo_parte_salvar',{p_processo_id:c.processoId,p_dados:dados});
      b.disabled=false;
      if(r.error){erro.textContent=r.error.message||'Não foi possível salvar.';return;}
      fechar();aviso(edit?'Parte atualizada.':'Parte incluída no processo.');
      await atualizar();
    };
    var foco=q('ptBusca')||q('ptQuota');if(foco)foco.focus();
  }

  async function render(cfg){
    estilos();S.sb=cfg.sb;S.cfg=cfg;
    if(!cfg.raiz||!cfg.processoId){if(cfg.raiz)cfg.raiz.innerHTML='';return;}
    var minha=++S.carregando;
    cfg.raiz.innerHTML='<div class="secao-titulo">Partes do processo</div><div class="pt-vazio">Carregando…</div>';
    try{await carregar();}catch(e){cfg.raiz.innerHTML='';return;}
    if(minha!==S.carregando)return;
    desenhar();
  }
  global.SagaPartes={render:render};
})(window);
