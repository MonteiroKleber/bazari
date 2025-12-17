# Prompt 04: Wizard de Criacao de Oferta

## Contexto

Vamos converter a pagina de criacao de oferta de um formulario linear para um wizard guiado com steps.

## Pre-requisitos

Verifique que existem:
- `apps/web/src/modules/p2p/components/WizardStepper.tsx`
- `apps/web/src/modules/p2p/components/AssetCard.tsx`
- `apps/web/src/modules/p2p/components/ZARIPhaseBadge.tsx`

## Arquivos de Referencia

- `knowledge/20-p2p/02-NOVA-UX-SPEC.md` - Secao do Wizard
- `apps/web/src/modules/p2p/pages/P2POfferNewPage.tsx` - Codigo atual

## Tarefa

Refatorar `P2POfferNewPage.tsx` para ser um wizard com 4 steps.

### Estrutura do Wizard

```
Step 1: Selecao de Ativo (BZR ou ZARI)
Step 2: Tipo de Operacao (BZR: Comprar/Vender) ou Quantidade (ZARI)
Step 3: Preco e Limites
Step 4: Revisao e Publicacao
```

### Estado do Wizard

```tsx
interface WizardState {
  currentStep: number;
  asset: 'BZR' | 'ZARI' | null;
  side: 'SELL_BZR' | 'BUY_BZR' | null;  // BZR only
  amountZARI: string;                     // ZARI only
  priceBRLPerBZR: string;
  minBRL: string;
  maxBRL: string;
  autoReply: string;
}

const initialState: WizardState = {
  currentStep: 0,
  asset: null,
  side: null,
  amountZARI: '',
  priceBRLPerBZR: '',
  minBRL: '100',
  maxBRL: '500',
  autoReply: '',
};
```

### Layout Geral

```
┌─────────────────────────────────────────────────────────────┐
│  Nova Oferta                                                │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  <WizardStepper steps={steps} currentStep={state.step} />  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │   <StepContent />                                    │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← Voltar]                                  [Proximo →]   │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Selecao de Ativo

```tsx
function Step1Asset({ state, setState }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          {t('p2p.wizard.step1.title', 'Qual ativo voce quer negociar?')}
        </h2>
        <p className="text-muted-foreground">
          {t('p2p.wizard.step1.description', 'Selecione o token que deseja comprar ou vender.')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <AssetCard
          asset="BZR"
          selected={state.asset === 'BZR'}
          onClick={() => setState({ ...state, asset: 'BZR' })}
          priceInfo="Preco livre"
        />
        <AssetCard
          asset="ZARI"
          selected={state.asset === 'ZARI'}
          onClick={() => setState({ ...state, asset: 'ZARI' })}
          priceInfo="Preco por fase"
        />
      </div>
    </div>
  );
}
```

### Step 2: Tipo (BZR) ou Quantidade (ZARI)

**Para BZR:**
```tsx
function Step2BZR({ state, setState }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          {t('p2p.wizard.step2.bzr.title', 'O que voce quer fazer?')}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <Card
          className={cn(
            'cursor-pointer transition-all hover:border-primary',
            state.side === 'SELL_BZR' && 'border-primary bg-primary/5'
          )}
          onClick={() => setState({ ...state, side: 'SELL_BZR' })}
        >
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">📤</div>
            <h3 className="font-semibold">Vender BZR</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Receba BRL via PIX vendendo seus BZR
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all hover:border-primary',
            state.side === 'BUY_BZR' && 'border-primary bg-primary/5'
          )}
          onClick={() => setState({ ...state, side: 'BUY_BZR' })}
        >
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">📥</div>
            <h3 className="font-semibold">Comprar BZR</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pague BRL via PIX para comprar BZR
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Para ZARI:**
```tsx
function Step2ZARI({ state, setState, zariPhase }: StepProps & { zariPhase: PhaseInfo | null }) {
  const { t } = useTranslation();

  if (!zariPhase) {
    return <div>Carregando fase ZARI...</div>;
  }

  const calculatedBZR = state.amountZARI
    ? (Number(state.amountZARI) * (Number(zariPhase.priceBZR) / 1e12)).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          {t('p2p.wizard.step2.zari.title', 'Quantidade de ZARI')}
        </h2>
      </div>

      {/* Badge de fase atual */}
      <ZARIPhaseBadge variant="full" />

      <div className="max-w-md mx-auto space-y-4">
        <div>
          <Label htmlFor="amountZARI">
            {t('p2p.wizard.step2.zari.amount', 'Quantidade de ZARI para vender')}
          </Label>
          <Input
            id="amountZARI"
            type="number"
            placeholder="1000"
            value={state.amountZARI}
            onChange={(e) => setState({ ...state, amountZARI: e.target.value })}
            className="text-lg"
          />
        </div>

        {state.amountZARI && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor em BZR:</span>
              <span className="font-mono font-medium">{calculatedBZR} BZR</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Preco por ZARI:</span>
              <span className="font-mono">{(Number(zariPhase.priceBZR) / 1e12).toFixed(4)} BZR</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 3: Preco e Limites

```tsx
function Step3PriceLimits({ state, setState }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          {t('p2p.wizard.step3.title', 'Defina preco e limites')}
        </h2>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Preco (apenas BZR) */}
        {state.asset === 'BZR' && (
          <div>
            <Label htmlFor="price">
              {t('p2p.wizard.step3.price', 'Preco por BZR (em R$)')}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="5.50"
                value={state.priceBRLPerBZR}
                onChange={(e) => setState({ ...state, priceBRLPerBZR: e.target.value })}
                className="pl-10 text-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mercado: R$ 5.48 - R$ 5.65
            </p>
          </div>
        )}

        {/* Limites */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minBRL">
              {t('p2p.wizard.step3.minBRL', 'Valor minimo (R$)')}
            </Label>
            <Input
              id="minBRL"
              type="number"
              placeholder="100"
              value={state.minBRL}
              onChange={(e) => setState({ ...state, minBRL: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="maxBRL">
              {t('p2p.wizard.step3.maxBRL', 'Valor maximo (R$)')}
            </Label>
            <Input
              id="maxBRL"
              type="number"
              placeholder="5000"
              value={state.maxBRL}
              onChange={(e) => setState({ ...state, maxBRL: e.target.value })}
            />
          </div>
        </div>

        {/* Resposta automatica */}
        <div>
          <Label htmlFor="autoReply">
            {t('p2p.wizard.step3.autoReply', 'Resposta automatica (opcional)')}
          </Label>
          <Input
            id="autoReply"
            placeholder="Ola! Faco o PIX em ate 5 minutos."
            value={state.autoReply}
            onChange={(e) => setState({ ...state, autoReply: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('p2p.wizard.step3.autoReplyHint', 'Enviada automaticamente quando alguem aceita sua oferta.')}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Revisao

```tsx
function Step4Review({ state, pixKey, onSubmit, loading }: StepProps & {
  pixKey: string | null;
  onSubmit: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          {t('p2p.wizard.step4.title', 'Revise sua oferta')}
        </h2>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-lg font-medium">
            {state.asset === 'BZR' ? '💰' : '🏛️'}
            <span>
              {state.side === 'SELL_BZR' ? 'Vendendo' : 'Comprando'} {state.asset}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            {state.asset === 'BZR' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preco:</span>
                <span>R$ {state.priceBRLPerBZR} / BZR</span>
              </div>
            )}

            {state.asset === 'ZARI' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantidade:</span>
                <span>{state.amountZARI} ZARI</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Limite:</span>
              <span>R$ {state.minBRL} - R$ {state.maxBRL}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Metodo:</span>
              <span>PIX</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Chave PIX:</span>
              <span>{pixKey || 'Nao configurada'}</span>
            </div>

            {state.autoReply && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-1">Resposta automatica:</span>
                <span className="italic">"{state.autoReply}"</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="max-w-md mx-auto">
        <Alert>
          <AlertDescription>
            {t('p2p.wizard.step4.warning', 'Sua chave PIX sera visivel para compradores apos o escrow ser travado.')}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
```

### Navegacao do Wizard

```tsx
function WizardNavigation({
  currentStep,
  totalSteps,
  canProceed,
  onBack,
  onNext,
  onSubmit,
  loading,
}: {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="flex justify-between pt-6 border-t mt-6">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={currentStep === 0}
      >
        ← {t('common.back', 'Voltar')}
      </Button>

      {isLastStep ? (
        <Button onClick={onSubmit} disabled={loading || !canProceed}>
          {loading ? t('common.saving', 'Publicando...') : t('p2p.wizard.publish', 'Publicar oferta')}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={!canProceed}>
          {t('common.next', 'Proximo')} →
        </Button>
      )}
    </div>
  );
}
```

### Validacao por Step

```tsx
const canProceed = useMemo(() => {
  switch (state.currentStep) {
    case 0:
      return !!state.asset;
    case 1:
      if (state.asset === 'BZR') {
        return !!state.side;
      } else {
        return !!state.amountZARI && Number(state.amountZARI) > 0;
      }
    case 2:
      const hasPrice = state.asset === 'ZARI' || !!state.priceBRLPerBZR;
      const hasLimits = !!state.minBRL && !!state.maxBRL;
      const validLimits = Number(state.maxBRL) >= Number(state.minBRL);
      return hasPrice && hasLimits && validLimits;
    case 3:
      return hasPix;  // Precisa ter PIX configurado
    default:
      return false;
  }
}, [state, hasPix]);
```

### Animacoes de Transicao

```tsx
import { motion, AnimatePresence } from 'framer-motion';

// Wrapper para cada step
<AnimatePresence mode="wait">
  <motion.div
    key={state.currentStep}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    {renderStep()}
  </motion.div>
</AnimatePresence>
```

## Instrucoes

1. Reorganizar o componente em sub-componentes de step
2. Implementar navegacao com validacao
3. Manter logica de PIX existente
4. Adicionar animacoes de transicao
5. Testar fluxo completo em mobile
6. Verificar que publicacao funciona

## Validacao

```bash
pnpm --filter @bazari/web exec tsc --noEmit
pnpm --filter @bazari/web build
```

Testar:
1. Navegar por todos os steps
2. Validacao impede avancar sem preencher
3. Voltar mantem estado
4. Publicar oferta funciona
