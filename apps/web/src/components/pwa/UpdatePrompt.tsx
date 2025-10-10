import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { RefreshCw } from 'lucide-react';

export function UpdatePrompt() {
  const [showReload, setShowReload] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowReload(false);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
    setShowReload(false);
  };

  if (!showReload) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-lg border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Atualização Disponível</CardTitle>
          </div>
          <CardDescription>
            Uma nova versão do Bazari está disponível
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleUpdate} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Agora
          </Button>
          <Button onClick={handleDismiss} variant="outline">
            Depois
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
