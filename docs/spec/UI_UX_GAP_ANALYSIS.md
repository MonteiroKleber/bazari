# Relatório: Análise de Gap UI/UX - Blockchain Implementation

**Data**: 2025-11-14
**Versão**: 1.0
**Autor**: Claude Code Senior Architect

---

## 📋 Sumário Executivo

Este relatório apresenta uma análise detalhada comparando:
- ✅ **Documentação Blockchain**: 8 pallets documentados (bazari-commerce, escrow, rewards, attestation, fulfillment, affiliate, fee, dispute)
- ✅ **Implementação UI/UX Atual**: 56+ páginas, 200+ componentes, 50+ hooks

**Objetivo**: Identificar gaps, ajustes necessários e novas telas a serem construídas para atender 100% da documentação blockchain implementada.

---

## 🎯 Status Geral

### Pallets vs UI/UX Coverage

| Pallet | Documentação | Backend | UI/UX Status | Gap % | Prioridade |
|--------|-------------|---------|--------------|-------|-----------|
| **bazari-commerce** | ✅ 100% | ✅ 100% | ✅ 95% | 5% | P1 |
| **bazari-escrow** | ✅ 100% | ✅ 100% | ⚠️ 70% | 30% | P1 |
| **bazari-rewards** | ✅ 100% | ⚠️ 50% | ❌ 20% | 80% | P1 |
| **bazari-attestation** | ✅ 100% | ⚠️ 60% | ⚠️ 60% | 40% | P2 |
| **bazari-fulfillment** | ✅ 100% | ⚠️ 70% | ✅ 85% | 15% | P2 |
| **bazari-affiliate** | ✅ 100% | ❌ 30% | ⚠️ 50% | 50% | P2 |
| **bazari-fee** | ✅ 100% | ❌ 10% | ❌ 10% | 90% | P2 |
| **bazari-dispute** | ✅ 100% | ⚠️ 50% | ⚠️ 40% | 60% | P2 |

**Legenda**:
- ✅ **Completo** (90-100%)
- ⚠️ **Parcial** (40-89%)
- ❌ **Mínimo/Ausente** (0-39%)

---

## 📊 ANÁLISE DETALHADA POR PALLET

---

## 1. bazari-commerce (P1 - Foundation)

### 1.1 Funcionalidades Documentadas

**Extrinsics**:
- `create_order` - Criar order on-chain
- `mark_shipped` - Marcar como enviado
- `complete_delivery` - Completar entrega
- `mint_receipt` - Mint NFT receipt
- `record_commission` - ✅ **RECÉM IMPLEMENTADO**

**Events**:
- `OrderCreated`, `OrderPaid`, `OrderShipped`, `OrderCompleted`, `OrderDisputed`
- `CommissionRecorded` ✅ **NOVO**

**Storage**:
- `Orders<OrderId, Order>` - Orders on-chain
- `Sales<SaleId, Sale>` - Sales com `commission_paid` ✅ **NOVO**
- `CommissionPolicies<StoreId, Policy>` - Políticas de comissão

---

### 1.2 UI/UX Existente ✅

#### Páginas Implementadas:
- ✅ **CheckoutPage** - Criação de orders (unified Order/ChatProposal)
- ✅ **OrderPage** - Detalhes do order com:
  - Status tracking (PENDING → PAID → SHIPPED → DELIVERED)
  - Payment intent details (escrow logs)
  - Delivery tracking integration
  - Transaction hashes (txHashIn, txHashRelease, txHashRefund)
  - Actions: Confirm received, Cancel
- ✅ **CartPage** - Gestão do carrinho (multi-store support)
- ✅ **SellersListPage** - Lista de sellers
- ✅ **SellerOrdersPage** - Gestão de orders do seller

#### Componentes:
- ✅ **ProposalCard** (chat) - Criação de proposals que viram orders
- ✅ **ReceiptCard** (chat) - Visualização de receipts (IPFS)
- ✅ **DeliveryStatusTimeline** - Timeline de estados do order

#### Hooks:
- ✅ `useBlockchainOrders()` - Query orders
- ✅ `useCreateOrder()` - Criar order on-chain
- ✅ `useBlockchainOrder()` - Get single order

---

### 1.3 Gaps Identificados ⚠️ (5%)

#### Gap 1.1: Commission Tracking UI (NOVO)
**Descrição**: `record_commission` extrinsic foi implementado, mas não há UI para visualizar comissões acumuladas.

**O que falta**:
1. **Sale Detail Page** - Página para visualizar Sale com:
   - `sale_id`, `order_id`, `seller`, `buyer`, `amount`
   - **`commission_paid`** ✅ Novo campo
   - Lista de comissões registradas (histórico)
   - Breakdown: Platform fee, Affiliate, Seller net
2. **Commission History Component**:
   - Lista de `CommissionRecorded` events
   - Filtros: Por sale, por recipient, por data
   - Total acumulado
3. **Commission Dashboard** (Seller):
   - Total de comissões pagas
   - Comissões por afiliado
   - Comissões por produto

**Prioridade**: 🔴 **Alta** (funcionalidade nova implementada)

**Esforço**: 3 dias (1 página + 2 componentes + hooks)

---

#### Gap 1.2: Receipt NFT Minting UI
**Descrição**: `mint_receipt` extrinsic existe, mas não há UI para trigger.

**O que falta**:
1. **Button "Mint Receipt NFT"** no OrderPage (após DELIVERED)
2. **NFT Viewer** para mostrar receipt como NFT (collection, item_id)
3. **NFT Gallery** para ver todos receipts mintados (usando `pallet-uniques`)

**Prioridade**: 🟡 **Média** (feature nice-to-have)

**Esforço**: 2 dias

---

#### Gap 1.3: Order State Machine Enforcement
**Descrição**: UI permite ações que podem falhar on-chain (transições inválidas).

**O que falta**:
1. **State Machine Validation** no frontend:
   - Disable buttons para transições inválidas
   - Ex: "Mark Shipped" só enabled se status == PAID
   - Ex: "Complete Delivery" só enabled se status == SHIPPED
2. **Visual Feedback** de transições permitidas

**Prioridade**: 🟡 **Média** (UX improvement)

**Esforço**: 1 dia

---

### 1.4 Ajustes Necessários 🔧

#### Ajuste 1.1: Unificação Order/ChatProposal
**Status**: ⚠️ Parcialmente implementado

**O que existe**:
- ChatProposal cria orders após payment
- ProposalCard com accept/reject

**O que ajustar**:
1. **Adicionar campo `source`** (MARKETPLACE | BAZCHAT) no OrderPage UI
2. **Adicionar `threadId`** para BazChat orders (link para thread)
3. **Badge visual** indicando origem (Marketplace icon vs Chat icon)

**Esforço**: 1 dia

---

#### Ajuste 1.2: Multi-Store Order Breakdown
**Status**: ⚠️ Parcialmente implementado

**O que existe**:
- Cart suporta multi-store
- CheckoutPage cria orders

**O que ajustar**:
1. **OrderPage precisa mostrar breakdown por store** se isMultiStore
2. **Exibir OrderItems agrupados por store**
3. **Payment intent por store** (cada store tem seu escrow)

**Esforço**: 2 dias

---

### 1.5 Telas Novas a Construir 🏗️

#### Nova Tela 1.1: Commission Analytics Page
**Rota**: `/app/seller/commissions`

**Propósito**: Dashboard de comissões para sellers

**Componentes**:
- **CommissionSummaryCard**: Total paid, Total pending, Avg per sale
- **CommissionHistoryTable**: Lista de CommissionRecorded events
  - Colunas: Date, Sale ID, Recipient, Amount, TxHash
  - Filtros: Date range, Recipient
- **CommissionChart**: Line chart de comissões ao longo do tempo
- **TopAffiliatesCard**: Top 5 afiliados por comissão

**Dados necessários**:
- Backend endpoint: `GET /api/sales/:saleId/commissions`
- Blockchain query: `bazariCommerce.sales(saleId).commission_paid`
- Events: `CommissionRecorded` events via event listener

**Esforço**: 3 dias

---

#### Nova Tela 1.2: Sale Detail Page
**Rota**: `/app/sales/:saleId`

**Propósito**: Visualizar detalhes completos de uma Sale

**Componentes**:
- **SaleOverview**: sale_id, order_id, seller, buyer, amount, created_at
- **CommissionBreakdown**:
  - Platform fee: X BZR
  - Affiliate commissions: Y BZR (commission_paid)
  - Seller net: Z BZR
- **CommissionHistoryList**: Lista de comissões registradas
- **RelatedOrderButton**: Link para OrderPage

**Dados necessários**:
- Blockchain query: `bazariCommerce.sales(saleId)`
- Backend: `GET /api/sales/:saleId` (cache PostgreSQL)

**Esforço**: 2 dias

---

## 2. bazari-escrow (P1 - Foundation)

### 2.1 Funcionalidades Documentadas

**Extrinsics**:
- `lock_funds` - Travar fundos em escrow
- `release_funds` - Liberar fundos para seller (manual)
- `refund` - Refund para buyer (DAO only)
- `partial_refund` - Split parcial (DAO)
- **Auto-release**: 7 days timeout (blockchain logic)

**Events**:
- `EscrowLocked`, `FundsReleased`, `Refunded`, `PartialRefund`

**Storage**:
- `Escrows<OrderId, Escrow>` - Escrow state machine

---

### 2.2 UI/UX Existente ⚠️

#### Páginas Implementadas:
- ⚠️ **OrderPage** - Mostra payment intents mas sem detalhes de escrow
  - Exibe txHash (txHashIn, txHashRelease, txHashRefund)
  - Mostra status (PENDING, ESCROWED, FUNDS_IN, RELEASED, REFUNDED)
  - **NÃO mostra**: Escrow details (amount_locked, amount_released, timestamps)

#### Componentes:
- ❌ **Nenhum componente dedicado a escrow**

#### Hooks:
- ❌ **Nenhum hook específico para escrow queries**

---

### 2.3 Gaps Identificados ⚠️ (30%)

#### Gap 2.1: Escrow Visualization Component
**Descrição**: Não há UI para visualizar estado do escrow.

**O que falta**:
1. **EscrowCard Component**:
   ```tsx
   interface EscrowCardProps {
     orderId: number;
     escrow: {
       buyer: string;
       seller: string;
       amount_locked: string;
       amount_released: string;
       status: 'Locked' | 'Released' | 'Refunded' | 'PartialRefund';
       locked_at: number;
       updated_at: number;
     };
   }
   ```
   - Visual: Status badge, Amount locked/released, Timestamps
   - Actions: "Early Release" button (buyer only)
   - Timer: "Auto-release in X days" countdown

**Prioridade**: 🔴 **Alta** (core payment feature)

**Esforço**: 2 dias

---

#### Gap 2.2: Auto-Release Countdown
**Descrição**: 7-day auto-release não tem feedback visual.

**O que falta**:
1. **CountdownTimer Component**:
   - Calcula time_left = locked_at + 7 days - current_block
   - Mostra "Auto-release in: 5 days 3h 12m"
   - Warning quando < 24h: "⚠️ Releasing soon!"
2. **Progress Bar** visual do countdown

**Prioridade**: 🔴 **Alta** (user expectation management)

**Esforço**: 1 dia

---

#### Gap 2.3: Refund & Partial Refund UI
**Descrição**: DAO pode fazer refund mas não há interface.

**O que falta**:
1. **Admin/DAO Page**: `/app/admin/escrows`
   - Lista de escrows ativos
   - Botão "Force Refund" (DAO only)
   - Botão "Partial Refund" (DAO only)
   - Modal para partial refund:
     - Input: buyer_amount, seller_amount
     - Validação: Sum == amount_locked
2. **Authorization Check**: Verificar se user é DAO member

**Prioridade**: 🟡 **Média** (admin feature)

**Esforço**: 3 dias

---

#### Gap 2.4: Escrow History & Logs
**Descrição**: Não há histórico de eventos de escrow.

**O que falta**:
1. **EscrowEventsLog Component**:
   - Lista de events: Locked → Released/Refunded
   - Timeline visual (similar a DeliveryStatusTimeline)
   - Link para blockchain explorer (txHash)

**Prioridade**: 🟡 **Média** (transparency)

**Esforço**: 2 dias

---

### 2.4 Telas Novas a Construir 🏗️

#### Nova Tela 2.1: Escrow Management Page (Buyer)
**Rota**: `/app/orders/:orderId/escrow`

**Propósito**: Detalhes completos do escrow para o buyer

**Componentes**:
- **EscrowOverview**: Status, amounts, timestamps
- **CountdownTimer**: Auto-release countdown
- **EscrowEventsLog**: Timeline de eventos
- **ActionButtons**:
  - "Release Early" (buyer confirma entrega)
  - "Request Refund" (abre dispute se necessário)

**Dados necessários**:
- Blockchain query: `bazariEscrow.escrows(orderId)`
- Hook: `useEscrowDetails(orderId)`

**Esforço**: 3 dias

---

#### Nova Tela 2.2: Admin Escrow Dashboard
**Rota**: `/app/admin/escrows`

**Propósito**: Gestão de escrows pelo DAO

**Componentes**:
- **ActiveEscrowsList**: Lista de escrows locked
- **FilterPanel**: Por status, por seller, por date
- **RefundModal**: Force refund (DAO action)
- **PartialRefundModal**: Split refund (DAO action)
- **EscrowStats**: Total locked, Total released, Avg lock time

**Restrição**: Apenas DAO members

**Esforço**: 4 dias

---

## 3. bazari-rewards (P1 - Foundation)

### 3.1 Funcionalidades Documentadas

**Extrinsics**:
- `create_mission` - Criar missão (DAO)
- `complete_mission` - Completar missão (auto-trigger)
- `mint_cashback` - Mint ZARI tokens como cashback

**Mission Types**:
- `CompleteOrders` - Completar N orders
- `SpendAmount` - Gastar X BZR
- `ReferUsers` - Referir Y users
- `CreateStore` - Criar loja
- `FirstPurchase` - Primeira compra
- `DailyStreak` - Streak diário (7, 30, 100 days)
- `Custom` - Missão personalizada

**Events**:
- `MissionCreated`, `MissionCompleted`, `CashbackMinted`

**Storage**:
- `Missions<MissionId, Mission>` - Missões configuráveis
- `UserMissions<AccountId, MissionId, Progress>` - Progresso individual
- `CashbackBalance<AccountId, Balance>` - Saldo de cashback ZARI

---

### 3.2 UI/UX Existente ❌

#### Páginas Implementadas:
- ❌ **Nenhuma página dedicada a missões**
- ❌ **Nenhuma página de cashback**

#### Componentes:
- ⚠️ **MissionCard** (chat) - Existe mas não conectado ao blockchain
- ⚠️ **OpportunityCard** (chat) - Generic opportunities, não missões
- ❌ **Nenhum componente de streak tracking**

#### Hooks:
- ❌ **Nenhum hook de missões**

---

### 3.3 Gaps Identificados ❌ (80%)

#### Gap 3.1: Missions Dashboard (CRÍTICO)
**Descrição**: Sistema de missões completamente ausente na UI.

**O que falta**:
1. **MissionsPage** - Hub de missões:
   - Lista de missões disponíveis
   - Progresso de cada missão (barra de progresso)
   - Rewards (X ZARI tokens)
   - CTA: "Complete Now" ou "Claim Reward"
2. **MissionCard Component** (novo):
   ```tsx
   interface MissionCardProps {
     mission: {
       id: number;
       type: MissionType;
       title: string;
       description: string;
       reward: string; // "50 ZARI"
       progress: number; // 0-100%
       target: number; // e.g., 10 orders
       current: number; // e.g., 3 orders
       completed: boolean;
     };
   }
   ```
   - Visual: Icon por tipo, Progress bar, Reward badge
   - Actions: "Claim" button se completed
3. **Mission Types Icons**:
   - CompleteOrders: 📦
   - SpendAmount: 💰
   - ReferUsers: 👥
   - CreateStore: 🏪
   - FirstPurchase: 🎉
   - DailyStreak: 🔥
   - Custom: ⭐

**Prioridade**: 🔴 **CRÍTICA** (gamification core feature)

**Esforço**: 5 dias

---

#### Gap 3.2: Streak Tracking UI
**Descrição**: Daily streaks não têm visualização.

**O que falta**:
1. **StreakWidget** (dashboard ou sidebar):
   - "🔥 7 Day Streak!" badge
   - Próximo milestone: "30 days in 23 days"
   - Calendar visual: Últimos 30 days (green = active)
2. **StreakMilestones**:
   - 7 days: +10 ZARI bonus
   - 30 days: +50 ZARI bonus
   - 100 days: +200 ZARI bonus
3. **Streak History**: Graph de streaks ao longo do tempo

**Prioridade**: 🔴 **Alta** (engagement feature)

**Esforço**: 3 dias

---

#### Gap 3.3: Cashback Balance Display
**Descrição**: Cashback ZARI não tem visualização dedicada.

**O que falta**:
1. **CashbackBalance Component**:
   - "💰 Cashback: 123.45 ZARI"
   - Botão "Convert to BZR" ou "Withdraw"
   - Histórico de cashback minted (MissionCompleted events)
2. **Cashback History Page**: `/app/rewards/cashback`
   - Lista de cashback events
   - Total earned
   - Total converted/withdrawn

**Prioridade**: 🔴 **Alta** (money feature)

**Esforço**: 2 dias

---

#### Gap 3.4: Mission Completion Triggers
**Descrição**: Auto-completion não tem feedback.

**O que falta**:
1. **Toast Notification** quando missão completa:
   - "🎉 Mission Complete! You earned 50 ZARI"
   - CTA: "View Missions" (link para MissionsPage)
2. **Badge Animation** quando milestone atingido
3. **WebSocket Listener** para MissionCompleted events

**Prioridade**: 🟡 **Média** (UX enhancement)

**Esforço**: 2 dias

---

### 3.4 Telas Novas a Construir 🏗️

#### Nova Tela 3.1: Missions Hub Page
**Rota**: `/app/rewards/missions`

**Propósito**: Central de missões e gamification

**Componentes**:
- **MissionsList**: Grid de MissionCard
- **FilterTabs**: All, Active, Completed
- **StreakWidget**: Daily streak display
- **CashbackBalance**: Total ZARI earned
- **LeaderboardPreview**: Top 10 users (optional)

**Dados necessários**:
- Blockchain query: `bazariRewards.missions()` (todas missões)
- Blockchain query: `bazariRewards.userMissions(accountId, missionId)` (progresso)
- Hook: `useMissions()`, `useUserMissionProgress(missionId)`

**Esforço**: 5 dias

---

#### Nova Tela 3.2: Streak History Page
**Rota**: `/app/rewards/streaks`

**Propósito**: Visualizar histórico de streaks

**Componentes**:
- **StreakCalendar**: Calendar view dos últimos 365 days
- **StreakStats**: Longest streak, Current streak, Total days
- **MilestoneProgress**: Next milestone countdown
- **StreakChart**: Line chart de streak ao longo do tempo

**Dados necessários**:
- Backend endpoint: `GET /api/users/:id/streaks`
- Blockchain: UserMissions com type=DailyStreak

**Esforço**: 3 dias

---

#### Nova Tela 3.3: Cashback Dashboard
**Rota**: `/app/rewards/cashback`

**Propósito**: Gestão de cashback ZARI

**Componentes**:
- **CashbackOverview**: Total earned, Available, Withdrawn
- **CashbackHistory**: Lista de CashbackMinted events
- **ConversionPanel**: "Convert X ZARI to BZR" (rate display)
- **WithdrawButton**: Withdraw ZARI para wallet

**Dados necessários**:
- Blockchain query: `bazariRewards.cashbackBalance(accountId)`
- Events: `CashbackMinted` via event listener

**Esforço**: 3 dias

---

#### Nova Tela 3.4: Admin Missions Management
**Rota**: `/app/admin/missions`

**Propósito**: DAO cria e gerencia missões

**Componentes**:
- **CreateMissionForm**:
  - Mission type (dropdown)
  - Title, Description
  - Reward amount (ZARI)
  - Target (e.g., 10 orders)
  - Max completions (e.g., 1 for FirstPurchase)
  - Start/End dates
- **MissionsList**: Todas missões (active, expired)
- **MissionStats**: Completion rate, Total rewards distributed

**Restrição**: DAO only

**Esforço**: 4 dias

---

## 4. bazari-attestation (P2 - Proof of Commerce)

### 4.1 Funcionalidades Documentadas

**Extrinsics**:
- `submit_proof` - Submit proof (IPFS CID + metadata)
- `co_sign` - Co-sign proof (buyer/seller/courier)
- `verify_quorum` - Auto-verify quando threshold met (2-of-3)

**Proof Types**:
- `HandoffProof` - Pickup (courier picks up from seller)
- `DeliveryProof` - Delivery (courier delivers to buyer)
- `PackingProof` - Packing verification
- `InspectionProof` - Quality inspection

**Events**:
- `ProofSubmitted`, `ProofCoSigned`, `AttestationVerified`

**Storage**:
- `Attestations<AttestationId, Attestation>` - Proofs com IPFS CID
- `OrderAttestations<OrderId, Vec<AttestationId>>` - Proofs por order

---

### 4.2 UI/UX Existente ⚠️

#### Páginas Implementadas:
- ⚠️ **ActiveDeliveryPage** - Submit delivery proof (IPFS upload)
  - Confirm pickup button
  - Confirm delivery button
  - **NÃO mostra**: Co-signature status, Quorum verification

#### Componentes:
- ✅ **ProofCard** - Exibe proof details:
  - IPFS CID link
  - Attestor address
  - GPS waypoint data
  - TxHash, BlockNumber
  - **NÃO mostra**: Co-signatures, Quorum status

#### Hooks:
- ✅ `useBlockchainProofs()` - Query proofs
- ✅ `useSubmitProof()` - Submit proof mutation

---

### 4.3 Gaps Identificados ⚠️ (40%)

#### Gap 4.1: Co-Signature UI
**Descrição**: Proofs precisam de co-assinaturas mas não há UI.

**O que falta**:
1. **CoSignatureStatus Component**:
   ```tsx
   interface CoSignatureStatusProps {
     attestation: {
       id: number;
       signatures: string[]; // ['0xAlice', '0xBob']
       threshold: number; // 2
       verified: boolean;
     };
   }
   ```
   - Visual: Checkmarks para cada signature
   - Ex: "✅ Seller | ⏳ Courier | ⏳ Buyer (2/3)"
   - Badge: "Verified ✅" quando threshold met
2. **CoSignButton**:
   - Aparece para parties que ainda não assinaram
   - Ex: Buyer vê "Sign Delivery Proof"
3. **Quorum Progress Bar**: Visual de 2/3 complete

**Prioridade**: 🔴 **Alta** (fraud prevention)

**Esforço**: 2 dias

---

#### Gap 4.2: Proof Type Visualization
**Descrição**: 4 proof types não têm diferenciação visual.

**O que falta**:
1. **Proof Type Icons & Labels**:
   - HandoffProof: 🤝 "Pickup Confirmed"
   - DeliveryProof: 📦 "Delivery Confirmed"
   - PackingProof: 📦 "Packing Verified"
   - InspectionProof: 🔍 "Quality Inspected"
2. **Proof Type Filter** no OrderPage:
   - Tabs: All, Handoff, Delivery, Packing, Inspection

**Prioridade**: 🟡 **Média** (UX clarity)

**Esforço**: 1 dia

---

#### Gap 4.3: IPFS Proof Viewer
**Descrição**: ProofCard mostra CID mas não preview.

**O que falta**:
1. **IPFS Content Preview**:
   - Se image: Mostrar thumbnail
   - Se JSON: Mostrar formatted JSON
   - Botão "View Full Proof" (abre IPFS gateway)
2. **GPS Map Preview** (se proof tem GPS):
   - Embed map com waypoint
   - Address display

**Prioridade**: 🟡 **Média** (transparency)

**Esforço**: 2 dias

---

### 4.4 Ajustes Necessários 🔧

#### Ajuste 4.1: ProofCard Enhancement
**Status**: ⚠️ Implementado mas incompleto

**O que ajustar**:
1. **Adicionar Co-Signature Section**:
   - Lista de signatories com status
   - "Sign Proof" button se applicable
2. **Adicionar Verification Badge**:
   - "Verified ✅" se quorum met
   - "Pending ⏳" se waiting signatures
3. **Proof Type Icon** no header do card

**Esforço**: 1 dia

---

### 4.5 Telas Novas a Construir 🏗️

#### Nova Tela 4.1: Proof Verification Page
**Rota**: `/app/orders/:orderId/proofs/:proofId`

**Propósito**: Visualizar e co-assinar proof

**Componentes**:
- **ProofHeader**: Type, Status, IPFS CID
- **ProofContent**: IPFS preview (image/JSON)
- **CoSignatureStatus**: Signatories progress
- **GPSMapPreview**: Se proof tem GPS
- **CoSignButton**: "Sign This Proof" (se applicable)
- **ProofMetadata**: Timestamp, Block number, TxHash

**Dados necessários**:
- Blockchain query: `bazariAttestation.attestations(proofId)`
- Hook: `useProofDetails(proofId)`, `useCoSignProof()`

**Esforço**: 3 dias

---

## 5. bazari-fulfillment (P2 - Proof of Commerce)

### 5.1 Funcionalidades Documentadas

**Extrinsics**:
- `register_courier` - Registrar courier (stake 1000 BZR)
- `assign_courier` - Atribuir courier a delivery
- `slash_courier` - Punir courier (DAO)
- `update_reputation` - Atualizar reputation score

**Courier Matching**:
- Sort by: reputation DESC, distance ASC
- Requirements: Stake >= 1000 BZR, Reputation > 0

**Reputation System**:
- Score: 0-1000
- Based on: Successful deliveries, Reviews, Disputes
- Slashing: Lose stake + reputation

**Hybrid GPS**:
- Off-chain: 60+ waypoints (PostgreSQL)
- On-chain: Handoff + Delivery proofs only
- Reviews: Merkle root on-chain, reviews off-chain

**Events**:
- `CourierRegistered`, `CourierAssigned`, `CourierSlashed`, `ReputationUpdated`

**Storage**:
- `Couriers<AccountId, Courier>` - Courier registry
- `OrderCouriers<OrderId, AccountId>` - Assignment mapping

---

### 5.2 UI/UX Existente ✅

#### Páginas Implementadas:
- ✅ **DeliveryDashboardPage** - Courier dashboard:
  - GPS status indicator
  - Active deliveries
  - KPI cards (deliveries, earnings, rating)
  - Availability toggle
- ✅ **DeliveryProfileSetupPage** - Courier registration:
  - Vehicle type
  - Service area radius
  - **NÃO exige**: Stake de 1000 BZR ❌
- ✅ **ActiveDeliveryPage** - Real-time tracking:
  - Status timeline
  - Address cards
  - Fee breakdown
  - Confirm pickup/delivery buttons
  - GPS waypoint recording
- ✅ **DeliveryHistoryPage** - Past deliveries
- ✅ **DeliveryEarningsPage** - Earnings history
- ✅ **DeliveryRequestsListPage** - Available requests

#### Componentes:
- ✅ **CourierCard** - Courier profile display
- ✅ **DeliveryStatusTimeline** - Timeline visual
- ✅ **GPSStatusIndicator** - GPS signal quality

#### Hooks:
- ✅ `useRegisterCourier()` - Register mutation
- ✅ `useSubmitReview()` - Review submission
- ✅ `useRecordWaypoint()` - GPS waypoint
- ✅ `useDeliveryProfile()` - Profile query

---

### 5.3 Gaps Identificados ⚠️ (15%)

#### Gap 5.1: Stake Requirement UI (CRÍTICO)
**Descrição**: Courier registration não exige stake de 1000 BZR.

**O que falta**:
1. **StakePanel** no DeliveryProfileSetupPage:
   - "Stake Required: 1000 BZR"
   - Current balance display
   - Input: Stake amount (default 1000)
   - Botão "Stake BZR" (calls `register_courier` on-chain)
   - Warning: "Stake can be slashed if misconduct"
2. **Balance Check**: Disable registration se balance < 1000 BZR

**Prioridade**: 🔴 **CRÍTICA** (security feature)

**Esforço**: 2 dias

---

#### Gap 5.2: Courier Reputation Display
**Descrição**: Reputation score existe mas visualização limitada.

**O que falta**:
1. **ReputationScore Component** (enhanced):
   - Score: "850/1000" com star rating (4.2★)
   - Breakdown:
     - Successful deliveries: 95%
     - Avg rating: 4.5★
     - Disputes: 2 (slashing events)
   - Badge: "Master Courier" (se score > 900)
2. **Reputation History Chart**: Line chart ao longo do tempo

**Prioridade**: 🟡 **Média** (transparency)

**Esforço**: 2 dias

---

#### Gap 5.3: Courier Slashing UI (Admin)
**Descrição**: DAO pode slash couriers mas não há interface.

**O que falta**:
1. **Admin Couriers Page**: `/app/admin/couriers`
   - Lista de couriers (filtros: Active, Slashed)
   - Courier details: Stake, Reputation, Total deliveries, Disputes
   - Botão "Slash Courier" (DAO only):
     - Modal: Reason, Amount to slash (até stake total)
     - Confirmation: "This will deduct X BZR from courier's stake"
2. **Slashing History**: Lista de CourierSlashed events

**Prioridade**: 🟡 **Média** (admin feature)

**Esforço**: 3 dias

---

#### Gap 5.4: Merkle Root Verification UI
**Descrição**: Reviews usam Merkle root mas não há UI de verificação.

**O que falta**:
1. **MerkleProofVerifier Component**:
   - Input: Review ID
   - Botão "Verify Review"
   - Blockchain query: Get Merkle root from Courier struct
   - Local computation: Generate Merkle proof
   - Visual: "✅ Review Verified On-Chain" ou "❌ Invalid Review"
2. **"Verified" Badge** em reviews que têm Merkle proof

**Prioridade**: 🟢 **Baixa** (advanced feature)

**Esforço**: 3 dias

---

### 5.4 Ajustes Necessários 🔧

#### Ajuste 5.1: Courier Matching Algorithm
**Status**: ❌ Não implementado no frontend

**O que ajustar**:
1. **DeliveryRequestsListPage** precisa ordenar por:
   - Reputation DESC (mostrar high-rep couriers primeiro)
   - Distance ASC (mais próximos primeiro)
2. **FilterPanel**: Filtros de reputation (>500, >700, >900)

**Esforço**: 1 dia

---

### 5.5 Telas Novas a Construir 🏗️

#### Nova Tela 5.1: Courier Public Profile
**Rota**: `/couriers/:address`

**Propósito**: Perfil público do courier para buyers/sellers

**Componentes**:
- **CourierHeader**: Name, Photo, Reputation badge
- **ReputationScore**: Score + breakdown
- **StakeInfo**: "Staked: 1000 BZR"
- **DeliveryStats**: Total deliveries, Success rate, Avg time
- **ReviewsList**: Reviews com Merkle verification
- **BadgesList**: Achievements (100 deliveries, 5★ rating, etc.)

**Dados necessários**:
- Blockchain query: `bazariFulfillment.couriers(address)`
- Backend: `GET /api/couriers/:address/stats`

**Esforço**: 3 dias

---

## 6. bazari-affiliate (P2 - Proof of Commerce)

### 6.1 Funcionalidades Documentadas

**Extrinsics**:
- `create_campaign` - Criar campanha affiliate (DAO/Store)
- `register_referral` - Registrar referral (afiliado → referee)
- `execute_split` - Executar split de comissão (multi-level)

**Commission Structure**:
- Level 0 (Direct): 5%
- Level 1: 2.5%
- Level 2: 1.25%
- Level 3: 0.625%
- Level 4: 0.3125%
- Max depth: 5 levels

**Merkle DAG**:
- ReferralTree storage (Node structure)
- Merkle root para privacy-preserving verification
- Merkle proof para validar splits sem expor tree

**Events**:
- `CampaignCreated`, `ReferralRegistered`, `CommissionSplitExecuted`

**Storage**:
- `AffiliateCampaigns<CampaignId, Campaign>` - Campanhas
- `ReferralTree<AccountId, Node>` - DAG de referrals

---

### 6.2 UI/UX Existente ⚠️

#### Páginas Implementadas:
- ⚠️ **AffiliateDashboardPage** - Dashboard básico:
  - Marketplace creation
  - Product management
  - Sales stats
  - Revenue tracking
  - **NÃO mostra**: Referral tree, Multi-level commissions
- ⚠️ **AffiliateMarketplacePage** - Marketplace público
- ⚠️ **MyAffiliationsPage** - Affiliations ativas

#### Componentes:
- ⚠️ **CreateMarketplaceDialog** - Criar marketplace
- ⚠️ **AddProductDialog** - Adicionar produtos
- ❌ **Nenhum componente de referral tree**
- ❌ **Nenhum componente de commission breakdown**

---

### 6.3 Gaps Identificados ⚠️ (50%)

#### Gap 6.1: Referral System UI (CRÍTICO)
**Descrição**: Sistema de referrals multi-level não tem UI.

**O que falta**:
1. **ReferralLinkGenerator**:
   - "Your Referral Link: https://bazari.xyz/r/0xAlice"
   - Botão "Copy Link"
   - QR Code
2. **ReferralTreeVisualization**:
   - Tree diagram mostrando:
     - Level 0: User (you)
     - Level 1: Direct referrals (3 users)
     - Level 2: 2nd-level referrals (5 users)
     - Level 3-4: (collapsed by default)
   - Visual: Nodes com avatars, lines conectando
3. **ReferralStats**:
   - Total referrals: 8
   - Active referrals: 5
   - Total earned from referrals: 123 BZR

**Prioridade**: 🔴 **CRÍTICA** (core affiliate feature)

**Esforço**: 5 dias

---

#### Gap 6.2: Multi-Level Commission Breakdown
**Descrição**: Comissões multi-level não têm visualização.

**O que falta**:
1. **CommissionBreakdownCard**:
   ```
   Sale #123: 100 BZR order
   ├─ Level 0 (Direct): You → 5 BZR (5%)
   ├─ Level 1: 0xBob → 2.5 BZR (2.5%)
   ├─ Level 2: 0xCarol → 1.25 BZR (1.25%)
   └─ Total: 8.75 BZR
   ```
   - Visual: Indented list com arrows
   - Tooltip: "Level 0 = Direct referral (5%)"
2. **Commission Split Animation**: Quando sale acontece, mostrar split em tempo real

**Prioridade**: 🔴 **Alta** (transparency)

**Esforço**: 3 dias

---

#### Gap 6.3: Campaign Management UI
**Descrição**: Criar campanhas não tem UI.

**O que falta**:
1. **CreateCampaignForm** (Store/DAO):
   - Campaign name
   - Commission rate (default 5%)
   - Max depth (default 5)
   - Decay rate (default 50%)
   - Start/End dates
   - Target products (optional)
2. **CampaignsList**: Lista de campanhas ativas
3. **CampaignStats**: Total referrals, Total sales, Total commissions paid

**Prioridade**: 🟡 **Média** (advanced feature)

**Esforço**: 4 dias

---

#### Gap 6.4: Merkle Proof Verification UI
**Descrição**: Merkle proofs não têm visualização.

**O que falta**:
1. **MerkleProofViewer**:
   - Botão "Verify Commission Split"
   - Modal: Mostra Merkle proof (hash path)
   - Visual: Tree diagram com highlighted path
   - Status: "✅ Verified On-Chain" ou "❌ Invalid"
2. **Privacy Note**: "Your referral tree is private, only Merkle root is on-chain"

**Prioridade**: 🟢 **Baixa** (advanced/optional)

**Esforço**: 3 dias

---

### 6.4 Ajustes Necessários 🔧

#### Ajuste 6.1: AffiliateDashboardPage Enhancement
**Status**: ⚠️ Implementado mas básico

**O que ajustar**:
1. **Adicionar Referral Section**:
   - ReferralLinkGenerator
   - ReferralTreeVisualization (preview, top 3 levels)
   - Botão "View Full Tree" → nova página
2. **Adicionar Commission Breakdown**:
   - Multi-level commission display
   - Por sale, com levels expandidos
3. **Adicionar Campaign Section**:
   - Active campaigns
   - Campaign stats

**Esforço**: 3 dias

---

### 6.5 Telas Novas a Construir 🏗️

#### Nova Tela 6.1: Referral Tree Page
**Rota**: `/app/affiliate/referrals`

**Propósito**: Visualização completa da referral tree

**Componentes**:
- **ReferralTreeVisualization**: Full tree (até 5 levels)
- **ReferralLinkGenerator**: Link + QR
- **ReferralStats**: Total, Active, Earnings
- **LevelFilterTabs**: All, Level 1, Level 2, Level 3, Level 4
- **SearchBar**: Buscar por address/name

**Dados necessários**:
- Blockchain query: `bazariAffiliate.referralTree(accountId)` (recursive)
- Backend: `GET /api/users/:id/referrals` (cache)

**Esforço**: 5 dias

---

#### Nova Tela 6.2: Campaign Management Page
**Rota**: `/app/affiliate/campaigns` (Store) ou `/app/admin/campaigns` (DAO)

**Propósito**: Criar e gerenciar campanhas affiliate

**Componentes**:
- **CreateCampaignForm**: Form completo
- **CampaignsList**: Lista de campanhas (Active, Expired)
- **CampaignDetailCard**: Stats, Settings, Edit button
- **CampaignStats**: Dashboard de performance

**Restrição**: Store owners ou DAO

**Esforço**: 4 dias

---

## 7. bazari-fee (P2 - Proof of Commerce)

### 7.1 Funcionalidades Documentadas

**Extrinsics**:
- `set_platform_fee` - Configurar platform fee % (DAO only)
- `calculate_split` - Calcular split (off-chain utility, não extrinsic)

**Fee Distribution**:
```
100 BZR order:
├─ Platform: 5 BZR (5%)
├─ Affiliate: 3 BZR (3%)
└─ Seller: 92 BZR (92%)
```

**Atomic Split**:
- All or nothing (no partial splits)
- Executado via `bazari-escrow.split_release()`

**Events**:
- `FeeUpdated`, `FeeSplitExecuted`

**Storage**:
- `FeeConfiguration` - Platform fee %, Treasury account

---

### 7.2 UI/UX Existente ❌

#### Páginas Implementadas:
- ❌ **Nenhuma página de fee management**

#### Componentes:
- ⚠️ **FeeBreakdownCard** (delivery) - Mostra breakdown mas não conectado ao blockchain
  - Hardcoded values, não lê `FeeConfiguration` on-chain

---

### 7.3 Gaps Identificados ❌ (90%)

#### Gap 7.1: Fee Configuration UI (Admin/DAO)
**Descrição**: Platform fee não tem interface de configuração.

**O que falta**:
1. **FeeConfigurationPage** (DAO only): `/app/admin/fees`
   - Current platform fee: "5%"
   - Input: New fee % (slider 0-20%)
   - Treasury account display: "0xTreasury..."
   - Botão "Update Fee" (requires DAO approval)
   - History: FeeUpdated events timeline
2. **DAO Voting**: Se fee change > 1%, requires referendum

**Prioridade**: 🟡 **Média** (admin feature)

**Esforço**: 3 dias

---

#### Gap 7.2: Fee Split Visualization
**Descrição**: Payment breakdown não mostra fee split.

**O que falta**:
1. **FeeSplitCard** (substituir FeeBreakdownCard):
   - **Lê `FeeConfiguration` on-chain** ✅
   - Visual: Pie chart ou stacked bar
   - Breakdown:
     - "Platform: 5 BZR (5%)"
     - "Affiliate: 3 BZR (3%)"
     - "Seller: 92 BZR (92%)"
   - Tooltip: "Platform fee goes to Treasury for development"
2. **Usar em**:
   - OrderPage (payment breakdown)
   - CheckoutPage (antes de pagar)
   - SellerOrdersPage (seller view)

**Prioridade**: 🔴 **Alta** (transparency)

**Esforço**: 2 dias

---

#### Gap 7.3: Fee History & Analytics
**Descrição**: Não há visualização de fees coletados.

**O que falta**:
1. **FeeAnalyticsPage** (Treasury/DAO): `/app/admin/fees/analytics`
   - Total fees collected (lifetime)
   - Fees per month (chart)
   - Average fee per order
   - Top stores by fees generated
2. **TreasuryBalanceCard**: "Treasury Balance: X BZR (from fees)"

**Prioridade**: 🟢 **Baixa** (analytics)

**Esforço**: 3 dias

---

### 7.4 Telas Novas a Construir 🏗️

#### Nova Tela 7.1: Fee Configuration Page
**Rota**: `/app/admin/fees`

**Propósito**: Configurar platform fee (DAO)

**Componentes**:
- **CurrentFeeCard**: Current fee % + Treasury account
- **UpdateFeeForm**: Input slider + Update button
- **FeeHistory**: Timeline de FeeUpdated events
- **ImpactCalculator**: "If fee = 6%, monthly revenue = +10%"

**Restrição**: DAO only

**Esforço**: 3 dias

---

## 8. bazari-dispute (P2 - Proof of Commerce)

### 8.1 Funcionalidades Documentadas

**Extrinsics**:
- `open_dispute` - Abrir dispute (requires 50 BZR fee, refunded se win)
- `select_jurors` - VRF seleciona 5 jurors (auto-triggered)
- `commit_vote` - Commit hidden vote (hash)
- `reveal_vote` - Reveal plaintext vote + salt
- `execute_ruling` - Executar ruling (auto após tally)

**Dispute Flow**:
1. **Day 0**: Open dispute, VRF selects 5 jurors
2. **Day 0-1**: Commit phase (24h hidden votes)
3. **Day 1-2**: Reveal phase (24h vote disclosure)
4. **Day 2**: Tally & execute (3-of-5 majority)

**Juror Requirements**:
- Reputation > 500
- Stake required (100 BZR)

**Rulings**:
- `RefundBuyer` - 100% para buyer
- `ReleaseSeller` - 100% para seller
- `PartialRefund` - Split (e.g., 60/40)

**Events**:
- `DisputeOpened`, `JurorsSelected`, `VoteCommitted`, `VoteRevealed`, `VotingEnded`, `RulingExecuted`

**Storage**:
- `Disputes<DisputeId, Dispute>` - Dispute details
- `DisputeVotes<DisputeId, AccountId, Vote>` - Votes (commit-reveal)

---

### 8.2 UI/UX Existente ⚠️

#### Páginas Implementadas:
- ❌ **Nenhuma página dedicada a disputes** (além de DisputePanel)

#### Componentes:
- ⚠️ **DisputePanel** - Abrir dispute:
  - Evidence IPFS upload
  - Plaintiff/Defendant display
  - Status: OPENED, VOTING, RESOLVED
  - **NÃO mostra**: Juror voting, Commit-reveal phases

---

### 8.3 Gaps Identificados ⚠️ (60%)

#### Gap 8.1: Dispute Detail Page (CRÍTICO)
**Descrição**: Dispute aberto mas não há página de detalhes.

**O que falta**:
1. **DisputeDetailPage**: `/app/disputes/:disputeId`
   - **Header**: Dispute ID, Status badge, Timeline
   - **Parties**: Plaintiff vs Defendant (avatars, addresses)
   - **Evidence Section**:
     - IPFS CID link
     - Preview (image/document)
   - **Jurors Section**:
     - "5 jurors selected via VRF" (expandir para ver addresses)
     - Juror requirements: "Reputation > 500, Staked 100 BZR"
   - **Voting Section**:
     - If COMMIT phase: "Voting in progress... (12h remaining)"
     - If REVEAL phase: "Revealing votes... (8h remaining)"
     - If RESOLVED: Ruling display + vote breakdown
   - **Ruling Section**:
     - "Ruling: RefundBuyer"
     - "3 of 5 jurors voted for RefundBuyer"
     - Execution status: "✅ Executed" ou "⏳ Pending"

**Prioridade**: 🔴 **CRÍTICA** (core dispute feature)

**Esforço**: 5 dias

---

#### Gap 8.2: Jury Voting UI (CRÍTICO)
**Descrição**: Jurors não têm interface para votar.

**O que falta**:
1. **JuryVotingPanel** (apenas jurors):
   - **Commit Phase UI**:
     - Radio buttons: RefundBuyer, ReleaseSeller, PartialRefund
     - If PartialRefund: Inputs (buyer_amount, seller_amount)
     - "Commit Vote" button
     - Explanation: "Your vote is hidden (commit-reveal)"
     - Timer: "Commit phase ends in: 12h 34m"
   - **Reveal Phase UI**:
     - "Reveal your vote to make it count"
     - Display: "You voted: RefundBuyer"
     - "Reveal Vote" button
     - Timer: "Reveal phase ends in: 8h 12m"
   - **Post-Voting**:
     - "✅ Vote counted"
     - "Waiting for other jurors... (3/5 revealed)"
2. **Juror Notification**:
   - Email/push: "You've been selected as juror for Dispute #123"
   - Link direto para DisputeDetailPage

**Prioridade**: 🔴 **CRÍTICA** (core dispute feature)

**Esforço**: 4 dias

---

#### Gap 8.3: Dispute History & My Disputes
**Descrição**: Não há lista de disputes.

**O que falta**:
1. **MyDisputesPage**: `/app/disputes`
   - Tabs: "As Plaintiff", "As Defendant", "As Juror"
   - Lista de disputes com:
     - Dispute ID, Status, Created date
     - Parties (avatars)
     - "View Details" button
   - FilterPanel: Status (OPENED, VOTING, RESOLVED)
2. **DisputeHistoryPage** (Admin/DAO): `/app/admin/disputes`
   - Todas disputes (global view)
   - Stats: Total disputes, Resolution rate, Avg time

**Prioridade**: 🟡 **Média** (usability)

**Esforço**: 3 dias

---

#### Gap 8.4: Dispute Fee UI
**Descrição**: 50 BZR fee não tem feedback.

**O que falta**:
1. **DisputeFeeWarning** no DisputePanel:
   - "⚠️ Opening a dispute costs 50 BZR"
   - "Fee is refunded if you win"
   - Balance check: "Your balance: 123 BZR" (suficiente/insuficiente)
2. **Fee Refund Notification**:
   - Após ruling: "✅ Dispute won! 50 BZR refunded"

**Prioridade**: 🟡 **Média** (transparency)

**Esforço**: 1 dia

---

#### Gap 8.5: VRF Juror Selection Transparency
**Descrição**: VRF selection não é visível.

**O que falta**:
1. **VRFExplanationCard** no DisputeDetailPage:
   - "5 jurors randomly selected using VRF (Verifiable Random Function)"
   - "VRF ensures unbiased selection"
   - Botão "Verify VRF Proof" (advanced users)
2. **Juror Selection Event**: Mostrar no timeline

**Prioridade**: 🟢 **Baixa** (transparency for advanced users)

**Esforço**: 2 dias

---

### 8.4 Ajustes Necessários 🔧

#### Ajuste 8.1: DisputePanel Enhancement
**Status**: ⚠️ Implementado mas básico

**O que ajustar**:
1. **Adicionar Fee Warning** (50 BZR)
2. **Adicionar Balance Check** antes de abrir dispute
3. **Link para DisputeDetailPage** após criar dispute

**Esforço**: 1 dia

---

### 8.5 Telas Novas a Construir 🏗️

#### Nova Tela 8.1: Dispute Detail Page
**Rota**: `/app/disputes/:disputeId`

**Propósito**: Visualização completa do dispute

**Componentes**:
- **DisputeHeader**: ID, Status, Timeline
- **PartiesCard**: Plaintiff vs Defendant
- **EvidenceViewer**: IPFS preview
- **JurorsCard**: Lista de jurors + requirements
- **VotingStatus**: Commit/Reveal phases + timer
- **RulingCard**: Ruling + vote breakdown + execution status
- **JuryVotingPanel**: Se user é juror (conditional)

**Dados necessários**:
- Blockchain query: `bazariDispute.disputes(disputeId)`
- Hook: `useDisputeDetails(disputeId)`, `useCommitVote()`, `useRevealVote()`

**Esforço**: 5 dias

---

#### Nova Tela 8.2: My Disputes Page
**Rota**: `/app/disputes`

**Propósito**: Lista de disputes do user

**Componentes**:
- **TabsNavigation**: As Plaintiff, As Defendant, As Juror
- **DisputesList**: Cards com summary
- **FilterPanel**: Status, Date range
- **SearchBar**: Buscar por ID ou party

**Dados necessários**:
- Backend: `GET /api/users/:id/disputes`
- Blockchain: Filter events by accountId

**Esforço**: 3 dias

---

#### Nova Tela 8.3: Admin Disputes Dashboard
**Rota**: `/app/admin/disputes`

**Propósito**: Gestão global de disputes (DAO)

**Componentes**:
- **DisputeStats**: Total, Resolved, Pending, Avg time
- **DisputesList**: Global list (all users)
- **RulingBreakdown**: Chart de rulings (RefundBuyer vs ReleaseSeller vs PartialRefund)
- **JurorLeaderboard**: Top jurors por participation

**Restrição**: DAO only

**Esforço**: 4 dias

---

## 🎨 RESUMO DE GAPS POR PRIORIDADE

### 🔴 Prioridade CRÍTICA (P0) - 21 dias

| Gap | Pallet | Descrição | Esforço |
|-----|--------|-----------|---------|
| 1.1 | commerce | Commission Tracking UI (Sale Detail Page) | 3 dias |
| 2.1 | escrow | Escrow Visualization Component | 2 dias |
| 2.2 | escrow | Auto-Release Countdown Timer | 1 dia |
| 3.1 | rewards | Missions Dashboard (FULL) | 5 dias |
| 3.2 | rewards | Streak Tracking UI | 3 dias |
| 3.3 | rewards | Cashback Balance Display | 2 dias |
| 5.1 | fulfillment | Stake Requirement UI | 2 dias |
| 6.1 | affiliate | Referral System UI (Tree + Link) | 5 dias |
| 6.2 | affiliate | Multi-Level Commission Breakdown | 3 dias |
| 8.1 | dispute | Dispute Detail Page | 5 dias |
| 8.2 | dispute | Jury Voting UI (Commit-Reveal) | 4 dias |

**Total P0**: 35 dias (7 semanas com 1 dev, 3.5 semanas com 2 devs)

---

### 🟡 Prioridade ALTA (P1) - 25 dias

| Gap | Pallet | Descrição | Esforço |
|-----|--------|-----------|---------|
| 1.2 | commerce | Receipt NFT Minting UI | 2 dias |
| 1.3 | commerce | Order State Machine Enforcement | 1 dia |
| 2.3 | escrow | Refund & Partial Refund UI (Admin) | 3 dias |
| 2.4 | escrow | Escrow History & Logs | 2 dias |
| 4.1 | attestation | Co-Signature UI | 2 dias |
| 7.2 | fee | Fee Split Visualization | 2 dias |
| 8.3 | dispute | My Disputes Page | 3 dias |
| 8.4 | dispute | Dispute Fee UI | 1 dia |

**Ajustes**:
| 1.1 | commerce | Unificação Order/ChatProposal UI | 1 dia |
| 1.2 | commerce | Multi-Store Order Breakdown | 2 dias |
| 4.1 | attestation | ProofCard Enhancement | 1 dia |
| 6.1 | affiliate | AffiliateDashboardPage Enhancement | 3 dias |
| 8.1 | dispute | DisputePanel Enhancement | 1 dia |

**Total P1**: 24 dias (4.8 semanas)

---

### 🟢 Prioridade MÉDIA (P2) - 30 dias

| Gap | Pallet | Descrição | Esforço |
|-----|--------|-----------|---------|
| 3.4 | rewards | Mission Completion Triggers | 2 dias |
| 4.2 | attestation | Proof Type Visualization | 1 dia |
| 4.3 | attestation | IPFS Proof Viewer | 2 dias |
| 5.2 | fulfillment | Courier Reputation Display | 2 dias |
| 5.3 | fulfillment | Courier Slashing UI (Admin) | 3 dias |
| 6.3 | affiliate | Campaign Management UI | 4 dias |
| 7.1 | fee | Fee Configuration UI (Admin) | 3 dias |
| 8.4 | dispute | Admin Disputes Dashboard | 4 dias |

**Ajustes**:
| 5.1 | fulfillment | Courier Matching Algorithm | 1 dia |

**Total P2**: 22 dias (4.4 semanas)

---

### 🔵 Prioridade BAIXA (P3) - 11 dias

| Gap | Pallet | Descrição | Esforço |
|-----|--------|-----------|---------|
| 5.4 | fulfillment | Merkle Root Verification UI | 3 dias |
| 6.4 | affiliate | Merkle Proof Verification UI | 3 dias |
| 7.3 | fee | Fee History & Analytics | 3 dias |
| 8.5 | dispute | VRF Juror Selection Transparency | 2 dias |

**Total P3**: 11 dias (2.2 semanas)

---

## 📊 TOTAL DE ESFORÇO

| Prioridade | Dias | Semanas (1 dev) | Semanas (2 devs) |
|-----------|------|----------------|------------------|
| P0 (CRÍTICO) | 35 | 7.0 | 3.5 |
| P1 (ALTA) | 24 | 4.8 | 2.4 |
| P2 (MÉDIA) | 22 | 4.4 | 2.2 |
| P3 (BAIXA) | 11 | 2.2 | 1.1 |
| **TOTAL** | **92 dias** | **18.4 semanas** | **9.2 semanas** |

**Considerando**:
- 1 dev full-time: ~18-20 semanas (4.5-5 meses)
- 2 devs full-time: ~9-10 semanas (2-2.5 meses)

---

## 🏗️ ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: Foundation Core (P0) - 7 semanas
**Foco**: Implementar features críticas para blockchain parity

**Semana 1-2**: Rewards & Missions
- Missions Dashboard (5 dias)
- Streak Tracking (3 dias)
- Cashback Display (2 dias)

**Semana 3-4**: Escrow & Payments
- Escrow Visualization (2 dias)
- Auto-Release Countdown (1 dia)
- Commission Tracking UI (3 dias)
- Stake Requirement UI (2 dias)

**Semana 5-6**: Affiliate & Referrals
- Referral System UI (5 dias)
- Multi-Level Commission Breakdown (3 dias)

**Semana 7**: Disputes
- Dispute Detail Page (5 dias)
- Jury Voting UI (4 dias) - continua em semana 8

---

### Fase 2: Enhancement & UX (P1) - 5 semanas
**Foco**: Melhorias de UX e features secundárias

**Semana 8-9**: UI Refinements
- Order State Machine (1 dia)
- Multi-Store Breakdown (2 dias)
- Co-Signature UI (2 dias)
- ProofCard Enhancement (1 dia)
- DisputePanel Enhancement (1 dia)
- Fee Split Visualization (2 dias)

**Semana 10-11**: Admin Features
- Refund UI (3 dias)
- Escrow Logs (2 dias)
- My Disputes Page (3 dias)
- Receipt NFT UI (2 dias)

**Semana 12**: Polishing
- Dispute Fee UI (1 dia)
- AffiliateDashboardPage Enhancement (3 dias)

---

### Fase 3: Advanced Features (P2) - 4 semanas
**Foco**: Features avançadas e admin tools

**Semana 13-14**: Admin Dashboards
- Fee Configuration (3 dias)
- Courier Slashing (3 dias)
- Campaign Management (4 dias)

**Semana 15-16**: Advanced UX
- Mission Triggers (2 dias)
- Proof Type Visualization (1 dia)
- IPFS Proof Viewer (2 dias)
- Courier Reputation (2 dias)
- Admin Disputes Dashboard (4 dias)

---

### Fase 4: Polish & Advanced (P3) - 2 semanas (opcional)
**Foco**: Features nice-to-have

**Semana 17-18**:
- Merkle Verification UIs (6 dias)
- Fee Analytics (3 dias)
- VRF Transparency (2 dias)

---

## 🎯 DECISÕES ARQUITETURAIS

### 1. Component Reusability
**Decisão**: Criar componentes genéricos reutilizáveis

**Exemplos**:
- `<BlockchainStatusBadge />` - Status badges genéricos (Locked, Released, Verified, etc.)
- `<CountdownTimer />` - Reusável em Escrow, Disputes, Missions
- `<MerkleProofViewer />` - Reusável em Fulfillment, Affiliate
- `<CommissionBreakdown />` - Reusável em Commerce, Affiliate

**Benefício**: Reduz esforço em ~15-20%

---

### 2. Blockchain Hooks Strategy
**Decisão**: Criar hooks específicos por pallet

**Estrutura**:
```typescript
// hooks/blockchain/useEscrow.ts
export const useEscrowDetails = (orderId: number) => {
  return useBlockchainQuery(['escrow', orderId], async () => {
    return await api.query.bazariEscrow.escrows(orderId);
  });
};

export const useReleaseFunds = () => {
  return useBlockchainTx('release_funds', async (orderId: number) => {
    return await api.tx.bazariEscrow.releaseFunds(orderId);
  });
};
```

**Benefício**: Type-safety, cache management, error handling consistente

---

### 3. Admin/DAO Authorization
**Decisão**: Criar `<RequireDAO>` wrapper component

```tsx
<RequireDAO fallback={<AccessDenied />}>
  <AdminEscrowDashboard />
</RequireDAO>
```

**Implementação**:
- Check se user wallet é member do Council
- Blockchain query: `pallet_collective.members()`

---

### 4. Real-Time Updates
**Decisão**: WebSocket subscriptions para eventos críticos

**Eventos para subscribe**:
- `CommissionRecorded` → Update CommissionDashboard
- `EscrowLocked/Released` → Update OrderPage
- `DisputeOpened/RulingExecuted` → Update DisputeDetailPage
- `MissionCompleted` → Toast notification
- `JurorsSelected` → Email/Push para jurors

**Implementação**: Extend `blockchain-events.service.ts`

---

### 5. IPFS Preview Strategy
**Decisão**: Fetch e cache IPFS content no backend

**Flow**:
1. Frontend recebe IPFS CID do blockchain
2. Request: `GET /api/ipfs/:cid/preview`
3. Backend fetches de IPFS, gera thumbnail (se image), cache em Redis
4. Frontend mostra preview + "View Full" button (abre gateway)

**Benefício**: UX rápida, evita IPFS timeouts no frontend

---

## 🔧 FERRAMENTAS E LIBS NECESSÁRIAS

### Novas Dependências

```json
{
  "dependencies": {
    "d3": "^7.8.5",              // Para tree visualizations (Referral Tree, Merkle Tree)
    "react-countdown": "^2.3.5",  // Countdown timers (Escrow, Disputes)
    "qrcode.react": "^3.1.0",     // QR codes (Referral links)
    "react-calendar-heatmap": "^1.8.1", // Streak calendar
    "recharts": "^2.9.0",         // Charts (Commission, Reputation, Fee analytics)
    "crypto-js": "^4.2.0"         // Commit-reveal hashing (Dispute voting)
  }
}
```

---

## 📝 CONSIDERAÇÕES FINAIS

### Pontos Fortes da Implementação Atual ✅
1. **Delivery System**: 85% completo, apenas falta stake UI
2. **Commerce & Orders**: 95% completo, apenas falta commission UI
3. **Governance**: 70% completo, base sólida
4. **Blockchain Integration**: Hooks e infra prontos

### Gaps Mais Críticos 🔴
1. **Rewards/Missions**: 80% ausente (gamification core)
2. **Dispute Voting**: 60% ausente (jury UX crítica)
3. **Escrow Management**: 30% ausente (payment transparency)
4. **Affiliate Referrals**: 50% ausente (multi-level tree)

### Recomendações 🎯
1. **Priorizar P0** (7 semanas): Crítico para feature parity
2. **Rewards primeiro**: Gamification impacta engagement
3. **Disputes segundo**: Confiança do usuário depende disso
4. **Paralelizar**: 2 devs podem trabalhar em paralelo (Rewards + Escrow/Disputes)

### Riscos ⚠️
1. **Complexity**: Tree visualizations (Referral, Merkle) são complexas
2. **Real-time**: WebSocket subscriptions precisam backend ready
3. **IPFS**: Preview generation pode ter performance issues
4. **VRF**: Explicar VRF para users não-técnicos é desafiador

---

## 📚 APÊNDICE: CHECKLIST COMPLETO

### Commerce (95% → 100%)
- [ ] Commission Analytics Page
- [ ] Sale Detail Page
- [ ] Receipt NFT Minting UI
- [ ] Order State Machine Validation
- [ ] Unified Order/ChatProposal Badge
- [ ] Multi-Store Breakdown

### Escrow (70% → 100%)
- [ ] EscrowCard Component
- [ ] Auto-Release Countdown
- [ ] Escrow Management Page (Buyer)
- [ ] Admin Escrow Dashboard
- [ ] Refund/Partial Refund UI
- [ ] Escrow Events Log

### Rewards (20% → 100%)
- [ ] Missions Hub Page
- [ ] MissionCard Component (blockchain-connected)
- [ ] Streak Widget
- [ ] Streak History Page
- [ ] Cashback Dashboard
- [ ] Mission Completion Notifications
- [ ] Admin Missions Management

### Attestation (60% → 100%)
- [ ] Co-Signature UI
- [ ] Proof Verification Page
- [ ] Proof Type Icons/Labels
- [ ] IPFS Preview
- [ ] ProofCard Enhancement

### Fulfillment (85% → 100%)
- [ ] Stake Panel (DeliveryProfileSetup)
- [ ] Reputation Score Enhancement
- [ ] Courier Public Profile
- [ ] Admin Courier Slashing
- [ ] Merkle Root Verification
- [ ] Courier Matching Algorithm UI

### Affiliate (50% → 100%)
- [ ] Referral Link Generator
- [ ] Referral Tree Visualization
- [ ] Referral Tree Page
- [ ] Multi-Level Commission Breakdown
- [ ] Campaign Management Page
- [ ] Merkle Proof Viewer
- [ ] AffiliateDashboardPage Enhancement

### Fee (10% → 100%)
- [ ] Fee Configuration Page (Admin)
- [ ] FeeSplitCard Component
- [ ] Fee Analytics Page
- [ ] Fee History

### Dispute (40% → 100%)
- [ ] Dispute Detail Page
- [ ] Jury Voting Panel (Commit/Reveal)
- [ ] My Disputes Page
- [ ] Admin Disputes Dashboard
- [ ] Dispute Fee Warning
- [ ] VRF Selection Transparency
- [ ] DisputePanel Enhancement

---

**Documento gerado**: 2025-11-14
**Versão**: 1.0
**Próxima revisão**: Após Fase 1 (7 semanas)

**Status**: ✅ **COMPLETO E PRONTO PARA IMPLEMENTAÇÃO**
