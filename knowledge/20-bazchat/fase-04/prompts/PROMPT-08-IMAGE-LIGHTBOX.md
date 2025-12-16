# Prompt: Implementar Image Lightbox

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

Implementar visualizacao de imagens em tela cheia com zoom e pan.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/08-IMAGE-LIGHTBOX.md`

## Ordem de Implementacao

### Etapa 1: Criar Hook useImageZoom

Criar `apps/web/src/hooks/useImageZoom.ts`:

```typescript
interface ImageZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

export function useImageZoom() {
  const [state, setState] = useState<ImageZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const lastPinchDistanceRef = useRef<number>(0);

  // Pinch to zoom handlers
  const handleTouchStart = (e: TouchEvent) => {...};
  const handleTouchMove = (e: TouchEvent) => {...};
  const handleTouchEnd = () => {...};

  // Double tap to zoom
  const handleDoubleClick = (e: MouseEvent) => {
    if (state.scale > 1) {
      // Reset zoom
      setState({ scale: 1, translateX: 0, translateY: 0 });
    } else {
      // Zoom 2x centered on click point
      setState({ scale: 2, translateX: ..., translateY: ... });
    }
  };

  // Pan when zoomed
  const handleDrag = (e: TouchEvent | MouseEvent) => {...};

  const reset = () => setState({ scale: 1, translateX: 0, translateY: 0 });

  return { state, containerRef, handlers, reset };
}
```

### Etapa 2: Criar Componente ImageLightbox

Criar `apps/web/src/components/chat/ImageLightbox.tsx`:

```typescript
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../ui/button';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const { state, containerRef, handlers, reset } = useImageZoom();

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevenir scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6 text-white" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleDownload(src)}>
            <Download className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        {...handlers}
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `scale(${state.scale}) translate(${state.translateX}px, ${state.translateY}px)`,
            transition: state.scale === 1 ? 'transform 0.2s' : 'none',
          }}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Zoom indicator */}
      {state.scale > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
          {Math.round(state.scale * 100)}%
        </div>
      )}
    </div>
  );
}
```

### Etapa 3: Criar Context para Lightbox

Criar `apps/web/src/contexts/LightboxContext.tsx`:

```typescript
interface LightboxContextType {
  openLightbox: (src: string, alt?: string) => void;
  closeLightbox: () => void;
}

export const LightboxContext = createContext<LightboxContextType | null>(null);

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    src: string;
    alt?: string;
  }>({ isOpen: false, src: '' });

  const openLightbox = (src: string, alt?: string) => {
    setLightboxState({ isOpen: true, src, alt });
  };

  const closeLightbox = () => {
    setLightboxState({ isOpen: false, src: '' });
  };

  return (
    <LightboxContext.Provider value={{ openLightbox, closeLightbox }}>
      {children}
      {lightboxState.isOpen && (
        <ImageLightbox
          src={lightboxState.src}
          alt={lightboxState.alt}
          onClose={closeLightbox}
        />
      )}
    </LightboxContext.Provider>
  );
}
```

### Etapa 4: Integrar com ChatMediaPreview

Modificar `apps/web/src/components/chat/ChatMediaPreview.tsx`:

```typescript
const { openLightbox } = useLightbox();

{isImage && mediaUrl && (
  <div
    className="cursor-pointer"
    onClick={() => openLightbox(mediaUrl, media.filename)}
  >
    <img src={mediaUrl} alt={media.filename} />
  </div>
)}
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/hooks/useImageZoom.ts`
- [ ] `apps/web/src/components/chat/ImageLightbox.tsx`
- [ ] `apps/web/src/contexts/LightboxContext.tsx`

### Modificar
- [ ] `apps/web/src/App.tsx` (adicionar LightboxProvider)
- [ ] `apps/web/src/components/chat/ChatMediaPreview.tsx`

## Cenarios de Teste

1. [ ] Clicar em imagem abre lightbox
2. [ ] ESC ou X fecha lightbox
3. [ ] Double-click faz zoom 2x
4. [ ] Pinch to zoom funciona no mobile
5. [ ] Pan quando com zoom
6. [ ] Download funciona
7. [ ] Body scroll bloqueado quando aberto

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement image lightbox with zoom

- Create useImageZoom hook with pinch and double-tap
- Create ImageLightbox component with pan support
- Add LightboxContext for global access
- Integrate with ChatMediaPreview for click to open"
```
