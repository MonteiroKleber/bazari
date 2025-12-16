# Prompt: Implementar Status Online no Perfil

## IMPORTANTE: Codigo de Producao

**ATENCAO**: Toda implementacao deve ser **CODIGO FINAL DE PRODUCAO**.

- **NAO** usar dados mockados
- **NAO** usar placeholders ou TODOs
- **NAO** deixar funcionalidades incompletas
- **NAO** usar valores hardcoded que deveriam vir do banco/API
- **NAO** assumir como algo deve funcionar - PERGUNTE se tiver duvida

**EM CASO DE DUVIDA**: Pare e pergunte ao usuario antes de implementar.

---

## Objetivo

Mostrar indicador de status online/offline e "visto por ultimo" no perfil publico.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-01/03-ONLINE-STATUS.md`

## Ordem de Implementacao

### Etapa 1: Schema Prisma

Verificar se campo `lastSeenAt` existe em Profile:

```prisma
model Profile {
  // ... campos existentes ...
  lastSeenAt DateTime? @map("last_seen_at")
}
```

Se nao existir, adicionar e rodar migration.

### Etapa 2: Tracking de Presenca no WebSocket

Modificar `apps/api/src/chat/ws/handlers.ts`:

1. Ao conectar: Atualizar `lastSeenAt`, adicionar ao set de online
2. Ao desconectar: Atualizar `lastSeenAt`, remover do set

Usar Map em memoria para usuarios online (ou Redis se disponivel):

```typescript
const onlineUsers = new Set<string>();

function handleConnection(profileId: string) {
  onlineUsers.add(profileId);
  // update lastSeenAt in DB
}

function handleDisconnect(profileId: string) {
  onlineUsers.delete(profileId);
  // update lastSeenAt in DB
}

function isOnline(profileId: string): boolean {
  return onlineUsers.has(profileId);
}
```

### Etapa 3: Endpoint de Presenca

Criar/modificar em `apps/api/src/routes/profiles.ts`:

```
GET /profiles/:handle/presence
Response: { isOnline: boolean, lastSeenAt: string | null }
```

### Etapa 4: Componentes Frontend

Criar `apps/web/src/components/profile/OnlineIndicator.tsx`:
- Bolinha verde (online) ou cinza (offline)
- Props: `isOnline`, `size`

Criar `apps/web/src/components/profile/LastSeenText.tsx`:
- "Online" se conectado
- "Visto por ultimo ha X" se offline recente
- Nada se > 24h offline

### Etapa 5: Integrar em ProfilePublicPage

1. Adicionar state para presence
2. Fetch presence quando profile carrega
3. Posicionar OnlineIndicator sobre avatar (absolute bottom-right)
4. Mostrar LastSeenText abaixo do handle

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/profile/OnlineIndicator.tsx`
- [ ] `apps/web/src/components/profile/LastSeenText.tsx`

### Modificar
- [ ] `apps/api/prisma/schema.prisma` - Campo lastSeenAt
- [ ] `apps/api/src/chat/ws/handlers.ts` - Tracking de presenca
- [ ] `apps/api/src/routes/profiles.ts` - Endpoint presence
- [ ] `apps/web/src/lib/api.ts` - Helper getPresence
- [ ] `apps/web/src/pages/ProfilePublicPage.tsx` - Exibir status

## Cenarios de Teste

1. [ ] Indicador verde quando usuario online
2. [ ] Indicador cinza quando offline
3. [ ] "Visto por ultimo ha X minutos" funciona
4. [ ] Nao mostra "visto" se > 24h
5. [ ] Indicador posicionado corretamente sobre avatar
6. [ ] Dark mode renderiza corretamente

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(profile): show online status indicator

- Add lastSeenAt field to Profile schema
- Track online presence in WebSocket handlers
- Add GET /profiles/:handle/presence endpoint
- Create OnlineIndicator and LastSeenText components
- Display presence info on public profile"
```
