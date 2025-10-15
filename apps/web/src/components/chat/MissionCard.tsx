import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Star, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Mission {
  id: string;
  title: string;
  description: string;
  kind: 'onboarding' | 'referral' | 'sales' | 'engagement';
  goal: number;
  reward: string;
  expiresAt?: number;
  progress?: number;
  completed?: boolean;
}

interface MissionCardProps {
  mission: Mission;
  onComplete?: (missionId: string) => void;
  isLoading?: boolean;
}

const kindLabels = {
  onboarding: 'Começando',
  referral: 'Indicação',
  sales: 'Vendas',
  engagement: 'Engajamento',
};

const kindIcons = {
  onboarding: Star,
  referral: Trophy,
  sales: Trophy,
  engagement: Star,
};

const kindColors = {
  onboarding: 'bg-blue-100 text-blue-800',
  referral: 'bg-green-100 text-green-800',
  sales: 'bg-purple-100 text-purple-800',
  engagement: 'bg-yellow-100 text-yellow-800',
};

export function MissionCard({ mission, onComplete, isLoading }: MissionCardProps) {
  const [claiming, setClaiming] = useState(false);

  const progress = mission.progress || 0;
  const progressPercentage = Math.min((progress / mission.goal) * 100, 100);
  const isExpired = mission.expiresAt && mission.expiresAt < Date.now();
  const canComplete = progress >= mission.goal && !mission.completed && !isExpired;

  const KindIcon = kindIcons[mission.kind];

  const handleComplete = async () => {
    if (!canComplete || !onComplete) return;

    setClaiming(true);
    try {
      await onComplete(mission.id);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${mission.completed ? 'opacity-75 bg-muted/50' : 'bg-card'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${kindColors[mission.kind]}`}>
            <KindIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{mission.title}</h3>
              {mission.completed && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${kindColors[mission.kind]}`}>
              {kindLabels[mission.kind]}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-green-600">
            +{parseFloat(mission.reward).toFixed(2)} BZR
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">{mission.description}</p>

      {/* Progress Bar */}
      {!mission.completed && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{progress} / {mission.goal}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Expiration */}
      {mission.expiresAt && !mission.completed && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {isExpired ? (
            <span className="text-red-600">Expirada</span>
          ) : (
            <span>Expira em {formatDistanceToNow(new Date(mission.expiresAt), { locale: ptBR })}</span>
          )}
        </div>
      )}

      {/* Action Button */}
      {canComplete && !mission.completed && (
        <Button
          onClick={handleComplete}
          disabled={isLoading || claiming}
          className="w-full"
          size="sm"
        >
          {claiming ? 'Reivindicando...' : 'Reivindicar Recompensa'}
        </Button>
      )}

      {mission.completed && (
        <div className="text-center text-sm text-green-600 font-medium">
          ✓ Missão Completa!
        </div>
      )}
    </div>
  );
}
