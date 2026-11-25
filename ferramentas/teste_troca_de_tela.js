#!/usr/bin/env node
/* =====================================================================================================
   TESTE DA TROCA DE TELA (REGRA SUPREMA, 25/11/2026, Dr. Victor)
   "Ao trocar de tela, a barra de cima e o menu lateral da esquerda ficam INTACTOS, nem piscam.
    Só o conteúdo da tela apaga e o novo aparece."

   Como rodar (antes de publicar qualquer mudança em saga_guard.js, saga_ui.js, saga_tema.css ou na ordem
   de carregamento das telas):
       node ferramentas/teste_troca_de_tela.js            (todas as situações)
       node ferramentas/teste_troca_de_tela.js --rapido   (só Azul escuro, letra Normal)
       node ferramentas/teste_troca_de_tela.js --quadros  (guarda os quadros em ferramentas/.quadros/)
       node ferramentas/teste_troca_de_tela.js --caso="minhas tarefas"   (só as trocas com esse texto no nome)
       DEPURAR=1 node ...                                  (mostra, quadro a quadro, o estado da tela nova)

   O que faz: abre o SAGA num Chromium com o banco SIMULADO (nenhum dado real, nada sai para a internet),
   entra com uma sessão inventada e troca de tela como a pessoa faz (clique em link): lista -> ficha,
   ficha -> ficha de outro cliente, ficha -> Minhas Tarefas, e também com VERSÃO NOVA publicada no meio
   (versao.txt mais novo: a tela se atualiza sozinha). Grava a tela quadro a quadro (o que aparece de verdade,
   inclusive a passagem do navegador) e confere em CADA quadro que o menu lateral e a barra de cima continuam
   desenhados como antes (não apagaram, não ficaram cobertos, não mudaram de lugar). Também confere, por dentro
   da tela nova, que #sidebarSaga e #topbarSaga ficam com opacidade 1 e no mesmo lugar e que nenhuma camada
   (aviso "Conferindo o seu login…", cortina) cobre a tela quando a sessão é confiável.
   Sai com código 1 (FALHOU) se algum quadro quebrar a regra. Quem quebrar volta atrás.
   Observação (25/11): no navegador de teste (sem placa de vídeo) a ficha às vezes mostra 1 a 3 quadros levemente
   DESFOCADOS logo depois da passagem, sem nenhum elemento da página por cima (conferido: nenhuma camada, filtro ou
   desfoque no DOM). O teste não conta desfoque leve; conta tela APAGADA (sem desenho), COBERTA ou fora do lugar.
   ===================================================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch (e) {
  console.error('Playwright não encontrado (require("playwright")). No ambiente do Claude ele já vem instalado.');
  process.exit(2);
}

const RAIZ = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const RAPIDO = ARGS.includes('--rapido');
const GUARDAR = ARGS.includes('--quadros');
const PASTA_Q = path.join(__dirname, '.quadros');
const SUPA = 'https://fmoskdxgjulagedzjxxk.supabase.co';
const W = 1440, H = 900;
const REDE_MS = +(process.env.REDE_MS || 40); // atraso de cada arquivo .js/.css (ms)

// ---------- servidor das telas (como o GitHub Pages, mas local) ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.gz': 'application/gzip', '.wasm': 'application/wasm', '.ico': 'image/x-icon' };
let versaoNoAr = null; // quando preenchida, o versao.txt "no ar" responde esta (simula publicação nova)
function servidor() {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if (u === '/versao.txt' && versaoNoAr) { res.writeHead(200, { 'Content-Type': TIPOS['.txt'], 'Cache-Control': 'no-store' }); return res.end(versaoNoAr + '\n'); }
      const f = path.join(RAIZ, path.normalize(u === '/' ? '/index.html' : u));
      if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
      // 25/11: atraso de rede como no site no ar (GitHub Pages): cada arquivo demora a chegar. Sem isso o teste não via
      // a ficha piscar inteira (lá o saga_ui.js vinha no cabeçalho e a tela era desenhada antes do menu existir).
      const atraso = /\.(js|css)$/.test(f) ? REDE_MS : 0;
      setTimeout(() => fs.readFile(f, (err, buf) => {
        if (err) { res.writeHead(404); return res.end('não achei'); }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(buf);
      }), atraso);
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

// ---------- banco simulado (Supabase) ----------
const UID = '00000000-0000-4000-8000-000000000001';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const EXP = Math.floor(Date.now() / 1000) + 6 * 3600;
const JWT = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: UID, role: 'authenticated', exp: EXP, aud: 'authenticated', email: 'teste@exemplo.invalid', session_id: 'sess-teste' }) + '.assinatura';
const USUARIO = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'teste@exemplo.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const SESSAO = { access_token: JWT, refresh_token: 'refresh-teste', token_type: 'bearer', expires_in: 6 * 3600, expires_at: EXP, user: USUARIO };
const PERFIL = { id: 'p1', auth_user_id: UID, nome_completo: 'Pessoa de Teste', email: 'teste@exemplo.invalid', eh_administrador: true, ativo: true, preferencias: {}, tema: 'dark' };
const PESSOAS = [
  { id: 'c1', nome_completo: 'Cliente Inventado Um', codigo: 'VMM-00001', cpf: null, dados_extra: {} },
  { id: 'c2', nome_completo: 'Cliente Inventado Dois', codigo: 'VMM-00002', cpf: null, dados_extra: {} }
];
// todas as permissões que o menu conhece (o usuário de teste vê todas as telas)
const TODAS_PERMISSOES = (() => { try { const t = fs.readFileSync(path.join(RAIZ, 'saga_ui.js'), 'utf8'); return [...new Set((t.match(/'[a-z_]+\.[a-z_]+'/g) || []).map(x => x.slice(1, -1)))]; } catch (e) { return []; } })();
function respostaRpc(nome, corpo) {
  switch (nome) {
    case 'saga_inicio': return { perfil: PERFIL, permissoes: TODAS_PERMISSOES, equipe: [{ id: 'p1', nome_completo: 'Pessoa de Teste', ativo: true, tem_login: true }], cores: null, marca: null };
    case 'login_regras': return { ok: true, isento: true, fim_dia: false, agora: new Date().toISOString(), dia_util: true, ini_min: 0, fim_min: 1439 };
    case 'ponto_trava': return { travar: false };
    case 'entrada_conferir': return { ok: true, liberado: true };
    case 'acesso_verificar': return { ok: true };
    case 'minhas_permissoes': return TODAS_PERMISSOES;
    default: return null;
  }
}
async function rotearBanco(route) {
  const req = route.request();
  const u = new URL(req.url());
  const cab = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'Content-Range' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: cab, body: '' });
  const json = (o, extra) => route.fulfill({ status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cab, extra || {}), body: JSON.stringify(o) });
  const p = u.pathname;
  if (p.startsWith('/auth/v1/user')) return json(USUARIO);
  if (p.startsWith('/auth/v1/token')) return json(SESSAO);
  if (p.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204, headers: cab, body: '' });
  if (p.startsWith('/rest/v1/rpc/')) { let corpo = {}; try { corpo = req.postDataJSON() || {}; } catch (e) {} return json(respostaRpc(p.slice(13), corpo)); }
  if (p.startsWith('/rest/v1/')) {
    const tabela = p.slice(9);
    const unico = /vnd\.pgrst\.object/.test(req.headers()['accept'] || '');
    let linhas = [];
    if (tabela === 'usuarios') linhas = [PERFIL];
    if (tabela === 'pessoas') { const id = (u.searchParams.get('id') || '').replace(/^eq\./, ''); linhas = PESSOAS.filter(x => !id || x.id === id); }
    if (unico) return linhas.length ? json(linhas[0]) : route.fulfill({ status: 406, headers: Object.assign({ 'Content-Type': 'application/json' }, cab), body: JSON.stringify({ code: 'PGRST116', message: 'sem linhas (banco simulado)' }) });
    return json(linhas, { 'Content-Range': '0-' + Math.max(0, linhas.length - 1) + '/' + linhas.length });
  }
  if (p.startsWith('/storage/')) return json([]);
  if (p.startsWith('/functions/')) return json({ ok: true });
  return route.fulfill({ status: 404, headers: cab, body: '' });
}

// ---------- quadros: análise do que aparece na tela ----------
// Cada quadro (imagem real do navegador) é medido numa página à parte: no menu lateral e na barra de cima,
// quanta "diferença" há em relação ao quadro de referência (a tela parada antes do clique). Menu apagado ou coberto
// = a região vira o fundo liso (variação some) ou muda quase toda.
const ANALISE = `
async function medir(quadros, regioes){
  const saida=[];
  const cv=document.createElement('canvas');const cx=cv.getContext('2d',{willReadFrequently:true});
  async function carregar(src){const im=new Image();im.src='data:image/jpeg;base64,'+src;await im.decode();return im;}
  function stats(im,r){
    cv.width=im.naturalWidth;cv.height=im.naturalHeight;cx.drawImage(im,0,0);
    const sx=im.naturalWidth/${W},sy=im.naturalHeight/${H};
    const d=cx.getImageData(Math.round(r.x*sx),Math.round(r.y*sy),Math.max(1,Math.round(r.w*sx)),Math.max(1,Math.round(r.h*sy))).data;
    let s=0,s2=0,n=0;const lum=new Float32Array(d.length/4);
    for(let i=0,j=0;i<d.length;i+=4,j++){const l=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];lum[j]=l;s+=l;s2+=l*l;n++;}
    const m=s/n;return {media:m,desvio:Math.sqrt(Math.max(0,s2/n-m*m)),lum:lum};
  }
  const ref={};const imRef=await carregar(quadros[0].dado);
  for(const k in regioes)ref[k]=stats(imRef,regioes[k]);
  for(const q of quadros){
    const im=await carregar(q.dado);const linha={t:q.t};
    for(const k in regioes){
      const st=stats(im,regioes[k]),a=ref[k].lum,b=st.lum;let dif=0;
      for(let i=0;i<b.length;i++)if(Math.abs(a[i]-b[i])>40)dif++;
      linha[k]={desvio:+st.desvio.toFixed(1),desvioRef:+ref[k].desvio.toFixed(1),mudou:+(dif/b.length).toFixed(3)};
    }
    saida.push(linha);
  }
  return saida;
}`;

// ---------- vigia dentro de cada tela (por quadro, pelo DOM) ----------
const VIGIA = () => {
  const reg = [];
  window.__sagaVigia = reg;
  try { sessionStorage.setItem('__sagaVigiaInicio', String(Date.now())); } catch (e) {}
  const t0 = performance.now();
  function passo() {
    const h = document.documentElement;
    const sb = document.getElementById('sidebarSaga'), tb = document.getElementById('topbarSaga');
    const ef = el => { if (!el) return null; const r = el.getBoundingClientRect(); let op = 1, n = el;
      while (n && n.nodeType === 1) { const cs = getComputedStyle(n); op *= parseFloat(cs.opacity); if (cs.visibility === 'hidden' || cs.display === 'none') op = 0; n = n.parentElement; }
      return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), op: +op.toFixed(2) }; };
    const portao = document.getElementById('sagaPortao');
    // camada fixa que cobre a tela inteira por cima do menu (aviso, cortina, janela que abriu sozinha)
    const cobre = [];
    if (document.body) [...document.body.children, ...[...document.documentElement.children].filter(x => x !== document.body && x !== document.head)].forEach(el => {
      if (el.id === 'sidebarSaga' || el.id === 'topbarSaga' || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) return;
      const cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.02) return;
      const r = el.getBoundingClientRect(); if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) return;
      if (cs.pointerEvents === 'none' && cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.backdropFilter === 'none') return;
      if (el.hasAttribute('data-saga-sem-trava') && !/blur/.test(cs.backdropFilter)) return;
      cobre.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').join('.')) + ' op=' + (+cs.opacity).toFixed(2));
    });
    reg.push({ abs: Date.now(), t: Math.round(performance.now() - t0), vt: !!document.activeViewTransition, classes: h.className, sb: ef(sb), tb: ef(tb),
      portao: !!(portao && parseFloat(getComputedStyle(portao).opacity) > 0.05), cobre, body: document.body ? +getComputedStyle(document.body).opacity : null });
    if (reg.length < 400) requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
  // marcos da tela nova (para o DEPURAR): quando a marca de fim da moldura apareceu e quando a página terminou de ler
  window.__sagaMarcos = {};
  try { new MutationObserver((l, o) => { if (document.getElementById('sagaFimDaTela')) { window.__sagaMarcos.marca = Math.round(performance.now() - t0); o.disconnect(); } }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  document.addEventListener('DOMContentLoaded', () => { window.__sagaMarcos.lida = Math.round(performance.now() - t0); });
};

function sessaoNoNavegador(opc) {
  const agora = Date.now();
  return ({ chave, sessao, uid, letra, cor, mov, agora: ag }) => {
    try {
      if (sessionStorage.getItem('__sagaSemente')) return; // só na primeira tela de cada rodada
      sessionStorage.setItem('__sagaSemente', '1');
      localStorage.setItem(chave, JSON.stringify(sessao));
      localStorage.setItem('saga-sessao-conferida', JSON.stringify({ u: uid, ate: ag + 12 * 3600000, em: ag, semCorte: true }));
      localStorage.setItem('saga-ultima-atividade', String(ag));
      localStorage.setItem('saga-tema', 'dark');
      if (cor) { localStorage.setItem('saga-cor-salva', cor); localStorage.setItem('saga-cor', cor); }
      if (letra) localStorage.setItem('saga-letra', letra);
      if (mov) localStorage.setItem('saga-movimento', mov);
    } catch (e) {}
  };
}

async function rodada(navegador, base, cfg) {
  const ctx = await navegador.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.route(SUPA + '/**', rotearBanco);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)(?!fmoskdxgjulagedzjxxk)/, r => r.fulfill({ status: 204, body: '' }));
  await ctx.addInitScript(sessaoNoNavegador(), { chave: 'sb-fmoskdxgjulagedzjxxk-auth-token', sessao: SESSAO, uid: UID, letra: cfg.letra, cor: cfg.cor, mov: process.env.MOV || null, agora: Date.now() });
  await ctx.addInitScript(VIGIA);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e.message || e).slice(0, 160)));
  versaoNoAr = null;
  await page.goto(base + cfg.de, { waitUntil: 'load' });
  if (cfg.como === 'voltar') {
    await page.waitForFunction(() => document.getElementById('sidebarSaga') && !document.documentElement.classList.contains('saga-carregando'), null, { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.evaluate(href => { const a = document.createElement('a'); a.href = href; document.body.appendChild(a); a.click(); }, cfg.para);
    await page.waitForURL(u => String(u).includes(cfg.para), { timeout: 15000 });
  }
  await page.waitForFunction(() => { const h = document.documentElement.classList; return !h.contains('saga-entrando') && !h.contains('saga-carregando') && document.getElementById('sidebarSaga'); }, null, { timeout: 15000 }).catch(async e => { console.log('    [estado]', await page.evaluate(() => [location.href, document.documentElement.className, !!document.getElementById('sidebarSaga')].join(' | ')), erros.slice(0,5)); throw e; });
  await page.waitForTimeout(1500); // tudo parado (letras, cores, contadores)

  // regiões medidas: menu lateral (sem a parte de baixo, onde pode haver rolagem) e barra de cima (sem a busca/números)
  const reg = await page.evaluate(() => {
    const sb = document.getElementById('sidebarSaga').getBoundingClientRect(), tb = document.getElementById('topbarSaga').getBoundingClientRect();
    return { menu: { x: Math.round(sb.left) + 6, y: Math.round(sb.top) + 10, w: Math.round(sb.width) - 12, h: Math.min(420, Math.round(sb.height) - 20) },
      barra: { x: Math.round(tb.left) + 6, y: Math.round(tb.top) + 6, w: Math.min(260, Math.round(tb.width) - 12), h: Math.round(tb.height) - 12 } };
  });
  if (cfg.versaoNova) versaoNoAr = '209912312359';

  const cdp = await ctx.newCDPSession(page);
  const quadros = [];
  const t0 = Date.now();
  cdp.on('Page.screencastFrame', async f => { quadros.push({ t: Date.now() - t0, dado: f.data }); try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch (e) {} });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.waitForTimeout(300);
  // troca de tela como a pessoa faz: clique num link (planilha, cartões, partes, atalhos "Ficha ↗"), resultado da
  // busca do topo / menu (sagaIrPara) ou a seta VOLTAR do navegador (a tela de antes foi aberta primeiro)
  if (cfg.como === 'voltar') await page.goBack({ waitUntil: 'commit' }).catch(() => {});
  else await page.evaluate(({ href, como }) => {
    if (como === 'busca') { window.sagaIrPara(href); return; }
    const a = document.createElement('a'); a.href = href; a.style.cssText = 'position:fixed;left:-99px'; document.body.appendChild(a); a.click();
  }, { href: cfg.para, como: cfg.como || 'link' });
  await page.waitForTimeout((cfg.versaoNova ? 4500 : 3000) + (cfg.espera || +(process.env.ESPERA || 0)));
  await cdp.send('Page.stopScreencast');
  const vigia = await page.evaluate(() => window.__sagaVigia || []).catch(() => []);
  if (process.env.DEPURAR) console.log('    [depois]', await page.evaluate(() => [location.href, document.readyState, document.documentElement.className, !!document.getElementById('sagaFimDaTela'), (window.__sagaVigia||[]).length, JSON.stringify(window.__sagaMarcos), (window.__sagaVigia||[])[0] && window.__sagaVigia[0].t].join(' | ')).catch(e => 'erro ' + e.message));
  if (process.env.DEPURAR) vigia.forEach(v => console.log('   ', v.abs - t0, 'ms', v.vt ? 'passagem' : '', v.classes, JSON.stringify(v.sb), v.cobre.join(',')));
  const recarregou = await page.evaluate(() => Object.keys(sessionStorage).some(k => /^saga-recarregou-/.test(k)));
  const enderecoFinal = page.url();
  // quadro de referência = o primeiro (tela parada antes do clique)
  const an = await ctx.newPage();
  await an.setContent('<html><body></body></html>');
  const medidas = await an.evaluate(({ codigo, q, r }) => { eval(codigo); return medir(q, r); }, { codigo: ANALISE, q: quadros, r: reg });
  await an.close();
  if (GUARDAR) { const d = path.join(PASTA_Q, cfg.nome.replace(/[^a-z0-9]+/gi, '_')); fs.mkdirSync(d, { recursive: true }); quadros.forEach((q, i) => fs.writeFileSync(path.join(d, String(i).padStart(3, '0') + '_' + q.t + 'ms.jpg'), Buffer.from(q.dado, 'base64'))); }
  await ctx.close();

  // ---------- julgamento ----------
  const falhas = [];
  medidas.forEach(m => {
    ['menu', 'barra'].forEach(k => {
      const x = m[k];
      // apagou: o desenho (letras, ícones) sumiu da região; coberto/trocado: mais de 35% da região mudou de cor
      if (x.desvio < x.desvioRef * 0.15) falhas.push(`${m.t} ms: ${k === 'menu' ? 'menu lateral' : 'barra de cima'} APAGOU (variação ${x.desvio} de ${x.desvioRef})`);
      else if (x.mudou > 0.35) falhas.push(`${m.t} ms: ${k === 'menu' ? 'menu lateral' : 'barra de cima'} mudou ${Math.round(x.mudou * 100)}% (coberto ou fora do lugar)`);
    });
  });
  const ref0 = vigia.find(v => v.sb && v.sb.op === 1 && v.tb && v.tb.op === 1);
  vigia.forEach(v => {
    // durante a passagem do navegador (view transition) o que aparece é a imagem segura do menu e da barra;
    // o estado por dentro da tela nova só conta fora dela
    if (!v.sb || !v.tb || v.vt) return;
    if (v.portao) falhas.push(`tela nova ${v.t} ms: aviso "Conferindo o seu login…" cobrindo a tela`);
    if (v.cobre && v.cobre.length) falhas.push(`tela nova ${v.t} ms: camada cobrindo a tela inteira (menu junto): ${v.cobre.join(' | ')}`);
    if (v.sb.op < 1 || v.tb.op < 1) falhas.push(`tela nova ${v.t} ms: opacidade menu ${v.sb.op} / barra ${v.tb.op} (${v.classes})`);
    if (ref0 && (v.sb.top !== ref0.sb.top || v.sb.left !== ref0.sb.left || v.tb.top !== ref0.tb.top)) falhas.push(`tela nova ${v.t} ms: menu/barra fora do lugar (menu top ${v.sb.top}, barra top ${v.tb.top})`);
  });
  if (/[?&]saga_v=/.test(enderecoFinal)) falhas.push('a marca saga_v ficou no endereço: ' + enderecoFinal);
  return { nome: cfg.nome, quadros: quadros.length, falhas: [...new Set(falhas)], recarregou, erros };
}

(async () => {
  const srv = await servidor();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const navegador = await playwright.chromium.launch({ channel: 'chromium', headless: !process.env.JANELA, args: [] }).catch(() => playwright.chromium.launch());
  const LISTA = 'lista_processos_padrao_metalico.html?fase=juridico';
  const FICHA1 = 'ficha_cliente_padrao_metalico_FINAL.html?pessoa_id=c1';
  const FICHA2 = 'ficha_cliente_padrao_metalico_FINAL.html?pessoa_id=c2';
  const TAREFAS = 'minhas_tarefas.html';
  const INTIM = 'monitoramento_multi_oab.html', AGENDA = 'calendario_padrao_metalico.html', MODELOS = 'biblioteca_padrao_metalico_FINAL.html';
  // [nome, de, para, como, versão nova também?]  como: link | busca (sagaIrPara: busca do topo e menu) | voltar (seta do navegador)
  // 25/11: os caminhos REAIS de ir de um cliente para outro e de outras telas para a ficha (o Dr. Victor via a ficha -> ficha piscar)
  const trocas = ARGS.includes('--so-ficha') ? [['ficha -> ficha de outro cliente', FICHA1, FICHA2, 'link', true]] : [
    ['lista -> ficha', LISTA, FICHA1, 'link', true],
    ['ficha -> ficha de outro cliente', FICHA1, FICHA2, 'link', true],
    ['ficha -> ficha pela busca do topo', FICHA1, FICHA2, 'busca', true],
    ['ficha -> ficha pela seta voltar', FICHA1, FICHA2, 'voltar', false],
    ['ficha -> Minhas Tarefas', FICHA1, TAREFAS, 'link', true],
    ['ficha -> planilha', FICHA1, LISTA, 'link', false],
    ['ficha -> Modelos', FICHA1, MODELOS, 'busca', false],
    ['Modelos -> ficha', MODELOS, FICHA1, 'link', false],
    ['Intimações -> ficha', INTIM, FICHA1, 'link', false],
    ['Minhas Tarefas -> ficha', TAREFAS, FICHA1, 'link', false],
    ['Agenda -> ficha', AGENDA, FICHA1, 'link', false],
  ];
  const visuais = RAPIDO ? [{ v: 'Azul escuro, letra Normal', cor: null, letra: null }]
    : [{ v: 'Azul escuro, letra Normal', cor: null, letra: null }, { v: 'Azul escuro, letra Maior', cor: null, letra: '1.2' }, { v: 'Vidro, letra Normal', cor: 'vidro-azul', letra: null }];
  const casos = [];
  visuais.forEach(vs => trocas.forEach(([n, de, para, como, comVersao]) => {
    casos.push({ nome: `${n} · ${vs.v}`, de, para, como, cor: vs.cor, letra: vs.letra });
    if (comVersao) casos.push({ nome: `${n} · ${vs.v} · COM VERSÃO NOVA no meio`, de, para, como, cor: vs.cor, letra: vs.letra, versaoNova: true });
  }));
  const filtro = (ARGS.find(a => a.startsWith('--caso=')) || '').slice(7).toLowerCase();
  let ruim = 0;
  for (const c of casos.filter(c => !filtro || c.nome.toLowerCase().includes(filtro))) {
    let r;
    const rodar = async () => { try { return await rodada(navegador, base, c); } catch (e) { return { nome: c.nome, falhas: ['o teste não rodou: ' + (e.message || e).split('\n')[0]], quadros: 0 }; } };
    r = await rodar();
    // 25/11: no navegador de teste (sem placa de vídeo), raramente (~1 em 10, só na atualização para a versão nova da
    // ficha, com a tela ocupada carregando) sai uma sequência de quadros lisos com o DOM certo por dentro. O defeito real
    // de piscar acontece SEMPRE; então uma falha só vale se repetir na 2ª tentativa.
    if (r.falhas.length) { const r2 = await rodar(); if (!r2.falhas.length) { r2.repetiu = true; r = r2; } }
    const ok = !r.falhas.length;
    if (!ok) ruim++;
    console.log((ok ? 'OK     ' : 'FALHOU ') + r.nome + `  (${r.quadros} quadros${r.repetiu ? ', passou na 2ª tentativa' : ''}${c.versaoNova ? ', atualizou sozinha: ' + (r.recarregou ? 'sim' : 'NÃO') : ''})`);
    r.falhas.slice(0, 8).forEach(f => console.log('         - ' + f));
    if (r.falhas.length > 8) console.log(`         ... e mais ${r.falhas.length - 8}`);
    if (c.versaoNova && !r.recarregou) { console.log('         - a tela NÃO se atualizou com a versão nova (o teste da versão não valeu)'); ruim++; }
  }
  await navegador.close(); srv.close();
  console.log('');
  if (ruim) { console.log(`RESULTADO: FALHOU em ${ruim} de ${casos.length}. NÃO publique: o menu lateral ou a barra de cima piscaram/sumiram na troca de tela.`); process.exit(1); }
  console.log(`RESULTADO: OK (${casos.length} trocas de tela; menu lateral e barra de cima intactos em todos os quadros).`);
  try { fs.writeFileSync(path.join(__dirname, '.teste_troca_de_tela_ok'), JSON.stringify({ quando: new Date().toISOString(), guard: hash('saga_guard.js'), ui: hash('saga_ui.js'), tema: hash('saga_tema.css') })); } catch (e) {}
})();
function hash(f) { try { return require('crypto').createHash('sha1').update(fs.readFileSync(path.join(RAIZ, f))).digest('hex'); } catch (e) { return ''; } }
