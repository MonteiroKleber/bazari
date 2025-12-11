# P2: Design System para Desenvolvedores

**Prioridade:** P2 (Média)
**Status:** Pendente
**Esforço:** Médio
**Impacto:** Médio

---

## Objetivo

Fornecer componentes UI prontos para desenvolvedores criarem apps com visual consistente e profissional sem precisar de designer.

---

## Arquitetura

```
@bazari/ui-kit
├── components/           # Componentes React
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── Skeleton.tsx
│   └── ...
├── hooks/                # Hooks úteis
│   ├── useTheme.ts
│   ├── useMediaQuery.ts
│   └── useToast.ts
├── tokens/               # Design tokens
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── shadows.ts
├── layouts/              # Layouts prontos
│   ├── AppShell.tsx
│   ├── PageHeader.tsx
│   └── BottomNav.tsx
└── styles/
    └── base.css          # CSS base
```

---

## Implementação

### Task 1: Criar Package @bazari/ui-kit

**Arquivo:** `packages/bazari-ui-kit/package.json`

```json
{
  "name": "@bazari/ui-kit",
  "version": "0.1.0",
  "description": "UI components for Bazari apps",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --external react",
    "dev": "tsup src/index.ts --format esm --watch",
    "clean": "rm -rf dist"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "react": "^18.2.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "keywords": [
    "bazari",
    "ui",
    "components",
    "react"
  ]
}
```

---

### Task 2: Design Tokens

**Arquivo:** `packages/bazari-ui-kit/src/tokens/colors.ts`

```typescript
export const colors = {
  // Brand
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',   // Primary
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Success (BZR green)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',   // Success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',   // Warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',   // Error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Gray
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Semantic
  background: 'var(--bzr-background, #ffffff)',
  foreground: 'var(--bzr-foreground, #111827)',
  muted: 'var(--bzr-muted, #f3f4f6)',
  mutedForeground: 'var(--bzr-muted-foreground, #6b7280)',
  border: 'var(--bzr-border, #e5e7eb)',
};

export const gradients = {
  primary: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  success: 'linear-gradient(135deg, #22c55e, #10b981)',
  warning: 'linear-gradient(135deg, #f59e0b, #f97316)',
  error: 'linear-gradient(135deg, #ef4444, #f43f5e)',
  purple: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
  bzr: 'linear-gradient(135deg, #10b981, #059669)',
};
```

**Arquivo:** `packages/bazari-ui-kit/src/tokens/spacing.ts`

```typescript
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};
```

**Arquivo:** `packages/bazari-ui-kit/src/tokens/typography.ts`

```typescript
export const fontFamily = {
  sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  '5xl': ['3rem', { lineHeight: '1' }],
};

export const fontWeight = {
  thin: '100',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};
```

---

### Task 3: Componentes Base

**Arquivo:** `packages/bazari-ui-kit/src/components/Button.tsx`

```typescript
import React from 'react';
import { colors, gradients } from '../tokens/colors';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'inherit',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 12px', fontSize: '14px' },
    md: { padding: '10px 16px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: gradients.primary,
      color: 'white',
    },
    secondary: {
      background: colors.gray[100],
      color: colors.gray[900],
    },
    outline: {
      background: 'transparent',
      color: colors.primary[600],
      border: `1px solid ${colors.primary[300]}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.gray[700],
    },
    success: {
      background: gradients.success,
      color: 'white',
    },
    danger: {
      background: gradients.error,
      color: 'white',
    },
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      className={`bzr-button bzr-button-${variant} ${className}`}
    >
      {loading ? (
        <span className="bzr-spinner" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
};
```

**Arquivo:** `packages/bazari-ui-kit/src/components/Card.tsx`

```typescript
import React from 'react';
import { colors, borderRadius } from '../tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'elevated' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: '12px',
    transition: 'all 0.2s ease',
  };

  const paddingStyles: Record<string, React.CSSProperties> = {
    none: { padding: 0 },
    sm: { padding: '12px' },
    md: { padding: '16px' },
    lg: { padding: '24px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: colors.background,
      border: `1px solid ${colors.border}`,
    },
    outline: {
      background: 'transparent',
      border: `1px solid ${colors.border}`,
    },
    elevated: {
      background: colors.background,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    },
    gradient: {
      background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
      border: 'none',
    },
  };

  return (
    <div
      {...props}
      style={{
        ...baseStyles,
        ...paddingStyles[padding],
        ...variantStyles[variant],
        ...(hoverable && { cursor: 'pointer' }),
        ...style,
      }}
      className={`bzr-card ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    {...props}
    className={`bzr-card-header ${className}`}
    style={{ marginBottom: '12px' }}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3
    {...props}
    className={`bzr-card-title ${className}`}
    style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p
    {...props}
    className={`bzr-card-description ${className}`}
    style={{ fontSize: '14px', color: colors.mutedForeground, margin: '4px 0 0' }}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div {...props} className={`bzr-card-content ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    {...props}
    className={`bzr-card-footer ${className}`}
    style={{
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: `1px solid ${colors.border}`,
    }}
  >
    {children}
  </div>
);
```

**Arquivo:** `packages/bazari-ui-kit/src/components/Input.tsx`

```typescript
import React from 'react';
import { colors } from '../tokens/colors';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, className = '', style, ...props }, ref) => {
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`bzr-input-wrapper ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '6px',
              color: colors.foreground,
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: `1px solid ${error ? colors.error[500] : colors.border}`,
            borderRadius: '8px',
            background: colors.background,
            overflow: 'hidden',
          }}
        >
          {leftAddon && (
            <div style={{ padding: '0 12px', color: colors.mutedForeground }}>
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            {...props}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '14px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: colors.foreground,
              ...style,
            }}
          />

          {rightAddon && (
            <div style={{ padding: '0 12px', color: colors.mutedForeground }}>
              {rightAddon}
            </div>
          )}
        </div>

        {(error || hint) && (
          <p
            style={{
              fontSize: '12px',
              marginTop: '4px',
              color: error ? colors.error[500] : colors.mutedForeground,
            }}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

**Arquivo:** `packages/bazari-ui-kit/src/components/Avatar.tsx`

```typescript
import React from 'react';
import { colors, gradients } from '../tokens/colors';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const fontSizeMap = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 24,
};

const statusColors = {
  online: colors.success[500],
  offline: colors.gray[400],
  away: colors.warning[500],
  busy: colors.error[500],
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  return (
    <div
      className={`bzr-avatar ${className}`}
      style={{
        position: 'relative',
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: src ? 'transparent' : gradients.primary,
        color: 'white',
        fontSize,
        fontWeight: 500,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>{name ? getInitials(name) : '?'}</span>
      )}

      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dimension * 0.25,
            height: dimension * 0.25,
            borderRadius: '50%',
            background: statusColors[status],
            border: '2px solid white',
          }}
        />
      )}
    </div>
  );
};
```

---

### Task 4: Layouts Prontos

**Arquivo:** `packages/bazari-ui-kit/src/layouts/AppShell.tsx`

```typescript
import React from 'react';
import { colors } from '../tokens/colors';

export interface AppShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebar?: React.ReactNode;
  padding?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  header,
  footer,
  sidebar,
  padding = true,
}) => {
  return (
    <div
      className="bzr-app-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: colors.background,
      }}
    >
      {header && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: colors.background,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {header}
        </header>
      )}

      <div style={{ display: 'flex', flex: 1 }}>
        {sidebar && (
          <aside
            style={{
              width: 240,
              borderRight: `1px solid ${colors.border}`,
              background: colors.background,
            }}
          >
            {sidebar}
          </aside>
        )}

        <main
          style={{
            flex: 1,
            padding: padding ? '24px' : 0,
            maxWidth: '100%',
          }}
        >
          {children}
        </main>
      </div>

      {footer && (
        <footer
          style={{
            borderTop: `1px solid ${colors.border}`,
            background: colors.background,
          }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
};
```

**Arquivo:** `packages/bazari-ui-kit/src/layouts/PageHeader.tsx`

```typescript
import React from 'react';
import { colors } from '../tokens/colors';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  backButton?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  backButton,
}) => {
  return (
    <div
      className="bzr-page-header"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {backButton}

        {icon && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: colors.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}

        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: 0,
              color: colors.foreground,
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: '14px',
                color: colors.mutedForeground,
                margin: '4px 0 0',
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
    </div>
  );
};
```

---

### Task 5: CSS Base

**Arquivo:** `packages/bazari-ui-kit/src/styles/base.css`

```css
/* Bazari UI Kit - Base Styles */

:root {
  --bzr-background: #ffffff;
  --bzr-foreground: #111827;
  --bzr-muted: #f3f4f6;
  --bzr-muted-foreground: #6b7280;
  --bzr-border: #e5e7eb;
  --bzr-primary: #0ea5e9;
  --bzr-success: #22c55e;
  --bzr-warning: #f59e0b;
  --bzr-error: #ef4444;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bzr-background: #111827;
    --bzr-foreground: #f9fafb;
    --bzr-muted: #1f2937;
    --bzr-muted-foreground: #9ca3af;
    --bzr-border: #374151;
  }
}

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
}

/* Spinner */
.bzr-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: bzr-spin 0.6s linear infinite;
}

@keyframes bzr-spin {
  to { transform: rotate(360deg); }
}

/* Button hover effects */
.bzr-button:not(:disabled):hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.bzr-button:not(:disabled):active {
  transform: translateY(0);
}

/* Card hover effects */
.bzr-card[data-hoverable="true"]:hover {
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

/* Input focus */
.bzr-input-wrapper input:focus {
  outline: none;
}

.bzr-input-wrapper:focus-within {
  box-shadow: 0 0 0 2px var(--bzr-primary);
}

/* Utilities */
.bzr-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bzr-flex {
  display: flex;
}

.bzr-flex-col {
  flex-direction: column;
}

.bzr-items-center {
  align-items: center;
}

.bzr-justify-between {
  justify-content: space-between;
}

.bzr-gap-2 { gap: 8px; }
.bzr-gap-4 { gap: 16px; }
.bzr-gap-6 { gap: 24px; }

.bzr-p-2 { padding: 8px; }
.bzr-p-4 { padding: 16px; }
.bzr-p-6 { padding: 24px; }

.bzr-m-0 { margin: 0; }
.bzr-mt-2 { margin-top: 8px; }
.bzr-mt-4 { margin-top: 16px; }
.bzr-mb-2 { margin-bottom: 8px; }
.bzr-mb-4 { margin-bottom: 16px; }
```

---

### Task 6: Index de Exports

**Arquivo:** `packages/bazari-ui-kit/src/index.ts`

```typescript
// Components
export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/Card';
export type { CardProps } from './components/Card';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Avatar } from './components/Avatar';
export type { AvatarProps } from './components/Avatar';

// Layouts
export { AppShell } from './layouts/AppShell';
export type { AppShellProps } from './layouts/AppShell';

export { PageHeader } from './layouts/PageHeader';
export type { PageHeaderProps } from './layouts/PageHeader';

// Tokens
export { colors, gradients } from './tokens/colors';
export { spacing, borderRadius } from './tokens/spacing';
export { fontFamily, fontSize, fontWeight } from './tokens/typography';
```

---

## Uso pelos Desenvolvedores

```typescript
// Instalação
npm install @bazari/ui-kit

// Importar CSS
import '@bazari/ui-kit/styles.css';

// Usar componentes
import { Button, Card, Input, Avatar, PageHeader } from '@bazari/ui-kit';

function MyApp() {
  return (
    <div>
      <PageHeader
        title="Meu App"
        description="Um app incrível"
        actions={<Button>Ação</Button>}
      />

      <Card>
        <Input label="Nome" placeholder="Digite seu nome" />
        <Button variant="success" fullWidth>
          Salvar
        </Button>
      </Card>
    </div>
  );
}
```

---

## Critérios de Aceite

- [ ] Package @bazari/ui-kit criado
- [ ] Design tokens definidos
- [ ] 10+ componentes implementados
- [ ] Layouts prontos (AppShell, PageHeader)
- [ ] CSS base com dark mode
- [ ] TypeScript types completos
- [ ] NPM publish funcional
- [ ] Documentação de uso

---

**Versão:** 1.0.0
**Data:** 2024-12-07
