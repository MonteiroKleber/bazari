import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { resolveCategoryPath, processAttributes } from '../lib/categoryResolver.js';

const createServiceSchema = z.object({
  daoId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  basePriceBzr: z.string().regex(/^\d+(\.\d{1,12})?$/).optional(),
  categoryPath: z.array(z.string()).min(1),
  attributes: z.record(z.any())
});

export async function servicesRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // POST /services - Criar serviço
  app.post('/services', async (request, reply) => {
    try {
      const body = createServiceSchema.parse(request.body);
      
      // Resolver categoria
      const { categoryId, path, category } = await resolveCategoryPath(
        'service',
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
      
      // Criar serviço
      const service = await prisma.serviceOffering.create({
        data: {
          daoId: body.daoId,
          title: body.title,
          description: body.description,
          basePriceBzr: body.basePriceBzr,
          categoryId,
          categoryPath: path,
          attributes: processed.processedAttributes,
          attributesSpecVersion: processed.specVersion || '0.0.0'
        }
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          entity: 'ServiceOffering',
          entityId: service.id,
          action: 'CREATE',
          actor: body.daoId,
          diff: service
        }
      });
      
      app.log.info(`Serviço criado: ${service.id}`);
      
      return reply.status(201).send({
        id: service.id,
        ...service,
        categoryInfo: {
          id: category.id,
          namePt: category.namePt,
          nameEn: category.nameEn,
          nameEs: category.nameEs,
          path: category.pathSlugs
        }
      });
      
    } catch (error) {
      app.log.error('Erro ao criar serviço:', error);
      
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
        error: 'Erro ao criar serviço'
      });
    }
  });

  // GET /services/:id - Obter serviço
  app.get<{ Params: { id: string } }>('/services/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const service = await prisma.serviceOffering.findUnique({
        where: { id },
        include: {
          category: true
        }
      });
      
      if (!service) {
        return reply.status(404).send({
          error: 'Serviço não encontrado'
        });
      }
      
      return reply.send(service);
      
    } catch (error) {
      app.log.error('Erro ao buscar serviço:', error);
      return reply.status(500).send({
        error: 'Erro ao buscar serviço'
      });
    }
  });

  // GET /services - Listar serviços
  app.get('/services', async (request, reply) => {
    try {
      const { daoId, categoryId, limit = 20, offset = 0 } = request.query as any;
      
      const where: any = {};
      if (daoId) where.daoId = daoId;
      if (categoryId) where.categoryId = categoryId;
      
      const [services, total] = await Promise.all([
        prisma.serviceOffering.findMany({
          where,
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
          include: {
            category: true
          }
        }),
        prisma.serviceOffering.count({ where })
      ]);
      
      return reply.send({
        data: services,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
    } catch (error) {
      app.log.error('Erro ao listar serviços:', error);
      return reply.status(500).send({
        error: 'Erro ao listar serviços'
      });
    }
  });
}