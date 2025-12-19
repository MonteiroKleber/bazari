# Prompt 00: Home/Dashboard e Registro na App Store

## Objetivo

Configurar o Bazari Pay como app nativo disponível na App Store da Bazari e definir a página Home/Dashboard como entry point.

## Contexto

O Bazari Pay precisa:
1. Estar registrado na App Store (https://bazari.libervia.xyz/app/store)
2. Ter uma página Home/Dashboard que funcione como entry point
3. Seguir o padrão dos outros apps nativos (Wallet, Work, etc.)

## Entrega Esperada

### 1. Manifest do App

Criar em `apps/web/src/apps/pay/manifest.ts`:

```typescript
// path: apps/web/src/apps/pay/manifest.ts
// Bazari Pay - Manifest para App Store

import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';

export const payApp: BazariApp = {
  id: 'pay',
  name: 'Bazari Pay',
  slug: 'pay',
  version: '1.0.0',

  icon: 'Banknote',
  color: 'from-emerald-500 to-teal-600',
  description: 'Pagamentos recorrentes automáticos',

  category: 'finance',
  tags: ['pagamentos', 'recorrente', 'salário', 'contratos', 'automático'],

  entryPoint: '/app/pay',
  component: lazy(() =>
    import('@/modules/pay/pages/PayDashboardPage').then((m) => ({
      default: m.PayDashboardPage,
    }))
  ),

  permissions: [
    { id: 'wallet:read', reason: 'Verificar saldo para pagamentos' },
    { id: 'wallet:transfer', reason: 'Executar transferências automáticas' },
    { id: 'contracts:read', reason: 'Consultar contratos de pagamento' },
    { id: 'contracts:write', reason: 'Criar e gerenciar contratos' },
    { id: 'chat:access', reason: 'Enviar notificações e comprovantes' },
  ],

  requiredRoles: ['user'],

  status: 'stable',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 6,

  longDescription: `
O Bazari Pay é o banco programável de pagamentos recorrentes da Bazari.

Para Pagadores (Empresas/Pessoas):
- Crie contratos de pagamento automático
- Configure periodicidade (semanal, quinzenal, mensal)
- Adicione extras e descontos
- Acompanhe execuções em tempo real
- Importe contratos via CSV

Para Recebedores:
- Receba pagamentos automaticamente
- Visualize histórico completo
- Acesse comprovantes
- Acompanhe próximos pagamentos

Características:
- Execução automática no dia programado
- Registro on-chain para auditabilidade
- Notificações via BazChat
- Retry automático em caso de falha
  `.trim(),

  screenshots: [],
};
```

### 2. Registrar na App Store

Modificar `apps/web/src/platform/registry/native-apps.ts`:

```typescript
// Adicionar import
import { payApp } from '@/apps/pay/manifest';

// Adicionar ao array NATIVE_APPS
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
  workApp,
  payApp,  // ← Adicionar aqui
  developerPortalApp,
  adminPanelApp,
  studioApp,
];
```

### 3. Backend - Endpoint Dashboard

Criar em `apps/api/src/routes/pay/dashboard.ts`:

```typescript
// path: apps/api/src/routes/pay/dashboard.ts
// Bazari Pay - Dashboard endpoint

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';

export default async function payDashboardRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  // GET /api/pay/dashboard
  fastify.get('/dashboard', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);

    // Buscar perfil e seller profiles
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado' });
    }

    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    // Buscar estatísticas em paralelo
    const [
      contractsAsPayer,
      contractsAsReceiver,
      activeContractsAsPayer,
      activeContractsAsReceiver,
      pendingExecutions,
      upcomingPayments,
    ] = await Promise.all([
      // Total contratos como pagador
      prisma.payContract.count({
        where: {
          OR: [
            { payerId: authUser.sub },
            { payerCompanyId: { in: sellerProfileIds } },
          ],
        },
      }),

      // Total contratos como recebedor
      prisma.payContract.count({
        where: { receiverId: authUser.sub },
      }),

      // Contratos ativos como pagador
      prisma.payContract.count({
        where: {
          OR: [
            { payerId: authUser.sub },
            { payerCompanyId: { in: sellerProfileIds } },
          ],
          status: 'ACTIVE',
        },
      }),

      // Contratos ativos como recebedor
      prisma.payContract.count({
        where: {
          receiverId: authUser.sub,
          status: 'ACTIVE',
        },
      }),

      // Execuções pendentes/agendadas
      prisma.payExecution.count({
        where: {
          contract: {
            OR: [
              { payerId: authUser.sub },
              { payerCompanyId: { in: sellerProfileIds } },
            ],
          },
          status: { in: ['SCHEDULED', 'RETRYING'] },
        },
      }),

      // Próximos pagamentos (7 dias)
      prisma.payContract.findMany({
        where: {
          OR: [
            { payerId: authUser.sub },
            { payerCompanyId: { in: sellerProfileIds } },
            { receiverId: authUser.sub },
          ],
          status: 'ACTIVE',
          nextPaymentDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          payer: {
            select: { id: true },
          },
          receiver: {
            select: { id: true },
          },
        },
        orderBy: { nextPaymentDate: 'asc' },
        take: 5,
      }),
    ]);

    // Calcular valor mensal (simplificado)
    const monthlyContracts = await prisma.payContract.findMany({
      where: {
        OR: [
          { payerId: authUser.sub },
          { payerCompanyId: { in: sellerProfileIds } },
        ],
        status: 'ACTIVE',
        period: 'MONTHLY',
      },
      select: { baseValue: true, currency: true },
    });

    const monthlyTotalBRL = monthlyContracts
      .filter(c => c.currency === 'BRL')
      .reduce((sum, c) => sum + Number(c.baseValue), 0);

    const monthlyTotalBZR = monthlyContracts
      .filter(c => c.currency === 'BZR')
      .reduce((sum, c) => sum + Number(c.baseValue), 0);

    // Buscar recebedores para os próximos pagamentos
    const receiverIds = upcomingPayments.map(p => p.receiverId);
    const payerIds = upcomingPayments.map(p => p.payerId);
    const allUserIds = [...new Set([...receiverIds, ...payerIds])];

    const profiles = await prisma.profile.findMany({
      where: { userId: { in: allUserIds } },
      select: { userId: true, displayName: true, avatarUrl: true, handle: true },
    });

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return reply.send({
      stats: {
        contractsAsPayer,
        contractsAsReceiver,
        activeContractsAsPayer,
        activeContractsAsReceiver,
        pendingExecutions,
        monthlyTotalBRL,
        monthlyTotalBZR,
      },
      upcomingPayments: upcomingPayments.map(p => {
        const isPayer = p.payerId === authUser.sub ||
          sellerProfileIds.includes(p.payerCompanyId || '');
        const otherPartyId = isPayer ? p.receiverId : p.payerId;
        const otherParty = profileMap.get(otherPartyId);

        return {
          id: p.id,
          role: isPayer ? 'payer' : 'receiver',
          otherParty: {
            name: otherParty?.displayName || 'Usuário',
            handle: otherParty?.handle || null,
            avatarUrl: otherParty?.avatarUrl || null,
          },
          baseValue: p.baseValue.toString(),
          currency: p.currency,
          period: p.period,
          nextPaymentDate: p.nextPaymentDate.toISOString(),
          description: p.description,
        };
      }),
    });
  });
}
```

### 4. Frontend - PayDashboardPage

O layout já está definido no PROMPT-01 (seção 2.3), mas aqui está a implementação completa:

Criar em `apps/web/src/modules/pay/pages/PayDashboardPage.tsx`:

```tsx
// path: apps/web/src/modules/pay/pages/PayDashboardPage.tsx
// Bazari Pay - Dashboard/Home Page

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Banknote,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { getDashboard } from '../api';
import { formatCurrency } from '@/lib/utils';

export function PayDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pay-dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
            <div className="h-16 bg-muted rounded-lg" />
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

  const { stats, upcomingPayments } = data;
  const hasContracts = stats.contractsAsPayer > 0 || stats.contractsAsReceiver > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Banknote className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Bazari Pay</h1>
              <p className="text-sm text-muted-foreground">
                Pagamentos recorrentes automáticos
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/app/pay/contracts/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Link>
          </Button>
        </div>

        {/* Empty State */}
        {!hasContracts && (
          <Card>
            <CardContent className="py-12 text-center">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                Nenhum contrato de pagamento
              </h2>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Crie seu primeiro contrato de pagamento recorrente para automatizar
                pagamentos de salários, serviços ou qualquer valor periódico.
              </p>
              <Button asChild>
                <Link to="/app/pay/contracts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Contrato
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {hasContracts && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/app/pay/contracts?role=payer">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {stats.activeContractsAsPayer}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Pagando
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/app/pay/contracts?role=receiver">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.activeContractsAsReceiver}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <ArrowDownLeft className="h-3 w-3" />
                      Recebendo
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="h-full">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(stats.monthlyTotalBRL, 'BRL')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total/mês (BRL)
                  </div>
                </CardContent>
              </Card>

              <Link to="/app/pay/executions?status=pending">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {stats.pendingExecutions}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pendentes
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Upcoming Payments */}
            {upcomingPayments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Próximos Pagamentos (7 dias)
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/pay/contracts">
                        Ver todos
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingPayments.map((payment) => (
                    <Link
                      key={payment.id}
                      to={`/app/pay/contracts/${payment.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={payment.otherParty.avatarUrl || undefined} />
                        <AvatarFallback>
                          {payment.otherParty.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {payment.otherParty.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.description || (payment.role === 'payer' ? 'Pagamento' : 'Recebimento')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${payment.role === 'payer' ? 'text-red-600' : 'text-green-600'}`}>
                          {payment.role === 'payer' ? '-' : '+'}
                          {formatCurrency(parseFloat(payment.baseValue), payment.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.nextPaymentDate).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </Link>
                  ))}
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
                    <Link to="/app/pay/contracts">
                      <FileText className="h-5 w-5 mb-1" />
                      <span className="text-xs">Contratos</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                    <Link to="/app/pay/history">
                      <Calendar className="h-5 w-5 mb-1" />
                      <span className="text-xs">Histórico</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                    <Link to="/app/pay/adjustments">
                      <ArrowUpRight className="h-5 w-5 mb-1" />
                      <span className="text-xs">Ajustes</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                    <Link to="/app/pay/contracts/new">
                      <Plus className="h-5 w-5 mb-1" />
                      <span className="text-xs">Novo</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

export default PayDashboardPage;
```

### 5. API Client

Criar/atualizar em `apps/web/src/modules/pay/api.ts`:

```typescript
// path: apps/web/src/modules/pay/api.ts
// Bazari Pay - API Client

import { apiHelpers } from '@/lib/api';

// Types
export interface PayDashboardStats {
  contractsAsPayer: number;
  contractsAsReceiver: number;
  activeContractsAsPayer: number;
  activeContractsAsReceiver: number;
  pendingExecutions: number;
  monthlyTotalBRL: number;
  monthlyTotalBZR: number;
}

export interface UpcomingPayment {
  id: string;
  role: 'payer' | 'receiver';
  otherParty: {
    name: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  baseValue: string;
  currency: string;
  period: string;
  nextPaymentDate: string;
  description: string | null;
}

export interface PayDashboardResponse {
  stats: PayDashboardStats;
  upcomingPayments: UpcomingPayment[];
}

// Dashboard
export async function getDashboard(): Promise<PayDashboardResponse> {
  return apiHelpers.get<PayDashboardResponse>('/api/pay/dashboard');
}
```

### 6. Module Index

Criar em `apps/web/src/modules/pay/index.ts`:

```typescript
// path: apps/web/src/modules/pay/index.ts
// Bazari Pay - Module Exports

// API
export * from './api';

// Pages
export { PayDashboardPage } from './pages/PayDashboardPage';
```

### 7. Rotas

Adicionar em `apps/web/src/App.tsx`:

```tsx
// Import
import { PayDashboardPage } from './modules/pay';

// Rotas (dentro de /app/*)
<Route path="pay" element={<PayDashboardPage />} />
<Route path="pay/contracts" element={<ContractListPage />} />
<Route path="pay/contracts/new" element={<ContractCreatePage />} />
<Route path="pay/contracts/:id" element={<ContractDetailPage />} />
// ... outras rotas do PROMPT-01
```

## Estrutura de Arquivos

```
apps/web/src/
  apps/pay/
    manifest.ts           ← Novo
  modules/pay/
    pages/
      PayDashboardPage.tsx  ← Novo (ou atualizar se existir)
    api.ts                  ← Adicionar getDashboard
    index.ts                ← Exportar PayDashboardPage

apps/api/src/routes/pay/
  dashboard.ts              ← Novo
  index.ts                  ← Registrar dashboard route
```

## Critérios de Aceite

- [ ] App visível na App Store (https://bazari.libervia.xyz/app/store)
- [ ] Manifest com ícone, cor, descrição, permissões
- [ ] Entry point `/app/pay` funciona
- [ ] Dashboard mostra estatísticas corretas
- [ ] Dashboard mostra próximos pagamentos
- [ ] Empty state quando não há contratos
- [ ] Botão "Novo Contrato" leva para criação
- [ ] Links de acesso rápido funcionam

## Dependências

- Nenhuma (este prompt deve ser executado ANTES do PROMPT-01)

## Observações

- Este prompt configura a infraestrutura base do app
- O PROMPT-01 implementa a funcionalidade de contratos
- O dashboard será enriquecido conforme mais funcionalidades forem implementadas
