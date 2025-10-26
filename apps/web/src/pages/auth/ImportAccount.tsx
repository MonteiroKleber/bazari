import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { buildSiwsMessage, encryptMnemonic, fetchNonce, fetchProfile, loginSiws, saveAccount, useKeyring } from '@/modules/auth';
import { PinStrengthIndicator } from '@/components/auth/PinStrengthIndicator';

interface ImportForm {
  seed: string;
  pin: string;
  confirmPin: string;
}

const MIN_PIN_LENGTH = 8;

export function ImportAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { validateMnemonic, deriveAddress, signMessage } = useKeyring();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinValue, setPinValue] = useState('');

  const form = useForm<ImportForm>({
    mode: 'onSubmit',
    defaultValues: {
      seed: '',
      pin: '',
      confirmPin: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setLoading(true);
      setError(null);

      const normalizedSeed = values.seed.trim().toLowerCase().replace(/\s+/g, ' ');
      const isValid = await validateMnemonic(normalizedSeed);
      if (!isValid) {
        throw new Error(t('auth.errors.invalidSeed'));
      }

      if (values.pin !== values.confirmPin) {
        throw new Error(t('auth.errors.pinMismatch'));
      }

      if (values.pin.length < MIN_PIN_LENGTH) {
        throw new Error(t('auth.errors.pinTooShort', { min: MIN_PIN_LENGTH }));
      }

      const address = await deriveAddress(normalizedSeed);
      const encrypted = await encryptMnemonic(normalizedSeed, values.pin);
      await saveAccount({
        address,
        cipher: encrypted.cipher,
        iv: encrypted.iv,
        salt: encrypted.salt,
        iterations: encrypted.iterations,
      });

      const nonce = await fetchNonce(address);
      const message = buildSiwsMessage(address, nonce);
      const signature = await signMessage(normalizedSeed, message);

      await loginSiws({ address, message, signature });
      await fetchProfile().catch(() => null);
      form.reset();
      navigate('/app');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/auth')}
          className="mb-4 gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', { defaultValue: 'Voltar' })}
        </Button>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              {t('auth.import.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="seed">{t('auth.import.seedLabel')}</Label>
                <Textarea
                  id="seed"
                  rows={4}
                  {...form.register('seed', { required: true })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('auth.import.seedHint')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">{t('auth.pin.create')}</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    {...form.register('pin', { required: true })}
                    onChange={(e) => {
                      form.register('pin').onChange(e);
                      setPinValue(e.target.value);
                    }}
                  />
                  <PinStrengthIndicator pin={pinValue} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">{t('auth.pin.confirm')}</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    {...form.register('confirmPin', { required: true })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.actions.connecting') : t('auth.actions.importAccount')}
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

export default ImportAccount;
