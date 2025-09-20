import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildSiwsMessage, encryptMnemonic, fetchNonce, fetchProfile, loginSiws, saveAccount, useKeyring } from '@/modules/auth';

interface ConfirmationForm {
  [key: `word_${number}`]: string;
}

interface PinForm {
  pin: string;
  confirmPin: string;
}

const MIN_PIN_LENGTH = 6;

function getRandomIndexes(length: number, count: number) {
  const result = new Set<number>();
  while (result.size < count) {
    result.add(Math.floor(Math.random() * length));
  }
  return Array.from(result).sort((a, b) => a - b);
}

export function CreateAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { generateMnemonic, deriveAddress, signMessage } = useKeyring();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const phrase = await generateMnemonic();
      if (isMounted) {
        setMnemonic(
          phrase
            .trim()
            .split(' ')
            .map((word) => word.toLowerCase())
        );
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [generateMnemonic]);

  const confirmationIndexes = useMemo(() => {
    return mnemonic.length ? getRandomIndexes(mnemonic.length, 3) : [];
  }, [mnemonic]);

  const confirmationForm = useForm<ConfirmationForm>({
    mode: 'onBlur',
  });

  const pinForm = useForm<PinForm>({
    mode: 'onSubmit',
    defaultValues: {
      pin: '',
      confirmPin: '',
    },
  });

  if (!mnemonic.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <span className="text-muted-foreground animate-pulse">{t('auth.loading')}</span>
      </div>
    );
  }

  const handleConfirmationSubmit = confirmationForm.handleSubmit((values) => {
    const failures = confirmationIndexes.filter((index) => {
      const key = `word_${index}` as const;
      const value = (values[key] || '').trim().toLowerCase();
      return value !== mnemonic[index];
    });

    if (failures.length) {
      setError(t('auth.errors.confirmationMismatch'));
      return;
    }

    setError(null);
    setStep(3);
  });

  const handlePinSubmit = pinForm.handleSubmit(async (values) => {
    if (values.pin !== values.confirmPin) {
      setError(t('auth.errors.pinMismatch'));
      return;
    }

    if (values.pin.length < MIN_PIN_LENGTH) {
      setError(t('auth.errors.pinTooShort', { min: MIN_PIN_LENGTH }));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const mnemonicPhrase = mnemonic.join(' ');
      const address = await deriveAddress(mnemonicPhrase);

      const encrypted = await encryptMnemonic(mnemonicPhrase, values.pin);
      await saveAccount({
        address,
        cipher: encrypted.cipher,
        iv: encrypted.iv,
        salt: encrypted.salt,
        iterations: encrypted.iterations,
      });

      const nonce = await fetchNonce(address);
      const message = buildSiwsMessage(address, nonce);
      const signature = await signMessage(mnemonicPhrase, message);

      await loginSiws({
        address,
        message,
        signature,
      });

      await fetchProfile().catch(() => null);

      confirmationForm.reset();
      pinForm.reset();
      setMnemonic([]);
      setStep(1);

      navigate('/app');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : t('auth.errors.generic')
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              {t('auth.create.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <p className="text-muted-foreground">{t('auth.create.subtitle')}</p>
              <ol className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-4">
                {mnemonic.map((word, index) => (
                  <li
                    key={word + index}
                    className="flex items-center gap-3 rounded-md bg-background px-3 py-2 shadow-sm"
                  >
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="font-semibold tracking-wide uppercase">
                      {word}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {step === 1 && (
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {t('auth.create.backupHelp')}
                </p>
                <Button onClick={() => setStep(2)}>
                  {t('auth.actions.confirmBackup')}
                </Button>
              </div>
            )}

            {step === 2 && (
              <form className="space-y-6" onSubmit={handleConfirmationSubmit}>
                <div className="space-y-3">
                  {confirmationIndexes.map((index) => {
                    const fieldName = `word_${index}` as const;
                    return (
                      <div key={fieldName} className="space-y-2">
                        <Label htmlFor={fieldName}>
                          {t('auth.create.confirmLabel', { index: index + 1 })}
                        </Label>
                        <Input
                          id={fieldName}
                          autoComplete="off"
                          {...confirmationForm.register(fieldName, { required: true })}
                        />
                      </div>
                    );
                  })}
                </div>
                <Button type="submit" className="w-full">
                  {t('auth.actions.verifyWords')}
                </Button>
              </form>
            )}

            {step === 3 && (
              <form className="space-y-6" onSubmit={handlePinSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">{t('auth.pin.create')}</Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      {...pinForm.register('pin', { required: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">{t('auth.pin.confirm')}</Label>
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
                  {loading ? t('auth.actions.creatingAccount') : t('auth.actions.createAccount')}
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

export default CreateAccount;
