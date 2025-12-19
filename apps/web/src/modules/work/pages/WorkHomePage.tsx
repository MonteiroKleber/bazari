// path: apps/web/src/modules/work/pages/WorkHomePage.tsx
// PROMPT-09: Home/Dashboard do Bazari Work

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  Briefcase,
  FileText,
  Star,
  Search,
  Users,
  MessageSquare,
  ArrowRight,
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ProfessionalStatusBadge } from '../components/ProfessionalStatusBadge';
import { ProposalStatusBadge } from '../components/ProposalStatusBadge';
import { AgreementStatusBadge } from '../components/AgreementStatusBadge';
import { getDashboard, type ProposalStatus, type AgreementStatus } from '../api';

export function WorkHomePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['work-dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
              ))}
            </div>
            <div className="h-48 bg-muted rounded-lg" />
            <div className="h-48 bg-muted rounded-lg" />
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
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Erro ao carregar dashboard
              </h3>
              <p className="text-muted-foreground mb-4">
                Tente novamente mais tarde.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { profile, stats, recentProposals, activeAgreements, recommendedJobs } = data;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-4xl">
        {/* Header / Profile Summary */}
        <Card>
          <CardContent className="pt-6">
            {profile.hasProfile ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h1 className="text-xl font-bold">Bazari Work</h1>
                    {profile.status && (
                      <ProfessionalStatusBadge status={profile.status} />
                    )}
                  </div>
                  {profile.professionalArea && (
                    <p className="text-muted-foreground mb-2">
                      {profile.professionalArea}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm">
                    {profile.averageRating !== null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {profile.averageRating.toFixed(1)} ({profile.totalEvaluations})
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {profile.agreementsCompleted} acordos
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/app/work/profile">Editar Perfil</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">
                  Ative seu perfil profissional
                </h2>
                <p className="text-muted-foreground mb-4">
                  Configure seu perfil para aparecer no marketplace e receber propostas.
                </p>
                <Button asChild>
                  <Link to="/app/work/profile/edit">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Perfil
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/app/work/proposals">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.pendingProposals}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Propostas
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/app/work/agreements">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.activeAgreements}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <FileText className="h-3 w-3" />
                  Acordos Ativos
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/app/work/agreements">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {stats.pendingEvaluations}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Star className="h-3 w-3" />
                  Avaliar
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/app/work/jobs">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.matchingJobs}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Vagas p/ Você
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Proposals */}
        {recentProposals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Propostas Recentes
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/app/work/proposals">
                    Ver todas
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentProposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  to={`/app/work/proposals/${proposal.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={proposal.otherParty.avatarUrl || undefined} />
                    <AvatarFallback>
                      {proposal.otherParty.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{proposal.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {proposal.otherParty.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <ProposalStatusBadge status={proposal.status as ProposalStatus} />
                    {proposal.proposedValue && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {proposal.valueCurrency} {parseFloat(proposal.proposedValue).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Active Agreements */}
        {activeAgreements.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Acordos Ativos
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/app/work/agreements">
                    Ver todos
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAgreements.map((agreement) => (
                <Link
                  key={agreement.id}
                  to={`/app/work/agreements/${agreement.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={agreement.otherParty.avatarUrl || undefined} />
                    <AvatarFallback>
                      {agreement.otherParty.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{agreement.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {agreement.otherParty.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <AgreementStatusBadge status={agreement.status as AgreementStatus} />
                    {agreement.agreedValue && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {agreement.valueCurrency} {parseFloat(agreement.agreedValue).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recommended Jobs */}
        {recommendedJobs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Vagas Recomendadas
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/app/work/jobs">
                    Explorar
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendedJobs.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    to={`/app/work/jobs/${job.id}`}
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={job.company.logoUrl || undefined} />
                        <AvatarFallback>
                          {job.company.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {job.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.company.name}
                        </div>
                        {job.paymentValue && (
                          <div className="text-xs text-primary mt-1">
                            {job.paymentCurrency} {parseFloat(job.paymentValue).toLocaleString('pt-BR')}
                            {job.paymentPeriod && `/${job.paymentPeriod.toLowerCase()}`}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {job.matchScore}%
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/app/work/jobs">
                  <Search className="h-5 w-5 mb-1" />
                  <span className="text-xs">Buscar Vagas</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/app/work/talents">
                  <Users className="h-5 w-5 mb-1" />
                  <span className="text-xs">Buscar Talentos</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/app/work/manage/jobs">
                  <Plus className="h-5 w-5 mb-1" />
                  <span className="text-xs">Minhas Vagas</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/app/work/evaluations">
                  <Star className="h-5 w-5 mb-1" />
                  <span className="text-xs">Avaliações</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default WorkHomePage;
