// path: apps/web/src/modules/orders/pages/OrderPayPage.tsx

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertCircle, CheckCircle, Clock, CreditCard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { getApi } from '@/modules/wallet/services/polkadot';
import { useChainProps } from '@/modules/wallet/hooks/useChainProps';
import { normaliseAddress } from '@/modules/wallet/utils/format';
import { ordersApi } from '../api';
import { getNativeBalance } from '@/modules/wallet/services/balances';
import { BZR } from '@/utils/bzr';
import { PinService } from '@/modules/wallet/pin/PinService';

interface OrderDetails {
  id: string;
  buyerAddr: string;
  sellerAddr: string;
  sellerId: string;
  subtotalBzr: string;
  shippingBzr: string;
  totalBzr: string;
  status: string;
  shippingAddress: any;
  items: Array<{
    listingId: string;
    kind: string;
    qty: number;
    unitPriceBzrSnapshot: string;
    titleSnapshot: string;
    lineTotalBzr: string;
  }>;
  paymentIntents: Array<{
    id: string;
    amountBzr: string;
    escrowAddress: string;
    status: string;
  }>;
}

interface PaymentIntent {
  orderId: string;
  escrowAddress: string;
  amountBzr: string;
  feeBps: number;
  paymentIntentId: string;
}

export function OrderPayPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const chainProps = useChainProps();
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const activeAccount = await getActiveAccount();
        setAccount(activeAccount);
      } catch (err) {
        console.error('Failed to load account:', err);
      }
    };
    loadAccount();
  }, []);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [ed, setEd] = useState<string | null>(null);
  const [freeBalance, setFreeBalance] = useState<string | null>(null);
  // PIN handled via global PinService

  const formatBzr = useCallback((value: string | number) => {
    const locale = BZR.normalizeLocale(i18n.language);
    return BZR.formatAuto(value, locale, true);
  }, [i18n.language]);

  const loadOrderData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const orderData = await ordersApi.get(id);
      setOrder(orderData);

      if (orderData.status === 'CREATED') {
        const intentData = await ordersApi.createPaymentIntent(id);
        setPaymentIntent(intentData);

        try {
          // Chain props
          const api = await getApi();
          const existential = api.consts?.balances?.existentialDeposit?.toString?.() ?? '0';
          setEd(existential.toString());

          // Balance + fee estimate
          const active = await getActiveAccount();
          if (active?.address) {
            const bal = await getNativeBalance(active.address);
            setFreeBalance(bal.free.toString());
            const tx = api.tx.balances.transferKeepAlive(intentData.escrowAddress, intentData.amountBzr);
            const info = await tx.paymentInfo(active.address);
            setEstimatedFee(info.partialFee.toString());
          }
        } catch (e) {
          // node offline or api error
          setError(t('checkout.error.apiNotReady', 'API não está conectada'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pay.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  const signAndPay = useCallback(async (pin: string) => {
    if (!account || !paymentIntent || !order || !chainProps) return;

    setPaying(true);
    setError(null);
    setPinError(null);

    try {
      const api = await getApi();
      let mnemonic = await decryptMnemonic(account.cipher, account.iv, account.salt, pin, account.iterations);
      await cryptoWaitReady();
      const ss58 = chainProps?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      const tx = api.tx.balances.transferKeepAlive(paymentIntent.escrowAddress, paymentIntent.amountBzr);

      const unsubscribe = await tx.signAndSend(pair, (result) => {
        const { status, dispatchError } = result as any;

        if (dispatchError) {
          let message = String(dispatchError);
          if (dispatchError.isModule) {
            const metaError = api.registry.findMetaError(dispatchError.asModule);
            message = `${metaError.section}.${metaError.name}`;
          }
          setError(message);
          setPaying(false);
          try { (unsubscribe as unknown as () => void)(); } catch {}
          return;
        }

        if (status?.isFinalized) {
          try { (unsubscribe as unknown as () => void)(); } catch {}
          navigate(`/app/orders/${order.id}`);
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('pay.error.paymentFailed');
      setPinError(msg);
      setPaying(false);
    }
  }, [account, paymentIntent, order, chainProps, navigate, t]);

  const handlePayment = useCallback(async () => {
    if (!paymentIntent || !order || !chainProps) return;
    const acct = await getActiveAccount();
    if (!acct) return;
    const pin = await PinService.getPin({
      title: t('wallet.send.pinTitle'),
      description: t('wallet.send.pinDescription'),
      validate: async (p) => {
        try { await decryptMnemonic(acct.cipher, acct.iv, acct.salt, p, acct.iterations); return null; }
        catch { return t('wallet.send.errors.pinInvalid') as string; }
      },
    });
    await signAndPay(pin);
  }, [paymentIntent, order, chainProps, t, signAndPay]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Clock className="h-8 w-8 animate-spin" />
            <span className="ml-2">{t('pay.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('pay.notFound.title')}</h2>
              <p className="text-muted-foreground text-center mb-6">
                {t('pay.notFound.description')}
              </p>
              <Button onClick={() => navigate('/app/orders')}>
                {t('pay.notFound.backToOrders')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const amount = paymentIntent ? BigInt(paymentIntent.amountBzr) : 0n;
  const fee = estimatedFee ? BigInt(estimatedFee) : 0n;
  const edVal = ed ? BigInt(ed) : 0n;
  const free = freeBalance ? BigInt(freeBalance) : 0n;
  const hasFunds = free - fee - amount >= edVal;
  // Mostrar o card de pagamento sempre que houver intent e status CREATED;
  // o botão fica desabilitado conforme saldo/conta
  const canPay = order.status === 'CREATED' && Boolean(paymentIntent);
  const isPaid = ['ESCROWED', 'SHIPPED', 'RELEASED'].includes(order.status);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('pay.title')}</h1>
            <p className="text-muted-foreground">
              {t('pay.orderNumber', { number: order.id.slice(-8) })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isPaid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-orange-500" />
                )}
                {t('pay.status.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={isPaid ? 'default' : 'secondary'}>
                {t(`orderStatus.${order.status.toLowerCase()}`, order.status)}
              </Badge>
            </CardContent>
          </Card>

          {/* Payment Details */}
          {canPay && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t('pay.payment.title')}
                </CardTitle>
                <CardDescription>{t('pay.payment.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('pay.payment.amount')}</span>
                    <span className="font-mono">{formatBzr(paymentIntent.amountBzr)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('pay.payment.escrow')}</span>
                    <span className="font-mono text-xs">{paymentIntent.escrowAddress}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('pay.payment.fee')}</span>
                    <span>{paymentIntent.feeBps / 100}%</span>
                  </div>
                  {estimatedFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('checkout.networkFee', 'Taxa de rede')}</span>
                      <span className="font-mono">{formatBzr(estimatedFee)}</span>
                    </div>
                  )}
                </div>

                {!account && (
                  <div className="p-4 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50">
                    <p className="text-orange-800 dark:text-orange-200 text-sm">
                      {t('pay.payment.connectWallet')}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-destructive text-sm">{error}</p>
                  </div>
                )}

                {paying && (
                  <div className="p-4 rounded-md bg-primary/10 border border-primary/20">
                    <p className="text-sm">{t('pay.payment.processing')}</p>
                  </div>
                )}

                {!hasFunds && (
                  <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40">
                    <div className="flex items-start gap-2 text-sm">
                      <Info className="h-4 w-4 mt-0.5" />
                      <div>
                        <p>{t('pay.payment.insufficient', 'Saldo insuficiente para cobrir valor, taxa e ED.')}</p>
                        <Button variant="link" className="px-0" onClick={() => navigate('/app/wallet/receive')}>
                          {t('pay.payment.addFunds', 'Adicionar fundos')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handlePayment}
                  disabled={!account || paying || !hasFunds}
                  className="w-full"
                  size="lg"
                >
                  {paying ? t('pay.payment.processing') : t('pay.payment.payNow')}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  {t('pay.payment.escrowNote')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t('pay.summary.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{item.titleSnapshot}</p>
                        <Badge variant="outline" className="text-xs">
                          {t(`cart.kind.${item.kind}`)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('pay.summary.qty', { qty: item.qty })} × {formatBzr(item.unitPriceBzrSnapshot)}
                      </p>
                    </div>
                    <p className="font-medium text-sm">
                      {formatBzr(item.lineTotalBzr)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('pay.summary.subtotal')}</span>
                  <span>{formatBzr(order.subtotalBzr)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('pay.summary.shipping')}</span>
                  <span>{formatBzr(order.shippingBzr)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>{t('pay.summary.total')}</span>
                  <span>{formatBzr(order.totalBzr)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>{t('pay.shipping.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* PIN handled globally via PinProvider */}
    </div>
  );
}

// Pin dialog rendered at root to match wallet signer UX
// This must be after component return to avoid JSX nesting issues, so we export a fragment in the same tree.
