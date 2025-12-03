# Fase 2: App System - Sistema de Apps Nativos

**Status:** Pendente
**Prioridade:** Alta
**Dependências:** Fase 1 (Foundation)
**Estimativa:** ~20 tasks

---

## ⚠️ POLÍTICA DE ZERO REGRESSÃO - LEIA PRIMEIRO

> **CRÍTICO:** Esta é a fase mais delicada. Você está migrando código existente.
>
> **REGRAS INVIOLÁVEIS:**
> 1. **NUNCA** delete código antigo antes de validar o novo
> 2. **MANTENHA** rotas funcionando em `/app/wallet`, `/app/feed`, etc.
> 3. **COPIE** arquivos para nova estrutura, NÃO mova
> 4. **USE** feature flags para trocar gradualmente
> 5. **TESTE** CADA funcionalidade após cada migração
> 6. **VALIDE** que build e typecheck passam
>
> **Se algo quebrar: PARE e reverta imediatamente.**
>
> **Leia obrigatoriamente:** [ZERO-REGRESSION.md](../04-migration/ZERO-REGRESSION.md)

---

## Objetivo

Migrar todos os módulos existentes (Wallet, Feed, BazChat, etc.) para a nova estrutura de apps, criando manifests e registrando-os no AppRegistry.

---

## Resultado Esperado

Ao final desta fase:
- Pasta `apps/web/src/apps/` com todos os apps migrados
- Cada app com seu `manifest.ts`
- Todos os apps registrados no registry
- Dashboard usando o novo sistema de apps

---

## Pré-requisitos

- Fase 1 completa (types, registry, store, hooks)
- Mapeamento dos módulos existentes (ver CURRENT-MODULES-MAP.md)

---

## Tasks

### Task 2.1: Criar estrutura da pasta apps/

**Prioridade:** Alta
**Tipo:** criar

**Comando:**
```bash
mkdir -p apps/web/src/apps/{wallet,feed,marketplace,bazchat,p2p,governance,analytics,vesting,rewards,delivery,discover,affiliates,stores,vr}
```

**Critérios de Aceite:**
- [ ] Pastas criadas para todos os 14 apps

---

### Task 2.2: Criar manifest do app Wallet

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/wallet/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const walletApp: BazariApp = {
  id: 'wallet',
  name: 'Wallet',
  slug: 'wallet',
  version: '1.0.0',

  icon: 'Wallet',
  color: 'from-green-500 to-emerald-600',
  description: 'Gerencie seus tokens BZR e ZARI',

  category: 'finance',
  tags: ['tokens', 'saldo', 'transferência', 'bzr', 'zari'],

  entryPoint: '/app/wallet',
  component: lazy(() => import('@/modules/wallet')),

  permissions: [
    { id: 'wallet.balance.read', reason: 'Exibir seu saldo de tokens' },
    { id: 'wallet.history.read', reason: 'Mostrar histórico de transações' },
    { id: 'wallet.transfer.request', reason: 'Realizar transferências' },
    { id: 'blockchain.read', reason: 'Consultar dados on-chain' },
    { id: 'blockchain.sign', reason: 'Assinar transações blockchain' },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: true,
  defaultOrder: 1,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado com todos os campos
- [ ] Lazy loading configurado
- [ ] Permissões corretas

---

### Task 2.3: Criar manifest do app Feed

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/feed/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const feedApp: BazariApp = {
  id: 'feed',
  name: 'Feed Social',
  slug: 'feed',
  version: '1.0.0',

  icon: 'Newspaper',
  color: 'from-blue-500 to-cyan-600',
  description: 'Veja posts da comunidade Bazari',

  category: 'social',
  tags: ['posts', 'social', 'comunidade', 'timeline'],

  entryPoint: '/app/feed',
  component: lazy(() => import('@/pages/FeedPage')),

  permissions: [
    { id: 'feed.read', reason: 'Exibir posts do feed' },
    { id: 'feed.write', reason: 'Criar e interagir com posts', optional: true },
    { id: 'user.profile.read', reason: 'Mostrar informações dos autores' },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: true,
  defaultOrder: 2,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] Permissão de escrita opcional

---

### Task 2.4: Criar manifest do app Marketplace

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/marketplace/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const marketplaceApp: BazariApp = {
  id: 'marketplace',
  name: 'Marketplace',
  slug: 'marketplace',
  version: '1.0.0',

  icon: 'ShoppingBag',
  color: 'from-purple-500 to-pink-600',
  description: 'Compre e venda produtos na comunidade',

  category: 'commerce',
  tags: ['compras', 'vendas', 'produtos', 'loja'],

  entryPoint: '/app/affiliate/dashboard',
  component: lazy(() => import('@/pages/AffiliateDashboardPage')),

  permissions: [
    { id: 'products.read', reason: 'Listar produtos disponíveis' },
    { id: 'orders.read', reason: 'Ver seus pedidos' },
    { id: 'orders.write', reason: 'Realizar compras', optional: true },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: true,
  defaultOrder: 3,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] Entry point correto

---

### Task 2.5: Criar manifest do app BazChat

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/bazchat/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const bazchatApp: BazariApp = {
  id: 'bazchat',
  name: 'BazChat',
  slug: 'chat',
  version: '1.0.0',

  icon: 'MessageCircle',
  color: 'from-indigo-500 to-purple-600',
  description: 'Mensagens criptografadas e negociações',

  category: 'social',
  tags: ['chat', 'mensagens', 'e2e', 'privacidade'],

  entryPoint: '/app/chat',
  component: lazy(() => import('@/pages/chat/ChatInboxPage')),

  permissions: [
    { id: 'messages.read', reason: 'Acessar suas conversas' },
    { id: 'messages.write', reason: 'Enviar mensagens' },
    { id: 'user.profile.read', reason: 'Mostrar info dos contatos' },
    { id: 'notifications.send', reason: 'Alertar novas mensagens' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 4,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] Não vem pré-instalado

---

### Task 2.6: Criar manifest do app P2P

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/p2p/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const p2pApp: BazariApp = {
  id: 'p2p',
  name: 'P2P Exchange',
  slug: 'p2p',
  version: '1.0.0',

  icon: 'ArrowLeftRight',
  color: 'from-cyan-500 to-teal-600',
  description: 'Troca direta de tokens entre usuários',

  category: 'finance',
  tags: ['exchange', 'troca', 'p2p', 'escrow'],

  entryPoint: '/app/p2p',
  component: lazy(() => import('@/modules/p2p')),

  permissions: [
    { id: 'wallet.balance.read', reason: 'Verificar saldo disponível' },
    { id: 'wallet.transfer.request', reason: 'Executar trocas' },
    { id: 'blockchain.sign', reason: 'Assinar transações de escrow' },
    { id: 'messages.write', reason: 'Negociar com contraparte', optional: true },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 5,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] Permissões de escrow

---

### Task 2.7: Criar manifest do app Governance

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/governance/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const governanceApp: BazariApp = {
  id: 'governance',
  name: 'Governança',
  slug: 'governance',
  version: '1.0.0',

  icon: 'Vote',
  color: 'from-violet-500 to-purple-600',
  description: 'Participe das decisões da DAO Bazari',

  category: 'governance',
  tags: ['dao', 'votação', 'propostas', 'governança'],

  entryPoint: '/app/governance',
  component: lazy(() => import('@/modules/governance')),

  permissions: [
    { id: 'blockchain.read', reason: 'Consultar propostas on-chain' },
    { id: 'blockchain.sign', reason: 'Votar em propostas' },
    { id: 'wallet.balance.read', reason: 'Verificar poder de voto' },
  ],

  requiredRoles: ['dao_member'],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 6,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] requiredRoles configurado

---

### Task 2.8: Criar manifest do app Analytics

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/analytics/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const analyticsApp: BazariApp = {
  id: 'analytics',
  name: 'Analytics',
  slug: 'analytics',
  version: '1.0.0',

  icon: 'BarChart3',
  color: 'from-purple-500 to-indigo-600',
  description: 'Métricas e insights do seu perfil',

  category: 'tools',
  tags: ['métricas', 'estatísticas', 'insights', 'dashboard'],

  entryPoint: '/app/analytics',
  component: lazy(() => import('@/pages/AnalyticsPage')),

  permissions: [
    { id: 'user.profile.read', reason: 'Analisar seu perfil' },
    { id: 'feed.read', reason: 'Métricas de engajamento' },
    { id: 'orders.read', reason: 'Estatísticas de vendas', optional: true },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 7,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado

---

### Task 2.9: Criar manifest do app Vesting

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/vesting/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const vestingApp: BazariApp = {
  id: 'vesting',
  name: 'Vesting',
  slug: 'vesting',
  version: '1.0.0',

  icon: 'TrendingUp',
  color: 'from-amber-500 to-orange-600',
  description: 'Acompanhe a liberação dos seus tokens BZR',

  category: 'finance',
  tags: ['vesting', 'tokens', 'liberação', 'schedule'],

  entryPoint: '/vesting',
  component: lazy(() => import('@/modules/vesting')),

  permissions: [
    { id: 'blockchain.read', reason: 'Consultar schedule de vesting' },
    { id: 'blockchain.sign', reason: 'Resgatar tokens liberados' },
    { id: 'wallet.balance.read', reason: 'Exibir tokens disponíveis' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 8,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado

---

### Task 2.10: Criar manifest do app Rewards

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/rewards/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const rewardsApp: BazariApp = {
  id: 'rewards',
  name: 'Rewards & Missões',
  slug: 'rewards',
  version: '1.0.0',

  icon: 'Trophy',
  color: 'from-yellow-500 to-amber-600',
  description: 'Complete missões e ganhe ZARI e BZR',

  category: 'entertainment',
  tags: ['missões', 'rewards', 'gamificação', 'zari'],

  entryPoint: '/app/rewards/missions',
  component: lazy(() => import('@/pages/rewards/MissionsHubPage')),

  permissions: [
    { id: 'user.profile.read', reason: 'Verificar progresso' },
    { id: 'wallet.balance.read', reason: 'Exibir recompensas' },
    { id: 'notifications.send', reason: 'Alertar missões completas' },
  ],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 9,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] Featured = true

---

### Task 2.11: Criar manifest do app Delivery

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/delivery/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const deliveryApp: BazariApp = {
  id: 'delivery',
  name: 'Entregas',
  slug: 'delivery',
  version: '1.0.0',

  icon: 'Truck',
  color: 'from-emerald-500 to-green-600',
  description: 'Gerencie entregas ou torne-se entregador',

  category: 'tools',
  tags: ['entregas', 'delivery', 'logística'],

  entryPoint: '/app/delivery/dashboard',
  component: lazy(() => import('@/pages/delivery/DeliveryDashboardPage')),

  permissions: [
    { id: 'location', reason: 'Rastrear entregas' },
    { id: 'orders.read', reason: 'Ver pedidos para entrega' },
    { id: 'notifications.send', reason: 'Alertar status de entrega' },
  ],

  requiredRoles: ['delivery'],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 10,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] requiredRoles: delivery

---

### Task 2.12: Criar manifest do app Discover

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/discover/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const discoverApp: BazariApp = {
  id: 'discover',
  name: 'Descobrir',
  slug: 'discover',
  version: '1.0.0',

  icon: 'Compass',
  color: 'from-orange-500 to-red-600',
  description: 'Encontre pessoas e tendências',

  category: 'social',
  tags: ['descobrir', 'pessoas', 'trending', 'explorar'],

  entryPoint: '/app/discover/people',
  component: lazy(() => import('@/pages/DiscoverPeoplePage')),

  permissions: [
    { id: 'user.profile.read', reason: 'Mostrar perfis sugeridos' },
    { id: 'feed.read', reason: 'Exibir tendências' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 11,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado

---

### Task 2.13: Criar manifest do app Affiliates

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/affiliates/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const affiliatesApp: BazariApp = {
  id: 'affiliates',
  name: 'Afiliações',
  slug: 'affiliates',
  version: '1.0.0',

  icon: 'UserCheck',
  color: 'from-amber-500 to-yellow-600',
  description: 'Gerencie suas parcerias e comissões',

  category: 'commerce',
  tags: ['afiliados', 'comissões', 'parcerias'],

  entryPoint: '/app/promoter/affiliates',
  component: lazy(() => import('@/pages/promoter/AffiliatesPage')),

  permissions: [
    { id: 'user.profile.read', reason: 'Ver perfil de parceiros' },
    { id: 'wallet.balance.read', reason: 'Exibir comissões' },
    { id: 'orders.read', reason: 'Rastrear vendas afiliadas' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 12,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado

---

### Task 2.14: Criar manifest do app Stores

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/stores/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const storesApp: BazariApp = {
  id: 'stores',
  name: 'Minhas Lojas',
  slug: 'sellers',
  version: '1.0.0',

  icon: 'Store',
  color: 'from-pink-500 to-rose-600',
  description: 'Gerencie suas lojas e produtos',

  category: 'commerce',
  tags: ['lojas', 'vendas', 'produtos', 'seller'],

  entryPoint: '/app/sellers',
  component: lazy(() => import('@/pages/MySellersPage')),

  permissions: [
    { id: 'products.read', reason: 'Listar seus produtos' },
    { id: 'products.write', reason: 'Gerenciar produtos' },
    { id: 'orders.read', reason: 'Ver pedidos recebidos' },
  ],

  requiredRoles: ['seller'],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
  defaultOrder: 13,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] requiredRoles: seller

---

### Task 2.15: Criar manifest do app VR

**Prioridade:** Baixa
**Tipo:** criar

**Arquivo:** `apps/web/src/apps/vr/manifest.ts`

**Código:**
```typescript
import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const vrApp: BazariApp = {
  id: 'vr',
  name: 'Bazari VR',
  slug: 'vr',
  version: '0.1.0',

  icon: 'Glasses',
  color: 'from-fuchsia-500 to-purple-600',
  description: 'Explore o metaverso do marketplace',

  category: 'entertainment',
  tags: ['vr', 'metaverso', '3d', 'realidade virtual'],

  entryPoint: '/vr',
  component: lazy(() => import('@/pages/VREntryPage')),

  permissions: [
    { id: 'user.profile.read', reason: 'Criar avatar' },
    { id: 'camera', reason: 'Experiência AR', optional: true },
  ],

  status: 'beta',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 14,
};
```

**Critérios de Aceite:**
- [ ] Manifest criado
- [ ] Status beta

---

### Task 2.16: Criar arquivo de registro de apps nativos

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/registry/native-apps.ts`

**Código:**
```typescript
import { walletApp } from '@/apps/wallet/manifest';
import { feedApp } from '@/apps/feed/manifest';
import { marketplaceApp } from '@/apps/marketplace/manifest';
import { bazchatApp } from '@/apps/bazchat/manifest';
import { p2pApp } from '@/apps/p2p/manifest';
import { governanceApp } from '@/apps/governance/manifest';
import { analyticsApp } from '@/apps/analytics/manifest';
import { vestingApp } from '@/apps/vesting/manifest';
import { rewardsApp } from '@/apps/rewards/manifest';
import { deliveryApp } from '@/apps/delivery/manifest';
import { discoverApp } from '@/apps/discover/manifest';
import { affiliatesApp } from '@/apps/affiliates/manifest';
import { storesApp } from '@/apps/stores/manifest';
import { vrApp } from '@/apps/vr/manifest';

import type { BazariApp } from '../types';

/**
 * Lista de todos os apps nativos do Bazari
 */
export const NATIVE_APPS: BazariApp[] = [
  walletApp,
  feedApp,
  marketplaceApp,
  bazchatApp,
  p2pApp,
  governanceApp,
  analyticsApp,
  vestingApp,
  rewardsApp,
  deliveryApp,
  discoverApp,
  affiliatesApp,
  storesApp,
  vrApp,
];

/**
 * Apps que vêm pré-instalados para novos usuários
 */
export const PRE_INSTALLED_APPS = NATIVE_APPS
  .filter((app) => app.preInstalled)
  .map((app) => app.id);

/**
 * Mapa de apps por ID para acesso rápido
 */
export const NATIVE_APPS_MAP = new Map<string, BazariApp>(
  NATIVE_APPS.map((app) => [app.id, app])
);
```

**Critérios de Aceite:**
- [ ] Todos os apps importados
- [ ] Lista de pré-instalados
- [ ] Mapa para acesso rápido

---

### Task 2.17: Criar inicializador do registry

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/registry/init.ts`

**Código:**
```typescript
import { appRegistry } from './app-registry';
import { NATIVE_APPS } from './native-apps';

/**
 * Inicializa o registry com todos os apps nativos
 * Deve ser chamado uma vez no bootstrap da aplicação
 */
export function initializeAppRegistry(): void {
  if (appRegistry.isInitialized()) {
    console.warn('[AppRegistry] Já inicializado, ignorando...');
    return;
  }

  console.log('[AppRegistry] Inicializando com', NATIVE_APPS.length, 'apps nativos...');

  appRegistry.registerMany(NATIVE_APPS);
  appRegistry.markInitialized();

  console.log('[AppRegistry] Inicialização completa');
}
```

**Critérios de Aceite:**
- [ ] Função de inicialização criada
- [ ] Log de debug

---

### Task 2.18: Atualizar index do registry

**Prioridade:** Alta
**Tipo:** modificar

**Arquivo:** `apps/web/src/platform/registry/index.ts`

**Código:**
```typescript
export { appRegistry } from './app-registry';
export { NATIVE_APPS, PRE_INSTALLED_APPS, NATIVE_APPS_MAP } from './native-apps';
export { initializeAppRegistry } from './init';
```

**Critérios de Aceite:**
- [ ] Novos exports adicionados

---

### Task 2.19: Adicionar inicialização no App.tsx

**Prioridade:** Alta
**Tipo:** modificar

**Arquivo:** `apps/web/src/App.tsx`

**Descrição:**
Adicionar chamada para `initializeAppRegistry()` no início do App.

**Modificação:**
```typescript
// No topo do arquivo, após imports
import { initializeAppRegistry } from '@/platform/registry';

// Chamar antes do componente App ou em um useEffect no topo
initializeAppRegistry();
```

**Critérios de Aceite:**
- [ ] Registry inicializado no bootstrap
- [ ] Apps disponíveis antes do render

---

### Task 2.20: Criar index para cada pasta de app

**Prioridade:** Média
**Tipo:** criar

**Arquivos a criar:**
- `apps/web/src/apps/wallet/index.ts`
- `apps/web/src/apps/feed/index.ts`
- `apps/web/src/apps/marketplace/index.ts`
- (etc para cada app)

**Código exemplo:**
```typescript
// apps/web/src/apps/wallet/index.ts
export { walletApp } from './manifest';

// Re-export do componente se necessário
export { default } from '@/modules/wallet';
```

**Critérios de Aceite:**
- [ ] Index criado para cada app
- [ ] Exports corretos

---

## Arquivos a Criar (Resumo)

| Arquivo | Tipo |
|---------|------|
| `apps/web/src/apps/wallet/manifest.ts` | criar |
| `apps/web/src/apps/feed/manifest.ts` | criar |
| `apps/web/src/apps/marketplace/manifest.ts` | criar |
| `apps/web/src/apps/bazchat/manifest.ts` | criar |
| `apps/web/src/apps/p2p/manifest.ts` | criar |
| `apps/web/src/apps/governance/manifest.ts` | criar |
| `apps/web/src/apps/analytics/manifest.ts` | criar |
| `apps/web/src/apps/vesting/manifest.ts` | criar |
| `apps/web/src/apps/rewards/manifest.ts` | criar |
| `apps/web/src/apps/delivery/manifest.ts` | criar |
| `apps/web/src/apps/discover/manifest.ts` | criar |
| `apps/web/src/apps/affiliates/manifest.ts` | criar |
| `apps/web/src/apps/stores/manifest.ts` | criar |
| `apps/web/src/apps/vr/manifest.ts` | criar |
| `apps/web/src/platform/registry/native-apps.ts` | criar |
| `apps/web/src/platform/registry/init.ts` | criar |

**Total:** 16 arquivos novos, 2 modificados

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `apps/web/src/platform/registry/index.ts` | Adicionar exports |
| `apps/web/src/App.tsx` | Adicionar inicialização |

---

## Validação da Fase

### Testes Manuais

1. Verificar que `appRegistry.getAll()` retorna 14 apps
2. Verificar que `appRegistry.get('wallet')` retorna o app correto
3. Verificar lazy loading de componentes funciona
4. Verificar filtros por categoria

### Checklist Final

- [ ] 14 manifests de apps criados
- [ ] Registry inicializando corretamente
- [ ] Lazy loading funcionando
- [ ] Permissões declaradas em todos os apps
- [ ] Apps pré-instalados configurados

---

## Próxima Fase

Após completar esta fase, prossiga para:
**[PHASE-03-APP-STORE.md](./PHASE-03-APP-STORE.md)** - Interface da App Store

---

**Documento:** PHASE-02-APP-SYSTEM.md
**Versão:** 1.0.0
**Data:** 2024-12-03
