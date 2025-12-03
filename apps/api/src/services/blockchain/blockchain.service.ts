// FASE 5: BlockchainService - Gerencia conexão e transações no Bazari Chain
// @ts-nocheck - Polkadot.js type incompatibilities
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';

/**
 * Serviço singleton para gerenciar conexão com blockchain
 * Usado para escrow P2P multi-asset (BZR e ZARI)
 */
export class BlockchainService {
  private static instance: BlockchainService | null = null;
  private api: ApiPromise | null = null;
  private keyring: Keyring | null = null;
  private escrowAccount: KeyringPair | null = null;
  private wsEndpoint: string;
  private escrowSeed: string;

  private constructor(wsEndpoint: string, escrowSeed: string) {
    this.wsEndpoint = wsEndpoint;
    this.escrowSeed = escrowSeed;
  }

  /**
   * Get singleton instance
   */
  static getInstance(wsEndpoint?: string, escrowSeed?: string): BlockchainService {
    if (!BlockchainService.instance) {
      const endpoint = wsEndpoint || process.env.BAZARICHAIN_WS || 'ws://127.0.0.1:9944';
      const seed = escrowSeed || process.env.BAZARICHAIN_SUDO_SEED || '//Alice';
      BlockchainService.instance = new BlockchainService(endpoint, seed);
    }
    return BlockchainService.instance;
  }

  /**
   * Conectar ao blockchain (lazy initialization)
   */
  async connect(): Promise<ApiPromise> {
    if (this.api && this.api.isConnected) {
      return this.api;
    }

    console.log(`[Blockchain] Connecting to ${this.wsEndpoint}...`);
    const provider = new WsProvider(this.wsEndpoint);
    this.api = await ApiPromise.create({ provider });

    // Initialize keyring for signing
    this.keyring = new Keyring({ type: 'sr25519' });
    this.escrowAccount = this.keyring.addFromUri(this.escrowSeed);

    console.log(`[Blockchain] Connected! Escrow account: ${this.escrowAccount.address}`);
    return this.api;
  }

  /**
   * Desconectar do blockchain
   */
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
      console.log('[Blockchain] Disconnected');
    }
  }

  /**
   * Get API instance (conecta se necessário)
   */
  async getApi(): Promise<ApiPromise> {
    if (!this.api || !this.api.isConnected) {
      await this.connect();
    }
    return this.api!;
  }

  /**
   * Get escrow account
   */
  getEscrowAccount(): KeyringPair {
    if (!this.escrowAccount) {
      throw new Error('Blockchain not connected. Call connect() first.');
    }
    return this.escrowAccount;
  }

  /**
   * Get block number atual
   */
  async getCurrentBlock(): Promise<bigint> {
    const api = await this.getApi();
    const header = await api.rpc.chain.getHeader();
    return BigInt(header.number.toString());
  }

  /**
   * Assinar e enviar transação (genérico)
   */
  async signAndSend(
    tx: SubmittableExtrinsic<'promise', ISubmittableResult>,
    signer: KeyringPair
  ): Promise<{ txHash: string; blockNumber: bigint }> {
    return new Promise((resolve, reject) => {
      let blockNumber: bigint | null = null;

      tx.signAndSend(signer, ({ status, txHash, dispatchError }) => {
        console.log(`[Blockchain] TX status: ${status.type}`);

        if (status.isInBlock) {
          console.log(`[Blockchain] TX included in block: ${status.asInBlock.toString()}`);
          blockNumber = BigInt(status.asInBlock.toString());
        }

        if (status.isFinalized) {
          if (dispatchError) {
            if (dispatchError.isModule) {
              // Decode error
              const decoded = this.api!.registry.findMetaError(dispatchError.asModule);
              const { docs, name, section } = decoded;
              reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
            } else {
              reject(new Error(dispatchError.toString()));
            }
          } else {
            console.log(`[Blockchain] TX finalized: ${txHash.toString()}`);
            resolve({
              txHash: txHash.toString(),
              blockNumber: blockNumber || 0n,
            });
          }
        }
      }).catch((error) => {
        console.error('[Blockchain] TX error:', error);
        reject(error);
      });
    });
  }

  /**
   * Query balance BZR de uma conta
   */
  async getBalanceBZR(address: string): Promise<bigint> {
    const api = await this.getApi();
    const { data: balance } = await api.query.system.account(address);
    return BigInt(balance.free.toString());
  }

  /**
   * Query balance ZARI de uma conta
   */
  async getBalanceZARI(address: string): Promise<bigint> {
    const api = await this.getApi();
    const assetId = 1; // ZARI = asset 1

    const assetAccount = await api.query.assets.account(assetId, address);

    if (assetAccount.isNone) {
      return 0n;
    }

    const details = assetAccount.unwrap();
    return BigInt(details.balance.toString());
  }

  /**
   * Verificar se transação foi incluída em um bloco
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const api = await this.getApi();
      const signedBlock = await api.rpc.chain.getBlock();

      // Simple verification: check if block exists
      // In production, would need to query tx by hash
      return signedBlock !== null;
    } catch (error) {
      console.error('[Blockchain] Error verifying transaction:', error);
      return false;
    }
  }

  // ============================================================================
  // TRANSACTION BUILDERS - Commerce, Fulfillment, Attestation
  // ============================================================================

  /**
   * Criar pedido no pallet bazari-commerce
   * @param buyer - Endereço do comprador
   * @param seller - Endereço do vendedor
   * @param marketplace - ID do marketplace
   * @param items - Array de items [(listing_id, name, qty, price)]
   * @param totalAmount - Valor total em planck
   * @param signer - KeyringPair que assina a transação
   */
  async createOrder(
    buyer: string,
    seller: string,
    marketplace: number,
    items: Array<{ listingId: string | null; name: string; qty: number; price: bigint }>,
    totalAmount: bigint,
    signer: KeyringPair
  ): Promise<{ txHash: string; blockNumber: bigint; orderId?: number }> {
    const api = await this.getApi();

    // Format items for pallet call
    // Note: listingId must be a numeric u64. UUIDs are not supported by the pallet,
    // so we convert numeric IDs and pass null for UUID strings.
    // Item name is truncated to 128 chars (MaxItemNameLen in pallet).
    const MAX_ITEM_NAME_LEN = 128;
    const formattedItems = items.map((item) => {
      let listingIdOption = { none: null } as any;
      if (item.listingId !== null) {
        const numId = Number(item.listingId);
        if (!isNaN(numId) && Number.isInteger(numId) && numId >= 0) {
          listingIdOption = { some: numId };
        }
      }
      // Truncate item name to avoid ItemNameTooLong error (128 bytes max)
      let truncatedName = item.name;
      const nameBytes = Buffer.from(item.name, 'utf8');
      if (nameBytes.length > MAX_ITEM_NAME_LEN) {
        // Truncate to fit within 128 bytes (accounting for "..." suffix)
        let byteLen = MAX_ITEM_NAME_LEN - 3;
        while (byteLen > 0 && Buffer.from(item.name.slice(0, byteLen), 'utf8').length > MAX_ITEM_NAME_LEN - 3) {
          byteLen--;
        }
        truncatedName = item.name.slice(0, byteLen) + '...';
      }
      return [
        listingIdOption,
        truncatedName,
        item.qty,
        item.price.toString(),
      ];
    });

    const tx = api.tx.bazariCommerce.createOrder(
      marketplace,
      { none: null }, // courier (optional)
      seller,
      { none: null }, // affiliate (optional)
      formattedItems
    );

    // Custom signAndSend to extract orderId from OrderCreated event
    return new Promise((resolve, reject) => {
      let blockNumber: bigint | null = null;
      let orderId: number | undefined;

      tx.signAndSend(signer, ({ status, events, txHash, dispatchError }) => {
        console.log(`[Blockchain] CreateOrder TX status: ${status.type}`);

        if (status.isInBlock) {
          blockNumber = BigInt(status.asInBlock.toString());
          console.log(`[Blockchain] TX included in block: ${status.asInBlock.toString()}`);

          // Extract OrderCreated event to get orderId
          events.forEach(({ event }) => {
            if (api.events.bazariCommerce?.OrderCreated?.is(event)) {
              const [eventOrderId] = event.data;
              orderId = (eventOrderId as any).toNumber();
              console.log(`[Blockchain] OrderCreated event: orderId=${orderId}`);
            }
          });
        }

        if (status.isFinalized) {
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(dispatchError.asModule);
              const { docs, name, section } = decoded;
              reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
            } else {
              reject(new Error(dispatchError.toString()));
            }
          } else {
            console.log(`[Blockchain] CreateOrder finalized: txHash=${txHash.toString()}, orderId=${orderId}`);
            resolve({
              txHash: txHash.toString(),
              blockNumber: blockNumber || 0n,
              orderId,
            });
          }
        }
      }).catch((error) => {
        console.error('[Blockchain] CreateOrder error:', error);
        reject(error);
      });
    });
  }

  /**
   * Submeter prova de entrega no pallet bazari-attestation
   * @param orderId - ID do pedido
   * @param proofCid - CID IPFS da prova (foto, assinatura, etc)
   * @param attestor - Endereço do entregador (attestor)
   * @param signer - KeyringPair que assina a transação
   */
  async submitProof(
    orderId: number,
    proofCid: string,
    attestor: string,
    signer: KeyringPair
  ): Promise<{ txHash: string; blockNumber: bigint }> {
    const api = await this.getApi();

    const tx = api.tx.bazariAttestation.submitProof(orderId, proofCid, attestor);

    return await this.signAndSend(tx, signer);
  }

  /**
   * Registrar entregador no pallet bazari-fulfillment
   * @param courierAddress - Endereço do entregador
   * @param stake - Valor em stake (planck)
   * @param serviceAreas - Array de IDs de áreas de serviço
   * @param signer - KeyringPair que assina a transação
   */
  async registerCourier(
    courierAddress: string,
    stake: bigint,
    serviceAreas: number[],
    signer: KeyringPair
  ): Promise<{ txHash: string; blockNumber: bigint }> {
    const api = await this.getApi();

    const tx = api.tx.bazariFulfillment.registerCourier(stake.toString(), serviceAreas);

    return await this.signAndSend(tx, signer);
  }

  /**
   * Atualizar Merkle root de reviews no pallet bazari-fulfillment
   * @param courierAddress - Endereço do entregador
   * @param merkleRoot - Merkle root hex (0x...)
   * @param signer - KeyringPair que assina a transação
   */
  async updateReviewsMerkleRoot(
    courierAddress: string,
    merkleRoot: string,
    signer: KeyringPair
  ): Promise<{ txHash: string; blockNumber: bigint }> {
    const api = await this.getApi();

    const tx = api.tx.bazariFulfillment.updateReviewsMerkleRoot(merkleRoot);

    return await this.signAndSend(tx, signer);
  }

  // ============================================================================
  // QUERY HELPERS - Read blockchain state
  // ============================================================================

  /**
   * Buscar pedido pelo ID
   * @param orderId - ID do pedido
   * @returns Dados do pedido ou null se não existir
   */
  async getOrder(orderId: number): Promise<any | null> {
    const api = await this.getApi();

    const orderOption = await api.query.bazariCommerce.orders(orderId);

    if (orderOption.isNone) {
      return null;
    }

    const order = orderOption.unwrap();

    return {
      orderId: orderId,
      buyer: order.buyer.toString(),
      seller: order.seller.toString(),
      marketplace: order.marketplace.toNumber(),
      status: order.status.toString(),
      totalAmount: BigInt(order.totalAmount.toString()),
      items: order.items.map((item: any) => ({
        listingId: item.listingId.isSome ? item.listingId.unwrap().toString() : null,
        name: item.name.toUtf8(),
        qty: item.qty.toNumber(),
        price: BigInt(item.price.toString()),
      })),
      createdAt: order.createdAt.toNumber(),
    };
  }

  /**
   * Buscar entregador pelo endereço
   * @param courierAddress - Endereço do entregador
   * @returns Dados do entregador ou null se não existir
   */
  async getCourier(courierAddress: string): Promise<any | null> {
    const api = await this.getApi();

    const courierOption = await api.query.bazariFulfillment.couriers(courierAddress);

    if (courierOption.isNone) {
      return null;
    }

    const courier = courierOption.unwrap();

    return {
      account: courierAddress,
      stake: BigInt(courier.stake.toString()),
      reputationScore: courier.reputationScore.toNumber(),
      serviceAreas: courier.serviceAreas.map((area: any) => area.toNumber()),
      activeDeliveries: courier.activeDeliveries.toNumber(),
      totalDeliveries: courier.totalDeliveries.toNumber(),
      successfulDeliveries: courier.successfulDeliveries.toNumber(),
      status: courier.status.toString(),
    };
  }

  /**
   * Buscar disputa pelo ID
   * @param disputeId - ID da disputa
   * @returns Dados da disputa ou null se não existir
   */
  async getDispute(disputeId: number): Promise<any | null> {
    const api = await this.getApi();

    const disputeOption = await api.query.bazariDispute.disputes(disputeId);

    if (disputeOption.isNone) {
      return null;
    }

    const dispute = disputeOption.unwrap();

    return {
      disputeId: disputeId,
      orderId: dispute.orderId.toNumber(),
      plaintiff: dispute.plaintiff.toString(),
      defendant: dispute.defendant.toString(),
      jurors: dispute.jurors.map((juror: any) => juror.toString()),
      evidenceCid: dispute.evidenceCid.toUtf8(),
      status: dispute.status.toString(),
      ruling: dispute.ruling.isSome ? dispute.ruling.unwrap().toString() : null,
      createdAt: dispute.createdAt.toNumber(),
      commitDeadline: dispute.commitDeadline.toNumber(),
      revealDeadline: dispute.revealDeadline.toNumber(),
    };
  }

  // ==================== BAZARI REWARDS METHODS ====================

  /**
   * Mintar ZARI tokens como cashback
   * @param buyer - Endereço do comprador
   * @param orderAmount - Valor da order em BZR (string para precisão)
   * @returns Transaction hash e valor do cashback
   */
  async mintCashback(buyer: string, orderAmount: string): Promise<{ txHash: string; cashbackAmount: string }> {
    const api = await this.getApi();
    const escrow = this.getEscrowAccount();

    // Chamar extrinsic mint_cashback do pallet bazari-rewards
    const extrinsic = api.tx.bazariRewards.mintCashback(buyer, orderAmount);

    const result = await this.signAndSend(extrinsic, escrow);

    // Extrair evento CashbackMinted
    const cashbackEvent = result.events.find(
      ({ event }) => api.events.bazariRewards.CashbackMinted.is(event)
    );

    if (!cashbackEvent) {
      throw new Error('CashbackMinted event not found');
    }

    const [user, amount, orderAmt] = cashbackEvent.event.data;

    return {
      txHash: result.status.asInBlock.toString(),
      cashbackAmount: amount.toString(),
    };
  }

  /**
   * Criar nova missão (DAO only)
   * @param params - Parâmetros da missão
   * @returns Mission ID e transaction hash
   */
  async createMission(params: {
    title: string;
    description: string;
    missionType: string;
    rewardAmount: string;
    requiredCount: number;
  }): Promise<{ missionId: number; txHash: string }> {
    const api = await this.getApi();
    const escrow = this.getEscrowAccount(); // TODO: Usar DAO account

    const extrinsic = api.tx.bazariRewards.createMission(
      params.title,
      params.description,
      params.missionType,
      params.rewardAmount,
      params.requiredCount
    );

    const result = await this.signAndSend(extrinsic, escrow);

    // Extrair MissionCreated event
    const missionEvent = result.events.find(
      ({ event }) => api.events.bazariRewards.MissionCreated.is(event)
    );

    if (!missionEvent) {
      throw new Error('MissionCreated event not found');
    }

    const [missionId] = missionEvent.event.data;

    return {
      missionId: missionId.toNumber(),
      txHash: result.status.asInBlock.toString(),
    };
  }

  /**
   * Atualizar progresso de missão do usuário
   * @param user - Endereço do usuário
   * @param missionId - ID da missão
   * @param increment - Quantidade a incrementar
   * @returns Transaction hash
   */
  async progressMission(user: string, missionId: number, increment: number): Promise<string> {
    const api = await this.getApi();
    const escrow = this.getEscrowAccount(); // Backend/root account

    const extrinsic = api.tx.bazariRewards.updateProgress(user, missionId, increment);

    const result = await this.signAndSend(extrinsic, escrow);

    return result.status.asInBlock.toString();
  }

  /**
   * Buscar missão por ID
   * @param missionId - ID da missão
   * @returns Dados da missão ou null
   */
  async getMission(missionId: number): Promise<any | null> {
    const api = await this.getApi();

    const missionOption = await api.query.bazariRewards.missions(missionId);

    if (missionOption.isNone) {
      return null;
    }

    const mission = missionOption.unwrap();

    return {
      missionId,
      title: mission.title.toUtf8(),
      description: mission.description.toUtf8(),
      missionType: mission.missionType.toString(),
      rewardAmount: mission.rewardAmount.toString(),
      requiredCount: mission.requiredCount.toNumber(),
      isActive: mission.isActive.toPrimitive(),
      createdAt: mission.createdAt.toNumber(),
    };
  }

  /**
   * Buscar todas as missões ativas
   * @returns Array de missões
   */
  async getAllMissions(): Promise<any[]> {
    try {
      const api = await this.getApi();

      // Verificar se o pallet bazariRewards existe
      if (!api.query.bazariRewards || !api.query.bazariRewards.missions) {
        console.warn('[BlockchainService] Pallet bazari-rewards not available or no missions storage');
        return [];
      }

      const entries = await api.query.bazariRewards.missions.entries();

      // Se não houver entries, retornar array vazio
      if (!entries || entries.length === 0) {
        return [];
      }

      const missions = entries
        .filter(([_key, value]) => !value.isNone)
        .map(([key, value]) => {
          const mission = value.unwrap();
          const missionId = key.args[0].toNumber();

          return {
            missionId,
            title: mission.title.toUtf8(),
            description: mission.description.toUtf8(),
            missionType: mission.missionType.toString(),
            rewardAmount: mission.rewardAmount.toString(),
            requiredCount: mission.requiredCount.toNumber(),
            isActive: mission.isActive.toPrimitive(),
            createdAt: mission.createdAt.toNumber(),
          };
        })
        .filter((m) => m.isActive); // Apenas ativas

      return missions;
    } catch (error) {
      console.error('[BlockchainService] Failed to get all missions:', error);
      return []; // Retornar array vazio em vez de propagar erro
    }
  }

  /**
   * Buscar progresso do usuário em uma missão
   * @param user - Endereço do usuário
   * @param missionId - ID da missão
   * @returns Progresso do usuário ou null
   */
  async getUserMissionProgress(user: string, missionId: number): Promise<any | null> {
    const api = await this.getApi();

    const progressOption = await api.query.bazariRewards.userProgress(user, missionId);

    if (progressOption.isNone) {
      return null;
    }

    const progress = progressOption.unwrap();

    return {
      currentCount: progress.currentCount.toNumber(),
      isCompleted: progress.isCompleted.toPrimitive(),
      isClaimed: progress.isClaimed.toPrimitive(),
      completedAt: progress.completedAt.isSome ? progress.completedAt.unwrap().toNumber() : null,
    };
  }

  /**
   * Buscar saldo de ZARI do usuário
   * @param user - Endereço do usuário
   * @returns Saldo em string (smallest unit)
   */
  async getZariBalance(user: string): Promise<string> {
    const api = await this.getApi();

    // ZARI é AssetId 1 no pallet-assets
    const accountOption = await api.query.assets.account(1, user);

    if (accountOption.isNone) {
      return '0';
    }

    const account = accountOption.unwrap();
    return account.balance.toString();
  }

  /**
   * Subscrever a eventos do pallet bazari-rewards
   * @param callback - Função chamada quando evento é emitido
   * @returns Unsubscribe function
   */
  async subscribeToRewardsEvents(
    callback: (event: { type: string; data: any }) => void
  ): Promise<() => void> {
    const api = await this.getApi();

    const unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariRewards.MissionCreated.is(event)) {
          callback({ type: 'MissionCreated', data: event.data.toJSON() });
        } else if (api.events.bazariRewards.MissionCompleted.is(event)) {
          callback({ type: 'MissionCompleted', data: event.data.toJSON() });
        } else if (api.events.bazariRewards.CashbackMinted.is(event)) {
          callback({ type: 'CashbackMinted', data: event.data.toJSON() });
        } else if (api.events.bazariRewards.RewardClaimed.is(event)) {
          callback({ type: 'RewardClaimed', data: event.data.toJSON() });
        }
      });
    });

    return unsubscribe;
  }
}
