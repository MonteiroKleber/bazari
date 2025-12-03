import { sendMessage } from '../utils/bridge';
import type {
  SDKBalance,
  SDKTransaction,
  SDKTransferResult,
} from '../types/responses';

export interface TransferParams {
  to: string;
  amount: number;
  token: 'BZR' | 'ZARI';
  memo?: string;
}

/**
 * API de Wallet do SDK
 */
export class WalletClient {
  /**
   * Obtém o saldo do usuário
   */
  async getBalance(token?: 'BZR' | 'ZARI'): Promise<SDKBalance> {
    return sendMessage('wallet:getBalance', { token });
  }

  /**
   * Obtém histórico de transações
   */
  async getHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<SDKTransaction[]> {
    return sendMessage('wallet:getHistory', options || {});
  }

  /**
   * Solicita uma transferência (requer confirmação do usuário)
   */
  async requestTransfer(params: TransferParams): Promise<SDKTransferResult> {
    return sendMessage('wallet:requestTransfer', params);
  }

  /**
   * Obtém saldo formatado de BZR
   */
  async getBZRBalance(): Promise<string> {
    const balance = await this.getBalance('BZR');
    return balance.formatted.bzr;
  }

  /**
   * Obtém saldo formatado de ZARI
   */
  async getZARIBalance(): Promise<string> {
    const balance = await this.getBalance('ZARI');
    return balance.formatted.zari;
  }
}
