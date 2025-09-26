import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sellerApi } from '@/modules/seller/api';
import { API_BASE_URL } from '@/config';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

function resolveMediaUrl(u?: string) {
  if (!u) return '';
  try { return new URL(u).toString(); } catch {}
  const base = API_BASE_URL || 'http://localhost:3000';
  return new URL(u.startsWith('/') ? u : `/${u}`, base).toString();
}

export default function SellerPublicPage() {
  const { shopSlug = '' } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof sellerApi.getPublic>> | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  async function load(cursor?: string) {
    const res = await sellerApi.getPublic(shopSlug, cursor ? { cursor } : undefined);
    setData((d) => {
      if (!d) return res as any;
      return {
        ...res,
        catalog: {
          products: [ ...(d as any).catalog.products, ...(res as any).catalog.products ],
          page: (res as any).catalog.page,
        },
      } as any;
    });
    setNextCursor((res as any).catalog?.page?.nextCursor ?? null);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await sellerApi.getPublic(shopSlug);
        if (!active) return;
        setData(res as any);
        setNextCursor((res as any).catalog?.page?.nextCursor ?? null);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || t('errors.generic'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [shopSlug, t]);

  const renderContent = () => {
    if (loading) {
      return <div className="container mx-auto px-4 py-8">{t('common.loading')}</div>;
    }

    if (error) {
      return <div className="container mx-auto px-4 py-8 text-destructive">{error}</div>;
    }

    if (!data) {
      return null;
    }

    const seller = (data as any).sellerProfile;
    const owner = (data as any).owner;

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{seller.shopName}</h1>
          <p className="text-muted-foreground">@{seller.shopSlug}</p>
          {seller.about && (
            <p className="mt-2 max-w-3xl whitespace-pre-wrap">{seller.about}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            {typeof seller.ratingAvg === 'number' && (
              <span>{t('seller.public.rating', { defaultValue: 'Reputação' })}: {seller.ratingAvg.toFixed(1)} ({seller.ratingCount})</span>
            )}
            {owner?.handle && (
              <Link className="text-primary underline underline-offset-4" to={`/u/${owner.handle}`}>
                {t('seller.public.ownerProfile', { defaultValue: 'Ver perfil do dono' })}
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data as any).catalog.products.map((p: any) => (
            <Card key={p.id} className="overflow-hidden">
              <Link to={`/app/product/${p.id}`} className="block">
                {/* Imagem de capa (se disponível) */}
                {p.coverUrl ? (
                  <img
                    src={resolveMediaUrl(p.coverUrl)}
                    alt={p.title}
                    loading="lazy"
                    className="w-full aspect-video object-cover bg-muted"
                  />
                ) : (
                  <div className="aspect-video bg-muted" />
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{p.title}</h3>
                  {p.priceBzr && <div className="text-sm text-muted-foreground">{p.priceBzr} BZR</div>}
                  <div className="mt-2"><Badge variant="outline">PUBLISHED</Badge></div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        {nextCursor && (
          <div className="mt-6 flex justify-center">
            <button className="px-4 py-2 border rounded" onClick={() => load(nextCursor)}>
              {t('profile.seeMore')}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Header />
      {renderContent()}
      <Footer />
    </>
  );
}
