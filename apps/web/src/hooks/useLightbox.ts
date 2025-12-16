import { useState, useCallback } from 'react';

interface UseLightboxReturn {
  isOpen: boolean;
  currentIndex: number;
  open: (index?: number) => void;
  close: () => void;
  goToNext: () => void;
  goToPrev: () => void;
  setIndex: (index: number) => void;
}

export function useLightbox(totalImages: number = 0): UseLightboxReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToNext = useCallback(() => {
    if (totalImages > 0) {
      setCurrentIndex((prev) => (prev + 1) % totalImages);
    }
  }, [totalImages]);

  const goToPrev = useCallback(() => {
    if (totalImages > 0) {
      setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
    }
  }, [totalImages]);

  const setIndex = useCallback((index: number) => {
    if (index >= 0 && index < totalImages) {
      setCurrentIndex(index);
    }
  }, [totalImages]);

  return {
    isOpen,
    currentIndex,
    open,
    close,
    goToNext,
    goToPrev,
    setIndex,
  };
}
