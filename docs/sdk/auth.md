# SDK - Auth API

API de autenticação e informações do usuário.

## Permissão Necessária

- `profile:read` - Para acessar informações do usuário

## Métodos

### getCurrentUser()

Retorna informações do usuário logado.

```typescript
const user = await sdk.auth.getCurrentUser();
```

**Retorno:**

```typescript
interface SDKUser {
  id: string;          // ID único do usuário
  handle: string;      // @handle do usuário
  displayName: string; // Nome de exibição
  avatar?: string;     // URL do avatar
  roles: string[];     // Roles do usuário ['user', 'seller', etc]
}
```

**Exemplo:**

```javascript
const user = await sdk.auth.getCurrentUser();

console.log(`Olá, ${user.displayName}!`);
console.log(`Handle: @${user.handle}`);

if (user.roles.includes('seller')) {
  showSellerFeatures();
}
```

### getPermissions()

Retorna as permissões do app.

```typescript
const permissions = await sdk.auth.getPermissions();
```

**Retorno:**

```typescript
interface SDKPermissions {
  granted: string[];  // Permissões aprovadas
  denied: string[];   // Permissões negadas
}
```

**Exemplo:**

```javascript
const perms = await sdk.auth.getPermissions();

if (perms.granted.includes('wallet:write')) {
  showPaymentButton();
} else {
  showReadOnlyMode();
}
```

## Permissões Disponíveis

| Permissão | Descrição |
|-----------|-----------|
| `profile:read` | Ler informações do usuário |
| `wallet:read` | Ver saldo e histórico |
| `wallet:write` | Solicitar transferências |
| `storage` | Usar storage persistente |
| `notifications` | Enviar notificações |
| `contracts:read` | Consultar contratos |
| `contracts:write` | Executar transações em contratos |

## Declarar Permissões

No `bazari.manifest.json`:

```json
{
  "permissions": [
    "profile:read",
    "wallet:read",
    "storage"
  ]
}
```

## Verificação de Permissão

O SDK lança erro se tentar usar API sem permissão:

```javascript
try {
  // App não tem wallet:write no manifest
  await sdk.wallet.requestTransfer({ ... });
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    sdk.ui.error('Este app não tem permissão para transferências');
  }
}
```

## Fluxo de Autorização

```
1. App declara permissões no manifest
        ↓
2. Usuário instala app
        ↓
3. Plataforma mostra permissões solicitadas
        ↓
4. Usuário aprova ou nega
        ↓
5. App pode usar apenas permissões aprovadas
```

## Boas Práticas

### 1. Solicite apenas o necessário

```json
// ✅ Bom - só o necessário
{
  "permissions": ["wallet:read"]
}

// ❌ Ruim - pede tudo
{
  "permissions": ["wallet:read", "wallet:write", "contracts:write", "notifications"]
}
```

### 2. Explique por que precisa

No seu app, explique antes de usar uma feature que requer permissão:

```javascript
async function showPaymentOption() {
  const perms = await sdk.auth.getPermissions();

  if (!perms.granted.includes('wallet:write')) {
    // Mostrar explicação de por que precisa
    sdk.ui.info('Para completar a compra, o app precisa de permissão para transferências.');
    return;
  }

  // Mostrar opção de pagamento
  showPayButton();
}
```

### 3. Funcione sem permissões opcionais

```javascript
async function initApp() {
  const perms = await sdk.auth.getPermissions();

  // Features básicas sempre funcionam
  loadMainContent();

  // Features premium só se tiver permissão
  if (perms.granted.includes('notifications')) {
    enableNotifications();
  }
}
```

## Próximos Passos

- [API de Wallet](./wallet.md)
- [API de Storage](./storage.md)
