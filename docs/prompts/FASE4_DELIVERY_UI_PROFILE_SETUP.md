# FASE 4 - CADASTRO DE ENTREGADOR

## 🎯 OBJETIVO

Criar a página de cadastro completo para se tornar entregador (DeliveryProfileSetupPage) com wizard de 4 etapas:
1. Informações Pessoais
2. Veículo
3. Disponibilidade
4. Confirmação

**Rota:** `/app/delivery/profile/setup`

**Tempo estimado:** 2-3 horas

---

## 📋 ESTRUTURA DO WIZARD

### Step 1: Informações Pessoais
- Nome completo
- CPF
- Telefone
- Endereço base (CEP, rua, número, cidade, estado)
- Upload de foto de perfil (opcional)

### Step 2: Veículo
- Tipo de veículo (bicicleta, moto, carro, van)
- Marca/Modelo (opcional)
- Placa (opcional para bicicleta)
- Cor
- Capacidade de carga (kg)

### Step 3: Disponibilidade
- Raio de atuação (km)
- Horários disponíveis (checkboxes: manhã, tarde, noite)
- Dias da semana (checkboxes)
- Aceita entregas imediatas? (toggle)

### Step 4: Confirmação
- Resumo completo
- Termos de uso
- Botão de confirmar cadastro

---

## 📂 ARQUIVO PRINCIPAL

**Arquivo:** `apps/web/src/pages/DeliveryProfileSetupPage.tsx`

### Imports

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { StepIndicator } from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import { deliveryProfileSchema } from '@/lib/validations/delivery';
import type { VehicleType, DayOfWeek, TimeSlot } from '@/types/delivery';
import { ArrowLeft, User, Truck, Clock, CheckCircle } from 'lucide-react';
```

---

## 🏗️ ESTRUTURA DO COMPONENTE

### State Management

```typescript
export default function DeliveryProfileSetupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Personal Info
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [baseAddress, setBaseAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    city: '',
    state: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Step 2: Vehicle
  const [vehicleType, setVehicleType] = useState<VehicleType>('bike');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [maxCapacityKg, setMaxCapacityKg] = useState('');

  // Step 3: Availability
  const [radiusKm, setRadiusKm] = useState('10');
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [acceptsImmediateDeliveries, setAcceptsImmediateDeliveries] = useState(true);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ... handlers below
}
```

---

## 📝 HANDLERS

### Navegação entre Steps

```typescript
const handleNext = () => {
  if (currentStep === 1) {
    // Validate personal info
    if (!fullName || !cpf || !phone) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, CPF e telefone',
        variant: 'destructive',
      });
      return;
    }

    if (!baseAddress.zipCode || !baseAddress.city || !baseAddress.state) {
      toast({
        title: 'Endereço incompleto',
        description: 'Preencha CEP, cidade e estado',
        variant: 'destructive',
      });
      return;
    }
  }

  if (currentStep === 2) {
    // Validate vehicle
    if (!vehicleType) {
      toast({
        title: 'Veículo não selecionado',
        description: 'Selecione o tipo de veículo',
        variant: 'destructive',
      });
      return;
    }

    if (!maxCapacityKg || parseFloat(maxCapacityKg) <= 0) {
      toast({
        title: 'Capacidade inválida',
        description: 'Informe a capacidade de carga do veículo',
        variant: 'destructive',
      });
      return;
    }
  }

  if (currentStep === 3) {
    // Validate availability
    if (availableDays.length === 0) {
      toast({
        title: 'Dias não selecionados',
        description: 'Selecione ao menos 1 dia da semana',
        variant: 'destructive',
      });
      return;
    }

    if (availableTimeSlots.length === 0) {
      toast({
        title: 'Horários não selecionados',
        description: 'Selecione ao menos 1 turno',
        variant: 'destructive',
      });
      return;
    }
  }

  setCurrentStep((prev) => Math.min(prev + 1, 4));
};

const handleBack = () => {
  setCurrentStep((prev) => Math.max(prev - 1, 1));
};
```

### Checkboxes Helpers

```typescript
const toggleDay = (day: DayOfWeek) => {
  setAvailableDays((prev) =>
    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
  );
};

const toggleTimeSlot = (slot: TimeSlot) => {
  setAvailableTimeSlots((prev) =>
    prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
  );
};
```

### Submissão Final

```typescript
const handleSubmit = async () => {
  if (!agreedToTerms) {
    toast({
      title: 'Termos não aceitos',
      description: 'Você precisa aceitar os termos de uso',
      variant: 'destructive',
    });
    return;
  }

  try {
    setIsSubmitting(true);

    const profile = await deliveryApi.createProfile({
      fullName,
      cpf,
      phone,
      baseAddress,
      profilePhoto,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      vehiclePlate,
      vehicleColor,
      maxCapacityKg: parseFloat(maxCapacityKg),
      radiusKm: parseFloat(radiusKm),
      availableDays,
      availableTimeSlots,
      acceptsImmediateDeliveries,
    });

    toast({
      title: 'Cadastro completo!',
      description: 'Você já pode começar a aceitar entregas',
    });

    // Redirect to delivery dashboard
    navigate('/app/delivery/dashboard');
  } catch (error) {
    toast({
      title: 'Erro ao criar perfil',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## 🎨 RENDER - STEP 1: INFORMAÇÕES PESSOAIS

```tsx
const renderStep1 = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações Pessoais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            placeholder="João da Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              placeholder="+5521999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="font-semibold mb-3">Endereço Base (Ponto de Partida)</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zipCode">CEP *</Label>
              <Input
                id="zipCode"
                placeholder="00000-000"
                value={baseAddress.zipCode}
                onChange={(e) =>
                  setBaseAddress({ ...baseAddress, zipCode: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2">
              <Label htmlFor="street">Rua</Label>
              <Input
                id="street"
                placeholder="Rua das Flores"
                value={baseAddress.street}
                onChange={(e) =>
                  setBaseAddress({ ...baseAddress, street: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                placeholder="123"
                value={baseAddress.number}
                onChange={(e) =>
                  setBaseAddress({ ...baseAddress, number: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                placeholder="Rio de Janeiro"
                value={baseAddress.city}
                onChange={(e) =>
                  setBaseAddress({ ...baseAddress, city: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                placeholder="RJ"
                maxLength={2}
                value={baseAddress.state}
                onChange={(e) =>
                  setBaseAddress({ ...baseAddress, state: e.target.value.toUpperCase() })
                }
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <Label htmlFor="profilePhoto">Foto de Perfil (Opcional)</Label>
          <Input
            id="profilePhoto"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setProfilePhoto(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          {profilePhoto && (
            <div className="mt-2">
              <img
                src={profilePhoto}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);
```

---

## 🎨 RENDER - STEP 2: VEÍCULO

```tsx
const renderStep2 = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Informações do Veículo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="vehicleType">Tipo de Veículo *</Label>
          <Select
            value={vehicleType}
            onValueChange={(val) => setVehicleType(val as VehicleType)}
          >
            <SelectTrigger id="vehicleType">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bike">🚴 Bicicleta</SelectItem>
              <SelectItem value="motorcycle">🏍️ Moto</SelectItem>
              <SelectItem value="car">🚗 Carro</SelectItem>
              <SelectItem value="van">🚐 Van</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vehicleBrand">Marca (Opcional)</Label>
            <Input
              id="vehicleBrand"
              placeholder="Honda"
              value={vehicleBrand}
              onChange={(e) => setVehicleBrand(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="vehicleModel">Modelo (Opcional)</Label>
            <Input
              id="vehicleModel"
              placeholder="CG 160"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vehiclePlate">
              Placa {vehicleType !== 'bike' && '*'}
            </Label>
            <Input
              id="vehiclePlate"
              placeholder="ABC-1234"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <Label htmlFor="vehicleColor">Cor</Label>
            <Input
              id="vehicleColor"
              placeholder="Preta"
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="maxCapacityKg">Capacidade Máxima de Carga (kg) *</Label>
          <Input
            id="maxCapacityKg"
            type="number"
            step="0.5"
            placeholder="25"
            value={maxCapacityKg}
            onChange={(e) => setMaxCapacityKg(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Recomendado: Bicicleta (5-10kg), Moto (10-25kg), Carro/Van (25-100kg)
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);
```

---

## 🎨 RENDER - STEP 3: DISPONIBILIDADE

```tsx
const renderStep3 = () => {
  const daysOfWeek: { value: DayOfWeek; label: string }[] = [
    { value: 'monday', label: 'Segunda' },
    { value: 'tuesday', label: 'Terça' },
    { value: 'wednesday', label: 'Quarta' },
    { value: 'thursday', label: 'Quinta' },
    { value: 'friday', label: 'Sexta' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' },
  ];

  const timeSlots: { value: TimeSlot; label: string }[] = [
    { value: 'morning', label: 'Manhã (6h-12h)' },
    { value: 'afternoon', label: 'Tarde (12h-18h)' },
    { value: 'evening', label: 'Noite (18h-23h)' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="radiusKm">Raio de Atuação (km) *</Label>
            <Input
              id="radiusKm"
              type="number"
              step="1"
              placeholder="10"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Você receberá entregas dentro de {radiusKm}km do seu endereço base
            </p>
          </div>

          <div>
            <Label className="mb-3 block">Dias da Semana *</Label>
            <div className="grid grid-cols-2 gap-2">
              {daysOfWeek.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={availableDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label htmlFor={day.value} className="cursor-pointer font-normal">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Turnos Disponíveis *</Label>
            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <div key={slot.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={slot.value}
                    checked={availableTimeSlots.includes(slot.value)}
                    onCheckedChange={() => toggleTimeSlot(slot.value)}
                  />
                  <Label htmlFor={slot.value} className="cursor-pointer font-normal">
                    {slot.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label htmlFor="acceptsImmediate">Aceitar Entregas Imediatas</Label>
              <p className="text-xs text-muted-foreground">
                Receba notificações push para entregas urgentes
              </p>
            </div>
            <Switch
              id="acceptsImmediate"
              checked={acceptsImmediateDeliveries}
              onCheckedChange={setAcceptsImmediateDeliveries}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## 🎨 RENDER - STEP 4: CONFIRMAÇÃO

```tsx
const renderStep4 = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Confirmação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Personal Info Summary */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            Informações Pessoais
          </p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Nome:</span>{' '}
              <span className="font-medium">{fullName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">CPF:</span>{' '}
              <span className="font-medium">{cpf}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Telefone:</span>{' '}
              <span className="font-medium">{phone}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Base:</span>{' '}
              <span className="font-medium">
                {baseAddress.city}, {baseAddress.state}
              </span>
            </p>
          </div>
        </div>

        {/* Vehicle Summary */}
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground mb-2">Veículo</p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Tipo:</span>{' '}
              <span className="font-medium capitalize">{vehicleType}</span>
            </p>
            {vehicleBrand && vehicleModel && (
              <p>
                <span className="text-muted-foreground">Modelo:</span>{' '}
                <span className="font-medium">
                  {vehicleBrand} {vehicleModel}
                </span>
              </p>
            )}
            {vehiclePlate && (
              <p>
                <span className="text-muted-foreground">Placa:</span>{' '}
                <span className="font-medium">{vehiclePlate}</span>
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Capacidade:</span>{' '}
              <span className="font-medium">{maxCapacityKg}kg</span>
            </p>
          </div>
        </div>

        {/* Availability Summary */}
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            Disponibilidade
          </p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Raio:</span>{' '}
              <span className="font-medium">{radiusKm}km</span>
            </p>
            <p>
              <span className="text-muted-foreground">Dias:</span>{' '}
              <span className="font-medium">{availableDays.length} dias/semana</span>
            </p>
            <p>
              <span className="text-muted-foreground">Turnos:</span>{' '}
              <span className="font-medium capitalize">
                {availableTimeSlots.join(', ')}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Entregas imediatas:</span>{' '}
              <span className="font-medium">
                {acceptsImmediateDeliveries ? 'Sim' : 'Não'}
              </span>
            </p>
          </div>
        </div>

        {/* Terms */}
        <div className="border-t pt-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            />
            <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
              Eu li e aceito os{' '}
              <a href="#" className="text-primary underline">
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a href="#" className="text-primary underline">
                Política de Privacidade
              </a>
              . Estou ciente de que serei responsável pelas entregas que aceitar.
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Info Card */}
    <Card className="border-blue-500 bg-blue-50">
      <CardContent className="pt-6">
        <p className="text-sm text-blue-800">
          ℹ️ Após confirmar, você poderá começar a aceitar entregas imediatamente.
          Mantenha seu perfil atualizado e esteja disponível nos horários cadastrados!
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
      <h1 className="text-3xl font-bold">Tornar-se Entregador</h1>
      <p className="text-muted-foreground">
        Complete seu cadastro e comece a ganhar BZR fazendo entregas
      </p>
    </div>

    {/* Step Indicator */}
    <div className="mb-8">
      <StepIndicator
        steps={['Pessoal', 'Veículo', 'Disponibilidade', 'Confirmação']}
        currentStep={currentStep}
      />
    </div>

    {/* Step Content */}
    <div className="mb-6">
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
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

      {currentStep < 4 ? (
        <Button onClick={handleNext}>Próximo</Button>
      ) : (
        <Button onClick={handleSubmit} disabled={isSubmitting || !agreedToTerms}>
          {isSubmitting ? 'Cadastrando...' : 'Confirmar Cadastro'}
        </Button>
      )}
    </div>
  </div>
);
```

---

## ✅ VALIDAÇÃO

### Teste Manual

1. Acesse `http://localhost:5173/app/delivery/profile/setup`
2. **Step 1**: Preencha informações pessoais
   - Validar campos obrigatórios
   - Fazer upload de foto (opcional)
3. **Step 2**: Selecione veículo e capacidade
   - Testar diferentes tipos de veículo
4. **Step 3**: Configure disponibilidade
   - Selecione dias e horários
   - Toggle entregas imediatas
5. **Step 4**: Revise e confirme
   - Marcar checkbox de termos
   - Confirmar cadastro
   - Verificar redirecionamento para dashboard

### Casos de Teste

**Caso 1: CPF inválido**
- Tentar avançar com CPF vazio
- Espera: Toast de erro

**Caso 2: Sem dias selecionados**
- Avançar Step 3 sem marcar dias
- Espera: Toast de erro

**Caso 3: Cadastro completo com sucesso**
- Preencher todos os steps
- Aceitar termos
- Espera: Redirect para `/app/delivery/dashboard`

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web
npm run dev
```

Acesse: `http://localhost:5173/app/delivery/profile/setup`

---

## 📝 NOTAS IMPORTANTES

1. **Validação progressiva**: Cada step valida antes de avançar
2. **Upload de foto**: Base64 encoding para simplificar (pode migrar para S3 depois)
3. **Checkbox de termos**: Obrigatório no Step 4
4. **UX Mobile**: Layout responsivo com grids adaptativos
5. **Estados do Brasil**: Input text (poderia ser Select com lista completa)

---

## ➡️ PRÓXIMA FASE

**FASE 5:** Dashboard do Entregador (DeliveryDashboardPage)
