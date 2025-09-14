// V-2 (2025-09-13): /search com OpenSearch (feature-flag) + fallback Postgres (SearchQueryBuilder)
// - Mantém contrato atual (items, page, facets)
// - Entende attrs.<k>, categoryPath (array ou CSV), kind, sort, priceMin/Max, limit/offset
// - Exporta *named* searchRoutes (compatível com server.ts)
// - Se USE_OPENSEARCH=true e OS OK, usa OpenSearch; senão, usa SearchQueryBuilder (Postgres)

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { SearchQueryBuilder } from '../lib/searchQuery.js';
import { osEnabled } from '../lib/opensearch.js';
import { osSearch } from '../lib/osQuery.js';

const prisma = new PrismaClient();
const searchBuilder = new SearchQueryBuilder(prisma);

// Mantém enum e nomes já usados no app (sem quebrar o web)
const searchQuerySchema = z.object({
  q: z.string().optional(),
  kind: z.enum(['product', 'service', 'all']).optional().default('all'),
  categoryPath: z.array(z.string()).or(z.string()).optional(),
  priceMin: z.string().regex(/^\d+\.?\d*$/).optional(),
  priceMax: z.string().regex(/^\d+\.?\d*$/).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  // Mantém nomes já usados no app
  sort: z.enum(['relevance', 'priceAsc', 'priceDesc', 'createdDesc']).optional().default('relevance')
});

type Validated = z.infer<typeof searchQuerySchema>;

type OsSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

function mapSortToOs(s: Validated['sort']): OsSort {
  switch (s) {
    case 'priceAsc': return 'price_asc';
    case 'priceDesc': return 'price_desc';
    case 'createdDesc': return 'newest';
    default: return 'relevance';
  }
}

function adaptToLegacy(osOut: any) {
  return {
    items: osOut.items.map((it: any) => ({
      id: it.id,
      kind: it.kind,
      title: it.title,
      description: it.description,
      priceBzr: it.price != null ? String(it.price) : undefined,
      categoryPath: Array.isArray(it.category_slugs)
        ? it.category_slugs
        : (typeof it.category_path === 'string'
            ? it.category_path.split('/').filter(Boolean)
            : []),
      attributes: it.attrs ?? {},
      media: it.media ?? [] // se ainda não indexamos, mantém []
    })),
    page: osOut.page,
    facets: {
      categories: osOut.facets?.categories ?? [],
      price: osOut.facets?.price ?? undefined, // se implementar depois no OS
      attributes: osOut.facets?.attributes ?? {}
    }
  };
}

/** Converte query validada para filtros do OS ou do Postgres. */
function toFilters(validated: Validated, attrs: Record<string, string | string[]>) {
  // normaliza categoryPath
  const categoryPath = Array.isArray(validated.categoryPath)
    ? validated.categoryPath
    : (typeof validated.categoryPath === 'string' && validated.categoryPath.length
        ? String(validated.categoryPath).split(',').filter(Boolean)
        : undefined);

  return {
    q: validated.q,
    kind: validated.kind,
    categoryPath,
    attrs,
    priceMin: validated.priceMin != null ? Number(validated.priceMin) : undefined,
    priceMax: validated.priceMax != null ? Number(validated.priceMax) : undefined,
    sort: mapSortToOs(validated.sort),
    limit: validated.limit,
    offset: validated.offset
  };
}

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search', async (request, reply) => {
    try {
      const query = request.query as Record<string, any>;

      // Extrair attrs.<k>
      const attrs: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(query)) {
        if (!k.startsWith('attrs.')) continue;
        const name = k.slice(6);
        if (Array.isArray(v)) attrs[name] = v.map(String);
        else attrs[name] = String(v);
      }

      // Validar query base (mantendo nomes/enum usados no front)
      const validated = searchQuerySchema.parse(query);

      // Converter para filtros normalizados
      const filters = toFilters(validated, attrs);

      // Se OpenSearch estiver habilitado, usar OS; senão fallback Postgres
      if (osEnabled) {
        try {
          const results = await osSearch(filters);

          // Adaptar para formato legado (SearchQueryBuilder)
          const adapted = adaptToLegacy(results);         

          reply.header('X-Search-Engine', 'opensearch');
          return reply.send(results);
        } catch (err) {
          app.log.warn({ err }, 'OpenSearch falhou; fallback Postgres.');
        }
      }

      // Fallback: SearchQueryBuilder (Postgres)
      const results = await searchBuilder.search({
        ...validated,
        categoryPath: filters.categoryPath as string[] | undefined,
        attrs
      });

      reply.header('X-Search-Engine', 'postgres');
      return reply.send(results);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid search parameters',
          details: error.errors
        });
      }

      app.log.error({ err: error }, 'Search error');
      return reply.status(500).send({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
