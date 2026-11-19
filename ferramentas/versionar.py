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
# 19/11 (Dr. Victor: "aplico e não reflete"): a versão publicada também vai para versao.txt; ao abrir, cada tela
# confere esse arquivo (saga_guard.js, bloco "Versão nova do SAGA") e, se estiver com os arquivos antigos guardados
# pelo navegador, recarrega sozinha (ou avisa "Atualizar agora" se a pessoa já estiver mexendo).
with open('versao.txt', 'w', encoding='utf-8') as a:
    a.write(v + '\n')
print('versão', v)
