import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { groupsService, CreateGroupData } from '../services/groups';
import { chatService } from '../services/chat';

export default async function chatGroupsRoutes(app: FastifyInstance) {
  // Criar grupo
  app.post('/chat/groups', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const {
      name,
      description,
      avatarUrl,
      kind = 'community',
      isPublic = true,
      initialMembers,
      maxMembers,
    } = req.body as Partial<CreateGroupData>;

    if (!name) {
      return reply.code(400).send({ error: 'Group name is required' });
    }

    try {
      const group = await groupsService.createGroup({
        name,
        description,
        avatarUrl,
        kind: kind as any,
        isPublic,
        creatorId: profile.id,
        initialMembers,
        maxMembers,
      });

      // Criar thread para o grupo
      await chatService.createThread({
        kind: 'group',
        participants: group.memberIds,
        groupId: group.id,
      });

      req.log.info({ groupId: group.id, profileId: profile.id }, 'Group created');

      return group;
    } catch (error) {
      req.log.error({ error, profileId: profile.id }, 'Failed to create group');
      return reply.code(500).send({ error: 'Failed to create group' });
    }
  });

  // Listar grupos do usuário
  app.get('/chat/groups', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const { cursor, limit = '20', isPublic } = req.query as {
      cursor?: string;
      limit?: string;
      isPublic?: string;
    };

    const result = await groupsService.listGroups(profile.id, {
      cursor,
      limit: parseInt(limit),
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
    });

    return result;
  });

  // Detalhes do grupo
  app.get('/chat/groups/:groupId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { groupId } = req.params as { groupId: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const group = await groupsService.getGroup(groupId);

    if (!group) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    // Verificar se é membro (ou se é público)
    if (!group.isPublic && !group.memberIds.includes(profile.id)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    return group;
  });

  // Convidar membro
  app.post('/chat/groups/:groupId/invite', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { groupId } = req.params as { groupId: string };
    const { memberId } = req.body as { memberId: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    if (!memberId) {
      return reply.code(400).send({ error: 'Member ID is required' });
    }

    try {
      await groupsService.inviteMember(groupId, profile.id, memberId);

      // Atualizar thread com novo participante
      const group = await groupsService.getGroup(groupId);
      if (group) {
        // Encontrar thread do grupo
        const threads = await chatService.listThreads(profile.id, { limit: 100 });
        const groupThread = threads.threads.find(t => t.groupId === groupId);

        if (groupThread) {
          // Atualizar participantes (isso requer adicionar método no chatService)
          // Por enquanto, criar nova thread se necessário
        }
      }

      req.log.info({ groupId, inviterId: profile.id, memberId }, 'Member invited');

      return { success: true };
    } catch (error: any) {
      req.log.error({ error, groupId, profileId: profile.id, memberId }, 'Failed to invite member');
      return reply.code(400).send({ error: error.message });
    }
  });

  // Remover membro
  app.delete('/chat/groups/:groupId/members/:memberId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { groupId, memberId } = req.params as { groupId: string; memberId: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      await groupsService.removeMember(groupId, profile.id, memberId);

      req.log.info({ groupId, adminId: profile.id, memberId }, 'Member removed');

      return { success: true };
    } catch (error: any) {
      req.log.error({ error, groupId, profileId: profile.id, memberId }, 'Failed to remove member');
      return reply.code(400).send({ error: error.message });
    }
  });

  // Atualizar roles (promover/demover admin)
  app.put('/chat/groups/:groupId/roles', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { groupId } = req.params as { groupId: string };
    const { memberId, action } = req.body as { memberId: string; action: 'promote' | 'demote' };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    if (!memberId || !action) {
      return reply.code(400).send({ error: 'Member ID and action are required' });
    }

    try {
      await groupsService.updateRoles(groupId, profile.id, memberId, action);

      req.log.info({ groupId, adminId: profile.id, memberId, action }, 'Role updated');

      return { success: true };
    } catch (error: any) {
      req.log.error({ error, groupId, profileId: profile.id, memberId, action }, 'Failed to update role');
      return reply.code(400).send({ error: error.message });
    }
  });

  // Atualizar grupo
  app.put('/chat/groups/:groupId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { groupId } = req.params as { groupId: string };
    const updates = req.body as Partial<CreateGroupData>;

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      const group = await groupsService.updateGroup(groupId, profile.id, updates);

      req.log.info({ groupId, adminId: profile.id }, 'Group updated');

      return group;
    } catch (error: any) {
      req.log.error({ error, groupId, profileId: profile.id }, 'Failed to update group');
      return reply.code(400).send({ error: error.message });
    }
  });

  // Sair do grupo
  app.post('/chat/groups/:groupId/leave', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { groupId } = req.params as { groupId: string };

    // Get profile ID from user ID
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    try {
      await groupsService.leaveGroup(groupId, profile.id);

      req.log.info({ groupId, profileId: profile.id }, 'User left group');

      return { success: true };
    } catch (error: any) {
      req.log.error({ error, groupId, profileId: profile.id }, 'Failed to leave group');
      return reply.code(400).send({ error: error.message });
    }
  });

  // Aceitar convite de grupo
  app.post('/chat/groups/invites/:notificationId/accept', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { notificationId } = req.params as { notificationId: string };

    try {
      await groupsService.acceptInvite(notificationId, userId);

      req.log.info({ notificationId, userId }, 'Group invite accepted');

      return { success: true };
    } catch (error: any) {
      req.log.error({ error, notificationId, userId }, 'Failed to accept invite');
      return reply.code(400).send({ error: error.message });
    }
  });

  // Rejeitar convite de grupo
  app.post('/chat/groups/invites/:notificationId/reject', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { notificationId } = req.params as { notificationId: string };

    try {
      await groupsService.rejectInvite(notificationId, userId);

      req.log.info({ notificationId, userId }, 'Group invite rejected');

      return { success: true };
    } catch (error: any) {
      req.log.error({ error, notificationId, userId }, 'Failed to reject invite');
      return reply.code(400).send({ error: error.message });
    }
  });
}
