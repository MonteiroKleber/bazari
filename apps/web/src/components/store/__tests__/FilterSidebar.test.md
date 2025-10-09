# FilterSidebar - Documentação de Testes

## Componente
`/apps/web/src/components/store/FilterSidebar.tsx`

## Objetivo
Container de filtros para layout desktop. Agrupa todos os componentes de filtro em uma sidebar fixa com largura de 280px.

---

## ✅ Checklist de Funcionalidades

### Layout
- [ ] Largura fixa de 280px
- [ ] Sticky position (top-8)
- [ ] Visível apenas em desktop (hidden lg:block)
- [ ] Altura ajustável ao conteúdo (h-fit)
- [ ] Espaçamento interno adequado (p-4)

### Componentes Incluídos
- [ ] SearchBar renderizado e funcional
- [ ] CategoryFilter renderizado (se houver categorias)
- [ ] PriceFilter renderizado
- [ ] TypeFilter renderizado
- [ ] Botão "Limpar Filtros" renderizado

### Interações
- [ ] onChange propagado corretamente para cada filtro
- [ ] onClearAll chamado ao clicar em "Limpar Filtros"
- [ ] Botão desabilitado quando não há filtros ativos
- [ ] Botão habilitado quando há filtros ativos

### Estilos
- [ ] Background: bg-store-bg/95
- [ ] Border: border-store-ink/15
- [ ] Rounded corners: rounded-lg
- [ ] Espaçamento entre seções (space-y-6)
- [ ] Tema da loja aplicado em todos os componentes

---

## 🧪 Cenários de Teste

### 1. Renderização Inicial
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

const facets = {
  categories: [
    { path: ['Eletrônicos'], count: 50 },
    { path: ['Roupas'], count: 30 },
  ],
  priceRange: { min: '10', max: '1000' },
  attributes: {},
};

<FilterSidebar
  storeId="store-123"
  filters={filters}
  facets={facets}
  onFilterChange={handleChange}
  onClearAll={handleClear}
/>

// Resultado:
// - Sidebar visível em lg+
// - SearchBar vazio
// - CategoryFilter com 2 categorias
// - PriceFilter com range 10-1000
// - TypeFilter com "Todos" selecionado
// - Botão "Limpar Filtros" desabilitado (sem filtros ativos)
```

### 2. Filtros Ativos
```typescript
const filters = {
  q: 'laptop',
  kind: 'product',
  categoryPath: ['Eletrônicos'],
  priceMin: '500',
  priceMax: '2000',
  attrs: {},
  sort: 'priceAsc',
  page: 1,
};

// Resultado:
// - SearchBar com "laptop"
// - CategoryFilter com "Eletrônicos" marcado
// - PriceFilter com 500-2000
// - TypeFilter com "Apenas Produtos" selecionado
// - Botão "Limpar Filtros" HABILITADO
```

### 3. Limpar Todos os Filtros
```typescript
// Estado: filtros ativos conforme cenário 2
// Usuário clica em "Limpar Filtros"
// - onClearAll() é chamado
// - Pai reseta todos os filtros
// - Re-render com filters = DEFAULT_FILTERS
// - SearchBar vazio
// - Checkboxes desmarcados
// - Inputs de preço limpos
// - TypeFilter volta para "Todos"
// - Botão desabilitado novamente
```

### 4. Mudança de Busca Textual
```typescript
// Usuário digita "mouse" no SearchBar
// - onFilterChange('q', 'mouse') é chamado após 500ms
// - Pai atualiza filters.q = 'mouse'
// - useStoreCatalog refetch com novo filtro
// - Botão "Limpar Filtros" habilitado
```

### 5. Seleção de Categoria
```typescript
// Usuário marca "Eletrônicos > Notebooks"
// - onFilterChange('categoryPath', ['Eletrônicos', 'Notebooks'])
// - Pai atualiza filters.categoryPath
// - useStoreCatalog refetch
// - Botão habilitado
```

### 6. Mudança de Preço
```typescript
// Usuário digita min=100, max=500
// - Após 500ms cada input:
//   - onFilterChange('priceMin', '100')
//   - onFilterChange('priceMax', '500')
// - Pai atualiza ambos
// - Busca refeita com novo range
```

### 7. Mudança de Tipo
```typescript
// Usuário seleciona "Apenas Serviços"
// - onFilterChange('kind', 'service')
// - Atualização imediata (sem debounce)
// - Catálogo filtra para serviços
```

### 8. Facets Vazios
```typescript
const facets = {
  categories: [], // Nenhuma categoria disponível
  priceRange: { min: '0', max: '0' },
  attributes: {},
};

// Resultado:
// - SearchBar renderizado normalmente
// - CategoryFilter NÃO renderizado (condicional)
// - PriceFilter renderizado (mas range 0-0)
// - TypeFilter renderizado normalmente
```

---

## 🎨 Testes Visuais

### Desktop (lg+)
- [ ] Sidebar visível à esquerda do conteúdo
- [ ] Largura consistente (280px)
- [ ] Sticky ao scrollar (fica fixo no topo)
- [ ] top-8 mantém espaçamento do topo
- [ ] Não sobrepõe outros elementos

### Mobile/Tablet (< lg)
- [ ] Sidebar OCULTA (hidden lg:block)
- [ ] FilterModal/FilterButton devem ser usados no lugar
- [ ] Não afeta layout em telas pequenas

### Scroll Behavior
- [ ] Sticky funciona corretamente ao scrollar catálogo
- [ ] Sidebar não ultrapassa viewport (h-fit)
- [ ] Conteúdo interno scrollável se muito longo

### Espaçamento
- [ ] space-y-6 entre cada seção de filtro
- [ ] p-4 padding interno
- [ ] Não há espaços duplos ou inconsistentes

### Tema
- [ ] Background levemente transparente (bg-store-bg/95)
- [ ] Border sutil (border-store-ink/15)
- [ ] Todos os componentes filhos usam tema da loja
- [ ] Consistência visual entre filtros

---

## ♿ Acessibilidade

### Estrutura Semântica
- [ ] `<aside>` tag semântica para sidebar
- [ ] Cada filtro tem heading apropriado (h3)
- [ ] Landmarks corretamente definidos

### Navegação por Teclado
- [ ] Tab navega entre filtros sequencialmente
- [ ] Ordem de foco lógica (top to bottom)
- [ ] Botão "Limpar Filtros" alcançável via teclado
- [ ] Focus visible em todos os elementos interativos

### Screen Readers
- [ ] Sidebar anunciada como "complementary" ou "navigation"
- [ ] Cada seção de filtro anunciada com título
- [ ] Estado do botão (habilitado/desabilitado) anunciado
- [ ] Mudanças de filtro fornecem feedback

### Focus Management
- [ ] Não perde foco ao atualizar filtros
- [ ] Focus trap não necessário (não é modal)
- [ ] Skip link para pular filtros (opcional)

---

## 🔧 Testes de Integração

### Com useStoreFilters
```typescript
function StorePublicPage() {
  const { filters, updateFilter, clearAllFilters } = useStoreFilters();
  const { categories, priceRange, attributes } = useStoreFacets(storeId, filters);

  const facets = { categories, priceRange, attributes };

  return (
    <FilterSidebar
      storeId={storeId}
      filters={filters}
      facets={facets}
      onFilterChange={updateFilter}
      onClearAll={clearAllFilters}
    />
  );
}

// Fluxo completo:
// 1. Usuário interage com filtro
// 2. onFilterChange(key, value) chamado
// 3. updateFilter atualiza estado e URL
// 4. useStoreCatalog e useStoreFacets reagem
// 5. Sidebar re-renderiza com novos dados
```

### Com useStoreFacets
```typescript
// Facets atualizados quando filtros mudam
// - Categorias excluem filtro de categoria (lógica especial)
// - Preço exclui filtro de preço
// - Permite ver "o que mais está disponível"

// Exemplo:
// Filtros ativos: categoryPath=['Eletrônicos']
// Facets retornam: ['Eletrônicos', 'Roupas', 'Livros']
// Usuário pode ver outras categorias disponíveis
```

### Sincronização de Estado
```typescript
// Props filters e facets sempre sincronizados
// - hasActiveFilters calculado dinamicamente
// - Botão habilitado/desabilitado em tempo real
// - Nenhum estado interno duplicado
```

---

## 🐛 Edge Cases

### 1. StoreId Inválido
```typescript
// storeId = ''
// - useStoreFacets não busca (guard clause)
// - Facets ficam vazios
// - Sidebar renderiza mas sem dados
```

### 2. Facets Loading
```typescript
// useStoreFacets ainda carregando
// - facets = { categories: [], priceRange: {min:'0', max:'0'}, attributes: {} }
// - Sidebar renderiza normalmente
// - CategoryFilter não aparece (array vazio)
// - Outros filtros funcionam
```

### 3. Erro ao Carregar Facets
```typescript
// useStoreFacets.error !== null
// - Sidebar continua funcional
// - Filtros básicos (busca, tipo) funcionam
// - CategoryFilter não renderizado
// - Usuário pode continuar navegando
```

### 4. Muitas Categorias
```typescript
// 100+ categorias retornadas
// - CategoryFilter tem "Show More" button
// - Inicialmente mostra apenas 10
// - Sidebar não fica excessivamente longa
// - Scroll interno se necessário
```

### 5. Range de Preço Inválido
```typescript
// facets.priceRange = { min: '1000', max: '100' } (min > max)
// - PriceFilter renderiza normalmente
// - Validação impede entrada inválida
// - Usuário pode corrigir
```

### 6. Todos os Filtros Ativos
```typescript
const filters = {
  q: 'laptop',
  kind: 'product',
  categoryPath: ['Eletrônicos', 'Notebooks'],
  priceMin: '500',
  priceMax: '2000',
  attrs: { marca: ['Dell', 'HP'], cor: ['Preto'] },
  sort: 'priceAsc',
  page: 1,
};

// - hasActiveFilters = true
// - Botão "Limpar Filtros" habilitado
// - Click limpa TODOS os filtros de uma vez
// - Volta para estado inicial
```

### 7. Props Mudando Rapidamente
```typescript
// Filtros mudando rapidamente (digitação rápida)
// - Cada mudança dispara re-render
// - Debounce em SearchBar e PriceFilter
// - Performance OK (componentes leves)
// - AbortController cancela requests antigos
```

---

## 📝 Notas de Implementação

### Responsividade
- `hidden lg:block` esconde em mobile/tablet
- Mobile usa FilterModal (PROMPT 3.2) com mesmos componentes
- Mesma lógica de estado, UI diferente

### Sticky Position
- `sticky top-8` mantém sidebar visível ao scrollar
- `h-fit` garante que altura se ajusta ao conteúdo
- Não precisa de JavaScript para scroll behavior

### Condicional de CategoryFilter
- Renderizado apenas se `facets.categories.length > 0`
- Evita seção vazia quando não há categorias
- Outros filtros sempre renderizados

### Cálculo de hasActiveFilters
- Duplicado de useStoreFilters (poderia ser prop)
- Mais simples do que passar prop adicional
- Lógica trivial, sem impacto de performance

### onFilterChange Múltiplas Chamadas
- PriceFilter chama duas vezes (min e max)
- useStoreFilters lida corretamente (batching do React)
- Apenas uma re-render e uma atualização de URL

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Loading States**
   - Skeleton durante carregamento de facets
   - Spinner no botão "Limpar Filtros" ao processar
   - Feedback visual durante debounce

2. **Animações**
   - Collapse/expand de seções de filtro
   - Fade in ao atualizar facets
   - Smooth scroll ao aplicar filtro

3. **Seções Colapsáveis**
   - Accordion para cada tipo de filtro
   - Salvar estado expandido/colapsado
   - Útil quando há muitos filtros

4. **Contador de Resultados**
   - "42 produtos encontrados" no topo
   - Atualiza em tempo real
   - Mostra impacto de cada filtro

5. **Sugestões de Filtros**
   - "Você quis dizer..." para typos
   - Filtros populares/recomendados
   - Baseado em histórico de buscas

6. **Salvar Filtros**
   - "Salvar esta busca" button
   - Notificações de novos itens
   - Atalhos para filtros salvos

7. **Drag to Resize**
   - Usuário pode ajustar largura da sidebar
   - Salvar preferência em localStorage
   - Min/max width constraints
