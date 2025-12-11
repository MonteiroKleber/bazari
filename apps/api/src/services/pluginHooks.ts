/**
 * Plugin Hooks Service
 *
 * Processa eventos e dispara ações dos plugins
 */

import { prisma } from '../lib/prisma.js';
import { CashbackStatus } from '@prisma/client';

// Tipos de eventos que plugins podem escutar
export type PluginEventType =
  | 'onPurchase'
  | 'onOrderDelivered'
  | 'onReview'
  | 'onFollow'
  | 'onShare';

interface PurchaseEventData {
  orderId: string;
  buyerUserId: string;
  sellerId: string;
  storeId?: string;
  totalBzr: bigint | string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: bigint | string;
  }>;
}

interface OrderDeliveredEventData {
  orderId: string;
  buyerUserId: string;
  sellerId: string;
}

interface ReviewEventData {
  orderId: string;
  buyerUserId: string;
  sellerId: string;
  rating: number;
}

type PluginEventData = PurchaseEventData | OrderDeliveredEventData | ReviewEventData;

/**
 * Dispara um evento para todos os plugins que escutam esse tipo
 */
export async function dispatchPluginEvent(
  event: PluginEventType,
  data: PluginEventData
): Promise<void> {
  console.log(`[PluginHooks] Dispatching event: ${event}`, data);

  // Determinar sellerId
  const sellerId = 'sellerId' in data ? data.sellerId : null;
  if (!sellerId) {
    console.warn('[PluginHooks] No sellerId in event data');
    return;
  }

  // Buscar plugins instalados que têm hook para este evento
  const instances = await prisma.pluginInstance.findMany({
    where: {
      sellerId,
      enabled: true,
    },
    include: {
      plugin: {
        select: {
          slug: true,
          hooks: true,
        },
      },
    },
  });

  // Processar cada plugin
  for (const instance of instances) {
    const hooks = instance.plugin.hooks as Record<string, string> | null;
    if (!hooks || !hooks[event]) {
      continue;
    }

    const handlerName = hooks[event];
    console.log(
      `[PluginHooks] Running handler ${handlerName} for plugin ${instance.plugin.slug}`
    );

    try {
      await runPluginHandler(handlerName, instance, data);
    } catch (error) {
      console.error(
        `[PluginHooks] Error running handler ${handlerName}:`,
        error
      );
    }
  }
}

/**
 * Executa um handler específico de plugin
 */
async function runPluginHandler(
  handler: string,
  instance: {
    id: string;
    config: unknown;
    plugin: { slug: string };
  },
  data: PluginEventData
): Promise<void> {
  const config = instance.config as Record<string, unknown>;

  switch (handler) {
    case 'addPoints':
      await handleAddLoyaltyPoints(instance.id, config, data as PurchaseEventData);
      break;

    case 'scheduleCashback':
      await handleScheduleCashback(instance.id, config, data as PurchaseEventData);
      break;

    case 'checkCoupon':
      // Cupons são verificados no checkout, não via hook
      break;

    case 'updateDeliveryStatus':
      await handleUpdateDeliveryStatus(instance.id, config, data as OrderDeliveredEventData);
      break;

    case 'requestReview':
      await handleRequestReview(instance.id, config, data as OrderDeliveredEventData);
      break;

    default:
      console.warn(`[PluginHooks] Unknown handler: ${handler}`);
  }
}

/**
 * Handler: Adiciona pontos de fidelidade
 */
async function handleAddLoyaltyPoints(
  instanceId: string,
  config: Record<string, unknown>,
  data: PurchaseEventData
): Promise<void> {
  const pointsPerBzr = (config.pointsPerBzr as number) ?? 1;
  const totalBzr = BigInt(data.totalBzr.toString());

  // Converter de planck para BZR (12 decimais) e calcular pontos
  const bzrAmount = Number(totalBzr) / 1e12;
  const pointsToAdd = Math.floor(bzrAmount * pointsPerBzr);

  if (pointsToAdd <= 0) {
    return;
  }

  // Upsert pontos do usuário
  const loyalty = await prisma.loyaltyPoints.upsert({
    where: {
      instanceId_userId: {
        instanceId,
        userId: data.buyerUserId,
      },
    },
    create: {
      instanceId,
      userId: data.buyerUserId,
      points: pointsToAdd,
      totalEarned: pointsToAdd,
    },
    update: {
      points: { increment: pointsToAdd },
      totalEarned: { increment: pointsToAdd },
    },
  });

  // Atualizar tier baseado no total acumulado
  const newTier = calculateTier(loyalty.totalEarned, config);
  if (newTier !== loyalty.tier) {
    await prisma.loyaltyPoints.update({
      where: { id: loyalty.id },
      data: { tier: newTier },
    });
  }

  console.log(
    `[PluginHooks] Added ${pointsToAdd} loyalty points to user ${data.buyerUserId}`
  );
}

/**
 * Handler: Agenda cashback para depois da entrega
 */
async function handleScheduleCashback(
  instanceId: string,
  config: Record<string, unknown>,
  data: PurchaseEventData
): Promise<void> {
  const cashbackPercent = (config.cashbackPercent as number) ?? 2;
  const delayDays = (config.delayDays as number) ?? 7;

  const totalBzr = BigInt(data.totalBzr.toString());
  const cashbackAmount = (totalBzr * BigInt(cashbackPercent)) / 100n;

  if (cashbackAmount <= 0n) {
    return;
  }

  // Agendar cashback
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + delayDays);

  await prisma.pendingCashback.create({
    data: {
      pluginInstanceId: instanceId,
      orderId: data.orderId,
      userId: data.buyerUserId,
      amount: cashbackAmount.toString(),
      scheduledFor,
      status: CashbackStatus.PENDING,
    },
  });

  console.log(
    `[PluginHooks] Scheduled cashback of ${cashbackAmount} for user ${data.buyerUserId} on ${scheduledFor}`
  );
}

/**
 * Handler: Atualiza status de entrega
 */
async function handleUpdateDeliveryStatus(
  _instanceId: string,
  _config: Record<string, unknown>,
  data: OrderDeliveredEventData
): Promise<void> {
  // Este handler pode notificar o cliente ou atualizar UI
  console.log(`[PluginHooks] Order ${data.orderId} delivered notification`);

  // Poderia criar uma notificação ou enviar push
  // await createNotification(data.buyerUserId, 'delivery', { orderId: data.orderId });
}

/**
 * Handler: Solicita review após entrega
 */
async function handleRequestReview(
  _instanceId: string,
  config: Record<string, unknown>,
  data: OrderDeliveredEventData
): Promise<void> {
  const delayHours = (config.requestAfterHours as number) ?? 24;

  console.log(
    `[PluginHooks] Will request review for order ${data.orderId} in ${delayHours}h`
  );

  // Poderia agendar um job para enviar notificação depois
  // await scheduleJob('requestReview', { orderId: data.orderId, userId: data.buyerUserId }, delayHours * 60 * 60 * 1000);
}

/**
 * Calcula tier baseado em pontos totais
 */
function calculateTier(
  totalEarned: number,
  config: Record<string, unknown>
): string {
  const tiers = (config.tiers as Record<string, number>) ?? {
    bronze: 0,
    silver: 1000,
    gold: 5000,
    platinum: 20000,
  };

  const sortedTiers = Object.entries(tiers).sort((a, b) => b[1] - a[1]);

  for (const [tier, threshold] of sortedTiers) {
    if (totalEarned >= threshold) {
      return tier;
    }
  }

  return 'bronze';
}

/**
 * Job: Processa cashbacks agendados (chamar via cron)
 */
export async function processPendingCashbacks(): Promise<number> {
  const now = new Date();

  const pendingCashbacks = await prisma.pendingCashback.findMany({
    where: {
      status: CashbackStatus.PENDING,
      scheduledFor: { lte: now },
    },
    take: 100,
  });

  let processed = 0;

  for (const cashback of pendingCashbacks) {
    try {
      // TODO: Aqui faria a transferência real de BZR via blockchain
      // Por enquanto, apenas marca como creditado
      await prisma.pendingCashback.update({
        where: { id: cashback.id },
        data: {
          status: CashbackStatus.CREDITED,
          creditedAt: now,
          // txHash: await transferBZR(cashback.userId, cashback.amount),
        },
      });

      processed++;
      console.log(
        `[PluginHooks] Credited cashback ${cashback.id} to user ${cashback.userId}`
      );
    } catch (error) {
      console.error(`[PluginHooks] Failed to credit cashback ${cashback.id}:`, error);

      await prisma.pendingCashback.update({
        where: { id: cashback.id },
        data: { status: CashbackStatus.FAILED },
      });
    }
  }

  return processed;
}

/**
 * Redeem loyalty points (trocar pontos por desconto)
 */
export async function redeemLoyaltyPoints(
  instanceId: string,
  userId: string,
  pointsToRedeem: number
): Promise<{ success: boolean; discountBzr?: string; error?: string }> {
  const loyalty = await prisma.loyaltyPoints.findUnique({
    where: {
      instanceId_userId: {
        instanceId,
        userId,
      },
    },
    include: {
      instance: {
        include: {
          plugin: { select: { slug: true } },
        },
      },
    },
  });

  if (!loyalty) {
    return { success: false, error: 'No loyalty points found' };
  }

  if (loyalty.points < pointsToRedeem) {
    return { success: false, error: 'Insufficient points' };
  }

  const config = loyalty.instance.config as Record<string, unknown>;
  const redemptionRate = (config.redemptionRate as number) ?? 100; // pontos por 1 BZR

  const discountBzr = Math.floor(pointsToRedeem / redemptionRate);
  if (discountBzr <= 0) {
    return { success: false, error: 'Not enough points for minimum redemption' };
  }

  // Deduzir pontos
  await prisma.loyaltyPoints.update({
    where: { id: loyalty.id },
    data: {
      points: { decrement: pointsToRedeem },
    },
  });

  // Converter para planck (12 decimais)
  const discountPlanck = BigInt(discountBzr) * BigInt(1e12);

  return {
    success: true,
    discountBzr: discountPlanck.toString(),
  };
}
