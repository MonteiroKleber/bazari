# Roadmap: Implementação E2EE para Produção

## Estado Atual (Desenvolvimento)

### ✅ O que já está implementado:
1. **Biblioteca de criptografia:** `apps/web/src/lib/chat/crypto.ts`
   - Usando `libsodium-wrappers`
   - Geração de keypairs (Curve25519)
   - Criptografia/descriptografia com ratcheting simplificado
   - Persistência de sessões no localStorage

2. **Fallback para desenvolvimento:**
   - Quando não há sessão E2EE, mensagens são enviadas/recebidas em plaintext
   - Permite testar fluxo básico de mensagens
   - Logs de warning indicam que E2EE não está ativo

### ❌ O que está faltando para produção:

1. **Troca de chaves inicial (Key Exchange)**
   - Nenhum código implementa a criação de sessões entre usuários
   - Não há endpoint de API para buscar chave pública de outros usuários
   - Não há campo `chatPublicKey` no banco de dados (Profile)

2. **Protocolo de estabelecimento de sessão**
   - Signal Protocol (X3DH + Double Ratchet) não está completo
   - Código atual é "simplificado" (comentário na linha 5-6 do crypto.ts)
   - Não lida com mensagens fora de ordem
   - Não implementa forward secrecy completo

3. **Gerenciamento de sessões**
   - Não há sincronização de sessões entre dispositivos
   - Sessões são locais (localStorage) sem backup
   - Se usuário limpar cache, perde todas as sessões

4. **Backend preparado para E2EE**
   - Servidor nunca vê o plaintext (✅ já está assim)
   - Mas falta armazenar chaves públicas dos usuários
   - Falta endpoint para key exchange

## Plano de Implementação para Produção

### Fase 1: Infraestrutura de Chaves Públicas

#### 1.1 Adicionar campo no banco de dados
**Arquivo:** `apps/api/prisma/schema.prisma`

```prisma
model Profile {
  // ... campos existentes ...

  // Chave pública para E2EE (Curve25519, base64)
  chatPublicKey String?

  // ... resto do modelo ...
}
```

**Migração:**
```bash
npx prisma migrate dev --name add_chat_public_key
```

#### 1.2 Endpoint para registrar/atualizar chave pública
**Arquivo:** `apps/api/src/chat/routes/chat.settings.ts` (ou novo arquivo)

```typescript
// PUT /api/chat/keys
app.put('/api/chat/keys', async (req, res) => {
  const { publicKey } = req.body;
  const profileId = req.user.sub; // do JWT

  await prisma.profile.update({
    where: { id: profileId },
    data: { chatPublicKey: publicKey },
  });

  return { success: true };
});
```

#### 1.3 Endpoint para buscar chaves públicas de outros usuários
**Arquivo:** `apps/api/src/chat/routes/chat.keys.ts` (novo)

```typescript
// GET /api/chat/keys?profileIds=id1,id2,id3
app.get('/api/chat/keys', async (req, res) => {
  const { profileIds } = req.query;
  const ids = (profileIds as string).split(',');

  const profiles = await prisma.profile.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      chatPublicKey: true,
    },
  });

  // Retornar mapa: profileId -> publicKey
  const keys = profiles.reduce((acc, p) => {
    if (p.chatPublicKey) {
      acc[p.id] = p.chatPublicKey;
    }
    return acc;
  }, {} as Record<string, string>);

  return { keys };
});
```

### Fase 2: Estabelecimento de Sessões no Frontend

#### 2.1 Registrar chave pública ao inicializar chat
**Arquivo:** `apps/web/src/hooks/useChat.ts`

Modificar o método `initialize()`:

```typescript
initialize: async (token: string) => {
  console.log('[useChat] Initializing chat...');

  // Inicializar crypto
  await chatCrypto.initialize();

  // 🆕 NOVO: Registrar chave pública no servidor
  const publicKey = chatCrypto.getPublicKey();
  try {
    await apiHelpers.put('/chat/keys', { publicKey });
    console.log('[useChat] Public key registered');
  } catch (err) {
    console.error('[useChat] Failed to register public key:', err);
  }

  // ... resto do código existente ...
}
```

#### 2.2 Criar sessão E2EE ao criar DM
**Arquivo:** `apps/web/src/hooks/useChat.ts`

Modificar o método `createDm()`:

```typescript
createDm: async (participantId: string) => {
  try {
    // 1. Criar thread (sem E2EE ainda)
    const response = await apiHelpers.post('/chat/threads/dm', {
      participantId,
    });

    const thread = response.thread as ChatThread;

    // 🆕 2. Buscar chave pública do participante
    console.log('[useChat] Fetching participant public key...');
    const keysResponse = await apiHelpers.get(`/chat/keys?profileIds=${participantId}`);
    const theirPublicKey = keysResponse.keys[participantId];

    // 🆕 3. Criar sessão E2EE
    if (theirPublicKey) {
      console.log('[useChat] Creating E2EE session...');
      await chatCrypto.createSession(thread.id, theirPublicKey);

      // Salvar sessão
      const sessions = chatCrypto.exportSessions();
      localStorage.setItem('chat_sessions', sessions);

      console.log('[useChat] E2EE session created successfully');
    } else {
      console.warn('[useChat] Participant has no public key, E2EE disabled');
    }

    return thread.id;
  } catch (err) {
    console.error('Failed to create DM:', err);
    throw err;
  }
}
```

#### 2.3 Criar sessão ao carregar threads existentes
**Arquivo:** `apps/web/src/hooks/useChat.ts`

Modificar o método `loadThreads()`:

```typescript
loadThreads: async () => {
  try {
    const response = await apiHelpers.get('/chat/threads');
    const threads = response.threads as ChatThreadWithParticipants[];

    set({ threads });

    // 🆕 Para cada thread sem sessão E2EE, criar sessão
    for (const thread of threads) {
      // Verificar se já tem sessão
      const hasSession = chatCrypto.hasSession(thread.id); // 🆕 adicionar este método em crypto.ts
      if (hasSession) continue;

      // Buscar chaves públicas dos participantes
      const otherParticipants = thread.participants.filter(
        (p) => p !== getCurrentUserId() // 🆕 implementar getCurrentUserId
      );

      if (otherParticipants.length === 0) continue;

      try {
        const keysResponse = await apiHelpers.get(
          `/chat/keys?profileIds=${otherParticipants.join(',')}`
        );

        // Para DM, usar chave do outro participante
        if (thread.kind === 'dm' && otherParticipants.length === 1) {
          const theirPublicKey = keysResponse.keys[otherParticipants[0]];
          if (theirPublicKey) {
            await chatCrypto.createSession(thread.id, theirPublicKey);
            console.log(`[useChat] E2EE session created for thread ${thread.id}`);
          }
        }
        // TODO: Para grupos, implementar lógica diferente (chave compartilhada de grupo)
      } catch (err) {
        console.error(`[useChat] Failed to create session for thread ${thread.id}:`, err);
      }
    }

    // Salvar sessões atualizadas
    const sessions = chatCrypto.exportSessions();
    localStorage.setItem('chat_sessions', sessions);
  } catch (err) {
    console.error('Failed to load threads:', err);
  }
}
```

### Fase 3: Melhorias no Protocolo de Criptografia

#### 3.1 Implementar protocolo completo (Signal Protocol)
**Opção recomendada:** Usar biblioteca pronta

```bash
pnpm add @wireapp/proteus
# ou
pnpm add libsignal-protocol
```

**Motivos:**
- Protocolo Signal é complexo e testado em batalha
- Implementação própria tem risco de falhas de segurança
- Bibliotecas prontas lidam com edge cases (mensagens fora de ordem, etc.)

#### 3.2 Adicionar método hasSession() ao ChatCrypto
**Arquivo:** `apps/web/src/lib/chat/crypto.ts`

```typescript
hasSession(threadId: string): boolean {
  return this.sessions.has(threadId);
}

listSessions(): string[] {
  return Array.from(this.sessions.keys());
}

deleteSession(threadId: string): void {
  this.sessions.delete(threadId);
}
```

### Fase 4: Grupos e Chats Multi-dispositivo

#### 4.1 Criptografia em grupos
Para grupos, existem duas abordagens:

**Opção A: Chave de grupo compartilhada**
- Um membro cria chave simétrica de grupo
- Envia para cada membro criptografada com E2EE individual
- Mais simples, mas menos seguro

**Opção B: Sender Keys (Signal)**
- Cada membro tem par de chaves para o grupo
- Mensagens são criptografadas uma vez, descriptografadas N vezes
- Mais eficiente e seguro

#### 4.2 Multi-dispositivo
Para suportar múltiplos dispositivos do mesmo usuário:

1. Cada dispositivo tem seu próprio keypair
2. Servidor armazena múltiplas chaves públicas por usuário
3. Mensagens são enviadas criptografadas para todos os dispositivos do destinatário

### Fase 5: Backup e Recuperação

#### 5.1 Backup de sessões
**Opção 1:** Backup criptografado na blockchain
- Usar seed da wallet para derivar chave de backup
- Criptografar sessões e armazenar on-chain
- Permite recuperar sessões em novo dispositivo

**Opção 2:** QR Code de exportação
- Exportar sessões via QR code
- Usuário escaneia em novo dispositivo
- Mais simples, mas manual

#### 5.2 Aviso de perda de histórico
Se sessão não existe e mensagens antigas estão criptografadas:
```typescript
// Mostrar aviso na UI:
"Mensagens anteriores não podem ser descriptografadas.
As novas mensagens nesta conversa serão criptografadas."
```

## Checklist de Produção

Antes de remover os fallbacks de plaintext:

- [ ] Campo `chatPublicKey` adicionado ao banco
- [ ] Endpoints de chaves implementados (/chat/keys GET e PUT)
- [ ] Chave pública registrada ao inicializar chat
- [ ] Sessões criadas automaticamente ao criar DM
- [ ] Sessões criadas para threads existentes ao carregar
- [ ] Método `hasSession()` implementado
- [ ] Testes com 2+ usuários reais
- [ ] Mensagens criptografadas/descriptografadas corretamente
- [ ] Histórico carrega corretamente (apenas mensagens com sessão)
- [ ] Aviso na UI quando sessão não existe
- [ ] (Opcional) Backup de sessões implementado
- [ ] (Opcional) Migração para Signal Protocol

Apenas depois de todos os itens acima:

- [ ] **Remover fallback de plaintext** em `useChat.ts` (linhas 84-86 e 153-156)
- [ ] **Fazer mensagens falharem** se não houver sessão E2EE:
  ```typescript
  // Em vez de:
  catch (err) {
    console.warn('Using plaintext');
    ciphertext = plaintext;
  }

  // Usar:
  catch (err) {
    throw new Error('Cannot send message: E2EE session not established');
  }
  ```

## Estimativa de Tempo

- **Fase 1 (Infraestrutura):** 2-3 dias
- **Fase 2 (Estabelecimento de Sessões):** 3-5 dias
- **Fase 3 (Melhorias no Protocolo):** 5-7 dias (se usar biblioteca) ou 3-4 semanas (implementação própria)
- **Fase 4 (Grupos/Multi-dispositivo):** 1-2 semanas
- **Fase 5 (Backup):** 3-5 dias

**Total estimado:** 4-6 semanas para implementação completa e testada

## Segurança

### Ameaças mitigadas com E2EE completo:
✅ Servidor comprometido não vê conteúdo das mensagens
✅ Man-in-the-middle no servidor
✅ Acesso indevido ao banco de dados

### Ameaças NÃO mitigadas:
❌ Malware no dispositivo do usuário (keylogger, etc.)
❌ Phishing (usuário dá acesso à conta)
❌ Servidor pode ver metadados (quem fala com quem, quando, tamanho das mensagens)
❌ XSS no frontend (código malicioso pode ler plaintext na memória)

### Recomendações adicionais:
1. Implementar Code Signing para o frontend
2. Usar Content Security Policy (CSP) restritivo
3. Audit regular do código por especialistas em criptografia
4. Bug bounty program
5. Documentação de segurança para usuários
