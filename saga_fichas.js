/* =====================================================================================
   SAGA · Fichas repetidas (08/11, pedido do Dr. Victor)
   Antes de criar um cliente, procura se a pessoa já tem ficha (mesmo CPF ou mesmo nome,
   sem diferenciar acentos, maiúsculas, "e outros" e "- CPF: ..." escrito no nome).
   Uso: SagaFichas.procurar(sb,{nome,cpf}) → [{id,nome_completo,cpf,processos:[{numero}],motivo}]
        SagaFichas.descrever(p) → "Fulana · CPF ...12 · 2 processos"
        SagaFichas.mesmoNome(a,b) → true/false
   ===================================================================================== */
(function(global){
  'use strict';
  function normalizar(n){
    return String(n||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
      .replace(/-?\s*cpf\s*:?\s*[\d.\-\s]+$/,'')     // "- CPF: 000.000.000-00" no fim do nome
      .replace(/\s+e\s+outr[oa]s?\s*$/,'')            // "e outros"
      .replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function digitos(v){return String(v||'').replace(/\D/g,'');}
  function mesmoNome(a,b){var x=normalizar(a),y=normalizar(b);return !!x&&x===y;}
  async function procurar(sb,o){
    o=o||{};var achados={},nome=normalizar(o.nome),cpf=digitos(o.cpf);
    var campos='id,nome_completo,cpf';
    try{
      if(cpf.length===11){
        var r1=await sb.from('pessoas').select(campos).eq('cpf',cpf).limit(5);
        (r1.data||[]).forEach(function(p){achados[p.id]=Object.assign({motivo:'mesmo CPF'},p);});
      }
      if(nome.length>=5){
        var palavras=nome.split(' ').filter(function(w){return w.length>2;});
        var chave=palavras.sort(function(a,b){return b.length-a.length;})[0]||nome;
        var r2=await sb.from('pessoas').select(campos).ilike('nome_completo','%'+chave+'%').limit(60);
        (r2.data||[]).forEach(function(p){if(normalizar(p.nome_completo)===nome&&!achados[p.id])achados[p.id]=Object.assign({motivo:'mesmo nome'},p);});
      }
    }catch(e){return [];}
    var lista=Object.keys(achados).map(function(k){return achados[k];}).filter(function(p){return !o.ignorarId||p.id!==o.ignorarId;});
    if(!lista.length)return [];
    try{
      var rp=await sb.from('processos').select('id,pessoa_id,numero_processo_cnj,excluido_logico').in('pessoa_id',lista.map(function(p){return p.id;}));
      lista.forEach(function(p){p.processos=(rp.data||[]).filter(function(x){return x.pessoa_id===p.id&&!x.excluido_logico;}).map(function(x){return {id:x.id,numero:x.numero_processo_cnj||'(sem número)'};});});
    }catch(e){lista.forEach(function(p){p.processos=[];});}
    return lista;
  }
  function descrever(p){
    var n=(p.processos||[]).length,c=digitos(p.cpf);
    return p.nome_completo+(c?' · CPF ...'+c.slice(-2):'')+' · '+(n?n+' processo'+(n>1?'s':''):'sem processo')+(p.motivo?' ('+p.motivo+')':'');
  }
  global.SagaFichas={procurar:procurar,descrever:descrever,mesmoNome:mesmoNome,normalizar:normalizar};
})(window);
