import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sellerApi } from '@/modules/seller/api';

type Status = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export default function SellerProductsPage() {
  const { t } = useTranslation();
  const { shopSlug = '' } = useParams();
  const [status, setStatus] = useState<Status>('ALL');
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(reset = false) {
    const params: any = { limit: 20 };
    if (status !== 'ALL') params.status = status;
    if (!reset && nextCursor) params.cursor = nextCursor;
    const res = await sellerApi.listStoreProducts(shopSlug, params);
    setItems((prev) => reset ? res.items : [...prev, ...res.items]);
    setNextCursor(res.nextCursor ?? null);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    setItems([]);
    setNextCursor(null);
    load(true).catch((e) => setError(e?.message || t('errors.generic'))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function onPublish(id: string) {
    try {
      await sellerApi.publishMyProduct(id);
      setItems((prev) => prev.map((p) => p.id === id ? { ...p, status: 'PUBLISHED' } : p));
    } catch {}
  }
  async function onArchive(id: string) {
    try {
      await sellerApi.archiveMyProduct(id);
      setItems((prev) => prev.map((p) => p.id === id ? { ...p, status: 'ARCHIVED' } : p));
    } catch {}
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('seller.products.title', { defaultValue: 'Produtos da loja' })} <span className="text-muted-foreground">/@{shopSlug}</span></h1>
        <div className="flex gap-2">
          <Link to="/app/new"><Button>{t('seller.products.new', { defaultValue: 'Cadastrar' })}</Button></Link>
          {(['ALL','DRAFT','PUBLISHED','ARCHIVED'] as const).map((s) => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>{s}</Button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-muted-foreground">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{p.priceBzr} BZR</div>
                  <Badge variant={p.status === 'PUBLISHED' ? 'default' : p.status === 'DRAFT' ? 'secondary' : 'outline'}>{p.status}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {p.status !== 'PUBLISHED' && (
                    <Button size="sm" onClick={() => onPublish(p.id)}>{t('seller.products.publish', { defaultValue: 'Publicar' })}</Button>
                  )}
                  {p.status !== 'ARCHIVED' && (
                    <Button size="sm" variant="outline" onClick={() => onArchive(p.id)}>{t('seller.products.archive', { defaultValue: 'Arquivar' })}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => load(false)}>{t('profile.seeMore')}</Button>
        </div>
      )}
    </div>
  );
}
