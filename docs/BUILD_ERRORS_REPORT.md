# Relatório de Erros de Build - Bazari

**Data**: 2025-10-12
**Status**: 🔴 **CRÍTICO** - Builds falhando (API: 26 erros | Web: 122 erros)

---

## 📊 Resumo Executivo

### API Build Status: ❌ FALHANDO
- **Total de Erros**: 26 erros TypeScript
- **Arquivos Afetados**: 8 arquivos
- **Categorias**:
  - Type casting (10 erros)
  - Propriedades faltando (8 erros)
  - Configuração TypeScript (2 erros)
  - Tipos incompatíveis (6 erros)

### Web Build Status: ❌ FALHANDO
- **Total de Erros**: 122 erros TypeScript
- **Arquivos Afetados**: 45+ arquivos
- **Categorias**:
  - Props incompatíveis (25 erros)
  - Tipos implícitos `any` (18 erros)
  - Propriedades faltando (30 erros)
  - Null/undefined checks (20 erros)
  - Módulos não encontrados (1 erro)
  - Variáveis não utilizadas (15 erros)
  - Outros (13 erros)

---

## 🔧 ERROS DA API - Análise Detalhada

### Categoria 1: Type Casting em Prisma JsonValue

**Causa Raiz**: Prisma retorna `JsonValue` mas o código tenta converter diretamente para tipos customizados sem validação.

#### Erro #1: achievementChecker.ts:21
```typescript
// ❌ ERRO
const req = achievement.requirement as AchievementRequirement;
```

**Problema**: `JsonValue` (string | number | boolean | JsonObject | JsonArray | null) não pode ser convertido diretamente para `AchievementRequirement`.

**✅ Solução**:
```typescript
// apps/api/src/lib/achievementChecker.ts linha 21
const req = achievement.requirement as unknown as AchievementRequirement;
// OU adicionar validação:
const req = achievement.requirement
  ? JSON.parse(JSON.stringify(achievement.requirement)) as AchievementRequirement
  : null;
```

---

#### Erro #2-5: products.ts (linhas 215, 614) e services.ts (linhas 215, 600)

**Problema**: Campo `onChainStoreId` do tipo `bigint | null` não é compatível com `InputJsonValue`.

```typescript
// ❌ ERRO
metadata: {
  ...product,  // Contém onChainStoreId: bigint | null
}
```

**✅ Solução**:
```typescript
// apps/api/src/routes/products.ts linha 215 e 614
// apps/api/src/routes/services.ts linha 215 e 600

metadata: {
  ...product,
  onChainStoreId: product.onChainStoreId?.toString() ?? null, // Converter bigint para string
}
```

---

#### Erro #6: me.sellers.ts:290

**Problema**: Tentando passar `bigint` para função que aceita `string | number`.

```typescript
// ❌ ERRO linha 290
BigInt(42)  // bigint não é atribuível a string | number
```

**✅ Solução**:
```typescript
// apps/api/src/routes/me.sellers.ts linha 290
BigInt(42).toString()  // Converter para string
// OU
Number(BigInt(42))     // Converter para number (cuidado com overflow)
```

---

### Categoria 2: Polkadot Codec Type Conversions

**Causa Raiz**: Tipos do Polkadot mudaram e não são mais diretamente compatíveis.

#### Erro #7: storesChain.ts:101
```typescript
// ❌ ERRO
return api.query.stores.storesByOwner.entries(address) as Promise<Vec<any>>;
```

**✅ Solução**:
```typescript
// apps/api/src/lib/storesChain.ts linha 101
return api.query.stores.storesByOwner.entries(address) as unknown as Promise<Vec<any>>;
```

#### Erro #8: storesChain.ts:149
```typescript
// ❌ ERRO
const metadata = result as Option<StoreMetadata>;
```

**✅ Solução**:
```typescript
// apps/api/src/lib/storesChain.ts linha 149
const metadata = result as unknown as Option<StoreMetadata>;
```

#### Erro #9: storesChain.ts:179
```typescript
// ❌ ERRO
entries as [StorageKey<[any]>, Vec<any>][]
```

**✅ Solução**:
```typescript
// apps/api/src/lib/storesChain.ts linha 179
entries as unknown as [StorageKey<[any]>, Vec<any>][]
```

---

### Categoria 3: OpenSearch Type Mismatch

#### Erro #10: marketplace.ts:61

**Problema**: Tipo de sort não é compatível com a nova versão do cliente OpenSearch.

```typescript
// ❌ ERRO
sort: sortBy === 'newest'
  ? [{ 'sync.lastIndexedAt': 'desc' }]
  : sortBy === 'price_asc'
    ? [{ 'price.amount': 'asc' }]
    : [{ 'price.amount': 'desc' }]
```

**✅ Solução**:
```typescript
// apps/api/src/routes/marketplace.ts linha 61
sort: sortBy === 'newest'
  ? [{ 'sync.lastIndexedAt': { order: 'desc' as const } }]
  : sortBy === 'price_asc'
    ? [{ 'price.amount': { order: 'asc' as const } }]
    : [{ 'price.amount': { order: 'desc' as const } }]
```

#### Erro #11-12: marketplace.ts:83

**Problema**: Verificação de propriedade `total` sem type guard.

```typescript
// ❌ ERRO
const total = result.body.hits.total.value;
```

**✅ Solução**:
```typescript
// apps/api/src/routes/marketplace.ts linha 83
const total = typeof result.body.hits.total === 'number'
  ? result.body.hits.total
  : result.body.hits.total?.value ?? 0;
```

---

### Categoria 4: Propriedades Faltando em Tipos

#### Erro #13-16: products.ts (linhas 481, 483, 487, 489)

**Problema**: Body type não inclui `sellerStoreId` e `sellerStoreSlug`.

**✅ Solução - Adicionar ao tipo do body**:
```typescript
// apps/api/src/routes/products.ts (início do handler PATCH)
// Encontrar a definição do schema e adicionar:

const updateProductSchema = z.object({
  categoryPath: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  daoId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priceBzr: z.string().optional(),
  mediaIds: z.array(z.string()).optional(),
  sellerStoreId: z.string().optional(),      // ✅ ADICIONAR
  sellerStoreSlug: z.string().optional(),    // ✅ ADICIONAR
});
```

#### Erro #17-20: services.ts (linhas 467, 469, 473, 475)

**Problema**: Mesmo que acima, para services.

**✅ Solução**:
```typescript
// apps/api/src/routes/services.ts (início do handler PATCH)
const updateServiceSchema = z.object({
  categoryPath: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  daoId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  mediaIds: z.array(z.string()).optional(),
  basePriceBzr: z.string().optional(),
  sellerStoreId: z.string().optional(),      // ✅ ADICIONAR
  sellerStoreSlug: z.string().optional(),    // ✅ ADICIONAR
});
```

---

### Categoria 5: Tipos Unknown em Stores

#### Erro #21-24: stores.ts (linhas 75, 86, 92, 103)

**Problema**: Resposta da blockchain retorna `unknown` mas o código assume estrutura específica.

**✅ Solução**:
```typescript
// apps/api/src/routes/stores.ts

// Linha 75:
const metadata = storeData as { categories?: any[] };

// Linha 86:
if (metadata && 'categories' in metadata && Array.isArray(metadata.categories)) {
  // usar metadata.categories
}

// Linha 92:
const itemsData = storeData as { items?: any[] };

// Linha 103:
if (itemsData && 'items' in itemsData && Array.isArray(itemsData.items)) {
  // usar itemsData.items
}
```

---

### Categoria 6: Configuração TypeScript

#### Erro #25: workers/index.ts:8

**Problema**: Top-level `await` sem configuração adequada.

**✅ Solução**:
```typescript
// apps/api/tsconfig.json - atualizar:
{
  "compilerOptions": {
    "target": "ES2022",        // ✅ Alterar de ES2020 para ES2022
    "module": "ES2022",        // ✅ Alterar de ES2020 para ES2022
    "lib": ["ES2022"],         // ✅ Alterar de ES2020 para ES2022
    // ... resto permanece igual
  }
}
```

---

#### Erro #26: reputation.worker.ts:140

**Problema**: Objeto possivelmente null sem verificação.

**✅ Solução**:
```typescript
// apps/api/src/workers/reputation.worker.ts linha 140
// Adicionar optional chaining:
const value = someObject?.property ?? defaultValue;
```

---

## 🌐 ERROS DA WEB - Análise Detalhada

### Categoria 1: Button Component - Propriedade `asChild` Faltando

**Causa Raiz**: O componente Button não implementa a propriedade `asChild` (padrão Radix UI).

#### Erros afetados:
- QuickActions.tsx:53
- RecentActivity.tsx:98, 111
- ProfileHoverCard.tsx:194
- CartPage.tsx:68, 208

**✅ Solução - Atualizar Button Component**:
```typescript
// apps/web/src/components/ui/button.tsx - SUBSTITUIR TODO O ARQUIVO

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
        xs: "h-7 rounded-md px-2 text-xs",  // ✅ ADICIONAR
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean  // ✅ ADICIONAR
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"  // ✅ ADICIONAR
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**📦 Dependência necessária**:
```bash
pnpm add --filter @bazari/web @radix-ui/react-slot
```

---

### Categoria 2: PWA Module - Virtual Module Não Encontrado

#### Erro: UpdatePrompt.tsx:2

**Problema**: O plugin PWA não está configurado para expor tipos do virtual module.

**✅ Solução**:
```typescript
// apps/web/vite.config.ts - adicionar na configuração do VitePWA:

VitePWA({
  registerType: 'autoUpdate',
  // ... resto da config

  // ✅ ADICIONAR:
  injectRegister: 'auto',

  devOptions: {
    enabled: true,
    type: 'module',  // ✅ ADICIONAR
  }
})
```

**E criar arquivo de tipos**:
```typescript
// apps/web/src/vite-env.d.ts - CRIAR OU ADICIONAR:

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />  // ✅ ADICIONAR
/// <reference types="vite-plugin-pwa/client" /> // ✅ ADICIONAR
```

---

### Categoria 3: Type `any` Implícito - Strict Mode

**Causa Raiz**: TypeScript strict mode ativo mas parâmetros sem tipos.

#### Erros afetados (18 ocorrências):
- UpdatePrompt.tsx:14, 17
- ProfileHoverCard.tsx:106 (param 'e')
- useProductDetail.ts:87, 104, 188
- useServiceDetail.ts:87, 103, 186
- SearchPage.tsx:440 (2x)
- OrderPayPage.tsx:98, 100, 102, 115 (2x)
- ProfilePublicPage.tsx (múltiplas)

**✅ Solução Padrão**:
```typescript
// Exemplo: UpdatePrompt.tsx linha 14
// ❌ ANTES
updateServiceWorker(r => { ... })

// ✅ DEPOIS
updateServiceWorker((reloadPage: boolean) => { ... })

// Exemplo: SearchPage.tsx linha 440
// ❌ ANTES
buckets.map((bucket, idx) => ...)

// ✅ DEPOIS
buckets.map((bucket: any, idx: number) => ...)
// OU melhor, definir tipo correto:
buckets.map((bucket: AggregationBucket, idx: number) => ...)
```

---

### Categoria 4: Propriedades Faltando em Tipos

#### Erro #1: ProfileHoverCard.tsx:106 - `onOpenAutoFocus`

**Problema**: HoverCardContent não aceita `onOpenAutoFocus`.

**✅ Solução**:
```typescript
// apps/web/src/components/social/ProfileHoverCard.tsx linha 106
// ❌ REMOVER onOpenAutoFocus:

<HoverCardContent
  className="w-80"
  // onOpenAutoFocus={(e) => e.preventDefault()}  // ❌ REMOVER
>
```

---

#### Erro #2: BadgesList.tsx:49 - Variant "ghost"

**Problema**: Button variant "ghost" não está incluída no tipo.

**✅ Solução**: Já resolvido pela atualização do Button acima (adicionamos "ghost" ao tipo).

---

#### Erro #3-6: P2POrderRoomPage.tsx

**Problema 1**: Propriedades `takerProfile` e `makerProfile` não existem em `Order`.

```typescript
// ❌ ERRO linha 402
const counterparty = order.takerProfile || order.makerProfile;
```

**✅ Solução**:
```typescript
// apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx linha 402
// Ajustar para usar as propriedades corretas:
const counterparty = order.taker || order.maker;
// OU se for objeto aninhado:
const counterparty = order.taker?.profile || order.maker?.profile;
```

**Problema 2**: Variável `setPinError` não definida (linhas 210, 251).

**✅ Solução**:
```typescript
// apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx
// Adicionar no início do componente:
const [pinError, setPinError] = useState<string>('');
```

**Problema 3**: `chainInfo.ss58Prefix` não existe (linha 215).

**✅ Solução**:
```typescript
// apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx linha 215
// ❌ ANTES
const prefix = chainInfo.ss58Prefix;

// ✅ DEPOIS
const prefix = chainInfo?.props?.ss58Prefix ?? 42;
```

**Problema 4**: Propriedade `kind` não existe em mensagem (linha 700).

**✅ Solução**:
```typescript
// apps/web/src/modules/p2p/pages/P2POrderRoomPage.tsx linha 700
// Verificar estrutura correta do tipo Message e ajustar
const messageType = 'kind' in message ? message.kind : 'text';
```

---

#### Erro #4: P2POrderRoomPage.tsx:552, 662, 666 - Props de Icon

**Problema 1**: `title` não é prop válida de Lucide Icon (linha 552).

**✅ Solução**:
```typescript
// ❌ REMOVER prop title do Icon
<CheckCircle className="..." aria-label="..." />
```

**Problema 2**: Size "xs" não existe (linhas 662, 666).

**✅ Solução**: Já resolvido pela atualização do Button acima (adicionamos size "xs").

---

### Categoria 5: Null/Undefined Checks

#### Múltiplos erros de verificação null/undefined:

**✅ Solução Padrão - Adicionar Optional Chaining**:

```typescript
// SearchPage.tsx (múltiplas linhas 601-708)
// ❌ ANTES
const current = results.page.current;

// ✅ DEPOIS
const current = results.page?.current ?? 1;

// OrderPayPage.tsx (linhas 288, 292, 296)
// ❌ ANTES
paymentIntent.amount

// ✅ DEPOIS
paymentIntent?.amount ?? 0
```

**Lista de fixes necessários**:

1. **SearchPage.tsx** (linhas 601-708): Adicionar `?.` em todos acessos a `results.page`
2. **OrderPayPage.tsx** (linhas 288, 292, 296): Adicionar `?.` em `paymentIntent`
3. **NewListingPage.tsx** (linha 600, 601): Adicionar `?.` em `spec`
4. **RecentActivity.tsx** (linhas 38-47): Type guard para `response` e `profileRes`

**Exemplo completo**:
```typescript
// apps/web/src/pages/SearchPage.tsx - Substituir bloco 601-708

// ✅ SOLUÇÃO:
const currentPage = results.page?.current ?? 1;
const totalPages = results.page?.total ?? 1;
const hasNext = results.page?.hasNext ?? false;
const hasPrev = results.page?.hasPrev ?? false;

// Usar currentPage, totalPages, etc ao invés de results.page.current
```

---

### Categoria 6: Type Predicates e Array Filters

#### Erro: useRelatedItems.ts:48, 71

**Problema**: Type predicate incompatível com tipo do array.

```typescript
// ❌ ERRO
const validMedia = media.filter((m): m is MediaItem => m !== null);
```

**✅ Solução**:
```typescript
// apps/web/src/hooks/useRelatedItems.ts

// Linha 37 - Filtrar nulls antes de atribuir:
const validMedia = product.media
  .filter((m): m is NonNullable<typeof m> => m !== null)
  .map(m => ({
    id: m.id ?? undefined,
    url: m.url ?? undefined
  }));

// Linha 53 - Filtrar nulls no final:
const validItems = items
  .map(item => item ? { ...item } : null)
  .filter((item): item is NonNullable<typeof item> => item !== null);
```

---

### Categoria 7: Tipos de Resposta Unknown

**Causa Raiz**: API responses sem type annotation.

#### Erros afetados:
- RecentActivity.tsx:38, 44, 46, 47
- DashboardPage.tsx:43, 44, 49, 54-57
- useProfileReputation.ts:23
- OrderPayPage.tsx:98, 100, 102, 115 (2x)
- ProfilePublicPage.tsx (múltiplas)
- FeedPage.tsx:18

**✅ Solução - Definir tipos de resposta**:

```typescript
// Criar: apps/web/src/types/api-responses.ts

export interface ProfileResponse {
  profile: {
    id: string;
    name: string;
    // ... campos
  }
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface ReputationResponse {
  score: number;
  level: string;
  // ...
}

// Depois usar nos componentes:
import type { ProfileResponse } from '@/types/api-responses';

const res = await api.get('/profile') as ProfileResponse;
setProfile(res.profile);
```

---

### Categoria 8: Propriedades em Objetos Vazios

#### Erros: DashboardPage.tsx, ProfileEditPage.tsx

**Problema**: Tentando acessar propriedades de objeto tipado como `{}`.

**✅ Solução**:
```typescript
// apps/web/src/pages/DashboardPage.tsx linha 54
// ❌ ANTES
const profileData = {};
console.log(profileData.profile);  // Erro!

// ✅ DEPOIS
const profileData: ProfileResponse | null = null;
if (profileData && 'profile' in profileData) {
  console.log(profileData.profile);
}

// apps/web/src/pages/ProfileEditPage.tsx (linhas 103, 133, 179, 218)
// Similar - usar type guards:
if (uploadRes && 'asset' in uploadRes && 'url' in uploadRes) {
  const { asset, url } = uploadRes;
}
```

---

### Categoria 9: Incompatibilidades de Assinatura de Função

#### Erro #1: ProfilePublicPage.tsx:492

**Problema**: Função `loadMore` aceita `boolean` mas é usada como event handler.

**✅ Solução**:
```typescript
// apps/web/src/pages/ProfilePublicPage.tsx linha 492

// ✅ Criar wrapper:
<Button onClick={() => loadMore()}>Load More</Button>

// OU ajustar assinatura:
const loadMore = (event?: React.MouseEvent<HTMLButtonElement>) => {
  // lógica
};
```

---

#### Erro #2: PinProvider.tsx:8

**Problema**: useEffect retornando `boolean` ao invés de `void | Destructor`.

**✅ Solução**:
```typescript
// apps/web/src/modules/wallet/pin/PinProvider.tsx linha 8

// ❌ ANTES
useEffect(() => {
  return checkSomething();  // retorna boolean
}, []);

// ✅ DEPOIS
useEffect(() => {
  checkSomething();  // não retorna nada
  return () => {
    // cleanup se necessário
  };
}, []);
```

---

### Categoria 10: Type Assertions e Conversões

#### Erro #1: crypto.utils.ts:76

**Problema**: `Uint8Array<ArrayBufferLike>` vs `BufferSource`.

**✅ Solução**:
```typescript
// apps/web/src/modules/auth/crypto.utils.ts linha 76

// ❌ ANTES
const buffer: BufferSource = new Uint8Array(data);

// ✅ DEPOIS
const buffer: BufferSource = new Uint8Array(data) as BufferSource;
// OU
const buffer = new Uint8Array(data.buffer);
```

---

#### Erro #2: cart.store.ts:48

**Problema**: Promise sem await tentando acessar propriedade.

**✅ Solução**:
```typescript
// apps/web/src/modules/cart/cart.store.ts linha 48

// ❌ ANTES
const addr = getVaultAccount().address;

// ✅ DEPOIS
const vault = await getVaultAccount();
const addr = vault?.address;
```

---

#### Erro #3: NewListingPage.tsx:179, 201

**Problema**: Tipo `null` incompatível com `string | undefined`.

**✅ Solução**:
```typescript
// apps/web/src/pages/NewListingPage.tsx

// Linha 179:
const newFiles = selectedFiles.map(file => ({
  file,
  preview: URL.createObjectURL(file),
  uploading: true,
  error: undefined,  // ✅ undefined ao invés de null
}));

// Linha 201:
const updated = [...uploadedFiles];
updated[index] = {
  ...updated[index],
  error: errorMessage || undefined,  // ✅ converter null para undefined
};
```

---

#### Erro #4: P2PMyOrdersPage.tsx:38

**Problema**: `null` não atribuível a `string | undefined`.

**✅ Solução**:
```typescript
// apps/web/src/modules/p2p/pages/P2PMyOrdersPage.tsx linha 38

// ❌ ANTES
const value: string | undefined = someValue;  // someValue pode ser null

// ✅ DEPOIS
const value: string | undefined = someValue ?? undefined;
```

---

#### Erro #5: SellerSetupPage.tsx:760

**Problema**: Propriedades `name` e `categories` faltando em payload.

**✅ Solução**:
```typescript
// apps/web/src/pages/SellerSetupPage.tsx linha 760

const payload: StoreMetadataPayload = {
  version: '1.0.0',
  storeId: storeId,
  name: storeName,              // ✅ ADICIONAR
  categories: storeCategories,  // ✅ ADICIONAR
  itemCount: items.length,
  items: items,
};
```

---

#### Erro #6: SellerSetupPage.tsx:976

**Problema**: Propriedade `layoutVariant` não existe em objeto de cores.

**✅ Solução**:
```typescript
// apps/web/src/pages/SellerSetupPage.tsx linha 976

// ❌ ANTES
const value = colors[key as keyof StoreTheme];  // key pode ser 'layoutVariant'

// ✅ DEPOIS
const themeColors = { bg: theme.bg, ink: theme.ink, brand: theme.brand, accent: theme.accent };
const value = themeColors[key as keyof typeof themeColors];
```

---

#### Erro #7: SellerSetupPage.tsx:1383

**Problema**: `version` não existe em `NormalizedOnChainStore`.

**✅ Solução**:
```typescript
// apps/web/src/pages/SellerSetupPage.tsx linha 1383

// ❌ ANTES
const ver = onChainStore.version;

// ✅ DEPOIS
const ver = 'version' in onChainStore ? onChainStore.version : '1.0.0';
// OU adicionar ao tipo NormalizedOnChainStore
```

---

#### Erro #8: StorePublicPage.tsx:190

**Problema**: Propriedade `sync` não existe em resposta.

**✅ Solução**:
```typescript
// apps/web/src/pages/StorePublicPage.tsx linha 190

// ❌ REMOVER ou ajustar tipo:
const response: OnChainStoreResponse = {
  // sync: { ... },  // ❌ REMOVER se não existir
};

// ✅ OU criar tipo com sync:
interface ExtendedOnChainStoreResponse extends OnChainStoreResponse {
  sync?: {
    lastIndexedAt: string;
  };
}
```

---

#### Erro #9: SellerSetupPage.test.tsx:290

**Problema**: Tentando atribuir a propriedade readonly.

**✅ Solução**:
```typescript
// apps/web/src/pages/__tests__/SellerSetupPage.test.tsx linha 290

// ❌ ANTES
mockStore.store_onchain_v1 = newValue;

// ✅ DEPOIS
const mockStore = {
  ...originalMock,
  store_onchain_v1: newValue,
};
```

---

#### Erro #10: ThemeProvider.tsx:38

**Problema**: Array readonly sendo atribuído a array mutable.

**✅ Solução**:
```typescript
// apps/web/src/theme/ThemeProvider.tsx linha 38

// ❌ ANTES
const themes: { id: ThemeId; name: string }[] = THEMES;

// ✅ DEPOIS
const themes: readonly { id: ThemeId; name: string }[] = THEMES;
// OU
const themes = [...THEMES];  // Criar cópia mutable
```

---

#### Erro #11: PaymentPage.tsx (múltiplos)

**Problemas**:
1. Linha 103: `address` em Promise sem await
2. Linha 141: Número errado de argumentos
3. Linha 141: `encryptedMnemonic` em Promise sem await
4. Linha 144: `ss58Prefix` não existe

**✅ Solução**:
```typescript
// apps/web/src/pages/PaymentPage.tsx

// Linha 103:
const vault = await getVaultAccount();
const addr = vault?.address;

// Linha 141 - verificar assinatura correta da função:
// Se função espera 4-5 args, passar todos:
await someFunction(arg1, arg2, vault?.encryptedMnemonic, arg4, arg5);

// Linha 144:
const prefix = chainInfo?.props?.ss58Prefix ?? 42;
```

---

### Categoria 11: Variáveis Não Utilizadas (Limpeza)

**Ação**: Remover ou usar as variáveis listadas abaixo:

```typescript
// QuickActionsGrid.tsx:7, 11 - REMOVER imports não usados:
// import { Search } from 'lucide-react';  // ❌
// import { TrendingUp } from 'lucide-react';  // ❌

// RecentActivity.tsx:5 - REMOVER import:
// import { formatDistanceToNow } from 'date-fns';  // ❌

// PullToRefreshIndicator.tsx:15 - REMOVER ou usar:
// const progress = ...;  // ❌

// OfflineIndicator.tsx:2, 5 - REMOVER:
// import { Wifi } from 'lucide-react';  // ❌
// const { isOnline } = useNetworkStatus();  // ❌

// PostCard.tsx:9 - REMOVER:
// import { LikeButton } from './LikeButton';  // ❌

// collapsible.tsx:1 - REMOVER:
// import React from 'react';  // ❌ (já tem * as React)

// StoreHeader.tsx:5 - REMOVER:
// import { Badge } from '@/components/ui/badge';  // ❌

// E outros conforme listado nos erros...
```

---

## 📝 Plano de Ação Recomendado

### Fase 1: Correções Críticas (Alta Prioridade)

#### 1.1 Atualizar Button Component (resolve 6+ erros)
```bash
# Instalar dependência
pnpm add --filter @bazari/web @radix-ui/react-slot

# Atualizar apps/web/src/components/ui/button.tsx (código fornecido acima)
```

#### 1.2 Configurar PWA Types (resolve 3 erros)
```bash
# Atualizar vite.config.ts e criar vite-env.d.ts
```

#### 1.3 Corrigir TypeScript Config API (resolve 1 erro)
```bash
# Atualizar apps/api/tsconfig.json: target/module/lib para ES2022
```

#### 1.4 Fix BigInt Conversões (resolve 6 erros)
```bash
# Converter bigint para string em products.ts, services.ts, me.sellers.ts
```

---

### Fase 2: Type Safety (Média Prioridade)

#### 2.1 Criar API Response Types
```bash
# Criar apps/web/src/types/api-responses.ts
# Adicionar tipos para todas as respostas da API
```

#### 2.2 Adicionar Type Guards
```bash
# Adicionar verificações null/undefined em SearchPage, OrderPayPage, etc
```

#### 2.3 Fix Polkadot Types (resolve 3 erros)
```bash
# Adicionar 'as unknown as' em storesChain.ts
```

---

### Fase 3: Limpeza e Melhorias (Baixa Prioridade)

#### 3.1 Remover Imports Não Usados
```bash
# Rodar eslint --fix ou remover manualmente
```

#### 3.2 Adicionar Propriedades Faltantes
```bash
# Adicionar sellerStoreId, sellerStoreSlug aos schemas
# Adicionar campos faltantes em tipos
```

#### 3.3 Fix Test Mocks
```bash
# Ajustar mocks em testes
```

---

## 🚀 Script de Correção Automatizada

### API Fixes

```bash
# 1. Atualizar tsconfig
cat > apps/api/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["node", "vitest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "prisma"]
}
EOF

# 2. Rebuild para verificar
pnpm --filter @bazari/api build
```

### Web Fixes

```bash
# 1. Instalar @radix-ui/react-slot
pnpm add --filter @bazari/web @radix-ui/react-slot

# 2. Atualizar button.tsx (usar código fornecido acima)

# 3. Criar vite-env.d.ts
cat > apps/web/src/vite-env.d.ts << 'EOF'
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />
EOF

# 4. Rebuild
pnpm --filter @bazari/web build
```

---

## ✅ Checklist de Validação

Após aplicar as correções, validar:

- [ ] `pnpm --filter @bazari/api build` ✅ sem erros
- [ ] `pnpm --filter @bazari/web build` ✅ sem erros
- [ ] `pnpm --filter @bazari/api test` ✅ testes passando
- [ ] `pnpm --filter @bazari/web test` ✅ testes passando
- [ ] Dev server API iniciando sem erros
- [ ] Dev server Web iniciando sem erros
- [ ] Não há regressões visuais no frontend
- [ ] API endpoints respondendo corretamente

---

## 🎯 Próximos Passos Após Correções

Uma vez que os builds estejam limpos:

1. ✅ Executar validação de ambiente BazChat
2. ✅ Iniciar **FASE 0** do [BAZCHAT_PROMPTS.md](docs/specs/BAZCHAT_PROMPTS.md)
3. ✅ Prosseguir com implementação BazChat fases 1-8

---

## 📚 Referências

- [TypeScript Handbook - Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [Radix UI - Slot Component](https://www.radix-ui.com/primitives/docs/utilities/slot)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Polkadot.js API Types](https://polkadot.js.org/docs/api/start/types.basics)
- [Prisma JSON Fields](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields)

---

**Documento gerado em**: 2025-10-12
**Versão**: 1.0.0
**Autor**: Claude Code Analysis
