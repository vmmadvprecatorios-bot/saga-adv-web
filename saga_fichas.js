/* =====================================================================================
   SAGA · Fichas repetidas (08/11 e 11/11, pedidos do Dr. Victor; T152)
   Antes de criar um cliente, procura se a pessoa já tem ficha: mesmo CPF (com ou sem
   pontos), mesmo nome ou nome parecido (sem diferenciar acentos, maiúsculas, "e outros",
   "da/de/do" e "- CPF: ..." escrito no nome). Ficha separada de propósito só com o
   MOTIVO escrito, que fica na ficha e no Registro de atividades (bloco 159).
   Uso: SagaFichas.procurar(sb,{nome,cpf}) → [{id,nome_completo,cpf,processos:[{id,numero,parte}],motivo}]
        SagaFichas.decidir(sb,{nome,cpf,usar:'Usar esta ficha'}) → {acao:'usar',pessoa} | {acao:'nova',motivo,parecidas} | {acao:'cancelar'}
        SagaFichas.registrar(sb,pessoaId,motivo,parecidas) → grava o motivo da ficha separada
        SagaFichas.descrever(p) → "Fulana · CPF ...12 · 2 processos"
        SagaFichas.mesmoNome(a,b) → true/false
   ===================================================================================== */
(function(global){
  'use strict';
  var LIGA={da:1,de:1,do:1,das:1,dos:1,e:1};
  function normalizar(n){
    return String(n||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
      .replace(/-?\s*cpf\s*:?\s*[\d.\-\s]+$/,'')     // "- CPF: 000.000.000-00" no fim do nome
      .replace(/\s+e\s+outr[oa]s?\s*$/,'')            // "e outros"
      .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function palavras(n){return normalizar(n).split(' ').filter(function(w){return w&&!LIGA[w];});}
  function digitos(v){return String(v||'').replace(/\D/g,'');}
  function mesmoNome(a,b){var x=normalizar(a),y=normalizar(b);return !!x&&x===y;}
  // Nome parecido: mesmo primeiro nome e todas as palavras do nome menor estão no maior (ex.: "Maria Silva" e "Maria da Silva Santos")
  function parecido(a,b){
    var x=palavras(a),y=palavras(b);if(x.length<2||y.length<2||x[0]!==y[0])return false;
    var menor=x.length<=y.length?x:y,maior=x.length<=y.length?y:x;
    return menor.every(function(w){return maior.indexOf(w)>=0;});
  }
  function esc(t){var d=document.createElement('div');d.textContent=t==null?'':String(t);return d.innerHTML;}
  async function procurar(sb,o){
    o=o||{};var achados={},nome=normalizar(o.nome),cpf=digitos(o.cpf);
    var campos='id,nome_completo,cpf';
    try{
      if(cpf.length===11){
        // o CPF pode estar gravado só com números ou com pontos e traço
        var r1=await sb.from('pessoas').select(campos).in('cpf',[cpf,cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4')]).limit(5);
        (r1.data||[]).forEach(function(p){achados[p.id]=Object.assign({motivo:'mesmo CPF'},p);});
      }
      if(nome.length>=5){
        var ps=palavras(o.nome);
        var chave=ps.slice().sort(function(a,b){return b.length-a.length;})[0]||nome;
        var r2=await sb.from('pessoas').select(campos).ilike('nome_completo','%'+chave+'%').limit(80);
        (r2.data||[]).forEach(function(p){
          if(achados[p.id])return;
          if(normalizar(p.nome_completo)===nome)achados[p.id]=Object.assign({motivo:'mesmo nome'},p);
          else if(parecido(p.nome_completo,o.nome))achados[p.id]=Object.assign({motivo:'nome parecido'},p);
        });
      }
    }catch(e){return [];}
    var ordem={'mesmo CPF':0,'mesmo nome':1,'nome parecido':2};
    var lista=Object.keys(achados).map(function(k){return achados[k];})
      .filter(function(p){return !o.ignorarId||p.id!==o.ignorarId;})
      .sort(function(a,b){return ordem[a.motivo]-ordem[b.motivo];}).slice(0,8);
    if(!lista.length)return [];
    var ids=lista.map(function(p){return p.id;});
    lista.forEach(function(p){p.processos=[];});
    try{
      // processos em nome da pessoa e processos em que ela é parte junto com outras (herdeiros, coautores)
      var rp=await sb.from('processos').select('id,pessoa_id,numero_processo_cnj,excluido_logico').in('pessoa_id',ids);
      (rp.data||[]).forEach(function(x){if(x.excluido_logico)return;var p=lista.find(function(l){return l.id===x.pessoa_id;});if(p)p.processos.push({id:x.id,numero:x.numero_processo_cnj||'(sem número)',parte:false});});
      var rq=await sb.from('processos_partes').select('pessoa_id,processo:processos(id,numero_processo_cnj,excluido_logico)').in('pessoa_id',ids).eq('ativo',true);
      (rq.data||[]).forEach(function(x){var pr=x.processo;if(!pr||pr.excluido_logico)return;var p=lista.find(function(l){return l.id===x.pessoa_id;});if(p&&!p.processos.some(function(z){return z.id===pr.id;}))p.processos.push({id:pr.id,numero:pr.numero_processo_cnj||'(sem número)',parte:true});});
    }catch(e){}
    return lista;
  }
  function descrever(p){
    var n=(p.processos||[]).length,c=digitos(p.cpf);
    return p.nome_completo+(c?' · CPF ...'+c.slice(-2):'')+' · '+(n?n+' processo'+(n>1?'s':''):'sem processo')+(p.motivo?' ('+p.motivo+')':'');
  }
  function fmtNumero(n){var d=digitos(n);return d.length===20?d.replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/,'$1-$2.$3.$4.$5.$6'):n;}

  // Janela "Essa pessoa já tem ficha?" no padrão do SAGA (aparece e some de uma vez: o movimento é o do saga_guard)
  function janela(lista,o){
    return new Promise(function(ok){
      var antigo=document.getElementById('sagaFichaRepetida');if(antigo)antigo.remove();
      var temCpf=lista.some(function(p){return p.motivo==='mesmo CPF';});
      var d=document.createElement('div');d.id='sagaFichaRepetida';
      d.style.cssText='position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,14,.55);backdrop-filter:blur(4px)';
      var bt='height:34px;padding:0 14px;border-radius:10px;font:inherit;font-size:12px;cursor:pointer;';
      var principal=bt+'border:1px solid var(--gold,#2f6cd6);background:color-mix(in srgb,var(--gold,#2f6cd6) 18%,transparent);color:var(--text,#e8edf5);font-weight:600;';
      var secundario=bt+'border:1px solid var(--border,rgba(255,255,255,.16));background:transparent;color:var(--text,#e8edf5);';
      var itens=lista.map(function(p,i){
        var c=digitos(p.cpf),procs=p.processos||[];
        return '<div style="border:1px solid var(--border,rgba(255,255,255,.12));border-radius:12px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start">'+
          '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">'+esc(p.nome_completo)+'</div>'+
          '<div style="font-size:11px;color:var(--muted,#a3afc2);margin-top:2px">'+(c?'CPF ...'+esc(c.slice(-4))+' · ':'')+'<b style="color:'+(p.motivo==='mesmo CPF'?'var(--danger,#e5484d)':'var(--gold,#7fa6e6)')+'">'+esc(p.motivo)+'</b> · '+(procs.length?procs.length+' processo'+(procs.length>1?'s':''):'sem processo')+'</div>'+
          (procs.length?'<div style="font-size:11px;color:var(--muted,#a3afc2);margin-top:4px;line-height:1.5">'+procs.slice(0,4).map(function(x){return esc(fmtNumero(x.numero))+(x.parte?' <i>(parte, junto com outras pessoas)</i>':'');}).join('<br>')+(procs.length>4?'<br>+'+(procs.length-4)+' outros':'')+'</div>':'')+
          '</div><button type="button" data-usar="'+i+'" style="'+principal+'white-space:nowrap">'+esc(o.usar||'Usar esta ficha')+'</button></div>';
      }).join('');
      d.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="sfrTitulo" style="width:100%;max-width:560px;max-height:calc(100vh - 32px);overflow:auto;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:16px;background:var(--panel-solid,#1c2638);color:var(--text,#e8edf5);box-shadow:0 24px 50px rgba(0,0,0,.45);padding:20px 22px">'+
        '<div id="sfrTitulo" style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:700;margin-bottom:6px">Essa pessoa já tem ficha?</div>'+
        '<div style="font-size:12.5px;line-height:1.55;color:var(--muted,#a3afc2);margin-bottom:12px">Encontramos no SAGA'+(o.nome?' para <b style="color:var(--text,#e8edf5)">'+esc(o.nome)+'</b>':'')+'. Use a ficha que já existe: o processo novo vira mais um cartão nela.</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px">'+itens+'</div>'+
        (temCpf?'<div style="font-size:11.5px;color:var(--danger,#e5484d);margin-top:12px">Já existe uma ficha com este CPF: não dá para criar outra.</div>':
        '<div style="margin-top:14px;border-top:1px solid var(--border,rgba(255,255,255,.1));padding-top:12px">'+
          '<button type="button" id="sfrOutra" style="background:none;border:0;padding:0;color:var(--gold,#7fa6e6);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline">É outra pessoa (ou precisa ficar separado): criar ficha separada</button>'+
          '<div id="sfrMotivoBox" hidden style="margin-top:10px"><label for="sfrMotivo" style="font-size:11.5px;color:var(--muted,#a3afc2)">Por que precisa de outra ficha? Fica escrito na ficha e no Registro de atividades.</label>'+
          '<textarea id="sfrMotivo" rows="3" placeholder="Ex.: é a irmã da cliente, com o mesmo nome; o processo dos irmãos fica separado..." style="width:100%;margin-top:6px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,.16));background:var(--panel-2,transparent);color:var(--text,#e8edf5);font:inherit;font-size:12.5px;padding:8px 10px;resize:vertical;box-sizing:border-box"></textarea>'+
          '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button type="button" id="sfrCriar" disabled style="'+secundario+'opacity:.55">Criar ficha separada</button></div></div></div>')+
        '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button type="button" data-cancelar style="'+secundario+'">Cancelar</button></div></div>';
      document.body.appendChild(d);
      function fim(v){document.removeEventListener('keydown',tecla,true);d.remove();ok(v);}
      function tecla(e){if(e.key==='Escape'){e.preventDefault();fim({acao:'cancelar'});}}
      document.addEventListener('keydown',tecla,true);
      d.addEventListener('click',function(e){
        var u=e.target.closest('[data-usar]');if(u){fim({acao:'usar',pessoa:lista[+u.dataset.usar]});return;}
        if(e.target.closest('[data-cancelar]')||e.target===d)fim({acao:'cancelar'});
      });
      var outra=d.querySelector('#sfrOutra');
      if(outra){
        var box=d.querySelector('#sfrMotivoBox'),txt=d.querySelector('#sfrMotivo'),criar=d.querySelector('#sfrCriar');
        outra.onclick=function(){var abrir=box.hidden;if(global.sagaRecolher)global.sagaRecolher(box,!abrir);else box.hidden=!abrir;if(abrir)txt.focus();};
        txt.addEventListener('input',function(){var okm=txt.value.trim().length>=10;criar.disabled=!okm;criar.style.opacity=okm?'1':'.55';});
        criar.onclick=function(){var m=txt.value.trim();if(m.length<10)return;fim({acao:'nova',motivo:m,parecidas:lista.map(function(p){return p.id;})});};
      }
      var primeiro=d.querySelector('[data-usar]');if(primeiro)primeiro.focus();
    });
  }
  // Procura e, se houver ficha parecida, pergunta. Sem nada parecido: {acao:'nova'} sem motivo (ficha comum).
  async function decidir(sb,o){
    o=o||{};
    var lista=await procurar(sb,o);
    if(!lista.length)return {acao:'nova',motivo:null,parecidas:[]};
    return janela(lista,o);
  }
  async function registrar(sb,pessoaId,motivo,parecidas){
    if(!pessoaId||!motivo)return true;
    var r=await sb.rpc('pessoa_ficha_separada',{p_pessoa:pessoaId,p_motivo:motivo,p_parecidas:parecidas&&parecidas.length?parecidas:null});
    return !r.error;
  }
  global.SagaFichas={procurar:procurar,decidir:decidir,registrar:registrar,descrever:descrever,mesmoNome:mesmoNome,parecido:parecido,normalizar:normalizar};
})(window);
