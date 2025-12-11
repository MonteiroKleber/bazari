# FASE 1: Schema Prisma e Migrations - Bazari Delivery Network

**Objetivo:** Criar a base de dados para o sistema de delivery network

**Duração Estimada:** 2-3 horas

**Contexto:** Leia primeiro a especificação técnica completa em `/home/bazari/bazari/docs/ESPECIFICACAO_TECNICA_DELIVERY_NETWORK.md`

---

## TAREFAS

### 1. Adicionar Models ao Schema Prisma

**Arquivo:** `apps/api/prisma/schema.prisma`

**Adicionar os seguintes models ao final do arquivo:**

```prisma
// ===========================
// DELIVERY NETWORK (FASE 1)
// ===========================

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
  commissionPercent Int      @default(100) // % do deliveryFeeBzr que vai para o entregador
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

---

### 2. Atualizar Model Profile (adicionar relações)

**Localizar o model `Profile` e adicionar no final (antes do fechamento):**

```prisma
  // === Delivery Relations ===
  deliveryProfile         DeliveryProfile?
  deliveryRequestsAsDeliverer DeliveryRequest[] @relation("DeliveryPerson")
  storePartnerships       StoreDeliveryPartner[] @relation("StoreDeliveryPartner")
```

---

### 3. Atualizar Model Order (adicionar relação)

**Localizar o model `Order` e adicionar no final (antes do fechamento):**

```prisma
  // === Delivery Relation ===
  deliveryRequest   DeliveryRequest?
```

---

### 4. Atualizar Model SellerProfile (adicionar campo de endereço)

**Localizar o model `SellerProfile` e adicionar após os campos de sincronização:**

```prisma
  // === Address for Pickup ===
  pickupAddress     Json? // { street, number, complement?, city, state, zipCode, lat?, lng?, instructions? }
```

---

### 5. Criar Migration

**Executar:**

```bash
cd apps/api
npx prisma migrate dev --name create_delivery_network_models
```

**Verificar:**
- Migration criada em `apps/api/prisma/migrations/`
- Sem erros de compilação
- Database atualizada corretamente

---

### 6. Verificar Geração do Client

**Executar:**

```bash
npx prisma generate
```

**Verificar:**
- Client gerado em `node_modules/.prisma/client`
- Types TypeScript disponíveis para `DeliveryRequest`, `StoreDeliveryPartner`, `DeliveryProfile`

---

## VALIDAÇÃO

**Checklist antes de prosseguir para Fase 2:**

- [ ] Schema compilado sem erros
- [ ] Migration executada com sucesso
- [ ] Client Prisma gerado
- [ ] Novos models aparecem no Prisma Studio (`npx prisma studio`)
- [ ] Relações Profile ↔ DeliveryProfile, Profile ↔ DeliveryRequest funcionam
- [ ] Relação Order ↔ DeliveryRequest funciona
- [ ] Todos os índices foram criados no banco

**Teste Rápido (opcional):**

```bash
# Abrir Prisma Studio
npx prisma studio

# Verificar que as novas tabelas existem:
# - DeliveryRequest
# - StoreDeliveryPartner
# - DeliveryProfile
```

---

## TROUBLESHOOTING

**Erro: "Column already exists"**
- Verificar se já não existe migração anterior com esses models
- Se necessário, resetar database: `npx prisma migrate reset` (⚠️ PERDA DE DADOS!)

**Erro: "Foreign key constraint failed"**
- Verificar que os campos de referência (profileId, orderId) existem nos models referenciados
- Verificar tipos compatíveis (String → String, BigInt → BigInt)

**Erro: "Invalid relation"**
- Verificar sintaxe: `@relation("NomeRelacao", fields: [...], references: [...])`
- Verificar que relações inversas estão declaradas em ambos os models

---

## PRÓXIMA FASE

➡️ **FASE 2:** [Biblioteca de Cálculo de Frete e Helpers](FASE2_DELIVERY_CALCULATOR.md)

---

**FIM DA FASE 1**
