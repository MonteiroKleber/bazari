import type { FastifyInstance, FastifyRequest } from "fastify";
import { PrismaClient } from "@prisma/client";
import {
  resolveEffectiveSpec,
  resolveCategoryPath,
} from "../lib/categoryResolver.js";

const prisma = new PrismaClient();

/**
 * Rotas de Categorias
 *
 * Endpoints:
 *  - GET /categories
 *      Query:
 *        - root: "products" | "services"        (opcional; se omitido, traz ambos)
 *        - kind: "product" | "service"          (alias de root; opcional)
 *        - level: 1 | 2 | 3 | 4                 (opcional)
 *        - parentId: <categoryId>               (se informado, retorna só os filhos diretos)
 *        - q: termo de busca (id/nome)          (opcional, simples)
 *
 *  - GET /categories/children?parentId=<id>     (atalho para obter filhos diretos)
 *
 *  - GET /categories/effective-spec?id=<id>
 *  - GET /categories/effective-spec?path=<pathString>  (ex.: products>tecnologia>eletronicos>celulares)
 *
 *  - GET /categories/path?id=<id>               (utilitário legado: retorna array de slugs)
 *
 * Observações:
 *  - Respostas seguem o shape nativo do Prisma para Category (campos do schema).
 *  - effective-spec responde { categoryId, categoryPath, version, jsonSchema, uiSchema, indexHints }.
 */

type ListQuery = {
  root?: "products" | "services";
  kind?: "product" | "service";
  level?: string; // será parseado para número
  parentId?: string;
  q?: string;
};

type EffectiveSpecQuery = { id?: string; path?: string };

export async function categoriesRoutes(app: FastifyInstance) {
  // Health simples desta rota (ajuda em debug)
  app.get("/categories/__health", async () => ({ ok: true }));

  /**
   * GET /categories
   * Lista categorias com filtros. Se parentId informado, retorna filhos diretos.
   */
  app.get(
    "/categories",
    async (req: FastifyRequest<{ Querystring: ListQuery }>, reply) => {
      const { root, kind, level, parentId, q } = req.query || {};

      // Se pedir filhos diretos
      if (parentId) {
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        if (!parent) {
          return reply.code(404).send({ error: `Categoria não encontrada: ${parentId}` });
        }

        const children = await prisma.category.findMany({
          where: {
            id: { startsWith: parent.id + "-" },
            level: parent.level + 1,
          },
          orderBy: { id: "asc" },
        });

        // filtro de busca simples (id/nome) se q vier
        const filtered = (q && q.trim())
          ? children.filter((c: any) => {
              const t = q.toLowerCase();
              const idOk = String(c.id).toLowerCase().includes(t);
              const np = (c.namePt ?? c.name_pt ?? "").toString().toLowerCase().includes(t);
              const ne = (c.nameEn ?? c.name_en ?? "").toString().toLowerCase().includes(t);
              const ns = (c.nameEs ?? c.name_es ?? "").toString().toLowerCase().includes(t);
              return idOk || np || ne || ns;
            })
          : children;

        return reply.send(filtered);
      }

      // Filtros gerais
      const where: any = {};

      // root/kind → prefixo do id
      const rootResolved =
        root ??
        (kind === "product" ? "products" : kind === "service" ? "services" : undefined);

      if (rootResolved === "products") where.id = { startsWith: "products-" };
      if (rootResolved === "services") where.id = { startsWith: "services-" };

      // level
      const lvl = level ? Number(level) : undefined;
      if (lvl && [1, 2, 3, 4].includes(lvl)) where.level = lvl;

      // q (busca simples por id/nome)
      // Como o Prisma não tem contains para múltiplos campos em OR com camel/snake, vamos filtrar pós-query se precisar
      const list = await prisma.category.findMany({
        where,
        orderBy: { id: "asc" },
      });

      const result =
        q && q.trim()
          ? list.filter((c: any) => {
              const t = q.toLowerCase();
              const idOk = String(c.id).toLowerCase().includes(t);
              const np = (c.namePt ?? c.name_pt ?? "").toString().toLowerCase().includes(t);
              const ne = (c.nameEn ?? c.name_en ?? "").toString().toLowerCase().includes(t);
              const ns = (c.nameEs ?? c.name_es ?? "").toString().toLowerCase().includes(t);
              return idOk || np || ne || ns;
            })
          : list;

      return reply.send(result);
    }
  );

  /**
   * GET /categories/children
   * Atalho para pegar filhos diretos de um parentId.
   */
  app.get(
    "/categories/children",
    async (req: FastifyRequest<{ Querystring: { parentId?: string; q?: string } }>, reply) => {
      const { parentId, q } = req.query || {};
      if (!parentId) {
        return reply.code(400).send({ error: "parentId é obrigatório" });
      }

      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return reply.code(404).send({ error: `Categoria não encontrada: ${parentId}` });
      }

      const children = await prisma.category.findMany({
        where: {
          id: { startsWith: parent.id + "-" },
          level: parent.level + 1,
        },
        orderBy: { id: "asc" },
      });

      const filtered = (q && q.trim())
        ? children.filter((c: any) => {
            const t = q.toLowerCase();
            const idOk = String(c.id).toLowerCase().includes(t);
            const np = (c.namePt ?? c.name_pt ?? "").toString().toLowerCase().includes(t);
            const ne = (c.nameEn ?? c.name_en ?? "").toString().toLowerCase().includes(t);
            const ns = (c.nameEs ?? c.name_es ?? "").toString().toLowerCase().includes(t);
            return idOk || np || ne || ns;
          })
        : children;

      return reply.send(filtered);
    }
  );

  /**
   * GET /categories/effective-spec
   * Herança L1→L4 e merge de jsonSchema/uiSchema/indexHints.
   */
  app.get(
    "/categories/effective-spec",
    async (req: FastifyRequest<{ Querystring: EffectiveSpecQuery }>, reply) => {
      const { id, path } = req.query || {};
      if (!id && !path) {
        return reply
          .code(400)
          .send({ error: "Informe ?id=<categoryId> ou ?path=<products>... " });
      }

      try {
        const eff = await resolveEffectiveSpec({ id, path });
        return reply.send({
          categoryId: eff.categoryId,
          categoryPath: eff.categoryPath,
          version: eff.version,
          jsonSchema: eff.jsonSchema ?? { type: "object", properties: {} },
          uiSchema: eff.uiSchema ?? {},
          indexHints: Array.isArray(eff.indexHints) ? eff.indexHints : [],
        });
      } catch (err: any) {
        app.log.error(
          { err, id, path },
          "Falha ao resolver effective-spec para categoria"
        );
        return reply.code(400).send({ error: String(err?.message ?? err) });
      }
    }
  );

  /**
   * GET /categories/path
   * Retorna a categoryPath (array de slugs) a partir de um id completo.
   */
  app.get(
    "/categories/path",
    async (
      req: FastifyRequest<{ Querystring: { id?: string } }>,
      reply
    ) => {
      const { id } = req.query || {};
      if (!id) return reply.code(400).send({ error: "id é obrigatório" });

      try {
        const path = resolveCategoryPath(id);
        return reply.send({ path });
      } catch (err: any) {
        return reply.code(400).send({ error: String(err?.message ?? err) });
      }
    }
  );
}

export default categoriesRoutes;
