import type { PrismaClient } from '@prisma/client';

export interface TrendingTopicData {
  tag: string;
  count: number;
  score: number;
  growthRate?: number | null;
}

/**
 * Extrai hashtags de um texto
 * Exemplo: "Olá #mundo e #bazari" -> ["mundo", "bazari"]
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);
  const tags: string[] = [];

  for (const match of matches) {
    tags.push(match[1].toLowerCase());
  }

  return [...new Set(tags)]; // Remove duplicatas
}

/**
 * Calcula score de trending baseado em frequência e recência
 * Score = count * recency_weight
 * Recency weight: posts mais recentes têm peso maior
 */
export function calculateTrendingScore(count: number, hoursAgo: number): number {
  // Peso exponencial baseado em quão recente é
  // Posts das últimas 6h têm peso 1.0
  // Posts de 12h atrás têm peso 0.5
  // Posts de 24h atrás têm peso 0.25
  const recencyWeight = Math.exp(-hoursAgo / 12);

  return count * recencyWeight;
}

/**
 * Atualiza trending topics baseado nos posts recentes
 */
export async function updateTrendingTopics(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Buscar posts das últimas 24h
  const recentPosts = await prisma.post.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo },
      status: 'PUBLISHED',
    },
    select: {
      content: true,
      createdAt: true,
    },
  });

  // 2. Extrair e contar hashtags
  const tagCounts = new Map<string, { count: number; totalScore: number }>();

  for (const post of recentPosts) {
    const hashtags = extractHashtags(post.content);
    const hoursAgo = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);

    for (const tag of hashtags) {
      const existing = tagCounts.get(tag);
      const score = calculateTrendingScore(1, hoursAgo);

      if (existing) {
        existing.count += 1;
        existing.totalScore += score;
      } else {
        tagCounts.set(tag, { count: 1, totalScore: score });
      }
    }
  }

  // 3. Buscar dados anteriores para calcular growth rate
  const previousTopics = await prisma.trendingTopic.findMany({
    select: { tag: true, count: true },
  });

  const previousCountMap = new Map(previousTopics.map((t) => [t.tag, t.count]));

  // 4. Preparar dados para upsert
  const trendingData: TrendingTopicData[] = Array.from(tagCounts.entries()).map(
    ([tag, data]) => {
      const previousCount = previousCountMap.get(tag) || 0;
      const growthRate = previousCount > 0 ? ((data.count - previousCount) / previousCount) * 100 : 100;

      return {
        tag,
        count: data.count,
        score: data.totalScore,
        growthRate,
      };
    }
  );

  // 5. Atualizar banco (upsert)
  for (const topic of trendingData) {
    await prisma.trendingTopic.upsert({
      where: { tag: topic.tag },
      update: {
        count: topic.count,
        score: topic.score,
        growthRate: topic.growthRate,
        updatedAt: now,
      },
      create: {
        tag: topic.tag,
        count: topic.count,
        score: topic.score,
        growthRate: topic.growthRate,
      },
    });
  }

  // 6. Limpar tópicos antigos (>24h sem atualização)
  await prisma.trendingTopic.deleteMany({
    where: {
      updatedAt: { lt: twentyFourHoursAgo },
    },
  });

  console.log(`[Trending] Updated ${trendingData.length} topics`);
}

/**
 * Busca top trending topics
 */
export async function getTopTrendingTopics(
  prisma: PrismaClient,
  limit: number = 10
): Promise<TrendingTopicData[]> {
  const topics = await prisma.trendingTopic.findMany({
    take: limit,
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    select: {
      tag: true,
      count: true,
      score: true,
      growthRate: true,
    },
  });

  return topics;
}
