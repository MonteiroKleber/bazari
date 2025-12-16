# Prompt: Implementar Scroll to Bottom FAB

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

Implementar botao flutuante (FAB) para scroll ao final com badge de novas mensagens.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/05-SCROLL-TO-BOTTOM.md`

## Ordem de Implementacao

### Etapa 1: Criar Componente ScrollToBottomFAB

Criar `apps/web/src/components/chat/ScrollToBottomFAB.tsx`:

```typescript
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { BadgeCounter } from '../ui/badge-counter';
import { cn } from '@/lib/utils';

interface ScrollToBottomFABProps {
  visible: boolean;
  newMessageCount: number;
  onClick: () => void;
}

export function ScrollToBottomFAB({ visible, newMessageCount, onClick }: ScrollToBottomFABProps) {
  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        'fixed bottom-24 right-4 rounded-full shadow-lg z-10',
        'transition-all duration-200',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
      onClick={onClick}
    >
      <ChevronDown className="h-5 w-5" />
      <BadgeCounter count={newMessageCount} className="-top-2 -right-2" />
    </Button>
  );
}
```

### Etapa 2: Hook de Scroll Position

Criar `apps/web/src/hooks/useScrollPosition.ts`:

```typescript
export function useScrollPosition(containerRef: RefObject<HTMLElement>) {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [distanceFromBottom, setDistanceFromBottom] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distance = scrollHeight - scrollTop - clientHeight;

      setDistanceFromBottom(distance);
      setIsNearBottom(distance < 100); // 100px threshold
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  return { isNearBottom, distanceFromBottom };
}
```

### Etapa 3: Integrar no MessageList

Modificar `apps/web/src/components/chat/MessageList.tsx`:

```typescript
const containerRef = useRef<HTMLDivElement>(null);
const { isNearBottom } = useScrollPosition(containerRef);
const [newMessageCount, setNewMessageCount] = useState(0);

// Resetar contador ao scrollar para baixo
useEffect(() => {
  if (isNearBottom) {
    setNewMessageCount(0);
  }
}, [isNearBottom]);

// Incrementar quando receber mensagem e nao estiver no final
useEffect(() => {
  if (!isNearBottom && newMessage) {
    setNewMessageCount(prev => prev + 1);
  }
}, [newMessage, isNearBottom]);

const scrollToBottom = () => {
  containerRef.current?.scrollTo({
    top: containerRef.current.scrollHeight,
    behavior: 'smooth'
  });
};

return (
  <div ref={containerRef} className="...">
    {/* messages */}
    <ScrollToBottomFAB
      visible={!isNearBottom}
      newMessageCount={newMessageCount}
      onClick={scrollToBottom}
    />
  </div>
);
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/chat/ScrollToBottomFAB.tsx`
- [ ] `apps/web/src/hooks/useScrollPosition.ts`

### Modificar
- [ ] `apps/web/src/components/chat/MessageList.tsx`

## Cenarios de Teste

1. [ ] FAB aparece ao scrollar para cima
2. [ ] FAB desaparece quando perto do final
3. [ ] Badge mostra contagem de novas mensagens
4. [ ] Clicar no FAB faz scroll suave
5. [ ] Badge reseta ao chegar no final
6. [ ] Animacao de entrada/saida suave

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): add scroll to bottom FAB with new message badge

- Create ScrollToBottomFAB component
- Add useScrollPosition hook
- Show badge with count of unread messages
- Smooth scroll animation on click"
```
