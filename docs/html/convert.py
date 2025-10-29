#!/usr/bin/env python3
"""
Script para converter documentação Markdown para HTML multi-idioma
Bazari Documentation Generator
"""

import os
import re
from pathlib import Path

# Mapeamento de nomes de arquivos
DOC_MAPPING = {
    'pt': {
        '01': '01-visao-geral',
        '02': '02-proof-of-commerce',
        '03': '03-dores-mercado',
        '04': '04-modulos-ecossistema',
        '05': '05-arquitetura',
        '06': '06-roadmap'
    },
    'en': {
        '01': '01-overview-context',
        '02': '02-proof-of-commerce',
        '03': '03-market-pain-points',
        '04': '04-ecosystem-modules',
        '05': '05-architecture',
        '06': '06-roadmap'
    },
    'es': {
        '01': '01-vision-general',
        '02': '02-proof-of-commerce',
        '03': '03-problemas-mercado',
        '04': '04-modulos-ecosistema',
        '05': '05-arquitectura',
        '06': '06-roadmap'
    }
}

# Títulos dos documentos
TITLES = {
    'pt': {
        '01': 'Visão Geral e Contexto',
        '02': 'Proof of Commerce - Especificação Técnica',
        '03': 'Dores do Mercado e Soluções Bazari',
        '04': 'Módulos do Ecossistema Bazari',
        '05': 'Arquitetura e Implementação Técnica',
        '06': 'Roadmap e Evolução Futura'
    },
    'en': {
        '01': 'Overview and Context',
        '02': 'Proof of Commerce - Technical Specification',
        '03': 'Market Pain Points and Bazari Solutions',
        '04': 'Bazari Ecosystem Modules',
        '05': 'Architecture and Technical Implementation',
        '06': 'Roadmap and Future Evolution'
    },
    'es': {
        '01': 'Visión General y Contexto',
        '02': 'Proof of Commerce - Especificación Técnica',
        '03': 'Problemas del Mercado y Soluciones Bazari',
        '04': 'Módulos del Ecosistema Bazari',
        '05': 'Arquitectura e Implementación Técnica',
        '06': 'Roadmap y Evolución Futura'
    }
}

# Navegação
NAV_LABELS = {
    'pt': {
        'home': 'Início',
        'prev': '← Anterior',
        'next': 'Próximo →',
        'docs': 'Documentação'
    },
    'en': {
        'home': 'Home',
        'prev': '← Previous',
        'next': 'Next →',
        'docs': 'Documentation'
    },
    'es': {
        'home': 'Inicio',
        'prev': '← Anterior',
        'next': 'Siguiente →',
        'docs': 'Documentación'
    }
}

def markdown_to_html(markdown_text):
    """Converte Markdown básico para HTML"""
    html = markdown_text

    # Headers
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)

    # Code blocks
    html = re.sub(r'```(\w+)?\n(.*?)\n```', r'<pre><code class="language-\1">\2</code></pre>', html, flags=re.DOTALL)

    # Inline code
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)

    # Bold
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

    # Italic
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)

    # Links
    html = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2">\1</a>', html)

    # Lists
    html = re.sub(r'^\- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'(<li>.*</li>)', r'<ul>\1</ul>', html, flags=re.DOTALL)

    # Paragraphs
    lines = html.split('\n')
    result = []
    in_list = False
    for line in lines:
        if line.strip():
            if not any(tag in line for tag in ['<h', '<pre>', '<ul>', '<li>', '<code>', '</code>']):
                result.append(f'<p>{line}</p>')
            else:
                result.append(line)

    return '\n'.join(result)

def generate_html_template(lang, doc_num, content, title):
    """Gera template HTML completo"""

    nav_items = []
    for num in ['01', '02', '03', '04', '05', '06']:
        filename = DOC_MAPPING[lang][num]
        doc_title = TITLES[lang][num]
        active = 'class="active"' if num == doc_num else ''
        nav_items.append(f'<li><a href="{filename}.html" {active}>{num}. {doc_title}</a></li>')

    nav_html = '\n          '.join(nav_items)

    # Navegação prev/next
    prev_link = ''
    next_link = ''

    if doc_num != '01':
        prev_num = f"{int(doc_num)-1:02d}"
        prev_file = DOC_MAPPING[lang][prev_num]
        prev_link = f'<a href="{prev_file}.html" class="prev">{NAV_LABELS[lang]["prev"]}</a>'

    if doc_num != '06':
        next_num = f"{int(doc_num)+1:02d}"
        next_file = DOC_MAPPING[lang][next_num]
        next_link = f'<a href="{next_file}.html" class="next">{NAV_LABELS[lang]["next"]}</a>'

    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{title} - Bazari Documentation">
  <title>{title} | Bazari Docs</title>
  <link rel="stylesheet" href="../assets/style.css">
  <link rel="stylesheet" href="../assets/prism.css">
</head>
<body>
  <div class="doc-container">
    <!-- Header -->
    <header class="doc-header">
      <h1><span class="logo">🏪</span> Bazari Docs</h1>
      <div class="doc-controls">
        <nav class="lang-switcher">
          <button data-lang="pt" {"class='active'" if lang == 'pt' else ''}>🇧🇷 PT</button>
          <button data-lang="en" {"class='active'" if lang == 'en' else ''}>🇺🇸 EN</button>
          <button data-lang="es" {"class='active'" if lang == 'es' else ''}>🇪🇸 ES</button>
        </nav>
        <button class="theme-toggle">🌙</button>
      </div>
    </header>

    <!-- Sidebar -->
    <aside class="doc-sidebar">
      <h2>📚 {NAV_LABELS[lang]['docs']}</h2>
      <nav class="doc-nav">
        <ul>
          <li><a href="index.html">🏠 {NAV_LABELS[lang]['home']}</a></li>
          {nav_html}
        </ul>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="doc-main">
      {content}

      <!-- Navigation -->
      <div class="doc-navigation">
        {prev_link}
        {next_link}
      </div>
    </main>
  </div>

  <script src="../assets/script.js"></script>
</body>
</html>'''

def convert_document(source_md, lang, doc_num):
    """Converte um documento Markdown para HTML"""

    # Lê o Markdown
    with open(source_md, 'r', encoding='utf-8') as f:
        markdown_content = f.read()

    # Remove metadados do topo (título do documento executivo)
    markdown_content = re.sub(r'^# Bazari - Documento Executivo.*?\n---\n', '', markdown_content, flags=re.DOTALL)

    # Converte para HTML
    html_content = markdown_to_html(markdown_content)

    # Gera HTML completo
    title = TITLES[lang][doc_num]
    filename = DOC_MAPPING[lang][doc_num]
    full_html = generate_html_template(lang, doc_num, html_content, title)

    # Salva
    output_path = f'/root/bazari/docs/html/{lang}/{filename}.html'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_html)

    print(f'✅ Created: {output_path}')

def main():
    """Função principal"""

    source_dir = Path('/root/bazari/docs/baz/exec')

    # Mapeamento de arquivos fonte
    source_files = {
        '01': '01-visao-geral-e-contexto.md',
        '02': '02-proof-of-commerce-tecnico.md',
        '03': '03-dores-mercado-solucoes.md',
        '04': '04-modulos-ecossistema.md',
        '05': '05-arquitetura-implementacao.md',
        '06': '06-roadmap-evolucao.md'
    }

    print('🚀 Iniciando conversão de documentação...\n')

    # Por enquanto, apenas português (os arquivos fonte estão em PT)
    for doc_num, filename in source_files.items():
        source_path = source_dir / filename
        if source_path.exists():
            print(f'📄 Convertendo {filename}...')
            convert_document(source_path, 'pt', doc_num)
        else:
            print(f'⚠️  Arquivo não encontrado: {source_path}')

    print('\n✅ Conversão concluída!')
    print('\n📝 Nota: Traduções para EN e ES serão adicionadas em seguida.')

if __name__ == '__main__':
    main()
