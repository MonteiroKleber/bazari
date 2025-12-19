// path: apps/web/src/modules/work/pages/TalentProfilePage.tsx
// Página de perfil público do talento

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Star,
  Briefcase,
  Send,
  RefreshCw,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ProfessionalStatusBadge } from '../components/ProfessionalStatusBadge';
import { SkillTagList } from '../components/SkillTagList';
import { EvaluationStats } from '../components/EvaluationStats';
import { getTalentProfile, getTalentStats, type WorkPreference } from '../api';

const workPreferenceLabels: Record<WorkPreference, { label: string; icon: string }> = {
  REMOTE: { label: 'Remoto', icon: '🏠' },
  ON_SITE: { label: 'Presencial', icon: '🏢' },
  HYBRID: { label: 'Híbrido', icon: '🔄' },
};

export function TalentProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['talent-profile', handle],
    queryFn: () => getTalentProfile(handle!),
    enabled: !!handle,
    retry: false,
  });

  // Buscar estatísticas de avaliação
  const { data: statsData } = useQuery({
    queryKey: ['talent-stats', handle],
    queryFn: () => getTalentStats(handle!),
    enabled: !!handle,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-40" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
            </div>
            <div className="h-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Perfil não encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Este perfil profissional não existe ou não está disponível.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { profile, canSendProposal } = data;
  const initials =
    profile.user.displayName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const workPref = workPreferenceLabels[profile.workPreference];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-3xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shrink-0">
                <AvatarImage src={profile.user.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">
                      {profile.user.displayName || `@${profile.user.handle}`}
                    </h1>
                    {profile.user.handle && (
                      <p className="text-muted-foreground">@{profile.user.handle}</p>
                    )}
                  </div>
                  <ProfessionalStatusBadge status={profile.status} />
                </div>

                {profile.professionalArea && (
                  <p className="text-base sm:text-lg font-medium text-primary">
                    {profile.professionalArea}
                  </p>
                )}

                {/* Skills */}
                {profile.skills.length > 0 && (
                  <SkillTagList skills={profile.skills} size="md" />
                )}

                {/* Rate & Preference */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
                  {profile.hourlyRate && profile.hourlyRateCurrency && (
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {profile.hourlyRateCurrency}{' '}
                      {parseFloat(profile.hourlyRate).toFixed(2)}/hora
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm">
                    <span>{workPref.icon}</span>
                    {workPref.label}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {profile.user.bio && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sobre</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{profile.user.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Experience */}
        {profile.experience && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Experiência</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{profile.experience}</p>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Stats - Detailed */}
        {statsData && <EvaluationStats stats={statsData} />}

        {/* Activation Date */}
        {profile.activatedAt && (
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              No marketplace desde{' '}
              {new Date(profile.activatedAt).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* CTA */}
        {canSendProposal && profile.status === 'AVAILABLE' && (
          <div className="sticky bottom-4 pt-4">
            <Button size="lg" className="w-full" disabled>
              <Send className="h-4 w-4 mr-2" />
              Enviar Proposta
              <Badge variant="secondary" className="ml-2 text-xs">
                Em breve
              </Badge>
            </Button>
          </div>
        )}

        {profile.status === 'NOT_AVAILABLE' && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
            <CardContent className="py-4 text-center">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Este profissional está marcado como <strong>indisponível</strong>{' '}
                no momento.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default TalentProfilePage;
