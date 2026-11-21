/* SAGA · Petições que se preenchem sozinhas (T194, 19/11/2026, Dr. Victor)
   - Na ficha, cada processo tem "Fazer petição": abre só os modelos da TESE daquele processo (e os modelos gerais,
     sem tese, como a "Petição simples"). Outra tese = outro processo (outro cartão).
   - Os dados vêm da ficha pelo banco (peticao_dados, SECURITY INVOKER: só o que a pessoa já pode ver).
   - O que faltar sai DESTACADO (amarelo no Word, laranja no PDF) e entre colchetes, para completar.
   - Timbrado: escolha livre entre VMM e Sarmento. O da ANCREF entra em petição SÓ quando o Dr. Victor pede (decisão de
     20/11, que trocou a de 19/11): fica no fim da lista, nunca vem escolhido, e pede confirmação antes de gerar.
   - Só quem tem a permissão peticoes.gerar (Jurídico, Estagiário, administrador ou quem ele liberar no Painel).
   - Guarda na pasta "Petições" do cliente (cria a pasta se não existir) e registra no Registro de atividades.
   Uso: SagaPeticoes.botaoHtml(processo) + SagaPeticoes.ligar(raiz, {sb, processoId, pessoaId, teseId, aoGuardar})
        SagaPeticoes.abrir({sb, processoId, pessoaId, teseId, aoGuardar}) */
window.SagaPeticoes = (function(){
  'use strict';
  var BUCKET = 'documentos-clientes';
  var TIMBRADOS_PROIBIDOS = ['ancref'];  // nunca vêm escolhidos por padrão; a ANCREF só com confirmação (20/11)
  var S = { pode: null, modelos: null, timbrados: null, ctx: null, modelo: null, valores: {}, origem: {} };

  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; }
  function sb(){ return (S.ctx && S.ctx.sb) || window._sb; }
  function toast(m, t){ if(typeof window.showToast === 'function') window.showToast(m, t || 'info'); }
  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }

  /* ---------------- permissão ---------------- */
  async function podeFazer(){
    if(S.pode !== null) return S.pode;
    try{ var r = await window._sb.rpc('peticao_pode'); S.pode = !r.error && r.data === true; }catch(e){ S.pode = false; }
    return S.pode;
  }

  /* ---------------- números e textos ---------------- */
  var UN = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  var DZ = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  var CT = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function ate999(n){
    if(n === 0) return '';
    if(n === 100) return 'cem';
    var c = Math.floor(n / 100), r = n % 100, p = [];
    if(c) p.push(CT[c]);
    if(r){ if(r < 20) p.push(UN[r]); else { var d = Math.floor(r / 10), u = r % 10; p.push(DZ[d] + (u ? ' e ' + UN[u] : '')); } }
    return p.join(' e ');
  }
  function inteiroExtenso(n){
    n = Math.floor(Math.abs(n));
    if(n === 0) return 'zero';
    var grupos = [], nomes = [['',''],['mil','mil'],['milhão','milhões'],['bilhão','bilhões']];
    var i = 0;
    while(n > 0 && i < nomes.length){ grupos.push({ v: n % 1000, i: i }); n = Math.floor(n / 1000); i++; }
    var partes = grupos.filter(function(g){ return g.v; }).reverse().map(function(g){
      if(g.i === 0) return ate999(g.v);
      if(g.i === 1) return g.v === 1 ? 'mil' : ate999(g.v) + ' mil';
      return ate999(g.v) + ' ' + (g.v === 1 ? nomes[g.i][0] : nomes[g.i][1]);
    });
    if(partes.length < 2) return partes.join('');
    var ult = grupos.filter(function(g){ return g.v; })[0];
    var junta = (ult.i === 0 && (ult.v < 100 || ult.v % 100 === 0)) ? ' e ' : ', ';
    return partes.slice(0, -1).join(', ') + junta + partes[partes.length - 1];
  }
  function reaisExtenso(v){
    v = Math.round(Number(v) * 100) / 100;
    if(!isFinite(v)) return '';
    var r = Math.floor(v), c = Math.round((v - r) * 100), t = [];
    if(r){
      var tr = inteiroExtenso(r);
      var de = (r >= 1000000 && r % 1000000 === 0) ? ' de' : '';
      t.push(tr + de + (r === 1 ? ' real' : ' reais'));
    }
    if(c) t.push(inteiroExtenso(c) + (c === 1 ? ' centavo' : ' centavos'));
    return t.join(' e ') || 'zero reais';
  }
  function reais(v){
    var n = Number(v);
    if(v == null || v === '' || !isFinite(n)) return '';
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function cnj(n){
    var d = String(n || '').replace(/\D/g, '');
    if(d.length !== 20) return n ? String(n) : '';
    return d.slice(0,7) + '-' + d.slice(7,9) + '.' + d.slice(9,13) + '.' + d.slice(13,14) + '.' + d.slice(14,16) + '.' + d.slice(16);
  }
  function cpf(c){
    var d = String(c || '').replace(/\D/g, '');
    return d.length === 11 ? d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9) : (c || '');
  }
  function idade(dn){
    var m = String(dn || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(!m) return null;
    var hoje = new Date(), a = hoje.getFullYear() - (+m[3]);
    if(hoje.getMonth() + 1 < +m[2] || (hoje.getMonth() + 1 === +m[2] && hoje.getDate() < +m[1])) a--;
    return a > 0 && a < 130 ? a : null;
  }
  function falta(rotulo){ return '⟦[' + rotulo + ']⟧'; }
  /* "03ª VARA FEDERAL DE ALAGOAS" -> "3ª Vara Federal De Alagoas" (o modelo usa as iniciais maiúsculas no endereçamento) */
  function titulo(s){
    return String(s || '').toLowerCase().replace(/^0+(\d)/, '$1').replace(/(^|\s)([a-zà-ú])/g, function(m, a, b){ return a + b.toUpperCase(); }).trim();
  }
  function cap(s){ s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function enderecoTexto(e, p){
    if(e && e.endereco){
      return e.endereco + (e.cidade ? ', ' + e.cidade : '') + (e.uf ? '/' + e.uf : '') + (e.cep ? ', CEP ' + e.cep : '');
    }
    if(p && p.endereco_ficha) return p.endereco_ficha + (p.municipio ? ', ' + p.municipio : '') + (p.uf ? '/' + p.uf : '');
    return '';
  }
  /* qualificação sem o nome: "brasileiro(a), [estado civil], aposentada, inscrita no CPF sob o nº ..., residente e domiciliada na ..." */
  function qualificacao(p, e){
    if(!p) return '';
    if(p.qualificacao && typeof p.qualificacao === 'string') return p.qualificacao;
    var per = p.perfil || {}, partes = ['brasileiro(a)'];
    partes.push(per.estado_civil ? String(per.estado_civil).toLowerCase() : falta('estado civil'));
    var prof = per.profissao || per.situacao_funcional || per.cargo;
    partes.push(prof ? String(prof).toLowerCase() : falta('profissão'));
    partes.push('inscrito(a) no CPF sob o nº ' + (p.cpf ? cpf(p.cpf) : falta('CPF')));
    var end = enderecoTexto(e, p);
    partes.push('residente e domiciliado(a) na ' + (end || falta('endereço completo com CEP')));
    return partes.join(', ');
  }

  /* dados da ficha -> valores dos campos {chave} dos modelos. origem[chave] diz de onde veio (para mostrar na janela). */
  function mapear(d){
    var v = {}, o = {};
    var pr = d.processo || {}, pe = d.pessoa || {}, per = pe.perfil || {}, fin = d.financeiro || {}, partes = d.partes || [];
    function por(ch, val, de){ if(val != null && String(val).trim() !== ''){ v[ch] = String(val); o[ch] = de; } }
    por('cliente', pe.nome, 'ficha');
    por('qualificacao', qualificacao(pe, d.endereco), 'ficha');
    por('numero_processo', cnj(pr.numero), 'processo');
    por('processo_origem', cnj(pr.processo_originario), 'planilha (Número do processo originário)');
    if(pr.orgao_julgador) por('vara', titulo(pr.orgao_julgador), 'CNJ (órgão julgador)');
    var id = idade(per.data_nascimento);
    if(id) por('idade', id + ' (' + inteiroExtenso(id) + ')', 'perfil (data de nascimento)');
    if(pr.valor_causa){ por('valor_causa', reais(pr.valor_causa), 'processo'); por('valor_causa_extenso', reaisExtenso(pr.valor_causa), 'processo'); }
    por('data_aposentadoria', per.data_aposentadoria, 'perfil');
    var herd = partes.filter(function(x){ return x.herdeiro_de; });
    if(herd.length){
      por('servidor', herd[0].herdeiro_de, 'partes do processo');
      por('condicao_autores', 'herdeiros de ' + herd[0].herdeiro_de, 'partes do processo');
    }
    var autores = partes.length ? partes : [];
    if(autores.length){
      var txt = autores.map(function(a){
        var q = qualificacao({ cpf: a.cpf, perfil: a.perfil || {} }, a.endereco ? { endereco: a.endereco } : null);
        return '**' + a.nome + '**, ' + q + (a.papel ? ' (' + String(a.papel).toLowerCase() + ')' : '');
      }).join('; ');
      por('autores_qualificacao', txt, 'partes do processo');
    }
    S.origem = o;
    return v;
  }

  /* ---------------- interface ---------------- */
  function botaoHtml(p){
    if(!p) return '';
    if(S.pode === null){ podeFazer().then(function(ok){ if(ok && typeof window.renderProcessHeader === 'function'){ try{ window.renderProcessHeader(); }catch(e){} } }); return ''; }
    if(!S.pode) return '';
    return '<div class="ps-origem"><button type="button" class="ps-origem-btn" data-fazer-peticao title="Fazer uma petição deste processo com os dados da ficha (só os modelos desta tese)">'
      + '<span class="ps-origem-rot">Petição:</span><span class="ps-origem-acao">Fazer petição</span></button></div>';
  }
  function ligar(raiz, ctx){
    if(!raiz) return;
    raiz.querySelectorAll('[data-fazer-peticao]').forEach(function(b){ b.onclick = function(){ abrir(ctx); }; });
  }

  function css(){
    if(document.getElementById('sagaPeticoesCss')) return;
    var s = document.createElement('style'); s.id = 'sagaPeticoesCss';
    s.textContent = [
      '#peticaoModal{position:fixed;inset:0;z-index:1200;display:flex;align-items:safe center;justify-content:center;padding:24px 16px;overscroll-behavior:contain;background:color-mix(in srgb,#000 55%,transparent);opacity:0;visibility:hidden;transition:opacity .3s cubic-bezier(.22,.78,.25,1),visibility .3s}',
      '#peticaoModal.aberto{opacity:1;visibility:visible}',
      '#peticaoModal.sem-movimento{transition:none}',
      /* 19/11 (Dr. Victor): janela SEM transparência, também nas cores de vidro (--panel-solid é a cor sólida do tema) */
      '#peticaoModal .pt-caixa{background:var(--panel-solid,var(--panel));backdrop-filter:none;-webkit-backdrop-filter:none;overscroll-behavior:contain;color:var(--text);border:1px solid var(--border);border-radius:16px;width:min(880px,100%);box-sizing:border-box;max-height:100%;min-height:min(520px,100%);overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);transform:translateY(10px);transition:transform .32s cubic-bezier(.22,.78,.25,1)}',
      '#peticaoModal.aberto .pt-caixa{transform:none}',
      '#peticaoModal h3{margin:0 0 4px;font-size:18px}',
      '#peticaoModal .pt-sub{color:var(--muted);font-size:12.5px;margin-bottom:14px}',
      '#peticaoModal .pt-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}',
      '#peticaoModal .pt-modelo{text-align:left;font:inherit;color:var(--text);background:var(--sb-sec,transparent);border:1px solid var(--border);border-radius:12px;padding:12px 14px;cursor:pointer}',
      '#peticaoModal .pt-modelo:hover{border-color:var(--gold)}',
      '#peticaoModal .pt-modelo b{display:block;font-size:13px;margin-bottom:4px}',
      '#peticaoModal .pt-modelo span{font-size:11.5px;color:var(--muted)}',
      '#peticaoModal .pt-campos{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}',
      '#peticaoModal .pt-campo{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '#peticaoModal .pt-campo.largo{grid-column:1/-1}',
      '#peticaoModal .pt-campo label{font-size:11.5px;color:var(--muted)}',
      '#peticaoModal .pt-campo label i{font-style:normal;color:var(--gold);margin-left:6px}',
      '#peticaoModal .pt-campo input,#peticaoModal .pt-campo textarea{font:inherit;font-size:13px}',
      '#peticaoModal .pt-campo textarea{min-height:70px;resize:vertical}',
      '#peticaoModal .pt-campo.falta input,#peticaoModal .pt-campo.falta textarea{border-color:color-mix(in srgb,#eab308 70%,transparent);background:color-mix(in srgb,#eab308 10%,transparent)}',
      '#peticaoModal .pt-campo.falta label{color:color-mix(in srgb,#ca8a04 85%,var(--text))}',
      '#peticaoModal .pt-linha{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:12px 0}',
      '#peticaoModal .pt-linha label{font-size:11.5px;color:var(--muted);display:flex;flex-direction:column;gap:4px}',
      '#peticaoModal .pt-resumo{font-size:12.5px;margin:6px 0 12px;padding:9px 12px;border-radius:10px;border:1px solid var(--border)}',
      '#peticaoModal .pt-resumo.amarelo{border-color:color-mix(in srgb,#eab308 55%,transparent);background:color-mix(in srgb,#eab308 9%,transparent)}',
      '#peticaoModal .pt-botoes{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}',
      '#peticaoModal .pt-botoes button{font:inherit;font-size:12.5px;padding:9px 16px;border-radius:10px;border:1px solid var(--sb-sec-borda,var(--border));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer}',
      '#peticaoModal .pt-botoes button.btn-primario{background:var(--sb-acao);border-color:var(--sb-acao-borda)}',
      '#peticaoModal .pt-botoes button[disabled]{opacity:.55;cursor:progress}',
      '#peticaoModal .pt-modelo{background:color-mix(in srgb,var(--text) 4%,var(--panel-solid,var(--panel)))}',
      '#peticaoModal .pt-erro{color:#dc2626;font-size:12.5px;margin-top:8px}',
      '#peticaoModal .pt-ok{color:var(--gold);font-size:12.5px;margin-top:8px}',
      '#peticaoModal .pt-vazio{color:var(--muted);font-size:13px;padding:14px 0}',
      '@media (max-width:640px){#peticaoModal .pt-campos{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function modal(){
    var m = document.getElementById('peticaoModal');
    if(m) return m;
    css();
    m = document.createElement('div'); m.id = 'peticaoModal'; m.setAttribute('data-saga-movimento-proprio', '1');
    m.innerHTML = '<div class="pt-caixa" role="dialog" aria-modal="true" aria-labelledby="ptTitulo"><div id="ptConteudo"></div></div>';
    m.addEventListener('click', function(e){ if(e.target === m) fechar(); });
    /* a roda do mouse fora do quadro (ou no fim dele) não passa para a tela de trás */
    m.addEventListener('wheel', function(e){
      var c = m.querySelector('.pt-caixa');
      if(!c || !c.contains(e.target)){ e.preventDefault(); return; }
      var noTopo = c.scrollTop <= 0 && e.deltaY < 0, noFim = c.scrollTop + c.clientHeight >= c.scrollHeight - 1 && e.deltaY > 0;
      if(noTopo || noFim) e.preventDefault();
    }, { passive: false });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && m.classList.contains('aberto')) fechar(); });
    document.body.appendChild(m);
    return m;
  }
  /* Tela de trás parada: quem trava é o saga_guard.js ("Janela aberta = tela de trás parada"); a trava própria saiu
     (19/11) para não brigar com a dele (html hidden e body visible). */
  function travarFundo(){}
  function soltarFundo(){}
  function mostrar(){ var m = modal(); travarFundo(); m.classList.toggle('sem-movimento', reduzido()); requestAnimationFrame(function(){ m.classList.add('aberto'); }); }
  function fechar(){ var m = document.getElementById('peticaoModal'); if(m) m.classList.remove('aberto'); soltarFundo(); }
  function conteudo(html){ document.getElementById('ptConteudo').innerHTML = html; }

  async function carregarBase(){
    if(!window.SagaTimbrado) throw new Error('o gerador de petições (saga_timbrado.js) não carregou nesta tela');
    if(!S.modelos) S.modelos = await SagaTimbrado.listarModelos(sb());
    if(!S.timbrados) S.timbrados = (await SagaTimbrado.listar(sb())).sort(function(a, b){ return (TIMBRADOS_PROIBIDOS.indexOf(a.chave) >= 0) - (TIMBRADOS_PROIBIDOS.indexOf(b.chave) >= 0); });
  }

  async function abrir(ctx){
    S.ctx = ctx || {};
    modal();
    conteudo('<h3 id="ptTitulo">Fazer petição</h3><div class="pt-sub">Carregando os modelos e os dados da ficha...</div>');
    mostrar();
    try{
      if(!(await podeFazer())) throw new Error('você não tem a permissão para fazer petições. Peça ao administrador (Painel de permissões > Petições)');
      var r = await Promise.all([carregarBase(), sb().rpc('peticao_dados', { p_processo_id: S.ctx.processoId }), sb().rpc('calculo_do_processo', { p_processo_id: S.ctx.processoId })]);
      S.calc = (r[2] && !r[2].error && r[2].data) ? r[2].data : null;
      var dr = r[1];
      if(dr.error) throw new Error('não consegui ler os dados da ficha: ' + (window.sagaErroBanco?window.sagaErroBanco(dr.error):dr.error.message));
      S.dados = dr.data || {};
      var tese = (S.dados.processo || {}).tese_id || S.ctx.teseId || null;
      var daTese = S.modelos.filter(function(m){ return tese && m.tese_id === tese; });
      var gerais = S.modelos.filter(function(m){ return !m.tese_id; });
      S.lista = daTese.concat(gerais);
      /* vindo da tela Modelos (modelo já escolhido): vai direto ao formulário, com qualquer modelo */
      if(S.ctx.modeloId){
        S.lista = S.modelos.slice();
        if(S.lista.some(function(m){ return m.id === S.ctx.modeloId; })){ ligarFechar(); escolher(S.ctx.modeloId); return; }
        throw new Error('o modelo escolhido não está disponível para você');
      }
      var nomeTese = (S.dados.processo || {}).tese || 'esta tese';
      var cartao = function(m){
        return '<button type="button" class="pt-modelo" data-pt-modelo="' + esc(m.id) + '"><b>' + esc(m.titulo) + '</b><span>' + esc(m.tipo_peca || 'Petição')
          + (m.tese_id ? ' · ' + esc(nomeTese) : ' · modelo geral') + (m.timbrado_chave && TIMBRADOS_PROIBIDOS.indexOf(m.timbrado_chave) < 0 ? ' · ' + esc(nomeTimbrado(m.timbrado_chave)) : '') + '</span></button>';
      };
      conteudo('<h3 id="ptTitulo">Fazer petição · ' + esc((S.dados.pessoa || {}).nome || '') + '</h3>'
        + '<div class="pt-sub">Processo de ' + esc(nomeTese) + (S.dados.processo && S.dados.processo.codigo ? ' · ' + esc(S.dados.processo.codigo) : '')
        + '. Aparecem só as petições desta tese e os modelos gerais. Para outra tese, use o botão no processo dela.</div>'
        + (daTese.length ? '<div class="pt-lista">' + daTese.map(cartao).join('') + '</div>'
          : (gerais.length ? '<div class="pt-vazio">Ainda não há petição pronta para ' + esc(nomeTese) + '. Use um modelo geral abaixo ou cadastre o modelo desta tese em <a href="biblioteca_padrao_metalico_FINAL.html" target="_blank" rel="noopener">Modelos ↗</a>.</div>'
            : '<div class="pt-vazio"><b>Nenhum modelo de petição disponível para este processo.</b><br>Não há modelo de ' + esc(nomeTese) + ' nem modelo geral cadastrado (ou você não tem acesso a eles). Cadastre ou importe os modelos em <a href="biblioteca_padrao_metalico_FINAL.html" target="_blank" rel="noopener">Modelos &gt; Petições e timbrados ↗</a>; quem não gerencia os modelos pede ao administrador.</div>'))
        + (gerais.length ? '<div class="pt-sub" style="margin:16px 0 8px">Modelos gerais</div><div class="pt-lista">' + gerais.map(cartao).join('') + '</div>' : '')
        + '<div class="pt-botoes"><button type="button" class="btn-secondary btn-secundario" data-pt-fechar>Fechar</button></div>');
      document.querySelectorAll('[data-pt-modelo]').forEach(function(b){ b.onclick = function(){ escolher(b.getAttribute('data-pt-modelo')); }; });
    }catch(e){
      conteudo('<h3 id="ptTitulo">Fazer petição</h3><div class="pt-erro"><b>Não deu para abrir:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div><div class="pt-botoes"><button type="button" class="btn-secondary btn-secundario" data-pt-fechar>Fechar</button></div>');
    }
    ligarFechar();
  }
  function ligarFechar(){ document.querySelectorAll('[data-pt-fechar]').forEach(function(b){ b.onclick = fechar; }); }
  function nomeTimbrado(ch){ var t = (S.timbrados || []).filter(function(x){ return x.chave === ch; })[0]; return t ? t.nome : ch; }

  function escolher(id){
    var m = S.lista.filter(function(x){ return x.id === id; })[0]; if(!m) return;
    S.modelo = m;
    S.valores = mapear(S.dados);
    /* cálculo do PSS salvo no processo (bloco 267): os valores dele entram nos campos da petição */
    var cp = S.calc && S.calc.atual && S.calc.atual.resultado && S.calc.atual.resultado.campos_peticao;
    if(cp) Object.keys(cp).forEach(function(k){ if(cp[k]){ S.valores[k] = cp[k]; S.origem[k] = 'cálculo do PSS (versão ' + S.calc.atual.versao + (S.calc.atual.situacao === 'conferido' ? ', conferido' : ', rascunho') + ')'; } });
    var campos = SagaTimbrado.camposDoModelo(m);
    var chPadrao = (m.timbrado_chave && TIMBRADOS_PROIBIDOS.indexOf(m.timbrado_chave) < 0) ? m.timbrado_chave : 'vmm';
    var htmlCampos = campos.map(function(c){
      var val = S.valores[c.chave] || '', vazio = !val && c.chave !== 'data' && c.chave !== 'cidade';
      var ph = c.exemplo ? 'Ex.: ' + c.exemplo : (c.chave === 'data' ? 'Vazio = hoje' : (c.chave === 'cidade' ? 'Vazio = Maceió/AL' : 'Falta: sai destacado na petição'));
      var de = S.origem[c.chave] ? '<i>da ' + esc(S.origem[c.chave]) + '</i>' : '';
      var longo = c.longo || val.length > 90;
      return '<div class="pt-campo' + (longo ? ' largo' : '') + (vazio ? ' falta' : '') + '"><label for="pt_' + esc(c.chave) + '">' + esc(c.rotulo || c.chave) + de + '</label>'
        + (longo ? '<textarea id="pt_' + esc(c.chave) + '" data-pt-campo="' + esc(c.chave) + '" placeholder="' + esc(ph) + '">' + esc(val) + '</textarea>'
                 : '<input type="text" id="pt_' + esc(c.chave) + '" data-pt-campo="' + esc(c.chave) + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '">')
        + '</div>';
    }).join('');
    conteudo('<h3 id="ptTitulo">' + esc(m.titulo) + '</h3>'
      + '<div class="pt-sub">' + esc((S.dados.pessoa || {}).nome || '') + ' · confira os campos. O que vier da ficha já está preenchido; o que faltar fica em amarelo aqui e sai destacado na petição para completar.</div>'
      + '<div class="pt-resumo" id="ptResumo"></div>'
      + (ehPss() ? '<div class="pt-linha" style="margin-top:0"><button type="button" class="btn-secondary btn-secundario" id="ptCalculo" style="font:inherit;font-size:12.5px;padding:8px 14px;border-radius:10px;border:1px solid var(--sb-sec-borda,var(--border));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer">' + (S.calc && S.calc.atual ? 'Ver ou refazer o cálculo do PSS' : 'Fazer o cálculo do PSS (preenche os valores)') + '</button>'
        + '<span style="font-size:12px;color:var(--muted)">' + (S.calc && S.calc.atual ? 'Cálculo ' + (S.calc.atual.situacao === 'conferido' ? 'conferido' : 'em rascunho') + ', versão ' + S.calc.atual.versao : 'Este processo ainda não tem cálculo salvo.') + '</span></div>' : '')
      + '<div class="pt-linha"><label>Papel timbrado<select id="ptTimbrado">' + S.timbrados.map(function(t){ return '<option value="' + esc(t.chave) + '"' + (t.chave === chPadrao ? ' selected' : '') + '>' + esc(t.nome) + (TIMBRADOS_PROIBIDOS.indexOf(t.chave) >= 0 ? ' (só quando o Dr. Victor pedir)' : '') + '</option>'; }).join('') + '</select></label>'
      + '<label>Versão<select id="ptVersao"><option value="cores">Colorida</option><option value="impressao">Para imprimir</option></select></label>'
      + '<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="ptGuardar" checked> Guardar na pasta "Petições" do cliente</label></div>'
      + '<div id="ptDocs"></div>'
      + '<div class="pt-campos">' + htmlCampos + '</div>'
      + '<div id="ptMsg"></div>'
      + '<div class="pt-botoes"><button type="button" class="btn-secondary btn-secundario" id="ptVoltar">Voltar aos modelos</button>'
      + '<button type="button" class="btn-secondary btn-secundario" id="ptWord">Baixar Word</button><button type="button" class="btn-confirmar-bib btn-primario" id="ptPdf">Baixar PDF</button></div>');
    document.querySelectorAll('[data-pt-campo]').forEach(function(i){ i.addEventListener('input', function(){ i.parentNode.classList.toggle('falta', !i.value.trim() && ['data','cidade'].indexOf(i.getAttribute('data-pt-campo')) < 0); resumo(); }); });
    document.getElementById('ptVoltar').onclick = function(){ abrir(S.ctx); };
    var bc = document.getElementById('ptCalculo');
    if(bc) bc.onclick = function(){
      garantirCalculos().then(function(){
        window.SagaCalculos.abrir({ sb: sb(), processoId: S.ctx.processoId, titulo: ((S.dados.pessoa || {}).nome || '') + (S.dados.processo && S.dados.processo.codigo ? ' · ' + S.dados.processo.codigo : ''),
          aoSalvar: function(x){
            var cp2 = (x && x.resultado && x.resultado.campos_peticao) || {};
            Object.keys(cp2).forEach(function(k){ var i = document.querySelector('[data-pt-campo="' + k + '"]'); if(i && cp2[k]){ i.value = cp2[k]; i.dispatchEvent(new Event('input')); } });
            S.calc = S.calc || {}; 
          } });
      }).catch(function(e){ var msg = document.getElementById('ptMsg'); if(msg) msg.innerHTML = '<div class="pt-erro"><b>Não abriu o cálculo:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>'; });
    };
    ligarDocs(campos);
    document.getElementById('ptWord').onclick = function(){ gerar('docx'); };
    document.getElementById('ptPdf').onclick = function(){ gerar('pdf'); };
    resumo();
  }
  function faltando(){ return document.querySelectorAll('#peticaoModal .pt-campo.falta').length; }
  function resumo(){
    var n = faltando(), el = document.getElementById('ptResumo'); if(!el) return;
    el.classList.toggle('amarelo', n > 0);
    el.textContent = n ? n + (n === 1 ? ' campo ficou' : ' campos ficaram') + ' sem dado na ficha: preencha aqui ou deixe para completar no Word (sai destacado).' : 'Todos os campos têm dado. Confira antes de protocolar.';
  }

  async function pastaPeticoes(pessoaId){
    var r = await sb().from('pastas_cliente').select('id,nome').eq('pessoa_id', pessoaId).is('pai_id', null).eq('ativo', true);
    if(r.error) throw new Error('não consegui ler as pastas do cliente (' + (window.sagaErroBanco?window.sagaErroBanco(r.error):r.error.message) + ')');
    var chave = function(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
    var achou = (r.data || []).filter(function(p){ return chave(p.nome) === 'peticoes'; })[0];
    if(achou) return achou.id;
    var c = await sb().rpc('pastas_cliente_criar_varias', { p_pessoa: pessoaId, p_nomes: ['Petições'] });
    if(c.error){
      var ins = await sb().from('pastas_cliente').insert({ pessoa_id: pessoaId, pai_id: null, nome: 'Petições' }).select('id').single();
      if(ins.error) throw new Error('não consegui criar a pasta "Petições" (' + (window.sagaErroBanco?window.sagaErroBanco(ins.error):ins.error.message) + ')');
      return ins.data.id;
    }
    var r2 = await sb().from('pastas_cliente').select('id,nome').eq('pessoa_id', pessoaId).is('pai_id', null).eq('ativo', true);
    var p2 = (r2.data || []).filter(function(p){ return chave(p.nome) === 'peticoes'; })[0];
    return p2 ? p2.id : null;
  }

  async function guardar(bytes, nome, tipo){
    var pessoaId = (S.dados.pessoa || {}).id || S.ctx.pessoaId, procId = S.ctx.processoId;
    var s = await sb().auth.getSession(); var uid = s.data && s.data.session && s.data.session.user && s.data.session.user.id;
    if(!uid) throw new Error('sua sessão expirou; entre de novo no SAGA');
    var us = await sb().from('usuarios').select('id').eq('auth_user_id', uid).maybeSingle();
    if(us.error || !us.data) throw new Error('não achei o seu cadastro de usuário');
    var pastaId = await pastaPeticoes(pessoaId);
    var caminho = procId + '/' + crypto.randomUUID() + '_' + nome.replace(/[^a-zA-Z0-9._-]/g, '_');
    var up = await sb().storage.from(BUCKET).upload(caminho, new Blob([bytes], { type: tipo }), { contentType: tipo });
    if(up.error) throw new Error('o envio do arquivo falhou (' + (window.sagaErroBanco?window.sagaErroBanco(up.error):up.error.message) + ')');
    var ins = await sb().from('documentos').insert({ processo_id: procId, pessoa_id: pessoaId, usuario_id: us.data.id, nome_arquivo: nome, caminho_storage: caminho,
      tipo_documento: /\.pdf$/i.test(nome) ? 'pdf' : 'word', tamanho_bytes: bytes.length, pasta_id: pastaId, visivel_portal_cliente: false, excluido_logico: false }).select('id').single();
    if(ins.error){
      var rm = await sb().storage.from(BUCKET).remove([caminho]);
      throw new Error(((window.sagaErroBanco?window.sagaErroBanco(ins.error):ins.error.message) || 'o registro do documento foi recusado') + (rm.error ? ' (e o arquivo enviado ficou solto: avise o administrador)' : ''));
    }
    return ins.data.id;
  }

  async function gerar(formato){
    var m = S.modelo, msg = document.getElementById('ptMsg');
    var t = S.timbrados.filter(function(x){ return x.chave === document.getElementById('ptTimbrado').value; })[0];
    if(!t){ msg.innerHTML = '<div class="pt-erro"><b>Erro:</b> escolha o papel timbrado.</div>'; return; }
    if(TIMBRADOS_PROIBIDOS.indexOf(t.chave) >= 0){
      var aviso = 'O timbrado da ' + t.nome + ' só entra em petição quando o Dr. Victor pede. Ele pediu esta petição neste timbrado?';
      var ok = window.sagaConfirmar ? await sagaConfirmar('Petição no timbrado da ' + t.nome, aviso, 'Sim, ele pediu', false) : confirm(aviso);
      if(!ok) return;
    }
    var valores = {};
    document.querySelectorAll('[data-pt-campo]').forEach(function(i){ valores[i.getAttribute('data-pt-campo')] = i.value; });
    var imp = document.getElementById('ptVersao').value === 'impressao';
    var querGuardar = document.getElementById('ptGuardar').checked;
    var bw = document.getElementById('ptWord'), bp = document.getElementById('ptPdf'), botao = formato === 'pdf' ? bp : bw, txt = botao.textContent;
    bw.disabled = bp.disabled = true; botao.textContent = 'Gerando...'; msg.innerHTML = '';
    var nFalta = faltando();
    try{
      var r = await SagaTimbrado.gerar({ sb: sb(), timbrado: t, modelo: m, valores: valores, formato: formato, impressao: imp, realce: true });
      var nome = SagaTimbrado.nomeArquivo((valores.nome_peca || m.titulo) + (valores.cliente ? ' - ' + valores.cliente : '') + ' - ' + t.nome + (r.impressao ? ' (impressao)' : '')) + '.' + r.ext;
      SagaTimbrado.baixar(r.bytes, nome, r.tipo);
      var docId = null, aviso = '';
      if(querGuardar){
        try{ docId = await guardar(r.bytes, nome, r.tipo); aviso = ' Guardada na pasta "Petições" do cliente.'; }
        catch(e){ aviso = '<br><span class="pt-erro">Baixou, mas NÃO guardou na pasta do cliente. Motivo: ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '.</span>'; }
      }
      try{ await sb().rpc('peticao_registrar', { p_processo_id: S.ctx.processoId, p_modelo_id: m.id, p_titulo: m.titulo, p_formato: formato, p_documento_id: docId, p_faltando: nFalta }); }catch(e){}
      msg.innerHTML = '<div class="pt-ok">Pronto: ' + esc(nome) + (r.paginas ? ' (' + r.paginas + (r.paginas === 1 ? ' página' : ' páginas') + ')' : '') + ' foi baixado.'
        + (nFalta ? ' ' + nFalta + ' campo(s) saíram destacados para completar.' : '') + aviso
        + (r.avisos && r.avisos.length ? '<br>' + r.avisos.map(esc).join('<br>') : '') + '</div>';
      if(docId && typeof S.ctx.aoGuardar === 'function'){ try{ S.ctx.aoGuardar(docId); }catch(e){} }
      proximoDaFila(msg);
    }catch(e){
      msg.innerHTML = '<div class="pt-erro"><b>Não foi possível gerar o ' + (formato === 'pdf' ? 'PDF' : 'Word') + ':</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>';
    }finally{ bw.disabled = bp.disabled = false; botao.textContent = txt; }
  }

  function ehPss(){
    var p = (S.dados && S.dados.processo) || {}, m = S.modelo || {};
    return /^PSS/i.test(p.tese_sigla || '') || /\bPSS\b/i.test(p.tese || '') || /\bPSS\b/i.test(m.titulo || '');
  }
  /* carrega o saga_calculos.js (mesma versão deste arquivo) só quando precisa: a ficha não precisa de outro script */
  var VERSAO_ARQ = (function(){ try{ var s = document.currentScript && document.currentScript.src; var m = s && s.match(/[?&]v=(\d+)/); return m ? m[1] : ''; }catch(e){ return ''; } })();
  var BASE_ARQ = (function(){ try{ var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^\/]*$/, '') : ''; }catch(e){ return ''; } })();
  function garantirCalculos(){
    if(window.SagaCalculos) return Promise.resolve();
    return new Promise(function(ok, falha){
      var s = document.createElement('script'); s.src = BASE_ARQ + 'saga_calculos.js' + (VERSAO_ARQ ? '?v=' + VERSAO_ARQ : '');
      s.onload = function(){ ok(); }; s.onerror = function(){ falha(new Error('o arquivo do cálculo (saga_calculos.js) não carregou')); };
      document.head.appendChild(s);
    });
  }

  /* 21/11 (Dr. Victor; conversa das planilhas): ler os documentos do cliente (RG, comprovante, requisitório...) e completar os campos.
     O saga_peticao_docs.js (SagaPeticaoDocs, da outra conversa) é carregado só agora. Ele chama aplicar(novos):
     novos = { chave: valor | {valor, origem} } preenche o campo VAZIO ou só com lacuna ⟦[ ]⟧;
     novos.lacunas = { 'estado civil': 'casado', ... } troca a lacuna ⟦[rótulo]⟧ dentro de qualquer campo (ex.: na qualificação). */
  function garantirScript(arq, global){
    if(window[global]) return Promise.resolve();
    return new Promise(function(ok, falha){
      var s = document.createElement('script'); s.src = BASE_ARQ + arq + (VERSAO_ARQ ? '?v=' + VERSAO_ARQ : '');
      s.onload = function(){ ok(); }; s.onerror = function(){ falha(new Error('o arquivo ' + arq + ' não carregou')); };
      document.head.appendChild(s);
    });
  }
  function soLacuna(v){ return !String(v || '').replace(/⟦\[[^\]]*\]⟧/g, '').trim(); }
  function ligarDocs(campos){
    var div = document.getElementById('ptDocs'); if(!div) return;
    function valoresAgora(){ var v = {}; document.querySelectorAll('[data-pt-campo]').forEach(function(i){ v[i.getAttribute('data-pt-campo')] = i.value; }); return v; }
    function aplicar(novos){
      novos = novos || {}; var n = 0;
      document.querySelectorAll('[data-pt-campo]').forEach(function(i){
        var ch = i.getAttribute('data-pt-campo'), x = novos[ch], de = '';
        if(x != null && ch !== 'lacunas'){
          var val = typeof x === 'object' ? x.valor : x; de = typeof x === 'object' ? (x.origem || '') : '';
          if(val != null && String(val).trim() && soLacuna(i.value)){ i.value = String(val); marcar(i, de); n++; }
        }
        if(novos.lacunas && /⟦\[/.test(i.value)){
          var antes = i.value;
          i.value = i.value.replace(/⟦\[([^\]]*)\]⟧/g, function(m, rot){ var y = novos.lacunas[rot]; var v2 = y && typeof y === 'object' ? y.valor : y; return v2 != null && String(v2).trim() ? String(v2) : m; });
          if(i.value !== antes){ marcar(i, 'documentos do cliente'); n++; }
        }
      });
      resumo();
      return n;
    }
    function marcar(i, de){
      i.style.outline = '2px solid #e0b000'; i.style.outlineOffset = '1px';
      i.title = 'Preenchido pelos documentos do cliente' + (de ? ': ' + de : '') + '. Confira.';
      i.dispatchEvent(new Event('input'));
    }
    garantirScript('saga_peticao_docs.js', 'SagaPeticaoDocs').then(function(){
      if(!window.SagaPeticaoDocs || !SagaPeticaoDocs.montar) return;
      SagaPeticaoDocs.montar(div, { sb: sb(), processoId: S.ctx.processoId || null, pessoaId: (S.dados && S.dados.pessoa && S.dados.pessoa.id) || null,
        campos: campos.map(function(c){ return { chave: c.chave, rotulo: c.rotulo || c.chave }; }), valores: valoresAgora(), valoresAgora: valoresAgora, aplicar: aplicar });
    }).catch(function(e){
      /* enquanto o arquivo não estiver publicado (404), a caixa simplesmente não aparece; outro erro fica à vista */
      fetch(BASE_ARQ + 'saga_peticao_docs.js', { method: 'HEAD', cache: 'no-store' }).then(function(r){
        if(r.status !== 404) div.innerHTML = '<div class="pt-erro"><b>A leitura dos documentos não carregou:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + ' (código ' + r.status + ')</div>';
      }).catch(function(){ div.innerHTML = '<div class="pt-erro"><b>A leitura dos documentos não carregou:</b> sem ligação com o site. Atualize a página.</div>'; });
    });
  }

  /* ---------------- tela Modelos: escolher cliente do Jurídico e processos (T194 etapa 4) ---------------- */
  function proximoDaFila(msg){
    var c = S.ctx; if(!c.fila || c.filaPos == null) return;
    var prox = c.filaPos + 1;
    if(prox >= c.fila.length){ msg.insertAdjacentHTML('beforeend', '<div class="pt-ok">Todas as ' + c.fila.length + ' petições desta escolha foram feitas.</div>'); return; }
    var p = c.fila[prox];
    msg.insertAdjacentHTML('beforeend', '<div class="pt-botoes"><button type="button" class="btn-confirmar-bib btn-primario" id="ptProximo">Próximo processo (' + (prox + 1) + ' de ' + c.fila.length + '): ' + esc(p.rotulo) + '</button></div>');
    document.getElementById('ptProximo').onclick = function(){
      abrir(Object.assign({}, c, { processoId: p.id, pessoaId: p.pessoaId, teseId: p.teseId, filaPos: prox }));
    };
  }
  var buscaTimer = null;
  async function escolherCliente(o){
    o = o || {};
    S.ctx = { sb: o.sb || window._sb };
    modal();
    conteudo('<h3 id="ptTitulo">Cliente do Jurídico</h3><div class="pt-sub">Carregando...</div>');
    mostrar(); ligarFechar();
    if(!(await podeFazer())){
      conteudo('<h3 id="ptTitulo">Cliente do Jurídico</h3><div class="pt-erro"><b>Sem permissão:</b> só o Jurídico faz petições. Peça ao administrador (Painel de permissões &gt; Petições e cálculos).</div><div class="pt-botoes"><button type="button" class="btn-secondary btn-secundario" data-pt-fechar>Fechar</button></div>');
      ligarFechar(); return;
    }
    var m = o.modelo || {};
    conteudo('<h3 id="ptTitulo">' + esc(m.titulo || 'Fazer petição') + '</h3>'
      + '<div class="pt-sub">Escolha um cliente do <b>Jurídico</b> (clientes só da Captação não aparecem) e marque um ou mais processos. A petição puxa os dados da ficha de cada processo marcado; o que faltar sai destacado.</div>'
      + '<div class="pt-campo largo"><label for="ptBuscaCli">Buscar pelo nome, CPF, código (VMM-...) ou número do processo</label><input type="text" id="ptBuscaCli" autocomplete="off" placeholder="Digite pelo menos 3 letras"></div>'
      + '<div id="ptCliRes" style="margin-top:10px"></div>'
      + '<div id="ptCliMsg"></div>'
      + '<div class="pt-botoes"><button type="button" class="btn-secondary btn-secundario" data-pt-fechar>Fechar</button><button type="button" class="btn-confirmar-bib btn-primario" id="ptCliIr" disabled>Fazer a petição</button></div>');
    ligarFechar();
    var inp = document.getElementById('ptBuscaCli'), res = document.getElementById('ptCliRes'), ir = document.getElementById('ptCliIr');
    var atual = null;
    function marcados(){ return Array.prototype.slice.call(res.querySelectorAll('[data-pt-proc]:checked')); }
    function atualizarBotao(){ var n = marcados().length; ir.disabled = !n; ir.textContent = n > 1 ? 'Fazer as ' + n + ' petições (uma por processo)' : 'Fazer a petição'; }
    function desenhar(lista){
      if(!lista.length){ res.innerHTML = '<div class="pt-vazio">Nenhum cliente do Jurídico encontrado com esse termo.</div>'; return; }
      res.innerHTML = lista.map(function(c, i){
        var procs = (c.processos || []).map(function(p){
          var sug = m.tese_id ? p.tese_id === m.tese_id : true;
          return '<label style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 4px 6px;font-size:12.5px;color:var(--text)"><input type="checkbox" data-pt-proc="' + esc(p.id) + '" data-pt-pes="' + esc(c.pessoa_id) + '" data-pt-tese="' + esc(p.tese_id || '') + '" data-pt-rot="' + esc((p.codigo || '') + ' · ' + (p.tese || 'sem tese')) + '"' + (sug && (c.processos || []).length === 1 ? ' checked' : '') + '>'
            + '<span><b>' + esc(p.codigo || 'sem código') + '</b> · ' + esc(p.tese || 'sem tese') + (p.numero ? ' · ' + esc(cnj(p.numero)) : ' · sem número') + (p.situacao ? ' · <span style="color:var(--muted)">' + esc(p.situacao) + '</span>' : '')
            + (m.tese_id && !sug ? ' <span style="color:var(--muted)">(o modelo é de outra tese)</span>' : '') + '</span></label>';
        }).join('');
        return '<div class="pt-modelo" style="cursor:default;margin-bottom:8px"><b>' + esc(c.nome) + (c.codigo ? ' <span style="color:var(--muted);font-weight:400">' + esc(c.codigo) + '</span>' : '') + '</b>' + procs + '</div>';
      }).join('');
      res.querySelectorAll('[data-pt-proc]').forEach(function(x){ x.onchange = atualizarBotao; });
      atualizarBotao();
    }
    inp.addEventListener('input', function(){
      clearTimeout(buscaTimer);
      var termo = inp.value.trim();
      if(termo.length < 3){ res.innerHTML = ''; atualizarBotao(); return; }
      buscaTimer = setTimeout(async function(){
        res.innerHTML = '<div class="pt-vazio">Procurando...</div>';
        var r = await S.ctx.sb.rpc('peticao_clientes_juridico', { p_busca: termo });
        if(inp.value.trim() !== termo) return;
        if(r.error){ res.innerHTML = '<div class="pt-erro"><b>Não deu para buscar:</b> ' + esc((window.sagaErroBanco?window.sagaErroBanco(r.error):r.error.message)) + '</div>'; return; }
        atual = r.data || []; desenhar(atual);
      }, 350);
    });
    ir.onclick = function(){
      var fila = marcados().map(function(x){ return { id: x.getAttribute('data-pt-proc'), pessoaId: x.getAttribute('data-pt-pes'), teseId: x.getAttribute('data-pt-tese') || null, rotulo: x.getAttribute('data-pt-rot') }; });
      if(!fila.length) return;
      abrir({ sb: S.ctx.sb, processoId: fila[0].id, pessoaId: fila[0].pessoaId, teseId: fila[0].teseId, modeloId: m.id, fila: fila, filaPos: 0 });
    };
    setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 60);
  }

  return { botaoHtml: botaoHtml, escolherCliente: escolherCliente, ligar: ligar, abrir: abrir, podeFazer: podeFazer, mapear: mapear,
           _t: { inteiroExtenso: inteiroExtenso, reaisExtenso: reaisExtenso, qualificacao: qualificacao, idade: idade } };
})();
