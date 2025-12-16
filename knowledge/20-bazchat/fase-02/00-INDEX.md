# BazChat UX Improvements - Fase 02: Engagement Features

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

Esta fase foca em features de **engajamento e interacao** que tornam as conversas mais dinamicas e produtivas.

## Objetivo

Adicionar interacoes modernas ao BazChat: responder mensagens especificas, reagir com emojis, buscar no historico e ver quem esta online.

## Features da Fase 02

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Reply/Quote | Media | Alto | [01-REPLY-QUOTE.md](./01-REPLY-QUOTE.md) |
| 2 | Reactions | Media | Alto | [02-REACTIONS.md](./02-REACTIONS.md) |
| 3 | Search | Media | Alto | [03-SEARCH.md](./03-SEARCH.md) |
| 4 | Online Status | Baixa | Medio | [04-ONLINE-STATUS.md](./04-ONLINE-STATUS.md) |

## Arquitetura Atual (Referencia)

### Frontend
```
apps/web/src/
├── components/chat/
│   ├── MessageBubble.tsx      # Bolha de mensagem
│   ├── MessageList.tsx        # Lista de mensagens
│   ├── ChatComposer.tsx       # Input de mensagem
│   ├── ThreadItem.tsx         # Item na lista de conversas
│   ├── TypingIndicator.tsx    # Indicador de digitacao
│   └── ...
├── pages/chat/
│   ├── ChatInboxPage.tsx      # Lista de conversas
│   ├── ChatThreadPage.tsx     # Tela de conversa
│   └── ...
├── hooks/
│   └── useChat.ts             # Estado global do chat (Zustand)
└── lib/chat/
    ├── websocket.ts           # Cliente WebSocket
    └── crypto.ts              # E2EE com libsodium
```

### Backend
```
apps/api/src/
├── routes/chat.ts             # Endpoints REST
├── services/chat.ts           # Logica de negocio
└── ws/chat-handler.ts         # WebSocket handler
```

### Shared Types
```
packages/shared-types/src/
└── chat.ts                    # ChatMessage, ChatThread, etc
```

## Dependencias Entre Features

```
┌─────────────────┐
│ Reply/Quote     │ (independente)
└─────────────────┘

┌─────────────────┐
│ Reactions       │ (independente)
└─────────────────┘

┌─────────────────┐
│ Search          │ (independente)
└─────────────────┘

┌─────────────────┐
│ Online Status   │ (independente)
└─────────────────┘
```

**Nota**: Todas as features da Fase 02 sao independentes entre si e podem ser implementadas em qualquer ordem.

## Ordem de Implementacao Sugerida

1. **Reply/Quote** - Base para conversas contextuais
2. **Reactions** - Engajamento rapido
3. **Online Status** - Presenca dos usuarios
4. **Search** - Busca no historico

## Prompts de Implementacao

Cada feature tem prompts especificos na pasta [prompts/](./prompts/):
- [PROMPT-01-REPLY-QUOTE.md](./prompts/PROMPT-01-REPLY-QUOTE.md)
- [PROMPT-02-REACTIONS.md](./prompts/PROMPT-02-REACTIONS.md)
- [PROMPT-03-SEARCH.md](./prompts/PROMPT-03-SEARCH.md)
- [PROMPT-04-ONLINE-STATUS.md](./prompts/PROMPT-04-ONLINE-STATUS.md)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Contexto em conversas | Mensagens soltas | Reply com preview |
| Feedback rapido | Apenas texto | Reactions com emoji |
| Encontrar mensagens | Scroll manual | Busca instantanea |
| Saber quem esta ativo | Nenhuma info | Status online/offline |

## Proximas Fases

- **Fase 03**: Voice Messages, GIFs, Formatting
- **Fase 04**: Bazari Differentiators (Commerce AI)
