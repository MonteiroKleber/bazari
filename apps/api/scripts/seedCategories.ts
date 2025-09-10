import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync, existsSync } from 'fs';
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
  node: CategoryNode | any,
  kind: 'product' | 'service',
  parentPath: string[] = [],
  parentId: string | null = null,
  parentNames: { pt: string[], en: string[], es: string[] } = { pt: [], en: [], es: [] }
): any[] {
  const results: any[] = [];
  
  // Para a raiz (products/services), apenas processar filhos
  if (node.id === 'products' || node.id === 'services') {
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childResults = flattenCategories(
          child,
          kind,
          [],
          null,
          { pt: [], en: [], es: [] }
        );
        results.push(...childResults);
      }
    }
    return results;
  }
  
  const currentPath = [...parentPath, node.id];
  const currentNames = {
    pt: [...parentNames.pt, node.name_pt],
    en: [...parentNames.en, node.name_en],
    es: [...parentNames.es, node.name_es]
  };
  
  // Gerar ID concatenado para categorias
  const categoryId = `${kind}s-${currentPath.join('-')}`;
  
  // Adicionar categoria atual
  if (node.level !== undefined) {
    results.push({
      id: categoryId,
      slug: categoryId,
      parentId,
      kind,
      level: node.level,
      namePt: node.name_pt,
      nameEn: node.name_en,
      nameEs: node.name_es,
      pathSlugs: [kind + 's', ...currentPath],
      pathNamesPt: [kind === 'product' ? 'Produtos' : 'Serviços', ...currentNames.pt],
      pathNamesEn: [kind === 'product' ? 'Products' : 'Services', ...currentNames.en],
      pathNamesEs: [kind === 'product' ? 'Productos' : 'Servicios', ...currentNames.es],
      active: true,
      sort: 0
    });
  }
  
  // Processar filhos recursivamente
  if (node.children && node.children.length > 0) {
    let childSort = 0;
    for (const child of node.children) {
      const childResults = flattenCategories(
        child,
        kind,
        currentPath,
        categoryId,
        currentNames
      );
      // Atualizar sort order para filhos diretos
      if (childResults.length > 0 && childResults[0].parentId === categoryId) {
        childResults[0].sort = childSort++;
      }
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
    if (!existsSync(treePath)) {
      console.error(`❌ Arquivo não encontrado: ${treePath}`);
      return;
    }
    
    const treeData = JSON.parse(readFileSync(treePath, 'utf-8'));
    
    // 2. Achatar estrutura
    const productCategories = flattenCategories(treeData.products, 'product');
    const serviceCategories = flattenCategories(treeData.services, 'service');
    const allCategories = [...productCategories, ...serviceCategories];
    
    console.log(`📊 Total de categorias encontradas: ${allCategories.length}`);
    
    // 3. Inserir/atualizar categorias (idempotente)
    for (const category of allCategories) {
      try {
        await prisma.category.upsert({
          where: { id: category.id },
          update: {
            slug: category.slug,
            parentId: category.parentId,
            kind: category.kind,
            level: category.level,
            namePt: category.namePt,
            nameEn: category.nameEn,
            nameEs: category.nameEs,
            pathSlugs: category.pathSlugs,
            pathNamesPt: category.pathNamesPt,
            pathNamesEn: category.pathNamesEn,
            pathNamesEs: category.pathNamesEs,
            active: category.active,
            sort: category.sort
          },
          create: category
        });
        console.log(`✅ Categoria: ${category.id} (${category.kind}, L${category.level})`);
      } catch (error) {
        console.error(`❌ Erro ao criar/atualizar categoria ${category.id}:`, error);
      }
    }
    
    // 4. Ler e inserir CategorySpecs
    const specsPath = join(__dirname, '..', 'data', 'category-specs');
    if (!existsSync(specsPath)) {
      console.log(`⚠️ Pasta de specs não encontrada: ${specsPath}`);
      console.log('Criando specs básicas para categorias folha...');
      
      // Criar specs básicas para categorias folha
      const leafCategories = allCategories.filter(cat => {
        // É folha se não tem filhos
        return !allCategories.some(other => other.parentId === cat.id);
      });
      
      for (const leafCat of leafCategories) {
        const basicSpec = {
          categoryId: leafCat.id,
          version: '1.0.0',
          inheritsFrom: leafCat.parentId,
          jsonSchema: {
            type: 'object',
            properties: {
              descricao: { type: 'string' },
              condicao: { type: 'string', enum: ['Novo', 'Usado', 'Recondicionado'] }
            },
            required: ['condicao']
          },
          uiSchema: {
            descricao: { 'ui:widget': 'textarea' },
            condicao: { 'ui:widget': 'radio' }
          },
          indexHints: ['condicao']
        };
        
        await prisma.categorySpec.upsert({
          where: {
            categoryId_version: {
              categoryId: leafCat.id,
              version: '1.0.0'
            }
          },
          update: {
            jsonSchema: basicSpec.jsonSchema,
            uiSchema: basicSpec.uiSchema,
            indexHints: basicSpec.indexHints
          },
          create: basicSpec
        });
        console.log(`📝 Spec básica criada para: ${leafCat.id}`);
      }
    } else {
      const specFiles = readdirSync(specsPath).filter(f => f.endsWith('.json'));
      console.log(`📁 ${specFiles.length} arquivos de spec encontrados`);
      
      for (const specFile of specFiles) {
        try {
          const specPath = join(specsPath, specFile);
          const specData: CategorySpec = JSON.parse(readFileSync(specPath, 'utf-8'));
          
          // Ajustar categoryId se necessário (converter formato antigo)
          let categoryId = specData.categoryId;
          if (categoryId.includes('/')) {
            // Converter formato antigo (com /) para novo formato (com -)
            const parts = categoryId.split('/');
            const kind = parts[0].includes('alimento') || parts[0].includes('moda') || parts[0].includes('tecnologia') || parts[0].includes('casa') 
              ? 'products' 
              : 'services';
            categoryId = `${kind}-${parts.join('-')}`;
          }
          
          await prisma.categorySpec.upsert({
            where: {
              categoryId_version: {
                categoryId: categoryId,
                version: specData.version
              }
            },
            update: {
              inheritsFrom: specData.inheritsFrom,
              jsonSchema: specData.jsonSchema,
              uiSchema: specData.uiSchema,
              indexHints: specData.indexHints
            },
            create: {
              categoryId: categoryId,
              version: specData.version,
              inheritsFrom: specData.inheritsFrom,
              jsonSchema: specData.jsonSchema,
              uiSchema: specData.uiSchema,
              indexHints: specData.indexHints
            }
          });
          console.log(`✅ Spec: ${categoryId} v${specData.version}`);
        } catch (error) {
          console.error(`❌ Erro ao processar spec ${specFile}:`, error);
        }
      }
    }
    
    // 5. Verificar integridade
    const totalCategories = await prisma.category.count();
    const totalSpecs = await prisma.categorySpec.count();
    
    console.log('\n📊 Resumo final:');
    console.log(`  - Categorias: ${totalCategories}`);
    console.log(`  - Specs: ${totalSpecs}`);
    console.log(`  - Produtos: ${allCategories.filter(c => c.kind === 'product').length}`);
    console.log(`  - Serviços: ${allCategories.filter(c => c.kind === 'service').length}`);
    
    // Verificar distribuição por nível
    for (let level = 1; level <= 4; level++) {
      const count = await prisma.category.count({ where: { level } });
      console.log(`  - Nível ${level}: ${count} categorias`);
    }
    
    console.log('\n✨ Seed concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro geral no seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar seed
seedCategories().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});