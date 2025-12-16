// Service Worker para Push Notifications - BazChat
// Este arquivo é carregado pelo Workbox via importScripts

// Handler para eventos de push
self.addEventListener('push', (event) => {
  console.log('[SW-Push] Push received:', event);

  let data = {
    title: 'BazChat',
    body: 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'bazchat-notification',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || {}
      };
    }
  } catch (e) {
    console.error('[SW-Push] Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: data.data.type === 'incoming_call',
    actions: data.data.type === 'incoming_call' ? [
      { action: 'answer', title: 'Atender' },
      { action: 'decline', title: 'Recusar' }
    ] : []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handler para cliques na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW-Push] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  let url = '/app/chat';

  // Se tem threadId, abre a conversa específica
  if (data.threadId) {
    url = `/app/chat/${data.threadId}`;
  }

  // Se é chamada e clicou em atender
  if (event.action === 'answer' && data.threadId) {
    url = `/app/chat/${data.threadId}?answer=true`;
  }

  // Se clicou em recusar, apenas fecha
  if (event.action === 'decline') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tem uma janela aberta, foca nela
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Senão, abre uma nova
      return clients.openWindow(url);
    })
  );
});

// Handler para fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW-Push] Notification closed:', event);
});

console.log('[SW-Push] Push notification handler loaded');
