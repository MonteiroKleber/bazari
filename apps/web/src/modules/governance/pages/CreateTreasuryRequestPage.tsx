import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/modules/wallet';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Coins } from 'lucide-react';
import { PinService } from '@/modules/wallet/pin/PinService';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { useKeyring } from '@/modules/auth/useKeyring';
import { api } from '@/lib/api';

export function CreateTreasuryRequestPage() {
  const navigate = useNavigate();
  const { active: selectedAccount } = useWallet();
  const { signMessage } = useKeyring();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    beneficiary: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return 'Título é obrigatório';
    if (formData.title.length > 255) return 'Título muito longo (máximo 255 caracteres)';
    if (!formData.description.trim()) return 'Descrição é obrigatória';
    if (formData.description.length > 5000) return 'Descrição muito longa (máximo 5000 caracteres)';
    if (!formData.value || parseFloat(formData.value) <= 0) return 'Valor deve ser maior que zero';
    if (!formData.beneficiary.trim()) return 'Endereço do beneficiário é obrigatório';
    if (!/^5[A-Za-z0-9]{47}$/.test(formData.beneficiary)) return 'Endereço SS58 inválido';
    if (!selectedAccount?.address) return 'Wallet não conectada';

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert value to planck (smallest unit)
      let valueInPlanck = formData.value;
      if (formData.value.includes('.') || parseFloat(formData.value) < 1000000000000) {
        valueInPlanck = BigInt(Math.floor(parseFloat(formData.value) * 1e12)).toString();
      }

      // Create message to sign
      const messageData = JSON.stringify({
        type: 'treasury_request',
        title: formData.title,
        description: formData.description,
        value: valueInPlanck,
        beneficiary: formData.beneficiary,
        proposer: selectedAccount!.address,
      });

      // Get PIN and decrypt mnemonic
      const account = await getActiveAccount();
      if (!account) throw new Error('Conta não encontrada');

      const pin = await PinService.getPin({
        title: 'Confirmar Solicitação',
        description: 'Insira seu PIN para assinar a solicitação de tesouro',
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

      const mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.iterations
      );

      // Sign message using global keyring hook (off-chain signature)
      const signature = await signMessage(mnemonic, messageData);

      // Clean mnemonic from memory (security)
      const mnemonicArray = new TextEncoder().encode(mnemonic);
      mnemonicArray.fill(0);

      // Submit to backend
      const data = await api.post<{ success: boolean; data: any; error?: string }>(
        '/governance/treasury/requests',
        {
          title: formData.title,
          description: formData.description,
          value: valueInPlanck,
          beneficiary: formData.beneficiary,
          signature,
        }
      );

      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar solicitação');
      }

      toast.success('Solicitação criada! O Council irá revisá-la.');

      navigate('/app/governance/treasury/requests');
    } catch (error) {
      console.error('[CreateTreasuryRequestPage] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/governance/treasury/requests')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Solicitação de Tesouro</h1>
          <p className="text-muted-foreground">
            Solicite fundos do tesouro para um projeto ou iniciativa
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            <CardTitle>Detalhes da Solicitação</CardTitle>
          </div>
          <CardDescription>
            Preencha os dados abaixo. O Council irá revisar e criar uma motion para votação.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Desenvolvimento de funcionalidade X"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/255 caracteres
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva detalhadamente o propósito desta solicitação..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/5000 caracteres
            </p>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor (BZR) *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 1000.00"
              value={formData.value}
              onChange={(e) => handleInputChange('value', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Valor em BZR (será convertido para planck automaticamente)
            </p>
          </div>

          {/* Beneficiary */}
          <div className="space-y-2">
            <Label htmlFor="beneficiary">Endereço Beneficiário (SS58) *</Label>
            <Input
              id="beneficiary"
              placeholder="5..."
              value={formData.beneficiary}
              onChange={(e) => handleInputChange('beneficiary', e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Endereço que receberá os fundos (formato SS58)
            </p>
          </div>

          {/* Wallet Warning */}
          {!selectedAccount?.address && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Conecte sua wallet para criar uma solicitação
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/app/governance/treasury/requests')}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedAccount?.address}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Você envia uma solicitação de fundos (off-chain)</p>
          <p>2. Um membro do Council cria uma motion para aprovar sua solicitação</p>
          <p>3. O Council vota na motion (requer maioria)</p>
          <p>4. Se aprovada, o tesouro transfere os fundos automaticamente</p>
        </CardContent>
      </Card>
    </div>
  );
}
