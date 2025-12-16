# Feature: Double-tap to Like

## Objetivo

Implementar gesto de double-tap para curtir posts, similar ao Instagram, proporcionando interacao mais intuitiva especialmente em mobile.

## Requisitos Funcionais

### Comportamento
- Double-tap em qualquer lugar do post (exceto botoes/links) = curtir
- Se ja curtido: Nenhuma acao (ou descurtir, a definir)
- Feedback visual: Coracao animado aparece no centro do post
- Animacao dura ~800ms e desaparece

### Visual
- Coracao grande (80px) no centro do post
- Cor vermelha/rosa
- Animacao: scale up + fade in, depois fade out
- Overlay semi-transparente opcional

### Mobile-First
- Touch events para mobile
- Click events para desktop (double-click)

## Implementacao

### 1. Hook useDoubleTap

```typescript
// apps/web/src/hooks/useDoubleTap.ts

import { useCallback, useRef } from 'react';

interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  delay?: number;
}

export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delay = 300,
}: UseDoubleTapOptions) {
  const lastTapRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Ignorar se clicou em elemento interativo
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]') ||
      target.closest('video') ||
      target.closest('input')
    ) {
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      // Double tap detectado
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      onDoubleTap();
    } else {
      // Possivelmente single tap
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (onSingleTap) {
        timeoutRef.current = setTimeout(() => {
          onSingleTap();
          timeoutRef.current = null;
        }, delay);
      }
    }

    lastTapRef.current = now;
  }, [onDoubleTap, onSingleTap, delay]);

  return { handleTap };
}
```

### 2. Componente HeartAnimation

```typescript
// apps/web/src/components/social/HeartAnimation.tsx

import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeartAnimationProps {
  show: boolean;
}

export function HeartAnimation({ show }: HeartAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <Heart
            className="h-20 w-20 text-red-500 fill-red-500 drop-shadow-lg"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 3. Versao CSS-only (sem Framer Motion)

```typescript
// apps/web/src/components/social/HeartAnimation.tsx

import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeartAnimationProps {
  show: boolean;
}

export function HeartAnimation({ show }: HeartAnimationProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center pointer-events-none z-10',
        'animate-in zoom-in-0 fade-in duration-200',
      )}
    >
      <Heart className="h-20 w-20 text-red-500 fill-red-500 drop-shadow-lg animate-pulse" />
    </div>
  );
}
```

### 4. Integrar em PostCard

```typescript
// apps/web/src/components/social/PostCard.tsx

import { useState, useCallback } from 'react';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { HeartAnimation } from './HeartAnimation';
import { apiHelpers } from '@/lib/api';

export function PostCard({ post, ... }: PostCardProps) {
  const [showHeart, setShowHeart] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);

  const handleDoubleTapLike = useCallback(async () => {
    if (isLiked) return; // Ja curtido, ignorar

    // Feedback visual imediato
    setShowHeart(true);
    setIsLiked(true);

    // Remover animacao apos 800ms
    setTimeout(() => setShowHeart(false), 800);

    // API call
    try {
      await apiHelpers.reactToPost(post.id, 'love');
    } catch (e) {
      // Reverter em caso de erro
      setIsLiked(false);
      console.error('Error liking post:', e);
    }
  }, [post.id, isLiked]);

  const { handleTap } = useDoubleTap({
    onDoubleTap: handleDoubleTapLike,
    // onSingleTap: () => navigate(`/app/posts/${post.id}`), // Se quiser
  });

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors relative"
      onClick={handleTap}
    >
      {/* Heart Animation Overlay */}
      <HeartAnimation show={showHeart} />

      <CardContent className="p-4">
        {/* ... conteudo existente ... */}
      </CardContent>
    </Card>
  );
}
```

### 5. Sincronizar com ReactionPicker

Importante: O estado de `isLiked` deve ser sincronizado entre double-tap e ReactionPicker:

```typescript
// Em PostCard.tsx

// Estado compartilhado
const [reactions, setReactions] = useState(post.reactions || { love: 0, ... });
const [userReaction, setUserReaction] = useState(post.userReaction);

const handleDoubleTapLike = useCallback(async () => {
  if (userReaction === 'love') return; // Ja reagiu com love

  setShowHeart(true);
  setUserReaction('love');
  setReactions(prev => ({ ...prev, love: prev.love + 1 }));

  setTimeout(() => setShowHeart(false), 800);

  try {
    await apiHelpers.reactToPost(post.id, 'love');
  } catch (e) {
    // Reverter
    setUserReaction(post.userReaction);
    setReactions(post.reactions || { love: 0, ... });
  }
}, [post.id, userReaction]);

// Passar estado para ReactionPicker
<ReactionPicker
  postId={post.id}
  initialReactions={reactions}
  userReaction={userReaction}
  onReactionChange={(newReaction, newReactions) => {
    setUserReaction(newReaction);
    setReactions(newReactions);
  }}
/>
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/hooks/useDoubleTap.ts`
- `apps/web/src/components/social/HeartAnimation.tsx`

### Modificar
- `apps/web/src/components/social/PostCard.tsx` - Integrar double-tap

## Consideracoes

### Performance
- Animacao leve, nao bloqueia interacoes
- Debounce natural via timeout

### UX
- Gesto familiar (Instagram-like)
- Feedback visual satisfatorio
- Nao interfere com outros gestos (scroll, tap em botoes)

### Acessibilidade
- Double-tap e adicional, nao substitui botao
- Usuarios podem continuar usando botao de like

## Testes

- [ ] Double-tap em area vazia do post funciona
- [ ] Double-tap em botoes/links nao aciona like
- [ ] Coracao aparece e desaparece
- [ ] Like e registrado na API
- [ ] Nao duplica likes em taps rapidos
- [ ] Funciona em mobile (touch)
- [ ] Funciona em desktop (click)
- [ ] Estado sincronizado com ReactionPicker
