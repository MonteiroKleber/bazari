# Orders Module - Vision & Purpose

## 🎯 Vision
**"Processar pedidos com escrow on-chain, garantindo segurança transacional para compradores e vendedores através de pagamentos transparentes e disputas arbitradas."**

## 📋 Purpose
1. **Order Management** - Criar e gerenciar ciclo de vida de pedidos
2. **Escrow Payment** - Pagamentos seguros via escrow blockchain
3. **Multi-Item Orders** - Múltiplos produtos/serviços por pedido
4. **Payment Intents** - Tracking de pagamentos e liberações
5. **Fee Calculation** - Taxa de marketplace (BPS) automática
6. **Reputation Integration** - Atualiza reputação on-chain após conclusão

## 🌟 Key Principles
- **Buyer Protection** - Fundos em escrow até confirmação de entrega
- **Seller Fairness** - Release automático ou manual com fee transparente
- **Atomic Orders** - 1 vendedor por pedido (MVP constraint)
- **Idempotency** - Prevenção de duplicação via Idempotency-Key header
- **Transparent Fees** - Fee BPS configurável (default: 250 = 2.5%)

## 🏗️ Architecture
```
Order Creation → PaymentIntent → Escrow Lock → Shipping → Release/Refund
     ↓               ↓              ↓            ↓           ↓
  OrderItem    EscrowAddress   ESCROWED     SHIPPED    RELEASED
                                                          ↓
                                                    Reputation++
```

## 📊 Order Status Flow
```
CREATED → PENDING → ESCROWED → SHIPPED → RELEASED
    ↓         ↓         ↓          ↓
CANCELLED  TIMEOUT  REFUNDED   TIMEOUT
```

## 💰 Payment Flow
1. Buyer creates Order (status: CREATED)
2. System generates PaymentIntent with escrow address
3. Buyer sends funds to escrow (status: ESCROWED)
4. Seller ships (status: SHIPPED)
5. Buyer confirms or timeout → Release funds
6. Fee deducted: `netAmount = grossAmount * (1 - feeBps/10000)`
7. Reputation event emitted on-chain

## 🔐 Escrow Mechanics
- **Escrow Address**: Generated per payment intent
- **Fee Calculation**: `fee = amount * feeBps / 10000` (BPS)
- **Release**: `netToSeller = amount - fee`, `feeToMarketplace = fee`
- **Refund**: Full amount returned to buyer (no fee)
- **Logs**: All escrow operations logged in EscrowLog

## 🚚 Delivery Integration
- Auto-creates DeliveryRequest if `shippingAddress` present
- Calculates delivery fee via `deliveryCalculator`
- Estimates package details from order items
- Links Order ↔ DeliveryRequest (1:1)

## 🔮 Future Features
1. **Dispute Resolution** - On-chain arbitration via DAO
2. **Partial Refunds** - Refund individual items
3. **Multi-Vendor Orders** - Remove 1 seller constraint
4. **Escrow Automation** - Smart contract auto-release after timeout
5. **Installment Payments** - Split payments over time

**Status:** ✅ Implemented & Production-Ready
