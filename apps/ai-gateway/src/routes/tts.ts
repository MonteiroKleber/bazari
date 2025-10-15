import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ttsClient } from '../clients/tts.js';

const ttsRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  language: z.string().length(2).default('pt'),
  speaker: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

export default async function ttsRoutes(app: FastifyInstance) {
  /**
   * POST /ai/tts
   * Sintetiza fala a partir de texto usando Coqui-TTS (OSS)
   */
  app.post('/tts', async (request, reply) => {
    try {
      const body = ttsRequestSchema.parse(request.body);

      const result = await ttsClient.synthesize({
        text: body.text,
        language: body.language,
        speaker: body.speaker,
        speed: body.speed,
      });

      // Retornar áudio como stream
      reply.type('audio/wav');
      reply.header('Content-Length', result.audio.length.toString());
      reply.header('X-Audio-Duration', result.duration.toString());

      return reply.send(result.audio);
    } catch (error) {
      request.log.error({ error }, 'TTS synthesis failed');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'TTS synthesis failed',
      });
    }
  });
}
