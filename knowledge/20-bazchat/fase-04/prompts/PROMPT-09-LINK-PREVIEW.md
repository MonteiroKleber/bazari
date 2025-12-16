# Prompt: Implementar Link Preview

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Implementar preview de links com metadados Open Graph (titulo, descricao, imagem).

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/09-LINK-PREVIEW.md`

## Ordem de Implementacao

### Etapa 1: Backend - Endpoint de Preview

Criar `apps/api/src/routes/link-preview.ts`:

```typescript
import { JSDOM } from 'jsdom';

interface LinkPreviewData {
  url: string;
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

router.get('/api/link-preview', async (req, res) => {
  const { url } = req.query;

  // Validar URL
  try {
    new URL(url as string);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Fetch com timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url as string, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BazariBot/1.0' }
    });
    clearTimeout(timeout);

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extrair OG tags
    const getMeta = (property: string) =>
      doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ||
      doc.querySelector(`meta[name="${property}"]`)?.getAttribute('content');

    const preview: LinkPreviewData = {
      url: url as string,
      title: getMeta('og:title') || doc.querySelector('title')?.textContent || '',
      description: getMeta('og:description') || getMeta('description') || '',
      image: getMeta('og:image'),
      siteName: getMeta('og:site_name'),
      favicon: new URL('/favicon.ico', url as string).toString()
    };

    // Cache por 1 hora
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(preview);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
});
```

### Etapa 2: Criar Componente LinkPreviewCard

Criar `apps/web/src/components/chat/LinkPreviewCard.tsx`:

```typescript
interface LinkPreviewCardProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  isOwn?: boolean;
}

export function LinkPreviewCard({
  url,
  title,
  description,
  image,
  siteName,
  isOwn
}: LinkPreviewCardProps) {
  const hostname = new URL(url).hostname;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block rounded-lg overflow-hidden border mt-2',
        'hover:bg-muted/50 transition-colors',
        isOwn ? 'border-primary-foreground/20' : 'border-border'
      )}
    >
      {image && (
        <div className="aspect-video relative overflow-hidden bg-muted">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-3">
        <p className={cn(
          'text-xs mb-1',
          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
        )}>
          {siteName || hostname}
        </p>
        <p className={cn(
          'font-medium line-clamp-2',
          isOwn ? 'text-primary-foreground' : 'text-foreground'
        )}>
          {title}
        </p>
        {description && (
          <p className={cn(
            'text-sm mt-1 line-clamp-2',
            isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}>
            {description}
          </p>
        )}
      </div>
    </a>
  );
}
```

### Etapa 3: Hook para Fetch de Preview

Criar `apps/web/src/hooks/useLinkPreview.ts`:

```typescript
const previewCache = new Map<string, LinkPreviewData>();

export function useLinkPreview(url: string | null) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    // Check cache
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url)!);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        previewCache.set(url, data);
        setPreview(data);
      } catch (err) {
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  return { preview, loading, error };
}
```

### Etapa 4: Detectar URLs no Texto

Criar utilitario `apps/web/src/lib/utils/url-detector.ts`:

```typescript
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

export function getFirstUrl(text: string): string | null {
  const urls = extractUrls(text);
  return urls.length > 0 ? urls[0] : null;
}
```

### Etapa 5: Integrar no MessageBubble

Modificar `apps/web/src/components/chat/MessageBubble.tsx`:

```typescript
const firstUrl = getFirstUrl(plaintext);
const { preview } = useLinkPreview(firstUrl);

// Renderizar
{preview && (
  <LinkPreviewCard
    {...preview}
    isOwn={isMe}
  />
)}
```

## Arquivos a Criar/Modificar

### Backend
- [ ] `apps/api/src/routes/link-preview.ts` (novo)
- [ ] `apps/api/src/server.ts` (registrar rota)

### Frontend
- [ ] `apps/web/src/components/chat/LinkPreviewCard.tsx` (novo)
- [ ] `apps/web/src/hooks/useLinkPreview.ts` (novo)
- [ ] `apps/web/src/lib/utils/url-detector.ts` (novo)
- [ ] `apps/web/src/components/chat/MessageBubble.tsx`

## Cenarios de Teste

1. [ ] Preview carrega para URLs validas
2. [ ] Imagem OG exibida quando disponivel
3. [ ] Fallback para title tag se sem OG
4. [ ] Cache funciona (nao refetch)
5. [ ] Clique abre link em nova aba
6. [ ] URLs invalidas nao quebram
7. [ ] Timeout de 5s para fetch lento

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement link preview cards

- Add /api/link-preview endpoint with OG meta extraction
- Create LinkPreviewCard component
- Add useLinkPreview hook with caching
- Auto-detect URLs in message text
- Show preview card below message"
```
