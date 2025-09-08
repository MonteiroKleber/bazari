import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed idempotente...');

  // Categorias de produtos - Nível 1
  const productsL1 = [
    { slug: 'alimentos-bebidas', namePt: 'Alimentos e Bebidas', nameEn: 'Food & Drinks', nameEs: 'Alimentos y Bebidas' },
    { slug: 'moda-acessorios', namePt: 'Moda e Acessórios', nameEn: 'Fashion & Accessories', nameEs: 'Moda y Accesorios' },
    { slug: 'tecnologia', namePt: 'Tecnologia', nameEn: 'Technology', nameEs: 'Tecnología' },
  ];

  for (const cat of productsL1) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        level: 1,
        pathSlugs: ['products', cat.slug],
        namePt: cat.namePt,
        nameEn: cat.nameEn,
        nameEs: cat.nameEs,
      },
    });
    console.log(`✅ Categoria L1: ${cat.slug}`);
  }

  // Categorias de produtos - Nível 2
  const productsL2 = [
    {
      slug: 'comidas-frescas',
      parent: 'alimentos-bebidas',
      namePt: 'Comidas Frescas',
      nameEn: 'Fresh Foods',
      nameEs: 'Comidas Frescas',
    },
    {
      slug: 'bebidas-alcoolicas',
      parent: 'alimentos-bebidas',
      namePt: 'Bebidas Alcoólicas',
      nameEn: 'Alcoholic Drinks',
      nameEs: 'Bebidas Alcohólicas',
    },
    {
      slug: 'roupas',
      parent: 'moda-acessorios',
      namePt: 'Roupas',
      nameEn: 'Clothing',
      nameEs: 'Ropa',
    },
    {
      slug: 'eletronicos',
      parent: 'tecnologia',
      namePt: 'Eletrônicos',
      nameEn: 'Electronics',
      nameEs: 'Electrónica',
    },
  ];

  for (const cat of productsL2) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        level: 2,
        pathSlugs: ['products', cat.parent, cat.slug],
        namePt: cat.namePt,
        nameEn: cat.nameEn,
        nameEs: cat.nameEs,
      },
    });
    console.log(`✅ Categoria L2: ${cat.slug}`);
  }

  // Categorias de serviços - Nível 1
  const servicesL1 = [
    { slug: 'beleza-bem-estar', namePt: 'Beleza e Bem-estar', nameEn: 'Beauty & Wellness', nameEs: 'Belleza y Bienestar' },
    { slug: 'reparos-manutencao', namePt: 'Reparos e Manutenção', nameEn: 'Repairs & Maintenance', nameEs: 'Reparaciones y Mantenimiento' },
    { slug: 'transporte-logistica', namePt: 'Transporte e Logística', nameEn: 'Transport & Logistics', nameEs: 'Transporte y Logística' },
  ];

  for (const cat of servicesL1) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        level: 1,
        pathSlugs: ['services', cat.slug],
        namePt: cat.namePt,
        nameEn: cat.nameEn,
        nameEs: cat.nameEs,
      },
    });
    console.log(`✅ Categoria L1: ${cat.slug}`);
  }

  // Categorias de serviços - Nível 2
  const servicesL2 = [
    {
      slug: 'pessoais',
      parent: 'beleza-bem-estar',
      namePt: 'Pessoais',
      nameEn: 'Personal',
      nameEs: 'Personales',
    },
    {
      slug: 'residencial',
      parent: 'reparos-manutencao',
      namePt: 'Residencial',
      nameEn: 'Residential',
      nameEs: 'Residencial',
    },
    {
      slug: 'pessoas',
      parent: 'transporte-logistica',
      namePt: 'Pessoas',
      nameEn: 'People',
      nameEs: 'Personas',
    },
    {
      slug: 'mercadorias',
      parent: 'transporte-logistica',
      namePt: 'Mercadorias',
      nameEn: 'Goods',
      nameEs: 'Mercancías',
    },
  ];

  for (const cat of servicesL2) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        level: 2,
        pathSlugs: ['services', cat.parent, cat.slug],
        namePt: cat.namePt,
        nameEn: cat.nameEn,
        nameEs: cat.nameEs,
      },
    });
    console.log(`✅ Categoria L2: ${cat.slug}`);
  }

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });