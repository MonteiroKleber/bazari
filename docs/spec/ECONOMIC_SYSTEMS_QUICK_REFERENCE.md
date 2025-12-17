# Bazari - Quick Reference Guide

## URLs Rápidas

### Rotas Principais
```
WALLET (client-side)
  /app/wallet                 Dashboard de saldos
  /app/wallet/accounts        Gerenciar contas
  /app/wallet/send            Enviar fundos
  /app/wallet/receive         Receber (QR code)

P2P/CÂMBIO
  /app/p2p                    Listagem de ofertas
  /app/p2p/offers/new         Criar oferta
  /app/p2p/offers/:id         Detalhe público
  /app/p2p/my-orders          Minhas órdenes
  /app/p2p/orders/:id         Sala de troca

AUTH
  /auth/nonce                 GET nonce para SIWS
  /auth/login-siws            POST login
  /auth/refresh               POST refresh token
```

---

## Modelos de Dados Críticos

### User
```typescript
{
  id: uuid,
  address: SS58_ADDRESS,    // Identificador único
  createdAt, updatedAt
}
```

### Profile
```typescript
{
  id: uuid,
  userId: fk,
  handle: string,           // @unique
  displayName: string,
  onChainProfileId: BigInt, // NFT ID
  reputationScore: Int,
  reputationTier: string,   // bronze/silver/gold/...
  metadataCid: string       // IPFS CID
}
```

### P2POffer
```typescript
{
  id: uuid,
  ownerId: fk,
  side: BUY_BZR | SELL_BZR,
  priceBRLPerBZR: Decimal,
  minBRL, maxBRL: Decimal,
  status: ACTIVE | PAUSED | ARCHIVED
}
```

### P2POrder
```typescript
{
  id: uuid,
  offerId, makerId, takerId: fk,
  amountBZR: Decimal (18),
  amountBRL: Decimal (2),
  status: DRAFT → ... → RELEASED,
  escrowTxHash: string?,      // On-chain
  releasedTxHash: string?,    // On-chain
  expiresAt: DateTime
}
```

---

## Stack Resumido

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| State | Zustand + Jotai |
| Blockchain | Polkadot.js |
| Vault | IndexedDB |
| Backend | Fastify |
| DB | PostgreSQL + Prisma |
| IPFS | kubo-rpc-client |

---

## Conversão de Unidades

```
1 BZR = 10^12 Planck
1 Planck = 0.000000000001 BZR

Exemplo: 5 BZR = 5 * 10^12 = 5000000000000 Planck
```

---

## Criptografia

### Vault de Chaves
```
1. PIN → PBKDF2(PIN, salt, 100k iterations) → derivedKey
2. derivedKey + AES-GCM → encrypt(seed)
3. Armazenar: { address, cipher, iv, salt, iterations }
4. Usar seed → Polkadot.js sr25519 signing
5. Limpar: seed.fill(0)
```

---

## Fluxos de Estado (P2POrder)

```
DRAFT
  ↓ [POST /p2p/offers/:id/orders]
AWAITING_ESCROW
  ↓ [POST /p2p/orders/:id/escrow-confirm com txHash]
AWAITING_FIAT_PAYMENT
  ↓ [POST /p2p/orders/:id/mark-paid]
AWAITING_CONFIRMATION
  ↓ [POST /p2p/orders/:id/confirm-received]
RELEASED ✓

--- Alternativas ---
CANCELLED (de DRAFT/AWAITING_ESCROW)
EXPIRED (timeout 30min)
DISPUTE_* (em caso de conflito)
```

---

## Taxa de Reputação (Agregação)

```sql
-- Quando listing de ofertas
SELECT 
  AVG(stars) as avgStars,
  SUM(CASE WHEN status='RELEASED' THEN 1 ELSE 0 END) / 
    (SUM(CASE WHEN status IN ('CANCELLED','EXPIRED') THEN 1 ELSE 0 END) + 
     SUM(CASE WHEN status='RELEASED' THEN 1 ELSE 0 END)) 
    as completionRate,
  SUM(amountBRL) as volume30dBRL,
  SUM(amountBZR) as volume30dBZR
FROM P2POrder
WHERE makerId = :userId 
  AND createdAt >= NOW() - interval '30 days'
  AND status = 'RELEASED'
```

---

## Endpoints API (Tabela Resumida)

### Auth
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/auth/nonce` | - | Nonce para SIWS |
| POST | `/auth/login-siws` | - | Login |
| POST | `/auth/refresh` | Cookie | Refresh token |

### P2P - Ofertas
| GET | `/p2p/offers?side=SELL_BZR&minBRL=X&maxBRL=Y` | - | List público |
| GET | `/p2p/offers/:id` | - | Detail |
| GET | `/p2p/my-offers` | JWT | Minhas |
| POST | `/p2p/offers` | JWT | Criar |
| PATCH | `/p2p/offers/:id` | JWT | Editar |
| POST | `/p2p/offers/:id/toggle` | JWT | ACTIVE ↔ PAUSED |
| DELETE | `/p2p/offers/:id` | JWT | Arquivar |

### P2P - Órdenes
| POST | `/p2p/offers/:id/orders` | JWT | Criar ordem |
| GET | `/p2p/orders/:id` | JWT | Detail |
| POST | `/p2p/orders/:id/escrow-intent` | JWT | Get escrow addr |
| POST | `/p2p/orders/:id/escrow-confirm` | JWT | Confirmar escrow |
| POST | `/p2p/orders/:id/mark-paid` | JWT | Marcar pago |
| POST | `/p2p/orders/:id/confirm-received` | JWT | Confirmar recepção |
| POST | `/p2p/orders/:id/cancel` | JWT | Cancelar |
| GET | `/p2p/my-orders?status=ACTIVE` | JWT | Minhas órdenes |
| POST | `/p2p/orders/:id/review` | JWT | Avaliar |

### P2P - Chat
| GET | `/p2p/orders/:id/messages` | JWT | Histórico |
| POST | `/p2p/orders/:id/messages` | JWT | Enviar (10/60s) |

### P2P - Pagamento
| GET | `/p2p/payment-profile` | JWT | Meu perfil PIX |
| POST | `/p2p/payment-profile` | JWT | Salvar PIX |

---

## Variáveis de Ambiente Críticas

### Frontend (.env ou .env.local)
```
VITE_BAZARICHAIN_WS=ws://127.0.0.1:9944
VITE_API_BASE_URL=http://localhost:3000
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:5432/bazari
ESCROW_ACCOUNT=<SS58_ADDRESS>          # Obrigatório
MARKETPLACE_FEE_BPS=250                # 2.5% fee
IPFS_API_URLS=http://localhost:5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
BAZARICHAIN_WS=ws://127.0.0.1:9944
BAZARICHAIN_SUDO_SEED=//Alice          # Dev only
```

---

## Arquivos-Chave por Feature

### Wallet
```
Frontend:
  apps/web/src/modules/wallet/
    ├── pages/SendPage.tsx
    ├── pages/ReceivePage.tsx
    ├── pages/WalletDashboard.tsx
    ├── services/balances.ts
    ├── services/history.ts
    └── services/polkadot.ts

Backend:
  (nenhum - totalmente client-side)
```

### P2P
```
Frontend:
  apps/web/src/modules/p2p/
    ├── api.ts
    ├── pages/P2PHomePage.tsx
    └── pages/P2POrderRoomPage.tsx

Backend:
  apps/api/src/routes/
    ├── p2p.offers.ts
    ├── p2p.orders.ts
    ├── p2p.paymentProfile.ts
    └── p2p.messages.ts
```

### Auth
```
Frontend:
  apps/web/src/modules/auth/
    ├── crypto.store.ts    [Vault IndexedDB]
    ├── useKeyring.ts      [Polkadot.js]
    └── siws.ts

Backend:
  apps/api/src/
    ├── lib/auth/verifySiws.ts
    ├── lib/auth/jwt.ts
    ├── routes/auth.ts
    └── lib/profilesChain.ts [NFT minting]
```

---

## Security Checklist

- [ ] PIN obrigatório para transações
- [ ] Nonce não-reutilizável (usedAt check)
- [ ] Refresh token rotativo
- [ ] Rate limit: 5 nonces/address/5min
- [ ] Rate limit: 10 mensagens P2P/60s
- [ ] Chaves zeradas após uso (fill(0))
- [ ] Seed descriptografada apenas em memória
- [ ] PBKDF2 100k iterações mínimo

---

## Troubleshooting

### Wallet não conecta ao node
```
1. Verificar VITE_BAZARICHAIN_WS
2. node deve estar rodando em ws://127.0.0.1:9944
3. Verificar conexão: wscat -c ws://127.0.0.1:9944
```

### Login falha com SIWS
```
1. Verificar seed é válida: validateMnemonic()
2. Verificar derivação de address: deriveAddress()
3. Verificar nonce não expirou (10 min max)
```

### P2P order trava em escrow
```
1. Verificar tx foi mined: api.rpc.chain.getBlock(txHash)
2. Verificar valor é suficiente (amount + fees)
3. Verificar escrowAddress é válida
```

### IPFS upload falha
```
1. Verificar IPFS_API_URLS está acessível
2. Fallback: gateway IPFS_GATEWAY_URL
3. Verificar timeout IPFS_TIMEOUT_MS (default 30s)
```

---

## Ferramentas Úteis

### Testing P2P via cURL
```bash
# Get nonce
curl http://localhost:3000/auth/nonce?address=5Fd...

# List offers
curl http://localhost:3000/p2p/offers

# Create offer (com JWT token)
curl -H "Authorization: Bearer $TOKEN" \
  -X POST http://localhost:3000/p2p/offers \
  -d '{"side":"SELL_BZR","priceBRLPerBZR":5,...}'
```

### Monitorar blockchain
```bash
# WebSocket
wscat -c ws://127.0.0.1:9944

# RPC
curl -X POST http://127.0.0.1:9933 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"system_name"}'
```

### Prisma
```bash
# Migrate
npx prisma migrate dev

# Studio (GUI)
npx prisma studio

# Generate client
npx prisma generate
```

---

## Recursos Adicionais

| Arquivo | Descrição |
|---------|-----------|
| ECONOMIC_SYSTEMS_MAPPING.md | Documentação completa (36 KB) |
| docs/QA_P2P.md | Roteiro de testes P2P |
| docs/especificacao/testes/wallet/ | Testes de wallet |
| apps/api/prisma/schema.prisma | Modelos de dados |

---

**Última atualização:** 26 de outubro de 2025  
**Versão:** 1.0
