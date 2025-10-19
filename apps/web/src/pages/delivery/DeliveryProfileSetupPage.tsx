import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import type { VehicleType } from '@/types/delivery';
import { ArrowLeft, User, Truck, Clock, CheckCircle } from 'lucide-react';

export function DeliveryProfileSetupPage() {
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Personal Info
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj' | 'passport'>('cpf');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Step 2: Vehicle
  const [vehicleType, setVehicleType] = useState<VehicleType>('bike' as VehicleType);
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [maxVolume, setMaxVolume] = useState('');

  // Step 3: Availability & Features
  const [serviceRadius, setServiceRadius] = useState('10');
  const [canCarryFragile, setCanCarryFragile] = useState(false);
  const [canCarryPerishable, setCanCarryPerishable] = useState(false);
  const [hasInsulatedBag, setHasInsulatedBag] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 1) {
      // Validate personal info
      if (!fullName || !documentNumber || !phoneNumber) {
        toast.error('Preencha nome, documento e telefone');
        return;
      }

      if (!city || !state) {
        toast.error('Preencha cidade e estado');
        return;
      }
    }

    if (currentStep === 2) {
      // Validate vehicle
      if (!vehicleType) {
        toast.error('Selecione o tipo de veículo');
        return;
      }

      if (!maxWeight || parseFloat(maxWeight) <= 0) {
        toast.error('Informe o peso máximo que pode carregar');
        return;
      }

      if (!maxVolume || parseFloat(maxVolume) <= 0) {
        toast.error('Informe o volume máximo que pode carregar');
        return;
      }
    }

    if (currentStep === 3) {
      // Validate availability
      if (parseFloat(serviceRadius) <= 0) {
        toast.error('Defina um raio de serviço válido');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!agreedToTerms) {
      toast.error('Você precisa aceitar os termos de uso');
      return;
    }

    try {
      setIsSubmitting(true);

      await deliveryApi.createProfile({
        fullName,
        documentType,
        documentNumber,
        phoneNumber,
        vehicleType,
        vehicleModel: vehicleModel || undefined,
        vehiclePlate: vehiclePlate || undefined,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : undefined,
        vehicleColor: vehicleColor || undefined,
        maxWeight: parseFloat(maxWeight),
        maxVolume: parseFloat(maxVolume),
        canCarryFragile,
        canCarryPerishable,
        hasInsulatedBag,
        serviceRadius: parseFloat(serviceRadius),
        serviceCities: city ? [city] : [],
        serviceStates: state ? [state] : [],
      });

      toast.success('Cadastro completo! Você já pode começar a aceitar entregas');

      // Redirect to delivery dashboard
      navigate('/app/delivery/dashboard');
    } catch (error: any) {
      console.error('Erro completo ao criar perfil:', {
        error,
        status: error.status,
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      // Handle ApiError from our API helper
      if (error.status !== undefined) {
        // Try to parse JSON error message
        try {
          const errorData = JSON.parse(error.message);
          const errorMsg = errorData.error || 'Erro desconhecido';
          const details = errorData.details;

          // Handle specific error cases
          if (errorMsg === 'Perfil já existe') {
            toast.info('Você já possui um perfil de entregador. Redirecionando...');
            // Redirect anyway since profile exists
            setTimeout(() => navigate('/app/delivery/dashboard'), 1500);
            return;
          }

          if (errorMsg === 'Documento já cadastrado') {
            toast.error('Este documento já está cadastrado por outro entregador');
            return;
          }

          if (details && Array.isArray(details)) {
            // Show validation errors
            const fieldErrors = details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join(', ');
            toast.error(`Erro de validação: ${fieldErrors}`);
          } else {
            toast.error(`Erro ao criar perfil: ${errorMsg}`);
          }
        } catch (parseError) {
          // Not JSON, use message directly
          toast.error(`Erro ao criar perfil: ${error.message || 'Erro desconhecido'}`);
        }
      } else {
        // Generic error
        toast.error(`Erro ao criar perfil: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1 render
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documentType">Tipo de Documento *</Label>
              <Select
                value={documentType}
                onValueChange={(val) => setDocumentType(val as 'cpf' | 'cnpj' | 'passport')}
              >
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="passport">Passaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="documentNumber">Número do Documento *</Label>
              <Input
                id="documentNumber"
                placeholder={documentType === 'cpf' ? '000.000.000-00' : 'Número do documento'}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phoneNumber">Telefone *</Label>
            <Input
              id="phoneNumber"
              placeholder="+5521999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="font-semibold mb-3">Localização Base</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  placeholder="Rio de Janeiro"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">Estado (UF) *</Label>
                <Input
                  id="state"
                  placeholder="RJ"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 2 render
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
                <SelectItem value="bike">Bicicleta</SelectItem>
                <SelectItem value="motorcycle">Moto</SelectItem>
                <SelectItem value="car">Carro</SelectItem>
                <SelectItem value="van">Van</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicleModel">Modelo (Opcional)</Label>
              <Input
                id="vehicleModel"
                placeholder="Ex: Honda CG 160, Yamaha Fazer"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vehicleYear">Ano (Opcional)</Label>
              <Input
                id="vehicleYear"
                type="number"
                placeholder="2020"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="vehicleColor">Cor (Opcional)</Label>
              <Input
                id="vehicleColor"
                placeholder="Preta"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxWeight">Peso Máximo (kg) *</Label>
              <Input
                id="maxWeight"
                type="number"
                step="0.5"
                placeholder="25"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bicicleta: 5-10kg | Moto: 10-25kg | Carro/Van: 25-100kg
              </p>
            </div>
            <div>
              <Label htmlFor="maxVolume">Volume Máximo (m³) *</Label>
              <Input
                id="maxVolume"
                type="number"
                step="0.01"
                placeholder="0.5"
                value={maxVolume}
                onChange={(e) => setMaxVolume(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Volume estimado que cabe no veículo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 3 render
  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Disponibilidade e Recursos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="serviceRadius">Raio de Atuação (km) *</Label>
              <Input
                id="serviceRadius"
                type="number"
                step="1"
                placeholder="10"
                value={serviceRadius}
                onChange={(e) => setServiceRadius(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Você receberá entregas dentro de {serviceRadius}km da sua localização
              </p>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-3 block">Capacidades Especiais</Label>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="canCarryFragile"
                    checked={canCarryFragile}
                    onCheckedChange={(checked) => setCanCarryFragile(checked === true)}
                  />
                  <Label htmlFor="canCarryFragile" className="cursor-pointer font-normal leading-relaxed">
                    <div>
                      <p className="font-medium">Pode carregar itens frágeis</p>
                      <p className="text-xs text-muted-foreground">
                        Produtos que exigem cuidado especial (vidros, eletrônicos, etc.)
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="canCarryPerishable"
                    checked={canCarryPerishable}
                    onCheckedChange={(checked) => setCanCarryPerishable(checked === true)}
                  />
                  <Label htmlFor="canCarryPerishable" className="cursor-pointer font-normal leading-relaxed">
                    <div>
                      <p className="font-medium">Pode carregar itens perecíveis</p>
                      <p className="text-xs text-muted-foreground">
                        Alimentos, medicamentos que necessitam refrigeração
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="hasInsulatedBag"
                    checked={hasInsulatedBag}
                    onCheckedChange={(checked) => setHasInsulatedBag(checked === true)}
                  />
                  <Label htmlFor="hasInsulatedBag" className="cursor-pointer font-normal leading-relaxed">
                    <div>
                      <p className="font-medium">Possui bag térmica</p>
                      <p className="text-xs text-muted-foreground">
                        Equipamento para manter temperatura de alimentos
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Step 4 render
  const renderStep4 = () => {
    const getVehicleLabel = (type: VehicleType) => {
      switch (type) {
        case 'bike': return 'Bicicleta';
        case 'motorcycle': return 'Moto';
        case 'car': return 'Carro';
        case 'van': return 'Van';
        default: return type;
      }
    };

    return (
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
                  <span className="text-muted-foreground">Documento:</span>{' '}
                  <span className="font-medium">{documentType.toUpperCase()}: {documentNumber}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Telefone:</span>{' '}
                  <span className="font-medium">{phoneNumber}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Localização:</span>{' '}
                  <span className="font-medium">
                    {city}, {state}
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
                  <span className="font-medium">{getVehicleLabel(vehicleType)}</span>
                </p>
                {vehicleModel && (
                  <p>
                    <span className="text-muted-foreground">Modelo:</span>{' '}
                    <span className="font-medium">{vehicleModel}</span>
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
                  <span className="font-medium">{maxWeight}kg / {maxVolume}m³</span>
                </p>
              </div>
            </div>

            {/* Availability Summary */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-muted-foreground mb-2">
                Disponibilidade e Recursos
              </p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Raio de serviço:</span>{' '}
                  <span className="font-medium">{serviceRadius}km</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Carrega itens frágeis:</span>{' '}
                  <span className="font-medium">{canCarryFragile ? 'Sim' : 'Não'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Carrega perecíveis:</span>{' '}
                  <span className="font-medium">{canCarryPerishable ? 'Sim' : 'Não'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Possui bag térmica:</span>{' '}
                  <span className="font-medium">{hasInsulatedBag ? 'Sim' : 'Não'}</span>
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
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Após confirmar, você poderá começar a aceitar entregas imediatamente.
              Mantenha seu perfil atualizado e esteja disponível!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

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
}
