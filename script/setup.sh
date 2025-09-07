#!/bin/bash

# Bazari Monorepo Setup Script

echo "🏪 Configurando o Monorepo Bazari..."
echo ""

# Verifica se o PNPM está instalado
if ! command -v pnpm &> /dev/null
then
    echo "❌ PNPM não encontrado. Instalando..."
    npm install -g pnpm
else
    echo "✅ PNPM já está instalado"
fi

# Instala as dependências
echo ""
echo "📦 Instalando dependências..."
pnpm install

echo ""
echo "✨ Setup completo!"
echo ""
echo "Para iniciar o projeto, execute:"
echo "  pnpm --filter @bazari/web dev"
echo ""
echo "Ou simplesmente:"
echo "  pnpm dev"
echo ""
echo "Acesse http://localhost:5173"