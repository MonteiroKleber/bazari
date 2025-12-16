# Prompt: Implementar Swipe to Reply

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

Implementar gesto de swipe para direita para responder mensagens em dispositivos mobile.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/06-SWIPE-TO-REPLY.md`

## Ordem de Implementacao

### Etapa 1: Criar Hook useSwipeGesture

Criar `apps/web/src/hooks/useSwipeGesture.ts`:

```typescript
interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  threshold?: number; // pixels para ativar (default 80)
  maxSwipe?: number;  // maximo de pixels (default 100)
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);

  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
      setIsSwiping(true);
    },

    onTouchMove: (e: TouchEvent) => {
      if (!isSwiping) return;

      const currentX = e.touches[0].clientX;
      const delta = currentX - startXRef.current;

      // Apenas swipe para direita
      if (delta > 0) {
        setSwipeOffset(Math.min(delta, options.maxSwipe || 100));
      }
    },

    onTouchEnd: () => {
      if (swipeOffset >= (options.threshold || 80)) {
        options.onSwipeRight?.();
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    }
  };

  return { swipeOffset, handlers };
}
```

### Etapa 2: Criar SwipeableMessage Wrapper

Criar `apps/web/src/components/chat/SwipeableMessage.tsx`:

```typescript
import { Reply } from 'lucide-react';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeReply: () => void;
  disabled?: boolean;
}

export function SwipeableMessage({ children, onSwipeReply, disabled }: SwipeableMessageProps) {
  const { swipeOffset, handlers } = useSwipeGesture({
    onSwipeRight: onSwipeReply,
    threshold: 80,
  });

  const showReplyIcon = swipeOffset >= 40;
  const isActivated = swipeOffset >= 80;

  return (
    <div className="relative overflow-hidden" {...handlers}>
      {/* Reply indicator */}
      <div
        className={cn(
          'absolute left-2 top-1/2 -translate-y-1/2 transition-opacity',
          showReplyIcon ? 'opacity-100' : 'opacity-0'
        )}
      >
        <Reply className={cn(
          'h-5 w-5',
          isActivated ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>

      {/* Message content */}
      <div
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className="transition-transform duration-75"
      >
        {children}
      </div>
    </div>
  );
}
```

### Etapa 3: Integrar no MessageList

Modificar `apps/web/src/components/chat/MessageList.tsx`:

```typescript
{messages.map((message) => (
  <SwipeableMessage
    key={message.id}
    onSwipeReply={() => handleReply(message)}
    disabled={!isMobile}
  >
    <MessageBubble message={message} {...props} />
  </SwipeableMessage>
))}
```

### Etapa 4: Detectar Mobile

Criar utilitario ou usar hook existente:

```typescript
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/hooks/useSwipeGesture.ts`
- [ ] `apps/web/src/components/chat/SwipeableMessage.tsx`

### Modificar
- [ ] `apps/web/src/components/chat/MessageList.tsx`

## Cenarios de Teste

1. [ ] Swipe para direita ativa resposta
2. [ ] Icone de reply aparece durante swipe
3. [ ] Swipe parcial nao ativa (retorna)
4. [ ] Animacao suave durante gesto
5. [ ] Haptic feedback se disponivel
6. [ ] Funciona apenas em mobile

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): add swipe to reply gesture for mobile

- Create useSwipeGesture hook with touch handlers
- Create SwipeableMessage wrapper component
- Show reply icon indicator during swipe
- Integrate with MessageList on mobile devices"
```
