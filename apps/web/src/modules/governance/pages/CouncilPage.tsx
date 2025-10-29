import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CouncilMemberCard } from '../components/CouncilMemberCard';
import { governanceApi } from '../api';
import { RefreshCw, Users, Shield, FileText } from 'lucide-react';

export function CouncilPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [councilMembers, setCouncilMembers] = useState<any[]>([]);
  const [techMembers, setTechMembers] = useState<any[]>([]);
  const [councilProposals, setCouncilProposals] = useState<any[]>([]);
  const [techProposals, setTechProposals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [councilRes, techRes, councilPropsRes, techPropsRes] = await Promise.all([
        governanceApi.getCouncilMembers(),
        governanceApi.getTechCommitteeMembers(),
        governanceApi.getCouncilProposals(),
        governanceApi.getTechCommitteeProposals(),
      ]);

      if (councilRes.success && councilRes.data) {
        setCouncilMembers(councilRes.data);
      }

      if (techRes.success && techRes.data) {
        setTechMembers(techRes.data);
      }

      if (councilPropsRes.success && councilPropsRes.data) {
        setCouncilProposals(councilPropsRes.data);
      }

      if (techPropsRes.success && techPropsRes.data) {
        setTechProposals(techPropsRes.data);
      }
    } catch (err) {
      console.error('Error loading council data:', err);
      setError('Failed to load council data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading council data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Conselho & Comitê Técnico</h1>
          <p className="text-muted-foreground">
            Membros eleitos e suas propostas em andamento
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadData} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="council" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="council">
            <Users className="h-4 w-4 mr-2" />
            Conselho ({councilMembers.length})
          </TabsTrigger>
          <TabsTrigger value="technical">
            <Shield className="h-4 w-4 mr-2" />
            Técnico ({techMembers.length})
          </TabsTrigger>
        </TabsList>

        {/* Council Tab */}
        <TabsContent value="council" className="space-y-6">
          {/* Council Members */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Membros do Conselho</h2>
            {councilMembers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum membro encontrado</h3>
                  <p className="text-muted-foreground">
                    O conselho ainda não possui membros eleitos
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {councilMembers.map((member, index) => (
                  <CouncilMemberCard
                    key={member.address || index}
                    address={member.address || member}
                    backing={member.backing}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Council Proposals */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Propostas do Conselho</h2>
            {councilProposals.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma proposta ativa</h3>
                  <p className="text-muted-foreground">
                    Não há propostas do conselho no momento
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {councilProposals.map((proposal, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => navigate(`/app/governance/proposals/council/${index}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">Proposta #{index}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Clique para ver detalhes
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Technical Committee Tab */}
        <TabsContent value="technical" className="space-y-6">
          {/* Tech Members */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Membros do Comitê Técnico</h2>
            {techMembers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum membro encontrado</h3>
                  <p className="text-muted-foreground">
                    O comitê técnico ainda não possui membros
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {techMembers.map((member, index) => (
                  <CouncilMemberCard
                    key={member.address || index}
                    address={member.address || member}
                    isTechnical
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tech Proposals */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Propostas do Comitê Técnico</h2>
            {techProposals.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma proposta ativa</h3>
                  <p className="text-muted-foreground">
                    Não há propostas do comitê técnico no momento
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {techProposals.map((proposal, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => navigate(`/app/governance/proposals/technical/${index}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">Proposta #{index}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Clique para ver detalhes
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
