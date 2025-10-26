import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { p2pApi, type P2POffer } from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function P2PHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // UI intent: 'BUY' lists SELL_BZR offers; 'SELL' lists BUY_BZR offers
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');
  const [items, setItems] = useState<P2POffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myItems, setMyItems] = useState<P2POffer[] | null>(null);
  const [myError, setMyError] = useState<string | null>(null);
  const [minBRL, setMinBRL] = useState('');
  const [maxBRL, setMaxBRL] = useState('');

  const load = useMemo(() => async () => {
    setLoading(true);
    setError(null);
    try {
      const side = tab === 'BUY' ? 'SELL_BZR' : 'BUY_BZR';
      const res = await p2pApi.listOffers({ side, method: 'PIX', minBRL: minBRL ? Number(minBRL) : undefined, maxBRL: maxBRL ? Number(maxBRL) : undefined });
      setItems(res.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, minBRL, maxBRL]);

  useEffect(() => { load(); }, [load]);

  // Load my offers (auth required). Ignore errors silently in UI, but show minimal message if any.
  useEffect(() => {
    let active = true;
    setMyError(null);
    p2pApi.listMyOffers({ limit: 10 })
      .then((res) => { if (active) setMyItems(res.items); })
      .catch((e) => { if (active) { setMyItems([]); setMyError((e as Error).message); } });
    return () => { active = false; };
  }, []);

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-2" role="tablist" aria-label="P2P tabs">
          <Button variant={tab==='BUY'?'default':'outline'} role="tab" aria-selected={tab==='BUY'} onClick={() => setTab('BUY')}>{t('p2p.tabs.buyBzr')}</Button>
          <Button variant={tab==='SELL'?'default':'outline'} role="tab" aria-selected={tab==='SELL'} onClick={() => setTab('SELL')}>{t('p2p.tabs.sellBzr')}</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/p2p/my-orders')}>{t('p2p.my.title', 'Minhas ordens')}</Button>
          <Button onClick={() => navigate('/app/p2p/offers/new')}>{t('p2p.cta.createOffer')}</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div>
          <label className="block text-sm mb-1">{t('p2p.filters.minBRL')}</label>
          <Input inputMode="decimal" value={minBRL} onChange={(e) => setMinBRL(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('p2p.filters.maxBRL')}</label>
          <Input inputMode="decimal" value={maxBRL} onChange={(e) => setMaxBRL(e.target.value)} placeholder="" />
        </div>
        <Button variant="secondary" disabled={loading} onClick={load} aria-live="polite">{loading ? t('common.loading') : t('p2p.actions.applyFilters')}</Button>
      </div>

      <div className="grid gap-4">
        {error && (
          <p className="text-sm text-red-600" aria-live="polite">{error}</p>
        )}
        {items.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">
                {o.owner?.handle ? `@${o.owner.handle}` : o.ownerId.substring(0,6)+'...'}
                {o.ownerStats?.avgStars != null && (
                  <span className="ml-2 text-xs text-muted-foreground">★ {o.ownerStats.avgStars.toFixed(1)}</span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Badge>PIX</Badge>
                <Badge variant="secondary">{o.side === 'SELL_BZR' ? t('p2p.badge.selling') : t('p2p.badge.buying')}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                <div>{t('p2p.offer.price')}: R$ {o.priceBRLPerBZR}</div>
                <div>{t('p2p.offer.range')}: R$ {o.minBRL} – R$ {o.maxBRL}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate(`/app/p2p/offers/${o.id}`)}>{o.side==='SELL_BZR'?t('p2p.actions.buy'):t('p2p.actions.sell')}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground" aria-live="polite">{t('p2p.empty')}</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">{t('p2p.mine.title', 'Minhas ofertas')}</h2>
        {myError && (
          <p className="text-sm text-red-600" aria-live="polite">{myError}</p>
        )}
        <div className="grid gap-3">
          {(myItems ?? []).map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">#{o.id.slice(0,6)} · {o.status}</CardTitle>
                <div className="flex gap-2">
                  <Badge>PIX</Badge>
                  <Badge variant="secondary">{o.side === 'SELL_BZR' ? t('p2p.badge.selling') : t('p2p.badge.buying')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  <div>{t('p2p.offer.price')}: R$ {o.priceBRLPerBZR}</div>
                  <div>{t('p2p.offer.range')}: R$ {o.minBRL} – R$ {o.maxBRL}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/app/p2p/offers/${o.id}`)}>{t('p2p.mine.view', 'Ver')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(myItems && myItems.length === 0) && (
            <p className="text-sm text-muted-foreground" aria-live="polite">{t('p2p.mine.empty', 'Você ainda não criou ofertas.')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
