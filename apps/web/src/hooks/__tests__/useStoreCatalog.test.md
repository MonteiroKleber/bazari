# Testes do useStoreCatalog

## Checklist de Funcionalidades

### ✅ Inicialização
- [x] Hook busca catálogo ao montar se storeId válido
- [x] Hook não busca se storeId vazio
- [x] Loading state inicia como true
- [x] Items inicia como array vazio

### ✅ Construção de URL
- [x] URL inclui onChainStoreId obrigatório
- [x] URL inclui filtro de busca `q` se presente
- [x] URL inclui `kind` se diferente de 'all'
- [x] URL inclui categoryPath como string separada por vírgula
- [x] URL inclui priceMin e priceMax se preenchidos
- [x] URL inclui atributos no formato `attrs[cor]=preto,branco`
- [x] URL inclui ordenação `sort`
- [x] URL inclui limit=24 e offset calculado da página

### ✅ Estados de Loading
- [x] loading=true durante fetch
- [x] loading=false após sucesso
- [x] loading=false após erro
- [x] Items atualizados após sucesso

### ✅ Tratamento de Erros
- [x] Erro de timeout mostra mensagem específica
- [x] Erro 404 mostra "Loja não encontrada"
- [x] Erro 500 mostra "Erro no servidor"
- [x] Erro genérico mostra mensagem padrão
- [x] Items zerados em caso de erro

### ✅ Cancelamento de Requisições
- [x] Requisição anterior é cancelada ao mudar filtros
- [x] AbortController.abort() é chamado
- [x] Erros de requisições canceladas são ignorados
- [x] Estado não atualiza se requisição foi cancelada

### ✅ Refetch Manual
- [x] `refetch()` busca catálogo novamente
- [x] `refetch()` retorna Promise
- [x] Pode ser usado para reload após erro

### ✅ Paginação
- [x] Offset calculado corretamente: (page - 1) * 24
- [x] Página 1: offset=0
- [x] Página 2: offset=24
- [x] Página 3: offset=48
- [x] Total de resultados vem do backend

## Exemplos de Uso

### Caso 1: Busca Simples
```typescript
const filters = {
  q: 'notebook',
  kind: 'all',
  categoryPath: [],
  priceMin: '',
  priceMax: '',
  attrs: {},
  sort: 'relevance',
  page: 1,
};

const { items, loading, error } = useStoreCatalog('6', filters);

// URL gerada:
// /search?onChainStoreId=6&q=notebook&limit=24
```

### Caso 2: Múltiplos Filtros
```typescript
const filters = {
  q: '',
  kind: 'product',
  categoryPath: ['eletronicos', 'notebooks'],
  priceMin: '500',
  priceMax: '2000',
  attrs: { cor: ['preto'], marca: ['dell', 'lenovo'] },
  sort: 'priceAsc',
  page: 2,
};

const { items, loading } = useStoreCatalog('6', filters);

// URL gerada:
// /search?onChainStoreId=6&kind=product&categoryPath=eletronicos,notebooks
//   &priceMin=500&priceMax=2000
//   &attrs[cor]=preto&attrs[marca]=dell,lenovo
//   &sort=priceAsc&limit=24&offset=24
```

### Caso 3: Tratamento de Erro
```typescript
const { items, loading, error, refetch } = useStoreCatalog('999', filters);

// Se erro:
// error = "Loja não encontrada."
// items = []
// loading = false

// Tentar novamente:
await refetch();
```

### Caso 4: Cancelamento
```typescript
const { items } = useStoreCatalog('6', filters);

// Usuário muda filtro rapidamente:
updateFilter('q', 'notebook');  // Requisição 1 iniciada
updateFilter('q', 'laptop');    // Requisição 1 cancelada, Requisição 2 iniciada

// Apenas resultado da Requisição 2 é aplicado
```

## Resposta do Backend

### Sucesso
```json
{
  "items": [
    {
      "id": "prod123",
      "title": "Notebook Dell",
      "kind": "product",
      "description": "Core i7, 16GB RAM",
      "priceBzr": "3500.00",
      "coverUrl": "https://...",
      "categoryPath": ["eletronicos", "notebooks"]
    }
  ],
  "page": {
    "total": 48,
    "limit": 24,
    "offset": 0
  }
}
```

### Erro
```json
{
  "error": "Loja não encontrada"
}
```

## Testes de Integração

### Mudança de Filtros
```typescript
// Estado inicial
const { items } = useStoreCatalog('6', initialFilters);
// items = [prod1, prod2, prod3]

// Usuário aplica filtro
updateFilter('categoryPath', ['eletronicos']);

// Hook detecta mudança em `filters`
// Cancela requisição anterior
// Faz nova busca com filtro aplicado
// items = [prod_eletronico1, prod_eletronico2]
```

### Paginação
```typescript
// Página 1 (offset=0)
const { items, page } = useStoreCatalog('6', { ...filters, page: 1 });
// page.total = 100, items.length = 24

// Usuário clica "Próxima página"
updateFilter('page', 2);

// Nova busca com offset=24
// items = [prod25, prod26, ..., prod48]
```

### Performance
```typescript
// Digitação rápida no SearchBar:
'n' -> 'no' -> 'not' -> 'note' -> 'noteb' -> 'notebo' -> 'noteboo' -> 'notebook'

// Graças ao debounce em useStoreFilters:
// - Apenas 1 atualização de filtro após 500ms
// - Apenas 1 chamada ao useStoreCatalog
// - Apenas 1 requisição HTTP
```

### Cancelamento em Sequência
```typescript
// Usuário aplica 3 filtros rapidamente:
updateFilter('kind', 'product');      // Req 1
updateFilter('categoryPath', ['x']);  // Req 1 cancelada, Req 2
updateFilter('priceMin', '100');      // Req 2 cancelada, Req 3

// Apenas Req 3 completa
// Apenas resultado de Req 3 é exibido
```

## Casos de Borda

### StoreId Inválido
```typescript
const { items, loading, error } = useStoreCatalog('', filters);

// Comportamento:
// - Não faz requisição
// - items = []
// - loading = false
// - error = null
```

### Resposta Vazia
```json
{
  "items": []
}
```
```typescript
// Estado:
// items = []
// page = { total: 0, limit: 24, offset: 0 }
// error = null
```

### Resposta Sem Page
```json
{
  "items": [...]
}
```
```typescript
// Hook cria page default:
// page = {
//   total: items.length,
//   limit: 24,
//   offset: 0
// }
```

### Timeout
```typescript
// Requisição demora > 8 segundos (timeout padrão)
// error = "A busca demorou muito tempo. Tente novamente."
// items = []
```

## Checklist de Validação

- ✅ URL construída corretamente
- ✅ Requisições canceladas ao mudar filtros
- ✅ Loading states corretos
- ✅ Erros tratados com mensagens específicas
- ✅ Paginação funciona
- ✅ Refetch funciona
- ✅ Cleanup ao desmontar
- ✅ Integração com useStoreFilters
