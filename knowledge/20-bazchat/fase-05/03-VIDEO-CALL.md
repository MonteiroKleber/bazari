# Feature: Chamada de Video

## Resumo

Estender a chamada de voz para incluir video, reutilizando a infraestrutura WebRTC ja implementada.

## Dependencias

- **Requer**: Chamada de Voz ([02-VOICE-CALL.md](./02-VOICE-CALL.md)) implementada

## User Stories

1. **Como usuario**, quero fazer videochamada com um contato
2. **Como usuario**, quero alternar entre camera frontal e traseira
3. **Como usuario**, quero desligar minha camera mantendo audio
4. **Como usuario**, quero ver o video do outro participante em tela cheia
5. **Como usuario**, quero ver meu proprio video em um preview menor

## Especificacao Tecnica

### 1. Extensao do WebRTC Service

```typescript
// apps/web/src/lib/chat/webrtc.ts - Adicionar metodos

export class WebRTCService {
  // ... codigo existente da chamada de voz ...

  private videoEnabled: boolean = true;
  private facingMode: 'user' | 'environment' = 'user';

  // Alternar camera ligada/desligada
  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.videoEnabled = videoTrack.enabled;
      return this.videoEnabled;
    }
    return false;
  }

  // Alternar camera frontal/traseira
  async switchCamera(): Promise<void> {
    if (!this.localStream || !this.peerConnection) return;

    // Parar video atual
    const oldVideoTrack = this.localStream.getVideoTracks()[0];
    if (oldVideoTrack) {
      oldVideoTrack.stop();
    }

    // Alternar modo
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';

    // Obter novo stream de video
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: this.facingMode },
    });

    const newVideoTrack = newStream.getVideoTracks()[0];

    // Substituir no stream local
    this.localStream.removeTrack(oldVideoTrack);
    this.localStream.addTrack(newVideoTrack);

    // Substituir no peer connection
    const sender = this.peerConnection.getSenders().find(
      s => s.track?.kind === 'video'
    );
    if (sender) {
      await sender.replaceTrack(newVideoTrack);
    }
  }

  isVideoEnabled(): boolean {
    return this.videoEnabled;
  }

  getFacingMode(): 'user' | 'environment' {
    return this.facingMode;
  }
}
```

### 2. Extensao do Call Store

```typescript
// apps/web/src/stores/call.store.ts - Adicionar estados e actions

interface CallStore {
  // ... estados existentes ...
  isVideoEnabled: boolean;
  facingMode: 'user' | 'environment';
  localStream: MediaStream | null;

  // ... actions existentes ...
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
}

// Implementacao adicional:
toggleVideo: () => {
  const { rtcService } = get();
  if (rtcService) {
    const isEnabled = rtcService.toggleVideo();
    set({ isVideoEnabled: isEnabled });
  }
},

switchCamera: async () => {
  const { rtcService } = get();
  if (rtcService) {
    await rtcService.switchCamera();
    set({ facingMode: rtcService.getFacingMode() });
  }
},
```

### 3. Frontend - VideoCallOverlay

```typescript
// apps/web/src/components/chat/VideoCallOverlay.tsx

import { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallStore } from '@/stores/call.store';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function VideoCallOverlay() {
  const {
    state,
    callType,
    remoteProfile,
    isMuted,
    isVideoEnabled,
    duration,
    localStream,
    remoteStream,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Conectar videos
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-hide controls apos 3s
  useEffect(() => {
    if (state !== 'connected') return;

    const timeout = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timeout);
  }, [state, showControls]);

  const handleTouch = () => {
    setShowControls(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const isActive = state === 'outgoing' || state === 'connecting' || state === 'connected';
  if (!isActive || callType !== 'VIDEO') return null;

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={handleTouch}
    >
      {/* Video remoto (tela cheia) */}
      <div className="flex-1 relative">
        {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          // Fallback: avatar quando video desligado
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-white">
                  {remoteProfile?.displayName?.[0] || remoteProfile?.handle?.[0] || '?'}
                </span>
              </div>
              <p className="text-white text-lg">
                {remoteProfile?.displayName || remoteProfile?.handle}
              </p>
              <p className="text-white/60 text-sm">Camera desligada</p>
            </div>
          </div>
        )}

        {/* Video local (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-32 h-44 rounded-lg overflow-hidden bg-gray-800 shadow-lg">
          {localStream && isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white/60" />
            </div>
          )}
        </div>

        {/* Status overlay */}
        <div
          className={cn(
            'absolute top-4 left-4 transition-opacity',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="bg-black/50 rounded-lg px-3 py-2">
            <p className="text-white font-medium">
              {remoteProfile?.displayName || remoteProfile?.handle}
            </p>
            <p className="text-white/60 text-sm">
              {state === 'outgoing' && 'Chamando...'}
              {state === 'connecting' && 'Conectando...'}
              {state === 'connected' && formatDuration(duration)}
            </p>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex justify-center gap-4">
          {/* Alternar camera */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-14 h-14"
            onClick={(e) => {
              e.stopPropagation();
              switchCamera();
            }}
          >
            <SwitchCamera className="w-6 h-6" />
          </Button>

          {/* Toggle video */}
          <Button
            size="lg"
            variant={isVideoEnabled ? 'secondary' : 'destructive'}
            className="rounded-full w-14 h-14"
            onClick={(e) => {
              e.stopPropagation();
              toggleVideo();
            }}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </Button>

          {/* Toggle mute */}
          <Button
            size="lg"
            variant={isMuted ? 'destructive' : 'secondary'}
            className="rounded-full w-14 h-14"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              endCall();
            }}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          {/* Fullscreen */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-14 h-14"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
          >
            {isFullscreen ? (
              <Minimize2 className="w-6 h-6" />
            ) : (
              <Maximize2 className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 4. CSS para Video Espelhado

```css
/* apps/web/src/index.css ou globals.css */

.mirror {
  transform: scaleX(-1);
}
```

### 5. Componente Unificado de Overlay

```typescript
// apps/web/src/components/chat/CallOverlay.tsx

import { useCallStore } from '@/stores/call.store';
import { ActiveCallOverlay } from './ActiveCallOverlay';
import { VideoCallOverlay } from './VideoCallOverlay';

export function CallOverlay() {
  const { state, callType } = useCallStore();

  const isActive = state === 'outgoing' || state === 'connecting' || state === 'connected';

  if (!isActive) return null;

  if (callType === 'VIDEO') {
    return <VideoCallOverlay />;
  }

  return <ActiveCallOverlay />;
}
```

### 6. Tratamento de Permissoes

```typescript
// apps/web/src/lib/chat/permissions.ts

export async function requestMediaPermissions(video: boolean = false): Promise<{
  granted: boolean;
  error?: string;
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });

    // Parar imediatamente (so queríamos verificar permissao)
    stream.getTracks().forEach(track => track.stop());

    return { granted: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return {
        granted: false,
        error: 'Permissao negada. Habilite o acesso ao microfone' +
          (video ? ' e camera' : '') +
          ' nas configuracoes do navegador.',
      };
    }
    if (err.name === 'NotFoundError') {
      return {
        granted: false,
        error: video
          ? 'Microfone ou camera nao encontrados.'
          : 'Microfone nao encontrado.',
      };
    }
    return {
      granted: false,
      error: 'Erro ao acessar dispositivos de midia.',
    };
  }
}

// Verificar antes de iniciar chamada
export async function checkCallPermissions(type: 'VOICE' | 'VIDEO'): Promise<boolean> {
  const { granted, error } = await requestMediaPermissions(type === 'VIDEO');

  if (!granted && error) {
    // Mostrar toast de erro
    toast.error(error);
    return false;
  }

  return granted;
}
```

### 7. Modal de Chamada Recebida (Video)

```typescript
// apps/web/src/components/chat/IncomingCallModal.tsx - Atualizar

// Adicionar preview de video para videochamadas:

{callType === 'VIDEO' && (
  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
    <Video className="w-4 h-4" />
    <span>Videochamada - sua camera sera ativada ao atender</span>
  </div>
)}
```

### 8. Indicador de Qualidade de Conexao

```typescript
// apps/web/src/components/chat/ConnectionQuality.tsx

import { useEffect, useState } from 'react';
import { Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { useCallStore } from '@/stores/call.store';

export function ConnectionQuality() {
  const { rtcService, state } = useCallStore();
  const [quality, setQuality] = useState<'good' | 'medium' | 'poor'>('good');

  useEffect(() => {
    if (state !== 'connected' || !rtcService) return;

    const interval = setInterval(async () => {
      const pc = (rtcService as any).peerConnection as RTCPeerConnection;
      if (!pc) return;

      const stats = await pc.getStats();
      let roundTripTime = 0;
      let packetsLost = 0;

      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = report.currentRoundTripTime * 1000; // ms
        }
        if (report.type === 'inbound-rtp') {
          packetsLost = report.packetsLost || 0;
        }
      });

      // Determinar qualidade baseado em RTT e packet loss
      if (roundTripTime < 150 && packetsLost < 10) {
        setQuality('good');
      } else if (roundTripTime < 300 && packetsLost < 50) {
        setQuality('medium');
      } else {
        setQuality('poor');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [rtcService, state]);

  const Icon = quality === 'good'
    ? SignalHigh
    : quality === 'medium'
    ? SignalMedium
    : SignalLow;

  const color = quality === 'good'
    ? 'text-green-500'
    : quality === 'medium'
    ? 'text-yellow-500'
    : 'text-red-500';

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs">
        {quality === 'good' && 'Boa'}
        {quality === 'medium' && 'Media'}
        {quality === 'poor' && 'Fraca'}
      </span>
    </div>
  );
}
```

## UI/UX Specs

### Tela de Videochamada

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                │
│ │ Voce     │                          ┌─────────────────┐   │
│ │ (local)  │                          │ Status          │   │
│ └──────────┘                          │ 02:34           │   │
│                                       └─────────────────┘   │
│                                                             │
│                   ┌─────────────────┐                       │
│                   │                 │                       │
│                   │  Video Remoto   │                       │
│                   │  (tela cheia)   │                       │
│                   │                 │                       │
│                   └─────────────────┘                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [🔄]    [📹]    [🎤]    [📞]    [⛶]                     │ │
│ │  flip    video   mute    end     full                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Estados Visuais

| Estado | Video Local | Video Remoto | Controles |
|--------|-------------|--------------|-----------|
| Chamando | Visivel | Placeholder | Apenas encerrar |
| Conectando | Visivel | Loading | Todos |
| Conectado | Visivel | Stream | Todos |
| Camera off | Icon | Stream | Todos |

### Gestos Mobile

- **Toque**: Mostrar/esconder controles
- **Duplo toque**: Alternar fullscreen
- **Swipe down**: Minimizar (picture-in-picture nativo se disponivel)

## Arquivos a Criar/Modificar

### Frontend
- `apps/web/src/lib/chat/webrtc.ts` - Adicionar metodos de video
- `apps/web/src/stores/call.store.ts` - Estados de video
- `apps/web/src/components/chat/VideoCallOverlay.tsx` - UI video
- `apps/web/src/components/chat/CallOverlay.tsx` - Wrapper unificado
- `apps/web/src/components/chat/ConnectionQuality.tsx` - Indicador
- `apps/web/src/lib/chat/permissions.ts` - Verificacao de permissoes
- `apps/web/src/index.css` - Classe .mirror

## Consideracoes de Performance

### Mobile
- Limitar resolucao de video em conexoes lentas
- Desabilitar video automaticamente se qualidade cair muito
- Preferir VP8 sobre VP9 em dispositivos mais fracos

### Bateria
- Desligar camera quando app em background
- Reduzir frame rate se bateria baixa

```typescript
// Configuracao adaptativa
const videoConstraints = {
  width: { ideal: 640, max: 1280 },
  height: { ideal: 480, max: 720 },
  frameRate: { ideal: 24, max: 30 },
};

// Detectar bateria baixa
if ('getBattery' in navigator) {
  const battery = await (navigator as any).getBattery();
  if (battery.level < 0.2) {
    videoConstraints.frameRate = { ideal: 15, max: 20 };
  }
}
```

## Testes

- [ ] Iniciar videochamada
- [ ] Video local aparece no preview
- [ ] Video remoto aparece em tela cheia
- [ ] Alternar camera frontal/traseira
- [ ] Desligar/ligar camera
- [ ] Mute/unmute audio
- [ ] Controles aparecem/escondem
- [ ] Fullscreen funciona
- [ ] Indicador de qualidade funciona
- [ ] Fallback quando camera desligada
- [ ] Permissoes solicitadas corretamente
- [ ] Erro tratado quando permissao negada
- [ ] Video espelhado (mirror) no preview local
