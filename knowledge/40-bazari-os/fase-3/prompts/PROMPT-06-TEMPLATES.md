# PROMPT 06 - Sistema de Templates

## Contexto

O Bazari Studio precisa de templates prontos para acelerar a criacao de apps.

## Pre-requisito

PROMPT-01 a PROMPT-05 devem estar implementados.

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/07-TEMPLATES.md`

## Tarefa

### 1. Criar Arquivos

```
apps/web/src/apps/studio/
├── services/
│   └── templates.service.ts    // Gerenciamento de templates
├── components/
│   └── templates/
│       ├── TemplateGallery.tsx    // Galeria de templates
│       ├── TemplateCard.tsx       // Card de template
│       └── TemplatePreview.tsx    // Preview de template
├── data/
│   └── templates/
│       ├── index.ts               // Export de todos templates
│       ├── react-ts.ts            // Template React+TS (atual)
│       ├── ecommerce.ts           // Template E-commerce
│       ├── social.ts              // Template Social
│       ├── defi.ts                // Template DeFi
│       └── loyalty.ts             // Template Loyalty
└── types/
    └── template.types.ts          // Tipos de template
```

### 2. template.types.ts

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;           // Icone Lucide
  color: string;          // Gradient Tailwind
  preview?: string;       // URL de imagem
  tags: string[];
  files: TemplateFile[];
  defaultPermissions: Permission[];
  sdkFeatures: string[];
}

type TemplateCategory = 'starter' | 'commerce' | 'social' | 'finance' | 'tools' | 'contract';

interface TemplateFile {
  path: string;
  content: string;
  isTemplate: boolean;  // Se tem placeholders {{name}}, {{slug}}, etc
}

interface Permission {
  id: string;
  reason: string;
  optional?: boolean;
}
```

### 3. templates.service.ts

```typescript
class TemplatesService {
  private templates: Map<string, Template> = new Map();

  constructor() {
    this.registerBuiltInTemplates();
  }

  private registerBuiltInTemplates() {
    this.templates.set('react-ts', REACT_TS_TEMPLATE);
    this.templates.set('ecommerce', ECOMMERCE_TEMPLATE);
    this.templates.set('social', SOCIAL_TEMPLATE);
    this.templates.set('defi', DEFI_TEMPLATE);
    this.templates.set('loyalty', LOYALTY_TEMPLATE);
  }

  getAll(): Template[] { ... }
  getById(id: string): Template | undefined { ... }
  getByCategory(category: TemplateCategory): Template[] { ... }

  processTemplate(template: Template, config: ProjectConfig): TemplateFile[] {
    // Substituir placeholders: {{name}}, {{slug}}, {{description}}, {{author}}
  }
}

export const templatesService = new TemplatesService();
```

### 4. Templates a Criar

#### react-ts.ts (Padrao - ja existe)

Usar exatamente os arquivos de `packages/bazari-cli/templates/react-ts/`

```typescript
export const REACT_TS_TEMPLATE: Template = {
  id: 'react-ts',
  name: 'React + TypeScript',
  description: 'Template basico com React 18, TypeScript e Vite',
  category: 'starter',
  icon: 'Code2',
  color: 'from-blue-500 to-cyan-500',
  tags: ['react', 'typescript', 'vite', 'starter'],
  sdkFeatures: ['auth', 'wallet', 'ui'],
  defaultPermissions: [
    { id: 'user.profile.read', reason: 'Para exibir seu perfil' },
    { id: 'wallet.balance.read', reason: 'Para exibir seu saldo' },
  ],
  files: [
    // Copiar conteudo de packages/bazari-cli/templates/react-ts/
  ],
};
```

#### ecommerce.ts

```typescript
export const ECOMMERCE_TEMPLATE: Template = {
  id: 'ecommerce',
  name: 'E-commerce Starter',
  description: 'Loja virtual com carrinho, produtos e checkout',
  category: 'commerce',
  icon: 'ShoppingCart',
  color: 'from-green-500 to-emerald-500',
  tags: ['ecommerce', 'shop', 'cart', 'checkout'],
  sdkFeatures: ['auth', 'wallet', 'transfer', 'storage'],
  defaultPermissions: [
    { id: 'user.profile.read', reason: 'Para identificar o comprador' },
    { id: 'wallet.balance.read', reason: 'Para verificar saldo' },
    { id: 'wallet.transfer.request', reason: 'Para processar pagamentos' },
    { id: 'storage.app', reason: 'Para salvar carrinho' },
  ],
  files: [
    // Criar arquivos para:
    // - src/pages/HomePage.tsx (lista de produtos)
    // - src/pages/ProductPage.tsx (detalhe do produto)
    // - src/pages/CartPage.tsx (carrinho)
    // - src/components/ProductCard.tsx
    // - src/components/Cart.tsx
    // - src/hooks/useCart.ts
    // - src/hooks/useBazari.ts
  ],
};
```

#### social.ts

```typescript
export const SOCIAL_TEMPLATE: Template = {
  id: 'social',
  name: 'Social App',
  description: 'App social com feed, posts e perfis',
  category: 'social',
  icon: 'Users',
  color: 'from-pink-500 to-rose-500',
  tags: ['social', 'feed', 'posts', 'community'],
  sdkFeatures: ['auth', 'storage'],
  defaultPermissions: [
    { id: 'user.profile.read', reason: 'Para exibir perfis' },
    { id: 'storage.app', reason: 'Para salvar posts' },
  ],
  files: [
    // src/pages/FeedPage.tsx
    // src/pages/ProfilePage.tsx
    // src/components/Post.tsx
    // src/components/PostForm.tsx
    // src/hooks/useFeed.ts
  ],
};
```

#### defi.ts

```typescript
export const DEFI_TEMPLATE: Template = {
  id: 'defi',
  name: 'DeFi Dashboard',
  description: 'Dashboard financeiro com saldos e transacoes',
  category: 'finance',
  icon: 'Wallet',
  color: 'from-purple-500 to-violet-500',
  tags: ['defi', 'finance', 'wallet', 'swap'],
  sdkFeatures: ['auth', 'wallet', 'history', 'transfer', 'blockchain'],
  defaultPermissions: [
    { id: 'user.profile.read', reason: 'Para identificar usuario' },
    { id: 'wallet.balance.read', reason: 'Para exibir saldos' },
    { id: 'wallet.history.read', reason: 'Para exibir historico' },
    { id: 'wallet.transfer.request', reason: 'Para transferencias' },
    { id: 'blockchain.sign', reason: 'Para assinar transacoes' },
  ],
  files: [
    // src/pages/DashboardPage.tsx
    // src/pages/TransferPage.tsx
    // src/components/BalanceCard.tsx
    // src/components/TransactionHistory.tsx
    // src/hooks/useTokens.ts
  ],
};
```

#### loyalty.ts

```typescript
export const LOYALTY_TEMPLATE: Template = {
  id: 'loyalty',
  name: 'Loyalty Program',
  description: 'Programa de fidelidade com pontos e recompensas',
  category: 'commerce',
  icon: 'Star',
  color: 'from-yellow-500 to-orange-500',
  tags: ['loyalty', 'points', 'rewards', 'gamification'],
  sdkFeatures: ['auth', 'contracts', 'wallet'],
  defaultPermissions: [
    { id: 'user.profile.read', reason: 'Para identificar cliente' },
    { id: 'wallet.balance.read', reason: 'Para exibir pontos' },
  ],
  files: [
    // src/pages/PointsPage.tsx
    // src/pages/RewardsPage.tsx
    // src/components/PointsBalance.tsx
    // src/components/RewardCard.tsx
    // src/hooks/useLoyalty.ts
  ],
};
```

### 5. TemplateGallery.tsx

```typescript
interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const templates = templatesService.getAll();
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Filtrar por categoria e busca

  return (
    <div className="space-y-6">
      <div>
        <h2>Escolha um Template</h2>
        <p>Comece com um template pronto ou crie do zero</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Input placeholder="Buscar..." value={search} onChange={...} />
        <Select value={category} onValueChange={setCategory}>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="starter">Starter</SelectItem>
          <SelectItem value="commerce">Commerce</SelectItem>
          // ...
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filteredTemplates.map(t => (
          <TemplateCard key={t.id} template={t} onSelect={() => onSelect(t)} />
        ))}
      </div>
    </div>
  );
}
```

### 6. TemplateCard.tsx

```typescript
// Card com:
// - Icone colorido
// - Nome
// - Descricao
// - Badge de categoria
// - Tags
// - Recursos SDK usados
```

### 7. Integrar no NewProjectWizard

O primeiro passo do wizard deve ser a galeria de templates.

## Criterios de Aceite

1. [ ] Galeria mostra todos os templates
2. [ ] Filtro por categoria funciona
3. [ ] Busca por nome/descricao funciona
4. [ ] Card mostra informacoes do template
5. [ ] Selecionar template passa para proximo passo do wizard
6. [ ] Placeholders sao substituidos corretamente
7. [ ] Projeto criado a partir do template funciona
8. [ ] Build do projeto nao quebra

## Notas

- Templates devem usar codigo funcional e testado
- Seguir padroes do SDK
- Incluir comentarios explicativos no codigo
