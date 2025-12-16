import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  duration?: number; // duração em segundos (se conhecida)
  className?: string;
  isOwn?: boolean;
}

export function AudioPlayer({ src, duration: initialDuration, className, isOwn = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Carregar metadados do áudio - re-executar quando src mudar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    // Reset state quando src muda
    setIsLoading(true);
    setCurrentTime(0);
    setIsPlaying(false);

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      // Fallback caso loadedmetadata não dispare
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      console.error('[AudioPlayer] Failed to load audio:', e);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Forçar reload do áudio quando src muda
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress || duration === 0) return;

    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // Formatar tempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular progresso
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Gerar waveform simulado (barras estáticas)
  const waveformBars = 20;
  const generateWaveformHeights = useCallback(() => {
    // Gerar alturas pseudo-aleatórias baseadas na posição
    return Array.from({ length: waveformBars }, (_, i) => {
      const normalized = Math.sin((i / waveformBars) * Math.PI * 2) * 0.3 + 0.5;
      const random = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
      return Math.abs(normalized + random * 0.3);
    });
  }, []);

  const waveformHeights = generateWaveformHeights();

  return (
    <div className={cn('flex items-center gap-3 min-w-[180px] max-w-[280px]', className)}>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {/* Botão Play/Pause */}
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isOwn
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30'
            : 'bg-primary/10 hover:bg-primary/20',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isPlaying ? (
          <Pause className={cn('h-5 w-5', isOwn ? 'text-primary-foreground' : 'text-primary')} />
        ) : (
          <Play className={cn('h-5 w-5 ml-0.5', isOwn ? 'text-primary-foreground' : 'text-primary')} />
        )}
      </button>

      {/* Waveform e progresso */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="relative h-8 flex items-center gap-[2px] cursor-pointer"
        >
          {waveformHeights.map((height, i) => {
            const barProgress = (i / waveformBars) * 100;
            const isActive = barProgress <= progress;

            return (
              <div
                key={i}
                className={cn(
                  'w-[3px] rounded-full transition-colors',
                  isOwn
                    ? isActive
                      ? 'bg-primary-foreground'
                      : 'bg-primary-foreground/30'
                    : isActive
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                )}
                style={{ height: `${height * 100}%` }}
              />
            );
          })}
        </div>

        {/* Tempo */}
        <div className={cn(
          'text-xs flex justify-between',
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
