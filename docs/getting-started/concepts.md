# Conceitos Básicos

Entenda os conceitos fundamentais antes de desenvolver para o Bazari.

## O que é um Bazari App?

Um Bazari App é uma aplicação web que roda dentro da plataforma Bazari, em um iframe isolado. Apps podem:

- Acessar informações do usuário (com permissão)
- Interagir com a wallet BZR
- Usar storage persistente
- Mostrar notificações e modais
- Interagir com smart contracts

## Manifest

Todo app precisa de um arquivo `bazari.manifest.json` que define:

```json
{
  "appId": "com.meudev.meuapp",
  "name": "Meu App",
  "slug": "meu-app",
  "version": "1.0.0",
  "description": "Descrição curta do app",
  "category": "tools",
  "permissions": ["wallet:read", "storage"],
  "sdkVersion": "0.1.0",
  "monetizationType": "free"
}
```

### Campos Obrigatórios

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `appId` | Identificador único (reverse domain) | `com.acme.myapp` |
| `name` | Nome do app | `Meu App` |
| `slug` | URL amigável | `meu-app` |
| `version` | Versão semântica | `1.0.0` |
| `description` | Descrição curta | `App incrível` |
| `category` | Categoria | `tools`, `games`, etc |

### Campos Opcionais

| Campo | Descrição |
|-------|-----------|
| `icon` | URL ou path do ícone (512x512) |
| `color` | Cor tema do app (#hex) |
| `permissions` | Array de permissões |
| `sdkVersion` | Versão do SDK usada |
| `monetizationType` | `free`, `paid`, `freemium` |
| `price` | Preço em BZR (se paid) |

## Permissões

Apps só podem acessar o que foi declarado no manifest e aprovado pelo usuário:

| Permissão | Descrição |
|-----------|-----------|
| `wallet:read` | Ler saldo e histórico |
| `wallet:write` | Solicitar transferências |
| `storage` | Ler/escrever storage local |
| `profile:read` | Ler perfil do usuário |
| `notifications` | Mostrar notificações |
| `contracts:read` | Consultar contratos |
| `contracts:write` | Interagir com contratos |

### Exemplo de Solicitação

```javascript
// No manifest.json
"permissions": ["wallet:read", "storage"]

// No código - funciona automaticamente
const balance = await sdk.wallet.getBalance();
await sdk.storage.set('key', 'value');

// Isso vai falhar sem permissão
await sdk.wallet.requestTransfer({...}); // Error: Permission denied
```

## SDK

O SDK (`@bazari.libervia.xyz/app-sdk`) é a biblioteca oficial para comunicar com a plataforma:

```javascript
import { BazariSDK } from '@bazari.libervia.xyz/app-sdk';

const sdk = new BazariSDK({ debug: true });

// APIs disponíveis
sdk.auth      // Autenticação
sdk.wallet    // Wallet BZR
sdk.storage   // Storage persistente
sdk.ui        // Toasts, modais, navegação
sdk.events    // Eventos do sistema
sdk.contracts // Smart contracts ink!
```

## Ciclo de Vida

```
1. Usuário instala app (App Store)
        ↓
2. App é adicionado ao launcher
        ↓
3. Usuário abre o app
        ↓
4. Plataforma carrega app em iframe
        ↓
5. App inicializa SDK
        ↓
6. SDK conecta via postMessage
        ↓
7. App solicita dados (auth, wallet, etc)
        ↓
8. Usuário usa o app
        ↓
9. Usuário fecha o app
```

## Ambiente de Execução

Apps rodam em um iframe com as seguintes restrições:

### Permitido
- Qualquer framework JS (React, Vue, vanilla)
- Requests para APIs próprias
- LocalStorage/SessionStorage via SDK
- Cookies de primeira parte

### Bloqueado
- Acesso ao DOM da plataforma
- Cookies de terceiros
- Popup/abrir novas janelas (use sdk.ui)
- Downloads automáticos

## Monetização

Apps podem ser monetizados de três formas:

### 1. Gratuito (free)
```json
"monetizationType": "free"
```

### 2. Pago (paid)
```json
"monetizationType": "paid",
"price": 10
```
Usuário paga 10 BZR para instalar.

### 3. Freemium
```json
"monetizationType": "freemium"
```
App gratuito com compras internas (In-App Purchases).

## Revenue Share

Desenvolvedores recebem porcentagem das vendas:

| Tier | Instalações | Sua % |
|------|-------------|-------|
| Starter | 0 - 1.000 | 70% |
| Growth | 1.001 - 10.000 | 75% |
| Scale | 10.001 - 100.000 | 80% |
| Enterprise | 100.001+ | 85% |

## Próximos Passos

- [Referência do SDK](../sdk/overview.md)
- [Guia de pagamentos](../guides/payment-integration.md)
- [Publicar seu app](../cli/publish.md)
