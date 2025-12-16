import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Pause, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // segundos
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 120, // 2 minutos default
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      stopTimer();
      stopMediaStream();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const stopMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setDuration(prev => {
        if (prev >= maxDuration - 1) {
          // Atingiu duração máxima, parar automaticamente
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [maxDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);

        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        stopMediaStream();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Capturar a cada 100ms

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, [startTimer, stopMediaStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
    }
  }, [isRecording, stopTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [isRecording, isPaused, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  }, [isRecording, isPaused, startTimer]);

  const handleSend = useCallback(() => {
    if (audioBlob && duration > 0) {
      onRecordingComplete(audioBlob, duration);
    }
  }, [audioBlob, duration, onRecordingComplete]);

  const handleCancel = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
    stopTimer();
    stopMediaStream();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    onCancel();
  }, [isRecording, audioUrl, onCancel, stopTimer, stopMediaStream]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Estado inicial: botão para começar
  if (!isRecording && !audioBlob) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={startRecording}
        title="Gravar áudio"
        className="text-muted-foreground hover:text-foreground"
      >
        <Mic className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-2">
      {/* Botão Cancelar/Deletar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="h-8 w-8 text-destructive hover:text-destructive"
        title="Cancelar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Indicador de gravação ou preview */}
      {isRecording ? (
        <>
          {/* Animação de gravação */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2 h-2 rounded-full bg-destructive',
                !isPaused && 'animate-pulse'
              )}
            />
            <span className="text-sm font-mono min-w-[50px]">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Botão Pause/Resume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="h-8 w-8"
            title={isPaused ? 'Continuar' : 'Pausar'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>

          {/* Botão Parar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={stopRecording}
            className="h-8 w-8 text-destructive"
            title="Parar gravação"
          >
            <Square className="h-4 w-4" />
          </Button>
        </>
      ) : audioBlob ? (
        <>
          {/* Preview do áudio gravado */}
          <audio
            ref={audioRef}
            src={audioUrl || undefined}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              className="h-8 w-8"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <span className="text-sm font-mono min-w-[50px]">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Botão Enviar */}
          <Button
            size="icon"
            onClick={handleSend}
            className="h-8 w-8"
            title="Enviar áudio"
          >
            <Send className="h-4 w-4" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
