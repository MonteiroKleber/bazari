/**
 * Seed de CategorySpecs (ÚNICO script) — IMPORTA TODAS as specs do diretório
 * e garante fallback genérico para folhas sem spec.
 *
 * Ajustes desta versão:
 *  - `version` agora é tratado como STRING (compatível com seu schema Prisma).
 *  - Normaliza `categoryId` e `inheritsFrom` (aceita id completo, slug com "-", path com "/" ou ">").
 *  - Upsert idempotente por (categoryId, version:string).
 *  - Cria SPEC genérica para TODA categoria folha (level = 4) que ainda esteja sem SPEC.
 *
 * Como rodar:
 *   pnpm --filter @bazari/api run seed:specs
 *   # (ou) pnpm --filter @bazari/api exec tsx apps/api/scripts/seedCategorySpecs.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório com as specs JSON
const SPECS_DIR = path.resolve(__dirname, "../data/category-specs");

// --------- Tipos auxiliares (flexíveis p/ suportar variações dos JSONs) ----------

type Json = any;

type RawSpec = {
  // Referência à categoria (qualquer destes pode aparecer nos JSONs):
  categoryId?: string;              // "products-foo-bar-baz" | "services-foo-bar-baz" | "foo-bar-baz"
  categorySlug?: string;            // "foo/bar/baz" | "foo-bar-baz"
  categoryPath?: string[] | string; // ["foo","bar","baz"] | "foo/bar/baz"
  slug?: string;                    // "foo-bar-baz"
  path?: string;                    // "products>foo>bar>baz" | "services/foo/bar/baz"

  version?: number | string;        // pode vir número ou string; vamos forçar string
  inheritsFrom?: string | string[] | null;

  jsonSchema?: Json;
  uiSchema?: Json;
  indexHints?: string[];
};

// ------------------- Utilitários de caminho/slug -------------------

/** Normaliza um "path/slug" removendo prefixos e unificando separadores em "-" */
function normalizeSlugPath(ref: string | string[] | undefined | null): string | null {
  if (!ref) return null;

  if (Array.isArray(ref)) {
    return ref
      .map((s) => s.trim())
      .filter(Boolean)
      .join("-")
      .replace(/--+/g, "-")
      .toLowerCase();
  }

  let s = String(ref).trim();
  if (!s) return null;

  // Aceita "products/..."/"services/..." ou com ">" e remove prefixo textual
  s = s.replace(/^products[/>-]+/i, "");
  s = s.replace(/^services[/>-]+/i, "");

  s = s.replace(/>/g, "-").replace(/\//g, "-").replace(/_/g, "-");
  s = s.replace(/--+/g, "-").replace(/^-+|-+$/g, "");
  return s.toLowerCase();
}

/** Tenta resolver um ID de categoria existente no banco a partir de um slugPath sem prefixo */
async function resolveFullCategoryIdFromSlug(slugPath: string): Promise<string | null> {
  // Tenta com prefixos conhecidos (e também sem, caso já venha completo)
  const candidates = [
    slugPath, // caso já venha completo: "products-..." ou "services-..."
    `products-${slugPath}`,
    `services-${slugPath}`,
  ];

  for (const id of candidates) {
    const found = await prisma.category.findUnique({ where: { id } });
    if (found) return id;
  }
  return null;
}

/** Resolve categoryId vindo em múltiplos formatos (id completo, slug, path, etc.) */
async function resolveCategoryId(raw: RawSpec): Promise<string | null> {
  // 1) categoryId (pode já estar completo OU ser apenas o slug/path)
  if (raw.categoryId) {
    const id = raw.categoryId.trim();
    const exists = await prisma.category.findUnique({ where: { id } });
    if (exists) return id;

    const sp = normalizeSlugPath(id);
    if (sp) {
      const full = await resolveFullCategoryIdFromSlug(sp);
      if (full) return full;
    }
  }

  // 2) categorySlug
  if (raw.categorySlug) {
    const sp = normalizeSlugPath(raw.categorySlug);
    if (sp) {
      const full = await resolveFullCategoryIdFromSlug(sp);
      if (full) return full;
    }
  }

  // 3) categoryPath (array ou string)
  if (raw.categoryPath) {
    const sp = normalizeSlugPath(raw.categoryPath);
    if (sp) {
      const full = await resolveFullCategoryIdFromSlug(sp);
      if (full) return full;
    }
  }

  // 4) alternativos
  if (raw.path) {
    const sp = normalizeSlugPath(raw.path);
    if (sp) {
      const full = await resolveFullCategoryIdFromSlug(sp);
      if (full) return full;
    }
  }
  if (raw.slug) {
    const sp = normalizeSlugPath(raw.slug);
    if (sp) {
      const full = await resolveFullCategoryIdFromSlug(sp);
      if (full) return full;
    }
  }

  return null;
}

/** Normaliza inheritsFrom em UMA referência de pai (string), escolhendo a mais específica que existir */
async function resolveInheritsFrom(raw: RawSpec): Promise<string | null> {
  const rawInh = raw.inheritsFrom;
  if (!rawInh) return null;

  const candidates: string[] = Array.isArray(rawInh) ? rawInh : [rawInh];
  // Normaliza todos e escolhe o pai mais específico que existir
  for (const candidate of candidates.reverse()) {
    const sp = normalizeSlugPath(candidate);
    if (!sp) continue;
    const full = await resolveFullCategoryIdFromSlug(sp);
    if (full) return full;
  }
  return null;
}

/** Força a versão a ser STRING */
function parseVersionToString(v: number | string | undefined): string {
  if (typeof v === "string") {
    const s = v.trim();
    return s.length ? s : "1";
  }
  if (typeof v === "number") {
    // aceita 1 ou 1.0 etc — mantém simples
    return String(v);
  }
  return "1";
}

// ------------------- IO: leitura de arquivos JSON -------------------

async function walkJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        await walk(p);
      } else if (ent.isFile() && p.endsWith(".json")) {
        out.push(p);
      }
    }
  }
  await walk(dir);
  return out.sort();
}

async function readJson<T = any>(filePath: string): Promise<T> {
  const buf = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(buf) as T;
  } catch (err: any) {
    throw new Error(`Falha ao parsear JSON: ${filePath}\n${err?.message ?? err}`);
  }
}

// ------------------- Upsert idempotente -------------------

async function upsertCategorySpec(params: {
  categoryId: string;
  version: string;        // <— STRING
  jsonSchema: Json;
  uiSchema: Json;
  indexHints: string[];
  inheritsFrom?: string | null;
}) {
  const { categoryId, version, jsonSchema, uiSchema, indexHints, inheritsFrom = null } = params;

  // findFirst por (categoryId, version:string)
  const existing = await prisma.categorySpec.findFirst({
    where: { categoryId, version },
    select: { id: true },
  });

  if (existing) {
    await prisma.categorySpec.update({
      where: { id: existing.id },
      data: {
        jsonSchema,
        uiSchema,
        indexHints,
        inheritsFrom,
      },
    });
    return { action: "update" as const };
  } else {
    await prisma.categorySpec.create({
      data: {
        categoryId,
        version,      // string
        jsonSchema,
        uiSchema,
        indexHints,
        inheritsFrom,
      },
    });
    return { action: "create" as const };
  }
}

// ------------------- Fallback genérico para folhas -------------------

const GENERIC_SPEC = {
  version: "1", // <— STRING
  jsonSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      condicao: { type: "string", enum: ["novo", "usado", "recondicionado"] },
      observacoes: { type: "string" },
    },
    required: [],
  },
  uiSchema: {
    condicao: { widget: "radio" },
    observacoes: { widget: "textarea", rows: 4 },
  },
  indexHints: ["condicao"],
};

async function ensureGenericForLeafs() {
  const leafs = await prisma.category.findMany({
    where: { level: 4 },
    select: { id: true },
  });

  let created = 0;
  for (const c of leafs) {
    const has = await prisma.categorySpec.findFirst({
      where: { categoryId: c.id },
      select: { id: true },
    });
    if (has) continue;

    await prisma.categorySpec.create({
      data: {
        categoryId: c.id,
        version: GENERIC_SPEC.version, // string
        jsonSchema: GENERIC_SPEC.jsonSchema,
        uiSchema: GENERIC_SPEC.uiSchema,
        indexHints: GENERIC_SPEC.indexHints,
        inheritsFrom: null,
      },
    });
    created++;
  }
  return created;
}

// ------------------- Execução principal -------------------

async function main() {
  console.log("⏳ Lendo specs em:", SPECS_DIR);
  const files = await walkJsonFiles(SPECS_DIR);
  if (files.length === 0) {
    console.warn("⚠️ Nenhum arquivo .json encontrado em", SPECS_DIR);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const warnings: string[] = [];

  for (const f of files) {
    try {
      const raw = await readJson<RawSpec>(f);

      // Resolver categoryId
      const categoryId = await resolveCategoryId(raw);
      if (!categoryId) {
        warnings.push(`Spec ignorada (categoryId inválido): ${path.relative(process.cwd(), f)}`);
        skipped++;
        continue;
      }

      // Version como STRING
      const version = parseVersionToString(raw.version);

      // Normaliza inheritsFrom → UM pai direto (string) ou null
      const inheritsFrom = await resolveInheritsFrom(raw);

      // jsonSchema / uiSchema / indexHints
      const jsonSchema = raw.jsonSchema ?? { type: "object", properties: {}, required: [] };
      const uiSchema = raw.uiSchema ?? {};
      const indexHints = Array.isArray(raw.indexHints) ? raw.indexHints : [];

      const res = await upsertCategorySpec({
        categoryId,
        version, // string
        jsonSchema,
        uiSchema,
        indexHints,
        inheritsFrom,
      });

      if (res.action === "create") created++;
      else updated++;
    } catch (err: any) {
      console.error(`✗ Erro ao processar ${f}:`, err?.message ?? err);
      errors++;
    }
  }

  const createdFallback = await ensureGenericForLeafs();

  console.log("——— SEED CategorySpecs — Resumo ———");
  console.log(`✔️  Criadas (arquivos):     ${created}`);
  console.log(`♻️  Atualizadas (arquivos): ${updated}`);
  console.log(`➖  Ignoradas:              ${skipped}`);
  console.log(`⚙️  Fallback genérico:      +${createdFallback} (folhas sem spec)`);
  console.log(`❗  Erros:                  ${errors}`);
  if (warnings.length) {
    console.log("⚠️  Avisos:");
    for (const w of warnings) console.log("   -", w);
  }
}

main()
  .catch((e) => {
    console.error("✗ Seed falhou:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
