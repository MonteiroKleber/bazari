import { PrismaClient } from '@prisma/client';

export interface P2PTimeoutOptions {
  escrowMs?: number;       // default 10 min
  paymentMs?: number;      // default 30 min
  confirmMs?: number;      // default 30 min
}

export async function runP2PTimeout(
  prisma: PrismaClient,
  opts: P2PTimeoutOptions = {}
): Promise<{ cancelledForNoEscrow: number; expiredForNoPayment: number; autoDisputes: number }> {
  const escrowMs = opts.escrowMs ?? 10 * 60 * 1000;
  const paymentMs = opts.paymentMs ?? 30 * 60 * 1000;
  const confirmMs = opts.confirmMs ?? 30 * 60 * 1000;
  const now = Date.now();

  let cancelled = 0;
  let expired = 0;
  let disputes = 0;

  // 1) AWAITING_ESCROW older than escrowMs -> CANCELLED
  const awaitingEscrow = await prisma.p2POrder.findMany({
    where: {
      status: 'AWAITING_ESCROW',
      createdAt: { lt: new Date(now - escrowMs) },
    },
    select: { id: true },
  } as any);
  for (const o of awaitingEscrow) {
    try {
      await prisma.p2POrder.update({ where: { id: o.id }, data: { status: 'CANCELLED' } } as any);
      try { await prisma.p2PMessage.create({ data: { orderId: o.id, senderId: 'system', kind: 'system', body: 'TIMEOUT_ESCROW' } } as any); } catch {}
      cancelled++;
    } catch {}
  }

  // 2) AWAITING_FIAT_PAYMENT where escrowAt + paymentMs < now -> EXPIRED
  const awaitingPayment = await prisma.p2POrder.findMany({
    where: {
      status: 'AWAITING_FIAT_PAYMENT',
      escrowAt: { not: null },
      // prisma doesn't allow direct date math; filter broadly then check JS
    },
    select: { id: true, escrowAt: true },
  } as any);
  for (const o of awaitingPayment) {
    const escrowAt = (o as any).escrowAt ? new Date((o as any).escrowAt).getTime() : null;
    if (escrowAt && escrowAt + paymentMs < now) {
      try {
        await prisma.p2POrder.update({ where: { id: o.id }, data: { status: 'EXPIRED' } } as any);
        try { await prisma.p2PMessage.create({ data: { orderId: o.id, senderId: 'system', kind: 'system', body: 'EXPIRED_NO_PAYMENT' } } as any); } catch {}
        expired++;
      } catch {}
    }
  }

  // 3) AWAITING_CONFIRMATION where payerDeclaredAt + confirmMs < now -> DISPUTE_OPEN (auto)
  const awaitingConfirm = await prisma.p2POrder.findMany({
    where: {
      status: 'AWAITING_CONFIRMATION',
      payerDeclaredAt: { not: null },
    },
    select: { id: true, payerDeclaredAt: true, makerId: true, takerId: true },
  } as any);
  for (const o of awaitingConfirm) {
    const markedAt = (o as any).payerDeclaredAt ? new Date((o as any).payerDeclaredAt).getTime() : null;
    if (markedAt && markedAt + confirmMs < now) {
      try {
        await prisma.p2POrder.update({ where: { id: o.id }, data: { status: 'DISPUTE_OPEN' } } as any);
        // create dispute if not exists
        try {
          await prisma.p2PDispute.create({ data: { orderId: o.id, openedById: 'system', reason: 'AUTO_DISPUTE_TIMEOUT', evidence: null, status: 'open' } } as any);
        } catch {}
        try { await prisma.p2PMessage.create({ data: { orderId: o.id, senderId: 'system', kind: 'system', body: 'DISPUTE_AUTO_OPEN' } } as any); } catch {}
        disputes++;
      } catch {}
    }
  }

  return { cancelledForNoEscrow: cancelled, expiredForNoPayment: expired, autoDisputes: disputes };
}

export function startP2PTimeoutWorker(
  prisma: PrismaClient,
  opts: P2PTimeoutOptions & { intervalMs?: number } = {}
): NodeJS.Timeout {
  const { intervalMs = 60 * 1000, ...timeoutOpts } = opts;
  const id = setInterval(async () => {
    try {
      const r = await runP2PTimeout(prisma, timeoutOpts);
      if (r.cancelledForNoEscrow || r.expiredForNoPayment || r.autoDisputes) {
        console.log(`P2PTimeout: cancelled=${r.cancelledForNoEscrow} expired=${r.expiredForNoPayment} disputes=${r.autoDisputes}`);
      }
    } catch (err) {
      console.warn('P2PTimeout worker error:', err);
    }
  }, intervalMs);
  return id;
}

