// V-1 (2025-09-18): Bloco principal de informações da PDP de produto

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import PriceBzr from '../PriceBzr';
import { useCartSellerConflict } from '@/modules/cart/cart.store';
import { SellerConflictModal } from '@/modules/cart/components/SellerConflictModal';
import type { ProductDetail } from '../../hooks/useProductDetail';

interface ProductInfoProps {
  product: ProductDetail;
}

function withFallbackUrl(media: Array<{ id: string; url: string }>) {
  return media.filter(item => item && item.url);
}

export function ProductInfo({ product }: ProductInfoProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    currentSeller: string;
    newSeller: string;
    newItem: any;
  }>({
    isOpen: false,
    currentSeller: '',
    newSeller: '',
    newItem: null,
  });

  const { addItemWithConflictCheck, confirmAndReplaceCart } = useCartSellerConflict();

  const ratingValue = typeof product.ratingValue === 'number' ? product.ratingValue : null;
  const ratingCount = typeof product.ratingCount === 'number' ? product.ratingCount : null;
  const hasRating = ratingValue !== null && ratingCount !== null && ratingCount > 0;

  const normalizePrice = (v?: string | null) => {
    if (!v) return '0';
    return String(v).replace(',', '.');
  };

  const createCartItem = () => ({
    listingId: product.id,
    qty: 1,
    priceBzrSnapshot: normalizePrice(product.priceBzr),
    titleSnapshot: product.title,
    sellerId: product.daoId || 'unknown',
    kind: 'product' as const,
  });

  const handleBuy = async () => {
    const item = createCartItem();
    const result = await addItemWithConflictCheck(item);

    if (result.needsConfirmation) {
      setConflictModal({
        isOpen: true,
        currentSeller: result.currentSeller || '',
        newSeller: result.newSeller,
        newItem: result.newItem,
      });
    } else {
      // Ir direto para checkout
      navigate('/app/checkout');
    }
  };

  const handleAddToCart = async () => {
    const item = createCartItem();
    const result = await addItemWithConflictCheck(item);

    if (result.needsConfirmation) {
      setConflictModal({
        isOpen: true,
        currentSeller: result.currentSeller || '',
        newSeller: result.newSeller,
        newItem: result.newItem,
      });
    } else {
      // Mostrar toast de sucesso
      toast.success(t('cart.itemAdded'), {
        action: {
          label: t('cart.viewCart'),
          onClick: () => navigate('/app/cart'),
        },
      });
    }
  };

  const handleChat = () => {
    console.log('chat', { id: product.id });
  };

  const toggleFavorite = () => {
    setIsFavorite((prev) => !prev);
  };

  const handleConflictConfirm = async () => {
    if (conflictModal.newItem) {
      await confirmAndReplaceCart(conflictModal.newItem);
      setConflictModal({ isOpen: false, currentSeller: '', newSeller: '', newItem: null });

      toast.success(t('cart.cartReplaced'), {
        action: {
          label: t('cart.viewCart'),
          onClick: () => navigate('/app/cart'),
        },
      });
    }
  };

  const handleConflictCancel = () => {
    setConflictModal({ isOpen: false, currentSeller: '', newSeller: '', newItem: null });
  };

  const ratingLabel = hasRating
    ? t('pdp.rating', {
        stars: ratingValue!.toFixed(1),
        count: ratingCount!,
      })
    : null;

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="space-y-2">
        <h1 id="product-title" className="text-3xl font-bold tracking-tight">
          {product.title}
        </h1>
        {hasRating ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-label={ratingLabel ?? undefined}>
            <span className="text-primary">★</span>
            <span>{ratingLabel}</span>
          </p>
        ) : null}
        {product.priceBzr ? <PriceBzr value={product.priceBzr} /> : null}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Ações principais">
        <Button onClick={handleBuy}>{t('pdp.buy')}</Button>
        <Button variant="outline" onClick={handleAddToCart}>
          {t('pdp.addToCart')}
        </Button>
        <Button variant="secondary" onClick={handleChat}>
          {t('pdp.chat')}
        </Button>
        <Button
          variant={isFavorite ? 'default' : 'ghost'}
          onClick={toggleFavorite}
          aria-pressed={isFavorite}
        >
          <span aria-hidden>{isFavorite ? '♥' : '♡'}</span>
          <span className="ml-2">{t('pdp.favorite')}</span>
        </Button>
      </div>

      {product.daoId ? (
        <p className="text-sm text-muted-foreground">
          {product.daoId}
        </p>
      ) : null}

      {withFallbackUrl(product.media).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('pdp.noImage')}</p>
      ) : null}

      <SellerConflictModal
        isOpen={conflictModal.isOpen}
        onClose={handleConflictCancel}
        onConfirm={handleConflictConfirm}
        currentSeller={conflictModal.currentSeller}
        newSeller={conflictModal.newSeller}
        newItem={conflictModal.newItem}
      />
    </div>
  );
}

export default ProductInfo;
