import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchProfile } from '@/modules/auth/api';
import { getSessionUser, isSessionActive } from '@/modules/auth/session';
import { isReauthInProgress } from '@/modules/auth/session';
import { PinService } from '@/modules/wallet/pin/PinService';
import { detectUserState, UserState } from '@/modules/auth/userState';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const ensureAuth = async () => {
      console.log('🔐 RequireAuth.ensureAuth triggered', {
        pathname: location.pathname,
        isSessionActive: isSessionActive(),
        isReauthInProgress: isReauthInProgress(),
        isPinServiceOpen: PinService.isOpen()
      });

      try {
        if (isReauthInProgress() || PinService.isOpen()) {
          // Reautenticação controlada em andamento: não redirecionar nem abrir Unlock
          console.log('🔐 Reauth in progress, setting ready');
          if (!cancelled) setIsReady(true);
          return;
        }
        if (!isSessionActive()) {
          // tentativa inicial: fetchProfile lida com refresh automático via apiFetch
          console.log('🔐 Session not active, fetching profile');
          await fetchProfile();
        } else {
          console.log('🔐 Session active, fetching profile');
          await fetchProfile();
        }
        if (!cancelled) {
          console.log('✅ Auth successful, setting ready');
          setIsReady(true);
        }
      } catch (error) {
        console.log('❌ RequireAuth error:', error);
        if (!cancelled) {
          if (isReauthInProgress() || PinService.isOpen()) {
            // Evitar redirect para unlock durante reauth
            console.log('🔐 Reauth in progress (after error), setting ready');
            setIsReady(true);
            return;
          }

          // Roteamento inteligente baseado no estado do usuário
          const targetUrl = location.pathname + location.search + location.hash;
          const userState = await detectUserState();

          console.log('🔐 User state detected:', userState, 'targetUrl:', targetUrl);

          // Salvar URL de destino no localStorage para caso de navegação externa (ex: Service Worker)
          // Isso permite recuperar a URL após unlock mesmo quando location.state não está disponível
          if (targetUrl && targetUrl !== '/app') {
            localStorage.setItem('bazari:pendingRedirect', JSON.stringify({
              url: targetUrl,
              timestamp: Date.now()
            }));
            console.log('🔐 Saved pending redirect to localStorage:', targetUrl);
          }

          switch (userState) {
            case UserState.NEW_USER:
              // Usuário nunca criou conta - vai para boas-vindas
              console.log('🔐 Redirecting NEW_USER to /auth/guest-welcome');
              navigate('/auth/guest-welcome', {
                replace: true,
                state: {
                  from: targetUrl,
                  reason: 'protected_content'
                },
              });
              break;

            case UserState.HAS_VAULT:
              // Usuário tem vault mas sessão expirada - vai para unlock
              console.log('🔐 Redirecting HAS_VAULT to /auth/unlock');
              navigate('/auth/unlock', {
                replace: true,
                state: { from: targetUrl },
              });
              break;

            default:
              // Fallback para unlock
              console.log('🔐 Redirecting default case to /auth/unlock');
              navigate('/auth/unlock', {
                replace: true,
                state: { from: targetUrl },
              });
          }
        }
      }
    };

    if (getSessionUser()) {
      setIsReady(true);
    }

    ensureAuth();

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.search, navigate]);

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-live="polite">
        <span className="text-muted-foreground">{t('auth.requireAuth.loading')}</span>
      </div>
    );
  }

  return <>{children}</>;
}

export default RequireAuth;
