# API P2P ZARI - Documentação

**Versão**: 1.0
**Base URL**: `https://bazari.libervia.xyz/api`
**Autenticação**: Bearer Token (JWT)

---

## 📋 Índice

1. [Fase ZARI](#fase-zari)
2. [Ofertas ZARI](#ofertas-zari)
3. [Ordens ZARI](#ordens-zari)
4. [Escrow Multi-Asset](#escrow-multi-asset)

---

## 🏛️ Fase ZARI

### GET /p2p/zari/phase

Retorna informações da fase ZARI ativa no momento.

**Autenticação**: Não requerida

**Response**:
```json
{
  "phase": "2A",
  "priceBZR": "250000000000",
  "supplyLimit": "2100000000000000000",
  "supplySold": "12600000000000000000",
  "supplyRemaining": "0",
  "progressPercent": 100,
  "isActive": false,
  "nextPhase": "2B"
}
```

**Campos**:
- `phase`: Fase atual ('2A', '2B', ou '3')
- `priceBZR`: Preço em planck (10^12)
- `supplyLimit`: Limite de supply da fase em planck
- `supplySold`: Quantidade já vendida em planck
- `supplyRemaining`: Supply restante em planck
- `progressPercent`: Progresso 0-100%
- `isActive`: Se ainda há supply disponível
- `nextPhase`: Próxima fase ou null

---

### GET /p2p/zari/stats

Retorna estatísticas gerais de vendas ZARI.

**Autenticação**: Não requerida

**Response**:
```json
{
  "phases": [
    {
      "phase": "2A",
      "priceBZR": "0.25",
      "supplyLimit": "2100000000000000000",
      "active": true,
      "startBlock": null,
      "endBlock": null
    }
  ],
  "activePhase": "2A",
  "totalSold": "12600000000000000000",
  "totalP2PSupply": "6300000000000000000",
  "overallProgress": 200,
  "completedOrders": 0
}
```

---

### POST /p2p/zari/phase/transition

Transiciona para próxima fase ZARI.

**Autenticação**: Requerida (Admin)

**Response**:
```json
{
  "message": "Phase transition successful",
  "newPhase": {
    "phase": "2B",
    "priceBZR": "350000000000",
    "supplyLimit": "2100000000000000000"
  }
}
```

**Errors**:
- `400`: Não há próxima fase disponível
- `403`: Usuário não é admin

---

## 💰 Ofertas ZARI

### POST /p2p/offers (ZARI)

Criar oferta para vender ZARI por BRL (PIX).

**Autenticação**: Requerida

**Request**:
```json
{
  "assetType": "ZARI",
  "amountZARI": 1000,
  "minBRL": 50,
  "maxBRL": 500,
  "method": "PIX",
  "autoReply": "Resposta automática opcional"
}
```

**Validações**:
- `assetType` deve ser "ZARI"
- `amountZARI`: 1 a 1,000,000
- `minBRL` ≤ `maxBRL`
- Usuário deve ter PIX configurado
- Fase ZARI deve estar ativa
- Supply disponível suficiente

**Response**:
```json
{
  "id": "offer_123",
  "ownerId": "user_abc",
  "assetType": "ZARI",
  "assetId": "1",
  "phase": "2A",
  "phasePrice": "250000000000",
  "priceBRLPerUnit": "0.25",
  "minBRL": "50",
  "maxBRL": "500",
  "status": "ACTIVE",
  "createdAt": "2025-10-28T10:00:00.000Z"
}
```

**Errors**:
- `400`: Validação falhou
- `400`: "No active ZARI phase"
- `400`: "Phase 2A is sold out"
- `400`: "Insufficient supply"
- `401`: Não autenticado

---

### GET /p2p/offers?assetType=ZARI

Listar ofertas ZARI ativas.

**Autenticação**: Não requerida

**Query Params**:
- `assetType=ZARI` (obrigatório para filtrar ZARI)
- `phase`: '2A', '2B', ou '3' (opcional)
- `minBRL`: Valor mínimo (opcional)
- `maxBRL`: Valor máximo (opcional)
- `cursor`: Paginação (opcional)
- `limit`: Limite de resultados (default: 20, max: 100)

**Response**:
```json
{
  "items": [
    {
      "id": "offer_123",
      "assetType": "ZARI",
      "phase": "2A",
      "priceBRLPerUnit": "0.25",
      "minBRL": "50",
      "maxBRL": "500",
      "owner": {
        "userId": "user_abc",
        "handle": "@seller",
        "displayName": "Seller Name"
      },
      "ownerStats": {
        "avgStars": 4.8,
        "completionRate": 0.95,
        "volume30dBRL": 10000
      }
    }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOi..."
}
```

---

## 🛒 Ordens ZARI

### POST /p2p/offers/:id/orders (ZARI)

Criar ordem a partir de oferta ZARI.

**Autenticação**: Requerida

**Request**:
```json
{
  "amountZARI": 500
}
```

OU

```json
{
  "amountBRL": 125
}
```

**Validações**:
- Valor dentro dos limites da oferta (minBRL/maxBRL)
- Supply disponível na fase
- Fase ativa

**Response**:
```json
{
  "id": "order_456",
  "offerId": "offer_123",
  "makerId": "user_abc",
  "takerId": "user_xyz",
  "assetType": "ZARI",
  "assetId": "1",
  "phase": "2A",
  "priceBRLPerUnit": "0.25",
  "amountAsset": "500",
  "amountBRL": "125",
  "status": "AWAITING_ESCROW",
  "expiresAt": "2025-10-28T11:00:00.000Z"
}
```

**Errors**:
- `400`: Valor fora dos limites
- `400`: Supply insuficiente
- `400`: Fase não ativa

---

### GET /p2p/orders/:id

Obter detalhes da ordem.

**Autenticação**: Requerida (maker ou taker)

**Response**:
```json
{
  "id": "order_456",
  "assetType": "ZARI",
  "amountAsset": "500",
  "amountBRL": "125",
  "status": "AWAITING_ESCROW",
  "makerProfile": { ... },
  "takerProfile": { ... }
}
```

---

### POST /p2p/orders/:id/escrow-intent

Obter instruções para escrow.

**Autenticação**: Requerida

**Response (ZARI)**:
```json
{
  "escrowAddress": "5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z",
  "assetType": "ZARI",
  "assetId": "1",
  "amountZARI": "500.000000000000",
  "note": "Use assets.transfer_keep_alive com asset_id=1 para enviar ZARI ao escrow"
}
```

---

## 🔒 Escrow Multi-Asset

### POST /p2p/orders/:id/escrow-lock

Executar lock de BZR/ZARI no escrow (backend executa TX).

**Autenticação**: Requerida (apenas maker)

**Request**:
```json
{
  "makerAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
}
```

**Validações**:
- Apenas maker pode executar
- Order deve estar em `AWAITING_ESCROW`

**Response**:
```json
{
  "success": true,
  "txHash": "0x123abc...",
  "blockNumber": "8719",
  "amount": "500000000000000",
  "assetType": "ZARI",
  "message": "ZARI locked in escrow successfully"
}
```

**Side Effects**:
- Order status → `AWAITING_FIAT_PAYMENT`
- `escrowTxHash` registrado
- `escrowAt` timestamp atualizado
- Mensagem de sistema criada

**Errors**:
- `403`: Apenas maker pode executar lock
- `400`: Estado inválido
- `500`: TX blockchain falhou

---

### POST /p2p/orders/:id/mark-paid

Taker marca pagamento PIX como feito.

**Autenticação**: Requerida (apenas taker/payer)

**Request**:
```json
{
  "proofUrls": [
    "https://storage.bazari.xyz/proof_123.jpg"
  ],
  "note": "Paguei via PIX chave ABC"
}
```

**Response**:
```json
{
  "id": "order_456",
  "status": "AWAITING_CONFIRMATION",
  "payerDeclaredAt": "2025-10-28T10:30:00.000Z"
}
```

---

### POST /p2p/orders/:id/escrow-release

Executar release de BZR/ZARI do escrow para o taker.

**Autenticação**: Requerida (apenas maker/receiver)

**Request**:
```json
{
  "takerAddress": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
}
```

**Validações**:
- Apenas quem recebeu BRL pode liberar
- Order deve estar em `AWAITING_CONFIRMATION`
- Deve ter escrow prévio (`escrowTxHash` presente)

**Response**:
```json
{
  "success": true,
  "txHash": "0x456def...",
  "blockNumber": "8720",
  "amount": "500000000000000",
  "assetType": "ZARI",
  "recipient": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  "message": "ZARI released from escrow successfully"
}
```

**Side Effects**:
- Order status → `RELEASED`
- `releasedTxHash` registrado
- `releasedAt` timestamp atualizado
- Reputação on-chain atualizada
- Mensagem de sistema criada

**Errors**:
- `403`: Apenas receiver pode liberar
- `400`: Estado inválido
- `500`: TX blockchain falhou

---

## 🔐 Autenticação

Todas as rotas marcadas como "Requerida" necessitam de Bearer Token no header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ❌ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Validação falhou |
| 401 | Unauthorized - Token inválido/ausente |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error - Erro do servidor |

**Formato de Erro**:
```json
{
  "error": "ErrorCode",
  "message": "Descrição do erro"
}
```

---

## 📊 Fluxo Completo P2P ZARI

```
1. Maker: POST /p2p/offers
   → Oferta criada (ACTIVE)

2. Taker: POST /p2p/offers/:id/orders
   → Ordem criada (AWAITING_ESCROW)

3. Maker: POST /p2p/orders/:id/escrow-lock
   → ZARI travado (AWAITING_FIAT_PAYMENT)

4. Taker: Faz PIX off-chain
   Taker: POST /p2p/orders/:id/mark-paid
   → Comprovante enviado (AWAITING_CONFIRMATION)

5. Maker: Confirma recebimento PIX
   Maker: POST /p2p/orders/:id/escrow-release
   → ZARI liberado para taker (RELEASED) ✅
```

---

## 🧪 Exemplos de Uso

### Criar Oferta ZARI

```bash
curl -X POST https://bazari.libervia.xyz/api/p2p/offers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetType": "ZARI",
    "amountZARI": 1000,
    "minBRL": 50,
    "maxBRL": 500,
    "method": "PIX"
  }'
```

### Criar Ordem ZARI

```bash
curl -X POST https://bazari.libervia.xyz/api/p2p/offers/offer_123/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountZARI": 500
  }'
```

### Executar Lock

```bash
curl -X POST https://bazari.libervia.xyz/api/p2p/orders/order_456/escrow-lock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "makerAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  }'
```

---

*Documentação gerada em: 28/Out/2025*
*Versão API: 1.0*
