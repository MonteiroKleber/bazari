import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { resolveCategoryPath, processAttributes } from '../lib/categoryResolver.js';

const createProductSchema = z.object({
  daoId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priceBzr: z.string().regex(/^\d+(\.\d{1,12})?$/),
  categoryPath: z.array(z.string()).min(1),
  attributes: z.record(z.any())
});

export async function productsRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // POST /products - Criar produto
  app.post('/products', async (request, reply) => {
    try {
      const body = createProductSchema.parse(request.body);
      
      // Resolver categoria
      const { categoryId, path, category } = await resolveCategoryPath(
        'product',
        body.categoryPath
      );
      
      // Processar e validar atributos
      const processed = await processAttributes(categoryId, body.attributes);
      
      if (!processed.valid) {
        return reply.status(400).send({
          error: 'Atributos inválidos',
          details: processed.errors
        });
      }
      
      // Criar produto
      const product = await prisma.product.create({
        data: {
          daoId: body.daoId,
          title: body.title,
          description: body.description,
          priceBzr: body.priceBzr,
          categoryId,
          categoryPath: path,
          attributes: processed.processedAttributes,
          attributesSpecVersion: processed.specVersion || '0.0.0'
        }
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          entity: 'Product',
          entityId: product.id,
          action: 'CREATE',
          actor: body.daoId,
          diff: product
        }
      });
      
      app.log.info(`Produto criado: ${product.id}`);
      
      return reply.status(201).send({
        id: product.id,
        ...product,
        categoryInfo: {
          id: category.id,
          namePt: category.namePt,
          nameEn: category.nameEn,
          nameEs: category.nameEs,
          path: category.pathSlugs
        }
      });
      
    } catch (error) {
      app.log.error('Erro ao criar produto:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors
        });
      }
      
      if (error instanceof Error) {
        return reply.status(400).send({
          error: error.message
        });
      }
      
      return reply.status(500).send({
        error: 'Erro ao criar produto'
      });
    }
  });

  // GET /products/:id - Obter produto
  app.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true
        }
      });
      
      if (!product) {
        return reply.status(404).send({
          error: 'Produto não encontrado'
        });
      }
      
      return reply.send(product);
      
    } catch (error) {
      app.log.error('Erro ao buscar produto:', error);
      return reply.status(500).send({
        error: 'Erro ao buscar produto'
      });
    }
  });

  // GET /products - Listar produtos
  app.get('/products', async (request, reply) => {
    try {
      const { daoId, categoryId, limit = 20, offset = 0 } = request.query as any;
      
      const where: any = {};
      if (daoId) where.daoId = daoId;
      if (categoryId) where.categoryId = categoryId;
      
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
          include: {
            category: true
          }
        }),
        prisma.product.count({ where })
      ]);
      
      return reply.send({
        data: products,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
    } catch (error) {
      app.log.error('Erro ao listar produtos:', error);
      return reply.status(500).send({
        error: 'Erro ao listar produtos'
      });
    }
  });
}