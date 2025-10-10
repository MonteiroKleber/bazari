// User Analytics Routes
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function analyticsRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // GET /users/me/analytics - Get user analytics
  app.get('/users/me/analytics', { onRequest: authOnRequest }, async (req, reply) => {
    const userId = req.user!.sub;
    const query = req.query as { timeRange?: '7d' | '30d' | '90d' };
    const timeRange = query.timeRange || '30d';

    // Calculate date range
    const days = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }

    // Get posts in time range
    const posts = await prisma.post.findMany({
      where: {
        authorId: profile.id,
        createdAt: { gte: startDate },
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total engagement
    const totalLikes = posts.reduce((sum, p) => sum + p._count.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p._count.comments, 0);
    const totalEngagement = totalLikes + totalComments;
    const engagementRate = posts.length > 0 ? totalEngagement / posts.length : 0;

    // Get follower growth over time
    const followers = await prisma.follow.findMany({
      where: {
        followingId: profile.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
      },
    });

    // Group followers by date
    const followerGrowth: { date: string; count: number }[] = [];
    const followersByDate = new Map<string, number>();

    followers.forEach((f) => {
      const dateKey = f.createdAt.toISOString().split('T')[0];
      followersByDate.set(dateKey, (followersByDate.get(dateKey) || 0) + 1);
    });

    // Fill in all dates in range
    const currentDate = new Date(startDate);
    const endDate = new Date();
    let cumulativeCount = 0;

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const newFollowers = followersByDate.get(dateKey) || 0;
      cumulativeCount += newFollowers;

      followerGrowth.push({
        date: dateKey,
        count: cumulativeCount,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate best posting times (hour of day analysis)
    const postsByHour = new Array(24).fill(0);
    const engagementByHour = new Array(24).fill(0);

    posts.forEach((post) => {
      const hour = post.createdAt.getHours();
      postsByHour[hour]++;
      engagementByHour[hour] += post._count.likes + post._count.comments;
    });

    const bestPostingTimes = postsByHour
      .map((count, hour) => ({
        hour,
        posts: count,
        avgEngagement: count > 0 ? engagementByHour[hour] / count : 0,
      }))
      .filter((h) => h.posts > 0)
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);

    // Get top performing posts
    const topPosts = posts
      .map((post) => ({
        id: post.id,
        content: post.content.slice(0, 100),
        likes: post._count.likes,
        comments: post._count.comments,
        engagement: post._count.likes + post._count.comments,
        createdAt: post.createdAt,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    // Calculate engagement rate over time (daily)
    const engagementOverTime: { date: string; rate: number }[] = [];
    const postsByDate = new Map<string, { posts: number; engagement: number }>();

    posts.forEach((post) => {
      const dateKey = post.createdAt.toISOString().split('T')[0];
      const existing = postsByDate.get(dateKey) || { posts: 0, engagement: 0 };
      postsByDate.set(dateKey, {
        posts: existing.posts + 1,
        engagement: existing.engagement + post._count.likes + post._count.comments,
      });
    });

    // Fill in all dates
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const data = postsByDate.get(dateKey);
      const rate = data && data.posts > 0 ? data.engagement / data.posts : 0;

      engagementOverTime.push({
        date: dateKey,
        rate: Math.round(rate * 100) / 100,
      });

      current.setDate(current.getDate() + 1);
    }

    // Get total followers count
    const totalFollowers = await prisma.follow.count({
      where: { followingId: profile.id },
    });

    return reply.send({
      timeRange,
      overview: {
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        totalEngagement,
        engagementRate: Math.round(engagementRate * 100) / 100,
        totalFollowers,
        newFollowers: followers.length,
      },
      followerGrowth,
      engagementOverTime,
      bestPostingTimes,
      topPosts,
    });
  });
}
