# External Apps - Apps Externos no BazariOS

**Versão:** 1.0.0
**Status:** Implementado
**Data:** 2024-12-03

---

## Visão Geral

O BazariOS suporta apps externos que rodam em domínios separados, abrindo em nova aba com autenticação automatizada. Isso permite integrar experiências como o Bazari VR sem perder a coerência do sistema de apps.

---

## Tipos de Launch Mode

```typescript
type AppLaunchMode = 'internal' | 'external' | 'iframe';
```

| Modo | Descrição | Uso |
|------|-----------|-----|
| `internal` | Rota SPA interna (padrão) | Apps nativos que rodam dentro do Bazari |
| `external` | Abre URL externa em nova aba | Apps que rodam em domínios separados |
| `iframe` | Carrega em iframe sandboxed | Futuro: apps de terceiros |

---

## Métodos de Autenticação

```typescript
type AppAuthMethod = 'session' | 'vr-token' | 'oauth' | 'none';
```

| Método | Descrição | Uso |
|--------|-----------|-----|
| `session` | Usa sessão atual (padrão) | Apps internos |
| `vr-token` | Gera token VR via API | Bazari VR |
| `oauth` | OAuth flow (futuro) | Apps de terceiros autenticados |
| `none` | Sem autenticação | Links externos públicos |

---

## Campos do BazariApp para Apps Externos

```typescript
interface BazariApp {
  // ... campos existentes ...

  /** Modo de lançamento do app (default: 'internal') */
  launchMode?: AppLaunchMode;

  /** URL externa - obrigatório se launchMode: 'external' */
  externalUrl?: string;

  /** Método de autenticação para apps externos (default: 'session') */
  authMethod?: AppAuthMethod;

  /** Componente React - opcional para apps externos */
  component?: LazyExoticComponent<ComponentType<unknown>>;
}
```

---

## Exemplo: Bazari VR

```typescript
// apps/web/src/apps/vr/manifest.ts
export const vrApp: BazariApp = {
  id: 'vr',
  name: 'Bazari VR',
  slug: 'vr',
  version: '0.1.0',

  icon: 'Glasses',
  color: 'from-fuchsia-500 to-purple-600',
  description: 'Explore o metaverso do marketplace',

  category: 'entertainment',
  tags: ['vr', 'metaverso', '3d', 'realidade virtual'],

  // Configuração de app externo
  launchMode: 'external',
  externalUrl: 'https://bazari-vr.libervia.xyz',
  authMethod: 'vr-token',

  // entryPoint mantido para referência
  entryPoint: '/vr',
  // component não necessário para apps externos
  component: undefined,

  permissions: [
    { id: 'user.profile.read', reason: 'Criar avatar' },
    { id: 'camera', reason: 'Experiência AR', optional: true },
  ],

  status: 'beta',
  native: true,
  featured: true,
  preInstalled: false,
  defaultOrder: 14,
};
```

---

## App Launcher Service

### Localização

`apps/web/src/platform/services/app-launcher.ts`

### Funções Exportadas

```typescript
// Lança um app externo em nova aba com auth
launchExternalApp(app: BazariApp): Promise<LaunchResult>

// Obtém URL para navegação interna
getInternalAppUrl(app: BazariApp): string

// Verifica se é app externo
isExternalApp(app: BazariApp): boolean

// Verifica se app pode ser lançado
canLaunchApp(app: BazariApp): boolean
```

### Interface LaunchResult

```typescript
interface LaunchResult {
  success: boolean;
  error?: string;
  url?: string;
}
```

---

## Hook useAppLauncher

### Localização

`apps/web/src/platform/hooks/useAppLauncher.ts`

### Uso

```tsx
import { useAppLauncher } from '@/platform';

function AppCard({ app }: { app: BazariApp }) {
  const { launch, isLaunching, error, clearError } = useAppLauncher();

  const handleClick = async () => {
    const result = await launch(app);
    if (!result.success) {
      toast.error(result.error);
    }
  };

  return (
    <Card onClick={handleClick}>
      <AppIcon app={app} />
      <span>{app.name}</span>
      {isLaunching && <Spinner />}
    </Card>
  );
}
```

### Retorno

```typescript
interface UseAppLauncherReturn {
  launch: (app: BazariApp) => Promise<LaunchResult>;
  isLaunching: boolean;
  error: string | null;
  clearError: () => void;
}
```

---

## Fluxo de Autenticação VR Token

```
┌─────────┐     ┌─────────────┐     ┌──────────────────────┐
│ Usuário │────▶│ useAppLauncher │────▶│ launchExternalApp() │
└─────────┘     └─────────────┘     └──────────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ getAccessToken() │
                                    └──────────────────┘
                                              │
                                              ▼
                              ┌────────────────────────────┐
                              │ POST /api/auth/issue-vr-token │
                              │ Authorization: Bearer {token} │
                              └────────────────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ Recebe vrToken   │
                                    └──────────────────┘
                                              │
                                              ▼
                              ┌────────────────────────────────────┐
                              │ window.open(url + ?token=vrToken) │
                              └────────────────────────────────────┘
                                              │
                                              ▼
                              ┌────────────────────────────┐
                              │ Bazari VR abre autenticado │
                              └────────────────────────────┘
```

---

## Integração com App Store UI (Fase 3)

Quando implementar a App Store, os componentes devem verificar o `launchMode`:

```tsx
function AppCard({ app }: { app: BazariApp }) {
  const { launch } = useAppLauncher();

  // Badge para apps externos
  const isExternal = app.launchMode === 'external';

  return (
    <Card onClick={() => launch(app)}>
      {isExternal && <Badge variant="outline">Abre em nova aba</Badge>}
      {app.status === 'beta' && <Badge variant="secondary">BETA</Badge>}
      <AppIcon app={app} />
      <span>{app.name}</span>
    </Card>
  );
}
```

---

## Segurança

### Validações Implementadas

1. **Token VR é de uso único** - Gerado por chamada à API autenticada
2. **Pop-up blocker detection** - Retorna erro se bloqueado
3. **Session validation** - Verifica sessão ativa antes de gerar token
4. **URL construction** - URL montada de forma segura com `URL` API

### Considerações Futuras

- Rate limiting na API de issue-vr-token
- Expiração do token VR (atualmente gerenciado pelo backend)
- Refresh token para sessões longas no VR

---

## Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `platform/types/app.types.ts` | Tipos AppLaunchMode, AppAuthMethod |
| `platform/services/app-launcher.ts` | Serviço de lançamento |
| `platform/hooks/useAppLauncher.ts` | Hook React |
| `platform/services/index.ts` | Exports do serviço |
| `apps/vr/manifest.ts` | Manifest do Bazari VR |

---

**Documento:** EXTERNAL-APPS.md
**Versão:** 1.0.0
**Data:** 2024-12-03
