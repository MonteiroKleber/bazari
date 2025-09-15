// V-5 (2025-09-14): Restaura fallback PG, parse correto de USE_OPENSEARCH, try/catch granular
// - Parse correto da flag USE_OPENSEARCH (regex para evitar "false" truthy)
// - Logs de debug opcionais
// - Tratamento de erro melhorado
// path: apps/api/src/routes/search.ts

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { SearchQueryBuilder } from '../lib/searchQuery.js';
import { osEnabled as osEnabledImport } from '../lib/opensearch.js';
import { osSearch } from '../lib/osQuery.js';

// Inicializar Prisma e SearchQueryBuilder
let prisma: PrismaClient;
let searchBuilder: SearchQueryBuilder;

try {
  prisma = new PrismaClient();
  searchBuilder = new SearchQueryBuilder(prisma);
} catch (initError) {
  console.error('Failed to initialize search components:', initError);
  // Criar instâncias vazias para evitar crash total
  prisma = null as any;
  searchBuilder = null as any;
}

// Parse correto da flag - evita "false" ser truthy
const USE_OPENSEARCH = /^true$/i.test(process.env.USE_OPENSEARCH ?? '');
const DEBUG_SEARCH = /^true$/i.test(process.env.DEBUG_SEARCH ?? '');

// Schema de validação - padrão é 'all'
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

/** Converte query validada para filtros normalizados. */
function toFilters(validated: Validated, attrs: Record<string, string | string[]>) {
  // Normaliza categoryPath
  const categoryPath = Array.isArray(validated.categoryPath)
    ? validated.categoryPath
    : (typeof validated.categoryPath === 'string' && validated.categoryPath.length
        ? String(validated.categoryPath).split(',').filter(Boolean)
        : undefined);

  return {
    q: validated.q,
    kind: validated.kind || 'all',
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

      // Debug: log da flag e query
      if (DEBUG_SEARCH) {
        app.log.info({ 
          USE_OPENSEARCH, 
          env: process.env.USE_OPENSEARCH,
          query 
        }, 'Search request');
      }

      // Extrair attrs.<k>
      const attrs: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(query)) {
        if (!k.startsWith('attrs.')) continue;
        const name = k.slice(6);
        if (Array.isArray(v)) {
          attrs[name] = v.map(String);
        } else {
          attrs[name] = String(v);
        }
      }

      // Validar query
      const validated = searchQuerySchema.parse(query);

      // Converter para filtros normalizados
      const filters = toFilters(validated, attrs);

      if (DEBUG_SEARCH) {
        app.log.info({ 
          filters,
          USE_OPENSEARCH 
        }, 'Processed filters');
      }

      let results;
      let searchEngine = 'postgres';

      // Decisão clara entre OpenSearch e Postgres
      if (USE_OPENSEARCH && osEnabledImport) {
        try {
          if (DEBUG_SEARCH) {
            app.log.info('Using OpenSearch');
          }
          
          results = await osSearch(filters);
          searchEngine = 'opensearch';
          
          if (DEBUG_SEARCH) {
            app.log.info({ 
              itemCount: results?.items?.length,
              total: results?.page?.total 
            }, 'OpenSearch results');
          }
        } catch (osError) {
          app.log.warn({ err: osError }, 'OpenSearch failed, falling back to Postgres');
          // Fallback para Postgres
          results = null;
        }
      }

      // Se não usou OpenSearch ou falhou, usar Postgres
      if (!results) {
        if (DEBUG_SEARCH) {
          app.log.info('Using Postgres');
        }

        try {
          results = await searchBuilder.search({
            q: validated.q,
            kind: validated.kind || 'all',
            categoryPath: filters.categoryPath as string[] | undefined,
            priceMin: validated.priceMin,
            priceMax: validated.priceMax,
            attrs,
            limit: validated.limit,
            offset: validated.offset,
            sort: validated.sort
          });
          
          searchEngine = 'postgres';
          
          if (DEBUG_SEARCH) {
            app.log.info({ 
              itemCount: results?.items?.length,
              total: results?.page?.total 
            }, 'Postgres results');
          }
        } catch (pgError) {
          app.log.error({ err: pgError }, 'Postgres search failed');
          
          // Se ambos falharam, retornar erro
          return reply.status(500).send({
            error: 'Search failed',
            message: DEBUG_SEARCH ? String(pgError) : 'An error occurred during search'
          });
        }
      }

      // Adicionar header indicando qual motor foi usado
      reply.header('X-Search-Engine', searchEngine);
      
      // Retornar resultados
      return reply.send(results);
      
    } catch (error: any) {
      // Erro de validação
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid search parameters',
          details: error.errors
        });
      }

      // Log do erro
      app.log.error({ err: error }, 'Search error');
      
      // Resposta de erro
      return reply.status(500).send({
        error: 'search.error_generic',
        message: DEBUG_SEARCH ? error.message : 'An error occurred during search'
      });
    }
  });
}