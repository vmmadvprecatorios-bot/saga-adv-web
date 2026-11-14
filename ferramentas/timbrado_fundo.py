#!/usr/bin/env python3
"""
Prepara o FUNDO em PDF de um papel timbrado (.docx) para o SAGA gerar petições em PDF no navegador.

O SAGA desenha o texto da petição por cima de um PDF com o timbrado "em branco":
  página 1 = primeira página (capa, quando o timbrado tem a primeira página diferente)
  página 2 = demais páginas
O número da página ("1 / 3") NÃO fica no fundo: o SAGA escreve na hora, no mesmo lugar.
Este script mede onde o número fica e grava isso no arquivo .json ao lado.

Uso: python3 ferramentas/timbrado_fundo.py papel_timbrado.docx pasta_saida
Precisa do LibreOffice (soffice) e de pdftotext. Fontes: Garamond -> EB Garamond, Segoe UI -> Open Sans,
Times New Roman -> Liberation Serif, Calibri -> Carlito (as mesmas que o SAGA usa no PDF).
"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile

def ler(docx):
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(docx) as z:
        z.extractall(tmp)
    return tmp

def zipar(pasta, saida):
    with zipfile.ZipFile(saida, 'w', zipfile.ZIP_DEFLATED) as z:
        for raiz, _, arqs in os.walk(pasta):
            for a in arqs:
                c = os.path.join(raiz, a)
                z.write(c, os.path.relpath(c, pasta))

CORPO = '<w:p/><w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p/>'

def preparar(pasta, sem_numero):
    dp = os.path.join(pasta, 'word', 'document.xml')
    d = open(dp, encoding='utf-8').read()
    d = re.sub(r'<w:body>.*?(<w:sectPr)', lambda m: '<w:body>' + CORPO + m.group(1), d, flags=re.S)
    open(dp, 'w', encoding='utf-8').write(d)
    if not sem_numero:
        return
    for f in os.listdir(os.path.join(pasta, 'word')):
        if not re.match(r'(footer|header)\d*\.xml$', f):
            continue
        fp = os.path.join(pasta, 'word', f)
        x = open(fp, encoding='utf-8').read()
        x = re.sub(r'<w:fldSimple w:instr="\s*(PAGE|NUMPAGES)\s*">.*?</w:fldSimple>', '', x, flags=re.S)
        # campo complexo dentro de uma só corrida (begin ... end)
        x = re.sub(r'<w:r>(?:(?!</w:r>).)*?<w:fldChar w:fldCharType="begin"/>(?:(?!</w:r>).)*?(PAGE|NUMPAGES)(?:(?!</w:r>).)*?</w:r>',
                   '', x, flags=re.S)
        # o separador " / " entre os números
        x = re.sub(r'<w:r>(?:<w:rPr>(?:(?!</w:rPr>).)*</w:rPr>)?<w:t[^>]*> / </w:t></w:r>', '', x, flags=re.S)
        open(fp, 'w', encoding='utf-8').write(x)

def pdf(docx, pasta):
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', pasta, docx], check=True, capture_output=True)
    return os.path.splitext(os.path.join(pasta, os.path.basename(docx)))[0] + '.pdf'

def medir_numero(pdfarq):
    """Acha o "1 / 2" (ou "1") no rodapé da 1ª página: canto direito, linha de base, tamanho."""
    html = subprocess.run(['pdftotext', '-bbox', '-f', '1', '-l', '1', pdfarq, '-'], capture_output=True, text=True).stdout
    alt = float(re.search(r'<page width="([\d.]+)" height="([\d.]+)"', html).group(2))
    palavras = [(float(a), float(b), float(c), float(d), t) for a, b, c, d, t in
                re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', html)]
    baixo = [p for p in palavras if p[1] > alt * 0.75]
    nums = [p for p in baixo if re.fullmatch(r'\d+', p[4])]
    if not nums:
        return None
    # agrupa os números na mesma linha
    linha = [p for p in baixo if abs(p[3] - nums[0][3]) < 2 and re.fullmatch(r'\d+|/', p[4])]
    x0 = min(p[0] for p in linha); x1 = max(p[2] for p in linha)
    y0 = min(p[1] for p in linha); y1 = max(p[3] for p in linha)
    formato = 'N / T' if any(p[4] == '/' for p in linha) else 'N'
    return {'formato': formato, 'x_direita': round(x1, 2), 'x_esquerda': round(x0, 2),
            'topo': round(y0, 2), 'base_caixa': round(y1, 2), 'altura_caixa': round(y1 - y0, 2)}

def tem_numero(docx):
    with zipfile.ZipFile(docx) as z:
        return any(re.search(r'\b(PAGE|NUMPAGES)\b', z.read(n).decode('utf-8', 'ignore'))
                   for n in z.namelist() if re.match(r'word/(footer|header)\d*\.xml$', n))

def main(docx, saida):
    os.makedirs(saida, exist_ok=True)
    nome = os.path.splitext(os.path.basename(docx))[0]
    trab = tempfile.mkdtemp()
    medidas = None
    for sem in (False, True):
        p = ler(docx)
        preparar(p, sem)
        alvo = os.path.join(trab, nome + ('_fundo' if sem else '_medir') + '.docx')
        zipar(p, alvo)
        shutil.rmtree(p)
        arq = pdf(alvo, trab)
        if not sem and tem_numero(docx):
            medidas = medir_numero(arq)
        else:
            shutil.copy(arq, os.path.join(saida, nome + '_fundo.pdf'))
    d = open(os.path.join(ler(docx), 'word', 'document.xml'), encoding='utf-8').read()
    sect = re.findall(r'<w:sectPr.*?</w:sectPr>', d, re.S)[-1]
    info = {'pagina_numero': medidas, 'capa': '<w:titlePg/>' in sect,
            'pgSz': dict(re.findall(r'w:(w|h)="(\d+)"', re.search(r'<w:pgSz[^>]*>', sect).group(0))),
            'pgMar': dict(re.findall(r'w:(\w+)="(-?\d+)"', re.search(r'<w:pgMar[^>]*>', sect).group(0)))}
    json.dump(info, open(os.path.join(saida, nome + '_fundo.json'), 'w'), indent=1)
    print(json.dumps(info, indent=1))
    shutil.rmtree(trab)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
