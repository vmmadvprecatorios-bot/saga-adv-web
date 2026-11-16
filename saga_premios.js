/* =====================================================================
   SAGA · Captação: normas e prêmio (T164; 16/11/2026, Dr. Victor; blocos 222 a 225)
   Partes: Meu progresso (todos; o administrador escolhe a pessoa), Normas da Captação e
   Como funciona o prêmio (todos leem; só o administrador edita), Validar (o administrador
   e quem tem premios.validar) e Painel geral (só o administrador: todos, custo do mês,
   fechamento gravado, ajustes, quem participa, PDF).
   Dados: premio_painel; gravações pelas funções premio_* do banco.
   ===================================================================== */
(function(){
'use strict';
var P={aba:'meu',mes:null,d:null,erro:null,quem:null,validar:{sit:'pendentes',busca:'',lista:null,erro:null},usuarios:null,abertos:{}};
var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var MES_C=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var FAIXAS={padrao:'Padrão',medio:'Médio',alto:'Alto'};
var PAPEIS={iniciou:'Iniciou',documentacao:'Pegou a documentação',os_dois:'Iniciou e pegou a documentação'};
var TIPOS={escada:'Escada',mesmo_cliente:'Mesmo cliente',habilitacao:'Habilitação'};

function $(id){return document.getElementById(id);}
function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
function rs(v){var n=Number(v||0);return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function num(v){return Number(v||0).toLocaleString('pt-BR');}
function toast(msg,tipo){var w=$('toastWrap');var t=document.createElement('div');t.className='toast '+(tipo||'');t.textContent=msg;w.appendChild(t);setTimeout(function(){t.remove();},5200);}
function erroMsg(e){return (e&&(e.message||e.details||e.hint))||String(e||'erro desconhecido');}
function mesISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';}
function mesAtual(){return mesISO(new Date());}
function mesNome(iso){if(!iso)return '';var p=String(iso).slice(0,10).split('-');return MESES[Number(p[1])-1]+'/'+p[0];}
function mesCurto(iso){var p=String(iso).slice(0,10).split('-');return MES_C[Number(p[1])-1]+'/'+p[0].slice(2);}
function somaMes(iso,n){var p=iso.split('-');var d=new Date(Number(p[0]),Number(p[1])-1+n,1);return mesISO(d);}
function dataBR(d){if(!d)return '';var x=new Date(d);return x.toLocaleDateString('pt-BR');}
function semMov(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
function cnj(v){return v?(window.sagaFmt?sagaFmt.cnj(v):v):'';}
function linkFicha(pessoa,processo){return pessoa?FICHA+'?pessoa_id='+encodeURIComponent(pessoa)+(processo?'&processo_id='+encodeURIComponent(processo):''):null;}
function cfg(){return (P.d&&P.d.config)||{};}
function niveis(){return (cfg().niveis||[]).slice().sort(function(a,b){return a.nivel-b.nivel;});}
function nivelDe(n){var l=niveis();for(var i=0;i<l.length;i++){if(Number(l[i].nivel)===Number(n))return l[i];}return l[l.length-1]||{nivel:1,inicio:5,passo:5,plato:4};}
function degrau(n,k){var lv=nivelDe(n);return Number(lv.inicio)+Number(lv.passo)*(Math.min(k,Number(lv.plato))-1);}

/* ---------- máscaras (regra de 04/11: ninguém digita ponto nem vírgula) ---------- */
function mascaraMoeda(inp){
  inp.addEventListener('input',function(){var neg=/^\s*-/.test(inp.value)&&inp.dataset.neg==='1';var d=inp.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'');if(!d){inp.value='';return;}var n=Number(d)/100;inp.value=(neg?'-':'')+n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});});
}
function lerMoeda(v){var s=String(v||'');var neg=/^\s*-/.test(s);var d=s.replace(/\D/g,'');if(!d)return null;return (neg?-1:1)*Number(d)/100;}
function fmtMoedaCampo(n){if(n==null||n==='')return '';return Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function mascaraInteiro(inp){inp.addEventListener('input',function(){inp.value=inp.value.replace(/\D/g,'').slice(0,inp.dataset.max?Number(inp.dataset.max):4);});}
function ligarMascaras(raiz){raiz.querySelectorAll('input[data-moeda]').forEach(mascaraMoeda);raiz.querySelectorAll('input[data-inteiro]').forEach(mascaraInteiro);}

/* ---------- janela genérica ---------- */
var J={ok:null};
function abrirJanela(o){
  $('jTitulo').textContent=o.titulo||'';$('jSub').textContent=o.sub||'';$('jCorpo').innerHTML=o.corpo||'';$('jErro').textContent='';
  $('jOk').textContent=o.botao||'Salvar';$('jOk').className='btn '+(o.perigo?'btn-perigo':'btn-ouro');$('jOk').disabled=false;
  $('jCaixa').classList.toggle('largo',!!o.largo);
  J.ok=o.ok;ligarMascaras($('jCorpo'));
  if(o.depois)o.depois($('jCorpo'));
  $('janela').classList.add('aberto');
  setTimeout(function(){var f=$('jCorpo').querySelector('input:not([type=checkbox]),textarea,select');if(f)f.focus();},80);
}
function fecharJanela(){$('janela').classList.remove('aberto');J.ok=null;}
async function confirmarJanela(){
  if(!J.ok)return;$('jOk').disabled=true;$('jErro').textContent='';
  try{var r=await J.ok($('jCorpo'));if(r!==false)fecharJanela();}
  catch(e){$('jErro').textContent='Não consegui salvar: '+erroMsg(e);}
  $('jOk').disabled=false;
}

/* ---------- carga ---------- */
async function carregar(){
  P.erro=null;
  var r=await _sb.rpc('premio_painel',{p_mes:P.mes,p_usuario:P.quem||null});
  if(r.error){P.erro=erroMsg(r.error);P.d=null;desenhar();return;}
  P.d=r.data||{};
  $('mesNome').textContent=mesNome(P.d.mes||P.mes);
  document.querySelector('.pill[data-aba="validar"]').hidden=!P.d.pode_validar;
  document.querySelector('.pill[data-aba="geral"]').hidden=!P.d.admin;
  if((P.aba==='validar'&&!P.d.pode_validar)||(P.aba==='geral'&&!P.d.admin))P.aba='meu';
  marcarAba();
  desenhar();
  if(P.d.pode_validar&&P.validar.lista===null)carregarValidar();
}
async function carregarValidar(){
  var r=await _sb.rpc('premio_a_validar',{p_busca:P.validar.busca||null,p_situacao:P.validar.sit});
  if(r.error){P.validar.erro=erroMsg(r.error);P.validar.lista=[];}else{P.validar.erro=null;P.validar.lista=r.data||[];}
  if(P.validar.sit==='pendentes')$('nValidar').textContent=P.validar.lista.length?(P.validar.lista.length>=300?'300+':String(P.validar.lista.length)):'';
  if(P.aba==='validar')desenhar();
}
async function usuarios(){
  if(P.usuarios)return P.usuarios;
  var r=await _sb.from('usuarios').select('id,nome_completo').eq('ativo',true).order('nome_completo');
  P.usuarios=r.error?[]:(r.data||[]);return P.usuarios;
}

/* ---------- abas ---------- */
function marcarAba(){
  document.querySelectorAll('#abas .pill').forEach(function(b){b.classList.toggle('active',b.dataset.aba===P.aba);});
  $('mesNav').hidden=!(P.aba==='meu'||P.aba==='geral');
}
function desenhar(){
  var a=$('area');
  if(P.erro){a.innerHTML='<div class="erro-caixa"><b>Não consegui carregar o prêmio.</b>Motivo: '+esc(P.erro)+'<br>Clique em "Atualizar". Se continuar, mande esta mensagem ao administrador.</div>';return;}
  if(!P.d){a.innerHTML='<div class="vazio">Carregando…</div>';return;}
  var h='';
  if(P.aba==='meu')h=htmlMeu();
  else if(P.aba==='normas')h=htmlTextos('normas');
  else if(P.aba==='como')h=htmlComo();
  else if(P.aba==='validar')h=htmlValidar();
  else if(P.aba==='geral')h=htmlGeral();
  a.innerHTML=h;
  if(P.aba==='meu')animarBarra();
}

/* ---------- Meu progresso ---------- */
function avisoInicio(){
  var c=cfg();if(P.d.vale)return '';
  return '<div class="aviso">O prêmio começa a valer em <b>'+esc(mesNome(c.inicio_mes))+'</b>. Os números de '+esc(mesNome(P.d.mes))+' são só para acompanhar: ainda não viram dinheiro.</div>';
}
function htmlMeu(){
  var m=P.d.meu,h='';
  if(P.d.admin){
    h+='<div class="barra"><label class="ajuda" for="selQuem">Ver o progresso de</label><select class="ent" id="selQuem" style="min-width:200px">'+
      (P.d.pessoas_cfg||[]).map(function(p){return '<option value="'+esc(p.usuario_id)+'"'+(p.usuario_id===P.d.quem?' selected':'')+'>'+esc(p.nome)+(p.usuario_id===P.d.eu?' (eu)':'')+'</option>';}).join('')+'</select></div>';
  }
  h+=avisoInicio();
  if(P.d.fechado)h+='<div class="aviso" style="border-color:color-mix(in srgb,var(--success,#16a34a) 50%,transparent);background:color-mix(in srgb,var(--success,#16a34a) 8%,transparent)">Mês <b>fechado</b> em '+esc(dataBR(P.d.fechado_em))+': estes valores estão gravados e não mudam.</div>';
  if(!m){
    return h+'<div class="vazio"><b>Esta pessoa não está participando do prêmio.</b><br>O administrador escolhe quem participa no Painel geral.</div>'+htmlHistorico();
  }
  var lv=nivelDe(m.nivel),plato=Number(m.plato),val=Number(m.validados),bateu=!!m.bateu;
  var pct=Math.min(100,Math.round(val/plato*100));
  var deg='';for(var k=1;k<=plato;k++){deg+='<div class="degrau'+(k<=val?' feito':'')+'"><b>'+k+'º</b>'+esc(rs(degrau(m.nivel,k)).replace('R$ ','R$ '))+'</div>';}
  var msg=bateu
    ?'Platô batido! A partir de agora <b>cada processo validado vale '+esc(rs(degrau(m.nivel,plato)))+'</b> neste mês'+(Number(m.proximo_nivel)>Number(m.nivel)?' e no mês que vem você sobe para o <b>nível '+esc(m.proximo_nivel)+'</b>.':'.')
    :'Faltam <b>'+esc(m.faltam)+' processo'+(m.faltam>1?'s':'')+' validado'+(m.faltam>1?'s':'')+'</b> para o platô. O próximo vale <b>'+esc(rs(m.proximo_valor))+'</b>'+(Number(m.meses_sem_plato)>=1&&Number(m.nivel)>1?' · atenção: mais um mês sem bater o platô e o nível desce.':'.');
  h+='<section class="painel"><div class="topo-meu"><div class="selo-nivel" title="Seu nível neste mês"><small>Nível</small><b>'+esc(m.nivel)+'</b></div><div>'+
    '<div class="prog-tit"><span><b>'+esc(val)+'</b> de <b>'+esc(plato)+'</b> processos válidos para o platô · '+esc(mesNome(P.d.mes))+'</span><span>Previsão do prêmio: <b>'+esc(rs(m.total))+'</b></span></div>'+
    '<div class="prog'+(bateu?' batido':'')+'" role="progressbar" aria-valuemin="0" aria-valuemax="'+plato+'" aria-valuenow="'+val+'"><div class="enche" data-alvo="'+pct+'"></div></div>'+
    '<div class="degraus">'+deg+'</div><div class="prog-msg">'+msg+'</div></div></div>'+
    '<div class="grade">'+
      kpi('Captados no mês',num(m.captados),'cartões novos com você como captador(a)')+
      kpi('Validados no mês',num(m.validados),'contam na escada')+
      kpi('Extras',num(m.extras),'mesmo cliente e habilitação')+
      kpi('Escada',rs(m.valor_escada),'com peso da tese e divisão')+
      kpi('Plus e bônus',rs(Number(m.valor_plus)+Number(m.valor_bonus)+Number(m.valor_indicacao||0)),'extras, aprovada de primeira, indicação')+
      kpi('Equipe e constância',rs(Number(m.valor_equipe)+Number(m.valor_constancia)),'prêmio coletivo e de constância')+
      (Number(m.ajustes)?kpi('Ajustes',rs(m.ajustes),'estornos e correções'):'')+
    '</div></section>';
  h+=htmlEquipe();
  h+=htmlItens(m.itens||[]);
  if((P.d.ajustes||[]).length)h+='<section class="painel"><h2>Ajustes deste mês</h2><div class="tab-wrap"><table class="t"><thead><tr><th>Quando</th><th>Motivo</th><th class="num">Valor</th></tr></thead><tbody>'+
    P.d.ajustes.filter(function(a){return a.usuario_id===P.d.quem;}).map(function(a){return '<tr><td>'+esc(dataBR(a.criado_em))+'</td><td>'+esc(a.motivo)+'</td><td class="num">'+esc(rs(a.valor))+'</td></tr>';}).join('')+'</tbody></table></div></section>';
  if(P.d.ranking&&P.d.ranking.length)h+='<section class="painel"><h2>Ranking do mês</h2><div class="barras-h">'+barrasH(P.d.ranking.map(function(r){return {nome:r.nome+' · nível '+r.nivel,n:r.validados};}))+'</div></section>';
  h+=htmlHistorico();
  return h;
}
function kpi(t,v,s){return '<div class="kpi"><small>'+esc(t)+'</small><b>'+esc(v)+'</b>'+(s?'<span>'+esc(s)+'</span>':'')+'</div>';}
function htmlEquipe(){
  var e=P.d.equipe;if(!e||!e.ligado)return '';
  var pct=e.meta?Math.min(100,Math.round(e.realizado/e.meta*100)):0;
  return '<section class="painel"><h2>Meta da equipe</h2><div class="sub">Soma dos platôs de todo mundo. Batida a meta, quem bateu o próprio platô ganha mais '+esc(rs(e.valor_por_pessoa))+'.</div>'+
    '<div class="prog-tit" style="margin-top:12px"><span><b>'+esc(e.realizado)+'</b> de <b>'+esc(e.meta)+'</b> processos válidos da equipe</span><span>'+(e.batida?'<span class="selo ok">Meta batida</span>':'Faltam <b>'+esc(Math.max(0,e.meta-e.realizado))+'</b>')+'</span></div>'+
    '<div class="prog'+(e.batida?' batido':'')+'"><div class="enche" data-alvo="'+pct+'"></div></div></section>';
}
function htmlItens(itens){
  if(!itens.length)return '<section class="painel"><h2>Processos validados no mês</h2><div class="vazio">Nenhum processo validado neste mês ainda. Quando o Dr. Victor ou a Hevelyn validarem um processo seu, ele aparece aqui e a barra enche.</div></section>';
  return '<section class="painel"><h2>Processos validados no mês</h2><div class="tab-wrap"><table class="t"><thead><tr><th>Cliente</th><th>Tese</th><th>Tipo</th><th>Sua parte</th><th class="num">Base</th><th class="num">Peso</th><th class="num">Valor</th></tr></thead><tbody>'+
    itens.map(function(i){var f=linkFicha(i.pessoa_id,i.processo_id);
      return '<tr><td>'+(f?'<a href="'+esc(f)+'" style="color:inherit">'+esc(i.cliente||'Cliente')+'</a>':esc(i.cliente||'Cliente'))+'<div class="cod">'+esc(i.codigo||'')+' · validado em '+esc(dataBR(i.validado_em))+'</div></td>'+
        '<td>'+esc(i.tese||'—')+'</td><td>'+esc(TIPOS[i.tipo]||i.tipo)+(i.k?' · '+esc(i.k)+'º':'')+(i.primeira?' <span class="selo ok">de primeira</span>':'')+'</td>'+
        '<td>'+esc(PAPEIS[i.papel]||i.papel)+' · '+esc(Math.round(Number(i.parte)*100))+'%</td><td class="num">'+esc(rs(i.base))+'</td><td class="num">×'+esc(String(i.peso).replace('.',','))+'</td><td class="num"><b>'+esc(rs(Number(i.valor)+Number(i.bonus||0)))+'</b></td></tr>';}).join('')+
    '</tbody></table></div></section>';
}
function htmlHistorico(){
  var hs=P.d.historico||[];
  var h='<section class="painel"><h2>Histórico</h2><div class="sub">Captados e validados por mês desde a sua entrada (até 2 anos), com o prêmio de cada mês.</div>';
  if(!hs.length)return h+'<div class="vazio" style="margin-top:10px">Ainda não há histórico.</div></section>';
  var max=Math.max(1,Math.max.apply(null,hs.map(function(x){return Math.max(x.captados||0,x.validados||0);})));
  var W=Math.max(900,hs.length*70),H=180,base=140,larg=W/hs.length;
  var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Captados e validados por mês">';
  hs.forEach(function(x,i){
    var cx=i*larg+larg/2,hc=(x.captados||0)/max*110,hv=(x.validados||0)/max*110;
    svg+='<rect x="'+(cx-17)+'" y="'+(base-hc)+'" width="15" height="'+hc+'" rx="3" fill="color-mix(in srgb,var(--text) 22%,transparent)"><title>'+esc(mesNome(x.mes))+': '+x.captados+' captados</title></rect>';
    svg+='<rect x="'+(cx+2)+'" y="'+(base-hv)+'" width="15" height="'+hv+'" rx="3" fill="var(--gold)"><title>'+esc(mesNome(x.mes))+': '+x.validados+' validados</title></rect>';
    if(x.validados)svg+='<text x="'+(cx+9.5)+'" y="'+(base-hv-4)+'" font-size="10" text-anchor="middle" fill="currentColor">'+x.validados+'</text>';
    svg+='<text x="'+cx+'" y="'+(base+16)+'" font-size="10" text-anchor="middle" fill="currentColor" opacity=".7">'+esc(mesCurto(x.mes))+'</text>';
    if(x.vale&&Number(x.total))svg+='<text x="'+cx+'" y="'+(base+31)+'" font-size="9.5" text-anchor="middle" fill="currentColor" opacity=".85">'+esc(rs(x.total).replace(/,\d\d$/,''))+'</text>';
  });
  svg+='</svg>';
  h+='<div class="graf" style="overflow-x:auto"><div style="min-width:'+(hs.length>12?hs.length*44:560)+'px;max-width:1100px">'+svg+'</div></div><div class="legenda"><span><i style="background:color-mix(in srgb,var(--text) 22%,transparent)"></i>Captados</span><span><i style="background:var(--gold)"></i>Validados</span><span>Embaixo: prêmio do mês</span></div>';
  h+='<div class="duas" style="margin-top:16px"><div><h2 style="font-size:18px">Por tese</h2><div class="barras-h">'+((P.d.por_tese||[]).length?barrasH(P.d.por_tese.map(function(t){return {nome:t.tese,n:t.n};})):'<div class="ajuda">Nenhum processo validado ainda.</div>')+'</div></div>'+
    '<div><h2 style="font-size:18px">Forma de captação</h2><div class="barras-h">'+((P.d.formas||[]).length?barrasH(P.d.formas.map(function(t){return {nome:t.forma,n:t.n};})):'<div class="ajuda">Nenhum cartão com você como captador(a).</div>')+'</div></div></div>';
  return h+'</section>';
}
function barrasH(l){var max=Math.max.apply(null,l.map(function(x){return x.n;}).concat([1]));return l.map(function(x){return '<div class="lin"><span class="nm" title="'+esc(x.nome)+'">'+esc(x.nome)+'</span><span class="tr"><i style="width:'+Math.round(x.n/max*100)+'%"></i></span><span class="q">'+esc(num(x.n))+'</span></div>';}).join('');}
function animarBarra(){
  var els=document.querySelectorAll('#area .prog .enche');
  if(semMov()){els.forEach(function(e){e.style.width=e.dataset.alvo+'%';});return;}
  requestAnimationFrame(function(){requestAnimationFrame(function(){els.forEach(function(e){e.style.width=e.dataset.alvo+'%';});});});
}

/* ---------- Normas e Como funciona (blocos de texto) ---------- */
function htmlTextos(secao){
  var l=(P.d.normas||[]).filter(function(n){return n.secao===secao;}).sort(function(a,b){return a.ordem-b.ordem;});
  var adm=P.d.admin,h='';
  if(adm)h+='<div class="barra"><button class="btn btn-ouro" type="button" data-novo-bloco="'+secao+'">+ Novo bloco</button><span class="ajuda">Só o senhor vê os botões de editar. Os outros só leem.</span></div>';
  if(!l.length)return h+'<div class="vazio">Nenhum texto ainda.</div>';
  var n=0;
  h+=l.map(function(b,i){
    if(b.ativo)n++;
    var aberto=P.abertos[b.id]!==false;
    return '<div class="bloco'+(aberto?' aberto':'')+(b.ativo?'':' inativo')+'" data-bloco="'+esc(b.id)+'"><div class="bloco-cab" data-abrir="'+esc(b.id)+'"><span class="n">'+(b.ativo?n:'–')+'</span><h3>'+esc(b.titulo)+(b.ativo?'':' <span class="selo">fora da página</span>')+'</h3>'+
      (adm?'<span class="bloco-acoes"><button class="btn btn-sm" type="button" data-sobe="'+esc(b.id)+'" title="Subir"'+(i===0?' disabled':'')+'>▲</button><button class="btn btn-sm" type="button" data-desce="'+esc(b.id)+'" title="Descer"'+(i===l.length-1?' disabled':'')+'>▼</button><button class="btn btn-sm" type="button" data-editar="'+esc(b.id)+'">Editar</button></span>':'')+
      '<span class="seta">›</span></div><div class="bloco-corpo"'+(aberto?'':' hidden')+'>'+esc(b.texto)+'</div></div>';
  }).join('');
  return h;
}
function htmlComo(){
  var c=cfg(),h='',l=niveis();
  var maxP=Math.max.apply(null,l.map(function(x){return Number(x.plato);}).concat([1]));
  h+='<section class="painel"><h2>Tabela dos níveis</h2><div class="sub">Valor de cada processo válido no mês, na ordem em que é validado. Depois do platô, todo processo do mês paga o valor do platô. Valores antes do peso da tese e da divisão do prêmio cruzado.</div>'+
    (P.d.admin?'<div class="barra" style="margin-top:10px"><button class="btn btn-ouro" type="button" id="btnRegras">Editar regras e valores</button><button class="btn" type="button" id="btnPesos">Peso das teses</button></div>':'')+
    '<div class="tab-wrap"><table class="t niveis-tab"><thead><tr><th>Nível</th>';
  for(var k=1;k<=maxP;k++)h+='<th class="num" style="text-align:center">'+k+'º</th>';
  h+='<th style="text-align:center">Depois do platô</th></tr></thead><tbody>'+l.map(function(lv){
    var r='<tr><td><b>Nível '+esc(lv.nivel)+'</b><div class="cod">platô no '+esc(lv.plato)+'º</div></td>';
    for(var k=1;k<=maxP;k++)r+='<td class="v'+(k===Number(lv.plato)?' plato':'')+'">'+(k<=Number(lv.plato)?esc(rs(degrau(lv.nivel,k))):'')+'</td>';
    return r+'<td class="v plato">'+esc(rs(degrau(lv.nivel,lv.plato)))+' cada</td></tr>';
  }).join('')+'</tbody></table></div>';
  var p=c.pesos||{},cr=c.cruzado||{},me=c.meta_equipe||{},co=c.constancia||{},ind=c.indicacao||{};
  h+='<div class="regras-lista">'+
    regra('Começa a valer em',mesNome(c.inicio_mes))+
    regra('Subir de nível','Bateu o platô: sobe 1 nível no mês seguinte.')+
    regra('Descer de nível','Depois de '+(c.meses_para_descer||2)+' meses seguidos sem bater o platô, desce 1 nível (nunca abaixo do 1).')+
    regra('Processo a mais do mesmo cliente',rs(c.plus_mesmo_cliente)+' fixo (fora da escada).')+
    regra('Habilitação',rs(c.plus_habilitacao)+' fixo (fora da escada).')+
    regra('Peso da tese','Padrão ×'+String(p.padrao||1).replace('.',',')+' · Médio ×'+String(p.medio||1.25).replace('.',',')+' · Alto ×'+String(p.alto||1.5).replace('.',',')+' (pelo honorário médio da tese no Financeiro).')+
    regra('Documentação aprovada de primeira','+'+rs(c.bonus_primeira)+' por processo.')+
    regra('Estorno',c.estorno_erro_documentacao===false?'Desligado.':'Processo que cair por erro de documentação depois de pago: o valor é descontado no mês seguinte.',c.estorno_erro_documentacao===false)+
    regra('Prêmio cruzado','Quem iniciou: '+(cr.inicio||40)+'% · quem pegou a documentação: '+(cr.documentacao||60)+'%. A mesma pessoa leva 100%.')+
    regra('Meta da equipe',me.ligado?'Batida, quem bateu o próprio platô ganha '+rs(me.valor_por_pessoa)+'.':'Desligada.',!me.ligado)+
    regra('Prêmio de constância',co.ligado?'Platô '+co.meses+' meses seguidos: +'+rs(co.valor)+'.':'Desligado.',!co.ligado)+
    regra('Prêmio por indicação',ind.ligado?'Cliente que veio por indicação: +'+rs(ind.valor)+' para quem iniciou.':'Desligado.',!ind.ligado)+
    regra('Ranking',c.ranking?'Ligado: todos veem quantos processos cada um validou.':'Desligado.',!c.ranking)+
  '</div><div class="clt"><b>Lembrete jurídico.</b> Prêmio é a liberalidade paga por desempenho superior ao ordinariamente esperado (CLT, art. 457, §§ 2º e 4º). Pago separado do salário e por desempenho de verdade, ele não integra a remuneração nem gera encargos. Por isso a regra é por resultado (processo validado) e o pagamento sai num lançamento à parte.</div></section>';
  h+=htmlTextos('premio');
  return h;
}
function regra(t,v,desl){return '<div class="regra'+(desl?' desl':'')+'"><b>'+esc(t)+'</b>'+esc(v)+'</div>';}

function editarBloco(id,secao){
  var b=id?(P.d.normas||[]).filter(function(x){return x.id===id;})[0]:null;
  abrirJanela({titulo:b?'Editar bloco':'Novo bloco',sub:(secao||b.secao)==='normas'?'Normas da Captação':'Como funciona o prêmio',
    corpo:'<div><label class="r" for="bTit">Título</label><input type="text" id="bTit" maxlength="160" value="'+esc(b?b.titulo:'')+'"></div>'+
      '<div><label class="r" for="bTxt">Texto</label><textarea id="bTxt" style="min-height:220px">'+esc(b?b.texto:'')+'</textarea></div>'+
      (b?'<label class="check"><input type="checkbox" id="bAtivo"'+(b.ativo?' checked':'')+'><span>Mostrar na página (desmarcar tira da página; o texto fica guardado)</span></label>':''),
    ok:async function(c){
      var r=await _sb.rpc('premio_norma_salvar',{p_id:b?b.id:null,p_secao:b?b.secao:secao,p_titulo:c.querySelector('#bTit').value,p_texto:c.querySelector('#bTxt').value,p_ativo:b?c.querySelector('#bAtivo').checked:true});
      if(r.error)throw r.error;toast('Texto salvo.','success');await carregar();
    }});
}
async function moverBloco(id,dir){
  var b=(P.d.normas||[]).filter(function(x){return x.id===id;})[0];if(!b)return;
  var l=(P.d.normas||[]).filter(function(n){return n.secao===b.secao;}).sort(function(a,c){return a.ordem-c.ordem;});
  var i=l.indexOf(b),j=i+dir;if(j<0||j>=l.length)return;
  var t=l[i];l[i]=l[j];l[j]=t;
  var r=await _sb.rpc('premio_normas_ordenar',{p_ids:l.map(function(x){return x.id;})});
  if(r.error){toast('Não consegui mudar a ordem: '+erroMsg(r.error),'error');return;}
  await carregar();
}
function alternarBloco(id){
  var el=document.querySelector('.bloco[data-bloco="'+id+'"]');if(!el)return;
  var corpo=el.querySelector('.bloco-corpo'),abrir=corpo.hidden;
  P.abertos[id]=abrir;el.classList.toggle('aberto',abrir);
  if(window.sagaRecolher)sagaRecolher(corpo,!abrir);else corpo.hidden=!abrir;
}

/* ---------- Editar regras (administrador) ---------- */
function editarRegras(){
  var c=JSON.parse(JSON.stringify(cfg())),l=niveis();
  var p=c.pesos||{},cr=c.cruzado||{},me=c.meta_equipe||{},co=c.constancia||{},ind=c.indicacao||{};
  var mi=String(c.inicio_mes||'2026-12-01').slice(0,7);
  function linhaNivel(lv){return '<div class="niv-ed" data-niv><b>Nível '+esc(lv.nivel)+'</b><input type="text" data-moeda data-f="inicio" value="'+fmtMoedaCampo(lv.inicio)+'" title="1º processo (R$)"><input type="text" data-moeda data-f="passo" value="'+fmtMoedaCampo(lv.passo)+'" title="Aumento a cada processo (R$)"><input type="text" data-inteiro data-max="2" data-f="plato" value="'+esc(lv.plato)+'" title="Platô (nº do processo)"><button class="btn btn-sm" type="button" data-tira-nivel title="Tirar este nível">×</button></div>';}
  abrirJanela({titulo:'Regras e valores do prêmio',sub:'Vale a partir do mês aberto. Mês já fechado não muda.',largo:true,botao:'Salvar regras',
    corpo:'<div class="cols2"><div><label class="r" for="rIni">Começa a valer em</label><input type="month" id="rIni" value="'+esc(mi)+'" style="width:100%;height:36px;border-radius:10px;border:1px solid var(--border-soft);background:var(--panel);padding:0 10px"></div>'+
      '<div><label class="r" for="rDesce">Meses seguidos sem platô para descer</label><input type="text" id="rDesce" data-inteiro data-max="1" value="'+esc(c.meses_para_descer||2)+'"></div></div>'+
      '<div class="cfg-sec"><h4>Níveis</h4><div class="niv-ed ajuda"><span></span><span>1º processo (R$)</span><span>Aumento por processo (R$)</span><span>Platô (nº)</span><span></span></div><div id="rNiveis">'+l.map(linhaNivel).join('')+'</div>'+
      '<button class="btn btn-sm" type="button" id="rMaisNivel">+ Nível</button></div>'+
      '<div class="cfg-sec"><h4>Plus e qualidade</h4><div class="cols3">'+
        campoMoeda('rMesmo','Processo a mais do mesmo cliente',c.plus_mesmo_cliente)+campoMoeda('rHab','Habilitação',c.plus_habilitacao)+campoMoeda('rPrim','Aprovada de primeira (bônus)',c.bonus_primeira)+
      '</div><label class="check" style="margin-top:8px"><input type="checkbox" id="rEstorno"'+(c.estorno_erro_documentacao===false?'':' checked')+'><span>Estornar no mês seguinte o processo que cair por erro de documentação</span></label></div>'+
      '<div class="cfg-sec"><h4>Peso da tese (multiplica a escada)</h4><div class="cols3">'+
        campoTxt('rPPad','Padrão',String(p.padrao||1).replace('.',','))+campoTxt('rPMed','Médio',String(p.medio||1.25).replace('.',','))+campoTxt('rPAlt','Alto',String(p.alto||1.5).replace('.',','))+
      '</div><div class="ajuda" style="margin-top:4px">Ex.: 1,25 = 25% a mais. A faixa de cada tese é automática pelo honorário médio; dá para fixar em "Peso das teses".</div></div>'+
      '<div class="cfg-sec"><h4>Prêmio cruzado (precisa somar 100%)</h4><div class="cols2">'+
        '<div><label class="r" for="rCrIni">Quem iniciou (%)</label><input type="text" id="rCrIni" data-inteiro data-max="3" value="'+esc(cr.inicio||40)+'"></div>'+
        '<div><label class="r" for="rCrDoc">Quem pegou a documentação (%)</label><input type="text" id="rCrDoc" data-inteiro data-max="3" value="'+esc(cr.documentacao||60)+'"></div></div></div>'+
      '<div class="cfg-sec"><h4>Meta da equipe e extras</h4>'+
        '<label class="check"><input type="checkbox" id="rMeta"'+(me.ligado?' checked':'')+'><span>Meta da equipe ligada (soma dos platôs de todo mundo)</span></label>'+
        '<div class="cols3" style="margin-top:8px">'+campoMoeda('rMetaV','Prêmio coletivo por pessoa',me.valor_por_pessoa)+'</div>'+
        '<label class="check" style="margin-top:8px"><input type="checkbox" id="rConst"'+(co.ligado?' checked':'')+'><span>Prêmio de constância (platô vários meses seguidos)</span></label>'+
        '<div class="cols3" style="margin-top:8px"><div><label class="r" for="rConstM">Meses seguidos</label><input type="text" id="rConstM" data-inteiro data-max="2" value="'+esc(co.meses||3)+'"></div>'+campoMoeda('rConstV','Valor',co.valor)+'</div>'+
        '<label class="check" style="margin-top:8px"><input type="checkbox" id="rInd"'+(ind.ligado?' checked':'')+'><span>Prêmio por indicação (cliente com origem "Indicação")</span></label>'+
        '<div class="cols3" style="margin-top:8px">'+campoMoeda('rIndV','Valor por cliente indicado',ind.valor)+'</div>'+
        '<label class="check" style="margin-top:8px"><input type="checkbox" id="rRank"'+(c.ranking?' checked':'')+'><span>Ranking ligado (todos veem quantos processos cada um validou no mês)</span></label></div>',
    depois:function(cx){
      cx.querySelector('#rMaisNivel').addEventListener('click',function(){
        var linhas=cx.querySelectorAll('[data-niv]'),ult=linhas.length?linhas[linhas.length-1]:null;
        var ini=ult?lerMoeda(ult.querySelector('[data-f=inicio]').value)+2.5:5,pas=ult?lerMoeda(ult.querySelector('[data-f=passo]').value):5,pla=ult?Number(ult.querySelector('[data-f=plato]').value):5;
        var div=document.createElement('div');div.innerHTML=linhaNivel({nivel:linhas.length+1,inicio:ini,passo:pas,plato:pla});
        var el=div.firstChild;cx.querySelector('#rNiveis').appendChild(el);ligarMascaras(el);
        if(window.sagaRecolher){el.hidden=true;sagaRecolher(el,false);}
      });
      cx.querySelector('#rNiveis').addEventListener('click',function(e){var b=e.target.closest('[data-tira-nivel]');if(!b)return;var el=b.closest('[data-niv]');
        if(cx.querySelectorAll('[data-niv]').length<=1){$('jErro').textContent='Precisa ficar pelo menos 1 nível.';return;}
        if(window.sagaRecolher)sagaRecolher(el,true,function(){el.remove();renumerar();});else{el.remove();renumerar();}});
      function renumerar(){cx.querySelectorAll('[data-niv]').forEach(function(el,i){el.querySelector('b').textContent='Nível '+(i+1);});}
    },
    ok:async function(cx){
      function v(id){return cx.querySelector('#'+id);}
      function dec(s){var n=Number(String(s||'').replace(/\./g,'').replace(',','.'));return isFinite(n)&&n>0?n:null;}
      var nivs=Array.prototype.map.call(cx.querySelectorAll('[data-niv]'),function(el,i){return {nivel:i+1,inicio:lerMoeda(el.querySelector('[data-f=inicio]').value),passo:lerMoeda(el.querySelector('[data-f=passo]').value)||0,plato:Number(el.querySelector('[data-f=plato]').value)};});
      if(nivs.some(function(n){return n.inicio==null||!n.plato;})){$('jErro').textContent='Preencha o 1º processo e o platô de todos os níveis.';return false;}
      var pp=dec(v('rPPad').value),pm=dec(v('rPMed').value),pa=dec(v('rPAlt').value);
      if(!pp||!pm||!pa){$('jErro').textContent='Os pesos das teses precisam ser números (ex.: 1,25).';return false;}
      var mes=v('rIni').value;if(!/^\d{4}-\d{2}$/.test(mes)){$('jErro').textContent='Escolha o mês de início.';return false;}
      var novo={inicio_mes:mes+'-01',niveis:nivs,meses_para_descer:Number(v('rDesce').value)||2,
        plus_mesmo_cliente:lerMoeda(v('rMesmo').value)||0,plus_habilitacao:lerMoeda(v('rHab').value)||0,bonus_primeira:lerMoeda(v('rPrim').value)||0,
        estorno_erro_documentacao:v('rEstorno').checked,pesos:{padrao:pp,medio:pm,alto:pa},
        cruzado:{inicio:Number(v('rCrIni').value)||0,documentacao:Number(v('rCrDoc').value)||0},
        meta_equipe:{ligado:v('rMeta').checked,valor_por_pessoa:lerMoeda(v('rMetaV').value)||0},
        constancia:{ligado:v('rConst').checked,meses:Number(v('rConstM').value)||3,valor:lerMoeda(v('rConstV').value)||0},
        indicacao:{ligado:v('rInd').checked,valor:lerMoeda(v('rIndV').value)||0},ranking:v('rRank').checked};
      if(novo.cruzado.inicio+novo.cruzado.documentacao!==100){$('jErro').textContent='O prêmio cruzado precisa somar 100% (hoje soma '+(novo.cruzado.inicio+novo.cruzado.documentacao)+'%).';return false;}
      var r=await _sb.rpc('premio_config_salvar',{p_dados:novo});if(r.error)throw r.error;
      toast('Regras do prêmio salvas.','success');await carregar();
    }});
}
function campoMoeda(id,t,v){return '<div><label class="r" for="'+id+'">'+esc(t)+' (R$)</label><input type="text" id="'+id+'" data-moeda value="'+fmtMoedaCampo(v)+'"></div>';}
function campoTxt(id,t,v){return '<div><label class="r" for="'+id+'">'+esc(t)+'</label><input type="text" id="'+id+'" inputmode="decimal" value="'+esc(v)+'"></div>';}
function editarPesos(){
  var l=P.d.teses_faixas||[];
  abrirJanela({titulo:'Peso das teses',sub:'Automático = pela média do honorário esperado da tese no Financeiro (o terço mais alto é "Alto", o do meio "Médio", o resto "Padrão"). Escolha uma faixa para fixar.',largo:true,botao:'Fechar',
    corpo:'<input type="text" id="pBusca" placeholder="Procurar tese">'+
      '<div class="tab-wrap" style="max-height:52vh;overflow:auto"><table class="t"><thead><tr><th>Tese</th><th class="num">Média dos honorários</th><th class="num">Processos</th><th>Faixa</th></tr></thead><tbody id="pLinhas">'+
      l.map(function(t){return '<tr data-nome="'+esc((t.nome||'').toLowerCase())+'"><td>'+esc(t.nome)+(t.sigla?' <span class="cod">'+esc(t.sigla)+'</span>':'')+'</td><td class="num">'+(t.media!=null?esc(rs(t.media)):'—')+'</td><td class="num">'+esc(t.processos)+'</td><td><select data-tese="'+esc(t.tese_id)+'" style="height:30px">'+
        '<option value="auto"'+(t.automatica?' selected':'')+'>Automática ('+esc(FAIXAS[t.faixa]||'Padrão')+')</option>'+['padrao','medio','alto'].map(function(f){return '<option value="'+f+'"'+(!t.automatica&&t.faixa===f?' selected':'')+'>'+FAIXAS[f]+'</option>';}).join('')+'</select></td></tr>';}).join('')+'</tbody></table></div>',
    depois:function(cx){
      cx.querySelector('#pBusca').addEventListener('input',function(){var b=this.value.trim().toLowerCase();cx.querySelectorAll('#pLinhas tr').forEach(function(tr){tr.hidden=b&&tr.dataset.nome.indexOf(b)<0;});});
      cx.querySelector('#pLinhas').addEventListener('change',async function(e){var s=e.target.closest('select[data-tese]');if(!s)return;s.disabled=true;
        var r=await _sb.rpc('premio_tese_peso_salvar',{p_tese:s.dataset.tese,p_faixa:s.value});s.disabled=false;
        if(r.error){$('jErro').textContent='Não consegui salvar: '+erroMsg(r.error);return;}toast('Peso da tese salvo.','success');});
    },
    ok:async function(){await carregar();}});
}

/* ---------- Validar ---------- */
function htmlValidar(){
  var v=P.validar,h='<div class="barra"><div class="pills" role="group" aria-label="Quais processos"><button class="pill'+(v.sit==='pendentes'?' active':'')+'" type="button" data-vsit="pendentes">A validar</button><button class="pill'+(v.sit==='validados'?' active':'')+'" type="button" data-vsit="validados">Validados (120 dias)</button></div>'+
    '<input class="ent" id="vBusca" type="search" placeholder="Buscar por cliente, código ou número" value="'+esc(v.busca)+'" style="flex:1"></div>';
  h+='<div class="sub ajuda" style="margin-bottom:10px">Válido = documentação completa + cálculo pronto + valor a recuperar. O processo conta no mês em que é validado. Aparecem primeiro os cartões em "Documentos em mãos"; depois os do Jurídico ainda não validados.</div>';
  if(v.erro)return h+'<div class="erro-caixa"><b>Não consegui carregar a lista.</b>Motivo: '+esc(v.erro)+'</div>';
  if(v.lista===null)return h+'<div class="vazio">Carregando…</div>';
  if(!v.lista.length)return h+'<div class="vazio">'+(v.busca?'Nada encontrado nesta busca.':(v.sit==='pendentes'?'Nenhum processo esperando validação.':'Nenhum processo validado nos últimos 120 dias.'))+'</div>';
  h+='<section class="painel" style="padding:6px 10px"><div class="tab-wrap" style="margin-top:0"><table class="t"><thead><tr><th>Cliente</th><th>Tese</th><th>'+(v.sit==='pendentes'?'Situação':'Validado em')+'</th><th>Iniciou</th><th>Pegou a documentação</th><th></th></tr></thead><tbody>'+
    v.lista.map(function(x){var f=linkFicha(x.pessoa_id,x.processo_id);
      var cli='<a href="'+esc(f||'#')+'" style="color:inherit">'+esc(x.cliente||'Cliente')+'</a><div class="cod">'+esc(x.codigo||'')+(x.numero?' · '+esc(cnj(x.numero)):'')+'</div>';
      if(v.sit==='pendentes')return '<tr><td>'+cli+'</td><td>'+esc(x.tese||'—')+(x.mesmo_cliente?' <span class="selo ouro">mesmo cliente</span>':'')+(x.habilitacao?' <span class="selo ouro">habilitação</span>':'')+'</td><td>'+esc(x.situacao||'')+'</td><td>'+(x.captador?esc(x.captador):'<span class="selo amarelo">sem captador</span>')+'</td><td>'+esc(x.documentador||'—')+'</td><td class="num"><button class="btn btn-sm btn-ouro" type="button" data-validar="'+esc(x.processo_id)+'">Validar</button></td></tr>';
      return '<tr><td>'+cli+'</td><td>'+esc(x.tese||'—')+(x.primeira?' <span class="selo ok">de primeira</span>':'')+'</td><td>'+esc(dataBR(x.validado_em))+'<div class="cod">por '+esc(x.validado_por||'')+'</div></td><td>'+esc(x.captador||'—')+'</td><td>'+esc(x.documentador||'—')+'</td><td class="num">'+(P.d.admin?'<button class="btn btn-sm btn-perigo" type="button" data-cancelar="'+esc(x.id)+'">Cancelar</button>':'')+'</td></tr>';
    }).join('')+'</tbody></table></div></section>';
  return h;
}
async function abrirValidar(pid){
  var x=(P.validar.lista||[]).filter(function(i){return i.processo_id===pid;})[0];if(!x)return;
  var us=await usuarios();
  function opts(sel){return '<option value="">— escolha —</option>'+us.map(function(u){return '<option value="'+esc(u.id)+'"'+(u.id===sel?' selected':'')+'>'+esc(u.nome_completo)+'</option>';}).join('');}
  abrirJanela({titulo:'Validar para o prêmio',sub:(x.cliente||'Cliente')+(x.codigo?' · '+x.codigo:'')+(x.tese?' · '+x.tese:''),botao:'Validar',
    corpo:'<label class="check"><input type="checkbox" id="vDoc"><span><b>Documentação completa</b>: tudo o que o rol da tese pede, legível e assinado.</span></label>'+
      '<label class="check"><input type="checkbox" id="vCalc"><span><b>Cálculo pronto</b>: os cálculos terminaram.</span></label>'+
      '<label class="check"><input type="checkbox" id="vVal"><span><b>Há valor a recuperar</b>: a equipe confirmou que existem valores.</span></label>'+
      '<label class="check"><input type="checkbox" id="vPrim"><span>Documentação aprovada <b>de primeira</b> (não precisou pedir nada de novo): ganha o bônus.</span></label>'+
      '<div class="cols2"><div><label class="r" for="vCap">Quem iniciou (captador)</label><select id="vCap">'+opts(x.captador_id)+'</select></div>'+
      '<div><label class="r" for="vDocu">Quem pegou a documentação</label><select id="vDocu">'+opts(x.documentador_id||x.captador_id)+'</select></div></div>'+
      '<div class="ajuda">Sugestão automática: o captador do cartão e quem mudou a etapa para "Documentos em mãos". Se for a mesma pessoa, ela fica com 100%.</div>'+
      '<div><label class="r" for="vObs">Observação (opcional)</label><textarea id="vObs" style="min-height:70px"></textarea></div>',
    ok:async function(c){
      if(!c.querySelector('#vDoc').checked||!c.querySelector('#vCalc').checked||!c.querySelector('#vVal').checked){$('jErro').textContent='Para validar, confira e marque as 3 primeiras caixas.';return false;}
      var cap=c.querySelector('#vCap').value||null,doc=c.querySelector('#vDocu').value||null;
      if(!cap&&!doc){$('jErro').textContent='Escolha quem iniciou a captação.';return false;}
      var r=await _sb.rpc('premio_validar',{p_processo:pid,p_doc_completa:true,p_calculo_pronto:true,p_valor_recuperar:true,p_primeira:c.querySelector('#vPrim').checked,p_captador:cap,p_documentador:doc,p_observacao:c.querySelector('#vObs').value||null});
      if(r.error)throw r.error;
      toast('Processo validado. Quem ganha recebeu o aviso no sino.','success');
      var tr=document.querySelector('[data-validar="'+pid+'"]');tr=tr&&tr.closest('tr');
      if(tr&&window.sagaRiscar)sagaRiscar(tr,{recolher:true});
      P.validar.lista=null;setTimeout(function(){carregarValidar();carregar();},450);
    }});
}
function abrirCancelar(id){
  var x=(P.validar.lista||[]).filter(function(i){return i.id===id;})[0];if(!x)return;
  abrirJanela({titulo:'Cancelar validação',sub:(x.cliente||'Cliente')+' · validado em '+dataBR(x.validado_em),botao:'Cancelar validação',perigo:true,
    corpo:'<div><label class="r" for="cMot">Motivo</label><textarea id="cMot" style="min-height:80px"></textarea></div>'+
      '<label class="check"><input type="checkbox" id="cErro"><span>Caiu por <b>erro de documentação</b>. Se o mês já foi fechado e pago, o valor é descontado no mês aberto (estorno).</span></label>'+
      '<div class="ajuda">Mês ainda aberto: o processo só sai da conta. A validação fica guardada no registro.</div>',
    ok:async function(c){
      var r=await _sb.rpc('premio_validacao_cancelar',{p_validacao:id,p_motivo:c.querySelector('#cMot').value,p_erro_documentacao:c.querySelector('#cErro').checked});
      if(r.error)throw r.error;
      toast(r.data&&r.data.estornos?'Validação cancelada; estorno lançado em '+mesNome(r.data.mes_estorno)+'.':'Validação cancelada.','success');
      P.validar.lista=null;carregarValidar();carregar();
    }});
}

/* ---------- Painel geral (administrador) ---------- */
function htmlGeral(){
  var d=P.d,l=(d.todos||[]).slice().sort(function(a,b){return Number(b.total)-Number(a.total)||String(a.nome).localeCompare(b.nome);});
  var atual=mesAtual(),passou=String(d.mes).slice(0,10)<atual;
  var h=avisoInicio();
  h+='<div class="barra">'+(d.fechado?'<span class="selo ok">Mês fechado em '+esc(dataBR(d.fechado_em))+'</span>':(passou?'<button class="btn btn-ouro" type="button" id="btnFechar">Fechar '+esc(mesNome(d.mes))+' para pagamento</button>':'<span class="selo amarelo">Mês em andamento: projeção</span>'))+
    '<button class="btn" type="button" id="btnPdf">Baixar PDF</button><button class="btn" type="button" id="btnAjuste">Lançar ajuste</button><button class="btn" type="button" id="btnPessoas">Quem participa</button></div>';
  var tot=Number(d.total||0),val=l.reduce(function(s,x){return s+Number(x.validados);},0),bat=l.filter(function(x){return x.bateu;}).length;
  h+='<section class="painel"><h2>'+(d.fechado?'Fechamento de ':'Projeção de ')+esc(mesNome(d.mes))+'</h2><div class="grade">'+
    kpi(d.fechado?'Total a pagar':'Custo previsto do mês',rs(tot),d.fechado?'gravado no fechamento':'se o mês fechasse hoje')+
    kpi('Processos validados',num(val),'na escada (créditos por pessoa)')+
    kpi('Bateram o platô',bat+' de '+l.length,'sobem de nível no mês seguinte')+
    (d.equipe&&d.equipe.ligado?kpi('Meta da equipe',d.equipe.realizado+' de '+d.equipe.meta,d.equipe.batida?'batida':'ainda não'):'')+
  '</div></section>';
  if(!l.length)return h+'<div class="vazio">Ninguém participando.</div>';
  h+='<section class="painel" style="padding:8px 12px"><div class="tab-wrap" style="margin-top:0"><table class="t"><thead><tr><th>Pessoa</th><th>Nível</th><th>Platô</th><th class="num">Captados</th><th class="num">Escada</th><th class="num">Plus/bônus</th><th class="num">Equipe</th><th class="num">Ajustes</th><th class="num">Total</th><th>Mês que vem</th></tr></thead><tbody>'+
    l.map(function(x){var pct=Math.min(100,Math.round(x.validados/x.plato*100));
      return '<tr class="linha-pessoa" data-pessoa="'+esc(x.usuario_id)+'" title="Ver o progresso desta pessoa"><td><b>'+esc(x.nome)+'</b></td><td>'+esc(x.nivel)+'</td><td><span class="mini-prog"><i style="width:'+pct+'%"></i></span>'+esc(x.validados)+'/'+esc(x.plato)+(x.bateu?' <span class="selo ok">platô</span>':'')+'</td>'+
        '<td class="num">'+esc(x.captados)+'</td><td class="num">'+esc(rs(x.valor_escada))+'</td><td class="num">'+esc(rs(Number(x.valor_plus)+Number(x.valor_bonus)+Number(x.valor_indicacao||0)))+'</td><td class="num">'+esc(rs(Number(x.valor_equipe)+Number(x.valor_constancia)))+'</td><td class="num">'+esc(rs(x.ajustes))+'</td><td class="num"><b>'+esc(rs(x.total))+'</b></td>'+
        '<td>Nível '+esc(x.proximo_nivel)+(Number(x.proximo_nivel)>Number(x.nivel)?' <span class="selo ok">sobe</span>':Number(x.proximo_nivel)<Number(x.nivel)?' <span class="selo vermelho">desce</span>':'')+'</td></tr>';}).join('')+
    '</tbody></table></div></section>';
  var aj=d.ajustes||[];
  if(aj.length)h+='<section class="painel"><h2>Ajustes de '+esc(mesNome(d.mes))+'</h2><div class="tab-wrap"><table class="t"><thead><tr><th>Pessoa</th><th>Motivo</th><th>Tipo</th><th class="num">Valor</th></tr></thead><tbody>'+aj.map(function(a){return '<tr><td>'+esc(a.nome)+'</td><td>'+esc(a.motivo)+'</td><td>'+(a.origem==='estorno'?'<span class="selo vermelho">estorno</span>':'<span class="selo">ajuste</span>')+'</td><td class="num">'+esc(rs(a.valor))+'</td></tr>';}).join('')+'</tbody></table></div></section>';
  var fs=d.fechamentos||[];
  if(fs.length)h+='<section class="painel"><h2>Meses fechados</h2><div class="tab-wrap"><table class="t"><thead><tr><th>Mês</th><th>Fechado em</th><th class="num">Total</th><th></th></tr></thead><tbody>'+fs.map(function(f){return '<tr><td style="text-transform:capitalize">'+esc(mesNome(f.mes))+'</td><td>'+esc(dataBR(f.fechado_em))+'</td><td class="num">'+esc(rs(f.total))+'</td><td class="num"><button class="btn btn-sm" type="button" data-ir-mes="'+esc(String(f.mes).slice(0,10))+'">Ver</button></td></tr>';}).join('')+'</tbody></table></div></section>';
  return h;
}
async function fecharMes(){
  var d=P.d;
  var ok=window.sagaConfirmar?await sagaConfirmar('Fechar '+mesNome(d.mes),'Os valores de todos ficam GRAVADOS e não mudam mais (total '+rs(d.total)+'). Cada pessoa recebe o aviso no sino e o nível do mês seguinte é definido. Correções depois disso viram ajuste no mês seguinte.','Fechar o mês',false):confirm('Fechar o mês?');
  if(!ok)return;
  var r=await _sb.rpc('premio_fechar_mes',{p_mes:String(d.mes).slice(0,10)});
  if(r.error){toast('Não consegui fechar: '+erroMsg(r.error),'error');return;}
  toast('Mês fechado: '+rs(r.data&&r.data.total)+'.','success');await carregar();
}
async function lancarAjuste(){
  var l=(P.d.pessoas_cfg||[]);
  abrirJanela({titulo:'Lançar ajuste',sub:'Entra no mês aberto ('+mesNome(P.d.mes_aberto)+'). Use para correções depois do fechamento.',botao:'Lançar',
    corpo:'<div><label class="r" for="aPes">Pessoa</label><select id="aPes"><option value="">— escolha —</option>'+l.map(function(p){return '<option value="'+esc(p.usuario_id)+'">'+esc(p.nome)+'</option>';}).join('')+'</select></div>'+
      '<div class="cols2"><div><label class="r" for="aTipo">Tipo</label><select id="aTipo"><option value="1">Soma (a pessoa recebe a mais)</option><option value="-1">Desconto</option></select></div>'+
      '<div><label class="r" for="aVal">Valor (R$)</label><input type="text" id="aVal" data-moeda></div></div>'+
      '<div><label class="r" for="aMot">Motivo</label><textarea id="aMot" style="min-height:70px"></textarea></div>',
    ok:async function(c){
      var u=c.querySelector('#aPes').value,v=lerMoeda(c.querySelector('#aVal').value);
      if(!u){$('jErro').textContent='Escolha a pessoa.';return false;}
      if(!v){$('jErro').textContent='Informe o valor.';return false;}
      var r=await _sb.rpc('premio_ajuste_lancar',{p_usuario:u,p_valor:v*Number(c.querySelector('#aTipo').value),p_motivo:c.querySelector('#aMot').value});
      if(r.error)throw r.error;toast('Ajuste lançado.','success');await carregar();
    }});
}
function editarPessoas(){
  var l=(P.d.pessoas_cfg||[]),max=niveis().length;
  abrirJanela({titulo:'Quem participa do prêmio',sub:'Todo mundo do escritório participa. Tire quem não deve entrar. "Nível neste mês" muda só o mês aberto; depois do fechamento volta a seguir a regra.',largo:true,botao:'Fechar',
    corpo:'<div class="tab-wrap"><table class="t"><thead><tr><th>Pessoa</th><th>Participa</th><th>Nível neste mês</th></tr></thead><tbody id="pesLinhas">'+
      l.map(function(p){var o='<option value="">Pela regra</option>';for(var i=1;i<=max;i++)o+='<option value="'+i+'"'+(Number(p.nivel_manual)===i?' selected':'')+'>Nível '+i+'</option>';
        return '<tr data-u="'+esc(p.usuario_id)+'"><td>'+esc(p.nome)+'</td><td><input type="checkbox" data-part'+(p.participa?' checked':'')+'></td><td><select data-niv style="height:30px">'+o+'</select></td></tr>';}).join('')+'</tbody></table></div>',
    depois:function(cx){cx.querySelector('#pesLinhas').addEventListener('change',async function(e){
      var tr=e.target.closest('tr[data-u]');if(!tr)return;
      var r=await _sb.rpc('premio_pessoa_salvar',{p_usuario:tr.dataset.u,p_participa:tr.querySelector('[data-part]').checked,p_nivel_manual:tr.querySelector('[data-niv]').value?Number(tr.querySelector('[data-niv]').value):null});
      if(r.error){$('jErro').textContent='Não consegui salvar: '+erroMsg(r.error);return;}toast('Salvo.','success');});},
    ok:async function(){await carregar();}});
}
function pdf(){
  if(!window.SagaPdf){toast('O gerador de PDF não carregou.','error');return;}
  var d=P.d,l=(d.todos||[]).slice().sort(function(a,b){return String(a.nome).localeCompare(b.nome);});
  var html='<div class="kpis"><div><small>'+(d.fechado?'Total a pagar':'Custo previsto')+'</small><b>'+esc(rs(d.total))+'</b></div><div><small>Situação</small><b>'+(d.fechado?'Fechado em '+esc(dataBR(d.fechado_em)):'Mês em andamento (projeção)')+'</b></div>'+
    (d.equipe&&d.equipe.ligado?'<div><small>Meta da equipe</small><b>'+esc(d.equipe.realizado)+' de '+esc(d.equipe.meta)+(d.equipe.batida?' (batida)':'')+'</b></div>':'')+'</div>'+
    '<table class="tab"><thead><tr><th>Pessoa</th><th>Nível</th><th>Validados / platô</th><th>Escada</th><th>Plus e bônus</th><th>Equipe e constância</th><th>Ajustes</th><th>Total</th></tr></thead><tbody>'+
    l.map(function(x){return '<tr><td>'+esc(x.nome)+'</td><td>'+esc(x.nivel)+'</td><td>'+esc(x.validados)+' / '+esc(x.plato)+'</td><td>'+esc(rs(x.valor_escada))+'</td><td>'+esc(rs(Number(x.valor_plus)+Number(x.valor_bonus)+Number(x.valor_indicacao||0)))+'</td><td>'+esc(rs(Number(x.valor_equipe)+Number(x.valor_constancia)))+'</td><td>'+esc(rs(x.ajustes))+'</td><td><b>'+esc(rs(x.total))+'</b></td></tr>';}).join('')+'</tbody></table>';
  l.filter(function(x){return (x.itens||[]).length;}).forEach(function(x){
    html+='<h3>'+esc(x.nome)+'</h3><table class="tab"><thead><tr><th>Cliente</th><th>Código</th><th>Tese</th><th>Tipo</th><th>Parte</th><th>Valor</th></tr></thead><tbody>'+
      x.itens.map(function(i){return '<tr><td>'+esc(i.cliente||'')+'</td><td>'+esc(i.codigo||'')+'</td><td>'+esc(i.tese||'')+'</td><td>'+esc(TIPOS[i.tipo]||i.tipo)+(i.k?' '+i.k+'º':'')+'</td><td>'+esc(PAPEIS[i.papel]||'')+' '+Math.round(Number(i.parte)*100)+'%</td><td>'+esc(rs(Number(i.valor)+Number(i.bonus||0)))+'</td></tr>';}).join('')+'</tbody></table>';
  });
  html+='<p style="font-size:9px;color:#555;margin-top:10px">Prêmio por desempenho (CLT, art. 457, §§ 2º e 4º), pago separado do salário.</p>';
  SagaPdf.imprimir({titulo:'Prêmio da Captação',subtitulo:(d.fechado?'Fechamento de ':'Projeção de ')+mesNome(d.mes),arquivo:'premio-captacao-'+String(d.mes).slice(0,7),paisagem:true,paginas:[html]});
}

/* ---------- eventos ---------- */
function ligar(){
  try{if(semMov())document.documentElement.classList.add('sem-movimento');}catch(e){}
  $('abas').addEventListener('click',function(e){var b=e.target.closest('.pill[data-aba]');if(!b||b.dataset.aba===P.aba)return;
    P.aba=b.dataset.aba;marcarAba();try{history.replaceState(null,'','?aba='+P.aba);}catch(x){}
    if(P.aba==='validar'&&P.validar.lista===null)carregarValidar();
    setTimeout(desenhar,0);});
  $('mesNav').addEventListener('click',function(e){var b=e.target.closest('[data-mes]');if(!b)return;P.mes=somaMes(P.mes,Number(b.dataset.mes));carregar();});
  $('btnAtualizar').addEventListener('click',function(){P.validar.lista=null;carregar();});
  $('janela').addEventListener('click',function(e){if(e.target===$('janela')||e.target.closest('[data-fechar]'))fecharJanela();});
  $('jOk').addEventListener('click',confirmarJanela);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('janela').classList.contains('aberto'))fecharJanela();});
  $('area').addEventListener('change',function(e){if(e.target.id==='selQuem'){P.quem=e.target.value===P.d.eu?null:e.target.value;carregar();}});
  var tBusca=null;
  $('area').addEventListener('input',function(e){if(e.target.id==='vBusca'){P.validar.busca=e.target.value;clearTimeout(tBusca);tBusca=setTimeout(function(){carregarValidar().then(function(){var i=$('vBusca');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}});},350);}});
  $('area').addEventListener('click',function(e){
    var t;
    if((t=e.target.closest('[data-sobe]'))){e.stopPropagation();moverBloco(t.dataset.sobe,-1);return;}
    if((t=e.target.closest('[data-desce]'))){e.stopPropagation();moverBloco(t.dataset.desce,1);return;}
    if((t=e.target.closest('[data-editar]'))){e.stopPropagation();editarBloco(t.dataset.editar);return;}
    if((t=e.target.closest('[data-novo-bloco]'))){editarBloco(null,t.dataset.novoBloco);return;}
    if((t=e.target.closest('[data-abrir]'))){alternarBloco(t.dataset.abrir);return;}
    if(e.target.closest('#btnRegras')){editarRegras();return;}
    if(e.target.closest('#btnPesos')){editarPesos();return;}
    if((t=e.target.closest('[data-vsit]'))){if(t.dataset.vsit===P.validar.sit)return;P.validar.sit=t.dataset.vsit;P.validar.lista=null;document.querySelectorAll('[data-vsit]').forEach(function(x){x.classList.toggle('active',x===t);});setTimeout(carregarValidar,0);return;}
    if((t=e.target.closest('[data-validar]'))){abrirValidar(t.dataset.validar);return;}
    if((t=e.target.closest('[data-cancelar]'))){abrirCancelar(t.dataset.cancelar);return;}
    if(e.target.closest('#btnFechar')){fecharMes();return;}
    if(e.target.closest('#btnPdf')){pdf();return;}
    if(e.target.closest('#btnAjuste')){lancarAjuste();return;}
    if(e.target.closest('#btnPessoas')){editarPessoas();return;}
    if((t=e.target.closest('[data-ir-mes]'))){P.mes=t.dataset.irMes;carregar();return;}
    if((t=e.target.closest('tr.linha-pessoa'))){P.quem=t.dataset.pessoa===P.d.eu?null:t.dataset.pessoa;P.aba='meu';marcarAba();carregar();return;}
  });
}
async function init(){
  var q=new URLSearchParams(location.search);
  P.aba=['meu','normas','como','validar','geral'].indexOf(q.get('aba'))>=0?q.get('aba'):'meu';
  P.mes=/^\d{4}-\d{2}$/.test(q.get('mes')||'')?q.get('mes')+'-01':mesAtual();
  marcarAba();ligar();
  await SagaUI.carregar('premios');
  var s=await _sb.auth.getSession();if(!s.data||!s.data.session){location.href='login_padrao_metalico.html';return;}
  await carregar();
}
init().catch(function(e){P.erro=erroMsg(e);desenhar();});
})();
