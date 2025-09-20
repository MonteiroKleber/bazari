import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveAccount,
  listAccounts,
  getActiveAccount,
  setActiveAccount,
  removeAccount,
  clearAllAccounts,
  subscribeVault,
} from './crypto.store';

async function resetDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('bazari-auth');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const baseRecord = {
  cipher: 'cipher',
  iv: 'iv',
  salt: 'salt',
  iterations: 1,
};

describe('crypto.store multi-account vault', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('saves an account and sets it active by default', async () => {
    await saveAccount({ address: 'addr-1', ...baseRecord });

    const accounts = await listAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].address).toBe('addr-1');

    const active = await getActiveAccount();
    expect(active?.address).toBe('addr-1');
  });

  it('switches active account explicitly', async () => {
    await saveAccount({ address: 'addr-1', ...baseRecord });
    await saveAccount({ address: 'addr-2', ...baseRecord }, { setActive: false });

    await setActiveAccount('addr-2');
    const active = await getActiveAccount();
    expect(active?.address).toBe('addr-2');
  });

  it('removes accounts and promotes the next stored account', async () => {
    await saveAccount({ address: 'addr-1', ...baseRecord });
    await saveAccount({ address: 'addr-2', ...baseRecord });
    await saveAccount({ address: 'addr-3', ...baseRecord }, { setActive: false });

    await removeAccount('addr-2');
    const accounts = await listAccounts();
    expect(accounts.map((entry) => entry.address)).toEqual(['addr-3', 'addr-1']);

    const active = await getActiveAccount();
    expect(active?.address).toBe('addr-1');
  });

  it('clears all accounts and active pointer', async () => {
    await saveAccount({ address: 'addr-1', ...baseRecord });
    await clearAllAccounts();

    const accounts = await listAccounts();
    expect(accounts).toHaveLength(0);
    const active = await getActiveAccount();
    expect(active).toBeNull();
  });

  it('notifies subscribers when vault changes', async () => {
    const events: number[] = [];
    const unsubscribe = subscribeVault(() => {
      events.push(Date.now());
    });

    await saveAccount({ address: 'addr-1', ...baseRecord });
    await saveAccount({ address: 'addr-2', ...baseRecord });

    expect(events.length).toBeGreaterThanOrEqual(2);
    unsubscribe();
  });
});
