/**
 * BlockchainEventsService - Event listener para eventos da blockchain
 * Escuta eventos em tempo real e notifica callbacks registrados
 */
// @ts-nocheck - Polkadot.js type incompatibilities
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

export interface BalancesTransferEvent {
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
  txHash: string;
}

export interface TreasurySpendingEvent {
  amount: string;
  blockNumber: number;
  txHash: string;
}

export interface DemocracyStartedEvent {
  refIndex: number;
  threshold: any;
  blockNumber: number;
  txHash: string;
}

export interface DemocracyProposedEvent {
  proposalIndex: number;
  deposit: string;
  blockNumber: number;
  txHash: string;
}

export interface DemocracySecondedEvent {
  seconder: string;
  proposalIndex: number;
  blockNumber: number;
  txHash: string;
}

export interface DemocracyVotedEvent {
  voter: string;
  refIndex: number;
  vote: any;
  blockNumber: number;
  txHash: string;
}

export interface DemocracyPassedEvent {
  refIndex: number;
  blockNumber: number;
  txHash: string;
}

export interface DemocracyNotPassedEvent {
  refIndex: number;
  blockNumber: number;
  txHash: string;
}

export interface DemocracyExecutedEvent {
  refIndex: number;
  result: 'Ok' | 'Err';
  blockNumber: number;
  txHash: string;
}

// Commerce Events
export interface OrderCreatedEvent {
  orderId: number;
  buyer: string;
  seller: string;
  marketplace: number;
  totalAmount: string;
  blockNumber: number;
  txHash: string;
}

export interface ProofSubmittedEvent {
  orderId: number;
  attestor: string;
  proofCid: string;
  blockNumber: number;
  txHash: string;
}

export interface DisputeOpenedEvent {
  disputeId: number;
  orderId: number;
  plaintiff: string;
  blockNumber: number;
  txHash: string;
}

export interface CommissionRecordedEvent {
  saleId: number;
  amount: string;
  recipient: string;
  blockNumber: number;
  txHash: string;
}

export type EventHandler<T> = (event: T) => Promise<void> | void;

export interface EventHandlers {
  onProposed?: EventHandler<CouncilProposedEvent>;
  onVoted?: EventHandler<CouncilVotedEvent>;
  onClosed?: EventHandler<CouncilClosedEvent>;
  onExecuted?: EventHandler<CouncilExecutedEvent>;
  onBalancesTransfer?: EventHandler<BalancesTransferEvent>;
  onTreasurySpending?: EventHandler<TreasurySpendingEvent>;
  onDemocracyStarted?: EventHandler<DemocracyStartedEvent>;
  onDemocracyProposed?: EventHandler<DemocracyProposedEvent>;
  onDemocracySeconded?: EventHandler<DemocracySecondedEvent>;
  onDemocracyVoted?: EventHandler<DemocracyVotedEvent>;
  onDemocracyPassed?: EventHandler<DemocracyPassedEvent>;
  onDemocracyNotPassed?: EventHandler<DemocracyNotPassedEvent>;
  onDemocracyExecuted?: EventHandler<DemocracyExecutedEvent>;
  // Commerce Events
  onOrderCreated?: EventHandler<OrderCreatedEvent>;
  onProofSubmitted?: EventHandler<ProofSubmittedEvent>;
  onDisputeOpened?: EventHandler<DisputeOpenedEvent>;
  onCommissionRecorded?: EventHandler<CommissionRecordedEvent>;
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

              // Process democracy events
              this.processDemocracyEvents(
                extrinsicEvents,
                blockNumber,
                txHash,
                api
              );

              // Process balances events (for Treasury payouts)
              this.processBalancesEvents(
                extrinsicEvents,
                blockNumber,
                txHash,
                api
              );

              // Process treasury events (for automatic payouts)
              this.processTreasuryEvents(
                extrinsicEvents,
                blockNumber,
                txHash,
                api
              );

              // Process commerce events (OrderCreated, ProofSubmitted, DisputeOpened)
              this.processCommerceEvents(
                extrinsicEvents,
                blockNumber,
                txHash,
                api
              );
            });

            // CRITICAL FIX: Process system-initiated events (e.g., Democracy.Started from on_initialize)
            // These events are NOT part of any extrinsic, they have phase.isFinalization or phase.isInitialization
            const systemEvents = (allRecords as any).filter(
              ({ phase }: any) => !phase.isApplyExtrinsic
            );

            if (systemEvents.length > 0) {
              const systemTxHash = '0x' + '0'.repeat(64); // Placeholder for system events

              // Process democracy system events (e.g., Started)
              this.processDemocracyEvents(
                systemEvents,
                blockNumber,
                systemTxHash,
                api
              );
            }
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
   * Processar eventos de Democracy
   */
  private processDemocracyEvents(
    events: EventRecord[],
    blockNumber: number,
    txHash: string,
    api: ApiPromise
  ): void {
    events.forEach((record) => {
      const { event } = record;

      if (event.section !== 'democracy') {
        return;
      }

      try {
        switch (event.method) {
          case 'Started': {
            // Event: Started(ReferendumIndex, VoteThreshold)
            const [refIndex, threshold] = event.data;

            const startedEvent: DemocracyStartedEvent = {
              refIndex: (refIndex as any).toNumber(),
              threshold: (threshold as any).toJSON(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Democracy.Started:', startedEvent);

            if (this.handlers.onDemocracyStarted) {
              Promise.resolve(this.handlers.onDemocracyStarted(startedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onDemocracyStarted handler:', err);
              });
            }
            break;
          }

          case 'Proposed': {
            // Event: Proposed(ProposalIndex, Balance)
            const [proposalIndex, deposit] = event.data;

            const proposedEvent: DemocracyProposedEvent = {
              proposalIndex: (proposalIndex as any).toNumber(),
              deposit: (deposit as any).toString(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Democracy.Proposed:', proposedEvent);

            if (this.handlers.onDemocracyProposed) {
              Promise.resolve(this.handlers.onDemocracyProposed(proposedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onDemocracyProposed handler:', err);
              });
            }
            break;
          }

          case 'Seconded': {
            // Event: Seconded(AccountId, ProposalIndex)
            const [seconder, proposalIndex] = event.data;

            const secondedEvent: DemocracySecondedEvent = {
              seconder: seconder.toString(),
              proposalIndex: (proposalIndex as any).toNumber(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Democracy.Seconded:', secondedEvent);

            if (this.handlers.onDemocracySeconded) {
              Promise.resolve(this.handlers.onDemocracySeconded(secondedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onDemocracySeconded handler:', err);
              });
            }
            break;
          }

          case 'Voted': {
            // Event: Voted(AccountId, ReferendumIndex, Vote)
            const [voter, refIndex, vote] = event.data;

            const votedEvent: DemocracyVotedEvent = {
              voter: voter.toString(),
              refIndex: (refIndex as any).toNumber(),
              vote: (vote as any).toJSON(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Democracy.Voted:', votedEvent);

            if (this.handlers.onDemocracyVoted) {
              Promise.resolve(this.handlers.onDemocracyVoted(votedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onDemocracyVoted handler:', err);
              });
            }
            break;
          }

          case 'Passed': {
            // Event: Passed(ReferendumIndex)
            const [refIndex] = event.data;

            const passedEvent: DemocracyPassedEvent = {
              refIndex: (refIndex as any).toNumber(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Democracy.Passed:', passedEvent);

            if (this.handlers.onDemocracyPassed) {
              Promise.resolve(this.handlers.onDemocracyPassed(passedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onDemocracyPassed handler:', err);
              });
            }
            break;
          }

          case 'NotPassed': {
            // Event: NotPassed(ReferendumIndex)
            const [refIndex] = event.data;

            const notPassedEvent: DemocracyNotPassedEvent = {
              refIndex: (refIndex as any).toNumber(),
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Democracy.NotPassed:', notPassedEvent);

            if (this.handlers.onDemocracyNotPassed) {
              Promise.resolve(this.handlers.onDemocracyNotPassed(notPassedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onDemocracyNotPassed handler:', err);
              });
            }
            break;
          }

          case 'Executed': {
            // Event: Executed(ReferendumIndex, Result)
            const [refIndex, result] = event.data;

            const executedEvent: DemocracyExecutedEvent = {
              refIndex: (refIndex as any).toNumber(),
              result: (result as any).isOk ? 'Ok' : 'Err',
              blockNumber,
              txHash,
            };

            console.log('[BlockchainEvents] Democracy.Executed:', executedEvent);

            if (this.handlers.onDemocracyExecuted) {
              Promise.resolve(this.handlers.onDemocracyExecuted(executedEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onDemocracyExecuted handler:', err);
              });
            }
            break;
          }

          default:
            // Ignore other democracy events
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
   * Processar eventos do Balances (para detectar Treasury payouts)
   */
  private processBalancesEvents(
    events: EventRecord[],
    blockNumber: number,
    txHash: string,
    api: ApiPromise
  ): void {
    events.forEach((record) => {
      const { event } = record;

      if (event.section !== 'balances') {
        return;
      }

      try {
        switch (event.method) {
          case 'Transfer': {
            // Event: Transfer(AccountId, AccountId, Balance)
            const [from, to, amount] = event.data;

            const transferEvent: BalancesTransferEvent = {
              from: from.toString(),
              to: to.toString(),
              amount: amount.toString(),
              blockNumber,
              txHash,
            };

            // Only log and process if handler is registered (to avoid spam)
            if (this.handlers.onBalancesTransfer) {
              console.log('[BlockchainEvents] Balances.Transfer:', {
                from: transferEvent.from.slice(0, 10) + '...',
                to: transferEvent.to.slice(0, 10) + '...',
                amount: (parseFloat(transferEvent.amount) / 1e12).toFixed(4) + ' BZR',
                block: blockNumber,
              });

              Promise.resolve(this.handlers.onBalancesTransfer(transferEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onBalancesTransfer handler:', err);
              });
            }
            break;
          }

          default:
            // Ignore other balances events
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
   * Processar eventos do Treasury (para detectar pagamentos automáticos)
   */
  private processTreasuryEvents(
    events: EventRecord[],
    blockNumber: number,
    txHash: string,
    api: ApiPromise
  ): void {
    events.forEach((record) => {
      const { event } = record;

      if (event.section !== 'treasury') {
        return;
      }

      try {
        switch (event.method) {
          case 'Spending': {
            // Event: Spending(Balance)
            const [amount] = event.data;

            const spendingEvent: TreasurySpendingEvent = {
              amount: amount.toString(),
              blockNumber,
              txHash,
            };

            // Only log and process if handler is registered
            if (this.handlers.onTreasurySpending) {
              console.log('[BlockchainEvents] Treasury.Spending:', {
                amount: (parseFloat(spendingEvent.amount) / 1e12).toFixed(4) + ' BZR',
                block: blockNumber,
              });

              Promise.resolve(this.handlers.onTreasurySpending(spendingEvent)).catch((err: any) => {
                console.error('[BlockchainEvents] Error in onTreasurySpending handler:', err);
              });
            }
            break;
          }

          default:
            // Ignore other treasury events
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
   * Processar eventos de Commerce (OrderCreated, ProofSubmitted, DisputeOpened)
   */
  private processCommerceEvents(
    events: EventRecord[],
    blockNumber: number,
    txHash: string,
    api: ApiPromise
  ): void {
    events.forEach((record: EventRecord) => {
      const { event } = record;

      try {
        switch (event.section) {
          case 'bazariCommerce': {
            if (event.method === 'OrderCreated') {
              const [orderId, buyer, seller, marketplace, totalAmount] = event.data as any;

              const orderCreatedEvent: OrderCreatedEvent = {
                orderId: orderId.toNumber(),
                buyer: buyer.toString(),
                seller: seller.toString(),
                marketplace: marketplace.toNumber(),
                totalAmount: totalAmount.toString(),
                blockNumber,
                txHash,
              };

              if (this.handlers.onOrderCreated) {
                console.log('[BlockchainEvents] BazariCommerce.OrderCreated:', {
                  orderId: orderCreatedEvent.orderId,
                  buyer: orderCreatedEvent.buyer,
                  seller: orderCreatedEvent.seller,
                  amount: (parseFloat(orderCreatedEvent.totalAmount) / 1e12).toFixed(4) + ' BZR',
                  block: blockNumber,
                });

                Promise.resolve(this.handlers.onOrderCreated(orderCreatedEvent)).catch((err: any) => {
                  console.error('[BlockchainEvents] Error in onOrderCreated handler:', err);
                });
              }
            } else if (event.method === 'CommissionRecorded') {
              const [saleId, amount, recipient] = event.data as any;

              const commissionRecordedEvent: CommissionRecordedEvent = {
                saleId: saleId.toNumber(),
                amount: amount.toString(),
                recipient: recipient.toString(),
                blockNumber,
                txHash,
              };

              if (this.handlers.onCommissionRecorded) {
                console.log('[BlockchainEvents] BazariCommerce.CommissionRecorded:', {
                  saleId: commissionRecordedEvent.saleId,
                  amount: (parseFloat(commissionRecordedEvent.amount) / 1e12).toFixed(4) + ' BZR',
                  recipient: commissionRecordedEvent.recipient,
                  block: blockNumber,
                });

                Promise.resolve(this.handlers.onCommissionRecorded(commissionRecordedEvent)).catch((err: any) => {
                  console.error('[BlockchainEvents] Error in onCommissionRecorded handler:', err);
                });
              }
            }
            break;
          }

          case 'bazariAttestation': {
            if (event.method === 'ProofSubmitted') {
              const [orderId, attestor, proofCid] = event.data as any;

              const proofSubmittedEvent: ProofSubmittedEvent = {
                orderId: orderId.toNumber(),
                attestor: attestor.toString(),
                proofCid: proofCid.toUtf8(),
                blockNumber,
                txHash,
              };

              if (this.handlers.onProofSubmitted) {
                console.log('[BlockchainEvents] BazariAttestation.ProofSubmitted:', {
                  orderId: proofSubmittedEvent.orderId,
                  attestor: proofSubmittedEvent.attestor,
                  proofCid: proofSubmittedEvent.proofCid,
                  block: blockNumber,
                });

                Promise.resolve(this.handlers.onProofSubmitted(proofSubmittedEvent)).catch((err: any) => {
                  console.error('[BlockchainEvents] Error in onProofSubmitted handler:', err);
                });
              }
            }
            break;
          }

          case 'bazariDispute': {
            if (event.method === 'DisputeOpened') {
              const [disputeId, orderId, plaintiff] = event.data as any;

              const disputeOpenedEvent: DisputeOpenedEvent = {
                disputeId: disputeId.toNumber(),
                orderId: orderId.toNumber(),
                plaintiff: plaintiff.toString(),
                blockNumber,
                txHash,
              };

              if (this.handlers.onDisputeOpened) {
                console.log('[BlockchainEvents] BazariDispute.DisputeOpened:', {
                  disputeId: disputeOpenedEvent.disputeId,
                  orderId: disputeOpenedEvent.orderId,
                  plaintiff: disputeOpenedEvent.plaintiff,
                  block: blockNumber,
                });

                Promise.resolve(this.handlers.onDisputeOpened(disputeOpenedEvent)).catch((err: any) => {
                  console.error('[BlockchainEvents] Error in onDisputeOpened handler:', err);
                });
              }
            }
            break;
          }

          default:
            // Ignore other commerce-related events
            break;
        }
      } catch (error) {
        console.error(`[BlockchainEvents] Error processing ${event.section}.${event.method} event:`, error);
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
