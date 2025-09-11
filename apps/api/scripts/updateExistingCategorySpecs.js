// V-1: Script para atualizar CategorySpecs existentes (2025-01-11)
// Atualiza specs que já existem no banco com novas configurações

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Atualizando CategorySpecs existentes...');

  // Lista de specs para atualizar/criar
  const specsToUpdate = [
    {
      categoryId: 'services-casa-reformas-reformas-reforma-completa',
      version: '1.0.0',
      inheritsFrom: null, // Remover herança para evitar problemas
      jsonSchema: {
        type: 'object',
        properties: {
          tipo_reforma: {
            type: 'string',
            enum: ['Residencial', 'Comercial', 'Industrial']
          },
          area_m2: {
            type: 'number',
            minimum: 1
          },
          prazo_dias: {
            type: 'integer', 
            minimum: 1
          },
          material_incluso: {
            type: 'boolean'
          },
          mao_obra_inclusa: {
            type: 'boolean'
          },
          experiencia_anos: {
            type: 'integer',
            minimum: 0
          },
          area_atendimento: {
            type: 'array',
            items: { type: 'string' }
          },
          disponibilidade: {
            type: 'string',
            enum: ['Segunda a Sexta', 'Fins de Semana', 'Todos os dias']
          },
          garantia_meses: {
            type: 'integer',
            minimum: 0,
            maximum: 60
          },
          orcamento_gratuito: {
            type: 'boolean'
          }
        },
        required: [] // Sem campos obrigatórios para facilitar testes
      },
      uiSchema: {
        tipo_reforma: { widget: 'radio' },
        area_m2: { widget: 'number', suffix: 'm²' },
        prazo_dias: { widget: 'number', suffix: 'dias' },
        material_incluso: { widget: 'checkbox' },
        mao_obra_inclusa: { widget: 'checkbox' },
        experiencia_anos: { widget: 'number', suffix: 'anos' },
        area_atendimento: { widget: 'chips' },
        disponibilidade: { widget: 'radio' },
        garantia_meses: { widget: 'number', suffix: 'meses' },
        orcamento_gratuito: { widget: 'checkbox' }
      },
      indexHints: ['tipo_reforma', 'area_m2', 'material_incluso', 'mao_obra_inclusa', 'experiencia_anos']
    },
    
    // Adicionar outros specs que precisam de atualização
    {
      categoryId: 'products-moda-acessorios-calcados-sandalias-chinelos',
      version: '1.0.0',
      inheritsFrom: null,
      jsonSchema: {
        type: 'object',
        properties: {
          tamanho: {
            type: 'string',
            enum: ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
          },
          cor: { type: 'string' },
          tipo: {
            type: 'string',
            enum: ['Sandália', 'Chinelo', 'Papete', 'Rasteirinha', 'Slide']
          },
          marca: { type: 'string' },
          condicao: {
            type: 'string',
            enum: ['Novo', 'Usado', 'Semi-novo']
          },
          material: {
            type: 'string',
            enum: ['Couro', 'Sintético', 'Borracha', 'EVA', 'Tecido']
          },
          genero: {
            type: 'string',
            enum: ['Masculino', 'Feminino', 'Unissex', 'Infantil']
          }
        },
        required: [] // Sem campos obrigatórios para facilitar testes
      },
      uiSchema: {
        tamanho: { widget: 'select' },
        tipo: { widget: 'radio' },
        condicao: { widget: 'radio' },
        material: { widget: 'select' },
        genero: { widget: 'radio' }
      },
      indexHints: ['tamanho', 'cor', 'tipo', 'marca', 'condicao', 'material', 'genero']
    }
  ];

  let updatedCount = 0;
  let createdCount = 0;

  for (const spec of specsToUpdate) {
    console.log(`\n🔍 Processando: ${spec.categoryId}`);

    try {
      // Verificar se a categoria existe
      const categoryExists = await prisma.category.findUnique({
        where: { id: spec.categoryId },
        select: { id: true, namePt: true }
      });

      if (!categoryExists) {
        console.log(`   ⚠️ Categoria não encontrada: ${spec.categoryId}`);
        continue;
      }

      // Tentar atualizar spec existente
      const existing = await prisma.categorySpec.findUnique({
        where: {
          categoryId_version: {
            categoryId: spec.categoryId,
            version: spec.version
          }
        }
      });

      if (existing) {
        // Atualizar spec existente
        await prisma.categorySpec.update({
          where: {
            categoryId_version: {
              categoryId: spec.categoryId,
              version: spec.version
            }
          },
          data: {
            inheritsFrom: spec.inheritsFrom,
            jsonSchema: spec.jsonSchema,
            uiSchema: spec.uiSchema,
            indexHints: spec.indexHints
          }
        });
        
        console.log(`   ✅ CategorySpec ATUALIZADO: ${spec.categoryId}`);
        updatedCount++;
      } else {
        // Criar novo spec
        await prisma.categorySpec.create({
          data: spec
        });
        
        console.log(`   ✅ CategorySpec CRIADO: ${spec.categoryId}`);
        createdCount++;
      }

    } catch (error) {
      console.log(`   ❌ Erro ao processar ${spec.categoryId}:`, error.message);
    }
  }

  // Verificar specs órfãos (sem categoria)
  console.log('\n🔍 Verificando specs órfãos...');
  
  const allSpecs = await prisma.categorySpec.findMany({
    select: { categoryId: true }
  });

  const allCategories = await prisma.category.findMany({
    select: { id: true }
  });

  const categoryIds = new Set(allCategories.map(c => c.id));
  const orphanSpecs = allSpecs.filter(s => !categoryIds.has(s.categoryId));

  if (orphanSpecs.length > 0) {
    console.log(`⚠️ Encontrados ${orphanSpecs.length} specs órfãos:`);
    orphanSpecs.forEach(spec => {
      console.log(`   - ${spec.categoryId} (categoria não existe)`);
    });
  } else {
    console.log('✅ Nenhum spec órfão encontrado');
  }

  // Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA ATUALIZAÇÃO');
  console.log('='.repeat(50));
  console.log(`✅ CategorySpecs atualizados: ${updatedCount}`);
  console.log(`🆕 CategorySpecs criados: ${createdCount}`);
  console.log(`⚠️ Specs órfãos: ${orphanSpecs.length}`);
  console.log('\n🎉 Atualização concluída!');
  
  if (updatedCount > 0 || createdCount > 0) {
    console.log('\n🔄 Reinicie a API para aplicar as mudanças:');
    console.log('   cd apps/api && pnpm dev');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });