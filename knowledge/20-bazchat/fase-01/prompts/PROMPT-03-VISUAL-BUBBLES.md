# Prompt: Implementar Melhorias Visuais nas Bolhas de Mensagem

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

Voce vai melhorar a aparencia visual das bolhas de mensagem no BazChat para um look mais moderno e profissional, similar ao WhatsApp.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-01/03-VISUAL-BUBBLES.md`

## Melhorias a Implementar

1. **Tail (seta)** nas bolhas apontando para o avatar/lado
2. **Sombra sutil** para profundidade
3. **Cores diferenciadas** para enviadas vs recebidas
4. **Agrupamento** de mensagens consecutivas do mesmo remetente
5. **Animacao de entrada** nas novas mensagens
6. **Border-radius dinamico** baseado na posicao no grupo

## Arquivos a Modificar

### Frontend

1. **`apps/web/src/components/chat/MessageBubble.tsx`**
   - Refatorar completamente com novo design
   - Adicionar props: `isFirstInGroup`, `isLastInGroup`, `showAvatar`
   - Implementar `BubbleTail` component
   - Implementar `getBubbleRadius` helper
   - Usar cores corretas: `bg-primary` para enviadas, `bg-muted` para recebidas

2. **`apps/web/src/components/chat/MessageList.tsx`**
   - Calcular agrupamento de mensagens
   - Passar props de grupo para cada MessageBubble
   - Threshold: mensagens do mesmo sender em < 1 minuto = mesmo grupo

## Especificacoes Visuais

### Cores

```
Mensagens enviadas:
- Background: bg-primary (roxo Bazari)
- Texto: text-primary-foreground
- Timestamp/status: text-primary-foreground/70

Mensagens recebidas:
- Background: bg-muted
- Texto: text-foreground
- Timestamp: text-muted-foreground
```

### Border Radius

```
Primeira do grupo: rounded-2xl + rounded-t{l/r}-md (onde fica o tail)
Meio do grupo: rounded-2xl
Ultima do grupo: rounded-2xl + rounded-b{l/r}-md
Unica mensagem: rounded-2xl + rounded-t{l/r}-md
```

### Espacamento

```
Entre grupos: mt-3
Dentro do grupo: mt-0.5
Padding bolha: px-3 py-2
Max width: 75%
```

### Tail SVG

```tsx
function BubbleTail({ isOwn, isFirst }: { isOwn: boolean; isFirst: boolean }) {
  if (!isFirst) return null;

  return (
    <svg
      className={cn(
        'absolute top-0 w-3 h-3',
        isOwn ? '-right-1.5' : '-left-1.5',
      )}
      viewBox="0 0 12 12"
    >
      <path
        d={isOwn ? 'M0 0 L12 0 L0 12 Z' : 'M12 0 L0 0 L12 12 Z'}
        className={isOwn ? 'fill-primary' : 'fill-muted'}
      />
    </svg>
  );
}
```

## Codigo de Referencia

### Calculo de Agrupamento

```typescript
const GROUP_THRESHOLD_MS = 60 * 1000; // 1 minuto

const groupedMessages = useMemo(() => {
  return messages.map((msg, index) => {
    const prevMsg = messages[index - 1];
    const nextMsg = messages[index + 1];

    const isSameSenderAsPrev =
      prevMsg &&
      prevMsg.senderId === msg.senderId &&
      msg.createdAt - prevMsg.createdAt < GROUP_THRESHOLD_MS;

    const isSameSenderAsNext =
      nextMsg &&
      nextMsg.senderId === msg.senderId &&
      nextMsg.createdAt - msg.createdAt < GROUP_THRESHOLD_MS;

    return {
      message: msg,
      isOwn: msg.senderId === currentProfileId,
      isFirstInGroup: !isSameSenderAsPrev,
      isLastInGroup: !isSameSenderAsNext,
      showAvatar: !isSameSenderAsPrev && msg.senderId !== currentProfileId,
    };
  });
}, [messages, currentProfileId]);
```

### MessageBubble Simplificado

```tsx
export function MessageBubble({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  showAvatar,
  senderProfile,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex gap-2 px-4',
        'animate-in slide-in-from-bottom-2 duration-200',
        isOwn ? 'justify-end' : 'justify-start',
        isFirstInGroup ? 'mt-3' : 'mt-0.5',
      )}
    >
      {/* Avatar slot */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && <Avatar ... />}
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'relative max-w-[75%] px-3 py-2 shadow-sm',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted',
          getBubbleRadius(isOwn, isFirstInGroup, isLastInGroup),
        )}
      >
        {/* Sender name (grupos) */}
        {!isOwn && isFirstInGroup && senderProfile && (
          <p className="text-xs font-medium text-primary mb-1">
            {senderProfile.displayName}
          </p>
        )}

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.plaintext}
        </p>

        {/* Footer */}
        <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : '')}>
          <span className={cn('text-[10px]', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {formatTime(message.createdAt)}
          </span>
          {isOwn && <MessageStatus status={message.status} />}
        </div>

        {/* Tail */}
        <BubbleTail isOwn={isOwn} isFirst={isFirstInGroup} />
      </div>
    </div>
  );
}
```

### getBubbleRadius Helper

```typescript
function getBubbleRadius(isOwn: boolean, isFirst: boolean, isLast: boolean): string {
  const base = 'rounded-2xl';

  if (isOwn) {
    if (isFirst && isLast) return `${base} rounded-tr-md`;
    if (isFirst) return `${base} rounded-tr-md`;
    if (isLast) return `${base} rounded-br-md`;
    return base;
  } else {
    if (isFirst && isLast) return `${base} rounded-tl-md`;
    if (isFirst) return `${base} rounded-tl-md`;
    if (isLast) return `${base} rounded-bl-md`;
    return base;
  }
}
```

## Validacao

Apos implementar, testar:
- [ ] Mensagens enviadas tem cor primaria, recebidas tem cor muted
- [ ] Tail aparece na primeira mensagem de cada grupo
- [ ] Mensagens consecutivas (<1min) sao agrupadas
- [ ] Avatar aparece apenas na primeira mensagem recebida do grupo
- [ ] Animacao de entrada funciona
- [ ] Dark mode funciona corretamente
- [ ] Mensagens com midia (imagem) continuam funcionando
- [ ] Mensagens com proposta continuam funcionando

## Nao Fazer

- Nao alterar a logica de E2EE
- Nao modificar o MessageStatus (feature separada)
- Nao alterar o ProposalCard dentro das bolhas
- Manter compatibilidade com todos os tipos de mensagem (text, image, proposal, etc)
