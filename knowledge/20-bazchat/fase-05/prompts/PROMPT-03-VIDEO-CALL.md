# Prompt: Implementar Chamada de Video

## Contexto

Voce esta trabalhando no BazChat, o sistema de chat do Bazari. Precisamos estender as chamadas de voz para incluir video.

## Pre-requisito

A feature de Chamada de Voz (`02-VOICE-CALL.md`) DEVE estar implementada antes.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-05/03-VIDEO-CALL.md`

## Tarefa

Estender a infraestrutura de chamadas de voz para suportar video.

## Ordem de Implementacao

### 1. Extensao do WebRTC Service
- Adicionar metodos em `apps/web/src/lib/chat/webrtc.ts`:
  - `toggleVideo()` - Ligar/desligar camera
  - `switchCamera()` - Alternar frontal/traseira
  - `isVideoEnabled()` - Status da camera

### 2. Extensao do Call Store
- Adicionar estados em `call.store.ts`:
  - `isVideoEnabled`
  - `facingMode`
  - `localStream`
- Adicionar actions:
  - `toggleVideo`
  - `switchCamera`

### 3. Frontend - VideoCallOverlay
- Criar `apps/web/src/components/chat/VideoCallOverlay.tsx`
- Video remoto em tela cheia
- Video local em picture-in-picture
- Controles: flip, video, mute, end, fullscreen

### 4. Frontend - CallOverlay Wrapper
- Criar `apps/web/src/components/chat/CallOverlay.tsx`
- Renderiza VideoCallOverlay ou ActiveCallOverlay baseado no tipo

### 5. CSS
- Adicionar classe `.mirror` para espelhar video local

### 6. Tratamento de Permissoes
- Criar `apps/web/src/lib/chat/permissions.ts`
- Verificar permissoes antes de iniciar chamada

### 7. Indicador de Qualidade
- Criar `apps/web/src/components/chat/ConnectionQuality.tsx`
- Monitorar RTT e packet loss

## UI Especifica de Video

```
┌─────────────────────────────────────────┐
│ ┌──────┐                                │
│ │Local │           Status/Timer         │
│ └──────┘                                │
│                                         │
│           [VIDEO REMOTO]                │
│           (tela cheia)                  │
│                                         │
│  [🔄] [📹] [🎤] [📞] [⛶]               │
└─────────────────────────────────────────┘
```

## Controles

| Botao | Funcao |
|-------|--------|
| 🔄 | Alternar camera frontal/traseira |
| 📹 | Ligar/desligar video |
| 🎤 | Mute/unmute audio |
| 📞 | Encerrar chamada |
| ⛶ | Fullscreen |

## Arquivos Principais

```
apps/web/src/
├── lib/chat/
│   ├── webrtc.ts           # Estender
│   └── permissions.ts      # Criar
├── stores/call.store.ts    # Estender
├── components/chat/
│   ├── VideoCallOverlay.tsx    # Criar
│   ├── CallOverlay.tsx         # Criar
│   └── ConnectionQuality.tsx   # Criar
└── index.css               # Adicionar .mirror
```

## Consideracoes

- Video local deve ser espelhado (mirror)
- Controles auto-hide apos 3s
- Fallback para avatar quando camera desligada
- Solicitar permissao de camera antes de atender

## Checklist

- [ ] WebRTC Service estendido com metodos de video
- [ ] Call Store com estados de video
- [ ] VideoCallOverlay renderizando videos
- [ ] Picture-in-picture do video local
- [ ] Controles funcionando (flip, video on/off)
- [ ] Auto-hide de controles
- [ ] Fullscreen funcionando
- [ ] Video espelhado (mirror)
- [ ] Indicador de qualidade
- [ ] Permissoes verificadas antes da chamada
