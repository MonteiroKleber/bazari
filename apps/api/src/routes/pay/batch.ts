// path: apps/api/src/routes/pay/batch.ts
// Bazari Pay - Batch Import Routes (PROMPT-06)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient, PayPeriod } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';

interface CSVRow {
  receiver_handle: string;
  receiver_wallet?: string;
  value: string;
  currency: string;
  period: string;
  payment_day: string;
  start_date: string;
  end_date?: string;
  description?: string;
  reference_type?: string;
  reference_id?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidationResult {
  validRows: CSVRow[];
  errors: ValidationError[];
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

async function validateBatchCSV(
  rows: CSVRow[],
  prisma: PrismaClient
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const validRows: CSVRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header and 1-indexed
    let hasError = false;

    // Validate handle or wallet
    if (!row.receiver_handle && !row.receiver_wallet) {
      errors.push({ row: rowNum, field: 'receiver', message: 'Handle ou wallet obrigatório' });
      hasError = true;
    }

    // Validate value
    const value = parseFloat(row.value);
    if (isNaN(value) || value <= 0) {
      errors.push({ row: rowNum, field: 'value', message: 'Valor inválido' });
      hasError = true;
    }

    // Validate currency
    if (!['BRL', 'BZR'].includes(row.currency?.toUpperCase())) {
      errors.push({ row: rowNum, field: 'currency', message: 'Moeda deve ser BRL ou BZR' });
      hasError = true;
    }

    // Validate period
    if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(row.period?.toUpperCase())) {
      errors.push({ row: rowNum, field: 'period', message: 'Período inválido (WEEKLY, BIWEEKLY, MONTHLY)' });
      hasError = true;
    }

    // Validate payment day
    const day = parseInt(row.payment_day);
    if (isNaN(day) || day < 1 || day > 28) {
      errors.push({ row: rowNum, field: 'payment_day', message: 'Dia deve ser 1-28' });
      hasError = true;
    }

    // Validate start date
    if (!isValidDate(row.start_date)) {
      errors.push({ row: rowNum, field: 'start_date', message: 'Data de início inválida' });
      hasError = true;
    }

    // Validate end date if provided
    if (row.end_date && !isValidDate(row.end_date)) {
      errors.push({ row: rowNum, field: 'end_date', message: 'Data de fim inválida' });
      hasError = true;
    }

    // Check if user exists
    if (row.receiver_handle && !hasError) {
      const handle = row.receiver_handle.replace('@', '');
      const profile = await prisma.profile.findUnique({
        where: { handle },
        select: { userId: true },
      });
      if (!profile) {
        errors.push({ row: rowNum, field: 'receiver_handle', message: `Usuário @${handle} não encontrado` });
        hasError = true;
      }
    }

    if (!hasError) {
      validRows.push(row);
    }
  }

  return { validRows, errors };
}

export default async function payBatchRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  /**
   * GET /api/pay/batch/template
   * Download CSV template
   */
  fastify.get('/batch/template', { onRequest: [authOnRequest] }, async (request, reply) => {
    const template = `receiver_handle,receiver_wallet,value,currency,period,payment_day,start_date,end_date,description,reference_type,reference_id
@joao,,8000.00,BZR,MONTHLY,5,2025-02-01,,Salário mensal,EMPLOYEE,EMP001
@maria,,5000.00,BZR,MONTHLY,5,2025-02-01,,Salário mensal,EMPLOYEE,EMP002
,5DAAnrj7VuvS...,6500.00,BZR,MONTHLY,10,2025-02-01,2025-12-31,Contrato temporário,CONTRACTOR,CTR003`;

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename=bazari-pay-template.csv');
    return reply.send(template);
  });

  /**
   * POST /api/pay/batch/validate
   * Validate CSV without creating contracts
   */
  fastify.post<{ Body: { csv: string; companyId: string } }>(
    '/batch/validate',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { csv, companyId } = request.body;

      if (!csv) {
        return reply.status(400).send({ error: 'CSV content required' });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      const rows = parseCSV(csv);
      const validation = await validateBatchCSV(rows, prisma);

      return reply.send({
        totalRows: rows.length,
        validRows: validation.validRows.length,
        errors: validation.errors,
        preview: validation.validRows.slice(0, 10),
      });
    }
  );

  /**
   * POST /api/pay/batch
   * Create contracts from CSV
   */
  fastify.post<{ Body: { csv: string; companyId: string } }>(
    '/batch',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { csv, companyId } = request.body;

      if (!csv) {
        return reply.status(400).send({ error: 'CSV content required' });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
        include: {
          user: {
            select: { address: true }
          }
        }
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      const rows = parseCSV(csv);
      const validation = await validateBatchCSV(rows, prisma);

      if (validation.errors.length > 0) {
        return reply.status(400).send({
          success: false,
          errors: validation.errors,
          validRows: validation.validRows.length,
        });
      }

      // Create batch import record
      const batch = await prisma.payBatchImport.create({
        data: {
          companyId,
          fileName: `import-${Date.now()}.csv`,
          totalRows: rows.length,
          status: 'PROCESSING',
          data: rows as any,
          uploadedById: authUser.sub,
          startedAt: new Date(),
        },
      });

      // Process contracts
      let created = 0;
      let failed = 0;
      const errors: any[] = [];

      for (const row of validation.validRows) {
        try {
          // Find receiver
          let receiverId: string | null = null;
          let receiverWallet: string | null = row.receiver_wallet || null;

          if (row.receiver_handle) {
            const handle = row.receiver_handle.replace('@', '');
            const profile = await prisma.profile.findUnique({
              where: { handle },
              include: { user: { select: { id: true, address: true } } },
            });

            if (profile?.user) {
              receiverId = profile.user.id;
              receiverWallet = receiverWallet || profile.user.address;
            }
          }

          if (!receiverId || !receiverWallet) {
            throw new Error('Recebedor não encontrado');
          }

          // Calculate next payment date
          const startDate = new Date(row.start_date);
          const paymentDay = parseInt(row.payment_day);
          const now = new Date();
          let nextPaymentDate = new Date(startDate);
          nextPaymentDate.setDate(paymentDay);

          if (nextPaymentDate < now) {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          }

          // Convert value to BZR (assuming 1e12 precision)
          const valueNum = parseFloat(row.value);
          const valueBzr = BigInt(Math.floor(valueNum * 1e12));

          // Create contract
          await prisma.payContract.create({
            data: {
              payerId: authUser.sub,
              payerCompanyId: companyId,
              receiverId,
              payerWallet: company.user.address,
              receiverWallet,
              baseValue: valueBzr.toString(),
              currency: row.currency?.toUpperCase() || 'BZR',
              period: row.period?.toUpperCase() as PayPeriod,
              paymentDay,
              startDate,
              endDate: row.end_date ? new Date(row.end_date) : null,
              nextPaymentDate,
              description: row.description || null,
              referenceType: row.reference_type || null,
              referenceId: row.reference_id || null,
              status: 'ACTIVE',
            },
          });

          created++;
        } catch (error) {
          failed++;
          errors.push({
            row: row.receiver_handle || row.receiver_wallet,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Update batch record
      await prisma.payBatchImport.update({
        where: { id: batch.id },
        data: {
          status: failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          processedRows: created + failed,
          createdCount: created,
          failedCount: failed,
          errors: errors.length > 0 ? errors as any : null,
          completedAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        batchId: batch.id,
        created,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  );

  /**
   * GET /api/pay/batch/imports
   * List batch imports
   */
  fastify.get<{ Querystring: { companyId?: string; limit?: string } }>(
    '/batch/imports',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId, limit = '20' } = request.query;

      const where: any = {
        uploadedById: authUser.sub,
      };

      if (companyId) {
        // Verify ownership
        const company = await prisma.sellerProfile.findFirst({
          where: { id: companyId, userId: authUser.sub },
        });
        if (company) {
          where.companyId = companyId;
        }
      }

      const imports = await prisma.payBatchImport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        select: {
          id: true,
          fileName: true,
          totalRows: true,
          processedRows: true,
          createdCount: true,
          failedCount: true,
          status: true,
          createdAt: true,
          completedAt: true,
          company: {
            select: { id: true, shopName: true },
          },
        },
      });

      return reply.send({ imports });
    }
  );

  /**
   * GET /api/pay/batch/imports/:id
   * Get batch import details
   */
  fastify.get<{ Params: { id: string } }>(
    '/batch/imports/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      const batch = await prisma.payBatchImport.findFirst({
        where: {
          id,
          uploadedById: authUser.sub,
        },
        include: {
          company: {
            select: { id: true, shopName: true },
          },
        },
      });

      if (!batch) {
        return reply.status(404).send({ error: 'Importação não encontrada' });
      }

      return reply.send({
        id: batch.id,
        fileName: batch.fileName,
        totalRows: batch.totalRows,
        processedRows: batch.processedRows,
        createdCount: batch.createdCount,
        failedCount: batch.failedCount,
        status: batch.status,
        errors: batch.errors,
        company: batch.company,
        createdAt: batch.createdAt,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
      });
    }
  );
}
