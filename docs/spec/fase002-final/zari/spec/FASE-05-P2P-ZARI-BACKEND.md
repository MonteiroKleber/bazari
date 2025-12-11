# FASE 5: P2P ZARI Extension (Backend)

**Data de Criação**: 2025-10-28
**Status**: 📋 ESPECIFICAÇÃO TÉCNICA
**Dependências**:
- ✅ FASE 1: BZR Rename (Blockchain) - COMPLETA
- ✅ FASE 3: ZARI Token (Blockchain) - COMPLETA
- ✅ FASE 4: Multi-Token Wallet (Frontend) - COMPLETA
**Duração Estimada**: 2 semanas (80 horas)
**Nível de Risco**: 🟡 MÉDIO

---

## 🎯 OBJETIVO

Estender o sistema P2P do Bazari para suportar **ofertas de ZARI** além de BZR, implementando lógica de precificação por fases (2A: 0.25 BZR, 2B: 0.35 BZR, 3: 0.50 BZR), escrow multi-asset no blockchain, e permitindo compra direta de ZARI com BRL (via PIX) durante o período de distribuição.

---

## 🔍 CONTEXTO

### Por Que Após FASE 4?

1. **ZARI existe on-chain**: Asset ID=1 criado e funcional (FASE 3)
2. **Wallet multi-token pronta**: Frontend já suporta BZR + ZARI (FASE 4)
3. **P2P BZR existente**: Sistema P2P para BZR já funcional como base
4. **Supply control necessário**: ZARI tem supply fixo (21M) e precisa de distribuição controlada

### Contexto de Tokenomics ZARI

**Supply Total**: 21,000,000 ZARI (fixo, sem inflação)

**Distribuição Planejada**:
```
┌─────────────────────────────────────────────────────────┐
│ 21M ZARI TOTAL                                          │
├─────────────────────────────────────────────────────────┤
│ 40% (8.4M)  → Reserva DAO (Governança)                 │
│ 30% (6.3M)  → Venda P2P (FASE 2A, 2B, 3)               │
│ 20% (4.2M)  → Incentivos Ecossistema (Staking, LP)     │
│ 10% (2.1M)  → Equipe/Fundadores (vesting 2 anos)       │
└─────────────────────────────────────────────────────────┘
```

**Fases de Venda P2P** (30% = 6.3M ZARI):
```
┌──────────────┬──────────┬──────────┬─────────────┐
│ Fase         │ Supply   │ Preço    │ BRL (1 BZR) │
├──────────────┼──────────┼──────────┼─────────────┤
│ 2A (Atual)   │ 2.1M     │ 0.25 BZR │ R$ 0.50     │
│ 2B (Futura)  │ 2.1M     │ 0.35 BZR │ R$ 0.70     │
│ 3 (Final)    │ 2.1M     │ 0.50 BZR │ R$ 1.00     │
└──────────────┴──────────┴──────────┴─────────────┘

Premissa: 1 BZR = R$ 2.00 (preço médio P2P)
```

**Lógica de Progressão**:
- Cada fase vende 2.1M ZARI
- Preço aumenta automaticamente ao esgotar supply da fase
- Sistema verifica supply on-chain em tempo real
- Não permite criar ofertas se fase esgotada

### Arquitetura P2P Atual (BZR)

```
apps/api/
├── src/
│   └── modules/
│       └── p2p/
│           ├── p2p.controller.ts        # Rotas REST
│           ├── p2p.service.ts           # Lógica de negócio
│           ├── p2p-offer.service.ts     # Ofertas
│           ├── p2p-order.service.ts     # Ordens
│           ├── p2p-escrow.service.ts    # Escrow on-chain
│           └── dto/
│               ├── create-offer.dto.ts
│               ├── create-order.dto.ts
│               └── filter-offers.dto.ts
└── prisma/
    └── schema.prisma                    # Models: P2POffer, P2POrder
```

**Fluxo P2P Atual (BZR)**:
1. Maker cria oferta: "Vendo 1000 BZR por R$ 2000" (PIX)
2. Taker aceita: Sistema cria P2POrder
3. Maker envia BZR para escrow on-chain (pallet-balances)
4. Taker faz PIX e envia comprovante
5. Maker libera escrow → BZR vai para Taker
6. Sistema marca order como COMPLETED

**Problema**: Não suporta ZARI, preço fixo, sem controle de fases.

---

## 📦 ESCOPO TÉCNICO

### Resumo das Mudanças

| Componente | Tipo | Complexidade | Tempo |
|------------|------|--------------|-------|
| **Schema Prisma** | Estender | Médio | 8h |
| **P2P Offer Service** | Modificar | Alto | 16h |
| **P2P Order Service** | Modificar | Alto | 14h |
| **P2P Escrow Service** | Estender | Alto | 12h |
| **Phase Control Service** | Novo | Médio | 10h |
| **DTOs & Validation** | Estender | Baixo | 6h |
| **API Routes** | Modificar | Médio | 8h |
| **Testes** | E2E | Médio | 6h |

**Total**: ~80 horas (2 semanas)

---

## 🗄️ DATABASE SCHEMA CHANGES

### 1. Modificar `P2POffer` Model

**Arquivo**: `/root/bazari/apps/api/prisma/schema.prisma`

**Adicionar campos**:
```prisma
model P2POffer {
  id             String           @id @default(cuid())
  ownerId        String
  side           P2POfferSide

  // ✨ NOVO: Asset being traded
  assetType      P2PAssetType     @default(BZR)  // BZR | ZARI
  assetId        String?                          // '1' para ZARI, null para BZR

  // ✨ NOVO: Phase info (apenas para ZARI)
  phase          String?                          // '2A' | '2B' | '3' | null
  phasePrice     Decimal?         @db.Decimal(18, 12) // 0.25 | 0.35 | 0.50 (em BZR)

  // Pricing (agora genérico)
  priceBRLPerUnit Decimal         @db.Decimal(18, 2)  // R$/BZR ou R$/ZARI
  minBRL         Decimal          @db.Decimal(18, 2)
  maxBRL         Decimal          @db.Decimal(18, 2)

  method         P2PPaymentMethod
  autoReply      String?
  status         P2POfferStatus   @default(ACTIVE)

  // ✨ NOVO: Stats expandido
  stats          Json?            // { totalSold, totalVolume, phaseSupplyLeft }

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([ownerId, status, side, assetType])
  @@index([assetType, phase, status])
}

// ✨ NOVO: Enum para tipos de asset
enum P2PAssetType {
  BZR
  ZARI
}
```

**Migração**:
```sql
-- Migration: add_zari_p2p_support
ALTER TABLE "P2POffer"
  ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'BZR',
  ADD COLUMN "assetId" TEXT,
  ADD COLUMN "phase" TEXT,
  ADD COLUMN "phasePrice" DECIMAL(18, 12),
  RENAME COLUMN "priceBRLPerBZR" TO "priceBRLPerUnit";

-- Criar enum (Prisma gera automaticamente)
CREATE TYPE "P2PAssetType" AS ENUM ('BZR', 'ZARI');

-- Atualizar tipo da coluna
ALTER TABLE "P2POffer"
  ALTER COLUMN "assetType" TYPE "P2PAssetType" USING "assetType"::"P2PAssetType";

-- Criar índices
CREATE INDEX "P2POffer_assetType_phase_status_idx"
  ON "P2POffer"("assetType", "phase", "status");
```

---

### 2. Modificar `P2POrder` Model

**Adicionar campos**:
```prisma
model P2POrder {
  id             String           @id @default(cuid())
  offerId        String
  makerId        String
  takerId        String
  side           P2POfferSide

  // ✨ NOVO: Asset info
  assetType      P2PAssetType     @default(BZR)
  assetId        String?          // '1' para ZARI
  phase          String?          // '2A', '2B', '3'

  // Pricing
  priceBRLPerUnit Decimal         @db.Decimal(18, 2)
  amountAsset    Decimal          @db.Decimal(38, 18)  // BZR ou ZARI
  amountBRL      Decimal          @db.Decimal(18, 2)

  method         P2PPaymentMethod
  status         P2POrderStatus   @default(DRAFT)

  // Escrow on-chain
  escrowTxHash   String?
  escrowAt       DateTime?
  releasedTxHash String?
  releasedAt     DateTime?

  // PIX proof
  pixKeySnapshot  String?
  payerDeclaredAt DateTime?
  proofUrls       Json?

  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([makerId, takerId, status, assetType])
  @@index([offerId])
  @@index([assetType, phase])
}
```

**Migração**:
```sql
ALTER TABLE "P2POrder"
  ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'BZR',
  ADD COLUMN "assetId" TEXT,
  ADD COLUMN "phase" TEXT,
  RENAME COLUMN "priceBRLPerBZR" TO "priceBRLPerUnit",
  RENAME COLUMN "amountBZR" TO "amountAsset";

ALTER TABLE "P2POrder"
  ALTER COLUMN "assetType" TYPE "P2PAssetType" USING "assetType"::"P2PAssetType";

CREATE INDEX "P2POrder_assetType_phase_idx"
  ON "P2POrder"("assetType", "phase");
```

---

### 3. Nova Tabela: `ZARIPhaseConfig`

**Adicionar ao schema**:
```prisma
// Configuração das fases de venda ZARI
model ZARIPhaseConfig {
  id          String   @id @default(cuid())
  phase       String   @unique  // '2A', '2B', '3'
  priceBZR    Decimal  @db.Decimal(18, 12)  // 0.25, 0.35, 0.50
  supplyLimit BigInt                         // 2_100_000 * 10^12 (decimais)
  startBlock  BigInt?                        // Block de início (null = ainda não iniciou)
  endBlock    BigInt?                        // Block de fim (null = ainda não terminou)
  active      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([phase, active])
}
```

**Seed inicial**:
```typescript
// prisma/seed.ts (adicionar)
await prisma.zARIPhaseConfig.createMany({
  data: [
    {
      phase: '2A',
      priceBZR: '0.25',
      supplyLimit: BigInt(2_100_000) * BigInt(10 ** 12),
      active: true,  // Fase atual
    },
    {
      phase: '2B',
      priceBZR: '0.35',
      supplyLimit: BigInt(2_100_000) * BigInt(10 ** 12),
      active: false,
    },
    {
      phase: '3',
      priceBZR: '0.50',
      supplyLimit: BigInt(2_100_000) * BigInt(10 ** 12),
      active: false,
    },
  ],
});
```

---

## 🔧 BACKEND IMPLEMENTATION

### 1. Novo Service: `phase-control.service.ts`

**Arquivo**: `/root/bazari/apps/api/src/modules/p2p/phase-control.service.ts`

**Responsabilidades**:
- Buscar fase ativa atual
- Verificar supply restante no blockchain
- Calcular progresso da fase (%)
- Validar se pode criar oferta ZARI
- Transição automática de fases

**Interface**:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ApiPromise } from '@polkadot/api';

export interface PhaseInfo {
  phase: string;          // '2A', '2B', '3'
  priceBZR: bigint;       // 0.25, 0.35, 0.50 (em planck)
  supplyLimit: bigint;    // 2.1M ZARI (em planck)
  supplySold: bigint;     // Já vendido (calculado)
  supplyRemaining: bigint;
  progressPercent: number; // 0-100
  isActive: boolean;
  nextPhase: string | null;
}

@Injectable()
export class PhaseControlService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retorna informações da fase ZARI ativa
   */
  async getActivePhase(): Promise<PhaseInfo | null> {
    const config = await this.prisma.zARIPhaseConfig.findFirst({
      where: { active: true },
    });

    if (!config) {
      return null;
    }

    // Query blockchain para supply circulante de ZARI
    const api = await this.getBlockchainApi();
    const assetDetails = await api.query.assets.asset(1); // ZARI = asset 1

    if (assetDetails.isNone) {
      throw new Error('ZARI asset not found on-chain');
    }

    const details = assetDetails.unwrap();
    const totalSupply = BigInt(details.supply.toString());
    const daoReserve = BigInt(8_400_000) * BigInt(10 ** 12); // 40% = 8.4M

    // Supply vendido = total - reserva DAO
    const supplySold = totalSupply - daoReserve;
    const supplyRemaining = config.supplyLimit - supplySold;
    const progressPercent = Number((supplySold * BigInt(100)) / config.supplyLimit);

    return {
      phase: config.phase,
      priceBZR: BigInt(config.priceBZR.toString()) * BigInt(10 ** 12),
      supplyLimit: config.supplyLimit,
      supplySold,
      supplyRemaining,
      progressPercent,
      isActive: supplyRemaining > 0n,
      nextPhase: this.getNextPhase(config.phase),
    };
  }

  /**
   * Valida se pode criar oferta ZARI na fase atual
   */
  async canCreateZARIOffer(amountZARI: bigint): Promise<boolean> {
    const phase = await this.getActivePhase();

    if (!phase) {
      throw new Error('No active ZARI phase');
    }

    if (!phase.isActive) {
      throw new Error(`Phase ${phase.phase} is sold out`);
    }

    if (amountZARI > phase.supplyRemaining) {
      throw new Error(
        `Insufficient supply in phase ${phase.phase}. Remaining: ${phase.supplyRemaining} ZARI`
      );
    }

    return true;
  }

  /**
   * Transição para próxima fase (chamado manualmente ou automaticamente)
   */
  async transitionToNextPhase(): Promise<void> {
    const current = await this.prisma.zARIPhaseConfig.findFirst({
      where: { active: true },
    });

    if (!current) {
      throw new Error('No active phase to transition from');
    }

    const nextPhaseName = this.getNextPhase(current.phase);
    if (!nextPhaseName) {
      throw new Error('No next phase available');
    }

    // Atualizar: desativar atual, ativar próxima
    await this.prisma.$transaction([
      this.prisma.zARIPhaseConfig.update({
        where: { id: current.id },
        data: { active: false, endBlock: await this.getCurrentBlock() },
      }),
      this.prisma.zARIPhaseConfig.update({
        where: { phase: nextPhaseName },
        data: { active: true, startBlock: await this.getCurrentBlock() },
      }),
    ]);

    console.log(`[PhaseControl] Transitioned from ${current.phase} to ${nextPhaseName}`);
  }

  private getNextPhase(current: string): string | null {
    const phases = ['2A', '2B', '3'];
    const index = phases.indexOf(current);
    return index >= 0 && index < phases.length - 1 ? phases[index + 1] : null;
  }

  private async getCurrentBlock(): Promise<bigint> {
    const api = await this.getBlockchainApi();
    const header = await api.rpc.chain.getHeader();
    return BigInt(header.number.toString());
  }

  private async getBlockchainApi(): Promise<ApiPromise> {
    // Implementação: reutilizar conexão existente
    // Ver: apps/api/src/modules/blockchain/blockchain.service.ts
    throw new Error('TODO: Implement blockchain API connection');
  }
}
```

---

### 2. Modificar: `p2p-offer.service.ts`

**Mudanças principais**:

1. **Adicionar lógica de asset type**:
```typescript
async createOffer(dto: CreateOfferDto, userId: string): Promise<P2POffer> {
  // Validar asset type
  if (dto.assetType === 'ZARI') {
    await this.validateZARIOffer(dto);
  }

  // Calcular preço por unidade
  const pricePerUnit = this.calculatePricePerUnit(dto);

  const offer = await this.prisma.p2POffer.create({
    data: {
      ownerId: userId,
      side: dto.side,
      assetType: dto.assetType,
      assetId: dto.assetType === 'ZARI' ? '1' : null,
      phase: dto.assetType === 'ZARI' ? (await this.phaseControl.getActivePhase())?.phase : null,
      phasePrice: dto.assetType === 'ZARI' ? (await this.phaseControl.getActivePhase())?.priceBZR : null,
      priceBRLPerUnit: pricePerUnit,
      minBRL: dto.minBRL,
      maxBRL: dto.maxBRL,
      method: dto.method,
      autoReply: dto.autoReply,
      status: 'ACTIVE',
    },
  });

  return offer;
}

private async validateZARIOffer(dto: CreateOfferDto): Promise<void> {
  // Apenas SELL permitido para ZARI (compra direta via DAO)
  if (dto.side !== 'SELL') {
    throw new BadRequestException('ZARI can only be sold (SELL side), not bought');
  }

  // Verificar fase ativa
  const phase = await this.phaseControl.getActivePhase();
  if (!phase) {
    throw new BadRequestException('No active ZARI phase');
  }

  // Validar amount contra supply restante
  const amountZARI = this.calculateZARIAmount(dto);
  await this.phaseControl.canCreateZARIOffer(amountZARI);
}

private calculatePricePerUnit(dto: CreateOfferDto): Decimal {
  if (dto.assetType === 'ZARI') {
    // ZARI: preço baseado na fase + markup BRL/BZR
    const phase = await this.phaseControl.getActivePhase();
    const priceBZR = Number(phase.priceBZR) / 10 ** 12; // Ex: 0.25
    const bzrToBRL = 2.0; // TODO: buscar taxa BZR/BRL do mercado P2P
    return new Decimal(priceBZR * bzrToBRL); // Ex: 0.25 * 2.00 = R$ 0.50
  } else {
    // BZR: preço direto do DTO
    return new Decimal(dto.priceBRLPerBZR);
  }
}
```

2. **Adicionar filtros de asset**:
```typescript
async findOffers(filters: FilterOffersDto): Promise<P2POffer[]> {
  const where: Prisma.P2POfferWhereInput = {
    status: 'ACTIVE',
    assetType: filters.assetType || undefined,
    phase: filters.phase || undefined,
    side: filters.side || undefined,
  };

  return this.prisma.p2POffer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 50,
  });
}
```

---

### 3. Modificar: `p2p-escrow.service.ts`

**Mudanças principais**:

1. **Suportar escrow ZARI**:
```typescript
import { ApiPromise } from '@polkadot/api';

async lockFundsInEscrow(
  order: P2POrder,
  makerAddress: string
): Promise<string> {
  const api = await this.getBlockchainApi();
  const amount = BigInt(order.amountAsset.toString()) * BigInt(10 ** 12);

  let tx;

  if (order.assetType === 'BZR') {
    // BZR: pallet-balances
    tx = api.tx.balances.transfer(
      this.getEscrowAccount(),
      amount
    );
  } else if (order.assetType === 'ZARI') {
    // ZARI: pallet-assets
    tx = api.tx.assets.transfer(
      order.assetId, // '1'
      this.getEscrowAccount(),
      amount
    );
  } else {
    throw new Error(`Unsupported asset type: ${order.assetType}`);
  }

  // Assinar e enviar transação
  const txHash = await this.signAndSend(tx, makerAddress);

  // Atualizar order
  await this.prisma.p2POrder.update({
    where: { id: order.id },
    data: {
      escrowTxHash: txHash,
      escrowAt: new Date(),
      status: 'ESCROWED',
    },
  });

  return txHash;
}

async releaseFundsFromEscrow(
  order: P2POrder,
  toAddress: string
): Promise<string> {
  const api = await this.getBlockchainApi();
  const amount = BigInt(order.amountAsset.toString()) * BigInt(10 ** 12);

  let tx;

  if (order.assetType === 'BZR') {
    tx = api.tx.balances.transfer(toAddress, amount);
  } else if (order.assetType === 'ZARI') {
    tx = api.tx.assets.transfer(order.assetId, toAddress, amount);
  }

  const txHash = await this.signAndSend(tx, this.getEscrowAccount());

  await this.prisma.p2POrder.update({
    where: { id: order.id },
    data: {
      releasedTxHash: txHash,
      releasedAt: new Date(),
      status: 'COMPLETED',
    },
  });

  return txHash;
}

private getEscrowAccount(): string {
  // Conta especial controlada pelo backend
  return process.env.P2P_ESCROW_ADDRESS;
}
```

---

### 4. Novos DTOs

**Arquivo**: `/root/bazari/apps/api/src/modules/p2p/dto/create-offer.dto.ts`

**Modificar**:
```typescript
import { IsEnum, IsOptional, IsDecimal, IsIn } from 'class-validator';

export class CreateOfferDto {
  @IsEnum(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @IsEnum(['BZR', 'ZARI'])
  @IsOptional()
  assetType?: 'BZR' | 'ZARI' = 'BZR';

  @IsDecimal()
  priceBRLPerBZR?: string; // Deprecated, use priceBRLPerUnit

  @IsDecimal()
  @IsOptional()
  priceBRLPerUnit?: string; // Novo campo genérico

  @IsDecimal()
  minBRL: string;

  @IsDecimal()
  maxBRL: string;

  @IsEnum(['PIX', 'BANK_TRANSFER'])
  method: 'PIX' | 'BANK_TRANSFER';

  @IsOptional()
  autoReply?: string;
}
```

**Novo DTO**: `filter-offers.dto.ts`
```typescript
export class FilterOffersDto {
  @IsOptional()
  @IsEnum(['BZR', 'ZARI'])
  assetType?: 'BZR' | 'ZARI';

  @IsOptional()
  @IsIn(['2A', '2B', '3'])
  phase?: string;

  @IsOptional()
  @IsEnum(['BUY', 'SELL'])
  side?: 'BUY' | 'SELL';

  @IsOptional()
  @IsInt()
  limit?: number = 50;
}
```

---

### 5. API Routes

**Arquivo**: `/root/bazari/apps/api/src/modules/p2p/p2p.controller.ts`

**Novas rotas**:
```typescript
@Controller('p2p')
export class P2PController {
  constructor(
    private offerService: P2POfferService,
    private phaseControl: PhaseControlService
  ) {}

  // ✨ NOVO: Buscar fase ZARI ativa
  @Get('zari/phase')
  async getActivePhase() {
    return this.phaseControl.getActivePhase();
  }

  // ✨ NOVO: Estatísticas de ZARI vendido
  @Get('zari/stats')
  async getZARIStats() {
    const phase = await this.phaseControl.getActivePhase();
    const totalOrders = await this.prisma.p2POrder.count({
      where: { assetType: 'ZARI', status: 'COMPLETED' },
    });

    const totalVolume = await this.prisma.p2POrder.aggregate({
      _sum: { amountAsset: true },
      where: { assetType: 'ZARI', status: 'COMPLETED' },
    });

    return {
      phase: phase?.phase,
      totalOrders,
      totalZARISold: totalVolume._sum.amountAsset,
      supplyRemaining: phase?.supplyRemaining,
      progressPercent: phase?.progressPercent,
    };
  }

  // Modificar: Criar oferta (suporta BZR e ZARI)
  @Post('offers')
  @UseGuards(AuthGuard)
  async createOffer(
    @Body() dto: CreateOfferDto,
    @CurrentUser() user: User
  ) {
    return this.offerService.createOffer(dto, user.id);
  }

  // Modificar: Listar ofertas (filtrar por asset)
  @Get('offers')
  async listOffers(@Query() filters: FilterOffersDto) {
    return this.offerService.findOffers(filters);
  }
}
```

---

## 🧪 TESTES

### Cenários de Teste E2E

**Arquivo**: `/root/bazari/apps/api/test/p2p-zari.e2e-spec.ts`

```typescript
describe('P2P ZARI (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Setup test app
  });

  describe('Phase Control', () => {
    it('should return active phase 2A', async () => {
      const response = await request(app.getHttpServer())
        .get('/p2p/zari/phase')
        .expect(200);

      expect(response.body.phase).toBe('2A');
      expect(response.body.priceBZR).toBe('250000000000'); // 0.25 BZR em planck
      expect(response.body.isActive).toBe(true);
    });

    it('should reject ZARI offer if phase sold out', async () => {
      // Mock: fase 2A com 0 supply restante
      await prisma.zARIPhaseConfig.update({
        where: { phase: '2A' },
        data: { supplyLimit: 0n },
      });

      const response = await request(app.getHttpServer())
        .post('/p2p/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          assetType: 'ZARI',
          side: 'SELL',
          minBRL: '100',
          maxBRL: '1000',
          method: 'PIX',
        })
        .expect(400);

      expect(response.body.message).toContain('sold out');
    });
  });

  describe('Create ZARI Offer', () => {
    it('should create SELL offer for ZARI', async () => {
      const response = await request(app.getHttpServer())
        .post('/p2p/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          assetType: 'ZARI',
          side: 'SELL',
          minBRL: '100',
          maxBRL: '1000',
          method: 'PIX',
        })
        .expect(201);

      expect(response.body.assetType).toBe('ZARI');
      expect(response.body.phase).toBe('2A');
      expect(response.body.phasePrice).toBe('0.25');
    });

    it('should reject BUY offer for ZARI', async () => {
      const response = await request(app.getHttpServer())
        .post('/p2p/offers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          assetType: 'ZARI',
          side: 'BUY', // ❌ Não permitido
          minBRL: '100',
          maxBRL: '1000',
          method: 'PIX',
        })
        .expect(400);

      expect(response.body.message).toContain('can only be sold');
    });
  });

  describe('ZARI Order & Escrow', () => {
    it('should lock ZARI in escrow using pallet-assets', async () => {
      // 1. Criar oferta ZARI
      const offer = await createZARIOffer(app, userToken);

      // 2. Taker aceita oferta
      const order = await createOrder(app, takerToken, offer.id, '500'); // R$ 500

      // 3. Maker envia ZARI para escrow
      const response = await request(app.getHttpServer())
        .post(`/p2p/orders/${order.id}/escrow`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.escrowTxHash).toBeDefined();
      expect(response.body.status).toBe('ESCROWED');

      // 4. Verificar on-chain (via Polkadot.js)
      const api = await getBlockchainApi();
      const escrowBalance = await api.query.assets.account(1, ESCROW_ADDRESS);
      expect(escrowBalance.isSome).toBe(true);
    });

    it('should release ZARI from escrow to taker', async () => {
      // ... setup order in ESCROWED state

      // Taker faz PIX
      await submitPixProof(app, takerToken, order.id);

      // Maker confirma e libera
      const response = await request(app.getHttpServer())
        .post(`/p2p/orders/${order.id}/release`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.releasedTxHash).toBeDefined();
    });
  });

  describe('Phase Transition', () => {
    it('should transition from 2A to 2B when sold out', async () => {
      // Mock: vender todo supply da fase 2A
      await sellAllPhase2A();

      // Transição manual (em produção seria automática)
      await request(app.getHttpServer())
        .post('/p2p/zari/phase/transition')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar nova fase ativa
      const phase = await request(app.getHttpServer())
        .get('/p2p/zari/phase')
        .expect(200);

      expect(phase.body.phase).toBe('2B');
      expect(phase.body.priceBZR).toBe('350000000000'); // 0.35 BZR
    });
  });
});
```

---

## 📋 CHECKLIST DE EXECUÇÃO

### Pré-Execução
- [ ] FASE 3 validada (ZARI existe on-chain)
- [ ] FASE 4 validada (Wallet multi-token funciona)
- [ ] Node blockchain rodando
- [ ] Database acessível

### Execução - Database
- [ ] Adicionar enums `P2PAssetType` ao schema
- [ ] Modificar `P2POffer` (campos ZARI)
- [ ] Modificar `P2POrder` (campos ZARI)
- [ ] Criar `ZARIPhaseConfig` model
- [ ] Gerar migration Prisma
- [ ] Executar migration
- [ ] Seed inicial (fases 2A, 2B, 3)

### Execução - Services
- [ ] Criar `phase-control.service.ts`
- [ ] Modificar `p2p-offer.service.ts` (ZARI logic)
- [ ] Modificar `p2p-order.service.ts` (ZARI logic)
- [ ] Modificar `p2p-escrow.service.ts` (pallet-assets)
- [ ] Atualizar DTOs (CreateOfferDto, FilterOffersDto)
- [ ] Adicionar rotas no controller
- [ ] Código compila sem erros TypeScript

### Execução - Testes
- [ ] Testes unitários: PhaseControlService
- [ ] Testes unitários: P2POfferService (ZARI)
- [ ] Testes E2E: Create ZARI offer
- [ ] Testes E2E: ZARI escrow flow
- [ ] Testes E2E: Phase transition
- [ ] Todos os testes passam

### Validação Manual
- [ ] API `/p2p/zari/phase` retorna fase 2A
- [ ] Criar oferta ZARI SELL funciona
- [ ] Criar oferta ZARI BUY rejeita
- [ ] Order ZARI completo (escrow + release)
- [ ] Stats ZARI corretos
- [ ] Transition 2A → 2B funciona

### Pós-Execução
- [ ] Commit das mudanças
- [ ] Tag de versão: `v0.5.0-p2p-zari-backend`
- [ ] Relatório de execução criado
- [ ] Deploy em staging

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Supply Divergente On-chain vs DB (Alto)

**Descrição**: Blockchain tem supply diferente do calculado pelo backend.

**Mitigação**:
- Query on-chain em tempo real (não cachear supply)
- Sincronização diária via cron job
- Alert se divergência > 1%

**Plano B**: Admin endpoint para forçar resync manual.

---

### Risco 2: Escrow ZARI Falha (Médio)

**Descrição**: Transação `assets.transfer` falha por insuficiência de BZR (fees).

**Mitigação**:
- Validar balance BZR do maker ANTES de escrow
- Sugerir amount mínimo de BZR (0.1) para fees
- Retry automático (max 3 tentativas)

**Plano B**: Cancelar order e notificar maker.

---

### Risco 3: Fase Transita Durante Order (Baixo)

**Descrição**: Order criado na fase 2A, mas supply esgota antes de completar.

**Mitigação**:
- Lock pessimista: reservar supply ao criar order
- Expiração de order (24h) libera supply
- Validação no momento do escrow

**Plano B**: Permitir completar order no preço da fase antiga (honrar compromisso).

---

### Risco 4: Preço BRL/BZR Volátil (Médio)

**Descrição**: Taxa BRL/BZR muda durante order, prejudicando maker/taker.

**Mitigação**:
- Snapshot de taxa no momento da criação do order
- Expiração curta (24h)
- Taker vê preço fixo antes de aceitar

**Plano B**: Oracle de preço externo (Chainlink, Band Protocol).

---

## 🚀 PRÓXIMA FASE

**FASE 6: P2P ZARI Frontend**

**Dependências**:
- ✅ FASE 4: Multi-Token Wallet (Frontend)
- ✅ FASE 5: P2P ZARI Backend ← Esta fase

**Escopo**:
- UI para criar ofertas ZARI
- Badge de fase (2A, 2B, 3) com progress bar
- Filtro de asset (BZR | ZARI) na lista de ofertas
- Fluxo de escrow ZARI (pallet-assets)
- Dashboard de stats ZARI

**Duração**: 1.5 semanas
**Risco**: 🟢 Baixo

---

*Especificação criada em: 28/Out/2025*
*Versão: 1.0*
*Autor: Claude Code Agent*
