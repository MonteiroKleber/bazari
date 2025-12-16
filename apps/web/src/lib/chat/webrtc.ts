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
  private pendingRemoteIceCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet: boolean = false;

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
    this.remoteDescriptionSet = true;
    console.log('[WebRTC] Remote description set (callee)');

    // Processar ICE candidates que chegaram antes
    await this.processPendingIceCandidates();

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
    this.remoteDescriptionSet = true;
    console.log('[WebRTC] Remote description set (caller)');

    // Processar ICE candidates que chegaram antes
    await this.processPendingIceCandidates();
  }

  /**
   * Adiciona ICE candidate recebido do peer
   * Enfileira se remoteDescription ainda não foi setado
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    // Se não há peer connection ou remoteDescription não foi setado, enfileirar
    if (!this.peerConnection || !this.remoteDescriptionSet) {
      console.log('[WebRTC] Queueing remote ICE candidate (remoteDescription not set yet)');
      this.pendingRemoteIceCandidates.push(candidate);
      return;
    }

    try {
      console.log('[WebRTC] Adding ICE candidate');
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error);
    }
  }

  /**
   * Processa ICE candidates que estavam na fila
   */
  private async processPendingIceCandidates(): Promise<void> {
    if (this.pendingRemoteIceCandidates.length === 0) return;

    console.log('[WebRTC] Processing', this.pendingRemoteIceCandidates.length, 'pending ICE candidates');

    const candidates = [...this.pendingRemoteIceCandidates];
    this.pendingRemoteIceCandidates = [];

    for (const candidate of candidates) {
      try {
        if (this.peerConnection) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] Added pending ICE candidate');
        }
      } catch (error) {
        console.error('[WebRTC] Error adding pending ICE candidate:', error);
      }
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

    // Reset state
    this.pendingRemoteIceCandidates = [];
    this.remoteDescriptionSet = false;
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
    } catch (error: any) {
      console.error('[WebRTC] Failed to get media:', error);

      // Tratar erros específicos de permissão
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new MediaPermissionError(
          type === 'video' ? 'camera_denied' : 'microphone_denied',
          `Permissão de ${type === 'video' ? 'câmera' : 'microfone'} negada. Por favor, permita o acesso nas configurações do navegador.`
        );
      }

      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new MediaPermissionError(
          type === 'video' ? 'camera_not_found' : 'microphone_not_found',
          `${type === 'video' ? 'Câmera' : 'Microfone'} não encontrado. Verifique se o dispositivo está conectado.`
        );
      }

      if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new MediaPermissionError(
          'device_in_use',
          'O dispositivo está sendo usado por outro aplicativo. Feche outros apps que usam a câmera/microfone.'
        );
      }

      throw error;
    }
  }

  /**
   * Verifica se WebRTC é suportado
   */
  static isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof RTCPeerConnection !== 'undefined'
    );
  }

  /**
   * Verifica status das permissões de mídia
   */
  static async checkPermissions(): Promise<{
    microphone: PermissionState | 'unsupported';
    camera: PermissionState | 'unsupported';
  }> {
    const result: {
      microphone: PermissionState | 'unsupported';
      camera: PermissionState | 'unsupported';
    } = {
      microphone: 'unsupported',
      camera: 'unsupported',
    };

    if (!navigator.permissions) {
      return result;
    }

    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      result.microphone = micPermission.state;
    } catch {
      // Alguns navegadores não suportam query de microphone
    }

    try {
      const camPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      result.camera = camPermission.state;
    } catch {
      // Alguns navegadores não suportam query de camera
    }

    return result;
  }

  /**
   * Solicita permissão de microfone (útil para pré-autorização)
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Parar todas as tracks imediatamente após obter permissão
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error('[WebRTC] Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Solicita permissão de câmera (útil para pré-autorização)
   */
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Parar todas as tracks imediatamente após obter permissão
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error('[WebRTC] Camera permission denied:', error);
      return false;
    }
  }
}

/**
 * Erro customizado para problemas de permissão de mídia
 */
export class MediaPermissionError extends Error {
  constructor(
    public code:
      | 'microphone_denied'
      | 'camera_denied'
      | 'microphone_not_found'
      | 'camera_not_found'
      | 'device_in_use',
    message: string
  ) {
    super(message);
    this.name = 'MediaPermissionError';
  }
}

// Singleton instance
export const webrtcManager = new WebRTCManager();
