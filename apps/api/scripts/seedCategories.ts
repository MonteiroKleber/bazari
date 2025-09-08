import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

interface CategoryNode {
  id: string;
  name_pt: string;
  name_en: string;
  name_es: string;
  level?: number;
  children?: CategoryNode[];
}

interface CategorySpec {
  categoryId: string;
  version: string;
  inheritsFrom?: string;
  jsonSchema: any;
  uiSchema: any;
  indexHints: string[];
}

function flattenCategories(
  node: CategoryNode,
  kind: 'product' | 'service',
  parentPath: string[] = [],
  parentId: string | null = null
): any[] {
  const results: any[] = [];
  const currentPath = [...parentPath, node.id];
  
  // Só adiciona se tiver level definido (ignora raiz products/services)
  if (node.level !== undefined) {
    const categoryId = currentPath.join('-');
    results.push({
      id: categoryId,
      slug: categoryId, // USAR O ID COMPLETO COMO SLUG
      parentId,
      kind,
      level: node.level,
      namePt: node.name_pt,
      nameEn: node.name_en,
      nameEs: node.name_es,
      pathSlugs: currentPath,
      pathNamesPt: [...parentPath.map(p => ''), node.name_pt],
      pathNamesEn: [...parentPath.map(p => ''), node.name_en],
      pathNamesEs: [...parentPath.map(p => ''), node.name_es],
      active: true,
      sort: 0
    });
  }
  
  // Processar filhos
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childResults = flattenCategories(
        child,
        kind,
        currentPath,
        node.level !== undefined ? currentPath.join('-') : null
      );
      results.push(...childResults);
    }
  }
  
  return results;
}

async function seedCategories() {
  console.log('🌱 Iniciando seed de categorias e specs...');
  
  try {
    // 1. Ler árvore de categorias
    const treePath = join(__dirname, '..', 'data', 'categories.tree.json');
    const treeData = JSON.parse(readFileSync(treePath, 'utf-8'));
    
    // 2. Achatar estrutura
    const productCategories = flattenCategories(treeData.products, 'product');
    const serviceCategories = flattenCategories(treeData.services, 'service');
    const allCategories = [...productCategories, ...serviceCategories];
    
    // 3. Inserir/atualizar categorias (idempotente)
    for (const category of allCategories) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: {
          slug: category.slug,
          namePt: category.namePt,
          nameEn: category.nameEn,
          nameEs: category.nameEs,
          active: category.active,
          sort: category.sort
        },
        create: category
      });
      console.log(`✅ Categoria: ${category.id} (${category.kind}, L${category.level})`);
    }
    
    // 4. Ler e inserir CategorySpecs
    const specsDir = join(__dirname, '..', 'data', 'category-specs');
    const specFiles = readdirSync(specsDir).filter(f => f.endsWith('.json'));
    
    for (const file of specFiles) {
      const specPath = join(specsDir, file);
      const spec: CategorySpec = JSON.parse(readFileSync(specPath, 'utf-8'));
      
      // Ajustar categoryId para match com o novo formato
      const adjustedCategoryId = spec.categoryId.replace(/\//g, '-');
      const fullCategoryId = adjustedCategoryId.includes('products-') || adjustedCategoryId.includes('services-') 
        ? adjustedCategoryId 
        : `products-${adjustedCategoryId}`;
      
      await prisma.categorySpec.upsert({
        where: {
          categoryId_version: {
            categoryId: fullCategoryId,
            version: spec.version
          }
        },
        update: {
          inheritsFrom: spec.inheritsFrom ? spec.inheritsFrom.replace(/\//g, '-') : null,
          jsonSchema: spec.jsonSchema,
          uiSchema: spec.uiSchema,
          indexHints: spec.indexHints
        },
        create: {
          categoryId: fullCategoryId,
          version: spec.version,
          inheritsFrom: spec.inheritsFrom ? spec.inheritsFrom.replace(/\//g, '-') : null,
          jsonSchema: spec.jsonSchema,
          uiSchema: spec.uiSchema,
          indexHints: spec.indexHints
        }
      });
      console.log(`✅ CategorySpec: ${fullCategoryId} v${spec.version}`);
    }
    
    // 5. Estatísticas
    const totalCategories = await prisma.category.count();
    const totalSpecs = await prisma.categorySpec.count();
    
    console.log('\n📊 Seed concluído com sucesso:');
    console.log(`   • ${totalCategories} categorias`);
    console.log(`   • ${totalSpecs} especificações`);
    
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se for o arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCategories().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default seedCategories;