# Prompt 06: Registro On-Chain de Acordos

## Objetivo

Implementar o registro de acordos de trabalho na blockchain como prova imutável de vínculo.

## Pré-requisitos

- Fase 5 (Acordos) implementada
- Infraestrutura blockchain Substrate disponível
- Pallet de identidade configurado

## Contexto

O blockchain serve como **camada de prova de vínculo**, não como armazenamento de dados. Apenas metadados mínimos vão on-chain.

### Princípio

```
On-chain: ID, wallets, tipo de pagamento, status, timestamps
Off-chain: título, descrição, valores, mensagens, detalhes
```

## Entrega Esperada

### 1. Blockchain (Substrate Pallet)

#### 1.1 Pallet Work Agreements

Criar em `bazari-chain/pallets/work-agreements/`:

```rust
#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{
    pallet_prelude::*,
    traits::Currency,
};
use frame_system::pallet_prelude::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    /// Registro de acordo on-chain
    #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct WorkAgreementOnChain<AccountId> {
        /// Hash do ID off-chain (32 bytes)
        pub id_hash: [u8; 32],
        /// Wallet da empresa
        pub company: AccountId,
        /// Wallet do trabalhador
        pub worker: AccountId,
        /// Tipo de pagamento
        pub payment_type: PaymentType,
        /// Status atual
        pub status: AgreementStatus,
        /// Block de criação
        pub created_at: u32,
        /// Block de encerramento
        pub closed_at: Option<u32>,
    }

    #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub enum PaymentType {
        External,
        BazariPay,
        Undefined,
    }

    #[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub enum AgreementStatus {
        Active,
        Paused,
        Closed,
    }

    #[pallet::storage]
    pub type Agreements<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        [u8; 32],  // id_hash
        WorkAgreementOnChain<T::AccountId>,
    >;

    #[pallet::storage]
    pub type AgreementsByCompany<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,  // company
        Blake2_128Concat,
        [u8; 32],      // id_hash
        (),
    >;

    #[pallet::storage]
    pub type AgreementsByWorker<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,  // worker
        Blake2_128Concat,
        [u8; 32],      // id_hash
        (),
    >;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        /// Acordo registrado
        AgreementCreated {
            id_hash: [u8; 32],
            company: T::AccountId,
            worker: T::AccountId,
            payment_type: PaymentType,
        },
        /// Status do acordo atualizado
        AgreementStatusUpdated {
            id_hash: [u8; 32],
            old_status: AgreementStatus,
            new_status: AgreementStatus,
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        /// Acordo já existe
        AgreementAlreadyExists,
        /// Acordo não encontrado
        AgreementNotFound,
        /// Não autorizado
        NotAuthorized,
        /// Status inválido
        InvalidStatusTransition,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Registrar novo acordo
        #[pallet::call_index(0)]
        #[pallet::weight(10_000)]
        pub fn create_agreement(
            origin: OriginFor<T>,
            id_hash: [u8; 32],
            worker: T::AccountId,
            payment_type: PaymentType,
        ) -> DispatchResult {
            let company = ensure_signed(origin)?;

            ensure!(
                !Agreements::<T>::contains_key(&id_hash),
                Error::<T>::AgreementAlreadyExists
            );

            let agreement = WorkAgreementOnChain {
                id_hash,
                company: company.clone(),
                worker: worker.clone(),
                payment_type: payment_type.clone(),
                status: AgreementStatus::Active,
                created_at: frame_system::Pallet::<T>::block_number().saturated_into(),
                closed_at: None,
            };

            Agreements::<T>::insert(&id_hash, agreement);
            AgreementsByCompany::<T>::insert(&company, &id_hash, ());
            AgreementsByWorker::<T>::insert(&worker, &id_hash, ());

            Self::deposit_event(Event::AgreementCreated {
                id_hash,
                company,
                worker,
                payment_type,
            });

            Ok(())
        }

        /// Atualizar status do acordo
        #[pallet::call_index(1)]
        #[pallet::weight(10_000)]
        pub fn update_status(
            origin: OriginFor<T>,
            id_hash: [u8; 32],
            new_status: AgreementStatus,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Agreements::<T>::try_mutate(&id_hash, |maybe_agreement| {
                let agreement = maybe_agreement.as_mut()
                    .ok_or(Error::<T>::AgreementNotFound)?;

                // Verificar autorização
                ensure!(
                    who == agreement.company || who == agreement.worker,
                    Error::<T>::NotAuthorized
                );

                // Validar transição
                let old_status = agreement.status.clone();
                ensure!(
                    Self::is_valid_transition(&old_status, &new_status),
                    Error::<T>::InvalidStatusTransition
                );

                // Atualizar
                agreement.status = new_status.clone();
                if new_status == AgreementStatus::Closed {
                    agreement.closed_at = Some(
                        frame_system::Pallet::<T>::block_number().saturated_into()
                    );
                }

                Self::deposit_event(Event::AgreementStatusUpdated {
                    id_hash,
                    old_status,
                    new_status,
                });

                Ok(())
            })
        }
    }

    impl<T: Config> Pallet<T> {
        fn is_valid_transition(from: &AgreementStatus, to: &AgreementStatus) -> bool {
            match (from, to) {
                (AgreementStatus::Active, AgreementStatus::Paused) => true,
                (AgreementStatus::Active, AgreementStatus::Closed) => true,
                (AgreementStatus::Paused, AgreementStatus::Active) => true,
                (AgreementStatus::Paused, AgreementStatus::Closed) => true,
                _ => false,
            }
        }
    }
}
```

### 2. Backend (API)

#### 2.1 Serviço de Integração

Criar em `apps/api/src/services/work-onchain.service.ts`:

```typescript
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { blake2AsHex } from '@polkadot/util-crypto';

export class WorkOnChainService {
  constructor(private api: ApiPromise) {}

  /**
   * Registrar acordo on-chain
   */
  async createAgreement(params: {
    agreementId: string;
    companyWallet: string;
    workerWallet: string;
    paymentType: 'EXTERNAL' | 'BAZARI_PAY' | 'UNDEFINED';
    signerSeed: string;
  }): Promise<{ txHash: string; onChainId: string }> {
    const { agreementId, companyWallet, workerWallet, paymentType, signerSeed } = params;

    // Criar hash do ID
    const idHash = blake2AsHex(agreementId, 256);

    // Preparar transação
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(signerSeed);

    const paymentTypeOnChain = {
      EXTERNAL: 'External',
      BAZARI_PAY: 'BazariPay',
      UNDEFINED: 'Undefined',
    }[paymentType];

    const tx = this.api.tx.workAgreements.createAgreement(
      idHash,
      workerWallet,
      paymentTypeOnChain
    );

    // Enviar transação
    const txHash = await new Promise<string>((resolve, reject) => {
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

    return { txHash, onChainId: idHash };
  }

  /**
   * Atualizar status on-chain
   */
  async updateStatus(params: {
    onChainId: string;
    newStatus: 'Active' | 'Paused' | 'Closed';
    signerSeed: string;
  }): Promise<{ txHash: string }> {
    const { onChainId, newStatus, signerSeed } = params;

    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(signerSeed);

    const tx = this.api.tx.workAgreements.updateStatus(onChainId, newStatus);

    const txHash = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(signer, ({ status, events }) => {
        if (status.isInBlock) {
          resolve(status.asInBlock.toString());
        }
      }).catch(reject);
    });

    return { txHash };
  }

  /**
   * Consultar acordo on-chain
   */
  async getAgreement(onChainId: string): Promise<{
    company: string;
    worker: string;
    paymentType: string;
    status: string;
    createdAt: number;
    closedAt?: number;
  } | null> {
    const result = await this.api.query.workAgreements.agreements(onChainId);

    if (result.isNone) return null;

    const agreement = result.unwrap();
    return {
      company: agreement.company.toString(),
      worker: agreement.worker.toString(),
      paymentType: agreement.paymentType.toString(),
      status: agreement.status.toString(),
      createdAt: agreement.createdAt.toNumber(),
      closedAt: agreement.closedAt.isSome ? agreement.closedAt.unwrap().toNumber() : undefined,
    };
  }
}
```

#### 2.2 Integração no Fluxo de Acordos

Modificar `apps/api/src/routes/work/agreements.ts`:

```typescript
// Ao criar acordo (após aceitar proposta)
async function createAgreementWithOnChain(data: CreateAgreementData) {
  // 1. Criar acordo off-chain
  const agreement = await prisma.workAgreement.create({ data });

  // 2. Obter wallets
  const companyWallet = await getCompanyWallet(data.companyId);
  const workerWallet = await getUserWallet(data.workerId);

  if (companyWallet && workerWallet) {
    try {
      // 3. Registrar on-chain
      const { txHash, onChainId } = await workOnChainService.createAgreement({
        agreementId: agreement.id,
        companyWallet,
        workerWallet,
        paymentType: data.paymentType,
        signerSeed: process.env.CHAIN_SIGNER_SEED!,
      });

      // 4. Atualizar com referência on-chain
      await prisma.workAgreement.update({
        where: { id: agreement.id },
        data: { onChainId, onChainTxHash: txHash },
      });
    } catch (error) {
      // Log erro mas não bloqueia criação
      console.error('Failed to register on-chain:', error);
    }
  }

  return agreement;
}

// Ao mudar status
async function updateAgreementStatusWithOnChain(
  agreementId: string,
  newStatus: AgreementStatus,
  reason?: string
) {
  const agreement = await prisma.workAgreement.findUnique({
    where: { id: agreementId },
  });

  // 1. Atualizar off-chain
  await prisma.workAgreement.update({
    where: { id: agreementId },
    data: { status: newStatus, closedAt: newStatus === 'CLOSED' ? new Date() : undefined },
  });

  // 2. Atualizar on-chain (se registrado)
  if (agreement.onChainId) {
    try {
      await workOnChainService.updateStatus({
        onChainId: agreement.onChainId,
        newStatus: statusMap[newStatus],
        signerSeed: process.env.CHAIN_SIGNER_SEED!,
      });
    } catch (error) {
      console.error('Failed to update on-chain status:', error);
    }
  }
}
```

### 3. Frontend (Web)

#### 3.1 Exibição do Registro On-Chain

Adicionar ao `AgreementDetailPage.tsx`:

```tsx
{agreement.onChainId && (
  <Card className="mt-4">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-sm">
        <LinkIcon className="h-4 w-4 text-green-500" />
        <span className="font-medium">Registrado on-chain</span>
      </div>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>ID:</span>
          <code className="bg-muted px-2 py-0.5 rounded text-xs">
            {truncateHash(agreement.onChainId)}
          </code>
          <CopyButton value={agreement.onChainId} />
        </div>
        {agreement.onChainTxHash && (
          <div className="flex items-center gap-2">
            <span>TX:</span>
            <a
              href={`${BLOCK_EXPLORER_URL}/tx/${agreement.onChainTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Ver no explorador
            </a>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

### 4. Rotas (Verificação)

```typescript
// GET /api/work/agreements/:id/onchain
// Retorna dados on-chain para verificação
router.get('/:id/onchain', async (req, res) => {
  const agreement = await prisma.workAgreement.findUnique({
    where: { id: req.params.id },
  });

  if (!agreement?.onChainId) {
    return res.json({ registered: false });
  }

  const onChainData = await workOnChainService.getAgreement(agreement.onChainId);

  return res.json({
    registered: true,
    onChainId: agreement.onChainId,
    txHash: agreement.onChainTxHash,
    data: onChainData,
  });
});
```

## Critérios de Aceite

- [ ] Pallet implementado e compilando
- [ ] Acordos são registrados on-chain ao criar
- [ ] Status é atualizado on-chain ao mudar
- [ ] Frontend exibe informações do registro
- [ ] Link para block explorer funciona
- [ ] Verificação on-chain disponível via API
- [ ] Falha on-chain não bloqueia fluxo off-chain

## Arquivos a Criar/Modificar

```
bazari-chain/
  pallets/work-agreements/
    Cargo.toml
    src/lib.rs
  runtime/src/lib.rs (modificar - adicionar pallet)

apps/api/
  src/services/work-onchain.service.ts (criar)
  src/routes/work/agreements.ts (modificar)

apps/web/src/modules/work/
  pages/AgreementDetailPage.tsx (modificar)
  components/OnChainBadge.tsx (criar)
```

## Importante

> O blockchain é **prova de vínculo**, não armazenamento.
> Dados sensíveis (valores, descrições) ficam **apenas off-chain**.
