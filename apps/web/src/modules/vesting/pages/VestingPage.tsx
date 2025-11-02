// FASE 9: Vesting System - Main Page
// path: apps/web/src/modules/vesting/pages/VestingPage.tsx

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicHeader } from '@/components/DynamicHeader';
import { Footer } from '@/components/Footer';
import { vestingApi } from '../api';
import type { VestingStats } from '../types';
import { VESTING_CATEGORIES } from '../constants';
import { TrendingUp, Lock, Unlock, Clock } from 'lucide-react';

export function VestingPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VestingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await vestingApi.getVestingStats();

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load vesting stats');
      }
    } catch (err) {
      console.error('Error loading vesting stats:', err);
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <>
        <DynamicHeader />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <DynamicHeader />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={loadStats} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <DynamicHeader />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Token Vesting</h1>
        <p className="text-muted-foreground">
          Acompanhe a liberação gradual de tokens BZR para stakeholders
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Alocado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${Number(stats.totalAllocated).toLocaleString()} BZR` : '0 BZR'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Lock className="inline w-3 h-3 mr-1" />
              Tokens em vesting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Liberado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats ? `${Number(stats.totalVested).toLocaleString()} BZR` : '0 BZR'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Unlock className="inline w-3 h-3 mr-1" />
              Disponível para uso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ainda Locked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${Number(stats.totalUnvested).toLocaleString()} BZR` : '0 BZR'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Clock className="inline w-3 h-3 mr-1" />
              Aguardando liberação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? `${stats.vestedPercentage.toFixed(2)}%` : '0%'}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${stats?.vestedPercentage || 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias de Vesting</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="founders" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(VESTING_CATEGORIES).map(([key, info]) => (
                <TabsTrigger key={key} value={key}>
                  <span className="mr-1">{info.icon}</span>
                  <span className="hidden md:inline">{info.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(VESTING_CATEGORIES).map(([key, info]) => {
              const categoryStats = stats?.categories[key as keyof typeof stats.categories];

              return (
                <TabsContent key={key} value={key} className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span>{info.label}</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {info.description}
                        </p>
                      </div>
                    </div>

                    {categoryStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Locked</p>
                          <p className="text-lg font-semibold">
                            {Number(categoryStats.totalLocked).toLocaleString()} BZR
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Liberado</p>
                          <p className="text-lg font-semibold text-green-600">
                            {Number(categoryStats.vested).toLocaleString()} BZR
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Locked</p>
                          <p className="text-lg font-semibold">
                            {Number(categoryStats.unvested).toLocaleString()} BZR
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Progresso</p>
                          <p className="text-lg font-semibold">
                            {categoryStats.vestedPercentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                      <p className="font-medium mb-1">Detalhes do Schedule:</p>
                      {categoryStats && (
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Início: Block #{categoryStats.startBlock.toLocaleString()}</li>
                          <li>• Duração: {categoryStats.duration.toLocaleString()} blocks</li>
                          <li>• Cliff: {categoryStats.cliff.toLocaleString()} blocks</li>
                          <li>
                            • Account:{' '}
                            <code className="text-xs">
                              {categoryStats.account.substring(0, 10)}...
                              {categoryStats.account.substring(categoryStats.account.length - 8)}
                            </code>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Como Funciona o Vesting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Vesting</strong> é a liberação gradual de tokens ao longo do tempo
          </p>
          <p>
            • <strong>Cliff</strong> é o período inicial onde nenhum token é liberado
          </p>
          <p>
            • Após o cliff, tokens são liberados continuamente a cada bloco
          </p>
          <p>
            • Block time: 6 segundos • 1 dia = 14,400 blocks • 1 ano = 5,256,000 blocks
          </p>
        </CardContent>
      </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
