# Prompt: Implementar Date Separators

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Implementar separadores de data entre mensagens de dias diferentes ("Hoje", "Ontem", etc).

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/04-DATE-SEPARATORS.md`

## Ordem de Implementacao

### Etapa 1: Criar Componente DateSeparator

Criar `apps/web/src/components/chat/DateSeparator.tsx`:

```typescript
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateSeparatorProps {
  date: Date;
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  if (isThisWeek(date)) return format(date, 'EEEE', { locale: ptBR }); // "Segunda-feira"
  if (isThisYear(date)) return format(date, "d 'de' MMMM", { locale: ptBR }); // "15 de Janeiro"
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }); // "15 de Janeiro de 2024"
}

export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
        {formatDateLabel(date)}
      </span>
    </div>
  );
}
```

### Etapa 2: Funcao de Agrupamento

Criar utilitario para detectar mudanca de dia:

```typescript
function shouldShowDateSeparator(
  currentMsg: ChatMessage,
  previousMsg: ChatMessage | undefined
): boolean {
  if (!previousMsg) return true;

  const currentDate = new Date(currentMsg.createdAt);
  const previousDate = new Date(previousMsg.createdAt);

  return !isSameDay(currentDate, previousDate);
}
```

### Etapa 3: Integrar no MessageList

Modificar `apps/web/src/components/chat/MessageList.tsx`:

```typescript
{messages.map((message, index) => {
  const previousMessage = messages[index - 1];
  const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

  return (
    <Fragment key={message.id}>
      {showDateSeparator && (
        <DateSeparator date={new Date(message.createdAt)} />
      )}
      <MessageBubble message={message} {...props} />
    </Fragment>
  );
})}
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/chat/DateSeparator.tsx`

### Modificar
- [ ] `apps/web/src/components/chat/MessageList.tsx`

## Cenarios de Teste

1. [ ] "Hoje" aparece para mensagens de hoje
2. [ ] "Ontem" aparece para mensagens de ontem
3. [ ] Dia da semana para mensagens desta semana
4. [ ] Data completa para mensagens antigas
5. [ ] Separador apenas na primeira mensagem do dia
6. [ ] Scroll para mensagens antigas mostra separadores corretos

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): add date separators between messages

- Create DateSeparator component with smart labels
- Show 'Hoje', 'Ontem', weekday, or full date
- Integrate into MessageList with day change detection"
```
