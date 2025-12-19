import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationPermissionBanner() {
  const { permission, isSupported, requestPermission, subscribePush } = useNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('notification_banner_dismissed') === 'true';
  });
  const [requesting, setRequesting] = useState(false);

  // Não mostrar se:
  // - Não suporta notificações
  // - Já tem permissão
  // - Foi rejeitado permanentemente
  // - Usuário dispensou o banner
  if (!isSupported || permission !== 'default' || dismissed) {
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

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4 flex items-center gap-3">
      <div className="flex-shrink-0">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Ativar notificações</p>
        <p className="text-xs text-muted-foreground">
          Receba alertas de mensagens e chamadas mesmo com o app fechado
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleRequestPermission}
          disabled={requesting}
        >
          {requesting ? 'Ativando...' : 'Ativar'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
