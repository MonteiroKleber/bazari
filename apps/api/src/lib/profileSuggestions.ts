import type { PrismaClient } from '@prisma/client';

export interface ProfileSuggestion {
  profileId: string;
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  reputationScore: number;
  matchScore: number; // 0-100
  reason: string;
  mutualFollowers?: number;
}

interface ScoredProfile {
  profileId: string;
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  reputationScore: number;
  networkScore: number;
  interestScore: number;
  activityScore: number;
  mutualFollowers: number;
}

/**
 * Calcula sugestões de perfis baseado em network, interesses e atividade
 */
export async function calculateProfileSuggestions(
  prisma: PrismaClient,
  userId: string,
  limit: number = 10
): Promise<ProfileSuggestion[]> {
  // 1. Buscar profile do usuário
  const userProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!userProfile) {
    return [];
  }

  // 2. Buscar perfis já seguidos
  const following = await prisma.follow.findMany({
    where: { followerId: userProfile.id },
    select: { followingId: true },
  });

  const followingIds = following.map((f) => f.followingId);

  // 3. NETWORK SCORE (50%): Amigos de amigos (2º grau)
  const friendsOfFriends = await prisma.follow.findMany({
    where: {
      followerId: { in: followingIds },
      followingId: { notIn: [...followingIds, userProfile.id] },
    },
    select: {
      followingId: true,
      following: {
        select: {
          id: true,
          userId: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          reputationScore: true,
          updatedAt: true,
        },
      },
    },
  });

  // Contar conexões em comum
  const networkScores = new Map<string, { profile: any; mutualCount: number }>();

  for (const fof of friendsOfFriends) {
    const existing = networkScores.get(fof.followingId);
    if (existing) {
      existing.mutualCount += 1;
    } else {
      networkScores.set(fof.followingId, {
        profile: fof.following,
        mutualCount: 1,
      });
    }
  }

  // 4. INTEREST SCORE (30%): Badges similares e interações similares
  const userBadges = await prisma.profileBadge.findMany({
    where: { profileId: userProfile.id },
    select: { code: true },
  });

  const userBadgeCodes = userBadges.map((b) => b.code);

  const similarBadgeProfiles =
    userBadgeCodes.length > 0
      ? await prisma.profileBadge.findMany({
          where: {
            code: { in: userBadgeCodes },
            profileId: { notIn: [...followingIds, userProfile.id] },
          },
          select: {
            profileId: true,
            profile: {
              select: {
                id: true,
                userId: true,
                handle: true,
                displayName: true,
                avatarUrl: true,
                reputationScore: true,
                updatedAt: true,
              },
            },
          },
          distinct: ['profileId'],
        })
      : [];

  // 5. ACTIVITY SCORE (20%): Perfis ativos e com alta reputação
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeProfiles = await prisma.profile.findMany({
    where: {
      id: { notIn: [...followingIds, userProfile.id] },
      updatedAt: { gte: thirtyDaysAgo },
      reputationScore: { gte: 100 }, // Apenas com reputação mínima
    },
    select: {
      id: true,
      userId: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
      reputationScore: true,
      updatedAt: true,
    },
    take: 50, // Limitar para performance
    orderBy: { reputationScore: 'desc' },
  });

  // 6. Combinar scores
  const scoredProfiles = new Map<string, ScoredProfile>();

  // Network scores
  for (const [profileId, data] of networkScores.entries()) {
    const profile = data.profile;
    const networkScore = Math.min(data.mutualCount * 20, 50); // Max 50 (50% weight)

    scoredProfiles.set(profileId, {
      profileId: profile.id,
      userId: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      reputationScore: profile.reputationScore,
      networkScore,
      interestScore: 0,
      activityScore: 0,
      mutualFollowers: data.mutualCount,
    });
  }

  // Interest scores
  for (const item of similarBadgeProfiles) {
    const profile = item.profile;
    const existing = scoredProfiles.get(profile.id);

    if (existing) {
      existing.interestScore += 10; // Acumular
    } else {
      scoredProfiles.set(profile.id, {
        profileId: profile.id,
        userId: profile.userId,
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        reputationScore: profile.reputationScore,
        networkScore: 0,
        interestScore: 10,
        activityScore: 0,
        mutualFollowers: 0,
      });
    }
  }

  // Activity scores
  for (const profile of activeProfiles) {
    const existing = scoredProfiles.get(profile.id);
    const daysSinceUpdate = Math.floor(
      (Date.now() - profile.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const activityScore = Math.max(20 - daysSinceUpdate, 0); // Mais recente = maior score
    const reputationBonus = Math.min(profile.reputationScore / 100, 10); // Max 10

    if (existing) {
      existing.activityScore = activityScore + reputationBonus;
    } else {
      scoredProfiles.set(profile.id, {
        profileId: profile.id,
        userId: profile.userId,
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        reputationScore: profile.reputationScore,
        networkScore: 0,
        interestScore: 0,
        activityScore: activityScore + reputationBonus,
        mutualFollowers: 0,
      });
    }
  }

  // 7. Calcular match score final
  const suggestions: ProfileSuggestion[] = Array.from(scoredProfiles.values())
    .map((scored) => {
      const matchScore = Math.min(
        scored.networkScore + scored.interestScore + scored.activityScore,
        100
      );

      // Determinar razão principal
      let reason = 'Perfil ativo na comunidade';
      if (scored.networkScore >= scored.interestScore && scored.networkScore >= scored.activityScore) {
        reason =
          scored.mutualFollowers > 1
            ? `Seguido por ${scored.mutualFollowers} pessoas que você segue`
            : 'Seguido por pessoas que você conhece';
      } else if (scored.interestScore > scored.activityScore) {
        reason = 'Interesses similares aos seus';
      } else if (scored.reputationScore > 500) {
        reason = `Alta reputação (${scored.reputationScore})`;
      }

      return {
        profileId: scored.profileId,
        userId: scored.userId,
        handle: scored.handle,
        displayName: scored.displayName,
        avatarUrl: scored.avatarUrl,
        reputationScore: scored.reputationScore,
        matchScore,
        reason,
        mutualFollowers: scored.mutualFollowers > 0 ? scored.mutualFollowers : undefined,
      };
    })
    .filter((s) => s.matchScore > 10) // Apenas sugestões com score mínimo
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return suggestions;
}
