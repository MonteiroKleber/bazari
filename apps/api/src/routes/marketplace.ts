import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { opensearchClient } from '../lib/opensearch.js';
import { env } from '../env.js';

const searchSchema = z.object({
  q: z.string().optional(),
  storeId: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['createdDesc', 'priceAsc', 'priceDesc']).optional().default('createdDesc'),
  limit: z.coerce.number().min(1).max(100).optional().default(24),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function marketplaceRoutes(app: FastifyInstance) {
  app.get('/marketplace/search', async (request, reply) => {
    const query = searchSchema.parse(request.query);

    const must: any[] = [];

    if (query.q) {
      must.push({
        multi_match: {
          query: query.q,
          fields: ['title^2', 'description'],
        },
      });
    }

    if (query.storeId) {
      must.push({ term: { storeId: query.storeId } });
    }

    if (query.category) {
      must.push({ term: { 'category.path': query.category } });
    }

    const filter: any[] = [];

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.push({
        range: {
          'price.amount': {
            ...(query.minPrice !== undefined && { gte: query.minPrice }),
            ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
          },
        },
      });
    }

    const sortMap = {
      createdDesc: [{ 'sync.lastIndexedAt': 'desc' }],
      priceAsc: [{ 'price.amount': 'asc' }],
      priceDesc: [{ 'price.amount': 'desc' }],
    };

    const indexName = env.OPENSEARCH_INDEX_STORES || 'bazari_stores';

    const result = await opensearchClient.search({
      index: indexName,
      body: {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
          },
        },
        sort: sortMap[query.sort],
        from: query.offset,
        size: query.limit,
      },
    });

    const hits = result.body.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
    }));

    return reply.send({
      items: hits,
      total: result.body.hits.total.value,
      page: {
        limit: query.limit,
        offset: query.offset,
      },
    });
  });
}
