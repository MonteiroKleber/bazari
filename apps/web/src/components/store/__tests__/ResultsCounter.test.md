# ResultsCounter - Documentação de Testes

## Componente
`/apps/web/src/components/store/ResultsCounter.tsx`

## Objetivo
Contador de resultados do catálogo que mostra quantos produtos foram encontrados. Fornece contexto ao usuário sobre os resultados da busca/filtragem.

---

## ✅ Checklist de Funcionalidades

### Estados de Renderização
- [ ] Loading: Mostra spinner + "Carregando..."
- [ ] Sem resultados: "Nenhum produto encontrado"
- [ ] Com filtros: "12 produtos encontrados (de 50 total)"
- [ ] Sem filtros: "50 produtos"
- [ ] Singular: "1 produto"
- [ ] Plural: "2 produtos"

### Alinhamento
- [ ] Centralizado em mobile (text-center)
- [ ] Alinhado à direita em desktop (lg:text-right)

### Internacionalização
- [ ] Textos traduzidos via i18next
- [ ] Números formatados com locale (toLocaleString)
- [ ] Singular/plural correto

### Estilos
- [ ] Cor: text-store-ink/70
- [ ] Tamanho: text-sm
- [ ] Tema da loja aplicado

---

## 🧪 Cenários de Teste

### 1. Loading State
```typescript
<ResultsCounter
  totalItems={0}
  hasActiveFilters={false}
  loading={true}
/>

// Resultado:
// - Mostra spinner (Loader2 animate-spin)
// - Texto: "Carregando..."
// - Alinhado: centro (mobile) / direita (desktop)
```

### 2. Sem Resultados
```typescript
<ResultsCounter
  totalItems={0}
  hasActiveFilters={true}
  loading={false}
/>

// Resultado:
// - Texto: "Nenhum produto encontrado"
// - Alinhado: centro (mobile) / direita (desktop)
// - Cor: text-store-ink/70
```

### 3. Sem Filtros - Plural
```typescript
<ResultsCounter
  totalItems={50}
  hasActiveFilters={false}
  loading={false}
/>

// Resultado:
// - Texto: "50 produtos"
// - Formato simples (sem contexto de filtros)
```

### 4. Sem Filtros - Singular
```typescript
<ResultsCounter
  totalItems={1}
  hasActiveFilters={false}
  loading={false}
/>

// Resultado:
// - Texto: "1 produto"
// - Singular correto
```

### 5. Com Filtros - Mostrando Menos
```typescript
<ResultsCounter
  totalItems={12}
  totalWithoutFilters={50}
  hasActiveFilters={true}
  loading={false}
/>

// Resultado:
// - Texto: "12 produtos encontrados (de 50 total)"
// - Mostra contexto de quantos foram filtrados
```

### 6. Com Filtros - Mesmo Total
```typescript
<ResultsCounter
  totalItems={50}
  totalWithoutFilters={50}
  hasActiveFilters={true}
  loading={false}
/>

// Resultado:
// - Texto: "50 produtos"
// - Não mostra "(de 50 total)" pois é redundante
// - Filtros não reduziram resultado
```

### 7. Com Filtros - Sem totalWithoutFilters
```typescript
<ResultsCounter
  totalItems={12}
  hasActiveFilters={true}
  loading={false}
/>

// Resultado:
// - Texto: "12 produtos"
// - Sem contexto de total (totalWithoutFilters não fornecido)
```

### 8. Números Grandes - Formatação
```typescript
<ResultsCounter
  totalItems={1234}
  totalWithoutFilters={5678}
  hasActiveFilters={true}
  loading={false}
/>

// Resultado:
// - Texto: "1.234 produtos encontrados (de 5.678 total)"
// - Separador de milhares (locale pt-BR)
```

### 9. Um Produto com Filtros
```typescript
<ResultsCounter
  totalItems={1}
  totalWithoutFilters={50}
  hasActiveFilters={true}
  loading={false}
/>

// Resultado:
// - Texto: "1 produto encontrado (de 50 total)"
// - Singular correto em "produto"
```

---

## 🎨 Testes Visuais

### Layout
- [ ] Texto em uma linha
- [ ] Margem inferior adequada (mb-4 no container)
- [ ] Não quebra em telas pequenas

### Alinhamento
- [ ] Mobile (< lg): text-center
- [ ] Desktop (lg+): text-right
- [ ] Consistente com design

### Loading
- [ ] Spinner visível (h-4 w-4)
- [ ] Alinhado com texto (items-center)
- [ ] Gap entre spinner e texto (gap-2)
- [ ] Animação de rotação suave

### Cores
- [ ] Texto: text-store-ink/70
- [ ] Loading: text-store-ink/50 (mais claro)
- [ ] Spinner: mesma cor do texto

### Tamanho
- [ ] text-sm (14px geralmente)
- [ ] Legível em mobile e desktop
- [ ] Consistente com outros textos auxiliares

---

## ♿ Acessibilidade

### Semântica
- [ ] Elemento `<p>` para texto
- [ ] Div com flex para loading

### Screen Readers
- [ ] Texto lido corretamente
- [ ] Número de produtos anunciado
- [ ] "Carregando" anunciado durante loading
- [ ] "Nenhum produto encontrado" claro

### Contrast
- [ ] text-store-ink/70 tem contraste adequado
- [ ] Legível sobre bg-store-bg

### Responsividade
- [ ] Legível em todos os tamanhos de tela
- [ ] Não corta texto importante
- [ ] Wrap de texto se necessário

---

## 🔧 Testes de Integração

### Com useStoreCatalog
```typescript
const { page, loading } = useStoreCatalog(storeId, filters);
const { hasActiveFilters } = useStoreFilters();

<ResultsCounter
  totalItems={page.total}
  hasActiveFilters={hasActiveFilters}
  loading={loading}
/>

// Fluxo:
// 1. Catálogo carregando: loading={true} → "Carregando..."
// 2. Catálogo carregado: loading={false}, totalItems={50} → "50 produtos"
// 3. Filtro aplicado: hasActiveFilters={true}, totalItems={12} → "12 produtos encontrados (de 50 total)"
// 4. Filtro removido: hasActiveFilters={false}, totalItems={50} → "50 produtos"
```

### Com useStoreFilters
```typescript
const { filters } = useStoreFilters();

const hasActiveFilters =
  filters.q !== '' ||
  filters.kind !== 'all' ||
  filters.categoryPath.length > 0 ||
  filters.priceMin !== '' ||
  filters.priceMax !== '' ||
  Object.keys(filters.attrs).length > 0;

<ResultsCounter
  totalItems={page.total}
  hasActiveFilters={hasActiveFilters}
/>

// Detecta automaticamente se há filtros ativos
```

### totalWithoutFilters (Opcional)
```typescript
// Opção 1: Não passar totalWithoutFilters
// - Sempre mostra apenas total atual
// - Mais simples, menos informativo

// Opção 2: Passar totalWithoutFilters
// - Requer query adicional ou cache
// - Mostra contexto de filtragem
// - Melhor UX, mais complexo
```

### Lifecycle
```typescript
// Initial load
loading={true} → "Carregando..."

// Data loaded
loading={false}, totalItems={50} → "50 produtos"

// Filter applied
hasActiveFilters={true}, totalItems={12} → "12 produtos encontrados (de 50 total)"

// Filter cleared
hasActiveFilters={false}, totalItems={50} → "50 produtos"

// Empty result
totalItems={0} → "Nenhum produto encontrado"
```

---

## 🐛 Edge Cases

### 1. totalItems Negativo
```typescript
<ResultsCounter totalItems={-5} hasActiveFilters={false} />

// - Não deve acontecer (backend/hook valida)
// - Se acontecer: mostra "-5 produtos" (estranho mas não quebra)
```

### 2. totalWithoutFilters Menor que totalItems
```typescript
<ResultsCounter
  totalItems={50}
  totalWithoutFilters={30}
  hasActiveFilters={true}
/>

// - Lógica: totalWithoutFilters > totalItems
// - Condição não satisfeita
// - Mostra: "50 produtos" (sem contexto)
// - Correto: totalWithoutFilters deveria ser >= totalItems
```

### 3. hasActiveFilters Mas Mesmo Total
```typescript
<ResultsCounter
  totalItems={50}
  totalWithoutFilters={50}
  hasActiveFilters={true}
/>

// - Filtros aplicados mas não reduziram resultado
// - Mostra: "50 produtos" (sem contexto redundante)
// - Correto: não confunde usuário
```

### 4. Zero Items Sem Filtros
```typescript
<ResultsCounter totalItems={0} hasActiveFilters={false} />

// - Loja vazia (sem produtos cadastrados)
// - Mostra: "Nenhum produto encontrado"
// - Mesma mensagem que com filtros (genérica)
```

### 5. Loading com totalItems Anterior
```typescript
// Estado anterior: totalItems={50}
// Novo filtro aplicado, loading={true}
<ResultsCounter totalItems={50} hasActiveFilters={true} loading={true} />

// - Prioriza loading state
// - Mostra: "Carregando..."
// - Não mostra total anterior (pode confundir)
```

### 6. totalWithoutFilters Sem hasActiveFilters
```typescript
<ResultsCounter
  totalItems={12}
  totalWithoutFilters={50}
  hasActiveFilters={false}
/>

// - hasActiveFilters={false} mas totalWithoutFilters fornecido
// - Condição: hasActiveFilters && totalWithoutFilters
// - Mostra: "12 produtos" (sem contexto)
// - Correto: se não há filtros, não mostrar contexto
```

### 7. Tradução Faltando
```typescript
// i18next não tem chave 'store.catalog.counter.products'
// - Fallback: 'produtos' usado
// - Componente funciona normalmente
```

---

## 📝 Notas de Implementação

### Formatação de Números
```typescript
totalItems.toLocaleString('pt-BR')
```
- Separador de milhares: 1.234
- Separador decimal: vírgula (se aplicável)
- Locale fixo: pt-BR (não dinâmico)

### Singular/Plural
```typescript
const itemsWord = totalItems === 1 ? 'produto' : 'produtos';
```
- Lógica simples: 1 = singular, resto = plural
- Não considera zero (zero usa "produtos")
- Suficiente para pt-BR

### totalWithoutFilters Opcional
- Prop opcional (`totalWithoutFilters?`)
- Se não fornecido, não mostra contexto
- Permite uso simples sem query adicional

### Condição de Contexto
```typescript
if (hasActiveFilters && totalWithoutFilters && totalWithoutFilters > totalItems)
```
- Três condições:
  1. hasActiveFilters: Filtros ativos
  2. totalWithoutFilters: Valor fornecido
  3. totalWithoutFilters > totalItems: Reduziu resultado
- Se todas verdadeiras, mostra contexto

### Estados Mutuamente Exclusivos
1. Loading → "Carregando..."
2. Zero items → "Nenhum produto encontrado"
3. Com contexto → "X produtos encontrados (de Y total)"
4. Sem contexto → "X produtos"

### Alinhamento Responsivo
```typescript
className="text-center lg:text-right"
```
- Mobile: centro (padrão)
- Desktop: direita (alinhado com sort/search)

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Tempo de Busca**
   - "50 produtos encontrados em 0.23s"
   - Feedback de performance
   - Requer backend retornar tempo

2. **Visualização de Filtros**
   - "50 produtos em Eletrônicos com preço 100-200 BZR"
   - Resumo dos filtros ativos
   - Redundante com badges (avaliar)

3. **Comparação Visual**
   - Barra de progresso: 12 de 50 (24%)
   - Gráfico visual do filtro
   - Mais visual, menos textual

4. **Histórico de Resultados**
   - "Anteriormente: 20 produtos"
   - Mostra se resultado aumentou/diminuiu
   - Requer manter estado anterior

5. **Recomendações**
   - "0 produtos encontrados. Experimente remover filtros."
   - Sugestões inteligentes
   - Melhora recovery de resultados vazios

6. **Animação de Mudança**
   - Count up/down animation
   - Quando número muda
   - react-spring ou framer-motion

7. **Densidade de Informação**
   - Modo compacto: apenas número
   - Modo detalhado: com contexto e sugestões
   - Toggle do usuário

8. **Estatísticas Adicionais**
   - "50 produtos, 5 categorias, 12 marcas"
   - Resumo multidimensional
   - Dashboard mini
