# Troca o número de versão (?v=AAAAMMDDHHMM) dos arquivos do sistema em todas as telas.
# Lê cada arquivo inteiro ANTES de reescrever (o comando antigo de uma linha apagava as telas).
# Inclui o texto do Manual do SAGA (manual/conteudo.js), para o manual novo não ficar preso na memória do navegador.
import re, glob, time, sys, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
v = time.strftime('%Y%m%d%H%M')

# 25/11/2026 (Dr. Victor, REGRA SUPREMA): "ao trocar de tela, a barra de cima e o menu lateral ficam INTACTOS, nem
# piscam; só o conteúdo troca". Se saga_guard.js, saga_ui.js ou saga_tema.css mudaram desde o último teste que
# passou neste computador, roda antes o teste da troca de tela (ferramentas/teste_troca_de_tela.js, banco simulado).
# Falhou: PARA e nada é gravado. Sem Playwright: aviso grande (rode o teste completo antes de publicar).
# Pular (só em emergência, com o OK do Dr. Victor): python3 ferramentas/versionar.py --sem-teste
import hashlib, json, subprocess
def _hash(f):
    try:
        with open(f, 'rb') as a:
            return hashlib.sha1(a.read()).hexdigest()
    except OSError:
        return ''
_marca = os.path.join('ferramentas', '.teste_troca_de_tela_ok')
try:
    with open(_marca, encoding='utf-8') as a:
        _ok = json.load(a)
except Exception:
    _ok = {}
_mudou = not (_ok.get('guard') == _hash('saga_guard.js') and _ok.get('ui') == _hash('saga_ui.js') and _ok.get('tema') == _hash('saga_tema.css'))
if '--sem-teste' in sys.argv:
    print('=' * 78 + '\nATENÇÃO: versão gravada SEM o teste da troca de tela (--sem-teste).\n'
          'Rode antes de publicar: node ferramentas/teste_troca_de_tela.js\n' + '=' * 78)
elif _mudou:
    print('saga_guard.js / saga_ui.js / saga_tema.css mudaram desde o último teste da troca de tela: rodando o teste rápido...')
    try:
        r = subprocess.run(['node', os.path.join('ferramentas', 'teste_troca_de_tela.js'), '--rapido'])
        cod = r.returncode
    except FileNotFoundError:
        cod = 2
    if cod == 1:
        sys.exit('PARADO: o teste da troca de tela FALHOU (menu lateral ou barra de cima piscaram). Nada foi gravado. '
                 'Conserte ou volte atrás antes de publicar (REGRA SUPREMA, 25/11).')
    if cod != 0:
        print('=' * 78 + '\nATENÇÃO: o teste da troca de tela NÃO rodou (Node/Playwright ausente?).\n'
              'NÃO publique mudança em saga_guard.js, saga_ui.js ou saga_tema.css sem rodar:\n'
              '    node ferramentas/teste_troca_de_tela.js\n' + '=' * 78)
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
