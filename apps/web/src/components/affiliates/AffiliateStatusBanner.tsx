import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Affiliation {
  id: string;
  storeId: string;
  status: string;
  customCommission?: number;
}

interface AffiliateStatusBannerProps {
  storeId: number;
  mode: string;
  onRequestSuccess?: () => void;
}

export function AffiliateStatusBanner({
  storeId,
  mode,
  onRequestSuccess,
}: AffiliateStatusBannerProps) {
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null);

  useEffect(() => {
    loadAffiliationStatus();
  }, [storeId]);

  const loadAffiliationStatus = async () => {
    try {
      setLoading(true);

      const response = await apiHelpers.get<{ affiliations: Affiliation[] }>(
        '/api/chat/affiliates/me'
      );

      // Find affiliation for this store
      const found = response.affiliations?.find(
        (aff) => aff.storeId === storeId.toString()
      );

      setAffiliation(found || null);
    } catch (error) {
      console.error('Failed to load affiliation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAffiliation = async () => {
    try {
      setRequesting(true);

      await apiHelpers.post('/api/chat/affiliates/request', {
        storeId,
        message: 'Gostaria de me tornar afiliado desta loja.',
      });

      toast.success('Solicitação enviada com sucesso!');
      await loadAffiliationStatus();
      onRequestSuccess?.();
    } catch (error: any) {
      console.error('Failed to request affiliation:', error);

      const errorMessage = error?.response?.data?.error || 'Erro ao solicitar afiliação';

      if (errorMessage.includes('already pending')) {
        toast.error('Você já possui uma solicitação pendente');
      } else if (errorMessage.includes('Already affiliated')) {
        toast.error('Você já é afiliado desta loja');
      } else if (errorMessage.includes('own store')) {
        toast.error('Você não pode se afiliar à sua própria loja');
      } else if (errorMessage.includes('30 days')) {
        toast.error('Aguarde 30 dias após rejeição para solicitar novamente');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setRequesting(false);
    }
  };

  // Only show banner if mode is 'affiliates'
  if (mode !== 'affiliates') {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          Verificando status de afiliação...
        </AlertDescription>
      </Alert>
    );
  }

  // Case 1: Not affiliated - Show error with request button
  if (!affiliation) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Afiliação Necessária</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Esta loja aceita apenas afiliados aprovados. Solicite sua afiliação para promover produtos.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRequestAffiliation}
            disabled={requesting}
            className="mt-2 bg-white hover:bg-gray-100 text-red-600 border-red-300"
          >
            {requesting ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Solicitar Afiliação'
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Case 2: Pending - Show warning
  if (affiliation.status === 'pending') {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          Aguardando Aprovação
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          Sua solicitação de afiliação está pendente. Você poderá promover produtos após a aprovação do dono da loja.
        </AlertDescription>
      </Alert>
    );
  }

  // Case 3: Approved - Show success
  if (affiliation.status === 'approved') {
    const commission = affiliation.customCommission ?? 5;
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Afiliado Aprovado
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Você está autorizado a promover produtos desta loja. Comissão: <strong>{commission}%</strong>
        </AlertDescription>
      </Alert>
    );
  }

  // Case 4: Rejected - Show error with retry after 30 days
  if (affiliation.status === 'rejected') {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Solicitação Rejeitada</AlertTitle>
        <AlertDescription>
          Sua solicitação de afiliação foi rejeitada. Você pode solicitar novamente após 30 dias da rejeição.
        </AlertDescription>
      </Alert>
    );
  }

  // Case 5: Suspended - Show error
  if (affiliation.status === 'suspended') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Afiliação Suspensa</AlertTitle>
        <AlertDescription>
          Sua afiliação foi suspensa. Entre em contato com o dono da loja para mais informações.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
