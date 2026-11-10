# Troca o número de versão (?v=AAAAMMDDHHMM) dos arquivos do sistema em todas as telas.
# Lê cada arquivo inteiro ANTES de reescrever (o comando antigo de uma linha apagava as telas).
# Inclui o texto do Manual do SAGA (manual/conteudo.js), para o manual novo não ficar preso na memória do navegador.
import re, glob, time, sys, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
v = time.strftime('%Y%m%d%H%M')
padrao = re.compile(r'((?:src|href)=")((?:saga_[a-z_]+|ponto_calculo|manual/conteudo)\.(?:js|css))(?:\?v=\d+)?(")')
for f in glob.glob('*.html'):
    with open(f, encoding='utf-8') as a:
        s = a.read()
    if len(s) < 100:
        sys.exit('PARADO: ' + f + ' está vazio ou quase vazio; confira antes de publicar.')
    novo = padrao.sub(lambda m: m.group(1) + m.group(2) + '?v=' + v + m.group(3), s)
    if len(novo) < len(s) - 50:
        sys.exit('PARADO: ' + f + ' encolheu; nada foi gravado neste arquivo.')
    with open(f, 'w', encoding='utf-8') as a:
        a.write(novo)
print('versão', v)
