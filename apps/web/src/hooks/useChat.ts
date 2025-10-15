import { create } from 'zustand';
import { ChatThread, ChatThreadWithParticipants, ChatMessage, MediaMetadata, ChatGroup, Proposal } from '@bazari/shared-types';
import { chatWs } from '../lib/chat/websocket';
import { chatCrypto } from '../lib/chat/crypto';
import { apiHelpers } from '../lib/api';
import { getSessionUser } from '../modules/auth/session';

interface ChatState {
  // State
  threads: ChatThreadWithParticipants[];
  messages: Map<string, ChatMessage[]>;
  groups: ChatGroup[];
  proposals: Map<string, Proposal>;
  activeThreadId: string | null;
  connected: boolean;
  currentProfileId: string | null;

  // Actions
  initialize: (token: string) => Promise<void>;
  loadThreads: () => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, plaintext: string, media?: MediaMetadata) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  createDm: (participantId: string) => Promise<string>;

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
}

export const useChat = create<ChatState>((set, get) => ({
  threads: [],
  messages: new Map(),
  groups: [],
  proposals: new Map(),
  activeThreadId: null,
  connected: false,
  currentProfileId: null,

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

    // 🔐 Registrar chave pública no servidor
    try {
      const publicKey = chatCrypto.getPublicKey();
      await apiHelpers.put('/api/chat/keys', { publicKey });
      console.log('[useChat] Public key registered on server');
    } catch (err) {
      console.error('[useChat] Failed to register public key:', err);
      // Não bloquear inicialização se falhar
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
              console.error('[useChat] ❌ DECRYPTION FAILED - No E2EE session for thread:', message.threadId.slice(0, 8));

            // Tentar criar sessão on-demand
            console.log('[useChat] Attempting to create E2EE session on-demand...');
            try {
              // Buscar a thread
              const thread = get().threads.find(t => t.id === message.threadId);
              if (!thread) {
                console.error('[useChat] Thread not found, cannot create session');
                plaintext = '[⚠️ Mensagem criptografada - Sessão E2EE não estabelecida]';
              } else {
                // Buscar profile ID do usuário atual
                const response = await apiHelpers.getMeProfile();
                const myProfile = response.profile || response;
                const currentProfileId = myProfile.id;

                // Encontrar o outro participante
                const otherParticipantId = thread.participants.find(p => p !== currentProfileId);

                if (otherParticipantId) {
                  // Buscar chave pública do outro participante
                  const keysResponse = await apiHelpers.get(`/api/chat/keys?profileIds=${otherParticipantId}`);
                  const theirPublicKey = keysResponse.keys[otherParticipantId];

                  if (theirPublicKey) {
                    console.log('[useChat] Creating E2EE session on-demand for thread:', message.threadId.slice(0, 8));
                    await chatCrypto.createSession(message.threadId, theirPublicKey);
                    localStorage.setItem('chat_sessions', chatCrypto.exportSessions());

                    // Tentar descriptografar novamente
                    plaintext = await chatCrypto.decrypt(message.threadId, message.ciphertext);
                    console.log('[useChat] ✅ Message decrypted successfully after creating session');
                  } else {
                    console.error('[useChat] No public key found for participant');
                    plaintext = '[⚠️ Mensagem criptografada - Sessão E2EE não estabelecida]';
                  }
                } else {
                  console.error('[useChat] Could not find other participant');
                  plaintext = '[⚠️ Mensagem criptografada - Sessão E2EE não estabelecida]';
                }
              }
              } catch (retryErr) {
                console.error('[useChat] Failed to create session on-demand:', retryErr);
                plaintext = '[⚠️ Mensagem criptografada - Sessão E2EE não estabelecida]';
              }
            }
          }
        }

        const decryptedMessage = { ...message, plaintext };

        // Adicionar mensagem ao state
        const current = get().messages.get(message.threadId) || [];
        set({
          messages: new Map(get().messages).set(message.threadId, [...current, decryptedMessage]),
        });

        // Atualizar thread lastMessageAt
        const threads = get().threads.map(t =>
          t.id === message.threadId
            ? { ...t, lastMessageAt: message.createdAt }
            : t
        );
        set({ threads: threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt) });
      }

      if (msg.op === 'receipt') {
        // Atualizar status da mensagem
        console.log('Receipt:', msg.data);
      }
    });

    // Conectar WS (async, vai notificar via onStatusChange)
    chatWs.connect(token);
  },

  loadThreads: async () => {
    try {
      const response = await apiHelpers.getChatThreads();
      set({ threads: response.threads });

      // 🔐 Re-registrar chave pública (garantir que está no servidor)
      try {
        const publicKey = chatCrypto.getPublicKey();
        console.log('[useChat] Attempting to register public key...', publicKey.substring(0, 20) + '...');
        const result = await apiHelpers.put('/api/chat/keys', { publicKey });
        console.log('[useChat] ✅ Public key re-registered successfully!', result);
      } catch (err) {
        console.error('[useChat] ❌ FAILED to re-register public key:', err);
      }

      // 🔐 Criar sessões E2EE para threads que não têm sessão
      // Buscar Profile ID do usuário atual (thread.participants contém Profile IDs, não User IDs)
      let currentProfileId: string;
      try {
        const response = await apiHelpers.getMeProfile();
        console.log('[useChat] getMeProfile() returned:', response);

        // API retorna { profile: { id, handle, ... } }
        const myProfile = response.profile || response;

        if (!myProfile || !myProfile.id) {
          console.error('[useChat] Profile is missing or has no ID:', myProfile);
          console.warn('[useChat] Skipping E2EE session creation');
          return;
        }

        currentProfileId = myProfile.id;
        console.log(`[useChat] Current profile ID: ${currentProfileId.slice(0, 8)}...`);

        // Armazenar currentProfileId no state para uso em componentes
        set({ currentProfileId });
      } catch (err) {
        console.error('[useChat] Failed to get current profile:', err);
        console.warn('[useChat] Skipping E2EE session creation');
        return;
      }

      console.log(`[useChat] Processing ${response.threads.length} threads for E2EE session creation`);

      for (const thread of response.threads) {
        console.log(`[useChat] Thread ${thread.id.slice(0, 8)}: kind=${thread.kind}, participants=${JSON.stringify(thread.participants)}`);

        // Apenas criar sessão para DMs (por enquanto)
        if (thread.kind !== 'dm') {
          console.log(`[useChat] Skipping E2EE for non-DM thread ${thread.id.slice(0, 8)}...`);
          continue;
        }

        // Sempre recriar sessão (não confiar no cache) para garantir chaves corretas
        if (chatCrypto.hasSession(thread.id)) {
          console.log(`[useChat] Thread ${thread.id.slice(0, 8)} has cached session, will recreate with fresh keys`);
          chatCrypto.deleteSession(thread.id);
        }

        try {
          // Encontrar o outro participante (não o usuário atual)
          console.log(`[useChat] Looking for other participant (not ${currentProfileId}) in:`, thread.participants);
          const otherParticipantId = thread.participants.find(p => p !== currentProfileId);

          if (!otherParticipantId) {
            console.warn(`[useChat] No other participant found for thread ${thread.id}`);
            continue;
          }

          console.log(`[useChat] Other participant: ${otherParticipantId.slice(0, 8)}...`);

          // Buscar chave pública do outro participante
          const keysResponse = await apiHelpers.get(`/api/chat/keys?profileIds=${otherParticipantId}`);
          console.log(`[useChat] Keys response for ${otherParticipantId.slice(0, 8)}:`, keysResponse);
          const theirPublicKey = keysResponse.keys[otherParticipantId];

          if (!theirPublicKey) {
            console.warn(`[useChat] Participant ${otherParticipantId.slice(0, 8)}... has no public key registered`);
            continue;
          }

          console.log(`[useChat] Creating E2EE session for thread ${thread.id.slice(0, 8)}...`);
          // Criar sessão E2EE com chave pública real
          await chatCrypto.createSession(thread.id, theirPublicKey);
          console.log(`[useChat] ✅ E2EE session created for thread ${thread.id.slice(0, 8)}...`);
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

      // Verificar se é grupo (grupos não usam E2EE)
      const thread = get().threads.find(t => t.id === threadId);
      const isGroup = thread?.kind === 'group';

      // Decifrar mensagens
      const decrypted = await Promise.all(
        response.messages.map(async (msg) => {
          if (msg.type === 'text') {
            if (isGroup) {
              // Grupo: ciphertext já é o plaintext
              return { ...msg, plaintext: msg.ciphertext };
            } else {
              // DM: descriptografar E2EE
              try {
                const plaintext = await chatCrypto.decrypt(threadId, msg.ciphertext);
                return { ...msg, plaintext };
              } catch (err) {
                console.error(`[useChat] ❌ Cannot decrypt message ${msg.id.slice(0, 8)} - No E2EE session`);
                return { ...msg, plaintext: '[⚠️ Mensagem criptografada - Sessão E2EE não estabelecida]' };
              }
            }
          }
          return msg;
        })
      );

      // If cursor is provided, prepend to existing messages (infinite scroll)
      // Otherwise, replace messages (initial load)
      const currentMessages = get().messages.get(threadId) || [];
      const newMessages = cursor ? [...decrypted, ...currentMessages] : decrypted;

      set({
        messages: new Map(get().messages).set(threadId, newMessages),
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  },

  sendMessage: async (threadId: string, plaintext: string, media?: MediaMetadata) => {
    try {
      // Verificar se é grupo (grupos não usam E2EE)
      const thread = get().threads.find(t => t.id === threadId);
      const isGroup = thread?.kind === 'group';

      // Cifrar texto apenas para DMs (E2EE)
      let ciphertext = '';
      if (!isGroup) {
        // DM: usar E2EE
        try {
          ciphertext = plaintext ? await chatCrypto.encrypt(threadId, plaintext) : '';
        } catch (err) {
          console.error('[useChat] ❌ ENCRYPTION FAILED - No E2EE session for thread:', threadId.slice(0, 8));
          console.error('[useChat] Cannot send message without E2EE session');
          throw new Error('Cannot send message: E2EE session not established. Please create a new conversation.');
        }
      } else {
        // Grupo: enviar plaintext (sem E2EE)
        ciphertext = plaintext || '';
      }

      // Determinar tipo de mensagem
      const type = media
        ? (media.mimetype.startsWith('image/') ? 'image'
           : media.mimetype.startsWith('video/') ? 'video'
           : media.mimetype.startsWith('audio/') ? 'audio'
           : 'file')
        : 'text';

      // Enviar via WS
      chatWs.send({
        op: 'send',
        data: {
          threadId,
          type,
          ciphertext,
          mediaCid: media?.cid,
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

      // Otimista: adicionar mensagem local
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        threadId,
        from: 'me', // TODO: usar profileId real
        type,
        ciphertext,
        plaintext,
        mediaCid: media?.cid,
        meta: media ? {
          encryptionKey: media.encryptionKey,
          mimetype: media.mimetype,
          filename: media.filename,
          size: media.size,
        } : undefined,
        createdAt: Date.now(),
      } as any;

      const current = get().messages.get(threadId) || [];
      set({
        messages: new Map(get().messages).set(threadId, [...current, tempMessage]),
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

    // Salvar sessões periodicamente
    localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
  },

  createDm: async (participantId: string) => {
    try {
      const thread = await apiHelpers.createChatThread({ participantId, kind: 'dm' });

      // Adicionar à lista
      set({ threads: [thread, ...get().threads] });

      // 🔐 Criar sessão E2EE com chave pública do participante
      try {
        // Buscar chave pública do participante
        console.log(`[useChat] Fetching public key for ${participantId.slice(0, 8)}...`);
        const keysResponse = await apiHelpers.get(`/api/chat/keys?profileIds=${participantId}`);
        const theirPublicKey = keysResponse.keys[participantId];

        if (!theirPublicKey) {
          console.error(`[useChat] ❌ Participant has no public key registered. E2EE will NOT work.`);
          throw new Error('Participant has no public key. Cannot establish E2EE session.');
        }

        // Criar sessão E2EE com chave pública real
        await chatCrypto.createSession(thread.id, theirPublicKey);
        localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
        console.log(`[useChat] ✅ E2EE session created for new DM ${thread.id.slice(0, 8)}...`);
      } catch (err) {
        console.error('[useChat] Failed to create E2EE session:', err);
        // Não bloquear criação da thread, mas avisar
        console.warn('[useChat] ⚠️ DM created WITHOUT E2EE. Messages will fail to encrypt.');
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

      // Adicionar à lista
      set({ groups: [group, ...get().groups] });

      // Carregar threads atualizadas
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

      // Recarregar grupos
      await get().loadGroups();
    } catch (err) {
      console.error('Failed to invite to group:', err);
      throw err;
    }
  },

  leaveGroup: async (groupId: string) => {
    try {
      await apiHelpers.leaveGroup(groupId);

      // Remover da lista
      set({ groups: get().groups.filter(g => g.id !== groupId) });

      // Recarregar threads
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

      // Adicionar ao state
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

      // Adicionar ao state
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

      // Atualizar status da proposta
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
}));
