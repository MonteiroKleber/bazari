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

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface LoyaltyInfo {
  name: string;
  symbol: string;
  totalSupply: string;
  bzrToPointsRatio: number;
  pointsToBzrRatio: number;
}

export interface EscrowInfo {
  id: string;
  buyer: string;
  seller: string;
  amount: string;
  status: 'Pending' | 'Funded' | 'Delivered' | 'Released' | 'Refunded' | 'Disputed';
  description: string;
  createdAt: string;
  deadline: string;
}

export interface ParticipantInfo {
  address: string;
  shareBps: number;
  pendingBalance: string;
}

/**
 * API de Contratos do SDK
 *
 * Permite interagir com smart contracts ink! na Bazari Chain
 *
 * @example
 * ```typescript
 * const sdk = new BazariSDK();
 *
 * // Deploy de contrato de fidelidade
 * const contract = await sdk.contracts.deployLoyalty({
 *   name: 'Pontos Café',
 *   symbol: 'PTC',
 *   bzrToPointsRatio: 100,
 *   pointsToBzrRatio: 100,
 * });
 *
 * // Emitir pontos
 * await sdk.contracts.loyalty(contract.address).issuePoints(
 *   customerAddress,
 *   1000,
 *   'Compra de café'
 * );
 * ```
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
      /**
       * Emite pontos para um cliente
       */
      issuePoints: (to: string, amount: number, reason: string): Promise<void> =>
        sendMessage('contracts:loyalty:issuePoints', { address, to, amount, reason }),

      /**
       * Resgata pontos por BZR
       */
      redeemPoints: (amount: number): Promise<{ bzrValue: string }> =>
        sendMessage('contracts:loyalty:redeem', { address, amount }),

      /**
       * Transfere pontos para outro usuário
       */
      transfer: (to: string, amount: number): Promise<void> =>
        sendMessage('contracts:loyalty:transfer', { address, to, amount }),

      /**
       * Consulta saldo de pontos
       */
      balanceOf: (account: string): Promise<string> =>
        sendMessage('contracts:loyalty:balanceOf', { address, account }),

      /**
       * Consulta tier do usuário
       */
      tierOf: (account: string): Promise<LoyaltyTier> =>
        sendMessage('contracts:loyalty:tierOf', { address, account }),

      /**
       * Consulta total de pontos ganhos
       */
      totalEarnedOf: (account: string): Promise<string> =>
        sendMessage('contracts:loyalty:totalEarnedOf', { address, account }),

      /**
       * Consulta informações do programa
       */
      getInfo: (): Promise<LoyaltyInfo> =>
        sendMessage('contracts:loyalty:getInfo', { address }),

      /**
       * Adiciona operador (só owner)
       */
      addOperator: (operator: string): Promise<void> =>
        sendMessage('contracts:loyalty:addOperator', { address, operator }),

      /**
       * Remove operador (só owner)
       */
      removeOperator: (operator: string): Promise<void> =>
        sendMessage('contracts:loyalty:removeOperator', { address, operator }),
    };
  }

  /**
   * Interage com contrato de escrow
   */
  escrow(id: string) {
    return {
      /**
       * Deposita fundos no escrow
       */
      fund: (): Promise<void> =>
        sendMessage('contracts:escrow:fund', { id }),

      /**
       * Confirma recebimento e libera fundos
       */
      confirmDelivery: (): Promise<void> =>
        sendMessage('contracts:escrow:confirmDelivery', { id }),

      /**
       * Abre disputa
       */
      openDispute: (reason: string): Promise<void> =>
        sendMessage('contracts:escrow:openDispute', { id, reason }),

      /**
       * Solicita reembolso
       */
      refund: (): Promise<void> =>
        sendMessage('contracts:escrow:refund', { id }),

      /**
       * Libera fundos manualmente (buyer ou mediator)
       */
      release: (): Promise<void> =>
        sendMessage('contracts:escrow:release', { id }),

      /**
       * Consulta status do escrow
       */
      getStatus: (): Promise<EscrowInfo> =>
        sendMessage('contracts:escrow:getStatus', { id }),
    };
  }

  /**
   * Cria novo escrow
   */
  async createEscrow(config: EscrowConfig): Promise<{ id: string }> {
    return sendMessage('contracts:escrow:create', config);
  }

  /**
   * Interage com contrato de revenue split
   */
  revenueSplit(address: string) {
    return {
      /**
       * Saca saldo pendente
       */
      withdraw: (): Promise<{ amount: string }> =>
        sendMessage('contracts:revenueSplit:withdraw', { address }),

      /**
       * Consulta saldo pendente
       */
      pendingBalance: (): Promise<string> =>
        sendMessage('contracts:revenueSplit:pendingBalance', { address }),

      /**
       * Consulta lista de participantes
       */
      getParticipants: (): Promise<ParticipantInfo[]> =>
        sendMessage('contracts:revenueSplit:getParticipants', { address }),

      /**
       * Consulta total distribuído
       */
      getTotalDistributed: (): Promise<string> =>
        sendMessage('contracts:revenueSplit:getTotalDistributed', { address }),

      /**
       * Adiciona participante (só owner)
       */
      addParticipant: (account: string, shareBps: number): Promise<void> =>
        sendMessage('contracts:revenueSplit:addParticipant', { address, account, shareBps }),

      /**
       * Remove participante (só owner)
       */
      removeParticipant: (account: string): Promise<void> =>
        sendMessage('contracts:revenueSplit:removeParticipant', { address, account }),

      /**
       * Atualiza share de participante (só owner)
       */
      updateShare: (account: string, newShareBps: number): Promise<void> =>
        sendMessage('contracts:revenueSplit:updateShare', { address, account, newShareBps }),
    };
  }
}
