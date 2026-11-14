/* SAGA · Layout dos e-mails dos disparos (T179 parte 2, 14/11/2026, pedido do Dr. Victor: "com cara daqueles e-mails
   informativos mais elaborados", não um bloco de texto).
   UM arquivo só, usado pelo robô (supabase/functions/disparos-email/index.ts) e pela prévia da tela (disparos_email.html,
   saga_disparos.js): o que se vê na tela é o que o cliente recebe.
   HTML de e-mail: tabelas, estilos inline, largura 600 px, sem CSS externo nem script; funciona no Gmail, Outlook/Hotmail
   e no celular. Versão em texto simples junto. Sem imagem de fora (a logo, se houver, vai ANEXADA ao e-mail, cid).
     SagaEmailLayout.montar({assunto, corpo, identidade, remetente, remetente_email, assinatura, whatsapp, anexos, logoSrc})
       -> {html, texto}
   Marcações no texto do modelo: parágrafos separados por linha em branco; **negrito**; linha começando com "# " no início
   vira o título (senão o título é o assunto); parágrafo começando com "> " vira o DESTAQUE (caixa com a cor da identidade);
   links e e-mails viram clicáveis. O último parágrafo é tirado quando só repete a assinatura ({remetente}, {escritorio},
   {remetente_email}), porque a assinatura organizada já vai no fim. */
(function (g) {
  'use strict';
  var FONTE = "Arial,'Helvetica Neue',Helvetica,sans-serif";
  var SERIFA = "Georgia,'Times New Roman',serif";
  var SAIR = 'Se não quiser mais receber nossos e-mails, responda a esta mensagem com a palavra SAIR.';

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cor(c, padrao) { return /^#[0-9a-f]{6}$/i.test(String(c || '')) ? c : padrao; }
  function clarear(hex, f) { // mistura com branco (f = 0..1 de branco)
    var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    function m(x) { return Math.round(x + (255 - x) * f); }
    return '#' + [m(r), m(gg), m(b)].map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function linkar(t, c) {
    return t.replace(/(https?:\/\/[^\s<]+)/g, function (u) { return '<a href="' + u + '" style="color:' + c + ';text-decoration:underline">' + u + '</a>'; })
      .replace(/(^|[\s(>])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, function (a, p, e) { return p + '<a href="mailto:' + e + '" style="color:' + c + ';text-decoration:underline">' + e + '</a>'; });
  }
  function negrito(t, c) { return t.replace(/\*\*([^*\n]+)\*\*/g, '<strong style="color:' + c + ';font-weight:bold">$1</strong>'); }
  function semMarcas(t) { return String(t || '').replace(/\*\*([^*\n]+)\*\*/g, '$1'); }
  function digitos(t) { return String(t || '').replace(/\D/g, ''); }
  function foneBonito(d) {
    d = digitos(d); if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 3) + ' ' + d.slice(3, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return d;
  }
  function linkWhats(d, nomeIdent) {
    d = digitos(d); if (!d) return '';
    if (d.length <= 11) d = '55' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent('Olá! Recebi o e-mail de ' + (nomeIdent || 'vocês') + ' e gostaria de conversar.');
  }
  function botao(href, rotulo, fundo, texto, borda) {
    return '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-table;margin:0 8px 10px 0"><tr><td align="center" bgcolor="' + fundo + '" style="border-radius:8px;border:1px solid ' + borda + ';mso-padding-alt:12px 22px">' +
      '<a href="' + esc(href) + '" target="_blank" style="display:inline-block;padding:12px 22px;font-family:' + FONTE + ';font-size:14px;font-weight:bold;line-height:18px;color:' + texto + ';text-decoration:none;border-radius:8px">' + esc(rotulo) + '</a></td></tr></table>';
  }
  function tamanho(b) { b = Number(b || 0); return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  function montar(o) {
    o = o || {};
    var id = o.identidade || {};
    var c1 = cor(id.cor_principal, '#0E2841'), c2 = cor(id.cor_destaque, '#C9A45C');
    var nomeId = id.nome || 'Victor Morais Advocacia';
    var remetente = o.remetente || nomeId, emailRem = o.remetente_email || '';
    var blocos = String(o.corpo || '').replace(/\r/g, '').split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
    var titulo = o.assunto || '';
    if (blocos.length && /^#\s+/.test(blocos[0])) { titulo = blocos.shift().replace(/^#\s+/, ''); }
    // tira o último parágrafo se ele só repete a assinatura (nome, escritório, e-mail) — a assinatura organizada já vai no fim
    if (blocos.length > 1) {
      var ult = blocos[blocos.length - 1].split('\n').map(function (l) { return l.trim().toLowerCase(); }).filter(Boolean);
      var sabidos = [remetente, nomeId, emailRem, id.subtitulo || ''].map(function (x) { return String(x || '').trim().toLowerCase(); }).filter(Boolean);
      if (ult.length && ult.every(function (l) { return sabidos.indexOf(l) >= 0; })) blocos.pop();
    }
    var preheader = semMarcas((blocos[1] || blocos[0] || '').replace(/^>\s*/, '')).replace(/\s+/g, ' ').slice(0, 140);
    var paras = blocos.map(function (p) {
      if (/^>\s*/.test(p)) {
        var t = negrito(linkar(esc(p.replace(/^>\s*/gm, '')), c1), c1).replace(/\n/g, '<br>');
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 20px"><tr>' +
          '<td width="4" bgcolor="' + c2 + '" style="width:4px;background:' + c2 + ';border-radius:2px"></td>' +
          '<td bgcolor="' + clarear(c2, 0.86) + '" style="background:' + clarear(c2, 0.86) + ';padding:14px 18px;font-family:' + FONTE + ';font-size:16px;line-height:24px;color:' + c1 + ';font-weight:bold">' + t + '</td></tr></table>';
      }
      return '<p style="margin:0 0 16px;font-family:' + FONTE + ';font-size:15px;line-height:24px;color:#2B3340">' + negrito(linkar(esc(p), c1), c1).replace(/\n/g, '<br>') + '</p>';
    }).join('');
    var wa = linkWhats(o.whatsapp, nomeId);
    var botoes = (wa ? botao(wa, 'Falar no WhatsApp', '#1E8E4E', '#FFFFFF', '#1E8E4E') : '') +
      (emailRem ? botao('mailto:' + emailRem + '?subject=' + encodeURIComponent('Re: ' + semMarcas(o.assunto || '')), 'Responder por e-mail', '#FFFFFF', c1, clarear(c1, 0.55)) : '');
    var anexos = (o.anexos || []).filter(function (a) { return a && a.nome; });
    var anexoHtml = anexos.length ? '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 6px"><tr><td style="padding:12px 16px;border:1px dashed ' + clarear(c1, 0.6) + ';border-radius:8px;font-family:' + FONTE + ';font-size:13px;line-height:20px;color:#4A5568">' +
      '<strong style="color:' + c1 + '">' + (anexos.length === 1 ? 'Documento anexado' : anexos.length + ' documentos anexados') + '</strong><br>' +
      anexos.map(function (a) { return esc(a.nome) + (a.tamanho ? ' <span style="color:#8A94A6">(' + tamanho(a.tamanho) + ')</span>' : ''); }).join('<br>') + '</td></tr></table>' : '';
    // assinatura organizada
    var assLinhas = String(o.assinatura || '').replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var nomeAss = assLinhas.length ? assLinhas.shift() : remetente;
    assLinhas = assLinhas.filter(function (l) { return l.toLowerCase() !== nomeId.toLowerCase(); });
    var contatos = [];
    if (emailRem) contatos.push('<a href="mailto:' + esc(emailRem) + '" style="color:' + c1 + ';text-decoration:none">' + esc(emailRem) + '</a>');
    if (digitos(o.whatsapp)) contatos.push('WhatsApp <a href="' + esc(wa) + '" style="color:' + c1 + ';text-decoration:none">' + esc(foneBonito(o.whatsapp)) + '</a>');
    var assinatura = '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px"><tr>' +
      '<td width="3" bgcolor="' + c2 + '" style="width:3px;background:' + c2 + '"></td><td style="padding:2px 0 2px 14px;font-family:' + FONTE + ';font-size:13px;line-height:20px;color:#4A5568">' +
      '<span style="font-family:' + SERIFA + ';font-size:17px;line-height:24px;color:' + c1 + ';font-weight:bold">' + esc(nomeAss) + '</span><br>' +
      assLinhas.map(function (l) { return esc(l) + '<br>'; }).join('') +
      '<span style="color:' + c1 + ';font-weight:bold">' + esc(nomeId) + '</span>' + (id.subtitulo ? '<span style="color:#8A94A6"> · ' + esc(id.subtitulo) + '</span>' : '') + '<br>' +
      contatos.join('<span style="color:#C3CAD5"> &nbsp;|&nbsp; </span>') + '</td></tr></table>';
    var logo = o.logoSrc ? '<img src="' + esc(o.logoSrc) + '" alt="' + esc(nomeId) + '" height="46" style="display:block;height:46px;width:auto;border:0;margin:0 0 10px">' : '';
    var rodape = String(id.rodape || '').split('\n').map(function (l) { return esc(l.trim()); }).filter(Boolean).join('<br>');
    var site = id.site ? '<a href="https://' + esc(String(id.site).replace(/^https?:\/\//, '')) + '" style="color:' + c1 + ';text-decoration:underline">' + esc(String(id.site).replace(/^https?:\/\//, '')) + '</a>' : '';

    var html = '<!DOCTYPE html><html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + esc(semMarcas(o.assunto || nomeId)) + '</title>' +
      '<style>@media only screen and (max-width:620px){.sg-c{width:100%!important}.sg-p{padding-left:20px!important;padding-right:20px!important}.sg-h1{font-size:21px!important;line-height:28px!important}}</style></head>' +
      '<body style="margin:0;padding:0;background:#EEF1F5;-webkit-text-size-adjust:100%">' +
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EEF1F5;font-size:1px;line-height:1px">' + esc(preheader) + '</div>' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EEF1F5" style="background:#EEF1F5"><tr><td align="center" style="padding:24px 10px">' +
      '<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->' +
      '<table role="presentation" class="sg-c" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #DCE2EA">' +
      // cabeçalho com a marca
      '<tr><td class="sg-p" bgcolor="' + c1 + '" style="background:' + c1 + ';padding:26px 36px 22px">' + logo +
      '<div style="font-family:' + SERIFA + ';font-size:24px;line-height:30px;color:#FFFFFF;font-weight:bold;letter-spacing:.5px">' + esc(nomeId) + '</div>' +
      (id.subtitulo ? '<div style="font-family:' + FONTE + ';font-size:11px;line-height:16px;color:' + c2 + ';letter-spacing:2px;text-transform:uppercase;margin-top:4px">' + esc(id.subtitulo) + '</div>' : '') +
      '</td></tr><tr><td height="3" bgcolor="' + c2 + '" style="height:3px;line-height:3px;font-size:0;background:' + c2 + '">&nbsp;</td></tr>' +
      // corpo
      '<tr><td class="sg-p" style="padding:34px 36px 10px">' +
      (titulo ? '<h1 class="sg-h1" style="margin:0 0 20px;font-family:' + SERIFA + ';font-size:24px;line-height:31px;color:' + c1 + ';font-weight:bold">' + negrito(esc(titulo), c1) + '</h1>' : '') +
      paras + anexoHtml +
      (botoes ? '<div style="padding:10px 0 8px">' + botoes + '</div>' : '') +
      '</td></tr>' +
      '<tr><td class="sg-p" style="padding:6px 36px 30px">' + assinatura + '</td></tr>' +
      // rodapé
      '<tr><td class="sg-p" bgcolor="#F5F7FA" style="background:#F5F7FA;padding:20px 36px 24px;border-top:1px solid #E3E8EF;font-family:' + FONTE + ';font-size:11.5px;line-height:18px;color:#7A8597">' +
      (rodape ? rodape + '<br>' : '') + (site ? site + '<br>' : '') +
      '<span style="display:inline-block;margin-top:8px;color:#8A94A6">' + esc(SAIR) + '</span></td></tr>' +
      '</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>';

    var texto = (titulo ? semMarcas(titulo) + '\n\n' : '') + blocos.map(function (p) { return semMarcas(p.replace(/^>\s*/gm, '')); }).join('\n\n') +
      (anexos.length ? '\n\nAnexo: ' + anexos.map(function (a) { return a.nome; }).join(', ') : '') +
      (wa ? '\n\nFale no WhatsApp: ' + wa : '') +
      '\n\n--\n' + nomeAss + (assLinhas.length ? '\n' + assLinhas.join('\n') : '') + '\n' + nomeId + (id.subtitulo ? ' · ' + id.subtitulo : '') +
      (emailRem ? '\n' + emailRem : '') + (digitos(o.whatsapp) ? '\nWhatsApp ' + foneBonito(o.whatsapp) : '') +
      (id.rodape ? '\n\n' + id.rodape : '') + (id.site ? '\n' + id.site : '') + '\n\n' + SAIR;
    return { html: html, texto: texto };
  }

  g.SagaEmailLayout = { montar: montar, linkWhats: linkWhats, SAIR: SAIR };
})(typeof globalThis !== 'undefined' ? globalThis : window);
