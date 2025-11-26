#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔍 VERIFICAÇÃO FINAL - REWARDS & MISSIONS NAVIGATION      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

echo "📂 Verificando estrutura de arquivos..."
echo ""

# 1. Check hooks file exists
if [ -f "/root/bazari/apps/web/src/hooks/blockchain/useRewards.ts" ]; then
    check_pass "Hooks file exists (useRewards.ts)"
else
    check_fail "Hooks file NOT FOUND (useRewards.ts)"
fi

# 2. Check components exist
COMPONENTS=(
    "StreakWidget.tsx"
    "CashbackBalance.tsx"
    "MissionCard.tsx"
    "MissionProgress.tsx"
    "RewardsSummary.tsx"
    "ConvertZariModal.tsx"
    "StreakCalendar.tsx"
    "MilestonesList.tsx"
)

echo ""
echo "🎨 Verificando componentes..."
for comp in "${COMPONENTS[@]}"; do
    if [ -f "/root/bazari/apps/web/src/components/rewards/$comp" ]; then
        check_pass "Component exists: $comp"
    else
        check_fail "Component NOT FOUND: $comp"
    fi
done

# 3. Check barrel export
echo ""
echo "📦 Verificando barrel export..."
if [ -f "/root/bazari/apps/web/src/components/rewards/index.ts" ]; then
    check_pass "Barrel export exists (index.ts)"

    # Check if it exports the key components
    if grep -q "StreakWidgetCompact" "/root/bazari/apps/web/src/components/rewards/index.ts"; then
        check_pass "Exports StreakWidgetCompact"
    else
        check_fail "Does NOT export StreakWidgetCompact"
    fi

    if grep -q "CashbackBalanceCompact" "/root/bazari/apps/web/src/components/rewards/index.ts"; then
        check_pass "Exports CashbackBalanceCompact"
    else
        check_fail "Does NOT export CashbackBalanceCompact"
    fi
else
    check_fail "Barrel export NOT FOUND (index.ts)"
fi

# 4. Check pages exist
echo ""
echo "📄 Verificando páginas..."
PAGES=(
    "MissionsHubPage.tsx"
    "StreakHistoryPage.tsx"
    "CashbackDashboardPage.tsx"
    "AdminMissionsManagementPage.tsx"
    "TestRewardsHeader.tsx"
)

for page in "${PAGES[@]}"; do
    if [ -f "/root/bazari/apps/web/src/pages/$page" ]; then
        check_pass "Page exists: $page"
    else
        check_fail "Page NOT FOUND: $page"
    fi
done

# 5. Check AppHeader modifications
echo ""
echo "🎯 Verificando AppHeader.tsx..."

if grep -q "from \"./rewards/index\"" "/root/bazari/apps/web/src/components/AppHeader.tsx"; then
    check_pass "Import path correto (./rewards/index)"
elif grep -q "from \"./rewards\"" "/root/bazari/apps/web/src/components/AppHeader.tsx"; then
    check_warn "Import path antigo detectado (./rewards) - deveria ser (./rewards/index)"
else
    check_fail "Import dos widgets NÃO encontrado"
fi

if grep -q "'/app/rewards/missions'" "/root/bazari/apps/web/src/components/AppHeader.tsx"; then
    check_pass "Aba 'Missions' adicionada ao menu"
else
    check_fail "Aba 'Missions' NÃO encontrada no menu"
fi

if grep -q "StreakWidgetCompact" "/root/bazari/apps/web/src/components/AppHeader.tsx"; then
    check_pass "StreakWidgetCompact usado no header"
else
    check_fail "StreakWidgetCompact NÃO usado no header"
fi

if grep -q "CashbackBalanceCompact" "/root/bazari/apps/web/src/components/AppHeader.tsx"; then
    check_pass "CashbackBalanceCompact usado no header"
else
    check_fail "CashbackBalanceCompact NÃO usado no header"
fi

# 6. Check App.tsx routes
echo ""
echo "🛤️  Verificando rotas em App.tsx..."

if grep -q "rewards/missions" "/root/bazari/apps/web/src/App.tsx"; then
    check_pass "Rota /rewards/missions configurada"
else
    check_fail "Rota /rewards/missions NÃO encontrada"
fi

if grep -q "rewards/streaks" "/root/bazari/apps/web/src/App.tsx"; then
    check_pass "Rota /rewards/streaks configurada"
else
    check_fail "Rota /rewards/streaks NÃO encontrada"
fi

if grep -q "rewards/cashback" "/root/bazari/apps/web/src/App.tsx"; then
    check_pass "Rota /rewards/cashback configurada"
else
    check_fail "Rota /rewards/cashback NÃO encontrada"
fi

if grep -q "test-rewards-header" "/root/bazari/apps/web/src/App.tsx"; then
    check_pass "Rota de teste configurada"
else
    check_warn "Rota de teste NÃO encontrada (opcional)"
fi

# 7. Check if server is running
echo ""
echo "🚀 Verificando servidor..."

if pgrep -f "vite" > /dev/null; then
    check_pass "Servidor Vite está RODANDO"

    # Check if port 5173 is listening
    if ss -tlnp | grep -q ":5173"; then
        check_pass "Porta 5173 está ABERTA"
    else
        check_fail "Porta 5173 NÃO está aberta"
    fi
else
    check_fail "Servidor Vite NÃO está rodando"
fi

# 8. Count total files
echo ""
echo "📊 RESUMO DA IMPLEMENTAÇÃO"
echo "─────────────────────────────────────────────────"

HOOKS_COUNT=$(find /root/bazari/apps/web/src/hooks/blockchain -name "*.ts" -type f 2>/dev/null | wc -l)
COMPONENTS_COUNT=$(find /root/bazari/apps/web/src/components/rewards -name "*.tsx" -type f 2>/dev/null | wc -l)
PAGES_COUNT=$(ls /root/bazari/apps/web/src/pages/*Rewards*.tsx /root/bazari/apps/web/src/pages/*Missions*.tsx /root/bazari/apps/web/src/pages/*Streak*.tsx /root/bazari/apps/web/src/pages/*Cashback*.tsx 2>/dev/null | wc -l)

echo "📁 Hooks criados: $HOOKS_COUNT"
echo "🎨 Componentes criados: $COMPONENTS_COUNT"
echo "📄 Páginas criadas: $PAGES_COUNT"

# 9. Final verdict
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    🎯 VEREDICTO FINAL                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ -f "/root/bazari/apps/web/src/components/AppHeader.tsx" ] && \
   [ -f "/root/bazari/apps/web/src/components/rewards/index.ts" ] && \
   grep -q "StreakWidgetCompact" "/root/bazari/apps/web/src/components/AppHeader.tsx" && \
   pgrep -f "vite" > /dev/null; then
    echo -e "${GREEN}✅ IMPLEMENTAÇÃO COMPLETA E SERVIDOR RODANDO!${NC}"
    echo ""
    echo "🌐 Acesse: http://localhost:5173/"
    echo "🧪 Teste: http://localhost:5173/app/test-rewards-header"
    echo ""
    echo "📖 Leia o guia: /root/bazari/TESTE_NAVEGACAO_REWARDS.md"
else
    echo -e "${RED}❌ AINDA HÁ PROBLEMAS NA IMPLEMENTAÇÃO${NC}"
    echo ""
    echo "Verifique os itens marcados com ❌ acima."
fi

echo ""
