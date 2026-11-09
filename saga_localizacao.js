/* SAGA ADV: Localização do cliente (T102). Usa o que a ficha já tem: _sb, state, perms, esc, showToast, sagaConfirmar.
   Contatos (telefone, e-mail, endereço) do cliente e dos parentes, com funil de status por cores (etiquetas_catalogo loc_*),
   tentativas de ligação, observação, histórico automático, leitura da consulta (PDF ou texto colado; o PDF não é guardado)
   e "contato confirmado" que sobe para o topo da ficha. */
(function(){
  'use strict';
  const CATS={telefone:'loc_telefone',email:'loc_email',endereco:'loc_endereco'};
  const ROT={telefone:'Telefones',email:'E-mails',endereco:'Endereços'};
  const UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const L={pessoa:null,alvos:[],contatos:[],hist:[],cat:[],abertos:new Set(['cliente']),histAberto:false,carregando:false,root:null};
  const e=s=>esc(s==null?'':String(s));
  const podeEditar=()=>perms.pessoasEditar===true;
  const podeGerenciar=()=>perms.pessoasEtiquetasGerenciar===true||state.ehAdmin===true;
  const digitos=v=>String(v||'').replace(/\D/g,'');
  function fone(v){let d=digitos(v);if(d.length===13&&d.startsWith('55'))d=d.slice(2);if(d.length===11)return '('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);if(d.length===10)return '('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6);return String(v||'');}
  function cepFmt(v){const d=digitos(v).slice(0,8);return d.length>5?d.slice(0,5)+'-'+d.slice(5):d;}
  function dataHora(iso){if(!iso)return '';const d=new Date(iso);return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
  const statusDe=tipo=>L.cat.filter(c=>c.categoria===CATS[tipo]&&c.ativo).sort((a,b)=>a.ordem-b.ordem);
  const catPorId=id=>L.cat.find(c=>c.id===id)||null;
  const parentescos=()=>L.cat.filter(c=>c.categoria==='parentesco'&&c.ativo).sort((a,b)=>a.ordem-b.ordem);
  const nomeUsuario=id=>{const u=(state.responsaveis||[]).find(x=>x.id===id);return u?u.nome_completo:(id===state.usuario.internoId?'Você':'Equipe');};
  function alvoRotulo(alvoId){if(!alvoId)return (state.cliente&&state.cliente.nome)||'Cliente';const a=L.alvos.find(x=>x.id===alvoId);if(!a)return 'Parente';const p=catPorId(a.parentesco_id);return a.nome+(p?' ('+p.nome+')':'');}
  function chaveLocal(tipo,c){if(tipo==='telefone'){let d=digitos(c.valor);if(d.length===13&&d.startsWith('55'))d=d.slice(2);return d;}if(tipo==='email')return String(c.valor||'').trim().toLowerCase();return (String(c.logradouro||c.valor||'')+' '+(c.numero||'')+' '+digitos(c.cep)).toLowerCase().replace(/\s+/g,' ').trim();}

  /* ---------------- dados ---------------- */
  async function carregar(){
    const pid=state.pessoaRow&&state.pessoaRow.id;if(!pid)return;
    L.carregando=true;
    const [a,c,h,k]=await Promise.all([
      _sb.from('localizacao_alvos').select('id,nome,parentesco_id,cpf,observacao,ordem,idade').eq('pessoa_id',pid).eq('ativo',true).order('ordem',{ascending:true}).order('criado_em',{ascending:true}),
      _sb.from('localizacao_contatos').select('id,alvo_id,tipo,valor,logradouro,numero,complemento,bairro,cidade,uf,cep,fonte,status_id,tentativas,observacao,criado_em,atualizado_em,whatsapp,nao_perturbe,qualidade,tipo_endereco').eq('pessoa_id',pid).eq('ativo',true).order('criado_em',{ascending:true}),
      _sb.from('localizacao_historico').select('id,contato_id,evento,de_status_id,para_status_id,tentativas,observacao,usuario_id,criado_em').eq('pessoa_id',pid).order('criado_em',{ascending:false}).limit(80),
      _sb.from('etiquetas_catalogo').select('id,nome,cor,categoria,ordem,ativo,acao').in('categoria',['loc_telefone','loc_email','loc_endereco','parentesco','perfil_situacao_funcional','busca_fonte']).order('ordem',{ascending:true})
    ]);
    L.carregando=false;
    const erro=[a,c,h,k].find(r=>r.error);
    if(erro){showToast('Não foi possível carregar a localização: '+(erro.error.message||''),'error');}
    L.pessoa=pid;L.alvos=a.data||[];L.contatos=c.data||[];L.hist=h.data||[];L.cat=k.data||[];
    const [cf,pb]=await Promise.all([
      _sb.from('cartas_fila').select('id,contato_id,status').eq('pessoa_id',pid).in('status',['a_enviar','impressa']),
      _sb.from('pedidos_busca').select('id,alvo_id,nome,cpf,parentesco,fontes,observacao,urgente,situacao,pedido_por_id,criado_em,atendido_por_id,iniciado_em,concluido_em,resposta,arquivos,conferido_em,conferido_por_id').eq('pessoa_id',pid).order('criado_em',{ascending:false}).limit(40)
    ]);
    L.cartas=cf.error?[]:(cf.data||[]);
    L.pedidos=pb.error?[]:(pb.data||[]);
    L.pronto=pid;
  }
  async function recarregar(){await carregar();desenhar();}

  /* ---------------- tela ---------------- */
  async function render(){
    const root=document.getElementById('localizationViewRoot');if(!root)return;
    L.root=root;
    const pid=state.pessoaRow&&state.pessoaRow.id;
    if(!pid){root.innerHTML='<div class="loc2-vazio">Abra um cliente para ver a localização.</div>';return;}
    if(L.pessoa!==pid){L.abertos=new Set(['cliente']);root.innerHTML='<div class="loc2-vazio">Carregando a localização...</div>';await carregar();}
    desenhar();
  }
  function contar(lista,acao){return lista.filter(c=>{const s=catPorId(c.status_id);return s&&s.acao===acao;}).length;}
  function desenhar(){
    const root=L.root;if(!root)return;
    const ed=podeEditar();
    const total=L.contatos.length;
    const resumo=['telefone','email','endereco'].map(t=>L.contatos.filter(c=>c.tipo===t).length+' '+ROT[t].toLowerCase()).join(' · ')+' · '+contar(L.contatos,'confirma')+' confirmado(s) · '+contar(L.contatos,'carta')+' para carta';
    const alvos=[{id:null,chave:'cliente'}].concat(L.alvos.map(a=>({id:a.id,chave:a.id})));
    root.innerHTML='<div class="loc2">'
      +'<div class="loc2-topo"><div><h2>Localização</h2><p>'+(total?e(resumo):'Nenhum contato ainda. Leia a consulta (PDF ou texto) ou adicione à mão.')+'</p></div>'
      +'<div class="loc2-topo-botoes">'+(ed?'<button type="button" class="btn-primary" data-l="ler">Ler consulta (PDF ou texto)</button>':'')
      +(state.usuario&&state.usuario.internoId?'<button type="button" class="btn-secondary" data-l="pedir" title="Quem atende (Administrativo) faz a consulta na Lemit / Data Solution e devolve o PDF para você conferir aqui">Pedir busca</button>':'')
      +(ed?'<button type="button" class="btn-secondary" data-l="parente">+ Parente</button>':'')+'</div></div>'
      +alvos.map(desenharAlvo).join('')
      +desenharPedidos()
      +desenharHistorico()+'</div>';
    ligar(root);
  }
  /* ---------- Pedidos de busca (bloco 140): quem pede, a situação e o PDF que volta ---------- */
  const SIT_PB={a_fazer:'A fazer',em_andamento:'Em andamento',pronto:'Pronto',nao_encontrado:'Sem resultado',cancelado:'Cancelado'};
  const pbAberto=p=>p&&(p.situacao==='a_fazer'||p.situacao==='em_andamento');
  function pedidoDoAlvo(alvoId){return (L.pedidos||[]).find(p=>(p.alvo_id||null)===(alvoId||null)&&(pbAberto(p)||(p.situacao==='pronto'&&!p.conferido_em)));}
  function desenharPedidos(){
    const lista=L.pedidos||[];
    if(!lista.length)return '';
    const vivos=lista.filter(p=>pbAberto(p)||(p.situacao==='pronto'&&!p.conferido_em)).length;
    const qtd=L.pbTodos?lista.length:Math.min(lista.length,Math.max(4,vivos));
    return '<section class="loc2-hist loc2-pb" id="loc2Pedidos"><div class="loc2-grupo-tit">Pedidos de busca <span>'+lista.length+'</span><a class="loc2-add" href="pedidos_busca.html" title="Abrir a tela Pedidos de busca">Abrir a tela</a></div>'
      +lista.slice(0,qtd).map(pedidoHtml).join('')
      +(lista.length>4?'<button type="button" class="loc2-add" data-l="pb-todos">'+(L.pbTodos?'Mostrar menos':'Ver todos os pedidos')+'</button>':'')+'</section>';
  }
  function pedidoHtml(p){
    const eu=state.usuario&&state.usuario.internoId,ed=podeEditar();
    const arqs=(p.arquivos||[]).filter(a=>!a.descartado);
    let acoes='';
    if(p.situacao==='pronto')arqs.forEach(a=>{
      const rot=arqs.length>1?' · '+e(a.fonte||a.nome||'PDF'):'';
      if(ed)acoes+='<button type="button" class="loc2-acao loc2-pb-ler" data-l="pb-ler" data-id="'+e(p.id)+'" data-cam="'+e(a.caminho)+'">Ler e conferir'+rot+'</button>';
      acoes+='<button type="button" class="loc2-acao" data-l="pb-ver" data-id="'+e(p.id)+'" data-cam="'+e(a.caminho)+'">Ver PDF'+rot+'</button>';
    });
    if(pbAberto(p)&&(p.pedido_por_id===eu||state.ehAdmin===true))acoes+='<button type="button" class="loc2-acao perigo" data-l="pb-cancelar" data-id="'+e(p.id)+'">Cancelar pedido</button>';
    if((p.situacao==='pronto'||p.situacao==='nao_encontrado')&&(p.pedido_por_id===eu||ed))acoes+='<button type="button" class="loc2-acao" data-l="pb-devolver" data-id="'+e(p.id)+'" title="A consulta veio errada ou incompleta: o pedido volta para quem atende">Devolver</button>';
    const meta=['Pedido por '+nomeUsuario(p.pedido_por_id)+' em '+dataHora(p.criado_em),
      p.atendido_por_id?(p.situacao==='em_andamento'?'com ':'atendido por ')+nomeUsuario(p.atendido_por_id):'',(p.fontes||[]).join(', ')].filter(Boolean).join(' · ');
    return '<article class="loc2-pb-item st-'+e(p.situacao)+(p.id===L.pbDestaque?' destaque':'')+'" data-pb="'+e(p.id)+'">'
      +'<div class="loc2-contato-linha"><div class="loc2-valor"><b>'+e(p.nome)+' <small>'+e(p.alvo_id?(p.parentesco||'Parente'):'Cliente')+'</small>'+(p.urgente&&pbAberto(p)?' <span class="loc2-selo np">urgente</span>':'')+'</b>'
      +'<small>'+e(meta)+'</small>'+(p.observacao?'<small>Pedido: '+e(p.observacao)+'</small>':'')
      +(p.resposta?'<small class="loc2-pb-resp">'+(p.situacao==='nao_encontrado'?'Sem resultado: ':'Recado: ')+e(p.resposta)+'</small>':'')
      +(p.conferido_em?'<small class="loc2-pb-ok">Conferido por '+e(nomeUsuario(p.conferido_por_id))+' em '+e(dataHora(p.conferido_em))+'</small>':'')+'</div>'
      +'<span class="loc2-pb-chip st-'+e(p.situacao)+'">'+e(SIT_PB[p.situacao]||p.situacao)+(p.situacao==='pronto'&&!p.conferido_em?' · conferir':'')+'</span></div>'
      +(acoes?'<div class="loc2-acoes">'+acoes+'</div>':'')+'</article>';
  }
  function fontesBusca(){return L.cat.filter(c=>c.categoria==='busca_fonte'&&c.ativo).sort((a,b)=>a.ordem-b.ordem);}
  function fontesHtml(marcadas){
    const lista=fontesBusca();const nomes=lista.length?lista.map(f=>f.nome):['Lemit','Data Solution'];
    return nomes.map(n=>'<label class="loc2-pb-fonte"><input type="checkbox" data-pb-fonte="'+e(n)+'"'+(!marcadas||marcadas.has(n)?' checked':'')+'><span>'+e(n)+'</span></label>').join('')
      +(podeGerenciar()?'<button type="button" class="loc2-add" data-pbf="nova">+ Nova fonte</button><button type="button" class="loc2-add" data-pbf="gerenciar">Gerenciar fontes...</button>':'');
  }
  function abrirPedirBusca(alvoPre){
    const aberto=id=>(L.pedidos||[]).find(p=>(p.alvo_id||null)===(id||null)&&pbAberto(p));
    const cpfCli=state.pessoaRow&&state.pessoaRow.cpf;
    const pessoas=[{id:'',nome:(state.cliente&&state.cliente.nome)||'Cliente',sub:'Cliente'+(cpfCli?' · CPF '+cpfFmt(cpfCli):' · sem CPF')}]
      .concat(L.alvos.map(a=>{const p=catPorId(a.parentesco_id);return {id:a.id,nome:a.nome,sub:(p?p.nome:'Parente')+(a.idade?' · '+a.idade+' anos':'')+(a.cpf?' · CPF '+cpfFmt(a.cpf):' · sem CPF')};}));
    const marcar=id=>alvoPre==null?id==='':id===alvoPre;
    const corpo='<div class="loc2-pb-bloco"><b class="loc2-pb-tit">De quem é a busca?</b><div class="loc2-pb-lista">'
      +pessoas.map(x=>{const ab=aberto(x.id);return '<label class="loc2-rev-item'+(ab?' ja':'')+'"><input type="checkbox" data-pb-alvo="'+e(x.id)+'"'+(ab?' disabled':(marcar(x.id)?' checked':''))+'><span><b>'+e(x.nome)+'</b> <small>'+e(x.sub)+(ab?' · já pedida ('+e((SIT_PB[ab.situacao]||'').toLowerCase())+')':'')+'</small></span></label>';}).join('')
      +'</div>'+(L.alvos.length?'':'<small class="loc2-dica">Para buscar um parente, inclua-o antes em "+ Parente" (ou leia uma consulta que traga os parentes).</small>')+'</div>'
      +'<div class="loc2-pb-bloco"><b class="loc2-pb-tit">Onde buscar</b><div class="loc2-pb-fontes" id="loc2PbFontes">'+fontesHtml()+'</div></div>'
      +'<div class="form-field"><label>Recado para quem vai buscar (opcional)</label><textarea id="loc2PbObs" rows="2" maxlength="1000" placeholder="Ex.: o número antigo não atende; procurar telefone atualizado"></textarea></div>'
      +'<div class="loc2-pb-bloco"><label class="loc2-rev-item"><input type="checkbox" id="loc2PbUrg"><span>Urgente <small>aparece primeiro para quem atende</small></span></label></div>';
    const d=janela('Pedir busca','O pedido vai para a tela "Pedidos de busca". Quando o PDF voltar, você recebe o aviso no sino e confere aqui na Localização.',corpo,'Pedir',async d=>{
      const alvos=Array.from(d.querySelectorAll('[data-pb-alvo]:checked')).map(i=>i.dataset.pbAlvo);
      const fontes=Array.from(d.querySelectorAll('[data-pb-fonte]:checked')).map(i=>i.dataset.pbFonte);
      if(!alvos.length){showToast('Marque de quem é a busca.','warning');return false;}
      if(!fontes.length){showToast('Marque pelo menos uma fonte (Lemit, Data Solution...).','warning');return false;}
      const r=await _sb.rpc('pedido_busca_criar',{p_pessoa_id:L.pessoa,p_cliente:alvos.indexOf('')>=0,p_alvos:alvos.filter(Boolean),p_fontes:fontes,p_observacao:d.querySelector('#loc2PbObs').value.trim()||null,p_urgente:d.querySelector('#loc2PbUrg').checked});
      if(r.error){showToast('Não foi possível pedir: '+e(r.error.message||''),'error');return false;}
      const n=(r.data&&r.data.criados)||0,ja=(r.data&&r.data.ja_abertos)||[];
      await recarregar();
      showToast(n?(n===1?'Pedido de busca enviado.':n+' pedidos de busca enviados.')+' Quem atende foi avisado no sino.'+(ja.length?' Já havia pedido aberto para: '+e(ja.join(', '))+'.':''):'Nenhum pedido novo: já havia pedido aberto para '+e(ja.join(', '))+'.',n?'success':'info');
      return true;
    },true);
    const box=d.querySelector('#loc2PbFontes');
    box.addEventListener('click',async ev=>{
      const b=ev.target.closest('[data-pbf]');if(!b)return;ev.preventDefault();
      if(b.dataset.pbf==='gerenciar'){gerenciar('busca_fonte','Fontes de busca');return;}
      const nome=(window.prompt('Nome da nova fonte de busca (ex.: Assertiva):')||'').trim();if(!nome)return;
      if(fontesBusca().some(c=>semAcento(c.nome)===semAcento(nome))){showToast('Essa fonte já existe.','info');return;}
      const ordem=L.cat.filter(c=>c.categoria==='busca_fonte').reduce((m,c)=>Math.max(m,c.ordem||0),0)+1;
      const r=await _sb.from('etiquetas_catalogo').insert({categoria:'busca_fonte',nome:nome,cor:'#64748b',ordem:ordem}).select('id,nome,cor,categoria,ordem,ativo,acao').single();
      if(r.error){showToast('Não foi possível criar: '+e(r.error.message||''),'error');return;}
      L.cat.push(r.data);
      const marc=new Set(Array.from(box.querySelectorAll('[data-pb-fonte]:checked')).map(i=>i.dataset.pbFonte));marc.add(nome);
      box.innerHTML=fontesHtml(marc);
    });
  }
  async function baixarArquivoPedido(p,caminho){
    const a=(p.arquivos||[]).find(x=>x.caminho===caminho)||(p.arquivos||[]).filter(x=>!x.descartado).slice(-1)[0];
    if(!a){showToast('Este pedido não tem PDF.','warning');return null;}
    const r=await _sb.storage.from('buscas-consultas').download(a.caminho);
    if(r.error||!r.data){showToast('Não foi possível abrir o PDF: '+e((r.error&&r.error.message)||'sem acesso'),'error');return null;}
    const nome=a.nome||'consulta.pdf';
    return new File([r.data],nome,{type:/\.txt$/i.test(nome)?'text/plain':'application/pdf'});
  }
  async function lerPedido(id,caminho){
    const p=(L.pedidos||[]).find(x=>x.id===id);if(!p)return;
    if(p.alvo_id&&!L.alvos.some(a=>a.id===p.alvo_id)){showToast('O parente deste pedido saiu da lista. Inclua-o de novo antes de conferir.','warning');return;}
    const arquivo=await baixarArquivoPedido(p,caminho);if(!arquivo)return;
    abrirLeitura(p.alvo_id||'',{pedido:p,arquivo:arquivo});
  }
  async function verPdfPedido(id,caminho){
    const p=(L.pedidos||[]).find(x=>x.id===id);if(!p)return;
    const janelaNova=window.open('','_blank');
    const r=await _sb.storage.from('buscas-consultas').createSignedUrl(caminho,600);
    if(r.error||!r.data||!r.data.signedUrl){if(janelaNova)janelaNova.close();showToast('Não foi possível abrir o PDF: '+e((r.error&&r.error.message)||'sem acesso'),'error');return;}
    if(janelaNova)janelaNova.location.href=r.data.signedUrl;else location.href=r.data.signedUrl;
  }
  async function cancelarPedido(id){
    const p=(L.pedidos||[]).find(x=>x.id===id);if(!p)return;
    if(!await sagaConfirmar('Cancelar pedido de busca','O pedido de "'+p.nome+'" sai da fila de quem atende. Fica registrado como cancelado.','Cancelar pedido'))return;
    const r=await _sb.rpc('pedido_busca_cancelar',{p_id:id,p_motivo:null});
    if(r.error){showToast('Não foi possível cancelar: '+e(r.error.message||''),'error');return;}
    await recarregar();showToast('Pedido cancelado.','success');
  }
  function devolverPedido(id){
    const p=(L.pedidos||[]).find(x=>x.id===id);if(!p)return;
    janela('Devolver pedido de busca','O pedido de "'+p.nome+'" volta para quem atende, com o seu recado.',
      '<div class="form-field"><label>O que está errado?</label><textarea id="loc2PbMotivo" rows="3" maxlength="1000" placeholder="Ex.: o PDF é de outra pessoa; faltou a Data Solution"></textarea></div>','Devolver',async d=>{
        const m=d.querySelector('#loc2PbMotivo').value.trim();if(!m){showToast('Escreva o que está errado.','warning');return false;}
        const r=await _sb.rpc('pedido_busca_devolver',{p_id:id,p_motivo:m});
        if(r.error){showToast('Não foi possível devolver: '+e(r.error.message||''),'error');return false;}
        await recarregar();showToast('Pedido devolvido. Quem atende foi avisado.','success');return true;
      });
  }
  // vindo do sino ("Busca pronta"): destaca o pedido e, se for um PDF só, já abre o leitor
  async function abrirPedido(id){
    if(!id)return;
    const pid=state.pessoaRow&&state.pessoaRow.id;if(!pid)return;
    for(let i=0;i<100&&L.pronto!==pid;i++)await new Promise(r=>setTimeout(r,100));
    if(L.pronto!==pid){await carregar();desenhar();}
    let p=(L.pedidos||[]).find(x=>x.id===id);
    if(!p){const r=await _sb.from('pedidos_busca').select('*').eq('id',id).maybeSingle();if(r.data&&r.data.pessoa_id===pid){L.pedidos=[r.data].concat(L.pedidos||[]);p=r.data;}}
    if(!p){showToast('Pedido de busca não encontrado.','warning');return;}
    L.pbDestaque=id;desenhar();
    const el=document.querySelector('[data-pb="'+id+'"]');if(el)el.scrollIntoView({behavior:window.sagaMq&&sagaMq().matches?'auto':'smooth',block:'center'});
    const arqs=(p.arquivos||[]).filter(x=>!x.descartado);
    if(p.situacao==='pronto'&&!p.conferido_em&&podeEditar()&&arqs.length===1)lerPedido(id,arqs[0].caminho);
  }
  function desenharAlvo(al){
    const lista=L.contatos.filter(c=>(c.alvo_id||null)===al.id);
    const aberto=L.abertos.has(al.chave);
    const a=al.id?L.alvos.find(x=>x.id===al.id):null;
    const p=a?catPorId(a.parentesco_id):null;
    const nome=al.id?a.nome:((state.cliente&&state.cliente.nome)||'Cliente');
    const conf=contar(lista,'confirma');
    const ed=podeEditar();
    return '<section class="loc2-alvo'+(aberto?' aberto':'')+'"><div class="loc2-alvo-cab" data-l="alvo" data-alvo="'+e(al.chave)+'" role="button" tabindex="0" aria-expanded="'+aberto+'">'
      +'<span class="loc2-seta">›</span><span class="loc2-alvo-nome"><b>'+e(nome)+'</b><small>'+(al.id?e(p?p.nome:'Parente'):'Cliente')+(a&&a.idade?' · '+e(a.idade)+' anos':'')+(a&&a.cpf?' · CPF '+e((window.sagaFmt?sagaFmt.cpf(a.cpf):a.cpf)):'')+'</small></span>'
      +(()=>{const pb=pedidoDoAlvo(al.id);return pb?'<span class="loc2-pb-chip st-'+e(pb.situacao)+'" title="Pedido de busca de '+e(nomeUsuario(pb.pedido_por_id))+'">Busca: '+e((SIT_PB[pb.situacao]||'').toLowerCase())+(pb.situacao==='pronto'?' · conferir':'')+'</span>':'';})()
      +'<span class="loc2-alvo-conta">'+lista.length+' contato(s)'+(conf?' · <b class="ok">'+conf+' confirmado(s)</b>':'')+'</span>'
      +(al.id&&ed?'<button type="button" class="loc2-mini" data-l="alvo-menu" data-alvo-id="'+e(al.id)+'" title="Editar ou remover parente">⋯</button>':'')
      +'</div><div class="loc2-alvo-corpo">'
      +['telefone','email','endereco'].map(t=>{
        const itens=lista.filter(c=>c.tipo===t);
        return '<div class="loc2-grupo"><div class="loc2-grupo-tit">'+ROT[t]+' <span>'+itens.length+'</span>'+(ed?'<button type="button" class="loc2-add" data-l="add" data-tipo="'+t+'" data-alvo-id="'+e(al.id||'')+'">+ '+(t==='telefone'?'telefone':t==='email'?'e-mail':'endereço')+'</button>':'')+'</div>'
          +(itens.length?itens.map(desenharContato).join(''):'<div class="loc2-nada">Nenhum.</div>')+'</div>';
      }).join('')
      +'</div></section>';
  }
  function desenharContato(c){
    const s=catPorId(c.status_id);const cor=(s&&s.cor)||'#8a94a8';const ed=podeEditar();
    const valor=c.tipo==='telefone'?fone(c.valor):c.valor;
    const extra=c.tipo==='endereco'&&(c.cep||c.cidade)?'':'';
    let acoes='';
    if(c.tipo==='telefone'){
      if(ed)acoes+='<button type="button" class="loc2-acao tentativa" data-l="tentativa" data-id="'+e(c.id)+'" title="Liguei e não atendeu (+1 tentativa)">📞 Não atendeu'+(c.tentativas?' <b>'+c.tentativas+'</b>':'')+'</button>';
      acoes+='<a class="loc2-acao" href="https://wa.me/55'+e(chaveLocal('telefone',c))+'" target="_blank" rel="noopener" title="Abrir no WhatsApp">WhatsApp</a>';
      if(ed)acoes+='<span class="loc2-wz" title="A WhatsApp deste número chama? Marque depois de testar">WhatsApp chama? <button type="button" class="loc2-acao'+(c.whatsapp===true?' ativo-sim':'')+'" data-l="wz-sim" data-id="'+e(c.id)+'">Sim</button><button type="button" class="loc2-acao'+(c.whatsapp===false?' ativo-nao':'')+'" data-l="wz-nao" data-id="'+e(c.id)+'">Não</button></span>';
      acoes+='<a class="loc2-acao" href="tel:'+e(chaveLocal('telefone',c))+'" title="Ligar">Ligar</a>';
    }else if(c.tipo==='email'){
      acoes+='<a class="loc2-acao" href="mailto:'+e(c.valor)+'" title="Escrever e-mail">E-mail</a>';
    }else if(ed){
      const naFila=(L.cartas||[]).some(x=>x.contato_id===c.id);
      acoes+='<button type="button" class="loc2-acao loc2-carta'+(naFila?' na-fila':'')+'" data-l="carta" data-id="'+e(c.id)+'" title="'+(naFila?'Já está na lista de cartas (tela Cartas)':'Enviar carta para este endereço: entra na lista de cartas')+'">'+ICONE_ENVELOPE+(naFila?'Na lista de cartas':'Enviar carta')+'</button>';
      acoes+='<button type="button" class="loc2-acao" data-l="editar-end" data-id="'+e(c.id)+'" title="Separar rua, número, bairro, cidade, UF e CEP (para a etiqueta da carta)">Editar</button>';
    }
    acoes+='<button type="button" class="loc2-acao" data-l="copiar" data-id="'+e(c.id)+'" title="Copiar">Copiar</button>';
    if(ed)acoes+='<button type="button" class="loc2-acao perigo" data-l="remover" data-id="'+e(c.id)+'" title="Remover da lista (fica no histórico)">✕</button>';
    const endSep=c.tipo==='endereco'?'<small class="loc2-end-sep">'+e([c.bairro,[c.cidade,c.uf].filter(Boolean).join('/'),c.cep?'CEP '+cepFmt(c.cep):''].filter(Boolean).join(' · ')||'Endereço ainda não separado em campos (use Editar)')+'</small>':'';
    return '<article class="loc2-contato" style="--st:'+e(cor)+'">'
      +'<div class="loc2-contato-linha"><div class="loc2-valor"><b>'+e(valor)+selosContato(c)+'</b>'+endSep+'<small>'+(c.fonte?'Fonte: '+e(c.fonte)+' · ':'')+'desde '+e(new Date(c.criado_em).toLocaleDateString('pt-BR'))+'</small></div>'
      +'<button type="button" class="loc2-status" data-l="status" data-id="'+e(c.id)+'"'+(ed?'':' disabled')+'><i></i><span>'+e(s?s.nome:'Sem status')+'</span>'+(ed?'<em>▾</em>':'')+'</button></div>'
      +'<div class="loc2-contato-linha2"><div class="loc2-acoes">'+acoes+'</div>'
      +(ed?'<input type="text" class="loc2-obs" data-l-obs="'+e(c.id)+'" value="'+e(c.observacao||'')+'" placeholder="Observação (Enter para salvar)" maxlength="300">':(c.observacao?'<small class="loc2-obs-ro">'+e(c.observacao)+'</small>':''))
      +'</div>'+extra+'</article>';
  }
  const ICONE_ENVELOPE='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  function selosContato(c){
    let h='';
    if(c.tipo==='telefone'){
      h+=c.whatsapp===true?' <span class="loc2-selo wz">WhatsApp</span>':c.whatsapp===false?' <span class="loc2-selo sem">sem WhatsApp</span>':'';
      if(c.nao_perturbe)h+=' <span class="loc2-selo np" title="Número na lista Não Perturbe (a Lemit avisa: lei 17.334/2021). Evite ligar oferecendo serviço.">Não perturbe</span>';
    }
    if(c.tipo==='endereco'&&c.tipo_endereco)h+=' <span class="loc2-selo">'+e(c.tipo_endereco)+'</span>';
    if(c.qualidade)h+=' <span class="loc2-selo q">'+e(c.qualidade)+'</span>';
    return h;
  }
  async function marcarWhats(id,valor){
    const c=L.contatos.find(x=>x.id===id);if(!c)return;
    const novo=c.whatsapp===valor?null:valor;
    await atualizar(c,{whatsapp:novo,whatsapp_validado_por_id:novo===null?null:state.usuario.internoId,whatsapp_validado_em:novo===null?null:new Date().toISOString()},novo===null?'Marcação de WhatsApp desfeita.':novo?'Marcado: o WhatsApp chama.':'Marcado: não tem WhatsApp.');
  }
  async function enviarCarta(id){
    const c=L.contatos.find(x=>x.id===id);if(!c)return;
    if((L.cartas||[]).some(x=>x.contato_id===id)){if(confirm('Este endereço já está na lista de cartas. Abrir a tela Cartas?'))location.href='cartas.html';return;}
    if(!c.logradouro&&!c.cep){showToast('Separe o endereço em rua, número, bairro, cidade e CEP (botão Editar) antes de mandar para as cartas.','warning');abrirEndereco(c);return;}
    const pr=await _sb.from('processos').select('id').eq('pessoa_id',L.pessoa).eq('excluido_logico',false).order('criado_em',{ascending:false}).limit(1);
    const alvo=c.alvo_id?L.alvos.find(a=>a.id===c.alvo_id):null;
    const linha={pessoa_id:L.pessoa,processo_id:pr.data&&pr.data[0]?pr.data[0].id:null,contato_id:c.id,destinatario:alvo?alvo.nome:((state.cliente&&state.cliente.nome)||''),
      logradouro:c.logradouro||c.valor,numero:c.numero,complemento:c.complemento,bairro:c.bairro,cidade:c.cidade,uf:c.uf,cep:c.cep};
    const r=await _sb.from('cartas_fila').insert(linha).select('id,contato_id,status').single();
    if(r.error){showToast('Não foi possível mandar para as cartas: '+(r.error.message||''),'error');return;}
    (L.cartas=L.cartas||[]).push(r.data);
    await recarregar();
    showToast('Endereço enviado para a lista de cartas'+(alvo?' (em nome de '+e(alvo.nome)+')':'')+'.','success');
  }
  function desenharHistorico(){
    const itens=L.hist.slice(0,L.histAberto?80:6);
    if(!L.hist.length)return '';
    return '<section class="loc2-hist"><div class="loc2-grupo-tit">Histórico de contatos <span>'+L.hist.length+(L.hist.length>=80?'+':'')+'</span></div>'
      +itens.map(h=>{
        const c=L.contatos.find(x=>x.id===h.contato_id);
        const alvo=c?alvoRotulo(c.alvo_id):'';
        const val=c?(c.tipo==='telefone'?fone(c.valor):c.valor):'contato removido';
        const de=catPorId(h.de_status_id),para=catPorId(h.para_status_id);
        let txt='';
        if(h.evento==='criado')txt='cadastrou '+val+(h.observacao?' (fonte: '+h.observacao+')':'');
        else if(h.evento==='status')txt=val+': '+(de?de.nome:'—')+' → <b style="color:'+e(para&&para.cor||'inherit')+'">'+e(para?para.nome:'—')+'</b>';
        else if(h.evento==='tentativa')txt=val+': '+h.tentativas+'ª tentativa de ligação';
        else if(h.evento==='removido')txt='removeu '+val;
        else if(h.evento==='reativado')txt='reativou '+val;
        else txt=val+': observação';
        if(h.evento!=='status')txt=e(txt);else txt=e(val)+': '+e(de?de.nome:'—')+' → <b style="color:'+e(para&&para.cor||'inherit')+'">'+e(para?para.nome:'—')+'</b>';
        return '<div class="loc2-hist-item"><span class="loc2-hist-quem">'+e(nomeUsuario(h.usuario_id))+' · '+e(dataHora(h.criado_em))+(alvo?' · '+e(alvo):'')+'</span><span>'+txt+(h.observacao&&h.evento!=='criado'?' <i>“'+e(h.observacao)+'”</i>':'')+'</span></div>';
      }).join('')
      +(L.hist.length>6?'<button type="button" class="loc2-add" data-l="hist">'+(L.histAberto?'Mostrar menos':'Ver todo o histórico')+'</button>':'')+'</section>';
  }
  function ligar(root){
    root.querySelectorAll('[data-l]').forEach(el=>{
      const a=el.dataset.l;
      if(a==='alvo'){
        const alternar=ev=>{if(ev.target.closest('[data-l="alvo-menu"]'))return;const k=el.dataset.alvo;if(L.abertos.has(k))L.abertos.delete(k);else L.abertos.add(k);el.parentElement.classList.toggle('aberto');el.setAttribute('aria-expanded',el.parentElement.classList.contains('aberto'));};
        el.addEventListener('click',alternar);el.addEventListener('keydown',ev=>{if(ev.target===el&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();alternar(ev);}});
        return;
      }
      el.addEventListener('click',ev=>{
        ev.stopPropagation();
        const id=el.dataset.id;
        if(a==='ler')abrirLeitura();
        else if(a==='pedir')abrirPedirBusca(null);
        else if(a==='pb-ler')lerPedido(id,el.dataset.cam);
        else if(a==='pb-ver')verPdfPedido(id,el.dataset.cam);
        else if(a==='pb-cancelar')cancelarPedido(id);
        else if(a==='pb-devolver')devolverPedido(id);
        else if(a==='pb-todos'){L.pbTodos=!L.pbTodos;desenhar();}
        else if(a==='parente')abrirParente(null);
        else if(a==='alvo-menu')menuParente(el,el.dataset.alvoId);
        else if(a==='add')abrirNovoContato(el.dataset.tipo,el.dataset.alvoId||null);
        else if(a==='status')menuStatus(el,id);
        else if(a==='tentativa')naoAtendeu(id);
        else if(a==='copiar')copiar(id);
        else if(a==='remover')remover(id);
        else if(a==='editar-end')abrirEndereco(L.contatos.find(c=>c.id===id));
        else if(a==='carta')enviarCarta(id);
        else if(a==='wz-sim')marcarWhats(id,true);
        else if(a==='wz-nao')marcarWhats(id,false);
        else if(a==='hist'){L.histAberto=!L.histAberto;desenhar();}
      });
    });
    root.querySelectorAll('[data-l-obs]').forEach(inp=>{
      const salvar=()=>{const c=L.contatos.find(x=>x.id===inp.dataset.lObs);if(!c)return;const v=inp.value.trim();if(v===(c.observacao||''))return;atualizar(c,{observacao:v||null},'Observação salva.');};
      inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();inp.blur();}});
      inp.addEventListener('blur',salvar);
    });
  }

  /* ---------------- ações ---------------- */
  async function atualizar(c,campos,msg){
    const r=await _sb.from('localizacao_contatos').update(campos).eq('id',c.id);
    if(r.error){showToast('Não foi possível salvar: '+(r.error.message||''),'error');return false;}
    Object.assign(c,campos);
    await recarregarHist();
    if(msg)showToast(msg,'success');
    return true;
  }
  async function recarregarHist(){
    const h=await _sb.from('localizacao_historico').select('id,contato_id,evento,de_status_id,para_status_id,tentativas,observacao,usuario_id,criado_em').eq('pessoa_id',L.pessoa).order('criado_em',{ascending:false}).limit(80);
    if(!h.error)L.hist=h.data||[];
    desenhar();
  }
  async function mudarStatus(c,statusId){
    if(c.status_id===statusId)return;
    const s=catPorId(statusId);
    const ok=await atualizar(c,{status_id:statusId},null);
    if(!ok)return;
    if(s&&s.acao==='confirma')await subirParaTopo(c);
    else if(s&&s.acao==='carta')showToast('Marcado para envio de carta.','success');
    else showToast('Status: '+(s?s.nome:''),'success');
  }
  function acharStatusPorNome(tipo,re){return statusDe(tipo).find(s=>re.test(s.nome));}
  async function naoAtendeu(id){
    const c=L.contatos.find(x=>x.id===id);if(!c)return;
    const n=(c.tentativas||0)+1;
    const alvo=n===1?acharStatusPorNome('telefone',/^1/):n===2?acharStatusPorNome('telefone',/^2/):acharStatusPorNome('telefone',/chama e n[ãa]o atende/i);
    const campos={tentativas:n};if(alvo)campos.status_id=alvo.id;
    await atualizar(c,campos,n>=3?n+'ª tentativa: marcado como "'+(alvo?alvo.nome:'chama e não atende')+'".':n+'ª tentativa registrada.');
  }
  function copiar(id){
    const c=L.contatos.find(x=>x.id===id);if(!c)return;
    const txt=c.tipo==='telefone'?fone(c.valor):c.tipo==='endereco'?[c.logradouro?(c.logradouro+(c.numero?', '+c.numero:'')+(c.complemento?', '+c.complemento:'')):c.valor,c.bairro,[c.cidade,c.uf].filter(Boolean).join('/'),c.cep?'CEP '+cepFmt(c.cep):''].filter(Boolean).join(' - '):c.valor;
    const ok=()=>showToast('Copiado.','info');
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok).catch(()=>showToast(txt,'info'));else showToast(txt,'info');
  }
  async function remover(id){
    const c=L.contatos.find(x=>x.id===id);if(!c)return;
    if(!await sagaConfirmar('Remover contato','"'+(c.tipo==='telefone'?fone(c.valor):c.valor)+'" sai da lista. Fica registrado no histórico. Para número de outra pessoa, prefira o status "Engano".','Remover'))return;
    const r=await _sb.from('localizacao_contatos').update({ativo:false}).eq('id',id);
    if(r.error){showToast('Não foi possível remover: '+(r.error.message||''),'error');return;}
    await recarregar();showToast('Contato removido.','success');
  }
  async function subirParaTopo(c){
    const pid=L.pessoa;const alvo=c.alvo_id?alvoRotulo(c.alvo_id):null;
    let r=null,msg='';
    try{
      if(c.tipo==='telefone'){
        const d=chaveLocal('telefone',c);
        if((state.telefones||[]).some(t=>digitos(t.numero).endsWith(d)||d.endsWith(digitos(t.numero))&&digitos(t.numero).length>=10)){showToast('Confirmado. Este número já está no topo da ficha.','success');return;}
        r=await _sb.from('pessoas_telefones').insert({pessoa_id:pid,numero:d,tipo:alvo?'outro':(d.length===11?'celular':'fixo'),tipo_detalhe:alvo?'Recado: '+alvo:null,principal:false,whatsapp:d.length===11,validado:true,origem:'localizacao',criado_por_id:state.usuario.internoId});
        if(!r.error&&typeof recarregarTelefones==='function')await recarregarTelefones();
        msg='Número confirmado e colocado no topo da ficha.';
      }else if(c.tipo==='email'){
        const v=String(c.valor).trim().toLowerCase();
        if((state.emails||[]).some(x=>String(x.email||'').trim().toLowerCase()===v)){showToast('Confirmado. Este e-mail já está no topo da ficha.','success');return;}
        r=await _sb.from('pessoas_emails').insert({pessoa_id:pid,email:c.valor,principal:false,validado:true,origem:'localizacao',criado_por_id:state.usuario.internoId});
        if(!r.error&&typeof recarregarEmails==='function')await recarregarEmails();
        msg='E-mail confirmado e colocado no topo da ficha.';
      }else{
        const linha=c.logradouro?(c.logradouro+(c.numero?', '+c.numero:'')+(c.complemento?', '+c.complemento:'')+(c.bairro?' - '+c.bairro:'')):c.valor;
        const cep=digitos(c.cep);
        if((state.enderecos||[]).some(x=>cep&&digitos(x.cep)===cep&&String(x.endereco||'').toLowerCase().slice(0,12)===linha.toLowerCase().slice(0,12))){showToast('Confirmado. Este endereço já está no topo da ficha.','success');return;}
        r=await _sb.from('pessoas_enderecos').insert({pessoa_id:pid,endereco:linha,cidade:c.cidade||null,uf:c.uf||null,cep:cep||null,tipo:alvo?'outro':'residencial',tipo_detalhe:alvo?'Parente: '+alvo:null,principal:false,validado:true,origem:'localizacao',criado_por_id:state.usuario.internoId});
        if(!r.error&&typeof recarregarEnderecos==='function')await recarregarEnderecos();
        msg='Endereço confirmado e colocado no topo da ficha.';
      }
      if(r&&r.error)throw r.error;
      showToast(msg,'success');
    }catch(erro){showToast('Status salvo, mas não deu para colocar no topo da ficha: '+(erro.message||''),'warning');}
  }

  /* ---------------- menus ---------------- */
  function fecharPop(){const m=document.getElementById('loc2Pop');if(m)m.remove();}
  function abrirPop(ancora,html,aoClicar){
    fecharPop();
    const m=document.createElement('div');m.id='loc2Pop';m.className='loc2-pop';m.innerHTML=html;document.body.appendChild(m);
    const r=ancora.getBoundingClientRect();const w=m.offsetWidth,h=m.offsetHeight;
    m.style.left=Math.max(8,Math.min(window.innerWidth-w-8,r.right-w))+'px';
    m.style.top=(r.bottom+h+8>window.innerHeight?Math.max(8,r.top-h-4):r.bottom+4)+'px';
    m.addEventListener('click',ev=>{const b=ev.target.closest('[data-v]');if(!b)return;ev.stopPropagation();fecharPop();aoClicar(b.dataset.v);});
    setTimeout(()=>document.addEventListener('click',fecharPop,{once:true}),0);
  }
  function menuStatus(btn,id){
    const c=L.contatos.find(x=>x.id===id);if(!c)return;
    const html=statusDe(c.tipo).map(s=>'<button type="button" data-v="'+e(s.id)+'" class="'+(s.id===c.status_id?'ativo':'')+'"><i style="background:'+e(s.cor)+'"></i>'+e(s.nome)+(s.acao==='confirma'?' <small>sobe p/ o topo</small>':s.acao==='carta'?' <small>lista de cartas</small>':'')+'</button>').join('')
      +(podeGerenciar()?'<hr><button type="button" data-v="__ger">Gerenciar status de '+e(ROT[c.tipo].toLowerCase())+'...</button>':'');
    abrirPop(btn,html,v=>{if(v==='__ger')gerenciar(CATS[c.tipo],'Status de '+ROT[c.tipo].toLowerCase());else mudarStatus(c,v);});
  }
  function menuParente(btn,alvoId){
    abrirPop(btn,'<button type="button" data-v="editar">Editar nome / parentesco</button><button type="button" data-v="ler">Ler consulta deste parente</button><button type="button" data-v="pedir">Pedir busca deste parente</button><hr><button type="button" data-v="remover" class="perigo">Remover parente</button>',async v=>{
      const a=L.alvos.find(x=>x.id===alvoId);if(!a)return;
      if(v==='editar')abrirParente(a);
      else if(v==='ler')abrirLeitura(alvoId);
      else if(v==='pedir')abrirPedirBusca(alvoId);
      else if(v==='remover'){
        if(!await sagaConfirmar('Remover parente','"'+a.nome+'" e os contatos dele saem da lista (ficam no histórico).','Remover'))return;
        await _sb.from('localizacao_contatos').update({ativo:false}).eq('alvo_id',alvoId).eq('ativo',true);
        const r=await _sb.from('localizacao_alvos').update({ativo:false}).eq('id',alvoId);
        if(r.error){showToast('Não foi possível remover: '+(r.error.message||''),'error');return;}
        await recarregar();showToast('Parente removido.','success');
      }
    });
  }

  /* ---------------- janelas ---------------- */
  function janela(titulo,sub,corpo,botao,aoSalvar,larga){
    const ant=document.getElementById('loc2Janela');if(ant)ant.remove();
    const d=document.createElement('div');d.id='loc2Janela';d.className='modal-overlay open';
    d.innerHTML='<div class="modal'+(larga?' loc2-modal-larga':'')+'"><div class="modal-head"><div class="modal-title-stack"><h3>'+e(titulo)+'</h3><p>'+e(sub||'')+'</p></div><button class="modal-close" data-fechar>✕</button></div><div class="modal-body">'+corpo+'</div><div class="modal-foot"><button class="btn-secondary" data-fechar>Cancelar</button>'+(botao?'<button class="btn-primary" data-salvar>'+e(botao)+'</button>':'')+'</div></div>';
    document.body.appendChild(d);
    const fechar=()=>d.remove();
    d.addEventListener('click',ev=>{if(ev.target===d||ev.target.closest('[data-fechar]'))fechar();});
    const sb=d.querySelector('[data-salvar]');
    if(sb&&aoSalvar)sb.addEventListener('click',async()=>{sb.disabled=true;const ok=await aoSalvar(d);sb.disabled=false;if(ok)fechar();});
    const primeiro=d.querySelector('input,select,textarea');if(primeiro)setTimeout(()=>primeiro.focus(),60);
    return d;
  }
  function opcoesParentesco(sel){return '<option value="">Escolha...</option>'+parentescos().map(p=>'<option value="'+e(p.id)+'"'+(p.id===sel?' selected':'')+'>'+e(p.nome)+'</option>').join('')+(podeGerenciar()?'<option value="__nova">+ Nova opção...</option>':'');}
  function ligarNovaOpcaoParentesco(sel){
    sel.addEventListener('change',async()=>{
      if(sel.value!=='__nova')return;
      const nome=(window.prompt('Nome do novo parentesco:')||'').trim();
      if(!nome){sel.value='';return;}
      const ordem=parentescos().reduce((m,p)=>Math.max(m,p.ordem||0),0)+1;
      const r=await _sb.from('etiquetas_catalogo').insert({categoria:'parentesco',nome:nome,cor:'#64748b',ordem:ordem}).select('id,nome,cor,categoria,ordem,ativo,acao').single();
      if(r.error){showToast('Não foi possível criar: '+(r.error.message||''),'error');sel.value='';return;}
      L.cat.push(r.data);sel.innerHTML=opcoesParentesco(r.data.id);
    });
  }
  function abrirParente(a){
    const d=janela(a?'Editar parente':'Novo parente','Pessoa que pode levar ao cliente (filho, irmão, vizinho...).',
      '<div class="form-field"><label>Nome</label><input id="loc2PNome" maxlength="200" value="'+e(a?a.nome:'')+'"></div>'
      +'<div class="form-field"><label>Parentesco</label><select id="loc2PPar" class="pasta-select">'+opcoesParentesco(a?a.parentesco_id:'')+'</select></div>'
      +'<div class="form-field"><label>CPF (se tiver)</label><input id="loc2PCpf" inputmode="numeric" maxlength="14" value="'+e(a&&a.cpf||'')+'"></div>',
      'Salvar',async d=>{
        const nome=d.querySelector('#loc2PNome').value.trim();const par=d.querySelector('#loc2PPar').value||null;const cpf=d.querySelector('#loc2PCpf').value.trim()||null;
        if(!nome){showToast('Digite o nome.','warning');return false;}
        const dados={nome:nome,parentesco_id:par==='__nova'?null:par,cpf:cpf};
        const r=a?await _sb.from('localizacao_alvos').update(dados).eq('id',a.id):await _sb.from('localizacao_alvos').insert(Object.assign({pessoa_id:L.pessoa,ordem:L.alvos.length+1},dados)).select('id').single();
        if(r.error){showToast('Não foi possível salvar: '+(r.error.message||''),'error');return false;}
        if(!a&&r.data)L.abertos.add(r.data.id);
        await recarregar();showToast(a?'Parente atualizado.':'Parente incluído.','success');return true;
      });
    ligarNovaOpcaoParentesco(d.querySelector('#loc2PPar'));
    const cpf=d.querySelector('#loc2PCpf');cpf.addEventListener('input',()=>{if(window.SagaPlanilha&&SagaPlanilha.formatar)cpf.value=SagaPlanilha.formatar('cpf',cpf.value);});
  }
  function camposEndereco(c){
    c=c||{};
    return '<div class="loc2-end-grade">'
      +'<div class="form-field g2"><label>Rua / avenida</label><input data-f="logradouro" maxlength="200" value="'+e(c.logradouro||(!c.id?'':c.valor)||'')+'"></div>'
      +'<div class="form-field"><label>Número</label><input data-f="numero" maxlength="20" value="'+e(c.numero||'')+'"></div>'
      +'<div class="form-field"><label>Complemento</label><input data-f="complemento" maxlength="100" value="'+e(c.complemento||'')+'"></div>'
      +'<div class="form-field"><label>Bairro</label><input data-f="bairro" maxlength="100" value="'+e(c.bairro||'')+'"></div>'
      +'<div class="form-field"><label>Cidade</label><input data-f="cidade" maxlength="100" value="'+e(c.cidade||'')+'"></div>'
      +'<div class="form-field"><label>UF</label><select data-f="uf" class="pasta-select"><option value=""></option>'+UFS.map(u=>'<option'+(u===c.uf?' selected':'')+'>'+u+'</option>').join('')+'</select></div>'
      +'<div class="form-field"><label>CEP</label><input data-f="cep" inputmode="numeric" maxlength="9" value="'+e(cepFmt(c.cep||''))+'"></div></div>'
      +(c.id&&c.valor?'<p class="loc2-dica">Como veio da consulta: '+e(c.valor)+'</p>':'');
  }
  function lerEndereco(d){const o={};d.querySelectorAll('[data-f]').forEach(i=>{o[i.dataset.f]=i.value.trim()||null;});if(o.cep)o.cep=digitos(o.cep);return o;}
  function ligarCep(d){const i=d.querySelector('[data-f="cep"]');if(i)i.addEventListener('input',()=>{i.value=cepFmt(i.value);});}
  function abrirEndereco(c){
    if(!c)return;
    const d=janela('Endereço separado','Os campos separados servem para a etiqueta da carta.',camposEndereco(c),'Salvar',async d=>{
      const o=lerEndereco(d);if(!o.logradouro){showToast('Preencha a rua.','warning');return false;}
      return atualizar(c,o,'Endereço salvo.');
    });
    ligarCep(d);
  }
  function abrirNovoContato(tipo,alvoId){
    const corpo=tipo==='endereco'?camposEndereco(null):'<div class="form-field"><label>'+(tipo==='telefone'?'Telefone (com DDD)':'E-mail')+'</label><input id="loc2Valor" '+(tipo==='telefone'?'inputmode="numeric" maxlength="16"':'type="email" maxlength="200"')+'></div>';
    const d=janela('Novo '+(tipo==='telefone'?'telefone':tipo==='email'?'e-mail':'endereço'),'De: '+alvoRotulo(alvoId),corpo,'Incluir',async d=>{
      let dados={pessoa_id:L.pessoa,alvo_id:alvoId,tipo:tipo,fonte:'Manual'};
      if(tipo==='endereco'){const o=lerEndereco(d);if(!o.logradouro){showToast('Preencha a rua.','warning');return false;}Object.assign(dados,o,{valor:[o.logradouro,o.numero].filter(Boolean).join(', ')});}
      else{const v=d.querySelector('#loc2Valor').value.trim();if(tipo==='telefone'&&digitos(v).length<10){showToast('Digite o telefone com DDD.','warning');return false;}if(tipo==='email'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){showToast('E-mail inválido.','warning');return false;}dados.valor=tipo==='telefone'?digitos(v):v;}
      const r=await _sb.from('localizacao_contatos').insert(dados);
      if(r.error){showToast(r.error.code==='23505'?'Este contato já está na lista.':'Não foi possível incluir: '+(r.error.message||''),'warning');return false;}
      L.abertos.add(alvoId||'cliente');await recarregar();showToast('Contato incluído.','success');return true;
    });
    if(tipo==='endereco')ligarCep(d);
    const v=d.querySelector('#loc2Valor');if(v&&tipo==='telefone')v.addEventListener('input',()=>{const d2=digitos(v.value).slice(0,11);v.value=d2.length>2?'('+d2.slice(0,2)+') '+(d2.length>10?d2.slice(2,7)+'-'+d2.slice(7):d2.length>6?d2.slice(2,6)+'-'+d2.slice(6):d2.slice(2)):d2;});
  }

  /* ---------------- gerenciar status (administrador) ---------------- */
  function gerenciar(categoria,titulo){
    const desenharLinhas=()=>L.cat.filter(c=>c.categoria===categoria&&c.ativo).sort((a,b)=>a.ordem-b.ordem).map((s,i,arr)=>
      '<div class="loc2-ger" data-gid="'+e(s.id)+'"><input type="color" value="'+e(/^#[0-9a-f]{6}$/i.test(s.cor)?s.cor:'#8a94a8')+'" data-g="cor"><input type="text" value="'+e(s.nome)+'" maxlength="80" data-g="nome">'
      +(s.acao?'<small>'+(s.acao==='confirma'?'sobe p/ topo':'cartas')+'</small>':'')
      +'<button type="button" data-g="sobe"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-g="desce"'+(i===arr.length-1?' disabled':'')+'>↓</button><button type="button" data-g="tira" class="perigo" title="Remover (só desativa; o histórico fica)">✕</button></div>').join('');
    const d=janela(titulo,'Renomeie, mude a cor, reordene ou remova. Remover só desativa: o histórico continua.','<div id="loc2Ger"></div><button type="button" class="loc2-add" id="loc2GerNovo">+ Novo status</button>',null,null);
    const box=d.querySelector('#loc2Ger');
    const pintar=()=>{box.innerHTML=desenharLinhas();};
    pintar();
    const salvar=async(id,campos)=>{const r=await _sb.from('etiquetas_catalogo').update(campos).eq('id',id);if(r.error){showToast('Não foi possível salvar: '+(r.error.message||''),'error');return false;}Object.assign(L.cat.find(c=>c.id===id),campos);return true;};
    box.addEventListener('change',async ev=>{const linha=ev.target.closest('[data-gid]');if(!linha)return;const g=ev.target.dataset.g;if(g==='nome'&&ev.target.value.trim())await salvar(linha.dataset.gid,{nome:ev.target.value.trim()});if(g==='cor')await salvar(linha.dataset.gid,{cor:ev.target.value});desenhar();});
    box.addEventListener('click',async ev=>{
      const b=ev.target.closest('button[data-g]');if(!b)return;const id=b.closest('[data-gid]').dataset.gid;
      const lista=L.cat.filter(c=>c.categoria===categoria&&c.ativo).sort((a,b)=>a.ordem-b.ordem);const i=lista.findIndex(x=>x.id===id);
      if(b.dataset.g==='tira'){if(!await sagaConfirmar('Remover status','"'+lista[i].nome+'" some do menu. Contatos que já estão nele continuam mostrando o nome.','Remover'))return;await salvar(id,{ativo:false});}
      else{const j=b.dataset.g==='sobe'?i-1:i+1;if(j<0||j>=lista.length)return;const x=lista.splice(i,1)[0];lista.splice(j,0,x);for(let k=0;k<lista.length;k++)if(lista[k].ordem!==k+1)await salvar(lista[k].id,{ordem:k+1});}
      pintar();desenhar();
    });
    d.querySelector('#loc2GerNovo').addEventListener('click',async()=>{
      const nome=(window.prompt('Nome do novo status:')||'').trim();if(!nome)return;
      const ordem=L.cat.filter(c=>c.categoria===categoria).reduce((m,c)=>Math.max(m,c.ordem||0),0)+1;
      const r=await _sb.from('etiquetas_catalogo').insert({categoria:categoria,nome:nome,cor:'#8a94a8',ordem:ordem}).select('id,nome,cor,categoria,ordem,ativo,acao').single();
      if(r.error){showToast('Não foi possível criar: '+(r.error.message||''),'error');return;}
      L.cat.push(r.data);pintar();desenhar();
    });
  }

  /* ---------------- leitura da consulta (PDF ou texto) ---------------- */
  async function textoDoPdf(arquivo){
    if(typeof carregarPdfjs!=='function')throw new Error('Leitor de PDF indisponível.');
    const pdfjs=await carregarPdfjs();
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await arquivo.arrayBuffer()),isEvalSupported:false}).promise;
    const linhas=[];
    for(let n=1;n<=pdf.numPages;n++){
      const pg=await pdf.getPage(n);const tc=await pg.getTextContent();
      const porY={};
      tc.items.forEach(it=>{if(!it.str||!it.str.trim())return;const y=Math.round(it.transform[5]/3)*3;(porY[y]=porY[y]||[]).push({x:it.transform[4],s:it.str});});
      Object.keys(porY).map(Number).sort((a,b)=>b-a).forEach(y=>linhas.push(porY[y].sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').replace(/\s+/g,' ').trim()));
    }
    pdf.destroy();
    return linhas.join('\n');
  }
  function detectarFonte(t){if(/lemit/i.test(t))return 'Lemit';if(/date\s*solutions|data\s*solution|datasolution|dataadv/i.test(t))return 'Data Solution';return 'Outra';}
  const RX_LOGR=/^(rua|r\.|av\.?|avenida|travessa|tv\.?|trav\.?|rodovia|rod\.?|alameda|al\.|pra[çc]a|p[çc]a\.?|estrada|est\.|conjunto|conj\.?|cj\.?|loteamento|lot\.?|quadra|qd\.?|s[ií]tio|fazenda|faz\.?|vila|beco|largo|residencial|condom[ií]nio|cond\.?|setor|ladeira|vereda|via)\b/i;
  const RX_PAR=/(?<!\p{L})(m[ãa]e|pai|irm[ãa]o?|filh[oa]|c[ôo]njuge|espos[oa]|marido|av[ôóo]|net[oa]|sobrinh[oa]|prim[oa]|ti[oa]|genro|nora|cunhad[oa]|companheir[oa]|sogr[oa]|enteado|enteada|vizinh[oa])(?!\p{L})/iu;
  function extrair(texto){
    const linhas=String(texto||'').split(/\r?\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
    const out={telefone:[],email:[],endereco:[],parentes:[]};const vistos=new Set();
    const add=(tipo,obj)=>{const k=tipo+':'+chaveLocal(tipo,obj);if(!chaveLocal(tipo,obj)||vistos.has(k))return;vistos.add(k);out[tipo].push(obj);};
    const tudo=linhas.join('\n');
    (tudo.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[]).forEach(m=>add('email',{valor:m.toLowerCase()}));
    const semDocs=tudo.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,' ').replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,' ').replace(/\b\d{2}\/\d{2}\/\d{2,4}\b/g,' ').replace(/\b\d{5}-\d{3}\b/g,' ');
    const rxFone=/(?:\+?55[\s-]?)?\(?\b([1-9][1-9])\)?[\s-]?(9?\d{4})[\s.-]?(\d{4})\b/g;let m;
    while((m=rxFone.exec(semDocs))){const d=m[1]+m[2]+m[3];if(d.length===11&&d[2]!=='9')continue;if(d.length===10&&!/[2-8]/.test(d[2]))continue;if(/^(\d)\1+$/.test(d.slice(2)))continue;add('telefone',{valor:d});}
    for(let i=0;i<linhas.length;i++){
      const l=linhas[i];const temCep=/\b\d{5}-?\d{3}\b/.test(l);
      if(!RX_LOGR.test(l)&&!(temCep&&/,/.test(l)))continue;
      let bloco=l;
      if(!temCep&&linhas[i+1]&&/\b\d{5}-?\d{3}\b|\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/.test(linhas[i+1])&&!RX_LOGR.test(linhas[i+1])){bloco+=' - '+linhas[i+1];i++;}
      add('endereco',separarEndereco(bloco));
    }
    linhas.forEach(l=>{
      const g=l.match(RX_PAR);if(!g)return;
      const nomes=l.replace(RX_PAR,' | ').match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç']+(?:\s+(?:d[aeo]s?|e|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç']+)){1,6}/g)||[];
      const nome=nomes.sort((a,b)=>b.length-a.length)[0];
      if(!nome||nome.split(' ').length<2)return;
      const cpf=(l.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/)||[])[0]||null;
      const k='p:'+nome.toLowerCase();if(vistos.has(k))return;vistos.add(k);
      out.parentes.push({nome:nome.trim(),grau:g[1],cpf:cpf});
    });
    return out;
  }
  function separarEndereco(bloco){
    const o={valor:bloco.slice(0,400)};
    const cep=bloco.match(/\b(\d{5})-?(\d{3})\b/);if(cep)o.cep=cep[1]+cep[2];
    const ufs=bloco.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/g);if(ufs)o.uf=ufs[ufs.length-1];
    const cid=bloco.match(/([A-Za-zÀ-ÿ' ]{3,40})\s*[\/-]\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);if(cid)o.cidade=cid[1].trim().replace(/^(-|,)\s*/,'');
    const partes=bloco.split(/\s*,\s*|\s+-\s+/).map(s=>s.trim()).filter(Boolean);
    if(partes.length){o.logradouro=partes[0].slice(0,200);
      const num=partes.slice(1).find(p=>/^(n[ºo°.]?\s*)?(\d+[A-Za-z]?|s\/?n)$/i.test(p));if(num)o.numero=num.replace(/^n[ºo°.]?\s*/i,'');
      const resto=partes.slice(1).filter(p=>p!==num&&!/\d{5}-?\d{3}/.test(p)&&!(o.cidade&&p.indexOf(o.cidade)>=0)&&!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(p)&&!/^cep/i.test(p));
      if(resto.length===1)o.bairro=resto[0].slice(0,100);else if(resto.length>1){o.complemento=resto.slice(0,-1).join(', ').slice(0,100);o.bairro=resto[resto.length-1].slice(0,100);}
    }
    return o;
  }
  /* ---------- leitores próprios da Lemit e da Data Solution (pelas colunas da tabela do PDF) ---------- */
  async function itensDoPdf(arquivo){
    if(typeof carregarPdfjs!=='function')throw new Error('Leitor de PDF indisponível.');
    const pdfjs=await carregarPdfjs();
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await arquivo.arrayBuffer()),isEvalSupported:false}).promise;
    const itens=[];
    for(let n=1;n<=pdf.numPages;n++){const pg=await pdf.getPage(n);const tc=await pg.getTextContent();
      tc.items.forEach(it=>{if(it.str&&it.str.trim())itens.push({p:n,x:Math.round(it.transform[4]),y:Math.round(it.transform[5]),s:it.str});});}
    pdf.destroy();
    return itens;
  }
  function textoDosItens(itens){
    const porL={};itens.forEach(i=>{const k=i.p+'|'+Math.round(i.y/3);(porL[k]=porL[k]||[]).push(i);});
    return Object.keys(porL).sort((a,b)=>{const A=a.split('|').map(Number),B=b.split('|').map(Number);return A[0]-B[0]||B[1]-A[1];}).map(k=>porL[k].sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ')).join('\n');
  }
  const ICONE_WHATS='',ICONE_NAO_PERTURBE='';
  const semAcento=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().trim();
  const limpa=v=>String(v||'').replace(/−/g,'-').replace(/[-]/g,'').replace(/\s+/g,' ').trim();
  function secoes(itens,titulos){
    // ordem de leitura de cima para baixo em todas as páginas; tira cabeçalho e rodapé da impressão do navegador
    const T=titulos.map(semAcento);
    const corpo=itens.filter(i=>i.y>28&&i.y<806).map(i=>Object.assign({g:(i.p-1)*2000+(900-i.y)},i)).sort((a,b)=>a.g-b.g||a.x-b.x);
    const marcos=corpo.filter(i=>T.indexOf(semAcento(i.s))>=0&&i.x<110);
    const out={};
    marcos.forEach((m,k)=>{const fim=marcos[k+1]?marcos[k+1].g:Infinity;out[semAcento(m.s)]=corpo.filter(i=>i.g>m.g&&i.g<fim);});
    return out;
  }
  function tabela(itens,ancoraFn){
    if(!itens||!itens.length)return [];
    const g0=itens[0].g,cab=itens.filter(i=>i.g-g0<=18&&!/^[-]+$/.test(i.s));
    const cols=[];cab.slice().sort((a,b)=>a.x-b.x).forEach(i=>{const c=cols[cols.length-1];if(c&&i.x-c.xFim<=14){c.nome+=i.s;c.xFim=i.x+i.s.length*4;}else cols.push({x:i.x,xFim:i.x+i.s.length*4,nome:i.s});});
    cols.forEach(c=>{c.chave=semAcento(c.nome).replace(/[^A-Z0-9]+/g,' ').trim();});
    const corpo=itens.filter(i=>cab.indexOf(i)<0&&i.g-g0>12);
    const colDe=i=>{let r=cols[0];cols.forEach(c=>{if(i.x>=c.x-6)r=c;});return r;};
    corpo.forEach(i=>{i.col=colDe(i);});
    const ancoras=corpo.filter(i=>ancoraFn(i,i.col));
    return ancoras.map((a,k)=>{
      const linha={_itens:[]};
      corpo.forEach(i=>{let melhor=null,d=1e9;ancoras.forEach(an=>{const dd=Math.abs(an.g-i.g);if(dd<d){d=dd;melhor=an;}});if(melhor===a)linha._itens.push(i);});
      cols.forEach(c=>{linha[c.chave]=limpa(linha._itens.filter(i=>i.col===c).sort((x,y)=>x.g-y.g||x.x-y.x).map(i=>i.s).join(' '));});
      return linha;
    });
  }
  function enderecoDe(rua,compl,bairro,cidUf,cep,tipo){
    const o={};rua=limpa(rua);
    const m=rua.match(/^(.*?\D)\s*,?\s*(\d+[A-Z]?)\b\s*(.*)$/i);
    if(m){o.logradouro=m[1].replace(/[,\s]+$/,'');o.numero=m[2];if(m[3])o.complemento=m[3];}else o.logradouro=rua;
    compl=limpa(compl);if(compl&&!/^nao informado$/i.test(semAcento(compl))&&(!o.complemento||o.complemento.indexOf(compl)<0))o.complemento=[o.complemento,compl].filter(Boolean).join(' ');
    if(bairro&&!/^NAO INFORMADO$/.test(semAcento(bairro)))o.bairro=limpa(bairro);
    const cu=limpa(cidUf).match(/^(.*?)[\s,\-\/]+([A-Z]{2})$/);if(cu){o.cidade=cu[1].trim();o.uf=cu[2];}else if(cidUf)o.cidade=limpa(cidUf);
    const d=digitos(cep);if(d.length===8)o.cep=d;
    if(tipo){const t=semAcento(tipo);o.tipo_endereco=/COM/.test(t)?'comercial':/RES/.test(t)?'residencial':null;}
    o.valor=[[o.logradouro,o.numero].filter(Boolean).join(', '),o.complemento,o.bairro,[o.cidade,o.uf].filter(Boolean).join('/'),o.cep?'CEP '+cepFmt(o.cep):''].filter(Boolean).join(' - ');
    return o;
  }
  const grauBonito=g=>{g=String(g||'').replace(/\bA[cç][oõ]es\b/gi,'').trim();const t=semAcento(g);const M={'IRMA(O)':'Irmão(ã)','MAE':'Mãe','PAI':'Pai','FILHA(O)':'Filho(a)','SOBRINHA(O)':'Sobrinho(a)','NETA(O)':'Neto(a)','CONJUGE':'Cônjuge','TIA(O)':'Tio(a)','AVO':'Avô/Avó','PRIMA(O)':'Primo(a)'};return M[t]||limpa(g);};
  const cpfFmt=v=>{const d=digitos(v);return d.length===11?d.slice(0,3)+'.'+d.slice(3,6)+'.'+d.slice(6,9)+'-'+d.slice(9):limpa(v);};
  function lerLemit(itens){
    const S=secoes(itens,['DADOS GERAIS','RISCO DE CRÉDITO','VÍNCULOS','PARTICIPAÇÃO SOCIETÁRIA','TELEFONES CELULARES','TELEFONES FIXOS','E-MAILS','ENDEREÇOS']);
    const out={fonte:'Lemit',telefone:[],email:[],endereco:[],parentes:[],dados:{}};
    (S['DADOS GERAIS']||[]).forEach(i=>{if(i.x>120)return;const v=(S['DADOS GERAIS']||[]).find(j=>j.x>150&&Math.abs(j.g-i.g)<4);if(v)out.dados[semAcento(i.s)]=limpa(v.s);});
    const sim=(i)=>i.s.trim()==='Sim';
    ['TELEFONES CELULARES','TELEFONES FIXOS'].forEach(sec=>{
      tabela(S[sec],sim).forEach(l=>{
        const tx=l._itens.map(i=>i.s).join(' ');const m=tx.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/);if(!m)return;
        out.telefone.push({valor:digitos(m[0]),whatsapp:tx.indexOf(ICONE_WHATS)>=0?true:null,nao_perturbe:tx.indexOf(ICONE_NAO_PERTURBE)>=0,qualidade:limpa(l.SITUACAO||'').replace(/\b(Sim|Recado|N[ãa]o)\b/g,' ').replace(/[uú]ltimo contato.*$/i,'').replace(/\s+/g,' ').trim()||null});
      });
    });
    tabela(S['E-MAILS'],sim).forEach(l=>{const m=l._itens.map(i=>i.s).join(' ').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);if(m)out.email.push({valor:m[0].toLowerCase()});});
    tabela(S['ENDEREÇOS'.normalize('NFD').replace(/[̀-ͯ]/g,'')]||S['ENDERECOS'],sim).forEach(l=>{if(!l.ENDERECO)return;out.endereco.push(enderecoDe(l.ENDERECO,'',l.BAIRRO,l.CIDADE,l.CEP,l.TIPO));});
    tabela(S['VINCULOS'],(i,c)=>c&&c.chave==='CPF'&&/\d{6,}/.test(i.s)).forEach(l=>{if(l.NOME)out.parentes.push({nome:l.NOME,cpf:cpfFmt(l.CPF),grau:grauBonito(l['TIPO DE VINCULO'])});});
    return out;
  }
  function lerDataSolution(itens){
    const S=secoes(itens,['Dados Cadastrais','Telefones','Enderecos','E-mails','Situacao Cadastral','Participacao Empresarial','Perfil de Consumo','Veiculo','Pessoas Ligadas','Perfil Sociodemografico','Historico Profissional']);
    const out={fonte:'Data Solution',telefone:[],email:[],endereco:[],parentes:[],dados:{}};
    const dc=S['DADOS CADASTRAIS']||[];
    dc.forEach(i=>{if(!/^[A-Z ()\/]+$/.test(semAcento(i.s))||i.s!==i.s.toUpperCase())return;const v=dc.find(j=>Math.abs(j.x-i.x)<4&&j.g-i.g>8&&j.g-i.g<30);if(v)out.dados[semAcento(i.s)]=limpa(v.s);});
    const qual=(i,c)=>c&&/QUALIFICACAO/.test(c.chave)&&/^\d+$/.test(i.s.trim());
    tabela(S['TELEFONES'],qual).forEach(l=>{const d=digitos(l.TELEFONE);if(d.length>=10)out.telefone.push({valor:d,whatsapp:null,nao_perturbe:false,qualidade:l.QUALIFICACAO?l.QUALIFICACAO+'º na lista':null});});
    tabela(S['E-MAILS'],qual).forEach(l=>{const m=(l['E MAIL']||'').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);if(m)out.email.push({valor:m[0].toLowerCase()});});
    tabela(S['ENDERECOS'],qual).forEach(l=>{if(l.ENDERECO)out.endereco.push(enderecoDe(l.ENDERECO,l.COMPLEMENTO,l.BAIRRO,l['CIDADE UF'],l.CEP,''));});
    tabela(S['PESSOAS LIGADAS'],(i,c)=>c&&c.chave==='IDADE'&&/^\d+$/.test(i.s.trim())).forEach(l=>{if(l.NOME)out.parentes.push({nome:l.NOME,cpf:cpfFmt(l.CPF),grau:grauBonito(l['GRAU DE PARENTESCO']),idade:Number(l.IDADE)||null});});
    out.historico=historicoProfissional(S['HISTORICO PROFISSIONAL']);
    return out;
  }
  /* 09/11: histórico profissional da Data Solution (vínculos de emprego). Cada vínculo ocupa várias linhas de texto;
     um vínculo e o seguinte ficam separados por um espaço vertical maior. Serve para o órgão e o cargo do perfil. */
  function historicoProfissional(itens){
    if(!itens||!itens.length)return [];
    const g0=itens[0].g;
    const cols=itens.filter(i=>i.g-g0<=4).sort((a,b)=>a.x-b.x).map(i=>({x:i.x,chave:semAcento(i.s).replace(/[^A-Z0-9]+/g,' ').trim()}));
    if(cols.length<3)return [];
    const fim=itens.find(i=>/informacao confidencial|sobre a date/i.test(semAcento(i.s).toLowerCase()));
    const corpo=itens.filter(i=>i.g-g0>4&&(!fim||i.g<fim.g)).sort((a,b)=>a.g-b.g||a.x-b.x);
    const linhas=[];let atual=null,ultimoG=-1e9;
    corpo.forEach(i=>{if(!atual||i.g-ultimoG>22){atual=[];linhas.push(atual);}atual.push(i);ultimoG=i.g;});
    const colDe=i=>{let r=cols[0];cols.forEach(c=>{if(i.x>=c.x-8)r=c;});return r;};
    const vazio=v=>!v||/^(NAO INFORMADO|NAO|INFORMADO|-|—)$/.test(semAcento(v));
    return linhas.map(l=>{
      const o={};cols.forEach(c=>{o[c.chave]=limpa(l.filter(i=>colDe(i)===c).sort((a,b)=>a.g-b.g||a.x-b.x).map(i=>i.s).join(' '));});
      const pega=re=>{const k=Object.keys(o).find(k=>re.test(k));return k&&!vazio(o[k])?o[k]:'';};
      const cnpj=digitos(pega(/^CNPJ/));
      const fan=pega(/^NOME FANTASIA/);const sig=!/\s/.test(fan)&&fan.length<=8?[semAcento(fan)]:[];
      return {cnpj:cnpj.length===14?cnpj:'',orgao:nomeBonito(pega(/^RAZAO/),sig),fantasia:nomeBonito(fan),cbo:digitos(pega(/^COD CBO|^CBO/)),cargo:fraseBonita(pega(/^DESCRICAO/))};
    }).filter(h=>h.orgao||h.fantasia||h.cargo);
  }
  /* Textos da consulta vêm em MAIÚSCULAS e sem acento: deixa legível ("POLICIA CIVIL DO ESTADO" -> "Polícia Civil do Estado") */
  const ACENTOS={MEDICO:'médico',MEDICA:'médica',POLICIA:'polícia',ESPIRITO:'espírito',GESTAO:'gestão',SAUDE:'saúde',EDUCACAO:'educação',
    PUBLICO:'público',PUBLICA:'pública',MINISTERIO:'ministério',JUSTICA:'justiça',PREVIDENCIA:'previdência',SEGURANCA:'segurança',
    ASSISTENCIA:'assistência',ADMINISTRACAO:'administração',FUNDACAO:'fundação',MUNICIPIO:'município',CAMARA:'câmara',TECNICO:'técnico',
    TECNICA:'técnica',BASICO:'básico',BASICA:'básica',MEDIO:'médio',MEDIA:'média',SERVICO:'serviço',SERVICOS:'serviços',ORGAO:'órgão',
    ECONOMICO:'econômico',ECONOMICA:'econômica',CIENCIA:'ciência',CIENCIAS:'ciências',TECNOLOGICO:'tecnológico',ACADEMICO:'acadêmico',
    SECRETARIO:'secretário',FARMACEUTICO:'farmacêutico',ODONTOLOGO:'odontólogo',FISCALIZACAO:'fiscalização',ARRECADACAO:'arrecadação',
    POLITICA:'política',REGIAO:'região',SAO:'são',PARAIBA:'paraíba',PIAUI:'piauí',AMAPA:'amapá',GOIAS:'goiás',CEARA:'ceará',
    MARANHAO:'maranhão',RONDONIA:'rondônia',AGENCIA:'agência',ENERGIA:'energia',INFORMATICA:'informática',ANALISE:'análise',
    TECNOLOGIA:'tecnologia',ENGENHARIA:'engenharia',ODONTOLOGIA:'odontologia',PSICOLOGO:'psicólogo',VETERINARIO:'veterinário',
    MECANICO:'mecânico',ELETRICISTA:'eletricista',CONTABIL:'contábil',JURIDICO:'jurídico',JURIDICA:'jurídica',DIRECAO:'direção',
    COORDENACAO:'coordenação',FUNCAO:'função',GRATIFICACAO:'gratificação',INSPECAO:'inspeção',AVIACAO:'aviação',COMUNICACAO:'comunicação'};
  const LIGACOES=['de','da','do','das','dos','e','em','a','o','para','com'];
  // siglas que ficam em maiúsculas (órgãos públicos, tribunais, UFs); palavra sem vogal também é sigla (TRT, STJ, PRF)
  const SIGLAS=new Set(('UFAL UFPE UFPB UFRN UFBA UFS UFC UFMG UFRJ UFF UNB USP UNICAMP UNESP IFAL IFPE IFRN IFPB IFBA INSS SUS IBGE IBAMA ICMBIO '
    +'INCRA DNIT DNOCS ANVISA DETRAN FUNASA FUNAI EBSERH CONAB EMBRAPA SERPRO DATAPREV CAIXA CEF ECT CBTU CHESF CASAL EMATER UNCISAL UNEAL '
    +'IPASEAL SEFAZ SEDUC SESAU SEGER SEPLAG SEMED SEMSA SEAD PCES PMAL PCAL PM PC PF PRF MPF MPT MPE MP TJ TJAL TRF TRT TRE TST STJ STF TCU TCE '
    +'AGU CGU PGFN PGE RFB LTDA SA ME EPP EIRELI RH TI AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP TO').split(' '));
  function palavraBonita(p,primeira,titulo,extraSiglas){
    const t=semAcento(p).replace(/[^A-Z0-9]/g,'');const base=ACENTOS[t]||p.toLowerCase();
    if(titulo&&t&&(SIGLAS.has(t)||(extraSiglas&&extraSiglas.has(t))||(t.length>=2&&!/[AEIOUY]/.test(t)&&!/\d/.test(t))))return p.toUpperCase();
    if(!primeira&&LIGACOES.indexOf(base)>=0)return base;
    return titulo||primeira?base.charAt(0).toUpperCase()+base.slice(1):base;
  }
  // nome de órgão/empresa: "POLICIA CIVIL DO ESTADO - PCES" -> "Polícia Civil do Estado - PCES" (a sigla depois do traço fica)
  function nomeBonito(v,extra){
    v=limpa(v);if(!v)return '';if(v!==v.toUpperCase())return v;
    const sig=new Set(extra||[]);const m=v.match(/\s-\s*([A-Z]{2,8})$/);if(m)sig.add(m[1]);
    if(!/\s/.test(v)&&v.length<=8)return v;   // sigla sozinha (SEGER)
    return v.split(/\s+/).map((p,i)=>palavraBonita(p,i===0,true,sig)).join(' ');
  }
  function fraseBonita(v){v=limpa(v);if(!v)return '';if(v!==v.toUpperCase())return v;return v.split(/\s+/).map((p,i)=>palavraBonita(p,i===0,false)).join(' ');}
  /* O que a consulta diz da própria pessoa (para preencher a ficha só onde está vazio). Fica de fora, de propósito
     (LGPD: só o necessário): renda, score, consumo, veículos, empresas e o "perfil sociodemográfico", que é estimado. */
  function dadosDaFicha(r){
    const d=(r&&r.dados)||{};const f={};
    const pega=(...ks)=>{for(const k of ks){const v=d[k];if(v&&!/^(—|-|NAO INFORMADO|CLIQUE PARA VER|NAO CONSTA)$/.test(semAcento(v)))return limpa(v);}return '';};
    const nome=pega('NOME','NOME COMPLETO');if(nome)f.nome=nome;
    const cpf=digitos(pega('CPF'));if(cpf.length===11)f.cpf=cpf;
    const nasc=pega('DATA DE NASC.','DATA DE NASCIMENTO','DATA NASCIMENTO','NASCIMENTO');
    const dn=(nasc.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/)||[])[0];if(dn)f.data_nascimento=dn;
    const idade=idadeDe(dn)||Number(((nasc+' '+pega('IDADE')).match(/(\d{1,3})\s*anos/i)||[])[1]);if(idade&&idade<130)f.idade=idade;
    const mae=pega('NOME DA MAE','MAE');if(mae&&mae.length>4)f.nome_mae=mae;
    const ob=semAcento(pega('FALECIDO?','FALECIDO','OBITO'));if(/^SIM/.test(ob))f.falecido=true;else if(/^NAO/.test(ob))f.falecido=false;
    if(/^SIM/.test(semAcento(pega('APOSENTADO'))))f.aposentado='sim';else if(/^SIM/.test(semAcento(pega('POSSIVEL APOSENTADO'))))f.aposentado='possivel';
    const ocup=pega('OCUPACAO');if(ocup&&ocup.length>2)f.profissao=fraseBonita(ocup);
    if(r&&Array.isArray(r.historico)&&r.historico.length)f.historico=r.historico;
    return f;
  }
  function idadeDe(dmy){const m=String(dmy||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return null;const d=new Date(+m[3],+m[2]-1,+m[1]);if(isNaN(d))return null;const h=new Date();let i=h.getFullYear()-d.getFullYear();if(h.getMonth()<d.getMonth()||(h.getMonth()===d.getMonth()&&h.getDate()<d.getDate()))i--;return i>=0&&i<130?i:null;}
  // devolve o mesmo formato do leitor geral (telefone, email, endereco, parentes), já sem repetidos
  function lerConsulta(itens){
    const txt=textoDosItens(itens);
    let r=null;
    if(/lemit/i.test(txt))r=lerLemit(itens);
    else if(/date\s*solutions|data\s*solution|dataadv/i.test(txt))r=lerDataSolution(itens);
    if(!r||(!r.telefone.length&&!r.email.length&&!r.endereco.length&&!r.parentes.length)){const g=extrair(txt);g.fonte=detectarFonte(txt);g.ficha=r?dadosDaFicha(r):{};return g;}
    const vistos=new Set();
    ['telefone','email','endereco'].forEach(t=>{r[t]=r[t].filter(o=>{const k=t+':'+chaveLocal(t,o);if(vistos.has(k))return false;vistos.add(k);return true;});});
    const vp=new Set();r.parentes=r.parentes.filter(p=>{const k=digitos(p.cpf)||semAcento(p.nome);if(vp.has(k))return false;vp.add(k);return true;});
    r.ficha=dadosDaFicha(r);
    return r;
  }
  function abrirLeitura(alvoInicial,opcoes){
    opcoes=opcoes||{};const ped=opcoes.pedido||null;
    const opAlvo='<option value="">'+e((state.cliente&&state.cliente.nome)||'Cliente')+' (o próprio cliente)</option>'+L.alvos.map(a=>'<option value="'+e(a.id)+'"'+(a.id===alvoInicial?' selected':'')+'>'+e(alvoRotulo(a.id))+'</option>').join('')+'<option value="__novo">+ Novo parente...</option>';
    const sub=ped?'Busca pedida por '+nomeUsuario(ped.pedido_por_id)+(ped.atendido_por_id?' e feita por '+nomeUsuario(ped.atendido_por_id):'')+'. Confira e grave só o que estiver certo.'
                 :'O SAGA lê o PDF aqui no navegador e não guarda o arquivo: ficam só os dados que você confirmar.';
    const d=janela(ped?'Conferir a busca de '+ped.nome:'Ler consulta de localização',sub,
      '<div class="loc2-ler-grade"><div class="form-field"><label>De quem é esta consulta?</label><select id="loc2LAlvo" class="pasta-select"'+(ped?' disabled':'')+'>'+opAlvo+'</select></div>'
      +'<div class="form-field" id="loc2LNovo" style="display:none"><label>Nome do parente</label><input id="loc2LNome" maxlength="200"><label style="margin-top:8px">Parentesco</label><select id="loc2LPar" class="pasta-select">'+opcoesParentesco('')+'</select></div></div>'
      +'<div class="loc2-zona" id="loc2Zona" tabindex="0" role="button"><b>Solte aqui o PDF da consulta</b><span>ou clique para escolher (Lemit, Data Solution...)</span><input type="file" id="loc2Arq" accept="application/pdf,.pdf,.txt" hidden></div>'
      +'<div class="form-field"><label>Ou cole o texto da consulta</label><textarea id="loc2Txt" rows="4" placeholder="Cole aqui o texto copiado do sistema de busca"></textarea></div>'
      +'<div id="loc2Rev"></div>','Ler',null,true);
    if(ped)d.dataset.pedido=ped.id;
    const salvarBtn=d.querySelector('[data-salvar]');
    const selAlvo=d.querySelector('#loc2LAlvo');
    if(ped)selAlvo.value=ped.alvo_id||'';
    selAlvo.addEventListener('change',()=>{d.querySelector('#loc2LNovo').style.display=selAlvo.value==='__novo'?'':'none';});
    ligarNovaOpcaoParentesco(d.querySelector('#loc2LPar'));
    const zona=d.querySelector('#loc2Zona'),arq=d.querySelector('#loc2Arq');let arquivo=null,revisao=null;
    const escolher=f=>{if(!f)return;arquivo=f;zona.innerHTML='<b>'+e(f.name)+'</b><span>'+Math.max(1,Math.round(f.size/1024))+' KB · clique em Ler</span>';zona.appendChild(arq);};
    zona.addEventListener('click',()=>arq.click());zona.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();arq.click();}});
    arq.addEventListener('change',()=>escolher(arq.files[0]));
    ['dragenter','dragover'].forEach(t=>zona.addEventListener(t,ev=>{ev.preventDefault();zona.classList.add('alvo');}));
    zona.addEventListener('dragleave',()=>zona.classList.remove('alvo'));
    zona.addEventListener('drop',ev=>{ev.preventDefault();zona.classList.remove('alvo');escolher(ev.dataTransfer.files[0]);});
    salvarBtn.addEventListener('click',async ev=>{
      ev.stopImmediatePropagation();
      if(revisao){await gravarRevisao(d,revisao);return;}
      let texto=d.querySelector('#loc2Txt').value;
      salvarBtn.disabled=true;salvarBtn.textContent='Lendo...';
      try{
        let dados=null;
        if(arquivo&&!/\.txt$/i.test(arquivo.name)){const itens=await itensDoPdf(arquivo);texto=textoDosItens(itens);if(texto.trim())dados=lerConsulta(itens);}
        else if(arquivo)texto=await arquivo.text();
        if(!texto||!texto.trim()){showToast('Escolha o PDF ou cole o texto da consulta.','warning');return;}
        if(!dados){dados=extrair(texto);dados.fonte=detectarFonte(texto);dados.ficha={};}
        const temFicha=itensFicha(d,dados).length>0;
        if(!dados.telefone.length&&!dados.email.length&&!dados.endereco.length&&!dados.parentes.length&&!temFicha){showToast(arquivo&&texto.trim().length<30?'Este PDF parece ser uma imagem (sem texto para ler). Cole o texto ou digite os contatos.':'Não encontrei telefone, e-mail ou endereço neste texto.','warning');return;}
        revisao=dados;arquivo=null;mostrarRevisao(d,dados);
        salvarBtn.textContent='Gravar selecionados';
      }catch(erro){showToast('Não foi possível ler: '+e(erro.message||''),'error');salvarBtn.textContent='Ler';}
      finally{salvarBtn.disabled=false;if(!revisao)salvarBtn.textContent='Ler';}
    },true);
    if(opcoes.arquivo){escolher(opcoes.arquivo);setTimeout(()=>salvarBtn.click(),60);}
  }
  /* "Dados da ficha": o que a consulta diz da própria pessoa e que ainda está VAZIO na ficha (nada é trocado sem a pessoa ver) */
  function perfilFicha(){const x=state.pessoaRow&&state.pessoaRow.dados_extra;const p=x&&typeof x==='object'&&!Array.isArray(x)?x.perfil:null;return p&&typeof p==='object'&&!Array.isArray(p)?p:{};}
  function nomeAposentado(){const o=L.cat.find(c=>c.categoria==='perfil_situacao_funcional'&&c.ativo&&/^APOSENTAD/.test(semAcento(c.nome)));return o?o.nome:'Aposentado';}
  function itensFicha(d,dados){
    const f=dados.ficha||{};const alvoSel=d.querySelector('#loc2LAlvo').value;const out=[];
    const item=(k,texto,marcado,aviso)=>out.push('<label class="loc2-rev-item'+(aviso?' aviso':'')+'"><input type="checkbox" data-rev="ficha" data-k="'+k+'"'+(marcado?' checked':'')+'><span>'+texto+'</span></label>');
    if(!alvoSel){
      const row=state.pessoaRow||{};const pf=perfilFicha();const vazio=k=>!String(pf[k]||'').trim();
      if(f.cpf&&!digitos(row.cpf))item('cpf_cliente','CPF: <b>'+e(cpfFmt(f.cpf))+'</b>',true);
      if(f.data_nascimento&&vazio('data_nascimento'))item('data_nascimento','Data de nascimento: <b>'+e(f.data_nascimento)+'</b>'+(idadeDe(f.data_nascimento)!=null?' <small>('+idadeDe(f.data_nascimento)+' anos)</small>':''),true);
      if(f.nome_mae&&vazio('nome_mae'))item('nome_mae','Nome da mãe: <b>'+e(f.nome_mae)+'</b>',true);
      const sv=row.situacao_vital||'nao_informado';
      if(f.falecido===true&&sv!=='falecido')item('vital','<b>Falecido(a)</b>, segundo a consulta'+(sv==='vivo'?' <small>a ficha diz "Vivo": confira antes de marcar</small>':''),sv!=='vivo',true);
      else if(f.falecido===false&&sv==='nao_informado')item('vital','Situação vital: <b>Vivo(a)</b> <small>a consulta não aponta óbito</small>',true);
      if(f.aposentado&&vazio('situacao_funcional'))item('aposentado','Situação funcional: <b>'+e(nomeAposentado())+'</b>'+(f.aposentado==='possivel'?' <small>a consulta diz "possível aposentado": confira</small>':''),f.aposentado==='sim',f.aposentado==='possivel');
      if(f.profissao&&vazio('profissao'))item('profissao','Profissão: <b>'+e(f.profissao)+'</b>',true);
      const hist=f.historico||[];
      if(hist.length&&(vazio('orgao')||vazio('cargo'))){
        let pad=hist.findIndex(h=>h.cargo);if(pad<0)pad=0;
        out.push('<div class="loc2-rev-hist"><small>Órgão e cargo (histórico profissional da consulta)'+(!vazio('orgao')||!vazio('cargo')?': só preenche o que está vazio':'')+'</small>'
          +hist.map((h,i)=>'<label class="loc2-rev-item"><input type="radio" name="loc2Hist" value="'+i+'"'+(i===pad?' checked':'')+'><span>'+e(h.orgao||h.fantasia||'Órgão não informado')+(h.cargo?' · <b>'+e(h.cargo)+'</b>':'')+(h.fantasia&&h.orgao&&h.fantasia!==h.orgao?' <small>'+e(h.fantasia)+'</small>':'')+'</span></label>').join('')
          +'<label class="loc2-rev-item"><input type="radio" name="loc2Hist" value=""><span>Não usar</span></label></div>');
      }
    }else{
      const a=L.alvos.find(x=>x.id===alvoSel)||{};
      if(f.cpf&&!digitos(a.cpf))item('cpf','CPF: <b>'+e(cpfFmt(f.cpf))+'</b>',true);
      if(f.idade&&!a.idade)item('idade','Idade: <b>'+e(f.idade)+' anos</b>',true);
      if(f.falecido===true&&!/falecid/i.test(a.observacao||''))item('falecido','<b>Falecido(a)</b>, segundo a consulta <small>(fica anotado no parente)</small>',true,true);
    }
    return out;
  }
  // a consulta é mesmo da pessoa certa? (nome e CPF da consulta x ficha)
  function avisoPessoa(d,dados){
    const f=dados.ficha||{};const alvoSel=d.querySelector('#loc2LAlvo').value;
    let nome='',cpf='';
    if(!alvoSel){nome=(state.cliente&&state.cliente.nome)||'';cpf=state.pessoaRow&&state.pessoaRow.cpf;}
    else if(alvoSel==='__novo'){nome=(d.querySelector('#loc2LNome')||{}).value||'';}
    else{const a=L.alvos.find(x=>x.id===alvoSel)||{};nome=a.nome||'';cpf=a.cpf;}
    const avisos=[];
    if(f.cpf&&digitos(cpf).length===11&&digitos(cpf)!==f.cpf){avisos.push('o CPF da consulta ('+cpfFmt(f.cpf)+') é diferente do CPF da ficha ('+cpfFmt(cpf)+')');d.dataset.cpfDiferente='1';}
    else if(f.nome&&nome&&semAcento(f.nome).replace(/\s+/g,' ')!==semAcento(nome).replace(/\s+/g,' '))avisos.push('o nome na consulta é "'+f.nome+'" e na ficha é "'+nome+'"');
    return avisos.length?'<div class="loc2-rev-alerta">Atenção: '+e(avisos.join('; '))+'. Confira se é a pessoa certa antes de gravar.'+(d.dataset.cpfDiferente?' Por isso os itens vieram desmarcados.':'')+'</div>':'';
  }
  function mostrarRevisao(d,dados){
    const alvoSel=d.querySelector('#loc2LAlvo').value;
    const existentes=new Set(L.contatos.filter(c=>(c.alvo_id||'')===(alvoSel==='__novo'?'#':alvoSel)).map(c=>c.tipo+':'+chaveLocal(c.tipo,c)));
    const linha=(tipo,o,i)=>{const ja=existentes.has(tipo+':'+chaveLocal(tipo,o));return '<label class="loc2-rev-item'+(ja?' ja':'')+'"><input type="checkbox" data-rev="'+tipo+'" data-i="'+i+'"'+(ja?' disabled':' checked')+'><span>'+e(tipo==='telefone'?fone(o.valor):tipo==='endereco'?[[o.logradouro,o.numero].filter(Boolean).join(', '),o.complemento].filter(Boolean).join(' - ')||o.valor:o.valor)+selosContato(Object.assign({tipo:tipo},o))+(tipo==='endereco'&&(o.cidade||o.cep||o.bairro)?' <small>'+e([o.bairro,[o.cidade,o.uf].filter(Boolean).join('/'),o.cep?cepFmt(o.cep):''].filter(Boolean).join(' · '))+'</small>':'')+(ja?' <small>já está na lista</small>':'')+'</span></label>';};
    const parJa=p=>L.alvos.some(a=>(digitos(a.cpf)&&digitos(a.cpf)===digitos(p.cpf))||semAcento(a.nome)===semAcento(p.nome));
    const grupo=(tipo,titulo)=>dados[tipo].length?'<div class="loc2-rev-grupo"><b>'+titulo+' ('+dados[tipo].length+')</b>'+dados[tipo].map((o,i)=>linha(tipo,o,i)).join('')+'</div>':'';
    const pars=dados.parentes.length?'<div class="loc2-rev-grupo"><b>Parentes ('+dados.parentes.length+')</b><small class="loc2-dica">Os novos já vêm marcados; depois dá para pedir a busca de cada um.</small>'+dados.parentes.map((p,i)=>{const ja=parJa(p);return '<label class="loc2-rev-item'+(ja?' ja':'')+'"><input type="checkbox" data-rev="parente" data-i="'+i+'"'+(ja?' disabled':' checked')+'><span>'+e(p.nome)+' <small>'+e(p.grau)+(p.idade?' · '+p.idade+' anos':'')+(p.cpf?' · CPF '+e((window.sagaFmt?sagaFmt.cpf(p.cpf):p.cpf)):'')+(ja?' · já está na lista':'')+'</small></span></label>';}).join('')+'</div>':'';
    const fichaItens=itensFicha(d,dados);
    const nomeFicha=!alvoSel?'do cliente':'do parente';
    const fichaHtml=fichaItens.length?'<div class="loc2-rev-grupo loc2-rev-ficha"><b>Dados '+nomeFicha+' que ainda estão vazios na ficha</b><small class="loc2-dica">Só preenche o que está em branco. Renda, score, consumo, veículos e empresas da consulta não entram no SAGA.</small>'+fichaItens.join('')+'</div>':'';
    const box=d.querySelector('#loc2Rev');
    d.querySelector('#loc2Zona').style.display='none';d.querySelector('#loc2Txt').closest('.form-field').style.display='none';d.querySelector('#loc2LAlvo').disabled=true;
    const novos=['telefone','email','endereco'].reduce((n,t)=>n+dados[t].filter(o=>!existentes.has(t+':'+chaveLocal(t,o))).length,0)+dados.parentes.filter(p=>!parJa(p)).length+fichaItens.length;
    delete d.dataset.cpfDiferente;
    box.innerHTML='<div class="loc2-rev">'+avisoPessoa(d,dados)+'<div class="loc2-rev-topo">Fonte: <b>'+e(dados.fonte)+'</b> · <b>'+novos+' informação(ões) nova(s)</b>; o que já estava na ficha aparece apagado e não é gravado de novo. Confira e desmarque o que não servir.</div>'+fichaHtml+grupo('telefone','Telefones')+grupo('email','E-mails')+grupo('endereco','Endereços')+pars+'</div>';
    if(d.dataset.cpfDiferente){box.querySelectorAll('[data-rev]').forEach(cb=>{cb.checked=false;});const nu=box.querySelector('input[name="loc2Hist"][value=""]');if(nu)nu.checked=true;}
  }
  // grava os "Dados da ficha" marcados (cliente: pessoas + perfil; parente: localizacao_alvos). Devolve o que mudou.
  async function gravarFicha(d,dados,alvo){
    const f=dados.ficha||{};const k=new Set(Array.from(d.querySelectorAll('[data-rev="ficha"]:checked')).map(cb=>cb.dataset.k));
    const hist=d.querySelector('input[name="loc2Hist"]:checked');const feitos=[];
    if(!k.size&&!(hist&&hist.value!==''))return feitos;
    if(!alvo){
      const lr=await _sb.from('pessoas').select('dados_extra,situacao_vital,cpf').eq('id',L.pessoa).maybeSingle();
      if(lr.error||!lr.data)throw (lr.error||new Error('cliente não encontrado'));
      const extra=lr.data.dados_extra&&typeof lr.data.dados_extra==='object'&&!Array.isArray(lr.data.dados_extra)?Object.assign({},lr.data.dados_extra):{};
      const pf=extra.perfil&&typeof extra.perfil==='object'&&!Array.isArray(extra.perfil)?Object.assign({},extra.perfil):{};
      const vazio=x=>!String(pf[x]||'').trim();const antes=JSON.stringify(pf);
      if(k.has('data_nascimento')&&f.data_nascimento&&vazio('data_nascimento')){pf.data_nascimento=f.data_nascimento;feitos.push('data de nascimento');}
      if(k.has('nome_mae')&&f.nome_mae&&vazio('nome_mae')){pf.nome_mae=f.nome_mae;feitos.push('nome da mãe');}
      if(k.has('profissao')&&f.profissao&&vazio('profissao')){pf.profissao=f.profissao;feitos.push('profissão');}
      if(k.has('aposentado')&&vazio('situacao_funcional')){pf.situacao_funcional=nomeAposentado();feitos.push('situação funcional');}
      if(hist&&hist.value!==''){const h=(f.historico||[])[Number(hist.value)];if(h){if(vazio('orgao')&&(h.orgao||h.fantasia)){pf.orgao=h.orgao||h.fantasia;feitos.push('órgão');}if(vazio('cargo')&&h.cargo){pf.cargo=h.cargo;feitos.push('cargo');}}}
      const payload={};
      if(JSON.stringify(pf)!==antes){extra.perfil=pf;payload.dados_extra=extra;}
      if(k.has('vital')&&typeof f.falecido==='boolean'){const sv=f.falecido?'falecido':'vivo';if(lr.data.situacao_vital!==sv&&!(sv==='vivo'&&lr.data.situacao_vital==='falecido')){payload.situacao_vital=sv;feitos.push('situação vital');}}
      if(k.has('cpf_cliente')&&f.cpf&&!digitos(lr.data.cpf)){payload.cpf=f.cpf;}
      if(Object.keys(payload).length){
        payload.atualizado_em=new Date().toISOString();
        let r=await _sb.from('pessoas').update(payload).eq('id',L.pessoa);
        if(r.error&&String(r.error.code)==='23505'&&payload.cpf){delete payload.cpf;showToast('O CPF da consulta já está em outra ficha: não foi gravado aqui. Confira se é a mesma pessoa.','warning');r=await _sb.from('pessoas').update(payload).eq('id',L.pessoa);}
        else if(payload.cpf&&!r.error)feitos.push('CPF');
        if(r.error)throw r.error;
        if(state.pessoaRow){Object.keys(payload).forEach(x=>{if(x!=='atualizado_em')state.pessoaRow[x]=payload[x];});}
        if(payload.situacao_vital&&state.cliente)state.cliente.situacaoVital=payload.situacao_vital;
        if(payload.cpf&&state.cliente)state.cliente.cpf=cpfFmt(payload.cpf);
        try{if(typeof renderHeaderCliente==='function')renderHeaderCliente();}catch(erro){}
      }
    }else{
      const a=L.alvos.find(x=>x.id===alvo)||{};const campos={};
      if(k.has('cpf')&&f.cpf&&!digitos(a.cpf)){campos.cpf=cpfFmt(f.cpf);feitos.push('CPF do parente');}
      if(k.has('idade')&&f.idade&&!a.idade){campos.idade=f.idade;feitos.push('idade do parente');}
      if(k.has('falecido')&&f.falecido===true&&!/falecid/i.test(a.observacao||'')){campos.observacao=('Falecido(a), segundo a consulta '+(dados.fonte||'')+' de '+new Date().toLocaleDateString('pt-BR')+'. '+(a.observacao||'')).trim().slice(0,500);feitos.push('falecimento do parente');}
      if(Object.keys(campos).length){const r=await _sb.from('localizacao_alvos').update(campos).eq('id',alvo);if(r.error)throw r.error;}
    }
    return feitos;
  }
  async function gravarRevisao(d,dados){
    const btn=d.querySelector('[data-salvar]');
    const hist=d.querySelector('input[name="loc2Hist"]:checked');
    if(!d.querySelector('[data-rev]:checked')&&!(hist&&hist.value!=='')){
      showToast(d.dataset.pedido?'Nada marcado para gravar. Se o PDF é de outra pessoa, feche e use "Devolver" no pedido de busca.':'Nada marcado para gravar.','warning');return;
    }
    btn.disabled=true;
    try{
      let alvo=d.querySelector('#loc2LAlvo').value||null;
      if(alvo==='__novo'){
        const nome=d.querySelector('#loc2LNome').value.trim();const par=d.querySelector('#loc2LPar').value;
        if(!nome){showToast('Digite o nome do parente.','warning');return;}
        const r=await _sb.from('localizacao_alvos').insert({pessoa_id:L.pessoa,nome:nome,parentesco_id:par&&par!=='__nova'?par:null,ordem:L.alvos.length+1}).select('id').single();
        if(r.error)throw r.error;alvo=r.data.id;
      }
      const linhas=[];
      d.querySelectorAll('[data-rev]:checked').forEach(cb=>{
        const t=cb.dataset.rev;if(t==='ficha'||t==='parente')return;
        const o=dados[t][Number(cb.dataset.i)];
        linhas.push(Object.assign({pessoa_id:L.pessoa,alvo_id:alvo,tipo:t,fonte:dados.fonte},o));
      });
      let gravados=0,repetidos=0;
      if(linhas.length){
        const r=await _sb.from('localizacao_contatos').insert(linhas);
        if(!r.error)gravados=linhas.length;
        else{for(const l of linhas){const r2=await _sb.from('localizacao_contatos').insert(l);if(!r2.error)gravados++;else if(r2.error.code==='23505')repetidos++;else throw r2.error;}}
      }
      const pars=Array.from(d.querySelectorAll('[data-rev="parente"]:checked')).map(cb=>dados.parentes[Number(cb.dataset.i)]);
      let novosPar=0;
      for(const p of pars){
        const grau=parentescos().find(x=>x.nome.toLowerCase().indexOf(String(p.grau).toLowerCase().slice(0,4))>=0);
        const r=await _sb.from('localizacao_alvos').insert({pessoa_id:L.pessoa,nome:p.nome,cpf:p.cpf,idade:p.idade||null,parentesco_id:grau?grau.id:null,ordem:L.alvos.length+1+novosPar});
        if(!r.error)novosPar++;
      }
      let feitos=[];
      try{feitos=await gravarFicha(d,dados,alvo);}catch(erro){showToast('Os contatos foram gravados, mas os dados da ficha não: '+e(erro.message||''),'warning');}
      const pedido=d.dataset.pedido||null;
      if(pedido){const rc=await _sb.rpc('pedido_busca_conferido',{p_id:pedido});if(rc.error)showToast('Gravado, mas não deu para marcar a busca como conferida: '+e(rc.error.message||''),'warning');}
      L.abertos.add(alvo||'cliente');
      d.remove();
      await recarregar();
      showToast(gravados+' contato(s) gravado(s)'+(repetidos?', '+repetidos+' já estavam na lista':'')+(novosPar?', '+novosPar+' parente(s) incluído(s)':'')+(feitos.length?'; na ficha: '+e(feitos.join(', ')):'')+'.'+(pedido?' Busca marcada como conferida.':' O PDF não foi guardado.'),'success');
    }catch(erro){showToast('Não foi possível gravar: '+e(erro.message||''),'error');}
    finally{btn.disabled=false;}
  }

  /* ---------------- estilos ---------------- */
  const css=document.createElement('style');
  css.textContent=
   '.loc2{display:flex;flex-direction:column;gap:14px;padding:4px 0 20px}.loc2-vazio{padding:30px;color:var(--muted);text-align:center;font-size:12px}'
  +'.loc2-topo{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;justify-content:space-between}.loc2-topo h2{margin:0;font-family:"Cormorant Garamond",serif;font-size:26px;color:var(--text)}.loc2-topo p{margin:3px 0 0;color:var(--muted);font-size:11.5px}.loc2-topo-botoes{display:flex;gap:8px;flex-wrap:wrap}'
  +'.loc2-alvo{border:1px solid var(--border-soft);border-radius:14px;background:color-mix(in srgb,var(--text) 2%,transparent);overflow:hidden}.loc2-alvo-cab{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;user-select:none}.loc2-alvo-cab:hover{background:color-mix(in srgb,var(--text) 4%,transparent)}'
  +'.loc2-seta{display:inline-block;width:14px;color:var(--muted);font-size:18px;line-height:1;transition:transform .22s cubic-bezier(.3,1.4,.5,1)}.loc2-alvo.aberto .loc2-seta{transform:rotate(90deg)}.loc2-alvo-nome{flex:1;min-width:0;display:flex;flex-direction:column}.loc2-alvo-nome b{color:var(--text);font-size:13px}.loc2-alvo-nome small{color:var(--muted);font-size:10.5px}.loc2-alvo-conta{color:var(--muted);font-size:10.5px;white-space:nowrap}.loc2-alvo-conta .ok{color:var(--success,#16a34a)}'
  +'.loc2-alvo-corpo{display:none;padding:2px 14px 14px;gap:14px;flex-direction:column}.loc2-alvo.aberto .loc2-alvo-corpo{display:flex;animation:pastaAbre .26s cubic-bezier(.2,1.2,.4,1)}'
  +'.loc2-grupo-tit{display:flex;align-items:center;gap:7px;margin-bottom:6px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}.loc2-grupo-tit span{padding:0 6px;border-radius:6px;background:color-mix(in srgb,var(--text) 7%,transparent)}.loc2-nada{color:var(--muted);font-size:10.5px;font-style:italic;padding:2px 0 4px}'
  +'.loc2-add{margin-left:auto;padding:4px 9px;border:1px dashed color-mix(in srgb,var(--gold) 45%,transparent);border-radius:8px;background:transparent;color:var(--gold);font:inherit;font-size:10px;font-weight:700;letter-spacing:0;text-transform:none;cursor:pointer}.loc2-hist .loc2-add{margin:8px 0 0}'
  +'.loc2-mini{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--muted);font-size:16px;cursor:pointer}.loc2-mini:hover{background:color-mix(in srgb,var(--text) 8%,transparent)}'
  +'.loc2-contato{position:relative;display:flex;flex-direction:column;gap:7px;margin-bottom:7px;padding:10px 11px 10px 14px;border:1px solid var(--border-soft);border-radius:11px;background:var(--panel-solid,transparent)}.loc2-contato::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:4px;border-radius:0 4px 4px 0;background:var(--st)}'
  +'.loc2-contato-linha{display:flex;align-items:flex-start;gap:10px;justify-content:space-between}.loc2-valor{min-width:0;display:flex;flex-direction:column;gap:2px}.loc2-valor b{color:var(--text);font-size:12.5px;word-break:break-word}.loc2-valor small{color:var(--muted);font-size:9.5px}.loc2-end-sep{color:var(--text)!important;opacity:.8}'
  +'.loc2-status{flex:0 0 auto;max-width:56%;display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border:1px solid color-mix(in srgb,var(--st) 45%,transparent);border-radius:999px;background:color-mix(in srgb,var(--st) 13%,transparent);color:var(--text);font:inherit;font-size:10.5px;font-weight:700;cursor:pointer;text-align:left}.loc2-status i{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:var(--st)}.loc2-status span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.loc2-status em{font-style:normal;opacity:.6}.loc2-status:disabled{cursor:default}'
  +'.loc2-contato-linha2{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.loc2-acoes{display:flex;flex-wrap:wrap;gap:5px}.loc2-acao{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--border-soft);border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:10px;font-weight:600;text-decoration:none;cursor:pointer}.loc2-acao:hover{border-color:var(--gold);color:var(--gold)}.loc2-acao:active{transform:scale(.95)}.loc2-acao.perigo:hover{border-color:var(--danger);color:var(--danger)}.loc2-acao.tentativa b{padding:0 5px;border-radius:6px;background:color-mix(in srgb,#d97706 20%,transparent);color:#d97706}'
  +'.loc2-obs{flex:1;min-width:160px;padding:6px 9px;border:1px solid var(--border-soft);border-radius:8px;background:color-mix(in srgb,var(--text) 3%,transparent);color:var(--text);font:inherit;font-size:10.5px}.loc2-obs:focus{outline:none;border-color:var(--gold)}.loc2-obs-ro{color:var(--muted);font-size:10.5px}'
  +'.loc2-hist{padding:12px 14px;border:1px solid var(--border-soft);border-radius:14px}.loc2-hist-item{display:flex;flex-direction:column;gap:1px;padding:6px 0;border-bottom:1px solid color-mix(in srgb,var(--text) 6%,transparent);font-size:11px;color:var(--text)}.loc2-hist-item:last-of-type{border-bottom:0}.loc2-hist-quem{color:var(--muted);font-size:9.5px}'
  +'.loc2-pop{position:fixed;z-index:4600;max-height:70vh;overflow:auto;min-width:230px;padding:5px;border:1px solid var(--border-soft);border-radius:12px;background:var(--panel-solid,var(--bg));box-shadow:0 16px 36px rgba(0,0,0,.3);animation:pastaMenu .2s cubic-bezier(.2,1.3,.4,1)}.loc2-pop button{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:8px;background:transparent;color:var(--text);font:inherit;font-size:11px;text-align:left;cursor:pointer}.loc2-pop button:hover,.loc2-pop button.ativo{background:color-mix(in srgb,var(--text) 7%,transparent)}.loc2-pop button i{width:9px;height:9px;flex:0 0 auto;border-radius:50%}.loc2-pop button small{margin-left:auto;color:var(--muted);font-size:9px}.loc2-pop button.perigo{color:var(--danger)}.loc2-pop hr{margin:4px 2px;border:0;border-top:1px solid var(--border-soft)}'
  +'.loc2-modal-larga{max-width:640px!important;width:100%}.loc2-ler-grade{display:grid;gap:10px}.loc2-zona{display:flex;flex-direction:column;align-items:center;gap:4px;margin:4px 0 12px;padding:22px 12px;border:1.5px dashed color-mix(in srgb,var(--gold) 45%,transparent);border-radius:12px;color:var(--muted);font-size:11px;text-align:center;cursor:pointer}.loc2-zona b{color:var(--text);font-size:12px}.loc2-zona.alvo{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 8%,transparent)}'
  +'.loc2-rev{display:flex;flex-direction:column;gap:12px;max-height:46vh;overflow:auto}.loc2-rev-topo{font-size:11px;color:var(--muted)}.loc2-rev-grupo{display:flex;flex-direction:column;gap:3px}.loc2-rev-grupo>b{font-size:11px;color:var(--text);margin-bottom:2px}.loc2-rev-item{display:flex;align-items:flex-start;gap:8px;padding:5px 6px;border-radius:7px;font-size:11.5px;color:var(--text);cursor:pointer}.loc2-rev-item:hover{background:color-mix(in srgb,var(--text) 5%,transparent)}.loc2-rev-item small{color:var(--muted);font-size:9.5px}.loc2-rev-item.ja{opacity:.55}.loc2-dica{color:var(--muted);font-size:10px;margin:2px 0 4px}'
  +'.loc2-end-grade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 10px}.loc2-end-grade .g2{grid-column:span 2}'
  +'.loc2-ger{display:flex;align-items:center;gap:6px;margin-bottom:6px}.loc2-ger input[type=color]{width:30px;height:28px;padding:0;border:1px solid var(--border-soft);border-radius:6px;background:none}.loc2-ger input[type=text]{flex:1;min-width:0;padding:6px 8px;border:1px solid var(--border-soft);border-radius:7px;background:color-mix(in srgb,var(--text) 4%,transparent);color:var(--text);font:inherit;font-size:11px}.loc2-ger small{color:var(--muted);font-size:9px}.loc2-ger button{width:28px;height:28px;border:1px solid var(--border-soft);border-radius:7px;background:transparent;color:var(--muted);cursor:pointer}.loc2-ger button:disabled{opacity:.3}.loc2-ger button.perigo:hover{color:var(--danger);border-color:var(--danger)}'
  +'.loc2-selo{display:inline-block;margin-left:4px;padding:1px 7px;border-radius:999px;border:1px solid var(--border-soft);color:var(--muted);font-size:9.5px;font-weight:700;vertical-align:1px;text-transform:none}.loc2-selo.wz{color:#16a34a;border-color:color-mix(in srgb,#16a34a 45%,transparent);background:color-mix(in srgb,#16a34a 10%,transparent)}.loc2-selo.sem{color:var(--muted)}.loc2-selo.np{color:var(--danger,#e5484d);border-color:color-mix(in srgb,var(--danger,#e5484d) 45%,transparent)}.loc2-selo.q{font-weight:600}'
  +'.loc2-wz{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--muted);margin-left:2px}.loc2-acao.ativo-sim{border-color:#16a34a;color:#16a34a;background:color-mix(in srgb,#16a34a 10%,transparent)}.loc2-acao.ativo-nao{border-color:var(--danger,#e5484d);color:var(--danger,#e5484d)}'
  +'.loc2-carta{color:var(--gold-light)!important;border-color:color-mix(in srgb,var(--gold) 45%,transparent)!important}.loc2-carta.na-fila{opacity:.75;border-style:dashed!important}'
  +'.loc2-pb-item{position:relative;display:flex;flex-direction:column;gap:7px;margin-top:8px;padding:10px 11px 10px 14px;border:1px solid var(--border-soft);border-radius:11px;background:var(--panel-solid,transparent);transition:border-color .32s cubic-bezier(.22,.78,.25,1),box-shadow .32s cubic-bezier(.22,.78,.25,1)}'
  +'.loc2-pb-item::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:4px;border-radius:0 4px 4px 0;background:var(--pbc,#8a94a8)}'
  +'.loc2-pb-item.destaque{border-color:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 22%,transparent)}'
  +'.loc2-pb-item .loc2-valor small{display:block}.loc2-pb-resp{color:var(--text)!important;opacity:.85}.loc2-pb-ok{color:var(--success,#16a34a)!important}'
  +'.st-a_fazer{--pbc:#d97706}.st-em_andamento{--pbc:#2563eb}.st-pronto{--pbc:#16a34a}.st-nao_encontrado{--pbc:#e5484d}.st-cancelado{--pbc:#8a94a8}'
  +'.loc2-pb-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border:1px solid color-mix(in srgb,var(--pbc) 45%,transparent);border-radius:999px;background:color-mix(in srgb,var(--pbc) 12%,transparent);color:var(--text);font-size:10px;font-weight:600;white-space:nowrap}'
  +'.loc2-alvo-cab .loc2-pb-chip{margin-left:auto}.loc2-pb-ler{border-color:color-mix(in srgb,var(--gold) 45%,transparent)!important;color:var(--gold-light,var(--gold))!important}'
  +'.loc2-pb-lista{display:flex;flex-direction:column;gap:2px;max-height:34vh;overflow:auto}.loc2-pb-fontes{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.loc2-pb-fonte{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--border-soft);border-radius:999px;font-size:11px;color:var(--text);cursor:pointer}.loc2-pb-fonte:has(input:checked){border-color:color-mix(in srgb,var(--gold) 55%,transparent);background:color-mix(in srgb,var(--gold) 10%,transparent)}.loc2-pb-fontes .loc2-add{margin-left:0}'
  +'.loc2-pb-bloco{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.loc2-pb-tit{color:var(--gold);font-size:9px;font-weight:700;letter-spacing:.65px;text-transform:uppercase}.loc2-pb-bloco .loc2-rev-item small{color:var(--muted);font-size:10px}.loc2-pb-fonte input,.loc2-pb-lista input,.loc2-pb-bloco input[type=checkbox]{width:auto;accent-color:var(--gold)}'
  +'.loc2-rev-alerta{padding:8px 10px;border:1px solid color-mix(in srgb,#d97706 50%,transparent);border-radius:9px;background:color-mix(in srgb,#d97706 10%,transparent);color:var(--text);font-size:11px}'
  +'.loc2-rev-item.aviso>span{color:var(--text)}.loc2-rev-item.aviso small{color:#d97706}.loc2-rev-ficha{padding:8px 10px;border:1px solid var(--border-soft);border-radius:10px;background:color-mix(in srgb,var(--gold) 5%,transparent)}.loc2-rev-hist{display:flex;flex-direction:column;gap:2px;margin-top:4px}.loc2-rev-hist>small{color:var(--muted);font-size:10px}'
  +'@media(max-width:760px){.loc2-contato-linha{flex-direction:column}.loc2-status{max-width:100%}.loc2-end-grade{grid-template-columns:1fr 1fr}.loc2-alvo-conta{display:none}}';
  document.head.appendChild(css);

  window.SagaLocalizacao={render:render,recarregar:recarregar,extrair:extrair,separarEndereco:separarEndereco,lerConsulta:lerConsulta,itensDoPdf:itensDoPdf,abrirPedido:abrirPedido,lerPedido:lerPedido,pedirBusca:abrirPedirBusca,_L:L};
  window.renderLocalizationView=render;
})();
