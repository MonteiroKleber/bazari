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
import { Badge } from '@/components/ui/badge';
import {
  usePrepareCommitVote,
  generateVoteSalt,
  type VoteOption,
  type PreparedDisputeCall,
} from '@/hooks/blockchain/useDispute';
import { useAuth } from '@/modules/auth/context';
import { Lock, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CommitVoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeId: number;
}

export function CommitVoteModal({ open, onOpenChange, disputeId }: CommitVoteModalProps) {
  const { user } = useAuth();
  const [vote, setVote] = useState<VoteOption>('RefundBuyer');
  const [salt, setSalt] = useState(() => generateVoteSalt());
  const [saltCopied, setSaltCopied] = useState(false);
  const [saltConfirmed, setSaltConfirmed] = useState(false);
  const [step, setStep] = useState<'choose' | 'confirm' | 'signing'>('choose');
  const [txError, setTxError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const { prepareCommitVote, isLoading: isPreparing, error: prepareError } = usePrepareCommitVote();

  const handleCopySalt = async () => {
    try {
      await navigator.clipboard.writeText(salt);
      setSaltCopied(true);
      setTimeout(() => setSaltCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy salt:', err);
    }
  };

  const handleGenerateNewSalt = () => {
    setSalt(generateVoteSalt());
    setSaltCopied(false);
    setSaltConfirmed(false);
  };

  const handleProceedToConfirm = () => {
    if (!saltConfirmed) {
      toast.error('Por favor, confirme que copiou a senha antes de continuar.');
      return;
    }
    setStep('confirm');
  };

  const signAndSend = useCallback(async (prepared: PreparedDisputeCall): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
      // Dynamically import polkadot-js extension
      const { web3Enable, web3FromAddress } = await import('@polkadot/extension-dapp');
      const { ApiPromise, WsProvider } = await import('@polkadot/api');

      // Enable extension
      const extensions = await web3Enable('Bazari');
      if (extensions.length === 0) {
        throw new Error('Extensao polkadot-js nao encontrada. Por favor, instale-a.');
      }

      // Get injector for signer address
      const injector = await web3FromAddress(prepared.signerAddress);

      // Connect to blockchain
      const wsUrl = import.meta.env.VITE_CHAIN_WS_URL || 'ws://localhost:9944';
      const provider = new WsProvider(wsUrl);
      const api = await ApiPromise.create({ provider });

      // Create transaction from callHex
      const tx = api.tx(prepared.callHex);

      // Sign and send
      return new Promise((resolve, reject) => {
        tx.signAndSend(
          prepared.signerAddress,
          { signer: injector.signer },
          ({ status, events, dispatchError }) => {
            if (status.isInBlock || status.isFinalized) {
              // Check for dispatch error
              if (dispatchError) {
                let errorMessage = 'Transacao falhou';
                if (dispatchError.isModule) {
                  const decoded = api.registry.findMetaError(dispatchError.asModule);
                  errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                }
                resolve({ success: false, error: errorMessage });
              } else {
                const txHash = tx.hash.toHex();
                resolve({ success: true, txHash });
              }
            }
          }
        ).catch((err: Error) => {
          const message = err.message || 'Transacao falhou';
          resolve({ success: false, error: message });
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: message };
    }
  }, []);

  const handleSubmit = async () => {
    if (!user?.address) {
      toast.error('Conecte sua wallet primeiro');
      return;
    }

    setStep('signing');
    setIsSigning(true);
    setTxError(null);

    try {
      const prepared = await prepareCommitVote(disputeId, vote, salt);

      // Sign and send the transaction
      const result = await signAndSend(prepared);

      if (result.success) {
        toast.success('Voto enviado com sucesso!');
        onOpenChange(false);
        // Reset state
        setStep('choose');
        setSalt(generateVoteSalt());
        setSaltCopied(false);
        setSaltConfirmed(false);
      } else {
        setTxError(result.error || 'Transacao falhou');
        setStep('confirm');
      }
    } catch (err) {
      console.error('Failed to prepare commit:', err);
      setTxError(err instanceof Error ? err.message : 'Erro ao preparar transacao');
      setStep('confirm');
    } finally {
      setIsSigning(false);
    }
  };

  const handleClose = () => {
    if (step === 'signing') return; // Don't close during signing
    onOpenChange(false);
    setStep('choose');
    setTxError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Submeter Voto (Commit)
          </DialogTitle>
          <DialogDescription>
            {step === 'choose' && 'Escolha seu voto e guarde a senha para o reveal.'}
            {step === 'confirm' && 'Confirme seu voto antes de enviar.'}
            {step === 'signing' && 'Assinando transacao...'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-6 py-4">
            {/* Vote selection */}
            <div className="space-y-3">
              <Label>Seu Voto</Label>
              <RadioGroup
                value={vote}
                onValueChange={(v) => setVote(v as VoteOption)}
                className="gap-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="RefundBuyer" id="refund" />
                  <Label htmlFor="refund" className="flex-1 cursor-pointer">
                    <span className="font-medium">Reembolso ao Comprador</span>
                    <span className="block text-sm text-muted-foreground">
                      O comprador recebe o valor de volta
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="ReleaseSeller" id="release" />
                  <Label htmlFor="release" className="flex-1 cursor-pointer">
                    <span className="font-medium">Liberar para Vendedor</span>
                    <span className="block text-sm text-muted-foreground">
                      O vendedor recebe o pagamento
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Salt (password) */}
            <div className="space-y-3">
              <Label>Senha de Seguranca (Salt)</Label>
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <strong>IMPORTANTE:</strong> Guarde esta senha! Voce precisara dela
                  para revelar seu voto na proxima fase.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Input
                  value={salt}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySalt}
                >
                  {saltCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateNewSalt}
              >
                Gerar nova senha
              </Button>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="salt-confirmed"
                  checked={saltConfirmed}
                  onChange={(e) => setSaltConfirmed(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="salt-confirmed" className="text-sm">
                  Confirmo que copiei e guardei a senha
                </Label>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disputa:</span>
                <span className="font-mono">#{disputeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seu voto:</span>
                <Badge variant="secondary">
                  {vote === 'RefundBuyer' ? 'Reembolso' : 'Liberar'}
                </Badge>
              </div>
            </div>

            {(prepareError || txError) && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {prepareError?.message || txError}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Seu voto sera criptografado. Ninguem podera ver sua escolha ate a fase de reveal.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'signing' && (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
            <p>Aguarde a confirmacao na sua wallet...</p>
          </div>
        )}

        <DialogFooter>
          {step === 'choose' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleProceedToConfirm} disabled={!saltConfirmed}>
                Continuar
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('choose')}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={isPreparing || isSigning}>
                {(isPreparing || isSigning) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Confirmar Voto
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
