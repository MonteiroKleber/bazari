# Feature: Message Search

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados ou fake data
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** hardcodar valores que deveriam ser dinamicos
- **NAO** assumir comportamentos - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Permitir que usuarios busquem mensagens no historico de conversas. Busca pode ser global (todas as conversas) ou em uma thread especifica.

## Consideracao Importante: E2EE

**O BazChat usa criptografia E2E.** As mensagens sao armazenadas criptografadas no servidor.

### Abordagem para Busca

**Opcao escolhida: Busca Client-Side**

1. Mensagens sao decriptadas no cliente
2. Busca e feita localmente nas mensagens ja carregadas
3. Para busca mais ampla, carregar mais mensagens do servidor e buscar localmente

**Limitacoes:**
- Busca limitada as mensagens carregadas em memoria
- Para buscas profundas, pode ser lento carregar todo historico
- Trade-off aceitavel para manter privacidade E2E

**Alternativa futura (nao implementar agora):**
- Indice de busca client-side com IndexedDB
- Sincronizacao incremental das mensagens

## Comportamento Esperado

### Busca em Thread Especifica

1. Usuario abre uma conversa
2. Clica no icone de busca no header
3. Campo de busca aparece
4. Digita termo de busca
5. Resultados aparecem em lista
6. Clique no resultado faz scroll ate a mensagem

### Busca Global (todas as conversas)

1. Usuario acessa inbox/lista de conversas
2. Clica no icone de busca
3. Campo de busca aparece
4. Digita termo de busca
5. Resultados mostram mensagem + nome da conversa
6. Clique abre a conversa e faz scroll ate a mensagem

## Modelo de Dados

Nenhuma alteracao no schema Prisma necessaria. Busca e feita client-side.

### Shared Types

```typescript
// packages/shared-types/src/chat.ts

export interface MessageSearchResult {
  message: ChatMessage;
  thread: {
    id: string;
    kind: 'dm' | 'group';
    name?: string;  // Nome do grupo ou do contato
  };
  matchedText: string;  // Trecho com highlight
  score: number;  // Relevancia para ordenacao
}

export interface SearchQuery {
  term: string;
  threadId?: string;  // Se definido, busca apenas nessa thread
  limit?: number;
  fromDate?: string;
  toDate?: string;
}
```

## Componentes Frontend

### 1. ChatSearchBar (novo)

Barra de busca para thread ou global.

```typescript
// apps/web/src/components/chat/ChatSearchBar.tsx

interface ChatSearchBarProps {
  mode: 'thread' | 'global';
  threadId?: string;
  onSearch: (results: MessageSearchResult[]) => void;
  onClose: () => void;
}
```

**UI:**
- Input com icone de lupa
- Botao X para fechar
- Debounce de 300ms no input
- Indicador de loading durante busca

### 2. SearchResults (novo)

Lista de resultados da busca.

```typescript
// apps/web/src/components/chat/SearchResults.tsx

interface SearchResultsProps {
  results: MessageSearchResult[];
  onResultClick: (result: MessageSearchResult) => void;
  loading: boolean;
  query: string;
}
```

**UI:**
- Lista scrollavel
- Cada item mostra:
  - Avatar do remetente
  - Nome/handle
  - Trecho da mensagem com termo destacado
  - Data/hora
  - (Global) Nome da conversa
- Estado vazio: "Nenhum resultado para 'termo'"
- Estado loading: skeleton

### 3. SearchHighlight (novo)

Componente para destacar termo na mensagem.

```typescript
// apps/web/src/components/chat/SearchHighlight.tsx

interface SearchHighlightProps {
  text: string;
  term: string;
}
```

**UI:**
- Texto normal com termo em `<mark>` amarelo
- Case-insensitive highlight

### 4. ChatThreadPage (modificar)

Adicionar toggle de busca no header.

```typescript
// Adicionar estado
const [searchOpen, setSearchOpen] = useState(false);
const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);

// No header, adicionar botao de busca
<Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
  <Search className="h-5 w-5" />
</Button>

// Overlay de busca quando aberto
{searchOpen && (
  <SearchOverlay
    mode="thread"
    threadId={threadId}
    onResultClick={handleScrollToMessage}
    onClose={() => setSearchOpen(false)}
  />
)}
```

### 5. ChatInboxPage (modificar)

Adicionar busca global no header.

```typescript
// Similar ao ChatThreadPage, mas mode="global"
// onResultClick navega para a thread e faz scroll
```

## Logica de Busca (Client-Side)

### Hook useMessageSearch

```typescript
// apps/web/src/hooks/useMessageSearch.ts

export function useMessageSearch() {
  const { messages, threads } = useChat();

  const searchInThread = useCallback((
    threadId: string,
    term: string
  ): MessageSearchResult[] => {
    const threadMessages = messages.get(threadId) || [];
    const thread = threads.find(t => t.id === threadId);

    return threadMessages
      .filter(msg => {
        const plaintext = msg.plaintext?.toLowerCase() || '';
        return plaintext.includes(term.toLowerCase());
      })
      .map(msg => ({
        message: msg,
        thread: {
          id: threadId,
          kind: thread?.kind || 'dm',
          name: getThreadName(thread),
        },
        matchedText: extractMatchContext(msg.plaintext, term),
        score: calculateScore(msg, term),
      }))
      .sort((a, b) => b.score - a.score);
  }, [messages, threads]);

  const searchGlobal = useCallback((term: string): MessageSearchResult[] => {
    const allResults: MessageSearchResult[] = [];

    for (const [threadId, threadMessages] of messages) {
      const results = searchInThread(threadId, term);
      allResults.push(...results);
    }

    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);  // Limitar a 50 resultados
  }, [messages, searchInThread]);

  return { searchInThread, searchGlobal };
}

// Helpers
function extractMatchContext(text: string, term: string, contextSize = 50): string {
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return text.slice(0, 100);

  const start = Math.max(0, index - contextSize);
  const end = Math.min(text.length, index + term.length + contextSize);

  let result = text.slice(start, end);
  if (start > 0) result = '...' + result;
  if (end < text.length) result = result + '...';

  return result;
}

function calculateScore(message: ChatMessage, term: string): number {
  let score = 0;

  // Mensagens mais recentes tem score maior
  const age = Date.now() - new Date(message.createdAt).getTime();
  score += Math.max(0, 1000 - age / (1000 * 60 * 60 * 24));  // Dias

  // Matches no inicio tem score maior
  const index = message.plaintext?.toLowerCase().indexOf(term.toLowerCase()) || 0;
  score += Math.max(0, 100 - index);

  return score;
}
```

## Carregamento de Mais Mensagens

Para buscas mais completas, permitir carregar historico:

```typescript
// No SearchBar
const [deepSearch, setDeepSearch] = useState(false);

// Se poucos resultados, sugerir busca profunda
{results.length < 5 && !deepSearch && (
  <Button onClick={handleDeepSearch}>
    Buscar em mensagens mais antigas
  </Button>
)}

const handleDeepSearch = async () => {
  setDeepSearch(true);
  // Carregar mais mensagens da API
  await loadMoreMessages(threadId, { limit: 500 });
  // Re-executar busca
  const newResults = searchInThread(threadId, query);
  setResults(newResults);
};
```

## UI/UX

### Layout da Busca em Thread

```
┌────────────────────────────────┐
│ ← [          🔍 buscar...    ] │  ← SearchBar substitui header
├────────────────────────────────┤
│ Resultados para "termo"        │
│ ────────────────────────────── │
│ [Avatar] João                  │
│ ...mensagem com TERMO aqui...  │
│ 14:32                          │
│ ────────────────────────────── │
│ [Avatar] Maria                 │
│ ...outro TERMO encontrado...   │
│ Ontem                          │
└────────────────────────────────┘
```

### Layout da Busca Global

```
┌────────────────────────────────┐
│ ← [          🔍 buscar...    ] │
├────────────────────────────────┤
│ Resultados para "termo"        │
│ ────────────────────────────── │
│ [Avatar] João em "Grupo ABC"   │
│ ...mensagem com TERMO aqui...  │
│ 14:32                          │
│ ────────────────────────────── │
│ [Avatar] Maria em DM           │
│ ...outro TERMO encontrado...   │
│ Ontem                          │
└────────────────────────────────┘
```

### Animacoes

- SearchBar: slide down
- Results: fade in
- Scroll to message: smooth + highlight

### Atalhos de Teclado

- `Ctrl/Cmd + F`: Abrir busca na thread atual
- `Ctrl/Cmd + Shift + F`: Abrir busca global
- `Escape`: Fechar busca
- `Enter`: Ir para primeiro resultado
- `↑↓`: Navegar entre resultados

## Performance

- Debounce de 300ms no input
- Limite de 50 resultados na busca global
- Virtualizacao da lista de resultados se > 20
- Memoizacao dos resultados com useMemo

## Validacao

### Cenarios de Teste

1. ✓ Busca em thread com resultados
2. ✓ Busca em thread sem resultados
3. ✓ Busca global com resultados
4. ✓ Busca global sem resultados
5. ✓ Clique no resultado faz scroll
6. ✓ Highlight do termo nos resultados
7. ✓ Busca case-insensitive
8. ✓ Busca com acentos (normalizar)
9. ✓ Fechar busca com Escape
10. ✓ Performance com muitas mensagens

## Checklist de Implementacao

- [ ] Shared-types: MessageSearchResult, SearchQuery
- [ ] Hook useMessageSearch
- [ ] Componente ChatSearchBar
- [ ] Componente SearchResults
- [ ] Componente SearchHighlight
- [ ] ChatThreadPage: integrar busca
- [ ] ChatInboxPage: integrar busca global
- [ ] Scroll to message com highlight
- [ ] Atalhos de teclado
- [ ] Animacoes CSS
- [ ] Testes manuais dos cenarios
