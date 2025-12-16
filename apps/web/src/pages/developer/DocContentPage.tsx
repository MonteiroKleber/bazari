import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Embedded documentation content
const DOCS_CONTENT: Record<string, { title: string; content: string }> = {
  'quick-start': {
    title: 'Seu Primeiro App em 10 Minutos',
    content: `
## Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Conta no Bazari (para publicar)

## 1. Instalar o CLI

\`\`\`bash
npm install -g @bazari.libervia.xyz/cli
\`\`\`

## 2. Criar um novo app

\`\`\`bash
bazari create meu-app
cd meu-app
\`\`\`

O CLI vai criar a estrutura:

\`\`\`
meu-app/
├── src/
│   └── index.tsx      # Componente principal
├── bazari.manifest.json
├── package.json
└── tsconfig.json
\`\`\`

## 3. Entender o Manifest

O arquivo \`bazari.manifest.json\` define seu app:

\`\`\`json
{
  "appId": "com.example.meu-app",
  "name": "Meu App",
  "slug": "meu-app",
  "version": "1.0.0",
  "description": "Descrição do meu app",
  "category": "tools",
  "permissions": [
    { "id": "auth:read", "reason": "Para exibir seu perfil" },
    { "id": "wallet:read", "reason": "Para exibir seu saldo" },
    { "id": "ui:toast", "reason": "Para exibir notificações" }
  ],
  "sdkVersion": "0.2.0",
  "entryPoint": "dist/index.html",
  "icon": "Package",
  "color": "from-blue-500 to-purple-600"
}
\`\`\`

## 4. Desenvolver

\`\`\`bash
bazari dev
\`\`\`

Isso abre um ambiente de desenvolvimento com hot-reload.

## 5. Usar o SDK

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

// Obter usuário atual
const user = await sdk.auth.getCurrentUser();

// Obter saldo
const balance = await sdk.wallet.getBalance();
\`\`\`

## 6. Publicar

\`\`\`bash
bazari build
bazari publish
\`\`\`

Seu app estará disponível na App Store do Bazari!

## Próximos Passos

- [Conceitos Básicos](/app/developer/docs/concepts)
- [API de Wallet](/app/developer/docs/sdk/wallet)
- [Guia de Monetização](/app/developer/docs/guides/monetization)
`,
  },
  installation: {
    title: 'Instalação do CLI',
    content: `
## Requisitos do Sistema

- **Node.js**: versão 18 ou superior
- **npm** ou **pnpm**: gerenciador de pacotes
- **Git**: para controle de versão

## Instalação Global

\`\`\`bash
npm install -g @bazari.libervia.xyz/cli
\`\`\`

Ou com pnpm:

\`\`\`bash
pnpm add -g @bazari.libervia.xyz/cli
\`\`\`

## Verificar Instalação

\`\`\`bash
bazari --version
# @bazari.libervia.xyz/cli v0.2.25
\`\`\`

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| \`bazari login\` | Autentica com sua conta Bazari |
| \`bazari logout\` | Desloga da conta |
| \`bazari whoami\` | Mostra o usuário logado |
| \`bazari create <nome>\` | Cria um novo projeto |
| \`bazari dev\` | Inicia servidor de desenvolvimento |
| \`bazari build\` | Compila para produção |
| \`bazari validate\` | Valida o manifest e estrutura |
| \`bazari publish\` | Publica na App Store ou gera API Key |
| \`bazari keys\` | Gerencia API Keys para SDK externo |
| \`bazari studio\` | Abre o Bazari Studio (IDE visual) |

## Autenticação

Para publicar apps, você precisa autenticar:

\`\`\`bash
bazari login
\`\`\`

Isso abrirá o navegador para você fazer login no Bazari.

## Targets de Publicação

O CLI suporta dois targets:

- **appstore** (padrão): Apps que rodam dentro do Bazari
- **external**: Gera API Key para usar SDK em sites externos

\`\`\`bash
# Publicar na App Store
bazari publish

# Publicar para SDK externo
bazari publish --target external --origin https://meusite.com

# Publicar em ambos
bazari publish --target both --origin https://meusite.com
\`\`\`

## Próximos Passos

- [Quick Start](/app/developer/docs/quick-start)
- [Conceitos Básicos](/app/developer/docs/concepts)
- [Publicar seu app](/app/developer/docs/cli/publish)
- [Gerenciar API Keys](/app/developer/docs/cli/keys)
`,
  },
  concepts: {
    title: 'Conceitos Básicos',
    content: `
## Arquitetura

Apps Bazari são micro-frontends React que rodam dentro da plataforma ou em sites externos via SDK.

### Manifest

O \`bazari.manifest.json\` define metadados e permissões:

\`\`\`json
{
  "appId": "com.company.app-name",
  "name": "Nome do App",
  "slug": "app-name",
  "version": "1.0.0",
  "description": "Descrição do app",
  "category": "tools",
  "permissions": [
    { "id": "wallet:read" },
    { "id": "wallet:transfer" }
  ],
  "sdkVersion": "0.1.0",
  "monetizationType": "free",
  "distribution": {
    "appStore": true,
    "external": false
  }
}
\`\`\`

### Campo Distribution

O campo \`distribution\` define como seu app será distribuído:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| \`appStore\` | boolean | Publicar na App Store Bazari (iframe) |
| \`external\` | boolean | Gerar API Key para SDK externo |
| \`allowedOrigins\` | string[] | Domínios permitidos para SDK externo |

**Cenários de uso:**

| appStore | external | Uso |
|----------|----------|-----|
| true | false | App tradicional no Bazari (padrão) |
| false | true | Integração em site externo |
| true | true | Ambos os modelos |

### Permissões

| Permissão | Descrição |
|-----------|-----------|
| \`auth:read\` | Ler perfil do usuário |
| \`wallet:read\` | Ler saldo e histórico |
| \`wallet:transfer\` | Solicitar transferências |
| \`storage:read\` | Ler dados salvos |
| \`storage:write\` | Salvar dados |
| \`ui:toast\` | Exibir notificações |
| \`contracts:read\` | Consultar contratos |
| \`contracts:write\` | Executar contratos |

### SDK

O SDK fornece acesso às APIs da plataforma:

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

// Auth
const user = await sdk.auth.getCurrentUser();

// Wallet
const balance = await sdk.wallet.getBalance();

// Storage
await sdk.storage.set('key', value);
const data = await sdk.storage.get('key');

// UI
sdk.ui.toast('Mensagem de sucesso');
\`\`\`

## Ciclo de Vida

1. **Desenvolvimento**: \`bazari dev\`
2. **Build**: \`bazari build\`
3. **Publicação**: \`bazari publish\` (App Store ou SDK externo)
4. **Revisão**: Equipe Bazari revisa
5. **Aprovação**: App disponível na store ou API Key ativa

## Próximos Passos

- [SDK Overview](/app/developer/docs/sdk/overview)
- [API de Wallet](/app/developer/docs/sdk/wallet)
- [Publicar seu app](/app/developer/docs/cli/publish)
`,
  },
  'sdk/overview': {
    title: 'SDK - Visão Geral',
    content: `
## @bazari.libervia.xyz/app-sdk

SDK oficial para desenvolver apps que integram com a plataforma Bazari.

## Modos de Uso

O SDK suporta dois modos de operação:

| Modo | Descrição | Caso de Uso |
|------|-----------|-------------|
| **App Store** | App roda em iframe dentro do Bazari | Apps nativos da plataforma |
| **External** | App roda em site externo | Integração em e-commerce, sites, etc |

## Instalação

\`\`\`bash
npm install @bazari.libervia.xyz/app-sdk
\`\`\`

## Inicialização

### Modo App Store (iframe)

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({
  apiKey: import.meta.env.VITE_BAZARI_API_KEY,
  debug: import.meta.env.DEV,
});
\`\`\`

### Modo Externo (SDK Externo)

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({
  apiKey: 'baz_sdk_abc123...',
  secretKey: 'sk_secret_xyz789...', // Server-side apenas!
  mode: 'external',
});
\`\`\`

**Importante:** O \`secretKey\` deve ser usado apenas no servidor. Nunca exponha no frontend!

## API Key e Secret Key

| Credencial | Onde usar | Propósito |
|------------|-----------|-----------|
| API Key | Frontend + Backend | Identifica o app |
| Secret Key | Backend apenas | Autentica requisições |

Gere credenciais via CLI:

\`\`\`bash
bazari publish --target external --origin https://meusite.com
\`\`\`

## Módulos Disponíveis

### Auth
Autenticação e informações do usuário.

\`\`\`typescript
const user = await sdk.auth.getCurrentUser();
// { address, username, avatar }
\`\`\`

### Wallet
Operações financeiras com BZR.

\`\`\`typescript
const balance = await sdk.wallet.getBalance();
await sdk.wallet.transfer(to, amount);
\`\`\`

### Storage
Armazenamento persistente por app.

\`\`\`typescript
await sdk.storage.set('config', { theme: 'dark' });
const config = await sdk.storage.get('config');
\`\`\`

### UI
Componentes de interface.

\`\`\`typescript
sdk.ui.toast('Sucesso!');
sdk.ui.confirm('Tem certeza?');
\`\`\`

### Contracts
Interação com smart contracts ink!

\`\`\`typescript
const loyalty = sdk.contracts.loyalty(address);
await loyalty.issuePoints(user, 100, 'Compra');
\`\`\`

## Exemplo Completo

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

export default function MyApp() {
  const sdk = new BazariSDK();
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    sdk.wallet.getBalance().then(setBalance);
  }, []);

  return (
    <div>
      <h1>Saldo: {balance} BZR</h1>
    </div>
  );
}
\`\`\`

## Próximos Passos

- [Auth API](/app/developer/docs/sdk/auth)
- [Wallet API](/app/developer/docs/sdk/wallet)
- [Storage API](/app/developer/docs/sdk/storage)
- [Contracts API](/app/developer/docs/sdk/contracts)
`,
  },
  'sdk/auth': {
    title: 'SDK - Auth API',
    content: `
## Autenticação

API para obter informações do usuário autenticado.

## Permissões

- \`auth:read\` - Para obter dados do perfil do usuário

**Nota:** Esta permissão é concedida automaticamente, não requer aprovação explícita.

## Métodos

### getCurrentUser()

Retorna informações do usuário logado.

\`\`\`typescript
const user = await sdk.auth.getCurrentUser();
\`\`\`

**Retorno:**

\`\`\`typescript
interface User {
  address: string;      // Endereço blockchain
  username?: string;    // Nome de usuário
  avatar?: string;      // URL do avatar
  displayName?: string; // Nome de exibição
}
\`\`\`

### isAuthenticated()

Verifica se há usuário autenticado.

\`\`\`typescript
const isAuth = await sdk.auth.isAuthenticated();
// true | false
\`\`\`

### onAuthChange()

Escuta mudanças de autenticação.

\`\`\`typescript
sdk.auth.onAuthChange((user) => {
  if (user) {
    console.log('Logado:', user.address);
  } else {
    console.log('Deslogado');
  }
});
\`\`\`

## Exemplo

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

export default function UserProfile() {
  const sdk = new BazariSDK();
  const [user, setUser] = useState(null);

  useEffect(() => {
    sdk.auth.getCurrentUser().then(setUser);
  }, []);

  if (!user) return <p>Carregando...</p>;

  return (
    <div>
      <img src={user.avatar} alt={user.username} />
      <h2>{user.displayName || user.username}</h2>
      <code>{user.address}</code>
    </div>
  );
}
\`\`\`
`,
  },
  'sdk/wallet': {
    title: 'SDK - Wallet API',
    content: `
## Wallet

API para operações financeiras com BZR token.

## Permissões

- \`wallet:read\` - Para consultar saldo e histórico
- \`wallet:transfer\` - Para solicitar transferências

## Métodos

### getBalance()

Retorna saldo em BZR do usuário.

\`\`\`typescript
const balance = await sdk.wallet.getBalance();
// "150.5"
\`\`\`

### transfer()

Envia BZR para outro endereço.

\`\`\`typescript
await sdk.wallet.transfer(
  to: string,      // Endereço destino
  amount: string,  // Quantidade em BZR
  memo?: string    // Mensagem opcional
);
\`\`\`

**Exemplo:**

\`\`\`typescript
await sdk.wallet.transfer(
  '0x1234...abcd',
  '10.5',
  'Pagamento serviço'
);
\`\`\`

### requestPayment()

Solicita pagamento ao usuário (modal nativo).

\`\`\`typescript
const result = await sdk.wallet.requestPayment({
  to: string,
  amount: string,
  description: string,
  metadata?: object
});
\`\`\`

**Retorno:**

\`\`\`typescript
interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
\`\`\`

### getHistory()

Retorna histórico de transações.

\`\`\`typescript
const history = await sdk.wallet.getHistory(limit?: number);
\`\`\`

## Exemplo Completo

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

export default function PaymentButton({ productId, price }) {
  const sdk = new BazariSDK();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const result = await sdk.wallet.requestPayment({
        to: '0xLOJA...',
        amount: price,
        description: 'Compra produto #' + productId,
        metadata: { productId }
      });

      if (result.success) {
        sdk.ui.success('Pagamento confirmado!');
      }
    } catch (err) {
      sdk.ui.error('Erro no pagamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handlePay} disabled={loading}>
      {loading ? 'Processando...' : \`Pagar \${price} BZR\`}
    </button>
  );
}
\`\`\`
`,
  },
  'sdk/storage': {
    title: 'SDK - Storage API',
    content: `
## Storage

API para armazenamento persistente de dados.

Cada app tem seu próprio namespace isolado.

## Permissões

- \`storage:read\` - Para ler dados
- \`storage:write\` - Para escrever dados

## Métodos

### set()

Salva um valor.

\`\`\`typescript
await sdk.storage.set(key: string, value: any);
\`\`\`

### get()

Recupera um valor.

\`\`\`typescript
const value = await sdk.storage.get<T>(key: string);
\`\`\`

### remove()

Remove um valor.

\`\`\`typescript
await sdk.storage.remove(key: string);
\`\`\`

### keys()

Lista todas as chaves.

\`\`\`typescript
const keys = await sdk.storage.keys();
// ["config", "favorites", "history"]
\`\`\`

### clear()

Remove todos os dados do app.

\`\`\`typescript
await sdk.storage.clear();
\`\`\`

## Exemplo

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

// Salvar configurações
await sdk.storage.set('config', {
  theme: 'dark',
  notifications: true
});

// Recuperar
const config = await sdk.storage.get('config');

// Salvar array
await sdk.storage.set('favorites', ['item1', 'item2']);

// Atualizar array
const favorites = await sdk.storage.get('favorites') || [];
favorites.push('item3');
await sdk.storage.set('favorites', favorites);
\`\`\`

## Limites

- Máximo 5MB por app
- Chaves: máximo 256 caracteres
- Valores: qualquer JSON serializável
`,
  },
  'sdk/ui': {
    title: 'SDK - UI API',
    content: `
## UI

API para interações de interface com o usuário.

## Permissões

- \`ui:toast\` - Para exibir notificações (toast, success, error)
- \`ui:modal\` - Para exibir modais (confirm, prompt)

## Métodos

### toast()

Exibe notificação temporária.

\`\`\`typescript
sdk.ui.toast(message: string);
\`\`\`

### success()

Toast de sucesso (verde).

\`\`\`typescript
sdk.ui.success('Operação concluída!');
\`\`\`

### error()

Toast de erro (vermelho).

\`\`\`typescript
sdk.ui.error('Algo deu errado');
\`\`\`

### confirm()

Modal de confirmação.

\`\`\`typescript
const confirmed = await sdk.ui.confirm(
  message: string,
  options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
  }
);
// true | false
\`\`\`

### prompt()

Modal com input de texto.

\`\`\`typescript
const value = await sdk.ui.prompt(
  message: string,
  options?: {
    title?: string;
    placeholder?: string;
    defaultValue?: string;
  }
);
// string | null
\`\`\`

## Exemplo

\`\`\`typescript
async function deleteItem(id: string) {
  const confirmed = await sdk.ui.confirm(
    'Tem certeza que deseja excluir?',
    {
      title: 'Confirmar exclusão',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    }
  );

  if (confirmed) {
    await api.delete(id);
    sdk.ui.success('Item excluído');
  }
}

async function renameItem(id: string, currentName: string) {
  const newName = await sdk.ui.prompt(
    'Digite o novo nome:',
    {
      title: 'Renomear',
      defaultValue: currentName
    }
  );

  if (newName) {
    await api.rename(id, newName);
    sdk.ui.success('Renomeado!');
  }
}
\`\`\`
`,
  },
  'sdk/contracts': {
    title: 'SDK - Contracts API',
    content: `
## Contracts

API para interagir com smart contracts ink! na Bazari Chain.

## Permissões

- \`contracts:read\` - Para consultar contratos
- \`contracts:write\` - Para executar transações

## Tipos de Contratos

### Loyalty (Fidelidade)
Programa de pontos para clientes.

### Escrow
Pagamentos seguros com liberação condicional.

### Revenue Split
Divisão automática de receita.

## Deploy de Contratos

### deployLoyalty()

\`\`\`typescript
const contract = await sdk.contracts.deployLoyalty({
  name: 'Pontos Café',
  symbol: 'PTC',
  bzrToPointsRatio: 100,  // 1 BZR = 100 pontos
  pointsToBzrRatio: 100,  // 100 pontos = 1 BZR
  expirationDays: 365
});

// contract.address
\`\`\`

## Interagindo com Loyalty

\`\`\`typescript
const loyalty = sdk.contracts.loyalty(contractAddress);

// Emitir pontos
await loyalty.issuePoints(customerAddress, 100, 'Compra');

// Consultar saldo
const points = await loyalty.balanceOf(address);

// Consultar tier
const tier = await loyalty.tierOf(address);

// Resgatar pontos
const result = await loyalty.redeemPoints(500);
\`\`\`

## Exemplo Completo

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();
let loyalty;

async function init() {
  let address = await sdk.storage.get('loyaltyContract');

  if (!address) {
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

async function onPurchase(customerAddress, totalBzr) {
  const points = totalBzr * 100;
  await loyalty.issuePoints(customerAddress, points, 'Compra');
  sdk.ui.success(\`+\${points} pontos!\`);
}
\`\`\`
`,
  },
  'guides/payments': {
    title: 'Guia: Integrar Pagamentos BZR',
    content: `
## Integração de Pagamentos

Este guia mostra como aceitar pagamentos BZR no seu app.

## Fluxo Básico

1. Usuário clica em "Pagar"
2. App chama \`sdk.wallet.requestPayment()\`
3. Modal nativo do Bazari aparece
4. Usuário confirma ou cancela
5. App recebe resultado

## Implementação

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

async function processPayment(order) {
  try {
    const result = await sdk.wallet.requestPayment({
      to: order.sellerAddress,
      amount: order.total.toString(),
      description: \`Pedido #\${order.id}\`,
      metadata: {
        orderId: order.id,
        items: order.items
      }
    });

    if (result.success) {
      // Atualizar status do pedido
      await updateOrderStatus(order.id, 'PAID', result.txHash);
      sdk.ui.success('Pagamento confirmado!');
      return true;
    } else {
      sdk.ui.error(result.error || 'Pagamento cancelado');
      return false;
    }
  } catch (err) {
    sdk.ui.error('Erro ao processar pagamento');
    return false;
  }
}
\`\`\`

## Verificar Saldo Antes

\`\`\`typescript
async function canAfford(amount: string) {
  const balance = await sdk.wallet.getBalance();
  return parseFloat(balance) >= parseFloat(amount);
}

async function handlePurchase(product) {
  if (!await canAfford(product.price)) {
    sdk.ui.error('Saldo insuficiente');
    return;
  }

  await processPayment({
    sellerAddress: product.sellerAddress,
    total: product.price,
    id: generateOrderId(),
    items: [product]
  });
}
\`\`\`

## Boas Práticas

1. Sempre verifique saldo antes
2. Mostre resumo claro do pagamento
3. Trate erros graciosamente
4. Salve txHash para referência
5. Confirme visualmente o sucesso
`,
  },
  'guides/loyalty': {
    title: 'Guia: Criar Programa de Fidelidade',
    content: `
## Programa de Fidelidade

Aprenda a criar um sistema de pontos usando smart contracts.

## 1. Deploy do Contrato

\`\`\`typescript
const contract = await sdk.contracts.deployLoyalty({
  name: 'Minha Loja Rewards',
  symbol: 'MLR',
  bzrToPointsRatio: 100,    // 1 BZR = 100 pontos
  pointsToBzrRatio: 100,    // 100 pontos = 1 BZR
  expirationDays: 365       // Pontos expiram em 1 ano
});

// Salvar endereço
await sdk.storage.set('loyaltyContract', contract.address);
\`\`\`

## 2. Emitir Pontos

\`\`\`typescript
const loyalty = sdk.contracts.loyalty(contractAddress);

// Após uma compra
async function rewardPurchase(customer, purchaseAmount) {
  const points = Math.floor(purchaseAmount * 100);

  await loyalty.issuePoints(
    customer.address,
    points,
    \`Compra de \${purchaseAmount} BZR\`
  );

  sdk.ui.success(\`+\${points} pontos!\`);
}
\`\`\`

## 3. Mostrar Saldo

\`\`\`typescript
function PointsCard({ userAddress }) {
  const [points, setPoints] = useState('0');
  const [tier, setTier] = useState('Bronze');

  useEffect(() => {
    async function load() {
      const loyalty = sdk.contracts.loyalty(contractAddress);
      setPoints(await loyalty.balanceOf(userAddress));
      setTier(await loyalty.tierOf(userAddress));
    }
    load();
  }, [userAddress]);

  return (
    <div className="points-card">
      <h3>{tier}</h3>
      <p>{points} pontos</p>
    </div>
  );
}
\`\`\`

## 4. Resgatar Pontos

\`\`\`typescript
async function redeemPoints(amount) {
  const result = await loyalty.redeemPoints(amount);
  sdk.ui.success(\`Resgatado: \${result.bzrValue} BZR\`);
}
\`\`\`

## Tiers

O contrato define tiers automaticamente:

| Tier | Pontos |
|------|--------|
| Bronze | 0 - 999 |
| Silver | 1.000 - 4.999 |
| Gold | 5.000 - 19.999 |
| Platinum | 20.000+ |
`,
  },
  'guides/monetization': {
    title: 'Guia: Monetizar seu App',
    content: `
## Modelos de Monetização

O Bazari oferece várias formas de monetizar seu app.

## 1. App Pago

Defina um preço no manifest:

\`\`\`json
{
  "pricing": {
    "type": "paid",
    "price": "5.00",
    "currency": "BZR"
  }
}
\`\`\`

**Revenue Share**: 70% developer / 30% Bazari

## 2. Freemium

App gratuito com recursos premium:

\`\`\`json
{
  "pricing": {
    "type": "freemium"
  },
  "iap": [
    {
      "id": "premium_monthly",
      "price": "2.00",
      "type": "subscription"
    }
  ]
}
\`\`\`

## 3. In-App Purchases

\`\`\`typescript
// Verificar se usuário tem premium
const hasPremium = await sdk.iap.hasPurchased('premium_monthly');

// Iniciar compra
async function upgradeToPremium() {
  const result = await sdk.iap.purchase('premium_monthly');
  if (result.success) {
    sdk.ui.success('Bem-vindo ao Premium!');
  }
}
\`\`\`

## 4. Taxa por Transação

Cobre uma taxa nas transações do seu app:

\`\`\`typescript
const FEE_PERCENT = 2.5; // 2.5%

async function processWithFee(amount, seller) {
  const fee = amount * (FEE_PERCENT / 100);
  const sellerAmount = amount - fee;

  // Pagar vendedor
  await sdk.wallet.transfer(seller, sellerAmount.toString());

  // Receber taxa
  await sdk.wallet.transfer(MY_ADDRESS, fee.toString());
}
\`\`\`

## Dashboard de Revenue

Acesse métricas no Developer Portal:

- Revenue total
- Revenue por período
- Downloads e conversões
- Detalhamento por IAP
`,
  },
  'guides/escrow': {
    title: 'Guia: Criar Serviço de Escrow',
    content: `
## Escrow Service

Proteja transações com pagamento condicional.

## Como Funciona

1. Comprador deposita BZR no contrato
2. Vendedor entrega produto/serviço
3. Comprador confirma recebimento
4. Fundos são liberados

## Criar Escrow

\`\`\`typescript
const contract = await sdk.contracts.deployEscrow({
  seller: sellerAddress,
  amount: '100',
  description: 'Serviço de design',
  deadlineHours: 72
});

// ID do escrow
const escrowId = contract.address;
\`\`\`

## Fluxo do Comprador

\`\`\`typescript
const escrow = sdk.contracts.escrow(escrowId);

// 1. Depositar fundos
await escrow.fund();

// 2. Após receber, confirmar
await escrow.confirmDelivery();

// Ou abrir disputa
await escrow.openDispute('Não recebi o produto');

// Ou pedir reembolso (antes do prazo)
await escrow.refund();
\`\`\`

## Fluxo do Vendedor

\`\`\`typescript
// Verificar status
const status = await escrow.getStatus();

if (status.status === 'FUNDED') {
  // Entregar serviço
  // Aguardar confirmação
}

if (status.status === 'COMPLETED') {
  // Fundos liberados automaticamente
}
\`\`\`

## Status do Escrow

| Status | Descrição |
|--------|-----------|
| CREATED | Aguardando depósito |
| FUNDED | Fundos depositados |
| COMPLETED | Confirmado e liberado |
| DISPUTED | Em disputa |
| REFUNDED | Reembolsado |
`,
  },
  'cli/create': {
    title: 'CLI - bazari create',
    content: `
## Criar Novo Projeto

O comando \`bazari create\` cria um novo projeto de app Bazari com toda a estrutura necessária.

## Uso

\`\`\`bash
bazari create <nome-do-app>
\`\`\`

## Exemplo

\`\`\`bash
bazari create meu-primeiro-app
\`\`\`

O CLI vai fazer algumas perguntas:

- **Nome do App**: Nome de exibição (ex: "Meu Primeiro App")
- **Descrição**: Descrição curta do app
- **Categoria**: tools, games, finance, social, etc.
- **Autor**: Seu nome ou empresa

## Estrutura Criada

\`\`\`
meu-primeiro-app/
├── bazari.manifest.json   # Configuração do app
├── package.json           # Dependências
├── public/
│   └── index.html         # Seu app (HTML + JS)
├── src/                   # Código fonte (opcional)
└── README.md
\`\`\`

## Opções

| Opção | Descrição |
|-------|-----------|
| \`-t, --template <template>\` | Template a usar (basic, react, vue) |

## Templates Disponíveis

- **basic** (padrão): HTML + JavaScript vanilla
- **react**: Projeto React com TypeScript
- **vue**: Projeto Vue.js

## Exemplo com Template

\`\`\`bash
bazari create meu-app-react --template react
\`\`\`

## Próximos Passos

Após criar o projeto:

\`\`\`bash
cd meu-primeiro-app
npm install
bazari dev
\`\`\`
`,
  },
  'cli/dev': {
    title: 'CLI - bazari dev',
    content: `
## Servidor de Desenvolvimento

O comando \`bazari dev\` inicia um servidor de desenvolvimento local com hot-reload.

## Uso

\`\`\`bash
bazari dev
\`\`\`

## O que faz

1. Inicia servidor local em \`http://localhost:3000\`
2. Simula o ambiente Bazari (postMessage bridge)
3. Hot-reload quando você edita arquivos
4. Mostra logs do SDK no console

## Opções

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| \`-p, --port <port>\` | Porta do servidor | 3000 |
| \`--host <host>\` | Host do servidor | localhost |
| \`--open\` | Abre navegador automaticamente | false |

## Exemplos

\`\`\`bash
# Porta padrão
bazari dev

# Porta customizada
bazari dev --port 8080

# Abrir navegador automaticamente
bazari dev --open

# Acessível na rede local
bazari dev --host 0.0.0.0
\`\`\`

## Ambiente de Simulação

O servidor de desenvolvimento simula:

- **SDK Bridge**: Comunicação postMessage funciona
- **Usuário Mock**: Usuário de teste pré-configurado
- **Wallet Mock**: Saldo fictício para testes

## Limitações

Algumas funcionalidades só funcionam no Bazari real:

- Transações reais de BZR
- Smart contracts
- Permissões de usuário real

## Próximos Passos

- [Testar seu app](/app/developer/docs/guides/testing)
- [Build para produção](/app/developer/docs/cli/build)
`,
  },
  'cli/build': {
    title: 'CLI - bazari build',
    content: `
## Build para Produção

O comando \`bazari build\` compila seu app para produção.

## Uso

\`\`\`bash
bazari build
\`\`\`

## O que faz

1. Compila TypeScript/JavaScript
2. Minifica o código
3. Otimiza assets
4. Gera bundle na pasta \`dist/\`
5. Atualiza manifest com hash dos arquivos

## Opções

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| \`-o, --output <dir>\` | Diretório de saída | dist |
| \`--minify\` | Minificar código | true |
| \`--sourcemap\` | Gerar sourcemaps | false |

## Exemplos

\`\`\`bash
# Build padrão
bazari build

# Com sourcemaps (para debug)
bazari build --sourcemap

# Diretório customizado
bazari build --output build
\`\`\`

## Estrutura de Saída

\`\`\`
dist/
├── index.html
├── index.js          # Bundle JavaScript
├── index.css         # Estilos (se houver)
├── assets/           # Imagens, fontes, etc.
└── bazari.manifest.json
\`\`\`

## Validação Automática

O build automaticamente:

- Verifica se o manifest está válido
- Checa permissões declaradas
- Valida estrutura de arquivos
- Gera hash para cache busting

## Antes de Publicar

Sempre faça build antes de publicar:

\`\`\`bash
bazari build
bazari validate  # Opcional: verificar erros
bazari publish
\`\`\`

## Próximos Passos

- [Validar build](/app/developer/docs/cli/validate)
- [Publicar app](/app/developer/docs/cli/publish)
`,
  },
  'cli/publish': {
    title: 'CLI - bazari publish',
    content: `
## Publicar App

O comando \`bazari publish\` publica seu app na App Store ou gera credenciais para SDK externo.

## Pré-requisitos

1. Estar logado (\`bazari login\`)
2. Ter feito build (\`bazari build\`) - apenas para App Store
3. Manifest válido

## Sintaxe

\`\`\`bash
bazari publish [options]
\`\`\`

## Opções

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| \`-d, --dir <dir>\` | Diretório do build | dist |
| \`-t, --target <target>\` | Target: appstore, external, both | auto |
| \`-o, --origin <urls...>\` | Origens permitidas (SDK externo) | - |
| \`--changelog <text>\` | Changelog da versão | - |
| \`--no-submit\` | Upload sem submeter para review | false |

## Targets de Publicação

### appstore (padrão)

Publica na App Store Bazari. App será carregado em iframe.

\`\`\`bash
bazari publish --target appstore
\`\`\`

### external

Gera API Key para usar o SDK em sites externos.

\`\`\`bash
bazari publish --target external --origin https://meusite.com
\`\`\`

### both

Publica na App Store E gera API Key para SDK externo.

\`\`\`bash
bazari publish --target both --origin https://meusite.com
\`\`\`

## Exemplos

\`\`\`bash
# Publicar na App Store (padrão)
bazari publish

# Publicar para SDK externo
bazari publish --target external --origin https://meusite.com https://app.meusite.com

# Publicar em ambos
bazari publish --target both --origin https://meusite.com

# Com changelog
bazari publish --changelog "Corrigido bug de login"

# Upload sem submeter para review
bazari publish --no-submit
\`\`\`

## Diferenças entre Targets

| Característica | App Store | External |
|----------------|-----------|----------|
| Onde roda | Iframe no Bazari | Seu próprio site |
| Autenticação | Automática | Via API Key + OAuth |
| Bundle | Upload para IPFS | Não necessário |
| Review | Sim | Sim (para aprovar API Key) |

## Configuração via Manifest

O target também pode ser definido no \`bazari.manifest.json\`:

\`\`\`json
{
  "distribution": {
    "appStore": true,
    "external": true,
    "allowedOrigins": ["https://meusite.com"]
  }
}
\`\`\`

## Tempo de Review

| Tipo | Tempo |
|------|-------|
| Primeiro app | 1-3 dias úteis |
| Atualização | Até 24h |
| API Key externa | Até 24h |

## Próximos Passos

- [Gerenciar API Keys](/app/developer/docs/cli/keys)
- [Monetizar seu app](/app/developer/docs/guides/monetization)
- [Ver analytics](/app/developer/revenue)
`,
  },
  'cli/keys': {
    title: 'CLI - bazari keys',
    content: `
## Gerenciar API Keys

O comando \`bazari keys\` gerencia API Keys para uso do SDK externo.

## Comandos

| Comando | Descrição |
|---------|-----------|
| \`bazari keys list\` | Lista todas as API Keys |
| \`bazari keys show [slug]\` | Mostra detalhes de uma API Key |
| \`bazari keys rotate [slug]\` | Rotaciona API Key ou Secret Key |
| \`bazari keys revoke [slug]\` | Revoga API Key permanentemente |

## bazari keys list

Lista todas as API Keys associadas à sua conta.

\`\`\`bash
bazari keys list
\`\`\`

**Saída:**

\`\`\`
Your API Keys:

Meu App (meu-app)
  API Key:  baz_sdk_abc123...
  Status:   APPROVED
  Origins:  https://meusite.com
  Requests: 1,234
\`\`\`

## bazari keys show

Mostra detalhes de uma API Key específica.

\`\`\`bash
# Por slug
bazari keys show meu-app

# Ou do projeto atual
cd meu-app
bazari keys show
\`\`\`

## bazari keys rotate

Rotaciona credenciais de segurança.

### Rotacionar Secret Key (padrão)

\`\`\`bash
bazari keys rotate meu-app
# ou
bazari keys rotate --secret meu-app
\`\`\`

### Rotacionar API Key (cuidado!)

\`\`\`bash
bazari keys rotate --api meu-app
\`\`\`

**Atenção:** Rotacionar a API Key invalida todas as integrações existentes!

## bazari keys revoke

Revoga uma API Key permanentemente. **Esta ação não pode ser desfeita.**

\`\`\`bash
bazari keys revoke meu-app
\`\`\`

## Boas Práticas

1. **Secret Key no servidor**: Nunca exponha no frontend
2. **Rotacione periodicamente**: A cada 90 dias é recomendado
3. **Use allowedOrigins**: Restrinja a domínios específicos
4. **Monitore uso**: Verifique requests no dashboard

## Status Possíveis

| Status | Descrição |
|--------|-----------|
| PENDING | Aguardando aprovação |
| APPROVED | Ativo e funcionando |
| REJECTED | Rejeitado |
| SUSPENDED | Suspenso temporariamente |

## Próximos Passos

- [Publicar app](/app/developer/docs/cli/publish)
- [SDK Externo](/app/developer/docs/sdk/overview)
`,
  },
  'cli/studio': {
    title: 'CLI - bazari studio',
    content: `
## Bazari Studio

O comando \`bazari studio\` abre o Bazari Studio, uma IDE visual para desenvolvimento de apps.

## Uso

\`\`\`bash
bazari studio
\`\`\`

## Funcionalidades

- **Editor visual**: Arraste e solte componentes
- **Preview em tempo real**: Veja mudanças instantaneamente
- **Debugger integrado**: Inspecione chamadas do SDK
- **Deploy direto**: Publique sem sair do Studio

## Opções

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| \`-p, --port <port>\` | Porta do servidor | 4000 |
| \`--open\` | Abre navegador automaticamente | true |

## Exemplo

\`\`\`bash
# Abrir Studio na porta padrão
bazari studio

# Porta customizada
bazari studio --port 5000
\`\`\`

## Requisitos

- Projeto Bazari válido (bazari.manifest.json)
- Dependências instaladas (npm install)

## Próximos Passos

- [Criar projeto](/app/developer/docs/cli/create)
- [Publicar app](/app/developer/docs/cli/publish)
`,
  },
  'monetization/models': {
    title: 'Modelos de Monetização',
    content: `
## Escolha seu Modelo

O Bazari oferece diferentes formas de monetizar seu app.

## 1. App Gratuito (FREE)

Ideal para apps de utilidade, marketing ou para construir base de usuários.

\`\`\`json
{
  "monetizationType": "FREE"
}
\`\`\`

**Quando usar:**
- Apps de utilidade simples
- Versões demo/trial
- Apps de marketing/branding
- Ferramentas da comunidade

**Receita:** Sem custo para usuários, sem receita direta.

## 2. App Pago (PAID)

Usuário paga uma vez para instalar e usar permanentemente.

\`\`\`json
{
  "monetizationType": "PAID",
  "price": 10
}
\`\`\`

**Quando usar:**
- Apps completos e polidos
- Ferramentas profissionais
- Games premium
- Apps com alto valor agregado

**Faixas de preço sugeridas:**

| Tipo | Faixa |
|------|-------|
| Utilitário simples | 1-5 BZR |
| Ferramenta completa | 10-25 BZR |
| App profissional | 50-100 BZR |
| Suite empresarial | 100+ BZR |

## 3. Freemium

App gratuito com compras internas opcionais.

\`\`\`json
{
  "monetizationType": "FREEMIUM"
}
\`\`\`

**Quando usar:**
- Games com economia interna
- Apps com recursos premium
- Serviços com limites de uso
- Modelos de assinatura

**Vantagens:**
- Baixa barreira de entrada
- Maior base de usuários
- Receita recorrente possível

## 4. Assinatura (em breve)

Pagamento recorrente mensal ou anual.

\`\`\`json
{
  "monetizationType": "SUBSCRIPTION",
  "subscriptionPrice": 5,
  "subscriptionPeriod": "MONTHLY"
}
\`\`\`

## Comparativo

| Modelo | Barreira | Receita | Melhor para |
|--------|----------|---------|-------------|
| FREE | Nenhuma | Nenhuma | Crescimento |
| PAID | Alta | Uma vez | Apps premium |
| FREEMIUM | Baixa | Recorrente | Games/SaaS |
| SUBSCRIPTION | Média | Recorrente | Serviços |

## Próximos Passos

- [In-App Purchases](/app/developer/docs/monetization/iap)
- [Revenue Share](/app/developer/docs/monetization/revenue-share)
`,
  },
  'monetization/iap': {
    title: 'In-App Purchases',
    content: `
## Compras Dentro do App

Configure produtos que usuários podem comprar dentro do seu app.

## Tipos de Produto

### 1. NON_CONSUMABLE (Permanente)

Compra única que dura para sempre.

\`\`\`typescript
{
  id: 'premium_upgrade',
  name: 'Upgrade Premium',
  price: 25,
  type: 'NON_CONSUMABLE',
  description: 'Desbloqueie todas as funcionalidades'
}
\`\`\`

**Exemplos:**
- Remover anúncios
- Desbloquear versão completa
- Temas exclusivos
- Features premium

### 2. CONSUMABLE (Consumível)

Pode ser comprado múltiplas vezes.

\`\`\`typescript
{
  id: 'coins_100',
  name: '100 Moedas',
  price: 5,
  type: 'CONSUMABLE',
  description: 'Pack de 100 moedas'
}
\`\`\`

**Exemplos:**
- Moedas/créditos virtuais
- Vidas extras em games
- Boosts temporários
- Créditos de API

## Implementação

### 1. Configurar no Developer Portal

Acesse seu app e adicione produtos na aba "Monetização".

### 2. Verificar Compras

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

// Verificar se já comprou (NON_CONSUMABLE)
const hasPremium = await sdk.iap.hasPurchased('premium_upgrade');

if (hasPremium) {
  enablePremiumFeatures();
} else {
  showUpgradeButton();
}
\`\`\`

### 3. Realizar Compra

\`\`\`typescript
async function buyPremium() {
  try {
    const result = await sdk.iap.purchase('premium_upgrade');

    if (result.success) {
      enablePremiumFeatures();
      sdk.ui.success('Premium ativado!');
    }
  } catch (error) {
    if (error.code === 'USER_CANCELLED') {
      // Usuário cancelou - não mostrar erro
    } else if (error.code === 'INSUFFICIENT_BALANCE') {
      sdk.ui.error('Saldo insuficiente');
    } else {
      sdk.ui.error('Erro na compra');
    }
  }
}
\`\`\`

### 4. Listar Compras

\`\`\`typescript
// Obter todas as compras do usuário
const purchases = await sdk.iap.getPurchases();

for (const purchase of purchases) {
  console.log(purchase.productId, purchase.purchasedAt);
}
\`\`\`

## Boas Práticas

1. **Preços psicológicos**: 9 BZR em vez de 10 BZR
2. **Pacotes com bônus**: "500 moedas + 50 bônus"
3. **Destaque o melhor valor**: Badge "Mais Popular"
4. **Seja transparente**: Mostre claramente o que é pago

## Exemplo de UI

\`\`\`html
<div class="store">
  <div class="product premium">
    <span class="badge">Mais Popular</span>
    <h3>Premium</h3>
    <p>Todas as funcionalidades</p>
    <button onclick="buyPremium()">
      25 BZR - Comprar
    </button>
  </div>

  <div class="coins">
    <div onclick="buy('coins_100')">
      100 Moedas - 5 BZR
    </div>
    <div onclick="buy('coins_500')">
      550 Moedas - 20 BZR
      <span class="bonus">+10%</span>
    </div>
  </div>
</div>
\`\`\`

## Próximos Passos

- [Revenue Share](/app/developer/docs/monetization/revenue-share)
- [Guia de Monetização](/app/developer/docs/guides/monetization)
`,
  },
  'monetization/revenue-share': {
    title: 'Revenue Share',
    content: `
## Divisão de Receita

Entenda quanto você ganha com cada venda no Bazari.

## Tabela de Revenue Share

| Tier | Instalações | Você recebe | Bazari |
|------|-------------|-------------|--------|
| Starter | 0 - 1.000 | **70%** | 30% |
| Growth | 1.001 - 10.000 | **75%** | 25% |
| Scale | 10.001 - 100.000 | **80%** | 20% |
| Enterprise | 100.001+ | **85%** | 15% |

## Como Funciona

1. **Tiers progressivos**: Quanto mais instalações, maior sua porcentagem
2. **Calculado por app**: Cada app tem seu próprio tier
3. **Atualização automática**: Tier sobe conforme você cresce
4. **Sem taxas ocultas**: Apenas o revenue share

## Exemplos de Cálculo

### App Pago - Tier Starter
- Preço: 25 BZR
- Seu share: 70%
- **Você recebe: 17.5 BZR por venda**

### App Pago - Tier Growth
- Preço: 25 BZR
- Seu share: 75%
- **Você recebe: 18.75 BZR por venda**

### In-App Purchase - Tier Scale
- Produto: 10 BZR
- Seu share: 80%
- **Você recebe: 8 BZR por compra**

## Projeção de Receita

| Vendas/mês | Preço | Tier | Receita Bruta | Sua Receita |
|------------|-------|------|---------------|-------------|
| 100 | 10 BZR | Starter | 1.000 BZR | 700 BZR |
| 500 | 10 BZR | Growth | 5.000 BZR | 3.750 BZR |
| 2.000 | 10 BZR | Scale | 20.000 BZR | 16.000 BZR |

## Dashboard de Receita

Acompanhe seus ganhos em tempo real:

- **Receita total**: Todos os tempos
- **Receita mensal**: Mês atual
- **Por produto**: Detalhamento de cada IAP
- **Tendências**: Gráficos de crescimento

Acesse: [Revenue Dashboard](/app/developer/revenue)

## Pagamentos

- **Frequência**: Mensal
- **Mínimo**: 10 BZR acumulados
- **Método**: Direto na sua wallet Bazari
- **Processamento**: Até dia 5 do mês seguinte

## Impostos

O Bazari não retém impostos. Você é responsável por declarar sua receita conforme legislação local.

## Dicas para Maximizar Receita

1. **Suba de tier**: Foque em instalações para aumentar %
2. **Ofereça valor**: Apps de qualidade convertem melhor
3. **Preços justos**: Nem muito alto, nem muito baixo
4. **Múltiplos produtos**: IAPs diversificam receita
5. **Atualize frequentemente**: Mantém usuários engajados

## Próximos Passos

- [Modelos de Monetização](/app/developer/docs/monetization/models)
- [In-App Purchases](/app/developer/docs/monetization/iap)
`,
  },

  // ========================================
  // EXAMPLES
  // ========================================
  'examples/balance': {
    title: 'App de Saldo',
    content: `
Exemplo completo de um app que mostra o saldo da wallet do usuário.

## Estrutura do Projeto

\`\`\`
balance-app/
├── src/
│   └── index.tsx
├── bazari.manifest.json
└── package.json
\`\`\`

## Manifest

\`\`\`json
{
  "appId": "com.example.balance",
  "name": "Meu Saldo",
  "slug": "balance-app",
  "version": "1.0.0",
  "description": "Visualize seu saldo BZR e ZARI",
  "category": "finance",
  "permissions": [
    { "id": "wallet:read", "reason": "Para exibir seu saldo" }
  ],
  "sdkVersion": "0.1.0",
  "monetizationType": "free"
}
\`\`\`

## Código Principal

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';
import { useEffect, useState } from 'react';

const sdk = new BazariSDK({ debug: true });

interface Balance {
  bzr: string;
  zari: string;
  formatted: {
    bzr: string;
    zari: string;
  };
}

export default function BalanceApp() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBalance();

    // Escutar mudanças de saldo
    const unsubscribe = sdk.events.on('wallet:balanceChanged', () => {
      loadBalance();
    });

    return () => { unsubscribe(); };
  }, []);

  async function loadBalance() {
    try {
      setLoading(true);
      const result = await sdk.wallet.getBalance();
      setBalance(result);
    } catch (err) {
      setError('Erro ao carregar saldo');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Meu Saldo</h1>

      <div className="grid gap-4">
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="text-sm text-blue-600">BZR</div>
          <div className="text-3xl font-bold">{balance?.formatted.bzr}</div>
        </div>

        <div className="bg-purple-100 p-4 rounded-lg">
          <div className="text-sm text-purple-600">ZARI</div>
          <div className="text-3xl font-bold">{balance?.formatted.zari}</div>
        </div>
      </div>

      <button
        onClick={loadBalance}
        className="mt-4 px-4 py-2 bg-primary text-white rounded"
      >
        Atualizar
      </button>
    </div>
  );
}
\`\`\`

## Funcionalidades

1. **Carregamento inicial**: Busca saldo ao montar componente
2. **Atualização em tempo real**: Escuta evento \`wallet:balanceChanged\`
3. **Estados de loading e erro**: UX adequada
4. **Botão de refresh**: Atualização manual

## Executar Localmente

\`\`\`bash
bazari create balance-app --template balance
cd balance-app
bazari dev
\`\`\`

## Próximos Passos

- [Adicionar transferências](/app/developer/docs/sdk/wallet)
- [Histórico de transações](/app/developer/docs/sdk/wallet)
`,
  },

  'examples/todo': {
    title: 'Lista de Tarefas',
    content: `
Exemplo de app com persistência usando o Storage do SDK.

## Manifest

\`\`\`json
{
  "appId": "com.example.todo",
  "name": "Minhas Tarefas",
  "slug": "todo-app",
  "version": "1.0.0",
  "description": "Lista de tarefas simples",
  "category": "productivity",
  "permissions": [
    { "id": "storage:read", "reason": "Para salvar suas tarefas" }
  ],
  "sdkVersion": "0.1.0",
  "monetizationType": "free"
}
\`\`\`

## Código Principal

\`\`\`typescript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';
import { useEffect, useState } from 'react';

const sdk = new BazariSDK({ debug: true });

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);

  // Carregar tarefas salvas
  useEffect(() => {
    loadTodos();
  }, []);

  // Salvar automaticamente quando mudar
  useEffect(() => {
    if (!loading) {
      sdk.storage.set('todos', todos);
    }
  }, [todos, loading]);

  async function loadTodos() {
    try {
      const saved = await sdk.storage.get<Todo[]>('todos');
      setTodos(saved || []);
    } finally {
      setLoading(false);
    }
  }

  function addTodo() {
    if (!newTodo.trim()) return;

    const todo: Todo = {
      id: crypto.randomUUID(),
      text: newTodo.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setTodos([todo, ...todos]);
    setNewTodo('');
    sdk.ui.success('Tarefa adicionada!');
  }

  function toggleTodo(id: string) {
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  }

  function deleteTodo(id: string) {
    setTodos(todos.filter(t => t.id !== id));
    sdk.ui.showToast('Tarefa removida');
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Minhas Tarefas</h1>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Nova tarefa..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={addTodo}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Adicionar
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhuma tarefa ainda
          </p>
        ) : (
          todos.map(todo => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span className={todo.completed ? 'line-through text-gray-400' : ''}>
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                x
              </button>
            </div>
          ))
        )}
      </div>

      {/* Contador */}
      {todos.length > 0 && (
        <p className="text-sm text-gray-500 mt-4">
          {todos.filter(t => !t.completed).length} tarefas pendentes
        </p>
      )}
    </div>
  );
}
\`\`\`

## Funcionalidades

1. **CRUD completo**: Criar, ler, atualizar, deletar
2. **Persistência**: Dados salvos via \`sdk.storage\`
3. **Auto-save**: Salva automaticamente ao modificar
4. **Feedback**: Toasts de confirmação via \`sdk.ui\`

## Executar Localmente

\`\`\`bash
bazari create todo-app --template todo
cd todo-app
bazari dev
\`\`\`

## Próximos Passos

- [API de Storage](/app/developer/docs/sdk/storage)
- [Notificações e UI](/app/developer/docs/sdk/ui)
`,
  },

  'examples/loyalty': {
    title: 'App de Fidelidade',
    content: `
Exemplo de app com programa de pontos usando wallet e In-App Purchases.

## Manifest

\`\`\`json
{
  "appId": "com.example.loyalty",
  "name": "Clube de Pontos",
  "slug": "loyalty-app",
  "version": "1.0.0",
  "description": "Programa de fidelidade com pontos",
  "category": "lifestyle",
  "permissions": [
    { "id": "auth:read", "reason": "Para personalizar experiência" },
    { "id": "wallet:read", "reason": "Para mostrar pontos" },
    { "id": "wallet:transfer", "reason": "Para resgatar recompensas" },
    { "id": "storage:read", "reason": "Para salvar histórico" }
  ],
  "sdkVersion": "0.1.0",
  "monetizationType": "freemium",
  "iapProducts": [
    {
      "id": "points_100",
      "name": "100 Pontos",
      "price": 1,
      "type": "consumable"
    },
    {
      "id": "points_500",
      "name": "500 Pontos + 50 Bonus",
      "price": 4,
      "type": "consumable"
    },
    {
      "id": "vip_membership",
      "name": "Membro VIP",
      "price": 10,
      "type": "non_consumable"
    }
  ]
}
\`\`\`

## Código Principal

\`\`\`typescript
import { BazariSDK, SDKUser } from '@bazari.libervia.xyz/app-sdk';
import { useEffect, useState } from 'react';

const sdk = new BazariSDK({ debug: true });

interface UserData {
  points: number;
  isVip: boolean;
  history: { date: number; action: string; points: number }[];
}

export default function LoyaltyApp() {
  const [user, setUser] = useState<SDKUser | null>(null);
  const [data, setData] = useState<UserData>({
    points: 0,
    isVip: false,
    history: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const [currentUser, savedData] = await Promise.all([
        sdk.auth.getCurrentUser(),
        sdk.storage.get<UserData>('userData'),
      ]);

      setUser(currentUser);
      if (savedData) setData(savedData);
    } finally {
      setLoading(false);
    }
  }

  async function saveData(newData: UserData) {
    setData(newData);
    await sdk.storage.set('userData', newData);
  }

  async function buyPoints(productId: string) {
    try {
      const result = await sdk.wallet.requestPurchase(productId);

      if (result.success) {
        let pointsToAdd = 0;
        if (productId === 'points_100') pointsToAdd = 100;
        if (productId === 'points_500') pointsToAdd = 550;

        const newData = {
          ...data,
          points: data.points + pointsToAdd,
          history: [
            { date: Date.now(), action: 'Compra', points: pointsToAdd },
            ...data.history,
          ],
        };

        await saveData(newData);
        sdk.ui.success('Pontos adicionados!');
      }
    } catch (err) {
      sdk.ui.error('Compra cancelada');
    }
  }

  async function upgradeToVip() {
    try {
      const result = await sdk.wallet.requestPurchase('vip_membership');

      if (result.success) {
        const newData = {
          ...data,
          isVip: true,
          history: [
            { date: Date.now(), action: 'Upgrade VIP', points: 0 },
            ...data.history,
          ],
        };

        await saveData(newData);
        sdk.ui.success('Bem-vindo ao clube VIP!');
      }
    } catch (err) {
      sdk.ui.error('Compra cancelada');
    }
  }

  async function redeemReward(cost: number, reward: string) {
    if (data.points < cost) {
      sdk.ui.warning('Pontos insuficientes');
      return;
    }

    const confirmed = await sdk.ui.showConfirm({
      title: 'Resgatar Recompensa',
      message: 'Deseja resgatar "' + reward + '" por ' + cost + ' pontos?',
      confirmText: 'Resgatar',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      const newData = {
        ...data,
        points: data.points - cost,
        history: [
          { date: Date.now(), action: 'Resgate: ' + reward, points: -cost },
          ...data.history,
        ],
      };

      await saveData(newData);
      sdk.ui.success('Resgatado: ' + reward);
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Clube de Pontos</h1>
        <p className="text-gray-500">Ola, {user?.displayName || 'Usuario'}!</p>
        {data.isVip && (
          <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            VIP
          </span>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-xl mb-6">
        <div className="text-sm opacity-90">Seus pontos</div>
        <div className="text-4xl font-bold">{data.points.toLocaleString()}</div>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-3">Comprar Pontos</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => buyPoints('points_100')} className="p-3 border rounded-lg hover:bg-gray-50">
            <div className="font-bold">100 pts</div>
            <div className="text-sm text-gray-500">1 BZR</div>
          </button>
          <button onClick={() => buyPoints('points_500')} className="p-3 border rounded-lg hover:bg-gray-50 relative">
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">+10%</span>
            <div className="font-bold">550 pts</div>
            <div className="text-sm text-gray-500">4 BZR</div>
          </button>
        </div>
      </div>

      {!data.isVip && (
        <div className="mb-6 p-4 border-2 border-yellow-400 rounded-xl bg-yellow-50">
          <h2 className="font-semibold">Torne-se VIP</h2>
          <p className="text-sm text-gray-600 my-2">2x pontos em todas as compras!</p>
          <button onClick={upgradeToVip} className="w-full py-2 bg-yellow-500 text-white rounded-lg font-semibold">
            Upgrade - 10 BZR
          </button>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Resgatar</h2>
        <div className="space-y-2">
          {[
            { cost: 100, name: 'Desconto 5%' },
            { cost: 300, name: 'Frete Gratis' },
            { cost: 500, name: 'Desconto 15%' },
            { cost: 1000, name: 'Produto Exclusivo' },
          ].map((reward) => (
            <button
              key={reward.name}
              onClick={() => redeemReward(reward.cost, reward.name)}
              disabled={data.points < reward.cost}
              className="w-full flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <span>{reward.name}</span>
              <span className="text-sm font-semibold">{reward.cost} pts</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
\`\`\`

## Funcionalidades

1. **Perfil do usuario**: Exibe nome via \`sdk.auth\`
2. **Compra de pontos**: IAP consumable via \`sdk.wallet.requestPurchase\`
3. **Membership VIP**: IAP non-consumable para upgrade permanente
4. **Resgate de recompensas**: Sistema de pontos com confirmacao
5. **Persistencia**: Historico salvo via \`sdk.storage\`
6. **Feedback visual**: Toasts e modais via \`sdk.ui\`

## Modelo de Negocio

| Produto | Tipo | Preco | Valor |
|---------|------|-------|-------|
| 100 Pontos | Consumable | 1 BZR | 100 pts |
| 550 Pontos | Consumable | 4 BZR | 550 pts (bonus) |
| VIP | Non-consumable | 10 BZR | 2x pontos |

## Proximos Passos

- [In-App Purchases](/app/developer/docs/monetization/iap)
- [Guia de Fidelidade](/app/developer/docs/guides/loyalty-program)
`,
  },
};

export default function DocContentPage() {
  const { '*': slug } = useParams();
  const doc = slug ? DOCS_CONTENT[slug] : null;

  if (!doc) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Página não encontrada</h1>
          <p className="text-muted-foreground mb-6">
            A documentação solicitada não existe.
          </p>
          <Button asChild>
            <Link to="/app/developer/docs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Documentação
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/app/developer/docs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>
      </Button>

      {/* Title */}
      <h1 className="text-3xl font-bold mb-8">{doc.title}</h1>

      {/* Content */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <MarkdownContent content={doc.content} />
      </div>
    </div>
  );
}

// Simple markdown renderer
function MarkdownContent({ content }: { content: string }) {
  const lines = content.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre
          key={key++}
          className="bg-muted rounded-lg p-4 overflow-x-auto my-4"
        >
          <code className={`language-${lang}`}>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Table
    if (line.startsWith('|') && lines[i + 1]?.includes('---')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0]
        .split('|')
        .filter((c) => c.trim())
        .map((c) => c.trim());
      const rows = tableLines.slice(2).map((row) =>
        row
          .split('|')
          .filter((c) => c.trim())
          .map((c) => c.trim())
      );
      elements.push(
        <div key={key++} className="overflow-x-auto my-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                {headers.map((h, j) => (
                  <th key={j} className="text-left p-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className="border-b">
                  {row.map((cell, k) => (
                    <td key={k} className="p-2">
                      <InlineCode text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-2xl font-bold mt-8 mb-4">
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-xl font-semibold mt-6 mb-3">
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // List item
    if (line.startsWith('- ') || line.match(/^\d+\. /)) {
      const listItems: string[] = [];
      const isOrdered = line.match(/^\d+\. /);
      while (
        i < lines.length &&
        (lines[i].startsWith('- ') || lines[i].match(/^\d+\. /))
      ) {
        listItems.push(lines[i].replace(/^[-\d.]+\s*/, ''));
        i++;
      }
      const ListTag = isOrdered ? 'ol' : 'ul';
      elements.push(
        <ListTag key={key++} className="list-inside my-4 space-y-1">
          {listItems.map((item, j) => (
            <li key={j} className={isOrdered ? 'list-decimal' : 'list-disc'}>
              <InlineCode text={item} />
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p key={key++} className="my-3">
        <InlineCode text={line} />
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// Handle inline code and links
function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="bg-muted px-1.5 py-0.5 rounded text-sm">
              {part.slice(1, -1)}
            </code>
          );
        }
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          return (
            <Link
              key={i}
              to={linkMatch[2]}
              className="text-primary hover:underline"
            >
              {linkMatch[1]}
            </Link>
          );
        }
        // Bold
        if (part.includes('**')) {
          const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
          return (
            <span key={i}>
              {boldParts.map((bp, j) => {
                if (bp.startsWith('**') && bp.endsWith('**')) {
                  return <strong key={j}>{bp.slice(2, -2)}</strong>;
                }
                return bp;
              })}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}
