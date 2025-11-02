# Marketplace Module - Use Cases

## UC-01: Browse Marketplace
1. User acessa `/marketplace`
2. System busca produtos (OpenSearch ou Postgres)
3. System aplica filtros default (PUBLISHED, ordenado por newest)
4. System retorna grid de produtos (24 por página)
5. User vê produtos com: title, price, image, seller

## UC-02: Search Products
1. User digita query ("quadro abstrato")
2. Client envia `GET /api/marketplace/search?q=quadro+abstrato`
3. System busca em OpenSearch (full-text em title + description)
4. System ordena por relevância
5. System retorna resultados paginados
6. User vê produtos matching

## UC-03: Filter by Category
1. User seleciona categoria "Casa > Decoração > Quadros"
2. Client envia `GET /api/products?category=products-casa-decoracao-decoracao-quadros`
3. System filtra produtos por categoryId
4. System retorna produtos da categoria + subcategorias
5. User vê produtos filtrados

## UC-04: Filter by Price Range
1. User ajusta slider (R$50 - R$200)
2. Client converte BRL para BZR (exchange rate)
3. Client envia `GET /api/products?minPrice=X&maxPrice=Y`
4. System filtra por priceBzr
5. User vê produtos no range

## UC-05: View Product Detail
1. User clica em produto
2. System navega para `/product/:id`
3. System busca Product + Category + Media + Seller
4. System renderiza PDP (Product Detail Page):
   - Images carousel
   - Title, description
   - Price, attributes
   - Seller info
   - Add to cart button
5. User vê detalhes completos

## UC-06: Create Product Listing
1. Seller acessa `/app/new` (authenticated)
2. Seller preenche form:
   - Title, description
   - Price (BZR)
   - Category (4-level selector)
   - Attributes (dynamic based on category)
   - Upload images (Media module)
3. Seller submits
4. System valida:
   - CategorySpec compliance
   - Required attributes
   - Media ownership
5. System cria Product (status: PUBLISHED)
6. System indexa em OpenSearch (async)
7. Product visível no marketplace

## UC-07: Update Product
1. Seller edita produto próprio
2. Seller atualiza campos (price, description, etc.)
3. System valida ownership
4. System atualiza Product
5. System reindexes em OpenSearch
6. Mudanças refletidas no marketplace

## UC-08: Delete Product
1. Seller deleta produto
2. System marca como ARCHIVED (soft delete)
3. System remove de OpenSearch index
4. Produto não aparece mais no marketplace
5. Histórico preservado (orders ainda referenciam)

## UC-09: View by Seller/Store
1. User clica em seller name
2. System navega para `/loja/:slug`
3. System lista produtos daquele seller
4. User vê catálogo da loja

## UC-10: Trending Products
1. User acessa "Trending"
2. System calcula trending score:
   - Views (last 7 days)
   - Adds to cart
   - Orders
   - Decay factor
3. System ordena por score
4. User vê produtos em alta

**Status:** ✅ Implemented
