import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { chatConfig } from '../../config/env';
import crypto from 'crypto';

class IpfsService {
  private client: IPFSHTTPClient | null = null;

  private getClient(): IPFSHTTPClient {
    if (!this.client) {
      console.log('[IPFS] Initializing client with config:', {
        apiUrl: chatConfig.ipfsApiUrl,
        gatewayUrl: chatConfig.ipfsGatewayUrl,
        timeout: chatConfig.ipfsTimeoutMs,
      });

      this.client = create({
        url: chatConfig.ipfsApiUrl,
        timeout: chatConfig.ipfsTimeoutMs,
      });
    }
    return this.client;
  }

  /**
   * Upload arquivo cifrado para IPFS
   * @param buffer - Buffer do arquivo
   * @param encryptionKey - Chave de cifragem (hex string)
   * @returns CID do arquivo no IPFS
   */
  async uploadEncrypted(buffer: Buffer, encryptionKey: string): Promise<string> {
    try {
      console.log('[IPFS] Starting upload. Buffer size:', buffer.length, 'bytes');

      // Cifrar o buffer
      const encrypted = this.encryptBuffer(buffer, encryptionKey);
      console.log('[IPFS] Buffer encrypted. Encrypted size:', encrypted.length, 'bytes');

      // Upload para IPFS
      const client = this.getClient();
      console.log('[IPFS] Uploading to IPFS...');

      const result = await client.add(encrypted, {
        pin: true,
        cidVersion: 1,
      });

      const cid = result.cid.toString();
      console.log('[IPFS] Upload successful! CID:', cid);
      console.log('[IPFS] Gateway URL:', `${chatConfig.ipfsGatewayUrl}${cid}`);

      return cid;
    } catch (error: any) {
      console.error('[IPFS] ❌ Upload failed:', {
        message: error.message,
        code: error.code,
        type: error.type,
        stack: error.stack?.split('\n').slice(0, 3),
      });
      throw new Error(`Failed to upload media to IPFS: ${error.message}`);
    }
  }

  /**
   * Download e decifra arquivo do IPFS
   * @param cid - CID do arquivo no IPFS
   * @param encryptionKey - Chave de cifragem (hex string)
   * @returns Buffer decifrado
   */
  async getDecrypted(cid: string, encryptionKey: string): Promise<Buffer> {
    try {
      const client = this.getClient();

      // Download do IPFS
      const chunks: Uint8Array[] = [];
      for await (const chunk of client.cat(cid)) {
        chunks.push(chunk);
      }

      const encrypted = Buffer.concat(chunks);

      // Decifrar
      const decrypted = this.decryptBuffer(encrypted, encryptionKey);

      return decrypted;
    } catch (error) {
      console.error('Failed to download from IPFS:', error);
      throw new Error('Failed to download media from IPFS');
    }
  }

  /**
   * Cifra um buffer usando AES-256-GCM
   * @param buffer - Buffer a ser cifrado
   * @param key - Chave hex (32 bytes = 64 chars hex)
   * @returns Buffer cifrado (iv + authTag + ciphertext)
   */
  private encryptBuffer(buffer: Buffer, key: string): Buffer {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Retornar: iv (16) + authTag (16) + ciphertext
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decifra um buffer usando AES-256-GCM
   * @param encrypted - Buffer cifrado (iv + authTag + ciphertext)
   * @param key - Chave hex (32 bytes = 64 chars hex)
   * @returns Buffer decifrado
   */
  private decryptBuffer(encrypted: Buffer, key: string): Buffer {
    const keyBuffer = Buffer.from(key, 'hex');

    // Extrair iv, authTag e ciphertext
    const iv = encrypted.slice(0, 16);
    const authTag = encrypted.slice(16, 32);
    const ciphertext = encrypted.slice(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
  }

  /**
   * Gera uma chave de cifragem aleatória (32 bytes)
   * @returns Chave hex string
   */
  generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export const ipfsService = new IpfsService();
