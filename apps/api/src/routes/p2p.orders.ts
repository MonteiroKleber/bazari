import type { FastifyInstance } from 'fastify';
import type { PrismaClient, P2PPaymentMethod, P2POfferSide, P2POrderStatus, P2PAssetType } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { getPaymentsConfig } from '../config/payments.js';
import { decodeCursor } from '../lib/cursor.js';
import { runReputationSync } from '../workers/reputation.worker.js';
import { PhaseControlService } from '../services/p2p/phase-control.service.js';
import { EscrowService } from '../services/p2p/escrow.service.js';

export async function p2pOrdersRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const idParam = z.object({ id: z.string().min(1) });

  // POST /p2p/offers/:id/orders — criar ordem a partir de oferta (auth)
  app.post('/p2p/offers/:id/orders', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const offer = await prisma.p2POffer.findUnique({ where: { id } });
    if (!offer || offer.status !== 'ACTIVE') {
      return reply.status(404).send({ error: 'Oferta indisponível' });
    }

    const assetType = (offer.assetType as P2PAssetType) || 'BZR';
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30min

    // Handle BZR orders (existing logic)
    if (assetType === 'BZR') {
      // Body: amountBRL or amountBZR
      const bodySchema = z.object({ amountBRL: z.coerce.number().positive().optional(), amountBZR: z.coerce.number().positive().optional() })
        .refine(v => !!v.amountBRL || !!v.amountBZR, { message: 'Informe amountBRL ou amountBZR' });
      const body = bodySchema.parse(request.body ?? {});

      const price = Number(offer.priceBRLPerBZR as any);
      const amountBRL = body.amountBRL ? Number(body.amountBRL) : Number((Number(body.amountBZR) * price).toFixed(2));
      const amountBZR = body.amountBZR ? Number(body.amountBZR) : Number((Number(body.amountBRL) / price).toFixed(12));

      // Verificar limites
      const min = Number(offer.minBRL as any);
      const max = Number(offer.maxBRL as any);
      if (amountBRL < min || amountBRL > max) {
        return reply.status(400).send({ error: `Valor fora da faixa (min ${min}, max ${max})` });
      }

      // Lado que deve travar escrow é quem entrega BZR
      const side = offer.side as P2POfferSide;

      // PIX receiver depends on side:
      // - SELL_BZR: maker (offer owner) recebe BRL
      // - BUY_BZR: taker (quem inicia a ordem) recebe BRL
      let pixKeySnapshot: string | null = null;
      if (side === 'SELL_BZR') {
        const pay = await prisma.p2PPaymentProfile.findUnique({ where: { userId: offer.ownerId } });
        pixKeySnapshot = pay?.pixKey ?? null;
      } else {
        const pay = await prisma.p2PPaymentProfile.findUnique({ where: { userId: authUser.sub } });
        pixKeySnapshot = pay?.pixKey ?? null;
      }

      const order = await prisma.p2POrder.create({
        data: ({
          offerId: offer.id,
          makerId: offer.ownerId,
          takerId: authUser.sub,
          assetType: 'BZR',
          assetId: null,
          side: side,
          priceBRLPerBZR: String(price),
          amountBZR: String(amountBZR),
          amountBRL: String(amountBRL),
          amountAsset: null,
          phase: null,
          priceBRLPerUnit: null,
          method: offer.method as P2PPaymentMethod,
          status: 'AWAITING_ESCROW',
          pixKeySnapshot,
          expiresAt,
        } as any),
      } as any);

      return reply.status(201).send(order);
    }

    // Handle ZARI orders (FASE 5 logic)
    if (assetType === 'ZARI') {
      const phaseControl = new PhaseControlService(prisma);

      try {
        // Body: amountBRL or amountZARI
        const bodySchema = z.object({
          amountBRL: z.coerce.number().positive().optional(),
          amountZARI: z.coerce.number().positive().optional()
        }).refine(v => !!v.amountBRL || !!v.amountZARI, { message: 'Informe amountBRL ou amountZARI' });
        const body = bodySchema.parse(request.body ?? {});

        // Validate active phase
        const activePhase = await phaseControl.getActivePhase();
        if (!activePhase || !activePhase.isActive) {
          await phaseControl.disconnect();
          return reply.status(400).send({ error: 'ZARI phase is not active or sold out' });
        }

        // Price per ZARI in BRL (from phase)
        const priceBRLPerZARI = Number(activePhase.priceBZR) / 1e12;

        // Calculate amounts
        const amountBRL = body.amountBRL
          ? Number(body.amountBRL)
          : Number((Number(body.amountZARI) * priceBRLPerZARI).toFixed(2));

        const amountZARI = body.amountZARI
          ? Number(body.amountZARI)
          : Number((Number(body.amountBRL) / priceBRLPerZARI).toFixed(12));

        // Verify limits
        const min = Number(offer.minBRL as any);
        const max = Number(offer.maxBRL as any);
        if (amountBRL < min || amountBRL > max) {
          await phaseControl.disconnect();
          return reply.status(400).send({ error: `Valor fora da faixa (min ${min}, max ${max})` });
        }

        // Validate supply availability
        const amountZARIPlanck = BigInt(Math.floor(amountZARI * 1e12));
        await phaseControl.canCreateZARIOffer(amountZARIPlanck);

        // ZARI orders: maker (seller) receives BRL, taker (buyer) pays BRL
        const pay = await prisma.p2PPaymentProfile.findUnique({ where: { userId: offer.ownerId } });
        const pixKeySnapshot = pay?.pixKey ?? null;

        const order = await prisma.p2POrder.create({
          data: ({
            offerId: offer.id,
            makerId: offer.ownerId,
            takerId: authUser.sub,
            assetType: 'ZARI',
            assetId: '1', // ZARI asset ID
            side: 'SELL_BZR' as P2POfferSide, // Reuse enum (seller sells ZARI)
            phase: activePhase.phase,
            priceBRLPerUnit: String(priceBRLPerZARI),
            priceBRLPerBZR: String(priceBRLPerZARI), // For compatibility
            amountAsset: String(amountZARI),
            amountBZR: String(amountZARI), // For compatibility with existing queries
            amountBRL: String(amountBRL),
            method: offer.method as P2PPaymentMethod,
            status: 'AWAITING_ESCROW',
            pixKeySnapshot,
            expiresAt,
          } as any),
        } as any);

        await phaseControl.disconnect();
        return reply.status(201).send(order);
      } catch (error: any) {
        await phaseControl.disconnect();
        return reply.status(400).send({
          error: 'ZARIOrderCreationFailed',
          message: error.message
        });
      }
    }

    return reply.status(400).send({ error: 'Invalid asset type' });
  });

  // GET /p2p/orders/:id — maker/taker only
  app.get('/p2p/orders/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });
    if (order.makerId !== authUser.sub && order.takerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });
    // Attach minimal profiles for maker/taker (handle/displayName/avatar)
    const ids = [order.makerId, order.takerId];
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, handle: true, displayName: true, avatarUrl: true },
    } as any);
    const byUser: Record<string, any> = Object.fromEntries(profiles.map(p => [p.userId, p]));
    return reply.send({
      ...order,
      makerProfile: byUser[order.makerId] || null,
      takerProfile: byUser[order.takerId] || null,
    });
  });

  // POST /p2p/orders/:id/escrow-intent — gerar payload para travar BZR ou ZARI
  app.post('/p2p/orders/:id/escrow-intent', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });
    if (order.makerId !== authUser.sub && order.takerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });

    const config = getPaymentsConfig();
    const assetType = (order.assetType as P2PAssetType) || 'BZR';

    if (assetType === 'BZR') {
      // BZR escrow: use balances.transfer_keep_alive
      return reply.send({
        escrowAddress: config.escrowAddress,
        assetType: 'BZR',
        amountBZR: String(order.amountBZR),
        note: 'Use balances.transfer_keep_alive para enviar BZR ao escrow',
      });
    }

    if (assetType === 'ZARI') {
      // ZARI escrow: use assets.transfer_keep_alive with asset ID 1
      return reply.send({
        escrowAddress: config.escrowAddress,
        assetType: 'ZARI',
        assetId: '1',
        amountZARI: String(order.amountAsset),
        note: 'Use assets.transfer_keep_alive com asset_id=1 para enviar ZARI ao escrow',
      });
    }

    return reply.status(400).send({ error: 'Invalid asset type' });
  });

  // POST /p2p/orders/:id/escrow-confirm — registra hash e avança para AWAITING_FIAT_PAYMENT
  app.post('/p2p/orders/:id/escrow-confirm', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const body = z.object({ txHash: z.string().min(3) }).parse(request.body ?? {});
    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });
    // Quem confirma o escrow é quem travou BZR:
    // - SELL_BZR: maker
    // - BUY_BZR: taker
    const shouldBeEscrower = order.side === 'SELL_BZR' ? order.makerId : order.takerId;
    if (shouldBeEscrower !== authUser.sub) return reply.status(403).send({ error: 'Apenas quem trava o escrow pode confirmar.' });
    if (order.status !== 'AWAITING_ESCROW') {
      return reply.status(400).send({ error: 'Estado inválido para confirmar escrow' });
    }
    const updated = await prisma.p2POrder.update({ where: { id }, data: { escrowTxHash: body.txHash, escrowAt: new Date(), status: 'AWAITING_FIAT_PAYMENT' as P2POrderStatus } as any });
    // System message
    try { await prisma.p2PMessage.create({ data: { orderId: id, senderId: authUser.sub, kind: 'system', body: `ESCROW_CONFIRMED:${body.txHash}` } as any } as any); } catch {}
    return reply.send(updated);
  });

  // ✨ FASE 5: POST /p2p/orders/:id/escrow-lock — executar lock automático no blockchain
  app.post('/p2p/orders/:id/escrow-lock', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const body = z.object({ makerAddress: z.string().min(10) }).parse(request.body ?? {});

    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });

    // Apenas maker pode executar lock
    if (order.makerId !== authUser.sub) {
      return reply.status(403).send({ error: 'Apenas o maker pode executar o lock' });
    }

    if (order.status !== 'AWAITING_ESCROW') {
      return reply.status(400).send({ error: 'Estado inválido para lock. Status atual: ' + order.status });
    }

    try {
      const escrowService = new EscrowService(prisma);
      const result = await escrowService.lockFunds(order, body.makerAddress);

      // System message
      try {
        await prisma.p2PMessage.create({
          data: {
            orderId: id,
            senderId: authUser.sub,
            kind: 'system',
            body: `ESCROW_LOCKED:${result.txHash}`,
          } as any,
        } as any);
      } catch {}

      return reply.send({
        success: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber.toString(),
        amount: result.amount.toString(),
        assetType: result.assetType,
        message: `${result.assetType} locked in escrow successfully`,
      });
    } catch (error: any) {
      console.error('[P2P Orders] Escrow lock failed:', error);
      return reply.status(500).send({
        error: 'EscrowLockFailed',
        message: error.message,
      });
    }
  });

  // ✨ FASE 5: POST /p2p/orders/:id/escrow-release — executar release automático do blockchain
  app.post('/p2p/orders/:id/escrow-release', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const body = z.object({ takerAddress: z.string().min(10) }).parse(request.body ?? {});

    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });

    // Quem recebeu BRL pode liberar:
    // - SELL_BZR: recebedor é o maker
    const receiverId = order.side === 'SELL_BZR' ? order.makerId : order.takerId;
    if (receiverId !== authUser.sub) {
      return reply.status(403).send({ error: 'Apenas quem recebeu BRL pode liberar' });
    }

    if (order.status !== 'AWAITING_CONFIRMATION') {
      return reply.status(400).send({ error: 'Estado inválido para release. Status atual: ' + order.status });
    }

    try {
      const escrowService = new EscrowService(prisma);
      const result = await escrowService.releaseFunds(order, body.takerAddress);

      // System message
      try {
        await prisma.p2PMessage.create({
          data: {
            orderId: id,
            senderId: authUser.sub,
            kind: 'system',
            body: `ESCROW_RELEASED:${result.txHash}`,
          } as any,
        } as any);
      } catch {}

      // Trigger reputation sync
      try {
        await runReputationSync(prisma, { logger: app.log });
        app.log.info({ p2pOrderId: id }, 'Reputação atualizada após escrow release');
      } catch (err) {
        app.log.warn({ err, p2pOrderId: id }, 'Falha ao atualizar reputação');
      }

      return reply.send({
        success: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber.toString(),
        amount: result.amount.toString(),
        assetType: result.assetType,
        recipient: result.recipient,
        message: `${result.assetType} released from escrow successfully`,
      });
    } catch (error: any) {
      console.error('[P2P Orders] Escrow release failed:', error);
      return reply.status(500).send({
        error: 'EscrowReleaseFailed',
        message: error.message,
      });
    }
  });

  // POST /p2p/orders/:id/mark-paid — BRL pagante marca como pago
  app.post('/p2p/orders/:id/mark-paid', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    // Accept relative or absolute URLs for proofs (CDN/local)
    const body = z.object({ proofUrls: z.array(z.string().min(3)).optional(), note: z.string().max(500).optional() }).parse(request.body ?? {});
    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });
    if (order.makerId !== authUser.sub && order.takerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });
    // Quem paga BRL marca como pago:
    // - SELL_BZR: pagante é o taker
    // - BUY_BZR: pagante é o maker
    const payerId = order.side === 'SELL_BZR' ? order.takerId : order.makerId;
    if (payerId !== authUser.sub) return reply.status(403).send({ error: 'Apenas o pagante pode marcar como pago.' });
    if (order.status !== 'AWAITING_FIAT_PAYMENT' && order.status !== 'AWAITING_ESCROW') {
      return reply.status(400).send({ error: 'Estado inválido para marcar como pago' });
    }
    // Se ainda não aguardando pagamento, não permitir (escrow primeiro)
    if (order.status === 'AWAITING_ESCROW') {
      return reply.status(400).send({ error: 'Aguarde o escrow de BZR antes de marcar como pago' });
    }
    const updated = await prisma.p2POrder.update({ where: { id }, data: { payerDeclaredAt: new Date(), proofUrls: body.proofUrls ?? null, status: 'AWAITING_CONFIRMATION' as P2POrderStatus } as any });
    // System message
    try { await prisma.p2PMessage.create({ data: { orderId: id, senderId: authUser.sub, kind: 'system', body: `PAID_MARKED` } as any } as any); } catch {}
    return reply.send(updated);
  });

  // POST /p2p/orders/:id/confirm-received — quem recebeu BRL confirma e libera
  app.post('/p2p/orders/:id/confirm-received', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });
    if (order.makerId !== authUser.sub && order.takerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });
    // Quem recebeu BRL confirma:
    // - SELL_BZR: recebedor é o maker
    // - BUY_BZR: recebedor é o taker
    const receiverId = order.side === 'SELL_BZR' ? order.makerId : order.takerId;
    if (receiverId !== authUser.sub) return reply.status(403).send({ error: 'Apenas o recebedor pode confirmar.' });
    if (order.status !== 'AWAITING_CONFIRMATION') return reply.status(400).send({ error: 'Estado inválido' });
    const updated = await prisma.p2POrder.update({ where: { id }, data: { status: 'RELEASED' as P2POrderStatus, releasedAt: new Date() } as any });

    // System message
    try { await prisma.p2PMessage.create({ data: { orderId: id, senderId: authUser.sub, kind: 'system', body: `RELEASED` } as any } as any); } catch {}

    // Gatilho imediato de reputação on-chain (P2P não usa sellerStoreId, mas tentamos de qualquer forma)
    try {
      await runReputationSync(prisma, { logger: app.log });
      app.log.info({ p2pOrderId: id }, 'Reputação atualizada imediatamente após P2P RELEASED');
    } catch (err) {
      app.log.warn({ err, p2pOrderId: id }, 'Falha ao atualizar reputação imediata (P2P) - worker periódico atualizará');
    }

    return reply.send(updated);
  });

  // POST /p2p/orders/:id/cancel
  app.post('/p2p/orders/:id/cancel', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });
    if (order.makerId !== authUser.sub && order.takerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });
    if (order.status !== 'DRAFT' && order.status !== 'AWAITING_ESCROW') return reply.status(400).send({ error: 'Não cancelável neste estado' });
    const updated = await prisma.p2POrder.update({ where: { id }, data: { status: 'CANCELLED' as P2POrderStatus } as any });
    return reply.send(updated);
  });

  // GET /p2p/my-orders
  app.get('/p2p/my-orders', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const q = z.object({ status: z.enum(['ACTIVE','HIST']).optional(), cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).optional() }).parse(request.query ?? {});
    const take = Math.min(q.limit ?? 20, 100);
    const c = decodeCursor(q.cursor ?? null);
    const whereAny = {
      OR: [ { makerId: authUser.sub }, { takerId: authUser.sub } ],
    } as any;
    const where = q.status === 'HIST'
      ? { ...whereAny, status: { in: ['RELEASED','EXPIRED','CANCELLED','DISPUTE_RESOLVED_BUYER','DISPUTE_RESOLVED_SELLER'] } as any }
      : { ...whereAny, status: { in: ['DRAFT','AWAITING_ESCROW','AWAITING_FIAT_PAYMENT','AWAITING_CONFIRMATION','DISPUTE_OPEN'] } as any };

    const cursorWhere = c ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } : {};
    const items = await prisma.p2POrder.findMany({ where: { ...where, ...cursorWhere } as any, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: take + 1 } as any);
    let nextCursor: string | null = null;
    if (items.length > take) {
      const tail: any = items.pop();
      nextCursor = Buffer.from(`${tail.createdAt.toISOString()}_${tail.id}`, 'utf8').toString('base64url');
    }
    // Attach minimal profiles for maker/taker
    const userIds = Array.from(new Set(items.flatMap((o: any) => [o.makerId, o.takerId])));
    const profiles = userIds.length
      ? await prisma.profile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, handle: true, displayName: true, avatarUrl: true } } as any)
      : [];
    const byUser: Record<string, any> = Object.fromEntries(profiles.map(p => [p.userId, p]));
    const itemsWithProfiles = items.map((o: any) => ({
      ...o,
      makerProfile: byUser[o.makerId] || null,
      takerProfile: byUser[o.takerId] || null,
    }));
    return reply.send({ items: itemsWithProfiles, nextCursor });
  });

  // POST /p2p/orders/:id/review — criar avaliação após RELEASED (uma por ordem e por usuário)
  app.post('/p2p/orders/:id/review', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const body = z.object({ stars: z.coerce.number().min(1).max(5), comment: z.string().max(500).optional() }).parse(request.body ?? {});
    const order = await prisma.p2POrder.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Ordem não encontrada' });
    if (order.makerId !== authUser.sub && order.takerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });
    if (order.status !== 'RELEASED') return reply.status(400).send({ error: 'Avaliação permitida apenas após conclusão' });
    const existing = await prisma.p2PReview.findUnique({ where: { orderId: id } } as any);
    if (existing) return reply.status(400).send({ error: 'Avaliação já registrada para esta ordem' });
    const rateeId = order.makerId === authUser.sub ? order.takerId : order.makerId;
    const review = await prisma.p2PReview.create({ data: { orderId: id, raterId: authUser.sub, rateeId, stars: Math.round(body.stars), comment: body.comment ?? null } as any } as any);
    return reply.status(201).send(review);
  });
}
