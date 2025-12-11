# SDK - Wallet API

API para interagir com a wallet BZR do usuário.

## Permissões Necessárias

- `wallet:read` - Para ver saldo e histórico
- `wallet:write` - Para solicitar transferências

## Métodos

### getBalance()

Retorna o saldo atual do usuário.

**Permissão:** `wallet:read`

```typescript
const balance = await sdk.wallet.getBalance();
```

**Retorno:**

```typescript
interface SDKBalance {
  bzr: string;      // Saldo em BZR (wei)
  zari: string;     // Saldo em ZARI (wei)
  formatted: {
    bzr: string;    // Saldo formatado "1.000,00"
    zari: string;   // Saldo formatado "50,00"
  };
}
```

**Exemplo:**

```javascript
const balance = await sdk.wallet.getBalance();

document.getElementById('balance').innerHTML = `
  <div>BZR: ${balance.formatted.bzr}</div>
  <div>ZARI: ${balance.formatted.zari}</div>
`;
```

### getHistory()

Retorna histórico de transações.

**Permissão:** `wallet:read`

```typescript
const history = await sdk.wallet.getHistory();
```

**Retorno:**

```typescript
interface SDKTransaction {
  id: string;
  type: 'transfer' | 'reward' | 'purchase' | 'sale';
  amount: string;
  token: 'BZR' | 'ZARI';
  from?: string;
  to?: string;
  memo?: string;
  timestamp: string;   // ISO 8601
  status: 'pending' | 'confirmed' | 'failed';
}
```

**Exemplo:**

```javascript
const history = await sdk.wallet.getHistory();

const recentTransactions = history.slice(0, 10);

for (const tx of recentTransactions) {
  console.log(`${tx.type}: ${tx.amount} ${tx.token}`);
}
```

### requestTransfer()

Solicita transferência de tokens.

**Permissão:** `wallet:write`

```typescript
const result = await sdk.wallet.requestTransfer({
  to: string;      // Endereço ou @handle
  amount: number;  // Quantidade
  token: 'BZR' | 'ZARI';
  memo?: string;   // Mensagem opcional
});
```

**Retorno:**

```typescript
interface SDKTransferResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}
```

**Exemplo:**

```javascript
async function sendPayment() {
  try {
    const result = await sdk.wallet.requestTransfer({
      to: '@vendedor',
      amount: 50,
      token: 'BZR',
      memo: 'Compra - Produto ABC'
    });

    if (result.success) {
      sdk.ui.success('Pagamento enviado!');
      console.log('TX ID:', result.transactionId);
    }
  } catch (error) {
    handlePaymentError(error);
  }
}
```

## Tratamento de Erros

```javascript
try {
  await sdk.wallet.requestTransfer({ ... });
} catch (error) {
  switch (error.code) {
    case 'INSUFFICIENT_BALANCE':
      sdk.ui.error('Saldo insuficiente');
      break;

    case 'USER_CANCELLED':
      // Usuário fechou o modal - não mostrar erro
      break;

    case 'INVALID_ADDRESS':
      sdk.ui.error('Endereço inválido');
      break;

    case 'PERMISSION_DENIED':
      sdk.ui.error('App não tem permissão para transferências');
      break;

    case 'NETWORK_ERROR':
      sdk.ui.error('Erro de rede. Tente novamente.');
      break;

    default:
      sdk.ui.error('Erro desconhecido');
      console.error(error);
  }
}
```

## Fluxo de Transferência

```
1. App chama requestTransfer()
        ↓
2. Plataforma mostra modal de confirmação
   ┌─────────────────────────────┐
   │  Confirmar Transferência    │
   │                             │
   │  Para: @vendedor            │
   │  Valor: 50 BZR              │
   │  Memo: Compra - Produto ABC │
   │                             │
   │  [Cancelar]  [Confirmar]    │
   └─────────────────────────────┘
        ↓
3. Usuário confirma
        ↓
4. Transação é processada
        ↓
5. Resultado retorna ao app
```

## Eventos de Wallet

```javascript
// Escutar mudanças de saldo
sdk.events.on('wallet:balance-changed', (data) => {
  console.log('Novo saldo:', data.balance);
  updateBalanceUI(data.balance);
});

// Escutar transações recebidas
sdk.events.on('wallet:received', (data) => {
  sdk.ui.success(`Recebeu ${data.amount} ${data.token}!`);
});
```

## Boas Práticas

### 1. Verificar saldo antes de solicitar

```javascript
async function checkout(total) {
  const balance = await sdk.wallet.getBalance();
  const currentBzr = parseFloat(balance.bzr) / 1e12; // Converter de wei

  if (currentBzr < total) {
    sdk.ui.error(`Saldo insuficiente. Você precisa de ${total} BZR.`);
    return;
  }

  await sdk.wallet.requestTransfer({
    to: '@loja',
    amount: total,
    token: 'BZR'
  });
}
```

### 2. Usar memo descritivo

```javascript
// ✅ Bom
await sdk.wallet.requestTransfer({
  to: '@loja',
  amount: 50,
  token: 'BZR',
  memo: 'Pedido #12345 - Camiseta P'
});

// ❌ Ruim
await sdk.wallet.requestTransfer({
  to: '@loja',
  amount: 50,
  token: 'BZR'
  // Sem memo
});
```

### 3. Mostrar feedback durante processamento

```javascript
async function processPayment() {
  const button = document.getElementById('pay-btn');
  button.disabled = true;
  button.textContent = 'Processando...';

  try {
    await sdk.wallet.requestTransfer({ ... });
    button.textContent = 'Pago ✓';
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Pagar';
  }
}
```

## Próximos Passos

- [API de Storage](./storage.md)
- [API de UI](./ui.md)
- [Guia de Pagamentos](../guides/payment-integration.md)
