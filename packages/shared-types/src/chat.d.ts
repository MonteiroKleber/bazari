export type MessageType = "text" | "audio" | "image" | "file" | "video" | "proposal" | "checkout" | "payment" | "system";
export type ThreadKind = "dm" | "store" | "order" | "group";
export interface ChatThreadParticipant {
    profileId: string;
    handle: string;
    name?: string;
    avatarUrl?: string;
    isOnline?: boolean;
}
export interface ChatThread {
    id: string;
    kind: ThreadKind;
    participants: string[];
    orderId?: string;
    groupId?: string;
    lastMessageAt: number;
    unreadCount: number;
    metadata?: Record<string, any>;
    createdAt: number;
    updatedAt: number;
}
export interface ChatThreadWithParticipants extends ChatThread {
    participantsData: ChatThreadParticipant[];
}
export interface ChatMessage {
    id: string;
    threadId: string;
    from: string;
    type: MessageType;
    ciphertext: string;
    mediaCid?: string;
    meta?: Record<string, any>;
    createdAt: number;
    deliveredAt?: number;
    readAt?: number;
    replyTo?: string;
    editedAt?: number;
}
export interface WsClientMsg {
    op: "send" | "ack" | "presence" | "typing" | "read";
    data: any;
}
export interface WsServerMsg {
    op: "message" | "receipt" | "presence" | "typing" | "system";
    data: any;
}
export interface Proposal {
    id: string;
    threadId: string;
    sellerId: string;
    buyerId?: string;
    items: ProposalItem[];
    subtotal: string;
    shipping?: {
        method: string;
        price: string;
    };
    total: string;
    commissionPercent: number;
    isMultiStore: boolean;
    storeGroups?: StoreGroup[];
    status: "draft" | "sent" | "accepted" | "expired" | "paid" | "partially_paid" | "failed";
    expiresAt?: string;
    createdAt: string;
}
export interface ProposalItem {
    sku: string;
    name: string;
    qty: number;
    price: string;
}
export interface StoreGroup {
    storeId: number;
    storeName: string;
    items: ProposalItem[];
    subtotal: number;
    shipping?: {
        method: string;
        price: number;
    };
    total: number;
    commissionPercent: number;
}
export interface ChatSale {
    id: string;
    storeId: number;
    buyer: string;
    seller: string;
    promoter?: string;
    amount: string;
    commissionPercent: number;
    commissionAmount: string;
    bazariFee: string;
    sellerAmount: string;
    status: "pending" | "split" | "failed";
    txHash?: string;
    receiptNftCid?: string;
    proposalId?: string;
    createdAt: number;
    settledAt?: number;
}
export interface StoreCommissionPolicy {
    storeId: number;
    mode: 'open' | 'followers' | 'affiliates';
    percent: number;
    minReputation?: number;
    dailyCommissionCap?: string;
    allowMultiStore?: boolean;
    createdAt: number;
    updatedAt: number;
}
export interface PreKeyBundle {
    profileId: string;
    identityKey: string;
    signedPreKey: string;
    signedPreKeySignature: string;
    oneTimePreKey?: string;
}
export interface RatchetState {
    sessionId: string;
    rootKey: string;
    sendingChainKey: string;
    receivingChainKey: string;
    sendingChainN: number;
    receivingChainN: number;
    prevChainN: number;
    skippedKeys: Record<number, string>;
}
export interface ChatGroup {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    kind: 'community' | 'channel' | 'private';
    isPublic: boolean;
    adminIds: string[];
    memberIds: string[];
    maxMembers: number | null;
    metadata?: Record<string, any>;
    createdAt: number;
}
export interface MediaUpload {
    cid: string;
    encryptionKey: string;
    mimetype: string;
    filename: string;
    size: number;
}
export interface MediaMetadata {
    cid: string;
    encryptionKey: string;
    mimetype: string;
    filename?: string;
    size?: number;
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
}
//# sourceMappingURL=chat.d.ts.map