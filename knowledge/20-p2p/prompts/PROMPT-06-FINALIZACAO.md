# Prompt 06: Finalizacao e Ajustes

## Contexto

Todos os componentes principais foram criados e as paginas refatoradas. Este prompt finaliza o trabalho com paginas secundarias e ajustes.

## Pre-requisitos

Verifique que as refatoracoes anteriores estao completas:
- [ ] Componentes base criados (Prompt 01)
- [ ] Componentes avancados criados (Prompt 02)
- [ ] P2PHomePage refatorada (Prompt 03)
- [ ] P2POfferNewPage como wizard (Prompt 04)
- [ ] P2POrderRoomPage refatorada (Prompt 05)

## Tarefas Restantes

### 1. Refatorar P2PMyOrdersPage

Atualizar para usar os novos componentes.

**Mudancas:**
- Usar `StatusStepper` horizontal para status
- Usar `UserBadge` para contraparte
- Usar `CountdownTimer` para ordens ativas
- Cards mais compactos

```tsx
// Antes: Card generico
<Card>
  <CardHeader>
    <CardTitle>#{order.id.slice(0,8)}</CardTitle>
    <Badge>{statusLabel(order.status)}</Badge>
  </CardHeader>
  ...
</Card>

// Depois: Card com componentes
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="font-mono text-sm">#{order.id.slice(0, 8)}</span>
      <Badge variant={getVariantFromStatus(order.status)}>
        {statusLabel(order.status)}
      </Badge>
    </div>

    {isActive(order.status) && (
      <CountdownTimer expiresAt={order.expiresAt} />
    )}
  </CardHeader>

  <CardContent>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">
          {order.side === 'SELL_BZR' ? 'Vendendo' : 'Comprando'} {order.amountBZR} BZR
        </div>
        <div className="text-sm text-muted-foreground">
          R$ {order.amountBRL}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UserBadge user={counterparty} size="sm" />
        <Button size="sm" onClick={() => navigate(`/app/p2p/orders/${order.id}`)}>
          Abrir
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

### 2. Refatorar P2POfferPublicPage

Atualizar layout e usar novos componentes.

**Mudancas:**
- Usar `UserBadge` para o dono da oferta
- Usar `CopyField` para preco (se util)
- Layout mais limpo
- Calculadora BRL/BZR mais clara

```tsx
function P2POfferPublicPage() {
  return (
    <div className="container max-w-lg mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <UserBadge user={offer.owner} stats={offer.ownerStats} linkToProfile />
            <Badge>PIX</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Preco em destaque */}
          <div className="text-center py-4">
            <div className="text-3xl font-bold">
              R$ {offer.priceBRLPerBZR}
            </div>
            <div className="text-muted-foreground">por BZR</div>
          </div>

          {/* Limites */}
          <div className="flex justify-center gap-4 text-sm">
            <span>Min: R$ {offer.minBRL}</span>
            <span className="text-muted-foreground">|</span>
            <span>Max: R$ {offer.maxBRL}</span>
          </div>

          {/* Calculadora */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={mode === 'BRL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('BRL')}
              >
                Valor em R$
              </Button>
              <Button
                variant={mode === 'BZR' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('BZR')}
              >
                Quantidade BZR
              </Button>
            </div>

            <Input
              type="number"
              placeholder={mode === 'BRL' ? 'R$ 0.00' : '0 BZR'}
              value={mode === 'BRL' ? amountBRL : amountBZR}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="text-lg"
            />

            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <span className="text-muted-foreground">Voce recebera: </span>
              <span className="font-medium">
                {mode === 'BRL' ? `${amountBZR} BZR` : `R$ ${amountBRL}`}
              </span>
            </div>
          </div>

          {/* Validacao de range */}
          {showRangeWarning && (
            <Alert variant="destructive">
              <AlertDescription>
                Valor deve estar entre R$ {offer.minBRL} e R$ {offer.maxBRL}
              </AlertDescription>
            </Alert>
          )}

          {/* CTA */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateOrder}
            disabled={!canSubmit}
          >
            {offer.side === 'SELL_BZR' ? 'Comprar BZR' : 'Vender BZR'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            A chave PIX fica visivel apos o escrow ser travado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Adicionar Traducoes

Verificar e adicionar traducoes ausentes em `apps/web/public/locales/pt/translation.json`:

```json
{
  "p2p": {
    "wizard": {
      "step1": {
        "title": "Qual ativo voce quer negociar?",
        "description": "Selecione o token que deseja comprar ou vender."
      },
      "step2": {
        "bzr": {
          "title": "O que voce quer fazer?"
        },
        "zari": {
          "title": "Quantidade de ZARI",
          "amount": "Quantidade de ZARI para vender"
        }
      },
      "step3": {
        "title": "Defina preco e limites",
        "price": "Preco por BZR (em R$)",
        "minBRL": "Valor minimo (R$)",
        "maxBRL": "Valor maximo (R$)",
        "autoReply": "Resposta automatica (opcional)",
        "autoReplyHint": "Enviada automaticamente quando alguem aceita sua oferta."
      },
      "step4": {
        "title": "Revise sua oferta",
        "warning": "Sua chave PIX sera visivel para compradores apos o escrow ser travado."
      },
      "publish": "Publicar oferta"
    },
    "home": {
      "title": "P2P Exchange",
      "subtitle": "Negocie BZR e ZARI diretamente com outros usuarios",
      "offersCount": "{{count}} ofertas disponiveis"
    },
    "empty": {
      "title": "Nenhuma oferta encontrada",
      "description": "Tente ajustar os filtros ou criar sua propria oferta."
    },
    "filters": {
      "title": "Filtros",
      "minValue": "Valor minimo",
      "maxValue": "Valor maximo",
      "minRating": "Reputacao minima",
      "apply": "Aplicar",
      "clear": "Limpar filtros"
    },
    "orderRoom": {
      "summary": "Resumo",
      "progress": "Progresso",
      "technicalDetails": "Detalhes tecnicos"
    },
    "actions": {
      "lockEscrow": "Travar no Escrow",
      "markPaid": "Ja paguei - Marcar como pago",
      "confirmReceived": "Confirmar recebimento",
      "submitReview": "Enviar avaliacao",
      "openDispute": "Abrir disputa"
    }
  }
}
```

### 4. Testes de Integracao

Criar checklist de testes manuais:

**Fluxo 1: Criar e publicar oferta BZR**
- [ ] Acessar /app/p2p
- [ ] Clicar em "Nova Oferta"
- [ ] Step 1: Selecionar BZR
- [ ] Step 2: Selecionar Vender
- [ ] Step 3: Definir preco R$ 5.50, limites R$ 100 - R$ 1000
- [ ] Step 4: Revisar e publicar
- [ ] Verificar oferta na lista

**Fluxo 2: Aceitar oferta e completar trade**
- [ ] Acessar oferta de outro usuario
- [ ] Informar valor e clicar em Comprar
- [ ] Aguardar escrow (ou travar se for vendedor)
- [ ] Fazer pagamento PIX
- [ ] Anexar comprovante
- [ ] Marcar como pago
- [ ] Aguardar confirmacao
- [ ] Avaliar contraparte

**Fluxo 3: Mobile**
- [ ] Testar todos os fluxos em viewport 375px
- [ ] Verificar bottom sheet de filtros
- [ ] Verificar wizard em tela pequena
- [ ] Verificar chat legivel

### 5. Limpeza de Codigo

Remover codigo antigo nao utilizado:
- [ ] Comentarios de debug
- [ ] Console.logs
- [ ] Codigo comentado
- [ ] Imports nao utilizados
- [ ] Variaveis nao utilizadas

### 6. Acessibilidade

Verificar:
- [ ] Todos os botoes tem aria-label
- [ ] Inputs tem labels associados
- [ ] Focus visivel em todos elementos interativos
- [ ] Tab navigation funciona
- [ ] Screen reader anuncia status corretamente

### 7. Performance

Verificar:
- [ ] Componentes pesados tem lazy loading
- [ ] Listas grandes usam virtualizacao (se necessario)
- [ ] Imagens tem loading="lazy"
- [ ] Re-renders desnecessarios evitados (memo, useMemo, useCallback)

## Validacao Final

```bash
# TypeScript
pnpm --filter @bazari/web exec tsc --noEmit

# Build
pnpm --filter @bazari/web build

# Lint (se configurado)
pnpm --filter @bazari/web lint
```

## Estrutura Final

```
apps/web/src/modules/p2p/
├── api.ts
├── utils/
│   └── format.ts
├── components/
│   ├── ActionCard.tsx
│   ├── AssetCard.tsx
│   ├── ChatPanel.tsx
│   ├── CopyField.tsx
│   ├── CountdownTimer.tsx
│   ├── FileDropzone.tsx
│   ├── FilterSheet.tsx
│   ├── OfferCard.tsx
│   ├── RatingStars.tsx
│   ├── StatusStepper.tsx
│   ├── UserBadge.tsx
│   ├── WizardStepper.tsx
│   ├── ZARIPhaseBadge.tsx
│   └── order/
│       ├── OrderHeader.tsx
│       ├── OrderSummary.tsx
│       ├── OrderStatus.tsx
│       └── index.ts
└── pages/
    ├── P2PHomePage.tsx
    ├── P2POfferNewPage.tsx
    ├── P2POfferPublicPage.tsx
    ├── P2POrderRoomPage.tsx
    ├── P2PMyOrdersPage.tsx
    └── ZARIStatsPage.tsx
```

## Conclusao

Apos completar todos os prompts:

1. **13 novos componentes** criados
2. **5 paginas** refatoradas
3. **UX simplificada** com wizard e cards contextuais
4. **Mobile-first** com layouts responsivos
5. **Acessibilidade** melhorada
6. **Codigo organizado** em componentes reutilizaveis

O modulo P2P agora oferece uma experiencia mais clara e intuitiva para os usuarios.
