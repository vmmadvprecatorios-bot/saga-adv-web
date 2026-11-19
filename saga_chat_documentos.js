/* SAGA · Chat > grupo "Recebimento de documentação" (T194 etapa 6, 19/11/2026, Dr. Victor; bloco 268)
   Enquanto o WhatsApp, o e-mail e as cartas não entram no SAGA, as localizadoras e captadoras soltam no grupo os
   documentos que os clientes mandam. O "robô" marca cada arquivo de documento (PDF, imagem, Word...) como DOCUMENTO
   e, embaixo dele, a colaboradora diz de quem é: "Mandar para a ficha" (cliente > processo/cartão > pasta) copia o
   arquivo para a pasta do cliente na ficha (documentos-clientes, como a ficha faz) e marca o destino
   (chat_anexo_destino); "Não é documento de cliente" tira da fila. O arquivo continua também no chat.
   Uso pela tela do Chat: SagaChatDocs.ehGrupo(conv), .selo(anexo), .faixa(mensagens), .encaminhar(anexoId, aoTerminar) */
window.SagaChatDocs = (function(){
  'use strict';
  var BUCKET = 'documentos-clientes';
  var G = { anexo: null, pessoa: null, busca: 0, aoTerminar: null };
  function sb(){ return window._sb; }
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; }
  function $(id){ return document.getElementById(id); }
  function reduzido(){ try{ return localStorage.getItem('saga-movimento') === 'reduzido'; }catch(e){ return false; } }
  function novoId(){ try{ return crypto.randomUUID(); }catch(e){ return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); } }
  function cnj(n){ try{ return window.sagaFmt && sagaFmt.cnj ? sagaFmt.cnj(n) : n; }catch(e){ return n; } }

  function ehGrupo(conv){ return !!(conv && conv.finalidade === 'documentos'); }
  /* o "robô": é documento? (PDF, imagem, Word, Excel, texto, planilha aberta) */
  function ehDocumento(a){
    var n = String((a && a.nome_arquivo) || '').toLowerCase(), t = String((a && a.tipo_mime) || '').toLowerCase();
    return /\.(pdf|jpe?g|png|gif|webp|heic|heif|tiff?|bmp|docx?|odt|rtf|txt|xlsx?|ods|csv)$/.test(n) || /^image\//.test(t) || /pdf|word|officedocument|opendocument|text\//.test(t);
  }
  function pendente(a){ return ehDocumento(a) && !a.destino_documento_id && !a.ignorado; }
  function selo(a){
    if(!ehDocumento(a)) return '';
    if(a.destino_documento_id){
      var nome = (a.destino_pessoa && a.destino_pessoa.nome_completo) || 'cliente';
      var link = a.destino_processo_id ? 'ficha_cliente_padrao_metalico_FINAL.html?processo_id=' + encodeURIComponent(a.destino_processo_id)
        : (a.destino_pessoa_id ? 'ficha_cliente_padrao_metalico_FINAL.html?pessoa_id=' + encodeURIComponent(a.destino_pessoa_id) : '');
      return '<div class="cd-selo ok"><span>✓ Na ficha de ' + (link ? '<a href="' + esc(link) + '">' + esc(nome) + '</a>' : esc(nome)) + '</span></div>';
    }
    if(a.ignorado) return '<div class="cd-selo nao"><span>Não é documento de cliente</span><button type="button" data-cd-encaminhar="' + esc(a.id) + '">Mandar para a ficha</button></div>';
    return '<div class="cd-selo pend"><span class="cd-tag">Documento</span><button type="button" class="pri" data-cd-encaminhar="' + esc(a.id) + '">Mandar para a ficha</button>'
      + '<button type="button" data-cd-ignorar="' + esc(a.id) + '">Não é documento de cliente</button></div>';
  }
  function faixa(mensagens){
    var n = 0, primeiro = null;
    (mensagens || []).forEach(function(m){ (m.anexos || []).forEach(function(a){ if(pendente(a)){ n++; if(!primeiro) primeiro = m.id; } }); });
    if(!n) return '<div class="cd-faixa ok">Todos os documentos deste grupo já foram encaminhados para as fichas.</div>';
    return '<div class="cd-faixa"><b>' + n + (n === 1 ? ' documento' : ' documentos') + ' para encaminhar</b> <span>Diga de quem é cada arquivo: "Mandar para a ficha" guarda na pasta do cliente.</span>'
      + (primeiro ? ' <button type="button" data-cd-ir="' + esc(primeiro) + '">Ir para o primeiro</button>' : '') + '</div>';
  }

  function css(){
    if($('sagaChatDocsCss')) return;
    var s = document.createElement('style'); s.id = 'sagaChatDocsCss';
    s.textContent = [
      '.cd-selo{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:5px;font-size:11.5px;color:var(--muted)}',
      '.cd-selo .cd-tag{font-weight:600;color:var(--gold);padding:2px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);background:color-mix(in srgb,var(--gold) 10%,transparent)}',
      '.cd-selo.ok span{color:#16a34a}.cd-selo.ok a{color:inherit;text-decoration:underline}',
      '.cd-selo button,.cd-faixa button,#cdModal .cd-botoes button{font:inherit;font-size:11.5px;padding:4px 10px;border-radius:9px;border:1px solid var(--sb-sec-borda,var(--border));background:var(--sb-sec,transparent);color:var(--text);cursor:pointer}',
      '.cd-selo button.pri,#cdModal .cd-botoes button.pri{background:var(--sb-acao);border-color:var(--sb-acao-borda)}',
      '.cd-faixa{margin:8px 12px;padding:8px 12px;border-radius:12px;font-size:12px;border:1px solid color-mix(in srgb,#eab308 55%,transparent);background:color-mix(in srgb,#eab308 9%,transparent);display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
      '.cd-faixa span{color:var(--muted)}.cd-faixa.ok{border-color:var(--border);background:transparent;color:var(--muted)}',
      '#cdModal{position:fixed;inset:0;z-index:1300;display:flex;align-items:safe center;justify-content:center;padding:24px 16px;overscroll-behavior:contain;background:color-mix(in srgb,#000 55%,transparent);opacity:0;visibility:hidden;transition:opacity .3s cubic-bezier(.22,.78,.25,1),visibility .3s}',
      '#cdModal.aberto{opacity:1;visibility:visible}#cdModal.sem-movimento{transition:none}',
      '#cdModal .cd-caixa{background:var(--panel-solid,var(--panel));color:var(--text);border:1px solid var(--border);border-radius:16px;width:min(560px,100%);box-sizing:border-box;max-height:100%;min-height:min(440px,100%);overflow:auto;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.35);overscroll-behavior:contain}',
      '#cdModal h3{margin:0 0 4px;font-size:17px}#cdModal .cd-sub{color:var(--muted);font-size:12.5px;margin-bottom:10px;word-break:break-word}',
      '#cdModal label{display:block;font-size:11.5px;color:var(--muted);margin:10px 0 4px}#cdModal input[type=text],#cdModal select{width:100%}',
      '#cdModal .cd-lista{display:flex;flex-direction:column;gap:4px;margin-top:6px;max-height:240px;overflow:auto}',
      '#cdModal .cd-lista button{display:flex;justify-content:space-between;gap:8px;text-align:left;font:inherit;font-size:12.5px;padding:7px 10px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer}',
      '#cdModal .cd-lista button small{color:var(--muted)}#cdModal .cd-lista .vazio{font-size:12px;color:var(--muted);padding:4px 2px}',
      '#cdModal .cd-escolhido{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;padding:8px 10px;border:1px solid var(--border);border-radius:10px}',
      '#cdModal .cd-escolhido button{font:inherit;font-size:11.5px;padding:4px 10px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer}',
      '#cdModal .cd-botoes{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px}#cdModal .cd-botoes button{font-size:12.5px;padding:8px 14px}',
      '#cdModal .cd-botoes button[disabled]{opacity:.55;cursor:not-allowed}',
      '#cdModal .cd-erro{color:#dc2626;font-size:12.5px;margin-top:8px}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function modal(){
    var m = $('cdModal'); if(m) return m;
    css();
    m = document.createElement('div'); m.id = 'cdModal'; m.setAttribute('data-saga-movimento-proprio', '1');
    m.innerHTML = '<div class="cd-caixa" role="dialog" aria-modal="true" aria-labelledby="cdTitulo">'
      + '<h3 id="cdTitulo">Mandar para a ficha do cliente</h3><div class="cd-sub" id="cdArquivo"></div>'
      + '<div id="cdBuscaBloco"><label for="cdBusca">De quem é este documento?</label><input type="text" id="cdBusca" autocomplete="off" placeholder="Nome, CPF, código (VMM-...) ou número do processo"><div class="cd-lista" id="cdLista"></div></div>'
      + '<div class="cd-escolhido" id="cdEscolhido" hidden></div>'
      + '<label for="cdProcesso">Cartão / processo</label><select id="cdProcesso" disabled><option value="">Escolha o cliente primeiro</option></select>'
      + '<label for="cdPasta">Pasta</label><select id="cdPasta" disabled><option value="">Documentos (sem pasta)</option></select>'
      + '<div id="cdErro"></div>'
      + '<div class="cd-botoes"><button type="button" id="cdCancelar">Cancelar</button><button type="button" class="pri" id="cdGuardar" disabled>Guardar na ficha</button></div></div>';
    m.addEventListener('click', function(e){ if(e.target === m) fechar(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && m.classList.contains('aberto')) fechar(); });
    document.body.appendChild(m);
    var t = null;
    $('cdBusca').addEventListener('input', function(){ clearTimeout(t); t = setTimeout(buscar, 350); });
    $('cdLista').addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      if(b.getAttribute('data-pes')) escolherPessoa({ id: b.getAttribute('data-pes'), nome_completo: b.getAttribute('data-nome'), codigo: b.getAttribute('data-codigo') });
      else if(b.getAttribute('data-proc-pes')) escolherPessoa({ id: b.getAttribute('data-proc-pes'), nome_completo: b.getAttribute('data-nome') }, b.getAttribute('data-proc'));
    });
    $('cdProcesso').addEventListener('change', conferir);
    $('cdCancelar').onclick = fechar;
    $('cdGuardar').onclick = guardar;
    return m;
  }
  function fechar(){ var m = $('cdModal'); if(m) m.classList.remove('aberto'); }
  function conferir(){ $('cdGuardar').disabled = !(G.pessoa && $('cdProcesso').value); }
  function mostrarBusca(){
    G.pessoa = null; $('cdEscolhido').hidden = true; $('cdBuscaBloco').hidden = false;
    $('cdProcesso').innerHTML = '<option value="">Escolha o cliente primeiro</option>'; $('cdProcesso').disabled = true;
    $('cdPasta').innerHTML = '<option value="">Documentos (sem pasta)</option>'; $('cdPasta').disabled = true; conferir();
  }
  async function buscar(){
    var t = $('cdBusca').value.trim(), n = ++G.busca, lista = $('cdLista');
    if(t.length < 2){ lista.innerHTML = ''; return; }
    lista.innerHTML = '<div class="vazio">Procurando…</div>';
    try{
      var r = await sb().rpc('busca_global', { p_termo: t }); if(n !== G.busca) return;
      if(r.error) throw r.error;
      var d = r.data || {}, pes = (d.pessoas || []).slice(0, 12), pro = (d.processos || []).slice(0, 8);
      var h = pes.map(function(p){ return '<button type="button" data-pes="' + esc(p.id) + '" data-nome="' + esc(p.nome_completo || '') + '" data-codigo="' + esc(p.codigo || '') + '"><span>' + esc(p.nome_completo || '(sem nome)') + '</span><small>' + esc(p.codigo || '') + '</small></button>'; }).join('')
        + pro.filter(function(p){ return p.pessoa_id; }).map(function(p){ return '<button type="button" data-proc="' + esc(p.id) + '" data-proc-pes="' + esc(p.pessoa_id) + '" data-nome="' + esc((p.pessoa && p.pessoa.nome_completo) || '') + '"><span>' + esc((p.pessoa && p.pessoa.nome_completo) || 'Processo') + '</span><small>' + esc(p.codigo || cnj(p.numero_processo_cnj) || '') + '</small></button>'; }).join('');
      lista.innerHTML = h || '<div class="vazio">Nada encontrado para "' + esc(t) + '". Confira o nome, o CPF ou o código; cliente novo se cadastra na Captação (Novo).</div>';
    }catch(e){ if(n === G.busca) lista.innerHTML = '<div class="vazio" style="color:#dc2626">A busca falhou: ' + esc((e && e.message) || 'erro') + '</div>'; }
  }
  async function escolherPessoa(p, procId){
    G.pessoa = p; $('cdBuscaBloco').hidden = true; $('cdLista').innerHTML = '';
    var ch = $('cdEscolhido'); ch.hidden = false;
    ch.innerHTML = '<b>' + esc(p.nome_completo || 'Cliente') + (p.codigo ? ' · ' + esc(p.codigo) : '') + '</b><button type="button" id="cdTrocar">Trocar</button>';
    $('cdTrocar').onclick = function(){ mostrarBusca(); $('cdBusca').focus(); };
    $('cdProcesso').innerHTML = '<option value="">Carregando…</option>'; $('cdProcesso').disabled = true; $('cdPasta').disabled = true;
    try{
      var r1 = await sb().from('processos').select('id,codigo,numero_processo_cnj,criado_em,status:status_funil(nome,fase),tese:teses(nome)').eq('pessoa_id', p.id).or('excluido_logico.is.null,excluido_logico.eq.false').order('criado_em', { ascending: true });
      if(r1.error) throw r1.error;
      var r2 = await sb().from('pastas_cliente').select('id,nome,pai_id').eq('pessoa_id', p.id).eq('ativo', true);
      if(r2.error) throw r2.error;
      if(G.pessoa !== p) return;
      if(!p.codigo){ var r3 = await sb().from('pessoas').select('nome_completo,codigo').eq('id', p.id).maybeSingle(); if(r3.data){ p.nome_completo = r3.data.nome_completo; p.codigo = r3.data.codigo; ch.querySelector('b').textContent = p.nome_completo + (p.codigo ? ' · ' + p.codigo : ''); } }
      var procs = r1.data || [];
      $('cdProcesso').innerHTML = procs.length ? procs.map(function(x){
        var fase = x.status && x.status.fase === 'captacao' ? 'Captação' : (x.status && x.status.fase === 'juridico' ? 'Jurídico' : '');
        return '<option value="' + esc(x.id) + '">' + esc([x.codigo, x.tese && x.tese.nome, fase ? fase + (x.status.nome ? ': ' + x.status.nome : '') : '', x.numero_processo_cnj ? cnj(x.numero_processo_cnj) : ''].filter(Boolean).join(' · ')) + '</option>';
      }).join('') : '<option value="">Este cliente não tem cartão: cadastre na Captação (Novo) e volte aqui</option>';
      if(procId) $('cdProcesso').value = procId;
      $('cdProcesso').disabled = !procs.length;
      var mapa = {}; (r2.data || []).forEach(function(x){ mapa[x.id] = x; });
      function cam(x){ var n = [], k = 0; while(x && k < 10){ n.unshift(x.nome); x = mapa[x.pai_id]; k++; } return n.join(' / '); }
      var pastas = (r2.data || []).map(function(x){ return { id: x.id, nome: cam(x) }; }).sort(function(a, b){ return a.nome.localeCompare(b.nome, 'pt-BR'); });
      var chave = function(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
      $('cdPasta').innerHTML = '<option value="">Documentos (sem pasta)</option>' + pastas.map(function(x){ return '<option value="' + esc(x.id) + '">' + esc(x.nome) + '</option>'; }).join('');
      var pessoal = pastas.filter(function(x){ return chave(x.nome) === 'documentos pessoais'; })[0];
      if(pessoal) $('cdPasta').value = pessoal.id;
      $('cdPasta').disabled = false;
    }catch(e){ $('cdErro').innerHTML = '<div class="cd-erro">Não consegui ler os cartões e as pastas deste cliente. Motivo: ' + esc((e && e.message) || 'erro') + '.</div>'; }
    conferir();
  }
  function encaminhar(anexo, aoTerminar){
    G.anexo = anexo; G.aoTerminar = aoTerminar;
    var m = modal();
    $('cdArquivo').textContent = 'Arquivo: ' + (anexo.nome_arquivo || '');
    $('cdErro').innerHTML = ''; $('cdBusca').value = ''; $('cdLista').innerHTML = ''; mostrarBusca();
    m.classList.toggle('sem-movimento', reduzido());
    requestAnimationFrame(function(){ m.classList.add('aberto'); setTimeout(function(){ try{ $('cdBusca').focus(); }catch(e){} }, 80); });
  }
  async function guardar(){
    var a = G.anexo, procId = $('cdProcesso').value, pastaId = $('cdPasta').value || null, b = $('cdGuardar'), err = $('cdErro');
    if(!a || !G.pessoa || !procId) return;
    b.disabled = true; b.textContent = 'Guardando…'; err.innerHTML = '';
    var caminho = null;
    try{
      var s = await sb().auth.getSession(); var uid = s.data && s.data.session && s.data.session.user && s.data.session.user.id;
      if(!uid) throw new Error('sua sessão expirou; entre de novo no SAGA');
      var us = await sb().from('usuarios').select('id').eq('auth_user_id', uid).maybeSingle();
      if(us.error || !us.data) throw new Error('não achei o seu cadastro de usuário');
      var dl = await sb().storage.from('chat-anexos').download(a.caminho_storage);
      if(dl.error) throw new Error('não consegui baixar o arquivo do chat (' + dl.error.message + ')');
      var nome = a.nome_arquivo || 'documento';
      caminho = procId + '/' + novoId() + '_' + nome.replace(/[^a-zA-Z0-9._-]/g, '_');
      var tipo = a.tipo_mime || dl.data.type || 'application/octet-stream';
      var up = await sb().storage.from(BUCKET).upload(caminho, dl.data, { contentType: tipo });
      if(up.error){ caminho = null; throw new Error('o envio para a pasta do cliente falhou (' + up.error.message + ')'); }
      var ext = (nome.split('.').pop() || '').toLowerCase();
      var ins = await sb().from('documentos').insert({ processo_id: procId, pessoa_id: G.pessoa.id, usuario_id: us.data.id, nome_arquivo: nome, caminho_storage: caminho,
        tipo_documento: ext === 'pdf' ? 'pdf' : (/^image\//.test(tipo) ? 'imagem' : (ext || 'arquivo')), tamanho_bytes: a.tamanho_bytes || dl.data.size, pasta_id: pastaId, visivel_portal_cliente: false, excluido_logico: false }).select('id').single();
      if(ins.error){
        var rm = await sb().storage.from(BUCKET).remove([caminho]);
        throw new Error((ins.error.message || 'o registro do documento foi recusado') + (rm.error ? ' (e o arquivo enviado ficou solto: avise o administrador)' : ''));
      }
      var dest = await sb().rpc('chat_anexo_destino', { p_anexo: a.id, p_documento: ins.data.id });
      if(dest.error) throw new Error('o documento foi guardado na ficha, mas o chat não marcou o destino (' + dest.error.message + ')');
      a.destino_documento_id = ins.data.id; a.destino_pessoa_id = G.pessoa.id; a.destino_processo_id = procId; a.ignorado = false;
      a.destino_pessoa = { nome_completo: G.pessoa.nome_completo };
      fechar();
      if(typeof G.aoTerminar === 'function'){ try{ G.aoTerminar(a, 'Guardado na ficha de ' + (G.pessoa.nome_completo || 'cliente') + '.'); }catch(e){} }
    }catch(e){
      err.innerHTML = '<div class="cd-erro"><b>Não guardou:</b> ' + esc(e.message || e) + '.</div>';
    }finally{ b.textContent = 'Guardar na ficha'; conferir(); }
  }
  async function ignorar(anexo){
    var r = await sb().rpc('chat_anexo_destino', { p_anexo: anexo.id, p_ignorar: true });
    if(r.error) throw new Error(r.error.message);
    anexo.ignorado = true;
  }
  try{ if(document.head) css(); }catch(e){}
  return { ehGrupo: ehGrupo, ehDocumento: ehDocumento, pendente: pendente, selo: selo, faixa: faixa, encaminhar: encaminhar, ignorar: ignorar, css: css };
})();
