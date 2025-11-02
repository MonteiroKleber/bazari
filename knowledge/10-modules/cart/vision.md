# Cart Module - Vision & Purpose

## 🎯 Vision
**"Proporcionar experiência de carrinho de compras fluida, persistente e inteligente, com validação de vendedor único (MVP) e sincronização por usuário."**

## 📋 Purpose
1. **Client-Side Storage** - Carrinho armazenado em localStorage (Zustand persist)
2. **User-Scoped Carts** - Cada usuário (SS58 address) tem carrinho isolado
3. **Single Seller Rule** - MVP: apenas itens de 1 vendedor por carrinho
4. **Real-Time Calculations** - Subtotal e contagem atualizados automaticamente
5. **Conflict Resolution** - Modal de confirmação ao trocar vendedor

## 🌟 Key Principles
- **Client-Side First** - Nenhum backend necessário, 100% localStorage
- **User Isolation** - Carrinho vinculado ao address ativo (não compartilhado)
- **Seller Enforcement** - Validação automática de vendedor único
- **Snapshot Pricing** - Preço e título salvos no momento da adição (protege contra mudanças)
- **Optimistic UI** - Atualizações instantâneas, sem loading states

## 🏗️ Architecture
```
CartPage (React) → useCart (Zustand) → localStorage (persist)
                         ↓
              CartItem[] + computed values
                         ↓
         Seller Conflict Check → SellerConflictModal
```

## 📦 Data Structure
```typescript
interface CartItem {
  listingId: string;        // UUID do produto/serviço
  qty: number;              // Quantidade
  priceBzrSnapshot: string; // Preço em planck no momento da adição
  titleSnapshot: string;    // Título no momento da adição
  sellerId: string;         // DAO ID do vendedor
  kind: 'product' | 'service';
  addedAt: number;          // Timestamp de adição
}
```

## 🔐 Storage Strategy
- **Key Pattern**: `bazari_cart_{address}` (ex: `bazari_cart_5GrwvaEF...`)
- **Anonymous Users**: `bazari_cart_anonymous`
- **Auto-Switch**: Carrinho troca automaticamente ao mudar conta ativa
- **Persistence**: Zustand persist middleware com version=1

## 🚨 Seller Conflict Flow
```
User adds item → Check currentSellerId
   ↓
sellerId matches → Add to cart ✅
   ↓
sellerId differs → Return needsConfirmation
   ↓
Show SellerConflictModal → User confirms → Clear old + Add new
```

## 🔄 State Management
```typescript
// Zustand Store
{
  items: CartItem[];          // Lista de itens
  subtotalBzr: string;        // Computed: soma de lineTotals
  count: number;              // Computed: soma de qtys
  currentSellerId: string | null; // Computed: sellerId do primeiro item

  // Actions
  addItem(item) → Promise<boolean>  // false se precisa confirmação
  removeItem(listingId)
  updateQty(listingId, qty)
  clear()
}
```

## 🎨 UI Components
1. **CartPage** - Lista de itens + resumo + checkout button
2. **SellerConflictModal** - Confirmação ao trocar vendedor
3. **Empty Cart State** - Ilustração + link para catálogo

## 🔮 Future Features
1. **Multi-Vendor Carts** - Remover restrição de vendedor único
2. **Server-Side Sync** - Backup de carrinho em backend
3. **Cart Sharing** - Compartilhar carrinho via link
4. **Price Alerts** - Notificar se preço mudou desde adição
5. **Saved for Later** - Mover itens para wishlist

**Status:** ✅ Implemented & Production-Ready
