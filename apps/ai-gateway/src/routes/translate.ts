import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nllbClient } from '../clients/nllb.js';

const translateRequestSchema = z.object({
  text: z.string().min(1),
  sourceLang: z.string().length(2).default('pt'),
  targetLang: z.string().length(2).default('en'),
});

export default async function translateRoutes(app: FastifyInstance) {
  /**
   * POST /ai/translate
   * Traduz texto usando NLLB (OSS)
   */
  app.post('/translate', async (request, reply) => {
    try {
      const body = translateRequestSchema.parse(request.body);

      const result = await nllbClient.translate({
        text: body.text,
        sourceLang: body.sourceLang,
        targetLang: body.targetLang,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      request.log.error({ error }, 'Translation failed');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Translation failed',
      });
    }
  });

  /**
   * GET /ai/translate/languages
   * Lista idiomas suportados
   */
  app.get('/translate/languages', async () => {
    return {
      success: true,
      data: {
        languages: [
          { code: 'pt', name: 'Português' },
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Español' },
          { code: 'fr', name: 'Français' },
          { code: 'de', name: 'Deutsch' },
          { code: 'it', name: 'Italiano' },
          { code: 'zh', name: '中文' },
          { code: 'ja', name: '日本語' },
          { code: 'ko', name: '한국어' },
          { code: 'ar', name: 'العربية' },
          { code: 'ru', name: 'Русский' },
        ],
      },
    };
  });
}
