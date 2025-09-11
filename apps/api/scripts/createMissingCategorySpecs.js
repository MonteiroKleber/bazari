// V-1: Script para criar CategorySpecs básicos para categorias sem spec (2025-01-11)
// Versão JavaScript para evitar problemas de ESM com TypeScript

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Procurando categorias sem CategorySpec...');

  // Buscar todas as categorias
  const allCategories = await prisma.category.findMany({
    select: { id: true, namePt: true, level: true, kind: true }
  });

  // Buscar todas as specs existentes
  const existingSpecs = await prisma.categorySpec.findMany({
    select: { categoryId: true }
  });

  const existingSpecIds = new Set(existingSpecs.map(s => s.categoryId));

  // Filtrar categorias sem spec
  const categoriesWithoutSpec = allCategories.filter(cat => !existingSpecIds.has(cat.id));

  console.log(`📊 Encontradas ${categoriesWithoutSpec.length} categorias sem CategorySpec:`);
  categoriesWithoutSpec.forEach(cat => {
    console.log(`   - ${cat.id} (${cat.namePt}) - Level ${cat.level}`);
  });

  if (categoriesWithoutSpec.length === 0) {
    console.log('✅ Todas as categorias já possuem CategorySpec!');
    return;
  }

  console.log('\n🛠️ Criando CategorySpecs básicos...');

  for (const category of categoriesWithoutSpec) {
    // Criar spec básico baseado no tipo e nível da categoria
    const basicSpec = createBasicSpecForCategory(category);

    await prisma.categorySpec.create({
      data: basicSpec
    });

    console.log(`✅ Spec criado para: ${category.id}`);
  }

  console.log(`\n🎉 Concluído! ${categoriesWithoutSpec.length} CategorySpecs criados.`);
}

function createBasicSpecForCategory(category) {
  // Specs básicos baseados no tipo de categoria
  const baseSpecs = {
    // Moda e Acessórios
    calcados: {
      properties: {
        tamanho: { type: "string", enum: ["33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"] },
        cor: { type: "string" },
        material: { type: "string", enum: ["Couro", "Sintético", "Tecido", "Borracha", "Outro"] },
        marca: { type: "string" },
        condicao: { type: "string", enum: ["Novo", "Usado", "Semi-novo"] }
      },
      required: ["tamanho", "cor", "condicao"]
    },
    moda: {
      properties: {
        tamanho: { type: "string" },
        cor: { type: "string" },
        material: { type: "string" },
        marca: { type: "string" },
        condicao: { type: "string", enum: ["Novo", "Usado", "Semi-novo"] }
      },
      required: ["cor", "condicao"]
    },
    // Tecnologia
    tecnologia: {
      properties: {
        marca: { type: "string" },
        modelo: { type: "string" },
        cor: { type: "string" },
        condicao: { type: "string", enum: ["Novo", "Usado", "Recondicionado"] },
        garantia: { type: "boolean" }
      },
      required: ["marca", "condicao"]
    },
    // Casa e Decoração
    casa: {
      properties: {
        material: { type: "string" },
        cor: { type: "string" },
        dimensoes: { type: "string" },
        condicao: { type: "string", enum: ["Novo", "Usado", "Antigo"] },
        marca: { type: "string" }
      },
      required: ["condicao"]
    },
    // Alimentos (mínimo)
    alimentos: {
      properties: {
        validade: { type: "string", format: "date" },
        origem: { type: "string" },
        organico: { type: "boolean" }
      },
      required: []
    },
    // Esportes
    esportes: {
      properties: {
        marca: { type: "string" },
        tamanho: { type: "string" },
        cor: { type: "string" },
        material: { type: "string" },
        condicao: { type: "string", enum: ["Novo", "Usado", "Semi-novo"] }
      },
      required: ["condicao"]
    },
    // Automotivo
    automotivo: {
      properties: {
        marca: { type: "string" },
        modelo: { type: "string" },
        ano: { type: "integer", minimum: 1950, maximum: 2030 },
        condicao: { type: "string", enum: ["Novo", "Usado", "Recondicionado"] }
      },
      required: ["condicao"]
    },
    // Beleza e Saúde
    beleza: {
      properties: {
        marca: { type: "string" },
        tipo: { type: "string" },
        validade: { type: "string", format: "date" },
        condicao: { type: "string", enum: ["Novo", "Usado", "Lacrado"] }
      },
      required: ["condicao"]
    },
    // Serviços gerais
    servicos: {
      properties: {
        duracao: { type: "string" },
        area_atendimento: { type: "string" },
        disponibilidade: { type: "string" },
        experiencia_anos: { type: "integer", minimum: 0 }
      },
      required: []
    }
  };

  // Detectar tipo de categoria baseado no ID
  let specType = 'default';
  if (category.id.includes('calcados') || category.id.includes('sandalias') || category.id.includes('tenis') || category.id.includes('sapatos')) {
    specType = 'calcados';
  } else if (category.id.includes('moda') || category.id.includes('roupas') || category.id.includes('acessorios')) {
    specType = 'moda';
  } else if (category.id.includes('tecnologia') || category.id.includes('eletronicos') || category.id.includes('celular') || category.id.includes('computador')) {
    specType = 'tecnologia';
  } else if (category.id.includes('casa') || category.id.includes('decoracao') || category.id.includes('moveis')) {
    specType = 'casa';
  } else if (category.id.includes('alimentos') || category.id.includes('bebidas') || category.id.includes('comida')) {
    specType = 'alimentos';
  } else if (category.id.includes('esporte') || category.id.includes('lazer') || category.id.includes('brinquedo')) {
    specType = 'esportes';
  } else if (category.id.includes('automotivo') || category.id.includes('pecas') || category.id.includes('pneu')) {
    specType = 'automotivo';
  } else if (category.id.includes('beleza') || category.id.includes('saude') || category.id.includes('perfume') || category.id.includes('maquiagem')) {
    specType = 'beleza';
  } else if (category.kind === 'service') {
    specType = 'servicos';
  }

  // Obter spec base ou usar padrão
  const baseSpec = baseSpecs[specType] || {
    properties: {
      descricao: { type: "string" },
      condicao: { type: "string", enum: ["Novo", "Usado", "Outro"] }
    },
    required: []
  };

  // Determinar herança baseada na hierarquia
  let inheritsFrom = null;
  const parts = category.id.split('-');
  if (parts.length > 2) {
    // Categoria de nível 3 ou 4, pode herdar do nível superior
    const parentParts = parts.slice(0, -1);
    inheritsFrom = parentParts.join('-');
  }

  return {
    categoryId: category.id,
    version: '1.0.0',
    inheritsFrom,
    jsonSchema: {
      type: 'object',
      properties: baseSpec.properties,
      required: baseSpec.required
    },
    uiSchema: {
      // UI básico para campos comuns
      condicao: { widget: 'radio' },
      tamanho: { widget: 'select' },
      marca: { widget: 'text' },
      cor: { widget: 'text' },
      descricao: { widget: 'textarea' }
    },
    indexHints: Object.keys(baseSpec.properties).slice(0, 5) // Primeiros 5 campos como index hints
  };
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });