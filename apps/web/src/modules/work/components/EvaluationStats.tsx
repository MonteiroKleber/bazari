// path: apps/web/src/modules/work/components/EvaluationStats.tsx
// Estatísticas de avaliações para exibir no perfil

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, Briefcase, MessageSquare, Clock, Award } from 'lucide-react';
import { RatingStars } from './RatingStars';
import type { TalentStatsResponse } from '../api';

interface EvaluationStatsProps {
  stats: TalentStatsResponse;
  compact?: boolean;
}

interface RatingBarProps {
  label: string;
  value: number | null;
  icon?: React.ReactNode;
}

function RatingBar({ label, value, icon }: RatingBarProps) {
  if (value === null) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-medium">{value.toFixed(1)}</span>
      </div>
      <Progress value={(value / 5) * 100} className="h-2" />
    </div>
  );
}

export function EvaluationStats({ stats, compact = false }: EvaluationStatsProps) {
  // Sem avaliações
  if (stats.totalEvaluations === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Star className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhuma avaliação ainda</p>
          {stats.completedContracts > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {stats.completedContracts} contrato{stats.completedContracts > 1 ? 's' : ''}{' '}
              concluído{stats.completedContracts > 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <RatingStars value={stats.averageRating || 0} readonly size="sm" />
          <span className="font-semibold">{stats.averageRating?.toFixed(1)}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          ({stats.totalEvaluations} avaliação{stats.totalEvaluations > 1 ? 'ões' : ''})
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-4 w-4" />
          Avaliações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Nota geral */}
          <div className="text-center sm:text-left">
            <div className="text-4xl font-bold">{stats.averageRating?.toFixed(1)}</div>
            <RatingStars value={stats.averageRating || 0} readonly size="md" />
            <div className="text-sm text-muted-foreground mt-1">
              {stats.totalEvaluations} avaliação{stats.totalEvaluations > 1 ? 'ões' : ''}
            </div>
          </div>

          {/* Barras de rating */}
          {stats.ratings && (
            <div className="flex-1 space-y-3">
              <RatingBar
                label="Comunicação"
                value={stats.ratings.communication}
                icon={<MessageSquare className="h-3.5 w-3.5" />}
              />
              <RatingBar
                label="Pontualidade"
                value={stats.ratings.punctuality}
                icon={<Clock className="h-3.5 w-3.5" />}
              />
              <RatingBar
                label="Qualidade"
                value={stats.ratings.quality}
                icon={<Star className="h-3.5 w-3.5" />}
              />
            </div>
          )}
        </div>

        {/* Contratos concluídos */}
        {stats.completedContracts > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span>
              {stats.completedContracts} contrato{stats.completedContracts > 1 ? 's' : ''}{' '}
              concluído{stats.completedContracts > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EvaluationStats;
