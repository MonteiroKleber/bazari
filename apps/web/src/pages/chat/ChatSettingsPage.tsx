import { useState, useEffect } from 'react';
import { MissionCard } from '@/components/chat/MissionCard';
import { OpportunityCard } from '@/components/chat/OpportunityCard';
import { PromoterRanking } from '@/components/chat/PromoterRanking';
import { CashbackWidget } from '@/components/chat/CashbackWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

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

interface Opportunity {
  id: string;
  storeId: number;
  title: string;
  description: string;
  type: 'job' | 'freelance' | 'partnership';
  compensation?: string;
  requirements?: Record<string, any>;
  status: 'open' | 'filled' | 'closed';
  expiresAt?: number;
  createdAt: number;
}

export default function ChatSettingsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [loadingOpportunities, setLoadingOpportunities] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMissions();
    fetchOpportunities();
  }, []);

  const fetchMissions = async () => {
    setLoadingMissions(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/missions`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setMissions(data.data.missions);
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    } finally {
      setLoadingMissions(false);
    }
  };

  const fetchOpportunities = async () => {
    setLoadingOpportunities(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/opportunities?status=open`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setOpportunities(data.data.opportunities);
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const handleCompleteMission = async (missionId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/missions/${missionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (data.success && data.data.completed) {
        toast({
          title: 'Missão Completa!',
          description: data.data.message,
        });
        fetchMissions(); // Refresh
      } else {
        toast({
          title: 'Aviso',
          description: data.data.message || 'Missão ainda não pode ser completada',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to complete mission:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao completar missão',
        variant: 'destructive',
      });
    }
  };

  const handleApplyOpportunity = async (opportunityId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chat/opportunities/${opportunityId}/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            message: 'Tenho interesse nesta oportunidade!',
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Candidatura Enviada!',
          description: 'Sua candidatura foi enviada com sucesso',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Falha ao enviar candidatura',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar candidatura',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Monetização BazChat</h1>
        <p className="text-muted-foreground mt-1">
          Ganhe recompensas, complete missões e encontre oportunidades
        </p>
      </div>

      {/* Cashback Widget */}
      <CashbackWidget />

      {/* Tabs */}
      <Tabs defaultValue="missions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="missions">Missões</TabsTrigger>
          <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
          <TabsTrigger value="ranking">Rankings</TabsTrigger>
        </TabsList>

        {/* Missions Tab */}
        <TabsContent value="missions" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-3">Missões Ativas</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Complete missões para ganhar cashback em BZR
            </p>
          </div>

          {loadingMissions ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando missões...
            </div>
          ) : missions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma missão disponível no momento
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {missions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onComplete={handleCompleteMission}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-3">Oportunidades</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Vagas, freelances e parcerias no ecossistema Bazari
            </p>
          </div>

          {loadingOpportunities ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando oportunidades...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma oportunidade disponível no momento
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onApply={handleApplyOpportunity}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="space-y-4">
          <PromoterRanking />
        </TabsContent>
      </Tabs>
    </div>
  );
}
