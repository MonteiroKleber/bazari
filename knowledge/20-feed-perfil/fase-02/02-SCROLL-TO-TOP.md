# Feature: Scroll to Top FAB

## Objetivo

Adicionar botao flutuante (FAB) para voltar ao topo do feed quando usuario rolar para baixo, melhorando a navegacao em feeds longos.

## Requisitos Funcionais

### Comportamento
- Botao aparece quando scroll > 500px do topo
- Click: Scroll suave ate o topo
- Botao some quando proximo do topo (< 200px)

### Visual
- FAB circular no canto inferior direito
- Icone de seta para cima
- Semi-transparente com backdrop blur
- Animacao de entrada/saida (fade + scale)
- Acima do bottom navigation (mobile)

## Implementacao

### 1. Criar Componente ScrollToTopFAB

```typescript
// apps/web/src/components/ui/ScrollToTopFAB.tsx

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrollToTopFABProps {
  threshold?: number;
  className?: string;
}

export function ScrollToTopFAB({ threshold = 500, className }: ScrollToTopFABProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY;
      setVisible(scrollY > threshold);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className={cn(
            'fixed right-4 z-40',
            'h-12 w-12 rounded-full',
            'bg-background/80 backdrop-blur-sm',
            'border shadow-lg',
            'flex items-center justify-center',
            'hover:bg-background transition-colors',
            // Posicao: acima do bottom nav em mobile
            'bottom-20 md:bottom-8',
            className
          )}
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
```

### 2. Integrar em FeedPage

```typescript
// apps/web/src/pages/FeedPage.tsx

import { ScrollToTopFAB } from '@/components/ui/ScrollToTopFAB';

export default function FeedPage() {
  // ... codigo existente ...

  return (
    <>
      <PullToRefreshIndicator ... />
      <section className="...">
        {/* ... conteudo existente ... */}
      </section>

      <ScrollToTopFAB />
    </>
  );
}
```

### 3. Versao sem Framer Motion (Alternativa)

Se nao quiser adicionar framer-motion:

```typescript
// apps/web/src/components/ui/ScrollToTopFAB.tsx

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScrollToTopFAB({ threshold = 500, className }: ScrollToTopFABProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > threshold);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn(
        'fixed right-4 z-40',
        'h-12 w-12 rounded-full',
        'bg-background/80 backdrop-blur-sm',
        'border shadow-lg',
        'flex items-center justify-center',
        'hover:bg-background transition-all',
        'bottom-20 md:bottom-8',
        // Animacao CSS pura
        'animate-in fade-in zoom-in-95 duration-200',
        className
      )}
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/ui/ScrollToTopFAB.tsx`

### Modificar
- `apps/web/src/pages/FeedPage.tsx` - Adicionar FAB

## Consideracoes

### Performance
- Usar `{ passive: true }` no listener de scroll
- Debounce nao necessario para setVisible (operacao leve)

### Acessibilidade
- `aria-label` descritivo
- Pode ser acionado por teclado (e um button)
- Contraste adequado

### Responsividade
- Em mobile, posicionar acima do bottom navigation
- Em desktop, canto inferior direito padrao

## Testes

- [ ] FAB aparece quando scroll > 500px
- [ ] FAB some quando scroll < 200px
- [ ] Click faz scroll suave ate topo
- [ ] Posicao correta em mobile (acima bottom nav)
- [ ] Posicao correta em desktop
- [ ] Animacao de entrada/saida funciona
- [ ] Funciona em dark mode
