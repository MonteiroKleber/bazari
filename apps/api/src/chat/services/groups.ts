import { prisma } from '../../lib/prisma';

export interface CreateGroupData {
  name: string;
  description?: string;
  avatarUrl?: string;
  kind: 'community' | 'channel' | 'private';
  isPublic: boolean;
  creatorId: string;
  initialMembers?: string[];
  maxMembers?: number;
}

export interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  kind: string;
  isPublic: boolean;
  adminIds: string[];
  memberIds: string[];
  maxMembers: number | null;
  metadata: any;
  createdAt: number;
}

class GroupsService {
  async createGroup(data: CreateGroupData): Promise<GroupInfo> {
    const now = Date.now();

    // Adicionar criador aos admins e membros
    const adminIds = [data.creatorId];
    const memberIds = [data.creatorId, ...(data.initialMembers || [])];

    const group = await prisma.chatGroup.create({
      data: {
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        kind: data.kind,
        isPublic: data.isPublic,
        adminIds,
        memberIds,
        maxMembers: data.maxMembers || 500,
        createdAt: now,
      },
    });

    return this.mapGroup(group);
  }

  async getGroup(groupId: string): Promise<GroupInfo | null> {
    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
    });

    return group ? this.mapGroup(group) : null;
  }

  async listGroups(
    profileId: string,
    opts: { cursor?: string; limit: number; isPublic?: boolean }
  ): Promise<{ groups: GroupInfo[]; nextCursor?: string }> {
    const where: any = {
      memberIds: { has: profileId },
    };

    if (opts.isPublic !== undefined) {
      where.isPublic = opts.isPublic;
    }

    if (opts.cursor) {
      where.id = { lt: opts.cursor };
    }

    const groups = await prisma.chatGroup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit + 1,
    });

    const hasMore = groups.length > opts.limit;
    const items = hasMore ? groups.slice(0, -1) : groups;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      groups: items.map(g => this.mapGroup(g)),
      nextCursor,
    };
  }

  async inviteMember(groupId: string, inviterId: string, memberId: string): Promise<void> {
    const group = await this.getGroup(groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    // Verificar se inviter é admin ou se o grupo é público
    if (!group.isPublic && !group.adminIds.includes(inviterId)) {
      throw new Error('Only admins can invite to private groups');
    }

    // Verificar se já é membro
    if (group.memberIds.includes(memberId)) {
      return; // Já é membro
    }

    // Verificar limite de membros
    if (group.maxMembers && group.memberIds.length >= group.maxMembers) {
      throw new Error('Group is full');
    }

    // Buscar o Profile para pegar o userId (necessário para criar notificação)
    const memberProfile = await prisma.profile.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    if (!memberProfile || !memberProfile.userId) {
      throw new Error('Member profile not found');
    }

    // Criar notificação de convite ao invés de adicionar diretamente
    await prisma.notification.create({
      data: {
        userId: memberProfile.userId,
        type: 'GROUP_INVITE',
        actorId: inviterId,
        metadata: {
          groupId: groupId,
          groupName: group.name,
          inviterId: inviterId,
        },
      },
    });
  }

  async removeMember(groupId: string, adminId: string, memberId: string): Promise<void> {
    const group = await this.getGroup(groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    // Verificar se é admin
    if (!group.adminIds.includes(adminId)) {
      throw new Error('Only admins can remove members');
    }

    // Não pode remover outro admin
    if (group.adminIds.includes(memberId)) {
      throw new Error('Cannot remove admin');
    }

    // Remover membro
    await prisma.chatGroup.update({
      where: { id: groupId },
      data: {
        memberIds: group.memberIds.filter(id => id !== memberId),
      },
    });

    // Remover membro da thread também
    const thread = await prisma.chatThread.findFirst({
      where: { groupId: groupId },
    });

    if (thread) {
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          participants: thread.participants.filter(id => id !== memberId),
        },
      });
    }
  }

  async updateRoles(
    groupId: string,
    adminId: string,
    memberId: string,
    action: 'promote' | 'demote'
  ): Promise<void> {
    const group = await this.getGroup(groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    // Verificar se é admin
    if (!group.adminIds.includes(adminId)) {
      throw new Error('Only admins can change roles');
    }

    // Verificar se membro existe no grupo
    if (!group.memberIds.includes(memberId)) {
      throw new Error('User is not a member');
    }

    if (action === 'promote') {
      // Promover a admin
      if (!group.adminIds.includes(memberId)) {
        await prisma.chatGroup.update({
          where: { id: groupId },
          data: {
            adminIds: {
              push: memberId,
            },
          },
        });
      }
    } else {
      // Demote: remover de admin
      // Precisa ter pelo menos 1 admin
      if (group.adminIds.length <= 1) {
        throw new Error('Cannot remove last admin');
      }

      await prisma.chatGroup.update({
        where: { id: groupId },
        data: {
          adminIds: group.adminIds.filter(id => id !== memberId),
        },
      });
    }
  }

  async updateGroup(
    groupId: string,
    adminId: string,
    updates: Partial<Pick<CreateGroupData, 'name' | 'description' | 'avatarUrl' | 'maxMembers'>>
  ): Promise<GroupInfo> {
    const group = await this.getGroup(groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    // Verificar se é admin
    if (!group.adminIds.includes(adminId)) {
      throw new Error('Only admins can update group');
    }

    const updated = await prisma.chatGroup.update({
      where: { id: groupId },
      data: updates,
    });

    return this.mapGroup(updated);
  }

  async leaveGroup(groupId: string, memberId: string): Promise<void> {
    const group = await this.getGroup(groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    // Se é admin e é o último admin, não pode sair
    if (group.adminIds.includes(memberId) && group.adminIds.length === 1) {
      throw new Error('Cannot leave: you are the last admin. Transfer admin rights first.');
    }

    // Remover de memberIds e adminIds
    await prisma.chatGroup.update({
      where: { id: groupId },
      data: {
        memberIds: group.memberIds.filter(id => id !== memberId),
        adminIds: group.adminIds.filter(id => id !== memberId),
      },
    });

    // Remover da thread também
    const thread = await prisma.chatThread.findFirst({
      where: { groupId: groupId },
    });

    if (thread) {
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          participants: thread.participants.filter(id => id !== memberId),
        },
      });
    }
  }

  async acceptInvite(notificationId: string, userId: string): Promise<void> {
    // Buscar notificação
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Invitation not found');
    }

    if (notification.userId !== userId) {
      throw new Error('This invitation is not for you');
    }

    if (notification.type !== 'GROUP_INVITE') {
      throw new Error('This is not a group invitation');
    }

    const groupId = (notification.metadata as any)?.groupId;
    if (!groupId) {
      throw new Error('Invalid invitation: missing group ID');
    }

    // Buscar perfil do usuário
    const profile = await prisma.profile.findFirst({
      where: { userId: userId },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Verificar se já é membro
    if (group.memberIds.includes(profile.id)) {
      // Marcar notificação como lida e retornar
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
      return;
    }

    // Verificar limite de membros
    if (group.maxMembers && group.memberIds.length >= group.maxMembers) {
      throw new Error('Group is full');
    }

    // Adicionar membro ao grupo
    await prisma.chatGroup.update({
      where: { id: groupId },
      data: {
        memberIds: {
          push: profile.id,
        },
      },
    });

    // Atualizar thread do grupo para incluir novo membro nos participantes
    const thread = await prisma.chatThread.findFirst({
      where: { groupId: groupId },
    });

    if (thread) {
      // Adicionar novo membro aos participantes da thread
      const updatedParticipants = [...thread.participants, profile.id];
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          participants: updatedParticipants,
        },
      });
    }

    // Marcar notificação como lida
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async rejectInvite(notificationId: string, userId: string): Promise<void> {
    // Buscar notificação
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Invitation not found');
    }

    if (notification.userId !== userId) {
      throw new Error('This invitation is not for you');
    }

    if (notification.type !== 'GROUP_INVITE') {
      throw new Error('This is not a group invitation');
    }

    // Marcar notificação como lida (rejeitada)
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  private mapGroup(group: any): GroupInfo {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatarUrl,
      kind: group.kind,
      isPublic: group.isPublic,
      adminIds: group.adminIds,
      memberIds: group.memberIds,
      maxMembers: group.maxMembers,
      metadata: group.metadata,
      createdAt: Number(group.createdAt),
    };
  }
}

export const groupsService = new GroupsService();
