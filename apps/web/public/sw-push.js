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
      console.log('[SW-Push] Payload:', JSON.stringify(payload));

      // Para chamadas, formatar título especial
      let title = payload.title || data.title;
      let body = payload.body || data.body;

      if (payload.data?.type === 'incoming_call') {
        const callerName = payload.data.callerName || 'Alguém';
        title = '📞 Ligação de ' + callerName;
        body = 'Toque para atender a chamada';
      }

      data = {
        title: title,
        body: body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || {}
      };
    }
  } catch (e) {
    console.error('[SW-Push] Error parsing push data:', e);
  }

  const isCall = data.data.type === 'incoming_call';

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    // Som e vibração para chamadas
    vibrate: isCall ? [300, 100, 300, 100, 300, 100, 300] : [200, 100, 200],
    silent: false, // Garantir que o som do sistema toque
    requireInteraction: isCall, // Chamadas não somem automaticamente
    renotify: true, // Permite múltiplas notificações com mesmo tag
    actions: isCall ? [
      { action: 'answer', title: '✅ Atender' },
      { action: 'decline', title: '❌ Recusar' }
    ] : []
  };

  console.log('[SW-Push] Showing notification:', data.title, options);

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
  const isCallNotification = data.type === 'incoming_call';

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
    // Enviar mensagem para o app informando que o usuário recusou
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: 'call:notification-clicked',
              action: 'decline',
              threadId: data.threadId,
              callId: data.callId
            });
          }
        }
      })
    );
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se é notificação de chamada, enviar postMessage para o app
      if (isCallNotification) {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            console.log('[SW-Push] Sending call notification message to client');
            client.postMessage({
              type: 'call:notification-clicked',
              action: event.action || 'open', // 'answer', 'decline', ou 'open' (clique genérico)
              threadId: data.threadId,
              callId: data.callId
            });
          }
        }
      }

      // Se já tem uma janela aberta, foca nela e navega
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
