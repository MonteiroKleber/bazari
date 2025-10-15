import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useChat } from '../../hooks/useChat';
import { ProposalItem } from '@bazari/shared-types';
import { ProductSelectorGrid } from './ProductSelectorGrid';
import { ShippingCommissionForm } from './ShippingCommissionForm';
import { ProposalSummary } from './ProposalSummary';
import { apiHelpers } from '../../lib/api';

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
}

// Configuração de mensagens contextuais por filtro
const FILTER_MESSAGES = {
  mine: {
    banner: {
      title: "Vendendo produtos da sua loja",
      description: "Você receberá o valor total da venda",
      bgColor: "bg-green-50 dark:bg-green-950",
      textColor: "text-green-900 dark:text-green-100",
      descColor: "text-green-700 dark:text-green-300",
      icon: "🏪"
    },
    multiStore: {
      show: false
    },
    emptyHint: "Selecione produtos das suas lojas. Você receberá 100% do valor da venda."
  },
  affiliate: {
    banner: {
      title: "Modo Afiliado",
      description: "Você já é afiliado aprovado dessas lojas e ganhará comissão",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      textColor: "text-purple-900 dark:text-purple-100",
      descColor: "text-purple-700 dark:text-purple-300",
      icon: "🤝"
    },
    multiStore: {
      show: true,
      text: "Você pode adicionar produtos de até 5 lojas afiliadas"
    },
    emptyHint: "Selecione produtos das lojas que você é afiliado aprovado. Você ganhará comissão na venda."
  },
  followers: {
    banner: {
      title: "Lojas que você segue",
      description: "Você segue os donos dessas lojas e pode promover com comissão",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      textColor: "text-blue-900 dark:text-blue-100",
      descColor: "text-blue-700 dark:text-blue-300",
      icon: "👥"
    },
    multiStore: {
      show: true,
      text: "Você pode adicionar produtos de até 5 lojas que você segue"
    },
    emptyHint: "Selecione produtos de lojas cujos donos você segue. Você ganhará comissão na venda."
  },
  open: {
    banner: {
      title: "Modo Promotor - Lojas Abertas",
      description: "Promova produtos de lojas com acesso aberto e ganhe comissão",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      textColor: "text-orange-900 dark:text-orange-100",
      descColor: "text-orange-700 dark:text-orange-300",
      icon: "🔓"
    },
    multiStore: {
      show: true,
      text: "Você pode adicionar produtos de até 5 lojas abertas"
    },
    emptyHint: "Selecione produtos de lojas abertas. Você ganhará comissão na venda."
  }
} as const;

export function CreateProposalDialog({ open, onOpenChange, threadId }: CreateProposalDialogProps) {
  const { createProposal, currentProfileId } = useChat();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedItems, setSelectedItems] = useState<ProposalItem[]>([]);
  const [shipping, setShipping] = useState({ method: 'PAC', price: '0' });
  const [commission, setCommission] = useState(5);
  const [expiresIn, setExpiresIn] = useState('48h');
  const [submitting, setSubmitting] = useState(false);
  const [myStoreId, setMyStoreId] = useState<number | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [autoCommission, setAutoCommission] = useState<number | null>(null); // Comissão da política da loja
  const [currentFilter, setCurrentFilter] = useState<'mine' | 'affiliate' | 'followers' | 'open'>('open'); // Filtro atual

  // Carregar storeId do vendedor quando o dialog abrir (se tiver)
  useEffect(() => {
    async function loadMyStore() {
      if (!currentProfileId) {
        setLoadingStore(false);
        return;
      }

      try {
        setLoadingStore(true);

        // Buscar lojas do usuário usando o endpoint correto
        const response = await apiHelpers.get<{ items: Array<{ onChainStoreId?: number | string | bigint }> }>('/me/sellers');

        if (response?.items && response.items.length > 0) {
          const firstStore = response.items[0];
          // onChainStoreId pode vir como string, number ou bigint
          const storeId = firstStore.onChainStoreId
            ? (typeof firstStore.onChainStoreId === 'string'
                ? parseInt(firstStore.onChainStoreId)
                : typeof firstStore.onChainStoreId === 'bigint'
                ? Number(firstStore.onChainStoreId)
                : Number(firstStore.onChainStoreId))
            : null;

          if (storeId) {
            setMyStoreId(storeId);
          }
          // Se não tiver storeId, não é erro - usuário pode ser promotor
        }
        // Se não tiver loja, não é erro - usuário pode ser promotor de outras lojas
      } catch (error) {
        console.error('Failed to load store:', error);
        // Não mostra erro nem fecha o dialog - permite continuar como promotor
      } finally {
        setLoadingStore(false);
      }
    }

    if (open) {
      loadMyStore();
    }
  }, [open, currentProfileId]);

  // Buscar comissão da política da loja quando produtos são selecionados
  useEffect(() => {
    async function loadCommissionPolicy() {
      if (selectedItems.length === 0) {
        setAutoCommission(null);
        return;
      }

      // Dono da loja: comissão = 0
      if (myStoreId) {
        setAutoCommission(0);
        setCommission(0);
        return;
      }

      // Promotor: buscar da política da loja
      try {
        // Buscar o storeId do primeiro produto
        const firstProduct = await apiHelpers.get<any>(`/products/${selectedItems[0].sku}`);
        const productStoreId = firstProduct.onChainStoreId;

        if (productStoreId) {
          const policy = await apiHelpers.get<any>(`/api/chat/settings/store/${productStoreId}`);
          const policyCommission = policy.percent || 5;
          setAutoCommission(policyCommission);
          setCommission(policyCommission);
        }
      } catch (error) {
        console.error('Failed to load commission policy:', error);
        // Fallback: 5%
        setAutoCommission(5);
        setCommission(5);
      }
    }

    loadCommissionPolicy();
  }, [selectedItems, myStoreId]);

  const handleClose = () => {
    setStep(1);
    setSelectedItems([]);
    setShipping({ method: 'PAC', price: '0' });
    setCommission(5);
    setExpiresIn('48h');
    onOpenChange(false);
  };

  const handleNext = async () => {
    // Validações por step
    if (step === 1) {
      if (selectedItems.length === 0) {
        toast.error('Selecione pelo menos 1 produto');
        return;
      }

      // Validar afiliação se for promotor (não tem myStoreId)
      if (!myStoreId && selectedItems.length > 0) {
        try {
          // Get first product to determine store
          const firstItem = selectedItems[0];
          const productResponse = await apiHelpers.get<any>(`/products/${firstItem.sku}`);
          const product = productResponse;

          if (product?.onChainStoreId) {
            // Get store commission policy
            const storeResponse = await apiHelpers.get<any>(`/api/chat/settings/store/${product.onChainStoreId}`);
            const policy = storeResponse.policy;

            if (policy?.mode === 'affiliates') {
              // Check affiliation status
              const affiliationsResponse = await apiHelpers.get<any>('/api/chat/affiliates/me');
              const affiliations = affiliationsResponse.affiliations || [];

              const affiliation = affiliations.find(
                (aff: any) => aff.storeId === product.onChainStoreId.toString()
              );

              if (!affiliation || affiliation.status !== 'approved') {
                toast.error('Esta loja aceita apenas afiliados aprovados. Solicite afiliação na aba de produtos.');
                return;
              }
            }
          }
        } catch (error) {
          console.error('Failed to validate affiliation:', error);
          // Continue anyway - backend will validate
        }
      }
    }

    if (step === 2) {
      const shippingPrice = parseFloat(shipping.price);
      if (isNaN(shippingPrice) || shippingPrice < 0) {
        toast.error('Valor do frete inválido');
        return;
      }
      if (commission < 0 || commission > 15) {
        toast.error('Comissão deve estar entre 0% e 15%');
        return;
      }
    }

    setStep((step + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    setStep((step - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const subtotal = selectedItems.reduce((sum, item) =>
        sum + (parseFloat(item.price) * item.qty), 0
      );
      const shippingCost = parseFloat(shipping.price) || 0;
      const total = subtotal + shippingCost;

      await createProposal({
        threadId,
        items: selectedItems,
        shipping: shippingCost > 0 ? shipping : undefined,
        total: total.toString(),
        commissionPercent: commission,
      });

      toast.success('Proposta enviada!');
      handleClose();
    } catch (error) {
      console.error('Failed to create proposal:', error);
      toast.error('Erro ao criar proposta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Criar Proposta ({step}/3)
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Selecione os produtos"}
            {step === 2 && "Configure frete e comissão"}
            {step === 3 && "Revise e envie"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && (
            loadingStore ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Carregando produtos...</p>
              </div>
            ) : (
              <>
                {/* Banner contextual baseado no filtro selecionado */}
                <div className={`mb-3 p-3 rounded-lg ${FILTER_MESSAGES[currentFilter].banner.bgColor}`}>
                  <p className={`text-sm font-medium ${FILTER_MESSAGES[currentFilter].banner.textColor}`}>
                    {FILTER_MESSAGES[currentFilter].banner.icon} {FILTER_MESSAGES[currentFilter].banner.title}
                  </p>
                  <p className={`text-xs ${FILTER_MESSAGES[currentFilter].banner.descColor}`}>
                    {FILTER_MESSAGES[currentFilter].banner.description}
                  </p>
                </div>

                <ProductSelectorGrid
                  storeId={myStoreId || undefined}
                  selectedItems={selectedItems}
                  onItemsChange={setSelectedItems}
                  onFilterChange={setCurrentFilter}
                />
              </>
            )
          )}
          {step === 2 && (
            <ShippingCommissionForm
              shipping={shipping}
              onShippingChange={setShipping}
              commission={commission}
              onCommissionChange={setCommission}
              isVendor={!!myStoreId}
              readonlyCommission={autoCommission !== null}
            />
          )}
          {step === 3 && (
            <ProposalSummary
              items={selectedItems}
              shipping={shipping}
              commission={commission}
              expiresIn={expiresIn}
              onExpiresChange={setExpiresIn}
            />
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={submitting}>
              Voltar
            </Button>
          )}
          {step < 3 && (
            <Button onClick={handleNext}>
              Próximo
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar Proposta'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
