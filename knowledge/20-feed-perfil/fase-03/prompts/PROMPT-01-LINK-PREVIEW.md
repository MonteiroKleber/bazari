# Prompt: Implementar Link Preview nos Posts

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

Extrair e exibir preview de URLs presentes nos posts.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-03/01-LINK-PREVIEW.md`

## Ordem de Implementacao

### Etapa 1: Backend - API de Metadados

Criar `apps/api/src/routes/link-preview.ts`:

```
GET /link-preview?url=https://...
Response: { url, title, description, image, siteName, favicon }
```

Usar biblioteca `unfurl.js` ou fetch + cheerio para extrair Open Graph/Twitter Cards.

Adicionar:
- Validacao de URL (apenas http/https)
- Timeout de 5 segundos
- Cache em memoria (1 hora TTL)

Registrar rota em `apps/api/src/server.ts`.

### Etapa 2: Hook useLinkPreview

Criar `apps/web/src/hooks/useLinkPreview.ts`:

- Detectar URLs no conteudo (regex)
- Ignorar URLs de midia (.jpg, .png, .mp4, etc)
- Buscar preview apenas da primeira URL valida
- Retornar: `{ preview, loading }`

### Etapa 3: Componente LinkPreviewCard

Criar `apps/web/src/components/social/LinkPreviewCard.tsx`:

- Props: url, title, description, image, siteName
- Layout: imagem a esquerda (ou topo em mobile), texto a direita
- Link clicavel abre em nova aba

### Etapa 4: Integrar em PostCard

Modificar `apps/web/src/components/social/PostCard.tsx`:

- Chamar hook useLinkPreview
- Renderizar LinkPreviewCard se:
  - Existe preview
  - Post NAO tem midia propria

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/api/src/routes/link-preview.ts`
- [ ] `apps/web/src/hooks/useLinkPreview.ts`
- [ ] `apps/web/src/components/social/LinkPreviewCard.tsx`

### Modificar
- [ ] `apps/api/src/server.ts` - Registrar rota
- [ ] `apps/web/src/lib/api.ts` - Helper getLinkPreview
- [ ] `apps/web/src/components/social/PostCard.tsx`

## Dependencias

```bash
cd apps/api
pnpm add unfurl.js
```

## Cenarios de Teste

1. [ ] URL detectada no conteudo do post
2. [ ] Preview carrega com titulo, descricao, imagem
3. [ ] URLs de midia (.jpg, .png) ignoradas
4. [ ] Apenas primeira URL gera preview
5. [ ] Preview NAO aparece se post tem midia
6. [ ] Link abre em nova aba
7. [ ] Cache funciona (requests repetidos)
8. [ ] Timeout funciona (URLs lentas)

## Commit

```bash
git add .
git commit -m "feat(posts): add link preview for URLs

- Add GET /link-preview endpoint with unfurl.js
- Create useLinkPreview hook for URL detection
- Create LinkPreviewCard component
- Display rich previews for shared links"
```
