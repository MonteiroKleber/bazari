# Feature: Image Lightbox

## Objetivo

Ao clicar em uma imagem do post, abrir em visualizacao fullscreen com zoom e navegacao entre multiplas imagens.

## Requisitos Funcionais

### Comportamento
- Click em imagem: Abre lightbox fullscreen
- Setas ou swipe: Navegar entre imagens (se multiplas)
- Pinch-to-zoom: Zoom em mobile
- Click fora ou X: Fechar
- ESC: Fechar
- Fundo escurecido com blur

### Visual
- Overlay escuro (bg-black/90)
- Imagem centralizada
- Botao X no canto superior direito
- Setas de navegacao nas laterais
- Contador: "1 / 4"
- Transicoes suaves

### Gestos (Mobile)
- Swipe horizontal: Proxima/anterior
- Swipe vertical: Fechar
- Pinch: Zoom
- Double-tap: Zoom toggle

## Implementacao

### 1. Componente ImageLightbox

```typescript
// apps/web/src/components/ui/ImageLightbox.tsx

import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  images: Array<{ url: string; alt?: string }>;
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const hasMultiple = images.length > 1;
  const currentImage = images[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoomed(false);
    }
  }, [currentIndex, images.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoomed(false);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {/* Counter */}
        {hasMultiple && (
          <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Navigation buttons */}
        {hasMultiple && currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>
        )}

        {hasMultiple && currentIndex < images.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Proximo"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>
        )}

        {/* Image */}
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          src={currentImage.url}
          alt={currentImage.alt || ''}
          className={cn(
            'relative z-10 max-h-[90vh] max-w-[90vw] object-contain',
            zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          )}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(!zoomed);
          }}
          style={{
            transform: zoomed ? 'scale(1.5)' : 'scale(1)',
            transition: 'transform 0.3s ease',
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
```

### 2. Versao com Swipe (Mobile)

```typescript
// Adicionar ao ImageLightbox usando react-swipeable ou gestos manuais

import { useSwipeable } from 'react-swipeable';

// Dentro do componente:
const swipeHandlers = useSwipeable({
  onSwipedLeft: goNext,
  onSwipedRight: goPrev,
  onSwipedDown: onClose,
  preventScrollOnSwipe: true,
  trackMouse: false, // Apenas touch
});

// Aplicar no container da imagem:
<div {...swipeHandlers} className="relative z-10">
  <img ... />
</div>
```

### 3. Hook useLightbox

```typescript
// apps/web/src/hooks/useLightbox.ts

import { useState, useCallback } from 'react';

interface UseLightboxReturn {
  isOpen: boolean;
  currentIndex: number;
  open: (index?: number) => void;
  close: () => void;
}

export function useLightbox(): UseLightboxReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((index = 0) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, currentIndex, open, close };
}
```

### 4. Integrar em PostCard

```typescript
// apps/web/src/components/social/PostCard.tsx

import { useLightbox } from '@/hooks/useLightbox';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

export function PostCard({ post, ... }) {
  const lightbox = useLightbox();

  const imageMedia = post.media?.filter(m => m.type !== 'video') || [];

  return (
    <Card ...>
      <CardContent>
        {/* ... conteudo ... */}

        {/* Media Grid */}
        {post.media && post.media.length > 0 && (
          <div className={`grid gap-2 mb-3 ${...}`}>
            {post.media.map((item, index) => (
              item.type === 'video' ? (
                <video key={index} ... />
              ) : (
                <img
                  key={index}
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-auto rounded-md object-cover cursor-pointer"
                  loading="lazy"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Encontrar indice apenas entre imagens
                    const imageIndex = imageMedia.findIndex(m => m.url === item.url);
                    lightbox.open(imageIndex);
                  }}
                />
              )
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightbox.isOpen && imageMedia.length > 0 && (
          <ImageLightbox
            images={imageMedia.map(m => ({ url: m.url }))}
            initialIndex={lightbox.currentIndex}
            onClose={lightbox.close}
          />
        )}

        {/* ... actions ... */}
      </CardContent>
    </Card>
  );
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/ui/ImageLightbox.tsx`
- `apps/web/src/hooks/useLightbox.ts`

### Modificar
- `apps/web/src/components/social/PostCard.tsx` - Integrar lightbox

### Dependencias (opcional)
- `pnpm add react-swipeable` para gestos de swipe

## Consideracoes

### Performance
- Lazy loading de imagens no lightbox
- Pre-load de imagem adjacente

### Acessibilidade
- Navegacao por teclado (setas, ESC)
- Focus trap no lightbox
- aria-labels nos botoes

### Mobile
- Gestos de swipe
- Prevenir scroll do body

## Testes

- [ ] Click em imagem abre lightbox
- [ ] X fecha lightbox
- [ ] ESC fecha lightbox
- [ ] Setas navegam entre imagens
- [ ] Swipe navega em mobile
- [ ] Zoom funciona
- [ ] Contador mostra posicao
- [ ] Videos nao abrem lightbox
