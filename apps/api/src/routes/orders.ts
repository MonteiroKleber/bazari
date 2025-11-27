// path: apps/api/src/routes/orders.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getPaymentsConfig } from '../config/payments.js';
import { runReputationSync } from '../workers/reputation.worker.js';
import { createDeliveryRequestForOrder } from '../lib/deliveryRequestHelper.js';
import { calculateDeliveryFee, estimatePackageDetails } from '../lib/deliveryCalculator.js';
import { addressSchema } from '../lib/addressValidator.js';
import { env } from '../env.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import { afterOrderCreated, afterOrderCompleted } from '../services/gamification/order-hooks.js';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';

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
  app.post('/orders', { preHandler: authOnRequest }, async (request, reply) => {
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

      // Obter endereço do comprador do auth/session
      const authUser = (request as any).authUser as { sub: string; address: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const buyerAddr = authUser.address; // Wallet address do usuário autenticado

      // Carregar dados dos produtos/serviços para fazer snapshots
      const listings = await Promise.all(
        body.items.map(async (item) => {
          if (item.kind === 'product') {
            return await prisma.product.findUnique({
              where: { id: item.listingId },
              select: { id: true, title: true, priceBzr: true, daoId: true, sellerStoreId: true } as any,
            });
          } else {
            return await prisma.serviceOffering.findUnique({
              where: { id: item.listingId },
              select: { id: true, title: true, basePriceBzr: true, daoId: true, sellerStoreId: true } as any,
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

      // Verificar regra MVP: 1 vendedor (loja) apenas
      const sellers = listings.map(listing => (listing as any).sellerStoreId || listing!.daoId).filter(Boolean);
      const uniqueSellers = [...new Set(sellers)];

      if (uniqueSellers.length > 1) {
        return reply.status(400).send({
          error: 'Múltiplos vendedores',
          message: 'MVP permite apenas itens de um vendedor por pedido',
          sellers: uniqueSellers,
        });
      }

      const sellerKey = uniqueSellers[0] || 'unknown';
      const sellerId = String(sellerKey);
      const sellerAddr = sellerId; // compat

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

      // Criar order com items - status inicial PENDING_BLOCKCHAIN
      // Worker fará retry se blockchain falhar
      const order = await prisma.order.create({
        data: ({
          buyerAddr,
          sellerAddr,
          sellerId,
          sellerStoreId: (listings[0] as any)?.sellerStoreId ?? null,
          subtotalBzr: subtotalBzr.toString(),
          shippingBzr: shippingBzr.toString(),
          totalBzr: totalBzr.toString(),
          status: 'PENDING_BLOCKCHAIN', // Status intermediário até sync on-chain
          shippingAddress: (body.shippingAddress as any) ?? null,
          shippingOptionId: body.shippingOptionId || 'STD',
          notes: body.notes || null,
          items: {
            create: orderItems,
          },
        } as any),
        include: { items: true },
      });

      // ============================================
      // Blockchain: Criar order on-chain (bazari-commerce)
      // Estratégia: Tenta criar on-chain, se falhar marca para retry pelo worker
      // ============================================
      let blockchainSuccess = false;
      try {
        const blockchainService = BlockchainService.getInstance();

        // Preparar items no formato do pallet
        const blockchainItems = (order as any).items.map((item: any) => ({
          listingId: item.listingId || null,
          name: item.titleSnapshot || 'Item',
          qty: item.qty,
          price: decimalToPlanck(item.unitPriceBzrSnapshot),
        }));

        // Determinar marketplace ID (usar 0 para marketplace principal)
        const marketplaceId = 0;

        const escrowAccount = blockchainService.getEscrowAccount();

        const blockchainResult = await blockchainService.createOrder(
          order.buyerAddr,           // buyer
          order.sellerAddr,          // seller
          marketplaceId,             // marketplace
          blockchainItems,           // items
          decimalToPlanck(order.totalBzr), // totalAmount
          escrowAccount              // signer (backend)
        );

        // Sucesso: Atualizar order com referência blockchain e status CREATED
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CREATED', // Pronto para pagamento
            blockchainOrderId: blockchainResult.orderId ? BigInt(blockchainResult.orderId) : null,
            blockchainTxHash: blockchainResult.txHash,
            lastSyncedAt: new Date(),
            blockchainError: null,
          },
        });

        blockchainSuccess = true;
        app.log.info({
          orderId: order.id,
          blockchainOrderId: blockchainResult.orderId,
          txHash: blockchainResult.txHash,
        }, 'Order criada on-chain (bazari-commerce)');

      } catch (blockchainError) {
        // Falha: Marcar para retry pelo worker
        const errorMessage = blockchainError instanceof Error ? blockchainError.message : 'Unknown blockchain error';

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'BLOCKCHAIN_FAILED',
            blockchainRetries: 1,
            blockchainError: errorMessage,
          },
        });

        app.log.error({
          err: blockchainError,
          orderId: order.id,
        }, 'Falha ao criar order on-chain - marcada para retry pelo worker');
      }

      // ============================================
      // Auto-criar DeliveryRequest se tiver endereço
      // ============================================
      if (order.shippingAddress && env.FEATURE_AUTO_CREATE_DELIVERY) {
        try {
          const deliveryResult = await createDeliveryRequestForOrder(
            prisma,
            order.id
          );

          if (deliveryResult) {
            app.log.info(
              {
                orderId: order.id,
                deliveryRequestId: deliveryResult.deliveryRequestId,
                deliveryFeeBzr: deliveryResult.deliveryFeeBzr,
              },
              'DeliveryRequest criado automaticamente'
            );
          }
        } catch (err) {
          // Não falhar o Order se delivery der erro
          app.log.error(
            {
              err,
              orderId: order.id,
            },
            'Erro ao criar DeliveryRequest, Order criado normalmente'
          );
        }
      }

      // ============================================
      // Rewards: Trigger afterOrderCreated hook
      // ============================================
      const userId = authUser.sub; // User.id do usuário autenticado
      await afterOrderCreated(prisma, userId, order.id).catch((err) => {
        app.log.error(
          {
            err,
            orderId: order.id,
            userId,
          },
          'Falha ao processar rewards após criação de order'
        );
      });

      const oany: any = order as any;
      const payload = {
        orderId: order.id,
        status: order.status,
        totals: {
          subtotalBzr: order.subtotalBzr,
          shippingBzr: order.shippingBzr,
          totalBzr: order.totalBzr,
        },
        items: (oany.items as any[]).map((item: any) => ({
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

  /**
   * POST /orders/estimate-shipping - Estimar frete antes de finalizar pedido
   */
  app.post('/orders/estimate-shipping', async (request, reply) => {
    try {
      const body = z
        .object({
          sellerStoreId: z.string().uuid(),
          deliveryAddress: addressSchema,
          items: z.array(
            z.object({
              listingId: z.string().uuid(),
              qty: z.number().int().min(1),
              kind: z.enum(['product', 'service']),
            })
          ),
        })
        .parse(request.body);

      // Buscar loja
      const store = await prisma.sellerProfile.findUnique({
        where: { id: body.sellerStoreId },
        select: { pickupAddress: true, shopName: true },
      });

      if (!store) {
        return reply.status(404).send({
          error: 'Loja não encontrada',
        });
      }

      if (!store.pickupAddress) {
        return reply.status(400).send({
          error: 'Loja não configurada para entrega',
          message: 'A loja não possui endereço de coleta cadastrado',
        });
      }

      // Estimar características do pacote
      const packageDetails = estimatePackageDetails(body.items);

      // Calcular frete
      const feeResult = await calculateDeliveryFee({
        pickupAddress: store.pickupAddress as any,
        deliveryAddress: body.deliveryAddress,
        packageType: packageDetails.packageType,
        weight: packageDetails.weight,
      });

      return reply.send({
        deliveryFeeBzr: feeResult.totalBzr,
        distance: feeResult.distance,
        estimatedTimeMinutes: feeResult.estimatedTimeMinutes,
        breakdown: feeResult.breakdown,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao estimar frete');
      return reply.status(500).send({
        error: 'Erro ao estimar frete',
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

  // POST /orders/:id/release - Liberar order (seller confirma entrega)
  app.post('/orders/:id/release', async (request, reply) => {
    try {
      const { id } = orderParamsSchema.parse(request.params);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
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

      // Verificar se order pode ser liberada (deve estar SHIPPED ou ESCROWED)
      const canRelease = ['SHIPPED', 'ESCROWED'].includes(order.status);
      if (!canRelease) {
        return reply.status(400).send({
          error: 'Order não pode ser liberada',
          message: `Order com status ${order.status} não pode ser liberada. Status permitidos: SHIPPED, ESCROWED`,
          currentStatus: order.status,
        });
      }

      // ============================================
      // Blockchain: Release funds from escrow on-chain
      // ============================================
      let blockchainTxHash: string | null = null;
      let blockchainBlockNumber: string | null = null;

      try {
        const blockchainService = BlockchainService.getInstance();
        const api = await blockchainService.getApi();

        // Check if escrow exists on-chain
        const escrowData = await api.query.bazariEscrow.escrows(id);

        if (escrowData && !escrowData.isEmpty) {
          const escrow = escrowData.unwrap ? escrowData.unwrap() : escrowData;
          const escrowStatus = escrow.status?.toString?.() || '';

          // Only release if escrow is in Locked status
          if (escrowStatus === 'Locked') {
            const serverKey = blockchainService.getEscrowAccount();
            const tx = api.tx.bazariEscrow.releaseFunds(id);
            const result = await blockchainService.signAndSend(tx, serverKey);

            blockchainTxHash = result.txHash;
            blockchainBlockNumber = result.blockNumber?.toString() || null;

            app.log.info({
              orderId: id,
              txHash: blockchainTxHash,
              blockNumber: blockchainBlockNumber,
            }, 'Escrow released on-chain');
          } else {
            app.log.info({
              orderId: id,
              escrowStatus,
            }, 'Escrow not in Locked status, skipping on-chain release');
          }
        } else {
          app.log.info({
            orderId: id,
          }, 'No escrow found on-chain for this order, skipping blockchain release');
        }
      } catch (blockchainError) {
        // Log error but continue with DB update - on-chain state may already be correct
        app.log.error({
          err: blockchainError,
          orderId: id,
        }, 'Failed to release escrow on-chain (continuing with DB update)');
      }

      // Atualizar status para RELEASED
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: 'RELEASED',
        },
      });

      // Update PaymentIntent with release tx hash if available
      if (blockchainTxHash && order.paymentIntents[0]) {
        await prisma.paymentIntent.update({
          where: { id: order.paymentIntents[0].id },
          data: {
            txHashRelease: blockchainTxHash,
            status: 'RELEASED',
          },
        });
      }

      // Criar log de release
      const config = getPaymentsConfig();
      const activeIntent = order.paymentIntents[0];
      const grossAmount = activeIntent ? activeIntent.amountBzr : order.totalBzr;
      const feeAmount = grossAmount.mul(config.feeBps).div(10000);
      const netAmount = grossAmount.sub(feeAmount);

      await prisma.escrowLog.create({
        data: {
          orderId: order.id,
          kind: blockchainTxHash ? 'RELEASE' : 'RELEASE_REQUEST',
          payloadJson: {
            intentId: activeIntent?.id || null,
            releaseToSeller: netAmount.toString(),
            feeToMarketplace: feeAmount.toString(),
            statusChangedAt: new Date().toISOString(),
            sellerAddress: order.sellerAddr,
            // Blockchain info (if release was on-chain)
            txHash: blockchainTxHash,
            blockNumber: blockchainBlockNumber,
            source: blockchainTxHash ? 'blockchain' : 'manual',
          },
        },
      });

      app.log.info({
        orderId: order.id,
        sellerStoreId: order.sellerStoreId,
        previousStatus: order.status,
        newStatus: 'RELEASED'
      }, 'Order liberada com sucesso');

      // Gatilho imediato de reputação on-chain
      if (order.sellerStoreId) {
        try {
          await runReputationSync(prisma, { logger: app.log });
          app.log.info({
            orderId: order.id,
            sellerStoreId: order.sellerStoreId
          }, 'Reputação atualizada imediatamente após RELEASED');
        } catch (err) {
          app.log.warn({
            err,
            orderId: order.id,
            sellerStoreId: order.sellerStoreId
          }, 'Falha ao atualizar reputação imediata - worker periódico atualizará');
        }
      }

      // ============================================
      // Rewards: Trigger afterOrderCompleted hook
      // ============================================
      // Buscar userId real do buyerAddr (wallet → User.id)
      const buyer = await prisma.user.findUnique({
        where: { address: order.buyerAddr },
        select: { id: true },
      });

      if (buyer) {
        const orderTotalBzr = order.totalBzr.toString();
        await afterOrderCompleted(prisma, buyer.id, order.id, orderTotalBzr).catch((err) => {
          app.log.error(
            {
              err,
              orderId: order.id,
              userId: buyer.id,
            },
            'Falha ao processar rewards após completar order'
          );
        });
      } else {
        app.log.warn(
          {
            orderId: order.id,
            buyerAddr: order.buyerAddr,
          },
          'User não encontrado para processar rewards - pulando hook afterOrderCompleted'
        );
      }

      return reply.send({
        order: updated,
        recommendation: {
          releaseToSeller: netAmount.toString(),
          feeToMarketplace: feeAmount.toString(),
          amounts: {
            gross: grossAmount.toString(),
            net: netAmount.toString(),
            fee: feeAmount.toString(),
          },
          addresses: {
            seller: order.sellerAddr,
          },
        },
        note: 'Order liberada. Operação on-chain manual/multisig se necessário.',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao liberar order');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao liberar order',
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
