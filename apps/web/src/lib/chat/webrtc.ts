/**
 * WebRTC Client Library
 * Gerencia conexões P2P de áudio/vídeo via WebRTC
 */

// Configuração de servidores STUN/TURN
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (públicos)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // TODO: Adicionar TURN server próprio se disponível
    // {
    //   urls: 'turn:turn.bazari.com:3478',
    //   username: 'user',
    //   credential: 'pass'
    // }
  ],
};

export interface CallOptions {
  callId: string;
  peerId: string;
  type: 'audio' | 'video';
  localStream: MediaStream;
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  /**
   * Cria uma nova conexão peer-to-peer
   */
  createPeerConnection(options: CallOptions): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    options.localStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, options.localStream);
    });

    this.localStream = options.localStream;

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && options.onIceCandidate) {
        options.onIceCandidate(event.candidate);
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        if (options.onRemoteStream) {
          options.onRemoteStream(event.streams[0]);
        }
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && options.onConnectionStateChange) {
        options.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection) {
        console.log('[WebRTC] ICE connection state:', this.peerConnection.iceConnectionState);
      }
    };

    return this.peerConnection;
  }

  /**
   * Inicia uma chamada (caller side)
   */
  async startCall(options: CallOptions): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection(options);

    // Create offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: options.type === 'video',
    });

    await pc.setLocalDescription(offer);

    return offer;
  }

  /**
   * Responde a uma chamada (callee side)
   */
  async answerCall(
    options: CallOptions,
    remoteOffer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection(options);

    // Set remote description (offer)
    await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }

  /**
   * Processa resposta da chamada (caller side)
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('No peer connection');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Adiciona ICE candidate recebido do peer
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('No peer connection');
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error);
    }
  }

  /**
   * Encerra a chamada e limpa recursos
   */
  endCall(): void {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  /**
   * Muta/desmuta áudio
   */
  toggleAudio(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Liga/desliga vídeo
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Obtém stream local de áudio/vídeo
   */
  static async getLocalStream(type: 'audio' | 'video'): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720 } : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error('[WebRTC] Failed to get media:', error);
      throw error;
    }
  }

  /**
   * Verifica se WebRTC é suportado
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }
}

// Singleton instance
export const webrtcManager = new WebRTCManager();
