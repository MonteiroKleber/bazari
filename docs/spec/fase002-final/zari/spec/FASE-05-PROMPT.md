# FASE 5: P2P ZARI Extension (Backend) - PROMPTS DE EXECUÇÃO

**Data**: 2025-10-28
**Fase**: 5
**Duração Estimada**: 2 semanas (80 horas)

---

## 📋 INSTRUÇÕES GERAIS

Estes prompts devem ser executados **sequencialmente** no Claude Code. Cada prompt é independente mas depende do anterior estar completo.

**Regras**:
1. ✅ Executar um prompt por vez
2. ✅ Validar resultado antes de próximo prompt
3. ✅ Commitar após cada etapa completa
4. ⚠️ NÃO pular prompts
5. ⚠️ NÃO executar em paralelo

---

## PROMPT 1: Setup - Database Schema Extensions

**Duração**: ~3 horas

```
Estou iniciando a FASE 5 do projeto Bazari: P2P ZARI Extension (Backend).

Contexto:
- FASE 3 completa: ZARI token existe on-chain (asset ID = 1)
- FASE 4 completa: Wallet frontend suporta múltiplos tokens
- Sistema P2P existente: Suporta apenas BZR
- Objetivo: Permitir venda de ZARI via P2P com fases de preço (2A: 0.25 BZR, 2B: 0.35 BZR, 3: 0.50 BZR)

TAREFA 1: Estender Schema Prisma

Arquivo: /root/bazari/apps/api/prisma/schema.prisma

1. Adicionar ENUM P2PAssetType:
```prisma
enum P2PAssetType {
  BZR
  ZARI
}
```

2. Modificar model P2POffer:
- Adicionar: assetType P2PAssetType @default(BZR)
- Adicionar: assetId String? (null para BZR, '1' para ZARI)
- Adicionar: phase String? ('2A', '2B', '3' ou null)
- Adicionar: phasePrice Decimal? @db.Decimal(18, 12)
- Renomear: priceBRLPerBZR → priceBRLPerUnit
- Adicionar índices: (assetType, phase, status)

3. Modificar model P2POrder:
- Adicionar: assetType P2PAssetType @default(BZR)
- Adicionar: assetId String?
- Adicionar: phase String?
- Renomear: priceBRLPerBZR → priceBRLPerUnit
- Renomear: amountBZR → amountAsset
- Adicionar índices: (assetType, phase)

4. Criar model ZARIPhaseConfig:
```prisma
model ZARIPhaseConfig {
  id          String   @id @default(cuid())
  phase       String   @unique
  priceBZR    Decimal  @db.Decimal(18, 12)
  supplyLimit BigInt
  startBlock  BigInt?
  endBlock    BigInt?
  active      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([phase, active])
}
```

5. Gerar migration Prisma: npx prisma migrate dev --name add_zari_p2p_support

6. Criar seed para ZARIPhaseConfig (se não existir):
- Fase 2A: priceBZR=0.25, supplyLimit=2100000000000000000 (2.1M * 10^12), active=true
- Fase 2B: priceBZR=0.35, supplyLimit=2100000000000000000, active=false
- Fase 3: priceBZR=0.50, supplyLimit=2100000000000000000, active=false

Validação:
- Migration executada sem erros
- Seed criado e executado
- Query SELECT * FROM "ZARIPhaseConfig" retorna 3 registros

Não avance para PROMPT 2 até confirmar que o schema está correto.
```

---

## PROMPT 2: Implementar PhaseControlService

**Duração**: ~6 horas

```
Continuando FASE 5 - PROMPT 2: PhaseControlService

Contexto: Schema Prisma estendido (PROMPT 1 completo)

TAREFA 2: Criar serviço de controle de fases ZARI

Arquivo: /root/bazari/apps/api/src/modules/p2p/phase-control.service.ts

Implementar serviço com os seguintes métodos:

1. getActivePhase(): Promise<PhaseInfo | null>
   - Busca fase ativa no ZARIPhaseConfig
   - Query blockchain para supply de ZARI (api.query.assets.asset(1))
   - Calcula supply vendido (total - 8.4M reserva DAO)
   - Calcula supply restante da fase
   - Retorna:
     - phase: '2A' | '2B' | '3'
     - priceBZR: bigint (em planck, ex: 250000000000 = 0.25 BZR)
     - supplyLimit: bigint
     - supplySold: bigint
     - supplyRemaining: bigint
     - progressPercent: number (0-100)
     - isActive: boolean (false se supply esgotado)
     - nextPhase: string | null

2. canCreateZARIOffer(amountZARI: bigint): Promise<boolean>
   - Valida se há supply restante na fase ativa
   - Throw error se fase esgotada
   - Throw error se amount > supply restante
   - Return true se OK

3. transitionToNextPhase(): Promise<void>
   - Desativa fase atual (active=false, endBlock=current)
   - Ativa próxima fase (active=true, startBlock=current)
   - Sequência: 2A → 2B → 3 → null
   - Log transição no console

4. Métodos auxiliares:
   - getNextPhase(current: string): string | null
   - getCurrentBlock(): Promise<bigint>
   - getBlockchainApi(): Promise<ApiPromise>

Interface PhaseInfo:
```typescript
export interface PhaseInfo {
  phase: string;
  priceBZR: bigint;
  supplyLimit: bigint;
  supplySold: bigint;
  supplyRemaining: bigint;
  progressPercent: number;
  isActive: boolean;
  nextPhase: string | null;
}
```

Importante:
- Usar PrismaService injetado
- Reutilizar conexão blockchain existente (ver: apps/api/src/modules/blockchain/)
- Tratar erros gracefully (asset não encontrado, etc)
- Adicionar logs para debugging

Validação:
- Serviço compila sem erros TypeScript
- getActivePhase() retorna fase 2A corretamente
- canCreateZARIOffer() valida limites

Não avance até confirmar que o serviço está funcional.
```

---

## PROMPT 3: Estender P2POfferService para ZARI

**Duração**: ~8 horas

```
Continuando FASE 5 - PROMPT 3: Estender P2POfferService

Contexto: PhaseControlService implementado (PROMPT 2 completo)

TAREFA 3: Modificar lógica de ofertas para suportar ZARI

Arquivo: /root/bazari/apps/api/src/modules/p2p/p2p-offer.service.ts

Modificações necessárias:

1. Injetar PhaseControlService no constructor

2. Modificar createOffer(dto: CreateOfferDto, userId: string):
   - Adicionar validação: if (dto.assetType === 'ZARI') await validateZARIOffer(dto)
   - Buscar fase ativa se ZARI: const phase = await phaseControl.getActivePhase()
   - Calcular pricePerUnit:
     - BZR: usar dto.priceBRLPerUnit diretamente
     - ZARI: phase.priceBZR * bzrToBRL (consultar taxa média P2P)
   - Salvar offer com campos:
     - assetType: dto.assetType
     - assetId: '1' se ZARI, null se BZR
     - phase: phase?.phase se ZARI
     - phasePrice: phase?.priceBZR se ZARI
     - priceBRLPerUnit: calculado acima

3. Implementar validateZARIOffer(dto: CreateOfferDto) privado:
   - Validar side === 'SELL' (apenas venda de ZARI permitida)
   - Buscar fase ativa
   - Calcular amountZARI estimado (maxBRL / pricePerUnit)
   - Chamar phaseControl.canCreateZARIOffer(amountZARI)
   - Throw BadRequestException se inválido

4. Modificar findOffers(filters: FilterOffersDto):
   - Adicionar filtro por assetType: filters.assetType
   - Adicionar filtro por phase: filters.phase
   - Ordenar por createdAt desc
   - Limitar por filters.limit (default 50)

5. Adicionar método auxiliar:
   - getBZRtoRealRate(): Promise<number> → retorna taxa média BZR/BRL do P2P
   - Implementação simples: média das últimas 10 orders BZR completadas
   - Fallback: 2.0 (R$ 2.00 por BZR)

Validação:
- Criar oferta SELL ZARI funciona
- Criar oferta BUY ZARI é rejeitada (BadRequestException)
- Preço calculado corretamente (0.25 BZR * 2.0 = R$ 0.50)
- Filtro por assetType='ZARI' retorna apenas ofertas ZARI

Não avance até validar todas as operações.
```

---

## PROMPT 4: Estender P2POrderService para ZARI

**Duração**: ~6 horas

```
Continuando FASE 5 - PROMPT 4: Estender P2POrderService

Contexto: P2POfferService suporta ZARI (PROMPT 3 completo)

TAREFA 4: Modificar lógica de orders para ZARI

Arquivo: /root/bazari/apps/api/src/modules/p2p/p2p-order.service.ts

Modificações necessárias:

1. Modificar createOrder(offerId: string, takerId: string, amountBRL: Decimal):
   - Buscar offer pelo ID
   - Validar amountBRL (min ≤ amount ≤ max)
   - Calcular amountAsset:
     - BZR: amountBRL / offer.priceBRLPerUnit
     - ZARI: amountBRL / offer.priceBRLPerUnit
   - Se ZARI: validar supply restante via phaseControl.canCreateZARIOffer(amountAsset)
   - Criar P2POrder com:
     - assetType: offer.assetType
     - assetId: offer.assetId
     - phase: offer.phase
     - priceBRLPerUnit: offer.priceBRLPerUnit
     - amountAsset: calculado acima
     - amountBRL: do parâmetro
     - expiresAt: now + 24h

2. Modificar validateOrderAmount(order: P2POrder):
   - Validar que amount está dentro dos limites da offer
   - Se ZARI: validar que supply ainda disponível na fase

3. Modificar getOrderById(orderId: string):
   - Incluir campos: assetType, assetId, phase
   - Retornar na resposta API

4. Modificar listUserOrders(userId: string, filters?):
   - Adicionar filtro opcional por assetType
   - Ordenar por createdAt desc

5. Adicionar método auxiliar:
   - calculateZARIPrice(phase: string): Decimal
   - Retorna preço BRL baseado na fase e taxa BZR/BRL

Validação:
- Criar order ZARI funciona
- amountAsset calculado corretamente (ex: R$ 500 / R$ 0.50 = 1000 ZARI)
- Validação de supply funciona (rejeita se > supplyRemaining)
- Listagem inclui orders BZR e ZARI

Não avance até validar criação e listagem de orders ZARI.
```

---

## PROMPT 5: Implementar Escrow Multi-Asset

**Duração**: ~10 horas

```
Continuando FASE 5 - PROMPT 5: Escrow Multi-Asset

Contexto: P2POrderService suporta ZARI (PROMPT 4 completo)

TAREFA 5: Estender escrow para suportar BZR e ZARI

Arquivo: /root/bazari/apps/api/src/modules/p2p/p2p-escrow.service.ts

Modificações necessárias:

1. Modificar lockFundsInEscrow(order: P2POrder, makerAddress: string):
   - Buscar order pelo ID (incluir assetType, assetId)
   - Conectar à blockchain API
   - Calcular amount em planck: BigInt(order.amountAsset) * 10^12
   - Determinar transação:
     - Se BZR: api.tx.balances.transfer(escrowAccount, amount)
     - Se ZARI: api.tx.assets.transfer(order.assetId, escrowAccount, amount)
   - Assinar e enviar transação com conta do maker
   - Aguardar confirmação (await tx.isFinalized)
   - Atualizar order:
     - escrowTxHash: tx.hash
     - escrowAt: new Date()
     - status: 'ESCROWED'
   - Retornar txHash

2. Modificar releaseFundsFromEscrow(order: P2POrder, toAddress: string):
   - Buscar order pelo ID
   - Conectar à blockchain API
   - Calcular amount em planck
   - Determinar transação:
     - Se BZR: api.tx.balances.transfer(toAddress, amount)
     - Se ZARI: api.tx.assets.transfer(order.assetId, toAddress, amount)
   - Assinar e enviar com conta de escrow (process.env.P2P_ESCROW_ADDRESS)
   - Aguardar confirmação
   - Atualizar order:
     - releasedTxHash: tx.hash
     - releasedAt: new Date()
     - status: 'COMPLETED'
   - Retornar txHash

3. Adicionar validações:
   - validateMakerBalance(makerAddress: string, order: P2POrder):
     - Query balance do maker on-chain
     - Se BZR: api.query.balances.account(makerAddress)
     - Se ZARI: api.query.assets.account(order.assetId, makerAddress)
     - Validar balance ≥ amount + fees (0.01 BZR)
     - Throw error se insuficiente

4. Adicionar método auxiliar:
   - getEscrowAccount(): string → retorna address de escrow
   - estimateFee(tx): Promise<bigint> → estima fee da tx
   - waitForFinalization(tx): Promise<void> → aguarda confirmação

Importante:
- Usar KeyringPair para assinar transações
- Tratar erros de blockchain (InsufficientBalance, AssetNotFound)
- Adicionar logs detalhados para debugging
- Timeout de 60s para confirmação de tx

Validação:
- Lock BZR funciona (tx confirmada on-chain)
- Lock ZARI funciona (tx assets.transfer confirmada)
- Release BZR funciona
- Release ZARI funciona
- Validação de balance rejeita se insuficiente

Não avance até validar escrow completo BZR + ZARI.
```

---

## PROMPT 6: API Routes e DTOs

**Duração**: ~5 horas

```
Continuando FASE 5 - PROMPT 6: API Routes e DTOs

Contexto: Escrow multi-asset implementado (PROMPT 5 completo)

TAREFA 6: Criar rotas API e DTOs para ZARI

Arquivo 1: /root/bazari/apps/api/src/modules/p2p/dto/create-offer.dto.ts

Modificar CreateOfferDto:
```typescript
export class CreateOfferDto {
  @IsEnum(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @IsEnum(['BZR', 'ZARI'])
  @IsOptional()
  assetType?: 'BZR' | 'ZARI' = 'BZR';

  @IsDecimal()
  @IsOptional()
  priceBRLPerUnit?: string; // Preço por unidade (BZR ou ZARI)

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

Arquivo 2: /root/bazari/apps/api/src/modules/p2p/dto/filter-offers.dto.ts

Criar FilterOffersDto:
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
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
```

Arquivo 3: /root/bazari/apps/api/src/modules/p2p/p2p.controller.ts

Adicionar rotas:

1. GET /p2p/zari/phase
   - Handler: async getActivePhase()
   - Retorna: PhaseInfo da fase ativa
   - Público (sem auth)

2. GET /p2p/zari/stats
   - Handler: async getZARIStats()
   - Retorna:
     - phase: string
     - totalOrders: number
     - totalZARISold: Decimal
     - supplyRemaining: bigint
     - progressPercent: number
   - Público (sem auth)

3. POST /p2p/zari/phase/transition
   - Handler: async transitionPhase()
   - Chama: phaseControl.transitionToNextPhase()
   - Requer: Admin role (use @UseGuards(AdminGuard))
   - Retorna: nova fase ativa

4. Modificar POST /p2p/offers:
   - Adicionar suporte para assetType no body
   - Validar DTO

5. Modificar GET /p2p/offers:
   - Adicionar query params: assetType, phase, side
   - Usar FilterOffersDto

Validação:
- GET /p2p/zari/phase retorna fase 2A
- GET /p2p/zari/stats retorna estatísticas corretas
- POST /p2p/offers com assetType=ZARI funciona
- GET /p2p/offers?assetType=ZARI filtra corretamente
- POST /p2p/zari/phase/transition requer admin

Não avance até validar todas as rotas via Postman ou curl.
```

---

## PROMPT 7: Testes E2E

**Duração**: ~6 horas

```
Continuando FASE 5 - PROMPT 7: Testes E2E

Contexto: API Routes implementadas (PROMPT 6 completo)

TAREFA 7: Criar suite de testes E2E

Arquivo: /root/bazari/apps/api/test/p2p-zari.e2e-spec.ts

Implementar testes:

1. Setup (beforeAll):
   - Criar app de teste
   - Criar usuários: maker, taker, admin
   - Seed ZARIPhaseConfig
   - Conectar blockchain (testnet local)

2. Teste: Phase Control
   - Deve retornar fase ativa 2A
   - Deve retornar priceBZR = 0.25
   - Deve calcular supply restante corretamente
   - Deve rejeitar criação de oferta se fase esgotada

3. Teste: Create ZARI Offer
   - Deve criar oferta SELL ZARI com sucesso
   - Deve rejeitar oferta BUY ZARI (BadRequestException)
   - Deve validar minBRL ≤ maxBRL
   - Deve atribuir phase correta (2A)

4. Teste: Filter Offers
   - Deve filtrar por assetType=ZARI
   - Deve filtrar por phase=2A
   - Deve filtrar por side=SELL
   - Deve limitar resultados (limit=10)

5. Teste: Create ZARI Order
   - Deve criar order a partir de oferta ZARI
   - Deve calcular amountAsset corretamente
   - Deve validar supply restante
   - Deve expirar em 24h

6. Teste: ZARI Escrow Flow (integração blockchain)
   - Maker cria oferta ZARI
   - Taker aceita e cria order
   - Maker lock ZARI em escrow (tx on-chain)
   - Verificar balance de escrow on-chain
   - Taker faz PIX (mock)
   - Maker release ZARI (tx on-chain)
   - Verificar balance de taker on-chain
   - Order marcada como COMPLETED

7. Teste: Phase Transition
   - Mock: fase 2A com supply esgotado
   - Admin chama POST /p2p/zari/phase/transition
   - Verificar fase 2B ativa
   - Verificar priceBZR = 0.35
   - Verificar fase 2A desativada (active=false)

8. Teste: Stats
   - Criar 5 orders ZARI COMPLETED
   - GET /p2p/zari/stats
   - Verificar totalOrders = 5
   - Verificar totalZARISold correto

Comandos para executar:
```bash
npm run test:e2e p2p-zari.e2e-spec.ts
```

Validação:
- Todos os 8 grupos de testes passam
- Coverage > 80% (phase-control, offer, order, escrow)
- Nenhum warning de TypeScript

Não avance até todos os testes estarem verdes.
```

---

## PROMPT 8: Documentação e Deploy

**Duração**: ~2 horas

```
Continuando FASE 5 - PROMPT 8: Documentação e Deploy

Contexto: Testes E2E passando (PROMPT 7 completo)

TAREFA 8: Documentação e preparação para deploy

1. Criar RELATORIO-EXECUCAO.md:
   - Resumo das mudanças (schema, services, API)
   - Validações realizadas
   - Testes executados e resultados
   - Comandos executados (migrations, seeds)
   - Screenshots/logs importantes
   - Problemas encontrados e soluções
   - Tempo total gasto

2. Atualizar README.md (se necessário):
   - Adicionar seção sobre P2P ZARI
   - Documentar novas variáveis de ambiente:
     - P2P_ESCROW_ADDRESS (conta de escrow)
     - P2P_ESCROW_SEED (seed phrase)
   - Exemplos de uso da API

3. Criar arquivo .env.example:
```env
# P2P Escrow (FASE 5)
P2P_ESCROW_ADDRESS=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
P2P_ESCROW_SEED=//Alice
```

4. Preparar migration para produção:
   - Criar script: scripts/migrate-fase5.sh
   - Comandos:
     - npx prisma migrate deploy
     - npx prisma db seed (ZARIPhaseConfig)
   - Rollback plan (caso necessário)

5. Git commit e tag:
```bash
git add .
git commit -m "feat(p2p): FASE 5 - P2P ZARI Extension (Backend)

- Schema: Add P2PAssetType, ZARIPhaseConfig
- Services: PhaseControlService, escrow multi-asset
- API: Routes for ZARI offers/orders
- Tests: E2E suite for ZARI P2P flow

Closes #FASE-5"

git tag v0.5.0-p2p-zari-backend
git push origin main --tags
```

6. Deploy checklist:
   - [ ] Migration executada em produção
   - [ ] Seed ZARIPhaseConfig executado
   - [ ] Variáveis de ambiente configuradas (P2P_ESCROW_*)
   - [ ] Conta de escrow criada e com saldo BZR (para fees)
   - [ ] Testes smoke em produção (GET /p2p/zari/phase)
   - [ ] Monitoramento de logs habilitado
   - [ ] Alert configurado (supply restante < 10%)

Validação:
- RELATORIO-EXECUCAO.md completo
- README.md atualizado
- Commit e tag criados
- Deploy em staging funcionando

FASE 5 COMPLETA! ✅
```

---

## 📊 CRONOGRAMA SUGERIDO

| Dia | Prompt | Duração | Tarefa |
|-----|--------|---------|--------|
| 1 | PROMPT 1 | 3h | Database Schema |
| 2 | PROMPT 2 | 6h | PhaseControlService |
| 3 | PROMPT 3 | 8h | P2POfferService |
| 4 | PROMPT 4 | 6h | P2POrderService |
| 5-6 | PROMPT 5 | 10h | Escrow Multi-Asset |
| 7 | PROMPT 6 | 5h | API Routes & DTOs |
| 8 | PROMPT 7 | 6h | Testes E2E |
| 9 | PROMPT 8 | 2h | Documentação & Deploy |

**Total**: 9 dias (~80 horas)

---

## ⚠️ NOTAS IMPORTANTES

1. **Blockchain Connection**:
   - Reutilizar conexão existente em `apps/api/src/modules/blockchain/`
   - Não criar nova conexão, importar serviço existente

2. **Escrow Account**:
   - Usar conta separada para escrow (não conta do sistema)
   - Seed phrase deve estar em .env (não hardcoded)
   - Manter saldo mínimo de BZR (1 BZR) para fees

3. **Phase Transition**:
   - Implementar endpoint manual (PROMPT 6)
   - Futuramente: cron job automático
   - Notificar usuários via WebSocket (FASE 6)

4. **Testing**:
   - Usar blockchain local (--dev)
   - Criar ZARI token no test setup (se necessário)
   - Mock de transações para testes unitários

5. **Security**:
   - Validar ALL inputs (DTOs com class-validator)
   - Rate limiting em rotas de criação de offers
   - Sanitizar addresses de blockchain

---

*Prompts criados em: 28/Out/2025*
*Versão: 1.0*
*Autor: Claude Code Agent*
