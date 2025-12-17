# Plano de Implementacao - P2P UX Redesign

## Fases de Implementacao

### Fase 1: Componentes Base (Fundacao)
- Criar componentes reutilizaveis
- Sem quebrar funcionalidade existente

### Fase 2: P2PHomePage
- Redesign da pagina principal
- Novos cards de oferta

### Fase 3: P2POfferNewPage
- Converter para wizard
- Experiencia guiada

### Fase 4: P2POrderRoomPage
- Layout em colunas
- Chat melhorado
- Cards de acao contextuais

### Fase 5: Paginas Secundarias
- P2PMyOrdersPage
- P2POfferPublicPage
- Ajustes finais

---

## Fase 1: Componentes Base

### Ordem de Criacao

1. **Utilitarios** (`utils/format.ts`)
2. **CopyField** - Simples, sem dependencias
3. **RatingStars** - Simples, sem dependencias
4. **UserBadge** - Usa RatingStars
5. **CountdownTimer** - Logica de timer
6. **StatusStepper** - Layout de steps
7. **WizardStepper** - Similar ao StatusStepper
8. **AssetCard** - Card de selecao
9. **OfferCard** - Card de oferta (usa UserBadge)
10. **FileDropzone** - Upload de arquivo
11. **ChatPanel** - Chat completo
12. **ActionCard** - Card contextual
13. **FilterSheet** - Bottom sheet

### Estimativa: 8-10 componentes

---

## Fase 2: P2PHomePage

### Mudancas

1. **Header**
   - Titulo + subtitulo
   - Botao "+ Nova Oferta" no canto

2. **Asset Selector**
   - Substituir tabs por AssetCard
   - Grid de 2 colunas

3. **Action Toggle**
   - Comprar/Vender como toggle simples
   - Nao como 4 tabs separados

4. **Filtros**
   - Dropdown em desktop
   - Bottom sheet em mobile

5. **Lista de Ofertas**
   - Usar OfferCard
   - Skeleton loading
   - Empty state

6. **Minhas Negociacoes**
   - Preview compacto
   - Link para pagina completa

### Fluxo de Dados

```
selectedAsset: 'BZR' | 'ZARI'
actionType: 'buy' | 'sell'
filters: { minBRL, maxBRL, minRating }
offers: P2POffer[]
myOrders: Order[] (preview, limit 3)
```

---

## Fase 3: P2POfferNewPage (Wizard)

### Steps

1. **Step 1: Ativo**
   - AssetCard para selecao
   - BZR ou ZARI

2. **Step 2: Tipo** (BZR) ou **Quantidade** (ZARI)
   - BZR: Comprar ou Vender
   - ZARI: Quantidade + fase atual

3. **Step 3: Preco e Limites**
   - Preco por unidade (BZR)
   - Min/Max BRL
   - Resposta automatica

4. **Step 4: Revisao**
   - Resumo completo
   - Confirmar publicacao

### Estado do Wizard

```tsx
interface WizardState {
  step: number;
  asset: 'BZR' | 'ZARI' | null;
  side: 'SELL_BZR' | 'BUY_BZR' | null;  // BZR only
  amountZARI: string;                     // ZARI only
  priceBRLPerBZR: string;
  minBRL: string;
  maxBRL: string;
  autoReply: string;
}
```

### Validacao por Step

```tsx
const canProceed = {
  1: !!state.asset,
  2: state.asset === 'BZR' ? !!state.side : !!state.amountZARI,
  3: !!state.priceBRLPerBZR && !!state.minBRL && !!state.maxBRL,
  4: true,  // Revisao
};
```

---

## Fase 4: P2POrderRoomPage

### Layout

```
Desktop: 2 colunas (40% resumo + 60% chat)
Mobile: Stack vertical
```

### Sections

1. **Header**
   - ID da ordem
   - Timer
   - Info da contraparte

2. **Resumo** (Left Column)
   - Detalhes da ordem
   - StatusStepper vertical
   - Info da contraparte

3. **Chat** (Right Column)
   - ChatPanel expandido
   - Altura maior em desktop

4. **Action Card** (Full Width)
   - Muda conforme status
   - Acoes contextuais

### Estados de Acao

| Status | Card | Acao Principal |
|--------|------|----------------|
| AWAITING_ESCROW | escrow | "Travar BZR" |
| AWAITING_FIAT_PAYMENT | payment | "Ja paguei" |
| AWAITING_CONFIRMATION | confirmation | "Confirmar recebimento" |
| RELEASED | completed | "Avaliar" |
| CANCELLED | cancelled | (info only) |

### Simplificacoes

- Esconder hash de transacao (mover para "detalhes tecnicos")
- Esconder endereco de escrow (acao automatica)
- Um botao principal por status

---

## Fase 5: Paginas Secundarias

### P2PMyOrdersPage

- Usar OfferCard adaptado
- Preview de status
- Acoes rapidas (reabrir, cancelar)

### P2POfferPublicPage

- Layout similar ao novo OfferCard
- Calculadora BRL <-> BZR
- CTA proeminente

---

## Checklist de Implementacao

### Fase 1: Componentes
- [ ] `utils/format.ts`
- [ ] `CopyField.tsx`
- [ ] `RatingStars.tsx`
- [ ] `UserBadge.tsx`
- [ ] `CountdownTimer.tsx`
- [ ] `StatusStepper.tsx`
- [ ] `WizardStepper.tsx`
- [ ] `AssetCard.tsx`
- [ ] `OfferCard.tsx`
- [ ] `FileDropzone.tsx`
- [ ] `ChatPanel.tsx`
- [ ] `ActionCard.tsx`
- [ ] `FilterSheet.tsx`

### Fase 2: HomePage
- [ ] Refatorar layout
- [ ] Integrar AssetCard
- [ ] Toggle Comprar/Vender
- [ ] Integrar OfferCard
- [ ] Dropdown de filtros
- [ ] Preview "Minhas negociacoes"
- [ ] Skeleton loading
- [ ] Empty state
- [ ] Mobile responsive

### Fase 3: OfferNewPage
- [ ] Estrutura de wizard
- [ ] Step 1: Selecao de ativo
- [ ] Step 2: Tipo/Quantidade
- [ ] Step 3: Preco e limites
- [ ] Step 4: Revisao
- [ ] Animacoes de transicao
- [ ] Validacao por step
- [ ] Mobile responsive

### Fase 4: OrderRoomPage
- [ ] Layout 2 colunas
- [ ] Header com timer
- [ ] Resumo da ordem
- [ ] StatusStepper
- [ ] ChatPanel integrado
- [ ] ActionCard por status
- [ ] Esconder detalhes tecnicos
- [ ] Mobile responsive

### Fase 5: Secundarias
- [ ] P2PMyOrdersPage
- [ ] P2POfferPublicPage
- [ ] Testes de usabilidade
- [ ] Ajustes finais

---

## Notas de Implementacao

### Manter Compatibilidade

- API (`p2pApi`) permanece igual
- Tipos existentes sao reutilizados
- Rotas nao mudam

### Estrategia de Migracao

1. Criar componentes novos sem quebrar antigos
2. Substituir gradualmente
3. Remover codigo antigo apos validacao

### Testes

- Testar fluxo completo: criar oferta -> aceitar -> escrow -> pagar -> confirmar
- Testar em mobile (Chrome DevTools)
- Testar com rede lenta (throttling)
- Testar estados de erro

### Performance

- Lazy load componentes pesados
- Skeleton durante loading
- Debounce em filtros
- Memoizar listas grandes
