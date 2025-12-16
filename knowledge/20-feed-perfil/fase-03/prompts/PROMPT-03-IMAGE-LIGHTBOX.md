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

Abrir imagens em visualizacao fullscreen com navegacao e zoom.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-03/03-IMAGE-LIGHTBOX.md`

## Ordem de Implementacao

### Etapa 1: Hook useLightbox

Criar `apps/web/src/hooks/useLightbox.ts`:

```typescript
interface UseLightboxReturn {
  isOpen: boolean;
  currentIndex: number;
  open: (index?: number) => void;
  close: () => void;
}
```

### Etapa 2: Componente ImageLightbox

Criar `apps/web/src/components/ui/ImageLightbox.tsx`:

Props:
- `images: Array<{ url: string; alt?: string }>`
- `initialIndex: number`
- `onClose: () => void`

Funcionalidades:
- Overlay escuro (bg-black/90)
- Botao X para fechar
- Setas para navegacao (se multiplas imagens)
- Contador "1 / 4"
- Navegacao por teclado (setas, ESC)
- Prevenir scroll do body

Opcional (se tiver framer-motion):
- Animacoes de entrada/saida
- Transicao entre imagens

### Etapa 3: Integrar em PostCard

Modificar `apps/web/src/components/social/PostCard.tsx`:

1. Importar useLightbox e ImageLightbox
2. Adicionar onClick nas imagens (nao videos)
3. Renderizar ImageLightbox quando `isOpen`
4. Passar apenas imagens (filtrar videos)

```tsx
const imageMedia = post.media?.filter(m => m.type !== 'video') || [];

// Na imagem:
onClick={(e) => {
  e.stopPropagation();
  const index = imageMedia.findIndex(m => m.url === item.url);
  lightbox.open(index);
}}

// No final do Card:
{lightbox.isOpen && imageMedia.length > 0 && (
  <ImageLightbox ... />
)}
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/hooks/useLightbox.ts`
- [ ] `apps/web/src/components/ui/ImageLightbox.tsx`

### Modificar
- [ ] `apps/web/src/components/social/PostCard.tsx`

## Dependencias (Opcional)

```bash
# Se quiser gestos de swipe:
pnpm add react-swipeable
```

## Cenarios de Teste

1. [ ] Click em imagem abre lightbox
2. [ ] X fecha lightbox
3. [ ] ESC fecha lightbox
4. [ ] Click no backdrop fecha lightbox
5. [ ] Setas navegam entre imagens
6. [ ] Contador mostra posicao correta
7. [ ] Videos NAO abrem lightbox
8. [ ] Body nao rola enquanto lightbox aberto
9. [ ] Navegacao por teclado funciona

## Commit

```bash
git add .
git commit -m "feat(posts): add image lightbox viewer

- Create useLightbox hook for state management
- Create ImageLightbox component with fullscreen view
- Add keyboard navigation (arrows, ESC)
- Show image counter for multi-image posts"
```
