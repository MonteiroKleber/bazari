// Governance Service - Submete propostas para a blockchain
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { signatureVerify } from '@polkadot/util-crypto';
import { getSubstrateApi } from '../../lib/substrate.js';
import { env } from '../../env.js';

export interface ProposalMetadata {
  title: string;
  description: string;
  proposer: string;
  signature: string;
}

export interface DemocracyProposalParams extends ProposalMetadata {
  preimageHash?: string;
}

export interface TreasuryProposalParams extends ProposalMetadata {
  beneficiary: string;
  value: string; // Amount in planck (smallest unit)
}

export interface ProposalResult {
  proposalId: number;
  txHash: string;
  blockHash: string;
  blockNumber: number;
}

export class GovernanceService {
  private static keyring = new Keyring({ type: 'sr25519' });

  /**
   * Verifica se a assinatura é válida
   */
  static verifySignature(message: string, signature: string, address: string): boolean {
    try {
      const messageU8a = new TextEncoder().encode(message);
      const signatureU8a = hexToU8a(signature);

      const result = signatureVerify(messageU8a, signatureU8a, address);
      return result.isValid;
    } catch (error) {
      console.error('[Governance] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Cria preimage com metadados da proposta
   */
  static async createPreimage(
    api: ApiPromise,
    params: ProposalMetadata
  ): Promise<string> {
    // Cria uma call remark com os metadados JSON
    const metadata = JSON.stringify({
      title: params.title,
      description: params.description,
      proposer: params.proposer,
      timestamp: new Date().toISOString(),
    });

    const remarkCall = api.tx.system.remark(metadata);
    const preimageHash = remarkCall.method.hash.toHex();

    return preimageHash;
  }

  /**
   * Submete proposta de democracia (democracy.propose)
   */
  static async submitDemocracyProposal(
    params: DemocracyProposalParams
  ): Promise<ProposalResult> {
    const api = await getSubstrateApi();

    // Verificar assinatura
    const messageData = JSON.stringify({
      type: 'democracy',
      title: params.title,
      description: params.description,
      preimageHash: params.preimageHash,
      proposer: params.proposer,
    });

    if (!this.verifySignature(messageData, params.signature, params.proposer)) {
      throw new Error('Assinatura inválida');
    }

    // Criar preimage se não fornecido
    let preimageHash = params.preimageHash;
    if (!preimageHash) {
      preimageHash = await this.createPreimage(api, params);
    }

    // Obter conta do proposer usando seed da conta de sudo (temporário)
    // TODO: Implementar sistema de contas delegadas ou usar a assinatura do frontend
    const sudoAccount = this.keyring.addFromUri(env.BAZARICHAIN_SUDO_SEED);

    // Obter deposit mínimo
    const minimumDeposit = api.consts.democracy?.minimumDeposit || api.createType('Balance', 1000000000000);

    // Criar extrinsic
    const proposeTx = api.tx.democracy.propose(preimageHash, minimumDeposit);

    // Assinar e enviar
    return new Promise((resolve, reject) => {
      let proposalId: number | null = null;
      let blockHash: string | null = null;
      let blockNumber: number | null = null;

      proposeTx.signAndSend(sudoAccount, ({ status, events, txHash, dispatchError }) => {
        console.log(`[Governance] Democracy proposal TX status: ${status.type}`);

        if (status.isInBlock) {
          blockHash = status.asInBlock.toHex();
          console.log(`[Governance] TX in block: ${blockHash}`);

          // Procurar evento de proposta criada
          events.forEach(({ event }) => {
            if (api.events.democracy.Proposed && event.section === 'democracy' && event.method === 'Proposed') {
              proposalId = (event.data[0] as any).toNumber();
              console.log(`[Governance] Proposal created with ID: ${proposalId}`);
            }
          });
        }

        if (status.isFinalized) {
          if (dispatchError) {
            let errorMsg = 'Transaction failed';
            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } catch (e) {
                errorMsg = dispatchError.toString();
              }
            } else {
              errorMsg = dispatchError.toString();
            }
            reject(new Error(errorMsg));
          } else {
            // Obter block number
            api.rpc.chain.getHeader(blockHash!).then((header) => {
              blockNumber = header.number.toNumber();

              resolve({
                proposalId: proposalId || 0,
                txHash: txHash.toHex(),
                blockHash: blockHash!,
                blockNumber: blockNumber,
              });
            }).catch(reject);
          }
        }
      }).catch((error) => {
        console.error('[Governance] TX submission error:', error);
        reject(error);
      });
    });
  }

  /**
   * Submete proposta de tesouro (treasury.proposeSpend)
   */
  static async submitTreasuryProposal(
    params: TreasuryProposalParams
  ): Promise<ProposalResult> {
    const api = await getSubstrateApi();

    // Verificar assinatura
    const messageData = JSON.stringify({
      type: 'treasury',
      title: params.title,
      description: params.description,
      beneficiary: params.beneficiary,
      value: params.value,
      proposer: params.proposer,
    });

    if (!this.verifySignature(messageData, params.signature, params.proposer)) {
      throw new Error('Assinatura inválida');
    }

    // Usar conta sudo (temporário)
    const sudoAccount = this.keyring.addFromUri(env.BAZARICHAIN_SUDO_SEED);

    // Criar extrinsic
    const value = api.createType('Balance', params.value);
    const proposeTx = api.tx.treasury.proposeSpend(value, params.beneficiary);

    // Assinar e enviar
    return new Promise((resolve, reject) => {
      let proposalId: number | null = null;
      let blockHash: string | null = null;
      let blockNumber: number | null = null;

      proposeTx.signAndSend(sudoAccount, ({ status, events, txHash, dispatchError }) => {
        console.log(`[Governance] Treasury proposal TX status: ${status.type}`);

        if (status.isInBlock) {
          blockHash = status.asInBlock.toHex();

          // Procurar evento de proposta criada
          events.forEach(({ event }) => {
            if (api.events.treasury.Proposed && event.section === 'treasury' && event.method === 'Proposed') {
              proposalId = (event.data[0] as any).toNumber();
              console.log(`[Governance] Treasury proposal created with ID: ${proposalId}`);
            }
          });
        }

        if (status.isFinalized) {
          if (dispatchError) {
            let errorMsg = 'Transaction failed';
            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } catch (e) {
                errorMsg = dispatchError.toString();
              }
            } else {
              errorMsg = dispatchError.toString();
            }
            reject(new Error(errorMsg));
          } else {
            api.rpc.chain.getHeader(blockHash!).then((header) => {
              blockNumber = header.number.toNumber();

              resolve({
                proposalId: proposalId || 0,
                txHash: txHash.toHex(),
                blockHash: blockHash!,
                blockNumber: blockNumber,
              });
            }).catch(reject);
          }
        }
      }).catch(reject);
    });
  }

  /**
   * Submete proposta de council
   */
  static async submitCouncilProposal(
    params: ProposalMetadata
  ): Promise<ProposalResult> {
    const api = await getSubstrateApi();

    // Verificar assinatura
    const messageData = JSON.stringify({
      type: 'council',
      title: params.title,
      description: params.description,
      proposer: params.proposer,
    });

    if (!this.verifySignature(messageData, params.signature, params.proposer)) {
      throw new Error('Assinatura inválida');
    }

    // Criar preimage com metadados
    const preimageHash = await this.createPreimage(api, params);

    // Usar conta sudo (temporário)
    const sudoAccount = this.keyring.addFromUri(env.BAZARICHAIN_SUDO_SEED);

    // Criar proposal
    const remarkCall = api.tx.system.remark(preimageHash);
    const threshold = 1; // Maioria simples
    const lengthBound = remarkCall.encodedLength;

    const proposeTx = api.tx.council.propose(threshold, remarkCall, lengthBound);

    // Assinar e enviar
    return new Promise((resolve, reject) => {
      let proposalHash: string | null = null;
      let blockHash: string | null = null;
      let blockNumber: number | null = null;

      proposeTx.signAndSend(sudoAccount, ({ status, events, txHash, dispatchError }) => {
        console.log(`[Governance] Council proposal TX status: ${status.type}`);

        if (status.isInBlock) {
          blockHash = status.asInBlock.toHex();

          // Procurar evento de proposta criada
          events.forEach(({ event }) => {
            if (api.events.council.Proposed && event.section === 'council' && event.method === 'Proposed') {
              proposalHash = (event.data[2] as any).toHex();
              console.log(`[Governance] Council proposal created: ${proposalHash}`);
            }
          });
        }

        if (status.isFinalized) {
          if (dispatchError) {
            let errorMsg = 'Transaction failed';
            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } catch (e) {
                errorMsg = dispatchError.toString();
              }
            } else {
              errorMsg = dispatchError.toString();
            }
            reject(new Error(errorMsg));
          } else {
            api.rpc.chain.getHeader(blockHash!).then((header) => {
              blockNumber = header.number.toNumber();

              resolve({
                proposalId: 0, // Council usa hash ao invés de ID numérico
                txHash: txHash.toHex(),
                blockHash: blockHash!,
                blockNumber: blockNumber,
              });
            }).catch(reject);
          }
        }
      }).catch(reject);
    });
  }

  /**
   * Submete proposta de technical committee
   */
  static async submitTechCommitteeProposal(
    params: ProposalMetadata
  ): Promise<ProposalResult> {
    const api = await getSubstrateApi();

    // Verificar assinatura
    const messageData = JSON.stringify({
      type: 'technical',
      title: params.title,
      description: params.description,
      proposer: params.proposer,
    });

    if (!this.verifySignature(messageData, params.signature, params.proposer)) {
      throw new Error('Assinatura inválida');
    }

    // Criar preimage com metadados
    const preimageHash = await this.createPreimage(api, params);

    // Usar conta sudo (temporário)
    const sudoAccount = this.keyring.addFromUri(env.BAZARICHAIN_SUDO_SEED);

    // Criar proposal
    const remarkCall = api.tx.system.remark(preimageHash);
    const threshold = 1;
    const lengthBound = remarkCall.encodedLength;

    const proposeTx = api.tx.technicalCommittee.propose(threshold, remarkCall, lengthBound);

    // Assinar e enviar
    return new Promise((resolve, reject) => {
      let proposalHash: string | null = null;
      let blockHash: string | null = null;
      let blockNumber: number | null = null;

      proposeTx.signAndSend(sudoAccount, ({ status, events, txHash, dispatchError }) => {
        console.log(`[Governance] Tech committee proposal TX status: ${status.type}`);

        if (status.isInBlock) {
          blockHash = status.asInBlock.toHex();

          // Procurar evento de proposta criada
          events.forEach(({ event }) => {
            if (api.events.technicalCommittee.Proposed && event.section === 'technicalCommittee' && event.method === 'Proposed') {
              proposalHash = (event.data[2] as any).toHex();
              console.log(`[Governance] Tech committee proposal created: ${proposalHash}`);
            }
          });
        }

        if (status.isFinalized) {
          if (dispatchError) {
            let errorMsg = 'Transaction failed';
            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } catch (e) {
                errorMsg = dispatchError.toString();
              }
            } else {
              errorMsg = dispatchError.toString();
            }
            reject(new Error(errorMsg));
          } else {
            api.rpc.chain.getHeader(blockHash!).then((header) => {
              blockNumber = header.number.toNumber();

              resolve({
                proposalId: 0, // Tech committee usa hash
                txHash: txHash.toHex(),
                blockHash: blockHash!,
                blockNumber: blockNumber,
              });
            }).catch(reject);
          }
        }
      }).catch(reject);
    });
  }
}
