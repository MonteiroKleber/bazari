# Analise da UX Atual - Modulo P2P

## Visao Geral

O modulo P2P atual permite negociacao peer-to-peer de tokens BZR e ZARI usando PIX como metodo de pagamento. A implementacao e funcional mas apresenta diversos problemas de usabilidade.

## Arquivos Atuais

```
apps/web/src/modules/p2p/
├── api.ts                          # API client
├── components/
│   ├── AssetSelector.tsx           # Seletor BZR/ZARI
│   └── ZARIPhaseBadge.tsx          # Badge de fase ZARI
└── pages/
    ├── P2PHomePage.tsx             # Listagem principal
    ├── P2POfferNewPage.tsx         # Criar nova oferta
    ├── P2POfferPublicPage.tsx      # Ver oferta publica
    ├── P2POrderRoomPage.tsx        # Sala de negociacao
    ├── P2PMyOrdersPage.tsx         # Minhas ordens
    └── ZARIStatsPage.tsx           # Estatisticas ZARI
```

## Problemas Identificados

### 1. P2PHomePage

| Problema | Descricao | Severidade |
|----------|-----------|------------|
| **Tabs confusos** | 4 tabs separados (BUY_BZR, SELL_BZR, BUY_ZARI, SELL_ZARI) sobrecarregam | Alta |
| **Hierarquia fraca** | Botoes "Minhas ordens" e "Criar oferta" competem com tabs | Media |
| **Filtros desconectados** | Filtros min/max BRL aparecem abaixo sem contexto | Media |
| **Cards genericos** | Preco nao e destacado visualmente | Alta |
| **Secao perdida** | "Minhas ofertas" no final da pagina, facil ignorar | Media |
| **Mobile ruim** | Tabs e botoes quebram em telas pequenas | Alta |

**Codigo problematico:**
```tsx
// P2PHomePage.tsx:74-84
<div className="flex items-center justify-between gap-3 mb-4">
  <div className="flex flex-wrap gap-2" role="tablist">
    <Button variant={tab==='BUY_BZR'?'default':'outline'}>...</Button>
    <Button variant={tab==='SELL_BZR'?'default':'outline'}>...</Button>
    <Button variant={tab==='BUY_ZARI'?'default':'outline'}>...</Button>
    <Button variant={tab==='SELL_ZARI'?'default':'outline'}>...</Button>
  </div>
  <div className="flex gap-2">
    <Button variant="outline">Minhas ordens</Button>
    <Button>Criar oferta</Button>
  </div>
</div>
```

### 2. P2POfferNewPage

| Problema | Descricao | Severidade |
|----------|-----------|------------|
| **Fluxo linear** | Todos campos visiveis de uma vez | Media |
| **Campos condicionais** | Aparecem/desaparecem sem transicao | Baixa |
| **Sem validacao visual** | Erros so aparecem no submit | Media |
| **PIX inline** | Input de PIX dentro do form confunde | Media |

**Codigo problematico:**
```tsx
// P2POfferNewPage.tsx - campos condicionais sem guia
{assetType === 'BZR' && (
  <div className="flex gap-2">
    <Button onClick={() => setSide('SELL_BZR')}>Vender</Button>
    <Button onClick={() => setSide('BUY_BZR')}>Comprar</Button>
  </div>
)}
{assetType === 'ZARI' && (
  <div>
    <Label>Quantidade ZARI</Label>
    <Input ... />
  </div>
)}
```

### 3. P2POrderRoomPage

| Problema | Descricao | Severidade |
|----------|-----------|------------|
| **Complexidade** | 920+ linhas, muita logica misturada | Alta |
| **Info tecnica** | Hash de transacao, escrow address expostos | Media |
| **Chat pequeno** | Area de h-48 (192px) muito limitada | Alta |
| **Botoes confusos** | Multiplas acoes escrow lado a lado | Alta |
| **Status textual** | Status como texto, nao visual | Media |

**Codigo problematico:**
```tsx
// P2POrderRoomPage.tsx:864 - chat muito pequeno
<div className="h-48 overflow-y-auto border rounded p-2">
  {messages.map((m) => (...))}
</div>
```

### 4. P2PMyOrdersPage

| Problema | Descricao | Severidade |
|----------|-----------|------------|
| **Sem preview** | Precisa navegar para ver detalhes | Baixa |
| **Acoes escondidas** | Cancelar so visivel em certos status | Baixa |

### 5. Componentes

| Componente | Problema |
|------------|----------|
| `AssetSelector` | Botoes simples, sem visual atrativo |
| `ZARIPhaseBadge` | Bom, mas poderia ter tooltip |

## Metricas de Usabilidade Esperadas

### Atual (Estimado)

- **Time to first trade**: ~5 minutos (muita fricao)
- **Drop-off rate em criacao**: ~40% (form complexo)
- **Erros de usuario**: Alto (status confusos)

### Objetivo

- **Time to first trade**: < 2 minutos
- **Drop-off rate em criacao**: < 15%
- **Erros de usuario**: Baixo (feedback claro)

## Screenshots de Referencia

### Estado Atual - HomePage
```
┌────────────────────────────────────────────────────────┐
│ [Comprar BZR] [Vender BZR] [Comprar ZARI] [Vender ZARI]│  ← 4 tabs
│                           [Minhas ordens] [Criar oferta]│  ← competem
├────────────────────────────────────────────────────────┤
│ Min BRL [____] Max BRL [____] [Aplicar filtros]        │  ← desconectado
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ @vendedor  [PIX] [Vendendo BZR]                    │ │  ← badges demais
│ │ Preco: R$ 5.50/BZR                                 │ │  ← preco pequeno
│ │ Faixa: R$ 100 - R$ 5000                            │ │
│ │                                        [Comprar]   │ │
│ └────────────────────────────────────────────────────┘ │
│ ...mais cards...                                        │
├────────────────────────────────────────────────────────┤
│ Minhas ofertas                                          │  ← perdido
│ ...                                                     │
└────────────────────────────────────────────────────────┘
```

### Estado Atual - OrderRoom
```
┌────────────────────────────────────────────────────────┐
│ #a1b2c3d4  [Vendendo BZR] [Comprando BZR] [AWAITING..] │  ← muitos badges
│ Contraparte: @fulano                                    │
├────────────────────────────────────────────────────────┤
│ Preco: R$ 5.50  |  Passos:                              │
│ Qtd: 100 BZR    |  1. Travar escrow                     │
│ Total: R$ 550   |  2. Pagar PIX                         │
│                 |  3. Confirmar                          │
│ [Confirmar escrow] [Input hash] [Confirmar]             │  ← botoes confusos
├────────────────────────────────────────────────────────┤
│ Escrow de BZR                                           │
│ [Obter instrucoes] [Lock via Backend] [Travar carteira] │  ← 3 opcoes!
│ Endereco: 5GrwvaEF5z...                                 │  ← tecnico
│ Quantidade: 100.000000000000                            │  ← muitos decimais
├────────────────────────────────────────────────────────┤
│ PIX                                                     │
│ Chave: email@vendedor.com [Copiar]                      │
├────────────────────────────────────────────────────────┤
│ Chat                                                    │
│ ┌────────────────────────────────────────────────────┐ │
│ │ mensagem 1                                         │ │  ← muito pequeno
│ │ mensagem 2                                         │ │
│ └────────────────────────────────────────────────────┘ │
│ [__________________________] [Enviar]                   │
└────────────────────────────────────────────────────────┘
```

## Conclusao

A UX atual e funcional mas:
1. **Sobrecarregada** - Muita informacao visivel
2. **Confusa** - Usuario nao sabe o que fazer
3. **Tecnica** - Expoe detalhes de blockchain
4. **Nao-mobile** - Quebra em telas pequenas

O redesign deve simplificar radicalmente mantendo toda funcionalidade.
