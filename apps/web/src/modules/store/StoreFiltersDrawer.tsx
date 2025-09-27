import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoreFiltersDrawerProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: ReactNode;
}

export function StoreFiltersDrawer({ open, onOpenChange, children }: StoreFiltersDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
      <div className="relative h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-store-ink/15 bg-store-bg p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-store-ink">Filtros</h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-store-ink/70 hover:bg-store-brand/10"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar filtros"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default StoreFiltersDrawer;
