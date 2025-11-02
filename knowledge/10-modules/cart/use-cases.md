# Cart Module - Use Cases

## UC-01: Add Item to Cart (Same Seller)
1. User is viewing a product/service page
2. User clicks "Add to Cart"
3. System checks `currentSellerId` in cart
4. `sellerId` matches (or cart is empty)
5. System checks if item already exists by `listingId`
6. If exists: increment qty, update snapshot
7. If new: add item with timestamp
8. Item added successfully ✅
9. Cart badge count updates

## UC-02: Add Item to Cart (Different Seller - Conflict)
1. User has items from Seller A in cart
2. User tries to add item from Seller B
3. System detects `sellerId` mismatch
4. `addItem()` returns `false` (needs confirmation)
5. System shows SellerConflictModal
6. User sees warning: "Cart has items from Seller A. Replace?"
7. User confirms
8. System clears cart
9. System adds new item from Seller B
10. Cart now has only Seller B items

## UC-03: Update Item Quantity
1. User is on CartPage
2. User clicks "+" or "-" button on item
3. System calls `updateQty(listingId, newQty)`
4. If `newQty <= 0`: remove item
5. If `newQty > 0`: update qty
6. Subtotal recalculates automatically
7. UI updates instantly (optimistic)

## UC-04: Remove Item from Cart
1. User is on CartPage
2. User clicks trash icon on item
3. System calls `removeItem(listingId)`
4. Item removed from `items[]`
5. If cart becomes empty: show empty state
6. Cart badge count updates

## UC-05: Clear Cart
1. User clicks "Clear Cart" button
2. System shows confirmation dialog
3. User confirms
4. System calls `clear()`
5. All items removed
6. Empty cart state displayed

## UC-06: View Cart
1. User clicks cart icon in header
2. User navigates to `/app/cart`
3. If cart empty:
   - Show empty state illustration
   - Show "Browse Catalog" button
4. If cart has items:
   - Show list of items with qty controls
   - Show subtotal calculation
   - Show "Proceed to Checkout" button

## UC-07: Proceed to Checkout
1. User is on CartPage with items
2. User clicks "Proceed to Checkout"
3. System navigates to `/app/checkout`
4. Checkout page reads cart items
5. System creates Order from cart items
6. Cart cleared after successful order

## UC-08: Switch User Account (Cart Isolation)
1. User A has items in cart (stored as `bazari_cart_5GrwvaEF...`)
2. User switches to Account B (address `5FHneW...`)
3. System recomputes storage key: `bazari_cart_5FHneW...`
4. Zustand rehydrates with Account B's cart
5. User A's cart persists but is not visible
6. User B sees their own cart items
7. Switching back to User A restores User A's cart

## UC-09: Anonymous User Cart
1. User not logged in
2. User adds items to cart
3. System uses key: `bazari_cart_anonymous`
4. Cart persists in localStorage
5. User logs in (connects wallet)
6. System switches to user-specific key
7. Anonymous cart remains in storage (not migrated)

## UC-10: Calculate Subtotal
1. Cart has items: [Item A (qty: 2, price: 5 BZR), Item B (qty: 1, price: 10 BZR)]
2. System computes:
   - Item A line total: 2 * 5 = 10 BZR
   - Item B line total: 1 * 10 = 10 BZR
   - Subtotal: 10 + 10 = 20 BZR (in planck)
3. Subtotal displayed to user
4. Updates automatically on qty change

**Status:** ✅ Implemented
