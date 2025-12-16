import { useCallback, useRef } from 'react';

interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  delay?: number;
}

// Elements that should not trigger double-tap
const INTERACTIVE_ELEMENTS = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'VIDEO', 'SELECT', 'LABEL'];

export function useDoubleTap({ onDoubleTap, onSingleTap, delay = 300 }: UseDoubleTapOptions) {
  const lastTapRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Check if tap is on an interactive element
    const target = event.target as HTMLElement;
    if (INTERACTIVE_ELEMENTS.includes(target.tagName)) {
      return;
    }

    // Check if any parent is interactive
    let element = target.parentElement;
    while (element) {
      if (INTERACTIVE_ELEMENTS.includes(element.tagName)) {
        return;
      }
      // Check for data-interactive attribute for custom interactive elements
      if (element.hasAttribute('data-interactive')) {
        return;
      }
      element = element.parentElement;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      // Double tap detected
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      onDoubleTap();
    } else {
      // Single tap - wait to see if it becomes a double tap
      lastTapRef.current = now;

      if (onSingleTap) {
        if (singleTapTimeoutRef.current) {
          clearTimeout(singleTapTimeoutRef.current);
        }
        singleTapTimeoutRef.current = setTimeout(() => {
          onSingleTap();
          singleTapTimeoutRef.current = null;
        }, delay);
      }
    }
  }, [onDoubleTap, onSingleTap, delay]);

  return { handleTap };
}
