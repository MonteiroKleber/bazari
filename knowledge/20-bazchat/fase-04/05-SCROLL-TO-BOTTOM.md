# Feature: Scroll to Bottom FAB

## Objetivo

Adicionar um botao flutuante (FAB) que aparece quando o usuario scrolla para cima, permitindo voltar rapidamente ao fim da conversa. O botao tambem mostra um badge com contagem de novas mensagens.

## Requisitos Funcionais

### Comportamento
- FAB aparece quando scroll esta longe do bottom (> 200px)
- FAB desaparece quando proximo do bottom
- Badge aparece no FAB mostrando quantidade de novas mensagens desde o scroll
- Click no FAB: scroll suave ate o bottom
- Badge reseta quando usuario chega no bottom

### Visual
- Botao circular flutuante
- Posicao: canto inferior direito da lista de mensagens
- Icone: seta para baixo (ChevronDown)
- Badge vermelho com contador
- Animacao de entrada/saida

## Implementacao

### 1. Componente ScrollToBottomFab

```typescript
// apps/web/src/components/chat/ScrollToBottomFab.tsx

import { useState, useEffect, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToBottomFabProps {
  containerRef: React.RefObject<HTMLElement>;
  newMessageCount?: number;
  onScrollToBottom: () => void;
  className?: string;
}

export function ScrollToBottomFab({
  containerRef,
  newMessageCount = 0,
  onScrollToBottom,
  className,
}: ScrollToBottomFabProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Mostrar FAB se mais de 200px do bottom
      setIsVisible(distanceFromBottom > 200);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Check inicial

    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  if (!isVisible) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        'absolute bottom-20 right-4 z-10',
        'h-10 w-10 rounded-full shadow-lg',
        'animate-in slide-in-from-bottom-2 duration-200',
        className
      )}
      onClick={onScrollToBottom}
    >
      <ChevronDown className="h-5 w-5" />

      {/* Badge de novas mensagens */}
      {newMessageCount > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
            'flex items-center justify-center',
            'text-[10px] font-bold text-white',
            'bg-primary rounded-full'
          )}
        >
          {newMessageCount > 99 ? '99+' : newMessageCount}
        </span>
      )}
    </Button>
  );
}
```

### 2. Estado de Novas Mensagens

```typescript
// apps/web/src/pages/chat/ChatThreadPage.tsx

const [newMessageCount, setNewMessageCount] = useState(0);
const isNearBottom = useRef(true);
const messagesContainerRef = useRef<HTMLDivElement>(null);

// Monitorar scroll
useEffect(() => {
  const container = messagesContainerRef.current;
  if (!container) return;

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isNearBottom.current = distanceFromBottom < 100;

    // Resetar contador quando chegar no bottom
    if (isNearBottom.current) {
      setNewMessageCount(0);
    }
  };

  container.addEventListener('scroll', handleScroll);
  return () => container.removeEventListener('scroll', handleScroll);
}, []);

// Incrementar contador quando receber mensagem e nao estiver no bottom
useEffect(() => {
  // Este effect deve rodar quando novas mensagens chegarem
  // Se usuario nao esta no bottom, incrementar contador
  if (!isNearBottom.current) {
    setNewMessageCount((prev) => prev + 1);
  }
}, [threadMessages.length]); // Depende do tamanho da lista
```

### 3. Funcao de Scroll

```typescript
const scrollToBottom = useCallback(() => {
  const container = messagesContainerRef.current;
  if (!container) return;

  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'smooth',
  });

  setNewMessageCount(0);
}, []);
```

### 4. Integrar no ChatThreadPage

```typescript
// apps/web/src/pages/chat/ChatThreadPage.tsx

<div className="relative flex-1 overflow-hidden">
  <div
    ref={messagesContainerRef}
    className="h-full overflow-y-auto"
  >
    <MessageList messages={threadMessages} ... />
  </div>

  <ScrollToBottomFab
    containerRef={messagesContainerRef}
    newMessageCount={newMessageCount}
    onScrollToBottom={scrollToBottom}
  />
</div>
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/chat/ScrollToBottomFab.tsx` - Componente FAB

### Modificar
- `apps/web/src/pages/chat/ChatThreadPage.tsx` - Integrar FAB e estado

## Testes

- [ ] FAB aparece ao scrollar para cima
- [ ] FAB desaparece ao chegar no bottom
- [ ] Click no FAB faz scroll suave
- [ ] Badge mostra contagem de novas mensagens
- [ ] Badge incrementa com cada nova mensagem
- [ ] Badge reseta ao chegar no bottom
- [ ] Funciona em mobile (touch scroll)
