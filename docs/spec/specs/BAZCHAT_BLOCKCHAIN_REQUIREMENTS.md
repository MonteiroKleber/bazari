# BazChat - Requisitos de Implementação na Blockchain

**Versão**: 1.0.0
**Data**: 2025-10-12
**Relacionado**: BAZCHAT_IMPLEMENTATION.md
**Repositório**: `~/bazari-chain`

---

## 📋 Sumário Executivo

Análise das implementações necessárias na **BazariChain** para suportar as funcionalidades do BazChat, especialmente nas **Fases 3, 5 e 7** (Comércio, Monetização e Social).

### ✅ Já Existe na Chain

| Funcionalidade | Pallet | Status |
|---------------|--------|--------|
| **Reputação básica** | `bazari-identity` | ✅ Implementado |
| **Lojas NFT** | `stores` | ✅ Implementado |
| **Identidade de perfis** | `bazari-identity` | ✅ Implementado |

### 🔧 Precisa Implementar

| Funcionalidade | Pallet Necessário | Fase BazChat | Prioridade |
|---------------|------------------|--------------|------------|
| **Comissões automáticas (split)** | `bazari-commerce` (NOVO) | Fase 3 | Alta |
| **Recibo NFT de venda** | `bazari-commerce` | Fase 3 | Alta |
| **Eventos de venda** | `bazari-commerce` | Fase 3 | Alta |
| **Políticas de comissão** | `bazari-commerce` | Fase 3 | Média |
| **Cashback LIVO** | `bazari-rewards` (NOVO) | Fase 5 | Média |
| **Missões on-chain** | `bazari-rewards` | Fase 5 | Baixa |
| **Selo de Confiança NFT** | `bazari-identity` (estender) | Fase 7 | Média |
| **Denúncias descentralizadas** | `bazari-moderation` (NOVO) | Fase 7 | Baixa |

---

## 1. Análise de Pallets Existentes

### 1.1 Pallet `bazari-identity` (Reputação)

**Localização**: `/home/bazari/bazari-chain/pallets/bazari-identity/src/lib.rs`

**Funcionalidades Existentes**:
- ✅ Criar perfil
- ✅ Armazenar reputação (i32)
- ✅ `increment_reputation(profile_id, points)`
- ✅ `decrement_reputation(profile_id, delta)`
- ✅ Storage: `reputation(profile_id) -> i32`

**O que está pronto para o BazChat**:
- Sistema de reputação básico já funciona
- API pode chamar `increment_reputation` após venda bem-sucedida
- API pode chamar `decrement_reputation` após disputa/report

**O que falta**:
- Score mais granular (vendas, feedbacks, disputas separados)
- Selo de Confiança NFT (mint automático em threshold)
- Eventos detalhados de mudança de reputação

### 1.2 Pallet `stores` (Lojas NFT)

**Localização**: `/home/bazari/bazari-chain/pallets/stores/src/lib.rs`

**Funcionalidades Existentes**:
```rust
pub struct ReputationStats {
    pub sales: u64,
    pub positive: u64,
    pub negative: u64,
    pub volume_planck: u128,
}
```

**O que está pronto**:
- ✅ Lojas são NFTs (via `pallet_uniques`)
- ✅ Estatísticas de reputação por loja
- ✅ Ownership e operadores

**O que falta**:
- Split de pagamentos automático (loja/promotor/taxa Bazari)
- Eventos de venda com dados de comissão
- Recibo NFT da venda

---

## 2. Implementações Necessárias por Fase

---

## FASE 3: Comércio no Chat (ALTA PRIORIDADE)

### 2.1 Novo Pallet: `bazari-commerce`

**Objetivo**: Gerenciar vendas, split de pagamentos, comissões e recibos NFT.

**Localização**: `/home/bazari/bazari-chain/pallets/bazari-commerce/`

#### Storage

```rust
// Venda
pub struct Sale<AccountId, Balance, BlockNumber> {
    pub sale_id: u64,
    pub store_id: u64,
    pub buyer: AccountId,
    pub seller: AccountId,
    pub promoter: Option<AccountId>,
    pub amount: Balance,
    pub commission_percent: u8,
    pub commission_amount: Balance,
    pub bazari_fee: Balance,
    pub status: SaleStatus,
    pub created_at: BlockNumber,
    pub receipt_nft_cid: Option<Vec<u8>>,
}

pub enum SaleStatus {
    Pending,
    Completed,
    Disputed,
    Reversed,
}

// Políticas de comissão da loja
pub struct CommissionPolicy {
    pub mode: CommissionMode,
    pub percent: u8,              // 0-20
    pub min_reputation: Option<i32>,
    pub daily_cap: Option<Balance>,
}

pub enum CommissionMode {
    Open,        // Qualquer um pode promover
    Followers,   // Apenas seguidores
    Affiliates,  // Lista aprovada
}
```

#### Extrinsics

```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Criar venda com split automático
    #[pallet::weight(10_000)]
    pub fn create_sale(
        origin: OriginFor<T>,
        store_id: u64,
        buyer: T::AccountId,
        amount: BalanceOf<T>,
        promoter: Option<T::AccountId>,
        commission_percent: u8,
    ) -> DispatchResult {
        let seller = ensure_signed(origin)?;

        // Validações
        ensure!(commission_percent <= 20, Error::<T>::CommissionTooHigh);

        // Calcular split
        let commission = amount * commission_percent / 100;
        let bazari_fee = amount * T::BazariFeePercent::get() / 100;
        let seller_amount = amount - commission - bazari_fee;

        // Transferir fundos
        T::Currency::transfer(&buyer, &seller, seller_amount, ExistenceRequirement::KeepAlive)?;

        if let Some(promoter_acc) = promoter.clone() {
            T::Currency::transfer(&buyer, &promoter_acc, commission, ExistenceRequirement::KeepAlive)?;
        }

        T::Currency::transfer(&buyer, &T::TreasuryAccount::get(), bazari_fee, ExistenceRequirement::KeepAlive)?;

        // Registrar venda
        let sale_id = NextSaleId::<T>::get();
        let sale = Sale {
            sale_id,
            store_id,
            buyer: buyer.clone(),
            seller: seller.clone(),
            promoter: promoter.clone(),
            amount,
            commission_percent,
            commission_amount: commission,
            bazari_fee,
            status: SaleStatus::Completed,
            created_at: <frame_system::Pallet<T>>::block_number(),
            receipt_nft_cid: None,
        };

        Sales::<T>::insert(sale_id, sale);
        NextSaleId::<T>::put(sale_id + 1);

        // Emitir evento
        Self::deposit_event(Event::SaleCompleted {
            sale_id,
            store_id,
            buyer,
            seller,
            promoter,
            amount,
            commission,
            bazari_fee,
        });

        // Incrementar reputação
        pallet_bazari_identity::Pallet::<T>::increment_reputation(
            Origin::root(),
            seller_profile_id,
            10,
        )?;

        Ok(())
    }

    /// Definir política de comissão da loja
    #[pallet::weight(10_000)]
    pub fn set_commission_policy(
        origin: OriginFor<T>,
        store_id: u64,
        mode: CommissionMode,
        percent: u8,
        min_reputation: Option<i32>,
        daily_cap: Option<BalanceOf<T>>,
    ) -> DispatchResult {
        let owner = ensure_signed(origin)?;

        // Verificar ownership da loja
        ensure!(
            pallet_stores::Pallet::<T>::is_store_owner(store_id, &owner),
            Error::<T>::NotStoreOwner
        );

        ensure!(percent <= 20, Error::<T>::CommissionTooHigh);

        let policy = CommissionPolicy {
            mode,
            percent,
            min_reputation,
            daily_cap,
        };

        CommissionPolicies::<T>::insert(store_id, policy);

        Self::deposit_event(Event::CommissionPolicyUpdated {
            store_id,
            mode,
            percent,
        });

        Ok(())
    }

    /// Mint recibo NFT da venda (chamado pelo backend após upload IPFS)
    #[pallet::weight(10_000)]
    pub fn mint_sale_receipt(
        origin: OriginFor<T>,
        sale_id: u64,
        receipt_cid: Vec<u8>,
    ) -> DispatchResult {
        T::ReceiptOrigin::ensure_origin(origin)?;

        Sales::<T>::try_mutate(sale_id, |maybe_sale| -> DispatchResult {
            let sale = maybe_sale.as_mut().ok_or(Error::<T>::SaleNotFound)?;
            sale.receipt_nft_cid = Some(receipt_cid.clone());
            Ok(())
        })?;

        Self::deposit_event(Event::ReceiptMinted {
            sale_id,
            receipt_cid,
        });

        Ok(())
    }

    /// Disputar venda
    #[pallet::weight(10_000)]
    pub fn dispute_sale(
        origin: OriginFor<T>,
        sale_id: u64,
        reason: Vec<u8>,
    ) -> DispatchResult {
        let disputer = ensure_signed(origin)?;

        Sales::<T>::try_mutate(sale_id, |maybe_sale| -> DispatchResult {
            let sale = maybe_sale.as_mut().ok_or(Error::<T>::SaleNotFound)?;

            // Apenas buyer ou seller podem disputar
            ensure!(
                disputer == sale.buyer || disputer == sale.seller,
                Error::<T>::NotAuthorized
            );

            sale.status = SaleStatus::Disputed;
            Ok(())
        })?;

        Self::deposit_event(Event::SaleDisputed {
            sale_id,
            disputer,
            reason,
        });

        Ok(())
    }
}
```

#### Events

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    /// Venda completada
    SaleCompleted {
        sale_id: u64,
        store_id: u64,
        buyer: T::AccountId,
        seller: T::AccountId,
        promoter: Option<T::AccountId>,
        amount: BalanceOf<T>,
        commission: BalanceOf<T>,
        bazari_fee: BalanceOf<T>,
    },

    /// Política de comissão atualizada
    CommissionPolicyUpdated {
        store_id: u64,
        mode: CommissionMode,
        percent: u8,
    },

    /// Recibo NFT mintado
    ReceiptMinted {
        sale_id: u64,
        receipt_cid: Vec<u8>,
    },

    /// Venda disputada
    SaleDisputed {
        sale_id: u64,
        disputer: T::AccountId,
        reason: Vec<u8>,
    },

    /// Venda revertida
    SaleReversed {
        sale_id: u64,
        reason: Vec<u8>,
    },
}
```

#### Erros

```rust
#[pallet::error]
pub enum Error<T> {
    CommissionTooHigh,
    NotStoreOwner,
    SaleNotFound,
    NotAuthorized,
    InsufficientBalance,
    DailyCapReached,
    ReputationTooLow,
}
```

---

## FASE 5: Monetização Avançada (MÉDIA PRIORIDADE)

### 2.2 Novo Pallet: `bazari-rewards`

**Objetivo**: Cashback LIVO, missões, ranking de promotores.

**Localização**: `/home/bazari/bazari-chain/pallets/bazari-rewards/`

#### Storage

```rust
/// Cashback acumulado por usuário
pub type CashbackBalance<T> = StorageMap<_, Blake2_128Concat, T::AccountId, BalanceOf<T>, ValueQuery>;

/// Missões ativas
pub struct Mission<AccountId, Balance> {
    pub id: u64,
    pub creator: AccountId,
    pub reward: Balance,
    pub mission_type: MissionType,
    pub max_completions: u32,
    pub completed_count: u32,
    pub status: MissionStatus,
}

pub enum MissionType {
    Share,
    Review,
    Referral,
    Custom,
}

pub enum MissionStatus {
    Active,
    Paused,
    Completed,
}
```

#### Extrinsics

```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Conceder cashback LIVO
    #[pallet::weight(10_000)]
    pub fn grant_cashback(
        origin: OriginFor<T>,
        recipient: T::AccountId,
        amount: BalanceOf<T>,
        reason: Vec<u8>,
    ) -> DispatchResult {
        T::CashbackOrigin::ensure_origin(origin)?;

        CashbackBalance::<T>::mutate(&recipient, |balance| {
            *balance += amount;
        });

        Self::deposit_event(Event::CashbackGranted {
            recipient,
            amount,
            reason,
        });

        Ok(())
    }

    /// Resgatar cashback
    #[pallet::weight(10_000)]
    pub fn redeem_cashback(
        origin: OriginFor<T>,
        amount: BalanceOf<T>,
    ) -> DispatchResult {
        let user = ensure_signed(origin)?;

        let balance = CashbackBalance::<T>::get(&user);
        ensure!(balance >= amount, Error::<T>::InsufficientCashback);

        CashbackBalance::<T>::mutate(&user, |bal| {
            *bal -= amount;
        });

        // Transferir para o usuário
        T::Currency::deposit_creating(&user, amount);

        Self::deposit_event(Event::CashbackRedeemed {
            user,
            amount,
        });

        Ok(())
    }

    /// Criar missão
    #[pallet::weight(10_000)]
    pub fn create_mission(
        origin: OriginFor<T>,
        reward: BalanceOf<T>,
        mission_type: MissionType,
        max_completions: u32,
    ) -> DispatchResult {
        let creator = ensure_signed(origin)?;

        // Reservar fundos
        T::Currency::reserve(&creator, reward * max_completions.into())?;

        let mission_id = NextMissionId::<T>::get();
        let mission = Mission {
            id: mission_id,
            creator: creator.clone(),
            reward,
            mission_type,
            max_completions,
            completed_count: 0,
            status: MissionStatus::Active,
        };

        Missions::<T>::insert(mission_id, mission);
        NextMissionId::<T>::put(mission_id + 1);

        Self::deposit_event(Event::MissionCreated {
            mission_id,
            creator,
            reward,
        });

        Ok(())
    }

    /// Completar missão
    #[pallet::weight(10_000)]
    pub fn complete_mission(
        origin: OriginFor<T>,
        mission_id: u64,
        proof: Vec<u8>,
    ) -> DispatchResult {
        let user = ensure_signed(origin)?;

        Missions::<T>::try_mutate(mission_id, |maybe_mission| -> DispatchResult {
            let mission = maybe_mission.as_mut().ok_or(Error::<T>::MissionNotFound)?;

            ensure!(mission.status == MissionStatus::Active, Error::<T>::MissionNotActive);
            ensure!(mission.completed_count < mission.max_completions, Error::<T>::MissionFull);

            mission.completed_count += 1;

            // Transferir recompensa
            T::Currency::unreserve(&mission.creator, mission.reward);
            T::Currency::transfer(
                &mission.creator,
                &user,
                mission.reward,
                ExistenceRequirement::KeepAlive,
            )?;

            Self::deposit_event(Event::MissionCompleted {
                mission_id,
                user: user.clone(),
                reward: mission.reward,
            });

            Ok(())
        })?;

        Ok(())
    }
}
```

---

## FASE 7: Funcionalidades Sociais (BAIXA-MÉDIA PRIORIDADE)

### 2.3 Estender Pallet `bazari-identity` (Selo de Confiança)

**Objetivo**: Mint automático de NFT Selo de Confiança quando critérios forem atingidos.

#### Adicionar ao `bazari-identity`:

```rust
/// Selo de Confiança (Trust Badge)
pub struct TrustBadge<BlockNumber> {
    pub level: TrustLevel,
    pub issued_at: BlockNumber,
    pub nft_id: Option<u64>,
}

pub enum TrustLevel {
    Bronze,   // 10+ vendas, 90%+ feedback positivo
    Silver,   // 50+ vendas, 95%+ feedback positivo
    Gold,     // 200+ vendas, 98%+ feedback positivo
    Platinum, // 1000+ vendas, 99%+ feedback positivo
}

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Avaliar e conceder selo de confiança
    #[pallet::weight(10_000)]
    pub fn evaluate_trust_badge(
        origin: OriginFor<T>,
        profile_id: u32,
    ) -> DispatchResult {
        T::BadgeOrigin::ensure_origin(origin)?;

        // Buscar estatísticas de vendas
        let stats = pallet_stores::ReputationStats::<T>::get(profile_id);

        let level = Self::calculate_trust_level(&stats)?;

        let badge = TrustBadge {
            level: level.clone(),
            issued_at: <frame_system::Pallet<T>>::block_number(),
            nft_id: None,
        };

        TrustBadges::<T>::insert(profile_id, badge);

        Self::deposit_event(Event::TrustBadgeIssued {
            profile_id,
            level,
        });

        Ok(())
    }
}

impl<T: Config> Pallet<T> {
    fn calculate_trust_level(stats: &ReputationStats) -> Result<TrustLevel, Error<T>> {
        let total_feedback = stats.positive + stats.negative;
        if total_feedback == 0 {
            return Err(Error::<T>::InsufficientData);
        }

        let positive_rate = (stats.positive * 100) / total_feedback;

        if stats.sales >= 1000 && positive_rate >= 99 {
            Ok(TrustLevel::Platinum)
        } else if stats.sales >= 200 && positive_rate >= 98 {
            Ok(TrustLevel::Gold)
        } else if stats.sales >= 50 && positive_rate >= 95 {
            Ok(TrustLevel::Silver)
        } else if stats.sales >= 10 && positive_rate >= 90 {
            Ok(TrustLevel::Bronze)
        } else {
            Err(Error::<T>::CriteriaNotMet)
        }
    }
}
```

### 2.4 Novo Pallet: `bazari-moderation` (Denúncias)

**Objetivo**: Sistema descentralizado de denúncias e moderação.

```rust
pub struct Report<AccountId, BlockNumber> {
    pub id: u64,
    pub reporter: AccountId,
    pub reported: AccountId,
    pub reason: ReportReason,
    pub details: Vec<u8>,
    pub status: ReportStatus,
    pub created_at: BlockNumber,
    pub votes_guilty: u32,
    pub votes_innocent: u32,
}

pub enum ReportReason {
    Spam,
    Harassment,
    Scam,
    Inappropriate,
    Other,
}

pub enum ReportStatus {
    Pending,
    UnderReview,
    Resolved,
    Dismissed,
}

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Criar denúncia
    #[pallet::weight(10_000)]
    pub fn create_report(
        origin: OriginFor<T>,
        reported: T::AccountId,
        reason: ReportReason,
        details: Vec<u8>,
    ) -> DispatchResult {
        let reporter = ensure_signed(origin)?;

        // Stake para evitar spam
        T::Currency::reserve(&reporter, T::ReportStake::get())?;

        let report_id = NextReportId::<T>::get();
        let report = Report {
            id: report_id,
            reporter: reporter.clone(),
            reported: reported.clone(),
            reason: reason.clone(),
            details,
            status: ReportStatus::Pending,
            created_at: <frame_system::Pallet<T>>::block_number(),
            votes_guilty: 0,
            votes_innocent: 0,
        };

        Reports::<T>::insert(report_id, report);
        NextReportId::<T>::put(report_id + 1);

        Self::deposit_event(Event::ReportCreated {
            report_id,
            reporter,
            reported,
            reason,
        });

        Ok(())
    }

    /// Votar em denúncia (DAO-light)
    #[pallet::weight(10_000)]
    pub fn vote_report(
        origin: OriginFor<T>,
        report_id: u64,
        guilty: bool,
    ) -> DispatchResult {
        let voter = ensure_signed(origin)?;

        // Apenas usuários com reputação > 0 podem votar
        let reputation = pallet_bazari_identity::Pallet::<T>::reputation(voter_profile_id);
        ensure!(reputation > 0, Error::<T>::InsufficientReputation);

        Reports::<T>::try_mutate(report_id, |maybe_report| -> DispatchResult {
            let report = maybe_report.as_mut().ok_or(Error::<T>::ReportNotFound)?;

            if guilty {
                report.votes_guilty += 1;
            } else {
                report.votes_innocent += 1;
            }

            // Auto-resolver se threshold atingido
            if report.votes_guilty >= T::GuiltThreshold::get() {
                report.status = ReportStatus::Resolved;

                // Penalizar reportado
                pallet_bazari_identity::Pallet::<T>::decrement_reputation(
                    Origin::root(),
                    reported_profile_id,
                    -10,
                )?;
            } else if report.votes_innocent >= T::InnocenceThreshold::get() {
                report.status = ReportStatus::Dismissed;
            }

            Ok(())
        })?;

        Self::deposit_event(Event::ReportVoted {
            report_id,
            voter,
            guilty,
        });

        Ok(())
    }
}
```

---

## 3. Resumo de Implementações

### 3.1 Novos Pallets Necessários

| Pallet | Fase | Prioridade | Tamanho Estimado |
|--------|------|-----------|------------------|
| `bazari-commerce` | 3 | **Alta** | ~500 linhas |
| `bazari-rewards` | 5 | Média | ~400 linhas |
| `bazari-moderation` | 7 | Baixa | ~300 linhas |

### 3.2 Modificações em Pallets Existentes

| Pallet | Modificação | Fase | Prioridade |
|--------|------------|------|-----------|
| `bazari-identity` | Adicionar `TrustBadge` | 7 | Média |
| `stores` | Adicionar hooks para vendas | 3 | Alta |

---

## 4. Integração Backend ↔ Chain

### 4.1 Apps/API → Chain (Fase 3)

**apps/api/src/chat/services/commission.ts**
```typescript
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

class CommissionService {
  private api: ApiPromise;
  private keyring: Keyring;

  async settleSale(data: {
    storeId: number;
    buyer: string;
    seller: string;
    promoter?: string;
    amount: string;
    commissionPercent: number;
  }) {
    // Criar transação
    const tx = this.api.tx.bazariCommerce.createSale(
      data.storeId,
      data.buyer,
      data.amount,
      data.promoter || null,
      data.commissionPercent,
    );

    // Assinar com conta do backend (ou do comprador)
    const signer = this.keyring.addFromUri(process.env.CHAIN_SIGNER_SEED!);
    const hash = await tx.signAndSend(signer);

    // Escutar eventos
    const events = await this.waitForEvents(hash);

    const saleCompletedEvent = events.find(
      e => e.event.section === 'bazariCommerce' && e.event.method === 'SaleCompleted'
    );

    if (!saleCompletedEvent) {
      throw new Error('Sale not completed on-chain');
    }

    const { sale_id } = saleCompletedEvent.event.data;

    return { saleId: sale_id.toString(), txHash: hash.toString() };
  }

  async mintReceipt(saleId: string, receiptCid: string) {
    const tx = this.api.tx.bazariCommerce.mintSaleReceipt(
      saleId,
      receiptCid,
    );

    const signer = this.keyring.addFromUri(process.env.CHAIN_SIGNER_SEED!);
    await tx.signAndSend(signer);
  }

  async updateReputation(profileId: number, delta: number) {
    const tx = delta > 0
      ? this.api.tx.bazariIdentity.incrementReputation(profileId, delta)
      : this.api.tx.bazariIdentity.decrementReputation(profileId, Math.abs(delta));

    const signer = this.keyring.addFromUri(process.env.CHAIN_SIGNER_SEED!);
    await tx.signAndSend(signer);
  }
}
```

### 4.2 Chain → Apps/API (Eventos)

**apps/api/src/workers/chain-events.ts**
```typescript
import { ApiPromise } from '@polkadot/api';

async function subscribeToChainEvents(api: ApiPromise) {
  api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;

      // Evento: SaleCompleted
      if (event.section === 'bazariCommerce' && event.method === 'SaleCompleted') {
        const [saleId, storeId, buyer, seller, promoter, amount, commission, bazariFee] = event.data;

        // Notificar via chat
        chatService.sendSystemMessage(threadId, {
          type: 'payment',
          meta: {
            saleId: saleId.toString(),
            amount: amount.toString(),
            commission: commission.toString(),
            txHash: record.hash.toString(),
          },
        });

        // Atualizar DB
        prisma.chatProposal.update({
          where: { id: proposalId },
          data: { status: 'paid' },
        });
      }

      // Evento: TrustBadgeIssued
      if (event.section === 'bazariIdentity' && event.method === 'TrustBadgeIssued') {
        const [profileId, level] = event.data;

        // Notificar usuário
        notificationService.send(profileId, {
          type: 'badge_earned',
          level: level.toString(),
        });
      }
    });
  });
}
```

---

## 5. Cronograma de Implementação

### Fase 3 (Comércio) - Implementar ANTES

**Prioridade**: 🔴 ALTA

1. **Semana 1**: Implementar `bazari-commerce` pallet
   - [ ] Storage e tipos
   - [ ] Extrinsic `create_sale` (split automático)
   - [ ] Extrinsic `set_commission_policy`
   - [ ] Eventos
   - [ ] Testes unitários

2. **Semana 2**: Integração Backend ↔ Chain
   - [ ] Service `commission.ts`
   - [ ] Worker de eventos
   - [ ] Testar fluxo completo: proposta → checkout → split on-chain

3. **Semana 3**: Recibo NFT
   - [ ] Extrinsic `mint_sale_receipt`
   - [ ] Upload IPFS do recibo
   - [ ] Integração com chat

### Fase 5 (Monetização) - Implementar DEPOIS

**Prioridade**: 🟡 MÉDIA

1. **Semana 4-5**: Implementar `bazari-rewards` pallet
   - [ ] Cashback LIVO
   - [ ] Missões
   - [ ] Integração com chat

### Fase 7 (Social) - Implementar POR ÚLTIMO

**Prioridade**: 🟢 BAIXA

1. **Semana 6**: Selo de Confiança
   - [ ] Estender `bazari-identity`
   - [ ] Critérios e mint automático

2. **Semana 7**: Denúncias
   - [ ] Implementar `bazari-moderation`
   - [ ] Sistema de votação DAO-light

---

## 6. Alternativa: Implementação Progressiva

### Opção A: Implementar Chain junto com cada Fase

**Vantagem**: Validação completa end-to-end
**Desvantagem**: Mais lento, depende de deploy da chain

### Opção B: Mock no Backend, Chain depois

**Vantagem**: Desenvolvimento paralelo, mais rápido
**Desvantagem**: Retrabalho ao integrar chain real

### ✅ Recomendação: **Opção B (Mock primeiro)**

**Fase 3 do BazChat**:
1. Implementar lógica de comissão no backend (PostgreSQL)
2. Emitir eventos simulados
3. Testar UX completo

**Paralelo (separado)**:
1. Implementar pallets na chain
2. Testar pallets isoladamente
3. Trocar mock por integração real

**Vantagem**: BazChat pode avançar enquanto chain é desenvolvida.

---

## 7. Checklist de Implementação

### Fase 3 (Comércio) - Blockchain

- [ ] Criar pallet `bazari-commerce`
- [ ] Implementar `create_sale` extrinsic
- [ ] Implementar split de pagamentos
- [ ] Implementar `set_commission_policy`
- [ ] Implementar `mint_sale_receipt`
- [ ] Adicionar eventos: `SaleCompleted`, `CommissionPolicyUpdated`, `ReceiptMinted`
- [ ] Testes unitários do pallet
- [ ] Integração no runtime
- [ ] Deploy em testnet
- [ ] Integração backend → chain (`commission.ts`)
- [ ] Worker de eventos chain → backend
- [ ] Testes end-to-end

### Fase 5 (Monetização) - Blockchain

- [ ] Criar pallet `bazari-rewards`
- [ ] Implementar cashback LIVO
- [ ] Implementar missões
- [ ] Testes e integração

### Fase 7 (Social) - Blockchain

- [ ] Estender `bazari-identity` (TrustBadge)
- [ ] Criar pallet `bazari-moderation`
- [ ] Testes e integração

---

## 8. Conclusão

### Resposta Direta à Pergunta

**Sim, há implementações necessárias na blockchain `bazari-chain`:**

1. **Fase 3 (CRÍTICO)**: Novo pallet `bazari-commerce` para split de pagamentos, comissões e recibos NFT
2. **Fase 5 (OPCIONAL)**: Novo pallet `bazari-rewards` para cashback e missões
3. **Fase 7 (OPCIONAL)**: Estender `bazari-identity` e criar `bazari-moderation`

### Estratégia Recomendada

1. **Curto prazo (Fases 0-2)**: Usar mock no backend, BazChat não depende de chain
2. **Médio prazo (Fase 3)**: Implementar `bazari-commerce` em paralelo ao desenvolvimento do chat
3. **Longo prazo (Fases 5-7)**: Implementar pallets de monetização e social conforme necessidade

### Impacto no Cronograma

- **Sem blockchain**: BazChat Fases 0-2 podem ser implementadas normalmente (~24-34h)
- **Com blockchain (Fase 3)**: +2-3 semanas para desenvolver e integrar `bazari-commerce`
- **Blockchain completa**: +4-6 semanas para todos os pallets

---

**Próximos Passos**:
1. Decidir estratégia (mock vs chain real)
2. Se chain real: começar implementação de `bazari-commerce` AGORA
3. Se mock: implementar Fases 0-2 do BazChat, chain em paralelo

---

**Fim do Documento - BazChat Blockchain Requirements v1.0.0**
