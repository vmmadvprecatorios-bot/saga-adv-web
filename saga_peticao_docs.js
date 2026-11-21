/* SAGA · Petição que lê os documentos do cliente (21/11/2026, Dr. Victor; bloco 322)
   Na hora de fazer a petição: soltar documentos (RG, CNH, comprovante de residência, requisitório, espelho, contracheque)
   ou ler os que já estão na pasta do cliente, e o SAGA acha os dados que faltam, mostrando DE ONDE VEIO cada um
   (arquivo, página, trecho) para a pessoa conferir antes de usar. Lê o texto do PDF e, quando escaneado, a imagem
   (SagaLeitorDocs, tudo no navegador; a leitura de documento da pasta fica guardada em documentos_leituras).
   Só preenche campo VAZIO ou o que está marcado como faltando (⟦[...]⟧); campo já preenchido vem desmarcado.
   Uso: SagaPeticaoDocs.montar(elemento, { sb, processoId, pessoaId, campos:[chaves], valores:{chave:valor},
          aplicar: function(novos, origens){...} })    novos = {chave: valor}, origens = {chave: 'arquivo · pág. N'}
        SagaPeticaoDocs.extrair(texto) → {dado: {valor, trecho}}  (sem tela; usado nos testes e pela Renata) */
(function(){
  'use strict';
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function semAcento(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function versao(){ var sc = document.querySelector('script[src*="saga_peticao_docs.js"]'); var m = sc && /[?&]v=([^&]+)/.exec(sc.src); return m ? m[1] : ''; }
  function leitor(){
    if(window.SagaLeitorDocs) return Promise.resolve(window.SagaLeitorDocs);
    return new Promise(function(ok, falha){ var s = document.createElement('script'); s.src = 'saga_leitor_docs.js' + (versao() ? '?v=' + versao() : ''); s.onload = function(){ window.SagaLeitorDocs ? ok(window.SagaLeitorDocs) : falha(new Error('o leitor de documentos não carregou')); }; s.onerror = function(){ falha(new Error('não consegui carregar o leitor de documentos')); }; document.head.appendChild(s); });
  }

  /* ---------------- o que se acha em cada documento ---------------- */
  var ROT = {
    cpf: 'CPF', rg: 'RG (número)', orgao_emissor: 'Órgão emissor do RG', data_nascimento: 'Data de nascimento', nome_mae: 'Nome da mãe',
    nome_pai: 'Nome do pai', filiacao: 'Filiação (escolha qual é a mãe)', estado_civil: 'Estado civil', profissao: 'Profissão', nacionalidade: 'Nacionalidade', endereco: 'Endereço',
    cep: 'CEP', cidade_uf: 'Cidade/UF do endereço', requisitorio: 'Requisitório (PRC/RPV)', data_base: 'Data-base do requisitório',
    numero_processo_execucao: 'Processo de execução', matricula: 'Matrícula', orgao: 'Órgão (contracheque)', cargo: 'Cargo'
  };
  var NOME = "([A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'.]*(?:[ ]+(?!CPF\\b|RG\\b|DATA\\b|NATURALIDADE\\b|DOC\\b|E\\b)[A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'.]*){1,8})";
  function extrair(texto){
    var orig = String(texto || '').replace(/[ \t ]+/g, ' '), t = semAcento(orig), out = {};
    function guarda(k, v, trecho){ if(v == null || String(v).trim() === '') return; v = String(v).trim(); var a = out[k]; if(!a){ out[k] = { valor: v, outros: [], trecho: String(trecho || '').replace(/\s+/g, ' ').trim().slice(0, 140) }; return; } if(a.valor !== v && a.outros.indexOf(v) < 0) a.outros.push(v); }
    function noOrig(re){ return re.exec(orig); }
    var m;
    /* CPF (o 1º perto de "CPF"; os outros ficam como "achei também") */
    var rc = /\bcpf\b[^\d]{0,20}(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/g;
    while((m = rc.exec(t))) guarda('cpf', m[1] + '.' + m[2] + '.' + m[3] + '-' + m[4], m[0]);
    /* RG e órgão emissor */
    var rr = /\b(?:rg|registro geral|carteira de identidade|identidade|doc(?:umento)? de identidade)\b(?:\s*n[ºo°.]*)?\s*[:\-]?\s*([\d][\d.\-]{3,14}[\dx])/g;
    while((m = rr.exec(t))){ guarda('rg', m[1].toUpperCase(), m[0]); var dep = t.slice(m.index + m[0].length, m.index + m[0].length + 30), mo = /\b(ssp|sds|sesp|sesdec|pc|ii|detran|sejusp|ssp\s*ds)\s*[\/\-]?\s*([a-z]{2})\b/.exec(dep); if(mo) guarda('orgao_emissor', mo[1].toUpperCase().replace(/\s+/g, '') + '/' + mo[2].toUpperCase(), m[0] + dep.slice(0, mo.index + mo[0].length)); }
    if(!out.orgao_emissor && (m = /\b(?:orgao (?:emissor|expedidor))\s*[:\-]?\s*([a-z]{2,6})\s*[\/\-]?\s*([a-z]{2})\b/.exec(t))) guarda('orgao_emissor', m[1].toUpperCase() + '/' + m[2].toUpperCase(), m[0]);
    /* nascimento */
    if((m = /\b(?:data de nascimento|nascimento|nascido em|nasc\.?|dt\.? nasc\.?)\s*[:\-]?\s*(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/.exec(t))) guarda('data_nascimento', m[1] + '/' + m[2] + '/' + m[3], m[0]);
    /* filiação (mãe e pai) */
    var rm = new RegExp('(?:M[ÃA]E|NOME DA M[ÃA]E)\\s*[:\\-]?\\s*' + NOME, 'i');
    if((m = noOrig(rm))) guarda('nome_mae', m[1].toUpperCase(), m[0]);
    var rp = new RegExp('(?:\\bPAI|NOME DO PAI)\\s*[:\\-]?\\s*' + NOME, 'i');
    if((m = noOrig(rp))) guarda('nome_pai', m[1].toUpperCase(), m[0]);
    /* RG com "FILIAÇÃO" e dois nomes sem rótulo (a ordem muda de estado para estado): os dois vêm para a pessoa escolher */
    if(!out.nome_mae && (m = noOrig(new RegExp('FILIA[ÇC][ÃA]O[ ]*[:\\-]?[ ]*' + NOME + '(?:[ \\t]*\\n\\s*(?:E[ ]+)?|[ ]+E[ ]+)' + NOME, 'i')))){ guarda('filiacao', m[1].toUpperCase(), m[0]); guarda('filiacao', m[2].toUpperCase(), m[0]); }
    if(!out.nome_mae && !out.filiacao && (m = noOrig(new RegExp('FILIA[ÇC][ÃA]O[ ]*[:\\-]?[ ]*' + NOME, 'i')))) guarda('filiacao', m[1].toUpperCase(), m[0]);
    /* estado civil, nacionalidade, profissão */
    if((m = /\b(solteir[oa]|casad[oa]|divorciad[oa]|viuv[oa]|separad[oa](?: judicialmente)?|em uniao estavel|convivente)\b/.exec(t))) guarda('estado_civil', m[1].replace('viuv', 'viúv').replace('uniao estavel', 'união estável'), t.slice(Math.max(0, m.index - 25), m.index + m[0].length + 5));
    if((m = /\b(brasileir[oa]|naturalizad[oa])\b/.exec(t))) guarda('nacionalidade', m[1], m[0]);
    if((m = /\b(?:profissao|ocupacao)\s*[:\-]?\s*([a-z][a-z \/]{2,40}?)(?:\s{2,}|[,;\n]|$)/.exec(t))) guarda('profissao', m[1].trim(), m[0]);
    /* contracheque: órgão, cargo, matrícula */
    if((m = /\bmatricula(?: siape)?\s*[:\-]?\s*(\d[\d.\-\/]{3,15})/.exec(t))) guarda('matricula', m[1], m[0]);
    if((m = noOrig(/\bcargo\s*[:\-]?\s*([^\n]{3,60})/i))) guarda('cargo', m[1].trim(), m[0]);
    if((m = noOrig(/(?:^|[\s(])[ÓOóo]rg[ãaÃA]o(?: de origem| pagador)?[ ]*[:\-][ ]*([^\n]{3,80})/i))) guarda('orgao', m[1].trim(), m[0]);
    /* endereço, CEP e cidade/UF */
    var rcep = /\bcep\s*[:\-]?\s*(\d{2})\.?(\d{3})-?(\d{3})\b/g;
    while((m = rcep.exec(t))) guarda('cep', m[1] + m[2] + '-' + m[3], m[0]);
    var linhas = orig.split(/\n/);
    for(var i = 0; i < linhas.length; i++){
      var ln = linhas[i].trim(), lns = semAcento(ln);
      var mm = /^(?:endereco\s*[:\-]?\s*)?((?:rua|r\.|avenida|av\.?|travessa|tv\.|alameda|rodovia|conjunto|cj\.|quadra|qd\.|loteamento|estrada|praca|vila|condominio|residencial)\b.*)$/.exec(lns);
      if(mm && ln.length < 160){ var ini = ln.length - mm[1].length; var endTxt = ln.slice(ini).replace(/\s*\bcep\b.*$/i, '').replace(/[,;\s]+$/, ''); if(/\d/.test(endTxt) || /\bs\/?n\b/i.test(endTxt)) guarda('endereco', endTxt, ln); }
    }
    var rcid = /(?:^|[^A-Za-zÀ-ÿ])([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç'.]+(?:[ ]+(?:de |do |da |dos |das |D[AEO]S? )?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç'.]+){0,4})[ ]*[\/\-][ ]*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/g;
    while((m = rcid.exec(orig))){ var cid = m[1].replace(/^(NATURALIDADE|BAIRRO|CENTRO)\s+/i, ''); if(!/^(CPF|RG|SSP|SDS|DETRAN|NATURALIDADE)$/i.test(cid) && !/naturalidade|naturalde/i.test(orig.slice(Math.max(0, m.index - 14), m.index + 2) + m[0])) guarda('cidade_uf', cid + '/' + m[2], m[0]); }
    /* requisitório */
    var rq = /\b(prc|rpv)\s*-?\s*(\d{5,})\s*-?\s*([a-z]{2})\b/g;
    while((m = rq.exec(t))) guarda('requisitorio', m[1].toUpperCase() + m[2] + '-' + m[3].toUpperCase(), m[0]);
    if((m = /data[\s-]*base(?: de calculo)?\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/.exec(t))) guarda('data_base', m[1], m[0]);
    var rj = /(execu\w*|origin\w*)[^\d]{0,40}(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})/g;
    while((m = rj.exec(t))) guarda('numero_processo_execucao', m[2] + '-' + m[3] + '.' + m[4] + '.' + m[5] + '.' + m[6] + '.' + m[7], m[0]);
    return out;
  }
  function tipoDoc(nome, texto){
    var n = semAcento(nome + ' ' + String(texto || '').slice(0, 600));
    if(/\bcnh\b|habilitacao/.test(n)) return 'cnh';
    if(/\brg\b|identidade|registro geral/.test(n)) return 'rg';
    if(/comprovante|resid|endereco|conta de (luz|agua|energia)|fatura/.test(n)) return 'comprovante';
    if(/requisit|espelho|precat|\brpv\b|prc\d/.test(n)) return 'requisitorio';
    if(/contracheque|holerite|demonstrativo de pagamento|ficha financeira/.test(n)) return 'contracheque';
    if(/procura/.test(n)) return 'procuracao';
    return 'outro';
  }
  /* comprovante de residência: o endereço que vale é o dele; RG/CNH: dados pessoais; requisitório: dados do crédito */
  var PESO = { endereco: ['comprovante'], cep: ['comprovante'], cidade_uf: ['comprovante'], rg: ['rg', 'cnh'], orgao_emissor: ['rg', 'cnh'], data_nascimento: ['rg', 'cnh'], nome_mae: ['rg', 'cnh'], nome_pai: ['rg', 'cnh'], requisitorio: ['requisitorio'], data_base: ['requisitorio'] };

  /* dado lido → campos da petição (só os que o modelo tem) e as marcas ⟦[...]⟧ da qualificação */
  var CAMPO = { cpf: ['cpf'], rg: ['rg'], orgao_emissor: ['orgao_emissor', 'rg_orgao'], data_nascimento: ['data_nascimento'], nome_mae: ['nome_mae'], nome_pai: ['nome_pai'], filiacao: ['nome_mae'],
    estado_civil: ['estado_civil'], profissao: ['profissao'], nacionalidade: ['nacionalidade'], endereco: ['endereco'], cep: ['cep'], cidade_uf: ['cidade_uf', 'municipio_uf'],
    requisitorio: ['requisitorio', 'prc'], data_base: ['data_base'], numero_processo_execucao: ['processo_origem', 'processo_execucao'], matricula: ['matricula'], orgao: ['orgao'], cargo: ['cargo'] };
  var MARCA = { estado_civil: 'estado civil', profissao: 'profissão', cpf: 'CPF' };
  function enderecoCompleto(d){ var e = d.endereco && d.endereco.valor; if(!e) return ''; return e + (d.cidade_uf ? ', ' + d.cidade_uf.valor : '') + (d.cep ? ', CEP ' + d.cep.valor : ''); }

  /* ---------------- tela ---------------- */
  function css(){
    if(document.getElementById('sagaPeticaoDocsCss')) return;
    var s = document.createElement('style'); s.id = 'sagaPeticaoDocsCss';
    s.textContent = '.pd-caixa{border:1px dashed var(--border);border-radius:12px;padding:10px 12px;margin:6px 0 10px;transition:border-color .25s cubic-bezier(.22,.78,.25,1),background .25s cubic-bezier(.22,.78,.25,1)}'
      + '.pd-caixa.arrastando{border-color:var(--gold);background:color-mix(in srgb,var(--gold) 8%,transparent)}'
      + '.pd-caixa .pd-topo{font-size:12.5px}.pd-caixa .pd-topo span{color:var(--muted)}'
      + '.pd-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}'
      + '.pd-acoes button,.pd-acoes label{font:inherit;font-size:12px;padding:7px 12px;border-radius:10px;border:1px solid var(--sb-sec-borda,var(--border));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer}'
      + '.pd-res{margin-top:8px;font-size:12px}.pd-res table{width:100%;border-collapse:collapse}.pd-res td{padding:5px 4px;border-bottom:1px solid var(--border-soft,var(--border));vertical-align:top}'
      + '.pd-res small{color:var(--muted)}.pd-amar{color:#b45309}.pd-erro{color:var(--danger,#e5484d);font-size:12px;margin-top:6px}.pd-ok{color:var(--gold);font-size:12px;margin-top:6px}'
      + '.pd-aviso{font-size:12px;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,#eab308 55%,transparent);background:color-mix(in srgb,#eab308 9%,transparent);margin-top:6px}'
      + '.pd-botoes{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}.pd-botoes button{font:inherit;font-size:12px;padding:7px 14px;border-radius:10px;border:1px solid var(--sb-sec-borda,var(--border));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer}.pd-botoes button.pri{background:var(--sb-acao);border-color:var(--sb-acao-borda)}';
    document.head.appendChild(s);
  }
  var RX_PASTA = /rg|cnh|identidade|document|pessoa|comprovante|resid|endere|requisit|espelho|precat|rpv|prc|contracheque|holerite|ficha financeira|procura/i;
  function montar(el, o){
    if(!el) return; css(); o = o || {};
    el.innerHTML = '<div class="pd-caixa"><div class="pd-topo"><b>Ler documentos para preencher</b> <span>Solte RG, CNH, comprovante de residência, requisitório ou contracheque (PDF, foto ou print), ou leia os da pasta do cliente. O SAGA mostra de onde veio cada dado para você conferir. Tudo é lido neste computador.</span></div>'
      + '<div class="pd-acoes"><label>Escolher arquivos<input type="file" multiple hidden accept="application/pdf,.pdf,image/*,.txt"></label>' + (o.processoId ? '<button type="button" data-pd-pasta>Ler da pasta do cliente</button>' : '') + '</div><div class="pd-res"></div></div>';
    var cx = el.querySelector('.pd-caixa'), res = el.querySelector('.pd-res'), inp = el.querySelector('input[type=file]');
    inp.onchange = function(){ ler(Array.prototype.slice.call(inp.files || []).map(function(f){ return { arquivo: f }; })); inp.value = ''; };
    cx.addEventListener('dragover', function(e){ e.preventDefault(); cx.classList.add('arrastando'); });
    cx.addEventListener('dragleave', function(){ cx.classList.remove('arrastando'); });
    cx.addEventListener('drop', function(e){ e.preventDefault(); cx.classList.remove('arrastando'); ler(Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []).map(function(f){ return { arquivo: f }; })); });
    var bp = el.querySelector('[data-pd-pasta]');
    if(bp) bp.onclick = async function(){
      res.innerHTML = '<div class="pd-ok" style="color:var(--muted)">Procurando na pasta do cliente…</div>';
      try{
        var q = o.sb.from('documentos').select('id,nome_arquivo,caminho_storage,criado_em,processo_id,pessoa_id,pessoal').or('excluido_logico.is.null,excluido_logico.eq.false').order('criado_em', { ascending: false }).limit(300);
        q = o.pessoaId ? q.or('processo_id.eq.' + o.processoId + ',and(pessoal.eq.true,pessoa_id.eq.' + o.pessoaId + ')') : q.eq('processo_id', o.processoId);
        var r = await q; if(r.error) throw r.error;
        var docs = (r.data || []).filter(function(d){ return /\.(pdf|png|jpe?g|webp)$/i.test(d.nome_arquivo || ''); });
        var alvo = docs.filter(function(d){ return d.pessoal || RX_PASTA.test(d.nome_arquivo || ''); }).slice(0, 12);
        if(!alvo.length){ res.innerHTML = '<div class="pd-aviso"><b>Não achei documentos pessoais nem do crédito na pasta.</b> Procurei por RG, CNH, comprovante, requisitório, espelho, contracheque ou documento marcado como pessoal (' + docs.length + ' PDF/imagem na pasta). Solte o arquivo aqui.</div>'; return; }
        ler(alvo.map(function(d){ return { doc: d }; }));
      }catch(e){ res.innerHTML = '<div class="pd-erro"><b>Não consegui ler a pasta do cliente:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>'; }
    };
    async function ler(itens){
      if(!itens.length) return;
      var L; try{ L = await leitor(); }catch(e){ res.innerHTML = '<div class="pd-erro">' + esc(e.message) + '</div>'; return; }
      var achados = {}, erros = [], imagens = [], guardadas = 0, semTexto = [];
      for(var i = 0; i < itens.length; i++){
        var it = itens[i], nome = it.doc ? it.doc.nome_arquivo : it.arquivo.name;
        res.innerHTML = '<div class="pd-ok" style="color:var(--muted)">Lendo "' + esc(nome) + '" (' + (i + 1) + ' de ' + itens.length + ')…</div>';
        try{
          var prog = function(m){ var p = res.querySelector('.pd-ok'); if(p) p.textContent = 'Lendo "' + nome + '" (' + (i + 1) + ' de ' + itens.length + '): ' + m; };
          var x = it.doc ? await L.lerDocumento(o.sb, it.doc, { progresso: prog, tipo: null }) : await L.lerArquivo(it.arquivo, { progresso: prog });
          if(x.guardada) guardadas++; if(x.paginas_imagem) imagens.push(nome);
          if(x.texto.replace(/\s/g, '').length < 20){ semTexto.push(nome); continue; }
          var tipo = tipoDoc(nome, x.texto);
          x.paginas.forEach(function(p){
            var a = extrair(p.texto);
            Object.keys(a).forEach(function(k){
              var orgem = { arquivo: nome, pagina: p.n, imagem: !!p.imagem, tipo: tipo, trecho: a[k].trecho };
              var preferido = PESO[k] ? PESO[k].indexOf(tipo) >= 0 : true;
              var cur = achados[k];
              if(!cur || (preferido && !cur.preferido)){ var antes = cur; achados[k] = { valor: a[k].valor, outros: (antes ? [antes.valor].concat(antes.outros) : []).concat(a[k].outros).filter(function(v){ return v !== a[k].valor; }), origem: orgem, preferido: preferido }; }
              else [a[k].valor].concat(a[k].outros).forEach(function(v){ if(v !== cur.valor && cur.outros.indexOf(v) < 0) cur.outros.push(v); });
            });
          });
        }catch(e){ erros.push(nome + ' (' + ((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + ')'); }
      }
      mostrar(achados, { erros: erros, imagens: imagens, guardadas: guardadas, semTexto: semTexto, n: itens.length });
    }
    /* combinado com a conversa da Renata (saga_peticoes.js, 21/11): campos = [{chave, rotulo}], valoresAgora() = valores na hora,
       aplicar(novos) preenche só campo vazio ou com lacuna; novos[chave] = {valor, origem}; novos.lacunas = {'rótulo': valor} troca ⟦[rótulo]⟧ em qualquer campo */
    function chaves(){ return (o.campos || []).map(function(c){ return typeof c === 'string' ? c : c.chave; }); }
    function atuais(){ try{ return (typeof o.valoresAgora === 'function' ? o.valoresAgora() : o.valores) || {}; }catch(e){ return o.valores || {}; } }
    function vazio(ch){ var v = atuais()[ch]; return v == null || String(v).trim() === '' || /^\s*(⟦\[[^\]]*\]⟧\s*)+$/.test(String(v)); }
    function lacunasAbertas(){ var t = Object.keys(atuais()).map(function(k){ return String(atuais()[k] || ''); }).join('\n'), out = {}; var re = /⟦\[([^\]]+)\]⟧/g, m; while((m = re.exec(t))) out[m[1]] = true; return out; }
    function mostrar(achados, info){
      var campos = chaves(), linhas = [], abertas = lacunasAbertas();
      var endc = enderecoCompleto(achados);
      Object.keys(achados).forEach(function(k){
        var alvos = (CAMPO[k] || []).filter(function(c){ return campos.indexOf(c) >= 0; });
        var lac = [];
        Object.keys(MARCA).forEach(function(mk){ if(mk === k && abertas[MARCA[mk]]) lac.push(MARCA[mk]); });
        if(k === 'endereco' && endc && abertas['endereço completo com CEP']) lac.push('endereço completo com CEP');
        linhas.push({ k: k, a: achados[k], alvos: alvos, lac: lac });
      });
      var extra = (info.imagens.length ? ' Lido da imagem (escaneado/foto): ' + info.imagens.join(', ') + '; confira cada número.' : '') + (info.guardadas ? ' ' + info.guardadas + ' já tinha(m) sido lido(s) antes.' : '')
        + (info.semTexto.length ? ' Sem texto legível: ' + info.semTexto.join(', ') + '.' : '') + (info.erros.length ? ' Não abriu: ' + info.erros.join('; ') + '.' : '');
      if(!linhas.length){ res.innerHTML = '<div class="pd-aviso"><b>Não achei dados nos ' + info.n + ' documento(s).</b>' + esc(extra) + '</div>'; return; }
      var h = '<div class="pd-aviso" style="margin-top:0"><b>Lido de ' + info.n + ' documento(s): confira cada dado</b> antes de usar. Marcado = vai para a petição (só campo vazio ou lacuna ⟦[...]⟧; campo com dado não é trocado).' + esc(extra) + '</div><table><tbody>';
      var idx = 0;
      linhas.forEach(function(x){
        var o2 = x.a.origem, pode = x.alvos.filter(vazio), usa = pode.length > 0 || x.lac.length > 0;
        var destino = [];
        if(pode.length) destino.push('vai para o campo ' + pode.join(', '));
        if(x.lac.length) destino.push('completa a lacuna “' + x.lac.join('”, “') + '”' + (x.k === 'endereco' ? ' (com cidade/UF e CEP)' : ''));
        if(!destino.length) destino.push(x.alvos.length ? 'campo já preenchido: ' + x.alvos.join(', ') : 'nenhum campo ou lacuna deste modelo usa isso');
        h += '<tr><td><label style="display:flex;gap:6px;align-items:flex-start"><input type="checkbox" data-pd="' + idx + '"' + (usa ? ' checked' : ' disabled') + '> <span><b>' + esc(ROT[x.k] || x.k) + '</b><br><small>' + esc(destino.join('; ')) + '</small></span></label></td>'
          + '<td>' + (x.k === 'filiacao' && x.a.outros.length ? '<select data-pd-escolha="' + idx + '">' + [x.a.valor].concat(x.a.outros).map(function(v){ return '<option>' + esc(v) + '</option>'; }).join('') + '</select><br><small>Escolha qual nome é o da mãe.</small>' : esc(x.a.valor)) + (x.k !== 'filiacao' && x.a.outros.length ? '<br><small class="pd-amar">Achei também: ' + x.a.outros.slice(0, 4).map(esc).join(', ') + '</small>' : '') + '</td>'
          + '<td><small><b>' + esc(o2.arquivo) + ' · pág. ' + o2.pagina + '</b>' + (o2.imagem ? ' <span class="pd-amar">(lido da imagem)</span>' : '') + '<br>“' + esc(o2.trecho) + '”</small></td></tr>';
        x.idx = idx++;
      });
      h += '</tbody></table><div class="pd-botoes"><button type="button" data-pd-desc>Descartar</button><button type="button" class="pri" data-pd-usar>Usar os marcados</button></div>';
      res.innerHTML = h;
      res.querySelector('[data-pd-desc]').onclick = function(){ res.innerHTML = ''; };
      res.querySelector('[data-pd-usar]').onclick = function(){
        var novos = {}, lacunas = {}, pedidos = 0;
        linhas.forEach(function(x){
          var cb = res.querySelector('[data-pd="' + x.idx + '"]'); if(!cb || !cb.checked) return;
          var org = x.a.origem.arquivo + ' · pág. ' + x.a.origem.pagina + (x.a.origem.imagem ? ' (lido da imagem)' : '');
          var sel = res.querySelector('[data-pd-escolha="' + x.idx + '"]'), valor = sel ? sel.value : x.a.valor;
          x.alvos.filter(vazio).forEach(function(c){ novos[c] = { valor: valor, origem: org }; pedidos++; });
          x.lac.forEach(function(l){ lacunas[l] = l === 'endereço completo com CEP' ? endc : valor; pedidos++; });
        });
        if(Object.keys(lacunas).length) novos.lacunas = lacunas;
        if(!pedidos){ res.innerHTML = '<div class="pd-aviso">Nada marcado para usar.</div>'; return; }
        var mudou;
        try{ mudou = typeof o.aplicar === 'function' ? o.aplicar(novos) : 0; }
        catch(e){ res.innerHTML = '<div class="pd-erro">Não consegui pôr os dados na petição: ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>'; return; }
        res.innerHTML = '<div class="pd-ok">' + (typeof mudou === 'number' ? mudou : pedidos) + ' campo(s) preenchido(s) com os documentos (contorno amarelo; passe o mouse para ver de onde veio). Confira antes de gerar.</div>';
      };
    }
  }

  window.SagaPeticaoDocs = { montar: montar, extrair: extrair, tipoDoc: tipoDoc, CAMPO: CAMPO };
})();
