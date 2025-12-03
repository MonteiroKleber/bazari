# Platform UI Components

**Versão:** 1.0.0
**Data:** 2024-12-03

---

## Visão Geral

Componentes de UI específicos da plataforma BazariOS para gerenciamento de apps.

---

## Componentes da Plataforma

### 1. AppIcon

Exibe o ícone de um app com gradiente e estado.

```typescript
// platform/components/AppIcon.tsx

import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppIconProps {
  icon: string;                    // Nome do ícone Lucide
  color?: string;                  // Gradiente (from-X-500 to-X-600)
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  installed?: boolean;             // Mostra checkmark se instalado
  badge?: number;                  // Contador de notificações
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

const iconSizes = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
};

export function AppIcon({
  icon,
  color = 'from-gray-500 to-gray-600',
  size = 'md',
  className,
  installed,
  badge,
}: AppIconProps) {
  const IconComponent = (Icons as Record<string, LucideIcon>)[icon] || Icons.Box;

  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-2xl flex items-center justify-center',
          `bg-gradient-to-br ${color}`,
          sizeClasses[size],
          className
        )}
      >
        <IconComponent
          size={iconSizes[size]}
          className="text-white"
        />
      </div>

      {/* Badge de instalado */}
      {installed && (
        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
          <Icons.Check size={12} className="text-white" />
        </div>
      )}

      {/* Badge de notificação */}
      {badge && badge > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge > 99 ? '99+' : badge}
        </div>
      )}
    </div>
  );
}
```

**Uso:**

```tsx
<AppIcon icon="Wallet" color="from-purple-500 to-purple-600" size="lg" />
<AppIcon icon="MessageCircle" installed badge={5} />
```

---

### 2. AppCard

Card de apresentação de um app para grid/lista.

```typescript
// platform/components/AppCard.tsx

import { Link } from 'react-router-dom';
import { Star, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppIcon } from './AppIcon';
import type { BazariApp } from '@/platform/types';

interface AppCardProps {
  app: BazariApp;
  installed?: boolean;
  onClick?: () => void;
  variant?: 'grid' | 'list';
}

export function AppCard({
  app,
  installed,
  onClick,
  variant = 'grid',
}: AppCardProps) {
  const content = (
    <>
      <AppIcon
        icon={app.icon}
        color={app.color}
        size={variant === 'grid' ? 'lg' : 'md'}
        installed={installed}
      />

      <div className={variant === 'grid' ? 'text-center mt-3' : 'ml-4 flex-1'}>
        <h3 className="font-semibold truncate">{app.name}</h3>
        <p className="text-sm text-muted-foreground truncate">
          {app.description}
        </p>

        {variant === 'list' && (
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {app.rating && (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                {app.rating.toFixed(1)}
              </span>
            )}
            {app.installCount && (
              <span className="flex items-center gap-1">
                <Download size={12} />
                {formatNumber(app.installCount)}
              </span>
            )}
          </div>
        )}
      </div>

      {app.featured && (
        <Badge variant="secondary" className="absolute top-2 right-2">
          Destaque
        </Badge>
      )}

      {app.status === 'beta' && (
        <Badge variant="outline" className="absolute top-2 left-2">
          Beta
        </Badge>
      )}
    </>
  );

  const cardClasses = variant === 'grid'
    ? 'p-4 flex flex-col items-center cursor-pointer hover:bg-accent/50 transition-colors relative'
    : 'p-4 flex items-center cursor-pointer hover:bg-accent/50 transition-colors relative';

  if (onClick) {
    return (
      <Card className={cardClasses} onClick={onClick}>
        {content}
      </Card>
    );
  }

  return (
    <Link to={`/app/store/${app.slug}`}>
      <Card className={cardClasses}>
        {content}
      </Card>
    </Link>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
```

**Uso:**

```tsx
<AppCard app={walletApp} installed />
<AppCard app={chatApp} variant="list" onClick={() => openDetail(chatApp)} />
```

---

### 3. AppLauncher

Grid de apps instalados para o dashboard.

```typescript
// platform/components/AppLauncher.tsx

import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { useInstalledApps } from '@/platform/hooks/useInstalledApps';
import { cn } from '@/lib/utils';

interface AppLauncherProps {
  maxApps?: number;
  showAddButton?: boolean;
  className?: string;
}

export function AppLauncher({
  maxApps = 12,
  showAddButton = true,
  className,
}: AppLauncherProps) {
  const { apps, isLoading } = useInstalledApps();

  const displayApps = apps.slice(0, showAddButton ? maxApps - 1 : maxApps);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-4 gap-4', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-muted animate-pulse" />
            <div className="w-12 h-3 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-4 gap-4', className)}>
      {displayApps.map((app) => (
        <Link
          key={app.id}
          to={app.entryPoint}
          className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-accent/50 transition-colors"
        >
          <AppIcon icon={app.icon} color={app.color} size="lg" />
          <span className="text-xs font-medium truncate max-w-full">
            {app.name}
          </span>
        </Link>
      ))}

      {showAddButton && (
        <Link
          to="/app/store"
          className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-accent/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Mais
          </span>
        </Link>
      )}
    </div>
  );
}
```

**Uso:**

```tsx
<AppLauncher maxApps={8} />
<AppLauncher showAddButton={false} className="grid-cols-6" />
```

---

### 4. PermissionList

Lista de permissões solicitadas por um app.

```typescript
// platform/components/PermissionList.tsx

import {
  User,
  Wallet,
  MessageCircle,
  Database,
  Bell,
  Camera,
  MapPin,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppPermissionRequest } from '@/platform/types';

interface PermissionListProps {
  permissions: AppPermissionRequest[];
  showReasons?: boolean;
  className?: string;
}

const permissionIcons: Record<string, React.ElementType> = {
  'user.': User,
  'wallet.': Wallet,
  'chat.': MessageCircle,
  'storage.': Database,
  'notifications.': Bell,
  'camera.': Camera,
  'location.': MapPin,
};

const riskLevels: Record<string, { color: string; icon: React.ElementType }> = {
  low: { color: 'text-green-600', icon: Shield },
  medium: { color: 'text-yellow-600', icon: Shield },
  high: { color: 'text-red-600', icon: AlertTriangle },
};

function getPermissionIcon(permissionId: string): React.ElementType {
  for (const [prefix, icon] of Object.entries(permissionIcons)) {
    if (permissionId.startsWith(prefix)) return icon;
  }
  return Shield;
}

function getRiskLevel(permissionId: string): 'low' | 'medium' | 'high' {
  if (permissionId.includes('write') || permissionId.includes('send')) {
    return 'high';
  }
  if (permissionId.includes('create') || permissionId.includes('delete')) {
    return 'medium';
  }
  return 'low';
}

export function PermissionList({
  permissions,
  showReasons = true,
  className,
}: PermissionListProps) {
  if (permissions.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Este app não requer permissões especiais.
      </div>
    );
  }

  return (
    <ul className={cn('space-y-3', className)}>
      {permissions.map((permission) => {
        const Icon = getPermissionIcon(permission.id);
        const risk = getRiskLevel(permission.id);
        const RiskIcon = riskLevels[risk].icon;

        return (
          <li key={permission.id} className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg bg-muted', riskLevels[risk].color)}>
              <Icon size={16} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {formatPermissionName(permission.id)}
                </span>
                {risk !== 'low' && (
                  <RiskIcon size={14} className={riskLevels[risk].color} />
                )}
              </div>

              {showReasons && permission.reason && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {permission.reason}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatPermissionName(id: string): string {
  const names: Record<string, string> = {
    'user.profile.read': 'Ler seu perfil',
    'user.profile.write': 'Editar seu perfil',
    'wallet.balance.read': 'Ver seu saldo',
    'wallet.transactions.read': 'Ver suas transações',
    'wallet.send': 'Enviar tokens',
    'chat.messages.read': 'Ler suas mensagens',
    'chat.messages.send': 'Enviar mensagens',
    'storage.read': 'Acessar armazenamento',
    'storage.write': 'Salvar dados',
    'notifications.send': 'Enviar notificações',
    'camera.access': 'Acessar câmera',
    'location.read': 'Ver sua localização',
  };

  return names[id] || id.replace(/\./g, ' ').replace(/_/g, ' ');
}
```

**Uso:**

```tsx
<PermissionList permissions={app.permissions} />
<PermissionList permissions={app.permissions} showReasons={false} />
```

---

### 5. AppInstallModal

Modal de confirmação de instalação com permissões.

```typescript
// platform/components/AppInstallModal.tsx

import { useState } from 'react';
import { Download, Shield, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppIcon } from './AppIcon';
import { PermissionList } from './PermissionList';
import { useAppInstall } from '@/platform/hooks/useAppInstall';
import type { BazariApp } from '@/platform/types';

interface AppInstallModalProps {
  app: BazariApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AppInstallModal({
  app,
  open,
  onOpenChange,
  onSuccess,
}: AppInstallModalProps) {
  const [step, setStep] = useState<'info' | 'permissions' | 'installing'>('info');
  const { install, isInstalling } = useAppInstall();

  const hasPermissions = app.permissions && app.permissions.length > 0;

  const handleInstall = async () => {
    if (hasPermissions && step === 'info') {
      setStep('permissions');
      return;
    }

    setStep('installing');

    try {
      await install(app.id);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to install app:', error);
      setStep('info');
    }
  };

  const handleClose = () => {
    setStep('info');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <AppIcon icon={app.icon} color={app.color} size="lg" />
            <div>
              <DialogTitle>{app.name}</DialogTitle>
              <DialogDescription className="mt-1">
                v{app.version} • {app.category}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'info' && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {app.longDescription || app.description}
            </p>

            {app.installCount !== undefined && (
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download size={14} />
                  {app.installCount.toLocaleString()} instalações
                </span>
                {app.rating && (
                  <span>⭐ {app.rating.toFixed(1)}</span>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'permissions' && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" />
              <h4 className="font-semibold">Permissões Solicitadas</h4>
            </div>

            <PermissionList permissions={app.permissions || []} />

            <p className="text-xs text-muted-foreground mt-4">
              Ao instalar, você concede ao app acesso a estas funcionalidades.
              Você pode revogar permissões a qualquer momento nas configurações.
            </p>
          </div>
        )}

        {step === 'installing' && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">
              Instalando {app.name}...
            </p>
          </div>
        )}

        <DialogFooter>
          {step !== 'installing' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleInstall} disabled={isInstalling}>
                {step === 'info' && hasPermissions
                  ? 'Ver Permissões'
                  : 'Instalar'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Uso:**

```tsx
<AppInstallModal
  app={selectedApp}
  open={isModalOpen}
  onOpenChange={setIsModalOpen}
  onSuccess={() => toast.success('App instalado!')}
/>
```

---

### 6. CategoryFilter

Filtro de categorias para App Store.

```typescript
// platform/components/CategoryFilter.tsx

import { cn } from '@/lib/utils';
import type { AppCategory } from '@/platform/types';

interface CategoryFilterProps {
  selected: AppCategory | 'all';
  onChange: (category: AppCategory | 'all') => void;
  counts?: Record<AppCategory | 'all', number>;
  className?: string;
}

const categories: { id: AppCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'Todos', emoji: '🏠' },
  { id: 'finance', label: 'Finanças', emoji: '💰' },
  { id: 'social', label: 'Social', emoji: '👥' },
  { id: 'commerce', label: 'Comércio', emoji: '🛒' },
  { id: 'entertainment', label: 'Entretenimento', emoji: '🎮' },
  { id: 'tools', label: 'Ferramentas', emoji: '🔧' },
  { id: 'governance', label: 'Governança', emoji: '🏛️' },
];

export function CategoryFilter({
  selected,
  onChange,
  counts,
  className,
}: CategoryFilterProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2', className)}>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            selected === cat.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
          {counts && counts[cat.id] !== undefined && (
            <span className="text-xs opacity-70">({counts[cat.id]})</span>
          )}
        </button>
      ))}
    </div>
  );
}
```

**Uso:**

```tsx
<CategoryFilter
  selected={selectedCategory}
  onChange={setSelectedCategory}
  counts={{ all: 50, finance: 5, social: 12, ... }}
/>
```

---

### 7. AppSearch

Campo de busca de apps com sugestões.

```typescript
// platform/components/AppSearch.tsx

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AppIcon } from './AppIcon';
import { useApps } from '@/platform/hooks/useApps';
import { cn } from '@/lib/utils';

interface AppSearchProps {
  onSelect?: (appId: string) => void;
  placeholder?: string;
  className?: string;
}

export function AppSearch({
  onSelect,
  placeholder = 'Buscar apps...',
  className,
}: AppSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { apps } = useApps();
  const ref = useRef<HTMLDivElement>(null);

  // Filtrar apps baseado na query
  const filteredApps = query.length > 1
    ? apps.filter(
        (app) =>
          app.name.toLowerCase().includes(query.toLowerCase()) ||
          app.description.toLowerCase().includes(query.toLowerCase()) ||
          app.tags.some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase())
          )
      )
    : [];

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (appId: string) => {
    onSelect?.(appId);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {open && filteredApps.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 max-h-[300px] overflow-auto">
          {filteredApps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleSelect(app.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
            >
              <AppIcon icon={app.icon} color={app.color} size="sm" />
              <div>
                <p className="font-medium text-sm">{app.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {app.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Nenhum resultado */}
      {open && query.length > 1 && filteredApps.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          Nenhum app encontrado para "{query}"
        </div>
      )}
    </div>
  );
}
```

**Uso:**

```tsx
<AppSearch onSelect={(appId) => navigate(`/app/store/${appId}`)} />
```

---

## Resumo de Componentes

| Componente | Propósito | Usado em |
|------------|-----------|----------|
| AppIcon | Ícone do app | Todos |
| AppCard | Card de app | Store, Hub |
| AppLauncher | Grid de apps | Dashboard |
| PermissionList | Lista de permissões | Modal, Detalhes |
| AppInstallModal | Confirmação de instalação | Store |
| CategoryFilter | Filtro de categoria | Store |
| AppSearch | Busca de apps | Header, Store |

---

**Documento:** UI-COMPONENTS.md
**Versão:** 1.0.0
