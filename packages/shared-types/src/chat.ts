// BazChat - Tipos Compartilhados
// Este arquivo define os tipos compartilhados entre API e Web para o sistema de chat

// Tipos de mensagem
export type MessageType =
  | "text" | "audio" | "image" | "file" | "video"
  | "proposal" | "checkout" | "payment" | "system";

export type ThreadKind = "dm" | "store" | "order" | "group";

// Status de mensagem (derivado de deliveredAt/readAt no frontend)
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

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

// Dados da mensagem citada (reply)
export interface ReplyToData {
  id: string;
  from: string;                     // profileId do autor original
  fromName?: string;                // displayName do autor
  fromHandle?: string;              // handle do autor
  type: MessageType;
  ciphertext?: string;              // E2EE payload (para decriptar no frontend)
  mediaCid?: string;                // IPFS CID se for mídia
  deleted?: boolean;                // true se mensagem foi deletada
}

// Reação a mensagem
export interface ChatMessageReaction {
  id: string;
  messageId: string;
  profileId: string;
  emoji: string;
  createdAt: string;
  profile?: {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl?: string;
  };
}

// Sumário de reações para exibição
export interface ReactionSummary {
  emoji: string;
  count: number;
  profileIds: string[];
  hasCurrentUser: boolean;
}

// Payload para adicionar/remover reação
export interface ReactionPayload {
  messageId: string;
  emoji: string;
  action: 'add' | 'remove';
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
  replyTo?: string;                 // messageId (legacy, mantido para compatibilidade)
  replyToData?: ReplyToData;        // Dados expandidos da mensagem citada
  editedAt?: number;
  deletedAt?: number;               // Soft delete timestamp
  reactions?: ChatMessageReaction[];
  reactionsSummary?: ReactionSummary[];
}

// WebSocket envelopes
export interface WsClientMsg {
  op: "send" | "ack" | "presence" | "typing:start" | "typing:stop" | "receipt:delivered" | "receipt:read"
    | "rtc:offer" | "rtc:answer" | "rtc:candidate" | "rtc:call-start" | "rtc:call-end"
    | "chat:reaction" | "message:edit" | "message:delete"
    | "call:offer" | "call:answer" | "call:reject" | "call:end" | "ice:candidate";
  data: any;
}

export interface WsServerMsg {
  op: "message" | "message:status" | "message:edited" | "message:deleted" | "presence" | "presence:update" | "presence:status" | "typing" | "system" | "error" | "chat:reaction" | "thread:created"
    | "call:incoming" | "call:ringing" | "call:answered" | "call:rejected" | "call:ended" | "ice:candidate";
  data: any;
}

// Typing indicator events
export interface WsTypingData {
  threadId: string;
  profileId: string;
  handle: string;
  displayName: string;
  isTyping: boolean;
}

// Message status update event
export interface WsMessageStatusData {
  messageId: string;
  status: "sent" | "delivered" | "read";
  timestamp: number;
}

// Delivery receipt from client
export interface WsDeliveryReceiptData {
  messageIds: string[];
}

// Read receipt from client
export interface WsReadReceiptData {
  threadId: string;
  messageIds: string[];
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

// Preferências de thread por usuário (Pin/Archive)
export interface ChatThreadPreference {
  threadId: string;
  profileId: string;
  isPinned: boolean;
  pinnedAt?: number;
  isArchived: boolean;
  archivedAt?: number;
  isMuted: boolean;
}

// Thread com preferências do usuário
export interface ChatThreadWithPreferences extends ChatThreadWithParticipants {
  isPinned: boolean;
  pinnedAt?: number;
  isArchived: boolean;
}

// Typing user info for UI
export interface TypingUser {
  profileId: string;
  handle: string;
  displayName: string;
}

// Online Status
export type OnlineStatus = 'online' | 'offline' | 'away';

export interface UserPresence {
  profileId: string;
  status: OnlineStatus;
  lastSeenAt?: string; // ISO date
}

export interface PresenceUpdate {
  profileId: string;
  status: OnlineStatus;
  lastSeenAt?: string;
}

// =====================================================
// STORIES/STATUS
// =====================================================

export type StoryType = 'TEXT' | 'IMAGE' | 'VIDEO';

export interface Story {
  id: string;
  profileId: string;
  type: StoryType;
  text?: string | null;
  textColor?: string | null;
  backgroundColor?: string | null;
  mediaCid?: string | null;
  mediaType?: string | null;
  duration?: number | null;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date
  viewCount: number;
  profile?: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  views?: StoryViewInfo[];
}

export interface StoryViewInfo {
  viewedAt: string; // ISO date
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewedAt: string; // ISO date
  viewer?: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface StoryFeedItem {
  profile: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  stories: Story[];
  hasUnviewed: boolean;
  latestAt: string; // ISO date
  isOwn: boolean;
}

export interface CreateStoryPayload {
  type: StoryType;
  text?: string;
  textColor?: string;
  backgroundColor?: string;
  mediaCid?: string;
  mediaType?: string;
  duration?: number;
}

// =====================================================
// CHAMADAS DE VOZ/VIDEO (WebRTC)
// =====================================================

export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED' | 'BUSY';

export interface Call {
  id: string;
  threadId: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  status: CallStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  duration?: number | null;
  createdAt: string;
}

export interface CallProfile {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// ============== WebSocket Events - Cliente -> Servidor ==============

export interface WsCallOffer {
  op: 'call:offer';
  data: {
    threadId: string;
    calleeId: string;
    type: CallType;
    sdp: string; // SDP offer (JSON stringified)
  };
}

export interface WsCallAnswer {
  op: 'call:answer';
  data: {
    callId: string;
    sdp: string; // SDP answer (JSON stringified)
  };
}

export interface WsCallReject {
  op: 'call:reject';
  data: {
    callId: string;
  };
}

export interface WsCallEnd {
  op: 'call:end';
  data: {
    callId: string;
  };
}

export interface WsIceCandidate {
  op: 'ice:candidate';
  data: {
    callId: string;
    candidate: RTCIceCandidateInit;
  };
}

// ============== WebSocket Events - Servidor -> Cliente ==============

export interface WsCallIncoming {
  op: 'call:incoming';
  data: {
    callId: string;
    threadId: string;
    caller: CallProfile;
    type: CallType;
    sdp: string;
  };
}

export interface WsCallRinging {
  op: 'call:ringing';
  data: {
    callId: string;
  };
}

export interface WsCallAnswered {
  op: 'call:answered';
  data: {
    callId: string;
    sdp: string;
  };
}

export interface WsCallRejected {
  op: 'call:rejected';
  data: {
    callId: string;
  };
}

export interface WsCallEnded {
  op: 'call:ended';
  data: {
    callId: string;
    reason: 'ended' | 'missed' | 'rejected' | 'busy' | 'offline' | 'error';
    duration?: number;
  };
}

export interface WsIceCandidateReceived {
  op: 'ice:candidate';
  data: {
    callId: string;
    candidate: RTCIceCandidateInit;
  };
}
