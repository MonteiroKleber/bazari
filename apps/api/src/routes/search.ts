// path: apps/api/src/routes/search.ts

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { SearchQueryBuilder } from '../lib/searchQuery.js';

const searchQuerySchema = z.object({
  q: z.string().optional(),
  kind: z.enum(['product', 'service', 'all']).optional().default('all'),
  categoryPath: z.array(z.string()).or(z.string()).optional(),
  priceMin: z.string().regex(/^\d+\.?\d*$/).optional(),
  priceMax: z.string().regex(/^\d+\.?\d*$/).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  sort: z.enum(['relevance', 'priceAsc', 'priceDesc', 'createdDesc']).optional().default('relevance')
});

export async function searchRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;
  const searchBuilder = new SearchQueryBuilder(prisma);

  app.get('/search', async (request, reply) => {
    try {
      // Parse query params
      const query = request.query as any;
      
      // Normalizar categoryPath para array
      if (query.categoryPath && !Array.isArray(query.categoryPath)) {
        query.categoryPath = [query.categoryPath];
      }

      // Extrair atributos dinâmicos (attrs.*)
      const attrs: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(query)) {
        if (key.startsWith('attrs.')) {
          const attrKey = key.substring(6);
          attrs[attrKey] = value as string | string[];
          delete query[key];
        }
      }

      // Validar query base
      const validated = searchQuerySchema.parse(query);
      
      // Executar busca
      const results = await searchBuilder.search({
        ...validated,
        categoryPath: validated.categoryPath as string[] | undefined,
        attrs
      });

      return reply.send(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid search parameters',
          details: error.errors
        });
      }
      
      app.log.error('Search error:', error);
      return reply.status(500).send({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}