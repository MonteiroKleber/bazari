// V-6 (2025-09-18): Usa util unificado para flag USE_OPENSEARCH
// V-5 (2025-09-14): Restaura fallback PG, parse correto de USE_OPENSEARCH, try/catch granular
// - Parse correto da flag USE_OPENSEARCH (regex para evitar "false" truthy)
// - Logs de debug opcionais
// - Tratamento de erro melhorado
// path: apps/api/src/routes/search.ts

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { SearchQueryBuilder } from '../lib/searchQuery.js';
import { isOsEnabled } from '../lib/opensearch.js';
import { osSearch } from '../lib/osQuery.js';
import { validateSlug } from '../lib/handles.js';

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
  sort: z.enum(['relevance', 'priceAsc', 'priceDesc', 'createdDesc']).optional().default('relevance'),
  storeId: z.string().trim().min(1).optional(),
  storeSlug: z.string().trim().min(3).max(64).optional(),
  onChainStoreId: z.string().trim().min(1).optional(),
  myStoresOnly: z.enum(['true', 'false']).optional().transform(val => val === 'true'), // FASE 1: Filtro minhas lojas
  affiliateStoresOnly: z.enum(['true', 'false']).optional().transform(val => val === 'true'), // FASE 2: Filtro lojas afiliadas
  followersStoresOnly: z.enum(['true', 'false']).optional().transform(val => val === 'true'), // FASE 3: Filtro lojas de seguidores
  openStoresOnly: z.enum(['true', 'false']).optional().transform(val => val === 'true') // FASE 4: Filtro lojas abertas
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
    offset: validated.offset,
    storeId: validated.storeId?.trim() || undefined,
    storeSlug: validated.storeSlug?.trim() || undefined,
    onChainStoreId: validated.onChainStoreId?.trim() || undefined
  };
}

export async function searchRoutes(app: FastifyInstance) {
  // GET /search/global - Global search across profiles, posts, stores, products
  app.get('/search/global', async (request, reply) => {
    const globalQuerySchema = z.object({
      q: z.string().min(1).max(100),
      type: z.enum(['all', 'profiles', 'posts', 'stores', 'products']).optional().default('all'),
      limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    });

    const parsed = globalQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: parsed.error.issues });
    }

    const { q, type, limit } = parsed.data;

    const results: {
      profiles: any[];
      posts: any[];
      stores: any[];
      products: any[];
    } = {
      profiles: [],
      posts: [],
      stores: [],
      products: [],
    };

    try {
      // Search profiles
      if (type === 'all' || type === 'profiles') {
        const profiles = await prisma.profile.findMany({
          where: {
            OR: [
              { handle: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            followersCount: true,
            reputationScore: true,
          },
          orderBy: {
            followersCount: 'desc',
          },
          take: limit,
        });
        results.profiles = profiles;
      }

      // Search posts
      if (type === 'all' || type === 'posts') {
        const posts = await prisma.post.findMany({
          where: {
            status: 'PUBLISHED',
            content: { contains: q, mode: 'insensitive' },
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
            author: {
              select: {
                handle: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
        });
        results.posts = posts.map(post => ({
          id: post.id,
          content: post.content,
          createdAt: post.createdAt,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
          author: post.author,
        }));
      }

      // Search stores
      if (type === 'all' || type === 'stores') {
        const stores = await prisma.sellerProfile.findMany({
          where: {
            OR: [
              { shopName: { contains: q, mode: 'insensitive' } },
              { shopSlug: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            shopName: true,
            shopSlug: true,
            onChainStoreId: true,
            about: true,
            avatarUrl: true,
            ratingAvg: true,
            ratingCount: true,
          },
          orderBy: {
            ratingAvg: 'desc',
          },
          take: limit,
        });
        // Convert BigInt to string for JSON serialization
        results.stores = stores.map(store => ({
          ...store,
          onChainStoreId: store.onChainStoreId?.toString() || null,
        }));
      }

      // Search products (only if explicitly requested)
      if (type === 'products') {
        const products = await prisma.product.findMany({
          where: {
            status: 'PUBLISHED',
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            description: true,
            priceBzr: true,
            categoryPath: true,
            sellerStore: {
              select: {
                shopName: true,
                shopSlug: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
        });
        results.products = products;
      }

      return reply.send({
        results,
        query: q,
      });
    } catch (error: any) {
      app.log.error({ err: error }, 'Global search error');
      return reply.status(500).send({
        error: 'search.error',
        message: DEBUG_SEARCH ? error.message : 'An error occurred during search'
      });
    }
  });

  app.get('/search', async (request, reply) => {
    try {
      const query = request.query as Record<string, any>;
      const osActive = isOsEnabled();

      // FASE 1: Extrair userId do token JWT se disponível
      let userId: string | undefined;
      try {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);
          // Decodificar JWT sem verificar (já foi verificado pelo middleware)
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = payload.sub;
        }
      } catch (err) {
        // Ignorar erro de parsing, userId fica undefined
      }

      // Debug: log da flag e query
      if (DEBUG_SEARCH) {
        app.log.info({
          osEnabled: osActive,
          env: process.env.USE_OPENSEARCH,
          query,
          userId: userId ? '***' : undefined
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

      let storeId = filters.storeId;
      let storeSlug = filters.storeSlug;

      if (storeSlug) {
        try {
          validateSlug(storeSlug);
        } catch (err: any) {
          return reply.status(400).send({
            error: 'Invalid storeSlug',
            message: err?.message ?? 'Invalid store slug'
          });
        }
      }

      if (storeId && !storeSlug) {
        try {
          const store = prisma
            ? await prisma.sellerProfile.findUnique({
                where: { id: storeId },
                select: { id: true, shopSlug: true }
              })
            : null;
          if (store?.shopSlug) {
            storeSlug = store.shopSlug;
          }
        } catch (lookupError) {
          app.log.warn({ err: lookupError }, 'Failed to resolve storeSlug from storeId');
        }
      }

      if (!storeId && storeSlug) {
        const store = prisma
          ? await prisma.sellerProfile.findUnique({
              where: { shopSlug: storeSlug },
              select: { id: true, shopSlug: true }
            })
          : null;
        if (!store) {
          return reply.status(404).send({
            error: 'store.not_found',
            message: 'Store not found'
          });
        }
        storeId = store.id;
        storeSlug = store.shopSlug ?? storeSlug;
      }

      if (filters.storeSlug && storeSlug && filters.storeSlug !== storeSlug) {
        return reply.status(400).send({
          error: 'store.mismatch',
          message: 'Provided storeSlug does not match store reference'
        });
      }

      if (storeId) filters.storeId = storeId;
      if (storeSlug) filters.storeSlug = storeSlug;

      if (DEBUG_SEARCH) {
        app.log.info({ 
          filters,
          osEnabled: osActive
        }, 'Processed filters');
      }

      let results;
      let searchEngine = 'postgres';

      // Decisão clara entre OpenSearch e Postgres
      if (osActive) {
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
            sort: validated.sort,
            storeId: filters.storeId,
            storeSlug: filters.storeSlug,
            onChainStoreId: filters.onChainStoreId,
            userId, // FASE 1: Passar userId para filtro
            myStoresOnly: validated.myStoresOnly, // FASE 1: Flag filtro minhas lojas
            affiliateStoresOnly: validated.affiliateStoresOnly, // FASE 2: Flag filtro lojas afiliadas
            followersStoresOnly: validated.followersStoresOnly, // FASE 3: Flag filtro lojas de seguidores
            openStoresOnly: validated.openStoresOnly // FASE 4: Flag filtro lojas abertas
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
      reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
      
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
