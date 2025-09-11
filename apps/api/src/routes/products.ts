// V-4: Correção do processamento de categoryPath para resolver erro 400 (2025-01-11)
// Ajustado para processar corretamente paths como ["casa-decoracao", "decoracao", "quadros"]

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  processAttributes,
  buildCategoryId,
  buildCategoryPathFromId,
  resolveEffectiveSpecByCategoryId
} from '../lib/categoryResolver.js';

// Schema de validação para criação
const createProductSchema = z.object({
  daoId: z.string(),
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
});

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

      // Criar produto
      const product = await prisma.product.create({
        data: {
          daoId: body.daoId,
          title: body.title,
          description: body.description,
          priceBzr: body.priceBzr.replace(',', '.'),
          categoryId,
          categoryPath: resolvedPath,
          attributes: processedAttributes,
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
      });

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
          diff: product,
        },
      });

      app.log.info(`Produto criado com sucesso: ${product.id}`);
      return reply.status(201).send(product);
    } catch (error) {
      app.log.error('Erro ao criar produto:', error);

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
          },
        },
      },
    });

    if (!product) {
      return reply.status(404).send({ error: 'Produto não encontrado' });
    }

    // Buscar mídias associadas
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        ownerType: 'Product',
        ownerId: id
      },
      select: {
        id: true,
        url: true,
        mime: true,
        size: true
      }
    });

    return reply.send({
      ...product,
      mediaAssets
    });
  });

  /**
   * GET /products — Listar produtos
   */
  app.get('/products', async (request, reply) => {
    const { page = '1', limit = '20', daoId, categoryId } = request.query as any;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const where: any = {};
    if (daoId) where.daoId = daoId;
    if (categoryId) where.categoryId = categoryId;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              namePt: true,
              nameEn: true,
              nameEs: true,
            },
          },
        },
      }),
    ]);

    return reply.send({
      data: products,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
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

      // Verificar se produto existe
      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      let categoryId = existing.categoryId;
      let catPathArr = existing.categoryPath;

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

      // Atualizar produto
      const updated = await prisma.product.update({
        where: { id },
        data: {
          ...(body.daoId ? { daoId: body.daoId } : {}),
          ...(body.title ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.priceBzr ? { priceBzr: body.priceBzr.replace(',', '.') } : {}),
          ...(catPathArr ? { categoryId, categoryPath: catPathArr } : {}),
          ...(body.attributes ? { attributes: processedAttributes } : {}),
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
          actor: body.daoId ?? 'system',
          diff: updated,
        },
      });

      return reply.send(updated);
    } catch (error) {
      app.log.error('Erro ao atualizar produto:', error);

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
   * DELETE /products/:id — Remover
   */
  app.delete<{ Params: { id: string } }>('/products/:id', async (req, reply) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!product) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      // Desassociar mídias
      await prisma.mediaAsset.updateMany({
        where: {
          ownerType: 'Product',
          ownerId: req.params.id
        },
        data: {
          ownerType: null,
          ownerId: null
        }
      });

      await prisma.product.delete({ where: { id: req.params.id } });

      await prisma.auditLog.create({
        data: {
          entity: 'Product',
          entityId: req.params.id,
          action: 'DELETE',
          actor: 'system',
          diff: product,
        },
      });

      return reply.status(204).send();
    } catch (error) {
      app.log.error('Erro ao deletar produto:', error);
      return reply.status(500).send({ error: 'Erro ao deletar produto' });
    }
  });
}