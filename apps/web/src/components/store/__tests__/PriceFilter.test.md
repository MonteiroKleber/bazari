# PriceFilter - Documentação de Testes

## Componente
`/apps/web/src/components/store/PriceFilter.tsx`

## Objetivo
Filtro de faixa de preço com inputs min/max. Versão MVP sem slider, apenas campos numéricos.

---

## ✅ Checklist de Funcionalidades

### Entrada de Dados
- [ ] Input mínimo aceita apenas números
- [ ] Input máximo aceita apenas números
- [ ] Permite apagar completamente (campo vazio)
- [ ] Mostra placeholder com valor do range disponível
- [ ] Sincroniza estado local com props quando mudarem (ex: limpar filtros)

### Validação
- [ ] Bloqueia entrada de caracteres não-numéricos
- [ ] Não aplica filtro se min > max
- [ ] Não aplica filtro se max < min
- [ ] Aceita valores válidos dentro do range

### Debounce
- [ ] Aplica mudanças após 500ms de inatividade
- [ ] Cancela timer anterior quando usuário continua digitando
- [ ] Limpa timers ao desmontar componente

### Exibição
- [ ] Mostra range disponível formatado (ex: "100 - 1.000 BZR")
- [ ] Labels traduzidos (Mín. / Máx.)
- [ ] Título traduzido ("Preço (BZR)")
- [ ] Formatação com separador de milhares
- [ ] Tema da loja aplicado corretamente

### Interação
- [ ] onChange chamado com valores corretos após debounce
- [ ] Estado local atualiza imediatamente (feedback visual)
- [ ] Validação não bloqueia digitação, apenas aplicação

---

## 🧪 Cenários de Teste

### 1. Entrada Básica
```typescript
// Usuário digita "100" no campo mínimo
// - Estado local atualiza imediatamente
// - Após 500ms, onChange('100', currentMax) é chamado
// - Se max estiver vazio, passa '100' e ''
```

### 2. Validação Min > Max
```typescript
// Estado: min = '', max = '500'
// Usuário digita "600" no min
// - Estado local atualiza para '600'
// - Após 500ms, validação detecta 600 > 500
// - onChange NÃO é chamado (filtro inválido)
```

### 3. Validação Max < Min
```typescript
// Estado: min = '500', max = ''
// Usuário digita "300" no max
// - Estado local atualiza para '300'
// - Após 500ms, validação detecta 300 < 500
// - onChange NÃO é chamado (filtro inválido)
```

### 4. Digitação Contínua (Debounce)
```typescript
// Usuário digita "1", "2", "3" rapidamente
// - Estado local: '1' → '12' → '123'
// - Timers anteriores são cancelados
// - onChange só é chamado 500ms APÓS último caractere
// - Resultado: onChange('123', currentMax) uma única vez
```

### 5. Limpar Filtro
```typescript
// Estado: min = '100', max = '500'
// Usuário apaga tudo no campo min
// - Estado local atualiza para ''
// - Após 500ms, onChange('', '500') é chamado
// - Permite buscar sem limite mínimo
```

### 6. Sincronização com Props
```typescript
// Props externas mudam (ex: clearAllFilters)
// - useEffect detecta mudança em props min/max
// - Estado local é sincronizado: setLocalMin(min), setLocalMax(max)
// - Inputs exibem valores atualizados
```

### 7. Range Disponível
```typescript
// Props: rangeMin = '50', rangeMax = '10000'
// - Componente exibe "Disponível: 50 - 10.000 BZR"
// - Formatação com separador de milhares
// - Se range for 0-0 ou inválido, não exibe nada
```

### 8. Caracteres Inválidos
```typescript
// Usuário tenta digitar "abc", "1.5", "-10"
// - handleMinChange/handleMaxChange rejeitam
// - Estado local não muda
// - Apenas /^\d+$/ ou vazio são aceitos
```

---

## 🎨 Testes Visuais

### Desktop
- [ ] Inputs lado a lado com labels acima
- [ ] Altura h-9 consistente com outros inputs
- [ ] Espaçamento adequado (space-y-3)
- [ ] Bordas e cores do tema aplicadas
- [ ] Focus ring visível ao focar

### Mobile
- [ ] Grid responsivo (grid-cols-2)
- [ ] Inputs não muito pequenos
- [ ] Labels legíveis
- [ ] Keyboard numérico aparece (inputMode="numeric")

### Estados
- [ ] Placeholder com opacity reduzida
- [ ] Texto normal quando preenchido
- [ ] Focus com borda destacada (store-brand)
- [ ] Background levemente transparente (bg-store-bg/95)

---

## ♿ Acessibilidade

### Labels
- [ ] `<Label htmlFor="price-min">` associado ao input
- [ ] `<Label htmlFor="price-max">` associado ao input
- [ ] Labels descritivos ("Mín.", "Máx.")

### Keyboard
- [ ] Tab navega entre inputs
- [ ] Enter não submete form (se houver)
- [ ] Backspace apaga caracteres normalmente
- [ ] inputMode="numeric" mostra teclado numérico no mobile

### Screen Readers
- [ ] Título "Preço (BZR)" anunciado
- [ ] Labels dos inputs anunciados
- [ ] Range disponível lido se presente
- [ ] Placeholder não confunde com valor real

---

## 🔧 Testes de Integração

### Com useStoreFilters
```typescript
const { filters, updateFilter } = useStoreFilters();

<PriceFilter
  min={filters.priceMin}
  max={filters.priceMax}
  rangeMin={facets.priceRange.min}
  rangeMax={facets.priceRange.max}
  onChange={(min, max) => {
    updateFilter('priceMin', min);
    updateFilter('priceMax', max);
  }}
/>

// Fluxo:
// 1. Usuário digita no input
// 2. Após 500ms, onChange é chamado
// 3. updateFilter atualiza filtros no hook
// 4. Hook atualiza URL e dispara nova busca
// 5. useStoreCatalog refetch com novos filtros
```

### Com useStoreFacets
```typescript
// Facets devem fornecer range disponível
const { facets } = useStoreFacets(storeId, filters);
// facets.priceRange = { min: '0', max: '10000' }

// PriceFilter exibe: "Disponível: 0 - 10.000 BZR"
```

### Limpar Filtros
```typescript
// Quando clearAllFilters() é chamado:
// - Props min e max voltam para ''
// - useEffect sincroniza estado local
// - Inputs ficam vazios novamente
```

---

## 🐛 Edge Cases

### 1. Range Inválido do Backend
```typescript
// facets.priceRange = { min: '', max: '' }
// Componente não exibe range (retorna '')
// Inputs funcionam normalmente com placeholders padrão
```

### 2. Valores Muito Grandes
```typescript
// Usuário digita "9999999999"
// - Aceito como string
// - Formatação com separadores funciona
// - Backend deve validar se valor excede limites
```

### 3. Apenas Min Preenchido
```typescript
// min = '100', max = ''
// - Busca produtos com preço >= 100
// - Sem limite superior
// - Validação não impede (max vazio é válido)
```

### 4. Apenas Max Preenchido
```typescript
// min = '', max = '500'
// - Busca produtos com preço <= 500
// - Sem limite inferior
// - Validação não impede (min vazio é válido)
```

### 5. Zeros
```typescript
// min = '0', max = '0'
// - Tecnicamente válido (0 <= 0)
// - Backend pode retornar produtos gratuitos
// - Range não exibido se ambos forem 0
```

### 6. Desmontar Durante Debounce
```typescript
// Usuário digita e navega rapidamente
// - useEffect cleanup cancela timers pendentes
// - onChange não é chamado após desmontagem
// - Sem memory leaks
```

---

## 📝 Notas de Implementação

### Debounce Manual
- Não usa biblioteca (lodash, use-debounce)
- Implementa com setTimeout e useRef
- Cada input tem seu próprio timer (minTimerRef, maxTimerRef)

### Validação
- Validação de formato na digitação (regex /^\d+$/)
- Validação de lógica no debounce (min <= max)
- Se inválido, onChange não é chamado (filtro não aplicado)

### Formatação
- Range usa toLocaleString('pt-BR') para separador de milhares
- Aceita até 2 casas decimais (maximumFractionDigits: 2)
- Inputs aceitam apenas inteiros (futuro: permitir decimais?)

### Tema
- Usa variáveis CSS customizadas (store-ink, store-brand, store-bg)
- Consistente com outros componentes (SearchBar, CategoryFilter)
- Classes Tailwind com opacity para estados

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Slider Visual**
   - Componente Range com dois handles
   - Feedback visual mais intuitivo
   - Requer biblioteca (rc-slider, react-range)

2. **Sugestões de Ranges**
   - Chips com ranges comuns: "Até 100", "100-500", "500+"
   - Click rápido para aplicar

3. **Validação com Feedback**
   - Mensagem de erro se min > max
   - Borda vermelha em input inválido
   - Tooltip explicativo

4. **Histórico de Preços**
   - Mostrar se preço atual está acima/abaixo da média
   - Gráfico de distribuição de preços

5. **Moeda Dinâmica**
   - Suporte a múltiplas moedas (BZR, USD, BRL)
   - Conversão em tempo real
