import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { prisma } from '../../lib/prisma';
import { commissionService } from '../services/commission';
import { reputationService } from '../services/reputation';
import { chatService } from '../services/chat';

// ============= Multi-Store Helpers =============

interface ProposalItem {
  sku: string;
  name: string;
  qty: number;
  price: string;
}

interface StoreGroup {
  storeId: number;
  storeName: string;
  items: ProposalItem[];
  subtotal: number;
  shipping?: { method: string; price: number };
  total: number;
  commissionPercent: number;
}

/**
 * Agrupar produtos por loja
 */
async function groupProductsByStore(
  items: ProposalItem[]
): Promise<Map<string, ProposalItem[]>> {
  const productsByStore = new Map<string, ProposalItem[]>();

  // Buscar todos os produtos de uma vez
  const productIds = items.map(item => item.sku);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      sellerStoreId: true,
    },
  });

  // Criar map de productId → sellerStoreId
  const productStoreMap = new Map<string, string | null>();
  for (const product of products) {
    productStoreMap.set(product.id, product.sellerStoreId);
  }

  // Agrupar items por loja
  for (const item of items) {
    const storeId = productStoreMap.get(item.sku);
    if (!storeId) {
      throw new Error(`Product ${item.sku} not found or has no store`);
    }

    if (!productsByStore.has(storeId)) {
      productsByStore.set(storeId, []);
    }
    productsByStore.get(storeId)!.push(item);
  }

  return productsByStore;
}

// OTIMIZAÇÃO: Cache de políticas de comissão (5 minutos)
const policyCache = new Map<string, { policy: any; timestamp: number }>();
const POLICY_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Criar grupos por loja com validação de política
 * OTIMIZADO: Batch queries para evitar N+1
 */
async function createStoreGroups(
  productsByStore: Map<string, ProposalItem[]>,
  sellerId: string,
  myStoreId: string | null
): Promise<StoreGroup[]> {
  const startTime = Date.now();
  const storeGroups: StoreGroup[] = [];

  // OTIMIZAÇÃO: Buscar todas as lojas de uma vez
  const storeIds = Array.from(productsByStore.keys());
  const stores = await prisma.sellerProfile.findMany({
    where: { id: { in: storeIds } },
    select: {
      id: true,
      shopName: true,
      onChainStoreId: true,
      userId: true,
    },
  });

  const storeMap = new Map(stores.map((s) => [s.id, s]));

  // OTIMIZAÇÃO: Buscar todas as políticas de uma vez
  const onChainStoreIds = stores
    .filter((s) => s.onChainStoreId)
    .map((s) => s.onChainStoreId!);

  const policies = await prisma.storeCommissionPolicy.findMany({
    where: { storeId: { in: onChainStoreIds } },
  });

  const policyMap = new Map(policies.map((p) => [Number(p.storeId), p]));

  console.log(`[Create Store Groups] Loaded ${stores.length} stores and ${policies.length} policies in ${Date.now() - startTime}ms`);

  for (const [storeId, storeItems] of productsByStore) {
    const store = storeMap.get(storeId);

    if (!store || !store.onChainStoreId) {
      throw new Error(`Store ${storeId} not found or not synced`);
    }

    // Determinar comissão
    let commissionPercent = 5; // default

    if (myStoreId && myStoreId === storeId) {
      // É dono da loja: 0% comissão
      commissionPercent = 0;
    } else {
      // É promotor: usar política do mapa (já carregada em batch)
      const policy = policyMap.get(Number(store.onChainStoreId));

      if (policy) {
        // Validar acesso baseado no modo
        if (policy.mode === 'followers') {
          const storeOwnerProfile = await prisma.profile.findUnique({
            where: { userId: store.userId },
            select: { id: true },
          });

          if (storeOwnerProfile) {
            const isFollowing = await prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: sellerId,
                  followingId: storeOwnerProfile.id,
                },
              },
            });

            if (!isFollowing) {
              throw new Error(`Must follow store "${store.shopName}" to promote it`);
            }
          }
        }

        if (policy.mode === 'affiliates') {
          const affiliate = await prisma.chatStoreAffiliate.findUnique({
            where: {
              storeId_promoterId: {
                storeId: store.onChainStoreId,
                promoterId: sellerId,
              },
            },
          });

          if (!affiliate || affiliate.status !== 'approved') {
            throw new Error(`Must be approved affiliate of store "${store.shopName}"`);
          }

          // Usar comissão customizada ou da política
          commissionPercent = affiliate.customCommission ?? policy.percent;

          // Validar cap mensal se configurado
          if (affiliate.monthlySalesCap) {
            const thisMonthSales = await getAffiliateMonthSales(sellerId);
            const storeSubtotal = storeItems.reduce(
              (sum, item) => sum + parseFloat(item.price) * item.qty,
              0
            );
            const capLimit = parseFloat(affiliate.monthlySalesCap.toString());

            if (thisMonthSales + storeSubtotal > capLimit) {
              throw new Error(
                `Monthly sales cap reached for "${store.shopName}". Limit: ${capLimit}, Current: ${thisMonthSales}`
              );
            }
          }
        } else {
          // open mode ou outros
          commissionPercent = policy.percent;
        }

        // Validar reputação mínima
        if (policy.minReputation) {
          const promoterProfile = await prisma.profile.findUnique({
            where: { id: sellerId },
            select: { reputationScore: true },
          });

          if (promoterProfile && promoterProfile.reputationScore < policy.minReputation) {
            throw new Error(
              `Minimum reputation ${policy.minReputation} required for store "${store.shopName}"`
            );
          }
        }
      }
    }

    // Calcular subtotal da loja
    const subtotal = storeItems.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.qty,
      0
    );

    storeGroups.push({
      storeId: Number(store.onChainStoreId),
      storeName: store.shopName,
      items: storeItems,
      subtotal,
      total: subtotal, // Sem frete por enquanto
      commissionPercent,
    });
  }

  const totalTime = Date.now() - startTime;
  console.log(`[Create Store Groups] Created ${storeGroups.length} groups in ${totalTime}ms total`);

  return storeGroups;
}

/**
 * Calcular vendas do mês atual de um afiliado específico
 */
async function getAffiliateMonthSales(affiliateId: string): Promise<number> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartTimestamp = BigInt(firstDayOfMonth.getTime());

  const sales = await prisma.chatSale.findMany({
    where: {
      promoter: affiliateId,
      status: 'split',
      createdAt: {
        gte: monthStartTimestamp,
      },
    },
    select: {
      amount: true,
    },
  });

  const total = sales.reduce((sum, sale) => {
    return sum + parseFloat(sale.amount.toString());
  }, 0);

  return total;
}

// ============= Checkout Helpers =============

interface SaleResult {
  saleId: string;
  storeId: number;
  storeName?: string;
  amount: string;
  txHash?: string;
  receiptNftCid?: string;
  status: string;
}

/**
 * Processar checkout multi-loja
 */
async function checkoutMultiStore(
  proposal: any,
  buyerId: string,
  promoterId?: string
): Promise<{ sales: SaleResult[]; failedCount: number }> {
  const startTime = Date.now();
  const storeGroups = proposal.storeGroups as StoreGroup[];

  // OTIMIZAÇÃO 1: Buscar todas as lojas de uma vez (evitar N+1)
  const storeIds = storeGroups.map((g) => BigInt(g.storeId));
  const stores = await prisma.sellerProfile.findMany({
    where: { onChainStoreId: { in: storeIds } },
    select: {
      onChainStoreId: true,
      userId: true,
      shopName: true,
      user: {
        select: {
          profile: {
            select: { id: true },
          },
        },
      },
    },
  });

  // Criar mapa para lookup rápido
  const storeMap = new Map(
    stores.map((s) => [
      Number(s.onChainStoreId),
      {
        userId: s.userId,
        shopName: s.shopName,
        profileId: s.user?.profile?.id,
      },
    ])
  );

  console.log(`[Multi-Store Checkout] Loaded ${stores.length} stores in ${Date.now() - startTime}ms`);

  // OTIMIZAÇÃO 2: Processar todos os splits em paralelo
  const salePromises = storeGroups.map(async (group) => {
    const splitStartTime = Date.now();

    try {
      const storeData = storeMap.get(group.storeId);

      if (!storeData || !storeData.profileId) {
        throw new Error(`Store ${group.storeId} or seller profile not found`);
      }

      // Processar split para esta loja
      const saleResult = await commissionService.settleSale({
        proposalId: proposal.id,
        storeId: group.storeId,
        buyer: buyerId,
        seller: storeData.profileId,
        promoter: promoterId || proposal.sellerId,
        amount: group.total.toString(),
        commissionPercent: group.commissionPercent,
      });

      const splitTime = Date.now() - splitStartTime;
      console.log(`[Multi-Store Checkout] Store ${group.storeId} split completed in ${splitTime}ms`);

      return {
        saleId: saleResult.saleId,
        storeId: group.storeId,
        storeName: group.storeName,
        amount: saleResult.amount,
        txHash: saleResult.txHash,
        receiptNftCid: saleResult.receiptNftCid,
        status: 'success',
      } as SaleResult;
    } catch (error: any) {
      const splitTime = Date.now() - splitStartTime;
      console.error(
        `[Multi-Store Checkout] Store ${group.storeId} failed after ${splitTime}ms:`,
        error.message
      );

      return {
        saleId: '',
        storeId: group.storeId,
        storeName: group.storeName,
        amount: group.total.toString(),
        status: 'failed',
      } as SaleResult;
    }
  });

  // Aguardar todos os splits
  const sales = await Promise.all(salePromises);

  // Contar falhas
  const failedCount = sales.filter((s) => s.status === 'failed').length;
  const successfulSales = sales.filter((s) => s.status === 'success');

  const totalTime = Date.now() - startTime;
  console.log(
    `[Multi-Store Checkout] Completed ${successfulSales.length}/${storeGroups.length} stores in ${totalTime}ms` +
    ` (${failedCount} failed)`
  );

  return { sales: successfulSales, failedCount };
}

/**
 * Processar checkout single-store (lógica original)
 */
async function checkoutSingleStore(
  proposal: any,
  buyerId: string,
  storeId: number,
  promoterId?: string
): Promise<SaleResult> {
  // Processar venda única
  const saleResult = await commissionService.settleSale({
    proposalId: proposal.id,
    storeId,
    buyer: buyerId,
    seller: proposal.sellerId,
    promoter: promoterId,
    amount: proposal.total.toString(),
    commissionPercent: proposal.commissionPercent,
  });

  return {
    saleId: saleResult.saleId,
    storeId,
    amount: saleResult.amount,
    txHash: saleResult.txHash,
    receiptNftCid: saleResult.receiptNftCid,
    status: 'success',
  };
}

export default async function chatOrdersRoutes(app: FastifyInstance) {
  // Criar proposta de venda (com suporte multi-loja)
  app.post('/chat/proposals', { preHandler: authOnRequest }, async (req, reply) => {
    const proposalStartTime = Date.now();
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const {
      threadId,
      items,
      subtotal,
      shipping,
      total,
      commissionPercent = 5,
      expiresAt,
    } = req.body as {
      threadId: string;
      items: Array<{ sku: string; name: string; qty: number; price: string }>;
      subtotal?: string;
      shipping?: { method: string; price: string };
      total: string;
      commissionPercent?: number;
      expiresAt?: number;
    };

    req.log.info(
      { itemCount: items.length },
      `[Proposal] Creating proposal with ${items.length} items`
    );

    if (!threadId || !items || items.length === 0 || !total) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    // Validação de limites
    const MAX_PRODUCTS = 20;
    const MAX_STORES = 5;

    if (items.length > MAX_PRODUCTS) {
      return reply.code(400).send({
        error: `Maximum ${MAX_PRODUCTS} products allowed per proposal`,
      });
    }

    // Converter userId → profileId
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }
    const sellerId = profile.id;

    // Verificar se é participante da thread
    const thread = await chatService.getThread(threadId);
    if (!thread.participants.includes(sellerId)) {
      return reply.code(403).send({ error: 'Not a participant' });
    }

    // Buscar loja do usuário (pode não ter - caso seja promotor)
    const sellerStore = await prisma.sellerProfile.findFirst({
      where: { userId },
    });

    try {
      // Agrupar produtos por loja
      const productsByStore = await groupProductsByStore(items);

      // Validar limite de lojas
      if (productsByStore.size > MAX_STORES) {
        return reply.code(400).send({
          error: `Maximum ${MAX_STORES} stores allowed per proposal`,
        });
      }

      // Detectar se é multi-loja
      const isMultiStore = productsByStore.size > 1;

      // FASE 8: Validar allowMultiStore para cada loja
      if (isMultiStore) {
        const storeIds = Array.from(productsByStore.keys()).map((id) => BigInt(id));
        const storePolicies = await prisma.storeCommissionPolicy.findMany({
          where: { storeId: { in: storeIds } },
          select: { storeId: true, allowMultiStore: true },
        });

        // Verificar se alguma loja desabilitou multi-store
        for (const storeId of storeIds) {
          const policy = storePolicies.find((p) => p.storeId === storeId);
          // Se a política existir e allowMultiStore for false, rejeitar
          if (policy && policy.allowMultiStore === false) {
            const storeIdNum = Number(storeId);
            const storeItems = productsByStore.get(storeIdNum.toString());
            const productNames = storeItems?.map((item) => item.name).join(', ') || 'produtos';

            return reply.code(400).send({
              error: `A loja ${storeIdNum} não permite propostas multi-loja. Os produtos "${productNames}" não podem ser incluídos em propostas com produtos de outras lojas. Por favor, crie propostas separadas para cada loja.`,
            });
          }
        }
      }

      let finalCommissionPercent = commissionPercent;
      let storeGroups: StoreGroup[] | null = null;

      if (isMultiStore) {
        // MULTI-LOJA: criar grupos e validar cada loja
        storeGroups = await createStoreGroups(
          productsByStore,
          sellerId,
          sellerStore?.id ?? null
        );

        // Comissão não é usada em multi-loja (cada grupo tem sua própria)
        finalCommissionPercent = 0;
      } else {
        // SINGLE-STORE: usar lógica existente
        const [storeId] = productsByStore.keys();
        const [storeItems] = productsByStore.values();

        // Criar grupo único para compatibilidade
        const singleGroup = await createStoreGroups(
          productsByStore,
          sellerId,
          sellerStore?.id ?? null
        );

        finalCommissionPercent = singleGroup[0].commissionPercent;
      }

      const now = Date.now();

      // Calcular subtotal se não fornecido
      const calculatedSubtotal = subtotal
        ? parseFloat(subtotal)
        : items.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0);

      // Calcular total geral
      const grandTotal = storeGroups
        ? storeGroups.reduce((sum, group) => sum + group.total, 0)
        : parseFloat(total);

      // Criar proposta
      const proposal = await prisma.chatProposal.create({
        data: {
          threadId,
          sellerId,
          items,
          subtotal: calculatedSubtotal,
          shipping,
          total: grandTotal,
          commissionPercent: finalCommissionPercent,
          isMultiStore,
          storeGroups: storeGroups as any, // JSON
          status: 'sent',
          expiresAt: expiresAt || now + 48 * 60 * 60 * 1000, // 48h default
          createdAt: now,
          updatedAt: now,
        },
      });

      // Enviar mensagem de proposta na thread
      await chatService.createMessage({
        threadId,
        fromProfile: sellerId,
        type: 'proposal',
        ciphertext: isMultiStore
          ? `Proposta multi-loja (${storeGroups?.length} lojas)`
          : 'Proposta de venda',
        meta: {
          proposalId: proposal.id,
          total: grandTotal.toString(),
          isMultiStore,
          storeCount: storeGroups?.length || 1,
        },
      });

      const proposalTotalTime = Date.now() - proposalStartTime;
      req.log.info(
        {
          proposalId: proposal.id,
          sellerId,
          threadId,
          isMultiStore,
          storeCount: storeGroups?.length || 1,
          itemCount: items.length,
          duration: proposalTotalTime,
        },
        `[Proposal] Created in ${proposalTotalTime}ms`
      );

      return {
        id: proposal.id,
        threadId: proposal.threadId,
        sellerId: proposal.sellerId,
        items: proposal.items,
        subtotal: proposal.subtotal.toString(),
        shipping: proposal.shipping,
        total: proposal.total.toString(),
        commissionPercent: proposal.commissionPercent,
        isMultiStore: proposal.isMultiStore,
        storeGroups: proposal.storeGroups,
        status: proposal.status,
        expiresAt: Number(proposal.expiresAt),
        createdAt: Number(proposal.createdAt),
      };
    } catch (error: any) {
      req.log.error({ error: error.message, sellerId, threadId }, 'Failed to create proposal');
      return reply.code(400).send({ error: error.message || 'Failed to create proposal' });
    }
  });

  // Buscar detalhes da proposta
  app.get('/chat/proposals/:proposalId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { proposalId } = req.params as { proposalId: string };

    const proposal = await prisma.chatProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return reply.code(404).send({ error: 'Proposal not found' });
    }

    // Converter userId → profileId
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se é participante da thread
    const thread = await chatService.getThread(proposal.threadId);
    if (!thread.participants.includes(profile.id)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    return {
      id: proposal.id,
      threadId: proposal.threadId,
      sellerId: proposal.sellerId,
      buyerId: proposal.buyerId,
      items: proposal.items,
      subtotal: proposal.subtotal.toString(),
      shipping: proposal.shipping,
      total: proposal.total.toString(),
      commissionPercent: proposal.commissionPercent,
      isMultiStore: proposal.isMultiStore,
      storeGroups: proposal.storeGroups,
      status: proposal.status,
      expiresAt: Number(proposal.expiresAt),
      createdAt: Number(proposal.createdAt),
      updatedAt: Number(proposal.updatedAt),
    };
  });

  // Checkout - aceitar proposta e processar pagamento (MOCK)
  app.post('/chat/checkout', { preHandler: authOnRequest }, async (req, reply) => {
    const checkoutStartTime = Date.now();
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    // Converter userId → profileId
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }
    const buyerId = profile.id;

    const {
      proposalId,
      storeId: providedStoreId,
      promoterId,
    } = req.body as {
      proposalId: string;
      storeId?: number;
      promoterId?: string;
    };

    if (!proposalId) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    req.log.info({ proposalId, buyerId }, '[Checkout] Starting checkout');

    try {
      // Buscar proposta
      const proposal = await prisma.chatProposal.findUnique({
        where: { id: proposalId },
      });

      if (!proposal) {
        return reply.code(404).send({ error: 'Proposal not found' });
      }

      if (proposal.status !== 'sent') {
        return reply.code(400).send({ error: 'Proposal not available' });
      }

      // Buscar storeId do vendedor se não fornecido
      let storeId = providedStoreId;
      if (!storeId) {
        // Buscar profile do vendedor para obter userId
        const sellerProfile = await prisma.profile.findUnique({
          where: { id: proposal.sellerId },
          select: { userId: true },
        });

        if (!sellerProfile) {
          return reply.code(404).send({ error: 'Seller profile not found' });
        }

        // Buscar loja do vendedor
        const sellerStore = await prisma.sellerProfile.findFirst({
          where: { userId: sellerProfile.userId },
          select: { onChainStoreId: true },
        });

        if (sellerStore?.onChainStoreId) {
          storeId = Number(sellerStore.onChainStoreId);
        } else {
          return reply.code(400).send({ error: 'Store not found for seller' });
        }
      }

      // Verificar expiração
      if (proposal.expiresAt && Number(proposal.expiresAt) < Date.now()) {
        await prisma.chatProposal.update({
          where: { id: proposalId },
          data: { status: 'expired' },
        });
        return reply.code(400).send({ error: 'Proposal expired' });
      }

      // Verificar se comprador é participante da thread
      const thread = await chatService.getThread(proposal.threadId);
      if (!thread.participants.includes(buyerId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Detectar tipo de checkout: multi-loja ou single-store
      if (proposal.isMultiStore) {
        // ============= CHECKOUT MULTI-LOJA =============
        const { sales, failedCount } = await checkoutMultiStore(
          proposal,
          buyerId,
          promoterId
        );

        // Determinar status final da proposta
        const proposalStatus =
          failedCount === 0
            ? 'paid'
            : sales.length === 0
            ? 'failed'
            : 'partially_paid';

        // Atualizar proposta
        await prisma.chatProposal.update({
          where: { id: proposalId },
          data: {
            buyerId,
            status: proposalStatus,
            updatedAt: Date.now(),
          },
        });

        // Atualizar reputação apenas para vendas bem-sucedidas
        if (sales.length > 0) {
          await reputationService.onSaleCompleted(
            proposal.sellerId,
            buyerId,
            sales.reduce((sum, s) => sum + parseFloat(s.amount), 0).toString()
          );
        }

        // Enviar mensagem com múltiplos recibos
        await chatService.createMessage({
          threadId: proposal.threadId,
          fromProfile: buyerId,
          type: 'payment',
          ciphertext:
            failedCount === 0
              ? `Pagamento confirmado (${sales.length} lojas)`
              : `Pagamento parcial (${sales.length}/${sales.length + failedCount} lojas)`,
          meta: {
            proposalId,
            isMultiStore: true,
            sales: sales.map((s) => ({
              saleId: s.saleId,
              storeId: s.storeId,
              storeName: s.storeName,
              amount: s.amount,
              txHash: s.txHash,
              receiptNftCid: s.receiptNftCid,
            })),
            failedCount,
          },
        });

        const checkoutTotalTime = Date.now() - checkoutStartTime;
        req.log.info(
          {
            proposalId,
            buyerId,
            sellerId: proposal.sellerId,
            storeCount: sales.length,
            failedCount,
            duration: checkoutTotalTime,
          },
          `[Checkout] Multi-store completed in ${checkoutTotalTime}ms`
        );

        return {
          success: failedCount === 0,
          isMultiStore: true,
          sales,
          failedCount,
          proposal: {
            id: proposal.id,
            status: proposalStatus,
          },
        };
      } else {
        // ============= CHECKOUT SINGLE-STORE =============
        const saleResult = await checkoutSingleStore(
          proposal,
          buyerId,
          storeId!,
          promoterId
        );

        // Atualizar proposta
        await prisma.chatProposal.update({
          where: { id: proposalId },
          data: {
            buyerId,
            status: 'paid',
            updatedAt: Date.now(),
          },
        });

        // Atualizar reputação (MOCK)
        await reputationService.onSaleCompleted(
          proposal.sellerId,
          buyerId,
          proposal.total.toString()
        );

        // Enviar mensagem de pagamento confirmado
        await chatService.createMessage({
          threadId: proposal.threadId,
          fromProfile: buyerId,
          type: 'payment',
          ciphertext: 'Pagamento confirmado',
          meta: {
            saleId: saleResult.saleId,
            amount: saleResult.amount,
            txHash: saleResult.txHash,
            receiptNftCid: saleResult.receiptNftCid,
          },
        });

        const checkoutTotalTime = Date.now() - checkoutStartTime;
        req.log.info(
          {
            saleId: saleResult.saleId,
            proposalId,
            buyerId,
            sellerId: proposal.sellerId,
            duration: checkoutTotalTime,
          },
          `[Checkout] Single-store completed in ${checkoutTotalTime}ms`
        );

        return {
          success: true,
          sale: saleResult,
          proposal: {
            id: proposal.id,
            status: 'paid',
          },
        };
      }
    } catch (error: any) {
      req.log.error({ error, proposalId, buyerId }, 'Checkout failed');
      return reply.code(500).send({ error: error.message || 'Checkout failed' });
    }
  });

  // Listar vendas de um usuário
  app.get('/chat/sales', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { role = 'seller' } = req.query as { role?: 'buyer' | 'seller' | 'promoter' };

    // Converter userId → profileId
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      const sales = await commissionService.getSales(profile.id, role);
      return { sales };
    } catch (error) {
      req.log.error({ error, profileId: profile.id, role }, 'Failed to fetch sales');
      return reply.code(500).send({ error: 'Failed to fetch sales' });
    }
  });

  // Detalhes de uma venda
  app.get('/chat/sales/:saleId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { saleId } = req.params as { saleId: string };

    // Converter userId → profileId
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }
    const profileId = profile.id;

    try {
      const sale = await commissionService.getSale(saleId);

      if (!sale) {
        return reply.code(404).send({ error: 'Sale not found' });
      }

      // Verificar se tem permissão para ver
      if (
        sale.buyer !== profileId &&
        sale.seller !== profileId &&
        sale.promoter !== profileId
      ) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      return sale;
    } catch (error) {
      req.log.error({ error, saleId }, 'Failed to fetch sale');
      return reply.code(500).send({ error: 'Failed to fetch sale' });
    }
  });
}
