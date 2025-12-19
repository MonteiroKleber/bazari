// path: apps/web/src/modules/work/pages/JobApplicationsPage.tsx
// Página de gestão de candidaturas de uma vaga

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Star,
  Clock,
  Users,
  Briefcase,
  DollarSign,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';
import { SkillTagList } from '../components/SkillTagList';
import {
  getJob,
  getJobApplications,
  updateApplicationStatus,
  type JobApplication,
  type ApplicationStatus,
} from '../api';

const statusConfig: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  PENDING: { label: 'Pendente', variant: 'secondary', icon: Clock },
  REVIEWED: { label: 'Analisado', variant: 'outline', icon: Eye },
  SHORTLISTED: { label: 'Pré-selecionado', variant: 'default', icon: Star },
  REJECTED: { label: 'Recusado', variant: 'destructive', icon: XCircle },
  HIRED: { label: 'Contratado', variant: 'default', icon: CheckCircle },
};

interface ApplicationCardProps {
  application: JobApplication;
  onStatusChange: (status: ApplicationStatus) => void;
  onViewDetails: () => void;
}

function ApplicationCard({ application, onStatusChange, onViewDetails }: ApplicationCardProps) {
  const status = statusConfig[application.status];
  const StatusIcon = status.icon;
  const applicant = application.applicant;

  const initials = applicant?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={applicant?.avatarUrl || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">
                {applicant?.displayName || `@${applicant?.handle}`}
              </h3>
              <Badge variant={status.variant} className="shrink-0 gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>

            {applicant?.handle && (
              <p className="text-sm text-muted-foreground mb-2">@{applicant.handle}</p>
            )}

            {applicant?.professionalProfile && (
              <div className="space-y-1 mb-2">
                {applicant.professionalProfile.area && (
                  <p className="text-sm font-medium text-primary">
                    {applicant.professionalProfile.area}
                  </p>
                )}
                {applicant.professionalProfile.skills?.length > 0 && (
                  <SkillTagList skills={applicant.professionalProfile.skills.slice(0, 5)} size="sm" />
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {application.expectedValue && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Pretensão: R$ {parseFloat(application.expectedValue).toLocaleString('pt-BR')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(application.appliedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              {applicant?.handle && (
                <DropdownMenuItem asChild>
                  <Link to={`/app/work/talents/${applicant.handle}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Perfil Completo
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />

              {application.status !== 'REVIEWED' && (
                <DropdownMenuItem onClick={() => onStatusChange('REVIEWED')}>
                  <Eye className="h-4 w-4 mr-2" />
                  Marcar como Analisado
                </DropdownMenuItem>
              )}
              {application.status !== 'SHORTLISTED' && (
                <DropdownMenuItem onClick={() => onStatusChange('SHORTLISTED')} className="text-blue-600">
                  <Star className="h-4 w-4 mr-2" />
                  Pré-selecionar
                </DropdownMenuItem>
              )}
              {application.status !== 'HIRED' && (
                <DropdownMenuItem onClick={() => onStatusChange('HIRED')} className="text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como Contratado
                </DropdownMenuItem>
              )}
              {application.status !== 'REJECTED' && (
                <DropdownMenuItem onClick={() => onStatusChange('REJECTED')} className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Recusar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);

  // Fetch job
  const { data: jobData, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  });

  // Fetch applications
  const { data: applicationsData, isLoading: isLoadingApps } = useQuery({
    queryKey: ['job-applications', id],
    queryFn: () => getJobApplications(id!),
    enabled: !!id,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) =>
      updateApplicationStatus(id!, applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications', id] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status', { description: error.message });
    },
  });

  const job = jobData?.job;
  const applications = applicationsData?.items || [];

  const filteredApplications = applications.filter((app) => {
    if (activeTab === 'all') return true;
    return app.status === activeTab.toUpperCase();
  });

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'PENDING').length,
    reviewed: applications.filter((a) => a.status === 'REVIEWED').length,
    shortlisted: applications.filter((a) => a.status === 'SHORTLISTED').length,
    hired: applications.filter((a) => a.status === 'HIRED').length,
    rejected: applications.filter((a) => a.status === 'REJECTED').length,
  };

  const isLoading = isLoadingJob || isLoadingApps;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
            <div className="h-10 bg-muted rounded w-48" />
            <div className="h-24 bg-muted rounded" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Vaga não encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Esta vaga não existe ou você não tem permissão para acessá-la.
              </p>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Candidaturas</h1>
            <p className="text-sm text-muted-foreground">{job.title}</p>
          </div>
          <Badge variant="secondary" className="gap-1 shrink-0">
            <Users className="h-3.5 w-3.5" />
            {applications.length}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="gap-1">
              Todas <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              Pendentes <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="shortlisted" className="gap-1">
              Pré-selecionados <Badge variant="secondary" className="ml-1">{counts.shortlisted}</Badge>
            </TabsTrigger>
            <TabsTrigger value="hired" className="gap-1">
              Contratados <Badge variant="secondary" className="ml-1">{counts.hired}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1">
              Recusados <Badge variant="secondary" className="ml-1">{counts.rejected}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredApplications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    {activeTab === 'all' ? 'Nenhuma candidatura' : `Nenhuma candidatura ${activeTab === 'pending' ? 'pendente' : activeTab === 'shortlisted' ? 'pré-selecionada' : activeTab === 'hired' ? 'contratada' : 'recusada'}`}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all'
                      ? 'Esta vaga ainda não recebeu candidaturas.'
                      : 'Não há candidaturas neste status.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    onStatusChange={(status) =>
                      updateStatusMutation.mutate({ applicationId: application.id, status })
                    }
                    onViewDetails={() => setSelectedApplication(application)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Application Details Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Candidatura</DialogTitle>
            <DialogDescription>
              Candidatura de {selectedApplication?.applicant?.displayName || `@${selectedApplication?.applicant?.handle}`}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Applicant Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedApplication.applicant?.avatarUrl || undefined} />
                  <AvatarFallback>
                    {selectedApplication.applicant?.displayName
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">
                    {selectedApplication.applicant?.displayName}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    @{selectedApplication.applicant?.handle}
                  </p>
                </div>
              </div>

              {/* Professional Info */}
              {selectedApplication.applicant?.professionalProfile && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  {selectedApplication.applicant.professionalProfile.area && (
                    <p className="text-sm font-medium">
                      {selectedApplication.applicant.professionalProfile.area}
                    </p>
                  )}
                  {selectedApplication.applicant.professionalProfile.hourlyRate && (
                    <p className="text-sm text-muted-foreground">
                      Valor/hora: R$ {parseFloat(selectedApplication.applicant.professionalProfile.hourlyRate).toFixed(2)}
                    </p>
                  )}
                  {selectedApplication.applicant.professionalProfile.skills?.length > 0 && (
                    <SkillTagList skills={selectedApplication.applicant.professionalProfile.skills} size="sm" />
                  )}
                </div>
              )}

              {/* Expected Value */}
              {selectedApplication.expectedValue && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Pretensão salarial: </span>
                  <span className="font-medium">
                    R$ {parseFloat(selectedApplication.expectedValue).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplication.coverLetter && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Carta de Apresentação
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedApplication.coverLetter}
                    </p>
                  </div>
                </div>
              )}

              {/* Applied At */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Candidatou-se em {new Date(selectedApplication.appliedAt).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedApplication.applicant?.handle && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/app/work/talents/${selectedApplication.applicant.handle}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Perfil Completo
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JobApplicationsPage;
