#!/usr/bin/env python3
"""
Enhanced Multi-language Documentation Converter
Converts Markdown documentation to HTML with support for PT, EN, ES
"""

import os
import re
from pathlib import Path

# Document mapping for all languages
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

# Titles
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

# Navigation labels
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
    """Enhanced Markdown to HTML converter"""
    html = markdown_text

    # Code blocks (must come before other patterns)
    html = re.sub(r'```(\w+)?\n(.*?)\n```', lambda m: f'<pre><code class="language-{m.group(1) or ""}">{m.group(2)}</code></pre>', html, flags=re.DOTALL)

    # Blockquotes
    html = re.sub(r'^> (.+)$', r'<blockquote><p>\1</p></blockquote>', html, flags=re.MULTILINE)

    # Headers
    html = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)

    # Inline code
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)

    # Bold
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

    # Italic
    html = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', html)

    # Links
    html = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2">\1</a>', html)

    # Numbered lists
    html = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)

    # Unordered lists
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)

    # Wrap consecutive <li> in <ul> or <ol>
    # This is simplified - a full implementation would track list type
    html = re.sub(r'(<li>(?:(?!</li>).|\n)*</li>\s*)+', r'<ul>\g<0></ul>', html)

    # Horizontal rules
    html = re.sub(r'^---$', r'<hr>', html, flags=re.MULTILINE)

    # Paragraphs
    lines = html.split('\n')
    result = []
    for line in lines:
        line = line.strip()
        if line:
            # Don't wrap if already a tag
            if not re.match(r'<(h\d|p|ul|ol|li|pre|code|blockquote|hr|div)', line):
                # Don't wrap closing tags
                if not line.startswith('</'):
                    result.append(f'<p>{line}</p>')
                else:
                    result.append(line)
            else:
                result.append(line)

    return '\n'.join(result)

def generate_html_template(lang, doc_num, content, title):
    """Generate complete HTML template"""

    nav_items = []
    for num in ['01', '02', '03', '04', '05', '06']:
        filename = DOC_MAPPING[lang][num]
        doc_title = TITLES[lang][num]
        active = 'class="active"' if num == doc_num else ''
        nav_items.append(f'<li><a href="{filename}.html" {active}>{num}. {doc_title}</a></li>')

    nav_html = '\n          '.join(nav_items)

    # Previous/Next navigation
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

    # Language button active states
    lang_active = {
        'pt': 'class="active"' if lang == 'pt' else '',
        'en': 'class="active"' if lang == 'en' else '',
        'es': 'class="active"' if lang == 'es' else ''
    }

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
          <button data-lang="pt" {lang_active['pt']}>🇧🇷 PT</button>
          <button data-lang="en" {lang_active['en']}>🇺🇸 EN</button>
          <button data-lang="es" {lang_active['es']}>🇪🇸 ES</button>
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
    """Convert a Markdown document to HTML"""

    # Read Markdown
    with open(source_md, 'r', encoding='utf-8') as f:
        markdown_content = f.read()

    # Remove metadata header
    markdown_content = re.sub(r'^# Bazari.*?---\n', '', markdown_content, flags=re.DOTALL, count=1)

    # Convert to HTML
    html_content = markdown_to_html(markdown_content)

    # Generate complete HTML
    title = TITLES[lang][doc_num]
    filename = DOC_MAPPING[lang][doc_num]
    full_html = generate_html_template(lang, doc_num, html_content, title)

    # Save
    output_path = f'/root/bazari/docs/html/{lang}/{filename}.html'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_html)

    print(f'✅ Created: {output_path}')
    return output_path

def main():
    """Main function"""

    print('🚀 Multi-language Documentation Converter\n')

    # Process each language and document
    # For now, we'll handle what exists

    # Portuguese documents (already converted with previous script)
    print('📋 Portuguese documents already generated\n')

    # English documents (need to be created from translations)
    print('📋 English documents - ready for conversion when translations are available\n')

    # Spanish documents (need to be created from translations)
    print('📋 Spanish documents - ready for conversion when translations are available\n')

    print('✅ Converter ready. Use convert_document(source_md, lang, doc_num) to convert individual files.')

if __name__ == '__main__':
    main()
