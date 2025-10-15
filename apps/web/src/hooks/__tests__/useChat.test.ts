import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../useChat';
import { chatWs } from '../../lib/chat/websocket';
import { chatCrypto } from '../../lib/chat/crypto';
import { apiHelpers } from '../../lib/api';

// Mock dependencies
vi.mock('../../lib/chat/websocket', () => ({
  chatWs: {
    connect: vi.fn(),
    onMessage: vi.fn(() => () => {}),
    send: vi.fn(),
  },
}));

vi.mock('../../lib/chat/crypto', () => ({
  chatCrypto: {
    initialize: vi.fn(),
    importSessions: vi.fn(),
    exportSessions: vi.fn(() => '{}'),
    encrypt: vi.fn((threadId, text) => Promise.resolve(`encrypted:${text}`)),
    decrypt: vi.fn((threadId, cipher) => Promise.resolve(cipher.replace('encrypted:', ''))),
    createSession: vi.fn(),
  },
}));

vi.mock('../../lib/api', () => ({
  apiHelpers: {
    getChatThreads: vi.fn(),
    getChatMessages: vi.fn(),
    createChatThread: vi.fn(),
    getChatGroups: vi.fn(),
    createChatGroup: vi.fn(),
    inviteToGroup: vi.fn(),
    leaveGroup: vi.fn(),
    createProposal: vi.fn(),
    getProposal: vi.fn(),
    checkout: vi.fn(),
  },
}));

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useChat.setState({
      threads: [],
      messages: new Map(),
      groups: [],
      proposals: new Map(),
      activeThreadId: null,
      connected: false,
    });
  });

  describe('initialize', () => {
    it('should initialize crypto and websocket connection', async () => {
      const { result } = renderHook(() => useChat());

      vi.mocked(apiHelpers.getChatThreads).mockResolvedValue({
        threads: [],
        nextCursor: null,
      });

      await act(async () => {
        await result.current.initialize('test_token');
      });

      expect(chatCrypto.initialize).toHaveBeenCalled();
      expect(chatWs.connect).toHaveBeenCalledWith('test_token');
      expect(result.current.connected).toBe(true);
    });

    it('should load threads on initialization', async () => {
      const { result } = renderHook(() => useChat());

      const mockThreads = [
        { id: 'thread_1', kind: 'dm', participants: ['user1', 'user2'], lastMessageAt: Date.now() },
      ];

      vi.mocked(apiHelpers.getChatThreads).mockResolvedValue({
        threads: mockThreads,
        nextCursor: null,
      });

      await act(async () => {
        await result.current.initialize('test_token');
      });

      expect(result.current.threads).toEqual(mockThreads);
    });
  });

  describe('loadMessages', () => {
    it('should load and decrypt messages', async () => {
      const { result } = renderHook(() => useChat());

      const mockMessages = [
        {
          id: 'msg_1',
          threadId: 'thread_1',
          from: 'user1',
          type: 'text',
          ciphertext: 'encrypted:Hello',
          createdAt: Date.now(),
        },
        {
          id: 'msg_2',
          threadId: 'thread_1',
          from: 'user2',
          type: 'text',
          ciphertext: 'encrypted:World',
          createdAt: Date.now(),
        },
      ];

      vi.mocked(apiHelpers.getChatMessages).mockResolvedValue({
        messages: mockMessages as any,
        nextCursor: null,
      });

      await act(async () => {
        await result.current.loadMessages('thread_1');
      });

      const messages = result.current.messages.get('thread_1');
      expect(messages).toHaveLength(2);
      expect(messages?.[0].plaintext).toBe('Hello');
      expect(messages?.[1].plaintext).toBe('World');
    });

    it('should prepend messages when cursor is provided (infinite scroll)', async () => {
      const { result } = renderHook(() => useChat());

      // Initial messages
      useChat.setState({
        messages: new Map([
          [
            'thread_1',
            [
              { id: 'msg_3', threadId: 'thread_1', plaintext: 'Recent', createdAt: 300 } as any,
            ],
          ],
        ]),
      });

      // Older messages
      const olderMessages = [
        {
          id: 'msg_1',
          threadId: 'thread_1',
          from: 'user1',
          type: 'text',
          ciphertext: 'encrypted:Old1',
          createdAt: 100,
        },
        {
          id: 'msg_2',
          threadId: 'thread_1',
          from: 'user2',
          type: 'text',
          ciphertext: 'encrypted:Old2',
          createdAt: 200,
        },
      ];

      vi.mocked(apiHelpers.getChatMessages).mockResolvedValue({
        messages: olderMessages as any,
        nextCursor: null,
      });

      await act(async () => {
        await result.current.loadMessages('thread_1', 100);
      });

      const messages = result.current.messages.get('thread_1');
      expect(messages).toHaveLength(3);
      expect(messages?.[0].id).toBe('msg_1'); // Older messages prepended
      expect(messages?.[1].id).toBe('msg_2');
      expect(messages?.[2].id).toBe('msg_3'); // Original message
    });
  });

  describe('sendMessage', () => {
    it('should encrypt and send text message', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendMessage('thread_1', 'Hello World');
      });

      expect(chatCrypto.encrypt).toHaveBeenCalledWith('thread_1', 'Hello World');
      expect(chatWs.send).toHaveBeenCalledWith({
        op: 'send',
        data: expect.objectContaining({
          threadId: 'thread_1',
          type: 'text',
          ciphertext: 'encrypted:Hello World',
        }),
      });
    });

    it('should send message with media attachment', async () => {
      const { result } = renderHook(() => useChat());

      const media = {
        cid: 'QmTest',
        encryptionKey: 'key123',
        mimetype: 'image/jpeg',
        filename: 'test.jpg',
        size: 12345,
      };

      await act(async () => {
        await result.current.sendMessage('thread_1', 'Check this out', media);
      });

      expect(chatWs.send).toHaveBeenCalledWith({
        op: 'send',
        data: expect.objectContaining({
          threadId: 'thread_1',
          type: 'image',
          mediaCid: 'QmTest',
          meta: expect.objectContaining({
            mimetype: 'image/jpeg',
            filename: 'test.jpg',
          }),
        }),
      });
    });

    it('should add optimistic message to state', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendMessage('thread_1', 'Optimistic message');
      });

      const messages = result.current.messages.get('thread_1');
      expect(messages).toHaveLength(1);
      expect(messages?.[0].plaintext).toBe('Optimistic message');
      expect(messages?.[0].id).toMatch(/^temp-/);
    });
  });

  describe('createDm', () => {
    it('should create DM thread and session', async () => {
      const { result } = renderHook(() => useChat());

      const mockThread = {
        id: 'thread_new',
        kind: 'dm',
        participants: ['user1', 'user2'],
        lastMessageAt: Date.now(),
      };

      vi.mocked(apiHelpers.createChatThread).mockResolvedValue(mockThread);

      let threadId: string = '';
      await act(async () => {
        threadId = await result.current.createDm('user2');
      });

      expect(threadId).toBe('thread_new');
      expect(result.current.threads).toContainEqual(mockThread);
      expect(chatCrypto.createSession).toHaveBeenCalled();
    });
  });

  describe('proposals', () => {
    it('should create proposal', async () => {
      const { result } = renderHook(() => useChat());

      const mockProposal = {
        id: 'proposal_1',
        threadId: 'thread_1',
        sellerId: 'seller_1',
        status: 'sent',
        items: [],
        total: '100.00',
      };

      vi.mocked(apiHelpers.createProposal).mockResolvedValue(mockProposal as any);

      let proposal: any;
      await act(async () => {
        proposal = await result.current.createProposal({
          threadId: 'thread_1',
          items: [],
          total: '100.00',
        });
      });

      expect(proposal).toEqual(mockProposal);
      expect(result.current.proposals.get('proposal_1')).toEqual(mockProposal);
    });

    it('should accept proposal and update status', async () => {
      const { result } = renderHook(() => useChat());

      // Set initial proposal
      const mockProposal = {
        id: 'proposal_1',
        status: 'sent',
      };

      useChat.setState({
        proposals: new Map([['proposal_1', mockProposal as any]]),
      });

      vi.mocked(apiHelpers.checkout).mockResolvedValue({
        saleId: 'sale_1',
        txHash: '0xMock',
      } as any);

      await act(async () => {
        await result.current.acceptProposal('proposal_1');
      });

      const updatedProposal = result.current.proposals.get('proposal_1');
      expect(updatedProposal?.status).toBe('paid');
    });
  });
});
