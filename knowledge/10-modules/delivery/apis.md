# Delivery Module - API Reference

## 1. Calculate Delivery Fee
**`POST /api/delivery/calculate-fee`**

```http
POST /api/delivery/calculate-fee
{
  "pickupAddress": {
    "street": "Rua A",
    "number": "123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01000-000",
    "country": "BR",
    "lat": -23.5505,
    "lng": -46.6333
  },
  "deliveryAddress": {
    "street": "Rua B",
    "city": "Campinas",
    "state": "SP",
    "zipCode": "13000-000",
    "country": "BR"
  },
  "packageType": "medium_box",
  "weight": 3.5,
  "dimensions": {
    "length": 30,
    "width": 20,
    "height": 15
  }
}
```

**Response:**
```json
{
  "totalBzr": "1900000000000000",
  "distance": 95.5,
  "breakdown": {
    "baseFee": "10000000000000",
    "distanceFee": "47750000000000",
    "weightFee": "2500000000000",
    "packageTypeFee": "2000000000000"
  },
  "estimatedTimeMinutes": 120
}
```

**Formula:**
- Base: 10 BZR
- Distance: 95.5 km * 0.5 BZR/km = 47.75 BZR
- Weight: (3.5 - 1.0) * 1 BZR/kg = 2.5 BZR
- Type: medium_box = 2 BZR
- **Total: 62.25 BZR**

---

## 2. Create Direct DeliveryRequest
**`POST /api/delivery/request`** (Auth required)

```http
POST /api/delivery/request
{
  "pickupAddress": {...},
  "deliveryAddress": {...},
  "recipientId": "profile_uuid",
  "packageType": "fragile",
  "weight": 2.0,
  "notes": "Handle with care - glass items",
  "requiresSignature": true
}
```

**Response:**
```json
{
  "id": "delivery_uuid",
  "sourceType": "direct",
  "status": "pending",
  "deliveryFeeBzr": "15000000000000",
  "distance": 10.5,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

## 3. Get Available Delivery Requests (For Delivery Person)
**`GET /api/delivery/available`** (Auth required, must have DeliveryProfile)

```http
GET /api/delivery/available?maxDistance=50&maxWeight=20
```

**Response:**
```json
{
  "requests": [
    {
      "id": "delivery_1",
      "pickupAddress": {...},
      "deliveryAddress": {...},
      "packageType": "small_box",
      "weight": 2.5,
      "deliveryFeeBzr": "12000000000000",
      "distance": 8.5,
      "requiresSignature": true,
      "status": "pending",
      "createdAt": "2025-01-15T09:00:00Z"
    }
  ],
  "totalCount": 1
}
```

**Filters Applied:**
- Status: pending or assigned
- Geo proximity (if location available)
- Capacity match (weight, volume, fragile, perishable)
- Private network visibility

---

## 4. Accept Delivery Request
**`POST /api/delivery/:id/accept`** (Auth required, must have DeliveryProfile)

```http
POST /api/delivery/delivery_1/accept
```

**Response:**
```json
{
  "success": true,
  "deliveryRequest": {
    "id": "delivery_1",
    "status": "accepted",
    "deliveryPersonId": "profile_abc",
    "acceptedAt": "2025-01-15T10:05:00Z"
  }
}
```

**Validations:**
- User has DeliveryProfile
- Request status is pending/assigned
- Delivery person has capacity (weight, volume, type)

---

## 5. Mark as Picked Up
**`POST /api/delivery/:id/pickup`** (Auth required)

```http
POST /api/delivery/delivery_1/pickup
```

**Response:**
```json
{
  "success": true,
  "status": "picked_up",
  "pickedUpAt": "2025-01-15T10:30:00Z"
}
```

---

## 6. Mark as In Transit
**`POST /api/delivery/:id/transit`** (Auth required)

```http
POST /api/delivery/delivery_1/transit
```

**Response:**
```json
{
  "success": true,
  "status": "in_transit",
  "inTransitAt": "2025-01-15T10:35:00Z"
}
```

---

## 7. Complete Delivery
**`POST /api/delivery/:id/complete`** (Auth required)

```http
POST /api/delivery/delivery_1/complete
```

**Response:**
```json
{
  "success": true,
  "status": "delivered",
  "deliveredAt": "2025-01-15T11:00:00Z"
}
```

**Side Effects:**
- Triggers reputation sync worker
- Delivery person reputation incremented on-chain
- Recipient receives notification

---

## 8. Cancel Delivery Request
**`POST /api/delivery/:id/cancel`** (Auth required)

```http
POST /api/delivery/delivery_1/cancel
{
  "reason": "Sender cancelled order"
}
```

**Response:**
```json
{
  "success": true,
  "status": "cancelled",
  "cancelledAt": "2025-01-15T10:15:00Z"
}
```

**Constraints:**
- Cannot cancel if status is completed/delivered

---

## 9. Create Delivery Profile
**`POST /api/delivery/profile`** (Auth required)

```http
POST /api/delivery/profile
{
  "fullName": "João Silva",
  "documentType": "cpf",
  "documentNumber": "123.456.789-00",
  "phoneNumber": "+5511999999999",
  "emergencyContact": {
    "name": "Maria Silva",
    "phone": "+5511888888888",
    "relationship": "spouse"
  },
  "vehicleType": "motorcycle",
  "vehiclePlate": "ABC-1234",
  "vehicleModel": "Honda CG 160",
  "vehicleYear": 2022,
  "vehicleColor": "red",
  "maxWeight": 20,
  "maxVolume": 0.2,
  "canCarryFragile": true,
  "canCarryPerishable": false,
  "hasInsulatedBag": false
}
```

**Response:**
```json
{
  "id": "delivery_profile_1",
  "profileId": "profile_abc",
  "fullName": "João Silva",
  "vehicleType": "motorcycle",
  "isAvailable": false,
  "createdAt": "2025-01-15T09:00:00Z"
}
```

---

## 10. Update Delivery Profile Availability
**`PUT /api/delivery/profile/availability`** (Auth required)

```http
PUT /api/delivery/profile/availability
{
  "isAvailable": true
}
```

**Response:**
```json
{
  "success": true,
  "isAvailable": true,
  "isOnline": true
}
```

---

## 11. Update Delivery Person Location
**`PUT /api/delivery/profile/location`** (Auth required)

```http
PUT /api/delivery/profile/location
{
  "lat": -23.5505,
  "lng": -46.6333
}
```

**Response:**
```json
{
  "success": true,
  "currentLat": -23.5505,
  "currentLng": -46.6333,
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

## 12. Get Delivery Profile
**`GET /api/delivery/profile`** (Auth required)

```http
GET /api/delivery/profile
```

**Response:**
```json
{
  "id": "delivery_profile_1",
  "profileId": "profile_abc",
  "fullName": "João Silva",
  "vehicleType": "motorcycle",
  "isAvailable": true,
  "isOnline": true,
  "totalDeliveries": 150,
  "ratingAvg": 4.8,
  "ratingCount": 120
}
```

---

## 13. Add Delivery Partner (Store Owner)
**`POST /api/delivery/partners`** (Auth required, must own store)

```http
POST /api/delivery/partners
{
  "storeId": "store_uuid",
  "deliveryPersonId": "profile_abc"
}
```

**Response:**
```json
{
  "success": true,
  "preferredDeliverers": ["profile_abc", "profile_xyz"]
}
```

---

## 14. Get Delivery History
**`GET /api/delivery/history`** (Auth required)

```http
GET /api/delivery/history?limit=20&offset=0
```

**Response:**
```json
{
  "deliveries": [
    {
      "id": "delivery_1",
      "distance": 10.5,
      "deliveryFeeBzr": "12000000000000",
      "completedAt": "2025-01-15T11:00:00Z",
      "rating": 5
    }
  ],
  "totalCount": 150,
  "stats": {
    "totalDistance": 1500.5,
    "totalEarnings": "180000000000000000",
    "avgRating": 4.8
  }
}
```

---

## Geolocation Integration

### Distance Calculation (Haversine Formula)
```typescript
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

### CEP to Coordinates Estimation
```typescript
function estimateCoordinatesFromZipCode(zipCode: string): {lat: number, lng: number} | null {
  // Lookup table or external API (ViaCEP, Google Maps Geocoding)
  // Fallback: estimate by first 5 digits of CEP
}
```

---

## Private Delivery Network

### Use Case
Store wants only trusted delivery persons to see their requests:

```http
POST /api/delivery/request
{
  ...,
  "preferredDeliverers": ["profile_1", "profile_2"],
  "isPrivateNetwork": true
}
```

**Result:**
- Only `profile_1` and `profile_2` see this request in `/delivery/available`
- Other delivery persons cannot see this request

---

## Auto-Creation from Order

When Order is created with `shippingAddress` and `env.FEATURE_AUTO_CREATE_DELIVERY=true`:

```typescript
// In POST /orders
if (order.shippingAddress && env.FEATURE_AUTO_CREATE_DELIVERY) {
  const deliveryResult = await createDeliveryRequestForOrder(prisma, order.id);
  // DeliveryRequest created automatically
}
```

**Status:** ✅ Implemented
