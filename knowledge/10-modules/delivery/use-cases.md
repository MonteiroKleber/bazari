# Delivery Module - Use Cases

## UC-01: Calculate Delivery Fee
1. User is on checkout page
2. User enters delivery address
3. Client requests `POST /delivery/calculate-fee`
4. System calculates distance (via coords or CEP)
5. System applies formula: base + distance + weight + type
6. System returns total fee + breakdown + estimated time
7. User sees delivery cost before confirming order

## UC-02: Auto-Create DeliveryRequest from Order
1. User creates Order with `shippingAddress`
2. System detects `env.FEATURE_AUTO_CREATE_DELIVERY = true`
3. System fetches store's `pickupAddress`
4. System estimates package details from order items
5. System calculates delivery fee
6. System creates DeliveryRequest (status: pending)
7. DeliveryRequest linked to Order (1:1)
8. If error, Order still created (delivery is optional)

## UC-03: Create Direct DeliveryRequest (No Order)
1. User wants to send package directly (not via order)
2. User fills form: pickup, delivery, package details
3. Client requests `POST /delivery/request`
4. System validates addresses
5. System calculates fee
6. System creates DeliveryRequest (sourceType: direct)
7. Request available for delivery person matching

## UC-04: Delivery Person Creates Profile
1. User navigates to `/app/delivery/onboarding`
2. User fills:
   - Full name, document (CPF/CNPJ), phone
   - Vehicle type, plate, model, year, color
   - Capacities: maxWeight, maxVolume
   - Can carry fragile/perishable? Has insulated bag?
3. Client requests `POST /delivery/profile`
4. System creates DeliveryProfile
5. User is now eligible to accept deliveries

## UC-05: Delivery Person Views Available Requests
1. Delivery person opens delivery dashboard
2. Client requests `GET /delivery/available`
3. System filters by:
   - Status: pending or assigned
   - Geo proximity (if currentLat/Lng available)
   - Capacity match (weight, volume, fragile, perishable)
   - Private network visibility
4. System returns list of matching requests
5. Delivery person sees deliveries they can accept

## UC-06: Accept Delivery Request
1. Delivery person sees available request
2. Delivery person clicks "Accept Delivery"
3. Client requests `POST /delivery/:id/accept`
4. System validates:
   - User has DeliveryProfile
   - Request status is pending/assigned
   - User has capacity for this package
5. System updates status → accepted
6. System sets acceptedAt timestamp
7. Delivery person is now assigned

## UC-07: Pick Up Package
1. Delivery person arrives at pickup address
2. Delivery person clicks "Mark as Picked Up"
3. Client requests `POST /delivery/:id/pickup`
4. System updates status → picked_up
5. System sets pickedUpAt timestamp
6. Sender receives notification

## UC-08: Mark In Transit
1. Delivery person starts journey
2. Delivery person clicks "In Transit"
3. Client requests `POST /delivery/:id/transit`
4. System updates status → in_transit
5. System sets inTransitAt timestamp
6. Recipient can track progress

## UC-09: Complete Delivery
1. Delivery person arrives at destination
2. Delivery person clicks "Mark as Delivered"
3. Client requests `POST /delivery/:id/complete`
4. System validates status (must be in_transit)
5. System updates status → delivered
6. System sets deliveredAt timestamp
7. System triggers reputation sync worker
8. Delivery person reputation incremented on-chain
9. Recipient receives notification

## UC-10: Cancel Delivery Request
1. Sender or delivery person wants to cancel
2. Client requests `POST /delivery/:id/cancel`
3. System validates status (not completed/delivered)
4. System updates status → cancelled
5. System sets cancelledAt timestamp
6. If delivery person assigned, notification sent
7. Request removed from available list

## UC-11: Set Delivery Person Availability
1. Delivery person opens app
2. Delivery person toggles "Available for Deliveries"
3. Client requests `PUT /delivery/profile/availability`
4. System updates `isAvailable = true`
5. Delivery person starts receiving request notifications

## UC-12: Update Delivery Person Location
1. Delivery person app runs in background
2. App sends location updates every N seconds
3. Client requests `PUT /delivery/profile/location`
4. System updates `currentLat, currentLng`
5. System uses location for proximity matching

## UC-13: Store Creates Private Delivery Network
1. Store owner goes to settings
2. Store owner adds trusted delivery person IDs
3. Client requests `POST /delivery/partners`
4. System updates store's `preferredDeliverers[]`
5. Store can toggle `isPrivateNetwork = true`
6. Delivery requests now visible only to network

## UC-14: Estimate Package Details from Order Items
1. System needs to create DeliveryRequest for Order
2. System analyzes order items (quantity, type)
3. System estimates:
   - Package type (small_box if <= 3 items, medium_box if <= 10, etc.)
   - Weight (items * estimated weight per item)
4. System uses estimates for fee calculation
5. Automatic estimation reduces friction

## UC-15: View Delivery History
1. Delivery person opens profile
2. Client requests `GET /delivery/history`
3. System returns completed deliveries with:
   - Date, distance, fee earned
   - Ratings, reputation points
4. Delivery person sees earnings stats

**Status:** ✅ Implemented
