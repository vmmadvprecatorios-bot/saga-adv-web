#!/usr/bin/env python3
"""Carga do ABONO DE PERMANÊNCIA e do TEMA 1.233 (24/11/2026, Dr. Victor pelo Diário 5; blocos 425 e 426).

Lê, no contêiner do Claude, a planilha de Remuneração do SIAPE do Portal da Transparência mês a mês (um arquivo por vez,
apagado depois) e manda ao banco SÓ o resumo por servidor, pela porta bases-receber (tipos siape_abono,
siape_abono_eventos e siape_abono_fechar). A chave x-saga-carga-key é posta pelo próprio ambiente (segredo do ambiente):
ela nunca aparece aqui, no repositório nem na conversa. Nenhum dado de pessoa fica neste arquivo.

Regras (ESTIMATIVA a conferir):
- abono provável no mês = "Outras remunerações eventuais" igual ao PSS do mês (±2%); num mês de 13º/férias o PSS muda,
  então vale também "igual ao abono do mês anterior (±5%)".
- 1/3 de férias (coluna FÉRIAS) num mês com abono: = básica ÷ 3 → SEM o abono (diferença = abono ÷ 3);
  = (básica + abono) ÷ 3, ou o abono ÷ 3 pago à parte em "outras eventuais" → COM o abono; outro valor → a conferir.
- 13º (coluna GRATIFICAÇÃO NATALINA) num mês com abono: = básica (ou a metade) → SEM (diferença = abono ou a metade);
  = básica + abono (ou a metade), ou o abono pago à parte em "outras eventuais" → COM; outro valor → a conferir.

Uso:
  python3 ferramentas/carga_abono_portal.py --de 202108 --ate 202607            # só lê e mostra os números (não grava)
  python3 ferramentas/carga_abono_portal.py --de 202108 --ate 202607 --enviar   # grava (só das 22h às 6h de Maceió)
Horário: carga grande só das 22h às 6h de Maceió e quando o Diário de bordo der a vez; o script para sozinho fora dele.
"""
import argparse, csv, datetime, io, json, os, shutil, subprocess, sys, tempfile, time, urllib.request, zipfile

URL_ZIP = "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/servidores/{m}_Servidores_SIAPE.zip"
URL_PORTA = "https://fmoskdxgjulagedzjxxk.supabase.co/functions/v1/bases-receber"
CHAVE_FALSA = "posta-pelo-ambiente-000000000000"  # o proxy do ambiente troca pelo segredo de verdade
VERSAO = "abono-1 (24/11/2026)"
LOTE = 2000

def agora_maceio():
    return datetime.datetime.utcnow() - datetime.timedelta(hours=3)

def no_horario():
    h = agora_maceio().hour
    return h >= 22 or h < 6

def meses(de, ate):
    a, m = divmod(de, 100)
    while a * 100 + m <= ate:
        yield a * 100 + m
        m += 1
        if m > 12:
            a, m = a + 1, 1

def num(v):
    v = (v or "").replace(".", "").replace(",", ".").strip()
    try:
        return float(v)
    except ValueError:
        return 0.0

def perto(x, y, tol=1.0):
    return abs(x - y) <= tol

def baixar(m, pasta):
    dest = os.path.join(pasta, f"{m}.zip")
    for tent in range(4):
        try:
            with urllib.request.urlopen(URL_ZIP.format(m=m), timeout=600) as r, open(dest, "wb") as f:
                shutil.copyfileobj(r, f)
            return dest
        except Exception as e:  # noqa: BLE001
            print(f"  {m}: falha ao baixar ({e}); tentativa {tent + 1}", flush=True)
            time.sleep(15 * (tent + 1))
    raise RuntimeError(f"não baixou {m}")

def linhas_remuneracao(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        nome = next(n for n in z.namelist() if n.endswith("_Remuneracao.csv"))
        with z.open(nome) as bruto:
            r = csv.reader(io.TextIOWrapper(bruto, encoding="latin1"), delimiter=";")
            cab = next(r)
            assert cab[2] == "Id_SERVIDOR_PORTAL" and "PSS" in cab[19] and "EVENTUAIS" in cab[15], "formato do Portal mudou"
            for row in r:
                yield row[2], num(row[5]), num(row[9]), num(row[13]), num(row[15]), abs(num(row[19]))

def novo():
    return {"anos13": {}, "cand": None, "a": None, "valor": None, "ultimo": None, "desde": None, "antes": False, "meses": 0, "falta": 0, "falta_de": None,
            "fm": 0, "fs": 0, "fc": 0, "fd": 0.0, "dm": 0, "ds": 0, "dc": 0, "dd": 0.0, "conf": 0, "lista": [], "ev": []}

def mes_anterior(m):
    return m - 1 if m % 100 != 1 else m - 89

def processar_mes(m, mes_inicial, zip_path, est, stats, semente=False):
    """Abono CONFIRMADO só depois de 2 meses seguidos (ou já no mês-semente): um mês solto em que "outras eventuais"
    bate com o PSS por acaso não vira abono nem evento. Férias e 13º só são conferidos com o abono já confirmado."""
    vistos = set()
    for i, bas, nat, fer, out, pss in linhas_remuneracao(zip_path):
        s = est.get(i)
        conf = s["a"] if (s and s["a"] and s["falta"] < 2) else None   # abono confirmado até o mês passado
        ab = None
        if pss > 0 and out > 0 and abs(out - pss) / pss < 0.02:
            ab = out
        elif conf and out > 0 and abs(out - conf) / conf < 0.05:
            ab = out
        extra = 0.0
        if ab is None and conf and out > conf * 1.2:
            ab, extra = conf, out - conf           # abono + reflexo pago à parte no mesmo mês
        if ab is None and not (conf and (fer > 0 or nat > 0)):
            continue
        if s is None:
            s = est[i] = novo()
        if ab is not None:
            vistos.add(i)
            if conf:
                s["a"], s["valor"], s["ultimo"] = ab, ab, m
                if not semente:
                    s["meses"] += 1
            elif semente:
                s["a"], s["valor"], s["ultimo"], s["desde"], s["antes"], s["falta"] = ab, ab, m, m, True, 0
            elif s.get("cand") and s["cand"][0] == mes_anterior(m):
                inicio = s["cand"][0]
                s["antes"] = inicio == mes_inicial and s["a"] is None
                if not s["antes"]:
                    s["ev"].append({"mes": inicio, "evento": "abono_comecou", "para": f"{ab:.2f}"})
                s["a"], s["valor"], s["ultimo"], s["desde"], s["falta"], s["falta_de"], s["cand"] = ab, ab, m, inicio, 0, None, None
                s["meses"] += 2
                conf = ab
            else:
                s["cand"] = (m, ab)
            if conf:
                s["falta"], s["falta_de"] = 0, None
        a = (ab if ab is not None else None) if conf else None
        if conf and a is None:
            a = conf
        if not a or semente:
            continue
        if fer > 0:
            s["fm"] += 1
            if perto(fer, (bas + a) / 3) or perto(extra, a / 3, 2):
                s["fc"] += 1; r = "com"; dif = 0.0
            elif perto(fer, bas / 3):
                s["fs"] += 1; dif = round(a / 3, 2); s["fd"] += dif; r = "sem"
            else:
                s["conf"] += 1; r = "?"; dif = 0.0
            s["lista"].append({"m": m, "t": "ferias", "pago": round(fer, 2), "esperado": round((bas + a) / 3, 2) if r != "?" else None, "dif": dif, "r": r})
            stats["ferias_" + r] += 1
        if nat > 0:
            s["anos13"].setdefault(m // 100, []).append((m, nat, bas, a, extra))
    # quem tinha o abono confirmado e não apareceu neste mês (2 meses seguidos = parou)
    for i, s in est.items():
        if s["a"] and s["falta"] < 2 and i not in vistos and s["ultimo"] is not None and s["ultimo"] < m:
            s["falta"] += 1
            if s["falta"] == 1:
                s["falta_de"] = m
            if s["falta"] == 2 and not semente:
                s["ev"].append({"mes": s["falta_de"], "evento": "abono_parou", "de": f"{s['a']:.2f}"})
    stats["com_abono"] = len(vistos)

def avaliar_13(s, stats):
    """13º por ANO (pode vir em 2 parcelas): COM o abono se alguma parcela = base + abono (inteiro ou metade), se o total do ano
    = básica + abono, ou se o abono veio à parte em outras eventuais; SEM se o total do ano = básica (ou uma parcela = básica / metade
    e nenhuma com o abono); senão, a conferir."""
    for ano, ps in sorted(s["anos13"].items()):
        total = sum(p[1] for p in ps)
        m, nat, bas, a, extra = max(ps, key=lambda p: p[0])
        com = any(perto(p[1], p[2] + p[3]) or perto(p[1], (p[2] + p[3]) / 2) or perto(p[4], p[3], 2) or perto(p[4], p[3] / 2, 2) for p in ps) \
            or perto(total, bas + a, max(1.0, 0.005 * bas))
        sem_total = perto(total, bas, max(1.0, 0.005 * bas))
        sem_parc = all(perto(p[1], p[2]) or perto(p[1], p[2] / 2) for p in ps)
        s["dm"] += 1
        if com:
            s["dc"] += 1; r = "com"; dif = 0.0
        elif sem_total or (sem_parc and len(ps) == 1 and perto(nat, bas)):
            s["ds"] += 1; dif = round(a, 2); s["dd"] += dif; r = "sem"
        else:
            s["conf"] += 1; r = "?"; dif = 0.0
        s["lista"].append({"m": m, "t": "13", "pago": round(total, 2), "esperado": round(bas + a, 2) if r != "?" else None, "dif": dif, "r": r})
        stats["d13_" + r] += 1

def enviar(corpo):
    dados = json.dumps(corpo).encode()
    req = urllib.request.Request(URL_PORTA, data=dados, method="POST",
                                 headers={"content-type": "application/json", "x-saga-carga-key": CHAVE_FALSA})
    for tent in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.loads(r.read())
            if not resp.get("ok"):
                raise RuntimeError(resp)
            return resp
        except Exception as e:  # noqa: BLE001
            print(f"  envio falhou ({e}); tentativa {tent + 1}", flush=True)
            time.sleep(10 * (tent + 1))
    raise RuntimeError("envio falhou 4 vezes: parei (nada mais foi mandado)")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--de", type=int, required=True)
    ap.add_argument("--ate", type=int, required=True)
    ap.add_argument("--enviar", action="store_true")
    ap.add_argument("--pausa", type=float, default=3.0)
    a = ap.parse_args()
    if a.enviar and not no_horario():
        sys.exit("Fora do horário das cargas (22h às 6h de Maceió): não envio nada.")
    pasta = tempfile.mkdtemp(prefix="abono_")
    est, lidos = {}, []
    ant = mes_anterior(a.de)   # mês anterior: só para saber quem já tinha o abono
    try:
        z = baixar(ant, pasta)
        processar_mes(ant, a.de, z, est, {k: 0 for k in ("ferias_sem", "ferias_com", "ferias_?", "d13_sem", "d13_com", "d13_?", "com_abono")}, semente=True)
        os.remove(z)
        for s in est.values():
            s["ev"] = []
        print(f"{ant}: semente (quem já tinha o abono antes da janela): {sum(1 for s in est.values() if s['a'])}", flush=True)
        for m in meses(a.de, a.ate):
            t0 = time.time()
            z = baixar(m, pasta)
            stats = {k: 0 for k in ("ferias_sem", "ferias_com", "ferias_?", "d13_sem", "d13_com", "d13_?", "com_abono")}
            processar_mes(m, a.de, z, est, stats)
            os.remove(z)
            lidos.append(m)
            print(f"{m}: {stats} ({time.time() - t0:.0f} s)", flush=True)
    finally:
        shutil.rmtree(pasta, ignore_errors=True)
    st13 = {"d13_sem": 0, "d13_com": 0, "d13_?": 0}
    for s in est.values():
        avaliar_13(s, st13)
    print(f"13º por ano: {st13}", flush=True)
    linhas, eventos = [], []
    for i, s in est.items():
        if not s["valor"]:
            continue
        linhas.append({"id_portal": int(i), "abono_valor": round(s["valor"], 2), "abono_ultimo_mes": s["ultimo"],
                       "abono_desde": s["desde"] or a.de, "abono_desde_antes": s["antes"],
                       "abono_meses": s["meses"], "ferias_meses": s["fm"], "ferias_sem_reflexo": s["fs"], "ferias_com_reflexo": s["fc"],
                       "ferias_dif": round(s["fd"], 2), "d13_meses": s["dm"], "d13_sem_reflexo": s["ds"], "d13_com_reflexo": s["dc"],
                       "d13_dif": round(s["dd"], 2), "a_conferir": s["conf"], "meses": s["lista"][-40:], "mes_de": a.de, "mes_ate": a.ate})
        eventos += [dict(e, id_portal=int(i)) for e in s["ev"]]
    print(f"servidores com abono na janela: {len(linhas)}; recebem no último mês: {sum(1 for l in linhas if l['abono_ultimo_mes'] == a.ate)}; "
          f"com férias sem o abono: {sum(1 for l in linhas if l['ferias_sem_reflexo'])}; com 13º sem o abono: {sum(1 for l in linhas if l['d13_sem_reflexo'])}; "
          f"eventos: {len(eventos)}", flush=True)
    if not a.enviar:
        print("Só leitura (--enviar não foi passado): nada foi gravado.")
        return
    for k in range(0, len(linhas), LOTE):
        if not no_horario():
            sys.exit(f"Passou das 6h de Maceió: parei no lote {k // LOTE} (o resto vai na próxima noite; rodar de novo regrava tudo).")
        r = enviar({"tipo": "siape_abono", "linhas": linhas[k:k + LOTE]})
        print(f"lote {k // LOTE + 1}: {r.get('gravadas')} gravadas", flush=True)
        time.sleep(a.pausa)
    for k in range(0, len(eventos), LOTE):
        r = enviar({"tipo": "siape_abono_eventos", "linhas": eventos[k:k + LOTE]})
        print(f"eventos {k // LOTE + 1}: {r.get('gravadas')}", flush=True)
        time.sleep(a.pausa)
    r = enviar({"tipo": "siape_abono_fechar", "linhas": [], "mes_de": a.de, "mes_ate": a.ate, "meses_lidos": lidos, "versao": VERSAO})
    print("fechado:", r, flush=True)

if __name__ == "__main__":
    main()
