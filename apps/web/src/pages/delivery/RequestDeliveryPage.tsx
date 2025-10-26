import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { StepIndicator, AddressCard, FeeBreakdownCard } from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import {
  createDeliveryRequestSchema,
  addressSchema,
  contactInfoSchema
} from '@/lib/validations/delivery';
import {
  Address,
  ContactInfo,
  PackageType,
  DeliveryFeeResult,
  CreateDeliveryRequestPayload
} from '@/types/delivery';
import { ArrowLeft, ArrowRight, Calculator, Send } from 'lucide-react';

export function RequestDeliveryPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Addresses and Contacts
  const [pickupAddress, setPickupAddress] = useState<Address>({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
  });

  const [pickupContact, setPickupContact] = useState<ContactInfo>({
    name: '',
    phone: '',
  });

  const [deliveryAddress, setDeliveryAddress] = useState<Address>({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
  });

  const [deliveryContact, setDeliveryContact] = useState<ContactInfo>({
    name: '',
    phone: '',
  });

  // Step 2: Package Details
  const [packageType, setPackageType] = useState<PackageType>(PackageType.SMALL);
  const [weight, setWeight] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [feeResult, setFeeResult] = useState<DeliveryFeeResult | null>(null);

  // Calculate fee
  const handleCalculateFee = async () => {
    try {
      setIsSubmitting(true);
      const result = await deliveryApi.calculateFee({
        pickupAddress,
        deliveryAddress,
        packageType,
        weight,
      });
      setFeeResult(result);
      toast.success(`Taxa calculada! Valor total: ${result.totalBzr} BZR`);
    } catch (error: any) {
      toast.error(`Erro ao calcular taxa: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step validation
  const validateStep1 = (): boolean => {
    const pickupAddressResult = addressSchema.safeParse(pickupAddress);
    const pickupContactResult = contactInfoSchema.safeParse(pickupContact);
    const deliveryAddressResult = addressSchema.safeParse(deliveryAddress);
    const deliveryContactResult = contactInfoSchema.safeParse(deliveryContact);

    if (!pickupAddressResult.success) {
      toast.error(`Endereço de coleta inválido: ${pickupAddressResult.error.errors[0]?.message}`);
      return false;
    }

    if (!pickupContactResult.success) {
      toast.error(`Contato de coleta inválido: ${pickupContactResult.error.errors[0]?.message}`);
      return false;
    }

    if (!deliveryAddressResult.success) {
      toast.error(`Endereço de entrega inválido: ${deliveryAddressResult.error.errors[0]?.message}`);
      return false;
    }

    if (!deliveryContactResult.success) {
      toast.error(`Contato de entrega inválido: ${deliveryContactResult.error.errors[0]?.message}`);
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (!feeResult) {
      toast.error('Taxa não calculada. Por favor, calcule a taxa antes de prosseguir.');
      return false;
    }

    if (weight < 0.1 || weight > 100) {
      toast.error('Peso inválido. O peso deve estar entre 0.1kg e 100kg.');
      return false;
    }

    return true;
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!feeResult) {
      toast.error('Taxa não calculada.');
      return;
    }

    const payload: CreateDeliveryRequestPayload = {
      pickupAddress,
      pickupContact,
      deliveryAddress,
      deliveryContact,
      packageType,
      weight,
      specialInstructions: specialInstructions || undefined,
    };

    const validationResult = createDeliveryRequestSchema.safeParse(payload);
    if (!validationResult.success) {
      toast.error(`Dados inválidos: ${validationResult.error.errors[0]?.message}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const request = await deliveryApi.createRequest(payload);
      toast.success(`Solicitação criada! ID: ${request.id}. Aguardando entregador aceitar.`);
      navigate('/app/delivery/my-requests');
    } catch (error: any) {
      toast.error(`Erro ao criar solicitação: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render helpers
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Pickup Address */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço de Coleta</CardTitle>
          <CardDescription>Onde o entregador deve coletar o pacote</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-zipCode">CEP *</Label>
              <Input
                id="pickup-zipCode"
                placeholder="00000-000"
                value={pickupAddress.zipCode}
                onChange={(e) => setPickupAddress({ ...pickupAddress, zipCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-street">Rua *</Label>
              <Input
                id="pickup-street"
                placeholder="Nome da rua"
                value={pickupAddress.street}
                onChange={(e) => setPickupAddress({ ...pickupAddress, street: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-number">Número *</Label>
              <Input
                id="pickup-number"
                placeholder="123"
                value={pickupAddress.number}
                onChange={(e) => setPickupAddress({ ...pickupAddress, number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-complement">Complemento</Label>
              <Input
                id="pickup-complement"
                placeholder="Apto, Bloco, etc."
                value={pickupAddress.complement}
                onChange={(e) => setPickupAddress({ ...pickupAddress, complement: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-neighborhood">Bairro</Label>
              <Input
                id="pickup-neighborhood"
                placeholder="Nome do bairro"
                value={pickupAddress.neighborhood}
                onChange={(e) => setPickupAddress({ ...pickupAddress, neighborhood: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-city">Cidade *</Label>
              <Input
                id="pickup-city"
                placeholder="Nome da cidade"
                value={pickupAddress.city}
                onChange={(e) => setPickupAddress({ ...pickupAddress, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup-state">Estado *</Label>
              <Input
                id="pickup-state"
                placeholder="RJ"
                maxLength={2}
                value={pickupAddress.state}
                onChange={(e) => setPickupAddress({ ...pickupAddress, state: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4">Contato para Coleta</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-contact-name">Nome *</Label>
                <Input
                  id="pickup-contact-name"
                  placeholder="Nome completo"
                  value={pickupContact.name}
                  onChange={(e) => setPickupContact({ ...pickupContact, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup-contact-phone">Telefone *</Label>
                <Input
                  id="pickup-contact-phone"
                  placeholder="+5521999999999"
                  value={pickupContact.phone}
                  onChange={(e) => setPickupContact({ ...pickupContact, phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço de Entrega</CardTitle>
          <CardDescription>Para onde o pacote deve ser entregue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-zipCode">CEP *</Label>
              <Input
                id="delivery-zipCode"
                placeholder="00000-000"
                value={deliveryAddress.zipCode}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, zipCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-street">Rua *</Label>
              <Input
                id="delivery-street"
                placeholder="Nome da rua"
                value={deliveryAddress.street}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-number">Número *</Label>
              <Input
                id="delivery-number"
                placeholder="123"
                value={deliveryAddress.number}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-complement">Complemento</Label>
              <Input
                id="delivery-complement"
                placeholder="Apto, Bloco, etc."
                value={deliveryAddress.complement}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, complement: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-neighborhood">Bairro</Label>
              <Input
                id="delivery-neighborhood"
                placeholder="Nome do bairro"
                value={deliveryAddress.neighborhood}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, neighborhood: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-city">Cidade *</Label>
              <Input
                id="delivery-city"
                placeholder="Nome da cidade"
                value={deliveryAddress.city}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-state">Estado *</Label>
              <Input
                id="delivery-state"
                placeholder="RJ"
                maxLength={2}
                value={deliveryAddress.state}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4">Contato para Entrega</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-contact-name">Nome *</Label>
                <Input
                  id="delivery-contact-name"
                  placeholder="Nome completo"
                  value={deliveryContact.name}
                  onChange={(e) => setDeliveryContact({ ...deliveryContact, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-contact-phone">Telefone *</Label>
                <Input
                  id="delivery-contact-phone"
                  placeholder="+5521999999999"
                  value={deliveryContact.phone}
                  onChange={(e) => setDeliveryContact({ ...deliveryContact, phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Pacote</CardTitle>
          <CardDescription>Informações sobre o item a ser entregue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packageType">Tipo de Pacote *</Label>
              <Select value={packageType} onValueChange={(value) => setPackageType(value as PackageType)}>
                <SelectTrigger id="packageType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PackageType.DOCUMENT}>Documento</SelectItem>
                  <SelectItem value={PackageType.SMALL}>Pequeno</SelectItem>
                  <SelectItem value={PackageType.MEDIUM}>Médio</SelectItem>
                  <SelectItem value={PackageType.LARGE}>Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Instruções Especiais</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Exemplo: Frágil, não dobrar, entregar com cuidado..."
              rows={3}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handleCalculateFee}
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              <Calculator className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Calculando...' : 'Calcular Taxa de Entrega'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {feeResult && (
        <FeeBreakdownCard feeResult={feeResult} />
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Importante:</strong> Ao confirmar, o valor de <strong>{feeResult?.totalBzr} BZR</strong> será
            depositado em <em>escrow</em> (custódia). O valor só será liberado ao entregador após você confirmar
            a conclusão da entrega.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AddressCard
          title="Endereço de Coleta"
          address={pickupAddress}
          contact={pickupContact}
        />
        <AddressCard
          title="Endereço de Entrega"
          address={deliveryAddress}
          contact={deliveryContact}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Pacote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tipo:</span>
            <span className="font-medium">
              {packageType === PackageType.DOCUMENT && 'Documento'}
              {packageType === PackageType.SMALL && 'Pequeno'}
              {packageType === PackageType.MEDIUM && 'Médio'}
              {packageType === PackageType.LARGE && 'Grande'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Peso:</span>
            <span className="font-medium">{weight}kg</span>
          </div>
          {specialInstructions && (
            <div className="flex flex-col space-y-1 text-sm pt-2 border-t">
              <span className="text-muted-foreground">Instruções Especiais:</span>
              <span className="font-medium">{specialInstructions}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {feeResult && (
        <FeeBreakdownCard feeResult={feeResult} />
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-2 md:py-3 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Solicitar Entrega</h1>
        <p className="text-muted-foreground">Preencha os dados para criar sua solicitação de entrega</p>
      </div>

      <div className="mb-8">
        <StepIndicator
          steps={['Endereços', 'Detalhes do Pacote', 'Confirmação']}
          currentStep={currentStep}
        />
      </div>

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {currentStep < 3 ? (
          <Button onClick={handleNext} disabled={isSubmitting}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Criando...' : 'Confirmar Solicitação'}
          </Button>
        )}
      </div>
    </div>
  );
}
