import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { p2pApi, type P2POffer } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function P2POfferPublicPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<P2POffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'BRL' | 'BZR'>('BRL');
  const [amountBRL, setAmountBRL] = useState('');
  const [amountBZR, setAmountBZR] = useState('');
  const price = useMemo(() => (offer ? Number(offer.priceBRLPerBZR) : 0), [offer]);

  useEffect(() => {
    let active = true;
    if (!id) return;
    setLoading(true);
    p2pApi.getOffer(id)
      .then((o) => {
        if (active) {
          setOffer(o);
          // If maker is BUY_BZR, default to BZR input for the seller
          if ((o as any).side === 'BUY_BZR') setMode('BZR');
        }
      })
      .catch((e) => { if (active) setErr((e as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!offer) return;
    if (mode === 'BRL' && amountBRL) {
      const bz = Number(amountBRL) / price;
      if (!Number.isNaN(bz)) setAmountBZR(bz.toFixed(12));
    }
    if (mode === 'BZR' && amountBZR) {
      const brl = Number(amountBZR) * price;
      if (!Number.isNaN(brl)) setAmountBRL(brl.toFixed(2));
    }
  }, [mode, amountBRL, amountBZR, price, offer]);

  const canSubmit = useMemo(() => {
    if (!offer) return false;
    const brl = Number(amountBRL || '0');
    if (Number.isNaN(brl) || brl <= 0) return false;
    const min = Number(offer.minBRL);
    const max = Number(offer.maxBRL);
    return brl >= min && brl <= max;
  }, [offer, amountBRL]);

  const showRangeBadge = useMemo(() => {
    if (!offer) return false;
    if (!amountBRL) return false;
    const brl = Number(amountBRL);
    if (!Number.isFinite(brl)) return false;
    const min = Number(offer.minBRL);
    const max = Number(offer.maxBRL);
    return brl < min || brl > max;
  }, [offer, amountBRL]);

  const handleCreateOrder = async () => {
    if (!offer) return;
    if (!canSubmit) {
      const min = Number(offer.minBRL);
      const max = Number(offer.maxBRL);
      toast.error(t('p2p.offerPublic.validation.outOfRange', `Informe um valor entre R$ ${min} e R$ ${max}`));
      return;
    }
    try {
      const payload = mode === 'BZR' ? { amountBZR: Number(amountBZR) } : { amountBRL: Number(amountBRL) };
      const res = await p2pApi.createOrder(offer.id, payload as any);
      const orderId = (res as any).id;
      toast.success(t('p2p.order.toast.created', 'Ordem criada'));
      navigate(`/app/p2p/orders/${orderId}`);
    } catch (e) {
      toast.error((e as Error).message || 'Erro');
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-2 md:py-3">{t('common.loading')}</div>;
  if (err || !offer) return <div className="container mx-auto px-4 py-2 md:py-3">{err || t('common.error')}</div>;

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-base">{offer.owner?.handle ? `@${offer.owner.handle}` : offer.ownerId.substring(0,6) + '…'}</CardTitle>
          <div className="flex gap-2">
            <Badge>PIX</Badge>
            <Badge variant="secondary">{t('p2p.offer.price')}: R$ {offer.priceBRLPerBZR}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <div>{t('p2p.offer.range')}: R$ {offer.minBRL} – R$ {offer.maxBRL}</div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex gap-2" role="tablist" aria-label="Amount mode">
              <Button variant={mode==='BRL'?'default':'outline'} role="tab" aria-selected={mode==='BRL'} onClick={() => setMode('BRL')}>BRL</Button>
              <Button variant={mode==='BZR'?'default':'outline'} role="tab" aria-selected={mode==='BZR'} onClick={() => setMode('BZR')}>BZR</Button>
            </div>
            {mode==='BRL' ? (
              <div className="grow">
                <label className="block text-sm mb-1">BRL</label>
                <Input inputMode="decimal" value={amountBRL} onChange={(e) => setAmountBRL(e.target.value)} placeholder="0.00" />
              </div>
            ) : (
              <div className="grow">
                <label className="block text-sm mb-1">BZR</label>
                <Input inputMode="decimal" value={amountBZR} onChange={(e) => setAmountBZR(e.target.value)} placeholder="0.000000000000" />
              </div>
            )}
            <Button
              onClick={handleCreateOrder}
              disabled={!canSubmit}
              title={!canSubmit ? (t('p2p.offerPublic.validation.outOfRange', 'Valor fora da faixa desta oferta.') as string) : undefined}
            >
              {offer.side === 'SELL_BZR' ? t('p2p.actions.buy') : t('p2p.actions.sell')}
            </Button>
          </div>
          {offer && showRangeBadge && (
            <div className="-mt-2" aria-live="polite">
              <Badge variant="destructive">
                {t('p2p.offerPublic.rangeBadge', `Faixa permitida: R$ ${Number(offer.minBRL)} – R$ ${Number(offer.maxBRL)}`)}
              </Badge>
            </div>
          )}
          <p className="text-xs text-muted-foreground" aria-live="polite">{t('p2p.security.escrowFirst', 'A chave PIX fica visível após o escrow de BZR.')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
