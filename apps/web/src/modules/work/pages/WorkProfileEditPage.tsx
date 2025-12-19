// path: apps/web/src/modules/work/pages/WorkProfileEditPage.tsx
// Página de edição/criação do perfil profissional

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getWorkProfile,
  createWorkProfile,
  updateWorkProfile,
  deleteWorkProfile,
  type ProfessionalProfileInput,
  type WorkPreference,
  type ProfessionalStatus,
} from '../api';
import { SkillsInput } from '../components/SkillsInput';
import { WorkPreferenceSelector } from '../components/WorkPreferenceSelector';
import { AreaSelector } from '../components/AreaSelector';
import { ProfessionalStatusBadge } from '../components/ProfessionalStatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AppHeader } from '@/components/AppHeader';

export function WorkProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [professionalArea, setProfessionalArea] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hourlyRateCurrency, setHourlyRateCurrency] = useState('BRL');
  const [workPreference, setWorkPreference] = useState<WorkPreference>('REMOTE');
  const [status, setStatus] = useState<ProfessionalStatus>('AVAILABLE');
  const [showHourlyRate, setShowHourlyRate] = useState(false);

  // Carregar dados existentes
  const { data, isLoading } = useQuery({
    queryKey: ['work-profile'],
    queryFn: getWorkProfile,
  });

  const isEditing = !!data?.profile && data.isActivated;

  // Preencher formulário com dados existentes
  useEffect(() => {
    if (data?.profile) {
      setProfessionalArea(data.profile.professionalArea || '');
      setSkills(data.profile.skills || []);
      setExperience(data.profile.experience || '');
      setHourlyRate(data.profile.hourlyRate || '');
      setHourlyRateCurrency(data.profile.hourlyRateCurrency || 'BRL');
      setWorkPreference(data.profile.workPreference || 'REMOTE');
      setStatus(data.profile.status || 'AVAILABLE');
      setShowHourlyRate(data.profile.showHourlyRate || false);
    }
  }, [data]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createWorkProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-profile'] });
      toast.success('Perfil profissional ativado!');
      navigate('/app/work/profile');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao criar perfil');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateWorkProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-profile'] });
      toast.success('Perfil atualizado!');
      navigate('/app/work/profile');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao atualizar perfil');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-profile'] });
      toast.success('Perfil desativado');
      navigate('/app/work/profile');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao desativar perfil');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ProfessionalProfileInput = {
      professionalArea: professionalArea || undefined,
      skills,
      experience: experience || undefined,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      hourlyRateCurrency,
      workPreference,
      status,
      showHourlyRate,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-start gap-3 sm:gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold">
                {isEditing ? 'Editar Perfil Profissional' : 'Ativar Perfil Profissional'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isEditing
                  ? 'Atualize suas informações profissionais'
                  : 'Configure seu perfil para aparecer no marketplace de talentos'}
              </p>
            </div>
          </div>

          {/* Área Profissional */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Área de Atuação</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Selecione sua principal área de atuação profissional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AreaSelector
                value={professionalArea}
                onChange={setProfessionalArea}
                areas={data?.areas || []}
              />
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Habilidades</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Adicione suas habilidades técnicas e soft skills (máximo 20)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SkillsInput
                value={skills}
                onChange={setSkills}
                max={20}
                area={professionalArea}
              />
            </CardContent>
          </Card>

          {/* Experiência */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Experiência</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Descreva sua experiência profissional relevante
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Descreva sua experiência, projetos relevantes, conquistas..."
                rows={6}
                maxLength={5000}
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {experience.length}/5000 caracteres
              </p>
            </CardContent>
          </Card>

          {/* Preferência de Trabalho */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Preferência de Trabalho</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Como você prefere trabalhar?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkPreferenceSelector
                value={workPreference}
                onChange={setWorkPreference}
              />
            </CardContent>
          </Card>

          {/* Valor/Hora */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Valor por Hora</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Defina seu valor de referência para negociações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={hourlyRateCurrency} onValueChange={setHourlyRateCurrency}>
                  <SelectTrigger className="w-full sm:w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="BZR">BZR</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max="10000"
                  step="0.01"
                  className="flex-1"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label htmlFor="show-rate" className="text-sm">Mostrar valor publicamente</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Se desativado, apenas você verá o valor configurado
                  </p>
                </div>
                <Switch
                  id="show-rate"
                  checked={showHourlyRate}
                  onCheckedChange={setShowHourlyRate}
                  className="shrink-0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Status (apenas em edição) */}
          {isEditing && (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Status de Disponibilidade</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Controle sua visibilidade no marketplace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['AVAILABLE', 'NOT_AVAILABLE', 'INVISIBLE'] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={status === s ? 'default' : 'outline'}
                      onClick={() => setStatus(s)}
                      className="h-auto py-3 w-full"
                    >
                      <ProfessionalStatusBadge status={s} size="sm" />
                    </Button>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-3">
                  {status === 'AVAILABLE' && 'Você aparece nas buscas e pode receber propostas.'}
                  {status === 'NOT_AVAILABLE' && 'Você aparece nas buscas, mas está marcado como indisponível.'}
                  {status === 'INVISIBLE' && 'Você não aparece nas buscas e não pode receber propostas.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
            {isEditing ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Desativar Perfil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 sm:mx-0">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desativar Perfil Profissional?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Seu perfil ficará invisível e você não receberá mais propostas. Você poderá reativar a qualquer momento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Desativar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Salvar Alterações' : 'Ativar Perfil'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default WorkProfileEditPage;
