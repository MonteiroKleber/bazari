# Bazari - Documento Executivo
## 06. Roadmap e Evolução Futura

---

## Índice
1. [Visão Geral das Fases](#1-visão-geral-das-fases)
2. [Fase 1: MVP PoC](#2-fase-1-mvp-poc)
3. [Fase 2: Cripto-Evolução](#3-fase-2-cripto-evolução)
4. [Fase 3: Privacidade e Escala](#4-fase-3-privacidade-e-escala)
5. [Além da Fase 3](#5-além-da-fase-3)
6. [Métricas de Sucesso](#6-métricas-de-sucesso)
7. [Riscos e Mitigações](#7-riscos-e-mitigações)

---

## 1. Visão Geral das Fases

### 1.1 Timeline

```
2025 Q1-Q2 ────────► FASE 1: MVP PoC
                     • PoC funcional end-to-end
                     • Testnet público
                     • 1.000 early adopters

2025 Q3-Q4 ────────► FASE 2: Cripto-Evolução
                     • BLS agregada, VRF, DID/VC
                     • Mainnet beta
                     • 50.000 usuários

2026 Q1-Q4 ────────► FASE 3: Privacidade & Escala
                     • ZK-PoD, sharding, IA assistiva
                     • Mainnet v1.0
                     • 1.000.000+ usuários

2027+ ─────────────► Expansão Global
                     • Multi-chain, cross-border
                     • Integração IoT/supply chain
                     • Protocolo padrão do comércio
```

---

## 2. Fase 1: MVP PoC

### 2.1 Objetivo

**Provar que o Proof of Commerce funciona**: Executar o fluxo feliz completo (criação de pedido → entrega → liquidação) com segurança básica e ancoragem de provas.

### 2.2 Entregas Técnicas

#### 2.2.1 Blockchain (BazariChain)

| Componente | Descrição | Status Meta |
|------------|-----------|-------------|
| **Pallets Core** | order, escrow, attestation, fulfillment, affiliate, fee | ✅ Completo |
| **Quórum PoC** | ORDER_CREATED, HANDOFF (Seller+Courier), DELIVERED (Courier+Buyer) | ✅ Completo |
| **Escrow & Split** | Pagamento BZR, distribuição automática | ✅ Completo |
| **Reputação Inicial** | SellerScore, CourierScore, BuyerScore (incremento simples) | ✅ Completo |
| **Dispute Básico** | Abertura manual, júri simples (sem VRF ainda) | ⏳ 70% |

#### 2.2.2 Frontend & UX

| Módulo | Funcionalidades | Status Meta |
|--------|----------------|-------------|
| **Marketplace** | Busca, produto, checkout, rastreamento | ✅ Completo |
| **BazChat** | Chat 1-on-1, co-assinatura de provas (2 cliques) | ✅ Completo |
| **Wallet** | Criar conta, ver saldo, enviar/receber BZR | ✅ Completo |
| **Minhas Lojas** | Listar produtos, aceitar pedidos | ✅ Completo |
| **Virar Entregador** | Cadastro, ver pedidos, candidatar-se | ✅ Completo |

#### 2.2.3 Infraestrutura

| Serviço | Tecnologia | Status Meta |
|---------|-----------|-------------|
| **Testnet** | 3 validator nodes + RPC público | ✅ Rodando |
| **IPFS** | Gateway público para mídias | ✅ Rodando |
| **Indexer** | SubQuery para consultas rápidas | ✅ Rodando |
| **API** | GraphQL (Apollo) | ✅ Rodando |

---

### 2.3 Milestone: Primeira Transação Real

**Meta**: 10 pedidos completos (criação → entrega → split) em testnet com usuários reais.

**Critérios de Sucesso**:
- ✅ 10 Orders finalizados sem falha
- ✅ Tempo médio de finalização < 24h (da criação ao split)
- ✅ 100% dos splits corretos (seller, courier, afiliado, DAO)
- ✅ Provas (Handoff/Delivery) ancoradas e verificáveis
- ✅ Zero bugs críticos (exploits, fundos perdidos)

**Data Alvo**: Março 2025

---

### 2.4 Lançamento Testnet Público

**O Que Entregar**:
- Frontend acessível: testnet.bazari.network
- Faucet: Usuários podem pegar BZR grátis para testar
- Explorer: Visualizar blocos, transações, orders on-chain
- Documentação: Guias de uso para vendedores/entregadores/compradores
- Suporte: Canal Discord/Telegram para dúvidas

**Meta de Usuários**: 1.000 early adopters testando

**Data Alvo**: Abril 2025

---

### 2.5 Feedback & Iteração

**Q2 2025**: Coletar feedback intensivo.

**Métricas a Monitorar**:
- Taxa de conclusão de pedidos (meta: >90%)
- Taxa de disputas (meta: <5%)
- Tempo médio de entrega (meta: <3 dias)
- NPS (Net Promoter Score) de vendedores e compradores (meta: >50)

**Ajustes Esperados**:
- UX: Simplificar co-assinatura se houver fricção
- Taxas: Ajustar % se usuários reclamarem
- Timeouts: Aumentar se entregas demorarem mais que esperado
- Bugs: Corrigir todos os edge cases encontrados

---

## 3. Fase 2: Cripto-Evolução

### 3.1 Objetivo

**Elevar a segurança, eficiência e confiabilidade** do protocolo com técnicas criptográficas avançadas e verificação de identidade.

### 3.2 Entregas Técnicas

#### 3.2.1 Assinaturas BLS Agregadas

**Problema**: Múltiplas assinaturas por step aumentam custo de tx e latência.

**Solução**:
```rust
// Antes (Fase 1):
Attestation {
    signers: [
        (seller, sig_seller),   // 64 bytes
        (courier, sig_courier), // 64 bytes
    ]
    // Total: 128 bytes de assinaturas
}

// Depois (Fase 2):
Attestation {
    signers: [seller, courier],
    aggregated_signature: bls_aggregate([sig_seller, sig_courier]),  // 48 bytes
}
// Total: 48 bytes (62% redução)
```

**Benefícios**:
- Redução de custo de tx (menos bytes on-chain)
- Validação mais rápida (uma verificação vs. múltiplas)
- Escalabilidade (importante para Fase 3 com sharding)

**Timeline**: Q3 2025

---

#### 3.2.2 VRF para Seleção de Jurors

**Problema**: Seleção de jurors previsível = risco de suborno.

**Solução**:
```rust
// VRF (Verifiable Random Function) - imprevisível mas verificável
fn select_jurors(dispute_id: DisputeId, pool: Vec<AccountId>) -> Vec<AccountId> {
    let seed = pallet_babe::RandomnessFromOneEpochAgo::<T>::random(&dispute_id);
    let mut selected = Vec::new();

    for i in 0..7 {
        let index = u64::from_le_bytes(seed[i*8..(i+1)*8].try_into().unwrap()) % pool.len() as u64;
        selected.push(pool[index as usize].clone());
    }

    selected
}

// VRF Proof publicado on-chain → qualquer um pode verificar aleatoriedade
```

**Benefícios**:
- Impossível prever quem serão os jurors antes da seleção
- Impossível manipular seleção (VRF é determinístico dado o seed)
- Transparência total (proof verificável)

**Timeline**: Q3 2025

---

#### 3.2.3 Commit-Reveal para Votos

**Problema**: Votos públicos permitem coordenação/pressão entre jurors.

**Solução**:
```rust
// Fase 1: Commit (juror envia hash)
fn commit_vote(juror: AccountId, dispute_id: DisputeId, vote_hash: H256) {
    VoteCommits::insert((dispute_id, juror), VoteCommit {
        hash: vote_hash,
        committed_at: now(),
    });
}

// Fase 2: Reveal (após deadline de commits)
fn reveal_vote(juror: AccountId, dispute_id: DisputeId, vote: Vote, salt: Vec<u8>) {
    let commit = VoteCommits::get((dispute_id, juror)).unwrap();
    ensure!(blake2_256(&(vote, salt)) == commit.hash, "Invalid reveal");

    Votes::insert((dispute_id, juror), vote);
}
```

**Benefícios**:
- Ninguém sabe voto de ninguém durante commit phase
- Impossível mudar voto após commit (hash trava)
- Reduz colusão e compra de votos

**Timeline**: Q3 2025

---

#### 3.2.4 DID/VC (Decentralized Identifiers / Verifiable Credentials)

**Problema**: Como diferenciar vendedores legítimos de scammers sem KYC centralizado?

**Solução**:
```rust
// Seller pode ter múltiplas credenciais verificáveis
struct VerifiableCredential {
    issuer: DID,           // Ex.: did:bazari:cooperativaArtesanal
    subject: AccountId,    // Seller account
    claim_type: ClaimType, // Ex.: "MemberOfCooperative", "CPFVerified"
    proof: Signature,      // Assinatura do issuer
    issued_at: Timestamp,
    expires_at: Option<Timestamp>,
}

enum ClaimType {
    MemberOfCooperative(CoopId),
    CPFVerified,
    AddressVerified,
    EcoFriendly,           // Carbono neutro
    FairTrade,
}
```

**Benefícios**:
- Vendedores verificados por comunidades ganham badge
- Comprador vê: "@ModaAutoral ✅ (3 verificações)"
- Sem KYC centralizado (cada comunidade emite VCs)
- Vendedor controla quais VCs expor

**Timeline**: Q4 2025

---

#### 3.2.5 Reputação Avançada com Decay

**Problema**: Reputação Fase 1 é cumulativa (nunca desce naturalmente).

**Solução**:
```rust
// Score decai com inatividade
fn calculate_score_with_decay(account: AccountId, role: Role) -> u32 {
    let base_score = Scores::get((account, role)).unwrap_or(500);
    let last_activity = LastActivity::get((account, role)).unwrap_or(0);
    let blocks_inactive = now() - last_activity;

    let decay_per_month = 10; // -10 pontos/mês de inatividade
    let months_inactive = blocks_inactive / (30 * DAYS);
    let decay_total = decay_per_month * months_inactive;

    base_score.saturating_sub(decay_total)
}
```

**Benefícios**:
- Incentiva atividade contínua
- Contas abandonadas/hackeadas perdem score automaticamente
- Score reflete confiabilidade recente (não apenas histórico)

**Timeline**: Q4 2025

---

### 3.3 Mainnet Beta

**Q4 2025**: Lançamento do Mainnet Beta com todos os recursos da Fase 2.

**Diferença de Testnet**:
- BZR tem valor real (listado em DEXs)
- Stakes e slashing são reais ($ em risco)
- Validadores profissionais (não apenas testnet voluntários)

**Meta de Usuários**: 50.000 ativos

**Economia Inicial**:
- Supply inicial: 100.000.000 BZR
- Distribuição:
  - 40% Comunidade (airdrops, incentivos)
  - 30% Tesouro DAO
  - 20% Equipe/Early Contributors (vesting 4 anos)
  - 10% Investors (vesting 2 anos)

---

## 4. Fase 3: Privacidade e Escala

### 4.1 Objetivo

**Maximizar privacidade, escalar para milhões de usuários e reduzir dependência humana** em disputas com IA assistiva.

### 4.2 Entregas Técnicas

#### 4.2.1 ZK-PoD (Zero-Knowledge Proof of Delivery)

**Problema**: DeliveryProof expõe localização exata do comprador (privacidade).

**Solução**:
```rust
// Courier gera ZK proof:
// "Eu estava dentro do polígono P (bairro/região) no timestamp T"
// SEM revelar coordenadas exatas (lat, lon)

struct ZKPoD {
    region_commitment: H256,   // Hash do polígono autorizado
    timestamp: Timestamp,
    proof: ZKProof,            // Prova Groth16/PLONK
}

// On-chain verifier:
fn verify_zkpod(zkpod: &ZKPoD, order: &Order) -> bool {
    // Verifica que proof é válido
    verify_zk_proof(&zkpod.proof, &public_inputs) &&
    // Verifica que commitment corresponde à região do order
    zkpod.region_commitment == order.delivery_region_commitment
}
```

**Implementação**:
- Circuit: Circom/ZoKrates
- Proving system: Groth16 (proofs pequenos, 128-256 bytes)
- Verifier on-chain: Pallet nativo Substrate

**Benefícios**:
- Comprador não revela endereço exato on-chain
- Courier prova que entregou na região certa
- Privacidade forte mantém verificabilidade

**Timeline**: Q2 2026

---

#### 4.2.2 Sharded Queues (Escala)

**Problema**: Com 1M+ usuários, matching de couriers global fica lento.

**Solução**:
```rust
// Dividir rede em shards geográficos
enum Shard {
    BrazilSoutheast,  // SP, RJ, MG, ES
    BrazilSouth,      // RS, SC, PR
    BrazilNortheast,  // BA, PE, CE, ...
    // ...
}

// Order criado em SP:
fn create_order(...) {
    let shard = determine_shard(seller_location);
    ShardedOrders::insert(shard, order_id, order);

    // Notifica apenas couriers do shard relevante
    notify_couriers_in_shard(shard, order_id);
}
```

**Benefícios**:
- Reduz latência (courier só vê pedidos da região)
- Escala horizontal (cada shard pode ter próprio indexer)
- Mantém descentralização (shards se comunicam via XCM/Polkadot)

**Timeline**: Q3 2026

---

#### 4.2.3 IA Assistiva para Disputas

**Problema**: Disputas complexas demoram (júri humano precisa analisar muita evidência).

**Solução**:
```rust
// IA pré-analisa evidências e gera scorecard
struct AIAssessment {
    overall_score: u8,        // 0-100 (confiança na entrega válida)
    confidence: f64,          // 0.0-1.0
    breakdown: {
        timestamp_validity: u8,
        geo_consistency: u8,
        media_authenticity: u8,
        signature_validity: u8,
    },
    red_flags: Vec<String>,   // Ex.: ["GPS jump detected", "Photo edited"]
    explanation: String,      // "Delivery proof is strong because..."
}

// Jurors recebem assessment como ponto de partida
// MAS decisão final continua humana
```

**Treinamento da IA**:
- Dataset: Disputas resolvidas no Mainnet (10.000+)
- Features: Hashes de provas, metadados (timestamps, geo), rulings
- Modelo: Ensemble (XGBoost + Neural Network)
- Explicabilidade: SHAP values para cada decisão

**Benefícios**:
- Reduz tempo de disputa de 7 dias para 2-3 dias
- Aumenta consistência (humanos têm viés, IA é objetiva)
- Jurors focam em casos ambíguos (IA filtra óbvios)

**Timeline**: Q4 2026

---

#### 4.2.4 Canais de Pagamento (Micropagamentos)

**Problema**: Courier que faz 50 entregas/dia paga 50 taxas de tx.

**Solução**:
```rust
// Canal de pagamento off-chain entre Marketplace e Courier
struct PaymentChannel {
    marketplace: AccountId,
    courier: AccountId,
    balance: Balance,         // Depositado on-chain
    nonce: u64,
    settled_amount: Balance,  // Quanto já foi sacado
}

// Cada entrega:
// 1. Marketplace assina recibo off-chain: "Courier merece +15 BZR (nonce: 42)"
// 2. Courier guarda recibo (não submete on-chain ainda)
// 3. No fim do dia, Courier submete recibo final on-chain
//    → Saca 750 BZR (50 entregas × 15 BZR) em uma única tx
```

**Benefícios**:
- Reduz custo de tx 50x
- Liquidação instantânea (recibos assinados são como dinheiro)
- Escalabilidade (blockchain não vê 50 txs, apenas 1)

**Timeline**: Q4 2026

---

### 4.3 Mainnet v1.0

**Q4 2026**: Lançamento oficial do Mainnet v1.0 com todos os recursos das 3 fases.

**Meta de Usuários**: 1.000.000 ativos
**Meta GMV**: R$ 1 bilhão/ano em transações

**Auditoria Final**:
- Trail of Bits (smart contracts)
- Kudelski Security (infraestrutura)
- Bug bounty: $500k em prêmios

---

## 5. Além da Fase 3

### 5.1 Multi-Chain (Interoperabilidade)

**Visão**: Bazari não fica preso a uma blockchain.

**Implementação**:
- **Polkadot Parachain**: BazariChain vira parachain (segurança compartilhada)
- **Bridges**: ETH, BNB, Solana via pontes (Wormhole, Axelar)
- **IBC (Inter-Blockchain Communication)**: Integração com Cosmos

**Benefício**: Usuários podem pagar com ETH/USDC/SOL, protocolo converte para BZR automaticamente.

**Timeline**: 2027

---

### 5.2 Cross-Border Commerce

**Visão**: Comprar de qualquer país sem fricção cambial/alfandegária.

**Implementação**:
- **Stablecoins multi-moeda**: USDC, EURC, BRLA (Real tokenizado)
- **Oráculos de câmbio**: Chainlink para taxas de conversão
- **Compliance**: Integração com sistemas alfandegários (automação de declaração)

**Exemplo**:
```
Comprador na Alemanha compra artesanato do Brasil
    ↓
Paga em EURC (Euro stablecoin)
    ↓
Protocolo converte para BZR automaticamente
    ↓
Vendedor recebe BRZ (Real tokenizado) via P2P
    ↓
Entrega internacional via courier local (Brasil) + courier local (Alemanha)
    ↓
Handoff 1: Seller (BR) → Courier Brasil
Handoff 2: Courier Brasil → Hub Internacional
Handoff 3: Hub → Courier Alemanha
Delivery: Courier Alemanha → Buyer
```

**Timeline**: 2028

---

### 5.3 IoT & Supply Chain

**Visão**: Integrar dispositivos IoT para provas automáticas.

**Exemplos**:

**A) Smart Locks (Trancas Inteligentes)**:
```
Pacote chega em locker inteligente
    ↓
Locker gera assinatura criptográfica automaticamente
    ↓
Comprador abre locker com QR code do app
    ↓
DeliveryProof gerado sem intervenção humana
```

**B) RFID/NFC Tags**:
```
Produto tem tag NFC
    ↓
Cada scan (Seller → Courier → Buyer) gera attestation
    ↓
Timeline completa e imutável do produto
```

**C) Temperature Sensors (Alimentos)**:
```
Produto perecível tem sensor de temperatura
    ↓
Sensor envia dados para IPFS a cada hora
    ↓
Se temperatura sair da faixa (2-8°C), alerta automático
    ↓
Disputa automática se produto chegar estragado
```

**Timeline**: 2029+

---

### 5.4 Protocolo como Padrão da Indústria

**Visão**: Bazari PoC vira **ISO/padrão aberto** para liquidação de comércio.

**Adoção Potencial**:
- Cooperativas de entregadores adotam PoC como protocolo interno
- Governos usam PoC para compras públicas (transparência)
- Marketplaces tradicionais (MercadoLivre?) integram PoC como opção

**Analogia**: HTTP para web, PoC para comércio.

**Timeline**: 2030+

---

## 6. Métricas de Sucesso

### 6.1 KPIs por Fase

| Métrica | Fase 1 (Q2 2025) | Fase 2 (Q4 2025) | Fase 3 (Q4 2026) |
|---------|------------------|------------------|------------------|
| **Usuários Ativos** | 1.000 | 50.000 | 1.000.000 |
| **GMV Mensal** | R$ 50k | R$ 5M | R$ 100M |
| **Pedidos/Dia** | 10 | 500 | 10.000 |
| **Taxa de Finalização** | >85% | >90% | >95% |
| **Taxa de Disputas** | <10% | <5% | <2% |
| **NPS Vendedores** | >40 | >60 | >70 |
| **NPS Compradores** | >50 | >70 | >80 |
| **Uptime da Rede** | >95% | >99% | >99.9% |

---

### 6.2 North Star Metric

**GMV (Gross Merchandise Value)**: Volume total de transações no protocolo.

**Meta 2030**: R$ 10 bilhões/ano
- Equivalente a 6% do e-commerce brasileiro (projetado para 2030)
- Ou 1 milhão de usuários gastando R$ 10.000/ano

---

## 7. Riscos e Mitigações

### 7.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Bug crítico (exploits)** | Média | Catastrófico | Auditoria extensiva, bug bounty, testnet longo |
| **Escalabilidade (não aguenta 1M users)** | Baixa | Alto | Sharding, canais de pagamento, testnet de carga |
| **UX complexa (usuários não entendem cripto)** | Alta | Médio | Abstrair wallet, onboarding guiado, suporte 24/7 |
| **Latência de tx (>1min para confirmar)** | Baixa | Médio | Substrate é rápido (6s), otimizar RPC |

---

### 7.2 Riscos de Adoção

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Vendedores não migram (lock-in MercadoLivre)** | Alta | Alto | Incentivos (cashback BZR), educação, caso de sucesso |
| **Compradores não confiam em cripto** | Alta | Alto | Stablecoins, garantia de reembolso, marketing |
| **Entregadores preferem iFood/Rappi** | Média | Médio | Mostrar ganho real (+36%), flexibilidade |
| **Regulação (governo proíbe cripto)** | Baixa | Catastrófico | Lobby, compliance, stablecoins reguladas |

---

### 7.3 Riscos Econômicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **BZR perde valor (crash de mercado)** | Média | Alto | Stablecoins como opção, P2P robusto |
| **Taxas de gas sobem (Substrate cobra caro)** | Baixa | Médio | Optimizar pallets, subsidiar gas para novatos |
| **Pool de jurors insuficiente** | Média | Médio | Incentivos fortes (10% de stake slashado vai para júri) |

---

### 7.4 Plano de Contingência

**Se houver exploit catastrófico**:
1. Pausar rede (emergency stop via DAO)
2. Investigação forense (48h)
3. Fork da chain (se necessário)
4. Compensação de vítimas (treasury DAO)
5. Auditoria pós-mortem
6. Upgrade de runtime com fix

**Se adoção for lenta (<10% da meta)**:
1. Pivotar para nicho específico (ex.: artesanato, alimentos orgânicos)
2. Subsídios temporários (taxa zero por 6 meses)
3. Marketing agressivo (influencers, eventos)
4. Parcerias estratégicas (cooperativas, ONGs)

---

## Conclusão

O roadmap Bazari é **ambicioso mas executável**. Cada fase constrói sobre a anterior, e as metas são mensuráveis.

**Fase 1**: Provar o conceito (Q2 2025)
**Fase 2**: Fortalecer segurança (Q4 2025)
**Fase 3**: Escalar com privacidade (Q4 2026)
**Além**: Dominar o comércio global (2027-2030)

**Visão de Longo Prazo**: Em 2030, quando alguém perguntar "como você vende online?", a resposta natural será: **"Uso Bazari, claro. É descentralizado, taxas são mínimas e eu controlo minha reputação."**

---

## Documentos Relacionados

- **[01-visao-geral-e-contexto.md](./01-visao-geral-e-contexto.md)**: Contexto histórico e problemas que Bazari resolve
- **[02-proof-of-commerce-tecnico.md](./02-proof-of-commerce-tecnico.md)**: Especificação técnica completa do PoC
- **[03-dores-mercado-solucoes.md](./03-dores-mercado-solucoes.md)**: Análise de dores e soluções
- **[04-modulos-ecossistema.md](./04-modulos-ecossistema.md)**: Descrição de cada módulo
- **[05-arquitetura-implementacao.md](./05-arquitetura-implementacao.md)**: Arquitetura técnica e pallets

---

**Bazari** — O futuro do comércio é descentralizado, verificável e justo.
**Vamos construí-lo juntos.** 🚀
