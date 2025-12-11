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
    const authUser = (req as any).authUser as { sub: string } | undefined;
    if (!authUser) {
      return reply.status(401).send({ error: 'Token inválido.' });
    }

    const userId = authUser.sub;
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

  // ========================================
  // App Store Monetization Analytics (Admin)
  // ========================================

  // GET /admin/analytics/app-store - Platform-wide App Store metrics
  app.get('/admin/analytics/app-store', { onRequest: authOnRequest }, async (req, reply) => {
    const authUser = (req as any).authUser as { sub: string } | undefined;
    if (!authUser) {
      return reply.status(401).send({ error: 'Token inválido.' });
    }

    // TODO: Add admin check
    const query = req.query as { days?: string };
    const days = Math.min(parseInt(query.days || '30', 10), 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total apps
    const [totalApps, approvedApps, pendingApps] = await Promise.all([
      prisma.thirdPartyApp.count(),
      prisma.thirdPartyApp.count({ where: { status: 'APPROVED' } }),
      prisma.thirdPartyApp.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);

    // Get revenue metrics
    const allApps = await prisma.thirdPartyApp.findMany({
      select: {
        totalRevenue: true,
        developerRevenue: true,
        platformRevenue: true,
        installCount: true,
      },
    });

    const revenueMetrics = allApps.reduce(
      (acc, app) => ({
        totalRevenue: acc.totalRevenue + Number(app.totalRevenue),
        developerRevenue: acc.developerRevenue + Number(app.developerRevenue),
        platformRevenue: acc.platformRevenue + Number(app.platformRevenue),
        totalInstalls: acc.totalInstalls + app.installCount,
      }),
      { totalRevenue: 0, developerRevenue: 0, platformRevenue: 0, totalInstalls: 0 }
    );

    // Get purchases in period
    const purchases = await prisma.appPurchase.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'CONFIRMED',
      },
      select: {
        amount: true,
        platformShare: true,
        developerShare: true,
        type: true,
        createdAt: true,
      },
    });

    // Revenue over time
    const revenueByDay = new Map<string, { total: number; platform: number; developer: number }>();

    purchases.forEach((p) => {
      const dateKey = p.createdAt.toISOString().split('T')[0];
      const existing = revenueByDay.get(dateKey) || { total: 0, platform: 0, developer: 0 };
      revenueByDay.set(dateKey, {
        total: existing.total + Number(p.amount),
        platform: existing.platform + Number(p.platformShare),
        developer: existing.developer + Number(p.developerShare),
      });
    });

    const revenueOverTime: { date: string; total: number; platform: number; developer: number }[] = [];
    const current = new Date(startDate);
    const end = new Date();

    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const data = revenueByDay.get(dateKey) || { total: 0, platform: 0, developer: 0 };
      revenueOverTime.push({
        date: dateKey,
        ...data,
      });
      current.setDate(current.getDate() + 1);
    }

    // Purchases by type
    const purchasesByType = {
      app: purchases.filter((p) => p.type === 'app').length,
      iap: purchases.filter((p) => p.type === 'iap').length,
    };

    // Top earning apps
    const topApps = await prisma.thirdPartyApp.findMany({
      where: { status: 'APPROVED' },
      orderBy: { totalRevenue: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        icon: true,
        slug: true,
        totalRevenue: true,
        installCount: true,
        category: true,
      },
    });

    // Refund metrics
    const refunds = await prisma.appPurchase.findMany({
      where: {
        refundedAt: { gte: startDate },
        status: 'REFUNDED',
      },
      select: { amount: true },
    });

    const refundMetrics = {
      count: refunds.length,
      totalAmount: refunds.reduce((sum, r) => sum + Number(r.amount), 0),
    };

    return reply.send({
      period: { days, startDate, endDate: new Date() },
      overview: {
        totalApps,
        approvedApps,
        pendingApps,
        totalInstalls: revenueMetrics.totalInstalls,
      },
      revenue: {
        total: revenueMetrics.totalRevenue,
        platform: revenueMetrics.platformRevenue,
        developer: revenueMetrics.developerRevenue,
        periodTotal: purchases.reduce((sum, p) => sum + Number(p.amount), 0),
        periodPlatform: purchases.reduce((sum, p) => sum + Number(p.platformShare), 0),
        periodDeveloper: purchases.reduce((sum, p) => sum + Number(p.developerShare), 0),
      },
      purchases: {
        total: purchases.length,
        byType: purchasesByType,
      },
      refunds: refundMetrics,
      revenueOverTime,
      topApps: topApps.map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        slug: a.slug,
        category: a.category,
        revenue: Number(a.totalRevenue),
        installs: a.installCount,
      })),
    });
  });

  // GET /admin/analytics/app-store/categories - Revenue by category
  app.get('/admin/analytics/app-store/categories', { onRequest: authOnRequest }, async (req, reply) => {
    const apps = await prisma.thirdPartyApp.findMany({
      where: { status: 'APPROVED' },
      select: {
        category: true,
        totalRevenue: true,
        installCount: true,
      },
    });

    const byCategory = new Map<string, { apps: number; revenue: number; installs: number }>();

    apps.forEach((app) => {
      const existing = byCategory.get(app.category) || { apps: 0, revenue: 0, installs: 0 };
      byCategory.set(app.category, {
        apps: existing.apps + 1,
        revenue: existing.revenue + Number(app.totalRevenue),
        installs: existing.installs + app.installCount,
      });
    });

    const categories = Array.from(byCategory.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return reply.send({ categories });
  });

  // TODO: Re-enable when User model has developerApps relation
  // GET /admin/analytics/app-store/developers - Top developers
  // app.get('/admin/analytics/app-store/developers', { onRequest: authOnRequest }, async (req, reply) => {
  //   const developers = await prisma.user.findMany({
  //     where: {
  //       developerApps: { some: { status: 'APPROVED' } },
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       email: true,
  //       profile: { select: { handle: true, avatar: true } },
  //       developerApps: {
  //         where: { status: 'APPROVED' },
  //         select: {
  //           id: true,
  //           name: true,
  //           totalRevenue: true,
  //           developerRevenue: true,
  //           installCount: true,
  //         },
  //       },
  //     },
  //     take: 20,
  //   });

  //   const devStats = developers
  //     .map((dev) => ({
  //       id: dev.id,
  //       name: dev.name || dev.profile?.handle || 'Anonymous',
  //       handle: dev.profile?.handle,
  //       avatar: dev.profile?.avatar,
  //       appsCount: dev.developerApps.length,
  //       totalRevenue: dev.developerApps.reduce((sum: number, a: any) => sum + Number(a.totalRevenue), 0),
  //       developerRevenue: dev.developerApps.reduce((sum: number, a: any) => sum + Number(a.developerRevenue), 0),
  //       totalInstalls: dev.developerApps.reduce((sum: number, a: any) => sum + a.installCount, 0),
  //       topApp: dev.developerApps.sort((a: any, b: any) => Number(b.totalRevenue) - Number(a.totalRevenue))[0],
  //     }))
  //     .sort((a, b) => b.totalRevenue - a.totalRevenue);

  //   return reply.send({ developers: devStats });
  // });
}
