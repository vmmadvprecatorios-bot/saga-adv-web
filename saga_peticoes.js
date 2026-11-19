/* SAGA · Petições que se preenchem sozinhas (T194, 19/11/2026, Dr. Victor)
   - Na ficha, cada processo tem "Fazer petição": abre só os modelos da TESE daquele processo (e os modelos gerais,
     sem tese, como a "Petição simples"). Outra tese = outro processo (outro cartão).
   - Os dados vêm da ficha pelo banco (peticao_dados, SECURITY INVOKER: só o que a pessoa já pode ver).
   - O que faltar sai DESTACADO (amarelo no Word, laranja no PDF) e entre colchetes, para completar.
   - Timbrado: escolha livre entre VMM e Sarmento. O da ANCREF NUNCA entra em petição (a associação não é advogada;
     o timbrado dela fica para o rol de documentos e papéis da associação). Decisão do Dr. Victor, 19/11.
   - Só quem tem a permissão peticoes.gerar (Jurídico, Estagiário, administrador ou quem ele liberar no Painel).
   - Guarda na pasta "Petições" do cliente (cria a pasta se não existir) e registra no Registro de atividades.
   Uso: SagaPeticoes.botaoHtml(processo) + SagaPeticoes.ligar(raiz, {sb, processoId, pessoaId, teseId, aoGuardar})
        SagaPeticoes.abrir({sb, processoId, pessoaId, teseId, aoGuardar}) */
window.SagaPeticoes = (function(){
  'use strict';
  var BUCKET = 'documentos-clientes';
  var TIMBRADOS_PROIBIDOS = ['ancref'];
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
      '#peticaoModal{position:fixed;inset:0;z-index:1200;display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;background:color-mix(in srgb,#000 45%,transparent);opacity:0;visibility:hidden;transition:opacity .3s cubic-bezier(.22,.78,.25,1),visibility .3s}',
      '#peticaoModal.aberto{opacity:1;visibility:visible}',
      '#peticaoModal.sem-movimento{transition:none}',
      '#peticaoModal .pt-caixa{background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:16px;width:min(880px,100%);max-height:90vh;overflow:auto;padding:20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);transform:translateY(10px);transition:transform .32s cubic-bezier(.22,.78,.25,1)}',
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
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && m.classList.contains('aberto')) fechar(); });
    document.body.appendChild(m);
    return m;
  }
  function mostrar(){ var m = modal(); m.classList.toggle('sem-movimento', reduzido()); requestAnimationFrame(function(){ m.classList.add('aberto'); }); }
  function fechar(){ var m = document.getElementById('peticaoModal'); if(m) m.classList.remove('aberto'); }
  function conteudo(html){ document.getElementById('ptConteudo').innerHTML = html; }

  async function carregarBase(){
    if(!window.SagaTimbrado) throw new Error('o gerador de petições (saga_timbrado.js) não carregou nesta tela');
    if(!S.modelos) S.modelos = await SagaTimbrado.listarModelos(sb());
    if(!S.timbrados) S.timbrados = (await SagaTimbrado.listar(sb())).filter(function(t){ return TIMBRADOS_PROIBIDOS.indexOf(t.chave) < 0; });
  }

  async function abrir(ctx){
    S.ctx = ctx || {};
    modal();
    conteudo('<h3 id="ptTitulo">Fazer petição</h3><div class="pt-sub">Carregando os modelos e os dados da ficha...</div>');
    mostrar();
    try{
      if(!(await podeFazer())) throw new Error('você não tem a permissão para fazer petições. Peça ao administrador (Painel de permissões > Petições)');
      var r = await Promise.all([carregarBase(), sb().rpc('peticao_dados', { p_processo_id: S.ctx.processoId })]);
      var dr = r[1];
      if(dr.error) throw new Error('não consegui ler os dados da ficha: ' + dr.error.message);
      S.dados = dr.data || {};
      var tese = (S.dados.processo || {}).tese_id || S.ctx.teseId || null;
      var daTese = S.modelos.filter(function(m){ return tese && m.tese_id === tese; });
      var gerais = S.modelos.filter(function(m){ return !m.tese_id; });
      S.lista = daTese.concat(gerais);
      var nomeTese = (S.dados.processo || {}).tese || 'esta tese';
      var cartao = function(m){
        return '<button type="button" class="pt-modelo" data-pt-modelo="' + esc(m.id) + '"><b>' + esc(m.titulo) + '</b><span>' + esc(m.tipo_peca || 'Petição')
          + (m.tese_id ? ' · ' + esc(nomeTese) : ' · modelo geral') + (m.timbrado_chave && TIMBRADOS_PROIBIDOS.indexOf(m.timbrado_chave) < 0 ? ' · ' + esc(nomeTimbrado(m.timbrado_chave)) : '') + '</span></button>';
      };
      conteudo('<h3 id="ptTitulo">Fazer petição · ' + esc((S.dados.pessoa || {}).nome || '') + '</h3>'
        + '<div class="pt-sub">Processo de ' + esc(nomeTese) + (S.dados.processo && S.dados.processo.codigo ? ' · ' + esc(S.dados.processo.codigo) : '')
        + '. Aparecem só as petições desta tese e os modelos gerais. Para outra tese, use o botão no processo dela.</div>'
        + (daTese.length ? '<div class="pt-lista">' + daTese.map(cartao).join('') + '</div>' : '<div class="pt-vazio">Ainda não há petição pronta para ' + esc(nomeTese) + '. Use um modelo geral abaixo ou peça para cadastrar o modelo desta tese.</div>')
        + (gerais.length ? '<div class="pt-sub" style="margin:16px 0 8px">Modelos gerais</div><div class="pt-lista">' + gerais.map(cartao).join('') + '</div>' : '')
        + '<div class="pt-botoes"><button type="button" class="btn-secundario" data-pt-fechar>Fechar</button></div>');
      document.querySelectorAll('[data-pt-modelo]').forEach(function(b){ b.onclick = function(){ escolher(b.getAttribute('data-pt-modelo')); }; });
    }catch(e){
      conteudo('<h3 id="ptTitulo">Fazer petição</h3><div class="pt-erro"><b>Não deu para abrir:</b> ' + esc(e.message || e) + '</div><div class="pt-botoes"><button type="button" class="btn-secundario" data-pt-fechar>Fechar</button></div>');
    }
    ligarFechar();
  }
  function ligarFechar(){ document.querySelectorAll('[data-pt-fechar]').forEach(function(b){ b.onclick = fechar; }); }
  function nomeTimbrado(ch){ var t = (S.timbrados || []).filter(function(x){ return x.chave === ch; })[0]; return t ? t.nome : ch; }

  function escolher(id){
    var m = S.lista.filter(function(x){ return x.id === id; })[0]; if(!m) return;
    S.modelo = m;
    S.valores = mapear(S.dados);
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
      + '<div class="pt-linha"><label>Papel timbrado<select id="ptTimbrado">' + S.timbrados.map(function(t){ return '<option value="' + esc(t.chave) + '"' + (t.chave === chPadrao ? ' selected' : '') + '>' + esc(t.nome) + '</option>'; }).join('') + '</select></label>'
      + '<label>Versão<select id="ptVersao"><option value="cores">Colorida</option><option value="impressao">Para imprimir</option></select></label>'
      + '<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="ptGuardar" checked> Guardar na pasta "Petições" do cliente</label></div>'
      + '<div class="pt-campos">' + htmlCampos + '</div>'
      + '<div id="ptMsg"></div>'
      + '<div class="pt-botoes"><button type="button" class="btn-secundario" id="ptVoltar">Voltar aos modelos</button>'
      + '<button type="button" class="btn-secundario" id="ptWord">Baixar Word</button><button type="button" class="btn-confirmar-bib btn-primario" id="ptPdf">Baixar PDF</button></div>');
    document.querySelectorAll('[data-pt-campo]').forEach(function(i){ i.addEventListener('input', function(){ i.parentNode.classList.toggle('falta', !i.value.trim() && ['data','cidade'].indexOf(i.getAttribute('data-pt-campo')) < 0); resumo(); }); });
    document.getElementById('ptVoltar').onclick = function(){ abrir(S.ctx); };
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
    if(r.error) throw new Error('não consegui ler as pastas do cliente (' + r.error.message + ')');
    var chave = function(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
    var achou = (r.data || []).filter(function(p){ return chave(p.nome) === 'peticoes'; })[0];
    if(achou) return achou.id;
    var c = await sb().rpc('pastas_cliente_criar_varias', { p_pessoa: pessoaId, p_nomes: ['Petições'] });
    if(c.error){
      var ins = await sb().from('pastas_cliente').insert({ pessoa_id: pessoaId, pai_id: null, nome: 'Petições' }).select('id').single();
      if(ins.error) throw new Error('não consegui criar a pasta "Petições" (' + ins.error.message + ')');
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
    if(up.error) throw new Error('o envio do arquivo falhou (' + up.error.message + ')');
    var ins = await sb().from('documentos').insert({ processo_id: procId, pessoa_id: pessoaId, usuario_id: us.data.id, nome_arquivo: nome, caminho_storage: caminho,
      tipo_documento: /\.pdf$/i.test(nome) ? 'pdf' : 'word', tamanho_bytes: bytes.length, pasta_id: pastaId, visivel_portal_cliente: false, excluido_logico: false }).select('id').single();
    if(ins.error){
      var rm = await sb().storage.from(BUCKET).remove([caminho]);
      throw new Error((ins.error.message || 'o registro do documento foi recusado') + (rm.error ? ' (e o arquivo enviado ficou solto: avise o administrador)' : ''));
    }
    return ins.data.id;
  }

  async function gerar(formato){
    var m = S.modelo, msg = document.getElementById('ptMsg');
    var t = S.timbrados.filter(function(x){ return x.chave === document.getElementById('ptTimbrado').value; })[0];
    if(!t){ msg.innerHTML = '<div class="pt-erro"><b>Erro:</b> escolha o papel timbrado.</div>'; return; }
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
        catch(e){ aviso = '<br><span class="pt-erro">Baixou, mas NÃO guardou na pasta do cliente. Motivo: ' + esc(e.message || e) + '.</span>'; }
      }
      try{ await sb().rpc('peticao_registrar', { p_processo_id: S.ctx.processoId, p_modelo_id: m.id, p_titulo: m.titulo, p_formato: formato, p_documento_id: docId, p_faltando: nFalta }); }catch(e){}
      msg.innerHTML = '<div class="pt-ok">Pronto: ' + esc(nome) + (r.paginas ? ' (' + r.paginas + (r.paginas === 1 ? ' página' : ' páginas') + ')' : '') + ' foi baixado.'
        + (nFalta ? ' ' + nFalta + ' campo(s) saíram destacados para completar.' : '') + aviso
        + (r.avisos && r.avisos.length ? '<br>' + r.avisos.map(esc).join('<br>') : '') + '</div>';
      if(docId && typeof S.ctx.aoGuardar === 'function'){ try{ S.ctx.aoGuardar(docId); }catch(e){} }
    }catch(e){
      msg.innerHTML = '<div class="pt-erro"><b>Não foi possível gerar o ' + (formato === 'pdf' ? 'PDF' : 'Word') + ':</b> ' + esc(e.message || e) + '</div>';
    }finally{ bw.disabled = bp.disabled = false; botao.textContent = txt; }
  }

  return { botaoHtml: botaoHtml, ligar: ligar, abrir: abrir, podeFazer: podeFazer, mapear: mapear,
           _t: { inteiroExtenso: inteiroExtenso, reaisExtenso: reaisExtenso, qualificacao: qualificacao, idade: idade } };
})();
