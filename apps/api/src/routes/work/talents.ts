// path: apps/api/src/routes/work/talents.ts
// Bazari Work - Talent Search Routes (PROMPT-02)

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Search query schema
const talentSearchSchema = z.object({
  q: z.string().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  area: z.string().optional(),
  workPreference: z.union([
    z.enum(['REMOTE', 'ON_SITE', 'HYBRID']),
    z.array(z.enum(['REMOTE', 'ON_SITE', 'HYBRID']))
  ]).optional(),
  location: z.string().optional(),
  minHourlyRate: z.string().transform(Number).optional(),
  maxHourlyRate: z.string().transform(Number).optional(),
  status: z.enum(['AVAILABLE', 'NOT_AVAILABLE']).optional(),
  sortBy: z.enum(['relevance', 'hourlyRate', 'createdAt']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().optional(),
  limit: z.string().transform(Number).default('20'),
});

export async function workTalentsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /api/work/talents - Lista talentos com filtros
  app.get('/work/talents', async (request, reply) => {
    let params: z.infer<typeof talentSearchSchema>;
    try {
      params = talentSearchSchema.parse(request.query);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Limitar a 50 resultados
    const limit = Math.min(params.limit || 20, 50);

    // Construir filtros WHERE
    const whereConditions: Prisma.ProfessionalProfileWhereInput[] = [
      { status: { not: 'INVISIBLE' } },  // Nunca mostrar INVISIBLE
      { activatedAt: { not: null } },     // Apenas perfis ativados
    ];

    // Filtro por status específico (AVAILABLE ou NOT_AVAILABLE)
    if (params.status) {
      whereConditions.push({ status: params.status });
    }

    // Filtro por área profissional
    if (params.area) {
      whereConditions.push({ professionalArea: params.area });
    }

    // Filtro por preferência de trabalho
    if (params.workPreference) {
      const prefs = Array.isArray(params.workPreference)
        ? params.workPreference
        : [params.workPreference];
      whereConditions.push({ workPreference: { in: prefs } });
    }

    // Filtro por faixa de valor hora
    if (params.minHourlyRate !== undefined) {
      whereConditions.push({
        hourlyRate: { gte: params.minHourlyRate },
        showHourlyRate: true,
      });
    }
    if (params.maxHourlyRate !== undefined) {
      whereConditions.push({
        hourlyRate: { lte: params.maxHourlyRate },
        showHourlyRate: true,
      });
    }

    // Filtro por skills (OR - qualquer skill que contenha)
    if (params.skills) {
      const skillsArray = Array.isArray(params.skills)
        ? params.skills.map(s => s.toLowerCase().trim())
        : [params.skills.toLowerCase().trim()];

      whereConditions.push({
        skills: { hasSome: skillsArray }
      });
    }

    // Busca textual (nome, skills, área)
    if (params.q) {
      const searchTerm = params.q.toLowerCase().trim();
      whereConditions.push({
        OR: [
          { professionalArea: { contains: searchTerm, mode: 'insensitive' } },
          { skills: { has: searchTerm } },
          { profile: { displayName: { contains: searchTerm, mode: 'insensitive' } } },
          { profile: { handle: { contains: searchTerm, mode: 'insensitive' } } },
        ]
      });
    }

    // Ordenação
    let orderBy: Prisma.ProfessionalProfileOrderByWithRelationInput[] = [];

    if (params.sortBy === 'hourlyRate') {
      orderBy = [{ hourlyRate: params.sortOrder }];
    } else if (params.sortBy === 'createdAt') {
      orderBy = [{ activatedAt: params.sortOrder }];
    } else {
      // Relevância: AVAILABLE primeiro, depois por data de ativação
      orderBy = [
        { status: 'asc' },  // AVAILABLE vem antes de NOT_AVAILABLE
        { activatedAt: 'desc' },
      ];
    }

    // Executar queries em paralelo
    const [talents, total] = await Promise.all([
      prisma.professionalProfile.findMany({
        where: { AND: whereConditions },
        orderBy,
        take: limit,
        ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
        include: {
          profile: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
            }
          }
        }
      }),
      prisma.professionalProfile.count({
        where: { AND: whereConditions }
      })
    ]);

    // Calcular matchScore simples baseado em relevância
    const calculateMatchScore = (talent: typeof talents[0]): number => {
      let score = 0.5; // Base score

      // Status AVAILABLE = +0.2
      if (talent.status === 'AVAILABLE') score += 0.2;

      // Skills match (se busca por skills)
      if (params.skills) {
        const searchSkills = Array.isArray(params.skills)
          ? params.skills.map(s => s.toLowerCase())
          : [params.skills.toLowerCase()];

        const matchedSkills = talent.skills.filter(s =>
          searchSkills.some(ss => s.toLowerCase().includes(ss))
        );
        score += Math.min(matchedSkills.length * 0.1, 0.3);
      }

      // Area match
      if (params.area && talent.professionalArea === params.area) {
        score += 0.2;
      }

      // Query text match
      if (params.q) {
        const q = params.q.toLowerCase();
        if (talent.professionalArea?.toLowerCase().includes(q)) score += 0.1;
        if (talent.profile?.displayName?.toLowerCase().includes(q)) score += 0.1;
      }

      return Math.min(score, 1.0);
    };

    // Formatar response
    const items = talents.map(talent => ({
      id: talent.id,
      user: {
        id: talent.profile?.id,
        handle: talent.profile?.handle,
        displayName: talent.profile?.displayName,
        avatarUrl: talent.profile?.avatarUrl,
      },
      professionalArea: talent.professionalArea,
      skills: talent.skills,
      workPreference: talent.workPreference,
      status: talent.status,
      hourlyRate: talent.showHourlyRate && talent.hourlyRate
        ? talent.hourlyRate.toString()
        : null,
      hourlyRateCurrency: talent.showHourlyRate ? talent.hourlyRateCurrency : null,
      matchScore: calculateMatchScore(talent),
    }));

    // Next cursor
    const nextCursor = talents.length === limit
      ? talents[talents.length - 1]?.id
      : null;

    return reply.send({
      items,
      nextCursor,
      total,
    });
  });

  // GET /api/work/talents/:handle - Perfil profissional público
  app.get('/work/talents/:handle', async (request, reply) => {
    const { handle } = request.params as { handle: string };

    // Buscar perfil pelo handle
    const profile = await prisma.profile.findUnique({
      where: { handle },
      select: {
        id: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        professionalProfile: true,
      }
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    if (!profile.professionalProfile) {
      return reply.status(404).send({ error: 'Perfil profissional não encontrado.' });
    }

    const prof = profile.professionalProfile;

    // Verificar se está visível
    if (prof.status === 'INVISIBLE' || !prof.activatedAt) {
      return reply.status(404).send({ error: 'Perfil profissional não disponível.' });
    }

    // Buscar estatísticas (futuramente: acordos completados, avaliações)
    // Por enquanto retorna placeholders
    const stats = {
      agreementsCompleted: 0,
      averageRating: null as number | null,
      totalEvaluations: 0,
    };

    // TODO: Verificar se usuário logado pode enviar proposta
    // Por enquanto sempre true (exceto para próprio perfil, que será checado no frontend)
    const canSendProposal = true;

    return reply.send({
      profile: {
        id: prof.id,
        user: {
          id: profile.id,
          handle: profile.handle,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
        },
        professionalArea: prof.professionalArea,
        skills: prof.skills,
        experience: prof.experience,
        workPreference: prof.workPreference,
        status: prof.status,
        hourlyRate: prof.showHourlyRate && prof.hourlyRate
          ? prof.hourlyRate.toString()
          : null,
        hourlyRateCurrency: prof.showHourlyRate ? prof.hourlyRateCurrency : null,
        activatedAt: prof.activatedAt?.toISOString(),
        stats,
      },
      canSendProposal,
    });
  });
}

export default workTalentsRoutes;
