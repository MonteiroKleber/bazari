# Testes - CategoryFilter

## ✅ Funcionalidades

### Renderização
- [x] Lista de categorias renderizada
- [x] Checkboxes com labels corretos
- [x] Contadores exibidos entre parênteses
- [x] Título "Categorias" exibido
- [x] Subcategorias indentadas (ml-6)
- [x] Máximo 2 níveis de hierarquia

### Hierarquia
- [x] Categorias raiz (nível 0) sem indentação
- [x] Subcategorias (nível 1) indentadas
- [x] Categorias organizadas em árvore
- [x] Subcategorias aparecem abaixo do pai

### Interação
- [x] Clicar checkbox seleciona categoria
- [x] Clicar novamente desmarca categoria
- [x] Seleção múltipla funciona
- [x] onChange chamado com array de paths

### Paginação (Ver mais)
- [x] Mostra max 10 categorias inicialmente
- [x] Botão "Ver mais" aparece se > 10
- [x] Clicar "Ver mais" mostra todas
- [x] Clicar "Ver menos" volta para 10
- [x] Contador correto (ex: "+5 categorias")

### Estilos
- [x] Tema store aplicado
- [x] Checkbox: store-brand quando marcado
- [x] Label: hover muda para store-brand
- [x] Contador: store-ink/50
- [x] Botão "Ver mais": store-brand

## Exemplos de Uso

### Uso Básico
```tsx
import { CategoryFilter } from '@/components/store';

function MyComponent() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    { path: ['eletronicos'], count: 15 },
    { path: ['eletronicos', 'smartphones'], count: 8 },
    { path: ['eletronicos', 'notebooks'], count: 7 },
    { path: ['roupas'], count: 12 },
    { path: ['roupas', 'camisetas'], count: 5 },
  ];

  return (
    <CategoryFilter
      categories={categories}
      selected={selectedCategories}
      onChange={setSelectedCategories}
    />
  );
}
```

### Com useStoreFilters e useStoreFacets
```tsx
import { CategoryFilter } from '@/components/store';
import { useStoreFilters } from '@/hooks/useStoreFilters';
import { useStoreFacets } from '@/hooks/useStoreFacets';

function CatalogFilters() {
  const { filters, updateFilter } = useStoreFilters();
  const { categories } = useStoreFacets('6', filters);

  return (
    <CategoryFilter
      categories={categories}
      selected={filters.categoryPath}
      onChange={(paths) => updateFilter('categoryPath', paths)}
    />
  );
}
```

## Estrutura de Dados

### Input: categories
```typescript
[
  { path: ['eletronicos'], count: 15 },
  { path: ['eletronicos', 'smartphones'], count: 8 },
  { path: ['eletronicos', 'notebooks'], count: 7 },
  { path: ['roupas'], count: 12 },
  { path: ['roupas', 'camisetas'], count: 5 },
  { path: ['alimentos'], count: 20 }
]
```

### Árvore Construída
```typescript
[
  {
    id: 'eletronicos',
    label: 'Eletrônicos',
    path: ['eletronicos'],
    count: 15,
    level: 0,
    children: [
      {
        id: 'eletronicos/smartphones',
        label: 'Smartphones',
        path: ['eletronicos', 'smartphones'],
        count: 8,
        level: 1,
        children: []
      },
      {
        id: 'eletronicos/notebooks',
        label: 'Notebooks',
        path: ['eletronicos', 'notebooks'],
        count: 7,
        level: 1,
        children: []
      }
    ]
  },
  {
    id: 'roupas',
    label: 'Roupas',
    path: ['roupas'],
    count: 12,
    level: 0,
    children: [...]
  }
]
```

### Output: selected
```typescript
// Formato: array de strings path.join('/')
['eletronicos/smartphones', 'roupas']

// Passado para onChange quando usuário seleciona
```

## UI Renderizada

### Desktop
```
▼ Categorias

  ☐ Eletrônicos (15)
    ☐ Smartphones (8)
    ☐ Notebooks (7)
  ☑ Roupas (12)           ← Selecionado
    ☐ Camisetas (5)
  ☐ Alimentos (20)
  ☐ Bebidas (18)
  ☐ Casa (10)
  ☐ Jardim (8)
  ☐ Esporte (15)
  ☐ Livros (12)
  ☐ Brinquedos (9)

  [▼ Ver mais (+3)]        ← Se houver mais de 10
```

### Com "Ver mais" Expandido
```
▼ Categorias

  ☐ Eletrônicos (15)
    ☐ Smartphones (8)
    ☐ Notebooks (7)
  ☑ Roupas (12)
    ☐ Camisetas (5)
  ☐ Alimentos (20)
  ☐ Bebidas (18)
  ☐ Casa (10)
  ☐ Jardim (8)
  ☐ Esporte (15)
  ☐ Livros (12)
  ☐ Brinquedos (9)
  ☐ Ferramentas (7)
  ☐ Automotivo (11)
  ☐ Pet (6)

  [▲ Ver menos]
```

## Fluxo de Interação

### Selecionar Categoria
```
1. Estado inicial:
   selected = []
   UI: todos checkboxes desmarcados

2. Usuário clica em "Eletrônicos":
   onChange(['eletronicos']) chamado

3. Próximo render:
   selected = ['eletronicos']
   UI: ☑ Eletrônicos (15)

4. useStoreFilters atualiza URL:
   ?categoryPath=eletronicos

5. useStoreCatalog busca com filtro:
   - Mostra apenas produtos eletrônicos
```

### Seleção Múltipla
```
1. Categoria "Eletrônicos" já selecionada:
   selected = ['eletronicos']

2. Usuário clica em "Roupas":
   onChange(['eletronicos', 'roupas']) chamado

3. Próximo render:
   selected = ['eletronicos', 'roupas']
   UI: ☑ Eletrônicos (15)
       ☑ Roupas (12)

4. useStoreCatalog busca:
   - Produtos eletrônicos OU roupas
```

### Desmarcar
```
1. Estado: selected = ['eletronicos', 'roupas']

2. Usuário clica em "Eletrônicos" novamente:
   onChange(['roupas']) chamado

3. Próximo render:
   selected = ['roupas']
   UI: ☐ Eletrônicos (15)
       ☑ Roupas (12)
```

## Hierarquia e Indentação

### Nível 0 (Raiz)
```
☐ Eletrônicos (15)     ← ml-0 (sem indentação)
```

### Nível 1 (Subcategoria)
```
  ☐ Smartphones (8)    ← ml-6 (indentado)
```

### Nível 2+ (Ignorado)
```
// path: ['eletronicos', 'smartphones', 'android']
// Categoria com 3 níveis é ignorada (level > 1)
```

## Integração com Facets

### Dados do Backend
```json
{
  "facets": {
    "categories": [
      { "path": ["eletronicos"], "count": 15 },
      { "path": ["eletronicos", "smartphones"], "count": 8 },
      { "path": ["eletronicos", "notebooks"], "count": 7 }
    ]
  }
}
```

### Hook useStoreFacets
```typescript
const { categories } = useStoreFacets('6', filters);

// categories já vem no formato correto:
// [
//   { path: ['eletronicos'], count: 15 },
//   ...
// ]
```

### Passar para CategoryFilter
```tsx
<CategoryFilter
  categories={categories}  // Direto do hook
  selected={filters.categoryPath}
  onChange={(paths) => updateFilter('categoryPath', paths)}
/>
```

## Casos de Borda

### Categorias Vazias
```typescript
categories = []

// Componente retorna null
// Não renderiza nada
```

### Sem Subcategorias
```typescript
categories = [
  { path: ['eletronicos'], count: 15 },
  { path: ['roupas'], count: 12 }
]

// Renderiza apenas categorias raiz
// Sem indentação
```

### Apenas Subcategorias (Sem Pai)
```typescript
categories = [
  { path: ['eletronicos', 'smartphones'], count: 8 }
]

// Categoria órfã é tratada como raiz
// level = 1, mas renderizada sem pai
```

### Mais de 2 Níveis
```typescript
categories = [
  { path: ['eletronicos', 'smartphones', 'android'], count: 3 }
]

// level = 2 (> 1)
// Categoria ignorada (não renderizada)
```

## Acessibilidade

- ✅ Checkbox acessível (shadcn/ui)
- ✅ Label associado ao checkbox (htmlFor)
- ✅ Label clicável (cursor-pointer)
- ✅ Navegação por teclado (Tab, Space)
- ✅ Estado visível (checked/unchecked)
- ✅ Botão "Ver mais" acessível

## Checklist de Validação

- [x] Componente criado
- [x] Props corretas (categories, selected, onChange)
- [x] Árvore hierárquica construída
- [x] Checkboxes funcionam
- [x] Seleção múltipla funciona
- [x] Contadores exibidos
- [x] Indentação correta
- [x] Botão "Ver mais" funciona
- [x] Tema store aplicado
- [x] Traduções configuradas
- [x] Integra com useStoreFacets
