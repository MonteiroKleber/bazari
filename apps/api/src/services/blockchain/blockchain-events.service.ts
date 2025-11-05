/**
 * BlockchainEventsService - Event listener para eventos da blockchain
 * Escuta eventos em tempo real e notifica callbacks registrados
 */
import { ApiPromise } from '@polkadot/api';
import { BlockchainService } from './blockchain.service.js';
import type { EventRecord } from '@polkadot/types/interfaces';

export interface CouncilProposedEvent {
  accountId: string;
  proposalIndex: number;
  proposalHash: string;
  threshold: number;
  blockNumber: number;
  txHash: string;
}

export interface CouncilVotedEvent {
  accountId: string;
  proposalHash: string;
  voted: boolean;
  yes: number;
  no: number;
  blockNumber: number;
  txHash: string;
}

export interface CouncilClosedEvent {
  proposalHash: string;
  yes: number;
  no: number;
  blockNumber: number;
  txHash: string;
}

export interface CouncilExecutedEvent {
  proposalHash: string;
  result: 'Ok' | 'Err';
  blockNumber: number;
  txHash: string;
}

export type EventHandler<T> = (event: T) => Promise<void> | void;

export interface EventHandlers {
  onProposed?: EventHandler<CouncilProposedEvent>;
  onVoted?: EventHandler<CouncilVotedEvent>;
  onClosed?: EventHandler<CouncilClosedEvent>;
  onExecuted?: EventHandler<CouncilExecutedEvent>;
  onError?: (error: Error) => void;
}

/**
 * Service para escutar eventos da blockchain em tempo real
 */
export class BlockchainEventsService {
  private static instance: BlockchainEventsService | null = null;
  private blockchainService: BlockchainService;
  private unsubscribe: (() => void) | null = null;
  private handlers: EventHandlers = {};
  private isListening = false;

  private constructor() {
    this.blockchainService = BlockchainService.getInstance();
  }

  static getInstance(): BlockchainEventsService {
    if (!BlockchainEventsService.instance) {
      BlockchainEventsService.instance = new BlockchainEventsService();
    }
    return BlockchainEventsService.instance;
  }

  /**
   * Registrar handlers de eventos
   */
  setHandlers(handlers: EventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Iniciar escuta de eventos
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('[BlockchainEvents] Already listening');
      return;
    }

    try {
      const api = await this.blockchainService.getApi();
      console.log('[BlockchainEvents] Starting to listen for finalized blocks...');

      // Subscribe to finalized blocks
      this.unsubscribe = await api.rpc.chain.subscribeFinalizedHeads(
        async (header) => {
          try {
            const blockHash = header.hash;
            const blockNumber = header.number.toNumber();

            // Get block with events
            const signedBlock = await api.rpc.chain.getBlock(blockHash);
            const allRecords = await api.query.system.events.at(blockHash);

            // Process each extrinsic in the block
            signedBlock.block.extrinsics.forEach((extrinsic, extrinsicIndex) => {
              const txHash = extrinsic.hash.toHex();

              // Get events for this extrinsic
              const extrinsicEvents = (allRecords as any).filter(
                ({ phase }: any) =>
                  phase.isApplyExtrinsic &&
                  phase.asApplyExtrinsic.eq(extrinsicIndex)
              );

              // Process council events
              this.processCouncilEvents(
                extrinsicEvents,
                blockNumber,
                txHash,
                api
              );
            });
          } catch (error) {
            console.error('[BlockchainEvents] Error processing block:', error);
            if (this.handlers.onError) {
              this.handlers.onError(error as Error);
            }
          }
        }
      );

      this.isListening = true;
      console.log('[BlockchainEvents] ✅ Successfully subscribed to finalized blocks');
    } catch (error) {
      console.error('[BlockchainEvents] Failed to start listening:', error);
      if (this.handlers.onError) {
        this.handlers.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Processar eventos do Council
   */
  private processCouncilEvents(
    events: EventRecord[],
    blockNumber: number,
    txHash: string,
    api: ApiPromise
  ): void {
    events.forEach((record) => {
      const { event } = record;

      if (event.section !== 'council') {
        return;
      }

      try {
        switch (event.method) {
          case 'Proposed': {
            // Event: Proposed(AccountId, ProposalIndex, Hash, MemberCount)
            const [accountId, proposalIndex, proposalHash, threshold] = event.data;

            const proposedEvent: CouncilProposedEvent = {
              accountId: accountId.toString(),
              proposalIndex: (proposalIndex as any).toNumber(),
              proposalHash: (proposalHash as any).toHex(),
              threshold: (threshold as any).toNumber(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Council.Proposed:', proposedEvent);

            if (this.handlers.onProposed) {
              Promise.resolve(this.handlers.onProposed(proposedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onProposed handler:', err);
              });
            }
            break;
          }

          case 'Voted': {
            // Event: Voted(AccountId, Hash, bool, MemberCount, MemberCount)
            const [accountId, proposalHash, voted, yes, no] = event.data;

            const votedEvent: CouncilVotedEvent = {
              accountId: accountId.toString(),
              proposalHash: (proposalHash as any).toHex(),
              voted: (voted as any).isTrue,
              yes: (yes as any).toNumber(),
              no: (no as any).toNumber(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Council.Voted:', votedEvent);

            if (this.handlers.onVoted) {
              Promise.resolve(this.handlers.onVoted(votedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onVoted handler:', err);
              });
            }
            break;
          }

          case 'Closed': {
            // Event: Closed(Hash, MemberCount, MemberCount)
            const [proposalHash, yes, no] = event.data;

            const closedEvent: CouncilClosedEvent = {
              proposalHash: (proposalHash as any).toHex(),
              yes: (yes as any).toNumber(),
              no: (no as any).toNumber(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Council.Closed:', closedEvent);

            if (this.handlers.onClosed) {
              Promise.resolve(this.handlers.onClosed(closedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onClosed handler:', err);
              });
            }
            break;
          }

          case 'Executed': {
            // Event: Executed(Hash, Result)
            const [proposalHash, result] = event.data;

            const executedEvent: CouncilExecutedEvent = {
              proposalHash: (proposalHash as any).toHex(),
              result: (result as any).isOk ? 'Ok' : 'Err',
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Council.Executed:', executedEvent);

            if (this.handlers.onExecuted) {
              Promise.resolve(this.handlers.onExecuted(executedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onExecuted handler:', err);
              });
            }
            break;
          }

          default:
            // Ignore other council events
            break;
        }
      } catch (error) {
        console.error(`[BlockchainEvents] Error processing ${event.method} event:`, error);
        if (this.handlers.onError) {
          this.handlers.onError(error as Error);
        }
      }
    });
  }

  /**
   * Parar escuta de eventos
   */
  async stopListening(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.isListening = false;
      console.log('[BlockchainEvents] Stopped listening');
    }
  }

  /**
   * Verificar se está escutando
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Desconectar completamente
   */
  async disconnect(): Promise<void> {
    await this.stopListening();
    await this.blockchainService.disconnect();
  }
}
