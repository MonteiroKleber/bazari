# BAZARI - Mapeamento Completo dos Módulos Econômicos

Data: 2025-10-26
Versão: 1.0

---

## INDICE
1. [Sistema de Wallet (BZR)](#1-sistema-de-wallet-bzr)
2. [Módulo P2P/Câmbio](#2-módulo-p2pcâmbio-bzr--fiat)
3. [Autenticação e Contas](#3-autenticação-e-contas)
4. [Infraestrutura DAO](#4-infraestrutura-dao)
5. [Arquitetura de Integração](#5-arquitetura-de-integração)

---

## 1. SISTEMA DE WALLET (BZR)

### 1.1 Visão Geral
O sistema de wallet permite aos usuários gerenciar saldos de BZR (token nativo da Bazarichain) e assets adicionais via Polkadot.js, de forma totalmente client-side.

### 1.2 Arquivos-Chave

#### Backend
- **Sem backend para wallet**: O sistema é totalmente client-side
- `/root/bazari/apps/api/src/config/payments.ts` - Configuração de escrow e fees

#### Frontend - Estrutura Principal
```
/root/bazari/apps/web/src/modules/wallet/
├── pages/
│   ├── WalletHome.tsx           (Router principal)
│   ├── WalletDashboard.tsx       (Overview de saldos)
│   ├── AccountsPage.tsx          (Gerenciamento de contas)
│   ├── SendPage.tsx              (Transferências)
│   └── ReceivePage.tsx           (Recebimento com QR)
├── services/
│   ├── polkadot.ts              (API connection com retry)
│   ├── balances.ts              (Query balances - nativo + assets)
│   ├── history.ts               (Histórico de transferências)
│   ├── assets.ts                (Metadata de assets)
│   └── index.ts                 (Exports)
├── hooks/
│   ├── useVaultAccounts.ts       (Gerenciamento de contas do vault)
│   ├── useChainProps.ts          (Props da chain: decimals, symbol)
│   └── useTransactionFee.ts      (Estimativa de fees)
├── store/
│   └── tokens.store.ts           (Registry de tokens customizados)
├── utils/
│   └── format.ts                 (Formatting: planck to BZR, addresses)
├── pin/
│   ├── PinService.ts             (Serviço de PIN)
│   └── PinProvider.tsx           (Context de PIN)
└── components/
    ├── PinDialog.tsx             (Modal de PIN)
    ├── AddressQr.tsx             (QR do endereço)
    └── Scanner.tsx               (Leitor de QR)
```

### 1.3 Estrutura de Dados

#### Saldos (BalanceSnapshot)
```typescript
interface BalanceSnapshot {
  assetId: string;              // 'native' ou ID numérico
  symbol: string;               // 'BZR' ou símbolo do asset
  decimals: number;             // Normalmente 12 para BZR
  free: bigint;                 // Saldo disponível (em planck)
  reserved: bigint;             // Saldo reservado
  frozen: bigint;               // Saldo congelado
  updatedAt: number;            // Timestamp
}
```

#### Histórico de Transferências (TransferHistoryItem)
```typescript
interface TransferHistoryItem {
  id: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string | null;
  timestamp: number;
  section: 'balances' | 'assets';  // Pallet
  method: string;                    // 'Transfer' ou 'Transferred'
  assetId?: string;                  // Apenas para assets
  from: string;
  to: string;
  amount: bigint;
  direction: 'in' | 'out';
}
```

#### Contas Vault (VaultAccountRecord)
```typescript
interface VaultAccountRecord {
  id: string;                   // Address SS58
  address: string;              // Mesmo que id
  name?: string;                // Nome customizado
  cipher: string;               // Dados criptografados (seed)
  iv: string;                   // IV do AES-GCM
  salt: string;                 // Salt do PBKDF2
  iterations: number;           // Iterações PBKDF2
  createdAt: string;
  version: number;              // Versão do esquema
}
```

### 1.4 Fluxo de Operações

#### Envio de Fundos (SendPage.tsx)
1. Usuário seleciona asset (nativo ou customizado)
2. Insere endereço do destinatário (validado com `isValidAddress`)
3. Insere quantidade em formato legível (convertida para planck)
4. Sistema estima fee via `useTransactionFee`
5. Requer confirmação de PIN via PinService
6. Assina com seed decriptada (ephemeral, imediatamente limpa)
7. Envia via `api.tx.balances.transferKeepAlive()` ou `api.tx.assets.transfer()`
8. Monitora status e historio atualiza automaticamente

#### Saldos e Monitoramento
- `getNativeBalance()` - Query imediata do saldo nativo
- `subscribeNativeBalance()` - Subscrição em tempo real
- `getAssetBalance()` / `subscribeAssetBalance()` - Mesmo para assets

#### Histórico
- `fetchRecentTransfers()` - Busca histórico paginado (até 25 eventos por vez)
- `subscribeTransferStream()` - Monitora novos blocos finalizados
- Suporta análise de eventos de 'balances.Transfer' e 'assets.Transferred'

### 1.5 Integração com Blockchain

#### Conexão Polkadot.js
```
Endpoint: ws://127.0.0.1:9944 (ou env VITE_BAZARICHAIN_WS)
Retry: Exponencial com backoff (1s até 15s)
Props obtidas via api.rpc.system.properties():
  - ss58Prefix (normalmente 42)
  - tokenSymbol ('BZR')
  - tokenDecimals (12)
```

#### Armazenamento de Chaves
- **Vault**: IndexedDB (`bazari-auth` database, versão 2)
- **Armazenamento**: Seed MNÊMONICA criptografada com AES-GCM
- **Derivação**: Via Polkadot.js `sr25519PairFromSeed`
- **Segurança**: PIN requerido para descriptografar (PBKDF2)
- **Limpeza**: Chaves secretas imediatamente zeradas após uso

### 1.6 Unidades e Conversão
- **BZR** = token nativo (12 casas decimais)
- **Planck** = unidade base (1 BZR = 10^12 planck)
- Conversão: `parseAmountToPlanck()` e `formatBalance()`

### 1.7 APIs Expostas

**Serviço de Balances** (`/root/bazari/apps/web/src/modules/wallet/services/balances.ts`):
- `getNativeBalance(address: string)` → BalanceSnapshot
- `subscribeNativeBalance(address, callback)` → unsubscribe fn
- `getAssetBalance(assetId, address, metadata?)` → BalanceSnapshot | null
- `subscribeAssetBalance(assetId, address, metadata, callback)` → unsubscribe fn

**Serviço de Histórico** (`services/history.ts`):
- `fetchRecentTransfers(address, options)` → { items, nextFromBlock }
- `subscribeTransferStream(address, handler)` → unsubscribe fn

---

## 2. MÓDULO P2P/CÂMBIO (BZR ↔ FIAT)

### 2.1 Visão Geral
Sistema de troca BZR por Real (via PIX) com escrow, reputação e chat integrado. Funciona com "makers" que publicam ofertas e "takers" que aceitam.

### 2.2 Arquivos-Chave

#### Backend (API)
```
/root/bazari/apps/api/src/routes/
├── p2p.offers.ts              (CRUD de ofertas)
├── p2p.orders.ts              (Fluxo de órdenes)
├── p2p.paymentProfile.ts       (Perfil de pagamento/PIX)
├── p2p.messages.ts             (Chat da ordem)
└── ../config/payments.ts       (Escrow config)
```

#### Frontend (Web)
```
/root/bazari/apps/web/src/modules/p2p/
├── api.ts                      (Client API)
├── pages/
│   ├── P2PHomePage.tsx         (Listagem pública + abas)
│   ├── P2POfferNewPage.tsx     (Criar oferta)
│   ├── P2POfferPublicPage.tsx  (Detalhe público da oferta)
│   ├── P2PMyOrdersPage.tsx     (Minhas órdenes)
│   ├── P2POrderRoomPage.tsx    (Sala com chat)
│   └── ... (outras páginas)
└── ... (componentes, hooks, etc)
```

### 2.3 Estrutura de Dados

#### P2POffer (Ofertas)
```typescript
model P2POffer {
  id: String                    // UUID
  ownerId: String               // User.id (quem publica)
  side: P2POfferSide            // BUY_BZR | SELL_BZR
  priceBRLPerBZR: Decimal       // Taxa de câmbio (2 casas)
  minBRL: Decimal               // Mínimo em R$ (2 casas)
  maxBRL: Decimal               // Máximo em R$ (2 casas)
  method: P2PPaymentMethod      // PIX (único suportado)
  autoReply: String?            // Mensagem automática
  status: P2POfferStatus        // ACTIVE | PAUSED | ARCHIVED
  createdAt: DateTime
  updatedAt: DateTime
}

enum P2POfferSide {
  BUY_BZR    // Maker compra BZR (taker paga em BRL)
  SELL_BZR   // Maker vende BZR (taker recebe em BRL)
}
```

#### P2POrder (Órdenes)
```typescript
model P2POrder {
  id: String
  offerId: String               // P2POffer.id
  makerId: String               // Quem publicou a oferta
  takerId: String               // Quem aceitou
  side: P2POfferSide
  priceBRLPerBZR: Decimal       // Snapshot do preço
  amountBZR: Decimal            // Quantidade em BZR (18 casas)
  amountBRL: Decimal            // Quantidade em BRL (2 casas)
  method: P2PPaymentMethod
  status: P2POrderStatus        // Ver enum abaixo
  
  // Escrow on-chain
  escrowTxHash: String?         // Hash da tx que travou BZR
  escrowAt: DateTime?           // Quando escrow foi confirmado
  releasedTxHash: String?       // Hash da liberação
  releasedAt: DateTime?         // Quando foi liberado
  
  // PIX
  pixKeySnapshot: String?       // Chave PIX do recebedor
  payerDeclaredAt: DateTime?    // Quando marcou como pago
  proofUrls: Json?              // Array de provas (screenshots, etc)
  
  expiresAt: DateTime           // 30 min após criação
  createdAt: DateTime
  updatedAt: DateTime
}

enum P2POrderStatus {
  DRAFT                         // Criada, ainda sem escrow
  AWAITING_ESCROW               // Aguardando BZR em escrow
  AWAITING_FIAT_PAYMENT         // Escrow confirmado, aguardando BRL
  AWAITING_CONFIRMATION         // Pagador marcou como pago
  RELEASED                      // Liberado (final)
  EXPIRED                       // Timeout de 30 min
  CANCELLED                     // Cancelada
  DISPUTE_OPEN                  // Disputa aberta
  DISPUTE_RESOLVED_BUYER        // Resolvida (favor do comprador)
  DISPUTE_RESOLVED_SELLER       // Resolvida (favor do vendedor)
}
```

#### P2PPaymentProfile (Pagamento)
```typescript
model P2PPaymentProfile {
  id: String
  userId: String                // User.id (único por user)
  pixKey: String?               // Chave PIX (CPF, email, telefone, etc)
  bankName: String?             // Nome do banco (info)
  accountName: String?          // Nome da conta (info)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### P2PMessage (Chat)
```typescript
model P2PMessage {
  id: String
  orderId: String               // P2POrder.id
  senderId: String              // User.id
  body: String                  // Mensagem de até 1000 char
  kind: String                  // 'text' | 'system'
  createdAt: DateTime
}
```

#### P2PReview (Avaliação)
```typescript
model P2PReview {
  id: String
  orderId: String               // Único por ordem
  raterId: String               // Quem avaliou
  rateeId: String               // Quem foi avaliado
  stars: Int                     // 1-5
  comment: String?              // Até 500 char
  createdAt: DateTime
}
```

### 2.4 Fluxo de Operação Completo

#### Fase 1: Setup (Maker)
1. Maker autenticado em `/app/p2p/offers/new`
2. Clica "Adicionar/Editar PIX"
3. Entra em `/p2p/payment-profile` → POST com chave PIX
4. Salva (upsert automático)

#### Fase 2: Criar Oferta (Maker)
1. Seleciona lado: SELL_BZR ou BUY_BZR
2. Define taxa (ex.: 5.00 R$/BZR)
3. Define range min/max BRL
4. POST `/p2p/offers` com payload
5. Oferta aparece como ACTIVE

#### Fase 3: Descobrir Oferta (Taker)
1. Acessa `/app/p2p` → aba "Comprar BZR" (vê ofertas SELL_BZR)
2. Filtra por range BRL
3. Clica numa oferta para detalhes (GET `/p2p/offers/:id`)
4. Vê info do maker: handle, stars, taxa de conclusão, volume 30d

#### Fase 4: Criar Ordem (Taker)
1. Clica "Comprar BZR"
2. Insere valor BRL (validado contra min/max)
3. POST `/p2p/offers/:id/orders` → cria com status AWAITING_ESCROW
4. Redireciona para sala `/app/p2p/orders/:id`

#### Fase 5: Escrow (Quem entrega BZR)
**Para SELL_BZR**: Maker deve travar BZR
**Para BUY_BZR**: Taker deve travar BZR

5a. Clica "Obter instruções" → POST `/p2p/orders/:id/escrow-intent`
   - Retorna `escrowAddress` + `amountBZR`
   - Usuário assina tx via wallet

5b. POST `/p2p/orders/:id/escrow-confirm` com `txHash`
   - Status passa para AWAITING_FIAT_PAYMENT
   - Maker vê a chave PIX do taker (ou vice-versa)

#### Fase 6: Pagamento (Pagador de BRL)
**Para SELL_BZR**: Taker paga BRL
**Para BUY_BZR**: Maker paga BRL

6a. Clica "Marcar como pago"
   - Anexa comprovante(s) via `proofUrls`
   - Status → AWAITING_CONFIRMATION
   - Escrow liberado em blockchain (txHash armazenado)

#### Fase 7: Confirmação (Recebedor de BRL)
**Para SELL_BZR**: Maker confirma recebimento
**Para BUY_BZR**: Taker confirma recebimento

7a. POST `/p2p/orders/:id/confirm-received`
   - Status → RELEASED
   - Escrow liberado para quem travou BZR
   - Trigger: reputação atualizada imediatamente

#### Fase 8: Avaliação
8a. POST `/p2p/orders/:id/review` com stars (1-5) e comment
   - Uma review por ordem e por usuário
   - Rating agregado afeta reputação do avaliado

### 2.5 APIs do Backend

#### Ofertas

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/p2p/offers` | Não | Lista ofertas públicas (ACTIVE) com filtros |
| GET | `/p2p/offers/:id` | Não | Detalhe de uma oferta + stats do maker |
| GET | `/p2p/my-offers` | Sim | Minhas ofertas (status: ACTIVE/PAUSED/ARCHIVED) |
| POST | `/p2p/offers` | Sim | Criar oferta (requer PIX configurado) |
| PATCH | `/p2p/offers/:id` | Sim | Editar price/range/autoReply (owner) |
| POST | `/p2p/offers/:id/toggle` | Sim | ACTIVE ↔ PAUSED |
| DELETE | `/p2p/offers/:id` | Sim | Arquivar oferta |

**Query Params (listagem)**:
```
side: 'BUY_BZR' | 'SELL_BZR'
method: 'PIX'
minBRL: number
maxBRL: number
cursor: string
limit: number (1-100, default 20)
```

**Response (listagem)**:
```json
{
  "items": [
    {
      "id": "...",
      "ownerId": "...",
      "side": "SELL_BZR",
      "priceBRLPerBZR": "5.00",
      "minBRL": "100",
      "maxBRL": "500",
      "method": "PIX",
      "status": "ACTIVE",
      "createdAt": "...",
      "owner": {
        "userId": "...",
        "handle": "@user123",
        "displayName": "User Name",
        "avatarUrl": "..."
      },
      "ownerStats": {
        "avgStars": 4.5,
        "completionRate": 0.95,
        "volume30dBRL": 5000,
        "volume30dBZR": 1000
      }
    }
  ],
  "nextCursor": "..." (ou null)
}
```

#### Órdenes

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/p2p/offers/:id/orders` | Sim | Criar ordem (taker) |
| GET | `/p2p/orders/:id` | Sim | Detalhe (maker ou taker) |
| POST | `/p2p/orders/:id/escrow-intent` | Sim | Gerar payload escrow |
| POST | `/p2p/orders/:id/escrow-confirm` | Sim | Confirmar escrow com txHash |
| POST | `/p2p/orders/:id/mark-paid` | Sim | Marcar como pago (com provas) |
| POST | `/p2p/orders/:id/confirm-received` | Sim | Confirmar recebimento |
| POST | `/p2p/orders/:id/cancel` | Sim | Cancelar (DRAFT/AWAITING_ESCROW) |
| GET | `/p2p/my-orders` | Sim | Minhas órdenes (ativas/histórico) |
| POST | `/p2p/orders/:id/review` | Sim | Criar review |

**Body para criar ordem**:
```json
{
  "amountBRL": 150,  // OU amountBZR
  "amountBZR": 30    // (um dos dois, calculado automaticamente)
}
```

**Body para escrow-confirm**:
```json
{
  "txHash": "0x1234567890abcdef..."
}
```

**Body para mark-paid**:
```json
{
  "proofUrls": ["https://cdn.../proof1.jpg", "..."],
  "note": "Enviado via PIX para XYZ"
}
```

**Body para review**:
```json
{
  "stars": 5,
  "comment": "Excelente transação!"
}
```

#### Perfil de Pagamento

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/p2p/payment-profile` | Sim | Obter meu perfil PIX |
| POST | `/p2p/payment-profile` | Sim | Upsert PIX |

**Body para upsert**:
```json
{
  "pixKey": "user@example.com",
  "bankName": "Banco do Brasil",
  "accountName": "João da Silva"
}
```

#### Mensagens (Chat)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/p2p/orders/:id/messages` | Sim | Histórico (paginado) |
| POST | `/p2p/orders/:id/messages` | Sim | Enviar mensagem |

**Rate Limit**: 10 mensagens por 60s por (ordem+usuário)

### 2.6 Frontend API Client

Arquivo: `/root/bazari/apps/web/src/modules/p2p/api.ts`

```typescript
export const p2pApi = {
  listOffers(params?),
  getOffer(id),
  createOffer(payload),
  getPaymentProfile(),
  upsertPaymentProfile(payload),
  createOrder(offerId, payload),
  getOrder(orderId),
  escrowIntent(orderId),
  escrowConfirm(orderId, payload),
  markPaid(orderId, payload),
  confirmReceived(orderId),
  cancelOrder(orderId),
  listMyOrders(params?),
  createReview(orderId, payload),
  listMessages(orderId, params?),
  sendMessage(orderId, payload),
  listMyOffers(params?)
}
```

### 2.7 Escrow e Blockchain

#### Configuração Escrow
```
Config: apps/api/src/config/payments.ts
- ESCROW_ACCOUNT: Endereço SS58 que recebe os BZR
- MARKETPLACE_FEE_BPS: Fee em basis points (ex: 250 = 2.5%)
```

#### Fluxo On-Chain
1. Taker/Maker assina tx: `api.tx.balances.transferKeepAlive(escrowAddress, amountBZR)`
2. Hash armazenado em `P2POrder.escrowTxHash`
3. Quando pagamento confirmado, escrow é liberado para o destinatário
4. Liberação registrada em `releasedTxHash`

**Nota**: Escrow é gerenciado via smart contract ou pallet externo (detalhes não expostos neste código).

### 2.8 Reputação

#### Agregação de Stats (ao listar ofertas)
```sql
-- Média de stars (P2PReview)
SELECT AVG(stars) FROM P2PReview WHERE rateeId = :userId

-- Taxa de conclusão (P2POrder)
SELECT 
  SUM(CASE WHEN status='RELEASED' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status IN ('CANCELLED','EXPIRED') THEN 1 ELSE 0 END) as failed
FROM P2POrder WHERE makerId = :userId

-- Volume 30 dias (P2POrder, status=RELEASED, createdAt >= NOW() - 30 dias)
SELECT 
  SUM(CASE ... THEN amountBRL END) as brl,
  SUM(CASE ... THEN amountBZR END) as bzr
FROM P2POrder WHERE makerId = :userId
```

#### Sync com On-Chain
- Reputação também sincronizada com `Profile.reputationScore` e `reputationTier`
- Worker periódico: `runReputationSync()` (disparado após RELEASED)

---

## 3. AUTENTICAÇÃO E CONTAS

### 3.1 Visão Geral
Sistema sem custódia baseado em SIWS (Sign In With Substrate), onde contas são endereços blockchain SS58. Usuários gerenciam chaves privadas localmente via seed criptografado em IndexedDB.

### 3.2 Fluxo de Autenticação

#### Passo 1: Obter Nonce
```
GET /auth/nonce?address=<SS58_ADDRESS>
↓
Response: {
  "nonce": "uuid",
  "domain": "...",
  "uri": "...",
  "genesisHash": "...",
  "issuedAt": "2025-...",
  "expiresAt": "2025-..."
}
```

**Rate limit**: 5 nonces por endereço a cada 5 minutos.

#### Passo 2: Construir Mensagem SIWS
```typescript
buildSiwsMessage(address, noncePayload)
// Usa @bazari/siws-utils
```

#### Passo 3: Assinar Localmente
```typescript
// Cliente web gera/recupera seed do vault
const mnemonic = await getActiveAccount().then(decrypt with PIN)
// Via Polkadot.js sr25519Sign
const signature = await signMessage(mnemonic, message)
```

#### Passo 4: Login via SIWS
```
POST /auth/login-siws
Body: {
  "address": "<SS58_ADDRESS>",
  "message": "<MENSAGEM_SIWS>",
  "signature": "0x..."
}
↓
Response: {
  "accessToken": "JWT",
  "accessTokenExpiresIn": 3600,
  "user": { "id": "uuid", "address": "SS58" }
}
```

**Cookie**: Refresh token é salvo automaticamente em cookie seguro.

#### Passo 5: Refresh Token
```
POST /auth/refresh
(Cookie automático)
↓
Novo access token + rotate do refresh token
```

### 3.3 Criação de Conta (Primeiro Login)

1. Validação SIWS (igual acima)
2. Upsert usuário em `User` (by address)
3. Se novo usuário:
   - Criar `Profile` com handle autogenerado (unique)
   - Criar metadados IPFS (via `publishProfileMetadata`)
   - **Mintar NFT on-chain** (2-6 segundos, bloqueante)
     - Chama `mintProfileOnChain(address, handle, cid)`
     - Retorna `profileId` (BigInt)
   - Atualizar `Profile` com `onChainProfileId`

### 3.4 Estrutura de Dados

#### User (Banco)
```typescript
model User {
  id: String                @id @default(uuid())
  address: String           @unique              // SS58 address
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  profile: Profile?
  sellerProfiles: SellerProfile[]
  daosOwned: Dao[]
  notifications: Notification[]
  interactions: UserInteraction[]
  achievements: UserAchievement[]
  quests: UserQuest[]
  // ...
}

model AuthNonce {
  id: String        @id @default(uuid())
  address: String
  nonce: String     @unique
  domain: String
  uri: String
  genesis: String
  issuedAt: DateTime
  expiresAt: DateTime
  usedAt: DateTime?   // Não-reutilizável
  
  @@index([address])
}

model RefreshToken {
  id: String        @id @default(uuid())
  userId: String
  tokenHash: String @unique   // Hash do token para segurança
  createdAt: DateTime
  revokedAt: DateTime?
  user: User @relation(...)
}
```

#### Vault (IndexedDB - Cliente)

**Database**: `bazari-auth` (v2)

**Object Stores**:
1. `vault_accounts` - Contas criptografadas
2. `vault_meta` - Metadados (active account)

```typescript
interface VaultAccountRecord {
  id: String              // = address
  address: String         // SS58
  name?: String
  cipher: String          // Seed criptografado (AES-GCM)
  iv: String             // Initialization vector
  salt: String           // Salt do PBKDF2
  iterations: Number     // Iterações (default 100000)
  createdAt: String
  version: Number        // Schema version
}
```

**Fluxo de Criptografia**:
1. Usuário define PIN (ex: 6 dígitos)
2. PBKDF2(PIN, salt, iterations) → derivedKey
3. AES-GCM(seed, derivedKey, iv) → cipher
4. Armazenar em IndexedDB: { address, cipher, iv, salt, iterations, ... }

**Fluxo de Descriptografia**:
1. Recuperar record do IndexedDB
2. Pedir PIN ao usuário
3. PBKDF2(PIN, record.salt, record.iterations) → derivedKey
4. AES-GCM.decrypt(record.cipher, derivedKey, record.iv) → seed
5. Usar seed efemeralemente (zerado imediatamente após)

### 3.5 Geração e Gerenciamento de Contas

#### Gerar Nova Conta
```typescript
const mnemonic = await generateMnemonic()  // 12 palavras
const address = await deriveAddress(mnemonic)
// Criptografar e salvar
await saveAccount({
  address,
  cipher: encrypted,
  iv: ivHex,
  salt: saltHex,
  iterations: 100000
})
```

#### Importar Conta
```typescript
const mnemonic = <USER_INPUT>
const address = await deriveAddress(mnemonic)
// Idem: criptografar e salvar
```

#### Listar Contas
```typescript
const accounts = await listAccounts()  // Todas as contas
const active = await getActiveAccount()  // Conta ativa
```

#### Trocar Conta Ativa
```typescript
await setActiveAccount(address)  // Atualiza meta store
```

#### Remover Conta
```typescript
await removeAccount(address)  // Deleta de vault_accounts
```

### 3.6 APIs de Autenticação

#### Backend (Fastify)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/auth/nonce` | Não | Obter nonce para SIWS |
| POST | `/auth/login-siws` | Não | Login com SIWS |
| POST | `/auth/refresh` | Não (cookie) | Refrescar token |

#### Frontend (Módulo `@/modules/auth`)

```typescript
export * from './api';              // authApi
export * from './crypto.store';     // Vault IndexedDB
export * from './crypto.utils';     // encrypt/decrypt
export * from './session';          // useSession hook
export * from './siws';             // buildSiwsMessage
export * from './useKeyring';       // useKeyring hook
export * from './userState';        // useUser atom
```

**useKeyring Hook**:
```typescript
{
  isReady,
  generateMnemonic,
  validateMnemonic,
  deriveAddress,
  signMessage
}
```

**Vault API**:
```typescript
listAccounts()
getActiveAccount()
setActiveAccount(address | null)
saveAccount(payload, { setActive?: boolean })
removeAccount(address)
updateAccountName(address, name)
hasAccounts()
subscribeVault(listener)
```

### 3.7 Segurança

- **Private keys**: Nunca deixam o navegador
- **Vault encryption**: PBKDF2 + AES-GCM
- **PIN**: Requerido para assinar transações
- **Rate limiting**: 5 nonces por address/5min; 30 nonces globais/5min
- **Refresh token**: Rotativo, hashed em DB, invalidável
- **Nonce**: Não-reutilizável, expira em 10 minutos

---

## 4. INFRAESTRUTURA DAO

### 4.1 Visão Geral
Base para DAOs (Decentralized Autonomous Organizations). Estrutura ainda em fase inicial.

### 4.2 Modelos de Dados

#### DAO
```typescript
model Dao {
  id: String          @id @default(cuid())
  name: String
  slug: String        @unique
  ownerUserId: String?
  owner: User?
  
  // Relations
  // products: Product[]     (via daoId)
  // ... (a expandir)
}

model SubDao {
  id: String          @id @default(cuid())
  daoId: String
  name: String
  slug: String        @unique
  ownerUserId: String // User.id
}

model ProfileSubDao {
  id: String          @id @default(cuid())
  profileId: String
  subDaoId: String
  role: String        // 'owner' | 'admin' | 'member'
  createdAt: DateTime
  
  @@unique([profileId, subDaoId])
}
```

### 4.3 Script de Seed

Arquivo: `/root/bazari/apps/api/src/ops/seed-daos.ts`

```typescript
// Cria DAOs básicas (dao-1, dao-2, dao-3)
// dao-1 é atribuída ao usuário SS58_KLEBER
```

### 4.4 Estrutura de Votação/Propostas
**Não implementada ainda** - Estrutura preparada para expansão futura.

---

## 5. ARQUITETURA DE INTEGRAÇÃO

### 5.1 Diagrama de Fluxo Global

```
┌─────────────────────────────────────────────────────────────┐
│                      USUÁRIO                                │
│           (Browser + Polkadot.js + IndexedDB)               │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    ┌──────────────┐   ┌─────────────────┐
    │   WALLET     │   │ P2P / CÂMBIO    │
    │ (Client-side)│   │ (Backend API)   │
    └──────────────┘   └─────────────────┘
          │                     │
          ├──────────┬──────────┤
          ▼          ▼          ▼
    ┌─────────────────────────────────┐
    │     BAZARICHAIN (node)          │
    │  ws://127.0.0.1:9944            │
    │  - balances (nativo + assets)   │
    │  - transfer, escrow             │
    │  - profileId NFT                │
    └─────────────────────────────────┘
          │
          ├──────────┬──────────┐
          ▼          ▼          ▼
    ┌──────────┐ ┌──────┐ ┌───────┐
    │Postgres  │ │IPFS  │ │PIX*   │
    │(DB API)  │ │(CID) │ │(fiat) │
    └──────────┘ └──────┘ └───────┘
        
    * PIX: Não integrado via API, gerenciado por usuários
```

### 5.2 Fluxos Críticos

#### Fluxo 1: Novo Usuário (SIWS)
```
1. User clicks "Connect"
2. GET /auth/nonce → receive nonce
3. buildSiwsMessage(address, nonce)
4. signMessage(mnemonic, message) [PIN required]
5. POST /auth/login-siws
6. Backend:
   - Verify signature
   - Upsert User
   - Create Profile (NEW)
   - Publish metadata → IPFS (CID)
   - mintProfileOnChain(address, handle, cid) [BLOCKING 2-6s]
   - Set onChainProfileId
7. Issue tokens (accessToken + refresh cookie)
8. Redirect to /app/dashboard
```

#### Fluxo 2: Envio de BZR (Wallet)
```
1. User in SendPage
2. Select asset, recipient, amount
3. Estimate fee
4. Click "Send"
5. PIN dialog
6. Decrypt seed (ephemeral)
7. api.tx.balances.transferKeepAlive(recipient, amount).signAndSend(...)
8. Monitor status
9. History updated via subscribeTransferStream
10. Display tx hash + confirmation
```

#### Fluxo 3: P2P SELL_BZR Completo
```
MAKER:
1. POST /p2p/payment-profile (PIX)
2. POST /p2p/offers (SELL_BZR, 5.00 R$/BZR, 100-500 BRL)
3. Oferta listada como ACTIVE

TAKER:
4. GET /p2p/offers (filtro SELL_BZR)
5. POST /p2p/offers/:id/orders (150 BRL)
6. Redireciona para sala

MAKER:
7. POST /p2p/orders/:id/escrow-intent
8. Assina tx para escrow (balances.transferKeepAlive)
9. POST /p2p/orders/:id/escrow-confirm (txHash)
10. Status → AWAITING_FIAT_PAYMENT

TAKER:
11. Vê pixKey do maker
12. Faz transferência PIX fora da app
13. Anexa comprovante
14. POST /p2p/orders/:id/mark-paid
15. Status → AWAITING_CONFIRMATION

MAKER:
16. POST /p2p/orders/:id/confirm-received
17. Status → RELEASED
18. Escrow liberado para taker

AMBOS:
19. POST /p2p/orders/:id/review (stars + comment)
20. Reputação atualizada (avg stars, completion rate)
```

### 5.3 Sincronização On-Chain

#### Perfil NFT
- Minced em `bazariIdentity.mintProfile(address, handle, cid)`
- Armazenado: `Profile.onChainProfileId` (BigInt)
- Metadata: `Profile.metadataCid` (IPFS CID)

#### Reputação
- Stored: `Profile.reputationScore` (Int), `reputationTier` (String)
- Sync worker: `startReputationWorker()` (periódico)
- Trigger: `runReputationSync()` após P2P RELEASED

#### Loja (SellerProfile)
- Publicação: `storePublish` route
- On-chain ID: `SellerProfile.onChainStoreId`
- Sync status: pending/syncing/synced/error

### 5.4 Variáveis de Ambiente

#### Frontend (Vite)
```
VITE_BAZARICHAIN_WS=ws://127.0.0.1:9944
VITE_API_BASE_URL=http://localhost:3000
```

#### Backend (Fastify)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/bazari
ESCROW_ACCOUNT=<SS58_ADDRESS>
MARKETPLACE_FEE_BPS=250
IPFS_API_URLS=http://127.0.0.1:5001,http://ipfs-backup:5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
IPFS_TIMEOUT_MS=30000
BAZARICHAIN_WS=ws://127.0.0.1:9944
BAZARICHAIN_SUDO_SEED=//Alice
```

---

## 6. MAPEAMENTO DE ARQUIVOS

### Estrutura Completa
```
/root/bazari/
├── apps/api/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── auth/
│   │   │   │   ├── jwt.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   └── verifySiws.ts
│   │   │   ├── profilesChain.ts          [Mintagem NFT + Reputação]
│   │   │   └── ipfs.ts                   [Upload/Download IPFS]
│   │   ├── config/
│   │   │   └── payments.ts               [Escrow config]
│   │   ├── routes/
│   │   │   ├── auth.ts                   [SIWS + Profile creation]
│   │   │   ├── p2p.offers.ts             [CRUD ofertas]
│   │   │   ├── p2p.orders.ts             [Fluxo de órdenes]
│   │   │   ├── p2p.paymentProfile.ts     [Perfil PIX]
│   │   │   ├── p2p.messages.ts           [Chat + rate limit]
│   │   │   ├── orders.ts                 [Marketplace orders]
│   │   │   ├── sellers.ts                [Sellers + lojas]
│   │   │   ├── profiles.ts
│   │   │   └── ... (outras rotas)
│   │   ├── workers/
│   │   │   ├── reputation.worker.ts      [Sync reputação]
│   │   │   ├── p2pTimeout.js             [Expiração de órdenes]
│   │   │   └── paymentsTimeout.js        [Timeout de escrow]
│   │   ├── ops/
│   │   │   └── seed-daos.ts              [Script de DAOs]
│   │   ├── server.ts                     [Bootstrap Fastify]
│   │   └── env.ts
│   └── prisma/
│       └── schema.prisma                 [Modelos de dados]
│
├── apps/web/
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── crypto.store.ts       [Vault IndexedDB]
│       │   │   ├── crypto.utils.ts       [PBKDF2 + AES-GCM]
│       │   │   ├── siws.ts               [SIWS message building]
│       │   │   ├── useKeyring.ts         [Polkadot.js wrapper]
│       │   │   ├── api.ts                [API client]
│       │   │   ├── session.ts
│       │   │   └── userState.ts
│       │   ├── wallet/
│       │   │   ├── services/
│       │   │   │   ├── polkadot.ts       [API connection]
│       │   │   │   ├── balances.ts       [Query saldos]
│       │   │   │   ├── history.ts        [Histórico tx]
│       │   │   │   ├── assets.ts         [Metadata assets]
│       │   │   │   └── index.ts
│       │   │   ├── pages/
│       │   │   │   ├── WalletHome.tsx
│       │   │   │   ├── WalletDashboard.tsx
│       │   │   │   ├── AccountsPage.tsx
│       │   │   │   ├── SendPage.tsx
│       │   │   │   └── ReceivePage.tsx
│       │   │   ├── hooks/
│       │   │   ├── store/
│       │   │   ├── utils/
│       │   │   ├── components/
│       │   │   └── README.md
│       │   └── p2p/
│       │       ├── api.ts                [P2P API client]
│       │       └── pages/
│       │           ├── P2PHomePage.tsx
│       │           ├── P2POfferNewPage.tsx
│       │           ├── P2POfferPublicPage.tsx
│       │           ├── P2PMyOrdersPage.tsx
│       │           └── P2POrderRoomPage.tsx
│       └── pages/
│           ├── auth/
│           │   ├── CreateAccount.tsx
│           │   ├── ImportAccount.tsx
│           │   ├── WelcomePage.tsx
│           │   ├── Unlock.tsx
│           │   └── RecoverPin.tsx
│           └── ... (outras páginas)
│
└── docs/
    ├── QA_P2P.md                        [Roteiro de testes]
    └── especificacao/testes/wallet/     [Testes de wallet]
```

---

## 7. ENDPOINTS RESUMIDOS

### Autenticação
```
GET  /auth/nonce?address=SS58
POST /auth/login-siws
POST /auth/refresh
```

### Wallet (Client-side via Polkadot.js)
```
Sem endpoints - tudo client-side
```

### P2P - Ofertas
```
GET  /p2p/offers?side=SELL_BZR&minBRL=100&maxBRL=500
GET  /p2p/offers/:id
GET  /p2p/my-offers
POST /p2p/offers
PATCH /p2p/offers/:id
POST /p2p/offers/:id/toggle
DELETE /p2p/offers/:id
```

### P2P - Órdenes
```
POST /p2p/offers/:id/orders
GET  /p2p/orders/:id
POST /p2p/orders/:id/escrow-intent
POST /p2p/orders/:id/escrow-confirm
POST /p2p/orders/:id/mark-paid
POST /p2p/orders/:id/confirm-received
POST /p2p/orders/:id/cancel
GET  /p2p/my-orders
POST /p2p/orders/:id/review
```

### P2P - Chat
```
GET  /p2p/orders/:id/messages
POST /p2p/orders/:id/messages
```

### P2P - Pagamento
```
GET  /p2p/payment-profile
POST /p2p/payment-profile
```

---

## 8. CONCLUSÃO

Este mapeamento cobre:

1. **Wallet**: Sistema client-side com Polkadot.js, saldos de BZR e assets, histórico de tx, armazenamento seguro de chaves
2. **P2P/Câmbio**: Sistema completo de troca BZR ↔ BRL via PIX, com escrow, reputação e chat
3. **Autenticação**: SIWS + Vault criptografado + Perfil NFT on-chain
4. **DAO**: Estrutura básica preparada para expansão
5. **Integração**: Blockchain (Bazarichain), IPFS (metadados), Postgres (DB API)

Todos os endpoints, estruturas de dados e fluxos estão documentados acima.
