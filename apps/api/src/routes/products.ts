import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  processAttributes,
  resolveCategoryPath,                 // devolve array de slugs a partir do categoryId
  resolveCategoryIdFromPathString,     // resolve id a partir de ["casa-decoracao","decoracao","quadros"]
  resolveEffectiveSpecByCategoryId,    // pega spec + indexHints para projetar _indexFields
} from '../lib/categoryResolver.js';

const prisma = new PrismaClient();

/**
 * Schemas de validação
 * - Mantidos conforme o estilo do projeto
 */
const createProductSchema = z.object({
  daoId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  // Decimal como string (compatível com Prisma.Decimal)
  priceBzr: z.string().regex(/^\d+(\.\d{1,12})?$/),
  // O frontend envia somente os slugs (sem "products-")
  categoryPath: z.array(z.string()).min(1),
  attributes: z.record(z.any()),
});

const updateProductSchema = createProductSchema.partial();

export async function productsRoutes(app: FastifyInstance) {
  /**
   * POST /products — Criar produto
   * Ajuste principal: chamar processAttributes com { categoryId, categoryPath }
   */
  app.post('/products', async (request, reply) => {
    try {
      const body = createProductSchema.parse(request.body);

      // 1) Resolver categoryId a partir do categoryPath (array de slugs)
      const categoryId = await resolveCategoryIdFromPathString(body.categoryPath);
      if (!categoryId) {
        return reply.status(400).send({
          error: `Categoria inexistente para categoryPath: ${body.categoryPath.join('/')}`,
        });
      }

      // 2) Normalizar price (já vem string pelo schema — manter como está)
      const priceStr = body.priceBzr.replace(',', '.');

      // 3) Validar/coagir attributes conforme CategorySpec efetivo
      //    >>> ALTERAÇÃO: passamos o contexto (categoryId, categoryPath) <<<
      const { attributes: coerced, errors } = await processAttributes(
        body.attributes,
        { categoryId, categoryPath: body.categoryPath, dropUnknown: true }
      );

      if (errors && Object.keys(errors).length > 0) {
        return reply.status(400).send({
          error: 'Atributos inválidos de acordo com o CategorySpec',
          details: errors,
        });
      }

      // 4) Montar categoryPath (array) a partir do id para persistir/indexar
      const path = resolveCategoryPath(categoryId);

      // 5) Projetar _indexFields com base nos indexHints do spec efetivo
      const spec = await resolveEffectiveSpecByCategoryId(categoryId);
      const hints: string[] = Array.isArray(spec.indexHints) ? spec.indexHints : [];
      const indexFields = hints.reduce<Record<string, any>>((acc, key) => {
        const v = (coerced as any)[key];
        if (v === undefined || v === null) return acc;
        if (typeof v === 'string' && v.trim() === '') return acc;
        acc[key] = v;
        return acc;
      }, {});

      // 6) Criar produto
      const product = await prisma.product.create({
        data: {
          daoId: body.daoId,
          title: body.title,
          description: body.description ?? '',
          priceBzr: priceStr,
          categoryId,
          categoryPath: path,                 // string[]
          attributes: {
            ...coerced,
            _indexFields: indexFields,        // campos projetados para busca
          },
          attributesSpecVersion: String(spec.version ?? '1.0.0'),
        },
        select: {
          id: true,
          daoId: true,
          title: true,
          description: true,
          priceBzr: true,
          categoryId: true,
          categoryPath: true,
          attributes: true,
          attributesSpecVersion: true,
          createdAt: true,
        },
      });

      // 7) Audit log
      await prisma.auditLog.create({
        data: {
          entity: 'Product',
          entityId: product.id,
          action: 'CREATE',
          actor: body.daoId,
          diff: product,
        },
      });

      return reply.status(201).send(product);
    } catch (error) {
      app.log.error('Erro ao criar produto:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(500).send({ error: 'Erro inesperado' });
    }
  });

  /**
   * GET /products — Lista (simples)
   * Mantido leve para não quebrar nada já existente.
   */
  app.get('/products', async (_req, reply) => {
    try {
      const rows = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          daoId: true,
          title: true,
          priceBzr: true,
          categoryId: true,
          categoryPath: true,
          createdAt: true,
        },
        take: 50,
      });
      return reply.send(rows);
    } catch (error) {
      app.log.error('Erro ao listar produtos:', error);
      return reply.status(500).send({ error: 'Erro ao listar produtos' });
    }
  });

  /**
   * GET /products/:id — Detalhe
   */
  app.get<{ Params: { id: string } }>('/products/:id', async (req, reply) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          daoId: true,
          title: true,
          description: true,
          priceBzr: true,
          categoryId: true,
          categoryPath: true,
          attributes: true,
          attributesSpecVersion: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!product) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      return reply.send(product);
    } catch (error) {
      app.log.error('Erro ao buscar produto:', error);
      return reply.status(500).send({ error: 'Erro ao buscar produto' });
    }
  });

  /**
   * PUT /products/:id — Atualizar
   * Mantém a mesma regra de validação de atributos via spec da categoria.
   */
  app.put<{ Params: { id: string } }>('/products/:id', async (req, reply) => {
    try {
      const body = updateProductSchema.parse(req.body);

      // Buscar produto existente
      const existing = await prisma.product.findUnique({
        where: { id: req.params.id },
        select: { id: true, categoryId: true, categoryPath: true },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      // Resolver categoryId (permite atualizar categoryPath)
      let categoryId = existing.categoryId;
      let catPathArr = existing.categoryPath;

      if (Array.isArray(body.categoryPath) && body.categoryPath.length > 0) {
        const resolved = await resolveCategoryIdFromPathString(body.categoryPath);
        if (!resolved) {
          return reply.status(400).send({
            error: `Categoria inexistente para categoryPath: ${body.categoryPath.join('/')}`,
          });
        }
        categoryId = resolved;
        catPathArr = resolveCategoryPath(categoryId);
      }

      // Se veio attributes, validar/coagir
      let coercedAttrs: any | undefined;
      if (body.attributes) {
        const { attributes: coerced, errors } = await processAttributes(
          body.attributes,
          { categoryId, categoryPath: catPathArr, dropUnknown: true }
        );
        if (errors && Object.keys(errors).length > 0) {
          return reply.status(400).send({
            error: 'Atributos inválidos de acordo com o CategorySpec',
            details: errors,
          });
        }

        // Recalcular _indexFields
        const spec = await resolveEffectiveSpecByCategoryId(categoryId);
        const hints: string[] = Array.isArray(spec.indexHints) ? spec.indexHints : [];
        const indexFields = hints.reduce<Record<string, any>>((acc, key) => {
          const v = (coerced as any)[key];
          if (v === undefined || v === null) return acc;
          if (typeof v === 'string' && v.trim() === '') return acc;
          acc[key] = v;
          return acc;
        }, {});

        coercedAttrs = {
          ...coerced,
          _indexFields: indexFields,
        };
      }

      const updated = await prisma.product.update({
        where: { id: req.params.id },
        data: {
          ...(body.daoId ? { daoId: body.daoId } : {}),
          ...(body.title ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.priceBzr ? { priceBzr: body.priceBzr.replace(',', '.') } : {}),
          ...(catPathArr ? { categoryId, categoryPath: catPathArr } : {}),
          ...(coercedAttrs ? { attributes: coercedAttrs } : {}),
        },
        select: {
          id: true,
          daoId: true,
          title: true,
          description: true,
          priceBzr: true,
          categoryId: true,
          categoryPath: true,
          attributes: true,
          updatedAt: true,
        },
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          entity: 'Product',
          entityId: updated.id,
          action: 'UPDATE',
          actor: body.daoId ?? 'system',
          diff: updated,
        },
      });

      return reply.send(updated);
    } catch (error) {
      app.log.error('Erro ao atualizar produto:', error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: error.errors,
        });
      }

      if (error instanceof Error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.status(500).send({ error: 'Erro inesperado' });
    }
  });

  /**
   * DELETE /products/:id — Remover
   */
  app.delete<{ Params: { id: string } }>('/products/:id', async (req, reply) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!product) {
        return reply.status(404).send({ error: 'Produto não encontrado' });
      }

      await prisma.product.delete({ where: { id: req.params.id } });

      await prisma.auditLog.create({
        data: {
          entity: 'Product',
          entityId: req.params.id,
          action: 'DELETE',
          actor: 'system',
          diff: product,
        },
      });

      return reply.status(204).send();
    } catch (error) {
      app.log.error('Erro ao deletar produto:', error);
      return reply.status(500).send({ error: 'Erro ao deletar produto' });
    }
  });
}
