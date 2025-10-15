import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { vllmClient } from '../clients/vllm.js';

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const completeRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(1).max(4096).default(512),
  model: z.string().optional(),
});

export default async function completeRoutes(app: FastifyInstance) {
  /**
   * POST /ai/complete
   * Gera completions usando Llama 3 via vLLM (OSS)
   */
  app.post('/complete', async (request, reply) => {
    try {
      const body = completeRequestSchema.parse(request.body);

      const result = await vllmClient.chatCompletion({
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        model: body.model,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      request.log.error({ error }, 'Completion failed');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Completion failed',
      });
    }
  });

  /**
   * POST /ai/suggest-reply
   * Sugere respostas para uma conversa
   */
  app.post('/suggest-reply', async (request, reply) => {
    try {
      const body = z.object({
        conversationHistory: z.array(z.string()).max(10),
        context: z.string().optional(),
      }).parse(request.body);

      const messages = [
        {
          role: 'system' as const,
          content: 'Você é um assistente que sugere respostas curtas e apropriadas para conversas. Responda em português, de forma natural e amigável.',
        },
        {
          role: 'user' as const,
          content: `Histórico da conversa:\n${body.conversationHistory.join('\n')}\n\nSugira 3 respostas curtas diferentes para continuar esta conversa.`,
        },
      ];

      const result = await vllmClient.chatCompletion({
        messages,
        temperature: 0.8,
        max_tokens: 256,
      });

      const suggestions = result.choices[0]?.message.content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3);

      return {
        success: true,
        data: {
          suggestions,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Suggestion failed');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Suggestion failed',
      });
    }
  });
}
