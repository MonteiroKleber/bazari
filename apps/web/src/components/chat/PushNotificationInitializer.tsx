// Componente que inicializa push notifications para usuários autenticados
// Deve ser montado em páginas onde o usuário está logado (ex: ChatInboxPage)

import { useEffect, useRef } from 'react';
import { initializePushNotifications } from '@/lib/chat/push-notifications';

export function PushNotificationInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    // Executar apenas uma vez
    if (initialized.current) return;
    initialized.current = true;

    // Inicializar push notifications em background
    initializePushNotifications().catch((err) => {
      console.warn('[PushInit] Failed to initialize push notifications:', err);
    });
  }, []);

  // Componente invisível
  return null;
}
