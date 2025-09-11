// V-2: Correção do import do categoryResolver - 2025-09-11
// Corrigido path de '../resolvers/categoryResolver.js' para '../lib/categoryResolver.js'
// Mantém toda funcionalidade existente intacta
// path: apps/api/src/routes/products.ts

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { 
  processAttributes,
  buildCategoryId,
  buildCategoryPathFromId,
  resolveEffectiveSpecByCategoryId
} from '../lib/categoryResolver.js';

interface CreateProductBody {
  daoId: string;
  title: string;
  description?: string;
  priceBzr: string;
  categoryPath: string[];
  attributes?: Record<string, any>;
  mediaIds?: string[];
}

interface ProductsQueryParams {
  q?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
  pageSize?: string;
  sort?: 'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc';
}

export async function productsRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  /**
   * Função auxiliar para resolver categoryId a partir do path
   */
  async function resolveCategoryFromPath(categoryPath: string[]): Promise<string | null> {
    if (!categoryPath || categoryPath.length === 0) return null;
    
    // Tentar products primeiro
    const productsId = buildCategoryId('products', categoryPath);
    const productsCategory = await prisma.category.findUnique({ where: { id: productsId } });
    if (productsCategory) return productsId;
    
    // Fallback para services
    const servicesId = buildCategoryId('services', categoryPath);
    const servicesCategory = await prisma.category.findUnique({ where: { id: servicesId } });
    if (servicesCategory) return servicesId;
    
    return null;
  }

  // GET /products/:id - Obter produto por ID com mídias
  app.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          media: {
            select: {
              id: true,
              url: true,
              mime: true,
              size: true,
            },
          },
        },
      });

      if (!product) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      return reply.send({
        id: product.id,
        kind: 'product' as const,
        title: product.title,
        description: product.description,
        priceBzr: product.priceBzr,
        categoryPath: product.categoryPath,
        attributes: product.attributes,
        media: product.media,
        daoId: product.daoId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    } catch (error) {
      app.log.error('Erro ao buscar produto:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // GET /products - Listar produtos com filtros simples
  app.get<{ Querystring: ProductsQueryParams }>('/products', async (request, reply) => {
    const {
      q,
      categoryId,
      minPrice,
      maxPrice,
      page = '1',
      pageSize = '20',
      sort = 'createdDesc'
    } = request.query;

    try {
      const pageNum = parseInt(page);
      const pageSizeNum = parseInt(pageSize);
      const skip = (pageNum - 1) * pageSizeNum;

      // Construir filtros
      const where: any = {};

      // Filtro de busca por texto
      if (q && q.trim()) {
        where.OR = [
          { title: { contains: q.trim(), mode: 'insensitive' } },
          { description: { contains: q.trim(), mode: 'insensitive' } }
        ];
      }

      // Filtro por categoria
      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Filtro por preço
      if (minPrice) {
        const minPriceDecimal = parseFloat(minPrice);
        if (!isNaN(minPriceDecimal)) {
          where.priceBzr = { gte: minPriceDecimal.toString() };
        }
      }

      if (maxPrice) {
        const maxPriceDecimal = parseFloat(maxPrice);
        if (!isNaN(maxPriceDecimal)) {
          where.priceBzr = {
            ...where.priceBzr,
            lte: maxPriceDecimal.toString()
          };
        }
      }

      // Definir ordenação
      let orderBy: any = { createdAt: 'desc' };
      switch (sort) {
        case 'priceAsc':
          orderBy = { priceBzr: 'asc' };
          break;
        case 'priceDesc':
          orderBy = { priceBzr: 'desc' };
          break;
        case 'createdDesc':
          orderBy = { createdAt: 'desc' };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }

      // Buscar produtos
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: pageSizeNum,
          include: {
            media: {
              select: {
                id: true,
                url: true,
                mime: true,
                size: true,
              },
              take: 1, // Apenas primeira mídia para listagem
            },
          },
        }),
        prisma.product.count({ where })
      ]);

      const totalPages = Math.ceil(total / pageSizeNum);

      return reply.send({
        products: products.map(product => ({
          id: product.id,
          kind: 'product' as const,
          title: product.title,
          description: product.description,
          priceBzr: product.priceBzr,
          categoryPath: product.categoryPath,
          attributes: product.attributes,
          media: product.media,
          daoId: product.daoId,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        })),
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        }
      });
    } catch (error) {
      app.log.error('Erro ao listar produtos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // POST /products - Criar novo produto
  app.post<{ Body: CreateProductBody }>('/products', async (request, reply) => {
    const { daoId, title, description, priceBzr, categoryPath, attributes, mediaIds } = request.body;

    try {
      // Resolver categoryId a partir do path
      const categoryId = await resolveCategoryFromPath(categoryPath);
      if (!categoryId) {
        return reply.status(400).send({ 
          error: 'Categoria não encontrada',
          categoryPath 
        });
      }

      // Processar atributos com validação
      const { attributes: processedAttributes, errors } = await processAttributes(
        attributes || {}, 
        { categoryId }
      );

      if (Object.keys(errors).length > 0) {
        return reply.status(400).send({ 
          error: 'Atributos inválidos', 
          validationErrors: errors 
        });
      }

      // Verificar se as mídias existem (se fornecidas)
      if (mediaIds && mediaIds.length > 0) {
        const existingMedia = await prisma.media.findMany({
          where: { id: { in: mediaIds } }
        });
        
        if (existingMedia.length !== mediaIds.length) {
          return reply.status(400).send({ 
            error: 'Algumas mídias não foram encontradas' 
          });
        }
      }

      // Criar o produto
      const product = await prisma.product.create({
        data: {
          daoId,
          title,
          description,
          priceBzr,
          categoryId,
          categoryPath,
          attributes: processedAttributes,
          media: mediaIds && mediaIds.length > 0 ? {
            connect: mediaIds.map(id => ({ id }))
          } : undefined,
        },
        include: {
          media: {
            select: {
              id: true,
              url: true,
              mime: true,
              size: true,
            },
          },
        },
      });

      return reply.status(201).send({
        id: product.id,
        kind: 'product' as const,
        title: product.title,
        description: product.description,
        priceBzr: product.priceBzr,
        categoryPath: product.categoryPath,
        attributes: product.attributes,
        media: product.media,
        daoId: product.daoId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    } catch (error) {
      app.log.error('Erro ao criar produto:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}