/* =====================================================================
   SAGA · Teses e oportunidades > Devedores/PGFN (Dívida Ativa da União, PGFN; blocos 445, 447 e 448)
   Um registro por devedor (soma das inscrições): quanto deve, quanto está em execução fiscal,
   já negociado/parcelado, em negociação, parcelamento rescindido, protesto, garantia, suspenso.
   Tese: transação tributária. Base trimestral da PGFN (CPF mascarado na origem; CNPJ inteiro).
   Alcance (23/11): Alagoas inteira + Brasil com R$ 100 mil ou mais. Só o administrador geral.
   ===================================================================== */
(function(global){
  'use strict';
  var B=global.SagaBasesPublicas;if(!B)return;var u=B.u,esc=u.esc;
  var NEG={sem_negociacao_nao_ajuizado:'Sem negociação e sem execução',ajuizado_sem_negociacao:'Com execução e sem negociação',
    parte_negociada:'Parte negociada',tudo_negociado:'Tudo negociado'};
  var NEG_COR={sem_negociacao_nao_ajuizado:'dest',ajuizado_sem_negociacao:'amar',parte_negociada:'',tudo_negociado:'ok'};
  var UFS=['','AL','AC','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  function papel(l){var p=[];if(l.principal)p.push('principal');if(l.corresponsavel)p.push('corresponsável');if(l.solidario)p.push('solidário');return p.join(', ');}
  function tipo(l){return l.tipo_pessoa==='pj'?'Empresa':'Pessoa física';}
  var cfg={
    id:'bpDev',pane:'aba-devedores',botao:'abaDevedores',base:'devedores',titulo:'Devedores/PGFN (Dívida Ativa da União)',arquivo:'devedores-pgfn',
    subtituloPdf:'PGFN Dados Abertos',tituloLista:'Devedores/PGFN',palavra:['devedor','devedores'],
    rpcPainel:'pgfn_painel',rpcListar:'pgfn_listar',rpcCruzar:'pgfn_cruzar',
    filtroInicial:{uf:'AL'},
    textoCruzar:function(d){return u.num(d.certos)+' clientes certos (nome + 6 dígitos do CPF), '+u.num(d.a_conferir)+' a conferir (só o nome), '+u.num(d.empresas)+' empresas pelo CNPJ';},
    numeros:function(p){var n=p.por_negocio||{};function q(k){return (n[k]||{}).n||0;}
      return [
        {t:'Devedores na base',v:u.num(p.total),sub:'base '+(p.trimestre||'').replace('T','º tri/').replace(/^(\d{4})º tri\/(\d)$/,'$2º tri/$1')},
        {t:'Em Alagoas',v:u.num(p.al),filtro:{uf:'AL'}},
        {t:'Pessoas físicas',v:u.num(p.pf),filtro:{tipo:'pf'}},
        {t:'Empresas',v:u.num(p.pj),filtro:{tipo:'pj'}},
        {t:'Sem negociação e sem execução',v:u.num(q('sem_negociacao_nao_ajuizado')),filtro:{negocio:'sem_negociacao_nao_ajuizado'}},
        {t:'Com execução e sem negociação',v:u.num(q('ajuizado_sem_negociacao')),filtro:{negocio:'ajuizado_sem_negociacao'}},
        {t:'Parte negociada',v:u.num(q('parte_negociada')),filtro:{negocio:'parte_negociada'}},
        {t:'Tudo negociado',v:u.num(q('tudo_negociado')),filtro:{negocio:'tudo_negociado'}},
        {t:'Com parcelamento rescindido',v:u.num(p.com_rescindido),sub:'bom alvo para a transação',filtro:{rescindido:true}},
        {t:'Clientes do SAGA',v:u.num(p.clientes),filtro:{cliente:'sim'}},
        {t:'A conferir (só o nome)',v:u.num(p.a_conferir),filtro:{cliente:'conferir'}}];},
    filtros:[
      {k:'busca',tipo:'busca',label:'Nome, CNPJ ou 6 dígitos do CPF'},
      {k:'uf',tipo:'select',label:'UF',opcoes:UFS.map(function(x){return [x,x||'Todas as UFs'];})},
      {k:'tipo',tipo:'select',label:'Pessoa',opcoes:[['','PF e PJ'],['pf','Pessoa física'],['pj','Empresa']]},
      {k:'negocio',tipo:'select',label:'Situação',opcoes:[['','Qualquer situação']].concat(Object.keys(NEG).map(function(k){return [k,NEG[k]];}))},
      {k:'ajuizado',tipo:'select',label:'Execução fiscal',opcoes:[['','Com ou sem execução'],['sim','Com execução fiscal'],['nao','Sem execução fiscal']]},
      {k:'valor_de',tipo:'reais',label:'Deve a partir de'},
      {k:'valor_ate',tipo:'reais',label:'até'},
      {k:'cliente',tipo:'select',label:'No SAGA',opcoes:[['','Clientes ou não'],['nao','Não é cliente'],['sim','Já é cliente'],['conferir','A conferir (nome)']]},
      {k:'papel',tipo:'select',label:'Papel',opcoes:[['','Principal ou corresponsável'],['principal','Devedor principal'],['corresponsavel','Corresponsável (sócio)']]},
      {k:'ordem',tipo:'select',label:'Ordem',opcoes:[['','Maior dívida primeiro'],['antiga','Inscrição mais antiga'],['nome','Nome']]},
      {k:'rescindido',tipo:'chk',label:'Só com parcelamento rescindido'}],
    colunas:[
      {t:'Devedor',html:function(l){return '<b>'+esc(l.nome)+'</b><span class="bp-sub">'+esc(tipo(l))+' · '+esc(l.documento||'')+' · '+esc(papel(l))+'</span>'+u.htmlContato(l);}},
      {t:'UF',html:function(l){return esc(l.uf||'');}},
      {t:'Deve',n:true,html:function(l){return esc(u.reais(l.valor_total))+'<span class="bp-sub">'+u.num(l.n_inscricoes)+' inscrições</span>';}},
      {t:'Em execução',n:true,html:function(l){return l.valor_ajuizado>0?esc(u.reaisCurto(l.valor_ajuizado)):'—';}},
      {t:'Negociado',n:true,html:function(l){return l.valor_beneficio>0?esc(u.reaisCurto(l.valor_beneficio)):'—';}},
      {t:'Situação',html:function(l){return '<span class="bp-chip '+(NEG_COR[l.situacao_negocio]||'')+'">'+esc(NEG[l.situacao_negocio]||l.situacao_negocio)+'</span>'+(l.valor_rescindido>0?'<span class="bp-chip amar">parcelamento rescindido</span>':'')+(l.valor_em_negociacao>0?'<span class="bp-chip">em negociação</span>':'')+(l.na_pgfn===false?'<span class="bp-chip">saiu da última base</span>':'');}},
      {t:'No SAGA',html:function(l){return u.htmlFicha(l);}}],
    detalhe:function(l){
      function linha(t,v){return '<tr><td>'+esc(t)+'</td><td class="n">'+esc(u.reais(v))+'</td></tr>';}
      return Promise.resolve('<div style="display:flex;gap:18px;flex-wrap:wrap">'+
        '<div style="flex:1 1 260px;min-width:0"><b>Valores (soma das inscrições)</b><table class="bp-mini"><tbody>'+
        linha('Total',l.valor_total)+linha('Dívida geral (SIDA)',l.valor_sida)+linha('Previdenciária',l.valor_previdenciario)+linha('FGTS',l.valor_fgts)+
        linha('Em execução fiscal ('+l.n_ajuizadas+' inscrições)',l.valor_ajuizado)+linha('Negociado / parcelado / benefício fiscal',l.valor_beneficio)+
        linha('Em negociação (pedido aberto)',l.valor_em_negociacao)+linha('Parcelamento rescindido',l.valor_rescindido)+linha('Encaminhado a protesto',l.valor_protesto)+
        linha('Garantido (seguro, depósito, penhora)',l.valor_garantia)+linha('Suspenso por decisão judicial',l.valor_suspenso)+linha('Em cobrança',l.valor_em_cobranca)+'</tbody></table></div>'+
        '<div style="flex:1 1 260px;min-width:0"><b>Maiores receitas</b><table class="bp-mini"><tbody>'+(l.receitas||[]).map(function(r){return '<tr><td>'+esc(r.receita)+'</td><td class="n">'+esc(u.reais(r.valor))+'</td></tr>';}).join('')+'</tbody></table>'+
        '<p class="bp-sub" style="margin-top:8px">Inscrição mais antiga: '+esc(u.dataBR(l.inscricao_mais_antiga)||'—')+' · mais recente: '+esc(u.dataBR(l.inscricao_mais_recente)||'—')+'. Base '+esc(l.trimestre||'')+' da PGFN (foto do fim do trimestre): quem negociou depois disso só aparece na próxima base. Antes de qualquer contato, conferir na consulta pública da PGFN.</p></div></div>');
    },
    csv:{cab:['Nome','Pessoa','CPF/CNPJ (como vem da PGFN)','UF','Papel','Deve (R$)','Em execução (R$)','Negociado (R$)','Em negociação (R$)','Parcelamento rescindido (R$)','Situação','Inscrições','Inscrição mais antiga','Base'],
      linha:function(l){return [l.nome,tipo(l),l.documento,l.uf,papel(l),l.valor_total,l.valor_ajuizado,l.valor_beneficio,l.valor_em_negociacao,l.valor_rescindido,NEG[l.situacao_negocio]||l.situacao_negocio,l.n_inscricoes,u.dataBR(l.inscricao_mais_antiga),l.trimestre];}},
    pdf:{cab:['Devedor','Pessoa','UF','Deve','Em execução','Negociado','Situação','No SAGA'],num:[false,false,false,true,true,true,false,false],
      linha:function(l){return [l.nome,tipo(l),l.uf,u.reais(l.valor_total),u.reais(l.valor_ajuizado),u.reais(l.valor_beneficio),NEG[l.situacao_negocio]||'',l.pessoa_codigo||''];}},
    htmlRodape:function(p){var c=(p.cargas||[])[0];return '<div class="bp-bloco"><h3>De onde vêm os dados</h3><p class="bp-sub" style="font-size:12px;line-height:1.55">PGFN Dados Abertos (dívida geral, previdenciária e FGTS), atualizada a cada trimestre (a base sai ~3 semanas depois do fim do trimestre). '+
      'O CPF vem mascarado pela própria PGFN (só os 6 dígitos do meio); a ligação com as fichas usa nome completo + esses 6 dígitos. Não dá para separar transação de parcelamento comum (os dois aparecem como "negociado"). '+
      (c?'Última carga: '+esc(c.trimestre)+' em '+esc(u.dataHora(c.recebido_em))+(c.ok===false?' <b style="color:var(--danger,#d6452d)">com erro: '+esc(c.erro||'')+'</b>':'')+'.':'')+'</p></div>';}
  };
  global.SagaBaseDevedores=B.criar(cfg);
})(window);
