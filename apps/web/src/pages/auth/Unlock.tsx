import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ArrowLeft } from 'lucide-react';
import {
  buildSiwsMessage,
  decryptMnemonicFlexible,
  fetchNonce,
  fetchProfile,
  getActiveAccount,
  listAccounts,
  setActiveAccount,
  loginSiws,
  refreshSession,
  useKeyring,
  hashPin,
} from '@/modules/auth';
import {
  isLocked,
  getRemainingLockoutTime,
  recordFailedAttempt,
  resetAttempts,
  getAttemptsRemaining,
  formatLockoutTime,
} from '@/modules/auth/pinAttempts';

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
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [lockoutTime, setLockoutTime] = useState(0);
  // Prioridade: location.state > localStorage (para navegação externa como Service Worker)
  const stateFrom = (location.state as { from?: string } | undefined)?.from;
  const [from, setFrom] = useState<string | undefined>(stateFrom);

  // Verificar localStorage para redirect pendente (usado quando SW navega diretamente)
  useEffect(() => {
    if (!stateFrom) {
      try {
        const pending = localStorage.getItem('bazari:pendingRedirect');
        if (pending) {
          const { url, timestamp } = JSON.parse(pending);
          // Só usar se for recente (menos de 5 minutos)
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            console.log('🔐 Found pending redirect in localStorage:', url);
            setFrom(url);
          } else {
            console.log('🔐 Pending redirect expired, removing');
            localStorage.removeItem('bazari:pendingRedirect');
          }
        }
      } catch (e) {
        console.error('🔐 Error reading pending redirect:', e);
      }
    }
  }, [stateFrom]);

  const form = useForm<UnlockForm>({
    mode: 'onSubmit',
  });

  useEffect(() => {
    (async () => {
      const accounts = await listAccounts();
      setAllAccounts(accounts);
      setHasVault(accounts.length > 0);

      // If only one account, auto-select it
      if (accounts.length === 1) {
        setSelectedAccount(accounts[0]);
      } else if (accounts.length > 1) {
        // If multiple accounts, try to select the active one
        const active = await getActiveAccount();
        setSelectedAccount(active || accounts[0]);
      }
    })();
  }, []);

  useEffect(() => {
    // Check lockout status on mount
    if (isLocked()) {
      setLockoutTime(getRemainingLockoutTime());
    }

    // Update lockout timer every second
    const interval = setInterval(() => {
      if (isLocked()) {
        const remaining = getRemainingLockoutTime();
        setLockoutTime(remaining);
        if (remaining === 0) {
          setError(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const onSubmit = form.handleSubmit(async ({ pin }) => {
    try {
      setLoading(true);
      setError(null);

      // Check if locked
      if (isLocked()) {
        const remaining = getRemainingLockoutTime();
        setLockoutTime(remaining);
        throw new Error(
          t('auth.errors.lockedOut', {
            time: formatLockoutTime(remaining),
            defaultValue: `Muitas tentativas incorretas. Tente novamente em ${formatLockoutTime(remaining)}.`,
          })
        );
      }

      if (!selectedAccount) {
        throw new Error(t('auth.errors.noStoredSeed'));
      }

      // Tenta primeiro com o PIN em texto (fluxo tradicional); se falhar, tenta com hashPin (fluxo social)
      let mnemonic: string;
      try {
        mnemonic = await decryptMnemonicFlexible(
          selectedAccount.cipher,
          selectedAccount.iv,
          selectedAccount.salt,
          pin,
          selectedAccount.iterations,
          (selectedAccount as any).authTag
        );
      } catch (firstError) {
        const hashedPin = await hashPin(pin);
        mnemonic = await decryptMnemonicFlexible(
          selectedAccount.cipher,
          selectedAccount.iv,
          selectedAccount.salt,
          hashedPin,
          selectedAccount.iterations,
          (selectedAccount as any).authTag
        ).catch(() => {
          throw firstError;
        });
      }

      // Set this account as active
      await setActiveAccount(selectedAccount.address);

      // Success! Reset attempts
      resetAttempts();

      // Limpar redirect pendente do localStorage
      localStorage.removeItem('bazari:pendingRedirect');

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

      // Record failed attempt (only if not already locked)
      if (!isLocked()) {
        recordFailedAttempt();
        const attemptsLeft = getAttemptsRemaining();

        if (attemptsLeft > 0) {
          setError(
            t('auth.errors.wrongPinWithAttempts', {
              count: attemptsLeft,
              defaultValue: `PIN incorreto. Restam ${attemptsLeft} tentativa${attemptsLeft !== 1 ? 's' : ''}.`,
            })
          );
        } else {
          // Just got locked
          const lockTime = getRemainingLockoutTime();
          setLockoutTime(lockTime);
          setError(
            t('auth.errors.lockedOut', {
              time: formatLockoutTime(lockTime),
              defaultValue: `Muitas tentativas incorretas. Tente novamente em ${formatLockoutTime(lockTime)}.`,
            })
          );
        }
      } else {
        setError(err instanceof Error ? err.message : t('auth.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  });

  if (hasVault === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {t('auth.welcome.title', { defaultValue: 'Bem-vindo ao Bazari!' })} 👋
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription className="text-center">
                {t('auth.unlock.noAccount', { defaultValue: 'Você ainda não possui uma conta neste dispositivo.' })}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                className="w-full h-12"
                onClick={() => navigate('/auth/create')}
              >
                🆕 {t('auth.actions.createNewAccount', { defaultValue: 'Criar Nova Conta' })}
              </Button>

              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => navigate('/auth/import')}
              >
                📥 {t('auth.actions.importExisting', { defaultValue: 'Importar Conta Existente' })}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-3">
                💡 {t('auth.security.localOnly', { defaultValue: 'Suas chaves são armazenadas localmente e criptografadas com seu PIN.' })}
              </p>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/')}
              >
                ← {t('auth.actions.backHome', { defaultValue: 'Voltar para Home' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-12">
      <div className="max-w-md mx-auto px-4">
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
              {t('auth.unlock.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Selection - Show if multiple accounts */}
            {allAccounts.length > 1 ? (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {t('auth.unlock.selectAccount', { defaultValue: 'Selecione a conta para desbloquear' })}
                </Label>
                <div className="space-y-2">
                  {allAccounts.map((account) => (
                    <button
                      key={account.address}
                      type="button"
                      onClick={() => setSelectedAccount(account)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedAccount?.address === account.address
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-muted/20 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedAccount?.address === account.address
                            ? 'bg-primary/20'
                            : 'bg-primary/10'
                        }`}>
                          {account.name ? (
                            <span className={`text-base font-bold ${
                              selectedAccount?.address === account.address
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`}>
                              {account.name.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <User className={`h-5 w-5 ${
                              selectedAccount?.address === account.address
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {account.name || t('auth.welcome.account', { defaultValue: 'Conta' })}
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            {account.address.slice(0, 10)}...{account.address.slice(-8)}
                          </p>
                        </div>
                        {selectedAccount?.address === account.address && (
                          <div className="flex-shrink-0 text-primary">✓</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedAccount ? (
              /* Single Account Confirmation Card */
              <div className="p-4 bg-muted/30 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {selectedAccount.name ? (
                      <span className="text-base font-bold text-primary">
                        {selectedAccount.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {t('auth.unlock.unlockingAccount', { defaultValue: 'Desbloqueando conta' })}
                    </p>
                    <p className="font-medium truncate">
                      {selectedAccount.name || t('auth.welcome.account', { defaultValue: 'Conta' })}
                    </p>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      {selectedAccount.address.slice(0, 10)}...{selectedAccount.address.slice(-8)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('auth.unlock.thisAccountWillBeUnlocked', { defaultValue: 'Esta conta será desbloqueada' })}
                </p>
              </div>
            ) : null}

            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="pin">{t('auth.unlock.pinLabel')}</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  disabled={lockoutTime > 0}
                  {...form.register('pin', { required: true })}
                />
                {lockoutTime === 0 && getAttemptsRemaining() < 5 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {t('auth.unlock.attemptsRemaining', {
                      count: getAttemptsRemaining(),
                      defaultValue: `${getAttemptsRemaining()} tentativa${getAttemptsRemaining() !== 1 ? 's' : ''} restante${getAttemptsRemaining() !== 1 ? 's' : ''}`,
                    })}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || lockoutTime > 0}>
                {loading
                  ? t('auth.actions.unlocking')
                  : lockoutTime > 0
                  ? `🔒 ${t('auth.unlock.locked', { defaultValue: 'Bloqueado' })} - ${formatLockoutTime(lockoutTime)}`
                  : t('auth.actions.unlock')}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" role="status" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-4 border-t space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate('/auth')}
              >
                {allAccounts.length > 1 ? (
                  <>
                    ➕ {t('auth.actions.addNewAccount', { defaultValue: 'Adicionar Nova Conta' })}
                  </>
                ) : (
                  <>
                    🔄 {t('auth.actions.switchAccount', { defaultValue: 'Trocar de Conta' })}
                  </>
                )}
              </Button>

              <Button
                variant="link"
                onClick={() => navigate('/auth/recover-pin')}
                className="w-full text-sm"
              >
                {t('auth.recover.forgotPin', { defaultValue: 'Esqueci meu PIN' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Unlock;
