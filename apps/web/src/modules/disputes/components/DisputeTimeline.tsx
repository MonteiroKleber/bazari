import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Dispute } from '@/hooks/blockchain/useDispute';
import {
  AlertCircle,
  Users,
  Lock,
  Eye,
  Gavel,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisputeTimelineProps {
  dispute: Dispute;
}

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
  block?: number;
}

function getTimelineSteps(dispute: Dispute): TimelineStep[] {
  const { status, createdAt, commitDeadline, revealDeadline, currentBlock } = dispute;

  const steps: TimelineStep[] = [
    {
      id: 'opened',
      label: 'Disputa Aberta',
      description: 'Reclamacao registrada no blockchain',
      icon: <AlertCircle className="w-4 h-4" />,
      status: 'completed',
      block: createdAt,
    },
    {
      id: 'jurors',
      label: 'Jurados Selecionados',
      description: '5 jurados escolhidos via VRF',
      icon: <Users className="w-4 h-4" />,
      status: status === 'Open' ? 'current' : 'completed',
    },
    {
      id: 'commit',
      label: 'Fase de Commit',
      description: 'Jurados submetem votos criptografados',
      icon: <Lock className="w-4 h-4" />,
      status:
        status === 'CommitPhase'
          ? 'current'
          : ['RevealPhase', 'Resolved'].includes(status)
          ? 'completed'
          : 'pending',
      block: commitDeadline,
    },
    {
      id: 'reveal',
      label: 'Fase de Reveal',
      description: 'Jurados revelam seus votos',
      icon: <Eye className="w-4 h-4" />,
      status:
        status === 'RevealPhase'
          ? 'current'
          : status === 'Resolved'
          ? 'completed'
          : 'pending',
      block: revealDeadline,
    },
    {
      id: 'ruling',
      label: 'Decisao Final',
      description: 'Ruling executado no escrow',
      icon: <Gavel className="w-4 h-4" />,
      status: status === 'Resolved' ? 'completed' : 'pending',
    },
  ];

  return steps;
}

export function DisputeTimeline({ dispute }: DisputeTimelineProps) {
  const steps = getTimelineSteps(dispute);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Linha do Tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
                {/* Vertical line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[15px] w-0.5 h-full -z-10',
                      step.status === 'completed'
                        ? 'bg-primary'
                        : 'bg-muted'
                    )}
                    style={{
                      top: `${index * 80 + 32}px`,
                      height: '48px',
                    }}
                  />
                )}

                {/* Icon circle */}
                <div
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    step.status === 'completed'
                      ? 'bg-primary text-primary-foreground'
                      : step.status === 'current'
                      ? 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'font-medium',
                        step.status === 'pending' && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                    {step.status === 'current' && (
                      <Badge variant="secondary" className="text-xs">
                        Em andamento
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  {step.block && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Bloco: {step.block.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
