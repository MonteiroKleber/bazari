import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';
import { Search, Store, Loader2 } from 'lucide-react';

interface StoreResult {
  id: string;
  shopName: string;
  shopSlug: string;
  avatarUrl?: string;
  onChainStoreId?: number | string;
}

interface StoreSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StoreSearchDialog({ open, onClose, onSuccess }: StoreSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stores, setStores] = useState<StoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadStores();
    } else {
      setSearchQuery('');
      setStores([]);
    }
  }, [open]);

  const loadStores = async () => {
    try {
      setLoading(true);

      // Get all seller profiles (public endpoint)
      const response = await apiHelpers.getPublic<{ items: StoreResult[] }>('/sellers');

      // Filter stores that have onChainStoreId (synced to blockchain)
      const syncedStores = (response.items || []).filter(
        (store) => store.onChainStoreId
      );

      setStores(syncedStores);
    } catch (error) {
      console.error('Failed to load stores:', error);
      toast.error('Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (store: StoreResult) => {
    if (!store.onChainStoreId) {
      toast.error('Esta loja ainda não foi sincronizada');
      return;
    }

    try {
      setRequesting(store.id);

      const storeId = typeof store.onChainStoreId === 'string'
        ? parseInt(store.onChainStoreId)
        : Number(store.onChainStoreId);

      await apiHelpers.post('/api/chat/affiliates/request', {
        storeId,
        message: `Olá! Gostaria de me tornar afiliado da ${store.shopName}.`,
      });

      toast.success(`Solicitação enviada para ${store.shopName}!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to request affiliation:', error);

      // Parse error message
      const errorMessage = error?.response?.data?.error || error?.message || 'Erro ao solicitar afiliação';

      if (errorMessage.includes('already pending')) {
        toast.error('Você já possui uma solicitação pendente para esta loja');
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
      setRequesting(null);
    }
  };

  const filteredStores = stores.filter((store) =>
    store.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.shopSlug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Solicitar Afiliação</DialogTitle>
          <DialogDescription>
            Busque lojas e solicite para se tornar afiliado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lojas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Store Grid */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? 'Nenhuma loja encontrada'
                  : 'Nenhuma loja disponível no momento'}
              </div>
            ) : (
              filteredStores.map((store) => (
                <Card key={store.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar>
                          <AvatarImage src={store.avatarUrl} />
                          <AvatarFallback>
                            <Store className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{store.shopName}</h4>
                          <p className="text-sm text-muted-foreground truncate">
                            @{store.shopSlug}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRequest(store)}
                        disabled={requesting === store.id}
                      >
                        {requesting === store.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Enviando...
                          </>
                        ) : (
                          'Solicitar'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
