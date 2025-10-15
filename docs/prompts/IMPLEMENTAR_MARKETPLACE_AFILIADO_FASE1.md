# 🚀 Prompt: Implementar Marketplace do Afiliado - Fase 1 (MVP)

## 📋 Contexto

Você é um desenvolvedor especializado em blockchain Substrate e aplicações full-stack. Sua missão é implementar a **Fase 1 (MVP Básico)** do Sistema de Marketplace do Afiliado da Bazari, conforme especificado em `/home/bazari/bazari/docs/specs/BAZARI_AFFILIATE_MARKETPLACE_SPEC.md`.

## 🎯 Objetivo da Fase 1

Implementar o **MVP funcional** que permita:
1. Criar marketplaces personalizados
2. Adicionar produtos à vitrine (modo Open)
3. Realizar vendas com split automático on-chain
4. Exibir estatísticas básicas

## 📂 Arquitetura do Projeto

### Repositórios:
- **Blockchain**: `~/bazari-chain` (Substrate/Rust)
- **Backend**: `~/bazari/apps/api` (Fastify + Prisma + TypeScript)
- **Frontend**: `~/bazari/apps/web` (React + Vite + TypeScript)

### Tecnologias:
- Blockchain: Substrate (Polkadot SDK), Rust
- Backend: Fastify, Prisma, PostgreSQL
- Frontend: React, Vite, shadcn/ui, Tailwind CSS
- Storage: IPFS (metadados)

## ✅ Checklist de Implementação - Fase 1

### PARTE 1: Blockchain (BazariChain)

#### 1.1 Criar Pallet `bazari-commerce`

**Local**: `~/bazari-chain/pallets/bazari-commerce/`

**Arquivos a criar:**
- [ ] `Cargo.toml` - Dependências do pallet
- [ ] `src/lib.rs` - Código principal do pallet
- [ ] `src/mock.rs` - Setup para testes
- [ ] `src/tests.rs` - Testes unitários

**Estruturas a implementar em `src/lib.rs`:**

```rust
// Storage
pub struct CommissionPolicy {
    pub mode: CommissionMode,
    pub percent: u8,
    pub min_reputation: Option<i32>,
    pub daily_cap: Option<Balance>,
}

pub enum CommissionMode {
    Open,        // Fase 1: implementar apenas este
    Followers,   // Fase 4: futuro
    Affiliates,  // Fase 2: futuro
}

pub struct Sale<AccountId, Balance, BlockNumber> {
    pub sale_id: u64,
    pub store_id: u64,
    pub buyer: AccountId,
    pub seller: AccountId,
    pub affiliate: Option<AccountId>,
    pub amount: Balance,
    pub commission_percent: u8,
    pub commission_amount: Balance,
    pub bazari_fee: Balance,
    pub seller_amount: Balance,
    pub status: SaleStatus,
    pub created_at: BlockNumber,
    pub receipt_cid: Option<Vec<u8>>,
}

pub enum SaleStatus {
    Pending,
    Completed,
    Disputed,
    Reversed,
}

pub struct AffiliateStats<Balance> {
    pub total_sales: u64,
    pub total_volume: Balance,
    pub total_commission: Balance,
    pub reputation_score: i32,
}
```

**Extrinsics a implementar (Fase 1 apenas):**

```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    /// 1. Definir política de comissão (apenas modo Open na Fase 1)
    #[pallet::weight(10_000)]
    pub fn set_commission_policy(
        origin: OriginFor<T>,
        store_id: u64,
        mode: CommissionMode,
        percent: u8,
        min_reputation: Option<i32>,
        daily_cap: Option<BalanceOf<T>>,
    ) -> DispatchResult;

    /// 2. Criar venda com split automático
    #[pallet::weight(10_000)]
    pub fn create_sale(
        origin: OriginFor<T>,
        store_id: u64,
        buyer: T::AccountId,
        amount: BalanceOf<T>,
        affiliate: Option<T::AccountId>,
        commission_percent: u8,
    ) -> DispatchResult;
}
```

**Events a emitir:**

```rust
#[pallet::event]
pub enum Event<T: Config> {
    CommissionPolicySet {
        store_id: u64,
        mode: CommissionMode,
        percent: u8,
    },
    SaleCompleted {
        sale_id: u64,
        store_id: u64,
        buyer: T::AccountId,
        seller: T::AccountId,
        affiliate: Option<T::AccountId>,
        amount: BalanceOf<T>,
        commission: BalanceOf<T>,
        bazari_fee: BalanceOf<T>,
    },
}
```

**Regras de negócio:**
- Comissão máxima: 20%
- Taxa Bazari: 2% (fixa)
- Split automático: `seller_amount = amount - commission - bazari_fee`
- Validar ownership da loja antes de definir política

**Testes unitários obrigatórios:**
- [ ] `test_set_commission_policy_works()`
- [ ] `test_create_sale_with_split_works()`
- [ ] `test_commission_too_high_fails()`
- [ ] `test_not_store_owner_fails()`
- [ ] `test_affiliate_stats_updated()`

#### 1.2 Integrar no Runtime

**Local**: `~/bazari-chain/runtime/src/lib.rs`

**Passos:**
1. [ ] Adicionar dependência no `Cargo.toml` do runtime
2. [ ] Implementar `Config` trait para o pallet
3. [ ] Adicionar ao `construct_runtime!` macro
4. [ ] Definir constantes (`BazariFeePercent`, `TreasuryAccount`)

**Código de exemplo:**

```rust
// runtime/Cargo.toml
[dependencies]
bazari-commerce = { path = "../pallets/bazari-commerce", default-features = false }

// runtime/src/lib.rs
parameter_types! {
    pub const BazariFeePercent: u8 = 2;
    pub const TreasuryAccount: AccountId = AccountId::from([0u8; 32]); // TODO: definir conta real
}

impl bazari_commerce::Config for Runtime {
    type Event = Event;
    type Currency = Balances;
    type BazariFeePercent = BazariFeePercent;
    type TreasuryAccount = TreasuryAccount;
}

construct_runtime!(
    pub enum Runtime where
        Block = Block,
        NodeBlock = opaque::Block,
        UncheckedExtrinsic = UncheckedExtrinsic
    {
        // ... pallets existentes
        BazariCommerce: bazari_commerce,
    }
);
```

#### 1.3 Build e Testes

**Comandos:**
```bash
cd ~/bazari-chain
cargo test -p bazari-commerce
cargo build --release
```

---

### PARTE 2: Backend (Apps/API)

#### 2.1 Schema Prisma

**Local**: `~/bazari/apps/api/prisma/schema.prisma`

**Tabelas a criar:**

```prisma
// Marketplace do Afiliado
model AffiliateMarketplace {
  id                String   @id @default(uuid())
  ownerId           String
  owner             Profile  @relation(fields: [ownerId], references: [id])

  // Branding
  name              String
  slug              String   @unique
  description       String?  @db.Text
  logoUrl           String?
  bannerUrl         String?
  theme             String   @default("bazari")
  primaryColor      String?
  secondaryColor    String?

  // Metadados IPFS
  metadataCid       String?

  // Estatísticas (cache)
  totalSales        Int      @default(0)
  totalRevenue      Decimal  @default(0) @db.Decimal(20, 8)
  totalCommission   Decimal  @default(0) @db.Decimal(20, 8)
  productCount      Int      @default(0)

  // Status
  isActive          Boolean  @default(true)
  isPublic          Boolean  @default(true)

  createdAt         BigInt
  updatedAt         BigInt

  products          AffiliateProduct[]
  sales             AffiliateSale[]

  @@index([ownerId])
  @@index([slug])
  @@index([isActive, isPublic])
}

// Produtos na vitrine
model AffiliateProduct {
  id                String              @id @default(uuid())
  marketplaceId     String
  marketplace       AffiliateMarketplace @relation(fields: [marketplaceId], references: [id])

  storeId           BigInt
  productId         String
  productName       String
  productImageUrl   String?
  productPrice      Decimal             @db.Decimal(20, 8)

  commissionPercent Int

  customDescription String?             @db.Text
  customImageUrl    String?
  featured          Boolean             @default(false)

  viewCount         Int                 @default(0)
  clickCount        Int                 @default(0)

  addedAt           BigInt
  updatedAt         BigInt

  @@unique([marketplaceId, storeId, productId])
  @@index([marketplaceId])
  @@index([storeId])
}

// Cache de vendas
model AffiliateSale {
  id                String              @id @default(uuid())
  onChainSaleId     BigInt              @unique

  marketplaceId     String?
  marketplace       AffiliateMarketplace? @relation(fields: [marketplaceId], references: [id])

  storeId           BigInt
  buyerAddress      String
  sellerAddress     String
  affiliateAddress  String?

  amount            Decimal             @db.Decimal(20, 8)
  commissionPercent Int
  commissionAmount  Decimal             @db.Decimal(20, 8)
  bazariFee         Decimal             @db.Decimal(20, 8)
  sellerAmount      Decimal             @db.Decimal(20, 8)

  status            String
  txHash            String?

  receiptCid        String?

  createdAt         BigInt
  updatedAt         BigInt

  @@index([marketplaceId])
  @@index([storeId])
  @@index([affiliateAddress])
  @@index([status])
}

// Políticas de comissão (cache)
model StoreCommissionPolicy {
  id                String   @id @default(uuid())
  storeId           BigInt   @unique

  mode              String
  percent           Int
  minReputation     Int?
  dailyCap          Decimal? @db.Decimal(20, 8)

  onChainSynced     Boolean  @default(false)
  lastSyncedAt      BigInt?

  createdAt         BigInt
  updatedAt         BigInt

  @@index([storeId, mode])
}
```

**Comandos:**
```bash
cd ~/bazari/apps/api
npx prisma migrate dev --name add_affiliate_marketplace
npx prisma generate
```

#### 2.2 Rotas da API

**Local**: `~/bazari/apps/api/src/routes/affiliates.ts` (criar)

**Endpoints a implementar:**

```typescript
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/auth/middleware';

const affiliatesRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Criar marketplace
  fastify.post('/marketplaces', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Validar input (name, slug, theme)
    // TODO: Verificar slug único
    // TODO: Upload metadata para IPFS (opcional)
    // TODO: INSERT no banco
    // TODO: Retornar marketplace criado
  });

  // 2. Obter marketplace público por slug
  fastify.get('/marketplaces/:slug', async (request, reply) => {
    // TODO: SELECT marketplace + produtos
    // TODO: Incrementar view count
    // TODO: Retornar dados públicos
  });

  // 3. Atualizar marketplace
  fastify.put('/marketplaces/:id', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Verificar ownership
    // TODO: Validar campos
    // TODO: UPDATE no banco
  });

  // 4. Adicionar produto à vitrine
  fastify.post('/marketplaces/:id/products', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Verificar ownership do marketplace
    // TODO: Buscar comissão da loja na chain
    // TODO: Validar modo Open (Fase 1)
    // TODO: INSERT AffiliateProduct
    // TODO: Incrementar productCount
  });

  // 5. Remover produto
  fastify.delete('/marketplaces/:id/products/:productId', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Verificar ownership
    // TODO: DELETE AffiliateProduct
    // TODO: Decrementar productCount
  });

  // 6. Obter analytics
  fastify.get('/marketplaces/:id/analytics', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Verificar ownership
    // TODO: Calcular estatísticas (vendas, receita, top produtos)
    // TODO: Retornar dados
  });

  // 7. Listar produtos afiliáveis
  fastify.get('/products', async (request, reply) => {
    // TODO: Query produtos com comissão ativa
    // TODO: Filtros (categoria, comissão min/max)
    // TODO: Buscar políticas da chain
    // TODO: Retornar lista
  });
};

export default affiliatesRoutes;
```

**Registrar rotas em `server.ts`:**

```typescript
// src/server.ts
import affiliatesRoutes from './routes/affiliates';

export async function buildServer() {
  const fastify = Fastify(/* ... */);

  // ... outras rotas

  fastify.register(affiliatesRoutes, { prefix: '/api/affiliates' });

  return fastify;
}
```

#### 2.3 Serviço de Integração com Blockchain

**Local**: `~/bazari/apps/api/src/services/bazari-chain.ts`

**Funcionalidades:**

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

export class BazariChainService {
  private api: ApiPromise;
  private keyring: Keyring;

  async connect() {
    const provider = new WsProvider(process.env.CHAIN_WS_URL || 'ws://localhost:9944');
    this.api = await ApiPromise.create({ provider });
    this.keyring = new Keyring({ type: 'sr25519' });
  }

  // Criar venda com split automático
  async createSale(data: {
    storeId: number;
    buyer: string;
    amount: string;
    affiliate?: string;
    commissionPercent: number;
  }) {
    const tx = this.api.tx.bazariCommerce.createSale(
      data.storeId,
      data.buyer,
      data.amount,
      data.affiliate || null,
      data.commissionPercent,
    );

    const signer = this.keyring.addFromUri(process.env.CHAIN_SIGNER_SEED!);
    const hash = await tx.signAndSend(signer);

    return { txHash: hash.toString() };
  }

  // Buscar política de comissão
  async getCommissionPolicy(storeId: number) {
    const policy = await this.api.query.bazariCommerce.commissionPolicies(storeId);

    if (policy.isNone) {
      return null;
    }

    return policy.unwrap().toJSON();
  }

  // Definir política de comissão
  async setCommissionPolicy(data: {
    storeId: number;
    mode: 'Open' | 'Followers' | 'Affiliates';
    percent: number;
    minReputation?: number;
    dailyCap?: string;
  }) {
    const tx = this.api.tx.bazariCommerce.setCommissionPolicy(
      data.storeId,
      data.mode,
      data.percent,
      data.minReputation || null,
      data.dailyCap || null,
    );

    const signer = this.keyring.addFromUri(process.env.CHAIN_SIGNER_SEED!);
    const hash = await tx.signAndSend(signer);

    return { txHash: hash.toString() };
  }

  // Escutar eventos da chain
  async subscribeToEvents(callback: (event: any) => void) {
    this.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (event.section === 'bazariCommerce') {
          callback({
            section: event.section,
            method: event.method,
            data: event.data.toJSON(),
          });
        }
      });
    });
  }
}
```

#### 2.4 Worker de Sincronização de Eventos

**Local**: `~/bazari/apps/api/src/workers/chain-sync.worker.ts` (criar)

**Função:** Escutar eventos da chain e atualizar banco

```typescript
import { BazariChainService } from '../services/bazari-chain';
import { prisma } from '../lib/prisma';

export async function startChainSyncWorker() {
  const chainService = new BazariChainService();
  await chainService.connect();

  console.log('🔗 Chain sync worker started');

  await chainService.subscribeToEvents(async (event) => {
    try {
      // Evento: SaleCompleted
      if (event.method === 'SaleCompleted') {
        const [saleId, storeId, buyer, seller, affiliate, amount, commission, bazariFee] = event.data;

        // Calcular seller amount
        const sellerAmount = parseFloat(amount) - parseFloat(commission) - parseFloat(bazariFee);

        // Salvar no banco
        await prisma.affiliateSale.create({
          data: {
            onChainSaleId: BigInt(saleId),
            storeId: BigInt(storeId),
            buyerAddress: buyer,
            sellerAddress: seller,
            affiliateAddress: affiliate || null,
            amount: amount.toString(),
            commissionPercent: Math.round((parseFloat(commission) / parseFloat(amount)) * 100),
            commissionAmount: commission.toString(),
            bazariFee: bazariFee.toString(),
            sellerAmount: sellerAmount.toString(),
            status: 'completed',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });

        console.log(`✅ Sale ${saleId} synced`);
      }

      // Evento: CommissionPolicySet
      if (event.method === 'CommissionPolicySet') {
        const [storeId, mode, percent] = event.data;

        await prisma.storeCommissionPolicy.upsert({
          where: { storeId: BigInt(storeId) },
          create: {
            storeId: BigInt(storeId),
            mode,
            percent,
            onChainSynced: true,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          update: {
            mode,
            percent,
            onChainSynced: true,
            lastSyncedAt: Date.now(),
            updatedAt: Date.now(),
          },
        });

        console.log(`✅ Commission policy for store ${storeId} synced`);
      }
    } catch (error) {
      console.error('❌ Error syncing event:', error);
    }
  });
}
```

**Iniciar worker no `server.ts`:**

```typescript
// src/server.ts
import { startChainSyncWorker } from './workers/chain-sync.worker';

export async function buildServer() {
  const fastify = Fastify(/* ... */);

  // ... rotas

  // Iniciar worker
  if (process.env.ENABLE_CHAIN_SYNC === 'true') {
    startChainSyncWorker().catch(console.error);
  }

  return fastify;
}
```

---

### PARTE 3: Frontend (Apps/Web)

#### 3.1 Página Pública da Vitrine

**Local**: `~/bazari/apps/web/src/pages/AffiliateMarketplacePage.tsx` (criar)

**Componentes:**

```tsx
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function AffiliateMarketplacePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: marketplace, isLoading } = useQuery({
    queryKey: ['affiliate-marketplace', slug],
    queryFn: () => api.get(`/api/affiliates/marketplaces/${slug}`).then(r => r.data),
  });

  if (isLoading) return <div>Carregando...</div>;
  if (!marketplace) return <div>Marketplace não encontrado</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-4">
            {marketplace.logoUrl && (
              <img src={marketplace.logoUrl} alt={marketplace.name} className="w-16 h-16 rounded-full" />
            )}
            <div>
              <h1 className="text-3xl font-bold">{marketplace.name}</h1>
              <p className="text-muted-foreground">{marketplace.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm">⭐ {marketplace.totalSales} vendas</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Grid de Produtos */}
      <main className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {marketplace.products?.map((product: any) => (
            <ProductCard key={product.id} product={product} affiliateSlug={slug} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ProductCard({ product, affiliateSlug }: any) {
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition">
      <img src={product.productImageUrl} alt={product.productName} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="font-semibold">{product.productName}</h3>
        <p className="text-2xl font-bold mt-2">{product.productPrice} BZR</p>
        <button
          className="w-full mt-4 bg-primary text-primary-foreground py-2 rounded"
          onClick={() => {
            // TODO: Redirecionar para checkout com tracking de afiliado
            window.location.href = `/checkout?product=${product.productId}&affiliate=${affiliateSlug}`;
          }}
        >
          Comprar
        </button>
      </div>
    </div>
  );
}
```

**Adicionar rota:**

```tsx
// src/App.tsx
import { AffiliateMarketplacePage } from './pages/AffiliateMarketplacePage';

<Route path="/@:slug" element={<AffiliateMarketplacePage />} />
```

#### 3.2 Painel do Afiliado

**Local**: `~/bazari/apps/web/src/pages/affiliate/AffiliateDashboardPage.tsx` (criar)

```tsx
import { useAuth } from '@/modules/auth/session';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AffiliateDashboardPage() {
  const { user } = useAuth();

  const { data: marketplace } = useQuery({
    queryKey: ['my-marketplace'],
    queryFn: () => api.get('/api/affiliates/marketplaces/me').then(r => r.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ['my-analytics'],
    queryFn: () => api.get(`/api/affiliates/marketplaces/${marketplace?.id}/analytics`).then(r => r.data),
    enabled: !!marketplace?.id,
  });

  if (!marketplace) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Criar Meu Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Você ainda não tem um marketplace. Crie agora!</p>
            <Button className="mt-4" onClick={() => {/* TODO: abrir modal */}}>
              Criar Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard - {marketplace.name}</h1>
        <p className="text-muted-foreground">
          Sua vitrine: <a href={`/@${marketplace.slug}`} className="text-primary">bazari.xyz/@{marketplace.slug}</a>
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{analytics?.sales || 0}</p>
            <p className="text-sm text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{analytics?.revenue || 0} BZR</p>
            <p className="text-sm text-muted-foreground">Volume total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{analytics?.commission || 0} BZR</p>
            <p className="text-sm text-muted-foreground">Ganhos</p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Produtos ({marketplace.productCount})</CardTitle>
          <Button onClick={() => {/* TODO: abrir modal de adicionar */}}>
            + Adicionar Produtos
          </Button>
        </CardHeader>
        <CardContent>
          {/* TODO: Lista de produtos */}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 3.3 Modal: Criar Marketplace

**Local**: `~/bazari/apps/web/src/components/affiliates/CreateMarketplaceDialog.tsx` (criar)

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function CreateMarketplaceDialog({ open, onOpenChange }: any) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    theme: 'bazari',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/affiliates/marketplaces', data),
    onSuccess: () => {
      onOpenChange(false);
      // Recarregar dados
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Meu Marketplace</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              placeholder="Loja do Zé"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label>URL (slug)</Label>
            <Input
              placeholder="loja-do-ze"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sua vitrine será: bazari.xyz/@{formData.slug || 'seu-slug'}
            </p>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input
              placeholder="Os melhores produtos da quebrada"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => createMutation.mutate(formData)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Criando...' : 'Criar Marketplace'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🧪 Testes de Aceitação

Após implementar tudo, testar:

1. [ ] **Blockchain**: `cd ~/bazari-chain && cargo test -p bazari-commerce`
2. [ ] **Backend**: `cd ~/bazari/apps/api && pnpm test`
3. [ ] **Frontend**: Abrir `http://localhost:5173`

**Fluxo completo:**
1. Criar marketplace via UI
2. Adicionar produtos à vitrine
3. Acessar vitrine pública `/@slug`
4. Simular compra (testar split on-chain)
5. Verificar venda sincronizada no banco
6. Ver estatísticas no dashboard

---

## ⚠️ Pontos de Atenção

1. **Conta do Tesouro**: Definir endereço real no runtime (`TreasuryAccount`)
2. **Seed do Backend**: Configurar `CHAIN_SIGNER_SEED` em `.env`
3. **WebSocket URL**: Configurar `CHAIN_WS_URL` para a chain
4. **IPFS**: Configurar upload de metadados (opcional na Fase 1)
5. **Validações**: Slug único, comissão máxima 20%, ownership

---

## 📝 Variáveis de Ambiente

Adicionar em `~/bazari/apps/api/.env`:

```bash
# Blockchain
CHAIN_WS_URL=ws://localhost:9944
CHAIN_SIGNER_SEED=//Alice
ENABLE_CHAIN_SYNC=true

# IPFS (opcional)
IPFS_API_URL=http://localhost:5001
```

---

## ✅ Critérios de Conclusão - Fase 1

- [ ] Pallet `bazari-commerce` compilando sem erros
- [ ] Testes unitários passando (5+ testes)
- [ ] Runtime integrado com o pallet
- [ ] Migração Prisma criada e rodada
- [ ] API com 7 endpoints funcionando
- [ ] Worker de sync conectado e escutando eventos
- [ ] Página pública da vitrine renderizando
- [ ] Dashboard do afiliado exibindo estatísticas
- [ ] Fluxo completo testado: criar marketplace → adicionar produto → venda → split on-chain

---

## 🚀 Como Executar

```bash
# 1. Blockchain
cd ~/bazari-chain
cargo build --release
./target/release/bazari-chain --dev

# 2. Backend
cd ~/bazari/apps/api
pnpm install
npx prisma migrate dev
pnpm dev

# 3. Frontend
cd ~/bazari/apps/web
pnpm install
pnpm dev
```

---

**Boa implementação! 🚀**
