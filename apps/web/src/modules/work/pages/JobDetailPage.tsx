// path: apps/web/src/modules/work/pages/JobDetailPage.tsx
// Página de detalhes da vaga (público)

import { useState } from 'react';
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
  Users,
  Briefcase,
  Building2,
  RefreshCw,
  Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppHeader } from '@/components/AppHeader';
import { SkillTagList } from '../components/SkillTagList';
import { ApplicationModal } from '../components/ApplicationModal';
import { getJobPublic, type WorkPreference, type PaymentPeriod } from '../api';

const workPreferenceLabels: Record<WorkPreference, { label: string; icon: string }> = {
  REMOTE: { label: 'Remoto', icon: '🏠' },
  ON_SITE: { label: 'Presencial', icon: '🏢' },
  HYBRID: { label: 'Híbrido', icon: '🔄' },
};

const paymentPeriodLabels: Record<PaymentPeriod, string> = {
  HOURLY: '/hora',
  DAILY: '/dia',
  WEEKLY: '/semana',
  MONTHLY: '/mês',
  PROJECT: '/projeto',
};

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['job-public', id],
    queryFn: () => getJobPublic(id!),
    enabled: !!id,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-6 max-w-3xl mx-auto">
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
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
          <Card className="max-w-3xl mx-auto">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Vaga não encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Esta vaga não existe ou não está mais disponível.
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

  const { job } = data;
  const workPref = workPreferenceLabels[job.workType];
  const companyInitials = job.company?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const publishedAgo = job.publishedAt
    ? formatDistanceToNow(new Date(job.publishedAt), { addSuffix: true, locale: ptBR })
    : null;

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

        {/* Job Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Title + Company */}
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shrink-0">
                  <AvatarImage src={job.company?.logoUrl || undefined} />
                  <AvatarFallback>{companyInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold">
                    {job.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {job.company?.name}
                  </p>
                </div>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <span>{workPref.icon}</span>
                  {workPref.label}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {job.location}
                  </span>
                )}
                {job.paymentValue && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {job.paymentCurrency} {parseFloat(job.paymentValue).toLocaleString('pt-BR')}
                    {job.paymentPeriod && paymentPeriodLabels[job.paymentPeriod]}
                  </span>
                )}
                {publishedAgo && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {publishedAgo}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {job.applicationsCount} {job.applicationsCount === 1 ? 'candidato' : 'candidatos'}
                </span>
              </div>

              {/* Skills */}
              {job.skills.length > 0 && (
                <div className="pt-2">
                  <SkillTagList skills={job.skills} size="md" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Descrição da Vaga</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{job.description}</p>
          </CardContent>
        </Card>

        {/* Company Info */}
        {job.company && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Sobre a Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={job.company.logoUrl || undefined} />
                  <AvatarFallback>{companyInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{job.company.name}</h3>
                  {job.company.about && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                      {job.company.about}
                    </p>
                  )}
                  <Button variant="link" asChild className="px-0 h-auto mt-2">
                    <Link to={`/seller/${job.company.slug}`}>
                      Ver perfil da empresa
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="sticky bottom-4 pt-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => setApplyModalOpen(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Candidatar-se
          </Button>
        </div>

        {/* Application Modal */}
        <ApplicationModal
          open={applyModalOpen}
          onOpenChange={setApplyModalOpen}
          jobId={id!}
          jobTitle={job.title}
        />
      </main>
    </div>
  );
}

export default JobDetailPage;
