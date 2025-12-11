// path: apps/web/src/modules/orders/pages/OrderPayPage.tsx
// PROPOSAL-003: Supports both single-order and multi-store batch payment

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertCircle, CheckCircle, Clock, CreditCard, Info, Shield, Copy, Check, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { getApi } from '@/modules/wallet/services/polkadot';
import { useChainProps } from '@/modules/wallet/hooks/useChainProps';
import { ordersApi } from '../api';
import { getNativeBalance } from '@/modules/wallet/services/balances';
import { BZR } from '@/utils/bzr';
import { PinService } from '@/modules/wallet/pin/PinService';
import { useBatchEscrowLock } from '@/hooks/blockchain/useEscrow';

interface OrderDetails {
  id: string;
  buyerAddr: string;
  sellerAddr: string;
  sellerId: string;
  sellerName?: string;
  subtotalBzr: string;
  shippingBzr: string;
  totalBzr: string;
  status: string;
  shippingAddress: any;
  // Blockchain reference for escrow operations
  blockchainOrderId: string | null;
  blockchainTxHash: string | null;
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

// State passed from CheckoutPage for multi-store checkout
interface MultiStoreState {
  checkoutSessionId: string;
  orderIds: string[];
  isMultiStore: true;
}

export function OrderPayPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const chainProps = useChainProps();
  const [account, setAccount] = useState<any>(null);

  // Check if this is a multi-store batch payment
  const multiStoreState = location.state as MultiStoreState | null;
  const isMultiStore = multiStoreState?.isMultiStore === true;
  const checkoutSessionId = multiStoreState?.checkoutSessionId;
  const orderIds = multiStoreState?.orderIds || (id ? [id] : []);

  // Batch escrow hook for multi-store
  const {
    prepareBatchLock,
    signAndSendBatch,
    isLoading: batchLoading,
    isPreparing,
    error: batchError,
  } = useBatchEscrowLock();

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

  // Single order state
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);

  // Multi-order state
  const [orders, setOrders] = useState<OrderDetails[]>([]);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [ed, setEd] = useState<string | null>(null);
  const [freeBalance, setFreeBalance] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatBzr = useCallback((value: string | number) => {
    const locale = BZR.normalizeLocale(i18n.language);
    return BZR.formatAuto(value, locale, true);
  }, [i18n.language]);

  // Load order data - single or multiple orders
  const loadOrderData = useCallback(async () => {
    if (!id && orderIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      if (isMultiStore && orderIds.length > 1) {
        // MULTI-STORE: Load all orders
        const ordersData = await ordersApi.getMultiple(orderIds) as OrderDetails[];
        setOrders(ordersData);
        // Set first order as primary for display
        if (ordersData.length > 0) {
          setOrder(ordersData[0]);
        }

        // Get balance for fee estimation
        try {
          const api = await getApi();
          const existential = api.consts?.balances?.existentialDeposit?.toString?.() ?? '0';
          setEd(existential.toString());

          const active = await getActiveAccount();
          if (active?.address) {
            const bal = await getNativeBalance(active.address);
            setFreeBalance(bal.free.toString());
          }
        } catch (e) {
          console.warn('Failed to get balance:', e);
        }
      } else {
        // SINGLE ORDER: Original flow
        const orderData = await ordersApi.get(id!) as OrderDetails;
        setOrder(orderData);
        setOrders([orderData]);

        if (orderData.status === 'CREATED') {
          const intentData = await ordersApi.createPaymentIntent(id!) as PaymentIntent;
          setPaymentIntent(intentData);

          try {
            const api = await getApi();
            const existential = api.consts?.balances?.existentialDeposit?.toString?.() ?? '0';
            setEd(existential.toString());

            const active = await getActiveAccount();
            if (active?.address && orderData.blockchainOrderId) {
              const bal = await getNativeBalance(active.address);
              setFreeBalance(bal.free.toString());
              const tx = api.tx.bazariEscrow.lockFunds(orderData.blockchainOrderId, orderData.sellerAddr, intentData.amountBzr);
              const info = await tx.paymentInfo(active.address);
              setEstimatedFee(info.partialFee.toString());
            }
          } catch (e) {
            setError(t('checkout.error.apiNotReady', 'API não está conectada'));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pay.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, isMultiStore, orderIds, t]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  // Single order payment
  const signAndPay = useCallback(async (pin: string) => {
    if (!account || !paymentIntent || !order || !chainProps) return;

    setPaying(true);
    setError(null);

    try {
      const api = await getApi();
      let mnemonic = await decryptMnemonic(account.cipher, account.iv, account.salt, pin, account.authTag, account.iterations);
      await cryptoWaitReady();
      const ss58 = chainProps?.props?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      if (!order.blockchainOrderId) {
        throw new Error('Order não tem blockchainOrderId. Tente novamente mais tarde.');
      }
      const tx = api.tx.bazariEscrow.lockFunds(order.blockchainOrderId, order.sellerAddr, paymentIntent.amountBzr);

      const unsubscribe = await tx.signAndSend(pair, async (result) => {
        const { status, dispatchError, txHash } = result as any;

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

          try {
            const blockNumber = status.asFinalized?.toString();
            await ordersApi.confirmEscrowLock(order.id, txHash.toString(), blockNumber);
          } catch (confirmError) {
            console.error('Failed to confirm escrow lock with backend:', confirmError);
          }

          navigate(`/app/orders/${order.id}`);
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('pay.error.paymentFailed');
      setError(msg);
      setPaying(false);
    }
  }, [account, paymentIntent, order, chainProps, navigate, t]);

  // Single order payment handler
  const handleSinglePayment = useCallback(async () => {
    if (!paymentIntent || !order || !chainProps) return;
    const acct = await getActiveAccount();
    if (!acct) return;

    const amount = BigInt(paymentIntent.amountBzr);
    const fee = estimatedFee ? BigInt(estimatedFee) : 0n;
    const total = amount + fee;
    const free = freeBalance ? BigInt(freeBalance) : 0n;
    const balanceSufficient = free >= total;

    const pin = await PinService.getPin({
      title: t('wallet.send.pinTitle', 'Confirmar Pagamento'),
      description: t('wallet.send.pinDescription', 'Digite o PIN para assinar a transação'),
      transaction: {
        type: 'payment',
        description: `Pagar pedido #${order.id.slice(-8)}`,
        amount: formatBzr(paymentIntent.amountBzr),
        fee: estimatedFee ? formatBzr(estimatedFee) : 'Calculando...',
        total: formatBzr(total.toString()),
        balance: freeBalance ? formatBzr(freeBalance) : undefined,
        balanceSufficient,
        warning: !balanceSufficient ? 'Saldo insuficiente para completar o pagamento' : undefined,
      },
      validate: async (p) => {
        try { await decryptMnemonic(acct.cipher, acct.iv, acct.salt, p, acct.authTag, acct.iterations); return null; }
        catch { return t('wallet.send.errors.pinInvalid') as string; }
      },
    });
    await signAndPay(pin);
  }, [paymentIntent, order, chainProps, estimatedFee, freeBalance, formatBzr, t, signAndPay]);

  // BATCH payment handler for multi-store
  const handleBatchPayment = useCallback(async () => {
    if (!checkoutSessionId || !account) return;

    setPaying(true);
    setError(null);

    try {
      // Step 1: Prepare batch lock
      const prepared = await prepareBatchLock(checkoutSessionId);
      if (!prepared) {
        throw new Error('Falha ao preparar pagamento batch');
      }

      // Step 2: Sign and send batch transaction (PIN is handled inside the hook)
      const result = await signAndSendBatch(prepared);

      if (result.success) {
        // Navigate to orders list on success
        navigate('/app/orders', {
          state: {
            success: true,
            message: t('pay.batch.success', `${orders.length} pedidos pagos com sucesso!`)
          }
        });
      } else {
        setError(result.error || 'Falha no pagamento batch');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('pay.error.paymentFailed');
      setError(msg);
    } finally {
      setPaying(false);
    }
  }, [checkoutSessionId, account, prepareBatchLock, signAndSendBatch, orders.length, navigate, t]);

  // Choose payment handler based on mode
  const handlePayment = isMultiStore ? handleBatchPayment : handleSinglePayment;

  // Calculate totals for multi-store
  const multiStoreTotals = orders.reduce(
    (acc, o) => ({
      subtotal: acc.subtotal + BigInt(o.subtotalBzr),
      shipping: acc.shipping + BigInt(o.shippingBzr),
      total: acc.total + BigInt(o.totalBzr),
    }),
    { subtotal: 0n, shipping: 0n, total: 0n }
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-2 md:py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-16">
            <Clock className="h-8 w-8 animate-spin" />
            <span className="ml-2">{t('pay.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order && orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-2 md:py-3">
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

  const amount = isMultiStore ? multiStoreTotals.total : (paymentIntent ? BigInt(paymentIntent.amountBzr) : 0n);
  const fee = estimatedFee ? BigInt(estimatedFee) : 0n;
  const edVal = ed ? BigInt(ed) : 0n;
  const free = freeBalance ? BigInt(freeBalance) : 0n;
  const hasFunds = free - fee - amount >= edVal;
  const allOrdersCreated = orders.every(o => o.status === 'CREATED');
  const canPay = allOrdersCreated && (isMultiStore ? orders.length > 0 : Boolean(paymentIntent));
  const isPaid = orders.every(o => ['ESCROWED', 'SHIPPED', 'RELEASED'].includes(o.status));

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 20) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isMultiStore ? t('pay.batch.title', 'Pagamento Multi-Loja') : t('pay.title')}
            </h1>
            <p className="text-muted-foreground">
              {isMultiStore
                ? t('pay.batch.subtitle', `${orders.length} pedidos de ${orders.length} lojas`)
                : t('pay.orderNumber', { number: order?.id.slice(-8) })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Multi-Store Badge */}
          {isMultiStore && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{t('pay.batch.atomicPayment', 'Pagamento Atômico')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('pay.batch.atomicDescription', 'Todos os escrows serão bloqueados em uma única transação. Se um falhar, todos falham.')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
              {isMultiStore ? (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {o.sellerName || `Loja ${o.sellerId.slice(-6)}`}
                      </span>
                      <Badge variant={['ESCROWED', 'SHIPPED', 'RELEASED'].includes(o.status) ? 'default' : 'secondary'}>
                        {t(`orderStatus.${o.status.toLowerCase()}`, o.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Badge variant={isPaid ? 'default' : 'secondary'}>
                  {t(`orderStatus.${order?.status.toLowerCase()}`, order?.status || '')}
                </Badge>
              )}
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
              <CardContent className="space-y-5">
                {/* Summary */}
                <div className="space-y-2">
                  {isMultiStore ? (
                    <>
                      {orders.map((o) => (
                        <div key={o.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {o.sellerName || `Loja ${o.sellerId.slice(-6)}`}
                          </span>
                          <span className="font-mono">{formatBzr(o.totalBzr)}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('pay.summary.subtotal')}</span>
                        <span className="font-mono">{formatBzr(multiStoreTotals.subtotal.toString())}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('pay.summary.shipping')}</span>
                        <span className="font-mono">{formatBzr(multiStoreTotals.shipping.toString())}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('pay.summary.subtotal')}</span>
                        <span className="font-mono">{formatBzr(order!.subtotalBzr)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('pay.summary.shipping')}</span>
                        <span className="font-mono">{formatBzr(order!.shippingBzr)}</span>
                      </div>
                    </>
                  )}
                  {estimatedFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('checkout.networkFee', 'Taxa de rede')}</span>
                      <span className="font-mono">{formatBzr(estimatedFee)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>{t('pay.payment.amount')}</span>
                    <span className="font-mono text-lg">
                      {isMultiStore
                        ? formatBzr(multiStoreTotals.total.toString())
                        : formatBzr(paymentIntent!.amountBzr)}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Escrow Protection Info */}
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('pay.escrow.protection', 'Proteção do Escrow On-Chain')}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-start gap-2">
                      <span className="font-medium">1.</span>
                      <span>{t('pay.escrow.step1', 'Seus fundos ficam RESERVADOS na sua própria conta')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">2.</span>
                      <span>{t('pay.escrow.step2', 'O vendedor só recebe após você confirmar a entrega')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">3.</span>
                      <span>{t('pay.escrow.step3', 'Em caso de disputa, a DAO pode mediar')}</span>
                    </div>
                  </div>
                </div>

                {/* Transaction Details - Single Order Only */}
                {!isMultiStore && order && paymentIntent && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {t('pay.transaction.details', 'Detalhes da Transação')}
                    </h4>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('pay.transaction.yourWallet', 'Sua carteira')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{truncateAddress(order.buyerAddr)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(order.buyerAddr, 'buyer')}
                        >
                          {copiedField === 'buyer' ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('pay.transaction.seller', 'Vendedor')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{truncateAddress(order.sellerAddr)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(order.sellerAddr, 'seller')}
                        >
                          {copiedField === 'seller' ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('pay.transaction.method', 'Método')}</span>
                      <span>{t('pay.transaction.escrowBlockchain', 'Escrow Blockchain (BZR)')}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('pay.payment.fee')}</span>
                      <span>{paymentIntent.feeBps / 100}% {t('pay.transaction.afterRelease', '(após liberação)')}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('pay.transaction.autoRelease', 'Auto-liberação')}</span>
                      <span>{t('pay.transaction.autoReleaseTime', '7 dias após envio')}</span>
                    </div>
                  </div>
                )}

                {!isMultiStore && <Separator />}

                {/* Alerts and Errors */}
                {!account && (
                  <div className="p-4 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50">
                    <p className="text-orange-800 dark:text-orange-200 text-sm">
                      {t('pay.payment.connectWallet')}
                    </p>
                  </div>
                )}

                {(error || batchError) && (
                  <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-destructive text-sm">{error || batchError}</p>
                  </div>
                )}

                {(paying || batchLoading || isPreparing) && (
                  <div className="p-4 rounded-md bg-primary/10 border border-primary/20">
                    <p className="text-sm">
                      {isPreparing
                        ? t('pay.batch.preparing', 'Preparando transação batch...')
                        : t('pay.payment.processing')}
                    </p>
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

                {/* Explanatory Note */}
                <div className="p-3 rounded-md bg-muted/50 border">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      {isMultiStore
                        ? t('pay.batch.note', 'Ao pagar, você assinará uma única transação que reserva os fundos para todas as lojas. Se qualquer escrow falhar, todos falham e nenhum valor é bloqueado.')
                        : t('pay.escrow.note', 'Ao pagar, você assinará uma transação que reserva os fundos na sua carteira. O vendedor NÃO recebe até você confirmar o recebimento do produto.')}
                    </p>
                  </div>
                </div>

                {/* Payment Button */}
                <Button
                  onClick={handlePayment}
                  disabled={!account || paying || batchLoading || isPreparing || !hasFunds}
                  className="w-full"
                  size="lg"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {paying || batchLoading || isPreparing
                    ? t('pay.payment.processing')
                    : isMultiStore
                      ? t('pay.batch.payAll', `Pagar ${orders.length} pedidos (${formatBzr(multiStoreTotals.total.toString())})`)
                      : t('pay.payment.payWithEscrow', `Pagar com Escrow (${formatBzr(paymentIntent!.amountBzr)})`)}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Orders Summary */}
          {isMultiStore ? (
            // Multi-store: Show collapsed summary per store
            orders.map((o) => (
              <Card key={o.id}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    {o.sellerName || `Loja ${o.sellerId.slice(-6)}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {o.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.titleSnapshot}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('pay.summary.qty', { qty: item.qty })} × {formatBzr(item.unitPriceBzrSnapshot)}
                        </p>
                      </div>
                      <p className="font-medium">{formatBzr(item.lineTotalBzr)}</p>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>{t('pay.summary.total')}</span>
                    <span>{formatBzr(o.totalBzr)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Single order: Show detailed summary
            order && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('pay.summary.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        <p className="font-medium text-sm">{formatBzr(item.lineTotalBzr)}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

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
            )
          )}

          {/* Shipping Address */}
          {order?.shippingAddress && (
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
    </div>
  );
}
