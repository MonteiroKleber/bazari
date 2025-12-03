# Fase 1: Foundation - Fundação da Plataforma

**Status:** Pendente
**Prioridade:** Alta
**Dependências:** Nenhuma
**Estimativa:** ~15 tasks

---

## ⚠️ POLÍTICA DE ZERO REGRESSÃO - LEIA PRIMEIRO

> **CRÍTICO:** Esta fase ADICIONA nova infraestrutura SEM MODIFICAR código existente.
>
> - NÃO modifique nenhum arquivo fora de `platform/`
> - NÃO altere rotas existentes em `App.tsx`
> - NÃO modifique componentes existentes
> - A aplicação DEVE continuar funcionando 100% durante toda a implementação
>
> **Leia obrigatoriamente:** [ZERO-REGRESSION.md](../04-migration/ZERO-REGRESSION.md)

---

## Objetivo

Criar a infraestrutura base do BazariOS: tipos TypeScript, registry de apps, store de preferências do usuário, e hooks fundamentais.

---

## Resultado Esperado

Ao final desta fase:
- Sistema de tipos completo para apps
- Registry funcional com apps registrados
- Store Zustand persistindo preferências
- Hooks prontos para uso nas próximas fases

---

## Pré-requisitos

- Acesso ao repositório `/root/bazari`
- Entendimento da estrutura atual em `apps/web/src/`

---

## Tasks

### Task 1.1: Criar estrutura de pastas do platform

**Prioridade:** Alta
**Tipo:** criar

**Arquivos:**
```
apps/web/src/platform/
├── types/
│   └── index.ts
├── registry/
│   └── index.ts
├── store/
│   └── index.ts
├── hooks/
│   └── index.ts
├── services/
│   └── index.ts
└── index.ts
```

**Comando:**
```bash
mkdir -p apps/web/src/platform/{types,registry,store,hooks,services}
```

**Critérios de Aceite:**
- [ ] Estrutura de pastas criada
- [ ] Arquivos index.ts criados em cada pasta

---

### Task 1.2: Criar tipos de App (app.types.ts)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/types/app.types.ts`

**Código:**
```typescript
import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * Categoria de um app no BazariOS
 */
export type AppCategory =
  | 'finance'
  | 'social'
  | 'commerce'
  | 'tools'
  | 'governance'
  | 'entertainment';

/**
 * Status de um app
 */
export type AppStatus = 'stable' | 'beta' | 'alpha' | 'deprecated';

/**
 * Role necessária para acessar um app
 */
export type AppRequiredRole = 'user' | 'seller' | 'dao_member' | 'delivery' | 'admin';

/**
 * Definição de um app no BazariOS
 */
export interface BazariApp {
  /** ID único do app (ex: "wallet", "bazchat") */
  id: string;

  /** Nome para exibição */
  name: string;

  /** Slug para URL */
  slug: string;

  /** Versão semver */
  version: string;

  /** Nome do ícone Lucide */
  icon: string;

  /** Cor primária (classe Tailwind ou hex) */
  color: string;

  /** Descrição curta (max 100 chars) */
  description: string;

  /** Categoria do app */
  category: AppCategory;

  /** Tags para busca */
  tags: string[];

  /** Rota de entrada (ex: "/app/wallet") */
  entryPoint: string;

  /** Componente React lazy-loaded */
  component: LazyExoticComponent<ComponentType<any>>;

  /** Permissões requeridas */
  permissions: AppPermissionRequest[];

  /** Roles necessárias (undefined = qualquer usuário) */
  requiredRoles?: AppRequiredRole[];

  /** Status do app */
  status: AppStatus;

  /** Se é um app nativo Bazari */
  native: boolean;

  /** Se deve aparecer em destaque */
  featured?: boolean;

  /** Contagem de instalações (para store) */
  installCount?: number;

  /** Rating médio (para store) */
  rating?: number;

  /** Screenshots para store */
  screenshots?: string[];

  /** Descrição longa para store */
  longDescription?: string;

  /** Ordem padrão no launcher */
  defaultOrder?: number;

  /** Se vem pré-instalado */
  preInstalled?: boolean;
}

/**
 * Requisição de permissão de um app
 */
export interface AppPermissionRequest {
  /** ID da permissão */
  id: string;

  /** Motivo pelo qual o app precisa */
  reason: string;

  /** Se é opcional */
  optional?: boolean;
}

/**
 * Dados mínimos de um app para listagem
 */
export type AppSummary = Pick<
  BazariApp,
  'id' | 'name' | 'icon' | 'color' | 'description' | 'category' | 'status' | 'entryPoint'
>;

/**
 * Filtros para busca de apps
 */
export interface AppFilters {
  category?: AppCategory;
  status?: AppStatus;
  search?: string;
  installed?: boolean;
  native?: boolean;
}
```

**Critérios de Aceite:**
- [ ] Arquivo criado com todos os tipos
- [ ] Tipos exportados corretamente
- [ ] JSDoc em todas as interfaces

---

### Task 1.3: Criar tipos de Permissões (permission.types.ts)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/types/permission.types.ts`

**Código:**
```typescript
/**
 * IDs de permissões disponíveis no sistema
 */
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

/**
 * Nível de risco de uma permissão
 */
export type PermissionRisk = 'low' | 'medium' | 'high' | 'critical';

/**
 * Definição de uma permissão no catálogo
 */
export interface PermissionDefinition {
  /** ID único */
  id: PermissionId;

  /** Nome para exibição */
  name: string;

  /** Descrição do que permite */
  description: string;

  /** Nível de risco */
  risk: PermissionRisk;

  /** Ícone Lucide */
  icon: string;

  /** Se requer confirmação a cada uso */
  requiresConfirmation?: boolean;
}

/**
 * Catálogo de todas as permissões
 */
export const PERMISSIONS_CATALOG: Record<PermissionId, PermissionDefinition> = {
  // User
  'user.profile.read': {
    id: 'user.profile.read',
    name: 'Ler perfil',
    description: 'Ver seu nome, avatar e handle',
    risk: 'low',
    icon: 'User',
  },
  'user.profile.write': {
    id: 'user.profile.write',
    name: 'Editar perfil',
    description: 'Modificar informações do seu perfil',
    risk: 'medium',
    icon: 'UserCog',
  },

  // Wallet
  'wallet.balance.read': {
    id: 'wallet.balance.read',
    name: 'Ver saldo',
    description: 'Consultar saldo de tokens BZR e ZARI',
    risk: 'low',
    icon: 'Wallet',
  },
  'wallet.history.read': {
    id: 'wallet.history.read',
    name: 'Ver histórico',
    description: 'Acessar histórico de transações',
    risk: 'medium',
    icon: 'History',
  },
  'wallet.transfer.request': {
    id: 'wallet.transfer.request',
    name: 'Solicitar transferência',
    description: 'Pedir autorização para transferir tokens',
    risk: 'high',
    icon: 'Send',
    requiresConfirmation: true,
  },

  // Commerce
  'products.read': {
    id: 'products.read',
    name: 'Ver produtos',
    description: 'Listar seus produtos e lojas',
    risk: 'low',
    icon: 'Package',
  },
  'products.write': {
    id: 'products.write',
    name: 'Gerenciar produtos',
    description: 'Criar e editar produtos',
    risk: 'medium',
    icon: 'PackagePlus',
  },
  'orders.read': {
    id: 'orders.read',
    name: 'Ver pedidos',
    description: 'Acessar histórico de pedidos',
    risk: 'medium',
    icon: 'ShoppingBag',
  },
  'orders.write': {
    id: 'orders.write',
    name: 'Gerenciar pedidos',
    description: 'Criar e atualizar pedidos',
    risk: 'high',
    icon: 'ShoppingCart',
  },

  // Social
  'feed.read': {
    id: 'feed.read',
    name: 'Ler feed',
    description: 'Ver posts e interações',
    risk: 'low',
    icon: 'Newspaper',
  },
  'feed.write': {
    id: 'feed.write',
    name: 'Postar',
    description: 'Criar posts em seu nome',
    risk: 'high',
    icon: 'PenLine',
    requiresConfirmation: true,
  },
  'messages.read': {
    id: 'messages.read',
    name: 'Ler mensagens',
    description: 'Acessar suas conversas',
    risk: 'high',
    icon: 'MessageCircle',
  },
  'messages.write': {
    id: 'messages.write',
    name: 'Enviar mensagens',
    description: 'Enviar mensagens em seu nome',
    risk: 'high',
    icon: 'Send',
    requiresConfirmation: true,
  },

  // System
  'notifications.send': {
    id: 'notifications.send',
    name: 'Notificações',
    description: 'Enviar notificações push',
    risk: 'low',
    icon: 'Bell',
  },
  'storage.app': {
    id: 'storage.app',
    name: 'Armazenamento',
    description: 'Salvar dados do app localmente',
    risk: 'low',
    icon: 'Database',
  },
  'camera': {
    id: 'camera',
    name: 'Câmera',
    description: 'Acessar câmera do dispositivo',
    risk: 'medium',
    icon: 'Camera',
  },
  'location': {
    id: 'location',
    name: 'Localização',
    description: 'Acessar sua localização GPS',
    risk: 'medium',
    icon: 'MapPin',
  },

  // Blockchain
  'blockchain.read': {
    id: 'blockchain.read',
    name: 'Ler blockchain',
    description: 'Consultar dados on-chain',
    risk: 'low',
    icon: 'Blocks',
  },
  'blockchain.sign': {
    id: 'blockchain.sign',
    name: 'Assinar transações',
    description: 'Solicitar assinatura de transações blockchain',
    risk: 'critical',
    icon: 'KeyRound',
    requiresConfirmation: true,
  },
};

/**
 * Obtém definição de uma permissão
 */
export function getPermissionDefinition(id: PermissionId): PermissionDefinition {
  return PERMISSIONS_CATALOG[id];
}

/**
 * Agrupa permissões por nível de risco
 */
export function groupPermissionsByRisk(
  permissionIds: PermissionId[]
): Record<PermissionRisk, PermissionDefinition[]> {
  const grouped: Record<PermissionRisk, PermissionDefinition[]> = {
    low: [],
    medium: [],
    high: [],
    critical: [],
  };

  for (const id of permissionIds) {
    const def = PERMISSIONS_CATALOG[id];
    if (def) {
      grouped[def.risk].push(def);
    }
  }

  return grouped;
}
```

**Critérios de Aceite:**
- [ ] Todos os IDs de permissão definidos
- [ ] Catálogo completo com metadados
- [ ] Funções helper implementadas

---

### Task 1.4: Criar tipos de Preferências (preferences.types.ts)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/types/preferences.types.ts`

**Código:**
```typescript
import type { PermissionId } from './permission.types';

/**
 * Preferências de apps do usuário
 */
export interface UserAppPreferences {
  /** IDs dos apps instalados */
  installedApps: string[];

  /** IDs dos apps fixados no topo */
  pinnedApps: string[];

  /** Ordem customizada dos apps (appId -> posição) */
  appOrder: Record<string, number>;

  /** Permissões concedidas por app */
  grantedPermissions: Record<string, PermissionId[]>;

  /** Configurações específicas por app */
  appSettings: Record<string, Record<string, unknown>>;

  /** Último uso de cada app (ISO date string) */
  lastUsed: Record<string, string>;

  /** Versão do schema de preferências */
  version: number;
}

/**
 * Preferências padrão para novos usuários
 */
export const DEFAULT_USER_PREFERENCES: UserAppPreferences = {
  installedApps: ['wallet', 'marketplace', 'feed'],
  pinnedApps: [],
  appOrder: {},
  grantedPermissions: {},
  appSettings: {},
  lastUsed: {},
  version: 1,
};

/**
 * Ações disponíveis para modificar preferências
 */
export interface UserAppPreferencesActions {
  /** Instalar um app */
  installApp: (appId: string, grantedPermissions?: PermissionId[]) => void;

  /** Desinstalar um app */
  uninstallApp: (appId: string) => void;

  /** Fixar app no topo */
  pinApp: (appId: string) => void;

  /** Remover app do topo */
  unpinApp: (appId: string) => void;

  /** Reordenar apps */
  reorderApps: (orderedAppIds: string[]) => void;

  /** Conceder permissão a um app */
  grantPermission: (appId: string, permissionId: PermissionId) => void;

  /** Revogar permissão de um app */
  revokePermission: (appId: string, permissionId: PermissionId) => void;

  /** Atualizar configuração de um app */
  setAppSetting: (appId: string, key: string, value: unknown) => void;

  /** Registrar uso de um app */
  recordAppUsage: (appId: string) => void;

  /** Resetar todas as preferências */
  resetPreferences: () => void;
}

/**
 * Queries sobre preferências
 */
export interface UserAppPreferencesQueries {
  /** Verifica se app está instalado */
  isInstalled: (appId: string) => boolean;

  /** Verifica se app está fixado */
  isPinned: (appId: string) => boolean;

  /** Verifica se app tem permissão */
  hasPermission: (appId: string, permissionId: PermissionId) => boolean;

  /** Obtém todas as permissões de um app */
  getAppPermissions: (appId: string) => PermissionId[];

  /** Obtém configuração de um app */
  getAppSetting: <T>(appId: string, key: string, defaultValue: T) => T;

  /** Obtém apps ordenados */
  getOrderedApps: () => string[];
}
```

**Critérios de Aceite:**
- [ ] Interface de preferências completa
- [ ] Valores padrão definidos
- [ ] Interfaces de ações e queries separadas

---

### Task 1.5: Criar index de tipos

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/types/index.ts`

**Código:**
```typescript
// App types
export type {
  BazariApp,
  AppCategory,
  AppStatus,
  AppRequiredRole,
  AppPermissionRequest,
  AppSummary,
  AppFilters,
} from './app.types';

// Permission types
export type {
  PermissionId,
  PermissionRisk,
  PermissionDefinition,
} from './permission.types';

export {
  PERMISSIONS_CATALOG,
  getPermissionDefinition,
  groupPermissionsByRisk,
} from './permission.types';

// Preferences types
export type {
  UserAppPreferences,
  UserAppPreferencesActions,
  UserAppPreferencesQueries,
} from './preferences.types';

export { DEFAULT_USER_PREFERENCES } from './preferences.types';
```

**Critérios de Aceite:**
- [ ] Todos os tipos exportados
- [ ] Exports organizados por categoria

---

### Task 1.6: Criar App Registry

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/registry/app-registry.ts`

**Código:**
```typescript
import type { BazariApp, AppCategory, AppFilters } from '../types';

/**
 * Registry central de apps do BazariOS
 * Singleton que mantém todos os apps registrados
 */
class AppRegistry {
  private apps: Map<string, BazariApp> = new Map();
  private initialized = false;

  /**
   * Registra um app no sistema
   */
  register(app: BazariApp): void {
    if (this.apps.has(app.id)) {
      console.warn(`[AppRegistry] App "${app.id}" já registrado, sobrescrevendo...`);
    }
    this.apps.set(app.id, app);
  }

  /**
   * Registra múltiplos apps de uma vez
   */
  registerMany(apps: BazariApp[]): void {
    for (const app of apps) {
      this.register(app);
    }
  }

  /**
   * Remove um app do registry
   */
  unregister(appId: string): boolean {
    return this.apps.delete(appId);
  }

  /**
   * Obtém um app pelo ID
   */
  get(appId: string): BazariApp | undefined {
    return this.apps.get(appId);
  }

  /**
   * Verifica se um app existe
   */
  has(appId: string): boolean {
    return this.apps.has(appId);
  }

  /**
   * Retorna todos os apps
   */
  getAll(): BazariApp[] {
    return Array.from(this.apps.values());
  }

  /**
   * Retorna apps por categoria
   */
  getByCategory(category: AppCategory): BazariApp[] {
    return this.getAll().filter((app) => app.category === category);
  }

  /**
   * Retorna apenas apps nativos
   */
  getNativeApps(): BazariApp[] {
    return this.getAll().filter((app) => app.native);
  }

  /**
   * Retorna apps em destaque
   */
  getFeaturedApps(): BazariApp[] {
    return this.getAll().filter((app) => app.featured);
  }

  /**
   * Retorna apps pré-instalados
   */
  getPreInstalledApps(): BazariApp[] {
    return this.getAll().filter((app) => app.preInstalled);
  }

  /**
   * Busca apps com filtros
   */
  search(filters: AppFilters): BazariApp[] {
    let results = this.getAll();

    if (filters.category) {
      results = results.filter((app) => app.category === filters.category);
    }

    if (filters.status) {
      results = results.filter((app) => app.status === filters.status);
    }

    if (filters.native !== undefined) {
      results = results.filter((app) => app.native === filters.native);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      results = results.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query) ||
          app.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return results;
  }

  /**
   * Retorna IDs de todos os apps
   */
  getAllIds(): string[] {
    return Array.from(this.apps.keys());
  }

  /**
   * Retorna contagem de apps
   */
  count(): number {
    return this.apps.size;
  }

  /**
   * Retorna contagem por categoria
   */
  countByCategory(): Record<AppCategory, number> {
    const counts: Record<AppCategory, number> = {
      finance: 0,
      social: 0,
      commerce: 0,
      tools: 0,
      governance: 0,
      entertainment: 0,
    };

    for (const app of this.apps.values()) {
      counts[app.category]++;
    }

    return counts;
  }

  /**
   * Limpa todos os apps (útil para testes)
   */
  clear(): void {
    this.apps.clear();
    this.initialized = false;
  }

  /**
   * Marca como inicializado
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Verifica se foi inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const appRegistry = new AppRegistry();
```

**Critérios de Aceite:**
- [ ] Singleton implementado
- [ ] Métodos CRUD funcionando
- [ ] Busca com filtros implementada
- [ ] Contagem por categoria

---

### Task 1.7: Criar User Apps Store (Zustand)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/store/user-apps.store.ts`

**Código:**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  UserAppPreferences,
  UserAppPreferencesActions,
  UserAppPreferencesQueries,
  PermissionId,
} from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';

type UserAppsStore = UserAppPreferences & UserAppPreferencesActions & UserAppPreferencesQueries;

export const useUserAppsStore = create<UserAppsStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      ...DEFAULT_USER_PREFERENCES,

      // Ações
      installApp: (appId: string, grantedPermissions: PermissionId[] = []) => {
        set((state) => {
          if (state.installedApps.includes(appId)) {
            return state; // Já instalado
          }
          return {
            installedApps: [...state.installedApps, appId],
            grantedPermissions: {
              ...state.grantedPermissions,
              [appId]: grantedPermissions,
            },
          };
        });
      },

      uninstallApp: (appId: string) => {
        set((state) => {
          const { [appId]: _, ...restPermissions } = state.grantedPermissions;
          const { [appId]: __, ...restSettings } = state.appSettings;
          const { [appId]: ___, ...restLastUsed } = state.lastUsed;
          const { [appId]: ____, ...restOrder } = state.appOrder;

          return {
            installedApps: state.installedApps.filter((id) => id !== appId),
            pinnedApps: state.pinnedApps.filter((id) => id !== appId),
            grantedPermissions: restPermissions,
            appSettings: restSettings,
            lastUsed: restLastUsed,
            appOrder: restOrder,
          };
        });
      },

      pinApp: (appId: string) => {
        set((state) => {
          if (state.pinnedApps.includes(appId)) {
            return state;
          }
          return {
            pinnedApps: [...state.pinnedApps, appId],
          };
        });
      },

      unpinApp: (appId: string) => {
        set((state) => ({
          pinnedApps: state.pinnedApps.filter((id) => id !== appId),
        }));
      },

      reorderApps: (orderedAppIds: string[]) => {
        set(() => {
          const newOrder: Record<string, number> = {};
          orderedAppIds.forEach((appId, index) => {
            newOrder[appId] = index;
          });
          return { appOrder: newOrder };
        });
      },

      grantPermission: (appId: string, permissionId: PermissionId) => {
        set((state) => {
          const currentPermissions = state.grantedPermissions[appId] || [];
          if (currentPermissions.includes(permissionId)) {
            return state;
          }
          return {
            grantedPermissions: {
              ...state.grantedPermissions,
              [appId]: [...currentPermissions, permissionId],
            },
          };
        });
      },

      revokePermission: (appId: string, permissionId: PermissionId) => {
        set((state) => {
          const currentPermissions = state.grantedPermissions[appId] || [];
          return {
            grantedPermissions: {
              ...state.grantedPermissions,
              [appId]: currentPermissions.filter((id) => id !== permissionId),
            },
          };
        });
      },

      setAppSetting: (appId: string, key: string, value: unknown) => {
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            [appId]: {
              ...(state.appSettings[appId] || {}),
              [key]: value,
            },
          },
        }));
      },

      recordAppUsage: (appId: string) => {
        set((state) => ({
          lastUsed: {
            ...state.lastUsed,
            [appId]: new Date().toISOString(),
          },
        }));
      },

      resetPreferences: () => {
        set(DEFAULT_USER_PREFERENCES);
      },

      // Queries
      isInstalled: (appId: string) => {
        return get().installedApps.includes(appId);
      },

      isPinned: (appId: string) => {
        return get().pinnedApps.includes(appId);
      },

      hasPermission: (appId: string, permissionId: PermissionId) => {
        const permissions = get().grantedPermissions[appId] || [];
        return permissions.includes(permissionId);
      },

      getAppPermissions: (appId: string) => {
        return get().grantedPermissions[appId] || [];
      },

      getAppSetting: <T>(appId: string, key: string, defaultValue: T): T => {
        const settings = get().appSettings[appId];
        if (!settings || !(key in settings)) {
          return defaultValue;
        }
        return settings[key] as T;
      },

      getOrderedApps: () => {
        const { installedApps, pinnedApps, appOrder } = get();

        // Ordenar: pinned primeiro, depois por ordem customizada, depois alfabético
        return [...installedApps].sort((a, b) => {
          const aIsPinned = pinnedApps.includes(a);
          const bIsPinned = pinnedApps.includes(b);

          // Pinned primeiro
          if (aIsPinned && !bIsPinned) return -1;
          if (!aIsPinned && bIsPinned) return 1;

          // Depois por ordem customizada
          const aOrder = appOrder[a] ?? Infinity;
          const bOrder = appOrder[b] ?? Infinity;

          return aOrder - bOrder;
        });
      },
    }),
    {
      name: 'bazari-user-apps',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Futuras migrações de schema aqui
        return persistedState as UserAppsStore;
      },
    }
  )
);
```

**Critérios de Aceite:**
- [ ] Store criada com Zustand
- [ ] Persistência em localStorage
- [ ] Todas as ações implementadas
- [ ] Queries funcionando
- [ ] Migração de versão preparada

---

### Task 1.8: Criar index do store

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/store/index.ts`

**Código:**
```typescript
export { useUserAppsStore } from './user-apps.store';
```

**Critérios de Aceite:**
- [ ] Export correto

---

### Task 1.9: Criar hook useApps

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/hooks/useApps.ts`

**Código:**
```typescript
import { useMemo } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { BazariApp, AppCategory, AppFilters } from '../types';

interface UseAppsOptions {
  /** Filtrar por categoria */
  category?: AppCategory;

  /** Filtrar por status de instalação */
  installed?: boolean;

  /** Termo de busca */
  search?: string;

  /** Apenas apps nativos */
  native?: boolean;

  /** Apenas apps em destaque */
  featured?: boolean;

  /** Ordenar resultado */
  sortBy?: 'name' | 'category' | 'installCount' | 'rating' | 'lastUsed';

  /** Direção da ordenação */
  sortDirection?: 'asc' | 'desc';
}

interface UseAppsReturn {
  /** Lista de apps filtrados */
  apps: BazariApp[];

  /** Total de apps disponíveis */
  totalCount: number;

  /** Total após filtros */
  filteredCount: number;

  /** Contagem por categoria */
  countByCategory: Record<AppCategory, number>;

  /** Se está carregando */
  isLoading: boolean;
}

export function useApps(options: UseAppsOptions = {}): UseAppsReturn {
  const { installedApps, lastUsed } = useUserAppsStore();

  const result = useMemo(() => {
    const allApps = appRegistry.getAll();
    let filteredApps = [...allApps];

    // Filtrar por categoria
    if (options.category) {
      filteredApps = filteredApps.filter((app) => app.category === options.category);
    }

    // Filtrar por instalação
    if (options.installed !== undefined) {
      filteredApps = filteredApps.filter((app) =>
        options.installed ? installedApps.includes(app.id) : !installedApps.includes(app.id)
      );
    }

    // Filtrar por busca
    if (options.search) {
      const query = options.search.toLowerCase();
      filteredApps = filteredApps.filter(
        (app) =>
          app.name.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query) ||
          app.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filtrar por native
    if (options.native !== undefined) {
      filteredApps = filteredApps.filter((app) => app.native === options.native);
    }

    // Filtrar por featured
    if (options.featured) {
      filteredApps = filteredApps.filter((app) => app.featured);
    }

    // Ordenar
    if (options.sortBy) {
      const direction = options.sortDirection === 'desc' ? -1 : 1;

      filteredApps.sort((a, b) => {
        switch (options.sortBy) {
          case 'name':
            return direction * a.name.localeCompare(b.name);
          case 'category':
            return direction * a.category.localeCompare(b.category);
          case 'installCount':
            return direction * ((a.installCount || 0) - (b.installCount || 0));
          case 'rating':
            return direction * ((a.rating || 0) - (b.rating || 0));
          case 'lastUsed': {
            const aDate = lastUsed[a.id] || '1970-01-01';
            const bDate = lastUsed[b.id] || '1970-01-01';
            return direction * aDate.localeCompare(bDate);
          }
          default:
            return 0;
        }
      });
    }

    // Calcular contagem por categoria
    const countByCategory: Record<AppCategory, number> = {
      finance: 0,
      social: 0,
      commerce: 0,
      tools: 0,
      governance: 0,
      entertainment: 0,
    };

    for (const app of allApps) {
      countByCategory[app.category]++;
    }

    return {
      apps: filteredApps,
      totalCount: allApps.length,
      filteredCount: filteredApps.length,
      countByCategory,
      isLoading: !appRegistry.isInitialized(),
    };
  }, [options, installedApps, lastUsed]);

  return result;
}
```

**Critérios de Aceite:**
- [ ] Filtros funcionando
- [ ] Ordenação funcionando
- [ ] Memoização correta
- [ ] Contagem por categoria

---

### Task 1.10: Criar hook useInstalledApps

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/hooks/useInstalledApps.ts`

**Código:**
```typescript
import { useMemo } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { BazariApp } from '../types';

interface UseInstalledAppsReturn {
  /** Apps instalados ordenados */
  apps: BazariApp[];

  /** Apps fixados */
  pinnedApps: BazariApp[];

  /** Apps não fixados */
  unpinnedApps: BazariApp[];

  /** IDs dos apps instalados */
  installedIds: string[];

  /** Total de apps instalados */
  count: number;
}

export function useInstalledApps(): UseInstalledAppsReturn {
  const { getOrderedApps, pinnedApps: pinnedIds, installedApps } = useUserAppsStore();

  return useMemo(() => {
    const orderedIds = getOrderedApps();

    const apps = orderedIds
      .map((id) => appRegistry.get(id))
      .filter((app): app is BazariApp => app !== undefined);

    const pinnedApps = apps.filter((app) => pinnedIds.includes(app.id));
    const unpinnedApps = apps.filter((app) => !pinnedIds.includes(app.id));

    return {
      apps,
      pinnedApps,
      unpinnedApps,
      installedIds: installedApps,
      count: apps.length,
    };
  }, [getOrderedApps, pinnedIds, installedApps]);
}
```

**Critérios de Aceite:**
- [ ] Retorna apps ordenados
- [ ] Separa pinned e unpinned
- [ ] Memoização correta

---

### Task 1.11: Criar hook useAppInstall

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/hooks/useAppInstall.ts`

**Código:**
```typescript
import { useState, useCallback } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { BazariApp, PermissionId } from '../types';

interface UseAppInstallReturn {
  /** O app em questão */
  app: BazariApp | undefined;

  /** Se está instalado */
  isInstalled: boolean;

  /** Se está processando */
  isProcessing: boolean;

  /** Se o modal de permissões deve ser exibido */
  showPermissionModal: boolean;

  /** Abre o modal de permissões */
  openPermissionModal: () => void;

  /** Fecha o modal de permissões */
  closePermissionModal: () => void;

  /** Inicia processo de instalação */
  install: () => void;

  /** Confirma instalação com permissões */
  confirmInstall: (grantedPermissions: PermissionId[]) => Promise<void>;

  /** Desinstala o app */
  uninstall: () => Promise<void>;
}

export function useAppInstall(appId: string): UseAppInstallReturn {
  const app = appRegistry.get(appId);
  const { installApp, uninstallApp, isInstalled } = useUserAppsStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const install = useCallback(() => {
    if (!app) return;

    // Se app tem permissões não-opcionais, mostrar modal
    const requiredPermissions = app.permissions.filter((p) => !p.optional);
    if (requiredPermissions.length > 0) {
      setShowPermissionModal(true);
      return;
    }

    // Instalar direto se não tem permissões
    installApp(appId, []);
  }, [app, appId, installApp]);

  const confirmInstall = useCallback(
    async (grantedPermissions: PermissionId[]) => {
      setIsProcessing(true);
      try {
        // Aqui poderia ter lógica assíncrona (sync com servidor, etc)
        installApp(appId, grantedPermissions);
        setShowPermissionModal(false);
      } finally {
        setIsProcessing(false);
      }
    },
    [appId, installApp]
  );

  const uninstall = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Aqui poderia ter lógica assíncrona
      uninstallApp(appId);
    } finally {
      setIsProcessing(false);
    }
  }, [appId, uninstallApp]);

  return {
    app,
    isInstalled: isInstalled(appId),
    isProcessing,
    showPermissionModal,
    openPermissionModal: () => setShowPermissionModal(true),
    closePermissionModal: () => setShowPermissionModal(false),
    install,
    confirmInstall,
    uninstall,
  };
}
```

**Critérios de Aceite:**
- [ ] Gerencia estado de instalação
- [ ] Modal de permissões controlado
- [ ] Estados de loading

---

### Task 1.12: Criar hook useAppPermissions

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/hooks/useAppPermissions.ts`

**Código:**
```typescript
import { useMemo, useCallback } from 'react';
import { appRegistry } from '../registry/app-registry';
import { useUserAppsStore } from '../store/user-apps.store';
import type { PermissionId, PermissionDefinition } from '../types';
import { PERMISSIONS_CATALOG, groupPermissionsByRisk } from '../types';

interface UseAppPermissionsReturn {
  /** Permissões requeridas pelo app */
  requiredPermissions: PermissionDefinition[];

  /** Permissões opcionais do app */
  optionalPermissions: PermissionDefinition[];

  /** Permissões concedidas ao app */
  grantedPermissions: PermissionId[];

  /** Permissões agrupadas por risco */
  permissionsByRisk: ReturnType<typeof groupPermissionsByRisk>;

  /** Verifica se app tem uma permissão */
  hasPermission: (permissionId: PermissionId) => boolean;

  /** Concede uma permissão */
  grantPermission: (permissionId: PermissionId) => void;

  /** Revoga uma permissão */
  revokePermission: (permissionId: PermissionId) => void;
}

export function useAppPermissions(appId: string): UseAppPermissionsReturn {
  const app = appRegistry.get(appId);
  const {
    hasPermission: checkPermission,
    grantPermission: grant,
    revokePermission: revoke,
    getAppPermissions,
  } = useUserAppsStore();

  const grantedPermissions = getAppPermissions(appId);

  const { requiredPermissions, optionalPermissions } = useMemo(() => {
    if (!app) {
      return { requiredPermissions: [], optionalPermissions: [] };
    }

    const required: PermissionDefinition[] = [];
    const optional: PermissionDefinition[] = [];

    for (const perm of app.permissions) {
      const def = PERMISSIONS_CATALOG[perm.id as PermissionId];
      if (def) {
        if (perm.optional) {
          optional.push(def);
        } else {
          required.push(def);
        }
      }
    }

    return { requiredPermissions: required, optionalPermissions: optional };
  }, [app]);

  const allPermissionIds = useMemo(() => {
    return [...requiredPermissions, ...optionalPermissions].map((p) => p.id);
  }, [requiredPermissions, optionalPermissions]);

  const permissionsByRisk = useMemo(() => {
    return groupPermissionsByRisk(allPermissionIds);
  }, [allPermissionIds]);

  const hasPermission = useCallback(
    (permissionId: PermissionId) => {
      return checkPermission(appId, permissionId);
    },
    [appId, checkPermission]
  );

  const grantPermission = useCallback(
    (permissionId: PermissionId) => {
      grant(appId, permissionId);
    },
    [appId, grant]
  );

  const revokePermission = useCallback(
    (permissionId: PermissionId) => {
      revoke(appId, permissionId);
    },
    [appId, revoke]
  );

  return {
    requiredPermissions,
    optionalPermissions,
    grantedPermissions,
    permissionsByRisk,
    hasPermission,
    grantPermission,
    revokePermission,
  };
}
```

**Critérios de Aceite:**
- [ ] Separa permissões required/optional
- [ ] Agrupa por risco
- [ ] Callbacks memoizados

---

### Task 1.13: Criar index dos hooks

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/hooks/index.ts`

**Código:**
```typescript
export { useApps } from './useApps';
export { useInstalledApps } from './useInstalledApps';
export { useAppInstall } from './useAppInstall';
export { useAppPermissions } from './useAppPermissions';
```

**Critérios de Aceite:**
- [ ] Todos os hooks exportados

---

### Task 1.14: Criar index do registry

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/registry/index.ts`

**Código:**
```typescript
export { appRegistry } from './app-registry';
```

**Critérios de Aceite:**
- [ ] Export correto

---

### Task 1.15: Criar index principal do platform

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/index.ts`

**Código:**
```typescript
// Types
export * from './types';

// Registry
export { appRegistry } from './registry';

// Store
export { useUserAppsStore } from './store';

// Hooks
export {
  useApps,
  useInstalledApps,
  useAppInstall,
  useAppPermissions,
} from './hooks';
```

**Critérios de Aceite:**
- [ ] Todos os exports centralizados
- [ ] Import limpo: `import { useApps, appRegistry } from '@/platform'`

---

## Arquivos a Criar (Resumo)

| Arquivo | Tipo |
|---------|------|
| `apps/web/src/platform/types/app.types.ts` | criar |
| `apps/web/src/platform/types/permission.types.ts` | criar |
| `apps/web/src/platform/types/preferences.types.ts` | criar |
| `apps/web/src/platform/types/index.ts` | criar |
| `apps/web/src/platform/registry/app-registry.ts` | criar |
| `apps/web/src/platform/registry/index.ts` | criar |
| `apps/web/src/platform/store/user-apps.store.ts` | criar |
| `apps/web/src/platform/store/index.ts` | criar |
| `apps/web/src/platform/hooks/useApps.ts` | criar |
| `apps/web/src/platform/hooks/useInstalledApps.ts` | criar |
| `apps/web/src/platform/hooks/useAppInstall.ts` | criar |
| `apps/web/src/platform/hooks/useAppPermissions.ts` | criar |
| `apps/web/src/platform/hooks/index.ts` | criar |
| `apps/web/src/platform/index.ts` | criar |

**Total:** 14 arquivos novos

---

## Validação da Fase

### Testes Manuais

1. Verificar que todos os tipos compilam sem erro
2. Testar registry com apps mock
3. Testar store com persist/rehydrate
4. Testar hooks em componente simples

### Checklist Final

- [ ] Estrutura de pastas criada
- [ ] Todos os tipos definidos e exportados
- [ ] Registry funcional
- [ ] Store com persistência
- [ ] Hooks testados
- [ ] Imports funcionando via `@/platform`

---

## Próxima Fase

Após completar esta fase, prossiga para:
**[PHASE-02-APP-SYSTEM.md](./PHASE-02-APP-SYSTEM.md)** - Migração dos apps nativos

---

**Documento:** PHASE-01-FOUNDATION.md
**Versão:** 1.0.0
**Data:** 2024-12-03
