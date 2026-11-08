#!/usr/bin/env python3
"""SAGA ADV - backup completo (T96/T122).

Lê o banco pela "porta" temporária do bloco 122 (senha de uso único) e monta, na pasta de destino:
  SAGA_Backup_AAAA-MM-DD/
    LEIA-ME.md                 passo a passo para recriar tudo
    dados/<tabela>.json|.csv   todos os dados, uma tabela por arquivo
    estrutura/*.sql|.json      tabelas, chaves, índices, RLS, funções, gatilhos, visões, rotinas, buckets
    blocos_sql/                os blocos SQL anexados à página de continuidade
    codigo/saga-adv-web.zip    o código do site (branch main)
e um .zip com tudo ao lado da pasta.
Uso: python3 backup_saga.py --senha XXX --destino PASTA [--sql-dir PASTA] [--repo PASTA]
"""
import argparse, csv, datetime, io, json, os, shutil, subprocess, sys, urllib.request, zipfile

URL = 'https://fmoskdxgjulagedzjxxk.supabase.co'
# chave pública (a mesma que está no código das telas; não dá acesso a nada sem a senha do bloco 122)
CHAVE = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtb3NrZHhnanVsYWdlZHpqeHhrIiwicm9sZSI6ImFub24iLCJpYXQi'
         'OjE3ODE4NzIyOTEsImV4cCI6MjA5NzQ0ODI5MX0.HstSu8-hw9GC7k3wZPhybYi-gA3W4bmQpeeVcoGqYq8')
PAGINA = 1000


def rpc(base, nome, corpo):
    req = urllib.request.Request(base + '/rest/v1/rpc/' + nome, data=json.dumps(corpo).encode('utf-8'), method='POST',
                                 headers={'apikey': CHAVE, 'Authorization': 'Bearer ' + CHAVE, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode('utf-8'))


def escrever_csv(caminho, linhas):
    cols = []
    for l in linhas:
        for k in l.keys():
            if k not in cols:
                cols.append(k)
    with open(caminho, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(cols)
        for l in linhas:
            w.writerow(['' if l.get(c) is None else (json.dumps(l[c], ensure_ascii=False) if isinstance(l[c], (dict, list)) else l[c]) for c in cols])


def sql_tabelas(est):
    """Recria os CREATE TABLE a partir das colunas e das restrições (chaves, checagens, únicos)."""
    por_tab = {}
    for c in est.get('colunas') or []:
        por_tab.setdefault(c['tabela'], []).append(c)
    restr = {}
    for r in est.get('restricoes') or []:
        restr.setdefault(r['tabela'].replace('public.', ''), []).append(r)
    out = ['-- Tabelas do SAGA (recriadas a partir do banco). Rode antes de funcoes.sql e gatilhos.sql.\n']
    for tab in sorted(por_tab):
        linhas = []
        for c in sorted(por_tab[tab], key=lambda x: x['ordem']):
            tipo = c['udt'] if c['tipo'] in ('USER-DEFINED', 'ARRAY') else c['tipo']
            if c['tipo'] == 'ARRAY':
                tipo = c['udt'].lstrip('_') + '[]'
            l = '  %s %s' % (json.dumps(c['coluna']), tipo)
            if c.get('padrao'):
                l += ' default ' + c['padrao']
            if c.get('nulo') == 'NO':
                l += ' not null'
            linhas.append(l)
        for r in sorted(restr.get(tab, []), key=lambda x: {'p': 0, 'u': 1, 'c': 2, 'f': 3}.get(x['tipo'], 9)):
            if r['tipo'] == 'f':
                continue  # chaves estrangeiras vão no fim (a ordem das tabelas não importa)
            linhas.append('  constraint %s %s' % (json.dumps(r['nome']), r['definicao']))
        out.append('create table if not exists public.%s (\n%s\n);\n' % (json.dumps(tab), ',\n'.join(linhas)))
    out.append('\n-- Chaves estrangeiras\n')
    for tab in sorted(restr):
        for r in restr[tab]:
            if r['tipo'] == 'f':
                out.append('alter table public.%s add constraint %s %s;\n' % (json.dumps(tab), json.dumps(r['nome']), r['definicao']))
    return ''.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--senha', required=True)
    ap.add_argument('--destino', required=True)
    ap.add_argument('--sql-dir')
    ap.add_argument('--repo')
    ap.add_argument('--url', default=URL)
    a = ap.parse_args()

    hoje = datetime.datetime.now().strftime('%Y-%m-%d')
    a.destino = os.path.abspath(a.destino)
    raiz = os.path.join(a.destino, 'SAGA_Backup_' + hoje)
    for sub in ('dados', 'estrutura', 'blocos_sql', 'codigo'):
        os.makedirs(os.path.join(raiz, sub), exist_ok=True)

    print('Lendo a lista de tabelas...')
    tabelas = rpc(a.url, 'backup_tabelas', {'p_senha': a.senha})
    resumo = []
    for t in tabelas:
        nome, total = t['tabela'], t['linhas']
        linhas, inicio = [], 0
        while inicio < total:
            lote = rpc(a.url, 'backup_dados', {'p_senha': a.senha, 'p_tabela': nome, 'p_inicio': inicio, 'p_qtd': PAGINA})
            if not lote:
                break
            linhas.extend(lote)
            inicio += len(lote)
        with open(os.path.join(raiz, 'dados', nome + '.json'), 'w', encoding='utf-8') as f:
            json.dump(linhas, f, ensure_ascii=False, indent=1, default=str)
        escrever_csv(os.path.join(raiz, 'dados', nome + '.csv'), linhas)
        resumo.append((nome, len(linhas), total))
        print('  %-40s %6d linhas' % (nome, len(linhas)))

    print('Lendo a estrutura do banco...')
    est = rpc(a.url, 'backup_estrutura', {'p_senha': a.senha})
    e = os.path.join(raiz, 'estrutura')
    with open(os.path.join(e, 'estrutura_completa.json'), 'w', encoding='utf-8') as f:
        json.dump(est, f, ensure_ascii=False, indent=1, default=str)
    with open(os.path.join(e, '01_tabelas.sql'), 'w', encoding='utf-8') as f:
        f.write(sql_tabelas(est))
    with open(os.path.join(e, '02_indices.sql'), 'w', encoding='utf-8') as f:
        f.write(''.join(i['definicao'].replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS').replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS') + ';\n'
                        for i in (est.get('indices') or []) if not i['nome'].endswith('_pkey')))
    with open(os.path.join(e, '03_funcoes.sql'), 'w', encoding='utf-8') as f:
        f.write(''.join(fn['definicao'].rstrip() + ';\n\n' for fn in (est.get('funcoes') or [])))
    with open(os.path.join(e, '04_gatilhos.sql'), 'w', encoding='utf-8') as f:
        f.write(''.join(g['definicao'] + ';\n' for g in (est.get('gatilhos') or [])))
    with open(os.path.join(e, '05_seguranca_rls.sql'), 'w', encoding='utf-8') as f:
        for r in est.get('rls') or []:
            if r['ligado']:
                f.write('alter table public.%s enable row level security;\n' % json.dumps(r['tabela']))
        for p in est.get('politicas') or []:
            papeis = p['papeis'] if isinstance(p['papeis'], list) else str(p['papeis']).strip('{}').split(',')
            f.write('create policy %s on public.%s as %s for %s to %s%s%s;\n' % (
                json.dumps(p['nome']), json.dumps(p['tabela']), 'permissive' if p['permissiva'] == 'PERMISSIVE' else 'restrictive',
                p['comando'], ', '.join(papeis), (' using (' + p['usando'] + ')') if p.get('usando') else '',
                (' with check (' + p['checando'] + ')') if p.get('checando') else ''))
    with open(os.path.join(e, '06_visoes.sql'), 'w', encoding='utf-8') as f:
        f.write(''.join('create or replace view public.%s as %s\n\n' % (json.dumps(v['nome']), v['definicao']) for v in (est.get('visoes') or [])))
    with open(os.path.join(e, '07_rotinas_cron.sql'), 'w', encoding='utf-8') as f:
        f.write(''.join("select cron.schedule(%s, %s, %s);\n" % (json.dumps(j['nome']).replace('"', "'"), "'" + j['agenda'] + "'", "$cmd$" + j['comando'] + "$cmd$")
                        for j in (est.get('rotinas_cron') or [])))

    if a.sql_dir and os.path.isdir(a.sql_dir):
        for nome in sorted(os.listdir(a.sql_dir)):
            if nome.endswith('.sql'):
                shutil.copy(os.path.join(a.sql_dir, nome), os.path.join(raiz, 'blocos_sql', nome))

    if a.repo and os.path.isdir(a.repo):
        try:
            subprocess.run(['git', '-C', a.repo, 'archive', '--format=zip', '-o', os.path.join(raiz, 'codigo', 'saga-adv-web-main.zip'), 'origin/main'], check=True)
        except Exception as ex:
            print('Aviso: não deu para copiar o código:', ex)

    buckets = est.get('arquivos_por_bucket') or []
    total_arq = sum(b.get('arquivos') or 0 for b in buckets)
    total_gb = sum(b.get('bytes') or 0 for b in buckets) / 1024 ** 3
    with open(os.path.join(raiz, 'LEIA-ME.md'), 'w', encoding='utf-8') as f:
        f.write('''# Backup completo do SAGA ADV — %(hoje)s

Cópia de segurança do sistema do escritório Victor Morais Advocacia. **Tem dados pessoais de clientes: guarde só no seu computador/OneDrive. Nunca envie para o GitHub nem publique.**

## O que tem aqui
- `dados/` — todas as tabelas do banco (%(ntab)d tabelas, %(nlin)d linhas), cada uma em `.json` (completo) e `.csv` (abre no Excel).
- `estrutura/` — como o banco é montado: `01_tabelas.sql`, `02_indices.sql`, `03_funcoes.sql`, `04_gatilhos.sql`, `05_seguranca_rls.sql`, `06_visoes.sql`, `07_rotinas_cron.sql` e `estrutura_completa.json`.
- `blocos_sql/` — os blocos SQL aplicados ao longo do projeto (os mesmos anexados à página de continuidade).
- `codigo/saga-adv-web-main.zip` — o site (todas as telas), como estava na branch main.

## O que NÃO está aqui
- **Arquivos anexados** (documentos, fotos, PDFs): %(narq)d arquivos, cerca de %(gb).1f GB, guardados no Supabase Storage. Para baixar: Supabase > Storage > cada bucket > selecionar e baixar; ou pedir ao Claude um roteiro de download por bucket quando o plano Pro estiver ativo.
- **Senhas das Notas**: continuam **criptografadas** nos dados (é o certo). Só abrem no próprio SAGA.
- **Senhas dos usuários**: ficam no sistema de login do Supabase e não são exportadas; ao recriar, cada pessoa recebe um convite novo.

## Como recriar o sistema do zero (passo a passo)
1. **Supabase:** criar um projeto novo. No SQL Editor, rodar nesta ordem: `estrutura/01_tabelas.sql`, `03_funcoes.sql`, `02_indices.sql`, `04_gatilhos.sql`, `05_seguranca_rls.sql`, `06_visoes.sql`. (Se algum comando reclamar de ordem, rode o arquivo de novo: os comandos podem ser repetidos.)
2. **Dados:** importar cada `dados/<tabela>.csv` pelo Table Editor (Import data from CSV), começando por `usuarios`, `papeis`, `permissoes`, `pessoas`, `processos` e depois as demais. O Claude pode fazer isso com os `.json`.
3. **Rotinas automáticas:** rodar `estrutura/07_rotinas_cron.sql` (avisos diários, radar, processos parados).
4. **Login:** em Authentication > URL Configuration, colocar o endereço do site; convidar a equipe de novo.
5. **Site:** criar um repositório no GitHub com o conteúdo de `codigo/saga-adv-web-main.zip`, trocar nas telas o endereço e a chave pública do Supabase novo, e ligar o GitHub Pages (Settings > Pages > main, pasta raiz).
6. **Arquivos:** recriar os buckets do Storage com os mesmos nomes e subir os arquivos baixados.

## Conferência deste backup
| Tabela | Linhas copiadas | Linhas no banco |
|---|---:|---:|
%(tabela)s
''' % {'hoje': hoje, 'ntab': len(resumo), 'nlin': sum(r[1] for r in resumo), 'narq': total_arq, 'gb': total_gb,
       'tabela': '\n'.join('| %s | %d | %d |%s' % (n, c, t, '' if c == t else ' ⚠️') for n, c, t in resumo)})

    pacote = raiz + '.zip'
    with zipfile.ZipFile(pacote, 'w', zipfile.ZIP_DEFLATED) as z:
        for pasta, _, arqs in os.walk(raiz):
            for arq in arqs:
                cam = os.path.join(pasta, arq)
                z.write(cam, os.path.relpath(cam, a.destino))
    faltas = [r for r in resumo if r[1] != r[2]]
    print('\nPronto: %s (%.1f MB). Tabelas: %d. Diferenças: %d.' % (pacote, os.path.getsize(pacote) / 1024 ** 2, len(resumo), len(faltas)))
    return 0 if not faltas else 2


if __name__ == '__main__':
    sys.exit(main())
