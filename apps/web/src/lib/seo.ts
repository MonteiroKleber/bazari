export interface PageSeoOptions {
  title?: string;
  description?: string | null;
  canonical?: string | null;
}

function ensureMetaTag(name: string): HTMLMetaElement {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  return tag as HTMLMetaElement;
}

function ensureLink(rel: string): HTMLLinkElement {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  return link as HTMLLinkElement;
}

export function applyPageSeo({ title, description, canonical }: PageSeoOptions): () => void {
  const previousTitle = document.title;
  if (title) {
    document.title = title;
  }

  let previousDescription: string | null = null;
  let hadDescription = false;
  if (description !== undefined) {
    const meta = ensureMetaTag('description');
    previousDescription = meta.getAttribute('content');
    hadDescription = Boolean(previousDescription);
    if (description === null) {
      meta.removeAttribute('content');
    } else {
      meta.setAttribute('content', description);
    }
  }

  let canonicalElement: HTMLLinkElement | null = null;
  let previousCanonical: string | null = null;
  let hadCanonical = false;
  if (canonical !== undefined) {
    canonicalElement = ensureLink('canonical');
    previousCanonical = canonicalElement.getAttribute('href');
    hadCanonical = Boolean(previousCanonical);
    if (canonical === null) {
      canonicalElement.removeAttribute('href');
    } else {
      canonicalElement.setAttribute('href', canonical);
    }
  }

  return () => {
    document.title = previousTitle;

    if (description !== undefined) {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta) {
        if (hadDescription && previousDescription != null) {
          meta.setAttribute('content', previousDescription);
        } else if (!hadDescription) {
          meta.remove();
        } else {
          meta.removeAttribute('content');
        }
      }
    }

    if (canonical !== undefined && canonicalElement) {
      if (hadCanonical && previousCanonical) {
        canonicalElement.setAttribute('href', previousCanonical);
      } else if (!hadCanonical) {
        canonicalElement.remove();
      } else {
        canonicalElement.removeAttribute('href');
      }
    }
  };
}

function ensureJsonLdScript(id: string): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;
  const scriptId = `jsonld-${id}`;
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = scriptId;
    document.head.appendChild(script);
  }
  return script;
}

export function injectJsonLd(id: string, payload: unknown): () => void {
  const script = ensureJsonLdScript(id);
  if (!script) return () => {};

  script.textContent = JSON.stringify(payload);

  return () => {
    const existing = typeof document !== 'undefined' ? document.getElementById(`jsonld-${id}`) : null;
    if (existing) {
      existing.remove();
    }
  };
}

export interface StoreJsonLdOptions {
  storeName: string;
  storeDescription?: string | null;
  storeUrl: string;
  storeLogo?: string | null;
  storeImage?: string | null;
}

export interface ProductJsonLdSource {
  id: string;
  title: string;
  description?: string | null;
  priceBzr?: string | number | null;
  image?: string | null;
  url: string;
}

export function buildStoreJsonLd(
  options: StoreJsonLdOptions,
  products: ProductJsonLdSource[]
) {
  const { storeName, storeDescription, storeUrl, storeLogo, storeImage } = options;

  const org: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${storeUrl}#organization`,
    name: storeName,
    url: storeUrl,
  };

  if (storeDescription) org.description = storeDescription;
  if (storeLogo) org.logo = storeLogo;
  if (storeImage) org.image = storeImage;

  const productNodes = products.slice(0, 20).map((product) => {
    const price = product.priceBzr != null ? Number(product.priceBzr) : undefined;
    const offers = price && Number.isFinite(price)
      ? {
          '@type': 'Offer',
          priceCurrency: 'BZR',
          price: price,
          availability: 'https://schema.org/InStock',
          url: product.url,
        }
      : undefined;

    const entry: Record<string, unknown> = {
      '@type': 'Product',
      '@id': `${product.url}#product`,
      name: product.title,
      url: product.url,
    };

    if (product.description) entry.description = product.description;
    if (product.image) entry.image = product.image;
    if (offers) entry.offers = offers;

    return entry;
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [org, ...productNodes],
  };
}
