# SDK - Contracts API

API para interagir com smart contracts ink! na Bazari Chain.

## Permissões Necessárias

- `contracts:read` - Para consultar contratos
- `contracts:write` - Para executar transações

## Tipos de Contratos

### 1. Loyalty (Fidelidade)
Programa de pontos para clientes.

### 2. Escrow
Pagamentos seguros com liberação condicional.

### 3. Revenue Split
Divisão automática de receita entre participantes.

## Deploy de Contratos

### deployLoyalty()

Cria um novo programa de fidelidade.

```typescript
const contract = await sdk.contracts.deployLoyalty({
  name: string;           // Nome do programa
  symbol: string;         // Símbolo (ex: "PTS")
  bzrToPointsRatio: number;   // 1 BZR = X pontos
  pointsToBzrRatio: number;   // X pontos = 1 BZR
  expirationDays?: number;    // Dias para expirar (0 = nunca)
});
```

**Retorno:**

```typescript
interface DeployedContract {
  type: 'loyalty';
  address: string;
  deployedAt: string;
}
```

**Exemplo:**

```javascript
const loyaltyContract = await sdk.contracts.deployLoyalty({
  name: 'Pontos Café',
  symbol: 'PTC',
  bzrToPointsRatio: 100,
  pointsToBzrRatio: 100,
  expirationDays: 365
});

// Salvar endereço
await sdk.storage.set('loyaltyAddress', loyaltyContract.address);
```

### deployEscrow()

Cria um contrato de escrow.

```typescript
const contract = await sdk.contracts.deployEscrow({
  seller: string;        // Endereço do vendedor
  amount: string;        // Valor em BZR
  description: string;   // Descrição da transação
  deadlineHours: number; // Prazo em horas
});
```

### deployRevenueSplit()

Cria um contrato de divisão de receita.

```typescript
const contract = await sdk.contracts.deployRevenueSplit({
  participants: Array<{
    address: string;
    shareBps: number;  // Basis points (100 = 1%)
  }>;
});
```

**Exemplo:**

```javascript
const splitContract = await sdk.contracts.deployRevenueSplit({
  participants: [
    { address: '0x...creator', shareBps: 7000 },  // 70%
    { address: '0x...partner', shareBps: 2000 },  // 20%
    { address: '0x...platform', shareBps: 1000 }, // 10%
  ]
});
```

## Interagindo com Loyalty

```javascript
const loyalty = sdk.contracts.loyalty(contractAddress);
```

### issuePoints()

Emite pontos para um cliente.

```typescript
await loyalty.issuePoints(
  to: string,      // Endereço do cliente
  amount: number,  // Quantidade de pontos
  reason: string   // Motivo
);
```

### balanceOf()

Consulta saldo de pontos.

```typescript
const points = await loyalty.balanceOf(address);
// "1500"
```

### tierOf()

Consulta tier do cliente.

```typescript
const tier = await loyalty.tierOf(address);
// "Gold"
```

### redeemPoints()

Resgata pontos por BZR.

```typescript
const result = await loyalty.redeemPoints(amount);
// { bzrValue: "15" }
```

### transfer()

Transfere pontos para outro usuário.

```typescript
await loyalty.transfer(to, amount);
```

## Interagindo com Escrow

```javascript
const escrow = sdk.contracts.escrow(escrowId);
```

### fund()

Deposita fundos no escrow.

```typescript
await escrow.fund();
```

### confirmDelivery()

Confirma recebimento e libera fundos.

```typescript
await escrow.confirmDelivery();
```

### openDispute()

Abre disputa.

```typescript
await escrow.openDispute(reason);
```

### refund()

Solicita reembolso.

```typescript
await escrow.refund();
```

### getStatus()

Consulta status do escrow.

```typescript
const info = await escrow.getStatus();
// { id, buyer, seller, amount, status, description, createdAt, deadline }
```

## Interagindo com Revenue Split

```javascript
const split = sdk.contracts.revenueSplit(contractAddress);
```

### withdraw()

Saca saldo pendente.

```typescript
const result = await split.withdraw();
// { amount: "150" }
```

### pendingBalance()

Consulta saldo pendente.

```typescript
const pending = await split.pendingBalance();
// "150"
```

### getParticipants()

Lista participantes e shares.

```typescript
const participants = await split.getParticipants();
// [{ address, shareBps, pendingBalance }, ...]
```

## Exemplo Completo: Sistema de Fidelidade

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();
let loyalty;

// Inicializar
async function init() {
  let address = await sdk.storage.get('loyaltyContract');

  if (!address) {
    // Deploy novo contrato
    const contract = await sdk.contracts.deployLoyalty({
      name: 'Loja Rewards',
      symbol: 'LR',
      bzrToPointsRatio: 100,
      pointsToBzrRatio: 100
    });

    address = contract.address;
    await sdk.storage.set('loyaltyContract', address);
  }

  loyalty = sdk.contracts.loyalty(address);
}

// Após compra
async function onPurchase(customerAddress, totalBzr) {
  const points = totalBzr * 100;

  await loyalty.issuePoints(
    customerAddress,
    points,
    `Compra de ${totalBzr} BZR`
  );

  sdk.ui.success(`+${points} pontos!`);
}

// Mostrar cartão de pontos
async function showPointsCard() {
  const user = await sdk.auth.getCurrentUser();
  const points = await loyalty.balanceOf(user.address);
  const tier = await loyalty.tierOf(user.address);

  return { points, tier };
}

// Resgatar
async function redeem(amount) {
  const result = await loyalty.redeemPoints(amount);
  sdk.ui.success(`Resgatado: ${result.bzrValue} BZR`);
}
```

## Próximos Passos

- [Guia de Fidelidade](../guides/loyalty-program.md)
- [Guia de Escrow](../guides/escrow-service.md)
- [API de Wallet](./wallet.md)
