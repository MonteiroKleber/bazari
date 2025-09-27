Loja Bazari — Implementação On‑Chain em Fases (pallet-uniques + universal-registry)

Estado atual (resumo)
- Web/API (repo: bazari)
  - Lojas off‑chain em `SellerProfile` e páginas por slug, catálogo/Busca já filtram por loja (`storeId`/`storeSlug`).
  - Carteira e Polkadot API prontas no front para assinar extrinsics.
- Chain (repo: bazari-chain)
  - `pallet-universal-registry`: HEAD por namespace e `(namespace,id) -> cid` para metadados IPFS (genérico).
  - `pallet-establishment`: lista CIDs por conta (não transferível; não usaremos para Loja).

Objetivo
- Loja como ativo on-chain transferível (NFT-like), com:
  - Identidade/ownership transferível e operadores autorizados.
  - Metadados versionáveis via IPFS, com HEAD no universal-registry.
  - Reputação on‑chain mínima (acumuladores), alimentada por eventos off‑chain no MVP.
  - Compatibilidade com rotas/slug existentes e busca.

Diretrizes gerais
- Não quebrar flows legados: manter `/seller/:shopSlug` e dados de `SellerProfile` como espelho.
- Feature flags no web/API para “v1_onchain_stores”, desligado por padrão até concluir Fases 1–3.
- Escopar mudanças no mínimo possível; não refatorar módulos fora do necessário.
- CID/bytes bounds: seguir limites do runtime para evitar extrinsic failures.

Fase 0 — Preparação e Guardrails
- Feature flags
  - Web: `FEATURE_FLAGS.store_onchain_v1` (default: false).
  - API: `STORE_ONCHAIN_V1=0|1` para rotas e resolutores.
- Env/Config
  - Web: `VITE_BAZARICHAIN_WS` já existe (e manter padrão ws://127.0.0.1:9944).
  - API: apenas leitura on-chain por ora (sem assinar). Escrita acontecerá no front.
- Branch/CI
  - Trabalhar em branch `feat/loja-onchain-v1` nos dois repos.

Fase 1 — Chain: NFT de Loja com pallet-uniques + Pallet fino “stores”
Arquivos (repo: bazari-chain)
- Novo pallet: `pallets/stores/src/lib.rs`
- Runtime: `runtime/src/lib.rs`

1.1 Adicionar pallet-uniques ao runtime
- Dependência e `construct_runtime!` para `pallet_uniques`.
- Tipos sugeridos: `type CollectionId = u32; type ItemId = u64`.
- Parâmetros: depósitos moderados para metadata/item, limites seguros (evitar DoS por armazenamento).

1.2 Criar pallet “stores” (fino), responsável por operadores, reputação e integração
Storage (sugestão)
- `BazariStoresCollectionId: CollectionId` (constante configurável no runtime).
- `Operators: map StoreId(u64) -> BoundedVec<AccountId, MaxOps>`
- `MetadataCid: map StoreId -> BoundedVec<u8, MaxCidLen>`
- `PendingTransfer: map StoreId -> Option<AccountId>` (duas etapas)
- `Reputation: map StoreId -> { sales: u64, positive: u64, negative: u64, volume_planck: u128 }`
- `CreationDeposit: BalanceOf<T>` (Const ou Get param) — reservado na criação

Eventos
- `StoreCreated { owner, store_id, cid }`
- `StoreMetadataUpdated { who, store_id, cid }`
- `OperatorAdded/OperatorRemoved { owner, store_id, operator }`
- `StoreTransferBegun { owner, store_id, new_owner }`
- `StoreTransferred { old_owner, new_owner, store_id }`
- `StoreReputationUpdated { who, store_id, sales_delta, pos_delta, neg_delta, volume_delta }`

Extrinsics (assinaturas sugeridas)
- `create_store(cid: Vec<u8>) -> StoreId`
  - reserve() do depósito mínimo, mint do `pallet_uniques` em `BazariStoresCollectionId` com `item_id = store_id`.
  - gravar `MetadataCid[store_id] = cid`; emitir `StoreCreated`.
- `update_metadata(store_id: u64, cid: Vec<u8>)`
  - Origin: owner ou operator.
  - Atualiza `MetadataCid`; chama opcionalmente `pallet_uniques::set_metadata` (bounded) e o `universal_registry::set_head(b"stores/{id}", cid)`.
- `add_operator(store_id: u64, operator: AccountId)` / `remove_operator(...)`
  - Origin: owner.
- `begin_transfer(store_id: u64, new_owner: AccountId)` / `accept_transfer(store_id: u64)`
  - Dupla confirmação.
  - Em `accept_transfer`, efetivar `pallet_uniques::transfer`.
- `bump_reputation(store_id: u64, sales_delta: u64, pos_delta: u64, neg_delta: u64, volume_delta: u128)`
  - Origin recomendado: `EnsureOrigin` configurado (por ex., uma conta de serviço da API) — MVP pode ser livre mas não recomendado.

1.3 Integração opcional com universal-registry
- Ao `update_metadata`, atualizar `HEAD` em `namespace = b"stores/{store_id}"` via `pallet-universal-registry`.
- Não bloquear extrinsic se registry falhar (evitar coupling duro).

1.4 Genesis
- Criar coleção `Bazari Stores` com `collection_id = X` no `pallet_uniques` (por sudo/root) e configurar `BazariStoresCollectionId = X` no pallet `stores`.

Aceite Fase 1
- Mint/transfer/approve funcionando para itens da coleção.
- Operators e update de CID obedecem ACL.
- Eventos disparados e visíveis.

Fase 2 — API: leitura pública on‑chain + IPFS
Arquivos (repo: bazari)
- Rotas novas:
  - `GET /stores/:id`
    - Retorna: `{ storeId, owner, operators[], reputation, metadata: {...} | null, cid, source: 'registry'|'stores'|'placeholder' }`.
    - Leitura de chain: owner via `pallet_uniques`, operators/reputation/metadata via `pallet-stores`.
    - IPFS: buscar JSON por `cid` (timeout curto). Se falhar, retornar placeholders (nome “sem título”, capa genérica).
  - `GET /users/:address/stores-owned` e `/users/:address/stores-operated`
    - Query simples ao chain para listar ids.
- Compat:
  - Em `GET /sellers/:shopSlug` incluir `onChainStoreId` quando existir mapeamento em `SellerProfile`.

Aceite Fase 2
- `GET /stores/:id` responde com metadados preenchidos (ou placeholders) e owner/operators corretos.

Fase 3 — Persistência espelho e migração de dados
Prisma (repo: bazari)
- Alterações no schema (campos novos):
  - `SellerProfile`: `onChainStoreId BigInt?`, `ownerAddress String?`, `operatorAddresses String[]?` (ou Json[] dependendo do dialeto), índices em `onChainStoreId`.
  - `Product` e `ServiceOffering`: `onChainStoreId BigInt?` + índice.
- Migrações: adicionar colunas e índices; manter compat com dados atuais.
- Backfill opcional para dev: script para setar `onChainStoreId` em perfis selecionados.

Aceite Fase 3
- Migrações aplicam sem quebrar endpoints existentes.

Fase 4 — Web: criação/edição e rotas públicas
Arquivos (repo: bazari)
- Criação da Loja (UI)
  - Página (reutilizar SellerSetupPage):
    1) Montar JSON dos metadados `{ version, name, description, cover, categories[], links }`.
    2) Publicar no IPFS → obter `cid`.
    3) Assinar extrinsic `stores.create_store(cid)` via carteira local.
    4) Aguardar evento `StoreCreated` → obter `storeId`.
    5) Criar/atualizar espelho off‑chain (`SellerProfile`) com `onChainStoreId` e `shopSlug` (compat).
  - Erros: exibir fallback e permitir retry.
- Edição de metadados
  - Recriar JSON → IPFS → `stores.update_metadata(storeId, cid)`.
- Operadores
  - UI para `add_operator`/`remove_operator` com confirmação.
- Transferência em 2 passos
  - `begin_transfer` (origem) e track do estado; `accept_transfer` (destino) com confirmação.
- Rotas públicas
  - Nova rota: `/loja/:id` usando API `/stores/:id`.
  - Manter `/seller/:shopSlug` e `/s/:shopSlug`; se houver `onChainStoreId`, exibir link canônico.

Aceite Fase 4
- Fluxo de criação on-chain completo e página pública por id funcional.

Fase 5 — Reputação (MVP)
- On-chain: campos agregados em `Reputation` no pallet-stores.
- API: worker/serviço que, ao detectar `Order.RELEASED` e avaliações, chama `stores.bump_reputation(...)` com deltas.
- Web: exibir reputação formatada (percentual/contadores) na página da loja e cards.

Aceite Fase 5
- Mudança de status de pedido incrementa reputação on‑chain observável na API/Web.

Fase 6 — Busca e catálogo
- Indexador (OpenSearch) já aceita filtros `storeId` (off‑chain). Garantir preenchimento de `onChainStoreId` nos itens novos e nos fluxos de publicação.
- Página pública da Loja filtra catálogo por `onChainStoreId` quando disponível.

Aceite Fase 6
- Catálogo de uma loja usa `onChainStoreId` e funciona com paginação.

Especificação de Metadados (IPFS)
Formato JSON (versionável)
```
{
  "version": "1.0.0",
  "name": "...",
  "description": "...",
  "cover": { "url": "ipfs://<cid>" } | "ipfs://<cid>" | "https://...",
  "categories": ["products:foo/bar", "services:baz"],
  "links": { "whatsapp": "...", "site": "...", "socials": { "instagram": "..." } }
}
```
Regras
- `name` obrigatório; `categories` min 1.
- Campo `cover` aceita URL absoluta ou CID; front normaliza.
- Evolução: campos extras ignorados pelo app; `version` para migrações futuras.

Recomendações e Limitações
- Ownership/Operadores
  - `pallet-uniques` cobre apenas ownership/transfer/aproval; operadores de gestão por item serão mantidos no pallet `stores`.
- Depósitos
  - Definir depósitos em `pallet-uniques` e `stores::CreationDeposit` conservadores; exibir o valor no UI durante criação.
- Resiliência IPFS
  - Sempre renderizar placeholders quando IPFS falhar.
- Compatibilidade
  - Não remover `SellerProfile` nem rotas/slug legadas; espelho é necessário para SEO e busca.
- Segurança
  - `bump_reputation` deve usar origin restrito (`EnsureOrigin`) assim que possível.
- Não objetivos desta fase
  - Frações/DAO e colateralização do NFT — planejar para iteração futura.

Testes/Validação
- Chain
  - Tests unitários para `create_store`, `update_metadata`, operadores, transferência 2‑passos e reputação.
- API
  - Tests de rotas `/stores/:id` com mocks de IPFS e chain client.
- Web
  - E2E para criação (IPFS upload + extrinsic) e exibição pública.

Roteiro de rollback
- Feature flag global para desativar UI on‑chain.
- API mantém rotas legadas por slug; espelho off‑chain continua íntegro.
- Runtime: manter pallets adicionados; não remover a coleção para não invalidar itens já emitidos.

Apêndice — Assinaturas e caminhos
- Chain (bazari-chain)
  - `pallets/stores/src/lib.rs` — define Storage/Calls/Event conforme Fase 1.2
  - `runtime/src/lib.rs` — adiciona `pallet_uniques` e `stores` ao `construct_runtime!` e parâmetros.
- API (bazari)
  - Rotas novas: `apps/api/src/routes/stores.ts` (novo arquivo)
  - Ajustes leve em `apps/api/src/routes/sellers.ts` para propagar `onChainStoreId`.
  - Prisma: `apps/api/prisma/schema.prisma` — novos campos nas models citadas e migrações correspondentes.
- Web (bazari)
  - Rotas: `apps/web/src/App.tsx` — adicionar `/loja/:id`.
  - Páginas: `apps/web/src/pages/SellerSetupPage.tsx` (criação/edição), nova `StorePublicPage.tsx` para `/loja/:id`.
  - Carteira: `apps/web/src/modules/wallet/services/polkadot.ts` já disponível para extrinsics.

Critérios de aceite gerais
- Loja criada on‑chain com `storeId` único; metadados resolvidos e renderizados com fallback.
- Transferência em 2 etapas funciona; operadores controlam edição de metadados.
- Catálogo e busca filtram por `onChainStoreId` quando presente.

Onde criar/editar (por fase)
- Localização dos repositórios
  - Chain: `/home/bazari/bazari-chain`
  - API/Web: `/home/bazari/bazari`

- Fase 1 — Blockchain (bazari-chain)
  - Criar diretório: `/home/bazari/bazari-chain/pallets/stores/` e `/home/bazari/bazari-chain/pallets/stores/src/`
  - Criar arquivo: `/home/bazari/bazari-chain/pallets/stores/src/lib.rs`
  - Ajustar: `/home/bazari/bazari-chain/runtime/src/lib.rs` (incluir `pallet_uniques` e `stores`)
  - Ajustar (se necessário): `/home/bazari/bazari-chain/Cargo.toml`, `/home/bazari/bazari-chain/runtime/Cargo.toml`

- Fase 2 — API (bazari)
  - Criar arquivo: `/home/bazari/bazari/apps/api/src/routes/stores.ts`
  - Ajustar: `/home/bazari/bazari/apps/api/src/routes/sellers.ts` (incluir `onChainStoreId` no payload público)
  - Opcional (helper de leitura on-chain): `/home/bazari/bazari/apps/api/src/lib/chain.ts`

- Fase 3 — Prisma/Modelos (bazari)
  - Alterar: `/home/bazari/bazari/apps/api/prisma/schema.prisma` (novos campos `onChainStoreId`, etc.)
  - Migrações: `/home/bazari/bazari/apps/api/prisma/migrations/` (geradas pelo Prisma)
  - Script opcional de backfill: `/home/bazari/bazari/apps/api/src/ops/backfill-onchain-stores.ts`

- Fase 4 — Web (bazari)
  - Ajustar rotas: `/home/bazari/bazari/apps/web/src/App.tsx` (rota `/loja/:id`)
  - Criar página: `/home/bazari/bazari/apps/web/src/pages/StorePublicPage.tsx`
  - Ajustar fluxo: `/home/bazari/bazari/apps/web/src/pages/SellerSetupPage.tsx` (IPFS + extrinsic `create_store`)
  - Opcional (helpers on-chain/IPFS): `/home/bazari/bazari/apps/web/src/modules/store/onchain.ts`

- Fase 5 — Reputação (bazari)
  - Criar worker/serviço: `/home/bazari/bazari/apps/api/src/workers/reputation.worker.ts`
  - Ajustar pontos de emissão (quando pedidos são liberados/avaliados): `/home/bazari/bazari/apps/api/src/routes/orders.ts` (ou serviços associados)

- Fase 6 — Busca/Catálogo (bazari)
  - Ajustar indexador: `/home/bazari/bazari/apps/api/src/lib/osIngest.ts`, `/home/bazari/bazari/apps/api/src/lib/osQuery.ts`
  - Ajustar página pública (uso de `onChainStoreId`): `/home/bazari/bazari/apps/web/src/pages/SellerPublicPage.tsx` e/ou `StorePublicPage.tsx`
