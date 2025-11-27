# Debug: Rewards Header Implementation

## 📋 Checklist de Verificação

### ✅ Código Implementado
- [x] AppHeader.tsx modificado
- [x] Import de StreakWidgetCompact e CashbackBalanceCompact
- [x] Aba "Missions" no primaryNavLinks
- [x] Widgets no header right section
- [x] Componentes existem e exportam corretamente

### 🧪 Como Testar

#### 1. Página de Teste (MAIS FÁCIL)
Acesse esta URL após fazer login:
```
http://localhost:5173/app/test-rewards-header
```

Esta página mostra os widgets isolados e deve funcionar!

#### 2. Verificar Header
1. Inicie o servidor:
   ```bash
   cd /root/bazari/apps/web
   pnpm dev
   ```

2. Acesse: `http://localhost:5173`

3. Faça login

4. Procure no header por:
   - Aba "Missions" (entre Marketplace e Chat)
   - Widget 🔥 com número (streak)
   - Widget 💰 com "ZARI" (balance)

#### 3. Abrir Console do Navegador
Pressione F12 e procure por erros relacionados a:
- `StreakWidgetCompact`
- `CashbackBalanceCompact`
- `useRewards`
- `useStreakData`
- `useZariBalance`

### 🔧 Problemas Comuns

#### Problema 1: Widgets não aparecem
**Causa**: Hooks não retornam dados (backend offline)

**Como verificar**:
1. Abra console do navegador (F12)
2. Veja se há erros de rede (404, 500)
3. Os endpoints esperados:
   - `GET /api/blockchain/rewards/streaks`
   - `GET /api/blockchain/rewards/zari/balance`

**Solução Temporária**: Os widgets devem mostrar valores padrão (0)

#### Problema 2: Erro de import
**Causa**: Caminho de import incorreto

**Como verificar**:
```bash
grep -n "StreakWidgetCompact\|CashbackBalanceCompact" /root/bazari/apps/web/src/components/AppHeader.tsx
```

Deve mostrar linha 25 com: `from "./rewards/index"`

#### Problema 3: Cache do navegador
**Solução**: Limpar cache
- Chrome/Edge: Ctrl+Shift+R
- Firefox: Ctrl+F5

### 📊 Estado Atual do Código

**AppHeader.tsx linha 25**:
```typescript
import { StreakWidgetCompact, CashbackBalanceCompact } from "./rewards/index";
```

**AppHeader.tsx linha 56** (primaryNavLinks):
```typescript
{ 
  to: '/app/rewards/missions', 
  label: t('nav.missions', { defaultValue: 'Missions' }), 
  icon: Target, 
  checkActive: () => isActive('/app/rewards') 
},
```

**AppHeader.tsx linhas 300-305** (widgets):
```typescript
<Link to="/app/rewards/streaks" className="hover:opacity-80 transition-opacity">
  <StreakWidgetCompact />
</Link>
<Link to="/app/rewards/cashback" className="hover:opacity-80 transition-opacity">
  <CashbackBalanceCompact />
</Link>
```

### 🎯 Teste Rápido via Console

Abra o console do navegador e execute:

```javascript
// Verificar se os componentes estão disponíveis
console.log("Testing Rewards Components...");

// Tentar importar dinâmicamente
import('./components/rewards/index').then(module => {
  console.log("✅ Rewards module loaded:", Object.keys(module));
}).catch(err => {
  console.error("❌ Failed to load rewards module:", err);
});
```

### 📝 Próximos Passos se Não Funcionar

1. **Verificar compilação**:
   ```bash
   cd /root/bazari/apps/web
   pnpm build
   ```

2. **Verificar erros de TypeScript**:
   ```bash
   pnpm exec tsc --noEmit | grep -i "reward\|streak\|cashback"
   ```

3. **Verificar se o servidor recarregou**:
   - Após modificar AppHeader.tsx, o Vite deve recarregar automaticamente
   - Se não recarregou, pare (Ctrl+C) e inicie novamente

4. **Teste de Importação Manual**:
   Crie arquivo temporário: `test-import.ts`
   ```typescript
   import { StreakWidgetCompact } from './components/rewards/index';
   console.log(StreakWidgetCompact);
   ```

### 🐛 Debug Avançado

Se nada funcionar, verifique se há erro nos hooks:

```bash
cat /root/bazari/apps/web/src/hooks/blockchain/useRewards.ts | grep -A 10 "useStreakData\|useZariBalance"
```

Os hooks devem ter fallback:
```typescript
const currentStreak = streakData?.currentStreak || 0;  // Fallback para 0
const balance = balanceData?.formatted || '0.00';      // Fallback para '0.00'
```

### ✅ Confirmação Final

Após testar, você deve ver:

1. **No header desktop**:
   ```
   [B] Feed | Marketplace | Missions | Chat | [...] | 🔥0 | 💰0.00 | 🔔 | 👤
   ```

2. **No menu mobile**:
   ```
   ☰ Menu
   - Feed
   - Marketplace
   - Missions  ← DEVE APARECER
   - Chat
   ```

3. **Na página de teste** (`/app/test-rewards-header`):
   - Dois widgets visíveis
   - Sem erros no console
   - Valores padrão (0) se backend offline

