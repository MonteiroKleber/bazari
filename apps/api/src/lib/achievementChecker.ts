import { PrismaClient } from '@prisma/client';

interface AchievementRequirement {
  type: string;
  value: number;
}

/**
 * Verifica e desbloqueia achievements para um usuário
 */
export async function checkAchievements(
  prisma: PrismaClient,
  userId: string,
  eventType: 'POST_CREATED' | 'LIKE_RECEIVED' | 'COMMENT_CREATED' | 'FOLLOW'
): Promise<void> {
  try {
    // Buscar achievements relevantes
    const achievements = await prisma.achievement.findMany();

    for (const achievement of achievements) {
      const req = achievement.requirement as AchievementRequirement;

      // Verificar se já foi desbloqueado
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      if (existing?.unlockedAt) continue; // Já desbloqueado

      // Calcular progresso baseado no tipo
      let currentProgress = 0;

      switch (req.type) {
        case 'POST_COUNT':
          currentProgress = await prisma.post.count({
            where: { authorId: userId },
          });
          break;

        case 'COMMENT_COUNT':
          currentProgress = await prisma.postComment.count({
            where: { authorId: userId },
          });
          break;

        case 'LIKES_RECEIVED':
          const posts = await prisma.post.findMany({
            where: { authorId: userId },
            select: { id: true },
          });
          currentProgress = await prisma.postLike.count({
            where: { postId: { in: posts.map((p) => p.id) } },
          });
          break;

        case 'FOLLOWING_COUNT':
          const profile = await prisma.profile.findUnique({
            where: { userId },
            select: { id: true },
          });
          if (profile) {
            currentProgress = await prisma.follow.count({
              where: { followerId: profile.id },
            });
          }
          break;

        case 'FOLLOWERS_COUNT':
          const userProfile = await prisma.profile.findUnique({
            where: { userId },
            select: { id: true },
          });
          if (userProfile) {
            currentProgress = await prisma.follow.count({
              where: { followingId: userProfile.id },
            });
          }
          break;
      }

      // Atualizar ou criar progresso
      const unlocked = currentProgress >= req.value;

      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
        update: {
          progress: currentProgress,
          unlockedAt: unlocked && !existing?.unlockedAt ? new Date() : existing?.unlockedAt,
        },
        create: {
          userId,
          achievementId: achievement.id,
          progress: currentProgress,
          unlockedAt: unlocked ? new Date() : null,
        },
      });

      // Criar notificação se desbloqueou agora
      if (unlocked && !existing?.unlockedAt) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'ACHIEVEMENT_UNLOCKED',
            metadata: {
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
            },
          },
        });

        console.log(`[Achievement] User ${userId} unlocked: ${achievement.name}`);
      }
    }
  } catch (error) {
    console.error('[Achievement] Error checking achievements:', error);
  }
}
