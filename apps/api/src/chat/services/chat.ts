import { prisma } from '../../lib/prisma';
import { ChatThread, ChatMessage, ChatThreadWithParticipants, ChatThreadParticipant } from '@bazari/shared-types';

class ChatService {
  async getProfileByUserId(userId: string) {
    return prisma.profile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  }

  async createThread(data: {
    kind: string;
    participants: string[];
    orderId?: string;
    groupId?: string;
  }): Promise<ChatThread> {
    const now = Date.now();

    const thread = await prisma.chatThread.create({
      data: {
        kind: data.kind,
        participants: data.participants,
        orderId: data.orderId,
        groupId: data.groupId,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });

    return this.mapThread(thread);
  }

  async findDmThread(profile1: string, profile2: string): Promise<ChatThread | null> {
    const thread = await prisma.chatThread.findFirst({
      where: {
        kind: 'dm',
        participants: { hasEvery: [profile1, profile2] },
      },
    });

    return thread ? this.mapThread(thread) : null;
  }

  async getThread(threadId: string): Promise<ChatThread> {
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    return this.mapThread(thread);
  }

  async listThreads(
    profileId: string,
    opts: { cursor?: number; limit: number }
  ): Promise<{ threads: ChatThreadWithParticipants[]; nextCursor?: number }> {
    const where = {
      participants: { has: profileId },
      ...(opts.cursor && { lastMessageAt: { lt: opts.cursor } }),
    };

    const threads = await prisma.chatThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: opts.limit + 1,
    });

    const hasMore = threads.length > opts.limit;
    const items = hasMore ? threads.slice(0, -1) : threads;
    const nextCursor = hasMore ? items[items.length - 1]?.lastMessageAt : undefined;

    // Buscar dados dos participantes
    const threadsWithParticipants = await Promise.all(
      items.map(async (thread) => {
        const participantsData = await this.getParticipantsData(thread.participants);
        return {
          ...this.mapThread(thread),
          participantsData,
        };
      })
    );

    return {
      threads: threadsWithParticipants,
      nextCursor: nextCursor ? Number(nextCursor) : undefined,
    };
  }

  private async getParticipantsData(profileIds: string[]): Promise<ChatThreadParticipant[]> {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: {
        id: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return profiles.map((p) => ({
      profileId: p.id,
      handle: p.handle,
      name: p.displayName || undefined,
      avatarUrl: p.avatarUrl || undefined,
      isOnline: false, // TODO: implementar status online
    }));
  }

  async updateThreadLastMessage(threadId: string, timestamp: number) {
    await prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: timestamp, updatedAt: timestamp },
    });
  }

  async createMessage(data: {
    threadId: string;
    fromProfile: string;
    type: string;
    ciphertext: string;
    mediaCid?: string;
    meta?: any;
    replyTo?: string;
  }): Promise<ChatMessage> {
    const now = Date.now();

    const message = await prisma.chatMessage.create({
      data: {
        threadId: data.threadId,
        fromProfile: data.fromProfile,
        type: data.type,
        ciphertext: data.ciphertext,
        mediaCid: data.mediaCid,
        meta: data.meta,
        replyTo: data.replyTo,
        createdAt: now,
      },
    });

    return this.mapMessage(message);
  }

  async listMessages(
    threadId: string,
    opts: { cursor?: number; limit: number }
  ): Promise<{ messages: ChatMessage[]; nextCursor?: number }> {
    const where = {
      threadId,
      ...(opts.cursor && { createdAt: { lt: opts.cursor } }),
    };

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit + 1,
    });

    const hasMore = messages.length > opts.limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt : undefined;

    return {
      messages: items.map(m => this.mapMessage(m)).reverse(), // Ordem cronológica
      nextCursor: nextCursor ? Number(nextCursor) : undefined,
    };
  }

  async markDelivered(messageId: string) {
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { deliveredAt: Date.now() },
    });
  }

  async markRead(messageId: string, profileId: string) {
    // Simplificado: apenas marca a mensagem como lida
    // Pode expandir para armazenar quem leu em threads de grupo
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { readAt: Date.now() },
    });
  }

  private mapThread(thread: any): ChatThread {
    return {
      id: thread.id,
      kind: thread.kind,
      participants: thread.participants,
      orderId: thread.orderId,
      groupId: thread.groupId,
      lastMessageAt: Number(thread.lastMessageAt),
      unreadCount: 0, // TODO: calcular
      metadata: thread.metadata,
      createdAt: Number(thread.createdAt),
      updatedAt: Number(thread.updatedAt),
    };
  }

  private mapMessage(message: any): ChatMessage {
    return {
      id: message.id,
      threadId: message.threadId,
      from: message.fromProfile,
      type: message.type,
      ciphertext: message.ciphertext,
      mediaCid: message.mediaCid,
      meta: message.meta,
      createdAt: Number(message.createdAt),
      deliveredAt: message.deliveredAt ? Number(message.deliveredAt) : undefined,
      readAt: message.readAt ? Number(message.readAt) : undefined,
      replyTo: message.replyTo,
      editedAt: message.editedAt ? Number(message.editedAt) : undefined,
    };
  }
}

export const chatService = new ChatService();
