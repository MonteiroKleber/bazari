/**
 * Storage Handlers - Handle SDK storage-related messages
 * Provides app-specific localStorage with isolation
 */

const STORAGE_PREFIX = 'bazari_app_storage';
const MAX_KEY_LENGTH = 256;
const MAX_VALUE_SIZE = 1024 * 1024; // 1MB per value
const MAX_KEYS_PER_APP = 1000;

interface StoragePayload {
  key: string;
  value?: unknown;
}

/**
 * Get storage key for an app
 */
function getStorageKey(appId: string, key: string): string {
  return `${STORAGE_PREFIX}:${appId}:${key}`;
}

/**
 * Get all keys for an app
 */
function getAppKeys(appId: string): string[] {
  const prefix = `${STORAGE_PREFIX}:${appId}:`;
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      keys.push(key.slice(prefix.length));
    }
  }

  return keys;
}

/**
 * Validate key
 */
function validateKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid key: must be a non-empty string');
  }

  if (key.length > MAX_KEY_LENGTH) {
    throw new Error(`Key too long: max ${MAX_KEY_LENGTH} characters`);
  }

  // Prevent path traversal
  if (key.includes('..') || key.includes('/') || key.includes('\\')) {
    throw new Error('Invalid key: contains forbidden characters');
  }
}

/**
 * Handler for storage:get
 * Retrieves a value from app storage
 */
export async function handleStorageGet(
  appId: string,
  payload: unknown
): Promise<unknown> {
  const { key } = payload as StoragePayload;
  validateKey(key);

  try {
    const storageKey = getStorageKey(appId, key);
    const raw = localStorage.getItem(storageKey);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      // Return as string if not valid JSON
      return raw;
    }
  } catch (error) {
    console.error('[storage-handler] Get error:', error);
    throw new Error('Failed to read from storage');
  }
}

/**
 * Handler for storage:set
 * Stores a value in app storage
 */
export async function handleStorageSet(
  appId: string,
  payload: unknown
): Promise<{ success: boolean }> {
  const { key, value } = payload as StoragePayload;
  validateKey(key);

  if (value === undefined) {
    throw new Error('Invalid value: cannot be undefined');
  }

  // Check key limit
  const existingKeys = getAppKeys(appId);
  const storageKey = getStorageKey(appId, key);
  const isNewKey = !existingKeys.includes(key);

  if (isNewKey && existingKeys.length >= MAX_KEYS_PER_APP) {
    throw new Error(`Storage limit reached: max ${MAX_KEYS_PER_APP} keys per app`);
  }

  try {
    const serialized = JSON.stringify(value);

    // Check size limit
    if (serialized.length > MAX_VALUE_SIZE) {
      throw new Error(`Value too large: max ${MAX_VALUE_SIZE / 1024}KB`);
    }

    localStorage.setItem(storageKey, serialized);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded');
    }
    console.error('[storage-handler] Set error:', error);
    throw new Error('Failed to write to storage');
  }
}

/**
 * Handler for storage:remove
 * Removes a value from app storage
 */
export async function handleStorageRemove(
  appId: string,
  payload: unknown
): Promise<{ success: boolean }> {
  const { key } = payload as StoragePayload;
  validateKey(key);

  try {
    const storageKey = getStorageKey(appId, key);
    localStorage.removeItem(storageKey);
    return { success: true };
  } catch (error) {
    console.error('[storage-handler] Remove error:', error);
    throw new Error('Failed to remove from storage');
  }
}

/**
 * Handler for storage:clear
 * Removes all values for the app
 */
export async function handleStorageClear(
  appId: string,
  _payload: unknown
): Promise<{ success: boolean; keysRemoved: number }> {
  try {
    const keys = getAppKeys(appId);
    let removed = 0;

    for (const key of keys) {
      const storageKey = getStorageKey(appId, key);
      localStorage.removeItem(storageKey);
      removed++;
    }

    return { success: true, keysRemoved: removed };
  } catch (error) {
    console.error('[storage-handler] Clear error:', error);
    throw new Error('Failed to clear storage');
  }
}

/**
 * Handler for storage:keys
 * Lists all keys for the app
 */
export async function handleStorageKeys(
  appId: string,
  _payload: unknown
): Promise<string[]> {
  try {
    return getAppKeys(appId);
  } catch (error) {
    console.error('[storage-handler] Keys error:', error);
    throw new Error('Failed to list storage keys');
  }
}

/**
 * Get storage usage for an app
 */
export function getAppStorageUsage(appId: string): {
  keyCount: number;
  estimatedSize: number;
} {
  const prefix = `${STORAGE_PREFIX}:${appId}:`;
  let keyCount = 0;
  let estimatedSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      keyCount++;
      const value = localStorage.getItem(key);
      if (value) {
        estimatedSize += key.length + value.length;
      }
    }
  }

  return { keyCount, estimatedSize };
}
