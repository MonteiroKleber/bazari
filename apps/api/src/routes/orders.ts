// path: apps/api/src/routes/orders.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getPaymentsConfig } from '../config/payments.js';

const createPaymentIntentParamsSchema = z.object({
  id: z.string().uuid(),
});

const orderParamsSchema = z.object({
  id: z.string().uuid(),
});

const createOrderSchema = z.object({
  items: z.array(z.object({
    listingId: z.string().uuid(),
    qty: z.number().int().min(1),
    kind: z.enum(['product', 'service']),
  })).min(1),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
  shippingOptionId: z.string().optional(),
  notes: z.string().optional(),
});

export async function ordersRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;

  function decimalToPlanck(value: unknown): bigint {
    // Accepts strings like "10", "10.5", "10,50", numbers, BigInt, or Prisma Decimal (toString)
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return decimalToPlanck(value.toString());
    if (typeof value === 'string') {
      const normalized = value.trim().replace(',', '.');
      if (!/^-?\d*(?:\.\d+)?$/.test(normalized)) return 0n;
      const [intPart, fracRaw = ''] = normalized.split('.');
      const frac = (fracRaw + '000000000000').slice(0, 12);
      const i = BigInt(intPart || '0');
      const f = BigInt(frac || '0');
      return i * 10n ** 12n + f;
    }
    try {
      const s = (value as any)?.toString?.();
      if (typeof s === 'string' && s.length > 0) {
        return decimalToPlanck(s);
      }
    } catch {}
    return 0n;
  }

  // In-memory idempotency cache (minimal implementation)
  const idempotencyCache = new Map<string, { expiresAt: number; payload: any }>();
  const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

  // POST /orders - Criar pedido
  app.post('/orders', async (request, reply) => {
    try {
      // Handle Idempotency-Key
      const idemKey = (request.headers['idempotency-key'] || request.headers['Idempotency-Key']) as string | undefined;
      if (idemKey) {
        const cached = idempotencyCache.get(idemKey);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.payload;
        }
      }

      const body = createOrderSchema.parse(request.body);

      // TODO: Obter endereço do comprador do auth/session
      const buyerAddr = 'buyer-placeholder'; // Será implementado com auth

      // Carregar dados dos produtos/serviços para fazer snapshots
      const listings = await Promise.all(
        body.items.map(async (item) => {
          if (item.kind === 'product') {
            return await prisma.product.findUnique({
              where: { id: item.listingId },
              select: { id: true, title: true, priceBzr: true, daoId: true },
            });
          } else {
            return await prisma.serviceOffering.findUnique({
              where: { id: item.listingId },
              select: { id: true, title: true, basePriceBzr: true, daoId: true },
            });
          }
        })
      );

      // Verificar se todos os itens existem
      for (let i = 0; i < listings.length; i++) {
        if (!listings[i]) {
          return reply.status(404).send({
            error: 'Item não encontrado',
            message: `${body.items[i].kind} com ID ${body.items[i].listingId} não existe`,
          });
        }
      }

      // Verificar regra MVP: 1 vendedor apenas
      const sellers = listings.map(listing => listing!.daoId).filter(Boolean);
      const uniqueSellers = [...new Set(sellers)];

      if (uniqueSellers.length > 1) {
        return reply.status(400).send({
          error: 'Múltiplos vendedores',
          message: 'MVP permite apenas itens de um vendedor por pedido',
          sellers: uniqueSellers,
        });
      }

      const sellerId = uniqueSellers[0] || 'unknown';
      const sellerAddr = sellerId; // Por simplicidade, usar o ID como endereço

      // Calcular valores
      let subtotalBzr = BigInt(0);
      const orderItems = body.items.map((item, index) => {
        const listing = listings[index]!;
        const rawPrice = item.kind === 'product'
          ? (listing as any).priceBzr || '0'
          : (listing as any).basePriceBzr || '0';
        const unitPrice = decimalToPlanck(rawPrice);
        const lineTotal = unitPrice * BigInt(item.qty);
        subtotalBzr += lineTotal;

        return {
          listingId: item.listingId,
          kind: item.kind,
          qty: item.qty,
          unitPriceBzrSnapshot: unitPrice.toString(),
          titleSnapshot: listing.title,
          lineTotalBzr: lineTotal.toString(),
        };
      });

      // Calcular frete (stub) - 10 BZR em planck
      const shippingBzr = 10n * (10n ** 12n);
      const totalBzr = subtotalBzr + shippingBzr;

      // Criar order com items
      const order = await prisma.order.create({
        data: {
          buyerAddr,
          sellerAddr,
          sellerId,
          subtotalBzr: subtotalBzr.toString(),
          shippingBzr: shippingBzr.toString(),
          totalBzr: totalBzr.toString(),
          status: 'CREATED',
          shippingAddress: body.shippingAddress || null,
          shippingOptionId: body.shippingOptionId || 'STD',
          notes: body.notes || null,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });

      const payload = {
        orderId: order.id,
        status: order.status,
        totals: {
          subtotalBzr: order.subtotalBzr,
          shippingBzr: order.shippingBzr,
          totalBzr: order.totalBzr,
        },
        items: order.items.map(item => ({
          listingId: item.listingId,
          qty: item.qty,
          kind: item.kind,
          unitPriceBzrSnapshot: item.unitPriceBzrSnapshot,
          titleSnapshot: item.titleSnapshot,
          lineTotalBzr: item.lineTotalBzr,
        })),
      };

      if (idemKey) {
        idempotencyCache.set(idemKey, { expiresAt: Date.now() + IDEMPOTENCY_TTL_MS, payload });
      }

      return payload;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao criar order');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao criar pedido',
      });
    }
  });

  // GET /payments/config - Configuração de pagamentos
  app.get('/payments/config', async (request, reply) => {
    try {
      const config = getPaymentsConfig();
      return {
        escrowAddress: config.escrowAddress,
        feeBps: config.feeBps,
      };
    } catch (err) {
      app.log.error({ err }, 'Erro ao obter config de pagamentos');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao carregar configuração de pagamentos'
      });
    }
  });

  // POST /orders/:id/payment-intent - Criar intent de pagamento
  app.post('/orders/:id/payment-intent', async (request, reply) => {
    try {
      const { id } = createPaymentIntentParamsSchema.parse(request.params);

      // Verificar se a order existe
      const order = await prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        return reply.status(404).send({
          error: 'Order não encontrada',
          message: `Order com ID ${id} não existe`,
        });
      }

      // Verificar se totalBzr > 0
      if (order.totalBzr.lte(0)) {
        return reply.status(400).send({
          error: 'Valor inválido',
          message: 'O valor total da order deve ser maior que zero',
        });
      }

      const config = getPaymentsConfig();

      // Criar PaymentIntent
      const paymentIntent = await prisma.paymentIntent.create({
        data: {
          orderId: order.id,
          amountBzr: order.totalBzr,
          escrowAddress: config.escrowAddress,
        },
      });

      return {
        orderId: order.id,
        escrowAddress: config.escrowAddress,
        amountBzr: order.totalBzr.toString(),
        feeBps: config.feeBps,
        paymentIntentId: paymentIntent.id,
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao criar payment intent');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao criar intent de pagamento',
      });
    }
  });

  // GET /orders/:id - Obter order com intents e logs
  app.get('/orders/:id', async (request, reply) => {
    try {
      const { id } = orderParamsSchema.parse(request.params);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
          },
          escrowLogs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!order) {
        return reply.status(404).send({
          error: 'Order não encontrada',
          message: `Order com ID ${id} não existe`,
        });
      }

      return {
        id: order.id,
        buyerAddr: order.buyerAddr,
        sellerAddr: order.sellerAddr,
        sellerId: order.sellerId,
        subtotalBzr: order.subtotalBzr,
        shippingBzr: order.shippingBzr,
        totalBzr: order.totalBzr.toString(),
        status: order.status,
        shippingAddress: order.shippingAddress,
        shippingOptionId: order.shippingOptionId,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          id: item.id,
          listingId: item.listingId,
          kind: item.kind,
          qty: item.qty,
          unitPriceBzrSnapshot: item.unitPriceBzrSnapshot,
          titleSnapshot: item.titleSnapshot,
          lineTotalBzr: item.lineTotalBzr,
          createdAt: item.createdAt,
        })),
        paymentIntents: order.paymentIntents.map(intent => ({
          id: intent.id,
          amountBzr: intent.amountBzr.toString(),
          escrowAddress: intent.escrowAddress,
          status: intent.status,
          txHashIn: intent.txHashIn,
          txHashRelease: intent.txHashRelease,
          txHashRefund: intent.txHashRefund,
          createdAt: intent.createdAt,
        })),
        escrowLogs: order.escrowLogs.map(log => ({
          id: log.id,
          kind: log.kind,
          payloadJson: log.payloadJson,
          createdAt: log.createdAt,
        })),
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao buscar order');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao buscar order',
      });
    }
  });

  // POST /orders/:id/confirm-received - Confirmar recebimento
  app.post('/orders/:id/confirm-received', async (request, reply) => {
    try {
      const { id } = orderParamsSchema.parse(request.params);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          paymentIntents: {
            where: { status: 'FUNDS_IN' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!order) {
        return reply.status(404).send({
          error: 'Order não encontrada',
          message: `Order com ID ${id} não existe`,
        });
      }

      const activeIntent = order.paymentIntents[0];
      if (!activeIntent) {
        return reply.status(400).send({
          error: 'Nenhum pagamento ativo',
          message: 'Order não possui payment intent com status FUNDS_IN',
        });
      }

      const config = getPaymentsConfig();
      const grossAmount = activeIntent.amountBzr;
      const feeAmount = grossAmount.mul(config.feeBps).div(10000);
      const netAmount = grossAmount.sub(feeAmount);

      // Criar log de release request
      const escrowLog = await prisma.escrowLog.create({
        data: {
          orderId: order.id,
          kind: 'RELEASE_REQUEST',
          payloadJson: {
            intentId: activeIntent.id,
            grossAmount: grossAmount.toString(),
            feeAmount: feeAmount.toString(),
            netAmount: netAmount.toString(),
            requestedAt: new Date().toISOString(),
            escrowAddress: activeIntent.escrowAddress,
            sellerAddress: order.sellerAddr,
          },
        },
      });

      return {
        recommendation: {
          releaseToSeller: netAmount.toString(),
          feeToMarketplace: feeAmount.toString(),
          amounts: {
            gross: grossAmount.toString(),
            fee: feeAmount.toString(),
            net: netAmount.toString(),
          },
          addresses: {
            seller: order.sellerAddr,
            escrow: activeIntent.escrowAddress,
          },
        },
        note: 'Operação manual/multisig necessária. Este é apenas um log de solicitação.',
        logId: escrowLog.id,
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao confirmar recebimento');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao confirmar recebimento',
      });
    }
  });

  // POST /orders/:id/cancel - Cancelar order
  app.post('/orders/:id/cancel', async (request, reply) => {
    try {
      const { id } = orderParamsSchema.parse(request.params);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!order) {
        return reply.status(404).send({
          error: 'Order não encontrada',
          message: `Order com ID ${id} não existe`,
        });
      }

      // Verificar se order pode ser cancelada
      const canCancel = !['RELEASED', 'REFUNDED', 'CANCELLED', 'TIMEOUT'].includes(order.status);
      if (!canCancel) {
        return reply.status(400).send({
          error: 'Order não pode ser cancelada',
          message: `Order com status ${order.status} não pode ser cancelada`,
        });
      }

      const activeIntent = order.paymentIntents[0];
      const refundAmount = activeIntent ? activeIntent.amountBzr : order.totalBzr;

      // Criar log de refund request
      const escrowLog = await prisma.escrowLog.create({
        data: {
          orderId: order.id,
          kind: 'REFUND_REQUEST',
          payloadJson: {
            intentId: activeIntent?.id || null,
            refundAmount: refundAmount.toString(),
            requestedAt: new Date().toISOString(),
            buyerAddress: order.buyerAddr,
            reason: 'Order cancelada pelo usuário',
          },
        },
      });

      return {
        recommendation: {
          refundToBuyer: refundAmount.toString(),
          fee: '0',
          addresses: {
            buyer: order.buyerAddr,
          },
        },
        note: 'Operação manual/multisig necessária. Este é apenas um log de solicitação.',
        logId: escrowLog.id,
      };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao cancelar order');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao cancelar order',
      });
    }
  });
}
