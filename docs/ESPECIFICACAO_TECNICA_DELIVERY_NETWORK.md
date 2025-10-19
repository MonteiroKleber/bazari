# ESPECIFICAÇÃO TÉCNICA - BAZARI DELIVERY NETWORK

**Versão:** 1.0.0
**Data:** 2025-10-16
**Status:** Em Implementação

---

## 📋 ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Modelos de Dados](#3-modelos-de-dados)
4. [APIs e Endpoints](#4-apis-e-endpoints)
5. [Lógica de Negócio](#5-lógica-de-negócio)
6. [Integrações](#6-integrações)
7. [Segurança](#7-segurança)
8. [Performance](#8-performance)
9. [Testes](#9-testes)
10. [Deployment](#10-deployment)

---

## 1. VISÃO GERAL

### 1.1 Objetivo

Implementar um sistema de delivery descentralizado integrado ao marketplace Bazari que:
- Gere automaticamente demandas de entrega ao finalizar pedidos de produtos
- Permita solicitações diretas de entrega (fretes avulsos)
- Gerencie rede híbrida de entregadores (vinculados + rede aberta)
- Processe pagamentos em BZR via escrow
- Registre reputação on-chain

### 1.2 Escopo

**Inclui:**
- Extensão do schema Prisma com 3 novos models
- API REST para gerenciamento de entregas
- Integração automática com sistema de Orders
- Cálculo dinâmico de frete
- Sistema de notificações para entregadores
- Dashboard básico (API-ready)

**Não Inclui (Futuro):**
- Tracking GPS em tempo real
- App mobile nativo para entregadores
- Integração com mapas (Google Maps API)
- Sistema de disputas automatizado
- Gamificação e ranking de entregadores

### 1.3 Stack Tecnológico

| Componente | Tecnologia |
|------------|------------|
| Backend | Node.js + Fastify |
| Database | PostgreSQL + Prisma ORM |
| Validação | Zod |
| Blockchain | Substrate (Bazari Chain) |
| Cache | Redis (futuro) |
| Real-time | WebSocket (futuro) |

---

## 2. ARQUITETURA

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      BAZARI MARKETPLACE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Products   │      │   Services   │                     │
│  │   (Goods)    │      │   (Offers)   │                     │
│  └──────┬───────┘      └──────┬───────┘                     │
│         │                     │                              │
│         └─────────┬───────────┘                              │
│                   ↓                                          │
│          ┌────────────────┐                                  │
│          │  ORDER SYSTEM  │                                  │
│          │  (Checkout)    │                                  │
│          └────────┬───────┘                                  │
│                   │                                          │
│                   ↓                                          │
│    ╔══════════════════════════════════════╗                 │
│    ║   DELIVERY NETWORK (NOVO)            ║                 │
│    ╠══════════════════════════════════════╣                 │
│    ║  ┌────────────────────────────────┐  ║                 │
│    ║  │   DeliveryRequest Manager      │  ║                 │
│    ║  │  - Auto-create on Order        │  ║                 │
│    ║  │  - Direct service request      │  ║                 │
│    ║  └────────────┬───────────────────┘  ║                 │
│    ║               │                       ║                 │
│    ║               ↓                       ║                 │
│    ║  ┌────────────────────────────────┐  ║                 │
│    ║  │   Delivery Router              │  ║                 │
│    ║  │  - Notify Linked Deliverers    │  ║                 │
│    ║  │  - Fallback to Open Network    │  ║                 │
│    ║  └────────────┬───────────────────┘  ║                 │
│    ║               │                       ║                 │
│    ║               ↓                       ║                 │
│    ║  ┌────────────────────────────────┐  ║                 │
│    ║  │   Delivery Escrow Manager      │  ║                 │
│    ║  │  - Lock funds on accept        │  ║                 │
│    ║  │  - Release on delivery         │  ║                 │
│    ║  └────────────────────────────────┘  ║                 │
│    ╚══════════════════════════════════════╝                 │
│                   │                                          │
│                   ↓                                          │
│          ┌────────────────┐                                  │
│          │   BAZCHAT      │                                  │
│          │  (Real-time)   │                                  │
│          └────────────────┘                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados

#### 2.2.1 Entrega Automática (Produto)

```
1. Cliente finaliza compra com endereço de entrega
   ↓
2. Order criado (status: CREATED)
   ↓
3. [TRIGGER] DeliveryRequest criado automaticamente
   - pickupAddress: Endereço da loja
   - deliveryAddress: Endereço do cliente
   - deliveryFeeBzr: Calculado dinamicamente
   ↓
4. Sistema busca entregadores vinculados à loja
   ↓
5a. Se existem vinculados: Notifica (janela de 2min)
   ↓
5b. Se ninguém aceitar: Libera para rede aberta
   ↓
6. Entregador aceita → Escrow trava valor
   ↓
7. Entregador coleta → Status: IN_TRANSIT
   ↓
8. Entregador entrega → Status: DELIVERED
   ↓
9. Escrow libera pagamento → Reputação atualizada
```

#### 2.2.2 Entrega Direta (Serviço Avulso)

```
1. Cliente solicita entrega direta (frete/mudança)
   ↓
2. DeliveryRequest criado (sourceType: 'direct')
   ↓
3. Publicado diretamente na rede aberta
   ↓
4. [Segue mesmo fluxo a partir do passo 6]
```

---

## 3. MODELOS DE DADOS

### 3.1 DeliveryRequest

**Descrição:** Representa uma demanda de entrega (automática ou direta).

```prisma
model DeliveryRequest {
  id                String   @id @default(uuid())

  // Origem da demanda
  sourceType        String   // "order" | "direct"
  orderId           String?  @unique
  order             Order?   @relation(fields: [orderId], references: [id])

  // Endereços
  pickupAddress     Json     // { street, number, complement?, city, state, zipCode, country, lat?, lng?, contactName?, contactPhone? }
  deliveryAddress   Json     // { street, number, complement?, city, state, zipCode, country, lat?, lng?, contactName?, contactPhone? }

  // Partes Envolvidas
  senderId          String   // storeId (SellerProfile.id) ou profileId
  senderType        String   // "store" | "profile"
  recipientId       String   // profileId do destinatário

  // Detalhes da Carga
  packageType       String   // "envelope" | "small_box" | "medium_box" | "large_box" | "fragile" | "perishable" | "custom"
  weight            Float?   @db.Real // em kg
  dimensions        Json?    // { length: float, width: float, height: float } em cm
  estimatedValue    Decimal? @db.Decimal(20, 8) // valor estimado da mercadoria (para seguro)
  notes             String?  @db.Text
  requiresSignature Boolean  @default(true)

  // Valor e Pagamento
  deliveryFeeBzr    Decimal  @db.Decimal(20, 8)
  distance          Float?   @db.Real // em km (calculado)

  // Status
  status            String   @default("pending")
  // "pending" → "assigned" → "accepted" → "picked_up" → "in_transit" → "delivered" → "completed"
  // ou "cancelled" | "failed"

  // Entregador
  deliveryPersonId  String?
  deliveryPerson    Profile? @relation("DeliveryPerson", fields: [deliveryPersonId], references: [id])

  // Rede de Entregadores
  preferredDeliverers String[] @default([]) // profileIds (ordem de prioridade)
  isPrivateNetwork    Boolean  @default(false) // true = só rede vinculada pode ver
  notifiedDeliverers  String[] @default([]) // histórico de quem foi notificado

  // Tracking de Tempo
  createdAt         BigInt
  updatedAt         BigInt
  expiresAt         BigInt?  // prazo limite para aceite
  assignedAt        BigInt?  // quando foi atribuído
  acceptedAt        BigInt?  // quando entregador aceitou
  pickedUpAt        BigInt?  // quando coletou
  inTransitAt       BigInt?  // quando iniciou trânsito
  deliveredAt       BigInt?  // quando entregou
  completedAt       BigInt?  // quando foi finalizado/pago
  cancelledAt       BigInt?

  // Escrow e Pagamento
  escrowAddress     String?
  paymentTxHash     String?  // hash da transação de pagamento
  releaseTxHash     String?  // hash da liberação do escrow

  // Prova de Entrega
  proofOfDelivery   Json?    // { signature?, photo_urls?: string[], timestamp: bigint }

  // Avaliação
  rating            Int?     // 1-5 estrelas
  reviewComment     String?  @db.Text

  // Metadados
  metadata          Json?    // campo flexível para dados extras

  @@index([status])
  @@index([senderId, senderType])
  @@index([deliveryPersonId])
  @@index([orderId])
  @@index([createdAt])
  @@index([isPrivateNetwork])
}
```

**Campos Críticos:**
- `sourceType`: Diferencia entrega automática (order) de direta (service)
- `preferredDeliverers`: Lista de profileIds priorizados
- `isPrivateNetwork`: Se true, apenas vinculados podem ver
- `status`: Máquina de estados principal

**Índices:**
- `status`: Queries frequentes por status
- `senderId + senderType`: Buscar entregas de uma loja
- `deliveryPersonId`: Histórico do entregador
- `orderId`: Link com pedido original
- `isPrivateNetwork`: Filtrar rede aberta vs fechada

---

### 3.2 StoreDeliveryPartner

**Descrição:** Vínculo entre loja e entregador preferencial.

```prisma
model StoreDeliveryPartner {
  id                String   @id @default(uuid())

  // Relação
  storeId           BigInt   // SellerProfile.onChainStoreId
  deliveryPersonId  String   // Profile.id
  deliveryPerson    Profile  @relation("StoreDeliveryPartner", fields: [deliveryPersonId], references: [id], onDelete: Cascade)

  // Configurações
  status            String   @default("pending") // "pending" | "active" | "paused" | "suspended" | "rejected"
  priority          Int      @default(1) // 1 = primeira oferta, 2 = segunda, etc.

  // Comissão e Financeiro
  commissionPercent Int      @default(100) // % do deliveryFeeBzr que vai para o entregador (loja pode subsidiar)
  bonusPerDelivery  Decimal? @db.Decimal(20, 8) // bônus fixo por entrega

  // Restrições
  maxDailyDeliveries Int?    // limite de entregas por dia (null = sem limite)
  allowedDays       String[] @default([]) // ["monday", "tuesday", ...] - vazio = todos os dias
  workingHoursStart String?  // "08:00"
  workingHoursEnd   String?  // "18:00"

  // Métricas (cache)
  totalDeliveries   Int      @default(0)
  completedDeliveries Int    @default(0)
  cancelledDeliveries Int    @default(0)
  avgRating         Float    @default(0)
  avgDeliveryTime   Float?   @db.Real // em minutos
  onTimeRate        Float    @default(100.0) // %

  // Timestamps
  requestedAt       BigInt?  // quando entregador solicitou
  approvedAt        BigInt?  // quando loja aprovou
  rejectedAt        BigInt?
  suspendedAt       BigInt?
  createdAt         BigInt
  updatedAt         BigInt

  // Notas
  notes             String?  @db.Text // notas privadas da loja sobre o entregador
  rejectionReason   String?  @db.Text

  @@unique([storeId, deliveryPersonId])
  @@index([storeId, status])
  @@index([deliveryPersonId, status])
  @@index([priority])
}
```

**Regras de Negócio:**
- Entregador pode solicitar vínculo (`status: "pending"`)
- Loja aprova/rejeita (`status: "active" | "rejected"`)
- Loja pode pausar temporariamente (`status: "paused"`)
- `priority` define ordem de notificação (1 primeiro, 2 segundo, etc.)
- `commissionPercent` permite loja subsidiar entrega (ex: 100% = entregador recebe tudo, 80% = loja fica com 20%)

---

### 3.3 DeliveryProfile

**Descrição:** Perfil estendido para entregadores.

```prisma
model DeliveryProfile {
  id                String   @id @default(uuid())
  profileId         String   @unique
  profile           Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)

  // Documentação
  fullName          String
  documentType      String   // "cpf" | "cnpj" | "passport"
  documentNumber    String   @unique
  phoneNumber       String
  emergencyContact  Json?    // { name: string, phone: string, relationship: string }

  // Veículo
  vehicleType       String   // "bike" | "motorcycle" | "car" | "van" | "truck"
  vehiclePlate      String?
  vehicleModel      String?
  vehicleYear       Int?
  vehicleColor      String?

  // Capacidades
  maxWeight         Float    @db.Real // kg
  maxVolume         Float    @db.Real // m³
  canCarryFragile   Boolean  @default(false)
  canCarryPerishable Boolean @default(false)
  hasInsulatedBag   Boolean  @default(false) // bag térmica

  // Disponibilidade
  isAvailable       Boolean  @default(false)
  isOnline          Boolean  @default(false) // conectado no momento
  currentLat        Float?   @db.Real
  currentLng        Float?   @db.Real
  currentAccuracy   Float?   @db.Real // em metros
  lastLocationUpdate BigInt?

  // Área de Atuação
  serviceRadius     Float    @default(10.0) @db.Real // km
  serviceCities     String[] @default([]) // ["Rio de Janeiro", "Niterói"]
  serviceStates     String[] @default([]) // ["RJ"]
  preferredNeighborhoods String[] @default([])

  // Estatísticas
  totalDeliveries   Int      @default(0)
  completedDeliveries Int    @default(0)
  cancelledDeliveries Int    @default(0)
  avgRating         Float    @default(0)
  totalRatings      Int      @default(0)
  onTimeRate        Float    @default(100.0) // %
  acceptanceRate    Float    @default(100.0) // % de entregas aceitas vs oferecidas
  completionRate    Float    @default(100.0) // % de entregas completadas vs aceitas

  // Performance
  avgDeliveryTime   Float?   @db.Real // tempo médio em minutos
  fastestDelivery   Float?   @db.Real // entrega mais rápida (minutos)
  totalDistance     Float    @default(0) @db.Real // km acumulados

  // Financeiro
  walletAddress     String?  // endereço blockchain para receber pagamentos
  totalEarnings     Decimal  @default(0) @db.Decimal(20, 8) // BZR ganhos (histórico)
  pendingEarnings   Decimal  @default(0) @db.Decimal(20, 8) // BZR em escrow

  // Verificação
  isVerified        Boolean  @default(false)
  verificationLevel String   @default("basic") // "basic" | "intermediate" | "advanced"
  backgroundCheckCompleted Boolean @default(false)
  backgroundCheckDate BigInt?

  // Configurações
  autoAcceptRadius  Float?   @db.Real // km - aceita automaticamente dentro desse raio
  minDeliveryFee    Decimal? @db.Decimal(20, 8) // valor mínimo de entrega que aceita
  notificationsEnabled Boolean @default(true)

  // Status da Conta
  accountStatus     String   @default("active") // "active" | "suspended" | "banned" | "under_review"
  suspensionReason  String?  @db.Text
  suspendedUntil    BigInt?

  // Timestamps
  createdAt         BigInt
  updatedAt         BigInt
  lastActiveAt      BigInt?
  verifiedAt        BigInt?

  @@index([isAvailable, isOnline])
  @@index([profileId])
  @@index([documentNumber])
  @@index([serviceRadius])
  @@index([accountStatus])
}
```

**Campos de Localização:**
- `currentLat/Lng`: Atualizado via mobile app (futuro)
- `serviceRadius`: Define área de cobertura
- `serviceCities`: Lista de cidades onde atua

**Métricas de Qualidade:**
- `onTimeRate`: % de entregas no prazo
- `acceptanceRate`: Evita entregadores que aceitam e cancelam
- `completionRate`: Entregadores confiáveis

---

### 3.4 Alterações em Models Existentes

#### 3.4.1 Profile (adicionar relações)

```prisma
model Profile {
  // ... campos existentes ...

  // Delivery Relations
  deliveryProfile         DeliveryProfile?
  deliveryRequestsAsDeliverer DeliveryRequest[] @relation("DeliveryPerson")
  storePartnerships       StoreDeliveryPartner[] @relation("StoreDeliveryPartner")
}
```

#### 3.4.2 Order (adicionar relação)

```prisma
model Order {
  // ... campos existentes ...

  // Delivery Relation
  deliveryRequest   DeliveryRequest?
}
```

#### 3.4.3 SellerProfile (adicionar campo de endereço)

```prisma
model SellerProfile {
  // ... campos existentes ...

  // Address for Pickup
  pickupAddress     Json? // { street, number, complement?, city, state, zipCode, lat?, lng?, instructions? }
}
```

---

## 4. APIS E ENDPOINTS

### 4.1 Delivery Requests

#### 4.1.1 Listar Demandas Disponíveis

```
GET /api/delivery/requests

Query Parameters:
- status: string (optional) - "pending" | "assigned" | etc.
- radius: number (optional) - raio em km (requer lat/lng)
- lat: number (optional) - latitude atual do entregador
- lng: number (optional) - longitude atual do entregador
- forMe: boolean (optional) - true = apenas demandas priorizadas para mim
- page: number (default: 1)
- limit: number (default: 20, max: 100)

Headers:
- Authorization: Bearer <jwt_token>

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "sourceType": "order",
      "orderId": "uuid",
      "pickupAddress": {...},
      "deliveryAddress": {...},
      "packageType": "small_box",
      "weight": 2.5,
      "deliveryFeeBzr": "15.5",
      "distance": 5.2,
      "status": "pending",
      "isPriority": true, // true se estou na preferredDeliverers
      "expiresAt": "timestamp",
      "createdAt": "timestamp"
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

**Lógica:**
- Se `forMe=true`: Filtra apenas `preferredDeliverers` que inclui o profileId do usuário
- Se `lat/lng` fornecidos: Calcula distância e filtra por `radius`
- Se `isPrivateNetwork=true` e usuário não está em `preferredDeliverers`: Não mostra

---

#### 4.1.2 Aceitar Entrega

```
POST /api/delivery/requests/:id/accept

Headers:
- Authorization: Bearer <jwt_token>

Body: {} (vazio)

Response 200:
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid",
    "status": "accepted",
    "deliveryPersonId": "current_user_profile_id",
    "acceptedAt": "timestamp",
    "escrowAddress": "substrate_address",
    "paymentTxHash": null // será preenchido após pagamento
  },
  "actions": {
    "nextStep": "pickup",
    "pickupAddress": {...},
    "contactInfo": {
      "name": "Loja da Maria",
      "phone": "+5521999999999"
    }
  }
}

Response 400:
{
  "error": "Delivery already assigned",
  "message": "Esta entrega já foi aceita por outro entregador"
}

Response 403:
{
  "error": "Not authorized",
  "message": "Você não está na lista de entregadores autorizados para esta entrega"
}
```

**Validações:**
- Verificar se DeliveryRequest existe e status = "pending" ou "assigned"
- Verificar se já tem deliveryPersonId (race condition)
- Se `isPrivateNetwork=true`: Verificar se user está em `preferredDeliverers`
- Verificar se DeliveryProfile existe e isAvailable=true
- Criar escrow (PaymentIntent ou similar)
- Atualizar status para "accepted"
- Criar thread no BazChat entre loja/comprador/entregador
- Enviar notificação push

---

#### 4.1.3 Confirmar Coleta

```
POST /api/delivery/requests/:id/pickup

Headers:
- Authorization: Bearer <jwt_token>

Body:
{
  "lat": -22.9068,
  "lng": -43.1729,
  "notes": "Pacote coletado. 2 caixas.", (optional)
  "photo": "base64_or_url" (optional, futuro)
}

Response 200:
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid",
    "status": "in_transit",
    "pickedUpAt": "timestamp",
    "estimatedDeliveryTime": "timestamp" // calculado
  },
  "order": { // se sourceType = "order"
    "id": "uuid",
    "status": "SHIPPED" // atualizado automaticamente
  }
}
```

**Lógica:**
- Verificar se user é o deliveryPersonId
- Verificar se status = "accepted"
- Atualizar status para "in_transit"
- Se sourceType = "order": Atualizar Order.status para "SHIPPED"
- Registrar pickedUpAt
- Enviar notificação para destinatário: "Seu pedido está a caminho!"

---

#### 4.1.4 Confirmar Entrega

```
POST /api/delivery/requests/:id/deliver

Headers:
- Authorization: Bearer <jwt_token>

Body:
{
  "lat": -22.9068,
  "lng": -43.1729,
  "signature": "base64_signature_image" (optional),
  "photo": "base64_photo" (optional),
  "notes": "Entregue ao porteiro" (optional),
  "recipientName": "João Silva" (optional)
}

Response 200:
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid",
    "status": "delivered",
    "deliveredAt": "timestamp",
    "proofOfDelivery": {
      "signature": "url",
      "photo": "url",
      "timestamp": "...",
      "recipientName": "João Silva"
    }
  },
  "payment": {
    "releaseTxHash": "0x123...",
    "amountBzr": "15.5",
    "status": "released"
  }
}
```

**Lógica:**
- Verificar se user é o deliveryPersonId
- Verificar se status = "in_transit"
- Upload de signature/photo para MediaAsset (se fornecidos)
- Atualizar status para "delivered"
- Liberar escrow automaticamente (ou aguardar confirmação do destinatário)
- Se sourceType = "order": Pode atualizar Order.status para "RELEASED" (ou aguardar confirmação)
- Atualizar métricas do entregador (totalDeliveries++, avgDeliveryTime, etc.)
- Atualizar métricas do StoreDeliveryPartner (se aplicável)
- Enviar notificação para destinatário: "Entrega concluída! Avalie o entregador"

---

#### 4.1.5 Cancelar Entrega

```
POST /api/delivery/requests/:id/cancel

Headers:
- Authorization: Bearer <jwt_token>

Body:
{
  "reason": "vehicle_breakdown" | "traffic" | "other",
  "notes": "Pneu furou no caminho" (optional)
}

Response 200:
{
  "success": true,
  "deliveryRequest": {
    "id": "uuid",
    "status": "cancelled",
    "cancelledAt": "timestamp"
  },
  "refund": {
    "status": "processing",
    "message": "Valor será devolvido em até 24h"
  }
}
```

**Lógica:**
- Pode ser cancelado por: entregador, loja ou destinatário
- Se entregador cancela após aceitar: Penalidade na acceptanceRate
- Se cancela após pickup: Penalidade maior
- Refund do escrow
- Reabrir demanda (status volta para "pending")
- Notificar partes envolvidas

---

### 4.2 Delivery Profile

#### 4.2.1 Criar/Atualizar Perfil de Entregador

```
POST /api/delivery/profile
PUT /api/delivery/profile

Headers:
- Authorization: Bearer <jwt_token>

Body:
{
  "fullName": "João da Moto",
  "documentType": "cpf",
  "documentNumber": "12345678900",
  "phoneNumber": "+5521999999999",
  "vehicleType": "motorcycle",
  "vehiclePlate": "ABC1234",
  "maxWeight": 10.0, // kg
  "maxVolume": 0.5, // m³
  "serviceRadius": 15.0, // km
  "serviceCities": ["Rio de Janeiro", "Niterói"],
  "walletAddress": "5DcQFEZQuSDG2iEDyTz5feyW3sDEnRdSdwGLqRNAc4Eqsbbx"
}

Response 201/200:
{
  "id": "uuid",
  "profileId": "user_profile_id",
  "fullName": "João da Moto",
  "vehicleType": "motorcycle",
  "isVerified": false,
  "accountStatus": "active",
  "createdAt": "timestamp"
}
```

---

#### 4.2.2 Atualizar Disponibilidade

```
PATCH /api/delivery/profile/availability

Body:
{
  "isAvailable": true,
  "isOnline": true,
  "currentLat": -22.9068,
  "currentLng": -43.1729
}

Response 200:
{
  "success": true,
  "isAvailable": true,
  "isOnline": true,
  "lastLocationUpdate": "timestamp"
}
```

---

#### 4.2.3 Obter Estatísticas

```
GET /api/delivery/profile/stats

Response 200:
{
  "totalDeliveries": 127,
  "completedDeliveries": 125,
  "cancelledDeliveries": 2,
  "avgRating": 4.8,
  "onTimeRate": 96.5,
  "acceptanceRate": 89.0,
  "totalEarnings": "1250.50",
  "pendingEarnings": "45.00",
  "rankings": {
    "city": 12, // posição na cidade
    "overall": 143
  }
}
```

---

### 4.3 Store Delivery Partners

#### 4.3.1 Listar Parceiros da Loja

```
GET /api/stores/:storeId/delivery-partners

Query:
- status: "active" | "pending" | "all"

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "deliveryPersonId": "profile_id",
      "deliveryPerson": {
        "displayName": "João da Moto",
        "avatarUrl": "...",
        "vehicleType": "motorcycle"
      },
      "status": "active",
      "priority": 1,
      "totalDeliveries": 45,
      "avgRating": 4.9,
      "onTimeRate": 98.5,
      "approvedAt": "timestamp"
    }
  ]
}
```

---

#### 4.3.2 Solicitar Vínculo (Entregador → Loja)

```
POST /api/stores/:storeId/delivery-partners/request

Headers:
- Authorization: Bearer <jwt_token>

Body:
{
  "message": "Olá! Gostaria de ser parceiro de entregas da sua loja." (optional)
}

Response 201:
{
  "id": "uuid",
  "storeId": "123",
  "deliveryPersonId": "current_user",
  "status": "pending",
  "requestedAt": "timestamp"
}
```

---

#### 4.3.3 Aprovar/Rejeitar Solicitação (Loja)

```
PATCH /api/stores/:storeId/delivery-partners/:partnerId

Headers:
- Authorization: Bearer <jwt_token> (deve ser owner da loja)

Body:
{
  "status": "active" | "rejected",
  "priority": 1, (optional, se aprovando)
  "commissionPercent": 95, (optional)
  "notes": "Entregador experiente, aprovado!" (optional)
}

Response 200:
{
  "id": "uuid",
  "status": "active",
  "priority": 1,
  "approvedAt": "timestamp"
}
```

---

### 4.4 Cálculo de Frete

#### 4.4.1 Calcular Valor de Entrega

```
POST /api/delivery/calculate-fee

Body:
{
  "pickupAddress": {
    "zipCode": "22000-000",
    "city": "Rio de Janeiro",
    "state": "RJ"
  },
  "deliveryAddress": {
    "zipCode": "22010-000",
    "city": "Rio de Janeiro",
    "state": "RJ"
  },
  "packageType": "small_box",
  "weight": 2.5, (optional)
  "dimensions": { (optional)
    "length": 30,
    "width": 20,
    "height": 15
  }
}

Response 200:
{
  "deliveryFeeBzr": "12.50",
  "distance": 5.2, // km
  "estimatedTime": 30, // minutos
  "breakdown": {
    "baseFee": "5.00",
    "distanceFee": "5.20", // 1 BZR/km
    "weightFee": "1.25",
    "packageTypeFee": "1.05"
  }
}
```

**Fórmula Inicial (simplificada):**
```
baseFee = 5.00 BZR (fixo)
distanceFee = distance_km * 1.00 BZR
weightFee = (weight_kg - 1.0) * 0.50 BZR (se > 1kg)
packageTypeFee = {
  envelope: 0 BZR,
  small_box: 1.00 BZR,
  medium_box: 2.00 BZR,
  large_box: 4.00 BZR,
  fragile: 3.00 BZR,
  perishable: 2.50 BZR
}

totalFee = baseFee + distanceFee + weightFee + packageTypeFee
```

**Melhorias Futuras:**
- Integração com API de mapas para distância real
- Dinâmica baseada em demanda/oferta
- Horários de pico (+ 30%)
- Feriados/fins de semana (+ 20%)

---

## 5. LÓGICA DE NEGÓCIO

### 5.1 Criação Automática de DeliveryRequest

**Trigger:** Quando `POST /orders` é chamado com `shippingAddress`

**Localização:** [apps/api/src/routes/orders.ts](apps/api/src/routes/orders.ts) - linha ~195 (após criar Order)

**Pseudocódigo:**
```typescript
async function createDeliveryRequestForOrder(orderId: string) {
  // 1. Buscar Order com items e store
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      sellerStore: { select: { id, onChainStoreId, pickupAddress } }
    }
  });

  if (!order.shippingAddress) return; // sem endereço, sem delivery

  // 2. Buscar entregadores vinculados à loja
  const linkedPartners = await prisma.storeDeliveryPartner.findMany({
    where: {
      storeId: order.sellerStore.onChainStoreId,
      status: 'active'
    },
    orderBy: { priority: 'asc' },
    select: { deliveryPersonId: true }
  });

  // 3. Estimar características do pacote
  const packageDetails = estimatePackageDetails(order.items);

  // 4. Calcular frete
  const deliveryFee = await calculateDeliveryFee({
    pickupAddress: order.sellerStore.pickupAddress,
    deliveryAddress: order.shippingAddress,
    packageType: packageDetails.type,
    weight: packageDetails.weight
  });

  // 5. Criar DeliveryRequest
  const deliveryRequest = await prisma.deliveryRequest.create({
    data: {
      sourceType: 'order',
      orderId: order.id,
      senderId: order.sellerStoreId,
      senderType: 'store',
      recipientId: order.buyerAddr, // TODO: mapear para profileId
      pickupAddress: order.sellerStore.pickupAddress,
      deliveryAddress: order.shippingAddress,
      packageType: packageDetails.type,
      weight: packageDetails.weight,
      dimensions: packageDetails.dimensions,
      deliveryFeeBzr: deliveryFee.toString(),
      distance: deliveryFee.distance,
      preferredDeliverers: linkedPartners.map(p => p.deliveryPersonId),
      isPrivateNetwork: linkedPartners.length > 0,
      status: 'pending',
      expiresAt: Date.now() + (2 * 60 * 1000), // 2 minutos para rede vinculada
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  });

  // 6. Notificar entregadores
  await notifyDeliveryNetwork(deliveryRequest.id);

  return deliveryRequest;
}
```

---

### 5.2 Sistema de Notificações

**Estratégia: Prioridade em Cascata**

```typescript
async function notifyDeliveryNetwork(deliveryRequestId: string) {
  const request = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId },
    include: { /* ... */ }
  });

  if (request.isPrivateNetwork && request.preferredDeliverers.length > 0) {
    // FASE 1: Notificar rede vinculada (2 minutos)
    await notifyDeliverers(request.preferredDeliverers, {
      priority: 'high',
      expiresIn: 120000 // 2min
    });

    // Agendar fallback para rede aberta
    setTimeout(async () => {
      const current = await prisma.deliveryRequest.findUnique({
        where: { id: deliveryRequestId }
      });

      if (current.status === 'pending') {
        // FASE 2: Ninguém aceitou, abrir para todos
        await openToPublicNetwork(deliveryRequestId);
      }
    }, 120000);

  } else {
    // Direto para rede aberta
    await openToPublicNetwork(deliveryRequestId);
  }
}

async function openToPublicNetwork(deliveryRequestId: string) {
  // 1. Atualizar request
  await prisma.deliveryRequest.update({
    where: { id: deliveryRequestId },
    data: {
      isPrivateNetwork: false,
      expiresAt: null // sem limite de tempo
    }
  });

  // 2. Buscar entregadores disponíveis na região
  const request = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId }
  });

  const nearbyDeliverers = await findNearbyDeliverers({
    lat: request.pickupAddress.lat,
    lng: request.pickupAddress.lng,
    radius: 10 // km
  });

  // 3. Notificar todos (push notification, websocket, etc)
  await notifyDeliverers(nearbyDeliverers.map(d => d.profileId), {
    priority: 'normal'
  });
}
```

---

### 5.3 Cálculo de Distância (Haversine)

**Enquanto não houver integração com API de mapas:**

```typescript
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

---

### 5.4 Atualização de Métricas

**Trigger:** Após cada entrega concluída

```typescript
async function updateDelivererMetrics(deliveryRequestId: string) {
  const request = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId },
    include: { deliveryPerson: true }
  });

  if (!request.deliveryPersonId) return;

  // 1. Calcular tempo de entrega
  const deliveryTime = (request.deliveredAt - request.acceptedAt) / 60000; // minutos
  const wasOnTime = deliveryTime <= (request.estimatedTime ?? 60);

  // 2. Atualizar DeliveryProfile
  const profile = await prisma.deliveryProfile.findUnique({
    where: { profileId: request.deliveryPersonId }
  });

  const newTotal = profile.totalDeliveries + 1;
  const newCompleted = profile.completedDeliveries + 1;
  const newAvgTime =
    (profile.avgDeliveryTime * profile.completedDeliveries + deliveryTime) / newCompleted;
  const newOnTimeRate =
    ((profile.onTimeRate * profile.completedDeliveries) + (wasOnTime ? 100 : 0)) / newCompleted;

  await prisma.deliveryProfile.update({
    where: { profileId: request.deliveryPersonId },
    data: {
      totalDeliveries: newTotal,
      completedDeliveries: newCompleted,
      avgDeliveryTime: newAvgTime,
      onTimeRate: newOnTimeRate,
      totalDistance: profile.totalDistance + (request.distance ?? 0),
      totalEarnings: profile.totalEarnings + request.deliveryFeeBzr
    }
  });

  // 3. Se for entrega de loja vinculada, atualizar StoreDeliveryPartner
  if (request.senderType === 'store') {
    const partnership = await prisma.storeDeliveryPartner.findUnique({
      where: {
        storeId_deliveryPersonId: {
          storeId: request.senderId, // deve ser onChainStoreId
          deliveryPersonId: request.deliveryPersonId
        }
      }
    });

    if (partnership) {
      await prisma.storeDeliveryPartner.update({
        where: { id: partnership.id },
        data: {
          totalDeliveries: partnership.totalDeliveries + 1,
          completedDeliveries: partnership.completedDeliveries + 1
          // avgRating, avgDeliveryTime também podem ser atualizados
        }
      });
    }
  }
}
```

---

## 6. INTEGRAÇÕES

### 6.1 Integração com Sistema de Orders

**Pontos de Integração:**

1. **POST /orders** → Criar DeliveryRequest
2. **DeliveryRequest.pickup** → Atualizar Order.status = "SHIPPED"
3. **DeliveryRequest.deliver** → Atualizar Order.status = "RELEASED" (opcional, pode exigir confirmação)

---

### 6.2 Integração com BazChat

**Criar Thread Automático:**

Quando DeliveryRequest é aceito, criar ChatThread:

```typescript
async function createDeliveryThread(deliveryRequestId: string) {
  const request = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId }
  });

  const participants = [
    request.senderId, // loja
    request.recipientId, // comprador
    request.deliveryPersonId // entregador
  ].filter(Boolean);

  await prisma.chatThread.create({
    data: {
      kind: 'delivery',
      participants,
      metadata: {
        deliveryRequestId: request.id,
        orderId: request.orderId
      },
      lastMessageAt: BigInt(Date.now()),
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now())
    }
  });
}
```

---

### 6.3 Integração com Blockchain (Escrow)

**Criar Escrow ao Aceitar Entrega:**

```typescript
async function createDeliveryEscrow(deliveryRequestId: string) {
  const request = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId }
  });

  const config = getPaymentsConfig();

  // Criar PaymentIntent para a entrega
  const paymentIntent = await prisma.paymentIntent.create({
    data: {
      orderId: request.orderId ?? null, // pode ser null se sourceType = 'direct'
      amountBzr: request.deliveryFeeBzr,
      escrowAddress: config.escrowAddress,
      status: 'PENDING'
    }
  });

  await prisma.deliveryRequest.update({
    where: { id: deliveryRequestId },
    data: {
      escrowAddress: config.escrowAddress
    }
  });

  return paymentIntent;
}
```

**Liberar Escrow ao Entregar:**

```typescript
async function releaseDeliveryEscrow(deliveryRequestId: string) {
  const request = await prisma.deliveryRequest.findUnique({
    where: { id: deliveryRequestId }
  });

  // Buscar PaymentIntent (ou criar lógica similar)
  // Executar extrinsic on-chain para liberar fundos

  // MOCK: Apenas registrar log
  await prisma.escrowLog.create({
    data: {
      orderId: request.orderId ?? null,
      kind: 'DELIVERY_RELEASE',
      payloadJson: {
        deliveryRequestId: request.id,
        deliveryPersonId: request.deliveryPersonId,
        amount: request.deliveryFeeBzr.toString(),
        releasedAt: new Date().toISOString()
      }
    }
  });

  await prisma.deliveryRequest.update({
    where: { id: deliveryRequestId },
    data: {
      releaseTxHash: 'MOCK_TX_HASH', // TODO: real tx hash
      completedAt: BigInt(Date.now())
    }
  });
}
```

---

## 7. SEGURANÇA

### 7.1 Autenticação e Autorização

**Permissões por Endpoint:**

| Endpoint | Requer Auth | Roles/Checks |
|----------|-------------|--------------|
| GET /delivery/requests | ✅ | DeliveryProfile existe e isAvailable=true |
| POST /delivery/requests/:id/accept | ✅ | DeliveryProfile existe, não é o sender |
| POST /delivery/requests/:id/pickup | ✅ | Ser o deliveryPersonId |
| POST /delivery/requests/:id/deliver | ✅ | Ser o deliveryPersonId |
| POST /delivery/requests/:id/cancel | ✅ | Ser deliveryPersonId, senderId ou recipientId |
| POST /delivery/profile | ✅ | Usuário logado |
| POST /stores/:id/delivery-partners/request | ✅ | DeliveryProfile existe |
| PATCH /stores/:id/delivery-partners/:pid | ✅ | Ser owner da loja |

---

### 7.2 Validações de Dados

**Endereços:**
```typescript
const addressSchema = z.object({
  street: z.string().min(1).max(200),
  number: z.string().max(20),
  complement: z.string().max(100).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2), // "RJ", "SP"
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/), // "12345-678" ou "12345678"
  country: z.string().default('BR'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  contactName: z.string().max(100).optional(),
  contactPhone: z.string().max(20).optional()
});
```

**Package Type:**
```typescript
const packageTypeEnum = z.enum([
  'envelope',
  'small_box',
  'medium_box',
  'large_box',
  'fragile',
  'perishable',
  'custom'
]);
```

---

### 7.3 Rate Limiting

**Sugestões:**
- GET /delivery/requests: 60 req/min
- POST /delivery/requests/:id/accept: 10 req/min (evitar spam)
- POST /delivery/profile: 5 req/min
- PATCH /delivery/profile/availability: 120 req/min (alta frequência)

---

### 7.4 Proteção Contra Fraudes

**Verificações:**
1. **Anti-fraude de localização:** Validar que pickup foi feito próximo ao pickupAddress
2. **Anti-fraude de tempo:** Delivery muito rápida (< 5min para 10km) é suspeita
3. **Limite de cancelamentos:** Entregador com >30% cancelamentos → suspensão
4. **Verificação de documentos:** CPF/CNH antes de aprovar conta

---

## 8. PERFORMANCE

### 8.1 Índices Críticos

**Já definidos nos models:**
```sql
-- DeliveryRequest
CREATE INDEX idx_delivery_status ON DeliveryRequest(status);
CREATE INDEX idx_delivery_sender ON DeliveryRequest(senderId, senderType);
CREATE INDEX idx_delivery_person ON DeliveryRequest(deliveryPersonId);
CREATE INDEX idx_delivery_created ON DeliveryRequest(createdAt);

-- DeliveryProfile
CREATE INDEX idx_profile_available ON DeliveryProfile(isAvailable, isOnline);
CREATE INDEX idx_profile_radius ON DeliveryProfile(serviceRadius);

-- StoreDeliveryPartner
CREATE INDEX idx_partner_store_status ON StoreDeliveryPartner(storeId, status);
CREATE INDEX idx_partner_priority ON StoreDeliveryPartner(priority);
```

---

### 8.2 Caching

**Estratégias:**
1. **Cache de cálculo de frete:** Key = `fee:${pickupZip}:${deliveryZip}:${packageType}` (TTL: 1h)
2. **Cache de entregadores disponíveis:** Key = `deliverers:available:${city}` (TTL: 1min)
3. **Cache de parceiros de loja:** Key = `partners:${storeId}:active` (TTL: 5min)

---

### 8.3 Workers

**delivery-notifier.worker.ts:**
- Processa fila de notificações
- Envia push notifications
- Atualiza lista de notifiedDeliverers

**delivery-metrics.worker.ts:**
- Recalcula métricas agregadas a cada 10min
- Atualiza rankings de entregadores
- Sincroniza reputação on-chain

**delivery-timeout.worker.ts:**
- Monitora entregas vencidas (expiresAt passou)
- Envia alertas para loja/comprador
- Auto-cancela se ninguém aceitou em 24h

---

## 9. TESTES

### 9.1 Testes Unitários

**Arquivo:** `apps/api/src/lib/deliveryCalculator.test.ts`

```typescript
describe('calculateDeliveryFee', () => {
  test('should calculate base fee correctly', () => {
    const fee = calculateDeliveryFee({
      distance: 5.0,
      packageType: 'small_box',
      weight: 1.0
    });
    expect(fee.baseFee).toBe(5.00);
    expect(fee.distanceFee).toBe(5.00);
    expect(fee.total).toBe(11.00);
  });

  test('should add weight surcharge for heavy packages', () => {
    const fee = calculateDeliveryFee({
      distance: 5.0,
      packageType: 'large_box',
      weight: 5.0
    });
    expect(fee.weightFee).toBe(2.00); // (5 - 1) * 0.5
  });
});
```

---

### 9.2 Testes de Integração

**Arquivo:** `apps/api/src/routes/delivery.test.ts`

```typescript
describe('POST /delivery/requests/:id/accept', () => {
  test('should accept delivery and create escrow', async () => {
    const deliverer = await createTestDeliveryProfile();
    const request = await createTestDeliveryRequest();

    const response = await app.inject({
      method: 'POST',
      url: `/delivery/requests/${request.id}/accept`,
      headers: { authorization: `Bearer ${deliverer.token}` }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().deliveryRequest.status).toBe('accepted');
  });

  test('should reject if already assigned', async () => {
    // ... teste de race condition
  });
});
```

---

### 9.3 Testes E2E

**Cenário: Entrega Completa**
```typescript
test('Complete delivery flow', async () => {
  // 1. Cliente cria order
  const order = await createOrder();

  // 2. DeliveryRequest criado automaticamente
  const delivery = await getDeliveryByOrderId(order.id);
  expect(delivery).toBeDefined();

  // 3. Entregador aceita
  await acceptDelivery(delivery.id, deliverer);

  // 4. Coleta
  await pickup(delivery.id, deliverer);
  const orderAfterPickup = await getOrder(order.id);
  expect(orderAfterPickup.status).toBe('SHIPPED');

  // 5. Entrega
  await deliver(delivery.id, deliverer);
  const finalDelivery = await getDelivery(delivery.id);
  expect(finalDelivery.status).toBe('delivered');

  // 6. Verificar pagamento
  expect(finalDelivery.releaseTxHash).toBeTruthy();
});
```

---

## 10. DEPLOYMENT

### 10.1 Migrations

**Ordem de Execução:**
```bash
# 1. Adicionar campos a SellerProfile
npx prisma migrate dev --name add_pickup_address_to_seller_profile

# 2. Adicionar relações a Profile e Order
npx prisma migrate dev --name add_delivery_relations

# 3. Criar novos models
npx prisma migrate dev --name create_delivery_network_models

# 4. Popular dados iniciais (seeds)
npx tsx apps/api/scripts/seedDeliveryCategories.ts
```

---

### 10.2 Variáveis de Ambiente

**Adicionar ao `.env`:**
```env
# Delivery Settings
DELIVERY_BASE_FEE_BZR=5.00
DELIVERY_PER_KM_BZR=1.00
DELIVERY_WEIGHT_MULTIPLIER=0.50
DELIVERY_TIMEOUT_PRIVATE_MS=120000  # 2 minutos
DELIVERY_TIMEOUT_PUBLIC_MS=86400000 # 24 horas

# Notifications
DELIVERY_NOTIFICATION_ENABLED=true
PUSH_NOTIFICATION_SERVICE_URL=https://push.bazari.com
```

---

### 10.3 Rollout

**Estratégia: Feature Flag**

```typescript
// apps/api/src/config/features.ts
export const features = {
  deliveryNetwork: env.FEATURE_DELIVERY_NETWORK === 'true',
  autoCreateDelivery: env.FEATURE_AUTO_CREATE_DELIVERY === 'true'
};

// Em orders.ts
if (features.autoCreateDelivery && body.shippingAddress) {
  await createDeliveryRequestForOrder(order.id);
}
```

**Fases:**
1. **Beta (semana 1):** Feature flag OFF, apenas testes internos
2. **Soft Launch (semana 2):** Habilitar para 10% dos pedidos
3. **Full Launch (semana 3):** 100% dos pedidos

---

## 11. MONITORAMENTO

### 11.1 Métricas Chave

**Operacionais:**
- Taxa de aceitação de entregas (geral e por cidade)
- Tempo médio de aceite (privado vs público)
- Tempo médio de entrega
- Taxa de cancelamentos
- Taxa de sucesso (delivered / created)

**Negócio:**
- Volume de entregas/dia
- Receita de frete (BZR)
- Número de entregadores ativos
- NPS de entregadores e destinatários

**Técnicos:**
- Latência do endpoint `/delivery/requests` (p50, p95, p99)
- Taxa de erro 500 em APIs de delivery
- Tempo de criação de DeliveryRequest (após Order)

---

### 11.2 Alertas

**Configurar alertas para:**
- Taxa de erro > 5% em qualquer endpoint de delivery
- Tempo de aceite médio > 10min (rede não está respondendo)
- Taxa de cancelamento > 20% (problema com entregadores)
- Nenhuma entrega criada em 1h (integração quebrada)

---

## 12. ROADMAP FUTURO

### Fase 2 (Pós-MVP)
- [ ] Tracking GPS em tempo real
- [ ] Integração com Google Maps API (rotas otimizadas)
- [ ] Chat in-app com entregador
- [ ] Foto obrigatória na entrega
- [ ] Assinatura digital

### Fase 3 (Escalabilidade)
- [ ] Sistema de disputas automatizado
- [ ] Seguro de mercadorias
- [ ] Múltiplos pontos de coleta (multi-pickup)
- [ ] Entrega agendada (horário específico)
- [ ] Entregas recorrentes (assinatura)

### Fase 4 (Gamificação)
- [ ] Ranking público de entregadores
- [ ] Badges e conquistas
- [ ] Bônus por performance
- [ ] Challenges semanais
- [ ] Programa de fidelidade

---

## APÊNDICES

### A. Glossário

| Termo | Definição |
|-------|-----------|
| DeliveryRequest | Demanda de entrega (produto ou serviço direto) |
| Linked Deliverer | Entregador vinculado/preferencial de uma loja |
| Open Network | Rede aberta de entregadores (qualquer um pode aceitar) |
| Private Network | Rede fechada (apenas vinculados) |
| Escrow | Depósito garantido (fundos travados até entrega) |
| Proof of Delivery | Prova de entrega (assinatura, foto, etc.) |

---

### B. Referências

- [Prisma Schema Best Practices](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)
- [Fastify Performance Tips](https://www.fastify.io/docs/latest/Guides/Performance/)
- [Haversine Distance Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Escrow Smart Contracts](https://docs.substrate.io/)

---

**FIM DA ESPECIFICAÇÃO TÉCNICA**

_Última atualização: 2025-10-16_
