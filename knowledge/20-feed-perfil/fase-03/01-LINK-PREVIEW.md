# Feature: Link Preview nos Posts

## Objetivo

Extrair e exibir preview de URLs presentes no conteudo dos posts, similar ao Twitter/Facebook, mostrando titulo, descricao e imagem.

## Requisitos Funcionais

### Comportamento
- Detectar URLs no conteudo do post
- Buscar metadados (Open Graph, Twitter Cards)
- Exibir card de preview abaixo do conteudo
- Apenas primeira URL valida gera preview
- Links para midia (imagens, videos) nao geram preview (ja exibidos como midia)

### Conteudo do Preview
- Imagem: og:image ou twitter:image
- Titulo: og:title ou title
- Descricao: og:description ou meta description (truncado 150 chars)
- Dominio: hostname do link
- Link clicavel abre em nova aba

### Visual
- Card com borda arredondada
- Imagem a esquerda (aspect 1:1 ou 16:9)
- Texto a direita
- Hover: highlight sutil
- Mobile: imagem em cima, texto embaixo

## Implementacao

### 1. Backend: API de Metadados

```typescript
// apps/api/src/routes/link-preview.ts

import { unfurl } from 'unfurl.js';
// Alternativa: usar cheerio + fetch manual

router.get('/link-preview', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    // Validar URL
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol' });
    }

    // Buscar metadados
    const metadata = await unfurl(url, {
      timeout: 5000,
      follow: 3,
    });

    return res.json({
      url,
      title: metadata.title || metadata.open_graph?.title || null,
      description: metadata.description || metadata.open_graph?.description || null,
      image: metadata.open_graph?.images?.[0]?.url || metadata.twitter_card?.images?.[0]?.url || null,
      siteName: metadata.open_graph?.site_name || parsed.hostname,
      favicon: metadata.favicon || null,
    });
  } catch (e) {
    console.error('Error fetching link preview:', e);
    return res.status(500).json({ error: 'Failed to fetch preview' });
  }
});
```

### 2. Cache de Previews

```typescript
// Usar Redis ou cache em memoria para evitar requests repetidos
const previewCache = new Map<string, LinkPreviewData>();

// TTL de 1 hora
const CACHE_TTL = 60 * 60 * 1000;
```

### 3. Componente LinkPreviewCard

```typescript
// apps/web/src/components/social/LinkPreviewCard.tsx

import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LinkPreviewCardProps {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
}

export function LinkPreviewCard({
  url,
  title,
  description,
  image,
  siteName,
}: LinkPreviewCardProps) {
  const hostname = new URL(url).hostname;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-3"
    >
      <Card className="overflow-hidden hover:bg-muted/50 transition-colors">
        <div className="flex flex-col sm:flex-row">
          {image && (
            <div className="sm:w-32 sm:h-32 flex-shrink-0">
              <img
                src={image}
                alt=""
                className="w-full h-40 sm:h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="p-3 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{siteName || hostname}</span>
            </div>

            {title && (
              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                {title}
              </h4>
            )}

            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
      </Card>
    </a>
  );
}
```

### 4. Hook useLinkPreview

```typescript
// apps/web/src/hooks/useLinkPreview.ts

import { useState, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';

interface LinkPreviewData {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
}

// Regex para detectar URLs
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// URLs de midia para ignorar
const MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];

export function useLinkPreview(content: string) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urls = content.match(URL_REGEX) || [];

    // Filtrar URLs de midia
    const validUrls = urls.filter((url) => {
      const lower = url.toLowerCase();
      return !MEDIA_EXTENSIONS.some((ext) => lower.includes(ext));
    });

    if (validUrls.length === 0) {
      setPreview(null);
      return;
    }

    const firstUrl = validUrls[0];

    setLoading(true);
    apiHelpers
      .getLinkPreview(firstUrl)
      .then((data) => setPreview(data))
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [content]);

  return { preview, loading };
}
```

### 5. Integrar em PostCard

```typescript
// apps/web/src/components/social/PostCard.tsx

import { useLinkPreview } from '@/hooks/useLinkPreview';
import { LinkPreviewCard } from './LinkPreviewCard';

export function PostCard({ post, ... }) {
  const { preview } = useLinkPreview(post.content);

  return (
    <Card ...>
      <CardContent>
        {/* ... header, conteudo, midia ... */}

        {/* Link Preview */}
        {preview && !post.media?.length && (
          <LinkPreviewCard
            url={preview.url}
            title={preview.title}
            description={preview.description}
            image={preview.image}
            siteName={preview.siteName}
          />
        )}

        {/* ... actions ... */}
      </CardContent>
    </Card>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/api/src/routes/link-preview.ts`
- `apps/web/src/components/social/LinkPreviewCard.tsx`
- `apps/web/src/hooks/useLinkPreview.ts`

### Modificar
- `apps/api/src/server.ts` - Registrar rota
- `apps/web/src/lib/api.ts` - Helper getLinkPreview
- `apps/web/src/components/social/PostCard.tsx` - Integrar preview

## Consideracoes

### Seguranca
- Validar URLs (apenas http/https)
- Timeout em requests externos
- Sanitizar dados retornados

### Performance
- Cache de previews (1 hora)
- Lazy loading de imagens
- Nao bloquear render do post

### Limitacoes
- Alguns sites bloqueiam scraping
- Previews podem ficar desatualizados

## Testes

- [ ] URL detectada no conteudo
- [ ] Preview carrega corretamente
- [ ] URLs de midia ignoradas
- [ ] Apenas primeira URL gera preview
- [ ] Preview nao aparece se post tem midia
- [ ] Link abre em nova aba
- [ ] Fallback para URLs sem metadados
- [ ] Cache funciona
