// path: apps/api/src/routes/work/index.ts
// Bazari Work - Module Routes Index

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import workProfessionalRoutes from './professional.js';

export async function workRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  // Registrar sub-rotas do Work
  await app.register(workProfessionalRoutes, options);

  // Futuros módulos:
  // await app.register(workTalentsRoutes, options);  // Fase 2
  // await app.register(workJobsRoutes, options);     // Fase 3
  // await app.register(workProposalsRoutes, options); // Fase 4
  // await app.register(workAgreementsRoutes, options); // Fase 5
}

export default workRoutes;
