// path: apps/api/src/routes/work/professional.ts
// Bazari Work - Professional Profile Extension Routes

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';

// Lista de áreas profissionais válidas
const PROFESSIONAL_AREAS = [
  'Desenvolvimento de Software',
  'Design',
  'Marketing',
  'Vendas',
  'Suporte ao Cliente',
  'Recursos Humanos',
  'Finanças',
  'Jurídico',
  'Administração',
  'Produção de Conteúdo',
  'Educação',
  'Saúde',
  'Engenharia',
  'Arquitetura',
  'Consultoria',
  'Outro'
] as const;

// Schemas de validação
const professionalProfileSchema = z.object({
  professionalArea: z.string().optional(),
  skills: z.array(z.string().max(50).transform(s => s.toLowerCase().trim())).max(20).optional(),
  experience: z.string().max(5000).optional(),
  hourlyRate: z.number().min(0).max(10000).optional().nullable(),
  hourlyRateCurrency: z.enum(['BRL', 'USD', 'EUR', 'BZR']).optional(),
  workPreference: z.enum(['REMOTE', 'ON_SITE', 'HYBRID']).optional(),
  status: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'INVISIBLE']).optional(),
  showHourlyRate: z.boolean().optional(),
});

const statusSchema = z.object({
  status: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'INVISIBLE']),
});

export async function workProfessionalRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /api/work/profile - Obtém perfil profissional do usuário logado
  app.get('/work/profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado. Crie um perfil primeiro.' });
    }

    // Buscar perfil profissional
    const professionalProfile = await prisma.professionalProfile.findUnique({
      where: { profileId: profile.id },
    });

    if (!professionalProfile) {
      return reply.send({
        profile: null,
        isActivated: false,
        areas: PROFESSIONAL_AREAS,
      });
    }

    return reply.send({
      profile: {
        id: professionalProfile.id,
        professionalArea: professionalProfile.professionalArea,
        skills: professionalProfile.skills,
        experience: professionalProfile.experience,
        hourlyRate: professionalProfile.hourlyRate?.toString() || null,
        hourlyRateCurrency: professionalProfile.hourlyRateCurrency,
        workPreference: professionalProfile.workPreference,
        status: professionalProfile.status,
        showHourlyRate: professionalProfile.showHourlyRate,
        activatedAt: professionalProfile.activatedAt?.toISOString() || null,
        createdAt: professionalProfile.createdAt.toISOString(),
        updatedAt: professionalProfile.updatedAt.toISOString(),
      },
      isActivated: !!professionalProfile.activatedAt,
      areas: PROFESSIONAL_AREAS,
    });
  });

  // POST /api/work/profile - Cria/ativa perfil profissional
  app.post('/work/profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof professionalProfileSchema>;
    try {
      body = professionalProfileSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Validar área profissional se fornecida
    if (body.professionalArea && !PROFESSIONAL_AREAS.includes(body.professionalArea as any)) {
      return reply.status(400).send({
        error: 'Área profissional inválida',
        validAreas: PROFESSIONAL_AREAS,
      });
    }

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true, handle: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado. Crie um perfil primeiro.' });
    }

    // Verificar se já existe perfil profissional
    const existing = await prisma.professionalProfile.findUnique({
      where: { profileId: profile.id },
    });

    if (existing) {
      return reply.status(409).send({ error: 'Perfil profissional já existe. Use PATCH para atualizar.' });
    }

    // Criar perfil profissional
    const isFirstActivation = true;
    const professionalProfile = await prisma.professionalProfile.create({
      data: {
        profileId: profile.id,
        professionalArea: body.professionalArea,
        skills: body.skills || [],
        experience: body.experience,
        hourlyRate: body.hourlyRate,
        hourlyRateCurrency: body.hourlyRateCurrency || 'BRL',
        workPreference: body.workPreference || 'REMOTE',
        status: body.status || 'AVAILABLE',
        showHourlyRate: body.showHourlyRate || false,
        activatedAt: new Date(),
      },
    });

    // Criar evento no Feed se status não for INVISIBLE
    if (professionalProfile.status !== 'INVISIBLE') {
      try {
        await prisma.post.create({
          data: {
            authorId: profile.id,
            kind: 'SYSTEM',
            content: JSON.stringify({
              type: 'PROFESSIONAL_PROFILE_ACTIVATED',
              area: professionalProfile.professionalArea,
              skills: professionalProfile.skills.slice(0, 5),
            }),
            status: 'PUBLISHED',
          },
        });
        app.log.info({ event: 'work.profile.activated', handle: profile.handle });
      } catch (err) {
        app.log.warn({ err }, 'Falha ao criar evento no Feed');
      }
    }

    return reply.status(201).send({
      profile: {
        id: professionalProfile.id,
        professionalArea: professionalProfile.professionalArea,
        skills: professionalProfile.skills,
        experience: professionalProfile.experience,
        hourlyRate: professionalProfile.hourlyRate?.toString() || null,
        hourlyRateCurrency: professionalProfile.hourlyRateCurrency,
        workPreference: professionalProfile.workPreference,
        status: professionalProfile.status,
        showHourlyRate: professionalProfile.showHourlyRate,
        activatedAt: professionalProfile.activatedAt?.toISOString() || null,
      },
      isActivated: true,
    });
  });

  // PATCH /api/work/profile - Atualiza perfil profissional
  app.patch('/work/profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof professionalProfileSchema>;
    try {
      body = professionalProfileSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Validar área profissional se fornecida
    if (body.professionalArea && !PROFESSIONAL_AREAS.includes(body.professionalArea as any)) {
      return reply.status(400).send({
        error: 'Área profissional inválida',
        validAreas: PROFESSIONAL_AREAS,
      });
    }

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    // Verificar se existe perfil profissional
    const existing = await prisma.professionalProfile.findUnique({
      where: { profileId: profile.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Perfil profissional não encontrado. Use POST para criar.' });
    }

    // Atualizar perfil profissional
    const updateData: any = {};
    if (body.professionalArea !== undefined) updateData.professionalArea = body.professionalArea;
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.experience !== undefined) updateData.experience = body.experience;
    if (body.hourlyRate !== undefined) updateData.hourlyRate = body.hourlyRate;
    if (body.hourlyRateCurrency !== undefined) updateData.hourlyRateCurrency = body.hourlyRateCurrency;
    if (body.workPreference !== undefined) updateData.workPreference = body.workPreference;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.showHourlyRate !== undefined) updateData.showHourlyRate = body.showHourlyRate;

    const professionalProfile = await prisma.professionalProfile.update({
      where: { profileId: profile.id },
      data: updateData,
    });

    return reply.send({
      profile: {
        id: professionalProfile.id,
        professionalArea: professionalProfile.professionalArea,
        skills: professionalProfile.skills,
        experience: professionalProfile.experience,
        hourlyRate: professionalProfile.hourlyRate?.toString() || null,
        hourlyRateCurrency: professionalProfile.hourlyRateCurrency,
        workPreference: professionalProfile.workPreference,
        status: professionalProfile.status,
        showHourlyRate: professionalProfile.showHourlyRate,
        activatedAt: professionalProfile.activatedAt?.toISOString() || null,
      },
      isActivated: !!professionalProfile.activatedAt,
    });
  });

  // DELETE /api/work/profile - Desativa perfil profissional (soft delete)
  app.delete('/work/profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    // Verificar se existe perfil profissional
    const existing = await prisma.professionalProfile.findUnique({
      where: { profileId: profile.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Perfil profissional não encontrado.' });
    }

    // Soft delete: definir status como INVISIBLE e limpar activatedAt
    await prisma.professionalProfile.update({
      where: { profileId: profile.id },
      data: {
        status: 'INVISIBLE',
        activatedAt: null,
      },
    });

    return reply.send({ success: true, message: 'Perfil profissional desativado.' });
  });

  // PATCH /api/work/profile/status - Altera status de disponibilidade
  app.patch('/work/profile/status', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof statusSchema>;
    try {
      body = statusSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    // Verificar se existe perfil profissional
    const existing = await prisma.professionalProfile.findUnique({
      where: { profileId: profile.id },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Perfil profissional não encontrado.' });
    }

    // Atualizar status
    const professionalProfile = await prisma.professionalProfile.update({
      where: { profileId: profile.id },
      data: { status: body.status },
    });

    return reply.send({
      status: professionalProfile.status,
      message: `Status alterado para ${body.status}`,
    });
  });

  // GET /api/work/areas - Lista áreas profissionais disponíveis
  app.get('/work/areas', async (request, reply) => {
    return reply.send({ areas: PROFESSIONAL_AREAS });
  });

  // GET /api/work/skills/suggestions - Sugestões de skills por área
  app.get('/work/skills/suggestions', async (request, reply) => {
    const query = request.query as { area?: string; q?: string };

    // Sugestões base por área
    const skillsByArea: Record<string, string[]> = {
      'Desenvolvimento de Software': [
        'javascript', 'typescript', 'react', 'nodejs', 'python', 'java',
        'golang', 'rust', 'sql', 'mongodb', 'postgresql', 'docker',
        'kubernetes', 'aws', 'gcp', 'azure', 'git', 'ci/cd', 'tdd',
        'microservices', 'graphql', 'rest api', 'web3', 'blockchain'
      ],
      'Design': [
        'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
        'ui design', 'ux design', 'design system', 'prototipagem',
        'user research', 'motion design', 'branding', '3d modeling'
      ],
      'Marketing': [
        'seo', 'sem', 'google ads', 'facebook ads', 'content marketing',
        'email marketing', 'social media', 'analytics', 'copywriting',
        'growth hacking', 'inbound marketing', 'branding'
      ],
      'Vendas': [
        'crm', 'salesforce', 'hubspot', 'negociação', 'prospecção',
        'inside sales', 'field sales', 'b2b', 'b2c', 'account management'
      ],
      'Produção de Conteúdo': [
        'redação', 'copywriting', 'edição de vídeo', 'podcasting',
        'fotografia', 'youtube', 'tiktok', 'instagram', 'blogging',
        'storytelling', 'jornalismo', 'roteiro'
      ],
    };

    let suggestions: string[] = [];

    // Filtrar por área se fornecida
    if (query.area && skillsByArea[query.area]) {
      suggestions = skillsByArea[query.area];
    } else {
      // Combinar todas as skills se nenhuma área especificada
      suggestions = [...new Set(Object.values(skillsByArea).flat())];
    }

    // Filtrar por query se fornecida
    if (query.q) {
      const q = query.q.toLowerCase();
      suggestions = suggestions.filter(s => s.includes(q));
    }

    return reply.send({
      suggestions: suggestions.slice(0, 20),
      total: suggestions.length,
    });
  });
}

export default workProfessionalRoutes;
