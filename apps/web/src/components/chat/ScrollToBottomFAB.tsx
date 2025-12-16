import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgeCounter } from '@/components/ui/badge-counter';
import { cn } from '@/lib/utils';

interface ScrollToBottomFABProps {
  visible: boolean;
  newMessageCount: number;
  onClick: () => void;
}

/**
 * Botão flutuante para scroll ao final da conversa
 * Mostra badge com número de novas mensagens não lidas
 */
export function ScrollToBottomFAB({ visible, newMessageCount, onClick }: ScrollToBottomFABProps) {
  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        'fixed bottom-24 right-4 md:bottom-8 md:right-8 rounded-full shadow-lg z-50',
        'transition-all duration-200 h-10 w-10',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      )}
      onClick={onClick}
    >
      <ChevronDown className="h-5 w-5" />
      <BadgeCounter
        count={newMessageCount}
        size="sm"
        className="-top-2 -right-2"
      />
    </Button>
  );
}
