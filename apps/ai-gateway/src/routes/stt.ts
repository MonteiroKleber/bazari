import { FastifyInstance } from 'fastify';
import { whisperClient } from '../clients/whisper.js';

export default async function sttRoutes(app: FastifyInstance) {
  /**
   * POST /ai/stt
   * Transcreve áudio para texto usando Whisper (OSS)
   */
  app.post('/stt', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No audio file provided',
        });
      }

      const buffer = await data.toBuffer();
      const language = request.query && typeof request.query === 'object'
        ? (request.query as any).language
        : undefined;

      const result = await whisperClient.transcribe({
        audio: buffer,
        language,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      request.log.error({ error }, 'Transcription failed');

      return reply.code(500).send({
        success: false,
        error: 'Transcription failed',
      });
    }
  });
}
