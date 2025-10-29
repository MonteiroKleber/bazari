# FASE 8: Governance UI - Prompts de Execução

**Objetivo**: Melhorar e refinar a interface de governança implementada na FASE 7.

**Contexto**: A FASE 7 já implementou toda a funcionalidade base. A FASE 8 foca em **UX/UI** e **features avançadas**.

**Duração Total**: 10 dias úteis (2 semanas)

---

## PROMPT 1 (8h): Setup e Dependências

**Objetivo**: Instalar dependências e configurar estrutura de pastas.

**Contexto**: Preparar projeto para novos componentes de UI.

**Tarefas**:

1. **Instalar dependências**:
```bash
cd /root/bazari/apps/web
pnpm add recharts date-fns framer-motion react-window
pnpm add -D @playwright/test @storybook/react
```

2. **Criar estrutura de pastas**:
```bash
mkdir -p src/modules/governance/components/{dashboard,multisig,notifications,filters}
mkdir -p src/modules/governance/hooks
mkdir -p src/modules/governance/utils
mkdir -p src/modules/governance/__tests__/{e2e,components}
```

3. **Configurar Playwright**:
```bash
pnpm exec playwright install
```

Criar `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/modules/governance/__tests__/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

4. **Configurar Storybook** (opcional):
```bash
pnpm dlx storybook@latest init
```

**Validação**:
- [ ] Todas as dependências instaladas sem erros
- [ ] Estrutura de pastas criada
- [ ] Playwright configurado (roda `pnpm exec playwright test --help`)
- [ ] Build do projeto sem erros

**Duração**: 8h

---

## PROMPT 2 (8h): Dashboard - Widgets e Stats

**Objetivo**: Criar widgets interativos para o dashboard de governança.

**Contexto**: Melhorar `GovernancePage.tsx` com componentes visuais ricos.

**Tarefas**:

1. **Criar `GovernanceStatsWidget.tsx`**:
```typescript
// src/modules/governance/components/dashboard/GovernanceStatsWidget.tsx
interface StatsWidgetProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

export function GovernanceStatsWidget({ title, value, change, icon, color, onClick }: StatsWidgetProps) {
  // Implementar widget com:
  // - Animação de contagem numérica (countUp)
  // - Indicador de mudança (+/- %)
  // - Hover effects
  // - Click handler para navegar
}
```

2. **Criar `QuickActions.tsx`**:
```typescript
// src/modules/governance/components/dashboard/QuickActions.tsx
export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <QuickActionCard
        icon={<PlusCircle />}
        title="Criar Proposta"
        description="Submeta uma nova proposta"
        onClick={() => navigate('/app/governance/proposals/new')}
      />
      <QuickActionCard
        icon={<Vote />}
        title="Votar"
        description="Veja propostas ativas"
        onClick={() => navigate('/app/governance/proposals')}
      />
      <QuickActionCard
        icon={<Coins />}
        title="Tesouro"
        description="Solicite fundos"
        onClick={() => navigate('/app/governance/treasury')}
      />
    </div>
  );
}
```

3. **Atualizar `GovernancePage.tsx`**:
```typescript
// Adicionar widgets ao topo da página
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <GovernanceStatsWidget
    title="Propostas Ativas"
    value={stats.democracy.activeReferendums}
    change={{ value: +5, period: 'esta semana' }}
    icon={<FileText />}
    color="blue"
    onClick={() => navigate('/app/governance/proposals')}
  />
  {/* Mais widgets... */}
</div>

<QuickActions />
```

4. **Adicionar animações com framer-motion**:
```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <GovernanceStatsWidget {...props} />
</motion.div>
```

**Validação**:
- [ ] Widgets renderizam com dados corretos
- [ ] Animações funcionam suavemente
- [ ] Click handlers navegam para páginas corretas
- [ ] Mobile responsive

**Duração**: 8h

---

## PROMPT 3 (8h): Dashboard - Gráficos de Votação

**Objetivo**: Implementar gráficos interativos com recharts.

**Contexto**: Visualizar dados de votação de forma intuitiva.

**Tarefas**:

1. **Criar `VotingChart.tsx`**:
```typescript
// src/modules/governance/components/dashboard/VotingChart.tsx
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VotingChartProps {
  data: Array<{
    proposalId: number;
    ayeVotes: number;
    nayVotes: number;
    abstain?: number;
  }>;
  type: 'bar' | 'pie' | 'line';
}

export function VotingChart({ data, type }: VotingChartProps) {
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="proposalId" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="ayeVotes" fill="#10b981" name="Aye" />
          <Bar dataKey="nayVotes" fill="#ef4444" name="Nay" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Implementar pie chart...
}
```

2. **Criar hook `useVotingData.ts`**:
```typescript
// src/modules/governance/hooks/useVotingData.ts
export function useVotingData(proposalIds: number[]) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotingData = async () => {
      const promises = proposalIds.map(id =>
        governanceApi.getReferendumVotes(id)
      );
      const results = await Promise.all(promises);

      const chartData = results.map((votes, idx) => ({
        proposalId: proposalIds[idx],
        ayeVotes: calculateTotalVotes(votes, 'aye'),
        nayVotes: calculateTotalVotes(votes, 'nay'),
      }));

      setData(chartData);
      setLoading(false);
    };

    fetchVotingData();
  }, [proposalIds]);

  return { data, loading };
}
```

3. **Integrar no `ProposalDetailPage.tsx`**:
```typescript
// Adicionar gráfico de votação na página de detalhes
const { data, loading } = useVotingData([proposal.id]);

<Card>
  <CardHeader>
    <CardTitle>Distribuição de Votos</CardTitle>
  </CardHeader>
  <CardContent>
    {loading ? (
      <Skeleton height={300} />
    ) : (
      <VotingChart data={data} type="pie" />
    )}
  </CardContent>
</Card>
```

4. **Criar helpers**:
```typescript
// src/modules/governance/utils/chartHelpers.ts
export function calculateTotalVotes(votes: Vote[], direction: 'aye' | 'nay') {
  return votes
    .filter(v => v.direction === direction)
    .reduce((sum, v) => sum + parseFloat(v.amount), 0);
}

export function formatChartData(data: any) {
  // Formatar dados para recharts
}
```

**Validação**:
- [ ] Gráficos renderizam corretamente
- [ ] Tooltips mostram informações detalhadas
- [ ] Responsivo em mobile
- [ ] Cores seguem tema (dark/light)

**Duração**: 8h

---

## PROMPT 4 (8h): Timeline de Eventos

**Objetivo**: Criar timeline visual de eventos de governança.

**Contexto**: Mostrar histórico cronológico de propostas, votos, aprovações.

**Tarefas**:

1. **Criar `EventTimeline.tsx`**:
```typescript
// src/modules/governance/components/dashboard/EventTimeline.tsx
interface TimelineEvent {
  id: string;
  type: 'proposal' | 'vote' | 'approval' | 'execution';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  proposalId?: number;
}

export function EventTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="flex gap-4"
        >
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              eventTypeColors[event.type]
            )}>
              {eventTypeIcons[event.type]}
            </div>
            {idx < events.length - 1 && (
              <div className="w-0.5 flex-1 bg-border mt-2" />
            )}
          </div>

          <div className="flex-1 pb-8">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold">{event.title}</h4>
              <time className="text-sm text-muted-foreground">
                {formatRelativeTime(event.timestamp)}
              </time>
            </div>
            <p className="text-sm text-muted-foreground">{event.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              por {formatAddress(event.actor)}
            </p>
            {event.proposalId && (
              <Link
                to={`/app/governance/proposals/${event.proposalId}`}
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                Ver Proposta →
              </Link>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

2. **Criar endpoint mock ou usar dados existentes**:
```typescript
// src/modules/governance/api/index.ts
export const governanceApi = {
  // ... métodos existentes

  getRecentEvents: async (limit = 10) => {
    // Buscar eventos recentes de democracy, treasury, council
    const [democracyEvents, treasuryEvents] = await Promise.all([
      fetchJSON('/governance/democracy/events'),
      fetchJSON('/governance/treasury/events'),
    ]);

    // Combinar e ordenar por timestamp
    return combineAndSortEvents([...democracyEvents, ...treasuryEvents], limit);
  },
};
```

3. **Integrar no `GovernancePage.tsx`**:
```typescript
const [events, setEvents] = useState<TimelineEvent[]>([]);

useEffect(() => {
  loadRecentEvents();
}, []);

<Card>
  <CardHeader>
    <CardTitle>Atividade Recente</CardTitle>
  </CardHeader>
  <CardContent>
    <EventTimeline events={events} />
  </CardContent>
</Card>
```

**Validação**:
- [ ] Timeline renderiza eventos em ordem cronológica
- [ ] Ícones e cores corretos por tipo
- [ ] Links para propostas funcionam
- [ ] Animações suaves

**Duração**: 8h

---

## PROMPT 5 (16h): Multi-sig Dashboard Completo

**Objetivo**: Criar dashboard visual para contas multisig.

**Contexto**: Melhorar `MultisigPage.tsx` com workflow visual e gráficos.

**Tarefas**:

1. **Criar `WorkflowStepper.tsx`**:
```typescript
// src/modules/governance/components/multisig/WorkflowStepper.tsx
interface WorkflowStep {
  label: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  timestamp?: string;
  approver?: string;
}

export function WorkflowStepper({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              stepStatusColors[step.status]
            )}>
              {step.status === 'completed' ? (
                <CheckCircle className="h-6 w-6" />
              ) : step.status === 'current' ? (
                <Clock className="h-6 w-6 animate-pulse" />
              ) : step.status === 'error' ? (
                <XCircle className="h-6 w-6" />
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>
            <p className="text-xs mt-2">{step.label}</p>
            {step.timestamp && (
              <time className="text-xs text-muted-foreground">
                {formatDate(step.timestamp)}
              </time>
            )}
          </div>

          {idx < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-0.5 mx-4",
              step.status === 'completed' ? "bg-green-500" : "bg-gray-300"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
```

2. **Criar `ApprovalProgressChart.tsx`**:
```typescript
// src/modules/governance/components/multisig/ApprovalProgressChart.tsx
import { PieChart, Pie, Cell } from 'recharts';

interface ApprovalProgressProps {
  current: number;
  required: number;
  signatories: Array<{
    address: string;
    approved: boolean;
  }>;
}

export function ApprovalProgressChart({ current, required, signatories }: ApprovalProgressProps) {
  const percentage = (current / required) * 100;

  const data = [
    { name: 'Aprovado', value: current },
    { name: 'Pendente', value: required - current },
  ];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
          >
            <Cell fill="#10b981" />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-3xl font-bold">{percentage.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">{current}/{required}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 w-full">
        {signatories.map(sig => (
          <div key={sig.address} className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              sig.approved ? "bg-green-500" : "bg-gray-300"
            )} />
            <span className="text-sm font-mono">{formatAddress(sig.address)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

3. **Criar `MultisigDashboard.tsx`** (substitui `MultisigPage.tsx`):
```typescript
// src/modules/governance/components/multisig/MultisigDashboard.tsx
export function MultisigDashboard() {
  const [multisigAddress, setMultisigAddress] = useState('');
  const [multisigData, setMultisigData] = useState(null);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header com busca */}
      <SearchBar
        value={multisigAddress}
        onChange={setMultisigAddress}
        onSearch={loadMultisigData}
      />

      {multisigData && (
        <>
          {/* Account Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Conta Multisig</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatItem label="Signatários" value={multisigData.signatories.length} />
                <StatItem label="Threshold" value={multisigData.threshold} />
                <StatItem label="Transações Pendentes" value={multisigData.pendingCount} />
              </div>
            </CardContent>
          </Card>

          {/* Pending Transactions */}
          <h2 className="text-2xl font-bold mb-4">Transações Pendentes</h2>
          <div className="grid gap-4">
            {multisigData.pendingTransactions.map(tx => (
              <Card key={tx.id}>
                <CardHeader>
                  <CardTitle>Transação #{tx.id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <WorkflowStepper steps={generateSteps(tx, multisigData)} />

                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    <ApprovalProgressChart
                      current={tx.approvals.length}
                      required={multisigData.threshold}
                      signatories={multisigData.signatories}
                    />

                    <div>
                      <h4 className="font-semibold mb-2">Detalhes da Transação</h4>
                      <p className="text-sm">{tx.callData}</p>

                      {canApprove(tx, account) && (
                        <Button
                          onClick={() => handleApprove(tx.id)}
                          className="w-full mt-4"
                        >
                          Aprovar Transação
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transaction History */}
          <TransactionHistory multisigAddress={multisigAddress} />
        </>
      )}
    </div>
  );
}
```

4. **Atualizar rotas**:
```typescript
// Substituir MultisigPage por MultisigDashboard em App.tsx
<Route path="governance/multisig" element={<MultisigDashboard />} />
```

**Validação**:
- [ ] Workflow stepper mostra progresso correto
- [ ] Gráfico de aprovação atualiza em tempo real
- [ ] Aprovações funcionam via PIN
- [ ] Histórico de transações carrega

**Duração**: 16h (2 dias)

---

## PROMPT 6 (12h): Notificações em Tempo Real

**Objetivo**: Implementar sistema de notificações WebSocket.

**Contexto**: Notificar usuários sobre eventos de governança em tempo real.

**Tarefas**:

1. **Criar hook `useGovernanceNotifications.ts`**:
```typescript
// src/modules/governance/hooks/useGovernanceNotifications.ts
interface Notification {
  id: string;
  type: 'proposal' | 'vote' | 'approval' | 'execution';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  proposalId?: number;
}

export function useGovernanceNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:3000/governance/events');

    ws.onopen = () => {
      console.log('[Notifications] Connected');
    };

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      handleNewNotification(notification);
    };

    ws.onerror = (error) => {
      console.error('[Notifications] Error:', error);
    };

    ws.onclose = () => {
      console.log('[Notifications] Disconnected');
      // Auto-reconnect after 5s
      setTimeout(() => {
        // Reconnect logic
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast
    toast.info(notification.title, {
      description: notification.message,
      action: notification.proposalId ? (
        <Button size="sm" onClick={() => navigate(`/app/governance/proposals/${notification.proposalId}`)}>
          Ver
        </Button>
      ) : undefined,
    });

    // Play sound (optional)
    if (shouldPlaySound()) {
      playNotificationSound();
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
```

2. **Criar `NotificationBell.tsx`**:
```typescript
// src/modules/governance/components/notifications/NotificationBell.tsx
export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useGovernanceNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn(
            "h-5 w-5",
            unreadCount > 0 && "animate-ring"
          )} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <NotificationPanel
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      </PopoverContent>
    </Popover>
  );
}
```

3. **Criar `NotificationPanel.tsx`**:
```typescript
// src/modules/governance/components/notifications/NotificationPanel.tsx
export function NotificationPanel({ notifications, onMarkAsRead, onMarkAllAsRead }: Props) {
  const [filter, setFilter] = useState<'all' | NotificationType>('all');

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Notificações</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMarkAllAsRead}
        >
          Marcar todas como lidas
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="proposal">Propostas</TabsTrigger>
          <TabsTrigger value="vote">Votos</TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="h-[400px]">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

4. **Integrar no `AppHeader.tsx`**:
```typescript
// Adicionar NotificationBell ao header
<div className="flex items-center gap-4">
  <NotificationBell />
  {/* ... outros itens */}
</div>
```

**Validação**:
- [ ] WebSocket conecta e reconecta automaticamente
- [ ] Notificações aparecem em tempo real
- [ ] Badge mostra contador correto
- [ ] Toast notifications funcionam
- [ ] Marcar como lida funciona

**Duração**: 12h

---

## PROMPT 7 (12h): Filtros Avançados e Busca

**Objetivo**: Implementar sistema de filtros avançados e busca full-text.

**Contexto**: Melhorar `ProposalsListPage.tsx` com filtros mais poderosos.

**Tarefas**:

1. **Criar `AdvancedFilters.tsx`**:
```typescript
// src/modules/governance/components/filters/AdvancedFilters.tsx
interface FilterConfig {
  types: ProposalType[];
  statuses: ProposalStatus[];
  dateRange: { start: Date | null; end: Date | null };
  valueRange: { min: number; max: number };
  proposers: string[];
}

export function AdvancedFilters({ filters, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros Avançados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Filter */}
        <div>
          <Label>Tipo de Proposta</Label>
          <MultiSelect
            options={proposalTypes}
            value={filters.types}
            onChange={(types) => onChange({ ...filters, types })}
          />
        </div>

        {/* Status Filter */}
        <div>
          <Label>Status</Label>
          <MultiSelect
            options={proposalStatuses}
            value={filters.statuses}
            onChange={(statuses) => onChange({ ...filters, statuses })}
          />
        </div>

        {/* Date Range */}
        <div>
          <Label>Período</Label>
          <DateRangePicker
            value={filters.dateRange}
            onChange={(dateRange) => onChange({ ...filters, dateRange })}
          />
        </div>

        {/* Value Range */}
        <div>
          <Label>Valor (BZR)</Label>
          <RangeSlider
            min={0}
            max={10000}
            value={[filters.valueRange.min, filters.valueRange.max]}
            onChange={([min, max]) => onChange({
              ...filters,
              valueRange: { min, max }
            })}
          />
        </div>

        {/* Proposer Filter */}
        <div>
          <Label>Proposer</Label>
          <AddressSearch
            value={filters.proposers}
            onChange={(proposers) => onChange({ ...filters, proposers })}
          />
        </div>

        <Button
          variant="outline"
          onClick={() => onChange(defaultFilters)}
          className="w-full"
        >
          Limpar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}
```

2. **Criar `SearchBar.tsx`**:
```typescript
// src/modules/governance/components/filters/SearchBar.tsx
export function SearchBar({ value, onChange, onSearch }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Search in titles and descriptions
    const results = await governanceApi.searchProposals(query);
    setSuggestions(results.map(r => r.title));
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar propostas..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            handleSearch(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="pl-10"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => onChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50">
          <CardContent className="p-2">
            {suggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  onChange(suggestion);
                  onSearch();
                  setSuggestions([]);
                }}
              >
                {suggestion}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

3. **Criar hook `useProposalFilters.ts`**:
```typescript
// src/modules/governance/hooks/useProposalFilters.ts
export function useProposalFilters(proposals: GovernanceProposal[]) {
  const [filters, setFilters] = useState<FilterConfig>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProposals = useMemo(() => {
    return proposals.filter(proposal => {
      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(proposal.type)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(proposal.status)) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start) {
        const proposalDate = new Date(proposal.createdAt);
        if (proposalDate < filters.dateRange.start) return false;
      }
      if (filters.dateRange.end) {
        const proposalDate = new Date(proposal.createdAt);
        if (proposalDate > filters.dateRange.end) return false;
      }

      // Value range filter
      if (proposal.value) {
        const value = parseFloat(proposal.value);
        if (value < filters.valueRange.min || value > filters.valueRange.max) {
          return false;
        }
      }

      // Proposer filter
      if (filters.proposers.length > 0 && !filters.proposers.includes(proposal.proposer)) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = proposal.title?.toLowerCase().includes(query);
        const matchesDescription = proposal.description?.toLowerCase().includes(query);
        const matchesId = proposal.id.toString().includes(query);

        if (!matchesTitle && !matchesDescription && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [proposals, filters, searchQuery]);

  return {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filteredProposals,
  };
}
```

4. **Atualizar `ProposalsListPage.tsx`**:
```typescript
const { filters, setFilters, searchQuery, setSearchQuery, filteredProposals } =
  useProposalFilters(proposals);

<div className="space-y-6">
  <SearchBar
    value={searchQuery}
    onChange={setSearchQuery}
    onSearch={() => {}}
  />

  <div className="grid md:grid-cols-[300px_1fr] gap-6">
    <AdvancedFilters filters={filters} onChange={setFilters} />

    <div>
      <FilterChips filters={filters} onRemove={removeFilter} />

      <div className="grid gap-4 mt-4">
        {filteredProposals.map(proposal => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            searchQuery={searchQuery} // For highlighting
          />
        ))}
      </div>
    </div>
  </div>
</div>
```

**Validação**:
- [ ] Filtros combinam corretamente (AND logic)
- [ ] Busca funciona em títulos e descrições
- [ ] Highlight de termos encontrados
- [ ] Chips de filtros ativos aparecem
- [ ] Performance OK com muitas propostas

**Duração**: 12h

---

## PROMPT 8 (8h): Integração com Sistema de Temas e Animações

**Objetivo**: Polir visual com animações e garantir compatibilidade com os 6 temas existentes.

**Contexto**: O projeto Bazari possui **6 temas completos** (bazari, night, sandstone, emerald, royal, cyber), não apenas dark/light mode. Todos os componentes de governança devem funcionar perfeitamente em todos os 6 temas.

**Tarefas**:

1. **Criar CSS customizado para governança (compatível com todos os temas)**:
```css
/* src/modules/governance/styles.css */

/*
  IMPORTANTE: NÃO criar variáveis para dark/light
  O projeto usa 6 temas: bazari, night, sandstone, emerald, royal, cyber
  Definidos em: apps/web/src/styles/index.css
*/

/* Usar variáveis de tema existentes */
.governance-card {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
}

.governance-section {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Cores de status específicas de governança (funcionam em todos os temas) */
:root {
  /* Proposal status - HSL format */
  --proposal-active: 217 91% 60%;      /* blue-500 */
  --proposal-passed: 142 71% 45%;      /* green-500 */
  --proposal-rejected: 0 84% 60%;      /* red-500 */
  --proposal-pending: 38 92% 50%;      /* amber-500 */

  /* Chart colors */
  --chart-aye: 142 71% 45%;            /* green-500 */
  --chart-nay: 0 84% 60%;              /* red-500 */
  --chart-abstain: 215 20% 50%;        /* gray-500 */
}

/* Override opcional para tema cyber (neon) */
[data-theme="cyber"] {
  --proposal-active: 189 94% 43%;      /* cyan neon */
  --proposal-passed: 142 100% 50%;     /* green neon */
}

/* Animações */
.proposal-card {
  transition: all 0.2s ease-in-out;
}

.proposal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px hsl(var(--border) / 0.3);
}

/* Skeleton loaders - usa variáveis de tema */
@keyframes skeleton-loading {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.skeleton {
  animation: skeleton-loading 1.5s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0px,
    hsl(var(--border)) 40px,
    hsl(var(--muted)) 80px
  );
  background-size: 200px 100%;
}

/* Ring animation for notifications */
@keyframes ring {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
}

.animate-ring {
  animation: ring 2s ease-in-out infinite;
}
```

2. **Adicionar skeleton loaders**:
```typescript
// src/modules/governance/components/SkeletonLoader.tsx
export function ProposalCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="skeleton h-6 w-3/4 mb-2" />
        <div className="skeleton h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-5/6 mb-2" />
        <div className="skeleton h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return <div className="skeleton h-[300px] w-full rounded-lg" />;
}
```

3. **Adicionar animações com framer-motion**:
```typescript
// Atualizar componentes existentes
import { motion, AnimatePresence } from 'framer-motion';

// ProposalCard.tsx
export function ProposalCard({ proposal }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        {/* ... */}
      </Card>
    </motion.div>
  );
}

// ProposalsListPage.tsx
<AnimatePresence>
  {filteredProposals.map(proposal => (
    <ProposalCard key={proposal.id} proposal={proposal} />
  ))}
</AnimatePresence>
```

4. **Otimizar para mobile**:
```css
/* Responsive styles */
@media (max-width: 768px) {
  .governance-dashboard {
    padding: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 200px;
  }

  .filters-sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    transform: translateY(100%);
    transition: transform 0.3s;
  }

  .filters-sidebar.open {
    transform: translateY(0);
  }
}
```

**Validação**:
- [ ] Todos os 6 temas funcionam sem bugs visuais (bazari, night, sandstone, emerald, royal, cyber)
- [ ] Cores de status de propostas visíveis em todos os temas
- [ ] Animações suaves (60fps)
- [ ] Skeleton loaders aparecem no carregamento e respeitam cores do tema ativo
- [ ] Mobile responsive

**Duração**: 8h

---

## PROMPT 9 (16h): Testes E2E (Playwright)

**Objetivo**: Escrever testes E2E para fluxos críticos.

**Contexto**: Garantir qualidade antes do deploy.

**Tarefas**:

1. **Teste de criação de proposta**:
```typescript
// src/modules/governance/__tests__/e2e/proposal-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test('complete proposal lifecycle', async ({ page }) => {
  // 1. Login
  await page.goto('/auth/unlock');
  await page.fill('[data-testid="pin-input"]', '1234');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/app');

  // 2. Navigate to governance
  await page.goto('/app/governance');
  await expect(page.locator('h1')).toContainText('Governança');

  // 3. Create proposal
  await page.click('button:has-text("Criar Proposta")');
  await page.selectOption('[name="type"]', 'DEMOCRACY');
  await page.fill('[name="title"]', 'E2E Test Proposal');
  await page.fill('[name="description"]', 'This is an E2E test');
  await page.click('button:has-text("Criar Proposta")');

  // 4. Enter PIN
  await page.fill('[data-testid="pin-modal-input"]', '1234');
  await page.click('button:has-text("Confirmar")');

  // 5. Verify proposal created
  await expect(page.locator('.toast')).toContainText('Proposta criada');
  await expect(page).toHaveURL(/\/app\/governance\/proposals\/democracy\/\d+/);

  // 6. Verify proposal details
  await expect(page.locator('h1')).toContainText('E2E Test Proposal');
  await expect(page.locator('p')).toContainText('This is an E2E test');
});
```

2. **Teste de votação**:
```typescript
// src/modules/governance/__tests__/e2e/voting-flow.spec.ts
test('voting flow with conviction', async ({ page }) => {
  await page.goto('/app/governance/proposals/democracy/1');

  // Click vote button
  await page.click('button:has-text("Votar Agora")');

  // Select Aye
  await page.click('label:has-text("Aye (Sim)")');

  // Enter amount
  await page.fill('[name="amount"]', '100');

  // Select conviction
  await page.selectOption('[name="conviction"]', '2');

  // Verify effective voting power
  await expect(page.locator('[data-testid="effective-power"]')).toContainText('200 BZR');

  // Submit
  await page.click('button:has-text("Confirmar Voto")');

  // Enter PIN
  await page.fill('[data-testid="pin-modal-input"]', '1234');
  await page.click('button:has-text("Confirmar")');

  // Verify vote recorded
  await expect(page.locator('.toast')).toContainText('Voto registrado');

  // Verify vote appears in results
  await expect(page.locator('[data-testid="aye-votes"]')).toContainText('200');
});
```

3. **Teste de multisig**:
```typescript
// src/modules/governance/__tests__/e2e/multisig-approval.spec.ts
test('multisig approval workflow', async ({ page }) => {
  await page.goto('/app/governance/multisig');

  // Search for multisig account
  await page.fill('[data-testid="multisig-search"]', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
  await page.click('button:has-text("Buscar")');

  // Verify account info loaded
  await expect(page.locator('[data-testid="signatory-count"]')).toContainText('3');
  await expect(page.locator('[data-testid="threshold"]')).toContainText('2');

  // Approve pending transaction
  await page.click('button:has-text("Aprovar Transação")');

  // Enter PIN
  await page.fill('[data-testid="pin-modal-input"]', '1234');
  await page.click('button:has-text("Confirmar")');

  // Verify approval recorded
  await expect(page.locator('.toast')).toContainText('Transação aprovada');
  await expect(page.locator('[data-testid="approval-progress"]')).toContainText('50%');
});
```

4. **Rodar testes**:
```bash
# Run all governance E2E tests
pnpm exec playwright test src/modules/governance/__tests__/e2e/

# Run with UI
pnpm exec playwright test --ui

# Debug mode
pnpm exec playwright test --debug
```

**Validação**:
- [ ] Todos os testes passam
- [ ] Screenshots salvos para falhas
- [ ] Relatório HTML gerado
- [ ] CI configurado (opcional)

**Duração**: 16h (2 dias)

---

## PROMPT 10 (8h): Documentação e Polimento Final

**Objetivo**: Documentar componentes no Storybook e finalizar.

**Contexto**: Garantir manutenibilidade do código.

**Tarefas**:

1. **Criar stories para componentes principais**:
```typescript
// src/modules/governance/components/dashboard/VotingChart.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { VotingChart } from './VotingChart';

const meta: Meta<typeof VotingChart> = {
  title: 'Governance/Dashboard/VotingChart',
  component: VotingChart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof VotingChart>;

export const BarChart: Story = {
  args: {
    data: [
      { proposalId: 1, ayeVotes: 1000, nayVotes: 500, abstain: 100 },
      { proposalId: 2, ayeVotes: 800, nayVotes: 1200, abstain: 50 },
      { proposalId: 3, ayeVotes: 1500, nayVotes: 300, abstain: 200 },
    ],
    type: 'bar',
  },
};

export const PieChart: Story = {
  args: {
    data: [
      { proposalId: 1, ayeVotes: 1000, nayVotes: 500, abstain: 100 },
    ],
    type: 'pie',
  },
};

export const Empty: Story = {
  args: {
    data: [],
    type: 'bar',
  },
};

export const Loading: Story = {
  args: {
    data: [],
    type: 'bar',
    loading: true,
  },
};
```

2. **Adicionar JSDoc aos componentes**:
```typescript
/**
 * VotingChart - Displays voting data in various chart formats
 *
 * @example
 * ```tsx
 * <VotingChart
 *   data={[
 *     { proposalId: 1, ayeVotes: 1000, nayVotes: 500 }
 *   ]}
 *   type="bar"
 * />
 * ```
 */
export function VotingChart({ data, type }: VotingChartProps) {
  // ...
}
```

3. **Criar README para módulo**:
```markdown
<!-- src/modules/governance/README.md -->
# Governance Module

Sistema de governança on-chain do Bazari.

## Componentes

### Dashboard
- `GovernanceStatsWidget` - Widget de estatísticas
- `VotingChart` - Gráficos de votação
- `EventTimeline` - Timeline de eventos
- `QuickActions` - Ações rápidas

### Multisig
- `MultisigDashboard` - Dashboard completo
- `WorkflowStepper` - Stepper visual
- `ApprovalProgressChart` - Gráfico de progresso

### Notifications
- `NotificationBell` - Sino com badge
- `NotificationPanel` - Painel de notificações

### Filters
- `AdvancedFilters` - Filtros avançados
- `SearchBar` - Busca full-text

## Hooks

- `useGovernanceNotifications` - WebSocket notifications
- `useProposalFilters` - Filtros e busca
- `useVotingData` - Dados de votação

## Usage

```tsx
import { GovernancePage } from '@/modules/governance';

function App() {
  return <GovernancePage />;
}
```

## Testing

```bash
# Unit tests
pnpm test governance

# E2E tests
pnpm exec playwright test governance
```
```

4. **Audit final**:
```bash
# Run all tests
pnpm test
pnpm exec playwright test

# Check types
pnpm tsc --noEmit

# Lint
pnpm lint

# Build
pnpm build

# Analyze bundle
pnpm exec vite-bundle-visualizer
```

**Validação**:
- [ ] Storybook funciona (`pnpm storybook`)
- [ ] Todas as stories documentadas
- [ ] README completo
- [ ] Todos os testes passam
- [ ] Build sem erros
- [ ] Bundle size aceitável

**Duração**: 8h

---

## RESUMO DE EXECUÇÃO

| Prompt | Descrição | Duração | Status |
|--------|-----------|---------|--------|
| 1 | Setup e Dependências | 8h | ⏳ |
| 2 | Dashboard - Widgets e Stats | 8h | ⏳ |
| 3 | Dashboard - Gráficos de Votação | 8h | ⏳ |
| 4 | Timeline de Eventos | 8h | ⏳ |
| 5 | Multi-sig Dashboard Completo | 16h | ⏳ |
| 6 | Notificações em Tempo Real | 12h | ⏳ |
| 7 | Filtros Avançados e Busca | 12h | ⏳ |
| 8 | Melhorias de Tema e Animações | 8h | ⏳ |
| 9 | Testes E2E (Playwright) | 16h | ⏳ |
| 10 | Documentação e Polimento Final | 8h | ⏳ |
| **TOTAL** | | **104h (~13 dias úteis)** | |

**Nota**: A estimativa original era 2 semanas (10 dias úteis), mas com a complexidade dos testes e documentação, recomenda-se **13 dias úteis** para execução completa com qualidade.

**Ordem de execução**: Sequencial (1 → 10)

**Checkpoints críticos**:
- Após PROMPT 5: Validar multi-sig dashboard funcionando
- Após PROMPT 7: Validar filtros e busca performando bem
- Após PROMPT 9: Todos os testes E2E passando

---

**FIM DOS PROMPTS DE EXECUÇÃO FASE 8**
