# Correção: Validação DAO para Admin Missions

**Data**: 2025-11-15
**Status**: ✅ **COMPLETO**

---

## 📋 Problema Identificado

O usuário solicitou: "verificar o que esta validando essa url (/app/admin/missions - Admin Panel (DAO)) no header ou em algum outro lugar e colocar no mesmo padrao validar por Membros do Council (Council Members Cadastrados)"

### Situação Encontrada:
- ✅ Rota `/app/admin/missions` existia em `App.tsx`
- ✅ Página `AdminMissionsManagementPage.tsx` estava implementada
- ❌ **NÃO HAVIA** link/card no Dashboard ou Header para acessar esta página
- ❌ **SEM VALIDAÇÃO DAO** para mostrar/esconder o link

### Comparação com Admin Escrows:
- ✅ `QuickActionsGrid.tsx` tinha card "Admin Escrows" com validação DAO
- ✅ `AppHeader.tsx` tinha link "Admin Escrows" com validação DAO
- ❌ **Admin Missions não tinha nenhum dos dois**

---

## ✅ Correções Implementadas

### 1. QuickActionsGrid.tsx - Adicionado Card "Admin Panel (DAO)"

**Arquivo**: `apps/web/src/components/dashboard/QuickActionsGrid.tsx`

**Mudança**: Linhas 153-162, 172-174

```typescript
// Add Admin Missions card for DAO members only (Council Members)
const adminMissionsAction: QuickAction | null = isDAOMember
  ? {
      icon: <Shield className="h-6 w-6" />,
      label: 'Admin Panel (DAO)',
      to: '/app/admin/missions',
      description: 'Gerenciar missões e recompensas',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    }
  : null;

// Build final actions array
let allActions = [...QUICK_ACTIONS];
if (deliveryAction) {
  allActions.push(deliveryAction);
}
if (adminEscrowAction) {
  allActions.push(adminEscrowAction);
}
if (adminMissionsAction) {
  allActions.push(adminMissionsAction);
}
```

**Resultado**:
- ✅ Card "Admin Panel (DAO)" aparece no Dashboard **SOMENTE** para Council Members
- ✅ Usa o mesmo hook `useIsDAOMember()` que já valida por Council Members
- ✅ Cor roxa para diferenciar de Admin Escrows (azul)
- ✅ Ícone Shield consistente com área administrativa

### 2. AppHeader.tsx - Adicionado Link "Admin Panel (DAO)"

**Arquivo**: `apps/web/src/components/AppHeader.tsx`

**Mudança**: Linhas 69-75

```typescript
// Add Admin links for DAO members (Council Members)
const secondaryNavLinks = isDAOMember
  ? [
      ...baseSecondaryLinks,
      { to: '/app/admin/escrows', label: t('nav.adminEscrows', { defaultValue: 'Admin Escrows' }), checkActive: () => isActive('/app/admin/escrows') },
      { to: '/app/admin/missions', label: t('nav.adminMissions', { defaultValue: 'Admin Panel (DAO)' }), checkActive: () => isActive('/app/admin/missions') },
    ]
  : baseSecondaryLinks;
```

**Resultado**:
- ✅ Link "Admin Panel (DAO)" aparece no menu dropdown "Mais" **SOMENTE** para Council Members
- ✅ Usa o mesmo hook `useIsDAOMember()` que já valida por Council Members
- ✅ Comentário atualizado para refletir múltiplos links admin
- ✅ Translação preparada com chave `nav.adminMissions`

---

## 🔍 Validação Atual (Council Members)

### Como Funciona:

1. **Frontend Hook**: `useIsDAOMember()` (linha 44 em AppHeader.tsx, linha 122 em QuickActionsGrid.tsx)
   ```typescript
   const isDAOMember = useIsDAOMember();
   ```

2. **Hook Implementation**: `apps/web/src/hooks/useIsDAOMember.ts`
   ```typescript
   export function useIsDAOMember(): boolean {
     const { data, isLoading, error } = useBlockchainQuery<{ isDAOMember: boolean }>({
       endpoint: '/api/blockchain/governance/is-dao-member',
       refetchInterval: 300000, // 5 minutes
     });

     if (isLoading || error) {
       return false;
     }

     return data?.isDAOMember ?? false;
   }
   ```

3. **Backend Endpoint**: `/api/blockchain/governance/is-dao-member`
   ```typescript
   // apps/api/src/routes/blockchain/governance.ts
   app.get('/governance/is-dao-member', { preHandler: authOnRequest }, async (request, reply) => {
     const api = await blockchainService.getApi();

     // Validação DAO member: usa pallet-collective (Council)
     // Council members são considerados DAO members
     let isMember = false;
     try {
       const members = await api.query.council.members();
       const membersList = members.toJSON() as string[];
       isMember = membersList.includes(authUser.address);
     } catch (error) {
       app.log.warn('Failed to query council members:', error);
       isMember = false;
     }

     return {
       address: authUser.address,
       isDAOMember: isMember,
     };
   });
   ```

4. **Blockchain Query**: `api.query.council.members()`
   - Pallet: `pallet-collective` (Council)
   - Retorna lista de 4 Council Members cadastrados
   - Verifica se endereço do usuário está na lista

### Council Members Cadastrados:
1. `5CuCWfiraAzgSMbL8DHGTXEdF4bAg8YQMPRfuuuyGX92Nvcd` (Prime)
2. `5FH9x8ATh5GZCcdP8u7X7JVBnVgR25awkzHHRiB8NK797DA4`
3. `5FRYzgEb1TZweUzK5mZskTHF7URKUuDrhB3hGk7yC7qosXVQ`
4. `5H6TareHcGSFrxKYKhYWoBN3USYJDhuRqAPJKLyiTip7zYuk`

---

## 📊 Resultado Final

### Antes:
```
Dashboard:
  ✅ Admin Escrows (DAO only) ← funcionando
  ❌ Admin Missions           ← NÃO EXISTIA

Header Dropdown:
  ✅ Admin Escrows (DAO only) ← funcionando
  ❌ Admin Missions           ← NÃO EXISTIA

Route:
  ✅ /app/admin/missions      ← existia mas sem link
```

### Depois:
```
Dashboard:
  ✅ Admin Escrows (DAO only)     ← funcionando
  ✅ Admin Panel (DAO) (DAO only) ← ADICIONADO

Header Dropdown:
  ✅ Admin Escrows (DAO only)     ← funcionando
  ✅ Admin Panel (DAO) (DAO only) ← ADICIONADO

Route:
  ✅ /app/admin/missions          ← acessível via links
```

### Validação:
- ✅ Ambos usam `useIsDAOMember()` hook
- ✅ Hook chama `/api/blockchain/governance/is-dao-member`
- ✅ Endpoint valida por `api.query.council.members()`
- ✅ **MESMO PADRÃO** de validação para ambos
- ✅ Cache de 5 minutos para otimizar performance

---

## 🧪 Como Testar

### 1. Como Usuário Normal (Não-Council Member)
```bash
# Login no frontend
# Navegar para Dashboard

# Esperado:
- ❌ NÃO ver card "Admin Panel (DAO)"
- ❌ NÃO ver card "Admin Escrows"
- ❌ NÃO ver links admin no menu "Mais"
```

### 2. Como Council Member
```bash
# Login com um dos 4 endereços Council
# Navegar para Dashboard

# Esperado:
- ✅ Ver card "Admin Panel (DAO)" (roxo)
- ✅ Ver card "Admin Escrows" (azul)
- ✅ Clicar em "Admin Panel (DAO)" → vai para /app/admin/missions
- ✅ Ver "Admin Panel (DAO)" no menu dropdown "Mais"
```

### 3. Verificar Endpoint Backend
```bash
# Com token de Council Member
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/blockchain/governance/is-dao-member

# Esperado:
{
  "address": "5CuCWfiraAzgSMbL8DHGTXEdF4bAg8YQMPRfuuuyGX92Nvcd",
  "isDAOMember": true
}

# Com token de usuário normal
# Esperado:
{
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "isDAOMember": false
}
```

---

## 📝 Arquivos Modificados

1. **`apps/web/src/components/dashboard/QuickActionsGrid.tsx`**
   - Linhas 153-162: Adicionado `adminMissionsAction`
   - Linhas 172-174: Adicionado `adminMissionsAction` ao array final

2. **`apps/web/src/components/AppHeader.tsx`**
   - Linha 69: Comentário atualizado para "Admin links" (plural)
   - Linha 74: Adicionado link "Admin Panel (DAO)"

---

## ✅ Checklist de Implementação

- [x] Encontrar onde Admin Escrows está validado (QuickActionsGrid.tsx, AppHeader.tsx)
- [x] Verificar que usa `useIsDAOMember()` hook
- [x] Verificar que hook chama endpoint correto (`/api/blockchain/governance/is-dao-member`)
- [x] Verificar que endpoint valida por Council Members (`api.query.council.members()`)
- [x] Adicionar card "Admin Panel (DAO)" em QuickActionsGrid.tsx
- [x] Adicionar link "Admin Panel (DAO)" em AppHeader.tsx
- [x] Usar o mesmo hook `useIsDAOMember()` para consistência
- [x] Documentar mudanças neste arquivo

---

## 🎯 Conclusão

✅ **COMPLETO**

A URL `/app/admin/missions` agora:
- ✅ Tem card no Dashboard (DAO only)
- ✅ Tem link no Header dropdown (DAO only)
- ✅ Usa **MESMO PADRÃO** de validação que Admin Escrows
- ✅ Valida por **Council Members** via `api.query.council.members()`
- ✅ Usa o mesmo hook `useIsDAOMember()` em ambos os lugares

**Padrão de Validação Consistente**:
```
Frontend Hook → Backend Endpoint → Blockchain Query → Council Members
useIsDAOMember() → /api/blockchain/governance/is-dao-member → api.query.council.members() → [4 members]
```

---

**Implementado por**: Claude Code
**Data**: 2025-11-15
**Tempo Total**: ~15 minutos
**Arquivos Modificados**: 2
