import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function achievementsRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // GET /achievements - Todas as conquistas disponíveis
  app.get('/achievements', async (request, reply) => {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: [{ category: 'asc' }, { tier: 'asc' }],
      });

      // Agrupar por categoria
      const grouped = achievements.reduce(
        (acc, achievement) => {
          if (!acc[achievement.category]) {
            acc[achievement.category] = [];
          }
          acc[achievement.category].push(achievement);
          return acc;
        },
        {} as Record<string, typeof achievements>
      );

      return reply.send({ items: achievements, grouped });
    } catch (error) {
      console.error('Error getting achievements:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /users/me/achievements - Conquistas do usuário
  app.get(
    '/users/me/achievements',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      try {
        // Buscar todas as conquistas
        const allAchievements = await prisma.achievement.findMany({
          orderBy: [{ category: 'asc' }, { tier: 'asc' }],
        });

        // Buscar progresso do usuário
        const userAchievements = await prisma.userAchievement.findMany({
          where: { userId: authUser.sub },
          include: {
            achievement: true,
          },
        });

        // Mapear progresso
        const progressMap = new Map(
          userAchievements.map((ua) => [ua.achievementId, ua])
        );

        // Combinar dados
        const achievementsWithProgress = allAchievements.map((achievement) => {
          const userProgress = progressMap.get(achievement.id);

          return {
            ...achievement,
            progress: userProgress?.progress || 0,
            unlocked: !!userProgress?.unlockedAt,
            unlockedAt: userProgress?.unlockedAt?.toISOString() || null,
          };
        });

        // Calcular estatísticas
        const stats = {
          total: allAchievements.length,
          unlocked: userAchievements.filter((ua) => ua.unlockedAt).length,
          inProgress: userAchievements.filter((ua) => !ua.unlockedAt && ua.progress > 0).length,
        };

        // Próximas a desbloquear (>= 50% do requirement)
        const nearlyUnlocked = achievementsWithProgress
          .filter((a) => {
            if (a.unlocked) return false;
            const req = a.requirement as { type: string; value: number };
            return a.progress >= req.value * 0.5;
          })
          .slice(0, 5);

        return reply.send({
          achievements: achievementsWithProgress,
          stats,
          nearlyUnlocked,
        });
      } catch (error) {
        console.error('Error getting user achievements:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}

export default achievementsRoutes;
