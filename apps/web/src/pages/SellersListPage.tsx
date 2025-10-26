import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sellerApi } from '@/modules/seller/api';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { FEATURE_FLAGS } from '@/config';
import { ArrowRight, Loader2 } from 'lucide-react';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { PinService } from '@/modules/wallet/pin/PinService';
import { getApi, getChainProps } from '@/modules/wallet/services/polkadot';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { toast } from 'sonner';

type PendingTransfer = {
  storeId: string;
  shopSlug: string;
  shopName: string;
  dbId: string;
  currentOwnerAddress: string;
  state: 'pending' | 'claimable';
  targetOwnerAddress: string;
};

export default function SellersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<Array<{ id: string; shopName: string; shopSlug: string; isDefault?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [acceptingTransfer, setAcceptingTransfer] = useState<string | null>(null);

  console.log('[SellersListPage] RENDER - items:', items.length, 'pendingTransfers:', pendingTransfers.length, 'loading:', loading);

  const loadPendingTransfers = useCallback(async () => {
    if (!FEATURE_FLAGS.store_onchain_v1) {
      console.log('[SellersListPage] store_onchain_v1 flag is disabled');
      return;
    }

    setPendingLoading(true);
    try {
      const res = await sellerApi.listPendingTransfers();
      console.log('[SellersListPage] Pending transfers loaded:', res.pendingTransfers);
      setPendingTransfers(res.pendingTransfers || []);
    } catch (e: any) {
      console.error('[SellersListPage] Error loading pending transfers:', e);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        console.log('[SellersListPage] Loading stores and pending transfers...');
        // Carregar lojas e transferências em paralelo
        const [storesRes] = await Promise.all([
          sellerApi.listMyStores(),
          loadPendingTransfers(),
        ]);

        if (!active) return;
        console.log('[SellersListPage] Stores loaded:', storesRes.items);
        console.log('[SellersListPage] Current pendingTransfers state:', pendingTransfers);
        setItems(storesRes.items || []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || t('errors.generic'));
      } finally {
        if (active) {
          console.log('[SellersListPage] Loading complete. items:', items.length, 'pendingTransfers:', pendingTransfers.length);
          setLoading(false);
        }
      }
    })();
    return () => { active = false; };
  }, [t, loadPendingTransfers]);

  const handleAcceptTransfer = useCallback(async (transfer: PendingTransfer) => {
    setAcceptingTransfer(transfer.storeId);

    try {
      const account = await getActiveAccount();
      if (!account) {
        toast.error(t('seller.onchain.walletMissing', { defaultValue: 'Carteira não configurada' }));
        return;
      }

      if (transfer.targetOwnerAddress && transfer.targetOwnerAddress !== account.address) {
        toast.error(t('seller.onchain.transferWrongAccount', {
          defaultValue: 'Conecte a carteira correta para concluir a transferência.',
        }));
        return;
      }

      if (transfer.state === 'claimable') {
        await sellerApi.updateMyStore(transfer.dbId, {
          ownerAddress: account.address,
        });

        toast.success(t('seller.onchain.transferClaimed', {
          defaultValue: 'Ownership sincronizado com sucesso!'
        }));
      } else {
        const chain = await getChainProps();
        const api = await getApi();
        await cryptoWaitReady();

        const pin = await PinService.getPin({
          title: t('seller.onchain.pinTitle', { defaultValue: 'Confirmar assinatura' }),
          description: t('seller.onchain.acceptTransferDescription', {
            defaultValue: 'Informe o PIN para aceitar a transferência da loja.',
          }),
          validate: async (candidate) => {
            try {
              await decryptMnemonic(account.cipher, account.iv, account.salt, candidate, account.iterations);
              return null;
            } catch {
              return t('wallet.send.errors.pinInvalid', { defaultValue: 'PIN inválido' }) as string;
            }
          },
        });

        let mnemonic = await decryptMnemonic(
          account.cipher,
          account.iv,
          account.salt,
          pin,
          account.iterations,
        );
        const keyring = new Keyring({ type: 'sr25519', ss58Format: chain.ss58Prefix });
        const pair = keyring.addFromMnemonic(mnemonic);
        mnemonic = '';

        try {
          const tx = api.tx.stores.acceptTransfer(transfer.storeId);

          await new Promise((resolve, reject) => {
            let unsub: (() => void) | undefined;
            tx.signAndSend(pair, (result) => {
              if (result.dispatchError) {
                if (unsub) unsub();
                const message = result.dispatchError.toString();
                reject(new Error(message));
                return;
              }
              if (result.status?.isFinalized) {
                if (unsub) unsub();
                resolve(result);
              }
            })
              .then((unsubscribe) => {
                unsub = unsubscribe;
              })
              .catch((err) => {
                if (unsub) unsub();
                reject(err);
              });
          });

          await sellerApi.updateMyStore(transfer.dbId, {
            ownerAddress: account.address,
          });

          toast.success(t('seller.onchain.transferAccepted', { defaultValue: 'Transferência aceita com sucesso!' }));
        } finally {
          try {
            pair.lock?.();
          } catch {}
        }
      }

      const res = await sellerApi.listMyStores();
      setItems(res.items || []);
      await loadPendingTransfers();
    } catch (err: any) {
      console.error('Error accepting transfer:', err);
      if (err?.message === 'cancelled') return;

      toast.error(
        err?.message || t('seller.onchain.transferAcceptError', { defaultValue: 'Erro ao aceitar transferência' })
      );
    } finally {
      setAcceptingTransfer(null);
    }
  }, [t, loadPendingTransfers]);

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <Breadcrumbs items={[
        { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
        { label: t('seller.myStores.title', { defaultValue: 'Minhas Lojas' }) }
      ]} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('seller.myStores.title', { defaultValue: 'Minhas Lojas' })}</h1>
        <Button onClick={() => navigate('/app/seller/setup')}>{t('seller.myStores.new', { defaultValue: 'Criar loja' })}</Button>
      </div>

      {/* Transferências Pendentes */}
      {FEATURE_FLAGS.store_onchain_v1 && pendingTransfers.length > 0 && (
        <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <ArrowRight className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  {t('seller.pendingTransfers.title', {
                    defaultValue: 'Transferências Pendentes',
                    count: pendingTransfers.length
                  })}
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  {t('seller.pendingTransfers.description', {
                    defaultValue: 'Você tem lojas aguardando sua aceitação de transferência de ownership.',
                  })}
                </p>
              </div>

              <div className="space-y-2">
                {pendingTransfers.map((transfer) => (
                  <Card key={transfer.storeId} className="bg-white dark:bg-slate-950">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{transfer.shopName}</CardTitle>
                      <CardDescription>@{transfer.shopSlug}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground space-y-1">
                          {transfer.state === 'pending' ? (
                            <div>
                              {t('seller.pendingTransfers.from', { defaultValue: 'De:' })}{' '}
                              <code className="bg-muted px-1 rounded">
                                {transfer.currentOwnerAddress.slice(0, 8)}...{transfer.currentOwnerAddress.slice(-6)}
                              </code>
                            </div>
                          ) : (
                            <div>
                              {t('seller.pendingTransfers.claimable', {
                                defaultValue: 'Transferência já concluída na blockchain. Sincronize para concluir.',
                              })}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptTransfer(transfer)}
                          disabled={acceptingTransfer === transfer.storeId}
                        >
                          {acceptingTransfer === transfer.storeId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {transfer.state === 'claimable'
                                ? t('seller.onchain.claiming', { defaultValue: 'Sincronizando...' })
                                : t('seller.onchain.accepting', { defaultValue: 'Aceitando...' })}
                            </>
                          ) : transfer.state === 'claimable' ? (
                            t('seller.onchain.claimButton', { defaultValue: 'Sincronizar ownership' })
                          ) : (
                            t('seller.onchain.acceptButton', { defaultValue: 'Aceitar transferência' })
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-muted-foreground">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : items.length === 0 && pendingTransfers.length === 0 ? (
        <div className="text-muted-foreground">{t('seller.myStores.empty', { defaultValue: 'Você ainda não tem lojas.' })}</div>
      ) : (
        <>
          {items.length === 0 && pendingTransfers.length > 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {t('seller.myStores.emptyWithPending', {
                  defaultValue: 'Você ainda não criou nenhuma loja, mas tem transferências aguardando aceitação acima.'
                })}
              </p>
              <Button onClick={() => navigate('/app/seller/setup')}>
                {t('seller.myStores.new', { defaultValue: 'Criar loja' })}
              </Button>
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((s) => (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>{s.shopName}</span>
                      {s.isDefault ? <span className="text-xs text-muted-foreground">({t('seller.myStores.default', { defaultValue: 'padrão' })})</span> : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Link to={`/app/sellers/${s.shopSlug}`}>
                      <Button>{t('seller.myStores.manage', { defaultValue: 'Gerenciar' })}</Button>
                    </Link>
                    <Link to={`/loja/${s.shopSlug}`}>
                      <Button variant="outline">{t('seller.myStores.public', { defaultValue: 'Ver pública' })}</Button>
                    </Link>
                    <Link to={`/app/seller/setup?store=${encodeURIComponent(s.id)}`}>
                      <Button variant="outline">{t('seller.myStores.edit', { defaultValue: 'Editar' })}</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
