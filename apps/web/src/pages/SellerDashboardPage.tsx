import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sellerApi } from '@/modules/seller/api';

export default function SellerDashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ draft: number; published: number; archived: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [draft, pub, arch] = await Promise.all([
          sellerApi.listMyProducts({ status: 'DRAFT', limit: 5 }),
          sellerApi.listMyProducts({ status: 'PUBLISHED', limit: 5 }),
          sellerApi.listMyProducts({ status: 'ARCHIVED', limit: 5 }),
        ]);
        if (!active) return;
        setCounts({ draft: draft.items.length, published: pub.items.length, archived: arch.items.length });
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || t('errors.generic'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [t]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('seller.dashboard.title', { defaultValue: 'Painel do Vendedor' })}</h1>
        <div className="flex gap-2">
          <Link to="/app/new"><Button>{t('seller.products.new', { defaultValue: 'Cadastrar' })}</Button></Link>
          <Link to="/app/seller/products"><Button variant="outline">{t('seller.dashboard.manageProducts', { defaultValue: 'Meus produtos' })}</Button></Link>
          <Link to="/app/seller/orders"><Button>{t('seller.dashboard.orders', { defaultValue: 'Minhas vendas' })}</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title={t('seller.dashboard.stats.published', { defaultValue: 'Publicados' })} value={counts?.published ?? (loading ? '…' : 0)} />
        <StatCard title={t('seller.dashboard.stats.draft', { defaultValue: 'Rascunhos' })} value={counts?.draft ?? (loading ? '…' : 0)} />
        <StatCard title={t('seller.dashboard.stats.archived', { defaultValue: 'Arquivados' })} value={counts?.archived ?? (loading ? '…' : 0)} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
