import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewPostsBannerProps {
  count: number;
  onLoad: () => void;
  className?: string;
}

export function NewPostsBanner({ count, onLoad, className }: NewPostsBannerProps) {
  if (count <= 0) return null;

  const text = count === 1 ? '1 novo post' : `${count} novos posts`;

  return (
    <button
      onClick={onLoad}
      className={cn(
        // Container
        "fixed left-1/2 -translate-x-1/2 z-40",
        // Estilo pill
        "flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-lg hover:shadow-xl",
        // Animação de entrada
        "animate-in slide-in-from-top-4 fade-in duration-300",
        // Hover
        "hover:bg-primary/90 transition-colors",
        // Cursor
        "cursor-pointer",
        className
      )}
      aria-label={`Carregar ${text}`}
    >
      <ArrowUp className="h-4 w-4" />
      <span className="text-sm font-medium">{text}</span>
    </button>
  );
}
