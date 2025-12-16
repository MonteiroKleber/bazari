/**
 * Call Store - Gerencia estado de chamadas de voz/vídeo
 */

import { create } from 'zustand';
import { webrtcManager, WebRTCManager, MediaPermissionError } from '@/lib/chat/webrtc';
import { chatWs } from '@/lib/chat/websocket';
import type { CallType, CallProfile, WsClientMsg } from '@bazari/shared-types';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected';
export type CallError = {
  code: string;
  message: string;
} | null;

interface CallStore {
  // Estado
  state: CallState;
  error: CallError;
  callId: string | null;
  callType: CallType | null;
  threadId: string | null;
  remoteProfile: CallProfile | null;
  isMuted: boolean;
  isVideoOff: boolean;
  duration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  pendingSdp: string | null;
  pendingIceCandidates: RTCIceCandidateInit[]; // Fila de ICE candidates aguardando callId

  // Actions
  startCall: (threadId: string, calleeId: string, callee: CallProfile, type: CallType) => Promise<void>;
  handleIncomingCall: (data: {
    callId: string;
    threadId: string;
    caller: CallProfile;
    type: CallType;
    sdp: string;
  }) => void;
  handleCallRinging: (callId: string) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  handleCallAnswered: (sdp: string) => Promise<void>;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  handleCallEnded: (reason: string, duration?: number) => void;
  clearError: () => void;
  reset: () => void;
}

let durationInterval: NodeJS.Timeout | null = null;

export const useCallStore = create<CallStore>((set, get) => {
  const startDurationTimer = () => {
    if (durationInterval) return;
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
    // Estado inicial
    state: 'idle',
    error: null,
    callId: null,
    callType: null,
    threadId: null,
    remoteProfile: null,
    isMuted: false,
    isVideoOff: false,
    duration: 0,
    localStream: null,
    remoteStream: null,
    pendingSdp: null,
    pendingIceCandidates: [],

    startCall: async (threadId, calleeId, callee, type) => {
      console.log('[CallStore] Starting call', { threadId, calleeId, type });

      // Limpar erro anterior
      set({ error: null });

      try {
        // Obter stream local
        const localStream = await WebRTCManager.getLocalStream(type === 'VIDEO' ? 'video' : 'audio');

        set({
          state: 'outgoing',
          callType: type,
          threadId,
          remoteProfile: callee,
          localStream,
        });

        // Criar peer connection e offer
        const offer = await webrtcManager.startCall({
          callId: '', // Será preenchido quando receber call:ringing
          peerId: calleeId,
          type: type === 'VIDEO' ? 'video' : 'audio',
          localStream,
          onRemoteStream: (stream) => {
            console.log('[CallStore] Remote stream received');
            set({ remoteStream: stream });
          },
          onIceCandidate: (candidate) => {
            const { callId, pendingIceCandidates } = get();
            const candidateInit = candidate.toJSON();
            if (callId) {
              // callId disponível, enviar imediatamente
              console.log('[CallStore] Sending ICE candidate immediately');
              chatWs.send({
                op: 'ice:candidate',
                data: { callId, candidate: candidateInit },
              } as WsClientMsg);
            } else {
              // callId ainda não disponível, enfileirar para enviar depois
              console.log('[CallStore] Queueing ICE candidate (no callId yet), queue size:', pendingIceCandidates.length + 1);
              set({ pendingIceCandidates: [...pendingIceCandidates, candidateInit] });
            }
          },
          onConnectionStateChange: (connectionState) => {
            console.log('[CallStore] Connection state:', connectionState);
            if (connectionState === 'connected') {
              set({ state: 'connected' });
              startDurationTimer();
            } else if (connectionState === 'failed' || connectionState === 'disconnected') {
              get().endCall();
            }
          },
        });

        // Enviar offer via WebSocket
        chatWs.send({
          op: 'call:offer',
          data: {
            threadId,
            calleeId,
            type,
            sdp: JSON.stringify(offer),
          },
        } as WsClientMsg);
      } catch (error: any) {
        console.error('[CallStore] Failed to start call:', error);

        // Tratar erros de permissão de mídia
        if (error instanceof MediaPermissionError) {
          set({
            error: {
              code: error.code,
              message: error.message,
            },
          });
        } else {
          set({
            error: {
              code: 'unknown',
              message: error.message || 'Erro ao iniciar chamada',
            },
          });
        }

        get().reset();
        throw error;
      }
    },

    handleIncomingCall: (data) => {
      console.log('[CallStore] Incoming call', data);

      // Tocar ringtone
      // TODO: Implementar ringtone

      set({
        state: 'incoming',
        callId: data.callId,
        callType: data.type,
        threadId: data.threadId,
        remoteProfile: data.caller,
        pendingSdp: data.sdp,
      });
    },

    handleCallRinging: (callId) => {
      console.log('[CallStore] Call ringing', callId);
      const { pendingIceCandidates } = get();

      // Definir o callId
      set({ callId });

      // Enviar todos os ICE candidates que estavam aguardando
      if (pendingIceCandidates.length > 0) {
        console.log('[CallStore] Sending', pendingIceCandidates.length, 'queued ICE candidates');
        pendingIceCandidates.forEach((candidate, index) => {
          console.log('[CallStore] Sending queued ICE candidate', index + 1, 'of', pendingIceCandidates.length);
          chatWs.send({
            op: 'ice:candidate',
            data: { callId, candidate },
          } as WsClientMsg);
        });
        // Limpar a fila
        set({ pendingIceCandidates: [] });
      }
    },

    acceptCall: async () => {
      const { callId, callType, pendingSdp, remoteProfile } = get();
      if (!callId || !pendingSdp || !remoteProfile) return;

      console.log('[CallStore] Accepting call', callId);

      try {
        set({ state: 'connecting' });

        // Obter stream local
        const localStream = await WebRTCManager.getLocalStream(
          callType === 'VIDEO' ? 'video' : 'audio'
        );

        set({ localStream });

        // Responder chamada
        const answer = await webrtcManager.answerCall(
          {
            callId,
            peerId: remoteProfile.id,
            type: callType === 'VIDEO' ? 'video' : 'audio',
            localStream,
            onRemoteStream: (stream) => {
              console.log('[CallStore] Remote stream received');
              set({ remoteStream: stream });
            },
            onIceCandidate: (candidate) => {
              chatWs.send({
                op: 'ice:candidate',
                data: { callId, candidate: candidate.toJSON() },
              } as WsClientMsg);
            },
            onConnectionStateChange: (connectionState) => {
              console.log('[CallStore] Connection state:', connectionState);
              if (connectionState === 'connected') {
                set({ state: 'connected' });
                startDurationTimer();
              } else if (connectionState === 'failed' || connectionState === 'disconnected') {
                get().endCall();
              }
            },
          },
          JSON.parse(pendingSdp)
        );

        // Enviar answer via WebSocket
        chatWs.send({
          op: 'call:answer',
          data: { callId, sdp: JSON.stringify(answer) },
        } as WsClientMsg);
      } catch (error) {
        console.error('[CallStore] Failed to accept call:', error);
        get().rejectCall();
      }
    },

    rejectCall: () => {
      const { callId } = get();
      console.log('[CallStore] Rejecting call', callId);

      if (callId) {
        chatWs.send({
          op: 'call:reject',
          data: { callId },
        } as WsClientMsg);
      }

      get().reset();
    },

    endCall: () => {
      const { callId, localStream } = get();
      console.log('[CallStore] Ending call', callId);

      if (callId) {
        console.log('[CallStore] Sending call:end to server');
        chatWs.send({
          op: 'call:end',
          data: { callId },
        } as WsClientMsg);
      }

      // Stop local stream tracks
      if (localStream) {
        console.log('[CallStore] Stopping local stream tracks');
        localStream.getTracks().forEach((track) => {
          track.stop();
          console.log('[CallStore] Stopped track:', track.kind);
        });
      }

      webrtcManager.endCall();
      stopDurationTimer();
      get().reset();
      console.log('[CallStore] Call ended and reset');
    },

    toggleMute: () => {
      const { isMuted, localStream } = get();
      console.log('[CallStore] Toggle mute, current:', isMuted);

      // Toggle directly on localStream as well
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = isMuted; // If muted, enable. If not muted, disable.
          console.log('[CallStore] Audio track enabled:', track.enabled);
        });
      }

      webrtcManager.toggleAudio(!isMuted);
      set({ isMuted: !isMuted });
      console.log('[CallStore] Mute toggled to:', !isMuted);
    },

    toggleVideo: () => {
      const { isVideoOff } = get();
      webrtcManager.toggleVideo(isVideoOff);
      set({ isVideoOff: !isVideoOff });
    },

    handleCallAnswered: async (sdp) => {
      console.log('[CallStore] Call answered');
      set({ state: 'connecting' });
      await webrtcManager.handleAnswer(JSON.parse(sdp));
    },

    handleIceCandidate: async (candidate) => {
      console.log('[CallStore] ICE candidate received');
      await webrtcManager.addIceCandidate(candidate);
    },

    handleCallEnded: (reason, duration) => {
      console.log('[CallStore] Call ended', { reason, duration });
      webrtcManager.endCall();
      stopDurationTimer();
      get().reset();

      // TODO: Mostrar toast com motivo do término
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      stopDurationTimer();
      set({
        state: 'idle',
        error: null,
        callId: null,
        callType: null,
        threadId: null,
        remoteProfile: null,
        isMuted: false,
        isVideoOff: false,
        duration: 0,
        localStream: null,
        remoteStream: null,
        pendingSdp: null,
        pendingIceCandidates: [],
      });
    },
  };
});

/**
 * Formata duração em mm:ss
 */
export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
