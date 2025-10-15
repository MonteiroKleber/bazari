import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Store, Package, ShoppingCart, Truck } from 'lucide-react';

interface CartItem {
  sku: string;
  name: string;
  qty: number;
  price: string;
  storeId?: number;
  storeName?: string;
}

interface StoreGroup {
  storeId: number;
  storeName: string;
  items: CartItem[];
  subtotal: number;
  shipping?: { method: string; price: number };
  total: number;
}

interface MultiStoreCartProps {
  items: CartItem[];
  storeGroups?: StoreGroup[];
  isMultiStore?: boolean;
}

const STORE_COLORS = [
  'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
  'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
  'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20',
  'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
  'border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20',
];

// Sub-component: Cart Item Row
function CartItemRow({ item }: { item: CartItem }) {
  const itemTotal = parseFloat(item.price) * item.qty;

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-2 flex-1">
        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-2 flex-1">
          <span className="text-muted-foreground font-medium">{item.qty}x</span>
          <span className="truncate">{item.name}</span>
        </div>
      </div>
      <span className="font-semibold ml-2 flex-shrink-0">
        R$ {itemTotal.toFixed(2)}
      </span>
    </div>
  );
}

// Sub-component: Cart Store Section
function CartStoreSection({
  group,
  colorClass,
  showStoreName = true
}: {
  group: StoreGroup;
  colorClass: string;
  showStoreName?: boolean;
}) {
  return (
    <Card className={`border-l-4 ${colorClass}`}>
      {showStoreName && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            {group.storeName}
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className={showStoreName ? 'space-y-1' : 'space-y-1 pt-4'}>
        {/* Items */}
        {group.items.map((item, idx) => (
          <CartItemRow key={`${item.sku}-${idx}`} item={item} />
        ))}

        {/* Shipping */}
        {group.shipping && (
          <>
            <Separator className="my-2" />
            <div className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Frete ({group.shipping.method})</span>
              </div>
              <span className="font-medium">
                R$ {group.shipping.price.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {/* Subtotal */}
        <Separator className="my-2" />
        <div className="flex items-center justify-between py-1 font-semibold">
          <span>Subtotal</span>
          <span className="text-base">R$ {group.total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component: Cart Summary
function CartSummary({
  grandTotal,
  storeCount,
  itemCount
}: {
  grandTotal: number;
  storeCount: number;
  itemCount: number;
}) {
  return (
    <div className="space-y-3">
      <Separator className="my-4" />

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold flex items-center gap-2">
              💰 Total Geral
            </p>
            <p className="text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'} •
              {storeCount > 1 && ` Dividido entre ${storeCount} lojas`}
              {storeCount === 1 && ` 1 loja`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">
              R$ {grandTotal.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {storeCount > 1 && (
        <div className="text-xs text-muted-foreground text-center py-2 flex items-center justify-center gap-1">
          <span>ℹ️</span>
          <span>Cada loja receberá seu pagamento separadamente</span>
        </div>
      )}
    </div>
  );
}

// Main Component: MultiStoreCart
export function MultiStoreCart({ items, storeGroups, isMultiStore = false }: MultiStoreCartProps) {
  // Calculate totals
  const itemCount = items.length;
  const grandTotal = storeGroups
    ? storeGroups.reduce((sum, group) => sum + group.total, 0)
    : items.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0);
  const storeCount = storeGroups ? storeGroups.length : 1;

  // Single store mode (no storeGroups)
  if (!storeGroups || storeGroups.length === 0) {
    const singleGroup: StoreGroup = {
      storeId: 0,
      storeName: 'Loja',
      items,
      subtotal: grandTotal,
      total: grandTotal,
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="h-5 w-5" />
          <span>Seu Carrinho</span>
        </div>

        <CartStoreSection
          group={singleGroup}
          colorClass={STORE_COLORS[0]}
          showStoreName={false}
        />

        <CartSummary
          grandTotal={grandTotal}
          storeCount={1}
          itemCount={itemCount}
        />
      </div>
    );
  }

  // Multi-store mode
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <ShoppingCart className="h-5 w-5" />
        <span>Seu Carrinho</span>
        {isMultiStore && (
          <span className="text-sm font-normal text-muted-foreground">
            ({storeCount} lojas)
          </span>
        )}
      </div>

      {/* Store Sections */}
      <div className="space-y-3">
        {storeGroups.map((group, index) => (
          <CartStoreSection
            key={group.storeId}
            group={group}
            colorClass={STORE_COLORS[index % STORE_COLORS.length]}
            showStoreName={true}
          />
        ))}
      </div>

      {/* Summary */}
      <CartSummary
        grandTotal={grandTotal}
        storeCount={storeCount}
        itemCount={itemCount}
      />
    </div>
  );
}
