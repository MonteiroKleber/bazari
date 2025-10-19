# FASE 2 - COMPONENTES BÁSICOS REUTILIZÁVEIS

## 🎯 OBJETIVO

Criar componentes básicos e reutilizáveis que serão usados em múltiplas páginas do Delivery UI:
- StepIndicator
- KPICard
- AddressCard
- FeeBreakdownCard
- DeliveryStatusTimeline

**Tempo estimado:** 1-1.5 horas

---

## 📋 TAREFAS

### 1. Criar StepIndicator

**Arquivo:** `apps/web/src/components/delivery/StepIndicator.tsx`

**Props:**
```typescript
interface StepIndicatorProps {
  steps: string[];        // ["Endereços", "Detalhes", "Confirmação"]
  currentStep: number;    // 1, 2, 3...
}
```

**Implementação:**
```tsx
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <Fragment key={stepNumber}>
            <div className="flex items-center">
              {/* Circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                  isCompleted || isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? '✓' : stepNumber}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'ml-2 text-sm',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-1 mx-4',
                  stepNumber < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
```

**Imports necessários:**
```typescript
import { Fragment } from 'react';
import { cn } from '@/lib/utils';
```

---

### 2. Criar KPICard

**Arquivo:** `apps/web/src/components/delivery/KPICard.tsx`

**Props:**
```typescript
interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  trend?: string;
}
```

**Implementação:**
```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function KPICard({ icon, label, value, subtitle, badge, trend }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-primary">{icon}</div>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>

        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>

        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}

        {trend && (
          <p className="text-xs text-green-600 mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 3. Criar AddressCard

**Arquivo:** `apps/web/src/components/delivery/AddressCard.tsx`

**Props:**
```typescript
import { Address } from '@/types/delivery';

interface AddressCardProps {
  address: Address;
  title: string;
  icon?: React.ReactNode;
  contact?: {
    name: string;
    phone: string;
  };
}
```

**Implementação:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

export function AddressCard({ address, title, icon, contact }: AddressCardProps) {
  const formatAddress = (addr: Address) => {
    return `${addr.street}, ${addr.number}${addr.complement ? ` ${addr.complement}` : ''} - ${addr.neighborhood || ''} - ${addr.city}, ${addr.state} - CEP: ${addr.zipCode}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon || <MapPin className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{formatAddress(address)}</p>

        {contact && (
          <>
            <div className="text-sm">
              <p className="text-muted-foreground">Contato:</p>
              <p className="font-medium">{contact.name}</p>
              <p className="text-muted-foreground">{contact.phone}</p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                asChild
                className="flex-1"
              >
                <a href={`tel:${contact.phone}`}>
                  📞 Ligar
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="flex-1"
              >
                <a
                  href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 WhatsApp
                </a>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 4. Criar FeeBreakdownCard

**Arquivo:** `apps/web/src/components/delivery/FeeBreakdownCard.tsx`

**Props:**
```typescript
import { DeliveryFeeResult } from '@/types/delivery';

interface FeeBreakdownCardProps {
  feeResult: DeliveryFeeResult;
}
```

**Implementação:**
```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function FeeBreakdownCard({ feeResult }: FeeBreakdownCardProps) {
  return (
    <Card className="bg-primary/5 border-primary">
      <CardContent className="pt-6">
        {/* Header - Total */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">Valor da Entrega</p>
          <p className="text-4xl font-bold text-primary">{feeResult.totalBzr} BZR</p>
          <p className="text-sm text-muted-foreground mt-1">
            📍 {feeResult.distance}km | ⏱️ ~{feeResult.estimatedTime}min
          </p>
        </div>

        <Separator className="my-4" />

        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa base</span>
            <span className="font-medium">{feeResult.breakdown.baseFee} BZR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Distância ({feeResult.distance}km)
            </span>
            <span className="font-medium">{feeResult.breakdown.distanceFee} BZR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo de pacote</span>
            <span className="font-medium">{feeResult.breakdown.packageTypeFee} BZR</span>
          </div>
          {feeResult.breakdown.weightFee !== '0.00' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso adicional</span>
              <span className="font-medium">{feeResult.breakdown.weightFee} BZR</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 5. Criar DeliveryStatusTimeline

**Arquivo:** `apps/web/src/components/delivery/DeliveryStatusTimeline.tsx`

**Props:**
```typescript
import { DeliveryRequestStatus } from '@/types/delivery';

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

**Implementação:**
```tsx
import { cn } from '@/lib/utils';

export function DeliveryStatusTimeline({ currentStatus, timestamps }: DeliveryStatusTimelineProps) {
  const steps = [
    { status: 'pending', label: 'Criado', timestamp: timestamps.createdAt },
    { status: 'accepted', label: 'Aceito', timestamp: timestamps.acceptedAt },
    { status: 'picked_up', label: 'Coletado', timestamp: timestamps.pickedUpAt },
    { status: 'in_transit', label: 'Em Trânsito', timestamp: timestamps.pickedUpAt },
    { status: 'delivered', label: 'Entregue', timestamp: timestamps.deliveredAt },
  ];

  const statusOrder = ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.status} className="flex flex-col items-center flex-1">
              {/* Circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-primary text-primary-foreground animate-pulse'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? '✓' : index + 1}
              </div>

              {/* Label */}
              <p
                className={cn(
                  'text-xs mt-2 text-center',
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>

              {/* Timestamp */}
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(step.timestamp)}
                </p>
              )}

              {/* Connector */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute h-1 top-5',
                    'left-[calc(50%+20px)] right-[calc(-50%+20px)]',
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  )}
                  style={{
                    width: 'calc(100% / 5 - 40px)',
                    marginLeft: '20px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### 6. Criar QuickActionButton

**Arquivo:** `apps/web/src/components/delivery/QuickActionButton.tsx`

**Props:**
```typescript
interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
}
```

**Implementação:**
```tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function QuickActionButton({ icon, label, onClick, badge }: QuickActionButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex flex-col items-center justify-center h-24 relative"
    >
      {badge !== undefined && badge > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {badge}
        </Badge>
      )}
      <div className="text-primary mb-2">{icon}</div>
      <span className="text-xs">{label}</span>
    </Button>
  );
}
```

---

### 7. Criar Barrel Export

**Arquivo:** `apps/web/src/components/delivery/index.ts`

```typescript
export { StepIndicator } from './StepIndicator';
export { KPICard } from './KPICard';
export { AddressCard } from './AddressCard';
export { FeeBreakdownCard } from './FeeBreakdownCard';
export { DeliveryStatusTimeline } from './DeliveryStatusTimeline';
export { QuickActionButton } from './QuickActionButton';
```

---

## ✅ VALIDAÇÃO

Após implementar, testar cada componente:

### Teste StepIndicator
```tsx
// Em qualquer página de teste
<StepIndicator
  steps={['Endereços', 'Detalhes', 'Confirmação']}
  currentStep={2}
/>
```

### Teste KPICard
```tsx
<KPICard
  icon={<Package className="h-8 w-8" />}
  label="Entregas Hoje"
  value={5}
  badge="3 pendentes"
  trend="+2 vs ontem"
/>
```

### Teste AddressCard
```tsx
<AddressCard
  title="Endereço de Coleta"
  address={{
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    zipCode: '20000-000',
  }}
  contact={{
    name: 'João da Pizzaria',
    phone: '+5521999999999',
  }}
/>
```

### Teste FeeBreakdownCard
```tsx
<FeeBreakdownCard
  feeResult={{
    totalBzr: '12.50',
    distance: 5.2,
    estimatedTime: 30,
    breakdown: {
      baseFee: '5.00',
      distanceFee: '5.20',
      weightFee: '1.25',
      packageTypeFee: '1.05',
    },
  }}
/>
```

### Teste DeliveryStatusTimeline
```tsx
<DeliveryStatusTimeline
  currentStatus="in_transit"
  timestamps={{
    createdAt: '2025-10-16T10:00:00Z',
    acceptedAt: '2025-10-16T10:05:00Z',
    pickedUpAt: '2025-10-16T10:30:00Z',
  }}
/>
```

---

## 📝 STORYBOOK (Opcional)

Se tiver Storybook configurado, criar stories para cada componente:

**Exemplo:** `StepIndicator.stories.tsx`
```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { StepIndicator } from './StepIndicator';

const meta: Meta<typeof StepIndicator> = {
  title: 'Delivery/StepIndicator',
  component: StepIndicator,
};

export default meta;
type Story = StoryObj<typeof StepIndicator>;

export const Step1: Story = {
  args: {
    steps: ['Endereços', 'Detalhes', 'Confirmação'],
    currentStep: 1,
  },
};

export const Step2: Story = {
  args: {
    steps: ['Endereços', 'Detalhes', 'Confirmação'],
    currentStep: 2,
  },
};
```

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web
npm run dev
```

Abrir: `http://localhost:5173/app/delivery/dashboard` (ainda placeholder, mas componentes estarão criados)

---

## 📸 SCREENSHOTS ESPERADOS

Após implementação, os componentes devem ter esta aparência:

**StepIndicator:**
```
●━━━━●━━━━○
Endereços  Detalhes  Confirmação
[Ativo]
```

**KPICard:**
```
┌─────────────────┐
│ 📦         [3]  │
│                 │
│ 5               │
│ Entregas Hoje   │
│ +2 vs ontem     │
└─────────────────┘
```

**FeeBreakdownCard:**
```
┌─────────────────────┐
│ Valor da Entrega    │
│                     │
│    12.50 BZR        │
│ 📍 5.2km | ⏱️ ~30min│
│ ───────────────────│
│ Taxa base     5.00  │
│ Distância     5.20  │
│ Tipo pacote   1.05  │
│ Peso adic.    1.25  │
└─────────────────────┘
```

---

## ➡️ PRÓXIMA FASE

**FASE 3:** Página de Solicitação de Entrega (RequestDeliveryPage)
