import { getApi } from './polkadot';

export interface TransferHistoryItem {
  id: string;
  blockNumber: number;
  blockHash: string;
  extrinsicHash: string | null;
  timestamp: number;
  section: 'balances' | 'assets';
  method: string;
  assetId?: string;
  from: string;
  to: string;
  amount: bigint;
  direction: 'in' | 'out';
}

export interface HistoryFetchOptions {
  maxEvents?: number;
  fromBlock?: number;
  maxBlocks?: number;
}

export interface HistoryFetchResult {
  items: TransferHistoryItem[];
  nextFromBlock: number | null;
}

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (value && typeof (value as any).toString === 'function') {
    const raw = (value as any).toString();
    if (/^-?\d+$/.test(raw)) {
      return BigInt(raw);
    }
  }
  return BigInt(0);
}

function isUnknownBlockError(error: unknown) {
  if (!error) {
    return false;
  }
  const message = (error as Error).message || String(error);
  return message.includes('unknown Block') || message.includes('State already discarded');
}

async function extractEvents(
  addressHex: string,
  blockHash: string,
  blockNumber: number
): Promise<TransferHistoryItem[]> {
  const api = await getApi();
  const apiAt = await api.at(blockHash);
  const [events, timestampMoment, block] = await Promise.all([
    apiAt.query.system.events(),
    apiAt.query.timestamp.now(),
    api.rpc.chain.getBlock(blockHash),
  ]);

  const timestamp = Number(timestampMoment.toString());
  const extrinsics = block.block.extrinsics;
  const registry = api.registry;

  const result: TransferHistoryItem[] = [];
  let index = 0;

  (events as any).forEach((record: any) => {
    const { event, phase } = record;
    const section = event.section;
    const method = event.method;

    if (section === 'balances' && method === 'Transfer') {
      const [fromRaw, toRaw, amountRaw] = event.data;
      const fromHex = registry.createType('AccountId', fromRaw).toHex();
      const toHex = registry.createType('AccountId', toRaw).toHex();

      if (fromHex !== addressHex && toHex !== addressHex) {
        index += 1;
        return;
      }

      const extrinsicIndex = phase.isApplyExtrinsic ? phase.asApplyExtrinsic.toNumber() : null;
      const extrinsicHash = extrinsicIndex !== null ? extrinsics[extrinsicIndex]?.hash.toHex?.() ?? null : null;

      result.push({
        id: `${blockNumber}-${index}`,
        blockNumber,
        blockHash,
        extrinsicHash,
        timestamp,
        section: 'balances',
        method,
        from: registry.createType('AccountId', fromRaw).toString(),
        to: registry.createType('AccountId', toRaw).toString(),
        amount: toBigInt(amountRaw),
        direction: fromHex === addressHex ? 'out' : 'in',
      });
      index += 1;
      return;
    }

    if (section === 'assets' && method === 'Transferred') {
      const [assetIdRaw, fromRaw, toRaw, amountRaw] = event.data;
      const fromHex = registry.createType('AccountId', fromRaw).toHex();
      const toHex = registry.createType('AccountId', toRaw).toHex();

      if (fromHex !== addressHex && toHex !== addressHex) {
        index += 1;
        return;
      }

      const extrinsicIndex = phase.isApplyExtrinsic ? phase.asApplyExtrinsic.toNumber() : null;
      const extrinsicHash = extrinsicIndex !== null ? extrinsics[extrinsicIndex]?.hash.toHex?.() ?? null : null;

      result.push({
        id: `${blockNumber}-${index}`,
        blockNumber,
        blockHash,
        extrinsicHash,
        timestamp,
        section: 'assets',
        method,
        assetId: assetIdRaw.toString(),
        from: registry.createType('AccountId', fromRaw).toString(),
        to: registry.createType('AccountId', toRaw).toString(),
        amount: toBigInt(amountRaw),
        direction: fromHex === addressHex ? 'out' : 'in',
      });
      index += 1;
      return;
    }

    index += 1;
  });

  return result;
}

export async function fetchRecentTransfers(
  address: string,
  options: HistoryFetchOptions = {}
): Promise<HistoryFetchResult> {
  const api = await getApi();
  const maxEvents = options.maxEvents ?? 25;
  const maxBlocks = options.maxBlocks ?? maxEvents * 20;
  const header = await api.rpc.chain.getHeader();
  const latestBlockNumber = header.number.toNumber();
  const startBlock = options.fromBlock ?? latestBlockNumber;
  const addressHex = api.registry.createType('AccountId', address).toHex();

  const records: TransferHistoryItem[] = [];
  let nextFrom: number | null = null;
  let blockNumber = startBlock;
  let scannedBlocks = 0;

  while (blockNumber >= 0 && scannedBlocks < maxBlocks && records.length < maxEvents) {
    try {
      const blockHash = (await api.rpc.chain.getBlockHash(blockNumber)).toHex();
      const events = await extractEvents(addressHex, blockHash, blockNumber);
      records.push(...events);
    } catch (error) {
      if (isUnknownBlockError(error)) {
        nextFrom = null;
        blockNumber = -1;
        break;
      }
      throw error;
    }
    blockNumber -= 1;
    scannedBlocks += 1;
  }

  if (nextFrom === null && blockNumber >= 0) {
    nextFrom = blockNumber;
  }

  const nextFromBlock = blockNumber >= 0 ? blockNumber : nextFrom;

  const items = records.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return b.blockNumber - a.blockNumber;
    }
    return b.timestamp - a.timestamp;
  });

  return { items, nextFromBlock };
}

export async function subscribeTransferStream(
  address: string,
  handler: (items: TransferHistoryItem[]) => void
): Promise<() => void> {
  const api = await getApi();
  const addressHex = api.registry.createType('AccountId', address).toHex();
  let latestProcessed = (await api.rpc.chain.getHeader()).number.toNumber();
  let active = true;

  const unsubscribe = await api.rpc.chain.subscribeFinalizedHeads((header: any) => {
    if (!active) {
      return;
    }

    void (async () => {
      try {
        const blockNumber = header.number.toNumber();
        if (blockNumber <= latestProcessed) {
          return;
        }
        latestProcessed = blockNumber;
        const blockHash = header.hash.toHex();
        const events = await extractEvents(addressHex, blockHash, blockNumber);
        if (events.length > 0) {
          handler(events);
        }
      } catch (error) {
        console.error('[wallet] history stream error:', error);
      }
    })();
  });

  return () => {
    active = false;
    try {
      (unsubscribe as unknown as () => void)();
    } catch (error) {
      console.warn('[wallet] failed to unsubscribe history stream:', error);
    }
  };
}
