import { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';

interface PluginOptions {
  prisma: PrismaClient;
}

/**
 * Admin App Review Routes
 *
 * Routes for DAO members to review and approve/reject app submissions
 *
 * TODO: Integrar com sistema de governance/conselho para aprovação de apps
 * Por enquanto usando role simples para admins (User.role === 'ADMIN')
 */
export const adminAppReviewRoutes: FastifyPluginCallback<PluginOptions> = (
  fastify,
  opts,
  done
) => {
  const { prisma } = opts;

  // Middleware to check admin/DAO member access
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    // First check authentication
    const userId = (request as any).authUser?.sub;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized - Not authenticated' });
    }

    // TODO: Add proper DAO member check - integrate with governance system
    // For now, check if user has admin role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied. Admin required.' });
    }

    // Add user info to request for later use
    (request as any).user = { id: userId, role: user.role };
  };

  /**
   * GET /admin/app-reviews
   * Get all app submissions for review
   */
  fastify.get('/admin/app-reviews', {
    onRequest: authOnRequest,
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { status } = request.query as { status?: string };

    const whereClause: any = {};
    if (status && status !== 'all') {
      // Convert to uppercase to match Prisma enum (PENDING, IN_REVIEW, etc.)
      whereClause.status = status.toUpperCase();
    }

    const apps = await prisma.thirdPartyApp.findMany({
      where: whereClause,
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' },
      ],
      include: {
        developer: {
          select: {
            id: true,
            address: true,
            profile: {
              select: {
                displayName: true,
                handle: true,
              },
            },
          },
        },
      },
    });

    return apps;
  });

  /**
   * GET /admin/app-reviews/stats/summary
   * Get review statistics
   */
  fastify.get('/admin/app-reviews/stats/summary', {
    onRequest: authOnRequest,
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const [pending, inReview, approved, rejected, total] = await Promise.all([
      prisma.thirdPartyApp.count({ where: { status: 'PENDING' } }),
      prisma.thirdPartyApp.count({ where: { status: 'IN_REVIEW' } }),
      prisma.thirdPartyApp.count({ where: { status: 'APPROVED' } }),
      prisma.thirdPartyApp.count({ where: { status: 'REJECTED' } }),
      prisma.thirdPartyApp.count(),
    ]);

    const reviewedApps = await prisma.thirdPartyApp.findMany({
      where: {
        reviewedAt: { not: null },
        submittedAt: { not: null },
      },
      select: {
        submittedAt: true,
        reviewedAt: true,
      },
    });

    let avgReviewTimeHours = 0;
    if (reviewedApps.length > 0) {
      const totalHours = reviewedApps.reduce((sum, app) => {
        if (app.submittedAt && app.reviewedAt) {
          const diff =
            new Date(app.reviewedAt).getTime() -
            new Date(app.submittedAt).getTime();
          return sum + diff / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      avgReviewTimeHours = totalHours / reviewedApps.length;
    }

    return {
      pending,
      inReview,
      approved,
      rejected,
      total,
      avgReviewTimeHours: Math.round(avgReviewTimeHours * 10) / 10,
    };
  });

  /**
   * GET /admin/app-reviews/:id
   * Get a specific app submission
   */
  fastify.get('/admin/app-reviews/:id', {
    onRequest: authOnRequest,
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const app = await prisma.thirdPartyApp.findUnique({
      where: { id },
      include: {
        developer: {
          select: {
            id: true,
            address: true,
            profile: {
              select: {
                displayName: true,
                handle: true,
              },
            },
          },
        },
        inAppPurchases: true,
      },
    });

    if (!app) {
      return reply.status(404).send({ error: 'App not found' });
    }

    return app;
  });

  /**
   * POST /admin/app-reviews/:id/approve
   * Approve an app submission
   */
  fastify.post('/admin/app-reviews/:id/approve', {
    onRequest: authOnRequest,
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { notes } = request.body as { notes?: string };
    const reviewerId = (request as any).user.id;

    const app = await prisma.thirdPartyApp.findUnique({
      where: { id },
    });

    if (!app) {
      return reply.status(404).send({ error: 'App not found' });
    }

    if (app.status !== 'PENDING' && app.status !== 'IN_REVIEW') {
      return reply.status(400).send({
        error: `Cannot approve app with status: ${app.status}`,
      });
    }

    const updatedApp = await prisma.thirdPartyApp.update({
      where: { id },
      data: {
        status: 'PUBLISHED', // Aprovação publica diretamente na loja
        reviewNotes: notes || null,
        reviewedAt: new Date(),
        reviewerId,
        publishedAt: new Date(),
      },
    });

    // Create notification for developer
    await prisma.notification.create({
      data: {
        userId: app.developerId,
        type: 'APP_APPROVED',
        targetId: app.id,
        metadata: {
          title: 'App Approved!',
          message: `Your app "${app.name}" has been approved and is now live on the App Store.`,
          appId: app.id,
          appSlug: app.slug,
        },
      },
    });

    return {
      success: true,
      app: updatedApp,
      message: 'App approved and published',
    };
  });

  /**
   * POST /admin/app-reviews/:id/reject
   * Reject an app submission
   */
  fastify.post('/admin/app-reviews/:id/reject', {
    onRequest: authOnRequest,
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { notes } = request.body as { notes?: string };
    const reviewerId = (request as any).user.id;

    if (!notes || notes.trim().length === 0) {
      return reply.status(400).send({
        error: 'Rejection reason is required',
      });
    }

    const app = await prisma.thirdPartyApp.findUnique({
      where: { id },
    });

    if (!app) {
      return reply.status(404).send({ error: 'App not found' });
    }

    if (app.status !== 'PENDING' && app.status !== 'IN_REVIEW') {
      return reply.status(400).send({
        error: `Cannot reject app with status: ${app.status}`,
      });
    }

    const updatedApp = await prisma.thirdPartyApp.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewNotes: notes,
        reviewedAt: new Date(),
        reviewerId,
      },
    });

    // Create notification for developer
    await prisma.notification.create({
      data: {
        userId: app.developerId,
        type: 'APP_REJECTED',
        targetId: app.id,
        metadata: {
          title: 'App Review: Changes Requested',
          message: `Your app "${app.name}" was not approved. Please review the feedback and resubmit.`,
          appId: app.id,
          reason: notes,
        },
      },
    });

    return {
      success: true,
      app: updatedApp,
      message: 'App rejected',
    };
  });

  /**
   * POST /admin/app-reviews/:id/start-review
   * Mark an app as being reviewed
   */
  fastify.post('/admin/app-reviews/:id/start-review', {
    onRequest: authOnRequest,
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reviewerId = (request as any).user.id;

    const app = await prisma.thirdPartyApp.findUnique({
      where: { id },
    });

    if (!app) {
      return reply.status(404).send({ error: 'App not found' });
    }

    if (app.status !== 'PENDING') {
      return reply.status(400).send({
        error: `Cannot start review for app with status: ${app.status}`,
      });
    }

    const updatedApp = await prisma.thirdPartyApp.update({
      where: { id },
      data: {
        status: 'IN_REVIEW',
        reviewerId,
      },
    });

    return {
      success: true,
      app: updatedApp,
    };
  });

  /**
   * POST /admin/app-reviews/:id/unpublish
   * Unpublish an approved app
   */
  fastify.post('/admin/app-reviews/:id/unpublish', {
    onRequest: authOnRequest,
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };

    const app = await prisma.thirdPartyApp.findUnique({
      where: { id },
    });

    if (!app) {
      return reply.status(404).send({ error: 'App not found' });
    }

    if (app.status !== 'APPROVED') {
      return reply.status(400).send({
        error: 'Only approved apps can be unpublished',
      });
    }

    const updatedApp = await prisma.thirdPartyApp.update({
      where: { id },
      data: {
        status: 'UNPUBLISHED',
        reviewNotes: reason || 'Unpublished by admin',
      },
    });

    // Notify developer
    await prisma.notification.create({
      data: {
        userId: app.developerId,
        type: 'APP_UNPUBLISHED',
        targetId: app.id,
        metadata: {
          title: 'App Unpublished',
          message: `Your app "${app.name}" has been unpublished. Reason: ${reason || 'Contact support for details'}`,
          appId: app.id,
        },
      },
    });

    return {
      success: true,
      app: updatedApp,
    };
  });

  // ============================================
  // PUBLIC ENDPOINTS - App Store
  // ============================================

  /**
   * GET /apps/store
   * Get all published apps for the app store (public)
   */
  fastify.get('/apps/store', async (request, reply) => {
    const { category, search, limit = '50', offset = '0' } = request.query as {
      category?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };

    const whereClause: any = {
      status: 'PUBLISHED',
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const apps = await prisma.thirdPartyApp.findMany({
      where: whereClause,
      orderBy: [
        { installCount: 'desc' },
        { publishedAt: 'desc' },
      ],
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        appId: true,
        name: true,
        slug: true,
        description: true,
        longDescription: true,
        category: true,
        tags: true,
        icon: true,
        color: true,
        screenshots: true,
        currentVersion: true,
        bundleUrl: true,
        bundleHash: true,
        permissions: true,
        rating: true,
        ratingCount: true,
        installCount: true,
        publishedAt: true,
        monetizationType: true,
        price: true,
        developer: {
          select: {
            id: true,
            address: true,
            profile: {
              select: {
                displayName: true,
                handle: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.thirdPartyApp.count({ where: whereClause });

    return {
      apps,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
  });

  /**
   * GET /apps/store/:slug
   * Get a specific published app by slug (public)
   */
  fastify.get('/apps/store/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const app = await prisma.thirdPartyApp.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      include: {
        developer: {
          select: {
            id: true,
            address: true,
            profile: {
              select: {
                displayName: true,
                handle: true,
                avatarUrl: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    handle: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        inAppPurchases: {
          select: {
            id: true,
            productId: true,
            name: true,
            description: true,
            price: true,
            type: true,
          },
        },
      },
    });

    if (!app) {
      return reply.status(404).send({ error: 'App not found' });
    }

    return { app };
  });

  done();
};

export default adminAppReviewRoutes;
