# Correção: Validação DAO Member

**Data**: 2025-11-15
**Problema**: Validação DAO member estava usando `api.query.dao.members()` que não existe
**Solução**: Usar `api.query.council.members()` do pallet-collective

---

## 🔧 Mudanças Implementadas

### 1. Atualizado `governance.ts`
**Arquivo**: `apps/api/src/routes/blockchain/governance.ts`

**ANTES**:
```typescript
// Usava api.query.dao.members(address) - não existe
const memberData = await api.query.dao.members(authUser.address);
isMember = memberData && memberData.isSome;
```

**DEPOIS**:
```typescript
// Usa api.query.council.members() - pallet-collective
const members = await api.query.council.members();
const membersList = members.toJSON() as string[];
isMember = membersList.includes(authUser.address);
```

### 2. Atualizado `escrow.ts` - Refund Endpoint
**Arquivo**: `apps/api/src/routes/blockchain/escrow.ts`

Mesma mudança nos endpoints:
- `POST /api/blockchain/escrow/:orderId/refund` (linha 268)
- `GET /api/blockchain/escrow/urgent` (linha 498)

---

## ✅ Council Members Atuais

**Blockchain tem 4 membros cadastrados**:
```
1. 5CuCWfiraAzgSMbL8DHGTXEdF4bAg8YQMPRfuuuyGX92Nvcd (Prime)
2. 5FH9x8ATh5GZCcdP8u7X7JVBnVgR25awkzHHRiB8NK797DA4
3. 5FRYzgEb1TZweUzK5mZskTHF7URKUuDrhB3hGk7yC7qosXVQ
4. 5H6TareHcGSFrxKYKhYWoBN3USYJDhuRqAPJKLyiTip7zYuk
```

**Qualquer usuário com um desses endereços verá as features DAO:**
- ✅ Card "Admin Escrows" no Dashboard
- ✅ Link "Admin Escrows" no header dropdown
- ✅ Pode executar refunds
- ✅ Pode ver escrows urgentes

---

## 🧪 Como Testar

### 1. Verificar Endpoint (sem auth)
```bash
curl http://localhost:3000/api/blockchain/governance/is-dao-member
# Esperado: {"error":"Token de acesso ausente."}
```

### 2. Verificar com Usuário DAO Member

**No frontend**:
1. Login com um usuário que tenha um dos endereços acima
2. Abrir DevTools → Network
3. Procurar requisição para `/api/blockchain/governance/is-dao-member`
4. Verificar resposta:
   ```json
   {
     "address": "5CuCWfiraAzgSMbL8DHGTXEdF4bAg8YQMPRfuuuyGX92Nvcd",
     "isDAOMember": true
   }
   ```

**Features que devem aparecer**:
- ✅ Card "Admin Escrows" no Dashboard
- ✅ Link "Admin Escrows" no menu do header

### 3. Verificar com Usuário Normal

**No frontend**:
1. Login com usuário que NÃO é council member
2. Verificar resposta:
   ```json
   {
     "address": "5GxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXXXXXXXXXXXXXXX",
     "isDAOMember": false
   }
   ```

**Features que NÃO devem aparecer**:
- ❌ Card "Admin Escrows" oculto
- ❌ Link "Admin Escrows" oculto

---

## 📝 Como Adicionar Novos DAO Members

### Opção 1: Via Polkadot.js Apps

1. Acessar: https://polkadot.js.org/apps/
2. Conectar ao node local: `ws://127.0.0.1:9944`
3. Developer → Extrinsics
4. Selecionar: `sudo.sudo(council.setMembers([...], prime))`
5. Adicionar endereços na lista
6. Assinar com conta sudo (//Alice)

### Opção 2: Via Script

```bash
cd /root/bazari/apps/api
node --require /root/bazari/node_modules/.pnpm/tsx@4.20.5/node_modules/tsx/dist/preflight.cjs -e "
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';

async function addCouncilMember() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });

  // Setup keyring
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');

  // Get current members
  const currentMembers = await api.query.council.members();
  const membersList = currentMembers.toJSON();

  // Add new member
  const newMember = '5GxxxxxxxxxxYOUR_ADDRESS_HERExxxxxxxxxxxxx';
  const newMembers = [...membersList, newMember];

  // Set new members (requires sudo)
  const tx = api.tx.sudo.sudo(
    api.tx.council.setMembers(newMembers, membersList[0]) // Prime = primeiro membro
  );

  await tx.signAndSend(alice);
  console.log('Council member added!');

  await api.disconnect();
}

addCouncilMember().catch(console.error);
"
```

---

## 🎯 Endpoints Afetados

| Endpoint | Validação | Comportamento |
|----------|-----------|---------------|
| `GET /api/blockchain/governance/is-dao-member` | ✅ Council | Retorna true/false |
| `POST /api/blockchain/escrow/:orderId/refund` | ✅ Council | 403 se não member |
| `GET /api/blockchain/escrow/urgent` | ✅ Council | 403 se não member |

---

## 📊 Arquivos Modificados

1. **`apps/api/src/routes/blockchain/governance.ts`**
   - Linha 24-36: Mudou validação para `council.members()`

2. **`apps/api/src/routes/blockchain/escrow.ts`**
   - Linha 268-279: Refund endpoint
   - Linha 498-509: Urgent endpoint

---

## ✅ Resultado

**Antes**:
- ❌ Validação DAO retornava sempre `false`
- ❌ Features DAO nunca apareciam
- ❌ Refund sempre bloqueado

**Depois**:
- ✅ Validação usa Council members real
- ✅ 4 membros cadastrados no blockchain
- ✅ Features aparecem para membros corretos
- ✅ Refund funciona para Council members

---

**Implementado por**: Claude Code
**Data**: 2025-11-15
**Serviço reiniciado**: ✅ bazari-api
