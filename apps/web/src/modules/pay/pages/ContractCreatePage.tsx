// path: apps/web/src/modules/pay/pages/ContractCreatePage.tsx
// Página de criação de contrato com wizard (PROMPT-01)

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Calendar,
  Banknote,
  User,
} from 'lucide-react';
import { ReceiverSearch } from '../components';
import { createContract } from '../api';
import type { PayPeriod, UserSearchResult, CreateContractInput } from '../api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Recebedor', icon: User },
  { id: 2, title: 'Valores', icon: Banknote },
  { id: 3, title: 'Confirmar', icon: Check },
];

const periodLabels: Record<PayPeriod, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
};

function formatCurrency(value: string, currency: string): string {
  const numValue = parseFloat(value) || 0;
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  }
  return `${numValue.toLocaleString('pt-BR')} ${currency}`;
}

export function ContractCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Form state
  const [receiver, setReceiver] = useState<UserSearchResult | null>(null);
  const [baseValue, setBaseValue] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [period, setPeriod] = useState<PayPeriod>('MONTHLY');
  const [paymentDay, setPaymentDay] = useState('5');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateContractInput) => createContract(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pay-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['pay-dashboard'] });
      toast.success('Contrato criado com sucesso!');
      navigate(`/app/pay/contracts/${data.contract.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar contrato');
    },
  });

  const canProceedStep1 = receiver !== null;
  const canProceedStep2 =
    baseValue &&
    parseFloat(baseValue) > 0 &&
    paymentDay &&
    parseInt(paymentDay) >= 1 &&
    parseInt(paymentDay) <= 28;

  const handleSubmit = () => {
    if (!receiver?.handle) return;

    createMutation.mutate({
      receiverHandle: receiver.handle,
      receiverWallet: receiver.walletAddress || undefined,
      baseValue,
      currency,
      period,
      paymentDay: parseInt(paymentDay),
      startDate,
      endDate: endDate || undefined,
      description: description || undefined,
    });
  };

  // Calcular próximo pagamento (estimativa)
  const calculateNextPayment = (): string => {
    const start = new Date(startDate);
    const day = parseInt(paymentDay) || 1;
    let next = new Date(start);
    next.setDate(day);

    if (next <= start) {
      if (period === 'WEEKLY') {
        next.setDate(next.getDate() + 7);
      } else if (period === 'BIWEEKLY') {
        next.setDate(next.getDate() + 14);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next.toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/app/pay/contracts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Novo Contrato de Pagamento</h1>
            <p className="text-sm text-muted-foreground">
              Configure um pagamento recorrente automático
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  step === s.id
                    ? 'bg-primary text-primary-foreground'
                    : step > s.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">
                  {s.title}
                </span>
                <span className="text-sm font-medium sm:hidden">{s.id}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 sm:w-16 h-0.5 mx-2',
                    step > s.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Recebedor */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Passo 1 de 3: Quem vai receber?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Buscar Recebedor</Label>
                <ReceiverSearch
                  onSelect={setReceiver}
                  selected={receiver}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Valores */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Passo 2 de 3: Valores e Periodicidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Valor */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="baseValue">Valor do Pagamento</Label>
                  <Input
                    id="baseValue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={baseValue}
                    onChange={(e) => setBaseValue(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Moeda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="BZR">BZR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Periodicidade */}
              <div>
                <Label className="mb-3 block">Periodicidade</Label>
                <RadioGroup
                  value={period}
                  onValueChange={(v) => setPeriod(v as PayPeriod)}
                  className="grid grid-cols-3 gap-4"
                >
                  {(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as PayPeriod[]).map(
                    (p) => (
                      <div key={p}>
                        <RadioGroupItem
                          value={p}
                          id={p}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={p}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4',
                            'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                            'peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary'
                          )}
                        >
                          {periodLabels[p]}
                        </Label>
                      </div>
                    )
                  )}
                </RadioGroup>
              </div>

              {/* Dia do Pagamento */}
              <div>
                <Label htmlFor="paymentDay">Dia do Pagamento (1-28)</Label>
                <Select value={paymentDay} onValueChange={setPaymentDay}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Término (opcional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmação */}
        {step === 3 && receiver && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Passo 3 de 3: Confirmar Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={receiver.avatarUrl || undefined} />
                    <AvatarFallback>
                      {receiver.displayName?.charAt(0) ||
                        receiver.handle?.charAt(0) ||
                        '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {receiver.displayName || 'Usuário'}
                    </div>
                    {receiver.handle && (
                      <div className="text-sm text-muted-foreground">
                        @{receiver.handle}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Valor</div>
                    <div className="font-semibold text-lg">
                      {formatCurrency(baseValue, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Periodicidade</div>
                    <div className="font-medium">{periodLabels[period]}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Dia do Pagamento</div>
                    <div className="font-medium">Dia {paymentDay}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Primeiro Pagamento</div>
                    <div className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {calculateNextPayment()}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-sm">
                  <div className="text-muted-foreground">Período</div>
                  <div>
                    {new Date(startDate).toLocaleDateString('pt-BR')}
                    {' → '}
                    {endDate
                      ? new Date(endDate).toLocaleDateString('pt-BR')
                      : 'Indefinido'}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Salário mensal, Pagamento de serviços..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Criar Contrato
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default ContractCreatePage;
