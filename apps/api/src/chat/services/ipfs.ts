import { uploadToIpfs, downloadFromIpfs } from '../../lib/ipfs.js';
import crypto from 'crypto';

class IpfsService {
  /**
   * Upload arquivo cifrado para IPFS
   * @param buffer - Buffer do arquivo
   * @param encryptionKey - Chave de cifragem (hex string)
   * @returns CID do arquivo no IPFS
   */
  async uploadEncrypted(buffer: Buffer, encryptionKey: string): Promise<string> {
    try {
      console.log('[IPFS] Starting encrypted upload. Buffer size:', buffer.length, 'bytes');

      // Cifrar o buffer
      const encrypted = this.encryptBuffer(buffer, encryptionKey);
      console.log('[IPFS] Buffer encrypted. Encrypted size:', encrypted.length, 'bytes');

      // Upload para IPFS usando pool (com failover e retry)
      console.log('[IPFS] Uploading to IPFS...');
      const cid = await uploadToIpfs(encrypted, { filename: 'encrypted-media' });

      console.log('[IPFS] ✅ Encrypted upload successful! CID:', cid);

      return cid;
    } catch (error: any) {
      console.error('[IPFS] ❌ Encrypted upload failed:', {
        message: error.message,
        code: error.code,
        type: error.type,
        stack: error.stack?.split('\n').slice(0, 3),
      });
      throw new Error(`Failed to upload encrypted media to IPFS: ${error.message}`);
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
      console.log('[IPFS] Downloading encrypted file:', cid);

      // Download do IPFS usando pool (com failover)
      const encrypted = await downloadFromIpfs(cid);

      console.log('[IPFS] Downloaded encrypted file. Size:', encrypted.length, 'bytes');

      // Decifrar
      const decrypted = this.decryptBuffer(Buffer.from(encrypted), encryptionKey);

      console.log('[IPFS] ✅ Decrypted file. Size:', decrypted.length, 'bytes');

      return decrypted;
    } catch (error) {
      console.error('[IPFS] ❌ Failed to download/decrypt from IPFS:', error);
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
