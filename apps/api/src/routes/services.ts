// V-7 (2025-09-18): Padroniza logs e saneia updates Prisma com pruneUndefined
// V-6: Passo 3 — detalhe de serviço retorna media: [{id, url}] (2025-09-13)
// Alinhado com a rota de produtos que já está funcionando
// Corrige erro 400 ao criar serviços

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

// Schema de validação para criação (igual ao de produtos, mas com basePriceBzr)
const createServiceSchema = z.object({
  daoId: z.string(),
  sellerStoreSlug: z.string().optional(),
  sellerStoreId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  basePriceBzr: z.string().optional(), // Opcional para serviços
  categoryPath: z.array(z.string()).min(1),
  attributes: z.record(z.any()).optional(),
  mediaIds: z.array(z.string()).optional(),
});

// Schema para atualização
const updateServiceSchema = z.object({
  daoId: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  basePriceBzr: z.string().optional(),
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

export async function servicesRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  /**
   * Função auxiliar para resolver categoryId a partir do path (igual à de produtos)
   */
  async function resolveCategoryFromPath(categoryPath: string[]): Promise<string | null> {
    if (!categoryPath || categoryPath.length === 0) return null;

    // Construir o ID completo com prefixo "services-"
    const categoryId = buildCategoryId("services", categoryPath);
    
    // Verificar se existe no banco
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (category) {
      return categoryId;
    }

    // Se não encontrou, tentar com "products-" (caso seja um produto)
    const productId = buildCategoryId("products", categoryPath);
    const productCategory = await prisma.category.findUnique({
      where: { id: productId }
    });

    if (productCategory) {
      return productId;
    }

    // Log para debug
    app.log.warn(`Categoria não encontrada para path: ${categoryPath.join(' > ')}`);
    app.log.warn(`Tentou IDs: ${categoryId}, ${productId}`);
    
    return null;
  }

  /**
   * POST /services — Criar serviço
   */
  app.post('/services', async (request, reply) => {
    try {
      const body = createServiceSchema.parse(request.body);

      // Log para debug
      app.log.info(`Recebido categoryPath: ${JSON.stringify(body.categoryPath)}`);

      // Resolver categoria usando a função corrigida
      const categoryId = await resolveCategoryFromPath(body.categoryPath);
      
      if (!categoryId) {
        return reply.status(400).send({ 
          error: `Categoria não encontrada para o caminho: ${body.categoryPath.join(' > ')}`,
          details: {
            receivedPath: body.categoryPath,
            attemptedId: buildCategoryId("services", body.categoryPath)
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

      // Criar serviço - AGORA COM attributesSpecVersion e onChainStoreId
      const service = await prisma.serviceOffering.create({
        data: {
          daoId: body.daoId,
          title: body.title,
          description: body.description,
          basePriceBzr: body.basePriceBzr ? body.basePriceBzr.replace(',', '.') : null,
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
          basePriceBzr: true,
          categoryId: true,
          categoryPath: true,
          attributes: true,
          createdAt: true,
        },
      } as any);

      // Associar mídias ao serviço (se houver)
      if (body.mediaIds && body.mediaIds.length > 0) {
        await prisma.mediaAsset.updateMany({
          where: { id: { in: body.mediaIds } },
          data: {
            ownerType: 'ServiceOffering',
            ownerId: service.id
          }
        });
      }

      // Auditoria
      await prisma.auditLog.create({
        data: {
          entity: 'ServiceOffering',
          entityId: service.id,
          action: 'CREATE',
          actor: body.daoId,
          diff: {
            ...service,
            onChainStoreId: service.onChainStoreId?.toString() ?? null,
          },
        },
      });

      app.log.info(`Serviço criado com sucesso: ${service.id}`);
      return reply.status(201).send(service);
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao criar serviço');

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
   * GET /services/:id — Obter serviço específico
   */
  app.get<{ Params: { id: string } }>('/services/:id', async (request, reply) => {
    const { id } = request.params;

    const service = await prisma.serviceOffering.findUnique({
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
    if (!service) {
      return reply.status(404).send({ error: 'Serviço não encontrado' });
    }

    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { ownerType: 'ServiceOffering', ownerId: service.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true }
    });

    const media = mediaAssets.map(m => ({ id: m.id, url: m.url }));
    let seller: any = null;
    let onChainStoreId: string | null = service.onChainStoreId ? service.onChainStoreId.toString() : null;
    let onChainReputation: {
      sales: number;
      positive: number;
      negative: number;
      volumePlanck: string;
    } | null = null;
    if (service.daoId) {
      seller = await resolveSellerFromDaoId(prisma, service.daoId);
    }
    if (!onChainStoreId && service.sellerStoreId) {
      try {
        const store = await prisma.sellerProfile.findUnique({ where: { id: service.sellerStoreId }, select: { onChainStoreId: true } });
        if (store?.onChainStoreId) {
          onChainStoreId = store.onChainStoreId.toString();
        }
      } catch {
        // ignore resolution errors
      }
    }
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
        app.log.warn({ err, onChainStoreId }, 'Falha ao consultar reputação on-chain do serviço');
      }
    }
    const payload = {
      ...service,
      onChainStoreId,
      onChainReputation,
      media,
      seller,
    };

    return reply.send(payload);

  });

  /**
   * GET /services — Listar serviços com filtros
   */
  app.get('/services', async (request, reply) => {
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
      where.basePriceBzr = {};
      if (query.priceMin) where.basePriceBzr.gte = parseFloat(query.priceMin);
      if (query.priceMax) where.basePriceBzr.lte = parseFloat(query.priceMax);
    }

    // Ordenação
    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'priceAsc') orderBy = { basePriceBzr: 'asc' };
    else if (query.sort === 'priceDesc') orderBy = { basePriceBzr: 'desc' };
    else if (query.sort === 'titleAsc') orderBy = { title: 'asc' };

    const [services, total] = await Promise.all([
      prisma.serviceOffering.findMany({
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
      prisma.serviceOffering.count({ where }),
    ]);

    return reply.send({
      data: services,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * PUT /services/:id — Atualizar serviço
   */
  app.put<{ Params: { id: string } }>('/services/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = updateServiceSchema.parse(request.body);

      // Verificar se o serviço existe
      const existing = await prisma.serviceOffering.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Serviço não encontrado' });
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
      // Nota: Apenas para casos onde serviço precisa ser reatribuído a outra loja
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

      // Atualizar serviço
      const updateDataRaw = {
        daoId: body.daoId,
        title: body.title,
        description: body.description,
        basePriceBzr: body.basePriceBzr ? body.basePriceBzr.replace(',', '.') : undefined,
        attributes: body.attributes ? processedAttributes : undefined,
        categoryId: categoryChanged ? categoryId : undefined,
        categoryPath: categoryChanged ? catPathArr : undefined,
        attributesSpecVersion: categoryChanged ? specVersion : undefined,
        onChainStoreId: onChainStoreId,
      };
      const updateData = pruneUndefined(updateDataRaw) as Prisma.ServiceOfferingUpdateInput;

      const updated = await prisma.serviceOffering.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          daoId: true,
          title: true,
          description: true,
          basePriceBzr: true,
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
            ownerType: 'ServiceOffering',
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
              ownerType: 'ServiceOffering',
              ownerId: id
            }
          });
        }
      }

      // Audit
      await prisma.auditLog.create({
        data: {
          entity: 'ServiceOffering',
          entityId: updated.id,
          action: 'UPDATE',
          actor: body.daoId ?? existing.daoId,
          diff: updated,
        },
      });

      return reply.send(updated);
    } catch (error) {
      app.log.error({ err: error as any }, 'Erro ao atualizar serviço');

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
   * DELETE /services/:id — Deletar serviço
   */
  app.delete<{ Params: { id: string } }>('/services/:id', async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.serviceOffering.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Serviço não encontrado' });
    }

    // Remover associações de mídia
    await prisma.mediaAsset.updateMany({
      where: {
        ownerType: 'ServiceOffering',
        ownerId: id
      },
      data: {
        ownerType: null,
        ownerId: null
      }
    });

    // Deletar serviço
    await prisma.serviceOffering.delete({ where: { id } });

    // Audit
    await prisma.auditLog.create({
      data: {
        entity: 'ServiceOffering',
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
