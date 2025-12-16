# 06 - Atualizações do SDK

## Estado Atual

### Pacote: @bazari/app-sdk

- **Versão**: 0.2.0
- **Localização**: `packages/bazari-app-sdk/`
- **Publicado em**: npm (nome pode variar)

### Módulos Existentes

| Módulo | Descrição |
|--------|-----------|
| `auth` | Autenticação e usuário |
| `wallet` | Saldo, histórico, transferências |
| `storage` | Armazenamento key-value |
| `ui` | Toast, modais, loading |
| `events` | Pub/sub de eventos |
| `contracts` | Smart contracts (loyalty, escrow) |
| `location` | GPS e geocoding |
| `maps` | Mapas e rotas |

## Problemas Identificados

### 1. Documentação de Permissões

O SDK não documenta claramente quais permissões cada método requer.

### 2. Tipos Inconsistentes

Alguns tipos de resposta não estão bem definidos.

### 3. Erro handling

Mensagens de erro não são consistentes.

## Melhorias Propostas

### 1. Documentação de Permissões por Método

```typescript
// auth.ts

export class AuthClient {
  /**
   * Get current authenticated user
   *
   * @permission auth:read
   * @returns User object or null if not authenticated
   *
   * @example
   * ```typescript
   * const user = await sdk.auth.getCurrentUser();
   * if (user) {
   *   console.log(user.displayName);
   * }
   * ```
   */
  async getCurrentUser(): Promise<User | null> {
    return sendMessage('auth:getCurrentUser', {});
  }
}
```

### 2. Constantes de Permissão Exportadas

```typescript
// permissions.ts

/**
 * Permission IDs required by SDK methods
 */
export const Permissions = {
  // Auth
  AUTH_READ: 'auth:read',
  AUTH_WRITE: 'auth:write',

  // Wallet
  WALLET_READ: 'wallet:read',
  WALLET_TRANSFER: 'wallet:transfer',

  // Storage
  STORAGE_READ: 'storage:read',
  STORAGE_WRITE: 'storage:write',

  // UI
  UI_TOAST: 'ui:toast',
  UI_MODAL: 'ui:modal',

  // Contracts
  CONTRACTS_READ: 'contracts:read',
  CONTRACTS_DEPLOY: 'contracts:deploy',
  CONTRACTS_EXECUTE: 'contracts:execute',

  // Location
  LOCATION_READ: 'location:read',
  LOCATION_GEOCODE: 'location:geocode',

  // Maps
  MAPS_DISPLAY: 'maps:display',
  MAPS_DIRECTIONS: 'maps:directions',

  // Events
  EVENTS_SUBSCRIBE: 'events:subscribe',
  EVENTS_EMIT: 'events:emit',
} as const;

export type PermissionId = typeof Permissions[keyof typeof Permissions];

/**
 * Map of SDK methods to required permissions
 */
export const MethodPermissions: Record<string, PermissionId> = {
  'auth:getCurrentUser': Permissions.AUTH_READ,
  'wallet:getBalance': Permissions.WALLET_READ,
  'wallet:transfer': Permissions.WALLET_TRANSFER,
  // ... etc
};
```

### 3. Helper para Verificar Permissões

```typescript
// sdk.ts

export class BazariSDK {
  /**
   * Check if current app has a specific permission
   *
   * @param permission Permission ID to check
   * @returns boolean indicating if permission is granted
   */
  async hasPermission(permission: PermissionId): Promise<boolean> {
    try {
      const result = await this.auth.getPermissions();
      return result.permissions.includes(permission);
    } catch {
      return false;
    }
  }

  /**
   * Request a permission from the user
   *
   * @param permission Permission ID to request
   * @param reason Why the permission is needed
   * @returns boolean indicating if permission was granted
   */
  async requestPermission(
    permission: PermissionId,
    reason: string
  ): Promise<boolean> {
    const result = await sendMessage('auth:requestPermission', {
      permission,
      reason
    });
    return result.granted;
  }
}
```

### 4. Tipos de Erro Padronizados

```typescript
// types/errors.ts

export enum SDKErrorCode {
  // Authentication
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Authorization
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  APP_NOT_INSTALLED = 'APP_NOT_INSTALLED',

  // API Key
  INVALID_API_KEY = 'INVALID_API_KEY',
  API_KEY_SUSPENDED = 'API_KEY_SUSPENDED',
  ORIGIN_MISMATCH = 'ORIGIN_MISMATCH',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Network
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Validation
  INVALID_PARAMS = 'INVALID_PARAMS',
  NOT_IN_BAZARI = 'NOT_IN_BAZARI',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class SDKError extends Error {
  readonly code: SDKErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: SDKErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'SDKError';
  }

  static fromResponse(response: SDKResponse): SDKError {
    return new SDKError(
      response.error?.code || SDKErrorCode.UNKNOWN_ERROR,
      response.error?.message || 'Unknown error',
      response.error?.details
    );
  }
}
```

### 5. Retry e Timeout Configuráveis

```typescript
// utils/bridge.ts

interface BridgeConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: BridgeConfig = {
  timeout: 10000,  // 10 seconds
  retries: 3,
  retryDelay: 1000  // 1 second
};

let config = { ...DEFAULT_CONFIG };

export function configureBridge(newConfig: Partial<BridgeConfig>) {
  config = { ...config, ...newConfig };
}

async function sendMessageWithRetry<T>(
  type: string,
  payload: unknown
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      return await sendMessage(type, payload, config.timeout);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof SDKError) {
        if ([
          SDKErrorCode.PERMISSION_DENIED,
          SDKErrorCode.INVALID_API_KEY,
          SDKErrorCode.INVALID_PARAMS
        ].includes(error.code)) {
          throw error;
        }
      }

      if (attempt < config.retries) {
        await sleep(config.retryDelay * attempt);
      }
    }
  }

  throw lastError;
}
```

### 6. Debug Mode Melhorado

```typescript
// sdk.ts

export interface BazariSDKOptions {
  apiKey?: string;
  secretKey?: string;
  debug?: boolean;
  debugLevel?: 'minimal' | 'verbose' | 'trace';
  onError?: (error: SDKError) => void;
}

export class BazariSDK {
  private options: BazariSDKOptions;

  private log(level: string, ...args: unknown[]) {
    if (!this.options.debug) return;

    const debugLevel = this.options.debugLevel || 'minimal';
    const levels = ['minimal', 'verbose', 'trace'];
    const currentLevelIndex = levels.indexOf(debugLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      console.log(`[BazariSDK:${level}]`, ...args);
    }
  }

  private handleError(error: SDKError) {
    this.log('minimal', 'Error:', error.code, error.message);

    if (this.options.onError) {
      this.options.onError(error);
    }
  }
}
```

### 7. Hooks de Lifecycle

```typescript
// sdk.ts

export interface BazariSDKHooks {
  onReady?: () => void;
  onError?: (error: SDKError) => void;
  onPermissionDenied?: (permission: PermissionId) => void;
  onRateLimited?: (retryAfter: number) => void;
  onDisconnect?: () => void;
}

export class BazariSDK {
  private hooks: BazariSDKHooks = {};

  /**
   * Register lifecycle hooks
   */
  on<K extends keyof BazariSDKHooks>(
    event: K,
    handler: NonNullable<BazariSDKHooks[K]>
  ): void {
    this.hooks[event] = handler;
  }

  /**
   * Remove lifecycle hook
   */
  off<K extends keyof BazariSDKHooks>(event: K): void {
    delete this.hooks[event];
  }
}

// Uso
sdk.on('onPermissionDenied', (permission) => {
  console.log(`Permission denied: ${permission}`);
  // Mostrar UI pedindo permissão
});

sdk.on('onRateLimited', (retryAfter) => {
  console.log(`Rate limited. Retry after ${retryAfter}ms`);
});
```

### 8. TypeScript Strict Mode

```typescript
// tsconfig.json do SDK

{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 9. Exports Atualizados

```typescript
// index.ts

// Main SDK
export { BazariSDK, type BazariSDKOptions } from './client/sdk';

// Clients (for advanced usage)
export { AuthClient } from './client/auth';
export { WalletClient } from './client/wallet';
export { StorageClient } from './client/storage';
export { UIClient } from './client/ui';
export { EventsClient } from './client/events';
export { ContractsClient } from './client/contracts';
export { LocationClient } from './client/location';
export { MapsClient } from './client/maps';

// Types
export * from './types';
export * from './types/messages';
export * from './types/responses';

// Permissions
export { Permissions, MethodPermissions, type PermissionId } from './types/permissions';

// Errors
export { SDKError, SDKErrorCode } from './types/errors';

// Utils
export { isInsideBazari, getSDKVersion } from './utils/bridge';
```

## Documentação

### README.md Atualizado

```markdown
# @bazari/app-sdk

Official SDK for building Bazari apps.

## Installation

```bash
npm install @bazari/app-sdk
```

## Quick Start

```typescript
import { BazariSDK } from '@bazari/app-sdk';

const sdk = new BazariSDK({
  apiKey: 'baz_app_xxx',  // Required for production
  secretKey: 'xxx',        // Optional, for HMAC signing
  debug: true
});

// Get current user
const user = await sdk.auth.getCurrentUser();

// Get wallet balance
const balance = await sdk.wallet.getBalance();

// Show notification
await sdk.ui.success('Hello World!');
```

## Required Permissions

Each SDK method requires specific permissions. Make sure your app
requests the necessary permissions in the manifest:

| Method | Permission |
|--------|------------|
| `sdk.auth.getCurrentUser()` | `auth:read` |
| `sdk.wallet.getBalance()` | `wallet:read` |
| `sdk.wallet.transfer()` | `wallet:transfer` |
| `sdk.storage.get()` | `storage:read` |
| `sdk.storage.set()` | `storage:write` |
| `sdk.ui.toast()` | `ui:toast` |
| `sdk.contracts.deploy*()` | `contracts:deploy` |
| `sdk.location.getCurrentPosition()` | `location:read` |

## Error Handling

```typescript
import { SDKError, SDKErrorCode } from '@bazari/app-sdk';

try {
  const balance = await sdk.wallet.getBalance();
} catch (error) {
  if (error instanceof SDKError) {
    switch (error.code) {
      case SDKErrorCode.PERMISSION_DENIED:
        // Request permission
        break;
      case SDKErrorCode.RATE_LIMIT_EXCEEDED:
        // Wait and retry
        break;
      default:
        console.error(error.message);
    }
  }
}
```

## API Reference

See [API Documentation](./docs/API.md) for complete reference.
```

## Checklist de Implementação

- [ ] Adicionar JSDoc com `@permission` em todos os métodos
- [ ] Criar `types/permissions.ts` com constantes
- [ ] Criar `types/errors.ts` com SDKError
- [ ] Implementar retry com backoff
- [ ] Adicionar hooks de lifecycle
- [ ] Habilitar strict mode no TypeScript
- [ ] Atualizar exports em index.ts
- [ ] Atualizar README com tabela de permissões
- [ ] Criar documentação API completa
- [ ] Adicionar testes para error handling
- [ ] Publicar nova versão (0.3.0)
