#!/bin/bash

# ============================================
# Script Completo para criar estrutura Bazari
# Versão com validação e contador de arquivos
# ============================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contador de arquivos
FILE_COUNT=0
DIR_COUNT=0

# Função para criar diretório
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        ((DIR_COUNT++))
        echo -e "${GREEN}✓${NC} Diretório criado: $1"
    else
        echo -e "${YELLOW}⚠${NC}  Diretório já existe: $1"
    fi
}

# Função para criar arquivo
create_file() {
    if [ ! -f "$1" ]; then
        touch "$1"
        ((FILE_COUNT++))
        echo -e "${GREEN}✓${NC} Arquivo criado: $1"
    else
        echo -e "${YELLOW}⚠${NC}  Arquivo já existe: $1"
    fi
}

# ============================================
# INÍCIO DO SCRIPT
# ============================================

clear
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🏪 BAZARI - CRIADOR DE ESTRUTURA   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se deve criar na pasta atual ou nova
read -p "Criar projeto em nova pasta 'bazari'? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    PROJECT_ROOT="bazari"
    create_dir "$PROJECT_ROOT"
    cd "$PROJECT_ROOT"
else
    PROJECT_ROOT="."
    echo -e "${BLUE}Criando na pasta atual: $(pwd)${NC}"
fi

# ============================================
# ESTRUTURA DE DIRETÓRIOS
# ============================================

echo ""
echo -e "${BLUE}[1/4] Criando estrutura de diretórios...${NC}"
echo ""

# Apps
create_dir "apps"
create_dir "apps/web"
create_dir "apps/web/public"
create_dir "apps/web/src"
create_dir "apps/web/src/components"
create_dir "apps/web/src/components/ui"
create_dir "apps/web/src/i18n"
create_dir "apps/web/src/lib"
create_dir "apps/web/src/styles"
create_dir "apps/web/src/theme"

# Packages
create_dir "packages"

# ============================================
# ARQUIVOS DA RAIZ
# ============================================

echo ""
echo -e "${BLUE}[2/4] Criando arquivos na raiz...${NC}"
echo ""

create_file "package.json"
create_file "pnpm-workspace.yaml"
create_file ".gitignore"
create_file ".editorconfig"
create_file ".nvmrc"
create_file "README.md"
create_file "setup.sh"
create_file "INSTALLATION.md"

# Tornar setup.sh executável
chmod +x setup.sh 2>/dev/null

# ============================================
# ARQUIVOS DO APPS/WEB
# ============================================

echo ""
echo -e "${BLUE}[3/4] Criando arquivos de configuração...${NC}"
echo ""

create_file "apps/web/package.json"
create_file "apps/web/index.html"
create_file "apps/web/vite.config.ts"
create_file "apps/web/tsconfig.json"
create_file "apps/web/tsconfig.node.json"
create_file "apps/web/tailwind.config.js"
create_file "apps/web/postcss.config.js"
create_file "apps/web/README.md"

# ============================================
# ARQUIVOS DO SRC E COMPONENTES
# ============================================

echo ""
echo -e "${BLUE}[4/4] Criando arquivos da aplicação...${NC}"
echo ""

# Arquivos principais do src
create_file "apps/web/src/main.tsx"
create_file "apps/web/src/App.tsx"
create_file "apps/web/src/vite-env.d.ts"

# Styles
create_file "apps/web/src/styles/index.css"

# Lib
create_file "apps/web/src/lib/utils.ts"

# Theme
create_file "apps/web/src/theme/ThemeProvider.tsx"

# i18n
create_file "apps/web/src/i18n/index.ts"
create_file "apps/web/src/i18n/pt.json"
create_file "apps/web/src/i18n/en.json"
create_file "apps/web/src/i18n/es.json"

# Componentes principais
create_file "apps/web/src/components/Header.tsx"
create_file "apps/web/src/components/Hero.tsx"
create_file "apps/web/src/components/Features.tsx"
create_file "apps/web/src/components/Roadmap.tsx"
create_file "apps/web/src/components/CTASection.tsx"
create_file "apps/web/src/components/Footer.tsx"
create_file "apps/web/src/components/ThemeSwitcher.tsx"
create_file "apps/web/src/components/LanguageSwitcher.tsx"
create_file "apps/web/src/components/ThemeGallery.tsx"

# Componentes UI
create_file "apps/web/src/components/ui/button.tsx"

# ============================================
# RELATÓRIO FINAL
# ============================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           📊 RELATÓRIO FINAL           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Estrutura criada com sucesso!${NC}"
echo ""
echo "📈 Estatísticas:"
echo "   • Diretórios criados: $DIR_COUNT"
echo "   • Arquivos criados: $FILE_COUNT"
echo "   • Total de items: $((DIR_COUNT + FILE_COUNT))"
echo ""

# Mostrar árvore se disponível
if command -v tree &> /dev/null; then
    echo "📁 Estrutura final:"
    tree -L 3 --dirsfirst
else
    echo "📁 Estrutura criada:"
    echo "   bazari/"
    echo "   ├── apps/"
    echo "   │   └── web/"
    echo "   │       ├── public/"
    echo "   │       ├── src/"
    echo "   │       │   ├── components/"
    echo "   │       │   ├── i18n/"
    echo "   │       │   ├── lib/"
    echo "   │       │   ├── styles/"
    echo "   │       │   └── theme/"
    echo "   │       └── [arquivos de config]"
    echo "   ├── packages/"
    echo "   └── [arquivos da raiz]"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🎯 PRÓXIMOS PASSOS             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo "1. Copie o conteúdo dos artifacts para cada arquivo"
echo "2. Execute os comandos:"
echo ""
echo -e "   ${GREEN}pnpm install${NC}"
echo -e "   ${GREEN}pnpm dev${NC}"
echo ""
echo "3. Acesse: http://localhost:5173"
echo ""
echo "💡 Dica: Use o comando abaixo para verificar arquivos vazios:"
echo "   find . -type f -empty"
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"