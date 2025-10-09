# Testes do useStoreFacets

## Checklist de Funcionalidades

### ✅ Inicialização
- [x] Hook busca facets ao montar se storeId válido
- [x] Hook não busca se storeId vazio
- [x] Loading state inicia como true
- [x] Facets iniciam vazios

### ✅ Lógica Especial de Exclusão
- [x] categoryPath é EXCLUÍDO da busca de facets
- [x] priceMin é EXCLUÍDO da busca de facets
- [x] priceMax é EXCLUÍDO da busca de facets
- [x] Outros filtros (q, kind, attrs) são MANTIDOS
- [x] Permite ver "o que mais está disponível"

### ✅ Estrutura de Dados
- [x] categories: Array<{ path: string[]; count: number }>
- [x] priceRange: { min: string; max: string }
- [x] priceBuckets: Array<{ range: string; count: number }>
- [x] attributes: Record<string, Array<{ value: string; count: number }>>

### ✅ Estados de Loading
- [x] loading=true durante fetch
- [x] loading=false após sucesso
- [x] loading=false após erro
- [x] Facets atualizados após sucesso

### ✅ Tratamento de Erros
- [x] Erro genérico mostra mensagem
- [x] Facets zerados em caso de erro
- [x] Error state armazena mensagem

### ✅ Cancelamento de Requisições
- [x] Requisição anterior é cancelada ao mudar filtros
- [x] AbortController.abort() é chamado
- [x] Erros de requisições canceladas são ignorados

## Exemplos de Uso

### Caso 1: Busca Sem Filtros
```typescript
const filters = {
  q: '',
  kind: 'all',
  categoryPath: [],
  priceMin: '',
  priceMax: '',
  attrs: {},
  sort: 'relevance',
  page: 1,
};

const { categories, priceRange, attributes } = useStoreFacets('6', filters);

// URL gerada:
// /search?onChainStoreId=6&limit=1

// Retorna TODOS os facets disponíveis:
// categories = [
//   { path: ['eletronicos'], count: 15 },
//   { path: ['roupas'], count: 12 },
//   { path: ['alimentos'], count: 8 }
// ]
// priceRange = { min: '10.00', max: '5000.00' }
```

### Caso 2: Com Categoria Selecionada (Lógica Especial)
```typescript
const filters = {
  q: '',
  kind: 'all',
  categoryPath: ['eletronicos'], // ← Categoria ativa
  priceMin: '',
  priceMax: '',
  attrs: {},
  sort: 'relevance',
  page: 1,
};

const { categories } = useStoreFacets('6', filters);

// URL gerada (categoryPath EXCLUÍDO):
// /search?onChainStoreId=6&limit=1

// IMPORTANTE: categoryPath NÃO aparece na URL!
// Isso permite ver OUTRAS categorias disponíveis:
// categories = [
//   { path: ['eletronicos'], count: 15 },  ← Ainda aparece
//   { path: ['roupas'], count: 12 },       ← Outras opções
//   { path: ['alimentos'], count: 8 }
// ]
```

### Caso 3: Com Preço Selecionado (Lógica Especial)
```typescript
const filters = {
  q: '',
  kind: 'all',
  categoryPath: [],
  priceMin: '100',  // ← Preço ativo
  priceMax: '500',  // ← Preço ativo
  attrs: {},
  sort: 'relevance',
  page: 1,
};

const { priceRange } = useStoreFacets('6', filters);

// URL gerada (price EXCLUÍDO):
// /search?onChainStoreId=6&limit=1

// IMPORTANTE: priceMin/priceMax NÃO aparecem na URL!
// Retorna o range COMPLETO disponível:
// priceRange = { min: '10.00', max: '5000.00' }
// (não limitado a 100-500)
```

### Caso 4: Com Busca e Tipo (Mantidos)
```typescript
const filters = {
  q: 'notebook',      // ← Mantido
  kind: 'product',    // ← Mantido
  categoryPath: ['eletronicos'], // ← Excluído
  priceMin: '500',    // ← Excluído
  priceMax: '2000',   // ← Excluído
  attrs: { cor: ['preto'] }, // ← Mantido
  sort: 'relevance',
  page: 1,
};

const { categories, attributes } = useStoreFacets('6', filters);

// URL gerada:
// /search?onChainStoreId=6&q=notebook&kind=product&attrs[cor]=preto&limit=1

// Facets refletem busca + tipo + atributos:
// categories = categorias que têm notebooks pretos
// attributes = { tamanho: [...], marca: [...] } apenas de notebooks pretos
```

### Caso 5: Atributos Dinâmicos
```typescript
const { attributes } = useStoreFacets('6', filters);

// Retorna apenas atributos que existem nos produtos:
// attributes = {
//   cor: [
//     { value: 'preto', count: 8 },
//     { value: 'branco', count: 5 },
//     { value: 'azul', count: 3 }
//   ],
//   tamanho: [
//     { value: 'P', count: 4 },
//     { value: 'M', count: 12 },
//     { value: 'G', count: 9 }
//   ],
//   marca: [
//     { value: 'Samsung', count: 6 },
//     { value: 'Apple', count: 4 }
//   ]
// }
```

## Resposta do Backend

### Sucesso Completo
```json
{
  "items": [...],
  "page": {...},
  "facets": {
    "categories": [
      { "path": ["eletronicos"], "count": 15 },
      { "path": ["eletronicos", "smartphones"], "count": 8 },
      { "path": ["eletronicos", "notebooks"], "count": 7 },
      { "path": ["roupas"], "count": 12 }
    ],
    "price": {
      "min": "10.00",
      "max": "5000.00",
      "buckets": [
        { "range": "0-50", "count": 5 },
        { "range": "51-100", "count": 12 },
        { "range": "101-500", "count": 20 },
        { "range": "501-1000", "count": 8 },
        { "range": "1001+", "count": 3 }
      ]
    },
    "attributes": {
      "cor": [
        { "value": "preto", "count": 8 },
        { "value": "branco", "count": 5 }
      ],
      "tamanho": [
        { "value": "P", "count": 4 },
        { "value": "M", "count": 12 }
      ]
    }
  }
}
```

### Resposta Vazia
```json
{
  "items": [],
  "facets": {}
}
```

## Lógica de Exclusão de Filtros

### Por que Excluir?

**Problema:**
```
Se usuário filtra por "Eletrônicos",
E facets incluem esse filtro,
Então facets só mostram "Eletrônicos" (o que já está selecionado).
Usuário não vê outras categorias disponíveis!
```

**Solução:**
```
Ao buscar facets de categoria:
- EXCLUIR filtro de categoria
- Permite ver TODAS categorias
- Usuário pode trocar de "Eletrônicos" para "Roupas"
```

**Mesmo conceito para preço:**
```
Se usuário filtra por 100-500 BZR,
E facets incluem esse filtro,
Então priceRange seria { min: 100, max: 500 }.
Usuário não vê que há produtos de 10-100 ou 500+!
```

### Fluxo Visual

```
1. Sem filtros:
   Categories: [Eletrônicos (15), Roupas (12), Alimentos (8)]

2. Usuário seleciona "Eletrônicos":
   - useStoreCatalog busca COM filtro categoryPath=['eletronicos']
     → Mostra apenas 15 produtos eletrônicos

   - useStoreFacets busca SEM filtro categoryPath
     → Categories: [Eletrônicos (15), Roupas (12), Alimentos (8)]
     → Usuário ainda vê outras opções!

3. Usuário pode trocar para "Roupas" facilmente
```

## Testes de Integração

### Interação com useStoreFilters
```typescript
const { filters, updateFilter } = useStoreFilters();
const { categories } = useStoreFacets('6', filters);

// Inicial: categories = [A, B, C]

updateFilter('categoryPath', ['A']);
// useStoreFacets busca novamente (sem categoryPath)
// categories = [A, B, C] (ainda mostra todas!)
```

### Interação com useStoreCatalog
```typescript
const { filters } = useStoreFilters();
const { items } = useStoreCatalog('6', filters);
const { categories } = useStoreFacets('6', filters);

// Filtro: categoryPath=['eletronicos']

// useStoreCatalog:
// - Busca COM filtro
// - items = apenas eletrônicos

// useStoreFacets:
// - Busca SEM filtro de categoria
// - categories = todas categorias disponíveis
```

## Casos de Borda

### Facets Vazios
```json
{
  "facets": {}
}
```
```typescript
// Estado:
// categories = []
// priceRange = { min: '0', max: '0' }
// priceBuckets = []
// attributes = {}
```

### Apenas Alguns Facets
```json
{
  "facets": {
    "categories": [...]
  }
}
```
```typescript
// Estado:
// categories = [...] (preenchido)
// price = { min: '0', max: '0' } (default)
// attributes = {} (vazio)
```

### Erro na Requisição
```typescript
// error = "Erro ao carregar facets."
// Todos facets zerados
// loading = false
```

## Checklist de Validação

- ✅ categoryPath excluído da URL de facets
- ✅ priceMin/priceMax excluídos da URL de facets
- ✅ q, kind, attrs mantidos na URL
- ✅ Cancelamento funciona
- ✅ Loading states corretos
- ✅ Erros tratados
- ✅ Facets estruturados corretamente
- ✅ Integra com useStoreFilters
- ✅ Permite ver "o que mais está disponível"
