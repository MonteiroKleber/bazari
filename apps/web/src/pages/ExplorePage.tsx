import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/useCategories';

type Kind = 'all' | 'product' | 'service';

export default function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const { categories, loading, error } = useCategories();

  const topLevel = useMemo(() => {
    const list = (categories || []).filter((c: any) => c.level === 1);
    if (kind === 'all') return list;
    return list.filter((c: any) => c.kind === (kind === 'product' ? 'product' : 'service'));
  }, [categories, kind]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (kind !== 'all') params.set('kind', kind);
    navigate(`/search?${params.toString()}`);
  };

  const linkToSearch = (cat: any) => {
    // Build categoryPath param as comma-separated string understood by SearchPage
    const path = cat.pathSlugs?.join(',') || '';
    const params = new URLSearchParams();
    params.set('categoryPath', path);
    if (kind !== 'all') params.set('kind', kind);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('explore.title')}</h1>
          <p className="text-muted-foreground">{t('explore.subtitle')}</p>
          <form onSubmit={onSubmit} className="mt-6 flex gap-2 items-center">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('explore.searchPlaceholder') as string}
              aria-label={t('explore.searchPlaceholder') as string}
              className="flex-1"
            />
            <div className="hidden sm:flex gap-1">
              <Button type="button" variant={kind==='all'?'default':'outline'} onClick={() => setKind('all')}>{t('explore.all')}</Button>
              <Button type="button" variant={kind==='product'?'default':'outline'} onClick={() => setKind('product')}>{t('explore.products')}</Button>
              <Button type="button" variant={kind==='service'?'default':'outline'} onClick={() => setKind('service')}>{t('explore.services')}</Button>
            </div>
            <Button type="submit">{t('explore.search')}</Button>
          </form>
          <div className="sm:hidden mt-2 flex gap-2 justify-center">
            <Button type="button" size="sm" variant={kind==='all'?'default':'outline'} onClick={() => setKind('all')}>{t('explore.all')}</Button>
            <Button type="button" size="sm" variant={kind==='product'?'default':'outline'} onClick={() => setKind('product')}>{t('explore.products')}</Button>
            <Button type="button" size="sm" variant={kind==='service'?'default':'outline'} onClick={() => setKind('service')}>{t('explore.services')}</Button>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t('explore.browseCategories')}</h2>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {error && (
            <div className="text-destructive text-sm">{t('explore.errorLoading')}</div>
          )}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topLevel.map((cat: any) => (
                <Card key={cat.id} className="cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => linkToSearch(cat)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {cat.namePt || cat.nameEn || cat.nameEs}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <span className="uppercase tracking-wide text-xs mr-2">
                      {cat.kind === 'product' ? t('explore.products') : t('explore.services')}
                    </span>
                    <span className="text-xs">{t('explore.viewAll')}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}

