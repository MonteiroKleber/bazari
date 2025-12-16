# Fase 4: SDK - Kit de Desenvolvimento para Terceiros

**Status:** Pendente
**Prioridade:** Média
**Dependências:** Fases 1, 2, 3
**Estimativa:** ~15 tasks

---

## Objetivo

Criar o SDK (`@bazari.libervia.xyz/app-sdk`) que permite desenvolvedores terceiros criar apps para o ecossistema Bazari. Inclui sistema de bridge via postMessage e sandbox de segurança.

---

## Resultado Esperado

Ao final desta fase:
- Pacote npm `@bazari.libervia.xyz/app-sdk` publicável
- Sistema de iframe sandbox para apps terceiros
- Bridge de comunicação host <-> app
- Validação de permissões
- Documentação básica do SDK

---

## Pré-requisitos

- Fases 1, 2, 3 completas
- Entendimento de postMessage API
- Conhecimento de iframe sandbox

---

## Arquitetura do SDK

```
┌─────────────────────────────────────────────────────────────────┐
│                    BAZARI HOST (Main App)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     PERMISSION BRIDGE                      │  │
│  │  - Valida permissões antes de executar                    │  │
│  │  - Rate limiting                                          │  │
│  │  - Logging de chamadas                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │ postMessage                       │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    SANDBOXED IFRAME                        │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                 THIRD-PARTY APP                      │  │  │
│  │  │                                                      │  │  │
│  │  │  import { BazariSDK } from '@bazari.libervia.xyz/app-sdk'        │  │  │
│  │  │  const sdk = new BazariSDK()                        │  │  │
│  │  │  const user = await sdk.auth.getCurrentUser()       │  │  │
│  │  │                                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  sandbox="allow-scripts allow-same-origin"                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### Task 4.1: Criar estrutura do pacote SDK

**Prioridade:** Alta
**Tipo:** criar

**Comando:**
```bash
mkdir -p packages/bazari-app-sdk/src/{client,types,utils}
```

**Arquivos a criar:**
```
packages/bazari-app-sdk/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── client/
│   │   ├── sdk.ts
│   │   ├── auth.ts
│   │   ├── wallet.ts
│   │   ├── storage.ts
│   │   ├── ui.ts
│   │   └── events.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── messages.ts
│   │   └── responses.ts
│   └── utils/
│       ├── bridge.ts
│       └── validation.ts
└── README.md
```

**Critérios de Aceite:**
- [ ] Estrutura de pastas criada
- [ ] package.json configurado

---

### Task 4.2: Criar package.json do SDK

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/package.json`

**Código:**
```json
{
  "name": "@bazari.libervia.xyz/app-sdk",
  "version": "0.1.0",
  "description": "SDK for building Bazari apps",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": [
    "bazari",
    "sdk",
    "web3",
    "marketplace",
    "apps"
  ],
  "author": "Bazari Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/bazari/platform.git",
    "directory": "packages/bazari-app-sdk"
  },
  "peerDependencies": {
    "typescript": ">=4.7.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Critérios de Aceite:**
- [ ] Exports configurados
- [ ] Build script funciona

---

### Task 4.3: Criar tipos de mensagens (messages.ts)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/types/messages.ts`

**Código:**
```typescript
/**
 * Tipos de mensagens entre SDK e Host
 */
export type MessageType =
  // Auth
  | 'auth:getCurrentUser'
  | 'auth:getPermissions'

  // Wallet
  | 'wallet:getBalance'
  | 'wallet:getHistory'
  | 'wallet:requestTransfer'

  // Storage
  | 'storage:get'
  | 'storage:set'
  | 'storage:remove'
  | 'storage:clear'

  // UI
  | 'ui:showToast'
  | 'ui:showConfirm'
  | 'ui:showModal'
  | 'ui:closeModal'

  // Navigation
  | 'navigation:goTo'
  | 'navigation:openApp'
  | 'navigation:goBack'

  // Events
  | 'events:subscribe'
  | 'events:unsubscribe'
  | 'events:emit';

/**
 * Estrutura de uma mensagem enviada pelo SDK
 */
export interface SDKMessage<T = unknown> {
  /** ID único da mensagem para correlação */
  id: string;

  /** Tipo da operação */
  type: MessageType;

  /** Payload da mensagem */
  payload: T;

  /** Timestamp de envio */
  timestamp: number;

  /** Versão do SDK */
  sdkVersion: string;
}

/**
 * Estrutura da resposta do Host
 */
export interface HostResponse<T = unknown> {
  /** ID da mensagem original */
  id: string;

  /** Se a operação foi bem sucedida */
  success: boolean;

  /** Dados da resposta (se sucesso) */
  data?: T;

  /** Erro (se falha) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Timestamp da resposta */
  timestamp: number;
}

/**
 * Evento emitido pelo Host para o SDK
 */
export interface HostEvent<T = unknown> {
  /** Tipo do evento */
  type: string;

  /** Dados do evento */
  data: T;

  /** Timestamp */
  timestamp: number;
}

/**
 * Payloads específicos por tipo de mensagem
 */
export interface MessagePayloads {
  // Auth
  'auth:getCurrentUser': void;
  'auth:getPermissions': void;

  // Wallet
  'wallet:getBalance': { token?: 'BZR' | 'ZARI' };
  'wallet:getHistory': { limit?: number; offset?: number };
  'wallet:requestTransfer': {
    to: string;
    amount: number;
    token: 'BZR' | 'ZARI';
    memo?: string;
  };

  // Storage
  'storage:get': { key: string };
  'storage:set': { key: string; value: unknown };
  'storage:remove': { key: string };
  'storage:clear': void;

  // UI
  'ui:showToast': {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
  };
  'ui:showConfirm': {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
  'ui:showModal': {
    title: string;
    content: string;
  };
  'ui:closeModal': void;

  // Navigation
  'navigation:goTo': { path: string };
  'navigation:openApp': { appId: string; params?: Record<string, string> };
  'navigation:goBack': void;

  // Events
  'events:subscribe': { eventType: string };
  'events:unsubscribe': { eventType: string };
}
```

**Critérios de Aceite:**
- [ ] Todos os tipos de mensagem definidos
- [ ] Payloads tipados

---

### Task 4.4: Criar tipos de resposta (responses.ts)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/types/responses.ts`

**Código:**
```typescript
/**
 * Usuário retornado pelo SDK
 */
export interface SDKUser {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  roles: string[];
}

/**
 * Saldo retornado pelo SDK
 */
export interface SDKBalance {
  bzr: string;
  zari: string;
  formatted: {
    bzr: string;
    zari: string;
  };
}

/**
 * Transação no histórico
 */
export interface SDKTransaction {
  id: string;
  type: 'transfer' | 'reward' | 'purchase' | 'sale';
  amount: string;
  token: 'BZR' | 'ZARI';
  from?: string;
  to?: string;
  memo?: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Resultado de transferência
 */
export interface SDKTransferResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Resultado de confirmação UI
 */
export interface SDKConfirmResult {
  confirmed: boolean;
}

/**
 * Permissões do app
 */
export interface SDKPermissions {
  granted: string[];
  denied: string[];
}

/**
 * Respostas por tipo de mensagem
 */
export interface ResponseTypes {
  'auth:getCurrentUser': SDKUser;
  'auth:getPermissions': SDKPermissions;
  'wallet:getBalance': SDKBalance;
  'wallet:getHistory': SDKTransaction[];
  'wallet:requestTransfer': SDKTransferResult;
  'storage:get': unknown;
  'storage:set': void;
  'storage:remove': void;
  'storage:clear': void;
  'ui:showToast': void;
  'ui:showConfirm': SDKConfirmResult;
  'ui:showModal': void;
  'ui:closeModal': void;
  'navigation:goTo': void;
  'navigation:openApp': void;
  'navigation:goBack': void;
  'events:subscribe': void;
  'events:unsubscribe': void;
}
```

**Critérios de Aceite:**
- [ ] Tipos de resposta definidos
- [ ] Mapeamento tipo -> resposta

---

### Task 4.5: Criar utilitário de bridge (bridge.ts)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/utils/bridge.ts`

**Código:**
```typescript
import type { SDKMessage, HostResponse, MessageType } from '../types/messages';
import type { ResponseTypes } from '../types/responses';

const SDK_VERSION = '0.1.0';

/**
 * Gera ID único para mensagens
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mapa de callbacks pendentes
 */
const pendingCallbacks = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();

/**
 * Timeout padrão para respostas (10s)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Listener de mensagens do host
 */
function setupMessageListener() {
  if (typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    // Validar origem (em produção, verificar origin específico)
    // if (event.origin !== 'https://bazari.io') return;

    const response = event.data as HostResponse;

    if (!response.id || !pendingCallbacks.has(response.id)) {
      return;
    }

    const { resolve, reject } = pendingCallbacks.get(response.id)!;
    pendingCallbacks.delete(response.id);

    if (response.success) {
      resolve(response.data);
    } else {
      reject(
        new Error(response.error?.message || 'Unknown error from host')
      );
    }
  });
}

// Inicializar listener
setupMessageListener();

/**
 * Envia mensagem para o host e aguarda resposta
 */
export async function sendMessage<T extends MessageType>(
  type: T,
  payload: unknown,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ResponseTypes[T]> {
  return new Promise((resolve, reject) => {
    const id = generateId();

    const message: SDKMessage = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      sdkVersion: SDK_VERSION,
    };

    // Timeout
    const timeoutId = setTimeout(() => {
      pendingCallbacks.delete(id);
      reject(new Error(`Timeout waiting for response to ${type}`));
    }, timeout);

    // Registrar callback
    pendingCallbacks.set(id, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        resolve(value as ResponseTypes[T]);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    // Enviar mensagem para parent
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage(message, '*');
    } else {
      pendingCallbacks.delete(id);
      clearTimeout(timeoutId);
      reject(new Error('SDK must run inside Bazari platform iframe'));
    }
  });
}

/**
 * Verifica se está rodando dentro do Bazari
 */
export function isInsideBazari(): boolean {
  if (typeof window === 'undefined') return false;
  return window.parent !== window;
}
```

**Critérios de Aceite:**
- [ ] postMessage funciona
- [ ] Timeout implementado
- [ ] Callbacks mapeados

---

### Task 4.6: Criar cliente Auth do SDK

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/client/auth.ts`

**Código:**
```typescript
import { sendMessage } from '../utils/bridge';
import type { SDKUser, SDKPermissions } from '../types/responses';

/**
 * API de autenticação do SDK
 */
export class AuthClient {
  /**
   * Obtém o usuário atualmente logado
   */
  async getCurrentUser(): Promise<SDKUser> {
    return sendMessage('auth:getCurrentUser', undefined);
  }

  /**
   * Obtém as permissões concedidas ao app
   */
  async getPermissions(): Promise<SDKPermissions> {
    return sendMessage('auth:getPermissions', undefined);
  }

  /**
   * Verifica se o app tem uma permissão específica
   */
  async hasPermission(permissionId: string): Promise<boolean> {
    const permissions = await this.getPermissions();
    return permissions.granted.includes(permissionId);
  }
}
```

**Critérios de Aceite:**
- [ ] getCurrentUser funciona
- [ ] getPermissions funciona

---

### Task 4.7: Criar cliente Wallet do SDK

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/client/wallet.ts`

**Código:**
```typescript
import { sendMessage } from '../utils/bridge';
import type {
  SDKBalance,
  SDKTransaction,
  SDKTransferResult,
} from '../types/responses';

export interface TransferParams {
  to: string;
  amount: number;
  token: 'BZR' | 'ZARI';
  memo?: string;
}

/**
 * API de Wallet do SDK
 */
export class WalletClient {
  /**
   * Obtém o saldo do usuário
   */
  async getBalance(token?: 'BZR' | 'ZARI'): Promise<SDKBalance> {
    return sendMessage('wallet:getBalance', { token });
  }

  /**
   * Obtém histórico de transações
   */
  async getHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<SDKTransaction[]> {
    return sendMessage('wallet:getHistory', options || {});
  }

  /**
   * Solicita uma transferência (requer confirmação do usuário)
   */
  async requestTransfer(params: TransferParams): Promise<SDKTransferResult> {
    return sendMessage('wallet:requestTransfer', params);
  }

  /**
   * Obtém saldo formatado de BZR
   */
  async getBZRBalance(): Promise<string> {
    const balance = await this.getBalance('BZR');
    return balance.formatted.bzr;
  }

  /**
   * Obtém saldo formatado de ZARI
   */
  async getZARIBalance(): Promise<string> {
    const balance = await this.getBalance('ZARI');
    return balance.formatted.zari;
  }
}
```

**Critérios de Aceite:**
- [ ] getBalance funciona
- [ ] requestTransfer abre confirmação

---

### Task 4.8: Criar cliente Storage do SDK

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/client/storage.ts`

**Código:**
```typescript
import { sendMessage } from '../utils/bridge';

/**
 * API de Storage do SDK
 * Dados ficam isolados por app
 */
export class StorageClient {
  /**
   * Obtém um valor do storage
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await sendMessage('storage:get', { key });
    return result as T | null;
  }

  /**
   * Salva um valor no storage
   */
  async set(key: string, value: unknown): Promise<void> {
    await sendMessage('storage:set', { key, value });
  }

  /**
   * Remove um valor do storage
   */
  async remove(key: string): Promise<void> {
    await sendMessage('storage:remove', { key });
  }

  /**
   * Limpa todo o storage do app
   */
  async clear(): Promise<void> {
    await sendMessage('storage:clear', undefined);
  }

  /**
   * Obtém valor com fallback
   */
  async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const result = await this.get<T>(key);
    return result ?? defaultValue;
  }
}
```

**Critérios de Aceite:**
- [ ] CRUD de storage funciona
- [ ] Dados isolados por app

---

### Task 4.9: Criar cliente UI do SDK

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/client/ui.ts`

**Código:**
```typescript
import { sendMessage } from '../utils/bridge';
import type { SDKConfirmResult } from '../types/responses';

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ModalOptions {
  title: string;
  content: string;
}

/**
 * API de UI do SDK
 * Permite usar componentes nativos do Bazari
 */
export class UIClient {
  /**
   * Mostra um toast notification
   */
  async showToast(
    message: string,
    options?: ToastOptions
  ): Promise<void> {
    await sendMessage('ui:showToast', {
      message,
      type: options?.type || 'info',
      duration: options?.duration || 3000,
    });
  }

  /**
   * Mostra diálogo de confirmação
   * @returns true se usuário confirmou, false se cancelou
   */
  async showConfirm(options: ConfirmOptions): Promise<boolean> {
    const result = await sendMessage('ui:showConfirm', options);
    return (result as SDKConfirmResult).confirmed;
  }

  /**
   * Mostra modal com conteúdo
   */
  async showModal(options: ModalOptions): Promise<void> {
    await sendMessage('ui:showModal', options);
  }

  /**
   * Fecha modal atual
   */
  async closeModal(): Promise<void> {
    await sendMessage('ui:closeModal', undefined);
  }

  // Helpers
  async success(message: string): Promise<void> {
    return this.showToast(message, { type: 'success' });
  }

  async error(message: string): Promise<void> {
    return this.showToast(message, { type: 'error' });
  }

  async warning(message: string): Promise<void> {
    return this.showToast(message, { type: 'warning' });
  }

  async info(message: string): Promise<void> {
    return this.showToast(message, { type: 'info' });
  }
}
```

**Critérios de Aceite:**
- [ ] Toasts funcionam
- [ ] Confirm retorna boolean

---

### Task 4.10: Criar cliente Events do SDK

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/client/events.ts`

**Código:**
```typescript
import { sendMessage } from '../utils/bridge';
import type { HostEvent } from '../types/messages';

type EventCallback<T = unknown> = (data: T) => void;

/**
 * API de Events do SDK
 * Permite escutar eventos do Bazari
 */
export class EventsClient {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private initialized = false;

  constructor() {
    this.setupEventListener();
  }

  private setupEventListener() {
    if (this.initialized || typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      const data = event.data;

      // Verificar se é um evento do host
      if (data?.type?.startsWith('event:')) {
        const eventType = data.type.replace('event:', '');
        this.emit(eventType, data.data);
      }
    });

    this.initialized = true;
  }

  private emit(eventType: string, data: unknown) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Inscreve-se em um tipo de evento
   */
  async on<T = unknown>(
    eventType: string,
    callback: EventCallback<T>
  ): Promise<() => void> {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
      // Notificar host que queremos receber esse evento
      await sendMessage('events:subscribe', { eventType });
    }

    this.listeners.get(eventType)!.add(callback as EventCallback);

    // Retorna função para cancelar inscrição
    return () => this.off(eventType, callback);
  }

  /**
   * Remove inscrição de um evento
   */
  async off<T = unknown>(
    eventType: string,
    callback: EventCallback<T>
  ): Promise<void> {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);

      if (callbacks.size === 0) {
        this.listeners.delete(eventType);
        await sendMessage('events:unsubscribe', { eventType });
      }
    }
  }

  /**
   * Inscreve-se uma única vez em um evento
   */
  async once<T = unknown>(
    eventType: string,
    callback: EventCallback<T>
  ): Promise<void> {
    const wrapper: EventCallback<T> = (data) => {
      callback(data);
      this.off(eventType, wrapper);
    };
    await this.on(eventType, wrapper);
  }
}

// Eventos disponíveis
export type BazariEvent =
  | 'wallet:transaction'
  | 'wallet:balanceChanged'
  | 'user:profileUpdated'
  | 'app:activated'
  | 'app:deactivated';
```

**Critérios de Aceite:**
- [ ] Subscribe/unsubscribe funciona
- [ ] Callbacks são chamados

---

### Task 4.11: Criar classe principal do SDK

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/client/sdk.ts`

**Código:**
```typescript
import { AuthClient } from './auth';
import { WalletClient } from './wallet';
import { StorageClient } from './storage';
import { UIClient } from './ui';
import { EventsClient } from './events';
import { isInsideBazari } from '../utils/bridge';

export interface BazariSDKOptions {
  /** Modo de debug */
  debug?: boolean;
}

/**
 * SDK principal do Bazari
 *
 * @example
 * ```typescript
 * import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';
 *
 * const sdk = new BazariSDK();
 *
 * // Obter usuário atual
 * const user = await sdk.auth.getCurrentUser();
 *
 * // Verificar saldo
 * const balance = await sdk.wallet.getBalance();
 *
 * // Mostrar toast
 * await sdk.ui.success('Operação concluída!');
 * ```
 */
export class BazariSDK {
  /** API de autenticação */
  readonly auth: AuthClient;

  /** API de wallet */
  readonly wallet: WalletClient;

  /** API de storage */
  readonly storage: StorageClient;

  /** API de UI */
  readonly ui: UIClient;

  /** API de eventos */
  readonly events: EventsClient;

  /** Versão do SDK */
  static readonly VERSION = '0.1.0';

  private options: BazariSDKOptions;

  constructor(options: BazariSDKOptions = {}) {
    this.options = options;

    // Verificar se está no ambiente correto
    if (!isInsideBazari()) {
      if (options.debug) {
        console.warn(
          '[BazariSDK] Running outside Bazari platform. Some features may not work.'
        );
      }
    }

    // Inicializar clientes
    this.auth = new AuthClient();
    this.wallet = new WalletClient();
    this.storage = new StorageClient();
    this.ui = new UIClient();
    this.events = new EventsClient();

    if (options.debug) {
      console.log('[BazariSDK] Initialized', { version: BazariSDK.VERSION });
    }
  }

  /**
   * Verifica se está rodando dentro do Bazari
   */
  isInBazari(): boolean {
    return isInsideBazari();
  }

  /**
   * Obtém a versão do SDK
   */
  getVersion(): string {
    return BazariSDK.VERSION;
  }
}
```

**Critérios de Aceite:**
- [ ] SDK instancia todos os clientes
- [ ] Debug mode funciona

---

### Task 4.12: Criar index do SDK

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/src/index.ts`

**Código:**
```typescript
// Main SDK class
export { BazariSDK } from './client/sdk';
export type { BazariSDKOptions } from './client/sdk';

// Individual clients (for advanced usage)
export { AuthClient } from './client/auth';
export { WalletClient } from './client/wallet';
export { StorageClient } from './client/storage';
export { UIClient } from './client/ui';
export { EventsClient } from './client/events';
export type { BazariEvent } from './client/events';

// Types
export type {
  SDKUser,
  SDKBalance,
  SDKTransaction,
  SDKTransferResult,
  SDKConfirmResult,
  SDKPermissions,
} from './types/responses';

export type {
  MessageType,
  SDKMessage,
  HostResponse,
  HostEvent,
} from './types/messages';

// Utils
export { isInsideBazari } from './utils/bridge';
```

**Critérios de Aceite:**
- [ ] Todos os exports públicos
- [ ] Tipos exportados

---

### Task 4.13: Criar Host Bridge (lado do Bazari)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/platform/sdk/host-bridge.ts`

**Código:**
```typescript
import type { SDKMessage, HostResponse, MessageType } from '@bazari.libervia.xyz/app-sdk';
import { useUserAppsStore } from '../store';

type MessageHandler = (
  appId: string,
  payload: unknown
) => Promise<unknown>;

const handlers: Partial<Record<MessageType, MessageHandler>> = {};

/**
 * Registra um handler para um tipo de mensagem
 */
export function registerHandler(
  type: MessageType,
  handler: MessageHandler
): void {
  handlers[type] = handler;
}

/**
 * Processa mensagem recebida de um app
 */
export async function handleAppMessage(
  appId: string,
  message: SDKMessage,
  iframe: HTMLIFrameElement
): Promise<void> {
  const handler = handlers[message.type];

  let response: HostResponse;

  if (!handler) {
    response = {
      id: message.id,
      success: false,
      error: {
        code: 'UNKNOWN_MESSAGE_TYPE',
        message: `Unknown message type: ${message.type}`,
      },
      timestamp: Date.now(),
    };
  } else {
    try {
      // Verificar permissão
      const hasPermission = await checkPermission(appId, message.type);

      if (!hasPermission) {
        response = {
          id: message.id,
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `App does not have permission for: ${message.type}`,
          },
          timestamp: Date.now(),
        };
      } else {
        const data = await handler(appId, message.payload);
        response = {
          id: message.id,
          success: true,
          data,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      response = {
        id: message.id,
        success: false,
        error: {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      };
    }
  }

  // Enviar resposta de volta para o iframe
  iframe.contentWindow?.postMessage(response, '*');
}

/**
 * Verifica se o app tem permissão para executar a ação
 */
async function checkPermission(
  appId: string,
  messageType: MessageType
): Promise<boolean> {
  const permissionMap: Partial<Record<MessageType, string>> = {
    'auth:getCurrentUser': 'user.profile.read',
    'wallet:getBalance': 'wallet.balance.read',
    'wallet:getHistory': 'wallet.history.read',
    'wallet:requestTransfer': 'wallet.transfer.request',
    'storage:get': 'storage.app',
    'storage:set': 'storage.app',
    'storage:remove': 'storage.app',
    'storage:clear': 'storage.app',
  };

  const requiredPermission = permissionMap[messageType];

  // Algumas operações não precisam de permissão
  if (!requiredPermission) {
    return true;
  }

  const store = useUserAppsStore.getState();
  return store.hasPermission(appId, requiredPermission as any);
}
```

**Critérios de Aceite:**
- [ ] Handlers registráveis
- [ ] Verificação de permissão
- [ ] Resposta enviada ao iframe

---

### Task 4.14: Criar componente AppIframe

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppIframe.tsx`

**Código:**
```typescript
import { useEffect, useRef, useCallback } from 'react';
import { handleAppMessage } from '@/platform/sdk/host-bridge';
import type { SDKMessage } from '@bazari.libervia.xyz/app-sdk';

interface AppIframeProps {
  appId: string;
  src: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Iframe sandboxed para apps de terceiros
 */
export function AppIframe({
  appId,
  src,
  className,
  onLoad,
  onError,
}: AppIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handler de mensagens do app
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Validar origem (em produção, ser mais restritivo)
      if (!iframeRef.current) return;

      // Verificar se a mensagem veio do nosso iframe
      if (event.source !== iframeRef.current.contentWindow) return;

      const message = event.data as SDKMessage;

      // Validar estrutura da mensagem
      if (!message.id || !message.type) return;

      await handleAppMessage(appId, message, iframeRef.current);
    },
    [appId]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      className={className}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allow="clipboard-write"
      onLoad={onLoad}
      onError={() => onError?.(new Error('Failed to load app'))}
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
```

**Critérios de Aceite:**
- [ ] Iframe com sandbox
- [ ] Mensagens interceptadas
- [ ] Bridge conectado

---

### Task 4.15: Criar README do SDK

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `packages/bazari-app-sdk/README.md`

**Código:**
```markdown
# @bazari.libervia.xyz/app-sdk

SDK oficial para desenvolvimento de apps no ecossistema Bazari.

## Instalação

```bash
npm install @bazari.libervia.xyz/app-sdk
# ou
yarn add @bazari.libervia.xyz/app-sdk
# ou
pnpm add @bazari.libervia.xyz/app-sdk
```

## Uso Básico

```typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

// Inicializar SDK
const sdk = new BazariSDK();

// Verificar se está no Bazari
if (!sdk.isInBazari()) {
  console.warn('Este app deve rodar dentro do Bazari');
}

// Obter usuário atual
const user = await sdk.auth.getCurrentUser();
console.log('Usuário:', user.displayName);

// Verificar saldo
const balance = await sdk.wallet.getBalance();
console.log('Saldo BZR:', balance.formatted.bzr);

// Mostrar notificação
await sdk.ui.success('Bem-vindo ao app!');
```

## APIs Disponíveis

### Auth

```typescript
// Obter usuário logado
const user = await sdk.auth.getCurrentUser();

// Verificar permissões
const permissions = await sdk.auth.getPermissions();
const canTransfer = await sdk.auth.hasPermission('wallet.transfer.request');
```

### Wallet

```typescript
// Obter saldo
const balance = await sdk.wallet.getBalance();
const bzrOnly = await sdk.wallet.getBalance('BZR');

// Histórico
const transactions = await sdk.wallet.getHistory({ limit: 10 });

// Solicitar transferência (abre modal de confirmação)
const result = await sdk.wallet.requestTransfer({
  to: 'user-handle',
  amount: 100,
  token: 'BZR',
  memo: 'Pagamento'
});
```

### Storage

```typescript
// Salvar dados (isolados por app)
await sdk.storage.set('myKey', { data: 'value' });

// Recuperar dados
const data = await sdk.storage.get('myKey');

// Com fallback
const value = await sdk.storage.getOrDefault('key', 'default');

// Remover
await sdk.storage.remove('myKey');
await sdk.storage.clear(); // Limpa tudo
```

### UI

```typescript
// Toasts
await sdk.ui.showToast('Mensagem', { type: 'info' });
await sdk.ui.success('Sucesso!');
await sdk.ui.error('Erro!');
await sdk.ui.warning('Atenção!');

// Confirmação
const confirmed = await sdk.ui.showConfirm({
  title: 'Confirmar ação',
  message: 'Tem certeza?',
  confirmText: 'Sim',
  cancelText: 'Não'
});

// Modal
await sdk.ui.showModal({ title: 'Título', content: 'Conteúdo' });
await sdk.ui.closeModal();
```

### Events

```typescript
// Escutar evento
const unsubscribe = await sdk.events.on('wallet:balanceChanged', (data) => {
  console.log('Novo saldo:', data);
});

// Parar de escutar
unsubscribe();

// Escutar uma vez
await sdk.events.once('app:activated', (data) => {
  console.log('App ativado');
});
```

## Permissões

Seu app deve declarar as permissões necessárias no `bazari.manifest.json`:

```json
{
  "permissions": [
    { "id": "user.profile.read", "reason": "Para exibir seu nome" },
    { "id": "wallet.balance.read", "reason": "Para mostrar saldo" }
  ]
}
```

## TypeScript

O SDK é totalmente tipado. Importe os tipos conforme necessário:

```typescript
import type {
  SDKUser,
  SDKBalance,
  SDKTransaction
} from '@bazari.libervia.xyz/app-sdk';
```

## Licença

MIT
```

**Critérios de Aceite:**
- [ ] Documentação completa
- [ ] Exemplos de código

---

## Arquivos a Criar (Resumo)

| Arquivo | Tipo |
|---------|------|
| `packages/bazari-app-sdk/package.json` | criar |
| `packages/bazari-app-sdk/tsconfig.json` | criar |
| `packages/bazari-app-sdk/src/index.ts` | criar |
| `packages/bazari-app-sdk/src/types/messages.ts` | criar |
| `packages/bazari-app-sdk/src/types/responses.ts` | criar |
| `packages/bazari-app-sdk/src/types/index.ts` | criar |
| `packages/bazari-app-sdk/src/utils/bridge.ts` | criar |
| `packages/bazari-app-sdk/src/client/sdk.ts` | criar |
| `packages/bazari-app-sdk/src/client/auth.ts` | criar |
| `packages/bazari-app-sdk/src/client/wallet.ts` | criar |
| `packages/bazari-app-sdk/src/client/storage.ts` | criar |
| `packages/bazari-app-sdk/src/client/ui.ts` | criar |
| `packages/bazari-app-sdk/src/client/events.ts` | criar |
| `packages/bazari-app-sdk/README.md` | criar |
| `apps/web/src/platform/sdk/host-bridge.ts` | criar |
| `apps/web/src/components/platform/AppIframe.tsx` | criar |

**Total:** 16 arquivos novos

---

## Validação da Fase

### Checklist Final

- [ ] SDK compila sem erros
- [ ] Pacote npm estruturado
- [ ] Bridge postMessage funciona
- [ ] Handlers registrados no host
- [ ] Verificação de permissão
- [ ] Iframe sandboxed
- [ ] Documentação escrita

---

## Próxima Fase

Após completar esta fase, prossiga para:
**[PHASE-05-DEVELOPER-PORTAL.md](./PHASE-05-DEVELOPER-PORTAL.md)** - Portal do Desenvolvedor

---

**Documento:** PHASE-04-SDK.md
**Versão:** 1.0.0
**Data:** 2024-12-03
