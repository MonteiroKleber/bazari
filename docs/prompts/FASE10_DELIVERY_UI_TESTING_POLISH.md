# FASE 10 - TESTING E POLISH FINAL

## 🎯 OBJETIVO

Realizar testes completos do sistema de entregas e aplicar ajustes finais:
1. Testes end-to-end de todos os fluxos
2. Validação de tipos TypeScript
3. Testes de responsividade
4. Performance e otimizações
5. Documentação final

**Tempo estimado:** 2-3 horas

---

## 📋 CHECKLIST DE TESTES

### ✅ FLUXO 1: Usuário Solicita Entrega Direta

**Página:** RequestDeliveryPage (`/app/delivery/request/new`)

**Casos de Teste:**

- [ ] **TC1.1**: Preencher Step 1 (Endereços)
  - Inserir endereço de coleta completo
  - Inserir contato de coleta (nome + telefone)
  - Inserir endereço de entrega completo
  - Inserir contato de entrega (nome + telefone)
  - Validar que campos obrigatórios bloqueiam avanço
  - Clicar "Próximo" → avança para Step 2

- [ ] **TC1.2**: Preencher Step 2 (Detalhes do Pacote)
  - Selecionar tipo de pacote (documento, pequeno, médio, grande)
  - Inserir peso (kg)
  - Adicionar instruções especiais (opcional)
  - Clicar "Calcular Taxa"
  - Verificar que FeeBreakdownCard aparece
  - Validar valores (baseFee, distanceFee, packageTypeFee, weightFee)
  - Clicar "Próximo" → avança para Step 3

- [ ] **TC1.3**: Confirmar no Step 3
  - Verificar resumo de endereços (coleta + entrega)
  - Verificar detalhes do pacote
  - Verificar breakdown da taxa
  - Ver aviso de escrow
  - Clicar "Confirmar Pedido"
  - Verificar toast de sucesso
  - Verificar redirecionamento para `/app/delivery/track/{id}`

- [ ] **TC1.4**: Validações de erro
  - Tentar avançar Step 1 sem endereços → erro
  - Tentar avançar Step 2 sem calcular taxa → erro
  - Clicar "Voltar" em cada step → retorna ao anterior

---

### ✅ FLUXO 2: Usuário Vira Entregador

**Página:** DeliveryProfileSetupPage (`/app/delivery/profile/setup`)

**Casos de Teste:**

- [ ] **TC2.1**: Preencher Step 1 (Informações Pessoais)
  - Inserir nome completo
  - Inserir CPF
  - Inserir telefone
  - Inserir endereço base (CEP, rua, número, cidade, estado)
  - Upload de foto (opcional)
  - Clicar "Próximo" → avança para Step 2

- [ ] **TC2.2**: Preencher Step 2 (Veículo)
  - Selecionar tipo de veículo (bicicleta, moto, carro, van)
  - Inserir marca/modelo (opcional)
  - Inserir placa (obrigatório exceto para bicicleta)
  - Inserir cor
  - Inserir capacidade de carga (kg)
  - Clicar "Próximo" → avança para Step 3

- [ ] **TC2.3**: Preencher Step 3 (Disponibilidade)
  - Definir raio de atuação (slider 1-50km)
  - Selecionar dias da semana (checkboxes)
  - Selecionar turnos (manhã, tarde, noite)
  - Toggle entregas imediatas (on/off)
  - Clicar "Próximo" → avança para Step 4

- [ ] **TC2.4**: Confirmar no Step 4
  - Verificar resumo de informações pessoais
  - Verificar resumo de veículo
  - Verificar resumo de disponibilidade
  - Marcar checkbox de termos
  - Clicar "Confirmar Cadastro"
  - Verificar toast de sucesso
  - Verificar redirecionamento para `/app/delivery/dashboard`

- [ ] **TC2.5**: Validações de erro
  - Tentar avançar sem preencher campos obrigatórios → erro
  - Tentar confirmar sem aceitar termos → erro

---

### ✅ FLUXO 3: Entregador Aceita e Completa Entrega

**Páginas:** DeliveryDashboardPage, DeliveryRequestsListPage, ActiveDeliveryPage

**Casos de Teste:**

- [ ] **TC3.1**: Dashboard do Entregador
  - Acessar `/app/delivery/dashboard`
  - Verificar header com nome e avatar
  - Verificar toggle online/offline
  - Alternar toggle → ver toast de confirmação
  - Verificar KPIs (entregas hoje, ganhos, taxa de conclusão, avaliação)
  - Verificar Quick Actions com badges
  - Verificar lista de entregas ativas (se houver)
  - Verificar estatísticas da semana (gráfico de barras)

- [ ] **TC3.2**: Ver Demandas Disponíveis
  - Clicar em "Demandas Disponíveis"
  - Verificar redirecionamento para `/app/delivery/requests`
  - Ver lista de entregas pendentes
  - Testar filtros (distância, valor mínimo, tipo de pacote)
  - Testar ordenação (mais próximas, maior valor, mais recentes)
  - Clicar "Aceitar Entrega"
  - Verificar toast de sucesso
  - Verificar redirecionamento para `/app/delivery/active/{id}`

- [ ] **TC3.3**: Entrega em Andamento - Status: accepted
  - Ver timeline com status "Aceito" ativo
  - Ver timer de tempo decorrido
  - Ver endereço de coleta com contato
  - Ver endereço de entrega com contato
  - Testar botão "Ligar" (abre dialer)
  - Testar botão "WhatsApp" (abre WhatsApp)
  - Testar botão "Navegação" (abre Google Maps)
  - Clicar "Confirmar Coleta"
  - Verificar toast de sucesso
  - Verificar mudança de status para "picked_up"

- [ ] **TC3.4**: Entrega em Andamento - Status: picked_up
  - Ver timeline atualizada
  - Ver botão "Confirmar Entrega"
  - Clicar "Confirmar Entrega"
  - Verificar toast de sucesso com valor ganho
  - Verificar mudança de status para "delivered"

- [ ] **TC3.5**: Entrega Concluída
  - Ver card de conclusão verde
  - Ver valor ganho em BZR
  - Clicar "Voltar ao Dashboard" → redireciona
  - Clicar "Ver Novas Demandas" → redireciona

- [ ] **TC3.6**: Cancelar Entrega
  - Clicar "Cancelar Entrega"
  - Ver dialog de confirmação
  - Preencher motivo
  - Clicar "Confirmar Cancelamento"
  - Verificar toast de cancelamento
  - Verificar redirecionamento para dashboard

---

### ✅ FLUXO 4: Loja Gerencia Entregadores Parceiros

**Página:** DeliveryPartnersPage (`/app/store/delivery-partners`)

**Casos de Teste:**

- [ ] **TC4.1**: Listar Parceiros
  - Acessar `/app/store/delivery-partners`
  - Ver lista de parceiros vinculados (ordenados por prioridade)
  - Verificar cards com avatar, nome, veículo, raio, estatísticas

- [ ] **TC4.2**: Convidar Novo Parceiro
  - Clicar "Convidar Entregador"
  - Ver dialog de convite
  - Inserir ID do perfil do entregador
  - Clicar "Convidar"
  - Verificar toast de sucesso
  - Verificar que parceiro aparece na lista

- [ ] **TC4.3**: Editar Prioridade
  - Clicar "Prioridade" em um parceiro
  - Ver dialog de edição
  - Alterar número de prioridade
  - Clicar "Salvar"
  - Verificar toast de sucesso
  - Verificar reordenação da lista

- [ ] **TC4.4**: Remover Parceiro
  - Clicar "Remover" em um parceiro
  - Ver alert dialog de confirmação
  - Clicar "Remover"
  - Verificar toast de sucesso
  - Verificar que parceiro sumiu da lista

- [ ] **TC4.5**: Sem parceiros
  - Remover todos os parceiros
  - Ver mensagem "Nenhum entregador vinculado"
  - Ver botão "Convidar Primeiro Entregador"

---

### ✅ FLUXO 5: Integrações

**Páginas:** DashboardPage, OrderPage, MobileBottomNav

**Casos de Teste:**

- [ ] **TC5.1**: Dashboard - Quick Action
  - Acessar `/app/dashboard`
  - **Sem perfil de entregador:**
    - Ver botão "Tornar-me Entregador"
    - Clicar → redireciona para `/app/delivery/profile/setup`
  - **Com perfil de entregador:**
    - Ver botão "Dashboard de Entregas"
    - Se houver entregas ativas, ver badge com número
    - Clicar → redireciona para `/app/delivery/dashboard`

- [ ] **TC5.2**: OrderPage - Tracking
  - Criar pedido com entrega
  - Acessar página do pedido
  - Ver card "Status da Entrega"
  - Ver timeline de status
  - Se entrega aceita, ver informações do entregador
  - Clicar "Ver Detalhes" → redireciona

- [ ] **TC5.3**: MobileBottomNav
  - Redimensionar janela para mobile (< 768px)
  - **Sem perfil de entregador:**
    - Ver apenas abas padrão
  - **Com perfil de entregador:**
    - Ver nova aba "Entregas" com ícone de caminhão
    - Se houver entregas ativas, ver badge
    - Clicar → redireciona para `/app/delivery/dashboard`

---

## 🔍 VALIDAÇÃO DE TIPOS TYPESCRIPT

### Executar Type Check

```bash
cd /home/bazari/bazari/apps/web
npx tsc --noEmit
```

**Verificar:**
- [ ] Sem erros de tipo
- [ ] Todos os imports corretos
- [ ] Props de componentes corretas
- [ ] API responses tipadas

---

## 📱 TESTES DE RESPONSIVIDADE

### Breakpoints a Testar

- [ ] **Mobile (320px - 640px)**
  - Todas as páginas são scrolláveis
  - Formulários ocupam largura total
  - Grids colapsam para 1 coluna
  - Bottom nav aparece
  - Cards têm padding adequado

- [ ] **Tablet (641px - 1024px)**
  - Grids de 2 colunas funcionam
  - Sidebar de filtros visível
  - Formulários com layout intermediário

- [ ] **Desktop (1025px+)**
  - Grids de 3-4 colunas
  - Layout completo com sidebar
  - Max-width de containers respeitado

### Páginas Críticas para Testar

- [ ] RequestDeliveryPage - formulário de 3 steps
- [ ] DeliveryProfileSetupPage - formulário de 4 steps
- [ ] DeliveryDashboardPage - grid de KPIs e entregas
- [ ] DeliveryRequestsListPage - lista com filtros
- [ ] ActiveDeliveryPage - cards de endereço lado a lado

---

## ⚡ PERFORMANCE E OTIMIZAÇÕES

### Lazy Loading de Páginas

```tsx
// Em App.tsx
import { lazy, Suspense } from 'react';

const RequestDeliveryPage = lazy(() => import('@/pages/RequestDeliveryPage'));
const DeliveryProfileSetupPage = lazy(() => import('@/pages/DeliveryProfileSetupPage'));
const DeliveryDashboardPage = lazy(() => import('@/pages/DeliveryDashboardPage'));
const ActiveDeliveryPage = lazy(() => import('@/pages/ActiveDeliveryPage'));
const DeliveryRequestsListPage = lazy(() => import('@/pages/DeliveryRequestsListPage'));
const DeliveryPartnersPage = lazy(() => import('@/pages/DeliveryPartnersPage'));

// Envolver rotas com Suspense
<Route
  path="delivery/request/new"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <RequestDeliveryPage />
    </Suspense>
  }
/>
```

### Otimizações a Aplicar

- [ ] Lazy loading de páginas de delivery
- [ ] Memoização de componentes pesados (React.memo)
- [ ] Debounce em filtros e buscas
- [ ] Virtualização de listas longas (react-window ou similar)
- [ ] Compressão de imagens de perfil

---

## 📊 TESTES DE INTEGRAÇÃO COM BACKEND

### Endpoints a Validar

**Delivery Requests:**
- [ ] `POST /api/delivery/requests/calculate-fee` - Calcular taxa
- [ ] `POST /api/delivery/requests` - Criar pedido de entrega
- [ ] `GET /api/delivery/requests` - Listar pedidos (com filtros)
- [ ] `GET /api/delivery/requests/:id` - Obter pedido específico
- [ ] `POST /api/delivery/requests/:id/accept` - Aceitar entrega
- [ ] `POST /api/delivery/requests/:id/pickup` - Confirmar coleta
- [ ] `POST /api/delivery/requests/:id/deliver` - Confirmar entrega
- [ ] `POST /api/delivery/requests/:id/cancel` - Cancelar entrega

**Delivery Profile:**
- [ ] `GET /api/delivery/profile` - Obter perfil do entregador
- [ ] `POST /api/delivery/profile` - Criar perfil
- [ ] `PUT /api/delivery/profile` - Atualizar perfil
- [ ] `PATCH /api/delivery/profile/availability` - Alterar disponibilidade
- [ ] `GET /api/delivery/profile/stats` - Obter estatísticas

**Store Partners:**
- [ ] `GET /api/delivery/partners` - Listar parceiros da loja
- [ ] `POST /api/delivery/partners` - Convidar parceiro
- [ ] `PUT /api/delivery/partners/:id` - Atualizar parceiro
- [ ] `DELETE /api/delivery/partners/:id` - Remover parceiro

### Casos de Erro a Testar

- [ ] Endpoint retorna 401 (não autenticado) → mostrar erro
- [ ] Endpoint retorna 403 (sem permissão) → mostrar erro
- [ ] Endpoint retorna 404 (não encontrado) → mostrar erro
- [ ] Endpoint retorna 500 (erro interno) → mostrar erro genérico
- [ ] Timeout de requisição → mostrar erro de timeout
- [ ] Rede offline → mostrar erro de conexão

---

## 🐛 CORREÇÕES FINAIS

### Checklist de Bugs Comuns

- [ ] Verificar que todos os formulários têm validação
- [ ] Verificar que todos os botões têm estado de loading
- [ ] Verificar que todos os toasts têm mensagens claras
- [ ] Verificar que todos os redirecionamentos funcionam
- [ ] Verificar que não há console.errors no navegador
- [ ] Verificar que não há warnings de React no console
- [ ] Verificar que imagens têm alt text
- [ ] Verificar que formulários têm labels corretas
- [ ] Verificar acessibilidade (navegação por teclado)

### Ajustes de UX

- [ ] Adicionar loading skeletons em listas
- [ ] Adicionar estados vazios em todas as listas
- [ ] Adicionar confirmações antes de ações destrutivas
- [ ] Adicionar feedback visual em todas as ações
- [ ] Adicionar tooltips em ícones sem label

---

## 📚 DOCUMENTAÇÃO FINAL

### README do Sistema de Entregas

**Criar arquivo:** `apps/web/docs/DELIVERY_SYSTEM.md`

```markdown
# Sistema de Entregas - Bazari Delivery Network

## Visão Geral

Sistema completo de entregas peer-to-peer integrado ao Bazari.

## Fluxos de Usuário

### 1. Solicitar Entrega Direta
- Acesso: `/app/delivery/request/new`
- Permite criar pedido de entrega sem vínculo com pedido

### 2. Tornar-se Entregador
- Acesso: `/app/delivery/profile/setup`
- Cadastro em 4 etapas (pessoal, veículo, disponibilidade, confirmação)

### 3. Dashboard do Entregador
- Acesso: `/app/delivery/dashboard`
- KPIs, entregas ativas, demandas, estatísticas

### 4. Aceitar e Completar Entregas
- Lista: `/app/delivery/requests`
- Entrega ativa: `/app/delivery/active/:id`

### 5. Gerenciar Parceiros (Lojistas)
- Acesso: `/app/store/delivery-partners`
- Convidar, priorizar, remover entregadores

## Componentes Reutilizáveis

- `StepIndicator` - Indicador de progresso multi-step
- `KPICard` - Card de métricas
- `AddressCard` - Card de endereço com contatos
- `FeeBreakdownCard` - Breakdown de taxa de entrega
- `DeliveryStatusTimeline` - Timeline de status da entrega
- `QuickActionButton` - Botão de ação rápida

## API Hooks

- `useDeliveryProfile()` - Gerencia perfil do entregador

## Tipos TypeScript

Ver: `apps/web/src/types/delivery.ts`

## Endpoints do Backend

Ver: `apps/api/src/routes/delivery.ts`
```

---

## ✅ CHECKLIST FINAL

Antes de considerar a FASE 10 completa:

- [ ] Todos os fluxos testados manualmente
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Build passa sem erros (`npm run build`)
- [ ] Responsividade testada em mobile, tablet, desktop
- [ ] Integração com backend validada
- [ ] Performance aceitável (< 2s para carregar páginas)
- [ ] Documentação criada
- [ ] Bugs críticos corrigidos
- [ ] UX polida (loading states, empty states, feedback)

---

## 🚀 COMANDOS FINAIS

```bash
cd /home/bazari/bazari/apps/web

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build de produção
npm run build

# Preview do build
npm run preview

# Executar dev para testes finais
npm run dev
```

---

## 🎉 CONCLUSÃO

Após completar todos os testes e validações desta fase:

1. ✅ Sistema de Entregas 100% funcional
2. ✅ 7 páginas implementadas
3. ✅ 12 componentes reutilizáveis
4. ✅ Integração completa com backend (17 endpoints)
5. ✅ Responsivo em todas as resoluções
6. ✅ TypeScript tipado corretamente
7. ✅ UX polida e profissional

**O Bazari Delivery Network está pronto para produção!** 🚀
