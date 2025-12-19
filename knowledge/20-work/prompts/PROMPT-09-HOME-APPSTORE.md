# Prompt 09: Home Dashboard e Registro na App Store

## Objetivo

Criar a página principal (Home/Dashboard) do Bazari Work e registrar o módulo na App Store do BazariOS.

## Pré-requisitos

- Fases 1-7 do Work implementadas
- Sistema de App Store funcionando (`/app/store`)

## Contexto

O Bazari Work está funcional mas não possui:
1. Uma **página inicial** que sirva como hub de navegação
2. **Registro na App Store** para instalação pelos usuários

Este prompt resolve ambos os pontos.

---

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Endpoint de Dashboard

```typescript
// GET /api/work/dashboard
// Retorna resumo completo para a Home

interface DashboardResponse {
  // Perfil do usuário
  profile: {
    hasProfile: boolean;
    status: 'AVAILABLE' | 'NOT_AVAILABLE' | 'INVISIBLE' | null;
    professionalArea: string | null;
    skills: string[];
    hourlyRate: string | null;
    hourlyRateCurrency: string | null;
    averageRating: number | null;
    totalEvaluations: number;
    agreementsCompleted: number;
  } | null;

  // Contadores rápidos
  stats: {
    pendingProposals: number;      // Propostas aguardando resposta
    activeAgreements: number;      // Acordos em andamento
    pendingEvaluations: number;    // Acordos encerrados sem avaliação
    matchingJobs: number;          // Vagas compatíveis com skills
  };

  // Propostas recentes (máx 3)
  recentProposals: {
    id: string;
    title: string;
    status: string;
    proposedValue: string | null;
    valueCurrency: string | null;
    otherParty: {
      name: string;
      avatarUrl: string | null;
    };
    createdAt: string;
  }[];

  // Acordos ativos (máx 3)
  activeAgreements: {
    id: string;
    title: string;
    status: string;
    agreedValue: string | null;
    valueCurrency: string | null;
    otherParty: {
      name: string;
      avatarUrl: string | null;
    };
    startDate: string | null;
  }[];

  // Vagas recomendadas (máx 6)
  recommendedJobs: {
    id: string;
    title: string;
    company: {
      name: string;
      logoUrl: string | null;
    };
    paymentValue: string | null;
    paymentPeriod: string | null;
    paymentCurrency: string | null;
    matchScore: number; // 0-100 baseado em skills
  }[];
}
```

#### 1.2 Implementação do Endpoint

```typescript
// apps/api/src/routes/work/dashboard.ts

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';

export default async function workDashboardRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  fastify.get('/dashboard', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = (request as any).authUser;

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      include: {
        professionalProfile: true,
      },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado' });
    }

    const profProfile = profile.professionalProfile;

    // Buscar contadores
    const [
      pendingProposals,
      activeAgreements,
      pendingEvaluations,
      matchingJobs,
    ] = await Promise.all([
      // Propostas pendentes (recebidas ou enviadas com status pendente)
      prisma.workProposal.count({
        where: {
          OR: [
            { receiverId: profile.id, status: 'PENDING' },
            { senderId: profile.id, status: 'PENDING' },
          ],
        },
      }),

      // Acordos ativos
      prisma.workAgreement.count({
        where: {
          workerId: profile.id,
          status: 'ACTIVE',
        },
      }),

      // Acordos encerrados sem avaliação minha
      prisma.workAgreement.count({
        where: {
          workerId: profile.id,
          status: 'CLOSED',
          evaluations: {
            none: {
              authorId: profile.id,
            },
          },
        },
      }),

      // Vagas compatíveis (se tiver skills)
      profProfile?.skills?.length
        ? prisma.jobPosting.count({
            where: {
              status: 'OPEN',
              skills: {
                hasSome: profProfile.skills,
              },
            },
          })
        : 0,
    ]);

    // Buscar propostas recentes
    const recentProposals = await prisma.workProposal.findMany({
      where: {
        OR: [
          { receiverId: profile.id },
          { senderId: profile.id },
        ],
      },
      include: {
        sender: {
          select: { displayName: true, avatarUrl: true },
        },
        receiver: {
          select: { displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Buscar acordos ativos
    const agreements = await prisma.workAgreement.findMany({
      where: {
        workerId: profile.id,
        status: 'ACTIVE',
      },
      include: {
        sellerProfile: {
          include: {
            user: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
      take: 3,
    });

    // Buscar vagas recomendadas
    const jobs = profProfile?.skills?.length
      ? await prisma.jobPosting.findMany({
          where: {
            status: 'OPEN',
            skills: {
              hasSome: profProfile.skills,
            },
          },
          include: {
            company: {
              select: { name: true, logoUrl: true },
            },
          },
          orderBy: { publishedAt: 'desc' },
          take: 6,
        })
      : [];

    // Calcular match score para vagas
    const recommendedJobs = jobs.map((job) => {
      const matchingSkills = job.skills.filter((s) =>
        profProfile?.skills?.includes(s)
      ).length;
      const matchScore = Math.round(
        (matchingSkills / Math.max(job.skills.length, 1)) * 100
      );

      return {
        id: job.id,
        title: job.title,
        company: {
          name: job.company?.name || 'Empresa',
          logoUrl: job.company?.logoUrl || null,
        },
        paymentValue: job.paymentValue?.toString() || null,
        paymentPeriod: job.paymentPeriod,
        paymentCurrency: job.paymentCurrency,
        matchScore,
      };
    });

    return reply.send({
      profile: profProfile
        ? {
            hasProfile: true,
            status: profProfile.status,
            professionalArea: profProfile.professionalArea,
            skills: profProfile.skills,
            hourlyRate: profProfile.hourlyRate?.toString() || null,
            hourlyRateCurrency: profProfile.hourlyRateCurrency,
            averageRating: profProfile.averageRating,
            totalEvaluations: profProfile.totalEvaluations,
            agreementsCompleted: profProfile.completedContracts,
          }
        : {
            hasProfile: false,
            status: null,
            professionalArea: null,
            skills: [],
            hourlyRate: null,
            hourlyRateCurrency: null,
            averageRating: null,
            totalEvaluations: 0,
            agreementsCompleted: 0,
          },
      stats: {
        pendingProposals,
        activeAgreements,
        pendingEvaluations,
        matchingJobs,
      },
      recentProposals: recentProposals.map((p) => {
        const isReceiver = p.receiverId === profile.id;
        const otherParty = isReceiver ? p.sender : p.receiver;
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          proposedValue: p.proposedValue?.toString() || null,
          valueCurrency: p.valueCurrency,
          otherParty: {
            name: otherParty?.displayName || 'Usuário',
            avatarUrl: otherParty?.avatarUrl || null,
          },
          createdAt: p.createdAt.toISOString(),
        };
      }),
      activeAgreements: agreements.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        agreedValue: a.agreedValue?.toString() || null,
        valueCurrency: a.valueCurrency,
        otherParty: {
          name: a.sellerProfile?.user?.displayName || 'Empresa',
          avatarUrl: a.sellerProfile?.user?.avatarUrl || null,
        },
        startDate: a.startDate?.toISOString() || null,
      })),
      recommendedJobs,
    });
  });
}
```

---

### 2. Frontend (Web)

#### 2.1 Estrutura de Arquivos

```
apps/web/src/
├── apps/
│   └── work/
│       └── manifest.ts              # CRIAR - Manifest do app
├── modules/work/
│   ├── pages/
│   │   └── WorkHomePage.tsx         # CRIAR - Página Home
│   ├── components/
│   │   ├── DashboardStats.tsx       # CRIAR - Cards de estatísticas
│   │   ├── QuickActions.tsx         # CRIAR - Ações rápidas
│   │   └── ProfileSummary.tsx       # CRIAR - Resumo do perfil
│   ├── api.ts                       # MODIFICAR - Adicionar getDashboard
│   └── index.ts                     # MODIFICAR - Exportar WorkHomePage
├── platform/registry/
│   └── native-apps.ts               # MODIFICAR - Registrar workApp
└── App.tsx                          # MODIFICAR - Adicionar rota /app/work
```

#### 2.2 API - Adicionar getDashboard

```typescript
// apps/web/src/modules/work/api.ts

export interface DashboardStats {
  pendingProposals: number;
  activeAgreements: number;
  pendingEvaluations: number;
  matchingJobs: number;
}

export interface DashboardProfile {
  hasProfile: boolean;
  status: ProfessionalStatus | null;
  professionalArea: string | null;
  skills: string[];
  hourlyRate: string | null;
  hourlyRateCurrency: string | null;
  averageRating: number | null;
  totalEvaluations: number;
  agreementsCompleted: number;
}

export interface DashboardProposal {
  id: string;
  title: string;
  status: string;
  proposedValue: string | null;
  valueCurrency: string | null;
  otherParty: {
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export interface DashboardAgreement {
  id: string;
  title: string;
  status: string;
  agreedValue: string | null;
  valueCurrency: string | null;
  otherParty: {
    name: string;
    avatarUrl: string | null;
  };
  startDate: string | null;
}

export interface DashboardJob {
  id: string;
  title: string;
  company: {
    name: string;
    logoUrl: string | null;
  };
  paymentValue: string | null;
  paymentPeriod: string | null;
  paymentCurrency: string | null;
  matchScore: number;
}

export interface DashboardResponse {
  profile: DashboardProfile;
  stats: DashboardStats;
  recentProposals: DashboardProposal[];
  activeAgreements: DashboardAgreement[];
  recommendedJobs: DashboardJob[];
}

export async function getDashboard(): Promise<DashboardResponse> {
  const res = await api.get('/work/dashboard');
  return res.data;
}
```

#### 2.3 WorkHomePage.tsx

```tsx
// apps/web/src/modules/work/pages/WorkHomePage.tsx

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
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ProfessionalStatusBadge } from '../components/ProfessionalStatusBadge';
import { ProposalStatusBadge } from '../components/ProposalStatusBadge';
import { AgreementStatusBadge } from '../components/AgreementStatusBadge';
import { getDashboard } from '../api';

export function WorkHomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['work-dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
              ))}
            </div>
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
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Erro ao carregar dashboard
              </h3>
              <p className="text-muted-foreground">
                Tente novamente mais tarde.
              </p>
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
                    <ProfessionalStatusBadge status={profile.status!} />
                  </div>
                  {profile.professionalArea && (
                    <p className="text-muted-foreground mb-2">
                      {profile.professionalArea}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm">
                    {profile.averageRating && (
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
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
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
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
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

          <Link to="/app/work/evaluations">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
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
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
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
                    <ProposalStatusBadge status={proposal.status as any} />
                    {proposal.proposedValue && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {proposal.valueCurrency} {parseFloat(proposal.proposedValue).toLocaleString()}
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
                    <AgreementStatusBadge status={agreement.status as any} />
                    {agreement.agreedValue && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {agreement.valueCurrency} {parseFloat(agreement.agreedValue).toLocaleString()}
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
                            {job.paymentCurrency} {parseFloat(job.paymentValue).toLocaleString()}
                            {job.paymentPeriod && `/${job.paymentPeriod.toLowerCase()}`}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {job.matchScore}% match
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
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
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
```

#### 2.4 Manifest do App

```typescript
// apps/web/src/apps/work/manifest.ts

import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const workApp: BazariApp = {
  id: 'work',
  name: 'Bazari Work',
  slug: 'work',
  version: '1.0.0',

  icon: 'Briefcase',
  color: 'from-violet-500 to-purple-600',
  description: 'Marketplace de talentos e trabalho freelance',

  category: 'commerce',
  tags: ['trabalho', 'freelance', 'talentos', 'vagas', 'contratos'],

  entryPoint: '/app/work',
  component: lazy(() =>
    import('@/modules/work/pages/WorkHomePage').then((m) => ({
      default: m.WorkHomePage,
    }))
  ),

  permissions: [
    { id: 'profile:read', reason: 'Acessar seu perfil profissional' },
    { id: 'profile:write', reason: 'Editar perfil e status' },
    { id: 'jobs:read', reason: 'Ver vagas disponíveis' },
    { id: 'proposals:manage', reason: 'Enviar e receber propostas' },
    { id: 'agreements:manage', reason: 'Gerenciar acordos de trabalho' },
    { id: 'chat:access', reason: 'Negociar via chat' },
  ],

  requiredRoles: ['user'],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 5,

  longDescription: `
O Bazari Work é o marketplace de talentos do ecossistema Bazari.

**Para Profissionais:**
- Crie seu perfil profissional
- Receba propostas de empresas
- Candidate-se a vagas
- Gerencie acordos e pagamentos
- Construa sua reputação

**Para Empresas:**
- Publique vagas
- Encontre talentos qualificados
- Envie propostas diretas
- Gerencie contratos
- Avalie profissionais

Acordos são registrados on-chain para transparência e segurança.
  `.trim(),

  screenshots: [
    '/screenshots/work-home.png',
    '/screenshots/work-talents.png',
    '/screenshots/work-agreements.png',
  ],
};
```

#### 2.5 Registro no native-apps.ts

```typescript
// apps/web/src/platform/registry/native-apps.ts

// Adicionar import
import { workApp } from '@/apps/work/manifest';

// Adicionar no array NATIVE_APPS
export const NATIVE_APPS: BazariApp[] = [
  walletApp,
  feedApp,
  marketplaceApp,
  bazchatApp,
  p2pApp,
  governanceApp,
  analyticsApp,
  vestingApp,
  rewardsApp,
  deliveryApp,
  discoverApp,
  affiliatesApp,
  storesApp,
  vrApp,
  workApp,          // ADICIONAR
  developerPortalApp,
  adminPanelApp,
  studioApp,
];
```

#### 2.6 Rota no App.tsx

```tsx
// Adicionar import
import { WorkHomePage } from '@/modules/work';

// Adicionar rota (antes das outras rotas de work)
<Route path="work" element={<WorkHomePage />} />
```

---

### 3. Fluxo de Acesso

```
┌─────────────────────────────────────────────────────────┐
│                    App Store                            │
│                   /app/store                            │
└─────────────────────┬───────────────────────────────────┘
                      │ Usuário instala "Bazari Work"
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Work Home                             │
│                   /app/work                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Resumo do Perfil | Status | Stats              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │Propostas│ │Acordos │ │Avaliar │ │ Vagas  │          │
│  └────┬───┘ └───┬────┘ └───┬────┘ └───┬────┘          │
│       │         │          │          │                │
│       ▼         ▼          ▼          ▼                │
│   /proposals  /agreements  /evaluations  /jobs         │
└─────────────────────────────────────────────────────────┘
```

---

## Critérios de Aceite

- [ ] Endpoint `/api/work/dashboard` retorna dados corretos
- [ ] WorkHomePage exibe resumo do perfil
- [ ] Quick Stats mostram contadores corretos
- [ ] Propostas recentes são listadas
- [ ] Acordos ativos são listados
- [ ] Vagas recomendadas aparecem (se houver skills)
- [ ] Links de navegação funcionam
- [ ] Manifest do app criado corretamente
- [ ] App aparece na App Store (`/app/store`)
- [ ] App pode ser instalado
- [ ] Rota `/app/work` funciona como entryPoint
- [ ] Design responsivo (mobile-first)
- [ ] Loading states funcionam
- [ ] Error states funcionam

---

## Arquivos a Criar

```
apps/api/src/routes/work/
  dashboard.ts                    # Novo endpoint

apps/web/src/apps/work/
  manifest.ts                     # Manifest do app

apps/web/src/modules/work/pages/
  WorkHomePage.tsx                # Página Home
```

## Arquivos a Modificar

```
apps/api/src/server.ts                           # Registrar rota dashboard
apps/web/src/modules/work/api.ts                 # Adicionar getDashboard
apps/web/src/modules/work/index.ts               # Exportar WorkHomePage
apps/web/src/platform/registry/native-apps.ts   # Adicionar workApp
apps/web/src/App.tsx                             # Adicionar rota /app/work
```
