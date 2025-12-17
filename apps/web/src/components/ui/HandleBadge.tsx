import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HandleBadgeProps {
  handle: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

/**
 * HandleBadge - Exibe o handle do usuário com funcionalidade de copiar
 *
 * Click = copia o handle para clipboard
 * Feedback visual: ícone muda para check verde por 1.5s
 */
export function HandleBadge({
  handle,
  size = 'md',
  className,
  showIcon = true
}: HandleBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const textToCopy = `@${handle}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Handle copiado!', {
        description: textToCopy,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Handle copiado!', {
          description: textToCopy,
          duration: 2000,
        });
        setTimeout(() => setCopied(false), 1500);
      } catch {
        toast.error('Erro ao copiar');
      }
      document.body.removeChild(textArea);
    }
  }, [handle]);

  const sizeClasses = {
    sm: 'text-xs gap-1 py-0.5 px-1.5',
    md: 'text-sm gap-1.5 py-1 px-2',
    lg: 'text-base gap-2 py-1.5 px-3',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center rounded-md transition-all duration-200',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-muted/80 active:scale-95',
        'cursor-pointer select-none',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        sizeClasses[size],
        copied && 'text-green-600 dark:text-green-400',
        className
      )}
      title="Clique para copiar"
      aria-label={`Copiar handle @${handle}`}
    >
      <span className="font-medium">@{handle}</span>
      {showIcon && (
        <span className={cn(
          'transition-transform duration-200',
          copied && 'scale-110'
        )}>
          {copied ? (
            <Check className={cn(iconSizes[size], 'text-green-500')} />
          ) : (
            <Copy className={cn(iconSizes[size], 'opacity-50 group-hover:opacity-100')} />
          )}
        </span>
      )}
    </button>
  );
}

export default HandleBadge;
