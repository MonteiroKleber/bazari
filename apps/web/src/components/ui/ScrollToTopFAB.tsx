import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopFABProps {
  threshold?: number;
  className?: string;
}

export function ScrollToTopFAB({ threshold = 500, className }: ScrollToTopFABProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    // Check initial position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
      className={cn(
        // Position - mobile above bottom nav, desktop lower
        "fixed right-4 z-40",
        "bottom-20 md:bottom-8",
        // Shape and size
        "flex items-center justify-center",
        "h-12 w-12 rounded-full",
        // Colors
        "bg-primary text-primary-foreground",
        "shadow-lg hover:shadow-xl",
        // Animation
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
        // Hover
        "hover:bg-primary/90 transition-colors",
        // Focus
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
