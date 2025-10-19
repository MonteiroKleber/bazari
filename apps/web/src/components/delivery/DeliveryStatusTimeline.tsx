import { cn } from '@/lib/utils';
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

export function DeliveryStatusTimeline({ currentStatus, timestamps }: DeliveryStatusTimelineProps) {
  const steps = [
    { status: DeliveryRequestStatus.PENDING, label: 'Criado', timestamp: timestamps.createdAt },
    { status: DeliveryRequestStatus.ACCEPTED, label: 'Aceito', timestamp: timestamps.acceptedAt },
    { status: DeliveryRequestStatus.PICKED_UP, label: 'Coletado', timestamp: timestamps.pickedUpAt },
    { status: DeliveryRequestStatus.IN_TRANSIT, label: 'Em Trânsito', timestamp: timestamps.pickedUpAt },
    { status: DeliveryRequestStatus.DELIVERED, label: 'Entregue', timestamp: timestamps.deliveredAt },
  ];

  const statusOrder = [
    DeliveryRequestStatus.PENDING,
    DeliveryRequestStatus.ACCEPTED,
    DeliveryRequestStatus.PICKED_UP,
    DeliveryRequestStatus.IN_TRANSIT,
    DeliveryRequestStatus.DELIVERED
  ];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.status} className="flex flex-col items-center flex-1 relative z-10">
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
            </div>
          );
        })}

        {/* Connector lines - positioned absolutely behind circles */}
        <div className="absolute top-5 left-0 right-0 flex items-center -z-0">
          {steps.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1 flex-1',
                index < currentIndex ? 'bg-green-500' : 'bg-muted'
              )}
              style={{ marginLeft: index === 0 ? '5%' : 0, marginRight: index === steps.length - 2 ? '5%' : 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
