# Feature: Image Lightbox

## Objetivo

Permitir visualizacao de imagens em tela cheia com suporte a zoom e navegacao.

## Requisitos Funcionais

### Comportamento
- Click em imagem abre lightbox
- Imagem em tela cheia com fundo escuro
- Suporte a:
  - Zoom com pinch (mobile)
  - Zoom com scroll do mouse (desktop)
  - Duplo-click para zoom in/out
  - Arrastar para mover quando com zoom
- Fechar: click no X, click fora, ou tecla ESC
- Swipe para cima/baixo para fechar (mobile)

### Visual
- Fundo escuro semi-transparente (backdrop)
- Botao X no canto superior direito
- Indicador de zoom atual (opcional)
- Transicao suave ao abrir/fechar

## Implementacao

### 1. Componente Lightbox

```typescript
// apps/web/src/components/ui/image-lightbox.tsx

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistance = useRef<number | null>(null);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Zoom com scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
  }, []);

  // Double click para toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Touch handlers para pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouch.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistance.current = distance;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan
      const touch = e.touches[0];
      if (lastTouch.current) {
        const deltaX = touch.clientX - lastTouch.current.x;
        const deltaY = touch.clientY - lastTouch.current.y;
        setPosition((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
      }
      lastTouch.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && lastPinchDistance.current) {
      // Pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - lastPinchDistance.current) * 0.01;
      setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 5));
      lastPinchDistance.current = distance;
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouch.current = null;
    lastPinchDistance.current = null;
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-50',
        'bg-black/90 backdrop-blur-sm',
        'flex items-center justify-center',
        'animate-in fade-in duration-200'
      )}
      onClick={onClose}
      onWheel={handleWheel}
    >
      {/* Botao fechar */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Controles de zoom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            setScale((prev) => Math.max(prev - 0.5, 0.5));
          }}
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <span className="text-white text-sm flex items-center px-2">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            setScale((prev) => Math.min(prev + 0.5, 5));
          }}
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
      </div>

      {/* Imagem */}
      <img
        src={src}
        alt={alt || 'Imagem'}
        className="max-h-[90vh] max-w-[90vw] object-contain select-none"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        draggable={false}
      />
    </div>
  );
}
```

### 2. Integrar no ChatMediaPreview

```typescript
// apps/web/src/components/chat/ChatMediaPreview.tsx

import { ImageLightbox } from '@/components/ui/image-lightbox';

const [lightboxOpen, setLightboxOpen] = useState(false);

// No render de imagem:
{isImage && mediaUrl && (
  <>
    <div
      className="relative rounded-lg overflow-hidden max-w-sm cursor-pointer"
      onClick={() => setLightboxOpen(true)}
    >
      <img
        src={mediaUrl}
        alt={media.filename || 'Imagem'}
        className="w-full h-auto object-cover"
        loading="lazy"
      />
    </div>

    <ImageLightbox
      src={mediaUrl}
      alt={media.filename}
      isOpen={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
    />
  </>
)}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/ui/image-lightbox.tsx` - Componente lightbox

### Modificar
- `apps/web/src/components/chat/ChatMediaPreview.tsx` - Integrar lightbox

## Testes

- [ ] Click em imagem abre lightbox
- [ ] Zoom com pinch funciona (mobile)
- [ ] Zoom com scroll funciona (desktop)
- [ ] Double-click toggle zoom
- [ ] Arrastar funciona quando com zoom
- [ ] Fechar com X, ESC, click fora
- [ ] Animacao suave
- [ ] Nao quebra layout ao fechar
