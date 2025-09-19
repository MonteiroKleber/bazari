// V-4 (2025-09-18): Aceita prop images preferencialmente para mídia normalizada
// V-3 (2025-09-18): Consome lista normalizada de mídia mantendo API estável
// V-2 (2025-09-18): Padroniza exports (nomeado + default) para ImageGallery

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface GalleryMedia {
  id?: string;
  url: string;
}

interface ImageGalleryProps {
  media?: GalleryMedia[];
  images?: GalleryMedia[];
  title?: string;
}

export function ImageGallery({ media, images, title = '' }: ImageGalleryProps) {
  const { t } = useTranslation();
  const list = Array.isArray(images) && images.length > 0 ? images : Array.isArray(media) ? media : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = list[activeIndex];

  if (!list.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded border border-dashed border-muted-foreground/40 bg-muted/20 text-center text-sm text-muted-foreground">
        {t('pdp.noImage')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <figure className="overflow-hidden rounded border border-border bg-muted/10">
        <img
          src={activeMedia.url}
          alt={title || t('pdp.noImage')}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </figure>

      {list.length > 1 ? (
        <div className="flex gap-2" role="list">
          {list.map((item, index) => (
            <button
              key={item.id ?? `${item.url}-${index}`}
              type="button"
              role="listitem"
              onClick={() => setActiveIndex(index)}
              className={`h-16 w-16 overflow-hidden rounded border transition ${
                index === activeIndex
                  ? 'border-primary ring-2 ring-primary/40'
                  : 'border-border hover:border-primary/60'
              }`}
              aria-label={`Miniatura ${index + 1}`}
            >
              <img
                src={item.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ImageGallery;
