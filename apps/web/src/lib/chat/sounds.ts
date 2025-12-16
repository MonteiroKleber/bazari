/**
 * Chat Sound Service
 * Gerencia sons de notificação para novas mensagens
 */

class ChatSoundService {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private lastPlayTime: number = 0;
  private debounceMs: number = 1000; // 1 segundo entre sons
  private unlocked: boolean = false;

  constructor() {
    // Carregar preferências
    const savedEnabled = localStorage.getItem('chat_sound_enabled');
    this.enabled = savedEnabled !== 'false';

    const savedVolume = localStorage.getItem('chat_sound_volume');
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }

    // Pré-carregar áudio
    this.initAudio();
  }

  private initAudio(): void {
    if (typeof window === 'undefined') return;

    this.audio = new Audio('/sounds/notification.mp3');
    this.audio.volume = this.volume;
    this.audio.preload = 'auto';

    // Fallback para OGG se MP3 não for suportado
    this.audio.onerror = () => {
      if (this.audio) {
        this.audio.src = '/sounds/notification.ogg';
      }
    };
  }

  /**
   * Desbloqueia reprodução de áudio (necessário em mobile)
   * Deve ser chamado em resposta a interação do usuário
   */
  unlock(): void {
    if (this.unlocked || !this.audio) return;

    // Reproduzir áudio silencioso para desbloquear
    this.audio.volume = 0;
    this.audio.play()
      .then(() => {
        this.audio!.pause();
        this.audio!.currentTime = 0;
        this.audio!.volume = this.volume;
        this.unlocked = true;
        console.log('[ChatSound] Audio unlocked');
      })
      .catch(() => {
        // Ignorar erro silenciosamente
      });
  }

  /**
   * Reproduz som de notificação
   */
  play(): void {
    if (!this.enabled || !this.audio) return;

    // Debounce para evitar múltiplos sons rápidos
    const now = Date.now();
    if (now - this.lastPlayTime < this.debounceMs) {
      return;
    }
    this.lastPlayTime = now;

    // Resetar e reproduzir
    this.audio.currentTime = 0;
    this.audio.play().catch((err) => {
      // Auto-play pode ser bloqueado
      console.warn('[ChatSound] Playback blocked:', err.message);
    });
  }

  /**
   * Verifica se o som está habilitado
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Habilita/desabilita som
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('chat_sound_enabled', String(enabled));
  }

  /**
   * Retorna volume atual (0-1)
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Define volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    localStorage.setItem('chat_sound_volume', String(this.volume));
  }
}

export const chatSoundService = new ChatSoundService();
