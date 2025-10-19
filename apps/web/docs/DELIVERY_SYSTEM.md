# Sistema de Entregas - Bazari Delivery Network

## 📋 Visão Geral

Sistema completo de entregas peer-to-peer (P2P) integrado ao ecossistema Bazari. Permite que qualquer usuário solicite entregas e que entregadores aceitem e completem essas entregas de forma descentralizada, com pagamentos via BZR token e gestão de reputação.

## 🎯 Funcionalidades Principais

### 1. Solicitação de Entregas
- Usuários podem solicitar entregas diretas (sem vínculo com pedidos)
- Cálculo automático de taxa baseado em distância, tipo de pacote e peso
- Sistema de escrow para proteção de pagamento
- Rastreamento em tempo real do status da entrega

### 2. Perfil de Entregador
- Cadastro completo com informações pessoais, veículo e disponibilidade
- Sistema de disponibilidade online/offline
- Dashboard com KPIs e estatísticas
- Histórico de entregas e ganhos

### 3. Marketplace de Entregas
- Lista de entregas disponíveis com filtros avançados
- Sistema de aceitação first-come-first-served
- Notificações para entregadores parceiros de lojas

### 4. Gestão de Parceiros (Lojistas)
- Lojistas podem vincular entregadores preferidos
- Sistema de priorização de entregadores
- Estatísticas de desempenho de cada parceiro

## 🚀 Fluxos de Usuário

### Fluxo 1: Solicitar Entrega Direta

**Rota:** `/app/delivery/request/new`

**Etapas:**
1. **Endereços**: Informar coleta e entrega com contatos
2. **Pacote**: Tipo, peso, instruções especiais + cálculo de taxa
3. **Confirmação**: Revisar e confirmar com pagamento via escrow

**Resultado:** Entrega criada e disponível para entregadores

---

### Fluxo 2: Tornar-se Entregador

**Rota:** `/app/delivery/profile/setup`

**Etapas:**
1. **Informações Pessoais**: Nome, CPF, telefone, endereço base, foto
2. **Veículo**: Tipo, marca, modelo, placa, cor, capacidade
3. **Disponibilidade**: Raio de atuação, dias, turnos, entregas imediatas
4. **Confirmação**: Revisar e aceitar termos

**Resultado:** Perfil de entregador criado, pode começar a aceitar entregas

---

### Fluxo 3: Dashboard do Entregador

**Rota:** `/app/delivery/dashboard`

**Visualizações:**
- **KPIs**: Entregas hoje, ganhos do dia, taxa de conclusão, avaliação média
- **Toggle Online/Offline**: Controle de disponibilidade
- **Quick Actions**: Demandas, ativas, histórico, ganhos
- **Lista de Ativas**: Entregas em andamento
- **Estatísticas Semanais**: Gráfico de entregas por dia

---

### Fluxo 4: Aceitar e Completar Entregas

**Lista de Demandas:** `/app/delivery/requests`

**Filtros Disponíveis:**
- Distância máxima (1-50km)
- Valor mínimo (BZR)
- Tipo de pacote (documento, pequeno, médio, grande)

**Ordenação:**
- Mais próximas
- Maior valor
- Mais recentes

**Entrega Ativa:** `/app/delivery/active/:id`

**Status da Entrega:**
1. **pending** → Aguardando aceitação
2. **accepted** → Entregador aceitou (pode confirmar coleta)
3. **picked_up** → Pacote coletado (em rota para entrega)
4. **in_transit** → Em trânsito
5. **delivered** → Entregue (pagamento liberado)
6. **cancelled** → Cancelada

**Ações Disponíveis:**
- Confirmar Coleta (accepted → picked_up)
- Confirmar Entrega (picked_up → delivered)
- Cancelar Entrega (qualquer status → cancelled)
- Ligar para contato
- Enviar WhatsApp
- Abrir navegação GPS

---

### Fluxo 5: Gerenciar Parceiros (Lojistas)

**Rota:** `/app/store/delivery-partners`

**Funcionalidades:**
- Listar parceiros vinculados (ordenados por prioridade)
- Convidar novos parceiros (por ID do perfil)
- Editar prioridade de parceiros
- Remover parceiros
- Ver estatísticas de cada parceiro

**Sistema de Prioridade:**
- Quando uma loja cria entrega, notifica parceiros por ordem de prioridade
- Primeiro a aceitar fica com a entrega

---

## 🧩 Componentes Reutilizáveis

Todos os componentes estão em `apps/web/src/components/delivery/`

### StepIndicator
**Uso:** Indicador de progresso para formulários multi-step

**Props:**
```typescript
{
  currentStep: number;
  totalSteps: number;
  steps: string[];
}
```

**Exemplo:**
```tsx
<StepIndicator currentStep={2} totalSteps={3} steps={['Endereços', 'Pacote', 'Confirmar']} />
```

---

### KPICard
**Uso:** Card de métrica com ícone, label e valor

**Props:**
```typescript
{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  color?: string;
}
```

**Exemplo:**
```tsx
<KPICard
  icon={<Package />}
  label="Entregas Hoje"
  value={12}
  trend="+3"
  color="text-blue-600"
/>
```

---

### AddressCard
**Uso:** Card de endereço com contato e ações

**Props:**
```typescript
{
  title: string;
  address: Address;
  contact: ContactInfo;
  onCall?: () => void;
  onWhatsApp?: () => void;
  onNavigate?: () => void;
}
```

**Exemplo:**
```tsx
<AddressCard
  title="Coleta"
  address={pickupAddress}
  contact={pickupContact}
  onCall={() => window.location.href = `tel:${contact.phone}`}
  onNavigate={() => openGoogleMaps(address)}
/>
```

---

### FeeBreakdownCard
**Uso:** Breakdown detalhado da taxa de entrega

**Props:**
```typescript
{
  breakdown: {
    baseFee: string;
    distanceFee: string;
    packageTypeFee: string;
    weightFee: string;
  };
  totalBzr: string;
  distance: number;
  estimatedTime: number;
}
```

**Exemplo:**
```tsx
<FeeBreakdownCard
  breakdown={feeResult.breakdown}
  totalBzr={feeResult.totalBzr}
  distance={feeResult.distance}
  estimatedTime={feeResult.estimatedTime}
/>
```

---

### DeliveryStatusTimeline
**Uso:** Timeline visual do status da entrega

**Props:**
```typescript
{
  currentStatus: DeliveryRequestStatus;
  timestamps: {
    createdAt: string;
    acceptedAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
  };
}
```

**Exemplo:**
```tsx
<DeliveryStatusTimeline
  currentStatus="picked_up"
  timestamps={{
    createdAt: delivery.createdAt,
    acceptedAt: delivery.acceptedAt,
    pickedUpAt: delivery.pickedUpAt,
  }}
/>
```

---

### QuickActionButton
**Uso:** Botão de ação rápida com ícone e badge

**Props:**
```typescript
{
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}
```

**Exemplo:**
```tsx
<QuickActionButton
  icon={<Truck />}
  label="Demandas"
  badge={5}
  onClick={() => navigate('/app/delivery/requests')}
/>
```

---

## 🪝 API Hooks

### useDeliveryProfile()

**Localização:** `apps/web/src/hooks/useDeliveryProfile.ts`

**Uso:** Gerencia o perfil de entregador do usuário atual

**Retorno:**
```typescript
{
  profile: DeliveryProfile | null;
  loading: boolean;
  error: string | null;
  hasProfile: boolean;
  toggleAvailability: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Exemplo:**
```tsx
function MyComponent() {
  const { profile, hasProfile, toggleAvailability } = useDeliveryProfile();

  if (!hasProfile) {
    return <Link to="/app/delivery/profile/setup">Criar Perfil</Link>;
  }

  return (
    <div>
      <p>Status: {profile.isAvailable ? 'Online' : 'Offline'}</p>
      <Button onClick={toggleAvailability}>Alternar</Button>
    </div>
  );
}
```

---

## 📊 Tipos TypeScript

**Localização:** `apps/web/src/types/delivery.ts`

### Enums

```typescript
enum DeliveryRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

enum PackageType {
  DOCUMENT = 'document',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

enum VehicleType {
  BIKE = 'bike',
  MOTORCYCLE = 'motorcycle',
  CAR = 'car',
  VAN = 'van',
}
```

### Interfaces Principais

```typescript
interface DeliveryRequest {
  id: string;
  status: DeliveryRequestStatus;
  pickupAddress: Address;
  pickupContact: ContactInfo;
  deliveryAddress: Address;
  deliveryContact: ContactInfo;
  packageType: PackageType;
  weight: number;
  specialInstructions?: string;
  distance: number;
  estimatedTime: number;
  totalBzr: string;
  breakdown: FeeBreakdown;
  requesterId: string;
  delivererId?: string;
  orderId?: string;
  storeId?: string;
  deliverer?: DelivererInfo;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

interface DeliveryProfile {
  id: string;
  userId: string;
  fullName: string;
  cpf: string;
  phone: string;
  baseAddress: Address;
  profilePhoto?: string;
  vehicleType: VehicleType;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  maxCapacityKg: number;
  isAvailable: boolean;
  radiusKm: number;
  availableDays: DayOfWeek[];
  availableTimeSlots: TimeSlot[];
  acceptsImmediateDeliveries: boolean;
  activeDeliveries?: number;
  createdAt: string;
  updatedAt: string;
}

interface StoreDeliveryPartner {
  id: string;
  storeId: string;
  deliveryProfileId: string;
  priority: number;
  isActive: boolean;
  deliveryProfile: {
    fullName: string;
    phone: string;
    vehicleType: VehicleType;
    radiusKm: number;
    profilePhoto?: string;
  };
  stats?: {
    totalDeliveries: number;
    completionRate: number;
    averageRating: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 🌐 API Endpoints

**Localização:** `apps/web/src/lib/api/delivery.ts`

### Delivery Requests

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/delivery/requests/calculate-fee` | Calcular taxa de entrega |
| POST | `/api/delivery/requests` | Criar nova entrega |
| GET | `/api/delivery/requests` | Listar entregas (com filtros) |
| GET | `/api/delivery/requests/:id` | Obter entrega específica |
| POST | `/api/delivery/requests/:id/accept` | Aceitar entrega |
| POST | `/api/delivery/requests/:id/pickup` | Confirmar coleta |
| POST | `/api/delivery/requests/:id/deliver` | Confirmar entrega |
| POST | `/api/delivery/requests/:id/cancel` | Cancelar entrega |

### Delivery Profile

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/delivery/profile` | Obter perfil do entregador |
| POST | `/api/delivery/profile` | Criar perfil de entregador |
| PUT | `/api/delivery/profile` | Atualizar perfil |
| PATCH | `/api/delivery/profile/availability` | Alterar disponibilidade |
| GET | `/api/delivery/profile/stats` | Obter estatísticas |

### Store Partners

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/delivery/partners` | Listar parceiros da loja |
| POST | `/api/delivery/partners` | Convidar parceiro |
| PUT | `/api/delivery/partners/:id` | Atualizar parceiro |
| DELETE | `/api/delivery/partners/:id` | Remover parceiro |

---

## 🗂️ Estrutura de Arquivos

```
apps/web/src/
├── components/delivery/
│   ├── AddressCard.tsx
│   ├── DeliveryStatusTimeline.tsx
│   ├── FeeBreakdownCard.tsx
│   ├── KPICard.tsx
│   ├── QuickActionButton.tsx
│   ├── StepIndicator.tsx
│   └── index.ts
├── hooks/
│   └── useDeliveryProfile.ts
├── lib/api/
│   └── delivery.ts
├── pages/delivery/
│   ├── ActiveDeliveryPage.tsx
│   ├── ComponentsTestPage.tsx
│   ├── DeliveryDashboardPage.tsx
│   ├── DeliveryEarningsPage.tsx
│   ├── DeliveryHistoryPage.tsx
│   ├── DeliveryLandingPage.tsx
│   ├── DeliveryPartnersPage.tsx
│   ├── DeliveryProfileSetupPage.tsx
│   ├── DeliveryRequestDetailPage.tsx
│   ├── DeliveryRequestsListPage.tsx
│   └── RequestDeliveryPage.tsx
└── types/
    └── delivery.ts
```

---

## 🔗 Integrações

### DashboardPage
- Quick Action "Virar Entregador" (sem perfil)
- Quick Action "Minhas Entregas" (com perfil)
- Badge com número de entregas ativas

### OrderPage
- Card de rastreamento de entrega (se pedido tiver deliveryRequestId)
- Timeline de status
- Informações do entregador
- Botão "Ver Detalhes da Entrega"

### MobileBottomNav
- Aba "Entregas" para entregadores (só aparece se tem perfil)
- Badge com entregas ativas
- Ícone de caminhão

---

## 🎨 Design System

### Cores

- **Primary**: Tema do Bazari (vinho/purple)
- **Delivery**: Verde esmeralda (`emerald-500`)
- **Status Colors**:
  - Pending: Cinza (`muted`)
  - Accepted: Azul (`blue-500`)
  - Picked Up: Amarelo (`yellow-500`)
  - In Transit: Roxo (`purple-500`)
  - Delivered: Verde (`green-500`)
  - Cancelled: Vermelho (`red-500`)

### Ícones (Lucide React)

- Truck: Entregas gerais
- Package: Pacotes
- MapPin: Localização
- Phone: Telefone
- Navigation: GPS
- Star: Avaliação
- TrendingUp: Estatísticas
- Clock: Tempo

---

## 🧪 Testes

### Fluxos Críticos para Testar

1. **Solicitar Entrega**: Preencher 3 steps e confirmar
2. **Criar Perfil de Entregador**: Completar 4 steps
3. **Aceitar e Completar Entrega**: Do marketplace até delivered
4. **Gerenciar Parceiros**: Convidar, priorizar, remover
5. **Integrações**: Dashboard, OrderPage, MobileBottomNav

### Casos de Erro

- Formulário incompleto
- Taxa não calculada
- Entrega já aceita por outro
- Perfil já existe
- ID de parceiro inválido

---

## 🚀 Melhorias Futuras

- [ ] Sistema de avaliação (rating) de entregadores
- [ ] Notificações push para novas demandas
- [ ] Rastreamento GPS em tempo real
- [ ] Chat in-app entre solicitante e entregador
- [ ] Histórico detalhado com filtros avançados
- [ ] Exportação de relatórios de ganhos
- [ ] Gamificação (badges, níveis, conquistas)
- [ ] Sistema de disputa e mediação
- [ ] Seguro de entregas
- [ ] Multi-idioma (i18n)

---

## 📄 Licença

Parte do ecossistema Bazari - Todos os direitos reservados.

---

## 👥 Contribuidores

Sistema desenvolvido por: Claude (Anthropic)
Para: Equipe Bazari

**Data de Conclusão:** Outubro 2025
**Versão:** 1.0.0
