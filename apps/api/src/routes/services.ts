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

const updateServiceSchema = createServiceSchema.partial();

export async function servicesRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // POST /services - Criar serviço com validação completa
  app.post('/services', async (request, reply) => {
    try {
      const body = createServiceSchema.parse(request.body);
      
      // Resolver categoria e validar que é uma folha
      const { categoryId, path, category } = await resolveCategoryPath(
        'service',
        body.categoryPath
      );
      
      // Processar e validar atributos com effective spec
      const processed = await processAttributes(categoryId, body.attributes);
      
      if (!processed.valid) {
        return reply.status(400).send({
          error: 'Atributos inválidos para a categoria',
          category: {
            id: categoryId,
            name: category.namePt,
            path: category.pathSlugs
          },
          details: processed.errors
        });
      }
      
      // Criar serviço com campos indexáveis projetados
      const service = await prisma.serviceOffering.create({
        data: {
          daoId: body.daoId,
          title: body.title,
          description: body.description,
          basePriceBzr: body.basePriceBzr,
          categoryId,
          categoryPath: path,
          attributes: {
            ...processed.processedAttributes,
            _indexFields: processed.indexFields // Campos projetados para busca
          },
          attributesSpecVersion: processed.specVersion || '1.0.0'
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
      
      app.log.info(`Serviço criado: ${service.id} - ${service.title}`);
      
      return reply.status(201).send({
        id: service.id,
        ...service,
        categoryInfo: {
          id: category.id,
          namePt: category.namePt,
          nameEn: category.nameEn,
          nameEs: category.nameEs,
          path: category.pathSlugs,
          level: category.level
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

  // GET /services/:id - Obter serviço com informações da categoria
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

  // PUT /services/:id - Atualizar serviço
  app.put<{ Params: { id: string } }>('/services/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = updateServiceSchema.parse(request.body);
      
      // Buscar serviço existente
      const existing = await prisma.serviceOffering.findUnique({
        where: { id }
      });
      
      if (!existing) {
        return reply.status(404).send({
          error: 'Serviço não encontrado'
        });
      }
      
      let updateData: any = {
        title: body.title,
        description: body.description,
        basePriceBzr: body.basePriceBzr
      };
      
      // Se mudou categoria ou atributos, revalidar
      if (body.categoryPath || body.attributes) {
        const categoryPath = body.categoryPath || existing.categoryPath;
        const attributes = body.attributes || existing.attributes;
        
        const { categoryId, path, category } = await resolveCategoryPath(
          'service',
          categoryPath
        );
        
        const processed = await processAttributes(categoryId, attributes);
        
        if (!processed.valid) {
          return reply.status(400).send({
            error: 'Atributos inválidos',
            details: processed.errors
          });
        }
        
        updateData = {
          ...updateData,
          categoryId,
          categoryPath: path,
          attributes: {
            ...processed.processedAttributes,
            _indexFields: processed.indexFields
          },
          attributesSpecVersion: processed.specVersion || '1.0.0'
        };
      }
      
      const updated = await prisma.serviceOffering.update({
        where: { id },
        data: updateData
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          entity: 'ServiceOffering',
          entityId: id,
          action: 'UPDATE',
          actor: body.daoId || 'system',
          diff: { before: existing, after: updated }
        }
      });
      
      return reply.send(updated);
      
    } catch (error) {
      app.log.error('Erro ao atualizar serviço:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors
        });
      }
      
      return reply.status(500).send({
        error: 'Erro ao atualizar serviço'
      });
    }
  });

  // GET /services - Listar serviços com filtros
  app.get('/services', async (request, reply) => {
    try {
      const { 
        categoryId, 
        categoryPath,
        daoId,
        minPrice,
        maxPrice,
        page = '1',
        limit = '20'
      } = request.query as any;
      
      const where: any = {};
      
      if (categoryId) where.categoryId = categoryId;
      if (daoId) where.daoId = daoId;
      
      if (categoryPath) {
        // Filtrar por path parcial
        const pathArray = categoryPath.split(',');
        where.categoryPath = {
          hasEvery: pathArray
        };
      }
      
      if (minPrice || maxPrice) {
        where.basePriceBzr = {};
        if (minPrice) where.basePriceBzr.gte = parseFloat(minPrice);
        if (maxPrice) where.basePriceBzr.lte = parseFloat(maxPrice);
      }
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      const [services, total] = await Promise.all([
        prisma.serviceOffering.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true
          }
        }),
        prisma.serviceOffering.count({ where })
      ]);
      
      return reply.send({
        services,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
      
    } catch (error) {
      app.log.error('Erro ao listar serviços:', error);
      return reply.status(500).send({
        error: 'Erro ao listar serviços'
      });
    }
  });

  // DELETE /services/:id
  app.delete<{ Params: { id: string } }>('/services/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const service = await prisma.serviceOffering.findUnique({
        where: { id }
      });
      
      if (!service) {
        return reply.status(404).send({
          error: 'Serviço não encontrado'
        });
      }
      
      await prisma.serviceOffering.delete({
        where: { id }
      });
      
      // Audit log
      await prisma.auditLog.create({
        data: {
          entity: 'ServiceOffering',
          entityId: id,
          action: 'DELETE',
          actor: 'system',
          diff: service
        }
      });
      
      return reply.status(204).send();
      
    } catch (error) {
      app.log.error('Erro ao deletar serviço:', error);
      return reply.status(500).send({
        error: 'Erro ao deletar serviço'
      });
    }
  });
}