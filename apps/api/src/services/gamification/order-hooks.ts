// @ts-nocheck
/**
 * Order Hooks for Gamification
 *
 * Funções helper para integrar order flow com sistema de rewards/missions
 *
 * IMPORTANTE: Chamar estas funções nos seguintes pontos:
 *
 * 1. afterOrderCreated() - Após criar order (routes/orders.ts linha ~200)
 * 2. afterOrderCompleted() - Após confirmar recebimento/release (routes/orders.ts linha ~548)
 *
 * Uso:
 * ```typescript
 * import { afterOrderCreated, afterOrderCompleted } from '../services/gamification/order-hooks.js';
 *
 * // Após criar order:
 * const order = await prisma.order.create({ ... });
 * await afterOrderCreated(prisma, order.userId, order.id).catch(console.error);
 *
 * // Após completar order:
 * await afterOrderCompleted(prisma, order.userId, order.id, order.totalBzr).catch(console.error);
 * ```
 */

import { PrismaClient } from '@prisma/client';
import { GamificationService } from './gamification.service.js';

/**
 * Hook: Após order ser criada
 * Verifica se é primeira compra e progride missão FirstPurchase
 */
export async function afterOrderCreated(
  prisma: PrismaClient,
  userId: string,
  orderId: string
): Promise<void> {
  try {
    const gamification = new GamificationService(prisma);

    // Contar orders anteriores do user
    const orderCount = await prisma.order.count({
      where: { userId },
    });

    // Se é primeira order, progredir FirstPurchase mission
    if (orderCount === 1) {
      console.log(`[OrderHooks] First purchase for user ${userId}, progressing FirstPurchase mission`);
      await gamification.progressMission(userId, 'FirstPurchase', 1);
    }
  } catch (error) {
    // Não propagar erro - gamification é opcional
    console.error('[OrderHooks] Failed to process afterOrderCreated:', error);
  }
}

/**
 * Hook: Após order ser completada (recebimento confirmado)
 * 1. Concede cashback (3% do valor)
 * 2. Progride CompleteNOrders mission
 * 3. Progride SpendAmount mission
 */
export async function afterOrderCompleted(
  prisma: PrismaClient,
  userId: string,
  orderId: string,
  orderTotalBzr: string | number
): Promise<void> {
  try {
    const gamification = new GamificationService(prisma);

    // Converter para número
    const totalAmount = typeof orderTotalBzr === 'string'
      ? parseFloat(orderTotalBzr)
      : orderTotalBzr;

    console.log(`[OrderHooks] Order ${orderId} completed for user ${userId}, amount: ${totalAmount} BZR`);

    // 1. Conceder cashback (pallet calcula % automaticamente baseado em valor)
    try {
      const result = await gamification.grantCashback(
        userId,
        totalAmount,
        `Order ${orderId} cashback`,
        orderId
      );
      console.log(`[OrderHooks] Cashback granted: ${result.zariAmount} ZARI (smallest unit)`);
    } catch (error) {
      console.error('[OrderHooks] Failed to grant cashback:', error);
      // Continuar mesmo se cashback falhar
    }

    // 2. Progredir CompleteNOrders mission
    try {
      await gamification.progressMission(userId, 'CompleteNOrders', 1);
      console.log(`[OrderHooks] Progressed CompleteNOrders mission`);
    } catch (error) {
      console.error('[OrderHooks] Failed to progress CompleteNOrders:', error);
    }

    // 3. Progredir SpendAmount mission
    try {
      // Passar amount em BZR (será convertido internamente)
      await gamification.progressMission(userId, 'SpendAmount', Math.floor(totalAmount));
      console.log(`[OrderHooks] Progressed SpendAmount mission: ${Math.floor(totalAmount)} BZR`);
    } catch (error) {
      console.error('[OrderHooks] Failed to progress SpendAmount:', error);
    }

  } catch (error) {
    // Não propagar erro - gamification é opcional
    console.error('[OrderHooks] Failed to process afterOrderCompleted:', error);
  }
}

/**
 * Hook: Após referral ser criado
 * Progride ReferFriend mission
 */
export async function afterReferralCreated(
  prisma: PrismaClient,
  referrerId: string,
  referredUserId: string
): Promise<void> {
  try {
    const gamification = new GamificationService(prisma);

    console.log(`[OrderHooks] User ${referrerId} referred ${referredUserId}`);

    await gamification.progressMission(referrerId, 'ReferFriend', 1);
    console.log(`[OrderHooks] Progressed ReferFriend mission`);
  } catch (error) {
    console.error('[OrderHooks] Failed to process afterReferralCreated:', error);
  }
}

/**
 * Hook: Após login diário
 * Atualiza streak e progride DailyLogin mission
 * TODO: Implementar quando pallet suportar streaks
 */
export async function afterDailyLogin(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  try {
    const gamification = new GamificationService(prisma);

    // TODO: Implementar quando pallet tiver streak support
    // await gamification.updateStreak(userId);
    // await gamification.progressMission(userId, 'DailyLogin', 1);

    console.log(`[OrderHooks] Daily login for user ${userId} (streak not implemented yet)`);
  } catch (error) {
    console.error('[OrderHooks] Failed to process afterDailyLogin:', error);
  }
}
