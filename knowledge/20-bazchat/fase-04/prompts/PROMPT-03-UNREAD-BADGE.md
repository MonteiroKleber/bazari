# Prompt: Implementar Unread Badge

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

Implementar contador de mensagens nao lidas no menu principal e no titulo da pagina.

## Especificacao

Leia a especificacao completa em: `knowledge/20-bazchat/fase-04/03-UNREAD-BADGE.md`

## Ordem de Implementacao

### Etapa 1: Calcular Total de Nao Lidas

Modificar `apps/web/src/hooks/useChat.ts`:

```typescript
// Adicionar computed state
totalUnreadCount: number;

// Implementar calculo
const totalUnreadCount = useMemo(() => {
  return threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);
}, [threads]);
```

### Etapa 2: Criar Badge Component

Criar `apps/web/src/components/ui/badge-counter.tsx`:

```typescript
interface BadgeCounterProps {
  count: number;
  max?: number; // default 99
  className?: string;
}

export function BadgeCounter({ count, max = 99, className }: BadgeCounterProps) {
  if (count <= 0) return null;

  const display = count > max ? `${max}+` : count.toString();

  return (
    <span className={cn(
      "absolute -top-1 -right-1 bg-destructive text-destructive-foreground",
      "text-xs font-bold rounded-full min-w-[18px] h-[18px]",
      "flex items-center justify-center px-1",
      className
    )}>
      {display}
    </span>
  );
}
```

### Etapa 3: Integrar no Menu

Modificar componente de navegacao:

```typescript
<Link to="/app/chat" className="relative">
  <MessageCircle className="h-5 w-5" />
  <BadgeCounter count={totalUnreadCount} />
</Link>
```

### Etapa 4: Atualizar Titulo da Pagina

Criar hook `apps/web/src/hooks/useDocumentTitle.ts`:

```typescript
export function useDocumentTitle(baseTitle: string, unreadCount: number) {
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [baseTitle, unreadCount]);
}
```

### Etapa 5: Integrar com App

Modificar `App.tsx` ou layout principal:

```typescript
const { totalUnreadCount } = useChat();
useDocumentTitle('Bazari', totalUnreadCount);
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/ui/badge-counter.tsx`
- [ ] `apps/web/src/hooks/useDocumentTitle.ts`

### Modificar
- [ ] `apps/web/src/hooks/useChat.ts`
- [ ] `apps/web/src/components/layout/Navbar.tsx` (ou equivalente)
- [ ] `apps/web/src/App.tsx`

## Cenarios de Teste

1. [ ] Badge aparece quando ha mensagens nao lidas
2. [ ] Badge atualiza em tempo real
3. [ ] Badge desaparece ao ler todas mensagens
4. [ ] "99+" para mais de 99 mensagens
5. [ ] Titulo da pagina atualiza com contagem
6. [ ] Contador soma todas as threads

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): add unread message badge

- Create BadgeCounter component
- Calculate totalUnreadCount in useChat
- Show badge on chat menu item
- Update document title with unread count"
```
