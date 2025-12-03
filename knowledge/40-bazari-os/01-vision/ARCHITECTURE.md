# BazariOS - Arquitetura Técnica

**Versão:** 1.0.0
**Status:** Aprovado
**Data:** 2024-12-03

---

## ⚠️ POLÍTICA DE ZERO REGRESSÃO

> **CRÍTICO:** Durante toda a implementação do BazariOS, NENHUMA funcionalidade existente pode quebrar.
> A aplicação deve continuar funcionando 100% como está hoje em cada etapa.
>
> **LEIA OBRIGATORIAMENTE:** [ZERO-REGRESSION.md](../04-migration/ZERO-REGRESSION.md)

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BAZARI ECOSYSTEM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PRESENTATION LAYER                                                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  AppHub    │  App Store  │  App Container  │  Settings      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│   PLATFORM LAYER             ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Registry  │  Permissions │  Loader  │  Bridge  │  Store    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│   APP LAYER                  ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Native Apps (Wallet, Feed, Chat, Marketplace, ...)        │   │
│   │  Third-party Apps (via SDK + Iframe Sandbox)                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│   CORE SERVICES              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Auth  │  API Client  │  Blockchain  │  Storage  │  Events  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Pastas

```
apps/web/src/
│
├── platform/                       # Core do "OS"
│   │
│   ├── types/                      # Tipos TypeScript
│   │   ├── app.types.ts            # BazariApp, AppCategory, etc
│   │   ├── permission.types.ts     # AppPermission, PermissionLevel
│   │   ├── manifest.types.ts       # AppManifest schema
│   │   └── index.ts                # Re-exports
│   │
│   ├── registry/                   # Registro de Apps
│   │   ├── app-registry.ts         # Singleton registry
│   │   ├── native-apps.ts          # Apps nativos registrados
│   │   └── index.ts
│   │
│   ├── store/                      # Estado Global (Zustand)
│   │   ├── user-apps.store.ts      # Apps instalados do usuário
│   │   ├── app-preferences.store.ts # Preferências (ordem, pins)
│   │   └── index.ts
│   │
│   ├── hooks/                      # React Hooks
│   │   ├── useApps.ts              # Lista de apps disponíveis
│   │   ├── useInstalledApps.ts     # Apps instalados
│   │   ├── useAppPermissions.ts    # Checar permissões
│   │   ├── useAppInstall.ts        # Instalar/desinstalar
│   │   └── index.ts
│   │
│   ├── services/                   # Serviços
│   │   ├── app-loader.service.ts   # Lazy loading de apps
│   │   ├── permission.service.ts   # Validação de permissões
│   │   └── index.ts
│   │
│   └── components/                 # Componentes do Platform
│       ├── AppContainer.tsx        # Container para apps
│       ├── AppErrorBoundary.tsx    # Error boundary
│       └── index.ts
│
├── apps/                           # Apps Individuais
│   │
│   ├── wallet/                     # App: Wallet
│   │   ├── manifest.ts             # Configuração do app
│   │   ├── index.tsx               # Entry point (lazy)
│   │   ├── pages/                  # Páginas do app
│   │   ├── components/             # Componentes do app
│   │   └── hooks/                  # Hooks do app
│   │
│   ├── feed/                       # App: Feed Social
│   │   └── ...
│   │
│   ├── marketplace/                # App: Marketplace
│   │   └── ...
│   │
│   ├── bazchat/                    # App: BazChat
│   │   └── ...
│   │
│   └── [app-name]/                 # Outros apps
│       └── ...
│
├── pages/                          # Páginas do Platform
│   ├── AppHubPage.tsx              # Dashboard principal
│   ├── AppStorePage.tsx            # Loja de apps
│   ├── AppDetailPage.tsx           # Detalhes de um app
│   └── ...
│
└── components/
    └── platform/                   # UI Components do Platform
        ├── AppLauncher.tsx         # Grid de apps instalados
        ├── AppCard.tsx             # Card de app
        ├── AppSearch.tsx           # Busca de apps
        ├── AppInstallModal.tsx     # Modal de instalação
        ├── AppCategoryTabs.tsx     # Tabs de categorias
        ├── PermissionList.tsx      # Lista de permissões
        └── index.ts
```

---

## Tipos Principais

### BazariApp

```typescript
// apps/web/src/platform/types/app.types.ts

export interface BazariApp {
  // Identificação
  id: string;                          // "wallet", "bazchat"
  name: string;                        // "Wallet"
  slug: string;                        // "wallet" (para URL)
  version: string;                     // "1.0.0"

  // Visual
  icon: string;                        // Nome do ícone Lucide
  color: string;                       // Cor primária (hex ou tailwind)
  description: string;                 // Descrição curta

  // Categorização
  category: AppCategory;
  tags: string[];

  // Técnico
  entryPoint: string;                  // "/app/wallet"
  component: React.LazyExoticComponent<React.ComponentType>;

  // Permissões
  permissions: AppPermission[];
  requiredRole?: UserRole[];

  // Metadados
  status: AppStatus;
  featured?: boolean;
  native: boolean;                     // true = app nativo Bazari

  // Métricas (para store)
  installCount?: number;
  rating?: number;

  // Assets (para store)
  screenshots?: string[];
  longDescription?: string;
}

export type AppCategory =
  | 'finance'
  | 'social'
  | 'commerce'
  | 'tools'
  | 'governance'
  | 'entertainment';

export type AppStatus =
  | 'stable'
  | 'beta'
  | 'alpha'
  | 'deprecated';

export type UserRole =
  | 'user'
  | 'seller'
  | 'dao_member'
  | 'delivery'
  | 'admin';
```

### AppPermission

```typescript
// apps/web/src/platform/types/permission.types.ts

export interface AppPermission {
  id: PermissionId;
  reason: string;                      // Por que precisa
  optional?: boolean;                  // Pode negar
}

export type PermissionId =
  // User
  | 'user.profile.read'
  | 'user.profile.write'

  // Wallet
  | 'wallet.balance.read'
  | 'wallet.history.read'
  | 'wallet.transfer.request'

  // Commerce
  | 'products.read'
  | 'products.write'
  | 'orders.read'
  | 'orders.write'

  // Social
  | 'feed.read'
  | 'feed.write'
  | 'messages.read'
  | 'messages.write'

  // System
  | 'notifications.send'
  | 'storage.app'
  | 'camera'
  | 'location'

  // Blockchain
  | 'blockchain.read'
  | 'blockchain.sign';

export interface PermissionDefinition {
  id: PermissionId;
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  requiresConfirmation?: boolean;
}
```

### UserAppPreferences

```typescript
// apps/web/src/platform/types/preferences.types.ts

export interface UserAppPreferences {
  installedApps: string[];             // IDs dos apps instalados
  pinnedApps: string[];                // Apps fixados no topo
  appOrder: Record<string, number>;    // Ordem customizada
  grantedPermissions: Record<string, PermissionId[]>;
  appSettings: Record<string, unknown>;
  lastUsed: Record<string, string>;    // ISO date
}
```

---

## Registry de Apps

### Estrutura do Registry

```typescript
// apps/web/src/platform/registry/app-registry.ts

class AppRegistry {
  private apps: Map<string, BazariApp> = new Map();

  register(app: BazariApp): void;
  unregister(appId: string): void;
  get(appId: string): BazariApp | undefined;
  getAll(): BazariApp[];
  getByCategory(category: AppCategory): BazariApp[];
  search(query: string): BazariApp[];
}

export const appRegistry = new AppRegistry();
```

### Registro de App Nativo

```typescript
// apps/web/src/apps/wallet/manifest.ts

import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const walletApp: BazariApp = {
  id: 'wallet',
  name: 'Wallet',
  slug: 'wallet',
  version: '1.0.0',

  icon: 'Wallet',
  color: 'green',
  description: 'Gerencie seus tokens BZR e ZARI',

  category: 'finance',
  tags: ['tokens', 'transferência', 'saldo'],

  entryPoint: '/app/wallet',
  component: lazy(() => import('./index')),

  permissions: [
    { id: 'wallet.balance.read', reason: 'Ver seu saldo' },
    { id: 'wallet.history.read', reason: 'Ver histórico de transações' },
    { id: 'wallet.transfer.request', reason: 'Realizar transferências' },
    { id: 'blockchain.sign', reason: 'Assinar transações' },
  ],

  status: 'stable',
  native: true,
  featured: true,
};
```

---

## Store de Preferências (Zustand)

```typescript
// apps/web/src/platform/store/user-apps.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserAppsState {
  // Estado
  installedApps: string[];
  pinnedApps: string[];
  appOrder: Record<string, number>;
  grantedPermissions: Record<string, string[]>;

  // Ações
  installApp: (appId: string, permissions: string[]) => void;
  uninstallApp: (appId: string) => void;
  pinApp: (appId: string) => void;
  unpinApp: (appId: string) => void;
  reorderApps: (appIds: string[]) => void;
  grantPermission: (appId: string, permissionId: string) => void;
  revokePermission: (appId: string, permissionId: string) => void;

  // Queries
  isInstalled: (appId: string) => boolean;
  isPinned: (appId: string) => boolean;
  hasPermission: (appId: string, permissionId: string) => boolean;
}

export const useUserAppsStore = create<UserAppsState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      installedApps: ['wallet', 'marketplace', 'feed'], // Apps pré-instalados
      pinnedApps: [],
      appOrder: {},
      grantedPermissions: {},

      // Implementação das ações...
    }),
    {
      name: 'bazari-user-apps',
    }
  )
);
```

---

## Hooks Principais

### useApps

```typescript
// apps/web/src/platform/hooks/useApps.ts

export function useApps(options?: {
  category?: AppCategory;
  installed?: boolean;
  search?: string;
}) {
  const { installedApps } = useUserAppsStore();

  return useMemo(() => {
    let apps = appRegistry.getAll();

    if (options?.category) {
      apps = apps.filter(a => a.category === options.category);
    }

    if (options?.installed !== undefined) {
      apps = apps.filter(a =>
        options.installed
          ? installedApps.includes(a.id)
          : !installedApps.includes(a.id)
      );
    }

    if (options?.search) {
      const query = options.search.toLowerCase();
      apps = apps.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return apps;
  }, [options, installedApps]);
}
```

### useAppInstall

```typescript
// apps/web/src/platform/hooks/useAppInstall.ts

export function useAppInstall(appId: string) {
  const app = appRegistry.get(appId);
  const { installApp, uninstallApp, isInstalled } = useUserAppsStore();
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const install = useCallback(async () => {
    if (!app) return;

    // Se app tem permissões, mostrar modal
    if (app.permissions.length > 0) {
      setShowPermissionModal(true);
      return;
    }

    // Instalar direto
    installApp(appId, []);
  }, [app, appId, installApp]);

  const confirmInstall = useCallback((grantedPermissions: string[]) => {
    installApp(appId, grantedPermissions);
    setShowPermissionModal(false);
  }, [appId, installApp]);

  return {
    app,
    isInstalled: isInstalled(appId),
    install,
    uninstall: () => uninstallApp(appId),
    showPermissionModal,
    setShowPermissionModal,
    confirmInstall,
  };
}
```

---

## Componentes de UI

### AppLauncher (Grid de Apps)

```typescript
// apps/web/src/components/platform/AppLauncher.tsx

interface AppLauncherProps {
  apps: BazariApp[];
  columns?: 2 | 3 | 4;
  showBadges?: boolean;
  onAppClick?: (app: BazariApp) => void;
}

export function AppLauncher({
  apps,
  columns = 3,
  showBadges = true,
  onAppClick
}: AppLauncherProps) {
  return (
    <div className={cn(
      'grid gap-4',
      columns === 2 && 'grid-cols-2',
      columns === 3 && 'grid-cols-3',
      columns === 4 && 'grid-cols-4',
    )}>
      {apps.map(app => (
        <AppCard
          key={app.id}
          app={app}
          showBadge={showBadges}
          onClick={() => onAppClick?.(app)}
        />
      ))}
    </div>
  );
}
```

### AppCard

```typescript
// apps/web/src/components/platform/AppCard.tsx

interface AppCardProps {
  app: BazariApp;
  variant?: 'launcher' | 'store' | 'compact';
  showBadge?: boolean;
  onClick?: () => void;
}

export function AppCard({ app, variant = 'launcher', showBadge, onClick }: AppCardProps) {
  const Icon = icons[app.icon as keyof typeof icons];

  if (variant === 'launcher') {
    return (
      <Link
        to={app.entryPoint}
        onClick={onClick}
        className={cn(
          'flex flex-col items-center p-4 rounded-xl',
          'bg-gradient-to-br transition-all',
          'hover:scale-105 hover:shadow-lg',
          getColorClasses(app.color)
        )}
      >
        <Icon className="w-8 h-8 text-white mb-2" />
        <span className="text-white font-medium text-sm">{app.name}</span>
        {showBadge && app.status === 'beta' && (
          <Badge variant="secondary" className="mt-1 text-xs">BETA</Badge>
        )}
      </Link>
    );
  }

  // Outras variantes...
}
```

### AppInstallModal

```typescript
// apps/web/src/components/platform/AppInstallModal.tsx

interface AppInstallModalProps {
  app: BazariApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (permissions: string[]) => void;
}

export function AppInstallModal({ app, open, onOpenChange, onConfirm }: AppInstallModalProps) {
  const [granted, setGranted] = useState<string[]>([]);

  const requiredPermissions = app.permissions.filter(p => !p.optional);
  const optionalPermissions = app.permissions.filter(p => p.optional);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AppIcon app={app} size="sm" />
            Instalar {app.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground">{app.description}</p>

          {requiredPermissions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Permissões necessárias</h4>
              <PermissionList permissions={requiredPermissions} />
            </div>
          )}

          {optionalPermissions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Permissões opcionais</h4>
              <PermissionList
                permissions={optionalPermissions}
                selectable
                selected={granted}
                onSelect={setGranted}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm([
            ...requiredPermissions.map(p => p.id),
            ...granted
          ])}>
            Instalar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Fluxo de Dados

### Instalação de App

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  User   │────▶│ AppStore UI │────▶│ Permission   │────▶│ Zustand │
│  Click  │     │             │     │ Modal        │     │ Store   │
└─────────┘     └─────────────┘     └──────────────┘     └─────────┘
                                           │                   │
                                           │                   ▼
                                           │            ┌─────────────┐
                                           │            │ localStorage│
                                           │            └─────────────┘
                                           │                   │
                                           ▼                   ▼
                                    ┌─────────────┐     ┌─────────────┐
                                    │ API Sync    │────▶│ PostgreSQL  │
                                    │ (optional)  │     │ (profile)   │
                                    └─────────────┘     └─────────────┘
```

### Carregamento de App

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Route  │────▶│ AppContainer│────▶│ React.lazy   │────▶│  App    │
│ /app/x  │     │             │     │ import()     │     │ Render  │
└─────────┘     └─────────────┘     └──────────────┘     └─────────┘
                      │
                      ▼
               ┌─────────────┐
               │ Permission  │
               │ Check       │
               └─────────────┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
      ┌─────────┐         ┌─────────┐
      │ Allowed │         │ Denied  │
      │ Render  │         │ Modal   │
      └─────────┘         └─────────┘
```

---

## Rotas

### Estrutura de Rotas

```typescript
// apps/web/src/App.tsx (modificado)

<Routes>
  {/* Platform routes */}
  <Route path="/app" element={<AppHubPage />} />
  <Route path="/app/store" element={<AppStorePage />} />
  <Route path="/app/store/:appId" element={<AppDetailPage />} />

  {/* Dynamic app routes */}
  {appRegistry.getAll().map(app => (
    <Route
      key={app.id}
      path={`${app.entryPoint}/*`}
      element={
        <AppContainer appId={app.id}>
          <Suspense fallback={<AppLoading />}>
            <app.component />
          </Suspense>
        </AppContainer>
      }
    />
  ))}
</Routes>
```

---

## Considerações de Performance

### Code Splitting

- Cada app é um chunk separado via `React.lazy()`
- Assets do app carregados sob demanda
- Preload de apps frequentemente usados

### Caching

- Service Worker para cache de bundles
- localStorage para preferências
- IndexedDB para dados de apps

### Bundle Size

- Limite de 500KB por app (gzip)
- Monitoramento via webpack-bundle-analyzer
- Tree-shaking agressivo

---

## Segurança

### Apps Nativos

- Acesso direto às APIs
- Mesmo contexto de segurança
- Sem isolamento adicional

### Apps de Terceiros (Fase 4+)

- Executados em iframe sandboxed
- Comunicação via postMessage
- Permissões validadas no host
- CSP rigoroso

---

## Próximos Passos

1. **Fase 1:** Implementar tipos e registry
2. **Fase 2:** Migrar apps nativos
3. **Fase 3:** Criar UI da App Store
4. **Fase 4:** SDK para terceiros

Ver: [PHASE-01-FOUNDATION.md](../02-phases/PHASE-01-FOUNDATION.md)

---

**Arquitetura por:** Claude Code
**Data:** 2024-12-03
**Versão:** 1.0.0
