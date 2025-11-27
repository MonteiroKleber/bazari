# RELATÓRIO COMPLETO: ANÁLISE DO FLUXO OAUTH vs TRADICIONAL

**Data:** 21 de Novembro de 2025
**Autor:** Claude (Análise Técnica)
**Status:** 🔴 CRÍTICO - OAuth Flow Não Funcional

---

## 📊 SUMÁRIO EXECUTIVO

### Problema Identificado
O fluxo de autenticação OAuth (Google Login) está **quebrado** e não permite que usuários utilizem suas carteiras localmente. A seed phrase é criptografada pelo servidor com uma chave diferente da PIN do usuário, tornando impossível a descriptografia local.

### Impacto
- ❌ Usuários OAuth não conseguem assinar transações localmente
- ❌ PIN criado pelo usuário não é utilizado para criptografia
- ❌ Mnemonic armazenado no IndexedDB não pode ser descriptografado
- ❌ Ao fazer logout e tentar desbloquear, falha sempre

### Causa Raiz
Incompatibilidade entre o modelo de segurança do fluxo tradicional (client-side encryption) e o modelo OAuth (server-managed wallet).

---

## 🔄 FLUXO TRADICIONAL (FUNCIONAL)

### Cronologia Completa

#### 1. Criação de Conta
```
[1] Usuário clica "Criar Conta"
     ↓
[2] Frontend gera seed phrase (12 palavras) - 100% CLIENT-SIDE
     • Arquivo: apps/web/src/pages/auth/CreateAccount.tsx:77-89
     • Função: generateMnemonic() usando @polkadot/util-crypto
     • Armazenamento: React state (memória)
     ↓
[3] Usuário visualiza e salva seed phrase (Step 1)
     • Exibição: CreateAccount.tsx:410-463
     • Seed phrase AINDA em memória (não persistido)
     ↓
[4] Usuário confirma 3 palavras aleatórias (Step 2)
     • Validação: CreateAccount.tsx:467-537
     • Seed phrase AINDA em memória
     ↓
[5] Usuário cria PIN (Step 3)
     • Input: CreateAccount.tsx:540-629
     • PIN armazenado em React state
     • Seed phrase AINDA em memória
     ↓
[6] Usuário revisa e clica "Criar Conta" (Step 4)
     • Handler: handleFinalSubmit() linha 173-217
     ↓
[7] ✅ CRIPTOGRAFIA COM PIN DO USUÁRIO
     • Função: encryptMnemonic(mnemonic, PIN)
     • Algoritmo: AES-GCM 256-bit
     • Key Derivation: PBKDF2 (150,000 iterações)
     • Arquivo: crypto.utils.ts:50-62
     ↓
[8] 💾 SALVAR NO INDEXEDDB
     • Função: saveAccount()
     • Database: bazari-auth
     • Store: vault_accounts
     • Conteúdo salvo:
       - cipher: mnemonic criptografado COM PIN
       - iv: initialization vector
       - salt: salt do PBKDF2
       - iterations: 150000
     • Arquivo: crypto.store.ts:170-202
     ↓
[9] 🔐 AUTENTICAÇÃO SIWS (Sign-In With Substrate)
     • Fetch nonce do backend
     • Assinar mensagem com seed phrase
     • Enviar signature para backend
     • Criar sessão
     ↓
[10] Redirecionar para /app - CONTA CRIADA
```

#### 2. Login de Usuário Retornando
```
[1] Usuário acessa /app
     ↓
[2] App verifica sessão (localStorage)
     • Arquivo: App.tsx:287-327
     • Se sessão válida → acesso liberado
     • Se sessão inválida → continua
     ↓
[3] Detectar estado do usuário
     • Função: detectUserState()
     • Verificações:
       a) Tem sessão ativa? → UserState.AUTHENTICATED
       b) Tem vault no IndexedDB? → UserState.HAS_VAULT
       c) Nenhum dos anteriores? → UserState.NEW_USER
     • Arquivo: userState.ts:13-27
     ↓
[4] Se HAS_VAULT → Redirecionar para /auth/unlock
     ↓
[5] Tela de Unlock carrega contas do IndexedDB
     • Função: listAccounts()
     • Busca em: vault_accounts
     • Exibe: endereço + nome (se tiver)
     • Arquivo: Unlock.tsx:53-68
     ↓
[6] Usuário seleciona conta e digita PIN
     ↓
[7] ✅ DESCRIPTOGRAFAR COM PIN
     • Função: decryptMnemonic(cipher, iv, salt, PIN, iterations)
     • Se PIN correto: retorna seed phrase
     • Se PIN errado: DOMException (failed to decrypt)
     • Arquivo: crypto.utils.ts:64-81
     ↓
[8] Tentar refresh de sessão (cookie httpOnly)
     • Se sucesso → vai para /app
     • Se falha → continua
     ↓
[9] Re-autenticar com SIWS
     • Assinar nova mensagem com seed phrase
     • Criar nova sessão
     ↓
[10] Redirecionar para /app - LOGIN COMPLETO
```

### Pontos-Chave do Fluxo Tradicional
1. ✅ Seed phrase **NUNCA sai do cliente**
2. ✅ Criptografia usando **PIN do usuário**
3. ✅ Descriptografia usando **mesmo PIN**
4. ✅ Pode assinar transações **localmente**
5. ✅ Funciona **offline** (após login inicial)

---

## 🔴 FLUXO OAUTH (QUEBRADO)

### Cronologia Completa

#### 1. Criação de Conta OAuth
```
[1] Usuário clica "Continuar com Google"
     • Componente: IntroScreen.tsx:146-157
     ↓
[2] Popup Google OAuth abre
     • Usuário autentica com Google
     • Google retorna JWT credential
     ↓
[3] Frontend envia credential para backend
     • Endpoint: POST /api/auth/google/verify
     • Função: verifyGoogleToken(credential)
     • Arquivo: google-login.ts:11-30
     ↓
[4] Backend verifica token com Google
     • Valida signature do JWT
     • Extrai: sub (Google ID), email, name, picture
     • Arquivo: auth-social.ts:15-41
     ↓
[5] Backend verifica se usuário existe
     • Busca: SocialAccount onde provider='google' AND providerId=sub
     • Se existe → retorna usuário existente
     • Se não existe → cria novo usuário
     ↓
[6] ❌ BACKEND GERA SEED PHRASE (SERVER-SIDE)
     • Função: generateSocialWallet()
     • Biblioteca: @polkadot/util-crypto
     • Retorna: { mnemonic, address, publicKey }
     • Arquivo: social-wallet.ts:11-28
     ↓
[7] ❌ BACKEND CRIPTOGRAFA COM CHAVE DO SERVIDOR
     • Função: encryptMnemonic(mnemonic)
     • Chave: OAUTH_ENCRYPTION_KEY (variável de ambiente)
     • Algoritmo: AES-256-GCM
     • Iterações: 100,000 PBKDF2
     • Arquivo: encryption.ts:29-62
     •
     • ⚠️ PROBLEMA: Usa chave do servidor, NÃO o PIN do usuário!
     ↓
[8] Backend salva no banco de dados
     • Tabela: ManagedWallet
     • Campos:
       - encryptedMnemonic: criptografado com OAUTH_ENCRYPTION_KEY
       - iv, salt, authTag
       - sentToClient: true
     • Arquivo: social-auth.service.ts:126-134
     ↓
[9] Backend retorna para frontend
     • Response:
       {
         isNewUser: true,
         user: { id, address, googleId },
         accessToken: "...",
         wallet: {
           encryptedMnemonic: "...", // ← Criptografado com OAUTH_ENCRYPTION_KEY
           iv: "...",
           salt: "...",
           authTag: "..."
         }
       }
     ↓
[10] Frontend valida ownership
     • Verifica se device já tem outra conta
     • Se sim → mostra alerta
     • Se não → continua
     • Arquivo: CreateAccount.tsx:220-273
     ↓
[11] ❌ Frontend armazena em SessionStorage (TEMPORÁRIO)
     • Key: pending_social_wallet
     • Expira: 10 minutos
     • Perdido: se refresh da página
     • Arquivo: social-wallet.ts:62-69
     ↓
[12] Frontend mostra tela de criar PIN (Step 3)
     • Usuário digita PIN (mínimo 8 caracteres)
     • Arquivo: CreateAccount.tsx:540-629
     ↓
[13] ❌ BUG CRÍTICO: PIN NÃO É USADO PARA CRIPTOGRAFIA
     • Handler: handlePinSubmitWithSocialSupport()
     • Código problemático:

       await saveAccount({
         address: pending.address,
         cipher: pending.wallet.encryptedMnemonic, // ← ERRADO!
         iv: pending.wallet.iv,
         salt: pending.wallet.salt,
       });

     • O que DEVERIA fazer:
       1. Descriptografar mnemonic com OAUTH_ENCRYPTION_KEY (impossível no cliente!)
       2. Re-criptografar com PIN do usuário
       3. Salvar versão re-criptografada

     • Arquivo: CreateAccount.tsx:336-360
     ↓
[14] 💾 Salvar no IndexedDB (INCORRETAMENTE)
     • Database: bazari-auth
     • Store: vault_accounts
     • Conteúdo salvo:
       - cipher: mnemonic criptografado COM OAUTH_ENCRYPTION_KEY (❌)
       - iv, salt: do backend
       - iterations: 100000
     •
     • ⚠️ PROBLEMA: Criptografia incompatível com PIN!
     ↓
[15] ❌ Sem autenticação SIWS
     • Tradicional: assina mensagem com seed phrase
     • OAuth: pula essa etapa completamente
     ↓
[16] Redirecionar para /app - "CONTA CRIADA" (mas não funcional)
```

#### 2. Login de Usuário OAuth Retornando
```
[1] Usuário clica "Continuar com Google" novamente
     ↓
[2] Backend reconhece usuário existente
     • Busca SocialAccount por Google ID
     • Verifica flag sentToClient
     • Se false → envia mnemonic
     • Se true → não envia (já foi enviado antes)
     ↓
[3] ❌ Backend retorna SEM wallet
     • Response:
       {
         isNewUser: false,
         user: { id, address, googleId },
         accessToken: "...",
         // wallet: undefined ← Não enviado!
       }
     ↓
[4] Frontend redireciona direto para /app
     • Código: CreateAccount.tsx:261-266
     •
       if (result.isNewUser && result.wallet) {
         // ...
       } else {
         navigate('/app'); // ← Vai direto, sem verificar IndexedDB
       }
     ↓
[5] ❌ Usuário não tem wallet local funcional
     • Se tentar assinar transação → FALHA
     • Se fazer logout → não consegue unlock
```

#### 3. Tentativa de Unlock Após Logout (FALHA)
```
[1] Usuário faz logout
     ↓
[2] Limpa sessão do localStorage
     ↓
[3] Usuário tenta acessar /app novamente
     ↓
[4] Redireciona para /auth/unlock (tem vault no IndexedDB)
     ↓
[5] Usuário digita PIN
     ↓
[6] ❌ TENTATIVA DE DESCRIPTOGRAFAR FALHA
     • Função: decryptMnemonic(cipher, iv, salt, PIN, iterations)
     • Tenta derivar chave com PIN
     • Tenta descriptografar cipher
     • ❌ FALHA: cipher foi criptografado com OAUTH_ENCRYPTION_KEY, não com PIN!
     • Erro: DOMException - operation failed
     ↓
[7] Mostra "PIN incorreto" (mas o problema não é o PIN!)
     ↓
[8] Usuário fica preso - não consegue acessar a conta
```

---

## 🔍 ANÁLISE TÉCNICA DETALHADA

### Criptografia Tradicional (Client-Side)
```typescript
// apps/web/src/modules/auth/crypto.utils.ts

// ENCRYPTION
export async function encryptMnemonic(mnemonic: string, pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Deriva chave do PIN do usuário
  const key = await deriveKey(pin, salt); // ← PIN usado aqui

  const data = textEncoder.encode(mnemonic);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key, // ← Chave derivada do PIN
    data
  );

  return {
    cipher: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    iterations: PBKDF2_ITERATIONS, // 150,000
  };
}

// DECRYPTION
export async function decryptMnemonic(
  cipher: string,
  ivB64: string,
  saltB64: string,
  pin: string, // ← Mesmo PIN usado para criptografar
  iterations = PBKDF2_ITERATIONS
) {
  const iv = fromBase64(ivB64);
  const salt = fromBase64(saltB64);

  // Deriva mesma chave do PIN
  const key = await deriveKey(pin, salt, iterations);

  const cipherBytes = fromBase64(cipher);
  const clearBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key, // ← Mesma chave = descriptografa com sucesso
    cipherBytes.buffer as ArrayBuffer
  );

  return textDecoder.decode(clearBuffer);
}
```

### Criptografia OAuth (Server-Side)
```typescript
// apps/api/src/lib/auth/encryption.ts

export function encryptMnemonic(mnemonic: string): EncryptedData {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  // ❌ Deriva chave da variável de ambiente, NÃO do PIN do usuário
  const key = deriveKeyFromMaster(
    process.env.OAUTH_ENCRYPTION_KEY!, // ← Chave do servidor
    salt
  );

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(mnemonic, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  return {
    encrypted,
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    authTag,
  };
}

// Cliente NUNCA conseguirá descriptografar porque não tem OAUTH_ENCRYPTION_KEY!
```

---

## 🎯 SOLUÇÃO PROPOSTA

### OPÇÃO 1: DESCRIPTOGRAFAR E RE-CRIPTOGRAFAR (RECOMENDADO)

#### Fluxo Completo

```
[NOVO USUÁRIO - CRIAÇÃO DE CONTA]

1. Usuário faz login com Google
2. Backend gera seed phrase
3. Backend criptografa com OAUTH_ENCRYPTION_KEY
4. Backend salva em ManagedWallet
5. Backend retorna mnemonic criptografado para frontend

6. Frontend armazena em SessionStorage (temporário)
7. Frontend mostra tela de criar PIN

8. ✅ NOVO: Usuário cria PIN

9. ✅ NOVO: Frontend envia PIN para backend (via endpoint seguro)

10. ✅ NOVO: Backend descriptografa mnemonic com OAUTH_ENCRYPTION_KEY

11. ✅ NOVO: Backend re-criptografa com chave derivada do PIN

12. ✅ NOVO: Backend retorna novo cipher/iv/salt

13. ✅ Frontend salva versão re-criptografada no IndexedDB

14. ✅ Usuario consegue descriptografar localmente com PIN!
```

#### Implementação

##### Backend: Novo Endpoint
```typescript
// apps/api/src/routes/auth-social.ts

/**
 * POST /api/auth/social/setup-pin
 * Re-criptografa mnemonic com PIN do usuário
 */
fastify.post('/auth/social/setup-pin', async (request, reply) => {
  // 1. Autenticar requisição
  const { userId } = await authenticate(request);

  // 2. Validar PIN
  const body = request.body as { pinHash: string };
  if (!body.pinHash || body.pinHash.length < 64) {
    return reply.code(400).send({ error: 'PIN hash inválido' });
  }

  // 3. Buscar ManagedWallet
  const wallet = await prisma.managedWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return reply.code(404).send({ error: 'Wallet não encontrada' });
  }

  // 4. Descriptografar mnemonic com chave do servidor
  const mnemonic = decryptMnemonic({
    encrypted: wallet.encryptedMnemonic,
    iv: wallet.iv,
    salt: wallet.salt,
    authTag: wallet.authTag,
  });

  // 5. Re-criptografar com PIN do usuário
  const reEncrypted = encryptMnemonicWithPin(mnemonic, body.pinHash);

  // 6. Retornar versão re-criptografada
  return reply.send({
    cipher: reEncrypted.cipher,
    iv: reEncrypted.iv,
    salt: reEncrypted.salt,
    iterations: reEncrypted.iterations,
  });
});
```

##### Frontend: Modificar PIN Submit
```typescript
// apps/web/src/pages/auth/CreateAccount.tsx

const handlePinSubmitWithSocialSupport = pinForm.handleSubmit(async (values) => {
  const pending = getPendingSocialWallet();

  if (pending) {
    try {
      setLoading(true);

      // ✅ NOVO: Chamar backend para re-criptografar com PIN
      const pinHash = await hashPin(values.pin); // SHA-256

      const response = await fetch(`${API_BASE_URL}/auth/social/setup-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ pinHash }),
      });

      if (!response.ok) {
        throw new Error('Falha ao configurar PIN');
      }

      const reEncrypted = await response.json();

      // ✅ Salvar versão re-criptografada no IndexedDB
      await saveAccount({
        address: pending.address,
        name: accountName || undefined,
        cipher: reEncrypted.cipher, // ← Agora criptografado com PIN!
        iv: reEncrypted.iv,
        salt: reEncrypted.salt,
        iterations: reEncrypted.iterations,
      });

      clearPendingSocialWallet();
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao configurar wallet');
    } finally {
      setLoading(false);
    }
  }
});
```

##### Segurança: Hash do PIN
```typescript
// apps/web/src/modules/auth/crypto.utils.ts

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

#### Vantagens
- ✅ Compatível com fluxo tradicional
- ✅ Usuário pode descriptografar localmente
- ✅ Pode assinar transações offline
- ✅ Multi-device: cada device tem sua própria criptografia
- ✅ Backend nunca vê PIN em plaintext (apenas hash)

#### Desvantagens
- ⚠️ Backend vê mnemonic em plaintext (mas já via durante geração)
- ⚠️ Requer endpoint adicional
- ⚠️ PIN hash enviado via HTTPS (risco de MITM)

---

### OPÇÃO 2: WALLET GERENCIADA PELO SERVIDOR (SEM PIN LOCAL)

#### Conceito
Remover completamente a criptografia client-side para usuários OAuth. O backend assina todas as transações.

#### Fluxo
```
1. Usuário faz login com Google
2. Backend gera e guarda seed phrase
3. Frontend NÃO pede PIN
4. Frontend NÃO salva nada no IndexedDB
5. Para assinar transação:
   - Frontend envia dados da transação para backend
   - Backend descriptografa mnemonic
   - Backend assina transação
   - Backend retorna signature
```

#### Implementação

##### Remover PIN do Fluxo OAuth
```typescript
// apps/web/src/pages/auth/CreateAccount.tsx

const handleGoogleSuccess = async (credential: string) => {
  const result = await verifyGoogleToken(credential);

  // Validar ownership...

  saveGoogleIdBinding(result.user.googleId, result.user.address);
  storeAccessToken(result.accessToken, result.expiresIn);

  // ✅ MODIFICADO: Vai direto para /app, sem PIN
  await fetchProfile().catch(() => null);
  navigate('/app');
};
```

##### Backend Endpoint para Assinar
```typescript
// apps/api/src/routes/transactions.ts

fastify.post('/transactions/sign', async (request, reply) => {
  const { userId } = await authenticate(request);
  const { transactionData } = request.body as { transactionData: string };

  // Buscar wallet gerenciada
  const wallet = await prisma.managedWallet.findUnique({
    where: { userId },
  });

  // Descriptografar mnemonic
  const mnemonic = decryptMnemonic(wallet);

  // Assinar transação
  const signature = await signTransaction(mnemonic, transactionData);

  return { signature };
});
```

#### Vantagens
- ✅ Simples de implementar
- ✅ Sem confusão de PIN
- ✅ Funciona mesmo se usuário esquece "PIN"
- ✅ Alinhado com modelo "managed wallet"

#### Desvantagens
- ❌ NÃO é self-custody (backend controla chaves)
- ❌ Requer backend para todas as transações
- ❌ Usuário não pode exportar seed phrase
- ❌ Risco: se backend comprometido, todas as wallets comprometidas
- ❌ Não compatível com fluxo tradicional

---

### OPÇÃO 3: HYBRID - DEVICE-SPECIFIC ENCRYPTION

#### Conceito
Cada device tem sua própria criptografia, mas todas descriptografam para mesma seed phrase.

#### Fluxo
```
[PRIMEIRO DEVICE]
1. Usuário faz login com Google
2. Backend gera seed phrase
3. Usuário cria PIN
4. Frontend gera "device key" aleatória
5. Frontend criptografa mnemonic com device key
6. Frontend criptografa device key com PIN
7. Frontend salva ambos no IndexedDB
8. Frontend envia device key para backend (para backup)

[SEGUNDO DEVICE]
1. Usuário faz login com Google
2. Backend retorna device keys de outros devices
3. Usuário escolhe: (a) criar novo PIN ou (b) usar PIN existente
4. Se (b): backend descriptografa device key com PIN e envia
5. Frontend descriptografa mnemonic com device key
6. Repete processo de criptografia para este device
```

#### Vantagens
- ✅ Multi-device funciona
- ✅ Cada device pode ter PIN diferente
- ✅ Backend tem backup (device keys)
- ✅ Compatível com fluxo tradicional

#### Desvantagens
- ❌ Muito complexo
- ❌ Requer mudanças significativas no schema do banco
- ❌ UX confusa para usuários

---

## 📋 RECOMENDAÇÃO FINAL

### Solução Proposta: **OPÇÃO 1 - Descriptografar e Re-criptografar**

#### Por quê?
1. ✅ Mantém compatibilidade com fluxo tradicional
2. ✅ Preserva self-custody (usuário controla chaves com PIN)
3. ✅ Implementação relativamente simples
4. ✅ Permite assinatura local de transações
5. ✅ Multi-device (cada device re-criptografa)

#### Cronograma de Implementação

##### FASE 1: Backend (2-3 horas)
- [ ] Criar endpoint `/auth/social/setup-pin`
- [ ] Implementar `encryptMnemonicWithPin(mnemonic, pinHash)`
- [ ] Adicionar validações de segurança
- [ ] Testes unitários

##### FASE 2: Frontend (3-4 horas)
- [ ] Implementar `hashPin(pin)` para gerar SHA-256
- [ ] Modificar `handlePinSubmitWithSocialSupport()`
- [ ] Adicionar chamada para `/setup-pin`
- [ ] Remover `storePendingSocialWallet()` (usar response direto)
- [ ] Adicionar loading state durante re-criptografia
- [ ] Tratamento de erros

##### FASE 3: Usuários Existentes (1-2 horas)
- [ ] Adicionar flag `isPinSetup` em ManagedWallet
- [ ] Detectar usuários OAuth sem PIN configurado
- [ ] Redirecionar para tela de "Configurar PIN" no primeiro login
- [ ] Migration script para marcar todos como `isPinSetup: false`

##### FASE 4: Testes (2-3 horas)
- [ ] Teste: Criar conta OAuth nova
- [ ] Teste: Fazer logout e unlock com PIN
- [ ] Teste: Assinar transação local
- [ ] Teste: Multi-device (login em outro navegador)
- [ ] Teste: PIN incorreto
- [ ] Teste: Usuário existente sem PIN

**TOTAL ESTIMADO: 8-12 horas de desenvolvimento**

---

## 🚨 CENÁRIOS CRÍTICOS A RESOLVER

### Cenário 1: Novo Usuário OAuth
**Status Atual:** ❌ Quebrado
**Solução:** Opção 1 - Re-criptografar com PIN
**Prioridade:** 🔴 CRÍTICA

### Cenário 2: Usuário OAuth Retornando (Mesmo Device)
**Status Atual:** ❌ Quebrado (não consegue unlock)
**Solução:** Opção 1 - Wallet já está re-criptografado com PIN
**Prioridade:** 🔴 CRÍTICA

### Cenário 3: Usuário OAuth em Novo Device
**Status Atual:** ⚠️ Parcialmente funcional (login funciona, mas sem wallet local)
**Solução:** Backend detecta que mnemonic nunca foi enviado para este device → permite re-setup
**Prioridade:** 🟡 ALTA

### Cenário 4: Usuário OAuth Faz Logout
**Status Atual:** ❌ Quebrado (não consegue fazer unlock depois)
**Solução:** Opção 1 - PIN descriptografa corretamente
**Prioridade:** 🔴 CRÍTICA

### Cenário 5: Usuário OAuth Esquece PIN
**Status Atual:** ⚠️ Sem solução (não tem seed phrase salva)
**Solução:** Permitir re-login com Google → backend envia mnemonic → criar novo PIN
**Prioridade:** 🟡 ALTA

### Cenário 6: Usuário Tradicional Adiciona Google
**Status Atual:** ⚠️ Não implementado
**Solução:** Link Google account com wallet existente (binding)
**Prioridade:** 🟢 MÉDIA (Fase 2)

### Cenário 7: Migração de Usuários Existentes
**Status Atual:** ❌ Usuários criados antes desta correção estão quebrados
**Solução:**
1. Adicionar flag `isPinSetup` no banco
2. Detectar no login
3. Forçar setup de PIN
4. Re-criptografar
**Prioridade:** 🔴 CRÍTICA

---

## 📝 CHECKLIST DE VALIDAÇÃO

Antes de considerar o fluxo OAuth completo, validar:

### Funcionalidades Básicas
- [ ] Criar conta OAuth nova funciona
- [ ] PIN criado pelo usuário é usado para criptografia
- [ ] Mnemonic salvo no IndexedDB pode ser descriptografado com PIN
- [ ] Logout + Unlock funciona
- [ ] Profile público criado automaticamente
- [ ] NFT on-chain mintado

### Segurança
- [ ] PIN nunca enviado em plaintext
- [ ] Mnemonic nunca enviado em plaintext (exceto server → client inicial, via HTTPS)
- [ ] Autenticação SIWS implementada (ou alternativa OAuth equivalente)
- [ ] Rate limiting em tentativas de PIN
- [ ] Session management funcional

### Multi-Device
- [ ] Usuário consegue fazer login em novo device
- [ ] Mnemonic é enviado novamente para novo device
- [ ] Cada device pode ter PIN diferente (ou mesmo PIN re-criptografa)

### Recuperação
- [ ] Usuário consegue recuperar conta se esquecer PIN (via Google login)
- [ ] Processo de "reset PIN" documentado

### Compatibilidade
- [ ] Não quebra fluxo tradicional (seed phrase)
- [ ] Usuários podem ter ambos (tradicional + OAuth) na mesma conta? (decisão de produto)

---

## 🔚 CONCLUSÃO

O fluxo OAuth atual está **fundamentalmente quebrado** devido a um erro de arquitetura na criptografia. A seed phrase é criptografada com uma chave do servidor mas o frontend tenta descriptografar com o PIN do usuário.

**Ação Imediata Requerida:**
1. Implementar Opção 1 (Re-criptografar com PIN)
2. Migrar usuários OAuth existentes
3. Adicionar testes end-to-end
4. Documentar fluxo para equipe

**Impacto se não corrigir:**
- Usuários OAuth não conseguem usar suas contas após logout
- Reputação da plataforma afetada
- Possível perda de usuários

**Tempo estimado para correção completa:** 8-12 horas de desenvolvimento + 4-6 horas de testes

---

**Fim do Relatório**
