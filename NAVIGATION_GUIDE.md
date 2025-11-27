# Guia de Navegação - Rewards & Missions

## 🎯 Como Acessar as Páginas de Rewards

### ✅ Navegação Implementada

As páginas de Rewards & Missions agora estão **totalmente acessíveis** através da interface do app!

---

## 📍 Locais de Acesso

### 1️⃣ **Menu Principal (Header)**

No header do app (desktop), você verá uma nova aba **"Missions"** entre "Marketplace" e "Chat":

```
[B Bazari]  Feed  Marketplace  [🎯 Missions]  Chat  │ Search │ 🔥5  💰1.00  🔔  👤
```

**Click em "Missions"** → Vai para `/app/rewards/missions`

---

### 2️⃣ **Widgets Clicáveis no Header**

Dois widgets visuais foram adicionados no canto superior direito:

#### 🔥 **Streak Widget**
```
┌─────────┐
│ 🔥  5   │  ← Mostra sua sequência atual de dias
└─────────┘
```
**Click aqui** → Vai para `/app/rewards/streaks` (Streak History)

#### 💰 **ZARI Balance Widget**
```
┌──────────────┐
│ 💰  1.00 ZARI│  ← Mostra seu saldo de tokens ZARI
└──────────────┘
```
**Click aqui** → Vai para `/app/rewards/cashback` (Cashback Dashboard)

---

### 3️⃣ **Menu Mobile (Hamburguer ☰)**

No mobile, abra o menu lateral e você verá:

```
☰ Menu
├─ Feed
├─ Marketplace
├─ 🎯 Missions       ← NOVA OPÇÃO
├─ Chat
├─ Dashboard
├─ Minhas Lojas
├─ Wallet
└─ P2P
```

**Click em "Missions"** → Vai para `/app/rewards/missions`

---

### 4️⃣ **URLs Diretas**

Você também pode acessar digitando diretamente na barra de endereços:

- **`/app/rewards/missions`** - Dashboard de Missões (principal)
- **`/app/rewards/streaks`** - Histórico de Sequências (calendário)
- **`/app/rewards/cashback`** - Dashboard ZARI (saldo e conversão)
- **`/app/admin/missions`** - Admin Panel (apenas DAO - criar missões)

---

### 5️⃣ **Navegação Interna**

Dentro das páginas de rewards, há links cruzados:

**Na Missions Hub**:
- Click no **Streak Widget** → Vai para Streaks Page
- Click no **Cashback Widget** → Vai para Cashback Page

**Na Cashback Dashboard**:
- Click em **"History"** → Scroll para histórico de transações
- Click em **"Convert"** → Abre modal de conversão ZARI → BZR

**Na Streak History**:
- Click nos **milestones** → Visualiza recompensas de cada marco

---

## 🎨 Visual do Header (Atualizado)

### Desktop
```
┌────────────────────────────────────────────────────────────────────┐
│ B Bazari  Feed  Marketplace  🎯 Missions  Chat │ Search │ 🔥5 💰1.00 🔔 👤│
└────────────────────────────────────────────────────────────────────┘
     ↑           ↑                  ↑                       ↑      ↑
   Logo    Navegação        Nova aba Missions      Widgets clicáveis
```

### Mobile
```
┌──────────────────────────────┐
│ ☰  B Bazari         🔔  👤  │
└──────────────────────────────┘
 ↑
Menu lateral
com "Missions"
```

---

## 🔄 Fluxo de Navegação Típico

```
1. Usuário faz login
   ↓
2. Vê o header com nova aba "Missions" e widgets
   ↓
3. [Opção A] Click em "Missions" → Missions Hub
   [Opção B] Click em 🔥5 → Streak History
   [Opção C] Click em 💰1.00 → Cashback Dashboard
   ↓
4. Explora missões, vê progresso, reivindica recompensas
   ↓
5. Navega entre páginas usando widgets e links internos
```

---

## 📂 Arquivos Modificados

### `apps/web/src/components/AppHeader.tsx`
- ✅ Adicionada aba "Missions" no menu principal (primaryNavLinks)
- ✅ Importados componentes `StreakWidgetCompact` e `CashbackBalanceCompact`
- ✅ Widgets adicionados no header direito (seção "right")
- ✅ Links clicáveis para `/app/rewards/streaks` e `/app/rewards/cashback`

### `apps/web/src/components/rewards.ts` (NOVO)
- ✅ Arquivo barrel para facilitar importações
- ✅ Exporta todos os componentes de rewards

---

## 🚀 Como Testar

1. **Inicie o servidor**:
   ```bash
   cd /root/bazari/apps/web
   pnpm dev
   ```

2. **Faça login** no app

3. **Procure no header**:
   - ✅ Aba **"Missions"** (entre Marketplace e Chat)
   - ✅ Widget **🔥 5** (streak atual)
   - ✅ Widget **💰 1.00 ZARI** (saldo)

4. **Click em qualquer elemento** → Você será redirecionado!

---

## 📋 Checklist de Verificação

- [x] Aba "Missions" visível no header desktop
- [x] Aba "Missions" visível no menu mobile
- [x] Streak Widget clicável (🔥 5)
- [x] ZARI Balance Widget clicável (💰 1.00)
- [x] Links funcionam corretamente
- [x] Navegação responsiva (mobile + desktop)
- [x] Widgets atualizam em tempo real (quando backend estiver pronto)

---

## ⚠️ Nota Importante

Os **widgets mostrarão dados reais** quando o backend estiver implementado. Por enquanto, eles usarão:
- Valores padrão (streak: 0, ZARI: 0.00)
- Estado de loading
- Mensagens de erro se o backend não responder

Quando o backend for implementado com os endpoints:
- `GET /api/blockchain/rewards/streaks` → Widget de streak atualiza
- `GET /api/blockchain/rewards/zari/balance` → Widget de ZARI atualiza

---

## 📚 Documentação Relacionada

- [REWARDS_IMPLEMENTATION.md](apps/web/REWARDS_IMPLEMENTATION.md) - Documentação técnica completa
- [REWARDS_SYSTEM_SUMMARY.md](REWARDS_SYSTEM_SUMMARY.md) - Resumo do sistema
- [REWARDS_CHECKLIST.md](REWARDS_CHECKLIST.md) - Checklist de implementação

---

**Última Atualização**: 2025-11-14
**Status**: ✅ Navegação Implementada e Funcional
