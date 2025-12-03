# Fase 3: App Store - Interface da Loja de Apps

**Status:** Pendente
**Prioridade:** Alta
**Dependências:** Fase 1 e 2
**Estimativa:** ~18 tasks

---

## Objetivo

Criar a interface completa da App Store onde usuários podem descobrir, buscar, e instalar apps. Inclui também o novo dashboard (AppHub) com os apps instalados.

---

## Resultado Esperado

Ao final desta fase:
- Página AppHub (novo dashboard) com apps instalados
- Página AppStore com listagem e busca
- Página AppDetail com detalhes e instalação
- Componentes reutilizáveis de UI
- Modal de permissões funcionando

---

## Pré-requisitos

- Fase 1 completa (platform foundation)
- Fase 2 completa (app manifests)

---

## Tasks

### Task 3.1: Criar componente AppIcon

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppIcon.tsx`

**Código:**
```typescript
import { cn } from '@/lib/utils';
import * as icons from 'lucide-react';
import type { BazariApp } from '@/platform/types';

interface AppIconProps {
  app: BazariApp;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBackground?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
};

export function AppIcon({
  app,
  size = 'md',
  className,
  showBackground = true,
}: AppIconProps) {
  const IconComponent = icons[app.icon as keyof typeof icons] as React.ComponentType<{
    className?: string;
  }>;

  if (!IconComponent) {
    console.warn(`[AppIcon] Ícone não encontrado: ${app.icon}`);
    return null;
  }

  if (!showBackground) {
    return (
      <IconComponent
        className={cn(iconSizeClasses[size], 'text-current', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center',
        'bg-gradient-to-br',
        app.color,
        sizeClasses[size],
        className
      )}
    >
      <IconComponent className={cn(iconSizeClasses[size], 'text-white')} />
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Ícone renderiza corretamente
- [ ] Suporta diferentes tamanhos
- [ ] Gradiente de cor funciona

---

### Task 3.2: Criar componente AppCard

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppCard.tsx`

**Código:**
```typescript
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AppIcon } from './AppIcon';
import type { BazariApp } from '@/platform/types';

interface AppCardProps {
  app: BazariApp;
  variant?: 'launcher' | 'store' | 'compact';
  onClick?: () => void;
  className?: string;
}

export function AppCard({ app, variant = 'launcher', onClick, className }: AppCardProps) {
  const statusBadge = app.status !== 'stable' && (
    <Badge
      variant={app.status === 'beta' ? 'secondary' : 'outline'}
      className="text-xs"
    >
      {app.status.toUpperCase()}
    </Badge>
  );

  // Variante Launcher (para dashboard)
  if (variant === 'launcher') {
    return (
      <Link
        to={app.entryPoint}
        onClick={onClick}
        className={cn(
          'flex flex-col items-center p-4 rounded-xl',
          'bg-gradient-to-br transition-all duration-200',
          'hover:scale-105 hover:shadow-lg active:scale-95',
          app.color,
          className
        )}
      >
        <AppIcon app={app} size="lg" showBackground={false} />
        <span className="text-white font-medium text-sm mt-2 text-center">
          {app.name}
        </span>
        {statusBadge && <div className="mt-1">{statusBadge}</div>}
      </Link>
    );
  }

  // Variante Store (para listagem na loja)
  if (variant === 'store') {
    return (
      <Link
        to={`/app/store/${app.id}`}
        onClick={onClick}
        className={cn(
          'flex items-start gap-4 p-4 rounded-xl',
          'bg-card border hover:bg-accent/50',
          'transition-colors duration-200',
          className
        )}
      >
        <AppIcon app={app} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{app.name}</h3>
            {statusBadge}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {app.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground capitalize">
              {app.category}
            </span>
            {app.rating && (
              <span className="text-xs text-muted-foreground">
                ⭐ {app.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Variante Compact (para listas pequenas)
  return (
    <Link
      to={app.entryPoint}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        'hover:bg-accent/50 transition-colors',
        className
      )}
    >
      <AppIcon app={app} size="sm" />
      <span className="font-medium text-sm">{app.name}</span>
      {statusBadge}
    </Link>
  );
}
```

**Critérios de Aceite:**
- [ ] 3 variantes funcionando
- [ ] Links navegando corretamente
- [ ] Badges de status

---

### Task 3.3: Criar componente AppLauncher (Grid)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppLauncher.tsx`

**Código:**
```typescript
import { cn } from '@/lib/utils';
import { AppCard } from './AppCard';
import type { BazariApp } from '@/platform/types';

interface AppLauncherProps {
  apps: BazariApp[];
  columns?: 2 | 3 | 4;
  variant?: 'launcher' | 'store' | 'compact';
  emptyMessage?: string;
  className?: string;
  onAppClick?: (app: BazariApp) => void;
}

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
};

export function AppLauncher({
  apps,
  columns = 3,
  variant = 'launcher',
  emptyMessage = 'Nenhum app encontrado',
  className,
  onAppClick,
}: AppLauncherProps) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const gridClass = variant === 'store' ? 'flex flex-col gap-2' : `grid gap-4 ${columnClasses[columns]}`;

  return (
    <div className={cn(gridClass, className)}>
      {apps.map((app) => (
        <AppCard
          key={app.id}
          app={app}
          variant={variant}
          onClick={() => onAppClick?.(app)}
        />
      ))}
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Grid responsivo
- [ ] Estado vazio
- [ ] Callback de click

---

### Task 3.4: Criar componente PermissionList

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/PermissionList.tsx`

**Código:**
```typescript
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import * as icons from 'lucide-react';
import type { PermissionDefinition, PermissionRisk } from '@/platform/types';

interface PermissionListProps {
  permissions: PermissionDefinition[];
  selectable?: boolean;
  selected?: string[];
  onSelect?: (permissionIds: string[]) => void;
  showRisk?: boolean;
  className?: string;
}

const riskColors: Record<PermissionRisk, string> = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

const riskLabels: Record<PermissionRisk, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

export function PermissionList({
  permissions,
  selectable = false,
  selected = [],
  onSelect,
  showRisk = true,
  className,
}: PermissionListProps) {
  const handleToggle = (permissionId: string) => {
    if (!onSelect) return;

    const newSelected = selected.includes(permissionId)
      ? selected.filter((id) => id !== permissionId)
      : [...selected, permissionId];

    onSelect(newSelected);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {permissions.map((permission) => {
        const IconComponent = icons[permission.icon as keyof typeof icons] as React.ComponentType<{
          className?: string;
        }>;
        const isSelected = selected.includes(permission.id);

        return (
          <div
            key={permission.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              selectable && 'cursor-pointer hover:bg-accent/50',
              isSelected && 'border-primary bg-primary/5'
            )}
            onClick={() => selectable && handleToggle(permission.id)}
          >
            {selectable && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggle(permission.id)}
                className="mt-0.5"
              />
            )}

            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                riskColors[permission.risk]
              )}
            >
              {IconComponent && <IconComponent className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{permission.name}</span>
                {showRisk && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      riskColors[permission.risk]
                    )}
                  >
                    {riskLabels[permission.risk]}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permission.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Lista de permissões renderiza
- [ ] Modo selecionável funciona
- [ ] Cores de risco corretas

---

### Task 3.5: Criar componente AppInstallModal

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppInstallModal.tsx`

**Código:**
```typescript
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppIcon } from './AppIcon';
import { PermissionList } from './PermissionList';
import { groupPermissionsByRisk, PERMISSIONS_CATALOG } from '@/platform/types';
import type { BazariApp, PermissionId, PermissionDefinition } from '@/platform/types';

interface AppInstallModalProps {
  app: BazariApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (grantedPermissions: PermissionId[]) => void;
  isProcessing?: boolean;
}

export function AppInstallModal({
  app,
  open,
  onOpenChange,
  onConfirm,
  isProcessing = false,
}: AppInstallModalProps) {
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);

  const { requiredPermissions, optionalPermissions } = useMemo(() => {
    const required: PermissionDefinition[] = [];
    const optional: PermissionDefinition[] = [];

    for (const perm of app.permissions) {
      const def = PERMISSIONS_CATALOG[perm.id as PermissionId];
      if (def) {
        if (perm.optional) {
          optional.push(def);
        } else {
          required.push(def);
        }
      }
    }

    return { requiredPermissions: required, optionalPermissions: optional };
  }, [app.permissions]);

  const handleConfirm = () => {
    const allGranted = [
      ...requiredPermissions.map((p) => p.id),
      ...selectedOptional,
    ] as PermissionId[];
    onConfirm(allGranted);
  };

  const hasHighRisk = [...requiredPermissions, ...optionalPermissions.filter(
    p => selectedOptional.includes(p.id)
  )].some((p) => p.risk === 'high' || p.risk === 'critical');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AppIcon app={app} size="lg" />
            <div>
              <DialogTitle>Instalar {app.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {app.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {requiredPermissions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Permissões necessárias
              </h4>
              <PermissionList permissions={requiredPermissions} />
            </div>
          )}

          {optionalPermissions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Permissões opcionais
              </h4>
              <PermissionList
                permissions={optionalPermissions}
                selectable
                selected={selectedOptional}
                onSelect={setSelectedOptional}
              />
            </div>
          )}

          {hasHighRisk && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                ⚠️ Este app solicita permissões sensíveis. Certifique-se de
                confiar no desenvolvedor.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'Instalando...' : 'Instalar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Critérios de Aceite:**
- [ ] Modal abre/fecha
- [ ] Permissões obrigatórias listadas
- [ ] Opcionais selecionáveis
- [ ] Aviso de risco alto

---

### Task 3.6: Criar componente AppCategoryTabs

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppCategoryTabs.tsx`

**Código:**
```typescript
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AppCategory } from '@/platform/types';

interface AppCategoryTabsProps {
  selected: AppCategory | 'all';
  onChange: (category: AppCategory | 'all') => void;
  counts?: Record<AppCategory | 'all', number>;
  className?: string;
}

const categories: { id: AppCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos', icon: '📱' },
  { id: 'finance', label: 'Finanças', icon: '💰' },
  { id: 'social', label: 'Social', icon: '💬' },
  { id: 'commerce', label: 'Comércio', icon: '🛒' },
  { id: 'tools', label: 'Ferramentas', icon: '🛠️' },
  { id: 'governance', label: 'Governança', icon: '🗳️' },
  { id: 'entertainment', label: 'Entretenimento', icon: '🎮' },
];

export function AppCategoryTabs({
  selected,
  onChange,
  counts,
  className,
}: AppCategoryTabsProps) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 scrollbar-hide',
        className
      )}
    >
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selected === cat.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(cat.id)}
          className="whitespace-nowrap"
        >
          <span className="mr-1">{cat.icon}</span>
          {cat.label}
          {counts && counts[cat.id] !== undefined && (
            <span className="ml-1 text-xs opacity-70">({counts[cat.id]})</span>
          )}
        </Button>
      ))}
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Tabs renderizam
- [ ] Seleção funciona
- [ ] Contagem opcional

---

### Task 3.7: Criar componente AppSearch

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppSearch.tsx`

**Código:**
```typescript
import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AppSearch({
  value,
  onChange,
  placeholder = 'Buscar apps...',
  className,
}: AppSearchProps) {
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Input de busca funciona
- [ ] Botão de limpar aparece quando tem valor

---

### Task 3.8: Criar index dos componentes platform

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/index.ts`

**Código:**
```typescript
export { AppIcon } from './AppIcon';
export { AppCard } from './AppCard';
export { AppLauncher } from './AppLauncher';
export { PermissionList } from './PermissionList';
export { AppInstallModal } from './AppInstallModal';
export { AppCategoryTabs } from './AppCategoryTabs';
export { AppSearch } from './AppSearch';
```

**Critérios de Aceite:**
- [ ] Todos os componentes exportados

---

### Task 3.9: Criar página AppHubPage (novo dashboard)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/AppHubPage.tsx`

**Código:**
```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLauncher, AppSearch } from '@/components/platform';
import { useInstalledApps } from '@/platform/hooks';
import { useUserAppsStore } from '@/platform/store';

export default function AppHubPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { apps, pinnedApps, unpinnedApps, count } = useInstalledApps();
  const { recordAppUsage } = useUserAppsStore();

  // Filtrar por busca
  const filteredApps = searchQuery
    ? apps.filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleAppClick = (appId: string) => {
    recordAppUsage(appId);
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Apps</h1>
          <p className="text-muted-foreground text-sm">
            {count} apps instalados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/app/settings/apps">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link to="/app/store">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <AppSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar nos seus apps..."
        className="mb-6"
      />

      {/* Search Results */}
      {filteredApps ? (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Resultados ({filteredApps.length})
          </h2>
          <AppLauncher
            apps={filteredApps}
            columns={3}
            emptyMessage="Nenhum app encontrado"
            onAppClick={(app) => handleAppClick(app.id)}
          />
        </div>
      ) : (
        <>
          {/* Pinned Apps */}
          {pinnedApps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">📌 Fixados</h2>
              <AppLauncher
                apps={pinnedApps}
                columns={3}
                onAppClick={(app) => handleAppClick(app.id)}
              />
            </div>
          )}

          {/* All Apps */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              {pinnedApps.length > 0 ? 'Todos os Apps' : 'Apps'}
            </h2>
            <AppLauncher
              apps={unpinnedApps.length > 0 ? unpinnedApps : apps}
              columns={3}
              emptyMessage="Nenhum app instalado. Adicione apps na loja!"
              onAppClick={(app) => handleAppClick(app.id)}
            />
          </div>
        </>
      )}

      {/* Empty State */}
      {count === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-xl font-semibold mb-2">Nenhum app instalado</h3>
          <p className="text-muted-foreground mb-4">
            Explore a App Store e instale os apps que você precisa.
          </p>
          <Button asChild>
            <Link to="/app/store">Explorar App Store</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Lista apps instalados
- [ ] Busca funciona
- [ ] Pinned separados
- [ ] Estado vazio

---

### Task 3.10: Criar página AppStorePage

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/AppStorePage.tsx`

**Código:**
```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AppLauncher,
  AppSearch,
  AppCategoryTabs,
  AppInstallModal,
} from '@/components/platform';
import { useApps, useAppInstall } from '@/platform/hooks';
import type { AppCategory, BazariApp } from '@/platform/types';

export default function AppStorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AppCategory | 'all'>('all');
  const [selectedApp, setSelectedApp] = useState<BazariApp | null>(null);

  const { apps: allApps, countByCategory } = useApps({
    installed: false, // Apenas não instalados
  });

  const { apps: featuredApps } = useApps({
    featured: true,
    installed: false,
  });

  // Filtrar apps
  const filteredApps = allApps.filter((app) => {
    const matchesCategory =
      selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const {
    isInstalled,
    showPermissionModal,
    closePermissionModal,
    confirmInstall,
    isProcessing,
  } = useAppInstall(selectedApp?.id || '');

  const handleAppClick = (app: BazariApp) => {
    setSelectedApp(app);
  };

  const handleInstallClick = (app: BazariApp) => {
    setSelectedApp(app);
    // O modal abrirá automaticamente via useAppInstall
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">App Store</h1>
          <p className="text-muted-foreground text-sm">
            Descubra novos apps para o seu Bazari
          </p>
        </div>
      </div>

      {/* Search */}
      <AppSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar apps..."
        className="mb-4"
      />

      {/* Categories */}
      <AppCategoryTabs
        selected={selectedCategory}
        onChange={setSelectedCategory}
        counts={{
          all: allApps.length,
          ...countByCategory,
        }}
        className="mb-6"
      />

      {/* Featured Section (only when no search/filter) */}
      {!searchQuery && selectedCategory === 'all' && featuredApps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">⭐ Em Destaque</h2>
          <AppLauncher
            apps={featuredApps}
            variant="store"
            onAppClick={handleAppClick}
          />
        </div>
      )}

      {/* All Apps */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {searchQuery
            ? `Resultados (${filteredApps.length})`
            : selectedCategory === 'all'
            ? 'Todos os Apps'
            : `${selectedCategory} (${filteredApps.length})`}
        </h2>
        <AppLauncher
          apps={filteredApps}
          variant="store"
          emptyMessage="Nenhum app encontrado nesta categoria"
          onAppClick={handleAppClick}
        />
      </div>

      {/* Install Modal */}
      {selectedApp && (
        <AppInstallModal
          app={selectedApp}
          open={showPermissionModal || !!selectedApp}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedApp(null);
              closePermissionModal();
            }
          }}
          onConfirm={(permissions) => {
            confirmInstall(permissions);
            setSelectedApp(null);
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Lista apps não instalados
- [ ] Filtro por categoria
- [ ] Busca funciona
- [ ] Seção de destaque
- [ ] Modal de instalação

---

### Task 3.11: Criar página AppDetailPage

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/AppDetailPage.tsx`

**Código:**
```typescript
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Star, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppIcon, PermissionList, AppInstallModal } from '@/components/platform';
import { appRegistry } from '@/platform/registry';
import { useAppInstall, useAppPermissions } from '@/platform/hooks';
import { PERMISSIONS_CATALOG } from '@/platform/types';
import type { PermissionId, PermissionDefinition } from '@/platform/types';

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();

  const app = appRegistry.get(appId || '');

  const {
    isInstalled,
    install,
    uninstall,
    showPermissionModal,
    closePermissionModal,
    confirmInstall,
    isProcessing,
  } = useAppInstall(appId || '');

  const { requiredPermissions, optionalPermissions } = useAppPermissions(appId || '');

  if (!app) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">App não encontrado</h1>
        <Button asChild>
          <Link to="/app/store">Voltar para App Store</Link>
        </Button>
      </div>
    );
  }

  const allPermissions: PermissionDefinition[] = [
    ...requiredPermissions,
    ...optionalPermissions,
  ];

  const handleUninstall = async () => {
    await uninstall();
    navigate('/app');
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/store">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
      </div>

      {/* App Info */}
      <div className="flex items-start gap-6 mb-8">
        <AppIcon app={app} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{app.name}</h1>
            {app.status !== 'stable' && (
              <Badge variant="secondary">{app.status.toUpperCase()}</Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-3">{app.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">{app.category}</span>
            {app.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {app.rating.toFixed(1)}
              </span>
            )}
            {app.installCount && (
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {app.installCount.toLocaleString()}
              </span>
            )}
            <span>v{app.version}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex gap-3 mb-8">
        {isInstalled ? (
          <>
            <Button asChild className="flex-1">
              <Link to={app.entryPoint}>Abrir App</Link>
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleUninstall}
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button onClick={install} disabled={isProcessing} className="flex-1">
            {isProcessing ? 'Instalando...' : 'Instalar'}
          </Button>
        )}
      </div>

      <Separator className="mb-8" />

      {/* Long Description */}
      {app.longDescription && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Sobre</h2>
          <p className="text-muted-foreground whitespace-pre-line">
            {app.longDescription}
          </p>
        </div>
      )}

      {/* Screenshots */}
      {app.screenshots && app.screenshots.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Screenshots</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {app.screenshots.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`Screenshot ${idx + 1}`}
                className="w-64 h-auto rounded-lg border"
              />
            ))}
          </div>
        </div>
      )}

      {/* Permissions */}
      {allPermissions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Permissões</h2>
          <PermissionList permissions={allPermissions} />
        </div>
      )}

      {/* Tags */}
      {app.tags.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {app.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Install Modal */}
      <AppInstallModal
        app={app}
        open={showPermissionModal}
        onOpenChange={(open) => !open && closePermissionModal()}
        onConfirm={confirmInstall}
        isProcessing={isProcessing}
      />
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Mostra detalhes do app
- [ ] Botão instalar/abrir/desinstalar
- [ ] Lista permissões
- [ ] Screenshots se houver

---

### Task 3.12: Adicionar rotas das novas páginas

**Prioridade:** Alta
**Tipo:** modificar

**Arquivo:** `apps/web/src/App.tsx`

**Modificação:**
Adicionar as novas rotas no Router:

```typescript
// Imports
import AppHubPage from '@/pages/AppHubPage';
import AppStorePage from '@/pages/AppStorePage';
import AppDetailPage from '@/pages/AppDetailPage';

// Dentro das Routes, adicionar:
<Route path="/app" element={<AppHubPage />} />
<Route path="/app/store" element={<AppStorePage />} />
<Route path="/app/store/:appId" element={<AppDetailPage />} />
```

**Critérios de Aceite:**
- [ ] Rotas funcionando
- [ ] Navegação correta

---

### Task 3.13: Atualizar DashboardPage para redirecionar

**Prioridade:** Média
**Tipo:** modificar

**Arquivo:** `apps/web/src/pages/DashboardPage.tsx`

**Descrição:**
Temporariamente, fazer DashboardPage redirecionar para AppHubPage ou manter ambos funcionando em paralelo durante a transição.

**Opção 1 - Redirect:**
```typescript
import { Navigate } from 'react-router-dom';

export default function DashboardPage() {
  return <Navigate to="/app" replace />;
}
```

**Opção 2 - Manter ambos:**
Não modificar DashboardPage, deixar usuários acessarem ambas versões durante transição.

**Critérios de Aceite:**
- [ ] Decisão tomada sobre redirect ou coexistência
- [ ] Implementação correspondente

---

### Task 3.14: Criar componente EmptyState para apps

**Prioridade:** Baixa
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppEmptyState.tsx`

**Código:**
```typescript
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AppEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: string;
}

export function AppEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon = '📱',
}: AppEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild>
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Componente reutilizável
- [ ] Ação opcional

---

### Task 3.15: Criar componente AppInstalledBadge

**Prioridade:** Baixa
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppInstalledBadge.tsx`

**Código:**
```typescript
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppInstalledBadgeProps {
  className?: string;
}

export function AppInstalledBadge({ className }: AppInstalledBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-green-100 text-green-700 text-xs font-medium',
        className
      )}
    >
      <Check className="w-3 h-3" />
      Instalado
    </div>
  );
}
```

**Critérios de Aceite:**
- [ ] Badge indicando app instalado

---

### Task 3.16: Atualizar index dos componentes

**Prioridade:** Média
**Tipo:** modificar

**Arquivo:** `apps/web/src/components/platform/index.ts`

**Código:**
```typescript
export { AppIcon } from './AppIcon';
export { AppCard } from './AppCard';
export { AppLauncher } from './AppLauncher';
export { PermissionList } from './PermissionList';
export { AppInstallModal } from './AppInstallModal';
export { AppCategoryTabs } from './AppCategoryTabs';
export { AppSearch } from './AppSearch';
export { AppEmptyState } from './AppEmptyState';
export { AppInstalledBadge } from './AppInstalledBadge';
```

**Critérios de Aceite:**
- [ ] Todos os componentes exportados

---

### Task 3.17: Adicionar tradução de categorias (i18n)

**Prioridade:** Baixa
**Tipo:** modificar

**Arquivos:**
- `apps/web/src/i18n/pt.json`
- `apps/web/src/i18n/en.json`
- `apps/web/src/i18n/es.json`

**Adicionar em cada arquivo:**
```json
{
  "appStore": {
    "title": "App Store",
    "subtitle": "Descubra novos apps para o seu Bazari",
    "search": "Buscar apps...",
    "categories": {
      "all": "Todos",
      "finance": "Finanças",
      "social": "Social",
      "commerce": "Comércio",
      "tools": "Ferramentas",
      "governance": "Governança",
      "entertainment": "Entretenimento"
    },
    "featured": "Em Destaque",
    "install": "Instalar",
    "installed": "Instalado",
    "open": "Abrir",
    "uninstall": "Desinstalar",
    "permissions": "Permissões",
    "requiredPermissions": "Permissões necessárias",
    "optionalPermissions": "Permissões opcionais"
  }
}
```

**Critérios de Aceite:**
- [ ] Traduções em pt, en, es

---

### Task 3.18: Testar fluxo completo

**Prioridade:** Alta
**Tipo:** teste

**Descrição:**
Testar manualmente todo o fluxo:

1. Acessar `/app` (AppHub)
2. Ver apps instalados
3. Clicar em "Adicionar"
4. Navegar para App Store
5. Filtrar por categoria
6. Buscar um app
7. Clicar em um app para ver detalhes
8. Instalar app (verificar modal de permissões)
9. Voltar para AppHub
10. Ver novo app instalado
11. Desinstalar app

**Critérios de Aceite:**
- [ ] Todos os fluxos funcionando
- [ ] Sem erros no console
- [ ] UI responsiva

---

## Arquivos a Criar (Resumo)

| Arquivo | Tipo |
|---------|------|
| `apps/web/src/components/platform/AppIcon.tsx` | criar |
| `apps/web/src/components/platform/AppCard.tsx` | criar |
| `apps/web/src/components/platform/AppLauncher.tsx` | criar |
| `apps/web/src/components/platform/PermissionList.tsx` | criar |
| `apps/web/src/components/platform/AppInstallModal.tsx` | criar |
| `apps/web/src/components/platform/AppCategoryTabs.tsx` | criar |
| `apps/web/src/components/platform/AppSearch.tsx` | criar |
| `apps/web/src/components/platform/AppEmptyState.tsx` | criar |
| `apps/web/src/components/platform/AppInstalledBadge.tsx` | criar |
| `apps/web/src/components/platform/index.ts` | criar |
| `apps/web/src/pages/AppHubPage.tsx` | criar |
| `apps/web/src/pages/AppStorePage.tsx` | criar |
| `apps/web/src/pages/AppDetailPage.tsx` | criar |

**Total:** 13 arquivos novos

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `apps/web/src/App.tsx` | Adicionar rotas |
| `apps/web/src/pages/DashboardPage.tsx` | Redirect ou coexistência |
| `apps/web/src/i18n/pt.json` | Traduções |
| `apps/web/src/i18n/en.json` | Traduções |
| `apps/web/src/i18n/es.json` | Traduções |

---

## Validação da Fase

### Checklist Final

- [ ] AppHubPage renderiza apps instalados
- [ ] AppStorePage lista apps disponíveis
- [ ] Filtro por categoria funciona
- [ ] Busca funciona
- [ ] Modal de permissões abre na instalação
- [ ] Instalação adiciona app ao store
- [ ] Desinstalação remove app
- [ ] Navegação entre páginas funcionando
- [ ] UI responsiva em mobile

---

## Próxima Fase

Após completar esta fase, prossiga para:
**[PHASE-04-SDK.md](./PHASE-04-SDK.md)** - SDK para Desenvolvedores Terceiros

---

**Documento:** PHASE-03-APP-STORE.md
**Versão:** 1.0.0
**Data:** 2024-12-03
