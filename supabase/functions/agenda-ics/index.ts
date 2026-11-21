// SAGA · Agenda no celular / Google Agenda (21/11/2026, ideia 5 do check-up; bloco 357).
// Pública (verify_jwt false): devolve a agenda de UMA pessoa em formato .ics, só com o código do link pessoal (?t=).
// O link é gerado e desligado pela própria pessoa em Agenda > "Ver no celular" (agenda_link_gerar / agenda_link_desligar).
// Os dados vêm da agenda_ics_dados (SECURITY DEFINER, só a chave de serviço chama), que já aplica as regras:
// compromissos da pessoa (responsável, quem criou, participante) + agenda do escritório se ela pediu; particular de
// outra pessoa nunca entra; colaborador vê só o tipo + código VMM (sem nome de cliente); cada acesso fica registrado.
// Só leitura: nada muda no SAGA por este link.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SITE = "https://vmmadvprecatorios-bot.github.io/saga-adv-web/calendario_padrao_metalico.html";

const texto = (s: unknown) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: string | Date) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// linhas do .ics com no máximo 75 bytes (RFC 5545)
function dobrar(linha: string): string {
  const enc = new TextEncoder(); if (enc.encode(linha).length <= 75) return linha;
  const partes: string[] = []; let atual = "";
  for (const ch of linha) {
    if (enc.encode(atual + ch).length > (partes.length ? 74 : 75)) { partes.push(atual); atual = ""; }
    atual += ch;
  }
  partes.push(atual); return partes.join("\r\n ");
}
const FREQ: Record<string, string> = { diaria: "DAILY", semanal: "WEEKLY", mensal: "MONTHLY", anual: "YEARLY" };

function resposta(corpo: string, status = 200) {
  return new Response(corpo, { status, headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": 'inline; filename="agenda-saga.ics"' } });
}
// erro também vem como .ics válido e com 200 (o Google e o iPhone mostram o evento com o motivo, em vez de falhar calados)
function calendarioDeErro(motivo: string) {
  const agora = utc(new Date());
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VMMADV//SAGA Agenda//PT", "X-WR-CALNAME:SAGA (link desligado)",
    "BEGIN:VEVENT", "UID:erro-" + agora + "@saga", "DTSTAMP:" + agora, "DTSTART:" + agora, "DTEND:" + agora,
    dobrar("SUMMARY:" + texto("SAGA: " + motivo + ". Gere um link novo em Agenda > Ver no celular.")), "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const t = (url.searchParams.get("t") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  if (t.length < 20) return resposta(calendarioDeErro("link inválido"));
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
  const r = await admin.rpc("agenda_ics_dados", { p_token: t, p_ip: ip });
  if (r.error) return resposta(calendarioDeErro("erro ao ler a agenda (" + (r.error.code || "banco") + "); o SAGA tenta de novo na próxima leitura"));
  const d = r.data || {};
  if (d.erro) return resposta(calendarioDeErro(String(d.erro)));
  const agora = utc(new Date());
  const L: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VMMADV//SAGA Agenda//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    dobrar("X-WR-CALNAME:" + texto("SAGA · " + String(d.nome || "").split(" ")[0])), "X-WR-TIMEZONE:America/Maceio",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const e of (d.eventos || [])) {
    const ini = new Date(e.inicio); const fim = e.fim ? new Date(e.fim) : new Date(ini.getTime() + 60 * 60000);
    L.push("BEGIN:VEVENT", "UID:" + e.id + "@saga-vmmadv", "DTSTAMP:" + agora, "DTSTART:" + utc(ini), "DTEND:" + utc(fim > ini ? fim : new Date(ini.getTime() + 30 * 60000)),
      dobrar("SUMMARY:" + texto((e.concluido ? "✓ " : "") + (e.titulo || "Compromisso"))));
    if (e.local) L.push(dobrar("LOCATION:" + texto(e.local)));
    L.push(dobrar("DESCRIPTION:" + texto((e.obs ? e.obs + "\n\n" : "") + "Abrir no SAGA: " + SITE)));
    if (e.repete && FREQ[e.repete]) L.push("RRULE:FREQ=" + FREQ[e.repete] + (e.repete_ate ? ";UNTIL=" + e.repete_ate.replace(/-/g, "") + "T235959Z" : ""));
    if (e.concluido) L.push("STATUS:CONFIRMED");
    if (!e.concluido) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + texto("Daqui a 30 min"), "TRIGGER:-PT30M", "END:VALARM");
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR", "");
  return resposta(L.join("\r\n"));
});
