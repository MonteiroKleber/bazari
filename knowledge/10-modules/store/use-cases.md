# Store Module - Use Cases

## UC-01: Create Store
1. User acessa `/app/seller/setup`
2. User preenche: shopName, shopSlug, about
3. User uploads logo/banner
4. System valida slug (único)
5. System cria SellerProfile
6. System marca como isDefault (se primeira loja)
7. Store criada (off-chain)

## UC-02: Publish Store On-Chain
1. Seller acessa store admin
2. Seller clica "Publish to Blockchain"
3. System gera IPFS files:
   - store.json (metadata)
   - categories.json
   - products.json (catalog)
4. System pina CIDs em IPFS
5. System cria extrinsic (publish_store)
6. User assina transação
7. Store NFT mintado on-chain
8. System atualiza onChainStoreId
9. System registra em StorePublishHistory

## UC-03: Update Store Catalog
1. Seller adiciona/edita produtos
2. Seller clica "Publish Update"
3. System incrementa version
4. System gera novos CIDs
5. System atualiza Store NFT on-chain
6. New version publicado

## UC-04: Add Operator
1. Store owner acessa settings
2. Owner insere address de operator
3. System adiciona em operatorAddresses[]
4. System atualiza on-chain (future)
5. Operator pode gerenciar produtos

## UC-05: View Public Store
1. Visitor acessa `/loja/:slug`
2. System busca SellerProfile
3. System lista products da loja
4. System exibe info, rating, policies
5. Visitor vê storefront

## UC-06: Manage Multiple Stores
1. User cria 2ª loja
2. System cria novo SellerProfile
3. User switcha entre lojas (dropdown)
4. Cada loja tem catálogo independente

**Status:** ✅ Implemented
