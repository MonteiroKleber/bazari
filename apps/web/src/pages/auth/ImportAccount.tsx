import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Shield, Clock } from 'lucide-react';
import { buildSiwsMessage, encryptMnemonic, fetchNonce, fetchProfile, loginSiws, saveAccount, useKeyring, decryptMnemonicFlexible, hashPin, setSession } from '@/modules/auth';
import { listSocialBackups, getSocialBackupById, updateSocialBackupUsage, type SocialBackupMetadata } from '@/modules/auth/api';
import { verifyGoogleToken, storeAccessToken } from '@/modules/auth/social/google-login';
import { PinStrengthIndicator } from '@/components/auth/PinStrengthIndicator';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

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

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // OAuth Multi-Conta state
  const [showAccountsList, setShowAccountsList] = useState(false);
  const [socialBackups, setSocialBackups] = useState<SocialBackupMetadata[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<SocialBackupMetadata | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [restorePin, setRestorePin] = useState('');

  const form = useForm<ImportForm>({
    mode: 'onSubmit',
    defaultValues: {
      seed: '',
      pin: '',
      confirmPin: '',
    },
  });

  // OAuth: Listar contas após login Google
  const handleGoogleSuccess = async (credential: string) => {
    try {
      setLoading(true);
      setError(null);

      // Autenticar sem address (endpoint social precisa aceitar sem address)
      const response = await verifyGoogleToken(credential);
      storeAccessToken(response.accessToken, response.expiresIn);

      // Popular sessão
      setSession({
        accessToken: response.accessToken,
        accessTokenExpiresIn: response.expiresIn,
        user: { id: response.user.id, address: response.user.address },
      });

      // Listar backups
      const { backups } = await listSocialBackups();

      if (backups.length === 0) {
        setError('Nenhuma conta encontrada vinculada a este Google. Crie uma nova conta em /auth/create.');
        return;
      }

      setSocialBackups(backups);
      setShowAccountsList(true);
    } catch (err) {
      console.error('[Google Import] Error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar contas Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Falha no login com Google');
  };

  // Selecionar conta para restaurar
  const handleSelectBackup = (backup: SocialBackupMetadata) => {
    setSelectedBackup(backup);
    setShowPinModal(true);
    setRestorePin('');
    setError(null);
  };

  // Restaurar conta selecionada
  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar dados completos do backup
      const { wallet } = await getSocialBackupById(selectedBackup.id);

      // Tentar decrypt com PIN
      const tryDecrypt = async (secret: string) => decryptMnemonicFlexible(
        wallet.encryptedMnemonic,
        wallet.iv,
        wallet.salt,
        secret,
        wallet.iterations ?? 150000,
        wallet.authTag ?? undefined
      );

      let mnemonicPhrase;
      try {
        mnemonicPhrase = await tryDecrypt(restorePin);
      } catch (err1) {
        const hashed = await hashPin(restorePin);
        mnemonicPhrase = await tryDecrypt(hashed);
      }

      // Salvar localmente
      await saveAccount({
        address: wallet.address,
        cipher: wallet.encryptedMnemonic,
        iv: wallet.iv,
        salt: wallet.salt,
        authTag: wallet.authTag ?? undefined,
        iterations: wallet.iterations ?? 150000,
      });

      // Atualizar lastUsedAt
      await updateSocialBackupUsage(selectedBackup.id);

      // Login SIWS
      const nonce = await fetchNonce(wallet.address);
      const message = buildSiwsMessage(wallet.address, nonce);
      const signature = await signMessage(mnemonicPhrase, message);

      await loginSiws({ address: wallet.address, message, signature });
      await fetchProfile().catch(() => null);

      navigate('/app');
    } catch (err) {
      console.error('[Social Restore] Error:', err);
      setError(err instanceof Error ? err.message : 'PIN incorreto ou erro ao restaurar');
    } finally {
      setLoading(false);
    }
  };

  // Fluxo tradicional (seed phrase)
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
            <CardDescription>
              Restaure sua conta usando Google ou sua seed phrase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GOOGLE BUTTON - PRIMEIRO */}
            {googleClientId && (
              <>
                <GoogleOAuthProvider clientId={googleClientId}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-muted-foreground px-2">Importar com Google</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={(credentialResponse) => {
                          if (credentialResponse.credential) {
                            handleGoogleSuccess(credentialResponse.credential);
                          }
                        }}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        text="continue_with"
                        locale="pt-BR"
                      />
                    </div>
                  </div>
                </GoogleOAuthProvider>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground px-2">ou</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            {/* FLUXO TRADICIONAL (SEED PHRASE) */}
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

        {/* DIALOG: Lista de Contas Google */}
        <Dialog open={showAccountsList} onOpenChange={setShowAccountsList}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Selecione uma Conta para Restaurar</DialogTitle>
              <DialogDescription>
                Escolha qual conta você deseja importar. {socialBackups.length} conta(s) encontrada(s).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {socialBackups.map((backup) => (
                <Card
                  key={backup.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectBackup(backup)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          {backup.accountName}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">
                          {backup.address.slice(0, 10)}...{backup.address.slice(-8)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Criada: {new Date(backup.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Usado: {new Date(backup.lastUsedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Importar →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Digite PIN para Restaurar */}
        <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Digite seu PIN</DialogTitle>
              <DialogDescription>
                Conta: <strong>{selectedBackup?.accountName}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restorePin">PIN (mínimo 8 dígitos)</Label>
                <Input
                  id="restorePin"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••••••"
                  value={restorePin}
                  onChange={(e) => setRestorePin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && restorePin.length >= MIN_PIN_LENGTH) {
                      handleRestoreBackup();
                    }
                  }}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRestoreBackup}
                  className="flex-1"
                  disabled={loading || restorePin.length < MIN_PIN_LENGTH}
                >
                  {loading ? 'Restaurando...' : 'Restaurar Conta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ImportAccount;
