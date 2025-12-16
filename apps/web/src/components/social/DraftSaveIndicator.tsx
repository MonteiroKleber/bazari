import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraftSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  className?: string;
}

export function DraftSaveIndicator({
  isSaving,
  lastSaved,
  className,
}: DraftSaveIndicatorProps) {
  if (!isSaving && !lastSaved) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground',
        'animate-in fade-in duration-300',
        className
      )}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span>Rascunho salvo</span>
        </>
      )}
    </div>
  );
}
