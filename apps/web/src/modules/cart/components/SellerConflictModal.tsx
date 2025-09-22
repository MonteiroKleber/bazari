// path: apps/web/src/modules/cart/components/SellerConflictModal.tsx

import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CartItem } from '../cart.store';

interface SellerConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentSeller: string;
  newSeller: string;
  newItem: Omit<CartItem, 'addedAt'>;
}

export function SellerConflictModal({
  isOpen,
  onClose,
  onConfirm,
  currentSeller,
  newSeller,
  newItem,
}: SellerConflictModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle>{t('cart.sellerConflict.title')}</CardTitle>
          <CardDescription>
            {t('cart.sellerConflict.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">{t('cart.sellerConflict.currentCart')}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentSeller}</Badge>
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm font-medium mb-1">{t('cart.sellerConflict.newItem')}</p>
              <p className="text-sm text-muted-foreground mb-2">{newItem.titleSnapshot}</p>
              <div className="flex items-center gap-2">
                <Badge variant="default">{newSeller}</Badge>
                <Badge variant="secondary">{t(`cart.kind.${newItem.kind}`)}</Badge>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            {t('cart.sellerConflict.warning')}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('cart.sellerConflict.cancel')}
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
            >
              {t('cart.sellerConflict.confirm')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}