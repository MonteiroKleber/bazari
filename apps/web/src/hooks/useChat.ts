import { create } from 'zustand';
import {
  ChatThreadWithParticipants,
  ChatMessage,
  MediaMetadata,
  ChatGroup,
  Proposal,
  TypingUser,
  WsTypingData,
  WsMessageStatusData,
  UserPresence,
  PresenceUpdate,
} from '@bazari/shared-types';
import { chatWs } from '../lib/chat/websocket';
import { chatCrypto } from '../lib/chat/crypto';
import { apiHelpers } from '../lib/api';
import { useCallStore } from '../stores/call.store';

interface ChatState {
  // State
  threads: ChatThreadWithParticipants[];
  messages: Map<string, ChatMessage[]>;
  groups: ChatGroup[];
  proposals: Map<string, Proposal>;
  activeThreadId: string | null;
  connected: boolean;
  currentProfileId: string | null;

  // Typing indicators (threadId -> array de usuários digitando)
  typingUsers: Map<string, TypingUser[]>;

  // Presence (profileId -> UserPresence)
  presences: Map<string, UserPresence>;

  // Thread preferences (para Pin/Archive - fase posterior)
  threadPreferences: Map<string, { isPinned: boolean; pinnedAt?: number; isArchived: boolean }>;
  archivedCount: number;

  // Actions
  initialize: (token: string) => Promise<void>;
  loadThreads: () => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, plaintext: string, media?: MediaMetadata, replyToId?: string) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  createDm: (participantId: string) => Promise<string>;

  // Typing
  sendTypingStart: (threadId: string) => void;
  sendTypingStop: (threadId: string) => void;

  // Read receipts
  markMessagesAsRead: (threadId: string) => void;

  // Groups
  loadGroups: () => Promise<void>;
  createGroup: (data: any) => Promise<string>;
  inviteToGroup: (groupId: string, memberId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;

  // Commerce
  createProposal: (data: {
    threadId: string;
    items: Array<{ sku: string; name: string; qty: number; price: string }>;
    shipping?: { method: string; price: string };
    total: string;
    commissionPercent?: number;
  }) => Promise<Proposal>;
  loadProposal: (proposalId: string) => Promise<Proposal>;
  acceptProposal: (proposalId: string, promoterId?: string) => Promise<void>;

  // Reactions
  toggleReaction: (messageId: string, emoji: string) => void;

  // Message Edit/Delete
  editMessage: (messageId: string, newPlaintext: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Block User
  blockedProfiles: Set<string>;
  blockProfile: (profileId: string, reason?: string) => Promise<void>;
  unblockProfile: (profileId: string) => Promise<void>;
  isProfileBlocked: (profileId: string) => boolean;
  loadBlockedProfiles: () => Promise<void>;

  // Presence
  loadPresences: (profileIds: string[]) => Promise<void>;
  getPresence: (profileId: string) => UserPresence | undefined;

  // Computed: total de mensagens não lidas
  getTotalUnreadCount: () => number;
}

export const useChat = create<ChatState>((set, get) => ({
  threads: [],
  messages: new Map(),
  groups: [],
  proposals: new Map(),
  activeThreadId: null,
  connected: false,
  currentProfileId: null,
  typingUsers: new Map(),
  presences: new Map(),
  threadPreferences: new Map(),
  archivedCount: 0,
  blockedProfiles: new Set(),

  initialize: async (token: string) => {
    console.log('[useChat] Initializing chat...');

    // Inicializar crypto
    await chatCrypto.initialize();

    // Importar sessões salvas
    const savedSessions = localStorage.getItem('chat_sessions');
    console.log('[useChat] Saved sessions in localStorage:', savedSessions ? 'YES' : 'NO');
    if (savedSessions) {
      console.log('[useChat] Importing sessions:', savedSessions.substring(0, 100) + '...');
      chatCrypto.importSessions(savedSessions);
      console.log('[useChat] Sessions imported. Current sessions:', chatCrypto.listSessions());
    } else {
      console.log('[useChat] No saved sessions found, starting fresh');
    }

    // Registrar chave pública no servidor
    try {
      const publicKey = chatCrypto.getPublicKey();
      await apiHelpers.put('/api/chat/keys', { publicKey });
      console.log('[useChat] Public key registered on server');
    } catch (err) {
      console.error('[useChat] Failed to register public key:', err);
    }

    // Handler de status de conexão
    chatWs.onStatusChange((connected) => {
      console.log('[useChat] Connection status changed:', connected);
      set({ connected });

      // Carregar threads quando conectar
      if (connected) {
        get().loadThreads();
      }
    });

    // Handler de mensagens
    chatWs.onMessage(async (msg) => {
      // Nova mensagem recebida
      if (msg.op === 'message') {
        const message = msg.data as ChatMessage;

        // Verificar se é grupo (grupos não usam E2EE)
        const thread = get().threads.find(t => t.id === message.threadId);
        const isGroup = thread?.kind === 'group';

        // Descriptografar mensagem antes de adicionar ao state
        let plaintext: string | undefined;
        if (message.type === 'text') {
          if (isGroup) {
            // Grupo: ciphertext já é o plaintext
            plaintext = message.ciphertext;
          } else {
            // DM: descriptografar E2EE
            try {
              plaintext = await chatCrypto.decrypt(message.threadId, message.ciphertext);
            } catch (err) {
              console.error('[useChat] Decryption failed for thread:', message.threadId.slice(0, 8));

              // Tentar criar sessão on-demand
              try {
                const thread = get().threads.find(t => t.id === message.threadId);
                if (thread) {
                  const response = await apiHelpers.getMeProfile() as { profile?: { id: string }; id?: string };
                  const myProfile = response.profile || response;
                  const currentProfileId = (myProfile as { id: string }).id;
                  const otherParticipantId = thread.participants.find((p: string) => p !== currentProfileId);

                  if (otherParticipantId) {
                    const keysResponse = await apiHelpers.get(`/api/chat/keys?profileIds=${otherParticipantId}`);
                    const theirPublicKey = keysResponse.keys[otherParticipantId];

                    if (theirPublicKey) {
                      await chatCrypto.createSession(message.threadId, theirPublicKey);
                      localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
                      plaintext = await chatCrypto.decrypt(message.threadId, message.ciphertext);
                    }
                  }
                }
              } catch (retryErr) {
                console.error('[useChat] Failed to create session on-demand:', retryErr);
                plaintext = '[Mensagem criptografada - Sessão E2EE não estabelecida]';
              }

              if (!plaintext) {
                plaintext = '[Mensagem criptografada - Sessão E2EE não estabelecida]';
              }
            }
          }
        }

        const decryptedMessage = { ...message, plaintext };

        // Adicionar mensagem ao state (com deduplicação)
        const current = get().messages.get(message.threadId) || [];

        // Verificar se a mensagem já existe (pelo ID)
        const existingIndex = current.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
          // Mensagem já existe, atualizar em vez de adicionar
          const updated = [...current];
          updated[existingIndex] = decryptedMessage;
          set({
            messages: new Map(get().messages).set(message.threadId, updated),
          });
        } else {
          // Verificar se é uma confirmação de mensagem temporária (mesmo remetente, mesmo timestamp aproximado)
          const tempIndex = current.findIndex(m =>
            m.id.startsWith('temp-') &&
            m.from === message.from &&
            Math.abs(m.createdAt - message.createdAt) < 5000 && // Dentro de 5 segundos
            m.type === message.type &&
            (m.mediaCid === message.mediaCid || m.ciphertext === message.ciphertext)
          );

          if (tempIndex !== -1) {
            // Substituir mensagem temporária pela real
            const updated = [...current];
            updated[tempIndex] = decryptedMessage;
            set({
              messages: new Map(get().messages).set(message.threadId, updated),
            });
          } else {
            // Nova mensagem, adicionar
            set({
              messages: new Map(get().messages).set(message.threadId, [...current, decryptedMessage]),
            });
          }
        }

        // Atualizar thread lastMessageAt
        const threads = get().threads.map(t =>
          t.id === message.threadId
            ? { ...t, lastMessageAt: message.createdAt }
            : t
        );
        set({ threads: threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt) });

        // Enviar delivery receipt se não for minha mensagem
        const currentProfileId = get().currentProfileId;
        if (currentProfileId && message.from !== currentProfileId) {
          chatWs.sendDeliveryReceipt([message.id]);
        }
      }

      // Status de mensagem atualizado (sent, delivered, read)
      if (msg.op === 'message:status') {
        const statusData = msg.data as WsMessageStatusData;
        const { messageId, status, timestamp } = statusData;

        // Atualizar mensagem no state
        const messages = get().messages;
        for (const [threadId, threadMessages] of messages.entries()) {
          const index = threadMessages.findIndex(m => m.id === messageId);
          if (index !== -1) {
            const updated = [...threadMessages];
            updated[index] = {
              ...updated[index],
              ...(status === 'delivered' && { deliveredAt: timestamp }),
              ...(status === 'read' && { readAt: timestamp }),
            };
            set({
              messages: new Map(messages).set(threadId, updated),
            });
            break;
          }
        }
      }

      // Typing indicator
      if (msg.op === 'typing') {
        const typingData = msg.data as WsTypingData;
        const { threadId, profileId, handle, displayName, isTyping } = typingData;

        const currentTyping = get().typingUsers.get(threadId) || [];

        if (isTyping) {
          // Adicionar se não existir
          if (!currentTyping.find(u => u.profileId === profileId)) {
            set({
              typingUsers: new Map(get().typingUsers).set(threadId, [
                ...currentTyping,
                { profileId, handle, displayName },
              ]),
            });
          }
        } else {
          // Remover
          set({
            typingUsers: new Map(get().typingUsers).set(
              threadId,
              currentTyping.filter(u => u.profileId !== profileId)
            ),
          });
        }
      }

      // Legacy receipt handler (para compatibilidade)
      if (msg.op === 'receipt' as any) {
        console.log('[useChat] Legacy receipt:', msg.data);
      }

      // Chat reaction handler
      if (msg.op === 'chat:reaction') {
        const { messageId, profileId, emoji, action } = msg.data;
        const currentProfileId = get().currentProfileId;

        // Ignorar se for do próprio usuário (já aplicamos optimistic update)
        if (profileId === currentProfileId) return;

        // Encontrar a mensagem e atualizar
        for (const [threadId, messages] of get().messages.entries()) {
          const messageIndex = messages.findIndex(m => m.id === messageId);
          if (messageIndex !== -1) {
            const updatedMessages = [...messages];
            const message = { ...updatedMessages[messageIndex] };
            let newReactionsSummary = [...(message.reactionsSummary || [])];

            if (action === 'add') {
              const existingReaction = newReactionsSummary.find(r => r.emoji === emoji);
              if (existingReaction) {
                existingReaction.count++;
                existingReaction.profileIds = [...existingReaction.profileIds, profileId];
              } else {
                newReactionsSummary.push({
                  emoji,
                  count: 1,
                  profileIds: [profileId],
                  hasCurrentUser: false,
                });
              }
            } else if (action === 'remove') {
              const existingReaction = newReactionsSummary.find(r => r.emoji === emoji);
              if (existingReaction) {
                existingReaction.count--;
                existingReaction.profileIds = existingReaction.profileIds.filter(
                  id => id !== profileId
                );
                if (existingReaction.count === 0) {
                  newReactionsSummary = newReactionsSummary.filter(r => r.emoji !== emoji);
                }
              }
            }

            message.reactionsSummary = newReactionsSummary;
            updatedMessages[messageIndex] = message;

            set({
              messages: new Map(get().messages).set(threadId, updatedMessages),
            });
            break;
          }
        }
      }

      // Presence update handler
      if (msg.op === 'presence:update') {
        const presenceData = msg.data as PresenceUpdate;
        const { profileId, status, lastSeenAt } = presenceData;

        set({
          presences: new Map(get().presences).set(profileId, {
            profileId,
            status,
            lastSeenAt,
          }),
        });
      }

      // Message edited handler
      if (msg.op === 'message:edited') {
        const { messageId, threadId, ciphertext, editedAt } = msg.data;

        const messages = get().messages.get(threadId);
        if (messages) {
          const thread = get().threads.find(t => t.id === threadId);
          const isGroup = thread?.kind === 'group';

          // Decifrar novo ciphertext
          let plaintext: string;
          if (isGroup) {
            plaintext = ciphertext;
          } else {
            try {
              plaintext = await chatCrypto.decrypt(threadId, ciphertext);
            } catch (err) {
              plaintext = '[Mensagem editada - E2EE não estabelecida]';
            }
          }

          const updatedMessages = messages.map(m => {
            if (m.id === messageId) {
              return { ...m, ciphertext, plaintext, editedAt };
            }
            return m;
          });

          set({
            messages: new Map(get().messages).set(threadId, updatedMessages),
          });
        }
      }

      // Message deleted handler
      if (msg.op === 'message:deleted') {
        const { messageId, threadId, deletedAt } = msg.data;

        const messages = get().messages.get(threadId);
        if (messages) {
          const updatedMessages = messages.map(m => {
            if (m.id === messageId) {
              return {
                ...m,
                deletedAt,
                ciphertext: '[deleted]',
                plaintext: undefined,
                mediaCid: undefined,
              };
            }
            return m;
          });

          set({
            messages: new Map(get().messages).set(threadId, updatedMessages),
          });
        }
      }

      // Nova thread criada (quando outro usuário inicia conversa)
      if (msg.op === 'thread:created') {
        const newThread = msg.data as ChatThreadWithParticipants;
        console.log('[useChat] New thread created:', newThread.id);

        // Verificar se a thread já existe na lista
        const existingThread = get().threads.find(t => t.id === newThread.id);
        if (!existingThread) {
          // Adicionar nova thread no topo da lista
          set({
            threads: [newThread, ...get().threads].sort((a, b) => b.lastMessageAt - a.lastMessageAt),
          });

          // Criar sessão E2EE se for DM
          if (newThread.kind === 'dm') {
            const currentProfileId = get().currentProfileId;
            if (currentProfileId) {
              const otherParticipantId = newThread.participants.find((p: string) => p !== currentProfileId);
              if (otherParticipantId) {
                // Criar sessão E2EE em background
                apiHelpers.get(`/api/chat/keys?profileIds=${otherParticipantId}`)
                  .then(async (keysResponse) => {
                    const theirPublicKey = keysResponse.keys[otherParticipantId];
                    if (theirPublicKey) {
                      await chatCrypto.createSession(newThread.id, theirPublicKey);
                      localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
                      console.log('[useChat] E2EE session created for new thread:', newThread.id.slice(0, 8));
                    }
                  })
                  .catch(err => console.error('[useChat] Failed to create E2EE session for new thread:', err));
              }
            }
          }
        }
      }

      // =====================================================
      // CHAMADAS DE VOZ/VIDEO (WebRTC)
      // =====================================================

      // Chamada recebida
      if (msg.op === 'call:incoming') {
        console.log('[useChat] Incoming call:', msg.data);
        useCallStore.getState().handleIncomingCall(msg.data as any);
      }

      // Chamada começou a tocar
      if (msg.op === 'call:ringing') {
        console.log('[useChat] Call ringing:', msg.data);
        useCallStore.getState().handleCallRinging((msg.data as any).callId);
      }

      // Chamada atendida
      if (msg.op === 'call:answered') {
        console.log('[useChat] Call answered:', msg.data);
        useCallStore.getState().handleCallAnswered((msg.data as any).sdp);
      }

      // Chamada encerrada
      if (msg.op === 'call:ended') {
        console.log('[useChat] Call ended:', msg.data);
        const data = msg.data as { callId: string; reason: string; duration?: number };
        useCallStore.getState().handleCallEnded(data.reason, data.duration);
      }

      // ICE candidate recebido
      if (msg.op === 'ice:candidate') {
        console.log('[useChat] ICE candidate received');
        useCallStore.getState().handleIceCandidate((msg.data as any).candidate);
      }
    });

    // Conectar WS
    chatWs.connect(token);
  },

  loadThreads: async () => {
    try {
      // Buscar Profile ID do usuário atual PRIMEIRO
      let currentProfileId: string;
      try {
        const profileResponse = await apiHelpers.getMeProfile() as { profile?: { id: string }; id?: string };
        const myProfile = profileResponse.profile || profileResponse;

        if (!myProfile || !(myProfile as { id: string }).id) {
          console.error('[useChat] Profile is missing or has no ID');
          return;
        }

        currentProfileId = (myProfile as { id: string }).id;
        // Notificar WebSocket do profileId para filtrar notificações
        chatWs.setCurrentProfileId(currentProfileId);
      } catch (err) {
        console.error('[useChat] Failed to get current profile:', err);
        return;
      }

      // Agora buscar threads e setar TUDO junto para evitar re-renders intermediários
      const response = await apiHelpers.getChatThreads();
      set({ threads: response.threads, currentProfileId });

      // Re-registrar chave pública (em background, não bloqueia)
      apiHelpers.put('/api/chat/keys', { publicKey: chatCrypto.getPublicKey() })
        .catch(err => console.error('[useChat] Failed to re-register public key:', err));

      // Criar sessões E2EE para threads DM
      for (const thread of response.threads) {
        if (thread.kind !== 'dm') continue;

        // Sempre recriar sessão para garantir chaves corretas
        if (chatCrypto.hasSession(thread.id)) {
          chatCrypto.deleteSession(thread.id);
        }

        try {
          const otherParticipantId = thread.participants.find((p: string) => p !== currentProfileId);
          if (!otherParticipantId) continue;

          const keysResponse = await apiHelpers.get(`/api/chat/keys?profileIds=${otherParticipantId}`);
          const theirPublicKey = keysResponse.keys[otherParticipantId];

          if (theirPublicKey) {
            await chatCrypto.createSession(thread.id, theirPublicKey);
          }
        } catch (err) {
          console.error(`[useChat] Failed to create E2EE session for thread ${thread.id}:`, err);
        }
      }

      // Salvar sessões
      localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
    } catch (err) {
      console.error('Failed to load threads:', err);
    }
  },

  loadMessages: async (threadId: string, cursor?: number) => {
    try {
      const response = await apiHelpers.getChatMessages(threadId, cursor ? { cursor, limit: 50 } : undefined);

      // Verificar se é grupo
      const thread = get().threads.find(t => t.id === threadId);
      const isGroup = thread?.kind === 'group';

      // Função para tentar recriar sessão E2EE
      const tryRecreateSession = async (): Promise<boolean> => {
        if (!thread || thread.kind !== 'dm') return false;

        try {
          const currentProfileId = get().currentProfileId;
          if (!currentProfileId) return false;

          const otherParticipantId = thread.participants.find((p: string) => p !== currentProfileId);
          if (!otherParticipantId) return false;

          // Deletar sessão antiga se existir
          if (chatCrypto.hasSession(threadId)) {
            chatCrypto.deleteSession(threadId);
          }

          // Buscar chave pública do outro participante
          const keysResponse = await apiHelpers.get(`/api/chat/keys?profileIds=${otherParticipantId}`);
          const theirPublicKey = keysResponse.keys[otherParticipantId];

          if (theirPublicKey) {
            await chatCrypto.createSession(threadId, theirPublicKey);
            localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
            console.log('[useChat] Session recreated for thread:', threadId.slice(0, 8));
            return true;
          }
        } catch (err) {
          console.error('[useChat] Failed to recreate session:', err);
        }
        return false;
      };

      // Decifrar mensagens
      let sessionRecreated = false;
      const decrypted = await Promise.all(
        response.messages.map(async (msg) => {
          if (msg.type === 'text') {
            if (isGroup) {
              return { ...msg, plaintext: msg.ciphertext };
            } else {
              try {
                const plaintext = await chatCrypto.decrypt(threadId, msg.ciphertext);
                return { ...msg, plaintext };
              } catch (err) {
                // Tentar recriar sessão apenas uma vez
                if (!sessionRecreated) {
                  sessionRecreated = true;
                  const recreated = await tryRecreateSession();
                  if (recreated) {
                    try {
                      const plaintext = await chatCrypto.decrypt(threadId, msg.ciphertext);
                      return { ...msg, plaintext };
                    } catch {
                      // Ainda falhou após recriar
                    }
                  }
                }
                return { ...msg, plaintext: '[Mensagem criptografada - Sessão E2EE não estabelecida]' };
              }
            }
          }
          return msg;
        })
      );

      // Atualizar state
      const currentMessages = get().messages.get(threadId) || [];
      const newMessages = cursor ? [...decrypted, ...currentMessages] : decrypted;

      set({
        messages: new Map(get().messages).set(threadId, newMessages),
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  },

  sendMessage: async (threadId: string, plaintext: string, media?: MediaMetadata, replyToId?: string) => {
    try {
      // Parar typing indicator
      chatWs.sendTypingStop(threadId);

      // Verificar se é grupo
      const thread = get().threads.find(t => t.id === threadId);
      const isGroup = thread?.kind === 'group';

      // Cifrar texto apenas para DMs
      let ciphertext = '';
      if (!isGroup) {
        try {
          ciphertext = plaintext ? await chatCrypto.encrypt(threadId, plaintext) : '';
        } catch (err) {
          console.error('[useChat] Encryption failed for thread:', threadId.slice(0, 8));
          throw new Error('Cannot send message: E2EE session not established. Please create a new conversation.');
        }
      } else {
        ciphertext = plaintext || '';
      }

      // Determinar tipo de mensagem
      const type = media
        ? (media.mimetype.startsWith('image/') ? 'image'
           : media.mimetype.startsWith('video/') ? 'video'
           : media.mimetype.startsWith('audio/') ? 'audio'
           : 'file')
        : 'text';

      // Criar mensagem temporária (optimistic update)
      const currentProfileId = get().currentProfileId;
      const tempId = `temp-${Date.now()}`;
      const tempMessage: ChatMessage = {
        id: tempId,
        threadId,
        from: currentProfileId || 'me',
        type,
        ciphertext,
        plaintext,
        mediaCid: media?.cid,
        replyTo: replyToId,
        meta: media ? {
          encryptionKey: media.encryptionKey,
          mimetype: media.mimetype,
          filename: media.filename,
          size: media.size,
          width: media.width,
          height: media.height,
          duration: media.duration,
        } : undefined,
        createdAt: Date.now(),
        // Não definir deliveredAt/readAt - status será 'sending'
      } as any;

      // Adicionar ao state imediatamente
      const current = get().messages.get(threadId) || [];
      set({
        messages: new Map(get().messages).set(threadId, [...current, tempMessage]),
      });

      // Enviar via WS
      chatWs.send({
        op: 'send',
        data: {
          threadId,
          type,
          ciphertext,
          mediaCid: media?.cid,
          replyTo: replyToId,
          meta: media ? {
            encryptionKey: media.encryptionKey,
            mimetype: media.mimetype,
            filename: media.filename,
            size: media.size,
            width: media.width,
            height: media.height,
            duration: media.duration,
          } : undefined,
        },
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  },

  setActiveThread: (threadId: string | null) => {
    set({ activeThreadId: threadId });

    // Carregar mensagens se necessário
    if (threadId && !get().messages.has(threadId)) {
      get().loadMessages(threadId);
    }

    // Marcar mensagens como lidas ao entrar na thread
    if (threadId) {
      get().markMessagesAsRead(threadId);
    }

    // Salvar sessões periodicamente
    localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
  },

  sendTypingStart: (threadId: string) => {
    chatWs.sendTypingStart(threadId);
  },

  sendTypingStop: (threadId: string) => {
    chatWs.sendTypingStop(threadId);
  },

  markMessagesAsRead: (threadId: string) => {
    const currentProfileId = get().currentProfileId;
    if (!currentProfileId) return;

    const messages = get().messages.get(threadId) || [];

    // Filtrar mensagens não lidas de outros usuários
    const unreadMessages = messages.filter(
      m => m.from !== currentProfileId &&
           !m.readAt &&
           !m.id.startsWith('temp-')
    );

    if (unreadMessages.length > 0) {
      chatWs.sendReadReceipt(threadId, unreadMessages.map(m => m.id));
    }
  },

  createDm: async (participantId: string) => {
    try {
      const thread = await apiHelpers.createChatThread({ participantId, kind: 'dm' });

      // Adicionar à lista
      set({ threads: [thread, ...get().threads] });

      // Criar sessão E2EE
      try {
        const keysResponse = await apiHelpers.get(`/api/chat/keys?profileIds=${participantId}`);
        const theirPublicKey = keysResponse.keys[participantId];

        if (theirPublicKey) {
          await chatCrypto.createSession(thread.id, theirPublicKey);
          localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
        } else {
          console.warn('[useChat] Participant has no public key registered');
        }
      } catch (err) {
        console.error('[useChat] Failed to create E2EE session:', err);
      }

      return thread.id;
    } catch (err) {
      console.error('Failed to create DM:', err);
      throw err;
    }
  },

  // Groups
  loadGroups: async () => {
    try {
      const response = await apiHelpers.getChatGroups();
      set({ groups: response.groups || [] });
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  },

  createGroup: async (data: any) => {
    try {
      const group = await apiHelpers.createChatGroup(data);
      set({ groups: [group, ...get().groups] });
      await get().loadThreads();
      return group.id;
    } catch (err) {
      console.error('Failed to create group:', err);
      throw err;
    }
  },

  inviteToGroup: async (groupId: string, memberId: string) => {
    try {
      await apiHelpers.inviteToGroup(groupId, memberId);
      await get().loadGroups();
    } catch (err) {
      console.error('Failed to invite to group:', err);
      throw err;
    }
  },

  leaveGroup: async (groupId: string) => {
    try {
      await apiHelpers.leaveGroup(groupId);
      set({ groups: get().groups.filter(g => g.id !== groupId) });
      await get().loadThreads();
    } catch (err) {
      console.error('Failed to leave group:', err);
      throw err;
    }
  },

  // Commerce
  createProposal: async (data) => {
    try {
      const proposal = await apiHelpers.createProposal(data);
      set({
        proposals: new Map(get().proposals).set(proposal.id, proposal),
      });
      return proposal;
    } catch (err) {
      console.error('Failed to create proposal:', err);
      throw err;
    }
  },

  loadProposal: async (proposalId: string) => {
    try {
      const proposal = await apiHelpers.getProposal(proposalId);
      set({
        proposals: new Map(get().proposals).set(proposal.id, proposal),
      });
      return proposal;
    } catch (err) {
      console.error('Failed to load proposal:', err);
      throw err;
    }
  },

  acceptProposal: async (proposalId: string, promoterId?: string) => {
    try {
      const result = await apiHelpers.checkout({ proposalId, promoterId });
      const proposal = get().proposals.get(proposalId);
      if (proposal) {
        set({
          proposals: new Map(get().proposals).set(proposalId, {
            ...proposal,
            status: 'paid',
          }),
        });
      }
      return result;
    } catch (err) {
      console.error('Failed to accept proposal:', err);
      throw err;
    }
  },

  // Reactions
  toggleReaction: (messageId: string, emoji: string) => {
    const currentProfileId = get().currentProfileId;
    if (!currentProfileId) return;

    // Encontrar a mensagem para verificar se já tem a reação do usuário
    let foundMessage: ChatMessage | undefined;
    let threadId: string | undefined;

    for (const [tid, messages] of get().messages.entries()) {
      foundMessage = messages.find(m => m.id === messageId);
      if (foundMessage) {
        threadId = tid;
        break;
      }
    }

    if (!foundMessage) return;

    const hasReaction = foundMessage.reactionsSummary?.some(
      r => r.emoji === emoji && r.profileIds.includes(currentProfileId)
    );

    const action = hasReaction ? 'remove' : 'add';

    // Optimistic update
    const updatedMessages = get().messages.get(threadId!);
    if (updatedMessages) {
      const newMessages = updatedMessages.map(msg => {
        if (msg.id !== messageId) return msg;

        let newReactionsSummary = [...(msg.reactionsSummary || [])];

        if (action === 'add') {
          const existingReaction = newReactionsSummary.find(r => r.emoji === emoji);
          if (existingReaction) {
            existingReaction.count++;
            existingReaction.profileIds.push(currentProfileId);
          } else {
            newReactionsSummary.push({
              emoji,
              count: 1,
              profileIds: [currentProfileId],
              hasCurrentUser: true,
            });
          }
        } else {
          const existingReaction = newReactionsSummary.find(r => r.emoji === emoji);
          if (existingReaction) {
            existingReaction.count--;
            existingReaction.profileIds = existingReaction.profileIds.filter(
              id => id !== currentProfileId
            );
            if (existingReaction.count === 0) {
              newReactionsSummary = newReactionsSummary.filter(r => r.emoji !== emoji);
            }
          }
        }

        return { ...msg, reactionsSummary: newReactionsSummary };
      });

      set({
        messages: new Map(get().messages).set(threadId!, newMessages),
      });
    }

    // Enviar via WebSocket
    chatWs.send({
      op: 'chat:reaction',
      data: { messageId, emoji, action },
    });
  },

  // Message Edit/Delete
  editMessage: async (messageId: string, newPlaintext: string) => {
    // Encontrar a mensagem e sua thread
    let foundMessage: ChatMessage | undefined;
    let threadId: string | undefined;

    for (const [tid, messages] of get().messages.entries()) {
      foundMessage = messages.find(m => m.id === messageId);
      if (foundMessage) {
        threadId = tid;
        break;
      }
    }

    if (!foundMessage || !threadId) {
      throw new Error('Message not found');
    }

    // Verificar se é o autor da mensagem
    const currentProfileId = get().currentProfileId;
    if (foundMessage.from !== currentProfileId) {
      throw new Error('Not authorized to edit this message');
    }

    // Verificar limite de tempo (15 minutos)
    const fifteenMinutesMs = 15 * 60 * 1000;
    if (Date.now() - foundMessage.createdAt > fifteenMinutesMs) {
      throw new Error('Edit time limit exceeded (15 minutes)');
    }

    // Verificar se é grupo
    const thread = get().threads.find(t => t.id === threadId);
    const isGroup = thread?.kind === 'group';

    // Cifrar texto
    let ciphertext: string;
    if (isGroup) {
      ciphertext = newPlaintext;
    } else {
      try {
        ciphertext = await chatCrypto.encrypt(threadId, newPlaintext);
      } catch (err) {
        throw new Error('Cannot edit message: E2EE session not established');
      }
    }

    // Optimistic update
    const messages = get().messages.get(threadId);
    if (messages) {
      const updatedMessages = messages.map(m => {
        if (m.id === messageId) {
          return { ...m, ciphertext, plaintext: newPlaintext, editedAt: Date.now() };
        }
        return m;
      });

      set({
        messages: new Map(get().messages).set(threadId, updatedMessages),
      });
    }

    // Enviar via WebSocket
    chatWs.sendMessageEdit(messageId, ciphertext);
  },

  deleteMessage: async (messageId: string) => {
    // Encontrar a mensagem e sua thread
    let foundMessage: ChatMessage | undefined;
    let threadId: string | undefined;

    for (const [tid, messages] of get().messages.entries()) {
      foundMessage = messages.find(m => m.id === messageId);
      if (foundMessage) {
        threadId = tid;
        break;
      }
    }

    if (!foundMessage || !threadId) {
      throw new Error('Message not found');
    }

    // Verificar se é o autor da mensagem
    const currentProfileId = get().currentProfileId;
    if (foundMessage.from !== currentProfileId) {
      throw new Error('Not authorized to delete this message');
    }

    // Optimistic update
    const messages = get().messages.get(threadId);
    if (messages) {
      const updatedMessages = messages.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            deletedAt: Date.now(),
            ciphertext: '[deleted]',
            plaintext: undefined,
            mediaCid: undefined,
          };
        }
        return m;
      });

      set({
        messages: new Map(get().messages).set(threadId, updatedMessages),
      });
    }

    // Enviar via WebSocket
    chatWs.sendMessageDelete(messageId);
  },

  // Presence
  loadPresences: async (profileIds: string[]) => {
    if (profileIds.length === 0) return;

    try {
      const response = await apiHelpers.post('/api/chat/presence', { profileIds });
      const presences = response.presences as UserPresence[];

      const newPresences = new Map(get().presences);
      for (const presence of presences) {
        newPresences.set(presence.profileId, presence);
      }

      set({ presences: newPresences });
    } catch (err) {
      console.error('[useChat] Failed to load presences:', err);
    }
  },

  getPresence: (profileId: string) => {
    return get().presences.get(profileId);
  },

  getTotalUnreadCount: () => {
    return get().threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);
  },

  // Block User
  blockProfile: async (profileId: string, reason?: string) => {
    try {
      await apiHelpers.post('/api/chat/blocks', { profileId, reason });
      set({
        blockedProfiles: new Set([...get().blockedProfiles, profileId]),
      });
    } catch (err) {
      console.error('[useChat] Failed to block profile:', err);
      throw err;
    }
  },

  unblockProfile: async (profileId: string) => {
    try {
      await apiHelpers.delete(`/api/chat/blocks/${profileId}`);
      const newBlocked = new Set(get().blockedProfiles);
      newBlocked.delete(profileId);
      set({ blockedProfiles: newBlocked });
    } catch (err) {
      console.error('[useChat] Failed to unblock profile:', err);
      throw err;
    }
  },

  isProfileBlocked: (profileId: string) => {
    return get().blockedProfiles.has(profileId);
  },

  loadBlockedProfiles: async () => {
    try {
      const response = await apiHelpers.get('/api/chat/blocks');
      const blocks = response.blocks || [];
      const blockedIds = blocks.map((b: any) => b.blockedProfile?.id || b.blockedProfile);
      set({ blockedProfiles: new Set(blockedIds) });
    } catch (err) {
      console.error('[useChat] Failed to load blocked profiles:', err);
    }
  },
}));
