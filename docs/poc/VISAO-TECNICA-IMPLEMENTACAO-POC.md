# VISÃO TÉCNICA: Implementação do Proof of Commerce (PoC)

**Data**: 2025-10-28
**Versão**: 1.0
**Status**: 🎯 ESPECIFICAÇÃO DE IMPLEMENTAÇÃO
**Autor**: Claude Code Agent

---

## 📋 SUMÁRIO EXECUTIVO

Este documento apresenta a **visão técnica detalhada** de como implementar o protocolo **Proof of Commerce (PoC)** no ecossistema Bazari, considerando a arquitetura existente e propondo um plano de execução em **3 fases iterativas**.

### Objetivo Principal

Transformar o sistema atual de marketplace (baseado em confiança intermediada) em um **protocolo descentralizado** onde:

1. **Provas criptográficas** (co-assinaturas) substituem confiança em autoridades
2. **Escrow on-chain** protege todas as partes automaticamente
3. **Quórum de atestados** libera pagamentos de forma determinística
4. **Disputas descentralizadas** (jurors + stake) resolvem exceções
5. **Reputação on-chain** incentiva comportamento honesto

### Abordagem Estratégica

✅ **Incremental**: 3 fases com MVPs funcionais
✅ **Compatível**: Aproveitar infraestrutura existente
✅ **Segura**: Testnet rigorosa antes de cada fase
✅ **Escalável**: Arquitetura preparada para ZK + BLS + IA

---

## 🏗️ ARQUITETURA GERAL

### Visão em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 7: GOVERNANÇA (DAO)                                  │
│  → Parâmetros: fees, timeouts, stakes                       │
│  → Destinos de taxa: Tesouro, Jurors, Incentivos            │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 6: APLICAÇÃO (DApp)                                  │
│  → UI/UX: Stepper, Co-assinatura, Disputas                  │
│  → Wallet: Polkadot.js Extension                            │
│  → Chat: Propostas e negociação E2EE                         │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 5: MENSAGERIA P2P (libp2p/gossipsub)                 │
│  → Troca de recibos off-chain                                │
│  → Sincronização de provas                                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 4: BACKEND API (Fastify + Prisma)                    │
│  → PoCEngine: Coordenação de estados                         │
│  → Services: Attestation, Fulfillment, Dispute               │
│  → Workers: Timeouts, Reputação, Stats                       │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 3: STORAGE OFF-CHAIN                                 │
│  → PostgreSQL: Estado mutável (orders, users)                │
│  → IPFS: Mídias e JSONs de provas (imutável)                 │
│  → S3/FS: Backups e cache                                    │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 2: PALLETS PoC (Substrate FRAME)                     │
│  → pallet-order: Ciclo de vida do pedido                     │
│  → pallet-escrow: Lock/release de fundos                     │
│  → pallet-attestation: Âncoras de provas                     │
│  → pallet-fulfillment: Matching de couriers                  │
│  → pallet-affiliate: DAG de comissões                        │
│  → pallet-fee: Split automático                              │
│  → pallet-dispute: Jurors + VRF + Ruling                     │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 1: BLOCKCHAIN (Substrate Runtime)                    │
│  → Consenso: Aura + Grandpa                                  │
│  → Tokens: BZR (nativo) + ZARI (pallet-assets)               │
│  → Imutabilidade: Histórico de atestados                     │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados Principal

```
1. BUYER cria Order → [Backend API] valida → [pallet-order] ancora
2. SELLER aceita → [Backend] cria Escrow → [pallet-escrow] lock BZR
3. COURIER se candidata → [pallet-fulfillment] valida stake → matched
4. SELLER + COURIER co-assinam HandoffProof → [IPFS] mídia → [pallet-attestation] hash
5. COURIER + BUYER co-assinam DeliveryProof → [IPFS] → [pallet-attestation]
6. [PoCEngine] valida quórum → [pallet-escrow] release → [pallet-fee] split
7. [pallet-bazari-identity] atualiza reputações → [Backend] events
```

---

## 🔧 IMPLEMENTAÇÃO POR CAMADA

### CAMADA 1: BLOCKCHAIN (bazari-chain)

#### Pallets a Implementar

##### 1.1 `pallet-order`

**Arquivo**: `/root/bazari-chain/pallets/order/src/lib.rs`

**Responsabilidades**:
- Criar/cancelar pedidos
- Snapshot de oferta (preço, itens, partes)
- Máquina de estados (`CREATED` → `ACCEPTED` → `IN_TRANSIT` → `DELIVERED` → `FINALIZED`)
- Link com `pallet-escrow` e `pallet-attestation`

**Storage**:
```rust
#[pallet::storage]
pub type Orders<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    OrderId,                     // u64 sequencial
    OrderData<T>,
    OptionQuery,
>;

#[pallet::storage]
pub type OrdersByBuyer<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    BoundedVec<OrderId, T::MaxOrdersPerAccount>,
    ValueQuery,
>;

pub struct OrderData<T: Config> {
    pub buyer: T::AccountId,
    pub seller: T::AccountId,
    pub courier: Option<T::AccountId>,
    pub total_bzr: BalanceOf<T>,
    pub state: OrderState,
    pub created_at: BlockNumberFor<T>,
    pub snapshot_cid: BoundedVec<u8, ConstU32<128>>,  // IPFS CID do snapshot
    pub affiliate_path_root: Option<[u8; 32]>,        // Merkle root
}

pub enum OrderState {
    Created,
    Accepted,
    InTransit,
    Delivered,
    Finalized,
    Disputed,
    Cancelled,
}
```

**Extrinsics**:
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    pub fn create_order(
        origin: OriginFor<T>,
        seller: T::AccountId,
        total_bzr: BalanceOf<T>,
        snapshot_cid: Vec<u8>,
        affiliate_path_root: Option<[u8; 32]>,
    ) -> DispatchResult { ... }

    pub fn accept_order(
        origin: OriginFor<T>,
        order_id: OrderId,
    ) -> DispatchResult { ... }

    pub fn assign_courier(
        origin: OriginFor<T>,
        order_id: OrderId,
        courier: T::AccountId,
    ) -> DispatchResult { ... }

    pub fn transition_state(
        origin: OriginFor<T>,
        order_id: OrderId,
        new_state: OrderState,
    ) -> DispatchResult { ... }

    pub fn cancel_order(
        origin: OriginFor<T>,
        order_id: OrderId,
        reason: Vec<u8>,
    ) -> DispatchResult { ... }
}
```

**Events**:
```rust
#[pallet::event]
pub enum Event<T: Config> {
    OrderCreated { order_id: OrderId, buyer: T::AccountId, seller: T::AccountId },
    OrderAccepted { order_id: OrderId },
    CourierAssigned { order_id: OrderId, courier: T::AccountId },
    StateTransitioned { order_id: OrderId, from: OrderState, to: OrderState },
    OrderCancelled { order_id: OrderId, reason: Vec<u8> },
}
```

**Invariantes**:
- Transições monotônicas: `CREATED` → `ACCEPTED` → `IN_TRANSIT` → `DELIVERED` (não pode voltar)
- Apenas `buyer` pode criar; apenas `seller` pode aceitar; apenas sistema pode `assign_courier`
- Cancelamento só até `ACCEPTED`; após `IN_TRANSIT` exige disputa

**Estimativa**: ~1500 linhas Rust + ~500 linhas testes

---

##### 1.2 `pallet-escrow`

**Arquivo**: `/root/bazari-chain/pallets/escrow/src/lib.rs`

**Responsabilidades**:
- Lock de fundos (BZR ou ZARI) ao criar order
- Release condicionado (quórum de atestados válidos)
- Refund em caso de cancelamento/disputa
- Slashing de partes culpadas

**Storage**:
```rust
#[pallet::storage]
pub type Escrows<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    OrderId,
    EscrowData<T>,
    OptionQuery,
>;

pub struct EscrowData<T: Config> {
    pub asset_type: AssetType,           // BZR | ZARI
    pub asset_id: Option<u32>,           // 1 para ZARI
    pub amount: BalanceOf<T>,
    pub locked_at: BlockNumberFor<T>,
    pub releases: BoundedVec<ReleaseEntry<T>, ConstU32<10>>,
    pub refunded: bool,
}

pub struct ReleaseEntry<T: Config> {
    pub recipient: T::AccountId,
    pub amount: BalanceOf<T>,
    pub released_at: BlockNumberFor<T>,
}

pub enum AssetType {
    BZR,
    ZARI,
}
```

**Extrinsics**:
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    pub fn lock_funds(
        origin: OriginFor<T>,
        order_id: OrderId,
        asset_type: AssetType,
        asset_id: Option<u32>,
        amount: BalanceOf<T>,
    ) -> DispatchResult {
        let buyer = ensure_signed(origin)?;

        // Validar que order existe e não tem escrow ainda
        let order = pallet_order::Orders::<T>::get(order_id)
            .ok_or(Error::<T>::OrderNotFound)?;
        ensure!(!Escrows::<T>::contains_key(order_id), Error::<T>::EscrowAlreadyExists);

        // Lock funds
        match asset_type {
            AssetType::BZR => {
                T::Currency::transfer(
                    &buyer,
                    &Self::escrow_account(),
                    amount,
                    ExistenceRequirement::KeepAlive,
                )?;
            },
            AssetType::ZARI => {
                let asset_id = asset_id.ok_or(Error::<T>::AssetIdRequired)?;
                pallet_assets::Pallet::<T>::transfer(
                    Origin::signed(buyer.clone()).into(),
                    asset_id.into(),
                    Self::escrow_account().into(),
                    amount,
                )?;
            },
        }

        // Salvar escrow
        Escrows::<T>::insert(order_id, EscrowData {
            asset_type,
            asset_id,
            amount,
            locked_at: frame_system::Pallet::<T>::block_number(),
            releases: BoundedVec::default(),
            refunded: false,
        });

        Self::deposit_event(Event::FundsLocked { order_id, amount });
        Ok(())
    }

    pub fn release_funds(
        origin: OriginFor<T>,
        order_id: OrderId,
        recipients: Vec<(T::AccountId, BalanceOf<T>)>,  // Split para seller, courier, affiliates, fee
    ) -> DispatchResult {
        // Apenas PoCEngine pode chamar (verificar origin)
        ensure_root(origin)?;

        let mut escrow = Escrows::<T>::get(order_id)
            .ok_or(Error::<T>::EscrowNotFound)?;
        ensure!(!escrow.refunded, Error::<T>::AlreadyRefunded);

        // Validar soma
        let total: BalanceOf<T> = recipients.iter().map(|(_, amt)| *amt).sum();
        ensure!(total == escrow.amount, Error::<T>::InvalidSplit);

        // Transferir para cada recipient
        for (recipient, amount) in recipients.iter() {
            match escrow.asset_type {
                AssetType::BZR => {
                    T::Currency::transfer(
                        &Self::escrow_account(),
                        recipient,
                        *amount,
                        ExistenceRequirement::KeepAlive,
                    )?;
                },
                AssetType::ZARI => {
                    pallet_assets::Pallet::<T>::transfer(
                        Origin::signed(Self::escrow_account()).into(),
                        escrow.asset_id.unwrap().into(),
                        recipient.clone().into(),
                        *amount,
                    )?;
                },
            }

            escrow.releases.try_push(ReleaseEntry {
                recipient: recipient.clone(),
                amount: *amount,
                released_at: frame_system::Pallet::<T>::block_number(),
            }).map_err(|_| Error::<T>::TooManyReleases)?;
        }

        Escrows::<T>::insert(order_id, escrow);
        Self::deposit_event(Event::FundsReleased { order_id });
        Ok(())
    }

    pub fn refund(
        origin: OriginFor<T>,
        order_id: OrderId,
    ) -> DispatchResult {
        ensure_root(origin)?;

        let mut escrow = Escrows::<T>::get(order_id)
            .ok_or(Error::<T>::EscrowNotFound)?;
        ensure!(!escrow.refunded, Error::<T>::AlreadyRefunded);
        ensure!(escrow.releases.is_empty(), Error::<T>::AlreadyReleased);

        let order = pallet_order::Orders::<T>::get(order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        // Refund para buyer
        match escrow.asset_type {
            AssetType::BZR => {
                T::Currency::transfer(
                    &Self::escrow_account(),
                    &order.buyer,
                    escrow.amount,
                    ExistenceRequirement::KeepAlive,
                )?;
            },
            AssetType::ZARI => {
                pallet_assets::Pallet::<T>::transfer(
                    Origin::signed(Self::escrow_account()).into(),
                    escrow.asset_id.unwrap().into(),
                    order.buyer.clone().into(),
                    escrow.amount,
                )?;
            },
        }

        escrow.refunded = true;
        Escrows::<T>::insert(order_id, escrow);
        Self::deposit_event(Event::Refunded { order_id });
        Ok(())
    }
}

fn escrow_account() -> T::AccountId {
    // Conta determinística derivada de pallet ID
    T::PalletId::get().into_account_truncating()
}
```

**Events**:
```rust
#[pallet::event]
pub enum Event<T: Config> {
    FundsLocked { order_id: OrderId, amount: BalanceOf<T> },
    FundsReleased { order_id: OrderId },
    Refunded { order_id: OrderId },
}
```

**Estimativa**: ~1200 linhas Rust + ~400 linhas testes

---

##### 1.3 `pallet-attestation`

**Arquivo**: `/root/bazari-chain/pallets/attestation/src/lib.rs`

**Responsabilidades**:
- Ancorar hashes de provas (HandoffProof, DeliveryProof)
- Validar signers por step (quem pode assinar cada etapa)
- Fornecer quórum status para PoCEngine
- Armazenar timestamps e block numbers

**Storage**:
```rust
#[pallet::storage]
pub type Attestations<T: Config> = StorageDoubleMap<
    _,
    Blake2_128Concat, OrderId,
    Blake2_128Concat, Step,
    AttestationData<T>,
    OptionQuery,
>;

pub struct AttestationData<T: Config> {
    pub payload_hash: [u8; 32],                      // SHA-256 do JSON off-chain
    pub signers: BoundedVec<T::AccountId, ConstU32<5>>,  // Quem assinou
    pub anchored_at: BlockNumberFor<T>,
    pub ipfs_cid: Option<BoundedVec<u8, ConstU32<128>>>, // CID da mídia (opcional)
}

pub enum Step {
    OrderCreated,
    HandoffSellerToCourier,
    DeliveredCourierToBuyer,
    Returned,
    Cancelled,
    DisputeOpened,
    Ruling,
}
```

**Extrinsics**:
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    pub fn submit_attestation(
        origin: OriginFor<T>,
        order_id: OrderId,
        step: Step,
        payload_hash: [u8; 32],
        signers: Vec<T::AccountId>,
        ipfs_cid: Option<Vec<u8>>,
    ) -> DispatchResult {
        let submitter = ensure_signed(origin)?;

        // Validar que order existe
        let order = pallet_order::Orders::<T>::get(order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        // Validar signers corretos para o step
        Self::validate_signers(&order, &step, &signers)?;

        // Validar que submitter é um dos signers
        ensure!(signers.contains(&submitter), Error::<T>::SubmitterNotSigner);

        // Validar que step ainda não foi atestado
        ensure!(!Attestations::<T>::contains_key(order_id, &step), Error::<T>::StepAlreadyAttested);

        // Salvar attestation
        Attestations::<T>::insert(order_id, &step, AttestationData {
            payload_hash,
            signers: signers.try_into().map_err(|_| Error::<T>::TooManySigners)?,
            anchored_at: frame_system::Pallet::<T>::block_number(),
            ipfs_cid: ipfs_cid.map(|c| c.try_into().ok()).flatten(),
        });

        Self::deposit_event(Event::AttestationSubmitted { order_id, step, payload_hash });
        Ok(())
    }

    pub fn get_quorum_status(
        order_id: OrderId,
    ) -> Result<QuorumStatus, DispatchError> {
        let order = pallet_order::Orders::<T>::get(order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        let created = Attestations::<T>::contains_key(order_id, Step::OrderCreated);
        let handoff = Attestations::<T>::contains_key(order_id, Step::HandoffSellerToCourier);
        let delivered = Attestations::<T>::contains_key(order_id, Step::DeliveredCourierToBuyer);

        Ok(QuorumStatus {
            created,
            handoff,
            delivered,
            can_finalize: created && handoff && delivered,
        })
    }
}

fn validate_signers<T: Config>(
    order: &OrderData<T>,
    step: &Step,
    signers: &[T::AccountId],
) -> DispatchResult {
    match step {
        Step::OrderCreated => {
            // Apenas buyer (implícito)
            ensure!(signers.len() == 1 && signers[0] == order.buyer, Error::<T>::InvalidSigners);
        },
        Step::HandoffSellerToCourier => {
            // Seller + Courier
            let courier = order.courier.as_ref().ok_or(Error::<T>::NoCourier)?;
            ensure!(
                signers.len() == 2 &&
                signers.contains(&order.seller) &&
                signers.contains(courier),
                Error::<T>::InvalidSigners
            );
        },
        Step::DeliveredCourierToBuyer => {
            // Courier + Buyer
            let courier = order.courier.as_ref().ok_or(Error::<T>::NoCourier)?;
            ensure!(
                signers.len() == 2 &&
                signers.contains(courier) &&
                signers.contains(&order.buyer),
                Error::<T>::InvalidSigners
            );
        },
        _ => {},
    }
    Ok(())
}
```

**Events**:
```rust
#[pallet::event]
pub enum Event<T: Config> {
    AttestationSubmitted { order_id: OrderId, step: Step, payload_hash: [u8; 32] },
}
```

**Estimativa**: ~1800 linhas Rust + ~600 linhas testes

---

##### 1.4 `pallet-fulfillment`

**Arquivo**: `/root/bazari-chain/pallets/fulfillment/src/lib.rs`

**Responsabilidades**:
- Registro de couriers (stake mínimo)
- Matching de couriers para orders (baseado em localização, capacidade, reputação)
- Lock/unlock de stake de courier
- Slashing de courier em caso de fraude

**Storage**:
```rust
#[pallet::storage]
pub type CourierProfiles<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    CourierProfile<T>,
    OptionQuery,
>;

#[pallet::storage]
pub type CourierStakes<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    BalanceOf<T>,
    ValueQuery,
>;

pub struct CourierProfile<T: Config> {
    pub active: bool,
    pub max_weight_kg: u32,
    pub vehicle_type: VehicleType,
    pub service_regions: BoundedVec<[u8; 32], ConstU32<10>>,  // Hashes de regiões
    pub reputation_score: i32,
}

pub enum VehicleType {
    Bike,
    Motorcycle,
    Car,
    Van,
}
```

**Extrinsics**:
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    pub fn register_courier(
        origin: OriginFor<T>,
        max_weight_kg: u32,
        vehicle_type: VehicleType,
        service_regions: Vec<[u8; 32]>,
        initial_stake: BalanceOf<T>,
    ) -> DispatchResult {
        let courier = ensure_signed(origin)?;

        // Validar stake mínimo
        ensure!(initial_stake >= T::MinCourierStake::get(), Error::<T>::InsufficientStake);

        // Lock stake
        T::Currency::transfer(
            &courier,
            &Self::stake_account(),
            initial_stake,
            ExistenceRequirement::KeepAlive,
        )?;

        // Criar profile
        CourierProfiles::<T>::insert(courier.clone(), CourierProfile {
            active: true,
            max_weight_kg,
            vehicle_type,
            service_regions: service_regions.try_into().map_err(|_| Error::<T>::TooManyRegions)?,
            reputation_score: 0,
        });

        CourierStakes::<T>::insert(courier.clone(), initial_stake);

        Self::deposit_event(Event::CourierRegistered { courier, stake: initial_stake });
        Ok(())
    }

    pub fn lock_stake_for_order(
        origin: OriginFor<T>,
        courier: T::AccountId,
        order_id: OrderId,
        amount: BalanceOf<T>,
    ) -> DispatchResult {
        // Apenas sistema (PoCEngine)
        ensure_root(origin)?;

        let stake = CourierStakes::<T>::get(&courier);
        ensure!(stake >= amount, Error::<T>::InsufficientStake);

        // Lock adicional (não remove do stake, apenas marca)
        // Implementação simplificada: registrar lock em OrderLocks storage

        Self::deposit_event(Event::StakeLocked { courier, order_id, amount });
        Ok(())
    }

    pub fn slash_courier(
        origin: OriginFor<T>,
        courier: T::AccountId,
        order_id: OrderId,
        amount: BalanceOf<T>,
    ) -> DispatchResult {
        ensure_root(origin)?;

        let mut stake = CourierStakes::<T>::get(&courier);
        let slashed = amount.min(stake);

        // Transferir stake slashed para tesouro DAO
        T::Currency::transfer(
            &Self::stake_account(),
            &T::DaoTreasury::get(),
            slashed,
            ExistenceRequirement::AllowDeath,
        )?;

        stake = stake.saturating_sub(slashed);
        CourierStakes::<T>::insert(courier.clone(), stake);

        Self::deposit_event(Event::CourierSlashed { courier, order_id, amount: slashed });
        Ok(())
    }
}
```

**Estimativa**: ~1000 linhas Rust + ~300 linhas testes

---

##### 1.5 `pallet-affiliate`

**Arquivo**: `/root/bazari-chain/pallets/affiliate/src/lib.rs`

**Responsabilidades**:
- Registro de campanhas de afiliados (DAG/Merkle root)
- Validação de caminhos (Merkle proofs)
- Cálculo de comissões com cap e decay

**Storage**:
```rust
#[pallet::storage]
pub type Campaigns<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    CampaignId,
    CampaignData<T>,
    OptionQuery,
>;

pub struct CampaignData<T: Config> {
    pub creator: T::AccountId,
    pub merkle_root: [u8; 32],
    pub commission_percent: u8,  // 0-100
    pub max_hops: u8,
    pub decay_factor: u8,        // 0-100 (ex: 50 = cada hop recebe 50% do anterior)
    pub active: bool,
}
```

**Extrinsics**:
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    pub fn create_campaign(
        origin: OriginFor<T>,
        merkle_root: [u8; 32],
        commission_percent: u8,
        max_hops: u8,
        decay_factor: u8,
    ) -> DispatchResult {
        let creator = ensure_signed(origin)?;

        let campaign_id = Self::next_campaign_id();
        Campaigns::<T>::insert(campaign_id, CampaignData {
            creator,
            merkle_root,
            commission_percent,
            max_hops,
            decay_factor,
            active: true,
        });

        Self::deposit_event(Event::CampaignCreated { campaign_id, merkle_root });
        Ok(())
    }

    pub fn validate_path(
        campaign_id: CampaignId,
        path: Vec<T::AccountId>,
        proof: Vec<[u8; 32]>,
    ) -> Result<bool, DispatchError> {
        let campaign = Campaigns::<T>::get(campaign_id)
            .ok_or(Error::<T>::CampaignNotFound)?;

        // Validar merkle proof
        let leaf = Self::hash_path(&path);
        let is_valid = Self::verify_merkle_proof(&leaf, &proof, &campaign.merkle_root);

        // Validar max hops
        ensure!(path.len() as u8 <= campaign.max_hops, Error::<T>::PathTooLong);

        Ok(is_valid)
    }
}
```

**Estimativa**: ~800 linhas Rust + ~250 linhas testes

---

##### 1.6 `pallet-fee`

**Arquivo**: `/root/bazari-chain/pallets/fee/src/lib.rs`

**Responsabilidades**:
- Configuração de percentuais de taxa (DAO-governed)
- Split automático de pagamentos (seller, courier, affiliates, DAO)

**Storage**:
```rust
#[pallet::storage]
pub type FeeConfig<T: Config> = StorageValue<
    _,
    FeeConfigData,
    ValueQuery,
>;

pub struct FeeConfigData {
    pub dao_fee_percent: u8,      // Ex: 2% para DAO
    pub courier_percent: u8,      // Ex: 10% do total
    pub affiliate_percent: u8,    // Ex: 5% do total
}
```

**Extrinsics**:
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    pub fn calculate_split(
        total: BalanceOf<T>,
        has_courier: bool,
        affiliate_path_len: u8,
    ) -> SplitResult<T> {
        let config = FeeConfig::<T>::get();

        let dao_fee = total * config.dao_fee_percent / 100;
        let courier_fee = if has_courier { total * config.courier_percent / 100 } else { 0 };
        let affiliate_fee = if affiliate_path_len > 0 { total * config.affiliate_percent / 100 } else { 0 };

        let seller_amount = total - dao_fee - courier_fee - affiliate_fee;

        SplitResult {
            seller: seller_amount,
            courier: courier_fee,
            affiliates: affiliate_fee,
            dao: dao_fee,
        }
    }
}
```

**Estimativa**: ~400 linhas Rust + ~150 linhas testes

---

##### 1.7 `pallet-dispute` (Fase 2)

**Arquivo**: `/root/bazari-chain/pallets/dispute/src/lib.rs`

**Responsabilidades**:
- Abertura de disputas
- Seleção de jurors via VRF
- Commit-reveal de votos
- Execução de ruling (release/refund/slashing)

**Complexidade**: Muito Alta (VRF, aleatoriedade on-chain, coordenação de múltiplos jurors)

**Estimativa**: ~2000 linhas Rust + ~800 linhas testes (Fase 2)

---

### CAMADA 2: BACKEND API (apps/api)

#### Services Principais

##### 2.1 `poc-engine.service.ts`

**Arquivo**: `/root/bazari/apps/api/src/services/poc/poc-engine.service.ts`

**Responsabilidades**:
- **Orquestrador central** da máquina de estados PoC
- Validar transições de state
- Coordenar chamadas aos pallets (order, escrow, attestation)
- Executar split de pagamentos
- Atualizar reputações

**Interface**:
```typescript
@Injectable()
export class PoCEngineService {
  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private attestation: AttestationService,
    private escrow: EscrowService,
    private fulfillment: FulfillmentService,
    private affiliate: AffiliateService,
    private fee: FeeService,
    private reputation: ReputationPoCService,
  ) {}

  /**
   * Criar novo order PoC
   */
  async createOrder(dto: CreatePoCOrderDto, buyerAddr: string): Promise<PoCOrder> {
    // 1. Validar dados
    const validated = await this.validateOrderCreation(dto);

    // 2. Criar snapshot e subir para IPFS
    const snapshot = await this.createOrderSnapshot(dto);
    const snapshotCid = await this.ipfs.upload(snapshot);

    // 3. Chamar pallet-order.create_order
    const api = await this.blockchain.getApi();
    const tx = api.tx.orderPallet.createOrder(
      dto.sellerAddr,
      dto.totalBzr,
      snapshotCid,
      dto.affiliatePathRoot,
    );
    const txHash = await this.blockchain.signAndSend(tx, buyerAddr);

    // 4. Aguardar evento OrderCreated
    const orderId = await this.blockchain.waitForEvent('orderPallet', 'OrderCreated', txHash);

    // 5. Criar escrow (lock funds)
    await this.escrow.lockFunds(orderId, buyerAddr, dto.totalBzr, dto.assetType);

    // 6. Salvar no DB
    const pocOrder = await this.prisma.poCOrder.create({
      data: {
        id: orderId.toString(),
        buyerAddr,
        sellerAddr: dto.sellerAddr,
        totalBzr: dto.totalBzr,
        state: 'CREATED',
        snapshotCid,
        affiliatePathRoot: dto.affiliatePathRoot,
      },
    });

    // 7. Submit attestation ORDER_CREATED
    await this.attestation.submit(orderId, 'ORDER_CREATED', buyerAddr, snapshot);

    return pocOrder;
  }

  /**
   * Aceitar order (seller)
   */
  async acceptOrder(orderId: string, sellerAddr: string): Promise<void> {
    const order = await this.prisma.poCOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.sellerAddr !== sellerAddr) throw new Error('Not the seller');
    if (order.state !== 'CREATED') throw new Error('Invalid state');

    // Chamar pallet-order.accept_order
    const api = await this.blockchain.getApi();
    const tx = api.tx.orderPallet.acceptOrder(orderId);
    await this.blockchain.signAndSend(tx, sellerAddr);

    // Atualizar DB
    await this.prisma.poCOrder.update({
      where: { id: orderId },
      data: { state: 'ACCEPTED' },
    });
  }

  /**
   * Assign courier (sistema, após matching)
   */
  async assignCourier(orderId: string, courierAddr: string): Promise<void> {
    // 1. Validar courier elegível
    await this.fulfillment.validateCourier(courierAddr, orderId);

    // 2. Lock stake do courier
    const stakeRequired = await this.fulfillment.calculateStake(orderId);
    await this.fulfillment.lockStake(courierAddr, orderId, stakeRequired);

    // 3. Chamar pallet-order.assign_courier
    const api = await this.blockchain.getApi();
    const tx = api.tx.orderPallet.assignCourier(orderId, courierAddr);
    await this.blockchain.signAndSendSudo(tx);  // Sudo para sistema

    // 4. Atualizar DB
    await this.prisma.poCOrder.update({
      where: { id: orderId },
      data: { courierAddr, state: 'IN_TRANSIT' },
    });
  }

  /**
   * Finalizar order (após quórum completo)
   */
  async finalizeOrder(orderId: string): Promise<void> {
    // 1. Validar quórum
    const quorum = await this.attestation.getQuorumStatus(orderId);
    if (!quorum.canFinalize) {
      throw new Error('Quorum not satisfied');
    }

    // 2. Calcular split
    const order = await this.prisma.poCOrder.findUnique({ where: { id: orderId } });
    const split = await this.fee.calculateSplit(
      order.totalBzr,
      !!order.courierAddr,
      order.affiliatePath?.length || 0,
    );

    // 3. Release escrow com split
    const recipients = [
      { address: order.sellerAddr, amount: split.seller },
      { address: order.courierAddr, amount: split.courier },
      { address: DAO_TREASURY, amount: split.dao },
      // Affiliates...
    ];
    await this.escrow.releaseFunds(orderId, recipients);

    // 4. Atualizar reputações
    await this.reputation.incrementSuccess(order.buyerAddr, 'BUYER');
    await this.reputation.incrementSuccess(order.sellerAddr, 'SELLER');
    await this.reputation.incrementSuccess(order.courierAddr, 'COURIER');

    // 5. Atualizar state
    await this.prisma.poCOrder.update({
      where: { id: orderId },
      data: { state: 'FINALIZED', finalizedAt: new Date() },
    });

    // 6. Emitir evento
    this.eventEmitter.emit('order.finalized', { orderId });
  }

  /**
   * Abrir disputa
   */
  async openDispute(orderId: string, openedBy: string, reason: string, evidence: any): Promise<void> {
    // 1. Validar que disputa é permitida
    const order = await this.prisma.poCOrder.findUnique({ where: { id: orderId } });
    if (!['IN_TRANSIT', 'DELIVERED'].includes(order.state)) {
      throw new Error('Cannot dispute in this state');
    }

    // 2. Upload evidence para IPFS
    const evidenceCid = await this.ipfs.upload(evidence);

    // 3. Chamar pallet-dispute.open_dispute (Fase 2)
    // TODO: implementar na Fase 2

    // 4. Criar registro no DB
    await this.prisma.poCDispute.create({
      data: {
        orderId,
        openedById: openedBy,
        reason,
        evidenceCid,
        status: 'OPEN',
      },
    });

    // 5. Atualizar order state
    await this.prisma.poCOrder.update({
      where: { id: orderId },
      data: { state: 'DISPUTED' },
    });
  }
}
```

**Estimativa**: ~800 linhas TypeScript + ~400 linhas testes

---

##### 2.2 `attestation.service.ts`

**Arquivo**: `/root/bazari/apps/api/src/services/poc/attestation.service.ts`

**Responsabilidades**:
- Co-assinatura de provas (HandoffProof, DeliveryProof)
- Upload de JSON + mídia para IPFS
- Submit de hash on-chain via `pallet-attestation`
- Query de quórum status

**Interface**:
```typescript
@Injectable()
export class AttestationService {
  async submit(
    orderId: string,
    step: PoCStep,
    signerAddr: string,
    payload: AttestationPayload,
  ): Promise<string> {
    // 1. Criar JSON estruturado
    const json = {
      orderId,
      step,
      timestamp: Date.now(),
      ...payload,
    };

    // 2. Hash SHA-256
    const payloadHash = this.sha256(JSON.stringify(json));

    // 3. Assinar hash com wallet do signer
    const signature = await this.wallet.sign(payloadHash, signerAddr);

    // 4. Upload JSON + signature para IPFS
    const cid = await this.ipfs.upload({ ...json, signature });

    // 5. Submit hash on-chain
    const api = await this.blockchain.getApi();
    const tx = api.tx.attestationPallet.submitAttestation(
      orderId,
      step,
      payloadHash,
      [signerAddr],  // Lista de signers (pode ser expandido para co-assinatura)
      cid,
    );
    const txHash = await this.blockchain.signAndSend(tx, signerAddr);

    return txHash;
  }

  async getQuorumStatus(orderId: string): Promise<QuorumStatus> {
    const api = await this.blockchain.getApi();
    const status = await api.query.attestationPallet.getQuorumStatus(orderId);

    return {
      created: status.created.isTrue,
      handoff: status.handoff.isTrue,
      delivered: status.delivered.isTrue,
      canFinalize: status.canFinalize.isTrue,
    };
  }

  async coSign(
    orderId: string,
    step: PoCStep,
    signers: string[],
    payload: AttestationPayload,
  ): Promise<string> {
    // Multi-signer: cada um assina o mesmo payload_hash
    const json = { orderId, step, timestamp: Date.now(), ...payload };
    const payloadHash = this.sha256(JSON.stringify(json));

    // Coletar assinaturas de cada signer
    const signatures = [];
    for (const signer of signers) {
      const sig = await this.wallet.sign(payloadHash, signer);
      signatures.push({ signer, signature: sig });
    }

    // Upload bundle
    const cid = await this.ipfs.upload({ ...json, signatures });

    // Submit com lista de signers
    const api = await this.blockchain.getApi();
    const tx = api.tx.attestationPallet.submitAttestation(
      orderId,
      step,
      payloadHash,
      signers,
      cid,
    );

    // Assinar tx com um dos signers (ex: primeiro)
    const txHash = await this.blockchain.signAndSend(tx, signers[0]);
    return txHash;
  }

  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

**Estimativa**: ~600 linhas TypeScript + ~300 linhas testes

---

##### 2.3 `fulfillment.service.ts`

**Arquivo**: `/root/bazari/apps/api/src/services/poc/fulfillment.service.ts`

**Responsabilidades**:
- Matching de couriers para orders (geo, capacidade, reputação)
- Cálculo de stake necessário (baseado em valor do order)
- Lock/unlock de stake via `pallet-fulfillment`

**Interface**:
```typescript
@Injectable()
export class FulfillmentService {
  async findAvailableCouriers(orderId: string): Promise<CourierMatch[]> {
    const order = await this.prisma.poCOrder.findUnique({ where: { id: orderId } });

    // Query couriers elegíveis
    const couriers = await this.prisma.deliveryProfile.findMany({
      where: {
        isAvailable: true,
        isOnline: true,
        // Filtros de região, capacidade, etc.
      },
    });

    // Ranking por: distância + reputação + stake
    const ranked = couriers.map(c => ({
      ...c,
      score: this.calculateMatchScore(c, order),
    })).sort((a, b) => b.score - a.score);

    return ranked.slice(0, 5);  // Top 5
  }

  async lockStake(courierAddr: string, orderId: string, amount: bigint): Promise<void> {
    const api = await this.blockchain.getApi();
    const tx = api.tx.fulfillmentPallet.lockStakeForOrder(courierAddr, orderId, amount);
    await this.blockchain.signAndSendSudo(tx);
  }

  calculateStake(orderId: string): Promise<bigint> {
    const order = await this.prisma.poCOrder.findUnique({ where: { id: orderId } });
    // Stake = 0.3 × valor do order (configurável)
    return BigInt(order.totalBzr) * 3n / 10n;
  }
}
```

**Estimativa**: ~500 linhas TypeScript + ~200 linhas testes

---

##### 2.4 Outros Services

**`dispute.service.ts`**: Gestão de disputas (Fase 2) ~700 linhas
**`juror-selection.service.ts`**: VRF + sorteio de jurors (Fase 2) ~400 linhas
**`reputation-poc.service.ts`**: Reputação multi-dimensional ~500 linhas
**`slashing.service.ts`**: Execução de penalidades ~300 linhas
**`merkle-affiliate.service.ts`**: Validação de caminhos ~350 linhas
**`ipfs-proof.service.ts`**: Upload/retrieve de provas ~300 linhas

**Total Services**: ~5700 linhas TypeScript

---

### CAMADA 3: DATABASE (Prisma)

#### Novos Models

##### `PoCOrder`

```prisma
model PoCOrder {
  id                String          @id  // OrderId on-chain
  buyerAddr         String
  sellerAddr        String
  courierAddr       String?

  // Asset
  assetType         P2PAssetType    @default(BZR)
  assetId           String?

  // Pricing
  totalBzr          Decimal         @db.Decimal(30, 0)

  // State
  state             PoCOrderState   @default(CREATED)

  // Snapshots
  snapshotCid       String          // IPFS CID do snapshot da oferta

  // Affiliate
  affiliatePathRoot String?         // Merkle root

  // Attestations
  handoffTxHash     String?
  deliveryTxHash    String?
  quorumStatus      Json?           // { CREATED: true, HANDOFF: false, ... }

  // Dispute
  disputeId         String?         @unique
  dispute           PoCDispute?     @relation(fields: [disputeId], references: [id])

  // Timestamps
  createdAt         DateTime        @default(now())
  finalizedAt       DateTime?

  attestations      PoCAttestation[]

  @@index([buyerAddr])
  @@index([sellerAddr])
  @@index([courierAddr])
  @@index([state])
  @@index([createdAt])
}

enum PoCOrderState {
  CREATED
  ACCEPTED
  IN_TRANSIT
  DELIVERED
  FINALIZED
  DISPUTED
  CANCELLED
}
```

##### `PoCAttestation`

```prisma
model PoCAttestation {
  id           String   @id @default(cuid())
  orderId      String
  order        PoCOrder @relation(fields: [orderId], references: [id])

  step         PoCStep
  payloadHash  String   // SHA-256
  signers      String[] // Array de addresses

  ipfsCid      String?  // CID da prova completa (JSON + mídias)

  anchoredAt   DateTime
  blockNumber  BigInt

  @@index([orderId, step])
  @@index([payloadHash])
}

enum PoCStep {
  ORDER_CREATED
  HANDOFF_SELLER_TO_COURIER
  DELIVERED_COURIER_TO_BUYER
  RETURNED
  CANCELLED
  DISPUTE_OPENED
  RULING
}
```

##### `PoCDispute`

```prisma
model PoCDispute {
  id              String         @id @default(cuid())
  orderId         String         @unique
  order           PoCOrder?

  openedById      String
  reason          String         @db.Text
  evidenceCid     String?        // IPFS

  selectedJurors  String[]       // Addresses dos jurors selecionados
  votes           PoCVote[]

  ruling          PoCRuling?
  rulingTxHash    String?
  slashingExecuted Boolean       @default(false)

  status          DisputeStatus  @default(OPEN)
  createdAt       DateTime       @default(now())
  closedAt        DateTime?
}

enum DisputeStatus {
  OPEN
  VOTING
  RULED
  EXECUTED
}

enum PoCRuling {
  RELEASE         // Liberar para seller/courier (buyer perdeu)
  REFUND          // Devolver para buyer (seller/courier perderam)
  PARTIAL         // Split customizado
}
```

##### `PoCVote`

```prisma
model PoCVote {
  id         String       @id @default(cuid())
  disputeId  String
  dispute    PoCDispute   @relation(fields: [disputeId], references: [id])

  jurorAddr  String

  // Commit-Reveal
  commitHash String?
  revealedVote String?    // 'RELEASE' | 'REFUND' | 'PARTIAL'

  committedAt DateTime?
  revealedAt  DateTime?

  @@unique([disputeId, jurorAddr])
}
```

##### `PoCReputationScore`

```prisma
model PoCReputationScore {
  id          String   @id @default(cuid())
  accountAddr String
  role        PoCRole

  score       Int      @default(0)  // Pode ser negativo

  // Stats
  totalOrders Int      @default(0)
  successful  Int      @default(0)
  disputed    Int      @default(0)
  slashed     Int      @default(0)

  // Decay
  lastDecayAt DateTime @default(now())

  updatedAt   DateTime @updatedAt

  @@unique([accountAddr, role])
  @@index([role, score])
}

enum PoCRole {
  BUYER
  SELLER
  COURIER
  JUROR
  AFFILIATE
}
```

##### Outros Models

`PoCSlashing`, `PoCAffiliatePath`, `PoCJuror` (~150 linhas no total)

**Total Prisma Schema**: ~660 linhas adicionais

---

### CAMADA 4: FRONTEND (apps/web)

#### Componentes Principais

##### 4.1 `PoCOrderStepper`

**Arquivo**: `/root/bazari/apps/web/src/modules/poc/components/PoCOrderStepper.tsx`

**Responsabilidades**:
- Exibir progresso visual do order (CREATED → ACCEPTED → IN_TRANSIT → DELIVERED → FINALIZED)
- Mostrar quórum status (checkmarks por step)
- Indicar ações pendentes ("Aguardando co-assinatura do courier")

**UI**:
```tsx
export const PoCOrderStepper: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { order, quorum } = usePoCOrder(orderId);

  const steps = [
    { label: 'Criado', state: 'CREATED', attestation: quorum?.created },
    { label: 'Aceito', state: 'ACCEPTED', attestation: quorum?.accepted },
    { label: 'Retirado', state: 'IN_TRANSIT', attestation: quorum?.handoff },
    { label: 'Entregue', state: 'DELIVERED', attestation: quorum?.delivered },
    { label: 'Finalizado', state: 'FINALIZED', attestation: quorum?.canFinalize },
  ];

  return (
    <div className="stepper">
      {steps.map((step, i) => (
        <div key={i} className={`step ${order.state === step.state ? 'active' : ''}`}>
          <div className="icon">
            {step.attestation ? <CheckCircle /> : <Circle />}
          </div>
          <div className="label">{step.label}</div>
        </div>
      ))}
    </div>
  );
};
```

**Estimativa**: ~300 linhas React/TS

---

##### 4.2 `AttestationSigner`

**Arquivo**: `/root/bazari/apps/web/src/modules/poc/components/AttestationSigner.tsx`

**Responsabilidades**:
- Modal de co-assinatura (HandoffProof ou DeliveryProof)
- Upload de foto/assinatura
- Assinar payload com Polkadot.js
- Submit on-chain

**UI**:
```tsx
export const AttestationSigner: React.FC<{
  orderId: string;
  step: PoCStep;
  coSigners: string[];
  onSigned: () => void;
}> = ({ orderId, step, coSigners, onSigned }) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const { signAndSubmit } = useAttestation();

  const handleSign = async () => {
    // 1. Upload foto para IPFS
    const photoCid = photo ? await ipfsService.upload(photo) : null;

    // 2. Criar payload
    const payload = {
      orderId,
      step,
      timestamp: Date.now(),
      photoCid,
      notes,
      geo: await getGeoLocation(),
    };

    // 3. Assinar e submeter
    await signAndSubmit(orderId, step, coSigners, payload);

    onSigned();
  };

  return (
    <Modal>
      <h3>Co-assinar {step === 'HANDOFF' ? 'Retirada' : 'Entrega'}</h3>

      <FileUpload label="Foto" onChange={setPhoto} />
      <TextArea label="Observações" value={notes} onChange={setNotes} />

      <div className="co-signers">
        <p>Co-assinantes:</p>
        {coSigners.map(addr => <Chip key={addr}>{formatAddress(addr)}</Chip>)}
      </div>

      <Button onClick={handleSign}>Assinar e Enviar</Button>
    </Modal>
  );
};
```

**Estimativa**: ~400 linhas React/TS

---

##### 4.3 `DisputePanel`

**Arquivo**: `/root/bazari/apps/web/src/modules/poc/components/DisputePanel.tsx`

**Responsabilidades**:
- Abrir disputa (formulário de razão + upload de evidências)
- Exibir status da disputa (jurors selecionados, votos)
- Mostrar ruling final

**Estimativa**: ~600 linhas React/TS

---

##### 4.4 `JurorVoting`

**Arquivo**: `/root/bazari/apps/web/src/modules/poc/components/JurorVoting.tsx`

**Responsabilidades**:
- Interface para jurors votarem (RELEASE | REFUND | PARTIAL)
- Exibir evidências (mídias IPFS, timelines)
- Commit-reveal de voto

**Estimativa**: ~500 linhas React/TS (Fase 2)

---

##### 4.5 Outros Componentes

**`ReputationBadge`**: Badges dinâmicos por papel ~200 linhas
**`MerkleAffiliateTree`**: Visualização de caminho ~300 linhas
**`ProofViewer`**: Exibir mídias IPFS ~250 linhas
**`SlashingHistory`**: Histórico de penalidades ~150 linhas

**Total Frontend**: ~2700 linhas React/TS

---

## 🚀 PLANO DE EXECUÇÃO

### FASE 1: MVP PoC (Meses 1-8)

**Objetivo**: Sistema funcional end-to-end com fluxo feliz + disputas básicas.

#### Sprint 1-4: Blockchain Foundation (Meses 1-4)

**Semana 1-2**: Setup e Scaffolding
- [ ] Criar pallets boilerplate (cargo generate)
- [ ] Setup CI/CD para Substrate (testes automatizados)
- [ ] Configurar testnet (3 nós)

**Semana 3-6**: `pallet-order` + `pallet-escrow`
- [ ] Implementar storage e extrinsics
- [ ] Testes unitários (≥80% coverage)
- [ ] Integração com pallet-balances e pallet-assets

**Semana 7-10**: `pallet-attestation`
- [ ] Lógica de validação de signers
- [ ] Quórum status query
- [ ] Testes com múltiplas assinaturas

**Semana 11-16**: `pallet-fulfillment`, `pallet-affiliate`, `pallet-fee`
- [ ] Implementação + testes
- [ ] Runtime configuration
- [ ] Genesis config com parâmetros iniciais

**Deliverable**: Blockchain funcional com 6 pallets + testnet rodando.

---

#### Sprint 5-8: Backend API (Meses 5-6)

**Semana 17-20**: Core Services
- [ ] `poc-engine.service.ts`: create, accept, assign, finalize
- [ ] `attestation.service.ts`: submit, coSign, getQuorum
- [ ] `escrow.service.ts`: lock, release, refund

**Semana 21-24**: Auxiliary Services
- [ ] `fulfillment.service.ts`: matching, stake
- [ ] `affiliate.service.ts`: validate path, calculate commission
- [ ] `fee.service.ts`: split calculator
- [ ] `reputation-poc.service.ts`: increment/decrement por papel

**Semana 25-28**: Database & Workers
- [ ] Prisma migrations (novos models)
- [ ] Seeds (dados de teste)
- [ ] Workers: timeout, reputation decay

**Deliverable**: API REST completa + workers funcionais.

---

#### Sprint 9-10: Frontend (Meses 7-8)

**Semana 29-32**: Componentes Principais
- [ ] `PoCOrderStepper`: visual de progresso
- [ ] `AttestationSigner`: modal de co-assinatura
- [ ] Modificar `DeliveryRequestCard` para usar PoC

**Semana 33-36**: Integração & Testes
- [ ] Hooks: `usePoCOrder`, `useAttestation`, `useQuorum`
- [ ] E2E tests (Cypress): criar order → handoff → delivery → finalized
- [ ] UI/UX polish

**Deliverable**: DApp funcional com fluxo completo.

---

#### Sprint 11-12: QA & Deploy (Mês 8)

**Semana 37-40**: Testes Rigorosos
- [ ] Testnet com 100+ orders sintéticos
- [ ] Testes de stress (10 orders simultâneos)
- [ ] Auditoria de segurança (externa)

**Semana 41-44**: Piloto em Produção
- [ ] Deploy em 1 DAO fechado ("Comunidade Tech SP")
- [ ] Monitoramento em tempo real
- [ ] Ajustes baseados em feedback

**Deliverable**: MVP PoC em produção, 1 DAO usando.

---

### FASE 2: Cripto-Evolução (Meses 9-14)

**Objetivo**: VRF, BLS, disputas robustas, reputação avançada.

#### Sprint 13-16: `pallet-dispute` com VRF (Meses 9-10)

**Semana 45-52**: Implementação
- [ ] VRF para seleção de jurors (usando `pallet-randomness` ou integração externa)
- [ ] Commit-reveal de votos
- [ ] Ruling execution (release/refund/slashing)

**Semana 53-56**: Backend Integration
- [ ] `dispute.service.ts`: open, selectJurors, commitVote, revealVote
- [ ] `juror-selection.service.ts`: VRF wrapper

**Deliverable**: Disputas descentralizadas funcionais.

---

#### Sprint 17-18: BLS Aggregation (Meses 11-12)

**Semana 57-60**: Integração de Library
- [ ] Escolher library BLS (ex: `@noble/bls12-381`)
- [ ] Modificar `pallet-attestation` para aceitar assinaturas agregadas
- [ ] Testes de agregação (2-5 signers)

**Semana 61-64**: Rollout
- [ ] Migrar handoffs e deliveries existentes para BLS
- [ ] Redução de custo de tx (medir antes/depois)

**Deliverable**: Assinaturas BLS em produção.

---

#### Sprint 19-20: Reputação Avançada & Off-chain Workers (Meses 13-14)

**Semana 65-68**: Reputação
- [ ] Decay exponencial (semanalmente)
- [ ] Pesos dinâmicos por papel
- [ ] Gates de risco (aumentar stake para reputação baixa)

**Semana 69-72**: Workers
- [ ] Off-chain worker para varredura de expirados
- [ ] Re-âncoras automáticas
- [ ] Pré-validações de mídia

**Deliverable**: Sistema de reputação robusto + automação.

---

### FASE 3: Privacidade & Escala (Meses 15-22)

**Objetivo**: ZK-PoD, IA assistiva, canais de pagamento.

#### Sprint 21-24: ZK-PoD (Meses 15-18)

**Semana 73-84**: Implementação
- [ ] Escolher ZK framework (Circom, Halo2, etc.)
- [ ] Provas de região (polígono sem revelar ponto exato)
- [ ] Verificador on-chain em `pallet-attestation`
- [ ] Integração com mobile apps (GPS)

**Deliverable**: Privacidade de localização com ZK.

---

#### Sprint 25-26: IA Assistiva para Disputas (Meses 19-20)

**Semana 85-92**: Modelo de IA
- [ ] Treinar modelo em dados PoC (público)
- [ ] Explicabilidade (saliency maps, razões)
- [ ] API de predição (advisory score)

**Semana 93-96**: Frontend Integration
- [ ] Mostrar score da IA para jurors
- [ ] Explicações visuais

**Deliverable**: IA assistindo jurors (não vinculante).

---

#### Sprint 27-28: Optimizações de Escala (Meses 21-22)

**Semana 97-100**: Sharding & Channels
- [ ] Sharding de queues por região/DAO
- [ ] Canais de pagamento para entregas recorrentes
- [ ] Parachain migration (estudo de viabilidade)

**Deliverable**: Sistema escalável para 1000+ orders/dia.

---

## 📊 MÉTRICAS DE ACOMPANHAMENTO

### KPIs por Fase

**Fase 1 (MVP)**:
- [ ] ≥50 orders completados no piloto
- [ ] Dispute rate <15%
- [ ] Avg finalization time <48h
- [ ] Zero fundos presos (nenhum escrow stuck)

**Fase 2 (Cripto)**:
- [ ] Dispute rate <8%
- [ ] Juror participation >90%
- [ ] BLS tx cost reduction >40%
- [ ] Reputation correlation com sucesso >0.7

**Fase 3 (Privacidade)**:
- [ ] ZK-PoD adoption >50% de deliveries
- [ ] IA accuracy vs jurors >85%
- [ ] Throughput >1000 orders/dia
- [ ] Avg finalization <12h

---

## 🔒 SEGURANÇA & AUDITORIA

### Checklist de Segurança

**Blockchain**:
- [ ] Auditoria externa de pallets (Substrate specialists)
- [ ] Formal verification de invariantes críticos
- [ ] Fuzz testing (100k+ tx aleatórios)
- [ ] Testnet por 3+ meses antes de mainnet

**Backend**:
- [ ] Penetration testing (OWASP Top 10)
- [ ] Code review por 2+ devs
- [ ] Rate limiting em todas as rotas
- [ ] Input validation rigorosa (Joi/Zod)

**Frontend**:
- [ ] XSS prevention (sanitize inputs)
- [ ] CSRF tokens
- [ ] Content Security Policy
- [ ] HTTPS obrigatório

**Operacional**:
- [ ] Bug bounty program ($5k-$50k rewards)
- [ ] Incident response plan
- [ ] Backup diário de DB
- [ ] Monitoring 24/7 (PagerDuty)

---

## 💡 CONSIDERAÇÕES FINAIS

### Sucessos Esperados

1. **Redução de Fraudes**: De ~30% para <5% de disputas
2. **Aumento de Confiança**: NPS de sellers +15 pontos
3. **Economia em Chargebacks**: ~$50k/ano
4. **Diferenciação Competitiva**: Único marketplace com PoC descentralizado
5. **Base para Futuro**: Infraestrutura preparada para governança DAO

### Desafios Antecipados

1. **Complexidade Técnica**: VRF + BLS + ZK requerem expertise raro
2. **Curva de Aprendizado**: Usuários precisam entender co-assinatura
3. **Performance Blockchain**: Transações podem ficar caras se BZR valorizar
4. **Disputas Complexas**: IA pode não cobrir todos os casos
5. **Regulação**: Provas on-chain podem ter implicações legais (LGPD/GDPR)

### Mitigações de Risco

- **Contratar especialistas**: 1 criptógrafo + 2 devs Rust seniors
- **UX simplificado**: Abstrair cripto para usuários (1-click signatures)
- **Fee adaptativo**: Ajustar dinamicamente baseado em congestão
- **Fallback humano**: Jurors sempre decidem, IA apenas sugere
- **Compliance**: Consultoria jurídica desde Fase 1

---

## 📚 RECURSOS E REFERÊNCIAS

### Documentação Técnica

- **Substrate Docs**: https://docs.substrate.io
- **Polkadot Wiki**: https://wiki.polkadot.network
- **Polkadot.js API**: https://polkadot.js.org/docs/
- **IPFS Docs**: https://docs.ipfs.tech

### Papers e Whitepapers

- **Kleros**: Dispute Resolution Protocol
- **VRF (RFC 9381)**: Verifiable Random Functions
- **BLS Signatures**: https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature
- **ZK-SNARKs**: Groth16, PLONK, Halo2

### Libraries Recomendadas

- **Rust**: `frame-support`, `sp-runtime`, `pallet-randomness`, `arkworks`
- **TypeScript**: `@polkadot/api`, `@noble/bls12-381`, `ipfs-http-client`
- **React**: `@polkadot/extension-dapp`, `wagmi` (para wallet)

---

## ✅ CONCLUSÃO

A implementação do **Proof of Commerce (PoC)** no Bazari é um projeto **ambicioso mas viável**, com:

- ✅ **Arquitetura clara** em camadas
- ✅ **Plano de execução** dividido em 3 fases iterativas
- ✅ **Aproveitamento** da infraestrutura existente (delivery, P2P, escrow)
- ✅ **Mitigações** para principais riscos
- ✅ **Métricas** objetivas de sucesso

**Recomendação Final**: **Prosseguir com Fase 1** (MVP), com investimento estimado de **$400k** e **8 meses** de desenvolvimento, seguindo o modelo de **migração gradual** e **piloto em DAO fechado** antes de rollout geral.

---

**FIM DO DOCUMENTO**

*Este documento deve ser usado como guia de implementação e atualizado conforme progresso real.*

