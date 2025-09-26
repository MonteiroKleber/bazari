import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribeSession } from '@/modules/auth';
import { isReauthInProgress } from '@/modules/auth/session';
import { PinService } from '@/modules/wallet/pin/PinService';

export function SessionBoundary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [target, setTarget] = useState<string>('/app');

  useEffect(() => {
    const unsubscribe = subscribeSession((event) => {
      if (event === 'expired') {
        if (isReauthInProgress() || PinService.isOpen()) {
          // Ignore overlay while a controlled reauth flow is in progress
          return;
        }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <Card className="max-w-sm w-full shadow-xl">
        <CardHeader>
          <CardTitle id="session-expired-title">
            {t('auth.sessionExpired.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('auth.sessionExpired.description')}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setIsOpen(false);
                navigate('/auth/unlock', { state: { from: target } });
              }}
            >
              {t('auth.sessionExpired.primaryAction')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              {t('auth.sessionExpired.dismiss')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SessionBoundary;
