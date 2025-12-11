# P1: Templates de Smart Contracts ink!

**Prioridade:** P1 (Alta)
**Status:** Pendente
**Esforço:** Alto
**Impacto:** Alto

---

## Objetivo

Criar templates de smart contracts ink! que desenvolvedores possam usar para criar:
- Programas de fidelidade
- Escrows para transações seguras
- Divisão automática de receita

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INK! CONTRACTS ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      BAZARI CHAIN (Substrate)                         │   │
│  │                                                                       │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │   │
│  │  │    Loyalty      │ │     Escrow      │ │  RevenueSplit   │         │   │
│  │  │    Contract     │ │    Contract     │ │    Contract     │         │   │
│  │  │                 │ │                 │ │                 │         │   │
│  │  │  - issue_points │ │ - create_escrow │ │ - set_shares    │         │   │
│  │  │  - redeem       │ │ - release       │ │ - distribute    │         │   │
│  │  │  - transfer     │ │ - refund        │ │ - withdraw      │         │   │
│  │  │  - get_balance  │ │ - dispute       │ │ - get_balance   │         │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘         │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐   │   │
│  │  │                   Contract Factory                             │   │   │
│  │  │   deploy_loyalty() │ deploy_escrow() │ deploy_revenue_split() │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       DEVELOPER SDK                                   │   │
│  │                                                                       │   │
│  │  sdk.contracts.deployLoyalty({ name, symbol, ratio })                │   │
│  │  sdk.contracts.deployEscrow({ buyer, seller, amount })               │   │
│  │  sdk.contracts.deployRevenueSplit({ shares: [...] })                 │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Contratos a Implementar

### 1. Loyalty Contract (Fidelidade)

**Caso de Uso:** Comércios criam programas de pontos

**Funcionalidades:**
- Emitir pontos para clientes
- Trocar pontos por desconto/produtos
- Transferir pontos entre usuários
- Expiração de pontos (opcional)
- Níveis de fidelidade (bronze, silver, gold)

### 2. Escrow Contract

**Caso de Uso:** Transações P2P seguras, delivery, serviços

**Funcionalidades:**
- Criar escrow com valor em BZR
- Liberação após confirmação
- Reembolso em caso de problema
- Disputa com mediador
- Timeout automático

### 3. Revenue Split Contract

**Caso de Uso:** Apps com múltiplos stakeholders

**Funcionalidades:**
- Definir % de cada participante
- Distribuição automática de receita
- Histórico de pagamentos
- Adicionar/remover participantes

---

## Implementação

### Estrutura de Arquivos (bazari-chain)

```
/root/bazari-chain/
├── contracts/
│   ├── loyalty/
│   │   ├── Cargo.toml
│   │   ├── lib.rs
│   │   └── tests.rs
│   ├── escrow/
│   │   ├── Cargo.toml
│   │   ├── lib.rs
│   │   └── tests.rs
│   ├── revenue-split/
│   │   ├── Cargo.toml
│   │   ├── lib.rs
│   │   └── tests.rs
│   └── factory/
│       ├── Cargo.toml
│       └── lib.rs
└── scripts/
    ├── deploy-contracts.sh
    └── test-contracts.sh
```

---

### Task 1: Loyalty Contract

**Arquivo:** `/root/bazari-chain/contracts/loyalty/lib.rs`

```rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod loyalty {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    /// Estrutura de configuração do programa de fidelidade
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct LoyaltyConfig {
        /// Nome do programa
        pub name: String,
        /// Símbolo dos pontos (ex: "PTS")
        pub symbol: String,
        /// Ratio de conversão BZR -> Pontos (1 BZR = X pontos)
        pub bzr_to_points_ratio: u128,
        /// Ratio de conversão Pontos -> BZR (X pontos = 1 BZR)
        pub points_to_bzr_ratio: u128,
        /// Pontos expiram após N dias (0 = nunca)
        pub expiration_days: u32,
    }

    /// Níveis de fidelidade
    #[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum LoyaltyTier {
        Bronze,
        Silver,
        Gold,
        Platinum,
    }

    /// Eventos
    #[ink(event)]
    pub struct PointsIssued {
        #[ink(topic)]
        to: AccountId,
        amount: u128,
        reason: String,
    }

    #[ink(event)]
    pub struct PointsRedeemed {
        #[ink(topic)]
        from: AccountId,
        amount: u128,
        bzr_value: Balance,
    }

    #[ink(event)]
    pub struct PointsTransferred {
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
        amount: u128,
    }

    #[ink(event)]
    pub struct TierUpgrade {
        #[ink(topic)]
        account: AccountId,
        old_tier: LoyaltyTier,
        new_tier: LoyaltyTier,
    }

    /// Storage do contrato
    #[ink(storage)]
    pub struct Loyalty {
        /// Owner do contrato (comerciante)
        owner: AccountId,
        /// Configuração do programa
        config: LoyaltyConfig,
        /// Saldo de pontos por conta
        balances: Mapping<AccountId, u128>,
        /// Total de pontos acumulados por conta (histórico)
        total_earned: Mapping<AccountId, u128>,
        /// Tier atual de cada conta
        tiers: Mapping<AccountId, LoyaltyTier>,
        /// Total de pontos emitidos
        total_supply: u128,
        /// Operadores autorizados a emitir pontos
        operators: Mapping<AccountId, bool>,
    }

    /// Erros
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotOwner,
        NotOperator,
        InsufficientBalance,
        InvalidAmount,
        TransferToSelf,
        Overflow,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl Loyalty {
        /// Cria novo programa de fidelidade
        #[ink(constructor)]
        pub fn new(config: LoyaltyConfig) -> Self {
            let caller = Self::env().caller();
            let mut operators = Mapping::new();
            operators.insert(caller, &true);

            Self {
                owner: caller,
                config,
                balances: Mapping::new(),
                total_earned: Mapping::new(),
                tiers: Mapping::new(),
                total_supply: 0,
                operators,
            }
        }

        /// Emite pontos para um cliente
        #[ink(message)]
        pub fn issue_points(
            &mut self,
            to: AccountId,
            amount: u128,
            reason: String,
        ) -> Result<()> {
            let caller = Self::env().caller();

            // Verificar se é operador
            if !self.operators.get(caller).unwrap_or(false) {
                return Err(Error::NotOperator);
            }

            if amount == 0 {
                return Err(Error::InvalidAmount);
            }

            // Atualizar saldo
            let current_balance = self.balances.get(to).unwrap_or(0);
            let new_balance = current_balance
                .checked_add(amount)
                .ok_or(Error::Overflow)?;
            self.balances.insert(to, &new_balance);

            // Atualizar total ganho
            let current_earned = self.total_earned.get(to).unwrap_or(0);
            let new_earned = current_earned
                .checked_add(amount)
                .ok_or(Error::Overflow)?;
            self.total_earned.insert(to, &new_earned);

            // Atualizar total supply
            self.total_supply = self.total_supply
                .checked_add(amount)
                .ok_or(Error::Overflow)?;

            // Verificar upgrade de tier
            self.check_tier_upgrade(to, new_earned);

            // Emitir evento
            Self::env().emit_event(PointsIssued { to, amount, reason });

            Ok(())
        }

        /// Resgata pontos por BZR
        #[ink(message)]
        pub fn redeem_points(&mut self, amount: u128) -> Result<Balance> {
            let caller = Self::env().caller();

            let current_balance = self.balances.get(caller).unwrap_or(0);
            if current_balance < amount {
                return Err(Error::InsufficientBalance);
            }

            // Calcular valor em BZR
            let bzr_value = amount
                .checked_div(self.config.points_to_bzr_ratio)
                .ok_or(Error::InvalidAmount)?;

            // Atualizar saldo
            let new_balance = current_balance - amount;
            self.balances.insert(caller, &new_balance);

            // Reduzir total supply
            self.total_supply -= amount;

            // TODO: Transferir BZR do contrato para o caller

            // Emitir evento
            Self::env().emit_event(PointsRedeemed {
                from: caller,
                amount,
                bzr_value,
            });

            Ok(bzr_value)
        }

        /// Transfere pontos para outro usuário
        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, amount: u128) -> Result<()> {
            let caller = Self::env().caller();

            if caller == to {
                return Err(Error::TransferToSelf);
            }

            let from_balance = self.balances.get(caller).unwrap_or(0);
            if from_balance < amount {
                return Err(Error::InsufficientBalance);
            }

            // Atualizar saldos
            self.balances.insert(caller, &(from_balance - amount));

            let to_balance = self.balances.get(to).unwrap_or(0);
            self.balances.insert(to, &(to_balance + amount));

            // Emitir evento
            Self::env().emit_event(PointsTransferred {
                from: caller,
                to,
                amount,
            });

            Ok(())
        }

        /// Consulta saldo de pontos
        #[ink(message)]
        pub fn balance_of(&self, account: AccountId) -> u128 {
            self.balances.get(account).unwrap_or(0)
        }

        /// Consulta tier do usuário
        #[ink(message)]
        pub fn tier_of(&self, account: AccountId) -> LoyaltyTier {
            self.tiers.get(account).unwrap_or(LoyaltyTier::Bronze)
        }

        /// Consulta total de pontos ganhos
        #[ink(message)]
        pub fn total_earned_of(&self, account: AccountId) -> u128 {
            self.total_earned.get(account).unwrap_or(0)
        }

        /// Adiciona operador
        #[ink(message)]
        pub fn add_operator(&mut self, operator: AccountId) -> Result<()> {
            if Self::env().caller() != self.owner {
                return Err(Error::NotOwner);
            }
            self.operators.insert(operator, &true);
            Ok(())
        }

        /// Remove operador
        #[ink(message)]
        pub fn remove_operator(&mut self, operator: AccountId) -> Result<()> {
            if Self::env().caller() != self.owner {
                return Err(Error::NotOwner);
            }
            self.operators.insert(operator, &false);
            Ok(())
        }

        /// Consulta configuração
        #[ink(message)]
        pub fn get_config(&self) -> LoyaltyConfig {
            self.config.clone()
        }

        /// Consulta total supply
        #[ink(message)]
        pub fn total_supply(&self) -> u128 {
            self.total_supply
        }

        // --- Funções internas ---

        fn check_tier_upgrade(&mut self, account: AccountId, total_earned: u128) {
            let current_tier = self.tiers.get(account).unwrap_or(LoyaltyTier::Bronze);

            let new_tier = if total_earned >= 100_000 {
                LoyaltyTier::Platinum
            } else if total_earned >= 50_000 {
                LoyaltyTier::Gold
            } else if total_earned >= 10_000 {
                LoyaltyTier::Silver
            } else {
                LoyaltyTier::Bronze
            };

            if new_tier != current_tier {
                self.tiers.insert(account, &new_tier);
                Self::env().emit_event(TierUpgrade {
                    account,
                    old_tier: current_tier,
                    new_tier,
                });
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let config = LoyaltyConfig {
                name: String::from("Test Points"),
                symbol: String::from("TP"),
                bzr_to_points_ratio: 100,
                points_to_bzr_ratio: 100,
                expiration_days: 0,
            };
            let loyalty = Loyalty::new(config);
            assert_eq!(loyalty.total_supply(), 0);
        }

        #[ink::test]
        fn issue_points_works() {
            let config = LoyaltyConfig {
                name: String::from("Test"),
                symbol: String::from("TP"),
                bzr_to_points_ratio: 100,
                points_to_bzr_ratio: 100,
                expiration_days: 0,
            };
            let mut loyalty = Loyalty::new(config);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            loyalty
                .issue_points(accounts.bob, 1000, String::from("purchase"))
                .unwrap();

            assert_eq!(loyalty.balance_of(accounts.bob), 1000);
            assert_eq!(loyalty.total_supply(), 1000);
        }
    }
}
```

---

### Task 2: Escrow Contract

**Arquivo:** `/root/bazari-chain/contracts/escrow/lib.rs`

```rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod escrow {
    use ink::prelude::string::String;
    use ink::storage::Mapping;

    /// Status do escrow
    #[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum EscrowStatus {
        /// Aguardando depósito
        Pending,
        /// Valor depositado, aguardando entrega
        Funded,
        /// Entrega confirmada, aguardando liberação
        Delivered,
        /// Liberado para o vendedor
        Released,
        /// Reembolsado para o comprador
        Refunded,
        /// Em disputa
        Disputed,
    }

    /// Dados do escrow
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct EscrowData {
        pub buyer: AccountId,
        pub seller: AccountId,
        pub amount: Balance,
        pub status: EscrowStatus,
        pub description: String,
        pub created_at: Timestamp,
        pub deadline: Timestamp,
    }

    /// Eventos
    #[ink(event)]
    pub struct EscrowCreated {
        #[ink(topic)]
        id: u64,
        buyer: AccountId,
        seller: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct EscrowFunded {
        #[ink(topic)]
        id: u64,
    }

    #[ink(event)]
    pub struct DeliveryConfirmed {
        #[ink(topic)]
        id: u64,
    }

    #[ink(event)]
    pub struct EscrowReleased {
        #[ink(topic)]
        id: u64,
        to: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct EscrowRefunded {
        #[ink(topic)]
        id: u64,
        to: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct DisputeOpened {
        #[ink(topic)]
        id: u64,
        opened_by: AccountId,
        reason: String,
    }

    /// Storage
    #[ink(storage)]
    pub struct Escrow {
        /// Contador de escrows
        next_id: u64,
        /// Mapping de escrows
        escrows: Mapping<u64, EscrowData>,
        /// Mediador de disputas
        mediator: AccountId,
        /// Taxa do serviço (em basis points, 100 = 1%)
        fee_bps: u16,
        /// Conta que recebe as taxas
        fee_recipient: AccountId,
    }

    /// Erros
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        EscrowNotFound,
        NotBuyer,
        NotSeller,
        NotMediator,
        InvalidStatus,
        InsufficientDeposit,
        DeadlineExpired,
        TransferFailed,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl Escrow {
        /// Cria o contrato de escrow
        #[ink(constructor)]
        pub fn new(mediator: AccountId, fee_bps: u16) -> Self {
            Self {
                next_id: 0,
                escrows: Mapping::new(),
                mediator,
                fee_bps,
                fee_recipient: Self::env().caller(),
            }
        }

        /// Cria novo escrow
        #[ink(message)]
        pub fn create_escrow(
            &mut self,
            seller: AccountId,
            amount: Balance,
            description: String,
            deadline_hours: u64,
        ) -> Result<u64> {
            let buyer = Self::env().caller();
            let now = Self::env().block_timestamp();
            let deadline = now + (deadline_hours * 3600 * 1000); // ms

            let id = self.next_id;
            self.next_id += 1;

            let escrow = EscrowData {
                buyer,
                seller,
                amount,
                status: EscrowStatus::Pending,
                description,
                created_at: now,
                deadline,
            };

            self.escrows.insert(id, &escrow);

            Self::env().emit_event(EscrowCreated {
                id,
                buyer,
                seller,
                amount,
            });

            Ok(id)
        }

        /// Deposita fundos no escrow
        #[ink(message, payable)]
        pub fn fund(&mut self, id: u64) -> Result<()> {
            let mut escrow = self.escrows.get(id).ok_or(Error::EscrowNotFound)?;

            if Self::env().caller() != escrow.buyer {
                return Err(Error::NotBuyer);
            }

            if escrow.status != EscrowStatus::Pending {
                return Err(Error::InvalidStatus);
            }

            let deposited = Self::env().transferred_value();
            if deposited < escrow.amount {
                return Err(Error::InsufficientDeposit);
            }

            escrow.status = EscrowStatus::Funded;
            self.escrows.insert(id, &escrow);

            Self::env().emit_event(EscrowFunded { id });

            Ok(())
        }

        /// Confirma entrega (pelo comprador)
        #[ink(message)]
        pub fn confirm_delivery(&mut self, id: u64) -> Result<()> {
            let mut escrow = self.escrows.get(id).ok_or(Error::EscrowNotFound)?;

            if Self::env().caller() != escrow.buyer {
                return Err(Error::NotBuyer);
            }

            if escrow.status != EscrowStatus::Funded {
                return Err(Error::InvalidStatus);
            }

            escrow.status = EscrowStatus::Delivered;
            self.escrows.insert(id, &escrow);

            Self::env().emit_event(DeliveryConfirmed { id });

            // Auto-release após confirmação
            self.release(id)?;

            Ok(())
        }

        /// Libera fundos para o vendedor
        #[ink(message)]
        pub fn release(&mut self, id: u64) -> Result<()> {
            let mut escrow = self.escrows.get(id).ok_or(Error::EscrowNotFound)?;
            let caller = Self::env().caller();

            // Só buyer ou mediator podem liberar
            if caller != escrow.buyer && caller != self.mediator {
                return Err(Error::NotBuyer);
            }

            if escrow.status != EscrowStatus::Funded
                && escrow.status != EscrowStatus::Delivered
                && escrow.status != EscrowStatus::Disputed
            {
                return Err(Error::InvalidStatus);
            }

            // Calcular taxa
            let fee = (escrow.amount * self.fee_bps as u128) / 10_000;
            let seller_amount = escrow.amount - fee;

            // Transferir para vendedor
            if Self::env().transfer(escrow.seller, seller_amount).is_err() {
                return Err(Error::TransferFailed);
            }

            // Transferir taxa
            if fee > 0 {
                let _ = Self::env().transfer(self.fee_recipient, fee);
            }

            escrow.status = EscrowStatus::Released;
            self.escrows.insert(id, &escrow);

            Self::env().emit_event(EscrowReleased {
                id,
                to: escrow.seller,
                amount: seller_amount,
            });

            Ok(())
        }

        /// Solicita reembolso
        #[ink(message)]
        pub fn refund(&mut self, id: u64) -> Result<()> {
            let mut escrow = self.escrows.get(id).ok_or(Error::EscrowNotFound)?;
            let caller = Self::env().caller();
            let now = Self::env().block_timestamp();

            // Seller pode refundar a qualquer momento
            // Mediator pode refundar em disputa
            // Buyer pode refundar após deadline
            let can_refund = caller == escrow.seller
                || (caller == self.mediator && escrow.status == EscrowStatus::Disputed)
                || (caller == escrow.buyer && now > escrow.deadline);

            if !can_refund {
                return Err(Error::NotSeller);
            }

            if escrow.status != EscrowStatus::Funded
                && escrow.status != EscrowStatus::Disputed
            {
                return Err(Error::InvalidStatus);
            }

            // Transferir de volta para comprador
            if Self::env().transfer(escrow.buyer, escrow.amount).is_err() {
                return Err(Error::TransferFailed);
            }

            escrow.status = EscrowStatus::Refunded;
            self.escrows.insert(id, &escrow);

            Self::env().emit_event(EscrowRefunded {
                id,
                to: escrow.buyer,
                amount: escrow.amount,
            });

            Ok(())
        }

        /// Abre disputa
        #[ink(message)]
        pub fn open_dispute(&mut self, id: u64, reason: String) -> Result<()> {
            let mut escrow = self.escrows.get(id).ok_or(Error::EscrowNotFound)?;
            let caller = Self::env().caller();

            if caller != escrow.buyer && caller != escrow.seller {
                return Err(Error::NotBuyer);
            }

            if escrow.status != EscrowStatus::Funded {
                return Err(Error::InvalidStatus);
            }

            escrow.status = EscrowStatus::Disputed;
            self.escrows.insert(id, &escrow);

            Self::env().emit_event(DisputeOpened {
                id,
                opened_by: caller,
                reason,
            });

            Ok(())
        }

        /// Consulta escrow
        #[ink(message)]
        pub fn get_escrow(&self, id: u64) -> Option<EscrowData> {
            self.escrows.get(id)
        }

        /// Consulta mediador
        #[ink(message)]
        pub fn get_mediator(&self) -> AccountId {
            self.mediator
        }

        /// Atualiza mediador (só owner)
        #[ink(message)]
        pub fn set_mediator(&mut self, new_mediator: AccountId) -> Result<()> {
            if Self::env().caller() != self.fee_recipient {
                return Err(Error::NotMediator);
            }
            self.mediator = new_mediator;
            Ok(())
        }
    }
}
```

---

### Task 3: Revenue Split Contract

**Arquivo:** `/root/bazari-chain/contracts/revenue-split/lib.rs`

```rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod revenue_split {
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    /// Participante do split
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct Participant {
        pub account: AccountId,
        /// Percentual em basis points (100 = 1%, 10000 = 100%)
        pub share_bps: u16,
    }

    /// Eventos
    #[ink(event)]
    pub struct RevenueReceived {
        amount: Balance,
    }

    #[ink(event)]
    pub struct RevenueDistributed {
        total: Balance,
        participants: u32,
    }

    #[ink(event)]
    pub struct Withdrawal {
        #[ink(topic)]
        account: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct ParticipantAdded {
        #[ink(topic)]
        account: AccountId,
        share_bps: u16,
    }

    #[ink(event)]
    pub struct ParticipantRemoved {
        #[ink(topic)]
        account: AccountId,
    }

    /// Storage
    #[ink(storage)]
    pub struct RevenueSplit {
        /// Owner do contrato
        owner: AccountId,
        /// Lista de participantes
        participants: Vec<Participant>,
        /// Saldo pendente de saque por conta
        pending_withdrawals: Mapping<AccountId, Balance>,
        /// Total já distribuído
        total_distributed: Balance,
    }

    /// Erros
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotOwner,
        InvalidShares,
        NoBalance,
        TransferFailed,
        ParticipantExists,
        ParticipantNotFound,
        SharesExceed100Percent,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl RevenueSplit {
        /// Cria contrato de divisão de receita
        #[ink(constructor)]
        pub fn new(participants: Vec<Participant>) -> Result<Self> {
            // Validar que soma dos shares = 100%
            let total_shares: u32 = participants
                .iter()
                .map(|p| p.share_bps as u32)
                .sum();

            if total_shares != 10_000 {
                return Err(Error::InvalidShares);
            }

            Ok(Self {
                owner: Self::env().caller(),
                participants,
                pending_withdrawals: Mapping::new(),
                total_distributed: 0,
            })
        }

        /// Recebe e distribui receita automaticamente
        #[ink(message, payable)]
        pub fn receive_revenue(&mut self) {
            let amount = Self::env().transferred_value();

            if amount == 0 {
                return;
            }

            Self::env().emit_event(RevenueReceived { amount });

            // Distribuir para cada participante
            for participant in &self.participants {
                let share = (amount * participant.share_bps as u128) / 10_000;

                let current = self
                    .pending_withdrawals
                    .get(participant.account)
                    .unwrap_or(0);

                self.pending_withdrawals
                    .insert(participant.account, &(current + share));
            }

            self.total_distributed += amount;

            Self::env().emit_event(RevenueDistributed {
                total: amount,
                participants: self.participants.len() as u32,
            });
        }

        /// Saca saldo pendente
        #[ink(message)]
        pub fn withdraw(&mut self) -> Result<Balance> {
            let caller = Self::env().caller();
            let amount = self.pending_withdrawals.get(caller).unwrap_or(0);

            if amount == 0 {
                return Err(Error::NoBalance);
            }

            // Zerar saldo antes de transferir (reentrancy protection)
            self.pending_withdrawals.insert(caller, &0);

            if Self::env().transfer(caller, amount).is_err() {
                // Reverter saldo se falhar
                self.pending_withdrawals.insert(caller, &amount);
                return Err(Error::TransferFailed);
            }

            Self::env().emit_event(Withdrawal {
                account: caller,
                amount,
            });

            Ok(amount)
        }

        /// Consulta saldo pendente de uma conta
        #[ink(message)]
        pub fn pending_balance_of(&self, account: AccountId) -> Balance {
            self.pending_withdrawals.get(account).unwrap_or(0)
        }

        /// Consulta lista de participantes
        #[ink(message)]
        pub fn get_participants(&self) -> Vec<Participant> {
            self.participants.clone()
        }

        /// Consulta share de um participante
        #[ink(message)]
        pub fn share_of(&self, account: AccountId) -> u16 {
            self.participants
                .iter()
                .find(|p| p.account == account)
                .map(|p| p.share_bps)
                .unwrap_or(0)
        }

        /// Consulta total distribuído
        #[ink(message)]
        pub fn get_total_distributed(&self) -> Balance {
            self.total_distributed
        }

        /// Adiciona participante (requer rebalancear shares)
        #[ink(message)]
        pub fn add_participant(
            &mut self,
            account: AccountId,
            share_bps: u16,
        ) -> Result<()> {
            if Self::env().caller() != self.owner {
                return Err(Error::NotOwner);
            }

            // Verificar se já existe
            if self.participants.iter().any(|p| p.account == account) {
                return Err(Error::ParticipantExists);
            }

            // Verificar se não excede 100%
            let current_total: u32 = self
                .participants
                .iter()
                .map(|p| p.share_bps as u32)
                .sum();

            if current_total + share_bps as u32 > 10_000 {
                return Err(Error::SharesExceed100Percent);
            }

            self.participants.push(Participant { account, share_bps });

            Self::env().emit_event(ParticipantAdded { account, share_bps });

            Ok(())
        }

        /// Remove participante
        #[ink(message)]
        pub fn remove_participant(&mut self, account: AccountId) -> Result<()> {
            if Self::env().caller() != self.owner {
                return Err(Error::NotOwner);
            }

            let idx = self
                .participants
                .iter()
                .position(|p| p.account == account)
                .ok_or(Error::ParticipantNotFound)?;

            self.participants.remove(idx);

            Self::env().emit_event(ParticipantRemoved { account });

            Ok(())
        }

        /// Atualiza share de participante
        #[ink(message)]
        pub fn update_share(
            &mut self,
            account: AccountId,
            new_share_bps: u16,
        ) -> Result<()> {
            if Self::env().caller() != self.owner {
                return Err(Error::NotOwner);
            }

            let participant = self
                .participants
                .iter_mut()
                .find(|p| p.account == account)
                .ok_or(Error::ParticipantNotFound)?;

            // Verificar novo total
            let other_shares: u32 = self
                .participants
                .iter()
                .filter(|p| p.account != account)
                .map(|p| p.share_bps as u32)
                .sum();

            if other_shares + new_share_bps as u32 > 10_000 {
                return Err(Error::SharesExceed100Percent);
            }

            participant.share_bps = new_share_bps;

            Ok(())
        }
    }
}
```

---

### Task 4: Contract Factory (Deploy Simplificado)

**Arquivo:** `/root/bazari-chain/contracts/factory/lib.rs`

```rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod factory {
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    /// Tipo de contrato
    #[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ContractType {
        Loyalty,
        Escrow,
        RevenueSplit,
    }

    /// Registro de contrato deployado
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct DeployedContract {
        pub contract_type: ContractType,
        pub address: AccountId,
        pub owner: AccountId,
        pub deployed_at: Timestamp,
    }

    /// Eventos
    #[ink(event)]
    pub struct ContractDeployed {
        #[ink(topic)]
        contract_type: ContractType,
        #[ink(topic)]
        owner: AccountId,
        address: AccountId,
    }

    /// Storage
    #[ink(storage)]
    pub struct Factory {
        /// Contador de deploys
        deploy_count: u64,
        /// Contratos por owner
        contracts_by_owner: Mapping<AccountId, Vec<DeployedContract>>,
        /// Code hashes dos templates
        loyalty_code_hash: Hash,
        escrow_code_hash: Hash,
        revenue_split_code_hash: Hash,
    }

    impl Factory {
        #[ink(constructor)]
        pub fn new(
            loyalty_code_hash: Hash,
            escrow_code_hash: Hash,
            revenue_split_code_hash: Hash,
        ) -> Self {
            Self {
                deploy_count: 0,
                contracts_by_owner: Mapping::new(),
                loyalty_code_hash,
                escrow_code_hash,
                revenue_split_code_hash,
            }
        }

        /// Deploy de contrato de fidelidade
        #[ink(message, payable)]
        pub fn deploy_loyalty(
            &mut self,
            name: ink::prelude::string::String,
            symbol: ink::prelude::string::String,
            bzr_to_points_ratio: u128,
            points_to_bzr_ratio: u128,
        ) -> Result<AccountId, ink::prelude::string::String> {
            // TODO: Usar ink::env::instantiate_contract
            // Por enquanto, retornar placeholder
            let caller = Self::env().caller();

            Self::env().emit_event(ContractDeployed {
                contract_type: ContractType::Loyalty,
                owner: caller,
                address: caller, // placeholder
            });

            self.deploy_count += 1;

            Ok(caller)
        }

        /// Consulta contratos de um owner
        #[ink(message)]
        pub fn get_contracts(&self, owner: AccountId) -> Vec<DeployedContract> {
            self.contracts_by_owner.get(owner).unwrap_or_default()
        }

        /// Consulta total de deploys
        #[ink(message)]
        pub fn get_deploy_count(&self) -> u64 {
            self.deploy_count
        }
    }
}
```

---

### Task 5: Adicionar ao SDK

**Arquivo:** `packages/bazari-app-sdk/src/client/contracts.ts`

```typescript
import { sendMessage } from '../utils/bridge';

export interface LoyaltyConfig {
  name: string;
  symbol: string;
  bzrToPointsRatio: number;
  pointsToBzrRatio: number;
  expirationDays?: number;
}

export interface EscrowConfig {
  seller: string;
  amount: string;
  description: string;
  deadlineHours: number;
}

export interface RevenueShareConfig {
  participants: Array<{
    address: string;
    shareBps: number; // 100 = 1%
  }>;
}

export interface DeployedContract {
  type: 'loyalty' | 'escrow' | 'revenue-split';
  address: string;
  deployedAt: string;
}

/**
 * API de Contratos do SDK
 */
export class ContractsClient {
  /**
   * Deploy de contrato de fidelidade
   */
  async deployLoyalty(config: LoyaltyConfig): Promise<DeployedContract> {
    return sendMessage('contracts:deployLoyalty', config);
  }

  /**
   * Deploy de contrato de escrow
   */
  async deployEscrow(config: EscrowConfig): Promise<DeployedContract> {
    return sendMessage('contracts:deployEscrow', config);
  }

  /**
   * Deploy de contrato de divisão de receita
   */
  async deployRevenueSplit(config: RevenueShareConfig): Promise<DeployedContract> {
    return sendMessage('contracts:deployRevenueSplit', config);
  }

  /**
   * Lista contratos do usuário
   */
  async listContracts(): Promise<DeployedContract[]> {
    return sendMessage('contracts:list', {});
  }

  /**
   * Interage com contrato de fidelidade
   */
  loyalty(address: string) {
    return {
      issuePoints: (to: string, amount: number, reason: string) =>
        sendMessage('contracts:loyalty:issuePoints', { address, to, amount, reason }),

      redeemPoints: (amount: number) =>
        sendMessage('contracts:loyalty:redeem', { address, amount }),

      transfer: (to: string, amount: number) =>
        sendMessage('contracts:loyalty:transfer', { address, to, amount }),

      balanceOf: (account: string) =>
        sendMessage('contracts:loyalty:balanceOf', { address, account }),

      tierOf: (account: string) =>
        sendMessage('contracts:loyalty:tierOf', { address, account }),
    };
  }

  /**
   * Interage com contrato de escrow
   */
  escrow(id: string) {
    return {
      fund: () => sendMessage('contracts:escrow:fund', { id }),
      confirmDelivery: () => sendMessage('contracts:escrow:confirmDelivery', { id }),
      openDispute: (reason: string) =>
        sendMessage('contracts:escrow:openDispute', { id, reason }),
      refund: () => sendMessage('contracts:escrow:refund', { id }),
      getStatus: () => sendMessage('contracts:escrow:getStatus', { id }),
    };
  }

  /**
   * Interage com contrato de revenue split
   */
  revenueSplit(address: string) {
    return {
      withdraw: () => sendMessage('contracts:revenueSplit:withdraw', { address }),
      pendingBalance: () =>
        sendMessage('contracts:revenueSplit:pendingBalance', { address }),
      getParticipants: () =>
        sendMessage('contracts:revenueSplit:getParticipants', { address }),
    };
  }
}
```

---

## Critérios de Aceite

### Loyalty Contract
- [ ] Emissão de pontos funciona
- [ ] Resgate de pontos funciona
- [ ] Transferência funciona
- [ ] Tiers são atualizados automaticamente
- [ ] Eventos emitidos corretamente

### Escrow Contract
- [ ] Criação de escrow funciona
- [ ] Depósito funciona
- [ ] Liberação funciona
- [ ] Reembolso funciona
- [ ] Disputa funciona
- [ ] Taxas calculadas corretamente

### Revenue Split Contract
- [ ] Distribuição automática funciona
- [ ] Saque funciona
- [ ] Shares somam 100%
- [ ] Adicionar/remover participantes funciona

### SDK
- [ ] Deploy via SDK funciona
- [ ] Interação com contratos funciona
- [ ] Documentação de uso

---

## Deploy

```bash
# Build dos contratos
cd /root/bazari-chain/contracts
cargo +nightly contract build --release

# Deploy na testnet
# (usar polkadot.js ou script)
```

---

**Versão:** 1.0.0
**Data:** 2024-12-07
