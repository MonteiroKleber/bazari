#!/bin/bash

# ============================================
# Script: etapa-02.sh
# Descrição: Cria estrutura de arquivos novos para API Bazari
# Prompt 2 - Backend (Fastify + Prisma + Postgres)
# ============================================

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    🚀 BAZARI API - CRIADOR DE ARQUIVOS ║${NC}"
echo -e "${BLUE}║          Etapa 02 - Backend API        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Contador
CREATED_FILES=0
CREATED_DIRS=0

# Função para criar diretório
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        ((CREATED_DIRS++))
        echo -e "${GREEN}✓${NC} Diretório criado: $1"
    else
        echo -e "${YELLOW}⚠${NC}  Diretório já existe: $1"
    fi
}

# Função para criar arquivo vazio
create_file() {
    if [ ! -f "$1" ]; then
        touch "$1"
        ((CREATED_FILES++))
        echo -e "${GREEN}✓${NC} Arquivo criado: $1"
    else
        echo -e "${YELLOW}⚠${NC}  Arquivo já existe: $1"
    fi
}

# ============================================
# CRIAR ESTRUTURA DE DIRETÓRIOS
# ============================================

echo -e "${BLUE}[1/3] Criando estrutura de diretórios...${NC}"
echo ""

# Diretórios da API
create_dir "apps/api"
create_dir "apps/api/prisma"
create_dir "apps/api/src"
create_dir "apps/api/src/plugins"
create_dir "apps/api/src/storage"
create_dir "apps/api/src/routes"

echo ""

# ============================================
# CRIAR ARQUIVO DOCKER-COMPOSE NA RAIZ
# ============================================

echo -e "${BLUE}[2/3] Criando arquivo Docker Compose...${NC}"
echo ""

create_file "docker-compose.dev.yml"

echo ""

# ============================================
# CRIAR ARQUIVOS DA API
# ============================================

echo -e "${BLUE}[3/3] Criando arquivos da API...${NC}"
echo ""

# Arquivos de configuração na raiz da API
create_file "apps/api/package.json"
create_file "apps/api/tsconfig.json"
create_file "apps/api/tsconfig.build.json"
create_file "apps/api/.env.example"
create_file "apps/api/README.md"

# Arquivos Prisma
create_file "apps/api/prisma/schema.prisma"
create_file "apps/api/prisma/seed.ts"

# Arquivo principal do servidor
create_file "apps/api/src/server.ts"
create_file "apps/api/src/env.ts"

# Plugins
create_file "apps/api/src/plugins/cors.ts"
create_file "apps/api/src/plugins/logger.ts"
create_file "apps/api/src/plugins/multipart.ts"
create_file "apps/api/src/plugins/static.ts"

# Storage adapters
create_file "apps/api/src/storage/StorageAdapter.ts"
create_file "apps/api/src/storage/LocalFsStorage.ts"
create_file "apps/api/src/storage/S3Storage.ts"

# Rotas
create_file "apps/api/src/routes/health.ts"
create_file "apps/api/src/routes/media.ts"
create_file "apps/api/src/routes/categories.ts"

echo ""

# ============================================
# RELATÓRIO FINAL
# ============================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           📊 RELATÓRIO FINAL           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Estrutura criada com sucesso!${NC}"
echo ""
echo "📈 Estatísticas:"
echo "   • Diretórios criados: $CREATED_DIRS"
echo "   • Arquivos criados: $CREATED_FILES"
echo "   • Total: $((CREATED_DIRS + CREATED_FILES)) itens"
echo ""

# Mostrar estrutura criada
echo "📁 Estrutura criada:"
echo ""
echo "docker-compose.dev.yml"
echo "apps/api/"
echo "├── package.json"
echo "├── tsconfig.json"
echo "├── tsconfig.build.json"
echo "├── .env.example"
echo "├── README.md"
echo "├── prisma/"
echo "│   ├── schema.prisma"
echo "│   └── seed.ts"
echo "└── src/"
echo "    ├── server.ts"
echo "    ├── env.ts"
echo "    ├── plugins/"
echo "    │   ├── cors.ts"
echo "    │   ├── logger.ts"
echo "    │   ├── multipart.ts"
echo "    │   └── static.ts"
echo "    ├── storage/"
echo "    │   ├── StorageAdapter.ts"
echo "    │   ├── LocalFsStorage.ts"
echo "    │   └── S3Storage.ts"
echo "    └── routes/"
echo "        ├── health.ts"
echo "        ├── media.ts"
echo "        └── categories.ts"
echo ""

# ============================================
# PRÓXIMOS PASSOS
# ============================================

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🎯 PRÓXIMOS PASSOS             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo "1. Copie o conteúdo dos arquivos gerados pelo Claude"
echo "2. Cole cada conteúdo no arquivo correspondente"
echo "3. Atualize o .gitignore com as novas entradas"
echo "4. Execute os comandos de setup:"
echo ""
echo -e "   ${GREEN}cp apps/api/.env.example apps/api/.env${NC}"
echo -e "   ${GREEN}pnpm install${NC}"
echo -e "   ${GREEN}pnpm --filter @bazari/api prisma:migrate${NC}"
echo -e "   ${GREEN}pnpm --filter @bazari/api seed${NC}"
echo -e "   ${GREEN}pnpm --filter @bazari/api dev${NC}"
echo ""
echo "💡 Dica: Para verificar arquivos vazios criados:"
echo "   find apps/api -type f -empty"
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"

# Tornar o script executável (auto-referência)
chmod +x "$0" 2>/dev/null

exit 0