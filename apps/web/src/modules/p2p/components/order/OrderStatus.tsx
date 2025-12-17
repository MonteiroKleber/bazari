import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusStepper } from '../StatusStepper';

interface OrderStatusProps {
  status: string;
  assetType?: 'BZR' | 'ZARI';
}

function getStepFromStatus(status: string): number {
  switch (status) {
    case 'DRAFT':
    case 'AWAITING_ESCROW':
      return 0;
    case 'AWAITING_FIAT_PAYMENT':
      return 1;
    case 'AWAITING_CONFIRMATION':
      return 2;
    case 'RELEASED':
      return 3; // All complete
    default:
      return 0;
  }
}

export function OrderStatus({ status, assetType = 'BZR' }: OrderStatusProps) {
  const { t } = useTranslation();

  const steps = [
    {
      id: 'escrow',
      label: assetType === 'ZARI'
        ? t('p2p.status.step.escrowZari', 'Escrow ZARI')
        : t('p2p.status.step.escrowBzr', 'Escrow BZR'),
      description: t('p2p.status.step.escrowDesc', 'Tokens travados com segurança'),
    },
    {
      id: 'payment',
      label: t('p2p.status.step.payment', 'Pagamento PIX'),
      description: t('p2p.status.step.paymentDesc', 'Transferência via PIX'),
    },
    {
      id: 'confirmation',
      label: t('p2p.status.step.confirmation', 'Confirmação'),
      description: t('p2p.status.step.confirmationDesc', 'Liberação dos tokens'),
    },
  ];

  const currentStep = getStepFromStatus(status);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('p2p.orderRoom.progress', 'Progresso')}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusStepper
          steps={steps}
          currentStep={currentStep}
          orientation="vertical"
        />
      </CardContent>
    </Card>
  );
}
