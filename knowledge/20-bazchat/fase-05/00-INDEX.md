# BazChat - Fase 05: Real-time Communication

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

Esta fase foca em **comunicacao em tempo real** alem de texto: Status/Stories efemeros e Chamadas de Voz/Video via WebRTC.

## Objetivo

Adicionar recursos de comunicacao sincrona e assincrona que elevam o BazChat ao nivel de apps como WhatsApp e Instagram, com diferencial de integracao com economia descentralizada.

## Features da Fase 05

| # | Feature | Complexidade | Impacto | Arquivo |
|---|---------|--------------|---------|---------|
| 1 | Status/Stories | Media | Alto | [01-STATUS-STORIES.md](./01-STATUS-STORIES.md) |
| 2 | Chamada de Voz | Alta | Alto | [02-VOICE-CALL.md](./02-VOICE-CALL.md) |
| 3 | Chamada de Video | Alta | Alto | [03-VIDEO-CALL.md](./03-VIDEO-CALL.md) |

## Nota sobre Edicao de Mensagens

A feature **Edit/Delete Messages** ja foi especificada na [Fase 04](../fase-04/07-EDIT-DELETE-MESSAGES.md).

## Arquitetura Atual (Referencia)

### Frontend
```
apps/web/src/
├── components/chat/
│   ├── MessageBubble.tsx      # Bolha de mensagem
│   ├── MessageList.tsx        # Lista de mensagens
│   ├── ChatComposer.tsx       # Input de mensagem
│   ├── ThreadItem.tsx         # Item na lista de conversas
│   ├── AudioPlayer.tsx        # Player de audio
│   ├── VoiceRecorder.tsx      # Gravador de voz
│   ├── GifPicker.tsx          # Seletor de GIFs
│   ├── FormattedText.tsx      # Formatacao markdown
│   ├── ReactionBar.tsx        # Barra de reacoes
│   ├── QuotedMessage.tsx      # Quote/reply
│   ├── TypingIndicator.tsx    # Indicador de digitacao
│   ├── SearchMessages.tsx     # Busca de mensagens
│   ├── ChatSettings.tsx       # Configuracoes E2EE
│   └── ...
├── pages/chat/
│   ├── ChatInboxPage.tsx      # Lista de conversas
│   ├── ChatThreadPage.tsx     # Tela de conversa
│   └── GroupAdminPage.tsx     # Admin de grupos
├── hooks/
│   └── useChat.ts             # Estado global (Zustand)
└── lib/chat/
    ├── websocket.ts           # Cliente WebSocket
    └── crypto.ts              # E2EE com libsodium
```

### Backend
```
apps/api/src/chat/
├── routes/
│   ├── chat.messages.ts       # Mensagens REST
│   ├── chat.threads.ts        # Threads REST
│   ├── chat.groups.ts         # Grupos REST
│   ├── chat.gifs.ts           # Proxy Tenor
│   ├── chat.reactions.ts      # Reacoes
│   └── chat.upload.ts         # Upload de midia
├── services/
│   └── chat.ts                # Logica de negocio
└── ws/
    └── handlers.ts            # WebSocket handlers
```

## Dependencias Entre Features

```
┌─────────────────────┐
│ Status/Stories      │ (independente)
└─────────────────────┘

┌─────────────────────┐
│ Chamada de Voz      │ ──┐
└─────────────────────┘   │
                          ├── Compartilham infraestrutura WebRTC
┌─────────────────────┐   │
│ Chamada de Video    │ ──┘
└─────────────────────┘
```

## Arquitetura WebRTC

### Fluxo de Sinalizacao

```
┌──────────┐        ┌──────────────┐        ┌──────────┐
│ Usuario A│        │ Servidor     │        │ Usuario B│
└────┬─────┘        │ (WebSocket)  │        └────┬─────┘
     │              └──────┬───────┘              │
     │   call:offer        │                      │
     │────────────────────>│   call:incoming      │
     │                     │─────────────────────>│
     │                     │                      │
     │                     │   call:answer        │
     │   call:answered     │<─────────────────────│
     │<────────────────────│                      │
     │                     │                      │
     │   ice:candidate     │                      │
     │────────────────────>│   ice:candidate      │
     │                     │─────────────────────>│
     │                     │                      │
     │                     │   ice:candidate      │
     │   ice:candidate     │<─────────────────────│
     │<────────────────────│                      │
     │                     │                      │
     │              [Conexao P2P estabelecida]    │
     │<═══════════════════════════════════════════│
     │              Audio/Video direto            │
     │═══════════════════════════════════════════>│
```

### Servidores ICE (Configuracao Inicial)

```typescript
const iceServers = [
  // STUN gratuitos (descoberta de IP publico)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },

  // TURN (relay) - adicionar quando necessario
  // { urls: 'turn:turn.bazari.com:3478', username: '...', credential: '...' },
];
```

## Ordem de Implementacao Sugerida

### Bloco 1: Status/Stories (Independente)
1. **Status/Stories** - Conteudo efemero 24h

### Bloco 2: Chamadas (Sequencial)
2. **Chamada de Voz** - Base WebRTC + UI de chamada
3. **Chamada de Video** - Estende voz com stream de video

## Infraestrutura Necessaria

### Para Status/Stories
- Armazenamento de midia (IPFS existente)
- Cron job para expirar stories (24h)

### Para Chamadas
- WebSocket (ja existe)
- STUN servers (gratuitos do Google)
- TURN server (opcional, para ~15% de conexoes que falham)

### Estimativa de Carga (Chamadas)

| Cenario | Servidor | Acao |
|---------|----------|------|
| < 10 chamadas simultaneas | VPS atual | Apenas sinalizacao |
| 10-50 chamadas | VPS atual | Adicionar TURN |
| 50+ chamadas | VPS dedicado | Separar midia |
| Chamadas em grupo (3+) | SFU | mediasoup/Janus |

## Prompts de Implementacao

Cada feature tem prompts especificos na pasta [prompts/](./prompts/):
- [PROMPT-01-STATUS-STORIES.md](./prompts/PROMPT-01-STATUS-STORIES.md)
- [PROMPT-02-VOICE-CALL.md](./prompts/PROMPT-02-VOICE-CALL.md)
- [PROMPT-03-VIDEO-CALL.md](./prompts/PROMPT-03-VIDEO-CALL.md)

## Metricas de Sucesso

| Metrica | Antes | Depois |
|---------|-------|--------|
| Conteudo efemero | Nenhum | Stories 24h |
| Comunicacao sincrona | Apenas texto | Voz + Video |
| Taxa de conexao chamadas | N/A | > 85% (STUN) |
| Latencia chamadas | N/A | < 300ms |

## Proximas Fases

- **Fase 06**: Chamadas em Grupo (SFU)
- **Fase 07**: Canais/Comunidades
- **Fase 08**: Integracao Commerce (Pagamentos no chat)
