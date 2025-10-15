// V-7 (2025-09-18): Padroniza logs e saneia updates Prisma com pruneUndefined
// V-6: Passo 3 — detalhe de produto retorna media: [{id, url}] (2025-09-13)
// Adicionado o campo attributesSpecVersion na criação do produto

import { FastifyInstance } from 'fastify';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { 
  processAttributes,
  buildCategoryId,
  buildCategoryPathFromId,
  resolveEffectiveSpecByCategoryId
} from '../lib/categoryResolver.js';
import { resolveSellerFromDaoId } from '../lib/sellerResolver.js';
import { env } from '../env.js';
import { getStore } from '../lib/storesChain.js';

// Schema de validação para criação
const createProductSchema = z.object({
  daoId: z.string(),
  sellerStoreSlug: z.string().optional(),
  sellerStoreId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priceBzr: z.string(),
  categoryPath: z.array(z.string()).min(1),
  attributes: z.record(z.any()).optional(),
  mediaIds: z.array(z.string()).optional(),
});

// Schema para atualização
const updateProductSchema = z.object({
  daoId: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priceBzr: z.string().optional(),
  categoryPath: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  mediaIds: z.array(z.string()).optional(),
  sellerStoreId: z.string().optional(),
  sellerStoreSlug: z.string().optional(),
});

function pruneUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

export async function productsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  /**
   * Função auxiliar para resolver categoryId a partir do path
   * Corrigida para processar paths como ["casa-decoracao", "decoracao", "quadros"]
   */
  async function resolveCategoryFromPath(categoryPath: string[]): Promise<string | null> {
    if (!categoryPath || categoryPath.length === 0) return null;

    // Construir o ID completo com prefixo "products-"
    const categoryId = buildCategoryId("products", categoryPath);
    
    // Verificar se existe no banco
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (category) {
      return categoryId;
    }

    // Se não encontrou, tentar com "services-" (caso seja um serviço)
    const serviceId = buildCategoryId("services", categoryPath);
    const serviceCategory = await prisma.category.findUnique({
      where: { id: serviceId }
    });

    if (serviceCategory) {
      return serviceId;
    }

    // Log para debug
    app.log.warn(`Categoria não encontrada para path: ${categoryPath.join(' > ')}`);
    app.log.warn(`Tentou IDs: ${categoryId}, ${serviceId}`);
    
    return null;
  }

  /**
   * POST /products — Criar produto
   */
  app.post('/products', async (request, reply) => {
    try {
      const body = createProductSchema.parse(request.body);

      // Log para debug
      app.log.info(`Recebido categoryPath: ${JSON.stringify(body.categoryPath)}`);

      // Resolver categoria usando a função corrigida
      const categoryId = await resolveCategoryFromPath(body.categoryPath);
      
      if (!categoryId) {
        return reply.status(400).send({ 
          error: `Categoria não encontrada para o caminho: ${body.categoryPath.join(' > ')}`,
          details: {
            receivedPath: body.categoryPath,
            attemptedId: buildCategoryId("products", body.categoryPath)
          }
        });
      }

      app.log.info(`Categoria resolvida: ${categoryId}`);

      // Obter o path real da categoria (para garantir consistência)
      const resolvedPath = buildCategoryPathFromId(categoryId);

      // Resolver a spec efetiva da categoria para obter a versão
      const effectiveSpec = await resolveEffectiveSpecByCategoryId(categoryId);
      
      // Processar e validar atributos com o spec da categoria
      const { attributes: processedAttributes, errors } = await processAttributes(
        body.attributes || {},
        { categoryId, dropUnknown: false }
      );

      // Se houver erros de validação
      if (Object.keys(errors).length > 0) {
        return reply.status(400).send({
          error: 'Atributos inválidos',
          details: errors
        });
      }

      // Verificar se mediaIds existem (se fornecidos)
      if (body.mediaIds && body.mediaIds.length > 0) {
        const mediaAssets = await prisma.mediaAsset.findMany({
          where: { id: { in: body.mediaIds } },
          select: { id: true }
        });
        
        if (mediaAssets.length !== body.mediaIds.length) {
          return reply.status(400).send({ 
            error: 'Um ou mais IDs de mídia são inválidos' 
          });
        }
      }

      // Resolver loja (opcional) e onChainStoreId
      let sellerStoreId: string | null = null;
      let onChainStoreId: bigint | null = null;
      if (body.sellerStoreId) {
        const store = await prisma.sellerProfile.findUnique({
          where: { id: body.sellerStoreId },
          select: { id: true, onChainStoreId: true }
        });
        sellerStoreId = store?.id ?? null;
        onChainStoreId = store?.onChainStoreId ?? null;
      } else if (body.sellerStoreSlug) {
        const store = await prisma.sellerProfile.findUnique({
          where: { shopSlug: body.sellerStoreSlug },
          select: { id: true, onChainStoreId: true }
        });
        sellerStoreId = store?.id ?? null;
        onChainStoreId = store?.onChainStoreId ?? null;
      }

      // Criar produto - AGORA COM attributesSpecVersion e onChainStoreId
      const product = await prisma.product.create({
        data: {
          daoId: body.daoId,
          title: body.title,
          description: body.description,
          priceBzr: body.priceBzr.replace(',', '.'),
          categoryId,
          categoryPath: resolvedPath,
          attributes: processedAttributes,
          attributesSpecVersion: effectiveSpec.version, // CORREÇÃO: Campo obrigatório que faltava
          sellerStoreId: sellerStoreId ?? undefined,
          onChainStoreId: onChainStoreId ?? undefined,
        },
        select: {
          id: true,
          daoId: true,
          title: true,
          description: true,
          priceBzr: true,
          categoryId: true,
          categoryPath: true,
          attributes: true,
          createdAt: true,
        },
      } as any);

      // Associar mídias ao produto (se houver)
      if (body.mediaIds && body.mediaIds.length > 0) {
        await prisma.mediaAsset.updateMany({
          where: { id: { in: body.mediaIds } },
          data: {
            ownerType: 'Product',
            ownerId: product.id
          }
        });
      }

      // Auditoria
      await prisma.auditLog.create({
        data: {
          entity: 'Product',
          entityId: product.id,
          action: 'CREATE',
          actor: body.daoId,
          diff: {
            ...product,
            onChainStoreId: product.onChainStoreId?.toString() ?? null,
          },
        },
      });

      app.log.info(`Produto criado com sucesso: ${product.id}`);
      return reply.status(201).send(product);
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao criar produto');

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(500).send({ error: 'Erro inesperado' });
    }
  });

  /**
   * GET /products/:id — Obter produto específico
   */
  app.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const { id } = request.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            namePt: true,
            nameEn: true,
            nameEs: true,
            pathSlugs: true,
            level: true,
          },
        },
      },
    });

    // V-6 (2025-09-13): Passo 3 — Higiene de Mídia
    if (!product) {
      return reply.status(404).send({ error: 'Produto não encontrado' });
    }

    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { ownerType: 'Product', ownerId: product.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true }
    });

    const media = mediaAssets.map(m => ({ id: m.id, url: m.url }));
    // Resolver vendedor/loja de forma robusta (multi-lojas)
    let seller: any = null;
    let onChainStoreId: string | null = null;
    let onChainReputation: {
      sales: number;
      positive: number;
      negative: number;
      volumePlanck: string;
    } | null = null;
    try {
      if ((product as any).sellerStoreId) {
        const store = await prisma.sellerProfile.findUnique({ where: { id: (product as any).sellerStoreId }, select: { shopSlug: true, shopName: true, userId: true, onChainStoreId: true } });
        if (store) {
          onChainStoreId = store.onChainStoreId ? store.onChainStoreId.toString() : null;
          const owner = await prisma.profile.findUnique({ where: { userId: store.userId }, select: { handle: true, displayName: true, avatarUrl: true } });
          seller = { shopSlug: store.shopSlug, shopName: store.shopName, handle: owner?.handle ?? null, displayName: owner?.displayName ?? null, avatarUrl: owner?.avatarUrl ?? null };
        }
      }
      if (!seller && product.daoId) {
        seller = await resolveSellerFromDaoId(prisma, product.daoId);
      }
    } catch {/* ignore seller resolution errors */}

    if (!onChainStoreId && seller && typeof seller.shopSlug === 'string') {
      try {
        const store = await prisma.sellerProfile.findUnique({ where: { shopSlug: seller.shopSlug }, select: { onChainStoreId: true } });
        if (store?.onChainStoreId) {
          onChainStoreId = store.onChainStoreId.toString();
        }
      } catch {
        // ignore fallback errors
      }
    }

    if (onChainStoreId) {
      try {
        const store = await getStore(onChainStoreId);
        if (store) {
          onChainReputation = store.reputation;
        }
      } catch (err) {
        app.log?.warn?.({ err, onChainStoreId }, 'Falha ao consultar reputação on-chain para produto');
      }
    }

    // Sanitizar decimais para JSON
    const safe = {
      id: product.id,
      daoId: (product as any).daoId,
      title: (product as any).title,
      description: (product as any).description ?? null,
      priceBzr: (product as any).priceBzr?.toString?.() ?? String((product as any).priceBzr ?? ''),
      categoryId: (product as any).categoryId,
      categoryPath: (product as any).categoryPath ?? [],
      attributes: (product as any).attributes ?? {},
      createdAt: (product as any).createdAt,
      updatedAt: (product as any).updatedAt,
      category: product.category,
      seller,
      media,
      onChainStoreId,
      onChainReputation,
    };

    return reply.send(safe as any);

  });

  /**
   * GET /products — Listar produtos com filtros
   */
  app.get('/products', async (request, reply) => {
    const query = request.query as any;
    
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtros básicos
    if (query.daoId) where.daoId = query.daoId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filtro por categoryPath (suporte a filtro por hierarquia)
    if (query.categoryPath && Array.isArray(query.categoryPath)) {
      where.categoryPath = { hasEvery: query.categoryPath };
    }

    // Filtro de preço
    if (query.priceMin || query.priceMax) {
      where.priceBzr = {};
      if (query.priceMin) where.priceBzr.gte = parseFloat(query.priceMin);
      if (query.priceMax) where.priceBzr.lte = parseFloat(query.priceMax);
    }

    // Ordenação
    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'priceAsc') orderBy = { priceBzr: 'asc' };
    else if (query.sort === 'priceDesc') orderBy = { priceBzr: 'desc' };
    else if (query.sort === 'titleAsc') orderBy = { title: 'asc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              namePt: true,
              nameEn: true,
              nameEs: true,
              pathSlugs: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return reply.send({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * PUT /products/:id — Atualizar produto
   */
  app.put<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = updateProductSchema.parse(request.body);

      // Verificar se o produto existe
      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      let categoryId = existing.categoryId;
      let catPathArr = existing.categoryPath;
      let specVersion = existing.attributesSpecVersion;

      // Se mudou a categoria, revalidar
      if (body.categoryPath && body.categoryPath.length > 0) {
        const newCategoryId = await resolveCategoryFromPath(body.categoryPath);
        if (!newCategoryId) {
          return reply.status(400).send({ 
            error: `Categoria não encontrada para o caminho: ${body.categoryPath.join(' > ')}` 
          });
        }
        categoryId = newCategoryId;
        catPathArr = buildCategoryPathFromId(newCategoryId);
        
        // Resolver nova spec
        const effectiveSpec = await resolveEffectiveSpecByCategoryId(categoryId);
        specVersion = effectiveSpec.version;
      }

      // Revalidar atributos com novo spec se necessário
      let processedAttributes = existing.attributes;
      if (body.attributes) {
        const { attributes: newAttrs, errors } = await processAttributes(
          body.attributes,
          { categoryId, dropUnknown: false }
        );
        
        if (Object.keys(errors).length > 0) {
          return reply.status(400).send({
            error: 'Atributos inválidos',
            details: errors
          });
        }
        processedAttributes = newAttrs;
      }

      // Verificar mediaIds se fornecidos
      if (body.mediaIds && body.mediaIds.length > 0) {
        const mediaAssets = await prisma.mediaAsset.findMany({
          where: { id: { in: body.mediaIds } },
          select: { id: true }
        });
        
        if (mediaAssets.length !== body.mediaIds.length) {
          return reply.status(400).send({ 
            error: 'Um ou mais IDs de mídia são inválidos' 
          });
        }
      }

      const categoryChanged = Array.isArray(body.categoryPath) && body.categoryPath.length > 0;

      // Resolver onChainStoreId se loja mudou (permitir atualização)
      // Nota: Apenas para casos onde produto precisa ser reatribuído a outra loja
      let onChainStoreId: bigint | null | undefined = undefined;
      if (body.sellerStoreId) {
        const store = await prisma.sellerProfile.findUnique({
          where: { id: body.sellerStoreId },
          select: { onChainStoreId: true }
        });
        onChainStoreId = store?.onChainStoreId ?? null;
      } else if (body.sellerStoreSlug) {
        const store = await prisma.sellerProfile.findUnique({
          where: { shopSlug: body.sellerStoreSlug },
          select: { onChainStoreId: true }
        });
        onChainStoreId = store?.onChainStoreId ?? null;
      }

      // Atualizar produto
      const updateDataRaw = {
        daoId: body.daoId,
        title: body.title,
        description: body.description,
        priceBzr: body.priceBzr ? body.priceBzr.replace(',', '.') : undefined,
        attributes: body.attributes ? processedAttributes : undefined,
        categoryId: categoryChanged ? categoryId : undefined,
        categoryPath: categoryChanged ? catPathArr : undefined,
        attributesSpecVersion: categoryChanged ? specVersion : undefined,
        onChainStoreId: onChainStoreId,
      };
      const updateData = pruneUndefined(updateDataRaw) as Prisma.ProductUpdateInput;

      const updated = await prisma.product.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          daoId: true,
          title: true,
          description: true,
          priceBzr: true,
          categoryId: true,
          categoryPath: true,
          attributes: true,
          updatedAt: true,
        },
      });

      // Atualizar associações de mídia se fornecidas
      if (body.mediaIds) {
        // Remover associações antigas
        await prisma.mediaAsset.updateMany({
          where: {
            ownerType: 'Product',
            ownerId: id
          },
          data: {
            ownerType: null,
            ownerId: null
          }
        });

        // Adicionar novas associações
        if (body.mediaIds.length > 0) {
          await prisma.mediaAsset.updateMany({
            where: { id: { in: body.mediaIds } },
            data: {
              ownerType: 'Product',
              ownerId: id
            }
          });
        }
      }

      // Audit
      await prisma.auditLog.create({
        data: {
          entity: 'Product',
          entityId: updated.id,
          action: 'UPDATE',
          actor: body.daoId ?? existing.daoId,
          diff: updated,
        },
      });

      return reply.send(updated);
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao atualizar produto');

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(500).send({ error: 'Erro inesperado' });
    }
  });

  /**
   * DELETE /products/:id — Deletar produto
   */
  app.delete<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Produto não encontrado' });
    }

    // Remover associações de mídia
    await prisma.mediaAsset.updateMany({
      where: {
        ownerType: 'Product',
        ownerId: id
      },
      data: {
        ownerType: null,
        ownerId: null
      }
    });

    // Deletar produto
    await prisma.product.delete({ where: { id } });

    // Audit
    await prisma.auditLog.create({
      data: {
        entity: 'Product',
        entityId: id,
        action: 'DELETE',
        actor: existing.daoId,
        diff: {
          ...existing,
          onChainStoreId: existing.onChainStoreId?.toString() ?? null,
        },
      },
    });

    return reply.status(204).send();
  });
}
