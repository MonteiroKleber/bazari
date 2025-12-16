import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeartAnimationProps {
  show: boolean;
}

export function HeartAnimation({ show }: HeartAnimationProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <Heart
        className={cn(
          "w-20 h-20 text-red-500 fill-red-500",
          "animate-heart-pop"
        )}
      />
      <style>{`
        @keyframes heart-pop {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .animate-heart-pop {
          animation: heart-pop 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
