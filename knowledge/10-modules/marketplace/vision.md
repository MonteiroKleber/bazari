# Marketplace Module - Vision & Purpose

## 🎯 Vision
**"Criar um marketplace Web3 descentralizado onde qualquer pessoa pode comprar e vender produtos/serviços com transparência, segurança e sem intermediários centralizados."**

## 📋 Purpose
1. **Product Catalog** - Catálogo unificado de produtos e serviços
2. **Advanced Search** - Busca full-text com OpenSearch/Postgres
3. **Category System** - Categorias hierárquicas (4 níveis) com atributos dinâmicos
4. **Discovery** - Recommendations, trending, featured
5. **Multi-Store** - Produtos de múltiplas lojas em um só lugar

## 🌟 Key Principles
- **Decentralized** - Produtos on-chain, catálogo em IPFS
- **Open** - Qualquer um pode listar produtos
- **Transparent** - Preços e reviews públicos
- **Dynamic Attributes** - CategorySpec permite atributos customizados por categoria

## 🏗️ Architecture
```
Search → OpenSearch (primary) → Products Index
       ↓ Fallback
       → PostgreSQL → Products Table

Product → Category → CategorySpec → Dynamic Attributes
       → Media → IPFS URLs
       → Seller → SellerProfile → Store
```

## 📊 Category System

### Hierarchy (4 níveis)
```
L1: Casa & Decoração
  L2: Decoração
    L3: Quadros
      L4: Quadros Abstratos
```

### CategorySpec (Dynamic Attributes)
```json
{
  "categoryId": "products-casa-decoracao-decoracao-quadros",
  "version": "1.0.0",
  "jsonSchema": {
    "properties": {
      "dimensions": {"type": "object"},
      "material": {"type": "string"},
      "style": {"enum": ["modern", "classic"]}
    }
  },
  "uiSchema": {...}
}
```

## 💰 Pricing
- All prices in **BZR** (token nativo)
- Decimals: 12 (1 BZR = 10^12 planck)
- Dynamic pricing (sellers can update)

## 🔍 Search Features
- **Full-text**: title + description
- **Filters**: category, price range, seller, attributes
- **Sort**: relevance, price (asc/desc), newest, popular
- **Facets**: category counts, price histogram

## 🔮 Future Features
1. **Reviews & Ratings** - 5-star system
2. **Wishlist** - Save for later
3. **Price Alerts** - Notify on price drop
4. **AI Recommendations** - Personalized suggestions
5. **Multi-Currency** - Support USDT, USDC

**Status:** ✅ Implemented & Production-Ready
