// V-6 (2025-09-18): Passa mídia normalizada para ImageGallery
// V-5 (2025-09-18): Adiciona itens relacionados, SEO e JSON-LD na SDP de serviço

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import ImageGallery from '../components/pdp/ImageGallery';
import ServiceInfo from '../components/pdp/ServiceInfo';
import { AttributesDisplay } from '../components/pdp/AttributesDisplay';
import { DescriptionBlock } from '../components/pdp/DescriptionBlock';
import { SellerCard } from '../components/pdp/SellerCard';
import { ShippingCalculator } from '../components/pdp/ShippingCalculator';
import { RelatedItems } from '../components/pdp/RelatedItems';
import { useServiceDetail } from '../hooks/useServiceDetail';
import { useEffectiveSpec } from '../hooks/useEffectiveSpec';
import { useRelatedItems } from '../hooks/useRelatedItems';
import { generateServiceSchema } from '../utils/seo';
import { DynamicHeader } from '../components/DynamicHeader';
import { Footer } from '../components/Footer';

export function ServiceDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const itemId = params.id ?? '';
  const { status, data, error } = useServiceDetail(itemId);
  const categoryId = data?.categoryId ?? null;
  const { spec } = useEffectiveSpec(categoryId);
  const categoryPath = Array.isArray(data?.categoryPath) ? (data?.categoryPath as string[]) : [];
  const related = useRelatedItems(categoryPath, 'service');

  const filteredRelatedItems = useMemo(() => {
    if (!data) return [];
    return related.items.filter(item => item.kind === 'service' && item.id !== data.id);
  }, [related.items, data?.id]);

  const hasRelatedItems = related.status === 'success' && filteredRelatedItems.length > 0;
  const shouldShowFallback = !hasRelatedItems && (related.status === 'loading' || related.status === 'error');

  useEffect(() => {
    if (status !== 'success' || !data || typeof document === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    const titleValue = `${data.title} | Bazari`;
    document.title = titleValue;

    const rawDescription = (data.description ?? '').replace(/\s+/g, ' ').trim();
    const baseDescription = rawDescription.length > 0 ? rawDescription : data.title;
    const descriptionValue = baseDescription.length > 155
      ? `${baseDescription.slice(0, 152)}…`
      : baseDescription;

    const head = document.head;
    let meta = head.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    let createdMeta = false;
    const previousDescription = meta?.getAttribute('content') ?? null;

    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      head.appendChild(meta);
      createdMeta = true;
    }

    if (meta) {
      meta.setAttribute('content', descriptionValue ?? '');
    }

    const scriptId = `jsonld-service-${data.id}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = scriptId;
      head.appendChild(script);
    }

    if (script) {
      script.textContent = JSON.stringify(generateServiceSchema(data));
    }

    return () => {
      document.title = previousTitle;

      if (meta) {
        if (previousDescription !== null) {
          meta.setAttribute('content', previousDescription);
        } else if (createdMeta && meta.parentNode) {
          meta.parentNode.removeChild(meta);
        } else if (previousDescription === null) {
          meta.removeAttribute('content');
        }
      }

      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [status, data]);

  if (!itemId) {
    return (
      <>
        <DynamicHeader />
        <main className="pt-16">
          <section className="container mx-auto px-4 py-12 mobile-safe-bottom" role="alert">
            <p className="text-muted-foreground">{t('pdp.error')}</p>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (status === 'loading') {
    return (
      <>
        <DynamicHeader />
        <main className="pt-16">
          <section className="container mx-auto px-4 py-12 mobile-safe-bottom" aria-busy="true">
            <p className="sr-only">{t('pdp.loading')}</p>
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="aspect-square rounded bg-muted" />
                <div className="space-y-4">
                  <div className="h-8 w-2/3 rounded bg-muted" />
                  <div className="h-6 w-1/4 rounded bg-muted" />
                  <div className="h-24 rounded bg-muted" />
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (status === 'error' || !data) {
    return (
      <>
        <DynamicHeader />
        <main className="pt-16">
          <section className="container mx-auto px-4 py-12 mobile-safe-bottom" role="alert">
            <div className="rounded border border-destructive/50 bg-destructive/5 p-6">
              <p className="text-destructive font-medium">
                {error === 'not_found' ? t('pdp.error') : t('pdp.error')}
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <DynamicHeader />
      <main className="pt-16">
        <section className="container mx-auto px-4 py-2 md:py-3 mobile-safe-bottom" aria-labelledby="service-title">
        <Breadcrumbs categoryPath={data.categoryPath} title={data.title} />

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <ImageGallery images={data.mediaNormalized} title={data.title} />

          <article className="space-y-6">
            <ServiceInfo service={data} />

            <div className="space-y-6">
              <AttributesDisplay attributes={data.attributes} categorySpec={spec} />
              <DescriptionBlock description={data.description ?? undefined} />
              <SellerCard
                name={data.seller?.shopName ?? data.daoName ?? data.daoId}
                reputationPercent={data.sellerReputation ?? null}
                handle={data.seller?.handle ?? null}
                onChainStats={data.onChainReputation ?? null}
                onChainStoreId={data.seller?.shopSlug ?? data.onChainStoreId ?? null}
              />
              <ShippingCalculator />
            </div>
          </article>
        </div>

        {shouldShowFallback ? (
          <section className="mt-12" aria-live="polite">
            <h2 className="text-2xl font-semibold text-foreground">
              {t('pdp.related', { defaultValue: 'Produtos Relacionados' })}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {related.status === 'loading' ? t('pdp.loading') : t('pdp.error')}
            </p>
          </section>
        ) : null}

        {hasRelatedItems ? (
          <RelatedItems items={filteredRelatedItems} kind="service" />
        ) : null}
        </section>
      </main>
      <Footer />
    </>
  );
}

export default ServiceDetailPage;
