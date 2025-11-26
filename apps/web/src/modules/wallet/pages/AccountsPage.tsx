import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Check } from 'lucide-react';
import {
  decryptMnemonic,
  encryptMnemonic,
  removeAccount,
  saveAccount,
  setActiveAccount,
  updateAccountName,
  type VaultAccountRecord,
} from '@/modules/auth';
import { useKeyring } from '@/modules/auth/useKeyring';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { fetchNonce, buildSiwsMessage, loginSiws } from '@/modules/auth';
import { PinService } from '@/modules/wallet/pin/PinService';
import { beginReauth, endReauth } from '@/modules/auth/session';
import { toast } from 'sonner';

type Panel = 'create' | 'import' | null;

interface FormState {
  error: string | null;
  success: string | null;
}

const MIN_PIN_LENGTH = 6;

export function AccountsPage() {
  const { t } = useTranslation();
  const { accounts, active, loading } = useVaultAccounts();
  const { signMessage } = useKeyring();
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [formState, setFormState] = useState<FormState>({ error: null, success: null });
  const [exportTarget, setExportTarget] = useState<VaultAccountRecord | null>(null);
  const [removeTarget, setRemoveTarget] = useState<VaultAccountRecord | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelValue, setLabelValue] = useState('');
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSelectPanel = (next: Panel) => {
    setPanel((current) => (current === next ? null : next));
    setFormState({ error: null, success: null });
    setExportTarget(null);
    setRemoveTarget(null);
  };

  const handleSetActive = async (address: string) => {
    try {
      beginReauth();
      setActivating(address);
      // Não trocar a conta ativa ainda. Só após validar PIN e SIWS.
      setPendingAddress(address);
      const acct = accounts.find((a) => a.address === address);
      const pin = await PinService.getPin({
        title: t('wallet.send.pinTitle', 'Digite seu PIN'),
        description: t('wallet.send.pinDescription', 'Desbloqueie para assinar a sessão'),
        validate: async (pinTry: string) => {
          if (!acct) return t('wallet.accounts.messages.activeError', 'Conta não encontrada.');
          try {
            await decryptMnemonic(acct.cipher, acct.iv, acct.salt, pinTry, acct.authTag, acct.iterations);
            return null;
          } catch (e) {
            return t('wallet.accounts.messages.pinAccountMismatch', 'PIN não pertence a esta conta.');
          }
        },
      });
      await handleConfirmPin(address, pin);
    } catch (error) {
      console.error(error);
      setFormState({ error: t('wallet.accounts.messages.activeError'), success: null });
      endReauth();
    } finally {
      setActivating(null);
    }
  };

  const handleConfirmPin = async (address: string, pin: string) => {
    const acct = accounts.find((a) => a.address === address);
    if (!acct) { setPendingAddress(null); return; }
    try {
      const mnemonic = await decryptMnemonic(acct.cipher, acct.iv, acct.salt, pin, acct.authTag, acct.iterations);
      const nonce = await fetchNonce(address);
      const message = buildSiwsMessage(address, nonce);
      const signature = await signMessage(mnemonic, message);
      await loginSiws({ address, message, signature });
      // Agora, com a sessão da conta selecionada ativa, podemos persistir a conta ativa no cofre local
      await setActiveAccount(address);
      setFormState({ error: null, success: t('wallet.accounts.messages.activeSuccess', 'Conta definida como ativa.') });
      toast.success(t('wallet.accounts.messages.activeAndLinked', 'Conta ativa e sessão vinculada ao perfil da conta.'));
      setPendingAddress(null);
      endReauth();
      setTimeout(() => window.location.reload(), 300);
    } catch (err) {
      console.error(err);
      // Mensagem específica para PIN incorreto/seed não decriptada
      const anyErr = err as any;
      const name = anyErr?.name || '';
      const msg = (anyErr?.message as string) || '';
      const pinMismatch = /OperationError/i.test(name) || /OperationError/i.test(msg) || /decrypt/i.test(msg);
      if (pinMismatch) {
        toast.error(t('wallet.accounts.messages.pinAccountMismatch', 'PIN não pertence a esta conta.'));
      } else {
        toast.error(t('wallet.accounts.messages.activeLinkFailed', 'Conta trocada, mas não foi possível atualizar a sessão. Faça login novamente.'));
      }
      endReauth();
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('wallet.accounts.title')}</h1>
        <p className="text-muted-foreground">{t('wallet.accounts.subtitle')}</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button variant={panel === 'create' ? 'default' : 'outline'} onClick={() => handleSelectPanel('create')}>
          {t('wallet.accounts.actions.create')}
        </Button>
        <Button variant={panel === 'import' ? 'default' : 'outline'} onClick={() => handleSelectPanel('import')}>
          {t('wallet.accounts.actions.import')}
        </Button>
      </div>

      {formState.error && (
        <Alert variant="destructive" role="status" aria-live="assertive">
          <AlertDescription>{formState.error}</AlertDescription>
        </Alert>
      )}

      {formState.success && (
        <Alert role="status" aria-live="polite">
          <AlertDescription>{formState.success}</AlertDescription>
        </Alert>
      )}

      {panel === 'create' && (
        <CreateAccountPanel
          onClose={() => handleSelectPanel(null)}
          onSuccess={(message) => setFormState({ error: null, success: message })}
          onError={(message) => setFormState({ error: message, success: null })}
        />
      )}

      {panel === 'import' && (
        <ImportAccountPanel
          onClose={() => handleSelectPanel(null)}
          onSuccess={(message) => setFormState({ error: null, success: message })}
          onError={(message) => setFormState({ error: message, success: null })}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('wallet.accounts.listTitle')}</CardTitle>
          <CardDescription>{t('wallet.accounts.listDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('wallet.accounts.loading')}</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('wallet.accounts.empty')}</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((account) => {
                const isActive = active?.address === account.address;
                return (
                  <li
                    key={account.address}
                    className="rounded-lg border border-border/60 bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground break-all">{account.address}</p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              title={t('wallet.accounts.copyAddress', 'Copiar endereço')}
                              aria-label={t('wallet.accounts.copyAddress', 'Copiar endereço')}
                              onClick={() => {
                                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                  navigator.clipboard.writeText(account.address)
                                    .then(() => {
                                      setCopied(account.address);
                                      setTimeout(() => setCopied(null), 1500);
                                    })
                                    .catch((err) => console.error('[wallet] copy address failed', err));
                                }
                              }}
                              >
                              {copied === account.address ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            {copied === account.address && (
                              <span
                                role="tooltip"
                                className="text-[11px] rounded bg-emerald-600 text-white px-2 py-0.5 shadow"
                              >
                                {t('wallet.accounts.copied', 'Copiado!')}
                              </span>
                            )}
                          </div>
                          {editingLabel === account.address ? (
                            <div className="flex items-center gap-2">
                              <Input
                                className="h-8 max-w-xs"
                                placeholder={t('wallet.accounts.label.placeholder', 'Rótulo (opcional)')}
                                value={labelValue}
                                onChange={(e) => setLabelValue(e.target.value)}
                              />
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setSavingLabel(account.address);
                                    await updateAccountName(account.address, labelValue.trim() || undefined);
                                    setEditingLabel(null);
                                    setLabelValue('');
                                  } catch (err) {
                                    console.error(err);
                                    setFormState({ error: t('wallet.accounts.label.error', 'Falha ao salvar rótulo'), success: null });
                                  } finally {
                                    setSavingLabel(null);
                                  }
                                }}
                                disabled={savingLabel === account.address}
                              >
                                {savingLabel === account.address ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('common.saving', 'Salvando...')}
                                  </>
                                ) : t('common.save', 'Salvar')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditingLabel(null); setLabelValue(''); }}
                              >
                                {t('common.cancel', 'Cancelar')}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {account.name ? (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                  {account.name}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t('wallet.accounts.label.empty', 'Sem rótulo')}</span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEditingLabel(account.address); setLabelValue(account.name || ''); }}
                              >
                                {t('wallet.accounts.label.edit', 'Editar rótulo')}
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('wallet.accounts.addedAt', {
                            date: new Date(account.createdAt).toLocaleString(),
                          })}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isActive ? (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {t('wallet.accounts.activeBadge')}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleSetActive(account.address)}
                            disabled={activating === account.address}
                            aria-busy={activating === account.address}
                          >
                            {activating === account.address ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('wallet.accounts.makingActive', 'Ativando...')}
                              </>
                            ) : (
                              t('wallet.accounts.makeActive')
                            )}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setExportTarget(account)}>
                          {t('wallet.accounts.actions.export')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={() => setRemoveTarget(account)}
                        >
                          {t('wallet.accounts.actions.remove')}
                        </Button>
                      </div>
                    </div>

                    {exportTarget?.address === account.address && (
                      <ExportAccountPanel
                        account={account}
                        onClose={() => setExportTarget(null)}
                        onError={(message) => setFormState({ error: message, success: null })}
                      />
                    )}

                    {removeTarget?.address === account.address && (
                      <RemoveAccountPanel
                        account={account}
                        onClose={() => setRemoveTarget(null)}
                        onRemoved={(message) => setFormState({ error: null, success: message })}
                        onError={(message) => setFormState({ error: message, success: null })}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* PinDialog centralizado via PinProvider; nada aqui */}
    </section>
  );
}

interface PanelProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function CreateAccountPanel({ onClose, onSuccess, onError }: PanelProps) {
  const { t } = useTranslation();
  const { generateMnemonic, deriveAddress } = useKeyring();
  const [mnemonic, setMnemonic] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          confirmation: z.string().min(1, { message: t('wallet.accounts.create.confirmRequired') }),
          name: z.string().max(64).optional(),
          pin: z.string().min(MIN_PIN_LENGTH, { message: t('wallet.accounts.create.pinShort') }),
          pinConfirm: z.string(),
        })
        .refine((value) => value.pin === value.pinConfirm, {
          path: ['pinConfirm'],
          message: t('wallet.accounts.create.pinMismatch'),
        }),
    [t]
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmation: '',
      name: '',
      pin: '',
      pinConfirm: '',
    },
  });

  const refreshMnemonic = useCallback(async () => {
    const words = await generateMnemonic();
    const cleaned = words.trim().replace(/\s+/g, ' ');
    setMnemonic(cleaned);
    form.reset({ confirmation: '', name: '', pin: '', pinConfirm: '' });
  }, [form, generateMnemonic]);

  useEffect(() => {
    void refreshMnemonic();
  }, [refreshMnemonic]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      if (!mnemonic) {
        form.setError('confirmation', { message: t('wallet.accounts.create.confirmMismatch') });
        setSubmitting(false);
        return;
      }
      const confirmation = values.confirmation.trim().replace(/\s+/g, ' ');
      if (confirmation !== mnemonic) {
        form.setError('confirmation', { message: t('wallet.accounts.create.confirmMismatch') });
        setSubmitting(false);
        return;
      }

      const address = await deriveAddress(mnemonic);
      const encrypted = await encryptMnemonic(mnemonic, values.pin);
      await saveAccount({
        address,
        cipher: encrypted.cipher,
        iv: encrypted.iv,
        salt: encrypted.salt,
        iterations: encrypted.iterations,
        name: values.name?.trim() || undefined,
      });
      onSuccess(t('wallet.accounts.create.success'));
      setMnemonic('');
      onClose();
    } catch (error) {
      console.error(error);
      onError(t('wallet.accounts.create.error'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle>{t('wallet.accounts.create.title')}</CardTitle>
        <CardDescription>{t('wallet.accounts.create.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t('wallet.accounts.create.mnemonicLabel')}</Label>
          <div className="rounded-md border border-dashed border-primary/40 bg-muted/50 p-4 text-sm leading-relaxed">
            {mnemonic
              ? mnemonic.split(' ').map((word, index) => (
                  <span key={word + index} className="inline-flex items-center gap-1 px-1">
                    <span className="text-muted-foreground text-xs">{index + 1}.</span>
                    <span>{word}</span>
                  </span>
                ))
              : (
                  <span className="text-xs text-muted-foreground">{t('wallet.accounts.create.generating')}</span>
                )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  void navigator.clipboard.writeText(mnemonic).catch((error) => {
                    console.error('[wallet] failed to copy mnemonic', error);
                  });
                }
              }}
            >
              {t('wallet.accounts.create.copyMnemonic')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void refreshMnemonic()}>
              {t('wallet.accounts.create.regenerate')}
            </Button>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="confirmation">{t('wallet.accounts.create.confirmationLabel')}</Label>
            <Textarea id="confirmation" {...form.register('confirmation')} disabled={submitting} />
            {form.formState.errors.confirmation && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmation.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('wallet.accounts.create.nameLabel')}</Label>
              <Input id="name" {...form.register('name')} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">{t('wallet.accounts.create.pinLabel')}</Label>
              <Input id="pin" type="password" inputMode="numeric" {...form.register('pin')} disabled={submitting} />
              {form.formState.errors.pin && (
                <p className="text-xs text-destructive">{form.formState.errors.pin.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinConfirm">{t('wallet.accounts.create.pinConfirmLabel')}</Label>
              <Input
                id="pinConfirm"
                type="password"
                inputMode="numeric"
                {...form.register('pinConfirm')}
                disabled={submitting}
              />
              {form.formState.errors.pinConfirm && (
                <p className="text-xs text-destructive">{form.formState.errors.pinConfirm.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('wallet.accounts.create.saving')}
                </>
              ) : (
                t('wallet.accounts.create.submit')
              )}
            </Button>
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              {t('wallet.accounts.create.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface ImportPanelProps extends PanelProps {}

function ImportAccountPanel({ onClose, onSuccess, onError }: ImportPanelProps) {
  const { t } = useTranslation();
  const { validateMnemonic, deriveAddress } = useKeyring();
  const [submitting, setSubmitting] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          mnemonic: z.string().min(1, { message: t('wallet.accounts.import.mnemonicRequired') }),
          name: z.string().max(64).optional(),
          pin: z.string().min(MIN_PIN_LENGTH, { message: t('wallet.accounts.import.pinShort') }),
          pinConfirm: z.string(),
        })
        .refine((value) => value.pin === value.pinConfirm, {
          path: ['pinConfirm'],
          message: t('wallet.accounts.import.pinMismatch'),
        }),
    [t]
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      mnemonic: '',
      name: '',
      pin: '',
      pinConfirm: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      const trimmed = values.mnemonic.trim().replace(/\s+/g, ' ');
      const isValid = await validateMnemonic(trimmed);
      if (!isValid) {
        form.setError('mnemonic', { message: t('wallet.accounts.import.mnemonicInvalid') });
        setSubmitting(false);
        return;
      }

      const address = await deriveAddress(trimmed);
      const encrypted = await encryptMnemonic(trimmed, values.pin);
      await saveAccount({
        address,
        cipher: encrypted.cipher,
        iv: encrypted.iv,
        salt: encrypted.salt,
        iterations: encrypted.iterations,
        name: values.name?.trim() || undefined,
      });

      onSuccess(t('wallet.accounts.import.success'));
      form.reset();
      onClose();
    } catch (error) {
      console.error(error);
      onError(t('wallet.accounts.import.error'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle>{t('wallet.accounts.import.title')}</CardTitle>
        <CardDescription>{t('wallet.accounts.import.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="mnemonic">{t('wallet.accounts.import.mnemonicLabel')}</Label>
            <Textarea id="mnemonic" rows={3} {...form.register('mnemonic')} disabled={submitting} />
            {form.formState.errors.mnemonic && (
              <p className="text-xs text-destructive">{form.formState.errors.mnemonic.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('wallet.accounts.import.nameLabel')}</Label>
              <Input id="name" {...form.register('name')} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">{t('wallet.accounts.import.pinLabel')}</Label>
              <Input id="pin" type="password" inputMode="numeric" {...form.register('pin')} disabled={submitting} />
              {form.formState.errors.pin && (
                <p className="text-xs text-destructive">{form.formState.errors.pin.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinConfirm">{t('wallet.accounts.import.pinConfirmLabel')}</Label>
              <Input
                id="pinConfirm"
                type="password"
                inputMode="numeric"
                {...form.register('pinConfirm')}
                disabled={submitting}
              />
              {form.formState.errors.pinConfirm && (
                <p className="text-xs text-destructive">{form.formState.errors.pinConfirm.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('wallet.accounts.import.saving')}
                </>
              ) : (
                t('wallet.accounts.import.submit')
              )}
            </Button>
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              {t('wallet.accounts.import.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface ExportPanelProps {
  account: VaultAccountRecord;
  onClose: () => void;
  onError: (message: string) => void;
}

function ExportAccountPanel({ account, onClose, onError }: ExportPanelProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!pin) {
      onError(t('wallet.accounts.export.pinRequired'));
      return;
    }
    try {
      setLoading(true);
      const secret = await decryptMnemonic(account.cipher, account.iv, account.salt, pin, account.authTag, account.iterations);
      setMnemonic(secret);
      setRevealed(true);
    } catch (error) {
      console.error(error);
      onError(t('wallet.accounts.export.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
      setMnemonic(null);
    setPin('');
    setRevealed(false);
    onClose();
  };

  return (
    <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-muted/30 p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`export-pin-${account.address}`}>{t('wallet.accounts.export.pinLabel')}</Label>
          <Input
            id={`export-pin-${account.address}`}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void handleExport()} disabled={loading}>
            {loading ? t('wallet.accounts.export.loading') : t('wallet.accounts.export.submit')}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClose}>
            {t('wallet.accounts.export.close')}
          </Button>
          {mnemonic && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  void navigator.clipboard.writeText(mnemonic).catch((error) => {
                    console.error('[wallet] failed to copy mnemonic', error);
                  });
                }
              }}
            >
              {t('wallet.accounts.export.copy')}
            </Button>
          )}
        </div>

        {revealed && mnemonic && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <p className="font-semibold text-destructive">
              {t('wallet.accounts.export.warning')}
            </p>
            <p className="mt-2 break-all text-destructive-foreground">{mnemonic}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface RemovePanelProps {
  account: VaultAccountRecord;
  onClose: () => void;
  onRemoved: (message: string) => void;
  onError: (message: string) => void;
}

function RemoveAccountPanel({ account, onClose, onRemoved, onError }: RemovePanelProps) {
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (confirmation.trim() !== account.address) {
      onError(t('wallet.accounts.remove.mismatch'));
      return;
    }
    try {
      setLoading(true);
      await removeAccount(account.address);
      onRemoved(t('wallet.accounts.remove.success'));
      onClose();
    } catch (error) {
      console.error(error);
      onError(t('wallet.accounts.remove.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm text-destructive-foreground">
        {t('wallet.accounts.remove.confirmText')}
      </p>
      <div className="mt-3 space-y-2">
        <Label htmlFor={`remove-${account.address}`}>{t('wallet.accounts.remove.confirmLabel')}</Label>
        <Input
          id={`remove-${account.address}`}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={loading}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => void handleRemove()}
          disabled={loading}
        >
          {loading ? t('wallet.accounts.remove.loading') : t('wallet.accounts.remove.submit')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t('wallet.accounts.remove.cancel')}
        </Button>
      </div>
    </div>
  );
}

export default AccountsPage;
