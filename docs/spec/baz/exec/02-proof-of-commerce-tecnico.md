# Bazari - Documento Executivo
## 02. Proof of Commerce (PoC) — Especificação Técnica Completa

---

## Índice
1. [Visão Geral do Protocolo](#1-visão-geral-do-protocolo)
2. [Problemas de Fraude Resolvidos](#2-problemas-de-fraude-resolvidos)
3. [Entidades e Papéis](#3-entidades-e-papéis)
4. [Primitivos do Protocolo](#4-primitivos-do-protocolo)
5. [Provas Criptográficas e Âncoras](#5-provas-criptográficas-e-âncoras)
6. [Máquina de Estados](#6-máquina-de-estados)
7. [Fluxos Essenciais](#7-fluxos-essenciais)
8. [Sistema de Afiliados](#8-sistema-de-afiliados)
9. [Sistema de Reputação](#9-sistema-de-reputação)
10. [Economia e Segurança](#10-economia-e-segurança)
11. [Invariantes de Protocolo](#11-invariantes-de-protocolo)
12. [Exemplos Práticos Detalhados](#12-exemplos-práticos-detalhados)
13. [Hardening do Módulo de Disputas](#13-hardening-do-módulo-de-disputas)

---

## 1. Visão Geral do Protocolo

### 1.1 A Ideia Central

O **Proof of Commerce** substitui confiança por provas matemáticas. Cada pedido no marketplace Bazari cria um **micro-consenso** entre as partes envolvidas:

- **Comprador** (Buyer)
- **Lojista** (Seller)
- **Entregador** (Courier)
- **Afiliados** (Affiliates) - opcional

```
┌─────────────────────────────────────────────────────┐
│          PEDIDO = MICRO-CONSENSO                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Buyer cria Order + deposita BZR em Escrow         │
│         ↓                                           │
│  Seller aceita                                      │
│         ↓                                           │
│  Courier assume (deposita stake)                    │
│         ↓                                           │
│  HandoffProof: Seller + Courier co-assinam         │
│         ↓                                           │
│  DeliveryProof: Courier + Buyer co-assinam         │
│         ↓                                           │
│  PoCEngine valida QUÓRUM                            │
│         ↓                                           │
│  Split automático:                                  │
│    • Seller recebe preço do produto                 │
│    • Courier recebe frete                           │
│    • Affiliates recebem comissões                   │
│    • DAO recebe taxa                                │
│         ↓                                           │
│  Reputações atualizadas                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.2 Quórum Mínimo

O protocolo exige **atestados co-assinados** nas etapas críticas:

| Etapa | Signatários Requeridos | Prova Gerada |
|-------|------------------------|--------------|
| `ORDER_CREATED` | Buyer (implícito pelo escrow) | Transação on-chain |
| `HANDOFF` | Seller + Courier | HandoffProof |
| `DELIVERED` | Courier + Buyer | DeliveryProof |

**Regra Fundamental**: Sem o quórum mínimo de atestados válidos, não há liquidação. O escrow permanece bloqueado ou o caso vai para disputa.

### 1.3 Descentralização Radical

- **Não há autoridade central** para aprovar/negar pedidos
- **Não há custódia de fundos** por empresa (apenas smart contracts)
- **Não há decisões arbitrárias** — apenas execução determinística de regras
- **Disputas** são resolvidas por júri descentralizado (jurors com stake) selecionado por aleatoriedade verificável (VRF)

---

## 2. Problemas de Fraude Resolvidos

O PoC foi projetado para neutralizar **todos os vetores comuns de fraude** em marketplaces. Abaixo, cada fraude é mapeada com:
- Cenário real
- Defesa do PoC
- Mecanismo técnico
- Efeito econômico

---

### 2.1 Fraude: "Produto Não Recebido" (Buyer Fraud)

#### Cenário Real
Comprador recebe o produto mas afirma que não chegou, tentando reembolso ou chargeback social.

#### Defesa PoC

**Prova Necessária**: `DeliveryProof` co-assinado por **Courier + Buyer**

```json
{
  "order_id": "0x1a2b3c...",
  "step": "DELIVERED",
  "timestamp": "2025-10-28T14:32:00Z",
  "geo": {"lat": -23.5505, "lon": -46.6333, "accuracy": 10},
  "media_cid": "QmXyz...",  // IPFS: foto da entrega
  "signature_method": "photo_capture_with_recipient",
  "observation": "Entregue ao morador, assinado digitalmente",
  "signers": [
    {"account_id": "5Courier...", "signature": "0xabc..."},
    {"account_id": "5Buyer...", "signature": "0xdef..."}
  ]
}
```

**Âncora On-Chain**: Apenas o `payload_hash` (Blake2-256 do JSON acima) é gravado na blockchain.

**Mecanismo**:
1. Sem a assinatura do Buyer, o pedido não finaliza automaticamente
2. Se o Buyer assina no momento da entrega, qualquer alegação posterior de "não recebimento" é contraprova fraca
3. Júri pode comparar timestamp, geo e mídia em caso de disputa

#### Efeito Econômico
- **Chargeback social eliminado**: Prova criptográfica > palavra contra palavra
- **Custo de fraude**: Se o Buyer abrir disputa infundada, perde reputação e pode ter stake exigido em compras futuras

---

### 2.2 Fraude: "Entreguei, Mas Cliente Não Confirma" (Courier/Seller Fraud)

#### Cenário Real
Lojista ou entregador alegam entrega sem comprovação do destinatário, tentando liberar pagamento unilateralmente.

#### Defesa PoC

**Finalização Requer**: `DELIVERED = Courier + Buyer`

**Mecanismo**:
- Sem co-assinatura do Buyer, o escrow **não é liberado**
- Se o Buyer está ausente e o Courier entrega a terceiro (ex.: porteiro), deve registrar:
  - Foto do recebedor
  - Assinatura digital ou captura do rosto
  - Observação no payload: "left with doorman - photo attached"
  - Isso ancora via hash

**Exceção**: Timeout + evidência fotográfica pode acionar disputa automática para júri avaliar

#### Efeito Econômico
- **Liberação unilateral impedida**: Courier não pode "fingir entrega" sozinho
- **Incentivo para boas práticas**: Courier tem interesse em capturar provas robustas para evitar disputas

---

### 2.3 Fraude: "Produto Diferente/Defeituoso" (Seller Quality Fraud)

#### Cenário Real
- Item trocado (enviou chinelo em vez de tênis)
- Lacre violado
- Defeito oculto

#### Defesa PoC

**Duas Provas Cruzadas**:

1. **HandoffProof** (Seller + Courier) — captura **estado do pacote na retirada**
   - Foto do lacre
   - Número de série visível
   - Peso/dimensões

2. **DeliveryProof** (Courier + Buyer) — captura **estado no recebimento**
   - Foto do pacote recebido
   - Condição do lacre
   - Assinatura de recebimento

**Mecanismo de Atribuição de Responsabilidade**:

```
HandoffProof mostra: lacre INTACTO, produto correto
DeliveryProof mostra: lacre VIOLADO, produto diferente
        ↓
Responsabilidade: COURIER (dano no trajeto)
        ↓
Slashing do stake do Courier
Compensação ao Buyer
Seller recebe pagamento
```

```
HandoffProof mostra: lacre VIOLADO
        ↓
Responsabilidade: SELLER (produto já saiu errado)
        ↓
Escrow retorna ao Buyer
Slashing de reputação do Seller
```

#### Efeito Econômico
- **Rastreabilidade completa**: Divergências entre provas identificam exatamente onde ocorreu o problema
- **Responsabilização objetiva**: Júri tem evidências timestamped e imutáveis

---

### 2.4 Fraude: "Golpe do Intermediário" (Man-in-the-Middle Social)

#### Cenário Real
Alguém se passa por lojista ou entregador legítimo e tenta capturar pagamento fora do app (ex.: "me pague por PIX que é mais rápido").

#### Defesa PoC

**Pagamento Reconhecido APENAS se**:
- Escrow on-chain em BZR
- Identidades dos papéis são contas verificadas on-chain
- Split só ocorre com atestados válidos com assinaturas das contas cadastradas

**Identidades Podem Ter**:
- DID (Decentralized Identifier)
- Verifiable Credentials emitidos por comunidades (ex.: "Entregador verificado pela Cooperativa X")
- Reputação pública (PoC Score visível)

#### Efeito Econômico
- **Transações fora do protocolo não liberam fundos**
- **Golpista não pode forjar assinaturas** (chaves privadas das contas legítimas)
- **Usuários educados**: "Pagamento só vale se for pelo app"

---

### 2.5 Fraude: "Spam de Afiliados" (Affiliate Inflation)

#### Cenário Real
Cadeia artificial de compartilhamentos para inflar comissões (ex.: 30 contas falsas em série para capturar mais % da comissão).

#### Defesa PoC

**Mecanismo: Merkle Proof + DAG de Campanha**

1. Seller cria campanha com parâmetros:
   - Taxa de comissão total (ex.: 5%)
   - Cap de hops (máximo 5 níveis)
   - Decay por nível (ex.: 50% do anterior)

2. Cada compartilhamento gera nó no DAG; root do DAG é publicado on-chain

3. Order inclui `AffiliatePath` (Merkle proof do caminho completo)

4. `finalize()` valida:
   ```
   - Merkle proof é válido contra root publicado?
   - Hops <= cap configurado?
   - Cada afiliado tem stake/reputação mínima?
   - Não há loops (mesmo account_id repetido)?
   ```

5. Se válido, split percorre o caminho e distribui comissões com decay

#### Efeito Econômico
- **Somente caminhos pré-anunciados** (root publicado) recebem comissão
- **Spam desincentivado**: Exige stake mínimo por afiliado; fraude queima stake
- **Transparência**: Qualquer um pode auditar caminhos via Merkle proof

---

### 2.6 Fraude: "Conluio Entre Partes" (Collusion)

#### Cenário Real
- Buyer + Seller combinam criar pedidos falsos para drenar incentivos/airdrops
- Buyer + Courier tentam lesar Seller (alegam não recebimento sendo cúmplices)

#### Defesa PoC

**Mecanismos Cruzados**:

1. **Múltiplas Co-Assinaturas Cruzadas**
   - Handoff: Seller + Courier
   - Delivery: Courier + Buyer
   - Nenhuma dupla pode finalizar sozinha

2. **Stake & Slashing**
   - Courier deposita stake (ex.: 10-30% do valor do pedido)
   - Seller pode ter stake opcional para alto valor
   - Fraude comprovada = perda de stake

3. **Reputação por Papel**
   - SellerScore, CourierScore, BuyerScore são independentes
   - Padrões suspeitos (mesmas contas sempre trabalhando juntas + alto índice de disputas) podem acionar auditoria

4. **Amostragem Aleatória (Fase 2)**
   - Pedidos de alto valor podem ter auditoria por jurors mesmo sem disputa aberta
   - Seleção por VRF (imprevisível)

#### Efeito Econômico
- **Custo de fraudar > ganho esperado**
   - Stake perdido + reputação destruída + ban temporário
- **Fraudes recorrentes**:
   - Aumento progressivo de stake exigido
   - Limitação de valor máximo por pedido para contas de baixa reputação

---

## 3. Entidades e Papéis

### 3.1 Participantes Principais

| Papel | Descrição | Responsabilidades | Incentivos |
|-------|-----------|-------------------|------------|
| **Buyer** | Comprador final | • Criar Order<br>• Depositar escrow<br>• Co-assinar DeliveryProof | • Receber produto<br>• Reputação para compras futuras |
| **Seller** | Comerciante/Lojista | • Aceitar Order<br>• Co-assinar HandoffProof<br>• Entregar produto ao Courier | • Receber pagamento instantâneo<br>• Construir reputação |
| **Courier** | Entregador | • Depositar stake<br>• Co-assinar Handoff e Delivery<br>• Transportar produto | • Receber frete<br>• Construir PoC Score<br>• Stake devolvido |
| **Affiliate** | Indicador/Influencer | • Compartilhar produto<br>• Gerar conversões | • Comissão por venda<br>• Reputação de conversão |

### 3.2 Entidades de Governança

| Papel | Função | Seleção |
|-------|--------|---------|
| **Juror** | Resolve disputas | VRF (aleatório) entre stakers |
| **Arbiter** | Mesmo que Juror | (termos intercambiáveis) |
| **BazariDAO** | Governa parâmetros do protocolo | Token holders (BZR) |

**Importante**: DAO **não decide pedidos individuais**. Apenas define:
- % de taxas
- Timeouts
- Stakes mínimos
- Destinos de fundos (Tesouro, incentivos)

---

## 4. Primitivos do Protocolo

### 4.1 Pallets Núcleo (Fase 1)

O protocolo é implementado como módulos (pallets) em Substrate:

#### `pallet-order`
- **Função**: Gerencia ciclo de vida do pedido
- **Storage**:
  - `Orders<OrderId, OrderData>`: estado atual, partes envolvidas, valores
  - `OrderHistory<OrderId, Vec<StateTransition>>`: log de mudanças
- **Extrinsics**:
  - `create_order(product, quantity, price, escrow_amount)`
  - `accept_order(order_id)`
  - `cancel_order(order_id, reason)`

#### `pallet-escrow`
- **Função**: Guarda BZR até conclusão do pedido
- **Storage**:
  - `Locks<OrderId, Balance>`: fundos bloqueados
  - `Releases<OrderId, Vec<(AccountId, Balance)>>`: destinatários pendentes
- **Extrinsics**:
  - `deposit(order_id, amount)` — Buyer bloqueia fundos
  - `release(order_id)` — split automático após finalize
  - `slash(order_id, account_id, amount)` — penalidade

#### `pallet-attestation`
- **Função**: Ancora provas (hashes) e valida signatários
- **Storage**:
  - `Attestations<OrderId, Step, AttestationData>`
    ```rust
    struct AttestationData {
        payload_hash: H256,
        signers: Vec<(AccountId, Signature)>,
        timestamp: BlockNumber,
        metadata: BoundedVec<u8>  // opcional: geo, IPFS CIDs
    }
    ```
- **Extrinsics**:
  - `submit_attestation(order_id, step, payload_hash, signatures)`

#### `pallet-fulfillment`
- **Função**: Matching de Courier + gestão de stake
- **Storage**:
  - `Couriers<AccountId, CourierProfile>`
  - `CourierStakes<OrderId, (AccountId, Balance)>`
  - `LogisticStatus<OrderId, FulfillmentState>`
- **Extrinsics**:
  - `apply_as_courier(order_id)`
  - `assign_courier(order_id, courier_account)` — Seller escolhe
  - `deposit_stake(order_id, amount)`

#### `pallet-affiliate`
- **Função**: DAG de comissões + Merkle proofs
- **Storage**:
  - `Campaigns<CampaignId, CampaignConfig>`
  - `AffiliateRoots<CampaignId, MerkleRoot>`
  - `AffiliatePayouts<OrderId, Vec<(AccountId, Balance)>>`
- **Extrinsics**:
  - `create_campaign(rate, max_hops, decay)`
  - `submit_affiliate_path(order_id, merkle_proof)`

#### `pallet-fee`
- **Função**: Cálculo e destino de taxas
- **Storage**:
  - `FeeConfig`: % para DAO, Tesouro, pools de incentivo
- **Extrinsics**:
  - `set_fee_config(new_config)` — DAO governance

---

### 4.2 Pallets de Robustez (Fase 1.2)

#### `pallet-reputation`
- **Função**: Pontuação por papel com decay temporal
- **Storage**:
  - `SellerScores<AccountId, Score>`
  - `CourierScores<AccountId, Score>`
  - `BuyerScores<AccountId, Score>`
  - `AffiliateScores<AccountId, Score>`
- **Inputs**:
  - Conclusões sem disputa (+)
  - SLAs cumpridos (+)
  - Disputas perdidas (-)
  - Slashes (---)
- **Outputs**:
  - Score 0-1000
  - Gates dinâmicos (valor máx. por pedido, stake exigido)

#### `pallet-dispute`
- **Função**: Gestão de disputas + júri
- **Storage**:
  - `Disputes<OrderId, DisputeData>`
    ```rust
    struct DisputeData {
        opened_by: AccountId,
        opened_at: BlockNumber,
        jurors: Vec<AccountId>,
        votes: Vec<(AccountId, Vote, Justification)>,
        ruling: Option<Ruling>,
    }
    ```
  - `JurorPool<Vec<AccountId>>`: stakers elegíveis
- **Extrinsics**:
  - `open_dispute(order_id, reason, evidence_cids)`
  - `vote_on_dispute(order_id, vote, justification_hash)`
  - `finalize_dispute(order_id)` — aplica ruling

---

### 4.3 Steps Canônicos

```rust
enum OrderStep {
    ORDER_CREATED,
    ACCEPTED,
    HANDOFF_SELLER_TO_COURIER,
    IN_TRANSIT,
    DELIVERED_COURIER_TO_BUYER,
    FINALIZED,
    RETURNED,
    CANCELLED,
    DISPUTE_OPENED,
    RULING_APPLIED,
}
```

---

## 5. Provas Criptográficas e Âncoras

### 5.1 Recibos Co-Assinados (Off-Chain)

**Formato JSON** (exemplo HandoffProof):

```json
{
  "order_id": "0x1a2b3c4d5e6f...",
  "step": "HANDOFF_SELLER_TO_COURIER",
  "timestamp": "2025-10-28T10:15:00Z",
  "geo": {
    "lat": -23.5505,
    "lon": -46.6333,
    "accuracy_meters": 5
  },
  "media": [
    {
      "type": "photo",
      "cid": "QmAbC123...",
      "description": "Pacote lacrado com etiqueta visível"
    }
  ],
  "product_condition": {
    "seal": "intact",
    "weight_kg": 1.2,
    "dimensions_cm": [30, 20, 10]
  },
  "observation": "Produto conferido, lacre OK",
  "signers": [
    {
      "role": "Seller",
      "account_id": "5Seller123...",
      "signature": "0xabc123def456...",
      "signature_method": "sr25519"
    },
    {
      "role": "Courier",
      "account_id": "5Courier456...",
      "signature": "0xdef789ghi012...",
      "signature_method": "sr25519"
    }
  ],
  "device_attestation": {
    "platform": "iOS",
    "integrity_token": "eyJhbGc...",
    "app_version": "1.2.3"
  }
}
```

### 5.2 Âncora On-Chain

Apenas o **payload_hash** (Blake2-256 do JSON acima) é gravado na blockchain:

```rust
pallet_attestation::Attestations::insert(
    order_id,
    OrderStep::HANDOFF_SELLER_TO_COURIER,
    AttestationData {
        payload_hash: blake2_256(&json_bytes),
        signers: vec![
            (seller_account, signature_seller),
            (courier_account, signature_courier),
        ],
        timestamp: current_block,
        metadata: Some(b"ipfs:QmAbC123..."),
    }
);
```

### 5.3 Privacidade e Verificabilidade

**Dados Off-Chain** (IPFS ou storage comunitário):
- Mídias (fotos, vídeos)
- PII (endereços completos, nomes)
- Metadados detalhados

**Dados On-Chain**:
- Hashes (imutáveis)
- Assinaturas (verificáveis)
- Timestamps (ordem temporal)

**Benefício**:
- ✅ Verificabilidade: Qualquer um pode recomputar hash e checar assinatura
- ✅ Privacidade: Dados sensíveis não vazam na blockchain pública
- ✅ Eficiência: Blockchain não fica sobrecarregada com GBs de fotos

**Fase 3 (ZK-PoD)**:
- Prova de conhecimento zero de que a entrega ocorreu em região autorizada **sem revelar coordenadas exatas**

---

## 6. Máquina de Estados

### 6.1 Diagrama Simplificado

```
┌──────────────┐
│   CREATED    │ ← Buyer cria Order + Escrow
└──────┬───────┘
       │ Seller aceita
       ↓
┌──────────────┐
│   ACCEPTED   │ ← Courier aplica + deposita stake
└──────┬───────┘
       │ HandoffProof (Seller+Courier)
       ↓
┌──────────────┐
│  IN_TRANSIT  │
└──────┬───────┘
       │ DeliveryProof (Courier+Buyer)
       ↓
┌──────────────┐
│  DELIVERED   │
└──────┬───────┘
       │ PoCEngine valida quórum
       ↓
┌──────────────┐
│  FINALIZED   │ ← Split, reputações ↑, eventos
└──────────────┘

       (qualquer falha)
            ↓
┌──────────────┐
│   DISPUTE    │ → Jurors → RULING → aplicação
└──────────────┘
```

### 6.2 Condições de Transição

| De | Para | Condição | Ação On-Chain |
|----|------|----------|---------------|
| `CREATED` | `ACCEPTED` | Seller chama `accept_order` | Atualiza `Order.seller_accepted = true` |
| `ACCEPTED` | `HANDOFF` | Courier selecionado + stake depositado | `CourierStakes.insert(order, (courier, stake))` |
| `HANDOFF` | `IN_TRANSIT` | `submit_attestation(HANDOFF)` com Seller+Courier | Valida signers, ancora hash |
| `IN_TRANSIT` | `DELIVERED` | `submit_attestation(DELIVERED)` com Courier+Buyer | Valida signers, ancora hash |
| `DELIVERED` | `FINALIZED` | `finalize(order_id)` + quórum válido | Split escrow, retorna stake, atualiza rep |
| `*` | `DISPUTE` | Timeout OU assinaturas conflitantes OU parte chama `open_dispute` | Cria `Dispute`, seleciona jurors |
| `DISPUTE` | `RULING_APPLIED` | Jurors votam + `finalize_dispute` | Aplica ruling (release/refund + slashing) |

---

## 7. Fluxos Essenciais

### 7.1 Fluxo Feliz (Compra → Entrega → Liquidação)

**Passo a Passo**:

1. **Buyer Cria Order**
   ```rust
   Order::create_order(
       origin = Buyer,
       product_id,
       quantity,
       price = 100 BZR,
       escrow_amount = 100 BZR
   )
   ```
   - Escrow trava 100 BZR da conta do Buyer
   - Evento: `OrderCreated(order_id, buyer, seller, amount)`

2. **Seller Aceita**
   ```rust
   Order::accept_order(origin = Seller, order_id)
   ```
   - `Order.status = ACCEPTED`
   - Notificação para couriers disponíveis

3. **Courier Aplica e Deposita Stake**
   ```rust
   Fulfillment::apply_as_courier(origin = Courier, order_id)
   Fulfillment::deposit_stake(origin = Courier, order_id, stake = 20 BZR)
   ```
   - Seller escolhe Courier (ou sistema auto-assign por reputação)
   - `CourierStakes.insert(order, (courier, 20 BZR))`

4. **Handoff: Seller Entrega ao Courier**
   - BazChat abre tela de co-assinatura
   - Seller e Courier tiram foto do pacote
   - App gera JSON, ambos assinam
   - App chama:
   ```rust
   Attestation::submit_attestation(
       origin = Either(Seller ou Courier),
       order_id,
       step = HANDOFF,
       payload_hash,
       signatures = [(Seller, sig1), (Courier, sig2)]
   )
   ```
   - Validação on-chain: signers corretos? hash válido?
   - `Order.status = IN_TRANSIT`

5. **Delivery: Courier Entrega ao Buyer**
   - BazChat abre tela de co-assinatura
   - Courier e Buyer tiram foto/assinatura de recebimento
   - App gera JSON, ambos assinam
   - App chama:
   ```rust
   Attestation::submit_attestation(
       origin = Either(Courier ou Buyer),
       order_id,
       step = DELIVERED,
       payload_hash,
       signatures = [(Courier, sig1), (Buyer, sig2)]
   )
   ```
   - `Order.status = DELIVERED`

6. **Finalização Automática**
   ```rust
   PoCEngine::finalize(order_id)
   ```
   - Valida que existe:
     - `ORDER_CREATED` (implícito)
     - `HANDOFF` com Seller+Courier
     - `DELIVERED` com Courier+Buyer
   - Se válido:
     - Split escrow:
       - Seller: 100 BZR (preço produto)
       - Courier: 15 BZR (frete)
       - Affiliates: 5 BZR (comissão 5%)
       - DAO: 2 BZR (taxa 2%)
     - Retorna stake do Courier (20 BZR)
     - Atualiza reputações:
       - `SellerScore += 10`
       - `CourierScore += 10`
       - `BuyerScore += 1` (não deu no-show)
   - Evento: `OrderFinalized(order_id, splits)`

**Tempo Total**: Segundos (confirmação de 2 blocos Substrate, ~12s)

---

### 7.2 Fluxo de Disputa

**Trigger**: Qualquer das condições:
- Timeout sem atestado (ex.: 7 dias sem DELIVERED)
- Assinaturas conflitantes
- Parte chama `open_dispute` explicitamente

**Passo a Passo**:

1. **Abertura**
   ```rust
   Dispute::open_dispute(
       origin = Buyer | Seller | Courier,
       order_id,
       reason = "Product damaged",
       evidence_cids = ["QmEvidence1", "QmEvidence2"]
   )
   ```
   - `Order.status = DISPUTE_OPENED`
   - Evento: `DisputeOpened(order_id, opener, reason)`

2. **Seleção de Jurors (Fase 2: VRF)**
   ```rust
   // VRF gera aleatoriedade verificável
   let random_seed = VRF::get_randomness(block_number, order_id);
   let jurors = JurorPool::select_random(7, random_seed);

   Dispute::assign_jurors(order_id, jurors)
   ```
   - Jurors são notificados
   - Prazo para análise: 48h

3. **Análise de Evidências**
   Jurors recebem:
   - Hashes on-chain de todas as attestations
   - CIDs IPFS das mídias
   - Timeline do pedido
   - Scorecards pré-computados (Fase 3: IA assistiva)

4. **Voto Commit-Reveal (anti-suborno)**
   - **Commit**: Juror envia hash do voto
   ```rust
   Dispute::commit_vote(
       origin = Juror,
       order_id,
       vote_hash = blake2_256(vote || salt)
   )
   ```
   - **Reveal**: Após todos commitarem, revela voto
   ```rust
   Dispute::reveal_vote(
       origin = Juror,
       order_id,
       vote = RefundBuyer,  // ou ReleaseSeller
       salt,
       justification_hash
   )
   ```

5. **Ruling**
   ```rust
   Dispute::finalize_dispute(order_id)
   ```
   - Contabiliza votos (maioria simples ou supermaioria 2/3)
   - Aplica ruling:
     - **RefundBuyer**: Escrow retorna ao Buyer; Slashing de Seller/Courier se culpa comprovada
     - **ReleaseSeller**: Split normal; Slashing de reputação do Buyer
     - **Partial**: Split proporcional
   - Atualiza reputações de todos (incluindo jurors: acertaram ou não?)
   - Evento: `DisputeResolved(order_id, ruling, slashes)`

**Tempo Total**: 2-7 dias (dependendo de complexidade)

---

## 8. Sistema de Afiliados

### 8.1 Modelo DAG + Merkle Trees

**Problema**: Como provar cadeia de compartilhamento sem armazenar gigabytes on-chain?

**Solução**: Directed Acyclic Graph (DAG) off-chain + Merkle root on-chain

```
Campanha criada por Seller:
  - Taxa: 5%
  - Max hops: 5
  - Decay: 50% por nível

DAG de compartilhamentos:
Seller (root)
  ├─ Affiliate1 (nível 1, 2.5%)
  │   ├─ Affiliate2 (nível 2, 1.25%)
  │   └─ Affiliate3 (nível 2, 1.25%)
  └─ Affiliate4 (nível 1, 2.5%)
      └─ Affiliate5 (nível 2, 1.25%)

Merkle Root = Hash(todos os nós e arestas)
→ Publicado on-chain
```

### 8.2 Inclusão no Order

Quando Buyer compra via link de Affiliate5:

```rust
Order::create_order_with_affiliate(
    ...
    affiliate_path = MerkleProof {
        campaign_id,
        path: [Affiliate1, Affiliate2, Affiliate5],
        proof: [hash1, hash2, hash3],  // siblings necessários
        root: 0xabc123...  // corresponde ao publicado
    }
)
```

### 8.3 Validação e Split

```rust
fn validate_and_split_affiliates(order: &Order) -> Result<Vec<(AccountId, Balance)>, Error> {
    let campaign = Campaigns::get(order.affiliate_path.campaign_id)?;

    // 1. Valida Merkle proof
    ensure!(
        verify_merkle_proof(
            order.affiliate_path.proof,
            order.affiliate_path.root,
            order.affiliate_path.path
        ),
        "Invalid Merkle proof"
    );

    // 2. Verifica hops <= max
    ensure!(
        order.affiliate_path.path.len() <= campaign.max_hops,
        "Exceeded max hops"
    );

    // 3. Verifica stakes/reputação mínima
    for affiliate in &order.affiliate_path.path {
        ensure!(
            AffiliateScores::get(affiliate) >= campaign.min_score,
            "Affiliate below min reputation"
        );
    }

    // 4. Calcula splits com decay
    let total_commission = order.amount * campaign.rate / 100;
    let mut payouts = Vec::new();
    let mut remaining = total_commission;

    for (level, affiliate) in order.affiliate_path.path.iter().enumerate() {
        let share = remaining * campaign.decay_per_level.pow(level);
        payouts.push((affiliate.clone(), share));
        remaining -= share;
    }

    Ok(payouts)
}
```

### 8.4 Anti-Spam

- **Stake mínimo**: Cada afiliado precisa ter X BZR travado
- **Reputação mínima**: AffiliateScore >= threshold
- **Detecção de loops**: Mesmo account_id não pode aparecer 2x no caminho
- **Limite de hops**: Configurable por campanha (típico: 3-5)

---

## 9. Sistema de Reputação

### 9.1 PoC Score por Papel

Cada entidade tem score independente para cada papel que desempenha:

| Score | Range | Significado |
|-------|-------|-------------|
| **SellerScore** | 0-1000 | Qualidade de produtos, tempo de confirmação, taxa de disputas |
| **CourierScore** | 0-1000 | Pontualidade, cuidado com produtos, taxa de sucesso |
| **BuyerScore** | 0-1000 | Confiabilidade (não dá no-show), não abre disputas frívolas |
| **AffiliateScore** | 0-1000 | Taxa de conversão real (vs. spam) |

### 9.2 Inputs do Score

```rust
struct ReputationInputs {
    // Positivos
    successful_completions: u32,      // +10 por pedido sem disputa
    on_time_deliveries: u32,          // +5 se entrega dentro do SLA
    positive_feedback: u32,           // +3 por avaliação 5 estrelas

    // Negativos
    disputes_opened_against: u32,     // -20 por disputa aberta contra você
    disputes_lost: u32,               // -50 se júri decide contra você
    timeouts: u32,                    // -15 por timeout (não respondeu)
    slashes: Balance,                 // -100 por 1% do stake slashado

    // Temporal
    last_activity: BlockNumber,       // Decay se ficar inativo
    account_age: BlockNumber,         // Bônus por longevidade
}
```

### 9.3 Fórmula (simplificada)

```rust
fn calculate_score(inputs: ReputationInputs) -> u32 {
    let base = 500;  // Score inicial

    let positive = inputs.successful_completions * 10
                 + inputs.on_time_deliveries * 5
                 + inputs.positive_feedback * 3;

    let negative = inputs.disputes_opened_against * 20
                 + inputs.disputes_lost * 50
                 + inputs.timeouts * 15
                 + (inputs.slashes / UNIT) as u32 * 100;

    let decay = if inputs.last_activity < current_block - DECAY_THRESHOLD {
        (current_block - inputs.last_activity) / DECAY_FACTOR
    } else {
        0
    };

    let age_bonus = min(inputs.account_age / AGE_FACTOR, 50);

    let score = base + positive - negative - decay + age_bonus;

    score.clamp(0, 1000)
}
```

### 9.4 Uso dos Scores

**Gates Dinâmicos**:

| Score | Valor Máx/Pedido | Stake Courier Exigido | Visibilidade |
|-------|------------------|----------------------|--------------|
| 0-200 | 50 BZR | 50% do valor | Baixa no ranking |
| 200-500 | 500 BZR | 20% do valor | Média |
| 500-800 | 5000 BZR | 10% do valor | Alta |
| 800-1000 | Sem limite | 5% do valor | Destaque no marketplace |

**Seleção Preferencial**:
- Couriers com score alto aparecem primeiro nas buscas
- Sellers com score alto têm produtos promovidos
- Afiliados com score alto recebem taxas de comissão maiores

---

## 10. Economia e Segurança

### 10.1 Escrow Obrigatório

**Regra de Ouro**: Sem escrow, não há handoff.

```rust
fn accept_order(origin, order_id) -> DispatchResult {
    let order = Orders::get(order_id)?;

    ensure!(
        Escrow::Locks::contains_key(order_id),
        "Escrow must be deposited before acceptance"
    );

    ensure!(
        Escrow::Locks::get(order_id) >= order.total_amount,
        "Insufficient escrow"
    );

    // ... restante da lógica
}
```

### 10.2 Stake de Courier

**Propósito**: Skin in the game + colateral para slashing

**Cálculo Dinâmico**:
```rust
fn calculate_required_stake(order_value: Balance, courier_score: u32) -> Balance {
    let base_rate = 0.2;  // 20%
    let score_factor = (1000 - courier_score) / 1000;  // quanto menor score, maior stake

    let rate = base_rate * (1.0 + score_factor);
    order_value * rate
}
```

**Exemplo**:
- Order de 100 BZR
- Courier com score 800 (alto)
- Stake exigido: 100 * 0.2 * (1 + 0.2) = 24 BZR

- Courier com score 300 (baixo)
- Stake exigido: 100 * 0.2 * (1 + 0.7) = 34 BZR

### 10.3 Slashing

**Cenários de Slashing**:

| Infração | Penalidade | Quem Perde |
|----------|-----------|------------|
| Handoff forjado (prova falsa) | 50-100% do stake | Courier |
| Delivery não realizada (culpa provada) | 30-50% do stake | Courier |
| Produto trocado/defeituoso | Perda de reputação + possível ban | Seller |
| Disputa frívola (má-fé comprovada) | Taxa de disputa não devolvida + rep-- | Buyer |
| Juror vota contra evidências óbvias | 20% do stake de juror | Juror |

**Slashing é Progressivo**:
```rust
fn calculate_slash_amount(
    base_stake: Balance,
    infraction_severity: u8,  // 1-10
    repeat_offender: bool
) -> Balance {
    let severity_factor = infraction_severity as f64 / 10.0;
    let repeat_multiplier = if repeat_offender { 2.0 } else { 1.0 };

    (base_stake * severity_factor * repeat_multiplier).min(base_stake)
}
```

### 10.4 Fees (Taxas)

**Configuração DAO-governed**:

```rust
struct FeeConfig {
    dao_fee_percent: u8,           // ex.: 2%
    treasury_percent: u8,          // ex.: 1%
    juror_pool_percent: u8,        // ex.: 0.5%
    burn_percent: u8,              // ex.: 0.5% (deflação)
}
```

**Distribuição no `finalize()`**:
```rust
let total = escrow_amount;
let dao_fee = total * config.dao_fee_percent / 100;
let treasury_fee = total * config.treasury_percent / 100;
// ...

Escrow::transfer(dao_account, dao_fee);
Escrow::transfer(treasury_account, treasury_fee);
Escrow::burn(total * config.burn_percent / 100);
```

---

## 11. Invariantes de Protocolo

**Invariantes** são propriedades que **nunca** podem ser violadas. Se forem, o protocolo está comprometido.

### 11.1 Invariantes Econômicos

1. **Conservação de Valor**
   ```
   ∑(Escrow bloqueados) + ∑(Stakes de couriers) = ∑(Saldos antes dos locks)
   ```
   - Nenhum BZR pode ser criado ou destruído fora de mint/burn autorizados

2. **Split Total Correto**
   ```
   Após finalize():
   Seller recebido + Courier recebido + Affiliates recebidos + Taxas = Escrow original
   ```

3. **Stake Sempre Retornado (se sem culpa)**
   ```
   Se Courier não foi slashado ⇒ Stake é devolvido integralmente
   ```

### 11.2 Invariantes de Autorização

4. **Apenas Signers Válidos Podem Atestar**
   ```
   submit_attestation(HANDOFF, [sigA, sigB]) ⇒
     sigA ∈ {Seller, Courier} ∧ sigB ∈ {Seller, Courier} ∧ sigA ≠ sigB
   ```

5. **Ninguém Recebe Sem Quórum**
   ```
   finalize() só executa se ∃:
     - Attestation(ORDER_CREATED)
     - Attestation(HANDOFF) com [Seller, Courier]
     - Attestation(DELIVERED) com [Courier, Buyer]
   ```

### 11.3 Invariantes de Estado

6. **Idempotência de Finalização**
   ```
   finalize(order_id) chamado 2x ⇒ segunda chamada falha (Order.status já FINALIZED)
   ```

7. **Ordem Monotônica de Steps**
   ```
   DELIVERED não pode ocorrer antes de HANDOFF
   (verificação de timestamp e dependências)
   ```

8. **Timeout Antes de Finalização Forçada**
   ```
   finalize() sem DELIVERED ⇒ Só se timeout expirado OU ruling de disputa
   ```

### 11.4 Invariantes de Segurança

9. **Proteção a Reentrância**
   ```
   finalize() usa mutex on-chain (ex.: status flag):
   if Order.finalizing { return Err(ReentrancyGuard) }
   Order.finalizing = true;
   // ... executa split
   Order.finalizing = false;
   Order.status = FINALIZED;
   ```

10. **Challenge Window**
    ```
    Após DELIVERED, existe janela de 24-48h antes de finalize() automático
    → Permite que partes abram disputas se houver problema
    ```

---

## 12. Exemplos Práticos Detalhados

### 12.1 Caso A: "Entrega no Condomínio"

**Situação**:
- Courier entrega pacote ao porteiro às 14h
- Buyer chega em casa às 20h e afirma não ter recebido

**Provas Coletadas**:

**DeliveryProof**:
```json
{
  "order_id": "0xABC",
  "step": "DELIVERED",
  "timestamp": "2025-10-28T14:00:00Z",
  "geo": {"lat": -23.550, "lon": -46.633},
  "media": [{
    "cid": "QmPhoto1",
    "description": "Pacote com etiqueta #ABC visível"
  }],
  "recipient": {
    "name": "João Silva (Porteiro)",
    "id_type": "CPF_partial",
    "signature_capture": "QmSig1"
  },
  "observation": "Entregue ao porteiro - Buyer ausente",
  "signers": [
    {"account": "5Courier", "sig": "0x..."},
    {"account": "5Buyer", "sig": null}  // Buyer não presente
  ]
}
```

**Ação do Courier**:
- Como Buyer não estava presente, Courier fotografou:
  1. Etiqueta do pacote
  2. Rosto do porteiro (blur automático no app)
  3. Assinatura digital do porteiro
- Submeteu attestation com observação

**Fluxo**:
1. Courier submete DeliveryProof às 14h05
2. Sistema detecta que falta assinatura do Buyer
3. Inicia timer de 48h para Buyer co-assinar OU abrir disputa
4. Buyer às 20h vê notificação no app: "Seu pedido foi entregue ao porteiro"
5. Buyer pode:
   - **Opção A**: Confirmar que retirou (co-assinar tardiamente) → finaliza
   - **Opção B**: Abrir disputa "Não encontrei o pacote"

**Se Disputa é Aberta**:
- Jurors analisam:
  - ✅ Foto da etiqueta corresponde ao order_id
  - ✅ Timestamp e geo corretos (portaria do condomínio)
  - ✅ Porteiro identificado (prática comum)
  - ❌ Buyer não tem contra-evidência (não fotografou ausência do pacote)
- **Ruling**: Release para Seller e Courier (entrega válida)
- **Ação educativa**: Buyer instruído a retirar com portaria

---

### 12.2 Caso B: "Lacre Violado no Trajeto"

**Situação**:
- Seller lacra caixa com produto (tênis Nike)
- Courier transporta
- Buyer recebe caixa amassada com lacre rompido

**Provas**:

**HandoffProof** (Seller → Courier):
```json
{
  "step": "HANDOFF",
  "timestamp": "2025-10-28T09:00:00Z",
  "media": [
    {"cid": "QmLacre1", "description": "Lacre intacto, série #12345"},
    {"cid": "QmCaixa1", "description": "Caixa em perfeito estado"}
  ],
  "product_condition": {
    "seal": "intact",
    "seal_number": "12345",
    "weight_kg": 1.0
  },
  "signers": [
    {"account": "5Seller", "sig": "0x..."},
    {"account": "5Courier", "sig": "0x..."}
  ]
}
```

**DeliveryProof** (Courier → Buyer):
```json
{
  "step": "DELIVERED",
  "timestamp": "2025-10-28T16:00:00Z",
  "media": [
    {"cid": "QmLacre2", "description": "Lacre rompido"},
    {"cid": "QmCaixa2", "description": "Caixa amassada"}
  ],
  "product_condition": {
    "seal": "broken",
    "damage": "box_crushed"
  },
  "observation": "Buyer recusou assinar devido a dano visível",
  "signers": [
    {"account": "5Courier", "sig": "0x..."},
    {"account": "5Buyer", "sig": null}  // Recusa proposital
  ]
}
```

**Fluxo**:
1. Buyer não assina DeliveryProof na hora (recusa)
2. Courier submete attestation com observação de recusa
3. Sistema abre Dispute automática (co-assinatura faltante + dano alegado)
4. Jurors recebem ambas as provas

**Análise do Júri**:
- **HandoffProof** mostra:
  - ✅ Lacre #12345 intacto
  - ✅ Caixa perfeita
  - ✅ Ambos assinaram (Seller e Courier concordam com estado)
- **DeliveryProof** mostra:
  - ❌ Lacre rompido
  - ❌ Caixa amassada
  - 📸 Fotos timestamped provam mudança de estado

**Conclusão**:
- Dano ocorreu **entre HANDOFF e DELIVERY**
- Responsabilidade: **Courier** (único custódia no período)

**Ruling**:
```rust
Ruling::PartialRefund {
    buyer_refund: 100 BZR (valor total),
    seller_payment: 100 BZR (não teve culpa),
    courier_slash: 50 BZR (50% do stake de 100 BZR),
    source: Courier stake + seguro/pool
}
```

**Execução**:
- Buyer recebe 100 BZR de volta
- Seller recebe 100 BZR do escrow
- Courier perde 50 BZR do stake (slashing)
- Courier recebe 50 BZR de volta + reputação -100 pontos
- Se o pool de seguro existir, cobre a diferença; senão, Courier arca sozinho

---

### 12.3 Caso C: "Afiliado Spammer"

**Situação**:
- Spammer cria 30 contas falsas
- Tenta criar cadeia artificial de compartilhamentos para inflar comissão

**Tentativa**:
```
Seller → Fake1 → Fake2 → ... → Fake30 → Buyer
```

**Campanha Configurada**:
```rust
Campaign {
    rate: 5%,
    max_hops: 5,
    decay: 0.5,  // 50% por nível
    min_score: 100,
    min_stake: 10 BZR
}
```

**Order Criado**:
```rust
Order::create_order_with_affiliate(
    affiliate_path = MerkleProof {
        campaign_id: 123,
        path: [Fake1, Fake2, ..., Fake30],  // 30 hops
        proof: [...],
        root: 0xSpamRoot
    }
)
```

**Validação On-Chain**:

```rust
// 1. Verifica Merkle proof
verify_merkle_proof(path, proof, root) ✅ (spammer publicou root)

// 2. Verifica hops
path.len() = 30 > max_hops = 5 ❌
// FALHA: "Exceeded max hops"

// 3. Mesmo que passasse hops, verifica reputação
for fake in path {
    AffiliateScores::get(fake) = 0 < min_score = 100 ❌
}
// FALHA: "Affiliate below min reputation"

// 4. Verifica stakes
for fake in path {
    AffiliateStakes::get(fake) = 0 < min_stake = 10 BZR ❌
}
// FALHA: "Affiliate below min stake"
```

**Resultado**:
- Order é criado, mas `affiliate_path` é rejeitado
- Comissões vão para NULL ou são queimadas
- Spammer não recebe nada
- Se tentou stake com fundos roubados, pode acionar investigação

**Proteção Adicional (Fase 2)**:
- Detecção de padrões (mesmas contas sempre trabalhando juntas)
- Stake slashado se comprovado spam
- Ban de IPs/dispositivos associados

---

## 13. Hardening do Módulo de Disputas

### 13.1 O Vetor Mais Sensível

**Crítica comum**: "Se o júri pode ser subornado ou toma decisões inconsistentes, o PoC falha."

**Resposta**: O módulo de Disputas é a **última linha de defesa**, acionada apenas quando o PoCEngine não consegue decidir automaticamente (~5-10% dos pedidos). Por isso, tem múltiplas camadas de proteção.

---

### 13.2 Mitigações Anti-Suborno

#### A) Seleção Aleatória Verificável (VRF)

**Problema**: Se atacante sabe quem serão os jurors, pode tentar corromper.

**Solução**:
```rust
// Usa VRF (Verifiable Random Function) - imprevisível e verificável
let random_seed = pallet_babe::RandomnessFromOneEpochAgo::<T>::random(&order_id);
let pool = JurorPool::get();  // todos os stakers elegíveis
let selected = select_random_subset(pool, 7, random_seed);
```

**Propriedades**:
- Ninguém pode prever quem será selecionado antes da seleção
- Após seleção, todos podem verificar que foi aleatória (VRF proof)

---

#### B) Commit-Reveal + Voto Secreto

**Problema**: Se jurors votam publicamente, podem ser pressionados a mudar voto.

**Solução**:
```rust
// Fase 1: Commit (juror envia hash do voto)
fn commit_vote(origin, order_id: OrderId, vote_hash: H256) {
    let juror = ensure_signed(origin)?;

    VoteCommits::insert((order_id, juror), VoteCommit {
        hash: vote_hash,
        timestamp: now()
    });
}

// Fase 2: Reveal (após todos commitarem, revela voto)
fn reveal_vote(origin, order_id: OrderId, vote: Vote, salt: Vec<u8>) {
    let juror = ensure_signed(origin)?;
    let commit = VoteCommits::get((order_id, juror))?;

    // Verifica que hash corresponde
    ensure!(
        blake2_256(&(vote, salt)) == commit.hash,
        "Invalid reveal"
    );

    Votes::insert((order_id, juror), vote);
}
```

**Propriedades**:
- Durante commit, ninguém sabe o voto de ninguém
- Impossível mudar voto depois do commit (hash travou)
- Revelação prova que o voto é o mesmo que foi commitado

---

#### C) Payout Diferido com Meta-Dispute

**Problema**: Mesmo com commit-reveal, suborno pode acontecer antes do commit.

**Solução**:
```rust
// Após ruling, recompensas de jurors ficam time-locked
fn finalize_dispute(order_id: OrderId) {
    let ruling = calculate_ruling(order_id)?;
    apply_ruling(order_id, ruling);

    // Recompensas travadas por 7 dias
    for juror in Disputes::get(order_id).jurors {
        JurorPayouts::insert(juror, Payout {
            amount: calculate_reward(juror, ruling),
            unlock_at: now() + 7 * DAYS
        });
    }

    // Janela para Meta-Dispute
    MetaDisputeWindow::insert(order_id, now() + 7 * DAYS);
}

// Qualquer parte pode abrir Meta-Dispute se apresentar prova de colusão
fn open_meta_dispute(
    origin,
    order_id: OrderId,
    evidence_of_collusion: Vec<u8>  // ex.: mensagens de chat vazadas
) {
    ensure!(now() < MetaDisputeWindow::get(order_id), "Window closed");

    // Nova rodada com jurors diferentes
    // Se procedente: slashing dos jurors originais + ban
}
```

---

#### D) Multi-Rodadas com Custo Crescente (Escada de Apelação)

**Problema**: Parte perdedora pode tentar subornar júri de apelação.

**Solução**:
```rust
struct DisputeLevel {
    level: u8,           // 1, 2, 3
    juror_count: u32,    // 7, 21, 63
    stake_required: Balance,  // 10 BZR, 50 BZR, 200 BZR
}

// Primeira rodada: 7 jurors
// Apelação nível 1: 21 jurors (3x mais) + stake 5x maior
// Apelação nível 2: 63 jurors (9x mais) + stake 20x maior

// Custo de subornar cresce geometricamente
// Atacante precisaria corromper maioria de 63 jurors com 200 BZR cada
// = 126.000 BZR de risco para reverter decisão
```

---

#### E) Amostragem Estratificada

**Problema**: Jurors de mesma região/grupo podem ter viés ou coordenar.

**Solução**:
```rust
// Seleciona jurors de diferentes shards geográficos/demográficos
fn select_stratified_jurors(pool: Vec<AccountId>, count: u32) -> Vec<AccountId> {
    let shards = stratify_by_geo_and_reputation(pool);

    let per_shard = count / shards.len();
    let mut selected = Vec::new();

    for shard in shards {
        selected.extend(
            select_random_subset(shard, per_shard, random_seed())
        );
    }

    selected
}
```

---

### 13.3 Qualidade das Evidências

#### A) Padrões de Captura Obrigatórios

**App força**:
- Watermark com order_id, timestamp, signatário
- QR code efêmero para validação cruzada
- Device attestation (SafetyNet/Play Integrity)

```json
{
  "media_cid": "QmPhoto",
  "watermark": {
    "order_id": "0xABC",
    "timestamp": "2025-10-28T14:00:00Z",
    "captured_by": "5Courier...",
    "qr_nonce": "xyz123"
  },
  "device_attestation": {
    "platform": "Android",
    "integrity_token": "eyJhbGc...",
    "verdict": "MEETS_DEVICE_INTEGRITY"
  }
}
```

---

#### B) Provas de Localização Robustas

**Multi-sensor fusion**:
```rust
struct LocationProof {
    gps: Coordinates,
    wifi_bssids: Vec<String>,      // roteadores detectados
    cell_tower_ids: Vec<u32>,      // torres de celular
    bluetooth_beacons: Vec<String>, // beacons BLE
    accuracy_meters: f64,
    timestamp: u64
}

// Validação cruzada: todos os sensores devem concordar com mesma região
fn validate_location(proof: LocationProof, expected_region: Region) -> bool {
    gps_matches(proof.gps, expected_region)
    && wifi_matches(proof.wifi_bssids, expected_region)
    && cell_matches(proof.cell_tower_ids, expected_region)
}
```

**Fase 3: ZK-PoD**
```
Courier prova:
  "Eu estava em um raio de 500m do endereço X no horário Y"
  SEM revelar coordenadas exatas

Via Zero-Knowledge Proof verificável on-chain
```

---

#### C) Bundles Probatórios Versionados

**Schema de evidência**:
```json
{
  "version": "1.2.0",
  "required_fields": [
    "handoff_photo_with_seal",
    "delivery_photo_with_recipient",
    "geo_proof",
    "timestamps"
  ],
  "optional_fields": [
    "video_sequence",
    "witness_signature"
  ],
  "fraud_indicators": [
    "timestamp_manipulation",
    "geo_spoofing",
    "photoshop_detection"
  ]
}
```

**Jurors recebem checklist**:
```
✅ Foto do lacre presente?
✅ Timestamp coerente com handoff anterior?
✅ Geo dentro da tolerância?
⚠️ Foto mostra sinais de edição?
```

---

#### D) Pre-Scoring Automático

**Fase 3: IA Assistiva**

```rust
struct PreScore {
    overall: u8,  // 0-100
    confidence: f64,
    breakdown: {
        timestamp_validity: u8,
        geo_consistency: u8,
        media_authenticity: u8,
        signature_validity: u8
    },
    red_flags: Vec<String>,  // ex.: ["GPS jump detected", "Seal number mismatch"]
    explanation: String  // "Delivery proof is strong: all sensors agree, media unedited"
}

// Jurors veem o pre-score, mas mantêm decisão final
```

**Treinamento da IA**:
- Dataset público de disputas resolvidas
- Labels: rulings finais + justificativas
- Modelo: Explicabilidade obrigatória (LIME/SHAP)

---

#### E) Auditoria Pública

**Todo ruling grava**:
```rust
struct RulingRecord {
    order_id: OrderId,
    ruling: Ruling,
    jurors: Vec<AccountId>,  // anonimizados por hash, mas rastreáveis por DAO
    evidence_hashes: Vec<H256>,
    votes: Vec<(VoteHash, Vote)>,  // commit/reveal preservados
    pre_score: PreScore,
    timestamp: BlockNumber
}

// Qualquer um pode auditar:
// - Coerência de rulings similares
// - Taxa de acerto de jurors individuais
// - Desvios do pre-score (jurors ignoraram IA?)
```

---

### 13.4 Parâmetros de Segurança

**Configuração Recomendada (Fase 2)**:

```rust
struct DisputeConfig {
    // Stakes
    stake_juror_min: Balance = 100 BZR,
    stake_juror_percent_of_order: f64 = 0.1,  // 10% do valor do pedido

    // Slashing
    slashing_wrong_vote: f64 = 0.3,  // 30% do stake
    slashing_no_show: f64 = 0.5,     // 50% do stake
    slashing_collusion: f64 = 1.0,   // 100% do stake + ban

    // Quóruns
    jurors_first_level: u32 = 7,
    jurors_appeal_level1: u32 = 21,
    jurors_appeal_level2: u32 = 63,
    supermajority_threshold: f64 = 0.66,  // 2/3

    // Timeouts
    commit_window: BlockNumber = 24 * HOURS,
    reveal_window: BlockNumber = 24 * HOURS,
    payout_lock: BlockNumber = 7 * DAYS,
    meta_dispute_window: BlockNumber = 7 * DAYS,

    // Apelações
    max_appeals: u8 = 2,
    appeal_stake_multiplier: f64 = 5.0,  // 5x o stake do nível anterior
}
```

---

### 13.5 Conclusão: Disputas como Última Linha

**Defesa em Profundidade**:

```
Camada 1: Quórum PoC (95% dos casos)
    ↓ falha
Camada 2: Timeouts + evidência automática
    ↓ falha
Camada 3: Dispute com 7 jurors + VRF + commit-reveal
    ↓ apelação
Camada 4: 21 jurors + custo 5x maior
    ↓ apelação final
Camada 5: 63 jurors + IA assistiva + DAO oversight
```

**Custo de Ataque**:
- Subornar maioria de 7 jurors: ~500 BZR (arriscado)
- Subornar maioria de 21 jurors: ~2.500 BZR + risco de meta-dispute
- Subornar maioria de 63 jurors: ~12.000 BZR + alta probabilidade de detecção + ban permanente

**Para a maioria dos pedidos (< 500 BZR)**: custo de ataque > valor do pedido → economicamente irracional.

---

## Próximos Documentos

- **[03-dores-mercado-solucoes.md](./03-dores-mercado-solucoes.md)**: Análise das dores do mercado tradicional e como Bazari resolve
- **[04-modulos-ecossistema.md](./04-modulos-ecossistema.md)**: Descrição completa de cada módulo do ecossistema
- **[05-arquitetura-implementacao.md](./05-arquitetura-implementacao.md)**: Arquitetura técnica detalhada e pallets Substrate
- **[06-roadmap-evolucao.md](./06-roadmap-evolucao.md)**: Roadmap de 3 fases e evolução futura (ZK-PoD, BLS, IA)

---

**Bazari Proof of Commerce** — Confiança substituída por matemática, trabalho verificado por criptografia.
