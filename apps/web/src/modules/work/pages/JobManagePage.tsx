// path: apps/web/src/modules/work/pages/JobManagePage.tsx
// Página de gestão de vagas da empresa

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  XCircle,
  Users,
  Briefcase,
  Eye,
  Building2,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';
import {
  getMyJobs,
  publishJob,
  pauseJob,
  closeJob,
  deleteJob,
  type JobPosting,
  type JobPostingStatus,
} from '../api';

const statusConfig: Record<JobPostingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary', color: 'text-muted-foreground' },
  OPEN: { label: 'Aberta', variant: 'default', color: 'text-green-600' },
  PAUSED: { label: 'Pausada', variant: 'outline', color: 'text-amber-600' },
  CLOSED: { label: 'Fechada', variant: 'destructive', color: 'text-red-600' },
};

const paymentPeriodLabels: Record<string, string> = {
  HOURLY: '/hora',
  DAILY: '/dia',
  WEEKLY: '/semana',
  MONTHLY: '/mês',
  PROJECT: '/projeto',
};

interface JobCardManageProps {
  job: JobPosting;
  onPublish: () => void;
  onPause: () => void;
  onClose: () => void;
  onDelete: () => void;
}

function JobCardManage({ job, onPublish, onPause, onClose, onDelete }: JobCardManageProps) {
  const navigate = useNavigate();
  const status = statusConfig[job.status];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{job.title}</h3>
              <Badge variant={status.variant} className="shrink-0">
                {status.label}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-2">{job.area}</p>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {job.paymentValue && job.paymentPeriod && (
                <span className="font-medium">
                  {job.paymentCurrency} {parseFloat(job.paymentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {paymentPeriodLabels[job.paymentPeriod]}
                </span>
              )}

              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {job.applicationsCount || 0} candidatos
              </span>

              {job.publishedAt && (
                <span className="text-muted-foreground">
                  Publicada em {new Date(job.publishedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/app/work/jobs/${job.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/app/work/manage/jobs/${job.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {job.status !== 'CLOSED' && (
                <DropdownMenuItem onClick={() => navigate(`/app/work/manage/jobs/${job.id}/applications`)}>
                  <Users className="h-4 w-4 mr-2" />
                  Ver Candidatos
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />

              {job.status === 'DRAFT' && (
                <DropdownMenuItem onClick={onPublish} className="text-green-600">
                  <Play className="h-4 w-4 mr-2" />
                  Publicar
                </DropdownMenuItem>
              )}
              {job.status === 'OPEN' && (
                <DropdownMenuItem onClick={onPause} className="text-amber-600">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </DropdownMenuItem>
              )}
              {job.status === 'PAUSED' && (
                <DropdownMenuItem onClick={onPublish} className="text-green-600">
                  <Play className="h-4 w-4 mr-2" />
                  Reativar
                </DropdownMenuItem>
              )}
              {(job.status === 'OPEN' || job.status === 'PAUSED') && (
                <DropdownMenuItem onClick={onClose} className="text-red-600">
                  <XCircle className="h-4 w-4 mr-2" />
                  Fechar Vaga
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export function JobManagePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobPosting | null>(null);

  // Fetch jobs
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: () => getMyJobs(),
  });

  // Mutations
  const publishMutation = useMutation({
    mutationFn: publishJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Vaga publicada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao publicar vaga', { description: error.message });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: pauseJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Vaga pausada');
    },
    onError: (error: any) => {
      toast.error('Erro ao pausar vaga', { description: error.message });
    },
  });

  const closeMutation = useMutation({
    mutationFn: closeJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Vaga fechada');
    },
    onError: (error: any) => {
      toast.error('Erro ao fechar vaga', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Vaga excluída');
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir vaga', { description: error.message });
    },
  });

  const jobs = data?.items || [];

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return job.status === 'OPEN';
    if (activeTab === 'draft') return job.status === 'DRAFT';
    if (activeTab === 'paused') return job.status === 'PAUSED';
    if (activeTab === 'closed') return job.status === 'CLOSED';
    return true;
  });

  const counts = {
    all: jobs.length,
    open: jobs.filter((j) => j.status === 'OPEN').length,
    draft: jobs.filter((j) => j.status === 'DRAFT').length,
    paused: jobs.filter((j) => j.status === 'PAUSED').length,
    closed: jobs.filter((j) => j.status === 'CLOSED').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-48" />
            <div className="h-12 bg-muted rounded" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Minhas Vagas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as vagas da sua empresa
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/app/work/manage/jobs/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Vaga</span>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="gap-1">
              Todas <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="open" className="gap-1">
              Abertas <Badge variant="secondary" className="ml-1">{counts.open}</Badge>
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-1">
              Rascunhos <Badge variant="secondary" className="ml-1">{counts.draft}</Badge>
            </TabsTrigger>
            <TabsTrigger value="paused" className="gap-1">
              Pausadas <Badge variant="secondary" className="ml-1">{counts.paused}</Badge>
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-1">
              Fechadas <Badge variant="secondary" className="ml-1">{counts.closed}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    {activeTab === 'all' ? 'Nenhuma vaga criada' : `Nenhuma vaga ${activeTab === 'open' ? 'aberta' : activeTab === 'draft' ? 'em rascunho' : activeTab === 'paused' ? 'pausada' : 'fechada'}`}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'all'
                      ? 'Crie sua primeira vaga para encontrar talentos.'
                      : 'Não há vagas neste status no momento.'}
                  </p>
                  {activeTab === 'all' && (
                    <Button onClick={() => navigate('/app/work/manage/jobs/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Vaga
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <JobCardManage
                    key={job.id}
                    job={job}
                    onPublish={() => publishMutation.mutate(job.id)}
                    onPause={() => pauseMutation.mutate(job.id)}
                    onClose={() => closeMutation.mutate(job.id)}
                    onDelete={() => {
                      setJobToDelete(job);
                      setDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vaga?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a vaga "{jobToDelete?.title}"? Esta ação não pode ser desfeita.
              {(jobToDelete?.applicationsCount || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  Atenção: Esta vaga tem {jobToDelete?.applicationsCount} candidatura(s) que também serão excluídas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobToDelete && deleteMutation.mutate(jobToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default JobManagePage;
