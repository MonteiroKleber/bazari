#!/bin/bash

# ============================================
# Script para criar estrutura do projeto Bazari
# Cria todas as pastas e arquivos vazios
# ============================================

echo "🏪 Criando estrutura do projeto Bazari..."
echo ""

# Criar diretório raiz se não existir
PROJECT_ROOT="bazari"
if [ ! -d "$PROJECT_ROOT" ]; then
    mkdir "$PROJECT_ROOT"
    echo "✅ Diretório raiz criado: $PROJECT_ROOT"
else
    echo "⚠️  Diretório $PROJECT_ROOT já existe"
fi

cd "$PROJECT_ROOT"

# ============================================
# CRIAR ESTRUTURA DE DIRETÓRIOS
# ============================================

echo ""
echo "📁 Criando estrutura de diretórios..."

# Diretórios principais
mkdir -p apps/web/public
mkdir -p apps/web/src/components/ui
mkdir -p apps/web/src/i18n
mkdir -p apps/web/src/lib
mkdir -p apps/web/src/styles
mkdir -p apps/web/src/theme
mkdir -p packages

echo "✅ Estrutura de diretórios criada"

# ============================================
# CRIAR ARQUIVOS NA RAIZ
# ============================================

echo ""
echo "📄 Criando arquivos na raiz..."

touch package.json
touch pnpm-workspace.yaml
touch .gitignore
touch .editorconfig
touch .nvmrc
touch README.md
touch setup.sh
touch INSTALLATION.md

echo "✅ Arquivos da raiz criados"

# ============================================
# CRIAR ARQUIVOS DO APPS/WEB
# ============================================

echo ""
echo "📄 Criando arquivos em apps/web..."

cd apps/web

touch package.json
touch index.html
touch vite.config.ts
touch tsconfig.json
touch tsconfig.node.json
touch tailwind.config.js
touch postcss.config.js
touch README.md

echo "✅ Arquivos de configuração do web app criados"

# ============================================
# CRIAR ARQUIVOS DO SRC
# ============================================

echo ""
echo "📄 Criando arquivos em src..."

cd src

# Arquivos na raiz do src
touch main.tsx
touch App.tsx
touch vite-env.d.ts

# Arquivos em styles
touch styles/index.css

# Arquivos em lib
touch lib/utils.ts

# Arquivos em theme
touch theme/ThemeProvider.tsx

# Arquivos em i18n
touch i18n/index.ts
touch i18n/pt.json
touch i18n/en.json
touch i18n/es.json

echo "✅ Arquivos de src criados"

# ============================================
# CRIAR ARQUIVOS DOS COMPONENTES
# ============================================

echo ""
echo "📄 Criando arquivos de componentes..."

# Componentes principais
touch components/Header.tsx
touch components/Hero.tsx
touch components/Features.tsx
touch components/Roadmap.tsx
touch components/CTASection.tsx
touch components/Footer.tsx
touch components/ThemeSwitcher.tsx
touch components/LanguageSwitcher.tsx
touch components/ThemeGallery.tsx

# Componentes UI
touch components/ui/button.tsx

echo "✅ Arquivos de componentes criados"

# ============================================
# VOLTAR PARA A RAIZ DO PROJETO
# ============================================

cd ../../..

# ============================================
# RESUMO FINAL
# ============================================

echo ""
echo "=========================================="
echo "✨ Estrutura criada com sucesso!"
echo "=========================================="
echo ""
echo "📊 Resumo:"
echo "  - Diretório raiz: $PROJECT_ROOT"
echo "  - Apps: web"
echo "  - Packages: (vazio, pronto para futuros packages)"
echo ""
echo "📁 Estrutura de pastas:"
tree -d -L 4 2>/dev/null || {
    echo "  $PROJECT_ROOT/"
    echo "  ├── apps/"
    echo "  │   └── web/"
    echo "  │       ├── public/"
    echo "  │       └── src/"
    echo "  │           ├── components/"
    echo "  │           │   └── ui/"
    echo "  │           ├── i18n/"
    echo "  │           ├── lib/"
    echo "  │           ├── styles/"
    echo "  │           └── theme/"
    echo "  └── packages/"
}
echo ""
echo "📝 Total de arquivos criados: 42"
echo ""
echo "🎯 Próximos passos:"
echo "  1. Copiar o conteúdo dos artifacts para cada arquivo"
echo "  2. Executar: pnpm install"
echo "  3. Executar: pnpm dev"
echo "  4. Acessar: http://localhost:5173"
echo ""
echo "=========================================="