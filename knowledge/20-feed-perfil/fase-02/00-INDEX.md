# Feed & Perfil - Fase 02: Feed UX

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados ou fake data
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** hardcodar valores que deveriam ser dinamicos
- **NAO** assumir comportamentos - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Visao Geral

Esta fase foca em melhorias de UX na pagina de **Feed** (`/app/feed`).

## Objetivo

Tornar a experiencia de navegacao no feed mais fluida e engajadora, com indicadores de novos conteudos e interacoes mais intuitivas.

## Features da Fase 02

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | New Posts Indicator | Media | Alto | [01-NEW-POSTS-INDICATOR.md](./01-NEW-POSTS-INDICATOR.md) |
| 2 | Scroll to Top FAB | Baixa | Medio | [02-SCROLL-TO-TOP.md](./02-SCROLL-TO-TOP.md) |
| 3 | Stories Bar | Alta | Alto | [03-STORIES-BAR.md](./03-STORIES-BAR.md) |
| 4 | Filtro de Conteudo | Media | Medio | [04-CONTENT-FILTER.md](./04-CONTENT-FILTER.md) |
| 5 | Double-tap to Like | Baixa | Alto | [05-DOUBLE-TAP-LIKE.md](./05-DOUBLE-TAP-LIKE.md) |

## Arquitetura Atual (Referencia)

### Pagina de Feed
```
apps/web/src/pages/FeedPage.tsx
```

### Componente Principal
```
apps/web/src/components/social/PersonalizedFeed.tsx
```

### Estrutura do Feed
```typescript
// Tabs existentes
const TABS = [
  { value: 'for-you', label: 'Para Voce' },
  { value: 'following', label: 'Seguindo' },
  { value: 'popular', label: 'Popular' },
];

// Hook principal
const { posts, loading, loadingMore, hasMore, refresh, loadMoreRef, setPosts } =
  usePersonalizedFeed({ tab: activeTab });
```

### API Endpoints Utilizados
```
GET /feed/for-you      # Feed personalizado
GET /feed/following    # Posts de quem segue
GET /feed/popular      # Posts populares
POST /posts            # Criar post
```

## Dependencias Entre Features

```
┌─────────────────────┐
│ Scroll to Top FAB   │ (independente - quick win)
└─────────────────────┘

┌─────────────────────┐
│ Double-tap to Like  │ (independente - quick win)
└─────────────────────┘

┌─────────────────────┐
│ New Posts Indicator │ ── requer polling ou WebSocket
└─────────────────────┘

┌─────────────────────┐
│ Filtro de Conteudo  │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Stories Bar         │ ── depende de BazChat Stories (Fase 05)
└─────────────────────┘
```

## Ordem de Implementacao Sugerida

1. **Scroll to Top FAB** - Mais simples, alto valor
2. **Double-tap to Like** - Gesto familiar, alta satisfacao
3. **New Posts Indicator** - Requer backend (polling)
4. **Filtro de Conteudo** - UX refinada
5. **Stories Bar** - Apos BazChat Stories implementado

## Prompts de Implementacao

Cada feature tem prompts especificos na pasta [prompts/](./prompts/):
- [PROMPT-01-NEW-POSTS-INDICATOR.md](./prompts/PROMPT-01-NEW-POSTS-INDICATOR.md)
- [PROMPT-02-SCROLL-TO-TOP.md](./prompts/PROMPT-02-SCROLL-TO-TOP.md)
- [PROMPT-03-STORIES-BAR.md](./prompts/PROMPT-03-STORIES-BAR.md)
- [PROMPT-04-CONTENT-FILTER.md](./prompts/PROMPT-04-CONTENT-FILTER.md)
- [PROMPT-05-DOUBLE-TAP-LIKE.md](./prompts/PROMPT-05-DOUBLE-TAP-LIKE.md)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Descoberta de novos posts | Pull-to-refresh manual | Indicador automatico |
| Navegacao no feed | Scroll infinito sem retorno | FAB para voltar ao topo |
| Interacao rapida | Click em botao like | Double-tap nativo |
| Personalizacao | Apenas tabs | Filtros adicionais |
| Stories | Via chat | Integrado ao feed |
