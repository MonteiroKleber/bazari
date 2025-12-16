# Prompt Master: BazChat Fase 02 - Engagement Features

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

Se houver **qualquer duvida** sobre:
- Como algo deve funcionar
- Qual o comportamento esperado
- Qual API/endpoint usar
- Qual o formato dos dados

**PARE e PERGUNTE** antes de implementar.

---

## Visao Geral

Este prompt orquestra a implementacao completa da Fase 02 de melhorias UX do BazChat. Sao 4 features de engajamento e interacao.

## Contexto do Projeto

- **Repositorio**: `/root/bazari`
- **Frontend**: `apps/web/src/` (React + Vite + TypeScript)
- **Backend**: `apps/api/src/` (Node.js + Express)
- **Database**: Prisma + PostgreSQL
- **Realtime**: WebSocket
- **State**: Zustand
- **UI**: shadcn/ui + Tailwind

## Pre-requisitos

A Fase 01 deve estar completa:
- ✅ Message Status (read receipts)
- ✅ Visual Bubbles
- ✅ Typing Indicator
- ✅ Pin/Archive

## Features a Implementar

| Ordem | Feature | Spec | Prompt |
|-------|---------|------|--------|
| 1 | Reply/Quote | [01-REPLY-QUOTE.md](../01-REPLY-QUOTE.md) | [PROMPT-01](./PROMPT-01-REPLY-QUOTE.md) |
| 2 | Reactions | [02-REACTIONS.md](../02-REACTIONS.md) | [PROMPT-02](./PROMPT-02-REACTIONS.md) |
| 3 | Online Status | [04-ONLINE-STATUS.md](../04-ONLINE-STATUS.md) | [PROMPT-04](./PROMPT-04-ONLINE-STATUS.md) |
| 4 | Search | [03-SEARCH.md](../03-SEARCH.md) | [PROMPT-03](./PROMPT-03-SEARCH.md) |

**Nota**: Search foi movida para o final pois e a feature mais complexa (busca client-side com E2EE).

## Instrucoes Gerais

### Antes de Comecar

1. Leia o arquivo de especificacao completo da feature
2. Explore os arquivos existentes mencionados na spec
3. Entenda o contexto atual do codigo
4. Verifique se a Fase 01 esta implementada

### Durante a Implementacao

1. Faca commits atomicos por feature
2. Nao quebre funcionalidades existentes
3. Mantenha compatibilidade com E2EE
4. Teste manualmente antes de finalizar
5. **CODIGO DE PRODUCAO**: Nada de mocks, placeholders ou TODOs
6. **EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de assumir

### Apos Cada Feature

1. Verifique se todos os itens do checklist estao completos
2. Teste os cenarios de validacao listados
3. Faca commit com mensagem clara

## Prompt para Implementar Feature Individual

```
Implemente a feature [NOME] do BazChat.

Especificacao: knowledge/bazchat/fase-02/[NN-FEATURE].md
Prompt detalhado: knowledge/bazchat/fase-02/prompts/PROMPT-[NN]-[FEATURE].md

Siga o prompt detalhado para implementacao. Faca commits atomicos.
```

## Prompt para Implementar Fase Completa

```
Implemente todas as features da Fase 02 de melhorias UX do BazChat.

Especificacoes em: knowledge/bazchat/fase-02/
Ordem de implementacao:
1. Reply/Quote (01-REPLY-QUOTE.md)
2. Reactions (02-REACTIONS.md)
3. Online Status (04-ONLINE-STATUS.md)
4. Search (03-SEARCH.md)

Para cada feature:
1. Leia a spec completa
2. Leia o prompt detalhado em prompts/
3. Implemente seguindo o checklist
4. Teste os cenarios de validacao
5. Faca commit

Inicie pela feature 1 (Reply/Quote).
```

## Dependencias Entre Features

```
┌─────────────────┐
│ Reply/Quote     │ ──> Independente
└─────────────────┘

┌─────────────────┐
│ Reactions       │ ──> Independente
└─────────────────┘

┌─────────────────┐
│ Online Status   │ ──> Independente
└─────────────────┘

┌─────────────────┐
│ Search          │ ──> Independente (mas mais complexa)
└─────────────────┘
```

**Todas as features sao independentes** e podem ser implementadas em qualquer ordem. A ordem sugerida e por complexidade crescente.

## Arquivos Chave

### Shared Types
- `packages/shared-types/src/chat.ts`

### Backend
- `apps/api/src/routes/chat.ts`
- `apps/api/src/services/chat.ts`
- `apps/api/src/ws/chat-handler.ts`
- `packages/db/prisma/schema.prisma`

### Frontend
- `apps/web/src/hooks/useChat.ts`
- `apps/web/src/lib/chat/websocket.ts`
- `apps/web/src/components/chat/MessageBubble.tsx`
- `apps/web/src/components/chat/MessageList.tsx`
- `apps/web/src/components/chat/ThreadItem.tsx`
- `apps/web/src/components/chat/ChatComposer.tsx`
- `apps/web/src/pages/chat/ChatThreadPage.tsx`
- `apps/web/src/pages/chat/ChatInboxPage.tsx`

## Checklist Final da Fase

- [ ] **Reply/Quote**
  - [ ] Migration Prisma para replyToId
  - [ ] Backend: replyTo na busca de mensagens
  - [ ] Backend: processar replyToId no WS
  - [ ] Componente ReplyPreview
  - [ ] Componente QuotedMessage
  - [ ] ChatComposer com estado de reply
  - [ ] MessageBubble com quoted message
  - [ ] Scroll to message funcional
  - [ ] Menu de contexto com "Responder"

- [ ] **Reactions**
  - [ ] Migration Prisma para ChatMessageReaction
  - [ ] Endpoints REST para reactions
  - [ ] Handler WS chat:reaction
  - [ ] Componente ReactionPicker
  - [ ] Componente ReactionBar
  - [ ] ReactionUsersDialog
  - [ ] Animacoes de reacao
  - [ ] Realtime funcionando

- [ ] **Online Status**
  - [ ] Migration Prisma (lastSeenAt, showOnlineStatus)
  - [ ] Backend presence-handler
  - [ ] WS connect/disconnect hooks
  - [ ] Componente OnlineIndicator
  - [ ] Componente LastSeenText
  - [ ] Status no ThreadItem
  - [ ] Status no ChatThreadPage header
  - [ ] Configuracao de privacidade

- [ ] **Search**
  - [ ] Hook useMessageSearch
  - [ ] Componente ChatSearchBar
  - [ ] Componente SearchResults
  - [ ] SearchHighlight para termos
  - [ ] Busca em thread
  - [ ] Busca global
  - [ ] Scroll to message
  - [ ] Atalhos de teclado

## Metricas de Sucesso

Apos implementar a Fase 02:

| Antes | Depois |
|-------|--------|
| Mensagens sem contexto | Reply com preview clicavel |
| Apenas texto como feedback | Reactions com emojis |
| Nao sabe quem esta ativo | Status online/offline |
| Scroll manual para buscar | Busca instantanea |

## Proximos Passos (Fase 03)

Apos completar Fase 02, as proximas features sao:
- Voice Messages (gravacao e reproducao)
- GIFs (integracao com Giphy/Tenor)
- Text Formatting (bold, italic, code)

Ver: `knowledge/bazchat/fase-03/` (a ser criado)
