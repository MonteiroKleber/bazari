# P1: Documentação e Tutoriais para Desenvolvedores

**Prioridade:** P1 (Alta)
**Status:** Pendente
**Esforço:** Médio
**Impacto:** Alto

---

## Objetivo

Criar materiais de onboarding rápido para atrair desenvolvedores:
- Tutoriais "Getting Started"
- Documentação do SDK
- Exemplos de casos de uso
- Guias de integração

---

## Estrutura de Documentação

```
/root/bazari/
├── docs/                           # Site de documentação
│   ├── index.md                    # Landing page
│   ├── getting-started/
│   │   ├── quick-start.md          # "Seu primeiro app em 10 min"
│   │   ├── installation.md         # Instalação do CLI
│   │   └── concepts.md             # Conceitos básicos
│   ├── sdk/
│   │   ├── overview.md             # Visão geral do SDK
│   │   ├── auth.md                 # API de autenticação
│   │   ├── wallet.md               # API de wallet
│   │   ├── storage.md              # API de storage
│   │   ├── ui.md                   # API de UI
│   │   ├── events.md               # API de eventos
│   │   └── contracts.md            # API de contratos
│   ├── cli/
│   │   ├── overview.md             # Comandos do CLI
│   │   ├── create.md               # bazari create
│   │   ├── dev.md                  # bazari dev
│   │   ├── build.md                # bazari build
│   │   ├── publish.md              # bazari publish
│   │   └── validate.md             # bazari validate
│   ├── guides/
│   │   ├── payment-integration.md  # "Como integrar pagamentos BZR"
│   │   ├── loyalty-program.md      # "Como criar programa de fidelidade"
│   │   ├── escrow-service.md       # "Como criar serviço de escrow"
│   │   ├── delivery-app.md         # "Como criar app de delivery"
│   │   └── monetization.md         # "Como monetizar seu app"
│   ├── reference/
│   │   ├── manifest.md             # Especificação do manifest
│   │   ├── permissions.md          # Lista de permissões
│   │   ├── api.md                  # API Reference
│   │   └── errors.md               # Códigos de erro
│   └── examples/
│       ├── todo-app.md             # App de lista de tarefas
│       ├── balance-checker.md      # Verificador de saldo
│       ├── loyalty-app.md          # App de fidelidade
│       └── marketplace.md          # Mini marketplace
└── apps/web/src/pages/docs/        # Página de docs no portal
```

---

## Implementação

### Task 1: Landing Page de Documentação

**Arquivo:** `docs/index.md`

```markdown
# Bazari Developer Docs

Bem-vindo à documentação para desenvolvedores do Bazari!

## Por que desenvolver para Bazari?

- **Acesso a milhares de usuários** - Base ativa de compradores e vendedores
- **Monetização simples** - Receba em BZR automaticamente
- **SDK completo** - Auth, Wallet, Storage, UI prontos para usar
- **Contratos inteligentes** - Templates de fidelidade, escrow, divisão de receita
- **Revenue share justo** - 70-85% para você

## Quick Links

- [Seu primeiro app em 10 minutos](./getting-started/quick-start.md)
- [Instalação do CLI](./getting-started/installation.md)
- [Referência do SDK](./sdk/overview.md)
- [Exemplos de apps](./examples/)

## Casos de Uso Populares

| Caso de Uso | Tempo | Dificuldade |
|-------------|-------|-------------|
| App de saldo | 10 min | Fácil |
| Programa de fidelidade | 2h | Médio |
| App de delivery | 1 dia | Avançado |
| Marketplace | 2 dias | Avançado |

## Suporte

- [Discord da Comunidade](#)
- [GitHub Issues](https://github.com/bazari/bazari/issues)
- [FAQ](./faq.md)
```

---

### Task 2: Tutorial "Seu Primeiro App em 10 Minutos"

**Arquivo:** `docs/getting-started/quick-start.md`

```markdown
# Seu Primeiro App Bazari em 10 Minutos

Vamos criar um app simples que mostra o saldo do usuário.

## Pré-requisitos

- Node.js 18+
- Uma conta Bazari com wallet

## Passo 1: Instalar o CLI (2 min)

\`\`\`bash
npm install -g @bazari/cli
\`\`\`

Verifique a instalação:

\`\`\`bash
bazari --version
# @bazari/cli v0.1.0
\`\`\`

## Passo 2: Fazer Login (1 min)

\`\`\`bash
bazari login
\`\`\`

Isso abrirá o navegador para autenticar com sua wallet Bazari.

## Passo 3: Criar o Projeto (1 min)

\`\`\`bash
bazari create meu-primeiro-app
\`\`\`

Responda às perguntas:
- **Nome:** Meu Primeiro App
- **Descrição:** App de teste
- **Categoria:** Tools

\`\`\`bash
cd meu-primeiro-app
\`\`\`

## Passo 4: Entender a Estrutura (1 min)

\`\`\`
meu-primeiro-app/
├── bazari.manifest.json   # Configuração do app
├── package.json           # Dependências
├── public/
│   └── index.html         # Seu app (HTML + JS)
└── README.md
\`\`\`

## Passo 5: Modificar o App (3 min)

Abra `public/index.html` e substitua o conteúdo:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Saldo</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 400px;
      margin: 40px auto;
      padding: 20px;
      text-align: center;
    }
    .balance {
      font-size: 48px;
      font-weight: bold;
      color: #10b981;
      margin: 20px 0;
    }
    .token {
      color: #6b7280;
      font-size: 18px;
    }
    .error {
      color: #ef4444;
      padding: 20px;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
    button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <h1>💰 Meu Saldo</h1>

  <div id="content">
    <p>Carregando...</p>
  </div>

  <script type="module">
    import { BazariSDK } from 'https://unpkg.com/@bazari/app-sdk@latest/dist/index.mjs';

    const sdk = new BazariSDK({ debug: true });
    const content = document.getElementById('content');

    async function loadBalance() {
      try {
        // Verificar se está no Bazari
        if (!sdk.isInBazari()) {
          content.innerHTML = \`
            <p class="error">
              Este app deve rodar dentro do Bazari.<br>
              <a href="https://bazari.libervia.xyz/app/store">Ir para App Store</a>
            </p>
          \`;
          return;
        }

        // Obter usuário
        const user = await sdk.auth.getCurrentUser();

        // Obter saldo
        const balance = await sdk.wallet.getBalance();

        content.innerHTML = \`
          <p>Olá, <strong>\${user.displayName}</strong>!</p>
          <div class="balance">\${balance.formatted.bzr}</div>
          <p class="token">BZR</p>
          <button onclick="location.reload()">Atualizar</button>
        \`;

      } catch (error) {
        content.innerHTML = \`
          <p class="error">Erro: \${error.message}</p>
          <button onclick="location.reload()">Tentar novamente</button>
        \`;
      }
    }

    loadBalance();
  </script>
</body>
</html>
\`\`\`

## Passo 6: Testar Localmente (1 min)

\`\`\`bash
bazari dev
\`\`\`

Isso abre `http://localhost:3000` com um simulador do ambiente Bazari.

> **Nota:** Algumas funcionalidades só funcionam dentro do Bazari real.

## Passo 7: Publicar (1 min)

\`\`\`bash
# Validar antes
bazari validate

# Build
bazari build

# Publicar
bazari publish
\`\`\`

Pronto! Seu app foi enviado para review.

## Próximos Passos

- [Adicionar mais funcionalidades](../sdk/overview.md)
- [Integrar pagamentos](../guides/payment-integration.md)
- [Monetizar seu app](../guides/monetization.md)

---

**Tempo total:** ~10 minutos
\`\`\`

---

### Task 3: Tutorial "Como Integrar Pagamentos BZR"

**Arquivo:** `docs/guides/payment-integration.md`

```markdown
# Como Integrar Pagamentos BZR

Aprenda a receber pagamentos em BZR no seu app.

## Tipos de Pagamento

1. **Transferência direta** - Usuário envia BZR para você
2. **In-App Purchase** - Usuário compra produto dentro do app
3. **Escrow** - Pagamento seguro com liberação condicional

## 1. Transferência Direta

O jeito mais simples de receber pagamentos:

\`\`\`javascript
import { BazariSDK } from '@bazari/app-sdk';

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
\`\`\`

### UX Recomendada

\`\`\`html
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
\`\`\`

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

\`\`\`javascript
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
\`\`\`

## 3. Escrow (Pagamento Seguro)

Para transações P2P ou serviços:

\`\`\`javascript
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
\`\`\`

### Fluxo de Disputa

\`\`\`javascript
// Comprador ou vendedor podem abrir disputa
await sdk.contracts.escrow(escrow.id).openDispute(
  'Produto não corresponde à descrição'
);

// Mediador Bazari resolve e libera para uma das partes
\`\`\`

## Boas Práticas

### 1. Sempre mostrar confirmação

\`\`\`javascript
// O SDK abre modal nativo, mas você pode adicionar preview
async function confirmPurchase(product) {
  const confirmed = await sdk.ui.showConfirm({
    title: 'Confirmar Compra',
    message: \`Você está comprando "\${product.name}" por \${product.price} BZR\`,
    confirmText: 'Comprar',
    cancelText: 'Cancelar'
  });

  if (confirmed) {
    await sdk.iap.purchase(product.id);
  }
}
\`\`\`

### 2. Tratar erros de saldo insuficiente

\`\`\`javascript
try {
  await sdk.wallet.requestTransfer({ ... });
} catch (error) {
  if (error.code === 'INSUFFICIENT_BALANCE') {
    sdk.ui.error('Saldo insuficiente. Adicione mais BZR à sua wallet.');
  } else {
    sdk.ui.error('Erro no pagamento. Tente novamente.');
  }
}
\`\`\`

### 3. Persistir estado de compras

\`\`\`javascript
// Salvar compras no storage do app
await sdk.storage.set('purchases', JSON.stringify(userPurchases));

// Recuperar ao iniciar
const saved = await sdk.storage.get('purchases');
userPurchases = saved ? JSON.parse(saved) : [];
\`\`\`

## Revenue Share

Você recebe automaticamente:

| Tier | Instalações | Sua % |
|------|-------------|-------|
| Starter | 0 - 1.000 | 70% |
| Growth | 1.001 - 10.000 | 75% |
| Scale | 10.001 - 100.000 | 80% |
| Enterprise | 100.001+ | 85% |

Acompanhe sua receita em `/app/developer/revenue`.
\`\`\`

---

### Task 4: Tutorial "Como Criar Programa de Fidelidade"

**Arquivo:** `docs/guides/loyalty-program.md`

```markdown
# Como Criar um Programa de Fidelidade

Crie um programa de pontos para fidelizar seus clientes usando smart contracts ink!.

## Visão Geral

O contrato de Fidelidade permite:
- Emitir pontos para clientes
- Trocar pontos por descontos/produtos
- Transferir pontos entre usuários
- Níveis de fidelidade automáticos

## Passo 1: Deploy do Contrato

\`\`\`javascript
import { BazariSDK } from '@bazari/app-sdk';

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
\`\`\`

## Passo 2: Emitir Pontos

\`\`\`javascript
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
    \`Compra de \${purchaseAmount} BZR\`
  );

  sdk.ui.success(\`+\${points} pontos adicionados!\`);
}
\`\`\`

## Passo 3: Consultar Saldo

\`\`\`javascript
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

  document.getElementById('points-display').innerHTML = \`
    <div class="points-card">
      <div class="tier-badge \${tier.toLowerCase()}">\${tier}</div>
      <div class="points-value">\${points.toLocaleString()}</div>
      <div class="points-label">pontos</div>
    </div>
  \`;
}
\`\`\`

## Passo 4: Resgatar Pontos

\`\`\`javascript
// Trocar pontos por desconto
async function redeemPoints(amount) {
  const bzrValue = amount / 100; // 100 pontos = 1 BZR

  const confirmed = await sdk.ui.showConfirm({
    title: 'Resgatar Pontos',
    message: \`Trocar \${amount} pontos por \${bzrValue} BZR de desconto?\`
  });

  if (confirmed) {
    await loyalty.redeemPoints(amount);
    sdk.ui.success(\`Desconto de \${bzrValue} BZR aplicado!\`);
  }
}
\`\`\`

## Passo 5: Sistema de Tiers

Os tiers são atualizados automaticamente:

| Tier | Pontos Acumulados | Benefícios |
|------|-------------------|------------|
| Bronze | 0 - 9.999 | 1x pontos |
| Silver | 10.000 - 49.999 | 1.5x pontos |
| Gold | 50.000 - 99.999 | 2x pontos |
| Platinum | 100.000+ | 3x pontos + frete grátis |

\`\`\`javascript
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
\`\`\`

## Exemplo Completo: Página de Fidelidade

\`\`\`html
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
    import { BazariSDK } from '@bazari/app-sdk';

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

      document.getElementById('points-card').innerHTML = \`
        <div class="tier-badge \${tier.toLowerCase()}">\${tier}</div>
        <div class="points-value">\${points.toLocaleString()}</div>
        <div class="points-label">pontos</div>
      \`;
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
\`\`\`

## Próximos Passos

- [Integrar com checkout](./payment-integration.md)
- [Adicionar notificações](../sdk/ui.md)
- [Analytics de fidelidade](./monetization.md)
\`\`\`

---

### Task 5: Página de Documentação no Portal

**Arquivo:** `apps/web/src/pages/developer/DocsPage.tsx`

```typescript
import { Link } from 'react-router-dom';
import { Book, Terminal, Code, Rocket, DollarSign, Gift } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DOCS_SECTIONS = [
  {
    title: 'Getting Started',
    description: 'Comece a desenvolver para Bazari',
    icon: Rocket,
    links: [
      { title: 'Seu primeiro app em 10 min', href: '/docs/quick-start' },
      { title: 'Instalação do CLI', href: '/docs/installation' },
      { title: 'Conceitos básicos', href: '/docs/concepts' },
    ],
  },
  {
    title: 'SDK Reference',
    description: 'API completa do @bazari/app-sdk',
    icon: Code,
    links: [
      { title: 'Autenticação', href: '/docs/sdk/auth' },
      { title: 'Wallet', href: '/docs/sdk/wallet' },
      { title: 'Storage', href: '/docs/sdk/storage' },
      { title: 'UI', href: '/docs/sdk/ui' },
      { title: 'Contratos', href: '/docs/sdk/contracts' },
    ],
  },
  {
    title: 'CLI',
    description: 'Comandos do @bazari/cli',
    icon: Terminal,
    links: [
      { title: 'bazari create', href: '/docs/cli/create' },
      { title: 'bazari dev', href: '/docs/cli/dev' },
      { title: 'bazari build', href: '/docs/cli/build' },
      { title: 'bazari publish', href: '/docs/cli/publish' },
    ],
  },
  {
    title: 'Guias',
    description: 'Tutoriais passo a passo',
    icon: Book,
    links: [
      { title: 'Integrar pagamentos BZR', href: '/docs/guides/payments' },
      { title: 'Criar programa de fidelidade', href: '/docs/guides/loyalty' },
      { title: 'Criar serviço de escrow', href: '/docs/guides/escrow' },
      { title: 'Monetizar seu app', href: '/docs/guides/monetization' },
    ],
  },
  {
    title: 'Monetização',
    description: 'Ganhe dinheiro com seus apps',
    icon: DollarSign,
    links: [
      { title: 'Modelos de monetização', href: '/docs/monetization/models' },
      { title: 'In-App Purchases', href: '/docs/monetization/iap' },
      { title: 'Revenue Share', href: '/docs/monetization/revenue-share' },
    ],
  },
  {
    title: 'Exemplos',
    description: 'Apps de exemplo para estudar',
    icon: Gift,
    links: [
      { title: 'App de saldo', href: '/docs/examples/balance' },
      { title: 'Lista de tarefas', href: '/docs/examples/todo' },
      { title: 'App de fidelidade', href: '/docs/examples/loyalty' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Documentação</h1>
        <p className="text-muted-foreground">
          Tudo que você precisa para desenvolver apps para o Bazari
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DOCS_SECTIONS.map((section) => (
          <Card key={section.title} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-none">
        <CardContent className="py-8 text-center">
          <h2 className="text-xl font-bold mb-2">Precisa de ajuda?</h2>
          <p className="text-muted-foreground mb-4">
            Entre na nossa comunidade de desenvolvedores
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://discord.gg/bazari"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Discord
            </a>
            <a
              href="https://github.com/bazari/bazari"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90"
            >
              GitHub
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Task 6: Adicionar Rota e Navegação

**Arquivo:** Modificar `apps/web/src/App.tsx`

```typescript
// Adicionar import
import DocsPage from './pages/developer/DocsPage';

// Adicionar rota
<Route path="developer/docs" element={<DocsPage />} />
<Route path="developer/docs/*" element={<DocsPage />} />
```

**Arquivo:** Modificar `apps/web/src/pages/developer/DevPortalDashboardPage.tsx`

Atualizar Quick Links:

```typescript
{/* Quick Links */}
<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
    <Link to="/app/developer/docs">
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-2">📚 Documentação SDK</h3>
        <p className="text-sm text-muted-foreground">
          Aprenda a usar o @bazari/app-sdk
        </p>
      </CardContent>
    </Link>
  </Card>
  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
    <Link to="/app/developer/docs/guides">
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-2">🚀 Tutoriais</h3>
        <p className="text-sm text-muted-foreground">
          Guias passo a passo
        </p>
      </CardContent>
    </Link>
  </Card>
  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
    <a href="https://discord.gg/bazari" target="_blank" rel="noopener noreferrer">
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-2">💬 Suporte</h3>
        <p className="text-sm text-muted-foreground">
          Ajuda e comunidade de devs
        </p>
      </CardContent>
    </a>
  </Card>
</div>
```

---

## Critérios de Aceite

- [ ] Landing page de docs criada
- [ ] Tutorial "10 minutos" funcional
- [ ] Tutorial de pagamentos funcional
- [ ] Tutorial de fidelidade funcional
- [ ] Referência do SDK completa
- [ ] Página de docs no portal
- [ ] Links de navegação funcionando
- [ ] Exemplos de código testados

---

**Versão:** 1.0.0
**Data:** 2024-12-07
