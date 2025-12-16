/**
 * CallButton - Botão para iniciar chamada de voz/vídeo
 */

import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallStore } from '@/stores/call.store';
import { WebRTCManager, MediaPermissionError } from '@/lib/chat/webrtc';
import { toast } from 'sonner';
import type { CallType, CallProfile } from '@bazari/shared-types';

interface CallButtonProps {
  threadId: string;
  calleeId: string;
  callee: CallProfile;
  type: CallType;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function CallButton({
  threadId,
  calleeId,
  callee,
  type,
  variant = 'ghost',
  size = 'icon',
  className,
}: CallButtonProps) {
  const { state, startCall } = useCallStore();
  const isIdle = state === 'idle';

  // Verificar suporte a WebRTC
  const isSupported = WebRTCManager.isSupported();

  const handleClick = async () => {
    if (!isIdle || !isSupported) return;

    try {
      await startCall(threadId, calleeId, callee, type);
    } catch (error: any) {
      console.error('Failed to start call:', error);

      // Mostrar toast com mensagem de erro apropriada
      if (error instanceof MediaPermissionError) {
        toast.error('Permissão necessária', {
          description: error.message,
        });
      } else {
        toast.error('Erro ao iniciar chamada', {
          description: error.message || 'Não foi possível iniciar a chamada. Tente novamente.',
        });
      }
    }
  };

  if (!isSupported) {
    return null; // Não mostrar botão se WebRTC não é suportado
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={!isIdle}
      title={type === 'VOICE' ? 'Chamada de voz' : 'Videochamada'}
      className={className}
    >
      {type === 'VOICE' ? (
        <Phone className="h-5 w-5" />
      ) : (
        <Video className="h-5 w-5" />
      )}
    </Button>
  );
}
