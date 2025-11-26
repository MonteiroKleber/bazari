import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'node:crypto';
import { oauthConfig } from '../../config/oauth.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  authTag: string;
}

/**
 * Criptografa um mnemonic usando AES-256-GCM
 * @param mnemonic - Mnemonic em texto plano (12 palavras separadas por espaço)
 * @returns Dados criptografados
 */
export function encryptMnemonic(mnemonic: string): EncryptedData {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derivar chave usando PBKDF2 com salt
  const key = pbkdf2Sync(
    oauthConfig.encryption.key,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Descriptografa um mnemonic usando AES-256-GCM
 * @param data - Dados criptografados
 * @returns Mnemonic em texto plano
 */
export function decryptMnemonic(data: EncryptedData): string {
  const salt = Buffer.from(data.salt, 'hex');
  const iv = Buffer.from(data.iv, 'hex');
  const authTag = Buffer.from(data.authTag, 'hex');

  // Derivar mesma chave usando salt armazenado
  const key = pbkdf2Sync(
    oauthConfig.encryption.key,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Valida se um mnemonic descriptografado está no formato correto
 * @param mnemonic - Mnemonic para validar
 * @returns true se válido, false caso contrário
 */
export function validateMnemonic(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);

  // BIP39 suporta 12, 15, 18, 21 ou 24 palavras
  // Bazari usa 12 palavras
  if (words.length !== 12) {
    return false;
  }

  // Verificar se todas as palavras são lowercase e alfanuméricas
  return words.every(word => /^[a-z]+$/.test(word));
}

/**
 * Re-criptografa um mnemonic com PIN do usuário (para OAuth flow)
 * @param mnemonic - Mnemonic em texto plano
 * @param pinHash - Hash SHA-256 do PIN (64 caracteres hex)
 * @returns Dados criptografados com PIN
 */
export function encryptMnemonicWithPin(mnemonic: string, pinHash: string): EncryptedData {
  // Validar pinHash (deve ser 64 caracteres hex - SHA-256)
  if (!/^[a-f0-9]{64}$/i.test(pinHash)) {
    throw new Error('Invalid PIN hash format');
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derivar chave usando PIN hash (150.000 iterações para match com frontend)
  const key = pbkdf2Sync(
    pinHash,
    salt,
    150000, // Same iterations as frontend (crypto.utils.ts)
    KEY_LENGTH,
    'sha256'
  );

  const cipher = createCipheriv(ALGORITHM, key, iv);

  // IMPORTANTE: Usar base64 para compatibilidade com frontend decryptMnemonic
  let encrypted = cipher.update(mnemonic, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}
