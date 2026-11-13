/* =====================================================================
   SAGA · Relatórios do Ponto dentro do sistema (13/11/2026, Dr. Victor; T166)
   "Em vez de mandar por e-mail, eu fico vendo tudo no sistema."
   Diário, Semanal e Fechamento do mês com o MESMO conteúdo dos e-mails da função
   ponto-relatorios (supabase/functions/ponto-relatorios/index.ts) e o MESMO cálculo
   (ponto_calculo.js, PontoCalculo). Só lê: não grava nada (o fechamento gravado no
   banco de horas continua sendo feito pelo servidor no dia do fechamento).
   Uso: SagaPontoRelatorios.iniciar(ctx) e SagaPontoRelatorios.mostrar() (aba ?aba=relatorios).
   ===================================================================== */
window.SagaPontoRelatorios=(function(){
  'use strict';
  var C=null,PC=null,montado=false,cache={},versao=0;
  var R={modo:'dia',dia:'',semanaFim:'',mes:''};
  var NOMES_MES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var DIAS_CURTOS=['dom','seg','ter','qua','qui','sex','sáb'];
  var SIT_ABONOS=['Atestado médico','Falta abonada','Falta justificada','Folga compensatória','Folga concedida','Férias','Licença','Home office'];

  function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
  function dois(n){return ('0'+n).slice(-2);}
  function br(k){return k.slice(8,10)+'/'+k.slice(5,7)+'/'+k.slice(0,4);}
  function brCurto(k){return k.slice(8,10)+'/'+k.slice(5,7);}
  function somaDias(k,n){var d=new Date(k+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function partesMes(k){var p=k.split('-').map(Number);return {a:p[0],m:p[1]};}
  function mesAnterior(k){var p=partesMes(k);return p.m===1?(p.a-1)+'-12':p.a+'-'+dois(p.m-1);}
  function mesSeguinte(k){var p=partesMes(k);return p.m===12?(p.a+1)+'-01':p.a+'-'+dois(p.m+1);}
  function fimMes(k){var p=partesMes(k);return k+'-'+dois(PC.diasNoMes(p.a,p.m));}
  function fechKey(k){var p=partesMes(k);return k+'-'+dois(PC.diaFechamento(p.a,p.m,C.state.cfg.dia_fechamento));}
  function hmT(m){return m===null||m===undefined?'':PC.hhmm(m);}
  function hmR(m){return m===null||m===undefined?'':PC.hhmmRelogio(m);}
  function saldo(m){if(m===null||m===undefined)return '<span class="pr-apagado">-</span>';return '<b class="'+(m<0?'neg':m>0?'pos':'')+'">'+(m>0?'+':'')+PC.hhmm(m)+'</b>';}
  function selo(s){return s?C.etqStatus(s):'';}
  function semMovimento(){try{return localStorage.getItem('saga-movimento')==='reduzido';}catch(e){return false;}}
  function inicioSemana(k){var w=PC.diaSemana(k);return somaDias(k,-((w+6)%7));}

  /* ---------- leitura dos dados (em lotes, sem o limite de 1.000 linhas) ---------- */
  async function lerTudo(tabela,campos,ini,fim,ord){
    var lista=[],de=0;
    for(;;){
      var q=C.sb.from(tabela).select(campos).gte('data',ini).lte('data',fim).order('colaborador_id').order('data');
      if(ord)q=q.order(ord);
      var r=await q.range(de,de+999);
      if(r.error)throw new Error('não deu para ler '+tabela+': '+(r.error.message||r.error.code||'erro'));
      lista=lista.concat(r.data||[]);
      if(!r.data||r.data.length<1000)return lista;
      de+=1000;
    }
  }
  // Calcula o mês de todos os colaboradores com login (mesmo cálculo da tela e do servidor)
  async function coletarMes(k){
    if(cache['mes:'+k])return cache['mes:'+k];
    var p=partesMes(k),ini=k+'-01',fim=fimMes(k);
    var r=await Promise.all([lerTudo('ponto_marcacoes','colaborador_id,data,slot,momento',ini,fim,'slot'),lerTudo('ponto_dias','*',ini,fim)]);
    var mkPor={},diaPor={};
    r[0].forEach(function(x){var m=mkPor[x.colaborador_id]=mkPor[x.colaborador_id]||{};(m[x.data]=m[x.data]||[null,null,null,null,null,null,null,null])[x.slot]=C.minutosLocal(x.momento);});
    r[1].forEach(function(x){(diaPor[x.colaborador_id]=diaPor[x.colaborador_id]||{})[x.data]=x;});
    var out=C.state.colabsPonto.map(function(c){
      return {c:c,livre:C.regimeDe(c).livre,calc:PC.calcularMes(p.a,p.m,C.state.hoje,{colab:C.colabCalc(c),jornadas:C.jornadasDe(c.id),regime:C.regimeDe(c),cfg:C.cfgCalc(),feriados:C.state.feriados,marcacoes:mkPor[c.id]||{},dias:diaPor[c.id]||{}})};
    });
    cache['mes:'+k]=out;return out;
  }
  async function justificativas(ini,fim){
    var r=await C.sb.from('ponto_justificativas').select('colaborador_id,data,tipo,status,horas_abonar_min').gte('data',ini).lte('data',fim);
    if(r.error)throw new Error('não deu para ler as justificativas: '+(r.error.message||'erro'));
    var m={};(r.data||[]).forEach(function(j){(m[j.colaborador_id+'|'+j.data]=m[j.colaborador_id+'|'+j.data]||[]).push(j);});
    return m;
  }
  function justDe(J,id,k){return J[id+'|'+k]||[];}
  function textoJust(l){return l.map(function(j){return j.tipo+' ('+(j.status==='aprovada'?'aprovada':j.status==='recusada'?'recusada':'aguardando aprovação')+')';}).join('; ');}
  function semLogin(){
    var h=C.state.hoje;
    return C.state.colabs.filter(function(c){return !c.temConta&&(!c.demissao||c.demissao>=h);}).map(function(c){return String(c.nome);}).sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  }

  /* ---------- peças do relatório (servem para a tela e para o PDF) ---------- */
  function numeros(itens){return '<div class="kpis">'+itens.map(function(it){return '<div class="'+(it[2]||'')+'"><span>'+esc(it[0])+'</span><b>'+esc(it[1])+'</b></div>';}).join('')+'</div>';}
  function secao(t,dica){return '<div class="secao">'+esc(t)+'</div>'+(dica?'<div class="mini pr-dica">'+dica+'</div>':'');}
  function tabela(cab,linhas,alinhar){
    return '<div class="pr-tab-wrap"><table class="tab"><thead><tr>'+cab.map(function(x,j){var a=(alinhar&&alinhar[j])||(j===0?'left':'center');return '<th class="'+(a==='center'?'c':'')+'">'+esc(x)+'</th>';}).join('')+'</tr></thead><tbody>'+
      linhas.map(function(l){var cls=l.cls?' class="'+l.cls+'"':'';var cel=l.l||l;return '<tr'+cls+'>'+cel.map(function(x,j){var a=(alinhar&&alinhar[j])||(j===0?'left':'center');return '<td class="'+(a==='center'?'c':'')+'">'+x+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
  }
  function atencao(itens){
    var com=itens.filter(function(x){return x[1].length;});
    if(!com.length)return '<div class="obs pr-ok">✔ Nada a observar: sem faltas, atrasos, saídas antecipadas ou marcações incompletas.</div>';
    return '<div class="obs pr-atencao">'+com.map(function(x){return '<p><b>'+esc(x[0])+':</b> '+x[1].map(esc).join(', ')+'</p>';}).join('')+'</div>';
  }
  function pendencias(pessoas,ini,fim,J){
    var pend=[],resolv=[],aguard=[];
    pessoas.forEach(function(p){
      var pp=[],rr=[],aa=[];
      p.dias.forEach(function(x){
        if(x.key<ini||x.key>fim)return;
        var js=justDe(J,p.id,x.key),aprov=js.some(function(j){return j.status==='aprovada';}),espera=js.some(function(j){return j.status==='pendente';});
        if(SIT_ABONOS.indexOf(x.sit)>=0||x.d.status==='Abonado'||x.abonoManual>0)rr.push(brCurto(x.key)+' '+(x.d.status==='Abonado'||SIT_ABONOS.indexOf(x.sit)>=0?x.sit.toLowerCase():'abono de '+PC.hhmm(x.abonoManual)));
        else if((x.d.falta||x.d.incompleta)&&!aprov){var o=brCurto(x.key)+' '+(x.d.falta?'falta':'marcação incompleta');if(espera)aa.push(o);else pp.push(o);}
      });
      if(pp.length)pend.push([p.nome,pp]);if(aa.length)aguard.push([p.nome,aa]);if(rr.length)resolv.push([p.nome,rr]);
    });
    return {pend:pend,aguard:aguard,resolv:resolv};
  }
  function pendenciasHtml(titulo,r){
    var item=function(rot,cls,l){return l.length?'<div class="pr-pend '+cls+'"><span class="pr-pend-rot">'+rot+'</span>'+l.map(function(x){return '<p><b>'+esc(x[0])+'</b>: '+esc(x[1].join(', '))+'</p>';}).join('')+'</div>':'';};
    var corpo=item('Sem abono nem justificativa','ruim',r.pend)+item('Justificativa aguardando aprovação','espera',r.aguard)+item('Abonados / justificados','bom',r.resolv);
    return secao(titulo,'Faltas e marcações incompletas que ainda contam contra a pessoa, as que aguardam aprovação e o que já foi abonado (atestado, abono, folga).')+
      (corpo||'<div class="obs pr-ok">✔ Nenhuma falta ou marcação incompleta no período.</div>');
  }
  function semLoginHtml(){
    var l=semLogin();if(!l.length)return '';
    return secao('Ainda batem o ponto na planilha','Ainda não têm login no SAGA, por isso não aparecem neste relatório.')+'<div class="obs">'+l.map(esc).join(' · ')+'</div>';
  }
  function linhaCor(status){var s=String(status||'');return /Falta|negativas/.test(s)?'pr-l-ruim':/incompleta|justificada/.test(s)?'pr-l-aviso':'';}

  /* ---------- Diário (cópia do relatorioDiario do servidor) ---------- */
  async function diario(diaKey){
    var dados=await coletarMes(diaKey.slice(0,7));
    var J=await justificativas(diaKey.slice(0,8)+'01',diaKey);
    var linhas=[],diretoria=[],presentes=0,previstos=0,horas=0;
    var faltas=[],atrasos=[],antec=[],incompletas=[],abertos=[],pausas=[];
    var tol=Number(C.state.cfg.tolerancia_min||0);
    dados.forEach(function(x){
      var dia=x.calc.dias.find(function(y){return y.key===diaKey;});if(!dia)return;
      var d=dia.d,mk=dia.mk,nome=String(x.c.nome);
      if(x.livre){
        if(d.trab!==null&&d.trab!==undefined){
          var per=[];for(var i=0;i<8;i+=2)if(mk[i]!==null)per.push(hmR(mk[i])+' às '+(mk[i+1]!==null?hmR(mk[i+1]):'em aberto'));
          diretoria.push(['<b>'+esc(nome)+'</b>',per.join('<br>'),hmT(d.trab),selo(d.status)]);
          if(d.status==='Em andamento'||d.status==='Marcação incompleta')abertos.push(nome);
        }
        return;
      }
      if(d.carga)previstos++;if(mk[0]!==null)presentes++;if(d.trab)horas+=d.trab;
      if(d.falta)faltas.push(nome);if(d.fAtraso)atrasos.push(nome+' ('+d.atraso+' min)');if(d.fAntec)antec.push(nome+' ('+d.antec+' min)');
      if(d.fPausa)pausas.push(nome);if(d.incompleta)incompletas.push(nome);if(d.status==='Em andamento')abertos.push(nome);
      if(!d.carga&&mk[0]===null)return;
      var p=[];for(var k=1;k<=5;k+=2)if(mk[k]!==null)p.push(hmR(mk[k])+'–'+(mk[k+1]!==null?hmR(mk[k+1]):'…'));
      var grave=d.falta||d.incompleta||d.fAtraso||d.fAntec||d.fPausa?0:1;
      var corDif=function(v){return v>tol?'neg':'pr-aviso';};
      var entrada=mk[0]!==null?'<b>'+hmR(mk[0])+'</b>'+(d.atraso?'<div class="mini '+corDif(d.atraso)+'">atraso '+d.atraso+' min'+(d.atraso<=tol?' (tolerância)':'')+'</div>':''):'<span class="pr-apagado">-</span>';
      var saida=mk[7]!==null?'<b>'+hmR(mk[7])+'</b>'+(d.antec?'<div class="mini '+corDif(d.antec)+'">saiu '+d.antec+' min antes'+(d.antec<=tol?' (tolerância)':'')+'</div>':''):'<span class="pr-apagado">-</span>';
      var pausasTxt=p.length?p.join('<br>')+'<div class="mini">total '+(hmT(d.pausas)||'00:00')+(d.pausaRem?' · remunerada '+PC.hhmm(d.pausaRem):'')+'</div>':'-';
      var manual=SIT_ABONOS.indexOf(dia.sit)>=0?'<div class="mini">'+esc(dia.sit)+'</div>':'';
      var js=justDe(J,x.c.id,diaKey);
      var obs=[(d.ocorr||[]).join('; '),js.length?'Justificativa: '+textoJust(js):'',dia.observacao||''].filter(Boolean).map(esc).join('<br>');
      linhas.push({ordem:grave,cls:linhaCor(d.status),l:['<b>'+esc(nome)+'</b><div class="mini">'+esc(x.c.regime||'')+'</div>',
        PC.hhmm(dia.cj.entrada)+' às '+PC.hhmm(dia.cj.saida)+'<div class="mini">carga '+(hmT(d.carga!=null?d.carga:dia.cj.carga)||'-')+'</div>',
        entrada,saida,pausasTxt,hmT(d.trab)||'-',saldo(d.saldo),selo(d.status||dia.sit)+manual,'<span class="mini">'+obs+'</span>']});
    });
    if(!linhas.length&&!diretoria.length)return {vazio:'Nada a relatar em '+br(diaKey)+' (dia sem expediente e sem registros).'};
    var pj=await C.sb.from('ponto_justificativas').select('id',{count:'exact',head:true}).eq('status','pendente');
    if(pj.error)throw new Error('não deu para contar as justificativas pendentes: '+(pj.error.message||'erro'));
    var pend=pj.count||0;
    linhas.sort(function(a,b){return a.ordem-b.ordem;});
    var corpo=numeros([['presentes',presentes+' de '+previstos,'forte'],['horas trabalhadas (equipe)',PC.hhmm(horas)||'00:00'],['faltas',faltas.length,faltas.length?'ruim':''],
      ['ocorrências',atrasos.length+antec.length+pausas.length+incompletas.length],['justificativas pendentes',pend,pend?'ruim':'']]);
    corpo+=secao('Pontos de atenção')+atencao([['Faltas',faltas],['Atrasos acima da tolerância',atrasos],['Saídas antecipadas',antec],['Pausas excedidas',pausas],
      ['Marcação incompleta',incompletas],['Ponto ainda aberto',abertos],['Justificativas para aprovar',pend?[pend+' pendente(s) na aba Equipe']:[]]]);
    if(linhas.length)corpo+=secao('Equipe','Quem tem ocorrência aparece primeiro. Atrasos e saídas antecipadas contam como ocorrência só acima da tolerância de '+esc(tol)+' min.')+
      tabela(['Colaborador','Previsto','Entrada','Saída','Pausas','Trabalhadas','Saldo do dia','Situação','Observações e justificativas'],linhas,['left','center','center','center','center','center','center','center','left']);
    if(diretoria.length)corpo+=secao('Diretoria (horário livre)')+tabela(['Nome','Períodos','Horas no dia','Situação'],diretoria);
    var comHorario=dados.filter(function(x){return !x.livre;}).map(function(x){return {nome:String(x.c.nome),id:x.c.id,dias:x.calc.dias};});
    if(comHorario.length)corpo+=pendenciasHtml('Pendências do mês (01/'+diaKey.slice(5,7)+' a '+brCurto(diaKey)+')',pendencias(comHorario,diaKey.slice(0,8)+'01',diaKey,J));
    corpo+=semLoginHtml();
    var nd=PC.NOMES_DIA[PC.diaSemana(diaKey)];
    return {titulo:'Ponto do dia '+br(diaKey),sub:nd.charAt(0).toUpperCase()+nd.slice(1)+' · '+linhas.length+' colaborador(es) com expediente',corpo:corpo,arquivo:'Ponto - diário - '+br(diaKey).replace(/\//g,'-')};
  }

  /* ---------- Semanal (cópia do relatorioSemanal do servidor; semana de segunda a domingo) ---------- */
  async function semanal(fimKey){
    var iniKey=inicioSemana(fimKey);
    var meses=[iniKey.slice(0,7)];if(fimKey.slice(0,7)!==meses[0])meses.push(fimKey.slice(0,7));
    var porId={};
    for(var i=0;i<meses.length;i++){
      var lista=await coletarMes(meses[i]);
      lista.forEach(function(x){var o=porId[x.c.id]=porId[x.c.id]||{c:x.c,livre:x.livre,dias:[],mesAtual:null};o.dias=o.dias.concat(x.calc.dias);if(meses[i]===fimKey.slice(0,7))o.mesAtual=x.calc.dias;});
    }
    var diasSemana=[];for(var k=iniKey;k<=fimKey;k=somaDias(k,1))diasSemana.push(k);
    var linhas=[],grade=[],diretoria=[],horas=0,saldoEq=0,faltasEq=0,ocorrEq=0,alerta=[],negativo=[],lim=C.state.cfg.limite_alerta;
    Object.keys(porId).forEach(function(id){
      var x=porId[id],s=PC.somarPeriodo(x.dias,iniKey,fimKey),nome=String(x.c.nome);
      if(x.livre){
        if(s.trab){
          diretoria.push(['<b>'+esc(nome)+'</b>',String(s.diasTrab),hmT(s.trab)]);
          grade.push(['<b>'+esc(nome)+'</b><div class="mini">Diretoria</div>'].concat(diasSemana.map(function(dk){var dia=x.dias.find(function(y){return y.key===dk;});return dia&&dia.d.trab?'<span class="pr-hora">'+PC.hhmm(dia.d.trab)+'</span>':'<span class="pr-apagado">·</span>';})));
        }
        return;
      }
      if(!s.carga&&!s.trab)return;
      var m=PC.somarPeriodo(x.mesAtual||[],fimKey.slice(0,8)+'01',fimKey),ocorr=s.atrasos+s.antec+s.pausas;
      horas+=s.trab;saldoEq+=s.saldo;faltasEq+=s.faltas;ocorrEq+=ocorr+s.incompletas;
      if(s.faltas||ocorr>=lim)alerta.push(nome);if(s.saldo<0)negativo.push(nome+' ('+PC.hhmm(s.saldo)+')');
      linhas.push({ordem:s.faltas||ocorr>=lim?0:s.saldo<0?1:2,l:['<b>'+esc(nome)+'</b>',String(s.diasTrab),hmT(s.carga),hmT(s.trab),hmT(s.abono)||'-',saldo(s.saldo),
        String(s.atrasos),String(s.antec),String(s.pausas),String(s.faltas),String(s.incompletas),saldo(m.saldo)]});
      grade.push(['<b>'+esc(nome)+'</b>'].concat(diasSemana.map(function(dk){
        var dia=x.dias.find(function(y){return y.key===dk;});
        if(!dia||(!dia.d.carga&&!dia.d.trab))return '<span class="pr-apagado">·</span>';
        var st=dia.d.status||'',txt=dia.d.trab?PC.hhmm(dia.d.trab):st==='Falta'?'falta':st==='Aguardando entrada'?'—':st.toLowerCase();
        return '<span title="'+esc(st)+'">'+C.etqStatus(st).replace('>'+esc(st)+'<','>'+esc(txt)+'<')+'</span>';
      })));
    });
    if(!linhas.length&&!diretoria.length)return {vazio:'Nada a relatar na semana de '+br(iniKey)+' a '+br(fimKey)+'.'};
    linhas.sort(function(a,b){return a.ordem-b.ordem;});
    var corpo=numeros([['horas trabalhadas (equipe)',PC.hhmm(horas)||'00:00','forte'],['saldo da equipe',(saldoEq>0?'+':'')+(PC.hhmm(saldoEq)||'00:00'),saldoEq<0?'ruim':''],
      ['faltas',faltasEq,faltasEq?'ruim':''],['ocorrências',ocorrEq]]);
    corpo+=secao('Pontos de atenção')+atencao([['No limite de alerta ('+lim+' ocorrências) ou com falta',alerta],['Saldo negativo na semana',negativo]]);
    if(grade.length)corpo+=secao('A semana dia a dia','Horas trabalhadas em cada dia; a cor segue a situação do dia.')+tabela(['Colaborador'].concat(diasSemana.map(function(dk){return DIAS_CURTOS[PC.diaSemana(dk)]+' '+brCurto(dk);})),grade);
    if(linhas.length)corpo+=secao('Totais da semana','Atrasos, saídas e pausas contam só acima da tolerância de '+esc(C.state.cfg.tolerancia_min)+' min.')+
      tabela(['Colaborador','Dias trabalhados','Carga','Trabalhadas','Abonadas','Saldo da semana','Atrasos','Saídas antes','Pausas excedidas','Faltas','Incompletas','Saldo do mês'],linhas);
    if(diretoria.length)corpo+=secao('Diretoria (horário livre)')+tabela(['Nome','Dias com registro','Horas na semana'],diretoria);
    var J=await justificativas(iniKey,fimKey);
    var comHorario=Object.keys(porId).map(function(id){return porId[id];}).filter(function(x){return !x.livre;}).map(function(x){return {nome:String(x.c.nome),id:x.c.id,dias:x.dias};});
    if(comHorario.length)corpo+=pendenciasHtml('Pendências da semana',pendencias(comHorario,iniKey,fimKey,J));
    corpo+=semLoginHtml();
    return {titulo:'Ponto da semana',sub:br(iniKey)+' a '+br(fimKey),corpo:corpo,arquivo:'Ponto - semanal - '+br(iniKey).replace(/\//g,'-')+' a '+br(fimKey).replace(/\//g,'-')};
  }

  /* ---------- Fechamento do mês (cópia do fechamentoMensal do servidor, sem gravar) ---------- */
  async function fechamento(k){
    var p=partesMes(k),fk=fechKey(k),hoje=C.state.hoje;
    var dados=await coletarMes(k);
    var b=await C.sb.from('ponto_banco_horas').select('colaborador_id,mes,transportar,fechado_em,descontar,compensar').in('mes',[mesAnterior(k),k]);
    if(b.error)throw new Error('não deu para ler o banco de horas: '+(b.error.message||'erro'));
    var ant={},gravado={};(b.data||[]).forEach(function(r){if(r.mes===k)gravado[r.colaborador_id]=r;else ant[r.colaborador_id]=r;});
    var equipe=[],diretoria=[],desc=0,comp=0,alerta=[],descontar=[],out=[],lim=C.state.cfg.limite_alerta,nGravados=0;
    dados.forEach(function(x){
      if(x.livre){var s0=PC.somarPeriodo(x.calc.dias,k+'-01',fk);if(s0.trab)diretoria.push(['<b>'+esc(x.c.nome)+'</b>',String(s0.diasTrab),hmT(s0.trab)]);return;}
      var a=ant[x.c.id],carga=PC.jornadaDoDia(C.colabCalc(x.c),C.jornadasDe(x.c.id),fk).carga||0;
      var f=PC.fechamento(x.calc.dias,k+'-01',fk,a&&a.transportar!==null&&a.transportar!==undefined?a.transportar:0,carga);
      if(gravado[x.c.id]&&gravado[x.c.id].fechado_em)nGravados++;
      out.push({x:x,f:f});
      var s=f.soma,ocorr=s.atrasos+s.antec+s.pausas,perfil=ocorr>=lim||s.faltas?'ALERTA':'Regular';
      if(perfil==='ALERTA')alerta.push(String(x.c.nome));
      if(f.descontar){desc+=f.descontar;descontar.push(x.c.nome+' ('+PC.hhmm(f.descontar)+')');}
      comp+=f.compensar||0;
      equipe.push({cls:perfil==='ALERTA'?'pr-l-ruim':'',l:['<b>'+esc(x.c.nome)+'</b><div class="mini">'+esc(x.c.regime||'')+'</div>',hmT(s.carga),hmT(s.trab),hmT(s.abono),saldo(s.saldo),saldo(f.anterior),saldo(f.total),
        f.descontar?'<b class="neg">'+PC.hhmm(f.descontar)+'</b>':'-',f.compensar?'<b class="pos">'+PC.hhmm(f.compensar)+'</b>':'-',f.excedente?PC.hhmm(f.excedente):'-',String(s.faltas),String(ocorr),
        perfil==='ALERTA'?'<b class="neg">ALERTA</b>':'Regular']});
    });
    if(!equipe.length&&!diretoria.length)return {vazio:'Nada a relatar no fechamento de '+NOMES_MES[p.m-1]+'.'};
    var fim=fimMes(k),previa=hoje<=fk;
    var aviso=previa
      ?'<div class="obs pr-previa"><b>Prévia:</b> o período ainda não terminou (fecha em '+br(fk)+'). Os números mudam até lá; no dia do fechamento o servidor grava o resultado no Banco de horas.</div>'
      :(nGravados?'<div class="obs">Fechamento gravado no Banco de horas para '+nGravados+' colaborador(es). Os números abaixo são recalculados agora com o mesmo cálculo; se alguém mudou uma batida ou um abono depois do fechamento, eles podem diferir do que foi gravado.</div>'
        :'<div class="obs pr-previa"><b>Ainda não gravado:</b> o período já terminou, mas o Banco de horas deste mês ainda não tem o fechamento. Confira a aba Banco de horas.</div>');
    var corpo=aviso+numeros([['colaboradores no fechamento',out.length,'forte'],['horas a descontar na folha',PC.hhmm(desc)||'00:00',desc?'ruim':''],['horas a compensar',PC.hhmm(comp)||'00:00'],['em alerta',alerta.length,alerta.length?'ruim':'']]);
    corpo+='<p class="pr-texto">Fechamento do período de <b>'+br(k+'-01')+'</b> a <b>'+br(fk)+'</b> para a folha de pagamento. O que acontecer de '+br(fk<fim?somaDias(fk,1):fim)+' até o fim do mês entra no saldo do mês seguinte.</p>';
    corpo+=secao('Pontos de atenção')+atencao([['Descontar na folha',descontar],['Em alerta (faltas ou ocorrências)',alerta]]);
    if(equipe.length)corpo+=secao('Fechamento por colaborador')+tabela(['Colaborador','Carga','Trabalhadas','Abonadas','Saldo do período','Saldo anterior','Saldo total','Descontar na folha','Compensar até o fim do mês','Excedente desconsiderado','Faltas','Ocorrências','Perfil'],equipe);
    if(diretoria.length)corpo+=secao('Diretoria (horário livre)')+tabela(['Nome','Dias com registro','Horas no período'],diretoria);
    var J=await justificativas(k+'-01',fk);
    corpo+=pendenciasHtml('Dias do período sem abono',pendencias(out.map(function(o){return {nome:String(o.x.c.nome),id:o.x.c.id,dias:o.x.calc.dias};}),k+'-01',fk,J));
    corpo+='<p class="mini pr-texto">Regras: horas negativas são descontadas na folha; horas positivas valem até 1 dia de carga e devem ser compensadas até o fim do mês (saída mais cedo ou folga, de preferência na última sexta-feira); o que passar de 1 dia é desconsiderado. Os valores gravados ficam na aba Banco de horas.</p>';
    corpo+=semLoginHtml();
    return {titulo:'Fechamento de '+NOMES_MES[p.m-1]+' de '+p.a,sub:br(k+'-01')+' a '+br(fk)+' · para a folha de pagamento'+(previa?' · prévia':''),corpo:corpo,arquivo:'Ponto - fechamento - '+NOMES_MES[p.m-1]+' '+p.a};
  }

  /* ---------- tela ---------- */
  var CSS='#aba-relponto .pr-barra{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 12px}'+
    '#aba-relponto .pr-transicao{border:1px solid color-mix(in srgb,#f59e0b 55%,transparent);background:color-mix(in srgb,#f59e0b 10%,var(--panel));color:var(--text);border-radius:12px;padding:10px 14px;margin:0 0 12px;font-size:12.5px}'+
    '#aba-relponto .pr-erro{border:1px solid color-mix(in srgb,#e5484d 55%,transparent);background:color-mix(in srgb,#e5484d 9%,var(--panel));color:var(--text);border-radius:12px;padding:10px 14px;margin:0 0 12px;font-size:12.5px}'+
    '#prConteudo{transition:opacity .28s cubic-bezier(.22,.78,.25,1)}#prConteudo.carregando{opacity:.45}html.saga-sem-movimento #prConteudo{transition:none}'+
    '#prConteudo .pr-cab h3{margin:0;font-family:"Cormorant Garamond",serif;font-size:22px;color:var(--text)}#prConteudo .pr-cab .sub{margin:2px 0 12px}'+
    '#prConteudo .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0 0 6px}'+
    '#prConteudo .kpis>div{background:var(--panel);border:1px solid var(--border-soft,var(--border));border-top:3px solid var(--gold);border-radius:12px;padding:10px 12px}'+
    '#prConteudo .kpis>div.ruim{border-top-color:var(--danger,#e5484d)}#prConteudo .kpis>div>span{display:block;font-size:11px;color:var(--muted)}#prConteudo .kpis b{display:block;font-size:20px;color:var(--text);font-variant-numeric:tabular-nums}'+
    '#prConteudo .secao{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-weight:700;margin:18px 0 4px}#prConteudo .pr-dica{margin:0 0 6px}'+
    '#prConteudo .mini{font-size:11.5px;color:var(--muted)}#prConteudo .pr-apagado{color:var(--muted);opacity:.6}#prConteudo .pr-aviso{color:var(--warning,#e0a93b)}'+
    '#prConteudo .obs{border:1px solid var(--border-soft,var(--border));border-left:3px solid var(--gold);border-radius:10px;padding:9px 12px;background:var(--panel);font-size:13px;color:var(--text);margin:4px 0}#prConteudo .obs p{margin:3px 0}'+
    '#prConteudo .pr-ok{border-left-color:var(--success,#2fae7a)}#prConteudo .pr-atencao,#prConteudo .pr-previa{border-left-color:var(--warning,#e0a93b)}'+
    '#prConteudo .pr-pend{border-left:3px solid var(--border);padding:2px 0 2px 10px;margin:8px 0;font-size:13px}#prConteudo .pr-pend p{margin:3px 0}'+
    '#prConteudo .pr-pend.ruim{border-left-color:var(--danger,#e5484d)}#prConteudo .pr-pend.espera{border-left-color:var(--warning,#e0a93b)}#prConteudo .pr-pend.bom{border-left-color:var(--success,#2fae7a)}'+
    '#prConteudo .pr-pend-rot{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}'+
    '#prConteudo .pr-tab-wrap{overflow-x:auto;border:1px solid var(--border-soft,var(--border));border-radius:12px}'+
    '#prConteudo table.tab{width:100%;border-collapse:collapse;font-size:12.5px;min-width:640px}'+
    '#prConteudo table.tab th{background:color-mix(in srgb,var(--gold) 10%,var(--panel));color:var(--muted);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;text-align:left;padding:8px 9px;border-bottom:1px solid var(--border-soft,var(--border))}'+
    '#prConteudo table.tab td{padding:8px 9px;border-bottom:1px solid var(--border-soft,var(--border));color:var(--text);vertical-align:middle}#prConteudo table.tab tr:last-child td{border-bottom:0}'+
    '#prConteudo table.tab .c{text-align:center}#prConteudo tr.pr-l-ruim td:first-child{box-shadow:inset 3px 0 0 var(--danger,#e5484d)}#prConteudo tr.pr-l-aviso td:first-child{box-shadow:inset 3px 0 0 var(--warning,#e0a93b)}'+
    '#prConteudo .pr-hora{display:inline-block;min-width:46px;padding:2px 6px;border-radius:7px;background:color-mix(in srgb,var(--gold) 14%,transparent);font-size:11.5px;font-weight:600}'+
    '#prConteudo .pr-texto{font-size:13px;color:var(--text);margin:12px 0 0}';
  var CSS_PDF='.mini{font-size:7.2pt;color:#5f6f86}.pr-apagado{color:#a3adbd}.pr-aviso{color:#a16207}.pr-tab-wrap{margin:0 0 4px}.pr-dica{margin:0 0 4px}'+
    '.pr-pend{border-left:3px solid #c9d5e6;padding:1px 0 1px 8px;margin:6px 0;font-size:8pt}.pr-pend p{margin:2px 0}.pr-pend.ruim{border-left-color:#b42318}.pr-pend.espera{border-left-color:#d97706}.pr-pend.bom{border-left-color:#1f7a3f}'+
    '.pr-pend-rot{font-size:6.8pt;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#5f6f86}.pr-texto{font-size:8.5pt;margin:8px 0 0}.pr-hora{font-weight:700}'+
    '.etq{border-color:#c9d5e6}tr.pr-l-ruim td:first-child{border-left:3px solid #b42318}tr.pr-l-aviso td:first-child{border-left:3px solid #d97706}';

  function montar(){
    if(montado)return;montado=true;
    var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
    var aba=document.getElementById('aba-relponto');
    aba.innerHTML='<div class="pr-transicao" role="note"><b>Fase de transição:</b> a planilha do Google é a que vale; faltas e saldos daqui ainda não são reais.</div>'+
      '<div class="pr-barra">'+
        '<div class="pills" id="prModo" role="tablist" aria-label="Tipo de relatório"><button class="pill" data-modo="dia" type="button">Diário</button><button class="pill" data-modo="semana" type="button">Semanal</button><button class="pill" data-modo="mes" type="button">Fechamento do mês</button></div>'+
        '<div class="nav-mes"><button class="btn-secondary btn-sm" id="prAnt" type="button" aria-label="Anterior">‹</button><b id="prTitulo"></b><button class="btn-secondary btn-sm" id="prProx" type="button" aria-label="Próximo">›</button></div>'+
        '<input type="date" id="prData" aria-label="Escolher o dia" style="max-width:160px"><input type="month" id="prMes" aria-label="Escolher o mês" style="max-width:160px;display:none">'+
        '<button class="btn-secondary btn-sm" id="prHoje" type="button">Hoje</button>'+
        '<button class="btn-secondary btn-sm" id="prAtualizar" type="button" style="margin-left:auto">Atualizar</button>'+
        '<button class="btn-secondary btn-sm" id="prPdf" type="button">Salvar em PDF</button>'+
      '</div><div id="prErro"></div><div id="prConteudo" aria-live="polite"></div>'+
      '<p class="sub" style="margin-top:12px;max-width:900px">Mesmo conteúdo e mesmo cálculo dos relatórios por e-mail do Ponto. O diário é o do dia escolhido; o semanal vai de segunda a domingo da semana do dia escolhido; o fechamento vai do dia 1º ao dia de fechamento ('+esc(C.state.cfg.dia_fechamento||25)+') do mês escolhido. Esta aba só lê: nada é gravado.</p>';
    document.querySelectorAll('#prModo .pill').forEach(function(b){b.addEventListener('click',function(){R.modo=b.dataset.modo;mostrar();});});
    document.getElementById('prAnt').addEventListener('click',function(){mover(-1);});
    document.getElementById('prProx').addEventListener('click',function(){mover(1);});
    document.getElementById('prHoje').addEventListener('click',function(){R.dia=C.state.hoje;R.mes=mesPadrao();mostrar();});
    document.getElementById('prData').addEventListener('change',function(){if(this.value){R.dia=this.value;mostrar();}});
    document.getElementById('prMes').addEventListener('change',function(){if(this.value){R.mes=this.value;mostrar();}});
    document.getElementById('prAtualizar').addEventListener('click',function(){cache={};mostrar();});
    document.getElementById('prPdf').addEventListener('click',pdf);
  }
  // Fechamento: até o dia do fechamento mostra o mês anterior (o último fechado); depois, o mês atual
  function mesPadrao(){var k=C.state.hoje.slice(0,7);return C.state.hoje>=fechKey(k)?k:mesAnterior(k);}
  function mover(n){
    if(R.modo==='dia')R.dia=somaDias(R.dia,n);
    else if(R.modo==='semana')R.dia=somaDias(R.dia,7*n);
    else R.mes=n<0?mesAnterior(R.mes):mesSeguinte(R.mes);
    mostrar();
  }
  var ultimo=null;
  async function mostrar(){
    montar();
    if(!R.dia)R.dia=C.state.hoje;if(!R.mes)R.mes=mesPadrao();
    document.querySelectorAll('#prModo .pill').forEach(function(b){b.classList.toggle('active',b.dataset.modo===R.modo);});
    var fimSemana=somaDias(inicioSemana(R.dia),6);
    var titulo=R.modo==='dia'?br(R.dia):R.modo==='semana'?brCurto(inicioSemana(R.dia))+' a '+br(fimSemana):NOMES_MES[partesMes(R.mes).m-1]+' de '+partesMes(R.mes).a;
    document.getElementById('prTitulo').textContent=titulo;
    var inpD=document.getElementById('prData'),inpM=document.getElementById('prMes');
    inpD.style.display=R.modo==='mes'?'none':'';inpM.style.display=R.modo==='mes'?'':'none';inpD.value=R.dia;inpM.value=R.mes;
    document.getElementById('prProx').disabled=R.modo==='mes'?R.mes>=C.state.hoje.slice(0,7):R.modo==='semana'?fimSemana>=C.state.hoje:R.dia>=C.state.hoje;
    var alvo=document.getElementById('prConteudo'),erro=document.getElementById('prErro'),minha=++versao;
    alvo.classList.add('carregando');erro.innerHTML='';
    try{
      // a semana mostra até hoje quando é a semana corrente (o resto ainda não aconteceu)
      var r=R.modo==='dia'?await diario(R.dia):R.modo==='semana'?await semanal(fimSemana>C.state.hoje?C.state.hoje:fimSemana):await fechamento(R.mes);
      if(minha!==versao)return;
      ultimo=r.vazio?null:r;
      var html=r.vazio?'<div class="obs">'+esc(r.vazio)+'</div>':'<div class="pr-cab"><h3>'+esc(r.titulo)+'</h3><div class="sub">'+esc(r.sub)+'</div></div>'+r.corpo;
      var trocar=function(){alvo.innerHTML=html;alvo.classList.remove('carregando');};
      if(semMovimento()||!alvo.innerHTML)trocar();else{alvo.style.opacity='0';setTimeout(function(){trocar();alvo.style.opacity='';},200);}
    }catch(e){
      if(minha!==versao)return;
      alvo.classList.remove('carregando');ultimo=null;
      erro.innerHTML='<div class="pr-erro"><b>Não deu para montar o relatório:</b> '+esc((e&&e.message)||'erro desconhecido')+'. Os dados não foram alterados. Clique em Atualizar para tentar de novo; se continuar, avise o administrador com esta mensagem.</div>';
    }
  }
  function pdf(){
    if(!ultimo){if(C.toast)C.toast('Nada para salvar em PDF neste período.','error');return;}
    window.SagaPdf.imprimir({titulo:ultimo.titulo,subtitulo:ultimo.sub+' · Fase de transição: a planilha do Google é a que vale',arquivo:ultimo.arquivo,paisagem:true,css:CSS_PDF,
      paginas:['<div class="obs"><b>Fase de transição:</b> a planilha do Google é a que vale; faltas e saldos daqui ainda não são reais.</div>'+ultimo.corpo]});
  }
  function iniciar(ctx){C=ctx;PC=window.PontoCalculo;}
  return {iniciar:iniciar,mostrar:mostrar,_teste:{inicioSemana:inicioSemana,mesPadrao:function(){return mesPadrao();}}};
})();
