import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { p2pApi } from '../api';
import { getSessionUser } from '@/modules/auth/session';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate, Link } from 'react-router-dom';

type Order = {
  id: string;
  status: 'DRAFT' | 'AWAITING_ESCROW' | 'AWAITING_FIAT_PAYMENT' | 'AWAITING_CONFIRMATION' | 'RELEASED' | 'EXPIRED' | 'CANCELLED' | 'DISPUTE_OPEN' | 'DISPUTE_RESOLVED_BUYER' | 'DISPUTE_RESOLVED_SELLER';
  amountBRL: string;
  amountBZR: string;
  priceBRLPerBZR: string;
  side: 'SELL_BZR' | 'BUY_BZR';
  makerId: string;
  takerId: string;
  createdAt: string;
  makerProfile?: { userId?: string; handle?: string; displayName?: string; avatarUrl?: string | null } | null;
  takerProfile?: { userId?: string; handle?: string; displayName?: string; avatarUrl?: string | null } | null;
};

export default function P2PMyOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = getSessionUser();
  const [tab, setTab] = useState<'ACTIVE'|'HIST'>('ACTIVE');
  const [items, setItems] = useState<Order[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (reset = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await p2pApi.listMyOrders({ status: tab, cursor: reset ? undefined : (nextCursor ?? undefined), limit: 20 });
      if (reset) {
        setItems(res.items as any);
      } else {
        setItems((prev) => [...prev, ...(res.items as any)]);
      }
      setNextCursor(res.nextCursor);
    } catch (e) {
      setError((e as Error).message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(true); }, [tab]);

  const statusLabel = (s: Order['status']) => {
    switch (s) {
      case 'AWAITING_ESCROW': return t('p2p.room.status.awaitingEscrow', 'Aguardando escrow de BZR');
      case 'AWAITING_FIAT_PAYMENT': return t('p2p.room.status.awaitingFiat', 'Aguardando pagamento PIX');
      case 'AWAITING_CONFIRMATION': return t('p2p.room.status.awaitingConfirm', 'Aguardando confirmação');
      case 'RELEASED': return t('p2p.room.status.released', 'Liberado');
      case 'EXPIRED': return t('p2p.room.status.expired', 'Expirada');
      case 'CANCELLED': return t('p2p.room.status.cancelled', 'Cancelada');
      default: return s;
    }
  };

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

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2" role="tablist" aria-label="My orders tabs">
          <Button variant={tab==='ACTIVE'?'default':'outline'} role="tab" aria-selected={tab==='ACTIVE'} onClick={() => setTab('ACTIVE')}>{t('p2p.my.active', 'Ativas')}</Button>
          <Button variant={tab==='HIST'?'default':'outline'} role="tab" aria-selected={tab==='HIST'} onClick={() => setTab('HIST')}>{t('p2p.my.history', 'Histórico')}</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/p2p')}>{t('common.back', 'Voltar')}</Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600" aria-live="polite">{error}</p>}

      <div className="grid gap-3">
        {items.map((o) => {
          const iAmMaker = me && o.makerId === me.id;
          const role = iAmMaker ? (o.side === 'SELL_BZR' ? t('p2p.badge.selling') : t('p2p.badge.buying')) : (o.side === 'SELL_BZR' ? t('p2p.actions.buy', 'Comprar') : t('p2p.actions.sell', 'Vender'));
          const cp = iAmMaker ? o.takerProfile : o.makerProfile;
          return (
            <Card key={o.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">#{o.id.slice(0,8)}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{role}</Badge>
                  <Badge>{statusLabel(o.status)}</Badge>
                  {cp && (
                    <div className="flex items-center gap-2">
                      {cp.avatarUrl && (
                        <img src={cp.avatarUrl} alt={cp.displayName || cp.handle || 'avatar'} className="h-5 w-5 rounded-full object-cover" />
                      )}
                      {cp.handle && (
                        <Link className="text-xs underline" to={`/u/${cp.handle}`}>@{cp.handle}</Link>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  <div>{t('p2p.room.summary.price', 'Preço')}: R$ {o.priceBRLPerBZR}</div>
                  <div>{t('p2p.room.summary.amountBZR', 'Quantidade BZR')}: {o.amountBZR}</div>
                  <div>{t('p2p.room.summary.amountBRL', 'Valor BRL')}: R$ {o.amountBRL}</div>
                  <div>{t('p2p.my.createdAt', 'Criada em')}: {new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button onClick={() => navigate(`/app/p2p/orders/${o.id}`)}>{t('p2p.my.reopen', 'Reabrir sala')}</Button>
                  {(o.status === 'DRAFT' || o.status === 'AWAITING_ESCROW') && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try { await p2pApi.cancelOrder(o.id); await load(true); } catch (e) { /* noop, toast na sala */ }
                      }}
                    >
                      {t('common.cancel', 'Cancelar')}
                    </Button>
                  )}
                </div>
                {!(o.status === 'DRAFT' || o.status === 'AWAITING_ESCROW') && (
                  <div className="text-xs text-muted-foreground mt-2 sm:mt-0" aria-live="polite">
                    {cancelReason(o.status)}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center mt-4">
        <Button variant="secondary" onClick={() => load(false)} disabled={loading || !nextCursor}>{nextCursor ? (loading ? t('common.loading') : t('common.next', 'Próximo')) : t('common.end', 'Fim')}</Button>
      </div>
    </div>
  );
}
