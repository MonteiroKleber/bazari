# TypeFilter - Documentação de Testes

## Componente
`/apps/web/src/components/store/TypeFilter.tsx`

## Objetivo
Filtro de tipo de item com radio buttons. Permite filtrar entre todos os itens, apenas produtos, ou apenas serviços.

---

## ✅ Checklist de Funcionalidades

### Seleção
- [ ] Opção "Todos" selecionável
- [ ] Opção "Apenas Produtos" selecionável
- [ ] Opção "Apenas Serviços" selecionável
- [ ] Apenas uma opção selecionada por vez (radio behavior)
- [ ] onChange chamado com valor correto ao selecionar

### Exibição
- [ ] Título "Tipo de Item" exibido
- [ ] Labels traduzidos
- [ ] Radio button visualmente correto (círculo)
- [ ] Radio selecionado destacado (preenchido)
- [ ] Tema da loja aplicado

### Interação
- [ ] Click no radio seleciona opção
- [ ] Click no label seleciona opção
- [ ] Hover no label muda cor (store-brand)
- [ ] Cursor pointer nos labels
- [ ] onChange não chamado se já selecionado

---

## 🧪 Cenários de Teste

### 1. Seleção Inicial
```typescript
// Renderiza com value='all'
<TypeFilter value="all" onChange={handleChange} />
// - Radio "Todos" está marcado
// - Outros radios desmarcados
```

### 2. Trocar para Produtos
```typescript
// Estado: value='all'
// Usuário clica em "Apenas Produtos"
// - onChange('product') é chamado
// - Pai atualiza estado
// - Re-render com value='product'
// - Radio "Apenas Produtos" agora marcado
```

### 3. Trocar para Serviços
```typescript
// Estado: value='product'
// Usuário clica em "Apenas Serviços"
// - onChange('service') é chamado
// - Pai atualiza estado
// - Re-render com value='service'
// - Radio "Apenas Serviços" agora marcado
```

### 4. Voltar para Todos
```typescript
// Estado: value='service'
// Usuário clica em "Todos"
// - onChange('all') é chamado
// - Filtro é removido/resetado
// - Catálogo mostra produtos E serviços
```

### 5. Click no Label
```typescript
// Click no texto "Apenas Produtos"
// - Label tem htmlFor="type-product"
// - Radio correspondente é selecionado
// - onChange('product') é chamado
// - Comportamento idêntico a click no radio
```

### 6. Click no Radio Já Selecionado
```typescript
// Estado: value='all'
// Usuário clica novamente em "Todos"
// - Radio continua marcado
// - onChange NÃO é chamado (shadcn/ui RadioGroup)
// - Sem re-renders desnecessários
```

---

## 🎨 Testes Visuais

### Desktop
- [ ] Radio buttons alinhados verticalmente
- [ ] Espaçamento entre opções (space-y-2)
- [ ] Radio e label alinhados horizontalmente (items-center)
- [ ] Espaço entre radio e label (space-x-2)
- [ ] Título destacado (font-medium)

### Mobile
- [ ] Radio buttons grande o suficiente para toque
- [ ] Labels legíveis
- [ ] Sem quebra de linha indesejada
- [ ] Espaçamento adequado

### Estados
- [ ] Radio desmarcado: círculo vazio
- [ ] Radio marcado: círculo preenchido com ponto central
- [ ] Hover no label: texto muda para store-brand
- [ ] Focus no radio: outline visível (acessibilidade)

### Cores do Tema
- [ ] Título: text-store-ink
- [ ] Labels: text-store-ink (normal), text-store-brand (hover)
- [ ] Radio border: border-store-ink/30
- [ ] Radio checked: text-store-brand

---

## ♿ Acessibilidade

### Labels
- [ ] Cada radio tem Label associado via htmlFor
- [ ] IDs únicos (type-all, type-product, type-service)
- [ ] Labels clicáveis (cursor-pointer)

### Keyboard
- [ ] Tab foca no grupo de radios
- [ ] Arrow keys navegam entre opções
- [ ] Space/Enter seleciona opção focada
- [ ] Shift+Tab volta ao elemento anterior

### Screen Readers
- [ ] RadioGroup anunciado como grupo
- [ ] Título "Tipo de Item" associado ao grupo
- [ ] Cada opção anunciada com label descritivo
- [ ] Estado marcado/desmarcado anunciado

### ARIA
- [ ] RadioGroup tem role="radiogroup"
- [ ] Cada item tem role="radio"
- [ ] aria-checked correto em cada item
- [ ] aria-labelledby associa título ao grupo (se aplicável)

---

## 🔧 Testes de Integração

### Com useStoreFilters
```typescript
const { filters, updateFilter } = useStoreFilters();

<TypeFilter
  value={filters.kind}
  onChange={(value) => updateFilter('kind', value)}
/>

// Fluxo:
// 1. Usuário seleciona "Apenas Produtos"
// 2. onChange('product') é chamado
// 3. updateFilter atualiza filters.kind
// 4. Hook atualiza URL (?kind=product)
// 5. useStoreCatalog refetch com novo filtro
// 6. Catálogo mostra apenas produtos
```

### Com URL Params
```typescript
// URL inicial: /loja/minhaloja?kind=service
// - useStoreFilters lê kind='service'
// - TypeFilter renderiza com value='service'
// - Radio "Apenas Serviços" pré-selecionado
```

### Limpar Filtros
```typescript
// clearAllFilters() é chamado
// - filters.kind reseta para 'all'
// - TypeFilter re-renderiza com value='all'
// - Radio "Todos" é selecionado
```

### Combinação com Outros Filtros
```typescript
// Filtros ativos: kind='product', categoryPath=['Eletronicos']
// Usuário muda para kind='service'
// - Categoria permanece selecionada
// - Busca agora por: serviços + categoria Eletrônicos
// - Se não houver resultados, mostra "Nenhum serviço encontrado"
```

---

## 🐛 Edge Cases

### 1. Valor Inicial Inválido
```typescript
// Props: value='invalid' as any
// - RadioGroup shadcn/ui lida graciosamente
// - Nenhum radio marcado
// - Usuário pode selecionar qualquer opção
```

### 2. onChange Undefined
```typescript
// Props: onChange não passado (erro de dev)
// - TypeScript deve prevenir (required prop)
// - Se ocorrer, click não faz nada
// - Console warning do React
```

### 3. Tradução Faltando
```typescript
// i18next não tem chave 'store.catalog.type.all'
// - Fallback 'Todos' é usado (segundo parâmetro de t())
// - UI funciona mesmo sem tradução
```

### 4. Mudança Rápida
```typescript
// Usuário clica rapidamente: Todos → Produtos → Serviços
// - Cada click dispara onChange
// - useStoreFilters debounce não se aplica (mudança instant)
// - URL atualizada 3 vezes
// - Última mudança prevalece
```

### 5. Tipo Não Suportado no Backend
```typescript
// kind='service' mas backend não tem serviços
// - Filtro aplicado normalmente
// - Backend retorna lista vazia
// - UI mostra "Nenhum item encontrado"
// - Usuário pode voltar para 'all'
```

---

## 📝 Notas de Implementação

### RadioGroup
- Usa componente shadcn/ui (baseado em Radix UI)
- Comportamento nativo de radio (apenas um selecionado)
- Acessibilidade built-in (ARIA, keyboard navigation)

### Opções Fixas
- Apenas 3 opções: all, product, service
- Hardcoded (não dinâmico como categorias)
- Backend define tipos possíveis

### Sem Contador
- Diferente de CategoryFilter, não mostra contagem
- Motivo: tipos são mutuamente exclusivos
- Facets não precisam retornar contagem por tipo

### Sem "Show More"
- Apenas 3 opções sempre visíveis
- Não precisa de paginação ou colapso
- UI sempre compacta

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Contadores Dinâmicos**
   - "Produtos (150)" / "Serviços (42)"
   - Requer agregação do backend
   - Mostra distribuição antes de filtrar

2. **Ícones**
   - Ícone de caixa para produtos
   - Ícone de ferramenta para serviços
   - Visual mais intuitivo

3. **Badges Visuais**
   - Chips coloridos ao invés de radios
   - Azul para produtos, verde para serviços
   - Click para toggle

4. **Filtro Negativo**
   - "Excluir serviços" ao invés de "Apenas produtos"
   - Permite combinações complexas
   - UI mais avançada

5. **Tipos Customizados**
   - Loja define seus próprios tipos
   - Ex: "Digital", "Físico", "Assinatura"
   - Backend retorna tipos disponíveis via facets
