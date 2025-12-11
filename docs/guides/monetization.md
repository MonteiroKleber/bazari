# Como Monetizar seu App

Aprenda diferentes estratégias para ganhar dinheiro com seus apps no Bazari.

## Modelos de Monetização

### 1. App Gratuito

Ideal para apps de utilidade ou para ganhar base de usuários.

```json
{
  "monetizationType": "free"
}
```

**Quando usar:**
- Apps de utilidade simples
- Versões demo
- Apps de marketing/branding
- Ferramentas da comunidade

### 2. App Pago

Usuário paga uma vez para instalar.

```json
{
  "monetizationType": "paid",
  "price": 10
}
```

**Quando usar:**
- Apps completos sem necessidade de updates frequentes
- Ferramentas profissionais
- Games completos

**Exemplo de precificação:**

| Tipo | Faixa de Preço |
|------|----------------|
| Utilitário simples | 1-5 BZR |
| Ferramenta completa | 10-25 BZR |
| App profissional | 50-100 BZR |
| Suite empresarial | 100+ BZR |

### 3. Freemium (Recomendado)

App gratuito com compras internas.

```json
{
  "monetizationType": "freemium"
}
```

**Quando usar:**
- Games com economia interna
- Apps com recursos premium
- Serviços com limites

## In-App Purchases (IAP)

### Configurar Produtos

No Developer Portal, configure seus produtos:

```typescript
// Tipos de produto
type ProductType =
  | 'NON_CONSUMABLE'  // Compra única (premium, remove ads)
  | 'CONSUMABLE'      // Pode comprar múltiplas vezes (moedas, créditos)
  | 'SUBSCRIPTION';   // Recorrente (em breve)

// Exemplo de catálogo
const products = [
  {
    id: 'premium_upgrade',
    name: 'Upgrade Premium',
    price: 25,
    type: 'NON_CONSUMABLE',
    description: 'Desbloqueie todas as funcionalidades'
  },
  {
    id: 'coins_100',
    name: '100 Moedas',
    price: 5,
    type: 'CONSUMABLE',
    description: 'Pack de 100 moedas'
  },
  {
    id: 'coins_500',
    name: '500 Moedas + 50 Bônus',
    price: 20,
    type: 'CONSUMABLE',
    description: 'Pack de 550 moedas (10% bônus)'
  }
];
```

### Implementar Compras

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

// Verificar compras anteriores
async function checkPurchases() {
  const hasPremium = await sdk.iap.hasPurchased('premium_upgrade');

  if (hasPremium) {
    enablePremiumFeatures();
  } else {
    showPremiumOffer();
  }
}

// Realizar compra
async function purchase(productId) {
  try {
    const result = await sdk.iap.purchase(productId);

    if (result.success) {
      switch (productId) {
        case 'premium_upgrade':
          enablePremiumFeatures();
          break;
        case 'coins_100':
          addCoins(100);
          break;
        case 'coins_500':
          addCoins(550); // Inclui bônus
          break;
      }

      sdk.ui.success('Compra realizada com sucesso!');
    }
  } catch (error) {
    if (error.code === 'USER_CANCELLED') {
      // Usuário cancelou - não mostrar erro
    } else if (error.code === 'INSUFFICIENT_BALANCE') {
      sdk.ui.error('Saldo insuficiente');
    } else {
      sdk.ui.error('Erro na compra. Tente novamente.');
    }
  }
}

// Restaurar compras
async function restorePurchases() {
  const purchases = await sdk.iap.getPurchases();

  for (const purchase of purchases) {
    if (purchase.productId === 'premium_upgrade') {
      enablePremiumFeatures();
    }
  }
}
```

### UI de Loja

```html
<div class="store">
  <h2>Loja</h2>

  <div class="product-card premium">
    <div class="badge">Mais Popular</div>
    <h3>Premium</h3>
    <p>Todas as funcionalidades desbloqueadas</p>
    <ul>
      <li>✓ Sem anúncios</li>
      <li>✓ Temas exclusivos</li>
      <li>✓ Backup na nuvem</li>
      <li>✓ Suporte prioritário</li>
    </ul>
    <button onclick="purchase('premium_upgrade')">
      25 BZR - Comprar
    </button>
  </div>

  <div class="coins-section">
    <h3>Pacotes de Moedas</h3>
    <div class="coin-packs">
      <div class="coin-pack" onclick="purchase('coins_100')">
        <span>💰 100</span>
        <span class="price">5 BZR</span>
      </div>
      <div class="coin-pack featured" onclick="purchase('coins_500')">
        <span class="bonus">+10%</span>
        <span>💰 550</span>
        <span class="price">20 BZR</span>
      </div>
    </div>
  </div>
</div>
```

## Revenue Share

Você recebe uma porcentagem de cada venda:

| Tier | Instalações | Sua % | Bazari % |
|------|-------------|-------|----------|
| Starter | 0 - 1.000 | 70% | 30% |
| Growth | 1.001 - 10.000 | 75% | 25% |
| Scale | 10.001 - 100.000 | 80% | 20% |
| Enterprise | 100.001+ | 85% | 15% |

### Exemplo de Cálculo

Se seu app Premium custa 25 BZR e você tem 5.000 instalações (tier Growth):

- Cada venda: 25 BZR × 75% = **18.75 BZR para você**
- Bazari: 25 BZR × 25% = 6.25 BZR

## Dashboard de Receita

Acesse `/app/developer/revenue` para ver:

- Receita total
- Receita por período
- Vendas por produto
- Conversão (installs → purchases)
- Projeções

## Dicas de Monetização

### 1. Ofereça valor real no gratuito
Usuários devem conseguir usar o app sem pagar. Premium deve ser "nice to have", não "need to have".

### 2. Preços psicológicos
- 9 BZR em vez de 10 BZR
- Pacotes com bônus mostram valor

### 3. Timing certo
Mostre ofertas de upgrade quando o usuário:
- Encontra uma limitação
- Completa uma ação importante
- Usa o app por X dias

### 4. Evite dark patterns
Não engane usuários. Seja transparente sobre o que é pago.

## Próximos Passos

- [Configurar Analytics](../sdk/events.md)
- [A/B Testing de preços](./ab-testing.md)
- [Marketing do seu app](./marketing.md)
