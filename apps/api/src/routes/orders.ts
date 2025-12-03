// path: apps/api/src/routes/orders.ts
// @ts-nocheck - Type incompatibilities with Polkadot.js dependencies

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
import { getEscrowCalculator } from '../services/escrow/escrow-calculator.service.js';

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
              select: {
                id: true,
                title: true,
                priceBzr: true,
                daoId: true,
                sellerStoreId: true,
                sellerUserId: true,
                // === Shipping fields (PROPOSAL-000) ===
                estimatedDeliveryDays: true,
                shippingMethod: true,
              } as any,
            });
          } else {
            return await prisma.serviceOffering.findUnique({
              where: { id: item.listingId },
              select: { id: true, title: true, basePriceBzr: true, daoId: true, sellerStoreId: true, sellerUserId: true } as any,
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

      // PROPOSAL-003: Permitir múltiplos vendedores com limite de 5
      const sellers = listings.map(listing => (listing as any).sellerStoreId || listing!.daoId).filter(Boolean);
      const uniqueSellers = [...new Set(sellers)];

      // Limite de 5 lojas por checkout
      const MAX_STORES_PER_CHECKOUT = 5;
      if (uniqueSellers.length > MAX_STORES_PER_CHECKOUT) {
        return reply.status(400).send({
          error: 'Limite de lojas excedido',
          message: `Máximo de ${MAX_STORES_PER_CHECKOUT} lojas por checkout`,
          sellers: uniqueSellers,
          limit: MAX_STORES_PER_CHECKOUT,
        });
      }

      // Para pedido single-store (compatibilidade)
      const sellerKey = uniqueSellers[0] || 'unknown';
      const sellerId = String(sellerKey);

      // PROPOSAL-003: Se múltiplos vendedores, redirecionar para /orders/multi
      if (uniqueSellers.length > 1) {
        return reply.status(400).send({
          error: 'Múltiplos vendedores',
          message: 'Use POST /orders/multi para checkout com múltiplas lojas',
          hint: 'Este endpoint aceita apenas itens de um vendedor',
          sellers: uniqueSellers,
          useEndpoint: '/orders/multi',
        });
      }

      // Buscar o wallet address do vendedor
      // Prioridade: 1) sellerUserId -> User.address, 2) sellerStoreId -> SellerProfile.ownerAddress
      const sellerUserId = (listings[0] as any)?.sellerUserId;
      const sellerStoreId = (listings[0] as any)?.sellerStoreId;
      let sellerAddr = sellerId; // fallback para compatibilidade

      if (sellerUserId) {
        // Buscar via User.address
        const sellerUser = await prisma.user.findUnique({
          where: { id: sellerUserId },
          select: { address: true },
        });
        if (sellerUser?.address) {
          sellerAddr = sellerUser.address;
        }
      } else if (sellerStoreId) {
        // Buscar via SellerProfile.ownerAddress
        const sellerProfile = await (prisma as any).sellerProfile.findUnique({
          where: { id: sellerStoreId },
          select: { ownerAddress: true },
        });
        if (sellerProfile?.ownerAddress) {
          sellerAddr = sellerProfile.ownerAddress;
        }
      }

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

      // Extrair shipping fields do primeiro produto (MVP: 1 vendedor)
      const firstProduct = listings.find(l => body.items.find(i => i.listingId === l?.id)?.kind === 'product');
      // PROPOSAL-001: Use || instead of ?? to handle explicit null values
      const estimatedDeliveryDays = (firstProduct as any)?.estimatedDeliveryDays || 7;
      const shippingMethod = (firstProduct as any)?.shippingMethod || null;

      // PROPOSAL-001: Calculate dynamic auto-release blocks based on delivery estimate
      const escrowCalculator = getEscrowCalculator();
      const escrowTimeline = escrowCalculator.getEscrowTimeline(estimatedDeliveryDays, shippingMethod);

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
          // === Shipping fields (PROPOSAL-000) - copiado do produto ===
          estimatedDeliveryDays,
          shippingMethod,
          // === Delivery-Aware Escrow (PROPOSAL-001) ===
          autoReleaseBlocks: escrowTimeline.autoReleaseBlocks,
          estimatedDeliveryDate: escrowTimeline.autoReleaseDate,
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
        // Blockchain reference for escrow operations
        blockchainOrderId: order.blockchainOrderId ? order.blockchainOrderId.toString() : null,
        blockchainTxHash: order.blockchainTxHash,
        // === Shipping fields (PROPOSAL-000) ===
        estimatedDeliveryDays: (order as any).estimatedDeliveryDays,
        shippingMethod: (order as any).shippingMethod,
        shippedAt: (order as any).shippedAt,
        trackingCode: (order as any).trackingCode,
        // === Delivery-Aware Escrow (PROPOSAL-001) ===
        autoReleaseBlocks: (order as any).autoReleaseBlocks,
        estimatedDeliveryDate: (order as any).estimatedDeliveryDate,
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

  // POST /orders/:id/confirm-release - Confirmar release feito pelo frontend
  // Este endpoint é chamado após o usuário assinar e enviar a tx de release no frontend.
  // Apenas atualiza o DB, não tenta fazer release on-chain (já foi feito pelo usuário).
  const confirmReleaseBodySchema = z.object({
    txHash: z.string().min(1),
    blockNumber: z.string().optional(),
  });

  app.post('/orders/:id/confirm-release', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { id } = orderParamsSchema.parse(request.params);
      const { txHash, blockNumber } = confirmReleaseBodySchema.parse(request.body);

      const authUser = (request as any).authUser as { sub: string; address: string };

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

      // Verificar que caller é o buyer
      if (order.buyerAddr !== authUser.address) {
        return reply.status(403).send({
          error: 'Não autorizado',
          message: 'Apenas o comprador pode confirmar o release',
        });
      }

      // Verificar se order pode ser confirmada como released (deve estar SHIPPED ou ESCROWED)
      const canConfirm = ['SHIPPED', 'ESCROWED'].includes(order.status);
      if (!canConfirm) {
        return reply.status(400).send({
          error: 'Order não pode ser confirmada',
          message: `Order com status ${order.status} não pode ser confirmada como released`,
          currentStatus: order.status,
        });
      }

      // Atualizar status para RELEASED
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: 'RELEASED',
        },
      });

      // Update PaymentIntent with release tx hash
      if (order.paymentIntents[0]) {
        await prisma.paymentIntent.update({
          where: { id: order.paymentIntents[0].id },
          data: {
            txHashRelease: txHash,
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
          kind: 'RELEASE',
          payloadJson: {
            intentId: activeIntent?.id || null,
            releaseToSeller: netAmount.toString(),
            feeToMarketplace: feeAmount.toString(),
            statusChangedAt: new Date().toISOString(),
            sellerAddress: order.sellerAddr,
            buyerAddress: order.buyerAddr,
            txHash,
            blockNumber: blockNumber || null,
            source: 'user_signed', // Indica que foi assinado pelo usuário no frontend
          },
        },
      });

      app.log.info({
        orderId: order.id,
        sellerStoreId: order.sellerStoreId,
        previousStatus: order.status,
        newStatus: 'RELEASED',
        txHash,
        source: 'user_signed',
      }, 'Order release confirmado pelo frontend');

      // Gatilho imediato de reputação on-chain
      if (order.sellerStoreId) {
        try {
          await runReputationSync(prisma, { logger: app.log });
        } catch (err) {
          app.log.warn({ err, orderId: order.id }, 'Falha ao atualizar reputação');
        }
      }

      // Rewards: Trigger afterOrderCompleted hook
      const buyer = await prisma.user.findUnique({
        where: { address: order.buyerAddr },
        select: { id: true },
      });

      if (buyer) {
        const orderTotalBzr = order.totalBzr.toString();
        await afterOrderCompleted(prisma, buyer.id, order.id, orderTotalBzr).catch((err) => {
          app.log.error({ err, orderId: order.id }, 'Falha ao processar rewards');
        });
      }

      return reply.send({
        success: true,
        order: updated,
        txHash,
        blockNumber: blockNumber || null,
        message: 'Release confirmado com sucesso',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao confirmar release');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao confirmar release',
      });
    }
  });

  // POST /orders/:id/ship - Marcar pedido como enviado (PROPOSAL-000)
  const shipOrderBodySchema = z.object({
    trackingCode: z.string().optional(),
  });

  app.post('/orders/:id/ship', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { id: orderId } = orderParamsSchema.parse(request.params);
      const body = shipOrderBodySchema.parse(request.body || {});

      const authUser = (request as any).authUser as { sub: string; address: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // 1. Buscar order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // 2. Verificar se usuário é o vendedor
      // BUGFIX: walletAddress está em User.address, não em Profile
      const user = await prisma.user.findUnique({
        where: { id: authUser.sub },
        select: { id: true, address: true },
      });

      const isSeller = order.sellerAddr === user?.address;
      if (!isSeller) {
        return reply.status(403).send({
          error: 'Unauthorized',
          message: 'Apenas o vendedor pode marcar o pedido como enviado',
        });
      }

      // 3. Verificar se order pode ser enviada (deve estar ESCROWED)
      if (order.status !== 'ESCROWED') {
        return reply.status(400).send({
          error: 'Order não pode ser marcada como enviada',
          message: `Order com status ${order.status} não pode ser enviada. Status permitido: ESCROWED`,
          currentStatus: order.status,
        });
      }

      // 4. Atualizar order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'SHIPPED',
          shippedAt: new Date(),
          trackingCode: body.trackingCode || null,
        },
      });

      // 5. Criar log
      await prisma.escrowLog.create({
        data: {
          orderId,
          kind: 'SHIPPED',
          payloadJson: {
            shippedAt: updatedOrder.shippedAt?.toISOString(),
            trackingCode: body.trackingCode || null,
            shippedBy: user?.id,
            timestamp: new Date().toISOString(),
          },
        },
      });

      app.log.info({
        orderId,
        trackingCode: body.trackingCode,
        shippedAt: updatedOrder.shippedAt,
      }, 'Order marcada como enviada');

      // 6. TODO: Notificar comprador
      // await notificationService.notify(order.buyerAddr, 'ORDER_SHIPPED', { orderId, trackingCode });

      return reply.send({
        success: true,
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          shippedAt: updatedOrder.shippedAt,
          trackingCode: updatedOrder.trackingCode,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Parâmetros inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao marcar order como enviada');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao marcar order como enviada',
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

  // ============================================
  // PROPOSAL-003: Multi-Store Checkout
  // POST /orders/multi - Criar múltiplos pedidos de diferentes lojas
  // ============================================
  const createMultiOrderSchema = z.object({
    shippingAddress: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().min(1),
      country: z.string().min(1),
    }),
    stores: z.array(z.object({
      sellerId: z.string(),
      items: z.array(z.object({
        listingId: z.string().uuid(),
        qty: z.number().int().min(1),
        kind: z.enum(['product', 'service']),
        shippingOptionId: z.string().optional(),
      })).min(1),
      shippingOptionId: z.string().optional(),
    })).min(1).max(5), // Limite de 5 lojas
    notes: z.string().optional(),
  });

  app.post('/orders/multi', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const body = createMultiOrderSchema.parse(request.body);

      const authUser = (request as any).authUser as { sub: string; address: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const buyerAddr = authUser.address;
      const userId = authUser.sub;

      // Criar CheckoutSession
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
      let grandTotalBzr = BigInt(0);

      // Processar cada loja e criar um pedido
      const createdOrders: Array<{
        orderId: string;
        sellerId: string;
        sellerName: string;
        subtotalBzr: string;
        shippingBzr: string;
        totalBzr: string;
        estimatedDeliveryDays: number;
      }> = [];

      // Primeiro, validar todos os itens de todas as lojas
      for (const storeData of body.stores) {
        for (const item of storeData.items) {
          const listing = item.kind === 'product'
            ? await prisma.product.findUnique({ where: { id: item.listingId } })
            : await prisma.serviceOffering.findUnique({ where: { id: item.listingId } });

          if (!listing) {
            return reply.status(404).send({
              error: 'Item não encontrado',
              message: `${item.kind} com ID ${item.listingId} não existe`,
              sellerId: storeData.sellerId,
            });
          }
        }
      }

      // Criar CheckoutSession
      const checkoutSession = await prisma.checkoutSession.create({
        data: {
          buyerAddr,
          status: 'PENDING',
          totalBzr: '0', // Será atualizado após criar os pedidos
          expiresAt,
        },
      });

      // Criar um pedido para cada loja
      for (const storeData of body.stores) {
        // Carregar dados dos produtos/serviços
        const listings = await Promise.all(
          storeData.items.map(async (item) => {
            if (item.kind === 'product') {
              return await prisma.product.findUnique({
                where: { id: item.listingId },
                select: {
                  id: true,
                  title: true,
                  priceBzr: true,
                  daoId: true,
                  sellerStoreId: true,
                  sellerUserId: true,
                  estimatedDeliveryDays: true,
                  shippingMethod: true,
                } as any,
              });
            } else {
              return await prisma.serviceOffering.findUnique({
                where: { id: item.listingId },
                select: { id: true, title: true, basePriceBzr: true, daoId: true, sellerStoreId: true, sellerUserId: true } as any,
              });
            }
          })
        );

        // Identificar vendedor
        const sellerStoreId = (listings[0] as any)?.sellerStoreId;
        const sellerUserId = (listings[0] as any)?.sellerUserId;
        const sellerId = sellerStoreId || (listings[0] as any)?.daoId || storeData.sellerId;
        let sellerAddr = sellerId;
        let sellerName = sellerId;

        // Buscar wallet do vendedor
        if (sellerUserId) {
          const sellerUser = await prisma.user.findUnique({
            where: { id: sellerUserId },
            select: { address: true },
          });
          if (sellerUser?.address) {
            sellerAddr = sellerUser.address;
          }
        } else if (sellerStoreId) {
          const sellerProfile = await (prisma as any).sellerProfile.findUnique({
            where: { id: sellerStoreId },
            select: { ownerAddress: true, shopName: true },
          });
          if (sellerProfile?.ownerAddress) {
            sellerAddr = sellerProfile.ownerAddress;
          }
          if (sellerProfile?.shopName) {
            sellerName = sellerProfile.shopName;
          }
        }

        // Calcular valores
        let subtotalBzr = BigInt(0);
        const orderItems = storeData.items.map((item, index) => {
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
            shippingOptionId: item.shippingOptionId || storeData.shippingOptionId || null,
          };
        });

        // Calcular frete (stub: 10 BZR por loja)
        const shippingBzr = 10n * (10n ** 12n);
        const totalBzr = subtotalBzr + shippingBzr;
        grandTotalBzr += totalBzr;

        // Extrair shipping fields
        const firstProduct = listings.find(l => storeData.items.find(i => i.listingId === l?.id)?.kind === 'product');
        const estimatedDeliveryDays = (firstProduct as any)?.estimatedDeliveryDays || 7;
        const shippingMethod = (firstProduct as any)?.shippingMethod || null;

        // Calcular escrow timeline
        const escrowCalculator = getEscrowCalculator();
        const escrowTimeline = escrowCalculator.getEscrowTimeline(estimatedDeliveryDays, shippingMethod);

        // Criar order
        const order = await prisma.order.create({
          data: ({
            buyerAddr,
            sellerAddr,
            sellerId,
            sellerStoreId: sellerStoreId ?? null,
            subtotalBzr: subtotalBzr.toString(),
            shippingBzr: shippingBzr.toString(),
            totalBzr: totalBzr.toString(),
            status: 'PENDING_BLOCKCHAIN',
            shippingAddress: body.shippingAddress as any,
            shippingOptionId: storeData.shippingOptionId || 'STD',
            notes: body.notes || null,
            estimatedDeliveryDays,
            shippingMethod,
            autoReleaseBlocks: escrowTimeline.autoReleaseBlocks,
            estimatedDeliveryDate: escrowTimeline.autoReleaseDate,
            checkoutSessionId: checkoutSession.id,
            items: {
              create: orderItems,
            },
          } as any),
          include: { items: true },
        });

        createdOrders.push({
          orderId: order.id,
          sellerId,
          sellerName,
          subtotalBzr: subtotalBzr.toString(),
          shippingBzr: shippingBzr.toString(),
          totalBzr: totalBzr.toString(),
          estimatedDeliveryDays,
        });

        app.log.info({
          orderId: order.id,
          sellerId,
          checkoutSessionId: checkoutSession.id,
        }, 'Order criada para multi-store checkout');
      }

      // Atualizar total da CheckoutSession
      await prisma.checkoutSession.update({
        where: { id: checkoutSession.id },
        data: { totalBzr: grandTotalBzr.toString() },
      });

      // Processar rewards
      await afterOrderCreated(prisma, userId, createdOrders[0].orderId).catch((err) => {
        app.log.error({ err }, 'Falha ao processar rewards após multi-order');
      });

      // Retornar resposta
      const payload = {
        checkoutSessionId: checkoutSession.id,
        orders: createdOrders,
        grandTotalBzr: grandTotalBzr.toString(),
        paymentInstructions: {
          method: 'BATCH_ESCROW',
          escrowCalls: createdOrders.map(o => ({
            orderId: o.orderId,
            amount: o.totalBzr,
            seller: o.sellerId,
          })),
        },
        expiresAt: expiresAt.toISOString(),
      };

      return payload;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao criar multi-order');
      return reply.status(500).send({
        error: 'Erro interno do servidor',
        message: 'Falha ao criar pedidos',
      });
    }
  });
}
