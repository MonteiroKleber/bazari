// path: apps/api/prisma/seed-complete.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando categorias completas (4 níveis)...');

  // IMPORTANTE: Limpar na ordem correta (foreign keys)
  console.log('🧹 Limpando dados existentes...');
  await prisma.product.deleteMany();
  await prisma.serviceOffering.deleteMany();
  await prisma.categorySpec.deleteMany();
  await prisma.category.deleteMany();
  console.log('✅ Dados limpos');

  const categories = [
    // PRODUTOS - Alimentos - 4 níveis completos
    {
      id: 'products-alimentos',
      slug: 'products-alimentos',
      kind: 'product',
      level: 1,
      pathSlugs: ['products', 'alimentos'],
      pathNamesPt: ['Produtos', 'Alimentos e Bebidas'],
      pathNamesEn: ['Products', 'Food & Drinks'],
      pathNamesEs: ['Productos', 'Alimentos y Bebidas'],
      namePt: 'Alimentos e Bebidas',
      nameEn: 'Food & Drinks',
      nameEs: 'Alimentos y Bebidas',
      sort: 1,
      active: true
    },
    {
      id: 'products-alimentos-feira',
      slug: 'products-alimentos-feira',
      parentId: 'products-alimentos',
      kind: 'product',
      level: 2,
      pathSlugs: ['products', 'alimentos', 'feira'],
      pathNamesPt: ['Produtos', 'Alimentos e Bebidas', 'Feira e Hortifruti'],
      pathNamesEn: ['Products', 'Food & Drinks', 'Fresh Market'],
      pathNamesEs: ['Productos', 'Alimentos y Bebidas', 'Mercado Fresco'],
      namePt: 'Feira e Hortifruti',
      nameEn: 'Fresh Market',
      nameEs: 'Mercado Fresco',
      sort: 1,
      active: true
    },
    {
      id: 'products-alimentos-feira-frutas',
      slug: 'products-alimentos-feira-frutas',
      parentId: 'products-alimentos-feira',
      kind: 'product',
      level: 3,
      pathSlugs: ['products', 'alimentos', 'feira', 'frutas'],
      pathNamesPt: ['Produtos', 'Alimentos e Bebidas', 'Feira e Hortifruti', 'Frutas'],
      pathNamesEn: ['Products', 'Food & Drinks', 'Fresh Market', 'Fruits'],
      pathNamesEs: ['Productos', 'Alimentos y Bebidas', 'Mercado Fresco', 'Frutas'],
      namePt: 'Frutas',
      nameEn: 'Fruits',
      nameEs: 'Frutas',
      sort: 1,
      active: true
    },
    {
      id: 'products-alimentos-feira-frutas-tropicais',
      slug: 'products-alimentos-feira-frutas-tropicais',
      parentId: 'products-alimentos-feira-frutas',
      kind: 'product',
      level: 4,
      pathSlugs: ['products', 'alimentos', 'feira', 'frutas', 'tropicais'],
      pathNamesPt: ['Produtos', 'Alimentos e Bebidas', 'Feira e Hortifruti', 'Frutas', 'Tropicais'],
      pathNamesEn: ['Products', 'Food & Drinks', 'Fresh Market', 'Fruits', 'Tropical'],
      pathNamesEs: ['Productos', 'Alimentos y Bebidas', 'Mercado Fresco', 'Frutas', 'Tropicales'],
      namePt: 'Tropicais',
      nameEn: 'Tropical',
      nameEs: 'Tropicales',
      sort: 1,
      active: true
    },
    
    // PRODUTOS - Tecnologia - completar com 4 níveis
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
      sort: 2,
      active: true
    },
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
      sort: 1,
      active: true
    },
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
      sort: 1,
      active: true
    },
    {
      id: 'products-tecnologia-eletronicos-celulares-android',
      slug: 'products-tecnologia-eletronicos-celulares-android',
      parentId: 'products-tecnologia-eletronicos-celulares',
      kind: 'product',
      level: 4,
      pathSlugs: ['products', 'tecnologia', 'eletronicos', 'celulares', 'android'],
      pathNamesPt: ['Produtos', 'Tecnologia', 'Eletrônicos', 'Celulares', 'Android'],
      pathNamesEn: ['Products', 'Technology', 'Electronics', 'Smartphones', 'Android'],
      pathNamesEs: ['Productos', 'Tecnología', 'Electrónicos', 'Celulares', 'Android'],
      namePt: 'Android',
      nameEn: 'Android',
      nameEs: 'Android',
      sort: 1,
      active: true
    },
    {
      id: 'products-tecnologia-eletronicos-celulares-ios',
      slug: 'products-tecnologia-eletronicos-celulares-ios',
      parentId: 'products-tecnologia-eletronicos-celulares',
      kind: 'product',
      level: 4,
      pathSlugs: ['products', 'tecnologia', 'eletronicos', 'celulares', 'ios'],
      pathNamesPt: ['Produtos', 'Tecnologia', 'Eletrônicos', 'Celulares', 'iOS'],
      pathNamesEn: ['Products', 'Technology', 'Electronics', 'Smartphones', 'iOS'],
      pathNamesEs: ['Productos', 'Tecnología', 'Electrónicos', 'Celulares', 'iOS'],
      namePt: 'iOS',
      nameEn: 'iOS',
      nameEs: 'iOS',
      sort: 2,
      active: true
    },

    // SERVIÇOS - Casa e Reformas - 4 níveis
    {
      id: 'services-casa',
      slug: 'services-casa',
      kind: 'service',
      level: 1,
      pathSlugs: ['services', 'casa'],
      pathNamesPt: ['Serviços', 'Casa e Reformas'],
      pathNamesEn: ['Services', 'Home & Renovation'],
      pathNamesEs: ['Servicios', 'Casa y Reformas'],
      namePt: 'Casa e Reformas',
      nameEn: 'Home & Renovation',
      nameEs: 'Casa y Reformas',
      sort: 1,
      active: true
    },
    {
      id: 'services-casa-pintura',
      slug: 'services-casa-pintura',
      parentId: 'services-casa',
      kind: 'service',
      level: 2,
      pathSlugs: ['services', 'casa', 'pintura'],
      pathNamesPt: ['Serviços', 'Casa e Reformas', 'Pintura'],
      pathNamesEn: ['Services', 'Home & Renovation', 'Painting'],
      pathNamesEs: ['Servicios', 'Casa y Reformas', 'Pintura'],
      namePt: 'Pintura',
      nameEn: 'Painting',
      nameEs: 'Pintura',
      sort: 1,
      active: true
    },
    {
      id: 'services-casa-pintura-residencial',
      slug: 'services-casa-pintura-residencial',
      parentId: 'services-casa-pintura',
      kind: 'service',
      level: 3,
      pathSlugs: ['services', 'casa', 'pintura', 'residencial'],
      pathNamesPt: ['Serviços', 'Casa e Reformas', 'Pintura', 'Residencial'],
      pathNamesEn: ['Services', 'Home & Renovation', 'Painting', 'Residential'],
      pathNamesEs: ['Servicios', 'Casa y Reformas', 'Pintura', 'Residencial'],
      namePt: 'Residencial',
      nameEn: 'Residential',
      nameEs: 'Residencial',
      sort: 1,
      active: true
    },
    {
      id: 'services-casa-pintura-residencial-apartamento',
      slug: 'services-casa-pintura-residencial-apartamento',
      parentId: 'services-casa-pintura-residencial',
      kind: 'service',
      level: 4,
      pathSlugs: ['services', 'casa', 'pintura', 'residencial', 'apartamento'],
      pathNamesPt: ['Serviços', 'Casa e Reformas', 'Pintura', 'Residencial', 'Apartamento'],
      pathNamesEn: ['Services', 'Home & Renovation', 'Painting', 'Residential', 'Apartment'],
      pathNamesEs: ['Servicios', 'Casa y Reformas', 'Pintura', 'Residencial', 'Apartamento'],
      namePt: 'Apartamento',
      nameEn: 'Apartment',
      nameEs: 'Apartamento',
      sort: 1,
      active: true
    },
    
    // SERVIÇOS - Tecnologia - 4 níveis
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
      sort: 2,
      active: true
    },
    {
      id: 'services-tecnologia-desenvolvimento',
      slug: 'services-tecnologia-desenvolvimento',
      parentId: 'services-tecnologia',
      kind: 'service',
      level: 2,
      pathSlugs: ['services', 'tecnologia', 'desenvolvimento'],
      pathNamesPt: ['Serviços', 'Tecnologia', 'Desenvolvimento'],
      pathNamesEn: ['Services', 'Technology', 'Development'],
      pathNamesEs: ['Servicios', 'Tecnología', 'Desarrollo'],
      namePt: 'Desenvolvimento',
      nameEn: 'Development',
      nameEs: 'Desarrollo',
      sort: 1,
      active: true
    },
    {
      id: 'services-tecnologia-desenvolvimento-web',
      slug: 'services-tecnologia-desenvolvimento-web',
      parentId: 'services-tecnologia-desenvolvimento',
      kind: 'service',
      level: 3,
      pathSlugs: ['services', 'tecnologia', 'desenvolvimento', 'web'],
      pathNamesPt: ['Serviços', 'Tecnologia', 'Desenvolvimento', 'Web'],
      pathNamesEn: ['Services', 'Technology', 'Development', 'Web'],
      pathNamesEs: ['Servicios', 'Tecnología', 'Desarrollo', 'Web'],
      namePt: 'Web',
      nameEn: 'Web',
      nameEs: 'Web',
      sort: 1,
      active: true
    },
    {
      id: 'services-tecnologia-desenvolvimento-web-ecommerce',
      slug: 'services-tecnologia-desenvolvimento-web-ecommerce',
      parentId: 'services-tecnologia-desenvolvimento-web',
      kind: 'service',
      level: 4,
      pathSlugs: ['services', 'tecnologia', 'desenvolvimento', 'web', 'ecommerce'],
      pathNamesPt: ['Serviços', 'Tecnologia', 'Desenvolvimento', 'Web', 'E-commerce'],
      pathNamesEn: ['Services', 'Technology', 'Development', 'Web', 'E-commerce'],
      pathNamesEs: ['Servicios', 'Tecnología', 'Desarrollo', 'Web', 'E-commerce'],
      namePt: 'E-commerce',
      nameEn: 'E-commerce',
      nameEs: 'E-commerce',
      sort: 1,
      active: true
    },
  ];

  // Inserir todas as categorias
  for (const cat of categories) {
    await prisma.category.create({ data: cat });
    console.log(`✅ ${cat.namePt} (nível ${cat.level})`);
  }

  // Recriar alguns produtos e serviços de exemplo
  const products = [
    {
      daoId: 'dao-1',
      title: 'iPhone 15 Pro Max',
      description: 'iPhone 15 Pro Max 256GB',
      priceBzr: 7999.00,
      categoryId: 'products-tecnologia-eletronicos-celulares-ios',
      categoryPath: ['products', 'tecnologia', 'eletronicos', 'celulares', 'ios'],
      attributes: { marca: 'Apple', armazenamento: '256GB' },
      attributesSpecVersion: '1.0.0'
    },
    {
      daoId: 'dao-1',
      title: 'Samsung Galaxy S24',
      description: 'Samsung Galaxy S24 Ultra',
      priceBzr: 6499.00,
      categoryId: 'products-tecnologia-eletronicos-celulares-android',
      categoryPath: ['products', 'tecnologia', 'eletronicos', 'celulares', 'android'],
      attributes: { marca: 'Samsung', armazenamento: '512GB' },
      attributesSpecVersion: '1.0.0'
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
    console.log(`📦 Produto: ${product.title}`);
  }

  console.log(`\n✨ Total: ${categories.length} categorias criadas!`);
  console.log('📊 Hierarquia: 4 níveis completos para produtos e serviços');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });