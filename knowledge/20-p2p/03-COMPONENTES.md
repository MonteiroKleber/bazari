# Componentes - P2P UX Redesign

## Novos Componentes a Criar

### 1. AssetCard

Substitui o seletor atual por cards visuais.

**Arquivo:** `apps/web/src/modules/p2p/components/AssetCard.tsx`

```tsx
interface AssetCardProps {
  asset: 'BZR' | 'ZARI';
  selected?: boolean;
  onClick?: () => void;
  priceInfo?: string;        // "R$ 5.50" ou "Fase 2A: R$ 1.38"
  disabled?: boolean;
}
```

**Uso:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <AssetCard
    asset="BZR"
    selected={selectedAsset === 'BZR'}
    onClick={() => setSelectedAsset('BZR')}
    priceInfo="R$ 5.50"
  />
  <AssetCard
    asset="ZARI"
    selected={selectedAsset === 'ZARI'}
    onClick={() => setSelectedAsset('ZARI')}
    priceInfo="Fase 2A: R$ 1.38"
  />
</div>
```

**Visual:**
```
┌─────────────────────┐
│         💰          │
│                     │
│        BZR          │
│    Token Nativo     │
│    ─────────────    │
│    R$ 5.50          │
└─────────────────────┘
```

---

### 2. OfferCard

Card redesenhado para ofertas com preco em destaque.

**Arquivo:** `apps/web/src/modules/p2p/components/OfferCard.tsx`

```tsx
interface OfferCardProps {
  offer: {
    id: string;
    owner: {
      handle?: string;
      avatarUrl?: string;
    };
    ownerStats?: {
      avgStars?: number;
      totalTrades?: number;
    };
    priceBRLPerBZR?: string;
    priceBRLPerUnit?: string;  // Para ZARI
    minBRL: string;
    maxBRL: string;
    method: 'PIX';
    assetType: 'BZR' | 'ZARI';
    phase?: string;
    side: 'SELL_BZR' | 'BUY_BZR';
  };
  actionType: 'buy' | 'sell';
  onAction: () => void;
}
```

**Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  👤 @vendedor123              ⭐ 4.8 (127 trades) 🔥         │
│                                                              │
│  R$ 5,50                                                     │  ← GRANDE
│  por BZR                      PIX                            │
│  ────────────────────────────────────────────────────────── │
│  Limite: R$ 100 - R$ 5.000                                   │
│                                                              │
│                                    [  Comprar BZR  →  ]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. StatusStepper

Componente visual para progresso da ordem.

**Arquivo:** `apps/web/src/modules/p2p/components/StatusStepper.tsx`

```tsx
interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StatusStepperProps {
  steps: Step[];
  currentStep: number;  // 0-indexed
  orientation?: 'horizontal' | 'vertical';
}
```

**Visual Horizontal:**
```
  ✅ ──────────── ⏳ ──────────── ○
Escrow         Pagamento      Confirmar
```

**Visual Vertical:**
```
✅  Escrow travado
│   BZR bloqueado com sucesso
│
⏳  Aguardando pagamento PIX
│   Faca o pagamento e anexe o comprovante
│
○   Confirmar recebimento
    Aguardando confirmacao do vendedor
```

---

### 4. ActionCard

Card contextual que muda conforme status da ordem.

**Arquivo:** `apps/web/src/modules/p2p/components/ActionCard.tsx`

```tsx
type ActionCardVariant =
  | 'escrow'           // AWAITING_ESCROW
  | 'payment'          // AWAITING_FIAT_PAYMENT
  | 'confirmation'     // AWAITING_CONFIRMATION
  | 'completed'        // RELEASED
  | 'cancelled'        // CANCELLED
  | 'dispute';         // DISPUTE_*

interface ActionCardProps {
  variant: ActionCardVariant;
  order: Order;
  isMyTurn: boolean;           // Se e a vez do usuario agir
  onAction: () => void;
  onSecondaryAction?: () => void;
  loading?: boolean;
}
```

---

### 5. ChatPanel

Componente de chat melhorado.

**Arquivo:** `apps/web/src/modules/p2p/components/ChatPanel.tsx`

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
  onSend: (text: string, attachments?: File[]) => Promise<void>;
  currentUserId: string;
  counterparty?: {
    handle?: string;
    avatarUrl?: string;
  };
  disabled?: boolean;
  rateLimitSeconds?: number;
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
│ ┌─────────────────────────┐ [📎] [Send] │
│ │ Digite uma mensagem...  │             │
│ └─────────────────────────┘             │
└─────────────────────────────────────────┘
```

---

### 6. CopyField

Campo com botao de copiar integrado.

**Arquivo:** `apps/web/src/modules/p2p/components/CopyField.tsx`

```tsx
interface CopyFieldProps {
  label: string;
  value: string;
  className?: string;
}
```

**Visual:**
```
Chave PIX
┌─────────────────────────────────────────┐
│ email@vendedor.com                  📋  │
└─────────────────────────────────────────┘
```

---

### 7. FileDropzone

Area de upload com drag-and-drop.

**Arquivo:** `apps/web/src/modules/p2p/components/FileDropzone.tsx`

```tsx
interface FileDropzoneProps {
  onUpload: (file: File) => Promise<string>;  // Returns URL
  accept?: string;                             // "image/*"
  maxSize?: number;                            // bytes
  preview?: boolean;
  className?: string;
}
```

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│         📎 Anexar comprovante           │
│                                         │
│   Arraste uma imagem ou clique para     │
│   selecionar do seu dispositivo         │
│                                         │
└─────────────────────────────────────────┘

// Apos upload:
┌─────────────────────────────────────────┐
│ ┌─────────────────┐                     │
│ │   [imagem]      │  comprovante.png    │
│ │   preview       │  245 KB             │
│ └─────────────────┘         [❌ Remover] │
└─────────────────────────────────────────┘
```

---

### 8. CountdownTimer

Timer visual para expiracao.

**Arquivo:** `apps/web/src/modules/p2p/components/CountdownTimer.tsx`

```tsx
interface CountdownTimerProps {
  expiresAt: string;           // ISO date
  warningThreshold?: number;   // seconds, default 300 (5min)
  onExpire?: () => void;
  className?: string;
}
```

**Visual:**
```
// Normal
⏱️ 28:45

// Warning (< 5 min)
⏱️ 04:32  (pulsando em vermelho)

// Expired
⏱️ Expirado
```

---

### 9. WizardStepper

Stepper para wizard de criacao de oferta.

**Arquivo:** `apps/web/src/modules/p2p/components/WizardStepper.tsx`

```tsx
interface WizardStep {
  id: string;
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;  // Se permitir voltar
}
```

**Visual:**
```
● ─────────── ○ ─────────── ○ ─────────── ○
Ativo        Tipo         Preco        Revisar
```

---

### 10. FilterSheet

Bottom sheet para filtros em mobile.

**Arquivo:** `apps/web/src/modules/p2p/components/FilterSheet.tsx`

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

---

### 11. RatingStars

Componente de avaliacao com estrelas.

**Arquivo:** `apps/web/src/modules/p2p/components/RatingStars.tsx`

```tsx
interface RatingStarsProps {
  value: number;              // 0-5
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;        // Mostrar "4.8" ao lado
}
```

**Visual:**
```
// Interativo
⭐ ⭐ ⭐ ⭐ ☆   (clicavel)

// Readonly
⭐ 4.8 (127)
```

---

### 12. UserBadge

Badge de usuario com avatar e reputacao.

**Arquivo:** `apps/web/src/modules/p2p/components/UserBadge.tsx`

```tsx
interface UserBadgeProps {
  user: {
    handle?: string;
    avatarUrl?: string;
  };
  stats?: {
    avgStars?: number;
    totalTrades?: number;
  };
  isVerified?: boolean;
  isHighVolume?: boolean;  // 🔥 badge
  linkToProfile?: boolean;
}
```

**Visual:**
```
👤 @vendedor123  ⭐ 4.8 (127) 🔥
```

---

## Componentes Existentes a Modificar

### 1. AssetSelector

**Antes:** Botoes simples
**Depois:** Usar `AssetCard` internamente

### 2. ZARIPhaseBadge

**Manter** - Ja esta bom, apenas adicionar:
- Tooltip com mais detalhes
- Animacao quando fase muda

---

## Estrutura de Arquivos Final

```
apps/web/src/modules/p2p/
├── api.ts
├── components/
│   ├── ActionCard.tsx          # NOVO
│   ├── AssetCard.tsx           # NOVO
│   ├── AssetSelector.tsx       # Modificar
│   ├── ChatPanel.tsx           # NOVO
│   ├── CopyField.tsx           # NOVO
│   ├── CountdownTimer.tsx      # NOVO
│   ├── FileDropzone.tsx        # NOVO
│   ├── FilterSheet.tsx         # NOVO
│   ├── OfferCard.tsx           # NOVO
│   ├── RatingStars.tsx         # NOVO
│   ├── StatusStepper.tsx       # NOVO
│   ├── UserBadge.tsx           # NOVO
│   ├── WizardStepper.tsx       # NOVO
│   └── ZARIPhaseBadge.tsx      # Manter
└── pages/
    ├── P2PHomePage.tsx         # Refatorar
    ├── P2POfferNewPage.tsx     # Refatorar para Wizard
    ├── P2POfferPublicPage.tsx  # Refatorar
    ├── P2POrderRoomPage.tsx    # Refatorar
    ├── P2PMyOrdersPage.tsx     # Refatorar
    └── ZARIStatsPage.tsx       # Manter
```

---

## Dependencias

### Novas

Nenhuma nova dependencia necessaria. Usar:
- `@/components/ui/*` (shadcn)
- `lucide-react` (icones)
- `framer-motion` (animacoes, ja instalado)

### Utilitarios

Criar arquivo de utilitarios:

**Arquivo:** `apps/web/src/modules/p2p/utils/format.ts`

```tsx
// Formatar preco BRL
export function formatBRL(value: string | number): string;

// Formatar quantidade BZR/ZARI
export function formatAsset(value: string, decimals?: number): string;

// Calcular tempo restante
export function getRemainingTime(expiresAt: string): {
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isWarning: boolean;
};

// Truncar endereco
export function truncateAddress(address: string, chars?: number): string;
```
