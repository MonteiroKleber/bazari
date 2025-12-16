import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Eye, Pause, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Story, StoryFeedItem } from '@bazari/shared-types';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Helper para construir URL do IPFS
const getIpfsUrl = (cid: string) => {
  const gateway = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://bazari.libervia.xyz/ipfs/';
  console.log('[StoryViewer] IPFS URL:', `${gateway}${cid}`, 'Gateway:', gateway);
  return `${gateway}${cid}`;
};

interface StoryViewerProps {
  feedItem: StoryFeedItem;
  initialIndex?: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

const STORY_DURATION = 5000; // 5 segundos para imagens/texto

export function StoryViewer({
  feedItem,
  initialIndex = 0,
  onClose,
  onNext,
  onPrev,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [reply, setReply] = useState('');
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const { profile, stories, isOwn } = feedItem;
  const story = stories[currentIndex];
  const duration = story.type === 'VIDEO' ? (story.duration || 15) * 1000 : STORY_DURATION;

  console.log('[StoryViewer] Rendering story:', {
    type: story.type,
    mediaCid: story.mediaCid,
    hasMediaCid: !!story.mediaCid,
    text: story.text
  });

  // Registrar visualização
  useEffect(() => {
    if (!isOwn && story.id) {
      api.post(`/api/stories/${story.id}/view`).catch(console.error);
    }
  }, [story.id, isOwn]);

  // Progress bar automático
  useEffect(() => {
    if (isPaused) return;

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Próximo story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            // Fim dos stories deste usuário
            if (onNext) {
              onNext();
            } else {
              onClose();
            }
            return 100;
          }
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentIndex, duration, stories.length, onNext, onClose, isPaused]);

  // Reset progress ao mudar de story
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
    } else if (onNext) {
      onNext();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onNext, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    } else if (onPrev) {
      onPrev();
    }
  }, [currentIndex, onPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev]);

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      return api.post(`/api/stories/${story.id}/reply`, { message });
    },
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });

  const handleReply = () => {
    if (!reply.trim()) return;
    replyMutation.mutate(reply.trim());
  };

  const togglePause = () => {
    setIsPaused(p => !p);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2">
        <Avatar className="w-10 h-10 border border-white/20">
          <AvatarImage src={profile.avatarUrl || undefined} />
          <AvatarFallback className="bg-white/10 text-white">
            {profile.displayName?.charAt(0) || profile.handle.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">
            {profile.displayName || profile.handle}
          </p>
          <p className="text-white/60 text-sm">
            {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        {isOwn && (
          <div className="flex items-center gap-1 text-white/60 mr-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{story.viewCount}</span>
          </div>
        )}
        <button
          onClick={togglePause}
          className="text-white/80 hover:text-white p-2"
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
        <button onClick={onClose} className="text-white/80 hover:text-white p-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Áreas de toque para navegação */}
        <button
          onClick={goPrev}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          aria-label="Story anterior"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          aria-label="Próximo story"
        />

        {/* Área central para pausar */}
        <button
          onClick={togglePause}
          className="absolute left-1/3 right-1/3 top-0 bottom-0 z-10"
          aria-label={isPaused ? 'Continuar' : 'Pausar'}
        />

        {/* Conteúdo do story */}
        {story.type === 'TEXT' && (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor: story.backgroundColor || '#8B0000' }}
          >
            <p
              className="text-2xl md:text-3xl font-bold text-center leading-relaxed"
              style={{ color: story.textColor || '#FFFFFF' }}
            >
              {story.text}
            </p>
          </div>
        )}

        {story.type === 'IMAGE' && story.mediaCid && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img
              src={getIpfsUrl(story.mediaCid)}
              alt="Story"
              className="max-w-full max-h-full object-contain"
              onLoad={() => console.log('[StoryViewer] Image loaded successfully')}
              onError={(e) => {
                console.error('[StoryViewer] Image failed to load:', {
                  src: getIpfsUrl(story.mediaCid),
                  error: e
                });
              }}
            />
            {story.text && (
              <div className="absolute bottom-24 left-4 right-4 text-center">
                <p className="text-white text-lg font-medium drop-shadow-lg bg-black/30 rounded-lg px-4 py-2">
                  {story.text}
                </p>
              </div>
            )}
          </div>
        )}

        {story.type === 'VIDEO' && story.mediaCid && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <video
              src={getIpfsUrl(story.mediaCid)}
              autoPlay
              playsInline
              loop
              className="max-w-full max-h-full object-contain"
            />
            {story.text && (
              <div className="absolute bottom-24 left-4 right-4 text-center">
                <p className="text-white text-lg font-medium drop-shadow-lg bg-black/30 rounded-lg px-4 py-2">
                  {story.text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Setas de navegação (desktop) */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 transition-colors z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 transition-colors z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Indicador de pausa */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
              <Pause className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Reply (apenas se não for próprio story) */}
      {!isOwn && (
        <div
          className="p-4 flex gap-2"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Input
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Responder..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleReply();
              }
            }}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          />
          <Button
            onClick={handleReply}
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            disabled={!reply.trim() || replyMutation.isPending}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Visualizações (para próprio story) */}
      {isOwn && story.viewCount > 0 && (
        <div
          className="px-4 py-3 border-t border-white/10"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2 text-white/70">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{story.viewCount} visualizações</span>
          </div>
        </div>
      )}
    </div>
  );
}
