// Leitores dos e-mails de intimação dos tribunais (radar-email, blocos 380-384, 22/11/2026, pedido do Dr. Victor).
// Recebe um e-mail já aberto (remetente, assunto, data, texto/HTML) e devolve as publicações separadas, no formato da
// public.intimacao_email_receber(jsonb): { id_externo, numero, data, tribunal, orgao, classe, tipo, texto, resumo, link }.
// Arquivo sem nada do Deno: os testes rodam no Node (node supabase/functions/radar-email/testes.mjs) com textos INVENTADOS.
//
// Resultado de ler(email):
//   { situacao: 'ok', leitor, itens: [...] }            publicações achadas
//   { situacao: 'ignorado', leitor, motivo }            não é intimação (juntada, protocolo, aviso de login...)
//   { situacao: 'nao_entendido', leitor, motivo }       e-mail de tribunal que o leitor não soube separar (vai para a lista de erros)

export const VERSAO_LEITOR = 1;

/* ---------- texto ---------- */
const ENT = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ordm: "º", ordf: "ª", sect: "§", deg: "°", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»" };
export function decodificarEntidades(t) {
  return String(t || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => {
      const k = n.toLowerCase();
      if (k in ENT) return ENT[k];
      // letras acentuadas: &aacute; &ccedil; &atilde; ...
      const mapa = { acute: "\u0301", grave: "\u0300", circ: "\u0302", tilde: "\u0303", uml: "\u0308", cedil: "\u0327" };
      const mm = /^([a-z])(acute|grave|circ|tilde|uml|cedil)$/i.exec(n);
      return mm ? (mm[1] + mapa[mm[2].toLowerCase()]).normalize("NFC") : m;
    });
}
// HTML -> texto com uma linha por célula/linha de tabela/parágrafo
export function htmlParaTexto(html) {
  let t = String(html || "");
  t = t.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ");
  t = t.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) => {
    const tx = txt.replace(/<[^>]+>/g, "").trim();
    return /^https?:/i.test(href) && !tx.includes(href) ? `${tx} <${href}>` : tx;
  });
  t = t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h\d|table|tbody|ol|ul)>/gi, "\n").replace(/<(td|th)\b[^>]*>/gi, " ").replace(/<\/(td|th)>/gi, " \u2502 ").replace(/<hr\b[^>]*>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = decodificarEntidades(t);
  return t.split("\n").map((l) => l.replace(/\u2502\s*$/g, "").replace(/\s*\u2502\s*/g, " \u2502 ").replace(/[ \t\u00a0]+/g, " ").trim().replace(/^\u2502\s*/, "").replace(/\s*\u2502$/, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function linhas(t) { return String(t || "").split(/\r?\n/).map((l) => l.trim()); }
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ---------- número CNJ e tribunal ---------- */
const RE_CNJ = /\b(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})\b/;
const RE_CNJ_G = new RegExp(RE_CNJ.source, "g");
export function numeroCnj(t) { const m = RE_CNJ.exec(String(t || "")); return m ? m.slice(1).join("") : null; }
export function mascaraCnj(n) { return n && n.length === 20 ? `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16)}` : n; }
const TJ = { "01": "TJAC", "02": "TJAL", "03": "TJAP", "04": "TJAM", "05": "TJBA", "06": "TJCE", "07": "TJDFT", "08": "TJES", "09": "TJGO", "10": "TJMA", "11": "TJMT", "12": "TJMS", "13": "TJMG", "14": "TJPA", "15": "TJPB", "16": "TJPR", "17": "TJPE", "18": "TJPI", "19": "TJRJ", "20": "TJRN", "21": "TJRS", "22": "TJRO", "23": "TJRR", "24": "TJSC", "25": "TJSE", "26": "TJSP", "27": "TJTO" };
export function tribunalDoNumero(n) {
  if (!n || n.length !== 20) return null;
  const j = n.slice(13, 14), tr = n.slice(14, 16);
  if (j === "4") return "TRF" + Number(tr);
  if (j === "8") return TJ[tr] || "TJ" + tr;
  if (j === "5") return tr === "00" ? "TST" : "TRT" + Number(tr);
  if (j === "1") return "STF";
  if (j === "3") return "STJ";
  return null;
}

/* ---------- datas ---------- */
const RE_DATA = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
export function dataLocal(d, tz = "America/Maceio") {
  const x = d instanceof Date ? d : new Date(d || Date.now());
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(x);
  return p; // dd/mm/aaaa
}

/* ---------- o que NÃO é intimação ---------- */
// movimento que não pede nada do escritório (decisão do Dr. Victor, 22/11): juntada de petição/certidão, mandado, protocolo
const MOV_FORA = [
  /^juntada de (peti|certid|manifesta|procura|substabelec|documento|comprovante|guia|ar\b|aviso de receb|contrarraz|informa)/,
  /^juntad[oa] (a |o )?(peti|certid|manifesta|procura|documento)/,
  /^expedi[cç][aã]o de mandado/, /^expedid[oa] mandado/, /mandado (expedido|devolvido|cumprido|juntado)/,
  /^(confirma[cç][aã]o de )?protocolo/, /^protocolad[oa]/, /peti[cç][aã]o (intermedi[aá]ria )?protocolada/,
  /^recebid[oa]s? (os autos|a peti)/, /^remetidos os autos para (a )?(distribui|contadoria)/,
];
export function movimentoFora(m) { const s = semAcento(m).replace(/\s+/g, " ").trim(); return MOV_FORA.some((r) => r.test(s)); }

// classifica o movimento no "tipo" da intimação (mesmos nomes que a tarefa do Claude usava)
export function tipoDoMovimento(m) {
  const s = semAcento(m);
  if (/decorrid|decurso/.test(s)) return "Prazo";
  if (/intima|ciencia|vista as partes|vista a parte/.test(s)) return "Intimação";
  if (/senten/.test(s)) return "Sentença";
  if (/acord[aã]o|julgad|provimento|negado seguimento/.test(s)) return "Acórdão / julgamento";
  if (/decis/.test(s)) return "Decisão";
  if (/despach|ato ordinat|diligencia/.test(s)) return "Despacho";
  if (/requisi|precat|rpv|alvar|pagamento|levantamento|deposit/.test(s)) return "Requisição / pagamento";
  if (/transit/.test(s)) return "Trânsito em julgado";
  if (/audien|sess[aã]o|pauta/.test(s)) return "Audiência / sessão";
  if (/conclus/.test(s)) return "Conclusão";
  if (/distribu|redistribu/.test(s)) return "Distribuição";
  if (/baixa|arquiv|remetid/.test(s)) return "Baixa / remessa";
  return "Movimentação";
}
const capital = (s) => { const t = String(s || "").trim().toLowerCase(); return t.replace(/(^|[\s\-/(])([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E|Em|Para|Por|Com|A|O|Ao|Na|No)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase()); };
const limpo = (s, n = 300) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

/* ---------- avisos que não são intimação (o e-mail inteiro) ---------- */
const ASSUNTO_FORA = [
  [/alerta de (novo )?acesso|configurar novo aplicativo|alerta de seguran|c[oó]digo de (verifica|acesso)|redefini[cç][aã]o de senha|senha (alterada|expirada)/i, "aviso de login ou de segurança"],
  [/protocolo eletr[oô]nico|peti[cç][aã]o (intermedi[aá]ria |inicial )?protocolada|recibo de protocolo|confirma[cç][aã]o de protocolo/i, "confirmação de protocolo"],
];

/* ---------- PJe Push (TRF5, TRF1, TRF3, TJs com PJe) ---------- */
function lerPjePush(e, txt) {
  const L = linhas(txt);
  const campo = (rot) => { const re = new RegExp("^" + rot + "\\s*:\\s*(.*)$", "i"); for (const l of L) { const m = re.exec(l); if (m) return m[1].trim(); } return ""; };
  const numero = numeroCnj(campo("N[uú]mero do Processo")) || numeroCnj(e.assunto);
  if (!numero) return { situacao: "nao_entendido", leitor: "pje_push", motivo: "PJe Push sem o número do processo" };
  const movs = [];
  let dentro = false;
  for (const l of L) {
    if (/^data\s*[-–]?\s*movimento/i.test(l) || /^data\s+movimento/i.test(l)) { dentro = true; continue; }
    if (dentro && /^caso n[aã]o tenha|^aten[cç][aã]o/i.test(l)) break;
    const m = /^(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?\s*(?:[-–]\s*)?(.+)$/.exec(l.replace(/^\u2502\s*/, ""));
    if (dentro && m) {
      const desc = m[3].replace(/<https?:[^>]+>/g, "").replace(/\s*\u2502\s*/g, " · ").trim();
      if (desc) movs.push({ data: m[1], hora: m[2] || "", desc });
    }
  }
  if (!movs.length) return { situacao: "nao_entendido", leitor: "pje_push", motivo: "PJe Push sem a lista de movimentos" };
  const uteis = movs.filter((m) => !movimentoFora(m.desc));
  if (!uteis.length) return { situacao: "ignorado", leitor: "pje_push", motivo: "só movimentos que não são intimação (" + limpo(movs.map((m) => m.desc).join("; "), 160) + ")" };
  const principal = uteis[0];
  const orgao = campo("[ÓO]rg[aã]o"), classe = campo("Classe Judicial");
  const ativo = campo("Polo Ativo"), passivo = campo("Polo Passivo"), assunto = campo("Assunto");
  const texto = [
    `PJe Push (${tribunalDoNumero(numero) || "tribunal"}) · processo ${mascaraCnj(numero)}`,
    classe && `Classe: ${capital(classe)}`, orgao && `Órgão: ${orgao}`, assunto && `Assunto: ${assunto}`,
    ativo && `Polo ativo: ${limpo(ativo, 400)}`, passivo && `Polo passivo: ${limpo(passivo, 200)}`,
    "Movimentos:", ...uteis.map((m) => `${m.data}${m.hora ? " " + m.hora : ""} - ${m.desc}`),
  ].filter(Boolean).join("\n");
  return { situacao: "ok", leitor: "pje_push", itens: [{
    numero, data: principal.data, tribunal: tribunalDoNumero(numero), orgao: capital(orgao) || null, classe: capital(classe) || null,
    tipo: tipoDoMovimento(principal.desc), resumo: limpo(principal.desc, 300), texto,
  }] };
}

/* ---------- e-Proc (JFRJ, JFES, JFRS, TRF6, TRF2, TRF4) ---------- */
function lerEproc(e, txt) {
  const L = linhas(txt).map((l) => l.replace(/\s*\u2502\s*/g, " ").trim());
  const secao = (/EPROC\s+(.+)$/i.exec(e.assunto || "") || [])[1] || "";
  const blocos = [];
  let at = null;
  for (const l of L) {
    const mN = /^Num\.?\s*Processo\s*:\s*(.*)$/i.exec(l);
    if (mN) { at = { numero: numeroCnj(mN[1]), linhas: [] }; blocos.push(at); continue; }
    if (/^ATEN[CÇ][AÃ]O\s*:?$/i.test(l)) { at = null; continue; }
    if (at && l) at.linhas.push(l);
  }
  if (!blocos.length) return { situacao: "nao_entendido", leitor: "eproc", motivo: "e-Proc sem 'Num. Processo'" };
  const itens = [], fora = [];
  for (const b of blocos) {
    if (!b.numero) return { situacao: "nao_entendido", leitor: "eproc", motivo: "e-Proc com número de processo que não é CNJ" };
    const get = (rot) => { for (const l of b.linhas) { const m = new RegExp("^" + rot + "\\s*:\\s*(.*)$", "i").exec(l); if (m) return m[1].trim(); } return ""; };
    const mov = get("Movimenta[cç][aã]o").replace(/[\s\-–]+$/, "").replace(/\s+-\s*$/, "");
    const ev = get("Evento N[uú]mero");
    if (!mov) return { situacao: "nao_entendido", leitor: "eproc", motivo: "e-Proc sem a 'Movimentação'" };
    if (movimentoFora(mov)) { fora.push(mov); continue; }
    const iP = b.linhas.findIndex((l) => /^Partes\s*:?/i.test(l));
    const partes = iP >= 0 ? b.linhas.slice(iP + 1).filter((l) => !/^advogado\(s\)|\(\w{2}\d{4,}\)$/i.test(l)) : [];
    const resumo = mov.replace(/\s+-\s+/g, " · ") + (ev ? ` (evento ${ev})` : "");
    const tribunal = tribunalDoNumero(b.numero);
    itens.push({
      numero: b.numero, data: dataLocal(e.data), tribunal, orgao: secao ? `${secao} (e-Proc)` : null, classe: null,
      tipo: tipoDoMovimento(mov), resumo: limpo(resumo, 300),
      texto: [`e-Proc ${secao || tribunal || ""} · processo ${mascaraCnj(b.numero)}`.trim(), `Movimentação: ${mov}`, ev && `Evento: ${ev}`,
        partes.length && `Partes: ${limpo(partes.join(" "), 500)}`].filter(Boolean).join("\n"),
    });
  }
  if (!itens.length) return { situacao: "ignorado", leitor: "eproc", motivo: "só movimentos que não são intimação (" + limpo(fora.join("; "), 160) + ")" };
  return { situacao: "ok", leitor: "eproc", itens };
}

/* ---------- Recorte Digital (OAB/AL) ---------- */
function lerRecorte(e, txt) {
  const L = linhas(txt);
  const total = /(\d+)\s+publica[cç](?:[oõ]es|[aã]o)/i.exec(e.assunto || "") || /Total de Publica[cç][oõ]es\s*:\s*(\d+)/i.exec(txt);
  const ini = [];
  L.forEach((l, i) => { if (/^PUBLICA[CÇ][AÃ]O\s+\d+\s*\/\s*\d+/i.test(l)) ini.push(i); });
  if (!ini.length) {
    if (/Public\.\s*0\b/i.test(e.assunto || "") || (total && Number(total[1]) === 0) || /0 publica[cç]/i.test(txt)) return { situacao: "ignorado", leitor: "recorte", motivo: "Recorte Digital sem publicações no dia" };
    return { situacao: "nao_entendido", leitor: "recorte", motivo: "Recorte Digital sem os blocos 'PUBLICAÇÃO n / n'" };
  }
  const itens = [];
  for (let k = 0; k < ini.length; k++) {
    const B = L.slice(ini[k] + 1, k + 1 < ini.length ? ini[k + 1] : L.findIndex((l, i) => i > ini[k] && /^Total de Publica/i.test(l)) >>> 0 || L.length);
    const get = (rot) => { for (const l of B) { const m = new RegExp("^" + rot + "\\s*:\\s*(.*)$", "i").exec(l); if (m) return m[1].trim(); } return ""; };
    const numero = numeroCnj(get("Processo")) || numeroCnj(B.join(" "));
    if (!numero) return { situacao: "nao_entendido", leitor: "recorte", motivo: `publicação ${k + 1} sem número de processo` };
    const disp = (RE_DATA.exec(get("Data da Disponibiliza[cç][aã]o")) || [])[0] || dataLocal(e.data);
    const fonte = get("Fonte");
    const iF = B.findIndex((l) => /^Fonte\s*:/i.test(l));
    const tipoLinha = iF >= 0 ? (B.slice(iF + 1).find((l) => l) || "") : "";
    const corpo = B.filter((l) => l && !/^(Acesso ao documento|Identificador do documento)\s*:/i.test(l));
    const iProc = corpo.findIndex((l) => /^PROCESSO\s*:/i.test(l));
    const miolo = (iProc >= 0 ? corpo.slice(iProc + 1) : corpo).filter((l) => !/^(POLO (ATIVO|PASSIVO)|ADVOGADO)\s*:/i.test(l)).join(" ");
    const orgao = (/DJEN\s*-\s*(.+)$/i.exec(fonte) || [])[1] || fonte.replace(/^.*?-\s*/, "");
    const link = (/(https?:\/\/[^\s<>]+)/.exec(B.find((l) => /^Acesso ao documento/i.test(l)) || "") || [])[1] || null;
    const tribunal = /Justi[cç]a de Alagoas/i.test(fonte) ? "TJAL" : (tribunalDoNumero(numero) || null);
    const tipo = limpo(tipoLinha.replace(/^.*?-\s*/, ""), 80) || "Intimação";
    itens.push({
      numero, data: disp, tribunal, orgao: limpo(orgao, 200) || null, classe: capital((/^PROCESSO\s*:\s*[\d.\-]+\s*-\s*(.+)$/i.exec(corpo[iProc] || "") || [])[1] || "") || null,
      tipo: /intima/i.test(tipo) ? tipo : (tipo || "Intimação"), resumo: limpo(miolo.replace(/^.*?(Intime-se|Intimem-se|Fica|PAUTADO|Vista)/i, "$1"), 300) || limpo(tipoLinha, 200),
      texto: [`Recorte Digital OAB/AL · processo ${mascaraCnj(numero)}`, fonte && `Fonte: ${fonte}`, tipoLinha, limpo(miolo, 20000)].filter(Boolean).join("\n"),
      link,
    });
  }
  return { situacao: "ok", leitor: "recorte", itens };
}

/* ---------- genérico: outro remetente .jus.br com número de processo ---------- */
function lerGenerico(e, txt) {
  const nums = [...new Set([...(e.assunto || "").matchAll(RE_CNJ_G), ...txt.matchAll(RE_CNJ_G)].map((m) => m.slice(1).join("")))];
  if (!nums.length) return { situacao: "nao_entendido", leitor: "generico", motivo: "e-mail de tribunal sem número de processo" };
  if (nums.length > 5) return { situacao: "nao_entendido", leitor: "generico", motivo: `formato desconhecido com ${nums.length} processos: precisa de leitor próprio` };
  const corpo = limpo(txt, 20000);
  return { situacao: "ok", leitor: "generico", itens: nums.map((numero) => ({
    numero, data: dataLocal(e.data), tribunal: tribunalDoNumero(numero), orgao: limpo(e.remetenteNome || e.remetente, 200) || null, classe: null,
    tipo: tipoDoMovimento(e.assunto || corpo), resumo: limpo(e.assunto || corpo, 300), texto: `E-mail de ${e.remetente}: ${limpo(e.assunto, 300)}\n${corpo}`,
  })) };
}

/* ---------- entrada ---------- */
// e = { id (id da mensagem no Gmail, hex), remetente, remetenteNome, assunto, data (Date ou ISO), texto, html, link }
export function ler(e) {
  const assunto = String(e.assunto || "");
  for (const [re, motivo] of ASSUNTO_FORA) if (re.test(assunto)) return { situacao: "ignorado", leitor: "filtro", motivo };
  const de = String(e.remetente || "").toLowerCase();
  if (/@(sso\.)?cnj\.jus\.br$/.test(de) && !numeroCnj(assunto)) return { situacao: "ignorado", leitor: "filtro", motivo: "aviso do CNJ (login)" };
  const txt = e.html ? htmlParaTexto(e.html) : String(e.texto || "").replace(/\r/g, "");
  let r;
  if (/recortedigital/.test(de) || /^Recorte Digital/i.test(txt)) r = lerRecorte(e, txt);
  else if (/PJe Push/i.test(txt) || /^\[Push\]|^Movimenta[cç][aã]o processual do processo/i.test(assunto)) r = lerPjePush(e, txt);
  else if (/eproc/i.test(de) || /EPROC/i.test(assunto) || /Num\.?\s*Processo\s*:/i.test(txt)) r = lerEproc(e, txt);
  else r = lerGenerico(e, txt);
  if (r.situacao === "ok") r.itens = r.itens.map((it, i) => ({ ...it, id_externo: `${e.id}#${i + 1}`, link: it.link || e.link || null, texto: String(it.texto || "").slice(0, 60000) }));
  return r;
}
