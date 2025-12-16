# Feature: Chamada de Voz

## Resumo

Permitir chamadas de voz 1:1 em tempo real usando WebRTC, com sinalizacao via WebSocket existente.

## User Stories

1. **Como usuario**, quero ligar para um contato diretamente do chat
2. **Como usuario**, quero receber notificacao de chamada recebida
3. **Como usuario**, quero aceitar ou recusar chamadas
4. **Como usuario**, quero ver duracao da chamada em andamento
5. **Como usuario**, quero mutar meu microfone durante a chamada
6. **Como usuario**, quero encerrar a chamada a qualquer momento

## Especificacao Tecnica

### 1. Schema do Banco de Dados

```prisma
// apps/api/prisma/schema.prisma

model Call {
  id            String     @id @default(cuid())
  threadId      String
  thread        ChatThread @relation(fields: [threadId], references: [id])

  callerId      String
  caller        Profile    @relation("CallsCaller", fields: [callerId], references: [id])
  calleeId      String
  callee        Profile    @relation("CallsCallee", fields: [calleeId], references: [id])

  type          CallType   // VOICE, VIDEO
  status        CallStatus // RINGING, ONGOING, ENDED, MISSED, REJECTED
  startedAt     DateTime?  // Quando foi atendida
  endedAt       DateTime?
  duration      Int?       // Duracao em segundos

  createdAt     DateTime   @default(now())

  @@index([threadId])
  @@index([callerId])
  @@index([calleeId])
}

enum CallType {
  VOICE
  VIDEO
}

enum CallStatus {
  RINGING     // Chamando
  ONGOING     // Em andamento
  ENDED       // Encerrada normalmente
  MISSED      // Nao atendida (timeout)
  REJECTED    // Recusada
  BUSY        // Ocupado (ja em outra chamada)
}
```

### 2. WebSocket Events - Sinalizacao

```typescript
// packages/shared-types/src/calls.ts

// ============== Cliente -> Servidor ==============

// Iniciar chamada
export interface WsCallOffer {
  op: 'call:offer';
  data: {
    threadId: string;
    calleeId: string;
    type: 'VOICE' | 'VIDEO';
    sdp: string; // SDP offer
  };
}

// Atender chamada
export interface WsCallAnswer {
  op: 'call:answer';
  data: {
    callId: string;
    sdp: string; // SDP answer
  };
}

// Recusar chamada
export interface WsCallReject {
  op: 'call:reject';
  data: {
    callId: string;
  };
}

// Encerrar chamada
export interface WsCallEnd {
  op: 'call:end';
  data: {
    callId: string;
  };
}

// Enviar ICE candidate
export interface WsIceCandidate {
  op: 'ice:candidate';
  data: {
    callId: string;
    candidate: RTCIceCandidateInit;
  };
}

// ============== Servidor -> Cliente ==============

// Chamada recebida
export interface WsCallIncoming {
  op: 'call:incoming';
  data: {
    callId: string;
    threadId: string;
    caller: {
      id: string;
      handle: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    type: 'VOICE' | 'VIDEO';
    sdp: string;
  };
}

// Chamada atendida
export interface WsCallAnswered {
  op: 'call:answered';
  data: {
    callId: string;
    sdp: string;
  };
}

// Chamada rejeitada
export interface WsCallRejected {
  op: 'call:rejected';
  data: {
    callId: string;
  };
}

// Chamada encerrada
export interface WsCallEnded {
  op: 'call:ended';
  data: {
    callId: string;
    reason: 'ended' | 'missed' | 'busy' | 'error';
    duration?: number;
  };
}

// ICE candidate recebido
export interface WsIceCandidateReceived {
  op: 'ice:candidate';
  data: {
    callId: string;
    candidate: RTCIceCandidateInit;
  };
}

// Chamando (feedback para caller)
export interface WsCallRinging {
  op: 'call:ringing';
  data: {
    callId: string;
  };
}
```

### 3. Backend - WebSocket Handlers

```typescript
// apps/api/src/chat/ws/call-handlers.ts

import { WebSocket } from 'ws';
import { prisma } from '../../lib/prisma';
import { sendToProfile, getConnectionByProfileId } from './handlers';

// Map de chamadas ativas: callId -> { callerId, calleeId, startedAt }
const activeCalls = new Map<string, {
  callerId: string;
  calleeId: string;
  startedAt?: Date;
}>();

// Timeout para chamada nao atendida (30 segundos)
const RING_TIMEOUT = 30000;
const ringTimeouts = new Map<string, NodeJS.Timeout>();

export async function handleCallOffer(
  socket: WebSocket & { profileId: string },
  data: { threadId: string; calleeId: string; type: 'VOICE' | 'VIDEO'; sdp: string }
) {
  const callerId = socket.profileId;
  const { threadId, calleeId, type, sdp } = data;

  // Verificar se callee esta online
  const calleeConn = getConnectionByProfileId(calleeId);
  if (!calleeConn) {
    socket.send(JSON.stringify({
      op: 'call:ended',
      data: { callId: '', reason: 'offline' },
    }));
    return;
  }

  // Verificar se callee ja esta em chamada
  for (const [, call] of activeCalls) {
    if (call.callerId === calleeId || call.calleeId === calleeId) {
      socket.send(JSON.stringify({
        op: 'call:ended',
        data: { callId: '', reason: 'busy' },
      }));
      return;
    }
  }

  // Criar registro da chamada
  const call = await prisma.call.create({
    data: {
      threadId,
      callerId,
      calleeId,
      type,
      status: 'RINGING',
    },
  });

  // Rastrear chamada ativa
  activeCalls.set(call.id, { callerId, calleeId });

  // Buscar dados do caller
  const caller = await prisma.profile.findUnique({
    where: { id: callerId },
    select: { id: true, handle: true, displayName: true, avatarUrl: true },
  });

  // Notificar callee
  sendToProfile(calleeId, {
    op: 'call:incoming',
    data: {
      callId: call.id,
      threadId,
      caller,
      type,
      sdp,
    },
  });

  // Notificar caller que esta chamando
  socket.send(JSON.stringify({
    op: 'call:ringing',
    data: { callId: call.id },
  }));

  // Timeout para chamada perdida
  const timeout = setTimeout(async () => {
    const activeCall = activeCalls.get(call.id);
    if (activeCall && !activeCall.startedAt) {
      // Chamada nao foi atendida
      await endCall(call.id, 'missed');
    }
  }, RING_TIMEOUT);

  ringTimeouts.set(call.id, timeout);
}

export async function handleCallAnswer(
  socket: WebSocket & { profileId: string },
  data: { callId: string; sdp: string }
) {
  const { callId, sdp } = data;
  const profileId = socket.profileId;

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call || call.calleeId !== profileId) return;

  // Limpar timeout
  const timeout = ringTimeouts.get(callId);
  if (timeout) {
    clearTimeout(timeout);
    ringTimeouts.delete(callId);
  }

  // Atualizar status
  const startedAt = new Date();
  await prisma.call.update({
    where: { id: callId },
    data: { status: 'ONGOING', startedAt },
  });

  // Atualizar tracking
  const activeCall = activeCalls.get(callId);
  if (activeCall) {
    activeCall.startedAt = startedAt;
  }

  // Notificar caller
  sendToProfile(call.callerId, {
    op: 'call:answered',
    data: { callId, sdp },
  });
}

export async function handleCallReject(
  socket: WebSocket & { profileId: string },
  data: { callId: string }
) {
  const { callId } = data;
  await endCall(callId, 'rejected');
}

export async function handleCallEnd(
  socket: WebSocket & { profileId: string },
  data: { callId: string }
) {
  const { callId } = data;
  await endCall(callId, 'ended');
}

export async function handleIceCandidate(
  socket: WebSocket & { profileId: string },
  data: { callId: string; candidate: RTCIceCandidateInit }
) {
  const { callId, candidate } = data;
  const profileId = socket.profileId;

  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return;

  // Encaminhar para o outro participante
  const targetId = call.callerId === profileId ? call.calleeId : call.callerId;
  sendToProfile(targetId, {
    op: 'ice:candidate',
    data: { callId, candidate },
  });
}

async function endCall(callId: string, reason: 'ended' | 'missed' | 'rejected' | 'busy') {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return;

  // Limpar timeout
  const timeout = ringTimeouts.get(callId);
  if (timeout) {
    clearTimeout(timeout);
    ringTimeouts.delete(callId);
  }

  // Calcular duracao
  const activeCall = activeCalls.get(callId);
  const duration = activeCall?.startedAt
    ? Math.floor((Date.now() - activeCall.startedAt.getTime()) / 1000)
    : undefined;

  // Atualizar banco
  const status = reason === 'ended' ? 'ENDED'
    : reason === 'missed' ? 'MISSED'
    : reason === 'rejected' ? 'REJECTED'
    : 'BUSY';

  await prisma.call.update({
    where: { id: callId },
    data: {
      status,
      endedAt: new Date(),
      duration,
    },
  });

  // Remover do tracking
  activeCalls.delete(callId);

  // Notificar ambos participantes
  const endData = { callId, reason, duration };
  sendToProfile(call.callerId, { op: 'call:ended', data: endData });
  sendToProfile(call.calleeId, { op: 'call:ended', data: endData });
}

// Limpar chamada quando usuario desconecta
export function handleDisconnect(profileId: string) {
  for (const [callId, call] of activeCalls) {
    if (call.callerId === profileId || call.calleeId === profileId) {
      endCall(callId, 'ended');
    }
  }
}
```

### 4. Frontend - WebRTC Service

```typescript
// apps/web/src/lib/chat/webrtc.ts

export interface RTCConfig {
  iceServers: RTCIceServer[];
}

const DEFAULT_CONFIG: RTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private onRemoteStream?: (stream: MediaStream) => void;
  private onIceCandidate?: (candidate: RTCIceCandidate) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

  constructor(
    private config: RTCConfig = DEFAULT_CONFIG,
    callbacks?: {
      onRemoteStream?: (stream: MediaStream) => void;
      onIceCandidate?: (candidate: RTCIceCandidate) => void;
      onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    }
  ) {
    this.onRemoteStream = callbacks?.onRemoteStream;
    this.onIceCandidate = callbacks?.onIceCandidate;
    this.onConnectionStateChange = callbacks?.onConnectionStateChange;
  }

  async startLocalStream(video: boolean = false): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });
    return this.localStream;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.peerConnection = this.createPeerConnection();

    // Adicionar tracks locais
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    return offer;
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.peerConnection = this.createPeerConnection();

    // Adicionar tracks locais
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return answer;
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(pc.connectionState);
      }
    };

    return pc;
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // true = muted
    }
    return false;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  close(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }
}
```

### 5. Frontend - Call Store (Zustand)

```typescript
// apps/web/src/stores/call.store.ts

import { create } from 'zustand';
import { WebRTCService } from '@/lib/chat/webrtc';
import { chatWs } from '@/lib/chat/websocket';

type CallState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected';

interface CallStore {
  state: CallState;
  callId: string | null;
  callType: 'VOICE' | 'VIDEO' | null;
  remoteProfile: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  isMuted: boolean;
  duration: number;
  rtcService: WebRTCService | null;
  remoteStream: MediaStream | null;

  // Actions
  startCall: (threadId: string, calleeId: string, type: 'VOICE' | 'VIDEO') => Promise<void>;
  handleIncomingCall: (data: {
    callId: string;
    caller: any;
    type: 'VOICE' | 'VIDEO';
    sdp: string;
  }) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  handleCallAnswered: (sdp: string) => Promise<void>;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  handleCallEnded: (reason: string) => void;
  reset: () => void;
}

export const useCallStore = create<CallStore>((set, get) => {
  let durationInterval: NodeJS.Timeout | null = null;

  const startDurationTimer = () => {
    durationInterval = setInterval(() => {
      set(state => ({ duration: state.duration + 1 }));
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  };

  return {
    state: 'idle',
    callId: null,
    callType: null,
    remoteProfile: null,
    isMuted: false,
    duration: 0,
    rtcService: null,
    remoteStream: null,

    startCall: async (threadId, calleeId, type) => {
      const rtcService = new WebRTCService(undefined, {
        onRemoteStream: (stream) => set({ remoteStream: stream }),
        onIceCandidate: (candidate) => {
          const { callId } = get();
          if (callId) {
            chatWs.send({
              op: 'ice:candidate',
              data: { callId, candidate: candidate.toJSON() },
            });
          }
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            set({ state: 'connected' });
            startDurationTimer();
          } else if (state === 'failed' || state === 'disconnected') {
            get().endCall();
          }
        },
      });

      set({ rtcService, state: 'outgoing', callType: type });

      await rtcService.startLocalStream(type === 'VIDEO');
      const offer = await rtcService.createOffer();

      chatWs.send({
        op: 'call:offer',
        data: { threadId, calleeId, type, sdp: JSON.stringify(offer) },
      });
    },

    handleIncomingCall: (data) => {
      const { callId, caller, type, sdp } = data;
      const rtcService = new WebRTCService(undefined, {
        onRemoteStream: (stream) => set({ remoteStream: stream }),
        onIceCandidate: (candidate) => {
          chatWs.send({
            op: 'ice:candidate',
            data: { callId, candidate: candidate.toJSON() },
          });
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            set({ state: 'connected' });
            startDurationTimer();
          } else if (state === 'failed' || state === 'disconnected') {
            get().endCall();
          }
        },
      });

      set({
        state: 'incoming',
        callId,
        callType: type,
        remoteProfile: caller,
        rtcService,
      });

      // Armazenar SDP para usar quando aceitar
      (rtcService as any)._pendingSdp = sdp;
    },

    acceptCall: async () => {
      const { rtcService, callId, callType } = get();
      if (!rtcService || !callId) return;

      set({ state: 'connecting' });

      await rtcService.startLocalStream(callType === 'VIDEO');

      const pendingSdp = (rtcService as any)._pendingSdp;
      const answer = await rtcService.handleOffer(JSON.parse(pendingSdp));

      chatWs.send({
        op: 'call:answer',
        data: { callId, sdp: JSON.stringify(answer) },
      });
    },

    rejectCall: () => {
      const { callId } = get();
      if (callId) {
        chatWs.send({ op: 'call:reject', data: { callId } });
      }
      get().reset();
    },

    endCall: () => {
      const { callId, rtcService } = get();
      if (callId) {
        chatWs.send({ op: 'call:end', data: { callId } });
      }
      if (rtcService) {
        rtcService.close();
      }
      stopDurationTimer();
      get().reset();
    },

    toggleMute: () => {
      const { rtcService } = get();
      if (rtcService) {
        const isMuted = rtcService.toggleMute();
        set({ isMuted });
      }
    },

    handleCallAnswered: async (sdp) => {
      const { rtcService } = get();
      if (rtcService) {
        set({ state: 'connecting' });
        await rtcService.handleAnswer(JSON.parse(sdp));
      }
    },

    handleIceCandidate: async (candidate) => {
      const { rtcService } = get();
      if (rtcService) {
        await rtcService.addIceCandidate(candidate);
      }
    },

    handleCallEnded: (reason) => {
      const { rtcService } = get();
      if (rtcService) {
        rtcService.close();
      }
      stopDurationTimer();
      // TODO: Mostrar toast com motivo
      get().reset();
    },

    reset: () => {
      stopDurationTimer();
      set({
        state: 'idle',
        callId: null,
        callType: null,
        remoteProfile: null,
        isMuted: false,
        duration: 0,
        rtcService: null,
        remoteStream: null,
      });
    },
  };
});
```

### 6. Frontend - Componentes UI

#### CallButton (Botao para iniciar chamada)

```typescript
// apps/web/src/components/chat/CallButton.tsx

import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallStore } from '@/stores/call.store';

interface CallButtonProps {
  threadId: string;
  calleeId: string;
  type: 'VOICE' | 'VIDEO';
}

export function CallButton({ threadId, calleeId, type }: CallButtonProps) {
  const { state, startCall } = useCallStore();
  const isIdle = state === 'idle';

  const handleClick = () => {
    if (isIdle) {
      startCall(threadId, calleeId, type);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={!isIdle}
      title={type === 'VOICE' ? 'Chamada de voz' : 'Videochamada'}
    >
      {type === 'VOICE' ? (
        <Phone className="h-5 w-5" />
      ) : (
        <Video className="h-5 w-5" />
      )}
    </Button>
  );
}
```

#### IncomingCallModal

```typescript
// apps/web/src/components/chat/IncomingCallModal.tsx

import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCallStore } from '@/stores/call.store';

export function IncomingCallModal() {
  const { state, remoteProfile, callType, acceptCall, rejectCall } = useCallStore();

  if (state !== 'incoming' || !remoteProfile) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-card rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
        {/* Avatar */}
        <Avatar
          src={remoteProfile.avatarUrl}
          alt={remoteProfile.displayName || remoteProfile.handle}
          className="w-24 h-24"
        />

        {/* Nome */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {remoteProfile.displayName || remoteProfile.handle}
          </h2>
          <p className="text-muted-foreground">
            {callType === 'VOICE' ? 'Chamada de voz' : 'Videochamada'}
          </p>
        </div>

        {/* Animacao de toque */}
        <div className="flex gap-2">
          <span className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-3 h-3 bg-primary rounded-full animate-bounce" />
        </div>

        {/* Botoes */}
        <div className="flex gap-8">
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16"
            onClick={rejectCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
            onClick={acceptCall}
          >
            {callType === 'VOICE' ? (
              <Phone className="w-6 h-6" />
            ) : (
              <Video className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### ActiveCallOverlay

```typescript
// apps/web/src/components/chat/ActiveCallOverlay.tsx

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCallStore } from '@/stores/call.store';
import { formatDuration } from '@/lib/utils';

export function ActiveCallOverlay() {
  const {
    state,
    callType,
    remoteProfile,
    isMuted,
    duration,
    remoteStream,
    endCall,
    toggleMute,
  } = useCallStore();

  const audioRef = useRef<HTMLAudioElement>(null);

  // Conectar audio remoto
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isActive = state === 'outgoing' || state === 'connecting' || state === 'connected';
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
      {/* Audio element (invisivel) */}
      <audio ref={audioRef} autoPlay />

      {/* Status */}
      <div className="text-white/60 text-sm mb-4">
        {state === 'outgoing' && 'Chamando...'}
        {state === 'connecting' && 'Conectando...'}
        {state === 'connected' && formatDuration(duration)}
      </div>

      {/* Avatar */}
      <Avatar
        src={remoteProfile?.avatarUrl}
        alt={remoteProfile?.displayName || remoteProfile?.handle || ''}
        className="w-32 h-32 mb-4"
      />

      {/* Nome */}
      <h2 className="text-white text-2xl font-semibold mb-2">
        {remoteProfile?.displayName || remoteProfile?.handle}
      </h2>

      <p className="text-white/60 mb-12">
        {callType === 'VOICE' ? 'Chamada de voz' : 'Videochamada'}
      </p>

      {/* Controles */}
      <div className="flex gap-6">
        {/* Mute */}
        <Button
          size="lg"
          variant={isMuted ? 'destructive' : 'secondary'}
          className="rounded-full w-14 h-14"
          onClick={toggleMute}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>

        {/* Encerrar */}
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full w-16 h-16"
          onClick={endCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
```

### 7. Integracao com WebSocket

```typescript
// apps/web/src/hooks/useChat.ts - Adicionar handlers

// No handleMessage:
case 'call:incoming': {
  const { callId, caller, type, sdp } = msg.data;
  useCallStore.getState().handleIncomingCall({ callId, caller, type, sdp });
  // Tocar som de chamada
  playRingtone();
  break;
}

case 'call:ringing': {
  const { callId } = msg.data;
  set({ callId }); // ou no callStore
  break;
}

case 'call:answered': {
  const { sdp } = msg.data;
  useCallStore.getState().handleCallAnswered(sdp);
  stopRingtone();
  break;
}

case 'call:ended': {
  const { reason } = msg.data;
  useCallStore.getState().handleCallEnded(reason);
  stopRingtone();
  break;
}

case 'ice:candidate': {
  const { candidate } = msg.data;
  useCallStore.getState().handleIceCandidate(candidate);
  break;
}
```

## UI/UX Specs

### Botoes no Header do Chat

```
┌─────────────────────────────────────────────────────────────┐
│ [<] João Silva                              [📞] [📹] [⋮]   │
└─────────────────────────────────────────────────────────────┘
```

### Tela de Chamada Ativa (Voz)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                       Conectando...                         │
│                                                             │
│                      ┌──────────┐                           │
│                      │          │                           │
│                      │  Avatar  │                           │
│                      │          │                           │
│                      └──────────┘                           │
│                                                             │
│                      João Silva                             │
│                    Chamada de voz                           │
│                                                             │
│                                                             │
│              [🎤]            [📞]                            │
│              mute           encerrar                        │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

### Backend
- `apps/api/prisma/schema.prisma` - Modelo Call
- `apps/api/src/chat/ws/call-handlers.ts` - Handlers WebSocket
- `apps/api/src/chat/ws/handlers.ts` - Integrar call handlers

### Frontend
- `apps/web/src/lib/chat/webrtc.ts` - Service WebRTC
- `apps/web/src/stores/call.store.ts` - Estado da chamada
- `apps/web/src/components/chat/CallButton.tsx` - Botao
- `apps/web/src/components/chat/IncomingCallModal.tsx` - Modal recebendo
- `apps/web/src/components/chat/ActiveCallOverlay.tsx` - Overlay ativo
- `apps/web/src/hooks/useChat.ts` - Handlers WS

### Shared
- `packages/shared-types/src/calls.ts` - Tipos

## Testes

- [ ] Iniciar chamada de voz
- [ ] Receber chamada (modal aparece)
- [ ] Aceitar chamada
- [ ] Recusar chamada
- [ ] Audio bidirecional funciona
- [ ] Mute/unmute
- [ ] Encerrar chamada (ambos lados)
- [ ] Timeout de chamada nao atendida (30s)
- [ ] Chamada quando offline mostra erro
- [ ] Chamada quando ocupado mostra erro
- [ ] Reconexao apos perda de conexao
