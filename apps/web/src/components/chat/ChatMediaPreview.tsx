import { MediaMetadata } from '@bazari/shared-types';
import { X, FileIcon, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';

interface ChatMediaPreviewProps {
  media: MediaMetadata;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function ChatMediaPreview({ media, onRemove, showRemove = false }: ChatMediaPreviewProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = media.mimetype.startsWith('image/');
  const isVideo = media.mimetype.startsWith('video/');
  const isAudio = media.mimetype.startsWith('audio/');

  useEffect(() => {
    if (!media.cid || !media.encryptionKey) {
      console.warn('[ChatMediaPreview] Missing CID or encryption key');
      return;
    }

    const decryptAndLoadMedia = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[ChatMediaPreview] Fetching encrypted media from IPFS:', media.cid);

        // Buscar arquivo criptografado do IPFS via gateway
        const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs/';
        const ipfsUrl = `${ipfsGateway}${media.cid}`;

        const response = await fetch(ipfsUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
        }

        const encryptedBuffer = await response.arrayBuffer();
        console.log('[ChatMediaPreview] Encrypted data fetched, size:', encryptedBuffer.byteLength);

        // Descriptografar usando Web Crypto API
        const decrypted = await decryptMedia(encryptedBuffer, media.encryptionKey);
        console.log('[ChatMediaPreview] Media decrypted successfully');

        // Criar blob URL para visualização
        const blob = new Blob([decrypted], { type: media.mimetype });
        const blobUrl = URL.createObjectURL(blob);

        setMediaUrl(blobUrl);
        setLoading(false);

        // Limpar blob URL quando componente desmontar
        return () => {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
      } catch (err: any) {
        console.error('[ChatMediaPreview] Failed to load media:', err);
        setError(err.message || 'Falha ao carregar mídia');
        setLoading(false);
      }
    };

    decryptAndLoadMedia();
  }, [media.cid, media.encryptionKey, media.mimetype]);

  // Descriptografar usando AES-256-GCM (mesmo algoritmo do backend)
  const decryptMedia = async (encryptedData: ArrayBuffer, keyHex: string): Promise<ArrayBuffer> => {
    const encrypted = new Uint8Array(encryptedData);

    // Extrair IV (16 bytes), authTag (16 bytes), e ciphertext
    const iv = encrypted.slice(0, 16);
    const authTag = encrypted.slice(16, 32);
    const ciphertext = encrypted.slice(32);

    // Concatenar ciphertext + authTag (formato do Web Crypto API)
    const dataWithTag = new Uint8Array(ciphertext.length + authTag.length);
    dataWithTag.set(ciphertext, 0);
    dataWithTag.set(authTag, ciphertext.length);

    // Converter chave hex para CryptoKey
    const keyBuffer = hexToBuffer(keyHex);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Descriptografar
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 },
      cryptoKey,
      dataWithTag
    );

    return decrypted;
  };

  const hexToBuffer = (hex: string): ArrayBuffer => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
  };

  const handleDownload = () => {
    if (mediaUrl) {
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = media.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-destructive/10 rounded-lg">
        <span className="text-sm text-destructive">{error}</span>
      </div>
    );
  }

  return (
    <div className="relative group">
      {showRemove && onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-10 h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {isImage && mediaUrl && (
        <div className="relative rounded-lg overflow-hidden max-w-sm">
          <img
            src={mediaUrl}
            alt={media.filename || 'Imagem'}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
      )}

      {isVideo && mediaUrl && (
        <div className="relative rounded-lg overflow-hidden max-w-md">
          <video
            src={mediaUrl}
            controls
            className="w-full h-auto"
            preload="metadata"
          >
            Seu navegador não suporta vídeo.
          </video>
        </div>
      )}

      {isAudio && mediaUrl && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg max-w-sm">
          <audio src={mediaUrl} controls className="flex-1">
            Seu navegador não suporta áudio.
          </audio>
        </div>
      )}

      {!isImage && !isVideo && !isAudio && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-sm">
          <FileIcon className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{media.filename || 'Arquivo'}</p>
            <p className="text-xs text-muted-foreground">
              {media.size ? `${(media.size / 1024 / 1024).toFixed(2)} MB` : 'Tamanho desconhecido'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
