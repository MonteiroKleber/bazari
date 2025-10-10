import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user has dismissed prompt before
    const dismissed = localStorage.getItem('bazari:pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual install instructions if not standalone
    if (iOS && !isInStandaloneMode && !dismissed) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('bazari:pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  // Don't show if dismissed and not ready
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Instalar Bazari</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {isIOS
              ? 'Adicione o Bazari à sua tela inicial para acesso rápido'
              : 'Instale o app para uma experiência melhor e acesso offline'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isIOS ? (
            <div className="text-sm space-y-2">
              <p className="font-medium">Como instalar no iOS:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Toque no ícone de compartilhar (quadrado com seta)</li>
                <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                <li>Toque em "Adicionar"</li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstallClick} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Instalar Agora
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Use o menu do navegador para instalar
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
