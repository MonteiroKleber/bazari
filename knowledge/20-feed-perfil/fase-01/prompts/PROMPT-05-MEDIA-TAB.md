# Prompt: Implementar Tab de Midia no Perfil

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

Adicionar nova tab "Midia" no perfil que mostra posts com imagens/videos em formato grid.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-01/05-MEDIA-TAB.md`

## Ordem de Implementacao

### Etapa 1: Backend - Endpoint de Midia

Criar/modificar em `apps/api/src/routes/profiles.ts`:

```
GET /profiles/:handle/media
Query: { cursor?: string, limit?: number }
Response: { items: MediaItem[], nextCursor: string | null }
```

Filtrar posts onde `media` nao e null/vazio.
Retornar apenas: `id`, `media`, `createdAt`.

### Etapa 2: Helper API Frontend

Adicionar em `apps/web/src/lib/api.ts`:

```typescript
getProfileMedia: async (handle: string, params?: { cursor?: string }) => {
  const query = new URLSearchParams();
  if (params?.cursor) query.set('cursor', params.cursor);
  const res = await fetchWithAuth(`/profiles/${handle}/media?${query}`);
  return res.json();
},
```

### Etapa 3: Componente MediaGrid

Criar `apps/web/src/components/profile/MediaGrid.tsx`:

Props:
- `handle: string` - Handle do usuario

Features:
- Grid 3 colunas (mobile) / 4 colunas (desktop)
- Thumbnails quadrados (aspect-square)
- Overlay icone Play em videos
- Badge "1/4" para multiplas imagens
- Infinite scroll / botao "Carregar mais"
- Skeleton loading
- Estado vazio

### Etapa 4: Integrar em ProfilePublicPage

1. Adicionar 'media' ao tipo de tab
2. Adicionar botao da tab no menu de tabs
3. Renderizar MediaGrid quando tab === 'media'

Ordem das tabs: Posts, Midia, Reputacao, Loja, Seguidores, Seguindo

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/profile/MediaGrid.tsx`

### Modificar
- [ ] `apps/api/src/routes/profiles.ts` - Endpoint media
- [ ] `apps/web/src/lib/api.ts` - Helper getProfileMedia
- [ ] `apps/web/src/pages/ProfilePublicPage.tsx` - Nova tab

## Cenarios de Teste

1. [ ] Grid renderiza 3 colunas em mobile
2. [ ] Grid renderiza 4 colunas em desktop
3. [ ] Videos mostram icone Play
4. [ ] Posts com multiplas midias mostram badge "1/N"
5. [ ] Click navega para o post
6. [ ] Infinite scroll / load more funciona
7. [ ] Estado vazio mostra mensagem apropriada
8. [ ] Loading mostra skeleton grid
9. [ ] Imagens carregam com lazy loading

## Commit

Apos implementar e testar:
```bash
git add .
git commit -m "feat(profile): add media tab with grid view

- Add GET /profiles/:handle/media endpoint
- Create MediaGrid component with responsive grid
- Show video play overlay and multi-image badge
- Add media tab to profile page between Posts and Reputation"
```
