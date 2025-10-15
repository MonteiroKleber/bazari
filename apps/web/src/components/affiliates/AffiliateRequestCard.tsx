import { useState } from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { ApproveAffiliateDialog } from './ApproveAffiliateDialog';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';
import { CheckCircle, XCircle, Clock, Award } from 'lucide-react';

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

interface AffiliateRequestCardProps {
  affiliate: Affiliate;
  storeId: number;
  onUpdate: () => void;
}

export function AffiliateRequestCard({ affiliate, storeId, onUpdate }: AffiliateRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const handleReject = async () => {
    if (!confirm(`Rejeitar solicitação de @${affiliate.promoterHandle}?`)) {
      return;
    }

    try {
      setLoading(true);

      await apiHelpers.post(`/api/chat/affiliates/store/${storeId}/reject`, {
        affiliateId: affiliate.id,
        reason: 'Rejeitado pelo dono da loja',
      });

      toast.success('Solicitação rejeitada');
      onUpdate();
    } catch (error) {
      console.error('Failed to reject affiliate:', error);
      toast.error('Erro ao rejeitar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm(`Suspender afiliado @${affiliate.promoterHandle}?`)) {
      return;
    }

    try {
      setLoading(true);

      await apiHelpers.post(`/api/chat/affiliates/store/${storeId}/suspend`, {
        affiliateId: affiliate.id,
        reason: 'Suspenso pelo dono da loja',
      });

      toast.success('Afiliado suspenso');
      onUpdate();
    } catch (error) {
      console.error('Failed to suspend affiliate:', error);
      toast.error('Erro ao suspender afiliado');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (affiliate.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Aprovado
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={affiliate.promoterAvatar} />
                <AvatarFallback>
                  {affiliate.promoterDisplayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{affiliate.promoterDisplayName}</h3>
                  {getStatusBadge()}
                </div>
                <p className="text-sm text-muted-foreground">@{affiliate.promoterHandle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{affiliate.promoterReputation}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Stats */}
            {affiliate.status === 'approved' && affiliate.salesCount > 0 && (
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="font-semibold">{affiliate.salesCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">{parseFloat(affiliate.totalSales).toFixed(2)} BZR</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Comissão</p>
                  <p className="font-semibold">{parseFloat(affiliate.totalCommission).toFixed(2)} BZR</p>
                </div>
              </div>
            )}

            {/* Commission and Cap */}
            {affiliate.status === 'approved' && (
              <div className="flex gap-4 text-sm">
                {affiliate.customCommission !== null && (
                  <div>
                    <span className="text-muted-foreground">Comissão: </span>
                    <span className="font-medium">{affiliate.customCommission}%</span>
                  </div>
                )}
                {affiliate.monthlySalesCap && (
                  <div>
                    <span className="text-muted-foreground">Limite: </span>
                    <span className="font-medium">{parseFloat(affiliate.monthlySalesCap).toFixed(2)} BZR/mês</span>
                  </div>
                )}
              </div>
            )}

            {/* Request Date */}
            <div className="text-xs text-muted-foreground">
              Solicitado em {formatDate(affiliate.requestedAt)}
            </div>

            {/* Notes */}
            {affiliate.notes && (
              <div className="text-sm p-2 bg-muted rounded">
                <p className="text-xs text-muted-foreground mb-1">Notas:</p>
                <p>{affiliate.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {affiliate.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowApproveDialog(true)}
                    disabled={loading}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReject}
                    disabled={loading}
                  >
                    Rejeitar
                  </Button>
                </>
              )}

              {affiliate.status === 'approved' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSuspend}
                  disabled={loading}
                >
                  Suspender
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ApproveAffiliateDialog
        open={showApproveDialog}
        onClose={() => setShowApproveDialog(false)}
        onSuccess={onUpdate}
        storeId={storeId}
        affiliateId={affiliate.id}
        promoterHandle={affiliate.promoterHandle}
      />
    </>
  );
}
