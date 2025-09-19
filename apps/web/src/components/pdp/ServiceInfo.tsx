// V-1 (2025-09-18): Bloco principal de informações da PDP de serviço

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import PriceBzr from '../PriceBzr';
import type { ServiceDetail } from '../../hooks/useServiceDetail';

interface ServiceInfoProps {
  service: ServiceDetail;
}

function hasMedia(media: Array<{ id: string; url: string }>) {
  return media.some(item => item && item.url);
}

export function ServiceInfo({ service }: ServiceInfoProps) {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);

  const ratingValue = typeof service.ratingValue === 'number' ? service.ratingValue : null;
  const ratingCount = typeof service.ratingCount === 'number' ? service.ratingCount : null;
  const hasRating = ratingValue !== null && ratingCount !== null && ratingCount > 0;

  const handleHire = () => {
    console.log('hire_now', { id: service.id });
  };

  const handleRequestQuote = () => {
    console.log('request_quote', { id: service.id });
  };

  const handleChat = () => {
    console.log('chat', { id: service.id });
  };

  const toggleFavorite = () => {
    setIsFavorite(prev => !prev);
  };

  const ratingLabel = hasRating
    ? t('pdp.rating', {
        stars: ratingValue!.toFixed(1),
        count: ratingCount!,
      })
    : null;

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="space-y-2">
        <h1 id="service-title" className="text-3xl font-bold tracking-tight">
          {service.title}
        </h1>
        {hasRating ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-label={ratingLabel ?? undefined}>
            <span className="text-primary">★</span>
            <span>{ratingLabel}</span>
          </p>
        ) : null}
        {service.basePriceBzr ? (
          <div className="text-muted-foreground">
            <span className="mr-2 uppercase text-xs tracking-wide">{t('pdp.from')}</span>
            <PriceBzr value={service.basePriceBzr} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Ações principais do serviço">
        <Button onClick={handleHire}>{t('pdp.hire')}</Button>
        <Button variant="outline" onClick={handleRequestQuote}>
          {t('pdp.request_quote')}
        </Button>
        <Button variant="secondary" onClick={handleChat}>
          {t('pdp.chat')}
        </Button>
        <Button
          variant={isFavorite ? 'default' : 'ghost'}
          onClick={toggleFavorite}
          aria-pressed={isFavorite}
        >
          <span aria-hidden>{isFavorite ? '♥' : '♡'}</span>
          <span className="ml-2">{t('pdp.favorite')}</span>
        </Button>
      </div>

      {service.daoId ? (
        <p className="text-sm text-muted-foreground">{service.daoId}</p>
      ) : null}

      {!hasMedia(service.media) ? (
        <p className="text-sm text-muted-foreground">{t('pdp.noImage')}</p>
      ) : null}
    </div>
  );
}

export default ServiceInfo;
