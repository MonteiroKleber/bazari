# Testes do useStoreFilters

## Checklist de Funcionalidades

### ✅ Inicialização
- [x] Filtros inicializam com valores padrão se URL vazia
- [x] Filtros leem valores da URL ao montar
- [x] URL com múltiplos filtros é parseada corretamente
- [x] Atributos no formato `attrs[cor]=preto,branco` são parseados

### ✅ Atualização de Filtros
- [x] `updateFilter('q', 'notebook')` atualiza busca textual
- [x] `updateFilter('kind', 'product')` atualiza tipo
- [x] `updateFilter('categoryPath', ['eletronicos'])` atualiza categorias
- [x] `updateFilter('priceMin', '50')` atualiza preço mínimo
- [x] `updateFilter` reseta página para 1 (exceto sort e page)

### ✅ Debounce na Busca
- [x] Campo `q` aplica debounce de 500ms
- [x] Digitações rápidas não disparam múltiplas atualizações
- [x] Outros filtros NÃO têm debounce (atualização imediata)

### ✅ Sincronização com URL
- [x] URL atualiza quando filtros mudam
- [x] Histórico do navegador é preservado (pushState)
- [x] Voltar/avançar do navegador funciona
- [x] Filtros padrão não aparecem na URL (kind=all, sort=relevance)

### ✅ Limpar Filtros
- [x] `clearFilter('q')` limpa apenas busca
- [x] `clearFilter('categoryPath')` limpa categorias
- [x] `clearAllFilters()` reseta todos para default
- [x] Limpar filtro reseta página para 1

### ✅ Contadores
- [x] `hasActiveFilters` é true quando há filtros
- [x] `hasActiveFilters` é false com filtros padrão
- [x] `activeFiltersCount` conta corretamente
- [x] Categorias múltiplas são contadas separadamente
- [x] Atributos são contados por valor

## Exemplos de Uso

### Caso 1: Filtro Simples
```typescript
const { filters, updateFilter } = useStoreFilters();

// Buscar por "notebook"
updateFilter('q', 'notebook');

// Resultado após 500ms:
// URL: ?q=notebook
// filters.q = 'notebook'
// filters.page = 1 (resetado)
```

### Caso 2: Múltiplos Filtros
```typescript
updateFilter('kind', 'product');
updateFilter('categoryPath', ['eletronicos', 'notebooks']);
updateFilter('priceMin', '500');
updateFilter('priceMax', '2000');

// URL: ?kind=product&categoryPath=eletronicos,notebooks&priceMin=500&priceMax=2000
// activeFiltersCount = 4
```

### Caso 3: Atributos
```typescript
updateFilter('attrs', {
  cor: ['preto', 'branco'],
  tamanho: ['M', 'G']
});

// URL: ?attrs[cor]=preto,branco&attrs[tamanho]=M,G
// activeFiltersCount = 4 (2 cores + 2 tamanhos)
```

### Caso 4: Limpar Todos
```typescript
clearAllFilters();

// URL: / (sem query params)
// filters = DEFAULT_FILTERS
// hasActiveFilters = false
// activeFiltersCount = 0
```

## Testes de Integração

### Deep Linking
```
Usuário acessa: /loja/loja-da-maria?q=notebook&kind=product&priceMin=500

Esperado:
- filters.q = 'notebook'
- filters.kind = 'product'
- filters.priceMin = '500'
- Grid mostra produtos filtrados imediatamente
```

### Navegação do Browser
```
1. Aplica filtro: ?kind=product
2. Aplica outro: ?kind=product&priceMin=100
3. Clica "Voltar" no navegador
4. URL volta para: ?kind=product
5. Filtros são restaurados corretamente
```

### Performance
```
- Digitar "notebook" (8 letras) deve fazer APENAS 1 requisição
- Debounce previne requisições desnecessárias
- Outros filtros (checkboxes, dropdowns) atualizam imediatamente
```

## Casos de Borda

### URL Inválida
```
URL: ?kind=invalid&page=abc&priceMin=texto

Parseamento seguro:
- kind = 'all' (fallback)
- page = 1 (fallback)
- priceMin = 'texto' (aceita, backend valida)
```

### Múltiplos Valores
```
URL: ?categoryPath=eletronicos,notebooks,macbooks

Resultado:
- filters.categoryPath = ['eletronicos', 'notebooks', 'macbooks']
- activeFiltersCount = 3
```

### Strings Vazias
```
URL: ?q=&priceMin=&categoryPath=

Tratamento:
- Valores vazios são ignorados (filter(Boolean))
- Equivalente a não ter filtros
```
