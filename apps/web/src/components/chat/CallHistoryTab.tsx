/**
 * CallHistoryTab - Aba de histórico de chamadas
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneMissed, Clock, Trash2 } from 'lucide-react';
import { CallHistoryItem } from './CallHistoryItem';
import { useCallStore } from '@/stores/call.store';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { CallType } from '@bazari/shared-types';

interface CallHistoryData {
  id: string;
  threadId: string;
  type: CallType;
  status: 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED' | 'BUSY';
  caller: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  callee: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isOutgoing: boolean;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
}

interface CallStats {
  totalCalls: number;
  missedCalls: number;
  totalDurationSeconds: number;
}

function formatTotalDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
}

export function CallHistoryTab() {
  const navigate = useNavigate();
  const { startCall } = useCallStore();

  const [calls, setCalls] = useState<CallHistoryData[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  // Carregar histórico de chamadas
  const loadCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [callsRes, statsRes] = await Promise.all([
        api.get<{ calls: CallHistoryData[]; nextCursor?: string }>('/api/chat/calls?limit=50'),
        api.get<CallStats>('/api/chat/calls/stats'),
      ]);

      setCalls(callsRes.calls || []);
      setStats(statsRes);
    } catch (err: any) {
      console.error('Failed to load call history:', err);
      setError('Erro ao carregar histórico de chamadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Handler para iniciar chamada - usa dados do próprio call
  const handleCallClick = useCallback(
    async (profileId: string, threadId: string, type: CallType) => {
      // Buscar call da lista para pegar os dados do perfil
      const call = calls.find((c) => c.threadId === threadId);
      if (!call) {
        // Fallback: navegar para thread
        navigate(`/app/chat/${threadId}`);
        return;
      }

      // Determinar quem é o outro participante (callee para a nova chamada)
      const otherParticipant = call.isOutgoing ? call.callee : call.caller;

      try {
        await startCall(threadId, otherParticipant.id, otherParticipant, type);
      } catch (err) {
        console.error('Failed to start call:', err);
      }
    },
    [calls, startCall, navigate]
  );

  // Handler para limpar todo histórico
  const handleClearHistory = async () => {
    try {
      setClearing(true);
      await api.delete('/api/chat/calls');
      setCalls([]);
      setStats({ totalCalls: 0, missedCalls: 0, totalDurationSeconds: 0 });
      toast.success('Histórico limpo');
    } catch (err) {
      console.error('Failed to clear call history:', err);
      toast.error('Erro ao limpar histórico');
    } finally {
      setClearing(false);
    }
  };

  // Handler para deletar chamada individual
  const handleDeleteCall = async (callId: string) => {
    try {
      await api.delete(`/api/chat/calls/${callId}`);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
      // Atualizar stats
      if (stats) {
        setStats({
          ...stats,
          totalCalls: Math.max(0, stats.totalCalls - 1),
        });
      }
      toast.success('Chamada removida');
    } catch (err) {
      console.error('Failed to delete call:', err);
      toast.error('Erro ao remover chamada');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {/* Stats skeleton */}
        <div className="bg-muted/50 rounded-lg p-4">
          <Skeleton className="h-4 w-48" />
        </div>
        {/* Items skeleton */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PhoneMissed className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={loadCalls}
          className="mt-4 text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Phone className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Nenhuma chamada ainda</p>
        <p className="text-muted-foreground text-sm mt-1">
          Suas chamadas de voz e vídeo aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats e botão limpar */}
      {stats && (
        <div className="bg-muted/50 rounded-lg p-4 mx-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{stats.totalCalls} chamadas</span>
              </div>
              {stats.missedCalls > 0 && (
                <div className="flex items-center gap-1.5 text-red-500">
                  <PhoneMissed className="h-4 w-4" />
                  <span>{stats.missedCalls} perdidas</span>
                </div>
              )}
              {stats.totalDurationSeconds > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTotalDuration(stats.totalDurationSeconds)} total</span>
                </div>
              )}
            </div>

            {/* Botão limpar histórico */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={clearing || calls.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar histórico de chamadas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todas as {stats.totalCalls} chamadas serão
                    removidas permanentemente do seu histórico.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearHistory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Limpar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Lista de chamadas */}
      <div className="space-y-1 px-4">
        {calls.map((call) => (
          <CallHistoryItem
            key={call.id}
            call={call}
            onCallClick={handleCallClick}
            onDeleteCall={handleDeleteCall}
          />
        ))}
      </div>
    </div>
  );
}
