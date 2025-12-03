# App Registry Specification

**Versão:** 1.0.0
**Status:** Draft
**Data:** 2024-12-03

---

## Visão Geral

O App Registry é o sistema central que gerencia o catálogo de apps disponíveis no BazariOS. Inclui apps nativos (bundled) e apps de terceiros (externos).

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                       APP REGISTRY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  NATIVE APPS    │    │ THIRD-PARTY DB  │                     │
│  │  (In-Memory)    │    │  (PostgreSQL)   │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      ▼                                           │
│           ┌─────────────────────┐                                │
│           │   UNIFIED REGISTRY  │                                │
│           │                     │                                │
│           │  - getAll()         │                                │
│           │  - get(id)          │                                │
│           │  - search(filters)  │                                │
│           │  - getByCategory()  │                                │
│           └─────────────────────┘                                │
│                      │                                           │
│                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    CONSUMERS                                 ││
│  │  App Store UI  │  AppHub  │  Hooks  │  Router                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Registry Client-Side (Native Apps)

### Singleton Pattern

```typescript
// platform/registry/app-registry.ts

class AppRegistry {
  private static instance: AppRegistry;
  private apps: Map<string, BazariApp> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): AppRegistry {
    if (!AppRegistry.instance) {
      AppRegistry.instance = new AppRegistry();
    }
    return AppRegistry.instance;
  }

  // ... métodos
}

export const appRegistry = AppRegistry.getInstance();
```

### Métodos Disponíveis

```typescript
interface AppRegistry {
  // CRUD
  register(app: BazariApp): void;
  registerMany(apps: BazariApp[]): void;
  unregister(appId: string): boolean;
  get(appId: string): BazariApp | undefined;
  has(appId: string): boolean;

  // Queries
  getAll(): BazariApp[];
  getByCategory(category: AppCategory): BazariApp[];
  getNativeApps(): BazariApp[];
  getFeaturedApps(): BazariApp[];
  getPreInstalledApps(): BazariApp[];
  search(filters: AppFilters): BazariApp[];

  // Utils
  getAllIds(): string[];
  count(): number;
  countByCategory(): Record<AppCategory, number>;

  // Lifecycle
  clear(): void;
  markInitialized(): void;
  isInitialized(): boolean;
}
```

---

## Registry Server-Side (Third-Party Apps)

### Schema do Banco

```prisma
model ThirdPartyApp {
  id              String   @id @default(cuid())
  appId           String   @unique
  name            String
  slug            String   @unique
  version         String
  developerId     String
  description     String
  longDescription String?
  category        String
  tags            String[]
  icon            String
  color           String
  screenshots     String[]
  bundleUrl       String
  bundleHash      String
  permissions     Json
  status          AppStatus
  featured        Boolean  @default(false)
  installCount    Int      @default(0)
  rating          Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  publishedAt     DateTime?

  @@index([category])
  @@index([status])
  @@index([featured])
}
```

### API Endpoints

```typescript
// GET /api/store/apps
// Lista apps publicados
{
  apps: ThirdPartyApp[];
  total: number;
  page: number;
  pageSize: number;
}

// GET /api/store/apps/:id
// Detalhes de um app
{
  app: ThirdPartyApp;
}

// GET /api/store/apps/search?q=...&category=...
// Busca de apps
{
  apps: ThirdPartyApp[];
  total: number;
}

// GET /api/store/apps/featured
// Apps em destaque
{
  apps: ThirdPartyApp[];
}
```

---

## Inicialização do Registry

### Bootstrap

```typescript
// platform/registry/init.ts

import { appRegistry } from './app-registry';
import { NATIVE_APPS } from './native-apps';
import { fetchThirdPartyApps } from './third-party';

export async function initializeAppRegistry(): Promise<void> {
  if (appRegistry.isInitialized()) {
    console.warn('[AppRegistry] Already initialized');
    return;
  }

  console.log('[AppRegistry] Initializing...');

  // 1. Registrar apps nativos (síncronos)
  appRegistry.registerMany(NATIVE_APPS);
  console.log(`[AppRegistry] Registered ${NATIVE_APPS.length} native apps`);

  // 2. Buscar apps de terceiros (assíncronos)
  try {
    const thirdPartyApps = await fetchThirdPartyApps();
    appRegistry.registerMany(thirdPartyApps);
    console.log(`[AppRegistry] Registered ${thirdPartyApps.length} third-party apps`);
  } catch (error) {
    console.error('[AppRegistry] Failed to fetch third-party apps:', error);
    // Continua sem apps de terceiros
  }

  appRegistry.markInitialized();
  console.log('[AppRegistry] Initialization complete');
}
```

### No App.tsx

```typescript
// App.tsx

import { useEffect, useState } from 'react';
import { initializeAppRegistry } from '@/platform/registry';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeAppRegistry().then(() => setReady(true));
  }, []);

  if (!ready) {
    return <SplashScreen />;
  }

  return <Router>...</Router>;
}
```

---

## Cache e Sincronização

### Cache Local

```typescript
// platform/registry/cache.ts

const CACHE_KEY = 'bazari:app-registry-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  apps: BazariApp[];
  timestamp: number;
}

export function getCachedApps(): BazariApp[] | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const entry: CacheEntry = JSON.parse(cached);
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }

  return entry.apps;
}

export function setCachedApps(apps: BazariApp[]): void {
  const entry: CacheEntry = {
    apps,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
}
```

### Background Sync

```typescript
// Atualizar registry em background
setInterval(async () => {
  try {
    const thirdPartyApps = await fetchThirdPartyApps();

    // Atualizar apenas apps de terceiros
    for (const app of thirdPartyApps) {
      appRegistry.register(app);
    }

    // Atualizar cache
    setCachedApps(appRegistry.getAll());
  } catch (error) {
    console.warn('[AppRegistry] Background sync failed:', error);
  }
}, 5 * 60 * 1000); // A cada 5 minutos
```

---

## Conversão de Tipos

### Third-Party DB -> BazariApp

```typescript
function dbToAppConfig(dbApp: ThirdPartyApp): BazariApp {
  return {
    id: dbApp.appId,
    name: dbApp.name,
    slug: dbApp.slug,
    version: dbApp.version,

    icon: dbApp.icon,
    color: dbApp.color,
    description: dbApp.description,

    category: dbApp.category as AppCategory,
    tags: dbApp.tags,

    entryPoint: `/app/external/${dbApp.slug}`,
    component: lazy(() => import('@/platform/components/ExternalAppLoader')),

    permissions: dbApp.permissions as AppPermissionRequest[],
    requiredRoles: [], // Definido no manifest

    status: mapStatus(dbApp.status),
    native: false,
    featured: dbApp.featured,

    installCount: dbApp.installCount,
    rating: dbApp.rating || undefined,
    screenshots: dbApp.screenshots,
    longDescription: dbApp.longDescription || undefined,
  };
}

function mapStatus(dbStatus: string): AppStatus {
  const map: Record<string, AppStatus> = {
    PUBLISHED: 'stable',
    BETA: 'beta',
    DEPRECATED: 'deprecated',
  };
  return map[dbStatus] || 'stable';
}
```

---

## Busca e Filtros

### Interface de Filtros

```typescript
interface AppFilters {
  category?: AppCategory;
  status?: AppStatus;
  search?: string;
  installed?: boolean;
  native?: boolean;
  featured?: boolean;
  minRating?: number;
  tags?: string[];
}
```

### Implementação de Busca

```typescript
search(filters: AppFilters): BazariApp[] {
  let results = this.getAll();

  // Filtro por categoria
  if (filters.category) {
    results = results.filter(app => app.category === filters.category);
  }

  // Filtro por status
  if (filters.status) {
    results = results.filter(app => app.status === filters.status);
  }

  // Filtro por nativo
  if (filters.native !== undefined) {
    results = results.filter(app => app.native === filters.native);
  }

  // Filtro por featured
  if (filters.featured) {
    results = results.filter(app => app.featured);
  }

  // Filtro por rating mínimo
  if (filters.minRating !== undefined) {
    results = results.filter(app =>
      app.rating !== undefined && app.rating >= filters.minRating!
    );
  }

  // Filtro por tags
  if (filters.tags && filters.tags.length > 0) {
    results = results.filter(app =>
      filters.tags!.some(tag => app.tags.includes(tag))
    );
  }

  // Busca textual
  if (filters.search) {
    const query = filters.search.toLowerCase();
    results = results.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query) ||
      app.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return results;
}
```

---

## Ordenação

```typescript
type SortField = 'name' | 'rating' | 'installCount' | 'updatedAt' | 'featured';
type SortOrder = 'asc' | 'desc';

function sortApps(
  apps: BazariApp[],
  field: SortField,
  order: SortOrder = 'asc'
): BazariApp[] {
  const multiplier = order === 'asc' ? 1 : -1;

  return [...apps].sort((a, b) => {
    switch (field) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'rating':
        return multiplier * ((a.rating || 0) - (b.rating || 0));
      case 'installCount':
        return multiplier * ((a.installCount || 0) - (b.installCount || 0));
      case 'featured':
        return multiplier * ((a.featured ? 1 : 0) - (b.featured ? 1 : 0));
      default:
        return 0;
    }
  });
}
```

---

## Eventos

```typescript
// Emitir eventos quando registry muda
type RegistryEvent =
  | { type: 'app:registered'; app: BazariApp }
  | { type: 'app:unregistered'; appId: string }
  | { type: 'app:updated'; app: BazariApp }
  | { type: 'registry:initialized' };

class AppRegistry extends EventEmitter {
  register(app: BazariApp): void {
    this.apps.set(app.id, app);
    this.emit('app:registered', { type: 'app:registered', app });
  }

  // ...
}

// Uso
appRegistry.on('app:registered', (event) => {
  console.log('New app registered:', event.app.name);
});
```

---

## Testes

```typescript
describe('AppRegistry', () => {
  beforeEach(() => {
    appRegistry.clear();
  });

  it('should register and retrieve an app', () => {
    const app = createMockApp({ id: 'test-app' });
    appRegistry.register(app);

    expect(appRegistry.get('test-app')).toBe(app);
    expect(appRegistry.has('test-app')).toBe(true);
  });

  it('should filter by category', () => {
    appRegistry.registerMany([
      createMockApp({ id: 'app1', category: 'finance' }),
      createMockApp({ id: 'app2', category: 'social' }),
      createMockApp({ id: 'app3', category: 'finance' }),
    ]);

    const financeApps = appRegistry.getByCategory('finance');
    expect(financeApps).toHaveLength(2);
  });

  it('should search by text', () => {
    appRegistry.registerMany([
      createMockApp({ id: 'wallet', name: 'Wallet', tags: ['finance'] }),
      createMockApp({ id: 'chat', name: 'Chat', tags: ['social'] }),
    ]);

    const results = appRegistry.search({ search: 'wall' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('wallet');
  });
});
```

---

**Documento:** REGISTRY-SPEC.md
**Versão:** 1.0.0
