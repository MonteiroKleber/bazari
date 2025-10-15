// BazChat - Tipos Compartilhados
// Este arquivo define os tipos compartilhados entre API e Web para o sistema de chat

// Tipos de mensagem
export type MessageType =
  | "text" | "audio" | "image" | "file" | "video"
  | "proposal" | "checkout" | "payment" | "system";

export type ThreadKind = "dm" | "store" | "order" | "group";

// Participante da conversa com dados do perfil
export interface ChatThreadParticipant {
  profileId: string;
  handle: string;
  name?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

// Thread de conversa
export interface ChatThread {
  id: string;
  kind: ThreadKind;
  participants: string[];           // profileIds
  orderId?: string;
  groupId?: string;
  lastMessageAt: number;
  unreadCount: number;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

// Thread com dados completos dos participantes
export interface ChatThreadWithParticipants extends ChatThread {
  participantsData: ChatThreadParticipant[];
}

// Mensagem
export interface ChatMessage {
  id: string;
  threadId: string;
  from: string;                     // profileId
  type: MessageType;
  ciphertext: string;               // E2EE payload
  mediaCid?: string;                // IPFS CID
  meta?: Record<string, any>;       // itens/total/split/txHash
  createdAt: number;
  deliveredAt?: number;
  readAt?: number;
  replyTo?: string;                 // messageId
  editedAt?: number;
}

// WebSocket envelopes
export interface WsClientMsg {
  op: "send" | "ack" | "presence" | "typing" | "read";
  data: any;
}

export interface WsServerMsg {
  op: "message" | "receipt" | "presence" | "typing" | "system";
  data: any;
}

// Proposta de venda (Fase 3)
export interface Proposal {
  id: string;
  threadId: string;
  sellerId: string;                 // profileId do vendedor/promotor
  buyerId?: string;                 // profileId do comprador (preenchido no checkout)
  items: ProposalItem[];
  subtotal: string;                 // BZR
  shipping?: { method: string; price: string };
  total: string;                    // BZR
  commissionPercent: number;
  isMultiStore: boolean;            // FASE 8: Multi-Store Proposals
  storeGroups?: StoreGroup[];       // FASE 8: Agrupamento por loja
  status: "draft" | "sent" | "accepted" | "expired" | "paid" | "partially_paid" | "failed";
  expiresAt?: string;
  createdAt: string;
}

export interface ProposalItem {
  sku: string;
  name: string;
  qty: number;
  price: string;                    // BZR
}

// FASE 8: Grupo de loja em proposta multi-store
export interface StoreGroup {
  storeId: number;
  storeName: string;
  items: ProposalItem[];
  subtotal: number;
  shipping?: { method: string; price: number };
  total: number;
  commissionPercent: number;
}

// Venda (FASE 3 - MOCK)
export interface ChatSale {
  id: string;
  storeId: number;
  buyer: string;                    // profileId
  seller: string;                   // profileId
  promoter?: string;                // profileId (opcional)
  amount: string;                   // BZR
  commissionPercent: number;
  commissionAmount: string;         // BZR
  bazariFee: string;                // BZR (1%)
  sellerAmount: string;             // BZR
  status: "pending" | "split" | "failed";
  txHash?: string;                  // Mock transaction hash
  receiptNftCid?: string;           // IPFS CID do recibo NFT
  proposalId?: string;
  createdAt: number;
  settledAt?: number;
}

// Políticas de comissão da loja (Fase 3)
export interface StoreCommissionPolicy {
  storeId: number;
  mode: 'open' | 'followers' | 'affiliates';
  percent: number;                  // 0-20%
  minReputation?: number;
  dailyCommissionCap?: string;      // BZR
  allowMultiStore?: boolean;        // FASE 8: Multi-Store Proposals
  createdAt: number;
  updatedAt: number;
}

// Pre-key Bundle (E2EE - X3DH)
export interface PreKeyBundle {
  profileId: string;
  identityKey: string;              // base64
  signedPreKey: string;             // base64
  signedPreKeySignature: string;    // base64
  oneTimePreKey?: string;           // base64
}

// Ratchet State (E2EE - Double Ratchet)
export interface RatchetState {
  sessionId: string;
  rootKey: string;                  // base64
  sendingChainKey: string;
  receivingChainKey: string;
  sendingChainN: number;
  receivingChainN: number;
  prevChainN: number;
  skippedKeys: Record<number, string>; // messageN -> messageKey
}

// Grupo de chat (Fase 2)
export interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  kind: 'community' | 'channel' | 'private';
  isPublic: boolean;
  adminIds: string[];               // profileIds
  memberIds: string[];              // profileIds
  maxMembers: number | null;
  metadata?: Record<string, any>;
  createdAt: number;
}

// Upload de mídia (Fase 2)
export interface MediaUpload {
  cid: string;                      // IPFS CID
  encryptionKey: string;            // hex string
  mimetype: string;
  filename: string;
  size: number;
}

// Metadados de mídia na mensagem
export interface MediaMetadata {
  cid: string;
  encryptionKey: string;
  mimetype: string;
  filename?: string;
  size?: number;
  width?: number;                   // para imagens/vídeos
  height?: number;                  // para imagens/vídeos
  duration?: number;                // para áudio/vídeo (segundos)
  thumbnail?: string;               // CID do thumbnail (opcional)
}
