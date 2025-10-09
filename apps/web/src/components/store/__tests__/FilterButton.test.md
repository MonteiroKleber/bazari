# FilterButton - Documentação de Testes

## Componente
`/apps/web/src/components/store/FilterButton.tsx`

## Objetivo
Botão compacto para abrir modal de filtros em mobile/tablet. Mostra contador de filtros ativos quando aplicável.

---

## ✅ Checklist de Funcionalidades

### Renderização
- [ ] Visível apenas em mobile/tablet (lg:hidden)
- [ ] Oculto em desktop (lg+)
- [ ] Ícone SlidersHorizontal visível
- [ ] Label "Filtros" visível
- [ ] Badge renderizado apenas se activeCount > 0

### Interação
- [ ] onClick chamado ao clicar no botão
- [ ] Clicável em toda área do botão
- [ ] Hover muda cor (hover:text-store-brand)
- [ ] Touch-friendly (tamanho adequado)

### Badge
- [ ] Não aparece se activeCount === 0
- [ ] Aparece se activeCount > 0
- [ ] Mostra número correto de filtros ativos
- [ ] Cores do tema da loja (bg-store-brand)

### Estilos
- [ ] Variant outline
- [ ] Border: border-store-ink/30
- [ ] Text: text-store-ink
- [ ] Tema da loja aplicado

---

## 🧪 Cenários de Teste

### 1. Sem Filtros Ativos
```typescript
<FilterButton activeCount={0} onClick={handleClick} />

// Resultado:
// - Botão renderizado
// - Ícone + "Filtros" visíveis
// - Badge NÃO renderizado
// - Aparência padrão (outline)
```

### 2. Com Filtros Ativos
```typescript
<FilterButton activeCount={3} onClick={handleClick} />

// Resultado:
// - Botão renderizado
// - Ícone + "Filtros" visíveis
// - Badge "3" renderizado após label
// - Badge com bg-store-brand (destaque)
```

### 3. Click no Botão
```typescript
const handleClick = jest.fn();
<FilterButton activeCount={2} onClick={handleClick} />

// Usuário clica no botão
// - handleClick() é chamado
// - Modal de filtros abre (lógica no pai)
// - Botão não muda estado (stateless)
```

### 4. Contador Alto
```typescript
<FilterButton activeCount={15} onClick={handleClick} />

// Resultado:
// - Badge mostra "15"
// - Largura do badge aumenta automaticamente
// - Layout não quebra
```

### 5. Responsividade Desktop
```typescript
// Viewport >= lg (1024px+)
<FilterButton activeCount={3} onClick={handleClick} />

// Resultado:
// - Botão NÃO renderizado (lg:hidden)
// - FilterSidebar visível no lugar
// - Não ocupa espaço no DOM
```

### 6. Responsividade Mobile
```typescript
// Viewport < lg (< 1024px)
<FilterButton activeCount={3} onClick={handleClick} />

// Resultado:
// - Botão visível
// - FilterSidebar oculta
// - Botão acessível para toque
```

---

## 🎨 Testes Visuais

### Mobile (< lg)
- [ ] Botão visível e clicável
- [ ] Tamanho adequado para toque (min 44x44px)
- [ ] Ícone e texto legíveis
- [ ] Badge não sobrepõe texto
- [ ] Espaçamento adequado (ml-2 no badge)

### Tablet
- [ ] Mesma aparência que mobile
- [ ] Responsivo a diferentes larguras
- [ ] Touch targets adequados

### Desktop (lg+)
- [ ] Botão OCULTO (lg:hidden)
- [ ] Não interfere no layout
- [ ] FilterSidebar visível no lugar

### Badge
- [ ] Posicionado à direita do texto (ml-2)
- [ ] Circular ou arredondado
- [ ] Tamanho proporcional ao número
- [ ] Contraste adequado (texto branco em bg-store-brand)
- [ ] Não quebra em múltiplas linhas

### Cores do Tema
- [ ] Border: border-store-ink/30
- [ ] Text: text-store-ink (normal)
- [ ] Hover: text-store-brand, bg-store-ink/5
- [ ] Badge: bg-store-brand, text-white

### Ícone
- [ ] SlidersHorizontal visível
- [ ] Tamanho h-4 w-4
- [ ] Espaçamento mr-2 do texto
- [ ] Cor sincronizada com texto

---

## ♿ Acessibilidade

### Button
- [ ] Elemento `<button>` semântico
- [ ] onClick acessível via keyboard (Enter/Space)
- [ ] Focus visible (outline)
- [ ] Cursor pointer

### Label
- [ ] Texto descritivo "Filtros"
- [ ] Screen reader anuncia corretamente
- [ ] Contador incluído no contexto

### Badge
- [ ] aria-label no badge (opcional): "3 filtros ativos"
- [ ] Ou incluído no button aria-label
- [ ] Screen reader lê número
- [ ] Não confunde com botão separado

### Keyboard
- [ ] Tab foca no botão
- [ ] Enter/Space ativa onClick
- [ ] Shift+Tab volta ao elemento anterior
- [ ] Focus outline visível

### Touch/Mobile
- [ ] Área de toque >= 44x44px
- [ ] Espaçamento entre outros elementos
- [ ] Feedback visual ao tocar (hover state)
- [ ] Não requer precisão excessiva

---

## 🔧 Testes de Integração

### Com FilterModal
```typescript
function StorePublicPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { activeFiltersCount } = useStoreFilters();

  return (
    <>
      <FilterButton
        activeCount={activeFiltersCount}
        onClick={() => setModalOpen(true)}
      />

      <FilterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        {/* ... */}
      />
    </>
  );
}

// Fluxo:
// 1. Usuário vê FilterButton com contador "3"
// 2. Click no botão
// 3. setModalOpen(true) abre modal
// 4. Usuário ajusta filtros no modal
// 5. Modal fecha
// 6. activeFiltersCount atualiza
// 7. Badge no botão atualiza para novo número
```

### Com useStoreFilters
```typescript
const { activeFiltersCount } = useStoreFilters();
// activeFiltersCount calcula dinamicamente

<FilterButton activeCount={activeFiltersCount} onClick={openModal} />

// Sempre sincronizado com estado real de filtros
```

### Layout com SortDropdown
```typescript
// Toolbar mobile típico
<div className="flex gap-2 lg:hidden">
  <FilterButton activeCount={3} onClick={openFilters} />
  <SortDropdown value={sort} onChange={handleSort} />
</div>

// - Ambos visíveis lado a lado
// - Espaçamento consistente (gap-2)
// - Responsivos
```

---

## 🐛 Edge Cases

### 1. activeCount === 0
```typescript
<FilterButton activeCount={0} onClick={handleClick} />

// - Badge não renderizado
// - Apenas "Filtros" sem número
// - Condição: {activeCount > 0 && <Badge>}
```

### 2. activeCount Negativo
```typescript
<FilterButton activeCount={-5} onClick={handleClick} />

// - Badge não renderizado (condição > 0)
// - Erro de lógica no cálculo do pai
// - Componente não quebra
```

### 3. activeCount Muito Alto
```typescript
<FilterButton activeCount={999} onClick={handleClick} />

// - Badge mostra "999"
// - Pode ficar largo demais
// - Considerar abreviar: "99+" se > 99
// - Ou ajustar font-size do badge
```

### 4. onClick Undefined
```typescript
<FilterButton activeCount={3} onClick={undefined} />

// - TypeScript previne (required prop)
// - Se ocorrer, botão não faz nada
// - Console error do React
```

### 5. Tradução Faltando
```typescript
// i18next não tem chave 'store.catalog.filters.button'
// - Fallback 'Filtros' é usado
// - Componente funciona normalmente
```

### 6. Badge Sem Número
```typescript
<FilterButton activeCount={null} onClick={handleClick} />

// - TypeScript previne (tipo number)
// - Se passar, condição null > 0 é false
// - Badge não renderizado (comportamento correto)
```

### 7. Click Rápido Múltiplo
```typescript
// Usuário clica rapidamente várias vezes
// - onClick chamado múltiplas vezes
// - Modal abre/fecha/abre
// - Radix Dialog lida graciosamente
// - Última ação prevalece
```

---

## 📝 Notas de Implementação

### Visibilidade Condicional
- `lg:hidden` esconde em desktop
- Mobile/tablet usam modal (FilterModal)
- Desktop usa sidebar (FilterSidebar)
- Mesma lógica de filtros, UI diferente

### Badge Condicional
- Renderizado apenas se `activeCount > 0`
- Evita badge vazio ou "0"
- Mais limpo visualmente

### Stateless
- Componente não gerencia estado próprio
- activeCount vem do pai
- onClick é callback
- Fácil de testar e reutilizar

### Ícone SlidersHorizontal
- Universalmente reconhecido para filtros
- lucide-react library
- h-4 w-4 (16px) - tamanho padrão

### Badge Styling
- variant="secondary" base
- Override com bg-store-brand
- hover:bg-store-brand mantém cor
- Text branco para contraste

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Badge Animado**
   - Bounce/pulse quando número muda
   - Chama atenção para mudança
   - framer-motion ou CSS animation

2. **Tooltip**
   - Hover mostra "Filtros ativos: Categoria, Preço"
   - Resumo dos filtros aplicados
   - Apenas desktop (mobile tem modal)

3. **Indicador de Loading**
   - Spinner se filtros estão sendo aplicados
   - Desabilita botão temporariamente
   - Feedback de processamento

4. **Badge "99+"**
   - Se activeCount > 99, mostra "99+"
   - Evita badge muito largo
   - Consistente com notificações

5. **Ícone Dinâmico**
   - SlidersHorizontal normal
   - SlidersHorizontal + X quando filtros ativos
   - Indica visualmente que há filtros

6. **Vibração Tátil**
   - navigator.vibrate(50) ao clicar
   - Feedback háptico em mobile
   - Melhora sensação de interação

7. **Contador por Tipo**
   - Badge com "3 filtros, 15 itens"
   - Mais informação em menos espaço
   - Popover com detalhes

8. **Modo Compacto**
   - Apenas ícone (sem texto)
   - Para economizar espaço horizontal
   - Badge sobreposto ao ícone (canto superior direito)
