import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, Loader2, Send } from 'lucide-react';
import { useKeyring } from '@/modules/auth/useKeyring';
import { useVaultAccounts } from '@/modules/wallet/hooks/useVaultAccounts';
import { PinService } from '@/modules/wallet/pin/PinService';
import { decryptMnemonic } from '@/modules/auth/crypto.utils';
import { getAccessToken } from '@/modules/auth/session';
import type { ProposalType } from '../types';

type FormData = {
  type: ProposalType;
  title: string;
  description: string;
  beneficiary?: string;
  value?: string;
  preimageHash?: string;
};

export function CreateProposalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { active: account } = useVaultAccounts();
  const { signMessage } = useKeyring();

  const typeParam = searchParams.get('type')?.toUpperCase() as ProposalType | null;

  const [formData, setFormData] = useState<FormData>({
    type: typeParam || 'DEMOCRACY',
    title: '',
    description: '',
    beneficiary: '',
    value: '',
    preimageHash: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(async () => {
    if (!account) {
      setError('Você precisa estar conectado para criar uma proposta');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      setError('O título é obrigatório');
      return;
    }

    if (!formData.description.trim()) {
      setError('A descrição é obrigatória');
      return;
    }

    if (formData.type === 'TREASURY') {
      if (!formData.beneficiary) {
        setError('O beneficiário é obrigatório para propostas de tesouro');
        return;
      }
      if (!formData.value || parseFloat(formData.value) <= 0) {
        setError('O valor deve ser maior que zero');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get PIN with validation
      const pin = await PinService.getPin({
        title: 'Criar Proposta',
        description: `Criando proposta de ${formData.type}`,
        transaction: {
          type: 'governance_create_proposal',
          proposalType: formData.type,
          title: formData.title,
          value: formData.value || 'N/A',
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

      // Step 3: Prepare proposal data
      const proposalData = JSON.stringify({
        type: formData.type.toLowerCase(),
        title: formData.title,
        description: formData.description,
        beneficiary: formData.beneficiary,
        value: formData.value,
        preimageHash: formData.preimageHash,
        proposer: account.address,
        timestamp: new Date().toISOString(),
      });

      // Step 4: Sign proposal
      const signature = await signMessage(mnemonic, proposalData);

      // Step 5: Clean memory
      const mnemonicArray = new TextEncoder().encode(mnemonic);
      mnemonicArray.fill(0);

      // Step 6: Submit proposal
      const endpoint = {
        DEMOCRACY: '/api/governance/democracy/propose',
        TREASURY: '/api/governance/treasury/propose',
        COUNCIL: '/api/governance/council/propose',
        TECHNICAL: '/api/governance/tech-committee/propose',
      }[formData.type];

      // Get JWT token for authentication
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('Você precisa estar logado para criar propostas. Por favor, faça login novamente.');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          beneficiary: formData.beneficiary,
          value: formData.value,
          preimageHash: formData.preimageHash,
          signature,
          address: account.address,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create proposal');
      }

      // Success! Navigate to proposal detail
      navigate(`/app/governance/proposals/${formData.type.toLowerCase()}/${result.data.id}`);
    } catch (err: any) {
      console.error('Error creating proposal:', err);
      setError(err.message || 'Erro ao criar proposta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [account, formData, signMessage, navigate]);

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/governance/proposals')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Criar Nova Proposta</h1>
          <p className="text-muted-foreground">
            Preencha os campos abaixo para submeter uma nova proposta
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Proposal Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Proposta</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => updateField('type', value)}
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEMOCRACY">Democracia (Referendo)</SelectItem>
                  <SelectItem value="TREASURY">Tesouro (Financiamento)</SelectItem>
                  <SelectItem value="COUNCIL">Conselho</SelectItem>
                  <SelectItem value="TECHNICAL">Comitê Técnico</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.type === 'DEMOCRACY' && 'Proposta para votação pública da comunidade'}
                {formData.type === 'TREASURY' && 'Solicitação de fundos do tesouro da rede'}
                {formData.type === 'COUNCIL' && 'Proposta para votação do conselho'}
                {formData.type === 'TECHNICAL' && 'Proposta técnica para o comitê especializado'}
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Atualização do protocolo de rede"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                disabled={loading}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Um título claro e conciso para sua proposta
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva sua proposta em detalhes..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={loading}
                rows={6}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/2000 caracteres
              </p>
            </div>

            {/* Treasury-specific fields */}
            {formData.type === 'TREASURY' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="beneficiary">Beneficiário *</Label>
                  <Input
                    id="beneficiary"
                    placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                    value={formData.beneficiary}
                    onChange={(e) => updateField('beneficiary', e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Endereço que receberá os fundos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Valor (BZR) *</Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="0.00"
                    value={formData.value}
                    onChange={(e) => updateField('value', e.target.value)}
                    disabled={loading}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantidade de tokens solicitada
                  </p>
                </div>
              </>
            )}

            {/* Democracy-specific fields */}
            {formData.type === 'DEMOCRACY' && (
              <div className="space-y-2">
                <Label htmlFor="preimageHash">Preimage Hash (Opcional)</Label>
                <Input
                  id="preimageHash"
                  placeholder="0x..."
                  value={formData.preimageHash}
                  onChange={(e) => updateField('preimageHash', e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Hash da preimage se você já submeteu uma
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Deposit Info */}
            <Alert>
              <AlertDescription>
                <p className="text-sm font-medium mb-1">Depósito Necessário</p>
                <p className="text-xs text-muted-foreground">
                  Criar uma proposta requer um depósito que será devolvido se a proposta for aceita.
                  O valor do depósito varia de acordo com o tipo de proposta.
                </p>
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/app/governance/proposals')}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Criar Proposta
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
