# SDK API Specification

**Versão:** 0.1.0
**Status:** Draft
**Data:** 2024-12-03

---

## Visão Geral

O `@bazari/app-sdk` fornece APIs para apps de terceiros interagirem com o ecossistema Bazari de forma segura e controlada.

---

## Instalação

```bash
npm install @bazari/app-sdk
```

---

## Inicialização

```typescript
import { BazariSDK } from '@bazari/app-sdk';

const sdk = new BazariSDK({
  debug: true, // Opcional: habilita logs
});

// Verificar se está no ambiente correto
if (!sdk.isInBazari()) {
  console.warn('App deve rodar dentro do Bazari');
}
```

---

## Auth API

### `sdk.auth.getCurrentUser()`

Retorna o usuário atualmente logado.

**Permissão:** `user.profile.read`

```typescript
const user = await sdk.auth.getCurrentUser();
// {
//   id: "clx123...",
//   handle: "joao",
//   displayName: "João Silva",
//   avatar: "https://...",
//   roles: ["user", "seller"]
// }
```

### `sdk.auth.getPermissions()`

Retorna permissões do app.

**Permissão:** Nenhuma

```typescript
const permissions = await sdk.auth.getPermissions();
// {
//   granted: ["user.profile.read", "wallet.balance.read"],
//   denied: ["orders.read"]
// }
```

### `sdk.auth.hasPermission(permissionId)`

Verifica se app tem uma permissão.

**Permissão:** Nenhuma

```typescript
const canRead = await sdk.auth.hasPermission('wallet.balance.read');
// true | false
```

---

## Wallet API

### `sdk.wallet.getBalance(token?)`

Retorna saldo do usuário.

**Permissão:** `wallet.balance.read`

```typescript
// Todos os tokens
const balance = await sdk.wallet.getBalance();
// {
//   bzr: "1000000000000000000",
//   zari: "500000000000000000",
//   formatted: {
//     bzr: "1,000.00 BZR",
//     zari: "500.00 ZARI"
//   }
// }

// Token específico
const bzr = await sdk.wallet.getBalance('BZR');
```

### `sdk.wallet.getHistory(options?)`

Retorna histórico de transações.

**Permissão:** `wallet.history.read`

```typescript
const transactions = await sdk.wallet.getHistory({
  limit: 10,
  offset: 0
});
// [{
//   id: "tx123",
//   type: "transfer",
//   amount: "100000000000000000",
//   token: "BZR",
//   from: "5Grw...",
//   to: "5Abc...",
//   memo: "Pagamento",
//   timestamp: "2024-12-03T10:00:00Z",
//   status: "confirmed"
// }]
```

### `sdk.wallet.requestTransfer(params)`

Solicita transferência (requer confirmação do usuário).

**Permissão:** `wallet.transfer.request`

```typescript
const result = await sdk.wallet.requestTransfer({
  to: 'joao', // handle ou endereço
  amount: 100,
  token: 'BZR',
  memo: 'Pagamento de serviço'
});
// {
//   success: true,
//   transactionId: "0x123..."
// }
// ou
// {
//   success: false,
//   error: "User rejected"
// }
```

---

## Storage API

Armazenamento local isolado por app.

### `sdk.storage.get(key)`

**Permissão:** `storage.app`

```typescript
const data = await sdk.storage.get('preferences');
// { theme: 'dark', ... } ou null
```

### `sdk.storage.set(key, value)`

**Permissão:** `storage.app`

```typescript
await sdk.storage.set('preferences', { theme: 'dark' });
```

### `sdk.storage.remove(key)`

**Permissão:** `storage.app`

```typescript
await sdk.storage.remove('preferences');
```

### `sdk.storage.clear()`

**Permissão:** `storage.app`

```typescript
await sdk.storage.clear(); // Remove todos os dados do app
```

### `sdk.storage.getOrDefault(key, defaultValue)`

**Permissão:** `storage.app`

```typescript
const theme = await sdk.storage.getOrDefault('theme', 'light');
// 'dark' se existir, 'light' se não
```

---

## UI API

Usa componentes nativos do Bazari.

### `sdk.ui.showToast(message, options?)`

**Permissão:** Nenhuma

```typescript
await sdk.ui.showToast('Operação concluída!', {
  type: 'success', // 'success' | 'error' | 'warning' | 'info'
  duration: 3000
});

// Helpers
await sdk.ui.success('Sucesso!');
await sdk.ui.error('Erro!');
await sdk.ui.warning('Atenção!');
await sdk.ui.info('Info');
```

### `sdk.ui.showConfirm(options)`

**Permissão:** Nenhuma

```typescript
const confirmed = await sdk.ui.showConfirm({
  title: 'Confirmar ação',
  message: 'Tem certeza que deseja continuar?',
  confirmText: 'Sim, continuar',
  cancelText: 'Cancelar'
});
// true se confirmou, false se cancelou
```

### `sdk.ui.showModal(options)`

**Permissão:** Nenhuma

```typescript
await sdk.ui.showModal({
  title: 'Título do Modal',
  content: 'Conteúdo do modal...'
});
```

### `sdk.ui.closeModal()`

**Permissão:** Nenhuma

```typescript
await sdk.ui.closeModal();
```

---

## Events API

Escuta eventos do sistema.

### `sdk.events.on(eventType, callback)`

```typescript
const unsubscribe = await sdk.events.on('wallet:balanceChanged', (data) => {
  console.log('Novo saldo:', data);
});

// Para de escutar
unsubscribe();
```

### `sdk.events.off(eventType, callback)`

```typescript
await sdk.events.off('wallet:balanceChanged', myCallback);
```

### `sdk.events.once(eventType, callback)`

```typescript
await sdk.events.once('app:activated', (data) => {
  console.log('App foi ativado');
});
```

### Eventos Disponíveis

| Evento | Dados | Descrição |
|--------|-------|-----------|
| `wallet:balanceChanged` | `{ bzr, zari }` | Saldo mudou |
| `wallet:transaction` | `Transaction` | Nova transação |
| `user:profileUpdated` | `User` | Perfil atualizado |
| `app:activated` | `{}` | App ficou visível |
| `app:deactivated` | `{}` | App saiu de foco |

---

## Navigation API

### `sdk.navigation.goTo(path)`

Navega para rota interna do app.

```typescript
await sdk.navigation.goTo('/settings');
```

### `sdk.navigation.openApp(appId, params?)`

Abre outro app.

```typescript
await sdk.navigation.openApp('wallet', { tab: 'send' });
```

### `sdk.navigation.goBack()`

Volta para tela anterior.

```typescript
await sdk.navigation.goBack();
```

---

## Tipos TypeScript

```typescript
// Usuário
interface SDKUser {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  roles: string[];
}

// Saldo
interface SDKBalance {
  bzr: string;
  zari: string;
  formatted: {
    bzr: string;
    zari: string;
  };
}

// Transação
interface SDKTransaction {
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

// Permissões
interface SDKPermissions {
  granted: string[];
  denied: string[];
}
```

---

## Erros

```typescript
try {
  await sdk.wallet.getBalance();
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    // App não tem permissão
  } else if (error.code === 'TIMEOUT') {
    // Timeout aguardando resposta
  } else if (error.code === 'NOT_IN_BAZARI') {
    // App não está rodando no Bazari
  }
}
```

### Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `PERMISSION_DENIED` | App não tem permissão |
| `TIMEOUT` | Timeout (10s por padrão) |
| `NOT_IN_BAZARI` | App não está no iframe |
| `USER_REJECTED` | Usuário negou ação |
| `INVALID_PARAMS` | Parâmetros inválidos |
| `RATE_LIMITED` | Limite de chamadas excedido |

---

## Exemplo Completo

```typescript
import { BazariSDK } from '@bazari/app-sdk';

async function main() {
  const sdk = new BazariSDK();

  // Verificar ambiente
  if (!sdk.isInBazari()) {
    console.error('Execute este app dentro do Bazari');
    return;
  }

  try {
    // Obter usuário
    const user = await sdk.auth.getCurrentUser();
    console.log(`Olá, ${user.displayName}!`);

    // Verificar saldo
    const balance = await sdk.wallet.getBalance();
    console.log(`Saldo: ${balance.formatted.bzr}`);

    // Salvar preferência
    await sdk.storage.set('lastLogin', new Date().toISOString());

    // Escutar mudanças de saldo
    sdk.events.on('wallet:balanceChanged', (data) => {
      console.log('Saldo atualizado:', data);
    });

    // Mostrar toast
    await sdk.ui.success('App carregado!');

  } catch (error) {
    await sdk.ui.error(`Erro: ${error.message}`);
  }
}

main();
```

---

**Documento:** SDK-API-SPEC.md
**Versão:** 0.1.0
