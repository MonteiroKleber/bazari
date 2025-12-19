// path: apps/api/src/routes/work/jobs.ts
// Bazari Work - Job Postings Routes (PROMPT-03)

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';

// Lista de áreas profissionais válidas (mesma do professional.ts)
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
const createJobSchema = z.object({
  sellerProfileId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(10000),
  area: z.string(),
  skills: z.array(z.string().max(50).transform(s => s.toLowerCase().trim())).max(20).default([]),
  workType: z.enum(['REMOTE', 'ON_SITE', 'HYBRID']),
  location: z.string().max(200).optional().nullable(),
  paymentValue: z.number().min(0).max(1000000).optional().nullable(),
  paymentPeriod: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'PROJECT']).optional().nullable(),
  paymentCurrency: z.enum(['BRL', 'USD', 'EUR', 'BZR']).default('BRL'),
});

const updateJobSchema = createJobSchema.partial().omit({ sellerProfileId: true });

const jobSearchSchema = z.object({
  q: z.string().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  area: z.string().optional(),
  workType: z.union([
    z.enum(['REMOTE', 'ON_SITE', 'HYBRID']),
    z.array(z.enum(['REMOTE', 'ON_SITE', 'HYBRID']))
  ]).optional(),
  location: z.string().optional(),
  minPayment: z.string().transform(Number).optional(),
  maxPayment: z.string().transform(Number).optional(),
  paymentPeriod: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'PROJECT']).optional(),
  sellerProfileId: z.string().optional(),
  sortBy: z.enum(['relevance', 'payment', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().optional(),
  limit: z.string().transform(Number).default('20'),
});

const applyJobSchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  expectedValue: z.number().min(0).max(1000000).optional(),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED']),
});

// Função auxiliar para formatar job response
function formatJobResponse(job: any, includeApplicationsCount = false) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    area: job.area,
    skills: job.skills,
    workType: job.workType,
    location: job.location,
    paymentValue: job.paymentValue?.toString() || null,
    paymentPeriod: job.paymentPeriod,
    paymentCurrency: job.paymentCurrency,
    status: job.status,
    publishedAt: job.publishedAt?.toISOString() || null,
    closedAt: job.closedAt?.toISOString() || null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    company: job.sellerProfile ? {
      id: job.sellerProfile.id,
      name: job.sellerProfile.shopName,
      logoUrl: job.sellerProfile.avatarUrl,
      slug: job.sellerProfile.shopSlug,
    } : null,
    createdBy: job.createdBy ? {
      id: job.createdBy.id,
      handle: job.createdBy.handle,
      displayName: job.createdBy.displayName,
    } : null,
    ...(includeApplicationsCount && { applicationsCount: job._count?.applications || 0 }),
  };
}

export async function workJobsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // ==================== GESTÃO DE VAGAS (EMPRESA) ====================

  // POST /api/work/jobs - Criar vaga
  app.post('/work/jobs', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof createJobSchema>;
    try {
      body = createJobSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Validar área profissional
    if (!PROFESSIONAL_AREAS.includes(body.area as any)) {
      return reply.status(400).send({ error: 'Área profissional inválida', validAreas: PROFESSIONAL_AREAS });
    }

    // Buscar profile do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    // Verificar se o usuário é dono da seller profile
    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: {
        id: body.sellerProfileId,
        userId: authUser.sub,
      },
    });

    if (!sellerProfile) {
      return reply.status(403).send({ error: 'Você não tem permissão para criar vagas nesta empresa.' });
    }

    // Criar vaga
    const job = await prisma.jobPosting.create({
      data: {
        sellerProfileId: body.sellerProfileId,
        createdById: profile.id,
        title: body.title,
        description: body.description,
        area: body.area,
        skills: body.skills,
        workType: body.workType,
        location: body.location,
        paymentValue: body.paymentValue,
        paymentPeriod: body.paymentPeriod,
        paymentCurrency: body.paymentCurrency,
        status: 'DRAFT',
      },
      include: {
        sellerProfile: true,
        createdBy: true,
      },
    });

    return reply.status(201).send({ job: formatJobResponse(job) });
  });

  // GET /api/work/jobs - Listar vagas da empresa (autenticado)
  app.get('/work/jobs', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const query = request.query as { sellerProfileId?: string; status?: string };

    // Buscar seller profiles do usuário
    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (sellerProfiles.length === 0) {
      return reply.send({ items: [], total: 0 });
    }

    const sellerProfileIds = query.sellerProfileId
      ? [query.sellerProfileId]
      : sellerProfiles.map(sp => sp.id);

    // Filtros
    const where: Prisma.JobPostingWhereInput = {
      sellerProfileId: { in: sellerProfileIds },
      ...(query.status && { status: query.status as any }),
    };

    const [items, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          sellerProfile: true,
          createdBy: true,
          _count: { select: { applications: true } },
        },
      }),
      prisma.jobPosting.count({ where }),
    ]);

    return reply.send({
      items: items.map(job => formatJobResponse(job, true)),
      total,
    });
  });

  // GET /api/work/jobs/:id - Detalhes da vaga (autenticado - dono)
  app.get('/work/jobs/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
        createdBy: true,
        _count: { select: { applications: true } },
      },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    // Verificar se é dono
    const isOwner = await prisma.sellerProfile.findFirst({
      where: { id: job.sellerProfileId, userId: authUser.sub },
    });

    if (!isOwner) {
      return reply.status(403).send({ error: 'Você não tem permissão para ver esta vaga.' });
    }

    return reply.send({ job: formatJobResponse(job, true) });
  });

  // PATCH /api/work/jobs/:id - Atualizar vaga
  app.patch('/work/jobs/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    let body: z.infer<typeof updateJobSchema>;
    try {
      body = updateJobSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Buscar vaga
    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    // Verificar permissão
    if (job.sellerProfile.userId !== authUser.sub) {
      return reply.status(403).send({ error: 'Você não tem permissão para editar esta vaga.' });
    }

    // Validar área se fornecida
    if (body.area && !PROFESSIONAL_AREAS.includes(body.area as any)) {
      return reply.status(400).send({ error: 'Área profissional inválida' });
    }

    // Atualizar
    const updated = await prisma.jobPosting.update({
      where: { id },
      data: body,
      include: {
        sellerProfile: true,
        createdBy: true,
        _count: { select: { applications: true } },
      },
    });

    return reply.send({ job: formatJobResponse(updated, true) });
  });

  // DELETE /api/work/jobs/:id - Deletar vaga (soft - fecha)
  app.delete('/work/jobs/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    if (job.sellerProfile.userId !== authUser.sub) {
      return reply.status(403).send({ error: 'Você não tem permissão para deletar esta vaga.' });
    }

    await prisma.jobPosting.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    return reply.send({ success: true, message: 'Vaga fechada com sucesso.' });
  });

  // POST /api/work/jobs/:id/publish - Publicar vaga
  app.post('/work/jobs/:id/publish', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    if (job.sellerProfile.userId !== authUser.sub) {
      return reply.status(403).send({ error: 'Você não tem permissão para publicar esta vaga.' });
    }

    if (job.status === 'OPEN') {
      return reply.status(400).send({ error: 'Vaga já está publicada.' });
    }

    const updated = await prisma.jobPosting.update({
      where: { id },
      data: { status: 'OPEN', publishedAt: new Date() },
      include: {
        sellerProfile: true,
        createdBy: true,
      },
    });

    // TODO: Criar evento no Feed

    return reply.send({ job: formatJobResponse(updated), message: 'Vaga publicada com sucesso.' });
  });

  // POST /api/work/jobs/:id/pause - Pausar vaga
  app.post('/work/jobs/:id/pause', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    if (job.sellerProfile.userId !== authUser.sub) {
      return reply.status(403).send({ error: 'Você não tem permissão.' });
    }

    if (job.status !== 'OPEN') {
      return reply.status(400).send({ error: 'Apenas vagas abertas podem ser pausadas.' });
    }

    const updated = await prisma.jobPosting.update({
      where: { id },
      data: { status: 'PAUSED' },
      include: { sellerProfile: true, createdBy: true },
    });

    return reply.send({ job: formatJobResponse(updated), message: 'Vaga pausada.' });
  });

  // POST /api/work/jobs/:id/close - Fechar vaga
  app.post('/work/jobs/:id/close', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    if (job.sellerProfile.userId !== authUser.sub) {
      return reply.status(403).send({ error: 'Você não tem permissão.' });
    }

    const updated = await prisma.jobPosting.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { sellerProfile: true, createdBy: true },
    });

    return reply.send({ job: formatJobResponse(updated), message: 'Vaga fechada.' });
  });

  // ==================== BUSCA PÚBLICA ====================

  // GET /api/work/jobs/search - Buscar vagas abertas
  app.get('/work/jobs/search', async (request, reply) => {
    let params: z.infer<typeof jobSearchSchema>;
    try {
      params = jobSearchSchema.parse(request.query);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const limit = Math.min(params.limit || 20, 50);

    // Construir filtros
    const whereConditions: Prisma.JobPostingWhereInput[] = [
      { status: 'OPEN' }, // Apenas vagas abertas
    ];

    if (params.area) {
      whereConditions.push({ area: params.area });
    }

    if (params.workType) {
      const types = Array.isArray(params.workType) ? params.workType : [params.workType];
      whereConditions.push({ workType: { in: types } });
    }

    if (params.skills) {
      const skillsArray = Array.isArray(params.skills)
        ? params.skills.map(s => s.toLowerCase().trim())
        : [params.skills.toLowerCase().trim()];
      whereConditions.push({ skills: { hasSome: skillsArray } });
    }

    if (params.paymentPeriod) {
      whereConditions.push({ paymentPeriod: params.paymentPeriod });
    }

    if (params.minPayment !== undefined) {
      whereConditions.push({ paymentValue: { gte: params.minPayment } });
    }

    if (params.maxPayment !== undefined) {
      whereConditions.push({ paymentValue: { lte: params.maxPayment } });
    }

    if (params.sellerProfileId) {
      whereConditions.push({ sellerProfileId: params.sellerProfileId });
    }

    // Busca textual
    if (params.q) {
      const searchTerm = params.q.toLowerCase().trim();
      whereConditions.push({
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { area: { contains: searchTerm, mode: 'insensitive' } },
          { skills: { has: searchTerm } },
          { sellerProfile: { shopName: { contains: searchTerm, mode: 'insensitive' } } },
        ]
      });
    }

    // Ordenação
    let orderBy: Prisma.JobPostingOrderByWithRelationInput[] = [];
    if (params.sortBy === 'payment') {
      orderBy = [{ paymentValue: params.sortOrder }];
    } else if (params.sortBy === 'createdAt') {
      orderBy = [{ publishedAt: params.sortOrder }];
    } else {
      orderBy = [{ publishedAt: 'desc' }];
    }

    // Executar queries
    const [items, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where: { AND: whereConditions },
        orderBy,
        take: limit,
        ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
        include: {
          sellerProfile: true,
          _count: { select: { applications: true } },
        },
      }),
      prisma.jobPosting.count({ where: { AND: whereConditions } }),
    ]);

    const nextCursor = items.length === limit ? items[items.length - 1]?.id : null;

    return reply.send({
      items: items.map(job => ({
        id: job.id,
        title: job.title,
        area: job.area,
        skills: job.skills,
        workType: job.workType,
        location: job.location,
        paymentValue: job.paymentValue?.toString() || null,
        paymentPeriod: job.paymentPeriod,
        paymentCurrency: job.paymentCurrency,
        company: {
          id: job.sellerProfile.id,
          name: job.sellerProfile.shopName,
          logoUrl: job.sellerProfile.avatarUrl,
          slug: job.sellerProfile.shopSlug,
        },
        publishedAt: job.publishedAt?.toISOString() || null,
        applicationsCount: job._count.applications,
      })),
      nextCursor,
      total,
    });
  });

  // GET /api/work/jobs/:id/public - Detalhes públicos da vaga
  app.get('/work/jobs/:id/public', async (request, reply) => {
    const { id } = request.params as { id: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
        _count: { select: { applications: true } },
      },
    });

    if (!job || job.status !== 'OPEN') {
      return reply.status(404).send({ error: 'Vaga não encontrada ou não está disponível.' });
    }

    return reply.send({
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        area: job.area,
        skills: job.skills,
        workType: job.workType,
        location: job.location,
        paymentValue: job.paymentValue?.toString() || null,
        paymentPeriod: job.paymentPeriod,
        paymentCurrency: job.paymentCurrency,
        publishedAt: job.publishedAt?.toISOString() || null,
        company: {
          id: job.sellerProfile.id,
          name: job.sellerProfile.shopName,
          slug: job.sellerProfile.shopSlug,
          logoUrl: job.sellerProfile.avatarUrl,
          about: job.sellerProfile.about,
        },
        applicationsCount: job._count.applications,
      },
    });
  });

  // ==================== CANDIDATURAS ====================

  // POST /api/work/jobs/:id/apply - Candidatar-se
  app.post('/work/jobs/:id/apply', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    let body: z.infer<typeof applyJobSchema>;
    try {
      body = applyJobSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Buscar profile
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    // Buscar vaga
    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job || job.status !== 'OPEN') {
      return reply.status(404).send({ error: 'Vaga não encontrada ou não está aberta.' });
    }

    // Verificar se não é o próprio dono
    if (job.sellerProfile.userId === authUser.sub) {
      return reply.status(400).send({ error: 'Você não pode candidatar-se à sua própria vaga.' });
    }

    // Verificar se já candidatou
    const existing = await prisma.jobApplication.findUnique({
      where: { jobPostingId_applicantId: { jobPostingId: id, applicantId: profile.id } },
    });

    if (existing) {
      return reply.status(409).send({ error: 'Você já se candidatou a esta vaga.' });
    }

    // Criar candidatura
    const application = await prisma.jobApplication.create({
      data: {
        jobPostingId: id,
        applicantId: profile.id,
        coverLetter: body.coverLetter,
        expectedValue: body.expectedValue,
      },
      include: {
        applicant: true,
        jobPosting: { include: { sellerProfile: true } },
      },
    });

    return reply.status(201).send({
      application: {
        id: application.id,
        coverLetter: application.coverLetter,
        expectedValue: application.expectedValue?.toString() || null,
        status: application.status,
        appliedAt: application.appliedAt.toISOString(),
      },
      message: 'Candidatura enviada com sucesso.',
    });
  });

  // DELETE /api/work/jobs/:id/apply - Retirar candidatura
  app.delete('/work/jobs/:id/apply', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { jobPostingId_applicantId: { jobPostingId: id, applicantId: profile.id } },
    });

    if (!application) {
      return reply.status(404).send({ error: 'Candidatura não encontrada.' });
    }

    if (application.status !== 'PENDING') {
      return reply.status(400).send({ error: 'Candidatura já foi processada e não pode ser retirada.' });
    }

    await prisma.jobApplication.delete({ where: { id: application.id } });

    return reply.send({ success: true, message: 'Candidatura retirada.' });
  });

  // GET /api/work/jobs/:id/applications - Listar candidaturas (empresa)
  app.get('/work/jobs/:id/applications', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };
    const query = request.query as { status?: string };

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    if (job.sellerProfile.userId !== authUser.sub) {
      return reply.status(403).send({ error: 'Você não tem permissão para ver estas candidaturas.' });
    }

    const where: Prisma.JobApplicationWhereInput = {
      jobPostingId: id,
      ...(query.status && { status: query.status as any }),
    };

    const applications = await prisma.jobApplication.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        applicant: {
          include: {
            professionalProfile: true,
          },
        },
      },
    });

    return reply.send({
      items: applications.map(app => ({
        id: app.id,
        coverLetter: app.coverLetter,
        expectedValue: app.expectedValue?.toString() || null,
        status: app.status,
        appliedAt: app.appliedAt.toISOString(),
        reviewedAt: app.reviewedAt?.toISOString() || null,
        applicant: {
          id: app.applicant.id,
          handle: app.applicant.handle,
          displayName: app.applicant.displayName,
          avatarUrl: app.applicant.avatarUrl,
          professionalProfile: app.applicant.professionalProfile ? {
            area: app.applicant.professionalProfile.professionalArea,
            skills: app.applicant.professionalProfile.skills,
            hourlyRate: app.applicant.professionalProfile.showHourlyRate
              ? app.applicant.professionalProfile.hourlyRate?.toString()
              : null,
          } : null,
        },
      })),
      total: applications.length,
    });
  });

  // PATCH /api/work/jobs/:id/applications/:appId - Atualizar status da candidatura
  app.patch('/work/jobs/:id/applications/:appId', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id, appId } = request.params as { id: string; appId: string };

    let body: z.infer<typeof updateApplicationStatusSchema>;
    try {
      body = updateApplicationStatusSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!job) {
      return reply.status(404).send({ error: 'Vaga não encontrada.' });
    }

    if (job.sellerProfile.userId !== authUser.sub) {
      return reply.status(403).send({ error: 'Você não tem permissão.' });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: appId },
    });

    if (!application || application.jobPostingId !== id) {
      return reply.status(404).send({ error: 'Candidatura não encontrada.' });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: appId },
      data: {
        status: body.status,
        reviewedAt: new Date(),
      },
    });

    return reply.send({
      application: {
        id: updated.id,
        status: updated.status,
        reviewedAt: updated.reviewedAt?.toISOString(),
      },
      message: `Status atualizado para ${body.status}`,
    });
  });

  // GET /api/work/jobs/my-applications - Minhas candidaturas (candidato)
  app.get('/work/jobs/my-applications', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { applicantId: profile.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        jobPosting: {
          include: { sellerProfile: true },
        },
      },
    });

    return reply.send({
      items: applications.map(app => ({
        id: app.id,
        coverLetter: app.coverLetter,
        expectedValue: app.expectedValue?.toString() || null,
        status: app.status,
        appliedAt: app.appliedAt.toISOString(),
        reviewedAt: app.reviewedAt?.toISOString() || null,
        job: {
          id: app.jobPosting.id,
          title: app.jobPosting.title,
          area: app.jobPosting.area,
          status: app.jobPosting.status,
          company: {
            id: app.jobPosting.sellerProfile.id,
            name: app.jobPosting.sellerProfile.shopName,
            logoUrl: app.jobPosting.sellerProfile.avatarUrl,
          },
        },
      })),
      total: applications.length,
    });
  });
}

export default workJobsRoutes;
