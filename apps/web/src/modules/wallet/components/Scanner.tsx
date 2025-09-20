import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface ScannerProps {
  onResult: (value: string) => void;
  onError?: (error: unknown) => void;
  paused?: boolean;
}

export function Scanner({ onResult, onError, paused = false }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      (readerRef.current as any)?.reset?.();
    };
  }, []);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader || paused) {
      return;
    }

    let active = true;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current as any, (result, err) => {
        if (!active) return;
        if (result) {
          onResult(result.getText());
        }
        if (err && !(err as any).message?.includes('No MultiFormat Readers')) {
          setErrorMessage((err as Error).message ?? String(err));
          onError?.(err);
        }
      })
      .catch((err) => {
        setErrorMessage((err as Error).message ?? String(err));
        onError?.(err);
      });

    return () => {
      active = false;
      (reader as any)?.reset?.();
    };
  }, [onError, onResult, paused]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border/60 bg-black/80">
        <video ref={videoRef} className="h-48 w-full object-cover" autoPlay muted playsInline />
      </div>
      {errorMessage && (
        <p className="text-xs text-destructive" role="status" aria-live="polite">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default Scanner;
