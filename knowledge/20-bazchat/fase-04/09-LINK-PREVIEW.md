# Feature: Link Preview

## Objetivo

Mostrar preview rico (titulo, descricao, imagem) de URLs compartilhados nas mensagens.

## Requisitos Funcionais

### Comportamento
- Detectar URLs em mensagens de texto
- Buscar metadados Open Graph da URL
- Exibir card de preview abaixo do texto
- Cache de previews para evitar requisicoes repetidas

### Dados do Preview
- Titulo (og:title ou <title>)
- Descricao (og:description ou meta description)
- Imagem (og:image)
- Site name (og:site_name)
- Favicon (opcional)

### Restricoes
- Maximo 1 preview por mensagem (primeiro link)
- Timeout de 5 segundos para fetch
- Fallback: mostrar apenas URL se falhar
- Nao fazer preview de URLs internas do app

## Implementacao

### 1. Backend - Endpoint de Preview

```typescript
// apps/api/src/routes/link-preview.ts

import { FastifyInstance } from 'fastify';
import { JSDOM } from 'jsdom';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// Cache em memoria (considerar Redis para producao)
const previewCache = new Map<string, LinkPreview>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

export default async function linkPreviewRoutes(app: FastifyInstance) {
  app.get('/api/link-preview', async (req, reply) => {
    const { url } = req.query as { url: string };

    if (!url) {
      return reply.code(400).send({ error: 'URL required' });
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      return reply.code(400).send({ error: 'Invalid URL' });
    }

    // Verificar cache
    const cached = previewCache.get(url);
    if (cached) {
      return cached;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BazariBot/1.0 (+https://bazari.libervia.xyz)',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return reply.code(502).send({ error: 'Failed to fetch URL' });
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      const preview: LinkPreview = {
        url,
        title: getMetaContent(doc, 'og:title') ||
               doc.querySelector('title')?.textContent || undefined,
        description: getMetaContent(doc, 'og:description') ||
                    getMetaContent(doc, 'description') || undefined,
        image: getMetaContent(doc, 'og:image') || undefined,
        siteName: getMetaContent(doc, 'og:site_name') || undefined,
        favicon: getFavicon(doc, url) || undefined,
      };

      // Cachear
      previewCache.set(url, preview);
      setTimeout(() => previewCache.delete(url), CACHE_TTL);

      return preview;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return reply.code(504).send({ error: 'Timeout' });
      }
      return reply.code(502).send({ error: 'Failed to fetch preview' });
    }
  });
}

function getMetaContent(doc: Document, property: string): string | null {
  const meta = doc.querySelector(`meta[property="${property}"]`) ||
               doc.querySelector(`meta[name="${property}"]`);
  return meta?.getAttribute('content') || null;
}

function getFavicon(doc: Document, baseUrl: string): string | null {
  const link = doc.querySelector('link[rel="icon"]') ||
               doc.querySelector('link[rel="shortcut icon"]');
  const href = link?.getAttribute('href');

  if (!href) return null;

  // Resolver URL relativa
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}
```

### 2. Frontend - Componente LinkPreview

```typescript
// apps/web/src/components/chat/LinkPreview.tsx

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

export function LinkPreview({ url, className }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/link-preview?url=${encodeURIComponent(url)}`
        );

        if (!res.ok) throw new Error('Failed');

        const data = await res.json();
        setPreview(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="h-20 bg-muted animate-pulse rounded-lg mt-2" />
    );
  }

  if (error || !preview?.title) {
    return null; // Fallback: nao mostrar preview
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block mt-2 rounded-lg border overflow-hidden',
        'hover:bg-muted/50 transition-colors',
        className
      )}
    >
      <div className="flex">
        {/* Imagem (se houver) */}
        {preview.image && (
          <div className="w-24 h-24 flex-shrink-0">
            <img
              src={preview.image}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Conteudo */}
        <div className="flex-1 p-3 min-w-0">
          {preview.siteName && (
            <p className="text-xs text-muted-foreground mb-1">
              {preview.siteName}
            </p>
          )}
          <h4 className="text-sm font-medium line-clamp-2">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {preview.description}
            </p>
          )}
        </div>

        {/* Icone de link externo */}
        <div className="p-3 flex items-start">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </a>
  );
}
```

### 3. Detectar URLs e Integrar

```typescript
// apps/web/src/components/chat/FormattedText.tsx

import { LinkPreview } from './LinkPreview';

// Regex para detectar URLs
const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

export function FormattedText({ text, isOwn }: FormattedTextProps) {
  // Extrair primeira URL
  const urls = text.match(URL_REGEX);
  const firstUrl = urls?.[0];

  // Filtrar URLs internas
  const shouldShowPreview =
    firstUrl &&
    !firstUrl.includes('bazari.libervia.xyz/app');

  return (
    <div>
      {/* Texto formatado existente */}
      <span>{formatText(text)}</span>

      {/* Link Preview */}
      {shouldShowPreview && (
        <LinkPreview url={firstUrl} />
      )}
    </div>
  );
}
```

## Dependencias

```bash
# Backend - para parsear HTML
pnpm add --filter @bazari/api jsdom
pnpm add --filter @bazari/api -D @types/jsdom
```

## Arquivos a Criar/Modificar

### Criar
- `apps/api/src/routes/link-preview.ts` - Endpoint de preview
- `apps/web/src/components/chat/LinkPreview.tsx` - Componente visual

### Modificar
- `apps/api/src/server.ts` - Registrar rota
- `apps/web/src/components/chat/FormattedText.tsx` - Integrar preview

## Consideracoes

### Seguranca
- Validar URL antes de fazer fetch
- Nao seguir redirects infinitos
- Timeout para evitar DoS
- Sanitizar HTML parseado

### Performance
- Cache de previews (24h)
- Lazy loading do preview
- Nao fazer preview de URLs repetidas na mesma conversa

## Testes

- [ ] Preview carrega para URL valida
- [ ] Titulo e descricao aparecem
- [ ] Imagem aparece quando disponivel
- [ ] Click abre URL em nova aba
- [ ] Timeout funciona (URL lenta)
- [ ] Fallback para URL sem metadados
- [ ] Cache funciona
