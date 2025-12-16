import { useState, useEffect } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  isOwn?: boolean;
  className?: string;
}

// Regex para extrair URLs do texto
const URL_REGEX = /https?:\/\/[^\s<>\[\]{}|\\^]+/gi;

/**
 * Extrai a primeira URL de um texto
 */
export function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0) return null;
  // Limpar trailing punctuation
  return matches[0].replace(/[.,;:!?)\]]+$/, '');
}

/**
 * Verifica se o texto contém uma URL
 */
export function hasUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

// Cache de previews no cliente
const previewCache = new Map<string, LinkPreviewData | null>();

export function LinkPreview({ url, isOwn = false, className }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Verificar cache
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url) || null);
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch preview');
        }

        const data: LinkPreviewData = await response.json();
        previewCache.set(url, data);
        setPreview(data);
      } catch (err) {
        console.error('[LinkPreview] Failed to fetch:', err);
        previewCache.set(url, null);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  // Não mostrar nada se loading ou erro
  if (loading || error || !preview) {
    return null;
  }

  // Não mostrar se não tem título nem descrição
  if (!preview.title && !preview.description) {
    return null;
  }

  const hostname = new URL(url).hostname;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block mt-2 rounded-lg overflow-hidden border transition-colors',
        isOwn
          ? 'bg-primary-foreground/10 border-primary-foreground/20 hover:border-primary-foreground/40'
          : 'bg-background border-border hover:border-border/80',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Image */}
      {preview.image && (
        <div className="relative w-full aspect-video bg-muted">
          <img
            src={preview.image}
            alt={preview.title || ''}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Esconder imagem se falhar
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className={cn('p-3', preview.image && 'pt-2')}>
        {/* Site name with favicon */}
        <div className="flex items-center gap-1.5 mb-1">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span
            className={cn(
              'text-xs',
              isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
            )}
          >
            {preview.siteName || hostname}
          </span>
          <ExternalLink className={cn(
            'w-3 h-3 ml-auto',
            isOwn ? 'text-primary-foreground/40' : 'text-muted-foreground/60'
          )} />
        </div>

        {/* Title */}
        {preview.title && (
          <h4
            className={cn(
              'font-medium text-sm line-clamp-2',
              isOwn ? 'text-primary-foreground' : 'text-foreground'
            )}
          >
            {preview.title}
          </h4>
        )}

        {/* Description */}
        {preview.description && (
          <p
            className={cn(
              'text-xs mt-1 line-clamp-2',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
