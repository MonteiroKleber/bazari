# Orders Module - Use Cases

## UC-01: Create Order
1. Buyer adds items to cart
2. Buyer proceeds to checkout
3. System validates all items exist
4. System validates all items from same seller (MVP rule)
5. System calculates subtotal, shipping, total
6. System creates Order with OrderItems (snapshots)
7. System auto-creates DeliveryRequest if shipping address present
8. Order created with status CREATED

## UC-02: Estimate Shipping Before Order
1. Buyer is on checkout page
2. Buyer enters delivery address
3. Client requests `POST /orders/estimate-shipping`
4. System calculates distance from store pickup address
5. System estimates package details (weight, dimensions)
6. System returns delivery fee, distance, estimated time
7. Buyer sees shipping cost before confirming order

## UC-03: Create Payment Intent
1. Buyer confirms order
2. Client requests `POST /orders/:id/payment-intent`
3. System validates order exists and totalBzr > 0
4. System creates PaymentIntent with escrow address
5. System returns escrow address and amount
6. Buyer sends funds to escrow on-chain
7. PaymentIntent status updated to FUNDS_IN

## UC-04: Confirm Order Received (Buyer)
1. Buyer receives delivery
2. Buyer clicks "Confirm Received"
3. Client requests `POST /orders/:id/confirm-received`
4. System validates order has active PaymentIntent (FUNDS_IN)
5. System calculates fee split (gross, fee, net)
6. System creates EscrowLog (kind: RELEASE_REQUEST)
7. System returns recommendation for manual release
8. Admin/multisig releases funds on-chain

## UC-05: Release Order (Seller Confirms Delivery)
1. Seller marks order as shipped
2. Seller clicks "Release Order"
3. Client requests `POST /orders/:id/release`
4. System validates order status (SHIPPED or ESCROWED)
5. System updates status to RELEASED
6. System creates EscrowLog (RELEASE_REQUEST)
7. System triggers reputation sync worker
8. Seller reputation incremented on-chain
9. Funds released to seller (minus fee)

## UC-06: Cancel Order
1. Buyer/Seller wants to cancel
2. Client requests `POST /orders/:id/cancel`
3. System validates order can be cancelled (not in final states)
4. System creates EscrowLog (kind: REFUND_REQUEST)
5. System returns recommendation for refund
6. Admin/multisig refunds buyer on-chain
7. Order status updated to CANCELLED

## UC-07: View Order Details
1. User navigates to `/orders/:id`
2. Client requests `GET /orders/:id`
3. System returns order with:
   - Order details (totals, addresses, status)
   - OrderItems (snapshots of products/services)
   - PaymentIntents (escrow tracking)
   - EscrowLogs (audit trail)
4. User sees complete order history

## UC-08: Get Payments Config
1. Frontend initializes checkout flow
2. Client requests `GET /payments/config`
3. System returns:
   - Escrow address
   - Fee BPS (basis points)
4. Frontend uses config for payment UI

## UC-09: Idempotent Order Creation
1. Buyer submits order
2. Network error occurs
3. Buyer retries with same Idempotency-Key header
4. System checks cache (10 min TTL)
5. System returns cached order (no duplicate created)
6. Prevents double orders from network issues

## UC-10: Auto-Delivery Request Creation
1. Buyer creates order with shipping address
2. System detects `env.FEATURE_AUTO_CREATE_DELIVERY` = true
3. System fetches store pickup address
4. System calculates delivery fee
5. System creates DeliveryRequest linked to Order
6. DeliveryRequest available for carrier matching
7. If error, Order still created (delivery is optional)

**Status:** ✅ Implemented
