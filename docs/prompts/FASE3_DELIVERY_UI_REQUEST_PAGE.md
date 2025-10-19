# FASE 3 - PÁGINA DE SOLICITAÇÃO DE ENTREGA

## 🎯 OBJETIVO

Criar a página de solicitação de entrega direta (RequestDeliveryPage) com wizard de 3 etapas:
1. Endereços (coleta + entrega)
2. Detalhes do pacote
3. Confirmação e pagamento

**Rota:** `/app/delivery/request/new`

**Tempo estimado:** 2-3 horas

---

## 📋 ESTRUTURA DO WIZARD

### Step 1: Endereços
- Endereço de coleta (CEP, rua, número, complemento, bairro, cidade, estado)
- Contato de coleta (nome, telefone)
- Endereço de entrega (mesma estrutura)
- Contato de entrega (nome, telefone)

### Step 2: Detalhes do Pacote
- Tipo de pacote (documento, pequeno, médio, grande)
- Peso aproximado (kg)
- Instruções especiais (textarea)
- Cálculo automático da taxa ao preencher

### Step 3: Confirmação
- Resumo completo
- Breakdown da taxa
- Confirmação de saldo BZR
- Botão de confirmar pedido

---

## 📂 ARQUIVO PRINCIPAL

**Arquivo:** `apps/web/src/pages/RequestDeliveryPage.tsx`

### Imports

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { StepIndicator, AddressCard, FeeBreakdownCard } from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import { addressSchema, packageDetailsSchema } from '@/lib/validations/delivery';
import type { Address, PackageType, DeliveryFeeResult } from '@/types/delivery';
import { ArrowLeft, Package, MapPin, CheckCircle } from 'lucide-react';
```

---

## 🏗️ ESTRUTURA DO COMPONENTE

### State Management

```typescript
export default function RequestDeliveryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Addresses
  const [pickupAddress, setPickupAddress] = useState<Partial<Address>>({});
  const [pickupContact, setPickupContact] = useState({ name: '', phone: '' });
  const [deliveryAddress, setDeliveryAddress] = useState<Partial<Address>>({});
  const [deliveryContact, setDeliveryContact] = useState({ name: '', phone: '' });

  // Step 2: Package Details
  const [packageType, setPackageType] = useState<PackageType>('small');
  const [weight, setWeight] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Fee calculation
  const [feeResult, setFeeResult] = useState<DeliveryFeeResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... handlers below
}
```

---

## 📝 HANDLERS

### Validação de CEP e Cálculo de Taxa

```typescript
const handleCalculateFee = async () => {
  try {
    // Validate addresses
    const pickupValid = addressSchema.safeParse(pickupAddress);
    const deliveryValid = addressSchema.safeParse(deliveryAddress);

    if (!pickupValid.success || !deliveryValid.success) {
      toast({
        title: 'Endereços incompletos',
        description: 'Preencha todos os campos de endereço',
        variant: 'destructive',
      });
      return;
    }

    setIsCalculating(true);

    const result = await deliveryApi.calculateFee({
      pickupAddress: pickupValid.data,
      deliveryAddress: deliveryValid.data,
      packageType,
      weight: parseFloat(weight) || 0,
    });

    setFeeResult(result);

    toast({
      title: 'Taxa calculada',
      description: `${result.distance}km • ${result.totalBzr} BZR`,
    });
  } catch (error) {
    toast({
      title: 'Erro ao calcular taxa',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsCalculating(false);
  }
};
```

### Navegação entre Steps

```typescript
const handleNext = async () => {
  if (currentStep === 1) {
    // Validate addresses before moving to step 2
    const pickupValid = addressSchema.safeParse(pickupAddress);
    const deliveryValid = addressSchema.safeParse(deliveryAddress);

    if (!pickupValid.success || !deliveryValid.success) {
      toast({
        title: 'Endereços incompletos',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (!pickupContact.name || !pickupContact.phone) {
      toast({
        title: 'Contato de coleta incompleto',
        description: 'Informe nome e telefone para contato',
        variant: 'destructive',
      });
      return;
    }

    if (!deliveryContact.name || !deliveryContact.phone) {
      toast({
        title: 'Contato de entrega incompleto',
        description: 'Informe nome e telefone para contato',
        variant: 'destructive',
      });
      return;
    }
  }

  if (currentStep === 2) {
    // Validate package details and calculate fee
    const packageValid = packageDetailsSchema.safeParse({
      packageType,
      weight: parseFloat(weight),
      specialInstructions,
    });

    if (!packageValid.success) {
      toast({
        title: 'Detalhes do pacote incompletos',
        description: 'Selecione o tipo e peso do pacote',
        variant: 'destructive',
      });
      return;
    }

    // Calculate fee before going to confirmation
    await handleCalculateFee();
  }

  setCurrentStep((prev) => Math.min(prev + 1, 3));
};

const handleBack = () => {
  setCurrentStep((prev) => Math.max(prev - 1, 1));
};
```

### Submissão Final

```typescript
const handleSubmit = async () => {
  if (!feeResult) {
    toast({
      title: 'Erro',
      description: 'Taxa não calculada. Retorne ao passo anterior.',
      variant: 'destructive',
    });
    return;
  }

  try {
    setIsSubmitting(true);

    const deliveryRequest = await deliveryApi.createRequest({
      pickupAddress: pickupAddress as Address,
      pickupContact,
      deliveryAddress: deliveryAddress as Address,
      deliveryContact,
      packageType,
      weight: parseFloat(weight),
      specialInstructions,
    });

    toast({
      title: 'Entrega solicitada!',
      description: `ID: ${deliveryRequest.id}`,
    });

    // Redirect to tracking page
    navigate(`/app/delivery/track/${deliveryRequest.id}`);
  } catch (error) {
    toast({
      title: 'Erro ao criar pedido',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## 🎨 RENDER - STEP 1: ENDEREÇOS

```tsx
const renderStep1 = () => (
  <div className="space-y-6">
    {/* Pickup Address */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Endereço de Coleta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="pickup-zipCode">CEP *</Label>
            <Input
              id="pickup-zipCode"
              placeholder="00000-000"
              value={pickupAddress.zipCode || ''}
              onChange={(e) =>
                setPickupAddress({ ...pickupAddress, zipCode: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="pickup-street">Rua *</Label>
            <Input
              id="pickup-street"
              placeholder="Rua das Flores"
              value={pickupAddress.street || ''}
              onChange={(e) =>
                setPickupAddress({ ...pickupAddress, street: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="pickup-number">Número *</Label>
            <Input
              id="pickup-number"
              placeholder="123"
              value={pickupAddress.number || ''}
              onChange={(e) =>
                setPickupAddress({ ...pickupAddress, number: e.target.value })
              }
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="pickup-complement">Complemento</Label>
            <Input
              id="pickup-complement"
              placeholder="Apto 101"
              value={pickupAddress.complement || ''}
              onChange={(e) =>
                setPickupAddress({ ...pickupAddress, complement: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pickup-neighborhood">Bairro</Label>
            <Input
              id="pickup-neighborhood"
              placeholder="Centro"
              value={pickupAddress.neighborhood || ''}
              onChange={(e) =>
                setPickupAddress({ ...pickupAddress, neighborhood: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="pickup-city">Cidade *</Label>
            <Input
              id="pickup-city"
              placeholder="Rio de Janeiro"
              value={pickupAddress.city || ''}
              onChange={(e) =>
                setPickupAddress({ ...pickupAddress, city: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pickup-state">Estado *</Label>
            <Input
              id="pickup-state"
              placeholder="RJ"
              maxLength={2}
              value={pickupAddress.state || ''}
              onChange={(e) =>
                setPickupAddress({ ...pickupAddress, state: e.target.value.toUpperCase() })
              }
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="font-semibold mb-3">Contato para Coleta</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup-contact-name">Nome *</Label>
              <Input
                id="pickup-contact-name"
                placeholder="João Silva"
                value={pickupContact.name}
                onChange={(e) =>
                  setPickupContact({ ...pickupContact, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="pickup-contact-phone">Telefone *</Label>
              <Input
                id="pickup-contact-phone"
                placeholder="+5521999999999"
                value={pickupContact.phone}
                onChange={(e) =>
                  setPickupContact({ ...pickupContact, phone: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Delivery Address - Same structure as pickup */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-600" />
          Endereço de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Repeat same fields for delivery address */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="delivery-zipCode">CEP *</Label>
            <Input
              id="delivery-zipCode"
              placeholder="00000-000"
              value={deliveryAddress.zipCode || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, zipCode: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="delivery-street">Rua *</Label>
            <Input
              id="delivery-street"
              placeholder="Av. Atlântica"
              value={deliveryAddress.street || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, street: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="delivery-number">Número *</Label>
            <Input
              id="delivery-number"
              placeholder="456"
              value={deliveryAddress.number || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, number: e.target.value })
              }
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="delivery-complement">Complemento</Label>
            <Input
              id="delivery-complement"
              placeholder="Casa 2"
              value={deliveryAddress.complement || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, complement: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="delivery-neighborhood">Bairro</Label>
            <Input
              id="delivery-neighborhood"
              placeholder="Copacabana"
              value={deliveryAddress.neighborhood || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, neighborhood: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="delivery-city">Cidade *</Label>
            <Input
              id="delivery-city"
              placeholder="Rio de Janeiro"
              value={deliveryAddress.city || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, city: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="delivery-state">Estado *</Label>
            <Input
              id="delivery-state"
              placeholder="RJ"
              maxLength={2}
              value={deliveryAddress.state || ''}
              onChange={(e) =>
                setDeliveryAddress({ ...deliveryAddress, state: e.target.value.toUpperCase() })
              }
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="font-semibold mb-3">Contato para Entrega</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery-contact-name">Nome *</Label>
              <Input
                id="delivery-contact-name"
                placeholder="Maria Santos"
                value={deliveryContact.name}
                onChange={(e) =>
                  setDeliveryContact({ ...deliveryContact, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="delivery-contact-phone">Telefone *</Label>
              <Input
                id="delivery-contact-phone"
                placeholder="+5521988888888"
                value={deliveryContact.phone}
                onChange={(e) =>
                  setDeliveryContact({ ...deliveryContact, phone: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
```

---

## 🎨 RENDER - STEP 2: DETALHES DO PACOTE

```tsx
const renderStep2 = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Detalhes do Pacote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="packageType">Tipo de Pacote *</Label>
          <Select value={packageType} onValueChange={(val) => setPackageType(val as PackageType)}>
            <SelectTrigger id="packageType">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="document">📄 Documento (até 0.5kg)</SelectItem>
              <SelectItem value="small">📦 Pequeno (0.5kg - 3kg)</SelectItem>
              <SelectItem value="medium">📦 Médio (3kg - 8kg)</SelectItem>
              <SelectItem value="large">📦 Grande (8kg - 25kg)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="weight">Peso Aproximado (kg) *</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="2.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="specialInstructions">Instruções Especiais</Label>
          <Textarea
            id="specialInstructions"
            placeholder="Ex: Frágil, requer cuidado especial..."
            rows={4}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
          />
        </div>

        <Button
          onClick={handleCalculateFee}
          disabled={isCalculating}
          className="w-full"
        >
          {isCalculating ? 'Calculando...' : '🧮 Calcular Taxa'}
        </Button>

        {feeResult && (
          <div className="mt-4">
            <FeeBreakdownCard feeResult={feeResult} />
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);
```

---

## 🎨 RENDER - STEP 3: CONFIRMAÇÃO

```tsx
const renderStep3 = () => (
  <div className="space-y-6">
    {/* Summary */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Resumo do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">Coleta</p>
          <AddressCard
            title="Endereço de Coleta"
            address={pickupAddress as Address}
            contact={pickupContact}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">Entrega</p>
          <AddressCard
            title="Endereço de Entrega"
            address={deliveryAddress as Address}
            contact={deliveryContact}
          />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground mb-2">Pacote</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Tipo:</span>{' '}
              <span className="font-medium capitalize">{packageType}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Peso:</span>{' '}
              <span className="font-medium">{weight}kg</span>
            </p>
            {specialInstructions && (
              <p>
                <span className="text-muted-foreground">Instruções:</span>{' '}
                <span className="font-medium">{specialInstructions}</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Fee Breakdown */}
    {feeResult && <FeeBreakdownCard feeResult={feeResult} />}

    {/* Warning */}
    <Card className="border-yellow-500 bg-yellow-50">
      <CardContent className="pt-6">
        <p className="text-sm text-yellow-800">
          ⚠️ Ao confirmar, <strong>{feeResult?.totalBzr} BZR</strong> serão reservados em
          escrow até a conclusão da entrega.
        </p>
      </CardContent>
    </Card>
  </div>
);
```

---

## 🎨 RENDER PRINCIPAL

```tsx
return (
  <div className="container max-w-4xl mx-auto py-8 px-4">
    {/* Header */}
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>
      <h1 className="text-3xl font-bold">Solicitar Entrega</h1>
      <p className="text-muted-foreground">
        Preencha os dados para solicitar uma entrega rápida
      </p>
    </div>

    {/* Step Indicator */}
    <div className="mb-8">
      <StepIndicator
        steps={['Endereços', 'Detalhes', 'Confirmação']}
        currentStep={currentStep}
      />
    </div>

    {/* Step Content */}
    <div className="mb-6">
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </div>

    {/* Navigation Buttons */}
    <div className="flex justify-between">
      <Button
        variant="outline"
        onClick={handleBack}
        disabled={currentStep === 1 || isSubmitting}
      >
        Voltar
      </Button>

      {currentStep < 3 ? (
        <Button onClick={handleNext} disabled={isCalculating}>
          Próximo
        </Button>
      ) : (
        <Button onClick={handleSubmit} disabled={isSubmitting || !feeResult}>
          {isSubmitting ? 'Confirmando...' : 'Confirmar Pedido'}
        </Button>
      )}
    </div>
  </div>
);
```

---

## ✅ VALIDAÇÃO

### Teste Manual

1. Acesse `http://localhost:5173/app/delivery/request/new`
2. **Step 1**: Preencha endereços de coleta e entrega
   - Validar campos obrigatórios
   - Testar navegação com dados incompletos (deve bloquear)
3. **Step 2**: Selecione tipo de pacote e peso
   - Clicar em "Calcular Taxa"
   - Verificar se FeeBreakdownCard aparece
4. **Step 3**: Revisar resumo
   - Verificar AddressCards renderizados corretamente
   - Clicar em "Confirmar Pedido"
   - Verificar redirecionamento para página de tracking

### Casos de Teste

**Caso 1: Endereços incompletos**
- Tentar avançar do Step 1 sem preencher campos obrigatórios
- Espera: Toast de erro

**Caso 2: Cálculo de taxa**
- Preencher pacote médio, 5kg, distância ~10km
- Espera: Taxa calculada corretamente

**Caso 3: Submissão com sucesso**
- Completar wizard e confirmar
- Espera: Redirect para `/app/delivery/track/{id}`

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web
npm run dev
```

Acesse: `http://localhost:5173/app/delivery/request/new`

---

## 📝 NOTAS IMPORTANTES

1. **Validação em tempo real**: Cada step valida antes de avançar
2. **Cálculo de taxa**: Acontece no Step 2, obrigatório antes do Step 3
3. **Escrow**: Aviso claro de que fundos serão reservados
4. **UX Mobile**: Layout responsivo com grid adaptativo
5. **Feedback visual**: Toasts para todas as ações importantes

---

## ➡️ PRÓXIMA FASE

**FASE 4:** Página de Cadastro de Entregador (DeliveryProfileSetupPage)
