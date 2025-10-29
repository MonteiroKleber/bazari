import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, User, AlertCircle, Loader2 } from 'lucide-react';
import { shortenAddress as formatAddress } from '@/modules/wallet/utils/format';
import { useKeyring } from '@/modules/auth/useKeyring';
import { useVaultAccounts } from '@/modules/wallet/hooks/useVaultAccounts';
import { PinService } from '@/modules/wallet/pin/PinService';
import { decryptMnemonic } from '@/modules/auth/crypto.utils';

interface MultisigApprovalFlowProps {
  multisigAddress: string;
  signatories: string[];
  threshold: number;
  approvals: string[];
  callData?: string;
  onApprove?: () => void;
}

export function MultisigApprovalFlow({
  multisigAddress,
  signatories,
  threshold,
  approvals,
  callData,
  onApprove,
}: MultisigApprovalFlowProps) {
  const { active: account } = useVaultAccounts();
  const { signMessage } = useKeyring();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvalProgress = (approvals.length / threshold) * 100;
  const canApprove = account && signatories.includes(account.address) && !approvals.includes(account.address);
  const isExecutable = approvals.length >= threshold;

  const handleApprove = async () => {
    if (!account || !canApprove) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get PIN with validation
      const pin = await PinService.getPin({
        title: 'Aprovar Multisig',
        description: `Aprovando transação multisig ${formatAddress(multisigAddress)}`,
        transaction: {
          type: 'multisig_approve',
          multisigAddress,
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

      // Step 2: Decrypt mnemonic
      const mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.iterations
      );

      // Step 3: Sign approval
      const approvalData = JSON.stringify({
        type: 'multisig.approve',
        multisigAddress,
        callData,
        timestamp: new Date().toISOString(),
      });

      const signature = await signMessage(mnemonic, approvalData);

      // Step 4: Clean memory
      const mnemonicArray = new TextEncoder().encode(mnemonic);
      mnemonicArray.fill(0);

      // Step 5: Submit approval
      const response = await fetch('/api/governance/multisig/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          multisigAddress,
          callData,
          signature,
          address: account.address,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit approval');
      }

      onApprove?.();
    } catch (err: any) {
      console.error('Error approving multisig:', err);
      setError(err.message || 'Erro ao aprovar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {approvals.length} de {threshold} aprovações
            </span>
            <span className="text-sm text-muted-foreground">{approvalProgress.toFixed(0)}%</span>
          </div>
          <Progress value={approvalProgress} className="h-2" />
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isExecutable ? (
            <Badge className="bg-green-500/10 text-green-700 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Executável
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-300">
              <Clock className="h-3 w-3 mr-1" />
              Aguardando Aprovações
            </Badge>
          )}
        </div>

        {/* Signatories List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Signatários</h4>
          <div className="space-y-2">
            {signatories.map((signatory) => {
              const hasApproved = approvals.includes(signatory);
              const isCurrentUser = account?.address === signatory;

              return (
                <div
                  key={signatory}
                  className={`flex items-center gap-3 p-3 rounded-md border ${
                    hasApproved ? 'bg-green-50/50 border-green-200' : 'bg-muted/50'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      hasApproved ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {hasApproved ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono truncate">{formatAddress(signatory)}</p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          Você
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hasApproved ? 'Aprovado' : 'Pendente'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Approve Button */}
        {canApprove && (
          <Button onClick={handleApprove} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprovar Transação
              </>
            )}
          </Button>
        )}

        {/* Execute Button */}
        {isExecutable && (
          <Alert>
            <AlertDescription>
              Esta transação atingiu o threshold e pode ser executada por qualquer signatário.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
