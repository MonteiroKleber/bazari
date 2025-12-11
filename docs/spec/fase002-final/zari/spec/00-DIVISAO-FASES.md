# 🎯 DIVISÃO DA IMPLEMENTAÇÃO EM FASES EXECUTÁVEIS

**Data:** 27 de Outubro de 2025
**Status:** 📋 ESPECIFICAÇÃO TÉCNICA
**Baseado em:** Análise completa de arquitetura dos projetos bazari + bazari-chain

---

## 🎨 ESTRATÉGIA DE DIVISÃO

### Princípios Fundamentais

1. **Sem Regressão** - Cada fase mantém funcionalidades existentes intactas
2. **Incremental** - Cada fase adiciona valor e pode ser testada independentemente
3. **Padrões Consistentes** - Seguir arquitetura e convenções já estabelecidas
4. **Testável** - Cada fase tem critérios claros de sucesso
5. **Rollback-safe** - Possível reverter fase sem afetar produção

---

## 📊 VISÃO GERAL DAS FASES

```
FASE 1: BZR Rename (Blockchain)          [2 semanas] [Baixo Risco]
  └─> Renomear UNIT → BZR no runtime
  └─> Adicionar metadata API
  └─> Sem mudança de funcionalidade

FASE 2: BZR Rename (Full-Stack)          [1 semana]  [Baixo Risco]
  └─> Atualizar backend formatação
  └─> Atualizar frontend wallet
  └─> Manter compatibilidade

FASE 3: ZARI Token (Blockchain)          [2 semanas] [Médio Risco]
  └─> Adicionar pallet-assets
  └─> Criar asset ZARI
  └─> Configurar genesis

FASE 4: Multi-Token Wallet (Frontend)    [1.5 semanas] [Baixo Risco]
  └─> Mostrar BZR + ZARI
  └─> Transações multi-asset
  └─> Histórico separado

FASE 5: P2P Extension (Backend)          [2 semanas] [Médio Risco]
  └─> Schema Prisma estendido
  └─> API suporta ZARI
  └─> Lógica de fases/preços

FASE 6: ZARI Purchase UI (Frontend)      [1.5 semanas] [Baixo Risco]
  └─> Página /app/zari
  └─> Wizard de compra
  └─> Integração P2P

FASE 7: Governance (Blockchain)          [3 semanas] [Alto Risco]
  └─> pallet-treasury
  └─> pallet-multisig
  └─> pallet-democracy
  └─> pallet-collective

FASE 8: Governance UI (Frontend)         [2 semanas] [Médio Risco]
  └─> /app/governance
  └─> Propostas/votação
  └─> Multi-sig dashboard

FASE 9: Vesting (Blockchain)             [1 semana]  [Alto Risco]
  └─> pallet-vesting
  └─> Schedules fundadores/parcerias
  └─> Genesis config

FASE 10: Vesting UI (Frontend)           [1 semana]  [Baixo Risco]
  └─> Mostrar tokens locked
  └─> Timeline de unlock
  └─> Notificações

FASE 11: Integration Tests               [1 semana]  [Médio Risco]
  └─> E2E completo
  └─> Testes de carga
  └─> Segurança

FASE 12: Audit & Deploy                  [2 semanas] [Alto Risco]
  └─> Bug bounty
  └─> Correções
  └─> Genesis mainnet
  └─> Deploy produção
```

**Total:** 19 semanas (~4.5 meses) - Buffer de 3 semanas incluso

---

## 🔍 DETALHAMENTO DAS FASES

### FASE 1: BZR Rename (Blockchain) [CRÍTICA]

**Objetivo:** Renomear moeda nativa UNIT → BZR em todo bazari-chain

**Por que primeiro:**
- Mudança fundamental que afeta constantes usadas em toda codebase
- Evita confusão ao adicionar ZARI (dois tokens, um com nome errado)
- Permite testar mudança de runtime isoladamente
- Prepara metadata correto para exposição via RPC

**Escopo:**
1. Runtime constants (UNIT → BZR, MILLI_UNIT → MILLI_BZR, etc)
2. Metadata API (TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DECIMALS)
3. Chain spec properties (tokenSymbol, tokenName)
4. Runtime VERSION bump (spec_version)
5. Genesis config comments
6. Testes unitários

**Arquivos afetados:** ~8 arquivos em bazari-chain
- `/root/bazari-chain/runtime/src/lib.rs`
- `/root/bazari-chain/runtime/src/configs/mod.rs`
- `/root/bazari-chain/runtime/src/genesis_config_presets.rs`
- `/root/bazari-chain/node/src/chain_spec.rs`
- `/root/bazari-chain/node/src/command.rs`

**Critérios de sucesso:**
- [ ] Compila sem erros
- [ ] Testes unitários passam
- [ ] Node roda em --dev mode
- [ ] Polkadot.js Apps mostra "BZR" em metadata
- [ ] Nenhuma funcionalidade quebrada

**Riscos:**
- Médio: Imports quebrados (mitigação: buscar todas referências)
- Baixo: Incompatibilidade (mitigação: constantes são compile-time)

---

### FASE 2: BZR Rename (Full-Stack) [DEPENDENTE: FASE 1]

**Objetivo:** Propagar renomeação BZR para backend e frontend

**Escopo:**
1. Backend: Helpers de formatação (planckToBZR, bzrToPlanck)
2. Backend: APIs retornam metadata correto
3. Frontend: Constantes (TOKEN_SYMBOL, DECIMALS)
4. Frontend: Componentes mostram "BZR"
5. Frontend: Inputs formatados com símbolo
6. i18n: Traduções para BZR (PT/EN/ES)

**Arquivos afetados:** ~12 arquivos em bazari
- `/root/bazari/apps/api/src/services/blockchain/client.ts`
- `/root/bazari/apps/api/src/utils/format.ts` (criar)
- `/root/bazari/apps/web/src/lib/blockchain/constants.ts`
- `/root/bazari/apps/web/src/lib/blockchain/format.ts` (criar)
- `/root/bazari/apps/web/src/components/wallet/Balance.tsx`
- `/root/bazari/apps/web/src/i18n/locales/*/wallet.json`

**Critérios de sucesso:**
- [ ] APIs retornam `{ symbol: "BZR", decimals: 12 }`
- [ ] Wallet mostra "1,234.56 BZR"
- [ ] Transações formatadas com BZR
- [ ] Sem "UNIT" visível em UI
- [ ] 3 idiomas atualizados

**Riscos:**
- Baixo: Cache frontend (mitigação: force refresh no deploy)
- Baixo: Testes quebrados (mitigação: atualizar mocks)

---

### FASE 3: ZARI Token (Blockchain) [DEPENDENTE: FASE 1]

**Objetivo:** Adicionar pallet-assets e criar token ZARI

**Por que após Fase 1:**
- BZR renomeado evita confusão
- Metadata API já implementado (padrão para ZARI)
- Runtime estável com nova versão

**Escopo:**
1. Adicionar `pallet-assets` ao Cargo.toml
2. Configurar pallet_assets::Config
3. Criar asset ZARI no genesis (asset_id = 1)
4. Configurar metadata (symbol "ZARI", decimals 12)
5. Alocar initial supply (21M ZARI)
6. Configurar permissões (owner = account específica)
7. Testes de create/transfer/burn

**Arquivos afetados:** ~6 arquivos em bazari-chain
- `/root/bazari-chain/runtime/Cargo.toml`
- `/root/bazari-chain/runtime/src/lib.rs` (construct_runtime!)
- `/root/bazari-chain/runtime/src/configs/mod.rs` (novo arquivo assets.rs)
- `/root/bazari-chain/runtime/src/genesis_config_presets.rs`
- `/root/bazari-chain/pallets/` (possível novo pallet-zari se custom)

**Código exemplo:**
```rust
// runtime/src/configs/assets.rs
impl pallet_assets::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Balance = Balance;
    type AssetId = u32;
    type AssetIdParameter = codec::Compact<u32>;
    type Currency = Balances;
    type CreateOrigin = AsEnsureOriginWithArg<EnsureSigned<AccountId>>;
    type ForceOrigin = EnsureRoot<AccountId>;
    type AssetDeposit = ConstU128<{ 100 * BZR }>;
    type AssetAccountDeposit = ConstU128<{ 1 * BZR }>;
    type MetadataDepositBase = ConstU128<{ 10 * BZR }>;
    type MetadataDepositPerByte = ConstU128<{ 1 * MILLI_BZR }>;
    type ApprovalDeposit = ConstU128<{ 1 * MILLI_BZR }>;
    type StringLimit = ConstU32<50>;
    type Freezer = ();
    type Extra = ();
    type WeightInfo = pallet_assets::weights::SubstrateWeight<Runtime>;
    type RemoveItemsLimit = ConstU32<1000>;
    type CallbackHandle = ();
}
```

**Genesis config:**
```json
{
  "assets": {
    "assets": [
      [1, "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", true, 1]
    ],
    "metadata": [
      [1, "ZARI", "Bazari Governance Token", 12]
    ],
    "accounts": [
      [1, "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 21000000000000000000]
    ]
  }
}
```

**Critérios de sucesso:**
- [ ] Runtime compila com pallet-assets
- [ ] Genesis cria asset ZARI (ID=1)
- [ ] query.assets.asset(1) retorna metadata correto
- [ ] query.assets.account(1, address) retorna balance
- [ ] Testes de transfer funcionam
- [ ] Polkadot.js Apps lista ZARI em Assets

**Riscos:**
- Médio: Incompatibilidade versões (mitigação: usar polkadot-sdk v1.18.0)
- Médio: Genesis inválido (mitigação: validar com try-runtime)
- Baixo: Permissões erradas (mitigação: testar mint/burn)

---

### FASE 4: Multi-Token Wallet (Frontend) [DEPENDENTE: FASE 3]

**Objetivo:** Wallet mostra BZR E ZARI, suporta transações de ambos

**Por que após Fase 3:**
- ZARI existe on-chain
- Pode testar queries assets.account()
- Validar metadata correto

**Escopo:**
1. API client: Queries para pallet-assets
2. Store Zustand: Multi-token balances
3. Componente `<TokenBalance />` genérico
4. Componente `<MultiTokenWallet />` lista tokens
5. Transações: Seletor de token (BZR/ZARI)
6. Histórico: Filtro por token
7. i18n: Traduções ZARI

**Arquivos afetados:** ~10 arquivos em bazari/apps/web
- `/root/bazari/apps/web/src/lib/blockchain/api.ts` (adicionar assets queries)
- `/root/bazari/apps/web/src/stores/wallet.ts` (multi-token state)
- `/root/bazari/apps/web/src/components/wallet/TokenBalance.tsx` (criar)
- `/root/bazari/apps/web/src/components/wallet/MultiTokenWallet.tsx` (criar)
- `/root/bazari/apps/web/src/components/wallet/TransferForm.tsx` (extend)
- `/root/bazari/apps/web/src/pages/wallet/WalletPage.tsx` (update)

**Código exemplo:**
```typescript
// src/stores/wallet.ts
interface WalletState {
  balances: {
    native: bigint;      // BZR
    assets: Record<number, bigint>; // { 1: ZARI_balance }
  };
  fetchBalances: (address: string) => Promise<void>;
}

// src/lib/blockchain/api.ts
export async function getAssetBalance(
  assetId: number,
  address: string
): Promise<bigint> {
  const api = await getApi();
  const balance = await api.query.assets.account(assetId, address);
  return balance.isSome ? balance.unwrap().balance.toBigInt() : BigInt(0);
}
```

**UI Exemplo:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>{t('wallet.myTokens')}</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <TokenBalance token="BZR" balance={balances.native} />
      <TokenBalance token="ZARI" balance={balances.assets[1]} />
    </div>
  </CardContent>
</Card>
```

**Critérios de sucesso:**
- [ ] Wallet lista BZR e ZARI
- [ ] Balances carregam corretamente
- [ ] Transações suportam seleção de token
- [ ] Histórico filtra por token
- [ ] 3 idiomas suportam ZARI
- [ ] 6 temas funcionam corretamente
- [ ] Responsivo (mobile + desktop)

**Riscos:**
- Baixo: Performance (mitigação: cache de queries)
- Baixo: UX confusa (mitigação: design review)

---

### FASE 5: P2P Extension (Backend) [DEPENDENTE: FASE 3]

**Objetivo:** Sistema P2P suporta ofertas ZARI além de BZR

**Por que após Fase 3:**
- ZARI existe on-chain para validação
- Frontend wallet pronto (FASE 4 paralela)

**Escopo:**
1. Schema Prisma: Campos assetType, offerType, daoControlled
2. Migration: Adicionar colunas sem quebrar dados existentes
3. API: GET /api/p2p/offers?assetType=ZARI
4. API: GET /api/p2p/dao-offers (filtro DAO_OFFICIAL)
5. Validação: Verificar saldo ZARI on-chain
6. Lógica: Calcular preço fase (2A: 0.25, 2B: 0.35, 3: 0.50 BZR)
7. Escrow: Suportar lock/unlock ZARI
8. Testes: Fluxo completo BZR→ZARI

**Arquivos afetados:** ~8 arquivos em bazari/apps/api
- `/root/bazari/apps/api/prisma/schema.prisma`
- `/root/bazari/apps/api/prisma/migrations/` (nova migration)
- `/root/bazari/apps/api/src/routes/p2p.offers.ts` (extend)
- `/root/bazari/apps/api/src/routes/p2p.orders.ts` (extend)
- `/root/bazari/apps/api/src/services/blockchain/escrow.ts` (extend)
- `/root/bazari/apps/api/src/services/p2p/pricing.ts` (criar)

**Schema Prisma:**
```prisma
model P2POffer {
  id            String   @id @default(cuid())

  // NOVO: Suporte multi-asset
  assetType     String   @default("BZR") // 'BZR' ou 'ZARI'
  offerType     String   @default("REGULAR") // 'REGULAR' ou 'DAO_OFFICIAL'
  daoControlled Boolean  @default(false)

  // Campos existentes
  userId        String
  assetAmount   String   // Em planck
  fiatAmount    String
  fiatCurrency  String   // 'BRL', 'USD', etc
  offerType     OfferType // BUY ou SELL
  paymentMethod String
  status        OfferStatus

  // ... resto dos campos

  @@index([assetType, status])
  @@index([offerType, daoControlled])
}
```

**Lógica de Preços:**
```typescript
// src/services/p2p/pricing.ts
export function getZARIPrice(phase: '2A' | '2B' | '3'): number {
  const prices = {
    '2A': 0.25, // BZR por ZARI
    '2B': 0.35,
    '3': 0.50,
  };
  return prices[phase];
}

export function calculateZARIPurchase(
  zariAmount: number,
  phase: '2A' | '2B' | '3'
): { zariAmount: number; bzrCost: number; phase: string } {
  const pricePerZARI = getZARIPrice(phase);
  const bzrCost = zariAmount * pricePerZARI;

  return {
    zariAmount,
    bzrCost,
    phase,
  };
}
```

**Migration segura:**
```prisma
-- Migration: 20251027_add_zari_support
ALTER TABLE "P2POffer"
  ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'BZR',
  ADD COLUMN "offerType" TEXT NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN "daoControlled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "P2POffer_assetType_status_idx" ON "P2POffer"("assetType", "status");
CREATE INDEX "P2POffer_offerType_daoControlled_idx" ON "P2POffer"("offerType", "daoControlled");
```

**Critérios de sucesso:**
- [ ] Migration roda sem erros
- [ ] Ofertas antigas mantêm assetType='BZR'
- [ ] API cria oferta ZARI com sucesso
- [ ] GET /offers?assetType=ZARI retorna correto
- [ ] Escrow lock/unlock funciona para ZARI
- [ ] Preços calculados corretamente por fase
- [ ] Testes E2E passam
- [ ] Sem regressão em ofertas BZR existentes

**Riscos:**
- Médio: Migration complexa (mitigação: testar em dev primeiro)
- Médio: Escrow ZARI (mitigação: usar pallet-assets.transfer)
- Baixo: Preços errados (mitigação: testes unitários)

---

### FASE 6: ZARI Purchase UI (Frontend) [DEPENDENTE: FASE 5]

**Objetivo:** Interface para comprar ZARI via P2P estendido

**Escopo:**
1. Página `/app/zari` - Landing page do token
2. Página `/app/zari/buy` - Wizard de compra
3. Componente `<DAOOffersList />` - Ofertas oficiais
4. Componente `<ZARIPurchaseFlow />` - 4 steps wizard
5. Integração com P2P API estendido
6. Validação de fase/preço
7. i18n: Todas strings traduzidas

**Arquivos afetados:** ~8 arquivos em bazari/apps/web
- `/root/bazari/apps/web/src/pages/zari/ZARILandingPage.tsx` (criar)
- `/root/bazari/apps/web/src/pages/zari/ZARIBuyPage.tsx` (criar)
- `/root/bazari/apps/web/src/modules/p2p/components/DAOOffersList.tsx` (criar)
- `/root/bazari/apps/web/src/modules/p2p/components/ZARIPurchaseFlow.tsx` (criar)
- `/root/bazari/apps/web/src/modules/p2p/api.ts` (extend para ZARI)
- `/root/bazari/apps/web/src/App.tsx` (adicionar rotas)

**Wizard Steps:**
```typescript
// Step 1: Selecionar quantidade
<AmountSelector
  token="ZARI"
  onChange={(amount) => setZariAmount(amount)}
  pricePerToken={0.25} // Baseado em fase atual
/>

// Step 2: Confirmar preço
<PriceConfirmation
  zariAmount={1000}
  bzrCost={250}
  phase="2A"
/>

// Step 3: Criar ordem P2P
<OrderCreation
  onCreateOrder={handleCreateOrder}
/>

// Step 4: Aguardar conclusão
<OrderStatus
  orderId={order.id}
  status={order.status}
/>
```

**Critérios de sucesso:**
- [ ] /app/zari acessível e bonita
- [ ] Wizard 4 steps funciona
- [ ] Ofertas DAO listadas corretamente
- [ ] Compra cria ordem P2P válida
- [ ] Escrow funciona (BZR locked)
- [ ] 3 idiomas completos
- [ ] 6 temas funcionam
- [ ] Responsivo
- [ ] Analytics rastreiam conversão

**Riscos:**
- Baixo: UX confusa (mitigação: user testing)
- Baixo: Erros de validação (mitigação: Zod schemas)

---

## 📋 FASES 7-12 (Resumo)

### FASE 7: Governance (Blockchain) [3 semanas]
- pallet-treasury + pallet-multisig + pallet-democracy + pallet-collective
- Multi-sig 5-of-7 configurado
- Council inicial (7 membros)
- Propostas e votação funcionando

### FASE 8: Governance UI (Frontend) [2 semanas]
- Página /app/governance
- Criar/votar propostas
- Dashboard multi-sig
- Timeline de execução

### FASE 9: Vesting (Blockchain) [1 semana]
- pallet-vesting configurado
- Schedules fundadores (6m + 24m)
- Schedules parcerias (3m + 12m)
- Genesis com vesting

### FASE 10: Vesting UI (Frontend) [1 semana]
- Mostrar tokens locked/unlocked
- Timeline visual
- Notificações de unlock

### FASE 11: Integration Tests [1 semana]
- E2E completo (Cypress/Playwright)
- Testes de carga (k6)
- Security testing
- Cross-browser testing

### FASE 12: Audit & Deploy [2 semanas]
- Bug bounty programa
- Code review externo
- Correções críticas
- Genesis mainnet
- Deploy produção
- Monitoring 24/7

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

### Sequencial Obrigatório:
```
FASE 1 → FASE 2 → FASE 3 → FASE 5 → FASE 6
(BZR)    (BZR)    (ZARI)   (P2P)    (UI)
```

### Paralelizável:
```
FASE 3 (Blockchain ZARI) ║ FASE 4 (Frontend Wallet)
FASE 5 (Backend P2P)     ║ FASE 6 (Frontend Purchase) (após FASE 5)
FASE 7 (Blockchain Gov)  ║ FASE 8 (Frontend Gov) (após FASE 7 parcial)
FASE 9 (Blockchain Vest) ║ FASE 10 (Frontend Vest) (após FASE 9)
```

### Bloqueadores:
- FASE 3 requer FASE 1 completa (BZR constants)
- FASE 4 requer FASE 3 completa (ZARI exists)
- FASE 5 requer FASE 3 completa (ZARI validation)
- FASE 6 requer FASE 5 completa (API ready)
- FASE 8 requer FASE 7 parcial (pallets deployed)
- FASE 10 requer FASE 9 completa (vesting logic)
- FASE 12 requer TODAS anteriores

---

## 📦 ENTREGÁVEIS POR FASE

Cada fase terá:
1. **Especificação técnica detalhada** (arquivo .md)
2. **Prompt para Claude Code** (arquivo .prompt)
3. **Checklist de validação** (embedded na spec)
4. **Testes de aceitação** (casos de teste)
5. **Rollback plan** (como reverter se falhar)

---

## 🎬 PRÓXIMA AÇÃO

Criar especificações técnicas detalhadas para cada fase, começando por:
1. FASE 1: BZR Rename (Blockchain)
2. FASE 2: BZR Rename (Full-Stack)
3. FASE 3: ZARI Token (Blockchain)

**Status:** Estrutura definida, pronto para criar specs detalhadas.

---

*Documento criado em: 27/Out/2025*
*Última atualização: 27/Out/2025*
