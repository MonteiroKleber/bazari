import { useState, useEffect } from 'react';
import { Bell, X, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationPermissionBanner() {
  const { permission, isSupported, isPushSubscribed, requestPermission, subscribePush } = useNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('notification_banner_dismissed') === 'true';
  });
  const [requesting, setRequesting] = useState(false);

  // Se já tem permissão mas não tem subscription, limpar o dismiss para mostrar o banner novamente
  useEffect(() => {
    if (permission === 'granted' && !isPushSubscribed && dismissed) {
      // Usuário tem permissão mas não está inscrito - mostrar banner novamente
      localStorage.removeItem('notification_banner_dismissed');
      setDismissed(false);
    }
  }, [permission, isPushSubscribed, dismissed]);

  // Não mostrar se:
  // - Não suporta notificações
  // - Foi rejeitado permanentemente
  // - Usuário dispensou o banner E (não tem permissão OU já tem subscription)
  if (!isSupported || permission === 'denied') {
    return null;
  }

  // Se já tem permissão e subscription, não precisa mostrar
  if (permission === 'granted' && isPushSubscribed) {
    return null;
  }

  // Se foi dismissado e a permissão é default (nunca pediu), respeitar o dismiss
  if (dismissed && permission === 'default') {
    return null;
  }

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const granted = await requestPermission();
      // Se permissão concedida, registrar subscription no servidor
      if (granted) {
        await subscribePush();
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notification_banner_dismissed', 'true');
  };

  // Mensagem diferente se já tem permissão mas precisa registrar subscription
  const needsSubscription = permission === 'granted' && !isPushSubscribed;
  const Icon = needsSubscription ? BellRing : Bell;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 mx-4 flex items-center gap-3">
      <div className="flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {needsSubscription ? 'Finalizar configuração' : 'Ativar notificações'}
        </p>
        <p className="text-xs text-muted-foreground">
          {needsSubscription
            ? 'Toque para habilitar notificações de chamadas e mensagens'
            : 'Receba alertas de mensagens e chamadas mesmo com o app fechado'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleRequestPermission}
          disabled={requesting}
        >
          {requesting ? 'Ativando...' : needsSubscription ? 'Habilitar' : 'Ativar'}
        </Button>
        {/* Não permitir dismiss se precisa registrar subscription */}
        {!needsSubscription && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
