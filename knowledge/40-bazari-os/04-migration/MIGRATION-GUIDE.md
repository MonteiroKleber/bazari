# Migration Guide - Guia de Migração

**Versão:** 1.0.0
**Status:** Draft
**Data:** 2024-12-03

---

## ⚠️ POLÍTICA DE ZERO REGRESSÃO

> **LEIA PRIMEIRO:** [ZERO-REGRESSION.md](./ZERO-REGRESSION.md)
>
> **REGRA FUNDAMENTAL:** A aplicação DEVE continuar funcionando 100% durante toda a migração.
> NENHUMA funcionalidade pode quebrar. Se algo parar de funcionar, PARE e reverta.

---

## Visão Geral

Este guia descreve como migrar os módulos existentes do Bazari para a nova arquitetura de apps do BazariOS.

**IMPORTANTE:** A migração é ADITIVA. Você CRIA novos arquivos ao lado dos antigos, valida que funcionam, e SÓ ENTÃO remove os antigos.

---

## Estratégia de Migração

### Abordagem Incremental (SEGURA)

1. **Fase 1:** Criar infraestrutura (platform/) - APENAS novos arquivos
2. **Fase 2:** COPIAR apps para nova estrutura (não mover, não deletar)
3. **Fase 3:** Usar feature flags para trocar gradualmente
4. **Fase 4:** Validar 100% de funcionalidades
5. **Fase 5:** SOMENTE após validação: remover código legado

### Ordem de Migração Recomendada

| Prioridade | App | Complexidade | Motivo |
|------------|-----|--------------|--------|
| 1 | Wallet | Média | Core, bastante usado |
| 2 | Feed | Baixa | Simples, poucas dependências |
| 3 | Marketplace | Média | Core commerce |
| 4 | Analytics | Baixa | Independente |
| 5 | Governance | Média | Módulo completo |
| 6 | BazChat | Alta | Complexo, E2E |
| 7 | P2P | Alta | Escrow, blockchain |
| 8 | Outros | Variável | Conforme necessidade |

---

## Passo a Passo para Migrar um Módulo

### 1. Criar Estrutura do App

```bash
mkdir -p apps/web/src/apps/{app-name}/{pages,components,hooks}
```

### 2. Criar Manifest

```typescript
// apps/web/src/apps/{app-name}/manifest.ts

import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const {appName}App: BazariApp = {
  id: '{app-id}',
  name: '{App Name}',
  slug: '{app-slug}',
  version: '1.0.0',

  icon: '{IconName}',
  color: 'from-{color}-500 to-{color}-600',
  description: '{Descrição curta}',

  category: '{category}',
  tags: ['{tag1}', '{tag2}'],

  entryPoint: '/app/{slug}',
  component: lazy(() => import('./{MainComponent}')),

  permissions: [
    { id: '{permission}', reason: '{motivo}' },
  ],

  status: 'stable',
  native: true,
  featured: false,
  preInstalled: false,
};
```

### 3. Mover/Adaptar Componentes

#### De (legado):
```
pages/{ModuleName}Page.tsx
components/{module}/ComponentA.tsx
modules/{module}/hooks/useXxx.ts
```

#### Para (novo):
```
apps/{app-name}/pages/{PageName}.tsx
apps/{app-name}/components/ComponentA.tsx
apps/{app-name}/hooks/useXxx.ts
```

### 4. Criar Entry Point

```typescript
// apps/web/src/apps/{app-name}/index.tsx

import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import DetailPage from './pages/DetailPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route index element={<MainPage />} />
      <Route path="detail/:id" element={<DetailPage />} />
    </Routes>
  );
}
```

### 5. Registrar no Native Apps

```typescript
// platform/registry/native-apps.ts

import { {appName}App } from '@/apps/{app-name}/manifest';

export const NATIVE_APPS: BazariApp[] = [
  // ... outros apps
  {appName}App,
];
```

### 6. Atualizar Rotas (App.tsx)

```typescript
// Remover rota hardcoded antiga
// Adicionar rota dinâmica via registry (já configurada)
```

### 7. Testar

- [ ] App aparece no registry
- [ ] Rota funciona
- [ ] Componentes renderizam
- [ ] Hooks funcionam
- [ ] Não há erros no console

---

## Mapeamento de Imports

### Antes (Legado)

```typescript
import { useWallet } from '@/hooks/useWallet';
import { WalletCard } from '@/components/wallet/WalletCard';
import { api } from '@/lib/api';
```

### Depois (Migrado)

```typescript
// Se o código ficou dentro do app
import { useWallet } from '../hooks/useWallet';
import { WalletCard } from '../components/WalletCard';

// Se usa serviço compartilhado
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth'; // Hooks globais
```

---

## Lidando com Dependências

### Dependências Internas (dentro do app)

Mover junto com o app:

```
apps/wallet/
├── hooks/
│   └── useWalletBalance.ts  // Específico do wallet
├── components/
│   └── BalanceCard.tsx      // Específico do wallet
```

### Dependências Compartilhadas (entre apps)

Manter em local compartilhado:

```
hooks/
├── useAuth.ts       // Usado por vários apps
├── useApi.ts        // Usado por vários apps

components/
├── ui/              // Shadcn components
├── common/          // Componentes globais
```

### Dependências Circulares

Se App A depende de App B:
1. Extrair código comum para `lib/` ou `services/`
2. Ou usar navegação via `sdk.navigation.openApp()`

---

## Checklist de Migração por App

### Wallet

- [ ] Criar `apps/wallet/manifest.ts`
- [ ] Mover `modules/wallet/*` para `apps/wallet/`
- [ ] Mover `pages/WalletHome.tsx` para `apps/wallet/pages/`
- [ ] Mover `components/wallet/*` para `apps/wallet/components/`
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar todas as rotas

### Feed

- [ ] Criar `apps/feed/manifest.ts`
- [ ] Mover `pages/FeedPage.tsx` para `apps/feed/pages/`
- [ ] Mover `components/social/*` para `apps/feed/components/`
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar

### BazChat

- [ ] Criar `apps/bazchat/manifest.ts`
- [ ] Mover `pages/chat/*` para `apps/bazchat/pages/`
- [ ] Mover `components/chat/*` para `apps/bazchat/components/`
- [ ] Mover `modules/chat/*` para `apps/bazchat/`
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar E2E encryption

---

## Problemas Comuns

### Import não encontrado

**Problema:**
```
Module not found: Can't resolve '../hooks/useXxx'
```

**Solução:**
1. Verificar se arquivo foi movido
2. Atualizar caminho relativo
3. Ou usar alias `@/apps/...`

### Componente não renderiza

**Problema:**
Tela em branco, sem erros

**Solução:**
1. Verificar lazy loading: `lazy(() => import(...))`
2. Verificar se export é `default`
3. Verificar se Suspense envolve a rota

### Estado não persiste

**Problema:**
Estado resetado ao navegar

**Solução:**
1. Verificar se store está fora do componente do app
2. Usar Zustand persist se necessário
3. Elevar estado se compartilhado

### Permissões negadas

**Problema:**
```
Error: Permission denied: wallet.balance.read
```

**Solução:**
1. Adicionar permissão no manifest
2. Verificar se usuário concedeu na instalação
3. Para apps nativos, permissões são auto-concedidas

---

## Rollback

Se migração causar problemas:

### Opção 1: Manter Ambos

Durante transição, manter código antigo e novo funcionando:

```typescript
// App.tsx
<Route path="/app/wallet/*" element={<WalletLegacy />} />  // Antigo
<Route path="/app/wallet-new/*" element={<WalletNew />} /> // Novo
```

### Opção 2: Feature Flag

```typescript
const USE_NEW_WALLET = process.env.NEXT_PUBLIC_NEW_WALLET === 'true';

<Route
  path="/app/wallet/*"
  element={USE_NEW_WALLET ? <WalletNew /> : <WalletLegacy />}
/>
```

### Opção 3: Git Revert

Se tudo der errado:
```bash
git revert --no-commit HEAD~5..HEAD
# Revisar e commitar
```

---

## Timeline Sugerida

| Semana | Atividade |
|--------|-----------|
| 1 | Infraestrutura platform/ |
| 2 | Migrar Wallet + Feed |
| 3 | Migrar Marketplace + Analytics |
| 4 | Migrar Governance + Vesting |
| 5 | Migrar BazChat + P2P |
| 6 | Migrar restante + cleanup |
| 7 | Testes + bug fixes |
| 8 | Deploy + monitoring |

---

## Suporte

Se encontrar problemas durante migração:

1. Consultar [CURRENT-MODULES-MAP.md](./CURRENT-MODULES-MAP.md)
2. Ver [BREAKING-CHANGES.md](./BREAKING-CHANGES.md)
3. Verificar documentação da fase relevante

---

**Documento:** MIGRATION-GUIDE.md
**Versão:** 1.0.0
