# Feature: Tab de Midia no Perfil

## Objetivo

Adicionar uma nova tab "Midia" que exibe apenas posts com imagens e videos em formato de grid, facilitando a descoberta de conteudo visual.

## Requisitos Funcionais

### Comportamento
- Nova tab entre "Posts" e "Reputacao"
- Grid de thumbnails (3 colunas mobile, 4 desktop)
- Click no thumbnail abre o post completo (navegacao ou lightbox)
- Infinite scroll para carregar mais

### Conteudo
- Posts com `media.length > 0`
- Videos mostram thumbnail com icone de play
- Imagens mostram primeira imagem do post

### Visual
- Grid responsivo
- Aspect ratio 1:1 (quadrado) nos thumbnails
- Icone de video overlay para videos
- Contador de multiplas imagens (badge "1/4")

## Implementacao

### 1. Backend: Endpoint de Posts com Midia

```typescript
// apps/api/src/routes/posts.ts

// GET /profiles/:handle/media
router.get('/:handle/media', async (req, res) => {
  const { handle } = req.params;
  const { cursor, limit = 24 } = req.query;

  const profile = await prisma.profile.findUnique({
    where: { handle },
    select: { id: true },
  });

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: profile.id,
      media: { not: Prisma.DbNull }, // Has media
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit as string) + 1,
    ...(cursor && {
      cursor: { id: cursor as string },
      skip: 1,
    }),
    select: {
      id: true,
      media: true,
      createdAt: true,
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, -1) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return res.json({ items, nextCursor });
});
```

### 2. Frontend: Helper API

```typescript
// apps/web/src/lib/api.ts

// Adicionar ao apiHelpers:
getProfileMedia: async (handle: string, params?: { cursor?: string }) => {
  const query = new URLSearchParams();
  if (params?.cursor) query.set('cursor', params.cursor);

  const res = await fetchWithAuth(`/profiles/${handle}/media?${query}`);
  return res.json();
},
```

### 3. Componente MediaGrid

```typescript
// apps/web/src/components/profile/MediaGrid.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Image as ImageIcon, Loader2 } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  media: Array<{ url: string; type: string; thumbnailUrl?: string }>;
}

interface MediaGridProps {
  handle: string;
}

export function MediaGrid({ handle }: MediaGridProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    loadMedia();
  }, [handle]);

  async function loadMedia(cursor?: string) {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await apiHelpers.getProfileMedia(handle, cursor ? { cursor } : undefined);
      setItems((prev) => cursor ? [...prev, ...res.items] : res.items);
      setNextCursor(res.nextCursor);
    } catch (e) {
      console.error('Error loading media:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma midia publicada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
        {items.map((item) => {
          const firstMedia = item.media[0];
          const isVideo = firstMedia?.type === 'video';
          const thumbnailUrl = firstMedia?.thumbnailUrl || firstMedia?.url;
          const mediaCount = item.media.length;

          return (
            <Link
              key={item.id}
              to={`/app/posts/${item.id}`}
              className="relative aspect-square group overflow-hidden bg-muted"
            >
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />

              {/* Video overlay */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
              )}

              {/* Multiple media badge */}
              {mediaCount > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  1/{mediaCount}
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            onClick={() => loadMedia(nextCursor)}
            disabled={loadingMore}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Carregar mais'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 4. Integrar em ProfilePublicPage

```typescript
// apps/web/src/pages/ProfilePublicPage.tsx

import { MediaGrid } from '@/components/profile/MediaGrid';

// Adicionar 'media' ao tipo de tab:
const [tab, setTab] = useState<'posts' | 'media' | 'reputation' | 'store' | 'followers' | 'following'>('posts');

// No JSX das tabs:
{(['posts', 'media', 'reputation', 'store', 'followers', 'following'] as const).map((tabKey) => (
  <button
    key={tabKey}
    className={cn(...)}
    onClick={() => setTab(tabKey)}
  >
    {tabKey === 'posts' && t('profile.posts', { defaultValue: 'Posts' })}
    {tabKey === 'media' && t('profile.media', { defaultValue: 'Midia' })}
    {tabKey === 'reputation' && t('profile.reputation', { defaultValue: 'Reputacao' })}
    // ... outras tabs
  </button>
))}

// Conteudo da tab:
{tab === 'media' && (
  <MediaGrid handle={handle} />
)}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/profile/MediaGrid.tsx`

### Modificar
- `apps/api/src/routes/posts.ts` ou `profiles.ts` - Endpoint de midia
- `apps/web/src/pages/ProfilePublicPage.tsx` - Nova tab
- `apps/web/src/lib/api.ts` - Helper getProfileMedia

## Consideracoes

### Performance
- Lazy loading de imagens
- Thumbnails otimizados (menor resolucao)
- Paginacao com 24 itens por pagina

### Futuro
- Lightbox para navegacao sem sair da pagina
- Filtro por tipo (so imagens, so videos)

## Testes

- [ ] Grid renderiza corretamente em mobile (3 colunas)
- [ ] Grid renderiza corretamente em desktop (4 colunas)
- [ ] Videos mostram icone de play
- [ ] Posts com multiplas imagens mostram badge
- [ ] Infinite scroll funciona
- [ ] Estado vazio exibe mensagem
- [ ] Loading mostra skeletons
