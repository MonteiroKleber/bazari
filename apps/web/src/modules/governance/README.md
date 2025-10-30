# Governance Module

Sistema de governança on-chain do Bazari, permitindo que usuários participem de decisões da plataforma através de propostas, votações e multi-sig wallets.

## 📁 Estrutura

```
governance/
├── api/              # Integração com backend
├── components/       # Componentes React
│   ├── dashboard/    # Widgets e gráficos
│   ├── multisig/     # Multi-sig interface
│   ├── notifications/# Sistema de notificações
│   ├── filters/      # Filtros e busca
│   └── SkeletonLoader.tsx
├── hooks/            # React hooks customizados
├── pages/            # Páginas principais
├── types/            # TypeScript types
├── styles.css        # Estilos do módulo
└── __tests__/        # Testes E2E
```

## 🎯 Funcionalidades

### 1. Dashboard de Governança
- **Widgets de Estatísticas**: Treasury balance, referendums ativos, membros do council
- **Gráficos de Votação**: Visualização de votos (Aye/Nay/Abstain)
- **Timeline de Eventos**: Histórico de ações importantes
- **Ações Rápidas**: Acesso rápido às funcionalidades principais

### 2. Sistema de Propostas
- **Criação de Propostas**: Treasury, Democracy, Council
- **Votação**: Sistema de conviction voting para Democracy
- **Filtros Avançados**: Por tipo, status, data
- **Busca Full-text**: Busca por título e descrição

### 3. Multi-sig Dashboard
- **Busca de Contas**: Encontrar contas multi-sig
- **Transações Pendentes**: Visualizar e aprovar transações
- **Workflow Stepper**: Visualização do fluxo de aprovação
- **Progress Charts**: Gráfico de progresso de aprovações

### 4. Notificações em Tempo Real
- **WebSocket**: Notificações instantâneas
- **Bell Icon**: Badge com contador de não lidas
- **Painel**: Lista completa de notificações
- **Filtros**: Por tipo e status

### 5. Council & Tech Committee
- **Membros**: Visualização de membros ativos
- **Propostas**: Propostas específicas do council
- **Votação**: Sistema de votação para membros
- **Eleições**: Interface para eleições

## 🎨 Componentes Principais

### Dashboard

#### `GovernanceStatsWidget`
Widget de estatísticas do sistema de governança.

```tsx
import { GovernanceStatsWidget } from '@/modules/governance';

<GovernanceStatsWidget
  title="Treasury Balance"
  value="1,234,567 BZR"
  change={+5.2}
  icon={<Wallet />}
/>
```

#### `VotingChart`
Gráficos de votação (bar/pie chart).

```tsx
import { VotingChart } from '@/modules/governance';

<VotingChart
  data={[
    { proposalId: 1, ayeVotes: 1000, nayVotes: 500, abstain: 100 }
  ]}
  type="bar"
/>
```

#### `EventTimeline`
Timeline de eventos de governança.

```tsx
import { EventTimeline } from '@/modules/governance';

<EventTimeline
  events={[
    {
      id: '1',
      type: 'proposal_created',
      timestamp: new Date(),
      user: '5GrwvaEF...',
      data: { proposalId: 42 }
    }
  ]}
/>
```

### Multi-sig

#### `MultisigDashboard`
Dashboard completo para contas multi-sig.

```tsx
import { MultisigDashboard } from '@/modules/governance';

<MultisigDashboard />
```

#### `WorkflowStepper`
Visualização do fluxo de aprovação.

```tsx
import { WorkflowStepper } from '@/modules/governance';

<WorkflowStepper
  currentStep={2}
  steps={['Created', 'Approved (1/3)', 'Approved (2/3)', 'Executed']}
/>
```

### Notifications

#### `NotificationBell`
Sino de notificações com badge.

```tsx
import { NotificationBell } from '@/modules/governance';

<NotificationBell
  unreadCount={5}
  notifications={notifications}
  onMarkAsRead={handleMarkAsRead}
/>
```

#### `NotificationPanel`
Painel completo de notificações.

```tsx
import { NotificationPanel } from '@/modules/governance';

<NotificationPanel
  notifications={notifications}
  onMarkAsRead={handleMarkAsRead}
  onMarkAllAsRead={handleMarkAllAsRead}
  onRemove={handleRemove}
/>
```

### Filters

#### `AdvancedFilters`
Sistema de filtros avançados.

```tsx
import { AdvancedFilters } from '@/modules/governance';

<AdvancedFilters
  filters={filters}
  onChange={handleFiltersChange}
  onClear={handleClearFilters}
/>
```

#### `SearchBar`
Barra de busca com debounce.

```tsx
import { SearchBar } from '@/modules/governance';

<SearchBar
  value={searchTerm}
  onChange={handleSearch}
  placeholder="Buscar propostas..."
/>
```

### Skeleton Loaders

Componentes de loading state que respeitam o tema ativo:

```tsx
import {
  ProposalCardSkeleton,
  StatsGridSkeleton,
  GovernancePageSkeleton
} from '@/modules/governance';

// Loading de cards individuais
<ProposalCardSkeleton />

// Loading do grid de estatísticas
<StatsGridSkeleton count={4} />

// Loading da página completa
<GovernancePageSkeleton />
```

## 🪝 Hooks

### `useGovernanceNotifications`
Hook para notificações em tempo real via WebSocket.

```tsx
import { useGovernanceNotifications } from '@/modules/governance';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    status,
    markAsRead,
    markAllAsRead,
    remove,
    clearAll
  } = useGovernanceNotifications({
    wsUrl: 'ws://localhost:3000/governance/events',
    autoConnect: true,
    showToasts: true
  });

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      <p>Status: {status}</p>
      {notifications.map(n => (
        <div key={n.id}>
          {n.title}
          <button onClick={() => markAsRead(n.id)}>Mark as read</button>
        </div>
      ))}
    </div>
  );
}
```

### `useProposalFilters`
Hook para gerenciar filtros e busca de propostas.

```tsx
import { useProposalFilters } from '@/modules/governance';

function ProposalsList() {
  const {
    filters,
    setFilter,
    clearFilters,
    filteredProposals
  } = useProposalFilters(proposals);

  return (
    <div>
      <button onClick={() => setFilter('status', 'active')}>
        Show Active
      </button>
      <button onClick={clearFilters}>Clear</button>
      {filteredProposals.map(p => <ProposalCard key={p.id} {...p} />)}
    </div>
  );
}
```

### `useVotingData`
Hook para carregar e processar dados de votação.

```tsx
import { useVotingData } from '@/modules/governance';

function VotingStats() {
  const { data, loading, error } = useVotingData(proposalId);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <div>
      <p>Aye: {data.aye}</p>
      <p>Nay: {data.nay}</p>
      <p>Turnout: {data.turnout}%</p>
    </div>
  );
}
```

## 🎨 Temas

O módulo de governança suporta os 6 temas do Bazari:
- `bazari` (padrão)
- `night` (escuro)
- `sandstone` (bege/terra)
- `emerald` (verde)
- `royal` (roxo/dourado)
- `cyber` (neon/tech)

Todos os componentes usam CSS variables do sistema de temas:

```css
/* Proposal status colors */
--proposal-active: 217 91% 60%;      /* blue-500 */
--proposal-passed: 142 71% 45%;      /* green-500 */
--proposal-rejected: 0 84% 60%;      /* red-500 */
--proposal-pending: 38 92% 50%;      /* amber-500 */

/* Theme overrides (cyber) */
[data-theme="cyber"] {
  --proposal-active: 189 94% 43%;    /* cyan neon */
  --proposal-passed: 142 100% 50%;   /* green neon */
}
```

## 🧪 Testes

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run governance tests only
pnpm test governance

# Watch mode
pnpm test:watch
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests
pnpm exec playwright test

# Run governance E2E tests only
pnpm exec playwright test governance

# Run with UI
pnpm exec playwright test --ui

# Debug mode
pnpm exec playwright test --debug

# Run specific test file
pnpm exec playwright test proposal-lifecycle.spec.ts
```

### Test Coverage
```bash
# Generate coverage report
pnpm test --coverage

# View report
open coverage/index.html
```

## 📦 Build

```bash
# Development
pnpm dev

# Type check
pnpm exec tsc --noEmit

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 🔌 API Integration

O módulo se integra com o backend através de:

### REST API
- `GET /governance/stats` - Estatísticas gerais
- `GET /governance/treasury/proposals` - Propostas do treasury
- `GET /governance/democracy/referendums` - Referendums
- `GET /governance/council/members` - Membros do council
- `GET /governance/multisig/:address` - Dados de conta multisig

### WebSocket
- `ws://[API_URL]/governance/events` - Eventos em tempo real

### Polkadot API
Integração direta com a blockchain via `@polkadot/api`:
- Votação em propostas
- Criação de propostas
- Aprovação de multisig
- Consulta de dados on-chain

## 🚀 Uso

### Integrar no App

```tsx
// src/App.tsx
import { GovernancePage } from '@/modules/governance';

function App() {
  return (
    <Routes>
      <Route path="/app/governance/*" element={<GovernancePage />} />
    </Routes>
  );
}
```

### Quick Actions no Dashboard

```tsx
// src/components/dashboard/QuickActionsGrid.tsx
import { Vote } from 'lucide-react';

const QUICK_ACTIONS = [
  // ... outras ações
  {
    icon: <Vote className="h-6 w-6" />,
    label: 'Governança',
    to: '/app/governance',
    description: 'Propostas e votações',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
];
```

## 🎯 Rotas

- `/app/governance` - Dashboard principal
- `/app/governance/proposals` - Lista de propostas
- `/app/governance/proposals/:type/:id` - Detalhes de proposta
- `/app/governance/council` - Página do council
- `/app/governance/treasury` - Página do treasury
- `/app/governance/multisig` - Dashboard multisig

## ⚙️ Configuração

### Environment Variables

```env
# Backend API URL
VITE_API_URL=https://api.bazari.libervia.xyz

# WebSocket URL (auto-detected from VITE_API_URL)
# VITE_WS_URL=wss://api.bazari.libervia.xyz
```

### NGINX Configuration

```nginx
# Governance API routes
location ~ ^/governance/(treasury|democracy|council|tech-committee|stats|multisig|events) {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# React SPA routes
location /app/governance {
    try_files $uri $uri/ /index.html;
}
```

## 📝 TODO / Roadmap

- [ ] Implementar backend do WebSocket (`/governance/events`)
- [ ] Adicionar suporte a Storybook
- [ ] Implementar cached queries com React Query
- [ ] Adicionar infinite scroll para propostas
- [ ] Implementar notificações push (PWA)
- [ ] Adicionar GraphQL como alternativa ao REST
- [ ] Implementar export de dados (CSV/PDF)
- [ ] Adicionar analytics de votação

## 🐛 Troubleshooting

### WebSocket não conecta

O WebSocket backend ainda não está implementado. Por enquanto, as notificações funcionam apenas via localStorage. Para desabilitar erros no console:

```tsx
useGovernanceNotifications({
  autoConnect: false, // Disable WebSocket
});
```

### Propostas não carregam

Verifique se o backend está rodando e se o NGINX está configurado corretamente:

```bash
# Test API endpoint
curl https://bazari.libervia.xyz/governance/stats

# Check NGINX config
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

### Tema não aplica

Verifique se o tema está sendo definido corretamente no HTML:

```html
<html data-theme="bazari">
```

E que o CSS do governance foi importado:

```tsx
// src/modules/governance/index.ts
import './styles.css';
```

## 📚 Referências

- [Polkadot.js API](https://polkadot.js.org/docs/api/)
- [Substrate Governance](https://docs.substrate.io/learn/governance/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)

## 🤝 Contribuindo

1. Siga o padrão de código existente
2. Adicione testes para novas funcionalidades
3. Atualize a documentação
4. Execute os testes antes de commit:
   ```bash
   pnpm test && pnpm exec playwright test
   ```

## 📄 Licença

Propriedade do Bazari Platform.
