import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribeSession } from '@/modules/auth';
import { isReauthInProgress } from '@/modules/auth/session';
import { PinService } from '@/modules/wallet/pin/PinService';
import { detectUserState, UserState } from '@/modules/auth/userState';
import { SmartBackButton } from './SmartBackButton';
import { ShoppingBag, Coins, Store, TrendingUp } from 'lucide-react';

export function SessionBoundary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [target, setTarget] = useState<string>('/app');
  const [userState, setUserState] = useState<UserState | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSession(async (event) => {
      if (event === 'expired') {
        // Get current location at the moment the event fires
        const currentPath = window.location.pathname;

        // Check if we're on a public route
        const publicRoutes = ['/', '/auth', '/search', '/explore'];
        const isPublicRoute = publicRoutes.some(route => currentPath === route) ||
          currentPath.startsWith('/auth/') ||
          currentPath.startsWith('/product/') ||
          currentPath.startsWith('/service/');

        // Don't show modal on public routes
        if (isPublicRoute) {
          console.log('[SessionBoundary] Ignoring expired event on public route:', currentPath);
          return;
        }

        if (isReauthInProgress() || PinService.isOpen()) {
          // Ignore overlay while a controlled reauth flow is in progress
          return;
        }

        // Detecta estado do usuário para mostrar modal correto
        const state = await detectUserState();
        setUserState(state);

        const nextTarget = location.pathname + location.search + location.hash;
        setTarget(nextTarget || '/app');
        setIsOpen(true);
      }
    });
    return () => unsubscribe();
  }, [location.hash, location.pathname, location.search]);

  if (!isOpen) {
    return null;
  }

  // Modal para usuário novo (nunca criou conta)
  if (userState === UserState.NEW_USER) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        <Card className="max-w-lg w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-2xl">👋</span>
              </div>
            </div>
            <CardTitle id="welcome-modal-title">
              {t('auth.welcomeModal.title', { defaultValue: 'Crie sua conta para continuar' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('auth.welcomeModal.description', {
                defaultValue: 'Esta área é protegida. Crie sua conta Bazari para acessar:'
              })}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Coins, text: t('auth.welcomeModal.benefit1', { defaultValue: 'P2P' }) },
                { icon: ShoppingBag, text: t('auth.welcomeModal.benefit2', { defaultValue: 'Pedidos' }) },
                { icon: Store, text: t('auth.welcomeModal.benefit3', { defaultValue: 'Loja' }) },
                { icon: TrendingUp, text: t('auth.welcomeModal.benefit4', { defaultValue: 'Investir' }) }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/50">
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{item.text}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/auth/create', { state: { from: target } });
                }}
              >
                {t('auth.welcomeModal.createAccount', { defaultValue: 'Criar Conta Grátis' })}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/auth/import', { state: { from: target } });
                }}
              >
                {t('auth.welcomeModal.importAccount', { defaultValue: 'Já Tenho Conta' })}
              </Button>
              <SmartBackButton
                targetUrl={target}
                variant="ghost"
                className="w-full"
                onBeforeNavigate={() => setIsOpen(false)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Modal para usuário com vault (sessão expirada)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <Card className="max-w-sm w-full shadow-xl">
        <CardHeader>
          <div className="mb-2 flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
          </div>
          <CardTitle id="session-expired-title" className="text-center">
            {t('auth.sessionExpired.title', { defaultValue: 'Sessão Expirada' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.sessionExpired.description', {
              defaultValue: 'Por segurança, sua sessão expirou. Desbloqueie com seu PIN para continuar.'
            })}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setIsOpen(false);
                navigate('/auth/unlock', { state: { from: target } });
              }}
            >
              {t('auth.sessionExpired.primaryAction', { defaultValue: 'Desbloquear Agora' })}
            </Button>
            <SmartBackButton
              targetUrl={target}
              variant="outline"
              className="w-full"
              onBeforeNavigate={() => setIsOpen(false)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SessionBoundary;
