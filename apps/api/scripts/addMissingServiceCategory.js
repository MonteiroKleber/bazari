// V-1: Script para adicionar categoria de serviços que está faltando (2025-01-11)
// Resolve erro 400 ao criar serviços na categoria casa-reformas-reformas-reforma-completa

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando categoria de serviços que está faltando...');

  const targetCategoryId = 'services-casa-reformas-reformas-reforma-completa';
  
  // Verificar se já existe
  const existing = await prisma.category.findUnique({
    where: { id: targetCategoryId }
  });

  if (existing) {
    console.log('✅ Categoria já existe:', targetCategoryId);
    return;
  }

  console.log('📝 Criando hierarquia completa de categorias de serviços...');

  // Categorias para criar (hierarquia completa)
  const categoriesToCreate = [
    // Nível 1 - Casa e Reformas
    {
      id: 'services-casa-reformas',
      slug: 'services-casa-reformas',
      parentId: null,
      kind: 'service',
      level: 1,
      pathSlugs: ['services', 'casa-reformas'],
      pathNamesPt: ['Serviços', 'Casa e Reformas'],
      pathNamesEn: ['Services', 'Home & Renovations'],
      pathNamesEs: ['Servicios', 'Casa y Reformas'],
      namePt: 'Casa e Reformas',
      nameEn: 'Home & Renovations',
      nameEs: 'Casa y Reformas',
      sort: 1,
      active: true
    },
    // Nível 2 - Reformas
    {
      id: 'services-casa-reformas-reformas',
      slug: 'services-casa-reformas-reformas',
      parentId: 'services-casa-reformas',
      kind: 'service',
      level: 2,
      pathSlugs: ['services', 'casa-reformas', 'reformas'],
      pathNamesPt: ['Serviços', 'Casa e Reformas', 'Reformas'],
      pathNamesEn: ['Services', 'Home & Renovations', 'Renovations'],
      pathNamesEs: ['Servicios', 'Casa y Reformas', 'Reformas'],
      namePt: 'Reformas',
      nameEn: 'Renovations',
      nameEs: 'Reformas',
      sort: 1,
      active: true
    },
    // Nível 3 - Reforma Completa
    {
      id: 'services-casa-reformas-reformas-reforma-completa',
      slug: 'services-casa-reformas-reformas-reforma-completa',
      parentId: 'services-casa-reformas-reformas',
      kind: 'service',
      level: 3,
      pathSlugs: ['services', 'casa-reformas', 'reformas', 'reforma-completa'],
      pathNamesPt: ['Serviços', 'Casa e Reformas', 'Reformas', 'Reforma Completa'],
      pathNamesEn: ['Services', 'Home & Renovations', 'Renovations', 'Complete Renovation'],
      pathNamesEs: ['Servicios', 'Casa y Reformas', 'Reformas', 'Reforma Completa'],
      namePt: 'Reforma Completa',
      nameEn: 'Complete Renovation',
      nameEs: 'Reforma Completa',
      sort: 1,
      active: true
    }
  ];

  // Criar cada categoria (verificando se já existe)
  for (const category of categoriesToCreate) {
    const exists = await prisma.category.findUnique({
      where: { id: category.id }
    });

    if (!exists) {
      await prisma.category.create({
        data: category
      });
      console.log(`✅ Categoria criada: ${category.id}`);
    } else {
      console.log(`⚠️ Categoria já existe: ${category.id}`);
    }
  }

  // Criar CategorySpec se não existir
  const specExists = await prisma.categorySpec.findUnique({
    where: {
      categoryId_version: {
        categoryId: targetCategoryId,
        version: '1.0.0'
      }
    }
  });

  if (!specExists) {
    const categorySpec = {
      categoryId: targetCategoryId,
      version: '1.0.0',
      inheritsFrom: 'services-casa-reformas-reformas',
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
            items: {
              type: 'string'
            }
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
        required: []  // Sem campos obrigatórios para facilitar testes
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
    };

    await prisma.categorySpec.create({
      data: categorySpec
    });

    console.log(`✅ CategorySpec criado para: ${targetCategoryId}`);
  } else {
    console.log(`⚠️ CategorySpec já existe para: ${targetCategoryId}`);
  }

  console.log('\n🎉 Categorias de serviços criadas com sucesso!');
  console.log('\n📋 Teste agora:');
  console.log('   - Categoria: ["casa-reformas", "reformas", "reforma-completa"]');
  console.log('   - Tipo: service');
  console.log('   - Deve funcionar sem erro 400!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });