// apps/web/src/components/social/CreatePostModal.tsx

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { ImagePlus, Smile, AtSign, X, BarChart3, Video } from 'lucide-react';
import { uploadVideoChunked, UploadProgress as UploadProgressType } from '@/lib/chunkedUpload';
import { UploadProgressBar } from '@/components/UploadProgress';
import { useDraftPost } from '@/hooks/useDraftPost';
import { DraftRecoveryDialog } from './DraftRecoveryDialog';
import { DraftSaveIndicator } from './DraftSaveIndicator';

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

  // Upload progress states
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Draft auto-save
  const { draft, getDraft, saveDraft, clearDraft, isSaving, lastSaved } = useDraftPost();
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const checkedDraftRef = useRef(false);

  // Check for draft when modal opens
  useEffect(() => {
    if (open && !checkedDraftRef.current) {
      checkedDraftRef.current = true;
      const storedDraft = getDraft();
      if (storedDraft && storedDraft.content.trim()) {
        setShowDraftDialog(true);
      }
    }
    if (!open) {
      checkedDraftRef.current = false;
    }
  }, [open, getDraft]);

  // Auto-save draft when content changes
  useEffect(() => {
    if (content.trim()) {
      saveDraft({
        content,
        kind: showPollForm ? 'poll' : 'text',
        pollOptions: showPollForm ? pollOptions : undefined,
        pollDuration: showPollForm ? pollDuration : undefined,
      });
    }
  }, [content, showPollForm, pollOptions, pollDuration, saveDraft]);

  const handleRecoverDraft = () => {
    if (draft) {
      setContent(draft.content);
      if (draft.kind === 'poll') {
        setShowPollForm(true);
        if (draft.pollOptions) setPollOptions(draft.pollOptions);
        if (draft.pollDuration) setPollDuration(draft.pollDuration);
      }
    }
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
  };

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
      clearDraft(); // Clear saved draft after successful publish
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
      const uploadedUrl = res.asset.url;

      // Converter para URL completa se necessário (padrão ProfileEditPage)
      const fullUrl = uploadedUrl.startsWith('http')
        ? uploadedUrl
        : `${window.location.origin}${uploadedUrl}`;

      setImages([...images, fullUrl]);
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
      // Criar AbortController para cancelamento
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Iniciar upload com progresso
      setUploadingFile(file);
      setUploadProgress(null);

      const res = await uploadVideoChunked(file, {
        signal: abortController.signal,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        onError: (error) => {
          console.error('Erro no upload:', error);
        },
      });

      const uploadedUrl = res.asset.url;
      const thumbnailUrl = (res.asset as { thumbnailUrl?: string }).thumbnailUrl;

      // Converter para URLs completas se necessário (padrão ProfileEditPage)
      const fullUrl = uploadedUrl.startsWith('http')
        ? uploadedUrl
        : `${window.location.origin}${uploadedUrl}`;

      const fullThumbnailUrl = thumbnailUrl
        ? (thumbnailUrl.startsWith('http')
          ? thumbnailUrl
          : `${window.location.origin}${thumbnailUrl}`)
        : undefined;

      setVideos([{ url: fullUrl, thumbnailUrl: fullThumbnailUrl }]);
      setImages([]); // Limpar imagens (não pode ter vídeo + imagem)
      setUploadProgress(null);
      setUploadingFile(null);
      toast.success('Vídeo carregado!');
    } catch (error: any) {
      setUploadProgress(null);
      setUploadingFile(null);
      if (error.message !== 'Upload cancelado') {
        toast.error('Erro ao fazer upload do vídeo');
      }
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setUploadProgress(null);
      setUploadingFile(null);
      toast.info('Upload cancelado');
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
    <>
      <DraftRecoveryDialog
        open={showDraftDialog}
        draft={draft}
        onRecover={handleRecoverDraft}
        onDiscard={handleDiscardDraft}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] md:max-h-[90vh] top-[5vh] md:top-[50%] translate-y-0 md:translate-y-[-50%] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Criar Post</DialogTitle>
            <DraftSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 px-6 pb-4">
          <Textarea
            placeholder="O que você está pensando?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_LENGTH}
            className="resize-none min-h-[96px] md:min-h-[144px]"
          />

          {/* Preview de imagens */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 md:h-32 object-cover rounded-md"
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

          {/* Upload Progress */}
          {uploadProgress && uploadingFile && (
            <UploadProgressBar
              progress={uploadProgress}
              filename={uploadingFile.name}
              onCancel={handleCancelUpload}
            />
          )}

          {/* Preview de vídeos */}
          {videos.length > 0 && (
            <div className="space-y-2">
              {videos.map((video, index) => (
                <div key={index} className="relative">
                  <video
                    src={video.url}
                    controls
                    className="w-full max-h-48 md:max-h-64 rounded-md bg-black"
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
        </div>

        {/* Footer fixo (Toolbar + Ações) */}
        <div className="flex-shrink-0 border-t px-4 md:px-6 py-3 md:py-4 bg-background space-y-3">
          {/* Linha 1: Toolbar (mobile + desktop) */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 md:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 4 || showPollForm || videos.length > 0}
                title="Adicionar imagem"
                className="h-9 w-9"
              >
                <ImagePlus className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => videoInputRef.current?.click()}
                disabled={videos.length >= 1 || images.length > 0 || showPollForm}
                title="Adicionar vídeo"
                className="h-9 w-9"
              >
                <Video className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={togglePollForm}
                disabled={images.length > 0 || videos.length > 0}
                className={`h-9 w-9 ${showPollForm ? 'bg-primary/10 text-primary' : ''}`}
                title="Criar enquete"
              >
                <BarChart3 className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" disabled className="h-9 w-9 hidden md:inline-flex">
                <Smile className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" disabled className="h-9 w-9 hidden md:inline-flex">
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

            {/* Contador de caracteres + Botão Publicar (desktop only) */}
            <div className="hidden md:flex items-center gap-4">
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

          {/* Linha 2: Contador + Botão Publicar (mobile only) */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {content.length}/{MAX_LENGTH}
            </span>

            <Button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="flex-1"
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>

          {/* Dica de teclado (desktop only) */}
          <p className="hidden md:block text-xs text-muted-foreground text-center">
            💡 Dica: Pressione <kbd>Ctrl</kbd>+<kbd>Enter</kbd> para publicar
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
