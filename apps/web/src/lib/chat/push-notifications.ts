/**
 * Push Notifications Service - Frontend
 * Gerencia a subscription do browser e sincroniza com o backend
 */

import { api } from '../api';

// Cache da VAPID public key
let vapidPublicKey: string | null = null;

/**
 * Converte base64 URL-safe para Uint8Array (formato esperado pelo PushManager)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Busca a VAPID public key do servidor
 */
async function getVapidPublicKey(): Promise<string | null> {
  if (vapidPublicKey) return vapidPublicKey;

  try {
    const response = await api.get<{ publicKey: string }>('/api/push/vapid-key');
    vapidPublicKey = response.publicKey;
    return vapidPublicKey;
  } catch (error) {
    console.error('[Push] Failed to get VAPID key:', error);
    return null;
  }
}

/**
 * Verifica se o browser suporta push notifications
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Verifica se já temos permissão de notificação
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Solicita permissão de notificação ao usuário
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
}

/**
 * Registra a push subscription no servidor
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported');
    return false;
  }

  // Verificar permissão
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Notification permission not granted');
    return false;
  }

  // Obter VAPID key
  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    console.error('[Push] No VAPID public key available');
    return false;
  }

  try {
    // Obter service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Verificar se já existe subscription
    let subscription = await registration.pushManager.getSubscription();

    // Se não existe, criar nova
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // Enviar para o servidor
    const subJson = subscription.toJSON();
    await api.post('/api/push/subscribe', {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
    });

    console.log('[Push] Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error);
    return false;
  }
}

/**
 * Remove a push subscription
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return true;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remover do servidor
      await api.delete('/api/push/unsubscribe', {
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      // Remover localmente
      await subscription.unsubscribe();
    }

    console.log('[Push] Successfully unsubscribed');
    return true;
  } catch (error) {
    console.error('[Push] Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Verifica se já está inscrito em push notifications
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Inicializa push notifications automaticamente se já tem permissão
 * Deve ser chamado após login bem-sucedido
 */
export async function initializePushNotifications(): Promise<void> {
  if (!isPushSupported()) return;

  // Se já tem permissão, garantir que está inscrito
  if (getNotificationPermission() === 'granted') {
    const isSubscribed = await isPushSubscribed();
    if (!isSubscribed) {
      await subscribeToPush();
    }
  }
}

/**
 * Escuta mensagens do Service Worker
 */
export function listenToServiceWorkerMessages(
  callback: (data: { type: string; [key: string]: any }) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object') {
      callback(event.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
