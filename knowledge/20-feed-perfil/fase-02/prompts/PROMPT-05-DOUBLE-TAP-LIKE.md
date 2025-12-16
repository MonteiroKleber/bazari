# Prompt: Implementar Double-tap to Like

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

Implementar gesto de double-tap para curtir posts (estilo Instagram).

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-02/05-DOUBLE-TAP-LIKE.md`

## Ordem de Implementacao

### Etapa 1: Hook useDoubleTap

Criar `apps/web/src/hooks/useDoubleTap.ts`:

```typescript
interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  delay?: number; // default: 300ms
}

export function useDoubleTap(options): { handleTap: (e) => void }
```

Funcionalidades:
- Detectar double-tap via timestamp
- Ignorar taps em elementos interativos (button, a, video, input)
- Opcionalmente executar single tap apos delay

### Etapa 2: Componente HeartAnimation

Criar `apps/web/src/components/social/HeartAnimation.tsx`:

- Props: `show: boolean`
- Coracao grande (80px) vermelho centralizado
- Animacao: zoom in + fade out
- Duracao: ~800ms

Pode usar CSS puro ou framer-motion.

### Etapa 3: Integrar em PostCard

Modificar `apps/web/src/components/social/PostCard.tsx`:

1. Adicionar estado `showHeart`
2. Criar handler `handleDoubleTapLike`:
   - Se ja curtido, ignorar
   - Mostrar animacao
   - Atualizar estado local
   - Chamar API
3. Aplicar `handleTap` no Card
4. Renderizar HeartAnimation dentro do Card

### Etapa 4: Sincronizar com ReactionPicker

Garantir que estado de like sincroniza entre:
- Double-tap (adiciona 'love')
- ReactionPicker (permite trocar/remover reacao)

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/hooks/useDoubleTap.ts`
- [ ] `apps/web/src/components/social/HeartAnimation.tsx`

### Modificar
- [ ] `apps/web/src/components/social/PostCard.tsx`

## Cenarios de Teste

1. [ ] Double-tap em area vazia funciona
2. [ ] Double-tap em botoes/links NAO aciona
3. [ ] Coracao aparece e desaparece
4. [ ] Like registrado na API
5. [ ] Nao duplica likes em taps rapidos
6. [ ] Funciona em mobile (touch)
7. [ ] Funciona em desktop (click)
8. [ ] Estado sincronizado com ReactionPicker

## Commit

```bash
git add .
git commit -m "feat(posts): add double-tap to like gesture

- Create useDoubleTap hook for gesture detection
- Create HeartAnimation component with zoom effect
- Integrate double-tap like in PostCard
- Sync with existing reaction system"
```
