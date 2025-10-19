# FASE 1 - ESTRUTURA BASE DO DELIVERY UI

## 🎯 OBJETIVO

Criar a estrutura base necessária para implementar o UI do Delivery Network:
- Tipos TypeScript
- API helpers
- Validações Zod
- Hook customizado
- Rotas no App.tsx

**Tempo estimado:** 30-45 minutos

---

## 📋 TAREFAS

### 1. Criar Tipos TypeScript

**Arquivo:** `apps/web/src/types/delivery.ts`

Criar arquivo completo com todos os tipos conforme especificado na seção **"7. TIPOS TYPESCRIPT"** do documento `ESPECIFICACAO_TECNICA_UI_DELIVERY_NETWORK.md`.

**Incluir:**
- Enums: `DeliveryRequestStatus`, `PackageType`, `VehicleType`
- Interfaces: `Address`, `DeliveryRequest`, `DeliveryProfile`, `StoreDeliveryPartner`, `DeliveryFeeResult`, `DeliveryProfileStats`
- Payloads: `CalculateFeePayload`, `CreateDeliveryRequestPayload`, `CreateDeliveryProfilePayload`, `ConfirmPickupPayload`, `ConfirmDeliveryPayload`, `UpdatePartnerPayload`

---

### 2. Criar API Helper

**Arquivo:** `apps/web/src/lib/api/delivery.ts`

Criar módulo de API conforme seção **"5.1 API Helper"** da especificação.

**Métodos a implementar:**
```typescript
export const deliveryApi = {
  // Delivery Requests
  calculateFee,
  createRequest,
  listRequests,
  getRequest,
  acceptRequest,
  confirmPickup,
  confirmDelivery,
  cancelRequest,

  // Delivery Profile
  getProfile,
  createProfile,
  updateProfile,
  updateAvailability,
  getStats,

  // Store Partners
  listStorePartners,
  requestPartnership,
  updatePartner,
};
```

**Importar helpers existentes:**
```typescript
import { getJSON, postJSON, patchJSON } from '@/lib/api';
```

---

### 3. Criar Validações Zod

**Arquivo:** `apps/web/src/lib/validations/delivery.ts`

Criar schemas de validação conforme seção **"8. VALIDAÇÕES E SCHEMAS"**.

**Schemas a criar:**
- `addressSchema`
- `createDeliveryRequestSchema`
- `createDeliveryProfileSchema`
- `deliveryProfileStep1Schema`
- `deliveryProfileStep2Schema`
- `deliveryProfileStep3Schema`
- `deliveryProfileStep4Schema`

**Importar:**
```typescript
import { z } from 'zod';
```

---

### 4. Criar Hook Customizado

**Arquivo:** `apps/web/src/hooks/useDeliveryProfile.ts`

Criar hook conforme seção **"5.2 Custom Hook: useDeliveryProfile"**.

**Funcionalidades:**
- Carregar perfil do entregador logado
- Toggle de disponibilidade
- Refetch manual
- Estados: `profile`, `loading`, `error`, `hasProfile`

**Retorno:**
```typescript
return {
  profile: DeliveryProfile | null,
  loading: boolean,
  error: string | null,
  hasProfile: boolean,
  toggleAvailability: () => Promise<void>,
  refetch: () => Promise<void>
};
```

---

### 5. Adicionar Rotas no App.tsx

**Arquivo:** `apps/web/src/App.tsx`

Adicionar rotas do delivery dentro do bloco `/app/*`:

```tsx
// Importar no topo
import { DeliveryLandingPage } from './pages/delivery/DeliveryLandingPage';
import { RequestDeliveryPage } from './pages/delivery/RequestDeliveryPage';
import { DeliveryProfileSetupPage } from './pages/delivery/DeliveryProfileSetupPage';
import { DeliveryDashboardPage } from './pages/delivery/DeliveryDashboardPage';
import { DeliveryRequestsListPage } from './pages/delivery/DeliveryRequestsListPage';
import { ActiveDeliveryPage } from './pages/delivery/ActiveDeliveryPage';
import { DeliveryHistoryPage } from './pages/delivery/DeliveryHistoryPage';
import { DeliveryEarningsPage } from './pages/delivery/DeliveryEarningsPage';

// Adicionar rota pública (antes de /app/*)
<Route path="/delivery" element={<DeliveryLandingPage />} />

// Adicionar rotas autenticadas (dentro de /app/*)
<Route path="delivery/request/new" element={<RequestDeliveryPage />} />
<Route path="delivery/profile/setup" element={<DeliveryProfileSetupPage />} />
<Route path="delivery/profile/edit" element={<DeliveryProfileSetupPage />} />
<Route path="delivery/dashboard" element={<DeliveryDashboardPage />} />
<Route path="delivery/requests" element={<DeliveryRequestsListPage />} />
<Route path="delivery/requests/:id" element={<DeliveryRequestDetailPage />} />
<Route path="delivery/active/:id" element={<ActiveDeliveryPage />} />
<Route path="delivery/history" element={<DeliveryHistoryPage />} />
<Route path="delivery/earnings" element={<DeliveryEarningsPage />} />
```

**IMPORTANTE:** Criar apenas os arquivos de placeholder (exports vazios) para evitar erros de compilação. As páginas serão implementadas nas próximas fases.

---

### 6. Criar Placeholders de Páginas

Criar arquivos vazios em `apps/web/src/pages/delivery/`:

**DeliveryLandingPage.tsx:**
```tsx
export function DeliveryLandingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Delivery Landing Page</h1>
      <p className="text-muted-foreground mt-2">Em construção - Fase 3</p>
    </div>
  );
}
```

**RequestDeliveryPage.tsx:**
```tsx
import { RequireAuth } from '@/components/auth/RequireAuth';

export function RequestDeliveryPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Solicitar Entrega</h1>
        <p className="text-muted-foreground mt-2">Em construção - Fase 3</p>
      </div>
    </RequireAuth>
  );
}
```

**Criar placeholders similares para:**
- `DeliveryProfileSetupPage.tsx`
- `DeliveryDashboardPage.tsx`
- `DeliveryRequestsListPage.tsx`
- `DeliveryRequestDetailPage.tsx`
- `ActiveDeliveryPage.tsx`
- `DeliveryHistoryPage.tsx`
- `DeliveryEarningsPage.tsx`

---

## ✅ VALIDAÇÃO

Após implementar, verificar:

1. **Compilação:** `npm run build` sem erros
2. **Tipos:** `npx tsc --noEmit` sem erros
3. **Navegação:** Acessar `/delivery` e rotas `/app/delivery/*` sem 404
4. **API Helper:** Importar `deliveryApi` em qualquer arquivo sem erro
5. **Hook:** Usar `useDeliveryProfile()` funciona (retorna `hasProfile: false` se não tiver perfil)

---

## 🚀 COMANDO PARA EXECUTAR

```bash
# Navegar para o diretório do frontend
cd /home/bazari/bazari/apps/web

# Instalar dependências se necessário
npm install

# Rodar em dev para testar
npm run dev

# Abrir no navegador
# http://localhost:5173/delivery
```

---

## 📝 NOTAS

- Esta fase NÃO implementa UI visual, apenas estrutura
- Todas as páginas são placeholders nesta fase
- Backend já está implementado e funcionando
- Foco: Preparar base sólida para próximas fases

---

## ➡️ PRÓXIMA FASE

**FASE 2:** Componentes Básicos Reutilizáveis
