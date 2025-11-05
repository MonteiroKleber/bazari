import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CouncilVoteButtons,
  CloseMotionButton,
  CreateMotionModal,
} from '../components';
import { useCouncilStatus, type TreasuryRequest } from '../hooks';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Coins,
  User,
  Calendar,
  FileText,
  Vote,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING_REVIEW: { label: 'Pendente Revisão', variant: 'outline' },
  IN_VOTING: { label: 'Em Votação', variant: 'default' },
  APPROVED: { label: 'Aprovada', variant: 'default' },
  REJECTED: { label: 'Rejeitada', variant: 'destructive' },
  PAID_OUT: { label: 'Paga', variant: 'secondary' },
};

export function TreasuryRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMember: isCouncilMember } = useCouncilStatus();

  const [request, setRequest] = useState<TreasuryRequest | null>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMotionModal, setShowCreateMotionModal] = useState(false);

  const fetchRequestDetail = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/governance/treasury/requests/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setRequest(data.data);
        setVotes(data.data.votes || []);
      } else {
        throw new Error(data.error || 'Failed to fetch request');
      }
    } catch (err) {
      console.error('[TreasuryRequestDetailPage] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load request details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetail();
  }, [id]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)} BZR`;
    return `${num.toFixed(2)} planck`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto py-12">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-lg font-medium">Erro ao carregar solicitação</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => navigate('/app/governance/treasury/requests')}>
                Voltar para Lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[request.status] || { label: request.status, variant: 'outline' };
  const ayeVotes = votes.filter((v) => v.vote).length;
  const nayVotes = votes.filter((v) => !v.vote).length;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/governance/treasury/requests')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              <Coins className="h-4 w-4 mr-1" />
              Tesouro
            </Badge>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            <span className="text-sm text-muted-foreground">#{request.id}</span>
          </div>
          <h1 className="text-3xl font-bold">{request.title}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Descrição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap break-words">{request.description}</p>
            </CardContent>
          </Card>

          {/* Voting Section */}
          {request.councilMotionHash && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5" />
                  Votação do Council
                </CardTitle>
                <CardDescription>
                  Motion: <code className="text-xs">{formatAddress(request.councilMotionHash)}</code>
                  {request.councilMotionIndex !== null && ` #${request.councilMotionIndex}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Vote Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-2xl font-bold text-green-600">{ayeVotes}</p>
                    <p className="text-sm text-muted-foreground">Votos SIM</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-2xl font-bold text-red-600">{nayVotes}</p>
                    <p className="text-sm text-muted-foreground">Votos NÃO</p>
                  </div>
                </div>

                {/* Votes List */}
                {votes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Votos Registrados:</p>
                    <div className="space-y-1">
                      {votes.map((vote, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs"
                        >
                          <span className="font-mono">{formatAddress(vote.voter)}</span>
                          <Badge variant={vote.vote ? 'default' : 'destructive'}>
                            {vote.vote ? 'SIM' : 'NÃO'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vote Buttons */}
                {request.status === 'IN_VOTING' && isCouncilMember && (
                  <>
                    <Separator />
                    <CouncilVoteButtons
                      motionHash={request.councilMotionHash}
                      motionIndex={request.councilMotionIndex!}
                      onVoteSuccess={fetchRequestDetail}
                    />
                  </>
                )}

                {/* Close Button */}
                {request.status === 'IN_VOTING' && (
                  <>
                    <Separator />
                    <CloseMotionButton
                      motionHash={request.councilMotionHash}
                      motionIndex={request.councilMotionIndex!}
                      onCloseSuccess={fetchRequestDetail}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create Motion Button */}
          {request.status === 'PENDING_REVIEW' && isCouncilMember && (
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Você é membro do Council</p>
                    <p className="text-sm text-muted-foreground">
                      Crie uma motion para colocar esta solicitação em votação
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateMotionModal(true)}>
                    Criar Motion
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Financial Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Financeiras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Coins className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Solicitado</p>
                  <p className="text-lg font-bold text-primary">{formatBalance(request.value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Proposer</p>
                  <p className="text-xs font-mono break-all">{request.proposer}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Beneficiário</p>
                  <p className="text-xs font-mono break-all">{request.beneficiary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Criada</p>
                  <p className="text-xs">{formatDate(request.createdAt)}</p>
                </div>
              </div>

              {request.reviewedAt && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Revisada</p>
                      <p className="text-xs">{formatDate(request.reviewedAt)}</p>
                    </div>
                  </div>
                </>
              )}

              {request.approvedAt && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Aprovada</p>
                      <p className="text-xs">{formatDate(request.approvedAt)}</p>
                    </div>
                  </div>
                </>
              )}

              {request.paidOutAt && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Paga</p>
                      <p className="text-xs">{formatDate(request.paidOutAt)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Motion Modal */}
      {request && (
        <CreateMotionModal
          request={request}
          open={showCreateMotionModal}
          onOpenChange={setShowCreateMotionModal}
          onSuccess={fetchRequestDetail}
        />
      )}
    </div>
  );
}
