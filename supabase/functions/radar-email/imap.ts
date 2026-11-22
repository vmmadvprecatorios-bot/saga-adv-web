// Parte IMAP do radar-email (blocos 380-384): ligação TLS com o Gmail, SÓ LEITURA (EXAMINE + BODY.PEEK).
// Separada do index.ts para poder ser testada com um Gmail simulado (testes_imap.ts).
export const HOST = "imap.gmail.com", PORTA = 993;
/* ---------- erros em português, sempre com o código ---------- */
export class ErroRadar extends Error {
  codigo: string;
  constructor(msg: string, codigo: string) { super(msg); this.codigo = codigo; }
}
let SENHA_ATUAL = "";
export function guardarSenha(s: string) { SENHA_ATUAL = s; }
export const semSenha = (t: string) => SENHA_ATUAL ? String(t || "").split(SENHA_ATUAL).join("***") : String(t || "");
export function traduzir(e: unknown): string {
  if (e instanceof ErroRadar) return semSenha(`${e.message} (código ${e.codigo})`);
  const m = semSenha((e as Error)?.message || String(e));
  if (/timed? ?out|tempo/i.test(m)) return `O Gmail demorou demais para responder. O robô tenta de novo na próxima rodada (código TEMPO).`;
  if (/connect|dns|refused|reset|network|tls|certificate|os error/i.test(m)) return `Não consegui abrir a ligação com o Gmail (${HOST}:${PORTA}): ${m.slice(0, 200)}. O robô tenta de novo na próxima rodada (código CONEXAO).`;
  return `${m.slice(0, 400)} (código ERRO)`;
}

/* ---------- IMAP mínimo (TLS 993) ---------- */
const latin1 = new TextDecoder("latin1");
const enc = new TextEncoder();
type Unidade = { texto: string; literais: Uint8Array[] };
export class Imap {
  conn: Deno.TlsConn | null = null;
  buf = new Uint8Array(0);
  n = 0;
  async abrir() {
    try {
      this.conn = await comTempo(Deno.connectTls({ hostname: HOST, port: PORTA }), 20000, "abrir a ligação");
    } catch (e) {
      throw new ErroRadar(`Não consegui abrir a ligação com o Gmail (${HOST}:${PORTA}): ${(e as Error).message}. O robô tenta de novo na próxima rodada`, "CONEXAO");
    }
    const g = await this.unidade();
    if (!/^\* OK/i.test(g.texto)) throw new ErroRadar("O Gmail não respondeu como esperado ao abrir a ligação: " + g.texto.slice(0, 120), "IMAP");
    return g.texto;
  }
  private async encher() {
    const b = new Uint8Array(64 * 1024);
    const k = await comTempo(this.conn!.read(b), 60000, "ler a resposta");
    if (k === null) throw new ErroRadar("O Gmail fechou a ligação no meio da conversa. O robô tenta de novo na próxima rodada", "CONEXAO");
    const nb = new Uint8Array(this.buf.length + k);
    nb.set(this.buf); nb.set(b.subarray(0, k), this.buf.length);
    this.buf = nb;
  }
  private async linha(): Promise<string> {
    for (;;) {
      for (let i = 0; i + 1 < this.buf.length; i++) {
        if (this.buf[i] === 13 && this.buf[i + 1] === 10) {
          const l = latin1.decode(this.buf.subarray(0, i));
          this.buf = this.buf.subarray(i + 2);
          return l;
        }
      }
      await this.encher();
    }
  }
  private async bytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) await this.encher();
    const r = this.buf.slice(0, n);
    this.buf = this.buf.subarray(n);
    return r;
  }
  async unidade(): Promise<Unidade> {
    let texto = "";
    const literais: Uint8Array[] = [];
    for (;;) {
      const l = await this.linha();
      const m = /\{(\d+)\}$/.exec(l);
      if (m) { texto += l.slice(0, -m[0].length) + `{LIT${literais.length}}`; literais.push(await this.bytes(Number(m[1]))); continue; }
      return { texto: texto + l, literais };
    }
  }
  async cmd(c: string): Promise<Unidade[]> {
    const tag = "S" + (++this.n);
    await comTempo(this.conn!.write(enc.encode(`${tag} ${c}\r\n`)), 20000, "enviar o pedido");
    const out: Unidade[] = [];
    for (;;) {
      const u = await this.unidade();
      if (u.texto.startsWith(tag + " ")) {
        const st = u.texto.slice(tag.length + 1);
        if (!/^OK/i.test(st)) {
          const verbo = c.split(" ")[0];
          if (verbo === "LOGIN") {
            if (/ALERT|application-specific|app password/i.test(st)) throw new ErroRadar("O Google pede SENHA DE APP: a senha normal da conta não serve. Crie a senha de app e cole em Intimações > Radar do e-mail", "SENHA_DE_APP");
            if (/AUTHENTICATIONFAILED|Invalid credentials/i.test(st)) throw new ErroRadar("O Gmail recusou a senha de app (senha errada, apagada no Google ou de outra conta). Crie uma nova e cole em Intimações > Radar do e-mail", "LOGIN");
            if (/WEBALERT|web login/i.test(st)) throw new ErroRadar("O Google bloqueou a entrada e pede confirmação no navegador: entre na conta pelo Gmail, confirme a atividade e teste de novo", "BLOQUEIO");
            throw new ErroRadar("O Gmail recusou a entrada: " + semSenha(st).slice(0, 200), "LOGIN");
          }
          throw new ErroRadar(`O Gmail recusou o pedido ${verbo}: ${st.slice(0, 200)}`, "IMAP");
        }
        return out;
      }
      out.push(u);
    }
  }
  async fechar() {
    try { if (this.conn) { await comTempo(this.conn.write(enc.encode(`S${++this.n} LOGOUT\r\n`)), 3000, "sair"); } } catch { /* já caiu */ }
    try { this.conn?.close(); } catch { /* já fechada */ }
    this.conn = null;
  }
}
export function comTempo<T>(p: Promise<T>, ms: number, oque: string): Promise<T> {
  let t: number | undefined;
  return Promise.race([p, new Promise<T>((_, rej) => { t = setTimeout(() => rej(new ErroRadar(`O Gmail demorou demais para ${oque}. O robô tenta de novo na próxima rodada`, "TEMPO")), ms); })])
    .finally(() => clearTimeout(t));
}
const aspas = (s: string) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

// entra, acha a pasta "Todos os e-mails" (\All) e abre SÓ PARA LEITURA (EXAMINE)
export async function entrar(im: Imap, conta: string, senha: string) {
  await im.abrir();
  await im.cmd(`LOGIN ${aspas(conta)} ${aspas(senha)}`);
  const lista = await im.cmd(`LIST "" "*"`);
  let pasta = "INBOX";
  for (const u of lista) {
    if (!/\\All\b/i.test(u.texto)) continue;
    const m = /"((?:[^"\\]|\\.)*)"\s*$/.exec(u.texto) || /\s(\S+)\s*$/.exec(u.texto);
    if (m) { pasta = m[1].replace(/\\(.)/g, "$1"); break; }
  }
  await im.cmd(`EXAMINE ${aspas(pasta)}`);
  return pasta;
}
export function consultaGmail(remetentes: string[], dias: number) {
  const de = remetentes.map((r) => `from:${r.replace(/[^a-z0-9@._%+-]/gi, "")}`).join(" ");
  return `{${de}} newer_than:${dias}d`;
}
export async function buscar(im: Imap, remetentes: string[], dias: number): Promise<number[]> {
  const r = await im.cmd(`UID SEARCH X-GM-RAW ${aspas(consultaGmail(remetentes, dias))}`);
  const uids: number[] = [];
  for (const u of r) { const m = /^\* SEARCH\s*(.*)$/i.exec(u.texto); if (m) uids.push(...m[1].trim().split(/\s+/).filter(Boolean).map(Number)); }
  return uids.filter((n) => Number.isFinite(n) && n > 0);
}
const hexDe = (dec: string) => BigInt(dec).toString(16);
export async function metadados(im: Imap, uids: number[]) {
  const out: { uid: number; msgid: string; tamanho: number }[] = [];
  for (let i = 0; i < uids.length; i += 200) {
    const r = await im.cmd(`UID FETCH ${uids.slice(i, i + 200).join(",")} (UID X-GM-MSGID RFC822.SIZE)`);
    for (const u of r) {
      const uid = /\bUID (\d+)/.exec(u.texto), g = /X-GM-MSGID (\d+)/.exec(u.texto), t = /RFC822\.SIZE (\d+)/.exec(u.texto);
      if (uid && g) out.push({ uid: Number(uid[1]), msgid: hexDe(g[1]), tamanho: t ? Number(t[1]) : 0 });
    }
  }
  return out;
}
export async function corpos(im: Imap, uids: number[]): Promise<Map<number, Uint8Array>> {
  const m = new Map<number, Uint8Array>();
  for (let i = 0; i < uids.length; i += 10) {
    const r = await im.cmd(`UID FETCH ${uids.slice(i, i + 10).join(",")} (UID BODY.PEEK[])`);
    for (const u of r) { const uid = /\bUID (\d+)/.exec(u.texto); if (uid && u.literais.length) m.set(Number(uid[1]), u.literais[u.literais.length - 1]); }
  }
  return m;
}

