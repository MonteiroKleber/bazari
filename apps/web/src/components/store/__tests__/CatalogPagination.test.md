# CatalogPagination - Documentação de Testes

## Componente
`/apps/web/src/components/store/CatalogPagination.tsx`

## Objetivo
Componente de paginação para navegar entre páginas do catálogo de produtos com informações de itens exibidos.

---

## ✅ Checklist de Funcionalidades

### Renderização
- [ ] Não renderiza se totalPages <= 1
- [ ] Não renderiza se totalItems === 0
- [ ] Mostra texto "Mostrando X-Y de Z produtos"
- [ ] Mostra botões Anterior/Próxima
- [ ] Mostra números de página
- [ ] Mostra ellipsis (...) quando necessário

### Navegação
- [ ] Click em número de página chama onPageChange
- [ ] Click em "Anterior" vai para página anterior
- [ ] Click em "Próxima" vai para página seguinte
- [ ] Scroll to top ao mudar página
- [ ] Página atual destacada visualmente

### Estados de Botões
- [ ] "Anterior" desabilitado na primeira página
- [ ] "Próxima" desabilitado na última página
- [ ] Página atual não clicável (visual feedback)
- [ ] Hover muda aparência dos botões

### Ellipsis
- [ ] Aparece quando há muitas páginas
- [ ] Posicionado corretamente (início ou fim)
- [ ] Não clicável
- [ ] Screen reader ignora (aria-hidden)

### Responsividade
- [ ] Textos "Anterior"/"Próxima" ocultos em mobile
- [ ] Apenas ícones visíveis em telas pequenas
- [ ] Números de página legíveis em mobile

---

## 🧪 Cenários de Teste

### 1. Paginação Básica (Poucas Páginas)
```typescript
<CatalogPagination
  currentPage={2}
  totalPages={5}
  totalItems={120}
  itemsPerPage={24}
  onPageChange={handlePageChange}
/>

// Resultado:
// - Mostra "Mostrando 25-48 de 120 produtos"
// - Botões: [← Anterior] 1 2 [3] 4 5 [Próxima →]
// - Página 2 destacada
// - Todos os números visíveis (sem ellipsis)
```

### 2. Primeira Página
```typescript
<CatalogPagination
  currentPage={1}
  totalPages={10}
  totalItems={240}
  itemsPerPage={24}
  onPageChange={handlePageChange}
/>

// Resultado:
// - "Mostrando 1-24 de 240 produtos"
// - Botão "Anterior" DESABILITADO (opacity-50, pointer-events-none)
// - Página 1 destacada
// - Botão "Próxima" habilitado
```

### 3. Última Página
```typescript
<CatalogPagination
  currentPage={10}
  totalPages={10}
  totalItems={240}
  itemsPerPage={24}
  onPageChange={handlePageChange}
/>

// Resultado:
// - "Mostrando 217-240 de 240 produtos"
// - Botão "Anterior" habilitado
// - Página 10 destacada
// - Botão "Próxima" DESABILITADO
```

### 4. Muitas Páginas (Ellipsis)
```typescript
<CatalogPagination
  currentPage={15}
  totalPages={50}
  totalItems={1200}
  itemsPerPage={24}
  onPageChange={handlePageChange}
/>

// Resultado:
// - "Mostrando 337-360 de 1200 produtos"
// - Botões: [← Anterior] 1 ... 13 14 [15] 16 17 ... 50 [Próxima →]
// - Ellipsis antes (...)
// - Páginas ao redor da atual (13-17)
// - Ellipsis depois (...)
// - Sempre mostra primeira (1) e última (50)
```

### 5. Página Única
```typescript
<CatalogPagination
  currentPage={1}
  totalPages={1}
  totalItems={15}
  itemsPerPage={24}
  onPageChange={handlePageChange}
/>

// Resultado:
// - return null
// - Nada renderizado
// - Não faz sentido paginar uma página única
```

### 6. Sem Itens
```typescript
<CatalogPagination
  currentPage={1}
  totalPages={0}
  totalItems={0}
  itemsPerPage={24}
  onPageChange={handlePageChange}
/>

// Resultado:
// - return null
// - Nada renderizado
```

### 7. Click em Número de Página
```typescript
const handlePageChange = jest.fn();

// Usuário está na página 2
// Click no número "5"
// - onPageChange(5) é chamado
// - window.scrollTo({ top: 0, behavior: 'smooth' }) executado
// - Pai atualiza filters.page = 5
// - Re-render com currentPage={5}
```

### 8. Click em "Próxima"
```typescript
// currentPage = 3
// Usuário clica em "Próxima"
// - handleNext() executado
// - onPageChange(4) chamado
// - Scroll to top
// - Página 4 carregada
```

### 9. Click em "Anterior"
```typescript
// currentPage = 3
// Usuário clica em "Anterior"
// - handlePrevious() executado
// - onPageChange(2) chamado
// - Scroll to top
// - Página 2 carregada
```

### 10. Click na Página Atual
```typescript
// currentPage = 5
// Usuário clica no número "5" (já ativo)
// - handlePageClick(5) executado
// - Early return (page === currentPage)
// - onPageChange NÃO chamado
// - Sem scroll, sem re-fetch
```

---

## 🎨 Testes Visuais

### Layout
- [ ] Centralizado horizontalmente (mx-auto, justify-center)
- [ ] Espaçamento vertical adequado (mt-8)
- [ ] Texto de itens acima da paginação (space-y-4)

### Botões
- [ ] Botão "Anterior" com ícone ChevronLeft
- [ ] Botão "Próxima" com ícone ChevronRight
- [ ] Números de página em círculos/quadrados
- [ ] Espaçamento entre botões (gap-1)

### Estados Visuais
- [ ] Página ativa: border-store-brand, bg-store-brand/10, text-store-brand
- [ ] Páginas inativas: border-store-ink/20, text-store-ink
- [ ] Hover: bg-store-ink/5, text-store-brand
- [ ] Desabilitado: opacity-50, pointer-events-none

### Texto de Itens
- [ ] Centralizado (text-center)
- [ ] Tamanho pequeno (text-sm)
- [ ] Cor: text-store-ink/70
- [ ] Formatação: "Mostrando 1-24 de 120 produtos"

### Ellipsis
- [ ] Ícone MoreHorizontal (três pontos)
- [ ] Centralizado vertical e horizontalmente
- [ ] Não tem background/border
- [ ] Não reage a hover

### Responsividade Mobile
- [ ] Textos "Anterior"/"Próxima" ocultos (hidden sm:inline)
- [ ] Apenas ícones visíveis
- [ ] Números de página menores (se necessário)
- [ ] Wrap se não couber (flex-wrap?)

---

## ♿ Acessibilidade

### Navegação
- [ ] `<nav role="navigation" aria-label="pagination">`
- [ ] Semântica de lista (<ul>/<li>)
- [ ] Links semânticos (<a>)

### Botões
- [ ] aria-label="Go to previous page" em Anterior
- [ ] aria-label="Go to next page" em Próxima
- [ ] aria-current="page" na página ativa
- [ ] aria-disabled ou disabled em botões desabilitados

### Keyboard
- [ ] Tab navega entre botões de página
- [ ] Enter ativa botão focado
- [ ] Space ativa botão focado
- [ ] Focus outline visível

### Screen Readers
- [ ] "Página 5 de 50" anunciado
- [ ] "Página atual: 5" na página ativa
- [ ] "Mostrando 1-24 de 120 produtos" lido
- [ ] Ellipsis ignorado (aria-hidden)
- [ ] Estado desabilitado anunciado

---

## 🔧 Testes de Integração

### Com useStoreFilters
```typescript
const { filters, updateFilter } = useStoreFilters();
const { page } = useStoreCatalog(storeId, filters);

<CatalogPagination
  currentPage={filters.page}
  totalPages={Math.ceil(page.total / page.limit)}
  totalItems={page.total}
  itemsPerPage={page.limit}
  onPageChange={(newPage) => updateFilter('page', newPage)}
/>

// Fluxo:
// 1. Usuário clica em página 3
// 2. onPageChange(3) chamado
// 3. updateFilter('page', 3) atualiza filtros
// 4. URL sincronizada: ?page=3
// 5. useStoreCatalog refetch com offset calculado
// 6. Novos items carregados
// 7. Pagination re-renderiza com currentPage={3}
```

### Com URL Params
```typescript
// URL inicial: /loja/minhaloja?page=5
// - useStoreFilters lê page=5
// - Pagination renderiza com currentPage={5}
// - Página 5 destacada
// - Catálogo mostra items 97-120
```

### Scroll to Top
```typescript
// Usuário scrollou até o fundo
// Click em "Próxima"
// - window.scrollTo({ top: 0, behavior: 'smooth' })
// - Página rola suavemente para o topo
// - Usuário vê início dos novos items
```

### Persistência de Filtros
```typescript
// Filtros ativos: categoryPath=['Eletrônicos'], priceMin='100'
// Usuário navega para página 3
// - Filtros mantidos na URL: ?categoryPath=Eletrônicos&priceMin=100&page=3
// - Página 3 do catálogo FILTRADO
// - Total pages calculado com base no total filtrado
```

---

## 🐛 Edge Cases

### 1. Total Menor que Limit
```typescript
// totalItems = 15, itemsPerPage = 24
// totalPages = Math.ceil(15 / 24) = 1
// - Pagination não renderiza (totalPages <= 1)
```

### 2. Última Página Incompleta
```typescript
// totalItems = 143, itemsPerPage = 24
// currentPage = 6
// totalPages = Math.ceil(143 / 24) = 6
// - "Mostrando 121-143 de 143 produtos"
// - Apenas 23 items na última página
```

### 3. Página Inválida na URL
```typescript
// URL: ?page=999 (maior que totalPages)
// - useStoreFilters lê page=999
// - Backend retorna items vazios
// - Pagination mostra página 999 destacada (mesmo inválida)
// - Idealmente backend ou hook deve resetar para página 1
```

### 4. Zero Items Após Filtro
```typescript
// Filtros muito restritivos retornam 0 items
// - catalogItems.length = 0
// - Pagination não renderiza (conditional)
// - Mostra "Nenhum item encontrado" no lugar
```

### 5. Mudança de Filtros Durante Navegação
```typescript
// Usuário na página 5
// Adiciona filtro de categoria
// - Total items muda (ex: 240 → 50)
// - totalPages muda (10 → 3)
// - Página 5 não existe mais
// - useStoreFilters deve resetar page para 1 ao mudar outros filtros
```

### 6. Cálculo de startItem/endItem
```typescript
// currentPage = 3, itemsPerPage = 24
// startItem = (3 - 1) * 24 + 1 = 49
// endItem = Math.min(3 * 24, totalItems) = Math.min(72, 143) = 72
// "Mostrando 49-72 de 143 produtos"
```

### 7. Muitas Páginas (> 100)
```typescript
// totalPages = 150
// currentPage = 75
// - Ellipsis início e fim
// - Páginas ao redor: 1 ... 73 74 [75] 76 77 ... 150
// - MAX_VISIBLE_PAGES = 5 controla
```

---

## 📝 Notas de Implementação

### generatePageNumbers
Algoritmo para calcular páginas visíveis:
1. Se total <= MAX_VISIBLE, mostrar todas
2. Sempre incluir primeira e última
3. Calcular range ao redor da atual (halfVisible)
4. Ajustar range se muito no início/fim
5. Adicionar ellipsis onde necessário

**Exemplos:**
- Total 10, atual 1: `[1, 2, 3, 4, 5, ..., 10]`
- Total 10, atual 5: `[1, ..., 3, 4, 5, 6, 7, ..., 10]`
- Total 10, atual 10: `[1, ..., 6, 7, 8, 9, 10]`

### Scroll Behavior
- `window.scrollTo({ top: 0, behavior: 'smooth' })`
- Smooth scroll nativo (sem JS animation)
- Usuário vê início dos novos items
- Melhora UX (sem scroll manual)

### Debounce
- Não precisa de debounce
- Click é ação deliberada (não digitação)
- Aplicação imediata

### Cálculo de Offset
```typescript
// Backend espera offset, não page
// offset = (page - 1) * limit
// Ex: page 3, limit 24 → offset = 48
// useStoreCatalog faz esse cálculo
```

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Input de Página**
   - "Ir para página: [__]"
   - Permite pular diretamente
   - Validação de número válido

2. **Items por Página**
   - Dropdown: 12, 24, 48, 96
   - Usuário escolhe densidade
   - Persiste em localStorage

3. **Infinite Scroll**
   - Alternativa à paginação clássica
   - Carrega mais ao scrollar
   - Botão "Carregar mais" (hybrid)

4. **Atalhos de Teclado**
   - Arrow Left: página anterior
   - Arrow Right: próxima página
   - Home: primeira página
   - End: última página

5. **Prefetch**
   - Pré-carregar próxima página
   - Transição instant
   - Melhor UX em conexões rápidas

6. **Animações**
   - Fade in dos novos items
   - Slide transition entre páginas
   - Loading skeleton

7. **Posição Variável**
   - Opção de mostrar também no topo
   - Útil em catálogos longos
   - Duplicar component top + bottom

8. **Analytics**
   - Track navigation patterns
   - Páginas mais visitadas
   - Bounce rate por página
