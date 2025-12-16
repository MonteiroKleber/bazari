# Prompt: Implementar Scroll to Top FAB

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

Adicionar botao flutuante (FAB) para voltar ao topo do feed.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-02/02-SCROLL-TO-TOP.md`

## Ordem de Implementacao

### Etapa 1: Criar Componente ScrollToTopFAB

Criar `apps/web/src/components/ui/ScrollToTopFAB.tsx`:

```typescript
interface ScrollToTopFABProps {
  threshold?: number;  // Default: 500
  className?: string;
}
```

Funcionalidades:
1. Listener de scroll com `{ passive: true }`
2. Mostrar quando `scrollY > threshold`
3. Click: `window.scrollTo({ top: 0, behavior: 'smooth' })`
4. Animacao de entrada/saida (CSS ou framer-motion)

Posicionamento:
- Mobile: `bottom-20` (acima do bottom nav)
- Desktop: `bottom-8`
- Sempre: `right-4`, `z-40`

### Etapa 2: Integrar em FeedPage

Modificar `apps/web/src/pages/FeedPage.tsx`:

Adicionar `<ScrollToTopFAB />` antes do fechamento do fragment.

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/ui/ScrollToTopFAB.tsx`

### Modificar
- [ ] `apps/web/src/pages/FeedPage.tsx`

## Cenarios de Teste

1. [ ] FAB aparece quando scroll > 500px
2. [ ] FAB some quando proximo do topo
3. [ ] Click faz scroll suave
4. [ ] Posicao correta em mobile
5. [ ] Posicao correta em desktop
6. [ ] Animacao funciona
7. [ ] Acessivel por teclado

## Commit

```bash
git add .
git commit -m "feat(feed): add scroll to top FAB

- Create ScrollToTopFAB component with smooth scroll
- Show FAB when scrolled past threshold
- Position above bottom nav on mobile"
```
