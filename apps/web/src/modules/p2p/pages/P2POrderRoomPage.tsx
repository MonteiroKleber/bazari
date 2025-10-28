import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { p2pApi } from '../api';
import { getSessionUser } from '@/modules/auth/session';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiHelpers, ApiError } from '@/lib/api';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { getApi } from '@/modules/wallet/services/polkadot';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { useChainProps } from '@/modules/wallet/hooks/useChainProps';
import { PinService } from '@/modules/wallet/pin/PinService';
import { getNativeBalance } from '@/modules/wallet/services/balances';
import { BZR } from '@/utils/bzr';
import { Info, Copy, Check } from 'lucide-react';
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';

type Order = {
  id: string;
  status: 'DRAFT' | 'AWAITING_ESCROW' | 'AWAITING_FIAT_PAYMENT' | 'AWAITING_CONFIRMATION' | 'RELEASED' | 'EXPIRED' | 'CANCELLED' | 'DISPUTE_OPEN' | 'DISPUTE_RESOLVED_BUYER' | 'DISPUTE_RESOLVED_SELLER';
  amountBRL: string;
  amountBZR: string;
  priceBRLPerBZR: string;
  method: 'PIX';
  pixKeySnapshot?: string | null;
  createdAt: string;
  expiresAt: string;
  side: 'SELL_BZR' | 'BUY_BZR';
  makerId: string;
  takerId: string;
  proofUrls?: string[] | null;
  // NOVOS CAMPOS ZARI:
  assetType?: 'BZR' | 'ZARI';
  assetId?: string | null;
  phase?: string | null;
  amountAsset?: string;
  makerProfile?: any;
  takerProfile?: any;
};

export default function P2POrderRoomPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [intent, setIntent] = useState<{ escrowAddress: string; amountBZR: string } | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const me = getSessionUser();
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; body: string; createdAt: string; sender: any }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [rateCountdown, setRateCountdown] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [reviewStars, setReviewStars] = useState<number>(5);
  const [reviewing, setReviewing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const chainProps = useChainProps();
  // PIN handled via global PinService
  const [locking, setLocking] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [ed, setEd] = useState<string | null>(null);
  const [freeBalance, setFreeBalance] = useState<string | null>(null);
  // NOVO: Backend-side escrow states
  const [lockingViaBackend, setLockingViaBackend] = useState(false);
  const [releasingViaBackend, setReleasingViaBackend] = useState(false);
  const [backendTxResult, setBackendTxResult] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const o = await p2pApi.getOrder(id);
      setOrder(o as any);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Countdown for chat rate limit
  useEffect(() => {
    if (!rateLimitedUntil) return;
    const i = setInterval(() => {
      const secs = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
      setRateCountdown(secs);
      if (secs <= 0) {
        clearInterval(i);
        setRateLimitedUntil(null);
      }
    }, 500);
    return () => clearInterval(i);
  }, [rateLimitedUntil]);

  // Countdown for order expiration
  useEffect(() => {
    if (!order) return;
    const active = new Set(['DRAFT','AWAITING_ESCROW','AWAITING_FIAT_PAYMENT','AWAITING_CONFIRMATION']);
    if (!active.has(order.status)) { setRemainingSec(0); return; }
    const update = () => {
      const target = new Date(order.expiresAt).getTime();
      const secs = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setRemainingSec(secs);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [order]);

  useEffect(() => { load(); }, [load]);
  // Auto-load escrow intent for the escrower when awaiting escrow
  useEffect(() => {
    if (!order || intent || intentLoading) return;
    const isAwaiting = order.status === 'AWAITING_ESCROW';
    const isEscrower = me && (me.id === (order.side === 'SELL_BZR' ? order.makerId : order.takerId));
    if (isAwaiting && isEscrower) {
      void handleEscrowIntent();
    }
  }, [order, me, intent, intentLoading]);
  useEffect(() => {
    (async () => {
      try { const acc = await getActiveAccount(); setAccount(acc); } catch {}
    })();
  }, []);

  // Load balance and fee estimation when we have intent and account
  useEffect(() => {
    (async () => {
      try {
        if (!intent || !account) return;
        const api = await getApi();
        const existential = api.consts?.balances?.existentialDeposit?.toString?.() ?? '0';
        setEd(existential.toString());
        if (account?.address) {
          const bal = await getNativeBalance(account.address);
          setFreeBalance(bal.free.toString());
          const planck = decimalToPlanck(intent.amountBZR);
          const tx = api.tx.balances.transferKeepAlive(intent.escrowAddress, planck);
          const info = await tx.paymentInfo(account.address);
          setEstimatedFee(info.partialFee.toString());
        }
      } catch {
        // ignore estimation errors
      }
    })();
  }, [intent, account]);
  // Poll order status every 4s
  useEffect(() => {
    if (!id) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const o = await p2pApi.getOrder(id);
        if (active) setOrder(o as any);
      } catch { /* ignore */ }
    }, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);
  useEffect(() => {
    let timer: any;
    const poll = async () => {
      if (!id) return;
      setPolling(true);
      try {
        const res = await p2pApi.listMessages(id, { limit: 50 });
        setMessages(res.items);
      } finally {
        setPolling(false);
      }
      timer = setTimeout(poll, 5000);
    };
    poll();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const handleEscrowIntent = async () => {
    if (!id) return;
    setIntentLoading(true);
    try {
      const res = await p2pApi.escrowIntent(id);
      setIntent(res as any);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIntentLoading(false);
    }
  };

  const [escrowHash, setEscrowHash] = useState('');
  const [showEscrowHash, setShowEscrowHash] = useState(false);
  const handleEscrowConfirm = async () => {
    if (!id) return;
    if (!showEscrowHash) { setShowEscrowHash(true); return; }
    if (!escrowHash.trim()) { toast.error(t('p2p.room.escrow.promptHash', 'Informe o hash da transação de escrow')); return; }
    try {
      await p2pApi.escrowConfirm(id, { txHash: escrowHash.trim() });
      setEscrowHash(''); setShowEscrowHash(false);
      await load();
      toast.success(t('p2p.room.escrow.confirm', 'Confirmar escrow'));
    } catch (e) {
      const msg = (e as Error).message || 'Erro';
      toast.error(msg);
    }
  };

  // NOVO: Backend-side escrow handlers
  const handleLockViaBackend = async () => {
    if (!id || !order || !account) return;
    setLockingViaBackend(true);
    setBackendTxResult(null);
    try {
      const res = await p2pApi.escrowLock(id, { makerAddress: account.address });
      setBackendTxResult(res);
      toast.success(t('p2p.room.escrow.txSuccess', 'Transação executada com sucesso'));
      await load();
    } catch (e) {
      const msg = (e as Error).message || 'Erro';
      toast.error(msg);
    } finally {
      setLockingViaBackend(false);
    }
  };

  const handleReleaseViaBackend = async () => {
    if (!id || !order) return;
    if (!confirm(t('p2p.room.escrow.confirmRelease', 'Confirmar liberação de fundos?'))) return;

    const takerProfile = order.side === 'SELL_BZR' ? order.takerProfile : order.makerProfile;
    const takerAddress = takerProfile?.address;

    if (!takerAddress) {
      toast.error(t('p2p.room.escrow.addressMissing', 'Endereço do comprador não encontrado'));
      return;
    }

    setReleasingViaBackend(true);
    setBackendTxResult(null);
    try {
      const res = await p2pApi.escrowRelease(id, { takerAddress });
      setBackendTxResult(res);
      toast.success(t('p2p.room.escrow.txSuccess', 'Transação executada com sucesso'));
      await load();
    } catch (e) {
      const msg = (e as Error).message || 'Erro';
      toast.error(msg);
    } finally {
      setReleasingViaBackend(false);
    }
  };

  const signAndLockEscrow = async (pin: string) => {
    if (!id || !intent || !order) return;
    setLocking(true);
    setErr(null);
    try {
      const api = await getApi();
      let mnemonic = await decryptMnemonic(account.cipher, account.iv, account.salt, pin, account.iterations);
      await cryptoWaitReady();
      const ss58 = chainProps?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      const assetType = order.assetType || 'BZR';
      let tx;

      if (assetType === 'BZR') {
        const planck = decimalToPlanck(intent.amountBZR);
        tx = api.tx.balances.transferKeepAlive(intent.escrowAddress, planck);
      } else if (assetType === 'ZARI') {
        const assetId = order.assetId || '1';
        const planck = decimalToPlanck((intent as any).amountZARI || intent.amountBZR);
        tx = api.tx.assets.transferKeepAlive(assetId, intent.escrowAddress, planck);
      } else {
        throw new Error(`Unsupported asset type: ${assetType}`);
      }

      const unsub = await tx.signAndSend(pair, async (result: any) => {
        const { status, dispatchError, txHash } = result;
        if (dispatchError) {
          let message = String(dispatchError);
          if (dispatchError.isModule) {
            const metaError = api.registry.findMetaError(dispatchError.asModule);
            message = `${metaError.section}.${metaError.name}`;
          }
          toast.error(message);
          setLocking(false);
          try { (unsub as unknown as () => void)(); } catch {}
          return;
        }
        if (status?.isInBlock || status?.isFinalized) {
          try { (unsub as unknown as () => void)(); } catch {}
          // Confirmar escrow automaticamente com o hash
          const hashHex = txHash?.toHex ? txHash.toHex() : String(txHash);
          try {
            await p2pApi.escrowConfirm(id, { txHash: hashHex });
            await load();
            toast.success(t('p2p.room.escrow.confirm', 'Confirmar escrow'));
          } catch (e) {
            toast.error((e as Error).message || 'Erro');
          } finally {
            setLocking(false);
          }
        }
      });
    } catch (e) {
      toast.error((e as Error).message || 'Erro');
      setLocking(false);
    }
  };

  function decimalToPlanck(val: string): string {
    // Converts a decimal BZR string (e.g., "1.23") to planck (12 decimals) integer string
    const s = String(val).trim().replace(',', '.');
    const neg = s.startsWith('-');
    const abs = neg ? s.slice(1) : s;
    const [i, f = ''] = abs.split('.');
    const frac = (f + '000000000000').slice(0, 12); // pad to 12
    const combined = (i || '0') + frac;
    // strip leading zeros
    const cleaned = combined.replace(/^0+(?=\d)/, '');
    return (neg ? '-' : '') + cleaned;
  }

  const handleMarkPaid = async () => {
    if (!id) return;
    const urls = proofUrls.length ? proofUrls : undefined;
    try {
      setMarkingPaid(true);
      await p2pApi.markPaid(id, { proofUrls: urls });
      await load();
      toast.success(t('p2p.room.actions.markPaid', 'Marcar como pago'));
    } catch (e) {
      const msg = (e as Error).message || 'Erro';
      toast.error(msg);
    } finally { setMarkingPaid(false); }
  };

  const handleConfirmReceived = async () => {
    if (!id) return;
    try {
      await p2pApi.confirmReceived(id);
      await load();
      toast.success(t('p2p.room.actions.confirmReceived', 'Confirmar recebimento'));
    } catch (e) {
      const msg = (e as Error).message || 'Erro';
      toast.error(msg);
    }
  };

  const handleUploadProof: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    try {
      const res = await apiHelpers.uploadFile(file) as any;
      const url = res?.url as string;
      if (url) {
        setProofUrls((prev) => [...prev, url]);
        toast.success(t('p2p.room.proofs.uploaded', 'Comprovante enviado'));
      }
    } catch (err) {
      const msg = (err as Error).message || 'Erro';
      toast.error(msg);
    } finally {
      try { inputEl.value = ''; } catch {}
    }
  };

  const handleSendMessage = async () => {
    if (!id || !chatInput.trim()) return;
    setSending(true);
    try {
      await p2pApi.sendMessage(id, { body: chatInput.trim() });
      setChatInput('');
      const res = await p2pApi.listMessages(id, { limit: 50 });
      setMessages(res.items);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        const msg = (e as Error).message || '';
        const m = msg.match(/(\d+)s/) || msg.match(/(\d+)/);
        const secs = m ? Math.min(300, Math.max(5, parseInt(m[1], 10))) : 60;
        setRateLimitedUntil(Date.now() + secs * 1000);
        setRateCountdown(secs);
        toast.error(t('p2p.room.chat.rateLimited', 'Você atingiu o limite de mensagens. Tente novamente em instantes.'));
      } else {
        const msg = (e as Error).message || 'Erro';
        toast.error(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const statusLabel = useMemo(() => {
    const assetName = order?.assetType === 'ZARI' ? 'ZARI' : 'BZR';
    switch (order?.status) {
      case 'AWAITING_ESCROW':
        return order.assetType === 'ZARI'
          ? t('p2p.room.status.awaitingEscrowZari', 'Aguardando escrow de ZARI')
          : t('p2p.room.status.awaitingEscrow', 'Aguardando escrow de BZR');
      case 'AWAITING_FIAT_PAYMENT':
        return order.assetType === 'ZARI'
          ? t('p2p.room.status.awaitingFiatZari', 'Aguardando pagamento PIX (ZARI)')
          : t('p2p.room.status.awaitingFiat', 'Aguardando pagamento PIX');
      case 'AWAITING_CONFIRMATION': return t('p2p.room.status.awaitingConfirm', 'Aguardando confirmação');
      case 'RELEASED': return t('p2p.room.status.released', 'Liberado');
      case 'EXPIRED': return t('p2p.room.status.expired', 'Expirada');
      case 'CANCELLED': return t('p2p.room.status.cancelled', 'Cancelada');
      default: return order?.status || '';
    }
  }, [order, t]);

  const cancelReason = (s: Order['status']) => {
    switch (s) {
      case 'AWAITING_FIAT_PAYMENT':
        return t('p2p.my.reason.awaitingFiat', 'Escrow confirmado; aguardando pagamento. Cancelamento indisponível.');
      case 'AWAITING_CONFIRMATION':
        return t('p2p.my.reason.awaitingConfirm', 'Pagamento marcado; aguardando confirmação. Cancelamento indisponível.');
      case 'RELEASED':
        return t('p2p.my.reason.released', 'Concluída. Cancelamento indisponível.');
      case 'EXPIRED':
        return t('p2p.my.reason.expired', 'Expirada. Cancelamento indisponível.');
      case 'CANCELLED':
        return t('p2p.my.reason.cancelled', 'Já cancelada.');
      case 'DISPUTE_OPEN':
        return t('p2p.my.reason.dispute', 'Em disputa. Cancelamento indisponível.');
      case 'DISPUTE_RESOLVED_BUYER':
      case 'DISPUTE_RESOLVED_SELLER':
        return t('p2p.my.reason.disputeResolved', 'Disputa resolvida. Cancelamento indisponível.');
      default:
        return null;
    }
  };

  const escrowerId = order?.side === 'SELL_BZR' ? order?.makerId : order?.takerId;
  const payerId = order?.side === 'SELL_BZR' ? order?.takerId : order?.makerId;
  const receiverId = order?.side === 'SELL_BZR' ? order?.makerId : order?.takerId;

  const copy = async (text: string, key?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (key) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
      }
    } catch {}
  };

  const myRoleLabel = useMemo(() => {
    if (!order || !me) return null;
    const assetName = order.assetType === 'ZARI' ? 'ZARI' : 'BZR';
    const amSellingAsset = order.side === 'SELL_BZR' ? me.id === order.makerId : me.id === order.takerId;
    return amSellingAsset
      ? (order.assetType === 'ZARI' ? t('p2p.badge.sellingZari', 'Vendendo ZARI') : t('p2p.badge.selling', 'Vendendo BZR'))
      : (order.assetType === 'ZARI' ? t('p2p.badge.buyingZari', 'Comprando ZARI') : t('p2p.badge.buying', 'Comprando BZR'));
  }, [order, me, t]);

  const counterpartyRoleLabel = useMemo(() => {
    if (!order || !me) return null;
    const amSellingAsset = order.side === 'SELL_BZR' ? me.id === order.makerId : me.id === order.takerId;
    return amSellingAsset
      ? (order.assetType === 'ZARI' ? t('p2p.badge.buyingZari', 'Comprando ZARI') : t('p2p.badge.buying', 'Comprando BZR'))
      : (order.assetType === 'ZARI' ? t('p2p.badge.sellingZari', 'Vendendo ZARI') : t('p2p.badge.selling', 'Vendendo BZR'));
  }, [order, me, t]);

  const counterpartyProfile = useMemo(() => {
    if (!order || !me) return null;
    const isMeMaker = me.id === order.makerId;
    return isMeMaker ? order.takerProfile as any : order.makerProfile as any;
  }, [order, me]);

  const formatBzr = useCallback((value: string | number | bigint) => {
    const locale = BZR.normalizeLocale(i18n.language);
    return BZR.formatAuto(value as any, locale, true);
  }, [i18n.language]);

  // Use números para checagem de saldo na UI (evita BigInt com decimais)
  const amountNum = intent ? Number(intent.amountBZR) : 0;
  const feeNum = estimatedFee ? Number(estimatedFee) : 0;
  const edNum = ed ? Number(ed) : 0;
  const freeNum = freeBalance ? Number(freeBalance) : 0;
  const hasFunds = Number.isFinite(freeNum) && Number.isFinite(feeNum) && Number.isFinite(amountNum) && Number.isFinite(edNum)
    ? (freeNum - feeNum - amountNum) >= edNum
    : false;
  const formulaHint = useMemo(() => {
    if (!intent) return t('p2p.room.escrow.hint', 'Para habilitar: saldo livre - taxa - valor >= ED');
    const freeS = freeBalance ? formatBzr(freeBalance) : '—';
    const feeS = estimatedFee ? formatBzr(estimatedFee) : '—';
    const amtS = formatBzr(intent.amountBZR);
    const edS = ed ? formatBzr(ed) : '—';
    const ok = hasFunds ? t('common.ok', 'OK') : t('common.no', 'Não');
    return `${t('p2p.room.escrow.hint', 'Para habilitar: saldo livre - taxa - valor >= ED')}
${t('wallet.freeBalance', 'Saldo disponível')}: ${freeS}
${t('checkout.networkFee', 'Taxa de rede')}: ${feeS}
${t('p2p.room.escrow.amount', 'Quantidade a enviar (BZR)')}: ${amtS}
${t('wallet.ed', 'Depósito existencial (ED)')}: ${edS}
=> ${ok}`;
  }, [intent, freeBalance, estimatedFee, ed, hasFunds, t, formatBzr]);

  if (loading) return <div className="container mx-auto px-4 py-2 md:py-3">{t('common.loading')}</div>;
  if (err || !order) return <div className="container mx-auto px-4 py-2 md:py-3">{err || t('common.error')}</div>;

  return (
    <div className="container mx-auto px-4 py-2 md:py-3 space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>#{order.id.substring(0, 8)}</CardTitle>
          <div className="flex items-center gap-2">
            {myRoleLabel && <Badge variant="secondary">{myRoleLabel}</Badge>}
            {counterpartyRoleLabel && <Badge title={t('p2p.room.counterparty', 'Sua contraparte') || 'Contraparte'}>{counterpartyRoleLabel}</Badge>}
            {order.assetType === 'ZARI' && order.phase && (
              <Badge variant="secondary">🏛️ Fase {order.phase}</Badge>
            )}
            <Badge>{statusLabel}</Badge>
            {remainingSec > 0 && (
              <Badge variant="secondary" aria-live="polite">
                {t('p2p.room.timer.label', 'Tempo restante')}: {String(Math.floor(remainingSec/60)).padStart(2,'0')}:{String(remainingSec%60).padStart(2,'0')}
              </Badge>
            )}
            {counterpartyProfile?.handle && (
              <Link className="text-xs underline text-muted-foreground" to={`/u/${counterpartyProfile.handle}`}>
                {t('p2p.room.viewProfile', 'Ver perfil')}
              </Link>
            )}
          </div>
          {counterpartyProfile && (
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
              <span>{t('p2p.room.counterparty', 'Sua contraparte')}:</span>
              {counterpartyProfile.avatarUrl && (
                <img src={counterpartyProfile.avatarUrl} alt={counterpartyProfile.displayName || counterpartyProfile.handle || 'avatar'} className="h-5 w-5 rounded-full object-cover" />
              )}
              {counterpartyProfile.handle ? (
                <Link className="underline" to={`/u/${counterpartyProfile.handle}`}>@{counterpartyProfile.handle}</Link>
              ) : (
                <span>{counterpartyProfile.displayName || (counterpartyProfile.userId ? counterpartyProfile.userId.slice(0,6)+'…' : '')}</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {t('p2p.room.summary.price', 'Preço')}: R$ {order.priceBRLPerBZR}
              {order.assetType === 'ZARI' ? '/ZARI' : '/BZR'}
            </div>
            <div className="text-sm text-muted-foreground">
              {order.assetType === 'ZARI'
                ? `${t('p2p.room.summary.amountZARI', 'Quantidade ZARI')}: ${order.amountAsset || order.amountBZR}`
                : `${t('p2p.room.summary.amountBZR', 'Quantidade BZR')}: ${order.amountBZR}`
              }
            </div>
            <div className="text-sm text-muted-foreground">{t('p2p.room.summary.amountBRL', 'Valor BRL')}: R$ {order.amountBRL}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm">{t('p2p.room.steps.title', 'Passos')}</div>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              <li className={order.status==='AWAITING_ESCROW'?'font-medium':''}>
                {order.assetType === 'ZARI'
                  ? t('p2p.room.steps.lockZari', 'Travar ZARI em escrow')
                  : t('p2p.room.steps.lock', 'Travar BZR em escrow')
                }
              </li>
              <li className={order.status==='AWAITING_FIAT_PAYMENT'?'font-medium':''}>{t('p2p.room.steps.pay', 'Pagar via PIX')}</li>
              <li className={order.status==='AWAITING_CONFIRMATION'?'font-medium':''}>{t('p2p.room.steps.confirm', 'Confirmar recebimento')}</li>
            </ol>
            <div className="flex flex-wrap gap-2 pt-2">
              {order.status === 'AWAITING_ESCROW' && me && me.id === escrowerId && (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleEscrowConfirm}>{t('p2p.room.escrow.confirm', 'Confirmar escrow')}</Button>
                  {showEscrowHash && (
                    <>
                      <Input className="h-8" placeholder={t('p2p.room.escrow.promptHash', 'Hash da transação')} value={escrowHash} onChange={(e) => setEscrowHash(e.target.value)} />
                      <Button size="sm" variant="secondary" onClick={handleEscrowConfirm}>{t('common.confirm', 'Confirmar')}</Button>
                    </>
                  )}
                </div>
              )}
              {order.status === 'AWAITING_FIAT_PAYMENT' && me && me.id === payerId && (
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={handleMarkPaid} disabled={proofUrls.length === 0 || markingPaid}>
                    {markingPaid ? t('common.saving', 'Salvando...') : t('p2p.room.actions.markPaid', 'Marcar como pago')}
                  </Button>
                  {proofUrls.length === 0 && (
                    <span className="text-xs text-muted-foreground">{t('p2p.room.actions.needProof', 'Anexe ao menos um comprovante para marcar como pago')}</span>
                  )}
                </div>
              )}
              {order.status === 'AWAITING_CONFIRMATION' && me && me.id === receiverId && (
                <>
                  <Button size="sm" onClick={handleConfirmReceived}>{t('p2p.room.actions.confirmReceived', 'Confirmar recebimento')}</Button>
                  <Button size="sm" variant="secondary" onClick={handleReleaseViaBackend} disabled={releasingViaBackend}>
                    {releasingViaBackend ? t('common.loading') : t('p2p.room.escrow.releaseViaBackend', 'Executar Release via Backend')}
                  </Button>
                </>
              )}
              {(order.status === 'DRAFT' || order.status === 'AWAITING_ESCROW') && me && (me.id === order.makerId || me.id === order.takerId) && (
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!id) return;
                  if (!confirm(t('p2p.room.cancel.confirm', 'Tem certeza que deseja cancelar esta ordem?'))) return;
                  try { await p2pApi.cancelOrder(id); toast.success(t('p2p.room.cancelled', 'Ordem cancelada')); await load(); } catch (e) { toast.error((e as Error).message || 'Erro'); }
                }}>{t('common.cancel', 'Cancelar')}</Button>
              )}
              {!(order.status === 'DRAFT' || order.status === 'AWAITING_ESCROW') && (
                <div className="text-xs text-muted-foreground" aria-live="polite">{cancelReason(order.status)}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {order.assetType === 'ZARI'
              ? t('p2p.room.escrow.titleZari', 'Escrow de ZARI')
              : t('p2p.room.escrow.title', 'Escrow de BZR')
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleEscrowIntent} disabled={intentLoading}>{intentLoading ? t('common.loading') : t('p2p.room.escrow.getIntent', 'Obter instruções')}</Button>

            {/* NOVO: Backend-side lock button */}
            {order.status === 'AWAITING_ESCROW' && me && me.id === escrowerId && (
              <Button
                size="sm"
                onClick={handleLockViaBackend}
                disabled={lockingViaBackend || !account}
              >
                {lockingViaBackend ? t('common.loading') : t('p2p.room.escrow.lockViaBackend', 'Executar Lock via Backend')}
              </Button>
            )}

            {order.status === 'AWAITING_ESCROW' && me && me.id === escrowerId && intent && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={locking || !account || !hasFunds}
                  onClick={async () => {
                    const acct = await getActiveAccount();
                    if (!acct) return;

                    // Prepare transaction details for modal
                    const assetType = order.assetType || 'BZR';
                    const assetAmount = assetType === 'ZARI' ? ((intent as any).amountZARI || intent.amountBZR) : intent.amountBZR;
                    const amount = BigInt(decimalToPlanck(assetAmount));
                    const fee = estimatedFee ? BigInt(estimatedFee) : 0n;
                    const total = amount + fee;
                    const free = freeBalance ? BigInt(freeBalance) : 0n;
                    const balanceSufficient = free >= total;
                    const formatBzr = (val: bigint) => BZR.formatAuto(val.toString(), BZR.normalizeLocale(i18n.language), true);

                    const pin = await PinService.getPin({
                      title: t('wallet.send.pinTitle', 'Confirmar Bloqueio'),
                      description: t('wallet.send.pinDescription', 'Digite o PIN para assinar a transação'),
                      transaction: {
                        type: 'lockEscrow',
                        description: `Travar ${assetAmount} ${assetType} em escrow P2P`,
                        amount: `${assetAmount} ${assetType}`,
                        fee: estimatedFee ? formatBzr(fee) : 'Calculando...',
                        total: formatBzr(total),
                        balance: freeBalance ? formatBzr(free) : undefined,
                        balanceSufficient,
                        warning: !balanceSufficient ? 'Saldo insuficiente para completar o bloqueio' : undefined,
                      },
                      validate: async (p) => {
                        try { await decryptMnemonic(acct.cipher, acct.iv, acct.salt, p, acct.iterations); return null; }
                        catch { return t('wallet.send.errors.pinInvalid', 'PIN inválido'); }
                      },
                    });
                    await signAndLockEscrow(pin);
                  }}
                  title={formulaHint}
                >
                  {locking ? t('common.loading') : t('p2p.room.escrow.lockViaWallet', 'Travar via carteira')}
                </Button>
                <Info className="h-4 w-4 text-muted-foreground mt-1" aria-label={t('p2p.room.escrow.hintLabel', 'Ajuda de saldo')} title={formulaHint} />
              </>
            )}
          </div>
          {intent && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground" aria-live="polite">
                {me && me.id === escrowerId
                  ? t('p2p.room.escrow.youAreEscrower', 'Você é o responsável por travar o escrow.')
                  : (
                    t('p2p.room.escrow.responsible', 'Responsável por travar') + ': ' +
                    (order.side === 'SELL_BZR'
                      ? t('p2p.room.escrow.roleSeller', 'Vendedor (maker)')
                      : t('p2p.room.escrow.roleBuyer', 'Comprador (taker)'))
                  )
                }
              </div>
              <div className="text-sm">{t('p2p.room.escrow.address', 'Endereço escrow')}: <code className="break-all">{intent.escrowAddress}</code></div>
              <div className="text-sm">
                {order.assetType === 'ZARI'
                  ? `${t('p2p.room.escrow.amountZari', 'Quantidade a enviar (ZARI)')}: ${(intent as any).amountZARI || intent.amountBZR}`
                  : `${t('p2p.room.escrow.amount', 'Quantidade a enviar (BZR)')}: ${intent.amountBZR}`
                }
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => copy(intent.escrowAddress, 'escrowAddr')}>
                    {t('p2p.room.escrow.copyAddress', 'Copiar endereço')}
                  </Button>
                  {copiedKey === 'escrowAddr' && (
                    <span role="tooltip" className="text-[11px] rounded bg-emerald-600 text-white px-2 py-0.5 shadow">{t('wallet.accounts.copied', 'Copiado!')}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => copy(intent.amountBZR, 'escrowAmt')}>
                    {t('p2p.room.escrow.copyAmount', 'Copiar quantidade')}
                  </Button>
                  {copiedKey === 'escrowAmt' && (
                    <span role="tooltip" className="text-[11px] rounded bg-emerald-600 text-white px-2 py-0.5 shadow">{t('wallet.accounts.copied', 'Copiado!')}</span>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {estimatedFee && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('checkout.networkFee', 'Taxa de rede')}</span>
                    <span className="font-mono">{formatBzr(estimatedFee)}</span>
                  </div>
                )}
                {ed && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('wallet.ed', 'Depósito existencial (ED)')}</span>
                    <span className="font-mono">{formatBzr(ed)}</span>
                  </div>
                )}
                {freeBalance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('wallet.freeBalance', 'Saldo disponível')}</span>
                    <span className="font-mono">{formatBzr(freeBalance)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {order.assetType === 'ZARI'
                  ? t('p2p.room.escrow.noteZari', 'Assine a transação na carteira (assets.transfer_keep_alive).')
                  : t('p2p.room.escrow.note', 'Assine a transação na carteira (balances.transfer_keep_alive).')
                }
              </p>
              {!account && (
                <div className="p-3 rounded bg-amber-50 border border-amber-200 text-sm">
                  {t('pay.payment.connectWallet', 'Conecte sua carteira para continuar.')}
                </div>
              )}
              {account && !hasFunds && (
                <div className="p-3 rounded bg-amber-50 border border-amber-200 text-sm">
                  <div>{t('pay.payment.insufficient', 'Saldo insuficiente para cobrir valor, taxa e ED.')}</div>
                  <Button variant="link" className="px-0" onClick={() => navigate('/app/wallet/receive')}>
                    {t('pay.payment.addFunds', 'Adicionar fundos')}
                  </Button>
                </div>
              )}
              {order.status === 'AWAITING_ESCROW' && me && me.id !== escrowerId && (
                <div className="p-3 rounded bg-muted/40 border text-sm" aria-live="polite">
                  {order.assetType === 'ZARI'
                    ? t('p2p.room.escrow.notEscrowserZari', 'Você não é o responsável por travar o escrow nesta ordem. Aguardando a outra parte travar ZARI.')
                    : t('p2p.room.escrow.notEscrower', 'Você não é o responsável por travar o escrow nesta ordem. Aguardando a outra parte travar BZR.')
                  }
                </div>
              )}
            </div>
          )}

          {/* NOVO: Mostrar resultado de TX backend */}
          {backendTxResult && (
            <div className="p-3 rounded bg-green-50 border border-green-200 text-sm space-y-1">
              <div className="font-medium">{backendTxResult.message}</div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>{t('p2p.room.escrow.txHash', 'Hash da transação')}: <code className="break-all">{backendTxResult.txHash}</code></div>
                <div>{t('p2p.room.escrow.blockNumber', 'Bloco')}: {backendTxResult.blockNumber}</div>
                <div>
                  {t('p2p.room.escrow.amount', 'Quantidade')}: {(Number(backendTxResult.amount) / 1e12).toFixed(6)} {backendTxResult.assetType}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* PIN handled globally via PinProvider */}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>PIX</CardTitle>
          {counterpartyProfile?.handle && (
            <Link className="text-xs underline" to={`/u/${counterpartyProfile.handle}`}>@{counterpartyProfile.handle}</Link>
          )}
        </CardHeader>
        <CardContent>
          {order.status === 'AWAITING_FIAT_PAYMENT' ? (
            <div className="space-y-2 text-sm">
              <div>{t('p2p.room.pix.key', 'Chave PIX')}: <code>{order.pixKeySnapshot || t('p2p.room.pix.hidden', 'Disponível após escrow')}</code></div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => order.pixKeySnapshot && copy(order.pixKeySnapshot, 'pixKey')} disabled={!order.pixKeySnapshot}>{t('p2p.room.pix.copy', 'Copiar chave')}</Button>
                {copiedKey === 'pixKey' && (
                  <span role="tooltip" className="text-[11px] rounded bg-emerald-600 text-white px-2 py-0.5 shadow">{t('wallet.accounts.copied', 'Copiado!')}</span>
                )}
              </div>
              {me && me.id === payerId && (
                <div className="space-y-2 pt-2">
                  <div className="text-sm">Comprovante</div>
                  <Input type="file" accept="image/*" onChange={handleUploadProof} />
                  {proofUrls.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{proofUrls.length} {t('common.files', 'arquivo(s)')} {t('common.attached', 'anexado(s)')}</div>
                      <ul className="list-disc pl-5 text-xs">
                        {proofUrls.map((u, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <a className="underline" href={u} target="_blank" rel="noreferrer">{u}</a>
                            <Button size="xs" variant="secondary" onClick={() => { setProofUrls(prev => prev.filter((_, idx) => idx !== i)); toast.success(t('p2p.room.proofs.removed', 'Comprovante removido')); }}>{t('p2p.room.proofs.remove', 'Remover')}</Button>
                          </li>
                        ))}
                      </ul>
                      <Button size="xs" variant="outline" onClick={() => { setProofUrls([]); toast.success(t('p2p.room.proofs.cleared', 'Comprovantes limpos')); }}>{t('p2p.room.proofs.clearAll', 'Limpar anexos')}</Button>
                    </div>
                  )}
                </div>
              )}
              {Array.isArray(order.proofUrls) && order.proofUrls.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="text-sm font-medium">{t('p2p.room.proofs.title', 'Comprovantes anexados')}</div>
                  <ul className="list-disc pl-5">
                    {order.proofUrls.map((u, i) => (
                      <li key={i} className="text-xs"><a className="underline" href={u} target="_blank" rel="noreferrer">{u}</a></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('p2p.room.pix.wait', 'A chave PIX ficará visível após o escrow.')}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{t('p2p.room.chat.title', 'Chat')}</CardTitle>
          {counterpartyProfile?.handle && (
            <Link className="text-xs underline" to={`/u/${counterpartyProfile.handle}`}>@{counterpartyProfile.handle}</Link>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-48 overflow-y-auto border rounded p-2" aria-live="polite">
            {chatLoading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
            {messages.map((m) => (
              <div key={m.id} className="text-sm py-1">
                {m.kind === 'system' ? (
                  <span className="text-xs text-muted-foreground">
                    {m.body.startsWith('ESCROW_CONFIRMED') && t('p2p.room.chat.system.escrowConfirmed', 'Escrow confirmado')}
                    {m.body === 'PAID_MARKED' && t('p2p.room.chat.system.paidMarked', 'Pagamento marcado pelo pagante')}
                    {m.body === 'RELEASED' && t('p2p.room.chat.system.released', 'Escrow liberado')}
                  </span>
                ) : (
                  <>
                    <span className="font-medium">{m.sender?.handle ? '@'+m.sender.handle : 'Você'}</span>: {m.body}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <Input placeholder={t('p2p.room.chat.placeholder', 'Escreva uma mensagem...') || ''} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key==='Enter' && !rateLimitedUntil) handleSendMessage(); }} disabled={!!rateLimitedUntil} />
            <Button onClick={handleSendMessage} disabled={sending || !chatInput.trim() || !!rateLimitedUntil}>{sending ? t('common.saving') : t('p2p.room.chat.send', 'Enviar')}</Button>
            {!!rateLimitedUntil && (
              <Badge variant="destructive" aria-live="polite">
                {t('p2p.room.chat.rateLimitedShort', 'Aguarde')} {rateCountdown}s
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {order.status === 'RELEASED' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.rating', 'Reputação')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="flex items-center gap-1" role="group" aria-label="Rating">
              {[1,2,3,4,5].map((s) => (
                <button key={s} aria-label={`Rate ${s}`} className={s <= (reviewStars || 0) ? 'text-yellow-500' : 'text-muted-foreground'} onClick={() => setReviewStars(s)}>★</button>
              ))}
            </div>
            <Button onClick={async () => {
              if (!id) return;
              setReviewing(true);
              try {
                await p2pApi.createReview(id, { stars: reviewStars });
                toast.success(t('common.success', 'Sucesso'));
              } catch (e) {
                toast.error((e as Error).message || 'Erro');
              } finally {
                setReviewing(false);
              }
            }} disabled={reviewing}>{reviewing ? t('common.saving') : t('common.save')}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
