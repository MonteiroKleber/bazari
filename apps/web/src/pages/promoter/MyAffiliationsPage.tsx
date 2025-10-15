import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AffiliationCard } from '../../components/affiliates/AffiliationCard';
import { StoreSearchDialog } from '../../components/affiliates/StoreSearchDialog';
import { ArrowLeft, Plus, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';

interface Affiliation {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeAvatar?: string;
  status: string;
  customCommission?: number;
  monthlySalesCap?: string;
  totalSales: string;
  totalCommission: string;
  salesCount: number;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  suspendedAt?: string;
}

export function MyAffiliationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('approved');

  useEffect(() => {
    loadAffiliations();
  }, []);

  const loadAffiliations = async () => {
    try {
      setLoading(true);

      const response = await apiHelpers.get<{ affiliations: Affiliation[] }>(
        '/api/chat/affiliates/me'
      );

      setAffiliations(response.affiliations || []);
    } catch (error) {
      console.error('Failed to load affiliations:', error);
      toast.error('Erro ao carregar afiliações');
    } finally {
      setLoading(false);
    }
  };

  const activeAffiliations = affiliations.filter((a) => a.status === 'approved');
  const pendingAffiliations = affiliations.filter((a) => a.status === 'pending');

  // Calculate total stats from active affiliations
  const totalStats = activeAffiliations.reduce(
    (acc, aff) => ({
      sales: acc.sales + aff.salesCount,
      revenue: acc.revenue + parseFloat(aff.totalSales),
      commission: acc.commission + parseFloat(aff.totalCommission),
    }),
    { sales: 0, revenue: 0, commission: 0 }
  );

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Minhas Afiliações</h1>
            <p className="text-muted-foreground">
              Gerencie suas parcerias com lojas
            </p>
          </div>
        </div>

        <Button onClick={() => setShowSearchDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Solicitar Afiliação
        </Button>
      </div>

      {/* Stats Summary */}
      {activeAffiliations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Afiliações Ativas</p>
                  <p className="text-2xl font-bold">{activeAffiliations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendido</p>
                  <p className="text-2xl font-bold">{totalStats.revenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">BZR</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissões Ganhas</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalStats.commission.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">BZR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Ativas
            {activeAffiliations.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({activeAffiliations.length})
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingAffiliations.length > 0 && (
              <span className="ml-1 rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-white">
                {pendingAffiliations.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Affiliations Tab */}
        <TabsContent value="approved" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : activeAffiliations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Nenhuma afiliação ativa</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Solicite afiliação a lojas para começar a promover produtos
                </p>
                <Button onClick={() => setShowSearchDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Solicitar Afiliação
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeAffiliations.map((affiliation) => (
              <AffiliationCard
                key={affiliation.id}
                affiliation={affiliation}
                onUpdate={loadAffiliations}
              />
            ))
          )}
        </TabsContent>

        {/* Pending Affiliations Tab */}
        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : pendingAffiliations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Nenhuma solicitação pendente</h3>
                <p className="text-sm text-muted-foreground">
                  Suas solicitações de afiliação aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingAffiliations.map((affiliation) => (
              <AffiliationCard
                key={affiliation.id}
                affiliation={affiliation}
                onUpdate={loadAffiliations}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Store Search Dialog */}
      <StoreSearchDialog
        open={showSearchDialog}
        onClose={() => setShowSearchDialog(false)}
        onSuccess={loadAffiliations}
      />
    </div>
  );
}
