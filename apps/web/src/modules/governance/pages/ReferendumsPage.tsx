import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { governanceApi } from '../api';
import { ArrowLeft, Vote, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatBalance } from '@/modules/wallet/utils/format';

interface Referendum {
  id: number;
  title: string;
  description: string;
  proposalHash: string;
  status: 'ONGOING' | 'APPROVED' | 'REJECTED';
  end: number;
  threshold?: any;
  delay?: number;
  tally?: {
    ayes: string;
    nays: string;
    turnout: string;
  };
}

export function ReferendumsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referendums, setReferendums] = useState<Referendum[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState(0);

  useEffect(() => {
    loadReferendums();
    loadCurrentBlock();
  }, []);

  const loadReferendums = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await governanceApi.getDemocracyReferendums();

      if (response.success && response.data) {
        setReferendums(response.data);
      } else {
        setError('Failed to load referendums');
      }
    } catch (err) {
      console.error('Error loading referendums:', err);
      setError('Failed to load referendums');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentBlock = async () => {
    try {
      // Fetch current block number from API (you may need to add this endpoint)
      // For now, we'll just set a placeholder
      setCurrentBlock(0);
    } catch (err) {
      console.error('Error loading current block:', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading referendums...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/governance')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Referendos Ativos</h1>
          <p className="text-muted-foreground">
            Vote em referendos em andamento para influenciar decisões da rede
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive mb-6">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadReferendums} variant="outline">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!error && referendums.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum Referendo Ativo</CardTitle>
            <CardDescription>
              Não há referendos em votação no momento. Aguarde propostas serem promovidas para
              referendo.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Referendums List */}
      <div className="grid gap-4">
        {referendums.map((referendum) => (
          <ReferendumCard
            key={referendum.id}
            referendum={referendum}
            currentBlock={currentBlock}
            onClick={() => navigate(`/app/governance/referendums/${referendum.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface ReferendumCardProps {
  referendum: Referendum;
  currentBlock: number;
  onClick: () => void;
}

function ReferendumCard({ referendum, currentBlock, onClick }: ReferendumCardProps) {
  const statusConfig = {
    ONGOING: {
      label: 'Votação Ativa',
      icon: <Vote className="h-3 w-3" />,
      color: 'bg-blue-500/10 text-blue-700 border-blue-300',
    },
    APPROVED: {
      label: 'Aprovado',
      icon: <CheckCircle className="h-3 w-3" />,
      color: 'bg-green-500/10 text-green-700 border-green-300',
    },
    REJECTED: {
      label: 'Rejeitado',
      icon: <XCircle className="h-3 w-3" />,
      color: 'bg-red-500/10 text-red-700 border-red-300',
    },
  };

  const currentStatus = statusConfig[referendum.status];

  // Calculate voting percentages
  const totalVotes = referendum.tally
    ? parseFloat(referendum.tally.ayes) + parseFloat(referendum.tally.nays)
    : 0;
  const ayePercent = totalVotes > 0 ? (parseFloat(referendum.tally?.ayes || '0') / totalVotes) * 100 : 0;
  const nayPercent = totalVotes > 0 ? (parseFloat(referendum.tally?.nays || '0') / totalVotes) * 100 : 0;

  // Calculate remaining blocks
  const blocksRemaining = referendum.end - currentBlock;
  const hoursRemaining = blocksRemaining > 0 ? (blocksRemaining * 6) / 3600 : 0; // 6 seconds per block

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={currentStatus.color}>
                {currentStatus.icon}
                <span className="ml-1">{currentStatus.label}</span>
              </Badge>
              {referendum.status === 'ONGOING' && blocksRemaining > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {hoursRemaining < 1
                    ? `${Math.floor(hoursRemaining * 60)}m restantes`
                    : `${Math.floor(hoursRemaining)}h restantes`}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl mb-1">
              {referendum.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {referendum.description || 'Nenhuma descrição disponível.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {referendum.tally && (
        <CardContent>
          <div className="space-y-3">
            {/* Aye Votes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-green-600">Aye (Sim)</span>
                <span className="text-xs font-medium">{ayePercent.toFixed(1)}%</span>
              </div>
              <Progress value={ayePercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatBalance(referendum.tally.ayes)} BZR
              </p>
            </div>

            {/* Nay Votes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-red-600">Nay (Não)</span>
                <span className="text-xs font-medium">{nayPercent.toFixed(1)}%</span>
              </div>
              <Progress value={nayPercent} className="h-2 bg-red-100" />
              <p className="text-xs text-muted-foreground mt-1">
                {formatBalance(referendum.tally.nays)} BZR
              </p>
            </div>

            {/* Turnout */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Turnout</span>
                <span className="text-xs font-medium">
                  {formatBalance(referendum.tally.turnout)} BZR
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
