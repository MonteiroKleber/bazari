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
import {
  encryptMnemonic,
  saveAccount,
  useKeyring,
  getActiveAccount,
} from '@/modules/auth';
import { PinStrengthIndicator } from '@/components/auth/PinStrengthIndicator';
import { toast } from 'sonner';

interface SeedForm {
  seed: string;
}

interface PinForm {
  pin: string;
  confirmPin: string;
}

const MIN_PIN_LENGTH = 8;

export function RecoverPin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { validateMnemonic, deriveAddress } = useKeyring();
  const [step, setStep] = useState<1 | 2>(1);
  const [validatedMnemonic, setValidatedMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinValue, setPinValue] = useState('');

  const seedForm = useForm<SeedForm>({
    mode: 'onSubmit',
  });

  const pinForm = useForm<PinForm>({
    mode: 'onSubmit',
  });

  const handleSeedSubmit = seedForm.handleSubmit(async ({ seed }) => {
    try {
      setLoading(true);
      setError(null);

      const normalized = seed.trim().toLowerCase().replace(/\s+/g, ' ');
      const isValid = await validateMnemonic(normalized);

      if (!isValid) {
        throw new Error(t('auth.errors.invalidSeed', { defaultValue: 'Seed phrase inválida' }));
      }

      const stored = await getActiveAccount();
      const address = await deriveAddress(normalized);

      if (stored?.address !== address) {
        throw new Error(
          t('auth.recover.seedMismatch', {
            defaultValue: 'Esta seed phrase não corresponde à conta armazenada neste dispositivo',
          })
        );
      }

      setValidatedMnemonic(normalized);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  });

  const handlePinSubmit = pinForm.handleSubmit(async ({ pin, confirmPin }) => {
    try {
      setLoading(true);
      setError(null);

      if (pin !== confirmPin) {
        throw new Error(t('auth.errors.pinMismatch'));
      }

      if (pin.length < MIN_PIN_LENGTH) {
        throw new Error(
          t('auth.errors.pinTooShort', {
            min: MIN_PIN_LENGTH,
            defaultValue: `PIN deve ter no mínimo ${MIN_PIN_LENGTH} dígitos`,
          })
        );
      }

      const address = await deriveAddress(validatedMnemonic);
      const encrypted = await encryptMnemonic(validatedMnemonic, pin);

      await saveAccount({
        address,
        cipher: encrypted.cipher,
        iv: encrypted.iv,
        salt: encrypted.salt,
        iterations: encrypted.iterations,
      });

      toast.success(t('auth.recover.success', { defaultValue: 'PIN redefinido com sucesso!' }));

      seedForm.reset();
      pinForm.reset();
      setValidatedMnemonic('');
      setStep(1);

      navigate('/auth/unlock');
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
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === 1
                ? t('auth.recover.titleStep1', { defaultValue: 'Recuperar Acesso' })
                : t('auth.recover.titleStep2', { defaultValue: 'Criar Novo PIN' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <form className="space-y-6" onSubmit={handleSeedSubmit}>
                <Alert>
                  <AlertDescription>
                    {t('auth.recover.step1Help', {
                      defaultValue: 'Para recuperar o acesso, você precisará da sua seed phrase de 12 ou 24 palavras.',
                    })}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="seed">
                    {t('auth.recover.seedLabel', { defaultValue: 'Seed Phrase' })}
                  </Label>
                  <Textarea
                    id="seed"
                    rows={4}
                    placeholder={t('auth.recover.seedPlaceholder', {
                      defaultValue: 'Digite suas 12 ou 24 palavras separadas por espaço...',
                    })}
                    {...seedForm.register('seed', { required: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('auth.recover.seedHint', {
                      defaultValue: 'Cole ou digite sua seed phrase exatamente como foi gerada.',
                    })}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/auth/unlock')}
                  >
                    {t('common.cancel', { defaultValue: 'Cancelar' })}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading
                      ? t('common.validating', { defaultValue: 'Validando...' })
                      : t('auth.actions.validateSeed', { defaultValue: 'Validar Seed' })} →
                  </Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form className="space-y-6" onSubmit={handlePinSubmit}>
                <Alert>
                  <AlertDescription>
                    {t('auth.recover.step2Help', {
                      defaultValue: `Crie um novo PIN de ${MIN_PIN_LENGTH} dígitos ou mais para proteger sua conta.`,
                    })}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">
                      {t('auth.recover.newPin', {
                        defaultValue: `Novo PIN (${MIN_PIN_LENGTH}+ dígitos)`,
                      })}
                    </Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      {...pinForm.register('pin', { required: true })}
                      onChange={(e) => {
                        pinForm.register('pin').onChange(e);
                        setPinValue(e.target.value);
                      }}
                    />
                    <PinStrengthIndicator pin={pinValue} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">
                      {t('auth.pin.confirm', { defaultValue: 'Confirmar PIN' })}
                    </Label>
                    <Input
                      id="confirmPin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      {...pinForm.register('confirmPin', { required: true })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? t('common.saving', { defaultValue: 'Salvando...' })
                    : t('auth.actions.saveNewPin', { defaultValue: 'Salvar Novo PIN' })}
                </Button>
              </form>
            )}

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

export default RecoverPin;
