/**
 * ActiveCallOverlay - Overlay exibido durante chamada ativa
 */

import { useEffect, useRef, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCallStore, formatCallDuration } from '@/stores/call.store';

// Helper para criar handler unificado de touch/click
function createTapHandler(action: () => void) {
  let lastTap = 0;
  return {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      // Ignora click se aconteceu logo após touch
      if (now - lastTap > 300) {
        console.log('[TapHandler] onClick fired');
        action();
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      lastTap = Date.now();
      console.log('[TapHandler] onTouchEnd fired');
      action();
    },
  };
}

export function ActiveCallOverlay() {
  const {
    state,
    callType,
    remoteProfile,
    isMuted,
    isVideoOff,
    duration,
    localStream,
    remoteStream,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCallStore();

  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Handlers memoizados para evitar execução duplicada
  const muteHandlers = useCallback(() => createTapHandler(() => {
    console.log('[ActiveCallOverlay] toggleMute called');
    toggleMute();
  }), [toggleMute])();

  const videoHandlers = useCallback(() => createTapHandler(() => {
    console.log('[ActiveCallOverlay] toggleVideo called');
    toggleVideo();
  }), [toggleVideo])();

  const endCallHandlers = useCallback(() => createTapHandler(() => {
    console.log('[ActiveCallOverlay] endCall called');
    endCall();
  }), [endCall])();

  // Conectar audio/video remoto
  useEffect(() => {
    if (remoteStream) {
      if (callType === 'VIDEO' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  // Conectar vídeo local
  useEffect(() => {
    if (localStream && callType === 'VIDEO' && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callType]);

  const isActive = state === 'outgoing' || state === 'connecting' || state === 'connected';

  // Debug log
  console.log('[ActiveCallOverlay] state:', state, 'isActive:', isActive);

  if (!isActive) return null;

  const initials = remoteProfile
    ? (remoteProfile.displayName || remoteProfile.handle)
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col" style={{ zIndex: 9999 }}>
      {/* Audio element (invisível) */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Vídeo remoto (fullscreen) */}
      {callType === 'VIDEO' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Vídeo local (picture-in-picture) */}
      {callType === 'VIDEO' && !isVideoOff && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-4 right-4 w-32 h-48 object-cover rounded-lg border-2 border-white/20 shadow-lg z-10"
        />
      )}

      {/* Content container */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* Status */}
        <div className="text-white/60 text-sm mb-4">
          {state === 'outgoing' && 'Chamando...'}
          {state === 'connecting' && 'Conectando...'}
          {state === 'connected' && formatCallDuration(duration)}
        </div>

        {/* Avatar (apenas para chamada de voz ou antes de conectar vídeo) */}
        {(callType === 'VOICE' || state !== 'connected') && (
          <>
            <Avatar className="w-32 h-32 mb-4">
              <AvatarImage src={remoteProfile?.avatarUrl || undefined} />
              <AvatarFallback className="text-4xl bg-primary/20">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Nome */}
            <h2 className="text-white text-2xl font-semibold mb-2">
              {remoteProfile?.displayName || remoteProfile?.handle || 'Desconhecido'}
            </h2>

            <p className="text-white/60 mb-12">
              {callType === 'VOICE' ? 'Chamada de voz' : 'Videochamada'}
            </p>
          </>
        )}
      </div>

      {/* Controles */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe z-[10000] pointer-events-auto">
        <div className="flex justify-center gap-6 p-8 bg-gradient-to-t from-black/80 to-transparent">
          {/* Mute */}
          <button
            type="button"
            className={`rounded-full w-14 h-14 flex items-center justify-center transition-colors pointer-events-auto select-none ${
              isMuted
                ? 'bg-red-600 active:bg-red-700 text-white'
                : 'bg-white/20 active:bg-white/30 text-white'
            }`}
            style={{ touchAction: 'manipulation' }}
            {...muteHandlers}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 pointer-events-none" />
            ) : (
              <Mic className="w-6 h-6 pointer-events-none" />
            )}
          </button>

          {/* Toggle Video (apenas para videochamada) */}
          {callType === 'VIDEO' && (
            <button
              type="button"
              className={`rounded-full w-14 h-14 flex items-center justify-center transition-colors pointer-events-auto select-none ${
                isVideoOff
                  ? 'bg-red-600 active:bg-red-700 text-white'
                  : 'bg-white/20 active:bg-white/30 text-white'
              }`}
              style={{ touchAction: 'manipulation' }}
              {...videoHandlers}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 pointer-events-none" />
              ) : (
                <Video className="w-6 h-6 pointer-events-none" />
              )}
            </button>
          )}

          {/* Encerrar */}
          <button
            type="button"
            className="rounded-full w-16 h-16 bg-red-600 active:bg-red-700 text-white flex items-center justify-center transition-colors pointer-events-auto select-none"
            style={{ touchAction: 'manipulation' }}
            {...endCallHandlers}
          >
            <PhoneOff className="w-6 h-6 pointer-events-none" />
          </button>
        </div>
      </div>
    </div>
  );
}
