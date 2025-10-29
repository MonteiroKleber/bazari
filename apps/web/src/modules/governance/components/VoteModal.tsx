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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConvictionSelector } from './ConvictionSelector';
import type { GovernanceProposal, Conviction } from '../types';
import { Vote, ThumbsUp, ThumbsDown, AlertCircle, Loader2 } from 'lucide-react';
import { useKeyring } from '@/modules/auth/useKeyring';
import { useVaultAccounts } from '@/modules/wallet/hooks/useVaultAccounts';
import { PinService } from '@/modules/wallet/pin/PinService';
import { decryptMnemonic } from '@/modules/auth/crypto.utils';
import { formatBalance } from '@/modules/wallet/utils/format';

interface VoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: GovernanceProposal;
  onSuccess: () => void;
}

type VoteDirection = 'AYE' | 'NAY';

export function VoteModal({ open, onOpenChange, proposal, onSuccess }: VoteModalProps) {
  const { active: account } = useVaultAccounts();
  const { signMessage } = useKeyring();

  const [voteDirection, setVoteDirection] = useState<VoteDirection>('AYE');
  const [amount, setAmount] = useState('');
  const [conviction, setConviction] = useState<Conviction>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!account) {
      setError('Você precisa estar conectado para votar');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Digite um valor válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get PIN with validation
      const pin = await PinService.getPin({
        title: 'Confirmar Voto',
        description: `Votando ${voteDirection === 'AYE' ? 'SIM' : 'NÃO'} na proposta #${proposal.id}`,
        transaction: {
          type: 'governance_vote',
          proposal: `${proposal.type} #${proposal.id}`,
          direction: voteDirection,
          amount: `${amount} BZR`,
          conviction: conviction.toString(),
        },
        validate: async (candidatePin: string) => {
          try {
            // Validate PIN by attempting decryption
            await decryptMnemonic(
              account.cipher,
              account.iv,
              account.salt,
              candidatePin,
              account.iterations
            );
            return null; // ✅ PIN válido
          } catch {
            return 'PIN inválido'; // ❌ Tenta novamente
          }
        },
      });

      // Step 2: Decrypt mnemonic with validated PIN
      const mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.iterations
      );

      // Step 3: Prepare transaction data
      const txData = JSON.stringify({
        type: 'democracy.vote',
        referendumId: proposal.id,
        vote: {
          Standard: {
            vote: {
              aye: voteDirection === 'AYE',
              conviction,
            },
            balance: amount,
          },
        },
        timestamp: new Date().toISOString(),
      });

      // Step 4: Sign transaction with mnemonic
      const signature = await signMessage(mnemonic, txData);

      // Step 5: Clean mnemonic from memory (security)
      const mnemonicArray = new TextEncoder().encode(mnemonic);
      mnemonicArray.fill(0);

      // Step 6: Submit vote to backend
      const response = await fetch('/api/governance/democracy/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referendumId: proposal.id,
          vote: {
            aye: voteDirection === 'AYE',
            conviction,
          },
          balance: amount,
          signature,
          address: account.address,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit vote');
      }

      // Success!
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error submitting vote:', err);
      setError(err.message || 'Erro ao enviar voto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [
    account,
    amount,
    conviction,
    voteDirection,
    proposal.id,
    proposal.type,
    signMessage,
    onSuccess,
    onOpenChange,
  ]);

  const handleClose = () => {
    if (!loading) {
      setVoteDirection('AYE');
      setAmount('');
      setConviction(1);
      setError(null);
      onOpenChange(false);
    }
  };

  // Calculate effective voting power
  const effectiveVote =
    amount && parseFloat(amount) > 0
      ? (parseFloat(amount) * (conviction === 0 ? 0.1 : conviction)).toFixed(2)
      : '0';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Votar na Proposta #{proposal.id}
          </DialogTitle>
          <DialogDescription>
            {proposal.type === 'DEMOCRACY' ? 'Referendo de Democracia' : proposal.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vote Direction */}
          <div className="space-y-2">
            <Label>Direção do Voto</Label>
            <RadioGroup
              value={voteDirection}
              onValueChange={(value) => setVoteDirection(value as VoteDirection)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="AYE" id="aye" className="peer sr-only" />
                <Label
                  htmlFor="aye"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-500/10 cursor-pointer transition-all"
                >
                  <ThumbsUp className="mb-2 h-6 w-6 text-green-600" />
                  <span className="font-semibold">Aye (Sim)</span>
                  <span className="text-xs text-muted-foreground">Votar a favor</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="NAY" id="nay" className="peer sr-only" />
                <Label
                  htmlFor="nay"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-500/10 cursor-pointer transition-all"
                >
                  <ThumbsDown className="mb-2 h-6 w-6 text-red-600" />
                  <span className="font-semibold">Nay (Não)</span>
                  <span className="text-xs text-muted-foreground">Votar contra</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (BZR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Quantidade de tokens que você deseja usar para votar
            </p>
          </div>

          {/* Conviction Selector */}
          <ConvictionSelector
            value={conviction}
            onChange={setConviction}
            disabled={loading}
          />

          {/* Effective Vote Display */}
          {amount && parseFloat(amount) > 0 && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Poder de voto efetivo:</span>
                  <span className="text-sm font-bold text-primary">
                    {effectiveVote} BZR
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {amount} BZR × {conviction === 0 ? '0.1' : conviction}x = {effectiveVote} BZR
                </p>
              </AlertDescription>
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
                Processando...
              </>
            ) : (
              <>
                <Vote className="mr-2 h-4 w-4" />
                Confirmar Voto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
