# FASE 8: Governance UI (Frontend) - Especificação Técnica

**Versão**: 1.0
**Data**: 2025-01-29
**Duração Estimada**: 2 semanas
**Risco**: Médio
**Dependências**: FASE 7 (Governance Blockchain)

---

## 1. VISÃO GERAL

### 1.1 Objetivo

Refinar e aprimorar a interface de usuário (UI) do sistema de governança já implementado na FASE 7, focando em:
- Melhorias de UX/UI e responsividade
- Dashboard de governança mais intuitivo
- Interface multi-sig aprimorada com workflow visual
- Notificações em tempo real para eventos de governança
- Gráficos e visualizações de dados de votação
- Testes E2E completos

### 1.2 Contexto

A FASE 7 implementou a base funcional do sistema de governança com:
- ✅ 7 páginas funcionais (GovernancePage, ProposalsListPage, ProposalDetailPage, TreasuryPage, CouncilPage, MultisigPage, CreateProposalPage)
- ✅ 6 componentes reutilizáveis (VoteModal, ProposalCard, ConvictionSelector, CouncilMemberCard, MultisigApprovalFlow, TreasuryStats)
- ✅ 12 endpoints de API backend
- ✅ Autenticação PIN + useKeyring
- ✅ Traduções pt/en/es

A FASE 8 foca em **melhorias de UX/UI** e **funcionalidades avançadas** para tornar a experiência mais rica e intuitiva.

### 1.3 Escopo

**O que SERÁ feito**:
- ✅ Dashboard de governança aprimorado com widgets interativos
- ✅ Gráficos de votação (Chart.js/Recharts)
- ✅ Timeline de eventos de governança
- ✅ Notificações push para eventos (novo voto, proposta aprovada, etc.)
- ✅ Multi-sig dashboard com workflow visual
- ✅ Filtros avançados e busca full-text
- ✅ Modo dark/light otimizado para páginas de governança
- ✅ Animações e transições suaves
- ✅ Testes E2E (Playwright)
- ✅ Documentação de componentes (Storybook)

**O que NÃO será feito**:
- ❌ Mudanças no backend ou blockchain (já implementado na FASE 7)
- ❌ Novos endpoints de API
- ❌ Novos pallets de governança no runtime

---

## 2. ARQUITETURA

### 2.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 8: UI ENHANCEMENTS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Dashboard Aprimorado                                    │  │
│  │  - Widgets interativos                                   │  │
│  │  - Gráficos de votação (Chart.js)                       │  │
│  │  - Timeline de eventos                                   │  │
│  │  - Quick actions                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Multi-sig Dashboard                                     │  │
│  │  - Workflow visual com stepper                          │  │
│  │  - Gráfico de progresso de aprovações                   │  │
│  │  - Lista de pending transactions                        │  │
│  │  - Histórico de execuções                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Notificações em Tempo Real                             │  │
│  │  - WebSocket connection para eventos                    │  │
│  │  - Toast notifications                                   │  │
│  │  - Badge de contador de notificações                    │  │
│  │  - Histórico de notificações                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Melhorias de UX                                         │  │
│  │  - Filtros avançados com multi-select                   │  │
│  │  - Busca full-text com highlight                        │  │
│  │  - Skeleton loaders                                      │  │
│  │  - Animações de transição                               │  │
│  │  - Temas otimizados (dark/light)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │ Usa implementação existente da FASE 7
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              FASE 7: GOVERNANCE (Já Implementado)               │
├─────────────────────────────────────────────────────────────────┤
│  - 7 páginas funcionais                                         │
│  - 6 componentes reutilizáveis                                  │
│  - 12 endpoints de API                                          │
│  - PIN + useKeyring auth                                        │
│  - Traduções pt/en/es                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes Novos

```typescript
modules/governance/
├── components/
│   ├── dashboard/
│   │   ├── GovernanceStatsWidget.tsx      # Widget de estatísticas
│   │   ├── VotingChart.tsx                # Gráfico de votação (recharts)
│   │   ├── EventTimeline.tsx              # Timeline de eventos
│   │   └── QuickActions.tsx               # Ações rápidas
│   │
│   ├── multisig/
│   │   ├── MultisigDashboard.tsx          # Dashboard multi-sig completo
│   │   ├── ApprovalProgressChart.tsx      # Gráfico circular de progresso
│   │   ├── WorkflowStepper.tsx            # Stepper visual de workflow
│   │   └── TransactionHistory.tsx         # Histórico de transações
│   │
│   ├── notifications/
│   │   ├── NotificationBell.tsx           # Ícone de sino com badge
│   │   ├── NotificationPanel.tsx          # Painel lateral de notificações
│   │   └── NotificationToast.tsx          # Toast customizado
│   │
│   └── filters/
│       ├── AdvancedFilters.tsx            # Filtros avançados
│       ├── SearchBar.tsx                  # Busca full-text
│       └── FilterChips.tsx                # Chips de filtros ativos
│
├── hooks/
│   ├── useGovernanceNotifications.ts      # Hook para notificações WebSocket
│   ├── useProposalFilters.ts              # Hook para filtros avançados
│   └── useVotingData.ts                   # Hook para dados de votação
│
└── utils/
    ├── chartHelpers.ts                     # Helpers para gráficos
    └── notificationHelpers.ts              # Helpers para notificações
```

---

## 3. MELHORIAS DETALHADAS

### 3.1 Dashboard Aprimorado

#### 3.1.1 Widgets Interativos

**GovernanceStatsWidget.tsx**:
```typescript
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

// Features:
// - Animação de contagem numérica
// - Indicador de mudança (+/-) com percentual
// - Hover effects
// - Click para navegar para detalhes
```

**VotingChart.tsx**:
```typescript
interface VotingChartProps {
  data: {
    proposalId: number;
    ayeVotes: number;
    nayVotes: number;
    abstain: number;
  }[];
  type: 'bar' | 'pie' | 'line';
}

// Features:
// - Gráficos interativos com recharts
// - Tooltip com informações detalhadas
// - Legendas personalizadas
// - Responsivo (mobile-friendly)
// - Exportar como imagem
```

#### 3.1.2 Timeline de Eventos

**EventTimeline.tsx**:
```typescript
interface TimelineEvent {
  id: string;
  type: 'proposal' | 'vote' | 'approval' | 'execution';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  proposalId?: number;
}

// Features:
// - Linha do tempo vertical
// - Ícones por tipo de evento
// - Cores por tipo
// - Links para propostas relacionadas
// - Paginação infinita (scroll)
```

### 3.2 Multi-sig Dashboard

#### 3.2.1 Workflow Visual

**WorkflowStepper.tsx**:
```typescript
interface WorkflowStep {
  label: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  timestamp?: string;
  approver?: string;
}

// Features:
// - Stepper horizontal ou vertical
// - Indicadores de status com cores
// - Informações de aprovador e timestamp
// - Animações de transição entre etapas
```

**ApprovalProgressChart.tsx**:
```typescript
interface ApprovalProgress {
  current: number;
  required: number;
  signatories: Array<{
    address: string;
    approved: boolean;
  }>;
}

// Features:
// - Gráfico circular (donut chart)
// - Percentual no centro
// - Lista de signatários com status
// - Cores baseadas em progresso (red → yellow → green)
```

#### 3.2.2 Dashboard Completo

**MultisigDashboard.tsx**:
```typescript
// Seções:
// 1. Header com resumo da conta
// 2. Pending transactions (cards com ações)
// 3. Approval progress charts
// 4. Transaction history table
// 5. Quick actions (create transaction, add signatory)
```

### 3.3 Notificações em Tempo Real

#### 3.3.1 WebSocket Connection

**useGovernanceNotifications.ts**:
```typescript
export function useGovernanceNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:3000/governance/events');

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      handleNewNotification(notification);
    };

    return () => ws.close();
  }, []);

  // Features:
  // - Auto-reconnect on disconnect
  // - Notification filtering by type
  // - Mark as read/unread
  // - Persist in localStorage
}
```

#### 3.3.2 UI Components

**NotificationBell.tsx**:
```typescript
// Features:
// - Badge com contador de não lidas
// - Animação de "shake" para nova notificação
// - Dropdown panel ao clicar
// - Som opcional (configurável)
```

**NotificationPanel.tsx**:
```typescript
// Features:
// - Lista de notificações
// - Filtros por tipo (proposal, vote, approval, etc.)
// - Marcar todas como lidas
// - Limpar histórico
// - Links para propostas relacionadas
```

### 3.4 Filtros Avançados

#### 3.4.1 Componente de Filtros

**AdvancedFilters.tsx**:
```typescript
interface FilterConfig {
  types: ProposalType[];
  statuses: ProposalStatus[];
  dateRange: { start: Date; end: Date };
  valueRange: { min: number; max: number };
  proposers: string[];
}

// Features:
// - Multi-select dropdowns
// - Date range picker
// - Value range slider
// - Address search com autocomplete
// - Reset all filters button
```

#### 3.4.2 Busca Full-text

**SearchBar.tsx**:
```typescript
// Features:
// - Busca em título e descrição
// - Highlight de termos encontrados
// - Sugestões (autocomplete)
// - Histórico de buscas
// - Busca por ID de proposta
```

### 3.5 Melhorias de Tema

#### 3.5.1 Cores Otimizadas

```css
/* Dark Mode - Governance específico */
:root[data-theme="dark"] {
  --governance-bg-primary: #0a0a0f;
  --governance-bg-secondary: #13131a;
  --governance-border: #2a2a35;
  --governance-text: #e0e0e8;

  /* Status colors */
  --proposal-active: #3b82f6;
  --proposal-passed: #10b981;
  --proposal-rejected: #ef4444;

  /* Chart colors */
  --chart-aye: #10b981;
  --chart-nay: #ef4444;
  --chart-abstain: #6b7280;
}

/* Light Mode */
:root[data-theme="light"] {
  --governance-bg-primary: #ffffff;
  --governance-bg-secondary: #f9fafb;
  --governance-border: #e5e7eb;
  --governance-text: #111827;

  /* Mesmo esquema de cores de status */
}
```

#### 3.5.2 Animações

```css
/* Transições suaves */
.proposal-card {
  transition: all 0.2s ease-in-out;
}

.proposal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Skeleton loaders */
@keyframes skeleton-loading {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.skeleton {
  animation: skeleton-loading 1.5s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    #f0f0f0 0px,
    #e0e0e0 40px,
    #f0f0f0 80px
  );
  background-size: 200px 100%;
}
```

---

## 4. INTEGRAÇÃO COM FASE 7

### 4.1 Componentes Existentes (Reutilizar)

| Componente FASE 7 | Uso na FASE 8 |
|-------------------|---------------|
| `VoteModal` | Integrar com notificações |
| `ProposalCard` | Adicionar animações e hover states |
| `ConvictionSelector` | Adicionar tooltip explicativo visual |
| `CouncilMemberCard` | Adicionar avatar e badges |
| `MultisigApprovalFlow` | Integrar com WorkflowStepper |
| `TreasuryStats` | Integrar com VotingChart |

### 4.2 Páginas Existentes (Melhorar)

| Página FASE 7 | Melhorias FASE 8 |
|---------------|------------------|
| `GovernancePage` | Adicionar widgets, gráficos e timeline |
| `ProposalsListPage` | Adicionar filtros avançados e busca |
| `ProposalDetailPage` | Adicionar gráfico de votação e timeline |
| `TreasuryPage` | Adicionar gráficos de gastos |
| `CouncilPage` | Adicionar gráfico de atividade |
| `MultisigPage` | Substituir por MultisigDashboard completo |
| `CreateProposalPage` | Adicionar preview e validação visual |

### 4.3 API Existente (Usar)

Todos os 12 endpoints da FASE 7 serão reutilizados:
- ✅ `/api/governance/stats`
- ✅ `/api/governance/democracy/*`
- ✅ `/api/governance/treasury/*`
- ✅ `/api/governance/council/*`
- ✅ `/api/governance/tech-committee/*`
- ✅ `/api/governance/multisig/*`

**Novos endpoints necessários** (opcional, para notificações):
- `WS /governance/events` - WebSocket para eventos em tempo real

---

## 5. DEPENDÊNCIAS TÉCNICAS

### 5.1 Bibliotecas Novas

```json
{
  "dependencies": {
    "recharts": "^2.10.0",          // Gráficos
    "date-fns": "^2.30.0",          // Manipulação de datas
    "framer-motion": "^10.16.0",    // Animações
    "react-window": "^1.8.10"       // Virtualização de listas
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",  // E2E testing
    "@storybook/react": "^7.6.0"    // Documentação de componentes
  }
}
```

### 5.2 Estrutura de Arquivos

```
apps/web/src/modules/governance/
├── components/
│   ├── dashboard/              # ← NOVO (FASE 8)
│   ├── multisig/              # ← NOVO (FASE 8)
│   ├── notifications/         # ← NOVO (FASE 8)
│   ├── filters/               # ← NOVO (FASE 8)
│   ├── ProposalCard.tsx       # ← Existente (FASE 7)
│   ├── VoteModal.tsx          # ← Existente (FASE 7)
│   ├── ConvictionSelector.tsx # ← Existente (FASE 7)
│   ├── CouncilMemberCard.tsx  # ← Existente (FASE 7)
│   ├── MultisigApprovalFlow.tsx # ← Existente (FASE 7)
│   └── TreasuryStats.tsx      # ← Existente (FASE 7)
│
├── hooks/                      # ← NOVO (FASE 8)
│   ├── useGovernanceNotifications.ts
│   ├── useProposalFilters.ts
│   └── useVotingData.ts
│
├── utils/                      # ← NOVO (FASE 8)
│   ├── chartHelpers.ts
│   └── notificationHelpers.ts
│
├── pages/                      # ← Existente (FASE 7) - será melhorado
│   ├── GovernancePage.tsx
│   ├── ProposalsListPage.tsx
│   ├── ProposalDetailPage.tsx
│   ├── TreasuryPage.tsx
│   ├── CouncilPage.tsx
│   ├── MultisigPage.tsx
│   └── CreateProposalPage.tsx
│
├── api/                        # ← Existente (FASE 7) - reutilizar
│   └── index.ts
│
├── types/                      # ← Existente (FASE 7) - estender
│   └── index.ts
│
└── __tests__/                  # ← NOVO (FASE 8)
    ├── e2e/
    │   ├── proposal-lifecycle.spec.ts
    │   ├── voting-flow.spec.ts
    │   └── multisig-approval.spec.ts
    └── components/
        ├── VotingChart.test.tsx
        └── NotificationPanel.test.tsx
```

---

## 6. TESTES

### 6.1 Testes E2E (Playwright)

```typescript
// apps/web/src/modules/governance/__tests__/e2e/proposal-lifecycle.spec.ts

test('complete proposal lifecycle', async ({ page }) => {
  // 1. Login
  await page.goto('/auth/unlock');
  await page.fill('[name="pin"]', '1234');
  await page.click('button[type="submit"]');

  // 2. Navigate to governance
  await page.goto('/app/governance');
  await expect(page.locator('h1')).toContainText('Governança');

  // 3. Create proposal
  await page.click('text=Criar Proposta');
  await page.selectOption('[name="type"]', 'DEMOCRACY');
  await page.fill('[name="title"]', 'Test Proposal');
  await page.fill('[name="description"]', 'Test Description');
  await page.click('button:has-text("Criar Proposta")');

  // 4. Enter PIN
  await page.fill('[data-testid="pin-input"]', '1234');
  await page.click('button:has-text("Confirmar")');

  // 5. Verify proposal created
  await expect(page.locator('.toast')).toContainText('Proposta criada');

  // 6. Navigate to proposal
  await page.click('text=Test Proposal');

  // 7. Vote on proposal
  await page.click('button:has-text("Votar Agora")');
  await page.click('label:has-text("Aye (Sim)")');
  await page.fill('[name="amount"]', '100');
  await page.selectOption('[name="conviction"]', '1');
  await page.click('button:has-text("Confirmar Voto")');

  // 8. Enter PIN again
  await page.fill('[data-testid="pin-input"]', '1234');
  await page.click('button:has-text("Confirmar")');

  // 9. Verify vote recorded
  await expect(page.locator('.toast')).toContainText('Voto registrado');
});
```

### 6.2 Testes de Componente (Jest + React Testing Library)

```typescript
// apps/web/src/modules/governance/__tests__/components/VotingChart.test.tsx

describe('VotingChart', () => {
  const mockData = [
    { proposalId: 1, ayeVotes: 1000, nayVotes: 500, abstain: 100 },
    { proposalId: 2, ayeVotes: 800, nayVotes: 1200, abstain: 50 },
  ];

  it('renders bar chart correctly', () => {
    render(<VotingChart data={mockData} type="bar" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(<VotingChart data={mockData} type="bar" />);
    const bar = screen.getByTestId('vote-bar-1');
    await userEvent.hover(bar);
    expect(screen.getByText(/Proposal #1/)).toBeInTheDocument();
  });

  it('switches chart type', async () => {
    const { rerender } = render(<VotingChart data={mockData} type="bar" />);
    rerender(<VotingChart data={mockData} type="pie" />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });
});
```

### 6.3 Storybook

```typescript
// apps/web/src/modules/governance/components/dashboard/VotingChart.stories.tsx

export default {
  title: 'Governance/Dashboard/VotingChart',
  component: VotingChart,
} as Meta;

export const BarChart: Story = {
  args: {
    data: [
      { proposalId: 1, ayeVotes: 1000, nayVotes: 500, abstain: 100 },
      { proposalId: 2, ayeVotes: 800, nayVotes: 1200, abstain: 50 },
    ],
    type: 'bar',
  },
};

export const PieChart: Story = {
  args: {
    data: [{ proposalId: 1, ayeVotes: 1000, nayVotes: 500, abstain: 100 }],
    type: 'pie',
  },
};

export const Empty: Story = {
  args: {
    data: [],
    type: 'bar',
  },
};
```

---

## 7. CRONOGRAMA

| Semana | Tarefas | Entregáveis |
|--------|---------|-------------|
| **Semana 1** | | |
| Dias 1-2 | Setup (dependências, estrutura) | ✅ recharts, framer-motion instalados |
| Dias 3-4 | Dashboard widgets e gráficos | ✅ GovernanceStatsWidget, VotingChart |
| Dia 5 | Timeline de eventos | ✅ EventTimeline component |
| **Semana 2** | | |
| Dias 1-2 | Multi-sig dashboard | ✅ MultisigDashboard, WorkflowStepper |
| Dias 3-4 | Notificações e filtros | ✅ NotificationPanel, AdvancedFilters |
| Dia 5 | Testes E2E e documentação | ✅ Playwright tests, Storybook |

---

## 8. MÉTRICAS DE SUCESSO

### 8.1 Qualidade de Código

- ✅ 100% dos componentes novos com TypeScript strict
- ✅ 80%+ de cobertura de testes
- ✅ Zero erros ESLint
- ✅ Todas as páginas passam no Lighthouse (90+ score)

### 8.2 Performance

- ✅ Tempo de carregamento inicial < 2s
- ✅ Tempo de renderização de gráficos < 500ms
- ✅ Smooth animations (60fps)
- ✅ Bundle size < 500KB (governance module)

### 8.3 UX

- ✅ Mobile responsive (testado em 3 devices)
- ✅ Dark/light mode sem bugs visuais
- ✅ Todos os fluxos testados em E2E
- ✅ Documentação Storybook completa

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Performance de gráficos em mobile | Média | Alto | Usar virtualização, lazy loading |
| WebSocket desconecta frequentemente | Média | Médio | Implementar auto-reconnect com exponential backoff |
| Animações causam lag | Baixa | Médio | Usar CSS transforms, testar em devices lentos |
| Bundle size aumenta muito | Média | Baixo | Code splitting, tree shaking, análise de bundle |

---

## 10. REFERÊNCIAS

- **FASE 7 Docs**: `/root/bazari/docs/fase002-final/governance/`
- **Implementação FASE 7**: `/root/bazari/apps/web/src/modules/governance/`
- **Recharts Docs**: https://recharts.org/
- **Framer Motion**: https://www.framer.com/motion/
- **Playwright**: https://playwright.dev/
- **Storybook**: https://storybook.js.org/

---

**Última Atualização**: 2025-01-29
**Autor**: Bazari Team
**Status**: 📝 Especificação Completa
