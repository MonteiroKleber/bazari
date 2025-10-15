# 📋 Propostas Multi-Loja - Especificação Técnica

## 🎯 Objetivo

Permitir que promotores criem propostas contendo produtos de múltiplas lojas em uma única transação, gerando múltiplos splits de pagamento e múltiplos recibos NFT.

---

## 📊 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│              PROPOSTA COM MÚLTIPLAS LOJAS                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Agrupar por Loja        │
              │ Loja A: 2 produtos      │
              │ Loja B: 3 produtos      │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Checkout                │
              └─────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │ Sale A   │        │ Sale B   │        │ Fees     │
  │ Split    │        │ Split    │        │ Bazari   │
  │ NFT A    │        │ NFT B    │        │          │
  └──────────┘        └──────────┘        └──────────┘
```

---

## 🗄️ FASE 1: Schema do Banco de Dados

### **1.1 Atualizar: ChatProposal**

```prisma
model ChatProposal {
  id               String   @id @default(uuid())
  threadId         String
  sellerId         String  // Promotor que criou
  buyerId          String?

  // NOVO: Suporte multi-loja
  isMultiStore     Boolean  @default(false)
  storeGroups      Json?    // Array de grupos por loja

  // Campos originais (mantidos para compatibilidade)
  items            Json
  subtotal         Decimal  @db.Decimal(20, 8)
  shipping         Json?
  total            Decimal  @db.Decimal(20, 8)
  commissionPercent Int     @default(5)

  status           String   @default("sent") // sent | paid | expired | cancelled
  expiresAt        BigInt
  createdAt        BigInt
  updatedAt        BigInt

  // Relacionamento com vendas
  sales            ChatSale[] // NOVO: Um para muitos

  @@index([threadId])
  @@index([sellerId])
  @@index([status])
}
```

### **1.2 Estrutura JSON: storeGroups**

```typescript
interface StoreGroup {
  storeId: number;              // onChainStoreId
  storeName: string;
  items: ProposalItem[];
  subtotal: number;
  shipping?: {
    method: string;
    price: number;
  };
  total: number;
  commissionPercent: number;    // Política da loja ou customizada
}

// Exemplo
{
  isMultiStore: true,
  storeGroups: [
    {
      storeId: 1,
      storeName: "Loja Gurupi",
      items: [
        { sku: "prod-1", name: "Camisa", qty: 2, price: "50" }
      ],
      subtotal: 100,
      shipping: { method: "PAC", price: 10 },
      total: 110,
      commissionPercent: 6
    },
    {
      storeId: 2,
      storeName: "Loja Palmas",
      items: [
        { sku: "prod-5", name: "Calça", qty: 1, price: "80" }
      ],
      subtotal: 80,
      total: 80,
      commissionPercent: 5
    }
  ]
}
```

### **1.3 Atualizar: ChatSale**

```prisma
model ChatSale {
  id                String    @id @default(uuid())
  proposalId        String    // NOVO: Relacionamento com proposta
  proposal          ChatProposal @relation(fields: [proposalId], references: [id])

  storeId           BigInt
  buyer             String
  seller            String    // Dono da loja
  promoter          String?   // Quem promoveu

  amount            Decimal   @db.Decimal(20, 8)
  commissionPercent Int
  commissionAmount  Decimal   @db.Decimal(20, 8)
  bazariFee         Decimal   @db.Decimal(20, 8)
  sellerAmount      Decimal   @db.Decimal(20, 8)

  status            String    @default("pending") // pending | split | failed
  txHash            String?
  receiptNftCid     String?

  createdAt         BigInt
  settledAt         BigInt?

  @@index([proposalId])
  @@index([storeId])
  @@index([buyer])
  @@index([seller])
  @@index([promoter])
}
```

---

## 🔧 FASE 2: Backend API

### **2.1 POST /api/chat/proposals - Multi-Store**

**Lógica atualizada:**

```typescript
// 1. Validar e agrupar produtos por loja
const productsByStore = new Map<string, ProposalItem[]>();

for (const item of items) {
  const product = await prisma.product.findUnique({
    where: { id: item.sku },
    select: { sellerStoreId: true, onChainStoreId: true },
  });

  if (!product) {
    return reply.code(404).send({ error: `Product ${item.sku} not found` });
  }

  const storeKey = product.sellerStoreId;
  if (!productsByStore.has(storeKey)) {
    productsByStore.set(storeKey, []);
  }
  productsByStore.get(storeKey).push(item);
}

// 2. Criar grupos por loja
const storeGroups: StoreGroup[] = [];

for (const [storeId, storeItems] of productsByStore) {
  const store = await prisma.sellerProfile.findUnique({
    where: { id: storeId },
    select: { shopName: true, onChainStoreId: true, userId: true },
  });

  // Buscar política de comissão
  const policy = await getStoreCommissionPolicy(store.onChainStoreId);

  // Calcular subtotal deste grupo
  const subtotal = storeItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.qty,
    0
  );

  // Validar acesso se necessário (followers/affiliates)
  await validatePromoterAccess(sellerId, store, policy);

  storeGroups.push({
    storeId: Number(store.onChainStoreId),
    storeName: store.shopName,
    items: storeItems,
    subtotal,
    shipping: null, // Pode ser configurado por loja
    total: subtotal,
    commissionPercent: policy.percent,
  });
}

// 3. Calcular total geral
const grandTotal = storeGroups.reduce((sum, g) => sum + g.total, 0);

// 4. Criar proposta multi-loja
const proposal = await prisma.chatProposal.create({
  data: {
    threadId,
    sellerId,
    items, // Todos os itens
    subtotal: grandTotal,
    total: grandTotal,
    commissionPercent: 0, // Não usado em multi-loja
    isMultiStore: true,
    storeGroups: storeGroups,
    status: 'sent',
    expiresAt: expiresAt || now + 48 * 60 * 60 * 1000,
    createdAt: now,
    updatedAt: now,
  },
});
```

---

### **2.2 POST /api/chat/checkout - Multi-Store**

**Lógica atualizada:**

```typescript
const proposal = await prisma.chatProposal.findUnique({
  where: { id: proposalId },
});

if (proposal.isMultiStore) {
  // CHECKOUT MULTI-LOJA
  const storeGroups = proposal.storeGroups as StoreGroup[];
  const sales: ChatSale[] = [];

  // Processar cada loja separadamente
  for (const group of storeGroups) {
    // Buscar seller (dono da loja)
    const store = await prisma.sellerProfile.findFirst({
      where: { onChainStoreId: BigInt(group.storeId) },
      select: { userId: true },
    });

    const sellerProfile = await prisma.profile.findUnique({
      where: { userId: store.userId },
    });

    // Processar split para esta loja
    const saleResult = await commissionService.settleSale({
      proposalId,
      storeId: group.storeId,
      buyer: buyerId,
      seller: sellerProfile.id,
      promoter: proposal.sellerId, // Quem criou a proposta
      amount: group.total.toString(),
      commissionPercent: group.commissionPercent,
    });

    sales.push(saleResult);
  }

  // Atualizar proposta
  await prisma.chatProposal.update({
    where: { id: proposalId },
    data: {
      buyerId,
      status: 'paid',
      updatedAt: Date.now(),
    },
  });

  // Enviar mensagem com múltiplos recibos
  await chatService.createMessage({
    threadId: proposal.threadId,
    fromProfile: buyerId,
    type: 'payment',
    ciphertext: 'Pagamento confirmado',
    meta: {
      proposalId,
      sales: sales.map(s => ({
        saleId: s.saleId,
        storeId: s.storeId,
        amount: s.amount,
        receiptCid: s.receiptNftCid,
      })),
    },
  });

  return { success: true, sales };

} else {
  // CHECKOUT SINGLE-STORE (lógica atual)
  // ...
}
```

---

## 🎨 FASE 3: Frontend UI

### **3.1 ProductSelectorGrid - Multi-Store**

**Modificações:**

```tsx
// Remover restrição de loja única
const [lockedStoreId, setLockedStoreId] = useState<number | null>(null);

// MUDANÇA: Não travar mais em uma loja
const addItem = (product: Product) => {
  // Permitir produtos de qualquer loja
  const price = product.priceBzr?.toString() || '0';
  const newItem: ProposalItem = {
    sku: product.id,
    name: product.title,
    qty: 1,
    price,
    storeId: product.onChainStoreId, // NOVO: incluir storeId no item
  };
  onItemsChange([...selectedItems, newItem]);
};

// Mostrar agrupamento visual por loja
const groupedItems = useMemo(() => {
  return selectedItems.reduce((groups, item) => {
    const storeId = item.storeId || 'unknown';
    if (!groups[storeId]) groups[storeId] = [];
    groups[storeId].push(item);
    return groups;
  }, {} as Record<string, ProposalItem[]>);
}, [selectedItems]);

// Renderizar grupos
<div className="space-y-4">
  {Object.entries(groupedItems).map(([storeId, items]) => (
    <Card key={storeId}>
      <CardHeader>
        <CardTitle>🏪 {getStoreName(storeId)}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.map(item => (
          <ItemRow key={item.sku} item={item} />
        ))}
        <Separator />
        <p className="font-medium">
          Subtotal: R$ {calculateSubtotal(items)}
        </p>
      </CardContent>
    </Card>
  ))}
</div>
```

---

### **3.2 ProposalCard - Multi-Store**

**Componente:** `MultiStoreProposalCard.tsx`

```tsx
interface MultiStoreProposalCardProps {
  proposal: ChatProposal;
  onAccept?: () => Promise<void>;
}

export function MultiStoreProposalCard({ proposal, onAccept }: Props) {
  const storeGroups = proposal.storeGroups as StoreGroup[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposta Multi-Loja</CardTitle>
        <CardDescription>
          {storeGroups.length} lojas • {proposal.items.length} produtos
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {storeGroups.map((group, idx) => (
          <div key={idx} className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold">🏪 {group.storeName}</h4>
            <ul className="text-sm text-muted-foreground mt-2">
              {group.items.map(item => (
                <li key={item.sku}>
                  {item.qty}x {item.name} - R$ {item.price}
                </li>
              ))}
            </ul>
            <div className="flex justify-between mt-2 text-sm">
              <span>Comissão: {group.commissionPercent}%</span>
              <span className="font-medium">
                Subtotal: R$ {group.total.toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total Geral:</span>
          <span>R$ {proposal.total}</span>
        </div>
      </CardContent>

      <CardFooter>
        <Button onClick={onAccept} className="w-full">
          Aceitar Proposta
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

### **3.3 PaymentSuccessDialog - Multi-Store**

**Modificações:**

```tsx
interface Sale {
  saleId: string;
  storeId: number;
  storeName: string;
  amount: string;
  receiptCid?: string;
}

export function MultiStorePaymentSuccessDialog({ sales }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="text-center space-y-4">
          <div className="rounded-full bg-green-100 p-3 mx-auto w-fit">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          <h3 className="text-xl font-semibold">
            Pagamento Confirmado!
          </h3>

          <p className="text-muted-foreground">
            Sua compra foi dividida entre {sales.length} lojas
          </p>

          <div className="space-y-2">
            {sales.map(sale => (
              <Card key={sale.saleId}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{sale.storeName}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {parseFloat(sale.amount).toFixed(2)}
                      </p>
                    </div>
                    {sale.receiptCid && (
                      <Button variant="link" size="sm" asChild>
                        <Link to={`/app/receipts/${sale.receiptCid}`}>
                          Ver Recibo
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔄 FASE 4: Comissão e Split

### **4.1 CommissionService - Multi-Store**

**Atualizar:** `apps/api/src/chat/services/commission.ts`

```typescript
async settleSaleGroup(data: {
  proposalId: string;
  storeGroups: StoreGroup[];
  buyer: string;
  promoter: string;
}): Promise<SaleResult[]> {
  const results: SaleResult[] = [];

  for (const group of data.storeGroups) {
    // Buscar seller (dono da loja)
    const store = await this.getStoreOwner(group.storeId);

    // Processar split individual
    const result = await this.settleSale({
      proposalId: data.proposalId,
      storeId: group.storeId,
      buyer: data.buyer,
      seller: store.sellerId,
      promoter: data.promoter,
      amount: group.total.toString(),
      commissionPercent: group.commissionPercent,
    });

    results.push(result);
  }

  return results;
}
```

**Split por loja:**
```
Loja A: R$ 100
- Vendedor: R$ 93 (93%)
- Promotor: R$ 6 (6%)
- Bazari: R$ 1 (1%)

Loja B: R$ 80
- Vendedor: R$ 75 (94%)
- Promotor: R$ 4 (5%)
- Bazari: R$ 1 (1%)

Total Promotor: R$ 10 (6% + 5% = 10 total de R$ 180)
Total Bazari: R$ 2 (1% de cada)
```

---

## 📱 FASE 5: UX/UI Melhorias

### **5.1 Configuração Toggle**

Adicionar em Settings:

```tsx
<Switch
  checked={allowMultiStore}
  onCheckedChange={setAllowMultiStore}
/>
<Label>Permitir propostas multi-loja</Label>
<p className="text-xs text-muted-foreground">
  Promotores podem incluir produtos de várias lojas em uma proposta
</p>
```

### **5.2 Visual de Carrinho**

Mostrar separação clara:

```
🛒 Seu Carrinho

📦 Loja Gurupi
  2x Camisa - R$ 100
  Frete PAC: R$ 10
  ────────────────
  Subtotal: R$ 110

📦 Loja Palmas
  1x Calça - R$ 80
  Frete Grátis
  ────────────────
  Subtotal: R$ 80

═══════════════════
💰 Total: R$ 190

ℹ️ Seu pagamento será dividido entre 2 lojas
```

---

## 🧪 FASE 6: Testes

### **6.1 Casos de Teste**

1. **Criar Proposta Multi-Loja**
   - ✅ Adicionar produtos de 3 lojas diferentes
   - ✅ Sistema agrupa automaticamente
   - ✅ Calcula subtotal por loja
   - ✅ Busca comissão de cada loja

2. **Checkout Multi-Loja**
   - ✅ Gera 3 ChatSale separados
   - ✅ 3 splits de pagamento
   - ✅ 3 recibos NFT
   - ✅ Atualiza reputação de cada vendedor

3. **Validação de Política**
   - ✅ Loja A: modo open → permite
   - ✅ Loja B: modo followers → valida
   - ✅ Se não é seguidor da Loja B → bloqueia proposta inteira

4. **Limites**
   - ✅ Máximo 5 lojas por proposta
   - ✅ Máximo 20 produtos total

---

## 📝 Notas de Implementação

### **Compatibilidade:**
- ✅ Propostas antigas (single-store) continuam funcionando
- ✅ Flag `isMultiStore` diferencia os dois tipos
- ✅ Checkout detecta tipo automaticamente

### **Performance:**
- ⚠️ Checkout multi-loja é mais lento (N splits)
- ✅ Executar splits em paralelo quando possível
- ✅ Cachear políticas de comissão

### **Limitações:**
- Frete: Por enquanto, sem cálculo automático por loja
- UI: Pode ficar complexa com muitas lojas
- Transactions: Não há rollback se um split falhar

### **Melhorias Futuras:**
- Cálculo de frete integrado por loja
- Otimização de rota (agrupar lojas próximas)
- Split único para economizar gas fees
- Cashback distribuído entre lojas
