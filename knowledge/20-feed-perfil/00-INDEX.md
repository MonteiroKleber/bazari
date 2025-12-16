# Feed & Perfil - Melhorias UX

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

Este modulo especifica melhorias de UX para as paginas de **Feed** (`/app/feed`) e **Perfil Publico** (`/u/:handle`), incluindo componentes compartilhados como **PostCard** e **CreatePostModal**.

## Objetivo

Tornar a experiencia de navegacao no feed e perfis mais fluida, engajadora e comparavel com redes sociais modernas.

## Fases de Implementacao

| Fase | Foco | Features | Status |
|------|------|----------|--------|
| 01 | Perfil Publico | 5 features | Pendente |
| 02 | Feed | 5 features | Pendente |
| 03 | PostCard & CreatePost | 4 features | Pendente |

## Arquitetura Atual (Referencia)

### Frontend - Paginas
```
apps/web/src/pages/
├── FeedPage.tsx              # Feed principal
├── ProfilePublicPage.tsx     # Perfil publico /u/:handle
├── ProfileEditPage.tsx       # Edicao de perfil
└── PostDetailPage.tsx        # Pagina de post individual
```

### Frontend - Componentes Social
```
apps/web/src/components/social/
├── PersonalizedFeed.tsx      # Feed com tabs (Para Voce, Seguindo, Popular)
├── PostCard.tsx              # Card de post
├── PostCardSkeleton.tsx      # Skeleton loading
├── CreatePostModal.tsx       # Modal de criacao de post
├── PostOptionsMenu.tsx       # Menu de opcoes (3 dots)
├── RepostButton.tsx          # Botao de repost
├── BookmarkButton.tsx        # Botao de bookmark
├── ReactionPicker.tsx        # Picker de reacoes
├── PollCard.tsx              # Card de enquete
├── ProfileHoverCard.tsx      # Hover card do perfil
└── ReputationChart.tsx       # Grafico de reputacao
```

### Frontend - Componentes Perfil
```
apps/web/src/components/profile/
├── ReputationBadge.tsx       # Badge de reputacao
└── BadgesList.tsx            # Lista de badges
```

### Backend - Rotas Relevantes
```
apps/api/src/routes/
├── posts.ts                  # CRUD de posts
├── profiles.ts               # Perfis publicos
├── social.ts                 # Follow/unfollow, likes
└── feed.ts                   # Algoritmo de feed
```

## Fase 01: Perfil Publico

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Skeleton Loading Perfil | Baixa | Medio | [01-SKELETON-PROFILE.md](./fase-01/01-SKELETON-PROFILE.md) |
| 2 | Botao Mensagem | Baixa | Alto | [02-MESSAGE-BUTTON.md](./fase-01/02-MESSAGE-BUTTON.md) |
| 3 | Status Online | Media | Alto | [03-ONLINE-STATUS.md](./fase-01/03-ONLINE-STATUS.md) |
| 4 | Compartilhar Perfil | Baixa | Medio | [04-SHARE-PROFILE.md](./fase-01/04-SHARE-PROFILE.md) |
| 5 | Tab de Midia | Media | Medio | [05-MEDIA-TAB.md](./fase-01/05-MEDIA-TAB.md) |

## Fase 02: Feed

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | New Posts Indicator | Media | Alto | [01-NEW-POSTS-INDICATOR.md](./fase-02/01-NEW-POSTS-INDICATOR.md) |
| 2 | Scroll to Top FAB | Baixa | Medio | [02-SCROLL-TO-TOP.md](./fase-02/02-SCROLL-TO-TOP.md) |
| 3 | Stories Bar | Alta | Alto | [03-STORIES-BAR.md](./fase-02/03-STORIES-BAR.md) |
| 4 | Filtro de Conteudo | Media | Medio | [04-CONTENT-FILTER.md](./fase-02/04-CONTENT-FILTER.md) |
| 5 | Double-tap to Like | Baixa | Alto | [05-DOUBLE-TAP-LIKE.md](./fase-02/05-DOUBLE-TAP-LIKE.md) |

## Fase 03: PostCard & CreatePost

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Link Preview | Media | Alto | [01-LINK-PREVIEW.md](./fase-03/01-LINK-PREVIEW.md) |
| 2 | Expand/Collapse Posts | Baixa | Medio | [02-EXPAND-COLLAPSE.md](./fase-03/02-EXPAND-COLLAPSE.md) |
| 3 | Image Lightbox | Media | Alto | [03-IMAGE-LIGHTBOX.md](./fase-03/03-IMAGE-LIGHTBOX.md) |
| 4 | Draft Auto-save | Media | Medio | [04-DRAFT-AUTOSAVE.md](./fase-03/04-DRAFT-AUTOSAVE.md) |

## Dependencias Entre Features

```
Fase 01 (Perfil):
┌─────────────────────┐
│ Skeleton Loading    │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Botao Mensagem      │ ── depende de BazChat existente
└─────────────────────┘

┌─────────────────────┐
│ Status Online       │ ── depende de WebSocket global
└─────────────────────┘

┌─────────────────────┐
│ Compartilhar Perfil │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Tab de Midia        │ ── depende de API de posts com filtro
└─────────────────────┘

Fase 02 (Feed):
┌─────────────────────┐
│ New Posts Indicator │ ── depende de WebSocket ou polling
└─────────────────────┘

┌─────────────────────┐
│ Scroll to Top FAB   │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Stories Bar         │ ── depende de BazChat Stories (Fase 05)
└─────────────────────┘

┌─────────────────────┐
│ Filtro de Conteudo  │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Double-tap to Like  │ (independente)
└─────────────────────┘

Fase 03 (PostCard):
┌─────────────────────┐
│ Link Preview        │ ── depende de API de metadados
└─────────────────────┘

┌─────────────────────┐
│ Expand/Collapse     │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Image Lightbox      │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Draft Auto-save     │ (independente - usa localStorage)
└─────────────────────┘
```

## Ordem de Implementacao Sugerida

### Sprint 1: Quick Wins
1. Skeleton Loading Perfil
2. Scroll to Top FAB
3. Compartilhar Perfil
4. Expand/Collapse Posts
5. Double-tap to Like

### Sprint 2: Engajamento
6. Botao Mensagem
7. New Posts Indicator
8. Draft Auto-save
9. Link Preview

### Sprint 3: Features Avancadas
10. Status Online
11. Tab de Midia
12. Image Lightbox
13. Filtro de Conteudo

### Sprint 4: Integracao
14. Stories Bar (apos BazChat Fase 05)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Loading visual | Tela vazia | Skeleton animado |
| Inicio de conversa | Via chat | Botao no perfil |
| Presenca | Sem indicador | Online/offline |
| Compartilhamento | Manual | 1 click |
| Navegacao | Scroll manual | FAB + Indicador |
| Engajamento | Click para curtir | Double-tap |
| Preview de links | Texto puro | Card rico |
| Posts longos | Cortados | Expandiveis |

## Proximas Evolucoes

- **Fase 04**: Gamificacao (achievements no perfil, streaks)
- **Fase 05**: Monetizacao (tips, super-likes)
- **Fase 06**: Analytics (insights de perfil)
