import type { PrismaClient } from '@prisma/client';

interface Post {
  id: string;
  authorId: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
}

interface UserContext {
  userId: string;
  followingIds: string[];
  interactionPatterns?: Map<string, number>;
}

/**
 * Calcula score de feed para um post baseado em múltiplos fatores
 * 
 * Weights:
 * - Recency: 30%
 * - Engagement: 40%
 * - Relationship: 20%
 * - Interest: 10%
 */
export function calculateFeedScore(post: Post, userContext: UserContext): number {
  const now = Date.now();
  const postAge = (now - post.createdAt.getTime()) / (1000 * 60 * 60); // hours

  // 1. Recency Score (30%)
  // Decaimento exponencial: e^(-hours/24)
  const recencyScore = Math.exp(-postAge / 24) * 30;

  // 2. Engagement Score (40%)
  // Normalizado pela idade do post
  const engagementRaw = (post.likesCount * 1 + post.commentsCount * 3);
  const engagementScore = (engagementRaw / (postAge + 1)) * 40;

  // 3. Relationship Score (20%)
  let relationshipScore = 0;
  if (userContext.followingIds.includes(post.authorId)) {
    relationshipScore = 50; // Segue o autor
  }
  // TODO: implementar "amigo em comum" (+20)
  relationshipScore *= 0.2; // 20% weight

  // 4. Interest Score (10%)
  // Baseado em interações anteriores com o autor
  let interestScore = 0;
  if (userContext.interactionPatterns) {
    const authorInteractions = userContext.interactionPatterns.get(post.authorId) || 0;
    interestScore = Math.min(authorInteractions * 2, 10); // Max 10
  }

  const totalScore = recencyScore + engagementScore + relationshipScore + interestScore;

  return totalScore;
}

/**
 * Carrega contexto do usuário para cálculo de score
 */
export async function loadUserContext(
  prisma: PrismaClient,
  userId: string
): Promise<UserContext> {
  // Buscar profile do usuário
  const userProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!userProfile) {
    return {
      userId,
      followingIds: [],
      interactionPatterns: new Map(),
    };
  }

  // Buscar profiles que o user segue
  const following = await prisma.follow.findMany({
    where: { followerId: userProfile.id },
    select: { following: { select: { userId: true } } },
  });

  const followingIds = following.map((f) => f.following.userId);

  // Buscar padrões de interação (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const interactions = await prisma.userInteraction.findMany({
    where: {
      userId,
      targetType: 'POST',
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      targetId: true,
      weight: true,
    },
  });

  // Agrupar interações por autor do post
  const interactionPatterns = new Map<string, number>();
  
  // Buscar autores dos posts interagidos
  const postIds = interactions.map((i) => i.targetId);
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds } },
    select: { id: true, authorId: true },
  });

  const postAuthorMap = new Map(posts.map((p) => [p.id, p.authorId]));

  interactions.forEach((interaction) => {
    const authorId = postAuthorMap.get(interaction.targetId);
    if (authorId) {
      const current = interactionPatterns.get(authorId) || 0;
      interactionPatterns.set(authorId, current + interaction.weight);
    }
  });

  return {
    userId,
    followingIds,
    interactionPatterns,
  };
}
