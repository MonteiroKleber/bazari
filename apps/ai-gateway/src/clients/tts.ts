import { AI_CONFIG } from '../config/env.js';

/**
 * Cliente para Coqui-TTS (Text-to-Speech)
 */

interface TTSRequest {
  text: string;
  language?: string;
  speaker?: string;
  speed?: number;
}

interface TTSResponse {
  audio: Buffer;
  format: string;
  duration: number;
}

export class TTSClient {
  private baseUrl: string;
  private mockMode: boolean;

  constructor() {
    this.baseUrl = AI_CONFIG.endpoints.tts;
    this.mockMode = AI_CONFIG.mockMode;
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    if (this.mockMode) {
      return this.mockSynthesize(request);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          language: request.language || 'pt',
          speaker_wav: request.speaker,
          speed: request.speed || 1.0,
          model: AI_CONFIG.models.tts,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();

      return {
        audio: Buffer.from(audioBuffer),
        format: 'wav',
        duration: request.text.length * 0.1, // Estimativa
      };
    } catch (error) {
      console.error('TTS client error, falling back to MOCK:', error);
      return this.mockSynthesize(request);
    }
  }

  private mockSynthesize(request: TTSRequest): TTSResponse {
    // Mock: retorna buffer vazio (silent audio)
    // Em produção, retornaria um áudio sintetizado real

    // WAV header para 1 segundo de silêncio (16-bit, 16kHz, mono)
    const sampleRate = 16000;
    const duration = Math.max(1, request.text.length * 0.05); // ~50ms por caractere
    const numSamples = Math.floor(sampleRate * duration);

    const wavHeader = Buffer.alloc(44);
    const dataSize = numSamples * 2; // 16-bit = 2 bytes
    const fileSize = dataSize + 36;

    // RIFF header
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);

    // fmt chunk
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // fmt chunk size
    wavHeader.writeUInt16LE(1, 20); // PCM format
    wavHeader.writeUInt16LE(1, 22); // mono
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * 2, 28); // byte rate
    wavHeader.writeUInt16LE(2, 32); // block align
    wavHeader.writeUInt16LE(16, 34); // bits per sample

    // data chunk
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);

    // Silent audio data
    const silentData = Buffer.alloc(dataSize);

    return {
      audio: Buffer.concat([wavHeader, silentData]),
      format: 'wav',
      duration,
    };
  }
}

export const ttsClient = new TTSClient();
