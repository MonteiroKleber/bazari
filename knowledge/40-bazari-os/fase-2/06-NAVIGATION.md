# Integração de Navegação - Developer Ecosystem

**Prioridade:** Integração
**Status:** Pendente
**Esforço:** Baixo
**Impacto:** Médio
**Dependências:** Todas as outras tasks de Fase 2

---

## Objetivo

Integrar a navegação do ecossistema de desenvolvedores com as telas já existentes do BazariOS, garantindo uma experiência fluida para desenvolvedores e usuários.

---

## Mapa de Navegação Atual

### Rotas Existentes (App.tsx)

```
/app/
├── hub                      → AppHubPage (Home do BazariOS)
├── store                    → AppStorePage (Loja de Apps)
├── store/:appId             → AppDetailPage (Detalhe do App)
├── settings/apps            → AppSettingsPage (Configurações de Apps)
│
├── developer/               → DevPortalDashboardPage (Dashboard do Desenvolvedor)
├── developer/new            → NewAppPage (Criar Novo App)
├── developer/apps/:id       → AppDetailDevPage (Gerenciar App)
├── developer/apps/:id/monetization → AppMonetizationPage (Monetização)
├── developer/revenue        → RevenueDashboardPage (Receita)
│
├── admin/                   → AdminDashboardPage
├── admin/app-reviews        → AdminAppReviewPage (Review de Apps)
└── admin/analytics          → AdminAppStoreAnalyticsPage (Analytics)
```

---

## Novas Rotas a Adicionar

### Developer Portal

```
/app/developer/
├── docs/                    → DocsPage (Documentação)
├── docs/:category/:slug     → DocArticlePage (Artigo específico)
├── templates/               → TemplatesPage (Templates ink!)
├── templates/:templateId    → TemplateDetailPage (Detalhe do Template)
├── components/              → ComponentsPage (Design System)
├── support/                 → SupportPage (Suporte ao Dev)
└── apps/:id/analytics       → AppAnalyticsPage (Analytics do App)
```

### App Store (Público)

```
/app/store/
├── categories/:category     → CategoryPage (Filtro por Categoria)
├── search                   → SearchAppsPage (Busca de Apps)
└── featured                 → FeaturedAppsPage (Apps em Destaque)
```

---

## Implementação

### Task 1: Adicionar Novas Rotas no App.tsx

**Arquivo:** `apps/web/src/App.tsx`

**Adicionar imports:**

```typescript
// Developer Portal - Additional pages
import DocsPage from './pages/developer/DocsPage';
import DocArticlePage from './pages/developer/DocArticlePage';
import TemplatesPage from './pages/developer/TemplatesPage';
import TemplateDetailPage from './pages/developer/TemplateDetailPage';
import ComponentsPage from './pages/developer/ComponentsPage';
import SupportPage from './pages/developer/SupportPage';
import AppAnalyticsPage from './pages/developer/AppAnalyticsPage';

// App Store - Additional pages
import CategoryPage from './pages/store/CategoryPage';
import SearchAppsPage from './pages/store/SearchAppsPage';
import FeaturedAppsPage from './pages/store/FeaturedAppsPage';
```

**Adicionar rotas (dentro do bloco /app/* Routes):**

```typescript
{/* Developer Portal - Extended routes */}
<Route path="developer/docs" element={<DocsPage />} />
<Route path="developer/docs/:category/:slug" element={<DocArticlePage />} />
<Route path="developer/templates" element={<TemplatesPage />} />
<Route path="developer/templates/:templateId" element={<TemplateDetailPage />} />
<Route path="developer/components" element={<ComponentsPage />} />
<Route path="developer/support" element={<SupportPage />} />
<Route path="developer/apps/:id/analytics" element={<AppAnalyticsPage />} />

{/* App Store - Extended routes */}
<Route path="store/categories/:category" element={<CategoryPage />} />
<Route path="store/search" element={<SearchAppsPage />} />
<Route path="store/featured" element={<FeaturedAppsPage />} />
```

---

### Task 2: Atualizar Navegação do Developer Portal

**Arquivo:** `apps/web/src/pages/developer/DevPortalDashboardPage.tsx`

**Adicionar navegação lateral:**

```tsx
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Plus,
  BookOpen,
  Layers,
  Palette,
  DollarSign,
  HelpCircle,
  BarChart3
} from 'lucide-react';

const developerNavItems = [
  {
    label: 'Dashboard',
    href: '/app/developer',
    icon: LayoutDashboard,
    description: 'Visão geral dos seus apps'
  },
  {
    label: 'Criar App',
    href: '/app/developer/new',
    icon: Plus,
    description: 'Publicar um novo app'
  },
  {
    label: 'Receita',
    href: '/app/developer/revenue',
    icon: DollarSign,
    description: 'Acompanhar ganhos'
  },
  {
    label: 'Documentação',
    href: '/app/developer/docs',
    icon: BookOpen,
    description: 'Guias e tutoriais'
  },
  {
    label: 'Templates',
    href: '/app/developer/templates',
    icon: Layers,
    description: 'Smart contracts prontos'
  },
  {
    label: 'Componentes',
    href: '/app/developer/components',
    icon: Palette,
    description: 'Design System UI'
  },
  {
    label: 'Suporte',
    href: '/app/developer/support',
    icon: HelpCircle,
    description: 'Ajuda e contato'
  },
];

function DeveloperSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r bg-muted/30 p-4">
      <nav className="space-y-1">
        {developerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

### Task 3: Criar Layout Compartilhado para Developer Portal

**Arquivo:** `apps/web/src/layouts/DeveloperLayout.tsx`

```tsx
import { ReactNode } from 'react';
import { DeveloperSidebar } from '../components/developer/DeveloperSidebar';
import { DeveloperBreadcrumb } from '../components/developer/DeveloperBreadcrumb';

interface DeveloperLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function DeveloperLayout({
  children,
  title,
  description,
  actions
}: DeveloperLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DeveloperSidebar />

      <main className="flex-1 p-6">
        <DeveloperBreadcrumb />

        {(title || actions) && (
          <div className="flex items-center justify-between mb-6">
            <div>
              {title && (
                <h1 className="text-2xl font-bold">{title}</h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
```

---

### Task 4: Criar Breadcrumb para Developer Portal

**Arquivo:** `apps/web/src/components/developer/DeveloperBreadcrumb.tsx`

```tsx
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const pathLabels: Record<string, string> = {
  'developer': 'Developer Portal',
  'new': 'Criar App',
  'apps': 'Apps',
  'revenue': 'Receita',
  'docs': 'Documentação',
  'templates': 'Templates',
  'components': 'Componentes',
  'support': 'Suporte',
  'monetization': 'Monetização',
  'analytics': 'Analytics',
};

export function DeveloperBreadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname
    .replace('/app/', '')
    .split('/')
    .filter(Boolean);

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Link
        to="/app/hub"
        className="hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathSegments.map((segment, index) => {
        const path = '/app/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        const label = pathLabels[segment] || segment;

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link
                to={path}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
```

---

### Task 5: Integrar Navegação no App Header

**Arquivo:** `apps/web/src/components/AppHeader.tsx`

**Adicionar link para Developer Portal:**

```tsx
// No dropdown de usuário ou menu principal
const userMenuItems = [
  // ... itens existentes
  {
    label: 'Developer Portal',
    href: '/app/developer',
    icon: Code,
    description: 'Crie apps para Bazari'
  },
];

// Ou como item no header principal para desenvolvedores cadastrados
{isDeveloper && (
  <Link
    to="/app/developer"
    className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted rounded-lg"
  >
    <Code className="h-4 w-4" />
    Developer
  </Link>
)}
```

---

### Task 6: Adicionar Deep Links para Apps

**Arquivo:** `apps/web/src/platform/navigation/deepLinks.ts`

```typescript
// Deep linking para apps externos
export interface DeepLink {
  scheme: string;
  host: string;
  path: string;
  params?: Record<string, string>;
}

export function parseDeepLink(url: string): DeepLink | null {
  try {
    const parsed = new URL(url);

    // bazari://app/com.example.myapp/screen?param=value
    if (parsed.protocol === 'bazari:') {
      const [, appId, ...pathParts] = parsed.pathname.split('/');
      return {
        scheme: 'bazari',
        host: appId,
        path: '/' + pathParts.join('/'),
        params: Object.fromEntries(parsed.searchParams),
      };
    }

    // https://bazari.com/app/store/com.example.myapp
    if (parsed.hostname === 'bazari.com' || parsed.hostname === 'bazari.libervia.xyz') {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'app' && pathParts[1] === 'store') {
        return {
          scheme: 'https',
          host: pathParts[2], // appId
          path: '/' + pathParts.slice(3).join('/'),
          params: Object.fromEntries(parsed.searchParams),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function createDeepLink(appId: string, path: string = '/', params?: Record<string, string>): string {
  const base = `bazari://app/${appId}${path}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    return `${base}?${searchParams.toString()}`;
  }
  return base;
}

export function createWebLink(appId: string): string {
  return `https://bazari.libervia.xyz/app/store/${appId}`;
}
```

---

### Task 7: Navegação entre Apps Nativos e Externos

**Arquivo:** `apps/web/src/platform/navigation/appNavigation.ts`

```typescript
import { useNavigate } from 'react-router-dom';
import { useUserAppsStore } from '../store/user-apps.store';
import { parseDeepLink, createDeepLink } from './deepLinks';

export function useAppNavigation() {
  const navigate = useNavigate();
  const { installedApps } = useUserAppsStore();

  /**
   * Navega para um app instalado
   */
  const openApp = (appId: string, path?: string, params?: Record<string, string>) => {
    const app = installedApps.find(a => a.appId === appId);

    if (!app) {
      // App não instalado, ir para loja
      navigate(`/app/store/${appId}`);
      return;
    }

    if (app.isNative) {
      // App nativo - usar rota interna
      const nativeRoute = getNativeAppRoute(appId);
      if (nativeRoute) {
        navigate(nativeRoute + (path || ''));
      }
    } else {
      // App externo - abrir no sandbox
      navigate(`/app/external/${appId}`, {
        state: { path, params }
      });
    }
  };

  /**
   * Processa um deep link
   */
  const handleDeepLink = (url: string) => {
    const deepLink = parseDeepLink(url);
    if (deepLink) {
      openApp(deepLink.host, deepLink.path, deepLink.params);
    }
  };

  /**
   * Gera link compartilhável para um app
   */
  const getShareableLink = (appId: string): string => {
    return createDeepLink(appId);
  };

  return {
    openApp,
    handleDeepLink,
    getShareableLink,
  };
}

// Mapeamento de apps nativos para suas rotas
const nativeAppRoutes: Record<string, string> = {
  'com.bazari.wallet': '/app/wallet',
  'com.bazari.marketplace': '/marketplace',
  'com.bazari.p2p': '/app/p2p',
  'com.bazari.chat': '/app/chat',
  'com.bazari.governance': '/app/governance',
  'com.bazari.delivery': '/app/delivery',
  'com.bazari.rewards': '/app/rewards/missions',
};

function getNativeAppRoute(appId: string): string | null {
  return nativeAppRoutes[appId] || null;
}
```

---

### Task 8: Criar Página de App Externo (Sandbox)

**Arquivo:** `apps/web/src/pages/external/ExternalAppPage.tsx`

```tsx
import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSDKHost } from '@/platform/sdk/host';

export default function ExternalAppPage() {
  const { appId } = useParams<{ appId: string }>();
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do app
  const { data: app } = useQuery({
    queryKey: ['external-app', appId],
    queryFn: () => fetchAppDetails(appId!),
    enabled: !!appId,
  });

  // Inicializar SDK host
  const { initialize, cleanup } = useAppSDKHost(iframeRef);

  useEffect(() => {
    if (app && iframeRef.current) {
      initialize(app);
    }
    return cleanup;
  }, [app]);

  // Construir URL do bundle
  const bundleUrl = app?.bundleUrl
    ? resolveIpfsUrl(app.bundleUrl)
    : null;

  const initialPath = location.state?.path || '/';
  const initialParams = location.state?.params;

  if (!app) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Erro ao carregar app</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 bg-background">
      {/* Header do app externo */}
      <div className="h-12 border-b flex items-center justify-between px-4 bg-muted/50">
        <div className="flex items-center gap-3">
          <img
            src={app.iconUrl}
            alt={app.name}
            className="h-6 w-6 rounded"
          />
          <span className="font-medium">{app.name}</span>
          <span className="text-xs text-muted-foreground">
            v{app.version}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Sandbox iframe */}
      {isLoading && (
        <div className="absolute inset-0 top-12 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={bundleUrl + initialPath}
        className="w-full h-[calc(100%-3rem)] border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        onLoad={() => setIsLoading(false)}
        onError={() => setError('Falha ao carregar o app')}
      />
    </div>
  );
}

function resolveIpfsUrl(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return ipfsUrl;
}

async function fetchAppDetails(appId: string) {
  const response = await fetch(`/api/store/apps/${appId}`);
  if (!response.ok) throw new Error('App not found');
  return response.json();
}
```

---

### Task 9: Adicionar Rota para Apps Externos

**Arquivo:** `apps/web/src/App.tsx`

**Adicionar:**

```typescript
import ExternalAppPage from './pages/external/ExternalAppPage';

// Dentro das rotas /app/*
<Route path="external/:appId/*" element={<ExternalAppPage />} />
```

---

## Fluxo de Navegação Visual

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NAVEGAÇÃO BAZARIOS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           APP HEADER                                     │    │
│  │  [Logo] [Hub] [Store] [Wallet] [Chat] [Developer▼] [...] [Profile▼]     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                           MAIN ROUTES                                     │   │
│  ├──────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                           │   │
│  │  /app/hub          ───────────────────────────────────────────────────▶  │   │
│  │                         AppHubPage (Home com apps instalados)            │   │
│  │                              │                                            │   │
│  │                              ├──▶ Click app nativo                       │   │
│  │                              │      └──▶ Rota interna (/app/wallet, etc) │   │
│  │                              │                                            │   │
│  │                              └──▶ Click app externo                      │   │
│  │                                     └──▶ /app/external/:appId (sandbox)  │   │
│  │                                                                           │   │
│  │  /app/store        ───────────────────────────────────────────────────▶  │   │
│  │                         AppStorePage (Descobrir apps)                    │   │
│  │                              │                                            │   │
│  │                              ├──▶ /app/store/:appId (Detalhe)            │   │
│  │                              │      └──▶ Instalar → volta para Hub       │   │
│  │                              │                                            │   │
│  │                              ├──▶ /app/store/categories/:cat             │   │
│  │                              ├──▶ /app/store/search                      │   │
│  │                              └──▶ /app/store/featured                    │   │
│  │                                                                           │   │
│  │  /app/developer    ───────────────────────────────────────────────────▶  │   │
│  │                         DevPortalDashboardPage                           │   │
│  │                              │                                            │   │
│  │                              ├──▶ /app/developer/new                     │   │
│  │                              ├──▶ /app/developer/apps/:id                │   │
│  │                              │      └──▶ /monetization, /analytics       │   │
│  │                              ├──▶ /app/developer/revenue                 │   │
│  │                              ├──▶ /app/developer/docs                    │   │
│  │                              │      └──▶ /docs/:category/:slug           │   │
│  │                              ├──▶ /app/developer/templates               │   │
│  │                              │      └──▶ /templates/:templateId          │   │
│  │                              ├──▶ /app/developer/components              │   │
│  │                              └──▶ /app/developer/support                 │   │
│  │                                                                           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Breadcrumb Examples

```
Home > Developer Portal
Home > Developer Portal > Criar App
Home > Developer Portal > Apps > My Cool App > Monetização
Home > Developer Portal > Documentação > SDK > Primeiros Passos
Home > Developer Portal > Templates > Loyalty Program
Home > Store > Produtividade > Task Manager Pro
Home > External App: My Cool App
```

---

## Mobile Navigation

### Bottom Navigation para Developer Portal

```tsx
// apps/web/src/components/developer/DeveloperMobileNav.tsx

import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, BookOpen, DollarSign } from 'lucide-react';

const mobileNavItems = [
  { href: '/app/developer', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/developer/new', icon: Plus, label: 'Criar' },
  { href: '/app/developer/docs', icon: BookOpen, label: 'Docs' },
  { href: '/app/developer/revenue', icon: DollarSign, label: 'Receita' },
];

export function DeveloperMobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
      <div className="flex justify-around py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

---

## Integração com i18n

### Adicionar traduções

**Arquivo:** `apps/web/src/i18n/pt.json`

```json
{
  "developer": {
    "nav": {
      "dashboard": "Dashboard",
      "newApp": "Criar App",
      "revenue": "Receita",
      "docs": "Documentação",
      "templates": "Templates",
      "components": "Componentes",
      "support": "Suporte"
    },
    "breadcrumb": {
      "home": "Início",
      "developer": "Developer Portal",
      "apps": "Apps",
      "docs": "Documentação",
      "templates": "Templates",
      "monetization": "Monetização",
      "analytics": "Analytics"
    }
  }
}
```

---

## Critérios de Aceite

- [ ] Todas as rotas do Developer Portal navegáveis
- [ ] Breadcrumb funcionando em todas as páginas
- [ ] Sidebar do Developer Portal implementada
- [ ] Deep links funcionando para apps
- [ ] Navegação mobile otimizada
- [ ] Apps externos abrindo no sandbox
- [ ] Transições suaves entre páginas
- [ ] Traduções i18n completas

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `layouts/DeveloperLayout.tsx` | Layout compartilhado do portal |
| `components/developer/DeveloperSidebar.tsx` | Sidebar de navegação |
| `components/developer/DeveloperBreadcrumb.tsx` | Breadcrumb dinâmico |
| `components/developer/DeveloperMobileNav.tsx` | Nav mobile |
| `pages/developer/DocsPage.tsx` | Página de documentação |
| `pages/developer/DocArticlePage.tsx` | Artigo de doc |
| `pages/developer/TemplatesPage.tsx` | Lista de templates |
| `pages/developer/TemplateDetailPage.tsx` | Detalhe do template |
| `pages/developer/ComponentsPage.tsx` | Design system |
| `pages/developer/SupportPage.tsx` | Suporte |
| `pages/developer/AppAnalyticsPage.tsx` | Analytics do app |
| `pages/store/CategoryPage.tsx` | Filtro por categoria |
| `pages/store/SearchAppsPage.tsx` | Busca de apps |
| `pages/store/FeaturedAppsPage.tsx` | Apps em destaque |
| `pages/external/ExternalAppPage.tsx` | Sandbox para apps externos |
| `platform/navigation/deepLinks.ts` | Deep linking |
| `platform/navigation/appNavigation.ts` | Hook de navegação |

---

**Versão:** 1.0.0
**Data:** 2024-12-07
