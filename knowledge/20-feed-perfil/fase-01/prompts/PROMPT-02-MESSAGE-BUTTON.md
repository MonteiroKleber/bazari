# Prompt: Implementar Botao de Mensagem no Perfil

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

Adicionar botao "Enviar Mensagem" no perfil publico que abre conversa direta via BazChat.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-01/02-MESSAGE-BUTTON.md`

## Ordem de Implementacao

### Etapa 1: Verificar/Criar Endpoint de DM

Verificar se existe endpoint em `apps/api/src/chat/routes/chat.threads.ts`:

```
POST /chat/threads/dm
Body: { participantHandle: string }
Response: { threadId: string, created: boolean }
```

Se NAO existir, criar:
1. Buscar profile do participante pelo handle
2. Verificar se ja existe thread DM entre os dois usuarios
3. Se existe, retornar threadId existente
4. Se nao existe, criar nova thread e retornar

### Etapa 2: Adicionar Helper na API

Modificar `apps/web/src/lib/api.ts`:

```typescript
getOrCreateThread: async (data: { participantHandle: string }) => {
  const res = await fetchWithAuth('/chat/threads/dm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
},
```

### Etapa 3: Adicionar Botao em ProfilePublicPage

Modificar `apps/web/src/pages/ProfilePublicPage.tsx`:

1. Adicionar state `startingChat`
2. Criar funcao `handleStartChat` que chama API e navega
3. Renderizar botao ao lado de "Seguir" quando:
   - Usuario logado (`currentUser` existe)
   - NAO e proprio perfil (`!isOwnProfile`)

```tsx
<Button variant="outline" onClick={handleStartChat} disabled={startingChat}>
  <MessageCircle className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">Mensagem</span>
</Button>
```

## Arquivos a Criar/Modificar

### Criar
- Nenhum (se endpoint ja existir)

### Modificar
- [ ] `apps/api/src/chat/routes/chat.threads.ts` - Endpoint DM (se necessario)
- [ ] `apps/web/src/lib/api.ts` - Helper getOrCreateThread
- [ ] `apps/web/src/pages/ProfilePublicPage.tsx` - Botao e handler

## Cenarios de Teste

1. [ ] Botao aparece apenas para outros usuarios
2. [ ] Botao NAO aparece se nao logado
3. [ ] Botao NAO aparece no proprio perfil
4. [ ] Click cria thread e navega para chat
5. [ ] Se thread ja existe, navega sem criar nova
6. [ ] Loading state funciona durante requisicao
7. [ ] Erro exibe toast

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(profile): add message button to start DM

- Add POST /chat/threads/dm endpoint for getting/creating DM threads
- Add getOrCreateThread helper to API
- Show message button on profile for logged-in users
- Navigate to chat thread on click"
```
