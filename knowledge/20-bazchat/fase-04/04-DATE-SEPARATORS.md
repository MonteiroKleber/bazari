# Feature: Date Separators

## Objetivo

Adicionar separadores visuais entre mensagens de dias diferentes para facilitar a navegacao temporal.

## Requisitos Funcionais

### Comportamento
- Separador aparece entre mensagens de dias diferentes
- Formato:
  - "Hoje" - mensagens de hoje
  - "Ontem" - mensagens de ontem
  - "Segunda, 9 de dezembro" - dias da semana atual
  - "9 de dezembro de 2024" - dias anteriores

### Visual
- Linha horizontal com texto centralizado
- Cor suave (muted-foreground)
- Nao interativo
- Nao conta como mensagem para grouping

## Implementacao

### 1. Utilitario de Formatacao de Data

```typescript
// apps/web/src/lib/date-utils.ts

import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatMessageDateSeparator(date: Date | number): string {
  const d = new Date(date);

  if (isToday(d)) {
    return 'Hoje';
  }

  if (isYesterday(d)) {
    return 'Ontem';
  }

  if (isThisWeek(d)) {
    return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
  }

  return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function isSameDay(date1: Date | number, date2: Date | number): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
```

### 2. Componente DateSeparator

```typescript
// apps/web/src/components/chat/DateSeparator.tsx

import { cn } from '@/lib/utils';

interface DateSeparatorProps {
  label: string;
  className?: string;
}

export function DateSeparator({ label, className }: DateSeparatorProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center py-4',
        className
      )}
    >
      <div className="flex-1 h-px bg-border" />
      <span className="px-4 text-xs text-muted-foreground font-medium">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
```

### 3. Integrar no MessageList

```typescript
// apps/web/src/components/chat/MessageList.tsx

import { DateSeparator } from './DateSeparator';
import { formatMessageDateSeparator, isSameDay } from '@/lib/date-utils';

// Dentro do render:
{messages.map((message, index) => {
  const prevMessage = messages[index - 1];
  const showDateSeparator =
    index === 0 ||
    (prevMessage && !isSameDay(message.createdAt, prevMessage.createdAt));

  return (
    <React.Fragment key={message.id}>
      {showDateSeparator && (
        <DateSeparator
          label={formatMessageDateSeparator(message.createdAt)}
        />
      )}
      <MessageBubble
        message={message}
        // ... outras props
      />
    </React.Fragment>
  );
})}
```

### 4. Considerar no Grouping

O separador de data deve "quebrar" o grouping de mensagens:

```typescript
// No calculo de isFirstInGroup/isLastInGroup:
const isFirstInGroup =
  index === 0 ||
  prevMessage?.from !== message.from ||
  message.createdAt - prevMessage.createdAt > 60000 ||
  !isSameDay(message.createdAt, prevMessage.createdAt); // NOVO
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/chat/DateSeparator.tsx` - Componente visual
- `apps/web/src/lib/date-utils.ts` - Utilitarios de data (se nao existir)

### Modificar
- `apps/web/src/components/chat/MessageList.tsx` - Renderizar separadores

## Testes

- [ ] Separador "Hoje" aparece para mensagens de hoje
- [ ] Separador "Ontem" aparece para mensagens de ontem
- [ ] Formato correto para dias da semana
- [ ] Formato correto para datas antigas
- [ ] Separador quebra o grouping de mensagens
- [ ] Performance OK com muitas mensagens
