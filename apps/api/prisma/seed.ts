// path: apps/api/prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar dados existentes (opcional)
  await prisma.product.deleteMany();
  await prisma.serviceOffering.deleteMany();
  await prisma.categorySpec.deleteMany();
  await prisma.category.deleteMany();

  // Criar categorias principais
  const categories = [
    // Produtos - Nível 1
    {
      id: 'products-alimentos-bebidas',
      slug: 'products-alimentos-bebidas',
      kind: 'product',
      level: 1,
      pathSlugs: ['products', 'alimentos-bebidas'],
      pathNamesPt: ['Produtos', 'Alimentos e Bebidas'],
      pathNamesEn: ['Products', 'Food & Drinks'],
      pathNamesEs: ['Productos', 'Alimentos y Bebidas'],
      namePt: 'Alimentos e Bebidas',
      nameEn: 'Food & Drinks',
      nameEs: 'Alimentos y Bebidas',
      active: true,
      sort: 1
    },
    {
      id: 'products-tecnologia',
      slug: 'products-tecnologia',
      kind: 'product',
      level: 1,
      pathSlugs: ['products', 'tecnologia'],
      pathNamesPt: ['Produtos', 'Tecnologia'],
      pathNamesEn: ['Products', 'Technology'],
      pathNamesEs: ['Productos', 'Tecnología'],
      namePt: 'Tecnologia',
      nameEn: 'Technology',
      nameEs: 'Tecnología',
      active: true,
      sort: 2
    },
    // Produtos - Nível 2
    {
      id: 'products-tecnologia-eletronicos',
      slug: 'products-tecnologia-eletronicos',
      parentId: 'products-tecnologia',
      kind: 'product',
      level: 2,
      pathSlugs: ['products', 'tecnologia', 'eletronicos'],
      pathNamesPt: ['Produtos', 'Tecnologia', 'Eletrônicos'],
      pathNamesEn: ['Products', 'Technology', 'Electronics'],
      pathNamesEs: ['Productos', 'Tecnología', 'Electrónicos'],
      namePt: 'Eletrônicos',
      nameEn: 'Electronics',
      nameEs: 'Electrónicos',
      active: true,
      sort: 1
    },
    // Produtos - Nível 3
    {
      id: 'products-tecnologia-eletronicos-celulares',
      slug: 'products-tecnologia-eletronicos-celulares',
      parentId: 'products-tecnologia-eletronicos',
      kind: 'product',
      level: 3,
      pathSlugs: ['products', 'tecnologia', 'eletronicos', 'celulares'],
      pathNamesPt: ['Produtos', 'Tecnologia', 'Eletrônicos', 'Celulares'],
      pathNamesEn: ['Products', 'Technology', 'Electronics', 'Smartphones'],
      pathNamesEs: ['Productos', 'Tecnología', 'Electrónicos', 'Celulares'],
      namePt: 'Celulares',
      nameEn: 'Smartphones',
      nameEs: 'Celulares',
      active: true,
      sort: 1
    },
    // Serviços - Nível 1
    {
      id: 'services-tecnologia',
      slug: 'services-tecnologia',
      kind: 'service',
      level: 1,
      pathSlugs: ['services', 'tecnologia'],
      pathNamesPt: ['Serviços', 'Tecnologia'],
      pathNamesEn: ['Services', 'Technology'],
      pathNamesEs: ['Servicios', 'Tecnología'],
      namePt: 'Tecnologia',
      nameEn: 'Technology',
      nameEs: 'Tecnología',
      active: true,
      sort: 1
    },
    {
      id: 'services-casa-reformas',
      slug: 'services-casa-reformas',
      kind: 'service',
      level: 1,
      pathSlugs: ['services', 'casa-reformas'],
      pathNamesPt: ['Serviços', 'Casa e Reformas'],
      pathNamesEn: ['Services', 'Home & Renovation'],
      pathNamesEs: ['Servicios', 'Casa y Reformas'],
      namePt: 'Casa e Reformas',
      nameEn: 'Home & Renovation',
      nameEs: 'Casa y Reformas',
      active: true,
      sort: 2
    }
  ];

  // Inserir categorias
  for (const category of categories) {
    await prisma.category.create({ data: category });
    console.log(`✅ Categoria criada: ${category.id}`);
  }

  // Criar CategorySpecs de exemplo
  const categorySpecs = [
    {
      categoryId: 'products-tecnologia-eletronicos-celulares',
      version: '1.0.0',
      jsonSchema: {
        type: 'object',
        properties: {
          marca: { type: 'string', enum: ['Apple', 'Samsung', 'Xiaomi', 'Motorola'] },
          armazenamento: { type: 'string', enum: ['64GB', '128GB', '256GB', '512GB'] },
          cor: { type: 'string' },
          condicao: { type: 'string', enum: ['Novo', 'Usado', 'Recondicionado'] }
        },
        required: ['marca', 'armazenamento', 'condicao']
      },
      uiSchema: {
        marca: { 'ui:widget': 'select', 'ui:title': 'Marca' },
        armazenamento: { 'ui:widget': 'select', 'ui:title': 'Armazenamento' },
        cor: { 'ui:widget': 'text', 'ui:title': 'Cor' },
        condicao: { 'ui:widget': 'radio', 'ui:title': 'Condição' }
      },
      indexHints: ['marca', 'armazenamento', 'condicao']
    }
  ];

  for (const spec of categorySpecs) {
    await prisma.categorySpec.create({ data: spec });
    console.log(`✅ CategorySpec criada: ${spec.categoryId}`);
  }

  // Criar alguns produtos de exemplo
  const products = [
    {
      daoId: 'dao-1',
      title: 'iPhone 15 Pro Max',
      description: 'iPhone 15 Pro Max 256GB Titanium Natural, novo, lacrado, com NF',
      priceBzr: 7999.00,
      categoryId: 'products-tecnologia-eletronicos-celulares',
      categoryPath: ['products', 'tecnologia', 'eletronicos', 'celulares'],
      attributes: {
        marca: 'Apple',
        armazenamento: '256GB',
        cor: 'Titanium Natural',
        condicao: 'Novo'
      },
      attributesSpecVersion: '1.0.0'
    },
    {
      daoId: 'dao-1',
      title: 'Samsung Galaxy S24 Ultra',
      description: 'Samsung Galaxy S24 Ultra 512GB, com S Pen, câmera de 200MP',
      priceBzr: 6499.00,
      categoryId: 'products-tecnologia-eletronicos-celulares',
      categoryPath: ['products', 'tecnologia', 'eletronicos', 'celulares'],
      attributes: {
        marca: 'Samsung',
        armazenamento: '512GB',
        cor: 'Preto',
        condicao: 'Novo'
      },
      attributesSpecVersion: '1.0.0'
    }
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
    console.log(`✅ Produto criado: ${product.title}`);
  }

  // Criar alguns serviços de exemplo
  const services = [
    {
      daoId: 'dao-2',
      title: 'Desenvolvimento de Website',
      description: 'Criação de site profissional com React, responsivo e otimizado',
      basePriceBzr: 2500.00,
      categoryId: 'services-tecnologia',
      categoryPath: ['services', 'tecnologia'],
      attributes: {
        prazo: '30 dias',
        tecnologia: 'React + Node.js',
        suporte: '6 meses'
      },
      attributesSpecVersion: '1.0.0'
    },
    {
      daoId: 'dao-3',
      title: 'Pintura Residencial',
      description: 'Serviço de pintura completa para casas e apartamentos',
      basePriceBzr: 1500.00,
      categoryId: 'services-casa-reformas',
      categoryPath: ['services', 'casa-reformas'],
      attributes: {
        tipo: 'Residencial',
        area: 'Até 100m²',
        material: 'Incluso'
      },
      attributesSpecVersion: '1.0.0'
    }
  ];

  for (const service of services) {
    await prisma.serviceOffering.create({ data: service });
    console.log(`✅ Serviço criado: ${service.title}`);
  }

  console.log('✨ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });