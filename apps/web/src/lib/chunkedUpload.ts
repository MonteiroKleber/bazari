// Helper para upload chunked de vídeos grandes
// Divide o arquivo em chunks e envia um por vez com progresso

import { getAccessToken } from '../modules/auth/session';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk

export interface UploadProgress {
  uploadId: string;
  progress: number; // 0-100
  uploadedBytes: number;
  totalBytes: number;
  currentChunk: number;
  totalChunks: number;
  speed: number; // bytes per second
  estimatedTime: number; // seconds remaining
}

export interface ChunkedUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal; // Para cancelar upload
}

export class ChunkedUploader {
  private uploadId: string;
  private file: File;
  private totalChunks: number;
  private uploadedChunks: number = 0;
  private startTime: number = 0;
  private uploadedBytes: number = 0;
  private options: ChunkedUploadOptions;

  constructor(file: File, options: ChunkedUploadOptions = {}) {
    this.file = file;
    this.totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    this.uploadId = this.generateUploadId();
    this.options = options;
  }

  private generateUploadId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const token = getAccessToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      signal: this.options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  private calculateProgress(chunkIndex: number, chunkSize: number): UploadProgress {
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    const speed = this.uploadedBytes / elapsed;
    const remainingBytes = this.file.size - this.uploadedBytes;
    const estimatedTime = speed > 0 ? remainingBytes / speed : 0;

    return {
      uploadId: this.uploadId,
      progress: (this.uploadedBytes / this.file.size) * 100,
      uploadedBytes: this.uploadedBytes,
      totalBytes: this.file.size,
      currentChunk: chunkIndex + 1,
      totalChunks: this.totalChunks,
      speed,
      estimatedTime,
    };
  }

  async upload(): Promise<{ asset: { id: string; url: string; mime: string; size: number } }> {
    this.startTime = Date.now();

    try {
      // 1. Inicializar upload no servidor
      await this.initializeUpload();

      // 2. Enviar todos os chunks
      for (let i = 0; i < this.totalChunks; i++) {
        // Verificar se foi cancelado
        if (this.options.signal?.aborted) {
          throw new Error('Upload cancelado');
        }

        await this.uploadChunk(i);
      }

      // 3. Finalizar upload
      const result = await this.completeUpload();

      return result;
    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  private async initializeUpload(): Promise<void> {
    const response = await this.makeRequest('/media/upload-video-init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId: this.uploadId,
        totalChunks: this.totalChunks,
        filename: this.file.name,
        mime: this.file.type,
        totalSize: this.file.size,
      }),
    });

    await response.json();
  }

  private async uploadChunk(chunkIndex: number): Promise<void> {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, this.file.size);
    const chunk = this.file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', this.uploadId);
    formData.append('chunkIndex', chunkIndex.toString());

    const response = await this.makeRequest('/media/upload-video-chunk', {
      method: 'POST',
      body: formData,
    });

    await response.json();

    // Atualizar progresso
    this.uploadedChunks++;
    this.uploadedBytes += chunk.size;

    const progress = this.calculateProgress(chunkIndex, chunk.size);
    this.options.onProgress?.(progress);
    this.options.onChunkComplete?.(chunkIndex, this.totalChunks);
  }

  private async completeUpload(): Promise<{ asset: { id: string; url: string; mime: string; size: number } }> {
    const response = await this.makeRequest('/media/upload-video-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId: this.uploadId,
      }),
    });

    return await response.json();
  }

  async cancel(): Promise<void> {
    try {
      await this.makeRequest(`/media/upload-video-cancel/${this.uploadId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Erro ao cancelar upload:', error);
    }
  }

  async getStatus(): Promise<{ progress: number; receivedChunks: number; totalChunks: number; complete: boolean }> {
    const response = await this.makeRequest(`/media/upload-video-status/${this.uploadId}`, {
      method: 'GET',
    });

    return await response.json();
  }
}

// Helper function para usar de forma simples
export async function uploadVideoChunked(
  file: File,
  options: ChunkedUploadOptions = {}
): Promise<{ asset: { id: string; url: string; mime: string; size: number } }> {
  const uploader = new ChunkedUploader(file, options);
  return await uploader.upload();
}
