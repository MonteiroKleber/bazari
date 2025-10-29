# FASE 8: Governance UI (Frontend)

**Status**: 📝 Planejamento Completo
**Data**: 29 de Janeiro de 2025
**Duração Estimada**: 13 dias úteis (2 semanas)
**Risco**: Médio
**Progresso**: 0% (0/10 prompts executados)

---

## 🎯 Objetivo

Refinar e aprimorar a interface de usuário (UI) do sistema de governança já implementado na FASE 7, focando em:
- ✅ Melhorias de UX/UI e responsividade
- ✅ Dashboard de governança mais intuitivo
- ✅ Interface multi-sig aprimorada com workflow visual
- ✅ Notificações em tempo real para eventos de governança
- ✅ Gráficos e visualizações de dados de votação
- ✅ Testes E2E completos

---

## 📦 O Que Será Implementado

### 1. Dashboard Aprimorado
- ✅ **GovernanceStatsWidget**: Widgets interativos com animações
- ✅ **VotingChart**: Gráficos de votação com recharts (bar/pie/line)
- ✅ **EventTimeline**: Timeline visual de eventos de governança
- ✅ **QuickActions**: Ações rápidas para tarefas comuns

### 2. Multi-sig Dashboard
- ✅ **WorkflowStepper**: Stepper visual para workflow de aprovações
- ✅ **ApprovalProgressChart**: Gráfico circular de progresso
- ✅ **TransactionHistory**: Histórico de transações multisig
- ✅ **MultisigDashboard**: Dashboard completo substituindo página simples

### 3. Notificações em Tempo Real
- ✅ **NotificationBell**: Sino com badge de contador
- ✅ **NotificationPanel**: Painel lateral de notificações
- ✅ **WebSocket Integration**: Conexão em tempo real com backend
- ✅ **Toast Notifications**: Notificações toast customizadas

### 4. Filtros Avançados
- ✅ **AdvancedFilters**: Multi-select para tipos, status, datas, valores
- ✅ **SearchBar**: Busca full-text com autocomplete
- ✅ **FilterChips**: Chips de filtros ativos
- ✅ **useProposalFilters**: Hook para gerenciar filtros

### 5. Melhorias de Tema
- ✅ **Cores otimizadas**: Dark/light mode refinado
- ✅ **Animações suaves**: Transições com framer-motion
- ✅ **Skeleton loaders**: Loading states visuais
- ✅ **Mobile optimization**: Responsivo em todos os devices

### 6. Testes E2E
- ✅ **Playwright tests**: Testes end-to-end completos
- ✅ **Component tests**: Testes unitários de componentes
- ✅ **Storybook**: Documentação visual de componentes

---

## 🏗️ Arquitetura

```
FASE 8: UI ENHANCEMENTS
│
├── Dashboard Aprimorado
│   ├── GovernanceStatsWidget    # Widgets com animações
│   ├── VotingChart              # Gráficos interativos
│   ├── EventTimeline            # Timeline de eventos
│   └── QuickActions             # Ações rápidas
│
├── Multi-sig Dashboard
│   ├── MultisigDashboard        # Dashboard completo
│   ├── WorkflowStepper          # Stepper visual
│   ├── ApprovalProgressChart    # Gráfico de progresso
│   └── TransactionHistory       # Histórico
│
├── Notificações
│   ├── NotificationBell         # Sino com badge
│   ├── NotificationPanel        # Painel de notificações
│   ├── useGovernanceNotifications # Hook WebSocket
│   └── NotificationToast        # Toast customizado
│
├── Filtros e Busca
│   ├── AdvancedFilters          # Filtros avançados
│   ├── SearchBar                # Busca full-text
│   ├── FilterChips              # Chips ativos
│   └── useProposalFilters       # Hook de filtros
│
└── Testes e Docs
    ├── E2E Tests (Playwright)   # Testes end-to-end
    ├── Component Tests (Jest)   # Testes unitários
    └── Storybook                # Documentação visual
```

### Integração com FASE 7

A FASE 8 **NÃO modifica** o backend ou blockchain, apenas **melhora** a UI existente:

```
┌─────────────────────────────────────────────────────┐
│  FASE 8: UI Enhancements (Nova)                    │
│  - Dashboard widgets                                │
│  - Gráficos interativos                             │
│  - Notificações WebSocket                           │
│  - Filtros avançados                                │
│  - Multi-sig dashboard visual                       │
│  - Testes E2E                                       │
└─────────────────┬───────────────────────────────────┘
                  │ Usa e melhora
┌─────────────────▼───────────────────────────────────┐
│  FASE 7: Governance Base (Já Implementado)         │
│  - 7 páginas funcionais                             │
│  - 6 componentes reutilizáveis                      │
│  - 12 endpoints de API                              │
│  - PIN + useKeyring auth                            │
│  - Traduções pt/en/es                               │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos

```
apps/web/src/modules/governance/
├── components/
│   ├── dashboard/                    # ← NOVO (FASE 8)
│   │   ├── GovernanceStatsWidget.tsx
│   │   ├── VotingChart.tsx
│   │   ├── EventTimeline.tsx
│   │   └── QuickActions.tsx
│   │
│   ├── multisig/                     # ← NOVO (FASE 8)
│   │   ├── MultisigDashboard.tsx
│   │   ├── WorkflowStepper.tsx
│   │   ├── ApprovalProgressChart.tsx
│   │   └── TransactionHistory.tsx
│   │
│   ├── notifications/                # ← NOVO (FASE 8)
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationPanel.tsx
│   │   └── NotificationToast.tsx
│   │
│   ├── filters/                      # ← NOVO (FASE 8)
│   │   ├── AdvancedFilters.tsx
│   │   ├── SearchBar.tsx
│   │   └── FilterChips.tsx
│   │
│   ├── ProposalCard.tsx              # ← Existente (FASE 7) - melhorado
│   ├── VoteModal.tsx                 # ← Existente (FASE 7)
│   ├── ConvictionSelector.tsx        # ← Existente (FASE 7)
│   ├── CouncilMemberCard.tsx         # ← Existente (FASE 7)
│   ├── MultisigApprovalFlow.tsx      # ← Existente (FASE 7)
│   └── TreasuryStats.tsx             # ← Existente (FASE 7)
│
├── hooks/                            # ← NOVO (FASE 8)
│   ├── useGovernanceNotifications.ts
│   ├── useProposalFilters.ts
│   └── useVotingData.ts
│
├── utils/                            # ← NOVO (FASE 8)
│   ├── chartHelpers.ts
│   └── notificationHelpers.ts
│
├── __tests__/                        # ← NOVO (FASE 8)
│   ├── e2e/
│   │   ├── proposal-lifecycle.spec.ts
│   │   ├── voting-flow.spec.ts
│   │   └── multisig-approval.spec.ts
│   └── components/
│       ├── VotingChart.test.tsx
│       └── NotificationPanel.test.tsx
│
├── pages/                            # ← Existente (FASE 7) - melhorado
│   ├── GovernancePage.tsx            # + Widgets + Timeline
│   ├── ProposalsListPage.tsx         # + Filtros + Busca
│   ├── ProposalDetailPage.tsx        # + Gráfico de votação
│   ├── TreasuryPage.tsx              # + Gráficos de gastos
│   ├── CouncilPage.tsx               # + Gráfico de atividade
│   ├── MultisigPage.tsx              # → MultisigDashboard
│   └── CreateProposalPage.tsx        # + Preview visual
│
├── api/                              # ← Existente (FASE 7) - reutilizar
│   └── index.ts
│
├── types/                            # ← Existente (FASE 7) - estender
│   └── index.ts
│
├── styles.css                        # ← NOVO (FASE 8)
└── README.md                         # ← NOVO (FASE 8)
```

---

## 🔄 Dependências Técnicas

### Bibliotecas Novas

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

### Já Existem (FASE 7)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@radix-ui/react-*": "^1.0.0",  // shadcn/ui components
    "lucide-react": "^0.300.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 📋 Prompts de Execução

A FASE 8 está dividida em **10 prompts sequenciais**:

| # | Descrição | Duração | Entregáveis |
|---|-----------|---------|-------------|
| 1 | Setup e Dependências | 8h | Estrutura + libs instaladas |
| 2 | Dashboard - Widgets e Stats | 8h | GovernanceStatsWidget, QuickActions |
| 3 | Dashboard - Gráficos de Votação | 8h | VotingChart, useVotingData |
| 4 | Timeline de Eventos | 8h | EventTimeline |
| 5 | Multi-sig Dashboard Completo | 16h | MultisigDashboard, WorkflowStepper |
| 6 | Notificações em Tempo Real | 12h | NotificationBell, WebSocket |
| 7 | Filtros Avançados e Busca | 12h | AdvancedFilters, SearchBar |
| 8 | Melhorias de Tema e Animações | 8h | CSS + framer-motion |
| 9 | Testes E2E (Playwright) | 16h | Testes completos |
| 10 | Documentação e Polimento Final | 8h | Storybook + README |
| **TOTAL** | | **104h (13 dias)** | |

**Ver detalhes**: [spec/FASE-08-PROMPT.md](./spec/FASE-08-PROMPT.md)

---

## ✅ Critérios de Sucesso

### Qualidade de Código

- [ ] 100% dos componentes novos com TypeScript strict
- [ ] 80%+ de cobertura de testes
- [ ] Zero erros ESLint
- [ ] Lighthouse score 90+ em todas as páginas

### Performance

- [ ] Tempo de carregamento inicial < 2s
- [ ] Tempo de renderização de gráficos < 500ms
- [ ] Animações a 60fps
- [ ] Bundle size do módulo governance < 500KB

### UX/UI

- [ ] Mobile responsive (testado em 3+ devices)
- [ ] Dark/light mode sem bugs visuais
- [ ] Todos os fluxos testados em E2E
- [ ] Documentação Storybook completa

### Funcionalidades

- [ ] Dashboard com widgets interativos
- [ ] Gráficos de votação funcionando
- [ ] Timeline de eventos atualiza em tempo real
- [ ] Notificações WebSocket conectam e reconectam
- [ ] Filtros avançados combinam corretamente
- [ ] Busca full-text com highlight
- [ ] Multi-sig dashboard visual completo
- [ ] Todos os testes E2E passando

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Performance de gráficos em mobile | Média | Alto | Usar virtualização, lazy loading |
| WebSocket desconecta frequentemente | Média | Médio | Implementar auto-reconnect com exponential backoff |
| Animações causam lag | Baixa | Médio | Usar CSS transforms, testar em devices lentos |
| Bundle size aumenta muito | Média | Baixo | Code splitting, tree shaking, análise de bundle |
| Testes E2E flaky | Média | Alto | Usar retry strategy, aumentar timeouts, fixtures |

---

## 📊 Métricas de Acompanhamento

### Durante o Desenvolvimento

- **Cobertura de testes**: Mínimo 80%
- **Bundle size**: Alertar se > 500KB
- **Lighthouse score**: Mínimo 90
- **ESLint errors**: Zero

### Após Conclusão

- **Tempo de carregamento médio**: < 2s
- **Taxa de erro**: < 1%
- **Satisfação do usuário**: Feedback qualitativo
- **Uso de features**: Analytics de uso de filtros/notificações

---

## 🔗 Referências

- **Especificação Técnica**: [spec/FASE-08-GOVERNANCE-UI.md](./spec/FASE-08-GOVERNANCE-UI.md)
- **Prompts de Execução**: [spec/FASE-08-PROMPT.md](./spec/FASE-08-PROMPT.md)
- **FASE 7 (Base)**: [../governance/GOVERNANCE-README.md](../governance/GOVERNANCE-README.md)
- **Código Existente**: `/root/bazari/apps/web/src/modules/governance/`

### Bibliotecas

- **Recharts**: https://recharts.org/
- **Framer Motion**: https://www.framer.com/motion/
- **Playwright**: https://playwright.dev/
- **Storybook**: https://storybook.js.org/
- **shadcn/ui**: https://ui.shadcn.com/

---

## 🎨 Design System

A FASE 8 segue o design system já estabelecido no projeto:

### Sistema de Temas

O Bazari possui **6 temas completos** implementados:
- **bazari** (vinho) - tema padrão
- **night** (escuro)
- **sandstone** (claro/papel)
- **emerald** (verde)
- **royal** (roxo/azul)
- **cyber** (neon)

Cada tema define todas as variáveis CSS necessárias em [apps/web/src/styles/index.css](../../apps/web/src/styles/index.css):
```
--background, --foreground, --card, --card-foreground
--primary, --primary-foreground, --secondary, --accent
--muted, --border, --input, --ring
```

### Cores Específicas de Governança

A FASE 8 adiciona cores de status que funcionam em **todos os 6 temas**:

```css
/* Cores de status de propostas (HSL format) */
:root {
  --proposal-active: 217 91% 60%;      /* blue-500 */
  --proposal-passed: 142 71% 45%;      /* green-500 */
  --proposal-rejected: 0 84% 60%;      /* red-500 */
  --proposal-pending: 38 92% 50%;      /* amber-500 */

  --chart-aye: 142 71% 45%;            /* green */
  --chart-nay: 0 84% 60%;              /* red */
  --chart-abstain: 215 20% 50%;        /* gray */
}
```

**Uso das variáveis de tema**:
```tsx
<Card className="bg-card text-card-foreground border-border">
  <Badge className="bg-primary text-primary-foreground">
    Active
  </Badge>
</Card>
```

### Tipografia

- **Títulos**: font-family: Inter, font-weight: 700
- **Corpo**: font-family: Inter, font-weight: 400
- **Mono**: font-family: 'Fira Code', monospace

### Espaçamento

- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)

### Componentes Base

Todos os componentes usam **shadcn/ui** como base:
- Card
- Button
- Input
- Select
- Tabs
- Dialog
- Popover
- Badge
- Skeleton

---

## 📝 Notas de Implementação

### Manter Consistência

- ✅ Seguir padrões de nomenclatura existentes
- ✅ Usar componentes shadcn/ui quando disponíveis
- ✅ Manter estrutura de pastas organizada
- ✅ Comentar código complexo
- ✅ Adicionar JSDoc para funções públicas

### Não Modificar

- ❌ Backend ou endpoints de API (FASE 7)
- ❌ Blockchain ou runtime (FASE 7)
- ❌ Autenticação PIN + useKeyring (FASE 7)
- ❌ Traduções existentes (só adicionar novas)

### Priorizar

- 🔥 Performance (lazy loading, virtualização)
- 🔥 Acessibilidade (ARIA labels, keyboard navigation)
- 🔥 Mobile-first (responsive design)
- 🔥 Type safety (TypeScript strict)

---

## 🚀 Próximos Passos

Após completar a FASE 8:

1. **FASE 9**: Backend optimizations & caching
2. **FASE 10**: Mobile app (React Native)
3. **FASE 11**: Analytics & monitoring

---

## 👥 Time

- **Frontend Lead**: TBD
- **QA/Tester**: TBD
- **Designer**: TBD (review de UX/UI)

---

## 📅 Timeline

```
Semana 1
├─ Dia 1-2: Setup + Dashboard widgets
├─ Dia 3-4: Gráficos de votação
└─ Dia 5: Timeline de eventos

Semana 2
├─ Dia 1-2: Multi-sig dashboard
├─ Dia 3-4: Notificações + Filtros
└─ Dia 5: Testes E2E

Semana 3 (buffer)
└─ Dia 1-3: Polimento + Documentação
```

---

**Status**: 📝 Documentação Completa - Pronto para Execução
**Última Atualização**: 2025-01-29
**Versão**: 1.0.0
