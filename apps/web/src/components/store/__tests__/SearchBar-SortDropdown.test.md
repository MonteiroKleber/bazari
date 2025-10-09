# Testes - SearchBar e SortDropdown

## SearchBar

### ✅ Funcionalidades

#### Renderização
- [x] Input renderizado corretamente
- [x] Placeholder padrão: "Buscar produtos na loja..."
- [x] Placeholder customizado aceito via prop
- [x] Ícone de lupa (Search) visível à esquerda
- [x] Ícone X só aparece quando há texto

#### Interação
- [x] Digitar chama onChange com valor
- [x] Botão X limpa o campo (onChange(''))
- [x] Botão X tem aria-label="Limpar busca"
- [x] Input tem classes do tema store

#### Estilos
- [x] Tema: store-ink, store-brand, store-bg
- [x] Border: store-ink/20
- [x] Focus: store-brand
- [x] Placeholder: store-ink/50

### Exemplos de Uso

#### Uso Básico
```tsx
import { SearchBar } from '@/components/store';

function MyComponent() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <SearchBar
      value={searchValue}
      onChange={setSearchValue}
    />
  );
}
```

#### Com useStoreFilters
```tsx
import { SearchBar } from '@/components/store';
import { useStoreFilters } from '@/hooks/useStoreFilters';

function CatalogFilters() {
  const { filters, updateFilter } = useStoreFilters();

  return (
    <SearchBar
      value={filters.q}
      onChange={(value) => updateFilter('q', value)}
      placeholder="Buscar produtos..."
    />
  );
}
```

#### Com Placeholder Customizado
```tsx
<SearchBar
  value={searchValue}
  onChange={setSearchValue}
  placeholder="Digite o nome do produto..."
/>
```

### Fluxo de Interação

```
1. Campo vazio:
   [🔍 Buscar produtos na loja...              ]

2. Usuário digita "note":
   [🔍 note                                  ×]
   - onChange('note') chamado
   - Botão X aparece

3. Usuário clica no X:
   [🔍 Buscar produtos na loja...              ]
   - onChange('') chamado
   - Botão X desaparece
```

### Layout Responsivo

```
Desktop:
┌──────────────────────────────────┬────────────┐
│ 🔍 Buscar...                     │ Ordenar ▼  │
└──────────────────────────────────┴────────────┘

Mobile:
┌──────────────────────────────────┐
│ 🔍 Buscar...                     │
├──────────────────┬───────────────┤
│ Ordenar ▼        │ Filtros (3)   │
└──────────────────┴───────────────┘
```

---

## SortDropdown

### ✅ Funcionalidades

#### Renderização
- [x] Select renderizado corretamente
- [x] 4 opções de ordenação
- [x] Valor atual destacado
- [x] Traduções via i18next

#### Opções
- [x] Relevância (relevance)
- [x] Mais recentes (createdDesc)
- [x] Menor preço (priceAsc)
- [x] Maior preço (priceDesc)

#### Interação
- [x] Selecionar opção chama onChange
- [x] Dropdown abre/fecha corretamente
- [x] Teclado funciona (Arrow, Enter, Esc)

#### Estilos
- [x] Tema: store-ink, store-brand, store-bg
- [x] Border: store-ink/20
- [x] Focus: store-brand
- [x] Item hover: store-brand/10

### Exemplos de Uso

#### Uso Básico
```tsx
import { SortDropdown } from '@/components/store';

function MyComponent() {
  const [sortValue, setSortValue] = useState<'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc'>('relevance');

  return (
    <SortDropdown
      value={sortValue}
      onChange={setSortValue}
    />
  );
}
```

#### Com useStoreFilters
```tsx
import { SortDropdown } from '@/components/store';
import { useStoreFilters } from '@/hooks/useStoreFilters';

function CatalogFilters() {
  const { filters, updateFilter } = useStoreFilters();

  return (
    <SortDropdown
      value={filters.sort}
      onChange={(value) => updateFilter('sort', value)}
    />
  );
}
```

### Fluxo de Interação

```
1. Estado inicial (relevance):
   [ Relevância ▼ ]

2. Usuário clica no dropdown:
   ┌─────────────────┐
   │ ✓ Relevância    │ ← Selecionado
   │   Mais recentes │
   │   Menor preço   │
   │   Maior preço   │
   └─────────────────┘

3. Usuário seleciona "Menor preço":
   [ Menor preço ▼ ]
   - onChange('priceAsc') chamado
   - Dropdown fecha
```

### Traduções (i18next)

```json
{
  "store": {
    "catalog": {
      "sort": {
        "label": "Ordenar",
        "relevance": "Relevância",
        "newest": "Mais recentes",
        "priceAsc": "Menor preço",
        "priceDesc": "Maior preço"
      }
    }
  }
}
```

---

## Layout Conjunto

### Desktop (≥768px)

```tsx
<div className="flex gap-4 mb-4">
  <SearchBar
    value={filters.q}
    onChange={(v) => updateFilter('q', v)}
  />
  <SortDropdown
    value={filters.sort}
    onChange={(v) => updateFilter('sort', v)}
  />
</div>
```

Renderiza:
```
┌────────────────────────────────────────┬──────────────┐
│ 🔍 Buscar produtos na loja...          │ Relevância ▼ │
└────────────────────────────────────────┴──────────────┘
```

### Mobile (<768px)

```tsx
<div className="space-y-2">
  <SearchBar
    value={filters.q}
    onChange={(v) => updateFilter('q', v)}
  />
  <div className="flex gap-2">
    <SortDropdown
      value={filters.sort}
      onChange={(v) => updateFilter('sort', v)}
    />
    <FilterButton />
  </div>
</div>
```

Renderiza:
```
┌────────────────────────────────────────┐
│ 🔍 Buscar produtos na loja...          │
├─────────────────────┬──────────────────┤
│ Relevância ▼        │ Filtros (3)      │
└─────────────────────┴──────────────────┘
```

---

## Integração Completa

### Exemplo: Barra de Filtros Completa

```tsx
import { SearchBar, SortDropdown } from '@/components/store';
import { useStoreFilters } from '@/hooks/useStoreFilters';

export function CatalogFilterBar() {
  const { filters, updateFilter } = useStoreFilters();

  return (
    <div>
      {/* Desktop: Lado a lado */}
      <div className="hidden lg:flex gap-4 mb-4">
        <SearchBar
          value={filters.q}
          onChange={(value) => updateFilter('q', value)}
        />
        <SortDropdown
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
        />
      </div>

      {/* Mobile: Empilhado */}
      <div className="block lg:hidden space-y-2 mb-4">
        <SearchBar
          value={filters.q}
          onChange={(value) => updateFilter('q', value)}
        />
        <div className="flex gap-2">
          <SortDropdown
            value={filters.sort}
            onChange={(value) => updateFilter('sort', value)}
          />
          {/* FilterButton será adicionado depois */}
        </div>
      </div>
    </div>
  );
}
```

---

## Acessibilidade

### SearchBar
- ✅ Input tem placeholder descritivo
- ✅ Botão X tem aria-label
- ✅ Navegável por teclado (Tab, Esc)
- ✅ Foco visível

### SortDropdown
- ✅ Select acessível (shadcn/ui)
- ✅ Arrow keys funcionam
- ✅ Enter seleciona
- ✅ Esc fecha dropdown
- ✅ Screen reader anuncia opção selecionada

---

## Checklist de Validação

### SearchBar
- [x] Componente criado
- [x] Props corretas (value, onChange, placeholder)
- [x] Ícone de lupa visível
- [x] Botão X aparece/desaparece
- [x] Tema store aplicado
- [x] Integra com useStoreFilters

### SortDropdown
- [x] Componente criado
- [x] Props corretas (value, onChange)
- [x] 4 opções disponíveis
- [x] Traduções configuradas
- [x] Tema store aplicado
- [x] Integra com useStoreFilters

### Layout
- [x] Desktop: lado a lado
- [x] Mobile: empilhado
- [x] Responsivo
- [x] Espaçamentos corretos
