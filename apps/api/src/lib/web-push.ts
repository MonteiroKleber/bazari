/**
 * Web Push Service - Envio de notificações push via VAPID
 */

import webpush from 'web-push';
import { prisma } from './prisma.js';

// Configurar VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@bazari.libervia.xyz';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[WebPush] VAPID configured successfully');
} else {
  console.warn('[WebPush] VAPID keys not configured - push notifications disabled');
}

export interface PushPayload {
  type: 'incoming_call' | 'message' | 'mention' | 'generic';
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Envia push notification para um profileId específico
 * Tenta enviar para todas as subscriptions ativas do usuário
 */
export async function sendPushToProfile(
  profileId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[WebPush] VAPID not configured, skipping push');
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { profileId },
  });

  if (subscriptions.length === 0) {
    console.log(`[WebPush] No subscriptions found for profile ${profileId}`);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const invalidSubscriptionIds: string[] = [];

  const pushPayload = JSON.stringify(payload);

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, pushPayload, {
        TTL: 60, // 60 segundos TTL para chamadas
        urgency: payload.type === 'incoming_call' ? 'high' : 'normal',
      });
      sent++;
      console.log(`[WebPush] Sent to ${sub.endpoint.slice(-20)}...`);
    } catch (error: any) {
      failed++;
      console.error(`[WebPush] Failed to send to ${sub.endpoint.slice(-20)}:`, error.message);

      // Se subscription expirou ou foi revogada, marcar para remoção
      if (error.statusCode === 404 || error.statusCode === 410) {
        invalidSubscriptionIds.push(sub.id);
      }
    }
  }

  // Remover subscriptions inválidas
  if (invalidSubscriptionIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: invalidSubscriptionIds } },
    });
    console.log(`[WebPush] Removed ${invalidSubscriptionIds.length} invalid subscriptions`);
  }

  return { sent, failed };
}

/**
 * Envia notificação de chamada recebida
 */
export async function sendIncomingCallPush(
  calleeProfileId: string,
  callerName: string,
  callerAvatar: string | null,
  callType: 'VOICE' | 'VIDEO',
  threadId: string,
  callId: string
): Promise<boolean> {
  const result = await sendPushToProfile(calleeProfileId, {
    type: 'incoming_call',
    title: callType === 'VIDEO' ? 'Videochamada recebida' : 'Chamada de voz',
    body: `${callerName} está ligando...`,
    icon: callerAvatar || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: `call-${callId}`,
    data: {
      type: 'incoming_call',
      callId,
      threadId,
      callType,
      callerName,
      callerAvatar,
      url: `/app/chat/${threadId}`,
    },
  });

  return result.sent > 0;
}

/**
 * Retorna a VAPID public key para o frontend
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

export { webpush };
