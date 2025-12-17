import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  maxSize?: number; // bytes
  preview?: boolean;
  value?: string;
  onRemove?: () => void;
  className?: string;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function FileDropzone({
  onUpload,
  accept = 'image/*',
  maxSize = DEFAULT_MAX_SIZE,
  preview = true,
  value,
  onRemove,
  className,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (accept && !file.type.match(accept.replace('*', '.*'))) {
        toast.error(t('p2p.upload.invalidType', 'Tipo de arquivo não suportado'));
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        toast.error(
          t('p2p.upload.tooLarge', 'Arquivo muito grande. Máximo: {{size}}', {
            size: formatFileSize(maxSize),
          })
        );
        return;
      }

      setIsUploading(true);

      try {
        // Create local preview
        if (preview && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }

        // Upload file
        const url = await onUpload(file);
        setPreviewUrl(url);
        toast.success(t('p2p.upload.success', 'Arquivo enviado com sucesso'));
      } catch (error) {
        toast.error(
          t('p2p.upload.error', 'Erro ao enviar arquivo: {{message}}', {
            message: (error as Error).message || 'Erro desconhecido',
          })
        );
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    },
    [accept, maxSize, onUpload, preview, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    if (onRemove) {
      onRemove();
    }
  }, [onRemove]);

  // Show preview if we have a URL
  if (previewUrl && !isUploading) {
    return (
      <div
        className={cn(
          'relative border rounded-lg p-4 flex items-center gap-4',
          className
        )}
      >
        {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
        previewUrl.startsWith('data:image/') ? (
          <img
            src={previewUrl}
            alt={t('p2p.upload.preview', 'Preview')}
            className="w-16 h-16 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
            <FileImage className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {t('p2p.upload.attached', 'Arquivo anexado')}
          </p>
          <p className="text-xs text-muted-foreground truncate">{previewUrl}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          aria-label={t('p2p.upload.remove', 'Remover arquivo')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
        isDragging && 'border-primary bg-primary/5',
        !isDragging && 'border-muted-foreground/25 hover:border-primary/50',
        isUploading && 'pointer-events-none opacity-50',
        className
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
        aria-label={t('p2p.upload.selectFile', 'Selecionar arquivo')}
      />

      <div className="flex flex-col items-center justify-center text-center">
        {isUploading ? (
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        )}

        <p className="text-sm font-medium">
          {isUploading
            ? t('p2p.upload.uploading', 'Enviando...')
            : t('p2p.upload.dropzone', 'Anexar comprovante')}
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          {t('p2p.upload.hint', 'Arraste uma imagem ou clique para selecionar')}
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          {t('p2p.upload.maxSize', 'Máximo: {{size}}', {
            size: formatFileSize(maxSize),
          })}
        </p>
      </div>
    </div>
  );
}
