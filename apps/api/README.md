# 🚀 Bazari API

Backend do ecossistema Bazari - Fastify + Prisma + PostgreSQL

## 📋 Setup

### 1. Configurar variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
```

### 2. Configurar banco de dados

```bash
# Executar migrations
pnpm prisma migrate dev

# (Opcional) Seed inicial
pnpm prisma db seed
```

### 3. Iniciar desenvolvimento

```bash
pnpm dev
```

## 💳 Sistema de Pagamentos

O sistema de pagamentos utiliza uma conta escrow para processar transações do marketplace.

### Configuração

Adicione as seguintes variáveis no arquivo `.env`:

```bash
# Endereço SS58 da conta escrow (obrigatório)
ESCROW_ACCOUNT=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

# Taxa do marketplace em basis points (250 = 2.50%)
MARKETPLACE_FEE_BPS=250
```

### Endpoints

#### Configuração
- `GET /payments/config` - Retorna configuração de pagamentos

#### Orders & Payment Intents
- `POST /orders/:id/payment-intent` - Criar intent de pagamento
- `GET /orders/:id` - Buscar order com intents e logs
- `POST /orders/:id/confirm-received` - Confirmar recebimento (gera recomendação)
- `POST /orders/:id/cancel` - Cancelar order (gera recomendação)

### Operação Manual/Multisig

**Importante:** A API não assina transações automaticamente. Ela apenas:
- Valida configurações no boot
- Gera payment intents com endereço escrow
- Registra logs de solicitações (release/refund)
- Calcula valores para operação manual

#### Release de Fundos
1. User confirma recebimento via `POST /orders/:id/confirm-received`
2. API calcula splits e cria `EscrowLog` com `kind: 'RELEASE_REQUEST'`
3. Operador manual/multisig executa transação baseada na recomendação

#### Refund
1. User cancela via `POST /orders/:id/cancel`
2. API cria `EscrowLog` com `kind: 'REFUND_REQUEST'`
3. Operador manual/multisig executa refund baseado na recomendação

#### Timeout
- Worker automático marca intents antigas sem `txHashIn` como `TIMEOUT`
- Configurable via variável de ambiente ou código

### Verificação

```bash
# Testar configuração
curl http://localhost:3000/payments/config

# Resultado esperado:
{
  "escrowAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "feeBps": 250
}
```