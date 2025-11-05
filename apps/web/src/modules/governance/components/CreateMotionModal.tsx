import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useApi, useWallet, useChainProps } from '@/modules/wallet';
import { toast } from 'sonner';
import { PinService } from '@/modules/wallet/pin/PinService';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import type { TreasuryRequest } from '../hooks';
import { api as apiClient } from '@/lib/api';

interface CreateMotionModalProps {
  request: TreasuryRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateMotionModal({
  request,
  open,
  onOpenChange,
  onSuccess,
}: CreateMotionModalProps) {
  const { api } = useApi();
  const { active: selectedAccount } = useWallet();
  const { props: chainProps } = useChainProps();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [threshold, setThreshold] = useState<number>(1);
  const [requiredThreshold, setRequiredThreshold] = useState<number>(1);
  const [councilSize, setCouncilSize] = useState<number>(1);

  // Calculate required threshold based on council size
  useEffect(() => {
    if (!api || !open) return;

    let mounted = true;

    api.query.council
      .members()
      .then((members) => {
        if (!mounted) return;
        const size = members.length;
        const needed = Math.max(1, Math.ceil(size / 2));
        console.log('[CreateMotionModal] Council size:', size, 'Required threshold:', needed);
        setCouncilSize(size);
        setRequiredThreshold(needed);
        setThreshold(needed);
      })
      .catch((err) => {
        console.error('[CreateMotionModal] Error fetching council members:', err);
        // Fallback to minimum
        setRequiredThreshold(1);
        setThreshold(1);
      });

    return () => {
      mounted = false;
    };
  }, [api, open]);

  const handleSubmit = async () => {
    if (!api || !selectedAccount?.address) {
      toast.error('Wallet não conectada');
      return;
    }

    const majority = Math.max(1, requiredThreshold);
    if (threshold < majority) {
      toast.error(`Threshold mínimo é ${majority} votos (maioria simples do Council)`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Get account first
      const account = await getActiveAccount();
      if (!account) throw new Error('Conta não encontrada');

      // Get PIN and decrypt mnemonic
      const pin = await PinService.getPin({
        title: 'Confirmar Motion',
        description: 'Insira seu PIN para criar a motion do Council',
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

      // Show loading toast after PIN is confirmed
      toast.loading('Criando motion no Council...', { id: 'create-motion' });

      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.iterations
      );

      // Create keypair for on-chain transaction
      await cryptoWaitReady();
      const ss58 = chainProps?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      // Create the spendLocal call wrapped in sudo
      // NOTE: Since utility pallet is not available in the runtime,
      // we add a small increment to the value to make each proposal unique
      // This prevents council.DuplicateProposal errors when creating motions
      // for different treasury requests with the same value/beneficiary
      const baseValue = BigInt(request.value);

      // Add request ID as a tiny increment (in planck units)
      // This ensures uniqueness while keeping the intended value essentially the same
      // Example: if value is 1000000000000 and request.id is 7, final is 1000000000007
      const uniqueValue = baseValue + BigInt(request.id);

      const value = api.createType('Balance', uniqueValue.toString());

      // Create treasury.spendLocal call directly
      // The runtime accepts Council origin (majority) for Treasury spends
      // When Council closes and approves this motion, it executes treasury.spendLocal with Council origin
      const proposal = api.tx.treasury.spendLocal(value, request.beneficiary);

      // Calculate lengthBound (encoded length + 4 bytes for storage overhead)
      const lengthBound = proposal.encodedLength + 4;

      console.log('[CreateMotionModal] Proposal encoded length:', proposal.encodedLength);
      console.log('[CreateMotionModal] Length bound:', lengthBound);
      console.log('[CreateMotionModal] Proposal hash:', proposal.method.hash.toHex());

      // Create council motion with lengthBound
      const motionTx = api.tx.council.propose(
        threshold,
        proposal,
        lengthBound
      );

      // Sign and send transaction (on-chain)
      console.log('[CreateMotionModal] Sending motion transaction...');

      await new Promise((resolve, reject) => {
        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Transaction timeout - levou mais de 60 segundos'));
        }, 60000);

        motionTx
          .signAndSend(pair, async ({ status, events, dispatchError }) => {
            console.log('[CreateMotionModal] Transaction status:', status.type);

            if (status.isInBlock) {
              console.log(`[CreateMotionModal] Motion in block: ${status.asInBlock.toHex()}`);
            }

            if (status.isFinalized) {
              console.log('[CreateMotionModal] Transaction finalized');
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
                // Extract motion hash and index from events
                let motionHash: string | null = null;
                let motionIndex: number | null = null;

                events.forEach(({ event }) => {
                  if (event.section === 'council' && event.method === 'Proposed') {
                    motionHash = (event.data[2] as any).toHex();
                    motionIndex = (event.data[1] as any).toNumber();
                  }
                });

                if (motionHash && motionIndex !== null) {
                  // Link motion to treasury request
                  const txHash = status.asFinalized.toHex();
                  const block = await api.rpc.chain.getBlock(status.asFinalized);
                  const blockNumber = block.block.header.number.toNumber();

                  try {
                    await apiClient.post(`/governance/treasury/requests/${request.id}/link-motion`, {
                      motionHash,
                      motionIndex,
                      txHash,
                      blockNumber,
                    });
                  } catch (err) {
                    console.error('[CreateMotionModal] Error linking motion:', err);
                  }
                }

                clearTimeout(timeout);
                resolve(true);
              }
            }
          })
          .catch((err) => {
            clearTimeout(timeout);
            reject(err);
          });
      });

      // Dismiss loading toast and show success
      toast.success('Motion criada! Agora o Council pode votar.', { id: 'create-motion' });

      // Close modal and refresh
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[CreateMotionModal] Error:', error);
      // Dismiss loading toast and show error
      toast.error(error instanceof Error ? error.message : 'Falha ao criar motion', {
        id: 'create-motion',
      });
      // Reopen modal on error so user can retry
      onOpenChange(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Council Motion</DialogTitle>
          <DialogDescription>
            Criar uma motion no Council para aprovar esta solicitação de tesouro.
            O Council votará se deve aprovar o gasto de fundos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Info */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Título:</span>
              <p className="font-medium">{request.title}</p>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Valor:</span>
              <p className="font-medium text-primary">
                {(parseFloat(request.value) / 1e12).toFixed(2)} BZR
              </p>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Beneficiário:</span>
              <p className="font-mono text-xs break-all">{request.beneficiary}</p>
            </div>
          </div>

          {/* Threshold Input */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Threshold (votos necessários)</Label>
            <Input
              id="threshold"
              type="number"
              min={requiredThreshold}
              value={threshold}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10) || requiredThreshold;
                setThreshold(Math.max(requiredThreshold, next));
              }}
              placeholder={`≥ ${requiredThreshold}`}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Maioria simples do Council ({requiredThreshold} de {councilSize}) é exigida pelo runtime para gastos do Treasury.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              'Criar Motion'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
