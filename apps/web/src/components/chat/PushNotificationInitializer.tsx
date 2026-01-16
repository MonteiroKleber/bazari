// Componente que inicializa push notifications para usuários autenticados
// Deve ser montado em páginas onde o usuário está logado (ex: ChatInboxPage)

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializePushNotifications, listenToServiceWorkerMessages } from '@/lib/chat/push-notifications';

export function PushNotificationInitializer() {
  const initialized = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Executar apenas uma vez
    if (initialized.current) return;
    initialized.current = true;

    // Inicializar push notifications em background
    initializePushNotifications().catch((err) => {
      console.warn('[PushInit] Failed to initialize push notifications:', err);
    });

    // Escutar mensagens do Service Worker (ex: clique em notificação de chamada)
    const unsubscribe = listenToServiceWorkerMessages((data) => {
      console.log('[PushInit] Received SW message:', data);

      if (data.type === 'call:notification-clicked') {
        // Usuário clicou na notificação de chamada
        const { threadId, action } = data;

        if (action === 'answer' && threadId) {
          console.log('[PushInit] Call notification answered, navigating to thread:', threadId);

          // Navegar para a thread com ?answer=true
          navigate(`/app/chat/${threadId}?answer=true`);
        } else if (action === 'decline') {
          console.log('[PushInit] Call notification declined');
          // A chamada será rejeitada via handleCallEnded quando o timeout expirar
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // Componente invisível
  return null;
}
