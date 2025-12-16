# BazChat UX Improvements - Fase 01: Quick Wins

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

Esta fase foca em melhorias de UX de **alto impacto** com **baixa/media complexidade** que podem ser implementadas em 1-2 semanas.

## Objetivo

Elevar a experiencia do BazChat para um nivel proximo ao WhatsApp, focando em feedback visual e interacoes basicas que usuarios esperam de um chat moderno.

## Features da Fase 01

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Typing Indicator | Media | Alto | [01-TYPING-INDICATOR.md](./01-TYPING-INDICATOR.md) |
| 2 | Message Status (Read Receipts) | Media | Alto | [02-MESSAGE-STATUS.md](./02-MESSAGE-STATUS.md) |
| 3 | Visual Improvements (Bubbles) | Baixa | Medio | [03-VISUAL-BUBBLES.md](./03-VISUAL-BUBBLES.md) |
| 4 | Pin/Archive Conversations | Baixa | Medio | [04-PIN-ARCHIVE.md](./04-PIN-ARCHIVE.md) |

## Arquitetura Atual (Referencia)

### Frontend
```
apps/web/src/
├── components/chat/
│   ├── MessageBubble.tsx      # Bolha de mensagem
│   ├── MessageList.tsx        # Lista de mensagens
│   ├── ChatComposer.tsx       # Input de mensagem
│   ├── ThreadItem.tsx         # Item na lista de conversas
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
│ Typing Indicator│ (independente)
└─────────────────┘

┌─────────────────┐
│ Message Status  │ (independente)
└─────────────────┘

┌─────────────────┐
│ Visual Bubbles  │ ──depends──> Message Status (para exibir checks)
└─────────────────┘

┌─────────────────┐
│ Pin/Archive     │ (independente)
└─────────────────┘
```

## Ordem de Implementacao Sugerida

1. **Message Status** - Base para feedback visual
2. **Visual Bubbles** - Depende de Message Status
3. **Typing Indicator** - Independente
4. **Pin/Archive** - Independente

## Prompts de Implementacao

Cada feature tem prompts especificos na pasta [prompts/](./prompts/):
- [PROMPT-01-TYPING-INDICATOR.md](./prompts/PROMPT-01-TYPING-INDICATOR.md)
- [PROMPT-02-MESSAGE-STATUS.md](./prompts/PROMPT-02-MESSAGE-STATUS.md)
- [PROMPT-03-VISUAL-BUBBLES.md](./prompts/PROMPT-03-VISUAL-BUBBLES.md)
- [PROMPT-04-PIN-ARCHIVE.md](./prompts/PROMPT-04-PIN-ARCHIVE.md)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Feedback de envio | Nenhum | Visual imediato |
| Confianca na entrega | Baixa | Alta |
| Engagement (msgs/sessao) | Baseline | +20% |
| Tempo em chat | Baseline | +15% |

## Proximas Fases

- **Fase 02**: Reply/Quote, Reactions, Search, Online Status
- **Fase 03**: Voice Messages, GIFs, Formatting
- **Fase 04**: Bazari Differentiators (Commerce AI)
