# Prompt: Implementar Typing Indicator no BazChat

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Esta implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados ou fake data
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** hardcodar valores que deveriam ser dinamicos
- **NAO** assumir comportamentos - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Contexto

Voce vai implementar o Typing Indicator (indicador de digitacao) no BazChat. Esta e uma feature que mostra quando outro usuario esta digitando na conversa.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-01/01-TYPING-INDICATOR.md`

## Arquivos a Modificar/Criar

### Backend

1. **`packages/shared-types/src/chat.ts`**
   - Adicionar tipos: `WsTypingStart`, `WsTypingStop`, `WsTypingNotify`
   - Atualizar union types `WsClientMsg` e `WsServerMsg`

2. **`apps/api/src/ws/chat-handler.ts`**
   - Adicionar Map para rastrear usuarios digitando
   - Implementar handlers para `typing:start` e `typing:stop`
   - Implementar funcao `broadcastTyping`
   - Adicionar timeout de 5s para auto-stop

### Frontend

3. **`apps/web/src/lib/chat/websocket.ts`**
   - Adicionar metodos `sendTypingStart(threadId)` e `sendTypingStop(threadId)`
   - Implementar debounce de 3s

4. **`apps/web/src/hooks/useChat.ts`**
   - Adicionar estado `typingUsers: Map<string, Array<{profileId, handle, displayName}>>`
   - Adicionar handler para evento `typing`
   - Expor actions `sendTypingStart` e `sendTypingStop`

5. **`apps/web/src/components/chat/TypingIndicator.tsx`** (NOVO)
   - Criar componente com dots animados
   - Props: `users: Array<{ displayName: string }>`
   - Texto: "Fulano esta digitando", "Fulano e Ciclano estao digitando", etc.

6. **`apps/web/src/components/chat/ChatComposer.tsx`**
   - No `onChange` do input: chamar `sendTypingStart(threadId)` se texto nao vazio
   - No `onBlur`: chamar `sendTypingStop(threadId)`
   - Apos enviar mensagem: chamar `sendTypingStop(threadId)`

7. **`apps/web/src/pages/chat/ChatThreadPage.tsx`**
   - Importar e usar `TypingIndicator`
   - Obter `typingUsers` do useChat para o threadId atual
   - Renderizar acima do `ChatComposer`

8. **`apps/web/src/components/chat/ThreadItem.tsx`** (opcional)
   - Mostrar "digitando..." no preview quando alguem esta digitando naquela thread

## Ordem de Implementacao

1. Primeiro os tipos em shared-types (build vai falhar temporariamente)
2. Backend handlers
3. Frontend websocket methods
4. useChat state e handlers
5. Componente TypingIndicator
6. Integracao no ChatComposer e ChatThreadPage

## Validacao

Apos implementar, testar:
- [ ] Abrir duas sessoes com usuarios diferentes
- [ ] Usuario A digita -> Usuario B ve indicador
- [ ] Usuario A para de digitar -> indicador some apos timeout
- [ ] Usuario A envia mensagem -> indicador some imediatamente
- [ ] Em grupo, mostra nome de quem esta digitando

## Codigo de Referencia

### TypingDots Animation (Tailwind)

```tsx
function TypingDots() {
  return (
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
    </div>
  );
}
```

### Debounce no Frontend

```typescript
private typingTimeout: NodeJS.Timeout | null = null;

sendTypingStart(threadId: string) {
  this.send({ op: 'typing:start', data: { threadId } });

  if (this.typingTimeout) clearTimeout(this.typingTimeout);
  this.typingTimeout = setTimeout(() => {
    this.sendTypingStop(threadId);
  }, 3000);
}
```

## Nao Fazer

- Nao modificar o fluxo de envio de mensagens
- Nao adicionar persistencia no banco (typing e apenas em memoria)
- Nao implementar typing para grupos grandes (>20 membros) - apenas mostrar "varios usuarios..."
