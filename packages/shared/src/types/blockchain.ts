/**
 * Blockchain Types - Shared between Backend (TypeScript) and Blockchain (Rust)
 *
 * IMPORTANTE: Estes enums devem ser idênticos aos enums Rust nos pallets.
 * Qualquer mudança aqui deve ser refletida no código Rust e vice-versa.
 */

// ============================================
// ORDER STATUS (bazari-commerce pallet)
// ============================================

/**
 * Status do pedido on-chain
 *
 * Rust equivalent:
 * ```rust
 * #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
 * pub enum OrderStatus {
 *     Pending,
 *     Confirmed,
 *     InTransit,
 *     Delivered,
 *     Disputed,
 *     Cancelled,
 * }
 * ```
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Map Prisma OrderStatus → Blockchain OrderStatus
 */
export function mapPrismaOrderStatus(prismaStatus: string): OrderStatus {
  const mapping: Record<string, OrderStatus> = {
    CREATED: OrderStatus.PENDING,
    PENDING: OrderStatus.PENDING,
    ESCROWED: OrderStatus.CONFIRMED,
    SHIPPED: OrderStatus.IN_TRANSIT,
    RELEASED: OrderStatus.DELIVERED,
    REFUNDED: OrderStatus.CANCELLED,
    CANCELLED: OrderStatus.CANCELLED,
    TIMEOUT: OrderStatus.CANCELLED,
  };
  return mapping[prismaStatus] || OrderStatus.PENDING;
}

// ============================================
// SALE STATUS (bazari-commerce pallet)
// ============================================

/**
 * Status da venda on-chain
 *
 * Rust equivalent:
 * ```rust
 * #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
 * pub enum SaleStatus {
 *     PendingPayment,
 *     Paid,
 *     Processing,
 *     Shipped,
 *     Completed,
 *     Refunded,
 * }
 * ```
 */
export enum SaleStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
}

// ============================================
// ESCROW STATUS (bazari-escrow pallet)
// ============================================

/**
 * Status do escrow on-chain
 *
 * Rust equivalent:
 * ```rust
 * #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
 * pub enum EscrowStatus {
 *     Locked,
 *     Released,
 *     Refunded,
 *     PartialRefund,
 *     Disputed,
 * }
 * ```
 */
export enum EscrowStatus {
  LOCKED = 'LOCKED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  DISPUTED = 'DISPUTED',
}

/**
 * Map Prisma PaymentIntentStatus → Blockchain EscrowStatus
 */
export function mapPrismaPaymentIntentStatus(prismaStatus: string): EscrowStatus {
  const mapping: Record<string, EscrowStatus> = {
    PENDING: EscrowStatus.LOCKED,
    FUNDS_IN: EscrowStatus.LOCKED,
    RELEASED: EscrowStatus.RELEASED,
    REFUNDED: EscrowStatus.REFUNDED,
    TIMEOUT: EscrowStatus.REFUNDED,
    CANCELLED: EscrowStatus.REFUNDED,
  };
  return mapping[prismaStatus] || EscrowStatus.LOCKED;
}

// ============================================
// MISSION TYPE (bazari-rewards pallet)
// ============================================

/**
 * Tipo de missão on-chain
 *
 * Rust equivalent:
 * ```rust
 * #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
 * pub enum MissionType {
 *     FirstPurchase,
 *     ReferFriend,
 *     CompleteNOrders(u32),
 *     SpendAmount(u128),
 *     DailyLogin(u32),
 * }
 * ```
 */
export enum MissionType {
  FIRST_PURCHASE = 'FIRST_PURCHASE',
  REFER_FRIEND = 'REFER_FRIEND',
  COMPLETE_N_ORDERS = 'COMPLETE_N_ORDERS',
  SPEND_AMOUNT = 'SPEND_AMOUNT',
  DAILY_LOGIN = 'DAILY_LOGIN',
}

// ============================================
// PROOF TYPE (bazari-attestation pallet)
// ============================================

/**
 * Tipo de prova on-chain
 *
 * Rust equivalent:
 * ```rust
 * #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
 * pub enum ProofType {
 *     HandoffProof,
 *     DeliveryProof,
 *     CustomProof,
 * }
 * ```
 */
export enum ProofType {
  HANDOFF_PROOF = 'HANDOFF_PROOF',
  DELIVERY_PROOF = 'DELIVERY_PROOF',
  CUSTOM_PROOF = 'CUSTOM_PROOF',
}

// ============================================
// BLOCKCHAIN REFERENCE TYPE
// ============================================

/**
 * Referência genérica para dados blockchain
 */
export type BlockchainReference = {
  blockchainId?: bigint;
  txHash?: string;
  onChainStatus?: string;
  lastSyncedAt?: Date;
};

/**
 * Order com referência blockchain
 */
export type OrderWithBlockchain = {
  id: string;
  blockchainOrderId?: bigint;
  blockchainTxHash?: string;
  onChainStatus?: string;
  lastSyncedAt?: Date;
};

/**
 * Sale com referência blockchain
 */
export type SaleWithBlockchain = {
  id: string;
  blockchainSaleId?: bigint;
  blockchainTxHash?: string;
  onChainStatus?: string;
  lastSyncedAt?: Date;
};

/**
 * PaymentIntent com referência blockchain
 */
export type PaymentIntentWithBlockchain = {
  id: string;
  escrowId?: bigint;
  txHash?: string;
  txHashIn?: string;
  txHashRelease?: string;
  txHashRefund?: string;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if order has blockchain reference
 */
export function hasBlockchainReference(order: OrderWithBlockchain): boolean {
  return !!order.blockchainOrderId && !!order.blockchainTxHash;
}

/**
 * Check if blockchain data is stale (> 1 hour)
 */
export function isBlockchainDataStale(lastSyncedAt?: Date): boolean {
  if (!lastSyncedAt) return true;
  const ONE_HOUR = 60 * 60 * 1000;
  return Date.now() - lastSyncedAt.getTime() > ONE_HOUR;
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(txHash: string, length: number = 10): string {
  if (!txHash || txHash.length < length * 2) return txHash;
  return `${txHash.slice(0, length)}...${txHash.slice(-length)}`;
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(txHash: string): boolean {
  // Substrate tx hash: 0x + 64 hex chars
  return /^0x[0-9a-fA-F]{64}$/.test(txHash);
}
