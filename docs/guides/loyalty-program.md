# Como Criar um Programa de Fidelidade

Crie um programa de pontos para fidelizar seus clientes usando smart contracts ink!.

## Visão Geral

O contrato de Fidelidade permite:
- Emitir pontos para clientes
- Trocar pontos por descontos/produtos
- Transferir pontos entre usuários
- Níveis de fidelidade automáticos

## Passo 1: Deploy do Contrato

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

// Deploy do contrato de fidelidade
const contract = await sdk.contracts.deployLoyalty({
  name: 'Pontos Loja X',
  symbol: 'PLX',
  bzrToPointsRatio: 100,    // 1 BZR = 100 pontos
  pointsToBzrRatio: 100,    // 100 pontos = 1 BZR
  expirationDays: 365       // Pontos expiram em 1 ano
});

console.log('Contrato deployado:', contract.address);

// Salvar endereço do contrato
await sdk.storage.set('loyaltyContract', contract.address);
```

## Passo 2: Emitir Pontos

```javascript
// Recuperar contrato
const contractAddress = await sdk.storage.get('loyaltyContract');
const loyalty = sdk.contracts.loyalty(contractAddress);

// Emitir pontos para cliente após compra
async function rewardCustomer(customerAddress, purchaseAmount) {
  // 1 BZR gasto = 100 pontos
  const points = purchaseAmount * 100;

  await loyalty.issuePoints(
    customerAddress,
    points,
    `Compra de ${purchaseAmount} BZR`
  );

  sdk.ui.success(`+${points} pontos adicionados!`);
}
```

## Passo 3: Consultar Saldo

```javascript
// Consultar pontos do usuário logado
async function getMyPoints() {
  const user = await sdk.auth.getCurrentUser();
  const points = await loyalty.balanceOf(user.address);
  const tier = await loyalty.tierOf(user.address);

  return { points, tier };
}

// Exibir no UI
async function showPointsCard() {
  const { points, tier } = await getMyPoints();

  document.getElementById('points-display').innerHTML = `
    <div class="points-card">
      <div class="tier-badge ${tier.toLowerCase()}">${tier}</div>
      <div class="points-value">${points.toLocaleString()}</div>
      <div class="points-label">pontos</div>
    </div>
  `;
}
```

## Passo 4: Resgatar Pontos

```javascript
// Trocar pontos por desconto
async function redeemPoints(amount) {
  const bzrValue = amount / 100; // 100 pontos = 1 BZR

  const confirmed = await sdk.ui.showConfirm({
    title: 'Resgatar Pontos',
    message: `Trocar ${amount} pontos por ${bzrValue} BZR de desconto?`
  });

  if (confirmed) {
    await loyalty.redeemPoints(amount);
    sdk.ui.success(`Desconto de ${bzrValue} BZR aplicado!`);
  }
}
```

## Passo 5: Sistema de Tiers

Os tiers são atualizados automaticamente:

| Tier | Pontos Acumulados | Benefícios |
|------|-------------------|------------|
| Bronze | 0 - 9.999 | 1x pontos |
| Silver | 10.000 - 49.999 | 1.5x pontos |
| Gold | 50.000 - 99.999 | 2x pontos |
| Platinum | 100.000+ | 3x pontos + frete grátis |

```javascript
// Aplicar multiplicador baseado no tier
function getPointsMultiplier(tier) {
  const multipliers = {
    'Bronze': 1,
    'Silver': 1.5,
    'Gold': 2,
    'Platinum': 3
  };
  return multipliers[tier] || 1;
}

async function rewardWithBonus(customer, purchaseAmount) {
  const tier = await loyalty.tierOf(customer);
  const multiplier = getPointsMultiplier(tier);
  const points = Math.floor(purchaseAmount * 100 * multiplier);

  await loyalty.issuePoints(customer, points, 'Compra + bônus tier');
}
```

## Exemplo Completo: Página de Fidelidade

```html
<!DOCTYPE html>
<html>
<head>
  <title>Programa de Fidelidade</title>
  <style>
    .loyalty-page {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui;
    }
    .points-card {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      margin-bottom: 20px;
    }
    .tier-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .tier-badge.bronze { background: #cd7f32; }
    .tier-badge.silver { background: #c0c0c0; color: #333; }
    .tier-badge.gold { background: #ffd700; color: #333; }
    .tier-badge.platinum { background: #e5e4e2; color: #333; }
    .points-value {
      font-size: 48px;
      font-weight: bold;
    }
    .action-buttons {
      display: grid;
      gap: 10px;
    }
    .action-btn {
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      cursor: pointer;
    }
    .redeem-btn { background: #10b981; color: white; }
    .history-btn { background: #f3f4f6; color: #374151; }
  </style>
</head>
<body>
  <div class="loyalty-page">
    <h1>🎁 Meus Pontos</h1>

    <div id="points-card" class="points-card">
      Carregando...
    </div>

    <div class="action-buttons">
      <button class="action-btn redeem-btn" onclick="redeemPoints()">
        Resgatar Pontos
      </button>
      <button class="action-btn history-btn" onclick="showHistory()">
        Ver Histórico
      </button>
    </div>
  </div>

  <script type="module">
    import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

    const sdk = new BazariSDK();
    let loyalty;

    async function init() {
      const contractAddress = await sdk.storage.get('loyaltyContract');
      loyalty = sdk.contracts.loyalty(contractAddress);

      await updatePointsCard();
    }

    async function updatePointsCard() {
      const user = await sdk.auth.getCurrentUser();
      const points = await loyalty.balanceOf(user.address);
      const tier = await loyalty.tierOf(user.address);

      document.getElementById('points-card').innerHTML = `
        <div class="tier-badge ${tier.toLowerCase()}">${tier}</div>
        <div class="points-value">${points.toLocaleString()}</div>
        <div class="points-label">pontos</div>
      `;
    }

    window.redeemPoints = async function() {
      const user = await sdk.auth.getCurrentUser();
      const points = await loyalty.balanceOf(user.address);

      if (points < 100) {
        sdk.ui.error('Mínimo de 100 pontos para resgate');
        return;
      }

      // Mostrar opções de resgate
      // ...
    };

    window.showHistory = async function() {
      // Navegar para histórico
      sdk.ui.navigate('/history');
    };

    init();
  </script>
</body>
</html>
```

## Próximos Passos

- [Integrar com checkout](./payment-integration.md)
- [Adicionar notificações](../sdk/ui.md)
- [Analytics de fidelidade](./monetization.md)
