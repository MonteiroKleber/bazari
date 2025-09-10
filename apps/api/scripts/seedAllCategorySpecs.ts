import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Lendo TODOS os arquivos de category-specs...');
  
  // Limpar specs antigas
  await prisma.categorySpec.deleteMany();
  console.log('🧹 Specs antigas removidas');

  // Caminho da pasta de specs
  const specsPath = join(__dirname, '..', 'data', 'category-specs');
  
  try {
    // Ler todos os arquivos .json da pasta
    const files = readdirSync(specsPath).filter(f => f.endsWith('.json'));
    console.log(`📁 Encontrados ${files.length} arquivos de spec`);

    for (const file of files) {
      try {
        const filePath = join(specsPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const spec = JSON.parse(content);
        
        // Ajustar categoryId se necessário (converter formato antigo com / para -)
        let categoryId = spec.categoryId;
        if (categoryId.includes('/')) {
          categoryId = categoryId.replace(/\//g, '-');
        }
        
        // Adicionar prefixo se necessário
        if (!categoryId.startsWith('products-') && !categoryId.startsWith('services-')) {
          // Inferir tipo baseado no conteúdo
          if (categoryId.includes('tecnologia') || categoryId.includes('alimentos') || 
              categoryId.includes('moda') || categoryId.includes('casa-decoracao')) {
            categoryId = `products-${categoryId}`;
          } else {
            categoryId = `services-${categoryId}`;
          }
        }

        // Inserir no banco
        await prisma.categorySpec.create({
          data: {
            categoryId: categoryId,
            version: spec.version || '1.0.0',
            inheritsFrom: spec.inheritsFrom || null,
            jsonSchema: spec.jsonSchema,
            uiSchema: spec.uiSchema || {},
            indexHints: spec.indexHints || []
          }
        });
        
        console.log(`✅ Spec inserida: ${categoryId} (de ${file})`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${file}:`, error);
      }
    }

    const total = await prisma.categorySpec.count();
    console.log(`\n✨ Total de specs no banco: ${total}`);
    
  } catch (error) {
    console.error('❌ Erro ao ler pasta de specs:', error);
    console.log('Pasta esperada:', specsPath);
  }
}

main()
  .catch((e) => {
    console.error('💥 Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });