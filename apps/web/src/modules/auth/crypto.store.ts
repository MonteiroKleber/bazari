import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'bazari-auth';
const DB_VERSION = 2;

const LEGACY_STORE_NAME = 'vault';
const LEGACY_ACTIVE_KEY = 'active';

const ACCOUNTS_STORE = 'vault_accounts';
const META_STORE = 'vault_meta';
const META_ACTIVE_KEY = 'activeAddress';

const ACCOUNT_VERSION = 1;

export interface VaultAccountRecord {
  id: string;
  address: string;
  name?: string;
  cipher: string;
  iv: string;
  salt: string;
  iterations: number;
  createdAt: string;
  version: number;
}

export interface SaveAccountPayload {
  address: string;
  name?: string;
  cipher: string;
  iv: string;
  salt: string;
  iterations: number;
  version?: number;
}

interface VaultMetaRecord {
  key: typeof META_ACTIVE_KEY;
  value: string;
  updatedAt: string;
}

type RawAccountRecord = Partial<VaultAccountRecord> & {
  cipher: string;
  iv: string;
  salt: string;
  iterations: number;
};

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains(ACCOUNTS_STORE)) {
        db.createObjectStore(ACCOUNTS_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }

      if (oldVersion < 2 && db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        const legacyStore = transaction.objectStore(LEGACY_STORE_NAME);
        const legacyActive = (await legacyStore.get(LEGACY_ACTIVE_KEY)) as RawAccountRecord | undefined;

        if (legacyActive) {
          const normalized = normalizeRecord(legacyActive);
          if (normalized) {
            const accountsStore = transaction.objectStore(ACCOUNTS_STORE);
            await accountsStore.put(normalized);

            const metaStore = transaction.objectStore(META_STORE);
            await metaStore.put({
              key: META_ACTIVE_KEY,
              value: normalized.address,
              updatedAt: new Date().toISOString(),
            } satisfies VaultMetaRecord);
          }
        }

        db.deleteObjectStore(LEGACY_STORE_NAME);
      }
    },
  });
}

function normalizeRecord(record: RawAccountRecord | null | undefined): VaultAccountRecord | null {
  if (!record) {
    return null;
  }

  const candidateId = record.address ?? record.id;
  if (!candidateId) {
    return null;
  }

  return {
    id: candidateId,
    address: candidateId,
    name: record.name,
    cipher: record.cipher,
    iv: record.iv,
    salt: record.salt,
    iterations: record.iterations,
    createdAt: record.createdAt ?? new Date().toISOString(),
    version: record.version ?? ACCOUNT_VERSION,
  };
}

export async function listAccounts(): Promise<VaultAccountRecord[]> {
  const db = await getDb();
  const raw = (await db.getAll(ACCOUNTS_STORE)) as RawAccountRecord[];
  const normalized = raw
    .map((record) => normalizeRecord(record))
    .filter((record): record is VaultAccountRecord => Boolean(record));

  return normalized.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getActiveAccount(): Promise<VaultAccountRecord | null> {
  const db = await getDb();
  const meta = (await db.get(META_STORE, META_ACTIVE_KEY)) as VaultMetaRecord | undefined;
  const address = meta?.value;
  if (!address) {
    return null;
  }

  const record = (await db.get(ACCOUNTS_STORE, address)) as RawAccountRecord | undefined;
  const normalized = normalizeRecord(record);

  if (!normalized) {
    await db.delete(META_STORE, META_ACTIVE_KEY);
    return null;
  }

  return normalized;
}

export async function setActiveAccount(address: string | null): Promise<VaultAccountRecord | null> {
  const db = await getDb();
  const transaction = db.transaction([ACCOUNTS_STORE, META_STORE], 'readwrite');
  const store = transaction.objectStore(ACCOUNTS_STORE);
  const metaStore = transaction.objectStore(META_STORE);

  if (!address) {
    await metaStore.delete(META_ACTIVE_KEY);
    await transaction.done;
    notifySubscribers();
    return null;
  }

  const record = (await store.get(address)) as RawAccountRecord | undefined;
  const normalized = normalizeRecord(record);

  if (!normalized) {
    await transaction.done;
    throw new Error('Active account not found');
  }

  await metaStore.put({
    key: META_ACTIVE_KEY,
    value: normalized.address,
    updatedAt: new Date().toISOString(),
  } satisfies VaultMetaRecord);

  await transaction.done;
  notifySubscribers();
  return normalized;
}

export async function saveAccount(payload: SaveAccountPayload, options: { setActive?: boolean } = {}) {
  const db = await getDb();
  const transaction = db.transaction([ACCOUNTS_STORE, META_STORE], 'readwrite');
  const store = transaction.objectStore(ACCOUNTS_STORE);
  const metaStore = transaction.objectStore(META_STORE);
  const existing = (await store.get(payload.address)) as RawAccountRecord | undefined;
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const record: VaultAccountRecord = {
    id: payload.address,
    address: payload.address,
    name: payload.name ?? existing?.name,
    cipher: payload.cipher,
    iv: payload.iv,
    salt: payload.salt,
    iterations: payload.iterations,
    createdAt,
    version: payload.version ?? existing?.version ?? ACCOUNT_VERSION,
  };

  await store.put(record);

  if (options.setActive ?? true) {
    await metaStore.put({
      key: META_ACTIVE_KEY,
      value: record.address,
      updatedAt: new Date().toISOString(),
    } satisfies VaultMetaRecord);
  }

  await transaction.done;
  notifySubscribers();
  return record;
}

export async function removeAccount(address: string): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction([ACCOUNTS_STORE, META_STORE], 'readwrite');
  const store = transaction.objectStore(ACCOUNTS_STORE);
  const metaStore = transaction.objectStore(META_STORE);
  await store.delete(address);

  const meta = (await metaStore.get(META_ACTIVE_KEY)) as VaultMetaRecord | undefined;
  if (meta?.value === address) {
    const cursor = await store.openCursor();
    if (cursor) {
      const next = normalizeRecord(cursor.value as RawAccountRecord);
      if (next) {
        await metaStore.put({
          key: META_ACTIVE_KEY,
          value: next.address,
          updatedAt: new Date().toISOString(),
        } satisfies VaultMetaRecord);
      } else {
        await metaStore.delete(META_ACTIVE_KEY);
      }
    } else {
      await metaStore.delete(META_ACTIVE_KEY);
    }
  }

  await transaction.done;
  notifySubscribers();
}

export async function clearAllAccounts() {
  const db = await getDb();
  const transaction = db.transaction([ACCOUNTS_STORE, META_STORE], 'readwrite');
  const store = transaction.objectStore(ACCOUNTS_STORE);
  const metaStore = transaction.objectStore(META_STORE);
  await store.clear();
  await metaStore.delete(META_ACTIVE_KEY);
  await transaction.done;
  notifySubscribers();
}

export async function hasAccounts(): Promise<boolean> {
  const db = await getDb();
  const count = await db.count(ACCOUNTS_STORE);
  return count > 0;
}

export async function getEncryptedSeed() {
  return getActiveAccount();
}

export async function saveEncryptedSeed(payload: SaveAccountPayload) {
  return saveAccount(payload);
}

export async function clearEncryptedSeed() {
  return clearAllAccounts();
}

export async function hasEncryptedSeed() {
  return hasAccounts();
}

export function subscribeVault(listener: Subscriber) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
type Subscriber = () => void;

const subscribers = new Set<Subscriber>();

function notifySubscribers() {
  subscribers.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[auth] vault subscriber error:', error);
    }
  });
}
