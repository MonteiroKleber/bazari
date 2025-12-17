# ✅ Implementação Completa da Especificação Técnica OAuth

**Data:** 22 de Novembro de 2025
**Deploy:** https://bazari.libervia.xyz/
**Status:** ✅ COMPLETO - Aguardando testes

---

## 📋 Resumo Executivo

Implementação completa da especificação técnica para correção do fluxo OAuth (Google) seguindo a **Opção A** (conversão backend para base64) com todas as melhorias de segurança especificadas.

### Problemas Corrigidos:

1. ✅ **Formato incompatível** - Backend agora retorna base64 (compatível com frontend)
2. ✅ **Iterações divergentes** - Frontend agora usa 150.000 iterations (matching backend)
3. ✅ **Endpoint sem autenticação** - `/auth/social/setup-pin` agora protegido com JWT
4. ✅ **Device limpo** - Novo endpoint `/auth/social/wallet` para reenvio seguro
5. ✅ **Validação de ownership** - Verificação de googleId vs userId autenticado

---

## 🔧 Mudanças Técnicas Implementadas

### Backend (`apps/api/`)

#### 1. **Arquivo:** `src/lib/auth/encryption.ts` (linhas 103-135)

**Mudança:** Conversão de hex para base64 na função `encryptMnemonicWithPin`

```typescript
// ANTES (hex):
let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
encrypted += cipher.final('hex');
return {
  encrypted,
  iv: iv.toString('hex'),
  salt: salt.toString('hex'),
  authTag: authTag.toString('hex'),
};

// DEPOIS (base64):
let encrypted = cipher.update(mnemonic, 'utf8', 'base64');
encrypted += cipher.final('base64');
return {
  encrypted,
  iv: iv.toString('base64'),
  salt: salt.toString('base64'),
  authTag: authTag.toString('base64'),
};
```

**Justificativa:** Alinha com formato esperado pelo `decryptMnemonic` do frontend (crypto.utils.ts)

---

#### 2. **Arquivo:** `src/routes/auth-social.ts`

**a) Novo endpoint GET `/auth/social/wallet`** (linhas 140-222)

```typescript
fastify.get('/auth/social/wallet', {
  onRequest: authOnRequest, // ✅ Autenticação JWT obrigatória
}, async (request, reply) => {
  const userId = (request as any).authUser?.id;

  // Buscar wallet do usuário autenticado
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { managedWallet: true, socialAccount: true },
  });

  // Se isPinSetup=true, requer force=true
  if (managedWallet.isPinSetup && query.force !== 'true') {
    return reply.code(403).send({ error: 'PIN already configured' });
  }

  // Retornar wallet criptografada pelo servidor
  return reply.send({ wallet: { ... } });
});
```

**Funcionalidade:**
- Permite reenvio de wallet para device limpo/novo
- Requer autenticação JWT
- Só reenvia se `isPinSetup=false` OU `?force=true`

---

**b) Endpoint POST `/auth/social/setup-pin` protegido** (linhas 224-331)

**Mudanças de segurança:**

```typescript
fastify.post('/auth/social/setup-pin', {
  onRequest: authOnRequest, // ✅ NOVO: Autenticação JWT obrigatória
}, async (request, reply) => {
  // ✅ NOVO: Extrair userId do JWT
  const userId = (request as any).authUser?.id;
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  // ✅ NOVO: Validar ownership
  if (socialAccount.userId !== userId) {
    console.warn(`⚠️ [Security] Tentativa de acesso cruzado`);
    return reply.code(403).send({ error: 'Forbidden' });
  }

  // Re-criptografar com PIN
  const pinEncrypted = encryptMnemonicWithPin(mnemonic, body.pinHash);

  // ✅ NOVO: Retornar iterations e format explícitos
  return reply.send({
    wallet: {
      ...pinEncrypted,
      iterations: 150000, // Explícito
      format: 'base64',   // Documentado
    }
  });
});
```

**Melhorias:**
- ✅ Autenticação JWT via middleware `authOnRequest`
- ✅ Validação: googleId deve pertencer ao userId autenticado
- ✅ Log de segurança para tentativas de acesso cruzado
- ✅ Response inclui `iterations` e `format` explícitos

---

### Frontend (`apps/web/`)

#### 3. **Arquivo:** `src/pages/auth/CreateAccount.tsx`

**a) Correção de iterations** (linha 189)

```typescript
// ANTES:
await saveAccount({
  iterations: 100000, // ❌ ERRADO
});

// DEPOIS:
await saveAccount({
  iterations: response.wallet.iterations ?? 150000, // ✅ CORRETO
});
```

**b) Lógica de device limpo** (linhas 119-164)

```typescript
const handleGoogleSuccess = async (credential: string) => {
  const response = await verifyGoogleToken(credential);
  storeAccessToken(response.accessToken, response.expiresIn);

  const hasVault = await hasEncryptedSeed();

  // 1. Se backend enviou wallet → novo usuário
  if (response.wallet) {
    storePendingSocialWallet(...);
    setStep(3); // Criar PIN
    return;
  }

  // 2. Sem wallet no payload: tentar reenvio para device limpo
  if (!hasVault) {
    const walletResponse = await fetchSocialWallet(true);
    if (walletResponse.wallet) {
      storePendingSocialWallet(...);
      setStep(3); // Criar PIN
      return;
    }
    // Bloquear navegação se não conseguir wallet
    setError('Não foi possível recuperar sua wallet');
    return;
  }

  // 3. Tem vault local → seguir para app
  navigate('/app');
};
```

**Fluxo:**
1. Novo usuário → backend envia wallet → criar PIN
2. Device limpo → tenta `/auth/social/wallet` → criar PIN
3. Device com vault → navega para `/app`

---

## 🔒 Segurança Implementada

| Item | Status | Implementação |
|------|--------|---------------|
| Autenticação JWT em `/setup-pin` | ✅ | Middleware `onRequest: authOnRequest` |
| Validação de ownership | ✅ | `socialAccount.userId === userId` |
| Logs de tentativas de acesso | ✅ | `console.warn()` em tentativas cruzadas |
| Rate limiting | ⏳ | Recomendado (não implementado) |
| Formato padronizado (base64) | ✅ | Previne erros de encoding |
| Iterations explícitas | ✅ | Previne mismatch frontend/backend |

---

## 🔄 Fluxo OAuth Completo (Novo Usuário)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOGIN GOOGLE                                             │
│    POST /auth/google/verify                                 │
│    ↓                                                         │
│    • Backend cria: User, ManagedWallet, Profile             │
│    • Minta NFT on-chain                                     │
│    • Retorna: wallet (server-encrypted) + JWT               │
│    • Frontend: sessionStorage (pending wallet)              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CRIAÇÃO DE PIN (Step 3)                                  │
│    • Frontend detecta getPendingSocialWallet()              │
│    • Hash SHA-256 do PIN                                    │
│    • POST /auth/social/setup-pin (c/ JWT Bearer)            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RE-CRIPTOGRAFIA (Backend)                                │
│    • Valida: userId === owner do googleId ✅                │
│    • Decrypt com server-key                                 │
│    • Re-encrypt com PIN hash (PBKDF2 150k, base64) ✅       │
│    • Retorna: wallet + iterations + format                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SALVAMENTO LOCAL                                         │
│    • Frontend salva IndexedDB:                              │
│      - cipher, iv, salt, authTag (base64) ✅                │
│      - iterations: 150000 ✅                                 │
│    • Limpa sessionStorage                                   │
│    • Navigate → /app                                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. UNLOCK (Próximo acesso)                                  │
│    • Usuário digita PIN                                     │
│    • PBKDF2(PIN, salt, 150k) → key                          │
│    • Decrypt(cipher, iv, authTag, key) usando base64 ✅      │
│    • Sucesso! ✅                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆕 Device Limpo / Segundo Dispositivo

```
┌─────────────────────────────────────────────────────────────┐
│ USUÁRIO RETORNA (Device limpo)                              │
│    • Login Google → verifyGoogleToken                       │
│    • Backend: isPinSetup=true, NÃO envia wallet             │
│    • Frontend: !hasVault → chama GET /auth/social/wallet    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ GET /auth/social/wallet (c/ JWT Bearer) ✅                   │
│    • Backend verifica isPinSetup:                           │
│      - false → reenvia wallet                               │
│      - true + force=true → reenvia wallet                   │
│      - true (sem force) → 403 Forbidden                     │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ RECONFIGURAÇÃO DE PIN                                       │
│    • storePendingSocialWallet() → sessionStorage            │
│    • setStep(3) → Criar novo PIN                            │
│    • Fluxo igual ao novo usuário                            │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Compatibilidade com Fluxo Tradicional

**Fluxo tradicional (seed client-side) NÃO foi modificado:**

- ✅ Geração de seed no cliente (linha 65-75)
- ✅ Encryption com PIN via `encryptMnemonic` (linha 214-219)
- ✅ Formato base64 (padrão original)
- ✅ 150.000 iterations (padrão original)
- ✅ SIWS login (linha 224-232)
- ✅ Unlock com PIN (sem modificações)

**Arquivos NÃO modificados:**
- `apps/web/src/modules/auth/crypto.utils.ts` ✅
- `apps/web/src/pages/auth/Unlock.tsx` ✅
- `apps/web/src/pages/auth/Restore.tsx` ✅

---

## 📦 Deploy Realizado

### Backend:
- **Servidor:** bazari-api.service (systemd)
- **Modo:** tsx (TypeScript execution sem build)
- **Status:** ✅ Running (PID 595051)
- **Porta:** 3000
- **URL:** https://bazari.libervia.xyz/api/

### Frontend:
- **Build:** Vite production build
- **Path:** /var/www/html/
- **Nginx:** ✅ Reloaded
- **URL:** https://bazari.libervia.xyz/
- **Checksum:** ✅ Verificado (b9a3b0d7e53e3020a47eff60a083a713)

---

## 🧪 Testes Pendentes

### 1. Fluxo OAuth - Novo Usuário
- [ ] Login com Google
- [ ] Criação de PIN (8+ dígitos)
- [ ] Salvamento em IndexedDB
- [ ] Unlock com PIN correto
- [ ] Unlock com PIN incorreto (deve falhar)

### 2. Fluxo OAuth - Device Limpo
- [ ] Login Google (isPinSetup=true)
- [ ] Reenvio via `/auth/social/wallet`
- [ ] Reconfiguração de PIN
- [ ] Unlock

### 3. Fluxo Tradicional (Não-Regressão)
- [ ] Criar conta com seed phrase
- [ ] Salvar seed
- [ ] Verificação de palavras
- [ ] Criação de PIN
- [ ] SIWS login
- [ ] Unlock

### 4. Segurança
- [ ] `/auth/social/setup-pin` sem JWT → 401
- [ ] `/auth/social/setup-pin` com googleId de outro user → 403
- [ ] `/auth/social/wallet` sem JWT → 401

---

## 📁 Arquivos Modificados

```
apps/api/
├── src/lib/auth/encryption.ts            (✅ base64 conversion)
└── src/routes/auth-social.ts             (✅ security + new endpoint)

apps/web/
└── src/pages/auth/CreateAccount.tsx      (✅ iterations + device limpo)
```

**Arquivos adicionais criados:**
- Este documento: `OAUTH_SPEC_IMPLEMENTATION_COMPLETE.md`

---

## 🎯 Próximos Passos

1. **Usuário testa fluxo OAuth completo** em https://bazari.libervia.xyz/
2. **Reportar qualquer erro** via logs do navegador (Console + IndexedDB)
3. **Verificar fluxo tradicional** (confirmar não-regressão)
4. **Opcional:** Implementar rate limiting em `/auth/social/setup-pin`

---

## 📞 Suporte

- **Logs Backend:** `journalctl -u bazari-api -f`
- **Logs Frontend:** Console do navegador (F12)
- **IndexedDB:** DevTools → Application → IndexedDB → bazari-auth

---

**Deploy completo em:** https://bazari.libervia.xyz/
**Status:** ✅ PRONTO PARA TESTES
