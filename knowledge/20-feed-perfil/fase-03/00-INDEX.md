# Feed & Perfil - Fase 03: PostCard & CreatePost

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

Esta fase foca em melhorias nos componentes **PostCard** e **CreatePostModal**, que sao usados em multiplas paginas.

## Objetivo

Melhorar a experiencia de visualizacao e criacao de posts com recursos mais ricos e interacoes mais intuitivas.

## Features da Fase 03

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Link Preview | Media | Alto | [01-LINK-PREVIEW.md](./01-LINK-PREVIEW.md) |
| 2 | Expand/Collapse Posts | Baixa | Medio | [02-EXPAND-COLLAPSE.md](./02-EXPAND-COLLAPSE.md) |
| 3 | Image Lightbox | Media | Alto | [03-IMAGE-LIGHTBOX.md](./03-IMAGE-LIGHTBOX.md) |
| 4 | Draft Auto-save | Media | Medio | [04-DRAFT-AUTOSAVE.md](./04-DRAFT-AUTOSAVE.md) |

## Arquitetura Atual (Referencia)

### Componentes Principais
```
apps/web/src/components/social/
├── PostCard.tsx              # Card de visualizacao de post
├── CreatePostModal.tsx       # Modal de criacao de post
├── PostCardSkeleton.tsx      # Loading skeleton
├── PostOptionsMenu.tsx       # Menu de opcoes (3 dots)
├── RepostButton.tsx          # Botao de repost
├── BookmarkButton.tsx        # Botao de bookmark
├── ReactionPicker.tsx        # Picker de reacoes
├── PollCard.tsx              # Card de enquete
└── ProfileHoverCard.tsx      # Hover card do autor
```

### PostCard - Estrutura Atual
```typescript
interface PostCardProps {
  post: {
    id: string;
    author: { handle, displayName, avatarUrl, badges };
    content: string;
    media?: Array<{ url, type, thumbnailUrl }>;
    createdAt: string;
    kind?: string;
    poll?: { ... };
    likesCount, commentsCount, repostsCount: number;
    isLiked, isReposted, isBookmarked: boolean;
    reactions?: { love, laugh, wow, sad, angry };
    userReaction?: string;
    repostedBy?: { ... };
    isPinned?: boolean;
  };
  currentUserHandle?: string;
  onDeleted?: () => void;
  onUpdated?: (post) => void;
  onPinned?: (pinned) => void;
}
```

### CreatePostModal - Features Atuais
- Texto ate 5000 caracteres
- Upload de imagens (ate 4)
- Upload de video (1, chunked)
- Criacao de enquetes
- Atalho Ctrl+Enter para publicar

## Dependencias Entre Features

```
┌─────────────────────┐
│ Expand/Collapse     │ (independente - quick win)
└─────────────────────┘

┌─────────────────────┐
│ Draft Auto-save     │ (independente - usa localStorage)
└─────────────────────┘

┌─────────────────────┐
│ Link Preview        │ ── requer API de metadados (backend)
└─────────────────────┘

┌─────────────────────┐
│ Image Lightbox      │ (independente - apenas frontend)
└─────────────────────┘
```

## Ordem de Implementacao Sugerida

1. **Expand/Collapse Posts** - Mais simples, valor imediato
2. **Draft Auto-save** - Previne perda de conteudo
3. **Image Lightbox** - Melhora visualizacao de midia
4. **Link Preview** - Requer backend, maior esforco

## Prompts de Implementacao

Cada feature tem prompts especificos na pasta [prompts/](./prompts/):
- [PROMPT-01-LINK-PREVIEW.md](./prompts/PROMPT-01-LINK-PREVIEW.md)
- [PROMPT-02-EXPAND-COLLAPSE.md](./prompts/PROMPT-02-EXPAND-COLLAPSE.md)
- [PROMPT-03-IMAGE-LIGHTBOX.md](./prompts/PROMPT-03-IMAGE-LIGHTBOX.md)
- [PROMPT-04-DRAFT-AUTOSAVE.md](./prompts/PROMPT-04-DRAFT-AUTOSAVE.md)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Posts longos | Truncados sem opcao | Expansiveis |
| Links externos | Texto puro | Cards com preview |
| Visualizacao de imagens | Inline pequena | Lightbox fullscreen |
| Rascunhos | Perdidos ao fechar | Auto-salvos |
