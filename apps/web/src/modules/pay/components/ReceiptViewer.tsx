// path: apps/web/src/modules/pay/components/ReceiptViewer.tsx
// Bazari Pay - Receipt Viewer Component (PROMPT-05)

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ExternalLink, Printer } from 'lucide-react';
import { apiHelpers } from '@/lib/api';

interface ReceiptData {
  execution: {
    id: string;
    periodRef: string;
    finalValue: string;
    executedAt: string;
    txHash: string | null;
    blockNumber: number | null;
  };
  contract: {
    id: string;
    onChainId: string | null;
    payer: {
      handle: string | null;
      displayName: string | null;
    };
    receiver: {
      handle: string | null;
      displayName: string | null;
    };
  };
  adjustments: Array<{
    type: string;
    value: string;
    reason: string | null;
  }>;
  verifyUrl: string;
}

interface ReceiptViewerProps {
  executionId: string;
  onClose?: () => void;
}

export function ReceiptViewer({ executionId, onClose }: ReceiptViewerProps) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        const data = await apiHelpers.get<ReceiptData>(`/api/pay/receipts/${executionId}`);
        setReceipt(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [executionId]);

  const handlePrint = () => {
    window.open(`/api/pay/receipts/${executionId}/html`, '_blank');
  };

  const handleDownload = async () => {
    try {
      const html = await apiHelpers.get<string>(`/api/pay/receipts/${executionId}/html`);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante-${executionId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar comprovante:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error}</p>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="mt-4">
              Fechar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!receipt) {
    return null;
  }

  const formatValue = (value: string) => {
    const num = parseFloat(value) / 1e12;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Comprovante de Pagamento</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Pagador</p>
            <p className="font-medium">
              {receipt.contract.payer.displayName || receipt.contract.payer.handle || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Recebedor</p>
            <p className="font-medium">
              {receipt.contract.receiver.displayName || receipt.contract.receiver.handle || 'N/A'}
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Referência</p>
              <p className="font-medium">{receipt.execution.periodRef}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor</p>
              <p className="font-medium text-lg">{formatValue(receipt.execution.finalValue)} BZR</p>
            </div>
          </div>
        </div>

        {receipt.adjustments.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Ajustes aplicados</p>
            <ul className="space-y-1">
              {receipt.adjustments.map((adj, i) => (
                <li key={i} className="text-sm flex justify-between">
                  <span>
                    {adj.type === 'ADDITION' ? '+' : adj.type === 'DEDUCTION' ? '-' : ''}
                    {adj.reason || adj.type}
                  </span>
                  <span className={adj.type === 'ADDITION' ? 'text-green-600' : adj.type === 'DEDUCTION' ? 'text-red-600' : ''}>
                    {formatValue(adj.value)} BZR
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t pt-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Data/Hora</p>
              <p>{formatDate(receipt.execution.executedAt)}</p>
            </div>
            {receipt.execution.blockNumber && (
              <div>
                <p className="text-muted-foreground">Bloco</p>
                <p>#{receipt.execution.blockNumber}</p>
              </div>
            )}
          </div>
          {receipt.execution.txHash && (
            <div className="mt-2">
              <p className="text-muted-foreground">Hash da Transação</p>
              <p className="font-mono text-xs break-all">{receipt.execution.txHash}</p>
            </div>
          )}
        </div>

        {receipt.contract.onChainId && (
          <div className="border-t pt-4">
            <a
              href={receipt.verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              Verificar na blockchain
            </a>
          </div>
        )}

        {onClose && (
          <div className="border-t pt-4">
            <Button variant="outline" onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
