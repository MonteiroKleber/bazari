import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildSiwsMessage,
  decryptMnemonic,
  fetchNonce,
  fetchProfile,
  getActiveAccount,
  loginSiws,
  refreshSession,
  useKeyring,
} from '@/modules/auth';

interface UnlockForm {
  pin: string;
}

export function Unlock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { deriveAddress, signMessage } = useKeyring();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const from = (location.state as { from?: string } | undefined)?.from;

  const form = useForm<UnlockForm>({
    mode: 'onSubmit',
  });

  useEffect(() => {
    (async () => {
      const stored = await getActiveAccount();
      setHasVault(Boolean(stored));
    })();
  }, []);

  const onSubmit = form.handleSubmit(async ({ pin }) => {
    try {
      setLoading(true);
      setError(null);
      const stored = await getActiveAccount();
      if (!stored) {
        throw new Error(t('auth.errors.noStoredSeed'));
      }

      const mnemonic = await decryptMnemonic(
        stored.cipher,
        stored.iv,
        stored.salt,
        pin,
        stored.iterations
      );

      const refreshed = await refreshSession();
      if (refreshed) {
        await fetchProfile().catch(() => null);
        navigate(from ?? '/app', { replace: true });
        return;
      }

      const address = await deriveAddress(mnemonic);
      const nonce = await fetchNonce(address);
      const message = buildSiwsMessage(address, nonce);
      const signature = await signMessage(mnemonic, message);

      await loginSiws({ address, message, signature });
      await fetchProfile().catch(() => null);
      navigate(from ?? '/app', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  });

  if (hasVault === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Alert variant="destructive">
          <AlertDescription>{t('auth.errors.noStoredSeed')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-12">
      <div className="max-w-md mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              {t('auth.unlock.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="pin">{t('auth.unlock.pinLabel')}</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  {...form.register('pin', { required: true })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.actions.unlocking') : t('auth.actions.unlock')}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" role="status" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Unlock;
