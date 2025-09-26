import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchProfile } from '@/modules/auth/api';
import { getSessionUser, isSessionActive } from '@/modules/auth/session';
import { isReauthInProgress } from '@/modules/auth/session';
import { PinService } from '@/modules/wallet/pin/PinService';

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
      try {
        if (isReauthInProgress() || PinService.isOpen()) {
          // Reautenticação controlada em andamento: não redirecionar nem abrir Unlock
          if (!cancelled) setIsReady(true);
          return;
        }
        if (!isSessionActive()) {
          // tentativa inicial: fetchProfile lida com refresh automático via apiFetch
          await fetchProfile();
        } else {
          await fetchProfile();
        }
        if (!cancelled) {
          setIsReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          if (isReauthInProgress() || PinService.isOpen()) {
            // Evitar redirect para unlock durante reauth
            setIsReady(true);
            return;
          }
          const target = location.pathname + location.search + location.hash;
          navigate('/auth/unlock', {
            replace: true,
            state: { from: target },
          });
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
