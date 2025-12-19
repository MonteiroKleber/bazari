// path: apps/web/src/modules/work/pages/ProposalCreatePage.tsx
// Página de criação de proposta

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth/context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ProposalForm } from '../components/ProposalForm';
import { getTalentProfile, getJobPublic } from '../api';

export function ProposalCreatePage() {
  const { handle } = useParams<{ handle: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, sellerProfiles } = useAuth();

  const jobId = searchParams.get('job');

  // Get the active seller profile (company)
  const activeSeller = sellerProfiles?.[0]; // TODO: allow selection if multiple

  // Fetch talent info
  const {
    data: talentData,
    isLoading: talentLoading,
    isError: talentError,
    refetch: refetchTalent,
  } = useQuery({
    queryKey: ['talent-profile', handle],
    queryFn: () => getTalentProfile(handle!),
    enabled: !!handle,
    retry: false,
  });

  // Fetch job info if provided
  const {
    data: jobData,
    isLoading: jobLoading,
    isError: jobError,
  } = useQuery({
    queryKey: ['job-public', jobId],
    queryFn: () => getJobPublic(jobId!),
    enabled: !!jobId,
    retry: false,
  });

  const isLoading = talentLoading || (jobId && jobLoading);
  const hasError = talentError;

  // Check if user has a company profile
  if (!activeSeller) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Perfil de Empresa Necessário
              </h3>
              <p className="text-muted-foreground mb-4">
                Para enviar propostas, você precisa ter um perfil de empresa/vendedor.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={() => navigate('/app/seller/create')}>
                  Criar Perfil de Empresa
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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

  if (hasError || !talentData) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Profissional não encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar os dados do profissional.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button variant="outline" onClick={() => refetchTalent()}>
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

  const talent = talentData.talent;

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

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            Nova Proposta
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Envie uma proposta de trabalho para o profissional
          </p>
        </div>

        {/* Form */}
        <ProposalForm
          recipientId={talent.user.id}
          recipientType="talent"
          recipientName={talent.user.displayName || `@${talent.user.handle}`}
          recipientAvatarUrl={talent.user.avatarUrl}
          sellerProfileId={activeSeller.id}
          sellerProfileName={activeSeller.businessName || activeSeller.slug}
          jobPostingId={jobId || undefined}
          jobPostingTitle={jobData?.job?.title}
        />
      </main>
    </div>
  );
}

export default ProposalCreatePage;
