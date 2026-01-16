// seed-marketplace.ts - Seed completo para marketplace Bazari
// Gerado em partes incrementais
// Parte 1: Estrutura base + Produtos (Alimentos, Animais, Arte, Automotivo, Bebês)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para criar categoria
function cat(
  id: string,
  kind: 'product' | 'service',
  level: number,
  pathSlugs: string[],
  namePt: string,
  nameEn: string,
  nameEs: string,
  parentId?: string,
  sort: number = 1
) {
  return {
    id,
    slug: id,
    kind,
    level,
    pathSlugs,
    pathNamesPt: [] as string[], // Preenchido depois
    pathNamesEn: [] as string[],
    pathNamesEs: [] as string[],
    namePt,
    nameEn,
    nameEs,
    parentId: parentId || null,
    sort,
    active: true,
  };
}

const categories: ReturnType<typeof cat>[] = [
  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: ALIMENTOS E BEBIDAS
  // ═══════════════════════════════════════════════════════════════════
  cat('products-alimentos', 'product', 1, ['products', 'alimentos'],
      'Alimentos e Bebidas', 'Food & Beverages', 'Alimentos y Bebidas', undefined, 1),

  // L2: Alimentos
  cat('products-alimentos-feira', 'product', 2, ['products', 'alimentos', 'feira'],
      'Feira e Hortifruti', 'Fresh Market', 'Mercado Fresco', 'products-alimentos', 1),
  cat('products-alimentos-mercearia', 'product', 2, ['products', 'alimentos', 'mercearia'],
      'Mercearia', 'Grocery', 'Abarrotes', 'products-alimentos', 2),
  cat('products-alimentos-bebidas', 'product', 2, ['products', 'alimentos', 'bebidas'],
      'Bebidas', 'Beverages', 'Bebidas', 'products-alimentos', 3),
  cat('products-alimentos-congelados', 'product', 2, ['products', 'alimentos', 'congelados'],
      'Congelados', 'Frozen Foods', 'Congelados', 'products-alimentos', 4),
  cat('products-alimentos-padaria', 'product', 2, ['products', 'alimentos', 'padaria'],
      'Padaria e Confeitaria', 'Bakery & Pastry', 'Panadería y Pastelería', 'products-alimentos', 5),

  // L3: Feira
  cat('products-alimentos-feira-frutas', 'product', 3, ['products', 'alimentos', 'feira', 'frutas'],
      'Frutas', 'Fruits', 'Frutas', 'products-alimentos-feira', 1),
  cat('products-alimentos-feira-legumes', 'product', 3, ['products', 'alimentos', 'feira', 'legumes'],
      'Legumes e Verduras', 'Vegetables', 'Verduras y Legumbres', 'products-alimentos-feira', 2),
  cat('products-alimentos-feira-organicos', 'product', 3, ['products', 'alimentos', 'feira', 'organicos'],
      'Orgânicos', 'Organic', 'Orgánicos', 'products-alimentos-feira', 3),

  // L4: Frutas
  cat('products-alimentos-feira-frutas-tropicais', 'product', 4, ['products', 'alimentos', 'feira', 'frutas', 'tropicais'],
      'Tropicais', 'Tropical', 'Tropicales', 'products-alimentos-feira-frutas', 1),
  cat('products-alimentos-feira-frutas-citricas', 'product', 4, ['products', 'alimentos', 'feira', 'frutas', 'citricas'],
      'Cítricas', 'Citrus', 'Cítricos', 'products-alimentos-feira-frutas', 2),
  cat('products-alimentos-feira-frutas-vermelhas', 'product', 4, ['products', 'alimentos', 'feira', 'frutas', 'vermelhas'],
      'Vermelhas', 'Berries', 'Frutos Rojos', 'products-alimentos-feira-frutas', 3),

  // L3: Bebidas
  cat('products-alimentos-bebidas-alcoolicas', 'product', 3, ['products', 'alimentos', 'bebidas', 'alcoolicas'],
      'Alcoólicas', 'Alcoholic', 'Alcohólicas', 'products-alimentos-bebidas', 1),
  cat('products-alimentos-bebidas-nao-alcoolicas', 'product', 3, ['products', 'alimentos', 'bebidas', 'nao-alcoolicas'],
      'Não Alcoólicas', 'Non-Alcoholic', 'Sin Alcohol', 'products-alimentos-bebidas', 2),
  cat('products-alimentos-bebidas-quentes', 'product', 3, ['products', 'alimentos', 'bebidas', 'quentes'],
      'Quentes', 'Hot Beverages', 'Calientes', 'products-alimentos-bebidas', 3),

  // L4: Bebidas Alcoólicas
  cat('products-alimentos-bebidas-alcoolicas-cervejas', 'product', 4, ['products', 'alimentos', 'bebidas', 'alcoolicas', 'cervejas'],
      'Cervejas', 'Beers', 'Cervezas', 'products-alimentos-bebidas-alcoolicas', 1),
  cat('products-alimentos-bebidas-alcoolicas-vinhos', 'product', 4, ['products', 'alimentos', 'bebidas', 'alcoolicas', 'vinhos'],
      'Vinhos', 'Wines', 'Vinos', 'products-alimentos-bebidas-alcoolicas', 2),
  cat('products-alimentos-bebidas-alcoolicas-destilados', 'product', 4, ['products', 'alimentos', 'bebidas', 'alcoolicas', 'destilados'],
      'Destilados', 'Spirits', 'Destilados', 'products-alimentos-bebidas-alcoolicas', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: ANIMAIS E PET SHOP
  // ═══════════════════════════════════════════════════════════════════
  cat('products-animais', 'product', 1, ['products', 'animais'],
      'Animais e Pet Shop', 'Pets & Pet Shop', 'Mascotas y Pet Shop', undefined, 2),

  // L2: Animais
  cat('products-animais-racoes', 'product', 2, ['products', 'animais', 'racoes'],
      'Rações e Alimentos', 'Pet Food', 'Alimentos para Mascotas', 'products-animais', 1),
  cat('products-animais-acessorios', 'product', 2, ['products', 'animais', 'acessorios'],
      'Acessórios', 'Accessories', 'Accesorios', 'products-animais', 2),
  cat('products-animais-higiene', 'product', 2, ['products', 'animais', 'higiene'],
      'Higiene e Limpeza', 'Hygiene & Cleaning', 'Higiene y Limpieza', 'products-animais', 3),
  cat('products-animais-brinquedos', 'product', 2, ['products', 'animais', 'brinquedos'],
      'Brinquedos', 'Toys', 'Juguetes', 'products-animais', 4),

  // L3: Rações
  cat('products-animais-racoes-caes', 'product', 3, ['products', 'animais', 'racoes', 'caes'],
      'Para Cães', 'Dog Food', 'Para Perros', 'products-animais-racoes', 1),
  cat('products-animais-racoes-gatos', 'product', 3, ['products', 'animais', 'racoes', 'gatos'],
      'Para Gatos', 'Cat Food', 'Para Gatos', 'products-animais-racoes', 2),
  cat('products-animais-racoes-aves', 'product', 3, ['products', 'animais', 'racoes', 'aves'],
      'Para Aves', 'Bird Food', 'Para Aves', 'products-animais-racoes', 3),
  cat('products-animais-racoes-peixes', 'product', 3, ['products', 'animais', 'racoes', 'peixes'],
      'Para Peixes', 'Fish Food', 'Para Peces', 'products-animais-racoes', 4),

  // L4: Rações Cães
  cat('products-animais-racoes-caes-filhotes', 'product', 4, ['products', 'animais', 'racoes', 'caes', 'filhotes'],
      'Filhotes', 'Puppies', 'Cachorros', 'products-animais-racoes-caes', 1),
  cat('products-animais-racoes-caes-adultos', 'product', 4, ['products', 'animais', 'racoes', 'caes', 'adultos'],
      'Adultos', 'Adults', 'Adultos', 'products-animais-racoes-caes', 2),
  cat('products-animais-racoes-caes-senior', 'product', 4, ['products', 'animais', 'racoes', 'caes', 'senior'],
      'Sênior', 'Senior', 'Senior', 'products-animais-racoes-caes', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: ARTE E ARTESANATO
  // ═══════════════════════════════════════════════════════════════════
  cat('products-arte', 'product', 1, ['products', 'arte'],
      'Arte e Artesanato', 'Art & Crafts', 'Arte y Artesanía', undefined, 3),

  // L2: Arte
  cat('products-arte-pinturas', 'product', 2, ['products', 'arte', 'pinturas'],
      'Pinturas e Quadros', 'Paintings & Frames', 'Pinturas y Cuadros', 'products-arte', 1),
  cat('products-arte-esculturas', 'product', 2, ['products', 'arte', 'esculturas'],
      'Esculturas', 'Sculptures', 'Esculturas', 'products-arte', 2),
  cat('products-arte-artesanato', 'product', 2, ['products', 'arte', 'artesanato'],
      'Artesanato', 'Handicrafts', 'Artesanía', 'products-arte', 3),
  cat('products-arte-materiais', 'product', 2, ['products', 'arte', 'materiais'],
      'Materiais Artísticos', 'Art Supplies', 'Materiales Artísticos', 'products-arte', 4),

  // L3: Artesanato
  cat('products-arte-artesanato-madeira', 'product', 3, ['products', 'arte', 'artesanato', 'madeira'],
      'Em Madeira', 'Woodwork', 'En Madera', 'products-arte-artesanato', 1),
  cat('products-arte-artesanato-ceramica', 'product', 3, ['products', 'arte', 'artesanato', 'ceramica'],
      'Cerâmica', 'Ceramics', 'Cerámica', 'products-arte-artesanato', 2),
  cat('products-arte-artesanato-tecido', 'product', 3, ['products', 'arte', 'artesanato', 'tecido'],
      'Em Tecido', 'Fabric Crafts', 'En Tela', 'products-arte-artesanato', 3),
  cat('products-arte-artesanato-joias', 'product', 3, ['products', 'arte', 'artesanato', 'joias'],
      'Joias Artesanais', 'Handmade Jewelry', 'Joyería Artesanal', 'products-arte-artesanato', 4),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: AUTOMOTIVO
  // ═══════════════════════════════════════════════════════════════════
  cat('products-automotivo', 'product', 1, ['products', 'automotivo'],
      'Automotivo', 'Automotive', 'Automotriz', undefined, 4),

  // L2: Automotivo
  cat('products-automotivo-carros', 'product', 2, ['products', 'automotivo', 'carros'],
      'Carros', 'Cars', 'Autos', 'products-automotivo', 1),
  cat('products-automotivo-motos', 'product', 2, ['products', 'automotivo', 'motos'],
      'Motos', 'Motorcycles', 'Motos', 'products-automotivo', 2),
  cat('products-automotivo-pecas', 'product', 2, ['products', 'automotivo', 'pecas'],
      'Peças e Acessórios', 'Parts & Accessories', 'Piezas y Accesorios', 'products-automotivo', 3),
  cat('products-automotivo-pneus', 'product', 2, ['products', 'automotivo', 'pneus'],
      'Pneus e Rodas', 'Tires & Wheels', 'Neumáticos y Ruedas', 'products-automotivo', 4),
  cat('products-automotivo-som', 'product', 2, ['products', 'automotivo', 'som'],
      'Som e Multimídia', 'Audio & Multimedia', 'Audio y Multimedia', 'products-automotivo', 5),

  // L3: Carros
  cat('products-automotivo-carros-sedan', 'product', 3, ['products', 'automotivo', 'carros', 'sedan'],
      'Sedans', 'Sedans', 'Sedanes', 'products-automotivo-carros', 1),
  cat('products-automotivo-carros-hatch', 'product', 3, ['products', 'automotivo', 'carros', 'hatch'],
      'Hatchbacks', 'Hatchbacks', 'Hatchbacks', 'products-automotivo-carros', 2),
  cat('products-automotivo-carros-suv', 'product', 3, ['products', 'automotivo', 'carros', 'suv'],
      'SUVs e Crossovers', 'SUVs & Crossovers', 'SUVs y Crossovers', 'products-automotivo-carros', 3),
  cat('products-automotivo-carros-pickup', 'product', 3, ['products', 'automotivo', 'carros', 'pickup'],
      'Picapes', 'Pickup Trucks', 'Camionetas', 'products-automotivo-carros', 4),
  cat('products-automotivo-carros-luxo', 'product', 3, ['products', 'automotivo', 'carros', 'luxo'],
      'Luxo e Esportivos', 'Luxury & Sports', 'Lujo y Deportivos', 'products-automotivo-carros', 5),

  // L4: Carros por combustível
  cat('products-automotivo-carros-sedan-flex', 'product', 4, ['products', 'automotivo', 'carros', 'sedan', 'flex'],
      'Flex', 'Flex Fuel', 'Flex', 'products-automotivo-carros-sedan', 1),
  cat('products-automotivo-carros-sedan-eletrico', 'product', 4, ['products', 'automotivo', 'carros', 'sedan', 'eletrico'],
      'Elétrico', 'Electric', 'Eléctrico', 'products-automotivo-carros-sedan', 2),
  cat('products-automotivo-carros-sedan-hibrido', 'product', 4, ['products', 'automotivo', 'carros', 'sedan', 'hibrido'],
      'Híbrido', 'Hybrid', 'Híbrido', 'products-automotivo-carros-sedan', 3),

  // L3: Motos
  cat('products-automotivo-motos-street', 'product', 3, ['products', 'automotivo', 'motos', 'street'],
      'Street', 'Street', 'Street', 'products-automotivo-motos', 1),
  cat('products-automotivo-motos-esportivas', 'product', 3, ['products', 'automotivo', 'motos', 'esportivas'],
      'Esportivas', 'Sport', 'Deportivas', 'products-automotivo-motos', 2),
  cat('products-automotivo-motos-trail', 'product', 3, ['products', 'automotivo', 'motos', 'trail'],
      'Trail e Off-Road', 'Trail & Off-Road', 'Trail y Off-Road', 'products-automotivo-motos', 3),
  cat('products-automotivo-motos-scooters', 'product', 3, ['products', 'automotivo', 'motos', 'scooters'],
      'Scooters', 'Scooters', 'Scooters', 'products-automotivo-motos', 4),

  // L3: Peças
  cat('products-automotivo-pecas-motor', 'product', 3, ['products', 'automotivo', 'pecas', 'motor'],
      'Motor', 'Engine', 'Motor', 'products-automotivo-pecas', 1),
  cat('products-automotivo-pecas-freios', 'product', 3, ['products', 'automotivo', 'pecas', 'freios'],
      'Freios', 'Brakes', 'Frenos', 'products-automotivo-pecas', 2),
  cat('products-automotivo-pecas-suspensao', 'product', 3, ['products', 'automotivo', 'pecas', 'suspensao'],
      'Suspensão', 'Suspension', 'Suspensión', 'products-automotivo-pecas', 3),
  cat('products-automotivo-pecas-eletrica', 'product', 3, ['products', 'automotivo', 'pecas', 'eletrica'],
      'Elétrica', 'Electrical', 'Eléctrica', 'products-automotivo-pecas', 4),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: BEBÊS E CRIANÇAS
  // ═══════════════════════════════════════════════════════════════════
  cat('products-bebes', 'product', 1, ['products', 'bebes'],
      'Bebês e Crianças', 'Baby & Kids', 'Bebés y Niños', undefined, 5),

  // L2: Bebês
  cat('products-bebes-roupas', 'product', 2, ['products', 'bebes', 'roupas'],
      'Roupas', 'Clothing', 'Ropa', 'products-bebes', 1),
  cat('products-bebes-fraldas', 'product', 2, ['products', 'bebes', 'fraldas'],
      'Fraldas e Higiene', 'Diapers & Hygiene', 'Pañales e Higiene', 'products-bebes', 2),
  cat('products-bebes-alimentacao', 'product', 2, ['products', 'bebes', 'alimentacao'],
      'Alimentação', 'Feeding', 'Alimentación', 'products-bebes', 3),
  cat('products-bebes-brinquedos', 'product', 2, ['products', 'bebes', 'brinquedos'],
      'Brinquedos', 'Toys', 'Juguetes', 'products-bebes', 4),
  cat('products-bebes-carrinhos', 'product', 2, ['products', 'bebes', 'carrinhos'],
      'Carrinhos e Cadeiras', 'Strollers & Car Seats', 'Cochecitos y Sillas', 'products-bebes', 5),
  cat('products-bebes-moveis', 'product', 2, ['products', 'bebes', 'moveis'],
      'Móveis e Decoração', 'Furniture & Decor', 'Muebles y Decoración', 'products-bebes', 6),

  // L3: Roupas Bebê
  cat('products-bebes-roupas-recem-nascido', 'product', 3, ['products', 'bebes', 'roupas', 'recem-nascido'],
      'Recém-Nascido (0-3m)', 'Newborn (0-3m)', 'Recién Nacido (0-3m)', 'products-bebes-roupas', 1),
  cat('products-bebes-roupas-bebe', 'product', 3, ['products', 'bebes', 'roupas', 'bebe'],
      'Bebê (3-24m)', 'Baby (3-24m)', 'Bebé (3-24m)', 'products-bebes-roupas', 2),
  cat('products-bebes-roupas-infantil', 'product', 3, ['products', 'bebes', 'roupas', 'infantil'],
      'Infantil (2-8 anos)', 'Kids (2-8 years)', 'Infantil (2-8 años)', 'products-bebes-roupas', 3),

  // L4: Roupas por tipo
  cat('products-bebes-roupas-recem-nascido-bodies', 'product', 4, ['products', 'bebes', 'roupas', 'recem-nascido', 'bodies'],
      'Bodies', 'Bodysuits', 'Bodies', 'products-bebes-roupas-recem-nascido', 1),
  cat('products-bebes-roupas-recem-nascido-conjuntos', 'product', 4, ['products', 'bebes', 'roupas', 'recem-nascido', 'conjuntos'],
      'Conjuntos', 'Sets', 'Conjuntos', 'products-bebes-roupas-recem-nascido', 2),
  cat('products-bebes-roupas-recem-nascido-macacao', 'product', 4, ['products', 'bebes', 'roupas', 'recem-nascido', 'macacao'],
      'Macacões', 'Rompers', 'Mamelucos', 'products-bebes-roupas-recem-nascido', 3),

  // L3: Brinquedos Bebê
  cat('products-bebes-brinquedos-educativos', 'product', 3, ['products', 'bebes', 'brinquedos', 'educativos'],
      'Educativos', 'Educational', 'Educativos', 'products-bebes-brinquedos', 1),
  cat('products-bebes-brinquedos-pelucias', 'product', 3, ['products', 'bebes', 'brinquedos', 'pelucias'],
      'Pelúcias', 'Plush Toys', 'Peluches', 'products-bebes-brinquedos', 2),
  cat('products-bebes-brinquedos-mordedores', 'product', 3, ['products', 'bebes', 'brinquedos', 'mordedores'],
      'Mordedores', 'Teethers', 'Mordedores', 'products-bebes-brinquedos', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 2: BELEZA, CASA, ELETRODOMÉSTICOS, ELETRÔNICOS, ESPORTES
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: BELEZA E CUIDADOS PESSOAIS
  // ═══════════════════════════════════════════════════════════════════
  cat('products-beleza', 'product', 1, ['products', 'beleza'],
      'Beleza e Cuidados Pessoais', 'Beauty & Personal Care', 'Belleza y Cuidado Personal', undefined, 6),

  // L2: Beleza
  cat('products-beleza-maquiagem', 'product', 2, ['products', 'beleza', 'maquiagem'],
      'Maquiagem', 'Makeup', 'Maquillaje', 'products-beleza', 1),
  cat('products-beleza-cabelos', 'product', 2, ['products', 'beleza', 'cabelos'],
      'Cabelos', 'Hair Care', 'Cuidado del Cabello', 'products-beleza', 2),
  cat('products-beleza-pele', 'product', 2, ['products', 'beleza', 'pele'],
      'Cuidados com a Pele', 'Skin Care', 'Cuidado de la Piel', 'products-beleza', 3),
  cat('products-beleza-perfumes', 'product', 2, ['products', 'beleza', 'perfumes'],
      'Perfumes', 'Fragrances', 'Perfumes', 'products-beleza', 4),
  cat('products-beleza-unhas', 'product', 2, ['products', 'beleza', 'unhas'],
      'Unhas', 'Nail Care', 'Uñas', 'products-beleza', 5),

  // L3: Maquiagem
  cat('products-beleza-maquiagem-rosto', 'product', 3, ['products', 'beleza', 'maquiagem', 'rosto'],
      'Rosto', 'Face', 'Rostro', 'products-beleza-maquiagem', 1),
  cat('products-beleza-maquiagem-olhos', 'product', 3, ['products', 'beleza', 'maquiagem', 'olhos'],
      'Olhos', 'Eyes', 'Ojos', 'products-beleza-maquiagem', 2),
  cat('products-beleza-maquiagem-labios', 'product', 3, ['products', 'beleza', 'maquiagem', 'labios'],
      'Lábios', 'Lips', 'Labios', 'products-beleza-maquiagem', 3),

  // L4: Maquiagem Rosto
  cat('products-beleza-maquiagem-rosto-base', 'product', 4, ['products', 'beleza', 'maquiagem', 'rosto', 'base'],
      'Bases', 'Foundations', 'Bases', 'products-beleza-maquiagem-rosto', 1),
  cat('products-beleza-maquiagem-rosto-po', 'product', 4, ['products', 'beleza', 'maquiagem', 'rosto', 'po'],
      'Pós', 'Powders', 'Polvos', 'products-beleza-maquiagem-rosto', 2),
  cat('products-beleza-maquiagem-rosto-blush', 'product', 4, ['products', 'beleza', 'maquiagem', 'rosto', 'blush'],
      'Blush e Contorno', 'Blush & Contour', 'Rubor y Contorno', 'products-beleza-maquiagem-rosto', 3),

  // L3: Cabelos
  cat('products-beleza-cabelos-shampoo', 'product', 3, ['products', 'beleza', 'cabelos', 'shampoo'],
      'Shampoos', 'Shampoos', 'Champús', 'products-beleza-cabelos', 1),
  cat('products-beleza-cabelos-condicionador', 'product', 3, ['products', 'beleza', 'cabelos', 'condicionador'],
      'Condicionadores', 'Conditioners', 'Acondicionadores', 'products-beleza-cabelos', 2),
  cat('products-beleza-cabelos-tratamento', 'product', 3, ['products', 'beleza', 'cabelos', 'tratamento'],
      'Tratamentos', 'Treatments', 'Tratamientos', 'products-beleza-cabelos', 3),
  cat('products-beleza-cabelos-coloracao', 'product', 3, ['products', 'beleza', 'cabelos', 'coloracao'],
      'Coloração', 'Hair Color', 'Coloración', 'products-beleza-cabelos', 4),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: CASA E DECORAÇÃO
  // ═══════════════════════════════════════════════════════════════════
  cat('products-casa', 'product', 1, ['products', 'casa'],
      'Casa e Decoração', 'Home & Decor', 'Hogar y Decoración', undefined, 7),

  // L2: Casa
  cat('products-casa-moveis', 'product', 2, ['products', 'casa', 'moveis'],
      'Móveis', 'Furniture', 'Muebles', 'products-casa', 1),
  cat('products-casa-decoracao', 'product', 2, ['products', 'casa', 'decoracao'],
      'Decoração', 'Decor', 'Decoración', 'products-casa', 2),
  cat('products-casa-cama-mesa-banho', 'product', 2, ['products', 'casa', 'cama-mesa-banho'],
      'Cama, Mesa e Banho', 'Bed, Bath & Table', 'Cama, Mesa y Baño', 'products-casa', 3),
  cat('products-casa-cozinha', 'product', 2, ['products', 'casa', 'cozinha'],
      'Cozinha', 'Kitchen', 'Cocina', 'products-casa', 4),
  cat('products-casa-jardim', 'product', 2, ['products', 'casa', 'jardim'],
      'Jardim e Área Externa', 'Garden & Outdoor', 'Jardín y Exteriores', 'products-casa', 5),
  cat('products-casa-iluminacao', 'product', 2, ['products', 'casa', 'iluminacao'],
      'Iluminação', 'Lighting', 'Iluminación', 'products-casa', 6),

  // L3: Móveis
  cat('products-casa-moveis-sala', 'product', 3, ['products', 'casa', 'moveis', 'sala'],
      'Sala de Estar', 'Living Room', 'Sala de Estar', 'products-casa-moveis', 1),
  cat('products-casa-moveis-quarto', 'product', 3, ['products', 'casa', 'moveis', 'quarto'],
      'Quarto', 'Bedroom', 'Dormitorio', 'products-casa-moveis', 2),
  cat('products-casa-moveis-escritorio', 'product', 3, ['products', 'casa', 'moveis', 'escritorio'],
      'Escritório', 'Office', 'Oficina', 'products-casa-moveis', 3),
  cat('products-casa-moveis-cozinha', 'product', 3, ['products', 'casa', 'moveis', 'cozinha'],
      'Cozinha', 'Kitchen', 'Cocina', 'products-casa-moveis', 4),

  // L4: Móveis Sala
  cat('products-casa-moveis-sala-sofas', 'product', 4, ['products', 'casa', 'moveis', 'sala', 'sofas'],
      'Sofás', 'Sofas', 'Sofás', 'products-casa-moveis-sala', 1),
  cat('products-casa-moveis-sala-poltronas', 'product', 4, ['products', 'casa', 'moveis', 'sala', 'poltronas'],
      'Poltronas', 'Armchairs', 'Sillones', 'products-casa-moveis-sala', 2),
  cat('products-casa-moveis-sala-mesas', 'product', 4, ['products', 'casa', 'moveis', 'sala', 'mesas'],
      'Mesas', 'Tables', 'Mesas', 'products-casa-moveis-sala', 3),
  cat('products-casa-moveis-sala-estantes', 'product', 4, ['products', 'casa', 'moveis', 'sala', 'estantes'],
      'Estantes e Racks', 'Shelves & Racks', 'Estantes y Racks', 'products-casa-moveis-sala', 4),

  // L4: Móveis Quarto
  cat('products-casa-moveis-quarto-camas', 'product', 4, ['products', 'casa', 'moveis', 'quarto', 'camas'],
      'Camas', 'Beds', 'Camas', 'products-casa-moveis-quarto', 1),
  cat('products-casa-moveis-quarto-guarda-roupas', 'product', 4, ['products', 'casa', 'moveis', 'quarto', 'guarda-roupas'],
      'Guarda-Roupas', 'Wardrobes', 'Armarios', 'products-casa-moveis-quarto', 2),
  cat('products-casa-moveis-quarto-comodas', 'product', 4, ['products', 'casa', 'moveis', 'quarto', 'comodas'],
      'Cômodas', 'Dressers', 'Cómodas', 'products-casa-moveis-quarto', 3),

  // L3: Decoração
  cat('products-casa-decoracao-quadros', 'product', 3, ['products', 'casa', 'decoracao', 'quadros'],
      'Quadros e Telas', 'Frames & Canvas', 'Cuadros y Lienzos', 'products-casa-decoracao', 1),
  cat('products-casa-decoracao-tapetes', 'product', 3, ['products', 'casa', 'decoracao', 'tapetes'],
      'Tapetes', 'Rugs', 'Alfombras', 'products-casa-decoracao', 2),
  cat('products-casa-decoracao-cortinas', 'product', 3, ['products', 'casa', 'decoracao', 'cortinas'],
      'Cortinas e Persianas', 'Curtains & Blinds', 'Cortinas y Persianas', 'products-casa-decoracao', 3),
  cat('products-casa-decoracao-objetos', 'product', 3, ['products', 'casa', 'decoracao', 'objetos'],
      'Objetos Decorativos', 'Decorative Objects', 'Objetos Decorativos', 'products-casa-decoracao', 4),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: ELETRODOMÉSTICOS
  // ═══════════════════════════════════════════════════════════════════
  cat('products-eletrodomesticos', 'product', 1, ['products', 'eletrodomesticos'],
      'Eletrodomésticos', 'Home Appliances', 'Electrodomésticos', undefined, 8),

  // L2: Eletrodomésticos
  cat('products-eletrodomesticos-grandes', 'product', 2, ['products', 'eletrodomesticos', 'grandes'],
      'Linha Branca', 'Large Appliances', 'Línea Blanca', 'products-eletrodomesticos', 1),
  cat('products-eletrodomesticos-pequenos', 'product', 2, ['products', 'eletrodomesticos', 'pequenos'],
      'Pequenos Eletrodomésticos', 'Small Appliances', 'Pequeños Electrodomésticos', 'products-eletrodomesticos', 2),
  cat('products-eletrodomesticos-climatizacao', 'product', 2, ['products', 'eletrodomesticos', 'climatizacao'],
      'Climatização', 'Climate Control', 'Climatización', 'products-eletrodomesticos', 3),

  // L3: Linha Branca
  cat('products-eletrodomesticos-grandes-geladeiras', 'product', 3, ['products', 'eletrodomesticos', 'grandes', 'geladeiras'],
      'Geladeiras', 'Refrigerators', 'Refrigeradores', 'products-eletrodomesticos-grandes', 1),
  cat('products-eletrodomesticos-grandes-fogoes', 'product', 3, ['products', 'eletrodomesticos', 'grandes', 'fogoes'],
      'Fogões', 'Stoves', 'Cocinas', 'products-eletrodomesticos-grandes', 2),
  cat('products-eletrodomesticos-grandes-lavadoras', 'product', 3, ['products', 'eletrodomesticos', 'grandes', 'lavadoras'],
      'Lavadoras de Roupas', 'Washing Machines', 'Lavadoras', 'products-eletrodomesticos-grandes', 3),
  cat('products-eletrodomesticos-grandes-microondas', 'product', 3, ['products', 'eletrodomesticos', 'grandes', 'microondas'],
      'Micro-ondas', 'Microwaves', 'Microondas', 'products-eletrodomesticos-grandes', 4),
  cat('products-eletrodomesticos-grandes-lava-loucas', 'product', 3, ['products', 'eletrodomesticos', 'grandes', 'lava-loucas'],
      'Lava-Louças', 'Dishwashers', 'Lavavajillas', 'products-eletrodomesticos-grandes', 5),

  // L4: Geladeiras
  cat('products-eletrodomesticos-grandes-geladeiras-frost-free', 'product', 4, ['products', 'eletrodomesticos', 'grandes', 'geladeiras', 'frost-free'],
      'Frost Free', 'Frost Free', 'Frost Free', 'products-eletrodomesticos-grandes-geladeiras', 1),
  cat('products-eletrodomesticos-grandes-geladeiras-duplex', 'product', 4, ['products', 'eletrodomesticos', 'grandes', 'geladeiras', 'duplex'],
      'Duplex', 'French Door', 'Doble Puerta', 'products-eletrodomesticos-grandes-geladeiras', 2),
  cat('products-eletrodomesticos-grandes-geladeiras-side-by-side', 'product', 4, ['products', 'eletrodomesticos', 'grandes', 'geladeiras', 'side-by-side'],
      'Side by Side', 'Side by Side', 'Side by Side', 'products-eletrodomesticos-grandes-geladeiras', 3),

  // L3: Pequenos Eletrodomésticos
  cat('products-eletrodomesticos-pequenos-cafeteiras', 'product', 3, ['products', 'eletrodomesticos', 'pequenos', 'cafeteiras'],
      'Cafeteiras', 'Coffee Makers', 'Cafeteras', 'products-eletrodomesticos-pequenos', 1),
  cat('products-eletrodomesticos-pequenos-liquidificadores', 'product', 3, ['products', 'eletrodomesticos', 'pequenos', 'liquidificadores'],
      'Liquidificadores', 'Blenders', 'Licuadoras', 'products-eletrodomesticos-pequenos', 2),
  cat('products-eletrodomesticos-pequenos-batedeiras', 'product', 3, ['products', 'eletrodomesticos', 'pequenos', 'batedeiras'],
      'Batedeiras', 'Mixers', 'Batidoras', 'products-eletrodomesticos-pequenos', 3),
  cat('products-eletrodomesticos-pequenos-airfryers', 'product', 3, ['products', 'eletrodomesticos', 'pequenos', 'airfryers'],
      'Air Fryers', 'Air Fryers', 'Freidoras de Aire', 'products-eletrodomesticos-pequenos', 4),
  cat('products-eletrodomesticos-pequenos-aspiradores', 'product', 3, ['products', 'eletrodomesticos', 'pequenos', 'aspiradores'],
      'Aspiradores', 'Vacuum Cleaners', 'Aspiradoras', 'products-eletrodomesticos-pequenos', 5),

  // L3: Climatização
  cat('products-eletrodomesticos-climatizacao-ar-condicionado', 'product', 3, ['products', 'eletrodomesticos', 'climatizacao', 'ar-condicionado'],
      'Ar Condicionado', 'Air Conditioning', 'Aire Acondicionado', 'products-eletrodomesticos-climatizacao', 1),
  cat('products-eletrodomesticos-climatizacao-ventiladores', 'product', 3, ['products', 'eletrodomesticos', 'climatizacao', 'ventiladores'],
      'Ventiladores', 'Fans', 'Ventiladores', 'products-eletrodomesticos-climatizacao', 2),
  cat('products-eletrodomesticos-climatizacao-aquecedores', 'product', 3, ['products', 'eletrodomesticos', 'climatizacao', 'aquecedores'],
      'Aquecedores', 'Heaters', 'Calentadores', 'products-eletrodomesticos-climatizacao', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: ELETRÔNICOS
  // ═══════════════════════════════════════════════════════════════════
  cat('products-eletronicos', 'product', 1, ['products', 'eletronicos'],
      'Eletrônicos', 'Electronics', 'Electrónicos', undefined, 9),

  // L2: Eletrônicos
  cat('products-eletronicos-celulares', 'product', 2, ['products', 'eletronicos', 'celulares'],
      'Celulares e Smartphones', 'Phones & Smartphones', 'Celulares y Smartphones', 'products-eletronicos', 1),
  cat('products-eletronicos-computadores', 'product', 2, ['products', 'eletronicos', 'computadores'],
      'Computadores', 'Computers', 'Computadoras', 'products-eletronicos', 2),
  cat('products-eletronicos-tablets', 'product', 2, ['products', 'eletronicos', 'tablets'],
      'Tablets', 'Tablets', 'Tablets', 'products-eletronicos', 3),
  cat('products-eletronicos-tv-video', 'product', 2, ['products', 'eletronicos', 'tv-video'],
      'TV e Vídeo', 'TV & Video', 'TV y Video', 'products-eletronicos', 4),
  cat('products-eletronicos-audio', 'product', 2, ['products', 'eletronicos', 'audio'],
      'Áudio', 'Audio', 'Audio', 'products-eletronicos', 5),
  cat('products-eletronicos-cameras', 'product', 2, ['products', 'eletronicos', 'cameras'],
      'Câmeras e Drones', 'Cameras & Drones', 'Cámaras y Drones', 'products-eletronicos', 6),
  cat('products-eletronicos-games', 'product', 2, ['products', 'eletronicos', 'games'],
      'Games e Consoles', 'Games & Consoles', 'Videojuegos y Consolas', 'products-eletronicos', 7),
  cat('products-eletronicos-wearables', 'product', 2, ['products', 'eletronicos', 'wearables'],
      'Wearables', 'Wearables', 'Wearables', 'products-eletronicos', 8),

  // L3: Celulares
  cat('products-eletronicos-celulares-smartphones', 'product', 3, ['products', 'eletronicos', 'celulares', 'smartphones'],
      'Smartphones', 'Smartphones', 'Smartphones', 'products-eletronicos-celulares', 1),
  cat('products-eletronicos-celulares-acessorios', 'product', 3, ['products', 'eletronicos', 'celulares', 'acessorios'],
      'Acessórios', 'Accessories', 'Accesorios', 'products-eletronicos-celulares', 2),
  cat('products-eletronicos-celulares-capas', 'product', 3, ['products', 'eletronicos', 'celulares', 'capas'],
      'Capas e Películas', 'Cases & Screen Protectors', 'Fundas y Protectores', 'products-eletronicos-celulares', 3),

  // L4: Smartphones por marca
  cat('products-eletronicos-celulares-smartphones-apple', 'product', 4, ['products', 'eletronicos', 'celulares', 'smartphones', 'apple'],
      'Apple', 'Apple', 'Apple', 'products-eletronicos-celulares-smartphones', 1),
  cat('products-eletronicos-celulares-smartphones-samsung', 'product', 4, ['products', 'eletronicos', 'celulares', 'smartphones', 'samsung'],
      'Samsung', 'Samsung', 'Samsung', 'products-eletronicos-celulares-smartphones', 2),
  cat('products-eletronicos-celulares-smartphones-xiaomi', 'product', 4, ['products', 'eletronicos', 'celulares', 'smartphones', 'xiaomi'],
      'Xiaomi', 'Xiaomi', 'Xiaomi', 'products-eletronicos-celulares-smartphones', 3),
  cat('products-eletronicos-celulares-smartphones-motorola', 'product', 4, ['products', 'eletronicos', 'celulares', 'smartphones', 'motorola'],
      'Motorola', 'Motorola', 'Motorola', 'products-eletronicos-celulares-smartphones', 4),

  // L3: Computadores
  cat('products-eletronicos-computadores-notebooks', 'product', 3, ['products', 'eletronicos', 'computadores', 'notebooks'],
      'Notebooks', 'Laptops', 'Portátiles', 'products-eletronicos-computadores', 1),
  cat('products-eletronicos-computadores-desktops', 'product', 3, ['products', 'eletronicos', 'computadores', 'desktops'],
      'Desktops', 'Desktops', 'Escritorios', 'products-eletronicos-computadores', 2),
  cat('products-eletronicos-computadores-monitores', 'product', 3, ['products', 'eletronicos', 'computadores', 'monitores'],
      'Monitores', 'Monitors', 'Monitores', 'products-eletronicos-computadores', 3),
  cat('products-eletronicos-computadores-componentes', 'product', 3, ['products', 'eletronicos', 'computadores', 'componentes'],
      'Componentes', 'Components', 'Componentes', 'products-eletronicos-computadores', 4),
  cat('products-eletronicos-computadores-perifericos', 'product', 3, ['products', 'eletronicos', 'computadores', 'perifericos'],
      'Periféricos', 'Peripherals', 'Periféricos', 'products-eletronicos-computadores', 5),

  // L4: Notebooks
  cat('products-eletronicos-computadores-notebooks-gamer', 'product', 4, ['products', 'eletronicos', 'computadores', 'notebooks', 'gamer'],
      'Gamer', 'Gaming', 'Gaming', 'products-eletronicos-computadores-notebooks', 1),
  cat('products-eletronicos-computadores-notebooks-profissional', 'product', 4, ['products', 'eletronicos', 'computadores', 'notebooks', 'profissional'],
      'Profissional', 'Professional', 'Profesional', 'products-eletronicos-computadores-notebooks', 2),
  cat('products-eletronicos-computadores-notebooks-basico', 'product', 4, ['products', 'eletronicos', 'computadores', 'notebooks', 'basico'],
      'Básico', 'Basic', 'Básico', 'products-eletronicos-computadores-notebooks', 3),

  // L3: TV e Vídeo
  cat('products-eletronicos-tv-video-smart-tv', 'product', 3, ['products', 'eletronicos', 'tv-video', 'smart-tv'],
      'Smart TVs', 'Smart TVs', 'Smart TVs', 'products-eletronicos-tv-video', 1),
  cat('products-eletronicos-tv-video-projetores', 'product', 3, ['products', 'eletronicos', 'tv-video', 'projetores'],
      'Projetores', 'Projectors', 'Proyectores', 'products-eletronicos-tv-video', 2),
  cat('products-eletronicos-tv-video-streaming', 'product', 3, ['products', 'eletronicos', 'tv-video', 'streaming'],
      'Streaming Devices', 'Streaming Devices', 'Dispositivos de Streaming', 'products-eletronicos-tv-video', 3),

  // L4: Smart TVs
  cat('products-eletronicos-tv-video-smart-tv-4k', 'product', 4, ['products', 'eletronicos', 'tv-video', 'smart-tv', '4k'],
      '4K UHD', '4K UHD', '4K UHD', 'products-eletronicos-tv-video-smart-tv', 1),
  cat('products-eletronicos-tv-video-smart-tv-8k', 'product', 4, ['products', 'eletronicos', 'tv-video', 'smart-tv', '8k'],
      '8K', '8K', '8K', 'products-eletronicos-tv-video-smart-tv', 2),
  cat('products-eletronicos-tv-video-smart-tv-oled', 'product', 4, ['products', 'eletronicos', 'tv-video', 'smart-tv', 'oled'],
      'OLED', 'OLED', 'OLED', 'products-eletronicos-tv-video-smart-tv', 3),

  // L3: Games
  cat('products-eletronicos-games-consoles', 'product', 3, ['products', 'eletronicos', 'games', 'consoles'],
      'Consoles', 'Consoles', 'Consolas', 'products-eletronicos-games', 1),
  cat('products-eletronicos-games-jogos', 'product', 3, ['products', 'eletronicos', 'games', 'jogos'],
      'Jogos', 'Games', 'Juegos', 'products-eletronicos-games', 2),
  cat('products-eletronicos-games-acessorios', 'product', 3, ['products', 'eletronicos', 'games', 'acessorios'],
      'Acessórios', 'Accessories', 'Accesorios', 'products-eletronicos-games', 3),

  // L4: Consoles
  cat('products-eletronicos-games-consoles-playstation', 'product', 4, ['products', 'eletronicos', 'games', 'consoles', 'playstation'],
      'PlayStation', 'PlayStation', 'PlayStation', 'products-eletronicos-games-consoles', 1),
  cat('products-eletronicos-games-consoles-xbox', 'product', 4, ['products', 'eletronicos', 'games', 'consoles', 'xbox'],
      'Xbox', 'Xbox', 'Xbox', 'products-eletronicos-games-consoles', 2),
  cat('products-eletronicos-games-consoles-nintendo', 'product', 4, ['products', 'eletronicos', 'games', 'consoles', 'nintendo'],
      'Nintendo', 'Nintendo', 'Nintendo', 'products-eletronicos-games-consoles', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: ESPORTES E LAZER
  // ═══════════════════════════════════════════════════════════════════
  cat('products-esportes', 'product', 1, ['products', 'esportes'],
      'Esportes e Lazer', 'Sports & Leisure', 'Deportes y Ocio', undefined, 10),

  // L2: Esportes
  cat('products-esportes-fitness', 'product', 2, ['products', 'esportes', 'fitness'],
      'Fitness e Musculação', 'Fitness & Gym', 'Fitness y Gimnasio', 'products-esportes', 1),
  cat('products-esportes-futebol', 'product', 2, ['products', 'esportes', 'futebol'],
      'Futebol', 'Soccer', 'Fútbol', 'products-esportes', 2),
  cat('products-esportes-corrida', 'product', 2, ['products', 'esportes', 'corrida'],
      'Corrida e Caminhada', 'Running & Walking', 'Running y Caminata', 'products-esportes', 3),
  cat('products-esportes-ciclismo', 'product', 2, ['products', 'esportes', 'ciclismo'],
      'Ciclismo', 'Cycling', 'Ciclismo', 'products-esportes', 4),
  cat('products-esportes-natacao', 'product', 2, ['products', 'esportes', 'natacao'],
      'Natação', 'Swimming', 'Natación', 'products-esportes', 5),
  cat('products-esportes-artes-marciais', 'product', 2, ['products', 'esportes', 'artes-marciais'],
      'Artes Marciais', 'Martial Arts', 'Artes Marciales', 'products-esportes', 6),
  cat('products-esportes-camping', 'product', 2, ['products', 'esportes', 'camping'],
      'Camping e Aventura', 'Camping & Adventure', 'Camping y Aventura', 'products-esportes', 7),

  // L3: Fitness
  cat('products-esportes-fitness-equipamentos', 'product', 3, ['products', 'esportes', 'fitness', 'equipamentos'],
      'Equipamentos', 'Equipment', 'Equipamiento', 'products-esportes-fitness', 1),
  cat('products-esportes-fitness-acessorios', 'product', 3, ['products', 'esportes', 'fitness', 'acessorios'],
      'Acessórios', 'Accessories', 'Accesorios', 'products-esportes-fitness', 2),
  cat('products-esportes-fitness-suplementos', 'product', 3, ['products', 'esportes', 'fitness', 'suplementos'],
      'Suplementos', 'Supplements', 'Suplementos', 'products-esportes-fitness', 3),
  cat('products-esportes-fitness-roupas', 'product', 3, ['products', 'esportes', 'fitness', 'roupas'],
      'Roupas', 'Clothing', 'Ropa', 'products-esportes-fitness', 4),

  // L4: Equipamentos Fitness
  cat('products-esportes-fitness-equipamentos-esteiras', 'product', 4, ['products', 'esportes', 'fitness', 'equipamentos', 'esteiras'],
      'Esteiras', 'Treadmills', 'Cintas de Correr', 'products-esportes-fitness-equipamentos', 1),
  cat('products-esportes-fitness-equipamentos-bicicletas', 'product', 4, ['products', 'esportes', 'fitness', 'equipamentos', 'bicicletas'],
      'Bicicletas Ergométricas', 'Exercise Bikes', 'Bicicletas Estáticas', 'products-esportes-fitness-equipamentos', 2),
  cat('products-esportes-fitness-equipamentos-pesos', 'product', 4, ['products', 'esportes', 'fitness', 'equipamentos', 'pesos'],
      'Pesos e Halteres', 'Weights & Dumbbells', 'Pesas y Mancuernas', 'products-esportes-fitness-equipamentos', 3),

  // L3: Ciclismo
  cat('products-esportes-ciclismo-bicicletas', 'product', 3, ['products', 'esportes', 'ciclismo', 'bicicletas'],
      'Bicicletas', 'Bicycles', 'Bicicletas', 'products-esportes-ciclismo', 1),
  cat('products-esportes-ciclismo-acessorios', 'product', 3, ['products', 'esportes', 'ciclismo', 'acessorios'],
      'Acessórios', 'Accessories', 'Accesorios', 'products-esportes-ciclismo', 2),
  cat('products-esportes-ciclismo-roupas', 'product', 3, ['products', 'esportes', 'ciclismo', 'roupas'],
      'Roupas', 'Clothing', 'Ropa', 'products-esportes-ciclismo', 3),

  // L4: Bicicletas
  cat('products-esportes-ciclismo-bicicletas-mtb', 'product', 4, ['products', 'esportes', 'ciclismo', 'bicicletas', 'mtb'],
      'Mountain Bike', 'Mountain Bike', 'Bicicleta de Montaña', 'products-esportes-ciclismo-bicicletas', 1),
  cat('products-esportes-ciclismo-bicicletas-speed', 'product', 4, ['products', 'esportes', 'ciclismo', 'bicicletas', 'speed'],
      'Speed/Road', 'Road Bike', 'Bicicleta de Ruta', 'products-esportes-ciclismo-bicicletas', 2),
  cat('products-esportes-ciclismo-bicicletas-urbana', 'product', 4, ['products', 'esportes', 'ciclismo', 'bicicletas', 'urbana'],
      'Urbana', 'Urban', 'Urbana', 'products-esportes-ciclismo-bicicletas', 3),
  cat('products-esportes-ciclismo-bicicletas-eletrica', 'product', 4, ['products', 'esportes', 'ciclismo', 'bicicletas', 'eletrica'],
      'Elétrica', 'Electric', 'Eléctrica', 'products-esportes-ciclismo-bicicletas', 4),

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 3: FERRAMENTAS, INSTRUMENTOS, JOIAS, LIVROS, MODA
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: FERRAMENTAS E CONSTRUÇÃO
  // ═══════════════════════════════════════════════════════════════════
  cat('products-ferramentas', 'product', 1, ['products', 'ferramentas'],
      'Ferramentas e Construção', 'Tools & Construction', 'Herramientas y Construcción', undefined, 11),

  // L2: Ferramentas
  cat('products-ferramentas-manuais', 'product', 2, ['products', 'ferramentas', 'manuais'],
      'Ferramentas Manuais', 'Hand Tools', 'Herramientas Manuales', 'products-ferramentas', 1),
  cat('products-ferramentas-eletricas', 'product', 2, ['products', 'ferramentas', 'eletricas'],
      'Ferramentas Elétricas', 'Power Tools', 'Herramientas Eléctricas', 'products-ferramentas', 2),
  cat('products-ferramentas-medicao', 'product', 2, ['products', 'ferramentas', 'medicao'],
      'Medição e Instrumentação', 'Measurement', 'Medición', 'products-ferramentas', 3),
  cat('products-ferramentas-seguranca', 'product', 2, ['products', 'ferramentas', 'seguranca'],
      'Segurança e EPI', 'Safety & PPE', 'Seguridad y EPP', 'products-ferramentas', 4),
  cat('products-ferramentas-materiais', 'product', 2, ['products', 'ferramentas', 'materiais'],
      'Materiais de Construção', 'Building Materials', 'Materiales de Construcción', 'products-ferramentas', 5),

  // L3: Ferramentas Elétricas
  cat('products-ferramentas-eletricas-furadeiras', 'product', 3, ['products', 'ferramentas', 'eletricas', 'furadeiras'],
      'Furadeiras', 'Drills', 'Taladros', 'products-ferramentas-eletricas', 1),
  cat('products-ferramentas-eletricas-serras', 'product', 3, ['products', 'ferramentas', 'eletricas', 'serras'],
      'Serras', 'Saws', 'Sierras', 'products-ferramentas-eletricas', 2),
  cat('products-ferramentas-eletricas-lixadeiras', 'product', 3, ['products', 'ferramentas', 'eletricas', 'lixadeiras'],
      'Lixadeiras', 'Sanders', 'Lijadoras', 'products-ferramentas-eletricas', 3),
  cat('products-ferramentas-eletricas-esmerilhadeiras', 'product', 3, ['products', 'ferramentas', 'eletricas', 'esmerilhadeiras'],
      'Esmerilhadeiras', 'Grinders', 'Amoladoras', 'products-ferramentas-eletricas', 4),

  // L4: Furadeiras
  cat('products-ferramentas-eletricas-furadeiras-impacto', 'product', 4, ['products', 'ferramentas', 'eletricas', 'furadeiras', 'impacto'],
      'De Impacto', 'Impact', 'De Impacto', 'products-ferramentas-eletricas-furadeiras', 1),
  cat('products-ferramentas-eletricas-furadeiras-parafusadeira', 'product', 4, ['products', 'ferramentas', 'eletricas', 'furadeiras', 'parafusadeira'],
      'Parafusadeiras', 'Screwdrivers', 'Destornilladores', 'products-ferramentas-eletricas-furadeiras', 2),
  cat('products-ferramentas-eletricas-furadeiras-martelete', 'product', 4, ['products', 'ferramentas', 'eletricas', 'furadeiras', 'martelete'],
      'Marteletes', 'Rotary Hammers', 'Martillos Perforadores', 'products-ferramentas-eletricas-furadeiras', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: INSTRUMENTOS MUSICAIS
  // ═══════════════════════════════════════════════════════════════════
  cat('products-instrumentos', 'product', 1, ['products', 'instrumentos'],
      'Instrumentos Musicais', 'Musical Instruments', 'Instrumentos Musicales', undefined, 12),

  // L2: Instrumentos
  cat('products-instrumentos-cordas', 'product', 2, ['products', 'instrumentos', 'cordas'],
      'Cordas', 'String', 'Cuerdas', 'products-instrumentos', 1),
  cat('products-instrumentos-sopro', 'product', 2, ['products', 'instrumentos', 'sopro'],
      'Sopro', 'Wind', 'Viento', 'products-instrumentos', 2),
  cat('products-instrumentos-percussao', 'product', 2, ['products', 'instrumentos', 'percussao'],
      'Percussão', 'Percussion', 'Percusión', 'products-instrumentos', 3),
  cat('products-instrumentos-teclas', 'product', 2, ['products', 'instrumentos', 'teclas'],
      'Teclas', 'Keyboards', 'Teclados', 'products-instrumentos', 4),
  cat('products-instrumentos-audio', 'product', 2, ['products', 'instrumentos', 'audio'],
      'Áudio e Estúdio', 'Audio & Studio', 'Audio y Estudio', 'products-instrumentos', 5),

  // L3: Cordas
  cat('products-instrumentos-cordas-violao', 'product', 3, ['products', 'instrumentos', 'cordas', 'violao'],
      'Violão', 'Acoustic Guitar', 'Guitarra Acústica', 'products-instrumentos-cordas', 1),
  cat('products-instrumentos-cordas-guitarra', 'product', 3, ['products', 'instrumentos', 'cordas', 'guitarra'],
      'Guitarra', 'Electric Guitar', 'Guitarra Eléctrica', 'products-instrumentos-cordas', 2),
  cat('products-instrumentos-cordas-baixo', 'product', 3, ['products', 'instrumentos', 'cordas', 'baixo'],
      'Baixo', 'Bass', 'Bajo', 'products-instrumentos-cordas', 3),
  cat('products-instrumentos-cordas-ukulele', 'product', 3, ['products', 'instrumentos', 'cordas', 'ukulele'],
      'Ukulele', 'Ukulele', 'Ukulele', 'products-instrumentos-cordas', 4),

  // L3: Teclas
  cat('products-instrumentos-teclas-piano', 'product', 3, ['products', 'instrumentos', 'teclas', 'piano'],
      'Piano', 'Piano', 'Piano', 'products-instrumentos-teclas', 1),
  cat('products-instrumentos-teclas-teclado', 'product', 3, ['products', 'instrumentos', 'teclas', 'teclado'],
      'Teclado', 'Keyboard', 'Teclado', 'products-instrumentos-teclas', 2),
  cat('products-instrumentos-teclas-sintetizador', 'product', 3, ['products', 'instrumentos', 'teclas', 'sintetizador'],
      'Sintetizador', 'Synthesizer', 'Sintetizador', 'products-instrumentos-teclas', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: JOIAS E RELÓGIOS
  // ═══════════════════════════════════════════════════════════════════
  cat('products-joias', 'product', 1, ['products', 'joias'],
      'Joias e Relógios', 'Jewelry & Watches', 'Joyería y Relojes', undefined, 13),

  // L2: Joias
  cat('products-joias-aneis', 'product', 2, ['products', 'joias', 'aneis'],
      'Anéis', 'Rings', 'Anillos', 'products-joias', 1),
  cat('products-joias-brincos', 'product', 2, ['products', 'joias', 'brincos'],
      'Brincos', 'Earrings', 'Aretes', 'products-joias', 2),
  cat('products-joias-colares', 'product', 2, ['products', 'joias', 'colares'],
      'Colares', 'Necklaces', 'Collares', 'products-joias', 3),
  cat('products-joias-pulseiras', 'product', 2, ['products', 'joias', 'pulseiras'],
      'Pulseiras', 'Bracelets', 'Pulseras', 'products-joias', 4),
  cat('products-joias-relogios', 'product', 2, ['products', 'joias', 'relogios'],
      'Relógios', 'Watches', 'Relojes', 'products-joias', 5),

  // L3: Relógios
  cat('products-joias-relogios-analogico', 'product', 3, ['products', 'joias', 'relogios', 'analogico'],
      'Analógico', 'Analog', 'Analógico', 'products-joias-relogios', 1),
  cat('products-joias-relogios-digital', 'product', 3, ['products', 'joias', 'relogios', 'digital'],
      'Digital', 'Digital', 'Digital', 'products-joias-relogios', 2),
  cat('products-joias-relogios-smartwatch', 'product', 3, ['products', 'joias', 'relogios', 'smartwatch'],
      'Smartwatch', 'Smartwatch', 'Smartwatch', 'products-joias-relogios', 3),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: LIVROS E PAPELARIA
  // ═══════════════════════════════════════════════════════════════════
  cat('products-livros', 'product', 1, ['products', 'livros'],
      'Livros e Papelaria', 'Books & Stationery', 'Libros y Papelería', undefined, 14),

  // L2: Livros
  cat('products-livros-ficcao', 'product', 2, ['products', 'livros', 'ficcao'],
      'Ficção', 'Fiction', 'Ficción', 'products-livros', 1),
  cat('products-livros-nao-ficcao', 'product', 2, ['products', 'livros', 'nao-ficcao'],
      'Não-Ficção', 'Non-Fiction', 'No Ficción', 'products-livros', 2),
  cat('products-livros-infantil', 'product', 2, ['products', 'livros', 'infantil'],
      'Infantil', 'Children', 'Infantil', 'products-livros', 3),
  cat('products-livros-didaticos', 'product', 2, ['products', 'livros', 'didaticos'],
      'Didáticos', 'Educational', 'Didácticos', 'products-livros', 4),
  cat('products-livros-papelaria', 'product', 2, ['products', 'livros', 'papelaria'],
      'Papelaria', 'Stationery', 'Papelería', 'products-livros', 5),

  // L3: Ficção
  cat('products-livros-ficcao-romance', 'product', 3, ['products', 'livros', 'ficcao', 'romance'],
      'Romance', 'Romance', 'Romance', 'products-livros-ficcao', 1),
  cat('products-livros-ficcao-ficcao-cientifica', 'product', 3, ['products', 'livros', 'ficcao', 'ficcao-cientifica'],
      'Ficção Científica', 'Sci-Fi', 'Ciencia Ficción', 'products-livros-ficcao', 2),
  cat('products-livros-ficcao-fantasia', 'product', 3, ['products', 'livros', 'ficcao', 'fantasia'],
      'Fantasia', 'Fantasy', 'Fantasía', 'products-livros-ficcao', 3),
  cat('products-livros-ficcao-suspense', 'product', 3, ['products', 'livros', 'ficcao', 'suspense'],
      'Suspense e Thriller', 'Thriller', 'Suspense y Thriller', 'products-livros-ficcao', 4),

  // ═══════════════════════════════════════════════════════════════════
  // PRODUTOS - L1: MODA E VESTUÁRIO
  // ═══════════════════════════════════════════════════════════════════
  cat('products-moda', 'product', 1, ['products', 'moda'],
      'Moda e Vestuário', 'Fashion & Clothing', 'Moda y Ropa', undefined, 15),

  // L2: Moda
  cat('products-moda-masculino', 'product', 2, ['products', 'moda', 'masculino'],
      'Masculino', 'Men', 'Hombres', 'products-moda', 1),
  cat('products-moda-feminino', 'product', 2, ['products', 'moda', 'feminino'],
      'Feminino', 'Women', 'Mujeres', 'products-moda', 2),
  cat('products-moda-calcados', 'product', 2, ['products', 'moda', 'calcados'],
      'Calçados', 'Footwear', 'Calzado', 'products-moda', 3),
  cat('products-moda-bolsas', 'product', 2, ['products', 'moda', 'bolsas'],
      'Bolsas e Malas', 'Bags & Luggage', 'Bolsos y Maletas', 'products-moda', 4),
  cat('products-moda-acessorios', 'product', 2, ['products', 'moda', 'acessorios'],
      'Acessórios', 'Accessories', 'Accesorios', 'products-moda', 5),

  // L3: Masculino
  cat('products-moda-masculino-camisetas', 'product', 3, ['products', 'moda', 'masculino', 'camisetas'],
      'Camisetas', 'T-Shirts', 'Camisetas', 'products-moda-masculino', 1),
  cat('products-moda-masculino-camisas', 'product', 3, ['products', 'moda', 'masculino', 'camisas'],
      'Camisas', 'Shirts', 'Camisas', 'products-moda-masculino', 2),
  cat('products-moda-masculino-calcas', 'product', 3, ['products', 'moda', 'masculino', 'calcas'],
      'Calças', 'Pants', 'Pantalones', 'products-moda-masculino', 3),
  cat('products-moda-masculino-bermudas', 'product', 3, ['products', 'moda', 'masculino', 'bermudas'],
      'Bermudas e Shorts', 'Shorts', 'Bermudas y Shorts', 'products-moda-masculino', 4),
  cat('products-moda-masculino-jaquetas', 'product', 3, ['products', 'moda', 'masculino', 'jaquetas'],
      'Jaquetas e Casacos', 'Jackets & Coats', 'Chaquetas y Abrigos', 'products-moda-masculino', 5),

  // L4: Calças Masculinas
  cat('products-moda-masculino-calcas-jeans', 'product', 4, ['products', 'moda', 'masculino', 'calcas', 'jeans'],
      'Jeans', 'Jeans', 'Jeans', 'products-moda-masculino-calcas', 1),
  cat('products-moda-masculino-calcas-social', 'product', 4, ['products', 'moda', 'masculino', 'calcas', 'social'],
      'Social', 'Dress Pants', 'Formal', 'products-moda-masculino-calcas', 2),
  cat('products-moda-masculino-calcas-moletom', 'product', 4, ['products', 'moda', 'masculino', 'calcas', 'moletom'],
      'Moletom', 'Sweatpants', 'Sudadera', 'products-moda-masculino-calcas', 3),

  // L3: Feminino
  cat('products-moda-feminino-vestidos', 'product', 3, ['products', 'moda', 'feminino', 'vestidos'],
      'Vestidos', 'Dresses', 'Vestidos', 'products-moda-feminino', 1),
  cat('products-moda-feminino-blusas', 'product', 3, ['products', 'moda', 'feminino', 'blusas'],
      'Blusas', 'Blouses', 'Blusas', 'products-moda-feminino', 2),
  cat('products-moda-feminino-calcas', 'product', 3, ['products', 'moda', 'feminino', 'calcas'],
      'Calças', 'Pants', 'Pantalones', 'products-moda-feminino', 3),
  cat('products-moda-feminino-saias', 'product', 3, ['products', 'moda', 'feminino', 'saias'],
      'Saias', 'Skirts', 'Faldas', 'products-moda-feminino', 4),
  cat('products-moda-feminino-conjuntos', 'product', 3, ['products', 'moda', 'feminino', 'conjuntos'],
      'Conjuntos', 'Sets', 'Conjuntos', 'products-moda-feminino', 5),

  // L4: Vestidos
  cat('products-moda-feminino-vestidos-casual', 'product', 4, ['products', 'moda', 'feminino', 'vestidos', 'casual'],
      'Casual', 'Casual', 'Casual', 'products-moda-feminino-vestidos', 1),
  cat('products-moda-feminino-vestidos-festa', 'product', 4, ['products', 'moda', 'feminino', 'vestidos', 'festa'],
      'Festa', 'Party', 'Fiesta', 'products-moda-feminino-vestidos', 2),
  cat('products-moda-feminino-vestidos-longo', 'product', 4, ['products', 'moda', 'feminino', 'vestidos', 'longo'],
      'Longo', 'Long', 'Largo', 'products-moda-feminino-vestidos', 3),

  // L3: Calçados
  cat('products-moda-calcados-tenis', 'product', 3, ['products', 'moda', 'calcados', 'tenis'],
      'Tênis', 'Sneakers', 'Zapatillas', 'products-moda-calcados', 1),
  cat('products-moda-calcados-sapatos', 'product', 3, ['products', 'moda', 'calcados', 'sapatos'],
      'Sapatos', 'Shoes', 'Zapatos', 'products-moda-calcados', 2),
  cat('products-moda-calcados-sandalia', 'product', 3, ['products', 'moda', 'calcados', 'sandalia'],
      'Sandálias', 'Sandals', 'Sandalias', 'products-moda-calcados', 3),
  cat('products-moda-calcados-botas', 'product', 3, ['products', 'moda', 'calcados', 'botas'],
      'Botas', 'Boots', 'Botas', 'products-moda-calcados', 4),

  // L4: Tênis
  cat('products-moda-calcados-tenis-casual', 'product', 4, ['products', 'moda', 'calcados', 'tenis', 'casual'],
      'Casual', 'Casual', 'Casual', 'products-moda-calcados-tenis', 1),
  cat('products-moda-calcados-tenis-esportivo', 'product', 4, ['products', 'moda', 'calcados', 'tenis', 'esportivo'],
      'Esportivo', 'Athletic', 'Deportivo', 'products-moda-calcados-tenis', 2),
  cat('products-moda-calcados-tenis-corrida', 'product', 4, ['products', 'moda', 'calcados', 'tenis', 'corrida'],
      'Corrida', 'Running', 'Running', 'products-moda-calcados-tenis', 3),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - INÍCIO
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: CASA E REFORMAS
  // ═══════════════════════════════════════════════════════════════════
  cat('services-casa', 'service', 1, ['services', 'casa'],
      'Casa e Reformas', 'Home & Renovation', 'Casa y Reformas', undefined, 1),

  // L2: Casa
  cat('services-casa-pintura', 'service', 2, ['services', 'casa', 'pintura'],
      'Pintura', 'Painting', 'Pintura', 'services-casa', 1),
  cat('services-casa-eletrica', 'service', 2, ['services', 'casa', 'eletrica'],
      'Elétrica', 'Electrical', 'Eléctrica', 'services-casa', 2),
  cat('services-casa-hidraulica', 'service', 2, ['services', 'casa', 'hidraulica'],
      'Hidráulica', 'Plumbing', 'Plomería', 'services-casa', 3),
  cat('services-casa-marcenaria', 'service', 2, ['services', 'casa', 'marcenaria'],
      'Marcenaria', 'Carpentry', 'Carpintería', 'services-casa', 4),
  cat('services-casa-pedreiro', 'service', 2, ['services', 'casa', 'pedreiro'],
      'Pedreiro e Alvenaria', 'Masonry', 'Albañilería', 'services-casa', 5),
  cat('services-casa-limpeza', 'service', 2, ['services', 'casa', 'limpeza'],
      'Limpeza', 'Cleaning', 'Limpieza', 'services-casa', 6),
  cat('services-casa-jardinagem', 'service', 2, ['services', 'casa', 'jardinagem'],
      'Jardinagem', 'Gardening', 'Jardinería', 'services-casa', 7),

  // L3: Pintura
  cat('services-casa-pintura-residencial', 'service', 3, ['services', 'casa', 'pintura', 'residencial'],
      'Residencial', 'Residential', 'Residencial', 'services-casa-pintura', 1),
  cat('services-casa-pintura-comercial', 'service', 3, ['services', 'casa', 'pintura', 'comercial'],
      'Comercial', 'Commercial', 'Comercial', 'services-casa-pintura', 2),
  cat('services-casa-pintura-textura', 'service', 3, ['services', 'casa', 'pintura', 'textura'],
      'Textura e Efeitos', 'Texture & Effects', 'Textura y Efectos', 'services-casa-pintura', 3),

  // L4: Pintura Residencial
  cat('services-casa-pintura-residencial-interna', 'service', 4, ['services', 'casa', 'pintura', 'residencial', 'interna'],
      'Interna', 'Interior', 'Interior', 'services-casa-pintura-residencial', 1),
  cat('services-casa-pintura-residencial-externa', 'service', 4, ['services', 'casa', 'pintura', 'residencial', 'externa'],
      'Externa', 'Exterior', 'Exterior', 'services-casa-pintura-residencial', 2),

  // L3: Elétrica
  cat('services-casa-eletrica-instalacao', 'service', 3, ['services', 'casa', 'eletrica', 'instalacao'],
      'Instalação', 'Installation', 'Instalación', 'services-casa-eletrica', 1),
  cat('services-casa-eletrica-manutencao', 'service', 3, ['services', 'casa', 'eletrica', 'manutencao'],
      'Manutenção', 'Maintenance', 'Mantenimiento', 'services-casa-eletrica', 2),
  cat('services-casa-eletrica-reparo', 'service', 3, ['services', 'casa', 'eletrica', 'reparo'],
      'Reparo', 'Repair', 'Reparación', 'services-casa-eletrica', 3),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: TECNOLOGIA
  // ═══════════════════════════════════════════════════════════════════
  cat('services-tecnologia', 'service', 1, ['services', 'tecnologia'],
      'Tecnologia', 'Technology', 'Tecnología', undefined, 2),

  // L2: Tecnologia
  cat('services-tecnologia-desenvolvimento', 'service', 2, ['services', 'tecnologia', 'desenvolvimento'],
      'Desenvolvimento', 'Development', 'Desarrollo', 'services-tecnologia', 1),
  cat('services-tecnologia-design', 'service', 2, ['services', 'tecnologia', 'design'],
      'Design', 'Design', 'Diseño', 'services-tecnologia', 2),
  cat('services-tecnologia-suporte', 'service', 2, ['services', 'tecnologia', 'suporte'],
      'Suporte Técnico', 'Tech Support', 'Soporte Técnico', 'services-tecnologia', 3),
  cat('services-tecnologia-redes', 'service', 2, ['services', 'tecnologia', 'redes'],
      'Redes e Infraestrutura', 'Networks & Infrastructure', 'Redes e Infraestructura', 'services-tecnologia', 4),

  // L3: Desenvolvimento
  cat('services-tecnologia-desenvolvimento-web', 'service', 3, ['services', 'tecnologia', 'desenvolvimento', 'web'],
      'Web', 'Web', 'Web', 'services-tecnologia-desenvolvimento', 1),
  cat('services-tecnologia-desenvolvimento-mobile', 'service', 3, ['services', 'tecnologia', 'desenvolvimento', 'mobile'],
      'Mobile', 'Mobile', 'Móvil', 'services-tecnologia-desenvolvimento', 2),
  cat('services-tecnologia-desenvolvimento-software', 'service', 3, ['services', 'tecnologia', 'desenvolvimento', 'software'],
      'Software', 'Software', 'Software', 'services-tecnologia-desenvolvimento', 3),
  cat('services-tecnologia-desenvolvimento-blockchain', 'service', 3, ['services', 'tecnologia', 'desenvolvimento', 'blockchain'],
      'Blockchain', 'Blockchain', 'Blockchain', 'services-tecnologia-desenvolvimento', 4),

  // L4: Desenvolvimento Web
  cat('services-tecnologia-desenvolvimento-web-frontend', 'service', 4, ['services', 'tecnologia', 'desenvolvimento', 'web', 'frontend'],
      'Frontend', 'Frontend', 'Frontend', 'services-tecnologia-desenvolvimento-web', 1),
  cat('services-tecnologia-desenvolvimento-web-backend', 'service', 4, ['services', 'tecnologia', 'desenvolvimento', 'web', 'backend'],
      'Backend', 'Backend', 'Backend', 'services-tecnologia-desenvolvimento-web', 2),
  cat('services-tecnologia-desenvolvimento-web-fullstack', 'service', 4, ['services', 'tecnologia', 'desenvolvimento', 'web', 'fullstack'],
      'Fullstack', 'Fullstack', 'Fullstack', 'services-tecnologia-desenvolvimento-web', 3),
  cat('services-tecnologia-desenvolvimento-web-ecommerce', 'service', 4, ['services', 'tecnologia', 'desenvolvimento', 'web', 'ecommerce'],
      'E-commerce', 'E-commerce', 'E-commerce', 'services-tecnologia-desenvolvimento-web', 4),

  // L3: Design
  cat('services-tecnologia-design-ui-ux', 'service', 3, ['services', 'tecnologia', 'design', 'ui-ux'],
      'UI/UX', 'UI/UX', 'UI/UX', 'services-tecnologia-design', 1),
  cat('services-tecnologia-design-grafico', 'service', 3, ['services', 'tecnologia', 'design', 'grafico'],
      'Gráfico', 'Graphic', 'Gráfico', 'services-tecnologia-design', 2),
  cat('services-tecnologia-design-branding', 'service', 3, ['services', 'tecnologia', 'design', 'branding'],
      'Branding', 'Branding', 'Branding', 'services-tecnologia-design', 3),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: SAÚDE E BEM-ESTAR
  // ═══════════════════════════════════════════════════════════════════
  cat('services-saude', 'service', 1, ['services', 'saude'],
      'Saúde e Bem-Estar', 'Health & Wellness', 'Salud y Bienestar', undefined, 3),

  // L2: Saúde
  cat('services-saude-fitness', 'service', 2, ['services', 'saude', 'fitness'],
      'Fitness e Personal', 'Fitness & Personal', 'Fitness y Personal', 'services-saude', 1),
  cat('services-saude-nutricao', 'service', 2, ['services', 'saude', 'nutricao'],
      'Nutrição', 'Nutrition', 'Nutrición', 'services-saude', 2),
  cat('services-saude-terapias', 'service', 2, ['services', 'saude', 'terapias'],
      'Terapias', 'Therapies', 'Terapias', 'services-saude', 3),
  cat('services-saude-estetica', 'service', 2, ['services', 'saude', 'estetica'],
      'Estética', 'Aesthetics', 'Estética', 'services-saude', 4),

  // L3: Fitness
  cat('services-saude-fitness-personal', 'service', 3, ['services', 'saude', 'fitness', 'personal'],
      'Personal Trainer', 'Personal Trainer', 'Entrenador Personal', 'services-saude-fitness', 1),
  cat('services-saude-fitness-pilates', 'service', 3, ['services', 'saude', 'fitness', 'pilates'],
      'Pilates', 'Pilates', 'Pilates', 'services-saude-fitness', 2),
  cat('services-saude-fitness-yoga', 'service', 3, ['services', 'saude', 'fitness', 'yoga'],
      'Yoga', 'Yoga', 'Yoga', 'services-saude-fitness', 3),
  cat('services-saude-fitness-funcional', 'service', 3, ['services', 'saude', 'fitness', 'funcional'],
      'Funcional', 'Functional', 'Funcional', 'services-saude-fitness', 4),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: EDUCAÇÃO
  // ═══════════════════════════════════════════════════════════════════
  cat('services-educacao', 'service', 1, ['services', 'educacao'],
      'Educação', 'Education', 'Educación', undefined, 4),

  // L2: Educação
  cat('services-educacao-idiomas', 'service', 2, ['services', 'educacao', 'idiomas'],
      'Idiomas', 'Languages', 'Idiomas', 'services-educacao', 1),
  cat('services-educacao-reforco', 'service', 2, ['services', 'educacao', 'reforco'],
      'Reforço Escolar', 'Tutoring', 'Refuerzo Escolar', 'services-educacao', 2),
  cat('services-educacao-cursos', 'service', 2, ['services', 'educacao', 'cursos'],
      'Cursos Profissionalizantes', 'Professional Courses', 'Cursos Profesionales', 'services-educacao', 3),
  cat('services-educacao-musica', 'service', 2, ['services', 'educacao', 'musica'],
      'Música', 'Music', 'Música', 'services-educacao', 4),

  // L3: Idiomas
  cat('services-educacao-idiomas-ingles', 'service', 3, ['services', 'educacao', 'idiomas', 'ingles'],
      'Inglês', 'English', 'Inglés', 'services-educacao-idiomas', 1),
  cat('services-educacao-idiomas-espanhol', 'service', 3, ['services', 'educacao', 'idiomas', 'espanhol'],
      'Espanhol', 'Spanish', 'Español', 'services-educacao-idiomas', 2),
  cat('services-educacao-idiomas-frances', 'service', 3, ['services', 'educacao', 'idiomas', 'frances'],
      'Francês', 'French', 'Francés', 'services-educacao-idiomas', 3),
  cat('services-educacao-idiomas-alemao', 'service', 3, ['services', 'educacao', 'idiomas', 'alemao'],
      'Alemão', 'German', 'Alemán', 'services-educacao-idiomas', 4),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: EVENTOS
  // ═══════════════════════════════════════════════════════════════════
  cat('services-eventos', 'service', 1, ['services', 'eventos'],
      'Eventos', 'Events', 'Eventos', undefined, 5),

  // L2: Eventos
  cat('services-eventos-fotografia', 'service', 2, ['services', 'eventos', 'fotografia'],
      'Fotografia', 'Photography', 'Fotografía', 'services-eventos', 1),
  cat('services-eventos-video', 'service', 2, ['services', 'eventos', 'video'],
      'Vídeo', 'Video', 'Video', 'services-eventos', 2),
  cat('services-eventos-buffet', 'service', 2, ['services', 'eventos', 'buffet'],
      'Buffet e Gastronomia', 'Catering', 'Catering', 'services-eventos', 3),
  cat('services-eventos-decoracao', 'service', 2, ['services', 'eventos', 'decoracao'],
      'Decoração', 'Decoration', 'Decoración', 'services-eventos', 4),
  cat('services-eventos-musica', 'service', 2, ['services', 'eventos', 'musica'],
      'Música e DJ', 'Music & DJ', 'Música y DJ', 'services-eventos', 5),

  // L3: Fotografia
  cat('services-eventos-fotografia-casamento', 'service', 3, ['services', 'eventos', 'fotografia', 'casamento'],
      'Casamento', 'Wedding', 'Boda', 'services-eventos-fotografia', 1),
  cat('services-eventos-fotografia-corporativo', 'service', 3, ['services', 'eventos', 'fotografia', 'corporativo'],
      'Corporativo', 'Corporate', 'Corporativo', 'services-eventos-fotografia', 2),
  cat('services-eventos-fotografia-ensaio', 'service', 3, ['services', 'eventos', 'fotografia', 'ensaio'],
      'Ensaio', 'Photo Shoot', 'Sesión de Fotos', 'services-eventos-fotografia', 3),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: AUTOMOTIVO
  // ═══════════════════════════════════════════════════════════════════
  cat('services-automotivo', 'service', 1, ['services', 'automotivo'],
      'Automotivo', 'Automotive', 'Automotriz', undefined, 6),

  // L2: Automotivo
  cat('services-automotivo-mecanica', 'service', 2, ['services', 'automotivo', 'mecanica'],
      'Mecânica', 'Mechanics', 'Mecánica', 'services-automotivo', 1),
  cat('services-automotivo-funilaria', 'service', 2, ['services', 'automotivo', 'funilaria'],
      'Funilaria e Pintura', 'Body & Paint', 'Carrocería y Pintura', 'services-automotivo', 2),
  cat('services-automotivo-eletrica', 'service', 2, ['services', 'automotivo', 'eletrica'],
      'Elétrica', 'Electrical', 'Eléctrica', 'services-automotivo', 3),
  cat('services-automotivo-lavagem', 'service', 2, ['services', 'automotivo', 'lavagem'],
      'Lavagem e Estética', 'Wash & Detailing', 'Lavado y Estética', 'services-automotivo', 4),

  // L3: Mecânica
  cat('services-automotivo-mecanica-motor', 'service', 3, ['services', 'automotivo', 'mecanica', 'motor'],
      'Motor', 'Engine', 'Motor', 'services-automotivo-mecanica', 1),
  cat('services-automotivo-mecanica-suspensao', 'service', 3, ['services', 'automotivo', 'mecanica', 'suspensao'],
      'Suspensão', 'Suspension', 'Suspensión', 'services-automotivo-mecanica', 2),
  cat('services-automotivo-mecanica-freios', 'service', 3, ['services', 'automotivo', 'mecanica', 'freios'],
      'Freios', 'Brakes', 'Frenos', 'services-automotivo-mecanica', 3),
  cat('services-automotivo-mecanica-cambio', 'service', 3, ['services', 'automotivo', 'mecanica', 'cambio'],
      'Câmbio', 'Transmission', 'Transmisión', 'services-automotivo-mecanica', 4),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: CONSULTORIA E NEGÓCIOS
  // ═══════════════════════════════════════════════════════════════════
  cat('services-consultoria', 'service', 1, ['services', 'consultoria'],
      'Consultoria e Negócios', 'Consulting & Business', 'Consultoría y Negocios', undefined, 7),

  // L2: Consultoria
  cat('services-consultoria-contabilidade', 'service', 2, ['services', 'consultoria', 'contabilidade'],
      'Contabilidade', 'Accounting', 'Contabilidad', 'services-consultoria', 1),
  cat('services-consultoria-juridico', 'service', 2, ['services', 'consultoria', 'juridico'],
      'Jurídico', 'Legal', 'Jurídico', 'services-consultoria', 2),
  cat('services-consultoria-marketing', 'service', 2, ['services', 'consultoria', 'marketing'],
      'Marketing', 'Marketing', 'Marketing', 'services-consultoria', 3),
  cat('services-consultoria-financeiro', 'service', 2, ['services', 'consultoria', 'financeiro'],
      'Financeiro', 'Financial', 'Financiero', 'services-consultoria', 4),
  cat('services-consultoria-rh', 'service', 2, ['services', 'consultoria', 'rh'],
      'RH e Recrutamento', 'HR & Recruiting', 'RRHH y Reclutamiento', 'services-consultoria', 5),

  // L3: Marketing
  cat('services-consultoria-marketing-digital', 'service', 3, ['services', 'consultoria', 'marketing', 'digital'],
      'Marketing Digital', 'Digital Marketing', 'Marketing Digital', 'services-consultoria-marketing', 1),
  cat('services-consultoria-marketing-social', 'service', 3, ['services', 'consultoria', 'marketing', 'social'],
      'Redes Sociais', 'Social Media', 'Redes Sociales', 'services-consultoria-marketing', 2),
  cat('services-consultoria-marketing-seo', 'service', 3, ['services', 'consultoria', 'marketing', 'seo'],
      'SEO', 'SEO', 'SEO', 'services-consultoria-marketing', 3),
  cat('services-consultoria-marketing-conteudo', 'service', 3, ['services', 'consultoria', 'marketing', 'conteudo'],
      'Conteúdo', 'Content', 'Contenido', 'services-consultoria-marketing', 4),

  // ═══════════════════════════════════════════════════════════════════
  // SERVIÇOS - L1: TRANSPORTE E FRETE
  // ═══════════════════════════════════════════════════════════════════
  cat('services-transporte', 'service', 1, ['services', 'transporte'],
      'Transporte e Frete', 'Transport & Freight', 'Transporte y Flete', undefined, 8),

  // L2: Transporte
  cat('services-transporte-mudancas', 'service', 2, ['services', 'transporte', 'mudancas'],
      'Mudanças', 'Moving', 'Mudanzas', 'services-transporte', 1),
  cat('services-transporte-frete', 'service', 2, ['services', 'transporte', 'frete'],
      'Frete', 'Freight', 'Flete', 'services-transporte', 2),
  cat('services-transporte-motoboy', 'service', 2, ['services', 'transporte', 'motoboy'],
      'Motoboy e Entregas', 'Delivery', 'Mensajería', 'services-transporte', 3),

  // L3: Frete
  cat('services-transporte-frete-local', 'service', 3, ['services', 'transporte', 'frete', 'local'],
      'Local', 'Local', 'Local', 'services-transporte-frete', 1),
  cat('services-transporte-frete-intermunicipal', 'service', 3, ['services', 'transporte', 'frete', 'intermunicipal'],
      'Intermunicipal', 'Intermunicipal', 'Intermunicipal', 'services-transporte-frete', 2),
  cat('services-transporte-frete-interestadual', 'service', 3, ['services', 'transporte', 'frete', 'interestadual'],
      'Interestadual', 'Interstate', 'Interestatal', 'services-transporte-frete', 3),
];

async function main() {
  console.log('🌱 Seed Marketplace Bazari - Completo');
  console.log(`📊 Total: ${categories.length} categorias\n`);

  // Limpar dados existentes
  console.log('🧹 Limpando dados existentes...');
  await prisma.product.deleteMany();
  await prisma.serviceOffering.deleteMany();
  await prisma.categorySpec.deleteMany();
  await prisma.category.deleteMany();
  console.log('✅ Dados limpos\n');

  // Inserir categorias
  let count = 0;
  for (const category of categories) {
    await prisma.category.create({ data: category });
    count++;
    if (count % 50 === 0) {
      console.log(`📝 ${count}/${categories.length} categorias inseridas...`);
    }
  }

  console.log(`\n✅ Seed concluído: ${count} categorias criadas!`);

  // Contagem por tipo
  const products = categories.filter(c => c.kind === 'product').length;
  const services = categories.filter(c => c.kind === 'service').length;

  console.log('\n📋 Resumo:');
  console.log(`  📦 Produtos: ${products} categorias`);
  console.log(`  🔧 Serviços: ${services} categorias`);
  console.log('\n📊 Categorias L1 de Produtos:');
  console.log('  - Alimentos e Bebidas');
  console.log('  - Animais e Pet Shop');
  console.log('  - Arte e Artesanato');
  console.log('  - Automotivo');
  console.log('  - Bebês e Crianças');
  console.log('  - Beleza e Cuidados Pessoais');
  console.log('  - Casa e Decoração');
  console.log('  - Eletrodomésticos');
  console.log('  - Eletrônicos');
  console.log('  - Esportes e Lazer');
  console.log('  - Ferramentas e Construção');
  console.log('  - Instrumentos Musicais');
  console.log('  - Joias e Relógios');
  console.log('  - Livros e Papelaria');
  console.log('  - Moda e Vestuário');
  console.log('\n📊 Categorias L1 de Serviços:');
  console.log('  - Casa e Reformas');
  console.log('  - Tecnologia');
  console.log('  - Saúde e Bem-Estar');
  console.log('  - Educação');
  console.log('  - Eventos');
  console.log('  - Automotivo');
  console.log('  - Consultoria e Negócios');
  console.log('  - Transporte e Frete');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
