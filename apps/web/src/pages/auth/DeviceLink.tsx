import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  decryptMnemonic,
  deviceLink,
  getActiveAccount,
  useKeyring,
} from '@/modules/auth';

interface DeviceLinkForm {
  challenge: string;
  pin: string;
}

export function DeviceLink() {
  const { t } = useTranslation();
  const { deriveAddress, signMessage } = useKeyring();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasVault, setHasVault] = useState<boolean | null>(null);

  const form = useForm<DeviceLinkForm>({
    mode: 'onSubmit',
    defaultValues: {
      challenge: '',
      pin: '',
    },
  });

  useEffect(() => {
    (async () => {
      const stored = await getActiveAccount();
      setHasVault(Boolean(stored));
    })();
  }, []);

  const onSubmit = form.handleSubmit(async ({ challenge, pin }) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

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

      const address = await deriveAddress(mnemonic);
      const signature = await signMessage(mnemonic, challenge.trim());

      await deviceLink({
        address,
        challenge: challenge.trim(),
        signature,
      });

      setSuccess(t('auth.deviceLink.success'));
      form.reset({ challenge: '', pin: '' });
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
      <div className="max-w-lg mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              {t('auth.deviceLink.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="challenge">{t('auth.deviceLink.challengeLabel')}</Label>
                <Input
                  id="challenge"
                  autoComplete="off"
                  {...form.register('challenge', { required: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">{t('auth.deviceLink.pinLabel')}</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  {...form.register('pin', { required: true })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.deviceLink.loading') : t('auth.deviceLink.submit')}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" role="status" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert role="status" aria-live="polite">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DeviceLink;
