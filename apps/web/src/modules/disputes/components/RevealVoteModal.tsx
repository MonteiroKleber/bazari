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
  usePrepareRevealVote,
  type VoteOption,
  type PreparedDisputeCall,
} from '@/hooks/blockchain/useDispute';
import { useAuth } from '@/modules/auth/context';
import { Eye, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RevealVoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeId: number;
}

export function RevealVoteModal({ open, onOpenChange, disputeId }: RevealVoteModalProps) {
  const { user } = useAuth();
  const [vote, setVote] = useState<VoteOption>('RefundBuyer');
  const [salt, setSalt] = useState('');
  const [step, setStep] = useState<'input' | 'confirm' | 'signing'>('input');
  const [txError, setTxError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const { prepareRevealVote, isLoading: isPreparing, error: prepareError } = usePrepareRevealVote();

  const handleProceedToConfirm = () => {
    if (!salt.trim()) {
      toast.error('Por favor, insira a senha (salt) que voce usou no commit.');
      return;
    }
    if (salt.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.');
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
      const prepared = await prepareRevealVote(disputeId, vote, salt);

      // Sign and send the transaction
      const result = await signAndSend(prepared);

      if (result.success) {
        toast.success('Voto revelado com sucesso!');
        onOpenChange(false);
        // Reset state
        setStep('input');
        setSalt('');
      } else {
        setTxError(result.error || 'Transacao falhou');
        setStep('confirm');
      }
    } catch (err) {
      console.error('Failed to prepare reveal:', err);
      setTxError(err instanceof Error ? err.message : 'Erro ao preparar transacao');
      setStep('confirm');
    } finally {
      setIsSigning(false);
    }
  };

  const handleClose = () => {
    if (step === 'signing') return; // Don't close during signing
    onOpenChange(false);
    setStep('input');
    setSalt('');
    setTxError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Revelar Voto
          </DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Insira o voto e a senha que voce usou no commit.'}
            {step === 'confirm' && 'Confirme os dados antes de revelar.'}
            {step === 'signing' && 'Assinando transacao...'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-6 py-4">
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                <strong>ATENCAO:</strong> Voce deve usar exatamente o mesmo voto e senha
                que usou na fase de commit. Se os dados nao coincidirem, a transacao falhara.
              </AlertDescription>
            </Alert>

            {/* Vote selection */}
            <div className="space-y-3">
              <Label>Voto que voce fez no Commit</Label>
              <RadioGroup
                value={vote}
                onValueChange={(v) => setVote(v as VoteOption)}
                className="gap-3"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="RefundBuyer" id="refund-reveal" />
                  <Label htmlFor="refund-reveal" className="flex-1 cursor-pointer">
                    <span className="font-medium">Reembolso ao Comprador</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="ReleaseSeller" id="release-reveal" />
                  <Label htmlFor="release-reveal" className="flex-1 cursor-pointer">
                    <span className="font-medium">Liberar para Vendedor</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Salt input */}
            <div className="space-y-3">
              <Label htmlFor="salt-input">Senha de Seguranca (Salt)</Label>
              <Input
                id="salt-input"
                type="text"
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                placeholder="Cole a senha que voce guardou"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Esta e a senha que voce copiou durante a fase de commit.
              </p>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Senha:</span>
                <span className="font-mono text-sm">
                  {salt.slice(0, 8)}...
                </span>
              </div>
            </div>

            {(prepareError || txError) && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {prepareError?.message || txError}
                  {(prepareError?.message || txError || '').includes('hash') && (
                    <span className="block mt-1">
                      Verifique se o voto e a senha estao corretos.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Eye className="w-4 h-4" />
              <AlertDescription>
                Ao revelar, seu voto sera publicado no blockchain e contabilizado
                para a decisao final.
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
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleProceedToConfirm} disabled={!salt.trim()}>
                Continuar
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={isPreparing || isSigning}>
                {(isPreparing || isSigning) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Revelar Voto
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
