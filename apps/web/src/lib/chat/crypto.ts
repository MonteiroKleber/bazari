import sodium from 'libsodium-wrappers';

await sodium.ready;

// Simplificação do X3DH + Double Ratchet
// Para produção, usar bibliotecas como @wireapp/proteus ou signal-protocol

export interface ChatKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface ChatSharedSecret {
  sendKey: Uint8Array;
  receiveKey: Uint8Array;
  sendChainKey: Uint8Array;
  receiveChainKey: Uint8Array;
  sendMessageNumber: number;
  receiveMessageNumber: number;
}

class ChatCrypto {
  private keypair: ChatKeyPair | null = null;
  private sessions: Map<string, ChatSharedSecret> = new Map();

  async initialize() {
    console.log('[ChatCrypto] Initializing...');
    await sodium.ready;
    console.log('[ChatCrypto] Sodium ready');

    // Carregar ou gerar keypair
    const stored = localStorage.getItem('chat_keypair');
    if (stored) {
      console.log('[ChatCrypto] Loading existing keypair');
      const data = JSON.parse(stored);
      this.keypair = {
        publicKey: sodium.from_base64(data.publicKey, sodium.base64_variants.ORIGINAL),
        privateKey: sodium.from_base64(data.privateKey, sodium.base64_variants.ORIGINAL),
      };
    } else {
      console.log('[ChatCrypto] Generating new keypair');
      this.keypair = sodium.crypto_box_keypair();
      localStorage.setItem('chat_keypair', JSON.stringify({
        publicKey: sodium.to_base64(this.keypair.publicKey, sodium.base64_variants.ORIGINAL),
        privateKey: sodium.to_base64(this.keypair.privateKey, sodium.base64_variants.ORIGINAL),
      }));
    }
    console.log('[ChatCrypto] Initialized successfully');
  }

  getPublicKey(): string {
    if (!this.keypair) throw new Error('Not initialized');
    // Usar ORIGINAL variant para base64 padrão (+ e / em vez de - e _)
    return sodium.to_base64(this.keypair.publicKey, sodium.base64_variants.ORIGINAL);
  }

  hasSession(threadId: string): boolean {
    return this.sessions.has(threadId);
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  deleteSession(threadId: string): void {
    this.sessions.delete(threadId);
  }

  // DEPRECATED: Para desenvolvimento/debug apenas
  // ⚠️ NÃO USAR! Este método não implementa E2EE real
  // Use createSession(threadId, theirPublicKey) com chaves públicas reais
  async createLocalDevSession(threadId: string) {
    if (!this.keypair) throw new Error('Not initialized');

    console.warn('[ChatCrypto] Creating LOCAL DEV session - NOT SECURE for production!');

    // Derivar chave determinística do threadId (mesmo resultado em ambos os clientes)
    const seed = sodium.crypto_generichash(32, threadId);

    // Usar essa chave como se fosse um shared secret
    const sendKey = seed.slice(0, 32);
    const receiveKey = sodium.crypto_generichash(32, seed);

    this.sessions.set(threadId, {
      sendKey,
      receiveKey,
      sendChainKey: sendKey,
      receiveChainKey: receiveKey,
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
    });

    console.log(`[ChatCrypto] Local dev session created for thread ${threadId.slice(0, 8)}...`);
  }

  async createSession(threadId: string, theirPublicKey: string) {
    if (!this.keypair) throw new Error('Not initialized');

    const theirPubKey = sodium.from_base64(theirPublicKey, sodium.base64_variants.ORIGINAL);

    // Derivar shared secret usando ECDH
    const sharedSecret = sodium.crypto_box_beforenm(theirPubKey, this.keypair.privateKey);

    // Para E2EE simétrico, ambos os lados usam o MESMO shared secret para criptografar e descriptografar
    // Não precisamos de sendKey/receiveKey diferentes - o shared secret já é simétrico!
    const symmetricKey = sharedSecret.slice(0, 32);

    this.sessions.set(threadId, {
      sendKey: symmetricKey,
      receiveKey: symmetricKey,  // Mesma chave para ambos!
      sendChainKey: symmetricKey,
      receiveChainKey: symmetricKey,
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
    });
  }

  async encrypt(threadId: string, plaintext: string): Promise<string> {
    const session = this.sessions.get(threadId);
    if (!session) throw new Error('No session for thread');

    console.log(`[ChatCrypto] Encrypting for thread ${threadId.slice(0, 8)}`);

    // Usar a chave base diretamente (sem ratcheting para MVP)
    // TODO: Implementar ratcheting bidirecional correto com Double Ratchet Algorithm
    const messageKey = session.sendKey;

    // Cifrar
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);

    // Retornar base64: nonce || ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce, 0);
    combined.set(ciphertext, nonce.length);

    const encrypted = sodium.to_base64(combined, sodium.base64_variants.ORIGINAL);
    console.log(`[ChatCrypto] ✅ Encrypted successfully`);
    return encrypted;
  }

  async decrypt(threadId: string, ciphertext: string): Promise<string> {
    const session = this.sessions.get(threadId);
    if (!session) throw new Error('No session for thread');

    console.log(`[ChatCrypto] Decrypting for thread ${threadId.slice(0, 8)}`);

    const combined = sodium.from_base64(ciphertext, sodium.base64_variants.ORIGINAL);
    const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const cipher = combined.slice(sodium.crypto_secretbox_NONCEBYTES);

    // Usar a chave base diretamente (sem ratcheting para MVP)
    const messageKey = session.receiveKey;

    try {
      // Decifrar
      const plaintext = sodium.crypto_secretbox_open_easy(cipher, nonce, messageKey);
      const decrypted = sodium.to_string(plaintext);
      console.log(`[ChatCrypto] ✅ Decrypted successfully: "${decrypted.substring(0, 50)}..."`);
      return decrypted;
    } catch (err) {
      console.error(`[ChatCrypto] ❌ Decryption failed:`, err);
      throw err;
    }
  }

  // Serializar sessões para persistência
  exportSessions(): string {
    const data: any = {};
    for (const [threadId, session] of this.sessions.entries()) {
      data[threadId] = {
        sendKey: sodium.to_base64(session.sendKey, sodium.base64_variants.ORIGINAL),
        receiveKey: sodium.to_base64(session.receiveKey, sodium.base64_variants.ORIGINAL),
        sendChainKey: sodium.to_base64(session.sendChainKey, sodium.base64_variants.ORIGINAL),
        receiveChainKey: sodium.to_base64(session.receiveChainKey, sodium.base64_variants.ORIGINAL),
        sendMessageNumber: session.sendMessageNumber,
        receiveMessageNumber: session.receiveMessageNumber,
      };
    }
    return JSON.stringify(data);
  }

  importSessions(data: string) {
    const parsed = JSON.parse(data);
    for (const [threadId, session] of Object.entries(parsed as any)) {
      this.sessions.set(threadId, {
        sendKey: sodium.from_base64(session.sendKey, sodium.base64_variants.ORIGINAL),
        receiveKey: sodium.from_base64(session.receiveKey, sodium.base64_variants.ORIGINAL),
        sendChainKey: sodium.from_base64(session.sendChainKey, sodium.base64_variants.ORIGINAL),
        receiveChainKey: sodium.from_base64(session.receiveChainKey, sodium.base64_variants.ORIGINAL),
        sendMessageNumber: session.sendMessageNumber,
        receiveMessageNumber: session.receiveMessageNumber,
      });
    }
  }
}

export const chatCrypto = new ChatCrypto();
