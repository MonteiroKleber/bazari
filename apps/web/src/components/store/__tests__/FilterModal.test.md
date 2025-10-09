# FilterModal - Documentação de Testes

## Componente
`/apps/web/src/components/store/FilterModal.tsx`

## Objetivo
Modal/Sheet de filtros para mobile e tablet. Desliza de baixo com os mesmos componentes da FilterSidebar, mas em formato modal.

---

## ✅ Checklist de Funcionalidades

### Abertura/Fechamento
- [ ] Abre quando open={true}
- [ ] Fecha quando open={false}
- [ ] onOpenChange chamado ao fechar
- [ ] Fecha ao clicar no X
- [ ] Fecha ao pressionar Esc
- [ ] Fecha ao clicar no backdrop
- [ ] Fecha ao clicar em "Aplicar"

### Layout
- [ ] Desliza de baixo (side="bottom")
- [ ] Altura de 85vh
- [ ] Header fixo no topo
- [ ] Footer fixo no fundo
- [ ] Conteúdo scrollável entre header e footer
- [ ] Backdrop escurece página de fundo

### Componentes Incluídos
- [ ] SearchBar renderizado e funcional
- [ ] CategoryFilter renderizado (se houver categorias)
- [ ] PriceFilter renderizado
- [ ] TypeFilter renderizado
- [ ] Botão "Limpar" no footer
- [ ] Botão "Aplicar (N)" no footer

### Interações
- [ ] Filtros atualizam em tempo real
- [ ] onFilterChange propagado corretamente
- [ ] "Limpar" chama onClearAll
- [ ] "Limpar" não fecha o modal
- [ ] "Aplicar" fecha o modal
- [ ] Contador de resultados atualizado

### Estilos
- [ ] Background: bg-store-bg
- [ ] Border: border-store-ink/15
- [ ] Tema aplicado em todos os componentes
- [ ] Footer com borda superior (border-t)
- [ ] Botões com largura flex-1 (50% cada)

---

## 🧪 Cenários de Teste

### 1. Abrir Modal
```typescript
const [open, setOpen] = useState(false);

// Usuário clica em FilterButton
setOpen(true);

// Resultado:
// - Modal desliza de baixo com animação
// - Backdrop aparece com fade-in
// - Conteúdo do modal visível
// - Body overflow hidden (previne scroll da página)
```

### 2. Fechar Modal (X)
```typescript
// Modal aberto
// Usuário clica no X (canto superior direito)
// - onOpenChange(false) é chamado
// - Modal desliza para baixo com animação
// - Backdrop desaparece com fade-out
// - Body overflow restaurado
```

### 3. Fechar Modal (Backdrop)
```typescript
// Modal aberto
// Usuário clica fora do modal (no backdrop escuro)
// - onOpenChange(false) é chamado
// - Modal fecha normalmente
```

### 4. Fechar Modal (Esc)
```typescript
// Modal aberto
// Usuário pressiona tecla Esc
// - onOpenChange(false) é chamado
// - Modal fecha
// - Funcionalidade nativa do Sheet
```

### 5. Aplicar Filtros
```typescript
// Usuário modifica filtros
// Usuário clica em "Aplicar (42)"
// - handleApply() é executado
// - onOpenChange(false) é chamado
// - Modal fecha
// - Filtros já aplicados (mudaram em tempo real)
// - Catálogo atualizado
```

### 6. Limpar Filtros
```typescript
// Filtros ativos: q='laptop', categoryPath=['Eletrônicos']
// Usuário clica em "Limpar"
// - handleClearAll() executado
// - onClearAll() chamado
// - Todos os filtros resetados
// - Modal PERMANECE ABERTO
// - Inputs vazios
// - Botão "Limpar" desabilitado
// - Contador muda para total de itens
```

### 7. Filtros em Tempo Real
```typescript
// Modal aberto
// Usuário digita "mouse" no SearchBar
// - onFilterChange('q', 'mouse') após 500ms
// - Filtros atualizados no componente pai
// - useStoreCatalog refetch
// - resultsCount atualizado
// - Botão mostra novo contador: "Aplicar (18)"
// - Modal ainda aberto
```

### 8. Scroll de Conteúdo
```typescript
// Muitas categorias e filtros
// Conteúdo excede viewport
// - Header e footer fixos
// - Área central scrollável (overflow-y-auto)
// - Scroll touch funciona em mobile
// - Não afeta scroll da página de fundo
```

### 9. Contador de Resultados
```typescript
// resultsCount = 0
// - Botão mostra "Aplicar (0)"
// - Usuário pode aplicar mesmo sem resultados
// - Mostra feedback de que busca não retornou nada

// resultsCount = 150
// - Botão mostra "Aplicar (150)"
// - Número atualiza conforme filtros mudam
```

### 10. Sem Filtros Ativos
```typescript
// Todos os filtros vazios
// - hasActiveFilters = false
// - Botão "Limpar" DESABILITADO
// - Botão "Aplicar" habilitado (pode fechar modal)
// - resultsCount mostra total de itens da loja
```

---

## 🎨 Testes Visuais

### Mobile (< lg)
- [ ] Sheet ocupa 85% da altura da tela
- [ ] Largura completa (inset-x-0)
- [ ] Animação suave ao abrir/fechar
- [ ] Não corta conteúdo importante

### Tablet
- [ ] Mesma altura (85vh)
- [ ] Largura responsiva
- [ ] Touch gestures funcionam
- [ ] Botões grandes o suficiente

### Header
- [ ] Título "Filtros" visível
- [ ] Botão X no canto superior direito
- [ ] Espaçamento adequado (SheetHeader)
- [ ] Cor do texto: text-store-ink

### Footer
- [ ] Fixo no fundo (não rola com conteúdo)
- [ ] Borda superior (border-t)
- [ ] 2 botões lado a lado (flex-row gap-3)
- [ ] "Limpar" à esquerda, "Aplicar" à direita
- [ ] Ambos com flex-1 (mesma largura)

### Conteúdo
- [ ] Espaçamento entre filtros (space-y-6)
- [ ] Padding vertical (py-6)
- [ ] Scroll suave
- [ ] Não há espaços duplos

### Backdrop
- [ ] Escurece página de fundo
- [ ] Semi-transparente (bg-background/80)
- [ ] Blur effect (backdrop-blur-sm)
- [ ] Clicável para fechar

---

## ♿ Acessibilidade

### Dialog/Modal
- [ ] role="dialog" aplicado
- [ ] aria-modal="true"
- [ ] aria-labelledby associado ao título
- [ ] Foco preso dentro do modal (focus trap)

### Keyboard Navigation
- [ ] Tab navega entre elementos do modal
- [ ] Não pula para elementos da página de fundo
- [ ] Esc fecha o modal
- [ ] Enter em "Aplicar" fecha modal
- [ ] Shift+Tab funciona normalmente

### Focus Management
- [ ] Foco move para primeiro elemento ao abrir
- [ ] Foco retorna ao elemento que abriu ao fechar
- [ ] Outline visível em todos os elementos
- [ ] Botão X alcançável via teclado

### Screen Readers
- [ ] Título "Filtros" anunciado
- [ ] Estado aberto/fechado anunciado
- [ ] Contador de resultados lido corretamente
- [ ] Botões com labels descritivos
- [ ] Mudanças de filtro anunciadas (opcional)

### Mobile Accessibility
- [ ] Botões grandes (min-height 44px)
- [ ] Toque funciona em toda área do botão
- [ ] Swipe down para fechar (nativo do Sheet)
- [ ] VoiceOver/TalkBack compatíveis

---

## 🔧 Testes de Integração

### Com FilterButton
```typescript
function StorePublicPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { filters, updateFilter, clearAllFilters } = useStoreFilters();
  const { items, page } = useStoreCatalog(storeId, filters);
  const facets = useStoreFacets(storeId, filters);

  return (
    <>
      <FilterButton onClick={() => setModalOpen(true)} count={activeFiltersCount} />

      <FilterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        storeId={storeId}
        filters={filters}
        facets={facets}
        onFilterChange={updateFilter}
        onClearAll={clearAllFilters}
        resultsCount={page.total}
      />
    </>
  );
}

// Fluxo:
// 1. Usuário clica em FilterButton
// 2. setModalOpen(true) abre modal
// 3. Usuário ajusta filtros
// 4. Click em "Aplicar" fecha modal
// 5. Catálogo já atualizado (filtros em tempo real)
```

### Com useStoreCatalog
```typescript
// Filtros mudam enquanto modal está aberto
// - useStoreCatalog refetch automaticamente
// - resultsCount atualiza no botão "Aplicar"
// - Usuário vê preview dos resultados

const { page } = useStoreCatalog(storeId, filters);
// page.total = 42
// Botão mostra "Aplicar (42)"
```

### Sincronização de Estado
```typescript
// Estado compartilhado entre modal e página
// - filters é prop do pai
// - onFilterChange atualiza estado no pai
// - Re-render do modal com novos valores
// - Nenhum estado duplicado ou dessincronizado
```

---

## 🐛 Edge Cases

### 1. Abrir Modal Rapidamente
```typescript
// Usuário abre e fecha rapidamente múltiplas vezes
// - Animações podem se sobrepor
// - Sheet lida graciosamente (Radix UI)
// - Última ação prevalece
// - Sem erros de console
```

### 2. Mudanças Durante Animação
```typescript
// Modal fechando (animação)
// Filtros mudam externamente
// - Props atualizadas mas modal já fechando
// - Re-render seguro (modal não visível)
// - Próxima abertura mostra valores corretos
```

### 3. Muitos Resultados
```typescript
// resultsCount = 999999
// - Botão mostra "Aplicar (999999)"
// - Número pode quebrar layout em mobile
// - Considerar abreviar: "Aplicar (999k+)"
```

### 4. Sem Resultados
```typescript
// resultsCount = 0
// - Botão mostra "Aplicar (0)"
// - Usuário pode fechar modal
// - Catálogo exibe "Nenhum item encontrado"
```

### 5. Facets Loading
```typescript
// Modal abre enquanto facets carregam
// - facets = { categories: [], priceRange: {min:'0',max:'0'}, attributes: {} }
// - Modal renderiza normalmente
// - CategoryFilter não aparece
// - Outros filtros funcionam
// - Quando facets carregam, re-render atualiza
```

### 6. Scroll Durante Backdrop Click
```typescript
// Usuário scrollando conteúdo interno
// Acidentalmente clica em backdrop
// - Modal fecha
// - Comportamento esperado (fecha ao clicar fora)
// - Usuário pode reabrir
```

### 7. Filtros Muito Longos
```typescript
// 100+ categorias
// - Conteúdo scrollável (overflow-y-auto)
// - CategoryFilter tem "Show More" interno
// - Performance OK (virtualização não necessária no MVP)
```

### 8. Limpar Durante Debounce
```typescript
// Usuário digitando no SearchBar
// Clica em "Limpar" antes do debounce terminar
// - Timer do debounce cancelado (useStoreFilters)
// - Todos os filtros resetados imediatamente
// - Nenhum valor pendente aplicado
```

---

## 📝 Notas de Implementação

### Sheet vs Dialog
- Usa Sheet do shadcn/ui (baseado em Radix Dialog)
- side="bottom" para deslizar de baixo
- Mais nativo em mobile (similar a bottom sheet Android/iOS)

### Altura Fixa
- h-[85vh] garante que não ocupa tela inteira
- 15% do topo visível (mostra que é modal)
- Ajustável se necessário

### Footer Fixo
- flex-col com flex-1 no conteúdo
- Footer fora do scroll (sempre visível)
- Importante para ação primária ("Aplicar")

### Botão "Limpar" Não Fecha
- Permite limpar e continuar ajustando
- Diferente do "Aplicar" que fecha
- UX: usuário pode resetar e refazer filtros

### Contador em Tempo Real
- resultsCount vem do pai
- Atualiza conforme useStoreCatalog refetch
- Mostra preview dos resultados antes de aplicar

### Theme Variables
- bg-store-bg, text-store-ink, border-store-ink
- Consistente com FilterSidebar e outros componentes
- Botão "Aplicar" usa bg-store-brand

---

## 🚀 Melhorias Futuras (Fora do MVP)

1. **Swipe to Close**
   - Gesto de arrastar para baixo fecha modal
   - Nativo em alguns Sheet implementations
   - Melhora UX mobile

2. **Preview de Resultados**
   - Mini-grid com primeiros 3 resultados
   - Atualiza enquanto filtros mudam
   - Usuário vê impacto antes de aplicar

3. **Salvar Filtros**
   - Botão "Salvar esta busca"
   - Atalhos para filtros salvos
   - Sincronização com conta

4. **Animação de Contador**
   - Número anima ao mudar (count up/down)
   - Feedback visual de impacto
   - react-spring ou framer-motion

5. **Modo Compacto**
   - Opção de altura reduzida (50vh)
   - Para usuários que querem ver mais do catálogo
   - Toggle entre normal e compacto

6. **Histórico de Filtros**
   - "Voltar" para filtros anteriores
   - Útil se usuário aplicou por engano
   - Stack de estados

7. **Confirmação ao Limpar**
   - Se muitos filtros ativos
   - "Tem certeza que deseja limpar X filtros?"
   - Evita perda acidental de trabalho

8. **Loading State**
   - Skeleton durante carregamento de facets
   - Spinner no botão "Aplicar" se estiver processando
   - Feedback visual melhorado
