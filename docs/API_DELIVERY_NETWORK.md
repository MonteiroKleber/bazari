# Bazari Delivery Network - API Documentation

## Visão Geral

O Bazari Delivery Network é um sistema descentralizado de entregas integrado ao marketplace Bazari. Permite que entregadores se cadastrem, aceitem entregas, e que lojas criem redes privadas de parceiros de entrega.

**Base URL:** `http://localhost:3000/api`

**Autenticação:** JWT Bearer token (a ser implementado)

---

## Endpoints

### 1. Delivery Profile (Perfil de Entregador)

#### POST /delivery/profile
Criar perfil de entregador.

**Request:**
```json
{
  "fullName": "João da Moto",
  "documentType": "cpf",
  "documentNumber": "12345678900",
  "phoneNumber": "+5521999999999",
  "emergencyContact": {
    "name": "Maria Silva",
    "phone": "+5521988888888",
    "relationship": "spouse"
  },
  "vehicleType": "motorcycle",
  "vehiclePlate": "ABC1234",
  "vehicleModel": "Honda CG 160",
  "vehicleYear": 2022,
  "vehicleColor": "Vermelha",
  "maxWeight": 10,
  "maxVolume": 0.5,
  "canCarryFragile": true,
  "canCarryPerishable": false,
  "hasInsulatedBag": true,
  "serviceRadius": 15,
  "serviceCities": ["Rio de Janeiro"],
  "serviceStates": ["RJ"],
  "walletAddress": "5DWalletAddressExample123..."
}
```

**Response (201):**
```json
{
  "id": "uuid-delivery-profile",
  "profileId": "profile-id",
  "fullName": "João da Moto",
  "vehicleType": "motorcycle",
  "accountStatus": "pending_verification",
  "isVerified": false,
  "createdAt": "1760000000000"
}
```

**Erros:**
- `409` - Perfil já existe ou documento duplicado
- `400` - Dados inválidos

---

#### PUT /delivery/profile
Atualizar perfil de entregador.

**Request:** (todos campos opcionais)
```json
{
  "vehicleType": "car",
  "maxWeight": 20,
  "serviceRadius": 20
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "profileId": "profile-id",
  "fullName": "João da Moto",
  "vehicleType": "car",
  "updatedAt": "1760001000000"
}
```

---

#### GET /delivery/profile
Obter perfil completo do entregador.

**Response (200):**
```json
{
  "id": "uuid",
  "profileId": "profile-id",
  "fullName": "João da Moto",
  "documentType": "cpf",
  "documentNumber": "12345678900",
  "phoneNumber": "+5521999999999",
  "vehicleType": "motorcycle",
  "vehiclePlate": "ABC1234",
  "maxWeight": 10,
  "maxVolume": 0.5,
  "isAvailable": true,
  "isOnline": true,
  "accountStatus": "active",
  "isVerified": true,
  "totalDeliveries": 150,
  "completedDeliveries": 145,
  "avgRating": 4.8,
  "totalEarnings": "5000.00",
  "pendingEarnings": "250.00",
  "createdAt": "1760000000000",
  "updatedAt": "1760001000000"
}
```

---

#### PATCH /delivery/profile/availability
Atualizar disponibilidade e localização.

**Request:**
```json
{
  "isAvailable": true,
  "isOnline": true,
  "currentLat": -22.9068,
  "currentLng": -43.1729,
  "currentAccuracy": 10.5
}
```

**Response (200):**
```json
{
  "success": true,
  "isAvailable": true,
  "isOnline": true,
  "lastLocationUpdate": "1760002000000"
}
```

---

#### GET /delivery/profile/stats
Obter estatísticas do entregador.

**Response (200):**
```json
{
  "totalDeliveries": 150,
  "completedDeliveries": 145,
  "cancelledDeliveries": 5,
  "avgRating": 4.8,
  "totalRatings": 142,
  "onTimeRate": 96.5,
  "acceptanceRate": 85.0,
  "completionRate": 96.7,
  "avgDeliveryTime": 25,
  "fastestDelivery": 12,
  "totalDistance": 1250.5,
  "totalEarnings": "5000.00",
  "pendingEarnings": "250.00",
  "rankings": {
    "city": null,
    "overall": null
  }
}
```

---

### 2. Delivery Requests (Solicitações de Entrega)

#### POST /delivery/calculate-fee
Calcular valor da entrega.

**Request:**
```json
{
  "pickupAddress": {
    "street": "Rua A",
    "number": "100",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zipCode": "20000-000",
    "country": "BR",
    "lat": -22.9068,
    "lng": -43.1729
  },
  "deliveryAddress": {
    "street": "Rua B",
    "number": "200",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zipCode": "22000-000",
    "country": "BR",
    "lat": -22.9711,
    "lng": -43.1825
  },
  "packageType": "small_box",
  "weight": 2.0,
  "dimensions": {
    "length": 30,
    "width": 20,
    "height": 10
  }
}
```

**Response (200):**
```json
{
  "totalBzr": "16.32",
  "distance": 7.22,
  "breakdown": {
    "baseFee": "5.00",
    "distanceFee": "10.83",
    "weightFee": "0.50",
    "packageTypeFee": "1.00"
  },
  "estimatedTimeMinutes": 15
}
```

---

#### POST /delivery/requests/direct
Criar solicitação direta de entrega (não vinculada a Order).

**Request:**
```json
{
  "pickupAddress": {
    "street": "Av. Atlântica",
    "number": "1702",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zipCode": "22021-001",
    "country": "BR",
    "lat": -22.9711,
    "lng": -43.1825,
    "contactName": "Loja ABC",
    "contactPhone": "+5521988887777"
  },
  "deliveryAddress": {
    "street": "Rua Primeiro de Março",
    "number": "1",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zipCode": "20010-000",
    "country": "BR",
    "lat": -22.9068,
    "lng": -43.1729,
    "contactName": "José Silva",
    "contactPhone": "+5521977776666",
    "instructions": "Tocar interfone apto 101"
  },
  "recipientId": "uuid-recipient",
  "packageType": "medium_box",
  "weight": 3.5,
  "notes": "Entregar no portão principal",
  "requiresSignature": true
}
```

**Response (201):**
```json
{
  "deliveryRequestId": "uuid-delivery-request",
  "estimatedFee": "19.08",
  "estimatedDistance": 7.22,
  "estimatedTimeMinutes": 15,
  "status": "pending"
}
```

---

#### GET /delivery/requests
Listar demandas disponíveis (para entregadores).

**Query Parameters:**
- `status` - Filtrar por status (padrão: `pending`)
- `forMe` - Apenas demandas priorizadas para mim (`true`/`false`)
- `radius` - Raio de busca em km (padrão: 10)
- `lat` - Latitude atual
- `lng` - Longitude atual
- `page` - Página (padrão: 1)
- `limit` - Items por página (padrão: 20, máx: 100)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-delivery-request",
      "sourceType": "order",
      "orderId": "uuid-order",
      "pickupAddress": {...},
      "deliveryAddress": {...},
      "packageType": "medium_box",
      "weight": 3.5,
      "deliveryFeeBzr": "19.08",
      "distance": 7.22,
      "status": "pending",
      "isPriority": true,
      "expiresAt": "1760003000000",
      "createdAt": "1760000000000"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

#### GET /delivery/requests/:id
Obter detalhes de uma demanda.

**Response (200):**
```json
{
  "id": "uuid-delivery-request",
  "sourceType": "order",
  "orderId": "uuid-order",
  "senderId": "store-id",
  "senderType": "store",
  "recipientId": "profile-id",
  "pickupAddress": {...},
  "deliveryAddress": {...},
  "packageType": "medium_box",
  "weight": 3.5,
  "deliveryFeeBzr": "19.08",
  "distance": 7.22,
  "status": "pending",
  "deliveryPersonId": null,
  "preferredDeliverers": ["profile-1", "profile-2"],
  "isPrivateNetwork": true,
  "createdAt": "1760000000000",
  "updatedAt": "1760000000000",
  "expiresAt": "1760003000000"
}
```

---

#### POST /delivery/requests/:id/accept
Aceitar entrega.

**Response (200):**
```json
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid-delivery-request",
    "status": "accepted",
    "deliveryPersonId": "profile-id",
    "acceptedAt": "1760004000000"
  },
  "actions": {
    "nextStep": "pickup",
    "pickupAddress": {...}
  }
}
```

**Erros:**
- `403` - Perfil de entregador não encontrado ou indisponível
- `404` - Demanda não encontrada
- `400` - Demanda já aceita ou status inválido

---

#### POST /delivery/requests/:id/pickup
Confirmar coleta do pacote.

**Request:**
```json
{
  "lat": -22.9711,
  "lng": -43.1825,
  "notes": "Pacote coletado no endereço",
  "photo": "base64-encoded-image"
}
```

**Response (200):**
```json
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid-delivery-request",
    "status": "in_transit",
    "pickedUpAt": "1760005000000"
  },
  "order": {
    "id": "uuid-order",
    "status": "SHIPPED"
  }
}
```

---

#### POST /delivery/requests/:id/deliver
Confirmar entrega concluída.

**Request:**
```json
{
  "lat": -22.9068,
  "lng": -43.1729,
  "signature": "base64-encoded-signature",
  "photo": "base64-encoded-image",
  "notes": "Entregue ao destinatário",
  "recipientName": "José Silva"
}
```

**Response (200):**
```json
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid-delivery-request",
    "status": "delivered",
    "deliveredAt": "1760006000000",
    "proofOfDelivery": {
      "signature": "base64...",
      "photo": "base64...",
      "recipientName": "José Silva",
      "timestamp": 1760006000000,
      "lat": -22.9068,
      "lng": -43.1729,
      "notes": "Entregue ao destinatário"
    }
  },
  "payment": {
    "status": "released",
    "amountBzr": "19.08"
  }
}
```

---

#### POST /delivery/requests/:id/cancel
Cancelar entrega.

**Request:**
```json
{
  "reason": "vehicle_breakdown",
  "notes": "Moto quebrou no caminho"
}
```

**Reasons:** `vehicle_breakdown`, `traffic`, `weather`, `personal`, `other`

**Response (200):**
```json
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid-delivery-request",
    "status": "cancelled",
    "cancelledAt": "1760007000000"
  },
  "refund": {
    "status": "processing",
    "message": "Valor será devolvido em até 24h"
  }
}
```

---

### 3. Store Delivery Partners (Parceiros de Entrega)

#### GET /stores/:storeId/delivery-partners
Listar parceiros de entrega da loja.

**Query Parameters:**
- `status` - Filtrar por status (`active`, `paused`, `suspended`, `rejected`, `all`)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-partnership",
      "deliveryPersonId": "profile-id",
      "deliveryPerson": {
        "displayName": "João da Moto",
        "handle": "@joao",
        "avatarUrl": "url",
        "vehicleType": "motorcycle"
      },
      "status": "active",
      "priority": 1,
      "commissionPercent": 95,
      "bonusPerDelivery": "5.00",
      "totalDeliveries": 150,
      "completedDeliveries": 145,
      "avgRating": 4.8,
      "avgDeliveryTime": 25,
      "onTimeRate": 96.7,
      "requestedAt": "1760000000000",
      "approvedAt": "1760001000000",
      "createdAt": "1760000000000"
    }
  ]
}
```

---

#### POST /stores/:storeId/delivery-partners/request
Solicitar vínculo como entregador.

**Request:**
```json
{
  "message": "Gostaria de ser parceiro da sua loja!"
}
```

**Response (201):**
```json
{
  "id": "uuid-partnership",
  "storeId": "123",
  "deliveryPersonId": "profile-id",
  "status": "pending",
  "requestedAt": "1760000000000"
}
```

**Erros:**
- `403` - Perfil de entregador não encontrado
- `404` - Loja não encontrada
- `409` - Parceria já existe

---

#### PATCH /stores/:storeId/delivery-partners/:partnerId
Atualizar parceria (apenas dono da loja).

**Request:**
```json
{
  "status": "active",
  "priority": 1,
  "commissionPercent": 95,
  "bonusPerDelivery": "5.00",
  "maxDailyDeliveries": 20,
  "allowedDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "workingHoursStart": "08:00",
  "workingHoursEnd": "20:00",
  "notes": "Entregador preferencial",
  "rejectionReason": "Não atende nossos requisitos"
}
```

**Response (200):**
```json
{
  "id": "uuid-partnership",
  "status": "active",
  "priority": 1,
  "commissionPercent": 95,
  "approvedAt": "1760002000000",
  "rejectedAt": null,
  "suspendedAt": null
}
```

---

#### DELETE /stores/:storeId/delivery-partners/:partnerId
Remover parceria (apenas dono da loja).

**Response (204):** No content

---

### 4. Orders Integration

#### POST /orders/estimate-shipping
Estimar frete antes de finalizar pedido.

**Request:**
```json
{
  "sellerStoreId": "uuid-store",
  "deliveryAddress": {
    "street": "Rua Teste",
    "number": "123",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zipCode": "22000-000",
    "country": "BR"
  },
  "items": [
    {
      "listingId": "uuid-product",
      "qty": 2,
      "kind": "product"
    }
  ]
}
```

**Response (200):**
```json
{
  "deliveryFeeBzr": "16.32",
  "distance": 6.55,
  "estimatedTimeMinutes": 14,
  "breakdown": {
    "baseFee": "5.00",
    "distanceFee": "9.82",
    "weightFee": "0.50",
    "packageTypeFee": "1.00"
  }
}
```

---

## Tipos e Enums

### DeliveryRequestStatus
- `pending` - Aguardando entregador
- `searching` - Buscando entregador
- `accepted` - Aceita por entregador
- `picked_up` - Coletada
- `in_transit` - Em trânsito
- `delivered` - Entregue
- `cancelled` - Cancelada
- `failed` - Falhou

### PackageType
- `envelope` - Envelope
- `small_box` - Caixa pequena
- `medium_box` - Caixa média
- `large_box` - Caixa grande
- `fragile` - Frágil
- `perishable` - Perecível
- `custom` - Personalizado

### VehicleType
- `bike` - Bicicleta
- `motorcycle` - Moto
- `car` - Carro
- `van` - Van
- `truck` - Caminhão

### PartnerStatus
- `pending` - Aguardando aprovação
- `active` - Ativo
- `paused` - Pausado
- `suspended` - Suspenso
- `rejected` - Rejeitado

---

## Configuração

### Variáveis de Ambiente

```env
# Delivery Network
DELIVERY_BASE_FEE=5.0
DELIVERY_FEE_PER_KM=1.5
DELIVERY_FEE_PER_KG=0.5
DELIVERY_MAX_SEARCH_RADIUS=50
DELIVERY_DEFAULT_SERVICE_RADIUS=10
DELIVERY_ESTIMATED_SPEED_KMH=30
DELIVERY_MIN_FEE=5.0

# Feature Flags
FEATURE_AUTO_CREATE_DELIVERY=true
```

---

## Fluxos Principais

### Fluxo 1: Entregador se Cadastra
1. POST `/delivery/profile` - Criar perfil
2. PATCH `/delivery/profile/availability` - Ficar disponível
3. GET `/delivery/requests` - Ver demandas disponíveis

### Fluxo 2: Aceitar e Completar Entrega
1. GET `/delivery/requests` - Listar demandas
2. GET `/delivery/requests/:id` - Ver detalhes
3. POST `/delivery/requests/:id/accept` - Aceitar
4. POST `/delivery/requests/:id/pickup` - Confirmar coleta
5. POST `/delivery/requests/:id/deliver` - Confirmar entrega

### Fluxo 3: Parceria Loja-Entregador
1. POST `/stores/:id/delivery-partners/request` - Entregador solicita
2. GET `/stores/:id/delivery-partners` - Loja visualiza solicitações
3. PATCH `/stores/:id/delivery-partners/:pid` - Loja aprova com configurações

### Fluxo 4: Order com Entrega Automática
1. POST `/orders` com `shippingAddress`
2. Sistema cria `DeliveryRequest` automaticamente
3. Sistema notifica entregadores vinculados (prioridade)
4. Após 2min ou se não há vinculados, abre para rede pública
5. Entregador aceita e completa
6. Order.status atualizado automaticamente (SHIPPED → RELEASED)

---

## Notas de Implementação

- **Autenticação:** JWT tokens ainda não implementados. Endpoints usam placeholders.
- **Notificações:** Sistema de notificações para entregadores não implementado (TODO).
- **Escrow:** Sistema de escrow de pagamento é mock (TODO: integrar com blockchain real).
- **Métricas:** Atualização automática de métricas do entregador não implementada (TODO).
- **Localização Real-time:** Tracking em tempo real não implementado (TODO: WebSocket).

---

## Código de Exemplo

### JavaScript/TypeScript (Fetch)

```typescript
// Calcular frete
const response = await fetch('http://localhost:3000/api/delivery/calculate-fee', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    pickupAddress: {
      street: 'Rua A',
      number: '100',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20000-000',
      country: 'BR',
    },
    deliveryAddress: {
      street: 'Rua B',
      number: '200',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22000-000',
      country: 'BR',
    },
    packageType: 'small_box',
    weight: 2.0,
  }),
});

const result = await response.json();
console.log('Valor da entrega:', result.totalBzr, 'BZR');
```

### cURL

```bash
# Listar demandas disponíveis
curl -X GET 'http://localhost:3000/api/delivery/requests?status=pending&limit=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Aceitar entrega
curl -X POST 'http://localhost:3000/api/delivery/requests/uuid-123/accept' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório do projeto.
