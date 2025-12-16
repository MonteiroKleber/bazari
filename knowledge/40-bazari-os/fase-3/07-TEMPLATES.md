# 07 - Sistema de Templates

## Objetivo

Implementar sistema de templates para acelerar a criacao de projetos:
- Templates oficiais Bazari
- Templates da comunidade
- Categorias por tipo de app
- Preview antes de criar

## Templates Oficiais

### 1. React + TypeScript (Padrao)

Template basico para apps Bazari.

**Arquivos**: Mesmos do `packages/bazari-cli/templates/react-ts/`

```
react-ts/
├── index.html
├── package.json.template
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── hooks/
│   │   └── useBazari.ts
│   └── components/
│       └── UserCard.tsx
└── bazari.manifest.json (gerado)
```

### 2. E-commerce Starter

Template para lojas e marketplaces.

```
ecommerce/
├── index.html
├── package.json.template
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ProductPage.tsx
│   │   └── CartPage.tsx
│   ├── components/
│   │   ├── ProductCard.tsx
│   │   ├── Cart.tsx
│   │   └── Checkout.tsx
│   └── hooks/
│       ├── useBazari.ts
│       └── useCart.ts
└── bazari.manifest.json
```

**Permissoes pre-configuradas:**
- `user.profile.read`
- `wallet.balance.read`
- `wallet.transfer.request`

### 3. Social App

Template para apps sociais com feed.

```
social/
├── src/
│   ├── pages/
│   │   ├── FeedPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── MessagesPage.tsx
│   ├── components/
│   │   ├── Post.tsx
│   │   ├── PostForm.tsx
│   │   └── UserAvatar.tsx
│   └── hooks/
│       ├── useBazari.ts
│       └── useFeed.ts
```

### 4. DeFi Dashboard

Template para apps financeiros.

```
defi/
├── src/
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── SwapPage.tsx
│   │   └── StakePage.tsx
│   ├── components/
│   │   ├── BalanceCard.tsx
│   │   ├── TransactionHistory.tsx
│   │   └── SwapForm.tsx
│   └── hooks/
│       ├── useBazari.ts
│       └── useTokens.ts
```

**Permissoes pre-configuradas:**
- `wallet.balance.read`
- `wallet.history.read`
- `wallet.transfer.request`
- `blockchain.sign`

### 5. Loyalty Program

Template para programas de fidelidade.

```
loyalty/
├── src/
│   ├── pages/
│   │   ├── PointsPage.tsx
│   │   ├── RewardsPage.tsx
│   │   └── RedeemPage.tsx
│   ├── components/
│   │   ├── PointsBalance.tsx
│   │   ├── RewardCard.tsx
│   │   └── QRScanner.tsx
│   └── hooks/
│       ├── useBazari.ts
│       └── useLoyaltyContract.ts
```

### 6. Smart Contract (ink!)

Template para smart contracts.

```
contract/
├── Cargo.toml
├── lib.rs
├── .gitignore
└── README.md
```

## Arquivos a Criar

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
│       ├── react-ts.ts            // Template React+TS
│       ├── ecommerce.ts           // Template E-commerce
│       ├── social.ts              // Template Social
│       ├── defi.ts                // Template DeFi
│       ├── loyalty.ts             // Template Loyalty
│       └── contract.ts            // Template Contract
└── types/
    └── template.types.ts          // Tipos de template
```

## Especificacao

### template.types.ts

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  color: string;
  preview?: string;  // URL da imagem de preview
  tags: string[];
  files: TemplateFile[];
  defaultPermissions: Permission[];
  sdkFeatures: string[];  // Recursos do SDK usados
}

type TemplateCategory =
  | 'starter'      // Templates basicos
  | 'commerce'     // E-commerce
  | 'social'       // Apps sociais
  | 'finance'      // DeFi, wallet
  | 'tools'        // Utilitarios
  | 'contract';    // Smart contracts

interface TemplateFile {
  path: string;
  content: string;
  isTemplate: boolean;  // Se tem placeholders
}

interface Permission {
  id: string;
  reason: string;
  optional?: boolean;
}
```

### templates.service.ts

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
    this.templates.set('contract', CONTRACT_TEMPLATE);
  }

  getAll(): Template[] {
    return Array.from(this.templates.values());
  }

  getById(id: string): Template | undefined {
    return this.templates.get(id);
  }

  getByCategory(category: TemplateCategory): Template[] {
    return this.getAll().filter(t => t.category === category);
  }

  /**
   * Processa os arquivos do template substituindo placeholders
   */
  processTemplate(
    template: Template,
    config: {
      name: string;
      slug: string;
      description: string;
      author: string;
    }
  ): TemplateFile[] {
    return template.files.map(file => {
      if (!file.isTemplate) {
        return file;
      }

      const content = file.content
        .replace(/\{\{name\}\}/g, config.name)
        .replace(/\{\{slug\}\}/g, config.slug)
        .replace(/\{\{description\}\}/g, config.description)
        .replace(/\{\{author\}\}/g, config.author);

      return { ...file, content };
    });
  }
}
```

### TemplateGallery.tsx

```typescript
interface TemplateGalleryProps {
  onSelect: (template: Template) => void;
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const templates = templatesService.getAll();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Templates</h2>
        <p className="text-muted-foreground">
          Escolha um template para comecar seu projeto
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="commerce">Commerce</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="tools">Tools</SelectItem>
            <SelectItem value="contract">Contracts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => onSelect(template)}
          />
        ))}
      </div>
    </div>
  );
}
```

### TemplateCard.tsx

```typescript
interface TemplateCardProps {
  template: Template;
  onSelect: () => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const Icon = getIconComponent(template.icon);

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            `bg-gradient-to-br ${template.color}`
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <Badge variant="outline">{template.category}</Badge>
        </div>
        <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Features do SDK */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Recursos SDK:</p>
          <div className="flex flex-wrap gap-1">
            {template.sdkFeatures.map((feature) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Dados dos Templates

### react-ts.ts

```typescript
export const REACT_TS_TEMPLATE: Template = {
  id: 'react-ts',
  name: 'React + TypeScript',
  description: 'Template basico com React 18, TypeScript e Vite',
  category: 'starter',
  icon: 'Code2',
  color: 'from-blue-500 to-cyan-500',
  tags: ['react', 'typescript', 'vite'],
  sdkFeatures: ['auth', 'wallet', 'ui'],
  defaultPermissions: [
    { id: 'user.profile.read', reason: 'Para exibir seu perfil' },
    { id: 'wallet.balance.read', reason: 'Para exibir seu saldo' },
  ],
  files: [
    {
      path: 'package.json',
      isTemplate: true,
      content: `{
  "name": "{{slug}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@bazari.libervia.xyz/app-sdk": "^0.2.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}`,
    },
    {
      path: 'vite.config.ts',
      isTemplate: false,
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 3333, host: true },
});`,
    },
    // ... outros arquivos
  ],
};
```

### ecommerce.ts

```typescript
export const ECOMMERCE_TEMPLATE: Template = {
  id: 'ecommerce',
  name: 'E-commerce Starter',
  description: 'Template completo para loja virtual com carrinho e checkout',
  category: 'commerce',
  icon: 'ShoppingCart',
  color: 'from-green-500 to-emerald-500',
  tags: ['ecommerce', 'shop', 'cart', 'checkout'],
  sdkFeatures: ['auth', 'wallet', 'transfer', 'contracts'],
  defaultPermissions: [
    { id: 'user.profile.read', reason: 'Para identificar o comprador' },
    { id: 'wallet.balance.read', reason: 'Para verificar saldo disponivel' },
    { id: 'wallet.transfer.request', reason: 'Para processar pagamentos' },
  ],
  files: [
    // ... arquivos do template ecommerce
  ],
};
```

## Fluxo de Uso

```
Usuario abre Studio
        │
        ▼
┌─────────────────────┐
│  Clica "Novo"       │
└─────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  TemplateGallery                        │
│                                         │
│  [React+TS] [E-commerce] [Social]       │
│  [DeFi]     [Loyalty]    [Contract]     │
│                                         │
│  Usuario escolhe template               │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  NewProjectWizard                       │
│                                         │
│  Template: E-commerce Starter           │
│  Nome: _______________                  │
│  Descricao: ______________              │
│                                         │
│  [Criar Projeto]                        │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  CreateService                          │
│                                         │
│  1. Processar template (placeholders)   │
│  2. Escrever arquivos no WebContainer   │
│  3. npm install                         │
│  4. Iniciar dev server                  │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Editor abre com projeto pronto         │
│  Preview mostra app funcionando         │
└─────────────────────────────────────────┘
```

## Criterios de Aceite

1. [ ] Galeria mostra todos os templates
2. [ ] Filtro por categoria funciona
3. [ ] Busca por nome/descricao funciona
4. [ ] Card mostra informacoes do template
5. [ ] Selecionar template abre wizard
6. [ ] Placeholders sao substituidos corretamente
7. [ ] Projeto criado funciona corretamente

## Proximos Passos

Apos implementar templates, seguir para:
- [08-AI-INTEGRATION.md](./08-AI-INTEGRATION.md) - Integracao com IA
