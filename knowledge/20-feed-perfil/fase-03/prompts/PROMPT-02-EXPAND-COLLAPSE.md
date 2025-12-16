# Prompt: Implementar Expand/Collapse em Posts Longos

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

Truncar posts longos (>280 chars) com botao "Ver mais" para expandir.

## Especificacao

Leia a especificacao completa em: `knowledge/20-feed-perfil/fase-03/02-EXPAND-COLLAPSE.md`

## Ordem de Implementacao

### Etapa 1: Criar Componente ExpandableContent

Criar `apps/web/src/components/social/ExpandableContent.tsx`:

```typescript
interface ExpandableContentProps {
  content: string;
  maxLength?: number; // default: 280
  className?: string;
}
```

Funcionalidades:
- Truncar se `content.length > maxLength`
- Mostrar "..." no final do truncamento
- Botao "Ver mais" / "Ver menos"
- Parsing de links, mencoes (@user) e hashtags (#tag)

### Etapa 2: Parsing de Conteudo

Implementar funcao `parseContent()` que transforma texto em elementos React:
- URLs -> `<a href target="_blank">`
- @mencao -> `<Link to="/u/handle">`
- #hashtag -> `<Link to="/search?q=...">`

Todos os links devem ter `onClick={(e) => e.stopPropagation()}` para nao navegar para o post.

### Etapa 3: Integrar em PostCard

Substituir o `<p>` de conteudo por `<ExpandableContent>`:

```tsx
// De:
<p className="whitespace-pre-wrap break-words">{post.content}</p>

// Para:
<ExpandableContent content={post.content} />
```

## Arquivos a Criar/Modificar

### Criar
- [ ] `apps/web/src/components/social/ExpandableContent.tsx`

### Modificar
- [ ] `apps/web/src/components/social/PostCard.tsx`

## Cenarios de Teste

1. [ ] Posts curtos (<= 280 chars) exibidos completos
2. [ ] Posts longos (> 280 chars) truncados
3. [ ] "..." aparece no final do truncamento
4. [ ] "Ver mais" expande o conteudo
5. [ ] "Ver menos" recolhe o conteudo
6. [ ] URLs clicaveis e abrem em nova aba
7. [ ] @mencoes linkam para perfil
8. [ ] #hashtags linkam para busca
9. [ ] Click em links NAO navega para post

## Commit

```bash
git add .
git commit -m "feat(posts): add expand/collapse for long posts

- Create ExpandableContent component with 280 char limit
- Parse URLs, mentions, and hashtags as clickable links
- Add 'See more' / 'See less' toggle"
```
