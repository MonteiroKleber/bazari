import { ReactNode, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Reply } from 'lucide-react';

interface SwipeableMessageProps {
  children: ReactNode;
  onSwipeRight?: () => void;
  disabled?: boolean;
  className?: string;
}

// Configurações do swipe
const SWIPE_THRESHOLD = 60; // Distância mínima para ativar
const MAX_SWIPE = 80; // Distância máxima de swipe
const VELOCITY_THRESHOLD = 0.3; // Velocidade mínima para ativar

export function SwipeableMessage({
  children,
  onSwipeRight,
  disabled = false,
  className,
}: SwipeableMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para tracking
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = Date.now();
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    // Determinar direção no início do gesto
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    // Se for scroll vertical, ignorar
    if (isHorizontalSwipe.current === false) {
      return;
    }

    // Só permitir swipe para direita (reply)
    if (deltaX > 0 && isHorizontalSwipe.current === true) {
      // Aplicar resistência após MAX_SWIPE
      const resistance = deltaX > MAX_SWIPE ? 0.3 : 1;
      const newTranslate = Math.min(deltaX * resistance, MAX_SWIPE + 20);
      setTranslateX(newTranslate);

      // Prevenir scroll quando swipando
      e.preventDefault();
    }
  }, [disabled, isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isDragging) return;

    const elapsed = Date.now() - startTime.current;
    const velocity = translateX / elapsed;

    // Ativar se passou do threshold ou velocidade alta
    if ((translateX >= SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) && onSwipeRight) {
      // Haptic feedback (se disponível)
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onSwipeRight();
    }

    // Reset
    setTranslateX(0);
    setIsDragging(false);
    isHorizontalSwipe.current = null;
  }, [disabled, isDragging, translateX, onSwipeRight]);

  // Calcular opacidade do ícone de reply baseado no progresso
  const replyIconOpacity = Math.min(translateX / SWIPE_THRESHOLD, 1);
  const replyIconScale = 0.5 + (replyIconOpacity * 0.5);
  const showReplyHint = translateX > 20;

  return (
    <div className={cn('relative overflow-hidden', className)} ref={containerRef}>
      {/* Ícone de reply que aparece durante o swipe */}
      <div
        className="absolute left-2 top-1/2 -translate-y-1/2 transition-opacity"
        style={{
          opacity: replyIconOpacity,
          transform: `translateY(-50%) scale(${replyIconScale})`,
        }}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
            translateX >= SWIPE_THRESHOLD
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Reply className="h-4 w-4" />
        </div>
      </div>

      {/* Conteúdo que desliza */}
      <div
        className={cn(
          'relative',
          isDragging ? '' : 'transition-transform duration-200',
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
