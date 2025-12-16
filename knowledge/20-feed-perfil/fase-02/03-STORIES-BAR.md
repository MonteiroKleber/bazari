# Feature: Stories Bar no Feed

## Objetivo

Integrar a barra de stories do BazChat no topo do feed, permitindo visualizar e criar stories sem sair do feed.

## IMPORTANTE: Dependencia

**Esta feature depende da implementacao de BazChat Stories (Fase 05).**

Antes de implementar, verificar se os seguintes componentes existem:
- `apps/web/src/components/chat/StoriesBar.tsx`
- `apps/web/src/components/chat/StoryViewer.tsx`
- `apps/web/src/components/chat/StoryCreator.tsx`
- API: `GET /stories/feed`

## Requisitos Funcionais

### Comportamento
- Barra horizontal scrollavel no topo do feed
- Mostra stories de usuarios seguidos + proprio
- Primeiro item: "Adicionar story" (proprio usuario)
- Click em avatar: Abre visualizador de stories
- Stories vistos: Borda cinza
- Stories nao vistos: Borda colorida (gradiente)

### Visual
- Avatares circulares (56px mobile, 64px desktop)
- Username truncado abaixo
- Borda gradiente para nao vistos
- Borda cinza para vistos
- Scroll horizontal com snap

## Implementacao

### 1. Reutilizar StoriesBar do BazChat

Se o componente ja existe em BazChat:

```typescript
// apps/web/src/pages/FeedPage.tsx

import { StoriesBar } from '@/components/chat/StoriesBar';

export default function FeedPage() {
  return (
    <>
      {/* Stories Bar - somente se logado */}
      {profile && (
        <div className="border-b">
          <StoriesBar />
        </div>
      )}

      <section className="...">
        <PersonalizedFeed ... />
      </section>
    </>
  );
}
```

### 2. Se Precisar Criar StoriesBar

```typescript
// apps/web/src/components/social/FeedStoriesBar.tsx

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';

interface StoryPreview {
  userId: string;
  handle: string;
  avatarUrl?: string;
  hasUnviewed: boolean;
  latestStoryId: string;
}

interface FeedStoriesBarProps {
  currentUserAvatar?: string;
  onCreateStory: () => void;
  onViewStory: (userId: string) => void;
}

export function FeedStoriesBar({
  currentUserAvatar,
  onCreateStory,
  onViewStory,
}: FeedStoriesBarProps) {
  const [stories, setStories] = useState<StoryPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories();
  }, []);

  async function loadStories() {
    try {
      const res = await apiHelpers.getStoriesFeed();
      setStories(res.items);
    } catch (e) {
      console.error('Error loading stories:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
      {/* Add Story Button */}
      <button
        onClick={onCreateStory}
        className="flex flex-col items-center gap-2 snap-start"
      >
        <div className="relative h-14 w-14 md:h-16 md:w-16">
          {currentUserAvatar ? (
            <img
              src={currentUserAvatar}
              alt="Seu story"
              className="h-full w-full rounded-full object-cover border-2 border-muted"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-muted" />
          )}
          <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Plus className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">Seu story</span>
      </button>

      {/* Stories de outros usuarios */}
      {stories.map((story) => (
        <button
          key={story.userId}
          onClick={() => onViewStory(story.userId)}
          className="flex flex-col items-center gap-2 snap-start"
        >
          <div
            className={cn(
              'h-14 w-14 md:h-16 md:w-16 rounded-full p-[2px]',
              story.hasUnviewed
                ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'
                : 'bg-muted'
            )}
          >
            <img
              src={story.avatarUrl || '/default-avatar.png'}
              alt={story.handle}
              className="h-full w-full rounded-full object-cover border-2 border-background"
            />
          </div>
          <span className="text-xs text-muted-foreground max-w-14 truncate">
            {story.handle}
          </span>
        </button>
      ))}
    </div>
  );
}
```

### 3. Integrar com Viewer

```typescript
// apps/web/src/pages/FeedPage.tsx

import { useState } from 'react';
import { FeedStoriesBar } from '@/components/social/FeedStoriesBar';
import { StoryViewer } from '@/components/chat/StoryViewer';
import { StoryCreator } from '@/components/chat/StoryCreator';

export default function FeedPage() {
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [creatingStory, setCreatingStory] = useState(false);

  return (
    <>
      {profile && (
        <FeedStoriesBar
          currentUserAvatar={profile.avatarUrl}
          onCreateStory={() => setCreatingStory(true)}
          onViewStory={(userId) => setViewingUserId(userId)}
        />
      )}

      {/* Story Viewer Modal */}
      {viewingUserId && (
        <StoryViewer
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}

      {/* Story Creator Modal */}
      {creatingStory && (
        <StoryCreator
          onClose={() => setCreatingStory(false)}
        />
      )}

      <section>
        <PersonalizedFeed ... />
      </section>
    </>
  );
}
```

## Arquivos a Criar/Modificar

### Criar (se nao existir do BazChat)
- `apps/web/src/components/social/FeedStoriesBar.tsx`

### Modificar
- `apps/web/src/pages/FeedPage.tsx` - Integrar stories bar

### Reutilizar do BazChat
- `apps/web/src/components/chat/StoriesBar.tsx`
- `apps/web/src/components/chat/StoryViewer.tsx`
- `apps/web/src/components/chat/StoryCreator.tsx`

## Consideracoes

### Performance
- Lazy load de avatares
- Cache de stories visualizados
- Pre-fetch de stories ao hover

### UX
- Stories expiram em 24h (mesmo do BazChat)
- Indicador visual claro de nao vistos
- Snap scroll para navegacao precisa

## Testes

- [ ] Barra aparece apenas para usuarios logados
- [ ] "Adicionar story" funciona
- [ ] Click em avatar abre viewer
- [ ] Borda colorida para nao vistos
- [ ] Borda cinza para vistos
- [ ] Scroll horizontal funciona
- [ ] Skeleton loading funciona
