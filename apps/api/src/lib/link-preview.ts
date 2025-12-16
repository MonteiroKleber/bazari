/**
 * Link Preview Service
 * Fetches metadata (title, description, image) for URLs
 */

import { JSDOM } from 'jsdom';

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

const USER_AGENT = 'Mozilla/5.0 (compatible; BazariBot/1.0; +https://bazari.libervia.xyz)';
const TIMEOUT_MS = 5000;

// Cache simples em memória (em produção, usar Redis)
const previewCache = new Map<string, { data: LinkPreviewData; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Extrai URLs de um texto
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>\[\]{}|\\^]+/gi;
  const matches = text.match(urlRegex) || [];
  // Limpar trailing punctuation
  return matches.map(url => url.replace(/[.,;:!?)\]]+$/, ''));
}

/**
 * Busca preview de uma URL
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    // Verificar cache
    const cached = previewCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // Validar URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }

    // Fetch com timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      // Não é HTML, retornar apenas URL
      return { url };
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extrair metadados
    const data: LinkPreviewData = {
      url,
      title: getMetaContent(document, 'og:title') ||
             getMetaContent(document, 'twitter:title') ||
             document.querySelector('title')?.textContent?.trim() ||
             undefined,
      description: getMetaContent(document, 'og:description') ||
                   getMetaContent(document, 'twitter:description') ||
                   getMetaContent(document, 'description') ||
                   undefined,
      image: getMetaContent(document, 'og:image') ||
             getMetaContent(document, 'twitter:image') ||
             getMetaContent(document, 'twitter:image:src') ||
             undefined,
      siteName: getMetaContent(document, 'og:site_name') ||
                parsedUrl.hostname,
      favicon: getFavicon(document, parsedUrl.origin),
    };

    // Resolver URLs relativas de imagem
    if (data.image && !data.image.startsWith('http')) {
      data.image = new URL(data.image, url).href;
    }

    // Limitar tamanho de strings
    if (data.title && data.title.length > 200) {
      data.title = data.title.substring(0, 200) + '...';
    }
    if (data.description && data.description.length > 500) {
      data.description = data.description.substring(0, 500) + '...';
    }

    // Salvar no cache
    previewCache.set(url, { data, timestamp: Date.now() });

    return data;
  } catch (err: any) {
    console.error('[LinkPreview] Failed to fetch:', url, err.message);
    return null;
  }
}

/**
 * Helper para extrair conteúdo de meta tags
 */
function getMetaContent(document: Document, name: string): string | undefined {
  // Tentar og: e twitter: como property
  let element = document.querySelector(`meta[property="${name}"]`);
  if (!element) {
    // Tentar como name
    element = document.querySelector(`meta[name="${name}"]`);
  }
  const content = element?.getAttribute('content');
  return content?.trim() || undefined;
}

/**
 * Helper para extrair favicon
 */
function getFavicon(document: Document, origin: string): string | undefined {
  const iconLink = document.querySelector('link[rel="icon"]') ||
                   document.querySelector('link[rel="shortcut icon"]') ||
                   document.querySelector('link[rel="apple-touch-icon"]');

  if (iconLink) {
    const href = iconLink.getAttribute('href');
    if (href) {
      return href.startsWith('http') ? href : new URL(href, origin).href;
    }
  }

  // Fallback para /favicon.ico
  return `${origin}/favicon.ico`;
}

/**
 * Limpa cache expirado
 */
export function cleanupPreviewCache(): void {
  const now = Date.now();
  for (const [key, value] of previewCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      previewCache.delete(key);
    }
  }
}

// Limpar cache periodicamente
setInterval(cleanupPreviewCache, CACHE_TTL_MS / 2);
