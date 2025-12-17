# Prompt 01: Componentes Base P2P

## Contexto

Estamos redesenhando o modulo P2P do Bazari para melhorar a UX. A primeira fase e criar componentes reutilizaveis que serao usados nas paginas.

## Arquivos de Referencia

Leia estes arquivos para entender o contexto:
- `knowledge/20-p2p/02-NOVA-UX-SPEC.md` - Especificacao da nova UX
- `knowledge/20-p2p/03-COMPONENTES.md` - Lista de componentes a criar
- `apps/web/src/modules/p2p/pages/P2PHomePage.tsx` - Pagina atual (referencia)
- `apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx` - Sala de ordem (referencia)

## Tarefa

Criar os seguintes componentes na pasta `apps/web/src/modules/p2p/components/`:

### 1. utils/format.ts

Criar arquivo de utilitarios:

```tsx
// Formatar preco BRL (ex: "5.50" -> "R$ 5,50")
export function formatBRL(value: string | number): string;

// Formatar quantidade de asset com decimais
export function formatAsset(value: string, decimals?: number): string;

// Calcular tempo restante ate expiracao
export function getRemainingTime(expiresAt: string): {
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isWarning: boolean;  // < 5 minutos
  formatted: string;   // "28:45"
};

// Truncar endereco blockchain
export function truncateAddress(address: string, chars?: number): string;
```

### 2. CopyField.tsx

Campo com botao de copiar:

```tsx
interface CopyFieldProps {
  label: string;
  value: string;
  className?: string;
}

// Visual:
// Chave PIX
// ┌─────────────────────────────┐
// │ email@vendedor.com      📋  │
// └─────────────────────────────┘
```

Requisitos:
- Usar `navigator.clipboard.writeText`
- Mostrar toast "Copiado!" ao copiar
- Icone muda para check por 1.5s apos copiar
- Usar componentes de `@/components/ui/`

### 3. RatingStars.tsx

Componente de estrelas:

```tsx
interface RatingStarsProps {
  value: number;              // 0-5
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;        // Mostrar "4.8" ao lado
  totalReviews?: number;      // Mostrar "(127)"
}

// Visual readonly: ⭐ 4.8 (127)
// Visual interativo: ⭐ ⭐ ⭐ ⭐ ☆ (clicavel)
```

### 4. UserBadge.tsx

Badge de usuario:

```tsx
interface UserBadgeProps {
  user: {
    handle?: string;
    avatarUrl?: string;
    userId?: string;
  };
  stats?: {
    avgStars?: number;
    totalTrades?: number;
  };
  isHighVolume?: boolean;  // 🔥 badge para +50 trades
  linkToProfile?: boolean;
  size?: 'sm' | 'md';
}

// Visual: 👤 @vendedor123  ⭐ 4.8 (127) 🔥
```

Requisitos:
- Avatar com fallback para inicial do handle
- Link para `/u/{handle}` se `linkToProfile`
- Badge 🔥 se `totalTrades > 50`

### 5. CountdownTimer.tsx

Timer de expiracao:

```tsx
interface CountdownTimerProps {
  expiresAt: string;           // ISO date
  warningThreshold?: number;   // seconds, default 300 (5min)
  onExpire?: () => void;
  className?: string;
}

// Visual normal: ⏱️ 28:45
// Visual warning: ⏱️ 04:32 (classe text-red-500, animacao pulse)
// Visual expired: ⏱️ Expirado
```

Requisitos:
- Atualizar a cada segundo
- Cleanup do interval no unmount
- Chamar `onExpire` quando chegar a zero

### 6. StatusStepper.tsx

Stepper de progresso:

```tsx
interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StatusStepperProps {
  steps: Step[];
  currentStep: number;  // 0-indexed, step atual
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

// Visual vertical:
// ✅  Escrow travado
// │   BZR bloqueado com sucesso
// │
// ⏳  Aguardando pagamento PIX
// │   Faca o pagamento...
// │
// ○   Confirmar recebimento
```

### 7. WizardStepper.tsx

Stepper para wizard:

```tsx
interface WizardStep {
  id: string;
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;  // Permitir voltar
  className?: string;
}

// Visual:
// ● ─────────── ○ ─────────── ○ ─────────── ○
// Ativo        Tipo         Preco        Revisar
```

Requisitos:
- Steps anteriores clicaveis (se `onStepClick`)
- Steps futuros nao clicaveis
- Linha conectora entre steps

### 8. AssetCard.tsx

Card de selecao de ativo:

```tsx
interface AssetCardProps {
  asset: 'BZR' | 'ZARI';
  selected?: boolean;
  onClick?: () => void;
  priceInfo?: string;        // "R$ 5.50" ou "Fase 2A: R$ 1.38"
  disabled?: boolean;
}

// Visual:
// ┌─────────────────────┐
// │         💰          │
// │        BZR          │
// │    Token Nativo     │
// │    ─────────────    │
// │    R$ 5.50          │
// └─────────────────────┘
```

Requisitos:
- Icone: 💰 para BZR, 🏛️ para ZARI
- Descricao: "Token Nativo" para BZR, "Governanca" para ZARI
- Borda destacada quando `selected`
- Cursor pointer, hover effect

## Instrucoes

1. Criar cada componente em arquivo separado
2. Usar TypeScript com tipos exportados
3. Usar componentes de `@/components/ui/` (shadcn)
4. Usar `lucide-react` para icones
5. Usar `useTranslation` para textos
6. Adicionar `aria-*` para acessibilidade
7. Testar responsividade

## Exemplo de Estrutura

```tsx
// components/CopyField.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CopyFieldProps {
  label: string;
  value: string;
  className?: string;
}

export function CopyField({ label, value, className }: CopyFieldProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(t('common.copied', 'Copiado!'));
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={className}>
      <label className="text-sm text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <code className="flex-1 px-3 py-2 bg-muted rounded text-sm truncate">
          {value}
        </code>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label={t('common.copy', 'Copiar')}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
```

## Validacao

Apos criar os componentes:
1. Verificar que nao ha erros de TypeScript: `pnpm --filter @bazari/web exec tsc --noEmit`
2. Verificar imports corretos
3. Nao quebrar codigo existente
