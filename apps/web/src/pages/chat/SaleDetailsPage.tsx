import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { ArrowLeft, ExternalLink, Share2, Copy } from 'lucide-react';
import { SplitVisualization } from '../../components/chat/SplitVisualization';
import { ChatSale } from '@bazari/shared-types';
import { getPublicJSON } from '../../lib/api';
import { toast } from 'sonner';

export function SaleDetailsPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<ChatSale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (saleId) {
      loadSale();
    }
  }, [saleId]);

  const loadSale = async () => {
    try {
      setLoading(true);
      const data = await getPublicJSON<{ sale: ChatSale }>(`/chat/sales/${saleId}`);
      setSale(data.sale);
    } catch (error) {
      console.error('Failed to load sale:', error);
      toast.error('Erro ao carregar venda');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Venda #${saleId?.slice(0, 8)}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const handleCopyTxHash = () => {
    if (sale?.txHash) {
      navigator.clipboard.writeText(sale.txHash);
      toast.success('Hash copiado!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Venda não encontrada</p>
        <Button onClick={() => navigate('/app/chat')}>
          Voltar para Chat
        </Button>
      </div>
    );
  }

  const amount = parseFloat(sale.amount);
  const sellerAmount = parseFloat(sale.sellerAmount);
  const commissionAmount = parseFloat(sale.commissionAmount);
  const bazariFee = parseFloat(sale.bazariFee);

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detalhes da Venda</h1>
            <p className="text-sm text-muted-foreground">ID: #{sale.id.slice(0, 8)}</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={handleShare}>
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
            sale.status === 'split'
              ? 'bg-green-100 text-green-800'
              : sale.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {sale.status === 'split' ? 'Pago' : sale.status === 'pending' ? 'Pendente' : 'Falhou'}
          </span>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span>{new Date(sale.createdAt).toLocaleString('pt-BR')}</span>
            </div>
            {sale.settledAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Finalizado em:</span>
                <span>{new Date(sale.settledAt).toLocaleString('pt-BR')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Split Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição do Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <SplitVisualization
            total={amount}
            sellerAmount={sellerAmount}
            commissionAmount={commissionAmount}
            bazariFee={bazariFee}
          />
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes da Transação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sale.txHash && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Hash da Transação:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{sale.txHash.slice(0, 10)}...</span>
                <Button variant="ghost" size="sm" onClick={handleCopyTxHash} className="h-6 w-6 p-0">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {sale.receiptNftCid && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Recibo NFT:</span>
              <Button variant="link" size="sm" asChild className="h-auto p-0">
                <Link to={`/app/receipts/${sale.receiptNftCid}`}>
                  Ver Recibo <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}
          {sale.proposalId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID da Proposta:</span>
              <span className="font-mono text-xs">#{sale.proposalId.slice(0, 8)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {sale.receiptNftCid && (
          <Button className="flex-1" asChild>
            <Link to={`/app/receipts/${sale.receiptNftCid}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Recibo NFT
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
