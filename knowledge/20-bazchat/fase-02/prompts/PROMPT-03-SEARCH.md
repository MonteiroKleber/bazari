# Prompt: Implementar Message Search

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

Implementar busca de mensagens no BazChat. Devido ao E2EE, a busca e feita client-side nas mensagens decriptadas.

## Especificacao

Leia a especificacao completa em: `knowledge/bazchat/fase-02/03-SEARCH.md`

## Consideracao E2EE

**IMPORTANTE**: O BazChat usa criptografia E2E. As mensagens sao armazenadas criptografadas no servidor.

A busca sera **client-side** nas mensagens ja decriptadas e carregadas em memoria.

## Ordem de Implementacao

### Etapa 1: Shared Types

Atualizar `packages/shared-types/src/chat.ts`:

```typescript
export interface MessageSearchResult {
  message: ChatMessage;
  thread: {
    id: string;
    kind: 'dm' | 'group';
    name?: string;
  };
  matchedText: string;
  score: number;
}

export interface SearchQuery {
  term: string;
  threadId?: string;
  limit?: number;
}
```

### Etapa 2: Hook de Busca

Criar `apps/web/src/hooks/useMessageSearch.ts`:

```typescript
import { useCallback, useMemo } from 'react';
import { useChat } from './useChat';
import { ChatMessage, MessageSearchResult } from '@bazari/shared-types';

export function useMessageSearch() {
  const { messages, threads, currentProfileId } = useChat();

  const searchInThread = useCallback((
    threadId: string,
    term: string,
    limit = 50
  ): MessageSearchResult[] => {
    if (!term.trim()) return [];

    const threadMessages = messages.get(threadId) || [];
    const thread = threads.find(t => t.id === threadId);
    const searchTerm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const results = threadMessages
      .filter(msg => {
        const plaintext = (msg.plaintext || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return plaintext.includes(searchTerm);
      })
      .map(msg => ({
        message: msg,
        thread: {
          id: threadId,
          kind: thread?.kind || 'dm',
          name: getThreadName(thread, currentProfileId),
        },
        matchedText: extractMatchContext(msg.plaintext || '', term),
        score: calculateScore(msg, term),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }, [messages, threads, currentProfileId]);

  const searchGlobal = useCallback((term: string, limit = 50): MessageSearchResult[] => {
    if (!term.trim()) return [];

    const allResults: MessageSearchResult[] = [];

    for (const [threadId] of messages) {
      const results = searchInThread(threadId, term, limit);
      allResults.push(...results);
    }

    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [messages, searchInThread]);

  return { searchInThread, searchGlobal };
}

// Helper functions
function getThreadName(thread: any, currentProfileId: string): string {
  if (!thread) return 'Conversa';
  if (thread.kind === 'group') return thread.name || 'Grupo';

  const other = thread.participantsData?.find(
    (p: any) => p.profileId !== currentProfileId
  );
  return other?.name || other?.handle || 'Conversa';
}

function extractMatchContext(text: string, term: string, contextSize = 40): string {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);

  if (index === -1) return text.slice(0, 80);

  const start = Math.max(0, index - contextSize);
  const end = Math.min(text.length, index + term.length + contextSize);

  let result = text.slice(start, end);
  if (start > 0) result = '...' + result;
  if (end < text.length) result = result + '...';

  return result;
}

function calculateScore(message: ChatMessage, term: string): number {
  let score = 0;

  // Mensagens mais recentes
  const age = Date.now() - new Date(message.createdAt).getTime();
  const daysOld = age / (1000 * 60 * 60 * 24);
  score += Math.max(0, 100 - daysOld);

  // Match no inicio do texto
  const index = (message.plaintext || '').toLowerCase().indexOf(term.toLowerCase());
  if (index !== -1) {
    score += Math.max(0, 50 - index);
  }

  return score;
}
```

### Etapa 3: Componentes UI

1. Criar `apps/web/src/components/chat/ChatSearchBar.tsx`:

```typescript
interface ChatSearchBarProps {
  mode: 'thread' | 'global';
  threadId?: string;
  onClose: () => void;
}

// Input com icone de lupa
// Debounce 300ms
// Loading state
// Integra com useMessageSearch
```

2. Criar `apps/web/src/components/chat/SearchResults.tsx`:

```typescript
interface SearchResultsProps {
  results: MessageSearchResult[];
  loading: boolean;
  query: string;
  onResultClick: (result: MessageSearchResult) => void;
}

// Lista de resultados
// Cada item: avatar, nome, trecho destacado, data
// Estado vazio
```

3. Criar `apps/web/src/components/chat/SearchHighlight.tsx`:

```typescript
interface SearchHighlightProps {
  text: string;
  term: string;
}

// Destaca termo com <mark>
```

### Etapa 4: Integracao

1. Modificar `ChatThreadPage.tsx`:
   - Adicionar botao de busca no header
   - Estado searchOpen
   - Renderizar SearchOverlay quando aberto

```typescript
const [searchOpen, setSearchOpen] = useState(false);

// No header
<Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
  <Search className="h-5 w-5" />
</Button>

// Overlay
{searchOpen && (
  <div className="absolute inset-0 bg-background z-50">
    <ChatSearchBar
      mode="thread"
      threadId={threadId}
      onClose={() => setSearchOpen(false)}
    />
  </div>
)}
```

2. Modificar `ChatInboxPage.tsx`:
   - Adicionar botao de busca global
   - Navegacao para thread ao clicar em resultado

3. Implementar scroll to message:
```typescript
const scrollToMessage = (messageId: string) => {
  const element = document.getElementById(`msg-${messageId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('bg-primary/20');
    setTimeout(() => element.classList.remove('bg-primary/20'), 2000);
  }
};
```

### Etapa 5: Atalhos de Teclado

```typescript
// No ChatThreadPage
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      setSearchOpen(true);
    }
    if (e.key === 'Escape' && searchOpen) {
      setSearchOpen(false);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [searchOpen]);
```

## Arquivos a Modificar

### Shared
- [ ] `packages/shared-types/src/chat.ts`

### Frontend
- [ ] `apps/web/src/hooks/useMessageSearch.ts` (novo)
- [ ] `apps/web/src/components/chat/ChatSearchBar.tsx` (novo)
- [ ] `apps/web/src/components/chat/SearchResults.tsx` (novo)
- [ ] `apps/web/src/components/chat/SearchHighlight.tsx` (novo)
- [ ] `apps/web/src/pages/chat/ChatThreadPage.tsx`
- [ ] `apps/web/src/pages/chat/ChatInboxPage.tsx`
- [ ] `apps/web/src/components/chat/MessageList.tsx` (add id to messages)

## Cenarios de Teste

1. [ ] Busca em thread com resultados
2. [ ] Busca em thread sem resultados
3. [ ] Busca global com resultados
4. [ ] Busca global sem resultados
5. [ ] Clique no resultado faz scroll
6. [ ] Highlight do termo nos resultados
7. [ ] Case-insensitive
8. [ ] Busca com acentos (cafe = café)
9. [ ] Ctrl+F abre busca
10. [ ] Escape fecha busca
11. [ ] Performance com muitas mensagens

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(chat): implement client-side message search

- Create useMessageSearch hook for E2EE-compatible search
- Add ChatSearchBar, SearchResults, SearchHighlight components
- Integrate search in ChatThreadPage and ChatInboxPage
- Add keyboard shortcuts (Ctrl+F, Escape)
- Implement scroll to message with highlight"
```
