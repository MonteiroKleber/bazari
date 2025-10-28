import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { p2pApi } from '../api';

interface PhaseInfo {
  phase: string;
  priceBZR: string;
  supplyLimit: string;
  supplyRemaining: string;
  progressPercent: number;
  isActive: boolean;
  nextPhase: string | null;
}

interface ZARIPhaseBadgeProps {
  variant?: 'compact' | 'full';
  onPhaseClick?: () => void;
}

export function ZARIPhaseBadge({ variant = 'compact', onPhaseClick }: ZARIPhaseBadgeProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<PhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    p2pApi.getZARIPhase()
      .then(setPhase)
      .catch((err) => console.error('Failed to load ZARI phase:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Badge variant="secondary">{t('common.loading', 'Carregando...')}</Badge>;
  }

  if (!phase) {
    return <Badge variant="destructive">{t('p2p.zari.phase.error', 'Erro ao carregar fase')}</Badge>;
  }

  const priceBRL = (Number(phase.priceBZR) / 1e12).toFixed(2);
  const remainingZARI = (Number(phase.supplyRemaining) / 1e12).toFixed(0);

  if (variant === 'compact') {
    return (
      <Badge
        variant={phase.isActive ? 'default' : 'secondary'}
        className={onPhaseClick ? 'cursor-pointer' : ''}
        onClick={onPhaseClick}
      >
        🏛️ {t('p2p.zari.phase.title', { phase: phase.phase })} · R$ {priceBRL}/ZARI · {phase.progressPercent}%
      </Badge>
    );
  }

  // variant === 'full'
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('p2p.zari.stats.activePhase', 'Fase Ativa')}: {phase.phase}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('p2p.zari.stats.price', 'Preço')}: R$ {priceBRL}/ZARI</span>
          <span>{phase.progressPercent}% {t('p2p.zari.stats.progress', 'vendido')}</span>
        </div>
        <Progress value={phase.progressPercent} />
        <div className="text-xs text-muted-foreground">
          {remainingZARI} ZARI {t('p2p.zari.phase.remaining', 'restantes')} de {(Number(phase.supplyLimit) / 1e12).toFixed(0)}
        </div>
        {!phase.isActive && (
          <div className="text-sm text-amber-600 font-medium">
            {t('p2p.zari.phase.soldOut', 'Esgotado')}
            {phase.nextPhase && ` · ${t('p2p.zari.phase.next', 'Próxima fase')}: ${phase.nextPhase}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
