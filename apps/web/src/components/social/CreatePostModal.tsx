// apps/web/src/components/social/CreatePostModal.tsx

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { ImagePlus, Smile, AtSign, X } from 'lucide-react';

const MAX_LENGTH = 5000;

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const navigate = useNavigate(); // TODO: usar para navegar ao perfil após publicar

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Digite algo para postar');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        kind: 'text',
        content: content.trim()
      };

      if (images.length > 0) {
        payload.media = images.map(url => ({ url, type: 'image' }));
      }

      await apiHelpers.createPost(payload);

      toast.success('Post publicado!');
      setContent('');
      setImages([]);
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

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
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

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 4}
              >
                <ImagePlus className="h-5 w-5" />
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
