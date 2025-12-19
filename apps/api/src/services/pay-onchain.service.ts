// path: apps/api/src/services/pay-onchain.service.ts
// Bazari Pay - On-Chain Integration Service (PROMPT-04)

import type { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { blake2AsHex } from '@polkadot/util-crypto';
import { hexToU8a, stringToU8a } from '@polkadot/util';

export type OnChainPaymentPeriod = 'Weekly' | 'Biweekly' | 'Monthly';
export type OnChainContractStatus = 'Active' | 'Paused' | 'Closed';

export interface OnChainContract {
  id: string;
  payer: string;
  receiver: string;
  baseValue: string;
  period: OnChainPaymentPeriod;
  paymentDay: number;
  status: OnChainContractStatus;
  createdAt: number;
  nextPayment: number;
  executionCount: number;
  totalPaid: string;
}

export interface OnChainExecution {
  id: string;
  periodRef: string;
  valuePaid: string;
  executedAt: number;
}

export interface CreateContractParams {
  contractId: string;
  payerWallet: string;
  receiverWallet: string;
  baseValue: string;
  period: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  paymentDay: number;
}

export interface ExecutePaymentParams {
  contractOnChainId: string;
  executionId: string;
  periodRef: string;
  value: string;
}

export interface UpdateStatusParams {
  onChainId: string;
  newStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED';
}

/**
 * Service for on-chain recurring payment operations
 */
export class PayOnChainService {
  private api: ApiPromise;
  private signerSeed: string;

  constructor(api: ApiPromise, signerSeed: string) {
    this.api = api;
    this.signerSeed = signerSeed;
  }

  /**
   * Generate hash of contract ID for on-chain use
   */
  generateIdHash(contractId: string): string {
    return blake2AsHex(contractId, 256);
  }

  /**
   * Map period from database to on-chain format
   */
  private mapPeriod(period: string): OnChainPaymentPeriod {
    switch (period) {
      case 'WEEKLY':
        return 'Weekly';
      case 'BIWEEKLY':
        return 'Biweekly';
      case 'MONTHLY':
      default:
        return 'Monthly';
    }
  }

  /**
   * Map status from database to on-chain format
   */
  private mapStatus(status: string): OnChainContractStatus {
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
   * Parse amount string to on-chain balance (18 decimals)
   */
  private parseAmount(value: string): bigint {
    const numValue = parseFloat(value);
    return BigInt(Math.floor(numValue * 1e18));
  }

  /**
   * Format period reference string to fixed-length bytes
   */
  private periodRefToBytes(periodRef: string): Uint8Array {
    const bytes = new Uint8Array(7);
    const encoded = stringToU8a(periodRef.slice(0, 7));
    bytes.set(encoded);
    return bytes;
  }

  /**
   * Create a new recurring payment contract on-chain
   */
  async createContract(params: CreateContractParams): Promise<{ txHash: string; onChainId: string }> {
    const { contractId, receiverWallet, baseValue, period, paymentDay } = params;

    const idHash = this.generateIdHash(contractId);
    const idHashBytes = hexToU8a(idHash);

    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(this.signerSeed);

    const periodOnChain = this.mapPeriod(period);
    const valueOnChain = this.parseAmount(baseValue);

    console.log(`[PayOnChain] Creating contract on-chain:`, {
      idHash,
      receiverWallet,
      baseValue: valueOnChain.toString(),
      period: periodOnChain,
      paymentDay,
    });

    const tx = this.api.tx.bazariRecurringPayments.createContract(
      idHashBytes,
      receiverWallet,
      valueOnChain,
      periodOnChain,
      paymentDay
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
          const success = events.some(({ event }) =>
            this.api.events.system.ExtrinsicSuccess.is(event)
          );
          if (success) {
            console.log(`[PayOnChain] Contract created in block:`, status.asInBlock.toString());
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
   * Execute a payment on-chain
   */
  async executePayment(params: ExecutePaymentParams): Promise<{ txHash: string; blockNumber: number }> {
    const { contractOnChainId, executionId, periodRef, value } = params;

    const contractIdBytes = hexToU8a(contractOnChainId);
    const executionIdHash = this.generateIdHash(executionId);
    const executionIdBytes = hexToU8a(executionIdHash);
    const periodRefBytes = this.periodRefToBytes(periodRef);
    const valueOnChain = this.parseAmount(value);

    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(this.signerSeed);

    console.log(`[PayOnChain] Executing payment on-chain:`, {
      contractOnChainId,
      executionId: executionIdHash,
      periodRef,
      value: valueOnChain.toString(),
    });

    const tx = this.api.tx.bazariRecurringPayments.executePayment(
      contractIdBytes,
      executionIdBytes,
      periodRefBytes,
      valueOnChain
    );

    const result = await new Promise<{ txHash: string; blockNumber: number }>((resolve, reject) => {
      tx.signAndSend(signer, async ({ status, events, dispatchError }) => {
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
          const blockHash = status.asInBlock.toString();
          try {
            const header = await this.api.rpc.chain.getHeader(blockHash);
            const blockNumber = header.number.toNumber();

            const success = events.some(({ event }) =>
              this.api.events.system.ExtrinsicSuccess.is(event)
            );

            if (success) {
              console.log(`[PayOnChain] Payment executed in block ${blockNumber}:`, blockHash);
              resolve({ txHash: blockHash, blockNumber });
            } else {
              reject(new Error('Transaction failed'));
            }
          } catch (err) {
            reject(err);
          }
        }
      }).catch(reject);
    });

    return result;
  }

  /**
   * Update contract status on-chain
   */
  async updateStatus(params: UpdateStatusParams): Promise<{ txHash: string }> {
    const { onChainId, newStatus } = params;

    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri(this.signerSeed);

    const idHashBytes = hexToU8a(onChainId);
    const statusOnChain = this.mapStatus(newStatus);

    console.log(`[PayOnChain] Updating status on-chain:`, {
      onChainId,
      newStatus: statusOnChain,
    });

    const tx = this.api.tx.bazariRecurringPayments.updateStatus(
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
          console.log(`[PayOnChain] Status updated in block:`, status.asInBlock.toString());
          resolve(status.asInBlock.toString());
        }
      }).catch(reject);
    });

    return { txHash };
  }

  /**
   * Get contract data from chain
   */
  async getContract(onChainId: string): Promise<OnChainContract | null> {
    try {
      const idHashBytes = hexToU8a(onChainId);
      const result = await this.api.query.bazariRecurringPayments.contracts(idHashBytes);

      const optionResult = result as unknown as { isNone: boolean; isSome: boolean; unwrap: () => any };

      if (optionResult.isNone) {
        return null;
      }

      const contract = optionResult.unwrap();
      return {
        id: onChainId,
        payer: contract.payer.toString(),
        receiver: contract.receiver.toString(),
        baseValue: contract.baseValue.toString(),
        period: contract.period.toString() as OnChainPaymentPeriod,
        paymentDay: contract.paymentDay.toNumber(),
        status: contract.status.toString() as OnChainContractStatus,
        createdAt: contract.createdAt.toNumber(),
        nextPayment: contract.nextPayment.toNumber(),
        executionCount: contract.executionCount.toNumber(),
        totalPaid: contract.totalPaid.toString(),
      };
    } catch (error) {
      console.error(`[PayOnChain] Error fetching contract:`, error);
      return null;
    }
  }

  /**
   * Get execution data from chain
   */
  async getExecution(contractOnChainId: string, executionOnChainId: string): Promise<OnChainExecution | null> {
    try {
      const contractIdBytes = hexToU8a(contractOnChainId);
      const executionIdBytes = hexToU8a(executionOnChainId);
      const result = await this.api.query.bazariRecurringPayments.executions(
        contractIdBytes,
        executionIdBytes
      );

      const optionResult = result as unknown as { isNone: boolean; isSome: boolean; unwrap: () => any };

      if (optionResult.isNone) {
        return null;
      }

      const execution = optionResult.unwrap();

      // Decode periodRef bytes to string
      const periodRefBytes = execution.periodRef.toU8a();
      const periodRef = new TextDecoder().decode(periodRefBytes).replace(/\0/g, '');

      return {
        id: executionOnChainId,
        periodRef,
        valuePaid: execution.valuePaid.toString(),
        executedAt: execution.executedAt.toNumber(),
      };
    } catch (error) {
      console.error(`[PayOnChain] Error fetching execution:`, error);
      return null;
    }
  }

  /**
   * Check if the pallet is available in the runtime
   */
  isPalletAvailable(): boolean {
    try {
      return !!(this.api.tx.bazariRecurringPayments && this.api.query.bazariRecurringPayments);
    } catch {
      return false;
    }
  }
}

// Singleton instance (initialized when API is ready)
let payOnChainService: PayOnChainService | null = null;

export function initPayOnChainService(api: ApiPromise, signerSeed: string): PayOnChainService {
  payOnChainService = new PayOnChainService(api, signerSeed);
  return payOnChainService;
}

export function getPayOnChainService(): PayOnChainService | null {
  return payOnChainService;
}
