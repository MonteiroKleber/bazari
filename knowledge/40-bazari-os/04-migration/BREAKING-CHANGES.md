# Breaking Changes - Mudanças Incompatíveis

**Versão:** 1.0.0
**Data:** 2024-12-03

---

## Visão Geral

Este documento lista todas as mudanças que podem quebrar compatibilidade durante a migração para o BazariOS.

---

## Mudanças de Estrutura

### 1. Reorganização de Pastas

**Antes:**
```
pages/WalletHome.tsx
modules/wallet/...
components/wallet/...
```

**Depois:**
```
apps/wallet/
├── manifest.ts
├── index.tsx
├── pages/
├── components/
└── hooks/
```

**Impacto:** Todos os imports precisam ser atualizados.

**Migração:**
```typescript
// Antes
import { WalletCard } from '@/components/wallet/WalletCard';

// Depois (dentro do app)
import { WalletCard } from '../components/WalletCard';

// Depois (fora do app)
import { WalletCard } from '@/apps/wallet/components/WalletCard';
```

---

### 2. Entry Points de Módulos

**Antes:**
```typescript
// App.tsx
<Route path="/app/wallet/*" element={<WalletHome />} />
```

**Depois:**
```typescript
// Registrado via manifest, renderizado dinamicamente
// Não há mais rotas hardcoded para apps nativos
```

**Impacto:** Rotas são gerenciadas pelo registry.

---

### 3. Dashboard/Quick Actions

**Antes:**
```typescript
// QuickActionsGrid.tsx
const quickActions = [
  { name: 'Wallet', route: '/app/wallet', icon: Wallet },
  // ... hardcoded
];
```

**Depois:**
```typescript
// AppLauncher.tsx
const { apps } = useInstalledApps();
// Apps vêm do registry + preferências do usuário
```

**Impacto:** Quick actions não são mais hardcoded.

---

## Mudanças de API

### 4. Novo Sistema de Permissões

**Antes:**
```typescript
// Verificação manual de role
if (user.roles.includes('seller')) {
  // mostrar opção
}
```

**Depois:**
```typescript
// Verificação via manifest + store
const app = appRegistry.get('stores');
if (app.requiredRoles?.includes('seller')) {
  // verificar se user tem role
}

// Ou via hook
const { hasPermission } = useAppPermissions('stores');
```

**Impacto:** Lógica de permissão centralizada.

---

### 5. Storage do Usuário

**Antes:**
```typescript
// Qualquer componente podia usar localStorage
localStorage.setItem('myKey', 'value');
```

**Depois:**
```typescript
// Apps usam store isolado
const { setAppSetting } = useUserAppsStore();
setAppSetting('wallet', 'myKey', 'value');
```

**Impacto:** Apps de terceiros terão storage isolado.

---

### 6. Navegação entre Apps

**Antes:**
```typescript
// Link direto
<Link to="/app/wallet">Wallet</Link>
```

**Depois:**
```typescript
// Ainda funciona para apps nativos
<Link to="/app/wallet">Wallet</Link>

// Para apps de terceiros (via SDK)
sdk.navigation.openApp('wallet');
```

**Impacto:** Navegação para apps externos requer SDK.

---

## Mudanças de Componentes

### 7. AppHeader Modifications

**Mudança:** Menu "Mais" será substituído por link para App Store.

**Antes:**
```tsx
<DropdownMenu>
  <DropdownMenuItem><Link to="/app/wallet">Wallet</Link></DropdownMenuItem>
  <DropdownMenuItem><Link to="/app/p2p">P2P</Link></DropdownMenuItem>
  ...
</DropdownMenu>
```

**Depois:**
```tsx
<Button asChild>
  <Link to="/app/store">App Store</Link>
</Button>
```

---

### 8. MobileBottomNav Simplification

**Mudança:** Menos itens fixos, mais configurável.

**Antes:** 6 itens fixos (Search, Feed, Notifications, Create, Chat, Profile)

**Depois:** 4-5 itens, alguns baseados em apps instalados.

---

## Remoções

### 9. Código Legado a Remover

Após migração completa, remover:

```
// Arquivos
pages/DashboardPage.tsx (substituído por AppHubPage)
components/dashboard/QuickActionsGrid.tsx (substituído por AppLauncher)

// Rotas hardcoded em App.tsx
// Imports diretos de módulos em App.tsx
```

---

### 10. Exports Deprecated

```typescript
// Estes exports serão removidos:
export { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid';

// Usar:
export { AppLauncher } from '@/components/platform/AppLauncher';
```

---

## Mudanças de Comportamento

### 11. Lazy Loading Obrigatório

**Antes:** Alguns módulos carregavam síncronos.

**Depois:** Todos os apps usam lazy loading.

```typescript
// Obrigatório no manifest
component: lazy(() => import('./index')),
```

**Impacto:** Melhor performance inicial, mas precisa de Suspense.

---

### 12. Apps Pré-instalados

**Antes:** Todos os módulos sempre visíveis para todos.

**Depois:** Apenas apps pré-instalados (wallet, marketplace, feed) visíveis inicialmente.

**Impacto:** Usuários precisam instalar outros apps.

---

## Timeline de Deprecation

| Item | Versão Deprecated | Versão Removida |
|------|-------------------|-----------------|
| QuickActionsGrid | 3.0.0 | 4.0.0 |
| Rotas hardcoded | 3.0.0 | 4.0.0 |
| DashboardPage antigo | 3.0.0 | 4.0.0 |
| Imports de modules/ | 3.1.0 | 5.0.0 |

---

## Compatibilidade

### Durante Transição (v3.x)

- Quick Actions antigo e AppLauncher coexistem
- Rotas hardcoded e dinâmicas funcionam
- Pode acessar via ambos os caminhos

### Após Migração (v4.0+)

- Apenas AppLauncher
- Apenas rotas dinâmicas
- Código legado removido

---

## Checklist de Verificação

Antes de finalizar migração, verificar:

- [ ] Todos os imports atualizados
- [ ] Nenhum import de `modules/` direto
- [ ] Todos os apps têm manifest
- [ ] Registry inicializando corretamente
- [ ] Lazy loading funcionando
- [ ] Permissões declaradas
- [ ] Testes passando
- [ ] Build sem erros

---

## Suporte

Se encontrar problemas com breaking changes:

1. Verificar este documento
2. Consultar [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)
3. Verificar logs de erro
4. Abrir issue com detalhes

---

**Documento:** BREAKING-CHANGES.md
**Versão:** 1.0.0
