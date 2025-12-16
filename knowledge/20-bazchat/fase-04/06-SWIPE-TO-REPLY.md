# Feature: Swipe to Reply

## Objetivo

Permitir que o usuario arraste uma mensagem para a direita para responde-la rapidamente (gesto padrao em apps de mensagem mobile).

## Requisitos Funcionais

### Comportamento
- Swipe da esquerda para direita em qualquer mensagem
- Threshold minimo: 80px de arraste
- Feedback visual durante arraste:
  - Mensagem se move junto com o dedo
  - Icone de reply aparece atras da mensagem
  - Haptic feedback ao atingir threshold (se disponivel)
- Ao soltar apos threshold: ativa modo reply
- Ao soltar antes do threshold: volta ao lugar
- Funciona em mensagens proprias e de outros

### Visual
- Icone de reply (seta curva) aparece do lado esquerdo
- Opacidade do icone aumenta conforme arraste
- Mensagem tem elasticidade (spring animation)
- Nao funciona se ja estiver scrollando verticalmente

## Implementacao

### 1. Hook useSwipeToReply

```typescript
// apps/web/src/hooks/useSwipeToReply.ts

import { useRef, useState, useCallback } from 'react';

interface UseSwipeToReplyOptions {
  onReply: () => void;
  threshold?: number;
  disabled?: boolean;
}

interface UseSwipeToReplyReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  transform: string;
  showReplyIcon: boolean;
  replyIconOpacity: number;
}

export function useSwipeToReply({
  onReply,
  threshold = 80,
  disabled = false,
}: UseSwipeToReplyOptions): UseSwipeToReplyReturn {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const isVerticalScroll = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isDragging.current = false;
    isVerticalScroll.current = false;
  }, [disabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isVerticalScroll.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    // Detectar scroll vertical vs horizontal
    if (!isDragging.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        isVerticalScroll.current = true;
        return;
      }
      if (Math.abs(deltaX) > 10) {
        isDragging.current = true;
      }
    }

    if (isDragging.current && deltaX > 0) {
      // Limitar o arraste maximo e adicionar resistencia
      const maxOffset = threshold * 1.5;
      const resistance = deltaX > threshold ? 0.3 : 1;
      const newOffset = Math.min(deltaX * resistance, maxOffset);

      setOffsetX(newOffset);

      // Haptic feedback ao atingir threshold
      if (deltaX >= threshold && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  }, [disabled, threshold]);

  const onTouchEnd = useCallback(() => {
    if (disabled) return;

    if (offsetX >= threshold) {
      onReply();
    }

    // Animar volta
    setOffsetX(0);
    isDragging.current = false;
  }, [disabled, offsetX, threshold, onReply]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    transform: `translateX(${offsetX}px)`,
    showReplyIcon: offsetX > 10,
    replyIconOpacity: Math.min(offsetX / threshold, 1),
  };
}
```

### 2. Componente SwipeableMessage

```typescript
// apps/web/src/components/chat/SwipeableMessage.tsx

import { Reply } from 'lucide-react';
import { useSwipeToReply } from '@/hooks/useSwipeToReply';
import { cn } from '@/lib/utils';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply: () => void;
  disabled?: boolean;
  className?: string;
}

export function SwipeableMessage({
  children,
  onReply,
  disabled = false,
  className,
}: SwipeableMessageProps) {
  const { handlers, transform, showReplyIcon, replyIconOpacity } =
    useSwipeToReply({
      onReply,
      threshold: 80,
      disabled,
    });

  return (
    <div className={cn('relative', className)}>
      {/* Icone de reply (atras da mensagem) */}
      <div
        className={cn(
          'absolute left-2 top-1/2 -translate-y-1/2',
          'flex items-center justify-center',
          'w-8 h-8 rounded-full bg-primary/10',
          'transition-opacity',
          showReplyIcon ? 'opacity-100' : 'opacity-0'
        )}
        style={{ opacity: replyIconOpacity }}
      >
        <Reply className="h-4 w-4 text-primary" />
      </div>

      {/* Mensagem com swipe */}
      <div
        {...handlers}
        style={{
          transform,
          transition: transform === 'translateX(0px)' ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

### 3. Integrar no MessageList

```typescript
// apps/web/src/components/chat/MessageList.tsx

import { SwipeableMessage } from './SwipeableMessage';

// Dentro do render:
{messages.map((message) => (
  <SwipeableMessage
    key={message.id}
    onReply={() => onReplyToMessage?.(message)}
    disabled={!onReplyToMessage}
  >
    <MessageBubble
      message={message}
      onReply={() => onReplyToMessage?.(message)}
      // ... outras props
    />
  </SwipeableMessage>
))}
```

### 4. Fallback para Desktop

O swipe so funciona em touch devices. Para desktop, manter o context menu com opcao "Responder".

```typescript
// Detectar se e touch device
const isTouchDevice = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

// No SwipeableMessage:
if (!isTouchDevice()) {
  return <>{children}</>;
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/hooks/useSwipeToReply.ts` - Hook de swipe
- `apps/web/src/components/chat/SwipeableMessage.tsx` - Wrapper com swipe

### Modificar
- `apps/web/src/components/chat/MessageList.tsx` - Usar SwipeableMessage

## Consideracoes

### Performance
- Usar `transform` ao inves de `left` para animacoes (GPU accelerated)
- Nao re-renderizar componentes desnecessariamente
- Debounce do haptic feedback

### Conflito com Scroll
- Detectar direcao inicial do gesto
- Se vertical, nao interceptar (deixar scrollar)
- Se horizontal, prevenir scroll e fazer swipe

## Testes

- [ ] Swipe para direita ativa reply
- [ ] Swipe para esquerda nao faz nada
- [ ] Scroll vertical continua funcionando
- [ ] Icone de reply aparece durante swipe
- [ ] Haptic feedback no mobile
- [ ] Funciona em mensagens proprias e de outros
- [ ] Desktop usa context menu (fallback)
