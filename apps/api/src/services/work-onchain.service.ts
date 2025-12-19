// path: apps/api/src/services/work-onchain.service.ts
// Bazari Work - On-Chain Integration Service

import type { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { blake2AsHex } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';

export type OnChainPaymentType = 'External' | 'BazariPay' | 'Undefined';
export type OnChainAgreementStatus = 'Active' | 'Paused' | 'Closed';

export interface OnChainAgreement {
  idHash: string;
  company: string;
  worker: string;
  paymentType: OnChainPaymentType;
  status: OnChainAgreementStatus;
  createdAt: number;
  closedAt?: number;
}

export interface CreateAgreementParams {
  agreementId: string;
  companyWallet: string;
  workerWallet: string;
  paymentType: 'EXTERNAL' | 'BAZARI_PAY' | 'UNDEFINED';
}

export interface UpdateStatusParams {
  onChainId: string;
  newStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  signerWallet: string;
}

/**
 * Serviço para interação on-chain de acordos de trabalho
 */
export class WorkOnChainService {
  private api: ApiPromise;
  private signerSeed: string;

  constructor(api: ApiPromise, signerSeed: string) {
    this.api = api;
    this.signerSeed = signerSeed;
  }

  /**
   * Gera o hash do ID do acordo para uso on-chain
   */
  generateIdHash(agreementId: string): string {
    return blake2AsHex(agreementId, 256);
  }

  /**
   * Mapeia o tipo de pagamento do banco para on-chain
   */
  private mapPaymentType(paymentType: string): OnChainPaymentType {
    switch (paymentType) {
      case 'EXTERNAL':
        return 'External';
      case 'BAZARI_PAY':
        return 'BazariPay';
      default:
        return 'Undefined';
    }
  }

  /**
   * Mapeia o status do banco para on-chain
   */
  private mapStatus(status: string): OnChainAgreementStatus {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'PAUSED':
        return 'Paused';
      case 'CLOSED':
        return 'Closed';
      default:
        return 'Active';
    }
  }

  /**
   * Registrar acordo on-chain
   */
  async createAgreement(params: CreateAgreementParams): Promise<{ txHash: string; onChainId: string }> {
    const { agreementId, companyWallet, workerWallet, paymentType } = params;

    // Criar hash do ID
    const idHash = this.generateIdHash(agreementId);
    const idHashBytes = hexToU8a(idHash);

    // Preparar signer
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(this.signerSeed);

    // Mapear tipo de pagamento
    const paymentTypeOnChain = this.mapPaymentType(paymentType);

    console.log(`[WorkOnChain] Creating agreement on-chain:`, {
      idHash,
      workerWallet,
      paymentType: paymentTypeOnChain,
    });

    // Criar transação
    const tx = this.api.tx.bazariWorkAgreements.createAgreement(
      idHashBytes,
      workerWallet,
      paymentTypeOnChain
    );

    // Enviar transação
    const txHash = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(signer, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = this.api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        if (status.isInBlock) {
          const success = events.some(({ event }) =>
            this.api.events.system.ExtrinsicSuccess.is(event)
          );
          if (success) {
            console.log(`[WorkOnChain] Agreement created in block:`, status.asInBlock.toString());
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
  async updateStatus(params: UpdateStatusParams): Promise<{ txHash: string }> {
    const { onChainId, newStatus, signerWallet } = params;

    // Usar o signer padrão ou específico
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(this.signerSeed);

    const idHashBytes = hexToU8a(onChainId);
    const statusOnChain = this.mapStatus(newStatus);

    console.log(`[WorkOnChain] Updating status on-chain:`, {
      onChainId,
      newStatus: statusOnChain,
    });

    const tx = this.api.tx.bazariWorkAgreements.updateStatus(
      idHashBytes,
      statusOnChain
    );

    const txHash = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(signer, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = this.api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        if (status.isInBlock) {
          console.log(`[WorkOnChain] Status updated in block:`, status.asInBlock.toString());
          resolve(status.asInBlock.toString());
        }
      }).catch(reject);
    });

    return { txHash };
  }

  /**
   * Consultar acordo on-chain
   */
  async getAgreement(onChainId: string): Promise<OnChainAgreement | null> {
    try {
      const idHashBytes = hexToU8a(onChainId);
      const result = await this.api.query.bazariWorkAgreements.agreements(idHashBytes);

      // Cast para Option type do Polkadot
      const optionResult = result as unknown as { isNone: boolean; isSome: boolean; unwrap: () => any };

      if (optionResult.isNone) {
        return null;
      }

      const agreement = optionResult.unwrap();
      return {
        idHash: onChainId,
        company: agreement.company.toString(),
        worker: agreement.worker.toString(),
        paymentType: agreement.paymentType.toString() as OnChainPaymentType,
        status: agreement.status.toString() as OnChainAgreementStatus,
        createdAt: agreement.createdAt.toNumber(),
        closedAt: agreement.closedAt.isSome ? agreement.closedAt.unwrap().toNumber() : undefined,
      };
    } catch (error) {
      console.error(`[WorkOnChain] Error fetching agreement:`, error);
      return null;
    }
  }

  /**
   * Verificar se o pallet está disponível no runtime
   */
  isPalletAvailable(): boolean {
    try {
      return !!(this.api.tx.bazariWorkAgreements && this.api.query.bazariWorkAgreements);
    } catch {
      return false;
    }
  }
}

// Singleton instance (inicializado quando API estiver pronta)
let workOnChainService: WorkOnChainService | null = null;

export function initWorkOnChainService(api: ApiPromise, signerSeed: string): WorkOnChainService {
  workOnChainService = new WorkOnChainService(api, signerSeed);
  return workOnChainService;
}

export function getWorkOnChainService(): WorkOnChainService | null {
  return workOnChainService;
}
