# Feature: New Posts Indicator

## Objetivo

Mostrar um indicador/banner quando novos posts estao disponiveis, permitindo que o usuario carregue sem perder a posicao atual.

## Requisitos Funcionais

### Comportamento
- Polling a cada 30 segundos para verificar novos posts
- Se houver novos posts:
  - Mostrar banner fixo no topo: "5 novos posts"
  - Click no banner: Carregar novos posts e scroll para topo
  - NAO fazer auto-refresh (usuario decide quando ver)
- Contador acumula enquanto nao clicado
- Badge some apos carregar

### Visual
- Banner pill flutuante acima das tabs
- Cor primaria
- Icone de seta para cima + contador
- Animacao de entrada (slide down)

## Implementacao

### 1. Backend: Endpoint de Contagem

```typescript
// apps/api/src/routes/feed.ts

// GET /feed/count?since=timestamp&tab=for-you
router.get('/count', async (req, res) => {
  const { since, tab } = req.query;
  const sinceDate = new Date(since as string);

  let count = 0;

  if (tab === 'for-you') {
    count = await prisma.post.count({
      where: {
        createdAt: { gt: sinceDate },
        // ... filtros do for-you
      },
    });
  } else if (tab === 'following') {
    // ... contar posts de seguidos
  } else if (tab === 'popular') {
    // ... contar posts populares
  }

  return res.json({ count });
});
```

### 2. Hook de Novos Posts

```typescript
// apps/web/src/hooks/useNewPostsIndicator.ts

import { useState, useEffect, useCallback } from 'react';
import { apiHelpers } from '@/lib/api';

interface UseNewPostsIndicatorOptions {
  tab: string;
  enabled?: boolean;
  pollInterval?: number;
}

export function useNewPostsIndicator({
  tab,
  enabled = true,
  pollInterval = 30000,
}: UseNewPostsIndicatorOptions) {
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());

  const checkForNewPosts = useCallback(async () => {
    if (!enabled) return;

    try {
      const res = await apiHelpers.getFeedCount({
        since: lastCheckedAt.toISOString(),
        tab,
      });
      setNewPostsCount(res.count);
    } catch (e) {
      console.error('Error checking new posts:', e);
    }
  }, [tab, lastCheckedAt, enabled]);

  useEffect(() => {
    const interval = setInterval(checkForNewPosts, pollInterval);
    return () => clearInterval(interval);
  }, [checkForNewPosts, pollInterval]);

  const clearAndRefresh = useCallback(() => {
    setNewPostsCount(0);
    setLastCheckedAt(new Date());
  }, []);

  return {
    newPostsCount,
    clearAndRefresh,
  };
}
```

### 3. Componente NewPostsBanner

```typescript
// apps/web/src/components/social/NewPostsBanner.tsx

import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewPostsBannerProps {
  count: number;
  onLoad: () => void;
}

export function NewPostsBanner({ count, onLoad }: NewPostsBannerProps) {
  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        onClick={onLoad}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-30
          bg-primary text-primary-foreground px-4 py-2 rounded-full
          shadow-lg flex items-center gap-2 text-sm font-medium
          hover:bg-primary/90 transition-colors"
      >
        <ArrowUp className="h-4 w-4" />
        {count} {count === 1 ? 'novo post' : 'novos posts'}
      </motion.button>
    </AnimatePresence>
  );
}
```

### 4. Integrar em PersonalizedFeed

```typescript
// apps/web/src/components/social/PersonalizedFeed.tsx

import { useNewPostsIndicator } from '@/hooks/useNewPostsIndicator';
import { NewPostsBanner } from './NewPostsBanner';

export function PersonalizedFeed({ ... }) {
  const { newPostsCount, clearAndRefresh } = useNewPostsIndicator({
    tab: activeTab,
    enabled: !loading,
  });

  const handleLoadNewPosts = useCallback(() => {
    clearAndRefresh();
    refresh(); // Chama refresh do hook existente
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [clearAndRefresh, refresh]);

  return (
    <div className="w-full">
      <NewPostsBanner count={newPostsCount} onLoad={handleLoadNewPosts} />

      {/* Tabs e conteudo existente */}
    </div>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/hooks/useNewPostsIndicator.ts`
- `apps/web/src/components/social/NewPostsBanner.tsx`

### Modificar
- `apps/api/src/routes/feed.ts` - Endpoint de contagem
- `apps/web/src/lib/api.ts` - Helper getFeedCount
- `apps/web/src/components/social/PersonalizedFeed.tsx` - Integrar banner

## Consideracoes

### Performance
- Polling a cada 30s e conservador o suficiente
- Endpoint leve (apenas COUNT, sem dados)
- Pausar polling quando tab nao visivel (document.hidden)

### UX
- Nao auto-refresh para nao perder posicao de leitura
- Usuario tem controle total de quando ver novos posts
- Banner discreto mas visivel

## Testes

- [ ] Banner aparece quando ha novos posts
- [ ] Contador acumula corretamente
- [ ] Click carrega posts e rola para topo
- [ ] Banner some apos carregar
- [ ] Polling funciona a cada 30s
- [ ] Nao pollar quando aba em background
