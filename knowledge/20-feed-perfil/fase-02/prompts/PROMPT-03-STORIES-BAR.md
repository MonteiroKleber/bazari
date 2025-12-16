# Prompt: Implementar Stories Bar no Feed

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## IMPORTANTE: Pre-requisito

**Esta feature depende de BazChat Stories (Fase 05).**

Antes de implementar, VERIFICAR se existem:
- `apps/web/src/components/chat/StoriesBar.tsx`
- `apps/web/src/components/chat/StoryViewer.tsx`
- `apps/web/src/components/chat/StoryCreator.tsx`
- API: `GET /stories/feed`

Se NAO existirem, PARAR e informar o usuario.

---

## Objetivo

Integrar barra de stories no topo do feed principal.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-02/03-STORIES-BAR.md`

## Ordem de Implementacao

### Etapa 1: Verificar Componentes BazChat

Verificar existencia de:
- StoriesBar.tsx
- StoryViewer.tsx
- StoryCreator.tsx

Se existirem, prosseguir para reutilizar.
Se nao existirem, criar FeedStoriesBar.tsx do zero.

### Etapa 2: Criar/Adaptar StoriesBar para Feed

Se reutilizando BazChat:
- Importar diretamente

Se criando novo:
- Criar `apps/web/src/components/social/FeedStoriesBar.tsx`
- Barra horizontal scrollavel
- Primeiro item: "Adicionar story"
- Stories de seguidos com borda gradiente (nao vistos) ou cinza (vistos)

### Etapa 3: Integrar em FeedPage

Modificar `apps/web/src/pages/FeedPage.tsx`:

1. Adicionar estados para viewer e creator
2. Renderizar StoriesBar no topo (apenas se logado)
3. Renderizar StoryViewer modal quando selecionado
4. Renderizar StoryCreator modal quando criando

## Arquivos a Criar/Modificar

### Criar (se necessario)
- [ ] `apps/web/src/components/social/FeedStoriesBar.tsx`

### Modificar
- [ ] `apps/web/src/pages/FeedPage.tsx`

## Cenarios de Teste

1. [ ] Stories bar aparece apenas para logados
2. [ ] "Adicionar story" abre creator
3. [ ] Click em avatar abre viewer
4. [ ] Borda colorida para nao vistos
5. [ ] Borda cinza para vistos
6. [ ] Scroll horizontal funciona
7. [ ] Skeleton durante loading

## Commit

```bash
git add .
git commit -m "feat(feed): integrate stories bar from BazChat

- Add StoriesBar component to feed page
- Show only for logged-in users
- Open viewer/creator modals on interaction"
```
