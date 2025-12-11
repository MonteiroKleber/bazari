import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { buildSiwsMessage, encryptMnemonic, fetchNonce, fetchProfile, loginSiws, saveAccount, useKeyring, hashPin, hasEncryptedSeed, setSession, decryptMnemonicFlexible } from '@/modules/auth';
import { createSocialBackup } from '@/modules/auth/api';
import { verifyGoogleToken, storeAccessToken } from '@/modules/auth/social/google-login';
import { OnboardingProgress } from '@/components/auth/OnboardingProgress';
import { IntroScreen } from '@/components/auth/IntroScreen';
import { SeedRevealToggle } from '@/components/auth/SeedRevealToggle';
import { SeedBackupTools } from '@/components/auth/SeedBackupTools';
import { ConfirmationCheckboxes } from '@/components/auth/ConfirmationCheckboxes';
import { SeedReferenceCollapsible } from '@/components/auth/SeedReferenceCollapsible';
import { EnhancedPinStrengthIndicator } from '@/components/auth/EnhancedPinStrengthIndicator';
import { AccountReviewCard } from '@/components/auth/AccountReviewCard';
import { WordChipSelector, WordChipsGrid } from '@/components/auth/WordChipSelector';

interface ConfirmationForm {
  [key: `word_${number}`]: string;
}

interface PinForm {
  pin: string;
  confirmPin: string;
}

type Step = 'intro' | 1 | 2 | 3 | 4;

const MIN_PIN_LENGTH = 8;

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
  const [step, setStep] = useState<Step>('intro');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [accountName, setAccountName] = useState('');
  const [previewAddress, setPreviewAddress] = useState('');
  const [isSocialFlow, setIsSocialFlow] = useState(false);
  const [socialAccountName, setSocialAccountName] = useState('');
  const [backupStatus, setBackupStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [backupMessage, setBackupMessage] = useState('');

  // Confirmation checkboxes state
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [understoodConfirmed, setUnderstoodConfirmed] = useState(false);

  // Word chip selection states for Step 2
  const [selectedWords, setSelectedWords] = useState<Record<number, string>>({});
  const [isTraditionalFlow, setIsTraditionalFlow] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);

  // Gerar seed SOMENTE para fluxo tradicional (quando usuário clica "Começar")
  // OAuth flow gera seed posteriormente, quando necessário
  useEffect(() => {
    if (!isTraditionalFlow) return; // Não gerar seed automaticamente

    let isMounted = true;
    (async () => {
      const phrase = await generateMnemonic();
      if (isMounted) {
        const words = phrase.trim().split(' ').map((word) => word.toLowerCase());
        setMnemonic(words);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [generateMnemonic, isTraditionalFlow]);

  // Generate preview address when mnemonic is ready
  useEffect(() => {
    if (mnemonic.length > 0 && !previewAddress) {
      (async () => {
        try {
          const address = await deriveAddress(mnemonic.join(' '));
          setPreviewAddress(address);
        } catch (error) {
          console.error('Error generating preview address:', error);
        }
      })();
    }
  }, [mnemonic, deriveAddress, previewAddress]);

  const confirmationIndexes = useMemo(() => {
    return mnemonic.length ? getRandomIndexes(mnemonic.length, 3) : [];
  }, [mnemonic]);

  const confirmationForm = useForm<ConfirmationForm>({
    mode: 'onChange',
  });

  const pinForm = useForm<PinForm>({
    mode: 'onSubmit',
    defaultValues: {
      pin: '',
      confirmPin: '',
    },
  });

  // Loading screen - Mostrar apenas se não houver mnemonic
  if (!mnemonic.length && step !== 'intro') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <span className="text-muted-foreground animate-pulse">{t('auth.loading')}</span>
      </div>
    );
  }

  const handleIntroComplete = () => {
    setIsTraditionalFlow(true); // Ativar geração de seed para fluxo tradicional
    setStep(1);
  };

  const handleGoogleSuccess = async (credential: string) => {
    try {
      setLoading(true);
      setError(null);

      // FLUXO OAUTH MULTI-CONTA:
      // /auth/create SEMPRE cria NOVA conta
      // Restauração agora é em /auth/import

      // 1. Gerar seed localmente (cada conta tem seu próprio seed)
      const oauthMnemonic = await generateMnemonic();
      const oauthWords = oauthMnemonic.trim().split(' ').map((word) => word.toLowerCase());
      const oauthAddress = await deriveAddress(oauthMnemonic);

      // 2. Autenticar com Google (backend cria user OAuth se não existir)
      const response = await verifyGoogleToken(credential, oauthAddress);
      storeAccessToken(response.accessToken, response.expiresIn);

      // 3. Popular sessão para chamadas autenticadas
      setSession({
        accessToken: response.accessToken,
        accessTokenExpiresIn: response.expiresIn,
        user: { id: response.user.id, address: response.user.address },
      });

      // 4. Ir direto para criação de nova conta (accountName + PIN)
      setMnemonic(oauthWords);
      setPreviewAddress(oauthAddress);
      setIsSocialFlow(true);
      setStep(3); // Pular para PIN (accountName será pedido antes do PIN)
    } catch (err) {
      console.error('[Google Login] Error:', err);
      setError(err instanceof Error ? err.message : t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(t('auth.errors.googleLoginFailed', { defaultValue: 'Falha no login com Google' }));
  };

  const handleStep1Next = () => {
    if (!savedConfirmed || !understoodConfirmed) {
      setError(t('auth.create.errors.confirmationsRequired', { defaultValue: 'Por favor, confirme que salvou suas palavras' }));
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleWordChipSelect = (targetIndex: number, word: string) => {
    setSelectedWords(prev => ({
      ...prev,
      [targetIndex]: word
    }));
  };

  const handleConfirmationSubmit = () => {
    // Check if all required words are selected
    const allSelected = confirmationIndexes.every(index => selectedWords[index]);

    if (!allSelected) {
      setError(t('auth.create.errors.selectAllWords', { defaultValue: 'Por favor, selecione todas as palavras solicitadas' }));
      return;
    }

    // Validate selected words
    const failures = confirmationIndexes.filter((index) => {
      return selectedWords[index] !== mnemonic[index];
    });

    if (failures.length) {
      setError(t('auth.errors.confirmationMismatch', { defaultValue: 'Uma ou mais palavras estão incorretas. Verifique e tente novamente.' }));
      return;
    }

    setError(null);
    setStep(3);
  };

  const handlePinSubmit = pinForm.handleSubmit(async (values) => {
    // Validação PIN
    if (values.pin !== values.confirmPin) {
      setError(t('auth.errors.pinMismatch', { defaultValue: 'Os PINs não coincidem' }));
      return;
    }

    if (values.pin.length < MIN_PIN_LENGTH) {
      setError(t('auth.errors.pinTooShort', { min: MIN_PIN_LENGTH, defaultValue: `PIN deve ter no mínimo ${MIN_PIN_LENGTH} dígitos` }));
      return;
    }

    setError(null);

    // NOVO USUÁRIO OAUTH: Finalizar direto sem passar por step 4
    if (isSocialFlow) {
      try {
        setLoading(true);

        // Validar accountName
        if (!socialAccountName.trim()) {
          setError('Por favor, dê um nome para esta conta');
          return;
        }

        // Cifrar mnemonic com PIN
        const mnemonicPhrase = mnemonic.join(' ');
        const encrypted = await encryptMnemonic(mnemonicPhrase, values.pin);
        const address = previewAddress || await deriveAddress(mnemonicPhrase);

        // Salvar localmente
        await saveAccount({
          address,
          cipher: encrypted.cipher,
          iv: encrypted.iv,
          salt: encrypted.salt,
          authTag: encrypted.authTag,
          iterations: encrypted.iterations,
        });

        // Salvar backup E2EE no servidor (multi-conta)
        setBackupStatus('saving');
        setBackupMessage('Salvando backup criptografado...');

        try {
          await createSocialBackup({
            accountName: socialAccountName.trim(),
            encryptedMnemonic: encrypted.cipher,
            iv: encrypted.iv,
            salt: encrypted.salt,
            authTag: encrypted.authTag,
            iterations: encrypted.iterations,
            address,
          });
          setBackupStatus('success');
        } catch (backupError) {
          console.error('[OAuth Backup] Save failed:', backupError);
          setBackupStatus('error');
          // Não bloquear criação se backup falhar
        }

        // Fazer login SIWS para criar perfil
        const nonce = await fetchNonce(address);
        const message = buildSiwsMessage(address, nonce);
        const signature = await signMessage(mnemonicPhrase, message);

        await loginSiws({
          address,
          message,
          signature,
        });

        await fetchProfile().catch(() => null);

        // Ir para Step 4 (review) - mostrar chave pública antes de entrar
        setPinValue(values.pin);
        setStep(4);
        return;
      } catch (err) {
        console.error('[OAuth Account Creation] Error:', err);
        setError(err instanceof Error ? err.message : t('auth.errors.generic'));
      } finally {
        setLoading(false);
      }
    }

    // FLUXO TRADICIONAL: Ir para step 4 (review)
    setPinValue(values.pin);
    setStep(4);
  });

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const mnemonicPhrase = mnemonic.join(' ');
      const address = await deriveAddress(mnemonicPhrase);

      const encrypted = await encryptMnemonic(mnemonicPhrase, pinValue);
      await saveAccount({
        address,
        name: accountName || undefined,
        cipher: encrypted.cipher,
        iv: encrypted.iv,
        salt: encrypted.salt,
        authTag: encrypted.authTag,
        iterations: encrypted.iterations,
      });

      if (isSocialFlow) {
        // Salvar backup cifrado (blob opaco) com feedback visual
        try {
          setBackupStatus('saving');
          setBackupMessage(t('auth.backup.saving', { defaultValue: 'Salvando backup criptografado...' }));

          await saveSocialBackup({
            encryptedMnemonic: encrypted.cipher,
            iv: encrypted.iv,
            salt: encrypted.salt,
            authTag: encrypted.authTag,
            iterations: encrypted.iterations,
            address,
          });

          setBackupStatus('success');
          setBackupMessage(t('auth.backup.success', { defaultValue: '✅ Backup salvo com sucesso!' }));
        } catch (backupError) {
          setBackupStatus('error');
          setBackupMessage(t('auth.backup.error', { defaultValue: '❌ Erro ao salvar backup. Você ainda pode usar sua seed phrase.' }));
          console.error('[Social Backup] Save failed:', backupError);
          // Não interromper o fluxo - continuar mesmo se backup falhar
        }
      }

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
      setStep('intro');

      navigate('/app');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : t('auth.errors.generic', { defaultValue: 'Erro ao criar conta' })
      );
    } finally {
      setLoading(false);
    }
  };

  const currentStepNumber = step === 'intro' ? 0 : step;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button - Only on intro and step 1 */}
        {(step === 'intro' || step === 1) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="mb-4 gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back', { defaultValue: 'Voltar' })}
          </Button>
        )}

        <Card className="shadow-lg">
          {step !== 'intro' && (
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-semibold">
                {t('auth.create.title', { defaultValue: 'Criar Nova Conta' })}
              </CardTitle>
            </CardHeader>
          )}

          <CardContent className="space-y-6 sm:space-y-8 pt-6">
            {/* Progress Indicator - Only show after intro */}
            {step !== 'intro' && typeof step === 'number' && (
              <OnboardingProgress currentStep={step} />
            )}

            {/* INTRO SCREEN */}
            {step === 'intro' && (
              <IntroScreen
                onStart={handleIntroComplete}
                onGoogleSuccess={handleGoogleSuccess}
                onGoogleError={handleGoogleError}
              />
            )}

            {/* STEP 1: Seed Phrase Backup */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h2 className="text-xl font-semibold">
                    {t('auth.create.step1.title', { defaultValue: 'Suas Palavras Secretas' })}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    {t('auth.create.step1.subtitle', { defaultValue: 'Anote estas 12 palavras em ordem. Elas são a ÚNICA forma de recuperar sua conta.' })}
                  </p>
                </div>

                {/* Warning Card */}
                <Card className="border-orange-500/50 bg-orange-500/5">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold text-orange-500">
                          {t('auth.create.step1.warning.title', { defaultValue: '⚠️ ATENÇÃO! Leia com cuidado:' })}
                        </p>
                        <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                          <li>{t('auth.create.step1.warning.point1', { defaultValue: 'Guarde em local SEGURO (cofre, gerenciador de senhas)' })}</li>
                          <li>{t('auth.create.step1.warning.point2', { defaultValue: 'NUNCA compartilhe com ninguém' })}</li>
                          <li>{t('auth.create.step1.warning.point3', { defaultValue: 'Não tire print nem salve em nuvem' })}</li>
                          <li>{t('auth.create.step1.warning.point4', { defaultValue: 'Quem tiver essas palavras terá acesso TOTAL à sua conta' })}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Seed Phrase with Reveal Toggle */}
                <SeedRevealToggle mnemonic={mnemonic} />

                {/* Backup Tools */}
                <SeedBackupTools mnemonic={mnemonic} />

                {/* Confirmation Checkboxes */}
                <ConfirmationCheckboxes
                  savedConfirmed={savedConfirmed}
                  understoodConfirmed={understoodConfirmed}
                  onSavedChange={setSavedConfirmed}
                  onUnderstoodChange={setUnderstoodConfirmed}
                />

                <Button
                  onClick={handleStep1Next}
                  className="w-full h-12"
                  disabled={!savedConfirmed || !understoodConfirmed}
                >
                  {t('auth.actions.next', { defaultValue: 'Próximo: Verificar' })} →
                </Button>
              </div>
            )}

            {/* STEP 2: Verification */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h2 className="text-xl font-semibold">
                    {t('auth.create.step2.title', { defaultValue: 'Verificar Seu Backup' })}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.create.step2.subtitle', { defaultValue: 'Selecione as palavras solicitadas para confirmar que você salvou corretamente' })}
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Word Selectors for each random position */}
                  <div className="space-y-4">
                    {confirmationIndexes.map((index) => (
                      <WordChipSelector
                        key={index}
                        words={mnemonic}
                        targetIndex={index}
                        onSelect={(word) => handleWordChipSelect(index, word)}
                        selectedWord={selectedWords[index]}
                        disabledWords={Object.entries(selectedWords)
                          .filter(([key, _]) => Number(key) !== index)
                          .map(([_, word]) => word)
                          .filter(Boolean)}
                        label={t('auth.create.confirmLabel', {
                          index: index + 1,
                          defaultValue: `Palavra #${index + 1}`
                        })}
                      />
                    ))}
                  </div>

                  {/* Grid of clickable word chips */}
                  <WordChipsGrid
                    words={mnemonic}
                    onWordClick={(word) => {
                      // Find the first unselected position
                      const firstEmpty = confirmationIndexes.find(idx => !selectedWords[idx]);
                      if (firstEmpty !== undefined) {
                        handleWordChipSelect(firstEmpty, word);
                      }
                    }}
                    disabledWords={Object.values(selectedWords).filter(Boolean)}
                    selectedWords={selectedWords}
                  />

                  {/* Seed Reference Collapsible */}
                  <SeedReferenceCollapsible mnemonic={mnemonic} />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      ← {t('common.back', { defaultValue: 'Voltar' })}
                    </Button>
                    <Button
                      onClick={handleConfirmationSubmit}
                      className="flex-1"
                      disabled={confirmationIndexes.some(idx => !selectedWords[idx])}
                    >
                      {t('auth.actions.next', { defaultValue: 'Próximo' })} →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Create PIN */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Lock className="h-12 w-12 text-primary mx-auto mb-2" />
                  <h2 className="text-xl font-semibold">
                    {isSocialFlow
                      ? t('auth.create.step3.titleSocial', { defaultValue: '🔐 Proteja Sua Conta' })
                      : t('auth.create.step3.title', { defaultValue: 'Criar PIN de Proteção' })
                    }
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                    {isSocialFlow
                      ? t('auth.create.step3.subtitleSocial', { defaultValue: 'Dê um nome para sua conta e crie um PIN de 8 dígitos. Você precisará dele para acessar em novos dispositivos.' })
                      : t('auth.create.step3.subtitle', { defaultValue: 'Proteja sua conta com um PIN forte' })
                    }
                  </p>
                </div>

                {/* PIN Context Card - Simplificado para OAuth */}
                {isSocialFlow ? (
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardContent className="pt-6">
                      <div className="space-y-3 text-sm">
                        <p className="font-semibold flex items-center gap-2 text-green-700">
                          <span>✨</span>
                          Por que o PIN?
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            Seu backup é criptografado com este PIN
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            Necessário para acessar em novos dispositivos
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500">⚠️</span>
                            <span className="font-semibold text-orange-600">
                              Nem nós conseguimos recuperar se você esquecer
                            </span>
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ) : !isSocialFlow ? (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="space-y-3 text-sm">
                        <p className="font-semibold flex items-center gap-2">
                          <span>ℹ️</span>
                          {t('auth.create.step3.context.title', { defaultValue: 'Para que serve o PIN?' })}
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {t('auth.create.step3.context.point1', { defaultValue: 'Você vai digitar TODA VEZ que abrir o app' })}
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {t('auth.create.step3.context.point2', { defaultValue: 'Protege suas chaves armazenadas no dispositivo' })}
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {t('auth.create.step3.context.point3', { defaultValue: 'Se esquecer: use sua seed phrase (12 palavras) para recuperar' })}
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <form className="space-y-6" onSubmit={handlePinSubmit}>
                  <div className="space-y-4">
                    {/* Account Name - Apenas para OAuth */}
                    {isSocialFlow && (
                      <div className="space-y-2">
                        <Label htmlFor="accountName">
                          Nome da Conta
                          <span className="text-muted-foreground ml-1">(ex: Conta Principal, Loja Online)</span>
                        </Label>
                        <Input
                          id="accountName"
                          type="text"
                          placeholder="Minha Conta"
                          value={socialAccountName}
                          onChange={(e) => setSocialAccountName(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="pin">
                        {t('auth.pin.create', { defaultValue: 'Crie seu PIN' })}
                        <span className="text-muted-foreground ml-1">
                          ({t('auth.pin.minLength', { min: MIN_PIN_LENGTH, defaultValue: `mínimo ${MIN_PIN_LENGTH} dígitos` })})
                        </span>
                      </Label>
                      <Input
                        id="pin"
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        placeholder={isSocialFlow ? '••••••••' : ''}
                        {...pinForm.register('pin', { required: true })}
                        onChange={(e) => {
                          pinForm.register('pin').onChange(e);
                          setPinValue(e.target.value);
                        }}
                      />
                      <EnhancedPinStrengthIndicator pin={pinValue} minLength={MIN_PIN_LENGTH} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPin">
                        {t('auth.pin.confirm', { defaultValue: 'Confirme seu PIN' })}
                      </Label>
                      <Input
                        id="confirmPin"
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        placeholder={isSocialFlow ? '••••••••' : ''}
                        {...pinForm.register('confirmPin', { required: true })}
                      />
                    </div>
                  </div>

                  {/* Opção Avançada: Ver Seed (apenas OAuth) */}
                  {isSocialFlow && mnemonic.length > 0 && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setShowSeedModal(true)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        🔍 {t('auth.create.step3.viewSeedAdvanced', { defaultValue: 'Avançado: Ver minhas palavras secretas' })}
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {/* Botão Voltar - Apenas para fluxo tradicional */}
                    {!isSocialFlow && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(2)}
                        className="flex-1"
                      >
                        ← {t('common.back', { defaultValue: 'Voltar' })}
                      </Button>
                    )}
                    <Button type="submit" className={isSocialFlow ? 'w-full h-12 text-base font-semibold' : 'flex-1'}>
                      {isSocialFlow
                        ? t('auth.actions.createAccountSocial', { defaultValue: '✨ Criar Conta' })
                        : t('auth.actions.next', { defaultValue: 'Próximo' }) + ' →'
                      }
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: Review & Create */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-2">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <h2 className="text-xl font-semibold">
                    {t('auth.create.step4.title', { defaultValue: 'Tudo Pronto!' })}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.create.step4.subtitle', { defaultValue: 'Revise os detalhes e finalize a criação da sua conta' })}
                  </p>
                </div>

                {/* Account Review Card */}
                <AccountReviewCard
                  address={previewAddress}
                  accountName={accountName}
                  onAccountNameChange={setAccountName}
                />

                {/* Backup Status Card - Only for social flow */}
                {isSocialFlow && backupStatus !== 'idle' && (
                  <Card className={
                    backupStatus === 'success' ? 'border-green-500/50 bg-green-500/5' :
                    backupStatus === 'error' ? 'border-orange-500/50 bg-orange-500/5' :
                    'border-blue-500/50 bg-blue-500/5'
                  }>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        {backupStatus === 'saving' && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                        )}
                        <p className={`text-sm font-semibold ${
                          backupStatus === 'success' ? 'text-green-600' :
                          backupStatus === 'error' ? 'text-orange-600' :
                          'text-blue-600'
                        }`}>
                          {backupMessage}
                        </p>
                      </div>
                      {backupStatus === 'success' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {t('auth.backup.successDetail', { defaultValue: 'Seu backup E2EE foi salvo. Você pode restaurá-lo em qualquer dispositivo usando login Google + PIN.' })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Final Reminder - Ajustado para fluxo social */}
                <Card className="border-orange-500/50 bg-orange-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm space-y-2">
                        <p className="font-semibold text-orange-500">
                          {t('auth.create.step4.reminder.title', { defaultValue: '⚠️ Lembre-se:' })}
                        </p>
                        <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                          <li>{t('auth.create.step4.reminder.point1', { defaultValue: 'Guarde suas 12 palavras em local MUITO seguro' })}</li>
                          <li>{t('auth.create.step4.reminder.point2', { defaultValue: 'Seu PIN será pedido toda vez que abrir o app' })}</li>
                          {isSocialFlow ? (
                            <li>{t('auth.create.step4.reminder.point3Social', { defaultValue: 'Para restaurar em novo dispositivo: login Google + digite o PIN' })}</li>
                          ) : (
                            <li>{t('auth.create.step4.reminder.point3', { defaultValue: 'Se esquecer o PIN, use as 12 palavras para recuperar' })}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                    className="flex-1"
                    disabled={loading}
                  >
                    ← {t('common.back', { defaultValue: 'Voltar' })}
                  </Button>
                  <Button
                    onClick={handleFinalSubmit}
                    className="flex-1 h-12 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading
                      ? t('auth.actions.creatingAccount', { defaultValue: 'Criando...' })
                      : (
                        <>
                          🚀 {t('auth.actions.createAccount', { defaultValue: 'Criar Conta!' })}
                        </>
                      )
                    }
                  </Button>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" role="status" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Modal Avançado: Ver Seed (OAuth) */}
        <Dialog open={showSeedModal} onOpenChange={setShowSeedModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                {t('auth.create.seedModal.title', { defaultValue: 'Suas Palavras Secretas' })}
              </DialogTitle>
              <DialogDescription>
                {t('auth.create.seedModal.description', { defaultValue: 'Guarde estas 12 palavras em ordem. Elas são a única forma de recuperar sua conta se você perder o PIN.' })}
              </DialogDescription>
            </DialogHeader>

            <Card className="border-orange-500/50 bg-orange-500/5">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-orange-500">
                      {t('auth.create.seedModal.warning.title', { defaultValue: '⚠️ ATENÇÃO!' })}
                    </p>
                    <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                      <li>{t('auth.create.seedModal.warning.point1', { defaultValue: 'Guarde em local SEGURO (cofre, gerenciador de senhas)' })}</li>
                      <li>{t('auth.create.seedModal.warning.point2', { defaultValue: 'NUNCA compartilhe com ninguém' })}</li>
                      <li>{t('auth.create.seedModal.warning.point3', { defaultValue: 'Quem tiver essas palavras terá acesso TOTAL à sua conta' })}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SeedRevealToggle mnemonic={mnemonic} />
            <SeedBackupTools mnemonic={mnemonic} />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSeedModal(false)}>
                {t('common.close', { defaultValue: 'Fechar' })}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default CreateAccount;
