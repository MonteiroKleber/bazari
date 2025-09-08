import { PrismaClient } from '@prisma/client';
import { validateAttributes, extractIndexFields } from './validation.js';

const prisma = new PrismaClient();

interface CategorySpec {
  categoryId: string;
  version: string;
  inheritsFrom?: string | null;
  jsonSchema: any;
  uiSchema: any;
  indexHints: string[];
}

interface EffectiveSpec {
  jsonSchema: any;
  uiSchema: any;
  indexHints: string[];
  version: string;
}

// Resolver caminho de categoria para obter o ID da folha
export async function resolveCategoryPath(
  kind: 'product' | 'service',
  path: string[]
): Promise<{ categoryId: string; path: string[]; category: any }> {
  // Buscar categoria pela pathSlugs
  const category = await prisma.category.findFirst({
    where: {
      kind,
      pathSlugs: {
        equals: path
      }
    }
  });
  
  if (!category) {
    throw new Error(`Categoria não encontrada: ${path.join(' > ')}`);
  }
  
  // Verificar se é folha (não tem filhos)
  const hasChildren = await prisma.category.findFirst({
    where: {
      parentId: category.id
    }
  });
  
  if (hasChildren) {
    throw new Error(`Categoria ${category.id} não é uma folha. Selecione uma subcategoria.`);
  }
  
  return {
    categoryId: category.id,
    path: category.pathSlugs,
    category
  };
}

// Resolver especificação efetiva com herança L1→L4
export async function resolveEffectiveSpec(categoryId: string): Promise<EffectiveSpec> {
  // Buscar todas as specs da cadeia de herança
  const specs: CategorySpec[] = [];
  let currentCategoryId = categoryId;
  
  while (currentCategoryId) {
    const spec = await prisma.categorySpec.findFirst({
      where: { categoryId: currentCategoryId },
      orderBy: { version: 'desc' }
    });
    
    if (spec) {
      specs.push(spec);
      currentCategoryId = spec.inheritsFrom;
    } else {
      break;
    }
  }
  
  // Se não houver specs, criar uma básica
  if (specs.length === 0) {
    return {
      jsonSchema: { type: 'object', properties: {}, required: [] },
      uiSchema: {},
      indexHints: [],
      version: '0.0.0'
    };
  }
  
  // Fazer merge das specs (da mais genérica para a mais específica)
  specs.reverse();
  
  let effectiveJsonSchema = { type: 'object', properties: {}, required: [] };
  let effectiveUiSchema = {};
  let effectiveIndexHints = new Set<string>();
  
  for (const spec of specs) {
    // Merge jsonSchema
    if (spec.jsonSchema.properties) {
      effectiveJsonSchema.properties = {
        ...effectiveJsonSchema.properties,
        ...spec.jsonSchema.properties
      };
    }
    
    if (spec.jsonSchema.required) {
      effectiveJsonSchema.required = [
        ...new Set([
          ...effectiveJsonSchema.required,
          ...spec.jsonSchema.required
        ])
      ];
    }
    
    // Merge uiSchema
    effectiveUiSchema = {
      ...effectiveUiSchema,
      ...spec.uiSchema
    };
    
    // Merge indexHints
    spec.indexHints.forEach(hint => effectiveIndexHints.add(hint));
  }
  
  return {
    jsonSchema: effectiveJsonSchema,
    uiSchema: effectiveUiSchema,
    indexHints: Array.from(effectiveIndexHints),
    version: specs[specs.length - 1].version
  };
}

// Validar e processar atributos para um produto/serviço
export async function processAttributes(
  categoryId: string,
  attributes: any
): Promise<{
  valid: boolean;
  errors?: string[];
  processedAttributes?: any;
  indexFields?: Record<string, any>;
  specVersion?: string;
}> {
  // Resolver spec efetiva
  const effectiveSpec = await resolveEffectiveSpec(categoryId);
  
  // Validar atributos
  const validation = validateAttributes(effectiveSpec.jsonSchema, attributes);
  
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors
    };
  }
  
  // Extrair campos indexáveis
  const indexFields = extractIndexFields(attributes, effectiveSpec.indexHints);
  
  return {
    valid: true,
    processedAttributes: attributes,
    indexFields,
    specVersion: effectiveSpec.version
  };
}

// Helper para obter todas as categorias em formato de árvore
export async function getCategoryTree() {
  const categories = await prisma.category.findMany({
    orderBy: [
      { kind: 'asc' },
      { level: 'asc' },
      { sort: 'asc' },
      { slug: 'asc' }
    ]
  });
  
  // Organizar em árvore
  const tree = {
    products: categories.filter(c => c.kind === 'product'),
    services: categories.filter(c => c.kind === 'service')
  };
  
  return tree;
}

export {
  validateAttributes,
  extractIndexFields
};