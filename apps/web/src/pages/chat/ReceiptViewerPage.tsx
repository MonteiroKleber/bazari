import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { getPublicJSON } from '../../lib/api';
import { toast } from 'sonner';

interface Receipt {
  version: string;
  saleId: string;
  buyer: string;
  seller: string;
  promoter?: string;
  amount: string;
  breakdown: {
    sellerAmount: string;
    commissionAmount: string;
    bazariFee: string;
  };
  txHash: string;
  timestamp: number;
  signature: string;
}

export function ReceiptViewerPage() {
  const { cid } = useParams<{ cid: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cid) {
      loadReceipt();
    }
  }, [cid]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      // Buscar recibo do IPFS via gateway
      const data = await getPublicJSON<Receipt>(`/ipfs/${cid}`);
      setReceipt(data);
    } catch (error) {
      console.error('Failed to load receipt:', error);
      toast.error('Erro ao carregar recibo');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!receipt) return;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${cid?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Recibo baixado!');
  };

  const handleVerifyIpfs = () => {
    window.open(`https://ipfs.io/ipfs/${cid}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando recibo...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Recibo não encontrado</p>
        <Button onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Recibo NFT</h1>
            <p className="text-sm text-muted-foreground font-mono">CID: {cid?.slice(0, 16)}...</p>
          </div>
        </div>
      </div>

      {/* Comprador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comprador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm">{receipt.buyer}</p>
        </CardContent>
      </Card>

      {/* Vendedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm">{receipt.seller}</p>
        </CardContent>
      </Card>

      {/* Promotor */}
      {receipt.promoter && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Promotor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">{receipt.promoter}</p>
          </CardContent>
        </Card>
      )}

      {/* Valores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Breakdown de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor Total:</span>
            <span className="font-bold">R$ {parseFloat(receipt.amount).toFixed(2)} BZR</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Vendedor:</span>
            <span>R$ {parseFloat(receipt.breakdown.sellerAmount).toFixed(2)}</span>
          </div>
          {parseFloat(receipt.breakdown.commissionAmount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Comissão:</span>
              <span>R$ {parseFloat(receipt.breakdown.commissionAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa Bazari:</span>
            <span>R$ {parseFloat(receipt.breakdown.bazariFee).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Transação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID da Venda:</span>
            <span className="font-mono">#{receipt.saleId.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hash:</span>
            <span className="font-mono text-xs">{receipt.txHash.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data:</span>
            <span>{new Date(receipt.timestamp).toLocaleString('pt-BR')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assinatura Digital</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs break-all text-muted-foreground">
            {receipt.signature}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleDownloadJson} className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Baixar JSON
        </Button>
        <Button variant="outline" onClick={handleVerifyIpfs} className="flex-1">
          <ExternalLink className="mr-2 h-4 w-4" />
          Verificar no IPFS
        </Button>
      </div>
    </div>
  );
}
