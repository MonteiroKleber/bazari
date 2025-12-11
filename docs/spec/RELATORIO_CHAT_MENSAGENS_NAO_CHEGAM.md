# Relatório: Mensagens não chegam para destinatário

## Problema
Usuário @user_5dtp4ktm envia mensagem para @user_5gvzsg15, mas a mensagem não aparece no chat do destinatário.

## Análise do Fluxo

### 1. Fluxo de Envio (Funcionando)
**Arquivo:** `apps/web/src/hooks/useChat.ts` (linhas 146-209)

1. Usuário digita mensagem e clica enviar
2. `sendMessage()` é chamado
3. Mensagem é criptografada (ou usa plaintext se não houver sessão E2EE)
4. Mensagem é enviada via WebSocket: `chatWs.send({ op: 'send', ... })`
5. Mensagem otimista é adicionada localmente no remetente

**Backend:** `apps/api/src/chat/ws/handlers.ts` (linhas 78-125)

1. `handleSendMessage()` recebe a mensagem
2. Salva no banco via `chatService.createMessage()`
3. Atualiza thread com `updateThreadLastMessage()`
4. **IMPORTANTE:** Busca os participantes da thread (linha 101)
5. **IMPORTANTE:** Para cada recipient, verifica se está conectado (linha 105)
6. **IMPORTANTE:** Se conectado, envia mensagem via WebSocket (linha 111)

### 2. Fluxo de Recebimento (COM PROBLEMA)
**Arquivo:** `apps/web/src/hooks/useChat.ts` (linhas 74-82)

```typescript
chatWs.onMessage((msg) => {
  if (msg.op === 'message') {
    const message = msg.data as ChatMessage;

    // Adicionar mensagem ao state
    const current = get().messages.get(message.threadId) || [];
    set({
      messages: new Map(get().messages).set(message.threadId, [...current, message]),
    });
```

**PROBLEMA IDENTIFICADO:**
A mensagem recebida via WebSocket contém apenas o `ciphertext`, mas **NÃO é descriptografada** antes de ser adicionada ao state.

### 3. Comparação com loadMessages
**Arquivo:** `apps/web/src/hooks/useChat.ts` (linhas 103-144)

O método `loadMessages()` que carrega mensagens históricas **FAZ** a descriptografia:

```typescript
const decrypted = await Promise.all(
  response.messages.map(async (msg) => {
    if (msg.type === 'text') {
      try {
        const plaintext = await chatCrypto.decrypt(threadId, msg.ciphertext);
        return { ...msg, plaintext };
      } catch (err) {
        // Fallback para plaintext
        return { ...msg, plaintext: msg.ciphertext };
      }
    }
    return msg;
  })
);
```

## Causa Raiz
**Inconsistência entre dois fluxos:**
- Mensagens históricas (HTTP): São descriptografadas ✅
- Mensagens em tempo real (WebSocket): NÃO são descriptografadas ❌

Resultado: O componente de UI tenta exibir `message.plaintext` mas o campo está `undefined` porque a mensagem só tem `ciphertext`.

## Solução

### Opção 1: Descriptografar no handler WebSocket (RECOMENDADO)
Modificar o handler `chatWs.onMessage()` para descriptografar a mensagem antes de adicionar ao state.

**Vantagens:**
- Consistência: mesmo comportamento que `loadMessages()`
- Mensagens sempre têm plaintext disponível no state
- Componentes de UI não precisam lidar com descriptografia

**Implementação:**
```typescript
chatWs.onMessage(async (msg) => {
  if (msg.op === 'message') {
    const message = msg.data as ChatMessage;

    // Descriptografar antes de adicionar ao state
    let plaintext = message.ciphertext;
    if (message.type === 'text') {
      try {
        plaintext = await chatCrypto.decrypt(message.threadId, message.ciphertext);
      } catch (err) {
        console.warn('[useChat] Cannot decrypt received message, using ciphertext');
      }
    }

    const decryptedMessage = { ...message, plaintext };

    // Adicionar mensagem ao state
    const current = get().messages.get(message.threadId) || [];
    set({
      messages: new Map(get().messages).set(message.threadId, [...current, decryptedMessage]),
    });

    // ... resto do código
  }
});
```

### Opção 2: Descriptografar no componente de UI
Descriptografar quando renderizar a mensagem.

**Desvantagens:**
- Inconsistente com padrão atual
- Performance: descriptografa toda vez que re-renderiza
- Complexidade adicional nos componentes

## Recomendação
**Implementar Opção 1** - Descriptografar no handler WebSocket para manter consistência com o padrão existente em `loadMessages()`.

## Questão sobre Blockchain
**Você perguntou:** "vc recomenda ja implementar o blockchain antes de verificar os erros?"

**Resposta:** **NÃO**. É fundamental corrigir o fluxo básico de mensagens primeiro:

1. **Motivos técnicos:**
   - Blockchain adiciona complexidade (assinaturas, validação on-chain, etc.)
   - Difícil debugar problemas básicos se há camadas extras
   - Testes e validação mais lentos

2. **Motivos práticos:**
   - Mensagens precisam funcionar OFF-chain primeiro
   - Depois adicionar camada blockchain como "proof of existence"
   - Permite desenvolvimento e testes mais rápidos

3. **Ordem recomendada:**
   - ✅ **AGORA:** Fix mensagens WebSocket (descriptografia)
   - ✅ **DEPOIS:** Validar que mensagens chegam corretamente
   - ✅ **DEPOIS:** Testar com múltiplos usuários
   - 🔜 **ENTÃO:** Adicionar registro on-chain de mensagens/threads

## Próximos Passos
1. Implementar fix de descriptografia no handler WebSocket
2. Testar envio de mensagens entre @user_5dtp4ktm e @user_5gvzsg15
3. Verificar que mensagens aparecem em tempo real
4. Verificar que histórico carrega corretamente
5. Depois disso, planejar integração blockchain
