/**
 * IncomingCallModal - Modal exibido quando recebe uma chamada
 */

import { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCallStore } from '@/stores/call.store';

export function IncomingCallModal() {
  const { state, remoteProfile, callType, acceptCall, rejectCall } = useCallStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Tocar ringtone quando chamada recebida
  useEffect(() => {
    if (state === 'incoming' && audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {
        // Autoplay blocked
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [state]);

  // Debug log
  console.log('[IncomingCallModal] state:', state, 'remoteProfile:', remoteProfile?.handle);

  if (state !== 'incoming' || !remoteProfile) return null;

  const initials = (remoteProfile.displayName || remoteProfile.handle)
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* Ringtone audio */}
      <audio ref={audioRef} src="/sounds/ringtone.mp3" />

      <div className="bg-card rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
        {/* Avatar */}
        <Avatar className="w-24 h-24">
          <AvatarImage src={remoteProfile.avatarUrl || undefined} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>

        {/* Nome e tipo de chamada */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {remoteProfile.displayName || remoteProfile.handle}
          </h2>
          <p className="text-muted-foreground">
            {callType === 'VOICE' ? 'Chamada de voz' : 'Videochamada'}
          </p>
        </div>

        {/* Animação de toque */}
        <div className="flex gap-2">
          <span className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-3 h-3 bg-primary rounded-full animate-bounce" />
        </div>

        {/* Botões */}
        <div className="flex gap-8">
          {/* Recusar */}
          <button
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
            onClick={rejectCall}
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Aceitar */}
          <button
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors"
            onClick={acceptCall}
          >
            {callType === 'VOICE' ? (
              <Phone className="w-6 h-6" />
            ) : (
              <Video className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
