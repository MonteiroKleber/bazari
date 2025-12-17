# Prompt 04: Registro On-Chain

## Objetivo

Implementar o registro de contratos e execuções de pagamento na blockchain.

## Pré-requisitos

- Fases 1-3 implementadas
- Infraestrutura blockchain Substrate

## Contexto

O Bazari Pay utiliza a blockchain como **camada de execução financeira e liquidação**. Diferente do Work (que só registra prova de vínculo), o Pay executa transferências reais on-chain.

## Entrega Esperada

### 1. Blockchain (Substrate Pallet)

#### 1.1 Pallet Recurring Payments

```rust
#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{
    pallet_prelude::*,
    traits::{Currency, ExistenceRequirement, ReservableCurrency},
};
use frame_system::pallet_prelude::*;

type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: ReservableCurrency<Self::AccountId>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    /// Contrato de pagamento recorrente
    #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct RecurringContract<AccountId, Balance> {
        pub id: [u8; 32],
        pub payer: AccountId,
        pub receiver: AccountId,
        pub base_value: Balance,
        pub period: PaymentPeriod,
        pub payment_day: u8,
        pub status: ContractStatus,
        pub created_at: u32,
        pub next_payment: u32,
        pub execution_count: u32,
        pub total_paid: Balance,
    }

    #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub enum PaymentPeriod {
        Weekly,
        Biweekly,
        Monthly,
    }

    #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub enum ContractStatus {
        Active,
        Paused,
        Closed,
    }

    /// Execução de pagamento
    #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct PaymentExecution<Balance> {
        pub id: [u8; 32],
        pub period_ref: [u8; 7],  // "2025-02"
        pub value_paid: Balance,
        pub executed_at: u32,
    }

    #[pallet::storage]
    pub type Contracts<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        [u8; 32],
        RecurringContract<T::AccountId, BalanceOf<T>>,
    >;

    #[pallet::storage]
    pub type Executions<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        [u8; 32],  // contract_id
        Blake2_128Concat,
        [u8; 32],  // execution_id
        PaymentExecution<BalanceOf<T>>,
    >;

    #[pallet::storage]
    pub type ContractsByPayer<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        [u8; 32],
        (),
    >;

    #[pallet::storage]
    pub type ContractsByReceiver<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        [u8; 32],
        (),
    >;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// Contrato criado
        ContractCreated {
            id: [u8; 32],
            payer: T::AccountId,
            receiver: T::AccountId,
            base_value: BalanceOf<T>,
            period: PaymentPeriod,
        },
        /// Contrato atualizado
        ContractStatusUpdated {
            id: [u8; 32],
            old_status: ContractStatus,
            new_status: ContractStatus,
        },
        /// Pagamento executado
        PaymentExecuted {
            contract_id: [u8; 32],
            execution_id: [u8; 32],
            value: BalanceOf<T>,
            period_ref: [u8; 7],
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        ContractAlreadyExists,
        ContractNotFound,
        NotAuthorized,
        InvalidStatusTransition,
        InsufficientBalance,
        TransferFailed,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Criar contrato de pagamento recorrente
        #[pallet::call_index(0)]
        #[pallet::weight(10_000)]
        pub fn create_contract(
            origin: OriginFor<T>,
            id: [u8; 32],
            receiver: T::AccountId,
            base_value: BalanceOf<T>,
            period: PaymentPeriod,
            payment_day: u8,
        ) -> DispatchResult {
            let payer = ensure_signed(origin)?;

            ensure!(
                !Contracts::<T>::contains_key(&id),
                Error::<T>::ContractAlreadyExists
            );

            let current_block = frame_system::Pallet::<T>::block_number().saturated_into();

            let contract = RecurringContract {
                id,
                payer: payer.clone(),
                receiver: receiver.clone(),
                base_value,
                period: period.clone(),
                payment_day,
                status: ContractStatus::Active,
                created_at: current_block,
                next_payment: Self::calculate_next_payment(current_block, &period, payment_day),
                execution_count: 0,
                total_paid: Zero::zero(),
            };

            Contracts::<T>::insert(&id, contract);
            ContractsByPayer::<T>::insert(&payer, &id, ());
            ContractsByReceiver::<T>::insert(&receiver, &id, ());

            Self::deposit_event(Event::ContractCreated {
                id,
                payer,
                receiver,
                base_value,
                period,
            });

            Ok(())
        }

        /// Atualizar status do contrato
        #[pallet::call_index(1)]
        #[pallet::weight(10_000)]
        pub fn update_status(
            origin: OriginFor<T>,
            id: [u8; 32],
            new_status: ContractStatus,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Contracts::<T>::try_mutate(&id, |maybe_contract| {
                let contract = maybe_contract.as_mut()
                    .ok_or(Error::<T>::ContractNotFound)?;

                ensure!(
                    who == contract.payer || who == contract.receiver,
                    Error::<T>::NotAuthorized
                );

                let old_status = contract.status.clone();
                ensure!(
                    Self::is_valid_transition(&old_status, &new_status),
                    Error::<T>::InvalidStatusTransition
                );

                contract.status = new_status.clone();

                Self::deposit_event(Event::ContractStatusUpdated {
                    id,
                    old_status,
                    new_status,
                });

                Ok(())
            })
        }

        /// Executar pagamento
        #[pallet::call_index(2)]
        #[pallet::weight(10_000)]
        pub fn execute_payment(
            origin: OriginFor<T>,
            contract_id: [u8; 32],
            execution_id: [u8; 32],
            period_ref: [u8; 7],
            value: BalanceOf<T>,
        ) -> DispatchResult {
            let _who = ensure_signed(origin)?;
            // Nota: Em produção, usar signed extension ou origem privilegiada

            let contract = Contracts::<T>::get(&contract_id)
                .ok_or(Error::<T>::ContractNotFound)?;

            ensure!(
                contract.status == ContractStatus::Active,
                Error::<T>::InvalidStatusTransition
            );

            // Verificar saldo
            ensure!(
                T::Currency::free_balance(&contract.payer) >= value,
                Error::<T>::InsufficientBalance
            );

            // Transferir
            T::Currency::transfer(
                &contract.payer,
                &contract.receiver,
                value,
                ExistenceRequirement::KeepAlive,
            ).map_err(|_| Error::<T>::TransferFailed)?;

            // Registrar execução
            let current_block = frame_system::Pallet::<T>::block_number().saturated_into();
            let execution = PaymentExecution {
                id: execution_id,
                period_ref,
                value_paid: value,
                executed_at: current_block,
            };

            Executions::<T>::insert(&contract_id, &execution_id, execution);

            // Atualizar contrato
            Contracts::<T>::mutate(&contract_id, |maybe_contract| {
                if let Some(c) = maybe_contract {
                    c.execution_count += 1;
                    c.total_paid = c.total_paid.saturating_add(value);
                    c.next_payment = Self::calculate_next_payment(
                        current_block,
                        &c.period,
                        c.payment_day
                    );
                }
            });

            Self::deposit_event(Event::PaymentExecuted {
                contract_id,
                execution_id,
                value,
                period_ref,
            });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        fn is_valid_transition(from: &ContractStatus, to: &ContractStatus) -> bool {
            match (from, to) {
                (ContractStatus::Active, ContractStatus::Paused) => true,
                (ContractStatus::Active, ContractStatus::Closed) => true,
                (ContractStatus::Paused, ContractStatus::Active) => true,
                (ContractStatus::Paused, ContractStatus::Closed) => true,
                _ => false,
            }
        }

        fn calculate_next_payment(
            current_block: u32,
            _period: &PaymentPeriod,
            _payment_day: u8
        ) -> u32 {
            // Simplificado: em produção, calcular baseado em timestamps
            current_block + 43200  // ~1 mês em blocks (6s/block)
        }
    }
}
```

### 2. Backend (API)

#### 2.1 Serviço On-Chain

```typescript
// apps/api/src/services/pay-onchain.service.ts
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { blake2AsHex } from '@polkadot/util-crypto';

export class PayOnChainService {
  constructor(private api: ApiPromise) {}

  async createContract(params: {
    contractId: string;
    payerWallet: string;
    receiverWallet: string;
    baseValue: string;
    period: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    paymentDay: number;
  }): Promise<{ txHash: string; onChainId: string }> {
    const idHash = blake2AsHex(params.contractId, 256);
    const periodOnChain = {
      WEEKLY: 'Weekly',
      BIWEEKLY: 'Biweekly',
      MONTHLY: 'Monthly',
    }[params.period];

    const tx = this.api.tx.recurringPayments.createContract(
      idHash,
      params.receiverWallet,
      this.parseAmount(params.baseValue),
      periodOnChain,
      params.paymentDay
    );

    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(process.env.PAY_SIGNER_SEED!);

    const txHash = await this.signAndSend(tx, signer);

    return { txHash, onChainId: idHash };
  }

  async executePayment(params: {
    contractOnChainId: string;
    executionId: string;
    periodRef: string;  // "2025-02"
    value: string;
  }): Promise<{ txHash: string; blockNumber: number }> {
    const executionIdHash = blake2AsHex(params.executionId, 256);
    const periodRefBytes = this.stringToBytes(params.periodRef, 7);

    const tx = this.api.tx.recurringPayments.executePayment(
      params.contractOnChainId,
      executionIdHash,
      periodRefBytes,
      this.parseAmount(params.value)
    );

    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(process.env.PAY_SIGNER_SEED!);

    const { txHash, blockNumber } = await this.signAndSendWithBlock(tx, signer);

    return { txHash, blockNumber };
  }

  async updateContractStatus(params: {
    onChainId: string;
    newStatus: 'Active' | 'Paused' | 'Closed';
  }): Promise<{ txHash: string }> {
    const tx = this.api.tx.recurringPayments.updateStatus(
      params.onChainId,
      params.newStatus
    );

    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(process.env.PAY_SIGNER_SEED!);

    const txHash = await this.signAndSend(tx, signer);

    return { txHash };
  }

  async getContract(onChainId: string): Promise<{
    payer: string;
    receiver: string;
    baseValue: string;
    period: string;
    status: string;
    executionCount: number;
    totalPaid: string;
  } | null> {
    const result = await this.api.query.recurringPayments.contracts(onChainId);

    if (result.isNone) return null;

    const contract = result.unwrap();
    return {
      payer: contract.payer.toString(),
      receiver: contract.receiver.toString(),
      baseValue: contract.baseValue.toString(),
      period: contract.period.toString(),
      status: contract.status.toString(),
      executionCount: contract.executionCount.toNumber(),
      totalPaid: contract.totalPaid.toString(),
    };
  }

  private parseAmount(value: string): bigint {
    // Converter para menor unidade (ex: 18 decimais)
    return BigInt(parseFloat(value) * 1e18);
  }

  private stringToBytes(str: string, length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    const encoded = new TextEncoder().encode(str);
    bytes.set(encoded.slice(0, length));
    return bytes;
  }

  private async signAndSend(tx: any, signer: any): Promise<string> {
    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, ({ status, events }) => {
        if (status.isInBlock) {
          const success = events.some(({ event }) =>
            this.api.events.system.ExtrinsicSuccess.is(event)
          );
          if (success) {
            resolve(status.asInBlock.toString());
          } else {
            reject(new Error('Transaction failed'));
          }
        }
      }).catch(reject);
    });
  }

  private async signAndSendWithBlock(tx: any, signer: any): Promise<{ txHash: string; blockNumber: number }> {
    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, async ({ status, events }) => {
        if (status.isInBlock) {
          const blockHash = status.asInBlock.toString();
          const header = await this.api.rpc.chain.getHeader(blockHash);
          const blockNumber = header.number.toNumber();

          resolve({ txHash: blockHash, blockNumber });
        }
      }).catch(reject);
    });
  }
}
```

#### 2.2 Integração no Scheduler

```typescript
// Modificar pay-scheduler.service.ts

private async processContract(contract: PayContract) {
  // ... código existente ...

  try {
    // Executar on-chain
    const { txHash, blockNumber } = await this.payOnChain.executePayment({
      contractOnChainId: contract.onChainId!,
      executionId: execution.id,
      periodRef,
      value: finalValue.toString(),
    });

    // Atualizar execução
    await this.prisma.payExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        executedAt: new Date(),
        txHash,
        blockNumber,
      },
    });

    // ... resto do código ...
  } catch (error) {
    // ... tratamento de erro ...
  }
}
```

### 3. Frontend

#### 3.1 Exibição On-Chain

Adicionar ao `ContractDetailPage.tsx`:

```tsx
{contract.onChainId && (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <LinkIcon className="h-4 w-4 text-green-500" />
        <span className="font-medium">Contrato On-Chain</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">ID:</span>
          <code className="bg-muted px-2 py-0.5 rounded">
            {truncate(contract.onChainId, 16)}
          </code>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Execuções:</span>
          <span>{contract.onChainData?.executionCount || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Pago:</span>
          <span>{formatCurrency(contract.onChainData?.totalPaid)}</span>
        </div>
      </div>

      <a
        href={`${EXPLORER_URL}/contracts/${contract.onChainId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 text-sm text-primary hover:underline block"
      >
        Ver no Explorador →
      </a>
    </CardContent>
  </Card>
)}
```

### 4. Verificação Pública

```typescript
// GET /api/pay/verify/:onChainId
router.get('/verify/:onChainId', async (req, res) => {
  const { onChainId } = req.params;

  const onChainData = await payOnChainService.getContract(onChainId);

  if (!onChainData) {
    return res.status(404).json({ error: 'Contract not found on chain' });
  }

  return res.json({
    verified: true,
    data: onChainData,
    verifiedAt: new Date().toISOString(),
  });
});
```

## Critérios de Aceite

- [ ] Pallet compila e é adicionado ao runtime
- [ ] Contratos são registrados on-chain ao criar
- [ ] Pagamentos são executados on-chain
- [ ] Status é sincronizado on-chain
- [ ] Frontend exibe dados on-chain
- [ ] Verificação pública disponível
- [ ] Falha on-chain não bloqueia fluxo off-chain

## Arquivos a Criar

```
bazari-chain/
  pallets/recurring-payments/
    Cargo.toml
    src/lib.rs
  runtime/src/lib.rs (modificar)

apps/api/
  src/services/pay-onchain.service.ts
  src/services/pay-scheduler.service.ts (modificar)
  src/routes/pay/verify.ts

apps/web/src/modules/pay/
  components/OnChainInfo.tsx
```
