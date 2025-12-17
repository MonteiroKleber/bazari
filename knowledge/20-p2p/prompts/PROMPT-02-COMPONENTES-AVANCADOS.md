# Prompt 02: Componentes Avancados P2P

## Contexto

Continuando o redesign do modulo P2P. Ja temos os componentes base criados no Prompt 01. Agora vamos criar os componentes mais complexos.

## Pre-requisitos

Verifique que os componentes do Prompt 01 existem:
- `apps/web/src/modules/p2p/components/CopyField.tsx`
- `apps/web/src/modules/p2p/components/RatingStars.tsx`
- `apps/web/src/modules/p2p/components/UserBadge.tsx`
- `apps/web/src/modules/p2p/components/CountdownTimer.tsx`
- `apps/web/src/modules/p2p/components/StatusStepper.tsx`
- `apps/web/src/modules/p2p/components/AssetCard.tsx`

## Arquivos de Referencia

- `knowledge/20-p2p/03-COMPONENTES.md` - Especificacao dos componentes
- `apps/web/src/modules/p2p/api.ts` - Tipos da API
- `apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx` - Logica atual do chat

## Tarefa

Criar os seguintes componentes:

### 1. OfferCard.tsx

Card completo para ofertas:

```tsx
interface OfferCardProps {
  offer: {
    id: string;
    owner: {
      handle?: string;
      avatarUrl?: string;
      userId?: string;
    } | null;
    ownerStats?: {
      avgStars?: number;
      totalTrades?: number;
    } | null;
    priceBRLPerBZR?: string;
    priceBRLPerUnit?: string;
    minBRL: string;
    maxBRL: string;
    method: 'PIX';
    assetType?: 'BZR' | 'ZARI';
    phase?: string;
    side: 'SELL_BZR' | 'BUY_BZR';
  };
  actionType: 'buy' | 'sell';
  onAction: () => void;
  className?: string;
}
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  👤 @vendedor123              ⭐ 4.8 (127 trades) 🔥         │
│                                                              │
│  R$ 5,50                                                     │
│  por BZR                      PIX                            │
│  ────────────────────────────────────────────────────────── │
│  Limite: R$ 100 - R$ 5.000                                   │
│                                                              │
│                                    [  Comprar BZR  →  ]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Requisitos:
- Usar `UserBadge` para o vendedor
- Preco grande e destacado (text-2xl ou maior)
- Badge PIX
- Badge de fase se ZARI
- Botao de acao com seta
- Hover effect no card

### 2. FileDropzone.tsx

Area de upload com drag-and-drop:

```tsx
interface FileDropzoneProps {
  onUpload: (file: File) => Promise<string>;  // Returns URL
  accept?: string;                             // default "image/*"
  maxSize?: number;                            // bytes, default 5MB
  preview?: boolean;                           // mostrar preview
  value?: string;                              // URL atual
  onRemove?: () => void;
  className?: string;
}
```

**Visual vazio:**
```
┌─────────────────────────────────────────┐
│                                         │
│         📎 Anexar comprovante           │
│                                         │
│   Arraste uma imagem ou clique para     │
│   selecionar do seu dispositivo         │
│                                         │
└─────────────────────────────────────────┘
```

**Visual com arquivo:**
```
┌─────────────────────────────────────────┐
│ ┌─────────────────┐                     │
│ │   [imagem]      │  comprovante.png    │
│ │   preview       │  245 KB             │
│ └─────────────────┘         [❌ Remover] │
└─────────────────────────────────────────┘
```

Requisitos:
- Drag and drop funcional
- Click para abrir file picker
- Mostrar preview da imagem
- Loading state durante upload
- Erro se arquivo muito grande
- Usar `apiHelpers.uploadFile` para upload

### 3. ChatPanel.tsx

Painel de chat completo:

```tsx
interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    handle?: string;
    avatarUrl?: string;
  } | null;
  kind?: 'user' | 'system';
  attachments?: string[];
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (text: string) => Promise<void>;
  currentUserId: string;
  counterparty?: {
    handle?: string;
    avatarUrl?: string;
  };
  disabled?: boolean;
  rateLimitSeconds?: number;  // Mostrar countdown se rate limited
  loading?: boolean;
  className?: string;
}
```

**Visual:**
```
┌─────────────────────────────────────────┐
│ 💬 Chat com @vendedor123                │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────┐           │
│  │ @vendedor: Ola! Pode     │   10:30   │
│  │ fazer o PIX agora?       │           │
│  └──────────────────────────┘           │
│                                         │
│           ┌──────────────────────────┐  │
│   10:32   │ Voce: Sim! Fazendo agora │  │
│           └──────────────────────────┘  │
│                                         │
│  ┌──────────────────────────┐           │
│  │ Sistema: Pagamento       │   10:35   │
│  │ marcado como enviado     │           │
│  └──────────────────────────┘           │
│                                         │
├─────────────────────────────────────────┤
│ [Mensagem...              ] [Enviar]    │
└─────────────────────────────────────────┘
```

Requisitos:
- Mensagens do usuario a direita (bg diferente)
- Mensagens da contraparte a esquerda
- Mensagens do sistema centralizadas (estilo diferente)
- Scroll automatico para ultima mensagem
- Input desabilitado se `disabled` ou rate limited
- Mostrar countdown se rate limited
- Enter para enviar
- Avatar pequeno ao lado das mensagens

### 4. ActionCard.tsx

Card de acao contextual por status:

```tsx
type ActionCardVariant =
  | 'escrow'           // AWAITING_ESCROW
  | 'payment'          // AWAITING_FIAT_PAYMENT
  | 'confirmation'     // AWAITING_CONFIRMATION
  | 'completed'        // RELEASED
  | 'cancelled'        // CANCELLED
  | 'waiting';         // Aguardando a outra parte

interface ActionCardProps {
  variant: ActionCardVariant;
  order: {
    id: string;
    amountBZR: string;
    amountBRL: string;
    pixKeySnapshot?: string | null;
    proofUrls?: string[] | null;
    assetType?: 'BZR' | 'ZARI';
  };
  isMyTurn: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  loading?: boolean;
  // Para variant='escrow':
  balance?: string;
  estimatedFee?: string;
  // Para variant='payment':
  onUploadProof?: (file: File) => Promise<string>;
  proofUrl?: string;
  onRemoveProof?: () => void;
  // Para variant='completed':
  rating?: number;
  onRatingChange?: (rating: number) => void;
}
```

**Variantes:**

**escrow:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 TRAVAR ESCROW                                            │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ Voce precisa travar 100 BZR para iniciar a negociacao.      │
│                                                              │
│ Saldo disponivel: 1.250,00 BZR                              │
│ Valor a travar:   100,00 BZR                                │
│ Taxa estimada:    0,01 BZR                                  │
│                                                              │
│                               [  Travar BZR no Escrow  →  ] │
└─────────────────────────────────────────────────────────────┘
```

**payment:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📱 PAGAMENTO PIX                                            │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ Chave PIX                          Valor                     │
│ ┌─────────────────────┐           ┌──────────────┐          │
│ │ email@vendedor  📋  │           │ R$ 550,00 📋 │          │
│ └─────────────────────┘           └──────────────┘          │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  📎 Anexar comprovante                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│                          [  Ja paguei - Marcar como pago  ] │
└─────────────────────────────────────────────────────────────┘
```

**confirmation:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ CONFIRMAR RECEBIMENTO                                    │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ O comprador marcou o pagamento como enviado.                │
│                                                              │
│ Comprovante:                                                 │
│ [Imagem do comprovante - clicavel]                          │
│                                                              │
│ Ao confirmar, 100 BZR serao liberados.                      │
│                                                              │
│ [Abrir disputa]              [  Confirmar recebimento  →  ] │
└─────────────────────────────────────────────────────────────┘
```

**completed:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ NEGOCIACAO CONCLUIDA                                     │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ A negociacao foi concluida com sucesso!                     │
│                                                              │
│ Avalie sua experiencia:                                      │
│        ⭐ ⭐ ⭐ ⭐ ⭐                                         │
│                                                              │
│                                    [  Enviar avaliacao  ]   │
└─────────────────────────────────────────────────────────────┘
```

**waiting:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⏳ AGUARDANDO                                               │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ Aguardando a contraparte {acao}.                            │
│                                                              │
│ Voce sera notificado quando houver atualizacao.             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Requisitos:
- Usar `CopyField` para PIX e valor
- Usar `FileDropzone` para comprovante
- Usar `RatingStars` para avaliacao
- Card com borda colorida (azul escrow, verde payment, etc)
- Botao primario sempre a direita
- Loading state no botao

### 5. FilterSheet.tsx

Bottom sheet para filtros (mobile):

```tsx
interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    minBRL?: string;
    maxBRL?: string;
    minRating?: number;
  };
  onApply: (filters: typeof filters) => void;
  onClear: () => void;
}
```

**Visual:**
```
┌─────────────────────────────────────────┐
│ Filtros                             X   │
├─────────────────────────────────────────┤
│                                         │
│ Valor (BRL)                             │
│ Min: [________] R$                      │
│ Max: [________] R$                      │
│                                         │
│ Reputacao minima                        │
│ ⭐ [____4____] ou mais                  │
│                                         │
├─────────────────────────────────────────┤
│ [Limpar filtros]        [Aplicar]       │
└─────────────────────────────────────────┘
```

Requisitos:
- Usar `Sheet` do shadcn (ou criar bottom sheet)
- Em mobile: bottom sheet
- Em desktop: pode ser dropdown
- Slider ou input para rating minimo

## Instrucoes

1. Criar cada componente em arquivo separado
2. Reutilizar componentes do Prompt 01
3. Usar `apiHelpers.uploadFile` para upload (de `@/lib/api`)
4. Usar `framer-motion` para animacoes se desejar
5. Testar interacoes (drag, click, keyboard)
6. Adicionar traducoes com `useTranslation`

## Validacao

```bash
pnpm --filter @bazari/web exec tsc --noEmit
```

Nao deve haver erros de TypeScript.
