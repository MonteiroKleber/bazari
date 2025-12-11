# Como Integrar Pagamentos BZR

Aprenda a receber pagamentos em BZR no seu app.

## Tipos de Pagamento

1. **Transferência direta** - Usuário envia BZR para você
2. **In-App Purchase** - Usuário compra produto dentro do app
3. **Escrow** - Pagamento seguro com liberação condicional

## 1. Transferência Direta

O jeito mais simples de receber pagamentos:

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

async function requestPayment() {
  try {
    // Solicita transferência (abre modal de confirmação)
    const result = await sdk.wallet.requestTransfer({
      to: 'SEU_ENDERECO_WALLET',  // ou handle @seuapp
      amount: 10,                  // 10 BZR
      token: 'BZR',
      memo: 'Pagamento - Produto X'
    });

    if (result.success) {
      console.log('Pagamento recebido!', result.txHash);
      // Liberar acesso ao produto
    }
  } catch (error) {
    console.error('Pagamento falhou:', error);
  }
}
```

### UX Recomendada

```html
<button onclick="requestPayment()" class="pay-button">
  💳 Pagar 10 BZR
</button>

<style>
.pay-button {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
```

## 2. In-App Purchase (IAP)

Para apps Freemium com compras dentro do app:

### Configurar no Developer Portal

1. Acesse `/app/developer/apps/SEU_APP_ID`
2. Vá em "Monetização"
3. Escolha "Freemium"
4. Adicione produtos:

| ID | Nome | Preço | Tipo |
|----|------|-------|------|
| premium_pack | Pacote Premium | 25 BZR | Permanente |
| coins_100 | 100 Moedas | 5 BZR | Consumível |

### Usar no App

```javascript
// Verificar se usuário já comprou (NON_CONSUMABLE)
const hasPremium = await sdk.iap.hasPurchased('premium_pack');

if (!hasPremium) {
  // Mostrar botão de compra
  document.getElementById('premium-btn').style.display = 'block';
}

// Iniciar compra
async function buyPremium() {
  const result = await sdk.iap.purchase('premium_pack');

  if (result.success) {
    // Liberar features premium
    enablePremiumFeatures();
    sdk.ui.success('Pacote Premium ativado!');
  }
}

// Comprar consumível
async function buyCoins() {
  const result = await sdk.iap.purchase('coins_100');

  if (result.success) {
    // Adicionar moedas ao saldo do usuário
    userCoins += 100;
    updateUI();
  }
}
```

## 3. Escrow (Pagamento Seguro)

Para transações P2P ou serviços:

```javascript
// 1. Vendedor cria oferta
const escrow = await sdk.contracts.deployEscrow({
  seller: sellerAddress,
  amount: '100',           // 100 BZR
  description: 'Serviço de design',
  deadlineHours: 72        // 3 dias para entrega
});

// 2. Comprador deposita
await sdk.contracts.escrow(escrow.id).fund();

// 3. Após entrega, comprador confirma
await sdk.contracts.escrow(escrow.id).confirmDelivery();

// 4. Valor é liberado automaticamente para vendedor
```

### Fluxo de Disputa

```javascript
// Comprador ou vendedor podem abrir disputa
await sdk.contracts.escrow(escrow.id).openDispute(
  'Produto não corresponde à descrição'
);

// Mediador Bazari resolve e libera para uma das partes
```

## Boas Práticas

### 1. Sempre mostrar confirmação

```javascript
// O SDK abre modal nativo, mas você pode adicionar preview
async function confirmPurchase(product) {
  const confirmed = await sdk.ui.showConfirm({
    title: 'Confirmar Compra',
    message: `Você está comprando "${product.name}" por ${product.price} BZR`,
    confirmText: 'Comprar',
    cancelText: 'Cancelar'
  });

  if (confirmed) {
    await sdk.iap.purchase(product.id);
  }
}
```

### 2. Tratar erros de saldo insuficiente

```javascript
try {
  await sdk.wallet.requestTransfer({ ... });
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    sdk.ui.error('Saldo insuficiente. Adicione mais BZR à sua wallet.');
  } else {
    sdk.ui.error('Erro no pagamento. Tente novamente.');
  }
}
```

### 3. Persistir estado de compras

```javascript
// Salvar compras no storage do app
await sdk.storage.set('purchases', JSON.stringify(userPurchases));

// Recuperar ao iniciar
const saved = await sdk.storage.get('purchases');
userPurchases = saved ? JSON.parse(saved) : [];
```

## Revenue Share

Você recebe automaticamente:

| Tier | Instalações | Sua % |
|------|-------------|-------|
| Starter | 0 - 1.000 | 70% |
| Growth | 1.001 - 10.000 | 75% |
| Scale | 10.001 - 100.000 | 80% |
| Enterprise | 100.001+ | 85% |

Acompanhe sua receita em `/app/developer/revenue`.

## Próximos Passos

- [Criar programa de fidelidade](./loyalty-program.md)
- [Monetização avançada](./monetization.md)
- [Referência da API Wallet](../sdk/wallet.md)
