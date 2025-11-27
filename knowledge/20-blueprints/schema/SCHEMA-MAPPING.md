# Schema Mapping: Prisma ↔ Substrate

**Purpose**: Mapeamento entre modelos Prisma (PostgreSQL off-chain) e pallets Substrate (blockchain on-chain)

**Created**: 2025-11-12
**Status**: ✅ Complete

---

## 🎯 Hybrid Architecture Philosophy

**Regra Geral**:
- ✅ **On-Chain**: Transações financeiras, provas imutáveis, estado crítico
- ✅ **Off-Chain**: Dados grandes, queries rápidas, UX em tempo real
- ✅ **Sync**: Eventos blockchain → Backend atualiza Prisma (cache)

---

## 📊 Commerce & Payments

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **Order** | `bazari-commerce` | `Orders<OrderId, Order>` | Event-driven | `blockchainOrderId` (BigInt) | ✅ CRITICAL: OrderCreated event → insert Prisma |
| **OrderItem** | `bazari-commerce` | Part of Order.items (BoundedVec) | Event-driven | N/A | ❌ Items são parte do Order struct on-chain |
| **Sale** | `bazari-commerce` | `Sales<SaleId, Sale>` | Event-driven | `blockchainSaleId` (BigInt) | ✅ MOCK: AffiliateSale usa txHash fake, deve usar real |
| **PaymentIntent** | `bazari-escrow` | `Escrows<OrderId, Escrow>` | Event-driven | `txHash` (String) | ✅ FIX: txHashIn/txHashRelease devem ser reais |
| **EscrowLog** | N/A (off-chain) | N/A | Off-chain only | N/A | ❌ Logs são apenas PostgreSQL |

---

## 📦 Products & Stores

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **Product** | `pallet-stores` | `Stores<StoreId>.products (IPFS)` | IPFS CID | `onChainStoreId` (BigInt) | ✅ Products armazenados em IPFS, CID on-chain |
| **ServiceOffering** | `pallet-stores` | `Stores<StoreId>.services (IPFS)` | IPFS CID | `onChainStoreId` (BigInt) | ✅ Services armazenados em IPFS |
| **SellerProfile** | `pallet-stores` | `Stores<StoreId, Store>` | Event-driven | `onChainStoreId` (BigInt) | ✅ Já implementado, store_published events |

---

## 🚚 Delivery & Fulfillment

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **DeliveryRequest** | N/A (off-chain) | Proofs via `bazari-attestation` | Hybrid | `paymentTxHash`, `releaseTxHash` | ✅ GPS off-chain, proofs on-chain |
| **DeliveryProfile** | `bazari-fulfillment` | `Couriers<AccountId, Courier>` | Full on-chain | `walletAddress` (String) | ✅ Courier registry on-chain |
| **StoreDeliveryPartner** | N/A (off-chain) | N/A | Off-chain only | N/A | ❌ Partnerships são PostgreSQL |
| **CourierReview** | N/A (off-chain) | Merkle root in Courier struct | Merkle root | `merkleIncluded` (Boolean) | ✅ Reviews off-chain, Merkle root on-chain |
| **DeliveryWaypoint** (não existe) | N/A (off-chain) | Proofs via `bazari-attestation` | Hybrid | `proofSubmitted`, `proofCid` | ✅ GPS tracking off-chain, final proofs on-chain |

**Note**: `DeliveryWaypoint` não existe no schema, precisa ser criado.

---

## 💰 Rewards & Missions

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **Profile.cashbackBalance** | `bazari-rewards` + `pallet-assets` | AssetId 2 (ZARI) balance | Event-driven | N/A | ✅ FIX: Cashback deve ser token ZARI, não string |
| **ChatMission** | `bazari-rewards` | `Missions<MissionId, Mission>` | Event-driven | `blockchainMissionId` (BigInt?) | ⚠️ Missions podem ser on-chain (opcional) |
| **ChatMissionCompletion** | `bazari-rewards` | `UserProgress<AccountId, MissionId>` | Event-driven | N/A | ✅ Progress on-chain, claim via extrinsic |

---

## 🏛️ Governance

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **GovernanceTreasuryRequest** | `pallet-treasury` | `Proposals<ProposalIndex>` | Event-driven | `spendId`, `txHash` | ✅ Já implementado, sync events |
| **GovernanceCouncilVote** | `pallet-collective` | `Votes<Hash, AccountId>` | Event-driven | `motionHash`, `txHash` | ✅ Já implementado |
| **GovernanceReferendum** | `pallet-democracy` | `ReferendumInfoOf<RefIndex>` | Event-driven | `refIndex`, `startTxHash` | ✅ Já implementado |

---

## 👤 Profile & Identity

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **Profile** | `bazari-identity` | `Profiles<AccountId, Profile>` | Event-driven | `onChainProfileId` (BigInt) | ✅ Já implementado, profiles on-chain |
| **User** | N/A (off-chain) | N/A | Off-chain only | `address` (wallet) | ❌ Users são PostgreSQL, `address` é chave FK |
| **ProfileReputationEvent** | `bazari-identity` | `ReputationHistory` (optional) | Event-driven | `blockNumber`, `extrinsicId` | ✅ Events geram histórico |

---

## 💬 Chat & Social

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **ChatThread** | N/A (off-chain) | N/A | Off-chain only | N/A | ❌ E2EE chat é PostgreSQL |
| **ChatMessage** | N/A (off-chain) | N/A | Off-chain only | N/A | ❌ Messages são PostgreSQL (ciphertext) |
| **ChatProposal** | `bazari-commerce` | `Orders<OrderId>` | Event-driven | Ver Sale | ✅ Proposals viram Orders on-chain após payment |
| **AffiliateSale** | `bazari-commerce` | `Sales<SaleId>` + `Commissions` | Event-driven | `txHash` (String) | ✅ FIX: txHash deve ser real, não MOCK |

---

## 🔒 Attestations & Proofs

| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field | Notes |
|--------------|------------------|------------------|---------------|-----------------|-------|
| **DeliveryWaypoint** (criar) | N/A (off-chain) | Proofs via `bazari-attestation` | Hybrid | `proofSubmitted`, `proofCid` | ✅ GPS off-chain, final proofs on-chain |
| **CourierReview** | N/A (off-chain) | Merkle root in `bazari-fulfillment` | Merkle root | `merkleIncluded`, `merkleRootHash` | ✅ Reviews off-chain, root on-chain |

---

## 📝 Summary

### ✅ Full On-Chain (Source of Truth = Blockchain)
- Orders (`bazari-commerce`)
- Sales & Commissions (`bazari-commerce`)
- Escrows (`bazari-escrow`)
- Couriers (`bazari-fulfillment`)
- Attestations (`bazari-attestation`)
- Missions & Rewards (`bazari-rewards`)
- Governance (Treasury, Council, Democracy)
- Profiles & Reputation (`bazari-identity`)
- Stores (`pallet-stores`)

### ⚠️ Hybrid (Critical Data On-Chain, Rest Off-Chain)
- **DeliveryRequest**: GPS waypoints off-chain, HandoffProof + DeliveryProof on-chain
- **CourierReview**: Reviews off-chain (PostgreSQL), Merkle root on-chain
- **ChatProposal**: Draft off-chain, Order on-chain após payment

### ❌ Full Off-Chain (No Blockchain)
- Chat Messages (E2EE)
- User accounts (auth)
- Logs e auditoria
- Interactions (feed algorithm)
- Media assets (IPFS CID)
- Store partnerships

---

## 🔄 Sync Strategy Details

### Event-Driven Sync (Blockchain → PostgreSQL)
```typescript
// Backend escuta eventos blockchain
blockchain.on('OrderCreated', async (event) => {
  const { orderId, buyer, seller, totalAmount } = event.data;

  await prisma.order.update({
    where: { id: postgresOrderId },
    data: {
      blockchainOrderId: orderId,
      blockchainTxHash: event.txHash,
      onChainStatus: 'PENDING',
      lastSyncedAt: new Date(),
    },
  });
});
```

### Merkle Root Sync (Off-Chain → Blockchain)
```typescript
// Backend calcula Merkle root periodicamente
const reviews = await prisma.courierReview.findMany({ where: { courierId } });
const merkleRoot = calculateMerkleRoot(reviews);

// Update on-chain
await blockchain.updateReviewsMerkleRoot(courierAddress, merkleRoot);

// Update Prisma cache
await prisma.courier.update({
  where: { id: courierId },
  data: {
    reviewsMerkleRoot: merkleRoot,
    lastMerkleUpdate: new Date(),
  },
});
```

---

## 🚀 Implementation Order

1. **Week 1**: Schema Unification (add blockchain fields to Prisma)
2. **Week 2-3**: bazari-commerce (Orders, Sales, Commissions)
3. **Week 4-5**: bazari-escrow (Lock, Release, Refund)
4. **Week 6-7**: bazari-rewards (Cashback ZARI, Missions)
5. **Week 9-11**: bazari-attestation (HandoffProof, DeliveryProof)
6. **Week 12-13**: bazari-fulfillment (Couriers, Merkle root)
7. **Week 17-24**: Backend integration (event listeners, workers)

---

**Version**: 1.0.0
**Last Updated**: 2025-11-12
**Author**: Claude (Senior Software Architect)
