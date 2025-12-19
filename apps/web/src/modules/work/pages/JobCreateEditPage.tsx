// path: apps/web/src/modules/work/pages/JobCreateEditPage.tsx
// Página de criação/edição de vaga

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';
import { AreaSelector } from '../components/AreaSelector';
import { SkillsInput } from '../components/SkillsInput';
import { WorkPreferenceSelector } from '../components/WorkPreferenceSelector';
import {
  getJob,
  createJob,
  updateJob,
  publishJob,
  getWorkAreas,
  getSkillSuggestions,
  type JobPostingInput,
  type WorkPreference,
  type PaymentPeriod,
} from '../api';

// Busca seller profiles do usuário
async function getMySellerProfiles(): Promise<{ items: { id: string; shopName: string; avatarUrl: string | null }[] }> {
  const response = await fetch('/sellers/me/profiles', {
    credentials: 'include',
  });
  if (!response.ok) {
    // Fallback caso não tenha endpoint específico
    return { items: [] };
  }
  return response.json();
}

const paymentPeriodOptions: { value: PaymentPeriod; label: string }[] = [
  { value: 'HOURLY', label: 'Por hora' },
  { value: 'DAILY', label: 'Por dia' },
  { value: 'WEEKLY', label: 'Por semana' },
  { value: 'MONTHLY', label: 'Por mês' },
  { value: 'PROJECT', label: 'Por projeto' },
];

const currencyOptions = [
  { value: 'BRL', label: 'R$ (BRL)' },
  { value: 'USD', label: '$ (USD)' },
  { value: 'EUR', label: '€ (EUR)' },
  { value: 'BZR', label: 'BZR' },
];

export function JobCreateEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // Form state
  const [sellerProfileId, setSellerProfileId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [workType, setWorkType] = useState<WorkPreference>('REMOTE');
  const [location, setLocation] = useState('');
  const [hasPayment, setHasPayment] = useState(false);
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>('MONTHLY');
  const [paymentCurrency, setPaymentCurrency] = useState('BRL');

  // Fetch areas
  const { data: areasData } = useQuery({
    queryKey: ['work-areas'],
    queryFn: getWorkAreas,
  });

  // Fetch seller profiles
  const { data: sellersData } = useQuery({
    queryKey: ['my-seller-profiles'],
    queryFn: getMySellerProfiles,
  });

  // Fetch job if editing
  const { data: jobData, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (jobData?.job) {
      const job = jobData.job;
      setSellerProfileId(job.company?.id || '');
      setTitle(job.title);
      setDescription(job.description);
      setArea(job.area);
      setSkills(job.skills);
      setWorkType(job.workType);
      setLocation(job.location || '');
      if (job.paymentValue) {
        setHasPayment(true);
        setPaymentValue(job.paymentValue);
        setPaymentPeriod(job.paymentPeriod || 'MONTHLY');
        setPaymentCurrency(job.paymentCurrency);
      }
    }
  }, [jobData]);

  // Set default seller profile
  useEffect(() => {
    if (!sellerProfileId && sellersData?.items?.length) {
      setSellerProfileId(sellersData.items[0].id);
    }
  }, [sellersData, sellerProfileId]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Vaga criada com sucesso!');
      navigate(`/app/work/manage/jobs/${data.job.id}/edit`);
    },
    onError: (error: any) => {
      toast.error('Erro ao criar vaga', { description: error.message });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobPostingInput> }) => updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      toast.success('Vaga atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar vaga', { description: error.message });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: publishJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      toast.success('Vaga publicada com sucesso!');
      navigate('/app/work/manage/jobs');
    },
    onError: (error: any) => {
      toast.error('Erro ao publicar vaga', { description: error.message });
    },
  });

  const handleSubmit = (publish = false) => {
    if (!title.trim()) {
      toast.error('Título obrigatório');
      return;
    }
    if (!description.trim()) {
      toast.error('Descrição obrigatória');
      return;
    }
    if (!area) {
      toast.error('Área obrigatória');
      return;
    }
    if (!sellerProfileId) {
      toast.error('Selecione uma empresa');
      return;
    }

    const jobData: JobPostingInput = {
      sellerProfileId,
      title: title.trim(),
      description: description.trim(),
      area,
      skills,
      workType,
      location: location.trim() || null,
      paymentValue: hasPayment && paymentValue ? parseFloat(paymentValue) : null,
      paymentPeriod: hasPayment ? paymentPeriod : null,
      paymentCurrency,
    };

    if (isEditing) {
      const { sellerProfileId: _, ...updateData } = jobData;
      updateMutation.mutate({ id: id!, data: updateData }, {
        onSuccess: () => {
          if (publish) {
            publishMutation.mutate(id!);
          }
        },
      });
    } else {
      createMutation.mutate(jobData, {
        onSuccess: (data) => {
          if (publish) {
            publishMutation.mutate(data.job.id);
          }
        },
      });
    }
  };

  const areas = areasData?.areas || [];
  const sellerProfiles = sellersData?.items || [];
  const isLoading = createMutation.isPending || updateMutation.isPending || publishMutation.isPending;
  const canPublish = isEditing && jobData?.job?.status === 'DRAFT';

  if (isEditing && isLoadingJob) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
            <div className="h-10 bg-muted rounded w-48" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {isEditing ? 'Editar Vaga' : 'Nova Vaga'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing ? 'Atualize as informações da vaga' : 'Preencha os detalhes da vaga'}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Seller Profile (only on create) */}
            {!isEditing && sellerProfiles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="seller">Empresa *</Label>
                <Select value={sellerProfileId} onValueChange={setSellerProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellerProfiles.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.shopName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título da Vaga *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Desenvolvedor Full Stack"
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a vaga, responsabilidades, requisitos..."
                rows={6}
                maxLength={10000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/10000
              </p>
            </div>

            {/* Area */}
            <div className="space-y-2">
              <Label>Área *</Label>
              <AreaSelector
                value={area}
                onChange={setArea}
                areas={areas}
              />
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Habilidades Desejadas</Label>
              <SkillsInput
                value={skills}
                onChange={setSkills}
                getSuggestions={getSkillSuggestions}
                maxSkills={20}
              />
            </div>

            {/* Work Type */}
            <div className="space-y-2">
              <Label>Modalidade de Trabalho *</Label>
              <WorkPreferenceSelector
                value={workType}
                onChange={setWorkType}
              />
            </div>

            {/* Location */}
            {(workType === 'ON_SITE' || workType === 'HYBRID') && (
              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                  maxLength={200}
                />
              </div>
            )}

            {/* Payment */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Informar Remuneração</Label>
                  <p className="text-xs text-muted-foreground">
                    Valores são informativos e não geram vínculo
                  </p>
                </div>
                <Switch
                  checked={hasPayment}
                  onCheckedChange={setHasPayment}
                />
              </div>

              {hasPayment && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="paymentValue">Valor</Label>
                    <Input
                      id="paymentValue"
                      type="number"
                      value={paymentValue}
                      onChange={(e) => setPaymentValue(e.target.value)}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={paymentPeriod} onValueChange={(v) => setPaymentPeriod(v as PaymentPeriod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentPeriodOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select value={paymentCurrency} onValueChange={setPaymentCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Salvar Alterações' : 'Salvar Rascunho'}
          </Button>

          {(canPublish || !isEditing) && (
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Salvar e Publicar' : 'Criar e Publicar'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

export default JobCreateEditPage;
