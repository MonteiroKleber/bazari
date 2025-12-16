# Feed & Perfil - Fase 01: Perfil Publico

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

Esta fase foca em melhorias de UX na pagina de **Perfil Publico** (`/u/:handle`).

## Objetivo

Tornar a experiencia de visualizacao de perfis mais rica, com melhor feedback visual e opcoes de interacao social.

## Features da Fase 01

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Skeleton Loading | Baixa | Medio | [01-SKELETON-PROFILE.md](./01-SKELETON-PROFILE.md) |
| 2 | Botao Mensagem | Baixa | Alto | [02-MESSAGE-BUTTON.md](./02-MESSAGE-BUTTON.md) |
| 3 | Status Online | Media | Alto | [03-ONLINE-STATUS.md](./03-ONLINE-STATUS.md) |
| 4 | Compartilhar Perfil | Baixa | Medio | [04-SHARE-PROFILE.md](./04-SHARE-PROFILE.md) |
| 5 | Tab de Midia | Media | Medio | [05-MEDIA-TAB.md](./05-MEDIA-TAB.md) |

## Arquitetura Atual (Referencia)

### Pagina de Perfil
```
apps/web/src/pages/ProfilePublicPage.tsx
```

### Estrutura do Componente
```typescript
// Estados principais
const [loading, setLoading] = useState(true);
const [data, setData] = useState<PublicProfile | null>(null);
const [tab, setTab] = useState<'posts' | 'store' | 'followers' | 'following' | 'reputation'>('posts');
const [isFollowing, setIsFollowing] = useState(false);

// Tabs existentes
- posts: Lista de posts do usuario
- reputation: Grafico de reputacao
- store: Produtos da loja (se vendedor)
- followers: Lista de seguidores
- following: Lista de seguidos
```

### API Endpoints Utilizados
```
GET /profiles/:handle           # Perfil publico
GET /profiles/:handle/posts     # Posts do usuario
GET /profiles/:handle/followers # Seguidores
GET /profiles/:handle/following # Seguidos
POST /social/follow             # Seguir
DELETE /social/follow           # Deixar de seguir
```

## Dependencias Entre Features

```
┌─────────────────────┐
│ Skeleton Loading    │ (independente - prioridade alta)
└─────────────────────┘

┌─────────────────────┐
│ Compartilhar Perfil │ (independente - quick win)
└─────────────────────┘

┌─────────────────────┐
│ Botao Mensagem      │ ── depende de BazChat (ja existe)
└─────────────────────┘

┌─────────────────────┐
│ Status Online       │ ── depende de WebSocket global
└─────────────────────┘

┌─────────────────────┐
│ Tab de Midia        │ ── precisa nova API no backend
└─────────────────────┘
```

## Ordem de Implementacao Sugerida

1. **Skeleton Loading** - Visual imediato, sem dependencias
2. **Compartilhar Perfil** - Web Share API, simples
3. **Botao Mensagem** - Integracao com BazChat existente
4. **Status Online** - Requer WebSocket
5. **Tab de Midia** - Requer nova API

## Prompts de Implementacao

Cada feature tem prompts especificos na pasta [prompts/](./prompts/):
- [PROMPT-01-SKELETON-PROFILE.md](./prompts/PROMPT-01-SKELETON-PROFILE.md)
- [PROMPT-02-MESSAGE-BUTTON.md](./prompts/PROMPT-02-MESSAGE-BUTTON.md)
- [PROMPT-03-ONLINE-STATUS.md](./prompts/PROMPT-03-ONLINE-STATUS.md)
- [PROMPT-04-SHARE-PROFILE.md](./prompts/PROMPT-04-SHARE-PROFILE.md)
- [PROMPT-05-MEDIA-TAB.md](./prompts/PROMPT-05-MEDIA-TAB.md)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Feedback de loading | Texto "Carregando" | Skeleton animado |
| Iniciar conversa | Ir ao chat, criar thread | 1 click no perfil |
| Presenca | Desconhecido | Online/offline visivel |
| Compartilhamento | Copiar URL manual | Botao nativo |
| Descoberta de midia | Scroll por todos posts | Tab dedicada |
