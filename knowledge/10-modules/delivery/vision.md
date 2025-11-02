# Delivery Module - Vision & Purpose

## 🎯 Vision
**"Criar marketplace P2P de entregas descentralizado, onde lojas e usuários conectam-se diretamente com entregadores autônomos, com taxas transparentes, rastreamento on-chain e redes privadas de parceiros."**

## 📋 Purpose
1. **P2P Delivery Matching** - Conectar remetentes e entregadores diretamente
2. **Dynamic Fee Calculation** - Cálculo automático baseado em distância, peso, tipo de pacote
3. **Private Delivery Networks** - Lojas podem ter rede de entregadores vinculados (preferredDeliverers)
4. **Delivery Profiles** - Entregadores com capacidades, veículos, disponibilidade
5. **Status Tracking** - Ciclo completo: pending → assigned → picked_up → delivered
6. **Auto-Creation from Orders** - DeliveryRequest criado automaticamente ao criar Order

## 🌟 Key Principles
- **Gig Economy** - Entregadores autônomos (não empregados)
- **Transparency** - Taxas calculadas via fórmula pública (base + distance + weight + type)
- **Trust Network** - Lojas podem criar rede privada de entregadores de confiança
- **On-Chain Reputation** - Entregas concluídas geram eventos on-chain
- **Geo-Aware** - Coordenadas ou CEP para cálculo de distância
- **Capacity Matching** - Entregador deve suportar peso/volume/tipo do pacote

## 🏗️ Architecture
```
Order (shippingAddress) → DeliveryRequest (pending)
                              ↓
                 Match with DeliveryProfile (capacities)
                              ↓
                 Delivery Person accepts → Status: accepted
                              ↓
                 Pickup → picked_up → in_transit → delivered
                              ↓
                 Reputation event emitted on-chain
```

## 📊 Delivery Status Flow
```
pending → assigned → accepted → picked_up → in_transit → delivered → completed
   ↓         ↓          ↓           ↓
cancelled  expired  rejected    failed
```

## 💰 Fee Calculation Formula
```
baseFee = env.DELIVERY_BASE_FEE_BZR (default: 10 BZR)
distanceFee = distance * env.DELIVERY_FEE_PER_KM_BZR (default: 0.5 BZR/km)
weightFee = max(0, weight - FREE_WEIGHT) * WEIGHT_FEE_PER_KG (default: 1 BZR/kg)
packageTypeFee = PACKAGE_TYPE_FEES[packageType]

totalBzr = baseFee + distanceFee + weightFee + packageTypeFee
```

**Example:**
- Distance: 10 km
- Weight: 3 kg
- Package type: medium_box (+2 BZR)
- Total: 10 + (10 * 0.5) + (2 * 1) + 2 = **19 BZR**

## 📦 Package Types
- **envelope** - Documentos, cartas (+0 BZR)
- **small_box** - Caixas pequenas (+1 BZR)
- **medium_box** - Caixas médias (+2 BZR)
- **large_box** - Caixas grandes (+4 BZR)
- **fragile** - Itens frágeis (+3 BZR)
- **perishable** - Perecíveis (+2.5 BZR)
- **custom** - Customizado (+2 BZR)

## 🚗 Vehicle Types & Capacities
- **bike** - Max: 5 kg, 0.05 m³
- **motorcycle** - Max: 20 kg, 0.2 m³
- **car** - Max: 100 kg, 0.5 m³
- **van** - Max: 300 kg, 2.0 m³
- **truck** - Max: 1000 kg, 10.0 m³

## 🔐 Private Delivery Networks
Lojas podem criar rede privada de entregadores:

```typescript
{
  "preferredDeliverers": ["profile_id_1", "profile_id_2"],
  "isPrivateNetwork": true // Só entregadores da lista podem ver
}
```

**Benefits:**
- Trust: Entregadores conhecidos e verificados
- Priority: Entregadores preferenciais notificados primeiro
- Exclusivity: Request visível apenas para a rede (se `isPrivateNetwork=true`)

## 🌍 Geolocation Strategy
1. **Coordenadas diretas** (lat/lng) - Precisão máxima
2. **CEP lookup** - Estima coordenadas via `estimateCoordinatesFromZipCode()`
3. **City/State fallback** - Distância aproximada por município

## 🔮 Future Features
1. **Real-Time Tracking** - GPS tracking via WebSocket
2. **Proof of Delivery** - Foto + assinatura digital on-chain
3. **Dispute Resolution** - DAO arbitration para problemas
4. **Batch Deliveries** - Entregador pega múltiplos pedidos na mesma rota
5. **Dynamic Pricing** - Surge pricing em horários de pico
6. **Insurance Integration** - Seguro automático via oracles

**Status:** ✅ Implemented & Production-Ready
