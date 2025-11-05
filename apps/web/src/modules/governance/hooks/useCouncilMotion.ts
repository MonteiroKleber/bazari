/**
 * Hook to interact with Council motions (voting, closing)
 */

import { useState } from 'react';
import { useApi, useWallet, useChainProps } from '@/modules/wallet';
import { PinService } from '@/modules/wallet/pin/PinService';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { api as apiClient } from '@/lib/api';

export interface UseCouncilMotionReturn {
  isVoting: boolean;
  isClosing: boolean;
  error: string | null;
  vote: (motionHash: string, motionIndex: number, approve: boolean) => Promise<boolean>;
  close: (motionHash: string, motionIndex: number) => Promise<boolean>;
}

export function useCouncilMotion(): UseCouncilMotionReturn {
  const { active: selectedAccount } = useWallet();
  const { api } = useApi();
  const { props: chainProps } = useChainProps();
  const [isVoting, setIsVoting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = async (
    motionHash: string,
    motionIndex: number,
    approve: boolean
  ): Promise<boolean> => {
    if (!api || !selectedAccount?.address) {
      setError('Wallet not connected');
      return false;
    }

    setIsVoting(true);
    setError(null);

    try {
      // Get PIN and decrypt mnemonic
      const account = await getActiveAccount();
      if (!account) throw new Error('Conta não encontrada');

      const pin = await PinService.getPin({
        title: 'Confirmar Voto',
        description: `Insira seu PIN para votar ${approve ? 'SIM' : 'NÃO'} na motion`,
        validate: async (p) => {
          try {
            await decryptMnemonic(
              account.cipher,
              account.iv,
              account.salt,
              p,
              account.iterations
            );
            return null;
          } catch {
            return 'PIN inválido';
          }
        },
      });

      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.iterations
      );

      await cryptoWaitReady();
      const ss58 = chainProps?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      // Sign transaction on-chain
      const voteTx = api.tx.council.vote(motionHash, motionIndex, approve);

      return new Promise((resolve, reject) => {
        voteTx
          .signAndSend(pair, ({ status, events, dispatchError }) => {
            if (status.isInBlock) {
              console.log(`[useCouncilMotion] Vote in block: ${status.asInBlock.toHex()}`);
            }

            if (status.isFinalized) {
              if (dispatchError) {
                let errorMsg = 'Vote transaction failed';
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
                setError(errorMsg);
                reject(new Error(errorMsg));
              } else {
                // Get block number and tx hash
                const txHash = status.asFinalized.toHex();
                api.rpc.chain.getBlock(status.asFinalized).then(async (block) => {
                  const blockNumber = block.block.header.number.toNumber();

                  // Register vote in backend
                  try {
                    await apiClient.post('/governance/council/votes', {
                      motionHash,
                      motionIndex,
                      vote: approve,
                      txHash,
                      blockNumber,
                    });
                  } catch (err) {
                    console.error('[useCouncilMotion] Error registering vote:', err);
                  }

                  setIsVoting(false);
                  resolve(true);
                });
              }
            }
          })
          .catch((err) => {
            console.error('[useCouncilMotion] Vote error:', err);
            setError(err.message);
            setIsVoting(false);
            reject(err);
          });
      });
    } catch (err) {
      console.error('[useCouncilMotion] Vote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to vote');
      setIsVoting(false);
      return false;
    }
  };

  const close = async (motionHash: string, motionIndex: number): Promise<boolean> => {
    if (!api || !selectedAccount?.address) {
      setError('Wallet not connected');
      return false;
    }

    setIsClosing(true);
    setError(null);

    try {
      // Get PIN and decrypt mnemonic
      const account = await getActiveAccount();
      if (!account) throw new Error('Conta não encontrada');

      const pin = await PinService.getPin({
        title: 'Fechar Motion',
        description: 'Insira seu PIN para fechar a motion do Council',
        validate: async (p) => {
          try {
            await decryptMnemonic(
              account.cipher,
              account.iv,
              account.salt,
              p,
              account.iterations
            );
            return null;
          } catch {
            return 'PIN inválido';
          }
        },
      });

      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.iterations
      );

      await cryptoWaitReady();
      const ss58 = chainProps?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      // Get proposal details to calculate weight and length bounds
      const proposalOption = await api.query.council.proposalOf(motionHash);

      if (proposalOption.isNone) {
        throw new Error('Proposal not found');
      }

      const proposal = proposalOption.unwrap();
      const proposalLength = proposal.encodedLength;

      // Use a reasonable weight bound for treasury proposals
      // Treasury.spendLocal is a relatively simple call, doesn't need huge weight
      // Using 10% of max block weight should be more than enough
      const proposalWeight = api.createType('Weight', {
        refTime: api.consts.system.blockWeights.maxBlock.refTime.toBigInt() / 10n,
        proofSize: api.consts.system.blockWeights.maxBlock.proofSize.toBigInt() / 4n,
      });

      const closeTx = api.tx.council.close(motionHash, motionIndex, proposalWeight, proposalLength);

      return new Promise((resolve, reject) => {
        closeTx
          .signAndSend(pair, ({ status, dispatchError }) => {
            if (status.isInBlock) {
              console.log(`[useCouncilMotion] Close in block: ${status.asInBlock.toHex()}`);
            }

            if (status.isFinalized) {
              if (dispatchError) {
                let errorMsg = 'Close transaction failed';
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
                setError(errorMsg);
                reject(new Error(errorMsg));
              } else {
                setIsClosing(false);
                resolve(true);
              }
            }
          })
          .catch((err) => {
            console.error('[useCouncilMotion] Close error:', err);
            setError(err.message);
            setIsClosing(false);
            reject(err);
          });
      });
    } catch (err) {
      console.error('[useCouncilMotion] Close error:', err);
      setError(err instanceof Error ? err.message : 'Failed to close motion');
      setIsClosing(false);
      return false;
    }
  };

  return {
    isVoting,
    isClosing,
    error,
    vote,
    close,
  };
}
