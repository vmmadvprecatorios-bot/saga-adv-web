/* SAGA · Planilhas e textos do SAGA na ficha (21/11/2026, Dr. Victor; bloco 320)
   No bloco "Pastas do cliente" de cada processo: "+ Planilha", "+ Texto livre", "Planilhas do cálculo do PSS"
   e a lista das planilhas/textos daquele processo (com a versão). Planilha abre no editor_planilha.html;
   texto livre abre no editor de texto dos Modelos (SagaModelosEditor.abrirTexto, só usado, sem alterar) e sai
   em Word ou PDF no papel timbrado (SagaTimbrado). Tudo salva pela editavel_salvar (versões; nada se apaga).
   Arquivo à parte: a ficha só carrega este script (1 linha) e ele acompanha a troca de processo pela renderRelatorios. */
(function(){
  'use strict';
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function sb(){ return window._sb; }
  function versao(){ var sc = document.querySelector('script[src*="saga_editaveis_ficha.js"]'); var m = sc && /[?&]v=([^&]+)/.exec(sc.src); return m ? m[1] : ''; }
  function toast(t, tipo){ if(window.showToast) showToast(t, tipo || 'info'); else alert(t); }
  function perms(){ try{ var g = JSON.parse(localStorage.getItem('saga-permissoes') || 'null'); return (g && g.perms) || []; }catch(e){ return []; } }
  function pode(p){ return perms().indexOf(p) >= 0; }
  function processoAtual(){ try{ return typeof getActiveProcess === 'function' ? getActiveProcess() : null; }catch(e){ return null; } }
  function pessoaAtual(){ try{ return (typeof state !== 'undefined' && state.pessoaRow) || null; }catch(e){ return null; } }
  /* 23/11 (Dr. Victor): o editor abre em tela inteira com "Voltar para a ficha" (volta para este cliente e processo) */
  function voltarFicha(){ var u = (location.pathname.split('/').pop() || 'ficha_cliente_padrao_metalico_FINAL.html') + location.search; return '&voltar=' + encodeURIComponent(u); }
  var carregando = {};
  function script(src){
    if(!carregando[src]) carregando[src] = new Promise(function(ok, falha){ var s = document.createElement('script'); s.src = src + (versao() ? '?v=' + versao() : ''); s.onload = ok; s.onerror = function(){ delete carregando[src]; falha(new Error('não consegui carregar ' + src)); }; document.head.appendChild(s); });
    return carregando[src];
  }
  function css(){
    if(document.getElementById('sagaEditaveisCss')) return;
    var s = document.createElement('style'); s.id = 'sagaEditaveisCss';
    s.textContent = '#processEditaveis{margin:6px 0 10px;border:1px solid var(--border-soft,var(--border));border-radius:12px;padding:8px 10px;background:color-mix(in srgb,var(--text) 2%,transparent)}'
      + '#processEditaveis .ed-topo{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:600}'
      + '#processEditaveis .ed-botoes{display:flex;gap:5px;flex-wrap:wrap}'
      + '#processEditaveis .ed-botoes button{font:inherit;font-size:11px;font-weight:500;padding:4px 9px;border-radius:8px;border:1px solid var(--sb-sec-borda,var(--border-soft));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer}'
      + '#processEditaveis .ed-lista{display:flex;flex-direction:column;gap:4px;margin-top:6px}'
      + '#processEditaveis .ed-item{display:flex;align-items:center;gap:8px;font-size:12px;padding:5px 6px;border-radius:8px;cursor:pointer;color:var(--text);text-decoration:none}'
      + '#processEditaveis .ed-item:hover{background:color-mix(in srgb,var(--gold) 9%,transparent)}'
      + '#processEditaveis .ed-item small{color:var(--muted);margin-left:auto;white-space:nowrap}'
      + '#processEditaveis .ed-ic{flex:none;width:20px;height:20px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:color-mix(in srgb,var(--gold) 16%,transparent)}'
      + '#processEditaveis .ed-vazio{font-size:11.5px;color:var(--muted);margin-top:4px}#processEditaveis .ed-erro{font-size:11.5px;color:var(--danger,#e5484d);margin-top:4px}';
    document.head.appendChild(s);
  }
  function caixa(){
    var c = document.getElementById('processEditaveis');
    if(!c){ var rel = document.getElementById('processRelatorios'); if(!rel) return null; c = document.createElement('div'); c.id = 'processEditaveis'; rel.parentNode.insertBefore(c, rel.nextSibling); }
    return c;
  }
  var _t = null, _n = 0;
  function desenhar(){
    clearTimeout(_t);
    _t = setTimeout(async function(){
      css(); var c = caixa(), p = processoAtual(), pes = pessoaAtual(); if(!c) return;
      if(!p || !pes){ c.innerHTML = ''; c.hidden = true; return; }
      c.hidden = false;
      var criar = pode('documentos.criar'), n = ++_n;
      c.innerHTML = '<div class="ed-topo"><span>Planilhas e textos do SAGA</span><span class="ed-botoes">'
        + (criar ? '<button type="button" data-ed="planilha" title="Planilha com fórmulas, ligada a este processo">+ Planilha</button><button type="button" data-ed="texto" title="Texto livre no papel timbrado (Word ou PDF)">+ Texto livre</button>' : '')
        + '<button type="button" data-ed="pss" title="Apuração, cumprimento, planilha individualizada, herdeiros e IR-RRA, montadas do cálculo do PSS">Planilhas do PSS</button></span></div><div class="ed-lista" id="edLista"><div class="ed-vazio">Carregando…</div></div>';
      c.querySelector('[data-ed="pss"]').onclick = function(ev){ abrirUrl(ev, 'editor_planilha.html?modelo=pss&processo=' + encodeURIComponent(p.id)); };
      if(criar){
        c.querySelector('[data-ed="planilha"]').onclick = function(ev){ abrirUrl(ev, 'editor_planilha.html?novo=planilha&processo=' + encodeURIComponent(p.id)); };
        c.querySelector('[data-ed="texto"]').onclick = function(){ abrirTexto(null, p, pes); };
      }
      try{
        var r = await sb().from('documentos_editaveis').select('id,tipo,titulo,modelo,versao,atualizado_em').eq('processo_id', p.id).eq('ativo', true).order('atualizado_em', { ascending: false }).limit(50);
        if(n !== _n) return;
        if(r.error) throw r.error;
        var l = document.getElementById('edLista');
        l.innerHTML = (r.data || []).map(function(d){
          var url = d.tipo === 'planilha' ? 'editor_planilha.html?doc=' + encodeURIComponent(d.id) + (versao() ? '&v=' + versao() : '') + voltarFicha() : '#';
          return '<a class="ed-item" href="' + url + '" data-doc="' + esc(d.id) + '" data-tipo="' + esc(d.tipo) + '"><span class="ed-ic">' + (d.tipo === 'planilha' ? 'XLS' : 'TXT') + '</span><span>' + esc(d.titulo) + '</span><small>v' + esc(d.versao) + ' · ' + esc(new Date(d.atualizado_em).toLocaleDateString('pt-BR')) + '</small></a>';
        }).join('') || '<div class="ed-vazio">Nenhuma planilha ou texto do SAGA neste processo.</div>';
        l.querySelectorAll('[data-tipo="texto"]').forEach(function(a){ a.onclick = function(ev){ ev.preventDefault(); abrirTexto(a.getAttribute('data-doc'), p, pes); }; });
      }catch(e){ var l2 = document.getElementById('edLista'); if(l2) l2.innerHTML = '<div class="ed-erro">Não consegui ler as planilhas e os textos: ' + esc((window.sagaErroBanco?window.sagaErroBanco(e):e.message)|| e) + '</div>'; }
    }, 80);
  }
  /* clique abre na tela inteira; Ctrl+clique ou botão do meio, em outra aba (regra de 09/11) */
  function abrirUrl(ev, url){ url += (versao() ? '&v=' + versao() : '') + voltarFicha(); if(ev && (ev.ctrlKey || ev.metaKey || ev.button === 1)) window.open(url, '_blank', 'noopener'); else (window.sagaIrPara || function(u){ location.href = u; })(url); }

  /* ---------- texto livre ---------- */
  async function timbradoPadrao(){
    var ts = await SagaTimbrado.listar(sb());
    var ok = (ts || []).filter(function(t){ return !/ancref/i.test((t.nome || '') + ' ' + (t.chave || '')); });
    return ok[0] || (ts || [])[0];
  }
  async function abrirTexto(docId, p, pes){
    try{ await script('saga_modelos_editor.js'); }catch(e){ toast('O editor de texto não carregou: ' + e.message, 'error'); return; }
    var d = null;
    if(docId){
      var r = await sb().from('documentos_editaveis').select('*').eq('id', docId).maybeSingle();
      if(r.error || !r.data){ toast('Não consegui abrir o texto: ' + ((r.error && (window.sagaErroBanco?window.sagaErroBanco(r.error):r.error.message)) || 'não encontrado'), 'error'); return; }
      d = r.data;
    }
    var titulo = d ? d.titulo : 'Texto livre';
    if(!d){ var nome = prompt('Nome do texto (ex.: Declaração, Requerimento, Ofício):', 'Texto livre'); if(nome === null) return; titulo = nome.trim() || 'Texto livre'; }
    var blocos = (d && d.conteudo && d.conteudo.blocos) || [{ tipo: 'titulo_peca', texto: titulo.toUpperCase() }, { tipo: 'paragrafo', texto: '' }, { tipo: 'fecho', cidade: 'Maceió/AL', data: '' }, { tipo: 'assinatura' }];
    var versoes = [];
    if(d){ try{ var v = await sb().from('documentos_editaveis_versoes').select('versao,salvo_em').eq('editavel_id', d.id).order('versao', { ascending: true }).limit(30); versoes = (v.data || []).map(function(x){ return { versao: x.versao, origem: 'pessoa', em: x.salvo_em }; }); }catch(e){} }
    var podeCriar = pode('documentos.criar');
    SagaModelosEditor.abrirTexto({
      titulo: titulo, sub: esc((pes.nome_completo || '') + (p.codigo ? ' · ' + p.codigo : '')) + (d ? ' · versão ' + d.versao : ' · novo'),
      intro: podeCriar ? 'Escreva direto aqui: cada linha é um parágrafo (o tipo fica à esquerda: título, parágrafo, citação...). **texto** sai em negrito e versalete; __texto__ só em negrito. "Salvar" grava uma versão nova (nada se apaga). "Ver como vai sair" mostra no papel timbrado; "Prévia em Word" baixa o Word.' : 'Só leitura (seu perfil não cria documentos).',
      blocos: blocos, podeCorrigir: podeCriar, versoes: versoes,
      msgSalvo: function(r){ return 'Salvo (versão ' + ((r && r.versao) || '') + '). As versões anteriores continuam guardadas.'; },
      aoSalvar: async function(bl){
        var r = await sb().rpc('editavel_salvar', { p_id: d ? d.id : null, p_tipo: 'texto', p_titulo: titulo, p_conteudo: { blocos: bl }, p_versao_base: d ? d.versao : null,
          p_processo_id: d ? null : p.id, p_pessoa_id: null, p_pasta_id: null, p_modelo: null, p_calculo_id: null, p_nota: null });
        if(r.error) throw new Error((window.sagaErroBanco?window.sagaErroBanco(r.error):r.error.message));
        if(!d) d = { id: r.data.id, versao: r.data.versao, titulo: titulo }; else d.versao = r.data.versao;
        desenhar();
        return { versao: r.data.versao };
      },
      aoVer: window.SagaVisor ? function(bl){ SagaVisor.abrir({ titulo: titulo, sub: (pes.nome_completo || '') + ' · como vai sair', carregando: 'Montando no papel timbrado...',
        obter: async function(){ var t = await timbradoPadrao(); return await SagaTimbrado.gerar({ sb: sb(), timbrado: t, blocos: bl, formato: 'pdf', titulo: titulo }); } }); } : null,
      aoPrevia: async function(bl){ var t = await timbradoPadrao(); var g = await SagaTimbrado.gerar({ sb: sb(), timbrado: t, blocos: bl, formato: 'docx', titulo: titulo }); SagaTimbrado.baixar(g.bytes, SagaTimbrado.nomeArquivo(titulo + ' - ' + (pes.nome_completo || '')) + '.docx', g.tipo); }
    });
  }

  /* acompanha a troca de processo da ficha (a renderRelatorios é chamada a cada troca) */
  function ligar(){
    if(typeof window.renderRelatorios === 'function' && !window.renderRelatorios._editaveis){
      var orig = window.renderRelatorios;
      window.renderRelatorios = function(){ var r = orig.apply(this, arguments); try{ desenhar(); }catch(e){} return r; };
      window.renderRelatorios._editaveis = true;
    }
    desenhar();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
  window.SagaEditaveisFicha = { desenhar: desenhar, abrirTexto: abrirTexto };
})();
