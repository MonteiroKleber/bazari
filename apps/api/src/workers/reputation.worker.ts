import { PrismaClient, Prisma } from '@prisma/client';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import type { ApiPromise, SubmittableResult } from '@polkadot/api';
import { createRequire } from 'module';
import { env } from '../env.js';
import { getStore, getStoresApi } from '../lib/storesChain.js';

type Logger = {
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
  debug?: (...args: any[]) => void;
};

export interface ReputationSnapshot {
  sales: bigint;
  positive: bigint;
  negative: bigint;
  volumePlanck: bigint;
}

export interface ReputationSyncEntry {
  storeId: string;
  onChainStoreId: string;
  totals: ReputationSnapshot;
  delta: ReputationSnapshot;
  action: 'updated' | 'skipped' | 'noop' | 'error';
  reason?: string;
}

export interface ReputationSyncResult {
  processed: number;
  updated: number;
  skipped: number;
  noops: number;
  errors: number;
  details: ReputationSyncEntry[];
}

export interface ReputationChainAdapter {
  fetch(storeId: string): Promise<ReputationSnapshot | null>;
  bump(storeId: string, delta: ReputationSnapshot): Promise<void>;
}

interface ReputationWorkerRunOptions {
  chainAdapter?: ReputationChainAdapter;
  logger?: Logger;
  dryRun?: boolean;
}

export interface StartReputationWorkerOptions {
  intervalMs?: number;
  logger?: Logger;
  chainAdapter?: ReputationChainAdapter;
  runImmediately?: boolean;
}

function decimalToBigInt(value: Prisma.Decimal | null | undefined): bigint {
  if (!value) return 0n;
  try {
    return BigInt(value.toString());
  } catch {
    return 0n;
  }
}

function numberToBigInt(value: number | null | undefined): bigint {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0n;
  }
  return BigInt(Math.floor(value));
}

function diff(current: bigint, existing: bigint): bigint {
  return current > existing ? current - existing : 0n;
}

export function estimateFeedbackBuckets(ratingAvg: number | null | undefined, ratingCount: number | null | undefined): { positive: bigint; negative: bigint } {
  const count = typeof ratingCount === 'number' && Number.isFinite(ratingCount) && ratingCount > 0
    ? Math.floor(ratingCount)
    : 0;
  if (count <= 0) {
    return { positive: 0n, negative: 0n };
  }
  const clampedAvg = typeof ratingAvg === 'number' && Number.isFinite(ratingAvg)
    ? Math.min(5, Math.max(0, ratingAvg))
    : 0;
  const positiveApprox = Math.round((clampedAvg / 5) * count);
  const normalizedPositive = Math.min(count, Math.max(0, positiveApprox));
  const negative = count - normalizedPositive;
  return { positive: BigInt(normalizedPositive), negative: BigInt(negative) };
}

async function aggregateOrderStats(prisma: PrismaClient, sellerIds: string[]): Promise<Map<string, { sales: bigint; volumePlanck: bigint }>> {
  const result = new Map<string, { sales: bigint; volumePlanck: bigint }>();
  if (sellerIds.length === 0) {
    return result;
  }

  const rows = await prisma.order.groupBy({
    by: ['sellerStoreId'],
    where: {
      sellerStoreId: { in: sellerIds },
      status: 'RELEASED',
    },
    _count: { _all: true },
    _sum: { totalBzr: true },
  } as any);

  for (const row of rows) {
    const storeId = (row as any).sellerStoreId as string | null;
    if (!storeId) continue;
    const count = BigInt((row as any)._count?._all ?? 0);
    const volume = decimalToBigInt((row as any)._sum?.totalBzr ?? null);
    result.set(storeId, { sales: count, volumePlanck: volume });
  }

  return result;
}

class DefaultChainAdapter implements ReputationChainAdapter {
  private apiPromise: Promise<ApiPromise> | null = null;
  private pair: KeyringPair | null = null;
  private readonly label: string;

  constructor(private readonly suri: string, private readonly logger?: Logger) {
    this.label = '[reputation-worker]';
  }

  private async ensureReady(): Promise<ApiPromise> {
    if (!this.apiPromise) {
      this.apiPromise = getStoresApi();
    }
    const api = await this.apiPromise;
    if (!this.pair) {
      await cryptoWaitReady();
      const { Keyring } = require('@polkadot/keyring');
      const keyring = new Keyring({ type: 'sr25519' });
      this.pair = keyring.addFromUri(this.suri, { name: 'bazari-reputation-worker' });
      this.logger?.info?.(this.label, 'Assinador configurado', { address: this.pair?.address });
    }
    return api;
  }

  async fetch(storeId: string): Promise<ReputationSnapshot | null> {
    const store = await getStore(storeId);
    if (!store) return null;
    const rep = store.reputation ?? { sales: 0, positive: 0, negative: 0, volumePlanck: '0' };
    return {
      sales: numberToBigInt(rep.sales),
      positive: numberToBigInt(rep.positive),
      negative: numberToBigInt(rep.negative),
      volumePlanck: BigInt(rep.volumePlanck ?? '0'),
    };
  }

  async bump(storeId: string, delta: ReputationSnapshot): Promise<void> {
    if (
      delta.sales === 0n &&
      delta.positive === 0n &&
      delta.negative === 0n &&
      delta.volumePlanck === 0n
    ) {
      return;
    }

    const api = await this.ensureReady();
    const pair = this.pair!;

    await new Promise<void>((resolve, reject) => {
      let unsub: (() => void) | undefined;
      api.tx.stores
        .bumpReputation(
          storeId,
          delta.sales.toString(),
          delta.positive.toString(),
          delta.negative.toString(),
          delta.volumePlanck.toString(),
        )
        .signAndSend(pair, (result: SubmittableResult) => {
          if (result.dispatchError) {
            unsub?.();
            let message = result.dispatchError.toString();
            if (result.dispatchError.isModule) {
              const meta = api.registry.findMetaError(result.dispatchError.asModule);
              message = `${meta.section}.${meta.name}`;
            }
            this.logger?.error?.(this.label, 'Falha ao enviar extrinsic bump_reputation', { storeId, error: message });
            reject(new Error(message));
            return;
          }

          if (result.status.isInBlock || result.status.isFinalized) {
            unsub?.();
            const hash = result.status.isFinalized
              ? result.status.asFinalized.toString()
              : result.status.asInBlock.toString();
            this.logger?.info?.(this.label, 'Reputação atualizada', { storeId, hash, delta });
            resolve();
          }
        })
        .then((unsubFn) => {
          unsub = unsubFn;
        })
        .catch((err) => {
          unsub?.();
          reject(err);
        });
    });
  }
}

export async function runReputationSync(
  prisma: PrismaClient,
  options: ReputationWorkerRunOptions = {},
): Promise<ReputationSyncResult> {
  const logger = options.logger ?? console;

  let chain = options.chainAdapter;
  if (!chain) {
    if (!env.STORE_REPUTATION_SURI) {
      throw new Error('STORE_REPUTATION_SURI não configurada');
    }
    chain = new DefaultChainAdapter(env.STORE_REPUTATION_SURI, logger);
  }

  const stores = await prisma.sellerProfile.findMany({
    where: { onChainStoreId: { not: null } },
    select: { id: true, onChainStoreId: true, ratingAvg: true, ratingCount: true },
  });

  const sellerIds = stores.map((store) => store.id);
  const ordersByStore = await aggregateOrderStats(prisma, sellerIds);

  const details: ReputationSyncEntry[] = [];
  let updated = 0;
  let skipped = 0;
  let noops = 0;
  let errors = 0;

  for (const store of stores) {
    const onChainStoreId = store.onChainStoreId?.toString();
    if (!onChainStoreId) {
      details.push({
        storeId: store.id,
        onChainStoreId: '',
        totals: { sales: 0n, positive: 0n, negative: 0n, volumePlanck: 0n },
        delta: { sales: 0n, positive: 0n, negative: 0n, volumePlanck: 0n },
        action: 'skipped',
        reason: 'missing_onchain_store_id',
      });
      skipped += 1;
      continue;
    }

    const orderStats = ordersByStore.get(store.id) ?? { sales: 0n, volumePlanck: 0n };
    const feedback = estimateFeedbackBuckets(store.ratingAvg, store.ratingCount);

    const totals: ReputationSnapshot = {
      sales: orderStats.sales,
      positive: feedback.positive,
      negative: feedback.negative,
      volumePlanck: orderStats.volumePlanck,
    };

    try {
      const current = await chain.fetch(onChainStoreId);
      if (!current) {
        details.push({
          storeId: store.id,
          onChainStoreId,
          totals,
          delta: { sales: 0n, positive: 0n, negative: 0n, volumePlanck: 0n },
          action: 'skipped',
          reason: 'store_not_found_on_chain',
        });
        skipped += 1;
        continue;
      }

      const delta: ReputationSnapshot = {
        sales: diff(totals.sales, current.sales),
        positive: diff(totals.positive, current.positive),
        negative: diff(totals.negative, current.negative),
        volumePlanck: diff(totals.volumePlanck, current.volumePlanck),
      };

      const hasDelta =
        delta.sales > 0n || delta.positive > 0n || delta.negative > 0n || delta.volumePlanck > 0n;

      if (hasDelta && !options.dryRun) {
        await chain.bump(onChainStoreId, delta);
        updated += 1;
        details.push({ storeId: store.id, onChainStoreId, totals, delta, action: 'updated' });
      } else {
        noops += 1;
        details.push({
          storeId: store.id,
          onChainStoreId,
          totals,
          delta,
          action: 'noop',
          reason: hasDelta ? 'dry_run' : 'up_to_date',
        });
      }
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      logger.error?.('[reputation-worker]', 'Erro ao sincronizar reputação', {
        storeId: store.id,
        onChainStoreId,
        error: message,
      });
      details.push({
        storeId: store.id,
        onChainStoreId,
        totals,
        delta: { sales: 0n, positive: 0n, negative: 0n, volumePlanck: 0n },
        action: 'error',
        reason: message,
      });
    }
  }

  return {
    processed: stores.length,
    updated,
    skipped,
    noops,
    errors,
    details,
  };
}

export function startReputationWorker(
  prisma: PrismaClient,
  options: StartReputationWorkerOptions = {},
): NodeJS.Timeout | null {
  if (!env.STORE_REPUTATION_SURI) {
    options.logger?.warn?.('[reputation-worker]', 'STORE_REPUTATION_SURI ausente; worker não iniciado');
    return null;
  }

  const logger = options.logger ?? console;
  const chainAdapter = options.chainAdapter ?? new DefaultChainAdapter(env.STORE_REPUTATION_SURI, logger);
  const intervalMs = options.intervalMs ?? env.STORE_REPUTATION_INTERVAL_MS ?? 60_000;

  let running = false;

  const tick = async () => {
    if (running) {
      logger.debug?.('[reputation-worker]', 'Execução anterior ainda em andamento; tick ignorado');
      return;
    }
    running = true;
    try {
      const result = await runReputationSync(prisma, { chainAdapter, logger });
      logger.info?.('[reputation-worker]', 'Execução concluída', {
        processed: result.processed,
        updated: result.updated,
        skipped: result.skipped,
        noops: result.noops,
        errors: result.errors,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error?.('[reputation-worker]', 'Execução falhou', { error: message });
    } finally {
      running = false;
    }
  };

  if (options.runImmediately !== false) {
    void tick();
  }

  const timer = setInterval(tick, intervalMs);
  return timer;
}
type KeyringPair = import('@polkadot/keyring/types').KeyringPair;

const require = createRequire(import.meta.url);
