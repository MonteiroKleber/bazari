# Prompt: Implementar Chamada de Voz

## Contexto

Voce esta trabalhando no BazChat, o sistema de chat do Bazari. Precisamos implementar chamadas de voz 1:1 usando WebRTC.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-05/02-VOICE-CALL.md`

## Tarefa

Implementar chamadas de voz usando WebRTC com sinalizacao via WebSocket existente.

## Ordem de Implementacao

### 1. Backend - Schema
- Adicionar modelo `Call` no Prisma
- Executar migration

### 2. Backend - WebSocket Handlers
- Criar `apps/api/src/chat/ws/call-handlers.ts`
- Implementar handlers:
  - `call:offer` - Iniciar chamada
  - `call:answer` - Atender chamada
  - `call:reject` - Recusar chamada
  - `call:end` - Encerrar chamada
  - `ice:candidate` - Trocar ICE candidates

### 3. Shared Types
- Criar `packages/shared-types/src/calls.ts`
- Definir tipos de mensagens WebSocket

### 4. Frontend - WebRTC Service
- Criar `apps/web/src/lib/chat/webrtc.ts`
- Implementar classe WebRTCService

### 5. Frontend - Call Store
- Criar `apps/web/src/stores/call.store.ts`
- Gerenciar estado da chamada com Zustand

### 6. Frontend - UI Components
- `CallButton.tsx` - Botao no header do chat
- `IncomingCallModal.tsx` - Modal de chamada recebida
- `ActiveCallOverlay.tsx` - Overlay durante chamada

### 7. Frontend - Integracao
- Adicionar handlers WebSocket em useChat.ts
- Adicionar CallButton no header do ChatThreadPage

## Configuracao ICE

Usar STUN servers gratuitos do Google:
```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
```

## Fluxo de Chamada

```
1. Usuario A clica em "Ligar"
2. Frontend cria offer WebRTC
3. Envia via WebSocket (call:offer)
4. Usuario B recebe (call:incoming)
5. Usuario B aceita -> cria answer
6. Envia via WebSocket (call:answer)
7. Trocam ICE candidates
8. Conexao P2P estabelecida
9. Audio flui diretamente entre usuarios
```

## Arquivos Principais

```
apps/api/
├── prisma/schema.prisma              # Modelo Call
└── src/chat/ws/call-handlers.ts      # Handlers WS

apps/web/src/
├── lib/chat/webrtc.ts               # WebRTC Service
├── stores/call.store.ts             # Estado
└── components/chat/
    ├── CallButton.tsx
    ├── IncomingCallModal.tsx
    └── ActiveCallOverlay.tsx
```

## Checklist

- [ ] Schema atualizado e migration executada
- [ ] Handlers WebSocket implementados
- [ ] WebRTC Service funcionando
- [ ] Call Store gerenciando estado
- [ ] Botao de chamada no header
- [ ] Modal de chamada recebida
- [ ] Overlay de chamada ativa
- [ ] Audio bidirecional funcionando
- [ ] Mute/unmute funcionando
- [ ] Timeout de chamada nao atendida
- [ ] Historico de chamadas salvo no banco
