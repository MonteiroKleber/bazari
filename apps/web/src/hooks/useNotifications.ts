import { useState, useEffect, useCallback } from 'react';
import { chatNotificationService } from '@/lib/chat/notifications';
import { chatSoundService } from '@/lib/chat/sounds';
import { subscribeToPush, unsubscribeFromPush, isPushSupported, isPushSubscribed as checkPushSubscribed } from '@/lib/chat/push-notifications';

export interface UseNotificationsReturn {
  // Permission state
  permission: NotificationPermission;
  isSupported: boolean;
  isEnabled: boolean;

  // Push state
  isPushSupported: boolean;
  isPushSubscribed: boolean;

  // Sound state
  soundEnabled: boolean;
  soundVolume: number;

  // Actions
  requestPermission: () => Promise<boolean>;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  subscribePush: () => Promise<boolean>;
  unsubscribePush: () => Promise<boolean>;

  // Test functions
  testNotification: () => void;
  testSound: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>(
    chatNotificationService.getPermission()
  );
  const [isEnabled, setIsEnabled] = useState(chatNotificationService.isEnabled());
  const [isPushSubscribedState, setIsPushSubscribed] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(chatSoundService.isEnabled());
  const [soundVolume, setSoundVolumeState] = useState(chatSoundService.getVolume());

  // Sincronizar estado quando permissão mudar
  useEffect(() => {
    const checkPermission = () => {
      const newPermission = chatNotificationService.getPermission();
      if (newPermission !== permission) {
        setPermission(newPermission);
        setIsEnabled(chatNotificationService.isEnabled());
      }
    };

    // Verificar periodicamente (para detectar mudanças via configurações do browser)
    const interval = setInterval(checkPermission, 5000);
    return () => clearInterval(interval);
  }, [permission]);

  // Verificar se já está inscrito no push ao montar (verifica no servidor!)
  useEffect(() => {
    const checkPushSubscription = async () => {
      if (!isPushSupported()) return;
      try {
        // Usa a função que verifica no servidor se a subscription está vinculada ao usuário atual
        const isSubscribed = await checkPushSubscribed();
        setIsPushSubscribed(isSubscribed);
      } catch {
        // Ignora erros silenciosamente
        setIsPushSubscribed(false);
      }
    };
    checkPushSubscription();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await chatNotificationService.requestPermission();
    setPermission(chatNotificationService.getPermission());
    setIsEnabled(chatNotificationService.isEnabled());
    return granted;
  }, []);

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    chatNotificationService.setEnabled(enabled);
    setIsEnabled(chatNotificationService.isEnabled());
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    chatSoundService.setEnabled(enabled);
    setSoundEnabledState(enabled);
  }, []);

  const setSoundVolume = useCallback((volume: number) => {
    chatSoundService.setVolume(volume);
    setSoundVolumeState(volume);
  }, []);

  const testNotification = useCallback(() => {
    chatNotificationService.showNotification(
      {
        title: 'Teste de Notificação',
        body: 'Esta é uma notificação de teste do BazChat!',
      },
      true // forceShow - mostrar mesmo com a aba em foco
    );
  }, []);

  const testSound = useCallback(() => {
    chatSoundService.play();
  }, []);

  const subscribePushHandler = useCallback(async (): Promise<boolean> => {
    const success = await subscribeToPush();
    setIsPushSubscribed(success);
    return success;
  }, []);

  const unsubscribePushHandler = useCallback(async (): Promise<boolean> => {
    const success = await unsubscribeFromPush();
    if (success) {
      setIsPushSubscribed(false);
    }
    return success;
  }, []);

  return {
    permission,
    isSupported: chatNotificationService.isSupported(),
    isEnabled,
    isPushSupported: isPushSupported(),
    isPushSubscribed: isPushSubscribedState,
    soundEnabled,
    soundVolume,
    requestPermission,
    setNotificationsEnabled,
    setSoundEnabled,
    setSoundVolume,
    subscribePush: subscribePushHandler,
    unsubscribePush: unsubscribePushHandler,
    testNotification,
    testSound,
  };
}
