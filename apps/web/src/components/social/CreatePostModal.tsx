// apps/web/src/components/social/CreatePostModal.tsx

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { ImagePlus, Smile, AtSign, X, BarChart3, Video } from 'lucide-react';

const MAX_LENGTH = 5000;

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<Array<{ url: string; thumbnailUrl?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // const navigate = useNavigate(); // TODO: usar para navegar ao perfil após publicar

  // Poll states
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState<string>('1440'); // 24h default

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Digite algo para postar');
      return;
    }

    // Validate poll if creating one
    if (showPollForm) {
      const filledOptions = pollOptions.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        toast.error('A enquete precisa ter pelo menos 2 opções');
        return;
      }
      if (filledOptions.some(opt => opt.length > 100)) {
        toast.error('As opções devem ter no máximo 100 caracteres');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        kind: showPollForm ? 'poll' : 'text',
        content: content.trim()
      };

      if (showPollForm) {
        const filledOptions = pollOptions.filter(opt => opt.trim());
        payload.poll = {
          options: filledOptions.map((text, index) => ({ index, text })),
          durationMinutes: parseInt(pollDuration),
          allowMultiple: false, // Default to single choice
        };
      } else if (images.length > 0) {
        payload.media = images.map(url => ({ url, type: 'image' }));
      } else if (videos.length > 0) {
        payload.media = videos.map((v) => ({ url: v.url, type: 'video', thumbnailUrl: v.thumbnailUrl }));
      }

      await apiHelpers.createPost(payload);

      toast.success('Post publicado!');
      setContent('');
      setImages([]);
      setVideos([]);
      setShowPollForm(false);
      setPollOptions(['', '']);
      setPollDuration('1440');
      onOpenChange(false);

      // Navegar para o próprio perfil
      // TODO: buscar handle do usuário atual
      // navigate(`/u/${handle}`);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao publicar post');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (showPollForm) {
      toast.error('Não é possível adicionar imagens em enquetes');
      return;
    }

    if (videos.length > 0) {
      toast.error('Não é possível adicionar imagens com vídeos');
      return;
    }

    if (images.length >= 4) {
      toast.error('Máximo de 4 imagens por post');
      return;
    }

    try {
      const res = await apiHelpers.uploadPostImage(file);
      setImages([...images, res.asset.url]);
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao fazer upload da imagem');
    }
  };

  const handleVideoUpload = async (file: File) => {
    // Validações
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato não suportado. Use MP4, WebM ou MOV.');
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error('Vídeo muito grande. Máximo 100MB.');
      return;
    }

    if (videos.length >= 1) {
      toast.error('Máximo de 1 vídeo por post');
      return;
    }

    if (images.length > 0) {
      toast.error('Não é possível adicionar vídeo com imagens');
      return;
    }

    if (showPollForm) {
      toast.error('Não é possível adicionar vídeo em enquetes');
      return;
    }

    try {
      toast.info('Enviando vídeo... Isso pode levar alguns instantes.');
      const res = await apiHelpers.uploadPostVideo(file) as any;
      setVideos([{ url: res.asset.url, thumbnailUrl: res.asset.thumbnailUrl }]);
      setImages([]); // Limpar imagens (não pode ter vídeo + imagem)
      toast.success('Vídeo carregado!');
    } catch (error) {
      toast.error('Erro ao fazer upload do vídeo');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const togglePollForm = () => {
    if (images.length > 0) {
      toast.error('Não é possível criar enquete com imagens');
      return;
    }
    if (videos.length > 0) {
      toast.error('Não é possível criar enquete com vídeos');
      return;
    }
    setShowPollForm(!showPollForm);
    if (showPollForm) {
      // Reset poll state when closing
      setPollOptions(['', '']);
      setPollDuration('1440');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="O que você está pensando?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_LENGTH}
            rows={6}
            className="resize-none"
          />

          {/* Preview de imagens */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Preview de vídeos */}
          {videos.length > 0 && (
            <div className="space-y-2">
              {videos.map((video, index) => (
                <div key={index} className="relative">
                  <video
                    src={video.url}
                    controls
                    className="w-full max-h-64 rounded-md bg-black"
                    poster={video.thumbnailUrl}
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => setVideos([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Poll Form */}
          {showPollForm && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Enquete</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePollForm}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Poll Options */}
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Opção ${index + 1}`}
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      maxLength={100}
                      className="flex-1"
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePollOption(index)}
                        className="h-9 w-9 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Option Button */}
              {pollOptions.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPollOption}
                  className="w-full"
                >
                  + Adicionar opção
                </Button>
              )}

              {/* Poll Duration */}
              <div className="space-y-2">
                <Label htmlFor="poll-duration">Duração da enquete</Label>
                <Select value={pollDuration} onValueChange={setPollDuration}>
                  <SelectTrigger id="poll-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="360">6 horas</SelectItem>
                    <SelectItem value="720">12 horas</SelectItem>
                    <SelectItem value="1440">1 dia</SelectItem>
                    <SelectItem value="4320">3 dias</SelectItem>
                    <SelectItem value="10080">7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 4 || showPollForm || videos.length > 0}
                title="Adicionar imagem"
              >
                <ImagePlus className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => videoInputRef.current?.click()}
                disabled={videos.length >= 1 || images.length > 0 || showPollForm}
                title="Adicionar vídeo"
              >
                <Video className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={togglePollForm}
                disabled={images.length > 0 || videos.length > 0}
                className={showPollForm ? 'bg-primary/10 text-primary' : ''}
                title="Criar enquete"
              >
                <BarChart3 className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" disabled>
                <Smile className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" disabled>
                <AtSign className="h-5 w-5" />
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVideoUpload(file);
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {content.length}/{MAX_LENGTH}
              </span>

              <Button
                onClick={handleSubmit}
                disabled={loading || !content.trim()}
              >
                {loading ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Dica: Pressione <kbd>Ctrl</kbd>+<kbd>Enter</kbd> para publicar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
