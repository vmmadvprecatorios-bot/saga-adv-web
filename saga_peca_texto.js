/* saga_peca_texto.js · Petição da Renata como TEXTO no SAGA (20/11/2026, Dr. Victor)
   A Renata grava a petição como texto (agente_pecas.texto). Em Meu dia > Para aprovar, quem aprova
   lê e corrige no editor (SagaModelosEditor.abrirTexto; cada salvar = versão nova pela agente_peca_texto_salvar).
   Depois de aprovar, o Word/PDF final é gerado AQUI no navegador (SagaTimbrado, no timbrado da peça),
   sobe para documentos-clientes/<processo>/... e é registrado na pasta Petições (agente_peca_arquivo_final).
   Uso: SagaPecaTexto.abrir(pecaId, {aoSalvar}) · SagaPecaTexto.gerarFinal(pecaId, 'docx'|'pdf', {baixar}) */
window.SagaPecaTexto = (function(){
  'use strict';
  function sb(){ return window._sb; }
  function esc(v){ var d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; }
  function erro(e){ return (e && e.message) || String(e || 'erro desconhecido'); }

  async function ler(pecaId){
    var r = await sb().rpc('agente_peca_texto_ler', { p_peca: pecaId });
    if(r.error) throw new Error(r.error.message || String(r.error));
    if(!r.data || !r.data.texto) throw new Error('Esta petição não tem texto no SAGA.');
    return r.data;
  }
  async function timbrado(chave){
    if(!window.SagaTimbrado) throw new Error('O gerador de petições não carregou nesta tela (atualize a página).');
    var ts = await SagaTimbrado.listar(sb());
    var t = ts.filter(function(x){ return x.chave === (chave || 'vmm'); })[0];
    if(!t) throw new Error('O papel timbrado "' + (chave || 'vmm') + '" não está guardado no SAGA (Modelos > Petições e timbrados).');
    return t;
  }
  function nomeBase(d){
    return SagaTimbrado.nomeArquivo((d.titulo || 'Peticao') + (d.cliente ? ' - ' + d.cliente : '') + ' - v' + (d.versao || 1));
  }

  async function abrir(pecaId, o){
    o = o || {};
    if(!window.SagaModelosEditor || !SagaModelosEditor.abrirTexto){ alert('O editor não carregou nesta tela (atualize a página).'); return; }
    var d;
    try{ d = await ler(pecaId); }
    catch(e){ if(window.showToast) showToast('Não consegui abrir o texto: ' + erro(e), 'error'); else alert('Não consegui abrir o texto: ' + erro(e)); return; }
    var falt = (d.faltando || []).filter(Boolean);
    SagaModelosEditor.abrirTexto({
      titulo: d.titulo || 'Petição',
      sub: esc((d.cliente || '') + (d.codigo ? ' · ' + d.codigo : '')) + ' · versão ' + esc(d.versao) + (d.modelo ? ' · modelo: ' + esc(d.modelo) : ''),
      aviso: falt.length ? '<b>Faltou na ficha:</b> ' + falt.map(esc).join(', ') + '. Esses pontos estão marcados com ⟦[ ]⟧ no texto.' : '',
      blocos: d.texto,
      podeCorrigir: !!d.pode_corrigir,
      versoes: d.versoes || [],
      aoSalvar: async function(blocos){
        var r = await sb().rpc('agente_peca_texto_salvar', { p_peca: pecaId, p_blocos: blocos, p_versao_base: d.versao });
        if(r.error) throw new Error(r.error.message || String(r.error));
        if(r.data && r.data.versao) d.versao = r.data.versao;
        if(o.aoSalvar) try{ o.aoSalvar(); }catch(e){}
        return r.data;
      },
      aoPrevia: async function(blocos){
        var t = await timbrado(d.timbrado_chave);
        var g = await SagaTimbrado.gerar({ sb: sb(), timbrado: t, blocos: blocos, formato: 'docx', titulo: d.titulo });
        SagaTimbrado.baixar(g.bytes, 'PREVIA - ' + nomeBase(d) + '.docx', g.tipo);
      }
    });
  }

  /* Gera o arquivo final (só depois de aprovar), guarda na pasta Petições e, se pedir, baixa. */
  async function gerarFinal(pecaId, formato, o){
    o = o || {}; formato = formato === 'pdf' ? 'pdf' : 'docx';
    var d = await ler(pecaId);
    var t = await timbrado(d.timbrado_chave);
    var g = await SagaTimbrado.gerar({ sb: sb(), timbrado: t, blocos: d.texto, formato: formato, titulo: d.titulo });
    var nome = nomeBase(d) + ' - ' + (t.nome || '') + '.' + formato;
    var caminho = d.processo_id + '/' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + '_' + nome.replace(/[^a-zA-Z0-9._-]/g, '_');
    var tipo = formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    var up = await sb().storage.from('documentos-clientes').upload(caminho, new Blob([g.bytes], { type: tipo }), { contentType: tipo, upsert: false });
    if(up.error) throw new Error('não consegui guardar o arquivo na pasta do cliente: ' + (up.error.message || up.error));
    var reg = await sb().rpc('agente_peca_arquivo_final', { p_peca: pecaId, p_caminho: caminho, p_nome: nome, p_tamanho: g.bytes.length, p_formato: formato });
    if(reg.error){
      try{ await sb().storage.from('documentos-clientes').remove([caminho]); }catch(e){}
      throw new Error(reg.error.message || String(reg.error));
    }
    if(o.baixar) SagaTimbrado.baixar(g.bytes, nome, tipo);
    return reg.data;
  }

  return { abrir: abrir, gerarFinal: gerarFinal };
})();
