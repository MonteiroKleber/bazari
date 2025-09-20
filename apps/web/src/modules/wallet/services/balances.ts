import { getApi, getChainProps } from './polkadot';
import type { AssetMetadata } from './assets';

export interface BalanceSnapshot {
  assetId: string;
  symbol: string;
  decimals: number;
  free: bigint;
  reserved: bigint;
  frozen: bigint;
  updatedAt: number;
}

const NATIVE_ASSET_ID = 'native';

function toAmount(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (!value || typeof (value as any).toString !== 'function') {
    return 0n;
  }

  try {
    const raw = (value as any).toString();
    return raw ? BigInt(raw) : 0n;
  } catch (error) {
    console.warn('[wallet] Failed to convert balance amount:', error);
    return 0n;
  }
}

function extractAccountData(account: any) {
  const base = account?.data ?? account ?? {};
  const free = toAmount(base?.free);
  const reserved = toAmount(base?.reserved);
  const miscFrozen = toAmount(base?.miscFrozen ?? base?.frozen);
  const feeFrozen = toAmount(base?.feeFrozen ?? base?.frozen);
  const frozen = miscFrozen > feeFrozen ? miscFrozen : feeFrozen;

  return { free, reserved, frozen };
}

export async function getNativeBalance(address: string): Promise<BalanceSnapshot> {
  const api = await getApi();
  const { tokenSymbol, tokenDecimals } = await getChainProps();
  const account = await api.query.system.account(address as any);
  const { free, reserved, frozen } = extractAccountData(account);

  return {
    assetId: NATIVE_ASSET_ID,
    symbol: tokenSymbol,
    decimals: tokenDecimals,
    free,
    reserved,
    frozen,
    updatedAt: Date.now(),
  };
}

export async function subscribeNativeBalance(
  address: string,
  callback: (balance: BalanceSnapshot) => void
): Promise<() => void> {
  const api = await getApi();
  const { tokenSymbol, tokenDecimals } = await getChainProps();

  const unsubscribe = await api.query.system.account(address as any, (account: any) => {
    const { free, reserved, frozen } = extractAccountData(account);

    callback({
      assetId: NATIVE_ASSET_ID,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      free,
      reserved,
      frozen,
      updatedAt: Date.now(),
    });
  });

  return () => {
    try {
      (unsubscribe as unknown as () => void)();
    } catch (error) {
      console.warn('[wallet] Failed to unsubscribe native balance listener:', error);
    }
  };
}

export async function getAssetBalance(
  assetId: string | number | bigint,
  address: string,
  metadata?: AssetMetadata
): Promise<BalanceSnapshot | null> {
  const api = await getApi();
  const id = assetId.toString();
  const assetAccount: any = await api.query.assets.account(id, address);

  if (assetAccount.isNone) {
    return null;
  }

  const accountData = assetAccount.unwrap();

  const info = metadata ?? {
    assetId: id,
    symbol: `#${id}`,
    decimals: 0,
  };

  const free = toAmount(accountData.balance);
  const frozen = accountData.isFrozen?.isTrue ? free : 0n;

  return {
    assetId: id,
    symbol: info.symbol,
    decimals: info.decimals,
    free,
    reserved: BigInt(0),
    frozen,
    updatedAt: Date.now(),
  };
}

export async function subscribeAssetBalance(
  assetId: string | number | bigint,
  address: string,
  metadata: AssetMetadata,
  callback: (balance: BalanceSnapshot | null) => void
): Promise<() => void> {
  const api = await getApi();
  const id = assetId.toString();

  const unsubscribe = await api.query.assets.account(id, address, (account: any) => {
    if (account.isNone) {
      callback(null);
      return;
    }

    const accountData = account.unwrap();
    const free = toAmount(accountData.balance);
    const frozen = accountData.isFrozen?.isTrue ? free : 0n;

    callback({
      assetId: id,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      free,
      reserved: BigInt(0),
      frozen,
      updatedAt: Date.now(),
    });
  });

  return () => {
    try {
      (unsubscribe as unknown as () => void)();
    } catch (error) {
      console.warn('[wallet] Failed to unsubscribe asset balance listener:', error);
    }
  };
}
