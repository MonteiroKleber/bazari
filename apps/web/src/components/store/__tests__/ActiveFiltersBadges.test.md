# ActiveFiltersBadges - Documentação de Testes

## Componente
`/apps/web/src/components/store/ActiveFiltersBadges.tsx`

## Objetivo
Lista de badges mostrando filtros ativos com opção de remoção individual ou em massa. Fornece feedback visual dos filtros aplicados.

---

## ✅ Checklist de Funcionalidades

### Renderização
- [ ] Não renderiza nada se não há filtros ativos (return null)
- [ ] Badge para cada filtro ativo
- [ ] Botão "Limpar tudo" sempre visível se há filtros
- [ ] Formatação correta para cada tipo de filtro

### Tipos de Filtros
- [ ] Busca textual: "Busca: notebook"
- [ ] Tipo: "Tipo: Produtos" ou "Tipo: Serviços"
- [ ] Categoria: "Categoria: Eletrônicos" (última do path)
- [ ] Preço: "Preço: 50 - 200 BZR"
- [ ] Atributos: "Cor: Preto", "Marca: Dell"

### Remoção Individual
- [ ] Click no X remove filtro específico
- [ ] onRemoveFilter chamado com parâmetros corretos
- [ ] Badge desaparece após remoção
- [ ] Outros filtros permanecem intactos

### Remoção em Massa
- [ ] "Limpar tudo" chama onClearAll
- [ ] Todos os badges desaparecem
- [ ] Componente não renderiza mais (return null)

### Estilos
- [ ] Badges com variant secondary
- [ ] Background: bg-store-bg
- [ ] Border: border-store-ink/20
- [ ] Gap entre badges (gap-2)
- [ ] Wrap em múltiplas linhas (flex-wrap)

---

## 🧪 Cenários de Teste

### 1. Sem Filtros Ativos
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

<ActiveFiltersBadges
  filters={filters}
  onRemoveFilter={handleRemove}
  onClearAll={handleClearAll}
/>

// Resultado:
// - return null
// - Nada renderizado no DOM
// - Não ocupa espaço
```

### 2. Apenas Busca Textual
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

// Resultado:
// - Badge: "Busca: notebook" [X]
// - Botão "Limpar tudo"
// - 2 elementos no total
```

### 3. Múltiplos Filtros
```typescript
const filters = {
  q: 'laptop',
  kind: 'product',
  categoryPath: ['Eletrônicos', 'Notebooks'],
  priceMin: '500',
  priceMax: '2000',
  attrs: { Cor: ['Preto', 'Prata'], Marca: ['Dell'] },
  sort: 'priceAsc',
  page: 1,
};

// Resultado:
// - Badge: "Busca: laptop" [X]
// - Badge: "Tipo: Produtos" [X]
// - Badge: "Categoria: Eletrônicos" [X]
// - Badge: "Categoria: Notebooks" [X]
// - Badge: "Preço: 500 - 2000 BZR" [X]
// - Badge: "Cor: Preto" [X]
// - Badge: "Cor: Prata" [X]
// - Badge: "Marca: Dell" [X]
// - Botão "Limpar tudo"
// - 9 elementos no total
```

### 4. Remover Busca
```typescript
// Filtros: q='laptop'
// Usuário clica no X do badge "Busca: laptop"
// - handleRemoveBadge('q') executado
// - onRemoveFilter('q') chamado
// - Pai atualiza filters.q = ''
// - Re-render sem badge de busca
```

### 5. Remover Tipo
```typescript
// Filtros: kind='product'
// Usuário clica no X do badge "Tipo: Produtos"
// - handleRemoveBadge('kind') executado
// - onRemoveFilter('kind') chamado
// - Pai atualiza filters.kind = 'all'
// - Re-render sem badge de tipo
```

### 6. Remover Categoria
```typescript
// Filtros: categoryPath=['Eletrônicos', 'Notebooks']
// Usuário clica no X do badge "Categoria: Notebooks"
// - handleRemoveBadge('categoryPath', 'Notebooks') executado
// - newPaths = ['Eletrônicos']
// - onRemoveFilter('categoryPath', 'Eletrônicos') chamado
// - Badge "Notebooks" desaparece
// - Badge "Eletrônicos" permanece
```

### 7. Remover Preço
```typescript
// Filtros: priceMin='500', priceMax='2000'
// Usuário clica no X do badge "Preço: 500 - 2000 BZR"
// - handleRemoveBadge('priceMin') executado
// - onRemoveFilter('priceMin', '') chamado
// - onRemoveFilter('priceMax', '') chamado
// - Badge de preço desaparece
// - Ambos os valores limpos
```

### 8. Remover Atributo
```typescript
// Filtros: attrs={ Cor: ['Preto', 'Prata'], Marca: ['Dell'] }
// Usuário clica no X do badge "Cor: Preto"
// - handleRemoveBadge('attrs', 'Cor:Preto') executado
// - value.split(':') = ['Cor', 'Preto']
// - newValues = ['Prata'] (remove 'Preto')
// - newAttrs = { Cor: ['Prata'], Marca: ['Dell'] }
// - onRemoveFilter('attrs', newAttrs) chamado
// - Badge "Cor: Preto" desaparece
// - Badge "Cor: Prata" permanece
```

### 9. Remover Último Valor de Atributo
```typescript
// Filtros: attrs={ Cor: ['Preto'] }
// Usuário clica no X do badge "Cor: Preto"
// - newValues = [] (vazio)
// - newAttrs = {} (remove chave 'Cor' completamente)
// - onRemoveFilter('attrs', {}) chamado
// - Badge desaparece
```

### 10. Limpar Tudo
```typescript
// Filtros: múltiplos ativos
// Usuário clica em "Limpar tudo"
// - onClearAll() chamado
// - Pai reseta todos os filtros
// - Re-render com filters = DEFAULT_FILTERS
// - badges.length = 0
// - return null (nada renderizado)
```

### 11. Preço com Apenas Min
```typescript
// Filtros: priceMin='500', priceMax=''
// Badge mostra: "Preço: 500 - ∞ BZR"
```

### 12. Preço com Apenas Max
```typescript
// Filtros: priceMin='', priceMax='2000'
// Badge mostra: "Preço: 0 - 2000 BZR"
```

---

## 🎨 Testes Visuais

### Layout
- [ ] Flex wrap (badges quebram linha se necessário)
- [ ] Gap consistente entre badges (gap-2)
- [ ] Alinhamento vertical (items-center)
- [ ] Botão "Limpar tudo" à direita dos badges

### Badges
- [ ] Background: bg-store-bg
- [ ] Border sutil: border-store-ink/20
- [ ] Padding adequado (pr-1.5 para botão X)
- [ ] Gap interno entre texto e X (gap-1.5)
- [ ] Hover muda background (hover:bg-store-ink/5)

### Botão X
- [ ] Ícone X visível (h-3 w-3)
- [ ] Padding em volta do ícone (p-0.5)
- [ ] Hover muda background (hover:bg-store-ink/10)
- [ ] Rounded (rounded-sm)
- [ ] Clicável

### Link "Limpar tudo"
- [ ] Aparência de link (não de botão)
- [ ] Cor: text-store-brand
- [ ] Hover: underline + opacity reduzida
- [ ] Tamanho texto: text-sm
- [ ] Background transparente (hover:bg-transparent)

### Responsividade
- [ ] Mobile: badges empilham verticalmente
- [ ] Desktop: badges em linha horizontal (quebra se necessário)
- [ ] Não quebra layout em telas pequenas

---

## ♿ Acessibilidade

### Badges
- [ ] Texto descritivo ("Categoria: Eletrônicos")
- [ ] Screen reader lê conteúdo completo
- [ ] Não apenas "X" isolado

### Botão X
- [ ] aria-label="Remover filtro"
- [ ] Screen reader anuncia ação
- [ ] Focável via teclado (Tab)
- [ ] Ativável via Enter/Space

### Keyboard Navigation
- [ ] Tab navega entre badges
- [ ] Foca no botão X de cada badge
- [ ] Enter/Space remove filtro
- [ ] Tab para "Limpar tudo"

### Focus Visible
- [ ] Outline visível no botão X ao focar
- [ ] Outline no link "Limpar tudo"
- [ ] Contraste adequado

### Screen Readers
- [ ] Lista de filtros ativos anunciada
- [ ] Cada badge lido com contexto
- [ ] Ação de remover clara
- [ ] "Limpar tudo" anunciado como botão/link

---

## 🔧 Testes de Integração

### Com useStoreFilters
```typescript
const { filters, clearFilter, clearAllFilters } = useStoreFilters();

<ActiveFiltersBadges
  filters={filters}
  onRemoveFilter={(key) => clearFilter(key)}
  onClearAll={clearAllFilters}
/>

// Fluxo:
// 1. Usuário aplica filtros
// 2. Badges aparecem
// 3. Click em X de um badge
// 4. clearFilter(key) atualiza estado
// 5. URL sincronizada
// 6. Catálogo atualizado
// 7. Badge desaparece
```

### Sincronização com Filtros
```typescript
// Props filters sempre sincronizadas
// - Badges atualizam em tempo real
// - Nenhum estado interno duplicado
// - Sempre reflete estado atual
```

### Formatação Dinâmica
```typescript
// Traduções via i18next
// - Labels traduzidos: "Busca", "Tipo", "Categoria", "Preço"
// - Valores mantidos (ex: "Eletrônicos" não traduzido)
// - Fallback se tradução faltando
```

---

## 🐛 Edge Cases

### 1. Categoria com Path Longo
```typescript
// categoryPath = ['A', 'B', 'C', 'D', 'E']
// - Badge para cada nível: "Categoria: A", "Categoria: B", etc.
// - Muitos badges (5 neste caso)
// - Wrap em múltiplas linhas
```

### 2. Busca com Texto Longo
```typescript
// q = 'notebook gamer com placa de vídeo dedicada e processador i7'
// - Badge: "Busca: notebook gamer com..."
// - Texto pode quebrar ou ser muito largo
// - Considerar truncate com tooltip (fora do MVP)
```

### 3. Muitos Atributos
```typescript
// attrs = { Cor: ['A','B','C'], Marca: ['D','E'], Tamanho: ['F','G','H'] }
// - 8 badges de atributos
// - + badges de outros filtros
// - Pode ocupar muito espaço
// - Wrap funciona, mas UX pode sofrer
```

### 4. Valores com Caracteres Especiais
```typescript
// attrs = { "Cor:Especial": ["Preto/Branco"] }
// - Split por ':' pode quebrar
// - Precisa escape ou lógica mais robusta
// - MVP: assume valores simples
```

### 5. Remover Categoria Inexistente
```typescript
// categoryPath = ['A', 'B']
// Usuário clica em badge com value='C' (erro de lógica)
// - filter((p) => p !== 'C') não muda array
// - newPaths = ['A', 'B'] (igual)
// - onRemoveFilter chamado com mesmo valor
// - Nenhum efeito colateral
```

### 6. Atributos com Valor Vazio
```typescript
// attrs = { Cor: [''] }
// - Badge: "Cor: " (vazio)
// - Aparência estranha
// - Backend não deveria retornar isso
// - Frontend pode filtrar valores vazios
```

### 7. Preço com Valores Não-Numéricos
```typescript
// priceMin = 'abc', priceMax = 'xyz'
// - Badge: "Preço: abc - xyz BZR"
// - Não quebra componente
// - Validação deve ocorrer em PriceFilter
```

### 8. onRemoveFilter Undefined
```typescript
// Props sem onRemoveFilter
// - TypeScript previne (required)
// - Se ocorrer, click no X não faz nada
// - Console error
```

---

## 📝 Notas de Implementação

### Lógica de Remoção por Tipo
- **Simples** (q, kind): `onRemoveFilter(key)`
- **Array** (categoryPath): Remove item específico, atualiza array
- **Range** (price): Remove ambos min e max
- **Object** (attrs): Remove valor específico, atualiza objeto

### Key Única para Badges
- `${badge.key}-${badge.value || index}`
- Evita warning de React (duplicate keys)
- Permite múltiplos badges do mesmo tipo

### Formatação de Preço
- Min ou Max vazio: substitui por '0' ou '∞'
- Mostra range completo
- Unidade hardcoded: "BZR"

### Categoria: Último Path
- Implementação atual: mostra cada nível separadamente
- Spec original: "mostrar último item do path"
- Implementação atual é melhor (permite remover níveis individuais)

### Return Null
- Se `badges.length === 0`, return null
- Early return otimiza rendering
- Não renderiza container vazio

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Truncate de Texto Longo**
   - Badge com max-width
   - Tooltip mostra texto completo ao hover
   - "Busca: notebook gam..." + tooltip

2. **Agrupamento de Badges**
   - "Categorias (3)" expansível
   - "Atributos (5)" expansível
   - Economiza espaço vertical

3. **Animação de Saída**
   - Fade out ao remover badge
   - Smooth transition
   - framer-motion layout animations

4. **Contador Total**
   - "5 filtros ativos" antes dos badges
   - Resumo rápido
   - Colapsar/expandir lista

5. **Edição In-Place**
   - Click no badge abre popover para editar
   - Ex: click em "Preço: 50-200" abre inputs
   - Mais rápido que reabrir modal

6. **Badges Coloridos**
   - Cada tipo com cor diferente
   - Categoria: azul, Preço: verde, etc.
   - Mais visual, mas pode poluir

7. **Sugestões de Filtros**
   - "Pessoas também filtraram por..."
   - Badges sugeridos clicáveis
   - Baseado em analytics

8. **Salvar Combinação**
   - "Salvar esta busca" a partir dos badges
   - Atalho para reaplicar filtros
   - Notificações de novos itens
