// V+1: Adiciona GET /products/:id e GET /products (lista com filtros) - 2025-09-11
// Mantém POST /products existente intacto
// Adiciona endpoint de detalhe e listagem simples para o frontend

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { categoryResolver } from '../resolvers/categoryResolver.js';

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
      const pageNum = Math.max(1, parseInt(page));
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize))); // Máximo 50 por página
      const offset = (pageNum - 1) * pageSizeNum;

      // Construir where clause
      const where: any = {};

      // Filtro por texto (título e descrição)
      if (q) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }

      // Filtro por categoria
      if (categoryId) {
        // Buscar por categoryPath que contenha o categoryId
        where.categoryPath = {
          has: categoryId,
        };
      }

      // Filtro por preço
      if (minPrice || maxPrice) {
        where.priceBzr = {};
        if (minPrice) {
          where.priceBzr.gte = minPrice;
        }
        if (maxPrice) {
          where.priceBzr.lte = maxPrice;
        }
      }

      // Construir orderBy
      let orderBy: any = {};
      switch (sort) {
        case 'priceAsc':
          orderBy = { priceBzr: 'asc' };
          break;
        case 'priceDesc':
          orderBy = { priceBzr: 'desc' };
          break;
        case 'createdDesc':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      // Buscar produtos
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          skip: offset,
          take: pageSizeNum,
          include: {
            media: {
              select: {
                id: true,
                url: true,
                mime: true,
                size: true,
              },
              take: 3, // Limitar mídias para performance
            },
          },
        }),
        prisma.product.count({ where }),
      ]);

      // Formatar resposta
      const items = products.map(product => ({
        id: product.id,
        kind: 'product' as const,
        title: product.title,
        description: product.description,
        priceBzr: product.priceBzr,
        categoryPath: product.categoryPath,
        attributes: product.attributes,
        media: product.media,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }));

      return reply.send({
        items,
        page: {
          current: pageNum,
          size: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum),
        },
        filters: {
          q,
          categoryId,
          minPrice,
          maxPrice,
          sort,
        },
      });
    } catch (error) {
      app.log.error('Erro ao listar produtos:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // POST /products - Criar produto (MANTIDO INTACTO)
  app.post<{ Body: CreateProductBody }>('/products', async (request, reply) => {
    try {
      const { daoId, title, description, priceBzr, categoryPath, attributes = {}, mediaIds = [] } = request.body;

      // Validação básica
      if (!daoId || !title || !priceBzr || !categoryPath?.length) {
        return reply.status(400).send({
          error: 'Campos obrigatórios: daoId, title, priceBzr, categoryPath'
        });
      }

      // Processar e validar atributos via categoryResolver
      const processedAttributes = await categoryResolver.processAttributes(categoryPath, attributes);

      // Criar produto
      const product = await prisma.product.create({
        data: {
          daoId,
          title,
          description: description || '',
          priceBzr,
          categoryPath,
          attributes: processedAttributes,
        },
      });

      // Vincular mídias se fornecidas
      if (mediaIds.length > 0) {
        await prisma.mediaAsset.updateMany({
          where: {
            id: { in: mediaIds },
            entityType: null, // Apenas mídias não vinculadas
          },
          data: {
            entityType: 'product',
            entityId: product.id,
          },
        });
      }

      app.log.info(`Produto criado: ${product.id} - ${title}`);

      return reply.status(201).send({
        id: product.id,
        title: product.title,
        categoryPath: product.categoryPath,
        message: 'Produto criado com sucesso',
      });
    } catch (error: any) {
      app.log.error('Erro ao criar produto:', error);
      
      if (error.name === 'ValidationError') {
        return reply.status(400).send({ error: error.message });
      }
      
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}