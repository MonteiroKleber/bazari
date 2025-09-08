import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

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

  // Executar seed idempotente
  app.post('/categories/seed', async (request, reply) => {
    try {
      // Importar e executar seed
      const { default: runSeed } = await import('../../prisma/seed.js');
      
      // Se o seed não exportar default, tentar executar diretamente
      if (typeof runSeed === 'function') {
        await runSeed();
      } else {
        // Executar seed manualmente
        const categories = [
          {
            slug: 'alimentos-bebidas',
            level: 1,
            pathSlugs: ['products', 'alimentos-bebidas'],
            namePt: 'Alimentos e Bebidas',
            nameEn: 'Food & Drinks',
            nameEs: 'Alimentos y Bebidas',
          },
          {
            slug: 'tecnologia',
            level: 1,
            pathSlugs: ['products', 'tecnologia'],
            namePt: 'Tecnologia',
            nameEn: 'Technology',
            nameEs: 'Tecnología',
          },
        ];

        for (const cat of categories) {
          await prisma.category.upsert({
            where: { slug: cat.slug },
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