import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { prisma } from '../../lib/prisma';
import { chatService } from '../services/chat';

export default async function chatBlocksRoutes(app: FastifyInstance) {
  /**
   * Block a profile
   * POST /chat/blocks
   */
  app.post('/chat/blocks', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { profileId, reason } = req.body as { profileId: string; reason?: string };

    if (!profileId) {
      return reply.code(400).send({ error: 'profileId is required' });
    }

    // Get current user's profile
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Cannot block yourself
    if (profile.id === profileId) {
      return reply.code(400).send({ error: 'Cannot block yourself' });
    }

    // Check if target profile exists
    const targetProfile = await prisma.profile.findUnique({
      where: { id: profileId },
    });
    if (!targetProfile) {
      return reply.code(404).send({ error: 'Target profile not found' });
    }

    try {
      // Create block (upsert to handle duplicate)
      const block = await prisma.chatBlock.upsert({
        where: {
          blockerProfile_blockedProfile: {
            blockerProfile: profile.id,
            blockedProfile: profileId,
          },
        },
        update: {},
        create: {
          blockerProfile: profile.id,
          blockedProfile: profileId,
          reason,
        },
      });

      return {
        success: true,
        block: {
          id: block.id,
          blockedProfile: block.blockedProfile,
          createdAt: block.createdAt,
        },
      };
    } catch (err: any) {
      req.log.error({ err }, 'Failed to block profile');
      return reply.code(500).send({ error: 'Failed to block profile' });
    }
  });

  /**
   * Unblock a profile
   * DELETE /chat/blocks/:profileId
   */
  app.delete('/chat/blocks/:profileId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { profileId } = req.params as { profileId: string };

    // Get current user's profile
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      await prisma.chatBlock.deleteMany({
        where: {
          blockerProfile: profile.id,
          blockedProfile: profileId,
        },
      });

      return { success: true };
    } catch (err: any) {
      req.log.error({ err }, 'Failed to unblock profile');
      return reply.code(500).send({ error: 'Failed to unblock profile' });
    }
  });

  /**
   * List blocked profiles
   * GET /chat/blocks
   */
  app.get('/chat/blocks', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    // Get current user's profile
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      const blocks = await prisma.chatBlock.findMany({
        where: {
          blockerProfile: profile.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Enrich with profile data
      const blockedProfileIds = blocks.map(b => b.blockedProfile);
      const blockedProfiles = await prisma.profile.findMany({
        where: { id: { in: blockedProfileIds } },
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      const profileMap = new Map(blockedProfiles.map(p => [p.id, p]));

      return {
        blocks: blocks.map(b => ({
          id: b.id,
          blockedProfile: profileMap.get(b.blockedProfile) || { id: b.blockedProfile },
          reason: b.reason,
          createdAt: b.createdAt,
        })),
      };
    } catch (err: any) {
      req.log.error({ err }, 'Failed to list blocks');
      return reply.code(500).send({ error: 'Failed to list blocks' });
    }
  });

  /**
   * Check if a profile is blocked
   * GET /chat/blocks/:profileId
   */
  app.get('/chat/blocks/:profileId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { profileId } = req.params as { profileId: string };

    // Get current user's profile
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      const block = await prisma.chatBlock.findUnique({
        where: {
          blockerProfile_blockedProfile: {
            blockerProfile: profile.id,
            blockedProfile: profileId,
          },
        },
      });

      return {
        isBlocked: !!block,
        blockedAt: block?.createdAt,
      };
    } catch (err: any) {
      req.log.error({ err }, 'Failed to check block status');
      return reply.code(500).send({ error: 'Failed to check block status' });
    }
  });

  /**
   * Check if current user is blocked by a profile
   * GET /chat/blocks/blocked-by/:profileId
   */
  app.get('/chat/blocks/blocked-by/:profileId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { profileId } = req.params as { profileId: string };

    // Get current user's profile
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      const block = await prisma.chatBlock.findUnique({
        where: {
          blockerProfile_blockedProfile: {
            blockerProfile: profileId,
            blockedProfile: profile.id,
          },
        },
      });

      return {
        isBlockedBy: !!block,
      };
    } catch (err: any) {
      req.log.error({ err }, 'Failed to check if blocked by');
      return reply.code(500).send({ error: 'Failed to check if blocked by' });
    }
  });
}
