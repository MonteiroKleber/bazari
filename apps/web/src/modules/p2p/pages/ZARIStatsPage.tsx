import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { p2pApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ZARIPhaseBadge } from '../components/ZARIPhaseBadge';

type PhaseInfo = {
  phase: string;
  priceBZR: string;
  supplyLimit: string;
  supplySold: string;
  supplyRemaining: string;
  progressPercent: number;
  isActive: boolean;
  nextPhase: string | null;
};

type PhaseStats = {
  phase: string;
  priceBZR: string;
  supplyLimit: string;
  active: boolean;
  startBlock: string | null;
  endBlock: string | null;
};

type ZARIStats = {
  phases: PhaseStats[];
  activePhase: string | null;
  totalSold: string;
  totalP2PSupply: string;
  overallProgress: number;
  completedOrders: number;
};

export default function ZARIStatsPage() {
  const { t } = useTranslation();
  const [currentPhase, setCurrentPhase] = useState<PhaseInfo | null>(null);
  const [stats, setStats] = useState<ZARIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [phaseRes, statsRes] = await Promise.all([
          p2pApi.getZARIPhase(),
          p2pApi.getZARIStats(),
        ]);
        setCurrentPhase(phaseRes);
        setStats(statsRes);
      } catch (e) {
        setError((e as Error).message || 'Erro ao carregar estatísticas ZARI');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-3">
        <h1 className="text-2xl font-bold mb-4">{t('p2p.zari.stats.title', 'Estatísticas ZARI')}</h1>
        <div className="text-muted-foreground">{t('common.loading', 'Carregando...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-3">
        <h1 className="text-2xl font-bold mb-4">{t('p2p.zari.stats.title', 'Estatísticas ZARI')}</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentPhase || !stats) {
    return (
      <div className="container mx-auto px-4 py-3">
        <h1 className="text-2xl font-bold mb-4">{t('p2p.zari.stats.title', 'Estatísticas ZARI')}</h1>
        <div className="text-muted-foreground">{t('p2p.zari.stats.noData', 'Nenhuma estatística disponível')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-3 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏛️ {t('p2p.zari.stats.title', 'Estatísticas ZARI')}</h1>
        <Badge variant={currentPhase.isActive ? 'default' : 'secondary'}>
          {currentPhase.isActive
            ? t('p2p.zari.phase.active', 'Fase ativa')
            : t('p2p.zari.phase.soldOut', 'Fase esgotada')
          }
        </Badge>
      </div>

      {/* Current Phase Badge (Full variant) */}
      <ZARIPhaseBadge variant="full" />

      {/* Overall Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('p2p.zari.stats.overall', 'Visão Geral')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('p2p.zari.stats.totalSupply', 'Oferta total P2P')}</span>
              <span className="font-mono font-medium">{Number(stats.totalP2PSupply).toLocaleString()} ZARI</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('p2p.zari.stats.totalSold', 'Total vendido')}</span>
              <span className="font-mono font-medium">{Number(stats.totalSold).toLocaleString()} ZARI</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('p2p.zari.stats.totalRemaining', 'Total restante')}</span>
              <span className="font-mono font-medium">{(Number(stats.totalP2PSupply) - Number(stats.totalSold)).toLocaleString()} ZARI</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('p2p.zari.stats.completedOrders', 'Pedidos concluídos')}</span>
              <span className="font-mono font-medium">{stats.completedOrders.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('p2p.zari.stats.progress', 'Progresso geral')}</span>
              <span className="font-medium">{stats.overallProgress.toFixed(1)}%</span>
            </div>
            <Progress value={stats.overallProgress} className="h-3" />
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('p2p.zari.stats.currentPhase', 'Fase atual')}</span>
              <Badge variant="secondary">Fase {stats.activePhase || '—'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase History Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('p2p.zari.stats.phaseHistory', 'Histórico de Fases')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">{t('p2p.zari.stats.table.phase', 'Fase')}</th>
                  <th className="text-right py-2 px-2 font-medium">{t('p2p.zari.stats.table.priceBZR', 'Preço (BZR)')}</th>
                  <th className="text-right py-2 px-2 font-medium">{t('p2p.zari.stats.table.supply', 'Oferta')}</th>
                  <th className="text-center py-2 px-2 font-medium">{t('p2p.zari.stats.table.startBlock', 'Bloco Início')}</th>
                  <th className="text-center py-2 px-2 font-medium">{t('p2p.zari.stats.table.endBlock', 'Bloco Fim')}</th>
                  <th className="text-center py-2 px-2 font-medium">{t('p2p.zari.stats.table.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.phases.map((phase) => {
                  return (
                    <tr key={phase.phase} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <Badge variant={phase.active ? 'default' : 'outline'}>
                          Fase {phase.phase}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-2 font-mono">{phase.priceBZR} BZR</td>
                      <td className="text-right py-3 px-2 font-mono">{Number(phase.supplyLimit).toLocaleString()} ZARI</td>
                      <td className="text-center py-3 px-2 font-mono text-xs">
                        {phase.startBlock || '—'}
                      </td>
                      <td className="text-center py-3 px-2 font-mono text-xs">
                        {phase.endBlock || '—'}
                      </td>
                      <td className="text-center py-3 px-2">
                        {phase.active ? (
                          <Badge variant="default">{t('p2p.zari.phase.active', 'Ativa')}</Badge>
                        ) : phase.endBlock ? (
                          <Badge variant="secondary">{t('p2p.zari.phase.completed', 'Concluída')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('p2p.zari.phase.pending', 'Pendente')}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('p2p.zari.stats.info.title', 'Sobre ZARI')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {t('p2p.zari.stats.info.desc1', 'ZARI é o token de governança da rede Bazari, distribuído em fases progressivas através do sistema P2P.')}
          </p>
          <p>
            {t('p2p.zari.stats.info.desc2', 'Cada fase possui um preço fixo em BZR e uma oferta limitada. Quando uma fase esgota, a próxima fase é ativada automaticamente com um preço mais alto.')}
          </p>
          <p className="font-medium">
            {t('p2p.zari.stats.info.phases', 'Fases:')}
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('p2p.zari.stats.info.phase2a', 'Fase 2A: 0.25 BZR/ZARI (10 milhões ZARI)')}</li>
            <li>{t('p2p.zari.stats.info.phase2b', 'Fase 2B: 0.35 BZR/ZARI (10 milhões ZARI)')}</li>
            <li>{t('p2p.zari.stats.info.phase3', 'Fase 3: 0.50 BZR/ZARI (10 milhões ZARI)')}</li>
          </ul>
          <p>
            {t('p2p.zari.stats.info.totalSupply', 'Oferta total: 30 milhões ZARI distribuídos via P2P.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
