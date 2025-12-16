import { prisma } from '../../lib/prisma';
import {
  ChatThread,
  ChatMessage,
  ChatThreadWithParticipants,
  ChatThreadParticipant,
  ChatThreadPreference,
  ReplyToData,
} from '@bazari/shared-types';

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
      include: {
        reactions: {
          select: {
            id: true,
            profileId: true,
            emoji: true,
          },
        },
      },
    });

    const hasMore = messages.length > opts.limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt : undefined;

    // Coletar IDs de mensagens de reply para buscar em batch
    const replyToIds = items
      .map(m => m.replyTo)
      .filter((id): id is string => !!id);

    // Buscar mensagens e perfis de reply em batch
    const replyToDataMap = await this.getReplyToDataBatch(replyToIds);

    return {
      messages: items.map(m => this.mapMessage(m, replyToDataMap.get(m.replyTo || ''))).reverse(),
      nextCursor: nextCursor ? Number(nextCursor) : undefined,
    };
  }

  /**
   * Busca dados de múltiplas mensagens de reply em batch
   */
  private async getReplyToDataBatch(messageIds: string[]): Promise<Map<string, ReplyToData>> {
    if (messageIds.length === 0) return new Map();

    const uniqueIds = [...new Set(messageIds)];

    const replyMessages = await prisma.chatMessage.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        fromProfile: true,
        type: true,
        ciphertext: true,
        mediaCid: true,
      },
    });

    // Buscar perfis dos autores
    const authorIds = [...new Set(replyMessages.map(m => m.fromProfile))];
    const authors = await prisma.profile.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, displayName: true, handle: true },
    });
    const authorMap = new Map(authors.map(a => [a.id, a]));

    const result = new Map<string, ReplyToData>();

    for (const msg of replyMessages) {
      const author = authorMap.get(msg.fromProfile);
      result.set(msg.id, {
        id: msg.id,
        from: msg.fromProfile,
        fromName: author?.displayName || undefined,
        fromHandle: author?.handle || undefined,
        type: msg.type as any,
        ciphertext: msg.ciphertext,
        mediaCid: msg.mediaCid || undefined,
      });
    }

    // Marcar IDs não encontrados como deletados
    for (const id of uniqueIds) {
      if (!result.has(id)) {
        result.set(id, {
          id,
          from: '',
          type: 'text',
          deleted: true,
        });
      }
    }

    return result;
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

  /**
   * Editar uma mensagem (apenas o autor pode editar)
   * Só permite editar mensagens de texto dentro de 15 minutos
   */
  async editMessage(
    messageId: string,
    profileId: string,
    newCiphertext: string
  ): Promise<ChatMessage | null> {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.fromProfile !== profileId) {
      throw new Error('Not authorized to edit this message');
    }

    // Só permite editar mensagens de texto
    if (message.type !== 'text') {
      throw new Error('Only text messages can be edited');
    }

    // Limite de 15 minutos para edição
    const fifteenMinutesMs = 15 * 60 * 1000;
    if (Date.now() - Number(message.createdAt) > fifteenMinutesMs) {
      throw new Error('Edit time limit exceeded (15 minutes)');
    }

    // Já foi deletada
    if (message.deletedAt) {
      throw new Error('Cannot edit a deleted message');
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        ciphertext: newCiphertext,
        editedAt: Date.now(),
      },
      include: {
        reactions: {
          select: {
            id: true,
            profileId: true,
            emoji: true,
          },
        },
      },
    });

    return this.mapMessage(updated);
  }

  /**
   * Deletar uma mensagem (soft delete - apenas o autor pode deletar)
   */
  async deleteMessage(messageId: string, profileId: string): Promise<ChatMessage | null> {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.fromProfile !== profileId) {
      throw new Error('Not authorized to delete this message');
    }

    // Já foi deletada
    if (message.deletedAt) {
      return this.mapMessage(message);
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: Date.now(),
        // Limpar conteúdo sensível
        ciphertext: '[deleted]',
        mediaCid: null,
        meta: undefined,
      },
      include: {
        reactions: {
          select: {
            id: true,
            profileId: true,
            emoji: true,
          },
        },
      },
    });

    // Deletar reações da mensagem deletada
    await prisma.chatMessageReaction.deleteMany({
      where: { messageId },
    });

    return this.mapMessage(updated);
  }

  /**
   * Buscar uma mensagem por ID
   */
  async getMessage(messageId: string): Promise<ChatMessage | null> {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        reactions: {
          select: {
            id: true,
            profileId: true,
            emoji: true,
          },
        },
      },
    });

    return message ? this.mapMessage(message) : null;
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

  private mapMessage(message: any, replyToData?: ReplyToData): ChatMessage {
    // Agregar reações em um sumário
    let reactionsSummary: { emoji: string; count: number; profileIds: string[]; hasCurrentUser: boolean }[] | undefined;

    if (message.reactions && message.reactions.length > 0) {
      const reactionMap = new Map<string, string[]>();

      for (const reaction of message.reactions) {
        const existing = reactionMap.get(reaction.emoji) || [];
        existing.push(reaction.profileId);
        reactionMap.set(reaction.emoji, existing);
      }

      reactionsSummary = Array.from(reactionMap.entries()).map(([emoji, profileIds]) => ({
        emoji,
        count: profileIds.length,
        profileIds,
        hasCurrentUser: false, // Will be set on the client side
      }));
    }

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
      replyToData: replyToData,
      editedAt: message.editedAt ? Number(message.editedAt) : undefined,
      deletedAt: message.deletedAt ? Number(message.deletedAt) : undefined,
      reactionsSummary,
    };
  }
}

export const chatService = new ChatService();

/**
 * Serviço para gerenciar preferências de thread (pin, archive, mute)
 */
class ThreadPreferenceService {
  /**
   * Fixar ou desafixar uma thread
   */
  async setPin(threadId: string, profileId: string, isPinned: boolean): Promise<ChatThreadPreference> {
    const now = Date.now();

    const preference = await prisma.chatThreadPreference.upsert({
      where: {
        threadId_profileId: { threadId, profileId },
      },
      update: {
        isPinned,
        pinnedAt: isPinned ? now : null,
      },
      create: {
        threadId,
        profileId,
        isPinned,
        pinnedAt: isPinned ? now : null,
        isArchived: false,
        isMuted: false,
      },
    });

    return this.mapPreference(preference);
  }

  /**
   * Arquivar ou desarquivar uma thread
   */
  async setArchive(threadId: string, profileId: string, isArchived: boolean): Promise<ChatThreadPreference> {
    const now = Date.now();

    const preference = await prisma.chatThreadPreference.upsert({
      where: {
        threadId_profileId: { threadId, profileId },
      },
      update: {
        isArchived,
        archivedAt: isArchived ? now : null,
        // Desafixar ao arquivar
        ...(isArchived && { isPinned: false, pinnedAt: null }),
      },
      create: {
        threadId,
        profileId,
        isPinned: false,
        isArchived,
        archivedAt: isArchived ? now : null,
        isMuted: false,
      },
    });

    return this.mapPreference(preference);
  }

  /**
   * Silenciar ou dessilenciar uma thread
   */
  async setMute(threadId: string, profileId: string, isMuted: boolean): Promise<ChatThreadPreference> {
    const now = Date.now();

    const preference = await prisma.chatThreadPreference.upsert({
      where: {
        threadId_profileId: { threadId, profileId },
      },
      update: {
        isMuted,
        mutedAt: isMuted ? now : null,
      },
      create: {
        threadId,
        profileId,
        isPinned: false,
        isArchived: false,
        isMuted,
        mutedAt: isMuted ? now : null,
      },
    });

    return this.mapPreference(preference);
  }

  /**
   * Obter preferência de uma thread para um usuário
   */
  async getPreference(threadId: string, profileId: string): Promise<ChatThreadPreference | null> {
    const preference = await prisma.chatThreadPreference.findUnique({
      where: {
        threadId_profileId: { threadId, profileId },
      },
    });

    return preference ? this.mapPreference(preference) : null;
  }

  /**
   * Obter preferências de múltiplas threads para um usuário
   */
  async getPreferences(threadIds: string[], profileId: string): Promise<Map<string, ChatThreadPreference>> {
    const preferences = await prisma.chatThreadPreference.findMany({
      where: {
        threadId: { in: threadIds },
        profileId,
      },
    });

    const map = new Map<string, ChatThreadPreference>();
    for (const pref of preferences) {
      map.set(pref.threadId, this.mapPreference(pref));
    }
    return map;
  }

  /**
   * Listar threads arquivadas de um usuário
   */
  async listArchivedThreads(
    profileId: string,
    opts: { cursor?: number; limit: number }
  ): Promise<{ threads: ChatThreadWithParticipants[]; nextCursor?: number; count: number }> {
    // Buscar preferências arquivadas
    const archivedPrefs = await prisma.chatThreadPreference.findMany({
      where: {
        profileId,
        isArchived: true,
      },
      orderBy: { archivedAt: 'desc' },
    });

    const threadIds = archivedPrefs.map(p => p.threadId);

    if (threadIds.length === 0) {
      return { threads: [], count: 0 };
    }

    // Buscar threads
    const where = {
      id: { in: threadIds },
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
      count: archivedPrefs.length,
    };
  }

  /**
   * Contar threads arquivadas
   */
  async countArchived(profileId: string): Promise<number> {
    return prisma.chatThreadPreference.count({
      where: {
        profileId,
        isArchived: true,
      },
    });
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
      isOnline: false,
    }));
  }

  private mapThread(thread: any): ChatThread {
    return {
      id: thread.id,
      kind: thread.kind,
      participants: thread.participants,
      orderId: thread.orderId,
      groupId: thread.groupId,
      lastMessageAt: Number(thread.lastMessageAt),
      unreadCount: 0,
      metadata: thread.metadata,
      createdAt: Number(thread.createdAt),
      updatedAt: Number(thread.updatedAt),
    };
  }

  private mapPreference(pref: any): ChatThreadPreference {
    return {
      threadId: pref.threadId,
      profileId: pref.profileId,
      isPinned: pref.isPinned,
      pinnedAt: pref.pinnedAt ? Number(pref.pinnedAt) : undefined,
      isArchived: pref.isArchived,
      archivedAt: pref.archivedAt ? Number(pref.archivedAt) : undefined,
      isMuted: pref.isMuted,
    };
  }
}

export const threadPreferenceService = new ThreadPreferenceService();
