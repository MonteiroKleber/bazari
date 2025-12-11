# Relatório: Modais de Autenticação e Apresentação de Custos de Transação

**Data:** 2025-10-13
**Análise:** Sistema de Modais e Estimativa de Fees no Bazari

---

## 1. RESUMO EXECUTIVO

### Confirmação da Análise do Usuário

✅ **CORRETO:** "As telas que devem pedir PIN são telas que precisam criar transação na blockchain"

✅ **CORRETO:** "Tem dois modais no app: o modal de assinatura e o modal de logar no sistema"

### Situação Atual dos Custos de Transação

❌ **PROBLEMA CRÍTICO:** O modal de assinatura (PinDialog) **NÃO MOSTRA** os custos de transação ao usuário antes de confirmar.

✅ **EXCEÇÃO:** A página `/app/wallet/send` mostra o custo estimado no formulário **ANTES** de abrir o modal de PIN.

❌ **PÁGINAS SEM EXIBIÇÃO DE CUSTO:**
- SellerSetupPage (criação/publicação de loja)
- OrderPayPage (pagamento de pedidos)
- P2POrderRoomPage (escrow P2P)
- AccountsPage (troca de conta)

---

## 2. OS DOIS MODAIS DO SISTEMA

### 2.1 Modal 1: Página de Unlock (Login/Reautenticação)

**Arquivo:** `apps/web/src/pages/auth/Unlock.tsx`

**Quando aparece:**
- Sessão HTTP expirada e usuário tenta acessar rota protegida
- Usuário abre app pela primeira vez (sem sessão)
- Navegação manual para `/auth/unlock`

**Finalidade:**
- Restaurar sessão HTTP (JWT) fazendo SIWS (Sign-In with Substrate)
- Descriptografar seed com PIN → assinar mensagem de login → obter JWT

**Características:**
- É uma **PÁGINA COMPLETA** (não um modal overlay)
- Layout: fundo gradiente + card centralizado
- Título: "Desbloquear cofre" (tradução: `auth.unlock.title`)
- Campo: PIN (password + inputMode numeric)
- Botões: "Desbloquear" / "Desbloqueando..."

**Fluxo:**
```typescript
1. Usuário digita PIN
2. Descriptografa mnemonic com PIN
3. Tenta refreshSession() via cookie
   └─ Se sucesso: restaura sessão e redireciona
4. Se refresh falhou:
   └─ Deriva address da mnemonic
   └─ Busca nonce
   └─ Assina mensagem SIWS
   └─ Envia para backend
   └─ Recebe JWT + refresh token
5. Redireciona para página original (location.state.from)
```

**Código-chave:**
```typescript
// apps/web/src/pages/auth/Unlock.tsx:46-84
const onSubmit = form.handleSubmit(async ({ pin }) => {
  const stored = await getActiveAccount();
  const mnemonic = await decryptMnemonic(
    stored.cipher, stored.iv, stored.salt, pin, stored.iterations
  );

  const refreshed = await refreshSession();
  if (refreshed) {
    await fetchProfile();
    navigate(from ?? '/app', { replace: true });
    return;
  }

  // SIWS
  const address = await deriveAddress(mnemonic);
  const nonce = await fetchNonce(address);
  const message = buildSiwsMessage(address, nonce);
  const signature = await signMessage(mnemonic, message);

  await loginSiws({ address, message, signature });
  navigate(from ?? '/app', { replace: true });
});
```

**Visual:**
```
┌────────────────────────────────────────┐
│                                        │
│       [Gradiente de fundo]            │
│                                        │
│    ┌────────────────────────────┐     │
│    │  Desbloquear cofre         │     │
│    ├────────────────────────────┤     │
│    │                            │     │
│    │  PIN                       │     │
│    │  [__________]              │     │
│    │                            │     │
│    │  [    Desbloquear    ]     │     │
│    │                            │     │
│    │  ⚠ Erro (se houver)        │     │
│    └────────────────────────────┘     │
│                                        │
└────────────────────────────────────────┘
```

---

### 2.2 Modal 2: PinDialog (Assinatura de Transação)

**Arquivo:** `apps/web/src/modules/wallet/components/PinDialog.tsx`

**Quando aparece:**
- Qualquer página chama `PinService.getPin()`
- Usuário vai assinar transação blockchain

**Finalidade:**
- Descriptografar seed para assinar transação blockchain
- **NÃO** faz login (não obtém JWT)
- Apenas valida PIN e retorna mnemonic descriptografada

**Características:**
- É um **MODAL OVERLAY** (fixed inset-0 z-50 backdrop-blur)
- Título: Configurável (default: "Confirme com o PIN")
- Descrição: Configurável (default: "Digite o PIN do cofre")
- Campo: PIN (password + inputMode numeric)
- Botões: "Cancelar" / "Confirmar"
- Validação inline: mostra erro sem fechar modal

**Fluxo:**
```typescript
1. Página chama: const pin = await PinService.getPin({ ... })
2. PinService atualiza state → PinProvider renderiza PinDialog
3. Usuário digita PIN e clica "Confirmar"
4. PinService chama validate(pin) passado pela página
5. Se validate retornar erro: mostra erro e mantém modal aberto
6. Se validate retornar null: fecha modal e resolve Promise com PIN
7. Página recebe PIN e usa para descriptografar seed
8. Página assina transação e envia à blockchain
```

**Código-chave:**

**PinDialog.tsx:**
```typescript
// apps/web/src/modules/wallet/components/PinDialog.tsx:20-68
export function PinDialog({
  open, title, description, label = 'PIN',
  cancelText = 'Cancelar', confirmText = 'Confirmar',
  loading = false, error = null,
  onCancel, onConfirm,
}: PinDialogProps) {
  const [pin, setPin] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin-input-generic">{label}</Label>
            <Input
              id="pin-input-generic"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={loading}>
              {cancelText}
            </Button>
            <Button onClick={() => onConfirm(pin)} disabled={loading}>
              {loading ? 'Desbloqueando…' : confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**PinService.ts:**
```typescript
// apps/web/src/modules/wallet/pin/PinService.ts:33-77
async getPin(config?: PinConfig): Promise<string> {
  this.state = { open: true, error: null, ...(config ?? {}) };
  this.emit();
  return new Promise<string>((resolve, reject) => {
    this.resolver = resolve;
    this.rejecter = reject;
  });
}

async confirm(pin: string) {
  const validate = this.state.validate;
  if (validate) {
    const res = await validate(pin);
    if (res) {
      // Validation failed: keep dialog open and show error
      this.state = { ...this.state, error: res };
      this.emit();
      return;
    }
  }
  const r = this.resolver;
  this.cleanup();
  if (r) r(pin);
}
```

**Uso em páginas:**
```typescript
// Exemplo: SendPage.tsx
const pin = await PinService.getPin({
  title: 'Confirmar Envio',
  description: 'Digite o PIN para assinar a transferência',
  validate: async (p) => {
    try {
      await decryptMnemonic(acct.cipher, acct.iv, acct.salt, p, acct.iterations);
      return null; // PIN válido
    } catch {
      return 'PIN inválido'; // Mostra erro
    }
  },
});

// PIN validado, descriptografar e assinar
const mnemonic = await decryptMnemonic(..., pin, ...);
const pair = keyring.addFromMnemonic(mnemonic);
await extrinsic.signAndSend(pair);
```

**Visual:**
```
┌────────────────────────────────────────────────────────────┐
│  [Backdrop blur - fundo escuro semitransparente]           │
│                                                            │
│       ┌────────────────────────────────┐                  │
│       │  Confirmar Transação           │                  │
│       ├────────────────────────────────┤                  │
│       │  Digite o PIN para assinar     │                  │
│       │  a transação                   │                  │
│       │                                │                  │
│       │  PIN                           │                  │
│       │  [__________]                  │                  │
│       │  ⚠ Erro (se houver)            │                  │
│       │                                │                  │
│       │         [Cancelar] [Confirmar] │                  │
│       └────────────────────────────────┘                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 3. ANÁLISE DE CUSTOS DE TRANSAÇÃO

### 3.1 Onde os Custos SÃO Estimados Atualmente

#### Página: SendPage (`/app/wallet/send`)

✅ **IMPLEMENTAÇÃO CORRETA**

**Estimativa:**
- Faz `extrinsic.paymentInfo(activeAddress)` para estimar fee
- Atualiza a cada mudança no formulário (debounce de 400ms)
- Exibe fee formatado abaixo do botão "Enviar"

**Código:**
```typescript
// apps/web/src/modules/wallet/pages/SendPage.tsx:151-200
useEffect(() => {
  // Debounce para evitar muitas chamadas
  const timeout = setTimeout(async () => {
    const api = await getApi();
    const extrinsic = selectedAssetId === 'native'
      ? api.tx.balances.transferKeepAlive(recipient, amountPlanck)
      : api.tx.assets.transfer(selectedAssetId, recipient, amountPlanck);

    const info = await extrinsic.paymentInfo(activeAddress);
    const feeValue = BigInt(info.partialFee.toString());
    setFee({
      value: feeValue,
      formatted: `${formatBalance(feeValue, nativeDecimals)} ${nativeSymbol}`,
    });
  }, 400);

  return () => clearTimeout(timeout);
}, [activeAddress, selectedAssetId, watchedRecipient, watchedAmount]);
```

**Exibição na UI:**
```typescript
// apps/web/src/modules/wallet/pages/SendPage.tsx:454-461
<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
  <span>
    {estimatingFee
      ? t('wallet.send.feeLoading')           // "Calculando taxa..."
      : fee
        ? t('wallet.send.feeLabel', { fee: fee.formatted })  // "Taxa de rede: 0.001 BZR"
        : t('wallet.send.feeUnavailable')}    // "Taxa indisponível"
  </span>
</div>
```

**Quando modal é aberto:**
- Usuário já viu o custo estimado no formulário
- Modal **NÃO** repete a informação (poderia/deveria)

---

#### Página: OrderPayPage (`/app/orders/:id/pay`)

⚠️ **IMPLEMENTAÇÃO PARCIAL**

**Estimativa:**
- Faz `tx.paymentInfo(active.address)` ao carregar página
- Armazena em `estimatedFee` state
- **MAS NÃO EXIBE** claramente ao usuário na UI principal
- **NÃO EXIBE** no modal de PIN

**Código:**
```typescript
// apps/web/src/modules/orders/pages/OrderPayPage.tsx:104-118
const active = await getActiveAccount();
if (active?.address) {
  const bal = await getNativeBalance(active.address);
  setFreeBalance(bal.free.toString());
  const tx = api.tx.balances.transferKeepAlive(intentData.escrowAddress, intentData.amountBzr);
  const info = await tx.paymentInfo(active.address);
  setEstimatedFee(info.partialFee.toString());  // ✅ ESTIMADO
}
```

**Problema:** `estimatedFee` é calculado mas **não é exibido** na UI. Precisa verificar se há algum componente renderizando isso.

---

### 3.2 Onde os Custos NÃO São Estimados

#### Página: SellerSetupPage (`/app/sellers/setup`)

❌ **SEM ESTIMATIVA DE FEE**

**Transações possíveis:**
1. `stores.createStore(cid)` - Criar nova loja on-chain
2. `stores.updateMetadata(storeId, cid)` - Atualizar metadados

**Problema:**
- Nenhuma estimativa de fee é feita
- Usuário não sabe quanto vai custar antes de confirmar PIN
- Modal de PIN não mostra custo

**Impacto:**
- Usuário pode não ter saldo suficiente
- Transação falhará após digitar PIN (má experiência)

---

#### Página: P2POrderRoomPage (`/app/p2p/orders/:id`)

❌ **SEM ESTIMATIVA DE FEE**

**Transação:**
- `escrow.lock(orderId, amount)` - Travar fundos em escrow P2P

**Problema:**
- Mesmo problema do SellerSetupPage
- Sem estimativa de fee
- Modal não informa custo

---

#### Página: AccountsPage (`/app/wallet/accounts`)

❌ **SEM ESTIMATIVA DE FEE**

**Transação:**
- SIWS (Sign-In with Substrate) - Não é transação on-chain
- **Mas** poderia haver fee de gas dependendo da implementação

**Impacto:** Menor, pois SIWS geralmente é off-chain.

---

## 4. PROBLEMA CRÍTICO: MODAL NÃO MOSTRA CUSTOS

### 4.1 Situação Atual

O `PinDialog` é **genérico e reutilizável**, mas **não possui campo para exibir informações de transação** como:
- Valor da transação
- Taxa de rede (fee)
- Total a ser debitado
- Saldo disponível vs necessário

### 4.2 Exemplo do Problema

**Cenário:** Usuário vai publicar loja no SellerSetupPage

**Fluxo atual:**
```
1. Usuário preenche formulário
2. Clica "Salvar e Publicar"
3. Modal aparece: "Digite o PIN para assinar a transação"
   └─ [Campo PIN]
   └─ [Cancelar] [Confirmar]
4. Usuário digita PIN e confirma
5. Transação é enviada
6. ❌ Falha: "InsufficientBalance" (não tinha saldo)
```

**O que deveria acontecer:**
```
1. Usuário preenche formulário
2. Clica "Salvar e Publicar"
3. ⏳ Sistema estima fee: tx.paymentInfo(...)
4. Modal aparece:
   ┌─────────────────────────────────────┐
   │  Confirmar Publicação On-Chain      │
   ├─────────────────────────────────────┤
   │  Transação: stores.createStore      │
   │  Taxa de rede: 0.0015 BZR           │
   │  Saldo disponível: 10.5 BZR         │
   │  ✓ Saldo suficiente                 │
   │                                     │
   │  PIN: [__________]                  │
   │                                     │
   │  [Cancelar] [Confirmar Transação]   │
   └─────────────────────────────────────┘
5. Usuário vê custo, digita PIN
6. ✅ Transação enviada com conhecimento prévio
```

---

## 5. ANÁLISE POR PÁGINA

### 5.1 SendPage - ✅ MELHOR IMPLEMENTAÇÃO

**Estado:** Custo exibido no formulário

**O que está correto:**
- Estimativa de fee em tempo real (debounce 400ms)
- Exibição clara: "Taxa de rede: 0.001 BZR"
- Validação de saldo antes de abrir modal

**O que pode melhorar:**
- Repetir custo no modal de PIN para reforçar
- Adicionar aviso se saldo estiver próximo do mínimo

---

### 5.2 OrderPayPage - ⚠️ ESTIMATIVA FEITA, NÃO EXIBIDA

**Estado:** Fee calculado mas não mostrado

**Código atual:**
```typescript
const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
const [freeBalance, setFreeBalance] = useState<string | null>(null);

// Calcula fee
const info = await tx.paymentInfo(active.address);
setEstimatedFee(info.partialFee.toString());
```

**Problema:** Variável `estimatedFee` não é usada em nenhum lugar do JSX.

**Solução:** Adicionar card mostrando:
```
┌──────────────────────────────┐
│  Resumo do Pagamento         │
├──────────────────────────────┤
│  Valor do pedido: 100 BZR    │
│  Taxa de rede: 0.001 BZR     │
│  ─────────────────────────   │
│  Total: 100.001 BZR          │
│                              │
│  Saldo disponível: 150 BZR   │
│  ✓ Saldo suficiente          │
└──────────────────────────────┘
```

---

### 5.3 SellerSetupPage - ❌ SEM ESTIMATIVA

**Estado:** Nenhuma estimativa de fee

**Ações necessárias:**
1. Antes de abrir modal de PIN, estimar fee:
   ```typescript
   const api = await getApi();
   const cid = Array.from(textEncoder.encode('Qm...'));
   const tx = onChainStoreId
     ? api.tx.stores.updateMetadata(onChainStoreId, cid)
     : api.tx.stores.createStore(cid);

   const info = await tx.paymentInfo(activeAddress);
   const fee = info.partialFee.toString();
   ```

2. Passar fee para o modal ou exibir antes

---

### 5.4 P2POrderRoomPage - ❌ SEM ESTIMATIVA

**Estado:** Nenhuma estimativa de fee

**Solução:** Similar ao SellerSetupPage

---

### 5.5 AccountsPage - ℹ️ SIWS (OFF-CHAIN)

**Estado:** SIWS não tem fee on-chain

**Observação:** SIWS é assinatura de mensagem, não transação. Não há fee blockchain, mas pode haver custo de gas dependendo da implementação futura.

---

## 6. SOLUÇÃO PROPOSTA

### 6.1 Fase 1: Melhorar PinDialog para Aceitar Informações de Transação

**Objetivo:** Tornar PinDialog capaz de exibir detalhes da transação.

**Nova interface:**
```typescript
// apps/web/src/modules/wallet/components/PinDialog.tsx
interface TransactionDetails {
  type: string;           // "transfer" | "createStore" | "lockEscrow"
  description: string;    // "Transferir 10 BZR para 5FHneW..."
  amount?: string;        // "10 BZR"
  fee: string;           // "0.001 BZR"
  total?: string;         // "10.001 BZR"
  balance?: string;       // "Saldo disponível: 150 BZR"
  warning?: string;       // "⚠ Saldo ficará abaixo do mínimo recomendado"
}

interface PinDialogProps {
  // ... props existentes
  transaction?: TransactionDetails;  // NOVO
}
```

**Renderização:**
```typescript
export function PinDialog({ ..., transaction }: PinDialogProps) {
  return (
    <div className="fixed inset-0 z-50 ...">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* NOVO: Detalhes da transação */}
          {transaction && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <h4 className="font-medium text-sm">{transaction.description}</h4>
              <Separator />
              <div className="space-y-1 text-xs">
                {transaction.amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">{transaction.amount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de rede:</span>
                  <span className="font-medium">{transaction.fee}</span>
                </div>
                {transaction.total && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{transaction.total}</span>
                    </div>
                  </>
                )}
                {transaction.balance && (
                  <div className="flex justify-between text-muted-foreground pt-2">
                    <span>{transaction.balance}</span>
                    <span className="text-green-600">✓ Suficiente</span>
                  </div>
                )}
                {transaction.warning && (
                  <Alert variant="warning" className="mt-2">
                    <AlertDescription className="text-xs">
                      {transaction.warning}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Campo PIN */}
          <div className="space-y-2">
            <Label htmlFor="pin-input-generic">{label}</Label>
            <Input ... />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">...</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 6.2 Fase 2: Atualizar PinService para Suportar TransactionDetails

**Atualizar PinConfig:**
```typescript
// apps/web/src/modules/wallet/pin/PinService.ts
type PinConfig = {
  title?: string;
  description?: string;
  label?: string;
  cancelText?: string;
  confirmText?: string;
  transaction?: TransactionDetails;  // NOVO
  validate?: (pin: string) => Promise<string | null> | string | null;
};
```

**Uso:**
```typescript
const pin = await PinService.getPin({
  title: 'Confirmar Transferência',
  description: 'Digite seu PIN para assinar a transação',
  transaction: {
    type: 'transfer',
    description: 'Transferir BZR',
    amount: '10 BZR',
    fee: '0.001 BZR',
    total: '10.001 BZR',
    balance: 'Saldo disponível: 150 BZR',
  },
  validate: async (p) => { ... },
});
```

---

### 6.3 Fase 3: Criar Hook Utilitário para Estimar Fees

**Hook unificado:**
```typescript
// apps/web/src/modules/wallet/hooks/useTransactionFee.ts
import { useState, useEffect } from 'react';
import { getApi } from '../services/polkadot';
import { formatBalance } from '../utils/format';
import type { SubmittableExtrinsic } from '@polkadot/api/types';

interface FeeEstimate {
  value: bigint;
  formatted: string;
  loading: boolean;
  error: string | null;
}

export function useTransactionFee(
  address: string | null,
  extrinsicFn: (() => Promise<SubmittableExtrinsic<'promise'>>) | null,
  deps: any[] = []
): FeeEstimate {
  const [fee, setFee] = useState<FeeEstimate>({
    value: 0n,
    formatted: '...',
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!address || !extrinsicFn) {
      setFee({ value: 0n, formatted: '...', loading: false, error: null });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setFee(prev => ({ ...prev, loading: true, error: null }));
        const api = await getApi();
        const extrinsic = await extrinsicFn();
        const info = await extrinsic.paymentInfo(address);
        const feeValue = BigInt(info.partialFee.toString());
        const decimals = api.registry.chainDecimals[0] ?? 12;
        const symbol = api.registry.chainTokens[0] ?? 'BZR';

        if (!cancelled) {
          setFee({
            value: feeValue,
            formatted: `${formatBalance(feeValue, decimals)} ${symbol}`,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setFee({
            value: 0n,
            formatted: 'Erro ao estimar',
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [address, ...(deps || [])]);

  return fee;
}
```

**Uso em páginas:**
```typescript
// Em SellerSetupPage.tsx
const { formatted: feeFormatted, loading: feeLoading, error: feeError } = useTransactionFee(
  activeAddress,
  async () => {
    const api = await getApi();
    const cid = Array.from(textEncoder.encode(metadataCid));
    return onChainStoreId
      ? api.tx.stores.updateMetadata(onChainStoreId, cid)
      : api.tx.stores.createStore(cid);
  },
  [metadataCid, onChainStoreId]
);

// Ao solicitar PIN
const pin = await PinService.getPin({
  title: 'Confirmar Publicação',
  description: 'Publicar loja on-chain',
  transaction: {
    type: 'createStore',
    description: onChainStoreId ? 'Atualizar metadados da loja' : 'Criar nova loja',
    fee: feeFormatted,
    balance: `Saldo disponível: ${balanceFormatted}`,
  },
  validate: ...
});
```

---

### 6.4 Fase 4: Atualizar Todas as Páginas

#### SendPage
```typescript
// Já tem estimativa, apenas passar para modal
const pin = await PinService.getPin({
  title: 'Confirmar Transferência',
  transaction: {
    type: 'transfer',
    description: `Transferir para ${shortenAddress(values.recipient)}`,
    amount: `${values.amount} ${asset.symbol}`,
    fee: fee?.formatted ?? 'Calculando...',
    total: `${totalAmount} ${asset.symbol}`,
    balance: `Saldo disponível: ${balanceFormatted}`,
  },
  validate: ...
});
```

#### OrderPayPage
```typescript
const pin = await PinService.getPin({
  title: 'Confirmar Pagamento',
  transaction: {
    type: 'payment',
    description: `Pagar pedido #${order.id}`,
    amount: formatBzr(paymentIntent.amountBzr),
    fee: estimatedFee ? formatBalance(estimatedFee, 12) + ' BZR' : 'Calculando...',
    total: formatBzr(BigInt(paymentIntent.amountBzr) + BigInt(estimatedFee || 0)),
    balance: freeBalance ? `Saldo: ${formatBalance(freeBalance, 12)} BZR` : undefined,
  },
  validate: ...
});
```

#### SellerSetupPage
```typescript
// Estimar fee antes de abrir modal
const api = await getApi();
const cid = Array.from(textEncoder.encode(uploadedCid));
const tx = onChainStoreId
  ? api.tx.stores.updateMetadata(onChainStoreId, cid)
  : api.tx.stores.createStore(cid);
const info = await tx.paymentInfo(activeAddress);
const fee = info.partialFee.toString();

const pin = await PinService.getPin({
  title: 'Confirmar Publicação',
  transaction: {
    type: 'createStore',
    description: onChainStoreId ? 'Atualizar loja on-chain' : 'Criar loja on-chain',
    fee: `${formatBalance(fee, 12)} BZR`,
    balance: `Saldo: ${balanceFormatted}`,
  },
  validate: ...
});
```

#### P2POrderRoomPage
```typescript
const api = await getApi();
const tx = api.tx.escrow.lock(orderId, amountPlanck);
const info = await tx.paymentInfo(activeAddress);
const fee = info.partialFee.toString();

const pin = await PinService.getPin({
  title: 'Confirmar Bloqueio',
  transaction: {
    type: 'lockEscrow',
    description: 'Travar fundos em escrow P2P',
    amount: `${amount} BZR`,
    fee: `${formatBalance(fee, 12)} BZR`,
    total: `${formatBalance(BigInt(amountPlanck) + BigInt(fee), 12)} BZR`,
    balance: `Saldo: ${balanceFormatted}`,
  },
  validate: ...
});
```

---

## 7. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Componentes Base (1-2 dias)
- [ ] Atualizar `PinDialog.tsx` para aceitar `transaction?: TransactionDetails`
- [ ] Criar interface `TransactionDetails` em types compartilhados
- [ ] Adicionar renderização de detalhes de transação no modal
- [ ] Atualizar `PinService.ts` e `PinConfig` para incluir `transaction`
- [ ] Testar modal com e sem transaction details

### Fase 2: Hook Utilitário (1 dia)
- [ ] Criar `useTransactionFee` hook
- [ ] Testar hook em página isolada
- [ ] Documentar uso do hook

### Fase 3: Atualizar SendPage (2 horas)
- [ ] Passar `transaction` para `PinService.getPin()`
- [ ] Testar fluxo completo de envio
- [ ] Verificar que custo é exibido no modal

### Fase 4: Atualizar OrderPayPage (3 horas)
- [ ] Exibir `estimatedFee` na UI antes do modal
- [ ] Passar `transaction` para `PinService.getPin()`
- [ ] Validar saldo antes de abrir modal
- [ ] Testar fluxo de pagamento

### Fase 5: Atualizar SellerSetupPage (4 horas)
- [ ] Adicionar estimativa de fee antes de solicitar PIN
- [ ] Passar `transaction` para `PinService.getPin()`
- [ ] Adicionar tratamento de erro se saldo insuficiente
- [ ] Testar criação e atualização de loja

### Fase 6: Atualizar P2POrderRoomPage (3 horas)
- [ ] Adicionar estimativa de fee
- [ ] Passar `transaction` para `PinService.getPin()`
- [ ] Testar bloqueio de escrow

### Fase 7: Testes E2E (4 horas)
- [ ] Testar todos os fluxos com saldo suficiente
- [ ] Testar com saldo insuficiente (deve mostrar erro antes de abrir modal)
- [ ] Testar com erro de rede (fee indisponível)
- [ ] Verificar acessibilidade do modal
- [ ] Testar em mobile

### Fase 8: Documentação (2 horas)
- [ ] Atualizar docs sobre uso de `PinService.getPin()`
- [ ] Adicionar exemplos de código
- [ ] Documentar `useTransactionFee` hook

---

## 8. MOCKUP DO MODAL MELHORADO

```
┌──────────────────────────────────────────────────────────┐
│  [Backdrop blur semitransparente]                        │
│                                                          │
│       ┌──────────────────────────────────┐              │
│       │  Confirmar Transferência         │              │
│       ├──────────────────────────────────┤              │
│       │  Digite seu PIN para assinar a   │              │
│       │  transação                       │              │
│       │                                  │              │
│       │  ┌────────────────────────────┐  │              │
│       │  │  Transferir para 5FHneW... │  │              │
│       │  ├────────────────────────────┤  │              │
│       │  │  Valor:       10 BZR       │  │              │
│       │  │  Taxa:        0.001 BZR    │  │              │
│       │  │  ──────────────────────── │  │              │
│       │  │  Total:       10.001 BZR   │  │              │
│       │  │                            │  │              │
│       │  │  Saldo disponível: 150 BZR │  │              │
│       │  │  ✓ Saldo suficiente        │  │              │
│       │  └────────────────────────────┘  │              │
│       │                                  │              │
│       │  PIN da Carteira                 │              │
│       │  [__________]                    │              │
│       │  ⚠ PIN incorreto (se houver)     │              │
│       │                                  │              │
│       │         [Cancelar] [Confirmar]   │              │
│       └──────────────────────────────────┘              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 9. CONCLUSÃO

### Resposta às Perguntas do Usuário

✅ **"As telas que devem pedir PIN são telas que precisam criar transação na blockchain certo?"**
- **Sim, correto.** Apenas páginas que assinam transações on-chain pedem PIN.

✅ **"Essas telas para serem assinadas tem que apresentar o custo de transacao para o usuario, se tiver custo."**
- **Sim, correto.** Mas atualmente **apenas SendPage** mostra o custo corretamente.

✅ **"Tudo que tiver custo de transacao tem que ser apresentado na tela de assinatura para o usuario"**
- **Sim, mas não está implementado em todas as páginas.** Precisamos adicionar.

✅ **"Tem dois modal no app certo? o modal de assinatura e o modal de logar no sistema ne?"**
- **Correto.**
  - Modal 1: `/auth/unlock` (página de login/reautenticação)
  - Modal 2: `PinDialog` (modal overlay para assinar transações)

### Situação Atual
- **SendPage:** ✅ Mostra custo no formulário (antes do modal)
- **OrderPayPage:** ⚠️ Calcula fee mas não exibe
- **SellerSetupPage:** ❌ Não calcula nem exibe fee
- **P2POrderRoomPage:** ❌ Não calcula nem exibe fee

### Ação Prioritária
**Implementar Fases 1-4** para garantir que:
1. Modal de PIN mostre detalhes da transação
2. Todas as páginas estimem fee antes de abrir modal
3. Usuário veja custo ANTES de digitar PIN
4. Validação de saldo impeça abertura de modal se insuficiente

---

**Documento criado em:** 2025-10-13
**Próxima ação:** Implementar melhorias no PinDialog (Fase 1)
