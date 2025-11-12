import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GovernanceProposal } from '../types';
import { CheckCircle, AlertCircle, Loader2, Coins } from 'lucide-react';
import { useKeyring } from '@/modules/auth/useKeyring';
import { useVaultAccounts } from '@/modules/wallet/hooks/useVaultAccounts';
import { PinService } from '@/modules/wallet/pin/PinService';
import { decryptMnemonic } from '@/modules/auth/crypto.utils';
import { governanceApi } from '../api';
import { toast } from 'sonner';

interface EndorseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: GovernanceProposal;
  onSuccess: () => void;
}

const ENDORSEMENT_DEPOSIT = '100'; // 100 BZR

export function EndorseModal({ open, onOpenChange, proposal, onSuccess }: EndorseModalProps) {
  const { active: account } = useVaultAccounts();
  const { signMessage } = useKeyring();

  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!account) {
      setError('Você precisa estar conectado para endossar');
      return;
    }

    setLoading(true);
    setError(null);
    setProcessingStep(null);

    try {
      // Step 1: Get PIN with validation
      const pin = await PinService.getPin({
        title: 'Confirmar Endosso',
        description: `Endossando proposta #${proposal.id}`,
        transaction: {
          type: 'governance_endorse',
          description: `Endossar proposta ${proposal.type} #${proposal.id}`,
          deposit: `${ENDORSEMENT_DEPOSIT} BZR`,
          fee: '~0.001 BZR',
        },
        validate: async (candidatePin: string) => {
          try {
            await decryptMnemonic(
              account.cipher,
              account.iv,
              account.salt,
              candidatePin,
              account.iterations
            );
            return null;
          } catch {
            return 'PIN inválido';
          }
        },
      });

      // Step 2: Decrypt mnemonic with validated PIN
      setProcessingStep('Descriptografando credenciais...');
      const mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.iterations
      );

      // Step 3: Prepare transaction data
      setProcessingStep('Preparando transação...');
      const txData = JSON.stringify({
        action: 'second',
        proposalId: proposal.id,
        address: account.address,
      });

      // Step 4: Sign transaction with mnemonic
      setProcessingStep('Assinando transação...');
      const signature = await signMessage(mnemonic, txData);

      // Step 5: Submit endorsement to backend (with mnemonic for user account)
      setProcessingStep('Enviando endosso para a blockchain...');
      const result = await governanceApi.secondProposal(
        proposal.id,
        signature,
        account.address,
        mnemonic
      );

      // Step 6: Clean mnemonic from memory (security)
      const mnemonicArray = new TextEncoder().encode(mnemonic);
      mnemonicArray.fill(0);

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit endorsement');
      }

      // Success!
      toast.success('Endosso enviado com sucesso!', {
        description: `Proposta #${proposal.id} foi endossada. A transação foi incluída no bloco.`,
        duration: 5000,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      if (err.message === 'cancelled') {
        // User cancelled PIN dialog, just reset loading state
        setProcessingStep(null);
        return;
      }
      const errorMessage = err.message || 'Erro ao enviar endosso. Tente novamente.';
      setError(errorMessage);
      toast.error('Erro ao endossar proposta', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setProcessingStep(null);
    }
  }, [account, proposal.id, proposal.type, signMessage, onSuccess, onOpenChange]);

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Endossar Proposta #{proposal.id}
          </DialogTitle>
          <DialogDescription>
            {proposal.title || `${proposal.type} Proposal`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Information Card */}
          <Alert>
            <Coins className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Depósito necessário:</span>
                  <span className="text-sm font-bold text-primary">{ENDORSEMENT_DEPOSIT} BZR</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este valor será bloqueado até que a proposta vire referendo. Endossos aumentam a
                  prioridade da proposta.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Benefits */}
          <div className="bg-muted/50 rounded-md p-4 space-y-2">
            <h4 className="text-sm font-semibold">Por que endossar?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Propostas com mais endossos têm maior prioridade</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>A proposta mais endossada vira referendo a cada LaunchPeriod (2h)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Seu depósito é devolvido quando a proposta virar referendo</span>
              </li>
            </ul>
          </div>

          {/* Processing Step Display */}
          {processingStep && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{processingStep}</AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aguardando PIN...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Endosso
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
