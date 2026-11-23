/* =====================================================================
   SAGA · Teses e oportunidades > Médicos (CNES do Ministério da Saúde + Mais Médicos; blocos 446 a 448)
   Todos os médicos com vínculo em Alagoas desde 2020 (desenho pronto para o Brasil), cada vínculo
   com "de quando a quando". Teses: contribuição ao INSS paga a maior (2+ vínculos com contribuição),
   auxílio-moradia da residência médica, FIES (Mais Médicos/SUS) e outras. O CNES aberto NÃO traz
   CPF nem CRM: a ligação com as fichas é só pelo nome (sempre "a conferir"). Só o administrador geral.
   ===================================================================== */
(function(global){
  'use strict';
  var B=global.SagaBasesPublicas;if(!B)return;var u=B.u,esc=u.esc;
  var CAT={clt:'CLT',estatutario:'Estatutário',temporario:'Temporário',empregado_publico:'Empregado público',comissionado:'Comissionado',
    autonomo_pf:'Autônomo (pessoa física)',autonomo_pj:'Autônomo (empresa)',intermediado_pj:'Intermediado por empresa',cooperado:'Cooperado',
    residencia:'Residência médica',bolsa:'Bolsa',estagio:'Estágio',informal:'Informal',cedido:'Cedido',outro:'Outro'};
  var UFS=['','AL','AC','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
  function periodo(a,b){return a?(u.comp(a)+(b&&b!==a?' a '+u.comp(b):'')):'—';}
  var cfg={
    id:'bpMed',pane:'aba-medicos',botao:'abaMedicos',base:'medicos',titulo:'Médicos (CNES)',arquivo:'medicos-cnes',
    subtituloPdf:'CNES do Ministério da Saúde',tituloLista:'Médicos',palavra:['médico','médicos'],
    rpcPainel:'medicos_painel',rpcListar:'medicos_listar',rpcCruzar:'medicos_cruzar',
    filtroInicial:{uf:'AL'},
    textoCruzar:function(d){return u.num(d.a_conferir)+' médicos com o mesmo nome de uma ficha (a conferir: o CNES não traz CPF)';},
    numeros:function(p){return [
      {t:'Médicos na base',v:u.num(p.total),sub:'CNES '+u.comp(p.primeira_comp)+' a '+u.comp(p.ultima_comp)},
      {t:'Com vínculo em Alagoas',v:u.num(p.al),filtro:{uf:'AL'}},
      {t:'2+ vínculos com contribuição agora',v:u.num(p.multi_agora),sub:'tese do INSS pago a maior',filtro:{min_contrib:2}},
      {t:'2+ vínculos em algum mês',v:u.num(p.multi_algum_mes),filtro:{multi_algum_mes:true}},
      {t:'Fizeram residência',v:u.num(p.residencia),sub:'auxílio-moradia',filtro:{residencia:true}},
      {t:'No Mais Médicos',v:u.num(p.mais_medicos),sub:'FIES / atuação no SUS',filtro:{mais_medicos:true}},
      {t:'Em mais de uma UF',v:u.num(p.varias_ufs),sub:'conferir homônimo'},
      {t:'Mesmo nome de uma ficha',v:u.num(p.a_conferir),sub:'a conferir',filtro:{cliente:'conferir'}}];},
    filtros:[
      {k:'busca',tipo:'busca',label:'Nome ou CRM'},
      {k:'uf',tipo:'select',label:'UF',opcoes:UFS.map(function(x){return [x,x||'Todas as UFs'];})},
      {k:'min_contrib',tipo:'select',label:'Vínculos com contribuição',opcoes:[['','Qualquer nº de vínculos'],['2','2 ou mais agora'],['3','3 ou mais agora']]},
      {k:'categoria',tipo:'select',label:'Tipo de vínculo',opcoes:[['','Qualquer tipo de vínculo']].concat(Object.keys(CAT).map(function(k){return [k,CAT[k]];}))},
      {k:'cliente',tipo:'select',label:'No SAGA',opcoes:[['','Clientes ou não'],['nao','Sem ficha'],['conferir','Mesmo nome de uma ficha']]},
      {k:'ordem',tipo:'select',label:'Ordem',opcoes:[['','Mais vínculos primeiro'],['antigo','No CNES há mais tempo'],['nome','Nome']]},
      {k:'multi_algum_mes',tipo:'chk',label:'2+ vínculos em algum mês'},
      {k:'residencia',tipo:'chk',label:'Fez residência'},
      {k:'mais_medicos',tipo:'chk',label:'Mais Médicos'},
      {k:'so_no_cnes',tipo:'chk',label:'Só quem ainda está no CNES'}],
    colunas:[
      {t:'Médico',html:function(l){return '<b>'+esc(l.nome)+'</b><span class="bp-sub">'+esc(l.cbo_principal||'')+(l.crm?' · CRM '+esc(l.crm)+'/'+esc(l.crm_uf||''):'')+'</span>'+u.htmlContato(l);}},
      {t:'Onde',html:function(l){return esc(l.municipio_principal||'')+'<span class="bp-sub">'+esc((l.ufs||[]).join(', '))+'</span>'+((l.ufs||[]).length>1?'<span class="bp-chip amar">mais de uma UF</span>':'');}},
      {t:'Vínculos agora',n:true,html:function(l){return u.num(l.n_vinculos_atual)+'<span class="bp-sub">'+u.num(l.n_vinculos_contrib_atual)+' com contribuição</span>';}},
      {t:'2+ com contribuição',html:function(l){return l.multi_desde?'<span class="bp-chip dest">'+esc(periodo(l.multi_desde,l.multi_ate))+'</span>':'—';}},
      {t:'Marcas',html:function(l){return (l.teve_residencia?'<span class="bp-chip">residência '+esc(periodo(l.residencia_de,l.residencia_ate))+'</span>':'')+(l.mais_medicos?'<span class="bp-chip ok">Mais Médicos</span>':'')+(l.no_cnes===false?'<span class="bp-chip">saiu do CNES</span>':'');}},
      {t:'No SAGA',html:function(l){return u.htmlFicha(l);}}],
    detalhe:async function(l){
      var r=await global._sb.rpc('medico_vinculos',{p_medico:l.id});if(r.error)throw r.error;var vs=r.data||[];
      return '<b>Vínculos no CNES</b> <span class="bp-sub" style="display:inline">(o CNES aberto não traz CPF nem CRM; homônimo é possível: confira a cidade e a especialidade)</span>'+
        '<div class="bp-rolagem"><table class="bp-mini" style="min-width:720px"><thead><tr><th>Estabelecimento</th><th>Cidade</th><th>Especialidade</th><th>Vínculo</th><th>Carga horária</th><th>De quando a quando</th></tr></thead><tbody>'+
        vs.map(function(v){return '<tr><td>'+esc(v.estabelecimento||v.cnes)+'<span class="bp-sub">CNES '+esc(v.cnes)+(v.cnpj?' · CNPJ '+esc(v.cnpj):'')+'</span></td><td>'+esc(v.municipio||'')+'/'+esc(v.uf||'')+'</td><td>'+esc(v.cbo_desc||v.cbo)+'</td>'+
          '<td>'+esc(CAT[v.categoria]||v.categoria)+(v.contribui?' <span class="bp-chip ok">contribui</span>':'')+'<span class="bp-sub">'+esc(v.vinculo_desc||'')+'</span></td>'+
          '<td class="n">'+(v.ch_total!=null?esc(String(v.ch_total).replace('.',','))+' h':'—')+'</td>'+
          '<td>'+(v.intervalos||[]).map(function(x){return esc(periodo(x[0],x[1]));}).join('<br>')+(v.vigente?'<span class="bp-chip ok">atual</span>':'')+'</td></tr>';}).join('')+'</tbody></table></div>'+
        (l.mais_medicos?'<p class="bp-sub" style="margin-top:6px">Mais Médicos desde '+esc(u.dataBR(l.mais_medicos_inicio)||'—')+(l.crm?' · CRM '+esc(l.crm)+'/'+esc(l.crm_uf||''):'')+'.</p>':'');
    },
    csv:{cab:['Nome','CRM','UF do CRM','UFs','Cidade principal','Especialidade','Vínculos agora','Com contribuição agora','Máx. com contribuição num mês','2+ com contribuição (de)','2+ com contribuição (até)','Residência (de)','Residência (até)','Mais Médicos','No CNES desde','Último mês no CNES'],
      linha:function(l){return [l.nome,l.crm||'',l.crm_uf||'',(l.ufs||[]).join(' '),l.municipio_principal,l.cbo_principal,l.n_vinculos_atual,l.n_vinculos_contrib_atual,l.max_vinculos_contrib,u.comp(l.multi_desde),u.comp(l.multi_ate),u.comp(l.residencia_de),u.comp(l.residencia_ate),l.mais_medicos?'sim':'',u.comp(l.primeira_comp),u.comp(l.ultima_comp)];}},
    pdf:{cab:['Médico','Cidade','Especialidade','Vínculos agora','Com contribuição','2+ com contribuição','Residência','Mais Médicos'],num:[false,false,false,true,true,false,false,false],
      linha:function(l){return [l.nome,(l.municipio_principal||'')+'/'+(l.uf_principal||''),l.cbo_principal||'',l.n_vinculos_atual,l.n_vinculos_contrib_atual,periodo(l.multi_desde,l.multi_ate),l.teve_residencia?periodo(l.residencia_de,l.residencia_ate):'',l.mais_medicos?'sim':''];}},
    htmlRodape:function(p){var c=(p.cargas||[])[0];return '<div class="bp-bloco"><h3>De onde vêm os dados</h3><p class="bp-sub" style="font-size:12px;line-height:1.55">CNES (Cadastro Nacional de Estabelecimentos de Saúde), profissionais por mês, Portal de Dados Abertos do Ministério da Saúde, e o Mais Médicos (profissionais ativos, com CRM). '+
      '"Com contribuição" = vínculo que provavelmente recolhe ao INSS pelo próprio vínculo (CLT, temporário, empregado público, comissionado, autônomo pessoa física, residência, cooperado); estatutário vai para o regime próprio e empresa (PJ) não conta. Confirmar com os documentos do médico. '+
      'O CNES sai ~3 meses depois do mês. Nenhum dado de saúde, raça/cor, sexo ou idade é guardado. '+(c?'Última carga: '+esc(u.comp(c.comp))+' em '+esc(u.dataHora(c.recebido_em))+(c.ok===false?' <b style="color:var(--danger,#d6452d)">com erro: '+esc(c.erro||'')+'</b>':'')+'.':'')+'</p></div>';}
  };
  global.SagaBaseMedicos=B.criar(cfg);
})(window);
