import { Package, DollarSign, CheckCircle, Star } from 'lucide-react';
import {
  StepIndicator,
  KPICard,
  AddressCard,
  FeeBreakdownCard,
  DeliveryStatusTimeline,
  QuickActionButton,
} from '@/components/delivery';
import { DeliveryRequestStatus } from '@/types/delivery';

export function ComponentsTestPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Componentes de Delivery - Teste</h1>

      {/* StepIndicator Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4">StepIndicator</h2>
        <div className="bg-card p-6 rounded-lg border">
          <StepIndicator
            steps={['Endereços', 'Detalhes', 'Confirmação']}
            currentStep={2}
          />
        </div>
      </section>

      {/* KPICard Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4">KPICard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<Package className="h-8 w-8" />}
            label="Entregas Hoje"
            value={5}
            badge="3 pendentes"
          />
          <KPICard
            icon={<DollarSign className="h-8 w-8" />}
            label="Ganhos Hoje"
            value="125.50 BZR"
            trend="+15.5 BZR vs ontem"
          />
          <KPICard
            icon={<CheckCircle className="h-8 w-8" />}
            label="Taxa de Conclusão"
            value="95%"
            subtitle="38 de 40 entregas"
          />
          <KPICard
            icon={<Star className="h-8 w-8" />}
            label="Avaliação Média"
            value="4.8"
            subtitle="120 avaliações"
          />
        </div>
      </section>

      {/* AddressCard Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4">AddressCard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AddressCard
            title="Endereço de Coleta"
            address={{
              street: 'Rua das Flores',
              number: '123',
              complement: 'Loja 1',
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
          <AddressCard
            title="Endereço de Entrega"
            address={{
              street: 'Av. Atlântica',
              number: '456',
              neighborhood: 'Copacabana',
              city: 'Rio de Janeiro',
              state: 'RJ',
              zipCode: '22000-000',
            }}
            contact={{
              name: 'Maria Silva',
              phone: '+5521988888888',
            }}
          />
        </div>
      </section>

      {/* FeeBreakdownCard Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4">FeeBreakdownCard</h2>
        <div className="max-w-md">
          <FeeBreakdownCard
            feeResult={{
              totalBzr: '12.50',
              distance: 5.2,
              estimatedTime: 30,
              breakdown: {
                baseFee: '5.00',
                distanceFee: '5.20',
                packageTypeFee: '1.05',
                weightFee: '1.25',
              },
            }}
          />
        </div>
      </section>

      {/* DeliveryStatusTimeline Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4">DeliveryStatusTimeline</h2>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium mb-4">Status: Em Trânsito</h3>
          <DeliveryStatusTimeline
            currentStatus={DeliveryRequestStatus.IN_TRANSIT}
            timestamps={{
              createdAt: '2025-10-16T10:00:00Z',
              acceptedAt: '2025-10-16T10:05:00Z',
              pickedUpAt: '2025-10-16T10:30:00Z',
            }}
          />
        </div>
      </section>

      {/* QuickActionButton Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4">QuickActionButton</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            icon={<Package className="h-6 w-6" />}
            label="Demandas"
            onClick={() => alert('Demandas clicked')}
            badge={5}
          />
          <QuickActionButton
            icon={<CheckCircle className="h-6 w-6" />}
            label="Ativas"
            onClick={() => alert('Ativas clicked')}
            badge={2}
          />
          <QuickActionButton
            icon={<DollarSign className="h-6 w-6" />}
            label="Ganhos"
            onClick={() => alert('Ganhos clicked')}
          />
          <QuickActionButton
            icon={<Star className="h-6 w-6" />}
            label="Histórico"
            onClick={() => alert('Histórico clicked')}
          />
        </div>
      </section>
    </div>
  );
}
