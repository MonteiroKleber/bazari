import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ImageLightbox } from '@/components/chat/ImageLightbox';

interface LightboxState {
  isOpen: boolean;
  src: string;
  alt?: string;
}

interface LightboxContextType {
  openLightbox: (src: string, alt?: string) => void;
  closeLightbox: () => void;
}

const LightboxContext = createContext<LightboxContextType | null>(null);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LightboxState>({
    isOpen: false,
    src: '',
    alt: undefined,
  });

  const openLightbox = useCallback((src: string, alt?: string) => {
    setState({ isOpen: true, src, alt });
  }, []);

  const closeLightbox = useCallback(() => {
    setState({ isOpen: false, src: '', alt: undefined });
  }, []);

  return (
    <LightboxContext.Provider value={{ openLightbox, closeLightbox }}>
      {children}
      {state.isOpen && (
        <ImageLightbox
          src={state.src}
          alt={state.alt}
          onClose={closeLightbox}
        />
      )}
    </LightboxContext.Provider>
  );
}

export function useLightbox(): LightboxContextType {
  const context = useContext(LightboxContext);
  if (!context) {
    throw new Error('useLightbox must be used within a LightboxProvider');
  }
  return context;
}
