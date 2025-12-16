# Prompt: Implementar New Posts Indicator

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

Mostrar indicador de novos posts disponiveis no feed com polling automatico.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-02/01-NEW-POSTS-INDICATOR.md`

## Ordem de Implementacao

### Etapa 1: Backend - Endpoint de Contagem

Criar endpoint em `apps/api/src/routes/feed.ts`:

```
GET /feed/count?since=ISO_DATE&tab=for-you|following|popular
Response: { count: number }
```

Contar posts criados depois de `since` para a tab especificada.

### Etapa 2: Hook useNewPostsIndicator

Criar `apps/web/src/hooks/useNewPostsIndicator.ts`:

- Estado: `newPostsCount`, `lastCheckedAt`
- Polling a cada 30 segundos
- Pausar quando `document.hidden`
- Funcao `clearAndRefresh` para resetar

### Etapa 3: Componente NewPostsBanner

Criar `apps/web/src/components/social/NewPostsBanner.tsx`:

- Props: `count`, `onLoad`
- Animacao de entrada (slide down)
- Estilo: pill flutuante, cor primaria
- Texto: "X novos posts" / "X novo post"

### Etapa 4: Integrar em PersonalizedFeed

- Importar hook e componente
- Renderizar banner acima das tabs
- Click no banner chama `clearAndRefresh()` + `refresh()` + scroll to top

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/api/src/routes/feed.ts` - Endpoint count (ou adicionar ao existente)
- [ ] `apps/web/src/hooks/useNewPostsIndicator.ts`
- [ ] `apps/web/src/components/social/NewPostsBanner.tsx`

### Modificar
- [ ] `apps/web/src/lib/api.ts` - Helper getFeedCount
- [ ] `apps/web/src/components/social/PersonalizedFeed.tsx`

## Cenarios de Teste

1. [ ] Banner aparece quando ha novos posts
2. [ ] Contador incrementa com multiplos posts
3. [ ] Click carrega posts e rola para topo
4. [ ] Banner some apos carregar
5. [ ] Polling para quando aba em background
6. [ ] Polling reinicia quando aba volta ao foco

## Commit

```bash
git add .
git commit -m "feat(feed): add new posts indicator with polling

- Add GET /feed/count endpoint for checking new posts
- Create useNewPostsIndicator hook with 30s polling
- Create NewPostsBanner component with animation
- Show banner when new posts available"
```
