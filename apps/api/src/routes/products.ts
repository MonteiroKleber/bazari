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
  // === Shipping fields (PROPOSAL-000) ===
  estimatedDeliveryDays: z.number().int().min(1).max(90).optional(),
  shippingMethod: z.enum(['SEDEX', 'PAC', 'TRANSPORTADORA', 'MINI_ENVIOS', 'RETIRADA', 'INTERNACIONAL', 'OUTRO']).optional(),
  weight: z.number().positive().optional(), // kg
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(), // cm
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
  // === Shipping fields (PROPOSAL-000) ===
  estimatedDeliveryDays: z.number().int().min(1).max(90).optional(),
  shippingMethod: z.enum(['SEDEX', 'PAC', 'TRANSPORTADORA', 'MINI_ENVIOS', 'RETIRADA', 'INTERNACIONAL', 'OUTRO']).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
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
          // === Shipping fields (PROPOSAL-000) ===
          estimatedDeliveryDays: body.estimatedDeliveryDays ?? 7,
          shippingMethod: body.shippingMethod ?? null,
          weight: body.weight ?? null,
          dimensions: body.dimensions ?? null,
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

    // Buscar shipping options (PROPOSAL-002)
    const shippingOptions = await prisma.productShippingOption.findMany({
      where: { productId: product.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

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
      // Shipping legacy fields (PROPOSAL-000)
      estimatedDeliveryDays: (product as any).estimatedDeliveryDays,
      shippingMethod: (product as any).shippingMethod,
      weight: (product as any).weight,
      dimensions: (product as any).dimensions,
      // Shipping options (PROPOSAL-002)
      shippingOptions: shippingOptions.map(opt => ({
        id: opt.id,
        method: opt.method,
        label: opt.label,
        pricingType: opt.pricingType,
        priceBzr: opt.priceBzr?.toString() ?? null,
        freeAboveBzr: opt.freeAboveBzr?.toString() ?? null,
        estimatedDeliveryDays: opt.estimatedDeliveryDays,
        pickupAddressType: opt.pickupAddressType,
        pickupAddress: opt.pickupAddress,
        isDefault: opt.isDefault,
      })),
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
    if (query.sellerId) where.onChainStoreId = BigInt(query.sellerId);
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
      data: products.map(p => ({
        ...p,
        onChainStoreId: p.onChainStoreId ? p.onChainStoreId.toString() : null,
      })),
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
        // === Shipping fields (PROPOSAL-000) ===
        estimatedDeliveryDays: body.estimatedDeliveryDays,
        shippingMethod: body.shippingMethod,
        weight: body.weight,
        dimensions: body.dimensions,
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

  // ============================================================
  // PROPOSAL-002: Product Shipping Options CRUD
  // ============================================================

  const createShippingOptionSchema = z.object({
    method: z.enum(['SEDEX', 'PAC', 'TRANSPORTADORA', 'MINI_ENVIOS', 'RETIRADA', 'INTERNACIONAL', 'OUTRO']),
    label: z.string().optional(),
    pricingType: z.enum(['FIXED', 'FREE', 'FREE_ABOVE', 'TO_ARRANGE']).default('FIXED'),
    priceBzr: z.string().optional(),
    freeAboveBzr: z.string().optional(),
    estimatedDeliveryDays: z.number().int().min(1).max(90).default(7),
    pickupAddressType: z.enum(['STORE', 'CUSTOM']).optional(),
    pickupAddress: z.object({
      street: z.string(),
      number: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      instructions: z.string().optional(),
    }).optional(),
    isDefault: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  });

  const updateShippingOptionSchema = createShippingOptionSchema.partial();

  /**
   * GET /products/:productId/shipping-options — Listar opções de envio do produto
   */
  app.get<{ Params: { productId: string } }>('/products/:productId/shipping-options', async (request, reply) => {
    const { productId } = request.params;

    // Verificar se produto existe
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return reply.status(404).send({ error: 'Produto não encontrado' });
    }

    const options = await prisma.productShippingOption.findMany({
      where: { productId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Se não há opções, criar uma a partir dos campos legacy (retrocompatibilidade)
    if (options.length === 0 && product.shippingMethod) {
      const legacyOption = {
        id: 'legacy',
        productId,
        method: product.shippingMethod,
        label: null,
        pricingType: 'FIXED',
        priceBzr: null, // Preço será calculado no checkout
        freeAboveBzr: null,
        estimatedDeliveryDays: product.estimatedDeliveryDays || 7,
        pickupAddressType: product.shippingMethod === 'RETIRADA' ? 'STORE' : null,
        pickupAddress: null,
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
      return reply.send({ items: [legacyOption], legacy: true });
    }

    return reply.send({
      items: options.map(opt => ({
        ...opt,
        priceBzr: opt.priceBzr?.toString() ?? null,
        freeAboveBzr: opt.freeAboveBzr?.toString() ?? null,
      })),
      legacy: false,
    });
  });

  /**
   * POST /products/:productId/shipping-options — Criar opção de envio
   */
  app.post<{ Params: { productId: string } }>('/products/:productId/shipping-options', async (request, reply) => {
    try {
      const { productId } = request.params;
      const body = createShippingOptionSchema.parse(request.body);

      // Verificar se produto existe
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      // Validações de negócio
      if (body.pricingType === 'FIXED' && !body.priceBzr) {
        return reply.status(400).send({ error: 'Preço é obrigatório para frete fixo' });
      }

      if (body.pricingType === 'FREE_ABOVE' && (!body.freeAboveBzr || !body.priceBzr)) {
        return reply.status(400).send({ error: 'Valor mínimo e preço normal são obrigatórios para frete grátis condicional' });
      }

      // Se for RETIRADA com STORE, verificar se loja tem endereço
      if (body.method === 'RETIRADA' && body.pickupAddressType === 'STORE') {
        const store = await prisma.sellerProfile.findUnique({
          where: { id: product.sellerStoreId || '' },
          select: { pickupAddress: true },
        });
        if (!store?.pickupAddress) {
          return reply.status(400).send({
            error: 'Loja não tem endereço de retirada configurado',
            hint: 'Configure o endereço da loja ou use "Outro endereço"',
          });
        }
      }

      // Se isDefault = true, desmarcar outras opções
      if (body.isDefault) {
        await prisma.productShippingOption.updateMany({
          where: { productId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Contar opções existentes para limitar a 10
      const count = await prisma.productShippingOption.count({ where: { productId } });
      if (count >= 10) {
        return reply.status(400).send({ error: 'Máximo de 10 opções de envio por produto' });
      }

      const option = await prisma.productShippingOption.create({
        data: {
          productId,
          method: body.method,
          label: body.label,
          pricingType: body.pricingType,
          priceBzr: body.priceBzr?.replace(',', '.') || null,
          freeAboveBzr: body.freeAboveBzr?.replace(',', '.') || null,
          estimatedDeliveryDays: body.estimatedDeliveryDays,
          pickupAddressType: body.pickupAddressType || (body.method === 'RETIRADA' ? 'STORE' : null),
          pickupAddress: body.pickupAddress ?? undefined,
          isDefault: body.isDefault,
          sortOrder: body.sortOrder,
        },
      });

      app.log.info(`Shipping option created: ${option.id} for product ${productId}`);

      return reply.status(201).send({
        ...option,
        priceBzr: option.priceBzr?.toString() ?? null,
        freeAboveBzr: option.freeAboveBzr?.toString() ?? null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      app.log.error({ err: error }, 'Erro ao criar opção de envio');
      return reply.status(500).send({ error: 'Erro inesperado' });
    }
  });

  /**
   * PUT /products/:productId/shipping-options/:optionId — Atualizar opção de envio
   */
  app.put<{ Params: { productId: string; optionId: string } }>(
    '/products/:productId/shipping-options/:optionId',
    async (request, reply) => {
      try {
        const { productId, optionId } = request.params;
        const body = updateShippingOptionSchema.parse(request.body);

        // Verificar se opção existe
        const existing = await prisma.productShippingOption.findFirst({
          where: { id: optionId, productId },
        });
        if (!existing) {
          return reply.status(404).send({ error: 'Opção de envio não encontrada' });
        }

        // Validações de negócio
        const pricingType = body.pricingType ?? existing.pricingType;
        const priceBzr = body.priceBzr ?? existing.priceBzr?.toString();
        const freeAboveBzr = body.freeAboveBzr ?? existing.freeAboveBzr?.toString();

        if (pricingType === 'FIXED' && !priceBzr) {
          return reply.status(400).send({ error: 'Preço é obrigatório para frete fixo' });
        }

        if (pricingType === 'FREE_ABOVE' && (!freeAboveBzr || !priceBzr)) {
          return reply.status(400).send({ error: 'Valor mínimo e preço normal são obrigatórios para frete grátis condicional' });
        }

        // Se isDefault = true, desmarcar outras opções
        if (body.isDefault === true) {
          await prisma.productShippingOption.updateMany({
            where: { productId, isDefault: true, id: { not: optionId } },
            data: { isDefault: false },
          });
        }

        const updated = await prisma.productShippingOption.update({
          where: { id: optionId },
          data: pruneUndefined({
            method: body.method,
            label: body.label,
            pricingType: body.pricingType,
            priceBzr: body.priceBzr?.replace(',', '.'),
            freeAboveBzr: body.freeAboveBzr?.replace(',', '.'),
            estimatedDeliveryDays: body.estimatedDeliveryDays,
            pickupAddressType: body.pickupAddressType,
            pickupAddress: body.pickupAddress,
            isDefault: body.isDefault,
            sortOrder: body.sortOrder,
          }),
        });

        return reply.send({
          ...updated,
          priceBzr: updated.priceBzr?.toString() ?? null,
          freeAboveBzr: updated.freeAboveBzr?.toString() ?? null,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
        }
        app.log.error({ err: error }, 'Erro ao atualizar opção de envio');
        return reply.status(500).send({ error: 'Erro inesperado' });
      }
    }
  );

  /**
   * DELETE /products/:productId/shipping-options/:optionId — Remover opção de envio
   */
  app.delete<{ Params: { productId: string; optionId: string } }>(
    '/products/:productId/shipping-options/:optionId',
    async (request, reply) => {
      const { productId, optionId } = request.params;

      const existing = await prisma.productShippingOption.findFirst({
        where: { id: optionId, productId },
      });
      if (!existing) {
        return reply.status(404).send({ error: 'Opção de envio não encontrada' });
      }

      // Verificar se é a última opção ativa
      const activeCount = await prisma.productShippingOption.count({
        where: { productId, isActive: true },
      });
      if (activeCount <= 1) {
        return reply.status(400).send({ error: 'Produto deve ter pelo menos 1 opção de envio' });
      }

      await prisma.productShippingOption.delete({ where: { id: optionId } });

      // Se era default, definir outra como default
      if (existing.isDefault) {
        const firstOption = await prisma.productShippingOption.findFirst({
          where: { productId, isActive: true },
          orderBy: { sortOrder: 'asc' },
        });
        if (firstOption) {
          await prisma.productShippingOption.update({
            where: { id: firstOption.id },
            data: { isDefault: true },
          });
        }
      }

      return reply.status(204).send();
    }
  );

  /**
   * PATCH /products/:productId/shipping-options/reorder — Reordenar opções de envio
   */
  app.patch<{ Params: { productId: string } }>(
    '/products/:productId/shipping-options/reorder',
    async (request, reply) => {
      const { productId } = request.params;
      const body = z.object({ order: z.array(z.string()) }).parse(request.body);

      // Verificar se produto existe
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      // Atualizar sortOrder de cada opção
      await Promise.all(
        body.order.map((optionId, index) =>
          prisma.productShippingOption.updateMany({
            where: { id: optionId, productId },
            data: { sortOrder: index },
          })
        )
      );

      return reply.send({ success: true });
    }
  );
}
