# Feature: Unread Badge

## Objetivo

Mostrar um contador de mensagens nao lidas no icone do chat no menu principal do app.

## Requisitos Funcionais

### Comportamento
- Badge aparece no icone "BazChat" no menu lateral/inferior
- Contador = soma de unreadCount de todas as threads nao mutadas e nao arquivadas
- Badge vermelho com numero branco
- Se > 99, mostrar "99+"
- Badge desaparece quando todas mensagens sao lidas

### Localizacao
- Menu lateral (desktop): ao lado do item "BazChat"
- Bottom navigation (mobile): sobre o icone de chat
- Titulo da aba do navegador: "(3) Bazari" quando ha mensagens

## Implementacao

### 1. Calcular Total de Nao Lidas no useChat

```typescript
// apps/web/src/hooks/useChat.ts

// Adicionar computed/derived state:
interface ChatStore {
  // ... estado existente ...

  // Computed
  getTotalUnreadCount: () => number;
}

// Na criacao do store:
getTotalUnreadCount: () => {
  const { threads, threadPreferences } = get();
  let total = 0;

  for (const thread of threads) {
    const pref = threadPreferences.get(thread.id);
    // Nao contar threads mutadas ou arquivadas
    if (pref?.isMuted || pref?.isArchived) continue;

    total += thread.unreadCount || 0;
  }

  return total;
},
```

### 2. Componente Badge

```typescript
// apps/web/src/components/ui/unread-badge.tsx

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
        'flex items-center justify-center',
        'text-[10px] font-bold text-white',
        'bg-destructive rounded-full',
        'animate-in zoom-in-50 duration-200',
        className
      )}
    >
      {displayCount}
    </span>
  );
}
```

### 3. Integrar no Menu

```typescript
// No componente de navegacao (ex: Sidebar.tsx ou BottomNav.tsx)

import { useChat } from '@/hooks/useChat';
import { UnreadBadge } from '@/components/ui/unread-badge';

function NavItem() {
  const unreadCount = useChat((state) => state.getTotalUnreadCount());

  return (
    <Link to="/app/chat" className="relative">
      <MessageSquare className="h-5 w-5" />
      <UnreadBadge count={unreadCount} />
      <span>BazChat</span>
    </Link>
  );
}
```

### 4. Atualizar Titulo da Aba

```typescript
// apps/web/src/hooks/useDocumentTitle.ts

import { useEffect } from 'react';
import { useChat } from './useChat';

export function useChatDocumentTitle() {
  const unreadCount = useChat((state) => state.getTotalUnreadCount());

  useEffect(() => {
    const baseTitle = 'Bazari';

    if (unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);
}

// Usar no App.tsx ou layout principal:
// useChatDocumentTitle();
```

### 5. Favicon Badge (Opcional)

Para mostrar badge no favicon:

```typescript
// apps/web/src/lib/favicon-badge.ts

export function updateFaviconBadge(count: number): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = document.createElement('img');

  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;

    ctx?.drawImage(img, 0, 0);

    if (count > 0 && ctx) {
      // Desenhar circulo vermelho
      ctx.beginPath();
      ctx.arc(canvas.width - 8, 8, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // Desenhar numero
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count > 9 ? '9+' : String(count), canvas.width - 8, 8);
    }

    // Atualizar favicon
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = canvas.toDataURL('image/png');
    }
  };

  img.src = '/favicon.ico';
}
```

## Arquivos a Criar/Modificar

### Criar
- `apps/web/src/components/ui/unread-badge.tsx` - Componente de badge
- `apps/web/src/hooks/useDocumentTitle.ts` - Hook para titulo da aba

### Modificar
- `apps/web/src/hooks/useChat.ts` - Adicionar getTotalUnreadCount
- `apps/web/src/components/layout/Sidebar.tsx` ou equivalente - Integrar badge
- `apps/web/src/App.tsx` - Usar useDocumentTitle

## Testes

- [ ] Badge aparece com contagem correta
- [ ] Badge atualiza em tempo real
- [ ] Threads mutadas nao contam
- [ ] Threads arquivadas nao contam
- [ ] Badge desaparece quando tudo lido
- [ ] "99+" para mais de 99
- [ ] Titulo da aba atualiza
