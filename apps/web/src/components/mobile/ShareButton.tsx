import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { canShare, shareContent } from '@/lib/mobileUtils';
import { toast } from 'sonner';

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function ShareButton({
  url,
  title,
  text,
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const hasNativeShare = canShare();

  const handleShare = async () => {
    if (hasNativeShare) {
      const success = await shareContent({ url, title, text });
      if (!success) {
        // Fallback to copy
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className="gap-2"
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <>{hasNativeShare ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</>
      )}
      {showLabel && (
        <span>{copied ? 'Copiado!' : hasNativeShare ? 'Compartilhar' : 'Copiar'}</span>
      )}
    </Button>
  );
}
