# 🚀 PRÓXIMOS PASSOS - Implementação ZARI + Renomeação BZR

**Data:** 27 de Outubro de 2025
**Status:** 📋 PLANEJAMENTO
**Baseado em:** Decisões aprovadas (Extensão P2P, Timeline 3-4 meses, Descentralização Progressiva)

---

## 📊 DECISÕES APROVADAS - Resumo

✅ **Modelo de Venda:** Extensão P2P (reutilizar sistema existente)
✅ **Tokenomics:** Vesting 6m+24m fundadores, Preços 0.25/0.35/0.50 BZR
✅ **Descentralização:** Progressiva (Multi-sig → Council → DAO completo)
✅ **Audit:** Interno + Bug Bounty (R$ 20k-40k)
✅ **Timeline:** Completo 3-4 meses
✅ **Compliance:** Lançar sem consulta prévia (risco assumido)

🆕 **NOVA DEMANDA:** Renomear moeda nativa UNIT → BZR

---

## 🎯 OBJETIVO GERAL

Implementar infraestrutura completa para:
1. **Token ZARI** - Moeda de governança (pallet-assets)
2. **DAO funcional** - Votação, treasury, council
3. **Venda de ZARI** - Via sistema P2P estendido
4. **Renomeação BZR** - Moeda nativa UNIT → BZR
5. **Descentralização** - Multi-sig → Governança comunitária

---

## 📋 ROADMAP COMPLETO (16 SEMANAS)

### **MÊS 1: Blockchain Foundation (Semanas 1-4)**

#### Semana 1-2: Renomeação da Moeda Nativa (UNIT → BZR)
**Por que primeiro?**
- Mudança crítica que afeta toda a stack
- Requer runtime upgrade e possível wipe de testnet
- Frontend e backend precisam ser atualizados ANTES de adicionar ZARI
- Evita confusão (trabalhar com UNIT enquanto documenta BZR)

**Entregas:**
- [ ] Runtime: Renomear constantes UNIT → BZR
- [ ] Runtime: Adicionar metadata API para token nativo
- [ ] Chain spec: Atualizar genesis balances com BZR
- [ ] Frontend: Atualizar wallet para mostrar "BZR"
- [ ] Backend: Atualizar APIs que retornam symbol
- [ ] Docs: Atualizar toda documentação

**Arquivos afetados:** ~15 arquivos (ver PROPOSTA-RENOMEAR-BZR.md)

---

#### Semana 3: Token ZARI (pallet-assets)
**Entregas:**
- [ ] Adicionar `pallet-assets` ao runtime
- [ ] Configurar asset ID para ZARI (ex: ID = 1)
- [ ] Definir metadata: symbol "ZARI", decimals 12
- - [ ] Criar asset ZARI no genesis (21M supply)
- [ ] Configurar permissões (admin = Treasury)
- [ ] Testes unitários do pallet

**Código:**
```rust
// runtime/src/configs/mod.rs
impl pallet_assets::Config for Runtime {
    type AssetId = u32;
    type Balance = Balance;
    type AssetDeposit = ConstU128<{ 10 * UNIT }>;
    // ... configuração completa
}
```

---

#### Semana 4: Governança Básica (Treasury + Multi-sig)
**Entregas:**
- [ ] Adicionar `pallet-treasury` ao runtime
- [ ] Adicionar `pallet-multisig` ao runtime
- [ ] Configurar treasury para receber BZR de taxas
- [ ] Criar conta multi-sig 5-of-7 (fundadores + validadores)
- [ ] Transferir ownership de ZARI para multi-sig
- [ ] Testes de aprovação multi-sig

**Signatários iniciais:**
- 5 fundadores (chaves conhecidas)
- 2 validadores (chaves de produção)
- Threshold: 5 de 7 assinaturas

---

### **MÊS 2: Backend + Frontend (Semanas 5-8)**

#### Semana 5-6: Backend - Extensão P2P para ZARI
**Entregas:**
- [ ] Schema Prisma: Adicionar campo `assetType` ('BZR' | 'ZARI')
- [ ] Schema Prisma: Adicionar campo `offerType` ('REGULAR' | 'DAO_OFFICIAL')
- [ ] Migration: Adicionar novas colunas
- [ ] API: `/api/p2p/offers` suportar filtro por asset
- [ ] API: `/api/p2p/dao-offers` endpoint específico DAO
- [ ] Lógica: Verificar saldo ZARI on-chain
- [ ] Lógica: Calcular preço baseado em fase (2A/2B/3)
- [ ] Testes: Fluxo completo compra ZARI

**Modelo Prisma atualizado:**
```prisma
model P2POffer {
  id            String   @id @default(cuid())
  assetType     String   @default("BZR") // 'BZR' ou 'ZARI'
  offerType     String   @default("REGULAR") // 'REGULAR' ou 'DAO_OFFICIAL'
  daoControlled Boolean  @default(false)
  assetAmount   String   // Quantidade em planck
  fiatAmount    String   // Valor em moeda fiat
  fiatCurrency  String   // 'BRL', 'USD', etc
  // ... campos existentes
}
```

---

#### Semana 7: Frontend - Multi-Token Wallet
**Entregas:**
- [ ] Wallet: Mostrar saldo BZR E ZARI
- [ ] Wallet: UI para múltiplos assets
- [ ] Componente: `<TokenBalance token="BZR" />` e `<TokenBalance token="ZARI" />`
- [ ] API Client: Queries para `query.assets.account(assetId, address)`
- [ ] Transações: Suporte para `assets.transfer()` além de `balances.transfer()`
- [ ] Histórico: Separar transações BZR vs ZARI

**Exemplo UI:**
```
┌─────────────────────────────┐
│ 💰 Seus Tokens              │
├─────────────────────────────┤
│ BZR  │ 1,234.56 BZR  │ 🔵  │
│ ZARI │   120.00 ZARI │ 🟣  │
└─────────────────────────────┘
```

---

#### Semana 8: Frontend - Interface de Compra ZARI
**Entregas:**
- [ ] Página: `/app/zari` - Landing page do token
- [ ] Página: `/app/zari/buy` - Compra via P2P
- [ ] Componente: `<DAOOffersList />` - Lista ofertas oficiais
- [ ] Componente: `<ZARIPurchaseFlow />` - Wizard de compra
- [ ] Integração: Conectar com P2P backend estendido
- [ ] Validação: Fases de preço (2A/2B/3)
- [ ] Analytics: Rastrear conversões

**Fluxo de compra:**
1. Usuário acessa `/app/zari/buy`
2. Seleciona quanto ZARI quer comprar
3. Sistema calcula preço (0.25/0.35/0.50 BZR baseado em fase)
4. Cria ordem P2P "DAO_OFFICIAL"
5. Escrow de BZR do comprador
6. DAO libera ZARI
7. Conclusão automática

---

### **MÊS 3: Governança + Vesting (Semanas 9-12)**

#### Semana 9-10: Governança On-Chain
**Entregas:**
- [ ] Adicionar `pallet-collective` (Council)
- [ ] Adicionar `pallet-democracy` (Referendos)
- [ ] Configurar Council inicial (7 membros eleitos)
- [ ] Configurar voting period (7 dias)
- [ ] Configurar enactment period (2 dias)
- [ ] Criar proposta exemplo (teste)
- [ ] UI: Página `/app/governance`

**Configuração Democracy:**
```rust
impl pallet_democracy::Config for Runtime {
    type VotingPeriod = ConstU32<{ 7 * DAYS }>;
    type EnactmentPeriod = ConstU32<{ 2 * DAYS }>;
    type MinimumDeposit = ConstU128<{ 100 * UNIT }>;
    // ... config completa
}
```

---

#### Semana 11: Vesting de Tokens
**Entregas:**
- [ ] Adicionar `pallet-vesting` ao runtime
- [ ] Configurar vesting para fundadores (6m cliff + 24m linear)
- [ ] Configurar vesting para parcerias (3m cliff + 12m linear)
- [ ] Genesis: Alocar ZARI com vesting schedules
- [ ] UI: Mostrar tokens "locked" vs "unlocked"
- [ ] Testes: Verificar unlock progressivo

**Schedule fundadores:**
```rust
// Cliff: 6 meses (15,768,000 blocos @ 6s/bloco)
// Linear: 24 meses (63,072,000 blocos)
VestingInfo {
    locked: 2_100_000 * UNIT, // 10% do supply (2.1M ZARI)
    per_block: locked / 63_072_000,
    starting_block: genesis_block + 15_768_000
}
```

---

#### Semana 12: Multi-sig para Treasury
**Entregas:**
- [ ] Criar conta multi-sig principal (5-of-7)
- [ ] Transferir controle do asset ZARI para multi-sig
- [ ] Transferir saldo treasury BZR para multi-sig
- [ ] Documentar processo de aprovação
- [ ] UI: Dashboard multi-sig para aprovações
- [ ] Treinar signatários

---

### **MÊS 4: Audit, Testes e Lançamento (Semanas 13-16)**

#### Semana 13-14: Audit Interno + Bug Bounty
**Entregas:**
- [ ] Code review completo (3 devs externos)
- [ ] Testes de integração E2E
- [ ] Testes de carga (simular 1000 compras simultâneas)
- [ ] Penetration testing (tentar exploits)
- [ ] Lançar bug bounty público (R$ 20k pool)
- [ ] Documentar vulnerabilidades encontradas
- [ ] Corrigir todos bugs críticos/altos

**Áreas críticas:**
1. Vesting logic (garantir cliff/linear correto)
2. Multi-sig approvals (evitar bypass)
3. P2P escrow (evitar double-spend)
4. Governance (evitar sybil attacks)
5. Asset permissions (garantir só DAO mint/burn)

---

#### Semana 15: Preparação Mainnet
**Entregas:**
- [ ] Genesis final com distribuição ZARI
- [ ] Chain spec de produção
- [ ] Validadores configurados (mínimo 3)
- [ ] Telemetry ativa
- [ ] Backups automáticos
- [ ] Monitoramento (Prometheus + Grafana)
- [ ] Documentação operacional

**Genesis Balances:**
```json
{
  "balances": {
    "balances": [
      ["5Fundador1...", "100000000000000"],  // BZR inicial
      ["5Treasury...", "5000000000000000"]   // Treasury BZR
    ]
  },
  "assets": {
    "assets": [
      [1, "5Treasury...", true, 1]  // Asset ID 1 = ZARI
    ],
    "metadata": [
      [1, "ZARI", "Bazari Governance Token", 12]
    ],
    "accounts": [
      [1, "5Fundadores...", "2100000000000000"],  // Fundadores (c/ vesting)
      [1, "5Treasury...", "10500000000000000"]    // Disponível venda (50%)
    ]
  }
}
```

---

#### Semana 16: Lançamento Público
**Entregas:**
- [ ] Migração testnet → mainnet
- [ ] Abrir venda Fase 2A (preço 0.25 BZR)
- [ ] Comunicação pública (blog post, redes sociais)
- [ ] Onboarding primeiros compradores
- [ ] Monitorar métricas (compras, erros, latência)
- [ ] Suporte 24/7 primeira semana
- [ ] Post-mortem da primeira semana

---

## 🔧 PRÉ-REQUISITOS TÉCNICOS

### 1. Ambiente de Desenvolvimento

**Necessário:**
- [ ] Rust toolchain atualizado (1.75+)
- [ ] Node.js 18+ / pnpm instalado
- [ ] PostgreSQL para backend
- [ ] Testnet local funcionando
- [ ] Polkadot.js Apps conectado

**Comandos:**
```bash
# Verificar versões
rustc --version  # >= 1.75
node --version   # >= 18
pnpm --version   # >= 8

# Setup testnet local
cd /root/bazari-chain
cargo build --release
./target/release/solochain-template-node --dev
```

---

### 2. Dependências do Runtime

**Pallets a adicionar (Cargo.toml):**
```toml
[dependencies]
pallet-assets = { version = "41.0.0", default-features = false }
pallet-treasury = { version = "39.0.0", default-features = false }
pallet-democracy = { version = "40.0.0", default-features = false }
pallet-collective = { version = "40.0.0", default-features = false }
pallet-multisig = { version = "40.0.0", default-features = false }
pallet-vesting = { version = "40.0.0", default-features = false }
```

**Versão compatível:** Polkadot SDK v1.18.0 (verificar compatibility)

---

### 3. Migrações de Dados

**Backend (Prisma):**
```bash
# Criar migration para P2P estendido
pnpm prisma migrate dev --name add_zari_support

# Schema changes:
# - P2POffer.assetType: String
# - P2POffer.offerType: String
# - P2POffer.daoControlled: Boolean
```

**Blockchain:**
- ✅ **Não requer migração de state** (genesis novo com ZARI)
- ⚠️ **Requer wipe de testnet** para renomear UNIT → BZR
- ⚠️ **Runtime upgrade** necessário (spec_version bump)

---

### 4. Infraestrutura

**Servidores necessários:**
- [ ] 1 Validator principal (4 CPU, 8GB RAM, 500GB SSD)
- [ ] 2 Validators backup (mesmas specs)
- [ ] 1 RPC node público (8 CPU, 16GB RAM, 1TB SSD)
- [ ] 1 Archive node (16 CPU, 32GB RAM, 2TB SSD) - opcional mas recomendado

**Custos estimados:** R$ 800-1200/mês (servidores + bandwidth)

---

### 5. Chaves e Contas

**Multi-sig (5-of-7):**
- [ ] Gerar 7 pares de chaves (sr25519)
- [ ] Documentar seed phrases (cofre seguro)
- [ ] Distribuir chaves entre signatários
- [ ] Testar aprovação multi-sig em testnet

**Treasury:**
- [ ] Criar conta treasury dedicada
- [ ] Configurar como owner do asset ZARI
- [ ] Configurar como beneficiário de taxas

---

### 6. Documentação Prévia

**Criar antes de começar:**
- [ ] Spec técnica detalhada (cada pallet)
- [ ] Diagramas de arquitetura atualizados
- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guides (como comprar ZARI, como votar)
- [ ] Runbooks operacionais (deploy, rollback, debug)

---

## 📦 DEPENDÊNCIAS ENTRE TAREFAS

### Caminho Crítico (não podem ser paralelizados):

```
1. Renomear UNIT → BZR
   ↓
2. Adicionar pallet-assets (ZARI)
   ↓
3. Adicionar treasury + multi-sig
   ↓
4. Transferir ownership ZARI para multi-sig
   ↓
5. Backend - Extensão P2P
   ↓
6. Frontend - Interface compra
   ↓
7. Governança (democracy + collective)
   ↓
8. Vesting schedules
   ↓
9. Audit
   ↓
10. Lançamento
```

### Tarefas Paralelizáveis:

**Durante Mês 1 (Blockchain):**
- Pode trabalhar em pallet-assets E pallet-treasury simultaneamente (devs diferentes)

**Durante Mês 2 (Backend/Frontend):**
- Backend P2P extension + Frontend wallet podem ser paralelos
- UIs de governança podem começar antes da lógica estar pronta (mocks)

**Durante Mês 3:**
- Vesting + Governance podem ser paralelos
- Documentação pode ser escrita enquanto código é desenvolvido

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Renomeação BZR quebra produção
**Probabilidade:** Média
**Impacto:** Alto
**Mitigação:**
- Fazer em testnet primeiro
- Validar TODOS endpoints de API
- Atualizar frontend/backend simultaneamente
- Ter plano de rollback

---

### Risco 2: Incompatibilidade entre pallets
**Probabilidade:** Média
**Impacto:** Alto
**Mitigação:**
- Usar versões compatíveis (mesmo polkadot-sdk release)
- Testar integração pallet-by-pallet
- Consultar Substrate docs oficiais

---

### Risco 3: Bug em vesting (tokens liberados incorretamente)
**Probabilidade:** Baixa
**Impacto:** CRÍTICO
**Mitigação:**
- Testes extensivos com diferentes cenários
- Simular 6 meses de blocos em testnet (fast-forward)
- Audit focado em vesting logic
- Usar pallet-vesting oficial (não custom)

---

### Risco 4: Ataque de governança (51% attack)
**Probabilidade:** Baixa (início)
**Impacto:** Alto
**Mitigação:**
- Início com multi-sig (não democracia pura)
- Transition gradual para descentralização
- Monitorar concentração de tokens
- Quorum alto para propostas críticas

---

### Risco 5: Falta de liquidez ZARI
**Probabilidade:** Média
**Impacto:** Médio
**Mitigação:**
- Vender em fases (2A/2B/3)
- Preços crescentes incentivam early adoption
- Marketing para atrair compradores
- Parcerias estratégicas (Fase 3)

---

### Risco 6: Compliance legal (classificação como security)
**Probabilidade:** Média (longo prazo)
**Impacto:** CRÍTICO
**Mitigação:**
- **DECISÃO TOMADA:** Lançar sem consulta (risco assumido)
- Estrutura DAO minimiza responsabilidade individual
- Evitar marketing como "investimento"
- Preparar documentação para eventual regulatory inquiry
- Considerar consulta legal APÓS primeiros 6 meses (se funding permitir)

---

## 💰 ORÇAMENTO DETALHADO

### Desenvolvimento (3-4 meses)

| Item | Horas | Taxa/h | Subtotal |
|------|-------|--------|----------|
| Blockchain dev (Rust) | 300h | R$ 150 | R$ 45.000 |
| Backend dev (Node/Prisma) | 120h | R$ 120 | R$ 14.400 |
| Frontend dev (React/TS) | 150h | R$ 100 | R$ 15.000 |
| DevOps (infra/deploy) | 80h | R$ 130 | R$ 10.400 |
| **TOTAL Desenvolvimento** | | | **R$ 84.800** |

---

### Audit e Segurança

| Item | Custo |
|------|-------|
| Code review (3 devs externos, 40h cada) | R$ 18.000 |
| Bug bounty (pool inicial) | R$ 20.000 |
| Penetration testing | R$ 8.000 |
| **TOTAL Audit** | **R$ 46.000** |

---

### Infraestrutura (4 meses)

| Item | Mensal | 4 meses |
|------|--------|---------|
| 3 Validators | R$ 600 | R$ 2.400 |
| 1 RPC node | R$ 300 | R$ 1.200 |
| Monitoramento (Datadog/New Relic) | R$ 200 | R$ 800 |
| Backups (S3/Wasabi) | R$ 100 | R$ 400 |
| **TOTAL Infra** | | **R$ 4.800** |

---

### Outros

| Item | Custo |
|------|-------|
| Documentação técnica (redator) | R$ 5.000 |
| Design UI/UX (revisão) | R$ 8.000 |
| Marketing inicial (anúncio) | R$ 10.000 |
| Buffer (15% para imprevistos) | R$ 23.670 |
| **TOTAL Outros** | **R$ 46.670** |

---

### 🎯 TOTAL GERAL: **R$ 182.270**

**Comparado com estimativa original:**
- Estimativa anterior: R$ 105k-170k (mínimo viável)
- Orçamento detalhado: R$ 182k
- Diferença: +R$ 12k-77k

**Por que a diferença?**
- Estimativa anterior não incluiu renomeação BZR (nova demanda)
- Bug bounty aumentado (R$ 20k vs R$ 10k original)
- Infra mais robusta (3 validators vs 1)
- Buffer realista de 15%

---

## 📈 FUNDING ESPERADO vs CUSTO

| Cenário | Funding | Custo | Lucro |
|---------|---------|-------|-------|
| Conservador (0.25 BZR/ZARI) | R$ 525k | R$ 182k | +R$ 343k |
| Realista (0.30 BZR/ZARI) | R$ 630k | R$ 182k | +R$ 448k |
| Otimista (0.40 BZR/ZARI) | R$ 840k | R$ 182k | +R$ 658k |

**ROI:** 188% - 361%

✅ **Projeto viável financeiramente mesmo com orçamento ajustado**

---

## 🎬 COMO COMEÇAR (PRIMEIRA SEMANA)

### Dia 1-2: Setup
- [ ] Criar branch `feature/zari-implementation`
- [ ] Atualizar dependências Rust/Node
- [ ] Setup testnet local limpo
- [ ] Criar projeto Excalidraw/Figma para diagramas

### Dia 3-4: Análise detalhada renomeação BZR
- [ ] Ler documento `PROPOSTA-RENOMEAR-BZR.md` (a ser criado)
- [ ] Validar lista de arquivos a modificar
- [ ] Criar checklist de testes
- [ ] Backup de testnet atual

### Dia 5: Kickoff meeting
- [ ] Revisar roadmap com time
- [ ] Distribuir responsabilidades
- [ ] Alinhar expectativas
- [ ] Definir canais de comunicação

---

## 📚 DOCUMENTOS RELACIONADOS

1. **PROPOSTA-RENOMEAR-BZR.md** ← Leia PRIMEIRO (próximo documento)
2. **ANALISE-MOEDA-NATIVA.md** - Análise técnica detalhada do estado atual
3. **../fase001-final/zari/01-ANALISE-DEMANDA-ZARI.md** - Análise original ZARI
4. **../fase001-final/zari/DECISOES-URGENTES.md** - Decisões aprovadas

---

## ✅ PRÓXIMA AÇÃO IMEDIATA

**Você solicitou:** "Apenas me apresente, não implementar nada por enquanto"

**Status atual:** ✅ Documento de próximos passos completo

**Próximo passo recomendado:**
1. **Revisar** documento `PROPOSTA-RENOMEAR-BZR.md` (será criado a seguir)
2. **Aprovar** orçamento de R$ 182k
3. **Decidir** se quer começar já ou aguardar
4. **Alocar** recursos (devs, tempo)

---

**Aguardando sua aprovação para:**
- [ ] Prosseguir com criação do documento PROPOSTA-RENOMEAR-BZR.md
- [ ] Começar implementação (Semana 1: Renomeação BZR)
- [ ] Manter apenas em modo planejamento

---

*Documento criado em: 27/Out/2025*
*Última atualização: 27/Out/2025*
