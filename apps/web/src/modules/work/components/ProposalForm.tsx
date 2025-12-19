// path: apps/web/src/modules/work/components/ProposalForm.tsx
// Formulário de criação/edição de proposta

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Send,
  Building2,
  User,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createProposal,
  type CreateProposalInput,
  type PaymentPeriod,
  type PaymentType,
} from '../api';

const paymentPeriodOptions: { value: PaymentPeriod; label: string }[] = [
  { value: 'HOURLY', label: 'Por Hora' },
  { value: 'DAILY', label: 'Por Dia' },
  { value: 'WEEKLY', label: 'Por Semana' },
  { value: 'MONTHLY', label: 'Por Mês' },
  { value: 'PROJECT', label: 'Por Projeto' },
];

const paymentTypeOptions: { value: PaymentType; label: string; description: string }[] = [
  {
    value: 'BAZARI_PAY',
    label: 'Bazari Pay',
    description: 'Pagamento seguro via plataforma',
  },
  {
    value: 'EXTERNAL',
    label: 'Pagamento Externo',
    description: 'Pagamento fora da plataforma',
  },
  {
    value: 'UNDEFINED',
    label: 'A Definir',
    description: 'Definir durante a negociação',
  },
];

const currencyOptions = ['BRL', 'USD', 'EUR', 'BZR'];

export interface ProposalFormProps {
  // Recipient info (professional or company)
  recipientId: string;
  recipientType: 'talent' | 'company';
  recipientName: string;
  recipientAvatarUrl?: string | null;

  // Seller profile (company) to send from
  sellerProfileId: string;
  sellerProfileName: string;

  // Optional job posting context
  jobPostingId?: string;
  jobPostingTitle?: string;

  // Default values for editing
  defaultValues?: Partial<CreateProposalInput>;
}

export function ProposalForm({
  recipientId,
  recipientType,
  recipientName,
  recipientAvatarUrl,
  sellerProfileId,
  sellerProfileName,
  jobPostingId,
  jobPostingTitle,
  defaultValues,
}: ProposalFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CreateProposalInput>({
    sellerProfileId,
    receiverId: recipientId,
    jobPostingId,
    title: defaultValues?.title || '',
    description: defaultValues?.description || '',
    proposedValue: defaultValues?.proposedValue,
    valuePeriod: defaultValues?.valuePeriod || 'PROJECT',
    valueCurrency: defaultValues?.valueCurrency || 'BRL',
    startDate: defaultValues?.startDate,
    duration: defaultValues?.duration,
    paymentType: defaultValues?.paymentType || 'UNDEFINED',
  });

  // Format date for input type="date"
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setFormData({ ...formData, startDate: new Date(value).toISOString() });
    } else {
      setFormData({ ...formData, startDate: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Digite um título para a proposta');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Digite uma descrição da proposta');
      return;
    }

    setLoading(true);
    try {
      const result = await createProposal(formData);
      toast.success('Proposta enviada com sucesso!', {
        description: 'O profissional será notificado.',
      });
      navigate(`/app/work/proposals/${result.id}`);
    } catch (error) {
      toast.error('Erro ao enviar proposta', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Context Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* From */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>De</CardDescription>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {sellerProfileName}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* To */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Para</CardDescription>
            <CardTitle className="text-base flex items-center gap-2">
              {recipientType === 'company' ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {recipientName}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Job Context */}
      {jobPostingId && jobPostingTitle && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Relacionada à vaga
            </CardDescription>
            <CardTitle className="text-base">{jobPostingTitle}</CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Proposal Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Proposta</CardTitle>
          <CardDescription>
            Descreva o que você está propondo ao profissional
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título da Proposta *</Label>
            <Input
              id="title"
              placeholder="Ex: Desenvolvimento de aplicativo mobile"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva o escopo do trabalho, requisitos, entregáveis esperados..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="mt-1 min-h-[120px]"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamento</CardTitle>
          <CardDescription>
            Defina os termos financeiros da proposta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="currency">Moeda</Label>
              <Select
                value={formData.valueCurrency}
                onValueChange={(value) =>
                  setFormData({ ...formData, valueCurrency: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Valor Proposto</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.proposedValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    proposedValue: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="period">Período</Label>
              <Select
                value={formData.valuePeriod}
                onValueChange={(value: PaymentPeriod) =>
                  setFormData({ ...formData, valuePeriod: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentPeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <div className="grid gap-2 mt-2 sm:grid-cols-3">
              {paymentTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, paymentType: option.value })
                  }
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    formData.paymentType === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Prazo</CardTitle>
          <CardDescription>
            Defina quando o trabalho deve começar e quanto tempo deve durar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="duration">Duração Estimada</Label>
              <Input
                id="duration"
                placeholder="Ex: 3 meses, 2 semanas, 40 horas"
                value={formData.duration || ''}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value || undefined })
                }
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Enviar Proposta
        </Button>
      </div>
    </form>
  );
}

export default ProposalForm;
