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
  return {
    cipher: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    iterations: PBKDF2_ITERATIONS,
  };
}

export async function decryptMnemonic(
  cipher: string,
  ivB64: string,
  saltB64: string,
  pin: string,
  iterations = PBKDF2_ITERATIONS
) {
  const iv = fromBase64(ivB64);
  const salt = fromBase64(saltB64);
  const key = await deriveKey(pin, salt, iterations);
  const cipherBytes = fromBase64(cipher);
  const clearBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes.buffer as ArrayBuffer
  );
  return textDecoder.decode(clearBuffer);
}

export function wipeBytes(data: Uint8Array) {
  data.fill(0);
}
