import { AI_CONFIG } from '../config/env.js';

/**
 * Cliente para Whisper (Speech-to-Text)
 */

interface TranscriptionRequest {
  audio: Buffer;
  language?: string;
  model?: string;
}

interface TranscriptionResponse {
  text: string;
  language: string;
  duration?: number;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

export class WhisperClient {
  private baseUrl: string;
  private mockMode: boolean;

  constructor() {
    this.baseUrl = AI_CONFIG.endpoints.whisper;
    this.mockMode = AI_CONFIG.mockMode;
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    if (this.mockMode) {
      return this.mockTranscribe(request);
    }

    try {
      const formData = new FormData();
      formData.append('file', new Blob([request.audio]), 'audio.wav');
      if (request.language) {
        formData.append('language', request.language);
      }
      formData.append('model', request.model || AI_CONFIG.models.whisper);

      const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as TranscriptionResponse;
    } catch (error) {
      console.error('Whisper client error, falling back to MOCK:', error);
      return this.mockTranscribe(request);
    }
  }

  private mockTranscribe(request: TranscriptionRequest): TranscriptionResponse {
    // Mock: retorna texto placeholder
    const mockTexts = [
      'Olá, esta é uma transcrição mock de áudio.',
      'Esta mensagem foi gerada pelo modo MOCK do Whisper.',
      'Adicione um servidor Whisper real para transcrição de verdade.',
    ];

    const mockText = mockTexts[Math.floor(Math.random() * mockTexts.length)];

    return {
      text: mockText,
      language: request.language || 'pt',
      duration: 3.5,
      segments: [
        {
          id: 0,
          start: 0,
          end: 3.5,
          text: mockText,
        },
      ],
    };
  }
}

export const whisperClient = new WhisperClient();
