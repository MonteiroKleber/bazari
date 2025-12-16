import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageItem {
  url: string;
  alt?: string;
}

interface ImageGalleryLightboxProps {
  images: ImageItem[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export function ImageGalleryLightbox({
  images,
  initialIndex,
  onClose,
  onIndexChange,
}: ImageGalleryLightboxProps) {
  const currentIndex = initialIndex;
  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  const goToNext = useCallback(() => {
    if (hasMultiple) {
      const nextIndex = (currentIndex + 1) % images.length;
      onIndexChange?.(nextIndex);
    }
  }, [currentIndex, images.length, hasMultiple, onIndexChange]);

  const goToPrev = useCallback(() => {
    if (hasMultiple) {
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      onIndexChange?.(prevIndex);
    }
  }, [currentIndex, images.length, hasMultiple, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'ArrowLeft':
          goToPrev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToNext, goToPrev]);

  // Prevent body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Download current image
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = currentImage.alt || `image-${currentIndex + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage, currentIndex]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-4">
          {/* Counter */}
          {hasMultiple && (
            <span className="text-white text-sm">
              {currentIndex + 1} / {images.length}
            </span>
          )}

          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="text-white hover:bg-white/10"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onClick={handleBackdropClick}
      >
        {/* Previous button */}
        {hasMultiple && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrev}
            className="absolute left-4 text-white hover:bg-white/10 z-10"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Image */}
        <img
          src={currentImage.url}
          alt={currentImage.alt || `Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />

        {/* Next button */}
        {hasMultiple && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-4 text-white hover:bg-white/10 z-10"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}
      </div>

      {/* Thumbnails (for multiple images) */}
      {hasMultiple && (
        <div className="flex justify-center gap-2 p-4">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => onIndexChange?.(index)}
              className={`w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                index === currentIndex
                  ? 'border-white'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
