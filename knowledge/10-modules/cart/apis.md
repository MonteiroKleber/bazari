# Cart Module - API Reference

## Overview
The Cart module is **100% client-side** and does not expose REST API endpoints. All operations are performed via Zustand store hooks in the React frontend.

---

## Frontend API (React Hooks)

### 1. `useCart()` - Main Cart Store

```typescript
import { useCart } from '@/modules/cart/cart.store';

function MyComponent() {
  const {
    items,           // CartItem[]
    subtotalBzr,     // string (planck)
    count,           // number (total qty)
    currentSellerId, // string | null
    addItem,         // (item) => Promise<boolean>
    removeItem,      // (listingId) => void
    updateQty,       // (listingId, qty) => void
    clear,           // () => void
  } = useCart();

  // Add item
  const success = await addItem({
    listingId: 'abc-123',
    qty: 2,
    priceBzrSnapshot: '5000000000000',
    titleSnapshot: 'Handmade Mug',
    sellerId: 'seller_1',
    kind: 'product',
  });

  if (!success) {
    // Show SellerConflictModal
  }

  // Remove item
  removeItem('abc-123');

  // Update quantity
  updateQty('abc-123', 3);

  // Clear cart
  clear();
}
```

---

### 2. `useCartSellerConflict()` - Conflict Handling

```typescript
import { useCartSellerConflict } from '@/modules/cart/cart.store';

function ProductPage({ product }) {
  const { addItemWithConflictCheck, confirmAndReplaceCart } = useCartSellerConflict();
  const [conflictData, setConflictData] = useState(null);

  const handleAddToCart = async () => {
    const result = await addItemWithConflictCheck({
      listingId: product.id,
      qty: 1,
      priceBzrSnapshot: product.priceBzr,
      titleSnapshot: product.title,
      sellerId: product.sellerId,
      kind: 'product',
    });

    if (result.needsConfirmation) {
      setConflictData(result);
      // Show modal
    } else {
      // Success toast
    }
  };

  const handleConfirmReplace = () => {
    confirmAndReplaceCart(conflictData.newItem);
    setConflictData(null);
    // Success toast
  };

  return (
    <>
      <Button onClick={handleAddToCart}>Add to Cart</Button>
      {conflictData && (
        <SellerConflictModal
          currentSeller={conflictData.currentSeller}
          newSeller={conflictData.newSeller}
          onConfirm={handleConfirmReplace}
          onCancel={() => setConflictData(null)}
        />
      )}
    </>
  );
}
```

---

## Data Structures

### CartItem Interface
```typescript
interface CartItem {
  listingId: string;        // UUID do produto/serviço
  qty: number;              // Quantidade (>= 1)
  priceBzrSnapshot: string; // Preço em planck (snapshot)
  titleSnapshot: string;    // Título (snapshot)
  sellerId: string;         // DAO ID do vendedor
  kind: 'product' | 'service';
  addedAt: number;          // Unix timestamp
}
```

### CartState Interface
```typescript
interface CartState {
  items: CartItem[];
  subtotalBzr: string;         // Computed
  count: number;               // Computed
  currentSellerId: string | null; // Computed

  // Actions
  addItem: (item: Omit<CartItem, 'addedAt'>) => Promise<boolean>;
  removeItem: (listingId: string) => void;
  updateQty: (listingId: string, qty: number) => void;
  clear: () => void;
}
```

---

## Storage Structure

### localStorage Key Pattern
```
bazari_cart_{address}
```

**Examples:**
- `bazari_cart_5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`
- `bazari_cart_anonymous` (for logged-out users)

### localStorage Value (JSON)
```json
{
  "state": {
    "items": [
      {
        "listingId": "abc-123",
        "qty": 2,
        "priceBzrSnapshot": "5000000000000",
        "titleSnapshot": "Handmade Mug",
        "sellerId": "seller_1",
        "kind": "product",
        "addedAt": 1705320000000
      }
    ]
  },
  "version": 1
}
```

---

## Computed Values

### `subtotalBzr` Calculation
```typescript
function calculateSubtotal(items: CartItem[]): string {
  const total = items.reduce((sum, item) => {
    const price = parseDecimal(item.priceBzrSnapshot);
    return sum + price * item.qty;
  }, 0);
  return total.toString();
}
```

### `count` Calculation
```typescript
const count = items.reduce((sum, item) => sum + item.qty, 0);
```

### `currentSellerId` Calculation
```typescript
const currentSellerId = items.length > 0 ? items[0].sellerId : null;
```

---

## Single Seller Rule (MVP)

### Validation Logic
```typescript
const addItem = async (newItem) => {
  const currentSellerId = items.length > 0 ? items[0].sellerId : null;

  // Check if different seller
  if (currentSellerId && currentSellerId !== newItem.sellerId) {
    return false; // Requires confirmation
  }

  // Add item...
  return true;
};
```

### Conflict Resolution Flow
```
addItem(newItem) → sellerId mismatch → return false
                                          ↓
                              Show SellerConflictModal
                                          ↓
                        User confirms → clear() + addItem()
                                          ↓
                              Cart replaced with new seller
```

---

## Routes

### Frontend Routes
- **`/app/cart`** - CartPage (view cart, update qtys, proceed to checkout)
- **`/app/checkout`** - CheckoutPage (reads cart items, creates Order)

---

## Integration Points

### From Product/Service Pages
```typescript
// On "Add to Cart" button click
const handleAddToCart = async () => {
  const item: Omit<CartItem, 'addedAt'> = {
    listingId: product.id,
    qty: 1,
    priceBzrSnapshot: product.priceBzr,
    titleSnapshot: product.title,
    sellerId: product.sellerId,
    kind: 'product',
  };

  const success = await cart.addItem(item);
  if (success) {
    toast.success('Added to cart');
  }
};
```

### From Cart to Checkout
```typescript
// On "Proceed to Checkout" button click
navigate('/app/checkout');

// In CheckoutPage
const { items, subtotalBzr } = useCart();

const handleCreateOrder = async () => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: items.map(i => ({
        listingId: i.listingId,
        qty: i.qty,
        kind: i.kind,
      })),
      // ... other order data
    }),
  });

  if (response.ok) {
    cart.clear(); // Clear cart after successful order
  }
};
```

---

## No Backend Routes

**Important:** The Cart module does NOT have backend API routes. All operations are client-side only.

**Backend integration happens at Checkout:**
- Cart items are sent to `POST /api/orders` to create an Order
- Order module handles backend persistence

**Status:** ✅ Implemented (Client-Side Only)
