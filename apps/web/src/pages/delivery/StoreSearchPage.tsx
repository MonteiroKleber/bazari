import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { deliveryApi } from '@/lib/api/delivery';
import { getJSON } from '@/lib/api';
import {
  ArrowLeft,
  Search,
  Store,
  MapPin,
  Star,
  Package,
  Loader2,
} from 'lucide-react';

interface StoreResult {
  id: string;
  shopName: string;
  shopSlug: string;
  onChainStoreId?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  country?: string;
  reputationScore?: number;
  totalProducts?: number;
}

export function StoreSearchPage() {
  const navigate = useNavigate();

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stores, setStores] = useState<StoreResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Request dialog
  const [selectedStore, setSelectedStore] = useState<StoreResult | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Digite algo para buscar');
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);

      const response = await getJSON<{ results: { stores: StoreResult[] } }>(
        `/api/search/global?q=${encodeURIComponent(searchQuery)}&type=stores&limit=20`
      );

      setStores(response.results?.stores || []);

      if (!response.results?.stores || response.results.stores.length === 0) {
        toast.info('Nenhuma loja encontrada');
      }
    } catch (error: any) {
      toast.error(`Erro na busca: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestPartnership = async () => {
    if (!selectedStore) return;

    if (!selectedStore.onChainStoreId) {
      toast.error('Esta loja não possui ID on-chain');
      return;
    }

    try {
      setIsRequesting(true);
      await deliveryApi.requestStorePartnership(
        selectedStore.onChainStoreId,
        requestMessage.trim() || undefined
      );

      toast.success(`Solicitação enviada para ${selectedStore.shopName}`);
      setSelectedStore(null);
      setRequestMessage('');

      // Remove store from results
      setStores((prev) => prev.filter((s) => s.id !== selectedStore.id));
    } catch (error: any) {
      const errorMsg = error.message || 'Erro desconhecido';

      if (errorMsg.includes('Parceria já existe')) {
        toast.info('Você já possui uma solicitação pendente ou parceria com esta loja');
        setSelectedStore(null);
        // Remove from results
        setStores((prev) => prev.filter((s) => s.id !== selectedStore.id));
      } else if (errorMsg.includes('Perfil de entregador não encontrado')) {
        toast.error('Você precisa criar um perfil de entregador primeiro');
        setTimeout(() => navigate('/app/delivery/profile/setup'), 2000);
      } else {
        toast.error(`Erro ao solicitar parceria: ${errorMsg}`);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const renderHeader = () => (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/delivery/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Buscar Lojas</h1>
        <p className="text-muted-foreground">
          Encontre lojas e solicite parceria para fazer entregas
        </p>
      </div>
    </div>
  );

  const renderSearchBox = () => (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Buscar lojas
            </Label>
            <Input
              id="search"
              placeholder="Digite o nome da loja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Buscar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStoresList = () => {
    if (isSearching) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!hasSearched) {
      return (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Encontre lojas para fazer parceria
            </h3>
            <p className="text-muted-foreground">
              Use a busca acima para encontrar lojas e enviar solicitações de parceria
            </p>
          </CardContent>
        </Card>
      );
    }

    if (stores.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma loja encontrada</h3>
            <p className="text-muted-foreground">
              Tente buscar por outro nome ou termo
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {stores.map((store) => (
          <Card key={store.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{store.shopName}</CardTitle>
                    <p className="text-sm text-muted-foreground">@{store.shopSlug}</p>
                  </div>
                </div>
                <Button onClick={() => setSelectedStore(store)} size="sm">
                  Solicitar Parceria
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {store.bio && (
                <p className="text-sm text-muted-foreground mb-3">{store.bio}</p>
              )}

              <div className="flex flex-wrap gap-2 text-sm">
                {store.city && store.country && (
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 mr-1" />
                    {store.city}, {store.country}
                  </Badge>
                )}
                {store.reputationScore !== undefined && (
                  <Badge variant="outline">
                    <Star className="h-3 w-3 mr-1" />
                    {store.reputationScore} pontos
                  </Badge>
                )}
                {store.totalProducts !== undefined && (
                  <Badge variant="outline">
                    <Package className="h-3 w-3 mr-1" />
                    {store.totalProducts} produtos
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderRequestDialog = () => (
    <Dialog
      open={selectedStore !== null}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedStore(null);
          setRequestMessage('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Parceria</DialogTitle>
          <DialogDescription>
            Envie uma solicitação de parceria para{' '}
            <strong>{selectedStore?.shopName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Apresente-se e explique por que gostaria de fazer entregas para esta loja..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {requestMessage.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedStore(null);
              setRequestMessage('');
            }}
            disabled={isRequesting}
          >
            Cancelar
          </Button>
          <Button onClick={handleRequestPartnership} disabled={isRequesting}>
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Solicitação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {renderHeader()}
      {renderSearchBox()}
      {renderStoresList()}
      {renderRequestDialog()}
    </div>
  );
}
