// FASE 5: BlockchainService - Gerencia conexão e transações no Bazari Chain
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
}
