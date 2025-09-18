// V-8 (2025-09-18): Tipar retorno de specs como nullável no resolver
// V-7: Correção para suportar categorias sem CategorySpec (2025-01-11)
// Agora retorna spec vazio padrão quando categoria não tem spec definido
// Corrige erro 400 em categorias como "sandalias-chinelos"

/**
 * categoryResolver.ts
 *
 * Resolve o "Effective CategorySpec" (herança L1→L4) para uma categoria,
 * mesclando jsonSchema/uiSchema/indexHints em ordem do mais genérico (L1)
 * ao mais específico (L4). Também lida com dados legados em que IDs vinham
 * sem o prefixo ("products-" | "services-").
 *
 * Exporta:
 *  - resolveEffectiveSpecByCategoryId(categoryId)
 *  - resolveEffectiveSpecByCategoryPath(pathSlugs)
 *  - resolveCategoryIdFromPathString(path | string[])
 *  - resolveCategoryIdFromAny(ref)
 *  - resolveCategoryPath(categoryId)                // alias usado em rotas legadas
 *  - resolveEffectiveSpec({ id?, path? })
 *  - processAttributes(...)                         // ASSINATURAS SUPORTADAS:
 *        1) Legada:  processAttributes(categoryId, input)
 *        2) Nova:    processAttributes(input, { spec? | categoryId? | path? | categoryPath?, dropUnknown? })
 *        3) Agregada:processAttributes({ attributes, spec?, categoryId?, path?, categoryPath?, dropUnknown? })
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type EffectiveSpec = {
  categoryId: string;
  categoryPath: string[];
  version: string;
  jsonSchema: any;
  uiSchema: any;
  indexHints: string[];
};

/* -------------------------
 * Normalização / utilitários
 * ------------------------- */

export function normalizeSlugPath(ref: string | string[]): string[] {
  if (Array.isArray(ref)) {
    return ref.map((s) => s.trim()).filter(Boolean).map((s) => s.toLowerCase());
  }
  let s = String(ref || "").trim().toLowerCase();
  s = s.replace(/>/g, "/").replace(/_/g, "-");
  s = s.replace(/^products[/-]+/i, "").replace(/^services[/-]+/i, "");
  const parts = s.split("/").map((p) => p.trim()).filter(Boolean);
  return parts;
}

export function buildCategoryId(root: "products" | "services", slugs: string[]): string {
  if (!slugs?.length) return root;
  return [root, ...slugs].join("-");
}

export async function resolveCategoryIdFromPathString(ref: string | string[]): Promise<string | null> {
  const parts = Array.isArray(ref) ? ref : normalizeSlugPath(ref);
  if (!parts.length) return null;

  const first = parts[0];
  let root: "products" | "services" | null = null;
  if (/^prod/.test(first)) root = "products";
  else if (/^serv/.test(first)) root = "services";

  let cleaned = Array.isArray(ref) ? parts.join("/") : String(ref || "");
  cleaned = cleaned.trim().toLowerCase()
    .replace(/^products[/-]+/i, "")
    .replace(/^services[/-]+/i, "")
    .replace(/>/g, "/");

  const slugs = normalizeSlugPath(cleaned);
  const rootsToTry: ("products" | "services")[] = root ? [root] : ["products", "services"];

  for (const rootType of rootsToTry) {
    const id = buildCategoryId(rootType, slugs);
    const found = await prisma.category.findUnique({ where: { id } });
    if (found) return id;
  }

  return null;
}

export function buildChainIdsFromCategoryId(categoryId: string): string[] {
  const parts = categoryId.split("-");
  if (parts.length < 2) return [categoryId];

  const root = parts[0];
  const slugs = parts.slice(1);
  const chain: string[] = [];

  for (let i = 1; i <= slugs.length; i++) {
    const id = [root, ...slugs.slice(0, i)].join("-");
    chain.push(id);
  }

  return chain;
}

export function buildCategoryPathFromId(categoryId: string): string[] {
  const parts = categoryId.split("-");
  if (parts.length < 2) return [];
  return parts.slice(1);
}

/* ---------------------------------
 * Funcões auxiliares de merge/herança
 * --------------------------------- */

function deepMerge(a: any, b: any): any {
  if (b === null || b === undefined) return a;
  if (a === null || a === undefined) return b;
  if (typeof a !== "object" || typeof b !== "object") return b;
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (Array.isArray(a) !== Array.isArray(b)) return b;
  if (a && typeof a === "object" && b && typeof b === "object") {
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = deepMerge(a[k], b[k]);
    return out;
  }
  return b ?? a;
}

function mergeJsonSchema(base: any, over: any) {
  const out = deepMerge(base || {}, over || {});
  const props = { ...(base?.properties || {}), ...(over?.properties || {}) };
  out.properties = props;
  const reqA = Array.isArray(base?.required) ? base.required : [];
  const reqB = Array.isArray(over?.required) ? over.required : [];
  out.required = Array.from(new Set([...reqA, ...reqB]));
  return out;
}

function mergeUiSchema(base: any, over: any) {
  return deepMerge(base || {}, over || {});
}

function mergeIndexHints(a: string[] = [], b: string[] = []) {
  return Array.from(new Set([...a, ...b]));
}

/* ---------------------------------------------------
 * Carregamento de SPECs e resolução com herança (DB)
 * --------------------------------------------------- */

async function getLatestSpec(categoryId: string) {
  const specs = await prisma.categorySpec.findMany({
    where: { categoryId },
    orderBy: { version: "desc" },
    take: 1,
  });
  return specs[0] || null;
}

type ResolvedLatestSpec = {
  spec: Awaited<ReturnType<typeof getLatestSpec>> | null;
  categoryId: string | null;
};

async function getLatestSpecResolvingId(maybeId: string): Promise<ResolvedLatestSpec> {
  const id = (maybeId || "").trim();

  const f = await prisma.category.findUnique({ where: { id } });
  if (f) {
    const spec = await getLatestSpec(id);
    return { spec, categoryId: id };
  }

  if (!/^products-|^services-/.test(id)) {
    const cand1 = `products-${id}`;
    const cand2 = `services-${id}`;
    const f1 = await prisma.category.findUnique({ where: { id: cand1 } });
    if (f1) return { spec: await getLatestSpec(cand1), categoryId: cand1 };
    const f2 = await prisma.category.findUnique({ where: { id: cand2 } });
    if (f2) return { spec: await getLatestSpec(cand2), categoryId: cand2 };
  }

  return { spec: null, categoryId: null };
}

async function resolveSpecChain(categoryId: string, visited = new Set<string>()) {
  const chain: Array<{ id: string; spec: any | null }> = [];

  const { spec: targetSpec } = await getLatestSpecResolvingId(categoryId);

  const parentId: string | null = targetSpec?.inheritsFrom || null;
  if (parentId) {
    if (visited.has(parentId)) throw new Error(`Ciclo de herança: ${categoryId} -> ${parentId}`);
    visited.add(parentId);
    const parentChain = await resolveSpecChain(parentId, visited);
    for (const segment of parentChain) chain.push(segment);
  }

  if (!parentId) {
    const chainIds = buildChainIdsFromCategoryId(categoryId);
    const inferredParents = chainIds.slice(0, chainIds.length - 1);
    for (const pid of inferredParents) {
      const { spec } = await getLatestSpecResolvingId(pid);
      chain.push({ id: pid, spec });
    }
  }

  chain.push({ id: categoryId, spec: targetSpec });
  return chain;
}

/* -----------------------------------------
 * Resolução pública do Effective CategorySpec
 * ----------------------------------------- */

// CORREÇÃO: Função que retorna spec padrão quando categoria não tem spec
function createDefaultSpec(categoryId: string): EffectiveSpec {
  return {
    categoryId,
    categoryPath: buildCategoryPathFromId(categoryId),
    version: "1.0.0",
    jsonSchema: {
      type: "object",
      properties: {},
      required: []
    },
    uiSchema: {},
    indexHints: []
  };
}

export async function resolveEffectiveSpecByCategoryId(categoryId: string): Promise<EffectiveSpec> {
  if (!categoryId) throw new Error("categoryId é obrigatório");

  // CORREÇÃO: Verificar se a categoria existe antes de tentar resolver spec
  const categoryExists = await prisma.category.findUnique({ 
    where: { id: categoryId },
    select: { id: true }
  });

  if (!categoryExists) {
    throw new Error(`Categoria não encontrada: ${categoryId}`);
  }

  try {
    const chain = await resolveSpecChain(categoryId);

    let jsonSchema: any = { type: "object", properties: {}, required: [] };
    let uiSchema: any = {};
    let indexHints: string[] = [];
    let version = "1.0.0";

    // CORREÇÃO: Se não há specs na chain, retornar spec padrão
    const specsInChain = chain.filter(seg => seg?.spec);
    
    if (specsInChain.length === 0) {
      console.log(`⚠️ Nenhum CategorySpec encontrado para ${categoryId}, usando spec padrão`);
      return createDefaultSpec(categoryId);
    }

    // Merge das specs encontradas
    for (const seg of specsInChain) {
      if (!seg?.spec) continue;
      jsonSchema = mergeJsonSchema(jsonSchema, seg.spec.jsonSchema);
      uiSchema = mergeUiSchema(uiSchema, seg.spec.uiSchema);
      indexHints = mergeIndexHints(indexHints, seg.spec.indexHints);
      version = seg.spec.version || version;
    }

    return {
      categoryId,
      categoryPath: buildCategoryPathFromId(categoryId),
      version,
      jsonSchema,
      uiSchema,
      indexHints,
    };

  } catch (error) {
    console.log(`⚠️ Erro ao resolver spec para ${categoryId}:`, error);
    console.log(`Retornando spec padrão para permitir cadastro`);
    return createDefaultSpec(categoryId);
  }
}

export async function resolveEffectiveSpecByCategoryPath(pathSlugs: string[]): Promise<EffectiveSpec> {
  const id = buildCategoryId("products", pathSlugs);
  return resolveEffectiveSpecByCategoryId(id);
}

export async function resolveCategoryIdFromAny(ref: string): Promise<string | null> {
  const id = (ref || "").trim();

  if (/^(products|services)(-|$)/.test(id)) {
    const found = await prisma.category.findUnique({ where: { id } });
    if (found) return id;
  }

  if (!/^products-|^services-/.test(id)) {
    const cand1 = `products-${id}`;
    const cand2 = `services-${id}`;
    const f1 = await prisma.category.findUnique({ where: { id: cand1 } });
    if (f1) return cand1;
    const f2 = await prisma.category.findUnique({ where: { id: cand2 } });
    if (f2) return cand2;
  }

  const maybe = await resolveCategoryIdFromPathString(id);
  if (maybe) return maybe;

  return null;
}

/* ----------------------------------------------------------
 * Aliases de compatibilidade com rotas já existentes (legacy)
 * ---------------------------------------------------------- */

export function resolveCategoryPath(categoryId: string): string[] {
  return buildCategoryPathFromId(categoryId);
}

export async function resolveEffectiveSpec(ref: { id?: string; path?: string }): Promise<EffectiveSpec> {
  if (ref.id) return resolveEffectiveSpecByCategoryId(ref.id);
  if (ref.path) {
    const slugs = ref.path.split("/").map((s) => s.trim()).filter(Boolean);
    return resolveEffectiveSpecByCategoryPath(slugs);
  }
  throw new Error("resolveEffectiveSpec: informe { id } ou { path }");
}

/* ------------------------
 * Coerção por schema
 * ------------------------ */

function toBool(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  const s = String(val).toLowerCase().trim();
  return ["1", "true", "yes", "sim", "y", "on"].includes(s);
}

function toNumber(val: any): number | null {
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toInt(val: any): number | null {
  const n = typeof val === "number" ? val : parseInt(String(val), 10);
  return Number.isFinite(n) ? n : null;
}

function splitToArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  return String(val).split(",").map((s) => s.trim()).filter(Boolean);
}

function coerceBySchema(propSchema: any, value: any): { value: any; error?: string } {
  try {
    if (value === null || value === undefined) return { value };

    const type = propSchema?.type;
    if (type === "boolean") {
      return { value: toBool(value) };
    }
    if (type === "number") {
      const n = toNumber(value);
      if (n === null) return { value, error: "number" };
      if (typeof propSchema.minimum === "number" && n < propSchema.minimum) return { value: n, error: "minimum" };
      if (typeof propSchema.maximum === "number" && n > propSchema.maximum) return { value: n, error: "maximum" };
      return { value: n };
    }
    if (type === "integer") {
      const n = toInt(value);
      if (n === null) return { value, error: "integer" };
      if (typeof propSchema.minimum === "number" && n < propSchema.minimum) return { value: n, error: "minimum" };
      if (typeof propSchema.maximum === "number" && n > propSchema.maximum) return { value: n, error: "maximum" };
      return { value: n };
    }
    if (type === "array") {
      return { value: splitToArray(value) };
    }
    if (type === "string" || !type) {
      const enumVals = propSchema?.enum;
      const s: string = typeof value === "string" ? value : String(value);
      if (enumVals) {
        if (enumVals.includes(s)) return { value: s };
        const norm = (x: string) =>
          x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const found = (enumVals as any[]).find((opt) => norm(String(opt)) === norm(s));
        if (found) return { value: found };
        return { value: s, error: "enum" };
      }
      if (typeof propSchema.minLength === "number" && s.length < propSchema.minLength) return { value: s, error: "minLength" };
      if (typeof propSchema.maxLength === "number" && s.length > propSchema.maxLength) return { value: s, error: "maxLength" };
      return { value: s };
    }

    return { value };
  } catch {
    return { value, error: "invalid" };
  }
}

/* -----------------------------------------------------------
 * processAttributes — SUPORTE A 3 ASSINATURAS
 * ----------------------------------------------------------- */

type ProcessOpts = {
  spec?: EffectiveSpec;
  categoryId?: string;
  path?: string | string[];
  categoryPath?: string[];
  dropUnknown?: boolean;
};

async function _processAttributesNew(
  input: any,
  opts: ProcessOpts = {}
): Promise<{ attributes: any; errors: Record<string, string> }> {
  const dropUnknown = opts.dropUnknown !== false;

  let spec: EffectiveSpec | null = null;
  
  try {
    if (opts.spec) {
      spec = opts.spec;
    } else if (opts.categoryId) {
      // CORREÇÃO: Agora sempre retorna spec válido (mesmo que padrão)
      spec = await resolveEffectiveSpecByCategoryId(opts.categoryId);
    } else if (opts.path) {
      const fromPath = await resolveCategoryIdFromPathString(opts.path as any);
      if (!fromPath) throw new Error(`Categoria não encontrada para path: ${String(opts.path)}`);
      spec = await resolveEffectiveSpecByCategoryId(fromPath);
    } else if (opts.categoryPath && Array.isArray(opts.categoryPath)) {
      const fromPath = await resolveCategoryIdFromPathString(opts.categoryPath);
      if (!fromPath) throw new Error(`Categoria não encontrada para categoryPath: ${opts.categoryPath.join("/")}`);
      spec = await resolveEffectiveSpecByCategoryId(fromPath);
    } else {
      throw new Error("processAttributes: informe { spec } ou { categoryId } ou { path } ou { categoryPath }");
    }
  } catch (error) {
    console.error("Erro ao resolver spec:", error);
    throw error;
  }

  // CORREÇÃO: Garantir que spec nunca seja null
  if (!spec) {
    throw new Error("Não foi possível resolver CategorySpec para os parâmetros fornecidos");
  }

  const schema = spec.jsonSchema || { type: "object", properties: {}, required: [] };
  const props = schema.properties || {};
  const required: string[] = Array.isArray(schema.required) ? schema.required : [];

  const out: any = {};
  const errors: Record<string, string> = {};

  const keys = (dropUnknown ? Object.keys(props) : Array.from(new Set([...Object.keys(props), ...Object.keys(input || {})])));

  for (const key of keys) {
    const propSchema = props[key];
    const has = Object.prototype.hasOwnProperty.call(input || {}, key);
    const val = has ? (input as any)[key] : undefined;

    if (!has) {
      if (required.includes(key)) errors[key] = "required";
      continue;
    }

    const { value, error } = coerceBySchema(propSchema, val);
    if (error) { errors[key] = error; continue; }

    if (value === "" || value == null) {
      if (required.includes(key)) errors[key] = "required";
      continue;
    }

    out[key] = value;
  }

  return { attributes: out, errors };
}

/**
 * Assinaturas aceitas:
 *  1) Legada:   processAttributes(categoryId, input)
 *  2) Nova:     processAttributes(input, { spec|categoryId|path|categoryPath, dropUnknown? })
 *  3) Agregada: processAttributes({ attributes, spec?, categoryId?, path?, categoryPath?, dropUnknown? })
 */
export async function processAttributes(
  a: any,
  b?: any
): Promise<{ attributes: any; errors: Record<string, string> }> {
  // 3) Agregada: processAttributes({ attributes, ...opts })
  if (a && typeof a === "object" && "attributes" in a) {
    const { attributes, spec, categoryId, path, categoryPath, dropUnknown } = a as {
      attributes: any; spec?: EffectiveSpec; categoryId?: string;
      path?: string | string[]; categoryPath?: string[]; dropUnknown?: boolean;
    };
    return _processAttributesNew(attributes, { spec, categoryId, path, categoryPath, dropUnknown });
  }

  // 1) Legada: processAttributes(categoryId: string, input: any)
  if (typeof a === "string" && b && typeof b === "object" &&
      !("spec" in b) && !("categoryId" in b) && !("path" in b) && !("categoryPath" in b)) {
    const categoryId = a as string;
    const input = b;
    return _processAttributesNew(input, { categoryId });
  }

  // 2) Nova: processAttributes(input, opts)
  if (a && typeof a === "object") {
    const input = a;
    const opts = (b || {}) as ProcessOpts;
    return _processAttributesNew(input, opts);
  }

  // Fallback com mensagem clara
  throw new Error("processAttributes: informe (categoryId, input) ou (input, { spec|categoryId|path|categoryPath }) ou ({ attributes, ...opts })");
}

/* ------------------------
 * Export default agrupado
 * ------------------------ */

const CategoryResolver = {
  normalizeSlugPath,
  buildCategoryId,
  resolveCategoryIdFromPathString,
  buildChainIdsFromCategoryId,
  buildCategoryPathFromId,
  resolveEffectiveSpecByCategoryId,
  resolveEffectiveSpecByCategoryPath,
  resolveCategoryIdFromAny,
  resolveCategoryPath,
  resolveEffectiveSpec,
  processAttributes,
};

export default CategoryResolver;
