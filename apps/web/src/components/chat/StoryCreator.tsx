import { useState, useRef } from 'react';
import { X, Type, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api, apiHelpers } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateStoryPayload } from '@bazari/shared-types';

interface StoryCreatorProps {
  onClose: () => void;
}

type StoryMode = 'select' | 'text' | 'media';

const COLORS = [
  '#8B0000', // Bazari Red
  '#1E3A8A', // Blue
  '#065F46', // Green
  '#7C3AED', // Purple
  '#DC2626', // Red
  '#EA580C', // Orange
  '#CA8A04', // Yellow
  '#DB2777', // Pink
];

export function StoryCreator({ onClose }: StoryCreatorProps) {
  const [mode, setMode] = useState<StoryMode>('select');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: CreateStoryPayload) => {
      return api.post('/api/stories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to create story:', error);
      alert(error.response?.data?.error || 'Falha ao criar status');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Apenas imagens e vídeos são permitidos');
      return;
    }

    // Validar tamanho (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo: 50MB');
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMode('media');
  };

  const handlePublishText = () => {
    if (!text.trim()) return;
    createMutation.mutate({
      type: 'TEXT',
      text: text.trim(),
      backgroundColor: bgColor,
      textColor: '#FFFFFF',
    });
  };

  const handlePublishMedia = async () => {
    if (!mediaFile) return;

    try {
      setUploading(true);

      // Upload PÚBLICO para IPFS (sem cifragem)
      const result = await apiHelpers.uploadStoryMedia(mediaFile);
      const type = mediaFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

      // Obter duração do vídeo se aplicável
      let duration: number | undefined;
      if (type === 'VIDEO') {
        duration = await getVideoDuration(mediaFile);
      }

      createMutation.mutate({
        type,
        mediaCid: result.cid,
        mediaType: mediaFile.type,
        text: caption || undefined,
        duration,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Falha ao fazer upload da mídia');
    } finally {
      setUploading(false);
    }
  };

  // Helper para obter duração do vídeo
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.ceil(video.duration));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button onClick={onClose} className="text-white/80 hover:text-white p-2">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-medium">Criar Status</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Conteúdo baseado no modo */}
      {mode === 'select' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
          <Button
            size="lg"
            className="w-full max-w-xs gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setMode('text')}
          >
            <Type className="w-5 h-5" />
            Status de Texto
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full max-w-xs gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-5 h-5" />
            Foto ou Vídeo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {mode === 'text' && (
        <div
          className="flex-1 flex flex-col items-center justify-center p-8"
          style={{ backgroundColor: bgColor }}
        >
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Digite seu status..."
            className="bg-transparent border-none text-white text-2xl font-bold text-center resize-none focus:ring-0 focus-visible:ring-0 placeholder:text-white/50"
            rows={4}
            maxLength={500}
            autoFocus
          />

          <div className="text-white/50 text-xs mt-2">
            {text.length}/500
          </div>

          {/* Seletor de cor */}
          <div className="flex gap-2 mt-8">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: bgColor === color ? 'white' : 'transparent',
                }}
                aria-label={`Cor ${color}`}
              />
            ))}
          </div>

          {/* Botão publicar */}
          <Button
            onClick={handlePublishText}
            disabled={!text.trim() || createMutation.isPending}
            className="mt-8 gap-2 bg-white text-gray-900 hover:bg-white/90"
            size="lg"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publicar
          </Button>
        </div>
      )}

      {mode === 'media' && mediaPreview && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative bg-black overflow-hidden min-h-0">
            {mediaFile?.type.startsWith('video/') ? (
              <video
                src={mediaPreview}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Caption e publicar */}
          <div
            className="flex-shrink-0 p-4 flex gap-2 border-t border-white/10 bg-black/90 backdrop-blur-sm"
            style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
          >
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Adicionar legenda..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              maxLength={200}
            />
            <Button
              onClick={handlePublishMedia}
              disabled={uploading || createMutation.isPending}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {uploading || createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
