import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { vllmClient } from '../clients/vllm.js';

const embedRequestSchema = z.object({
  texts: z.array(z.string()).min(1).max(100),
});

export default async function embedRoutes(app: FastifyInstance) {
  /**
   * POST /ai/embed
   * Gera embeddings para textos usando modelo OSS
   */
  app.post('/embed', async (request, reply) => {
    try {
      const body = embedRequestSchema.parse(request.body);

      const embeddings = await vllmClient.embed(body.texts);

      return {
        success: true,
        data: {
          embeddings,
          dimension: embeddings[0]?.length || 0,
          count: embeddings.length,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Embedding failed');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Embedding failed',
      });
    }
  });

  /**
   * POST /ai/search-similar
   * Busca mensagens similares usando embeddings
   * Nota: Requer vector database (Qdrant/pgvector)
   */
  app.post('/search-similar', async (request, reply) => {
    try {
      const body = z.object({
        query: z.string().min(1),
        threadId: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      }).parse(request.body);

      // Gerar embedding da query
      const [queryEmbedding] = await vllmClient.embed([body.query]);

      // Mock: retornar resultado vazio
      // Em produção, buscaria no Qdrant/pgvector
      return {
        success: true,
        data: {
          results: [],
          query: body.query,
          note: 'Vector database not configured. Add Qdrant or pgvector for semantic search.',
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Semantic search failed');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Semantic search failed',
      });
    }
  });
}
