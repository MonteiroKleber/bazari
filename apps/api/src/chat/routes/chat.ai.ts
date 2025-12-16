import { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * Rotas de IA para BazChat
 * Proxy para o AI Gateway (microserviço)
 */

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:3002';

// Schemas de validação
const translateSchema = z.object({
  text: z.string().min(1),
  sourceLang: z.string().length(2).default('pt'),
  targetLang: z.string().length(2).default('en'),
});

const transcribeSchema = z.object({
  language: z.string().length(2).optional(),
});

const suggestSchema = z.object({
  threadId: z.string(),
  conversationHistory: z.array(z.string()).max(10),
  context: z.string().optional(),
});

export default async function chatAiRoutes(app: FastifyInstance) {
  /**
   * POST /chat/ai/translate
   * Traduz uma mensagem
   */
  app.post('/chat/ai/translate', async (request, reply) => {
    try {
      const body = translateSchema.parse(request.body);

      const response = await fetch(`${AI_GATEWAY_URL}/ai/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      return data;
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
   * POST /chat/ai/transcribe
   * Transcreve áudio para texto
   */
  app.post('/chat/ai/transcribe', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No audio file provided',
        });
      }

      // Proxy para AI Gateway
      const formData = new FormData();
      const buffer = await data.toBuffer();
      formData.append('file', new Blob([buffer as BlobPart]), data.filename);

      const response = await fetch(`${AI_GATEWAY_URL}/ai/stt`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      request.log.error({ error }, 'Transcription failed');

      return reply.code(500).send({
        success: false,
        error: 'Transcription failed',
      });
    }
  });

  /**
   * POST /chat/ai/suggest
   * Sugere respostas para a conversa
   */
  app.post('/chat/ai/suggest', async (request, reply) => {
    try {
      request.log.info({ body: request.body }, 'AI suggest request received');

      const body = suggestSchema.parse(request.body);
      request.log.info({ parsedBody: body }, 'Request validation passed');

      // Se AI Gateway não estiver configurado, retornar mock
      if (!AI_GATEWAY_URL) {
        request.log.warn('AI_GATEWAY_URL not configured, returning mock suggestions');
        return {
          success: true,
          data: {
            suggestions: [
              'Claro! Posso ajudar com isso.',
              'Ótima pergunta! Vou verificar para você.',
              'Entendi. Deixe-me explicar melhor.',
            ],
          },
        };
      }

      // Proxy para AI Gateway
      request.log.info({ aiGatewayUrl: AI_GATEWAY_URL }, 'Proxying to AI Gateway');

      const response = await fetch(`${AI_GATEWAY_URL}/ai/suggest-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationHistory: body.conversationHistory,
          context: body.context,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        request.log.error({ status: response.status, error: errorText }, 'AI Gateway returned error');

        // Fallback para mock se gateway falhar
        request.log.warn('AI Gateway failed, returning mock suggestions');
        return {
          success: true,
          data: {
            suggestions: [
              'Claro! Posso ajudar com isso.',
              'Ótima pergunta! Vou verificar para você.',
              'Entendi. Deixe-me explicar melhor.',
            ],
          },
        };
      }

      const data = await response.json();
      request.log.info({ responseData: data }, 'AI Gateway response received');
      return data;
    } catch (error) {
      request.log.error({ error, body: request.body }, 'Suggestion failed');

      if (error instanceof z.ZodError) {
        request.log.warn({ validationErrors: error.errors }, 'Validation failed');
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      // Fallback para mock em caso de erro
      request.log.warn('Returning mock suggestions due to error');
      return {
        success: true,
        data: {
          suggestions: [
            'Claro! Posso ajudar com isso.',
            'Ótima pergunta! Vou verificar para você.',
            'Entendi. Deixe-me explicar melhor.',
          ],
        },
      };
    }
  });

  /**
   * POST /chat/ai/tts
   * Sintetiza fala a partir de texto
   */
  app.post('/chat/ai/tts', async (request, reply) => {
    try {
      const body = z.object({
        text: z.string().min(1).max(5000),
        language: z.string().length(2).default('pt'),
        speed: z.number().min(0.5).max(2.0).default(1.0),
      }).parse(request.body);

      const response = await fetch(`${AI_GATEWAY_URL}/ai/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();

      reply.type('audio/wav');
      return reply.send(Buffer.from(audioBuffer));
    } catch (error) {
      request.log.error({ error }, 'TTS failed');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'TTS failed',
      });
    }
  });

  /**
   * GET /chat/ai/languages
   * Lista idiomas suportados
   */
  app.get('/chat/ai/languages', async (request, reply) => {
    try {
      const response = await fetch(`${AI_GATEWAY_URL}/ai/translate/languages`);

      if (!response.ok) {
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch languages');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch languages',
      });
    }
  });
}
