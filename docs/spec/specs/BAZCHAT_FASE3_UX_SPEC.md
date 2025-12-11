# FASE 3: Comércio no Chat - Especificação UI/UX e Prompts

**Versão**: 2.0.0
**Data**: 2025-10-14
**Baseado em**: Análise da implementação atual e sugestão UI/UX
**Documento Base**: `BAZCHAT_PROMPTS.md`

---

## 📊 STATUS ATUAL DA FASE 3

### ✅ Já Implementado (Backend 100%):
- ✅ Propostas de venda (API + DB)
- ✅ Checkout em BZR (MOCK)
- ✅ Split automático (3 vias)
- ✅ Recibo NFT (IPFS)
- ✅ Políticas de comissão
- ✅ ProposalCard.tsx (visualização)
- ✅ MessageBubble integração
- ✅ useChat hooks

### ❌ Faltando (Frontend UI):
- ❌ Interface para **criar** propostas
- ❌ Seletor de produtos do catálogo
- ❌ Dialog de confirmação de checkout
- ❌ Visualizador de recibo NFT
- ❌ Página de configuração de comissão
- ❌ Feedback visual de split

**Score Atual: 83%** (5/6 funcionalidades)

---

## 🎯 OBJETIVO DESTA ESPECIFICAÇÃO

Criar **prompts detalhados em 2 fases** para Claude Code implementar a UI/UX completa da Fase 3, levando a funcionalidade de **83% → 100%**.

---

## 📐 ARQUITETURA UI/UX PROPOSTA

```
FASE 3 - UI/UX
├── FASE 3A: Criação de Propostas (Crítico - 12h)
│   ├── CreateProposalDialog.tsx (Multi-step)
│   ├── ProductSelectorGrid.tsx (Mini catálogo)
│   ├── ProposalSummary.tsx (Step 3)
│   └── Botão [+] no ChatThreadPage
│
└── FASE 3B: Polimento e Extras (Opcional - 8h)
    ├── CheckoutConfirmDialog.tsx
    ├── PaymentSuccessDialog.tsx
    ├── ReceiptCard.tsx
    ├── ReceiptViewerPage.tsx
    ├── SaleDetailsPage.tsx
    ├── CommissionPolicyPage.tsx
    └── SplitVisualization.tsx
```

---

## 🚀 FASE 3A: Criação de Propostas (CRÍTICO)

### 📌 Tempo Estimado: 10-14 horas

### 🎯 Objetivo

Permitir que vendedores **criem propostas de venda diretamente no chat** selecionando produtos do catálogo existente.

### 📋 Checklist de Entregas

- [ ] Botão `[+]` adicionado ao input de mensagem
- [ ] Menu de ações (Criar Proposta, Enviar Mídia, etc.)
- [ ] `CreateProposalDialog.tsx` (3 steps)
- [ ] `ProductSelectorGrid.tsx` (mini catálogo)
- [ ] `ShippingCommissionForm.tsx` (Step 2)
- [ ] `ProposalSummary.tsx` (Step 3)
- [ ] Integração com `useChat.createProposal()`
- [ ] Toast de confirmação após envio
- [ ] Proposta aparece no chat como `ProposalCard`

### 🎨 Especificação de Componentes

#### 1. **Botão [+] e Menu de Ações**

**Localização**: `apps/web/src/pages/chat/ChatThreadPage.tsx`

**Modificação**:
```tsx
// Adicionar ao lado do input de mensagem
<div className="flex items-center gap-2">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <Plus className="h-5 w-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => setShowProposalDialog(true)}>
        <ClipboardList className="mr-2 h-4 w-4" />
        Criar Proposta
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setShowMediaDialog(true)}>
        <Image className="mr-2 h-4 w-4" />
        Enviar Mídia
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <Input ... />
  <Button>Enviar</Button>
</div>
```

**Ícones necessários**: `Plus`, `ClipboardList`, `Image` (lucide-react)

---

#### 2. **CreateProposalDialog.tsx** (Multi-step)

**Arquivo**: `apps/web/src/components/chat/CreateProposalDialog.tsx`

**Props**:
```typescript
interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
}
```

**Estados**:
```typescript
const [step, setStep] = useState<1 | 2 | 3>(1);
const [selectedItems, setSelectedItems] = useState<ProposalItem[]>([]);
const [shipping, setShipping] = useState({ method: 'PAC', price: '0' });
const [commission, setCommission] = useState(5);
const [expiresIn, setExpiresIn] = useState('48h');
```

**Estrutura**:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        Criar Proposta ({step}/3)
      </DialogTitle>
      <DialogDescription>
        {step === 1 && "Selecione os produtos"}
        {step === 2 && "Configure frete e comissão"}
        {step === 3 && "Revise e envie"}
      </DialogDescription>
    </DialogHeader>

    {step === 1 && <ProductSelectorGrid ... />}
    {step === 2 && <ShippingCommissionForm ... />}
    {step === 3 && <ProposalSummary ... />}

    <DialogFooter>
      {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
      {step < 3 && <Button onClick={() => setStep(step + 1)}>Próximo</Button>}
      {step === 3 && <Button onClick={handleSubmit}>Enviar Proposta</Button>}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Validações**:
- Step 1: Pelo menos 1 produto selecionado
- Step 2: Frete válido (número ≥ 0)
- Step 3: Comissão entre 0-15%

**Submissão**:
```typescript
const handleSubmit = async () => {
  const subtotal = selectedItems.reduce((sum, item) =>
    sum + (parseFloat(item.price) * item.qty), 0
  );
  const shippingCost = parseFloat(shipping.price) || 0;
  const total = subtotal + shippingCost;

  await createProposal({
    threadId,
    items: selectedItems,
    subtotal: subtotal.toString(),
    shipping: shippingCost > 0 ? shipping : undefined,
    total: total.toString(),
    commissionPercent: commission,
  });

  toast.success('Proposta enviada!');
  onOpenChange(false);
};
```

---

#### 3. **ProductSelectorGrid.tsx** (Step 1)

**Arquivo**: `apps/web/src/components/chat/ProductSelectorGrid.tsx`

**Props**:
```typescript
interface ProductSelectorGridProps {
  storeId?: number;
  selectedItems: ProposalItem[];
  onItemsChange: (items: ProposalItem[]) => void;
}
```

**Integração com catálogo existente**:
```typescript
import { useStoreCatalog } from '@/hooks/useStoreCatalog';

const { products, loading } = useStoreCatalog({
  storeId,
  limit: 12,
});
```

**UI**:
```tsx
<div className="space-y-4">
  {/* Busca */}
  <Input
    placeholder="🔍 Buscar produtos..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />

  {/* Grid de Produtos */}
  <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
    {products.map(product => (
      <Card key={product.sku} className="cursor-pointer hover:border-primary">
        <CardContent className="p-3">
          <img src={product.imageUrl} className="w-full h-24 object-cover rounded" />
          <p className="text-sm font-medium mt-2">{product.name}</p>
          <p className="text-lg font-bold">R$ {product.price}</p>

          {/* Controle de Quantidade */}
          {isSelected(product.sku) ? (
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={() => decreaseQty(product.sku)}>-</Button>
              <span>{getQty(product.sku)}</span>
              <Button size="sm" onClick={() => increaseQty(product.sku)}>+</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => addItem(product)}>
              Adicionar
            </Button>
          )}
        </CardContent>
      </Card>
    ))}
  </div>

  {/* Itens Selecionados */}
  <Separator />
  <div className="space-y-2">
    <p className="font-semibold">Itens Selecionados ({selectedItems.length})</p>
    {selectedItems.map(item => (
      <div key={item.sku} className="flex justify-between items-center p-2 bg-muted rounded">
        <span>{item.qty}x {item.name}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">R$ {(parseFloat(item.price) * item.qty).toFixed(2)}</span>
          <Button variant="ghost" size="sm" onClick={() => removeItem(item.sku)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    ))}
  </div>
</div>
```

---

#### 4. **ShippingCommissionForm.tsx** (Step 2)

**Arquivo**: `apps/web/src/components/chat/ShippingCommissionForm.tsx`

**Props**:
```typescript
interface ShippingCommissionFormProps {
  shipping: { method: string; price: string };
  onShippingChange: (shipping: { method: string; price: string }) => void;
  commission: number;
  onCommissionChange: (value: number) => void;
  storePolicy?: { minPercent: number; maxPercent: number };
}
```

**UI**:
```tsx
<div className="space-y-6">
  {/* Frete */}
  <div>
    <Label>Frete</Label>
    <div className="grid grid-cols-2 gap-4 mt-2">
      <Select value={shipping.method} onValueChange={(m) => onShippingChange({ ...shipping, method: m })}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PAC">PAC</SelectItem>
          <SelectItem value="SEDEX">SEDEX</SelectItem>
          <SelectItem value="gratis">Grátis</SelectItem>
          <SelectItem value="motoboy">Motoboy</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        placeholder="Valor (R$)"
        value={shipping.price}
        onChange={(e) => onShippingChange({ ...shipping, price: e.target.value })}
      />
    </div>
  </div>

  {/* Comissão */}
  <div>
    <Label>Comissão para Promotores</Label>
    <div className="space-y-2 mt-2">
      <Slider
        value={[commission]}
        onValueChange={([v]) => onCommissionChange(v)}
        min={storePolicy?.minPercent || 0}
        max={storePolicy?.maxPercent || 15}
        step={1}
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{commission}%</span>
        <span>Em R$ 100, promotor ganha R$ {commission.toFixed(2)}</span>
      </div>
    </div>

    {storePolicy && (
      <p className="text-xs text-muted-foreground mt-2">
        ℹ️ Política da loja: {storePolicy.minPercent}-{storePolicy.maxPercent}%
      </p>
    )}
  </div>
</div>
```

---

#### 5. **ProposalSummary.tsx** (Step 3)

**Arquivo**: `apps/web/src/components/chat/ProposalSummary.tsx`

**Props**:
```typescript
interface ProposalSummaryProps {
  items: ProposalItem[];
  shipping?: { method: string; price: string };
  commission: number;
  expiresIn: string;
  onExpiresChange: (value: string) => void;
}
```

**UI**:
```tsx
<div className="space-y-4">
  {/* Itens */}
  <div>
    <p className="font-semibold mb-2">Itens:</p>
    {items.map(item => (
      <div key={item.sku} className="flex justify-between text-sm">
        <span>{item.qty}x {item.name}</span>
        <span>R$ {(parseFloat(item.price) * item.qty).toFixed(2)}</span>
      </div>
    ))}
  </div>

  {/* Frete */}
  {shipping && parseFloat(shipping.price) > 0 && (
    <div className="flex justify-between pt-2 border-t">
      <span className="text-sm text-muted-foreground">Frete ({shipping.method})</span>
      <span className="text-sm">R$ {parseFloat(shipping.price).toFixed(2)}</span>
    </div>
  )}

  {/* Total */}
  <div className="flex justify-between pt-2 border-t">
    <span className="font-semibold">Total</span>
    <span className="text-lg font-bold">R$ {calculateTotal().toFixed(2)}</span>
  </div>

  {/* Comissão */}
  <div className="text-xs text-muted-foreground">
    💰 Comissão para promotores: {commission}%
    (R$ {(calculateTotal() * commission / 100).toFixed(2)})
  </div>

  {/* Validade */}
  <div>
    <Label>Validade da Proposta</Label>
    <Select value={expiresIn} onValueChange={onExpiresChange}>
      <SelectTrigger className="mt-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="24h">24 horas</SelectItem>
        <SelectItem value="48h">48 horas</SelectItem>
        <SelectItem value="72h">3 dias</SelectItem>
        <SelectItem value="7d">7 dias</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

---

### 🧪 Testes de Validação (Fase 3A)

```bash
# 1. Teste manual
1. Login como vendedor
2. Abrir chat com cliente
3. Clicar em [+]
4. Selecionar "Criar Proposta"
5. Selecionar 2 produtos
6. Configurar frete (R$ 15)
7. Ajustar comissão (5%)
8. Revisar resumo
9. Enviar proposta
10. Verificar que ProposalCard aparece no chat
11. Cliente deve ver botão "Aceitar Proposta"
```

---

## 🎨 FASE 3B: Polimento e Extras (OPCIONAL)

### 📌 Tempo Estimado: 6-10 horas

### 🎯 Objetivo

Adicionar feedback visual, confirmações e páginas de detalhes para melhorar a UX.

### 📋 Checklist de Entregas

- [ ] `CheckoutConfirmDialog.tsx`
- [ ] `PaymentSuccessDialog.tsx`
- [ ] `ReceiptCard.tsx` (mensagem no chat)
- [ ] `ReceiptViewerPage.tsx`
- [ ] `SaleDetailsPage.tsx`
- [ ] `SplitVisualization.tsx`
- [ ] `CommissionPolicyPage.tsx` (vendedor)

### 🎨 Especificação de Componentes

#### 1. **CheckoutConfirmDialog.tsx**

**Arquivo**: `apps/web/src/components/chat/CheckoutConfirmDialog.tsx`

**Props**:
```typescript
interface CheckoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  onConfirm: () => Promise<void>;
}
```

**UI**:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar Pagamento</DialogTitle>
      <DialogDescription>
        Esta ação não pode ser desfeita
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      <div className="p-4 bg-muted rounded">
        <p className="text-2xl font-bold text-center">
          R$ {parseFloat(proposal.total).toFixed(2)} BZR
        </p>
      </div>

      <div className="text-sm space-y-1">
        <p>Vendedor: <span className="font-medium">@{proposal.sellerHandle}</span></p>
        <p>Itens: <span className="font-medium">{proposal.items.length} produtos</span></p>
      </div>

      <Alert>
        <AlertDescription>
          💰 Saldo Disponível: R$ 500,00 BZR
        </AlertDescription>
      </Alert>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancelar
      </Button>
      <Button onClick={async () => {
        await onConfirm();
        onOpenChange(false);
      }}>
        Confirmar Pagamento
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Integração no ProposalCard**:
```tsx
// Modificar ProposalCard.tsx
const [showConfirm, setShowConfirm] = useState(false);

<Button onClick={() => setShowConfirm(true)}>
  Aceitar Proposta
</Button>

<CheckoutConfirmDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  proposal={proposal}
  onConfirm={() => onAccept(proposal.id)}
/>
```

---

#### 2. **PaymentSuccessDialog.tsx**

**Arquivo**: `apps/web/src/components/chat/PaymentSuccessDialog.tsx`

**UI**:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <div className="flex flex-col items-center text-center space-y-4 py-4">
      <div className="rounded-full bg-green-100 p-3">
        <Check className="h-8 w-8 text-green-600" />
      </div>

      <div>
        <h3 className="text-xl font-semibold">Pagamento Confirmado!</h3>
        <p className="text-muted-foreground mt-1">
          Compra realizada com sucesso
        </p>
      </div>

      <div className="w-full space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">ID da Venda:</span>
          <span className="font-mono">#{saleId.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor Pago:</span>
          <span className="font-bold">R$ {amount} BZR</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Recibo NFT:</span>
          <Button variant="link" size="sm" asChild>
            <Link to={`/receipts/${receiptCid}`}>
              Ver Recibo
            </Link>
          </Button>
        </div>
      </div>

      <DialogFooter className="w-full">
        <Button className="w-full" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </DialogFooter>
    </div>
  </DialogContent>
</Dialog>
```

---

#### 3. **SplitVisualization.tsx**

**Arquivo**: `apps/web/src/components/chat/SplitVisualization.tsx`

**Props**:
```typescript
interface SplitVisualizationProps {
  total: number;
  sellerAmount: number;
  commissionAmount: number;
  bazariFee: number;
}
```

**UI**:
```tsx
<div className="space-y-3">
  <div className="text-sm font-medium">Distribuição do Pagamento</div>

  {/* Breakdown */}
  <div className="space-y-2">
    <div className="flex justify-between items-center p-2 rounded bg-green-50">
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-green-600" />
        <span className="text-sm">Vendedor</span>
      </div>
      <div className="text-right">
        <div className="font-semibold">R$ {sellerAmount.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground">
          {((sellerAmount / total) * 100).toFixed(0)}%
        </div>
      </div>
    </div>

    {commissionAmount > 0 && (
      <div className="flex justify-between items-center p-2 rounded bg-blue-50">
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 text-blue-600" />
          <span className="text-sm">Promotor</span>
        </div>
        <div className="text-right">
          <div className="font-semibold">R$ {commissionAmount.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            {((commissionAmount / total) * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    )}

    <div className="flex justify-between items-center p-2 rounded bg-gray-50">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-gray-600" />
        <span className="text-sm">Taxa Bazari</span>
      </div>
      <div className="text-right">
        <div className="font-semibold">R$ {bazariFee.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground">
          {((bazariFee / total) * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  </div>

  {/* Barra Visual */}
  <div className="h-2 flex rounded-full overflow-hidden">
    <div
      className="bg-green-500"
      style={{ width: `${(sellerAmount / total) * 100}%` }}
    />
    {commissionAmount > 0 && (
      <div
        className="bg-blue-500"
        style={{ width: `${(commissionAmount / total) * 100}%` }}
      />
    )}
    <div
      className="bg-gray-400"
      style={{ width: `${(bazariFee / total) * 100}%` }}
    />
  </div>
</div>
```

---

#### 4. **CommissionPolicyPage.tsx**

**Arquivo**: `apps/web/src/pages/seller/CommissionPolicyPage.tsx`

**Rota**: `/app/seller/commission-policy`

**UI** (especificação completa em comentário - ~300 linhas de código)

---

### 🧪 Testes de Validação (Fase 3B)

```bash
# 1. Checkout com confirmação
1. Cliente abre proposta
2. Clica "Aceitar Proposta"
3. Dialog de confirmação aparece
4. Verifica saldo disponível
5. Confirma pagamento
6. Dialog de sucesso aparece
7. Recibo NFT é exibido

# 2. Visualização de Split
1. Ver detalhes da venda
2. Split visual é exibido corretamente
3. Percentuais somam 100%

# 3. Configuração de Comissão
1. Vendedor acessa /app/seller/commission-policy
2. Ajusta percentual (slider)
3. Define modo (aberto/seguidores/afiliados)
4. Salva política
5. Política é aplicada em novas propostas
```

---

## 📝 PROMPTS PARA CLAUDE CODE

### 🚀 PROMPT: FASE 3A - Criação de Propostas (CRÍTICO)

```
Implementar FASE 3A: Interface de Criação de Propostas no Chat

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_FASE3_UX_SPEC.md

CONTEXTO:
O backend da Fase 3 (Comércio no Chat) já está 100% implementado.
Falta apenas a UI para CRIAR propostas. A visualização (ProposalCard) já existe.

OBJETIVO:
Permitir vendedores criarem propostas de venda selecionando produtos do catálogo.

EXECUTAR NA ORDEM:

### 1. Modificar ChatThreadPage.tsx:
- Adicionar botão [+] ao lado do input de mensagem
- Adicionar DropdownMenu com opções:
  - "Criar Proposta" (ícone ClipboardList)
  - "Enviar Mídia" (ícone Image)
- Adicionar estado: const [showProposalDialog, setShowProposalDialog] = useState(false)

### 2. Criar CreateProposalDialog.tsx:
Arquivo: apps/web/src/components/chat/CreateProposalDialog.tsx
- Dialog multi-step (3 passos)
- State: step (1|2|3), selectedItems, shipping, commission, expiresIn
- Step 1: ProductSelectorGrid
- Step 2: ShippingCommissionForm
- Step 3: ProposalSummary
- Navegação: Voltar / Próximo / Enviar Proposta
- Validações em cada step
- Integração com useChat.createProposal()

### 3. Criar ProductSelectorGrid.tsx:
Arquivo: apps/web/src/components/chat/ProductSelectorGrid.tsx
- Reutilizar hook useStoreCatalog existente
- Input de busca
- Grid 3 colunas de produtos (imagem, nome, preço)
- Controle de quantidade (+/-)
- Lista de itens selecionados
- Props: selectedItems, onItemsChange

### 4. Criar ShippingCommissionForm.tsx:
Arquivo: apps/web/src/components/chat/ShippingCommissionForm.tsx
- Select de método de frete (PAC, SEDEX, Grátis, Motoboy)
- Input de valor do frete
- Slider de comissão (0-15%)
- Exibir preview: "Em R$ 100, promotor ganha R$ X"
- Info da política da loja (se houver)

### 5. Criar ProposalSummary.tsx:
Arquivo: apps/web/src/components/chat/ProposalSummary.tsx
- Lista de itens selecionados
- Subtotal
- Frete (se houver)
- Total (destacado)
- Comissão (em % e R$)
- Select de validade (24h, 48h, 72h, 7d)

### 6. Integração:
- Ao enviar proposta, chamar useChat.createProposal()
- Toast de sucesso
- Fechar dialog
- Proposta aparece no chat via ProposalCard existente

SEGUIR EXATAMENTE:
- Estrutura de código da especificação
- Usar shadcn/ui components (Dialog, Select, Slider, etc.)
- Usar lucide-react icons
- TypeScript strict

VALIDAÇÕES:
- Build sem erros
- Step 1: Pelo menos 1 produto selecionado
- Step 2: Frete ≥ 0, comissão 0-15%
- Proposta criada aparece no chat
- ProposalCard existente renderiza corretamente

IMPORTANTE:
- NÃO modificar backend (já está pronto)
- NÃO modificar ProposalCard.tsx (já existe)
- NÃO modificar useChat (apenas usar createProposal)

Ao final, executar teste manual completo do fluxo.
```

---

### 🎨 PROMPT: FASE 3B - Polimento e Extras (OPCIONAL)

```
Implementar FASE 3B: Polimento da UX de Comércio no Chat

Repositório: ~/bazari
Documento de referência: ~/bazari/docs/specs/BAZCHAT_FASE3_UX_SPEC.md

PRÉ-REQUISITO: FASE 3A deve estar completa e funcionando

OBJETIVO:
Adicionar feedback visual, confirmações e páginas de detalhes.

EXECUTAR NA ORDEM:

### 1. Criar CheckoutConfirmDialog.tsx:
Arquivo: apps/web/src/components/chat/CheckoutConfirmDialog.tsx
- Dialog de confirmação antes do checkout
- Exibir: valor total, vendedor, quantidade de itens
- Mostrar saldo disponível (mock)
- Botões: Cancelar / Confirmar Pagamento
- Integrar no ProposalCard (substituir botão direto)

### 2. Criar PaymentSuccessDialog.tsx:
Arquivo: apps/web/src/components/chat/PaymentSuccessDialog.tsx
- Dialog de sucesso após checkout
- Ícone de check verde
- Exibir: ID venda, valor pago, link recibo NFT
- Botão: Fechar

### 3. Criar SplitVisualization.tsx:
Arquivo: apps/web/src/components/chat/SplitVisualization.tsx
- Componente visual de split de pagamento
- Cards: Vendedor (verde), Promotor (azul), Bazari (cinza)
- Barra visual horizontal com cores
- Mostrar valores e percentuais

### 4. Criar ReceiptCard.tsx:
Arquivo: apps/web/src/components/chat/ReceiptCard.tsx
- Card de recibo a ser exibido no chat
- Tipo de mensagem: 'payment'
- Exibir: ID venda, comprador, vendedor, valor
- Link: "Ver Recibo Completo"
- Ícone de recibo

### 5. Criar SaleDetailsPage.tsx:
Arquivo: apps/web/src/pages/chat/SaleDetailsPage.tsx
- Rota: /app/chat/sales/:saleId
- Exibir detalhes completos da venda
- Incluir SplitVisualization
- Exibir txHash (mock), receiptNftCid
- Botões: Ver Recibo NFT, Compartilhar

### 6. Criar ReceiptViewerPage.tsx:
Arquivo: apps/web/src/pages/chat/ReceiptViewerPage.tsx
- Rota: /app/receipts/:cid
- Renderizar recibo NFT do IPFS
- Formato: JSON estruturado e legível
- Seções: Comprador, Vendedor, Promotor, Breakdown, TxHash, Assinatura
- Botões: Baixar JSON, Verificar no IPFS

### 7. Criar CommissionPolicyPage.tsx:
Arquivo: apps/web/src/pages/seller/CommissionPolicyPage.tsx
- Rota: /app/seller/commission-policy
- Formulário de configuração:
  - Modo: Radio (Aberto / Seguidores / Afiliados)
  - Percentual: Slider 0-15%
  - Reputação mínima: Input
  - Limite diário: Input (opcional)
- Preview de cálculo
- Botões: Cancelar / Salvar Política
- Integrar com API: GET/PUT /chat/settings/store/:storeId

### 8. Integrações:
- Modificar ProposalCard para usar CheckoutConfirmDialog
- Após checkout bem-sucedido, mostrar PaymentSuccessDialog
- Adicionar rotas no App.tsx
- Adicionar ReceiptCard ao MessageBubble (tipo 'payment')

VALIDAÇÕES:
- Checkout com confirmação funciona
- Dialog de sucesso aparece
- Split visual está correto (soma 100%)
- Recibo NFT é visualizado
- Política de comissão é salva
- Todas as páginas navegam corretamente

IMPORTANTE:
- Usar dados mock quando API retornar mock
- Todas as páginas devem ser responsivas
- Usar skeleton loaders onde necessário

Ao final, testar fluxo completo:
Criar proposta → Aceitar → Confirmar → Ver sucesso → Ver recibo → Ver detalhes venda
```

---

## 📊 CHECKLIST FINAL DA FASE 3 COMPLETA

Após executar os dois prompts, validar:

### Backend (já implementado):
- [x] Tabela ChatProposal
- [x] Tabela ChatSale
- [x] Tabela StoreCommissionPolicy
- [x] POST /chat/proposals
- [x] POST /chat/checkout
- [x] CommissionService (split)
- [x] Recibo NFT (IPFS)

### Frontend - FASE 3A (Crítico):
- [ ] Botão [+] no chat
- [ ] CreateProposalDialog (3 steps)
- [ ] ProductSelectorGrid
- [ ] ShippingCommissionForm
- [ ] ProposalSummary
- [ ] Integração com createProposal
- [ ] ProposalCard renderiza

### Frontend - FASE 3B (Opcional):
- [ ] CheckoutConfirmDialog
- [ ] PaymentSuccessDialog
- [ ] SplitVisualization
- [ ] ReceiptCard
- [ ] SaleDetailsPage
- [ ] ReceiptViewerPage
- [ ] CommissionPolicyPage

### Testes End-to-End:
- [ ] Vendedor cria proposta com 2 produtos
- [ ] Proposta aparece no chat
- [ ] Comprador aceita proposta
- [ ] Checkout é processado (mock)
- [ ] Recibo NFT é gerado
- [ ] Split de pagamento está correto
- [ ] Detalhes da venda acessíveis
- [ ] Política de comissão configurável

---

## 🎯 ESTIMATIVAS FINAIS

| Fase | Tempo | Prioridade | Funcionalidade |
|------|-------|-----------|----------------|
| **3A** | 10-14h | 🔴 CRÍTICO | Criar propostas |
| **3B** | 6-10h | 🟢 OPCIONAL | Polimento UX |
| **TOTAL** | 16-24h | - | FASE 3 100% |

---

## ✅ CRITÉRIOS DE SUCESSO

A FASE 3 estará **100% completa** quando:

1. ✅ Vendedor consegue criar proposta do zero no chat
2. ✅ Comprador consegue aceitar e pagar
3. ✅ Split de pagamento funciona (mock)
4. ✅ Recibo NFT é gerado e visualizável
5. ✅ Política de comissão configurável
6. ✅ Todas as 6 funcionalidades da especificação original funcionam
7. ✅ UI intuitiva e responsiva
8. ✅ Sem erros de build ou runtime

---

**Fim da Especificação FASE 3 UI/UX v2.0.0**

**Próximo passo**: Copiar "PROMPT: FASE 3A" e executar no Claude Code! 🚀
