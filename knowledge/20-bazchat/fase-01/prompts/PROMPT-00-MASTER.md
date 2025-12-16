# Prompt Master: BazChat Fase 01 - Quick Wins

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

Este prompt orquestra a implementacao completa da Fase 01 de melhorias UX do BazChat. Sao 4 features de alto impacto com baixa/media complexidade.

## Contexto do Projeto

- **Repositorio**: `/root/bazari`
- **Frontend**: `apps/web/src/` (React + Vite + TypeScript)
- **Backend**: `apps/api/src/` (Node.js + Express)
- **Database**: Prisma + PostgreSQL
- **Realtime**: WebSocket
- **State**: Zustand
- **UI**: shadcn/ui + Tailwind

## Features a Implementar

| Ordem | Feature | Spec | Prompt |
|-------|---------|------|--------|
| 1 | Message Status | [02-MESSAGE-STATUS.md](../02-MESSAGE-STATUS.md) | [PROMPT-02](./PROMPT-02-MESSAGE-STATUS.md) |
| 2 | Visual Bubbles | [03-VISUAL-BUBBLES.md](../03-VISUAL-BUBBLES.md) | [PROMPT-03](./PROMPT-03-VISUAL-BUBBLES.md) |
| 3 | Typing Indicator | [01-TYPING-INDICATOR.md](../01-TYPING-INDICATOR.md) | [PROMPT-01](./PROMPT-01-TYPING-INDICATOR.md) |
| 4 | Pin/Archive | [04-PIN-ARCHIVE.md](../04-PIN-ARCHIVE.md) | [PROMPT-04](./PROMPT-04-PIN-ARCHIVE.md) |

**Nota**: A ordem de implementacao e diferente da numeracao dos arquivos. Message Status vem primeiro porque Visual Bubbles depende dele.

## Instrucoes Gerais

### Antes de Comecar

1. Leia o arquivo de especificacao completo da feature
2. Explore os arquivos existentes mencionados na spec
3. Entenda o contexto atual do codigo

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

Especificacao: knowledge/bazchat/fase-01/[NN-FEATURE].md
Prompt detalhado: knowledge/bazchat/fase-01/prompts/PROMPT-[NN]-[FEATURE].md

Siga o prompt detalhado para implementacao. Faca commits atomicos.
```

## Prompt para Implementar Fase Completa

```
Implemente todas as features da Fase 01 de melhorias UX do BazChat.

Especificacoes em: knowledge/bazchat/fase-01/
Ordem de implementacao:
1. Message Status (02-MESSAGE-STATUS.md)
2. Visual Bubbles (03-VISUAL-BUBBLES.md)
3. Typing Indicator (01-TYPING-INDICATOR.md)
4. Pin/Archive (04-PIN-ARCHIVE.md)

Para cada feature:
1. Leia a spec completa
2. Leia o prompt detalhado em prompts/
3. Implemente seguindo o checklist
4. Teste os cenarios de validacao
5. Faca commit

Inicie pela feature 1 (Message Status).
```

## Dependencias Entre Features

```
Message Status ──────┐
                     ├──> Visual Bubbles (usa MessageStatus component)
                     │
Typing Indicator ────┼──> Independente
                     │
Pin/Archive ─────────┘──> Independente
```

## Arquivos Chave

### Shared Types
- `packages/shared-types/src/chat.ts`

### Backend
- `apps/api/src/routes/chat.ts`
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

- [ ] **Message Status**
  - [ ] Migration Prisma executada
  - [ ] Tipos atualizados em shared-types
  - [ ] Handlers WS implementados
  - [ ] Componente MessageStatus criado
  - [ ] Optimistic updates funcionando
  - [ ] Read receipts automaticos

- [ ] **Visual Bubbles**
  - [ ] MessageBubble refatorado
  - [ ] Tail SVG implementado
  - [ ] Agrupamento funcionando
  - [ ] Animacao de entrada
  - [ ] Dark mode OK

- [ ] **Typing Indicator**
  - [ ] Tipos WS adicionados
  - [ ] Backend handlers OK
  - [ ] TypingIndicator component criado
  - [ ] Debounce funcionando
  - [ ] Timeout de 5s OK

- [ ] **Pin/Archive**
  - [ ] Tabela ChatThreadPreference criada
  - [ ] Endpoints REST implementados
  - [ ] Pin com limite de 3
  - [ ] Secao de arquivadas
  - [ ] Menu de contexto no ThreadItem

## Metricas de Sucesso

Apos implementar a Fase 01:

| Antes | Depois |
|-------|--------|
| Sem feedback de envio | Clock -> Check -> DoubleCheck |
| Bolhas simples | Bolhas modernas com tail |
| Sem "digitando..." | Indicador animado |
| Conversas desordenadas | Pin no topo, archive para limpar |

## Proximos Passos (Fase 02)

Apos completar Fase 01, as proximas features sao:
- Reply/Quote Messages
- Emoji Reactions
- Message Search
- Online/Last Seen Status

Ver: `knowledge/bazchat/fase-02/` (a ser criado)
