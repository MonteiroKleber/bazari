# AttributeFilter - Documentação de Testes

## Componente
`/apps/web/src/components/store/AttributeFilter.tsx`

## Objetivo
Filtro de atributos dinâmicos com seções expansíveis. Permite filtrar por múltiplos valores de atributos (cor, tamanho, marca, etc.).

---

## ✅ Checklist de Funcionalidades

### Renderização
- [ ] Não renderiza nada se attributes está vazio
- [ ] Renderiza seção para cada atributo disponível
- [ ] Seções ordenadas alfabeticamente por chave
- [ ] Capitaliza primeira letra do nome do atributo

### Seções Expansíveis
- [ ] Cada seção pode expandir/colapsar
- [ ] Ícone chevron muda ao expandir/colapsar
- [ ] Click no header expande/colapsa
- [ ] Seções expandidas por padrão

### Checkboxes
- [ ] Checkbox para cada valor disponível
- [ ] Marcado se valor está em selected
- [ ] Desmarcado se valor não está selecionado
- [ ] Contador de itens exibido

### Seleção Múltipla
- [ ] Permite selecionar múltiplos valores do mesmo atributo
- [ ] onChange chamado com array de valores
- [ ] Marcar checkbox adiciona valor
- [ ] Desmarcar checkbox remove valor

### "Ver Mais"
- [ ] Mostra apenas 8 valores inicialmente
- [ ] Botão "Ver mais" aparece se > 8 valores
- [ ] "Ver mais" mostra todos os valores
- [ ] "Ver menos" volta a mostrar apenas 8
- [ ] Contador mostra quantos valores ocultos

### Estilos
- [ ] Tema da loja aplicado (store-ink, store-brand)
- [ ] Espaçamento entre seções (space-y-4)
- [ ] Espaçamento entre checkboxes (space-y-2)
- [ ] Hover muda cor do label

---

## 🧪 Cenários de Teste

### 1. Sem Atributos
```typescript
const attributes = {};
const selected = {};

<AttributeFilter
  attributes={attributes}
  selected={selected}
  onChange={handleChange}
/>

// Resultado:
// - return null
// - Nada renderizado
```

### 2. Um Atributo com Poucos Valores
```typescript
const attributes = {
  cor: [
    { value: 'Preto', count: 8 },
    { value: 'Branco', count: 5 },
    { value: 'Azul', count: 3 },
  ],
};
const selected = {};

// Resultado:
// - Seção "Cor" expandida
// - 3 checkboxes (Preto, Branco, Azul)
// - Sem botão "Ver mais" (< 8 valores)
// - Todos desmarcados
```

### 3. Múltiplos Atributos
```typescript
const attributes = {
  cor: [
    { value: 'Preto', count: 8 },
    { value: 'Branco', count: 5 },
  ],
  tamanho: [
    { value: 'P', count: 4 },
    { value: 'M', count: 12 },
    { value: 'G', count: 9 },
  ],
  marca: [
    { value: 'Nike', count: 15 },
    { value: 'Adidas', count: 10 },
  ],
};
const selected = {};

// Resultado:
// - 3 seções: "Cor", "Marca", "Tamanho" (ordem alfabética)
// - Todas expandidas por padrão
// - Cada seção com seus respectivos valores
```

### 4. Atributo com Muitos Valores (> 8)
```typescript
const attributes = {
  marca: [
    { value: 'Nike', count: 15 },
    { value: 'Adidas', count: 10 },
    { value: 'Puma', count: 8 },
    { value: 'Reebok', count: 6 },
    { value: 'Asics', count: 5 },
    { value: 'New Balance', count: 4 },
    { value: 'Fila', count: 3 },
    { value: 'Under Armour', count: 2 },
    { value: 'Mizuno', count: 2 },
    { value: 'Olympikus', count: 1 },
  ],
};
const selected = {};

// Resultado:
// - Seção "Marca" expandida
// - Primeiros 8 valores visíveis
// - Botão "Ver mais (2)" aparece
// - Click mostra todos os 10 valores
// - Botão muda para "Ver menos"
```

### 5. Selecionar Valor
```typescript
const attributes = {
  cor: [
    { value: 'Preto', count: 8 },
    { value: 'Branco', count: 5 },
  ],
};
const selected = {};
const handleChange = jest.fn();

// Usuário clica em checkbox "Preto"
// - handleValueToggle('cor', 'Preto') executado
// - onChange('cor', ['Preto']) chamado
// - Pai atualiza selected = { cor: ['Preto'] }
// - Re-render: checkbox "Preto" marcado
```

### 6. Selecionar Múltiplos Valores
```typescript
// Estado: selected = { cor: ['Preto'] }
// Usuário clica em checkbox "Branco"
// - currentValues = ['Preto']
// - onChange('cor', ['Preto', 'Branco']) chamado
// - Pai atualiza selected = { cor: ['Preto', 'Branco'] }
// - Re-render: ambos checkboxes marcados
```

### 7. Desmarcar Valor
```typescript
// Estado: selected = { cor: ['Preto', 'Branco'] }
// Usuário clica em checkbox "Preto" (já marcado)
// - isSelected = true
// - newValues = ['Branco']
// - onChange('cor', ['Branco']) chamado
// - Checkbox "Preto" desmarcado
```

### 8. Expandir/Colapsar Seção
```typescript
// Seção "Cor" expandida
// Usuário clica no header "Cor"
// - toggleSection('cor') executado
// - expandedSections['cor'] = false
// - Seção colapsa (conteúdo oculto)
// - Ícone muda de ChevronUp para ChevronDown

// Usuário clica novamente
// - expandedSections['cor'] = true
// - Seção expande
// - Ícone volta para ChevronUp
```

### 9. Ver Mais / Ver Menos
```typescript
// Atributo com 10 valores, mostrando 8
// Usuário clica em "Ver mais (2)"
// - e.stopPropagation() (não expande/colapsa seção)
// - toggleShowAll('marca') executado
// - showAllValues['marca'] = true
// - Todos os 10 valores visíveis
// - Botão muda para "Ver menos"

// Usuário clica em "Ver menos"
// - showAllValues['marca'] = false
// - Volta a mostrar apenas 8 valores
```

### 10. Capitalização
```typescript
const attributes = {
  'cor': [...],           // → "Cor"
  'tamanho': [...],       // → "Tamanho"
  'tipo de tecido': [...] // → "Tipo de tecido"
};

// capitalize() aplicado apenas à primeira letra
```

---

## 🎨 Testes Visuais

### Layout
- [ ] Seções empilhadas verticalmente (space-y-4)
- [ ] Checkboxes em coluna (space-y-2)
- [ ] Header com texto e ícone alinhados
- [ ] Espaçamento interno adequado (mt-3)

### Headers
- [ ] Texto à esquerda, ícone à direita
- [ ] Hover muda cor para store-brand
- [ ] Cursor pointer
- [ ] Font-medium, text-sm

### Checkboxes
- [ ] Alinhados com labels (items-center)
- [ ] Espaçamento entre checkbox e label (space-x-2)
- [ ] Contador em cor mais clara (text-store-ink/50)
- [ ] Hover no label muda cor

### Botão "Ver Mais"
- [ ] Variant ghost
- [ ] Texto pequeno (text-xs)
- [ ] Cor brand (text-store-brand)
- [ ] Hover underline
- [ ] Ícone chevron antes do texto
- [ ] Espaçamento do conteúdo (mt-2)

### Collapsible Animation
- [ ] Transição suave ao expandir/colapsar
- [ ] Nativa do Radix UI Collapsible
- [ ] Sem quebras visuais

---

## ♿ Acessibilidade

### Collapsible
- [ ] Trigger tem role="button"
- [ ] aria-expanded reflete estado
- [ ] Keyboard: Enter/Space para toggle
- [ ] Tab navega entre triggers

### Checkboxes
- [ ] Cada checkbox tem label associado
- [ ] htmlFor conecta label ao input
- [ ] aria-checked reflete estado
- [ ] Keyboard: Space para toggle
- [ ] Focus visible

### Labels
- [ ] Texto descritivo ("Preto (8)")
- [ ] Clicável (cursor-pointer)
- [ ] Hover muda cor

### Screen Readers
- [ ] Nome do atributo anunciado ("Cor")
- [ ] Estado expandido/colapsado anunciado
- [ ] Cada valor lido com contador
- [ ] Mudanças de seleção anunciadas

---

## 🔧 Testes de Integração

### Com useStoreFilters
```typescript
const { filters, updateFilter } = useStoreFilters();
const { attributes } = useStoreFacets(storeId, filters);

<AttributeFilter
  attributes={attributes}
  selected={filters.attrs}
  onChange={(key, values) => {
    const newAttrs = { ...filters.attrs, [key]: values };
    updateFilter('attrs', newAttrs);
  }}
/>

// Fluxo:
// 1. Usuário marca "Preto" em "Cor"
// 2. onChange('cor', ['Preto']) chamado
// 3. updateFilter('attrs', { cor: ['Preto'] })
// 4. URL atualizada: ?attrs[cor]=Preto
// 5. useStoreCatalog refetch com filtros
// 6. Catálogo atualizado
```

### Com useStoreFacets
```typescript
// Facets retorna atributos disponíveis:
const facets = {
  attributes: {
    cor: [
      { value: 'Preto', count: 8 },
      { value: 'Branco', count: 5 },
    ],
    tamanho: [
      { value: 'P', count: 4 },
      { value: 'M', count: 12 },
    ],
  },
};

// AttributeFilter renderiza dinamicamente
```

### Com ActiveFiltersBadges
```typescript
// Filtros ativos: { cor: ['Preto', 'Branco'], tamanho: ['M'] }
// ActiveFiltersBadges mostra:
// - "Cor: Preto" [X]
// - "Cor: Branco" [X]
// - "Tamanho: M" [X]

// Click em [X] remove valor específico
```

---

## 🐛 Edge Cases

### 1. Atributo Sem Valores
```typescript
const attributes = {
  cor: [],
  tamanho: [{ value: 'M', count: 10 }],
};

// - Seção "Cor" renderizada mas vazia
// - Nenhum checkbox em "Cor"
// - "Tamanho" funciona normalmente
```

### 2. Valores com Nomes Longos
```typescript
const attributes = {
  cor: [
    { value: 'Preto Metálico Fosco com Detalhes Dourados', count: 2 },
  ],
};

// - Label pode quebrar em múltiplas linhas
// - flex-1 permite expansão
// - Contador permanece na mesma linha que última palavra
```

### 3. Valores Duplicados (Erro de Backend)
```typescript
const attributes = {
  cor: [
    { value: 'Preto', count: 8 },
    { value: 'Preto', count: 5 }, // Duplicado
  ],
};

// - React key warning (key={item.value})
// - Segundo checkbox sobrescreve primeiro
// - Idealmente backend não deveria enviar duplicados
```

### 4. Atributo com Nome Vazio
```typescript
const attributes = {
  '': [{ value: 'Valor', count: 5 }],
};

// - capitalize('') retorna ''
// - Header fica vazio (só ícone)
// - Funciona mas UI estranha
```

### 5. Selected com Valores Inexistentes
```typescript
const attributes = {
  cor: [{ value: 'Preto', count: 8 }],
};
const selected = {
  cor: ['Preto', 'Rosa'], // "Rosa" não existe em attributes
};

// - Checkbox "Preto" marcado
// - "Rosa" não renderizado (não está em attributes)
// - Sem erro, apenas ignorado
```

### 6. Mudança de Atributos Durante Uso
```typescript
// Estado inicial: cor: ['Preto', 'Branco']
// Usuário seleciona "Preto"
// Backend retorna novos facets sem "Branco"
// - Seção "Cor" só mostra "Preto" agora
// - "Branco" permanece em selected mas não visível
// - ActiveFiltersBadges ainda mostra "Cor: Branco"
// - Pode remover via badge
```

### 7. Colapsar Durante "Ver Mais" Ativo
```typescript
// "Ver mais" clicado, mostrando todos os 15 valores
// Usuário colapsa seção
// - Seção colapsa
// - Estado showAllValues['marca'] = true permanece
// - Ao reexpandir, continua mostrando todos os 15
```

---

## 📝 Notas de Implementação

### Estado Local
- `expandedSections`: Controla quais seções estão expandidas
- `showAllValues`: Controla "ver mais" de cada atributo
- Ambos independentes para cada atributo

### Capitalização
- `capitalize()` simples: primeira letra uppercase
- Não afeta resto da string (ex: "iPhone" → "IPhone")
- Para nomes complexos, melhor backend enviar formatado

### Collapsible
- Radix UI Collapsible fornece animação nativa
- `open` prop controla estado
- `onOpenChange` callback ao mudar

### "Ver Mais" e Collapsible
- `e.stopPropagation()` previne toggle do Collapsible
- Botão "Ver mais" não expande/colapsa seção
- Ação independente

### Ordenação
- Atributos ordenados alfabeticamente (Object.keys().sort())
- Valores mantêm ordem do backend
- Backend pode ordenar por count (descendente)

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Busca Interna**
   - Input de busca em atributos com muitos valores
   - Filtrar lista de checkboxes
   - Útil para marca com 50+ valores

2. **Ordenação Customizável**
   - Por nome (alfabética)
   - Por contagem (mais populares primeiro)
   - Toggle no header

3. **Limpar por Atributo**
   - Botão "Limpar" em cada seção
   - Remove todas as seleções daquele atributo
   - Mais rápido que desmarcar um por um

4. **Seleção Rápida**
   - "Selecionar todos"
   - "Inverter seleção"
   - Para atributos com muitos valores

5. **Ranges de Valores**
   - Se atributo for numérico (ex: tamanho de sapato)
   - Slider ao invés de checkboxes
   - Similar ao PriceFilter

6. **Ícones por Atributo**
   - Cor: círculo colorido ao invés de texto
   - Tamanho: ícone representativo
   - Mais visual

7. **Persist Expand State**
   - Salvar em localStorage
   - Restaurar ao reabrir página
   - UX melhorada para usuários recorrentes

8. **Count em Tempo Real**
   - Atualizar contadores ao aplicar outros filtros
   - Mostrar impacto de cada seleção
   - Requer facets mais sofisticados
