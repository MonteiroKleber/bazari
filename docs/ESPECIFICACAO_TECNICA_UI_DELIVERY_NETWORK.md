# ESPECIFICAÇÃO TÉCNICA - UI/UX DELIVERY NETWORK

**Versão:** 1.0.0
**Data:** 2025-10-16
**Status:** Pronto para Implementação
**Backend:** ✅ Implementado (17 endpoints, 3 models)

---

## 📋 ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura de Páginas](#2-arquitetura-de-páginas)
3. [Componentes Reutilizáveis](#3-componentes-reutilizáveis)
4. [Fluxos de Usuário](#4-fluxos-de-usuário)
5. [Integrações com Backend](#5-integrações-com-backend)
6. [Estrutura de Arquivos](#6-estrutura-de-arquivos)
7. [Tipos TypeScript](#7-tipos-typescript)
8. [Validações e Schemas](#8-validações-e-schemas)
9. [Estados e Context](#9-estados-e-context)
10. [Testes](#10-testes)

---

## 1. VISÃO GERAL

### 1.1 Objetivo

Implementar interface completa para o **Bazari Delivery Network**, permitindo que usuários:
- 👤 **Compradores:** Solicitem entregas diretas e acompanhem status
- 🚚 **Entregadores:** Cadastrem-se, recebam demandas e façam entregas
- 🏪 **Lojistas:** Gerenciem entregadores vinculados às suas lojas

### 1.2 Escopo da Implementação

**O QUE SERÁ IMPLEMENTADO:**
- ✅ 7 páginas principais
- ✅ 12 componentes reutilizáveis
- ✅ 1 hook customizado de API
- ✅ Integração com 17 endpoints do backend
- ✅ Mobile-first responsive
- ✅ Integração com AppHeader/Footer existentes

**O QUE NÃO SERÁ IMPLEMENTADO (futuro):**
- ❌ Tracking GPS em tempo real (WebSocket)
- ❌ Notificações push (service worker)
- ❌ Integração com mapas (Google Maps API)
- ❌ Chat em tempo real
- ❌ Sistema de categorias/Services (marketplace)

### 1.3 Dependências

**Backend (já implementado):**
- ✅ 17 endpoints REST em `/api/delivery/*`
- ✅ 3 models: `DeliveryProfile`, `DeliveryRequest`, `StoreDeliveryPartner`
- ✅ Cálculo de frete implementado
- ✅ Sistema de notificações (estrutura pronta)

**Frontend (existentes):**
- ✅ shadcn/ui components
- ✅ React Router DOM
- ✅ TailwindCSS
- ✅ Zod para validação
- ✅ `src/lib/api.ts` helpers
- ✅ Auth system (`RequireAuth`, `getSessionUser`)

---

## 2. ARQUITETURA DE PÁGINAS

### 2.1 Mapa de Rotas

```
/delivery (público)
  └── Landing page de marketing

/app/delivery/* (autenticado)
  ├── /request/new → Solicitar entrega direta
  ├── /profile/setup → Cadastro de entregador (4 steps)
  ├── /profile/edit → Editar perfil de entregador
  ├── /dashboard → Dashboard do entregador
  ├── /requests → Lista de demandas disponíveis
  ├── /requests/:id → Detalhes de uma demanda
  ├── /active/:id → Entrega em andamento (fluxo)
  ├── /history → Histórico de entregas
  └── /earnings → Extrato de ganhos

/app/orders/:id (modificação)
  └── Adicionar seção de rastreamento se Order tem deliveryRequest

/app/sellers/:slug (modificação)
  └── Nova tab "Entregadores" para gerenciar vínculos
```

### 2.2 Estrutura de Páginas

#### **Página 1: DeliveryLandingPage** (`/delivery`)

**Propósito:** Marketing e conversão (público)

**Seções:**
1. Hero com CTAs ("Solicitar Entrega", "Tornar-me Entregador")
2. Como Funciona (3 passos)
3. Vantagens (4 cards)
4. CTA Final

**Componentes:**
- `<Header />` (público)
- `<Footer />`
- `<FeatureCard />`
- `<BenefitCard />`

**Estado:** Sem estado (página estática)

**Rota:** `/delivery`

---

#### **Página 2: RequestDeliveryPage** (`/app/delivery/request/new`)

**Propósito:** Solicitar entrega direta (3 steps)

**Steps:**
1. **Endereços** - Origem e destino
2. **Detalhes** - Tipo de pacote, peso, observações
3. **Confirmação** - Cotação e resumo

**Componentes:**
- `<StepIndicator />` - Progresso visual
- `<AddressAutocomplete />` - Busca de endereços
- `<FeeBreakdownCard />` - Detalhamento do valor

**Estado Local:**
```typescript
const [step, setStep] = useState(1);
const [pickupAddress, setPickupAddress] = useState<Address | null>(null);
const [deliveryAddress, setDeliveryAddress] = useState<Address | null>(null);
const [packageType, setPackageType] = useState<PackageType>('small_box');
const [weight, setWeight] = useState('');
const [notes, setNotes] = useState('');
const [feeResult, setFeeResult] = useState<DeliveryFeeResult | null>(null);
const [submitting, setSubmitting] = useState(false);
```

**Validação:**
- Step 1: Ambos endereços preenchidos
- Step 2: Peso válido (>0), tipo selecionado
- Step 3: Fee calculado, termos aceitos

**API Calls:**
- `POST /api/delivery/calculate-fee` (step 2 → 3)
- `POST /api/delivery/requests` (step 3 submit)

**Rota:** `/app/delivery/request/new`

---

#### **Página 3: DeliveryProfileSetupPage** (`/app/delivery/profile/setup`)

**Propósito:** Cadastro de entregador (4 steps)

**Steps:**
1. **Dados Pessoais** - Nome, CPF, telefone, emergência
2. **Veículo** - Tipo, placa, modelo, ano
3. **Capacidades** - Peso máximo, volume, tipos aceitos
4. **Área de Atuação** - Raio, cidades, wallet

**Componentes:**
- `<StepIndicator />`
- `<StepCard />` - Wrapper para cada step
- `<VehicleTypeSelector />` - Radio cards visuais

**Estado Local:**
```typescript
const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState<CreateDeliveryProfilePayload>({
  fullName: '',
  documentType: 'cpf',
  documentNumber: '',
  phoneNumber: '',
  vehicleType: 'motorcycle',
  maxWeight: 10,
  maxVolume: 0.5,
  serviceRadius: 10,
  serviceCities: [],
  walletAddress: ''
});
const [submitting, setSubmitting] = useState(false);
```

**Validação (Zod):**
```typescript
const step1Schema = z.object({
  fullName: z.string().min(3),
  documentType: z.enum(['cpf', 'cnpj', 'passport']),
  documentNumber: z.string().min(11),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/)
});

// ... schemas para steps 2, 3, 4
```

**API Calls:**
- `GET /api/delivery/profile` (verificar se já existe)
- `POST /api/delivery/profile` (criar)

**Navegação pós-sucesso:** `/app/delivery/dashboard`

**Rota:** `/app/delivery/profile/setup`

---

#### **Página 4: DeliveryDashboardPage** (`/app/delivery/dashboard`)

**Propósito:** Dashboard principal do entregador

**Seções:**
1. Header com toggle de disponibilidade
2. KPIs (4 cards)
3. Novas Demandas (top 3 + botão "Ver Todas")
4. Entregas em Andamento (lista)
5. Quick Actions (4 botões)

**Componentes:**
- `<KPICard />` - Métricas visuais
- `<DeliveryRequestCard />` - Card compacto de demanda
- `<ActiveDeliveryCard />` - Card de entrega ativa
- `<QuickActionButton />`

**Estado Local:**
```typescript
const [deliveryProfile, setDeliveryProfile] = useState<DeliveryProfile | null>(null);
const [availableRequests, setAvailableRequests] = useState<DeliveryRequest[]>([]);
const [activeDeliveries, setActiveDeliveries] = useState<DeliveryRequest[]>([]);
const [stats, setStats] = useState({
  today: 0,
  earningsToday: '0',
  pending: 0
});
const [loading, setLoading] = useState(true);
```

**API Calls:**
- `GET /api/delivery/profile` (carregar perfil)
- `GET /api/delivery/profile/stats` (métricas)
- `GET /api/delivery/requests?forMe=true&limit=3` (top 3 demandas)
- `GET /api/delivery/requests?status=accepted&status=picked_up` (ativas)
- `PATCH /api/delivery/profile/availability` (toggle)

**Real-time (futuro):** Polling a cada 30s quando `isAvailable=true`

**Rota:** `/app/delivery/dashboard`

---

#### **Página 5: DeliveryRequestsListPage** (`/app/delivery/requests`)

**Propósito:** Lista completa de demandas disponíveis

**Funcionalidades:**
- Filtros: Ordenação, tipo de pacote, distância máxima
- Paginação
- Cards expandíveis (ver detalhes completos)

**Componentes:**
- `<DeliveryRequestCard expandable />` - Card completo
- `<CatalogPagination />` (existente)
- `<EmptyState />` (existente)

**Estado Local:**
```typescript
const [requests, setRequests] = useState<DeliveryRequest[]>([]);
const [filters, setFilters] = useState({
  sortBy: 'nearest',
  packageType: 'all',
  maxDistance: ''
});
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [loading, setLoading] = useState(true);
```

**API Calls:**
- `GET /api/delivery/requests?sortBy={sortBy}&packageType={packageType}&page={page}&limit=10`

**Rota:** `/app/delivery/requests`

---

#### **Página 6: ActiveDeliveryPage** (`/app/delivery/active/:id`)

**Propósito:** Fluxo de execução de entrega (aceita → coleta → entrega)

**Estados da Entrega:**
```
accepted → picked_up → in_transit → delivered
```

**Seções por Status:**

**Status: `accepted`**
- Botão: "Confirmar Coleta"
- Mostra endereço de coleta
- Contato do remetente

**Status: `picked_up` / `in_transit`**
- Botão: "Confirmar Entrega"
- Mostra endereço de entrega
- Tempo decorrido
- Contato do destinatário

**Status: `delivered`**
- Formulário de confirmação:
  - Upload de foto (opcional)
  - Assinatura digital (canvas)
  - Observações
- Botão: "Finalizar Entrega"

**Componentes:**
- `<DeliveryStatusTimeline />` - Timeline visual
- `<AddressCard />` - Card de endereço
- `<ContactCard />` - Card de contato
- `<SignatureCanvas />` - Canvas para assinatura

**Estado Local:**
```typescript
const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
const [uploading, setUploading] = useState(false);
const [signature, setSignature] = useState<string | null>(null);
```

**API Calls:**
- `GET /api/delivery/requests/:id` (carregar)
- `POST /api/delivery/requests/:id/pickup` (confirmar coleta)
- `POST /api/delivery/requests/:id/deliver` (confirmar entrega)

**Navegação pós-sucesso:** `/app/delivery/dashboard`

**Rota:** `/app/delivery/active/:id`

---

#### **Página 7: DeliveryPartnersPage** (`/app/sellers/:slug/delivery`)

**Propósito:** Lojista gerencia entregadores vinculados

**Tabs:**
1. **Solicitações Pendentes** - Aprovar/rejeitar
2. **Entregadores Ativos** - Listar e gerenciar
3. **Métricas** - Dashboard de performance

**Componentes:**
- `<PartnerRequestCard />` - Card de solicitação
- `<PartnerTable />` - Tabela de ativos
- `<PartnerMetricsCard />` - KPIs

**Estado Local:**
```typescript
const [pendingRequests, setPendingRequests] = useState<StoreDeliveryPartner[]>([]);
const [activePartners, setActivePartners] = useState<StoreDeliveryPartner[]>([]);
const [stats, setStats] = useState({
  total: 0,
  active: 0,
  deliveriesToday: 0
});
const [activeTab, setActiveTab] = useState('pending');
```

**API Calls:**
- `GET /api/stores/:storeId/delivery-partners?status=pending` (pendentes)
- `GET /api/stores/:storeId/delivery-partners?status=active` (ativos)
- `PATCH /api/stores/:storeId/delivery-partners/:partnerId` (aprovar/pausar/remover)

**Integração:** Nova tab em `SellerManagePage.tsx` existente

**Rota:** `/app/sellers/:slug` (nova tab)

---

## 3. COMPONENTES REUTILIZÁVEIS

### 3.1 DeliveryRequestCard

**Arquivo:** `src/components/delivery/DeliveryRequestCard.tsx`

**Props:**
```typescript
interface DeliveryRequestCardProps {
  request: DeliveryRequest;
  compact?: boolean;        // Versão compacta (dashboard)
  expandable?: boolean;     // Permite expandir detalhes
  onAccept?: () => void;
  onViewDetails?: () => void;
}
```

**Variantes:**

**Compact (dashboard):**
```tsx
<Card>
  <CardContent className="p-4">
    {isPriority && <Badge>🔥 PRIORITÁRIA</Badge>}
    <div className="flex justify-between">
      <div>
        <p>{pickup} → {delivery}</p>
        <p className="text-xs">{weight}kg | {distance}km | {time}min</p>
      </div>
      <p className="text-2xl font-bold">{fee} BZR</p>
    </div>
    <div className="flex gap-2 mt-4">
      <Button size="sm" variant="outline">Ver Detalhes</Button>
      <Button size="sm">Aceitar</Button>
    </div>
  </CardContent>
</Card>
```

**Expandable (lista):**
- Adiciona Collapsible com endereços completos
- Mostra observações
- Exibe prazo de expiração

---

### 3.2 StepIndicator

**Arquivo:** `src/components/delivery/StepIndicator.tsx`

**Props:**
```typescript
interface StepIndicatorProps {
  steps: string[];           // ["Endereços", "Detalhes", "Confirmação"]
  currentStep: number;       // 1, 2, 3...
}
```

**Visual:**
```
●━━━━●━━━━○  [2/3] Detalhes
```

---

### 3.3 AddressAutocomplete

**Arquivo:** `src/components/delivery/AddressAutocomplete.tsx`

**Props:**
```typescript
interface AddressAutocompleteProps {
  value: Address | null;
  onChange: (address: Address) => void;
  placeholder?: string;
}
```

**Funcionalidade (v1 - básico):**
- Input text simples
- Usuário digita endereço manualmente
- Formato esperado: "Rua, Número, Bairro, Cidade, Estado, CEP"

**Funcionalidade (v2 - futuro):**
- Integração com API de endereços (ViaCEP)
- Autocomplete baseado em CEP
- Geocoding para lat/lng

---

### 3.4 FeeBreakdownCard

**Arquivo:** `src/components/delivery/FeeBreakdownCard.tsx`

**Props:**
```typescript
interface FeeBreakdownCardProps {
  feeResult: DeliveryFeeResult;
}
```

**Visual:**
```tsx
<Card className="bg-primary/5">
  <CardContent>
    <div className="text-center">
      <p className="text-4xl font-bold">{totalBzr} BZR</p>
      <p className="text-sm">📍 {distance}km | ⏱️ ~{time}min</p>
    </div>
    <Separator />
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Taxa base</span>
        <span>{baseFee} BZR</span>
      </div>
      {/* ... outros itens */}
    </div>
  </CardContent>
</Card>
```

---

### 3.5 KPICard

**Arquivo:** `src/components/delivery/KPICard.tsx`

**Props:**
```typescript
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  trend?: string;          // "+3 vs ontem"
}
```

**Visual:**
```tsx
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <Icon className="h-8 w-8 text-primary" />
      {badge && <Badge>{badge}</Badge>}
    </div>
    <p className="text-2xl font-bold mt-4">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
    {trend && <p className="text-xs text-green-600">{trend}</p>}
  </CardContent>
</Card>
```

---

### 3.6 DeliveryStatusTimeline

**Arquivo:** `src/components/delivery/DeliveryStatusTimeline.tsx`

**Props:**
```typescript
interface DeliveryStatusTimelineProps {
  currentStatus: DeliveryRequestStatus;
  timestamps: {
    createdAt: string;
    acceptedAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
  };
}
```

**Visual:**
```
●━━━━●━━━━●━━━━○━━━━○
Criado  Aceito Coletado [Em Trânsito] Entregue
10:00   10:05  10:30
```

---

### 3.7 VehicleTypeSelector

**Arquivo:** `src/components/delivery/VehicleTypeSelector.tsx`

**Props:**
```typescript
interface VehicleTypeSelectorProps {
  value: VehicleType;
  onChange: (type: VehicleType) => void;
}
```

**Visual:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <VehicleCard
    icon={<Bike />}
    label="Bicicleta"
    selected={value === 'bike'}
    onClick={() => onChange('bike')}
  />
  {/* ... outros tipos */}
</div>
```

---

### 3.8 ActiveDeliveryCard

**Arquivo:** `src/components/delivery/ActiveDeliveryCard.tsx`

**Props:**
```typescript
interface ActiveDeliveryCardProps {
  delivery: DeliveryRequest;
  onContinue: () => void;
}
```

**Visual:**
```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <Badge>{statusLabels[delivery.status]}</Badge>
        <p className="font-medium mt-2">#{delivery.id.slice(0, 8)}</p>
        <p className="text-sm text-muted-foreground">
          {pickup} → {delivery}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Iniciado há {elapsed}
        </p>
      </div>
      <Button onClick={onContinue}>Continuar →</Button>
    </div>
  </CardContent>
</Card>
```

---

### 3.9 PartnerRequestCard

**Arquivo:** `src/components/delivery/PartnerRequestCard.tsx`

**Props:**
```typescript
interface PartnerRequestCardProps {
  request: StoreDeliveryPartner & {
    deliveryPerson: Profile & { deliveryProfile: DeliveryProfile };
  };
  onApprove: (priority: number) => void;
  onReject: (reason: string) => void;
}
```

**Visual:**
```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarImage src={deliveryPerson.avatarUrl} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium">{deliveryPerson.displayName}</p>
        <p className="text-sm text-muted-foreground">
          {vehicleType} | ⭐ {avgRating} | {totalDeliveries} entregas
        </p>
        {notes && <p className="text-xs mt-1">"{notes}"</p>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onReject}>
          Rejeitar
        </Button>
        <Button size="sm" onClick={() => onApprove(1)}>
          Aprovar
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### 3.10 AddressCard

**Arquivo:** `src/components/delivery/AddressCard.tsx`

**Props:**
```typescript
interface AddressCardProps {
  address: Address;
  title: string;           // "Endereço de Coleta"
  icon?: React.ReactNode;
  contact?: {
    name: string;
    phone: string;
  };
}
```

**Visual:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MapPin className="h-5 w-5" />
      {title}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="font-medium">{formatAddress(address)}</p>
    {contact && (
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={`tel:${contact.phone}`}>📞 Ligar</a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`https://wa.me/${contact.phone}`}>💬 WhatsApp</a>
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

---

### 3.11 EmptyState (reuso)

**Existente em:** `src/components/store/EmptyState.tsx`

**Reuso para delivery:**
```tsx
<EmptyState
  icon={<Package />}
  title="Nenhuma demanda no momento"
  description="Você será notificado quando houver novas entregas"
  action={
    <Button onClick={() => navigate('/app/delivery/requests')}>
      Ver Todas as Demandas
    </Button>
  }
/>
```

---

### 3.12 CatalogPagination (reuso)

**Existente em:** `src/components/store/CatalogPagination.tsx`

Reuso direto para paginação de demandas.

---

## 4. FLUXOS DE USUÁRIO

### 4.1 Fluxo: Solicitar Entrega Direta

```
1. Dashboard → Quick Action "Solicitar Entrega"
2. /app/delivery/request/new
3. Step 1: Preenche endereços → Próximo
4. Step 2: Seleciona tipo, peso → Calcular Valor
5. Sistema chama POST /api/delivery/calculate-fee
6. Step 3: Vê cotação → Confirmar Solicitação
7. Sistema chama POST /api/delivery/requests
8. Sucesso → Redireciona para /app/delivery/tracking/:id
9. Entregadores próximos recebem notificação
```

---

### 4.2 Fluxo: Tornar-se Entregador

```
1. Dashboard → Quick Action "Tornar-me Entregador"
2. /app/delivery/profile/setup
3. Step 1: Dados Pessoais → Próximo
4. Step 2: Veículo → Próximo
5. Step 3: Capacidades → Próximo
6. Step 4: Área de Atuação → Concluir Cadastro
7. Sistema chama POST /api/delivery/profile
8. Sucesso → Redireciona para /app/delivery/dashboard
9. Modal de boas-vindas: "Ative sua disponibilidade para começar"
```

---

### 4.3 Fluxo: Aceitar e Executar Entrega

```
1. /app/delivery/dashboard → Notificação "Nova Demanda"
2. Clica "Aceitar" → POST /api/delivery/requests/:id/accept
3. Status muda para "accepted"
4. Navegado para /app/delivery/active/:id
5. Tela mostra endereço de coleta + botão "Confirmar Coleta"
6. Chega no local → Clica "Confirmar Coleta"
7. POST /api/delivery/requests/:id/pickup
8. Status muda para "in_transit"
9. Order.status atualizado para "SHIPPED" (se aplicável)
10. Tela mostra endereço de entrega + botão "Confirmar Entrega"
11. Chega no destino → Clica "Confirmar Entrega"
12. Formulário: Assinatura + Foto (opcional) + Observações
13. POST /api/delivery/requests/:id/deliver
14. Status muda para "delivered"
15. Escrow libera pagamento
16. Tela de sucesso + avaliação
17. Redireciona para /app/delivery/dashboard
```

---

### 4.4 Fluxo: Lojista Aprova Entregador

```
1. /app/sellers/:slug → Tab "Entregadores"
2. Vê solicitação pendente de João
3. Clica "Aprovar"
4. Modal: "Definir prioridade" (1, 2, 3...)
5. PATCH /api/stores/:storeId/delivery-partners/:partnerId
   { status: 'active', priority: 1 }
6. João aparece na lista de "Entregadores Ativos"
7. Próximo pedido da loja → João é notificado primeiro (2min)
```

---

## 5. INTEGRAÇÕES COM BACKEND

### 5.1 API Helper

**Arquivo:** `src/lib/api/delivery.ts`

```typescript
import { getJSON, postJSON, patchJSON } from '@/lib/api';

export const deliveryApi = {
  // Delivery Requests
  calculateFee: (data: CalculateFeePayload) =>
    postJSON<DeliveryFeeResult>('/api/delivery/calculate-fee', data),

  createRequest: (data: CreateDeliveryRequestPayload) =>
    postJSON<DeliveryRequest>('/api/delivery/requests', data),

  listRequests: (params: {
    status?: string;
    forMe?: boolean;
    radius?: number;
    page?: number;
    limit?: number;
  }) =>
    getJSON<{ data: DeliveryRequest[]; pagination: Pagination }>(
      '/api/delivery/requests',
      params
    ),

  getRequest: (id: string) =>
    getJSON<DeliveryRequest>(`/api/delivery/requests/${id}`),

  acceptRequest: (id: string) =>
    postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/accept`, {}),

  confirmPickup: (id: string, data: ConfirmPickupPayload) =>
    postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/pickup`, data),

  confirmDelivery: (id: string, data: ConfirmDeliveryPayload) =>
    postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/deliver`, data),

  cancelRequest: (id: string, reason: string) =>
    postJSON<DeliveryRequest>(`/api/delivery/requests/${id}/cancel`, { reason }),

  // Delivery Profile
  getProfile: () =>
    getJSON<DeliveryProfile>('/api/delivery/profile'),

  createProfile: (data: CreateDeliveryProfilePayload) =>
    postJSON<DeliveryProfile>('/api/delivery/profile', data),

  updateProfile: (data: Partial<CreateDeliveryProfilePayload>) =>
    patchJSON<DeliveryProfile>('/api/delivery/profile', data),

  updateAvailability: (isAvailable: boolean, coords?: { lat: number; lng: number }) =>
    patchJSON<DeliveryProfile>('/api/delivery/profile/availability', {
      isAvailable,
      isOnline: true,
      ...coords,
    }),

  getStats: () =>
    getJSON<DeliveryProfileStats>('/api/delivery/profile/stats'),

  // Store Partners
  listStorePartners: (storeId: string, status?: string) =>
    getJSON<StoreDeliveryPartner[]>(
      `/api/stores/${storeId}/delivery-partners`,
      status ? { status } : undefined
    ),

  requestPartnership: (storeId: string, message?: string) =>
    postJSON<StoreDeliveryPartner>(
      `/api/stores/${storeId}/delivery-partners/request`,
      { message }
    ),

  updatePartner: (storeId: string, partnerId: string, data: UpdatePartnerPayload) =>
    patchJSON<StoreDeliveryPartner>(
      `/api/stores/${storeId}/delivery-partners/${partnerId}`,
      data
    ),
};
```

---

### 5.2 Custom Hook: useDeliveryProfile

**Arquivo:** `src/hooks/useDeliveryProfile.ts`

```typescript
import { useEffect, useState } from 'react';
import { deliveryApi } from '@/lib/api/delivery';

export function useDeliveryProfile() {
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await deliveryApi.getProfile();
      setProfile(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setProfile(null); // Não tem perfil ainda
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    if (!profile) return;

    try {
      const updated = await deliveryApi.updateAvailability(
        !profile.isAvailable,
        // TODO: Pegar coordenadas do GPS
      );
      setProfile(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const refetch = loadProfile;

  return {
    profile,
    loading,
    error,
    hasProfile: profile !== null,
    toggleAvailability,
    refetch,
  };
}
```

---

## 6. ESTRUTURA DE ARQUIVOS

```
apps/web/src/
├── pages/
│   ├── delivery/
│   │   ├── DeliveryLandingPage.tsx              # Público
│   │   ├── RequestDeliveryPage.tsx              # /app/delivery/request/new
│   │   ├── DeliveryProfileSetupPage.tsx         # /app/delivery/profile/setup
│   │   ├── DeliveryProfileEditPage.tsx          # /app/delivery/profile/edit
│   │   ├── DeliveryDashboardPage.tsx            # /app/delivery/dashboard
│   │   ├── DeliveryRequestsListPage.tsx         # /app/delivery/requests
│   │   ├── DeliveryRequestDetailPage.tsx        # /app/delivery/requests/:id
│   │   ├── ActiveDeliveryPage.tsx               # /app/delivery/active/:id
│   │   ├── DeliveryHistoryPage.tsx              # /app/delivery/history
│   │   └── DeliveryEarningsPage.tsx             # /app/delivery/earnings
│   └── seller/
│       └── DeliveryPartnersPage.tsx             # Tab em SellerManagePage
│
├── components/
│   ├── delivery/
│   │   ├── DeliveryRequestCard.tsx
│   │   ├── StepIndicator.tsx
│   │   ├── AddressAutocomplete.tsx
│   │   ├── FeeBreakdownCard.tsx
│   │   ├── KPICard.tsx
│   │   ├── DeliveryStatusTimeline.tsx
│   │   ├── VehicleTypeSelector.tsx
│   │   ├── ActiveDeliveryCard.tsx
│   │   ├── PartnerRequestCard.tsx
│   │   ├── PartnerTable.tsx
│   │   ├── AddressCard.tsx
│   │   ├── ContactCard.tsx
│   │   ├── SignatureCanvas.tsx
│   │   └── QuickActionButton.tsx
│   └── dashboard/
│       └── QuickActionsGrid.tsx                 # Modificar
│
├── hooks/
│   ├── useDeliveryProfile.ts
│   ├── useDeliveryRequests.ts
│   └── useStorePartners.ts
│
├── lib/
│   └── api/
│       └── delivery.ts
│
└── types/
    └── delivery.ts
```

---

## 7. TIPOS TYPESCRIPT

**Arquivo:** `src/types/delivery.ts`

```typescript
export type DeliveryRequestStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type PackageType =
  | 'envelope'
  | 'small_box'
  | 'medium_box'
  | 'large_box'
  | 'fragile'
  | 'perishable'
  | 'custom';

export type VehicleType = 'bike' | 'motorcycle' | 'car' | 'van' | 'truck';

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  lat?: number;
  lng?: number;
  contactName?: string;
  contactPhone?: string;
}

export interface DeliveryRequest {
  id: string;
  sourceType: 'order' | 'direct';
  orderId?: string;
  pickupAddress: Address;
  deliveryAddress: Address;
  senderId: string;
  senderType: 'store' | 'profile';
  recipientId: string;
  packageType: PackageType;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  estimatedValue?: string;
  notes?: string;
  requiresSignature: boolean;
  deliveryFeeBzr: string;
  distance?: number;
  status: DeliveryRequestStatus;
  deliveryPersonId?: string;
  deliveryPerson?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    avgRating: number;
  };
  preferredDeliverers: string[];
  isPrivateNetwork: boolean;
  notifiedDeliverers: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  proofOfDelivery?: {
    signature?: string;
    photo_urls?: string[];
    timestamp: string;
    recipientName?: string;
  };
  rating?: number;
  reviewComment?: string;
  isPriority?: boolean; // Calculado no frontend
  estimatedTime?: number; // Calculado no frontend
}

export interface DeliveryProfile {
  id: string;
  profileId: string;
  fullName: string;
  documentType: 'cpf' | 'cnpj' | 'passport';
  documentNumber: string;
  phoneNumber: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  vehicleType: VehicleType;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  maxWeight: number;
  maxVolume: number;
  canCarryFragile: boolean;
  canCarryPerishable: boolean;
  hasInsulatedBag: boolean;
  isAvailable: boolean;
  isOnline: boolean;
  currentLat?: number;
  currentLng?: number;
  lastLocationUpdate?: string;
  serviceRadius: number;
  serviceCities: string[];
  serviceStates: string[];
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  avgRating: number;
  totalRatings: number;
  onTimeRate: number;
  acceptanceRate: number;
  completionRate: number;
  avgDeliveryTime?: number;
  totalDistance: number;
  walletAddress?: string;
  totalEarnings: string;
  pendingEarnings: string;
  isVerified: boolean;
  verificationLevel: 'basic' | 'intermediate' | 'advanced';
  accountStatus: 'active' | 'suspended' | 'banned' | 'under_review';
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface StoreDeliveryPartner {
  id: string;
  storeId: string;
  deliveryPersonId: string;
  deliveryPerson?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    handle?: string;
    deliveryProfile?: DeliveryProfile;
  };
  status: 'pending' | 'active' | 'paused' | 'suspended' | 'rejected';
  priority: number;
  commissionPercent: number;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  avgRating: number;
  onTimeRate: number;
  requestedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
  rejectionReason?: string;
}

export interface DeliveryFeeResult {
  totalBzr: string;
  distance: number;
  estimatedTime: number;
  breakdown: {
    baseFee: string;
    distanceFee: string;
    weightFee: string;
    packageTypeFee: string;
  };
}

export interface DeliveryProfileStats {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  avgRating: number;
  totalRatings: number;
  onTimeRate: number;
  acceptanceRate: number;
  completionRate: number;
  totalEarnings: string;
  pendingEarnings: string;
  earningsToday: string;
  deliveriesToday: number;
  rankings?: {
    city?: number;
    overall?: number;
  };
}

// Payloads
export interface CalculateFeePayload {
  pickupAddress: Address;
  deliveryAddress: Address;
  packageType: PackageType;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface CreateDeliveryRequestPayload {
  pickupAddress: Address;
  deliveryAddress: Address;
  packageType: PackageType;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  estimatedValue?: string;
  notes?: string;
  requiresSignature?: boolean;
  preferredDelivererId?: string;
}

export interface CreateDeliveryProfilePayload {
  fullName: string;
  documentType: 'cpf' | 'cnpj' | 'passport';
  documentNumber: string;
  phoneNumber: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  vehicleType: VehicleType;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  maxWeight: number;
  maxVolume: number;
  canCarryFragile?: boolean;
  canCarryPerishable?: boolean;
  hasInsulatedBag?: boolean;
  serviceRadius: number;
  serviceCities: string[];
  serviceStates?: string[];
  walletAddress?: string;
}

export interface ConfirmPickupPayload {
  lat: number;
  lng: number;
  notes?: string;
  photo?: string;
}

export interface ConfirmDeliveryPayload {
  lat: number;
  lng: number;
  signature?: string;
  photo?: string;
  notes?: string;
  recipientName?: string;
}

export interface UpdatePartnerPayload {
  status?: 'active' | 'paused' | 'rejected';
  priority?: number;
  commissionPercent?: number;
  notes?: string;
  rejectionReason?: string;
}
```

---

## 8. VALIDAÇÕES E SCHEMAS

**Arquivo:** `src/lib/validations/delivery.ts`

```typescript
import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(3, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado inválido'),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  country: z.string().default('BR'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

export const createDeliveryRequestSchema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  packageType: z.enum([
    'envelope',
    'small_box',
    'medium_box',
    'large_box',
    'fragile',
    'perishable',
    'custom',
  ]),
  weight: z.number().min(0.1).max(500).optional(),
  estimatedValue: z.string().optional(),
  notes: z.string().max(500).optional(),
  requiresSignature: z.boolean().default(true),
});

export const createDeliveryProfileSchema = z.object({
  fullName: z.string().min(3, 'Nome completo obrigatório'),
  documentType: z.enum(['cpf', 'cnpj', 'passport']),
  documentNumber: z.string().min(11, 'Documento inválido'),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, 'Telefone inválido'),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  vehicleType: z.enum(['bike', 'motorcycle', 'car', 'van', 'truck']),
  vehiclePlate: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  vehicleColor: z.string().optional(),
  maxWeight: z.number().min(1).max(1000),
  maxVolume: z.number().min(0.1).max(50),
  canCarryFragile: z.boolean().default(false),
  canCarryPerishable: z.boolean().default(false),
  hasInsulatedBag: z.boolean().default(false),
  serviceRadius: z.number().min(1).max(100),
  serviceCities: z.array(z.string()).min(1, 'Pelo menos uma cidade obrigatória'),
  serviceStates: z.array(z.string()).optional(),
  walletAddress: z.string().optional(),
});

// Schemas por step (para setup multi-step)
export const deliveryProfileStep1Schema = createDeliveryProfileSchema.pick({
  fullName: true,
  documentType: true,
  documentNumber: true,
  phoneNumber: true,
  emergencyContact: true,
});

export const deliveryProfileStep2Schema = createDeliveryProfileSchema.pick({
  vehicleType: true,
  vehiclePlate: true,
  vehicleModel: true,
  vehicleYear: true,
  vehicleColor: true,
});

export const deliveryProfileStep3Schema = createDeliveryProfileSchema.pick({
  maxWeight: true,
  maxVolume: true,
  canCarryFragile: true,
  canCarryPerishable: true,
  hasInsulatedBag: true,
});

export const deliveryProfileStep4Schema = createDeliveryProfileSchema.pick({
  serviceRadius: true,
  serviceCities: true,
  serviceStates: true,
  walletAddress: true,
});
```

---

## 9. ESTADOS E CONTEXT

### 9.1 DeliveryContext (opcional - futuro)

Para compartilhar estado entre páginas (ex: polling de demandas):

```typescript
// src/contexts/DeliveryContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface DeliveryContextType {
  profile: DeliveryProfile | null;
  availableRequests: DeliveryRequest[];
  activeDeliveries: DeliveryRequest[];
  refetch: () => void;
}

const DeliveryContext = createContext<DeliveryContextType | null>(null);

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useDeliveryProfile();
  const [availableRequests, setAvailableRequests] = useState<DeliveryRequest[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryRequest[]>([]);

  useEffect(() => {
    if (profile?.isAvailable) {
      // Polling a cada 30s
      const interval = setInterval(loadRequests, 30000);
      loadRequests();
      return () => clearInterval(interval);
    }
  }, [profile?.isAvailable]);

  const loadRequests = async () => {
    // ...
  };

  const refetch = loadRequests;

  return (
    <DeliveryContext.Provider value={{ profile, availableRequests, activeDeliveries, refetch }}>
      {children}
    </DeliveryContext.Provider>
  );
}

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) throw new Error('useDelivery must be used within DeliveryProvider');
  return context;
};
```

**Uso em App.tsx:**
```tsx
<DeliveryProvider>
  <Routes>
    {/* ... */}
  </Routes>
</DeliveryProvider>
```

---

## 10. TESTES

### 10.1 Testes de Componentes (Vitest + Testing Library)

**Exemplo:** `DeliveryRequestCard.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DeliveryRequestCard } from './DeliveryRequestCard';
import { mockDeliveryRequest } from '@/test/mocks/delivery';

describe('DeliveryRequestCard', () => {
  it('renders request information correctly', () => {
    render(<DeliveryRequestCard request={mockDeliveryRequest} />);

    expect(screen.getByText(/12.50 BZR/i)).toBeInTheDocument();
    expect(screen.getByText(/5.2km/i)).toBeInTheDocument();
    expect(screen.getByText(/2.5kg/i)).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', () => {
    const onAccept = vi.fn();
    render(<DeliveryRequestCard request={mockDeliveryRequest} onAccept={onAccept} />);

    fireEvent.click(screen.getByText(/aceitar/i));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('shows priority badge when isPriority is true', () => {
    render(
      <DeliveryRequestCard request={{ ...mockDeliveryRequest, isPriority: true }} />
    );

    expect(screen.getByText(/prioritária/i)).toBeInTheDocument();
  });
});
```

---

### 10.2 Testes de Hook (useDeliveryProfile)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useDeliveryProfile } from './useDeliveryProfile';
import { deliveryApi } from '@/lib/api/delivery';
import { vi } from 'vitest';

vi.mock('@/lib/api/delivery');

describe('useDeliveryProfile', () => {
  it('loads profile on mount', async () => {
    const mockProfile = { id: '1', fullName: 'João' };
    vi.mocked(deliveryApi.getProfile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useDeliveryProfile());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual(mockProfile);
    });
  });

  it('handles 404 error (no profile)', async () => {
    vi.mocked(deliveryApi.getProfile).mockRejectedValue({
      response: { status: 404 },
    });

    const { result } = renderHook(() => useDeliveryProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toBeNull();
      expect(result.current.hasProfile).toBe(false);
    });
  });
});
```

---

### 10.3 Testes E2E (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Delivery Flow', () => {
  test('should allow user to request delivery', async ({ page }) => {
    await page.goto('/app/delivery/request/new');

    // Step 1: Endereços
    await page.fill('[name="pickupStreet"]', 'Rua das Flores');
    await page.fill('[name="pickupNumber"]', '123');
    await page.fill('[name="pickupCity"]', 'Rio de Janeiro');
    await page.fill('[name="pickupState"]', 'RJ');
    await page.fill('[name="pickupZipCode"]', '20000-000');

    await page.fill('[name="deliveryStreet"]', 'Av. Atlântica');
    await page.fill('[name="deliveryNumber"]', '456');
    await page.fill('[name="deliveryCity"]', 'Rio de Janeiro');
    await page.fill('[name="deliveryState"]', 'RJ');
    await page.fill('[name="deliveryZipCode"]', '22010-000');

    await page.click('button:has-text("Próximo")');

    // Step 2: Detalhes
    await page.selectOption('[name="packageType"]', 'small_box');
    await page.fill('[name="weight"]', '2.5');
    await page.click('button:has-text("Calcular Valor")');

    // Step 3: Confirmação
    await expect(page.locator('text=/BZR/i')).toBeVisible();
    await page.click('button:has-text("Confirmar Solicitação")');

    // Sucesso
    await expect(page).toHaveURL(/\/app\/delivery\/tracking\//);
    await expect(page.locator('text=/solicitação enviada/i')).toBeVisible();
  });

  test('should allow deliverer to accept request', async ({ page }) => {
    // Login como entregador
    await page.goto('/app/delivery/dashboard');

    // Verifica que há demandas
    await expect(page.locator('text=/novas demandas/i')).toBeVisible();

    // Aceita primeira demanda
    await page.click('button:has-text("Aceitar")');

    // Confirma que foi redirecionado
    await expect(page).toHaveURL(/\/app\/delivery\/active\//);
    await expect(page.locator('text=/confirmar coleta/i')).toBeVisible();
  });
});
```

---

## 11. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Estrutura Base
- [ ] Criar tipos TypeScript (`src/types/delivery.ts`)
- [ ] Criar API helper (`src/lib/api/delivery.ts`)
- [ ] Criar validations (`src/lib/validations/delivery.ts`)
- [ ] Criar hook `useDeliveryProfile`
- [ ] Adicionar rotas no `App.tsx`

### Fase 2: Componentes Básicos
- [ ] `StepIndicator`
- [ ] `KPICard`
- [ ] `AddressCard`
- [ ] `FeeBreakdownCard`
- [ ] `DeliveryStatusTimeline`

### Fase 3: Páginas Principais
- [ ] `DeliveryLandingPage` (público)
- [ ] `RequestDeliveryPage` (3 steps)
- [ ] `DeliveryProfileSetupPage` (4 steps)
- [ ] `DeliveryDashboardPage`

### Fase 4: Componentes Avançados
- [ ] `DeliveryRequestCard` (compact + expandable)
- [ ] `ActiveDeliveryCard`
- [ ] `VehicleTypeSelector`
- [ ] `AddressAutocomplete`

### Fase 5: Fluxo de Entrega
- [ ] `DeliveryRequestsListPage`
- [ ] `ActiveDeliveryPage` (fluxo completo)
- [ ] `SignatureCanvas`

### Fase 6: Lojista
- [ ] `DeliveryPartnersPage`
- [ ] `PartnerRequestCard`
- [ ] `PartnerTable`
- [ ] Integração com `SellerManagePage`

### Fase 7: Integrações
- [ ] Modificar `DashboardPage` (Quick Action)
- [ ] Modificar `OrderPage` (seção delivery)
- [ ] Modificar `MobileBottomNav` (nova tab)

### Fase 8: Testes
- [ ] Testes unitários de componentes
- [ ] Testes de hooks
- [ ] Testes E2E principais fluxos

### Fase 9: Polimento
- [ ] Responsividade mobile
- [ ] Loading states
- [ ] Error boundaries
- [ ] Acessibilidade (ARIA)

### Fase 10: Documentação
- [ ] README de cada componente
- [ ] Storybook (opcional)
- [ ] Guia de uso para desenvolvedores

---

## 12. PRIORIZAÇÃO

### Must Have (MVP)
1. ✅ RequestDeliveryPage (solicitar entrega)
2. ✅ DeliveryProfileSetupPage (cadastro entregador)
3. ✅ DeliveryDashboardPage (dashboard entregador)
4. ✅ ActiveDeliveryPage (executar entrega)
5. ✅ DeliveryPartnersPage (lojista gerenciar)

### Should Have (Pós-MVP)
- DeliveryRequestsListPage (lista completa)
- DeliveryHistoryPage (histórico)
- DeliveryEarningsPage (ganhos)
- AddressAutocomplete (com API)

### Could Have (Futuro)
- Real-time tracking (GPS + WebSocket)
- Push notifications
- Chat em tempo real
- Integração com mapas
- Gamificação

---

## FIM DA ESPECIFICAÇÃO TÉCNICA

**Próximo passo:** Dividir em prompts de implementação por fase.
