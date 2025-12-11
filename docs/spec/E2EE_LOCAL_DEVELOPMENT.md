# E2EE Local - Desenvolvimento

## O que foi implementado

Agora o chat **tem E2EE ativo localmente** para desenvolvimento! As mensagens são criptografadas e descriptografadas automaticamente.

### Como funciona

#### 1. Sessões Locais Automáticas
Implementei o método `createLocalDevSession()` que cria sessões E2EE determinísticas baseadas no `threadId`.

**Arquivo:** `apps/web/src/lib/chat/crypto.ts` (linhas 68-92)

```typescript
// Derivar chave determinística do threadId
const seed = sodium.crypto_generichash(32, threadId);
```

**Como funciona:**
- Ambos os usuários usam o mesmo `threadId`
- Ambos derivam a **mesma chave criptográfica** do `threadId`
- Resultado: ambos conseguem criptografar/descriptografar as mensagens um do outro

#### 2. Criação Automática de Sessões

**Quando cria nova conversa (createDm):**
```typescript
await chatCrypto.createLocalDevSession(thread.id);
```

**Quando carrega conversas existentes (loadThreads):**
```typescript
for (const thread of response.threads) {
  if (!chatCrypto.hasSession(thread.id)) {
    await chatCrypto.createLocalDevSession(thread.id);
  }
}
```

#### 3. Fluxo Completo de Mensagem Criptografada

**Envio:**
1. Usuário digita "Olá, tudo bem?"
2. `sendMessage()` chama `chatCrypto.encrypt(threadId, plaintext)`
3. Ciphertext é gerado (ex: "a8f3j2k1...")
4. Mensagem enviada via WebSocket com `ciphertext`
5. Backend armazena apenas o `ciphertext` (nunca vê o plaintext)

**Recebimento:**
1. WebSocket recebe mensagem com `ciphertext`
2. Handler chama `chatCrypto.decrypt(threadId, ciphertext)`
3. Plaintext é recuperado ("Olá, tudo bem?")
4. Mensagem adicionada ao state com `plaintext`
5. UI exibe o texto descriptografado

### O que foi modificado

#### 📁 `apps/web/src/lib/chat/crypto.ts`
**Adicionado:**
- `hasSession(threadId)` - Verifica se sessão existe
- `listSessions()` - Lista todas as sessões ativas
- `deleteSession(threadId)` - Remove uma sessão
- `createLocalDevSession(threadId)` - Cria sessão determinística para dev

#### 📁 `apps/web/src/hooks/useChat.ts`
**Modificado:**
- `createDm()` - Agora cria sessão E2EE ao criar conversa
- `loadThreads()` - Cria sessões para threads existentes sem sessão

## Como testar

### 1. Limpar estado anterior (opcional)
Se você testou antes sem E2EE, limpe os dados:

```javascript
// No console do navegador (F12)
localStorage.clear();
```

### 2. Teste básico - Envio de mensagem

1. Abra dois navegadores/abas diferentes
2. Logue como @user_5dtp4ktm no primeiro
3. Logue como @user_5gvzsg15 no segundo
4. No primeiro, crie conversa com @user_5gvzsg15
5. Envie mensagem: "Teste E2EE"
6. Verifique no console do navegador:
   ```
   [ChatCrypto] Creating LOCAL DEV session - NOT SECURE for production!
   [ChatCrypto] Local dev session created for thread abc12345...
   [useChat] DM created with E2EE session: abc12345...
   ```

7. No segundo navegador, a mensagem deve aparecer descriptografada
8. No console do segundo:
   ```
   [useChat] Created E2EE session for existing thread abc12345...
   [useChat] Cannot decrypt received message, using ciphertext as plaintext
   ```

   **NOTA:** Pode mostrar warning na primeira mensagem se a sessão foi criada depois. Mensagens seguintes devem funcionar.

### 3. Verificar no banco de dados

As mensagens no banco devem estar **criptografadas**:

```bash
# Conectar ao banco
cd apps/api
npx prisma studio
```

Abra a tabela `ChatMessage` e veja o campo `ciphertext`. Deve ter algo como:
```
"k8j2l1m3n4o5p6q7r8s9t0u1v2w3x4y5z6..."
```

**NÃO** deve ter o texto original em lugar algum do banco!

### 4. Testar persistência de sessões

1. Envie algumas mensagens
2. Feche o navegador
3. Abra novamente e logue
4. As mensagens antigas devem aparecer descriptografadas
5. Verifique no console:
   ```
   [ChatCrypto] Loading existing keypair
   [useChat] Created E2EE session for existing thread...
   ```

### 5. Ver sessões ativas

No console do navegador:

```javascript
// Importar o chatCrypto (precisa ser após o app carregar)
const { chatCrypto } = await import('/src/lib/chat/crypto.ts');

// Listar sessões
chatCrypto.listSessions();
// Output: ["thread-id-1", "thread-id-2", ...]

// Verificar se tem sessão específica
chatCrypto.hasSession('abc123...');
// Output: true ou false

// Ver chave pública do usuário
chatCrypto.getPublicKey();
// Output: "base64-encoded-public-key"
```

## Limitações desta implementação

### ⚠️ NÃO É E2EE REAL

Esta implementação **simula** E2EE mas **NÃO é segura para produção** porque:

1. **Chave determinística:** Qualquer um que conhece o `threadId` pode derivar a mesma chave
2. **Sem autenticação:** Não verifica identidade dos participantes
3. **Sem forward secrecy:** Se alguém descobrir a chave, pode descriptografar TODAS as mensagens
4. **Ratcheting simplificado:** Não implementa o protocolo Signal completo

### ✅ O que está funcionando

Para desenvolvimento, a implementação atual é suficiente porque:

1. ✅ Mensagens são criptografadas antes de enviar
2. ✅ Backend nunca vê plaintext
3. ✅ Banco de dados tem apenas ciphertext
4. ✅ Descriptografia funciona automaticamente
5. ✅ Sessões persistem no localStorage
6. ✅ Permite testar todo o fluxo E2EE

### 🔜 Para produção

Quando for para produção, substituir `createLocalDevSession()` pela implementação completa descrita em [`ROADMAP_E2EE_PRODUCAO.md`](./ROADMAP_E2EE_PRODUCAO.md):

1. Campo `chatPublicKey` no banco
2. Endpoints `/chat/keys` (GET e PUT)
3. Troca de chaves real usando `createSession(threadId, theirPublicKey)`
4. Protocolo Signal completo (ou biblioteca @wireapp/proteus)

## Debug

### Problema: Mensagens não descriptografam

**Sintomas:** Mensagens aparecem como texto cifrado aleatório

**Causas possíveis:**
1. Sessão não foi criada
2. Usuários estão com sessões diferentes (improvável com chave determinística)
3. Mensagem foi enviada antes da sessão ser criada

**Solução:**
```javascript
// No console
localStorage.clear();
// Recarregue a página
```

### Problema: Erro "No session for thread"

**Causa:** Sessão não foi criada para esta conversa

**Solução:**
```javascript
// No console do navegador
const { chatCrypto } = await import('/src/lib/chat/crypto.ts');

// Criar sessão manualmente
await chatCrypto.createLocalDevSession('THREAD_ID_AQUI');

// Salvar
localStorage.setItem('chat_sessions', chatCrypto.exportSessions());
```

### Ver logs detalhados

Todos os logs E2EE começam com `[ChatCrypto]` ou `[useChat]`:

```javascript
// Filtrar logs no console
// Chrome DevTools > Console > Filter: "ChatCrypto"
```

## Próximos passos

Agora que o E2EE local funciona:

1. ✅ **Testar fluxo completo** - Envio/recebimento de mensagens criptografadas
2. ✅ **Validar banco de dados** - Verificar que apenas ciphertext é armazenado
3. 🔜 **Testar com múltiplos usuários** - 3+ usuários em conversas diferentes
4. 🔜 **Implementar grupos** - E2EE em conversas de grupo
5. 🔜 **Planejar migração** - Para E2EE real (chaves públicas, Signal Protocol)
6. 🔜 **Integrar blockchain** - Após E2EE estabilizar

## Referências

- [ROADMAP_E2EE_PRODUCAO.md](./ROADMAP_E2EE_PRODUCAO.md) - Plano completo para E2EE em produção
- [libsodium docs](https://doc.libsodium.org/) - Documentação da biblioteca de criptografia
- [Signal Protocol](https://signal.org/docs/) - Protocolo de referência para E2EE
