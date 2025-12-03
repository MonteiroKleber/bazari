# Implementation Checklist

**Versão:** 1.0.0
**Data:** 2024-12-03

---

## Visão Geral

Checklist completo para implementação do BazariOS, organizado por fase.

---

## Fase 1: Foundation

### 1.1 Estrutura de Pastas

- [ ] Criar `apps/web/src/platform/`
- [ ] Criar `apps/web/src/platform/types/`
- [ ] Criar `apps/web/src/platform/registry/`
- [ ] Criar `apps/web/src/platform/stores/`
- [ ] Criar `apps/web/src/platform/hooks/`
- [ ] Criar `apps/web/src/platform/components/`
- [ ] Criar `apps/web/src/apps/`

### 1.2 Tipos

- [ ] Criar `platform/types/app.types.ts`
  - [ ] Interface `BazariApp`
  - [ ] Type `AppCategory`
  - [ ] Type `AppStatus`
- [ ] Criar `platform/types/permission.types.ts`
  - [ ] Interface `AppPermission`
  - [ ] Interface `AppPermissionRequest`
  - [ ] Type `PermissionId`
- [ ] Criar `platform/types/preferences.types.ts`
  - [ ] Interface `UserAppPreferences`
  - [ ] Interface `InstalledAppInfo`
- [ ] Criar `platform/types/index.ts` (barrel export)

### 1.3 Registry

- [ ] Criar `platform/registry/app-registry.ts`
  - [ ] Classe `AppRegistry` (singleton)
  - [ ] Método `register(app)`
  - [ ] Método `registerMany(apps)`
  - [ ] Método `get(id)`
  - [ ] Método `getAll()`
  - [ ] Método `getByCategory(category)`
  - [ ] Método `search(filters)`
  - [ ] Método `getNativeApps()`
  - [ ] Método `getFeaturedApps()`
- [ ] Criar `platform/registry/native-apps.ts`
  - [ ] Array `NATIVE_APPS` (vazio inicialmente)
- [ ] Criar `platform/registry/init.ts`
  - [ ] Função `initializeAppRegistry()`
- [ ] Criar `platform/registry/index.ts` (barrel export)

### 1.4 Store (Zustand)

- [ ] Criar `platform/stores/user-apps.store.ts`
  - [ ] Estado `installedApps`
  - [ ] Estado `pinnedApps`
  - [ ] Estado `grantedPermissions`
  - [ ] Ação `installApp(id)`
  - [ ] Ação `uninstallApp(id)`
  - [ ] Ação `pinApp(id)`
  - [ ] Ação `unpinApp(id)`
  - [ ] Ação `grantPermission(appId, permissionId)`
  - [ ] Ação `revokePermission(appId, permissionId)`
  - [ ] Persist middleware (localStorage)
- [ ] Criar `platform/stores/index.ts` (barrel export)

### 1.5 Hooks

- [ ] Criar `platform/hooks/useApps.ts`
  - [ ] Hook `useApps()` retorna todos apps do registry
- [ ] Criar `platform/hooks/useInstalledApps.ts`
  - [ ] Hook `useInstalledApps()` retorna apps instalados pelo usuário
- [ ] Criar `platform/hooks/useAppInstall.ts`
  - [ ] Hook `useAppInstall()` com `install`, `uninstall`, `isInstalling`
- [ ] Criar `platform/hooks/useAppPermissions.ts`
  - [ ] Hook `useAppPermissions(appId)` com `hasPermission`, `grantPermission`
- [ ] Criar `platform/hooks/index.ts` (barrel export)

### 1.6 Testes da Foundation

- [ ] Testar `AppRegistry.register()`
- [ ] Testar `AppRegistry.get()`
- [ ] Testar `AppRegistry.search()`
- [ ] Testar `useUserAppsStore.installApp()`
- [ ] Testar persistência do store
- [ ] Testar hooks com dados mockados

---

## Fase 2: App System

### 2.1 Migração do Wallet

- [ ] Criar `apps/wallet/manifest.ts`
- [ ] Criar `apps/wallet/index.tsx` (entry point)
- [ ] Mover páginas para `apps/wallet/pages/`
- [ ] Mover componentes para `apps/wallet/components/`
- [ ] Mover hooks para `apps/wallet/hooks/`
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar todas as rotas
- [ ] Remover código legado

### 2.2 Migração do Feed

- [ ] Criar `apps/feed/manifest.ts`
- [ ] Criar `apps/feed/index.tsx`
- [ ] Mover arquivos
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar
- [ ] Remover código legado

### 2.3 Migração do Marketplace

- [ ] Criar `apps/marketplace/manifest.ts`
- [ ] Criar `apps/marketplace/index.tsx`
- [ ] Mover arquivos
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar
- [ ] Remover código legado

### 2.4 Migração do BazChat

- [ ] Criar `apps/bazchat/manifest.ts`
- [ ] Criar `apps/bazchat/index.tsx`
- [ ] Mover arquivos
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar (incluindo E2E encryption)
- [ ] Remover código legado

### 2.5 Migração do Governance

- [ ] Criar `apps/governance/manifest.ts`
- [ ] Criar `apps/governance/index.tsx`
- [ ] Mover arquivos
- [ ] Atualizar imports
- [ ] Registrar em `native-apps.ts`
- [ ] Testar
- [ ] Remover código legado

### 2.6 Migração de Outros Módulos

- [ ] P2P
- [ ] Vesting
- [ ] Analytics
- [ ] Rewards
- [ ] Delivery
- [ ] Stores
- [ ] Discover
- [ ] Affiliates

### 2.7 Router Dinâmico

- [ ] Criar `platform/components/AppRouter.tsx`
- [ ] Gerar rotas a partir do registry
- [ ] Remover rotas hardcoded do App.tsx
- [ ] Testar navegação

---

## Fase 3: App Store UI

### 3.1 Componentes Base

- [ ] Criar `platform/components/AppIcon.tsx`
- [ ] Criar `platform/components/AppCard.tsx`
- [ ] Criar `platform/components/AppLauncher.tsx`
- [ ] Criar `platform/components/PermissionList.tsx`
- [ ] Criar `platform/components/AppInstallModal.tsx`
- [ ] Criar `platform/components/CategoryFilter.tsx`
- [ ] Criar `platform/components/AppSearch.tsx`

### 3.2 Páginas

- [ ] Criar `pages/AppHubPage.tsx` (novo dashboard)
- [ ] Criar `pages/AppStorePage.tsx` (loja)
- [ ] Criar `pages/AppDetailPage.tsx` (detalhes)
- [ ] Criar `pages/MyAppsPage.tsx` (gerenciar instalados)

### 3.3 Integração

- [ ] Substituir `DashboardPage` por `AppHubPage`
- [ ] Adicionar link "App Store" no header
- [ ] Adicionar rotas no App.tsx
- [ ] Atualizar `MobileBottomNav` se necessário

### 3.4 Testes UI

- [ ] Testar grid de apps no hub
- [ ] Testar busca na store
- [ ] Testar filtro por categoria
- [ ] Testar modal de instalação
- [ ] Testar responsividade
- [ ] Testar loading states
- [ ] Testar error states

---

## Fase 4: SDK

### 4.1 Package SDK

- [ ] Criar `packages/sdk/package.json`
- [ ] Criar `packages/sdk/tsconfig.json`
- [ ] Criar `packages/sdk/src/index.ts`

### 4.2 Utilitários Bridge

- [ ] Criar `packages/sdk/src/bridge/index.ts`
- [ ] Criar `packages/sdk/src/bridge/request.ts`
- [ ] Criar `packages/sdk/src/bridge/events.ts`

### 4.3 Clientes SDK

- [ ] Criar `packages/sdk/src/clients/auth.ts`
- [ ] Criar `packages/sdk/src/clients/wallet.ts`
- [ ] Criar `packages/sdk/src/clients/storage.ts`
- [ ] Criar `packages/sdk/src/clients/ui.ts`
- [ ] Criar `packages/sdk/src/clients/events.ts`

### 4.4 Host-Side Bridge

- [ ] Criar `platform/sdk/host-bridge.ts`
- [ ] Implementar handlers para cada tipo de mensagem
- [ ] Implementar validação de permissões
- [ ] Implementar rate limiting

### 4.5 Loader de Apps Externos

- [ ] Criar `platform/components/ExternalAppLoader.tsx`
- [ ] Criar `platform/components/AppIframe.tsx`
- [ ] Implementar sandbox iframe
- [ ] Implementar CSP

### 4.6 Testes SDK

- [ ] Testar comunicação postMessage
- [ ] Testar cada cliente do SDK
- [ ] Testar validação de permissões
- [ ] Testar rate limiting
- [ ] Testar sandbox security

---

## Fase 5: Developer Portal

### 5.1 Schema do Banco

- [ ] Adicionar model `ThirdPartyApp` no Prisma
- [ ] Adicionar model `AppSubmission`
- [ ] Adicionar model `AppReview`
- [ ] Rodar migrations

### 5.2 API Endpoints

- [ ] `POST /api/developer/apps` - Criar app
- [ ] `GET /api/developer/apps` - Listar meus apps
- [ ] `PUT /api/developer/apps/:id` - Atualizar app
- [ ] `POST /api/developer/apps/:id/submit` - Submeter para review
- [ ] `POST /api/developer/apps/:id/publish` - Publicar
- [ ] `POST /api/developer/apps/:id/unpublish` - Despublicar

### 5.3 Upload IPFS

- [ ] Criar serviço de upload para IPFS
- [ ] Gerar hash do bundle
- [ ] Validar integridade

### 5.4 UI do Portal

- [ ] Criar `pages/developer/DeveloperDashboardPage.tsx`
- [ ] Criar `pages/developer/NewAppPage.tsx`
- [ ] Criar `pages/developer/EditAppPage.tsx`
- [ ] Criar `pages/developer/SubmissionsPage.tsx`

### 5.5 CLI (Opcional)

- [ ] Criar `packages/cli/`
- [ ] Comando `bazari create`
- [ ] Comando `bazari dev`
- [ ] Comando `bazari validate`
- [ ] Comando `bazari build`
- [ ] Comando `bazari publish`

---

## Fase 6: Monetization

### 6.1 Schema Monetização

- [ ] Adicionar campos de monetização no `ThirdPartyApp`
- [ ] Criar model `AppPurchase`
- [ ] Criar model `AppSubscription`
- [ ] Criar model `RevenueShare`

### 6.2 API de Compras

- [ ] `POST /api/store/apps/:id/purchase` - Comprar app
- [ ] `POST /api/store/apps/:id/subscribe` - Assinar app
- [ ] `GET /api/user/purchases` - Minhas compras

### 6.3 Smart Contract

- [ ] Criar contrato de revenue share
- [ ] Implementar split automático (70/30 ou 85/15)
- [ ] Integrar com blockchain

### 6.4 Dashboard de Receita

- [ ] Criar `pages/developer/RevenueDashboardPage.tsx`
- [ ] Gráficos de vendas
- [ ] Histórico de pagamentos
- [ ] Botão de saque

---

## Verificação Final

### Funcionalidade

- [ ] Usuário pode ver dashboard com apps instalados
- [ ] Usuário pode acessar App Store
- [ ] Usuário pode buscar apps
- [ ] Usuário pode filtrar por categoria
- [ ] Usuário pode ver detalhes de um app
- [ ] Usuário pode instalar app
- [ ] Usuário pode desinstalar app
- [ ] Usuário pode acessar app instalado
- [ ] Apps nativos funcionam normalmente

### Performance

- [ ] Lazy loading funcionando
- [ ] Bundle inicial < 200KB
- [ ] Tempo de carregamento do dashboard < 2s
- [ ] Tempo de instalação de app < 3s

### Segurança

- [ ] Apps externos em iframe sandbox
- [ ] Permissões validadas no host
- [ ] CSP configurado
- [ ] Rate limiting ativo

### UX

- [ ] Loading states em todas operações
- [ ] Error states com mensagens claras
- [ ] Responsivo (mobile e desktop)
- [ ] Acessibilidade básica

### Código

- [ ] TypeScript sem erros
- [ ] ESLint sem warnings
- [ ] Testes passando
- [ ] Build de produção funciona

---

## Documentação

- [ ] README atualizado
- [ ] Comentários em código complexo
- [ ] Storybook para componentes (opcional)
- [ ] Docs do SDK publicados

---

## Deploy

- [ ] Build de produção testado
- [ ] Variáveis de ambiente configuradas
- [ ] CORS configurado para SDK
- [ ] CDN configurado para assets
- [ ] Monitoring configurado

---

**Documento:** CHECKLIST.md
**Versão:** 1.0.0
