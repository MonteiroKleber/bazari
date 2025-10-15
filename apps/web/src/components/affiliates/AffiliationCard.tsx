import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';
import {
  CheckCircle,
  XCircle,
  Clock,
  Store,
  TrendingUp,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';

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

interface AffiliationCardProps {
  affiliation: Affiliation;
  onUpdate: () => void;
}

export function AffiliationCard({ affiliation, onUpdate }: AffiliationCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    const message =
      affiliation.status === 'approved'
        ? `Você tem certeza que deseja sair da afiliação com ${affiliation.storeName}? Suas estatísticas serão mantidas.`
        : `Cancelar solicitação para ${affiliation.storeName}?`;

    if (!confirm(message)) {
      return;
    }

    try {
      setLoading(true);

      await apiHelpers.delete(`/api/chat/affiliates/${affiliation.id}`);

      toast.success(
        affiliation.status === 'approved'
          ? 'Afiliação encerrada com sucesso'
          : 'Solicitação cancelada'
      );
      onUpdate();
    } catch (error) {
      console.error('Failed to leave affiliation:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (affiliation.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Aguardando Aprovação
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Ativo
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejeitado
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Suspenso
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(parseInt(timestamp)).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const commissionPercent = affiliation.customCommission ?? 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={affiliation.storeAvatar} />
              <AvatarFallback>
                <Store className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{affiliation.storeName}</h3>
                {getStatusBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                Comissão: {commissionPercent}%
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Performance Stats - Only for approved */}
          {affiliation.status === 'approved' && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-xs">Vendas</span>
                </div>
                <p className="text-2xl font-bold">{affiliation.salesCount}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Total</span>
                </div>
                <p className="text-2xl font-bold">
                  {parseFloat(affiliation.totalSales).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">BZR</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Comissão</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {parseFloat(affiliation.totalCommission).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">BZR</p>
              </div>
            </div>
          )}

          {/* Monthly Cap Info */}
          {affiliation.status === 'approved' && affiliation.monthlySalesCap && (
            <div className="text-sm p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200">
                <strong>Limite mensal:</strong>{' '}
                {parseFloat(affiliation.monthlySalesCap).toFixed(2)} BZR/mês
              </p>
            </div>
          )}

          {/* Request Date */}
          <div className="text-xs text-muted-foreground">
            {affiliation.status === 'pending' && (
              <p>Solicitado em {formatDate(affiliation.requestedAt)}</p>
            )}
            {affiliation.approvedAt && (
              <p>Aprovado em {formatDate(affiliation.approvedAt)}</p>
            )}
            {affiliation.rejectedAt && (
              <p>Rejeitado em {formatDate(affiliation.rejectedAt)}</p>
            )}
            {affiliation.suspendedAt && (
              <p>Suspenso em {formatDate(affiliation.suspendedAt)}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/loja/${affiliation.storeSlug}`)}
            >
              Ver Loja
            </Button>

            {(affiliation.status === 'pending' || affiliation.status === 'approved') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLeave}
                disabled={loading}
              >
                {affiliation.status === 'pending' ? 'Cancelar' : 'Sair'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
