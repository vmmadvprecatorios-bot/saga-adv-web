/* =====================================================================
   SAGA · INTIMAÇÕES dentro de Tarefas / Intimações (T52)
   A própria intimação é o cartão: colunas próprias (ou por tribunal), prazo e etiqueta,
   comentários com histórico, concluir, incorporar o processo ao SAGA, abrir no tribunal.
   Uso pela tela: SagaIntimacoes.iniciar({sb, meuId, ehAdmin, toast, aoMudar})
   ===================================================================== */
(function(global){
  'use strict';

  /* ---------- catálogo da justiça brasileira (número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO) ---------- */
  var UF_NOME={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
  var UF_PREP={AC:'do',AL:'de',AP:'do',AM:'do',BA:'da',CE:'do',DF:'do',ES:'do',GO:'de',MA:'do',MT:'de',MS:'de',MG:'de',PA:'do',PB:'da',PR:'do',PE:'de',PI:'do',RJ:'do',RN:'do',RS:'do',RO:'de',RR:'de',SC:'de',SP:'de',SE:'de',TO:'do'};
  var UF_COD=['','AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SE','SP','TO'];
  var REGIAO={Norte:['AC','AM','AP','PA','RO','RR','TO'],Nordeste:['AL','BA','CE','MA','PB','PE','PI','RN','SE'],'Centro-Oeste':['DF','GO','MT','MS'],Sudeste:['ES','MG','RJ','SP'],Sul:['PR','RS','SC']};
  function regiaoDe(uf){for(var r in REGIAO)if(REGIAO[r].indexOf(uf)!==-1)return r;return '';}
  var TRF_UFS={1:['AC','AM','AP','BA','DF','GO','MA','MT','PA','PI','RO','RR','TO'],2:['RJ','ES'],3:['SP','MS'],4:['RS','PR','SC'],5:['AL','CE','PB','PE','RN','SE'],6:['MG']};
  var TRT_UF={1:'RJ',2:'SP',3:'MG',4:'RS',5:'BA',6:'PE',7:'CE',8:'PA',9:'PR',10:'DF',11:'AM',12:'SC',13:'PB',14:'RO',15:'SP',16:'MA',17:'ES',18:'GO',19:'AL',20:'SE',21:'RN',22:'PI',23:'MT',24:'MS'};
  var TRF5_ORIGEM={'80':'AL','81':'CE','82':'PB','83':'PE','84':'RN','85':'SE'};
  var RAMOS=[
    {id:'stf',nome:'STF · Supremo Tribunal Federal'},{id:'stj',nome:'STJ · Superior Tribunal de Justiça'},
    {id:'federal',nome:'Justiça Federal'},{id:'estadual',nome:'Justiça Estadual'},{id:'trabalho',nome:'Justiça do Trabalho'},
    {id:'eleitoral',nome:'Justiça Eleitoral'},{id:'militar',nome:'Justiça Militar'},{id:'outros',nome:'Outros (CNJ e não identificados)'}];
  // Todos os tribunais do Brasil (para o filtro já vir completo)
  var CATALOGO=(function(){
    var l=[{sigla:'STF',ramo:'stf'},{sigla:'STJ',ramo:'stj'},{sigla:'TST',ramo:'trabalho'},{sigla:'TSE',ramo:'eleitoral'},{sigla:'STM',ramo:'militar'},{sigla:'CNJ',ramo:'outros'}];
    for(var f=1;f<=6;f++)l.push({sigla:'TRF'+f,ramo:'federal',ufs:TRF_UFS[f]});
    UF_COD.slice(1).forEach(function(uf){l.push({sigla:'TJ'+uf,ramo:'estadual',ufs:[uf]});});
    for(var t=1;t<=24;t++)l.push({sigla:'TRT'+t,ramo:'trabalho',ufs:[TRT_UF[t]]});
    UF_COD.slice(1).forEach(function(uf){l.push({sigla:'TRE-'+uf,ramo:'eleitoral',ufs:[uf]});});
    ['MG','RS','SP'].forEach(function(uf){l.push({sigla:'TJM'+uf,ramo:'militar',ufs:[uf]});});
    return l;
  })();
  // Consulta processual de cada tribunal: tabela tribunais_links, editável em "Links dos tribunais"
  var SISTEMAS=['PJe','PJe 2º grau','eproc','e-SAJ','Projudi','PJe-JT','Creta','Outro'];

  function chaveTrib(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
  function ufDoTexto(t){
    t=String(t||'');
    var m=t.match(/\b(?:SJ|Se[çc][ãa]o Judici[áa]ria (?:d[aeo]s? )?)?(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
    if(m)return m[1];
    for(var uf in UF_NOME){if(t.indexOf(UF_NOME[uf])!==-1)return uf;}
    return '';
  }
  // Justiça da intimação: pelo número CNJ (ramo e tribunal) e pelo nome do órgão (estado)
  function justicaDe(i){
    if(i._just)return i._just;
    var n=String(i.numero_processo||'').replace(/\D/g,''),J=n.length===20?n.charAt(13):'',TR=n.length===20?Number(n.substr(14,2)):0,OO=n.length===20?n.substr(16,4):'';
    var sigla=(i.tribunal||'').toUpperCase(),ramo='outros',uf='';
    if(J==='1'){ramo='stf';sigla=sigla||'STF';}
    else if(J==='3'){ramo='stj';sigla=sigla||'STJ';}
    else if(J==='4'){ramo='federal';sigla=sigla||('TRF'+TR);uf=TR===5?(TRF5_ORIGEM[OO.slice(0,2)]||''):(TRF_UFS[TR]&&TRF_UFS[TR].length===1?TRF_UFS[TR][0]:'');}
    else if(J==='5'){ramo='trabalho';sigla=sigla||(TR?'TRT'+TR:'TST');uf=TRT_UF[TR]||'';}
    else if(J==='6'){ramo='eleitoral';sigla=sigla||(TR?'TRE-'+UF_COD[TR]:'TSE');uf=UF_COD[TR]||'';}
    else if(J==='7'){ramo='militar';sigla=sigla||'STM';}
    else if(J==='8'){ramo='estadual';uf=UF_COD[TR]||'';sigla=sigla||('TJ'+uf);}
    else if(J==='9'){ramo='militar';uf=UF_COD[TR]||'';sigla=sigla||('TJM'+uf);}
    else if(J==='2'){ramo='outros';sigla=sigla||'CNJ';}
    else{var c=CATALOGO.filter(function(x){return chaveTrib(x.sigla)===chaveTrib(sigla);})[0];if(c){ramo=c.ramo;if(c.ufs&&c.ufs.length===1)uf=c.ufs[0];}}
    uf=ufDoTexto(i.orgao)||uf;
    var nomeRamo={federal:'Justiça Federal',estadual:'Justiça Estadual',trabalho:'Justiça do Trabalho',eleitoral:'Justiça Eleitoral',militar:'Justiça Militar',stf:'Supremo Tribunal Federal',stj:'Superior Tribunal de Justiça',outros:''}[ramo];
    var rotulo=nomeRamo&&uf&&['federal','estadual','trabalho','eleitoral','militar'].indexOf(ramo)!==-1?nomeRamo+' '+UF_PREP[uf]+' '+UF_NOME[uf]:(nomeRamo||'Justiça não identificada');
    i._just={ramo:ramo,sigla:sigla||'—',uf:uf,regiao:regiaoDe(uf),rotulo:rotulo,chave:chaveTrib(sigla)};
    return i._just;
  }

  var ETIQUETAS=[['Réplica','#e5484d'],['Contestação','#f97316'],['Agravo','#8b5cf6'],['Apelação','#6366f1'],['Embargos','#ec4899'],['Recurso','#7c3aed'],
    ['Manifestação','#0ea5e9'],['Impugnação','#f59e0b'],['Cumprimento','#14b8a6'],['Ciência','#64748b'],['Audiência','#2563eb'],['Pagamento','#16a34a']];
  function corEtiqueta(nome){var e=ETIQUETAS.filter(function(x){return x[0]===nome;})[0];return e?e[1]:'#c9a96e';}

  /* ---------- estado ---------- */
  var S={links:[],sb:null,meuId:null,ehAdmin:false,toast:null,aoMudar:null,itens:[],colunas:[],oabs:[],usuarios:[],processos:{},teses:[],
    pode:{gerenciar:false,criarProc:false},horas:[7,13],aberta:null,carregado:false,
    f:{organizar:'colunas',situacao:'abertas',periodo:'tudo',busca:'',ramo:'',tribunal:'',regiao:'',orgao:'',advogado:'',oab:'',processo:null},
    limite:{},concluidasAbertas:{}};
  try{var salvo=JSON.parse(localStorage.getItem('saga-intim-filtros')||'null');if(salvo)['organizar','situacao','periodo','advogado'].forEach(function(k){if(salvo[k]!=null)S.f[k]=salvo[k];});}catch(e){}
  function guardarFiltros(){try{localStorage.setItem('saga-intim-filtros',JSON.stringify({organizar:S.f.organizar,situacao:S.f.situacao,periodo:S.f.periodo,advogado:S.f.advogado}));}catch(e){}}

  function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
  function toast(m,t){if(S.toast)S.toast(m,t==='error'?'erro':t);}
  function dataBR(d){if(!d)return '—';var p=String(d).slice(0,10).split('-');return p[2]+'/'+p[1]+'/'+p[0];}
  function hojeISO(){var d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
  function diasAtras(n){var d=new Date();d.setDate(d.getDate()-n);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
  function iniciais(n){return String(n||'?').split(' ').filter(Boolean).slice(0,2).map(function(p){return p[0];}).join('').toUpperCase();}
  function usuario(id){return S.usuarios.filter(function(u){return u.id===id;})[0];}
  function nomeUsuario(id){var u=usuario(id);return u?u.nome_completo:'';}
  function primeiroNome(id){return (nomeUsuario(id)||'').split(' ')[0];}
  function cnj(i){return i.numero_processo_mascara||i.numero_processo||'Sem número';}
  function partesAtivas(i){var a=(i.partes||[]).filter(function(p){return p.polo==='A';}).map(function(p){return p.nome;});if(!a.length)a=(i.partes||[]).map(function(p){return p.nome;});return a.join(', ');}
  function clienteDe(i){var p=i.processo_id&&S.processos[i.processo_id];return p&&p.pessoa?p.pessoa.nome_completo:'';}
  function linksDe(chave){return S.links.filter(function(l){return l.tribunal_chave===chave;});}
  function coluna(id){return S.colunas.filter(function(c){return c.id===id;})[0];}
  function advogadosDe(i){var ids=(i.advogados_ids||[]).slice();if(!ids.length&&i.responsavel_id)ids=[i.responsavel_id];return ids.filter(function(x,k){return ids.indexOf(x)===k;});}
  function urgencia(i){
    if(!i.prazo||i.concluida)return null;var h=hojeISO();
    if(i.prazo<h)return {cls:'atrasado',txt:'Atrasado · '+dataBR(i.prazo)};
    if(i.prazo===h)return {cls:'hoje',txt:'Vence hoje'};
    var d=(new Date(i.prazo+'T12:00:00')-new Date(h+'T12:00:00'))/86400000;
    return {cls:d<=3?'perto':'longe',txt:'Prazo '+dataBR(i.prazo)};
  }
  var ICO_COPIAR='<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="1.8"/></svg>';

  /* ---------- estilos ---------- */
  var CSS=''+
  '.si-barra{display:flex;flex-direction:column;gap:9px;margin:0 0 14px;padding:12px;border:1px solid var(--border-soft);border-radius:14px;background:var(--panel)}'+
  '.si-linha{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'+
  '.si-linha select,.si-linha input{height:34px;padding:0 10px;border:1px solid var(--border);border-radius:9px;background:var(--panel-2,var(--panel));color:var(--text);font:inherit;font-size:11.5px;max-width:240px}'+
  '.si-linha input{flex:1;min-width:180px;max-width:none}'+
  '.si-rot{font-size:9.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}'+
  '.si-seg{display:inline-flex;gap:3px;padding:3px;border:1px solid var(--border-soft);border-radius:10px}'+
  '.si-seg button{height:28px;padding:0 11px;border-radius:7px;font-size:11px;font-weight:700;color:var(--muted);border:0;background:none;cursor:pointer}'+
  '.si-seg button.active{background:var(--gold);color:#fff}'+
  '.si-btn{height:34px;padding:0 13px;border-radius:9px;border:1px solid var(--border);background:var(--panel);color:var(--text);font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}'+
  '.si-btn:hover{border-color:var(--gold)}.si-btn.pri{background:var(--gold);border-color:var(--gold);color:#fff}.si-btn[disabled]{opacity:.55;cursor:default}'+
  '.si-btn.sm{height:28px;padding:0 10px;font-size:10.5px}'+
  '.si-quadro{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;align-items:flex-start}'+
  '.si-col{flex:0 0 auto;width:272px;background:var(--panel);border:1px solid var(--border-soft);border-radius:15px;padding:12px;display:flex;flex-direction:column;gap:9px;max-height:calc(100vh - 250px);transition:border-color .15s,background .15s}'+
  '.si-col.sobre{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 6%,var(--panel))}'+
  '.si-col-cab{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700}'+
  '.si-col-cab .ponto{width:9px;height:9px;border-radius:50%;background:var(--c);flex:0 0 auto}'+
  '.si-col-cab .nome{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
  '.si-col-cab .qtd{font-size:10px;padding:1px 7px;border-radius:8px;background:color-mix(in srgb,var(--text) 8%,transparent);color:var(--muted)}'+
  '.si-col-cab .menu{border:0;background:none;color:var(--muted);cursor:pointer;width:22px;height:22px;border-radius:6px}'+
  '.si-col-cab .menu:hover{background:color-mix(in srgb,var(--text) 7%,transparent)}'+
  '.si-col-sub{font-size:10px;color:var(--muted);margin-top:-5px}'+
  '.si-cards{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:9px;min-height:40px;overscroll-behavior:contain;padding-right:2px}'+
  '.si-mais{font-size:11px;font-weight:600;color:var(--gold);padding:6px;text-decoration:underline;border:0;background:none;cursor:pointer}'+
  '.si-arquivo{border-top:1px dashed var(--border-soft);padding-top:7px}'+
  '.si-arquivo>button{width:100%;text-align:left;font-size:10.5px;font-weight:700;color:var(--muted);border:0;background:none;cursor:pointer;padding:4px 2px}'+
  '.si-arquivo .lista{display:none;flex-direction:column;gap:8px;margin-top:6px}.si-arquivo.aberto .lista{display:flex}'+
  '.si-card{position:relative;border:1px solid var(--border-soft);border-left:3px solid var(--c,#8a94a8);border-radius:12px;padding:10px 11px;background:color-mix(in srgb,var(--text) 5%,transparent);cursor:pointer;transition:border-color .15s,transform .15s}'+
  '.si-card:hover{border-color:var(--gold);transform:translateY(-1px)}.si-card.arrastando{opacity:.45}'+
  '.si-desfazer{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:3000;display:flex;align-items:center;gap:14px;max-width:calc(100vw - 32px);padding:11px 14px;border-radius:12px;border:1px solid var(--border);background:var(--panel-solid,var(--panel));color:var(--text);box-shadow:0 14px 40px rgba(0,0,0,.35);font-size:12.5px;animation:siDesfazerIn .28s cubic-bezier(.34,1.45,.64,1)}'+
  '.si-desfazer button{flex:0 0 auto;border:0;background:transparent;color:var(--gold);font:inherit;font-weight:700;cursor:pointer;padding:4px 6px}'+
  '@keyframes siDesfazerIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}'+
  '@media (prefers-reduced-motion:reduce){.si-desfazer{animation:none}}'+
  '.si-card.concluida{opacity:.6}.si-card.concluida .si-proc span,.si-card.concluida .si-cli{text-decoration:line-through}'+
  '.si-topo{display:flex;align-items:center;gap:6px;font-size:9.5px;color:var(--muted);font-weight:700}'+
  '.si-topo .data{margin-left:auto;font-weight:600}.si-topo .data+.si-mover{margin-left:2px}'+
  '.si-chk{width:16px;height:16px;border-radius:5px;border:1.5px solid var(--border);background:none;cursor:pointer;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;padding:0}'+
  '.si-chk.on{background:var(--success);border-color:var(--success);color:#fff}'+
  '.si-tag{display:inline-block;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:6px;background:color-mix(in srgb,var(--c,#8a94a8) 15%,transparent);color:var(--c,#8a94a8);white-space:nowrap}'+
  '.si-trib{padding:1px 6px;border-radius:6px;background:color-mix(in srgb,var(--text) 10%,transparent);color:var(--text)}'+
  '.si-just{font-size:10px;color:var(--muted);margin-top:4px}'+
  '.si-proc{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;margin-top:5px;font-variant-numeric:tabular-nums}'+
  '.si-proc span,.si-cli,.si-res,.si-doc{user-select:text;-webkit-user-select:text;cursor:text}'+
  '.si-copiar{width:21px;height:21px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--muted);border:1px solid transparent;background:none;cursor:pointer;flex:0 0 auto;padding:0}'+
  '.si-copiar:hover{color:var(--gold);border-color:var(--border)}'+
  '.si-cli{font-size:12px;font-weight:600;margin-top:2px}'+
  '.si-doc{font-size:10.5px;color:var(--muted);margin-top:3px}'+
  '.si-res{font-size:11px;margin-top:5px;opacity:.85;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}'+
  '.si-rod{display:flex;align-items:center;gap:5px;margin-top:8px;flex-wrap:wrap}'+
  '.si-advs{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;margin-top:6px;color:var(--text)}'+
  '.si-av{display:inline-flex}.si-av i{width:19px;height:19px;border-radius:50%;background:var(--c,var(--gold));color:#fff;font-style:normal;font-size:8px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid var(--panel);margin-left:-5px}.si-av i:first-child{margin-left:0}'+
  '.si-prazo{font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:7px}'+
  '.si-prazo.atrasado{background:color-mix(in srgb,var(--danger) 18%,transparent);color:var(--danger)}'+
  '.si-prazo.hoje{background:color-mix(in srgb,#f97316 18%,transparent);color:#f97316}'+
  '.si-prazo.perto{background:color-mix(in srgb,var(--warning) 18%,transparent);color:var(--warning)}'+
  '.si-prazo.longe{background:color-mix(in srgb,var(--success) 15%,transparent);color:var(--success)}'+
  '.si-vazio{padding:22px 10px;text-align:center;color:var(--muted);font-size:11.5px}'+
  '.si-tit-injetado{font-size:9.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--gold);margin:2px 0 -2px}'+
  '.si-tabela{overflow-x:auto;border:1px solid var(--border-soft);border-radius:14px;background:var(--panel);margin-bottom:16px}'+
  '.si-tabela table{width:100%;border-collapse:collapse;min-width:980px}'+
  '.si-tabela th{text-align:left;font-size:9.5px;letter-spacing:.7px;text-transform:uppercase;padding:11px 10px;border-bottom:1px solid var(--border-soft);color:var(--muted);white-space:nowrap}'+
  '.si-tabela td{padding:9px 10px;font-size:11.5px;border-bottom:1px solid var(--border-soft);vertical-align:top}'+
  '.si-tabela tr{cursor:pointer}.si-tabela tbody tr:hover td{background:color-mix(in srgb,var(--gold) 5%,transparent)}'+
  '.si-tabela tr.concluida td{opacity:.6}.si-tabela tr.concluida .si-cli{text-decoration:line-through}'+
  '.si-sub{font-size:10px;color:var(--muted);margin-top:2px}'+
  '.si-titulo-secao{font-family:"Cormorant Garamond",serif;font-size:20px;font-weight:600;margin:6px 0 10px}'+
  /* janelas */
  '.si-ov{display:none;position:fixed;inset:0;z-index:1800;align-items:flex-start;justify-content:center;padding:26px 14px;background:rgba(4,7,14,.6);backdrop-filter:blur(5px);overflow-y:auto}'+
  '.si-ov.open{display:flex}'+
  '.si-modal{width:100%;max-width:1040px;border:1px solid var(--border);border-radius:18px;background:var(--panel-solid,var(--panel));box-shadow:var(--shadow);color:var(--text)}'+
  '.si-modal.peq{max-width:640px}'+
  '.si-mh{display:flex;justify-content:space-between;gap:12px;padding:16px 20px 11px;border-bottom:1px solid var(--border-soft)}'+
  '.si-mh h2{font-family:"Cormorant Garamond",serif;font-size:22px;font-weight:600;margin:0}.si-mh p{font-size:11px;color:var(--muted);margin:3px 0 0}'+
  '.si-x{width:30px;height:30px;border:1px solid var(--border-soft);border-radius:9px;color:var(--muted);background:none;cursor:pointer;flex:0 0 auto}'+
  '.si-mb{padding:16px 20px}.si-mf{display:flex;justify-content:flex-end;gap:8px;padding:11px 20px 15px;border-top:1px solid var(--border-soft);flex-wrap:wrap}'+
  '.si-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(290px,1fr);gap:18px}'+
  '.si-texto{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.6;max-height:46vh;overflow:auto;padding:13px;border:1px solid var(--border-soft);border-radius:12px;background:color-mix(in srgb,var(--text) 4%,transparent);overscroll-behavior:contain}'+
  '.si-texto mark{background:color-mix(in srgb,var(--warning) 30%,transparent);color:inherit;border-radius:3px;padding:0 2px;font-weight:700}'+
  '.si-sec{font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--gold);margin:14px 0 7px}'+
  '.si-campo{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;min-width:0}'+
  '.si-campo label{font-size:9.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}'+
  '.si-campo input,.si-campo select,.si-campo textarea{width:100%;height:36px;padding:0 10px;border:1px solid var(--border);border-radius:9px;background:var(--panel-2,var(--panel));color:var(--text);font:inherit;font-size:12px;outline:0}'+
  '.si-campo textarea{height:auto;min-height:62px;padding:8px 10px;resize:vertical}'+
  '.si-campo input:focus,.si-campo select:focus,.si-campo textarea:focus{border-color:var(--gold)}'+
  '.si-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
  '.si-acoes{display:flex;gap:6px;flex-wrap:wrap}'+
  '.si-dados{display:flex;flex-direction:column;gap:7px;font-size:11.5px}.si-dados .l{font-size:9.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}'+
  '.si-hist{display:flex;flex-direction:column;gap:7px;max-height:30vh;overflow:auto;margin-bottom:9px;overscroll-behavior:contain}'+
  '.si-hi{border-left:3px solid var(--c,#8a94a8);padding:6px 9px;border-radius:8px;background:color-mix(in srgb,var(--c,#8a94a8) 9%,transparent);font-size:11.5px}'+
  '.si-hi .q{font-size:10px;color:var(--muted);margin-bottom:2px}.si-hi .t{white-space:pre-wrap;word-break:break-word}'+
  '.si-proc-box{border:1px solid var(--border-soft);border-radius:11px;padding:10px;font-size:11.5px}'+
  '.si-proc-box.ok{border-color:color-mix(in srgb,var(--success) 45%,transparent);background:color-mix(in srgb,var(--success) 7%,transparent)}'+
  '.si-proc-box.falta{border-color:color-mix(in srgb,var(--warning) 45%,transparent);background:color-mix(in srgb,var(--warning) 7%,transparent)}'+
  '.si-res-list{display:flex;flex-direction:column;gap:5px;max-height:200px;overflow:auto;margin-top:6px}'+
  '.si-res-list button{text-align:left;padding:7px 9px;border:1px solid var(--border-soft);border-radius:8px;font:inherit;font-size:11.5px;background:none;color:var(--text);cursor:pointer}'+
  '.si-res-list button:hover{border-color:var(--gold)}'+
  '.si-oab{display:grid;grid-template-columns:minmax(0,1.4fr) auto auto auto;gap:9px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border-soft);font-size:11.5px}'+
  '.si-oab-nova{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,.8fr) minmax(0,.6fr) auto;gap:8px;align-items:end;margin-top:11px}.si-oab-nova .si-campo{margin-bottom:0}'+
  '.si-chave{position:relative;width:38px;height:22px;border-radius:12px;border:0;background:color-mix(in srgb,var(--text) 18%,transparent);cursor:pointer;flex:0 0 auto}'+
  '.si-chave::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.3,1.4,.5,1)}'+
  '.si-chave.on{background:var(--success)}.si-chave.on::after{transform:translateX(16px)}'+
  '.si-horas{display:flex;gap:5px;flex-wrap:wrap}.si-horas button{width:44px;height:29px;border-radius:8px;border:1px solid var(--border);font-size:11px;font-weight:700;color:var(--muted);background:none;cursor:pointer}'+
  '.si-horas button.on{border-color:var(--gold);color:var(--gold);background:color-mix(in srgb,var(--gold) 10%,transparent)}'+
  '.si-menu{position:fixed;z-index:1900;min-width:170px;background:var(--panel-solid,var(--panel));border:1px solid var(--border);border-radius:10px;padding:5px;box-shadow:0 14px 34px rgba(0,0,0,.35)}'+
  '.si-menu button{display:block;width:100%;text-align:left;padding:8px 10px;border-radius:7px;font:inherit;font-size:11.5px;border:0;background:none;color:var(--text);cursor:pointer}'+
  '.si-menu button:hover{background:color-mix(in srgb,var(--gold) 9%,transparent)}.si-menu button.perigo{color:var(--danger)}'+
  '.si-mover{width:21px;height:21px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--muted);border:1px solid transparent;background:none;cursor:pointer;padding:0;font-size:12px;margin-left:auto}'+
  '.si-mover:hover{color:var(--gold);border-color:var(--border)}'+
  '.si-menu .tit{font-size:9.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);padding:6px 10px 3px}'+
  '.si-menu button.atual{color:var(--gold);font-weight:700}'+
  '.si-link{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.1fr) minmax(0,.8fr) minmax(0,2fr) auto;gap:7px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-soft)}'+
  '.si-link input,.si-link select{height:32px;padding:0 8px;border:1px solid var(--border);border-radius:8px;background:var(--panel-2,var(--panel));color:var(--text);font:inherit;font-size:11.5px;min-width:0}'+
  '.si-link.falta{background:color-mix(in srgb,var(--warning) 7%,transparent);border-radius:8px;padding:6px}'+
  'body.si-so-leitura .si-chk,body.si-so-leitura .si-mover,body.si-so-leitura #siConcluir,body.si-so-leitura #siSalvarPrazo,body.si-so-leitura #siComentar,body.si-so-leitura #siComent,body.si-so-leitura #siMoverCom,body.si-so-leitura #siMoverCom+span{display:none !important}'+
  'body.si-so-leitura #siColuna,body.si-so-leitura #siPrazo,body.si-so-leitura #siEtiqueta,body.si-so-leitura #siCor{pointer-events:none;opacity:.7}'+
  '@media(max-width:860px){.si-link{grid-template-columns:1fr 1fr}'+
  '}'+
  '@media(max-width:860px){.si-grid{grid-template-columns:1fr}.si-col{width:84vw;max-height:calc(100vh - 210px)}.si-linha select{max-width:none;flex:1}.si-g2,.si-oab-nova{grid-template-columns:1fr 1fr}.si-oab{grid-template-columns:minmax(0,1fr) auto}}';
  function injetarCss(){if(document.getElementById('siEstilo'))return;var st=document.createElement('style');st.id='siEstilo';st.textContent=CSS;document.head.appendChild(st);}

  /* ---------- dados ---------- */
  async function carregar(){
    var sb=S.sb;
    var r=await Promise.all([
      sb.from('intimacoes').select('id,fonte,data_disponibilizacao,tribunal,orgao,classe,tipo_comunicacao,tipo_documento,numero_processo,numero_processo_mascara,partes,advogados,resumo,link,advogados_ids,processo_id,responsavel_id,situacao,coluna_id,ordem,prazo,etiqueta,etiqueta_cor,concluida,concluida_em,historica,capturado_em').order('data_disponibilizacao',{ascending:false}).order('capturado_em',{ascending:false}).limit(3000),
      sb.from('intimacoes_colunas').select('*').order('ordem').order('criado_em'),
      sb.from('monitoramento_config').select('*').eq('tipo_alvo','oab').order('criado_em'),
      sb.from('usuarios').select('id,nome_completo,ativo,auth_user_id,numero_oab,uf_oab').order('nome_completo'),
      sb.from('tribunais_links').select('*').order('tribunal_chave').order('ordem').order('nome')]);
    S.links=r[4].data||[];
    if(r[0].error){toast('Erro ao carregar as intimações: '+esc(r[0].error.message),'error');return false;}
    S.itens=r[0].data||[];S.colunas=r[1].data||[];S.oabs=r[2].data||[];S.usuarios=r[3].data||[];
    var ids=[...new Set(S.itens.map(function(i){return i.processo_id;}).filter(Boolean))];
    S.processos={};
    if(ids.length){var p=await sb.from('processos').select('id,numero_processo_cnj,pessoa_id,pessoa:pessoas(nome_completo)').in('id',ids);(p.data||[]).forEach(function(x){S.processos[x.id]=x;});}
    S.carregado=true;
    return true;
  }
  async function iniciar(o){
    injetarCss();
    S.sb=o.sb;S.meuId=o.meuId;S.ehAdmin=!!o.ehAdmin;S.toast=o.toast;S.aoMudar=o.aoMudar;
    var p=await Promise.all([
      S.sb.rpc('verificar_permissao',{p_usuario_id:S.meuId,p_modulo:'monitoramento_oab',p_acao:'gerenciar'}),
      S.sb.rpc('verificar_permissao',{p_usuario_id:S.meuId,p_modulo:'processos',p_acao:'criar'}),
      S.sb.rpc('verificar_permissao',{p_usuario_id:S.meuId,p_modulo:'movimentacoes_cnj',p_acao:'editar'})]);
    S.pode.gerenciar=p[0].data===true;S.pode.criarProc=p[1].data===true;S.pode.editar=p[2].data===true||S.ehAdmin;
    if(!S.pode.editar)document.body.classList.add('si-so-leitura');
    if(S.ehAdmin){var c=await S.sb.from('configuracoes_sistema').select('extra').limit(1).maybeSingle();if(c.data&&c.data.extra&&Array.isArray(c.data.extra.monitoramento_horas))S.horas=c.data.extra.monitoramento_horas.map(Number);}
    montarJanelas();
    return carregar();
  }
  function mudou(){if(S.aoMudar)S.aoMudar();}

  /* ---------- filtros ---------- */
  function filtradas(semSituacao){
    var f=S.f,b=f.busca.trim().toLowerCase(),bd=b.replace(/\D/g,'');
    var desde=f.periodo==='hoje'?hojeISO():f.periodo==='tudo'?null:diasAtras(Number(f.periodo));
    return S.itens.filter(function(i){
      var j=justicaDe(i);
      if(f.processo&&i.processo_id!==f.processo)return false;
      if(!semSituacao&&f.situacao==='abertas'&&i.concluida)return false;
      if(!semSituacao&&f.situacao==='concluidas'&&!i.concluida)return false;
      if(desde&&!f.processo&&String(i.data_disponibilizacao||'')<desde)return false;
      if(f.ramo&&j.ramo!==f.ramo)return false;
      if(f.tribunal&&j.chave!==f.tribunal)return false;
      if(f.regiao){if(f.regiao.indexOf('uf:')===0){if(j.uf!==f.regiao.slice(3))return false;}else if(j.regiao!==f.regiao)return false;}
      if(f.orgao&&i.orgao!==f.orgao)return false;
      if(f.advogado&&advogadosDe(i).indexOf(f.advogado)===-1&&i.responsavel_id!==f.advogado)return false;
      if(f.oab){
        if(f.oab.indexOf('fonte:')===0){if(i.fonte!==f.oab.slice(6))return false;}
        else{var alvo=f.oab.slice(4);if(!(i.advogados||[]).some(function(a){return String(a.numero_oab||'').replace(/\D/g,'')+'/'+String(a.uf_oab||'').toUpperCase()===alvo;}))return false;}
      }
      if(b){
        var t=[cnj(i),partesAtivas(i),clienteDe(i),i.tribunal,i.orgao,i.tipo_documento,i.classe,i.resumo,i.etiqueta,j.rotulo,advogadosDe(i).map(nomeUsuario).join(' ')].join(' ').toLowerCase();
        if(t.indexOf(b)===-1&&!(bd.length>=4&&String(i.numero_processo||'').indexOf(bd)!==-1))return false;
      }
      return true;
    });
  }
  function opts(lista,valor,todos){return '<option value="">'+esc(todos)+'</option>'+lista.map(function(o){return '<option value="'+esc(o[0])+'"'+(o[0]===valor?' selected':'')+'>'+esc(o[1])+'</option>';}).join('');}
  function montarFiltros(el){
    var f=S.f,base=S.itens,cont={};
    base.forEach(function(i){var j=justicaDe(i);cont['r:'+j.ramo]=(cont['r:'+j.ramo]||0)+1;cont['t:'+j.chave]=(cont['t:'+j.chave]||0)+1;});
    var ramos=RAMOS.map(function(r){return [r.id,r.nome+(cont['r:'+r.id]?' ('+cont['r:'+r.id]+')':'')];});
    // tribunais: o catálogo completo + os que chegaram e não estão nele (entram sozinhos)
    var tribs=CATALOGO.filter(function(c){return !f.ramo||c.ramo===f.ramo;}).map(function(c){return {chave:chaveTrib(c.sigla),sigla:c.sigla};});
    base.forEach(function(i){var j=justicaDe(i);if((!f.ramo||j.ramo===f.ramo)&&!tribs.some(function(t){return t.chave===j.chave;}))tribs.push({chave:j.chave,sigla:j.sigla});});
    tribs.sort(function(a,b){return (cont['t:'+b.chave]?1:0)-(cont['t:'+a.chave]?1:0)||a.sigla.localeCompare(b.sigla,'pt-BR',{numeric:true});});
    var tribOpts=tribs.map(function(t){return [t.chave,t.sigla+(cont['t:'+t.chave]?' ('+cont['t:'+t.chave]+')':'')];});
    // Cascata: cada filtro só mostra o que cabe dentro do anterior (justiça > tribunal > região/estado > órgão)
    if(f.tribunal&&!tribs.some(function(t){return t.chave===f.tribunal;}))f.tribunal='';
    var ufsPermitidas={},catTrib=CATALOGO.filter(function(c){return chaveTrib(c.sigla)===f.tribunal;})[0];
    if(f.tribunal&&catTrib&&catTrib.ufs)catTrib.ufs.forEach(function(u){ufsPermitidas[u]=1;});
    else if(!f.tribunal)CATALOGO.filter(function(c){return !f.ramo||c.ramo===f.ramo;}).forEach(function(c){(c.ufs||[]).forEach(function(u){ufsPermitidas[u]=1;});});
    base.forEach(function(i){var j=justicaDe(i);if(j.uf&&(!f.ramo||j.ramo===f.ramo)&&(!f.tribunal||j.chave===f.tribunal))ufsPermitidas[j.uf]=1;});
    if(!f.ramo&&!f.tribunal)Object.keys(UF_NOME).forEach(function(u){ufsPermitidas[u]=1;});
    var ufsLista=Object.keys(ufsPermitidas).sort();
    var regioes=Object.keys(REGIAO).filter(function(r){return REGIAO[r].some(function(u){return ufsPermitidas[u];});});
    var regOpts=(ufsLista.length>1&&regioes.length>1?regioes.map(function(r){return [r,'Região '+r];}):[]).concat(ufsLista.map(function(uf){return ['uf:'+uf,uf+' · '+UF_NOME[uf]];}));
    if(f.regiao&&!regOpts.some(function(o){return o[0]===f.regiao;}))f.regiao='';
    var orgaos=[...new Set(base.filter(function(i){var j=justicaDe(i);
      if(f.ramo&&j.ramo!==f.ramo)return false;if(f.tribunal&&j.chave!==f.tribunal)return false;
      if(f.regiao){if(f.regiao.indexOf('uf:')===0){if(j.uf!==f.regiao.slice(3))return false;}else if(j.regiao!==f.regiao)return false;}
      return true;}).map(function(i){return i.orgao;}).filter(Boolean))].sort();
    if(f.orgao&&orgaos.indexOf(f.orgao)===-1)f.orgao='';
    var advs={};S.oabs.forEach(function(o){if(o.usuario_vinculado_id)advs[o.usuario_vinculado_id]=1;});base.forEach(function(i){advogadosDe(i).forEach(function(a){advs[a]=1;});});
    var oabOpts=S.oabs.map(function(o){return ['oab:'+o.numero_oab+'/'+o.uf_oab,'OAB '+o.numero_oab+'/'+o.uf_oab+(o.usuario_vinculado_id?' · '+primeiroNome(o.usuario_vinculado_id):'')];})
      .concat([['fonte:djen','Origem: CNJ (Diário Eletrônico)'],['fonte:email','Origem: e-mail (radar)']]);
    el.innerHTML='<div class="si-barra">'+
      '<div class="si-linha">'+
        '<span class="si-rot">Colunas</span><div class="si-seg" data-seg="organizar"><button type="button" data-v="colunas" class="'+(f.organizar==='colunas'?'active':'')+'">Minhas colunas</button><button type="button" data-v="tribunal" class="'+(f.organizar==='tribunal'?'active':'')+'">Por tribunal</button></div>'+
        '<div class="si-seg" data-seg="situacao"><button type="button" data-v="abertas" class="'+(f.situacao==='abertas'?'active':'')+'">Abertas</button><button type="button" data-v="concluidas" class="'+(f.situacao==='concluidas'?'active':'')+'">Concluídas</button><button type="button" data-v="todas" class="'+(f.situacao==='todas'?'active':'')+'">Todas</button></div>'+
        '<select data-f="periodo" title="Período">'+[['hoje','Disponibilizadas hoje'],['7','Últimos 7 dias'],['30','Últimos 30 dias'],['tudo','Todo o período']].map(function(o){return '<option value="'+o[0]+'"'+(o[0]===f.periodo?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+
        '<input data-f="busca" placeholder="Processo, parte, vara, etiqueta ou texto..." value="'+esc(f.busca)+'">'+
        (S.pode.gerenciar?'<button class="si-btn" type="button" data-acao="links">Links dos tribunais</button><button class="si-btn" type="button" data-acao="oabs">OABs monitoradas</button><button class="si-btn pri" type="button" data-acao="buscar">Buscar agora</button>':'')+
      '</div>'+
      '<div class="si-linha">'+
        '<select data-f="ramo" title="Justiça">'+opts(ramos,f.ramo,'Toda a justiça')+'</select>'+
        '<select data-f="tribunal" title="Tribunal">'+opts(tribOpts,f.tribunal,'Todos os tribunais')+'</select>'+
        '<select data-f="regiao" title="Região ou estado">'+opts(regOpts,f.regiao,'Todas as regiões e estados')+'</select>'+
        '<select data-f="orgao" title="Órgão (vara, turma)">'+opts(orgaos.map(function(o){return [o,o];}),f.orgao,'Todos os órgãos')+'</select>'+
        '<select data-f="advogado" title="Advogado">'+opts(Object.keys(advs).map(function(id){return [id,nomeUsuario(id)||'Advogado'];}),f.advogado,'Todos os advogados')+'</select>'+
        '<select data-f="oab" title="OAB ou origem">'+opts(oabOpts,f.oab,'Todas as OABs e origens')+'</select>'+
        '<button class="si-btn sm" type="button" data-acao="limpar">Limpar filtros</button>'+
      '</div>'+
      (f.processo?'<div class="si-linha" style="font-size:11.5px">Mostrando só as intimações deste processo · <button class="si-btn sm" type="button" data-acao="tirar-processo">Ver todas</button></div>':'')+
    '</div>';
    el.querySelectorAll('[data-seg]').forEach(function(g){g.addEventListener('click',function(e){var b=e.target.closest('[data-v]');if(!b)return;S.f[g.dataset.seg]=b.dataset.v;guardarFiltros();mudou();});});
    el.querySelectorAll('select[data-f]').forEach(function(s){s.addEventListener('change',function(){
      S.f[s.dataset.f]=s.value;
      if(s.dataset.f==='ramo'){S.f.tribunal='';S.f.regiao='';S.f.orgao='';}
      if(s.dataset.f==='tribunal'){S.f.regiao='';S.f.orgao='';}
      if(s.dataset.f==='regiao')S.f.orgao='';
      guardarFiltros();mudou();});});
    var bt=null;el.querySelector('input[data-f="busca"]').addEventListener('input',function(){var v=this.value;clearTimeout(bt);bt=setTimeout(function(){S.f.busca=v;mudou();var i=el.querySelector('input[data-f="busca"]');if(i){i.focus();i.setSelectionRange(v.length,v.length);}},220);});
    el.addEventListener('click',function(e){
      var a=e.target.closest('[data-acao]');if(!a)return;
      if(a.dataset.acao==='oabs')abrirOabs();
      else if(a.dataset.acao==='links')abrirLinks();
      else if(a.dataset.acao==='buscar')buscarAgora(null,a);
      else if(a.dataset.acao==='limpar'){['ramo','tribunal','regiao','orgao','advogado','oab','busca'].forEach(function(k){S.f[k]='';});S.f.processo=null;guardarFiltros();mudou();}
      else if(a.dataset.acao==='tirar-processo'){S.f.processo=null;mudou();}
    });
  }

  /* ---------- cartão ---------- */
  function htmlAdvogados(i){
    var ids=advogadosDe(i);if(!ids.length)return '';
    var cores=['#3b6fd8','#c2185b','#2fae7a','#e0a93b','#7c3aed','#0ea5e9'];
    var av=ids.slice(0,4).map(function(id){var k=S.usuarios.map(function(u){return u.id;}).indexOf(id);return '<i style="--c:'+cores[(k<0?0:k)%cores.length]+'" title="'+esc(nomeUsuario(id))+'">'+esc(iniciais(nomeUsuario(id)))+'</i>';}).join('');
    var nomes=ids.map(primeiroNome).filter(Boolean);
    var txt=nomes.length<=2?nomes.join(' + '):nomes.slice(0,2).join(' + ')+' + '+(nomes.length-2);
    return '<div class="si-advs"><span class="si-av">'+av+'</span><span title="'+esc(ids.map(nomeUsuario).join(', '))+'">'+esc(txt)+'</span></div>';
  }
  function cartao(i,opc){
    opc=opc||{};
    var j=justicaDe(i),col=coluna(i.coluna_id),cor=(col&&col.cor)||'#8a94a8',u=urgencia(i),cli=clienteDe(i);
    var el=document.createElement('div');
    el.className='si-card'+(i.concluida?' concluida':'');
    el.style.setProperty('--c',i.concluida?'#8a94a8':cor);
    el.dataset.int=i.id;
    if(opc.arrastar&&!i.concluida&&S.pode.editar)el.setAttribute('draggable','true');
    el.innerHTML='<div class="si-topo"><button class="si-chk'+(i.concluida?' on':'')+'" type="button" data-chk title="'+(i.concluida?'Reabrir':'Concluir')+'">'+(i.concluida?'✓':'')+'</button>'+
        '<span class="si-trib">'+esc(j.sigla)+'</span><span>'+esc(i.fonte==='email'?'E-mail':'Intimação')+'</span><span class="data">'+dataBR(i.data_disponibilizacao)+'</span>'+
        '<button class="si-mover" type="button" data-mover title="Mover para outra coluna">⇄</button></div>'+
      '<div class="si-just">'+esc(j.rotulo)+'</div>'+
      htmlAdvogados(i)+
      '<div class="si-proc"><span>'+esc(cnj(i))+'</span><button class="si-copiar" type="button" data-copiar="'+esc(cnj(i))+'" title="Copiar o número do processo">'+ICO_COPIAR+'</button></div>'+
      '<div class="si-cli">'+esc(cli||partesAtivas(i)||'Parte não identificada')+'</div>'+
      '<div class="si-doc">'+esc([i.tipo_documento,i.orgao].filter(Boolean).join(' · '))+'</div>'+
      (i.resumo&&!opc.compacto?'<div class="si-res">'+esc(i.resumo)+'</div>':'')+
      '<div class="si-rod">'+
        (i.etiqueta?'<span class="si-tag" style="--c:'+esc(i.etiqueta_cor||corEtiqueta(i.etiqueta))+'">'+esc(i.etiqueta)+'</span>':'')+
        (u?'<span class="si-prazo '+u.cls+'">'+esc(u.txt)+'</span>':'')+
        (i.processo_id?'<span class="si-tag" style="--c:#2fae7a">Na ficha do cliente</span>':'<span class="si-tag" style="--c:#8b5cf6">Fora do SAGA</span>')+
      '</div>';
    return el;
  }
  function ligarCartoes(raiz){
    raiz.addEventListener('click',function(e){
      var cp=e.target.closest('[data-copiar]');if(cp){e.stopPropagation();copiar(cp.dataset.copiar);return;}
      var mv=e.target.closest('[data-mover]');if(mv){e.stopPropagation();var cm=mv.closest('[data-int]');if(cm)menuMover(mv,cm.dataset.int);return;}
      var ck=e.target.closest('[data-chk]');if(ck){e.stopPropagation();var c=ck.closest('[data-int]');if(c)alternarConcluida(c.dataset.int);return;}
      var s=window.getSelection&&String(window.getSelection()).trim();if(s)return;
      var card=e.target.closest('[data-int]');if(card&&raiz.contains(card)){e.stopPropagation();abrir(card.dataset.int);}
    });
    raiz.addEventListener('mousedown',function(e){var t=e.target.closest('.si-proc span,.si-cli,.si-res,.si-doc'),c=e.target.closest('.si-card[draggable]');if(t&&c)c.setAttribute('draggable','false');});
    document.addEventListener('mouseup',function(){if(S.pode.editar)raiz.querySelectorAll('.si-card[draggable="false"]:not(.concluida)').forEach(function(c){c.setAttribute('draggable','true');});});
  }
  function copiar(txt){
    function ok(){toast('Número copiado: '+esc(txt),'sucesso');}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(ok,function(){toast(esc(txt));});else toast(esc(txt));
  }

  /* ---------- quadro (só intimações) ---------- */
  var POR_COL=40;
  function grupos(lista){
    if(S.f.organizar==='tribunal'){
      var g={};lista.forEach(function(i){var j=justicaDe(i);(g[j.chave]=g[j.chave]||{id:'t:'+j.chave,nome:j.sigla,sub:j.ramo==='federal'||j.ramo==='estadual'||j.ramo==='trabalho'?j.rotulo.replace(/ (de|do|da) .*/,''):'',cor:'#4b8af5',itens:[]}).itens.push(i);});
      return Object.keys(g).sort(function(a,b){return g[b].itens.length-g[a].itens.length||a.localeCompare(b);}).map(function(k){return g[k];});
    }
    return S.colunas.map(function(c){return {id:c.id,nome:c.nome,cor:c.cor||'#8a94a8',col:c,itens:lista.filter(function(i){return i.coluna_id===c.id||(!coluna(i.coluna_id)&&c.chave==='nova');})};});
  }
  function ordenar(l){return l.slice().sort(function(a,b){
    var pa=a.prazo||'9999',pb=b.prazo||'9999';if(pa!==pb)return pa<pb?-1:1;
    return String(b.data_disponibilizacao||'').localeCompare(String(a.data_disponibilizacao||''));});}
  function renderQuadro(el){
    var lista=filtradas(true),f=S.f;
    var mostrarAbertas=f.situacao!=='concluidas',mostrarConcl=true;
    el.innerHTML='';
    var q=document.createElement('div');q.className='si-quadro';el.appendChild(q);
    var gs=grupos(lista);
    if(!gs.length){q.innerHTML='<div class="si-vazio">Nenhuma intimação com esses filtros.</div>';return;}
    gs.forEach(function(g){
      var abertas=mostrarAbertas?ordenar(g.itens.filter(function(i){return !i.concluida;})):[];
      var concl=mostrarConcl?g.itens.filter(function(i){return i.concluida;}).sort(function(a,b){return String(b.concluida_em||'').localeCompare(String(a.concluida_em||''));}):[];
      var c=document.createElement('div');c.className='si-col';c.dataset.col=g.id;
      var lim=S.limite[g.id]||POR_COL;
      c.innerHTML='<div class="si-col-cab"><span class="ponto" style="--c:'+esc(g.cor)+'"></span><span class="nome" title="'+esc(g.nome)+'">'+esc(g.nome)+'</span><span class="qtd">'+(abertas.length+(f.situacao==='abertas'?0:concl.length))+'</span>'+
        (g.col&&S.pode.gerenciar?'<button class="menu" type="button" data-menu-col="'+esc(g.id)+'" title="Renomear ou excluir">⋯</button>':'')+'</div>'+
        (g.sub?'<div class="si-col-sub">'+esc(g.sub)+'</div>':'')+'<div class="si-cards"></div>';
      var cards=c.querySelector('.si-cards');
      abertas.slice(0,lim).forEach(function(i){cards.appendChild(cartao(i,{arrastar:f.organizar==='colunas'}));});
      if(abertas.length>lim){var m=document.createElement('button');m.type='button';m.className='si-mais';m.textContent='Mostrar mais '+Math.min(POR_COL,abertas.length-lim)+' de '+(abertas.length-lim);m.addEventListener('click',function(e){e.stopPropagation();S.limite[g.id]=lim+POR_COL;renderQuadro(el);});cards.appendChild(m);}
      if(!abertas.length&&!concl.length)cards.innerHTML='<div class="si-vazio">Nenhuma intimação</div>';
      if(concl.length){
        if(f.situacao==='concluidas'){concl.forEach(function(i){cards.appendChild(cartao(i));});}
        else{
          var arq=document.createElement('div');arq.className='si-arquivo'+(S.concluidasAbertas[g.id]?' aberto':'');
          arq.innerHTML='<button type="button">'+(S.concluidasAbertas[g.id]?'Ocultar':'Ver')+' concluídas ('+concl.length+')</button><div class="lista"></div>';
          concl.forEach(function(i){arq.querySelector('.lista').appendChild(cartao(i));});
          arq.firstChild.addEventListener('click',function(e){e.stopPropagation();S.concluidasAbertas[g.id]=!S.concluidasAbertas[g.id];renderQuadro(el);});
          cards.appendChild(arq);
        }
      }
      q.appendChild(c);
    });
    if(f.organizar==='colunas'&&S.pode.gerenciar){
      var nova=document.createElement('button');nova.type='button';nova.className='si-btn';nova.style.cssText='flex:0 0 auto;height:42px';nova.textContent='+ Nova coluna';
      nova.addEventListener('click',novaColuna);q.appendChild(nova);
    }
    ligarCartoes(q);
    // arrastar entre colunas (só em "Minhas colunas")
    var arrastando=null;
    q.addEventListener('dragstart',function(e){var c=e.target.closest('.si-card');if(!c)return;arrastando=c.dataset.int;c.classList.add('arrastando');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','intimacao:'+arrastando);});
    q.addEventListener('dragend',function(e){var c=e.target.closest('.si-card');if(c)c.classList.remove('arrastando');arrastando=null;q.querySelectorAll('.sobre').forEach(function(x){x.classList.remove('sobre');});});
    q.addEventListener('dragover',function(e){if(!arrastando)return;var c=e.target.closest('.si-col');if(!c||c.dataset.col.indexOf('t:')===0)return;e.preventDefault();q.querySelectorAll('.sobre').forEach(function(x){if(x!==c)x.classList.remove('sobre');});c.classList.add('sobre');});
    q.addEventListener('drop',function(e){var c=e.target.closest('.si-col');if(!c||!arrastando)return;e.preventDefault();c.classList.remove('sobre');atualizar(arrastando,{coluna_id:c.dataset.col});});
    q.addEventListener('click',function(e){var m=e.target.closest('[data-menu-col]');if(m){e.stopPropagation();menuColuna(m,m.dataset.menuCol);}});
  }

  /* ---------- "Tudo junto": intimações dentro das colunas das tarefas (por tribunal) ---------- */
  function injetarNoKanbanTarefas(wrapper){
    if(!wrapper)return;
    var lista=ordenar(filtradas(true).filter(function(i){return !i.concluida;}));
    var porChave={};lista.forEach(function(i){var k=justicaDe(i).chave;(porChave[k]=porChave[k]||[]).push(i);});
    var usadas={};
    wrapper.querySelectorAll('.coluna-kanban-tarefas').forEach(function(colEl){
      var t=colEl.querySelector('.coluna-kanban-titulo'),k=chaveTrib(t?t.textContent:'');
      var its=porChave[k];if(!its||!its.length)return;usadas[k]=1;
      var alvo=colEl.querySelector('.lista-cards-coluna');if(!alvo)return;
      var bloco=document.createElement('div');bloco.className='si-injetado';bloco.style.cssText='display:flex;flex-direction:column;gap:9px';
      bloco.innerHTML='<div class="si-tit-injetado">Intimações ('+its.length+')</div>';
      its.forEach(function(i){bloco.appendChild(cartao(i,{compacto:true}));});
      alvo.insertBefore(bloco,alvo.firstChild);
      var cont=colEl.querySelector('.contagem-coluna-kanban');if(cont)cont.textContent=String(Number(cont.textContent||0)+its.length);
      ligarCartoes(bloco);
    });
    var resto=lista.filter(function(i){return !usadas[justicaDe(i).chave];});
    if(resto.length){
      var c=document.createElement('div');c.className='si-col';c.style.maxHeight='calc(100vh - 280px)';
      c.innerHTML='<div class="si-col-cab"><span class="ponto" style="--c:#4b8af5"></span><span class="nome">Intimações · outros tribunais</span><span class="qtd">'+resto.length+'</span></div><div class="si-col-sub">Tribunais sem coluna nas tarefas</div><div class="si-cards"></div>';
      var cards=c.querySelector('.si-cards');resto.slice(0,80).forEach(function(i){cards.appendChild(cartao(i,{compacto:true}));});
      var antes=wrapper.querySelector('.btn-add-coluna-nova');
      if(antes)wrapper.insertBefore(c,antes);else wrapper.appendChild(c);
      ligarCartoes(c);
    }
  }

  /* ---------- lista ---------- */
  function renderLista(el,comTitulo){
    var lista=ordenar(filtradas(false)),f=S.f;
    var linhas=lista.slice(0,600).map(function(i){
      var j=justicaDe(i),col=coluna(i.coluna_id),u=urgencia(i),cli=clienteDe(i);
      return '<tr data-int="'+esc(i.id)+'" class="'+(i.concluida?'concluida':'')+'"><td><button class="si-chk'+(i.concluida?' on':'')+'" type="button" data-chk title="'+(i.concluida?'Reabrir':'Concluir')+'">'+(i.concluida?'✓':'')+'</button></td>'+
        '<td style="white-space:nowrap">'+dataBR(i.data_disponibilizacao)+'</td>'+
        '<td style="white-space:nowrap"><span class="si-proc" style="margin:0"><span>'+esc(cnj(i))+'</span><button class="si-copiar" type="button" data-copiar="'+esc(cnj(i))+'" title="Copiar">'+ICO_COPIAR+'</button></span><div class="si-sub">'+esc(i.classe||'')+'</div></td>'+
        '<td><div class="si-cli">'+esc(cli||partesAtivas(i)||'—')+'</div>'+(cli?'<div class="si-sub">Cliente do SAGA</div>':'')+'</td>'+
        '<td><b>'+esc(j.sigla)+'</b><div class="si-sub">'+esc(j.rotulo)+'</div><div class="si-sub">'+esc(i.orgao||'')+'</div></td>'+
        '<td>'+esc(i.tipo_documento||i.tipo_comunicacao||'')+'</td>'+
        '<td>'+esc(advogadosDe(i).map(primeiroNome).join(' + ')||'—')+'</td>'+
        '<td>'+(i.etiqueta?'<span class="si-tag" style="--c:'+esc(i.etiqueta_cor||corEtiqueta(i.etiqueta))+'">'+esc(i.etiqueta)+'</span> ':'')+(u?'<span class="si-prazo '+u.cls+'">'+esc(u.txt)+'</span>':'')+'</td>'+
        '<td>'+(col?'<span class="si-tag" style="--c:'+esc(col.cor||'#8a94a8')+'">'+esc(col.nome)+'</span>':'')+'</td></tr>';
    }).join('');
    el.innerHTML=(comTitulo?'<div class="si-titulo-secao">Intimações</div>':'')+'<div class="si-tabela"><table><thead><tr><th></th><th>Disponibilizada</th><th>Processo</th><th>Parte / cliente</th><th>Justiça</th><th>Documento</th><th>Advogados</th><th>Etiqueta e prazo</th><th>Coluna</th></tr></thead><tbody>'+
      (linhas||'<tr><td colspan="9"><div class="si-vazio">Nenhuma intimação com esses filtros.</div></td></tr>')+'</tbody></table></div>'+
      (lista.length>600?'<div class="si-sub">Mostrando 600 de '+lista.length+'. Use os filtros para achar as demais.</div>':'');
    ligarCartoes(el.querySelector('tbody'));
  }

  /* ---------- ações ---------- */
  async function atualizar(id,campos,silencio){
    var i=S.itens.filter(function(x){return x.id===id;})[0];if(!i)return false;
    var antes=Object.assign({},i);
    Object.keys(campos).forEach(function(k){i[k]=campos[k];});
    if(campos.coluna_id){var c=coluna(campos.coluna_id);if(c&&c.chave)i.situacao=c.chave;}
    if('concluida' in campos)i.concluida_em=campos.concluida?new Date().toISOString():null;
    mudou();
    var r=await S.sb.rpc('intimacao_atualizar',{p_id:id,p_campos:campos});
    if(r.error){Object.assign(i,antes);mudou();toast('Não foi possível salvar: '+esc(r.error.message),'error');return false;}
    if(!silencio&&S.aberta===id)carregarHistorico(id);
    return true;
  }
  async function alternarConcluida(id){
    var i=S.itens.filter(function(x){return x.id===id;})[0];if(!i)return;
    var ok=await atualizar(id,{concluida:!i.concluida});
    if(ok&&i.concluida){
      // A concluída fica no fim da própria coluna: abre o bloco "concluídas" dela para a pessoa ver onde foi parar
      grupos(filtradas(true)).forEach(function(g){if(g.itens.some(function(x){return x.id===id;}))S.concluidasAbertas[g.id]=true;});
      mudou();avisoDesfazer(id);
    }else if(ok)toast('Intimação reaberta.','sucesso');
    if(S.aberta===id)preencherJanela(i);
  }
  function avisoDesfazer(id){
    var velho=document.getElementById('siDesfazer');if(velho)velho.remove();
    var d=document.createElement('div');d.id='siDesfazer';d.className='si-desfazer';d.setAttribute('role','status');
    d.innerHTML='<span>Intimação concluída. Ela ficou no fim da coluna, em "concluídas".</span><button type="button">Desfazer</button>';
    d.querySelector('button').onclick=function(){d.remove();alternarConcluida(id);};
    document.body.appendChild(d);
    setTimeout(function(){if(d.parentNode)d.remove();},8000);
  }

  /* ---------- janelas ---------- */
  function montarJanelas(){
    if(document.getElementById('siJanela'))return;
    var w=document.createElement('div');
    w.innerHTML=
    '<div class="si-ov" id="siJanela"><div class="si-modal">'+
      '<div class="si-mh"><div><h2 id="siTitulo">Intimação</h2><p id="siSub"></p></div><button class="si-x" type="button" data-fechar>✕</button></div>'+
      '<div class="si-mb"><div class="si-grid">'+
        '<div>'+
          '<div class="si-acoes" style="margin-bottom:10px"><button class="si-btn" type="button" id="siTribunal">Abrir processo no tribunal</button><a class="si-btn" id="siDoc" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">Abrir documento</a><button class="si-btn" type="button" id="siCopiarNum">Copiar número</button></div>'+
          '<div class="si-texto" id="siTexto"></div>'+
          '<div class="si-sec">Comentários e histórico</div>'+
          '<div class="si-hist" id="siHist"></div>'+
          '<div class="si-campo"><textarea id="siComent" placeholder="Ex.: Analisada, fazer réplica · Réplica protocolada"></textarea></div>'+
          '<div class="si-acoes" style="align-items:center"><button class="si-btn pri" type="button" id="siComentar">Comentar</button><span class="si-sub" style="margin:0">e mover para</span><select id="siMoverCom" style="height:34px;padding:0 9px;border:1px solid var(--border);border-radius:9px;background:var(--panel-2,var(--panel));color:var(--text);font:inherit;font-size:11.5px"></select></div>'+
        '</div>'+
        '<div>'+
          '<div class="si-acoes" style="margin-bottom:6px"><button class="si-btn" type="button" id="siConcluir">Concluir</button></div>'+
          '<div class="si-g2"><div class="si-campo"><label for="siColuna">Coluna</label><select id="siColuna"></select></div>'+
          '<div class="si-campo"><label for="siPrazo">Prazo</label><input id="siPrazo" type="date"></div></div>'+
          '<div class="si-g2"><div class="si-campo"><label for="siEtiqueta">Etiqueta (o que fazer)</label><input id="siEtiqueta" list="siEtiquetas" placeholder="Ex.: Réplica, Agravo"><datalist id="siEtiquetas">'+ETIQUETAS.map(function(e){return '<option value="'+e[0]+'">';}).join('')+'</datalist></div>'+
          '<div class="si-campo"><label for="siCor">Cor</label><input id="siCor" type="color" style="padding:3px"></div></div>'+
          '<div class="si-acoes"><button class="si-btn" type="button" id="siSalvarPrazo">Salvar prazo e etiqueta</button></div>'+
          '<div class="si-sec">Processo no SAGA</div><div id="siProcesso"></div>'+
          '<div class="si-sec">Dados</div><div class="si-dados" id="siDados"></div>'+
        '</div>'+
      '</div></div>'+
    '</div></div>'+
    '<div class="si-ov" id="siOabs"><div class="si-modal peq">'+
      '<div class="si-mh"><div><h2>OABs monitoradas</h2><p>Cada OAB fica ligada a um advogado do escritório. Advogado novo com OAB entra sozinho nos filtros.</p></div><button class="si-x" type="button" data-fechar>✕</button></div>'+
      '<div class="si-mb"><div id="siOabLista"></div>'+
        '<div class="si-oab-nova"><div class="si-campo"><label for="siOnAdv">Advogado</label><select id="siOnAdv"></select></div><div class="si-campo"><label for="siOnNum">Número da OAB</label><input id="siOnNum" inputmode="numeric" placeholder="Ex.: 15318"></div><div class="si-campo"><label for="siOnUf">UF</label><select id="siOnUf">'+Object.keys(UF_NOME).map(function(u){return '<option'+(u==='AL'?' selected':'')+'>'+u+'</option>';}).join('')+'</select></div><button class="si-btn pri" type="button" id="siOnAdd" style="height:36px">Incluir</button></div>'+
        '<div class="si-sub" style="margin-top:8px">Ao incluir, o sistema busca as intimações dos últimos 30 dias dessa OAB.</div>'+
        '<div id="siHorasWrap" style="display:none"><div class="si-sec">Horários da busca automática (dias úteis)</div><div class="si-horas" id="siHoras"></div></div>'+
      '</div><div class="si-mf"><button class="si-btn" type="button" data-fechar>Fechar</button></div>'+
    '</div></div>';
    w.insertAdjacentHTML('beforeend','<div class="si-ov" id="siLinks"><div class="si-modal">'+
      '<div class="si-mh"><div><h2>Links dos tribunais</h2><p>Consulta processual de cada justiça (PJe, eproc, e-SAJ...). O botão "Abrir processo no tribunal" da intimação copia o número e abre este link. Um tribunal pode ter vários (1º grau, 2º grau, Juizado).</p></div><button class="si-x" type="button" data-fechar>✕</button></div>'+
      '<div class="si-mb"><div id="siLinksSem"></div><div id="siLinksLista"></div>'+
        '<div class="si-sec">Colar da planilha</div><div class="si-campo"><textarea id="siLinksColar" placeholder="Uma linha por link: TRIBUNAL ; NOME ; SISTEMA ; LINK  (pode colar direto do Excel ou do Google Planilhas)"></textarea></div>'+
        '<div class="si-acoes"><button class="si-btn pri" type="button" id="siLinksImportar">Importar</button></div>'+
      '</div><div class="si-mf"><button class="si-btn" type="button" data-fechar>Fechar</button></div></div></div>');
    while(w.firstChild)document.body.appendChild(w.firstChild);
    document.querySelectorAll('.si-ov').forEach(function(o){
      o.addEventListener('click',function(e){if(e.target===o||e.target.closest('[data-fechar]')){o.classList.remove('open');if(o.id==='siJanela')S.aberta=null;}});
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){var o=document.querySelector('.si-ov.open');if(o){o.classList.remove('open');if(o.id==='siJanela')S.aberta=null;}}});
    document.getElementById('siCopiarNum').addEventListener('click',function(){var i=aberta();if(i)copiar(cnj(i));});
    document.getElementById('siTribunal').addEventListener('click',function(e){e.stopPropagation();abrirNoTribunal(this);});
    document.getElementById('siLinksImportar').addEventListener('click',importarLinks);
    document.getElementById('siLinks').addEventListener('click',async function(e){
      var sv=e.target.closest('[data-salvar]'),ex=e.target.closest('[data-excluir]');
      if(sv)salvarLink(sv.closest('.si-link'));
      if(ex){var row=ex.closest('.si-link');if(!(await confirmar('Excluir link','Excluir este link do tribunal?','Excluir')))return;var r=await S.sb.from('tribunais_links').delete().eq('id',row.dataset.id);if(r.error){toast('Não foi possível excluir: '+esc(r.error.message),'error');return;}await recarregarLinks();}
    });
    document.getElementById('siConcluir').addEventListener('click',function(){var i=aberta();if(i)alternarConcluida(i.id);});
    document.getElementById('siColuna').addEventListener('change',function(){var i=aberta();if(i)atualizar(i.id,{coluna_id:this.value});});
    document.getElementById('siEtiqueta').addEventListener('input',function(){var e=ETIQUETAS.filter(function(x){return x[0].toLowerCase()===this.value.trim().toLowerCase();},this)[0];if(e)document.getElementById('siCor').value=e[1];});
    document.getElementById('siSalvarPrazo').addEventListener('click',async function(){
      var i=aberta();if(!i)return;
      var et=document.getElementById('siEtiqueta').value.trim();
      var ok=await atualizar(i.id,{prazo:document.getElementById('siPrazo').value||null,etiqueta:et||null,etiqueta_cor:et?document.getElementById('siCor').value:null});
      if(ok)toast('Prazo e etiqueta salvos'+(i.processo_id?'; aparecem também na ficha do cliente.':'.'),'sucesso');
    });
    document.getElementById('siComentar').addEventListener('click',async function(){
      var i=aberta(),t=document.getElementById('siComent');if(!i||!t.value.trim())return;
      var r=await S.sb.rpc('intimacao_comentar',{p_id:i.id,p_texto:t.value});
      if(r.error){toast('Não foi possível comentar: '+esc(r.error.message),'error');return;}
      t.value='';
      var mv=document.getElementById('siMoverCom').value;
      if(mv&&mv!==i.coluna_id){if(await atualizar(i.id,{coluna_id:mv},true)){var c=coluna(mv);toast('Comentado e movido para "'+esc(c?c.nome:'')+'".','sucesso');preencherJanela(i);}}
      carregarHistorico(i.id);
    });
    document.getElementById('siOnAdd').addEventListener('click',incluirOab);
    document.getElementById('siOnAdv').addEventListener('change',function(){var u=usuario(this.value);if(u&&u.numero_oab){document.getElementById('siOnNum').value=String(u.numero_oab).replace(/\D/g,'');if(u.uf_oab)document.getElementById('siOnUf').value=String(u.uf_oab).toUpperCase();}});
    document.getElementById('siOabLista').addEventListener('click',function(e){
      var a=e.target.closest('[data-oab-ativo]'),b=e.target.closest('[data-oab-buscar]'),c=e.target.closest('[data-oab-remover]');
      if(a)alternarOab(a.dataset.oabAtivo);else if(b)buscarAgora(b.dataset.oabBuscar,b);else if(c)removerOab(c.dataset.oabRemover);
    });
    document.getElementById('siHoras').addEventListener('click',function(e){var b=e.target.closest('[data-hora]');if(b)salvarHoras(Number(b.dataset.hora));});
  }
  function aberta(){return S.itens.filter(function(x){return x.id===S.aberta;})[0];}
  function destacar(t){
    return esc(t).replace(/(prazo (?:comum )?(?:de|em) \d+\s*(?:\([^)]{1,30}\))?\s*(?:dias(?: úteis)?|horas))/gi,'<mark>$1</mark>')
      .replace(/(\b(?:intime-se|intimem-se|cite-se|manifeste-se|manifestar-se)\b)/gi,'<mark>$1</mark>');
  }
  async function abrir(id){
    var i=S.itens.filter(function(x){return x.id===id;})[0];
    if(!i){var r=await S.sb.from('intimacoes').select('*').eq('id',id).maybeSingle();if(!r.data){toast('Intimação não encontrada (ou sem permissão).','error');return;}i=r.data;S.itens.push(i);}
    S.aberta=i.id;
    preencherJanela(i);
    document.getElementById('siJanela').classList.add('open');
    var t=document.getElementById('siTexto');t.textContent='Carregando o texto...';
    var r2=await S.sb.from('intimacoes').select('texto').eq('id',i.id).maybeSingle();
    if(S.aberta===i.id)t.innerHTML=r2.data&&r2.data.texto?destacar(r2.data.texto):'<span class="si-sub">Sem texto.</span>';
    carregarHistorico(i.id);
  }
  function preencherJanela(i){
    var j=justicaDe(i);
    document.getElementById('siTitulo').textContent=(i.tipo_documento||i.tipo_comunicacao||'Intimação')+' · '+cnj(i);
    document.getElementById('siSub').textContent=[j.sigla+' · '+j.rotulo,i.orgao,'disponibilizada em '+dataBR(i.data_disponibilizacao)].filter(Boolean).join(' · ');
    var lk=document.getElementById('siDoc');if(i.link){lk.href=i.link;lk.style.display='inline-flex';}else lk.style.display='none';
    var bt=document.getElementById('siTribunal'),l=linksDe(j.chave);
    bt.disabled=!l.length;bt.textContent=l.length>1?'Abrir processo no tribunal ▾':'Abrir processo no tribunal';
    bt.title=l.length?'Copia o número e abre a consulta do '+j.sigla:'Link do '+j.sigla+' ainda não cadastrado ('+(S.pode.gerenciar?'cadastre em "Links dos tribunais"':'peça ao administrador')+')';
    document.getElementById('siConcluir').textContent=i.concluida?'Reabrir':'Concluir';
    document.getElementById('siConcluir').className='si-btn'+(i.concluida?'':' pri');
    document.getElementById('siMoverCom').innerHTML='<option value="">mesma coluna</option>'+S.colunas.filter(function(c){return c.id!==i.coluna_id;}).map(function(c){return '<option value="'+esc(c.id)+'">'+esc(c.nome)+'</option>';}).join('');
    document.getElementById('siColuna').innerHTML=S.colunas.map(function(c){return '<option value="'+esc(c.id)+'"'+(c.id===i.coluna_id?' selected':'')+'>'+esc(c.nome)+'</option>';}).join('');
    document.getElementById('siPrazo').value=i.prazo||'';
    document.getElementById('siEtiqueta').value=i.etiqueta||'';
    document.getElementById('siCor').value=i.etiqueta_cor||(i.etiqueta?corEtiqueta(i.etiqueta):'#e5484d');
    var partes=(i.partes||[]).map(function(p){return '<span class="si-cli">'+esc(p.nome)+'</span>'+(p.polo?' <span class="si-sub" style="display:inline">('+(p.polo==='A'?'polo ativo':p.polo==='P'?'polo passivo':esc(p.polo))+')</span>':'');}).join('<br>');
    var advs=(i.advogados||[]).map(function(a){return esc(a.nome)+' (OAB '+esc(a.numero_oab)+'/'+esc(a.uf_oab)+')';}).join('<br>');
    var dados=[['Justiça',esc(j.sigla+' · '+j.rotulo)],['Classe',esc(i.classe||'—')],['Partes intimadas',partes||'—'],['Advogados',advs||'—'],['Do escritório',esc(advogadosDe(i).map(nomeUsuario).join(', ')||'—')],['Origem',i.fonte==='email'?'E-mail (radar)':'CNJ · Diário de Justiça Eletrônico Nacional']];
    document.getElementById('siDados').innerHTML=dados.map(function(d){return '<div><div class="l">'+d[0]+'</div><div>'+d[1]+'</div></div>';}).join('');
    renderProcesso(i);
  }
  async function carregarHistorico(id){
    var r=await S.sb.from('intimacoes_comentarios').select('*').eq('intimacao_id',id).order('criado_em',{ascending:false});
    if(S.aberta!==id)return;
    var cores={comentario:'#4b8af5',coluna:'#8a94a8',prazo:'#e0a93b',etiqueta:'#ec4899',concluida:'#2fae7a',reaberta:'#f97316',processo:'#8b5cf6'};
    var h=document.getElementById('siHist'),l=r.data||[];
    h.innerHTML=l.length?l.map(function(c){return '<div class="si-hi" style="--c:'+(cores[c.tipo]||'#8a94a8')+'"><div class="q">'+esc(nomeUsuario(c.usuario_id)||'Sistema')+' · '+new Date(c.criado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})+'</div><div class="t">'+esc(c.texto||'')+'</div></div>';}).join(''):'<div class="si-sub">Nenhum comentário ainda.</div>';
  }

  /* ---------- processo: já cadastrado, incorporar ou ligar ---------- */
  function renderProcesso(i){
    var w=document.getElementById('siProcesso'),p=i.processo_id&&S.processos[i.processo_id];
    if(i.processo_id){
      w.innerHTML='<div class="si-proc-box ok"><b>✓ Processo já cadastrado no SAGA</b><div style="margin-top:4px"><span class="si-cli">'+esc(p&&p.pessoa?p.pessoa.nome_completo:'Cliente')+'</span></div>'+
        '<div class="si-acoes" style="margin-top:8px"><a class="si-btn sm" style="display:inline-flex;align-items:center;text-decoration:none" href="ficha_cliente_padrao_metalico_FINAL.html?processo_id='+esc(i.processo_id)+'">Abrir ficha do cliente</a></div></div>';
      return;
    }
    w.innerHTML='<div class="si-proc-box falta"><b>Este processo não está no sistema.</b><div class="si-sub">Deseja incorporar? O SAGA cria o processo (e o cliente, se ainda não existir) com o número e o tribunal desta intimação.</div>'+
      '<div class="si-acoes" style="margin-top:8px">'+(S.pode.criarProc?'<button class="si-btn pri sm" type="button" data-p="incorporar">Incorporar ao SAGA</button>':'')+(S.pode.gerenciar?'<button class="si-btn sm" type="button" data-p="ligar">Ligar a um processo existente</button>':'')+'</div><div id="siProcForm"></div></div>';
    w.onclick=function(e){var b=e.target.closest('[data-p]');if(!b)return;if(b.dataset.p==='incorporar')formIncorporar(i);else if(b.dataset.p==='ligar')formLigar(i);};
  }
  async function formIncorporar(i){
    var f=document.getElementById('siProcForm');
    if(!S.teses.length){var t=await S.sb.from('teses').select('id,nome').order('nome');S.teses=t.data||[];}
    var nome=((i.partes||[]).filter(function(p){return p.polo==='A';})[0]||(i.partes||[])[0]||{}).nome||'';
    f.innerHTML='<div class="si-campo" style="margin-top:10px"><label>Cliente</label><input id="siIncCli" value="'+esc(nome)+'" placeholder="Nome do cliente"><div class="si-res-list" id="siIncSug"></div></div>'+
      '<div class="si-g2"><div class="si-campo"><label>Tese</label><select id="siIncTese"><option value="">Escolha...</option>'+S.teses.map(function(t){return '<option value="'+esc(t.id)+'">'+esc(t.nome)+'</option>';}).join('')+'</select></div>'+
      '<div class="si-campo"><label>Responsável</label><select id="siIncResp">'+S.usuarios.filter(function(u){return u.ativo&&u.auth_user_id;}).map(function(u){return '<option value="'+esc(u.id)+'"'+(u.id===(i.responsavel_id||S.meuId)?' selected':'')+'>'+esc(u.nome_completo)+'</option>';}).join('')+'</select></div></div>'+
      '<div class="si-acoes"><button class="si-btn pri sm" type="button" id="siIncOk">Incorporar</button></div>';
    var escolhida=null,tm=null;
    async function sugerir(){
      var v=document.getElementById('siIncCli').value.trim();escolhida=null;var s=document.getElementById('siIncSug');
      if(v.length<3){s.innerHTML='';return;}
      var r=await S.sb.from('pessoas').select('id,nome_completo,cpf').ilike('nome_completo','%'+v+'%').limit(6);
      s.innerHTML=(r.data||[]).length?'<div class="si-sub">Já existe no SAGA? Clique para usar o cliente cadastrado:</div>'+(r.data||[]).map(function(p){return '<button type="button" data-pes="'+esc(p.id)+'">'+esc(p.nome_completo)+(p.cpf?' · CPF '+esc(p.cpf):'')+'</button>';}).join(''):'<div class="si-sub">Cliente novo: será cadastrado com este nome.</div>';
    }
    document.getElementById('siIncCli').addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(sugerir,250);});
    document.getElementById('siIncSug').addEventListener('click',function(e){var b=e.target.closest('[data-pes]');if(!b)return;escolhida=b.dataset.pes;document.getElementById('siIncCli').value=b.textContent.split(' · ')[0];this.innerHTML='<div class="si-sub">✓ Usando o cliente já cadastrado.</div>';});
    sugerir();
    document.getElementById('siIncOk').addEventListener('click',async function(){
      var tese=document.getElementById('siIncTese').value;if(!tese){toast('Escolha a tese.','error');return;}
      this.disabled=true;
      var r=await S.sb.rpc('intimacao_incorporar',{p_id:i.id,p_pessoa_id:escolhida,p_cliente_nome:document.getElementById('siIncCli').value,p_tese_id:tese,p_responsavel_id:document.getElementById('siIncResp').value||null});
      this.disabled=false;
      if(r.error){toast('Não foi possível incorporar: '+esc(r.error.message),'error');return;}
      toast('Processo incorporado ao SAGA. A intimação já está na ficha do cliente.','sucesso');
      await carregar();mudou();var n=S.itens.filter(function(x){return x.id===i.id;})[0];if(n){preencherJanela(n);carregarHistorico(n.id);}
    });
  }
  function formLigar(i){
    var f=document.getElementById('siProcForm');
    f.innerHTML='<div class="si-campo" style="margin-top:10px"><label>Número do processo ou nome do cliente</label><input id="siLigBusca" placeholder="Digite ao menos 3 letras ou números"></div><div class="si-res-list" id="siLigRes"></div>';
    var tm=null;
    async function buscar(){
      var t=document.getElementById('siLigBusca').value.trim(),w=document.getElementById('siLigRes');if(t.length<3){w.innerHTML='';return;}
      var dig=t.replace(/\D/g,''),ach={},cs=[];
      if(dig.length>=4)cs.push(S.sb.from('processos').select('id,numero_processo_cnj,pessoa:pessoas(nome_completo)').eq('excluido_logico',false).ilike('numero_processo_cnj','%'+dig.slice(0,7)+'%').limit(15));
      if(/[a-zà-ÿ]/i.test(t))cs.push(S.sb.from('pessoas').select('id').ilike('nome_completo','%'+t+'%').limit(10).then(function(r){var ids=(r.data||[]).map(function(p){return p.id;});if(!ids.length)return {data:[]};return S.sb.from('processos').select('id,numero_processo_cnj,pessoa:pessoas(nome_completo)').eq('excluido_logico',false).in('pessoa_id',ids).limit(20);}));
      (await Promise.all(cs)).forEach(function(r){(r.data||[]).forEach(function(p){ach[p.id]=p;});});
      var l=Object.values(ach);
      w.innerHTML=l.length?l.map(function(p){return '<button type="button" data-proc="'+esc(p.id)+'"><span class="si-cli">'+esc(p.pessoa?p.pessoa.nome_completo:'Cliente')+'</span><div class="si-sub">'+esc(p.numero_processo_cnj||'Sem número')+'</div></button>';}).join(''):'<div class="si-sub">Nenhum processo encontrado.</div>';
    }
    document.getElementById('siLigBusca').addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(buscar,250);});
    document.getElementById('siLigRes').addEventListener('click',async function(e){
      var b=e.target.closest('[data-proc]');if(!b)return;
      var r=await S.sb.rpc('intimacao_vincular_processo',{p_id:i.id,p_processo:b.dataset.proc,p_responsavel:null});
      if(r.error){toast('Não foi possível ligar: '+esc(r.error.message),'error');return;}
      toast('Intimação ligada ao processo.','sucesso');await carregar();mudou();var n=S.itens.filter(function(x){return x.id===i.id;})[0];if(n)preencherJanela(n);
    });
  }

  /* ---------- mover de coluna pelo menu (funciona em todas as visões e no celular) ---------- */
  function menuMover(btn,id){
    fecharMenus();var i=S.itens.filter(function(x){return x.id===id;})[0];if(!i)return;
    var m=document.createElement('div');m.className='si-menu';
    m.innerHTML='<div class="tit">Mover para</div>'+S.colunas.map(function(c){return '<button type="button" data-c="'+esc(c.id)+'" class="'+(c.id===i.coluna_id?'atual':'')+'">'+(c.id===i.coluna_id?'✓ ':'')+esc(c.nome)+'</button>';}).join('')+
      '<div class="tit">Situação</div><button type="button" data-k>'+(i.concluida?'Reabrir':'Concluir')+'</button>';
    abrirMenuEm(m,btn);
    m.addEventListener('click',function(e){
      var b=e.target.closest('[data-c]'),k=e.target.closest('[data-k]');if(!b&&!k)return;fecharMenus();
      if(k){alternarConcluida(id);return;}
      if(b.dataset.c===i.coluna_id)return;
      var c=coluna(b.dataset.c);atualizar(id,{coluna_id:b.dataset.c}).then(function(ok){if(ok)toast('Movida para "'+esc(c?c.nome:'')+'".','sucesso');});
    });
  }
  function abrirMenuEm(m,btn){
    document.body.appendChild(m);var r=btn.getBoundingClientRect(),h=m.offsetHeight,w=m.offsetWidth||180;
    m.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px';
    m.style.top=(r.bottom+4+h>innerHeight-8?Math.max(8,r.top-h-4):r.bottom+4)+'px';
  }

  /* ---------- links da consulta de cada tribunal (T53) ---------- */
  function abrirNoTribunal(btn){
    var i=aberta();if(!i)return;var l=linksDe(justicaDe(i).chave);if(!l.length)return;
    if(l.length===1){copiar(cnj(i));window.open(l[0].link,'_blank','noopener');return;}
    fecharMenus();var m=document.createElement('div');m.className='si-menu';
    m.innerHTML='<div class="tit">Abrir no '+esc(justicaDe(i).sigla)+'</div>'+l.map(function(x,k){return '<button type="button" data-l="'+k+'">'+esc(x.nome)+(x.sistema?' · '+esc(x.sistema):'')+'</button>';}).join('');
    abrirMenuEm(m,btn);
    m.addEventListener('click',function(e){var b=e.target.closest('[data-l]');if(!b)return;fecharMenus();copiar(cnj(i));window.open(l[Number(b.dataset.l)].link,'_blank','noopener');});
  }
  function abrirLinks(){renderLinks();document.getElementById('siLinks').classList.add('open');}
  function renderLinks(){
    var vistos={};S.itens.forEach(function(i){var j=justicaDe(i);if(j.chave&&j.chave!=='—')vistos[j.chave]=j.sigla;});
    var semLink=Object.keys(vistos).filter(function(k){return !linksDe(k).length;}).sort();
    var opSist=function(v){return '<option value="">Sistema</option>'+SISTEMAS.map(function(x){return '<option'+(x===v?' selected':'')+'>'+x+'</option>';}).join('');};
    var linha=function(l,falta){return '<div class="si-link'+(falta?' falta':'')+'" data-id="'+esc(l.id||'')+'">'+
      '<input data-k="tribunal_chave" value="'+esc(l.tribunal_chave||'')+'" placeholder="Tribunal (ex.: TRF5)">'+
      '<input data-k="nome" value="'+esc(l.nome||'')+'" placeholder="Nome (ex.: PJe 1º grau, JEF)">'+
      '<select data-k="sistema">'+opSist(l.sistema||'')+'</select>'+
      '<input data-k="link" value="'+esc(l.link||'')+'" placeholder="https://... (link da consulta processual)">'+
      '<span style="display:flex;gap:4px"><button class="si-btn sm" type="button" data-salvar>Salvar</button>'+(l.id?'<button class="si-btn sm" type="button" data-excluir title="Excluir">✕</button>':'')+'</span></div>';};
    document.getElementById('siLinksSem').innerHTML=semLink.length?'<div class="si-sec" style="margin-top:0">Tribunais que já mandaram intimação e ainda não têm link</div>'+semLink.map(function(k){return linha({tribunal_chave:k,nome:'Consulta processual'},true);}).join(''):'';
    document.getElementById('siLinksLista').innerHTML='<div class="si-sec">Links cadastrados ('+S.links.length+')</div>'+(S.links.length?S.links.map(function(l){return linha(l);}).join(''):'<div class="si-vazio">Nenhum link cadastrado ainda.</div>')+
      '<div class="si-sec">Incluir link</div>'+linha({nome:'Consulta processual'});
  }
  async function salvarLink(row){
    var d={};row.querySelectorAll('[data-k]').forEach(function(el){d[el.dataset.k]=el.value.trim();});
    d.tribunal_chave=chaveTrib(d.tribunal_chave);
    if(!d.tribunal_chave||!/^https?:\/\//i.test(d.link)){toast('Informe o tribunal e um link que comece com https://','error');return;}
    d.nome=d.nome||'Consulta processual';d.sistema=d.sistema||null;d.atualizado_em=new Date().toISOString();
    var id=row.dataset.id,r=id?await S.sb.from('tribunais_links').update(d).eq('id',id):await S.sb.from('tribunais_links').insert(d);
    if(r.error){toast('Não foi possível salvar: '+esc(r.error.message),'error');return;}
    toast('Link salvo.','sucesso');await recarregarLinks();
  }
  async function recarregarLinks(){var r=await S.sb.from('tribunais_links').select('*').order('tribunal_chave').order('ordem').order('nome');S.links=r.data||[];renderLinks();if(S.aberta){var i=aberta();if(i)preencherJanela(i);}}
  async function importarLinks(){
    var t=document.getElementById('siLinksColar').value.trim();if(!t)return;
    var linhas=t.split(/\r?\n/).map(function(l){return l.split(/\t|;/).map(function(x){return x.trim();});}).filter(function(c){return c.some(function(x){return /^https?:\/\//i.test(x);});});
    var novos=linhas.map(function(c){var link=c.filter(function(x){return /^https?:\/\//i.test(x);})[0];var resto=c.filter(function(x){return x&&x!==link;});
      var sist=resto.filter(function(x){return SISTEMAS.some(function(s){return s.toLowerCase()===x.toLowerCase();});})[0]||null;
      var outros=resto.filter(function(x){return x!==sist;});
      return {tribunal_chave:chaveTrib(outros[0]||''),nome:outros[1]||'Consulta processual',sistema:sist,link:link};}).filter(function(x){return x.tribunal_chave;});
    if(!novos.length){toast('Não achei linhas com tribunal e link. Formato: TRIBUNAL ; NOME ; SISTEMA ; LINK (uma por linha).','error');return;}
    var r=await S.sb.from('tribunais_links').insert(novos);
    if(r.error){toast('Não foi possível importar: '+esc(r.error.message),'error');return;}
    document.getElementById('siLinksColar').value='';toast(novos.length+' link(s) importado(s).','sucesso');await recarregarLinks();
  }

  /* ---------- colunas ---------- */
  function fecharMenus(){document.querySelectorAll('.si-menu').forEach(function(m){m.remove();});}
  document.addEventListener('click',function(e){if(!e.target.closest('.si-menu'))fecharMenus();});
  function menuColuna(btn,id){
    fecharMenus();var c=coluna(id);if(!c)return;
    var m=document.createElement('div');m.className='si-menu';
    m.innerHTML='<button type="button" data-a="renomear">Renomear coluna</button>'+(c.chave?'':'<button type="button" class="perigo" data-a="excluir">Excluir coluna</button>');
    document.body.appendChild(m);var r=btn.getBoundingClientRect();m.style.top=(r.bottom+4)+'px';m.style.left=Math.max(8,Math.min(r.right-170,innerWidth-180))+'px';
    m.addEventListener('click',async function(e){
      var a=e.target.closest('[data-a]');if(!a)return;fecharMenus();
      if(a.dataset.a==='renomear'){var n=await pedirTexto('Renomear coluna','Nome da coluna',c.nome);if(!n||n===c.nome)return;var r1=await S.sb.from('intimacoes_colunas').update({nome:n}).eq('id',c.id);if(r1.error){toast('Não foi possível renomear: '+esc(r1.error.message),'error');return;}c.nome=n;mudou();}
      else{if(!(await confirmar('Excluir coluna','Excluir a coluna "'+c.nome+'"? As intimações dela voltam para "Novas".','Excluir')))return;var r2=await S.sb.from('intimacoes_colunas').delete().eq('id',c.id);if(r2.error){toast('Não foi possível excluir: '+esc(r2.error.message),'error');return;}await carregar();mudou();}
    });
  }
  async function novaColuna(){
    var n=await pedirTexto('Nova coluna','Nome da coluna','');if(!n)return;
    var r=await S.sb.from('intimacoes_colunas').insert({nome:n,ordem:S.colunas.length+1,cor:'#4b8af5'}).select('*').single();
    if(r.error){toast('Não foi possível criar: '+esc(r.error.message),'error');return;}
    S.colunas.push(r.data);mudou();
  }
  function confirmar(t,m,b){return global.sagaConfirmar?global.sagaConfirmar(t,m,b):Promise.resolve(window.confirm(m));}
  function pedirTexto(titulo,rotulo,valor){
    return new Promise(function(ok){
      var o=document.createElement('div');o.className='si-ov open';
      o.innerHTML='<div class="si-modal peq" style="max-width:420px"><div class="si-mh"><div><h2>'+esc(titulo)+'</h2></div><button class="si-x" type="button" data-n>✕</button></div><div class="si-mb"><div class="si-campo"><label>'+esc(rotulo)+'</label><input value="'+esc(valor)+'" maxlength="60"></div></div><div class="si-mf"><button class="si-btn" type="button" data-n>Cancelar</button><button class="si-btn pri" type="button" data-s>Salvar</button></div></div>';
      document.body.appendChild(o);var inp=o.querySelector('input');setTimeout(function(){inp.focus();inp.select();},30);
      function fim(v){o.remove();ok(v);}
      o.addEventListener('click',function(e){if(e.target===o||e.target.closest('[data-n]'))fim(null);else if(e.target.closest('[data-s]'))fim(inp.value.trim()||null);});
      inp.addEventListener('keydown',function(e){if(e.key==='Enter')fim(inp.value.trim()||null);if(e.key==='Escape')fim(null);});
    });
  }

  /* ---------- OABs e busca no CNJ ---------- */
  function abrirOabs(){renderOabs();document.getElementById('siOabs').classList.add('open');}
  function renderOabs(){
    var w=document.getElementById('siOabLista');
    w.innerHTML=S.oabs.length?S.oabs.map(function(o){
      var adv=nomeUsuario(o.usuario_vinculado_id);
      return '<div class="si-oab"><div><b>OAB '+esc(o.numero_oab)+'/'+esc(o.uf_oab)+'</b> · '+(adv?esc(adv):'<span style="color:var(--danger)">sem advogado ligado</span>')+
        '<div class="si-sub">'+(o.ultima_verificacao_em?'Última busca: '+new Date(o.ultima_verificacao_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Ainda não buscada')+'</div>'+
        (o.ultimo_erro?'<div class="si-sub" style="color:var(--danger)">Erro: '+esc(o.ultimo_erro)+'</div>':'')+'</div>'+
        '<button class="si-chave'+(o.ativo?' on':'')+'" type="button" data-oab-ativo="'+esc(o.id)+'" title="'+(o.ativo?'Monitorando: clique para pausar':'Pausada: clique para monitorar')+'"></button>'+
        '<button class="si-btn sm" type="button" data-oab-buscar="'+esc(o.id)+'">Buscar</button>'+
        '<button class="si-btn sm" type="button" data-oab-remover="'+esc(o.id)+'" title="Parar de monitorar">✕</button></div>';
    }).join(''):'<div class="si-vazio">Nenhuma OAB cadastrada.</div>';
    document.getElementById('siOnAdv').innerHTML='<option value="">Escolha...</option>'+S.usuarios.filter(function(u){return u.ativo&&u.auth_user_id;}).map(function(u){return '<option value="'+esc(u.id)+'">'+esc(u.nome_completo)+'</option>';}).join('');
    document.getElementById('siHorasWrap').style.display=S.ehAdmin?'':'none';
    document.getElementById('siHoras').innerHTML=[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(function(h){return '<button type="button" data-hora="'+h+'" class="'+(S.horas.indexOf(h)!==-1?'on':'')+'">'+h+'h</button>';}).join('');
  }
  async function incluirOab(){
    var adv=document.getElementById('siOnAdv').value,num=document.getElementById('siOnNum').value.replace(/\D/g,''),uf=document.getElementById('siOnUf').value;
    if(!adv||!num||!uf){toast('Escolha o advogado e informe o número e a UF da OAB.','error');return;}
    if(S.oabs.some(function(o){return o.numero_oab===num&&o.uf_oab===uf;})){toast('Essa OAB já está na lista.','error');return;}
    var r=await S.sb.from('monitoramento_config').insert({tipo_alvo:'oab',numero_oab:num,uf_oab:uf,usuario_vinculado_id:adv,nome_advogado:nomeUsuario(adv),criado_por_id:S.meuId,ativo:true,frequencia_horas:12}).select('id').single();
    if(r.error){toast('Não foi possível incluir: '+esc(r.error.message),'error');return;}
    document.getElementById('siOnNum').value='';
    toast('OAB incluída. Buscando as intimações dos últimos 30 dias...','sucesso');
    await carregar();renderOabs();mudou();buscarAgora(r.data.id);
  }
  async function alternarOab(id){
    var o=S.oabs.filter(function(x){return x.id===id;})[0];if(!o)return;
    var r=await S.sb.from('monitoramento_config').update({ativo:!o.ativo,atualizado_em:new Date().toISOString()}).eq('id',id);
    if(r.error){toast('Não foi possível mudar: '+esc(r.error.message),'error');return;}
    o.ativo=!o.ativo;renderOabs();
  }
  async function removerOab(id){
    var o=S.oabs.filter(function(x){return x.id===id;})[0];if(!o)return;
    if(!(await confirmar('Remover OAB','Parar de monitorar a OAB '+o.numero_oab+'/'+o.uf_oab+'? As intimações já buscadas continuam no sistema.','Remover')))return;
    var r=await S.sb.from('monitoramento_config').delete().eq('id',id);
    if(r.error){toast('Não foi possível remover: '+esc(r.error.message),'error');return;}
    S.oabs=S.oabs.filter(function(x){return x.id!==id;});renderOabs();mudou();
  }
  async function salvarHoras(h){
    var k=S.horas.indexOf(h);if(k===-1)S.horas.push(h);else S.horas.splice(k,1);
    S.horas.sort(function(a,b){return a-b;});renderOabs();
    var c=await S.sb.from('configuracoes_sistema').select('id,extra').limit(1).maybeSingle();
    if(c.error||!c.data){toast('Não foi possível salvar os horários.','error');return;}
    var r=await S.sb.from('configuracoes_sistema').update({extra:Object.assign({},c.data.extra||{},{monitoramento_horas:S.horas})}).eq('id',c.data.id);
    if(r.error)toast('Não foi possível salvar os horários: '+esc(r.error.message),'error');
    else toast(S.horas.length?'Busca automática às '+S.horas.map(function(x){return x+'h';}).join(', ')+' nos dias úteis.':'Busca automática desligada (só pelo botão).','sucesso');
  }
  async function buscarAgora(configId,btn){
    var txt=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Buscando no CNJ...';}
    try{
      var r=await S.sb.functions.invoke('monitoramento-djen',{body:{acao:'buscar',config_id:configId||null}});
      var d=r.data||{};
      if(r.error||!d.ok){toast('A busca falhou: '+esc(d.mensagem||(r.error&&r.error.message)||''),'error');return;}
      var novos=0,erros=[];(d.resultado||[]).forEach(function(x){if(x.erro)erros.push(x.oab+': '+x.erro);else novos+=x.novos||0;});
      toast(novos?novos+' intimação(ões) nova(s) encontrada(s).':'Nenhuma intimação nova.','sucesso');
      if(erros.length)toast('Erro: '+esc(erros.join(' · ')),'error');
      await carregar();mudou();if(document.getElementById('siOabs').classList.contains('open'))renderOabs();
    }finally{if(btn){btn.disabled=false;btn.textContent=txt;}}
  }

  function contagens(){
    var l=S.itens.filter(function(i){return !i.concluida;}),h=hojeISO();
    return {abertas:l.length,hoje:S.itens.filter(function(i){return i.data_disponibilizacao===h;}).length,
      atrasadas:l.filter(function(i){return i.prazo&&i.prazo<h;}).length,semProcesso:l.filter(function(i){return !i.processo_id;}).length};
  }

  global.SagaIntimacoes={iniciar:iniciar,carregar:carregar,montarFiltros:montarFiltros,renderQuadro:renderQuadro,renderLista:renderLista,
    injetarNoKanbanTarefas:injetarNoKanbanTarefas,abrir:abrir,contagens:contagens,justicaDe:justicaDe,
    filtrarProcesso:function(id){S.f.processo=id||null;},pronto:function(){return S.carregado;}};
})(window);
