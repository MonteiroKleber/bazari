import type { PrismaClient, NotificationType } from '@prisma/client';

export async function createNotification(
  prisma: PrismaClient,
  data: {
    userId: string;
    type: NotificationType;
    actorId?: string;
    targetId?: string;
    metadata?: any;
  }
) {
  // Não notificar a si mesmo
  if (data.userId === data.actorId) return;

  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      actorId: data.actorId,
      targetId: data.targetId,
      metadata: data.metadata
    }
  });
}
