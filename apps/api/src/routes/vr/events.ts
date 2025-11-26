import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

/**
 * VR Events Route
 * Endpoints para gerenciar eventos do auditório virtual
 */

// Schema de validação para criação de evento
const createEventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  maxSeats: z.number().min(10).max(200).default(50),
});

// Schema de validação para atualização de status
const updateStatusSchema = z.object({
  status: z.enum(['scheduled', 'live', 'ended', 'cancelled']),
});

export async function vrEventsRoute(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /api/vr/events - Listar eventos (próximos e ao vivo)
  app.get('/events', async (request, reply) => {
    try {
      const now = new Date();

      // Buscar eventos futuros e ao vivo
      const events = await prisma.auditoriumEvent.findMany({
        where: {
          OR: [
            { status: 'live' },
            {
              status: 'scheduled',
              startAt: { gte: now }
            }
          ]
        },
        orderBy: {
          startAt: 'asc'
        },
        take: 20
      });

      return reply.send({
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          startAt: event.startAt.toISOString(),
          endAt: event.endAt.toISOString(),
          hostUserId: event.hostUserId,
          maxSeats: event.maxSeats,
          status: event.status,
          createdAt: event.createdAt.toISOString(),
        })),
        total: events.length,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/vr/events/:id - Buscar evento específico
  app.get<{ Params: { id: string } }>('/events/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const event = await prisma.auditoriumEvent.findUnique({
        where: { id }
      });

      if (!event) {
        return reply.status(404).send({
          error: 'Event not found',
        });
      }

      return reply.send({
        id: event.id,
        title: event.title,
        description: event.description,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt.toISOString(),
        hostUserId: event.hostUserId,
        maxSeats: event.maxSeats,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to fetch event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/vr/events - Criar novo evento (requer autenticação)
  app.post<{ Body: z.infer<typeof createEventSchema> }>('/events', async (request, reply) => {
    try {
      // TODO: Implementar autenticação e pegar userId do token
      const userId = 'temp-user-id'; // Placeholder

      const validation = createEventSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: validation.error.errors,
        });
      }

      const { title, description, startAt, endAt, maxSeats } = validation.data;

      // Validar que endAt é depois de startAt
      const start = new Date(startAt);
      const end = new Date(endAt);

      if (end <= start) {
        return reply.status(400).send({
          error: 'End time must be after start time',
        });
      }

      const event = await prisma.auditoriumEvent.create({
        data: {
          title,
          description,
          startAt: start,
          endAt: end,
          hostUserId: userId,
          maxSeats: maxSeats || 50,
          status: 'scheduled',
        },
      });

      return reply.status(201).send({
        id: event.id,
        title: event.title,
        description: event.description,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt.toISOString(),
        hostUserId: event.hostUserId,
        maxSeats: event.maxSeats,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // PATCH /api/vr/events/:id/status - Atualizar status do evento
  app.patch<{
    Params: { id: string },
    Body: z.infer<typeof updateStatusSchema>
  }>('/events/:id/status', async (request, reply) => {
    try {
      const { id } = request.params;

      const validation = updateStatusSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: validation.error.errors,
        });
      }

      const { status } = validation.data;

      const event = await prisma.auditoriumEvent.update({
        where: { id },
        data: { status },
      });

      return reply.send({
        id: event.id,
        status: event.status,
        updatedAt: event.updatedAt.toISOString(),
      });
    } catch (error) {
      if ((error as any)?.code === 'P2025') {
        return reply.status(404).send({
          error: 'Event not found',
        });
      }

      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to update event status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
