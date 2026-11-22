// Teste da parte IMAP com um Gmail SIMULADO (nada sai para a internet; dados inventados).
// Rodar: deno run supabase/functions/radar-email/testes_imap.ts
import PostalMime from "npm:postal-mime@2.6.0";
import { Imap, entrar, buscar, metadados, corpos, traduzir, guardarSenha } from "./imap.ts";
import { ler } from "./leitores.js";

let falhas = 0;
const ok = (c: unknown, msg: string) => { if (!c) { falhas++; console.log("FALHOU:", msg); } else console.log("ok -", msg); };
const enc = new TextEncoder(), dec = new TextDecoder("latin1");

// e-mail do PJe Push em ISO-8859-1 + quoted-printable (como o TRF5 manda), com número e nome inventados
const corpoHtml = "<html><body>Justi=E7a Federal da 5=AA Regi=E3o <br>PJe Push - Servi=E7o de Acompanhamento autom=E1tico de processos <br>\r\n" +
  "N=FAmero do Processo: 0000009-99.2025.4.05.8000 <br>Classe Judicial: PROCEDIMENTO COMUM <br>=D3rg=E3o: 2=AA VARA FEDERAL AL <br>\r\n" +
  "<table><tr><th>Data - Movimento</th></tr><tr><td>20/11/2026 10:00 - Expedida intima=E7=E3o eletr=F4nica - Decis=E3o</td></tr></table></body></html>\r\n";
const bruto = "From: =?ISO-8859-1?Q?Tribunal_Regional_Federal_da_5=AA_Regi=E3o?= <pje@trf5.jus.br>\r\n" +
  "Subject: [Push] =?ISO-8859-1?Q?Movimenta=E7=E3o_processual?= do processo 0000009-99.2025.4.05.8000\r\n" +
  "Date: Fri, 20 Nov 2026 13:05:00 +0000\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=iso-8859-1\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n" + corpoHtml;
const brutoBytes = new Uint8Array([...bruto].map((c) => c.charCodeAt(0)));

function servidorFalso(opcoes: { senhaCerta: string }) {
  const comandos: string[] = [];
  let saida = enc.encode("* OK Gimap ready for requests\r\n");
  const responder = (b: Uint8Array) => { const n = new Uint8Array(saida.length + b.length); n.set(saida); n.set(b, saida.length); saida = n; };
  const conn = {
    read: async (p: Uint8Array) => { if (!saida.length) await new Promise((r) => setTimeout(r, 5)); if (!saida.length) return 0; const k = Math.min(p.length, 7, saida.length); p.set(saida.subarray(0, k)); saida = saida.subarray(k); return k; }, // pedaços pequenos de propósito
    write: async (b: Uint8Array) => {
      const l = dec.decode(b).replace(/\r\n$/, ""); comandos.push(l);
      const [tag, ...resto] = l.split(" "); const c = resto.join(" ");
      if (c.startsWith("LOGIN")) {
        responder(enc.encode(c.includes(`"${opcoes.senhaCerta}"`) ? `${tag} OK conta@exemplo.invalido authenticated (Success)\r\n` : `${tag} NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)\r\n`));
      } else if (c.startsWith("LIST")) {
        responder(enc.encode(`* LIST (\\HasNoChildren) "/" "INBOX"\r\n* LIST (\\All \\HasNoChildren) "/" "[Gmail]/Todos os e-mails"\r\n${tag} OK Success\r\n`));
      } else if (c.startsWith("EXAMINE")) {
        responder(enc.encode(`* FLAGS (\\Seen)\r\n* OK [READ-ONLY] ok\r\n${tag} OK [READ-ONLY] "${c.slice(8)}" selected. (Success)\r\n`));
      } else if (c.startsWith("UID SEARCH")) {
        responder(enc.encode(`* SEARCH 41 42\r\n${tag} OK SEARCH completed (Success)\r\n`));
      } else if (c.includes("X-GM-MSGID RFC822.SIZE")) {
        responder(enc.encode(`* 1 FETCH (X-GM-MSGID 1882543968707731673 UID 41 RFC822.SIZE ${brutoBytes.length})\r\n* 2 FETCH (X-GM-MSGID 1882543968707731674 UID 42 RFC822.SIZE 99999999)\r\n${tag} OK Success\r\n`));
      } else if (c.includes("BODY.PEEK[]")) {
        responder(enc.encode(`* 1 FETCH (UID 41 BODY[] {${brutoBytes.length}}\r\n`)); responder(brutoBytes); responder(enc.encode(`)\r\n${tag} OK Success\r\n`));
      } else if (c.startsWith("LOGOUT")) {
        responder(enc.encode(`* BYE\r\n${tag} OK\r\n`));
      } else responder(enc.encode(`${tag} BAD comando desconhecido\r\n`));
      return b.length;
    },
    close: () => {},
  };
  return { conn, comandos };
}

// 1. caminho certo
{
  const sv = servidorFalso({ senhaCerta: "abcdabcdabcdabcd" });
  (Deno as any).connectTls = async () => sv.conn;
  const im = new Imap();
  const pasta = await entrar(im, "conta@exemplo.invalido", "abcdabcdabcdabcd");
  ok(pasta === "[Gmail]/Todos os e-mails", "acha a pasta \\All");
  ok(sv.comandos.some((c) => /EXAMINE "\[Gmail\]\/Todos os e-mails"/.test(c)) && !sv.comandos.some((c) => /SELECT|STORE|EXPUNGE|COPY|MOVE/.test(c)), "abre SÓ PARA LEITURA (EXAMINE; nada de SELECT/STORE/MOVE)");
  const uids = await buscar(im, ["pje@trf5.jus.br", "jus.br"], 3);
  ok(uids.join(",") === "41,42", "busca pelos remetentes");
  ok(sv.comandos.some((c) => c.includes('X-GM-RAW "{from:pje@trf5.jus.br from:jus.br} newer_than:3d"')), "consulta do Gmail montada");
  const meta = await metadados(im, uids);
  ok(meta[0].msgid === "1a2023c3f0e0e0d9" && meta[0].uid === 41, "X-GM-MSGID vira o id hex do Gmail");
  ok(meta[1].tamanho === 99999999, "tamanho do e-mail");
  const b = await corpos(im, [41]);
  ok(b.get(41)?.length === brutoBytes.length, "corpo inteiro lido pelo literal {n}");
  ok(sv.comandos.some((c) => c.includes("BODY.PEEK[]")) && !sv.comandos.some((c) => /BODY\[\]/.test(c.replace("BODY.PEEK[]", ""))), "lê com BODY.PEEK (não marca como lido)");
  await im.fechar();
  const e = await PostalMime.parse(b.get(41)!);
  const r = ler({ id: meta[0].msgid, remetente: e.from?.address, assunto: e.subject, data: e.date, html: e.html, texto: e.text });
  ok(r.situacao === "ok" && r.itens[0].numero === "00000099920254058000" && r.itens[0].tipo === "Intimação", "e-mail em ISO-8859-1 lido do começo ao fim");
  ok(r.itens?.[0].orgao === "2ª Vara Federal AL" && /Decisão/.test(r.itens[0].resumo), "acentos certos (Órgão, Decisão)");
}
// 2. senha recusada: mensagem em português, com o código, sem a senha
{
  const sv = servidorFalso({ senhaCerta: "outraoutraoutrax" });
  (Deno as any).connectTls = async () => sv.conn;
  guardarSenha("errada1234567890");
  const im = new Imap();
  let msg = "";
  try { await entrar(im, "conta@exemplo.invalido", "errada1234567890"); } catch (e) { msg = traduzir(e); }
  ok(/recusou a senha de app/.test(msg) && /código LOGIN/.test(msg) && !msg.includes("errada1234567890"), "senha recusada: motivo e código, sem a senha");
}
// 3. Gmail fora do ar
{
  (Deno as any).connectTls = async () => { throw new Error("Connection refused (os error 111)"); };
  let msg = "";
  try { await new Imap().abrir(); } catch (e) { msg = traduzir(e); }
  ok(/código CONEXAO/.test(msg), "Gmail fora do ar: código CONEXAO");
}
console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo.");
Deno.exit(falhas ? 1 : 0);
