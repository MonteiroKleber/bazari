// path: apps/api/src/routes/categories.ts

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { resolveEffectiveSpec } from '../lib/categoryResolver.js';

const effectiveSpecQuerySchema = z.object({
  path: z.string().optional(),
  id: z.string().optional()
});

export async function categoriesRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // Listar todas as categorias
  app.get('/categories', async (request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: [
        { level: 'asc' },
        { slug: 'asc' },
      ],
    });

    // Organizar em árvore se necessário
    const tree = {
      products: categories.filter(c => c.pathSlugs[0] === 'products'),
      services: categories.filter(c => c.pathSlugs[0] === 'services'),
    };

    return reply.send({
      total: categories.length,
      tree,
      flat: categories,
    });
  });

  // Obter effective spec de uma categoria
  app.get('/categories/effective-spec', async (request, reply) => {
    try {
      const query = effectiveSpecQuerySchema.parse(request.query);
      
      let categoryId: string | null = null;
      
      if (query.id) {
        categoryId = query.id;
      } else if (query.path) {
        // Converter path para ID (ex: products>tecnologia>eletronicos>celulares)
        const pathParts = query.path.split('>');
        categoryId = pathParts.join('-');
      }

      if (!categoryId) {
        return reply.status(400).send({
          error: 'Category ID or path required'
        });
      }

      // Verificar se categoria existe
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return reply.status(404).send({
          error: 'Category not found'
        });
      }

      // Resolver spec efetiva (merge L1→L4)
      const effectiveSpec = await resolveEffectiveSpec(categoryId);
      
      return reply.send({
        categoryId,
        categoryPath: category.pathSlugs,
        ...effectiveSpec
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: error.errors
        });
      }
      
      app.log.error('Error getting effective spec:', error);
      return reply.status(500).send({
        error: 'Failed to get effective spec'
      });
    }
  });

  // GET /categories/:id/spec - alternativa
  app.get('/categories/:id/spec', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const category = await prisma.category.findUnique({
        where: { id }
      });

      if (!category) {
        return reply.status(404).send({
          error: 'Category not found'
        });
      }

      const effectiveSpec = await resolveEffectiveSpec(id);
      
      return reply.send({
        categoryId: id,
        categoryPath: category.pathSlugs,
        ...effectiveSpec
      });
    } catch (error) {
      app.log.error('Error getting category spec:', error);
      return reply.status(500).send({
        error: 'Failed to get category spec'
      });
    }
  });

  // Executar seed idempotente
  app.post('/categories/seed', async (request, reply) => {
    try {
      // Importar e executar seed
      const { default: runSeed } = await import('../../prisma/seed.js');
      
      // Se o seed não exportar default, tentar executar diretamente
      if (typeof runSeed === 'function') {
        await runSeed();
      } else {
        // Executar seed manualmente (simplificado)
        const categories = [
          {
            id: 'products-alimentos-bebidas',
            slug: 'products-alimentos-bebidas',
            kind: 'product',
            level: 1,
            pathSlugs: ['products', 'alimentos-bebidas'],
            pathNamesPt: ['Produtos', 'Alimentos e Bebidas'],
            pathNamesEn: ['Products', 'Food & Drinks'],
            pathNamesEs: ['Productos', 'Alimentos y Bebidas'],
            namePt: 'Alimentos e Bebidas',
            nameEn: 'Food & Drinks',
            nameEs: 'Alimentos y Bebidas',
          },
          {
            id: 'products-tecnologia',
            slug: 'products-tecnologia',
            kind: 'product',
            level: 1,
            pathSlugs: ['products', 'tecnologia'],
            pathNamesPt: ['Produtos', 'Tecnologia'],
            pathNamesEn: ['Products', 'Technology'],
            pathNamesEs: ['Productos', 'Tecnología'],
            namePt: 'Tecnologia',
            nameEn: 'Technology',
            nameEs: 'Tecnología',
          },
        ];

        for (const cat of categories) {
          await prisma.category.upsert({
            where: { id: cat.id },
            update: {},
            create: cat,
          });
        }
      }

      return reply.send({ 
        success: true, 
        message: 'Seed executado com sucesso' 
      });
    } catch (error) {
      app.log.error('Erro no seed:', error);
      return reply.status(500).send({ 
        error: 'Erro ao executar seed',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}