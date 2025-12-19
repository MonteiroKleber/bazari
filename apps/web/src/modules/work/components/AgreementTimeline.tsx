// path: apps/web/src/modules/work/components/AgreementTimeline.tsx
// Timeline de histórico de status do acordo

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, PauseCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAgreementHistory, type AgreementStatus } from '../api';

interface AgreementTimelineProps {
  agreementId: string;
  createdAt: string;
}

const statusConfig: Record<
  AgreementStatus,
  { label: string; icon: typeof CheckCircle2; color: string }
> = {
  ACTIVE: {
    label: 'Ativo',
    icon: CheckCircle2,
    color: 'text-green-600',
  },
  PAUSED: {
    label: 'Pausado',
    icon: PauseCircle,
    color: 'text-amber-500',
  },
  CLOSED: {
    label: 'Encerrado',
    icon: XCircle,
    color: 'text-gray-500',
  },
};

export function AgreementTimeline({ agreementId, createdAt }: AgreementTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['agreement-history', agreementId],
    queryFn: () => getAgreementHistory(agreementId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const items = data?.items || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Linha vertical conectora */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {/* Item inicial: criação do acordo */}
            <div className="relative flex gap-4">
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-medium text-sm">Acordo criado</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(createdAt), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            {/* Histórico de mudanças */}
            {items.map((item) => {
              const toConfig = statusConfig[item.toStatus];
              const ToIcon = toConfig.icon;

              return (
                <div key={item.id} className="relative flex gap-4">
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 ${
                      item.toStatus === 'ACTIVE'
                        ? 'border-green-600'
                        : item.toStatus === 'PAUSED'
                          ? 'border-amber-500'
                          : 'border-gray-500'
                    }`}
                  >
                    <ToIcon className={`h-4 w-4 ${toConfig.color}`} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {item.toStatus === 'ACTIVE' && item.fromStatus === 'PAUSED'
                          ? 'Acordo retomado'
                          : item.toStatus === 'PAUSED'
                            ? 'Acordo pausado'
                            : 'Acordo encerrado'}
                      </p>
                    </div>

                    {/* Quem alterou */}
                    {item.changedBy && (
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={item.changedBy.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {item.changedBy.displayName?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {item.changedBy.displayName}
                        </span>
                      </div>
                    )}

                    {/* Motivo */}
                    {item.reason && (
                      <p className="text-sm text-muted-foreground mt-1 bg-muted/50 rounded px-2 py-1">
                        "{item.reason}"
                      </p>
                    )}

                    {/* Data */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.createdAt), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AgreementTimeline;
