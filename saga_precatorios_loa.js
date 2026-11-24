/* =====================================================================
   SAGA · Teses e oportunidades > Precatórios da LOA (24/11/2026, Dr. Victor; blocos 467 a 471)
   Precatórios publicados na Lei Orçamentária Anual (relatórios da Comissão Mista de
   Orçamento, 2016 em diante, todos os tribunais) + listas públicas dos TRFs (pagos,
   superpreferência "Idoso"). Cruzar com os clientes, achar credores, apontar a
   HABILITAÇÃO PROVÁVEL (credor falecido antes do pagamento) e distribuir os NOVOS em
   lotes iguais para a Captação.
   Administrador geral: tudo. Pessoa da Captação: só "Meu lote" (o banco recusa o resto).
   Contato com quem não é cliente: só pela ANCREF, informativo; "Não enviar mais" respeitado.
   ===================================================================== */
(function(global){
  'use strict';
  var L={montado:false,admin:false,meu:false,parte:'geral',painel:null,opcoes:null,lista:null,lote:null,f:{},pedido:0,pessoas:null};
  var GRUPOS={servidor:'Servidor público',previdenciario:'Previdenciário / INSS',honorarios:'Honorários',tributario:'Tributário',trabalhista:'Trabalhista',outros:'Outros'};
  var RAMOS={federal:'Justiça Federal',trabalho:'Justiça do Trabalho',estadual:'Tribunais de Justiça (federal delegado)',superior:'STF / STJ'};
  var SIT={nao_localizado:'Não localizado',localizado:'Localizado',contato:'Contato feito',interesse:'Interesse',nao_quer:'Não quer'};
  var HAB={provavel:'Habilitação provável',conferir:'Habilitação a conferir',descartada:'Descartada'};
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  function esc(v){return global.sagaEsc?global.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];});}
  function erro(e){return esc(global.sagaErroBanco?global.sagaErroBanco(e):((e&&e.message)||String(e)));}
  function num(n){return Number(n||0).toLocaleString('pt-BR');}
  function reais(v){return v==null?'—':'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});}
  function data(d){if(!d)return '';var p=String(d).slice(0,10).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d;}
  function mes(m){m=String(m||'');return m.length===6?m.slice(4)+'/'+m.slice(0,4):'';}
  function cnj(n){n=String(n||'');if(n.length!==20)return n;return global.sagaFmt&&global.sagaFmt.cnj?global.sagaFmt.cnj(n):n.slice(0,7)+'-'+n.slice(7,9)+'.'+n.slice(9,13)+'.'+n.slice(13,14)+'.'+n.slice(14,16)+'.'+n.slice(16);}
  function $(id){return document.getElementById(id);}
  function sb(){return global._sb;}
  function dig(v){return String(v||'').replace(/\D/g,'');}

  var CSS=`
#aba-loa .pl-aviso{border:1px solid var(--border-soft);border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;font-size:12px;color:var(--muted);margin-bottom:12px;background:var(--panel);line-height:1.5}
#aba-loa .pl-aviso b{color:var(--text)}
#aba-loa .pl-aviso.amar{border-left-color:#c98500}
#aba-loa .pl-erro{border-left-color:var(--danger,#d6452d);color:var(--text)}
#aba-loa .pl-partes{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
#aba-loa .pl-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:14px}
#aba-loa .pl-num{border:1px solid var(--border-soft);border-radius:12px;padding:9px 10px;background:var(--panel);color:var(--text);font:inherit;text-align:left;cursor:pointer;min-height:64px;display:flex;flex-direction:column;gap:2px}
#aba-loa .pl-num:hover,#aba-loa .pl-num:focus-visible{border-color:var(--gold);outline:0}
#aba-loa .pl-num b{font-size:19px;font-variant-numeric:lining-nums tabular-nums}
#aba-loa .pl-num span{font-size:11px;color:var(--muted);line-height:1.25}
#aba-loa .pl-filtros{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center}
#aba-loa .pl-filtros select,#aba-loa .pl-filtros input{min-width:130px}
#aba-loa .pl-filtros .pl-busca{flex:1 1 220px}
#aba-loa .pl-mais{margin-bottom:10px}
#aba-loa .pl-mais[hidden]{display:none}
#aba-loa .pl-barra{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px;font-size:12.5px;color:var(--muted)}
#aba-loa .pl-rolagem{overflow-x:auto}
#aba-loa .pl-tab{width:100%;border-collapse:collapse;font-size:12.5px}
#aba-loa .pl-tab th{text-align:left;font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:7px 8px;border-bottom:1px solid var(--border-soft);white-space:nowrap}
#aba-loa .pl-tab td{padding:7px 8px;border-bottom:1px solid var(--border-soft);vertical-align:top}
#aba-loa .pl-tab td.n{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
#aba-loa .pl-num-proc{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap;font-weight:600}
#aba-loa .pl-sub{display:block;font-size:10.5px;color:var(--muted)}
#aba-loa .pl-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border-soft);border-radius:999px;padding:1px 8px;font-size:10.5px;white-space:nowrap;margin:0 3px 3px 0}
#aba-loa .pl-chip.ok{border-color:color-mix(in srgb,var(--gold) 55%,transparent);color:var(--text)}
#aba-loa .pl-chip.alerta{border-color:#c98500;color:#c98500}
#aba-loa .pl-chip.risco{border-color:var(--danger,#d6452d);color:var(--danger,#d6452d)}
#aba-loa .pl-vazio{padding:18px;text-align:center;color:var(--muted);font-size:13px}
#aba-loa .pl-carregando{opacity:.55;transition:opacity .2s cubic-bezier(.22,.78,.25,1)}
#aba-loa .pl-mini{display:inline-flex;gap:6px;flex-wrap:wrap}
#aba-loa .pl-sit{min-width:150px}
.pl-fundo{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:safe center;justify-content:center;padding:16px;z-index:60;opacity:0;visibility:hidden;transition:opacity .3s cubic-bezier(.22,.78,.25,1),visibility .3s}
.pl-fundo.aberto{opacity:1;visibility:visible}
.pl-janela{background:var(--panel-solid,var(--panel));color:var(--text);border:1px solid var(--border-soft);border-radius:14px;max-width:560px;width:100%;max-height:100%;overflow:auto;padding:18px 20px}
.pl-janela h3{margin:0 0 8px;font-size:17px}
.pl-janela .pl-pessoas{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px;margin:10px 0}
.pl-janela label{display:flex;gap:6px;align-items:center;font-size:13px}
.pl-janela .pl-rodape{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}
@media (max-width:700px){#aba-loa .pl-tab thead{display:none}#aba-loa .pl-tab tr{display:block;border-bottom:1px solid var(--border-soft);padding:6px 0}#aba-loa .pl-tab td{display:block;border:0;padding:3px 4px}#aba-loa .pl-tab td[data-r]::before{content:attr(data-r) ": ";color:var(--muted);font-size:10.5px}#aba-loa .pl-tab td.n{white-space:normal}}
`;
  function estilos(){if($('plEstilo'))return;var s=document.createElement('style');s.id='plEstilo';s.textContent=CSS;document.head.appendChild(s);}

  /* ---------- números do alto ---------- */
  function htmlNums(){
    var p=L.painel||{};
    var n=function(v,t,f){return '<button type="button" class="pl-num" data-f=\''+esc(JSON.stringify(f||{}))+'\'><b>'+num(v)+'</b><span>'+esc(t)+'</span></button>';};
    return n(p.total,'precatórios na LOA (todos os anos)',{})+
      n(p.novos,'não são do SAGA',{situacao:'novo'})+
      n(p.clientes,'já são processos do SAGA',{situacao:'cliente'})+
      n(p.alagoas,'de Alagoas (lista do TRF5)',{uf:'AL'})+
      n(p.idosos,'com superpreferência "Idoso"',{idoso:'sim'})+
      n(p.com_credor,'com credor achado',{credor:'com'})+
      n(p.habilitacao_provavel,'habilitação provável',{habilitacao:'provavel'})+
      n(p.habilitacao_conferir,'habilitação a conferir',{habilitacao:'conferir'});
  }
  function htmlGeral(){
    var p=L.painel||{},g=p.por_grupo||{},d=p.distribuidos||{};
    var anos={};(p.por_ano_tribunal||[]).forEach(function(x){anos[x.ano]=(anos[x.ano]||0)+x.n;});
    return '<div class="pl-nums" id="plNums">'+htmlNums()+'</div>'+
      '<div class="pl-aviso"><b>De onde vem:</b> relatórios da Comissão Mista de Orçamento (LOA &gt; Proposta do Poder Executivo &gt; Precatórios) e listas públicas dos tribunais. A LOA traz só ano, número, assunto, valor e órgão devedor: <b>sem nome nem CPF</b>. O credor vem da consulta ao tribunal; nada é gravado numa ficha sem o clique da equipe.<br><b>Finalidade (LGPD):</b> '+esc(p.finalidade||'')+'</div>'+
      '<div class="pl-rolagem"><table class="pl-tab"><thead><tr><th>Assunto</th><th>Precatórios</th></tr></thead><tbody>'+
      Object.keys(g).sort(function(a,b){return g[b]-g[a];}).map(function(k){return '<tr><td data-r="Assunto"><a href="#" data-grupo="'+esc(k)+'">'+esc(GRUPOS[k]||k)+'</a></td><td class="n" data-r="Precatórios">'+num(g[k])+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      '<div class="pl-rolagem" style="margin-top:12px"><table class="pl-tab"><thead><tr><th>LOA</th><th>Precatórios no orçamento</th></tr></thead><tbody>'+
      Object.keys(anos).sort().reverse().map(function(a){return '<tr><td data-r="LOA"><a href="#" data-ano="'+esc(a)+'">'+esc(a)+'</a></td><td class="n" data-r="Precatórios">'+num(anos[a])+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      '<div class="pl-aviso" style="margin-top:12px"><b>Distribuídos:</b> '+num(d.total)+' · '+Object.keys(SIT).map(function(k){return esc(SIT[k])+' '+num((d.por_situacao||{})[k]);}).join(' · ')+'</div>';
  }

  /* ---------- lista ---------- */
  function opt(v,t,sel){return '<option value="'+esc(v)+'"'+(String(sel==null?'':sel)===String(v)?' selected':'')+'>'+esc(t)+'</option>';}
  function htmlFiltros(){
    var o=L.opcoes||{},f=L.f;
    var trib='<option value="">Todo tribunal</option>'+['federal','estadual','trabalho','superior'].map(function(r){
      var ts=(o.tribunais||[]).filter(function(t){return t.ramo===r;});if(!ts.length)return '';
      return '<optgroup label="'+esc(RAMOS[r])+'">'+ts.map(function(t){return opt(t.cod,t.nome,f.tribunal);}).join('')+'</optgroup>';}).join('');
    return '<div class="pl-filtros">'+
      '<input class="pl-busca" type="search" id="plBusca" placeholder="Número do precatório ou do processo, ou nome do credor" value="'+esc(f.busca||'')+'">'+
      '<select id="plAno" aria-label="Ano da LOA"><option value="">Todo ano</option>'+(o.anos||[]).map(function(a){return opt(a,'LOA '+a,f.ano);}).join('')+'</select>'+
      '<select id="plTribunal" aria-label="Tribunal">'+trib+'</select>'+
      '<select id="plGrupo" aria-label="Assunto"><option value="">Todo assunto</option>'+Object.keys(GRUPOS).map(function(k){return opt(k,GRUPOS[k],f.grupo);}).join('')+'</select>'+
      '<select id="plSituacao" aria-label="Situação no SAGA"><option value="">Clientes e novos</option>'+opt('novo','Só os novos',f.situacao)+opt('novo_nao_distribuido','Novos ainda não distribuídos',f.situacao)+opt('distribuido','Já distribuídos',f.situacao)+opt('cliente','Já são do SAGA',f.situacao)+'</select>'+
      '<button type="button" class="btn btn-sec" id="plMaisBtn" aria-expanded="'+(L.maisAberto?'true':'false')+'">Mais filtros</button>'+
      '</div><div class="pl-mais pl-filtros" id="plMais"'+(L.maisAberto?'':' hidden')+'>'+
      '<select id="plUf" aria-label="Estado de origem"><option value="">Todo estado</option>'+opt('SEM','Sem estado (ainda)',f.uf)+(o.ufs||[]).map(function(u){return opt(u,u,f.uf);}).join('')+'</select>'+
      '<select id="plIdoso" aria-label="Idoso"><option value="">Idoso ou não</option>'+opt('sim','Superpreferência idoso',f.idoso)+opt('nao','Sem superpreferência',f.idoso)+opt('sem','Ainda sem a informação',f.idoso)+'</select>'+
      '<select id="plPago" aria-label="Pagamento"><option value="">Pago ou não</option>'+opt('sim','Depósito visto',f.pago)+opt('nao','Depósito não visto',f.pago)+'</select>'+
      '<select id="plCredor" aria-label="Credor"><option value="">Com e sem credor</option>'+opt('com','Credor achado',f.credor)+opt('sem','Sem credor ainda',f.credor)+'</select>'+
      '<select id="plHab" aria-label="Habilitação"><option value="">Habilitação: todos</option>'+opt('provavel','Habilitação provável',f.habilitacao)+opt('conferir','Habilitação a conferir',f.habilitacao)+opt('descartada','Descartados',f.habilitacao)+'</select>'+
      '<select id="plDevedor" aria-label="Órgão devedor"><option value="">Todo devedor</option>'+(o.devedores||[]).map(function(d){return opt(d.cod,d.nome,f.devedor);}).join('')+'</select>'+
      '<input type="text" inputmode="numeric" id="plValDe" placeholder="Valor de (R$)" value="'+esc(f.valor_de?Number(f.valor_de).toLocaleString('pt-BR'):'')+'">'+
      '<input type="text" inputmode="numeric" id="plValAte" placeholder="Valor até (R$)" value="'+esc(f.valor_ate?Number(f.valor_ate).toLocaleString('pt-BR'):'')+'">'+
      '<button type="button" class="btn btn-sec" id="plLimpar">Limpar filtros</button></div>';
  }
  function filtros(){var f={};Object.keys(L.f).forEach(function(k){if(L.f[k]!==''&&L.f[k]!=null)f[k]=L.f[k];});return f;}
  var PAG=null;function pag(){if(!PAG)PAG=global.SagaPaginacao.criar({tela:'precatorios-loa',rotulo:'precatórios',aoMudar:function(){carregarLista();}});return PAG;}
  async function carregarLista(){
    var box=$('plLista');if(!box)return;var meu=++L.pedido;box.classList.add('pl-carregando');
    var P=pag();
    var r=await global.SagaPaginacao.buscarEmPartes(function(off,lim){
      return Promise.resolve(sb().rpc('loa_buscar',{p_filtros:filtros(),p_limite:lim,p_offset:off})).then(function(x){return x.error?x:{linhas:(x.data||{}).linhas,total:(x.data||{}).total};});
    },{offset:P.offset(),quantos:P.quantos(),lote:2000});
    if(meu!==L.pedido)return;box.classList.remove('pl-carregando');
    if(r.error){box.innerHTML='<div class="pl-aviso pl-erro">Não deu para buscar os precatórios: '+erro(r.error)+'</div>';return;}
    L.lista={total:r.total,linhas:r.linhas||[]};P.total(r.total);desenharLista();
  }
  function chipsLinha(l){
    var c='';
    if(l.cliente_processo_id)c+='<span class="pl-chip ok">já é do SAGA'+(l.cliente_codigo?' · '+esc(l.cliente_codigo):'')+'</span>';
    if(l.idoso)c+='<span class="pl-chip ok">Idoso</span>';
    if(l.natureza)c+='<span class="pl-chip">'+(l.natureza==='alimentar'?'Alimentar':'Comum')+'</span>';
    if(l.pago_em)c+='<span class="pl-chip">depósito '+esc(data(l.pago_em))+'</span>';
    if(l.habilitacao)c+='<span class="pl-chip '+(l.habilitacao==='provavel'?'risco':'alerta')+'">'+esc(HAB[l.habilitacao])+'</span>';
    if(l.distribuido)c+='<span class="pl-chip">'+esc(l.distribuido.usuario)+' · '+esc(SIT[l.distribuido.situacao]||'')+'</span>';
    return c;
  }
  function desenharLista(){
    var box=$('plLista');if(!box)return;var ls=(L.lista||{}).linhas||[];
    var tot=(L.lista||{}).total||0;
    var barra='<div class="pl-barra"><span>'+num(tot)+' precatório(s) com esses filtros</span><span class="pl-mini">'+
      '<button type="button" class="btn btn-sec" id="plCsv">Baixar CSV</button>'+
      '<button type="button" class="btn" id="plDistribuir">Distribuir para a Captação…</button></span></div>';
    if(!ls.length){box.innerHTML=barra+'<div class="pl-vazio">Nenhum precatório com esses filtros.</div>';ligarBarra(box);return;}
    box.innerHTML=barra+'<div class="pl-rolagem"><table class="pl-tab"><thead><tr><th>Precatório</th><th>Tribunal · LOA</th><th>Assunto · devedor</th><th>Valor</th><th>Credor</th><th>Situação</th></tr></thead><tbody>'+
      ls.map(function(l){
        var cred=(l.credores||[]).filter(function(c){return c.papel!=='advogado';});
        var credHtml=cred.length?cred.map(function(c){return esc(c.nome)+'<span class="pl-sub">'+(c.nivel==='seguro'?'conferido':'a conferir')+(c.falecido_mes?' · falecido '+esc(mes(c.falecido_mes)):'')+(c.pode_contatar===false?' · Não enviar mais':'')+'</span>';}).join('')
          :'<span class="pl-sub">ainda sem credor</span>';
        return '<tr><td data-r="Precatório"><span class="pl-num-proc">'+esc(l.numero?cnj(l.numero):(l.numero_seq||''))+'</span>'+(l.prc?'<span class="pl-sub">'+esc(l.prc)+'</span>':'')+(l.originario?'<span class="pl-sub">origem '+esc(cnj(l.originario))+'</span>':'')+'</td>'+
          '<td data-r="Tribunal">'+esc(l.tribunal||'')+'<span class="pl-sub">LOA '+esc((l.anos||[]).join(', '))+(l.uf?' · '+esc(l.uf):'')+'</span></td>'+
          '<td data-r="Assunto">'+esc(l.assunto||'—')+'<span class="pl-sub">'+esc(l.devedor||'')+'</span></td>'+
          '<td class="n" data-r="Valor">'+esc(reais(l.valor))+(l.valor_pago?'<span class="pl-sub">pago '+esc(reais(l.valor_pago))+'</span>':'')+'</td>'+
          '<td data-r="Credor">'+credHtml+'</td>'+
          '<td data-r="Situação">'+chipsLinha(l)+(l.habilitacao_motivo?'<span class="pl-sub">'+esc(l.habilitacao_motivo)+'</span>':'')+
            (l.habilitacao&&l.habilitacao!=='descartada'?'<span class="pl-mini"><button type="button" class="btn btn-sec" data-hab="'+esc(l.id)+'" data-dec="descartada">Descartar</button>'+(l.habilitacao==='conferir'?'<button type="button" class="btn btn-sec" data-hab="'+esc(l.id)+'" data-dec="provavel">É provável</button>':'')+'</span>':'')+
          '</td></tr>';
      }).join('')+'</tbody></table></div>'+pag().html();
    pag().ligar(box);ligarBarra(box);
    box.querySelectorAll('[data-hab]').forEach(function(b){b.onclick=function(){decidirHab(Number(b.dataset.hab),b.dataset.dec);};});
  }
  function ligarBarra(box){var c=box.querySelector('#plCsv');if(c)c.onclick=baixarCsv;var d=box.querySelector('#plDistribuir');if(d)d.onclick=janelaDistribuir;}
  async function decidirHab(id,dec){
    var r=await sb().rpc('loa_habilitacao_decidir',{p_precatorio:id,p_decisao:dec,p_motivo:dec==='descartada'?'Descartado na tela':null});
    if(r.error){aviso('Não deu para gravar a decisão: '+erro(r.error),'erro');return;}
    carregarLista();
  }
  function mudouFiltro(){pag().inicio();carregarLista();}
  function ligarFiltros(){
    var mapa={plAno:'ano',plTribunal:'tribunal',plGrupo:'grupo',plSituacao:'situacao',plUf:'uf',plIdoso:'idoso',plPago:'pago',plCredor:'credor',plHab:'habilitacao',plDevedor:'devedor'};
    Object.keys(mapa).forEach(function(id){var el=$(id);if(el)el.onchange=function(){L.f[mapa[id]]=el.value;mudouFiltro();};});
    var t=null,b=$('plBusca');if(b)b.oninput=function(){clearTimeout(t);t=setTimeout(function(){L.f.busca=b.value.trim();mudouFiltro();},450);};
    ['plValDe','plValAte'].forEach(function(id){var el=$(id);if(!el)return;
      el.oninput=function(){var d=dig(el.value);el.value=d?Number(d).toLocaleString('pt-BR'):'';};
      el.onchange=function(){L.f[id==='plValDe'?'valor_de':'valor_ate']=dig(el.value)||'';mudouFiltro();};});
    var m=$('plMaisBtn');if(m)m.onclick=function(){L.maisAberto=!L.maisAberto;var x=$('plMais');m.setAttribute('aria-expanded',L.maisAberto?'true':'false');
      if(global.sagaRecolher)global.sagaRecolher(x,!L.maisAberto);else x.hidden=!L.maisAberto;};
    var lp=$('plLimpar');if(lp)lp.onclick=function(){L.f={};desenhar();};
  }

  /* ---------- distribuir ---------- */
  async function janelaDistribuir(){
    if(!L.pessoas){var eq=global.sagaEquipe?await global.sagaEquipe():[];L.pessoas=(eq||[]).filter(function(p){return p.ativo!==false&&!p.saiu;});}
    var fundo=document.createElement('div');fundo.className='pl-fundo';fundo.setAttribute('role','dialog');fundo.setAttribute('aria-modal','true');
    fundo.innerHTML='<div class="pl-janela"><h3>Distribuir para a Captação</h3>'+
      '<p class="pl-sub" style="font-size:12px">Vão só os precatórios que <b>não são do SAGA</b>, <b>ainda não distribuídos</b> e <b>com credor achado</b>, com os filtros da lista. Divisão em partes iguais, do maior valor para o menor. Quem pediu "Não enviar mais" fica de fora. Contato com quem não é cliente: só pela ANCREF, informativo.</p>'+
      '<label for="plTitulo">Nome do lote</label><input type="text" id="plTitulo" style="width:100%" placeholder="Ex.: Idosos de AL · servidor público">'+
      '<div class="pl-pessoas">'+(L.pessoas||[]).map(function(p){return '<label><input type="checkbox" value="'+esc(p.id)+'"> '+esc(p.nome_completo||p.nome||'')+'</label>';}).join('')+'</div>'+
      '<label for="plQuantos">Quantos no máximo (em branco = todos os que servem, até 20.000)</label><input type="text" inputmode="numeric" id="plQuantos">'+
      '<div class="pl-aviso" id="plDistMsg" hidden></div>'+
      '<div class="pl-rodape"><button type="button" class="btn btn-sec" data-fechar>Cancelar</button><button type="button" class="btn" id="plDistOk">Distribuir</button></div></div>';
    document.body.appendChild(fundo);requestAnimationFrame(function(){fundo.classList.add('aberto');});
    function fechar(){fundo.classList.remove('aberto');setTimeout(function(){fundo.remove();},320);}
    fundo.querySelector('[data-fechar]').onclick=fechar;fundo.onclick=function(e){if(e.target===fundo)fechar();};
    var q=fundo.querySelector('#plQuantos');q.oninput=function(){var d=dig(q.value);q.value=d?Number(d).toLocaleString('pt-BR'):'';};
    fundo.querySelector('#plDistOk').onclick=async function(){
      var ids=[].slice.call(fundo.querySelectorAll('.pl-pessoas input:checked')).map(function(c){return c.value;});
      var msg=fundo.querySelector('#plDistMsg');
      if(!ids.length){msg.hidden=false;msg.className='pl-aviso amar';msg.textContent='Escolha ao menos uma pessoa.';return;}
      this.disabled=true;
      var r=await sb().rpc('loa_distribuir',{p_filtros:filtros(),p_usuarios:ids,p_titulo:fundo.querySelector('#plTitulo').value||null,p_quantos:dig(q.value)?Number(dig(q.value)):null});
      this.disabled=false;msg.hidden=false;
      if(r.error){msg.className='pl-aviso pl-erro';msg.innerHTML='Não deu para distribuir: '+erro(r.error);return;}
      var d=r.data||{};msg.className='pl-aviso';msg.innerHTML='<b>'+num(d.distribuidos)+'</b> precatório(s) distribuído(s) para '+num(d.pessoas)+' pessoa(s).'+(d.distribuidos?'':' Nenhum serviu: confira se há credor achado com esses filtros.');
      recarregarPainel();carregarLista();
    };
  }

  /* ---------- CSV (registrado) ---------- */
  async function baixarCsv(){
    var r=await sb().rpc('loa_buscar',{p_filtros:filtros(),p_limite:2000,p_offset:0});
    if(r.error){aviso('Não deu para montar o CSV: '+erro(r.error),'erro');return;}
    var ls=(r.data||{}).linhas||[];
    var q=function(v){v=String(v==null?'':v);return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    var csv='﻿Precatório;Tribunal;LOA;UF;Assunto;Devedor;Valor;Credor;Situação\n'+ls.map(function(l){
      var cred=(l.credores||[]).filter(function(c){return c.papel!=='advogado'&&c.pode_contatar!==false;}).map(function(c){return c.nome;}).join(' / ');
      return [l.numero?cnj(l.numero):l.numero_seq,l.tribunal,(l.anos||[]).join(','),l.uf,l.assunto,l.devedor,l.valor,cred,l.cliente_processo_id?'já é do SAGA':(l.habilitacao?HAB[l.habilitacao]:'novo')].map(q).join(';');}).join('\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='precatorios_loa.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
    sb().rpc('loa_registrar',{p_resumo:'baixou CSV com '+ls.length+' precatório(s)',p_acao:'consultou',p_depois:{filtros:filtros(),linhas:ls.length}});
  }

  /* ---------- meu lote (Captação) ---------- */
  var PAGL=null;function pagLote(){if(!PAGL)PAGL=global.SagaPaginacao.criar({tela:'precatorios-loa-lote',rotulo:'precatórios',aoMudar:function(){carregarLote();}});return PAGL;}
  async function carregarLote(){
    var box=$('plLote');if(!box)return;box.classList.add('pl-carregando');var P=pagLote();
    var r=await global.SagaPaginacao.buscarEmPartes(function(off,lim){
      return Promise.resolve(sb().rpc('loa_meu_lote',{p_situacao:L.fl||null,p_limite:lim,p_offset:off})).then(function(x){return x.error?x:{linhas:(x.data||{}).linhas,total:(x.data||{}).total,por:(x.data||{}).por_situacao};});
    },{offset:P.offset(),quantos:P.quantos(),lote:2000});
    box.classList.remove('pl-carregando');
    if(r.error){box.innerHTML='<div class="pl-aviso pl-erro">Não deu para abrir o seu lote: '+erro(r.error)+'</div>';return;}
    P.total(r.total);var ls=r.linhas||[];
    var filtro='<div class="pl-partes">'+['',...Object.keys(SIT)].map(function(k){return '<button type="button" class="pill'+((L.fl||'')===k?' active':'')+'" data-fl="'+esc(k)+'">'+esc(k?SIT[k]:'Todos')+'</button>';}).join('')+'</div>';
    box.innerHTML=filtro+'<div class="pl-aviso">Contato com quem não é cliente: <b>só pela ANCREF</b>, em tom informativo. Se a pessoa pedir para não receber mais, marque "Não quer" e escreva o que ela disse. Com interesse, combine com o Dr. Victor o cartão na Captação.</div>'+
      (ls.length?'<div class="pl-rolagem"><table class="pl-tab"><thead><tr><th>Credor</th><th>Precatório</th><th>Valor</th><th>Situação do contato</th></tr></thead><tbody>'+ls.map(function(l){
        return '<tr><td data-r="Credor">'+esc(l.credor||'credor a achar')+(l.credor_falecido_mes?'<span class="pl-sub">provável falecido '+esc(mes(l.credor_falecido_mes))+': falar com a família (habilitação)</span>':'')+(l.pode_contatar===false?'<span class="pl-sub">Não enviar mais</span>':'')+'</td>'+
          '<td data-r="Precatório"><span class="pl-num-proc">'+esc(cnj(l.precatorio))+'</span><span class="pl-sub">'+esc(l.tribunal||'')+(l.uf?' · '+esc(l.uf):'')+' · '+esc(l.assunto||'')+'</span></td>'+
          '<td class="n" data-r="Valor">'+esc(reais(l.valor))+(l.idoso?'<span class="pl-sub">idoso</span>':'')+'</td>'+
          '<td data-r="Situação"><select class="pl-sit" data-id="'+esc(l.id)+'" aria-label="Situação do contato">'+Object.keys(SIT).map(function(k){return opt(k,SIT[k],l.situacao);}).join('')+'</select>'+
          '<input type="text" class="pl-obs" data-id="'+esc(l.id)+'" placeholder="Anotação" value="'+esc(l.observacao||'')+'" style="width:100%;margin-top:4px"></td></tr>';
      }).join('')+'</tbody></table></div>'+P.html():'<div class="pl-vazio">Nada no seu lote com esse filtro.</div>');
    P.ligar(box);
    box.querySelectorAll('[data-fl]').forEach(function(b){b.onclick=function(){L.fl=b.dataset.fl;P.inicio();carregarLote();};});
    box.querySelectorAll('.pl-sit').forEach(function(s){s.onchange=function(){salvarContato(Number(s.dataset.id),s.value,box.querySelector('.pl-obs[data-id="'+s.dataset.id+'"]').value);};});
    box.querySelectorAll('.pl-obs').forEach(function(o){o.onchange=function(){var s=box.querySelector('.pl-sit[data-id="'+o.dataset.id+'"]');salvarContato(Number(o.dataset.id),s.value,o.value);};});
  }
  async function salvarContato(id,sit,obs){
    var r=await sb().rpc('loa_contato_salvar',{p_id:id,p_situacao:sit,p_observacao:obs||null});
    if(r.error){aviso('Não gravou a situação: '+erro(r.error),'erro');return;}
    aviso('Situação gravada'+((r.data||{}).vira_cartao?': com interesse, combine o cartão na Captação.':'.'),'ok');
  }

  /* ---------- montagem ---------- */
  function aviso(t,tipo){var a=$('plMsg');if(!a)return;a.hidden=false;a.className='pl-aviso'+(tipo==='erro'?' pl-erro':tipo==='amar'?' amar':'');a.innerHTML=t;clearTimeout(aviso._t);if(tipo==='ok')aviso._t=setTimeout(function(){a.hidden=true;},4000);}
  function desenhar(){
    var pane=$('aba-loa');if(!pane)return;
    var partes=L.admin?[['geral','Visão geral'],['lista','Precatórios'],['habilitacao','Habilitação provável'],['lote','Meu lote']]:[['lote','Meu lote']];
    if(!L.admin)L.parte='lote';
    pane.innerHTML='<div class="pl-partes" role="tablist">'+partes.map(function(p){return '<button type="button" class="pill'+(L.parte===p[0]?' active':'')+'" data-parte="'+p[0]+'">'+esc(p[1])+'</button>';}).join('')+'</div>'+
      '<div class="pl-aviso" id="plMsg" hidden></div><div id="plCorpo"></div>';
    pane.querySelectorAll('[data-parte]').forEach(function(b){b.onclick=function(){
      pane.querySelectorAll('[data-parte]').forEach(function(x){x.classList.toggle('active',x===b);});
      setTimeout(function(){L.parte=b.dataset.parte;if(L.parte==='habilitacao')L.f={habilitacao:'provavel'};else if(L.parte==='lista'&&L.f.habilitacao&&L.vindoHab)L.f={};L.vindoHab=L.parte==='habilitacao';desenharCorpo();},0);};});
    desenharCorpo();
  }
  function desenharCorpo(){
    var c=$('plCorpo');if(!c)return;
    if(L.parte==='geral'){c.innerHTML=htmlGeral();
      c.querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){L.f=JSON.parse(b.dataset.f);irLista();};});
      c.querySelectorAll('[data-grupo]').forEach(function(a){a.onclick=function(e){e.preventDefault();L.f={grupo:a.dataset.grupo};irLista();};});
      c.querySelectorAll('[data-ano]').forEach(function(a){a.onclick=function(e){e.preventDefault();L.f={ano:a.dataset.ano};irLista();};});
      return;}
    if(L.parte==='lote'){c.innerHTML='<div id="plLote"></div>';carregarLote();return;}
    if(L.parte==='habilitacao')c.innerHTML='<div class="pl-aviso amar"><b>Habilitação provável:</b> credor que a Base única dá como falecido ANTES do pagamento (herdeiros a habilitar). "A conferir" = só o nome bate, sem CPF para confirmar. Confira sempre antes de qualquer contato.</div>';
    else c.innerHTML='';
    c.insertAdjacentHTML('beforeend',htmlFiltros()+'<div id="plLista"></div>');ligarFiltros();
    if(global.SagaVolta&&!L.voltaLigada){L.voltaLigada=true;global.SagaVolta.registrar('precatorios-loa',{ler:function(){return {f:L.f,parte:L.parte};},aplicar:function(e){if(e&&e.f){L.f=e.f;L.parte=e.parte||L.parte;desenhar();}}});}
    pag().inicio();carregarLista();
  }
  function irLista(){L.parte='lista';desenhar();}
  async function recarregarPainel(){var r=await sb().rpc('loa_painel');if(!r.error){L.painel=r.data||{};var n=$('plNums');if(n)n.innerHTML=htmlNums();}}
  async function abrir(){
    var pane=$('aba-loa');if(!pane)return;estilos();
    if(L.montado)return;
    pane.innerHTML='<div class="pl-vazio">Carregando os precatórios da LOA…</div>';
    if(L.admin){
      var r=await Promise.all([sb().rpc('loa_painel'),sb().rpc('loa_opcoes')]);
      if(r[0].error||r[1].error){pane.innerHTML='<div class="pl-aviso pl-erro">Não deu para abrir os Precatórios da LOA: '+erro(r[0].error||r[1].error)+'</div>';return;}
      L.painel=r[0].data||{};L.opcoes=r[1].data||{};
      var q=new URLSearchParams(location.search).get('loa');if(q&&['geral','lista','habilitacao','lote'].indexOf(q)>=0)L.parte=q;
      if(L.parte==='habilitacao')L.f={habilitacao:'provavel'};
    }
    L.montado=true;desenhar();
  }
  async function liberar(){
    try{
      var p=global.sagaPerfil?await global.sagaPerfil():null;L.admin=!!(p&&p.eh_administrador);
      if(!L.admin){var r=await sb().rpc('loa_meu_lote',{p_situacao:null,p_limite:1,p_offset:0});L.meu=!r.error&&((r.data||{}).total||0)>0;}
      var bt=$('abaLoa');if(bt){bt.hidden=!(L.admin||L.meu);if(!L.admin)bt.textContent='Meu lote: precatórios';}
      return L.admin||L.meu;
    }catch(e){return false;}
  }
  global.SagaPrecatoriosLoa={abrir:abrir,liberar:liberar,_estado:L};
})(window);
