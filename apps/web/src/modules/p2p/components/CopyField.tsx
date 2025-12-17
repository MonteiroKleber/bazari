import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyFieldProps {
  label: string;
  value: string;
  className?: string;
  showLabel?: boolean;
}

export function CopyField({ label, value, className, showLabel = true }: CopyFieldProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t('common.copied', 'Copiado!'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('common.copyError', 'Erro ao copiar'));
    }
  };

  return (
    <div className={className}>
      {showLabel && (
        <label className="text-sm text-muted-foreground mb-1 block">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <code
          className={cn(
            'flex-1 px-3 py-2 bg-muted rounded text-sm truncate',
            'font-mono'
          )}
          title={value}
        >
          {value}
        </code>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label={t('common.copy', 'Copiar')}
          className="shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
