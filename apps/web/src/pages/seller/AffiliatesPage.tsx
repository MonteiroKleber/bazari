import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AffiliateRequestCard } from '../../components/affiliates/AffiliateRequestCard';
import { ArrowLeft, Users, UserCheck, UserX, AlertCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';

interface Affiliate {
  id: string;
  promoterId: string;
  promoterHandle: string;
  promoterDisplayName: string;
  promoterAvatar?: string;
  promoterReputation: number;
  status: string;
  customCommission?: number;
  monthlySalesCap?: string;
  totalSales: string;
  totalCommission: string;
  salesCount: number;
  notes?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  suspendedAt?: string;
}

export function AffiliatesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadStore();
  }, []);

  useEffect(() => {
    if (storeId) {
      loadAffiliates();
    }
  }, [storeId, activeTab]);

  const loadStore = async () => {
    try {
      const response = await apiHelpers.get<{ items: Array<{ id: string; onChainStoreId?: number | string | bigint }> }>('/me/sellers');

      if (response.items && response.items.length > 0) {
        const firstStore = response.items[0];
        const storeIdNum = firstStore.onChainStoreId
          ? (typeof firstStore.onChainStoreId === 'string'
              ? parseInt(firstStore.onChainStoreId)
              : typeof firstStore.onChainStoreId === 'bigint'
              ? Number(firstStore.onChainStoreId)
              : Number(firstStore.onChainStoreId))
          : null;

        if (storeIdNum) {
          setStoreId(storeIdNum);
        } else {
          toast.error('Sua loja ainda não foi sincronizada na blockchain');
        }
      } else {
        toast.error('Você não possui uma loja cadastrada');
        navigate('/app/seller');
      }
    } catch (error) {
      console.error('Failed to load store:', error);
      toast.error('Erro ao carregar loja');
    }
  };

  const loadAffiliates = async () => {
    if (!storeId) return;

    try {
      setLoading(true);

      const response = await apiHelpers.get<{ affiliates: Affiliate[] }>(
        `/api/chat/affiliates/store/${storeId}?status=${activeTab}`
      );

      setAffiliates(response.affiliates || []);
    } catch (error) {
      console.error('Failed to load affiliates:', error);
      toast.error('Erro ao carregar afiliados');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = affiliates.filter(a => a.status === 'pending').length;
  const approvedCount = affiliates.filter(a => a.status === 'approved').length;
  const rejectedCount = affiliates.filter(a => a.status === 'rejected').length;
  const suspendedCount = affiliates.filter(a => a.status === 'suspended').length;

  return (
    <div className="container max-w-5xl py-2 md:py-3 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/seller')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Programa de Afiliados</h1>
            <p className="text-muted-foreground">
              Gerencie promotores que podem vender produtos da sua loja
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/app/seller/commissions')}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Ver Analytics
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="gap-2">
            <Users className="h-4 w-4" />
            Pendentes
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="approved" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Aprovados
            {approvedCount > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({approvedCount})
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="rejected" className="gap-2">
            <UserX className="h-4 w-4" />
            Rejeitados
            {rejectedCount > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({rejectedCount})
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="suspended" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Suspensos
            {suspendedCount > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({suspendedCount})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : affiliates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma solicitação pendente
              </CardContent>
            </Card>
          ) : (
            affiliates.map((affiliate) => (
              <AffiliateRequestCard
                key={affiliate.id}
                affiliate={affiliate}
                storeId={storeId!}
                onUpdate={loadAffiliates}
              />
            ))
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : affiliates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum afiliado aprovado
              </CardContent>
            </Card>
          ) : (
            affiliates.map((affiliate) => (
              <AffiliateRequestCard
                key={affiliate.id}
                affiliate={affiliate}
                storeId={storeId!}
                onUpdate={loadAffiliates}
              />
            ))
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : affiliates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma solicitação rejeitada
              </CardContent>
            </Card>
          ) : (
            affiliates.map((affiliate) => (
              <AffiliateRequestCard
                key={affiliate.id}
                affiliate={affiliate}
                storeId={storeId!}
                onUpdate={loadAffiliates}
              />
            ))
          )}
        </TabsContent>

        {/* Suspended Tab */}
        <TabsContent value="suspended" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : affiliates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum afiliado suspenso
              </CardContent>
            </Card>
          ) : (
            affiliates.map((affiliate) => (
              <AffiliateRequestCard
                key={affiliate.id}
                affiliate={affiliate}
                storeId={storeId!}
                onUpdate={loadAffiliates}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
