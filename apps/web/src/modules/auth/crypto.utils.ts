const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const PBKDF2_ITERATIONS = 150_000;
export const KEY_LENGTH = 256;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function fromHex(value: string): Uint8Array {
  const cleaned = value.trim();
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(pin: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMnemonic(mnemonic: string, pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const data = textEncoder.encode(mnemonic);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  // AES-GCM retorna: [ciphertext][authTag(16 bytes)]
  const encrypted = new Uint8Array(cipherBuffer);
  const authTagLength = 16; // AES-GCM padrão = 128 bits = 16 bytes

  const ciphertext = encrypted.slice(0, encrypted.length - authTagLength);
  const authTag = encrypted.slice(encrypted.length - authTagLength);

  return {
    cipher: toBase64(ciphertext),
    iv: toBase64(iv),
    salt: toBase64(salt),
    authTag: toBase64(authTag),
    iterations: PBKDF2_ITERATIONS,
  };
}

export async function decryptMnemonic(
  cipher: string,
  ivB64: string,
  saltB64: string,
  pin: string,
  authTagB64?: string,
  iterations = PBKDF2_ITERATIONS
) {
  const iv = fromBase64(ivB64);
  const salt = fromBase64(saltB64);
  const key = await deriveKey(pin, salt, iterations);
  const cipherBytes = fromBase64(cipher);

  let fullCipher: Uint8Array;

  if (authTagB64) {
    // Novo formato: authTag separado
    const authTag = fromBase64(authTagB64);
    fullCipher = new Uint8Array(cipherBytes.length + authTag.length);
    fullCipher.set(cipherBytes);
    fullCipher.set(authTag, cipherBytes.length);
  } else {
    // Formato legado: authTag já incluído no cipher
    fullCipher = cipherBytes;
  }

  const clearBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fullCipher.buffer as ArrayBuffer
  );
  return textDecoder.decode(clearBuffer);
}

export function wipeBytes(data: Uint8Array) {
  data.fill(0);
}

/**
 * Descriptografa suportando base64 (padrão) ou hex (legado social)
 * Útil para contas OAuth antigas que foram persistidas com hex.
 */
export async function decryptMnemonicFlexible(
  cipher: string,
  iv: string,
  salt: string,
  pin: string,
  iterations = PBKDF2_ITERATIONS,
  authTag?: string
) {
  const isHex = /^[0-9a-f]+$/i.test(cipher) && /^[0-9a-f]+$/i.test(iv) && /^[0-9a-f]+$/i.test(salt);

  // Se veio authTag separado (formato backend), precisamos recompor cipher+tag para WebCrypto
  const hasSeparateTag = Boolean(authTag);

  if (!isHex && !hasSeparateTag) {
    // Caminho padrão base64 sem tag separada
    return decryptMnemonic(cipher, iv, salt, pin, iterations);
  }

  // Escolher decodificador conforme formato
  const decode = isHex ? fromHex : fromBase64;

  const ivBytes = decode(iv);
  const saltBytes = decode(salt);
  const key = await deriveKey(pin, saltBytes, iterations);

  // Se tag veio separado, concatenar cipher + authTag (ambos já decodificados)
  let cipherBytes: Uint8Array;
  if (hasSeparateTag && authTag) {
    const cipherPart = decode(cipher);
    const tagPart = decode(authTag);
    cipherBytes = new Uint8Array(cipherPart.length + tagPart.length);
    cipherBytes.set(cipherPart, 0);
    cipherBytes.set(tagPart, cipherPart.length);
  } else {
    cipherBytes = decode(cipher);
  }

  const clearBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    cipherBytes.buffer as ArrayBuffer
  );
  return textDecoder.decode(clearBuffer);
}

/**
 * Gera hash SHA-256 do PIN para enviar ao backend
 * @param pin - PIN de 4-6 dígitos
 * @returns Hash SHA-256 em formato hexadecimal (64 caracteres)
 */
export async function hashPin(pin: string): Promise<string> {
  const data = textEncoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
