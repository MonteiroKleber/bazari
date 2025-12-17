# Prompt 05: Refatorar P2POrderRoomPage

## Contexto

A sala de negociacao e a pagina mais complexa do modulo P2P. Vamos refatora-la para ser mais clara e com foco no chat.

## Pre-requisitos

Verifique que existem:
- `apps/web/src/modules/p2p/components/StatusStepper.tsx`
- `apps/web/src/modules/p2p/components/ChatPanel.tsx`
- `apps/web/src/modules/p2p/components/ActionCard.tsx`
- `apps/web/src/modules/p2p/components/CountdownTimer.tsx`
- `apps/web/src/modules/p2p/components/CopyField.tsx`
- `apps/web/src/modules/p2p/components/UserBadge.tsx`

## Arquivos de Referencia

- `knowledge/20-p2p/02-NOVA-UX-SPEC.md` - Layout da OrderRoom
- `apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx` - Codigo atual (920+ linhas)

## Problemas do Codigo Atual

1. **920+ linhas** em um unico arquivo
2. **Logica misturada** com UI
3. **Chat pequeno** (h-48 = 192px)
4. **Muitos botoes** de escrow lado a lado
5. **Info tecnica** exposta (hash, endereco)
6. **Status como texto** ao inves de visual

## Tarefa

Refatorar para:
1. Layout em 2 colunas (desktop) / stack (mobile)
2. Chat ocupando mais espaco
3. Card de acao contextual por status
4. Esconder detalhes tecnicos
5. Componentizar logica

### Novo Layout Desktop

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                  │
│  Ordem #a1b2c3d4                                       ⏱️ 28:45         │
│  Comprando BZR de @vendedor123                                          │
├────────────────────────────────────┬────────────────────────────────────┤
│  LEFT COLUMN (40%)                 │  RIGHT COLUMN (60%)                │
│                                    │                                    │
│  ┌────────────────────────────┐   │  ┌────────────────────────────┐   │
│  │ RESUMO                      │   │  │ CHAT                       │   │
│  │                             │   │  │                            │   │
│  │ 100 BZR por R$ 550,00       │   │  │ <ChatPanel                 │   │
│  │                             │   │  │   messages={messages}      │   │
│  │ Preco: R$ 5.50/BZR          │   │  │   onSend={handleSend}      │   │
│  │ Total: R$ 550,00            │   │  │   className="h-[400px]"    │   │
│  │                             │   │  │ />                         │   │
│  │ Contraparte:                │   │  │                            │   │
│  │ <UserBadge ... />           │   │  └────────────────────────────┘   │
│  └────────────────────────────┘   │                                    │
│                                    │                                    │
│  ┌────────────────────────────┐   │                                    │
│  │ STATUS                      │   │                                    │
│  │                             │   │                                    │
│  │ <StatusStepper              │   │                                    │
│  │   steps={orderSteps}        │   │                                    │
│  │   currentStep={...}         │   │                                    │
│  │   orientation="vertical"    │   │                                    │
│  │ />                          │   │                                    │
│  └────────────────────────────┘   │                                    │
├────────────────────────────────────┴────────────────────────────────────┤
│  ACTION CARD (full width)                                                │
│  <ActionCard variant={...} order={order} ... />                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Novo Layout Mobile

```
┌─────────────────────────┐
│ #a1b2c3  ⏱️ 28:45       │
│ Comprando de @vendedor  │
├─────────────────────────┤
│ STATUS                  │
│ <StatusStepper />       │
├─────────────────────────┤
│ RESUMO                  │
│ 100 BZR = R$ 550,00     │
├─────────────────────────┤
│ ACTION CARD             │
│ <ActionCard />          │
├─────────────────────────┤
│ CHAT (expandido)        │
│ <ChatPanel              │
│   className="h-[300px]" │
│ />                      │
└─────────────────────────┘
```

### Estrutura de Componentes

```tsx
// P2POrderRoomPage.tsx (principal)
export default function P2POrderRoomPage() {
  // Estado e logica
  return (
    <div className="container mx-auto px-4 py-3">
      <OrderHeader order={order} />

      <div className="grid lg:grid-cols-5 gap-6 mt-6">
        {/* Left Column - 2/5 */}
        <div className="lg:col-span-2 space-y-6">
          <OrderSummary order={order} counterparty={counterparty} />
          <OrderStatus order={order} />
        </div>

        {/* Right Column - 3/5 */}
        <div className="lg:col-span-3">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            currentUserId={me?.id || ''}
            counterparty={counterparty}
            disabled={!canChat}
            rateLimitSeconds={rateCountdown}
            className="h-[400px] lg:h-[500px]"
          />
        </div>
      </div>

      {/* Action Card - Full Width */}
      <div className="mt-6">
        <ActionCard
          variant={getActionVariant(order)}
          order={order}
          isMyTurn={isMyTurn}
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={handleSecondaryAction}
          loading={actionLoading}
          {...actionProps}
        />
      </div>
    </div>
  );
}
```

### Sub-componentes

**OrderHeader.tsx:**
```tsx
interface OrderHeaderProps {
  order: Order;
  counterparty?: UserProfile;
}

function OrderHeader({ order, counterparty }: OrderHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold">
          Ordem #{order.id.slice(0, 8)}
        </h1>
        <p className="text-muted-foreground">
          {order.side === 'SELL_BZR' ? 'Comprando' : 'Vendendo'} BZR de{' '}
          {counterparty?.handle ? `@${counterparty.handle}` : 'usuario'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <CountdownTimer
          expiresAt={order.expiresAt}
          onExpire={() => reload()}
        />
        <Badge>{getStatusLabel(order.status)}</Badge>
      </div>
    </div>
  );
}
```

**OrderSummary.tsx:**
```tsx
function OrderSummary({ order, counterparty }: { order: Order; counterparty?: UserProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-bold">
          {order.amountBZR} {order.assetType || 'BZR'}
        </div>
        <div className="text-lg text-muted-foreground">
          = R$ {order.amountBRL}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Preco:</span>
            <span>R$ {order.priceBRLPerBZR} / {order.assetType || 'BZR'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Metodo:</span>
            <span>PIX</span>
          </div>
        </div>

        {counterparty && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-2">Contraparte:</div>
            <UserBadge user={counterparty} linkToProfile />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**OrderStatus.tsx:**
```tsx
function OrderStatus({ order }: { order: Order }) {
  const steps = [
    {
      id: 'escrow',
      label: order.assetType === 'ZARI' ? 'Escrow ZARI' : 'Escrow BZR',
      description: 'Tokens travados com seguranca',
    },
    {
      id: 'payment',
      label: 'Pagamento PIX',
      description: 'Transferencia via PIX',
    },
    {
      id: 'confirmation',
      label: 'Confirmacao',
      description: 'Liberacao dos tokens',
    },
  ];

  const currentStep = getStepFromStatus(order.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progresso</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusStepper
          steps={steps}
          currentStep={currentStep}
          orientation="vertical"
        />
      </CardContent>
    </Card>
  );
}

function getStepFromStatus(status: Order['status']): number {
  switch (status) {
    case 'DRAFT':
    case 'AWAITING_ESCROW':
      return 0;
    case 'AWAITING_FIAT_PAYMENT':
      return 1;
    case 'AWAITING_CONFIRMATION':
      return 2;
    case 'RELEASED':
      return 3;  // Todos completos
    default:
      return 0;
  }
}
```

### Logica de ActionCard

```tsx
function getActionVariant(order: Order, me: User | null): ActionCardVariant {
  const amMaker = me?.id === order.makerId;
  const amTaker = me?.id === order.takerId;

  // Quem faz escrow: vendedor (maker se SELL, taker se BUY)
  const amEscrower = order.side === 'SELL_BZR' ? amMaker : amTaker;
  // Quem paga: comprador (taker se SELL, maker se BUY)
  const amPayer = order.side === 'SELL_BZR' ? amTaker : amMaker;
  // Quem confirma: vendedor (recebe o PIX)
  const amReceiver = order.side === 'SELL_BZR' ? amMaker : amTaker;

  switch (order.status) {
    case 'AWAITING_ESCROW':
      return amEscrower ? 'escrow' : 'waiting';

    case 'AWAITING_FIAT_PAYMENT':
      return amPayer ? 'payment' : 'waiting';

    case 'AWAITING_CONFIRMATION':
      return amReceiver ? 'confirmation' : 'waiting';

    case 'RELEASED':
      return 'completed';

    case 'CANCELLED':
    case 'EXPIRED':
      return 'cancelled';

    default:
      return 'waiting';
  }
}

function getIsMyTurn(order: Order, me: User | null): boolean {
  const variant = getActionVariant(order, me);
  return variant !== 'waiting' && variant !== 'cancelled' && variant !== 'completed';
}
```

### Simplificar Escrow

**Antes:** 3 botoes (Obter instrucoes, Lock via Backend, Travar via carteira)
**Depois:** 1 botao principal

```tsx
// ActionCard variant="escrow"
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      🔒 Travar Escrow
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <p>
      Voce precisa travar {order.amountBZR} {order.assetType || 'BZR'} para iniciar.
    </p>

    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Saldo disponivel:</span>
        <span>{balance} BZR</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Valor a travar:</span>
        <span>{order.amountBZR} BZR</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Taxa estimada:</span>
        <span>{estimatedFee} BZR</span>
      </div>
    </div>

    <Button
      onClick={onPrimaryAction}
      disabled={loading || !hasSufficientBalance}
      className="w-full"
    >
      {loading ? 'Travando...' : 'Travar BZR no Escrow'}
    </Button>

    {/* Detalhes tecnicos em accordion colapsavel */}
    <Collapsible>
      <CollapsibleTrigger className="text-xs text-muted-foreground">
        Detalhes tecnicos ▼
      </CollapsibleTrigger>
      <CollapsibleContent className="text-xs space-y-1 mt-2">
        <div>Endereco: {escrowAddress}</div>
        <div>Metodo: balances.transfer_keep_alive</div>
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

### Esconder Detalhes Tecnicos

Mover para accordion/collapsible:
- Endereco de escrow
- Hash de transacao
- Metodo de chamada
- ED (existential deposit)

### Responsividade

```tsx
// Grid responsivo
<div className="grid lg:grid-cols-5 gap-6">
  {/* Mobile: ordem inversa */}
  <div className="order-2 lg:order-1 lg:col-span-2">
    {/* Resumo e Status */}
  </div>
  <div className="order-1 lg:order-2 lg:col-span-3">
    {/* Chat */}
  </div>
</div>

{/* Mobile: Action Card entre Status e Chat */}
<div className="order-3 lg:hidden mt-4">
  <ActionCard />
</div>

{/* Desktop: Action Card no final */}
<div className="hidden lg:block mt-6">
  <ActionCard />
</div>
```

## Estrutura de Arquivos

```
apps/web/src/modules/p2p/
├── components/
│   ├── order/
│   │   ├── OrderHeader.tsx
│   │   ├── OrderSummary.tsx
│   │   ├── OrderStatus.tsx
│   │   └── index.ts
│   └── ...
└── pages/
    └── P2POrderRoomPage.tsx  (refatorado, < 300 linhas)
```

## Instrucoes

1. Criar sub-componentes em `components/order/`
2. Refatorar `P2POrderRoomPage.tsx` para usar os componentes
3. Manter toda logica de negocio funcionando
4. Chat com altura maior (h-[400px] desktop, h-[300px] mobile)
5. ActionCard contextual por status
6. Esconder detalhes tecnicos em collapsible
7. Testar fluxo completo

## Validacao

```bash
pnpm --filter @bazari/web exec tsc --noEmit
pnpm --filter @bazari/web build
```

Testar:
1. Abrir sala de ordem existente
2. Ver chat funcionando
3. Acao correta por status
4. Timer funcionando
5. Responsivo em mobile
