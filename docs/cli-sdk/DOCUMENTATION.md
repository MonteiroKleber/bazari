# Bazari CLI & SDK - Documentacao Completa

Documentacao oficial do CLI e SDK para desenvolvimento de apps Bazari.

---

## Sumario

1. [Instalacao do CLI](#instalacao-do-cli)
2. [Comandos do CLI](#comandos-do-cli)
3. [Criando um Projeto](#criando-um-projeto)
4. [Quick Start - Seu Primeiro App](#quick-start---seu-primeiro-app)
5. [Conceitos Basicos](#conceitos-basicos)
6. [SDK Overview](#sdk-overview)
7. [SDK - Auth API](#sdk---auth-api)
8. [SDK - Wallet API](#sdk---wallet-api)
9. [SDK - Storage API](#sdk---storage-api)
10. [SDK - UI API](#sdk---ui-api)
11. [SDK - Events API](#sdk---events-api)
12. [SDK - Contracts API](#sdk---contracts-api)
13. [Publicacao de Apps](#publicacao-de-apps)
14. [Gerenciamento de API Keys](#gerenciamento-de-api-keys)
15. [Boas Praticas de Seguranca](#boas-praticas-de-seguranca)
16. [Troubleshooting](#troubleshooting)

---

# Instalacao do CLI

O CLI do Bazari (`@bazari.libervia.xyz/cli`) e a ferramenta oficial para criar, desenvolver e publicar apps.

## Requisitos

- **Node.js** 18.0 ou superior
- **npm** ou **pnpm**
- Uma conta Bazari (para publicar)

## Instalacao Global

### Com npm

```bash
npm install -g @bazari.libervia.xyz/cli
```

### Com pnpm

```bash
pnpm add -g @bazari.libervia.xyz/cli
```

### Com yarn

```bash
yarn global add @bazari.libervia.xyz/cli
```

## Verificar Instalacao

```bash
bazari --version
# @bazari.libervia.xyz/cli v0.2.26

bazari --help
# Mostra todos os comandos disponiveis
```

## Atualizacao

Para atualizar para a versao mais recente:

```bash
npm update -g @bazari.libervia.xyz/cli
```

---

# Comandos do CLI

## Tabela de Comandos

| Comando | Descricao |
|---------|-----------|
| `bazari login` | Autentica com sua conta Bazari |
| `bazari logout` | Desloga da conta |
| `bazari whoami` | Mostra o usuario logado |
| `bazari create <name>` | Cria novo projeto (React+TS ou Vanilla) |
| `bazari dev` | Inicia servidor de desenvolvimento |
| `bazari build` | Compila o app para producao |
| `bazari validate` | Valida o manifest e estrutura |
| `bazari publish` | Publica na App Store ou gera API Key |
| `bazari keys` | Gerencia API Keys para SDK externo |
| `bazari manifest sync` | Sincroniza permissoes do manifest |
| `bazari studio` | Abre o Bazari Studio (IDE visual) |

## Autenticacao

### Login

```bash
bazari login
```

Abre o navegador para autenticar via OAuth. O token e salvo em `~/.bazari/config.json`.

### Verificar Status

```bash
bazari whoami
# Logado como @seuhandle
```

### Logout

```bash
bazari logout
```

---

# Criando um Projeto

## Comando Create

```bash
bazari create meu-app
```

O CLI perguntara:

1. **Template:** React + TypeScript (recomendado) ou Vanilla JavaScript
2. **Nome:** Nome do seu app
3. **Descricao:** Descricao curta
4. **Categoria:** Finance, Social, Commerce, Tools, Governance, Entertainment
5. **Autor:** Seu nome ou organizacao

## Templates Disponiveis

### React + TypeScript (recomendado)

- Vite como bundler
- React 18
- TypeScript configurado
- Hook `useBazari` incluido (ja configurado para API Key)
- Hot Module Replacement (HMR)
- Estrutura organizada com componentes
- Suporte a variaveis de ambiente (`.env.production`)

### Vanilla JavaScript

- HTML, CSS e JavaScript puro
- Servidor estatico simples
- Ideal para apps pequenos
- SDK via CDN (esm.sh)

## Estrutura do Projeto (React + TS)

```
meu-app/
├── bazari.manifest.json   # Configuracao do app
├── package.json           # Dependencias + Vite
├── vite.config.ts         # Configuracao do Vite
├── tsconfig.json          # Configuracao TypeScript
├── index.html             # HTML entry point
├── .env.example           # Exemplo de configuracao
└── src/
    ├── main.tsx           # Entry point React
    ├── App.tsx            # Componente principal
    ├── index.css          # Estilos
    ├── vite-env.d.ts      # Tipos para env vars
    ├── hooks/
    │   └── useBazari.ts   # Hook do SDK
    └── components/
        └── UserCard.tsx   # Componente de exemplo
```

## Servidor de Desenvolvimento

```bash
cd meu-app
npm install
npm run dev
```

Saida:

```
🔧 Bazari Dev Server

App: Meu App
Version: 0.1.0

✓ Hot Module Replacement (HMR) ativo
✓ TypeScript suportado
✓ SDK integrado

📱 Preview no Bazari:
https://bazari.libervia.xyz/app/developer/preview?url=http://localhost:3333
```

## Preview no Bazari

O link de Preview permite testar seu app dentro do ambiente real do Bazari:

1. Execute `npm run dev` no seu projeto
2. Copie o link de Preview mostrado no terminal
3. O app carrega no iframe do Developer Portal
4. Veja os logs do SDK no console lateral

> **Importante:** Algumas funcionalidades do SDK so funcionam quando o app esta rodando dentro do Bazari.

## Build para Producao

```bash
npm run build
```

O CLI detecta automaticamente o tipo de projeto:

- **Vite:** Executa `vite build` com TypeScript check
- **Vanilla:** Copia arquivos de `public/` para `dist/`

Saida:

```
📦 Building Bazari App

Build Output:

  Directory: /path/to/dist
  Size:      156.24 KB
  Hash:      a1b2c3d4e5f6...
  Version:   0.1.0
  Builder:   Vite

✓ Ready for deployment!
```

---

# Quick Start - Seu Primeiro App

Crie um app React + TypeScript que mostra o saldo do usuario em 10 minutos.

## Passo 1: Instalar o CLI

```bash
npm install -g @bazari.libervia.xyz/cli
bazari --version
```

## Passo 2: Fazer Login

```bash
bazari login
```

## Passo 3: Criar o Projeto

```bash
bazari create meu-primeiro-app
cd meu-primeiro-app
npm install
```

## Passo 4: Iniciar o Servidor

```bash
npm run dev
```

## Passo 5: Testar no Bazari

Abra o link de Preview mostrado no terminal.

## Passo 6: Modificar o App

Edite `src/App.tsx`:

```tsx
import { useBazari } from './hooks/useBazari';
import { UserCard } from './components/UserCard';

function App() {
  const { sdk, user, balance, isLoading, isInBazari } = useBazari();

  const handleTransfer = async () => {
    if (sdk) {
      const result = await sdk.wallet.requestTransfer({
        to: '@destinatario',
        amount: 1,
        token: 'BZR',
        memo: 'Pagamento teste'
      });
      console.log('Transfer result:', result);
    }
  };

  if (isLoading) {
    return <div className="loading">Carregando...</div>;
  }

  if (!isInBazari) {
    return (
      <div className="warning-card">
        <h2>⚠️ Modo de Desenvolvimento</h2>
        <p>Use o Preview Mode para testar o SDK</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1>💰 Meu Primeiro App</h1>
      {user && <UserCard user={user} balance={balance} />}
      <button onClick={handleTransfer}>Enviar 1 BZR</button>
    </div>
  );
}

export default App;
```

## Passo 7: Configurar API Key

Crie `.env.production`:

```bash
VITE_BAZARI_API_KEY=baz_app_xxxxxxxxxxxxxxxx
```

## Passo 8: Publicar

```bash
bazari validate
npm run build
bazari publish
```

## Hook useBazari

O template inclui um hook pronto:

```tsx
import { useBazari } from './hooks/useBazari';

function MyComponent() {
  const {
    sdk,         // Instancia do SDK
    user,        // Usuario atual (ou null)
    balance,     // Saldo em BZR
    isLoading,   // Estado de carregamento
    error,       // Erro (se houver)
    isInBazari,  // Se esta rodando no Bazari
    refetch,     // Funcao para recarregar dados
  } = useBazari();
}
```

---

# Conceitos Basicos

## O que e um Bazari App?

Um Bazari App e uma aplicacao web que roda dentro da plataforma Bazari, em um iframe isolado. Apps podem:

- Acessar informacoes do usuario (com permissao)
- Interagir com a wallet BZR
- Usar storage persistente
- Mostrar notificacoes e modais
- Interagir com smart contracts

## Manifest (bazari.manifest.json)

Todo app precisa de um arquivo `bazari.manifest.json`:

```json
{
  "appId": "com.meudev.meuapp",
  "name": "Meu App",
  "slug": "meu-app",
  "version": "1.0.0",
  "description": "Descricao curta do app",
  "longDescription": "Descricao longa e detalhada",
  "category": "tools",
  "tags": ["utilidade", "financas"],
  "icon": "path/ou/url/icon.png",
  "color": "#6366f1",
  "entryPoint": "index.html",
  "screenshots": ["url1.png", "url2.png"],
  "permissions": [
    { "id": "user.profile.read", "reason": "Para mostrar seu nome", "optional": false },
    { "id": "wallet.balance.read", "reason": "Para mostrar seu saldo" }
  ],
  "sdkVersion": "0.1.0",
  "distribution": {
    "appStore": true,
    "external": false,
    "allowedOrigins": []
  },
  "monetizationType": "FREE",
  "price": null
}
```

### Campos Obrigatorios

| Campo | Descricao | Exemplo |
|-------|-----------|---------|
| `appId` | Identificador unico (reverse domain) | `com.acme.myapp` |
| `name` | Nome do app | `Meu App` |
| `slug` | URL amigavel | `meu-app` |
| `version` | Versao semantica | `1.0.0` |
| `description` | Descricao curta | `App incrivel` |
| `category` | Categoria | `tools`, `finance`, `social`, etc |

### Campos Opcionais

| Campo | Descricao |
|-------|-----------|
| `icon` | URL ou path do icone (512x512) |
| `color` | Cor tema do app (#hex) |
| `permissions` | Array de permissoes |
| `sdkVersion` | Versao do SDK usada |
| `monetizationType` | `FREE`, `PAID`, `FREEMIUM`, `SUBSCRIPTION` |
| `price` | Preco em BZR (se paid) |
| `distribution` | Configuracao de distribuicao |

### Campo Distribution

```json
{
  "distribution": {
    "appStore": true,
    "external": true,
    "allowedOrigins": ["https://meusite.com", "https://app.meusite.com"]
  }
}
```

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `appStore` | boolean | Publicar na App Store Bazari (iframe) |
| `external` | boolean | Gerar API Key para SDK externo |
| `allowedOrigins` | string[] | Dominios permitidos para SDK externo |

**Cenarios de uso:**

| appStore | external | Uso |
|----------|----------|-----|
| true | false | App tradicional no Bazari (padrao) |
| false | true | Integracao em site externo |
| true | true | Ambos os modelos |

## Permissoes

Apps so podem acessar o que foi declarado no manifest e aprovado pelo usuario:

| Permissao | Descricao |
|-----------|-----------|
| `user.profile.read` | Ler perfil do usuario |
| `wallet.balance.read` | Ler saldo e historico |
| `wallet.transfer.request` | Solicitar transferencias |
| `storage.app` | Ler/escrever storage local |
| `notifications.send` | Mostrar notificacoes |
| `contracts.read` | Consultar contratos |
| `contracts.write` | Interagir com contratos |

## Ciclo de Vida

```
1. Usuario instala app (App Store)
        ↓
2. App e adicionado ao launcher
        ↓
3. Usuario abre o app
        ↓
4. Plataforma carrega app em iframe
        ↓
5. App inicializa SDK
        ↓
6. SDK conecta via postMessage
        ↓
7. App solicita dados (auth, wallet, etc)
        ↓
8. Usuario usa o app
        ↓
9. Usuario fecha o app
```

## Ambiente de Execucao

Apps rodam em um iframe com restricoes:

### Permitido
- Qualquer framework JS (React, Vue, vanilla)
- Requests para APIs proprias
- LocalStorage/SessionStorage via SDK
- Cookies de primeira parte

### Bloqueado
- Acesso ao DOM da plataforma
- Cookies de terceiros
- Popup/abrir novas janelas (use sdk.ui)
- Downloads automaticos

## Monetizacao

| Tipo | Descricao |
|------|-----------|
| `FREE` | App gratuito |
| `PAID` | Usuario paga X BZR para instalar |
| `FREEMIUM` | Gratuito com compras internas |
| `SUBSCRIPTION` | Assinatura recorrente (em breve) |

### Revenue Share

| Tier | Instalacoes | Sua % |
|------|-------------|-------|
| Starter | 0 - 1.000 | 70% |
| Growth | 1.001 - 10.000 | 75% |
| Scale | 10.001 - 100.000 | 80% |
| Enterprise | 100.001+ | 85% |

---

# SDK Overview

O `@bazari.libervia.xyz/app-sdk` e a biblioteca oficial para desenvolver apps que integram com a plataforma Bazari.

## Modos de Uso

| Modo | Descricao | Caso de Uso |
|------|-----------|-------------|
| **App Store** | App roda em iframe dentro do Bazari | Apps nativos da plataforma |
| **External** | App roda em site externo | Integracao em e-commerce, sites, etc |

## Instalacao

```bash
npm install @bazari.libervia.xyz/app-sdk
```

Ou via CDN:

```html
<script type="module">
  import { BazariSDK } from 'https://unpkg.com/@bazari.libervia.xyz/app-sdk@latest/dist/index.mjs';
</script>
```

## Inicializacao

### Modo App Store (iframe)

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({
  apiKey: import.meta.env.VITE_BAZARI_API_KEY,  // Opcional em dev, obrigatoria em prod
  debug: import.meta.env.DEV,                    // Mostra logs em desenvolvimento
});
```

### Modo Externo (SDK Externo)

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({
  apiKey: 'baz_sdk_abc123...',      // Obrigatoria
  secretKey: 'sk_secret_xyz789...', // Obrigatoria (server-side apenas!)
  mode: 'external',                  // Indica modo externo
});
```

> **Seguranca:** O `secretKey` deve ser usado apenas no servidor. Nunca exponha no frontend!

## API Key e Secret Key

### Para App Store

| Ambiente | API Key |
|----------|---------|
| Developer Preview | Opcional |
| Producao | Obrigatoria |

### Para SDK Externo

| Credencial | Onde usar | Proposito |
|------------|-----------|-----------|
| API Key | Frontend + Backend | Identifica o app |
| Secret Key | Backend apenas | Autentica requisicoes |

## APIs Disponiveis

```javascript
sdk.auth      // Autenticacao e usuario
sdk.wallet    // Wallet BZR/ZARI
sdk.storage   // Storage persistente
sdk.ui        // Toasts, modais, navegacao
sdk.events    // Eventos do sistema
sdk.contracts // Smart contracts ink!
```

## Metodos Utilitarios

### isInBazari()

Verifica se o app esta rodando dentro da plataforma Bazari.

```javascript
if (!sdk.isInBazari()) {
  showMessage('Por favor, abra este app dentro do Bazari');
}
```

### getVersion()

Retorna a versao do SDK.

```javascript
const version = sdk.getVersion();
// '0.2.0'
```

## TypeScript

O SDK e escrito em TypeScript e inclui tipos completos:

```typescript
import { BazariSDK, SDKUser, SDKBalance } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK();

const user: SDKUser = await sdk.auth.getCurrentUser();
const balance: SDKBalance = await sdk.wallet.getBalance();
```

## Tratamento de Erros

```javascript
try {
  await sdk.wallet.requestTransfer({ ... });
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    // App nao tem permissao wallet:write
  } else if (error.code === 'USER_CANCELLED') {
    // Usuario cancelou a operacao
  } else if (error.code === 'INSUFFICIENT_BALANCE') {
    // Saldo insuficiente
  } else if (error.code === 'TIMEOUT') {
    // Timeout na operacao
  } else {
    // Erro desconhecido
    console.error(error);
  }
}
```

---

# SDK - Auth API

API de autenticacao e informacoes do usuario.

## Permissao Necessaria

- `user.profile.read` - Para acessar informacoes do usuario

## Metodos

### getCurrentUser()

Retorna informacoes do usuario logado.

```typescript
const user = await sdk.auth.getCurrentUser();
```

**Retorno:**

```typescript
interface SDKUser {
  id: string;          // ID unico do usuario
  handle: string;      // @handle do usuario
  displayName: string; // Nome de exibicao
  avatar?: string;     // URL do avatar
  roles: string[];     // Roles do usuario ['user', 'seller', etc]
}
```

**Exemplo:**

```javascript
const user = await sdk.auth.getCurrentUser();

console.log(`Ola, ${user.displayName}!`);
console.log(`Handle: @${user.handle}`);

if (user.roles.includes('seller')) {
  showSellerFeatures();
}
```

### getPermissions()

Retorna as permissoes do app.

```typescript
const permissions = await sdk.auth.getPermissions();
```

**Retorno:**

```typescript
interface SDKPermissions {
  granted: string[];  // Permissoes aprovadas
  denied: string[];   // Permissoes negadas
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

## Permissoes Disponiveis

| Permissao | Descricao |
|-----------|-----------|
| `profile:read` | Ler informacoes do usuario |
| `wallet:read` | Ver saldo e historico |
| `wallet:write` | Solicitar transferencias |
| `storage` | Usar storage persistente |
| `notifications` | Enviar notificacoes |
| `contracts:read` | Consultar contratos |
| `contracts:write` | Executar transacoes em contratos |

## Fluxo de Autorizacao

```
1. App declara permissoes no manifest
        ↓
2. Usuario instala app
        ↓
3. Plataforma mostra permissoes solicitadas
        ↓
4. Usuario aprova ou nega
        ↓
5. App pode usar apenas permissoes aprovadas
```

## Boas Praticas

### 1. Solicite apenas o necessario

```json
// ✅ Bom - so o necessario
{
  "permissions": ["wallet:read"]
}

// ❌ Ruim - pede tudo
{
  "permissions": ["wallet:read", "wallet:write", "contracts:write", "notifications"]
}
```

### 2. Funcione sem permissoes opcionais

```javascript
async function initApp() {
  const perms = await sdk.auth.getPermissions();

  // Features basicas sempre funcionam
  loadMainContent();

  // Features premium so se tiver permissao
  if (perms.granted.includes('notifications')) {
    enableNotifications();
  }
}
```

---

# SDK - Wallet API

API para interagir com a wallet BZR do usuario.

## Permissoes Necessarias

- `wallet.balance.read` - Para ver saldo e historico
- `wallet.transfer.request` - Para solicitar transferencias

## Metodos

### getBalance()

Retorna o saldo atual do usuario.

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

Retorna historico de transacoes.

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

Solicita transferencia de tokens.

```typescript
const result = await sdk.wallet.requestTransfer({
  to: string;      // Endereco ou @handle
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
      // Usuario fechou o modal - nao mostrar erro
      break;

    case 'INVALID_ADDRESS':
      sdk.ui.error('Endereco invalido');
      break;

    case 'PERMISSION_DENIED':
      sdk.ui.error('App nao tem permissao para transferencias');
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

## Fluxo de Transferencia

```
1. App chama requestTransfer()
        ↓
2. Plataforma mostra modal de confirmacao
   ┌─────────────────────────────┐
   │  Confirmar Transferencia    │
   │                             │
   │  Para: @vendedor            │
   │  Valor: 50 BZR              │
   │  Memo: Compra - Produto ABC │
   │                             │
   │  [Cancelar]  [Confirmar]    │
   └─────────────────────────────┘
        ↓
3. Usuario confirma
        ↓
4. Transacao e processada
        ↓
5. Resultado retorna ao app
```

## Eventos de Wallet

```javascript
// Escutar mudancas de saldo
sdk.events.on('wallet:balance-changed', (data) => {
  console.log('Novo saldo:', data.balance);
  updateBalanceUI(data.balance);
});

// Escutar transacoes recebidas
sdk.events.on('wallet:received', (data) => {
  sdk.ui.success(`Recebeu ${data.amount} ${data.token}!`);
});
```

## Boas Praticas

### 1. Verificar saldo antes de solicitar

```javascript
async function checkout(total) {
  const balance = await sdk.wallet.getBalance();
  const currentBzr = parseFloat(balance.bzr) / 1e12; // Converter de wei

  if (currentBzr < total) {
    sdk.ui.error(`Saldo insuficiente. Voce precisa de ${total} BZR.`);
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

---

# SDK - Storage API

Armazena dados persistentes do app.

## Permissao Necessaria

- `storage.app` - Para usar storage persistente

## Metodos

### set(key, value)

Salva um valor.

```javascript
await sdk.storage.set('config', { theme: 'dark', language: 'pt' });
await sdk.storage.set('counter', 42);
await sdk.storage.set('name', 'Joao');
```

### get(key)

Recupera um valor.

```javascript
const config = await sdk.storage.get('config');
// { theme: 'dark', language: 'pt' }

const counter = await sdk.storage.get('counter');
// 42
```

### remove(key)

Remove um valor.

```javascript
await sdk.storage.remove('config');
```

### clear()

Limpa todos os dados do app.

```javascript
await sdk.storage.clear();
```

## Exemplo Completo

```javascript
// Salvar preferencias do usuario
async function savePreferences(prefs) {
  await sdk.storage.set('user_preferences', prefs);
  sdk.ui.success('Preferencias salvas!');
}

// Carregar preferencias
async function loadPreferences() {
  const prefs = await sdk.storage.get('user_preferences');
  return prefs || { theme: 'light', notifications: true };
}

// Resetar preferencias
async function resetPreferences() {
  await sdk.storage.remove('user_preferences');
  sdk.ui.info('Preferencias resetadas');
}
```

---

# SDK - UI API

Componentes de interface e navegacao.

## Metodos

### Toasts

```javascript
await sdk.ui.success('Operacao realizada com sucesso!');
await sdk.ui.error('Ocorreu um erro');
await sdk.ui.info('Informacao importante');
await sdk.ui.warning('Atencao!');
```

### Modal de Confirmacao

```javascript
const confirmed = await sdk.ui.showConfirm({
  title: 'Confirmar acao',
  message: 'Tem certeza que deseja continuar?',
  confirmText: 'Sim, continuar',
  cancelText: 'Cancelar'
});

if (confirmed) {
  // Usuario confirmou
  proceedWithAction();
}
```

## Exemplo

```javascript
async function deleteItem(itemId) {
  const confirmed = await sdk.ui.showConfirm({
    title: 'Excluir item',
    message: 'Esta acao nao pode ser desfeita.',
    confirmText: 'Excluir',
    cancelText: 'Manter'
  });

  if (confirmed) {
    await api.deleteItem(itemId);
    sdk.ui.success('Item excluido!');
  }
}
```

---

# SDK - Events API

Sistema de eventos do app.

## Metodos

### on(event, handler)

Registra um listener para um evento.

```javascript
sdk.events.on('wallet:balance-changed', (data) => {
  console.log('Novo saldo:', data.balance);
});
```

### off(event, handler)

Remove um listener.

```javascript
const handler = (data) => console.log(data);
sdk.events.on('wallet:balance-changed', handler);

// Mais tarde...
sdk.events.off('wallet:balance-changed', handler);
```

## Eventos Disponiveis

| Evento | Descricao | Dados |
|--------|-----------|-------|
| `wallet:balance-changed` | Saldo alterado | `{ balance }` |
| `wallet:received` | Recebeu tokens | `{ amount, token, from }` |
| `wallet:sent` | Enviou tokens | `{ amount, token, to }` |
| `user:profile-updated` | Perfil atualizado | `{ user }` |

## Exemplo

```javascript
// Manter UI atualizada
sdk.events.on('wallet:balance-changed', (data) => {
  document.getElementById('balance').textContent = data.balance.formatted.bzr;
});

// Notificar recebimentos
sdk.events.on('wallet:received', (data) => {
  sdk.ui.success(`Voce recebeu ${data.amount} ${data.token}!`);
});
```

---

# SDK - Contracts API

Interage com smart contracts ink!.

## Permissoes Necessarias

- `contracts.read` - Para consultar contratos
- `contracts.write` - Para executar transacoes

## Deploy de Contrato de Fidelidade

```javascript
const contract = await sdk.contracts.deployLoyalty({
  name: 'Meus Pontos',
  symbol: 'PTS',
  bzrToPointsRatio: 100,  // 1 BZR = 100 pontos
  pointsToBzrRatio: 100   // 100 pontos = 1 BZR
});

console.log('Contrato deployado:', contract.address);
```

## Interagir com Contrato

```javascript
// Obter instancia do contrato
const loyalty = sdk.contracts.loyalty(contract.address);

// Emitir pontos
await loyalty.issuePoints(userAddress, 1000, 'Compra de R$ 100');

// Consultar saldo de pontos
const points = await loyalty.balanceOf(userAddress);

// Resgatar pontos por BZR
await loyalty.redeemPoints(500);
```

## Estrutura de Tiers

```javascript
const tiers = await loyalty.getTiers();
// [
//   { name: 'Bronze', minPoints: 0, multiplier: 1.0 },
//   { name: 'Prata', minPoints: 1000, multiplier: 1.5 },
//   { name: 'Ouro', minPoints: 5000, multiplier: 2.0 },
//   { name: 'Platina', minPoints: 10000, multiplier: 3.0 }
// ]
```

---

# Publicacao de Apps

## Comando Publish

```bash
bazari publish [options]
```

## Opcoes

| Opcao | Descricao | Padrao |
|-------|-----------|--------|
| `-d, --dir <dir>` | Diretorio do build | `dist` |
| `-t, --target <target>` | Target de publicacao | auto (via manifest) |
| `-o, --origin <urls...>` | Origens permitidas (SDK externo) | - |
| `--changelog <text>` | Changelog da versao | - |
| `--no-submit` | Upload sem submeter para review | false |

## Targets de Publicacao

### appstore (padrao)

Publica na App Store Bazari. O app sera carregado em iframe dentro da plataforma.

```bash
bazari publish --target appstore
```

**Fluxo:**
1. Cria tarball do diretorio `dist/`
2. Upload para IPFS
3. Submete para review
4. Apos aprovacao, app fica disponivel na App Store

### external

Gera API Key para usar o SDK em sites externos.

```bash
bazari publish --target external --origin https://meusite.com
```

**Fluxo:**
1. Cria registro de SDK App
2. Gera API Key e Secret Key
3. Retorna credenciais

### both

Publica na App Store E gera API Key para SDK externo.

```bash
bazari publish --target both --origin https://meusite.com
```

## Exemplos

### Publicar na App Store

```bash
bazari build
bazari publish

# Saida:
# ✓ Bundle criado (156.24 KB)
# ✓ Upload para IPFS: QmXyz...
# ✓ Submetido para review
#
# Status: Pending Review
# CID: QmXyz123...
```

### Publicar para SDK Externo

```bash
bazari publish --target external --origin https://meusite.com https://app.meusite.com

# Saida:
# ✓ API Key gerada
#
# API Key: baz_sdk_abc123xyz...
# Secret Key: sk_secret_987xyz...
#
# ⚠️ Salve o Secret Key! Nao sera mostrado novamente.
```

### Com changelog

```bash
bazari publish --changelog "Corrigido bug de login e melhorado performance"
```

## Diferencas entre Targets

| Caracteristica | App Store | External |
|----------------|-----------|----------|
| Onde roda | Iframe no Bazari | Seu proprio site |
| Autenticacao | Automatica (usuario logado) | Via API Key + OAuth |
| Bundle | Upload para IPFS | Nao necessario |
| Review | Sim | Sim (para aprovar API Key) |
| Rate Limiting | Por app | Por API Key |
| Analytics | Dashboard Bazari | Dashboard + Logs proprios |

---

# Gerenciamento de API Keys

## Comandos

```bash
bazari keys <command> [options]
```

| Comando | Descricao |
|---------|-----------|
| `list` | Lista todas as API Keys |
| `show [slug]` | Mostra detalhes de uma API Key |
| `rotate [slug]` | Rotaciona API Key ou Secret Key |
| `revoke [slug]` | Revoga API Key permanentemente |

## bazari keys list

```bash
bazari keys list

# Saida:
# Your API Keys:
#
# Meu App (meu-app)
#   API Key:  baz_sdk_abc123...
#   Status:   APPROVED
#   Origins:  https://meusite.com
#   Requests: 1,234
#   Created:  01/12/2024
```

**Status possiveis:**
- `PENDING` - Aguardando aprovacao
- `APPROVED` - Aprovado e ativo
- `REJECTED` - Rejeitado
- `SUSPENDED` - Suspenso temporariamente

## bazari keys show

```bash
bazari keys show meu-app

# Saida:
# Meu App (meu-app)
#
# API Key:     baz_sdk_abc123xyz...
# Status:      APPROVED
# Origins:     https://meusite.com
# Permissions: user:read, wallet:read, wallet:transfer
#
# Statistics:
#   Total Requests: 12,345
#   Last Request:   10/12/2024, 14:30:00
#   Created:        01/12/2024, 10:00:00
```

## bazari keys rotate

### Rotacionar Secret Key (padrao)

```bash
bazari keys rotate meu-app

# ✓ Secret key rotated
# New Secret Key: sk_secret_newxyz789...
# ⚠️ Save this securely! It will NOT be shown again.
```

### Rotacionar API Key (cuidado!)

```bash
bazari keys rotate --api meu-app

# ⚠️ This will invalidate the current API key. Continue? (y/N)
# ✓ API key rotated
# New API Key: baz_sdk_newabc123...
```

## bazari keys revoke

```bash
bazari keys revoke meu-app

# ⚠️ This will PERMANENTLY revoke the API key. Continue? (y/N) y
# Type "meu-app" to confirm: meu-app
# ✓ API key revoked
```

## Permissoes da API Key

As permissoes sao definidas no manifest e convertidas:

| Manifest | API Key |
|----------|---------|
| `user.profile.read` | `user:read` |
| `wallet.balance.read` | `wallet:read` |
| `wallet.transfer.request` | `wallet:transfer` |
| `storage.app` | `storage:read` |
| `notifications.send` | `ui:toast` |

---

# Boas Praticas de Seguranca

## Secret Key

1. **Nunca exponha no frontend** - O Secret Key deve ficar apenas no servidor
2. **Use variaveis de ambiente** - Nao commite secrets no codigo
3. **Rotacione periodicamente** - A cada 90 dias e uma boa pratica
4. **Rotacione imediatamente** se suspeitar de vazamento

```bash
# Em caso de vazamento
bazari keys rotate meu-app
```

## API Key

1. **Pode ser exposta no frontend** - E identificacao, nao autenticacao
2. **Use allowedOrigins** - Restrinja a dominios especificos
3. **Monitore uso** - Verifique requests no dashboard

## Armazenamento Seguro

```bash
# Servidor (Node.js)
# .env (NAO commitar!)
BAZARI_API_KEY=baz_sdk_abc123...
BAZARI_SECRET_KEY=sk_secret_xyz789...
```

```javascript
// Codigo
const apiKey = process.env.BAZARI_API_KEY;
const secretKey = process.env.BAZARI_SECRET_KEY;
```

## Configuracao de Producao

```bash
# .env.production (NAO commitar!)
VITE_BAZARI_API_KEY=baz_app_xxxxxxxxxxxxxxxx
```

---

# Troubleshooting

## CLI nao encontrado apos instalacao

Verifique se o diretorio de binarios globais do npm esta no PATH:

```bash
npm bin -g

# Adicione ao seu .bashrc ou .zshrc
export PATH="$(npm bin -g):$PATH"
```

## Erro de permissao no npm global

```bash
# Opcao 1: Usar npx (sem instalacao global)
npx @bazari.libervia.xyz/cli create meu-app

# Opcao 2: Configurar npm para nao usar sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Adicione ~/.npm-global/bin ao seu PATH
```

## Build directory not found

```
Error: Build directory "dist" not found
Run "bazari build" first
```

**Solucao:** Execute `bazari build` antes de publicar.

## Origin required

```
Error: --origin required for external target
```

**Solucao:** Informe as origens permitidas:
```bash
bazari publish --target external --origin https://meusite.com
```

## Not logged in

```
Error: Not logged in
Run "bazari login" first
```

**Solucao:** Execute `bazari login`.

## Vite nao inicia

```bash
# Verifique se as dependencias estao instaladas
npm install

# Ou tente executar diretamente
npx vite --port 3333
```

## SDK so funciona no Bazari

Algumas funcionalidades do SDK so funcionam quando o app esta rodando dentro do Bazari (iframe). Use o Preview Mode para testar:

```
https://bazari.libervia.xyz/app/developer/preview?url=http://localhost:3333
```

---

# Referencia Rapida

## Comandos CLI

```bash
# Autenticacao
bazari login
bazari logout
bazari whoami

# Projeto
bazari create <name>
bazari dev
bazari build
bazari validate

# Publicacao
bazari publish
bazari publish --target external --origin https://site.com
bazari publish --target both --origin https://site.com

# API Keys
bazari keys list
bazari keys show <slug>
bazari keys rotate <slug>
bazari keys revoke <slug>

# Manifest
bazari manifest sync
```

## SDK APIs

```javascript
// Inicializacao
const sdk = new BazariSDK({ apiKey: '...', debug: true });

// Auth
await sdk.auth.getCurrentUser();
await sdk.auth.getPermissions();

// Wallet
await sdk.wallet.getBalance();
await sdk.wallet.getHistory();
await sdk.wallet.requestTransfer({ to, amount, token, memo });

// Storage
await sdk.storage.set(key, value);
await sdk.storage.get(key);
await sdk.storage.remove(key);
await sdk.storage.clear();

// UI
await sdk.ui.success(message);
await sdk.ui.error(message);
await sdk.ui.info(message);
await sdk.ui.warning(message);
await sdk.ui.showConfirm({ title, message, confirmText, cancelText });

// Events
sdk.events.on(event, handler);
sdk.events.off(event, handler);

// Contracts
await sdk.contracts.deployLoyalty({ name, symbol, bzrToPointsRatio, pointsToBzrRatio });
const loyalty = sdk.contracts.loyalty(address);

// Utils
sdk.isInBazari();
sdk.getVersion();
```

---

**Versao:** 0.2.26
**Ultima atualizacao:** Dezembro 2024
