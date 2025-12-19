// path: apps/web/src/modules/work/pages/WorkProfilePage.tsx
// Página de visualização do perfil profissional

import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Edit,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getWorkProfile,
  updateWorkStatus,
  type ProfessionalStatus,
} from '../api';
import { ProfessionalStatusBadge } from '../components/ProfessionalStatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppHeader } from '@/components/AppHeader';

const workPreferenceLabels: Record<string, string> = {
  REMOTE: 'Remoto',
  ON_SITE: 'Presencial',
  HYBRID: 'Híbrido',
};

export function WorkProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-profile'],
    queryFn: getWorkProfile,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: updateWorkStatus,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['work-profile'] });
      toast.success(result.message);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao atualizar status');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    const status = (error as any)?.response?.status;
    if (status === 401) {
      navigate('/auth', { replace: true });
      return null;
    }

    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-destructive">Erro ao carregar perfil profissional</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Se não tem perfil profissional ativado, mostrar CTA
  if (!data?.profile || !data.isActivated) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <Card className="border-dashed max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Ative seu Perfil Profissional</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm sm:text-base">
                Mostre suas habilidades, encontre oportunidades e conecte-se com empresas no marketplace de talentos da Bazari.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <Link to="/app/work/profile/edit">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Ativar Perfil Profissional
                  </Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div className="p-4 rounded-lg bg-muted/50">
                  <Eye className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-sm sm:text-base">Seja Encontrado</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Apareça nas buscas de empresas procurando talentos
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <Briefcase className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-sm sm:text-base">Receba Propostas</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Empresas podem enviar propostas diretamente para você
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-sm sm:text-base">Defina seu Valor</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Configure seu valor/hora e preferências de trabalho
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const profile = data.profile;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
              Perfil Profissional
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie seu perfil e disponibilidade no marketplace
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/app/work/profile/edit">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base">Status de Disponibilidade</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full sm:w-auto justify-between sm:justify-start">
                    <ProfessionalStatusBadge status={profile.status} />
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => statusMutation.mutate('AVAILABLE')}
                    disabled={profile.status === 'AVAILABLE'}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Disponível
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => statusMutation.mutate('NOT_AVAILABLE')}
                    disabled={profile.status === 'NOT_AVAILABLE'}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      Indisponível
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => statusMutation.mutate('INVISIBLE')}
                    disabled={profile.status === 'INVISIBLE'}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      Invisível
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {profile.status === 'AVAILABLE' && 'Você aparece nas buscas e pode receber propostas.'}
              {profile.status === 'NOT_AVAILABLE' && 'Você aparece nas buscas, mas está marcado como indisponível.'}
              {profile.status === 'INVISIBLE' && 'Você não aparece nas buscas e não pode receber propostas.'}
            </p>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Informações Profissionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Área */}
            {profile.professionalArea && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Área de Atuação
                </label>
                <p className="mt-1 font-medium">{profile.professionalArea}</p>
              </div>
            )}

            {/* Skills */}
            {profile.skills.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Habilidades
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs sm:text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Experiência */}
            {profile.experience && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Experiência
                </label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{profile.experience}</p>
              </div>
            )}

            {/* Work Preference & Hourly Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Preferência</p>
                  <p className="font-medium text-sm sm:text-base truncate">
                    {workPreferenceLabels[profile.workPreference]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Valor/Hora</p>
                  <p className="font-medium text-sm sm:text-base truncate">
                    {profile.hourlyRate && profile.showHourlyRate
                      ? `${profile.hourlyRateCurrency} ${parseFloat(profile.hourlyRate).toFixed(2)}`
                      : profile.hourlyRate
                      ? 'Privado'
                      : 'Não definido'}
                  </p>
                </div>
              </div>
            </div>

            {/* Activated At */}
            {profile.activatedAt && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground pt-4 border-t">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Perfil ativado em{' '}
                  {new Date(profile.activatedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default WorkProfilePage;
