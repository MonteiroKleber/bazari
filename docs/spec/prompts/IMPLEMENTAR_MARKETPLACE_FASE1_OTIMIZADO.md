# 🚀 Prompt OTIMIZADO: Marketplace do Afiliado - MVP (2-3 semanas)

## 🎯 Contexto

Você vai implementar o **Marketplace do Afiliado** da Bazari aproveitando **70% da infraestrutura** que já existe no BazChat (Fase 8).

**IMPORTANTE**:
- ✅ **NÃO implemente blockchain** - use o mock existente
- ✅ **NÃO reimplemente** serviços que já existem
- ✅ **FOCO**: Apenas vitrine personalizada + produtos + páginas

---

## 📚 Documentos de Referência

### Leia ANTES de começar:

1. **Análise de aproveitamento**:
   `/home/bazari/bazari/docs/APROVEITAMENTO_INFRAESTRUTURA_AFILIADOS.md`
   - Mostra o que JÁ EXISTE e pode ser reutilizado

2. **Especificação completa**:
   `/home/bazari/bazari/docs/specs/BAZARI_AFFILIATE_MARKETPLACE_SPEC.md`
   - Referência para entender o produto final

3. **Análise de prioridade**:
   `/home/bazari/bazari/docs/ANALISE_PRIORIDADE_IMPLEMENTACAO.md`
   - Explica por que usar mock é a melhor estratégia

---

## ✅ O que JÁ EXISTE e você vai REUTILIZAR

### Backend (70% pronto!)

#### 1. `CommissionService` ✅
**Localização**: `apps/api/src/chat/services/commission.ts`

**Já faz TUDO de split de pagamentos**:
```typescript
await commissionService.settleSale({
  proposalId: 'abc',
  storeId: 123,
  buyer: 'buyer-profile-id',
  seller: 'seller-profile-id',
  promoter: 'affiliate-profile-id', // Afiliado!
  amount: '1000.00',
  commissionPercent: 10,
});
// Retorna: split automático (890 seller + 100 afiliado + 10 bazari)
```

**Ação**: ✅ **Reutilizar 100%** - apenas adicionar parâmetro opcional `marketplaceId`

---

#### 2. Tabelas de Afiliados ✅
**Localização**: `apps/api/prisma/schema.prisma`

**Já existem**:
- `StoreCommissionPolicy` (linhas 1037-1046) - Políticas de comissão
- `ChatStoreAffiliate` (linhas 1201-1236) - Aprovação de afiliados
- `ChatAffiliateInvite` (linhas 1239-1258) - Convites
- `ChatSale` (linhas 1102-1128) - Registro de vendas

**Ação**: ✅ **Reutilizar 100%** - apenas renomear `ChatSale` → `AffiliateSale`

---

#### 3. `AffiliateStatsWorker` ✅
**Localização**: `apps/api/src/workers/affiliate-stats.worker.ts`

**Já atualiza estatísticas** de afiliados a cada hora.

**Ação**: 🔧 **Estender** - adicionar update de `AffiliateMarketplace`

---

### Frontend

#### Componentes shadcn/ui ✅
Todos os componentes UI já existem:
- `Card`, `Button`, `Input`, `Dialog`
- `Tabs`, `Label`, etc.

**Ação**: ✅ **Reutilizar** - apenas criar páginas novas

---

## 🆕 O que você PRECISA IMPLEMENTAR

### PARTE 1: Backend (1 semana)

#### 1.1 Migration Prisma: Adicionar 2 tabelas

**Arquivo**: `apps/api/prisma/schema.prisma`

**Adicionar ao final do arquivo**:

```prisma
// === MARKETPLACE DO AFILIADO ===

model AffiliateMarketplace {
  id                String   @id @default(uuid())
  ownerId           String
  owner             Profile  @relation("AffiliateMarketplaces", fields: [ownerId], references: [id], onDelete: Cascade)

  // Branding
  name              String
  slug              String   @unique
  description       String?  @db.Text
  logoUrl           String?
  bannerUrl         String?
  theme             String   @default("bazari")
  primaryColor      String?
  secondaryColor    String?

  // Metadados IPFS (opcional)
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

model AffiliateProduct {
  id                String              @id @default(uuid())
  marketplaceId     String
  marketplace       AffiliateMarketplace @relation(fields: [marketplaceId], references: [id], onDelete: Cascade)

  // Produto original
  storeId           BigInt
  productId         String
  productName       String
  productImageUrl   String?
  productPrice      Decimal             @db.Decimal(20, 8)

  // Comissão
  commissionPercent Int

  // Customizações (opcional)
  customDescription String?             @db.Text
  customImageUrl    String?
  featured          Boolean             @default(false)

  // Tracking
  viewCount         Int                 @default(0)
  clickCount        Int                 @default(0)

  addedAt           BigInt
  updatedAt         BigInt

  @@unique([marketplaceId, storeId, productId])
  @@index([marketplaceId])
  @@index([storeId])
}

// Renomear ChatSale → AffiliateSale e adicionar campo
model AffiliateSale {
  id                 String                    @id @default(uuid())

  // Link para marketplace (NOVO)
  marketplaceId      String?
  marketplace        AffiliateMarketplace?     @relation(fields: [marketplaceId], references: [id])

  storeId            BigInt
  buyer              String
  seller             String
  promoter           String?
  amount             Decimal                   @db.Decimal(20, 8)
  commissionPercent  Int                       @default(0)
  commissionAmount   Decimal                   @default(0) @db.Decimal(20, 8)
  bazariFee          Decimal                   @default(0) @db.Decimal(20, 8)
  sellerAmount       Decimal                   @db.Decimal(20, 8)
  status             String                    @default("pending")
  txHash             String?
  receiptNftCid      String?
  proposalId         String?
  proposal           ChatProposal?             @relation(fields: [proposalId], references: [id])
  createdAt          BigInt
  settledAt          BigInt?

  @@index([storeId])
  @@index([buyer])
  @@index([seller])
  @@index([promoter])
  @@index([marketplaceId])  // NOVO
  @@index([status])
  @@index([proposalId])
  @@index([createdAt(sort: Desc)])
}
```

**Modificar model Profile** (adicionar relação):

```prisma
model Profile {
  // ... campos existentes

  // Adicionar ao final:
  affiliateMarketplaces AffiliateMarketplace[] @relation("AffiliateMarketplaces")
}
```

**Rodar migration**:
```bash
cd ~/bazari/apps/api
npx prisma migrate dev --name add_affiliate_marketplace
npx prisma generate
```

---

#### 1.2 Modificar `CommissionService`

**Arquivo**: `apps/api/src/chat/services/commission.ts`

**Adicionar parâmetro opcional** `marketplaceId`:

**Linha 14** - Modificar interface:
```typescript
interface SaleData {
  proposalId: string;
  storeId: number;
  buyer: string;
  seller: string;
  promoter?: string;
  amount: string;
  commissionPercent: number;
  marketplaceId?: string; // NOVO
}
```

**Linha 226** - Adicionar ao criar venda:
```typescript
const sale = await prisma.affiliateSale.create({  // Renomeado de chatSale
  data: {
    storeId: data.storeId,
    buyer: data.buyer,
    seller: data.seller,
    promoter: data.promoter,
    amount,
    commissionPercent: data.commissionPercent,
    commissionAmount,
    bazariFee,
    sellerAmount,
    status: 'split',
    txHash,
    proposalId: data.proposalId,
    marketplaceId: data.marketplaceId, // NOVO
    createdAt: now,
    settledAt: now,
  },
});
```

**Atualizar todas as referências** de `chatSale` para `affiliateSale` no arquivo.

---

#### 1.3 Estender `AffiliateStatsWorker`

**Arquivo**: `apps/api/src/workers/affiliate-stats.worker.ts`

**Adicionar após linha 65** (após atualizar ChatStoreAffiliate):

```typescript
// Atualizar estatísticas do marketplace (se houver)
const salesWithMarketplace = await prisma.affiliateSale.findMany({
  where: {
    promoter: affiliate.promoterId,
    marketplaceId: { not: null },
  },
  select: {
    marketplaceId: true,
    amount: true,
    commissionAmount: true,
  },
});

// Agrupar por marketplace
const marketplaceStats = new Map<string, { revenue: Prisma.Decimal; commission: Prisma.Decimal; count: number }>();

for (const sale of salesWithMarketplace) {
  if (!sale.marketplaceId) continue;

  const stats = marketplaceStats.get(sale.marketplaceId) || {
    revenue: new Prisma.Decimal(0),
    commission: new Prisma.Decimal(0),
    count: 0,
  };

  stats.revenue = stats.revenue.add(sale.amount);
  stats.commission = stats.commission.add(sale.commissionAmount);
  stats.count++;

  marketplaceStats.set(sale.marketplaceId, stats);
}

// Atualizar cada marketplace
for (const [marketplaceId, stats] of marketplaceStats.entries()) {
  await prisma.affiliateMarketplace.update({
    where: { id: marketplaceId },
    data: {
      totalSales: stats.count,
      totalRevenue: stats.revenue,
      totalCommission: stats.commission,
      updatedAt: BigInt(Date.now()),
    },
  });
}
```

---

#### 1.4 Criar Rotas da API

**Arquivo**: `apps/api/src/routes/affiliates.ts` (CRIAR NOVO)

```typescript
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../lib/auth/middleware';
import { commissionService } from '../chat/services/commission';

const affiliatesRoutes: FastifyPluginAsync = async (fastify) => {

  // 1. Criar marketplace
  fastify.post('/marketplaces', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user;

    const schema = z.object({
      name: z.string().min(3).max(100),
      slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
      description: z.string().max(500).optional(),
      theme: z.string().default('bazari'),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
    });

    const data = schema.parse(request.body);

    // Verificar slug único
    const existing = await prisma.affiliateMarketplace.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return reply.code(409).send({ error: 'Slug já está em uso' });
    }

    // Buscar profile do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return reply.code(404).send({ error: 'Profile não encontrado' });
    }

    // Criar marketplace
    const marketplace = await prisma.affiliateMarketplace.create({
      data: {
        ownerId: profile.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        theme: data.theme,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      },
    });

    return reply.code(201).send({
      id: marketplace.id,
      name: marketplace.name,
      slug: marketplace.slug,
      url: `https://bazari.xyz/@${marketplace.slug}`,
      createdAt: Number(marketplace.createdAt),
    });
  });

  // 2. Obter marketplace público
  fastify.get('/marketplaces/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const marketplace = await prisma.affiliateMarketplace.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        products: {
          where: { marketplace: { isActive: true, isPublic: true } },
          orderBy: [
            { featured: 'desc' },
            { addedAt: 'desc' },
          ],
          take: 50,
        },
      },
    });

    if (!marketplace || !marketplace.isPublic) {
      return reply.code(404).send({ error: 'Marketplace não encontrado' });
    }

    return reply.send({
      id: marketplace.id,
      name: marketplace.name,
      slug: marketplace.slug,
      description: marketplace.description,
      logoUrl: marketplace.logoUrl,
      bannerUrl: marketplace.bannerUrl,
      theme: marketplace.theme,
      primaryColor: marketplace.primaryColor,
      secondaryColor: marketplace.secondaryColor,
      totalSales: marketplace.totalSales,
      owner: marketplace.owner,
      products: marketplace.products.map(p => ({
        id: p.id,
        storeId: Number(p.storeId),
        productId: p.productId,
        productName: p.productName,
        productImageUrl: p.customImageUrl || p.productImageUrl,
        productPrice: p.productPrice.toString(),
        commissionPercent: p.commissionPercent,
        description: p.customDescription,
        featured: p.featured,
      })),
    });
  });

  // 3. Atualizar marketplace
  fastify.put('/marketplaces/:id', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const schema = z.object({
      name: z.string().min(3).max(100).optional(),
      description: z.string().max(500).optional(),
      logoUrl: z.string().url().optional(),
      bannerUrl: z.string().url().optional(),
      theme: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      isActive: z.boolean().optional(),
      isPublic: z.boolean().optional(),
    });

    const data = schema.parse(request.body);

    // Buscar profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    // Verificar ownership
    const marketplace = await prisma.affiliateMarketplace.findUnique({
      where: { id },
    });

    if (!marketplace || marketplace.ownerId !== profile?.id) {
      return reply.code(403).send({ error: 'Não autorizado' });
    }

    // Atualizar
    const updated = await prisma.affiliateMarketplace.update({
      where: { id },
      data: {
        ...data,
        updatedAt: BigInt(Date.now()),
      },
    });

    return reply.send({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
    });
  });

  // 4. Adicionar produto à vitrine
  fastify.post('/marketplaces/:id/products', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const schema = z.object({
      storeId: z.number(),
      productId: z.string(),
      productName: z.string(),
      productImageUrl: z.string().optional(),
      productPrice: z.string(),
      customDescription: z.string().optional(),
      customImageUrl: z.string().url().optional(),
      featured: z.boolean().default(false),
    });

    const data = schema.parse(request.body);

    // Verificar ownership
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    const marketplace = await prisma.affiliateMarketplace.findUnique({
      where: { id },
    });

    if (!marketplace || marketplace.ownerId !== profile?.id) {
      return reply.code(403).send({ error: 'Não autorizado' });
    }

    // Buscar política de comissão da loja
    const policy = await prisma.storeCommissionPolicy.findUnique({
      where: { storeId: BigInt(data.storeId) },
    });

    if (!policy) {
      return reply.code(404).send({ error: 'Loja não tem política de comissão' });
    }

    // Validar permissão (modo Open ou afiliado aprovado)
    if (policy.mode === 'affiliates') {
      const affiliate = await prisma.chatStoreAffiliate.findUnique({
        where: {
          storeId_promoterId: {
            storeId: BigInt(data.storeId),
            promoterId: profile!.id,
          },
        },
      });

      if (!affiliate || affiliate.status !== 'approved') {
        return reply.code(403).send({
          error: 'Você precisa ser aprovado como afiliado desta loja',
          requiresApproval: true,
        });
      }
    }

    // Adicionar produto
    const product = await prisma.affiliateProduct.create({
      data: {
        marketplaceId: id,
        storeId: BigInt(data.storeId),
        productId: data.productId,
        productName: data.productName,
        productImageUrl: data.productImageUrl,
        productPrice: data.productPrice,
        commissionPercent: policy.customCommission || policy.percent,
        customDescription: data.customDescription,
        customImageUrl: data.customImageUrl,
        featured: data.featured,
        addedAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      },
    });

    // Incrementar productCount
    await prisma.affiliateMarketplace.update({
      where: { id },
      data: {
        productCount: { increment: 1 },
        updatedAt: BigInt(Date.now()),
      },
    });

    return reply.code(201).send({
      id: product.id,
      productId: product.productId,
      productName: product.productName,
      commissionPercent: product.commissionPercent,
    });
  });

  // 5. Remover produto
  fastify.delete('/marketplaces/:id/products/:productId', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user;
    const { id, productId } = request.params as { id: string; productId: string };

    // Verificar ownership
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    const marketplace = await prisma.affiliateMarketplace.findUnique({
      where: { id },
    });

    if (!marketplace || marketplace.ownerId !== profile?.id) {
      return reply.code(403).send({ error: 'Não autorizado' });
    }

    // Remover produto
    await prisma.affiliateProduct.delete({
      where: { id: productId },
    });

    // Decrementar productCount
    await prisma.affiliateMarketplace.update({
      where: { id },
      data: {
        productCount: { decrement: 1 },
        updatedAt: BigInt(Date.now()),
      },
    });

    return reply.code(204).send();
  });

  // 6. Analytics do marketplace
  fastify.get('/marketplaces/:id/analytics', { preHandler: requireAuth }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    // Verificar ownership
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    const marketplace = await prisma.affiliateMarketplace.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            productName: true,
            viewCount: true,
            clickCount: true,
          },
        },
        sales: {
          where: { status: 'split' },
          select: {
            amount: true,
            commissionAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!marketplace || marketplace.ownerId !== profile?.id) {
      return reply.code(403).send({ error: 'Não autorizado' });
    }

    // Top produtos
    const topProducts = marketplace.products
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 10);

    return reply.send({
      totalSales: marketplace.totalSales,
      totalRevenue: marketplace.totalRevenue.toString(),
      totalCommission: marketplace.totalCommission.toString(),
      productCount: marketplace.productCount,
      topProducts: topProducts.map(p => ({
        id: p.id,
        name: p.productName,
        views: p.viewCount,
        clicks: p.clickCount,
      })),
    });
  });

  // 7. Listar produtos afiliáveis
  fastify.get('/products', async (request, reply) => {
    const { category, minCommission, maxCommission, storeId } = request.query as any;

    // Buscar lojas com política de comissão ativa
    const policies = await prisma.storeCommissionPolicy.findMany({
      where: {
        mode: { in: ['open', 'followers'] }, // Excluir 'affiliates' por enquanto
        ...(minCommission && { percent: { gte: parseInt(minCommission) } }),
        ...(maxCommission && { percent: { lte: parseInt(maxCommission) } }),
        ...(storeId && { storeId: BigInt(storeId) }),
      },
      take: 50,
    });

    // Buscar produtos das lojas
    const storeIds = policies.map(p => p.storeId);

    const products = await prisma.product.findMany({
      where: {
        onChainStoreId: { in: storeIds },
        status: 'PUBLISHED',
      },
      include: {
        sellerStore: {
          select: {
            id: true,
            onChainStoreId: true,
            storeName: true,
          },
        },
      },
      take: 100,
    });

    return reply.send({
      products: products.map(p => {
        const policy = policies.find(pol => pol.storeId === p.onChainStoreId);
        return {
          id: p.id,
          storeId: Number(p.onChainStoreId),
          storeName: p.sellerStore?.storeName,
          title: p.title,
          description: p.description,
          price: p.priceBzr.toString(),
          commissionPercent: policy?.percent || 0,
          commissionMode: policy?.mode || 'open',
        };
      }),
    });
  });

};

export default affiliatesRoutes;
```

**Registrar rotas** em `apps/api/src/server.ts`:

```typescript
// Adicionar import
import affiliatesRoutes from './routes/affiliates';

// Registrar
fastify.register(affiliatesRoutes, { prefix: '/api/affiliates' });
```

---

### PARTE 2: Frontend (1-2 semanas)

#### 2.1 Página Pública da Vitrine

**Arquivo**: `apps/web/src/pages/AffiliateMarketplacePage.tsx` (CRIAR)

```typescript
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AffiliateMarketplacePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: marketplace, isLoading } = useQuery({
    queryKey: ['affiliate-marketplace', slug],
    queryFn: async () => {
      const res = await api.get(`/api/affiliates/marketplaces/${slug}`);
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="container py-8">Carregando...</div>;
  }

  if (!marketplace) {
    return <div className="container py-8">Marketplace não encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-4">
            {marketplace.logoUrl && (
              <img
                src={marketplace.logoUrl}
                alt={marketplace.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{marketplace.name}</h1>
              {marketplace.description && (
                <p className="text-muted-foreground mt-1">{marketplace.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>⭐ {marketplace.totalSales} vendas</span>
                <span>•</span>
                <span>
                  Por{' '}
                  <a href={`/profile/${marketplace.owner.handle}`} className="text-primary hover:underline">
                    @{marketplace.owner.handle}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Grid de Produtos */}
      <main className="container mx-auto py-8">
        {marketplace.products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {marketplace.products.map((product: any) => (
              <ProductCard key={product.id} product={product} marketplaceSlug={slug!} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProductCard({ product, marketplaceSlug }: any) {
  const handleBuy = () => {
    // Redirecionar para checkout com tracking do afiliado
    window.location.href = `/checkout?product=${product.productId}&store=${product.storeId}&affiliate=${marketplaceSlug}`;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {product.productImageUrl && (
        <img
          src={product.productImageUrl}
          alt={product.productName}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2 mb-2">{product.productName}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{product.productPrice} BZR</span>
        </div>
        <Button className="w-full mt-4" onClick={handleBuy}>
          Comprar
        </Button>
      </div>
    </Card>
  );
}
```

**Adicionar rota** em `apps/web/src/App.tsx`:

```typescript
import { AffiliateMarketplacePage } from './pages/AffiliateMarketplacePage';

// Adicionar dentro de <Routes>:
<Route path="/@:slug" element={<AffiliateMarketplacePage />} />
```

---

#### 2.2 Dashboard do Afiliado

**Arquivo**: `apps/web/src/pages/affiliate/AffiliateDashboardPage.tsx` (CRIAR)

```typescript
import { useAuth } from '@/modules/auth/session';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CreateMarketplaceDialog } from '@/components/affiliates/CreateMarketplaceDialog';
import { AddProductDialog } from '@/components/affiliates/AddProductDialog';

export function AffiliateDashboardPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const queryClient = useQueryClient();

  // Buscar meu marketplace
  const { data: marketplaces } = useQuery({
    queryKey: ['my-marketplaces'],
    queryFn: async () => {
      // Aqui você pode adicionar um endpoint GET /api/affiliates/marketplaces/me
      // Por enquanto, vamos buscar pelo ownerId
      const res = await api.get('/api/affiliates/marketplaces/me');
      return res.data;
    },
  });

  const marketplace = marketplaces?.[0]; // Primeiro marketplace do usuário

  // Analytics
  const { data: analytics } = useQuery({
    queryKey: ['marketplace-analytics', marketplace?.id],
    queryFn: async () => {
      const res = await api.get(`/api/affiliates/marketplaces/${marketplace.id}/analytics`);
      return res.data;
    },
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
            <p className="mb-4">Você ainda não tem um marketplace. Crie agora e comece a ganhar comissões!</p>
            <Button onClick={() => setCreateOpen(true)}>
              Criar Marketplace
            </Button>
          </CardContent>
        </Card>

        <CreateMarketplaceDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['my-marketplaces'] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard - {marketplace.name}</h1>
          <p className="text-muted-foreground">
            Sua vitrine:{' '}
            <a
              href={`/@${marketplace.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              bazari.xyz/@{marketplace.slug}
            </a>
          </p>
        </div>
        <Button onClick={() => setAddProductOpen(true)}>
          + Adicionar Produtos
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{marketplace.productCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics?.totalSales || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Receita Gerada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics?.totalRevenue || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">BZR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {analytics?.totalCommission || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">BZR ganhos</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos */}
      {analytics?.topProducts && analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topProducts.map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.views} visualizações • {product.clicks} cliques
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        marketplaceId={marketplace.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['my-marketplaces'] });
          queryClient.invalidateQueries({ queryKey: ['marketplace-analytics'] });
        }}
      />
    </div>
  );
}
```

---

#### 2.3 Modal: Criar Marketplace

**Arquivo**: `apps/web/src/components/affiliates/CreateMarketplaceDialog.tsx` (CRIAR)

```typescript
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateMarketplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateMarketplaceDialog({ open, onOpenChange, onSuccess }: CreateMarketplaceDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    theme: 'bazari',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/affiliates/marketplaces', data);
      return res.data;
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
      setFormData({ name: '', slug: '', description: '', theme: 'bazari' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  // Auto-gerar slug a partir do nome
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Meu Marketplace</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Loja do Zé"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="slug">URL (slug)</Label>
            <Input
              id="slug"
              placeholder="loja-do-ze"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              pattern="^[a-z0-9-]+$"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sua vitrine será: <strong>bazari.xyz/@{formData.slug || 'seu-slug'}</strong>
            </p>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Os melhores produtos da quebrada"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {(createMutation.error as any)?.response?.data?.error || 'Erro ao criar marketplace'}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Criando...' : 'Criar Marketplace'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### 2.4 Modal: Adicionar Produto

**Arquivo**: `apps/web/src/components/affiliates/AddProductDialog.tsx` (CRIAR)

```typescript
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketplaceId: string;
  onSuccess?: () => void;
}

export function AddProductDialog({ open, onOpenChange, marketplaceId, onSuccess }: AddProductDialogProps) {
  const [search, setSearch] = useState('');

  // Listar produtos afiliáveis
  const { data: productsData } = useQuery({
    queryKey: ['affiliable-products', search],
    queryFn: async () => {
      const res = await api.get('/api/affiliates/products', {
        params: { search },
      });
      return res.data;
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (product: any) => {
      const res = await api.post(`/api/affiliates/marketplaces/${marketplaceId}/products`, {
        storeId: product.storeId,
        productId: product.id,
        productName: product.title,
        productImageUrl: product.imageUrl,
        productPrice: product.price,
      });
      return res.data;
    },
    onSuccess: () => {
      onSuccess?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Produtos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productsData?.products?.map((product: any) => (
              <Card key={product.id} className="p-4">
                <div className="flex gap-3">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">{product.title}</h4>
                    <p className="text-sm text-muted-foreground">{product.price} BZR</p>
                    <p className="text-xs text-green-600">
                      Comissão: {product.commissionPercent}%
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => addMutation.mutate(product)}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </Card>
            ))}
          </div>

          {productsData?.products?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum produto encontrado
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### PARTE 3: Testes (3 dias)

#### 3.1 Testes Backend

```bash
cd ~/bazari/apps/api

# Testar rotas
pnpm test src/routes/affiliates.test.ts
```

#### 3.2 Testes E2E

**Fluxo completo**:
1. ✅ Criar marketplace via UI
2. ✅ Adicionar produtos à vitrine
3. ✅ Acessar vitrine pública `/@slug`
4. ✅ Simular compra com tracking de afiliado
5. ✅ Verificar split no banco (AffiliateSale)
6. ✅ Ver estatísticas atualizadas no dashboard

---

## ✅ Checklist de Conclusão

Use TodoWrite para rastrear:

- [ ] **Migration Prisma** (2 tabelas + renomear ChatSale)
- [ ] **Modificar CommissionService** (adicionar marketplaceId)
- [ ] **Estender AffiliateStatsWorker** (update marketplace)
- [ ] **Criar rotas da API** (7 endpoints)
- [ ] **Registrar rotas** em server.ts
- [ ] **Página pública da vitrine** (AffiliateMarketplacePage)
- [ ] **Dashboard do afiliado** (AffiliateDashboardPage)
- [ ] **Modal criar marketplace** (CreateMarketplaceDialog)
- [ ] **Modal adicionar produto** (AddProductDialog)
- [ ] **Adicionar rotas** no App.tsx
- [ ] **Testes backend**
- [ ] **Teste fluxo completo E2E**

---

## 🚀 Como Executar

```bash
# 1. Backend
cd ~/bazari/apps/api
npx prisma migrate dev --name add_affiliate_marketplace
npx prisma generate
pnpm dev

# 2. Frontend
cd ~/bazari/apps/web
pnpm dev

# 3. Testar
# Acessar http://localhost:5173
# Criar marketplace
# Adicionar produtos
# Acessar /@seu-slug
```

---

## ⚠️ Pontos de Atenção

1. **NÃO implemente blockchain** - use CommissionService existente
2. **Reutilize ao máximo** - 70% já está pronto
3. **Use TodoWrite** para rastrear progresso
4. **Teste cada parte** antes de avançar
5. **Pergunte se tiver dúvidas** - não assuma

---

## 📊 Estimativa de Tempo

- **Migration + Backend**: 3-4 dias
- **Frontend**: 5-7 dias
- **Testes**: 2-3 dias
- **TOTAL**: **10-14 dias** (2-3 semanas)

---

**Boa implementação! 🚀**
